/**
 * reservationService — acceso a datos para reservas de inventario.
 *
 * Centraliza todas las queries sobre `inventory_reservations`.
 */
import { supabase } from '@/infrastructure/supabase/client';
import { InventoryReservation } from '@/types/Inventory';

export interface CreateReservationPayload {
  product_id: string;
  unit_id: string;
  requester_name: string;
  requester_code?: string;
  purpose?: string;
  start_at: string;
  end_at: string;
}

export interface ReservationRow extends InventoryReservation {
  product?: { id?: string; name?: string; category?: string } | null;
  unit?: { id?: string; unit_code?: string; asset_code?: string | null; status?: string } | null;
}

export const reservationService = {
  /** Obtiene todas las reservas con datos de producto y unidad. */
  async getAll(): Promise<ReservationRow[]> {
    const { data, error } = await supabase
      .from('inventory_reservations')
      .select(`
        id,
        product_id,
        unit_id,
        requester_name,
        requester_code,
        purpose,
        start_at,
        end_at,
        status,
        created_at,
        products:product_id (id, name, category),
        inventory_units:unit_id (id, unit_code, asset_code, status)
      `)
      .order('start_at', { ascending: false });

    if (error) throw error;

    return ((data ?? []) as any[]).map((row) => ({
      id: row.id,
      product_id: row.product_id,
      unit_id: row.unit_id,
      requester_name: row.requester_name,
      requester_code: row.requester_code,
      purpose: row.purpose,
      start_at: row.start_at,
      end_at: row.end_at,
      status: row.status,
      created_at: row.created_at,
      product: Array.isArray(row.products) ? row.products[0] ?? null : row.products ?? null,
      unit: Array.isArray(row.inventory_units)
        ? row.inventory_units[0] ?? null
        : row.inventory_units ?? null,
    }));
  },

  /** Obtiene reservas activas que se solapan con el rango dado (para verificar disponibilidad). */
  async getConflictingReservations(
    unitId: string,
    startAt: string,
    endAt: string,
  ): Promise<InventoryReservation[]> {
    const { data, error } = await supabase
      .from('inventory_reservations')
      .select('*')
      .eq('unit_id', unitId)
      .eq('status', 'reserved')
      .lt('start_at', endAt)
      .gt('end_at', startAt);

    if (error) throw error;
    return (data ?? []) as InventoryReservation[];
  },

  /** Crea una nueva reserva. */
  async create(payload: CreateReservationPayload): Promise<InventoryReservation> {
    const { data, error } = await supabase
      .from('inventory_reservations')
      .insert([{ ...payload, status: 'reserved' }])
      .select();

    if (error) throw error;
    return data![0] as InventoryReservation;
  },

  /** Actualiza el estado de una reserva. */
  async updateStatus(
    reservationId: string,
    status: InventoryReservation['status'],
  ): Promise<void> {
    const { error } = await supabase
      .from('inventory_reservations')
      .update({ status })
      .eq('id', reservationId);

    if (error) throw error;
  },
};
