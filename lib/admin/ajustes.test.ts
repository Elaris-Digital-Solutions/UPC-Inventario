import { describe, expect, it } from 'vitest';

// Import RELATIVO y no `@/`: bajo Vitest el alias no resuelve.
// Ver MIGRATION_DOCS/COMPORTAMIENTO_MEDIDO.md §5.
import { aperturaDesalineada, multiplosDeSlot, productosDesalineados } from './ajustes';

describe('multiplosDeSlot', () => {
  it('con slot de 30 y tope 480 ofrece 0, 30, 60 ... 480', () => {
    const r = multiplosDeSlot(30, 480);
    expect(r[0]).toBe(0);
    expect(r[1]).toBe(30);
    expect(r.at(-1)).toBe(480);
    expect(r).toHaveLength(17);
  });

  it('incluye el 0: un buffer de cero es valido y el check lo permite', () => {
    expect(multiplosDeSlot(30, 480)).toContain(0);
  });

  it('con slot de 20 el 120 real de produccion sigue siendo multiplo', () => {
    expect(multiplosDeSlot(20, 480)).toContain(120);
  });

  it('con slot de 20 el 30 deja de serlo, que es justo lo que Q-14 describe', () => {
    expect(multiplosDeSlot(20, 480)).not.toContain(30);
  });

  it('nunca pasa del tope: 480 es el check de buffer_minutes', () => {
    expect(Math.max(...multiplosDeSlot(60, 480))).toBe(480);
  });
});

// Las tres pruebas de esta seccion se copian TAL CUAL las escribio el plan
// -ver el plan de la F2-T3B-, comentarios
// incluidos: son las pruebas que se pensaron ANTES de escribir la funcion.
describe('productosDesalineados', () => {
  // Los OCHO valores que el check `60 % slot_minutes = 0` permite, con el rango
  // 5..60. Medido contra el esquema el 2026-08-12.
  const SLOTS_LEGALES = [5, 6, 10, 12, 15, 20, 30, 60];

  it('el buffer 120 de los 34 productos reales resiste los OCHO slots legales', () => {
    // Contraintuitivo y medido: 120 es divisible por los ocho, asi que con los
    // datos de HOY ningun cambio legal de slot_minutes desalinea el catalogo.
    const p = [{ id: 'a', nombre: 'Laptop', bufferMinutos: 120 }];
    for (const s of SLOTS_LEGALES) {
      expect(productosDesalineados(p, s)).toHaveLength(0);
    }
  });

  it('un buffer de 30 SI se rompe, y con tres de los ocho: 12, 20 y 60', () => {
    // El caso que el alta permite crear -- con slot 30, un buffer de 30 es
    // valido -- y que hace falta la comprobacion. Es el ejemplo de
    // MIGRATION_DOCS/FASE_2_DISENO.md:711.
    const p = [{ id: 'a', nombre: 'Tripode', bufferMinutos: 30 }];
    const rompen = SLOTS_LEGALES.filter((s) => productosDesalineados(p, s).length === 1);
    expect(rompen).toEqual([12, 20, 60]);
  });

  it('un buffer de 0 nunca desalinea', () => {
    const p = [{ id: 'a', nombre: 'Cable', bufferMinutos: 0 }];
    expect(productosDesalineados(p, 20)).toHaveLength(0);
  });
});

// D-54, y no las pide el plan -ver el comentario de aperturaDesalineada() en
// ajustes.ts para el porque completo-.
describe('aperturaDesalineada', () => {
  const SLOTS_LEGALES = [5, 6, 10, 12, 15, 20, 30, 60];

  it('08:00 esta alineada con los ocho slots legales: los minutos son 0', () => {
    for (const s of SLOTS_LEGALES) {
      expect(aperturaDesalineada('08:00', s)).toBe(false);
    }
  });

  it('09:10 desalinea con 6, 12, 15, 20, 30 y 60, pero alinea con 5 y 10', () => {
    // Medido: es el caso que separa una formula que mira los MINUTOS de una
    // que solo mira si la hora es "en punto". 10 no es multiplo de ninguno de
    // los seis primeros, y si lo es de 5 y de 10.
    const desalineanCon = [6, 12, 15, 20, 30, 60];
    const alineanCon = [5, 10];

    for (const s of desalineanCon) {
      expect(aperturaDesalineada('09:10', s)).toBe(true);
    }
    for (const s of alineanCon) {
      expect(aperturaDesalineada('09:10', s)).toBe(false);
    }
  });

  it('el formato con segundos, "08:00:00", sigue alineado', () => {
    expect(aperturaDesalineada('08:00:00', 30)).toBe(false);
  });

  it('"08:00:30" desalinea por los segundos, aunque los minutos si cuadren', () => {
    expect(aperturaDesalineada('08:00:30', 30)).toBe(true);
  });

  it('una cadena que no parsea a hora se trata como desalineada, el lado seguro', () => {
    expect(aperturaDesalineada('no-es-una-hora', 30)).toBe(true);
  });

  // Las tres pruebas siguientes destapan un borde que la version anterior de
  // la funcion no cubria, y NO se encontro leyendo el codigo sino corriendo
  // `node -e` sobre la implementacion. La causa: `Number('')` da `0`, un
  // numero FINITO, asi que una parte VACIA de la cadena -"08:" separa en
  // `["08", ""]`, "::" separa en `["", "", ""]`- pasaba el chequeo anterior
  // basado en `Number.isFinite()` y se leia como minuto o segundo CERO, es
  // decir "alineada". La prueba de 'no-es-una-hora' de arriba NO distinguia
  // este caso: pasa por tener LETRAS, y da `true` por un motivo correcto que
  // dejaba este borde -partes vacias, sin letras- sin cubrir.
  it('"08:" -- minuto vacio -- se trata como desalineada, no como minuto 0', () => {
    expect(aperturaDesalineada('08:', 30)).toBe(true);
  });

  it('"::" -- las tres partes vacias -- se trata como desalineada', () => {
    expect(aperturaDesalineada('::', 30)).toBe(true);
  });

  it('"08:00:" -- segundo vacio -- se trata como desalineada, no como segundo 0', () => {
    expect(aperturaDesalineada('08:00:', 30)).toBe(true);
  });
});
