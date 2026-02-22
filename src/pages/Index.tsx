import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowRight, ShieldCheck, Clock, Users, Package } from "lucide-react";
import { useProducts } from "@/context/ProductContext";

const features = [
  {
    icon: ShieldCheck,
    title: "Solo para UPC",
    description: "Acceso exclusivo con tu correo @upc.edu.pe institucional.",
  },
  {
    icon: Clock,
    title: "Reserva rápida",
    description: "Selecciona el equipo, elige fecha y hora. Listo.",
  },
  {
    icon: Users,
    title: "Control de inventario",
    description: "Conoce la disponibilidad real de cada equipo en tiempo real.",
  },
];

const Index = () => {
  const { products } = useProducts();

  const categories = useMemo(() => {
    const categoryCount = new Map<string, number>();
    products.forEach((product) => {
      const category = (product.category || "").trim();
      if (!category) return;
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    });
    return Array.from(categoryCount.entries()).map(([label, count]) => ({ label, count }));
  }, [products]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      {/* Hero */}
      <section className="relative flex min-h-[calc(100svh-4rem)] items-center overflow-hidden bg-gradient-hero px-4 py-24 sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(354_72%_50%/0.3),transparent_70%)]" />
        <div className="relative mx-auto max-w-7xl text-center">
          <span className="mb-4 inline-block rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-1.5 text-xs font-medium tracking-wide text-primary-foreground">
            Universidad Peruana de Ciencias Aplicadas
          </span>
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold leading-tight text-primary-foreground sm:text-5xl lg:text-6xl">
            Reserva equipos y herramientas de la UPC
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-primary-foreground/75">
            Accede al inventario de equipos tecnológicos, herramientas y materiales de la universidad. Reserva fácil, rápido y seguro.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/catalogo">
              <Button size="lg" variant="secondary" className="gap-2 text-base font-semibold shadow-lg">
                Ver catálogo <ArrowRight size={18} />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground text-base">
                Iniciar sesión
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
            ¿Cómo funciona?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
            Tres pasos simples para reservar lo que necesitas.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={i}
                className="group rounded-2xl border border-border bg-card p-8 transition-shadow hover:shadow-[var(--shadow-card-hover)]"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <f.icon size={24} />
                </div>
                <h3 className="text-lg font-semibold text-card-foreground">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Preview */}
      <section className="border-t border-border bg-secondary/50 px-4 py-20">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-center text-3xl font-bold text-foreground">
            Categorías disponibles
          </h2>
          {categories.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Aún no hay categorías disponibles.
            </p>
          ) : (
            <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {categories.map((cat) => (
                <Link
                  key={cat.label}
                  to="/catalogo"
                  className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Package size={26} />
                  </div>
                  <span className="text-sm font-semibold text-card-foreground">{cat.label}</span>
                  <span className="text-xs text-muted-foreground">{cat.count} productos</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
