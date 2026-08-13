import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Logotipo } from "@/components/logotipo";
import { MenuMovil } from "@/components/menu-movil";
import {
  ACCION_NAV,
  ACCION_NAV_MOVIL,
  ENLACE_NAV,
  ENLACE_NAV_MOVIL,
} from "@/components/estilos-nav";
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

// Las SEIS pantallas de administracion, escritas UNA vez y pintadas en los dos
// sitios -barra ancha y panel plegable-. Repetir la lista a mano en ambos es
// como se desincronizan: se anade una arriba y se olvida abajo, y el fallo
// solo aparece a un tamano de pantalla.
const ENLACES_ADMIN = [
  { href: "/admin/inventario", texto: "Inventario" },
  { href: "/admin/reservas", texto: "Reservas" },
  { href: "/admin/dias", texto: "Días" },
  { href: "/admin/estadisticas", texto: "Estadísticas" },
  { href: "/admin/personal", texto: "Personal" },
  { href: "/admin/ajustes", texto: "Ajustes" },
];

export function CabeceraPersonal({ role }: CabeceraPersonalProps) {
  const esAdmin = role === "admin";

  // Con que cuenta se esta operando. Esto es VISIBILIDAD y no estetica: la
  // misma persona puede tener fila de admin y estar atendiendo el mostrador,
  // y lo que marque como "no se retiro" sanciona a un alumno de verdad. Saber
  // con que rol se esta trabajando antes de pulsar ese boton no es
  // decoracion. No decide nada -RLS decide-, solo lo dice.
  //
  // Se calcula UNA vez y se pinta en los dos sitios: si se plegara solo en la
  // barra ancha, en un telefono desapareceria justo el aviso de con que
  // cuenta se esta sancionando.
  const distintivo = (
    <Badge variant="secondary">{esAdmin ? "Administrador" : "Operador"}</Badge>
  );

  // HISTORIA DE ESTE HUECO, que ya no lo es.
  // Durante toda la T3A aca NO hubo ningun enlace a /admin/*: esas pantallas
  // no existian, y ofrecerle a un admin un enlace roto es peor que no
  // ofrecerle ninguno. La Task 1 de la T3B (FASE_2_TANDA_3B.md) construye
  // /admin/inventario, asi que el enlace entra ahora.
  //
  // CORRECCION al comentario que habia aca hasta hoy: decia "esas cinco
  // pantallas" y a continuacion enumeraba SEIS -inventario, reservas, dias,
  // estadisticas, personal y ajustes-. Son seis: la sexta es /admin/ajustes,
  // que el diseño de la fase no tenia -su tabla de rutas y su arbol listan
  // cinco- y que nace de D-39, para poder cerrar Q-14. El numero estaba mal,
  // la lista estaba bien.
  //
  // CADA ENLACE ENTRA EN LA TAREA QUE CONSTRUYE SU PANTALLA, nunca antes. El
  // criterio no cambio: un enlace en la cabecera lo ve el admin en TODAS las
  // pantallas, asi que aca no se anticipa nada. Dentro de una tabla si se
  // anticipa -ver components/admin/tabla-inventario.tsx-, porque ahi el enlace
  // roto solo lo alcanza quien esta mirando esa tabla y le faltan dos commits
  // de plazo, no una tanda.
  // /admin/reservas se suma en la Task 6, y HACIA FALTA MIRAR LA PANTALLA
  // PARA VERLO: los cuatro comandos estaban en verde con la ruta construida,
  // funcionando y sin una sola forma de llegar a ella que no fuera teclear la
  // URL. Ninguna herramienta comprueba que una pantalla nueva este enlazada
  // desde algun sitio.
  // /admin/dias se suma en la Task 7, por el mismo motivo: no se deja para
  // "despues" -- aca no hay despues, cada tarea enlaza la suya.
  // /admin/estadisticas se suma en la Task 8, por el mismo motivo otra vez.
  // /admin/personal se suma en la Task 9, otra vez por el mismo motivo: sin
  // este enlace, /admin/personal quedaria construida, funcionando y solo
  // alcanzable tecleando la URL a mano -- exactamente el defecto que este
  // comentario viene anotando desde la Task 6. Y /admin/ajustes se suma en la
  // Task 10, y CON ESTE ENLACE CIERRA LA LISTA DE SEIS que este comentario
  // viene enumerando desde la Task 1.
  //
  // Y el 404 que esto SI arregla, y que era preexistente: lib/auth/destino.ts
  // manda al admin a /admin/inventario nada mas entrar. Esa ruta dio 404 desde
  // la T1 -verificado en pantalla el 2026-08-12 con sesion de admin- y desde
  // esa Task 1 ya no.
  //
  // `role` tiene ademas el uso de siempre, el distintivo de mas arriba. Se
  // deja dicho porque aca hubo una vez un `{role === "admin" && null}` escrito
  // solo para callar a ESLint, y se quito: la regla tenia razon y la respuesta
  // correcta no era esquivarla.
  //
  // LA CONDICION `role === "admin"` SIGUE INTACTA tras la fusion con la rama
  // de estilos (2026-08-13): ahora decide que entra en `enlaces` en vez de
  // envolver seis <Button> repetidos. Es la MISMA regla -el operador no ve
  // administracion- escrita una sola vez para que valga igual en la barra
  // ancha y en el panel plegable. Antes vivia solo en la barra; si se hubiera
  // copiado a mano al panel, seria cuestion de tiempo que una de las dos
  // copias se quedara atras y le ensenara administracion a un operador en el
  // telefono.
  const enlaces = esAdmin
    ? [{ href: "/mostrador", texto: "Mostrador" }, ...ENLACES_ADMIN]
    : [{ href: "/mostrador", texto: "Mostrador" }];

  return (
    <header className="border-border/60 bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
      <div className="container flex h-20 items-center justify-between gap-4 sm:h-24">
        <Logotipo />

        {/* El punto de ruptura de ESTA cabecera es `xl` y no `md` como el de
            las otras dos, y es consecuencia directa de la T3B: un admin tiene
            SIETE enlaces -Mostrador y las seis de administracion- mas el
            distintivo de rol y el boton de salir. En versalitas espaciadas no
            entran a 1024px. Por debajo de 1280 se pliegan todos en el panel,
            que es exactamente para lo que existe. */}
        <nav className="hidden items-center gap-6 xl:flex">
          {enlaces.map((enlace) => (
            <Button key={enlace.href} asChild variant="ghost" className={ENLACE_NAV}>
              <Link href={enlace.href}>{enlace.texto}</Link>
            </Button>
          ))}

          {distintivo}

          {/* Salir es un POST y no un enlace, igual que en cabecera-sesion.tsx:
              /auth/signout no exporta GET y responde 405 a proposito, asi que
              un <a> aca seria un boton que falla. */}
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" className={ACCION_NAV}>
              Salir
            </Button>
          </form>
        </nav>

        {/* Por debajo de `xl` el distintivo de rol se queda FUERA del panel y
            visible en la barra, a diferencia de los enlaces. Es la unica cosa
            de esta cabecera que no es navegacion sino un aviso, y esconderlo
            detras de un menu que hay que abrir lo volveria inutil justo
            cuando mas hace falta: con el telefono en la mano, en el
            mostrador, antes de marcar una falta. */}
        <div className="flex items-center gap-2 xl:hidden">
          {distintivo}
          <MenuMovil>
            {enlaces.map((enlace) => (
              <Button
                key={enlace.href}
                asChild
                variant="ghost"
                className={ENLACE_NAV_MOVIL}
              >
                <Link href={enlace.href}>{enlace.texto}</Link>
              </Button>
            ))}
            <form action="/auth/signout" method="post" className="contents">
              <Button type="submit" variant="outline" className={ACCION_NAV_MOVIL}>
                Salir
              </Button>
            </form>
          </MenuMovil>
        </div>
      </div>
    </header>
  );
}
