// Pantalla de error de autenticacion: aqui aterrizan los enlaces de magic
// link que no se pudieron canjear (ver app/auth/confirm/route.ts).
//
// Esta pantalla se escribe aunque D-32 deberia hacer inalcanzable el caso del
// correo no institucional: el enganche before_user_created se desactiva desde
// un formulario del dashboard, y esta pagina es la red de abajo para ese caso
// y para cualquier otro motivo de fallo del enlace.
//
// No se muestra el mensaje crudo que devuelve el servidor: aqui los fallos
// son de validez del enlace -incompleto, de un tipo que no se reconoce,
// caducado o ya usado-, no de autorizacion, y un texto en espanol ayuda mas
// que un mensaje en ingles pensado para logs. Es presentacion, no una
// decision de seguridad.

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const MENSAJES: Record<string, string> = {
  incompleto:
    "El enlace está incompleto. Puede que el correo lo haya cortado al mostrarlo.",
  tipo: "El enlace no es de un tipo que este sistema reconozca.",
  enlace:
    "El enlace ya no sirve: es de un solo uso y caduca en una hora. Puede que ya lo hayas usado o que haya pasado el plazo.",
  // Este no viene de un enlace: lo emite la Server Action de /completar-perfil
  // cuando el UPDATE no llega a tocar ninguna fila. La pantalla es la misma
  // porque el usuario no necesita saber la diferencia, pero el motivo separado
  // es lo que impide que ese fallo se confunda con un enlace caducado.
  perfil:
    "No pudimos guardar tu perfil. Volvé a intentarlo, y si sigue pasando avisá al personal.",
};

const MENSAJE_POR_DEFECTO = "No pudimos completar el acceso.";

export default async function AuthErrorPage(props: PageProps<"/auth/error">) {
  const { motivo } = await props.searchParams;
  const texto =
    (typeof motivo === "string" && MENSAJES[motivo]) || MENSAJE_POR_DEFECTO;

  return (
    <main className="container flex flex-1 flex-col items-center justify-center py-16">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-upc-red text-2xl">
            No pudimos entrarte
          </CardTitle>
          <CardDescription>{texto}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/login">Pedir un enlace nuevo</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
