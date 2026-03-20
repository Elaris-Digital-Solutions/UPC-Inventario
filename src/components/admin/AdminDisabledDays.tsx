import { useState, useEffect } from "react";
import { format, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";

const isMissingCancellationReasonColumn = (error: any) =>
  error?.code === '42703' && String(error?.message || '').includes('cancellation_reason');
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Trash2, AlertTriangle, CalendarOff } from "lucide-react";

type DisabledDay = {
  id: string;
  date: string;
};

const AdminDisabledDays = () => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [disabledDays, setDisabledDays] = useState<DisabledDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const fetchDisabledDays = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("disabled_days")
      .select("id, date")
      .order("date", { ascending: true });

    if (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los días inhabilitados.",
      });
    } else {
      setDisabledDays(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDisabledDays();
  }, []);

  const handleDisableDay = async () => {
    if (!selectedDate) return;

    const formattedDate = format(selectedDate, "yyyy-MM-dd");

    // Check if already disabled
    if (disabledDays.some((d) => d.date === formattedDate)) {
      toast({
        title: "Día ya inhabilitado",
        description: "La fecha seleccionada ya se encuentra en la lista.",
      });
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de inhabilitar el ${format(selectedDate, "dd 'de' MMMM", {
        locale: es,
      })}?\n\n¡ATENCIÓN! Todas las reservas activas para este día serán canceladas automáticamente.`
    );

    if (!confirmed) return;

    setIsProcessing(true);
    try {
      // 1. Insert the disabled day
      const { data: newDay, error: insertError } = await supabase
        .from("disabled_days")
        .insert([{ date: formattedDate }])
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Cancel all reservations for that day
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();

      let { error: cancelError } = await supabase
        .from("inventory_reservations")
        .update({
          status: "cancelled",
          cancellation_reason: "Cancelado por la administración (Día inhabilitado)",
        })
        .in("status", ["reserved", "active"])
        .gte("start_at", dayStart)
        .lte("start_at", dayEnd);

      if (isMissingCancellationReasonColumn(cancelError)) {
        const fallback = await supabase
          .from("inventory_reservations")
          .update({ status: "cancelled" })
          .in("status", ["reserved", "active"])
          .gte("start_at", dayStart)
          .lte("start_at", dayEnd);

        cancelError = fallback.error;
      }

      if (cancelError) {
        console.error("Error cancelling reservations:", cancelError);
        toast({
          variant: "destructive",
          title: "Advertencia",
          description: "El día fue inhabilitado pero hubo un error al cancelar las reservas de ese día.",
        });
      } else {
        toast({
          title: "Día Inhabilitado",
          description: "Las reservas de ese día han sido canceladas exitosamente.",
        });
      }

      setDisabledDays((prev) => [...prev, newDay]);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Ocurrió un error inesperado.",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveDisabledDay = async (id: string, dateStr: string) => {
    const confirmed = window.confirm(`¿Volver a habilitar el ${dateStr}?`);
    if (!confirmed) return;

    try {
      const { error } = await supabase.from("disabled_days").delete().eq("id", id);
      if (error) throw error;

      setDisabledDays((prev) => prev.filter((d) => d.id !== id));
      toast({
        title: "Día Habilitado",
        description: "Se habilitó la fecha exitosamente.",
      });
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo habilitar el día.",
      });
    }
  };

  const disabledDatesObjects = disabledDays.map((d) => new Date(d.date + "T00:00:00"));

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200 bg-red-50/50">
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-red-600 shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-semibold text-red-900">Inhabilitar Días (Excepciones)</h2>
            <p className="text-sm text-red-800">
              Usa este panel para marcar días feriados o sin atención. Ningún estudiante podrá hacer reservas 
              en las fechas listadas. Al añadir un día nuevo, se <strong>cancelan automáticamente</strong> todas 
              las reservas que ya existían para esa fecha.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col items-center">
          <h3 className="text-md font-semibold text-gray-900 w-full mb-4">Seleccionar Fecha</h3>
          
          <div className="border border-gray-200 rounded-xl p-2 bg-gray-50 mb-6">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => {
                const today = startOfDay(new Date());
                return date < today; // Can only disable future or current days
              }}
              modifiers={{
                 disabledDays: disabledDatesObjects
              }}
              modifiersStyles={{
                disabledDays: { color: "white", backgroundColor: "rgb(239 68 64)" } // Red background
              }}
              className="bg-white rounded-md shadow-sm pointer-events-auto"
            />
          </div>

          <Button 
            onClick={handleDisableDay} 
            disabled={!selectedDate || isProcessing}
            variant="destructive"
            className="w-full sm:w-auto"
          >
            {isProcessing ? "Procesando..." : "Inhabilitar Día Seleccionado"}
          </Button>
        </section>

        <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarOff size={18} className="text-gray-500" />
            Días Inhabilitados Actuales
          </h3>
          
          {loading ? (
            <p className="text-sm text-gray-500 text-center py-8">Cargando fechas...</p>
          ) : disabledDays.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-sm text-gray-500">No hay días inhabilitados registrados.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-auto pr-2">
              {disabledDays.map((day) => {
                const dateObj = new Date(day.date + "T00:00:00");
                const isPast = dateObj < startOfDay(new Date());
                
                return (
                  <div key={day.id} className={`flex items-center justify-between p-3 border rounded-lg ${isPast ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-red-50 border-red-100'}`}>
                    <div>
                      <p className={`font-semibold ${isPast ? 'text-gray-600' : 'text-red-900'}`}>
                        {format(dateObj, "EEEE, dd 'de' MMMM yyyy", { locale: es })}
                      </p>
                      {isPast && <span className="text-[10px] uppercase text-gray-500">Fecha pasada</span>}
                    </div>
                    {!isPast && (
                      <button
                        onClick={() => handleRemoveDisabledDay(day.id, format(dateObj, "dd/MM/yyyy"))}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                        title="Habilitar nuevamente"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDisabledDays;
