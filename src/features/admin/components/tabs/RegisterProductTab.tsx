/**
 * RegisterProductTab — formulario para registrar un nuevo equipo con unidades.
 *
 * Responsabilidades:
 *  - Formulario controlado de nombre / categoría / descripción / cantidad
 *  - Gestión de drafts de unidades (código, sede, nota inicial)
 *  - Selección y preview de imágenes locales
 *  - Orquestación del flujo: subir imágenes → crear producto → crear unidades
 *
 * No importa `supabase` directamente; delega a productService e inventoryService.
 */
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProducts } from '@/features/products/context/ProductContext';
import { productService } from '@/features/products/services/productService';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { uploadFilesToCloudinary } from '@/infrastructure/cloudinary/uploadService';
import { INVENTORY_DEFAULT_CATEGORIES } from '@/shared/constants/categories';
import type { Campus } from '@/shared/types/campus';

// ─── Tipos locales ────────────────────────────────────────────────────────────

type UnitDraft = { unitCode: string; campus: Campus; note: string };

type ImageDraft = {
  id: string;
  file: File;
  previewUrl: string;
  filename: string;
};

const createEmptyDraft = (): UnitDraft => ({
  unitCode: '',
  campus: 'Monterrico',
  note: '',
});

const DEFAULT_IMAGE = 'https://placehold.co/600x400?text=UPC+Inventario';

// ─── Componente ───────────────────────────────────────────────────────────────

