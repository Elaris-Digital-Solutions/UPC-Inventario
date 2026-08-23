import { FormularioAjustes } from "@/components/admin/formulario-ajustes";
import { leerAjustes, productosConBuffer } from "@/lib/admin/configuracion";
import { Antetitulo, TituloSeccion } from "@/components/antetitulo";

// /admin/ajustes (D-39 trae esta pantalla y con ella
// la segunda mitad de Q-14; D-54 añade la comprobacion de la apertura y DEJA
// Q-19 ABIERTO para la T4 -Q-19 no se cierra hoy: es el pendiente de que la
// base defienda con su propio `check` lo que D-54 solo parchea del lado de la
// aplicacion, ver el comentario de aperturaDesalineada() en lib/admin/ajustes.ts-).
// La sexta pantalla de admin, y la que el diseño de la fase no tenia: su
// tabla de rutas y su arbol -MIGRATION_DOCS/FASE_2_DISENO.md- listan cinco.
// Nace de D-39, decidida despues de escribir ese diseño.
//
// Server Component: las dos lecturas se hacen aca, en el servidor, y el
// formulario controlado vive en un Client Component que recibe los datos ya
// traidos. Misma reparticion que app/(personal)/admin/dias/page.tsx.
//
// LAS DOS LECTURAS EN PARALELO, mismo patron que DiasPage: leerAjustes() trae
// la fila unica de app_settings, y productosConBuffer() trae el catalogo
// entero con su buffer_minutes -lo que necesita productosDesalineados() en el
// cliente para avisar antes de guardar un slot_minutes nuevo, D-39-.
//
// SIN cabecera ni pie propios: app/(personal)/layout.tsx y
// app/(personal)/admin/layout.tsx -que exige rol `admin`- ya los montan. Y sin
// comprobacion de rol aca: ese layout ya la hace, y quien autoriza de verdad
// es RLS -app_settings_update_admin, medida en lib/admin/acciones.ts-.
export default async function AjustesPage() {
  const [ajustes, productos] = await Promise.all([leerAjustes(), productosConBuffer()]);

  return (
    <main className="container py-8">
      <div className="mb-6">
        <Antetitulo>Administración</Antetitulo>
          <TituloSeccion como="h1">Ajustes</TituloSeccion>
        <p className="text-muted-foreground text-sm">
          Los seis valores globales que gobiernan la reserva: la ventana de días, la hora de
          apertura, la hora de cierre, el tamaño del bloque horario, la duración mínima de una
          reserva y el límite diario por producto.
        </p>
      </div>

      <FormularioAjustes ajustes={ajustes} productos={productos} />
    </main>
  );
}
