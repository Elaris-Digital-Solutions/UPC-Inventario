import type { Page } from '@playwright/test';
import type { Browser } from '@playwright/test';

const MAILPIT_URL = 'http://127.0.0.1:54324';

// El acceso a la API de Mailpit queda CONCENTRADO en estos dos tipos y en las dos
// funciones de abajo: si su forma cambiara, corregirlo es tocar un solo sitio.
// (El aviso original decia que la forma no se habia podido verificar; hoy la
// verifica cada corrida verde del arnes.)
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
  // Concentrado aqui: si la raiz no trajera `messages`, es el unico sitio que
  // hay que tocar.
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

  // La plantilla arma el enlace dentro de HTML, asi que el `&` va escapado. Sin
  // desescaparlo, el parametro `type` no se lee y el canje cae en
  // /auth/error?motivo=tipo en vez de entrar.
  return coincidencia[0].replace(/&amp;/g, '&');
}

// Deja la sesion iniciada en `page`, pidiendo el enlace desde /login y
// canjeandolo desde Mailpit. Reutilizable por cualquier prueba que necesite
// entrar como un usuario concreto del seed.
export async function iniciarSesionComo(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Correo institucional').fill(email);
  await page.getByRole('button', { name: 'Enviar enlace' }).click();

  // ANTES de consultar Mailpit: sin esto la busqueda podria correr antes de que
  // el correo salga, y fallaria por una carrera y no por un error real.
  await page.getByText('Revisa tu correo').waitFor();

  const mensajes = await mensajesRecientes();
  const paraEsteCorreo = mensajes.filter((mensaje) =>
    mensaje.To?.some((destinatario) => destinatario.Address === email),
  );

  if (paraEsteCorreo.length === 0) {
    throw new Error(`No se encontro en Mailpit ningun correo dirigido a ${email}`);
  }

  // El filtro solo UBICA el mensaje: el enlace sale del CUERPO y nunca de un
  // campo del listado, que ya mintio una vez en este proyecto. Y se ordena por
  // `Created` en vez de asumir que la API devuelva un orden.
  const masReciente = [...paraEsteCorreo].sort(
    (a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime(),
  )[0];

  const cuerpo = await cuerpoMensaje(masReciente.ID);
  const enlace = extraerEnlaceConfirm(cuerpo);

  // Con la MISMA `page`: el token llega con prefijo pkce_ y Supabase solo lo
  // canjea en el navegador que lo pidio.
  await page.goto(enlace);
}

// Segunda sesion en paralelo, para las pruebas que necesitan a la alumna y al
// operador A LA VEZ.
//
// UN CONTEXTO NUEVO y no otra pestaña: dos pestañas COMPARTEN el almacenamiento
// -el verifier de PKCE incluido-, asi que pedir un segundo magic link desde una
// pisaria el estado que la primera todavia necesita.
//
// `baseURL` SE RECIBE por parametro: `browser.newContext()` NO hereda el del
// bloque `use` de playwright.config.ts, asi que sin el `goto('/algo')` navegaria
// sin ningun origen delante. Quien llama lo saca del fixture que Playwright ya
// inyecta en la firma del test.
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
