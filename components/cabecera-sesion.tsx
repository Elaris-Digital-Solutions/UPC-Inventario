import Link from "next/link";

import { Button } from "@/components/ui/button";

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
export function CabeceraSesion() {
  return (
    <header className="border-border/60 bg-background/95 sticky top-0 z-50 border-b backdrop-blur">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="font-display text-upc-red text-xl font-bold">
          UPC-Inventario
        </Link>

        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link href="/catalogo">Catálogo</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/faq">Preguntas</Link>
          </Button>

          {/* Salir es un POST y no un enlace. /auth/signout no exporta GET, y
              la tanda 1 midio que responde 405 a proposito: un <a> aqui seria
              un boton que falla. */}
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
