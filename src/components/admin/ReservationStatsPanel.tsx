import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/supabaseClient';
import { InventoryReservation } from '@/types/Inventory';

type ReservationRow = InventoryReservation & {
  product?: {
    name?: string;
    category?: string;
  } | null;
};

const maxValue = (arr: { value: number }[]) => arr.reduce((m, it) => Math.max(m, it.value), 0);

const ReservationStatsPanel = () => {
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReservations = async () => {
    setLoading(true);
    try {
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
          products:product_id (name, category)
        `)
        .order('start_at', { ascending: false });

      if (error) throw error;

      const rows = ((data || []) as any[]).map((row) => ({
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
        product: Array.isArray(row.products) ? row.products[0] : row.products,
      })) as ReservationRow[];

      setReservations(rows);
    } catch (error) {
      console.error('Error fetching reservation stats:', error);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const byCategory = new Map<string, number>();
    const byItem = new Map<string, number>();
    const byDay = new Map<string, number>();

    let activeNow = 0;
    let completed = 0;
    let cancelled = 0;

    reservations.forEach((reservation) => {
      const start = new Date(reservation.start_at).getTime();
      const end = new Date(reservation.end_at).getTime();
      const startDate = new Date(reservation.start_at);
      const dayKey = Number.isNaN(startDate.getTime()) ? null : startDate.toISOString().slice(0, 10);

      if (reservation.status === 'reserved' && start <= now && end >= now) activeNow += 1;
      if (reservation.status === 'completed') completed += 1;
      if (reservation.status === 'cancelled') cancelled += 1;

      const category = reservation.product?.category || 'Sin categoría';
      const item = reservation.product?.name || 'Sin producto';
      byCategory.set(category, (byCategory.get(category) || 0) + 1);
      byItem.set(item, (byItem.get(item) || 0) + 1);
      if (dayKey) byDay.set(dayKey, (byDay.get(dayKey) || 0) + 1);
    });

    const toBars = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);

    const reservationsByCategory = toBars(byCategory);
    const reservationsByItem = toBars(byItem);
    const reservationsByDay = toBars(byDay).sort((a, b) => a.label.localeCompare(b.label)).slice(-12);

    return {
      total: reservations.length,
      activeNow,
      completed,
      cancelled,
      topItem: reservationsByItem[0]?.label || 'Sin datos',
      reservationsByCategory,
      reservationsByItem,
      reservationsByDay,
    };
  }, [reservations]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">Cargando estadísticas de reservas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-beige-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen de reservas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Reservas registradas', value: stats.total.toLocaleString() },
            { label: 'Reservas activas ahora', value: stats.activeNow.toLocaleString() },
            { label: 'Completadas', value: stats.completed.toLocaleString() },
            { label: 'Ítem más reservado', value: stats.topItem }
          ].map((card) => (
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
            <h4 className="text-md font-semibold text-gray-900">Reservas por categoría</h4>
            <span className="text-xs text-gray-500">Barras</span>
          </div>
          <div className="space-y-3">
            {stats.reservationsByCategory.length === 0 ? (
              <p className="text-sm text-gray-500">Sin datos aún.</p>
            ) : (
              stats.reservationsByCategory.map((cat) => {
                const max = Math.max(1, maxValue(stats.reservationsByCategory));
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
            <h4 className="text-md font-semibold text-gray-900">Reservas por día (inicio)</h4>
            <span className="text-xs text-gray-500">Últimos 12 días con datos</span>
          </div>
          <div className="space-y-2">
            {stats.reservationsByDay.length === 0 ? (
              <p className="text-sm text-gray-500">Sin datos aún.</p>
            ) : (
              stats.reservationsByDay.map((row) => {
                const max = Math.max(1, maxValue(stats.reservationsByDay));
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
              })
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-beige-200">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-semibold text-gray-900">Reservas por ítem</h4>
          <span className="text-xs text-gray-500">Trazabilidad por producto</span>
        </div>
        <div className="space-y-2">
          {stats.reservationsByItem.length === 0 ? (
            <p className="text-sm text-gray-500">Sin datos aún.</p>
          ) : (
            stats.reservationsByItem.slice(0, 12).map((row) => {
              const max = Math.max(1, maxValue(stats.reservationsByItem));
              const pct = Math.max(4, (row.value / max) * 100);
              return (
                <div key={row.label} className="flex items-center space-x-3">
                  <span className="w-52 text-sm text-gray-700 truncate">{row.label}</span>
                  <div className="flex-1 h-2.5 bg-cream-100 rounded-full overflow-hidden">
                    <div className="h-2.5 bg-gold-500" style={{ width: `${pct}%` }}></div>
                  </div>
                  <span className="w-10 text-sm font-semibold text-gray-800 text-right">{row.value}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationStatsPanel;
