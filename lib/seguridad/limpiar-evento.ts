import type { ErrorEvent } from '@sentry/nextjs';

// El `beforeSend` de instrumentation.ts, aparte para poder probarlo.
//
// Regla 4 del CLAUDE.md global: nunca llegan a Sentry tokens, cookies,
// cabeceras de autorizacion ni datos personales. El SDK ya omite cookies y
// cabeceras con `sendDefaultPii: false`; esto no confia en ese default.
//
// H-17 (2026-09-17): borrar `request.query_string` no bastaba. Next pasa a
// `onRequestError` un `request.path` CON la query -su documentacion lo dice:
// "/blog?name=foo"-, y @sentry/nextjs 10.70 lo copia a
// `contexts.nextjs.request_path` (captureRequestError.js:15). En /auth/confirm
// esa query es el `token_hash` de un magic link. La ruta sin ella basta para
// saber donde fallo.
function sinQuery(ruta: string): string {
  return ruta.split('?')[0];
}

export function limpiarEvento(evento: ErrorEvent): ErrorEvent {
  if (evento.request) {
    delete evento.request.cookies;
    delete evento.request.headers;
    delete evento.request.query_string;
    if (typeof evento.request.url === 'string') {
      evento.request.url = sinQuery(evento.request.url);
    }
  }

  const nextjs = evento.contexts?.nextjs;
  if (typeof nextjs?.request_path === 'string') {
    nextjs.request_path = sinQuery(nextjs.request_path);
  }

  // Ni siquiera el correo del usuario identificado.
  delete evento.user;

  return evento;
}
