import { useParams, Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockItems } from "@/data/mockItems";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const ItemDetail = () => {
  const { id } = useParams();
  const item = mockItems.find((i) => i.id === id);

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

  const available = item.units.filter((u) => u.available).length;

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
              src={item.imageUrl}
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
                Unidades ({available}/{item.units.length} disponibles)
              </h2>
              <div className="space-y-2">
                {item.units.map((unit) => (
                  <div
                    key={unit.code}
                    className="flex items-center justify-between rounded-lg border border-border px-4 py-2.5"
                  >
                    <span className="font-mono text-sm font-medium text-foreground">{unit.code}</span>
                    {unit.available ? (
                      <span className="flex items-center gap-1.5 text-sm" style={{ color: "hsl(142 71% 35%)" }}>
                        <CheckCircle2 size={16} /> Disponible
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-destructive">
                        <XCircle size={16} /> Reservado
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Button
              size="lg"
              className="mt-6 w-full text-base font-semibold"
              disabled={available === 0}
              onClick={() => toast.info("Función de reserva disponible próximamente")}
            >
              {available > 0 ? "Reservar unidad disponible" : "Sin unidades disponibles"}
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ItemDetail;
