// Construye la cadena de Content-Security-Policy. Modulo PURO: no lee
// `process.env` ni importa nada, para que Vitest lo pueda cargar. Quien lee el
// entorno y arma las `opciones` es proxy.ts.
//
// ESTA CABECERA ES DEFENSA EN PROFUNDIDAD DEL NAVEGADOR Y NO AUTORIZA NADA. Una
// CSP no puede sustituir a una politica: si RLS le da a un alumno una fila que no
// le corresponde, ninguna directiva de aqui lo evita. Lo que hace es reducir el
// daño si algun dia se cuela un script o un estilo que no deberia ejecutarse.
//
// POR QUE CADA DIRECTIVA ES ASI:
//
// - `script-src` con nonce y `strict-dynamic`, sin excepciones fuera de
//   desarrollo: el arbol `.tsx` tiene CERO `<Script>` y CERO
//   `dangerouslySetInnerHTML`, asi que no hay nada que necesite una apertura.
//   `'unsafe-eval'` solo en desarrollo, que es donde React lo usa para
//   reconstruir los stacks de error del servidor.
// - `style-src` con nonce en produccion y `'unsafe-inline'` en desarrollo, como
//   pide la documentacion de Next.js 16 instalada en este repositorio.
// - `style-src-attr 'unsafe-inline'` es una directiva APARTE (D-59) y hace
//   falta: `next/image` emite atributos `style="..."` en el HTML servido -CERO
//   `style={{...}}` en el codigo fuente no es cero en el HTML-. Al nonce no le
//   llega, porque solo vale para elementos `<style>` y `<script>`; separarla deja
//   los elementos exigiendo nonce y abre solo los atributos. Va en LOS DOS MODOS
//   a proposito: con un condicional, desarrollo y despliegue se comportarian
//   distinto y el fallo aparecia tarde. El riesgo es aceptable porque un atributo
//   `style` no ejecuta codigo.
// - `img-src` NO abre `res.cloudinary.com` aunque las fotos vivan alli: todas
//   pasan por `next/image`, que las sirve desde `/_next/image`, el mismo origen
//   que `'self'` ya cubre.
// - `font-src 'self'` basta: las fuentes entran por `next/font/google` (D-23),
//   que las descarga en el build y las sirve desde el propio dominio.
// - `connect-src` recibe la URL de Supabase POR PARAMETRO y nunca escrita a mano:
//   difiere entre local y produccion, y fijarla rompe el desarrollo en silencio.
//   Sin `wss:` porque no se usa Realtime; el dia que se use, hay que tocar esto.
// - Las cuatro directivas de cierre -`object-src`, `base-uri`, `form-action`,
//   `frame-ancestors`- son las que recomienda esa misma documentacion.
// - `upgrade-insecure-requests` queda FUERA en desarrollo, que se prueba por
//   `http://127.0.0.1:3000`, y va la ULTIMA en produccion.
//
// SI ALGUN DIA SE AGREGA UN TERCERO QUE SIRVA SCRIPTS O SE ACTIVA REALTIME, hay
// que volver a este archivo: ninguna de las dos cosas esta contemplada hoy.
export function construirCSP(opciones: {
  nonce: string;
  esDesarrollo: boolean;
  urlSupabase: string;
}): string {
  const { nonce, esDesarrollo, urlSupabase } = opciones;

  const directivas: string[] = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${esDesarrollo ? ` 'unsafe-eval'` : ''}`,
    `style-src 'self' ${esDesarrollo ? `'unsafe-inline'` : `'nonce-${nonce}'`}`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' blob: data:`,
    `font-src 'self'`,
    `connect-src 'self' ${urlSupabase} https://api.cloudinary.com`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ];

  if (!esDesarrollo) {
    directivas.push('upgrade-insecure-requests');
  }

  return directivas.join('; ');
}
