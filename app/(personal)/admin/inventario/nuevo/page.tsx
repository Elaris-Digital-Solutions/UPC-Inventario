import Link from "next/link";

import { FormularioProducto } from "@/components/admin/formulario-producto";
import { listarCategorias, listarSedes, leerSlotMinutes } from "@/lib/admin/consultas";
import { multiplosDeSlot } from "@/lib/admin/ajustes";

// /admin/inventario/nuevo, Task 2 de la tanda 3B. F7: alta de producto con sus
// unidades en un solo formulario.
//
// ES UNA SUBRUTA DE INVENTARIO Y NO UNA PESTAÑA (D-43). El diseño dice que
// "/admin/unidades se absorbe en /admin/inventario", y eso se respeta -- no hay
// ruta de unidades de primer nivel --, pero el alta necesita su propia URL por
// el mismo argumento que el diseño usa para eliminar las pestañas: una pestaña
// que no es una URL no se puede enlazar, ni marcar, ni proteger por separado.
//
// Server Component: las tres lecturas son del servidor, y el formulario que
// monta es el Client Component.
export default async function NuevoProductoPage() {
  // Las tres en paralelo: son independientes entre si y en serie sumarian tres
  // viajes a la base para pintar una pantalla.
  const [categorias, sedes, slotMinutes] = await Promise.all([
    listarCategorias(),
    listarSedes(),
    leerSlotMinutes(),
  ]);

  // Q-14, primera mitad. El tope es 480, que es el `check` de
  // `buffer_minutes`, no un numero elegido aca.
  const buffersPosibles = multiplosDeSlot(slotMinutes, 480);

  return (
    <main className="container py-8">
      <div className="mb-6">
        <Link href="/admin/inventario" className="text-muted-foreground text-sm hover:underline">
          ← Volver al inventario
        </Link>
        <h1 className="font-display mt-2 text-3xl font-bold sm:text-4xl">Nuevo producto</h1>
      </div>

      <FormularioProducto
        categorias={categorias}
        sedes={sedes}
        buffersPosibles={buffersPosibles}
        slotMinutes={slotMinutes}
      />
    </main>
  );
}
