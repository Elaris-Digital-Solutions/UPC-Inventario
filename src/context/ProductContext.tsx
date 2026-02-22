import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product } from '../types/Product';
import { supabase } from '../supabaseClient';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  addProduct: (product: Product) => Promise<Product>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  updateProductOrder: (products: Product[]) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  getFeaturedProducts: () => Product[];
  getMostExpensiveProducts: (limit?: number) => Product[];
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
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

      if (data) {
        const mappedProducts: Product[] = data.map((item: any) => {
          const relatedImages: any[] = Array.isArray(item.product_images) ? item.product_images : [];
          const sorted = [...relatedImages].sort((a, b) => {
            const aMain = a?.is_main ? 1 : 0;
            const bMain = b?.is_main ? 1 : 0;
            if (aMain !== bMain) return bMain - aMain;
            const aOrder = typeof a?.sort_order === 'number' ? a.sort_order : 0;
            const bOrder = typeof b?.sort_order === 'number' ? b.sort_order : 0;
            if (aOrder !== bOrder) return aOrder - bOrder;
            const aCreated = a?.created_at ? Date.parse(a.created_at) : 0;
            const bCreated = b?.created_at ? Date.parse(b.created_at) : 0;
            return aCreated - bCreated;
          });

          const mainRow = sorted.find(img => img?.is_main) || sorted[0];
          const mainImageFromRelation = mainRow?.secure_url as string | undefined;
          const additionalFromRelation = sorted
            .filter(img => img && img !== mainRow)
            .map(img => img.secure_url)
            .filter(Boolean);

          const legacyAdditional: string[] = Array.isArray(item.additional_images) ? item.additional_images : [];

          return {
            id: item.id,
            name: item.name,
            price: Number(item.price),
            category: item.category,
            description: item.description || '',
            mainImage: mainImageFromRelation || item.main_image,
            additionalImages: additionalFromRelation.length > 0 ? additionalFromRelation : legacyAdditional,
            featured: item.featured,
            inStock: item.in_stock,
            stock: item.stock,
            variants: item.variants,
            sortOrder: item.sort_order,
            brightness: item.brightness,
            contrast: item.contrast,
            imageSettings: item.image_settings
          };
        });
        setProducts(mappedProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (product: Product): Promise<Product> => {
    try {
      const dbProduct = {
        name: product.name,
        price: product.price,
        category: product.category,
        description: product.description,
        main_image: product.mainImage,
        additional_images: product.additionalImages,
        featured: product.featured,
        in_stock: product.inStock,
        stock: product.stock,
        variants: product.variants,
        brightness: product.brightness,
        contrast: product.contrast,
        image_settings: product.imageSettings
      };

      const { data, error } = await supabase
        .from('products')
        .insert([dbProduct])
        .select();

      if (error) throw error;

      if (data) {
        const newProduct: Product = {
          ...product,
          id: data[0].id
        };
        setProducts(prev => [...prev, newProduct]);
        return newProduct;
      }

      throw new Error('No se recibió el producto creado desde Supabase');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Error al guardar el producto en la base de datos');
      throw error;
    }
  };

  const updateProduct = async (id: string, updatedProduct: Partial<Product>) => {
    try {
      const dbUpdate: any = {};
      if (updatedProduct.name) dbUpdate.name = updatedProduct.name;
      if (updatedProduct.price) dbUpdate.price = updatedProduct.price;
      if (updatedProduct.category) dbUpdate.category = updatedProduct.category;
      if (updatedProduct.description) dbUpdate.description = updatedProduct.description;
      if (updatedProduct.mainImage) dbUpdate.main_image = updatedProduct.mainImage;
      if (updatedProduct.additionalImages) dbUpdate.additional_images = updatedProduct.additionalImages;
      if (updatedProduct.featured !== undefined) dbUpdate.featured = updatedProduct.featured;
      if (updatedProduct.inStock !== undefined) dbUpdate.in_stock = updatedProduct.inStock;
      if (updatedProduct.stock !== undefined) dbUpdate.stock = updatedProduct.stock;
      if (updatedProduct.variants) dbUpdate.variants = updatedProduct.variants;
      if (updatedProduct.sortOrder !== undefined) dbUpdate.sort_order = updatedProduct.sortOrder;
      if (updatedProduct.brightness !== undefined) dbUpdate.brightness = updatedProduct.brightness;
      if (updatedProduct.contrast !== undefined) dbUpdate.contrast = updatedProduct.contrast;
      if (updatedProduct.imageSettings !== undefined) dbUpdate.image_settings = updatedProduct.imageSettings;

      const { data, error } = await supabase
        .from('products')
        .update(dbUpdate)
        .eq('id', id)
        .select();

      if (error) throw error;

      const saved = data?.[0];
      setProducts(prev =>
        prev.map(product =>
          product.id === id ? {
            ...product,
            ...updatedProduct,
            // Ensure we use the values actually saved in DB if available
            brightness: saved?.brightness ?? updatedProduct.brightness,
            contrast: saved?.contrast ?? updatedProduct.contrast,
            imageSettings: saved?.image_settings ?? updatedProduct.imageSettings
          } : product
        )
      );
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const updateProductOrder = async (orderedProducts: Product[]) => {
    try {
      // Update local state immediately for UI responsiveness
      setProducts(orderedProducts);

      // Update in Supabase
      // We'll update each product's sort_order
      // To be efficient, we could use an upsert if supported or multiple updates
      // For now, we'll loop through. If there are many products, this might be slow.
      // A better way is to use a stored procedure or a single upsert call.
      // But given the constraints, we'll iterate.

      const updates = orderedProducts.map((product, index) => ({
        id: product.id,
        sort_order: index
      }));

      // Using upsert to update multiple rows at once if possible, 
      // but Supabase upsert requires all required fields if it's a new row.
      // Since these are existing rows, we can use upsert with just ID and the field to update?
      // No, upsert replaces the row or inserts. It might clear other fields if not provided.
      // So we should use `update` in a loop or a custom RPC.
      // Let's try a loop for now, assuming not too many products.

      for (const update of updates) {
        await supabase
          .from('products')
          .update({ sort_order: update.sort_order })
          .eq('id', update.id);
      }

    } catch (error) {
      console.error('Error updating product order:', error);
      // Revert local state if needed, or just alert
      alert('Error al guardar el orden de los productos');
      fetchProducts(); // Reload from server to sync
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      // 1. Eliminar imágenes asociadas en la base de datos
      // (Si hay ON DELETE CASCADE en la DB esto no sería estrictamente necesario, 
      // pero lo hacemos para asegurar que no queden huérfanos si la config cambia)
      const { error: imagesError } = await supabase
        .from('product_images')
        .delete()
        .eq('product_id', id);

      if (imagesError) {
        console.error('Error deleting product images:', imagesError);
        throw new Error('Error al eliminar las imágenes del producto');
      }

      // 2. Eliminar el producto
      const { error: productError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (productError) {
        console.error('Error deleting product:', productError);
        throw new Error('Error al eliminar el producto de la base de datos');
      }

      // 3. Actualizar estado local
      setProducts(prev => prev.filter(product => product.id !== id));

      // Nota: Las imágenes permanecen en Cloudinary. 
      // Para borrarlas también, se requeriría una función de servidor (Edge Function o Backend)
      // que tenga las credenciales de administración de Cloudinary.

    } catch (error) {
      console.error('Error deleting product:', error);
      alert('No se pudo eliminar el producto. Verifica que tengas permisos de administrador.');
    }
  };

  const getProductById = (id: string) => {
    return products.find(product => product.id === id);
  };

  const getFeaturedProducts = () => {
    return products.filter(product => product.featured && (product.stock || 0) > 0);
  };

  const getMostExpensiveProducts = (limit: number = 3) => {
    return [...products]
      .filter(product => (product.stock || 0) > 0)
      .sort((a, b) => {
        const priceDiff = b.price - a.price;
        if (priceDiff !== 0) return priceDiff;
        return a.name.localeCompare(b.name);
      })
      .slice(0, limit);
  };

  return (
    <ProductContext.Provider value={{
      products,
      loading,
      addProduct,
      updateProduct,
      updateProductOrder,
      deleteProduct,
      getProductById,
      getFeaturedProducts,
      getMostExpensiveProducts
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => {
  const context = useContext(ProductContext);
  if (context === undefined) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
};
