import Link from "next/link";
import { notFound } from "next/navigation";

import { DialogoAgregarUnidad } from "@/components/admin/dialogo-agregar-unidad";
import { FormularioEditarProducto } from "@/components/admin/formulario-editar-producto";
import { GaleriaAdmin } from "@/components/admin/galeria-admin";
import { PanelUnidades } from "@/components/admin/panel-unidades";
import { SubidaImagenes } from "@/components/admin/subida-imagenes";
import { multiplosDeSlot } from "@/lib/admin/ajustes";
import { leerProducto, leerSlotMinutes, listarCategorias, listarSedes } from "@/lib/admin/consultas";
import { notasPorUnidad } from "@/lib/mostrador/notas";

// /admin/inventario/[id]. El detalle de un
// producto: sus datos editables, sus unidades con estado e historial, y -- a
// partir de la Task 5 -- sus imagenes.
//
// Server Component. Los cuatro dialogos que cuelgan de aca son de cliente.
export default async function DetalleProductoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const producto = await leerProducto(id);

  // `null` cubre los DOS casos que se midieron por separado en /catalogo/[id]
  // y que fallan distinto: un UUID inexistente -- cero filas, HTTP 200 -- y un
  // id MALFORMADO -- `22P02`, HTTP 400 --. leerProducto() los une; aca los dos
  // acaban en el mismo 404, que es lo correcto: en los dos la URL esta mal.
  if (producto === null) {
    notFound();
  }

  // Las tres lecturas restantes en paralelo. `notasPorUnidad()` se reutiliza
  // TAL CUAL de lib/mostrador/notas.ts: pide las notas de varias unidades en
  // UNA consulta con `in.(...)` y las devuelve agrupadas, que es exactamente
  // lo que esta pantalla necesita. No depende de ninguna reserva -- por eso la
  // vive separada de lib/mostrador/consultas.ts --, asi que sirve igual aca.
  const [notas, categorias, sedes, slotMinutes] = await Promise.all([
    notasPorUnidad(producto.unidades.map((u) => u.id)),
    listarCategorias(),
    listarSedes(),
    leerSlotMinutes(),
  ]);

  const buffersPosibles = multiplosDeSlot(slotMinutes, 480);

  return (
    <main className="container py-8">
      <div className="mb-6">
        <Link href="/admin/inventario" className="text-muted-foreground text-sm hover:underline">
          ← Volver al inventario
        </Link>
        <h1 className="font-display mt-2 text-3xl font-bold sm:text-4xl">{producto.nombre}</h1>
      </div>

      <section className="mb-10">
        <h2 className="font-display mb-4 text-lg font-semibold">Datos del producto</h2>
        <FormularioEditarProducto
          producto={producto}
          categorias={categorias}
          buffersPosibles={buffersPosibles}
          slotMinutes={slotMinutes}
        />
      </section>

      <section className="mb-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-display text-lg font-semibold">
            Unidades ({producto.unidades.length})
          </h2>
          <DialogoAgregarUnidad productoId={producto.id} sedes={sedes} />
        </div>

        <PanelUnidades
          productoId={producto.id}
          unidades={producto.unidades}
          notasPorUnidad={notas}
        />
      </section>

      <section>
        <h2 className="font-display mb-4 text-lg font-semibold">
          Imágenes ({producto.imagenes.length})
        </h2>
        <div className="mb-6">
          <SubidaImagenes productoId={producto.id} />
        </div>
        <GaleriaAdmin productoId={producto.id} imagenes={producto.imagenes} />
      </section>
    </main>
  );
}
