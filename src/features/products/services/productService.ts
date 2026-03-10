/**
 * productService — capa de acceso a datos para productos.
 *
 * Responsabilidades:
 *  - Todas las queries/mutations de Supabase relacionadas a `products`
 *    y `product_images`.
 *  - Mapeo DB ↔ dominio (snake_case ↔ camelCase).
 *  - Sin estado de React ni efectos secundarios de UI.
 */
import { supabase } from '@/infrastructure/supabase/client';
import { Product } from '@/types/Product';

// ─── Helpers de mapeo ────────────────────────────────────────────────────────

const sortImages = (images: any[]): any[] =>
  [...images].sort((a, b) => {
    const mainDiff = (b?.is_main ? 1 : 0) - (a?.is_main ? 1 : 0);
    if (mainDiff !== 0) return mainDiff;
    const orderDiff = (a?.sort_order ?? 0) - (b?.sort_order ?? 0);
    if (orderDiff !== 0) return orderDiff;
    return Date.parse(a?.created_at ?? '0') - Date.parse(b?.created_at ?? '0');
  });

const mapRowToProduct = (item: any): Product => {
  const relatedImages: any[] = Array.isArray(item.product_images)
    ? item.product_images
    : [];
  const sorted = sortImages(relatedImages);
  const mainRow = sorted.find((img) => img?.is_main) ?? sorted[0];

  const mainImage: string = mainRow?.secure_url ?? item.main_image ?? '';
  const additionalImages: string[] =
    sorted
      .filter((img) => img && img !== mainRow)
      .map((img) => img.secure_url)
      .filter(Boolean).length > 0
      ? sorted
          .filter((img) => img && img !== mainRow)
          .map((img) => img.secure_url)
          .filter(Boolean)
      : (Array.isArray(item.additional_images) ? item.additional_images : []);

  return {
    id: item.id,
    name: item.name,
    price: Number(item.price),
    category: item.category,
    description: item.description ?? '',
    mainImage,
    additionalImages,
    featured: item.featured,
    inStock: item.in_stock,
    stock: item.stock,
    variants: item.variants,
    sortOrder: item.sort_order,
    brightness: item.brightness,
    contrast: item.contrast,
    imageSettings: item.image_settings,
  };
};

const mapProductToDb = (product: Partial<Product>): Record<string, unknown> => {
  const db: Record<string, unknown> = {};
  if (product.name !== undefined) db.name = product.name;
  if (product.price !== undefined) db.price = product.price;
  if (product.category !== undefined) db.category = product.category;
  if (product.description !== undefined) db.description = product.description;
  if (product.mainImage !== undefined) db.main_image = product.mainImage;
  if (product.additionalImages !== undefined) db.additional_images = product.additionalImages;
  if (product.featured !== undefined) db.featured = product.featured;
  if (product.inStock !== undefined) db.in_stock = product.inStock;
  if (product.stock !== undefined) db.stock = product.stock;
  if (product.variants !== undefined) db.variants = product.variants;
  if (product.sortOrder !== undefined) db.sort_order = product.sortOrder;
  if (product.brightness !== undefined) db.brightness = product.brightness;
  if (product.contrast !== undefined) db.contrast = product.contrast;
  if (product.imageSettings !== undefined) db.image_settings = product.imageSettings;
  return db;
};

// ─── CRUD ────────────────────────────────────────────────────────────────────

export const productService = {
  /** Obtiene todos los productos ordenados por sort_order. */
  async getAll(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images (
          public_id,
          secure_url,
          is_main,
          sort_order,
          created_at
        )
      `)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return (data ?? []).map(mapRowToProduct);
  },

  /** Crea un nuevo producto y devuelve la entidad completa con el ID asignado. */
  async create(product: Omit<Product, 'id'>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert([mapProductToDb(product)])
      .select();

    if (error) throw error;
    if (!data?.[0]) throw new Error('No se recibió el producto creado desde Supabase');

    return { ...product, id: data[0].id } as Product;
  },

  /** Actualiza campos parciales de un producto existente. */
  async update(id: string, changes: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(mapProductToDb(changes))
      .eq('id', id)
      .select();

    if (error) throw error;

    const saved = data?.[0];
    return {
      ...changes,
      id,
      brightness: saved?.brightness ?? changes.brightness,
      contrast: saved?.contrast ?? changes.contrast,
      imageSettings: saved?.image_settings ?? changes.imageSettings,
    } as Product;
  },

  /**
   * Actualiza el sort_order de múltiples productos en batch.
   *
   * Estrategia:
   *  1. Intenta usar la función RPC `update_products_order` (una sola
   *     transacción, sin N-queries).  Ver supabase/UPDATE_PRODUCTS_ORDER_RPC.sql
   *  2. Si el RPC no existe todavía (código 42883) o falla, cae al loop
   *     clásico de N-queries como fallback temporal.
   */
  async updateOrder(orderedIds: string[]): Promise<void> {
    const updates = orderedIds.map((id, index) => ({ id, sort_order: index }));

    // 1. Intentar RPC batch
    const { error: rpcError } = await supabase.rpc('update_products_order', { updates });
    if (!rpcError) return;

    // Si el error NO es "función no encontrada" (SQLSTATE 42883), relanzar
    const pgCode = (rpcError as any)?.code as string | undefined;
    if (pgCode !== 'PGRST202' && pgCode !== '42883') {
      throw rpcError;
    }

    // 2. Fallback: loop N-queries (hasta que el RPC esté desplegado)
    for (const update of updates) {
      const { error } = await supabase
        .from('products')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id);
      if (error) throw error;
    }
  },

  /**
   * Inserta registros de imágenes en product_images para un producto dado.
   * La posición 0 se trata como imagen principal (is_main = true).
   */
  async insertImages(
    productId: string,
    images: Array<{ public_id: string; secure_url: string; is_main: boolean; sort_order: number }>,
  ): Promise<void> {
    if (!images.length) return;
    const payload = images.map((img) => ({ ...img, product_id: productId }));
    const { error } = await supabase.from('product_images').insert(payload);
    if (error) throw error;
  },

  /** Elimina un producto y sus imágenes asociadas. */
  async delete(id: string): Promise<void> {
    const { error: imgError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', id);

    if (imgError) throw new Error('Error al eliminar las imágenes del producto');

    const { error: productError } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (productError) throw new Error('Error al eliminar el producto de la base de datos');
  },
};
