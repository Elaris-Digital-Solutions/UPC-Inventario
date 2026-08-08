import type { Metadata } from "next";
import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
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

export const metadata: Metadata = {
  title: "UPC-Inventario",
  description:
    "Reserva y prestamo de equipamiento tecnologico para alumnos UPC.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
