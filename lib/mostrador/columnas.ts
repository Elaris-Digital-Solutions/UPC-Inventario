// En que columna del mostrador cae una reserva, como logica pura: sin React
// y sin base de datos, mismo espiritu que lib/reservas/agrupar.ts. Se puede
// PROBAR sin montar un escenario en la base, y "en que columna cae esta
// reserva" se decide en UN SOLO SITIO -este-, no en cada pantalla que
// necesite pintar el mostrador.

import type { EstadoReserva } from './consultas';

export type Columna = 'por_entregar' | 'activas' | 'por_devolver';

/**
 * En que columna del mostrador (F5 de ESPECIFICACION_FUNCIONAL.md) cae una
 * reserva.
 *
 * La regla:
 *
 *   - `reserved` -> `por_entregar`.
 *   - `active` con `fin` todavia no alcanzado -> `activas`.
 *   - `active` con `fin` ya alcanzado -> `por_devolver`.
 *   - Cualquier otro estado -los cuatro terminales: `cancelled`, `completed`,
 *     `not_picked_up`, `not_returned`- no va en ninguna columna del
 *     mostrador. La funcion tiene que ser TOTAL -cubrir los seis valores del
 *     enum, no solo los dos que se esperan- porque el tipo de entrada es
 *     `EstadoReserva` entero, asi que se devuelve `null` en vez de agregar un
 *     cuarto valor a `Columna`: un cuarto valor obligaria a cada consumidor a
 *     manejar una columna que NUNCA se pinta -el mostrador no tiene una
 *     seccion "otros"-, mientras que `null` dice exactamente lo que es, "no
 *     va en ninguna columna", y typescript obliga a descartarlo antes de usar
 *     el resultado como `Columna`. La consulta de lib/mostrador/consultas.ts
 *     ya filtra `status in ('reserved', 'active')`, asi que en la practica
 *     esta rama no se alcanza hoy -se conserva por ser TOTAL, no porque se
 *     espere verla-.
 *
 * LA FRONTERA, decision tomada y no discutida aca: el plan de la tanda
 * (`MIGRATION_DOCS/PLANES/FASE_2_TANDA_3A.md`, Task 4) escribe las columnas
 * como "`activas` (`active` y fin >= ahora), `por_devolver` (`active` y fin <
 * ahora)" -con `>=`-. Esta funcion usa `>` ESTRICTO en su lugar: `fin > ahora`
 * -> `activas`, `fin <= ahora` -> `por_devolver`. El motivo es COHERENCIA con
 * `grupoDeReserva()` de lib/reservas/agrupar.ts, que ya parte el mismo tipo de
 * frontera -`fin` contra `ahora`- con `finFecha > ahora`, y su comentario
 * explica por que estricto: en el instante exacto en que `fin` alcanza a
 * `ahora`, la franja ya termino -no queda ningun segundo dentro de ella-, asi
 * que ese instante cae del lado de "ya paso" y no del lado de "todavia
 * vigente". Que dos funciones del mismo proyecto partieran el mismo instante
 * en direcciones opuestas -una `>=` y otra `>`- seria justo el genero de
 * inconsistencia que este proyecto persigue, asi que se corrige aca en vez de
 * copiar la redaccion literal del plan.
 *
 * `ahora` se RECIBE y no se calcula aca con `new Date()`, por el mismo motivo
 * que ya documentan `grupoDeReserva()`, `sancionVigente()` (lib/reservas/sancion.ts)
 * y `hoyEnLima()` (lib/reservas/rejilla.ts): una funcion que lee el reloj del
 * sistema no se puede probar en el borde exacto -`fin` igual a `ahora`-, que
 * es justo el caso que separa `activas` de `por_devolver`.
 */
export function columnaDeReserva(estado: EstadoReserva, fin: string, ahora: Date): Columna | null {
  if (estado === 'reserved') {
    return 'por_entregar';
  }

  if (estado === 'active') {
    const finFecha = new Date(fin);
    return finFecha > ahora ? 'activas' : 'por_devolver';
  }

  // 'cancelled' | 'completed' | 'not_picked_up' | 'not_returned': los cuatro
  // estados terminales del motor. Ninguno va en el mostrador.
  return null;
}
