// En que columna del mostrador cae una reserva, como logica pura: sin React y
// sin base de datos. Se puede PROBAR sin montar un escenario, y la regla vive en
// UN SOLO SITIO.

import type { EstadoReserva } from './consultas';

export type Columna = 'por_entregar' | 'activas' | 'por_devolver';

/**
 * En que columna del mostrador (F5) cae una reserva.
 *
 *   - `reserved` -> `por_entregar`.
 *   - `active` con `fin` no alcanzado -> `activas`.
 *   - `active` con `fin` alcanzado -> `por_devolver`.
 *   - Los cuatro estados terminales -> `null`.
 *
 * DEVUELVE `null` Y NO UN CUARTO VALOR DE `Columna`: un cuarto valor obligaria a
 * cada consumidor a manejar una columna que NUNCA se pinta -el mostrador no
 * tiene seccion "otros"-, mientras que `null` dice lo que es y TypeScript obliga
 * a descartarlo antes de usar el resultado. La consulta ya filtra los estados
 * vivos, asi que esa rama no se alcanza hoy: se conserva por ser TOTAL.
 *
 * FRONTERA ESTRICTA (`>`) y no `>=` como escribia el plan, por COHERENCIA con
 * grupoDeReserva(): en el instante en que `fin` alcanza a `ahora` la franja ya
 * termino. Que dos funciones del mismo proyecto partieran el mismo instante en
 * direcciones opuestas seria justo el genero de inconsistencia a evitar.
 *
 * `ahora` se RECIBE: leer el reloj del sistema impide probar el borde exacto,
 * que es justo el caso que separa `activas` de `por_devolver`.
 */
export function columnaDeReserva(estado: EstadoReserva, fin: string, ahora: Date): Columna | null {
  if (estado === 'reserved') {
    return 'por_entregar';
  }

  if (estado === 'active') {
    const finFecha = new Date(fin);
    return finFecha > ahora ? 'activas' : 'por_devolver';
  }

  // Los cuatro estados terminales. Ninguno va en el mostrador.
  return null;
}
