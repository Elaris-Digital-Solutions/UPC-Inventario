import Link from "next/link";

import { Logotipo } from "@/components/logotipo";

// El pie, compartido por las pantallas publicas y las del alumno.
//
// Deliberadamente minimo: el nombre del servicio y el enlace a las reglas. No
// promete horarios ni disponibilidad, que es lo mismo que se le pide a la
// vitrina (D-21) y por el mismo motivo -un dato repetido en el pie es un dato
// mas que se queda viejo sin que nadie lo mire-.
//
// EL PIE DEL VITE llevaba cuatro cosas (MIGRATION_GUIDE/src/components/Footer.tsx):
// la llama de la UPC, "Universidad Peruana de Ciencias Aplicadas", el copyright
// y el credito de Elaris. El logotipo volvio el 2026-08-13 y EL CREDITO el
// 2026-09-25, este pedido de forma explicita. Las otras dos -nombre de la
// universidad y copyright- siguen sin estar, y eso es una decision viva: son
// frases nuevas de interfaz, no maquetacion.
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
          {/* El credito va EN LA MISMA FRASE que el nombre del sistema, no en
              una linea aparte: es como lo escribia el Vite -"… Sistema de
              Prestamos de Dispositivos. Desarrollado por Elaris Digital
              Solutions"-, y suelto debajo del enlace se leia como un segundo
              bloque de navegacion en vez de como una firma.
              `target="_blank"` SIEMPRE con `rel="noopener noreferrer"`: sin
              `noopener`, la pagina que se abre recibe un `window.opener` con el
              que puede redirigir a esta. Es el mismo par que usaba el Vite.
              SUBRAYADO SIEMPRE, no solo al pasar por encima: es el UNICO enlace
              del pie que sale del sitio y va dentro de un parrafo, asi que sin
              subrayado no se distingue del texto que lo rodea -"Cómo funciona"
              si se distingue porque va en rojo y separado-. La linea es tenue
              -`decoration-1` al 40%- y se asienta al pasar por encima. */}
          <p className="text-muted-foreground">
            Ciencias de la Computación - UPC · Gestión de Dispositivos.
            Desarrollado por{" "}
            <a
              href="https://elarisdigitalsolutions.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-muted-foreground/40 decoration-1 underline-offset-2 transition-colors hover:decoration-muted-foreground"
            >
              Elaris Digital Solutions
            </a>
          </p>
        </div>
        <Link
          href="/faq"
          className="text-primary shrink-0 underline-offset-4 hover:underline"
        >
          Cómo funciona
        </Link>
      </div>
    </footer>
  );
}
