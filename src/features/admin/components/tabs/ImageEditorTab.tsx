/**
 * ImageEditorTab — gestión completa de imágenes de un producto.
 *
 * Responsabilidades:
 *  - Cargar imágenes desde `product_images` (con fallback a `main_image`/`additional_images`)
 *  - Reordenar imágenes (drag conceptual: flechas ← →)
 *  - Cambiar imagen principal
 *  - Agregar nuevas imágenes (upload → Cloudinary → product_images)
 *  - Eliminar imágenes
 *  - Persistir cambios de orden en la tabla `product_images`
 *  - Sincronizar columnas `main_image` / `additional_images` en `products`
 *
 * No importa `supabase` a nivel de JSX; toda la lógica de DB queda en
 * funciones helper declaradas en la parte superior del archivo.
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, Star, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProducts } from '@/features/products/context/ProductContext';
import { uploadFilesToCloudinary } from '@/infrastructure/cloudinary/uploadService';
import { supabase } from '@/infrastructure/supabase/client';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ManagedImage = {
  /** ID de la fila en product_images (undefined si es legado). */
  rowId?: string;
  secure_url: string;
  public_id?: string | null;
  is_main: boolean;
  sort_order: number;
  /** true si existe como fila en product_images */
  persisted: boolean;
};

// ─── Helpers de persistencia ──────────────────────────────────────────────────

/** Reindexar is_main y sort_order en función de la posición del array. */
const normalize = (imgs: ManagedImage[]): ManagedImage[] =>
  imgs.map((img, i) => ({ ...img, is_main: i === 0, sort_order: i }));

/** Guardar nuevo orden en product_images (solo filas persistidas). */
const persistOrder = async (imgs: ManagedImage[]): Promise<void> => {
  const updates = imgs.filter((img) => img.persisted && img.rowId);
  await Promise.all(
    updates.map((img, i) =>
      supabase
        .from('product_images')
        .update({ is_main: i === 0, sort_order: i })
        .eq('id', img.rowId),
    ),
  );
};

/** Sincronizar columnas legacy main_image / additional_images en products. */
const syncLegacyCols = async (
  productId: string,
  imgs: ManagedImage[],
  updateProduct: (id: string, changes: any) => Promise<void>,
): Promise<void> => {
  const urls = imgs.map((img) => img.secure_url);
  await updateProduct(productId, {
    mainImage: urls[0] ?? '',
    additionalImages: urls.slice(1),
  });
};

// ─── Componente ───────────────────────────────────────────────────────────────

