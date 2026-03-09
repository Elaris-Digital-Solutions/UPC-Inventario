import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { addDays, addMinutes, format, startOfDay } from "date-fns";
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

const FACULTY_OPTIONS = [
  "Ingeniería",
  "Negocios",
  "Comunicaciones",
  "Arquitectura",
  "Derecho",
  "Salud",
  "Educación",
  "Otra",
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
  return reservationStart < slotEnd && reservationEnd > slotStart;
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
  const [faculty, setFaculty] = useState("");
  const [career, setCareer] = useState("");
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
        .in("status", ["reserved", "completed"])
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

    for (let minuteOfDay = OPEN_HOUR * 60; minuteOfDay <= CLOSE_HOUR * 60 - durationMinutes; minuteOfDay += SLOT_STEP_MINUTES) {
      const slotStart = new Date(selectedDate);
      slotStart.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);

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
    if (!faculty) {
      toast.error("Selecciona tu facultad");
      return;
    }
    if (!career.trim()) {
      toast.error("Ingresa tu carrera");
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

    const reservationPurpose = [
      `Facultad: ${faculty}`,
      `Carrera: ${career.trim()}`,
      purpose.trim() ? `Motivo: ${purpose.trim()}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    setIsSubmitting(true);
    const { data, error } = await supabase.rpc("create_inventory_reservation", {
      p_product_id: item.id,
      p_campus: selectedCampus,
      p_requester_name: requesterName,
      p_requester_code: requesterCode,
      p_start_at: selectedSlot.start.toISOString(),
      p_end_at: selectedSlot.end.toISOString(),
      p_purpose: reservationPurpose,
    });
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message || "No se pudo registrar la reserva");
      return;
    }

    const reservationId = data?.id ? ` (#${String(data.id).slice(0, 8)})` : "";
    toast.success(`Reserva registrada${reservationId}`);
    navigate(`/catalogo/${item.id}?campus=${encodeURIComponent(selectedCampus)}`);
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

        <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500">Reserva</p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-gray-900">{item.name}</h1>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-gray-200 bg-[#f7f7f7] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Sede</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{selectedCampus}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-[#f7f7f7] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Duración</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{durationHours} hora(s)</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-[#f7f7f7] px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">Unidades activas</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{units.length}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-gray-200 p-4">
              <div className="mb-4 flex items-center gap-2 text-gray-800">
                <CalendarIcon size={16} className="text-primary" />
                <p className="text-sm font-semibold">Fecha y horario disponibles</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
                <div>
                  <Label className="text-xs uppercase tracking-[0.14em] text-gray-500">Fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn("mt-1 w-full justify-start border-gray-300 text-left font-normal", !selectedDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Selecciona fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={{ before: startOfDay(new Date()) }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-[0.14em] text-gray-500">Horario</Label>
                  <div className="mt-1 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-[#fafafa] p-2">
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
                              className={`rounded-md border px-3 py-2 text-left transition-colors ${
                                selected
                                  ? "border-primary bg-[hsl(356_95%_45%/.08)]"
                                  : "border-gray-200 bg-white hover:border-primary/40"
                              }`}
                            >
                              <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                                <Clock3 size={14} className="text-primary" />
                                {format(slot.start, "HH:mm")} - {format(slot.end, "HH:mm")}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">{slot.availableUnits} unidad(es) libre(s)</p>
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
                <Label htmlFor="faculty">Facultad</Label>
                <Select value={faculty} onValueChange={setFaculty}>
                  <SelectTrigger id="faculty" className="border-gray-300">
                    <SelectValue placeholder="Selecciona tu facultad" />
                  </SelectTrigger>
                  <SelectContent>
                    {FACULTY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>{option}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="career">Carrera</Label>
                <Input
                  id="career"
                  value={career}
                  onChange={(e) => setCareer(e.target.value)}
                  placeholder="Ej. Ingeniería de Software"
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Motivo de uso (opcional)</Label>
                <Input
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Ej. Proyecto de laboratorio"
                  className="border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="durationHours">Cantidad de horas (máx. 4)</Label>
                <Select value={String(durationHours)} onValueChange={(value) => setDurationHours(Number(value))}>
                  <SelectTrigger id="durationHours" className="border-gray-300">
                    <SelectValue placeholder="Selecciona duración" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((hours) => (
                      <SelectItem key={hours} value={String(hours)}>{hours} hora(s)</SelectItem>
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
