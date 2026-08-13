// El catalogo de verdad, tarea 2A.5. REEMPLAZA al marcador de posicion de la
// tanda 1 -aquel decia en su comentario "El catalogo llega en la tanda 2";
// esta es esa tanda-.
//
// A diferencia de la landing (app/(publico)/page.tsx), esta pagina exige
// sesion: vive bajo app/(alumno)/, cuyo layout ya comprobo getClaims() y
// redirigio a quien no tenia sesion, y antes de eso proxy.ts ya rebota
// cualquier ruta que no este en RUTAS_PUBLICAS. Por eso este archivo si puede
// leer `product_availability` -RLS le da SELECT a `authenticated` y se lo
// revoca a `anon` (medido con un 401 anonimo, ver el comentario de
// lib/catalogo/consultas.ts)-, y por eso puede mostrar stock donde la landing
// no podia ni queria.
import Link from "next/link";

import { FiltrosCatalogo } from "@/components/catalogo/filtros";
import { productosConStock, sedesActivas } from "@/lib/catalogo/consultas";
import { EncabezadoSeccion } from "@/components/antetitulo";

// Next.js 16: `searchParams` llega como Promise y hay que esperarla antes de
// leer sus propiedades. Escribirlo como un objeto sincrono -como en
// versiones anteriores de Next- no compila bajo `strict`: el tipo generado
// para esta ruta ya no es ese.
export default async function CatalogoPage({
  searchParams,
}: {
  searchParams: Promise<{ sede?: string }>;
}) {
  const { sede } = await searchParams;
  const sedes = await sedesActivas();

  if (sedes.length === 0) {
    // Sin sedes activas no hay nada que el catalogo pueda enseñar -BR-14 no
    // tiene sede sobre la que aplicarse-. Mensaje sobrio y salida, no una
    // pantalla rota ni una rejilla vacia sin explicacion.
    return (
      <main className="container flex-1 py-12">
        <EncabezadoSeccion
          antetitulo="Inventario UPC"
          titulo="Catálogo"
          como="h1"
        />
        <p className="text-muted-foreground border-border mt-8 rounded-lg border border-dashed py-12 text-center">
          No hay sedes activas en este momento.
        </p>
      </main>
    );
  }

  // Se elige la primera sede activa por defecto, y se dice cual en pantalla
  // (mas abajo, en las pestañas y en el conteo): un catalogo no puede quedar
  // sin sede, porque BR-14 -el filtro de stock- necesita un campusId antes de
  // consultar nada. Un `?sede=` que no casa con ninguna sede real cae tambien
  // a la por defecto en vez de dar 404: una URL vieja, mal copiada o de una
  // sede que se desactivo debe seguir enseñando catalogo, no un error.
  const sedeActiva = sedes.find((s) => s.id === sede) ?? sedes[0];

  const productos = await productosConStock(sedeActiva.id);

  return (
    <main className="container flex-1 py-12">
      {/* Encabezado con antetitulo, el patron del Vite. El titulo suelto en
          rojo no existia en el original: alli el rojo era del heroe y de las
          reglas, y los titulos de pantalla iban en negro con su antetitulo
          encima (MIGRATION_GUIDE/src/pages/Index.tsx:116). Un h1 rojo sin
          contexto encima es lo que hacia que cada pantalla con sesion
          arrancara igual y sin jerarquia. */}
      <EncabezadoSeccion
        antetitulo="Inventario UPC"
        titulo="Catálogo"
        como="h1"
      />

      {/* Pestañas de sede como enlaces y no como un desplegable de cliente:
          el cambio de sede se renderiza en el servidor -esta misma pagina
          vuelve a correr con otro `sede`-, funciona sin JavaScript, y la URL
          resultante es enlazable y compartible tal cual (a diferencia de un
          estado en useState, que se pierde al recargar o al copiar el
          enlace). */}
      <nav className="border-border mt-6 flex gap-6 border-b" aria-label="Sedes">
        {sedes.map((s) => {
          const activa = s.id === sedeActiva.id;
          return (
            <Link
              key={s.id}
              href={`/catalogo?sede=${s.id}`}
              aria-current={activa ? "page" : undefined}
              className={
                activa
                  ? "border-upc-red text-foreground -mb-px border-b-2 pb-3 font-bold"
                  : "text-muted-foreground -mb-px border-b-2 border-transparent pb-3"
              }
            >
              {s.name}
            </Link>
          );
        })}
      </nav>

      {/* "equipos ... en" y nunca "disponibles": `in_stock` dice que la sede
          tiene unidades ACTIVAS de ese producto, no que haya una libre justo
          ahora -eso depende de que nadie la tenga reservada en este momento,
          un dato que esta consulta ni pide-. Prometer "disponible" aqui seria
          exactamente la mentira que D-21 descarta para la vitrina, repetida
          en el catalogo con otro nombre. */}
      <p className="text-muted-foreground mt-4 text-sm">
        {productos.length === 1
          ? `1 equipo en ${sedeActiva.name}`
          : `${productos.length} equipos en ${sedeActiva.name}`}
      </p>

      {productos.length === 0 ? (
        <p className="text-muted-foreground border-border mt-8 rounded-lg border border-dashed py-12 text-center">
          Todavía no hay equipos en esta sede.
        </p>
      ) : (
        <div className="mt-8">
          <FiltrosCatalogo productos={productos} sedeId={sedeActiva.id} />
        </div>
      )}
    </main>
  );
}
