import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";

// La cabecera del grupo (personal). NO reutiliza CabeceraSesion: esa esta
// escrita para el alumno -enlaza Catalogo, Mis reservas y Preguntas-, y
// ninguno de esos tres tiene sentido para quien esta en el mostrador o en el
// panel de administracion.
//
// NO vuelve a leer la sesion. El layout (app/(personal)/layout.tsx) ya llamo
// a getClaims() y a staff_members para decidir si dejaba pasar a quien mira,
// y le pasa el `role` que ya leyo. Repetir esa lectura aqui seria responder
// una pregunta que el layout ya respondio, y la segunda copia se
// desincronizaria de la primera con el tiempo -mismo razonamiento que ya deja
// escrito el comentario de components/cabecera-sesion.tsx.
type CabeceraPersonalProps = {
  // Tipo generado del esquema y no "admin" | "operator" a mano (D-26): si el
  // enum staff_role cambia algun dia, el typecheck lo va a decir solo porque
  // este tipo sale de Database, no porque alguien se acuerde de venir a
  // actualizar esta union escrita a mano.
  role: Database["public"]["Enums"]["staff_role"];
};

export function CabeceraPersonal({ role }: CabeceraPersonalProps) {
  return (
    <header className="border-border/60 bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-display text-upc-red text-xl font-bold">
          UPC-Inventario
        </Link>

        <nav className="flex items-center gap-1">
          {/* /mostrador siempre, para los dos roles (D-16): quien esta en el
              mostrador es quien sabe si el equipo se entrego, y eso vale
              igual para el admin que para el operador. */}
          <Button asChild variant="ghost" size="sm">
            <Link href="/mostrador">Mostrador</Link>
          </Button>

          {/* NO hay enlaces a /admin/* todavia, aunque el plan de la Task 1
              de esta tanda (FASE_2_TANDA_3A.md) lo pida. Correccion anotada
              aqui, en el propio archivo: esas cinco pantallas -inventario,
              reservas, dias, estadisticas, personal y ajustes- no existen
              hasta la T3B, asi que un enlace a /admin/inventario hoy lleva a
              un 404. Ofrecerle a un admin un enlace roto es peor que no
              ofrecerle ninguno. Cuando la T3B las construya, van aca, y solo
              bajo `role === "admin"` -el operador nunca las ve, ademas de que
              private.is_admin() se las negaria igual si escribiera la URL a
              mano.
              Y el efecto que esto NO arregla, porque es preexistente:
              lib/auth/destino.ts manda al admin a /admin/inventario nada mas
              entrar, y esa ruta va a seguir dando 404 hasta la T3B. No lo
              introduce esta tanda y no se arregla aca; queda dicho.

              Aca hubo una primera version con `{role === "admin" && null}`,
              escrita para que ESLint no marcara `role` como prop sin usar. Se
              quito: es codigo que no renderiza nada y existe solo para callar
              a una herramienta, y un lector futuro no tiene forma de saber
              que no hace falta. La regla del linter tenia razon -el prop no
              se estaba usando-, y la respuesta correcta no era esquivarla
              sino darle al prop un uso de verdad, que es el distintivo de
              abajo. */}

          {/* Con que cuenta se esta operando. Esto es VISIBILIDAD y no
              estetica: la misma persona puede tener fila de admin y estar
              atendiendo el mostrador, y lo que marque como "no se retiro"
              sanciona a un alumno de verdad. Saber con que rol se esta
              trabajando antes de pulsar ese boton no es decoracion.
              No decide nada -RLS decide-, solo lo dice. */}
          <Badge variant="secondary">
            {role === "admin" ? "Administrador" : "Operador"}
          </Badge>

          {/* Salir es un POST y no un enlace, igual que en cabecera-sesion.tsx:
              /auth/signout no exporta GET y responde 405 a proposito, asi que
              un <a> aca seria un boton que falla. */}
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" size="sm">
              Salir
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
