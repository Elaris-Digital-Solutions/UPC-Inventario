import React, { useEffect, useMemo, useRef, useState } from 'react';
import SEO from '@/components/SEO';
import Header from '@/components/Header';
import { Upload, Plus, Minus, Eye, Trash2, Edit, Save, X, LogOut, ShoppingBag, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, GripVertical, LayoutGrid, BarChart3, Scissors } from 'lucide-react';
import { useProducts } from '@/context/ProductContext';
import { useAuth } from '@/context/AuthContext';
import { Product } from '@/types/Product';
import { Order, InstallmentPayment } from '@/types/Order';
import { supabase } from '@/supabaseClient';
import AdminLogin from '@/components/AdminLogin';
import { productDescriptions } from '@/data/productDescriptions';
import { getOptimizedImageUrl, getImageSettings } from '@/utils/imageUtils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Item Component
const SortableProductItem = ({ product }: { product: Product }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOutOfStock = product.stock === 0;
  const { brightness, contrast, crop } = getImageSettings(product.mainImage, product);
  const optimizedImage = getOptimizedImageUrl(product.mainImage, 150, brightness, contrast, crop);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-2 rounded border shadow-sm cursor-move hover:shadow-md transition-shadow relative group ${isOutOfStock ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'
        }`}
    >
      <div className="aspect-square bg-gray-100 rounded overflow-hidden mb-2 relative">
        <img
          src={optimizedImage}
          alt={product.name}
          className={`w-full h-full object-cover pointer-events-none ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
        />
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-gray-800/70 text-white text-[10px] px-2 py-1 rounded-full font-medium">
              Agotado
            </span>
          </div>
        )}
      </div>
      <div className={`text-xs font-medium truncate ${isOutOfStock ? 'text-gray-500' : 'text-gray-900'}`}>
        {product.name}
      </div>
      <div className="text-xs text-gray-500">S/ {Number(product.price || 0).toFixed(2)}</div>
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white/80 rounded p-1">
        <GripVertical className="h-3 w-3 text-gray-600" />
      </div>
    </div>
  );
};

// Sortable Category Item
const SortableCategoryItem = ({ category }: { category: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: category });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="px-3 py-2 bg-white border border-beige-200 rounded shadow-sm cursor-move hover:shadow-md transition-shadow text-sm font-medium text-gray-800 flex items-center justify-between"
    >
      <span>{category}</span>
      <GripVertical className="h-4 w-4 text-gray-500" />
    </div>
  );
};

type SelectedImage = {
  file: File;
  previewUrl: string;
  filename: string;
};

type EditingImage = {
  type: 'url' | 'file';
  url: string;
  file?: File;
  id: string;
};

