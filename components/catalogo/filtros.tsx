"use client";

// Filtros del catalogo: busqueda por texto y chips de categoria.
//
// ESTE COMPONENTE NO DECIDE PERMISOS. Buscar y filtrar por categoria es comodidad
// sobre datos que el SERVIDOR ya acoto a una sede. La frontera de verdad es la
// sede y va en la consulta (BR-14): filtrarla aqui habria significado mandarle a
// cada alumno el inventario de las dos y esconder la mitad con CSS.
//
// TarjetaProducto no lleva "use client" pero entra en el bundle de cliente al
// importarse desde aqui, y es valido: solo usa Image, Link, Card y Badge. El
// MISMO componente es de servidor en la landing y de cliente aqui.
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TarjetaProducto } from "@/components/catalogo/tarjeta-producto";
import type { ProductoVitrina } from "@/lib/catalogo/consultas";

type FiltrosCatalogoProps = {
  productos: ProductoVitrina[];
  // La sede que el servidor ya aplico. Viaja hasta el `href` de cada tarjeta para
  // que el detalle -y desde el, la reserva- no tengan que adivinarla: una reserva
  // es contra la unidad de UNA sede, asi que la cadena tiene que conservarla.
  sedeId: string;
};

// Los nombres en la base van SIN tilde y el alumno escribe "cámara" con ella, asi
// que sin normalizar la busqueda mas obvia no encuentra nada. Se normalizan los
// DOS lados para que la comparacion sea justa en ambos.
const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function FiltrosCatalogo({ productos, sedeId }: FiltrosCatalogoProps) {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);

  // No hay tabla de categorias: salen de lo que ya llego. Por eso los chips son
  // exactamente los de esta sede, sin ninguno que no tendria nada que mostrar.
  const categorias = useMemo(() => {
    const vistas = new Set<string>();
    for (const producto of productos) {
      if (producto.category !== null) {
        vistas.add(producto.category);
      }
    }
    return [...vistas].sort((a, b) => a.localeCompare(b));
  }, [productos]);

  const filtrados = useMemo(() => {
    const termino = normalizar(busqueda.trim());

    return productos.filter((producto) => {
      if (categoria !== null && producto.category !== categoria) {
        return false;
      }

      if (termino === "") {
        return true;
      }

      const nombre = normalizar(producto.name);
      const descripcion = producto.description === null ? "" : normalizar(producto.description);
      return nombre.includes(termino) || descripcion.includes(termino);
    });
  }, [productos, busqueda, categoria]);

  return (
    <div>
      <Input
        type="search"
        value={busqueda}
        onChange={(evento) => setBusqueda(evento.target.value)}
        placeholder="Buscar por nombre o descripción"
        aria-label="Buscar por nombre o descripción"
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant={categoria === null ? "default" : "outline"}
          size="sm"
          onClick={() => setCategoria(null)}
        >
          Todas
        </Button>
        {categorias.map((c) => (
          <Button
            key={c}
            type="button"
            variant={categoria === c ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoria(c)}
          >
            {c}
          </Button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        // Cero tras filtrar es distinto de cero productos en la sede, que ya cubre
        // la pagina antes de montar esto.
        <p className="text-muted-foreground border-border mt-8 rounded-lg border border-dashed py-12 text-center">
          Ningún equipo coincide con tu búsqueda.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {filtrados.map((p) => (
            <TarjetaProducto key={p.id} producto={p} href={`/catalogo/${p.id}?sede=${sedeId}`} />
          ))}
        </div>
      )}
    </div>
  );
}
