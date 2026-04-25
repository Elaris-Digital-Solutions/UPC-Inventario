/**
 * ProductContext refactorizado.
 *
 * Cambios respecto a la versión anterior:
 *  - Toda la lógica de Supabase delegada a `productService`.
 *  - El contexto solo gestiona estado React (lista de productos).
 *  - `alert()` reemplazado por `toast` de sonner.
 *  - Bug corregido: `if (field)` → `if (field !== undefined)` en updateProduct.
 *  - Eliminada la lógica de mapeo DB ↔ dominio (vive en el servicio).
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { toast } from 'sonner';
import { productService } from '@/features/products/services/productService';
import { Product } from '@/types/Product';

interface ProductContextType {
  products: Product[];
  loading: boolean;
  addProduct: (product: Omit<Product, 'id'>) => Promise<Product>;
  updateProduct: (id: string, changes: Partial<Product>) => Promise<void>;
  updateProductOrder: (orderedProducts: Product[]) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  getProductById: (id: string) => Product | undefined;
  getFeaturedProducts: () => Product[];
  getMostExpensiveProducts: (limit?: number) => Product[];
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

export const ProductProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const data = await productService.getAll();
      setProducts(data);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      toast.error('No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProducts();
  }, []);

  const addProduct = async (product: Omit<Product, 'id'>): Promise<Product> => {
    try {
      const created = await productService.create(product);
      setProducts((prev) => [...prev, created]);
      return created;
    } catch (err) {
      console.error('Error al agregar producto:', err);
      toast.error('Error al guardar el producto en la base de datos');
      throw err;
    }
  };

  const updateProduct = async (id: string, changes: Partial<Product>): Promise<void> => {
    try {
      const saved = await productService.update(id, changes);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...changes, ...saved } : p)),
      );
    } catch (err) {
      console.error('Error al actualizar producto:', err);
      toast.error('No se pudo actualizar el producto');
      throw err;
    }
  };

  const updateProductOrder = async (orderedProducts: Product[]): Promise<void> => {
    // Actualización optimista: la UI refleja el cambio inmediatamente
    setProducts(orderedProducts);
    try {
      await productService.updateOrder(orderedProducts.map((p) => p.id));
    } catch (err) {
      console.error('Error al actualizar orden:', err);
      toast.error('Error al guardar el orden de los productos');
      // Revertir al estado del servidor
      void fetchProducts();
      throw err;
    }
  };

  const deleteProduct = async (id: string): Promise<void> => {
    try {
      await productService.delete(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      toast.error('No se pudo eliminar el producto. Verifica que tengas permisos de administrador.');
      throw err;
    }
  };

  const getProductById = (id: string) =>
    products.find((p) => p.id === id);

  const getFeaturedProducts = () =>
    products.filter((p) => p.featured && (p.stock ?? 0) > 0);

  const getMostExpensiveProducts = (limit = 3) =>
    [...products]
      .filter((p) => (p.stock ?? 0) > 0)
      .sort((a, b) => {
        const diff = b.price - a.price;
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      })
      .slice(0, limit);

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        addProduct,
        updateProduct,
        updateProductOrder,
        deleteProduct,
        getProductById,
        getFeaturedProducts,
        getMostExpensiveProducts,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = (): ProductContextType => {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts debe usarse dentro de <ProductProvider>');
  }
  return context;
};
