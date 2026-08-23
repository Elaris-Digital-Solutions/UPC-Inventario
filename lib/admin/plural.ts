// Concordancia de numero para los recuentos de /admin.
//
// POR QUE EXISTE, y no es estilo: la primera version de la tabla de inventario
// escribia `{n} activas` sin mas, y con un producto de UNA sola unidad la
// pantalla decia "1 activas". Lo encontro MIRAR LA PANTALLA: typecheck, lint,
// test y build estaban los cuatro en verde con el defecto dentro, porque ninguna
// herramienta sabe castellano. Ver COMPORTAMIENTO_MEDIDO.md §6.

// `n` primero porque es lo que se lee: "1 activa", "3 activas".
//
// Solo `n === 1` va en singular. El cero va en PLURAL -"0 activas"-, que es lo
// correcto en castellano. El negativo no se contempla: ningun recuento de filas
// puede serlo, y fingir que si obligaria a inventar una respuesta.
export function plural(n: number, singular: string, pluralForma: string): string {
  return `${n} ${n === 1 ? singular : pluralForma}`;
}
