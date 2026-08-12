import { describe, expect, it } from 'vitest';

// Import RELATIVO, no `@/lib/reservas/agrupar`. El proyecto no tiene
// `vitest.config.ts`, asi que Vitest corre con los valores por defecto y NO
// conoce el alias `@/*` que declara `tsconfig.json`. Misma correccion que ya
// aplicaron lib/reservas/rejilla.test.ts y lib/reservas/sancion.test.ts.
import { etiquetaDeEstado, grupoDeReserva } from './agrupar';

describe('grupoDeReserva', () => {
  const ahora = new Date('2026-08-11T00:00:00Z');
  const futuro = '2026-08-20T00:00:00Z';
  const pasado = '2026-08-01T00:00:00Z';

  it('active siempre es en_curso, sin importar la fecha de fin', () => {
    expect(grupoDeReserva('active', futuro, ahora)).toBe('en_curso');
    // Incluso con `fin` ya pasado: el motor la marco `active` -el alumno
    // recogio el equipo- y esta funcion no se pone a discutir esa fecha.
    expect(grupoDeReserva('active', pasado, ahora)).toBe('en_curso');
  });

  it('reserved con fin en el futuro es proxima', () => {
    expect(grupoDeReserva('reserved', futuro, ahora)).toBe('proxima');
  });

  // El caso que la tarea pide explicitamente: una reserva que nadie recogio
  // y cuya franja ya termino. Sigue en `reserved` en la base -cerrarla es
  // trabajo del personal, T3- pero ya no tiene sentido ofrecerla como
  // "proxima": el alumno no puede recogerla.
  it('reserved con fin ya pasado cae en pasada, no en proxima', () => {
    expect(grupoDeReserva('reserved', pasado, ahora)).toBe('pasada');
  });

  // El borde exacto: `fin` igual a `ahora`. La comparacion es estricta
  // (`>`), asi que en el instante justo en que termina la franja ya no
  // queda tiempo dentro de ella y cae a pasada.
  it('reserved con fin exactamente igual a ahora cae en pasada', () => {
    const limite = ahora.toISOString();
    expect(grupoDeReserva('reserved', limite, ahora)).toBe('pasada');
  });

  it('cancelled es pasada', () => {
    expect(grupoDeReserva('cancelled', futuro, ahora)).toBe('pasada');
  });

  it('completed es pasada', () => {
    expect(grupoDeReserva('completed', futuro, ahora)).toBe('pasada');
  });

  it('not_picked_up es pasada', () => {
    expect(grupoDeReserva('not_picked_up', futuro, ahora)).toBe('pasada');
  });

  it('not_returned es pasada', () => {
    expect(grupoDeReserva('not_returned', futuro, ahora)).toBe('pasada');
  });
});

describe('etiquetaDeEstado', () => {
  // Los SEIS valores del enum, uno por uno: no un bucle sobre un array
  // escrito a mano, porque ese array seria la misma segunda lista que
  // EstadoReserva (lib/reservas/consultas.ts) evita al salir del tipo
  // generado. Aca se escriben literales sueltos a proposito.
  it('reserved tiene una etiqueta no vacia', () => {
    expect(etiquetaDeEstado('reserved')).not.toBe('');
  });

  it('active tiene una etiqueta no vacia', () => {
    expect(etiquetaDeEstado('active')).not.toBe('');
  });

  it('cancelled tiene una etiqueta no vacia', () => {
    expect(etiquetaDeEstado('cancelled')).not.toBe('');
  });

  it('completed tiene una etiqueta no vacia', () => {
    expect(etiquetaDeEstado('completed')).not.toBe('');
  });

  it('not_picked_up tiene una etiqueta no vacia', () => {
    expect(etiquetaDeEstado('not_picked_up')).not.toBe('');
  });

  it('not_returned tiene una etiqueta no vacia', () => {
    expect(etiquetaDeEstado('not_returned')).not.toBe('');
  });
});
