"use client";

// Filtros del catalogo: busqueda por texto y chips de categoria.
//
// Este componente NO decide permisos. Buscar y filtrar por categoria son
// comodidad de navegacion sobre datos que el SERVIDOR ya acoto a una sede
// -app/(alumno)/catalogo/page.tsx llama a productosConStock(sedeActiva.id)
// antes de que este componente exista-. La frontera de verdad esta en la
// sede, y esa va en la consulta del servidor (BR-14, ver el comentario en
// lib/catalogo/consultas.ts): filtrar la sede AQUI, en el cliente, habria
// significado mandarle a cada alumno el inventario de las dos sedes y
// esconder la mitad con CSS. La busqueda si puede vivir aqui sin ese coste,
// porque el universo sobre el que busca ya llego recortado por el servidor.
//
// TarjetaProducto no lleva "use client" en su propio archivo -es un
// componente de servidor por defecto- pero al importarse desde este archivo
// entra en el bundle de cliente igualmente, porque todo lo que un Client
// Component importa se empaqueta con el. Es valido: TarjetaProducto solo usa
// Image, Link, Card y Badge, ninguno exclusivo de servidor. Asi que el MISMO
// componente es de servidor cuando lo usa la landing (app/(publico)/page.tsx)
// y de cliente cuando lo usa este archivo, sin que su propio codigo cambie.
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TarjetaProducto } from "@/components/catalogo/tarjeta-producto";
import type { ProductoVitrina } from "@/lib/catalogo/consultas";

type FiltrosCatalogoProps = {
  productos: ProductoVitrina[];
};

// Los nombres reales en la base van SIN tilde -"Camara Sony A7 III",
// "Microfono Rode NTG4", "Tripode Manfrotto MT055"- pero un alumno escribe
// como se le ocurre, y lo natural es escribir "cámara" con tilde. Sin
// normalizar, la busqueda mas obvia no encuentra nada, aunque el termino este
// literalmente en el nombre. Se normalizan los DOS lados -el texto guardado y
// lo que escribe el alumno- para que la comparacion sea justa en ambos.
const normalizar = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function FiltrosCatalogo({ productos }: FiltrosCatalogoProps) {
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);

  // No hay tabla de categorias: salen de `products.category` de lo que ya
  // llego en `productos`. Por eso la lista de chips es EXACTAMENTE la de lo
  // que existe en esta sede -nunca una categoria de la otra sede, ni una que
  // hoy no tendria ningun producto que mostrar-.
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
        // Cero resultados tras filtrar es distinto de cero productos en la
        // sede -eso ya lo cubre app/(alumno)/catalogo/page.tsx antes de
        // montar este componente-. Mismo estilo sobrio que usa la landing
        // para su vacio, para que el proyecto tenga una unica forma de decir
        // "no hay nada que mostrar".
        <p className="text-muted-foreground border-border mt-8 rounded-lg border border-dashed py-12 text-center">
          Ningún equipo coincide con tu búsqueda.
        </p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {filtrados.map((p) => (
            <TarjetaProducto key={p.id} producto={p} href={`/catalogo/${p.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}
