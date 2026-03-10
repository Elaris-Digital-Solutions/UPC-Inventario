/**
 * ManageProductTab — gestión de productos existentes.
 *
 * Responsabilidades:
 *  - Seleccionar un producto existente
 *  - Ver y reordenar sus imágenes
 *  - Ver, agregar y gestionar sus unidades de inventario
 *
 * Delega acceso a datos a productService e inventoryService.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import { Plus, Star, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProducts } from '@/features/products/context/ProductContext';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { productService } from '@/features/products/services/productService';
import { useInventoryUnits, useUnitNotes } from '@/features/inventory/hooks/useInventoryUnits';
import { uploadFilesToCloudinary } from '@/infrastructure/cloudinary/uploadService';
import type { InventoryUnit } from '@/types/Inventory';
import type { Campus } from '@/shared/types/campus';

// ─── Componente ───────────────────────────────────────────────────────────────

export const ManageProductTab = () => {
  const { products, deleteProduct } = useProducts();

  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [newUnitCode, setNewUnitCode] = useState('');
  const [newUnitCampus, setNewUnitCampus] = useState<Campus>('Monterrico');
  const [newUnitNote, setNewUnitNote] = useState('');
  const [addingUnit, setAddingUnit] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [deletingUnitId, setDeletingUnitId] = useState<string | null>(null);

  const selectedProduct = products.find((p) => p.id === selectedProductId) ?? null;

  const {
    units,
    loading: unitsLoading,
    reload: reloadUnits,
  } = useInventoryUnits({ productId: selectedProductId || null });

  const {
    notes,
    addNote,
    removeNote,
  } = useUnitNotes({ unitId: selectedUnitId || null });

  const selectedUnit = units.find((u) => u.id === selectedUnitId) ?? null;

  // ── Handlers de unidades ──────────────────────────────────────────────────

  const handleAddUnit = async () => {
    if (!selectedProductId || !newUnitCode.trim()) {
      toast.error('Selecciona un producto e ingresa el código de unidad');
      return;
    }
    const code = newUnitCode.trim();
    if (units.some((u) => u.unit_code.toLowerCase() === code.toLowerCase())) {
      toast.error('Ese código ya existe en este producto');
      return;
    }

    setAddingUnit(true);
    try {
      await inventoryService.createUnit({
        product_id: selectedProductId,
        unit_code: code,
        campus: newUnitCampus,
        current_note: newUnitNote.trim() || undefined,
      });
      // Sincronizar stock del producto
      const active = await inventoryService.countActiveUnits(selectedProductId);
      await productService.update(selectedProductId, { stock: active, inStock: active > 0 });
      setNewUnitCode('');
      setNewUnitNote('');
      toast.success('Unidad agregada');
      await reloadUnits();
    } catch (err: any) {
      toast.error(`No se pudo agregar la unidad: ${err?.message ?? 'Error desconocido'}`);
    } finally {
      setAddingUnit(false);
    }
  };

  const handleUpdateUnitStatus = async (status: InventoryUnit['status']) => {
    if (!selectedUnit) return;
    try {
      await inventoryService.updateUnit(selectedUnit.id, { status });
      await reloadUnits();
      const active = await inventoryService.countActiveUnits(selectedProductId);
      await productService.update(selectedProductId, { stock: active, inStock: active > 0 });
    } catch {
      toast.error('No se pudo actualizar el estado de la unidad');
    }
  };

  /**
   * Elimina con cascade: notas → reservas → unidad.
   * Si era la última unidad, elimina también el producto.
   */
  const handleDeleteUnit = async (unitId: string) => {
    const unit = units.find((u) => u.id === unitId);
    if (
      !confirm(
        `Se eliminará permanentemente la unidad${unit ? ' ' + unit.unit_code : ''} con su historial y reservas.\n¿Continuar?`,
      )
    )
      return;

    setDeletingUnitId(unitId);
    try {
      await inventoryService.deleteUnitCascade(unitId);
      const remaining = units.filter((u) => u.id !== unitId);
      if (selectedUnitId === unitId) setSelectedUnitId('');

      if (remaining.length === 0 && selectedProductId) {
        await deleteProduct(selectedProductId);
        setSelectedProductId('');
        toast.success('Unidad eliminada. Al ser la última, el equipo también fue eliminado.');
      } else {
        const active = remaining.filter((u) => u.status === 'active').length;
        await productService.update(selectedProductId, { stock: active, inStock: active > 0 });
        toast.success('Unidad eliminada');
        await reloadUnits();
      }
    } catch (err: any) {
      toast.error(`No se pudo eliminar: ${err?.message ?? 'Error desconocido'}`);
    } finally {
      setDeletingUnitId(null);
    }
  };

  const handleAddNote = async (note: string) => {
    if (!note.trim()) return;
    await addNote(note.trim());
    // También actualizamos current_note en la unidad
    if (selectedUnit) {
      await inventoryService.updateUnit(selectedUnit.id, { current_note: note.trim() });
      await reloadUnits();
    }
  };

  // ── Handlers de imágenes ──────────────────────────────────────────────────

  const handleAddImages = async (files: FileList | null) => {
    if (!selectedProductId || !files?.length) return;
    const toUpload = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!toUpload.length) return;

    setUploadingImages(true);
    try {
      const uploaded = await uploadFilesToCloudinary(toUpload);
      const existing = selectedProduct
        ? [selectedProduct.mainImage, ...(selectedProduct.additionalImages ?? [])]
        : [];
      const allUrls = [...existing, ...uploaded.map((img) => img.secure_url)];

      await productService.update(selectedProductId, {
        mainImage: allUrls[0],
        additionalImages: allUrls.slice(1),
      });

      // Insertar en product_images
      const imagePayload = uploaded.map((img, i) => ({
        public_id: img.public_id,
        secure_url: img.secure_url,
        is_main: false,
        sort_order: existing.length + i,
      }));
      try {
        await productService.insertImages(selectedProductId, imagePayload);
        toast.success('Imágenes agregadas');
      } catch {
        toast.warning('Imágenes subidas, pero falló la sincronización de metadatos');
      }
    } catch (err: any) {
      toast.error(`Error al subir imágenes: ${err?.message ?? 'Error desconocido'}`);
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    if (!confirm(`¿Eliminar el producto "${selectedProduct.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deleteProduct(selectedProductId);
      setSelectedProductId('');
      toast.success('Producto eliminado');
    } catch {
      toast.error('No se pudo eliminar el producto');
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Administrar equipos</h2>

      {/* Selector de producto */}
      <div className="space-y-2">
        <Label>Seleccionar equipo</Label>
        <Select
          value={selectedProductId}
          onValueChange={(v) => {
            setSelectedProductId(v);
            setSelectedUnitId('');
          }}
        >
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="Elige un equipo…" />
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
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ── Panel de unidades ── */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-medium text-card-foreground">
              Unidades ({units.length})
            </h3>

            {unitsLoading ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : (
              <>
                {/* Lista de unidades */}
                <ul className="mb-4 space-y-2">
                  {units.map((unit) => (
                    <li
                      key={unit.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                        selectedUnitId === unit.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:bg-accent'
                      }`}
                      onClick={() => setSelectedUnitId(unit.id)}
                    >
                      <span className="font-medium">{unit.unit_code}</span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            unit.status === 'active'
                              ? 'default'
                              : unit.status === 'maintenance'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {unit.status === 'active'
                            ? 'Activo'
                            : unit.status === 'maintenance'
                            ? 'Mantenimiento'
                            : 'Retirado'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{unit.campus}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteUnit(unit.id); }}
                          disabled={deletingUnitId === unit.id}
                          className="ml-1 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                  {units.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin unidades registradas</p>
                  )}
                </ul>

                {/* Agregar unidad */}
                <div className="space-y-2 border-t border-border pt-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">Agregar unidad</p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Código *"
                      value={newUnitCode}
                      onChange={(e) => setNewUnitCode(e.target.value)}
                    />
                    <Select value={newUnitCampus} onValueChange={(v) => setNewUnitCampus(v as Campus)}>
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monterrico">Monterrico</SelectItem>
                        <SelectItem value="San Miguel">San Miguel</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    placeholder="Nota inicial (opcional)"
                    value={newUnitNote}
                    onChange={(e) => setNewUnitNote(e.target.value)}
                  />
                  <Button
                    size="sm"
                    onClick={handleAddUnit}
                    disabled={addingUnit || !newUnitCode.trim()}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {addingUnit ? 'Agregando…' : 'Agregar unidad'}
                  </Button>
                </div>

                {/* Unidad seleccionada: estado y notas */}
                {selectedUnit && (
                  <div className="mt-4 space-y-3 border-t border-border pt-4">
                    <p className="text-xs font-medium uppercase text-muted-foreground">
                      {selectedUnit.unit_code} — Estado
                    </p>
                    <div className="flex gap-2">
                      {(['active', 'maintenance', 'retired'] as const).map((s) => (
                        <button
                          key={s}
                          onClick={() => handleUpdateUnitStatus(s)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            selectedUnit.status === s
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-accent text-accent-foreground hover:bg-accent/80'
                          }`}
                        >
                          {s === 'active' ? 'Activo' : s === 'maintenance' ? 'Mantenimiento' : 'Retirado'}
                        </button>
                      ))}
                    </div>

                    <p className="text-xs font-medium uppercase text-muted-foreground">Notas</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nueva nota…"
                        id="new-note"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddNote((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const el = document.getElementById('new-note') as HTMLInputElement;
                          handleAddNote(el.value);
                          el.value = '';
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <ul className="space-y-1">
                      {notes.map((note) => (
                        <li
                          key={note.id}
                          className="flex items-start justify-between rounded border border-border px-3 py-2 text-sm"
                        >
                          <span>{note.note}</span>
                          <button
                            onClick={() => removeNote(note.id)}
                            className="ml-2 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>

          {/* ── Panel de imágenes ── */}
          <section className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-medium text-card-foreground">Imágenes</h3>

            <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary">
              <Upload className="h-4 w-4" />
              {uploadingImages ? 'Subiendo…' : 'Agregar imágenes'}
              <input
                type="file"
                multiple
                accept="image/*"
                className="sr-only"
                disabled={uploadingImages}
                onChange={(e) => handleAddImages(e.target.files)}
              />
            </label>

            {selectedProduct.mainImage && (
              <div className="mt-2">
                <p className="mb-2 text-xs text-muted-foreground">Imagen principal</p>
                <img
                  src={selectedProduct.mainImage}
                  alt={selectedProduct.name}
                  className="h-32 w-full rounded-lg object-cover"
                />
              </div>
            )}

            {(selectedProduct.additionalImages ?? []).length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-2">
                {selectedProduct.additionalImages!.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Imagen ${i + 2}`}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            )}

            {/* Eliminar producto */}
            <div className="mt-6 border-t border-border pt-4">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={handleDeleteProduct}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar equipo
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
