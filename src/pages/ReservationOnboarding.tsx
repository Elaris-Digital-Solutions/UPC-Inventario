import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { addDays, addMinutes, addHours, subHours, format, startOfDay, endOfWeek, addWeeks } from "date-fns";
import { Calendar as CalendarIcon, ArrowLeft, Clock3, Building2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProducts } from "@/context/ProductContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/supabaseClient";
import { InventoryUnit, InventoryReservation } from "@/types/Inventory";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Campus = "Monterrico" | "San Miguel";

type SlotAvailability = {
  start: Date;
  end: Date;
  availableUnits: number;
};

const PURPOSE_OPTIONS = [
  "Práctica de laboratorio",
  "Proyecto de curso",
  "Trabajo de investigación",
  "Desarrollo de Tesis",
  "Actividad extracurricular",
  "Otro",
];

const DURATION_OPTIONS = [1, 2, 3, 4];
const OPEN_HOUR = 8;
const CLOSE_HOUR = 22;
const SLOT_STEP_MINUTES = 30;

const getCampusFromParam = (value: string | null): Campus =>
  value === "San Miguel" ? "San Miguel" : "Monterrico";

const overlaps = (reservation: ReservationPick, slotStart: Date, slotEnd: Date) => {
  const reservationStart = new Date(reservation.start_at);
  const reservationEnd = new Date(reservation.end_at);
  return reservationStart < addHours(slotEnd, 2) && reservationEnd > subHours(slotStart, 2);
};

type ReservationPick = Pick<InventoryReservation, "unit_id" | "start_at" | "end_at" | "status">;

