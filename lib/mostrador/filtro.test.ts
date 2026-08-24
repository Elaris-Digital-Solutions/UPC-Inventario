import { describe, expect, it } from 'vitest';

// Import RELATIVO y no `@/`: bajo Vitest el alias no resuelve.
// Ver MIGRATION_DOCS/COMPORTAMIENTO_MEDIDO.md §5.
import { pasaFiltroFecha } from './filtro';

describe('pasaFiltroFecha', () => {
  // 10:00 en Lima del 12 de agosto -un instante comodo, lejos de cualquier
  // frontera de medianoche, para que las pruebas que NO son sobre la
  // frontera no dependan de ella por accidente.
  const ahora = new Date('2026-08-12T15:00:00Z');

  // Decision 1: el filtro es un TECHO, sin suelo. Una reserva de hace dos
  // dias -la hora ya paso, el alumno no vino- tiene que verse con
  // CUALQUIER opcion, "hoy" incluida: es justo la candidata a "No se
  // retiro", y esconderla haria que esa falta no se pudiera marcar nunca.
  // Es el caso que mas facil se rompe si alguien agrega un suelo "por
  // prolijidad".
  it('una reserva vencida -hace dos dias- pasa los cuatro filtros', () => {
    const vencida = '2026-08-10T15:00:00Z'; // hace dos dias
    expect(pasaFiltroFecha(vencida, ahora, 'hoy')).toBe(true);
    expect(pasaFiltroFecha(vencida, ahora, 'tres_dias')).toBe(true);
    expect(pasaFiltroFecha(vencida, ahora, 'semana')).toBe(true);
    expect(pasaFiltroFecha(vencida, ahora, 'todas')).toBe(true);
  });

  describe('hoy', () => {
    it('acepta una reserva de hoy', () => {
      expect(pasaFiltroFecha('2026-08-12T20:00:00Z', ahora, 'hoy')).toBe(true);
    });

    it('rechaza una reserva de manana', () => {
      expect(pasaFiltroFecha('2026-08-13T15:00:00Z', ahora, 'hoy')).toBe(false);
    });
  });

  describe('tres_dias', () => {
    it('acepta hoy, hoy+1 y hoy+2', () => {
      expect(pasaFiltroFecha('2026-08-12T15:00:00Z', ahora, 'tres_dias')).toBe(true);
      expect(pasaFiltroFecha('2026-08-13T15:00:00Z', ahora, 'tres_dias')).toBe(true);
      expect(pasaFiltroFecha('2026-08-14T15:00:00Z', ahora, 'tres_dias')).toBe(true);
    });

    it('rechaza hoy+3', () => {
      expect(pasaFiltroFecha('2026-08-15T15:00:00Z', ahora, 'tres_dias')).toBe(false);
    });
  });

  describe('semana', () => {
    it('acepta hoy+6', () => {
      expect(pasaFiltroFecha('2026-08-18T15:00:00Z', ahora, 'semana')).toBe(true);
    });

    it('rechaza hoy+7', () => {
      expect(pasaFiltroFecha('2026-08-19T15:00:00Z', ahora, 'semana')).toBe(false);
    });
  });

  describe('todas', () => {
    it('acepta cualquier cosa, incluida una reserva de dentro de un anio', () => {
      expect(pasaFiltroFecha('2027-08-12T15:00:00Z', ahora, 'todas')).toBe(true);
    });
  });

  // La frontera de medianoche en Lima, que es donde esto se rompe de
  // verdad. Lima es UTC-5 y no cambia de hora, asi que las 21:00 del 12 de
  // agosto en Lima son ya las 02:00 del 13 en UTC. Un calculo hecho
  // directamente en UTC -sin pasar por fechaEnLima()- confundiria esta
  // reserva con una de manana y la rechazaria con el filtro "hoy", cuando
  // en Lima sigue siendo hoy. Construido con un instante ISO explicito en
  // `Z`, no con horas locales de la maquina que corre la prueba.
  it('un instante que en UTC ya es el dia siguiente pero en Lima sigue siendo hoy cuenta como hoy', () => {
    const finDelDiaEnLima = '2026-08-13T02:00:00Z'; // 21:00 del 12 en Lima
    expect(pasaFiltroFecha(finDelDiaEnLima, ahora, 'hoy')).toBe(true);
  });
});
