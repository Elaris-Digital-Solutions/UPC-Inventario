import { describe, expect, it, vi } from 'vitest';

// Sin el SDK real: con el, `npm test` pasa de 2 a 27 s (reportar.test.ts).
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn() }));

import * as Sentry from '@sentry/nextjs';

import { rechazoDeFirma } from './rechazo';

describe('rechazoDeFirma', () => {
  it('el tope de firmas (54000) es un 429 y no un incidente', () => {
    vi.mocked(Sentry.captureException).mockClear();

    expect(rechazoDeFirma({ code: '54000', message: 'Demasiadas subidas en la ultima hora' }).status).toBe(429);
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('quien no es admin (42501) recibe un 403 y no es un incidente', () => {
    vi.mocked(Sentry.captureException).mockClear();

    const respuesta = rechazoDeFirma({ code: '42501', message: 'Solo un administrador sube imagenes' });

    expect(respuesta).toEqual({ status: 403, error: 'Solo un administrador puede subir imágenes.' });
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  // Antes, esto le decia a un admin legitimo "Solo un administrador puede
  // subir imagenes" y no quedaba rastro en ninguna parte.
  it('cualquier otro fallo es un 500 con codigo de referencia, y SI se reporta', () => {
    vi.mocked(Sentry.captureException).mockClear();

    const respuesta = rechazoDeFirma({ code: '57014', message: 'canceling statement due to statement timeout' });

    expect(respuesta.status).toBe(500);
    expect(respuesta.error).toMatch(/Código de referencia: [0-9a-f]{8}$/);
    expect(respuesta.error).not.toContain('statement timeout');
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('un fallo de red, que llega sin code, tambien se reporta', () => {
    vi.mocked(Sentry.captureException).mockClear();

    expect(rechazoDeFirma({ message: 'TypeError: fetch failed' }).status).toBe(500);
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
