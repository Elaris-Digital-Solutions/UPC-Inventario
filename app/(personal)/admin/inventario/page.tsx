import Link from "next/link";

import { TablaInventario } from "@/components/admin/tabla-inventario";
import { Button } from "@/components/ui/button";
import { listarInventario } from "@/lib/admin/consultas";
import { Antetitulo, TituloSeccion } from "@/components/antetitulo";

// /admin/inventario, Task 1 de la tanda 3B.
//
// ESTA RUTA CIERRA UN 404 QUE EL PROYECTO ARRASTRABA DESDE LA TANDA 1:
// lib/auth/destino.ts manda al admin aca nada mas canjear su magic link, y
// hasta hoy la ruta no existia. Estaba anotado en components/cabecera-personal.tsx
// y verificado en pantalla el 2026-08-12 con sesion de admin de verdad. No era
// un fallo nuevo: era el hueco que esta tanda tapa.
//
// Server Component, sin "use client": es una lectura y un enlace. La
// interactividad -alta, cambio de estado de unidad, imagenes- llega en las
// Tasks 2, 3 y 5 dentro de sus propios componentes de cliente.
//
// SIN cabecera ni pie propios: app/(personal)/layout.tsx ya los monta y
// app/(personal)/admin/layout.tsx vive dentro de aquel.
export default async function InventarioPage() {
  const filas = await listarInventario();

  // El total de unidades se suma ACA y no en la consulta: los tres conteos por
  // estado ya vienen por fila, y sumarlos es aritmetica, no una lectura mas.
  const totalUnidades = filas.reduce(
    (acc, f) => acc + f.unidadesActive + f.unidadesMaintenance + f.unidadesRetired,
    0,
  );

  return (
    <main className="container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Antetitulo>Administración</Antetitulo>
          <TituloSeccion como="h1">Inventario</TituloSeccion>
          {/* Los dos totales, dichos y no dejados a que alguien cuente filas.
              Con el catalogo real son 34 productos y 92 unidades; con el seed
              local, 4 y 8. Que la cifra este a la vista es lo que delata de un
              vistazo si la pantalla esta hablando con la base equivocada --
              que es exactamente el fallo (b) de la tanda 1, `npm run dev`
              apuntando a produccion por falta de un .env.local. */}
          <p className="text-muted-foreground text-sm">
            {filas.length} productos · {totalUnidades} unidades
          </p>
        </div>

        {/* Enlaza a /admin/inventario/nuevo, que construye la Task 2. Hasta
            ese commit es un 404; ver el comentario del enlace por fila en
            components/admin/tabla-inventario.tsx para el criterio. */}
        <Button asChild>
          <Link href="/admin/inventario/nuevo">Nuevo producto</Link>
        </Button>
      </div>

      <TablaInventario filas={filas} />
    </main>
  );
}