export const ImageEditorTab = () => {
  const { products, updateProduct } = useProducts();
  const [selectedProductId, setSelectedProductId] = useState('');
  const [images, setImages] = useState<ManagedImage[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

  // ── Carga imágenes al cambiar de producto ──────────────────────────────────
  useEffect(() => {
    if (!selectedProductId) {
      setImages([]);
      return;
    }

    const load = async () => {
      setLoadingImages(true);
      try {
        const { data, error } = await supabase
          .from('product_images')
          .select('id, public_id, secure_url, is_main, sort_order, created_at')
          .eq('product_id', selectedProductId)
          .order('sort_order', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const sorted = [...data].sort((a, b) => {
            const mainDiff = (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0);
            if (mainDiff !== 0) return mainDiff;
            return (a.sort_order ?? 0) - (b.sort_order ?? 0);
          });
          setImages(
            normalize(
              sorted.map((img) => ({
                rowId: img.id,
                secure_url: img.secure_url,
                public_id: img.public_id,
                is_main: img.is_main,
                sort_order: img.sort_order,
                persisted: true,
              })),
            ),
          );
        } else {
          // Fallback a columnas legacy del producto
          const p = products.find((pr) => pr.id === selectedProductId);
          if (!p) { setImages([]); return; }
          const urls = [p.mainImage, ...(p.additionalImages ?? [])].filter(Boolean);
          setImages(
            normalize(
              urls.map((url) => ({
                secure_url: url,
                public_id: null,
                is_main: false,
                sort_order: 0,
                persisted: false,
              })),
            ),
          );
        }
      } catch (err) {
        console.error(err);
        toast.error('No se pudieron cargar las imágenes');
      } finally {
        setLoadingImages(false);
      }
    };

    void load();
  }, [selectedProductId, products]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  /** Mueve una imagen a la posición index-1 */
  const moveLeft = async (index: number) => {
    if (index === 0 || saving) return;
    const next = normalize([
      ...images.slice(0, index - 1),
      images[index],
      images[index - 1],
      ...images.slice(index + 1),
    ]);
    setImages(next);
    setSaving(true);
    try {
      await persistOrder(next);
      await syncLegacyCols(selectedProductId, next, updateProduct);
    } catch (err: any) {
      toast.error(`Error al reordenar: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  /** Mueve una imagen a la posición index+1 */
  const moveRight = async (index: number) => {
    if (index === images.length - 1 || saving) return;
    const next = normalize([
      ...images.slice(0, index),
      images[index + 1],
      images[index],
      ...images.slice(index + 2),
    ]);
    setImages(next);
    setSaving(true);
    try {
      await persistOrder(next);
      await syncLegacyCols(selectedProductId, next, updateProduct);
    } catch (err: any) {
      toast.error(`Error al reordenar: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  /** Establece una imagen como principal (la mueve al índice 0) */
  const setMain = async (index: number) => {
    if (index === 0 || saving) return;
    const next = normalize([images[index], ...images.filter((_, i) => i !== index)]);
    setImages(next);
    setSaving(true);
    try {
      await persistOrder(next);
      await syncLegacyCols(selectedProductId, next, updateProduct);
      toast.success('Imagen principal actualizada');
    } catch (err: any) {
      toast.error(`Error: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  /** Elimina una imagen */
  const removeImage = async (index: number) => {
    if (saving) return;
    const target = images[index];
    setSaving(true);
    try {
      if (target.persisted && target.rowId) {
        const { error } = await supabase
          .from('product_images')
          .delete()
          .eq('id', target.rowId);
        if (error) throw error;
      }
      const next = normalize(images.filter((_, i) => i !== index));
      setImages(next);
      await persistOrder(next);
      await syncLegacyCols(selectedProductId, next, updateProduct);
      toast.success('Imagen eliminada');
    } catch (err: any) {
      toast.error(`Error al eliminar: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  /** Agrega nuevas imágenes: upload → Cloudinary → product_images */
  const addImages = async (files: FileList | null) => {
    if (!selectedProductId || !files?.length || saving) return;
    const toUpload = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!toUpload.length) return;

    setSaving(true);
    try {
      const uploaded = await uploadFilesToCloudinary(toUpload);
      const hasPersistedRows = images.some((img) => img.persisted);
      let newRows: ManagedImage[] = uploaded.map((img, i) => ({
        secure_url: img.secure_url,
        public_id: img.public_id,
        is_main: false,
        sort_order: images.length + i,
        persisted: false,
      }));

      if (hasPersistedRows) {
        const payload = uploaded.map((img, i) => ({
          product_id: selectedProductId,
          public_id: img.public_id,
          secure_url: img.secure_url,
          is_main: false,
          sort_order: images.length + i,
        }));
        const { data, error } = await supabase
          .from('product_images')
          .insert(payload)
          .select('id, public_id, secure_url, is_main, sort_order');

        if (error) {
          toast.warning('Imágenes subidas, pero falló la persistencia en product_images');
        } else {
          newRows = (data ?? []).map((row: any, i: number) => ({
            rowId: row.id,
            secure_url: row.secure_url,
            public_id: row.public_id,
            is_main: false,
            sort_order: images.length + i,
            persisted: true,
          }));
        }
      }

      const next = normalize([...images, ...newRows]);
      setImages(next);
      await persistOrder(next);
      await syncLegacyCols(selectedProductId, next, updateProduct);
      toast.success(`${uploaded.length} imagen(es) agregada(s)`);
    } catch (err: any) {
      toast.error(`Error al subir: ${err?.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Gestión de imágenes</h2>

      {/* Selector de producto */}
      <div className="space-y-2">
        <Label>Producto</Label>
        <Select
          value={selectedProductId}
          onValueChange={(v) => { setSelectedProductId(v); setImages([]); }}
        >
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="Selecciona un equipo…" />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — {p.category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProduct && (
        <>
          {/* Botón de agregar */}
          <label
            className={`flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-2.5 text-sm transition-colors ${
              saving
                ? 'cursor-not-allowed border-muted-foreground/30 text-muted-foreground/50'
                : 'border-border text-muted-foreground hover:border-primary hover:text-primary'
            }`}
          >
            <Upload className="h-4 w-4" />
            {saving ? 'Guardando…' : 'Agregar imágenes'}
            <input
              type="file"
              multiple
              accept="image/*"
              className="sr-only"
              disabled={saving}
              onChange={(e) => addImages(e.target.files)}
            />
          </label>

          {/* Grid de imágenes */}
          {loadingImages ? (
            <p className="text-sm text-muted-foreground">Cargando imágenes…</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Este equipo no tiene imágenes. Agrega una usando el botón de arriba.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {images.map((img, i) => (
                <div
                  key={img.rowId ?? `${img.secure_url}-${i}`}
                  className={`group relative overflow-hidden rounded-xl border-2 transition-colors ${
                    i === 0
                      ? 'border-primary shadow-sm'
                      : 'border-border'
                  }`}
                >
                  {/* Badge principal */}
                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 z-10 flex items-center gap-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                      <Star className="h-2.5 w-2.5" /> Principal
                    </span>
                  )}

                  {/* Imagen */}
                  <img
                    src={img.secure_url}
                    alt={`Imagen ${i + 1}`}
                    className="aspect-square w-full object-cover"
                  />

                  {/* Controles (aparecen al hover) */}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/60 px-2 py-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => moveLeft(i)}
                      disabled={i === 0 || saving}
                      title="Mover izquierda"
                      className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>

                    {i !== 0 && (
                      <button
                        onClick={() => setMain(i)}
                        disabled={saving}
                        title="Hacer principal"
                        className="rounded p-1 text-yellow-400 hover:bg-white/20"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      onClick={() => removeImage(i)}
                      disabled={saving}
                      title="Eliminar"
                      className="rounded p-1 text-red-400 hover:bg-white/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => moveRight(i)}
                      disabled={i === images.length - 1 || saving}
                      title="Mover derecha"
                      className="rounded p-1 text-white hover:bg-white/20 disabled:opacity-30"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Pasa el cursor sobre una imagen para ver las opciones. La imagen en posición 0 es la principal.
          </p>
        </>
      )}
    </div>
  );
};
