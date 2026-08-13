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

          {/* HISTORIA DE ESTE HUECO, que ya no lo es.
              Durante toda la T3A aca NO hubo ningun enlace a /admin/*: esas
              pantallas no existian, y ofrecerle a un admin un enlace roto es
              peor que no ofrecerle ninguno. La Task 1 de la T3B
              (FASE_2_TANDA_3B.md) construye /admin/inventario, asi que el
              enlace entra ahora.

              CORRECCION al comentario que habia aca hasta hoy: decia "esas
              cinco pantallas" y a continuacion enumeraba SEIS -inventario,
              reservas, dias, estadisticas, personal y ajustes-. Son seis: la
              sexta es /admin/ajustes, que el diseño de la fase no tenia -su
              tabla de rutas y su arbol listan cinco- y que nace de D-39, para
              poder cerrar Q-14. El numero estaba mal, la lista estaba bien.

              CADA ENLACE ENTRA EN LA TAREA QUE CONSTRUYE SU PANTALLA, nunca
              antes. El criterio no cambio: un enlace en la cabecera lo ve el
              admin en TODAS las pantallas, asi que aca no se anticipa nada.
              Dentro de una tabla si se anticipa -ver
              components/admin/tabla-inventario.tsx-, porque ahi el enlace roto
              solo lo alcanza quien esta mirando esa tabla y le faltan dos
              commits de plazo, no una tanda.
              /admin/reservas se suma en la Task 6, y HACIA FALTA MIRAR LA
              PANTALLA PARA VERLO: los cuatro comandos estaban en verde con la
              ruta construida, funcionando y sin una sola forma de llegar a
              ella que no fuera teclear la URL. Ninguna herramienta comprueba
              que una pantalla nueva este enlazada desde algun sitio.
              /admin/dias se suma en la Task 7, por el mismo motivo: no se
              deja para "despues" -- aca no hay despues, cada tarea enlaza la
              suya. /admin/estadisticas se suma ahora, en la Task 8, por el
              mismo motivo otra vez.

              Y el 404 que esto SI arregla, y que era preexistente:
              lib/auth/destino.ts manda al admin a /admin/inventario nada mas
              entrar. Esa ruta dio 404 desde la T1 -verificado en pantalla el
              2026-08-12 con sesion de admin- y desde esta Task 1 ya no.

              `role` tiene ademas el uso de siempre, el distintivo de mas
              abajo. Se deja dicho porque aca hubo una vez un
              `{role === "admin" && null}` escrito solo para callar a ESLint,
              y se quito: la regla tenia razon y la respuesta correcta no era
              esquivarla. */}
          {role === "admin" && (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/inventario">Inventario</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/reservas">Reservas</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/dias">Días</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/admin/estadisticas">Estadísticas</Link>
              </Button>
            </>
          )}

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
