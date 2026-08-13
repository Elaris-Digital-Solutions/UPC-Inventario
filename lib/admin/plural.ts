// Concordancia de numero para los recuentos de las pantallas de /admin.
//
// POR QUE EXISTE, y no es una preferencia de estilo: la primera version de
// components/admin/tabla-inventario.tsx escribia `{n} activas` sin mas, y con
// el seed local -que tiene un producto con UNA sola unidad activa- la pantalla
// decia "1 activas". Lo encontro MIRAR LA PANTALLA: `typecheck`, `lint`,
// `test` y `build` estaban los cuatro en verde con el defecto dentro, porque
// ninguna herramienta sabe castellano. Es el mismo genero que "se entrego"
// (T2B), "11:41 p. m.." (T2B) y "quedara bloqueado" con nombre de alumna
// interpolado (T3A): defectos de texto que solo aparecen leyendo.
//
// SE EXTRAE AHORA Y NO ANTES. El proyecto ya evito una vez generalizar con un
// unico caso real -- ver el comentario de dialogo-cancelar.tsx en la T2B, y el
// de insertarNota() en la T3A, que espero a tener DOS consumidores --. Aca no
// se esta adivinando un segundo caso: hay CUATRO recuentos en esa misma tabla
// el dia que se escribe, dos de ellos con plural variable ("activa/activas" y
// "retirada/retiradas") y dos invariables ("en mantenimiento", "sin codigo").
//
// IMPORTS RELATIVOS EN QUIEN LO PRUEBE: este modulo lo carga un test, y Vitest
// no conoce el alias `@/` -- no hay vitest.config.ts, medido en la Task 8 de la
// T3A --. Este archivo no importa nada, asi que no le aplica; su test si lo
// importa relativo.

// `n` primero porque es lo que se lee: "1 activa", "3 activas".
//
// Solo `n === 1` va en singular. El cero va en PLURAL -- "0 activas" -- que es
// lo correcto en castellano y ademas lo que ya hacen las demas pantallas del
// proyecto. El negativo no se contempla: ningun recuento de filas puede serlo,
// y fingir que si obligaria a inventar una respuesta para algo que no ocurre.
export function plural(n: number, singular: string, pluralForma: string): string {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}
