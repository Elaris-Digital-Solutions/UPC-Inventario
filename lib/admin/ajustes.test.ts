import { describe, expect, it } from 'vitest';

// Import RELATIVO y no `@/lib/admin/ajustes`: Vitest no conoce el alias que
// declara tsconfig.json -no hay vitest.config.ts-, y el modo de fallo es el
// peligroso: `typecheck` y `build` pasan en verde con el alias y solo
// `vitest run` se rompe. Medido en la Task 8 de la tanda 3A.
import { multiplosDeSlot } from './ajustes';

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
