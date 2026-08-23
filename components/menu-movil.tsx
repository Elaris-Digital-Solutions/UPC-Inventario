import { Menu, X } from "lucide-react";

// El menu de las tres cabeceras por debajo de `md`.
//
// ES UN <details> Y NO ESTADO DE REACT, y es una decision FORZADA: un menu con
// `useState` obligaria a poner "use client" en la cabecera, y esa directiva
// decide si el codigo corre en el servidor o en el navegador. `<details>` abre y
// cierra con HTML puro, funciona sin JavaScript, es accesible por teclado de
// fabrica, y deja las tres cabeceras como Server Components.
//
// EL PRECIO, dicho por delante: no se cierra solo al pulsar fuera. Al navegar si,
// porque la cabecera se vuelve a montar cerrada.
export function MenuMovil({ children }: { children: React.ReactNode }) {
  return (
    <details className="group/menu relative md:hidden">
      <summary
        // Sin `list-none` Y el pseudo-elemento de WebKit, el navegador pinta su
        // propio triangulito al lado del icono.
        className="marker:content-none flex size-10 cursor-pointer list-none items-center justify-center rounded-lg outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden"
        aria-label="Menú"
      >
        <Menu className="size-5 group-open/menu:hidden" aria-hidden="true" />
        <X className="hidden size-5 group-open/menu:block" aria-hidden="true" />
      </summary>

      {/* `absolute` y no en el flujo: la cabecera es `sticky` con altura fija, y
          un panel que empujara contenido la deformaria. */}
      <div className="border-border bg-background absolute top-full right-0 z-50 mt-2 flex w-56 flex-col items-stretch gap-1 rounded-xl border p-2 shadow-card">
        {children}
      </div>
    </details>
  );
}
