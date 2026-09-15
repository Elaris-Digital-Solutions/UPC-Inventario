// UNA APLICACION, DOS NOMBRES (2026-09-14). ccnode.net muestra la portada y la
// aplicacion vive en dispositivos.ccnode.net. No es estetica: la cookie de
// sesion se guarda POR HOST, asi que todo lo que la escribe o la lee -el login,
// el canje del magic link, el catalogo, los paneles- tiene que ocurrir en un
// solo dominio. Un alumno que entrara en uno aterrizaria sin sesion en el otro.
//
// Cualquier otro host -127.0.0.1, upc-inventario.netlify.app, los deploy
// previews- sigue sirviendo todo como antes: la regla solo muerde en la portada.
export const ORIGEN_APP = 'https://dispositivos.ccnode.net';

export const DOMINIOS_PORTADA = ['ccnode.net', 'www.ccnode.net'];

// IGUALDAD EXACTA, igual que '/' en RUTAS_PUBLICAS de proxy.ts: por prefijo,
// '/faq' dejaria pasar '/faq-lo-que-sea'. El manifest va porque la portada
// tambien se puede instalar, y el navegador lo pide sin sesion.
export const RUTAS_PORTADA = ['/', '/faq', '/manifest.webmanifest'];

// Devuelve la URL ABSOLUTA a la que redirigir, o null si la peticion se sirve
// en el host al que llego.
//
// `host` es la cabecera cruda y no request.nextUrl: esa emite `localhost` aunque
// la peticion llegue a 127.0.0.1 (COMPORTAMIENTO_MEDIDO.md §3). Puede venir con
// puerto y en mayusculas, porque la escribe el navegador.
//
// `search` se conserva entero: un enlace viejo a ccnode.net/auth/confirm lleva
// el token_hash en la query, y perderlo es un canje que falla sin error.
export function redireccionPorDominio(
  host: string | null,
  pathname: string,
  search: string,
): string | null {
  // Sin puerto y en minusculas. Comparacion EXACTA contra la lista: con
  // `endsWith`, otroccnode.net pasaria por la portada.
  const dominio = host?.split(':')[0].toLowerCase();
  if (!dominio || !DOMINIOS_PORTADA.includes(dominio)) return null;
  if (RUTAS_PORTADA.includes(pathname)) return null;
  return `${ORIGEN_APP}${pathname}${search}`;
}
