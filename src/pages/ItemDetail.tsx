import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/context/ProductContext";
import { supabase } from "@/supabaseClient";
import { InventoryUnit } from "@/types/Inventory";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Campus = "Monterrico" | "San Miguel";

const CAMPUS_OPTIONS: Campus[] = ["Monterrico", "San Miguel"];

const getCampusFromParam = (value: string | null): Campus =>
  value === "San Miguel" ? "San Miguel" : "Monterrico";

const ItemDetail = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, loading } = useProducts();
  const item = products.find((product) => product.id === id);
  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requesterName, setRequesterName] = useState("");
  const [requesterCode, setRequesterCode] = useState("");
  const [purpose, setPurpose] = useState("");
  const [startAt, setStartAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [selectedCampus, setSelectedCampus] = useState<Campus>(() => getCampusFromParam(searchParams.get("campus")));

  useEffect(() => {
    setSelectedCampus(getCampusFromParam(searchParams.get("campus")));
  }, [searchParams]);

  const handleCampusChange = (campus: Campus) => {
    setSelectedCampus(campus);
    const next = new URLSearchParams(searchParams);
    next.set("campus", campus);
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (!id) return;
    const loadUnits = async () => {
      setLoadingUnits(true);
      const { data, error } = await supabase
        .from("inventory_units")
        .select("*")
        .eq("product_id", id)
        .order("unit_code", { ascending: true });

      if (error) {
        console.error(error);
        setUnits([]);
      } else {
        setUnits((data || []) as InventoryUnit[]);
      }
      setLoadingUnits(false);
    };
    loadUnits();
  }, [id]);

  const activeUnits = useMemo(
    () =>
      units.filter(
        (unit) => (unit.campus || "Monterrico") === selectedCampus && unit.status === "active"
      ),
    [units, selectedCampus]
  );

  const visibleUnits = useMemo(
    () => units.filter((unit) => (unit.campus || "Monterrico") === selectedCampus),
    [units, selectedCampus]
  );

  const available = activeUnits.length;

  const handleReserve = async () => {
    if (!item) return;
    if (!requesterName.trim()) {
      toast.error("Ingresa tu nombre");
      return;
    }
    if (!startAt) {
      toast.error("Selecciona fecha y hora de inicio");
      return;
    }

    const start = new Date(startAt);
    if (Number.isNaN(start.getTime())) {
      toast.error("Fecha/hora inválida");
      return;
    }

    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    setIsSubmitting(true);

    const { data, error } = await supabase.rpc("create_inventory_reservation", {
      p_product_id: item.id,
      p_campus: selectedCampus,
      p_requester_name: requesterName.trim(),
      p_requester_code: requesterCode.trim() || null,
      p_start_at: start.toISOString(),
      p_end_at: end.toISOString(),
      p_purpose: purpose.trim() || null,
    });

    setIsSubmitting(false);

    if (error) {
      toast.error(error.message || "No se pudo crear la reserva");
      return;
    }

    const reservationId = data?.id ? ` (#${data.id.slice(0, 8)})` : "";
    toast.success(`Reserva registrada${reservationId}`);
    setPurpose("");
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
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <Link to="/catalogo" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Volver al catálogo
        </Link>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Image */}
          <div className="overflow-hidden rounded-2xl border border-border bg-muted">
            <img
              src={item.mainImage}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Info */}
          <div>
            <Badge variant="secondary" className="mb-3">{item.category}</Badge>
            <h1 className="text-3xl font-bold text-foreground">{item.name}</h1>
            <p className="mt-3 text-muted-foreground">{item.description}</p>

            <div className="mt-6 rounded-xl border border-border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold text-card-foreground">
                Disponibilidad
              </h2>
              <div className="mb-3">
                <Label>Sede</Label>
                <Select value={selectedCampus} onValueChange={(value) => handleCampusChange(value as Campus)}>
                  <SelectTrigger className="mt-1 h-10 w-full">
                    <SelectValue placeholder="Selecciona sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPUS_OPTIONS.map((campus) => (
                      <SelectItem key={campus} value={campus}>{campus}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5">
                  <span className="text-sm font-medium text-foreground">Unidades activas ({selectedCampus})</span>
                  {available > 0 ? (
                    <span className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(142 71% 35%)" }}>
                      <CheckCircle2 size={16} /> {available} disponible(s)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm text-destructive">
                      <XCircle size={16} /> Sin stock
                    </span>
                  )}
                </div>

                {loadingUnits ? (
                  <div
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5"
                  >
                    <span className="text-sm text-muted-foreground">Cargando unidades...</span>
                  </div>
                ) : (
                  visibleUnits.slice(0, 8).map((unit) => (
                    <div
                      key={unit.id}
                      className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5"
                    >
                      <span className="font-mono text-sm font-medium text-foreground">{unit.unit_code}</span>
                      {unit.status === "active" ? (
                        <span className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(142 71% 35%)" }}>
                          <CheckCircle2 size={16} /> Activo
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-sm text-destructive">
                          <XCircle size={16} /> {unit.status}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-semibold text-card-foreground">Reservar equipo (máximo 2 horas)</h2>

              <div className="space-y-2">
                <Label htmlFor="requesterName">Nombre completo</Label>
                <Input
                  id="requesterName"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requesterCode">Código UPC / DNI (opcional)</Label>
                <Input
                  id="requesterCode"
                  value={requesterCode}
                  onChange={(e) => setRequesterCode(e.target.value)}
                  placeholder="Ej. U202312345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">Motivo de uso (opcional)</Label>
                <Input
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Ej. Proyecto de realidad virtual"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startAt">Inicio</Label>
                  <Input
                    id="startAt"
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duración</Label>
                  <select
                    id="duration"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value={30}>30 min</option>
                    <option value={60}>1 hora</option>
                    <option value={90}>1 h 30 min</option>
                    <option value={120}>2 horas</option>
                  </select>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="mt-6 w-full text-base font-semibold"
              disabled={available === 0 || isSubmitting}
              onClick={handleReserve}
            >
              {available > 0 ? (isSubmitting ? "Reservando..." : "Reservar unidad disponible") : "Sin unidades disponibles"}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ItemDetail;
