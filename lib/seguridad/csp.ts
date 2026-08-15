// Construye la cadena de Content-Security-Policy. Modulo PURO: no lee
// `process.env` ni importa nada de Next ni de Supabase, para que Vitest lo
// pueda cargar sin romperse -misma restriccion que documentan
// lib/admin/ajustes.ts y lib/mostrador/filtro.ts-. Quien lee el entorno y
// arma las `opciones` es proxy.ts, que no es parte de este archivo.
//
// ESTA CABECERA ES DEFENSA EN PROFUNDIDAD DEL NAVEGADOR, Y NO AUTORIZA NADA.
// En este proyecto quien autoriza es RLS en la base -es la regla que repite
// todo el resto del codigo, del proxy para abajo-. Una CSP no puede
// sustituir a una politica: si RLS le da a un alumno una fila que no le
// corresponde, ninguna directiva de aca lo evita. Lo que esta cabecera hace
// es reducir el dano si algun dia se cuela un script o un estilo que no
// deberia ejecutarse -XSS, inyeccion de HTML de un tercero-, no decidir quien
// puede leer o escribir que.
//
// POR QUE CADA DIRECTIVA ES ASI, medido sobre el arbol de hoy y no supuesto:
//
// - `script-src` va con nonce y `strict-dynamic`, sin ninguna excepcion
//   fuera de desarrollo, porque el arbol `.tsx` entero tiene CERO
//   `<Script>` y CERO `dangerouslySetInnerHTML`. No hay nada que necesite
//   una apertura.
// - `style-src` en produccion tambien va con nonce, por el mismo motivo:
//   CERO `style={{...}}` en el arbol. En desarrollo lleva `'unsafe-inline'`
//   en vez del nonce porque asi lo pide la documentacion de Next.js 16
//   instalada en este repositorio, en
//   `node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`
//   -la misma fuente que exige `'unsafe-eval'` en `script-src` solo en
//   desarrollo: React usa `eval` ahi para reconstruir en el navegador los
//   stacks de error que ocurrieron en el servidor. Ninguna de las dos hace
//   falta en produccion.
// - `style-src-attr 'unsafe-inline'` es una directiva aparte, decision D-59,
//   medida hoy y no supuesta: `next/image` genera atributos `style="..."`
//   en el HTML servido. En la landing hay OCHO, y uno no es cosmetico:
//   `position:absolute;height:100%;width:100%;left:0;top:0;right:0;
//   bottom:0;color:transparent`, que es lo que Next emite para una imagen
//   con `fill` y lo que hace que ocupe su contenedor. Los otros son
//   `color:transparent`. Esto corrige una medicion previa del plan: el
//   arbol `.tsx` tiene CERO `style={{...}}`, y aun asi el HTML servido trae
//   atributos `style` -cero en el codigo fuente no es cero en el HTML, las
//   librerias generan los suyos-. Va en LOS DOS MODOS, sin condicional, y es
//   deliberado: si fuera solo de produccion, desarrollo y despliegue se
//   comportarian distinto y el fallo aparecia tarde. Hace falta una
//   directiva aparte porque al nonce NO le llega: el nonce solo vale para
//   elementos `<style>` y `<script>`. A un atributo `style` lo gobierna
//   `style-src-attr`, que si no se declara hereda de `style-src` -y ahi el
//   nonce no aplica, asi que se bloquearian-. Separarlas deja los elementos
//   `<style>` exigiendo nonce y abre solo los atributos. El riesgo es
//   aceptable: un atributo `style` no ejecuta codigo, y `script-src` sigue
//   estricto con nonce y `strict-dynamic`, que es para lo que existe esta
//   cabecera.
// - `img-src` abre `blob:` y `data:` pero NO `res.cloudinary.com`, aunque
//   las fotos vivan alli: todas las imagenes remotas pasan por
//   `next/image`, que las sirve desde `/_next/image` -el MISMO origen que
//   `'self'` ya cubre-.
// - `font-src 'self'` basta y no hace falta abrir Google Fonts: las fuentes
//   entran por `next/font/google` -decision D-23-, que las descarga en el
//   build y las sirve desde el propio dominio.
// - `connect-src` recibe la URL de Supabase POR PARAMETRO, nunca escrita a
//   mano: en desarrollo es `http://127.0.0.1:54321` y en produccion
//   `https://zqfkzgdyeqxzgzpxgadi.supabase.co`, y si se escribiera fija
//   rompe el desarrollo en silencio. No lleva ningun `wss:` porque el
//   proyecto no usa Supabase Realtime; el dia que se use, hay que tocar este
//   archivo. Ademas de `'self'` y la URL de Supabase, abre
//   `https://api.cloudinary.com` -la subida de imagenes desde el navegador,
//   ver lib/cloudinary-. `res.cloudinary.com` no entra aca por el mismo
//   motivo que no entra en `img-src`: el navegador nunca le habla
//   directamente, siempre a traves de `/_next/image`.
// - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` y
//   `frame-ancestors 'none'` son las cuatro directivas de cierre que
//   recomienda la misma documentacion de Next.js: sin plugins embebidos, sin
//   reescribir la base del documento, los formularios solo envian al propio
//   origen y nadie puede empotrar este sitio en un `<iframe>` ajeno.
// - `upgrade-insecure-requests` queda FUERA en desarrollo porque el entorno
//   se prueba por `http://127.0.0.1:3000`: forzar HTTPS ahi rompe el acceso
//   local. En produccion va, y va la ULTIMA, como la documentacion de
//   Next.js la ordena en sus ejemplos.
//
// SI ALGUN DIA SE AGREGA UN TERCERO QUE SIRVA SCRIPTS -analytics, un widget
// embebido- O SE ACTIVA SUPABASE REALTIME, hay que volver a este archivo:
// ninguna de esas dos cosas esta contemplada hoy.
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
