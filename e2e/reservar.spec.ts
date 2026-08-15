import { expect, test } from '@playwright/test';

import { iniciarSesionComo } from './apoyo/sesion';

const ALUMNA_CON_PERFIL_COMPLETO = 'alumno.a@upc.edu.pe';

test.describe('reservar un equipo', () => {
  test('la alumna reserva un equipo de punta a punta y lo cancela', async ({ page }) => {
    await iniciarSesionComo(page, ALUMNA_CON_PERFIL_COMPLETO);

    // Medido en un navegador real: tras el magic link la alumna ya cae en
    // /catalogo (lib/auth/destino.ts). Esta asercion no navega -solo confirma
    // el punto de partida-, para que si algun dia el destino cambia, esta
    // prueba falle aca y no tres pasos mas abajo con un error confuso sobre
    // un enlace que no existe.
    await expect(page).toHaveURL('/catalogo');

    // La primera tarjeta de producto, y NO un nombre ni un id escritos a
    // mano: el seed local es una fixture de valores convenientes
    // (MIGRATION_DOCS/ESTADO_Y_PLAN.md), asi que atarse a que el primer
    // producto se llame de cierta forma rompe la prueba en cuanto el seed
    // cambie. components/catalogo/tarjeta-producto.tsx envuelve la tarjeta
    // entera en un <Link>, y components/catalogo/filtros.tsx arma su href
    // como `/catalogo/${id}?sede=${sedeId}` -con barra despues de
    // "catalogo"-, mientras que los enlaces de sede
    // (app/(alumno)/catalogo/page.tsx) van a `/catalogo?sede=...`, sin esa
    // barra. El prefijo de abajo separa uno de otro sin ambiguedad.
    const primeraTarjeta = page.locator('a[href^="/catalogo/"]').first();
    await primeraTarjeta.click();

    // Espera explicita a la navegacion, medida en un navegador real: el
    // selector 'h1' casa TANTO en /catalogo (el <h1>Catálogo</h1> de la
    // pantalla de partida) COMO en el detalle. textContent() si auto-espera,
    // pero auto-esperar solo garantiza que el elemento EXISTA, y un <h1> ya
    // existe antes del click -en la pantalla vieja-, asi que esa espera se
    // resuelve al instante con el texto equivocado, antes de que la
    // navegacion ocurra. Por eso hace falta esperar la URL del detalle
    // -/catalogo/<id>?sede=<id>- antes de leer el <h1>. toHaveURL si
    // reintenta.
    await expect(page).toHaveURL(/\/catalogo\/[^/?]+\?sede=[^/?]+/);

    // El nombre se lee del <h1> del detalle
    // (app/(alumno)/catalogo/[id]/page.tsx: `<h1>{producto.name}</h1>`, unico
    // h1 de esa pantalla) y se guarda para volver a buscarlo mas adelante en
    // /mi-panel. Es la unica forma de la prueba de saber que reserva es "la
    // suya" sin haber escrito el nombre del producto en el codigo.
    const textoH1 = await page.locator('h1').textContent();
    if (textoH1 === null || textoH1.trim() === '') {
      throw new Error('El <h1> del detalle de producto no trajo ningun texto');
    }
    const nombreProducto = textoH1.trim();

    // Enlace, no boton: app/(alumno)/catalogo/[id]/page.tsx solo deja este
    // "Reservar" como <Button asChild> envolviendo un <Link> cuando el
    // producto tiene unidades en alguna sede. El nombre exacto evita casar
    // con cualquier otro texto que contenga la palabra.
    await page.getByRole('link', { name: 'Reservar', exact: true }).click();

    // Se elige el SEGUNDO boton del grupo (indice 1), nunca el primero: el
    // primero es HOY (contrato de diasDeLaVentana(), citado en el comentario
    // de components/reservas/calendario.tsx), y hoy puede no tener ninguna
    // franja libre segun la hora a la que corra esta prueba -la rejilla
    // arranca en la apertura y el cierre la recorta-. Antes de tocarlo se
    // afirma que esta habilitado, con un mensaje que explica la asuncion: si
    // UPC llegara a inhabilitar ese dia concreto, el fallo tiene que
    // explicarse solo y no como un timeout ciego.
    const grupoDias = page.getByRole('group', { name: 'Día de la reserva' });
    const diaSiguiente = grupoDias.getByRole('button').nth(1);
    await expect(
      diaSiguiente,
      'el segundo boton del grupo "Día de la reserva" (el primer dia que no es hoy) deberia estar habilitado. Si esto falla, ese dia esta en disabled_days y hay que elegir otro indice o correr la prueba otro dia.',
    ).toBeEnabled();
    await diaSiguiente.click();

    // Las franjas libres son <button aria-pressed> dentro de un <ul>
    // (components/reservas/calendario.tsx); las ocupadas son <li> sin
    // boton, asi que no hace falta filtrar por "Ocupado" en el texto. El
    // scope por <ul> importa: el selector de duracion
    // (components/reservas/selector-duracion.tsx) TAMBIEN pone
    // `aria-pressed` en sus botones, pero esos viven en un <div
    // role="group">, no en un <ul>, asi que no colisionan con este
    // localizador.
    const primeraFranjaLibre = page.locator('ul button[aria-pressed]').first();
    await primeraFranjaLibre.click();

    const grupoMotivo = page.getByRole('radiogroup', { name: 'Motivo de la reserva' });
    await grupoMotivo.getByRole('radio', { name: 'Proyecto de curso' }).click();

    // Deshabilitado hasta que haya franja Y motivo (components/reservas/formulario-reserva.tsx):
    // la asercion de "habilitado" es la prueba de que los dos pasos de
    // arriba de verdad quedaron elegidos, y no solo de que el boton existe.
    const botonConfirmar = page.getByRole('button', { name: 'Confirmar reserva' });
    await expect(botonConfirmar).toBeEnabled();
    await botonConfirmar.click();

    // page.url() no reintenta -Playwright lo lee una sola vez, en el
    // instante en que se lo llama-, y la Server Action reservar() hace
    // redirect('/mi-panel') recien despues de que create_reservation
    // responda. expect(page).toHaveURL() si reintenta, y es la unica forma
    // correcta de esperar esta navegacion.
    await expect(page).toHaveURL('/mi-panel');

    const encabezadoProximas = page.getByRole('heading', { name: 'Próximas', level: 2 });
    await expect(encabezadoProximas).toBeVisible();

    // La tarjeta de la reserva recien creada: components/reservas/tarjeta-reserva.tsx
    // pinta el nombre del producto dentro de un <div data-slot="card"> (el
    // atributo que ya pone components/ui/card.tsx, no uno inventado para
    // esta prueba). Se busca DENTRO de la seccion "Próximas" -y no en toda
    // la pagina- porque una corrida previa de esta misma prueba cancela su
    // reserva al terminar (ver la LIMPIEZA mas abajo) y la deja en
    // "Anteriores": sin acotar por seccion, esa reserva cancelada del mismo
    // producto se confundiria con la de ahora.
    const seccionProximas = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Próximas', level: 2 }) });
    const tarjetaReserva = seccionProximas
      .locator('[data-slot="card"]')
      .filter({ hasText: nombreProducto });
    await expect(tarjetaReserva).toBeVisible();

    // LIMPIEZA a partir de aca, no parte de lo que esta prueba verifica: sin
    // cancelar, la reserva queda viva en estado `reserved` y la corrida
    // siguiente de esta misma prueba fallaria al intentar reservar el mismo
    // producto el mismo dia -el limite diario por producto vale 1 y cuenta
    // `reserved` y `active`, no `cancelled` (create_reservation, BR-09)-.
    await tarjetaReserva.getByRole('button', { name: 'Cancelar reserva' }).click();

    // Radix monta Dialog.Content en un portal fuera del arbol de la tarjeta,
    // asi que se busca por su rol y no dentro de tarjetaReserva.
    const dialogo = page.getByRole('dialog');
    await dialogo
      .getByLabel('Motivo de la cancelación')
      .fill('Limpieza automatica de la prueba e2e reservar.spec.ts');

    // Deshabilitado mientras el motivo este vacio tras trim()
    // (components/reservas/dialogo-cancelar.tsx): confirma que el texto de
    // arriba de verdad se registro antes de intentar el click.
    const botonConfirmarCancelacion = dialogo.getByRole('button', { name: 'Confirmar cancelación' });
    await expect(botonConfirmarCancelacion).toBeEnabled();
    await botonConfirmarCancelacion.click();

    // Tras cancelar bien, cancelar() revalida /mi-panel y la reserva pasa a
    // `cancelled`: grupoDeReserva() ya no la clasifica como "proxima", asi
    // que esta tarjeta concreta desaparece de la seccion "Próximas" -y de
    // hecho la seccion entera desaparece con ella: el seed no siembra
    // ninguna reserva (supabase/seed.sql lo dice de forma explicita en su
    // ultima linea) y esta prueba no deja otra reserva viva, asi que
    // proxima.length llega a 0 y app/(alumno)/mi-panel/page.tsx deja de
    // pintar hasta el <h2>. La asercion vale igual en los dos casos: un
    // locator acotado a una seccion que ya no esta en el DOM tambien
    // resuelve en cero elementos-.
    await expect(tarjetaReserva).toHaveCount(0);
  });
});
