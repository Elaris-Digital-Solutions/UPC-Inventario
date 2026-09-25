import type { Metadata } from "next";
import { headers } from "next/headers";
import { Montserrat, Playfair_Display } from "next/font/google";
import "./globals.css";
import { NonceRadix } from "@/components/seguridad/nonce-radix";
import { cn } from "@/lib/utils";

// D-23: next/font las descarga en el build y las sirve desde el propio dominio,
// asi que la CSP no tiene que abrirle a Google Fonts. Los pesos son los mismos
// que pedia el @import del Vite: recortarlos cambiaria el render y pareceria un
// fallo de la migracion.
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

// El nombre del producto es "Ciencias de la Computacion - UPC · Gestion de
// Dispositivos", el mismo que el rotulo de la cabecera (components/logotipo.tsx)
// y el pie. Cambiado el 2026-09-25; antes decia "Reserva UPC · Sistema de
// Prestamos", y antes de eso "UPC-Inventario", que es el nombre del REPOSITORIO
// y nunca debio estar en la interfaz.
//
// LOS CUATRO SITIOS SE CAMBIAN A LA VEZ -este <title>, el de la FAQ, y el `name`
// y `short_name` de app/manifest.ts-: un nombre a medias es peor que el viejo,
// porque la pestaña, el buscador y el icono instalado dicen cosas distintas.
export const metadata: Metadata = {
  title: "Ciencias de la Computación - UPC · Gestión de Dispositivos",
  description:
    "Reserva y prestamo de equipamiento tecnologico para alumnos UPC.",
};

// LEER `headers()` AQUI VUELVE DINAMICAS TODAS LAS RUTAS, y se hace igual: TODAS
// las del proyecto YA lo son, asi que el coste esta pagado por otra via. Va en el
// layout RAIZ porque el nonce es propiedad de la PETICION: repartirlo entre
// grupos dejaria sin el, en silencio, la proxima pantalla con un componente de
// Radix.
//
// EL COSTE SE ESCRIBE POR DELANTE: si algun dia se recuperan rutas estaticas,
// esta llamada es lo primero que lo impide.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  // `x-nonce` la inyecta proxy.ts en las cabeceras del REQUEST.
  const nonce = (await headers()).get("x-nonce") ?? "";

  return (
    <html
      lang="es"
      className={cn("h-full", montserrat.variable, playfair.variable)}
    >
      {/* Sin cabecera aqui: una que lea sesion en el layout RAIZ vuelve
          dinamicas todas las rutas. La vitrina publica no necesita saber quien
          mira, asi que la cabecera la pintan los layouts de grupo. */}
      <body className="min-h-full flex flex-col">
        {/* Antes que `children`: la hoja de Radix se crea una sola vez, asi que
            `setNonce` tiene que haber corrido antes. No pinta nada. */}
        <NonceRadix nonce={nonce} />
        {children}
      </body>
    </html>
  );
}
