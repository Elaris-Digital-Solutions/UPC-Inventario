import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ArrowRight, Glasses, Tablet, Camera, Headphones, Smartphone, Video, Monitor, Mouse } from "lucide-react";
import { useProducts } from "@/context/ProductContext";
import { useAuth } from "@/context/AuthContext";

const features = [
  {
    step: "Paso 01",
    title: "Reserva en línea",
    description: "Realiza tu solicitud desde tu cuenta institucional de forma rápida y segura.",
    cta: "Iniciar reserva",
    ctaHref: "/catalogo",
    image: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
  },
  {
    step: "Paso 02",
    title: "Recoge el equipo",
    description: "Acércate en el horario seleccionado y utiliza el equipo con responsabilidad.",
    cta: "Ver catálogo",
    ctaHref: "/catalogo",
    image: "https://images.unsplash.com/photo-1562774053-701939374585?w=800&q=80",
  },
  {
    step: "Paso 03",
    title: "Devuélvelo a tiempo",
    description: "Entrega el dispositivo dentro del plazo establecido para evitar penalidades.",
    cta: "Ver disponibilidad",
    ctaHref: "/catalogo",
    image: "https://images.unsplash.com/photo-1553877522-43269d4ea984?w=800&q=80",
  },
];

const Index = () => {
  const { products } = useProducts();
  const { isAuthenticated } = useAuth();

  const CATEGORY_ORDER = ["VR", "Tablets", "Cámaras", "Audio", "Celulares", "Proyectores", "Monitores/TV", "Periféricos"];

  const CATEGORY_ICONS: Record<string, React.ElementType> = {
    "VR": Glasses,
    "Tablets": Tablet,
    "Cámaras": Camera,
    "Audio": Headphones,
    "Celulares": Smartphone,
    "Proyectores": Video,
    "Monitores/TV": Monitor,
    "Periféricos": Mouse,
  };

  const CATEGORY_DISPLAY: Record<string, string> = {
    "Monitores/TV": "Monitores",
  };

  const categories = useMemo(() => {
    const categoryCount = new Map<string, number>();
    products.forEach((product) => {
      const category = (product.category || "").trim();
      if (!category) return;
      categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
    });
    return CATEGORY_ORDER
      .filter((label) => categoryCount.has(label))
      .map((label) => ({ label, count: categoryCount.get(label)! }));
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
            <Link to={isAuthenticated ? "/catalogo" : "/login"}>
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
      <section className="border-t border-gray-200 bg-white px-4 py-28">
        <div className="mx-auto max-w-7xl">

          {/* Section header */}
          <div className="mb-16">
            <p className="border-l-2 border-primary pl-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-gray-500">
              Sistema de Reservas
            </p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
              ¿Cómo Funciona?
            </h2>
          </div>

          {/* Feature cards */}
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((f) => (
              <Link
                key={f.title}
                to={isAuthenticated ? f.ctaHref : "/login"}
                className="group flex flex-col border border-transparent outline-none transition-colors duration-300 hover:border-primary focus-visible:border-primary"
              >
                {/* Image */}
                <div className="overflow-hidden">
                  <img
                    src={f.image}
                    alt={f.title}
                    className="aspect-[4/3] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.025]"
                    loading="lazy"
                  />
                </div>

                {/* Info block — grows to fill remaining height */}
                <div className="flex flex-1 flex-col bg-[#f2f2f2] px-7 py-8">
                  <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-gray-400">
                    {f.step}
                  </p>
                  <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.30em] text-gray-700 transition-colors duration-300 group-hover:text-gray-900">
                    {f.title}
                  </p>
                  <div className="mt-3 h-px w-8 bg-primary transition-[width] duration-500 ease-out group-hover:w-12" />
                  <p className="mt-4 flex-1 text-sm leading-[1.85] text-gray-500">
                    {f.description}
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-primary">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">
                      {f.cta}
                    </span>
                    <ArrowRight
                      size={13}
                      strokeWidth={2.5}
                      className="transition-transform duration-300 ease-out group-hover:translate-x-1"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* Categories */}
      <section className="border-t border-gray-200 bg-[#f7f7f7] px-4 py-28">
        <div className="mx-auto max-w-7xl">

          {/* Section header */}
          <div className="mb-20 max-w-2xl">
            <p className="border-l-2 border-primary pl-3 text-[10px] font-semibold uppercase tracking-[0.35em] text-gray-500">
              Inventario UPC
            </p>
            <h2 className="mt-4 font-display text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
              Categorías Disponibles
            </h2>
            <div className="mt-8 h-px w-full bg-gray-200" />
          </div>

          {categories.length === 0 ? (
            <p className="text-sm text-gray-400">Aún no hay categorías disponibles.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-12 gap-y-0 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((cat) => {
                const Icon = CATEGORY_ICONS[cat.label] ?? Monitor;
                const displayLabel = CATEGORY_DISPLAY[cat.label] ?? cat.label;
                return (
                  <Link
                    key={cat.label}
                    to={isAuthenticated ? "/catalogo" : "/login"}
                    className="group border-t border-gray-300 pb-12 pt-7 transition-colors duration-200 hover:bg-white"
                  >
                    {/* Category name + icon inline */}
                    <div className="flex items-center gap-3">
                      <p className="font-display text-2xl font-bold leading-tight text-gray-900 transition-colors duration-300 group-hover:text-gray-700">
                        {displayLabel}
                      </p>
                      <Icon
                        size={18}
                        strokeWidth={1.5}
                        className="text-gray-400 transition-colors duration-200 group-hover:text-gray-600"
                      />
                    </div>

                    {/* Count — secondary, improved contrast */}
                    <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.22em] text-gray-600">
                      {cat.count} {cat.count === 1 ? "equipo" : "equipos"}
                    </p>

                    {/* Red accent + arrow hint */}
                    <div className="mt-5 flex items-center gap-3">
                      <div className="h-px w-8 bg-primary transition-[width] duration-500 ease-out group-hover:w-14" />
                      <ArrowRight
                        size={11}
                        strokeWidth={2}
                        className="text-primary opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:opacity-100"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
