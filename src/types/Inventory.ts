export interface InventoryUnit {
  id: string;
  product_id: string;
  unit_code: string;
  asset_code?: string | null;
  status: "active" | "maintenance" | "retired";
  current_note?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryUnitNote {
  id: string;
  unit_id: string;
  note: string;
  created_by?: string | null;
  created_at: string;
}

export interface InventoryReservation {
  id: string;
  product_id: string;
  unit_id: string;
  requester_name: string;
  requester_code?: string | null;
  purpose?: string | null;
  start_at: string;
  end_at: string;
  status: "reserved" | "cancelled" | "completed";
  created_at: string;
}
