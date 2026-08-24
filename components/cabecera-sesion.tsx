import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Logotipo } from "@/components/logotipo";
import { MenuMovil } from "@/components/menu-movil";
import {
  ACCION_NAV,
  ACCION_NAV_MOVIL,
  ENLACE_NAV,
  ENLACE_NAV_MOVIL,
} from "@/components/estilos-nav";

// La cabecera de las pantallas que ya exigen sesion para estar ahi.
//
// NO lee claims, y conviene explicar por que, porque el nombre invita a lo
// contrario: cuando este componente se pinta, la sesion ya la comprobo el
// layout del grupo que lo contiene -app/(alumno)/layout.tsx llama a
// getClaims() y redirige a /login si no hay-. Volver a leerla aqui seria una
// segunda lectura para responder una pregunta ya respondida, y ademas la
// segunda copia se desincronizaria de la primera con el tiempo. Es el mismo
// razonamiento por el que lib/auth/destino.ts es la lectura UNICA que reparte.
//
// Y por eso ensena "Salir" sin condicion: si no hubiera sesion, nadie estaria
// viendo esta cabecera.
//
// Es la cabecera con MAS controles de las tres -tres enlaces y el boton de
// salir-, asi que es la que peor estaba sin punto de ruptura: en un telefono
// de 375px esos cuatro competian con el logotipo en una sola fila. Desde el
// 2026-08-13 se pliegan en MenuMovil por debajo de `md`.
export function CabeceraSesion() {
  // Los tres enlaces de navegacion, escritos UNA vez y pintados en los dos
  // sitios -barra de escritorio y panel movil-. Repetirlos a mano en ambos
  // sitios es como se desincronizan: se anade uno arriba y se olvida abajo, y
  // el fallo solo se ve en un tamano de pantalla.
  const enlaces = [
    { href: "/catalogo", texto: "Catálogo" },
    { href: "/mi-panel", texto: "Mis reservas" },
    { href: "/faq", texto: "Preguntas" },
  ];

  return (
    <header className="border-border/60 bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
      <div className="container flex h-20 items-center justify-between gap-4 sm:h-24">
        <Logotipo />

        <nav className="hidden items-center gap-8 md:flex">
          {/* "Mis reservas" va AQUI, en la cabecera CON sesion, y no en
              components/cabecera.tsx -aunque el plan de la tanda diga lo
              segundo, correccion anotada-. cabecera.tsx es la de las
              pantallas SIN sesion -landing y FAQ-, y /mi-panel no tiene
              ningun sentido sin sesion: ofrecerlo alli seria un enlace que
              rebota a /login en vez de llevar a algo. */}
          {enlaces.map((enlace) => (
            <Button key={enlace.href} asChild variant="ghost" className={ENLACE_NAV}>
              <Link href={enlace.href}>{enlace.texto}</Link>
            </Button>
          ))}

          {/* Salir es un POST y no un enlace. /auth/signout no exporta GET, y
              la tanda 1 midio que responde 405 a proposito: un <a> aqui seria
              un boton que falla. */}
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline" className={ACCION_NAV}>
              Salir
            </Button>
          </form>
        </nav>

        <MenuMovil>
          {enlaces.map((enlace) => (
            <Button key={enlace.href} asChild variant="ghost" className={ENLACE_NAV_MOVIL}>
              <Link href={enlace.href}>{enlace.texto}</Link>
            </Button>
          ))}
          {/* El mismo POST, tambien aqui: el boton de salir no puede quedarse
              solo en la barra de escritorio o en un telefono no habria forma
              de cerrar la sesion. */}
          <form action="/auth/signout" method="post" className="contents">
            <Button type="submit" variant="outline" className={ACCION_NAV_MOVIL}>
              Salir
            </Button>
          </form>
        </MenuMovil>
      </div>
    </header>
  );
}
