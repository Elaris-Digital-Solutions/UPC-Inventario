import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/supabaseClient';
import { InventoryReservation } from '@/types/Inventory';
import { endOfWeek, isWithinInterval, startOfWeek } from 'date-fns';

type ReservationRow = InventoryReservation & {
  product?: {
    name?: string;
    category?: string;
  } | null;
  alumno?: {
    id?: number;
    carrera?: {
      id?: number;
      nombre?: string;
      facultad?: {
        id?: number;
        nombre?: string;
      } | null;
    } | null;
  } | null;
};

const maxValue = (arr: { value: number }[]) => arr.reduce((m, it) => Math.max(m, it.value), 0);

const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
const weekdayLabelByNumber: Record<number, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

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
          user_id,
          purpose,
          start_at,
          end_at,
          status,
          created_at,
          products:product_id (name, category),
          alumnos:user_id (
            id,
            carreras:carrera_id (
              id,
              nombre,
              facultades:facultad_id (
                id,
                nombre
              )
            )
          )
        `)
        .order('start_at', { ascending: false });

      if (error) throw error;

      const rows = ((data || []) as any[]).map((row) => ({
        id: row.id,
        product_id: row.product_id,
        unit_id: row.unit_id,
        user_id: row.user_id,
        purpose: row.purpose,
        start_at: row.start_at,
        end_at: row.end_at,
        status: row.status,
        created_at: row.created_at,
        product: Array.isArray(row.products) ? row.products[0] : row.products,
        alumno: (() => {
          const alumnoRow = Array.isArray(row.alumnos) ? row.alumnos[0] : row.alumnos;
          if (!alumnoRow) return null;

          const carreraRow = Array.isArray(alumnoRow.carreras) ? alumnoRow.carreras[0] : alumnoRow.carreras;
          const facultadRow = carreraRow
            ? (Array.isArray(carreraRow.facultades) ? carreraRow.facultades[0] : carreraRow.facultades)
            : null;

          return {
            id: alumnoRow.id,
            carrera: carreraRow
              ? {
                  id: carreraRow.id,
                  nombre: carreraRow.nombre,
                  facultad: facultadRow
                    ? {
                        id: facultadRow.id,
                        nombre: facultadRow.nombre,
                      }
                    : null,
                }
              : null,
          };
        })(),
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
    const byFaculty = new Map<string, number>();
    const byCareer = new Map<string, number>();
    const byItem = new Map<string, number>();
    const weeklyByWeekday = new Map<number, number>();

    weekdayOrder.forEach((day) => {
      weeklyByWeekday.set(day, 0);
    });

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    let activeNow = 0;
    let completed = 0;
    let cancelled = 0;
    let thisWeekLoans = 0;

    reservations.forEach((reservation) => {
      const start = new Date(reservation.start_at).getTime();
      const end = new Date(reservation.end_at).getTime();
      const startDate = new Date(reservation.start_at);
      const isValidStartDate = !Number.isNaN(startDate.getTime());

      if (reservation.status === 'reserved' && start <= now && end >= now) activeNow += 1;
      if (reservation.status === 'completed') completed += 1;
      if (reservation.status === 'cancelled') cancelled += 1;

      if (isValidStartDate && reservation.status !== 'cancelled') {
        const inCurrentWeek = isWithinInterval(startDate, { start: weekStart, end: weekEnd });
        if (inCurrentWeek) {
          const weekday = startDate.getDay();
          weeklyByWeekday.set(weekday, (weeklyByWeekday.get(weekday) || 0) + 1);
          thisWeekLoans += 1;
        }
      }

      const faculty = reservation.alumno?.carrera?.facultad?.nombre || 'Sin facultad';
      const career = reservation.alumno?.carrera?.nombre || 'Sin carrera';
      const item = reservation.product?.name || 'Sin producto';
      byFaculty.set(faculty, (byFaculty.get(faculty) || 0) + 1);
      byCareer.set(career, (byCareer.get(career) || 0) + 1);
      byItem.set(item, (byItem.get(item) || 0) + 1);
    });

    const toBars = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);

    const reservationsByFaculty = toBars(byFaculty);
    const reservationsByCareer = toBars(byCareer);
    const reservationsByItem = toBars(byItem);
    const reservationsByWeekday = weekdayOrder.map((day) => ({
      label: weekdayLabelByNumber[day],
      value: weeklyByWeekday.get(day) || 0,
    }));

    return {
      total: reservations.length,
      activeNow,
      completed,
      cancelled,
      thisWeekLoans,
      topItem: reservationsByItem[0]?.label || 'Sin datos',
      reservationsByFaculty,
      reservationsByCareer,
      reservationsByItem,
      reservationsByWeekday,
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Reservas registradas', value: stats.total.toLocaleString() },
            { label: 'Préstamos esta semana', value: stats.thisWeekLoans.toLocaleString() },
            { label: 'Reservas activas ahora', value: stats.activeNow.toLocaleString() },
            { label: 'Completadas', value: stats.completed.toLocaleString() },
            { label: 'Canceladas', value: stats.cancelled.toLocaleString() }
          ].map((card) => (
            <div key={card.label} className="bg-cream-50 border border-beige-200 rounded-lg p-4">
              <p className="text-sm text-gray-500">{card.label}</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{card.value}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">Ítem más reservado: <span className="font-medium text-gray-700">{stats.topItem}</span></p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-beige-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Reservas por facultades</h4>
          </div>
          <div className="space-y-3">
            {stats.reservationsByFaculty.length === 0 ? (
              <p className="text-sm text-gray-500">Sin datos aún.</p>
            ) : (
              stats.reservationsByFaculty.map((row) => {
                const max = Math.max(1, maxValue(stats.reservationsByFaculty));
                const pct = Math.max(4, (row.value / max) * 100);
                return (
                  <div key={row.label} className="flex items-center space-x-3">
                    <span className="w-32 text-sm text-gray-700 truncate">{row.label}</span>
                    <div className="flex-1 h-3 bg-cream-100 rounded-full overflow-hidden">
                      <div className="h-3 bg-gold-500" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="w-12 text-sm font-medium text-gray-800 text-right">{row.value}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-beige-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Reservas por carreras</h4>
          </div>
          <div className="space-y-3">
            {stats.reservationsByCareer.length === 0 ? (
              <p className="text-sm text-gray-500">Sin datos aún.</p>
            ) : (
              stats.reservationsByCareer.slice(0, 12).map((row) => {
                const max = Math.max(1, maxValue(stats.reservationsByCareer));
                const pct = Math.max(4, (row.value / max) * 100);
                return (
                  <div key={row.label} className="flex items-center space-x-3">
                    <span className="w-36 text-sm text-gray-700 truncate">{row.label}</span>
                    <div className="flex-1 h-3 bg-cream-100 rounded-full overflow-hidden">
                      <div className="h-3 bg-gold-500" style={{ width: `${pct}%` }}></div>
                    </div>
                    <span className="w-12 text-sm font-medium text-gray-800 text-right">{row.value}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-beige-200">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-md font-semibold text-gray-900">Préstamos esta semana por día</h4>
            <span className="text-xs text-gray-500">Lunes a domingo</span>
          </div>
          <div className="min-h-[220px]">
            {stats.reservationsByWeekday.every((row) => row.value === 0) ? (
              <p className="text-sm text-gray-500">Sin datos aún.</p>
            ) : (
              <div className="h-[220px] grid grid-cols-7 gap-3 items-end border-b border-beige-200 pb-6">
                {stats.reservationsByWeekday.map((row) => {
                  const max = Math.max(1, maxValue(stats.reservationsByWeekday));
                  const chartHeight = 150;
                  const scaledHeight = (row.value / max) * chartHeight;
                  const barHeight = row.value === 0 ? 4 : Math.max(12, scaledHeight);
                  const isZero = row.value === 0;
                  return (
                    <div key={row.label} className="flex flex-col items-center h-full justify-end">
                      <span className="text-xs font-semibold text-gray-800 mb-2">{row.value}</span>
                      <div className="w-full h-[160px] flex items-end justify-center bg-muted/20 rounded-md">
                        <div
                          className={`w-8 rounded-t-md ${isZero ? 'bg-muted/70' : 'bg-primary'}`}
                          style={{ height: `${barHeight}px` }}
                          aria-label={`${row.label}: ${row.value}`}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-700 mt-2 text-center leading-tight">{row.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
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
    </div>
  );
};

export default ReservationStatsPanel;
