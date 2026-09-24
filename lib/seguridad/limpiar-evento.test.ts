import type { ErrorEvent } from '@sentry/nextjs';
import { describe, expect, it } from 'vitest';

import { limpiarEvento } from './limpiar-evento';

const TOKEN = 'pkce_0123456789abcdef';

// Un evento como el que arma captureRequestError() de @sentry/nextjs 10.70 al
// fallar /auth/confirm: `request.path` de Next trae la query (H-17).
function eventoDeConfirm(): ErrorEvent {
  return {
    type: undefined,
    request: {
      url: `https://dispositivos.ccnode.net/auth/confirm?token_hash=${TOKEN}&type=email`,
      query_string: `token_hash=${TOKEN}&type=email`,
      cookies: { 'sb-access-token': 'secreto' },
      headers: { authorization: 'Bearer secreto' },
    },
    contexts: { nextjs: { request_path: `/auth/confirm?token_hash=${TOKEN}&type=email` } },
    user: { email: 'alumno@upc.edu.pe' },
  };
}

describe('limpiarEvento', () => {
  it('el token_hash no sobrevive en ningun campo del evento', () => {
    const limpio = limpiarEvento(eventoDeConfirm());

    expect(JSON.stringify(limpio)).not.toContain(TOKEN);
  });

  it('la ruta se queda, sin la query: sigue diciendo donde fallo', () => {
    const limpio = limpiarEvento(eventoDeConfirm());

    expect(limpio.contexts?.nextjs?.request_path).toBe('/auth/confirm');
    expect(limpio.request?.url).toBe('https://dispositivos.ccnode.net/auth/confirm');
  });

  it('cookies, cabeceras y usuario se van, como antes de H-17', () => {
    const limpio = limpiarEvento(eventoDeConfirm());

    expect(limpio.request?.cookies).toBeUndefined();
    expect(limpio.request?.headers).toBeUndefined();
    expect(limpio.user).toBeUndefined();
  });

  it('CONTROL: una ruta sin query no se toca', () => {
    const evento: ErrorEvent = { type: undefined, contexts: { nextjs: { request_path: '/catalogo' } } };

    expect(limpiarEvento(evento).contexts?.nextjs?.request_path).toBe('/catalogo');
  });
});
