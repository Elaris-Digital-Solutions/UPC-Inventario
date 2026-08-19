import type { Metadata } from "next";
import { headers } from "next/headers";
import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
import { NonceRadix } from "@/components/seguridad/nonce-radix";
import { cn } from "@/lib/utils";

// D-23: las fuentes las descarga next/font en el build y las sirve desde el
// propio dominio. Sustituyen al @import de Google Fonts del Vite, que era una
// peticion bloqueante a un tercero y habria obligado a abrirle la CSP de la
// tanda 4. Los pesos son los mismos que pedia aquel @import, para que nada
// cambie de aspecto: recortarlos cambiaria el render y pareceria un fallo de la
// migracion cuando seria una decision.
//
// `shadcn init` metio aqui una tercera fuente, Geist, y la engancho como
// --font-sans. Se quito: la tipografia del cuerpo es Montserrat, que es la
// decision, y el preset de un generador no la revoca.
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-playfair",
  display: "swap",
});

// El nombre del producto es "Reserva UPC · Sistema de Prestamos", decidido el
// 2026-08-13. "UPC-Inventario" era el nombre del REPOSITORIO colado a la
// interfaz, y aparecia en tres sitios que se contradecian con el rotulo de la
// cabecera en cuanto esta recupero el original: aqui, en la metadata de la
// FAQ y en el pie. Los tres se corrigen a la vez, que es la unica forma de
// que un cambio de nombre no deje mitad y mitad.
export const metadata: Metadata = {
  title: "Reserva UPC · Sistema de Préstamos",
  description:
    "Reserva y prestamo de equipamiento tecnologico para alumnos UPC.",
};

// LEER `headers()` AQUI VUELVE DINAMICAS TODAS LAS RUTAS, y el comentario de
// abajo ya avisaba de ese mecanismo para la cabecera de sesion. Se hace igual,
// y no por descuido:
//
//   - MEDIDO EL 2026-08-19 sobre `npm run build`: de las 23 rutas de este
//     proyecto, las 23 YA son dinamicas y NINGUNA es estatica. El coste que
//     ese aviso describe ya esta pagado por otra via, asi que aqui no queda
//     nada que perder.
//   - Va en el layout RAIZ y no en los de grupo porque el nonce es una
//     propiedad de la PETICION, no de una seccion. Repartirlo entre
//     `(personal)` y `(alumno)` dejaria sin nonce -- en silencio -- la
//     tercera pantalla que alguien anada manana con un componente de Radix.
//
// EL COSTE SE ESCRIBE POR DELANTE: si algun dia se recuperan rutas estaticas,
// esta llamada es lo primero que lo impide, y entonces el nonce se mueve a los
// layouts de los grupos que usan Radix.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  // `x-nonce` la inyecta proxy.ts en las cabeceras del REQUEST (proxy.ts:59,
  // via `new Headers(request.headers)` en lib/supabase/proxy.ts). Hasta la
  // F3-T3 no la leia nadie.
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <html
      lang="es"
      className={cn("h-full", montserrat.variable, playfair.variable)}
    >
      {/* Sin cabecera aca, y es una decision medida, no un olvido. Una
          cabecera que lee sesion en el layout RAIZ vuelve dinamicas TODAS las
          rutas: medido el 2026-08-08 comparando `next build` antes y despues
          -las ocho pasaron de dos estaticas a cero-. La vitrina publica no
          necesita saber quien mira, asi que la cabecera la pintan los layouts
          de grupo: la publica en (publico), la de sesion en (alumno). */}
      <body className="min-h-full flex flex-col">
        {/* Antes que `children`: `setNonce` tiene que haber corrido cuando se
            monte el primer componente de Radix, porque la hoja se crea una
            sola vez y no se recrea. No pinta nada. */}
        <NonceRadix nonce={nonce} />
        {children}
      </body>
    </html>
  );
}
