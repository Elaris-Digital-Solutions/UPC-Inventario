// La pantalla de la encuesta final de satisfaccion, Task 14 de la tanda 2B
// (BR-18). Vive bajo app/(alumno)/, asi que la sesion ya esta resuelta por el
// layout del grupo -getClaims() y el perfil completo, comprobados en
// app/(alumno)/layout.tsx- antes de que este Server Component se ejecute.
//
// No es una encuesta de fin de prestamo, sino la encuesta final de
// satisfaccion con el SERVICIO -una sola vez por alumno, editable- (F10 y la
// correccion 4 del plan de esta tanda, MIGRATION_DOCS/PLANES/FASE_2_TANDA_2B.md).
import { FormularioEncuesta } from "@/components/reservas/formulario-encuesta";
import { miEncuesta } from "@/lib/reservas/consultas";
import { EncabezadoSeccion } from "@/components/antetitulo";

export default async function EncuestaPage() {
  const encuesta = await miEncuesta();

  return (
    <main className="container flex-1 py-12">
      <EncabezadoSeccion
        antetitulo="Tu opinión"
        titulo="Encuesta de satisfacción"
        como="h1"
      />

      <p className="text-muted-foreground mt-3 max-w-2xl text-sm">
        Cuéntanos cómo fue tu experiencia con el sistema de reservas. Tu respuesta nos ayuda a mejorar el
        servicio para el resto de alumnos.
      </p>

      {/* La especificacion lo dice de forma explicita -F10,
          MIGRATION_DOCS/ESPECIFICACION_FUNCIONAL.md linea 188: "No es
          anonima"-, y el alumno merece saberlo ANTES de escribir, no
          despues. Texto claro, sin dramatismo. */}
      <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
        Esta encuesta no es anónima: tu respuesta queda asociada a tu cuenta.
      </p>

      {encuesta !== null && (
        <p className="mt-4 max-w-2xl text-sm">
          Ya respondiste esta encuesta. Puedes revisar y actualizar tus respuestas cuando quieras.
        </p>
      )}

      <div className="mt-8 max-w-2xl">
        <FormularioEncuesta encuestaExistente={encuesta} />
      </div>
    </main>
  );
}
