import type { MetadataRoute } from "next";

// El manifest de la aplicacion instalable (D-81). Con esto y HTTPS el navegador
// YA ofrece instalar: NO hace falta service worker, y tampoco boton propio de
// instalar, que la guia de Next desaconseja porque no funciona en Safari iOS
// (D-88). Ver COMPORTAMIENTO_MEDIDO.md §3.
//
// OJO: esta ruta esta declarada publica en proxy.ts, o el proxy la rebota a
// /login con un 307 y la aplicacion no se puede instalar.
//
// ⚠ LOS DOS COLORES salen de app/globals.css, convertidos con un comando y no a
// ojo. Si la fase visual cambia esas variables, este archivo se queda
// desincronizado EN SILENCIO: no hay nada que lo enganche.
export default function manifest(): MetadataRoute.Manifest {
  return {
    // `short_name` va bajo el icono, donde Android corta a unos 12 caracteres:
    // "Reserva UPC" son 11 y cabe entero.
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