const ReservationOnboarding = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { products, loading } = useProducts();
  const { user } = useAuth();
  const item = products.find((product) => product.id === id);

  const [selectedCampus] = useState<Campus>(() => getCampusFromParam(searchParams.get("campus")));
  const [purpose, setPurpose] = useState("");
  const [durationHours, setDurationHours] = useState(2);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlotISO, setSelectedSlotISO] = useState<string>("");
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [reservations, setReservations] = useState<ReservationPick[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!item || !selectedDate) return;

    const loadAvailability = async () => {
      setLoadingAvailability(true);

      const { data: unitsData, error: unitsError } = await supabase
        .from("inventory_units")
        .select("id, product_id, unit_code, campus, status, current_note, created_at, updated_at")
        .eq("product_id", item.id)
        .eq("campus", selectedCampus)
        .eq("status", "active");

      if (unitsError) {
        console.error(unitsError);
        setUnits([]);
        setReservations([]);
        setLoadingAvailability(false);
        return;
      }

      const nextUnits = (unitsData || []) as InventoryUnit[];
      setUnits(nextUnits);

      if (nextUnits.length === 0) {
        setReservations([]);
        setLoadingAvailability(false);
        return;
      }

      const unitIds = nextUnits.map((unit) => unit.id);
      const dayStart = startOfDay(selectedDate);
      const dayEnd = addDays(dayStart, 1);

      const { data: reservationsData, error: reservationsError } = await supabase
        .from("inventory_reservations")
        .select("unit_id, start_at, end_at, status")
        .in("unit_id", unitIds)
        .in("status", ["reserved", "active", "completed"])
        .lt("start_at", dayEnd.toISOString())
        .gt("end_at", dayStart.toISOString());

      if (reservationsError) {
        console.error(reservationsError);
        setReservations([]);
        setLoadingAvailability(false);
        return;
      }

      setReservations((reservationsData || []) as ReservationPick[]);
      setLoadingAvailability(false);
    };

    loadAvailability();
  }, [item, selectedCampus, selectedDate]);

  const slots = useMemo<SlotAvailability[]>(() => {
    if (!selectedDate || units.length === 0) return [];

    const slotsForDay: SlotAvailability[] = [];
    const durationMinutes = durationHours * 60;
    const now = new Date();

    for (let minuteOfDay = OPEN_HOUR * 60; minuteOfDay <= CLOSE_HOUR * 60 - durationMinutes; minuteOfDay += SLOT_STEP_MINUTES) {
      const slotStart = new Date(selectedDate);
      slotStart.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);

      // No mostrar horarios pasados (si seleccionó hoy)
      if (slotStart <= now) {
        continue;
      }

      const slotEnd = addMinutes(slotStart, durationMinutes);
      const availableUnits = units.filter((unit) => {
        const overlapsExistingReservation = reservations.some((reservation) => {
          return reservation.unit_id === unit.id && overlaps(reservation, slotStart, slotEnd);
        });

        return !overlapsExistingReservation;
      }).length;

      slotsForDay.push({
        start: slotStart,
        end: slotEnd,
        availableUnits,
      });
    }

    return slotsForDay;
  }, [selectedDate, units, reservations, durationHours]);

  const availableSlots = useMemo(() => slots.filter((slot) => slot.availableUnits > 0), [slots]);

  const selectedSlot = useMemo(
    () => availableSlots.find((slot) => slot.start.toISOString() === selectedSlotISO),
    [availableSlots, selectedSlotISO]
  );

  useEffect(() => {
    if (!selectedSlotISO) return;
    const stillAvailable = availableSlots.some((slot) => slot.start.toISOString() === selectedSlotISO);
    if (!stillAvailable) {
      setSelectedSlotISO("");
    }
  }, [availableSlots, selectedSlotISO]);

  const handleReserve = async () => {
    if (!item) return;
    if (!purpose) {
      toast.error("Selecciona el motivo de uso");
      return;
    }
    if (!selectedDate) {
      toast.error("Selecciona una fecha");
      return;
    }
    if (!selectedSlot) {
      toast.error("Selecciona un horario disponible");
      return;
    }

    const requesterName =
      (typeof user?.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
      (typeof user?.email === "string" && user.email.split("@")[0]) ||
      "Usuario UPC";

    const requesterCode = typeof user?.email === "string" ? user.email : null;

    const reservationPurpose = `Motivo: ${purpose}`;

    const startAtISO = selectedSlot.start.toISOString();
    const endAtISO = selectedSlot.end.toISOString();

    const isRpcSignatureMismatch = (rpcError: any) => {
      const message = String(rpcError?.message || '').toLowerCase();
      const details = String(rpcError?.details || '').toLowerCase();
      const hint = String(rpcError?.hint || '').toLowerCase();
      const code = String(rpcError?.code || '').toLowerCase();

      // PostgREST typically returns “Could not find the function ...” when args don't match.
      return (
        code === 'pgrst202' ||
        message.includes('could not find the function') ||
        message.includes('function') && message.includes('does not exist') ||
        details.includes('could not find the function') ||
        hint.includes('could not find the function')
      );
    };

    const showRpcError = (rpcError: any, payload: any) => {
      const messageParts = [
        rpcError?.message,
        rpcError?.details,
        rpcError?.hint,
        rpcError?.code ? `(${String(rpcError.code)})` : null,
      ].filter(Boolean);

      console.error("Error creando reserva (RPC create_inventory_reservation):", {
        code: rpcError?.code ?? null,
        message: rpcError?.message ?? null,
        details: rpcError?.details ?? null,
        hint: rpcError?.hint ?? null,
        error: rpcError,
        payload,
        payloadJson: (() => {
          try {
            return JSON.stringify(payload);
          } catch {
            return '[payload no serializable]';
          }
        })(),
      });

      toast.error(messageParts.join(" ") || "No se pudo registrar la reserva");
    };

    const findAvailableUnitIdForSlot = () => {
      const slotStart = selectedSlot.start;
      const slotEnd = selectedSlot.end;

      const unit = units.find((candidate) => {
        const overlapsExistingReservation = reservations.some((reservation) => {
          return reservation.unit_id === candidate.id && overlaps(reservation, slotStart, slotEnd);
        });

        return !overlapsExistingReservation;
      });

      return unit?.id || null;
    };

    setIsSubmitting(true);
    const campusPayload = {
      p_product_id: item.id,
      p_campus: selectedCampus,
      p_requester_name: requesterName,
      p_requester_code: requesterCode,
      p_start_at: startAtISO,
      p_end_at: endAtISO,
      p_purpose: reservationPurpose,
    };

    const email = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';
    if (!email) {
      setIsSubmitting(false);
      toast.error('No se pudo identificar tu correo para registrar la reserva');
      return;
    }

    // Resolve alumno_id from email
    const { data: alumnoRow, error: alumnoError } = await supabase
      .from('alumnos')
      .select('id')
      .eq('email', email)
      .eq('activo', true)
      .maybeSingle();

    if (alumnoError) {
      setIsSubmitting(false);
      showRpcError(alumnoError, { step: 'lookup_alumno', email });
      return;
    }

    const alumnoIdRaw = alumnoRow?.id ?? null;
    const alumnoId = alumnoIdRaw === null ? null : Number(alumnoIdRaw);
    if (alumnoId === null || !Number.isFinite(alumnoId)) {
      setIsSubmitting(false);
      toast.error('Tu correo no está registrado como alumno. Completa tu registro primero.');
      return;
    }

    // Choose a concrete unit_id for the slot
    const unitId = findAvailableUnitIdForSlot();
    if (!unitId) {
      setIsSubmitting(false);
      toast.error('No hay unidades disponibles para el horario seleccionado');
      return;
    }

    const profilePayload = {
      p_product_id: item.id,
      p_unit_id: unitId,
      p_start_at: startAtISO,
      p_end_at: endAtISO,
      p_user_id: alumnoId,
      p_purpose: reservationPurpose,
    };

    // 1) Try profile-based signature first (current schema with alumnos.user_id).
    let attemptedPayload: Record<string, unknown> = profilePayload;
    let { data, error } = await supabase.rpc('create_inventory_reservation', profilePayload);

    // 2) If deployed DB still has the legacy campus signature, fallback once.
    if (error && isRpcSignatureMismatch(error)) {
      attemptedPayload = campusPayload;
      ({ data, error } = await supabase.rpc('create_inventory_reservation', campusPayload));
    }

    setIsSubmitting(false);

    if (error) {
      showRpcError(error, attemptedPayload);
      return;
    }

    // Data shape depends on which RPC signature ran.
    const row = Array.isArray(data) ? data[0] : data;
    if (row && typeof row.success === 'boolean' && row.success === false) {
      toast.error(String(row.message || 'No se pudo registrar la reserva'));
      return;
    }

    const reservationIdValue = row?.id || row?.reservation_id;
    const reservationId = reservationIdValue ? ` (#${String(reservationIdValue).slice(0, 8)})` : "";
    toast.success(`Reserva registrada${reservationId}`);
    navigate(`/faq`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">Cargando producto...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Equipo no encontrado</h1>
            <Link to="/catalogo">
              <Button variant="outline" className="mt-4">Volver al catálogo</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f7f7]">
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <Link
          to={`/catalogo/${item.id}?campus=${encodeURIComponent(selectedCampus)}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={16} /> Volver al producto
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Reserva</p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-gray-900">{item.name}</h1>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-[#f7f7f7] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Sede</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{selectedCampus}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-[#f7f7f7] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Unidades activas</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{units.length}</p>
              </div>
            </div>

            <div className="mt-8">
              <Label htmlFor="durationHours" className="mb-2 block text-xs uppercase tracking-[0.14em] text-gray-500">
                Cantidad de horas (máx. 4)
              </Label>
              <Select value={String(durationHours)} onValueChange={(value) => setDurationHours(Number(value))}>
                <SelectTrigger id="durationHours" className="w-full sm:w-64 border-gray-300 bg-white shadow-sm">
                  <SelectValue placeholder="Selecciona duración" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((hours) => (
                    <SelectItem key={hours} value={String(hours)}>{hours} hora(s)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-7 rounded-xl border border-gray-200 p-4">
              <div className="mb-4 flex items-center gap-2 text-gray-800">
                <CalendarIcon size={16} className="text-primary" />
                <p className="text-sm font-semibold">Fecha y horario disponibles</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-[280px_1fr]">
                <div>
                  <Label className="mb-2 block text-xs uppercase tracking-[0.14em] text-gray-500">
                    Fecha
                  </Label>
                  <div className="rounded-xl border border-gray-200 bg-white shadow-sm flex justify-center p-2">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) setSelectedDate(date);
                      }}
                      disabled={(date) => {
                        const now = new Date();
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                        
                        // En Javascript, 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
                        const currentDayOfWeek = today.getDay();
                        
                        // REGLA DE NEGOCIO:
                        // "Las reservas para la semana siguiente se habilitan desde el domingo a las 00:00"
                        // Esto significa que de Lunes a Sábado, solo se puede reservar hasta el Domingo *de esta misma semana*.
                        // Cuando llega el Domingo, se habilita hasta el Domingo *de la semana siguiente*.
                        // Por tanto:
                        // - Si hoy es Domingo (0), permitimos reservar hasta el próximo Domingo (+7 días).
                        // - Si hoy es de Lunes a Sábado (1-6), permitimos reservar solo hasta ESTE Domingo (7 - día actual).
                        const totalDaysToAdd = currentDayOfWeek === 0 ? 7 : (7 - currentDayOfWeek);
                        
                        const maxDate = new Date(today);
                        maxDate.setDate(today.getDate() + totalDaysToAdd);
                        maxDate.setHours(23, 59, 59, 999);

                        return date < today || date > maxDate;
                      }}
                      initialFocus
                      className="p-1 pointer-events-auto"
                    />
                  </div>
                </div>

                <div className="flex flex-col">
                  <Label className="mb-2 block text-xs uppercase tracking-[0.14em] text-gray-500">
                    Horario
                  </Label>
                  <div className="mt-1 flex-1 overflow-auto rounded-xl border border-gray-200 bg-[#fafafa] p-3 max-h-[340px]">
                    {loadingAvailability ? (
                      <p className="px-2 py-3 text-sm text-gray-500">Consultando disponibilidad...</p>
                    ) : units.length === 0 ? (
                      <p className="px-2 py-3 text-sm text-red-600">No hay unidades activas para esta sede.</p>
                    ) : availableSlots.length === 0 ? (
                      <p className="px-2 py-3 text-sm text-gray-500">No hay horarios disponibles para la fecha seleccionada.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2">
                        {availableSlots.map((slot) => {
                          const slotISO = slot.start.toISOString();
                          const selected = selectedSlotISO === slotISO;
                          return (
                            <button
                              key={slotISO}
                              type="button"
                              onClick={() => setSelectedSlotISO(slotISO)}
                              className={`rounded-lg border px-3 py-2.5 text-left transition-all ${
                                selected
                                  ? "border-primary bg-[hsl(356_95%_45%/.08)] shadow-sm"
                                  : "border-gray-200 bg-white hover:border-primary/40 shadow-sm"
                              }`}
                            >
                              <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                                <Clock3 size={15} className={selected ? "text-primary" : "text-gray-400"} />
                                {format(slot.start, "HH:mm")} - {format(slot.end, "HH:mm")}
                              </p>
                              <p className={`mt-1 text-xs ${selected ? "text-primary/80 font-medium" : "text-gray-500"}`}>
                                {slot.availableUnits} unidad(es) libre(s)
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Datos para la reserva</h2>
            <p className="mt-1 text-sm text-gray-500">Completa el onboarding antes de confirmar.</p>

            <div className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purpose">Motivo de uso</Label>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger id="purpose" className="border-gray-300">
                    <SelectValue placeholder="Selecciona un motivo" />
                  </SelectTrigger>
                  <SelectContent>
                    {PURPOSE_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-gray-200 bg-[#f7f7f7] px-3 py-3 text-sm text-gray-600">
                <p className="font-medium text-gray-800">Resumen</p>
                <p className="mt-1">
                  {selectedSlot
                    ? `${format(selectedSlot.start, "dd/MM/yyyy HH:mm")} - ${format(selectedSlot.end, "HH:mm")}`
                    : "Selecciona un horario para continuar"}
                </p>
              </div>

              <Button className="w-full text-base font-semibold" size="lg" onClick={handleReserve} disabled={isSubmitting || !selectedSlot || units.length === 0}>
                {isSubmitting ? "Registrando reserva..." : "Confirmar reserva"}
              </Button>

              <p className="text-xs text-gray-500">
                Se mostraron solo horarios con al menos una unidad disponible para la sede seleccionada.
              </p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ReservationOnboarding;
