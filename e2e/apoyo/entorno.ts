import path from 'node:path';
import { loadEnvConfig } from '@next/env';

// Raiz del proyecto, calculada desde este archivo -no desde process.cwd()-
// para que la validacion no dependa de con que directorio de trabajo se haya
// arrancado Playwright. entorno.ts vive en e2e/apoyo/, dos niveles bajo la
// raiz.
const RAIZ_PROYECTO = path.resolve(__dirname, '..', '..');

let urlValidada: string | undefined;

// EL CORTAFUEGOS. No es una advertencia en un comentario: es codigo que
// impide arrancar. Una corrida de E2E entra por magic link, entrega equipos,
// los recibe y sanciona faltas -escribe de verdad sobre la base a la que
// apunte esta URL-. Si esa base fuera produccion, la mitad de esas
// escrituras no se deshacen con un UPDATE: una sancion tiene fecha de fin, y
// un log de movimiento tiene su propia fila. Por eso esta funcion lanza una
// excepcion en vez de seguir con lo que encuentre.
//
// Falla cerrada, por LISTA BLANCA, igual que RUTAS_PUBLICAS en proxy.ts: se
// declara lo UNICO que vale -el host 127.0.0.1- y cualquier otra cosa
// aborta, incluido que la variable no este definida o no sea una URL valida.
// Escrito como lista negra ("si contiene supabase.co, aborta") un host nuevo
// que nadie preveyo pasaria de largo sin que nada avise.
export function urlSupabaseLocal(): string {
  if (urlValidada) {
    return urlValidada;
  }

  // loadEnvConfig es el MISMO cargador que usa `next dev` (paquete
  // @next/env, version identica a la de next). Next carga el entorno solo;
  // este proceso, que corre las pruebas por fuera de Next, no lo hace por su
  // cuenta. Sin esto, si el cortafuegos leyera process.env a pelo recibiria
  // undefined para NEXT_PUBLIC_SUPABASE_URL. El segundo argumento (dev=true)
  // reproduce la misma precedencia que ve `next dev`: .env.local gana sobre
  // .env.
  loadEnvConfig(RAIZ_PROYECTO, true);

  const bruta = process.env.NEXT_PUBLIC_SUPABASE_URL;

  let url: URL;
  try {
    url = new URL(bruta ?? '');
  } catch {
    throw new Error(
      'Cortafuegos de entorno: NEXT_PUBLIC_SUPABASE_URL no es una URL valida ' +
        `(valor encontrado: ${bruta ?? 'sin definir'}). Se esperaba el stack ` +
        'local, http://127.0.0.1:54321. Falta un .env.local, o esta mal escrito.',
    );
  }

  if (url.hostname !== '127.0.0.1') {
    throw new Error(
      'Cortafuegos de entorno: NEXT_PUBLIC_SUPABASE_URL apunta a ' +
        `"${url.hostname}", no a 127.0.0.1 (valor encontrado: ${url.toString()}). ` +
        'Se esperaba el stack local, http://127.0.0.1:54321. Falta un ' +
        '.env.local, o el que hay no es el del stack local.',
    );
  }

  urlValidada = url.toString();
  return urlValidada;
}

// Playwright llama a esto UNA SOLA VEZ antes de la primera prueba, via
// `globalSetup` en playwright.config.ts. Pero esto NO es la barrera que
// llega a tiempo: `globalSetup` corre DESPUES de que Playwright levante el
// webServer, asi que para cuando esto se ejecuta la aplicacion ya pudo
// compilarse y emitir trafico contra la URL equivocada. La barrera que
// protege de verdad es la llamada a urlSupabaseLocal() en el ambito del
// modulo de playwright.config.ts. Esto queda como segunda barrera, para el
// caso de que alguien corra Playwright con otro archivo de configuracion
// que no tenga esa llamada.
export default async function globalSetup() {
  urlSupabaseLocal();
}
