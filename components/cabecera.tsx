import Link from "next/link";

import { Button } from "@/components/ui/button";

// La cabecera de las pantallas PUBLICAS: la landing y la FAQ.
//
// No lee sesion, y no es por simplicidad: leerla cuesta el prerender estatico
// de toda la aplicacion. Medido el 2026-08-08 comparando `next build` con la
// misma cabecera leyendo claims desde el layout raiz -las ocho rutas pasaron
// de dos estaticas a cero, porque cualquier acceso a cookies() en el layout
// raiz vuelve dinamico todo lo que cuelga de el-. La vitrina publica no
// necesita saber quien mira: eso es justamente D-21.
//
// La gemela que si lee sesion es CabeceraSesion, y vive en los grupos donde ya
// hace falta una sesion para estar ahi.
//
// Y ninguna de las dos DECIDE nada. Quien no deberia llegar al catalogo lo
// tiene cerrado por el proxy y por RLS. Ensenar o esconder un enlace es
// comodidad; si borrarlo abriera un agujero, el agujero estaba en la base.
// `minima` deja solo el logo, y existe por un problema concreto que se vio
// abriendo la pantalla: /login no tenia UN SOLO enlace, asi que quien llegaba
// ahi rebotado desde una ruta privada quedaba encerrado -sin mas salida que el
// boton atras del navegador-. La cabecera completa tampoco servia ahi: su
// boton "Entrar" lleva a la pagina en la que ya estas.
type CabeceraProps = {
  variante?: "completa" | "minima";
};

export function Cabecera({ variante = "completa" }: CabeceraProps) {
  return (
    <header className="border-border/60 bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-display text-upc-red text-xl font-bold">
          UPC-Inventario
        </Link>

        {variante === "completa" && (
          <nav className="flex items-center gap-1">
            <Button asChild variant="ghost" size="sm">
              <Link href="/faq">Preguntas</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">Entrar</Link>
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
