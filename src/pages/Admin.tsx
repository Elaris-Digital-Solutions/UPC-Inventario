import { useEffect, useMemo, useState } from 'react';
import Header from '@/components/Header';
import SEO from '@/components/SEO';
import AdminLogin from '@/components/AdminLogin';
import { useAuth } from '@/context/AuthContext';
import { useProducts } from '@/context/ProductContext';
import { Product } from '@/types/Product';
import { InventoryUnit, InventoryUnitNote } from '@/types/Inventory';
import { supabase } from '@/supabaseClient';
import { BarChart3, Boxes, ClipboardList, ClipboardCheck, LogOut, PackagePlus, Star, Trash2, Wrench } from 'lucide-react';
import ReservationsPanel from '@/components/admin/ReservationsPanel';
import ReservationStatsPanel from '@/components/admin/ReservationStatsPanel';
import VerificationPanel from '@/components/admin/VerificationPanel';

const INVENTORY_DEFAULT_CATEGORIES = [
  'Cables',
  'VR',
  'Celulares',
  'Tablets',
  'Cámaras',
  'Computadoras',
  'Periféricos',
  'Monitores/TV',
  'Proyectores',
  'Audio',
  'Redes/IoT',
  'Consolas',
  'Almacenamiento',
  'Otros'
];

type UnitDraft = {
  unitCode: string;
  assetCode: string;
  note: string;
};

const createEmptyUnitDraft = (): UnitDraft => ({
  unitCode: '',
  assetCode: '',
  note: ''
});

type ImageDraft = {
  id: string;
  file: File;
  previewUrl: string;
  filename: string;
};

type UploadedImage = {
  secure_url: string;
  public_id: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
};

type ManagedProductImage = {
  id?: string;
  secure_url: string;
  public_id?: string | null;
  is_main: boolean;
  sort_order: number;
  persisted: boolean;
};

const DEFAULT_PRODUCT_IMAGE = 'https://placehold.co/600x400?text=UPC+Inventario';

const normalizeImages = (images: ManagedProductImage[]): ManagedProductImage[] =>
  images.map((image, index) => ({
    ...image,
    is_main: index === 0,
    sort_order: index,
  }));

const uploadFilesToCloudinary = async (files: File[]): Promise<UploadedImage[]> => {
  if (!files.length) return [];

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const folder = import.meta.env.VITE_CLOUDINARY_FOLDER;

  if (!cloudName || !uploadPreset) {
    throw new Error('Falta configurar Cloudinary en .env (VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET).');
  }

  const uploadOne = async (file: File): Promise<UploadedImage> => {
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', uploadPreset);
    if (folder) form.append('folder', folder);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: form,
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json?.error?.message || 'Error subiendo imagen a Cloudinary');
    }

    return {
      secure_url: json.secure_url,
      public_id: json.public_id,
      format: json.format,
      bytes: typeof json.bytes === 'number' ? json.bytes : undefined,
      width: typeof json.width === 'number' ? json.width : undefined,
      height: typeof json.height === 'number' ? json.height : undefined,
    };
  };

  return Promise.all(files.map(uploadOne));
};

const toProduct = (name: string, category: string, description: string): Product => ({
  id: `tmp-${Date.now()}`,
  name: name.trim(),
  category: category.trim() || 'Otros',
  description: description.trim() || '',
  price: 0,
  mainImage: DEFAULT_PRODUCT_IMAGE,
  additionalImages: [],
  featured: false,
  inStock: true,
  stock: 0,
});

