import { describe, expect, it } from 'vitest';

// Import RELATIVO, no `@/lib/mostrador/columnas`. El proyecto no tiene
// `vitest.config.ts`, asi que Vitest corre con los valores por defecto y NO
// conoce el alias `@/*` que declara `tsconfig.json`. Misma correccion que ya
// aplican lib/reservas/rejilla.test.ts, lib/reservas/sancion.test.ts y
// lib/reservas/agrupar.test.ts.
import { columnaDeReserva } from './columnas';

describe('columnaDeReserva', () => {
  const ahora = new Date('2026-08-12T00:00:00Z');
  const futuro = '2026-08-20T00:00:00Z';
  const pasado = '2026-08-01T00:00:00Z';

  it('reserved va a por_entregar, sin mirar la fecha', () => {
    expect(columnaDeReserva('reserved', futuro, ahora)).toBe('por_entregar');
    expect(columnaDeReserva('reserved', pasado, ahora)).toBe('por_entregar');
  });

  it('active con fin en el futuro va a activas', () => {
    expect(columnaDeReserva('active', futuro, ahora)).toBe('activas');
  });

  it('active con fin ya pasado va a por_devolver', () => {
    expect(columnaDeReserva('active', pasado, ahora)).toBe('por_devolver');
  });

  // El borde exacto: `fin` igual a `ahora`. La comparacion es estricta (`>`),
  // asi que en el instante justo en que termina la franja ya no queda tiempo
  // dentro de ella y cae a `por_devolver`, no a `activas` -a proposito
  // distinto de lo que dice el plan (`>=`); ver el comentario de
  // columnaDeReserva() en columnas.ts para el porque.
  it('active con fin exactamente igual a ahora cae en por_devolver, no en activas', () => {
    const limite = ahora.toISOString();
    expect(columnaDeReserva('active', limite, ahora)).toBe('por_devolver');
  });

  // Los cuatro estados terminales: ninguno va en el mostrador. Uno solo
  // basta para cubrir la rama -los otros tres pasan por el mismo `return
  // null` final-, pero se prueban los cuatro para que quede escrito que
  // NINGUNO es una excepcion.
  it('cancelled no va en ninguna columna', () => {
    expect(columnaDeReserva('cancelled', futuro, ahora)).toBeNull();
  });

  it('completed no va en ninguna columna', () => {
    expect(columnaDeReserva('completed', futuro, ahora)).toBeNull();
  });

  it('not_picked_up no va en ninguna columna', () => {
    expect(columnaDeReserva('not_picked_up', futuro, ahora)).toBeNull();
  });

  it('not_returned no va en ninguna columna', () => {
    expect(columnaDeReserva('not_returned', futuro, ahora)).toBeNull();
  });
});