const Admin: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, updateProductOrder } = useProducts();
  const { isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'orders' | 'organize' | 'stats'>('upload');

  // Organize State
  const [orderedProducts, setOrderedProducts] = useState<Product[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setOrderedProducts(products);
    const uniqueCategories = Array.from(new Set(products.map(p => p.category || 'General')));
    setCategoryOrder(uniqueCategories);
  }, [products]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setOrderedProducts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSaveOrder = async () => {
    setIsSavingOrder(true);
    try {
      await updateProductOrder(orderedProducts);
      alert('Orden actualizado correctamente');
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Error al guardar el orden');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const applyCategoryOrdering = () => {
    if (!categoryOrder.length) return;
    setOrderedProducts(prev => {
      const grouped = categoryOrder.flatMap(cat => prev.filter(p => (p.category || 'General') === cat));
      const remaining = prev.filter(p => !categoryOrder.includes(p.category || 'General'));
      return [...grouped, ...remaining];
    });
  };

  const applyPriceSort = (direction: 'asc' | 'desc') => {
    setOrderedProducts(prev => {
      return [...prev].sort((a, b) => direction === 'asc' ? a.price - b.price : b.price - a.price);
    });
  };

  // Product Form State
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategory, setProductCategory] = useState('Mesas');
  const [productDescription, setProductDescription] = useState(productDescriptions['Mesas']?.[0] || '');
  const [descriptionIndex, setDescriptionIndex] = useState(0);
  // Global brightness/contrast state removed in favor of per-image settings
  const [imageSettingsMap, setImageSettingsMap] = useState<Record<string, { brightness: number; contrast: number; crop?: { x: number; y: number; width: number; height: number } }>>({});
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [croppingImage, setCroppingImage] = useState<{ url: string; x: number; y: number; width: number; height: number; isNew?: boolean } | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState(1);
  const dragStartRef = useRef<{ x: number; y: number; startX: number; startY: number; startWidth: number; startHeight: number; mode: 'move' | 'resize' } | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const currentImageSettings = selectedImageId && imageSettingsMap[selectedImageId]
    ? imageSettingsMap[selectedImageId]
    : { brightness: 100, contrast: 100, crop: undefined };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingImages, setEditingImages] = useState<EditingImage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [mainUploadIndex, setMainUploadIndex] = useState(0);

  const selectedImagesRef = useRef<SelectedImage[]>([]);

  const handleCrop = (url: string) => {
    const settings = imageSettingsMap[url]?.crop;
    // Fallback temporal; luego onLoad recalcula un cuadrado centrado real según proporción
    const defaultCrop = { x: 10, y: 10, width: 80, height: 80 };

    const isNew = !settings || !settings.width;
    const initialCrop = (settings && settings.width)
      ? { x: settings.x, y: settings.y, width: settings.width, height: settings.height }
      : defaultCrop;

    setCroppingImage({
      url,
      ...initialCrop,
      isNew
    });
  };

  const saveCrop = (x: number, y: number, width: number, height: number) => {
    if (!croppingImage) return;
    setImageSettingsMap(prev => ({
      ...prev,
      [croppingImage.url]: {
        ...prev[croppingImage.url],
        crop: { x, y, width, height }
      }
    }));
    setCroppingImage(null);
  };

  // Order Management State
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'date_desc' | 'date_asc' | 'total_desc' | 'total_asc'>('date_desc');
  const [installmentDrafts, setInstallmentDrafts] = useState<Record<string, { amount: string; note: string }>>({});

  // Product variants / stock state (must be declared before any early returns)
  const [hasVariants, setHasVariants] = useState(false);
  const [stock, setStock] = useState(1);
  const [variants, setVariants] = useState<{ size: string, stock: number, price?: number }[]>([]);
  const [newVariantSize, setNewVariantSize] = useState('');
  const [newVariantStock, setNewVariantStock] = useState(1);
  const [newVariantPrice, setNewVariantPrice] = useState('');

  const availableCategories = useMemo(() => {
    const fromProducts = products.map((p) => (p.category || '').trim()).filter(Boolean);
    return Array.from(new Set(fromProducts));
  }, [products]);

  const getCategoryDescriptions = (category: string) => {
    const trimmed = (category || '').trim();
    return productDescriptions[trimmed] || productDescriptions['Mesas'] || [];
  };

  const handlePrevDescription = () => {
    const list = getCategoryDescriptions(productCategory);
    if (list.length === 0) return;
    const newIndex = (descriptionIndex - 1 + list.length) % list.length;
    setDescriptionIndex(newIndex);
    setProductDescription(list[newIndex]);
  };

  const handleNextDescription = () => {
    const list = getCategoryDescriptions(productCategory);
    if (list.length === 0) return;
    const newIndex = (descriptionIndex + 1) % list.length;
    setDescriptionIndex(newIndex);
    setProductDescription(list[newIndex]);
  };

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      selectedImagesRef.current.forEach(img => {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'stats') {
      fetchOrders();
    }
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setOrders(data as Order[]);
    } catch (error) {
      console.error('Error fetching orders:', error);
      alert('Error al cargar los pedidos');
    } finally {
      setLoadingOrders(false);
    }
  };

  const deleteOrderItem = async (order: Order, itemIndex: number) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto del pedido? El stock será restaurado.')) {
      return;
    }

    try {
      const item = order.items[itemIndex];

      // 1. Restaurar stock del producto
      const { data: productData } = await supabase
        .from('products')
        .select('*')
        .eq('id', item.product.id)
        .single();

      if (productData) {
        let newStock = productData.stock;
        let newVariants = productData.variants;
        const quantityToRestore = item.quantity;
        const sizeToRestore = item.selectedSize;

        if (sizeToRestore && Array.isArray(newVariants)) {
          newVariants = newVariants.map((v: any) => {
            if (v.size === sizeToRestore) {
              return { ...v, stock: (v.stock || 0) + quantityToRestore };
            }
            return v;
          });
          newStock = newVariants.reduce((acc: number, v: any) => acc + (v.stock || 0), 0);
        } else {
          newStock = (productData.stock || 0) + quantityToRestore;
        }

        await updateProduct(item.product.id, {
          stock: newStock,
          variants: newVariants,
          inStock: newStock > 0
        });
      }

      // 2. Actualizar pedido (remover item y recalcular total)
      const newItems = order.items.filter((_, idx) => idx !== itemIndex);

      // Si no quedan items, quizás deberíamos eliminar el pedido completo o dejarlo vacío con total 0
      // Aquí lo dejaremos vacío con total 0
      const newTotal = newItems.reduce((acc, curr) => acc + (curr.quantity * curr.product.price), 0);

      const { error } = await supabase
        .from('orders')
        .update({
          items: newItems,
          total_amount: newTotal
        })
        .eq('id', order.id);

      if (error) throw error;

      // 3. Actualizar estado local
      const updatedOrder = { ...order, items: newItems, total_amount: newTotal };
      setOrders(orders.map(o => o.id === order.id ? updatedOrder : o));
      if (selectedOrder?.id === order.id) setSelectedOrder(updatedOrder);

      alert('Producto eliminado del pedido y stock restaurado.');

    } catch (error) {
      console.error('Error deleting order item:', error);
      alert('Error al eliminar el producto del pedido');
    }
  };

  const deleteOrder = async (order: Order) => {
    if (!window.confirm('¿Estás seguro de eliminar este pedido? El stock de los productos será restaurado.')) {
      return;
    }

    try {
      // 1. Restaurar stock
      for (const item of order.items as any[]) {
        const { data: productData } = await supabase
          .from('products')
          .select('*')
          .eq('id', item.product.id)
          .single();

        if (productData) {
          let newStock = productData.stock;
          let newVariants = productData.variants;
          const quantityToRestore = item.quantity;
          const sizeToRestore = item.selectedSize;

          if (sizeToRestore && Array.isArray(newVariants)) {
            newVariants = newVariants.map((v: any) => {
              if (v.size === sizeToRestore) {
                return { ...v, stock: (v.stock || 0) + quantityToRestore };
              }
              return v;
            });
            newStock = newVariants.reduce((acc: number, v: any) => acc + (v.stock || 0), 0);
          } else {
            newStock = (productData.stock || 0) + quantityToRestore;
          }

          // Update product
          await updateProduct(item.product.id, {
            stock: newStock,
            variants: newVariants,
            inStock: newStock > 0
          });
        }
      }

      // 2. Eliminar pedido
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', order.id);

      if (error) throw error;

      // 3. Actualizar lista local
      setOrders(orders.filter(o => o.id !== order.id));
      if (selectedOrder?.id === order.id) setSelectedOrder(null);

      alert('Pedido eliminado y stock restaurado correctamente.');

    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error al eliminar el pedido');
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus as any } : order
      ));

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus as any });
      }

      alert('Estado actualizado correctamente');
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert(`Error al actualizar el estado: ${error.message || 'Error desconocido'}`);
    }
  };

  const generateId = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const getInstallmentStats = (order: Order) => {
    const planned = order.installments || 1;
    const payments = order.installment_payments || [];
    const paidAmount = payments.filter(p => p.paid).reduce((acc, p) => acc + (p.amount || 0), 0);
    const remaining = Math.max((order.total_amount || 0) - paidAmount, 0);
    const exceeded = payments.length > planned;
    return { planned, payments, paidAmount, remaining, exceeded };
  };

  const isOrderCompliant = (order: Order) => {
    const payments = (order.installment_payments || []).filter(p => p.paid && p.paid_at);
    if (!payments.length) return false;

    const sorted = [...payments].sort((a, b) => new Date(a.paid_at as string).getTime() - new Date(b.paid_at as string).getTime());
    const created = new Date(order.created_at).getTime();
    const maxGap = 40 * 24 * 60 * 60 * 1000; // 40 días en ms

    // Primera cuota dentro de 40 días de la compra
    if (sorted[0].paid_at) {
      const firstGap = new Date(sorted[0].paid_at).getTime() - created;
      if (firstGap > maxGap) return false;
    }

    // Siguientes cuotas con brecha máxima de 40 días entre pagos
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].paid_at as string).getTime();
      const curr = new Date(sorted[i].paid_at as string).getTime();
      if (curr - prev > maxGap) return false;
    }

    return true;
  };

  const saveInstallments = async (order: Order, payments: InstallmentPayment[]) => {
    const { error } = await supabase
      .from('orders')
      .update({ installment_payments: payments })
      .eq('id', order.id);

    if (error) throw error;

    setOrders(prev => prev.map(o => o.id === order.id ? { ...o, installment_payments: payments } : o));
    if (selectedOrder?.id === order.id) {
      setSelectedOrder({ ...selectedOrder, installment_payments: payments });
    }
  };

  const addInstallmentPayment = async (order: Order) => {
    const draft = installmentDrafts[order.id] || { amount: '', note: '' };
    const amount = parseFloat(draft.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Ingresa un monto válido para la cuota');
      return;
    }

    const payments = order.installment_payments || [];
    const newPayment: InstallmentPayment = {
      id: generateId(),
      amount,
      paid: false,
      note: draft.note?.trim() || undefined,
    };

    try {
      await saveInstallments(order, [...payments, newPayment]);
      setInstallmentDrafts(prev => ({ ...prev, [order.id]: { amount: '', note: '' } }));
    } catch (error: any) {
      console.error('Error agregando cuota:', error);
      alert(`No se pudo agregar la cuota: ${error.message || 'Error desconocido'}`);
    }
  };

  const toggleInstallmentPaid = async (order: Order, paymentId: string) => {
    const payments = order.installment_payments || [];
    const updated = payments.map(p => {
      if (p.id !== paymentId) return p;
      const paid = !p.paid;
      return {
        ...p,
        paid,
        paid_at: paid ? new Date().toISOString() : undefined,
      };
    });

    try {
      await saveInstallments(order, updated);
    } catch (error: any) {
      console.error('Error actualizando cuota:', error);
      alert(`No se pudo actualizar la cuota: ${error.message || 'Error desconocido'}`);
    }
  };

  const deleteInstallmentPayment = async (order: Order, paymentId: string) => {
    if (!window.confirm('¿Eliminar esta cuota?')) return;

    const payments = order.installment_payments || [];
    const updated = payments.filter(p => p.id !== paymentId);

    try {
      await saveInstallments(order, updated);
    } catch (error: any) {
      console.error('Error eliminando cuota:', error);
      alert(`No se pudo eliminar la cuota: ${error.message || 'Error desconocido'}`);
    }
  };

  const normalizedSearch = customerSearch.trim().toLowerCase();
  const filteredOrders = orders
    .filter(order => statusFilter === 'all' || order.status === statusFilter)
    .filter(order => !normalizedSearch ? true : (order.customer_name || '').toLowerCase().includes(normalizedSearch))
    .filter(order => paymentFilter === 'all' ? true : (order.payment_method || '').toLowerCase() === paymentFilter.toLowerCase());

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const aDate = new Date(a.created_at).getTime();
    const bDate = new Date(b.created_at).getTime();
    const aTotal = Number(a.total_amount) || 0;
    const bTotal = Number(b.total_amount) || 0;
    switch (sortOption) {
      case 'date_asc':
        return aDate - bDate;
      case 'total_desc':
        return bTotal - aTotal;
      case 'total_asc':
        return aTotal - bTotal;
      case 'date_desc':
      default:
        return bDate - aDate;
    }
  });

  // Stats data (after orders state is defined)
  const toNumber = (value: unknown) => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '.').trim();
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const formatCurrency = (value: number) => `S/ ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  const totalRevenue = useMemo(() => orders.reduce((acc, o) => acc + toNumber(o.total_amount), 0), [orders]);
  const totalOrders = orders.length;
  const totalItemsSold = useMemo(() => orders.reduce((acc, o) => acc + (o.items || []).reduce((a, i) => a + (i.quantity || 0), 0), 0), [orders]);

  const salesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach(o => {
      (o.items || []).forEach(it => {
        const cat = it.product?.category || 'General';
        map.set(cat, (map.get(cat) || 0) + (it.quantity || 0));
      });
    });
    return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
  }, [orders]);

  const groupByPeriod = (period: 'day' | 'week' | 'month') => {
    const map = new Map<string, number>();
    orders.forEach(o => {
      const d = new Date(o.created_at);
      if (Number.isNaN(d.getTime())) return;
      let key = '';
      if (period === 'day') {
        key = d.toISOString().slice(0, 10);
      } else if (period === 'month') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else {
        // ISO week label
        const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = tmp.getUTCDay() || 7;
        tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        key = `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
      }
      map.set(key, (map.get(key) || 0) + 1);
    });
    const arr = Array.from(map.entries()).map(([label, value]) => ({ label, value }));
    return arr.sort((a, b) => a.label.localeCompare(b.label)).slice(-12); // keep last 12 periods
  };

  const ordersByDay = useMemo(() => groupByPeriod('day'), [orders]);
  const ordersByWeek = useMemo(() => groupByPeriod('week'), [orders]);
  const ordersByMonth = useMemo(() => groupByPeriod('month'), [orders]);

  const fastestCategory = useMemo<{ cat: string; rate: number } | null>(() => {
    if (!orders.length) return null;
    const now = Date.now();
    const stats = new Map<string, { qty: number; first: number }>();
    orders.forEach(o => {
      const created = new Date(o.created_at).getTime();
      (o.items || []).forEach(it => {
        const cat = it.product?.category || 'General';
        if (!stats.has(cat)) stats.set(cat, { qty: 0, first: created });
        const curr = stats.get(cat)!;
        curr.qty += it.quantity || 0;
        curr.first = Math.min(curr.first, created);
        stats.set(cat, curr);
      });
    });
    let best: { cat: string; rate: number } | null = null;
    stats.forEach((v, cat) => {
      const days = Math.max(1, (now - v.first) / 86400000);
      const rate = v.qty / days;
      if (!best || rate > best.rate) best = { cat, rate };
    });
    return best;
  }, [orders]);

  const fastestCategoryLabel = useMemo(() => {
    if (!fastestCategory) return 'Sin datos';
    const { cat, rate } = fastestCategory;
    return `${cat} (${rate.toFixed(2)} uds/día)`;
  }, [fastestCategory]);

  const maxValue = (arr: { value: number }[]) => arr.reduce((m, it) => Math.max(m, it.value), 0);

  const stockByCategory = useMemo(() => {
    const map = new Map<string, { value: number; count: number; piecesInStock: number; valueInStock: number }>();
    products.forEach(p => {
      const cat = p.category || 'General';
      const entry = map.get(cat) || { value: 0, count: 0, piecesInStock: 0, valueInStock: 0 };
      const stock = p.stock || 0;
      entry.value += stock * toNumber(p.price);
      entry.count += 1;
      if (stock > 0) {
        entry.piecesInStock += stock;
        entry.valueInStock += stock * toNumber(p.price);
      }
      map.set(cat, entry);
    });
    const entries = Array.from(map.entries());
    const valueBars = entries.map(([label, data]) => ({ label, value: data.valueInStock }));
    const countBars = entries.map(([label, data]) => ({ label, value: data.piecesInStock }));
    const totalInStockPieces = entries.reduce((acc, [, data]) => acc + data.piecesInStock, 0);
    const totalInStockValue = entries.reduce((acc, [, data]) => acc + data.valueInStock, 0);
    return {
      valueBars,
      countBars,
      totalInStockPieces,
      totalInStockValue,
    };
  }, [products]);

  const lifetimeByCategory = useMemo(() => {
    const map = new Map<string, { soldPieces: number; soldValue: number; currentPieces: number; currentValue: number }>();

    // Current stock
    products.forEach(p => {
      const cat = p.category || 'General';
      const entry = map.get(cat) || { soldPieces: 0, soldValue: 0, currentPieces: 0, currentValue: 0 };
      const stock = p.stock || 0;
      entry.currentPieces += stock;
      entry.currentValue += stock * toNumber(p.price);
      map.set(cat, entry);
    });

    // Sold pieces from orders (solo estados recibidos/confirmados/en proceso/entregado)
    const recognizedStatuses = new Set(['Recibido', 'Confirmado', 'En proceso', 'Entregado']);
    orders.forEach(o => {
      if (!recognizedStatuses.has(o.status)) return;
      (o.items || []).forEach(it => {
        const cat = it.product?.category || 'General';
        const entry = map.get(cat) || { soldPieces: 0, soldValue: 0, currentPieces: 0, currentValue: 0 };
        const qty = it.quantity || 0;
        const price = toNumber(it.product?.price);
        entry.soldPieces += qty;
        entry.soldValue += qty * price;
        map.set(cat, entry);
      });
    });

    const entries = Array.from(map.entries());
    const valueBars = entries.map(([label, data]) => ({ label, value: data.soldValue + data.currentValue }));
    const piecesBars = entries.map(([label, data]) => ({ label, value: data.soldPieces + data.currentPieces }));
    const totalPieces = entries.reduce((acc, [, d]) => acc + d.soldPieces + d.currentPieces, 0);
    const totalValue = entries.reduce((acc, [, d]) => acc + d.soldValue + d.currentValue, 0);

    return { valueBars, piecesBars, totalPieces, totalValue };
  }, [products, orders]);

  const soldByCategory = useMemo(() => {
    const map = new Map<string, { soldPieces: number; soldValue: number }>();
    const recognizedStatuses = new Set(['Recibido', 'Confirmado', 'En proceso', 'Entregado']);

    orders.forEach(o => {
      if (!recognizedStatuses.has(o.status)) return;
      (o.items || []).forEach(it => {
        const cat = it.product?.category || 'General';
        const entry = map.get(cat) || { soldPieces: 0, soldValue: 0 };
        const qty = it.quantity || 0;
        const price = toNumber(it.product?.price);
        entry.soldPieces += qty;
        entry.soldValue += qty * price;
        map.set(cat, entry);
      });
    });

    const entries = Array.from(map.entries());
    const valueBars = entries.map(([label, data]) => ({ label, value: data.soldValue }));
    const piecesBars = entries.map(([label, data]) => ({ label, value: data.soldPieces }));
    const totalPieces = entries.reduce((acc, [, d]) => acc + d.soldPieces, 0);
    const totalValue = entries.reduce((acc, [, d]) => acc + d.soldValue, 0);

    return { valueBars, piecesBars, totalPieces, totalValue };
  }, [orders]);

  // Si no está autenticado, mostrar el formulario de login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <AdminLogin onLogin={() => { }} />
      </div>
    );
  }


  const handleAddVariant = () => {
    if (newVariantSize && newVariantStock > 0) {
      let variantPrice: number | undefined = undefined;
      if (newVariantPrice && !isNaN(parseFloat(newVariantPrice))) {
        variantPrice = parseFloat(newVariantPrice);
      }
      setVariants([...variants, { size: newVariantSize, stock: newVariantStock, price: variantPrice }]);
      setNewVariantSize('');
      setNewVariantStock(1);
      setNewVariantPrice('');
    }
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const removeUploadedImage = (indexToRemove: number) => {
    setSelectedImages(prev => {
      const target = prev[indexToRemove];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== indexToRemove);
    });
    setMainUploadIndex(prevMain => {
      if (indexToRemove === prevMain) return 0;
      if (indexToRemove < prevMain) return Math.max(0, prevMain - 1);
      return prevMain;
    });
  };

  const handleSelectImages = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const next: SelectedImage[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
        filename: file.name
      }));

    setSelectedImages(prev => {
      // avoid duplicates by name+size+lastModified
      const existingKeys = new Set(prev.map(p => `${p.file.name}:${p.file.size}:${p.file.lastModified}`));
      const merged = [...prev];
      for (const img of next) {
        const key = `${img.file.name}:${img.file.size}:${img.file.lastModified}`;
        if (!existingKeys.has(key)) merged.push(img);
      }
      return merged;
    });

    const newSettings = { ...imageSettingsMap };
    next.forEach(img => {
      newSettings[img.previewUrl] = { brightness: 100, contrast: 100, crop: undefined };
    });
    setImageSettingsMap(newSettings);
    if (next.length > 0 && !selectedImageId) {
      setSelectedImageId(next[0].previewUrl);
    }
  };

  const handleUploadProduct = async () => {
    if (!productName.trim() || !productPrice || !productDescription.trim()) {
      alert('Por favor, completa todos los campos');
      return;
    }

    if (selectedImages.length === 0) {
      alert('Por favor, sube al menos una imagen');
      return;
    }

    setIsUploading(true);

    try {
      const totalStock = hasVariants
        ? variants.reduce((acc, curr) => acc + curr.stock, 0)
        : stock;

      // 1) Crear el producto (confirmación) SIN subir imágenes aún.
      //    Luego subimos imágenes y actualizamos el producto.
      const placeholderImage = 'https://images.pexels.com/photos/1927259/pexels-photo-1927259.jpeg?auto=compress&cs=tinysrgb&w=800';

      const newProduct: Product = {
        id: Date.now().toString(),
        name: productName,
        price: parseFloat(productPrice),
        category: productCategory.trim() || 'Mesas',
        description: productDescription,
        mainImage: placeholderImage,
        additionalImages: [],
        featured: false,
        inStock: totalStock > 0,
        stock: totalStock,
        variants: hasVariants ? variants : undefined,

        brightness: 100, // Legacy/Default
        contrast: 100,
        imageSettings: {} // Will be populated after upload
      };

      const created = await addProduct(newProduct);

      // 2) Subir imágenes a Cloudinary (solo después de que el producto ya fue creado)
      const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const CLOUDINARY_FOLDER = import.meta.env.VITE_CLOUDINARY_FOLDER;

      if (!CLOUD_NAME || !UPLOAD_PRESET) {
        throw new Error('Falta configurar Cloudinary en el .env (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET)');
      }

      const orderedSelection = (() => {
        const safeMainIndex = Math.min(Math.max(mainUploadIndex, 0), selectedImages.length - 1);
        const main = selectedImages[safeMainIndex];
        const rest = selectedImages.filter((_, i) => i !== safeMainIndex);
        return [main, ...rest];
      })();

      const uploadOne = async (img: SelectedImage) => {
        const form = new FormData();
        form.append('file', img.file);
        form.append('upload_preset', UPLOAD_PRESET);
        if (CLOUDINARY_FOLDER) form.append('folder', CLOUDINARY_FOLDER);

        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: form
        });

        const json = await res.json();
        if (!res.ok) {
          const message = json?.error?.message || 'Error subiendo imagen a Cloudinary';
          throw new Error(message);
        }

        return {
          secure_url: json.secure_url as string,
          public_id: json.public_id as string,
          format: json.format as string | undefined,
          bytes: typeof json.bytes === 'number' ? json.bytes : undefined,
          width: typeof json.width === 'number' ? json.width : undefined,
          height: typeof json.height === 'number' ? json.height : undefined
        };
      };

      const uploaded = await Promise.all(orderedSelection.map(uploadOne));
      const urls = uploaded.map(u => u.secure_url);

      // 3) Actualizar producto con URLs reales
      // 3) Actualizar producto con URLs reales
      await updateProduct(created.id, {
        mainImage: urls[0] || placeholderImage,
        additionalImages: urls.slice(1),
        imageSettings: (() => {
          const map: Record<string, { brightness: number; contrast: number }> = {};
          uploaded.forEach((u, i) => {
            const original = orderedSelection[i];
            const settings = imageSettingsMap[original.previewUrl] || { brightness: 100, contrast: 100 };
            map[u.secure_url] = settings;
          });
          return map;
        })()
      });

      // 4) Insertar relación en product_images
      const imagesToPersist = uploaded.map((img, index) => ({
        product_id: created.id,
        public_id: img.public_id,
        secure_url: img.secure_url,
        format: img.format || null,
        bytes: img.bytes ?? null,
        width: img.width ?? null,
        height: img.height ?? null,
        is_main: index === 0,
        sort_order: index
      }));

      if (imagesToPersist.length > 0) {
        const { error } = await supabase
          .from('product_images')
          .insert(imagesToPersist);

        if (error) {
          console.error('Error linking product_images:', error);
        }
      }

      // Reset
      setProductName('');
      setProductPrice('');
      // Reset description to the first one of the current category
      const defaultDesc = getCategoryDescriptions(productCategory)?.[0] || '';
      setProductDescription(defaultDesc);
      setDescriptionIndex(0);

      setSelectedImages(prev => {
        prev.forEach(img => img.previewUrl && URL.revokeObjectURL(img.previewUrl));
        return [];
      });
      setMainUploadIndex(0);
      setHasVariants(false);
      setStock(1);
      setVariants([]);
      setImageSettingsMap({});
      setSelectedImageId(null);
      alert('Producto agregado exitosamente');
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Error al crear el producto. Revisa la consola para más detalles.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      deleteProduct(id);
    }
  };

  const handleSelectEditImages = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const newImages: EditingImage[] = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map((file) => ({
        type: 'file',
        file,
        url: URL.createObjectURL(file),
        id: `new-${Date.now()}-${Math.random()}`
      }));
    setEditingImages(prev => [...prev, ...newImages]);
    const newSettings = { ...imageSettingsMap };
    newImages.forEach(img => {
      newSettings[img.url] = { brightness: 100, contrast: 100, crop: undefined };
    });
    setImageSettingsMap(newSettings);
    if (newImages.length > 0 && !selectedImageId) {
      setSelectedImageId(newImages[0].url);
    }
  };

  const removeEditImage = (index: number) => {
    setEditingImages(prev => {
      const target = prev[index];
      if (target.type === 'file') URL.revokeObjectURL(target.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const setMainEditImage = (index: number) => {
    setEditingImages(prev => {
      const newArr = [...prev];
      const [item] = newArr.splice(index, 1);
      newArr.unshift(item);
      return newArr;
    });
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;

    setIsUploading(true);
    try {
      // Upload new images
      const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
      const CLOUDINARY_FOLDER = import.meta.env.VITE_CLOUDINARY_FOLDER;

      const finalUrls: string[] = [];

      for (const img of editingImages) {
        if (img.type === 'url') {
          finalUrls.push(img.url);
        } else if (img.type === 'file' && img.file) {
          const form = new FormData();
          form.append('file', img.file);
          form.append('upload_preset', UPLOAD_PRESET);
          if (CLOUDINARY_FOLDER) form.append('folder', CLOUDINARY_FOLDER);

          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: form
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json?.error?.message || 'Error uploading image');
          finalUrls.push(json.secure_url);
        }
      }

      const productToSave = {
        ...editingProduct,
        price: (typeof editingProduct.price === 'string' && !isNaN(parseFloat(editingProduct.price)))
          ? parseFloat(editingProduct.price)
          : (typeof editingProduct.price === 'number' ? editingProduct.price : 0),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variants: editingProduct.variants?.map((v: any) => ({
          ...v,
          price: (v.price !== undefined && v.price !== '' && !isNaN(parseFloat(v.price.toString())))
            ? parseFloat(v.price.toString())
            : undefined
        })),
        mainImage: finalUrls[0] || editingProduct.mainImage,
        additionalImages: finalUrls.slice(1)
      };

      const finalSettings = { ...imageSettingsMap };
      // Update mappings for newly uploaded images
      for (let i = 0; i < finalUrls.length; i++) {
        // Find which editing image this corresponds to
        // If it was a file, we look up by the blob url we used as key
        // But here we just need to ensure the new URL has the settings of the old blob URL
        // finalUrls contains ALL urls (existing and new) in order?
        // Wait, finalUrls code block pushes either img.url (existing) or json.secure_url (new)
        const oldImg = editingImages[i];
        if (oldImg.type === 'file') {
          const settings = imageSettingsMap[oldImg.url];
          if (settings) {
            finalSettings[finalUrls[i]] = settings;
            // convert blob setting to url setting
          }
        }
      }

      await updateProduct(editingProduct.id, {
        ...productToSave,
        imageSettings: finalSettings
      });
      setEditingProduct(null);
      setEditingImages([]);
      setImageSettingsMap({});
      setSelectedImageId(null);
    } catch (error) {
      console.error('Error saving edit:', error);
      alert('Error al guardar cambios');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('¿Estás seguro de que quieres cerrar sesión?')) {
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SEO title="Admin" description="Panel de administración" url="/admin" noindex />
      <div className="bg-cream-25 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="font-playfair text-4xl font-bold text-gray-900 mb-4">
              Panel de Administración
            </h1>
            <p className="font-inter text-gray-600">
              Gestiona productos, stock y pedidos de King's Pong
            </p>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors duration-200"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-beige-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'upload'
                  ? 'border-gold-500 text-gold-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Upload className="h-4 w-4 inline mr-2" />
                Subir Producto
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'manage'
                  ? 'border-gold-500 text-gold-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Eye className="h-4 w-4 inline mr-2" />
                Gestionar Productos ({products.length})
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'orders'
                  ? 'border-gold-500 text-gold-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <ShoppingBag className="h-4 w-4 inline mr-2" />
                Pedidos
              </button>
              <button
                onClick={() => setActiveTab('organize')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'organize'
                  ? 'border-gold-500 text-gold-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <LayoutGrid className="h-4 w-4 inline mr-2" />
                Organizar Productos
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === 'stats'
                  ? 'border-gold-500 text-gold-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <BarChart3 className="h-4 w-4 inline mr-2" />
                Estadísticas
              </button>
            </nav>
          </div>
        </div>

        {/* Upload Product Tab */}
        {activeTab === 'upload' && (
          <div className="bg-white rounded-lg shadow-sm border border-beige-200 p-8">
            <h2 className="font-playfair text-2xl font-bold text-gray-900 mb-6">
              Subir Nuevo Producto
            </h2>
            {/* Selección local (sube a Cloudinary SOLO al guardar producto) */}
            <div className="mb-4">
              <label className="block font-inter text-sm font-medium text-gray-700 mb-2">
                Imágenes del producto
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleSelectImages(e.target.files)}
                className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-cream-100 file:text-gold-800 hover:file:bg-cream-200"
              />
              <p className="mt-2 text-xs text-gray-500">
                Las imágenes se subirán a Cloudinary cuando confirmes “Agregar Producto”.
              </p>
            </div>

            {selectedImages.length > 0 && (
              <div className="mb-6">
                <h3 className="font-inter text-sm font-medium text-gray-700 mb-3">
                  Imágenes seleccionadas ({selectedImages.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {selectedImages.map((img, index) => {
                    const isSelected = selectedImageId === img.previewUrl;
                    const settings = imageSettingsMap[img.previewUrl] || { brightness: 100, contrast: 100 };
                    return (
                      <div
                        key={`${img.filename}-${img.file.size}-${img.file.lastModified}-${index}`}
                        className={`border rounded-lg overflow-hidden bg-white cursor-pointer transition-all ${isSelected ? 'border-gold-500 ring-2 ring-gold-200' : 'border-beige-200'}`}
                        onClick={() => setSelectedImageId(img.previewUrl)}
                      >
                        <div className="aspect-square overflow-hidden bg-gray-50 relative">
                          <img
                            src={getOptimizedImageUrl(img.previewUrl, 400, settings.brightness, settings.contrast, settings.crop)}
                            alt={img.filename}
                            className="w-full h-full object-cover transition-all duration-200"
                          />
                        </div>
                        <div className="p-2">
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setMainUploadIndex(index); }}
                              className={
                                "text-xs px-2 py-1 rounded-full border transition-colors " +
                                (index === mainUploadIndex
                                  ? 'bg-cream-200 text-gold-800 border-beige-300'
                                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50')
                              }
                            >
                              {index === mainUploadIndex ? 'Principal' : 'Hacer principal'}
                            </button>
                            <div className="flex space-x-1">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleCrop(img.previewUrl); }}
                                className="text-gray-600 hover:text-gold-600 p-1 rounded-full hover:bg-gray-100"
                                title="Recortar / Centrar"
                              >
                                <Scissors className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeUploadedImage(index); }}
                                className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <p className="mt-2 text-[11px] text-gray-500 truncate" title={img.filename}>
                            {img.filename}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-beige-200 mt-4">

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Brillo {selectedImageId ? '(Imagen seleccionada)' : '(Selecciona una imagen)'}</label>
                      <span className="text-xs text-gray-500">{currentImageSettings.brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={currentImageSettings.brightness}
                      onChange={(e) => {
                        if (!selectedImageId) return;
                        setImageSettingsMap(prev => ({
                          ...prev,
                          [selectedImageId]: { ...prev[selectedImageId], brightness: Number(e.target.value) }
                        }));
                      }}
                      disabled={!selectedImageId}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Contraste {selectedImageId ? '(Imagen seleccionada)' : '(Selecciona una imagen)'}</label>
                      <span className="text-xs text-gray-500">{currentImageSettings.contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={currentImageSettings.contrast}
                      onChange={(e) => {
                        if (!selectedImageId) return;
                        setImageSettingsMap(prev => ({
                          ...prev,
                          [selectedImageId]: { ...prev[selectedImageId], contrast: Number(e.target.value) }
                        }));
                      }}
                      disabled={!selectedImageId}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="space-y-6">
              {/* Product Details Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="productCategory" className="block font-inter text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <select
                    id="productCategorySelect"
                    value=""
                    onChange={(e) => {
                      const selectedCategory = e.target.value;
                      if (!selectedCategory) return;
                      setProductCategory(selectedCategory);
                      setDescriptionIndex(0);
                      const list = getCategoryDescriptions(selectedCategory);
                      setProductDescription(list[0] || '');
                      e.currentTarget.value = "";
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent mb-2"
                  >
                    <option value="">Seleccionar categoría existente...</option>
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <input
                    id="productCategory"
                    value={productCategory}
                    onChange={(e) => {
                      const newCategory = e.target.value;
                      setProductCategory(newCategory);
                      setDescriptionIndex(0);
                      const list = getCategoryDescriptions(newCategory);
                      setProductDescription(list[0] || '');
                    }}
                    list="admin-category-options"
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                    placeholder="Ej: Mesas, Vasos, Pelotas, Juegos..."
                  />
                  <datalist id="admin-category-options">
                    {availableCategories.map((cat) => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                  <p className="mt-1 text-xs text-gray-500">
                    Puedes elegir una categoría existente o escribir una nueva.
                  </p>
                </div>

                <div>
                  <label htmlFor="productPrice" className="block font-inter text-sm font-medium text-gray-700 mb-2">
                    Precio (S/)
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    id="productPrice"
                    value={productPrice}
                    onChange={(e) => {
                      const val = e.target.value.replace(/,/g, '.');
                      if (/^\d*\.?\d*$/.test(val)) {
                        setProductPrice(val);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="productName" className="block font-inter text-sm font-medium text-gray-700 mb-2">
                  Nombre del Producto
                </label>
                <input
                  type="text"
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  placeholder="Ej: Mesa KP Pro"
                />
              </div>

              {/* Product Description */}
              <div>
                <label htmlFor="productDescription" className="block font-inter text-sm font-medium text-gray-700 mb-2">
                  Descripción del Producto
                </label>
                <div className="relative">
                  <textarea
                    id="productDescription"
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    rows={4}
                    placeholder="Descripción detallada del producto..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent resize-vertical"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <button
                      type="button"
                      onClick={handlePrevDescription}
                      className="flex items-center text-sm text-gray-600 hover:text-gold-600 transition-colors"
                      title="Descripción anterior"
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </button>
                    <span className="text-xs text-gray-400">
                      Opción {descriptionIndex + 1} de {getCategoryDescriptions(productCategory).length}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextDescription}
                      className="flex items-center text-sm text-gray-600 hover:text-gold-600 transition-colors"
                      title="Siguiente descripción"
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Stock and Variants Configuration */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="flex items-center mb-4">
                  <input
                    type="checkbox"
                    id="hasVariants"
                    checked={hasVariants}
                    onChange={(e) => setHasVariants(e.target.checked)}
                    className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                  />
                  <label htmlFor="hasVariants" className="ml-2 block text-sm text-gray-900 font-medium">
                    Este producto tiene variantes (tallas/medidas)
                  </label>
                </div>

                {!hasVariants ? (
                  <div>
                    <label htmlFor="stock" className="block font-inter text-sm font-medium text-gray-700 mb-2">
                      Stock Total
                    </label>
                    <input
                      type="number"
                      id="stock"
                      min="0"
                      value={stock}
                      onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="block font-inter text-sm font-medium text-gray-700 mb-2">
                          Talla / Medida
                        </label>
                        <input
                          type="text"
                          value={newVariantSize}
                          onChange={(e) => setNewVariantSize(e.target.value)}
                          placeholder="Ej: 45cm, Talla 7, etc."
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block font-inter text-sm font-medium text-gray-700 mb-2">
                          Stock
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newVariantStock}
                          onChange={(e) => setNewVariantStock(parseInt(e.target.value) || 0)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        />
                      </div>
                      <div className="w-32">
                        <label className="block font-inter text-sm font-medium text-gray-700 mb-2">
                          Precio (Opcional)
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={newVariantPrice}
                          onChange={(e) => {
                            const val = e.target.value.replace(/,/g, '.');
                            if (/^\d*\.?\d*$/.test(val)) {
                              setNewVariantPrice(val);
                            }
                          }}
                          placeholder="Default"
                          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddVariant}
                        className="bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                      >
                        Agregar
                      </button>
                    </div>

                    {variants.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Variantes Agregadas:</h4>
                        <div className="bg-white border border-gray-200 rounded-md divide-y divide-gray-200">
                          {variants.map((variant, index) => (
                            <div key={index} className="flex justify-between items-center p-3">
                              <div>
                                <span className="font-medium text-gray-900">{variant.size}</span>
                                <span className="text-gray-500 ml-2">({variant.stock} unidades)</span>
                                {variant.price && <span className="text-gold-600 ml-2 font-medium">${variant.price}</span>}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeVariant(index)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Eliminar
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Upload Button */}
              <button
                onClick={handleUploadProduct}
                disabled={!productName || !productPrice || !productDescription || isUploading}
                className="w-full bg-gold-500 hover:bg-gold-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-6 py-3 rounded-md font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    <span>Agregar Producto</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Manage Products Tab */}
        {activeTab === 'manage' && (
          <div className="space-y-6">
            {products.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-beige-200 p-12 text-center">
                <div className="max-w-md mx-auto">
                  <div className="bg-gray-100 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                    <Eye className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="font-playfair text-xl font-semibold text-gray-900 mb-2">
                    No hay productos
                  </h3>
                  <p className="font-inter text-gray-600 mb-6">
                    Comienza agregando tu primer producto usando la pestaña "Subir Producto"
                  </p>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className="bg-gold-500 hover:bg-gold-600 text-white px-6 py-2 rounded-md font-medium transition-colors duration-200"
                  >
                    Subir Primer Producto
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg shadow-sm border border-beige-200 overflow-hidden">
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={(() => {
                          const { brightness, contrast, crop } = getImageSettings(product.mainImage, product);
                          return getOptimizedImageUrl(product.mainImage, 400, brightness, contrast, crop);
                        })()}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="p-4">
                      {editingProduct?.id === product.id ? (
                        // Edit Mode
                        <div className="space-y-3">
                          {/* Name */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Nombre</label>
                            <input
                              type="text"
                              value={editingProduct.name}
                              onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                            />
                          </div>

                          {/* Price */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Precio ($)</label>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={editingProduct.price}
                              onChange={(e) => {
                                const val = e.target.value.replace(/,/g, '.');
                                if (/^\d*\.?\d*$/.test(val)) {
                                  setEditingProduct({ ...editingProduct, price: val });
                                }
                              }}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                            />
                          </div>

                          {/* Category */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Categoría</label>
                            <input
                              value={editingProduct.category}
                              onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                              list="admin-category-options"
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                            />
                          </div>

                          {/* Description */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700">Descripción</label>
                            <textarea
                              value={editingProduct.description}
                              onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                              rows={3}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                            />
                          </div>

                          {/* Image Management */}
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-2">Imágenes del Producto</label>

                            {/* Add Images Button */}
                            <div className="mb-3">
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => handleSelectEditImages(e.target.files)}
                                className="block w-full text-xs text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-cream-100 file:text-gold-800 hover:file:bg-cream-200"
                              />
                            </div>

                            {/* Images Grid */}
                            <div className="space-y-3">
                              <div className="grid grid-cols-3 gap-2">
                                {editingImages.map((img, index) => {
                                  const isSelected = selectedImageId === img.url;
                                  const settings = imageSettingsMap[img.url] || { brightness: 100, contrast: 100 };
                                  return (
                                    <div
                                      key={img.id}
                                      className={`border rounded overflow-hidden bg-white relative group cursor-pointer transition-all ${isSelected ? 'border-gold-500 ring-2 ring-gold-200' : 'border-gray-200'}`}
                                      onClick={() => setSelectedImageId(img.url)}
                                    >
                                      <div className="aspect-square bg-gray-50 overflow-hidden relative">
                                        <img
                                          src={getOptimizedImageUrl(img.url, 400, settings.brightness, settings.contrast, settings.crop)}
                                          alt="Product"
                                          className="w-full h-full object-cover transition-all duration-200"
                                        />
                                      </div>
                                      <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 rounded-bl flex space-x-1">
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleCrop(img.url); }}
                                          className="text-gray-600 hover:text-gold-600 p-1"
                                          title="Recortar / Centrar"
                                        >
                                          <Scissors className="h-3 w-3" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); removeEditImage(index); }}
                                          className="text-red-600 hover:text-red-800 p-1"
                                          title="Eliminar"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                      <div className="p-1 bg-white border-t border-gray-100">
                                        <button
                                          type="button"
                                          onClick={() => setMainEditImage(index)}
                                          className={`w-full text-[10px] py-1 rounded border ${index === 0
                                            ? 'bg-gold-50 text-gold-800 border-gold-200 font-medium'
                                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                            }`}
                                        >
                                          {index === 0 ? 'Principal' : 'Hacer Principal'}
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="grid grid-cols-1 gap-3 pt-2 border-t border-gray-100">

                                <div>
                                  <div className="flex justify-between mb-1">
                                    <label className="text-xs font-medium text-gray-700">Brillo {selectedImageId ? '(Img. Seleccionada)' : ''}</label>
                                    <span className="text-[10px] text-gray-500">{currentImageSettings.brightness}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="50"
                                    max="150"
                                    value={currentImageSettings.brightness}
                                    onChange={(e) => {
                                      if (!selectedImageId) return;
                                      setImageSettingsMap(prev => ({
                                        ...prev,
                                        [selectedImageId]: { ...prev[selectedImageId], brightness: Number(e.target.value) }
                                      }));
                                    }}
                                    disabled={!selectedImageId}
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold-600 disabled:opacity-50"
                                  />
                                </div>
                                <div>
                                  <div className="flex justify-between mb-1">
                                    <label className="text-xs font-medium text-gray-700">Contraste {selectedImageId ? '(Img. Seleccionada)' : ''}</label>
                                    <span className="text-[10px] text-gray-500">{currentImageSettings.contrast}%</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="50"
                                    max="150"
                                    value={currentImageSettings.contrast}
                                    onChange={(e) => {
                                      if (!selectedImageId) return;
                                      setImageSettingsMap(prev => ({
                                        ...prev,
                                        [selectedImageId]: { ...prev[selectedImageId], contrast: Number(e.target.value) }
                                      }));
                                    }}
                                    disabled={!selectedImageId}
                                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gold-600 disabled:opacity-50"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Stock / Variants Logic */}
                          <div className="border-t border-gray-200 pt-2">
                            <div className="flex items-center mb-2">
                              <input
                                type="checkbox"
                                id={`hasVariants-${product.id}`}
                                checked={Array.isArray(editingProduct.variants)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    // Switch to variants
                                    setEditingProduct({
                                      ...editingProduct,
                                      variants: [],
                                      stock: 0,
                                      inStock: false
                                    });
                                  } else {
                                    // Switch to simple stock
                                    setEditingProduct({
                                      ...editingProduct,
                                      variants: undefined,
                                      stock: 0,
                                      inStock: false
                                    });
                                  }
                                }}
                                className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                              />
                              <label htmlFor={`hasVariants-${product.id}`} className="ml-2 block text-xs text-gray-900">
                                Tiene Variantes
                              </label>
                            </div>

                            {!Array.isArray(editingProduct.variants) ? (
                              // Simple Stock
                              <div>
                                <label className="block text-xs font-medium text-gray-700">Stock Total</label>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      const newStock = Math.max(0, (editingProduct.stock || 0) - 1);
                                      setEditingProduct({
                                        ...editingProduct,
                                        stock: newStock,
                                        inStock: newStock > 0
                                      });
                                    }}
                                    className="p-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                                    title="Restar stock"
                                  >
                                    <Minus className="h-3 w-3 text-gray-600" />
                                  </button>
                                  <input
                                    type="number"
                                    value={editingProduct.stock || 0}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value) || 0;
                                      setEditingProduct({
                                        ...editingProduct,
                                        stock: val,
                                        inStock: val > 0
                                      });
                                    }}
                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gold-500 focus:border-transparent text-center"
                                  />
                                  <button
                                    onClick={() => {
                                      const newStock = (editingProduct.stock || 0) + 1;
                                      setEditingProduct({
                                        ...editingProduct,
                                        stock: newStock,
                                        inStock: newStock > 0
                                      });
                                    }}
                                    className="p-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                                    title="Sumar stock"
                                  >
                                    <Plus className="h-3 w-3 text-gray-600" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              // Variants Editor
                              <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-700">Variantes</label>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {editingProduct.variants?.map((variant: any, idx: number) => (
                                  <div key={idx} className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      placeholder="Talla"
                                      value={variant.size}
                                      onChange={(e) => {
                                        const newVariants = [...(editingProduct.variants || [])];
                                        newVariants[idx].size = e.target.value;
                                        setEditingProduct({ ...editingProduct, variants: newVariants });
                                      }}
                                      className="w-1/4 px-2 py-1 text-xs border border-gray-300 rounded"
                                    />
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      placeholder="Precio"
                                      value={variant.price || ''}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/,/g, '.');
                                        if (/^\d*\.?\d*$/.test(val)) {
                                          const newVariants = [...(editingProduct.variants || [])];
                                          newVariants[idx].price = val === '' ? undefined : val;
                                          setEditingProduct({ ...editingProduct, variants: newVariants });
                                        }
                                      }}
                                      className="w-1/4 px-2 py-1 text-xs border border-gray-300 rounded"
                                    />
                                    <div className="flex items-center gap-1 w-1/3">
                                      <button
                                        onClick={() => {
                                          const newVariants = [...(editingProduct.variants || [])];
                                          newVariants[idx].stock = Math.max(0, (newVariants[idx].stock || 0) - 1);
                                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                          const totalStock = newVariants.reduce((acc: number, curr: any) => acc + curr.stock, 0);
                                          setEditingProduct({
                                            ...editingProduct,
                                            variants: newVariants,
                                            stock: totalStock,
                                            inStock: totalStock > 0
                                          });
                                        }}
                                        className="p-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                                      >
                                        <Minus className="h-3 w-3 text-gray-600" />
                                      </button>
                                      <input
                                        type="number"
                                        placeholder="Stock"
                                        value={variant.stock}
                                        onChange={(e) => {
                                          const newVariants = [...(editingProduct.variants || [])];
                                          newVariants[idx].stock = parseInt(e.target.value) || 0;
                                          // Update total stock
                                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                          const totalStock = newVariants.reduce((acc: number, curr: any) => acc + curr.stock, 0);
                                          setEditingProduct({
                                            ...editingProduct,
                                            variants: newVariants,
                                            stock: totalStock,
                                            inStock: totalStock > 0
                                          });
                                        }}
                                        className="w-full px-2 py-1 text-xs border border-gray-300 rounded text-center"
                                      />
                                      <button
                                        onClick={() => {
                                          const newVariants = [...(editingProduct.variants || [])];
                                          newVariants[idx].stock = (newVariants[idx].stock || 0) + 1;
                                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                          const totalStock = newVariants.reduce((acc: number, curr: any) => acc + curr.stock, 0);
                                          setEditingProduct({
                                            ...editingProduct,
                                            variants: newVariants,
                                            stock: totalStock,
                                            inStock: totalStock > 0
                                          });
                                        }}
                                        className="p-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300"
                                      >
                                        <Plus className="h-3 w-3 text-gray-600" />
                                      </button>
                                    </div>
                                    <button
                                      onClick={() => {
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const newVariants = editingProduct.variants?.filter((_: any, i: number) => i !== idx);
                                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                        const totalStock = newVariants?.reduce((acc: number, curr: any) => acc + curr.stock, 0) || 0;
                                        setEditingProduct({
                                          ...editingProduct,
                                          variants: newVariants,
                                          stock: totalStock,
                                          inStock: totalStock > 0
                                        });
                                      }}
                                      className="text-red-500 hover:text-red-700"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  onClick={() => {
                                    const newVariants = [...(editingProduct.variants || []), { size: '', stock: 0 }];
                                    setEditingProduct({ ...editingProduct, variants: newVariants });
                                  }}
                                  className="text-xs text-gold-600 hover:text-gold-700 font-medium flex items-center"
                                >
                                  <Plus className="h-3 w-3 mr-1" /> Agregar Variante
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="flex space-x-2">
                            <button
                              onClick={handleSaveEdit}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                            >
                              <Save className="h-4 w-4" />
                              <span>Guardar</span>
                            </button>
                            <button
                              onClick={() => setEditingProduct(null)}
                              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                            >
                              <X className="h-4 w-4" />
                              <span>Cancelar</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <>
                          <div className="mb-2">
                            <span className="text-xs text-gold-600 uppercase tracking-wide">
                              {product.category}
                            </span>
                          </div>
                          <h3 className="font-playfair text-lg font-semibold text-gray-900 mb-2">
                            {product.name}
                          </h3>
                          <p className="font-playfair text-lg font-bold text-gold-600 mb-4">
                            {formatCurrency(toNumber(product.price))}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${product.inStock
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                              }`}>
                              {product.inStock ? 'En stock' : 'Agotado'}
                            </span>
                            {product.featured && (
                              <span className="text-xs px-2 py-1 rounded-full bg-cream-200 text-gold-800">
                                Destacado
                              </span>
                            )}
                          </div>
                          <div className="flex space-x-2 mt-4">
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                const imgs: EditingImage[] = [];
                                if (product.mainImage) imgs.push({ type: 'url', url: product.mainImage, id: 'main' });
                                if (product.additionalImages) {
                                  product.additionalImages.forEach((u, i) => imgs.push({ type: 'url', url: u, id: `add-${i}` }));
                                }
                                setEditingImages(imgs);

                                // Initialize settings map
                                const map: Record<string, { brightness: number; contrast: number }> = {};
                                const allUrls = [product.mainImage, ...(product.additionalImages || [])].filter(Boolean);
                                allUrls.forEach(u => {
                                  if (product.imageSettings && product.imageSettings[u]) {
                                    map[u] = product.imageSettings[u];
                                  } else {
                                    map[u] = { brightness: product.brightness ?? 100, contrast: product.contrast ?? 100 };
                                  }
                                });
                                setImageSettingsMap(map);
                                if (allUrls.length > 0) setSelectedImageId(allUrls[0]);
                              }}
                              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Editar</span>
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center space-x-1"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-beige-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <div className="flex flex-col space-y-1">
                  <label className="text-sm font-medium text-gray-700">Buscar por clienta</label>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Ej: María Pérez"
                    className="border-gray-300 rounded-md text-sm focus:ring-gold-500 focus:border-gold-500"
                  />
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-sm font-medium text-gray-700">Estado</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border-gray-300 rounded-md text-sm focus:ring-gold-500 focus:border-gold-500"
                  >
                    <option value="all">Todos</option>
                    <option value="Recibido">Recibido</option>
                    <option value="Confirmado">Confirmado</option>
                    <option value="En proceso">En proceso</option>
                    <option value="Entregado">Entregado</option>
                  </select>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-sm font-medium text-gray-700">Método de pago</label>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="border-gray-300 rounded-md text-sm focus:ring-gold-500 focus:border-gold-500"
                  >
                    <option value="all">Todos</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="efectivo">Efectivo</option>
                  </select>
                </div>

                <div className="flex flex-col space-y-1 lg:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Ordenar por</label>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                    <select
                      value={sortOption}
                      onChange={(e) => setSortOption(e.target.value as any)}
                      className="border-gray-300 rounded-md text-sm focus:ring-gold-500 focus:border-gold-500 flex-1"
                    >
                      <option value="date_desc">Fecha (recientes primero)</option>
                      <option value="date_asc">Fecha (antiguos primero)</option>
                      <option value="total_desc">Monto (mayor a menor)</option>
                      <option value="total_asc">Monto (menor a mayor)</option>
                    </select>
                    <button
                      onClick={fetchOrders}
                      className="text-gold-600 hover:text-gold-700 text-sm font-medium whitespace-nowrap"
                    >
                      Actualizar lista
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {loadingOrders ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto"></div>
                <p className="mt-4 text-gray-500">Cargando pedidos...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-beige-200 p-12 text-center">
                <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">No hay pedidos</h3>
                <p className="text-gray-500">Aún no se han registrado pedidos en el sistema.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-beige-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Código
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedOrders.map((order) => {
                        return (
                          <React.Fragment key={order.id}>
                            <tr className={selectedOrder?.id === order.id ? 'bg-cream-50' : 'hover:bg-gray-50'}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {order.order_code}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.customer_name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(order.created_at).toLocaleDateString('es-PE')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                {formatCurrency(toNumber(order.total_amount))}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <select
                                  value={order.status}
                                  onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                                  className={`text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 ${order.status === 'Recibido' ? 'bg-yellow-100 text-yellow-800 focus:ring-yellow-500' :
                                    order.status === 'Confirmado' ? 'bg-blue-100 text-blue-800 focus:ring-blue-500' :
                                      order.status === 'En proceso' ? 'bg-purple-100 text-purple-800 focus:ring-purple-500' :
                                        'bg-green-100 text-green-800 focus:ring-green-500'
                                    }`}
                                >
                                  <option value="Recibido">Recibido</option>
                                  <option value="Confirmado">Confirmado</option>
                                  <option value="En proceso">En proceso</option>
                                  <option value="Entregado">Entregado</option>
                                </select>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex items-center space-x-3">
                                  <button
                                    onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                                    className="text-gold-600 hover:text-gold-900 font-medium flex items-center"
                                  >
                                    {selectedOrder?.id === order.id ? (
                                      <>
                                        <ChevronUp className="h-4 w-4 mr-1" />
                                        Ocultar
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="h-4 w-4 mr-1" />
                                        Ver
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => deleteOrder(order)}
                                    className="text-red-600 hover:text-red-900 font-medium flex items-center"
                                    title="Eliminar pedido"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {selectedOrder?.id === order.id && (
                              <tr>
                                <td colSpan={6} className="px-6 py-4 bg-cream-50 border-b border-gray-200">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                      <h4 className="font-bold text-gray-900 mb-2">Información del Cliente</h4>
                                      <div className="text-sm text-gray-600 space-y-1">
                                        <p><span className="font-medium">DNI:</span> {order.customer_dni}</p>
                                        <p><span className="font-medium">Teléfono:</span> {order.customer_phone}</p>
                                        <p><span className="font-medium">Dirección:</span> {order.shipping_address}</p>
                                        <p><span className="font-medium">Método de Pago:</span> {order.payment_method}</p>
                                      </div>
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-gray-900 mb-2">Productos ({order.items.length})</h4>
                                      <div className="space-y-2">
                                        {order.items.map((item, idx) => (
                                          <div key={idx} className="flex items-center space-x-3 text-sm bg-white p-2 rounded border border-gray-200">
                                            <img
                                              src={item.product.mainImage}
                                              alt={item.product.name}
                                              className="w-10 h-10 object-cover rounded"
                                            />
                                            <div className="flex-1">
                                              <p className="font-medium text-gray-900">{item.product.name}</p>
                                              <p className="text-gray-500">Cant: {item.quantity} x {formatCurrency(toNumber(item.product.price))}</p>
                                              {item.selectedSize && <p className="text-xs text-gray-400">Talla: {item.selectedSize}</p>}
                                            </div>
                                            <div className="flex flex-col items-end space-y-1">
                                              <p className="font-bold text-gray-900">
                                                {formatCurrency((item.quantity || 0) * toNumber(item.product.price))}
                                              </p>
                                              <button
                                                onClick={() => deleteOrderItem(order, idx)}
                                                className="text-red-500 hover:text-red-700 p-1"
                                                title="Eliminar producto del pedido"
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Organize Tab */}
        {activeTab === 'organize' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-beige-200">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Organizar Productos</h3>
                <p className="text-sm text-gray-500">Arrastra los productos para cambiar su orden en la tienda.</p>
              </div>
              <button
                onClick={handleSaveOrder}
                disabled={isSavingOrder}
                className="bg-gold-500 hover:bg-gold-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                {isSavingOrder ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Guardar Orden</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-beige-200 space-y-3">
                <h4 className="text-sm font-semibold text-gray-900">Orden rápido por precio</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => applyPriceSort('desc')}
                    className="px-3 py-2 text-sm bg-cream-100 hover:bg-cream-200 text-gray-800 rounded-md border border-beige-200"
                  >
                    Mayor a menor
                  </button>
                  <button
                    onClick={() => applyPriceSort('asc')}
                    className="px-3 py-2 text-sm bg-cream-100 hover:bg-cream-200 text-gray-800 rounded-md border border-beige-200"
                  >
                    Menor a mayor
                  </button>
                </div>
                <p className="text-xs text-gray-500">Usa esto como base, luego ajusta manualmente productos puntuales.</p>
              </div>

              <div className="bg-white p-4 rounded-lg shadow-sm border border-beige-200 space-y-3 xl:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900">Ordenar por categorías (drag & drop)</h4>
                    <p className="text-xs text-gray-500">Arrastra categorías; aplicamos el orden sobre los productos.</p>
                  </div>
                  <button
                    onClick={applyCategoryOrdering}
                    className="px-3 py-2 text-sm bg-gold-500 hover:bg-gold-600 text-white rounded-md"
                  >
                    Aplicar a productos
                  </button>
                </div>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => {
                    const { active, over } = event;
                    if (over && active.id !== over.id) {
                      setCategoryOrder((cats) => {
                        const oldIndex = cats.indexOf(active.id as string);
                        const newIndex = cats.indexOf(over.id as string);
                        return arrayMove(cats, oldIndex, newIndex);
                      });
                    }
                  }}
                >
                  <SortableContext items={categoryOrder} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {categoryOrder.map((cat) => (
                        <SortableCategoryItem key={cat} category={cat} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-beige-200">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={orderedProducts.map(p => p.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
                    {orderedProducts.map((product) => (
                      <SortableProductItem key={product.id} product={product} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-beige-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Pedidos', value: totalOrders.toLocaleString() },
                  { label: 'Ingresos totales', value: formatCurrency(totalRevenue) },
                  { label: 'Artículos vendidos', value: totalItemsSold.toLocaleString() },
                  { label: 'Línea más rápida', value: fastestCategoryLabel }
                ].map(card => (
                  <div key={card.label} className="bg-cream-50 border border-beige-200 rounded-lg p-4">
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="text-xl font-semibold text-gray-900 mt-1">{card.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-beige-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-gray-900">Artículos vendidos por categoría</h4>
                  <span className="text-xs text-gray-500">Barras</span>
                </div>
                <div className="space-y-3">
                  {salesByCategory.length === 0 ? (
                    <p className="text-sm text-gray-500">Sin datos aún.</p>
                  ) : (
                    salesByCategory.map(cat => {
                      const max = Math.max(1, maxValue(salesByCategory));
                      const pct = Math.max(4, (cat.value / max) * 100);
                      return (
                        <div key={cat.label} className="flex items-center space-x-3">
                          <span className="w-28 text-sm text-gray-700 truncate">{cat.label}</span>
                          <div className="flex-1 h-3 bg-cream-100 rounded-full overflow-hidden">
                            <div className="h-3 bg-gold-500" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="w-12 text-sm font-medium text-gray-800 text-right">{cat.value}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow-sm border border-beige-200">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-semibold text-gray-900">Ventas por día / semana / mes</h4>
                  <span className="text-xs text-gray-500">Conteo de pedidos</span>
                </div>
                <div className="space-y-6">
                  {[{ title: 'Por día', data: ordersByDay }, { title: 'Por semana', data: ordersByWeek }, { title: 'Por mes', data: ordersByMonth }].map(block => {
                    const max = Math.max(1, maxValue(block.data));
                    return (
                      <div key={block.title}>
                        <p className="text-sm font-medium text-gray-800 mb-2">{block.title}</p>
                        {block.data.length === 0 ? (
                          <p className="text-xs text-gray-500">Sin datos aún.</p>
                        ) : (
                          <div className="space-y-2">
                            {block.data.map(row => {
                              const pct = Math.max(4, (row.value / max) * 100);
                              return (
                                <div key={row.label} className="flex items-center space-x-3">
                                  <span className="w-28 text-[11px] text-gray-700 truncate">{row.label}</span>
                                  <div className="flex-1 h-2.5 bg-cream-100 rounded-full overflow-hidden">
                                    <div className="h-2.5 bg-gold-500" style={{ width: `${pct}%` }}></div>
                                  </div>
                                  <span className="w-8 text-[11px] font-medium text-gray-800 text-right">{row.value}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-beige-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">Stock y catálogo por categoría</h4>
                <span className="text-xs text-gray-500">Valor y cantidad</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-2">Valor de stock (precio x unidades)</p>
                  {stockByCategory.valueBars.length === 0 ? (
                    <p className="text-xs text-gray-500">Sin datos.</p>
                  ) : (
                    stockByCategory.valueBars.map(row => {
                      const max = Math.max(1, maxValue(stockByCategory.valueBars));
                      const pct = Math.max(4, (row.value / max) * 100);
                      return (
                        <div key={row.label} className="flex items-center space-x-3 mb-2">
                          <span className="w-32 text-xs text-gray-700 truncate">{row.label}</span>
                          <div className="flex-1 h-2.5 bg-cream-100 rounded-full overflow-hidden">
                            <div className="h-2.5 bg-gold-500" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="w-20 text-xs font-semibold text-gray-800 text-right">{formatCurrency(row.value)}</span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-800 mb-2">Unidades en stock por categoría</p>
                  {stockByCategory.countBars.length === 0 ? (
                    <p className="text-xs text-gray-500">Sin datos.</p>
                  ) : (
                    stockByCategory.countBars.map(row => {
                      const max = Math.max(1, maxValue(stockByCategory.countBars));
                      const pct = Math.max(4, (row.value / max) * 100);
                      return (
                        <div key={row.label} className="flex items-center space-x-3 mb-2">
                          <span className="w-32 text-xs text-gray-700 truncate">{row.label}</span>
                          <div className="flex-1 h-2.5 bg-cream-100 rounded-full overflow-hidden">
                            <div className="h-2.5 bg-gold-500" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="w-10 text-xs font-semibold text-gray-800 text-right">{row.value}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-cream-50 border border-beige-200 rounded-lg p-4">
                <div>
                  <p className="text-xs text-gray-600">Total piezas en stock</p>
                  <p className="text-lg font-semibold text-gray-900">{stockByCategory.totalInStockPieces.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Valor total en stock</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(stockByCategory.totalInStockValue)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-beige-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">Histórico: stock + vendido por categoría</h4>
                <span className="text-xs text-gray-500">Incluye piezas vendidas</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-2">Valor total (vendido + stock)</p>
                  {lifetimeByCategory.valueBars.length === 0 ? (
                    <p className="text-xs text-gray-500">Sin datos.</p>
                  ) : (
                    lifetimeByCategory.valueBars.map(row => {
                      const max = Math.max(1, maxValue(lifetimeByCategory.valueBars));
                      const pct = Math.max(4, (row.value / max) * 100);
                      return (
                        <div key={row.label} className="flex items-center space-x-3 mb-2">
                          <span className="w-32 text-xs text-gray-700 truncate">{row.label}</span>
                          <div className="flex-1 h-2.5 bg-cream-100 rounded-full overflow-hidden">
                            <div className="h-2.5 bg-gold-500" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="w-20 text-xs font-semibold text-gray-800 text-right">{formatCurrency(row.value)}</span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-800 mb-2">Total de artículos (vendidos + stock)</p>
                  {lifetimeByCategory.piecesBars.length === 0 ? (
                    <p className="text-xs text-gray-500">Sin datos.</p>
                  ) : (
                    lifetimeByCategory.piecesBars.map(row => {
                      const max = Math.max(1, maxValue(lifetimeByCategory.piecesBars));
                      const pct = Math.max(4, (row.value / max) * 100);
                      return (
                        <div key={row.label} className="flex items-center space-x-3 mb-2">
                          <span className="w-32 text-xs text-gray-700 truncate">{row.label}</span>
                          <div className="flex-1 h-2.5 bg-cream-100 rounded-full overflow-hidden">
                            <div className="h-2.5 bg-gold-500" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="w-10 text-xs font-semibold text-gray-800 text-right">{row.value}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-cream-50 border border-beige-200 rounded-lg p-4">
                <div>
                  <p className="text-xs text-gray-600">Total artículos (vendidos + stock)</p>
                  <p className="text-lg font-semibold text-gray-900">{lifetimeByCategory.totalPieces.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Valor total (vendido + stock)</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(lifetimeByCategory.totalValue)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-beige-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">Solo artículos vendidos por categoría</h4>
                <span className="text-xs text-gray-500">Excluye stock</span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-2">Valor vendido</p>
                  {soldByCategory.valueBars.length === 0 ? (
                    <p className="text-xs text-gray-500">Sin datos.</p>
                  ) : (
                    soldByCategory.valueBars.map(row => {
                      const max = Math.max(1, maxValue(soldByCategory.valueBars));
                      const pct = Math.max(4, (row.value / max) * 100);
                      return (
                        <div key={row.label} className="flex items-center space-x-3 mb-2">
                          <span className="w-32 text-xs text-gray-700 truncate">{row.label}</span>
                          <div className="flex-1 h-2.5 bg-cream-100 rounded-full overflow-hidden">
                            <div className="h-2.5 bg-gold-500" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="w-20 text-xs font-semibold text-gray-800 text-right">{formatCurrency(row.value)}</span>
                        </div>
                      );
                    })
                  )}
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-800 mb-2">Piezas vendidas</p>
                  {soldByCategory.piecesBars.length === 0 ? (
                    <p className="text-xs text-gray-500">Sin datos.</p>
                  ) : (
                    soldByCategory.piecesBars.map(row => {
                      const max = Math.max(1, maxValue(soldByCategory.piecesBars));
                      const pct = Math.max(4, (row.value / max) * 100);
                      return (
                        <div key={row.label} className="flex items-center space-x-3 mb-2">
                          <span className="w-32 text-xs text-gray-700 truncate">{row.label}</span>
                          <div className="flex-1 h-2.5 bg-cream-100 rounded-full overflow-hidden">
                            <div className="h-2.5 bg-gold-500" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="w-10 text-xs font-semibold text-gray-800 text-right">{row.value}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-cream-50 border border-beige-200 rounded-lg p-4">
                <div>
                  <p className="text-xs text-gray-600">Total artículos vendidos</p>
                  <p className="text-lg font-semibold text-gray-900">{soldByCategory.totalPieces.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Valor total vendido</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(soldByCategory.totalValue)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-beige-200">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-gray-900">Notas</h4>
                <span className="text-xs text-gray-500">Basado en pedidos registrados</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
                <li>Las métricas usan los pedidos cargados en el panel.</li>
                <li>“Línea más rápida” se calcula como artículos vendidos / días desde la primera venta de esa categoría.</li>
                <li>Gráficos de periodo muestran hasta los últimos 12 puntos disponibles.</li>
              </ul>
            </div>
          </div>
        )}
        {/* Crop Modal */}
        {/* Crop Modal */}
        {croppingImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onMouseMove={(e) => {
              if (!dragStartRef.current || !croppingImage || !imageRef.current) return;
              e.preventDefault();

              const rect = imageRef.current.getBoundingClientRect();
              const deltaX = ((e.clientX - dragStartRef.current.startX) / rect.width) * 100;
              const deltaY = ((e.clientY - dragStartRef.current.startY) / rect.height) * 100;

              if (dragStartRef.current.mode === 'move') {
                let newX = dragStartRef.current.x + deltaX;
                let newY = dragStartRef.current.y + deltaY;

                // Constrain
                newX = Math.max(0, Math.min(100 - croppingImage.width, newX));
                newY = Math.max(0, Math.min(100 - croppingImage.height, newY));

                setCroppingImage(prev => prev ? ({ ...prev, x: newX, y: newY }) : null);
              } else if (dragStartRef.current.mode === 'resize') {
                // Resize preserving aspect ratio (Square in pixels)
                // New Width %
                let newWidth = dragStartRef.current.startWidth + deltaX;

                // Max width based on X (cannot go beyond right edge)
                newWidth = Math.min(newWidth, 100 - dragStartRef.current.x);
                // Min width (e.g. 10%)
                newWidth = Math.max(10, newWidth);

                // Calculate corresponding height % based on Aspect Ratio
                // height_px = width_px
                // height_% * img_height = width_% * img_width
                // height_% = width_% * (img_width / img_height)
                // height_% = newWidth * imageAspectRatio
                let newHeight = newWidth * imageAspectRatio;

                // Check Y bounds
                if (dragStartRef.current.y + newHeight > 100) {
                  // If height overflow, cap height and recalculate width
                  newHeight = 100 - dragStartRef.current.y;
                  newWidth = newHeight / imageAspectRatio;
                }

                setCroppingImage(prev => prev ? ({ ...prev, width: newWidth, height: newHeight }) : null);
              }
            }}
            onMouseUp={() => {
              dragStartRef.current = null;
            }}
            onMouseLeave={() => {
              dragStartRef.current = null;
            }}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-cream-50">
                <div>
                  <h3 className="text-lg font-playfair font-bold text-gray-900">Ajustar Recorte</h3>
                  <p className="text-sm text-gray-500 font-inter">Arrastra y redimensiona el cuadro para seleccionar el área.</p>
                </div>
                <button
                  onClick={() => setCroppingImage(null)}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-1 overflow-auto bg-gray-900 flex items-center justify-center p-4 relative min-h-[400px] select-none">
                <div className="relative inline-block shadow-2xl">
                  <img
                    ref={imageRef}
                    src={croppingImage.url}
                    alt="Crop preview"
                    className="max-h-[60vh] object-contain pointer-events-none" // pointer-events-none to prevent img drag
                    onLoad={(e) => {
                      const ratio = e.currentTarget.naturalWidth / e.currentTarget.naturalHeight;
                      setImageAspectRatio(ratio);

                      if (croppingImage.isNew) {
                        // Cuadrado centrado por defecto (80% del máximo posible)
                        let newWidth, newHeight, newX, newY;

                        if (ratio > 1) {
                          // Imagen horizontal: cuadrado máximo ocupa todo el alto
                          const maxWidth = 100 / ratio;
                          const maxHeight = 100;
                          newWidth = maxWidth * 0.8;
                          newHeight = maxHeight * 0.8;
                        } else {
                          // Imagen vertical/cuadrada: cuadrado máximo ocupa todo el ancho
                          const maxWidth = 100;
                          const maxHeight = 100 * ratio;
                          newWidth = maxWidth * 0.8;
                          newHeight = maxHeight * 0.8;
                        }

                        newX = (100 - newWidth) / 2;
                        newY = (100 - newHeight) / 2;

                        setCroppingImage(prev => prev ? ({ ...prev, x: newX, y: newY, width: newWidth, height: newHeight, isNew: false }) : null);
                      } else {
                        // Adjust initial height to match square aspect ratio if initialized blindly
                        if (Math.abs(croppingImage.height - (croppingImage.width * ratio)) > 0.1) {
                          setCroppingImage(prev => prev ? ({ ...prev, height: prev.width * ratio }) : null);
                        }
                      }
                    }}
                    style={{
                      filter: `brightness(${imageSettingsMap[croppingImage.url]?.brightness || 100}%) contrast(${imageSettingsMap[croppingImage.url]?.contrast || 100}%)`
                    }}
                  />

                  {/* Dark overlay for unselected area */}
                  <div className="absolute inset-0 bg-black/50"></div>

                  {/* Crop Box */}
                  <div
                    className="absolute box-content cursor-move group"
                    style={{
                      left: `${croppingImage.x}%`,
                      top: `${croppingImage.y}%`,
                      width: `${croppingImage.width}%`,
                      height: `${croppingImage.height}%`,
                      // Show the image inside clearly
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault(); // Prevent default text selection
                      dragStartRef.current = {
                        mode: 'move',
                        startX: e.clientX,
                        startY: e.clientY,
                        x: croppingImage.x,
                        y: croppingImage.y,
                        startWidth: croppingImage.width,
                        startHeight: croppingImage.height
                      };
                    }}
                  >
                    {/* Border */}
                    <div className="absolute inset-0 border-2 border-white shadow-sm pointer-events-none"></div>

                    {/* Grid Lines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                      <div className="border-r border-b border-white/50"></div>
                      <div className="border-r border-b border-white/50"></div>
                      <div className="border-b border-white/50"></div>
                      <div className="border-r border-b border-white/50"></div>
                      <div className="border-r border-b border-white/50"></div>
                      <div className="border-b border-white/50"></div>
                      <div className="border-r border-white/50"></div>
                      <div className="border-r border-white/50"></div>
                      <div className=""></div>
                    </div>

                    {/* Resize Handle (Bottom Right) */}
                    <div
                      className="absolute bottom-0 right-0 w-6 h-6 bg-gold-500 cursor-nwse-resize z-10 flex items-center justify-center transform translate-x-1/2 translate-y-1/2 shadow-md rounded-full border-2 border-white"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault(); // Important to avoid drag issues
                        dragStartRef.current = {
                          mode: 'resize',
                          startX: e.clientX,
                          startY: e.clientY,
                          x: croppingImage.x,
                          y: croppingImage.y,
                          startWidth: croppingImage.width,
                          startHeight: croppingImage.height
                        };
                      }}
                    >
                      <Scissors className="w-3 h-3 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
                <button
                  onClick={() => setCroppingImage(null)}
                  className="px-4 py-2 text-gray-700 font-medium hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => saveCrop(croppingImage.x, croppingImage.y, croppingImage.width, croppingImage.height)}
                  className="px-4 py-2 bg-gold-600 text-white font-medium hover:bg-gold-700 rounded-md shadow-sm transition-colors flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Guardar Recorte
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Admin;
