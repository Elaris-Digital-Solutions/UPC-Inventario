import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, MapPin } from "lucide-react";
import { useProducts } from "@/context/ProductContext";
import { supabase } from "@/supabaseClient";
import { InventoryUnit } from "@/types/Inventory";

type Campus = "Monterrico" | "San Miguel";

const getCampusFromParam = (value: string | null): Campus =>
  value === "San Miguel" ? "San Miguel" : "Monterrico";

const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { products, loading } = useProducts();
  const item = products.find((product) => product.id === id);

  const [units, setUnits] = useState<InventoryUnit[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [selectedCampus] = useState<Campus>(() => getCampusFromParam(searchParams.get("campus")));
  const [activeImage, setActiveImage] = useState<string | null>(null);

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

  useEffect(() => {
    if (!item) return;
    setActiveImage(item.mainImage);
  }, [item]);

  const imageGallery = useMemo(() => {
    if (!item) return [];
    const allImages = [item.mainImage, ...(item.additionalImages || [])].filter(Boolean);
    return Array.from(new Set(allImages));
  }, [item]);

  const campusAvailableCount = useMemo(() => {
    const base = { Monterrico: 0, "San Miguel": 0 } as Record<Campus, number>;
    units.forEach((unit) => {
      if (unit.status !== "active") return;
      const campus = (unit.campus || "Monterrico") as Campus;
      base[campus] += 1;
    });
    return base;
  }, [units]);

  const selectedCampusHasUnits = campusAvailableCount[selectedCampus] > 0;

  const handleContinueReservation = () => {
    if (!item || !selectedCampusHasUnits) return;
    navigate(`/catalogo/${item.id}/reservar?campus=${encodeURIComponent(selectedCampus)}`);
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
        <Link to="/catalogo" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft size={16} /> Volver al catálogo
        </Link>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
            <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-white p-4">
              <img
                src={activeImage || item.mainImage}
                alt={item.name}
                className="max-h-full max-w-full object-contain mix-blend-multiply"
              />
            </div>

            {imageGallery.length > 1 && (
              <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {imageGallery.map((imageUrl, index) => {
                  const selected = (activeImage || item.mainImage) === imageUrl;
                  return (
                    <button
                      key={`${imageUrl}-${index}`}
                      type="button"
                      onClick={() => setActiveImage(imageUrl)}
                      className={`overflow-hidden rounded-lg border bg-[#f3f3f3] transition-all ${
                        selected ? "border-primary ring-2 ring-primary/25" : "border-gray-200 hover:border-gray-300"
                      }`}
                      aria-label={`Ver imagen ${index + 1}`}
                    >
                      <div className="aspect-square w-full">
                        <img src={imageUrl} alt={`${item.name} ${index + 1}`} className="h-full w-full object-cover p-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <Badge variant="secondary" className="mb-3">{item.category}</Badge>
            <h1 className="font-display text-4xl font-bold leading-tight text-gray-900">{item.name}</h1>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              {/* Ocultamos mágicamente la parte de "Lab:" y "Obs:" que vienen pegadas a la descripcion */}
              {item.description.split("Lab:")[0].trim()}
            </p>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={15} className="text-gray-400" />
                  <span>Sede:</span>
                  <span className="font-semibold text-gray-900">{selectedCampus}</span>
                </div>
                {loadingUnits ? (
                  <span className="text-xs text-gray-400">Cargando...</span>
                ) : selectedCampusHasUnits ? (
                  <span className="flex items-center gap-1 text-xs" style={{ color: "hsl(142 71% 35%)" }}>
                    <CheckCircle2 size={13} /> {campusAvailableCount[selectedCampus]} unidad(es) disponibles
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <XCircle size={13} /> Sin unidades activas
                  </span>
                )}
              </div>
            </div>

            <Button
              size="lg"
              className="mt-6 w-full text-base font-semibold"
              onClick={handleContinueReservation}
              disabled={!selectedCampusHasUnits || loadingUnits}
            >
              Reservar unidad
              <ArrowRight size={18} />
            </Button>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ItemDetail;
