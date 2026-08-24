import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';

// Desde este archivo y no desde process.cwd(), para no depender de con que
// directorio se haya arrancado Playwright.
const RAIZ_PROYECTO = path.resolve(__dirname, '..', '..');

let urlValidada: string | undefined;

// EL CORTAFUEGOS. No es una advertencia en un comentario: es codigo que impide
// arrancar. Una corrida de E2E entra por magic link, entrega equipos y sanciona
// faltas sobre la base a la que apunte esta URL, y contra produccion la mitad de
// esas escrituras no se deshacen con un UPDATE.
//
// FALLA CERRADA, POR LISTA BLANCA: se declara el UNICO host que vale y todo lo
// demas aborta, incluida una variable sin definir. Como lista negra, un host
// nuevo que nadie previo pasaria de largo sin que nada avise.
export function urlSupabaseLocal(): string {
  if (urlValidada) {
    return urlValidada;
  }

  // El MISMO cargador que usa `next dev`. Este proceso corre por fuera de Next,
  // asi que sin esto `process.env` no traeria la variable. `dev=true` reproduce
  // su precedencia: .env.local gana sobre .env.
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

// EL globalSetup DE ABAJO NO ES LA BARRERA QUE LLEGA A TIEMPO: corre DESPUES de
// que Playwright levante el webServer, asi que la aplicacion ya pudo emitir
// trafico contra la URL equivocada. La barrera real es la llamada a
// urlSupabaseLocal() en el ambito del modulo de playwright.config.ts; esto es la
// segunda, por si alguien usa otra configuracion.

// LA ESPERA DE AUTH (Q-26). El E2E necesita base limpia Y Auth despierto, y
// `db reset` da lo primero quitando lo segundo: recien reseteado da 4/6 -dos POST
// /otp expiran dentro de Auth-, con la base sucia 3/6, y con las dos condiciones
// 6/6.
//
// UN SONDEO Y NO UN SLEEP FIJO: un sleep falla en las dos direcciones -de mas
// alarga cada corrida, de menos no arregla nada- y no deja rastro de cuanto hizo
// falta. Esto pregunta hasta que responde y DICE cuanto tardo, que es lo que
// distingue "espero y sirvio" de "no hizo nada".
const ESPERA_MAXIMA_MS = 60_000;
const INTERVALO_MS = 500;

async function esperarAuthDespierto(base: string): Promise<void> {
  const destino = new URL('/auth/v1/health', base).toString();
  const arranque = Date.now();
  const limite = arranque + ESPERA_MAXIMA_MS;
  let ultimoFallo = 'sin intentos';

  while (Date.now() < limite) {
    try {
      const respuesta = await fetch(destino);
      if (respuesta.ok) {
        // SIEMPRE, tambien con 0 ms: un cero dice que Auth ya estaba listo y que
        // esta espera no es lo que hizo pasar la corrida.
        console.log(`[e2e] Auth respondio tras ${Date.now() - arranque} ms`);
        return;
      }
      ultimoFallo = `HTTP ${respuesta.status}`;
    } catch (error) {
      ultimoFallo = error instanceof Error ? error.message : String(error);
    }
    await new Promise((listo) => setTimeout(listo, INTERVALO_MS));
  }

  throw new Error(
    `Auth no respondio en ${destino} tras ${ESPERA_MAXIMA_MS} ms ` +
      `(ultimo intento: ${ultimoFallo}). El stack local no esta arriba, o Auth ` +
      'no arranco. Comprobarlo por el efecto con `docker ps`, no por el codigo ' +
      'de salida de `npx supabase start`, que devuelve 0 aunque falle.',
  );
}

// LA OTRA MITAD DE Q-26: que la base este limpia. Con la base sucia el E2E da
// 3/6 porque las reservas acumuladas agotan la franja que usan las pruebas, y el
// sintoma NO dice la causa: fallos de "no hay horario disponible" en specs que no
// tienen nada que ver entre si.
//
// SE DETECTA, NO SE RESUELVE: un `db reset` aqui correria tambien en CI, y `db
// reset` NO aplica supabase/config.toml -a diferencia de un `start` en frio-, asi
// que dejaria sin enganche `before_user_created` (D-32). Un arnes que repara la
// base es mas comodo hasta el dia que repara de menos y nadie mira.
//
// EL UMBRAL NO ES UNA ESTIMACION: el seed no siembra ninguna reserva, asi que
// base limpia es EXACTAMENTE cero.
//
// SE SALTA EN CI porque alla la base nace limpia de un `start` en frio.
const RESERVAS = '/rest/v1/inventory_reservations?select=id&limit=1';

// OJO: `supabase status` tarda entre 7 y 12 s. Se paga porque es PORTABLE -la
// alternativa era `docker exec`, que ata el arnes al nombre del contenedor-, y
// porque asi la clave no se escribe en el repositorio ni en un .env.
function claveDeServicioLocal(): string {
  const salida = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
    cwd: RAIZ_PROYECTO,
    encoding: 'utf8',
    shell: true,
  });

  const linea = salida.split(/\r?\n/).find((l) => l.startsWith('SERVICE_ROLE_KEY='));
  if (!linea) {
    throw new Error(
      'No se pudo leer SERVICE_ROLE_KEY de `supabase status -o env`. ' +
        'El stack local no esta arriba? Comprobarlo con `docker ps`, no por el ' +
        'codigo de salida de `npx supabase start`, que devuelve 0 aunque falle.',
    );
  }

  return linea.slice('SERVICE_ROLE_KEY='.length).trim().replace(/^"|"$/g, '');
}

async function exigirBaseLimpia(base: string): Promise<void> {
  const clave = claveDeServicioLocal();
  const respuesta = await fetch(new URL(RESERVAS, base), {
    headers: {
      apikey: clave,
      Authorization: `Bearer ${clave}`,
      // count=exact devuelve el total en content-range aunque se pida una fila.
      // Se quiere el NUMERO: "hay 4 reservas" se entiende, "la base esta sucia"
      // hay que ir a comprobarlo.
      Prefer: 'count=exact',
    },
  });

  if (!respuesta.ok) {
    throw new Error(
      `No se pudo comprobar si la base esta limpia: HTTP ${respuesta.status} ` +
        `al leer ${RESERVAS}. La clave de servicio no vale, o PostgREST no responde.`,
    );
  }

  // "0-0/4" -> 4. Sin cabecera no se inventa un cero: un cero supuesto es justo
  // la respuesta tranquilizadora.
  const rango = respuesta.headers.get('content-range');
  const total = rango ? Number(rango.split('/')[1]) : Number.NaN;

  if (!Number.isFinite(total)) {
    throw new Error(
      `No se pudo contar las reservas: content-range llego como "${rango}". ` +
        'Sin ese numero esta comprobacion no dice nada, asi que se aborta en ' +
        'vez de dar por buena una base que nadie ha mirado.',
    );
  }

  if (total > 0) {
    throw new Error(
      `La base local tiene ${total} reserva(s) de corridas anteriores, y con ` +
        'reservas acumuladas el E2E falla por falta de franja y no por el ' +
        'codigo: medido, 3/6. Correr `npx supabase db reset` antes del E2E.',
    );
  }

  console.log('[e2e] Base limpia: 0 reservas');
}

export default async function globalSetup() {
  const url = urlSupabaseLocal();
  await esperarAuthDespierto(url);

  if (!process.env.CI) {
    await exigirBaseLimpia(url);
  }
}
