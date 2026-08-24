import { expect, type Page } from '@playwright/test';

// Deja creada UNA reserva para mañana recorriendo la interfaz, y devuelve el
// nombre del producto: la unica forma de que quien llama sepa despues cual
// tarjeta es "la suya" sin escribir ningun nombre a mano.
//
// DUPLICA EL RECORRIDO DE reservar.spec.ts A PROPOSITO, y no al reves: alli el
// recorrido ES lo que se prueba, con una asercion por paso; aqui es solo el
// ESCENARIO que otra prueba necesita. Si reservar.spec.ts importara este
// ayudante, el ayudante podria mutar sin que la prueba que existe para vigilar
// ese recorrido se enterara.
export async function reservarParaManana(page: Page): Promise<string> {
  // Explicito en vez de asumir que `page` ya esta ahi: este ayudante no depende
  // de que quien lo llama venga recien de iniciar sesion.
  await page.goto('/catalogo');

  // La primera tarjeta y NO un nombre a mano: atarse al seed rompe la prueba en
  // cuanto el seed cambie. El prefijo `/catalogo/` separa las tarjetas de los
  // enlaces de sede.
  const primeraTarjeta = page.locator('a[href^="/catalogo/"]').first();
  await primeraTarjeta.click();

  // Antes de leer el <h1>: el de /catalogo YA EXISTE al hacer click, y
  // auto-esperar solo garantiza que el elemento exista, no que la navegacion haya
  // ocurrido. `toHaveURL` si reintenta.
  await expect(page).toHaveURL(/\/catalogo\/[^/?]+\?sede=[^/?]+/);

  const textoH1 = await page.locator('h1').textContent();
  if (textoH1 === null || textoH1.trim() === '') {
    throw new Error('El <h1> del detalle de producto no trajo ningun texto');
  }
  const nombreProducto = textoH1.trim();

  // Enlace y no boton: solo es <Link> cuando el producto tiene unidades.
  await page.getByRole('link', { name: 'Reservar', exact: true }).click();

  // Indice 1 y NUNCA 0: el primero es HOY, y hoy puede tener cero franjas segun
  // la hora. La asercion lleva mensaje para que un dia inhabilitado se explique
  // solo y no como un timeout ciego.
  const grupoDias = page.getByRole('group', { name: 'Día de la reserva' });
  const diaSiguiente = grupoDias.getByRole('button').nth(1);
  await expect(
    diaSiguiente,
    'el segundo boton del grupo "Día de la reserva" (el primer dia que no es hoy) deberia estar habilitado. Si esto falla, ese dia esta en disabled_days y hay que elegir otro indice o correr la prueba otro dia.',
  ).toBeEnabled();
  await diaSiguiente.click();

  // Mismo defecto y misma cura que en reservar.spec.ts: hasta que la navegacion
  // ocurre, el DOM sigue trayendo las franjas del dia anterior, y el localizador
  // de abajo clicaria una vieja que el re-montaje descarta.
  await expect(page).toHaveURL(/[?&]dia=\d{4}-\d{2}-\d{2}/);

  // Las libres son <button aria-pressed> dentro de un <ul>. El scope importa: el
  // selector de duracion tambien usa aria-pressed, pero vive en un role="group".
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
