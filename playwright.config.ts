import { defineConfig, devices } from '@playwright/test';
import { urlSupabaseLocal } from './e2e/apoyo/entorno';

// El cortafuegos vive en e2e/apoyo/entorno.ts. Medido hoy: enganchado SOLO
// como globalSetup (mas abajo) no alcanza, porque Playwright levanta el
// webServer ANTES de correr el globalSetup. Sin esta llamada aca, una
// corrida contra produccion tardaba unos treinta segundos en abortar -el
// tiempo de `npm run build`- y la salida traia una linea [WebServer] con la
// aplicacion ya consultando produccion. Por eso se llama aca, suelta en el
// ambito del modulo: Playwright tiene que evaluar este archivo para saber
// que webServer levantar, asi que la excepcion sale antes de todo. Medido
// tambien: con esta llamada, la corrida aborta en unos cinco segundos y sin
// ninguna linea [WebServer] en la salida. El globalSetup de abajo queda como
// segunda barrera, no como la principal.
urlSupabaseLocal();

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/apoyo/entorno.ts',

  // En CI se reintenta. En local, sin reintentos: un fallo que solo
  // desaparece con retry esconde un problema real y no conviene taparlo.
  retries: process.env.CI ? 2 : 0,

  // UN SOLO worker siempre, no solo en CI: hay UN UNICO stack local de
  // Supabase que comparten todos los specs, no uno por worker, y dos specs
  // corriendo en paralelo contra ese mismo stack se pisan entre si de dos
  // formas distintas: el limite diario por producto vale 1, asi que dos
  // specs que reserven el mismo producto el mismo dia chocan; y pedir un
  // magic link nuevo para un correo invalida el anterior en Supabase Auth,
  // asi que dos specs que inicien sesion con el mismo correo a la vez pueden
  // terminar canjeando el enlace equivocado.
  workers: 1,

  reporter: [['html', { open: 'never' }]],

  use: {
    // SIEMPRE 127.0.0.1, nunca localhost (D-33): el navegador los trata
    // como sitios distintos para las cookies, y un salto entre los dos a
    // mitad del canje tira la sesion.
    baseURL: 'http://127.0.0.1:3000',
    // Solo cuando algo falla: en corridas en verde no hace falta ni el
    // rastro ni la captura.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  // Solo Chromium: un unico proyecto de escritorio, sin Firefox ni WebKit.
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    // Se compila SIEMPRE y no se reutiliza ningun servidor que ya este
    // corriendo: el servidor de desarrollo de este proyecto ya mintio dos
    // veces -un proceso viejo degradado que devolvia 500, y un arranque en
    // frio que no llegaba a registrar una ruta y daba 404-. El arbitro de si
    // una pantalla funciona es `npm run build`, asi que la compilacion se
    // paga en cada corrida a proposito.
    command: 'npm run build && npm run start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
    timeout: 3 * 60 * 1000,
  },
});
