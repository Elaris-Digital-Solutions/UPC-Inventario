import { describe, expect, it } from 'vitest';

// IMPORTS RELATIVOS, no `@/lib/admin/estadisticas`: no hay vitest.config.ts,
// asi que Vitest no conoce el alias que declara tsconfig.json. Mismo motivo
// que ya dejo escrito filtros.test.ts en la Task 8 de la tanda 3A.
import {
  calcularEstadisticas,
  contarPorEstado,
  desglosePorDiaDeSemana,
  diaDeSemanaEnLima,
  prestamosDeLaSemana,
  type ReservaContable,
} from './estadisticas';

// LO QUE EL HECHO MEDIDO SOBRE ESTA MAQUINA IMPLICA PARA LAS PRUEBAS DE ABAJO,
// dicho antes de escribirlas: la maquina de desarrollo de este proyecto corre
// en UTC-5 -la misma diferencia horaria que America/Lima-, asi que el caso
// del domingo, un poco mas abajo, PASARIA EN VERDE IGUAL si diaDeSemanaEnLima()
// usara `getDay()` sobre el instante crudo en vez de `getUTCDay()` sobre la
// fecha ya trasladada por fechaEnLima(). MEDIDO EL 2026-08-13 con `TZ=UTC`
// -la zona en la que corren el CI y el servidor de produccion-: sobre el
// mismo instante, esa version incorrecta da lunes en vez de domingo. Quien
// destapa ese defecto no es esta prueba corriendo en esta maquina: es el CI.
// La funcion probada aca nunca usa `getDay()` ni `getUTCDay()` sobre un
// instante crudo -ver el comentario de diaDeSemanaEnLima() en
// ./estadisticas.ts-, asi que pasa por el motivo correcto; pero que la
// prueba este en verde en esta maquina NO lo demuestra por si solo, y por
// eso queda dicho aca en prosa ademas de en el codigo.

function reserva(inicio: string, estado: ReservaContable['estado']): ReservaContable {
  return { inicio, estado };
}

describe('contarPorEstado', () => {
  it('sobre un array vacio devuelve los seis estados en cero', () => {
    expect(contarPorEstado([])).toEqual({
      reserved: 0,
      active: 0,
      completed: 0,
      cancelled: 0,
      not_picked_up: 0,
      not_returned: 0,
    });
  });

  it('con los seis estados presentes cuenta uno cada uno', () => {
    const reservas: ReservaContable[] = [
      reserva('2026-08-01T15:00:00Z', 'reserved'),
      reserva('2026-08-01T15:00:00Z', 'active'),
      reserva('2026-08-01T15:00:00Z', 'completed'),
      reserva('2026-08-01T15:00:00Z', 'cancelled'),
      reserva('2026-08-01T15:00:00Z', 'not_picked_up'),
      reserva('2026-08-01T15:00:00Z', 'not_returned'),
    ];

    expect(contarPorEstado(reservas)).toEqual({
      reserved: 1,
      active: 1,
      completed: 1,
      cancelled: 1,
      not_picked_up: 1,
      not_returned: 1,
    });
  });

  it('la suma de los seis contadores es igual al numero de reservas (D-51)', () => {
    const reservas: ReservaContable[] = [
      reserva('2026-08-01T15:00:00Z', 'reserved'),
      reserva('2026-08-02T15:00:00Z', 'reserved'),
      reserva('2026-08-03T15:00:00Z', 'active'),
      reserva('2026-08-04T15:00:00Z', 'cancelled'),
      reserva('2026-08-05T15:00:00Z', 'cancelled'),
      reserva('2026-08-06T15:00:00Z', 'cancelled'),
    ];

    const contadores = contarPorEstado(reservas);
    const suma = Object.values(contadores).reduce((total, n) => total + n, 0);

    expect(suma).toBe(reservas.length);
  });
});

