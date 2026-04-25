import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Package } from "lucide-react";
import { useProducts } from "@/features/products/context/ProductContext";
import { useCampusStock } from "@/features/catalog/hooks/useCampusStock";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type Campus, CAMPUS_OPTIONS } from "@/shared/types/campus";


const Catalog = () => {
  const { products, loading } = useProducts();
  const { campusStock: campusStockByProduct } = useCampusStock();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [selectedCampus, setSelectedCampus] = useState<Campus>("Monterrico");

  const allCategories = useMemo(
    () => ["Todos", ...Array.from(new Set(products.map((product) => (product.category || "").trim()).filter(Boolean)))],
    [products]
  );

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const matchSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        (product.description || "").toLowerCase().includes(search.toLowerCase());
      const normalizedCategory = (product.category || "").trim();
      const matchCategory = activeCategory === "Todos" || normalizedCategory === activeCategory;
      const campusStock = campusStockByProduct[product.id]?.[selectedCampus] || 0;
      return matchSearch && matchCategory && campusStock > 0;
    });
  }, [products, search, activeCategory, selectedCampus, campusStockByProduct]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Catálogo de Equipos</h1>
          <p className="mt-1 text-muted-foreground">Explora y reserva los equipos disponibles</p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <div className="relative h-10 w-[220px] shrink-0">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar equipo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 pl-10"
            />
          </div>
          <div className="w-[190px]">
            <Select value={selectedCampus} onValueChange={(value) => setSelectedCampus(value as Campus)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecciona sede" />
              </SelectTrigger>
              <SelectContent>
                {CAMPUS_OPTIONS.map((campus) => (
                  <SelectItem key={campus} value={campus}>{campus}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {allCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Package size={48} className="mb-4 opacity-40" />
            <p>Cargando productos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Package size={48} className="mb-4 opacity-40" />
            <p>No se encontraron productos</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => {
              const available = campusStockByProduct[item.id]?.[selectedCampus] || 0;
              return (
                <Link
                  key={item.id}
                  to={`/catalogo/${item.id}?campus=${encodeURIComponent(selectedCampus)}`}
                  className="group overflow-hidden rounded-2xl border border-border bg-card transition-all hover:shadow-[var(--shadow-card-hover)]"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img
                      src={item.mainImage}
                      alt={item.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-5">
                    <Badge variant="secondary" className="mb-2 text-xs">
                      {item.category}
                    </Badge>
                    <h3 className="text-lg font-semibold text-card-foreground">{item.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        Stock: {available}
                      </span>
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${
                          available > 0 ? "bg-green-500" : "bg-destructive"
                        }`}
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Catalog;
