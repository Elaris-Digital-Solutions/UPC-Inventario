import type { MetadataRoute } from "next";

// El manifest de la aplicacion instalable -D-81, F3-T5-. Con esto y HTTPS el
// navegador YA ofrece instalar: NO hace falta un service worker, medido el
// 2026-08-19 con build+start -`beforeinstallprompt` disparo con CERO service
// workers registrados-. El diseno pedia uno; la guia de la version instalada,
// node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md, exige
// solo dos cosas y ninguna lo es. Tampoco hay boton propio de instalar: esa
// misma guia lo desaconseja porque no funciona en Safari iOS -D-88-.
//
// OJO: esta ruta esta declarada publica en proxy.ts. Sin esa entrada el proxy
// la rebota a /login con un 307 y la aplicacion no se puede instalar.
//
// Los dos colores NO son una eleccion estetica: salen de app/globals.css
// -`--background: hsl(0 0% 98%)` y `--primary: hsl(356 95% 45%)`, convertidos
// con un comando y no a ojo-. Si la fase visual cambia esas variables, este
// archivo se queda desincronizado en silencio: no hay nada que lo enganche.
export default function manifest(): MetadataRoute.Manifest {
  return {
    // `name` se lee en la pantalla de instalacion; `short_name`, bajo el icono
    // en la pantalla de inicio, donde Android corta a unos 12 caracteres.
    // "Reserva UPC" son 11 y cabe entero. El largo es el nombre de producto
    // decidido el 2026-08-13, el mismo de app/layout.tsx.
    name: "Reserva UPC · Sistema de Préstamos",
    short_name: "Reserva UPC",
    description:
      "Reserva y prestamo de equipamiento tecnologico para alumnos UPC.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#e00614",
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