describe('diaDeSemanaEnLima', () => {
  // Medido con node antes de escribir el codigo: fechaEnLima() sobre este
  // instante da '2026-08-16', y ese dia civil cae en domingo. Es el caso que
  // registra el comentario de la funcion.
  it("sobre '2026-08-17T02:00:00Z' devuelve 'domingo'", () => {
    expect(diaDeSemanaEnLima('2026-08-17T02:00:00Z')).toBe('domingo');
  });

  // El otro lado de la misma frontera: medido con node, cinco horas despues
  // -05:00Z- la fecha civil en Lima ya avanzo a '2026-08-17', que es lunes.
  it("sobre '2026-08-17T05:00:00Z' devuelve 'lunes'", () => {
    expect(diaDeSemanaEnLima('2026-08-17T05:00:00Z')).toBe('lunes');
  });
});

describe('prestamosDeLaSemana', () => {
  // '2026-08-13T15:00:00Z' es 2026-08-13 a las 10:00 en Lima -mismo dia
  // civil en las dos zonas-, elegido para que "hoy" no dependa de ninguna
  // frontera de medianoche: esa frontera ya la cubre diaDeSemanaEnLima() de
  // arriba.
  const AHORA = new Date('2026-08-13T15:00:00Z');

  it('cuenta una reserva de hoy', () => {
    const reservas = [reserva('2026-08-13T18:00:00Z', 'active')];
    expect(prestamosDeLaSemana(reservas, AHORA)).toBe(1);
  });

  it('cuenta una de hace exactamente 6 dias e ignora una de hace 7', () => {
    // El suelo de la ventana -hoy menos 6 dias civiles- es 2026-08-07,
    // medido con sumarDias(): incluido. Un dia antes, 2026-08-06: excluido.
    const reservas = [
      reserva('2026-08-07T15:00:00Z', 'completed'),
      reserva('2026-08-06T15:00:00Z', 'active'),
    ];

    expect(prestamosDeLaSemana(reservas, AHORA)).toBe(1);
  });

  it('ignora una reserva del futuro', () => {
    const reservas = [reserva('2026-08-14T15:00:00Z', 'active')];
    expect(prestamosDeLaSemana(reservas, AHORA)).toBe(0);
  });

  it('ignora cancelled y not_picked_up aunque caigan dentro de la ventana', () => {
    const reservas = [
      reserva('2026-08-13T18:00:00Z', 'cancelled'),
      reserva('2026-08-13T18:00:00Z', 'not_picked_up'),
    ];

    expect(prestamosDeLaSemana(reservas, AHORA)).toBe(0);
  });
});

describe('desglosePorDiaDeSemana', () => {
  it('ignora cancelled y not_picked_up', () => {
    const reservas = [
      reserva('2026-08-13T18:00:00Z', 'cancelled'),
      reserva('2026-08-14T18:00:00Z', 'not_picked_up'),
    ];

    const porDia = desglosePorDiaDeSemana(reservas);
    const suma = Object.values(porDia).reduce((total, n) => total + n, 0);

    expect(suma).toBe(0);
  });

  it('acumula dos reservas del mismo dia de la semana en semanas distintas (D-50)', () => {
    // Los dos instantes son jueves en Lima -medido con node antes de
    // escribir la prueba: '2026-08-13' y '2026-08-20' caen los dos en
    // jueves-, con una semana entera de diferencia entre uno y otro.
    const reservas = [
      reserva('2026-08-13T18:00:00Z', 'active'),
      reserva('2026-08-20T18:00:00Z', 'completed'),
    ];

    expect(desglosePorDiaDeSemana(reservas).jueves).toBe(2);
  });
});

describe('calcularEstadisticas', () => {
  it('junta los tres agregados en un solo objeto', () => {
    const ahora = new Date('2026-08-13T15:00:00Z');
    const reservas = [reserva('2026-08-13T18:00:00Z', 'active')];

    const resultado = calcularEstadisticas(reservas, ahora);

    expect(resultado.registradas).toBe(1);
    expect(resultado.porEstado.active).toBe(1);
    expect(resultado.prestamosSemana).toBe(1);
    expect(resultado.porDia.jueves).toBe(1);
  });
});
