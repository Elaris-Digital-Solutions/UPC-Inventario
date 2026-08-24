import Link from "next/link";

import { Logotipo } from "@/components/logotipo";

// El pie, compartido por las pantallas publicas y las del alumno.
//
// Deliberadamente minimo: el nombre del servicio y el enlace a las reglas. No
// promete horarios ni disponibilidad, que es lo mismo que se le pide a la
// vitrina (D-21) y por el mismo motivo -un dato repetido en el pie es un dato
// mas que se queda viejo sin que nadie lo mire-.
//
// EL LOGOTIPO VUELVE, el 2026-08-13, y el resto NO se toca. Comparando las
// dos versiones en un navegador se vio que el pie del Vite llevaba la llama de
// la UPC, "Universidad Peruana de Ciencias Aplicadas", el copyright y el
// credito de Elaris (MIGRATION_GUIDE/src/components/Footer.tsx). Aqui solo se
// recupera la IMAGEN: las otras tres son frases, y escribir texto nuevo de
// interfaz no es capa visual aunque el hueco se vea. Quedan preguntadas.
//
// Y una nota sobre el "deliberadamente minimo" de arriba, que se conserva
// porque sigue siendo cierto para lo que dice -no prometer horarios- pero se
// leyo de mas: se tomo como que el pie entero debia ser una linea de texto, y
// eso hizo que nadie echara de menos la marca. Un comentario que justifica una
// ausencia acaba defendiendola.
export function Pie() {
  return (
    <footer className="border-border/60 mt-auto border-t">
      <div className="container flex flex-col items-center justify-between gap-4 py-8 text-sm sm:flex-row">
        <div className="flex items-center gap-3">
          <Logotipo tamano="pie" />
          <p className="text-muted-foreground">
            Reserva UPC · Sistema de Préstamos
          </p>
        </div>
        <Link
          href="/faq"
          className="text-primary underline-offset-4 hover:underline"
        >
          Cómo funciona
        </Link>
      </div>
    </footer>
  );
}
