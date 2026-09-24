// A donde se vuelve tras completar el perfil (D-79). El valor llega del cliente
// en `?volver=`, y un redirect() a un valor sin atar es un REDIRECT ABIERTO.
//
// H-11 de la segunda auditoria (2026-09-17). El filtro anterior -empieza por
// "/" y no por "//"- miraba la cadena ANTES de que el navegador la reescriba, y
// el navegador la reescribe: "/\evil.example" y "/<TAB>/evil.example" acaban en
// "//evil.example" y salen del sitio. Por eso aqui no se compara texto: se
// resuelve con el mismo algoritmo que usa el navegador (WHATWG URL) y se mira
// el resultado.
//
// LAS DOS CONDICIONES HACEN FALTA. Con solo la del origen, "/.//evil.example"
// pasa: su origen es el propio y su ruta normalizada es "//evil.example", que
// el navegador vuelve a leer como otro host.
const BASE = 'http://interno.invalid';

export function destinoInterno(volver: FormDataEntryValue | null): string | null {
  if (typeof volver !== 'string' || volver === '' || !URL.canParse(volver, BASE)) {
    return null;
  }

  const url = new URL(volver, BASE);
  if (url.origin !== BASE || url.pathname.startsWith('//')) {
    return null;
  }

  // Sin el hash: nada de lo que arma la puerta de reservar lo usa.
  return url.pathname + url.search;
}
