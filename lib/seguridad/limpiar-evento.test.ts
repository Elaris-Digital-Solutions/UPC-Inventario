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

  // Un evento como el que arma captureException() de @sentry/node 10.70 con el
  // error de PostgREST que recibe reportar(): postgrest-js lo devuelve como
  // objeto plano -JSON.parse del cuerpo-, y el SDK lo serializa ENTERO en
  // `extra.__serialized__`, `details` incluido. Medido el 2026-09-23.
  function eventoDeReportar(): ErrorEvent {
    return {
      type: undefined,
      exception: { values: [{ type: 'Error', value: 'new row for relation "alumnos" violates check constraint "alumnos_nombre_largo"' }] },
      extra: {
        __serialized__: {
          code: '23514',
          details: 'Failing row contains (a0000000-0000-0000-0000-00000000000a, Nombre Apellido, alumno@upc.edu.pe).',
          hint: null,
          message: 'new row for relation "alumnos" violates check constraint "alumnos_nombre_largo"',
        },
      },
      tags: { correlacion: 'abcd1234', contexto: 'guardarPerfil' },
    };
  }

  it('la fila que trae `details` de PostgREST no llega a Sentry', () => {
    const limpio = JSON.stringify(limpiarEvento(eventoDeReportar()));

    expect(limpio).not.toContain('Failing row');
    expect(limpio).not.toContain('alumno@upc.edu.pe');
  });

  it('CONTROL: el mensaje del motor y el id de correlacion se quedan', () => {
    const limpio = limpiarEvento(eventoDeReportar());

    expect(limpio.exception?.values?.[0]?.value).toContain('alumnos_nombre_largo');
    expect(limpio.tags?.correlacion).toBe('abcd1234');
  });

  // El breadcrumb que @sentry/node 10.70 deja por cada fetch saliente. A
  // PostgREST los filtros viajan en la query, y darDeAltaPersonal() filtra por
  // correo: `email=eq.<correo>`. Medido en el envelope enviado el 2026-09-23.
  function eventoConMiga(): ErrorEvent {
    return {
      type: undefined,
      breadcrumbs: [
        {
          category: 'http',
          type: 'http',
          data: {
            url: 'https://zqfkzgdyeqxzgzpxgadi.supabase.co/rest/v1/alumnos?select=auth_user_id&email=eq.alumno%40upc.edu.pe',
            'http.method': 'GET',
            'http.query': 'select=auth_user_id&email=eq.alumno%40upc.edu.pe',
            'http.fragment': 'alumno@upc.edu.pe',
            status_code: 400,
          },
        },
      ],
    };
  }

  it('la query de una llamada saliente no llega: lleva los filtros de PostgREST', () => {
    const limpio = JSON.stringify(limpiarEvento(eventoConMiga()));

    expect(limpio).not.toContain('alumno%40upc.edu.pe');
    expect(limpio).not.toContain('alumno@upc.edu.pe');
  });

  it('la miga conserva a que tabla se llamo, con que metodo y que respondio', () => {
    const datos = limpiarEvento(eventoConMiga()).breadcrumbs?.[0]?.data;

    expect(datos?.url).toBe('https://zqfkzgdyeqxzgzpxgadi.supabase.co/rest/v1/alumnos');
    expect(datos?.['http.method']).toBe('GET');
    expect(datos?.status_code).toBe(400);
  });

  it('CONTROL: una ruta sin query no se toca', () => {
    const evento: ErrorEvent = { type: undefined, contexts: { nextjs: { request_path: '/catalogo' } } };

    expect(limpiarEvento(evento).contexts?.nextjs?.request_path).toBe('/catalogo');
  });
});