const Admin = () => {
  const { isAuthenticated, logout } = useAuth();
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();

  const [activeTab, setActiveTab] = useState<'register' | 'manage' | 'reservations' | 'verification' | 'stats'>('register');

  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState(INVENTORY_DEFAULT_CATEGORIES[0]);
  const [productDescription, setProductDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitDrafts, setUnitDrafts] = useState<UnitDraft[]>([createEmptyUnitDraft()]);
  const [registerImages, setRegisterImages] = useState<ImageDraft[]>([]);
  const [mainUploadIndex, setMainUploadIndex] = useState(0);
  const [submittingNewProduct, setSubmittingNewProduct] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [newUnitNote, setNewUnitNote] = useState('');
  const [unitNotes, setUnitNotes] = useState<InventoryUnitNote[]>([]);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [addingUnit, setAddingUnit] = useState(false);
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newAssetCode, setNewAssetCode] = useState('');
  const [newCurrentNote, setNewCurrentNote] = useState('');
  const [deletingUnitId, setDeletingUnitId] = useState<string | null>(null);
  const [managedImages, setManagedImages] = useState<ManagedProductImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [savingImages, setSavingImages] = useState(false);

  const availableCategories = useMemo(() => {
    const customCategories = Array.from(
      new Set(products.map((product) => product.category?.trim()).filter(Boolean) as string[])
    ).filter((cat) => !INVENTORY_DEFAULT_CATEGORIES.includes(cat));
    return [...INVENTORY_DEFAULT_CATEGORIES, ...customCategories.sort((a, b) => a.localeCompare(b))];
  }, [products]);

  useEffect(() => {
    setUnitDrafts((prev) => {
      const next = [...prev];
      if (quantity > next.length) {
        while (next.length < quantity) next.push(createEmptyUnitDraft());
      } else if (quantity < next.length) {
        next.length = quantity;
      }
      return next;
    });
  }, [quantity]);

  useEffect(() => {
    if (!selectedProductId) {
      setUnits([]);
      setSelectedUnitId('');
      setUnitNotes([]);
      return;
    }

    const loadUnits = async () => {
      setUnitsLoading(true);
      const { data, error } = await supabase
        .from('inventory_units')
        .select('*')
        .eq('product_id', selectedProductId)
        .order('unit_code', { ascending: true });

      if (error) {
        console.error(error);
        alert('No se pudieron cargar las unidades del producto');
        setUnits([]);
      } else {
        setUnits((data || []) as InventoryUnit[]);
      }
      setSelectedUnitId('');
      setUnitNotes([]);
      setUnitsLoading(false);
    };

    loadUnits();
  }, [selectedProductId]);

  useEffect(() => {
    if (!selectedProductId) {
      setManagedImages([]);
      return;
    }

    const loadImages = async () => {
      setImagesLoading(true);
      const { data, error } = await supabase
        .from('product_images')
        .select('id, public_id, secure_url, is_main, sort_order, created_at')
        .eq('product_id', selectedProductId)
        .order('is_main', { ascending: false })
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) {
        console.error(error);
        setManagedImages([]);
        setImagesLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const sorted = [...data].sort((a, b) => {
          const aMain = a.is_main ? 1 : 0;
          const bMain = b.is_main ? 1 : 0;
          if (aMain !== bMain) return bMain - aMain;
          const aOrder = typeof a.sort_order === 'number' ? a.sort_order : 9999;
          const bOrder = typeof b.sort_order === 'number' ? b.sort_order : 9999;
          return aOrder - bOrder;
        });

        setManagedImages(
          normalizeImages(
            sorted.map((img, index) => ({
              id: img.id,
              secure_url: img.secure_url,
              public_id: img.public_id,
              is_main: index === 0,
              sort_order: index,
              persisted: true,
            }))
          )
        );
      } else {
        const selectedProductFallback = products.find((product) => product.id === selectedProductId);
        if (!selectedProductFallback) {
          setManagedImages([]);
          setImagesLoading(false);
          return;
        }

        const legacyUrls = [selectedProductFallback.mainImage, ...(selectedProductFallback.additionalImages || [])].filter(Boolean);
        setManagedImages(
          normalizeImages(
            legacyUrls.map((url, index) => ({
              secure_url: url,
              public_id: null,
              is_main: index === 0,
              sort_order: index,
              persisted: false,
            }))
          )
        );
      }

      setImagesLoading(false);
    };

    loadImages();
  }, [selectedProductId, products]);

  useEffect(() => {
    if (!selectedUnitId) {
      setUnitNotes([]);
      return;
    }

    const loadNotes = async () => {
      const { data, error } = await supabase
        .from('inventory_unit_notes')
        .select('*')
        .eq('unit_id', selectedUnitId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error(error);
        setUnitNotes([]);
      } else {
        setUnitNotes((data || []) as InventoryUnitNote[]);
      }
    };

    loadNotes();
  }, [selectedUnitId]);

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId),
    [units, selectedUnitId]
  );

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId]
  );

  const handleUnitDraftChange = (index: number, field: keyof UnitDraft, value: string) => {
    setUnitDrafts((prev) => prev.map((draft, idx) => (idx === index ? { ...draft, [field]: value } : draft)));
  };

  const handleSelectRegisterImages = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const incoming = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({
        id: `register-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        filename: file.name,
      }));

    if (incoming.length === 0) return;

    setRegisterImages((prev) => [...prev, ...incoming]);
  };

  const handleRemoveRegisterImage = (index: number) => {
    setRegisterImages((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((_, idx) => idx !== index);
      setMainUploadIndex((oldIndex) => {
        if (next.length === 0) return 0;
        if (oldIndex === index) return 0;
        if (index < oldIndex) return oldIndex - 1;
        return Math.min(oldIndex, next.length - 1);
      });
      return next;
    });
  };

  const handleSetRegisterMainImage = (index: number) => {
    setMainUploadIndex(index);
  };

  const syncProductImageColumns = async (productId: string, images: ManagedProductImage[]) => {
    const orderedUrls = images.map((img) => img.secure_url);
    await updateProduct(productId, {
      mainImage: orderedUrls[0] || DEFAULT_PRODUCT_IMAGE,
      additionalImages: orderedUrls.slice(1),
    });
  };

  const persistManagedImageOrder = async (images: ManagedProductImage[]) => {
    const persisted = images.filter((img) => img.persisted && img.id);
    if (persisted.length === 0) return;

    const updates = persisted.map((img, index) =>
      supabase
        .from('product_images')
        .update({ is_main: index === 0, sort_order: index })
        .eq('id', img.id)
    );

    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);
    if (failed?.error) throw failed.error;
  };

  const handleSetManagedMainImage = async (index: number) => {
    if (!selectedProductId || index < 0 || index >= managedImages.length) return;

    setSavingImages(true);
    try {
      const next = normalizeImages([
        managedImages[index],
        ...managedImages.filter((_, idx) => idx !== index),
      ]);

      setManagedImages(next);
      await persistManagedImageOrder(next);
      await syncProductImageColumns(selectedProductId, next);
    } catch (error: any) {
      console.error(error);
      alert(`No se pudo definir la imagen principal: ${error?.message || 'Error desconocido'}`);
    } finally {
      setSavingImages(false);
    }
  };

  const handleRemoveManagedImage = async (index: number) => {
    if (!selectedProductId || index < 0 || index >= managedImages.length) return;

    setSavingImages(true);
    try {
      const target = managedImages[index];
      if (target.persisted && target.id) {
        const { error: deleteError } = await supabase
          .from('product_images')
          .delete()
          .eq('id', target.id);
        if (deleteError) throw deleteError;
      }

      const remaining = normalizeImages(managedImages.filter((_, idx) => idx !== index));
      setManagedImages(remaining);
      await persistManagedImageOrder(remaining);
      await syncProductImageColumns(selectedProductId, remaining);
    } catch (error: any) {
      console.error(error);
      alert(`No se pudo quitar la imagen: ${error?.message || 'Error desconocido'}`);
    } finally {
      setSavingImages(false);
    }
  };

  const handleAddManagedImages = async (files: FileList | null) => {
    if (!selectedProductId || !files || files.length === 0) return;

    const imagesToUpload = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imagesToUpload.length === 0) return;

    setSavingImages(true);
    try {
      const uploaded = await uploadFilesToCloudinary(imagesToUpload);
      const hasPersistedRows = managedImages.some((img) => img.persisted);

      let insertedRows: ManagedProductImage[] = uploaded.map((img, index) => ({
        secure_url: img.secure_url,
        public_id: img.public_id,
        is_main: false,
        sort_order: managedImages.length + index,
        persisted: false,
      }));

      if (hasPersistedRows) {
        const rowsToInsert = uploaded.map((img, index) => ({
          product_id: selectedProductId,
          public_id: img.public_id,
          secure_url: img.secure_url,
          format: img.format || null,
          bytes: img.bytes ?? null,
          width: img.width ?? null,
          height: img.height ?? null,
          is_main: false,
          sort_order: managedImages.length + index,
        }));

        const { data, error } = await supabase
          .from('product_images')
          .insert(rowsToInsert)
          .select('id, public_id, secure_url, is_main, sort_order');

        if (error) throw error;

        insertedRows = (data || []).map((img, index) => ({
          id: img.id,
          secure_url: img.secure_url,
          public_id: img.public_id,
          is_main: false,
          sort_order: managedImages.length + index,
          persisted: true,
        }));
      }

      const next = normalizeImages([...managedImages, ...insertedRows]);
      setManagedImages(next);
      await persistManagedImageOrder(next);
      await syncProductImageColumns(selectedProductId, next);
    } catch (error: any) {
      console.error(error);
      alert(`No se pudieron agregar imágenes: ${error?.message || 'Error desconocido'}`);
    } finally {
      setSavingImages(false);
    }
  };

  const handleCreateProductWithUnits = async () => {
    if (!productName.trim()) {
      alert('Ingresa el nombre del producto');
      return;
    }

    if (quantity < 1) {
      alert('La cantidad debe ser al menos 1');
      return;
    }

    const validRows = unitDrafts.filter((draft) => draft.unitCode.trim());
    if (validRows.length !== quantity) {
      alert('Debes completar el código de todas las unidades');
      return;
    }

    const codeSet = new Set(validRows.map((draft) => draft.unitCode.trim().toLowerCase()));
    if (codeSet.size !== validRows.length) {
      alert('Hay códigos repetidos en la carga. Corrígelos antes de guardar.');
      return;
    }

    setSubmittingNewProduct(true);

    try {
      let uploadedImages: UploadedImage[] = [];
      if (registerImages.length > 0) {
        const safeMainIndex = Math.min(Math.max(mainUploadIndex, 0), registerImages.length - 1);
        const orderedDrafts = [
          registerImages[safeMainIndex],
          ...registerImages.filter((_, index) => index !== safeMainIndex),
        ];
        uploadedImages = await uploadFilesToCloudinary(orderedDrafts.map((img) => img.file));
      }

      const productPayload = toProduct(productName, productCategory, productDescription);
      if (uploadedImages.length > 0) {
        productPayload.mainImage = uploadedImages[0].secure_url;
        productPayload.additionalImages = uploadedImages.slice(1).map((img) => img.secure_url);
      }
      const createdProduct = await addProduct(productPayload);

      if (uploadedImages.length > 0) {
        const imagesPayload = uploadedImages.map((img, index) => ({
          product_id: createdProduct.id,
          public_id: img.public_id,
          secure_url: img.secure_url,
          format: img.format || null,
          bytes: img.bytes ?? null,
          width: img.width ?? null,
          height: img.height ?? null,
          is_main: index === 0,
          sort_order: index,
        }));

        const { error: productImagesError } = await supabase
          .from('product_images')
          .insert(imagesPayload);

        if (productImagesError) {
          console.error(productImagesError);
          alert('Producto creado, pero no se pudo persistir la relación de imágenes en product_images.');
        }
      }

      const unitPayload = validRows.map((draft) => ({
        product_id: createdProduct.id,
        unit_code: draft.unitCode.trim(),
        asset_code: draft.assetCode.trim() || null,
        current_note: draft.note.trim() || null,
        status: 'active',
      }));

      const { data: insertedUnits, error: unitsError } = await supabase
        .from('inventory_units')
        .insert(unitPayload)
        .select('id, unit_code, current_note');

      if (unitsError) throw unitsError;

      const notesPayload = (insertedUnits || [])
        .map((unit) => {
          const draft = validRows.find((row) => row.unitCode.trim() === unit.unit_code);
          const note = draft?.note.trim();
          if (!note) return null;
          return {
            unit_id: unit.id,
            note,
            created_by: null,
          };
        })
        .filter(Boolean);

      if (notesPayload.length > 0) {
        const { error: noteInsertError } = await supabase.from('inventory_unit_notes').insert(notesPayload as any[]);
        if (noteInsertError) throw noteInsertError;
      }

      const { error: updateProductError } = await supabase
        .from('products')
        .update({ stock: quantity, in_stock: true })
        .eq('id', createdProduct.id);

      if (updateProductError) throw updateProductError;

      alert('Producto y unidades creadas correctamente');
      setProductName('');
      setProductDescription('');
      setProductCategory(INVENTORY_DEFAULT_CATEGORIES[0]);
      setQuantity(1);
      setUnitDrafts([createEmptyUnitDraft()]);
      setRegisterImages((prev) => {
        prev.forEach((img) => {
          if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
        });
        return [];
      });
      setMainUploadIndex(0);
    } catch (error: any) {
      console.error(error);
      alert(`No se pudo registrar el producto con sus unidades: ${error?.message || 'Error desconocido'}`);
    } finally {
      setSubmittingNewProduct(false);
    }
  };

  const handleUpdateUnitStatus = async (status: InventoryUnit['status']) => {
    if (!selectedUnit) return;

    const { error } = await supabase
      .from('inventory_units')
      .update({ status })
      .eq('id', selectedUnit.id);

    if (error) {
      alert('No se pudo actualizar el estado de la unidad');
      return;
    }

    setUnits((prev) => prev.map((unit) => (unit.id === selectedUnit.id ? { ...unit, status } : unit)));
  };

  const handleAddNoteToUnit = async () => {
    if (!selectedUnit || !newUnitNote.trim()) return;

    const note = newUnitNote.trim();

    const { data, error } = await supabase
      .from('inventory_unit_notes')
      .insert([{ unit_id: selectedUnit.id, note, created_by: null }])
      .select()
      .single();

    if (error) {
      alert('No se pudo agregar la anotación');
      return;
    }

    const { error: updateCurrentError } = await supabase
      .from('inventory_units')
      .update({ current_note: note })
      .eq('id', selectedUnit.id);

    if (updateCurrentError) {
      alert('La anotación histórica se guardó, pero no se actualizó la anotación actual');
    }

    setUnitNotes((prev) => [data as InventoryUnitNote, ...prev]);
    setUnits((prev) => prev.map((unit) => (unit.id === selectedUnit.id ? { ...unit, current_note: note } : unit)));
    setNewUnitNote('');
  };

  const handleDeleteUnitNote = async (noteId: string) => {
    if (!selectedUnit) return;

    const confirmed = window.confirm('¿Eliminar esta anotación del historial?');
    if (!confirmed) return;

    setDeletingNoteId(noteId);
    try {
      const { error } = await supabase
        .from('inventory_unit_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      const nextNotes = unitNotes.filter((note) => note.id !== noteId);
      setUnitNotes(nextNotes);

      const nextCurrentNote = nextNotes[0]?.note || null;
      const { error: updateCurrentError } = await supabase
        .from('inventory_units')
        .update({ current_note: nextCurrentNote })
        .eq('id', selectedUnit.id);

      if (updateCurrentError) throw updateCurrentError;

      setUnits((prev) =>
        prev.map((unit) =>
          unit.id === selectedUnit.id
            ? { ...unit, current_note: nextCurrentNote || undefined }
            : unit
        )
      );
    } catch (error: any) {
      console.error(error);
      alert(`No se pudo eliminar la anotación: ${error?.message || 'Error desconocido'}`);
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleAddUnitToProduct = async () => {
    if (!selectedProductId || !newUnitCode.trim()) {
      alert('Selecciona producto e ingresa código de unidad');
      return;
    }

    const unitCode = newUnitCode.trim();
    const existing = units.some((unit) => unit.unit_code.trim().toLowerCase() === unitCode.toLowerCase());
    if (existing) {
      alert('Ese código ya existe en este producto');
      return;
    }

    setAddingUnit(true);

    try {
      const { data: inserted, error } = await supabase
        .from('inventory_units')
        .insert([
          {
            product_id: selectedProductId,
            unit_code: unitCode,
            asset_code: newAssetCode.trim() || null,
            current_note: newCurrentNote.trim() || null,
            status: 'active',
          }
        ])
        .select('*')
        .single();

      if (error) throw error;

      if (newCurrentNote.trim()) {
        const { error: noteError } = await supabase.from('inventory_unit_notes').insert([
          {
            unit_id: inserted.id,
            note: newCurrentNote.trim(),
            created_by: null,
          }
        ]);
        if (noteError) throw noteError;
      }

      setUnits((prev) => [...prev, inserted as InventoryUnit].sort((a, b) => a.unit_code.localeCompare(b.unit_code)));
      setNewUnitCode('');
      setNewAssetCode('');
      setNewCurrentNote('');

      const activeCount = [...units, inserted as InventoryUnit].filter((unit) => unit.status === 'active').length;
      await supabase
        .from('products')
        .update({ stock: activeCount, in_stock: activeCount > 0 })
        .eq('id', selectedProductId);
    } catch (error: any) {
      console.error(error);
      alert(`No se pudo agregar la unidad: ${error?.message || 'Error desconocido'}`);
    } finally {
      setAddingUnit(false);
    }
  };

  const handleForceDeleteUnit = async (unit: InventoryUnit) => {
    if (!selectedProductId) return;

    const confirmed = window.confirm(
      `Se eliminará de forma permanente la unidad ${unit.unit_code}. Esta acción quitará también su historial y reservas asociadas. ¿Deseas continuar?`
    );
    if (!confirmed) return;

    setDeletingUnitId(unit.id);

    try {
      const { error: notesError } = await supabase
        .from('inventory_unit_notes')
        .delete()
        .eq('unit_id', unit.id);
      if (notesError) throw notesError;

      const { error: reservationsError } = await supabase
        .from('inventory_reservations')
        .delete()
        .eq('unit_id', unit.id);
      if (reservationsError) throw reservationsError;

      const { error: deleteUnitError } = await supabase
        .from('inventory_units')
        .delete()
        .eq('id', unit.id);
      if (deleteUnitError) throw deleteUnitError;

      const remainingUnits = units.filter((current) => current.id !== unit.id);
      setUnits(remainingUnits);

      if (selectedUnitId === unit.id) {
        setSelectedUnitId('');
        setUnitNotes([]);
      }

      if (remainingUnits.length === 0) {
        await deleteProduct(selectedProductId);
        setSelectedProductId('');
        setManagedImages([]);
        alert('Unidad eliminada. Como no quedaban unidades, también se eliminó el producto.');
        return;
      }

      const activeCount = remainingUnits.filter((current) => current.status === 'active').length;
      await updateProduct(selectedProductId, {
        stock: activeCount,
        inStock: activeCount > 0,
      });

      alert('Unidad eliminada correctamente.');
    } catch (error: any) {
      console.error(error);
      alert(`No se pudo eliminar la unidad: ${error?.message || 'Error desconocido'}`);
    } finally {
      setDeletingUnitId(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <AdminLogin onLogin={() => { }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SEO title="Admin Inventario" description="Gestión de inventario y reservas UPC" noindex />

      <div className="bg-cream-25 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="font-playfair text-4xl font-bold text-gray-900 mb-4">Panel de Inventario UPC</h1>
              <p className="font-inter text-gray-600">Registra equipos por código, gestiona unidades y da trazabilidad a reservas.</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>

          <div className="mb-8 border-b border-beige-200">
            <nav className="-mb-px flex space-x-8">
              <button onClick={() => setActiveTab('register')} className={`py-2 px-1 border-b-2 text-sm ${activeTab === 'register' ? 'border-gold-500 text-gold-600' : 'border-transparent text-gray-500'}`}>
                <PackagePlus className="h-4 w-4 inline mr-2" />
                Subir Producto (Inventario)
              </button>
              <button onClick={() => setActiveTab('manage')} className={`py-2 px-1 border-b-2 text-sm ${activeTab === 'manage' ? 'border-gold-500 text-gold-600' : 'border-transparent text-gray-500'}`}>
                <Wrench className="h-4 w-4 inline mr-2" />
                Gestionar Productos / Unidades
              </button>
              <button onClick={() => setActiveTab('reservations')} className={`py-2 px-1 border-b-2 text-sm ${activeTab === 'reservations' ? 'border-gold-500 text-gold-600' : 'border-transparent text-gray-500'}`}>
                <ClipboardList className="h-4 w-4 inline mr-2" />
                Reservas
              </button>
              <button onClick={() => setActiveTab('verification')} className={`py-2 px-1 border-b-2 text-sm ${activeTab === 'verification' ? 'border-gold-500 text-gold-600' : 'border-transparent text-gray-500'}`}>
                <ClipboardCheck className="h-4 w-4 inline mr-2" />
                Verificación
              </button>
              <button onClick={() => setActiveTab('stats')} className={`py-2 px-1 border-b-2 text-sm ${activeTab === 'stats' ? 'border-gold-500 text-gold-600' : 'border-transparent text-gray-500'}`}>
                <BarChart3 className="h-4 w-4 inline mr-2" />
                Estadísticas
              </button>
            </nav>
          </div>

          {activeTab === 'register' && (
            <div className="bg-white rounded-lg shadow-sm border border-beige-200 p-6 space-y-6">
              <h2 className="text-2xl font-semibold text-gray-900">Registrar nuevo producto por unidades</h2>
              <p className="text-sm text-gray-600">No se registra precio. El alta se hace por cantidad y códigos de unidades, con anotación inicial opcional.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del producto</label>
                  <input className="w-full border rounded-md px-3 py-2" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Ej: Oculus Quest 2" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <select className="w-full border rounded-md px-3 py-2" value={productCategory} onChange={(e) => setProductCategory(e.target.value)}>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad de unidades</label>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                    className="w-full border rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripción / contexto (opcional)</label>
                  <input className="w-full border rounded-md px-3 py-2" value={productDescription} onChange={(e) => setProductDescription(e.target.value)} placeholder="Ej: Lab: MO-UH40 | Equipo de VR" />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-900 flex items-center"><Boxes className="h-4 w-4 mr-2" /> Unidades a registrar</h3>
                <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                  {unitDrafts.map((draft, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-3 border rounded-md p-3 bg-cream-25">
                      <input
                        className="border rounded-md px-3 py-2"
                        value={draft.unitCode}
                        onChange={(e) => handleUnitDraftChange(index, 'unitCode', e.target.value)}
                        placeholder={`Código de unidad #${index + 1} (obligatorio)`}
                      />
                      <input
                        className="border rounded-md px-3 py-2"
                        value={draft.assetCode}
                        onChange={(e) => handleUnitDraftChange(index, 'assetCode', e.target.value)}
                        placeholder="Código patrimonial / activo fijo (opcional)"
                      />
                      <input
                        className="border rounded-md px-3 py-2"
                        value={draft.note}
                        onChange={(e) => handleUnitDraftChange(index, 'note', e.target.value)}
                        placeholder="Anotación inicial (opcional)"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-medium text-gray-900">Imágenes del producto (opcional)</h3>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    handleSelectRegisterImages(e.target.files);
                    e.currentTarget.value = '';
                  }}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-cream-100 file:text-gold-800 hover:file:bg-cream-200"
                />

                {registerImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {registerImages.map((img, index) => (
                      <div key={img.id} className="border rounded-md overflow-hidden bg-white">
                        <div className="aspect-square bg-gray-100">
                          <img src={img.previewUrl} alt={img.filename} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-2 space-y-2">
                          <button
                            type="button"
                            onClick={() => handleSetRegisterMainImage(index)}
                            className={`w-full text-xs px-2 py-1 rounded border flex items-center justify-center gap-1 ${index === mainUploadIndex
                              ? 'bg-gold-50 text-gold-800 border-gold-200'
                              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                              }`}
                          >
                            <Star className="h-3 w-3" />
                            {index === mainUploadIndex ? 'Principal' : 'Hacer principal'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveRegisterImage(index)}
                            className="w-full text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Quitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleCreateProductWithUnits}
                disabled={submittingNewProduct}
                className="bg-gold-500 hover:bg-gold-600 disabled:bg-gray-300 text-white px-6 py-2 rounded-md"
              >
                {submittingNewProduct ? 'Guardando...' : 'Registrar producto con unidades'}
              </button>
            </div>
          )}

          {activeTab === 'manage' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <section className="bg-white rounded-lg shadow-sm border border-beige-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Productos</h3>
                <select className="w-full border rounded-md px-3 py-2" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                  <option value="">Selecciona un producto...</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>{product.name} ({product.category})</option>
                  ))}
                </select>

                {selectedProduct && (
                  <div className="mt-4 text-sm text-gray-600 space-y-1">
                    <p><span className="font-medium">Producto:</span> {selectedProduct.name}</p>
                    <p><span className="font-medium">Categoría:</span> {selectedProduct.category}</p>
                    <p><span className="font-medium">Unidades activas:</span> {units.filter((u) => u.status === 'active').length}</p>
                  </div>
                )}

                {selectedProductId && (
                  <div className="mt-6 space-y-3 border-t pt-4">
                    <h4 className="font-medium text-gray-900">Gestionar imágenes del producto</h4>

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        handleAddManagedImages(e.target.files);
                        e.currentTarget.value = '';
                      }}
                      disabled={savingImages}
                      className="block w-full text-xs text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-cream-100 file:text-gold-800 hover:file:bg-cream-200"
                    />

                    {imagesLoading ? (
                      <p className="text-xs text-gray-500">Cargando imágenes...</p>
                    ) : managedImages.length === 0 ? (
                      <p className="text-xs text-gray-500">Este producto aún no tiene imágenes.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {managedImages.map((image, index) => (
                          <div key={image.id || `${image.secure_url}-${index}`} className="border rounded-md overflow-hidden bg-white">
                            <div className="aspect-square bg-gray-100">
                              <img src={image.secure_url} alt={`Imagen ${index + 1}`} className="w-full h-full object-cover" />
                            </div>
                            <div className="p-2 space-y-2">
                              <button
                                type="button"
                                onClick={() => handleSetManagedMainImage(index)}
                                disabled={savingImages}
                                className={`w-full text-xs px-2 py-1 rounded border flex items-center justify-center gap-1 ${index === 0
                                  ? 'bg-gold-50 text-gold-800 border-gold-200'
                                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                  }`}
                              >
                                <Star className="h-3 w-3" />
                                {index === 0 ? 'Principal' : 'Hacer principal'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveManagedImage(index)}
                                disabled={savingImages}
                                className="w-full text-xs px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-1"
                              >
                                <Trash2 className="h-3 w-3" />
                                Quitar
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedProductId && (
                  <div className="mt-6 space-y-2 border-t pt-4">
                    <h4 className="font-medium text-gray-900">Agregar unidad a este producto</h4>
                    <input className="w-full border rounded-md px-3 py-2" placeholder="Código unidad" value={newUnitCode} onChange={(e) => setNewUnitCode(e.target.value)} />
                    <input className="w-full border rounded-md px-3 py-2" placeholder="Activo fijo (opcional)" value={newAssetCode} onChange={(e) => setNewAssetCode(e.target.value)} />
                    <input className="w-full border rounded-md px-3 py-2" placeholder="Anotación inicial (opcional)" value={newCurrentNote} onChange={(e) => setNewCurrentNote(e.target.value)} />
                    <button onClick={handleAddUnitToProduct} disabled={addingUnit} className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-300 text-white font-medium px-4 py-2 rounded-md border border-amber-700/30">
                      {addingUnit ? 'Agregando...' : 'Agregar unidad'}
                    </button>
                  </div>
                )}
              </section>

              <section className="bg-white rounded-lg shadow-sm border border-beige-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Unidades del producto</h3>
                {unitsLoading ? (
                  <p className="text-sm text-gray-500">Cargando unidades...</p>
                ) : units.length === 0 ? (
                  <p className="text-sm text-gray-500">Selecciona un producto para ver unidades.</p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-auto">
                    {units.map((unit) => (
                      <div
                        key={unit.id}
                        className={`w-full text-left border rounded-md p-3 ${selectedUnitId === unit.id ? 'border-gold-500 bg-cream-50' : 'border-gray-200'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedUnitId(unit.id)}
                            className="flex-1 text-left"
                          >
                            <p className="font-mono text-sm font-medium text-gray-900">{unit.unit_code}</p>
                            <p className="text-xs text-gray-500">Estado: {unit.status} | Activo fijo: {unit.asset_code || 'N/A'}</p>
                            <p className="text-xs text-gray-500 truncate">Actual: {unit.current_note || 'Sin anotación'}</p>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleForceDeleteUnit(unit)}
                            disabled={deletingUnitId === unit.id}
                            className="mt-0.5 inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 p-1.5 text-red-600 hover:bg-red-100 disabled:opacity-50"
                            title="Eliminar unidad"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-white rounded-lg shadow-sm border border-beige-200 p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Gestión de unidad específica</h3>
                {!selectedUnit ? (
                  <p className="text-sm text-gray-500">Selecciona una unidad para registrar novedad de estado o anotación.</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="font-mono text-sm font-medium text-gray-900">{selectedUnit.unit_code}</p>
                      <p className="text-xs text-gray-500">Estado actual: {selectedUnit.status}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleUpdateUnitStatus('active')}
                        className={`px-3 py-1 border rounded-md text-sm ${selectedUnit.status === 'active' ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-medium' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                      >
                        Activo
                      </button>
                      <button
                        onClick={() => handleUpdateUnitStatus('maintenance')}
                        className={`px-3 py-1 border rounded-md text-sm ${selectedUnit.status === 'maintenance' ? 'bg-amber-100 border-amber-300 text-amber-800 font-medium' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                      >
                        Mantenimiento
                      </button>
                      <button
                        onClick={() => handleUpdateUnitStatus('retired')}
                        className={`px-3 py-1 border rounded-md text-sm ${selectedUnit.status === 'retired' ? 'bg-rose-100 border-rose-300 text-rose-800 font-medium' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
                      >
                        Retirado
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">Agregar anotación a esta unidad</label>
                      <input
                        className="w-full border rounded-md px-3 py-2"
                        value={newUnitNote}
                        onChange={(e) => setNewUnitNote(e.target.value)}
                        placeholder="Ej: Oculus con código HTC-505 presenta nuevo rayón en la carcasa"
                      />
                      <button onClick={handleAddNoteToUnit} className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-md border border-amber-700/30">Guardar anotación</button>
                    </div>

                    <div className="border-t pt-3">
                      <p className="text-sm font-medium text-gray-800 mb-2">Historial</p>
                      <div className="space-y-2 max-h-[260px] overflow-auto">
                        {unitNotes.length === 0 ? (
                          <p className="text-xs text-gray-500">Sin anotaciones para esta unidad.</p>
                        ) : (
                          unitNotes.map((note) => (
                            <div key={note.id} className="border rounded-md p-2 bg-cream-25">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm text-gray-700 flex-1">{note.note}</p>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteUnitNote(note.id)}
                                  disabled={deletingNoteId === note.id}
                                  className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 p-1 text-red-600 hover:bg-red-100 disabled:opacity-50"
                                  title="Eliminar anotación"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <p className="text-xs text-gray-500">{new Date(note.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'reservations' && <ReservationsPanel />}
          {activeTab === 'verification' && <VerificationPanel />}
          {activeTab === 'stats' && <ReservationStatsPanel />}
        </div>
      </div>
    </div>
  );
};

export default Admin;
