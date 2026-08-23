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

// La cabecera del grupo (personal). NO reutiliza CabeceraSesion: esa esta escrita
// para el alumno, y ninguno de sus enlaces tiene sentido en el mostrador.
//
// NO VUELVE A LEER LA SESION: el layout ya llamo a getClaims() y a
// `staff_members` para decidir si dejaba pasar, y le pasa el `role` que ya leyo.
// Una segunda lectura se desincronizaria de la primera.
type CabeceraPersonalProps = {
  // Tipo generado y no `"admin" | "operator"` a mano (D-26).
  role: Database["public"]["Enums"]["staff_role"];
};

// Escritas UNA vez y pintadas en los dos sitios -barra ancha y panel plegable-.
// Repetir la lista a mano es como se desincronizan: se añade una arriba, se
// olvida abajo, y el fallo solo aparece a un tamaño de pantalla.
//
// CADA ENLACE ENTRA EN LA TAREA QUE CONSTRUYE SU PANTALLA, nunca antes: un enlace
// en la cabecera lo ve el admin en TODAS las pantallas. Y hace falta acordarse de
// añadirlo, porque ninguna herramienta comprueba que una pantalla nueva este
// enlazada desde algun sitio: los cuatro comandos pasan en verde con una ruta
// solo alcanzable tecleando la URL.
const ENLACES_ADMIN = [
  { href: "/admin/inventario", texto: "Inventario" },
  { href: "/admin/reservas", texto: "Reservas" },
  { href: "/admin/dias", texto: "Días" },
  { href: "/admin/horarios", texto: "Horarios" },
  { href: "/admin/estadisticas", texto: "Estadísticas" },
  { href: "/admin/personal", texto: "Personal" },
  { href: "/admin/ajustes", texto: "Ajustes" },
];

export function CabeceraPersonal({ role }: CabeceraPersonalProps) {
  const esAdmin = role === "admin";

  // Con que cuenta se esta operando. Es VISIBILIDAD y no estetica: la misma
  // persona puede tener fila de admin y estar atendiendo el mostrador, y lo que
  // marque como "no se retiro" sanciona a un alumno de verdad. No decide nada
  // -RLS decide-, solo lo dice.
  //
  // Se calcula UNA vez y se pinta en los dos sitios: plegarlo solo en la barra
  // ancha haria desaparecer en un telefono justo el aviso de con que cuenta se
  // esta sancionando.
  const distintivo = (
    <Badge variant="secondary">{esAdmin ? "Administrador" : "Operador"}</Badge>
  );

  // LA CONDICION `esAdmin` DECIDE QUE ENTRA EN `enlaces`, y esta escrita UNA sola
  // vez para que valga igual en la barra ancha y en el panel plegable. Copiada a
  // mano en los dos sitios, seria cuestion de tiempo que una copia se quedara
  // atras y le enseñara administracion a un operador en el telefono.
  const enlaces = esAdmin
    ? [{ href: "/mostrador", texto: "Mostrador" }, ...ENLACES_ADMIN]
    : [{ href: "/mostrador", texto: "Mostrador" }];

  return (
    <header className="border-border/60 bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
      {/* DOS FILAS PARA EL ADMIN, y no una, decidido MIDIENDO: con los siete
          enlaces en una sola barra la navegacion pedia 1481px y "Salir" quedaba
          cortado incluso a 1440. Subir el punto de ruptura no lo arregla, no hay
          pantalla donde quepan. */}
      <div className="container flex h-20 items-center justify-between gap-4 sm:h-24">
        <Logotipo />

        <nav className="hidden items-center gap-6 md:flex">
          <Button asChild variant="ghost" className={ENLACE_NAV}>
            <Link href="/mostrador">Mostrador</Link>
          </Button>

          {distintivo}

          {/* Salir es un POST y no un enlace: /auth/signout no exporta GET y
              responde 405 a proposito, asi que un <a> seria un boton que falla. */}
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" className={ACCION_NAV}>
              Salir
            </Button>
          </form>
        </nav>

        {/* Por debajo de `md` el distintivo se queda FUERA del panel y visible en
            la barra, a diferencia de los enlaces: es un aviso y no navegacion, y
            esconderlo tras un menu que hay que abrir lo volveria inutil justo
            cuando mas hace falta, con el telefono en la mano en el mostrador. */}
        <div className="flex items-center gap-2 md:hidden">
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

      {/* La segunda fila, SOLO para admin y SOLO desde `md`: por debajo ya viajan
          dentro del panel plegable y repetirlos los pondria dos veces en el mismo
          arbol.
          `overflow-x-auto` en vez de envolver en dos lineas, para que la cabecera
          conserve altura fija: es `sticky`, y una que crece de alto empuja el
          contenido al reflowear. */}
      {esAdmin && (
        <nav
          aria-label="Administración"
          className="border-border/60 hidden border-t md:block"
        >
          <div className="container flex gap-6 overflow-x-auto py-3">
            {ENLACES_ADMIN.map((enlace) => (
              <Link
                key={enlace.href}
                href={enlace.href}
                className={`${ENLACE_NAV} shrink-0 py-1 transition-colors`}
              >
                {enlace.texto}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
