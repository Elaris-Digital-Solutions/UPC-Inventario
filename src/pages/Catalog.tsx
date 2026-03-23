import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { useProducts } from "@/context/ProductContext";
import { supabase } from "@/supabaseClient";
import CatalogHeader from "@/components/catalog/CatalogHeader";
import { Campus } from "@/components/catalog/CampusDropdown";

const CAMPUS_OPTIONS: Campus[] = ["Monterrico", "San Miguel"];

type CampusStockByProduct = Record<string, Record<Campus, number>>;

const Catalog = () => {
  const { products, loading } = useProducts();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [selectedCampus, setSelectedCampus] = useState<Campus>("Monterrico");
  const [campusStockByProduct, setCampusStockByProduct] = useState<CampusStockByProduct>({});

  useEffect(() => {
    const loadCampusStock = async () => {
      const { data, error } = await supabase
        .from("inventory_units")
        .select("product_id, campus")
        .eq("status", "active");

      if (error) {
        console.error(error);
        setCampusStockByProduct({});
        return;
      }

      const stockMap: CampusStockByProduct = {};
      (data || []).forEach((unit: any) => {
        const productId = String(unit.product_id || "");
        if (!productId) return;

        const campus = (unit.campus === "San Miguel" ? "San Miguel" : "Monterrico") as Campus;

        if (!stockMap[productId]) {
          stockMap[productId] = { Monterrico: 0, "San Miguel": 0 };
        }

        stockMap[productId][campus] += 1;
      });

      setCampusStockByProduct(stockMap);
    };

    loadCampusStock();
  }, []);

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
        <CatalogHeader
          title="Catálogo de Dispositivos"
          subtitle="Explora y reserva los dispositivos disponibles"
          search={search}
          onSearchChange={setSearch}
          selectedCampus={selectedCampus}
          onCampusChange={setSelectedCampus}
          campusOptions={CAMPUS_OPTIONS}
          categories={allCategories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

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
                        className={`inline-block h-2.5 w-2.5 rounded-full ${available > 0 ? "bg-green-500" : "bg-destructive"
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
