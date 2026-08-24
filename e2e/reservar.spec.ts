import { expect, test } from '@playwright/test';

import { iniciarSesionComo } from './apoyo/sesion';

const ALUMNA_CON_PERFIL_COMPLETO = 'alumno.a@upc.edu.pe';

test.describe('reservar un equipo', () => {
  test('la alumna reserva un equipo de punta a punta y lo cancela', async ({ page }) => {
    await iniciarSesionComo(page, ALUMNA_CON_PERFIL_COMPLETO);

    // Tras el magic link la alumna cae en /catalogo. Esta asercion no navega:
    // confirma el punto de partida para que un cambio de destino falle AQUI y no
    // tres pasos mas abajo con un error confuso.
    await expect(page).toHaveURL('/catalogo');

    // La primera tarjeta, NO un nombre ni un id a mano: atarse al seed rompe la
    // prueba en cuanto el seed cambie. El prefijo `/catalogo/` -con barra- separa
    // las tarjetas de los enlaces de sede, que van a `/catalogo?sede=`.
    const primeraTarjeta = page.locator('a[href^="/catalogo/"]').first();
    await primeraTarjeta.click();

    // ESPERA EXPLICITA A LA NAVEGACION: 'h1' casa tanto en /catalogo como en el
    // detalle. Auto-esperar solo garantiza que el elemento EXISTA, y el <h1>
    // viejo ya existe, asi que la espera se resolveria al instante con el texto
    // equivocado. `toHaveURL` si reintenta.
    await expect(page).toHaveURL(/\/catalogo\/[^/?]+\?sede=[^/?]+/);

    // El nombre se guarda para reencontrar la reserva en /mi-panel: es la unica
    // forma de saber cual es "la suya" sin escribir el producto en el codigo.
    const textoH1 = await page.locator('h1').textContent();
    if (textoH1 === null || textoH1.trim() === '') {
      throw new Error('El <h1> del detalle de producto no trajo ningun texto');
    }
    const nombreProducto = textoH1.trim();

    // Enlace y no boton: solo es <Link> cuando el producto tiene unidades. El
    // nombre exacto evita casar con otro texto que contenga la palabra.
    await page.getByRole('link', { name: 'Reservar', exact: true }).click();

    // EL SEGUNDO y nunca el primero: el primero es HOY, y hoy puede no tener
    // ninguna franja libre segun la hora a la que corra esto. La asercion de
    // "habilitado" lleva mensaje para que un dia inhabilitado se explique solo y
    // no como un timeout ciego.
    const grupoDias = page.getByRole('group', { name: 'Día de la reserva' });
    const diaSiguiente = grupoDias.getByRole('button').nth(1);
    await expect(
      diaSiguiente,
      'el segundo boton del grupo "Día de la reserva" (el primer dia que no es hoy) deberia estar habilitado. Si esto falla, ese dia esta en disabled_days y hay que elegir otro indice o correr la prueba otro dia.',
    ).toBeEnabled();
    await diaSiguiente.click();

    // OTRA ESPERA EXPLICITA, y NO es opcional: hasta que la navegacion ocurre, el
    // DOM sigue trayendo las franjas del dia ANTERIOR. El localizador de abajo
    // resolveria contra esas, el re-montaje descartaria la seleccion, y el fallo
    // apareceria tres pasos despues lejos de su causa.
    //
    // Esta prueba venia pasando en verde por una propiedad de LA HORA y no del
    // codigo: de noche "hoy" no ofrece franjas, asi que no habia nada viejo que
    // clicar y el localizador se veia OBLIGADO a esperar. De madrugada la carrera
    // se pierde.
    await expect(page).toHaveURL(/[?&]dia=\d{4}-\d{2}-\d{2}/);

    // Las libres son <button aria-pressed> dentro de un <ul> y las ocupadas son
    // <li> sin boton, asi que no hay que filtrar por texto. El scope por <ul>
    // importa: el selector de duracion tambien usa `aria-pressed`, pero vive en
    // un <div role="group">.
    const primeraFranjaLibre = page.locator('ul button[aria-pressed]').first();
    await primeraFranjaLibre.click();

    const grupoMotivo = page.getByRole('radiogroup', { name: 'Motivo de la reserva' });
    await grupoMotivo.getByRole('radio', { name: 'Proyecto de curso' }).click();

    // Deshabilitado hasta que haya franja Y motivo: esta asercion es la prueba de
    // que los dos pasos de arriba de verdad quedaron elegidos.
    const botonConfirmar = page.getByRole('button', { name: 'Confirmar reserva' });
    await expect(botonConfirmar).toBeEnabled();
    await botonConfirmar.click();

    // `page.url()` no reintenta y el redirect llega despues de que la RPC
    // responda: `toHaveURL` si reintenta, y es la unica forma correcta.
    await expect(page).toHaveURL('/mi-panel');

    const encabezadoProximas = page.getByRole('heading', { name: 'Próximas', level: 2 });
    await expect(encabezadoProximas).toBeVisible();

    // DENTRO de la seccion "Próximas" y no en toda la pagina: una corrida previa
    // dejo su reserva cancelada en "Anteriores", y sin acotar se confundiria con
    // la de ahora. `data-slot="card"` lo pone components/ui/card.tsx, no esta
    // prueba.
    const seccionProximas = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Próximas', level: 2 }) });
    const tarjetaReserva = seccionProximas
      .locator('[data-slot="card"]')
      .filter({ hasText: nombreProducto });
    await expect(tarjetaReserva).toBeVisible();

    // LIMPIEZA a partir de aqui, no parte de lo que esta prueba verifica: sin
    // cancelar, la corrida siguiente fallaria por el limite diario por producto,
    // que cuenta `reserved` y `active` pero no `cancelled` (BR-09).
    await tarjetaReserva.getByRole('button', { name: 'Cancelar reserva' }).click();

    // Radix monta el dialogo en un portal fuera del arbol de la tarjeta.
    const dialogo = page.getByRole('dialog');
    await dialogo
      .getByLabel('Motivo de la cancelación')
      .fill('Limpieza automatica de la prueba e2e reservar.spec.ts');

    // Deshabilitado con el motivo vacio: confirma que el texto se registro.
    const botonConfirmarCancelacion = dialogo.getByRole('button', { name: 'Confirmar cancelación' });
    await expect(botonConfirmarCancelacion).toBeEnabled();
    await botonConfirmarCancelacion.click();

    // La reserva pasa a `cancelled` y deja de ser "proxima", asi que la tarjeta
    // desaparece de esa seccion -y de hecho la seccion entera, porque el seed no
    // siembra ninguna reserva-. La asercion vale en los dos casos: un locator
    // acotado a una seccion ausente tambien resuelve en cero.
    await expect(tarjetaReserva).toHaveCount(0);
  });
});