export const RegisterProductTab = () => {
  const { products, addProduct } = useProducts();

  const [name, setName] = useState('');
  const [category, setCategory] = useState(INVENTORY_DEFAULT_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitDrafts, setUnitDrafts] = useState<UnitDraft[]>([createEmptyDraft()]);
  const [imageDrafts, setImageDrafts] = useState<ImageDraft[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Sincroniza la cantidad de drafts con el número requerido
  useEffect(() => {
    setUnitDrafts((prev) => {
      const next = [...prev];
      while (next.length < quantity) next.push(createEmptyDraft());
      next.length = quantity;
      return next;
    });
  }, [quantity]);

  // Categorías disponibles: predeterminadas + las ya existentes en productos
  const availableCategories = useMemo(() => {
    const custom = Array.from(
      new Set(
        products
          .map((p) => p.category?.trim())
          .filter((c): c is string => Boolean(c)),
      ),
    ).filter((c) => !INVENTORY_DEFAULT_CATEGORIES.includes(c));
    return [...INVENTORY_DEFAULT_CATEGORIES, ...custom.sort((a, b) => a.localeCompare(b))];
  }, [products]);

  const updateDraft = (index: number, field: keyof UnitDraft, value: string) => {
    setUnitDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d)),
    );
  };

  const handleAddImages = (files: FileList | null) => {
    if (!files?.length) return;
    const newDrafts: ImageDraft[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: `img-${Date.now()}-${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        filename: file.name,
      }));
    if (!newDrafts.length) return;
    setImageDrafts((prev) => [...prev, ...newDrafts]);
  };

  const handleRemoveImage = (index: number) => {
    setImageDrafts((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      const next = prev.filter((_, i) => i !== index);
      setMainImageIndex((old) => {
        if (!next.length) return 0;
        if (old === index) return 0;
        return index < old ? old - 1 : Math.min(old, next.length - 1);
      });
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Ingresa el nombre del equipo');
      return;
    }

    const validDrafts = unitDrafts.filter((d) => d.unitCode.trim());
    if (validDrafts.length !== quantity) {
      toast.error('Debes completar el código de todas las unidades');
      return;
    }

    const codes = validDrafts.map((d) => d.unitCode.trim().toLowerCase());
    if (new Set(codes).size !== codes.length) {
      toast.error('Hay códigos de unidad duplicados. Corrígelos antes de guardar.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Subir imágenes a Cloudinary
      let uploadedImages: Awaited<ReturnType<typeof uploadFilesToCloudinary>> = [];
      if (imageDrafts.length > 0) {
        const safeMain = Math.min(Math.max(mainImageIndex, 0), imageDrafts.length - 1);
        const ordered = [imageDrafts[safeMain], ...imageDrafts.filter((_, i) => i !== safeMain)];
        uploadedImages = await uploadFilesToCloudinary(ordered.map((d) => d.file));
      }

      // 2. Crear el producto
      const productPayload = {
        id: `tmp-${Date.now()}`,
        name: name.trim(),
        category: category.trim() || 'Otros',
        description: description.trim(),
        price: 0,
        mainImage: uploadedImages[0]?.secure_url ?? DEFAULT_IMAGE,
        additionalImages: uploadedImages.slice(1).map((img) => img.secure_url),
        featured: false,
        inStock: true,
        stock: 0,
      };

      const created = await addProduct(productPayload);

      // 3. Persistir relación de imágenes en product_images
      if (uploadedImages.length > 0) {
        const imagePayload = uploadedImages.map((img, i) => ({
          public_id: img.public_id,
          secure_url: img.secure_url,
          is_main: i === 0,
          sort_order: i,
        }));
        try {
          await productService.insertImages(created.id, imagePayload);
        } catch (err) {
          toast.warning('Producto creado, pero falló la relación de imágenes');
          console.error(err);
        }
      }

      // 4. Crear unidades
      for (const draft of validDrafts) {
        await inventoryService.createUnit({
          product_id: created.id,
          unit_code: draft.unitCode.trim(),
          campus: draft.campus,
          current_note: draft.note.trim() || undefined,
        });
      }

      // 5. Actualizar stock del producto
      await productService.update(created.id, {
        stock: quantity,
        inStock: true,
      });

      toast.success('Equipo y unidades registrados correctamente');

      // Limpiar formulario
      setName('');
      setDescription('');
      setCategory(INVENTORY_DEFAULT_CATEGORIES[0]);
      setQuantity(1);
      setUnitDrafts([createEmptyDraft()]);
      setImageDrafts((prev) => {
        prev.forEach((d) => d.previewUrl && URL.revokeObjectURL(d.previewUrl));
        return [];
      });
      setMainImageIndex(0);
    } catch (err: any) {
      console.error(err);
      toast.error(`No se pudo registrar el equipo: ${err?.message ?? 'Error desconocido'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h2 className="text-xl font-semibold text-foreground">Registrar nuevo equipo</h2>

      {/* ── Datos del producto ── */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h3 className="font-medium text-card-foreground">Información del equipo</h3>

        <div className="space-y-2">
          <Label htmlFor="product-name">Nombre *</Label>
          <Input
            id="product-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Meta Quest 3"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-category">Categoría</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="product-category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-desc">Descripción</Label>
          <textarea
            id="product-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción del equipo..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </section>

      {/* ── Imágenes ── */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h3 className="font-medium text-card-foreground">Imágenes</h3>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
          <Upload className="h-4 w-4" />
          Seleccionar imágenes
          <input
            type="file"
            multiple
            accept="image/*"
            className="sr-only"
            onChange={(e) => handleAddImages(e.target.files)}
          />
        </label>

        {imageDrafts.length > 0 && (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {imageDrafts.map((draft, i) => (
              <div
                key={draft.id}
                className={`group relative overflow-hidden rounded-lg border-2 ${
                  i === mainImageIndex ? 'border-primary' : 'border-transparent'
                }`}
              >
                <img
                  src={draft.previewUrl}
                  alt={draft.filename}
                  className="aspect-square w-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setMainImageIndex(i)}
                    className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                  >
                    Principal
                  </button>
                  <button
                    onClick={() => handleRemoveImage(i)}
                    className="rounded bg-destructive p-1 text-destructive-foreground"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                {i === mainImageIndex && (
                  <span className="absolute right-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    Principal
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Unidades ── */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-card-foreground">Unidades</h3>
          <div className="flex items-center gap-2">
            <Label htmlFor="quantity" className="text-sm">Cantidad:</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={50}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
              className="w-20"
            />
          </div>
        </div>

        <div className="space-y-3">
          {unitDrafts.map((draft, i) => (
            <div key={i} className="grid grid-cols-[1fr_180px_1fr] gap-2">
              <Input
                placeholder={`Código #${i + 1} *`}
                value={draft.unitCode}
                onChange={(e) => updateDraft(i, 'unitCode', e.target.value)}
              />
              <Select
                value={draft.campus}
                onValueChange={(v) => updateDraft(i, 'campus', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monterrico">Monterrico</SelectItem>
                  <SelectItem value="San Miguel">San Miguel</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Nota inicial (opcional)"
                value={draft.note}
                onChange={(e) => updateDraft(i, 'note', e.target.value)}
              />
            </div>
          ))}
        </div>
      </section>

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full"
        size="lg"
      >
        {submitting ? 'Guardando...' : 'Registrar equipo'}
      </Button>
    </div>
  );
};
