import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import SEO from "@/components/SEO";
import AdminLogin from "@/components/AdminLogin";
import { useAuth } from "@/context/AuthContext";
import { useProducts } from "@/context/ProductContext";
import { inventoryService } from "@/features/inventory/services/inventoryService";
import { InventoryUnit, InventoryUnitNote } from "@/types/Inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const AdminUnits = () => {
  const { isAuthenticated } = useAuth();
  const { products } = useProducts();
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>("");
  const [notes, setNotes] = useState<InventoryUnitNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedUnit = useMemo(
    () => units.find((unit) => unit.id === selectedUnitId),
    [units, selectedUnitId]
  );

  // Cargar unidades cuando cambia el producto seleccionado
  useEffect(() => {
    if (!selectedProductId) return;
    const run = async () => {
      setLoading(true);
      try {
        const data = await inventoryService.getUnitsByProduct(selectedProductId);
        setUnits(data);
      } catch (err: any) {
        toast.error("No se pudieron cargar los códigos del producto");
        setUnits([]);
      } finally {
        setSelectedUnitId("");
        setNotes([]);
        setLoading(false);
      }
    };
    run();
  }, [selectedProductId]);

  // Cargar historial de notas cuando cambia la unidad seleccionada
  useEffect(() => {
    if (!selectedUnitId) return;
    const run = async () => {
      try {
        const data = await inventoryService.getNotesByUnit(selectedUnitId);
        setNotes(data);
      } catch {
        toast.error("No se pudieron cargar las anotaciones");
        setNotes([]);
      }
    };
    run();
  }, [selectedUnitId]);

  const updateUnitStatus = async (status: InventoryUnit["status"]) => {
    if (!selectedUnit) return;
    try {
      await inventoryService.updateUnit(selectedUnit.id, { status });
      setUnits((prev) =>
        prev.map((unit) => (unit.id === selectedUnit.id ? { ...unit, status } : unit))
      );
      toast.success("Estado actualizado");
    } catch {
      toast.error("No se pudo actualizar el estado");
    }
  };

  const addNote = async () => {
    if (!selectedUnit || !newNote.trim()) return;
    const text = newNote.trim();
    try {
      const note = await inventoryService.addNote(selectedUnit.id, text);
      await inventoryService.updateUnit(selectedUnit.id, { current_note: text });

      setNotes((prev) => [note as InventoryUnitNote, ...prev]);
      setUnits((prev) =>
        prev.map((unit) =>
          unit.id === selectedUnit.id ? { ...unit, current_note: text } : unit
        )
      );
      setNewNote("");
      toast.success("Anotación registrada");
    } catch {
      toast.error("No se pudo guardar la anotación");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <AdminLogin onLogin={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <SEO title="Admin Unidades" description="Gestión de códigos y anotaciones de inventario" noindex />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-bold text-foreground">Gestión de códigos de inventario</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Administra cada ítem por código (estado, anotación actual e historial).
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-border bg-card p-4">
            <Label htmlFor="product">Producto</Label>
            <select
              id="product"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Selecciona producto...</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>

            <div className="mt-4 space-y-2 max-h-[420px] overflow-auto">
              {loading ? (
                <p className="text-sm text-muted-foreground">Cargando códigos...</p>
              ) : units.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin códigos para este producto.</p>
              ) : (
                units.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => setSelectedUnitId(unit.id)}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${ 
                      selectedUnitId === unit.id ? "border-primary bg-primary/10" : "border-border bg-background"
                    }`}
                  >
                    <div className="font-mono font-medium">{unit.unit_code}</div>
                    <div className="text-xs text-muted-foreground">Estado: {unit.status}</div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border bg-card p-4 lg:col-span-2">
            {!selectedUnit ? (
              <p className="text-sm text-muted-foreground">Selecciona un código para ver y editar sus anotaciones.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Código {selectedUnit.unit_code}</h2>
                    <p className="text-sm text-muted-foreground">Activo fijo: {selectedUnit.asset_code || "Sin código"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => updateUnitStatus("active")}>Activo</Button>
                    <Button variant="outline" onClick={() => updateUnitStatus("maintenance")}>Mantenimiento</Button>
                    <Button variant="outline" onClick={() => updateUnitStatus("retired")}>Retirado</Button>
                  </div>
                </div>

                <div className="mt-4 rounded-md border border-border bg-background p-3">
                  <p className="text-xs text-muted-foreground">Anotación actual</p>
                  <p className="mt-1 text-sm">{selectedUnit.current_note || "Sin anotación actual"}</p>
                </div>

                <div className="mt-4 space-y-2">
                  <Label htmlFor="newNote">Nueva anotación</Label>
                  <div className="flex gap-2">
                    <Input
                      id="newNote"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addNote()}
                      placeholder="Ej. Imperfecto en esquina superior derecha"
                    />
                    <Button onClick={addNote}>Guardar</Button>
                  </div>
                </div>

                <div className="mt-6">
                  <h3 className="text-sm font-semibold">Historial de anotaciones</h3>
                  <div className="mt-2 space-y-2 max-h-[280px] overflow-auto">
                    {notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin anotaciones registradas.</p>
                    ) : (
                      notes.map((note) => (
                        <div key={note.id} className="rounded-md border border-border bg-background px-3 py-2">
                          <p className="text-sm">{note.note}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(note.created_at).toLocaleString("es-PE", { timeZone: "America/Lima" })}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminUnits;
