/**
 * inventoryService — acceso a datos para unidades de inventario y notas.
 *
 * Centraliza todas las queries sobre `inventory_units` e `inventory_unit_notes`.
 * Ningún componente debe importar `supabase` para operaciones de inventario.
 */
import { supabase } from '@/infrastructure/supabase/client';
import { InventoryUnit, InventoryUnitNote } from '@/types/Inventory';
import type { Campus } from '@/shared/types/campus';

export const inventoryService = {
  /** Obtiene todas las unidades de un producto ordenadas por código. */
  async getUnitsByProduct(productId: string): Promise<InventoryUnit[]> {
    const { data, error } = await supabase
      .from('inventory_units')
      .select('*')
      .eq('product_id', productId)
      .order('unit_code', { ascending: true });

    if (error) throw error;
    return (data ?? []) as InventoryUnit[];
  },

  /**
   * Devuelve un mapa { productId → { campus → count } } con unidades activas.
   * Usado en el catálogo para mostrar disponibilidad por sede.
   */
  async getActiveStockByCampus(): Promise<Record<string, Record<Campus, number>>> {
    const { data, error } = await supabase
      .from('inventory_units')
      .select('product_id, campus')
      .eq('status', 'active');

    if (error) throw error;

    const stockMap: Record<string, Record<Campus, number>> = {};
    (data ?? []).forEach((unit: any) => {
      const productId = String(unit.product_id ?? '');
      if (!productId) return;

      const campus: Campus =
        unit.campus === 'San Miguel' ? 'San Miguel' : 'Monterrico';

      if (!stockMap[productId]) {
        stockMap[productId] = { Monterrico: 0, 'San Miguel': 0 };
      }
      stockMap[productId][campus] += 1;
    });

    return stockMap;
  },

  /** Crea una nueva unidad para el producto dado. */
  async createUnit(payload: {
    product_id: string;
    unit_code: string;
    campus: Campus;
    current_note?: string;
  }): Promise<InventoryUnit> {
    const { data, error } = await supabase
      .from('inventory_units')
      .insert([payload])
      .select();

    if (error) throw error;
    return data![0] as InventoryUnit;
  },

  /** Actualiza campos de una unidad (p. ej. status, current_note). */
  async updateUnit(
    unitId: string,
    changes: Partial<Pick<InventoryUnit, 'status' | 'current_note' | 'asset_code'>>,
  ): Promise<void> {
    const { error } = await supabase
      .from('inventory_units')
      .update(changes)
      .eq('id', unitId);

    if (error) throw error;
  },

  /** Elimina una unidad por ID (solo la fila). */
  async deleteUnit(unitId: string): Promise<void> {
    const { error } = await supabase
      .from('inventory_units')
      .delete()
      .eq('id', unitId);

    if (error) throw error;
  },

  /**
   * Elimina una unidad con cascade manual:
   *  1. Borra sus notas históricas
   *  2. Borra sus reservas
   *  3. Borra la unidad
   *
   * Usar cuando no hay ON DELETE CASCADE en la DB o se quiere control explícito.
   */
  async deleteUnitCascade(unitId: string): Promise<void> {
    const { error: notesError } = await supabase
      .from('inventory_unit_notes')
      .delete()
      .eq('unit_id', unitId);
    if (notesError) throw new Error(`Error eliminando notas: ${notesError.message}`);

    const { error: resError } = await supabase
      .from('inventory_reservations')
      .delete()
      .eq('unit_id', unitId);
    if (resError) throw new Error(`Error eliminando reservas: ${resError.message}`);

    const { error: unitError } = await supabase
      .from('inventory_units')
      .delete()
      .eq('id', unitId);
    if (unitError) throw new Error(`Error eliminando unidad: ${unitError.message}`);
  },

  /** Cuenta unidades activas de un producto. */
  async countActiveUnits(productId: string): Promise<number> {
    const { count, error } = await supabase
      .from('inventory_units')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId)
      .eq('status', 'active');

    if (error) throw error;
    return count ?? 0;
  },

  // ── Notas ──────────────────────────────────────────────────────────────────

  /** Obtiene notas de una unidad, más recientes primero. */
  async getNotesByUnit(unitId: string): Promise<InventoryUnitNote[]> {
    const { data, error } = await supabase
      .from('inventory_unit_notes')
      .select('*')
      .eq('unit_id', unitId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as InventoryUnitNote[];
  },

  /** Agrega una nota a una unidad. */
  async addNote(unitId: string, note: string): Promise<InventoryUnitNote> {
    const { data, error } = await supabase
      .from('inventory_unit_notes')
      .insert([{ unit_id: unitId, note }])
      .select();

    if (error) throw error;
    return data![0] as InventoryUnitNote;
  },

  /** Elimina una nota por ID. */
  async deleteNote(noteId: string): Promise<void> {
    const { error } = await supabase
      .from('inventory_unit_notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
  },
};
