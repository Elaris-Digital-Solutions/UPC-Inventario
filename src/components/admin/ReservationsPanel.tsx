import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ShoppingBag } from 'lucide-react';
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
    status?: string;
  } | null;
};

const ReservationsPanel = () => {
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'reserved' | 'completed' | 'cancelled'>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'start_desc' | 'start_asc' | 'created_desc'>('start_desc');

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
          inventory_units:unit_id (id, unit_code, asset_code, status)
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
        unit: Array.isArray(row.inventory_units) ? row.inventory_units[0] : row.inventory_units,
      })) as ReservationRow[];

      setReservations(rows);
      setSelectedReservationId((prev) => (prev && rows.some((r) => r.id === prev) ? prev : null));
    } catch (error) {
      console.error('Error fetching reservations:', error);
      alert('Error al cargar las reservas');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const updateReservationStatus = async (reservationId: string, newStatus: InventoryReservation['status']) => {
    try {
      const { error } = await supabase
        .from('inventory_reservations')
        .update({ status: newStatus })
        .eq('id', reservationId);

      if (error) throw error;

      setReservations((prev) =>
        prev.map((reservation) =>
          reservation.id === reservationId ? { ...reservation, status: newStatus } : reservation
        )
      );
    } catch (error: any) {
      console.error('Error updating reservation status:', error);
      alert(`No se pudo actualizar el estado: ${error?.message || 'Error desconocido'}`);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredReservations = useMemo(() => {
    return reservations
      .filter((reservation) => statusFilter === 'all' || reservation.status === statusFilter)
      .filter((reservation) => {
        if (!normalizedSearch) return true;
        const haystack = [
          reservation.requester_name,
          reservation.requester_code,
          reservation.product?.name,
          reservation.product?.category,
          reservation.unit?.unit_code,
          reservation.unit?.asset_code,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      });
  }, [reservations, statusFilter, normalizedSearch]);

  const sortedReservations = useMemo(() => {
    return [...filteredReservations].sort((a, b) => {
      const startA = new Date(a.start_at).getTime();
      const startB = new Date(b.start_at).getTime();
      const createdA = new Date(a.created_at).getTime();
      const createdB = new Date(b.created_at).getTime();

      switch (sort) {
        case 'start_asc':
          return startA - startB;
        case 'created_desc':
          return createdB - createdA;
        case 'start_desc':
        default:
          return startB - startA;
      }
    });
  }, [filteredReservations, sort]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-beige-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col space-y-1 lg:col-span-2">
            <label className="text-sm font-medium text-gray-700">Buscar por solicitante, código o ítem</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ej: U20231234, Galaxy Tab, 00192181"
              className="border-gray-300 rounded-md text-sm focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border-gray-300 rounded-md text-sm focus:ring-gold-500 focus:border-gold-500"
            >
              <option value="all">Todos</option>
              <option value="reserved">Reservado</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Orden</label>
            <div className="flex items-center gap-3">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="border-gray-300 rounded-md text-sm focus:ring-gold-500 focus:border-gold-500 flex-1"
              >
                <option value="start_desc">Inicio (recientes)</option>
                <option value="start_asc">Inicio (antiguas)</option>
                <option value="created_desc">Registro (recientes)</option>
              </select>
              <button
                onClick={fetchReservations}
                className="text-gold-600 hover:text-gold-700 text-sm font-medium whitespace-nowrap"
              >
                Actualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Cargando reservas...</p>
        </div>
      ) : sortedReservations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-beige-200 p-12 text-center">
          <ShoppingBag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No hay reservas</h3>
          <p className="text-gray-500">No se encontraron reservas con los filtros aplicados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-beige-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reserva</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ítem / Categoría</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unidad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inicio - Fin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado / Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedReservations.map((reservation) => {
                  const selected = selectedReservationId === reservation.id;
                  return (
                    <Fragment key={reservation.id}>
                      <tr className={selected ? 'bg-cream-50' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">R-{reservation.id.slice(0, 8).toUpperCase()}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <p className="font-medium text-gray-900">{reservation.requester_name}</p>
                          <p className="text-xs text-gray-500">{reservation.requester_code || 'Sin código UPC'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          <p className="font-medium text-gray-900">{reservation.product?.name || 'Producto eliminado'}</p>
                          <p className="text-xs text-gray-500">{reservation.product?.category || 'Sin categoría'}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <p className="font-mono text-gray-900">{reservation.unit?.unit_code || 'Sin unidad'}</p>
                          <p className="text-xs text-gray-500">Activo fijo: {reservation.unit?.asset_code || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <p>{new Date(reservation.start_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p>
                          <p className="text-xs text-gray-500">{new Date(reservation.end_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-3">
                            <select
                              value={reservation.status}
                              onChange={(e) => updateReservationStatus(reservation.id, e.target.value as InventoryReservation['status'])}
                              className={`text-xs font-semibold rounded-full px-2 py-1 border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 ${reservation.status === 'reserved'
                                ? 'bg-blue-100 text-blue-800 focus:ring-blue-500'
                                : reservation.status === 'completed'
                                  ? 'bg-green-100 text-green-800 focus:ring-green-500'
                                  : 'bg-red-100 text-red-800 focus:ring-red-500'
                                }`}
                            >
                              <option value="reserved">Reservado</option>
                              <option value="completed">Completado</option>
                              <option value="cancelled">Cancelado</option>
                            </select>
                            <button
                              onClick={() => setSelectedReservationId(selected ? null : reservation.id)}
                              className="text-gold-600 hover:text-gold-900 font-medium flex items-center"
                            >
                              {selected ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-1" />
                                  Ocultar
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-4 w-4 mr-1" />
                                  Ver
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {selected && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-cream-50 border-b border-gray-200">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <h4 className="font-bold text-gray-900 mb-2">Datos de la reserva</h4>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p><span className="font-medium">Registrada:</span> {new Date(reservation.created_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p>
                                  <p><span className="font-medium">Estado unidad:</span> {reservation.unit?.status || 'N/A'}</p>
                                  <p><span className="font-medium">Duración:</span> {Math.max(0, Math.round((new Date(reservation.end_at).getTime() - new Date(reservation.start_at).getTime()) / 60000))} min</p>
                                </div>
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 mb-2">Propósito</h4>
                                <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">{reservation.purpose?.trim() || 'Sin propósito registrado'}</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationsPanel;
