import { expect, test } from '@playwright/test';

import { reservarParaManana } from './apoyo/reserva';
import { iniciarSesionComo, paginaConSesion } from './apoyo/sesion';

const ALUMNA_CON_PERFIL_COMPLETO = 'alumno.a@upc.edu.pe';
const OPERADOR = 'operador@upc.edu.pe';

test.describe('cancelar una reserva desde /mi-panel', () => {
  test('la alumna cancela una reserva propia escribiendo un motivo', async ({ page }) => {
    await iniciarSesionComo(page, ALUMNA_CON_PERFIL_COMPLETO);
    const nombreProducto = await reservarParaManana(page);

    // reservarParaManana() ya deja a la alumna en /mi-panel.
    const seccionProximas = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Próximas', level: 2 }) });
    const tarjetaReserva = seccionProximas
      .locator('[data-slot="card"]')
      .filter({ hasText: nombreProducto });
    await expect(tarjetaReserva).toBeVisible();

    await tarjetaReserva.getByRole('button', { name: 'Cancelar reserva' }).click();

    // Radix monta el dialogo en un portal fuera del arbol de la tarjeta.
    const dialogo = page.getByRole('dialog');

    // MOTIVO UNICO POR CORRIDA: es la unica forma de reencontrar SU PROPIA
    // tarjeta bajo "Anteriores", que acumula las reservas terminales de todas las
    // corridas anteriores, todas del mismo producto. Filtrar por nombre alli
    // resolvia a cinco elementos en la segunda corrida y nueve en la tercera, y
    // Playwright falla por modo estricto.
    const motivoCancelacion = `Prueba e2e cancelar.spec.ts: cancelacion con motivo (${Date.now()})`;
    await dialogo.getByLabel('Motivo de la cancelación').fill(motivoCancelacion);

    // Deshabilitado con el motivo vacio: confirma que el texto se registro.
    const botonConfirmarCancelacion = dialogo.getByRole('button', { name: 'Confirmar cancelación' });
    await expect(botonConfirmarCancelacion).toBeEnabled();
    await botonConfirmarCancelacion.click();

    // La reserva pasa a `cancelled` y se reclasifica de "proxima" a "pasada", asi
    // que esta tarjeta desaparece de Proximas.
    await expect(tarjetaReserva).toHaveCount(0);

    // Y aparece bajo Anteriores. Se localiza por el MOTIVO y no por el producto,
    // por lo dicho arriba: esa seccion SI acumula, a diferencia de las que solo
    // pintan reservas vivas.
    const seccionAnteriores = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Anteriores', level: 2 }) });
    const tarjetaCancelada = seccionAnteriores
      .locator('[data-slot="card"]')
      .filter({ hasText: motivoCancelacion });
    await expect(tarjetaCancelada).toBeVisible();
    await expect(tarjetaCancelada.getByText('Cancelada', { exact: true })).toBeVisible();

    // Y el motivo llego a la base y volvio a la pantalla: sin esta asercion, la
    // prueba solo miraba que apareciera la etiqueta "Cancelada".
    await expect(
      tarjetaCancelada.getByText(`Motivo de la cancelación: ${motivoCancelacion}`, { exact: true }),
    ).toBeVisible();

    // SIN LIMPIEZA, y hay que decir por que con precision: 'cancelled' es
    // TERMINAL y el limite diario solo cuenta 'reserved' y 'active', asi que la
    // corrida siguiente SI puede reservar. Pero eso no es "dejar la base como se
    // encontro": la fila no se borra y queda bajo Anteriores para siempre.
    //
    // Dejar la base sin nada VIVO libera la capacidad de CREAR, no la de
    // IDENTIFICAR una tarjeta concreta. Son dos capacidades distintas, y esta
    // prueba fallaba por confundirlas.
  });

  // D-62: el arnes NUNCA escribe directo en la base -nada de service_role-, asi
  // que el contraejemplo no puede ser una reserva ya EMPEZADA: ninguna pantalla
  // deja crear una cuyo inicio ya paso. El que SI se puede montar por pantalla es
  // una YA ENTREGADA.
  //
  // PRECISION SOBRE QUE PRUEBA: la PRIMERA condicion de seOfreceCancelar()
  // -`estado === 'reserved'`-, que deja de cumplirse en cuanto pasa a `active`.
  // NO prueba D-38, que cubren pgTAP y el test de Vitest de esa funcion.
  test('una reserva ya entregada no ofrece el boton de cancelar', async ({ page, browser, baseURL }) => {
    await iniciarSesionComo(page, ALUMNA_CON_PERFIL_COMPLETO);
    const nombreProducto = await reservarParaManana(page);

    // Segunda sesion en un contexto aparte: ver paginaConSesion().
    const operador = await paginaConSesion(browser, baseURL, OPERADOR);

    try {
      // operador@upc.edu.pe entra y cae en /mostrador (lib/auth/destino.ts,
      // hecho medido en un navegador real).
      await expect(operador.page).toHaveURL('/mostrador');

      const columnaPorEntregar = operador.page
        .locator('section')
        .filter({ has: operador.page.getByRole('heading', { name: 'Por entregar', level: 2 }) });
      const tarjetaMostrador = columnaPorEntregar
        .locator('[data-slot="card"]')
        .filter({ hasText: nombreProducto });
      await expect(tarjetaMostrador).toBeVisible();

      await tarjetaMostrador.getByRole('button', { name: 'Producto entregado' }).click();

      // entregar() revalida /mostrador: reserved -> active saca la tarjeta
      // de "Por entregar" (columnaDeReserva(), lib/mostrador/columnas.ts).
      await expect(tarjetaMostrador).toHaveCount(0);

      // La alumna recarga /mi-panel: la reserva sigue ahi, ahora `active`.
      await page.reload();

      const seccionEnCurso = page
        .locator('section')
        .filter({ has: page.getByRole('heading', { name: 'En curso', level: 2 }) });
      const tarjetaEnCurso = seccionEnCurso
        .locator('[data-slot="card"]')
        .filter({ hasText: nombreProducto });
      await expect(tarjetaEnCurso).toBeVisible();
      await expect(tarjetaEnCurso.getByText('En curso', { exact: true })).toBeVisible();

      // El boton NO EXISTE, y se comprueba con toHaveCount(0) y no con
      // not.toBeVisible(): seOfreceCancelar() hace que TarjetaReserva
      // (components/reservas/tarjeta-reserva.tsx) no pinte
      // <DialogoCancelar> en absoluto para esta reserva -el boton se
      // DESMONTA del arbol, no queda oculto con CSS-, y not.toBeVisible()
      // pasaria igual con un elemento oculto que con uno que nunca existio,
      // que no es la distincion que hace falta aca.
      await expect(tarjetaEnCurso.getByRole('button', { name: 'Cancelar reserva' })).toHaveCount(0);
    } finally {
      // LIMPIEZA: el operador pulsa "Producto devuelto" para dejar la
      // reserva en `completed`, estado TERMINAL. Sin esto quedaria `active`
      // para siempre y la corrida siguiente de esta prueba chocaria con
      // daily_limit_per_product, que cuenta 'reserved' y 'active'.
      const columnaActivas = operador.page
        .locator('section')
        .filter({ has: operador.page.getByRole('heading', { name: 'Activas', level: 2 }) });
      const tarjetaActiva = columnaActivas
        .locator('[data-slot="card"]')
        .filter({ hasText: nombreProducto });
      await tarjetaActiva.getByRole('button', { name: 'Producto devuelto' }).click();
      await expect(tarjetaActiva).toHaveCount(0);

      await operador.cerrar();
    }
  });
});
