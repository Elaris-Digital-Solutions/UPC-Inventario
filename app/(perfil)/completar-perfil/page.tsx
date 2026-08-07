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
const CLASES_SELECT =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

export default async function CompletarPerfilPage() {
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
        .select("nombre, apellido")
        .eq("auth_user_id", sub)
        .maybeSingle()
    : { data: null };

  return (
    <main className="container flex flex-1 flex-col items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-upc-red text-2xl">
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
                defaultValue=""
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
            <Button type="submit" className="w-full">
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
