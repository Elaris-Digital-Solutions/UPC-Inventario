import { describe, expect, it } from 'vitest';

// Import RELATIVO y no `@/`: bajo Vitest el alias no resuelve.
// Ver MIGRATION_DOCS/COMPORTAMIENTO_MEDIDO.md §5.
import { plural } from './plural';

describe('plural', () => {
  // La regresion exacta que se vio en pantalla el 2026-08-12: el seed tiene un
  // producto con UNA sola unidad activa, y la tabla decia "1 activas".
  it('con 1 va en singular: el defecto "1 activas" que se vio en pantalla', () => {
    expect(plural(1, 'activa', 'activas')).toBe('1 activa');
  });

  it('con mas de 1 va en plural', () => {
    expect(plural(3, 'activa', 'activas')).toBe('3 activas');
  });

  // El cero es PLURAL en castellano, no singular. Es el caso que se escribe
  // mal por analogia con el ingles.
  it('con 0 va en plural, no en singular', () => {
    expect(plural(0, 'activa', 'activas')).toBe('0 activas');
  });

  it('sirve para el otro recuento variable de la tabla', () => {
    expect(plural(1, 'retirada', 'retiradas')).toBe('1 retirada');
    expect(plural(2, 'retirada', 'retiradas')).toBe('2 retiradas');
  });

  // Un sustantivo invariable se pasa dos veces igual y no rompe nada. Importa
  // porque las otras dos insignias de la tabla -- "en mantenimiento" y "sin
  // codigo" -- NO usan esta funcion, y este caso deja escrito que podrian.
  it('admite una forma invariable pasandola dos veces', () => {
    expect(plural(1, 'sin código', 'sin código')).toBe('1 sin código');
  });
});
