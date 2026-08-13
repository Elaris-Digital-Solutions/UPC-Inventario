import { Menu, X } from "lucide-react";

// El menu de las tres cabeceras por debajo de `md`.
//
// Las tres cabeceras no tenian NINGUN punto de ruptura -`flex items-center
// gap-1` y nada mas-, asi que en un telefono el logotipo competia por sitio
// con hasta cuatro controles. El Vite si lo tenia: `hidden md:flex` para la
// navegacion de escritorio y un panel desplegable debajo
// (MIGRATION_GUIDE/src/components/Header.tsx:42 y 105).
//
// ESTO ES UN <details> Y NO ESTADO DE REACT, y es una decision forzada, no
// una preferencia: un menu con `useState` obligaria a poner "use client" en
// la cabecera, y anadir o quitar esa directiva esta fuera de lo que la capa
// visual puede tocar -decide si el codigo corre en el servidor o en el
// navegador-. `<details>` da abrir y cerrar con HTML puro, funciona sin
// JavaScript, es accesible por teclado de fabrica, y deja las tres cabeceras
// como Server Components, que es lo que ya eran.
//
// El precio, dicho por delante: no se cierra solo al navegar ni al pulsar
// fuera. Como cada opcion es un enlace que cambia de pagina, la cabecera se
// vuelve a montar cerrada y en la practica no se nota; pulsar fuera si deja
// el panel abierto.
export function MenuMovil({ children }: { children: React.ReactNode }) {
  return (
    <details className="group/menu relative md:hidden">
      <summary
        // `list-none` y el pseudo-elemento de WebKit: sin los dos, el
        // navegador pinta su propio triangulito al lado del icono.
        className="marker:content-none flex size-10 cursor-pointer list-none items-center justify-center rounded-lg outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden"
        aria-label="Menú"
      >
        <Menu className="size-5 group-open/menu:hidden" aria-hidden="true" />
        <X className="hidden size-5 group-open/menu:block" aria-hidden="true" />
      </summary>

      {/* `absolute` y no en el flujo: la cabecera es `sticky` y con altura
          fija, asi que un panel que empujara contenido la deformaria. Cuelga
          por debajo del borde inferior alineado a la derecha. */}
      <div className="border-border bg-background absolute top-full right-0 z-50 mt-2 flex w-56 flex-col items-stretch gap-1 rounded-xl border p-2 shadow-card">
        {children}
      </div>
    </details>
  );
}
