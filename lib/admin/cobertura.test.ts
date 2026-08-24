import { describe, expect, it } from 'vitest';

import { coberturaDeLaSemana } from './cobertura';

// D-76. Lo que estas pruebas cierran no es la aritmetica sino la DISTINCION:
// que "cerrado" y "sin operador" no salgan iguales, que es exactamente el fallo
// que D-76 existe para hacer visible.
//
// El 2026-08-24 es LUNES, comprobado y no recordado: Date.UTC(2026, 7, 24)
// cae en weekday 1. Todas las fechas de abajo salen de ahi.

const SEDE = 'sede-1';

function sedeCon(dias: Record<number, { apertura: string; cierre: string } | null>) {
  return [{ id: SEDE, dias }];
}

const LUNES = '2026-08-24';

describe('coberturaDeLaSemana', () => {
  it('un dia sin fila de horario es CERRADO y no "sin operador"', () => {
    const [dia] = coberturaDeLaSemana(sedeCon({ 1: null }), [], LUNES, 1);

    expect(dia.forma).toBe('cerrado');
    expect(dia.weekday).toBe(1);
    expect(dia.fecha).toBe(LUNES);
  });

  it('un dia con horario y sin ningun turno es SIN OPERADOR', () => {
    const [dia] = coberturaDeLaSemana(
      sedeCon({ 1: { apertura: '08:00:00', cierre: '22:00:00' } }),
      [],
      LUNES,
      1,
    );

    // El control que hace valer la prueba anterior: mismo dia, misma sede, y la
    // UNICA diferencia es que hay fila de horario. Si las dos formas salieran
    // iguales, D-76 no estaria implementado.
    expect(dia.forma).toBe('sin-operador');
  });

  it('un turno que cubre el horario entero deja el dia CUBIERTO', () => {
    const [dia] = coberturaDeLaSemana(
      sedeCon({ 1: { apertura: '08:00:00', cierre: '22:00:00' } }),
      [{ campusId: SEDE, weekday: 1, inicio: '08:00:00', fin: '22:00:00' }],
      LUNES,
      1,
    );

    expect(dia.forma).toBe('cubierto');
    expect(dia.minutosDescubiertos).toBe(0);
  });

  it('dos turnos CONSECUTIVOS cubren su union, sin hueco entre ellos', () => {
    const [dia] = coberturaDeLaSemana(
      sedeCon({ 1: { apertura: '08:00:00', cierre: '16:00:00' } }),
      [
        { campusId: SEDE, weekday: 1, inicio: '08:00:00', fin: '12:00:00' },
        { campusId: SEDE, weekday: 1, inicio: '12:00:00', fin: '16:00:00' },
      ],
      LUNES,
      1,
    );

    expect(dia.forma).toBe('cubierto');
  });

  it('dos turnos SOLAPADOS no suman dos veces el tramo comun', () => {
    // 08:00-12:00 y 10:00-14:00 sobre un techo de 08:00-16:00. Contando por
    // separado darian 4 h + 4 h = 8 h y el dia saldria cubierto; la union son
    // 6 h y quedan 120 minutos sin cubrir. Es el mismo error de recuento que
    // D-92 persigue, en su version aritmetica.
    const [dia] = coberturaDeLaSemana(
      sedeCon({ 1: { apertura: '08:00:00', cierre: '16:00:00' } }),
      [
        { campusId: SEDE, weekday: 1, inicio: '08:00:00', fin: '12:00:00' },
        { campusId: SEDE, weekday: 1, inicio: '10:00:00', fin: '14:00:00' },
      ],
      LUNES,
      1,
    );

    expect(dia.forma).toBe('parcial');
    expect(dia.minutosDescubiertos).toBe(120);
  });

  it('un hueco entre dos turnos se cuenta al minuto', () => {
    const [dia] = coberturaDeLaSemana(
      sedeCon({ 1: { apertura: '08:00:00', cierre: '16:00:00' } }),
      [
        { campusId: SEDE, weekday: 1, inicio: '08:00:00', fin: '11:00:00' },
        { campusId: SEDE, weekday: 1, inicio: '12:00:00', fin: '16:00:00' },
      ],
      LUNES,
      1,
    );

    expect(dia.forma).toBe('parcial');
    expect(dia.minutosDescubiertos).toBe(60);
  });

  it('un turno que se pasa del techo se RECORTA y no lo levanta (D-74)', () => {
    const [dia] = coberturaDeLaSemana(
      sedeCon({ 1: { apertura: '09:00:00', cierre: '13:00:00' } }),
      [{ campusId: SEDE, weekday: 1, inicio: '06:00:00', fin: '23:00:00' }],
      LUNES,
      1,
    );

    expect(dia.forma).toBe('cubierto');
    expect(dia.minutosDescubiertos).toBe(0);
  });

  it('los turnos de OTRA sede o de OTRO dia no cuentan', () => {
    const [dia] = coberturaDeLaSemana(
      sedeCon({ 1: { apertura: '08:00:00', cierre: '22:00:00' } }),
      [
        { campusId: 'otra-sede', weekday: 1, inicio: '08:00:00', fin: '22:00:00' },
        { campusId: SEDE, weekday: 2, inicio: '08:00:00', fin: '22:00:00' },
      ],
      LUNES,
      1,
    );

    expect(dia.forma).toBe('sin-operador');
  });

  it('recorre la ventana entera y avanza el dia de la semana', () => {
    const dias = coberturaDeLaSemana(
      sedeCon({ 1: { apertura: '08:00:00', cierre: '22:00:00' }, 3: null }),
      [{ campusId: SEDE, weekday: 1, inicio: '08:00:00', fin: '22:00:00' }],
      LUNES,
      7,
    );

    expect(dias).toHaveLength(7);
    expect(dias.map((d) => d.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
    // El lunes esta cubierto, el miercoles es null -cerrado- y los demas no
    // tienen fila declarada, o sea que tambien son "cerrado".
    expect(dias[0].forma).toBe('cubierto');
    expect(dias[2].forma).toBe('cerrado');
    expect(dias[6].fecha).toBe('2026-08-30');
  });
});
