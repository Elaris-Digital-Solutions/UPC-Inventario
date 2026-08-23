import * as Sentry from '@sentry/nextjs';

// H-4 de la auditoria del 2026-08-23: Sentry, SOLO EN EL SERVIDOR.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE SOLO EL SERVIDOR, que es la decision de este archivo.
//
// El hueco que H-4 nombra es "los fallos mueren en stdout": los `console.error`
// y el `reportar()` de H-3 corren EN EL SERVIDOR, y en un hosting serverless ese
// stdout se rota y se pierde. Ese es el problema, y se cierra entero aqui.
//
// Meter ademas el SDK del navegador costaria tres cosas que no compra:
//   1. ~100 kB en el bundle de cada alumno que abre el catalogo.
//   2. Abrir `connect-src` en lib/seguridad/csp.ts hacia el host de ingesta --
//      o sea AMPLIAR la CSP, que es justo lo contrario de lo que hizo H-5.
//   3. Un canal mas por el que un dato personal puede salir sin querer, y esta
//      base va a tener correos, nombres y carreras.
//
// Lo que se pierde a cambio: errores de React sin capturar en el navegador.
// Utiles, pero NO son el hueco de H-4, y se anaden el dia que hagan falta.
//
// Por eso este archivo NO usa `withSentryConfig` en next.config.ts: eso existe
// para el bundler del cliente y para subir source maps, y ninguna de las dos
// cosas aplica aqui. Menos piezas que puedan romper el build.
//
// ─────────────────────────────────────────────────────────────────────────────
// SIN DSN NO PASA NADA, y es a proposito: `Sentry.init` con `dsn: undefined`
// queda inerte -- no envia, no rompe, no avisa en cada arranque. Asi el
// repositorio compila y corre igual en la maquina de cualquiera y en el CI, que
// no tienen ni van a tener esa variable.
//
// SENTRY_DSN SIN `NEXT_PUBLIC_`, y no es un detalle de estilo: ese prefijo
// INLINEA la variable en el bundle del navegador (D-28). Un DSN publicado no da
// acceso a leer nada, pero si permite que cualquiera mande eventos falsos al
// proyecto y agote la cuota. Como el SDK del cliente no existe aqui, la variable
// no tiene ningun motivo para viajar.
export function register() {
  // La comprobacion del runtime hace falta: `register()` tambien corre en el
  // runtime `edge`, y ahi el SDK de Node no aplica. Hoy este proyecto no tiene
  // nada en edge -- proxy.ts corre en Node--, pero el dia que lo tenga esto
  // falla en silencio en vez de reventar el arranque.
  if (process.env.NEXT_RUNTIME !== 'nodejs') {
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // LAS CUATRO REGLAS DE ERRORES DEL CLAUDE.md GLOBAL, aplicadas aqui.
    //
    // Regla 4: NUNCA llegan a Sentry tokens, cookies, cabeceras de autorizacion
    // ni datos personales. `sendDefaultPii` ya es false por defecto; se escribe
    // explicito porque un default silencioso no se ve al leer el archivo, y esta
    // linea es la que alguien tiene que encontrar antes de cambiarla.
    sendDefaultPii: false,

    // El entorno separa lo de produccion de lo que dispare alguien en local.
    environment: process.env.NODE_ENV,

    // Sin `tracesSampleRate`: las trazas de rendimiento son otro producto y otro
    // consumo de cuota. H-4 pide saber que algo fallo, no cuanto tardo.
    // El plan gratuito da 5 000 errores/mes; gastarlos en trazas seria quedarse
    // sin el aviso que importa.

    beforeSend(evento) {
      // Regla 4, segunda pasada y a mano. El SDK ya omite cookies y cabeceras
      // con `sendDefaultPii: false`, pero esto NO confia en ese default: son dos
      // interruptores del mismo proveedor, y el dia que uno cambie de
      // comportamiento el otro sigue.
      if (evento.request) {
        delete evento.request.cookies;
        delete evento.request.headers;
        // La `query_string` puede llevar el `token_hash` de un magic link, que
        // es un secreto de un solo uso. La URL sin ella basta para saber donde
        // fallo.
        delete evento.request.query_string;
      }

      // Regla 4: ni siquiera el correo del usuario identificado.
      delete evento.user;

      return evento;
    },
  });
}

// Regla 3 del CLAUDE.md global: LO ESPERADO NO ES UN INCIDENTE.
//
// `onRequestError` lo llama Next.js con TODO error de servidor, y sin este
// filtro Sentry recibiria tambien las tres cosas que en este proyecto son
// funcionamiento normal:
//
//   - `redirect()` y `notFound()`, que Next implementa LANZANDO una excepcion.
//     Sin filtrarlas, cada vez que alguien sin sesion cae en /login se
//     reportaria un "error".
//   - Validacion fallida y permiso denegado, que ya tienen su camino: el
//     usuario ve el mensaje y `reportar()` deja el crudo en el log.
//
// SI TODO ES INCIDENTE, NADIE MIRA SENTRY. Es la regla entera.
export const onRequestError: typeof Sentry.captureRequestError = (error, request, context) => {
  // Los errores de control de flujo de Next llevan un `digest` con un prefijo
  // conocido. Se comprueba la FORMA del objeto y no `instanceof`, porque esas
  // clases no son publicas y cambiar de version las renombraria.
  const digest = (error as { digest?: unknown })?.digest;
  if (typeof digest === 'string' && (digest.startsWith('NEXT_REDIRECT') || digest === 'NEXT_NOT_FOUND')) {
    return;
  }

  return Sentry.captureRequestError(error, request, context);
};
