import { expect, type Page } from '@playwright/test';

// Ayudante que deja creada UNA reserva para el dia siguiente, recorriendo la
// interfaz EXACTAMENTE igual que lo hace e2e/reservar.spec.ts, y que devuelve
// el nombre del producto reservado -la unica forma de que quien llama sepa
// mas tarde cual tarjeta, entre varias, es "la suya", sin escribir ningun
// nombre de producto a mano-.
//
// Por que este recorrido esta DUPLICADO respecto de reservar.spec.ts, y no
// se comparte AL REVES -que reservar.spec.ts llamara a este ayudante-: alla
// el recorrido completo ES lo que se prueba, con una asercion despues de
// cada paso -el <h1> leido bien tras esperar la URL, el boton de indice 1
// afirmado habilitado antes de tocarlo, el envio deshabilitado hasta que
// haya franja Y motivo-. Aca el mismo recorrido es solo el ESCENARIO que
// otra prueba necesita para poder empezar, sin ninguna de esas aserciones
// intermedias -si algo intermedio fallara, el error tiene que salir en la
// prueba que llama, no enterrado dentro de un ayudante silencioso-. Si un
// dia el recorrido de reservar cambia -otro selector, otro orden de pasos-,
// hay que tocar los dos archivos por separado, y eso es A PROPOSITO: un
// ayudante que reservar.spec.ts importara desde aca podria mutar sin que la
// prueba que existe justamente para vigilar ese recorrido se enterara.
export async function reservarParaManana(page: Page): Promise<string> {
  // Se navega explicitamente a /catalogo en vez de asumir que `page` ya esta
  // ahi: iniciarSesionComo() deja a un alumno con perfil completo en
  // /catalogo (lib/auth/destino.ts, hecho medido en un navegador real), pero
  // este ayudante no depende de que quien lo llama venga recien de iniciar
  // sesion sin haber navegado a ningun otro lado desde entonces.
  await page.goto('/catalogo');

  // La primera tarjeta de producto, y NO un nombre ni un id escritos a mano:
  // el seed local es una fixture de valores convenientes
  // (MIGRATION_DOCS/ESTADO_Y_PLAN.md), asi que atarse a un nombre concreto
  // rompe la prueba en cuanto el seed cambie. El prefijo `/catalogo/` separa
  // las tarjetas de producto de los enlaces de sede, que van a
  // `/catalogo?sede=...` sin barra despues de "catalogo".
  const primeraTarjeta = page.locator('a[href^="/catalogo/"]').first();
  await primeraTarjeta.click();

  // Mismo defecto ya medido que reservar.spec.ts evita, y que este ayudante
  // no puede permitirse repetir: leer el <h1> antes de esperar la URL del
  // detalle trae "Catálogo", el titulo de la pantalla anterior -el <h1> de
  // /catalogo YA EXISTE en el momento del click, y textContent() solo
  // auto-espera a que el elemento EXISTA, no a que la navegacion haya
  // ocurrido-. toHaveURL() si reintenta, y por eso la espera va antes de
  // leer el texto.
  await expect(page).toHaveURL(/\/catalogo\/[^/?]+\?sede=[^/?]+/);

  const textoH1 = await page.locator('h1').textContent();
  if (textoH1 === null || textoH1.trim() === '') {
    throw new Error('El <h1> del detalle de producto no trajo ningun texto');
  }
  const nombreProducto = textoH1.trim();

  // Enlace, no boton: el detalle solo deja "Reservar" como un <Link> cuando
  // el producto tiene unidades en alguna sede. El nombre exacto evita casar
  // con cualquier otro texto que contenga la palabra.
  await page.getByRole('link', { name: 'Reservar', exact: true }).click();

  // Indice 1, NUNCA 0, del grupo de dias: el primer boton es HOY, y hoy
  // puede tener cero franjas segun la hora -medido hoy a las 21:47 de Lima,
  // la RPC devolvio cero filas para hoy y veintiocho para manana, porque la
  // rejilla arranca en la apertura y el cierre la recorta-. Se afirma
  // habilitado antes de tocarlo, con un mensaje que explica la asuncion: si
  // ese dia concreto llegara a estar en disabled_days, el fallo tiene que
  // explicarse solo.
  const grupoDias = page.getByRole('group', { name: 'Día de la reserva' });
  const diaSiguiente = grupoDias.getByRole('button').nth(1);
  await expect(
    diaSiguiente,
    'el segundo boton del grupo "Día de la reserva" (el primer dia que no es hoy) deberia estar habilitado. Si esto falla, ese dia esta en disabled_days y hay que elegir otro indice o correr la prueba otro dia.',
  ).toBeEnabled();
  await diaSiguiente.click();

  // Espera explicita a la navegacion del click de arriba: mismo defecto y
  // misma cura que en e2e/reservar.spec.ts. Elegir un dia empuja la URL a
  // &dia=<AAAA-MM-DD>, y hasta entonces el DOM sigue trayendo las franjas del
  // dia anterior; sin esta linea el localizador de abajo clica una franja
  // vieja, el re-montaje la descarta y "Confirmar reserva" nunca se habilita.
  // Medido el 2026-08-15: pasaba de noche -cuando "hoy" no ofrece franjas- y
  // fallaba de madrugada -cuando si las ofrece-.
  await expect(page).toHaveURL(/[?&]dia=\d{4}-\d{2}-\d{2}/);

  // Franjas libres: <button aria-pressed> dentro de un <ul>. El scope por
  // <ul> importa porque el selector de duracion TAMBIEN usa aria-pressed,
  // pero vive en un <div role="group">, no en un <ul>.
  const primeraFranjaLibre = page.locator('ul button[aria-pressed]').first();
  await primeraFranjaLibre.click();

  const grupoMotivo = page.getByRole('radiogroup', { name: 'Motivo de la reserva' });
  await grupoMotivo.getByRole('radio', { name: 'Proyecto de curso' }).click();

  // Deshabilitado hasta que haya franja Y motivo
  // (components/reservas/formulario-reserva.tsx): la asercion de
  // "habilitado" confirma que los dos pasos de arriba de verdad quedaron
  // elegidos, y no solo que el boton existe.
  const botonConfirmar = page.getByRole('button', { name: 'Confirmar reserva' });
  await expect(botonConfirmar).toBeEnabled();
  await botonConfirmar.click();

  // page.url() no reintenta y la Server Action reservar() hace
  // redirect('/mi-panel') recien despues de que create_reservation
  // responda: expect(page).toHaveURL() si reintenta, y es la unica forma
  // correcta de esperar esta navegacion.
  await expect(page).toHaveURL('/mi-panel');

  return nombreProducto;
}
