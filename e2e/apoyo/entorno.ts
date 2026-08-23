import { execFileSync } from 'node:child_process';
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
// LA ESPERA DE AUTH (Q-26). El E2E necesita DOS cosas a la vez y `db reset`
// da la primera quitando la segunda: base limpia y Auth despierto. Medido en
// cuatro corridas el 2026-08-18: recien reseteado y con el `build`
// compitiendo da 4/6 -dos POST /otp expiran DENTRO de Auth, 504 a los 10,97 s
// y 500 a los 8,00 s-; con la base sucia de tres corridas da 3/6; con las dos
// condiciones a la vez, 6/6.
//
// OJO: ESTO CURA LA MITAD DE Q-26, NO LAS DOS. Lo que se arregla aqui es que
// Auth este frio. Que la base este limpia sigue dependiendo de un `db reset`
// que da una persona, y no se resuelve desde aqui: comprobarlo exigiria leer
// inventory_reservations, que RLS no deja ver sin credenciales de servicio, y
// meter una clave privilegiada en el arnes para eso costaria mas de lo que
// ahorra.
//
// POR QUE UN SONDEO Y NO UN SLEEP FIJO: un sleep de N segundos es una
// apuesta que falla en las dos direcciones -de mas, alarga cada corrida; de
// menos, no arregla nada- y ademas no deja rastro de cuanto hizo falta. Esto
// pregunta hasta que responde y DICE cuanto tardo, que es lo que permite
// distinguir "espero y sirvio" de "no hizo nada".
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
        // Se imprime SIEMPRE, tambien cuando da 0 ms. Un cero es informacion:
        // dice que Auth ya estaba listo y que esta espera no es lo que hizo
        // pasar la corrida. Callarlo cuando no espera convertiria a esta
        // funcion en algo que nadie puede comprobar que funciona.
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

// LA OTRA MITAD DE Q-26: que la base este limpia.
//
// Medido el 2026-08-18: con la base sucia de tres corridas el E2E da 3/6,
// porque las reservas acumuladas agotan la franja que usan las pruebas. Y el
// sintoma NO dice la causa: son fallos de "no hay horario disponible" en
// specs que no tienen nada que ver entre si.
//
// SE DETECTA, NO SE RESUELVE, y el motivo esta medido en este repositorio:
// meter un `db reset` aca lo ejecutaria tambien en CI, DESPUES del
// `supabase start` del workflow, y `db reset` NO aplica supabase/config.toml
// -a diferencia de un `start` en frio-, asi que dejaria sin enganche
// `before_user_created` (D-32). Es uno de los cinco fallos de la T1 que
// pasaron con los cuatro comandos en verde. Un arnes que repara la base es
// mas comodo hasta el dia que repara de menos y nadie mira.
//
// EL SEED NO SIEMBRA NINGUNA RESERVA -comprobado: cero `insert into
// inventory_reservations` en supabase/seed.sql-, asi que el umbral no es una
// estimacion: base limpia es EXACTAMENTE cero.
//
// SE SALTA EN CI a proposito, y no por ahorrar: alla la base nace limpia
// porque el workflow hace `supabase start` en frio y no `db reset`, asi que
// la comprobacion no puede fallar nunca y solo costaria segundos.
const RESERVAS = '/rest/v1/inventory_reservations?select=id&limit=1';

// OJO: `supabase status` tarda entre 7 y 12 s -medido dos veces el
// 2026-08-22-. Se paga porque es PORTABLE: la alternativa rapida era
// `docker exec` contra el contenedor de Postgres, que ata el arnes al nombre
// del contenedor y a que el stack se haya levantado con Docker. Y la clave no
// se escribe en el repositorio ni en un .env: se lee del stack que ya esta en
// pie, igual que hace .github/workflows/e2e.yml.
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
      // count=exact hace que PostgREST devuelva el total en content-range
      // aunque solo se pida una fila. Se quiere el NUMERO y no un si/no: un
      // mensaje que diga "hay 4 reservas" se entiende, y uno que diga "la
      // base esta sucia" hay que ir a comprobarlo.
      Prefer: 'count=exact',
    },
  });

  if (!respuesta.ok) {
    throw new Error(
      `No se pudo comprobar si la base esta limpia: HTTP ${respuesta.status} ` +
        `al leer ${RESERVAS}. La clave de servicio no vale, o PostgREST no responde.`,
    );
  }

  // "0-0/4" -> 4. Sin cabecera no se inventa un cero: se aborta, porque un
  // cero supuesto es justo la respuesta tranquilizadora.
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
