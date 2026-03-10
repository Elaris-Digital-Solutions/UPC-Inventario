/**
 * useInventoryUnits — hook para cargar y operar sobre unidades de inventario.
 *
 * Encapsula la llamada al servicio y el estado local de React.
 * Los componentes solo interactúan con este hook, nunca con Supabase directamente.
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { inventoryService } from '@/features/inventory/services/inventoryService';
import { InventoryUnit, InventoryUnitNote } from '@/types/Inventory';
import type { Campus } from '@/shared/types/campus';

interface UseInventoryUnitsOptions {
  productId: string | null | undefined;
}

export function useInventoryUnits({ productId }: UseInventoryUnitsOptions) {
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUnits = useCallback(async () => {
    if (!productId) {
      setUnits([]);
      return;
    }
    setLoading(true);
    try {
      const data = await inventoryService.getUnitsByProduct(productId);
      setUnits(data);
    } catch (err) {
      console.error(err);
      toast.error('No se pudieron cargar las unidades del producto');
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void loadUnits();
  }, [loadUnits]);

  const addUnit = async (payload: {
    unit_code: string;
    campus: Campus;
    current_note?: string;
  }) => {
    if (!productId) return;
    const created = await inventoryService.createUnit({ ...payload, product_id: productId });
    setUnits((prev) => [...prev, created]);
    return created;
  };

  const removeUnit = async (unitId: string) => {
    await inventoryService.deleteUnit(unitId);
    setUnits((prev) => prev.filter((u) => u.id !== unitId));
  };

  return { units, loading, reload: loadUnits, addUnit, removeUnit };
}

// ─── Notas ────────────────────────────────────────────────────────────────────

interface UseUnitNotesOptions {
  unitId: string | null | undefined;
}

export function useUnitNotes({ unitId }: UseUnitNotesOptions) {
  const [notes, setNotes] = useState<InventoryUnitNote[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!unitId) {
      setNotes([]);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const data = await inventoryService.getNotesByUnit(unitId);
        setNotes(data);
      } catch (err) {
        console.error(err);
        toast.error('No se pudieron cargar las notas');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [unitId]);

  const addNote = async (note: string) => {
    if (!unitId) return;
    const created = await inventoryService.addNote(unitId, note);
    setNotes((prev) => [created, ...prev]);
  };

  const removeNote = async (noteId: string) => {
    await inventoryService.deleteNote(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  return { notes, loading, addNote, removeNote };
}
