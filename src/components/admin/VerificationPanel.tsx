import { useEffect, useMemo, useState } from 'react';
import { Clock3, RefreshCw } from 'lucide-react';
import { supabase } from '@/supabaseClient';
import { InventoryReservation } from '@/types/Inventory';

type ReservationRow = InventoryReservation & {
  product?: {
    id?: string;
    name?: string;
    category?: string;
  } | null;
  unit?: {
    id?: string;
    unit_code?: string;
    asset_code?: string | null;
  } | null;
};

const VerificationPanel = () => {
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [noteDraftByReservation, setNoteDraftByReservation] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now());

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
          products:product_id (id, name, category),
          inventory_units:unit_id (id, unit_code, asset_code)
        `)
        .in('status', ['reserved'])
        .order('start_at', { ascending: true });

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
        unit: Array.isArray(row.inventory_units) ? row.inventory_units[0] : row.inventory_units,
      })) as ReservationRow[];

      setReservations(rows);
      setNow(Date.now());
    } catch (error) {
      console.error('Error fetching verification reservations:', error);
      alert('Error al cargar reservas de verificación');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const buckets = useMemo(() => {
    const upcoming: ReservationRow[] = [];
    const active: ReservationRow[] = [];
    const overdue: ReservationRow[] = [];

    reservations.forEach((reservation) => {
      const start = new Date(reservation.start_at).getTime();
      const end = new Date(reservation.end_at).getTime();
      if (Number.isNaN(start) || Number.isNaN(end)) return;

      if (start > now) {
        upcoming.push(reservation);
      } else if (end < now) {
        overdue.push(reservation);
      } else {
        active.push(reservation);
      }
    });

    return {
      upcoming,
      active,
      overdue,
    };
  }, [reservations, now]);

  const addUnitNote = async (unitId: string, note: string) => {
    const trimmedNote = note.trim();
    if (!trimmedNote) return;

    const { error: noteError } = await supabase
      .from('inventory_unit_notes')
      .insert([{ unit_id: unitId, note: trimmedNote, created_by: null }]);
    if (noteError) throw noteError;

    const { error: currentError } = await supabase
      .from('inventory_units')
      .update({ current_note: trimmedNote })
      .eq('id', unitId);
    if (currentError) throw currentError;
  };

  const handleConfirmDelivery = async (reservation: ReservationRow) => {
    if (!reservation.unit_id) return;

    setProcessingId(reservation.id);
    try {
      const customNote = (noteDraftByReservation[reservation.id] || '').trim();
      const note = customNote || `Entrega confirmada (${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })})`;
      await addUnitNote(reservation.unit_id, note);

      setNoteDraftByReservation((prev) => ({ ...prev, [reservation.id]: '' }));
      alert('Entrega confirmada correctamente.');
    } catch (error: any) {
      console.error(error);
      alert(`No se pudo confirmar la entrega: ${error?.message || 'Error desconocido'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReception = async (reservation: ReservationRow) => {
    if (!reservation.unit_id) return;

    setProcessingId(reservation.id);
    try {
      const customNote = (noteDraftByReservation[reservation.id] || '').trim();
      if (customNote) {
        await addUnitNote(reservation.unit_id, customNote);
      }

      const { error } = await supabase
        .from('inventory_reservations')
        .update({ status: 'completed' })
        .eq('id', reservation.id);
      if (error) throw error;

      setReservations((prev) => prev.filter((row) => row.id !== reservation.id));
      setNoteDraftByReservation((prev) => ({ ...prev, [reservation.id]: '' }));
      alert('Recepción confirmada. La reserva quedó marcada como completada.');
    } catch (error: any) {
      console.error(error);
      alert(`No se pudo confirmar la recepción: ${error?.message || 'Error desconocido'}`);
    } finally {
      setProcessingId(null);
    }
  };

  const renderList = (
    title: string,
    subtitle: string,
    rows: ReservationRow[],
    tone: 'blue' | 'green' | 'red'
  ) => {
    const toneClass =
      tone === 'blue'
        ? 'border-blue-200 bg-blue-50 text-blue-800'
        : tone === 'green'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
          : 'border-red-200 bg-red-50 text-red-800';

    return (
      <section className="bg-white rounded-lg shadow-sm border border-beige-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{subtitle}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full border font-semibold ${toneClass}`}>{rows.length}</span>
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">Sin reservas en esta sección.</p>
        ) : (
          <div className="space-y-3 max-h-[520px] overflow-auto pr-1">
            {rows.map((reservation) => {
              const isBusy = processingId === reservation.id;
              return (
                <article key={reservation.id} className="border border-gray-200 rounded-md p-3 bg-cream-25">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{reservation.product?.name || 'Producto eliminado'}</p>
                      <p className="text-xs text-gray-500">{reservation.product?.category || 'Sin categoría'} · Unidad: {reservation.unit?.unit_code || 'N/A'}</p>
                    </div>
                    <span className="text-[11px] font-medium px-2 py-1 bg-white border border-gray-200 rounded-full text-gray-600">
                      R-{reservation.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-600">
                    <p><span className="font-medium">Solicitante:</span> {reservation.requester_name} {reservation.requester_code ? `(${reservation.requester_code})` : ''}</p>
                    <p><span className="font-medium">Inicio:</span> {new Date(reservation.start_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p>
                    <p><span className="font-medium">Fin:</span> {new Date(reservation.end_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p>
                  </div>

                  <div className="mt-3 space-y-2">
                    <label className="block text-xs font-medium text-gray-700">Anotación de verificación (opcional)</label>
                    <input
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={noteDraftByReservation[reservation.id] || ''}
                      onChange={(e) =>
                        setNoteDraftByReservation((prev) => ({
                          ...prev,
                          [reservation.id]: e.target.value,
                        }))
                      }
                      placeholder="Ej: Equipo recepcionado sin novedades / cable con desgaste"
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleConfirmDelivery(reservation)}
                      disabled={isBusy}
                      className="px-3 py-1.5 rounded-md border border-blue-200 bg-blue-50 text-blue-700 text-sm font-medium hover:bg-blue-100 disabled:opacity-50"
                    >
                      Confirmar entrega
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirmReception(reservation)}
                      disabled={isBusy}
                      className="px-3 py-1.5 rounded-md border border-emerald-300 bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Confirmar recepción
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-beige-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Verificación operativa</h2>
          <p className="text-sm text-gray-600">Controla entregas y recepciones desde la hora actual, con anotaciones sin salir de este panel.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <Clock3 className="h-4 w-4" />
            Hora actual: {new Date(now).toLocaleString('es-PE', { timeZone: 'America/Lima' })}
          </div>
          <button
            onClick={fetchReservations}
            disabled={loading}
            className="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando verificación...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {renderList('Por entregar', 'Reservas futuras aún no iniciadas.', buckets.upcoming, 'blue')}
          {renderList('Activas', 'Reservas en curso en este momento.', buckets.active, 'green')}
          {renderList('Por devolver', 'Reservas vencidas pendientes de recepción.', buckets.overdue, 'red')}
        </div>
      )}
    </div>
  );
};

export default VerificationPanel;
