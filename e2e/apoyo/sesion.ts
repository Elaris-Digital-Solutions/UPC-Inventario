import type { Page } from '@playwright/test';
import type { Browser } from '@playwright/test';

const MAILPIT_URL = 'http://127.0.0.1:54324';

// AVISO: la forma exacta de la API de Mailpit NO se pudo verificar al
// escribir esto -el stack local estaba apagado-. Esta escrita segun la API
// v1 documentada (GET /api/v1/messages y GET /api/v1/message/{ID}), pero el
// acceso a los campos del mensaje queda concentrado en estos dos tipos y en
// las dos funciones de abajo (mensajesRecientes y cuerpoMensaje) para que,
// si la forma real difiere, corregirlo sea tocar un solo sitio y no algo
// esparcido por el archivo.
type MensajeResumen = {
  ID: string;
  To: Array<{ Address: string }>;
  Created: string;
};

type MensajeCompleto = {
  Text: string;
  HTML: string;
};

async function mensajesRecientes(): Promise<MensajeResumen[]> {
  const respuesta = await fetch(`${MAILPIT_URL}/api/v1/messages`);
  if (!respuesta.ok) {
    throw new Error(`Mailpit respondio ${respuesta.status} en /api/v1/messages`);
  }
  const cuerpo = await respuesta.json();
  // Concentrado aca: si la raiz de la respuesta real no trae `messages`
  // -o se llama distinto-, este es el unico lugar que hay que tocar.
  return cuerpo.messages ?? cuerpo;
}

async function cuerpoMensaje(id: string): Promise<MensajeCompleto> {
  const respuesta = await fetch(`${MAILPIT_URL}/api/v1/message/${id}`);
  if (!respuesta.ok) {
    throw new Error(`Mailpit respondio ${respuesta.status} en /api/v1/message/${id}`);
  }
  return respuesta.json();
}

function extraerEnlaceConfirm(cuerpo: MensajeCompleto): string {
  const fuente = cuerpo.HTML || cuerpo.Text || '';
  const coincidencia = fuente.match(/https?:\/\/[^\s"']+\/auth\/confirm\?[^\s"']+/);
  if (!coincidencia) {
    throw new Error('No se encontro un enlace /auth/confirm en el cuerpo del correo de Mailpit');
  }

  // supabase/templates/magic_link.html arma el link como
  // '.../auth/confirm?token_hash=...&amp;type=magiclink': el &amp; esta
  // escapado porque el enlace vive dentro de HTML. Si se abre tal cual, el
  // navegador recibe "&amp;type=magiclink" en vez de "&type=magiclink", el
  // parametro `type` no se lee, y el canje en app/auth/confirm/route.ts cae
  // en /auth/error?motivo=tipo en vez de entrar.
  return coincidencia[0].replace(/&amp;/g, '&');
}

// Deja la sesion iniciada en `page`, pidiendo el enlace desde /login y
// canjeandolo desde Mailpit. Reutilizable por cualquier prueba que necesite
// entrar como un usuario concreto del seed.
export async function iniciarSesionComo(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Correo institucional').fill(email);
  await page.getByRole('button', { name: 'Enviar enlace' }).click();

  // Se espera la confirmacion en pantalla ANTES de consultar Mailpit: sin
  // esto la busqueda podria correr antes de que Supabase termine de mandar
  // el correo, y fallaria por una carrera, no por un error real.
  await page.getByText('Revisa tu correo').waitFor();

  const mensajes = await mensajesRecientes();
  const paraEsteCorreo = mensajes.filter((mensaje) =>
    mensaje.To?.some((destinatario) => destinatario.Address === email),
  );

  if (paraEsteCorreo.length === 0) {
    throw new Error(`No se encontro en Mailpit ningun correo dirigido a ${email}`);
  }

  // El filtro de arriba solo UBICA el mensaje por destinatario. El campo del
  // destinatario en el listado de Mailpit ya mintio una vez en este proyecto
  // (ver el historial de magic_link.html), asi que el enlace de verdad sale
  // del CUERPO del mensaje, nunca de un campo del listado. Tampoco se asume
  // que la API devuelva el listado en un orden dado: se ordena de forma
  // explicita por `Created` para quedarse con el mas reciente.
  const masReciente = [...paraEsteCorreo].sort(
    (a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime(),
  )[0];

  const cuerpo = await cuerpoMensaje(masReciente.ID);
  const enlace = extraerEnlaceConfirm(cuerpo);

  // Se abre con la MISMA `page`, no una pestana ni un contexto nuevo: el
  // token del magic link llega con prefijo pkce_ y Supabase solo lo canjea
  // en el mismo navegador que lo pidio. Medido dos veces en este proyecto.
  await page.goto(enlace);
}

// Segunda sesion en paralelo, para las pruebas que necesitan a la alumna y
// al operador A LA VEZ -por ejemplo, la alumna deja una reserva creada y el
// operador la atiende desde el mostrador mientras la sesion de la alumna
// sigue abierta y se usa despues para comprobar el resultado-.
//
// Un CONTEXTO nuevo, y no otra pestana del mismo contexto: el comentario de
// iniciarSesionComo() de arriba ya deja anotado, medido dos veces en este
// proyecto, que el token del magic link llega con prefijo pkce_ y que
// Supabase solo lo canjea en el MISMO navegador que lo pidio. Dos pestanas
// del mismo contexto COMPARTEN el almacenamiento del navegador que las abre
// -cookies, el verifier de PKCE incluido-, asi que pedir un segundo magic
// link desde otra pestana del mismo contexto pisaria el estado que la
// primera sesion todavia necesita para canjear el suyo. Un
// `browser.newContext()` aparte le da a cada sesion su propio
// almacenamiento, como si fueran dos navegadores distintos.
//
// `baseURL` se RECIBE por parametro y no se escribe a mano aca dentro:
// `browser.newContext()` NO hereda el `baseURL` del bloque `use` de
// playwright.config.ts -eso solo lo aplica el `page` que Playwright ya arma
// para cada test-, asi que un contexto creado a mano sin este parametro
// dejaria a `page` navegando con `goto('/algo')` sin ningun origen delante y
// fallando. Quien llama a este ayudante lo saca del fixture `baseURL` que
// Playwright ya inyecta en la firma del test -`async ({ page, browser,
// baseURL }) => ...`-, no de una constante propia escrita en el spec.
export async function paginaConSesion(
  browser: Browser,
  baseURL: string | undefined,
  email: string,
): Promise<{ page: Page; cerrar: () => Promise<void> }> {
  const contexto = await browser.newContext({ baseURL });
  const page = await contexto.newPage();
  await iniciarSesionComo(page, email);

  return { page, cerrar: () => contexto.close() };
}
