import { describe, expect, it } from 'vitest';

// Import RELATIVO, no `@/lib/reservas/sancion`. El proyecto no tiene
// `vitest.config.ts`, asi que Vitest corre con los valores por defecto y NO
// conoce el alias `@/*` que declara `tsconfig.json`. Escribirlo con alias
// compilaria -`tsc` si lo resuelve- y fallaria solo al ejecutar, que es
// exactamente la clase de fallo que esta tanda tiene que evitar. Misma
// correccion que ya aplico lib/reservas/rejilla.test.ts -correccion 1 del
// plan de esta tanda-.
import { sancionVigente, textoDeSancion } from './sancion';

describe('sancionVigente', () => {
  const ahora = new Date('2026-08-11T00:00:00Z');

  it('sin banned_until (null) no hay sancion', () => {
    expect(sancionVigente(null, ahora)).toBeNull();
  });

  it('"infinity" es una sancion permanente', () => {
    expect(sancionVigente('infinity', ahora)).toEqual({ tipo: 'permanente' });
  });

  it('una fecha futura es una sancion temporal y conserva el instante exacto', () => {
    const futuro = '2026-08-26T04:41:49.669513+00:00'; // formato medido de la columna
    const sancion = sancionVigente(futuro, ahora);
    expect(sancion).toEqual({ tipo: 'temporal', hasta: new Date(futuro) });
  });

  // La caducada: medido contra la RPC que una sancion vencida NO bloquea, la
  // RPC acepta la reserva igual. Esta funcion tiene que estar de acuerdo con
  // eso: es la interfaz alineandose con el motor, no inventando su propia
  // regla.
  it('una fecha pasada no bloquea: la sancion ya caduco', () => {
    const pasado = '2026-08-01T00:00:00.000000+00:00';
    expect(sancionVigente(pasado, ahora)).toBeNull();
  });

  // El borde exacto. La RPC compara con `>` estricto -`banned_until >
  // now()`-, no `>=`, asi que en el instante justo en que vence ya no
  // bloquea. Copiar esa frontera exacta es lo que evita que esta funcion sea
  // MAS restrictiva que el motor.
  it('bannedUntil igual a ahora no bloquea: la RPC usa > estricto, no >=', () => {
    const igual = ahora.toISOString();
    expect(sancionVigente(igual, ahora)).toBeNull();
  });

  it('una cadena que no parsea se trata como sancion permanente -la opcion restrictiva', () => {
    expect(sancionVigente('esto-no-es-una-fecha', ahora)).toEqual({ tipo: 'permanente' });
  });
});

describe('textoDeSancion', () => {
  it('una sancion permanente nunca menciona la palabra "infinity"', () => {
    const texto = textoDeSancion({ tipo: 'permanente' });
    expect(texto.toLowerCase()).not.toContain('infinity');
  });

  it('una sancion temporal incluye la hora, no solo la fecha', () => {
    const texto = textoDeSancion({
      tipo: 'temporal',
      hasta: new Date('2026-08-26T04:41:49.669513+00:00'),
    });
    // Intl.DateTimeFormat con timeStyle: 'short' da algo como "23:41". Si el
    // texto fuera solo la fecha -dateStyle: 'long' a secas-, no apareceria
    // ningun patron hora:minuto en ningun lado del string.
    expect(texto).toMatch(/\d{1,2}:\d{2}/);
  });

  // Regresion de un defecto que se vio EN PANTALLA, no en una prueba: con el
  // formato de 12 horas de `es-PE` la hora termina en "p. m." y chocaba con
  // el punto que cierra la frase, dando "11:41 p. m..". La prueba fija el
  // sintoma -dos puntos seguidos- y no la causa -`hour12`-, para que siga
  // sirviendo si algun dia el texto se reescribe de otra manera.
  it('una sancion temporal no termina en dos puntos seguidos', () => {
    const texto = textoDeSancion({
      tipo: 'temporal',
      hasta: new Date('2026-08-26T04:41:49.669513+00:00'),
    });
    expect(texto).not.toContain('..');
  });

  // La hora se escribe en 24 horas, igual que las franjas del calendario
  // (formatearHora() en components/reservas/calendario.tsx). Dos pantallas
  // contiguas que escriben la hora de forma distinta se leen como dos
  // sistemas distintos.
  it('una sancion temporal usa el formato de 24 horas', () => {
    const texto = textoDeSancion({
      tipo: 'temporal',
      hasta: new Date('2026-08-26T04:41:49.669513+00:00'),
    });
    expect(texto.toLowerCase()).not.toMatch(/[ap]\.\s?m\./);
  });
});
