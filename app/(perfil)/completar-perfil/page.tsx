import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/server";

import { guardarPerfil } from "./actions";

// Clases del select nativo calcadas de components/ui/input.tsx -mismo borde,
// radio, alto, padding y foco- para que no desentone al lado de los <Input>
// de este mismo formulario.
//
// CORREGIDO el 2026-08-13: la copia estaba clavada a `h-8 px-2.5` y se quedo
// atras cuando el <Input> recupero la escala del Vite -h-10 px-3-, asi que el
// desplegable de carrera salia OCHO PIXELES mas bajo que los dos campos de
// encima. Es justo el defecto que tiene copiar clases a mano en vez de
// compartir el componente: las dos copias no fallan a la vez, se
// desincronizan en silencio y compilan igual.
//
// Se deja como copia y no se crea un primitivo <Select> todavia: seria el
// unico sitio que lo usaria, y un componente con un solo consumidor es peor
// que la copia mientras no haya un segundo. Si aparece, este es el candidato.
const CLASES_SELECT =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

export default async function CompletarPerfilPage({
  searchParams,
}: {
  // D-79: `volver` lo pone la puerta de /catalogo/[id]/reservar para que
  // rellenar los datos no expulse de la reserva que se estaba haciendo.
  // Next.js 16: searchParams llega como Promise.
  searchParams: Promise<{ volver?: string }>;
}) {
  const { volver } = await searchParams;
  const supabase = await createClient();

  // El layout de (perfil) ya comprobo que hay sesion y fila en alumnos; esta
  // lectura es propia de la pagina, para prerrellenar el formulario con lo
  // que ya se sepa de esa persona.
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;

  const { data: carreras } = await supabase
    .from("carreras")
    .select("id, nombre")
    .eq("activa", true)
    .order("nombre");

  const { data: alumno } = sub
    ? await supabase
        .from("alumnos")
        .select("nombre, apellido, carrera_id, es_profesor, confirmo_facultad")
        .eq("auth_user_id", sub)
        .maybeSingle()
    : { data: null };

  return (
    <main className="container flex flex-1 flex-col items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Completá tu perfil
          </CardTitle>
          <CardDescription>
            Faltan unos datos para poder reservar equipamiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={guardarPerfil} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="nombre" className="text-sm font-medium">
                Nombre
              </label>
              <Input
                id="nombre"
                name="nombre"
                required
                maxLength={80}
                defaultValue={alumno?.nombre ?? ""}
                autoComplete="given-name"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="apellido" className="text-sm font-medium">
                Apellido
              </label>
              <Input
                id="apellido"
                name="apellido"
                required
                maxLength={80}
                defaultValue={alumno?.apellido ?? ""}
                autoComplete="family-name"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="carrera_id" className="text-sm font-medium">
                Carrera
              </label>
              <select
                id="carrera_id"
                name="carrera_id"
                required
                // CORREGIDO el 2026-08-18 al caminar D-79: estaba clavado a
                // "" y no preseleccionaba la carrera que la persona ya tenia.
                // Antes daba igual, porque esta pantalla SOLO aparecia con el
                // perfil vacio. Desde D-79 aparece tambien a quien solo le
                // falta confirmar la facultad, y con "" se le obligaba a
                // reelegir una carrera que ya habia elegido.
                defaultValue={alumno?.carrera_id ?? ""}
                className={CLASES_SELECT}
              >
                <option value="" disabled>
                  Elegí una carrera
                </option>
                {carreras?.map((carrera) => (
                  <option key={carrera.id} value={carrera.id}>
                    {carrera.nombre}
                  </option>
                ))}
              </select>
            </div>
            {/* D-79. Dos casillas, y solo una es obligatoria: declararse
                profesor o no son las DOS respuestas validas, mientras que sin
                confirmar la facultad el perfil esta incompleto. */}
            <div className="flex items-start gap-2">
              <input
                id="es_profesor"
                name="es_profesor"
                type="checkbox"
                defaultChecked={alumno?.es_profesor ?? false}
                className="mt-1"
              />
              <label htmlFor="es_profesor" className="text-sm">
                Soy profesor. La carrera de arriba es a la que pertenezco.
              </label>
            </div>

            <div className="flex items-start gap-2">
              {/* El `required` es comodidad del navegador, NO un control:
                  quien lo salte llega igual a la puerta de
                  /catalogo/[id]/reservar, que es la que decide. */}
              <input
                id="confirmo_facultad"
                name="confirmo_facultad"
                type="checkbox"
                required
                defaultChecked={alumno?.confirmo_facultad ?? false}
                className="mt-1"
              />
              <label htmlFor="confirmo_facultad" className="text-sm">
                Confirmo que pertenezco a la Facultad de Ingeniería, en
                Ciencias de la Computación o Ingeniería de Software. Se
                verifica con el TIU al recoger el equipo.
              </label>
            </div>

            {/* Campo oculto y no un parametro de la Server Action: el destino
                llega por la URL de esta pagina y tiene que sobrevivir al
                envio del formulario. */}
            <input type="hidden" name="volver" value={volver ?? ""} />

            <Button type="submit" className="w-full">
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
