import { expect, test } from '@playwright/test';

import { reservarParaManana } from './apoyo/reserva';
import { iniciarSesionComo, paginaConSesion } from './apoyo/sesion';

const ALUMNA_CON_PERFIL_COMPLETO = 'alumno.a@upc.edu.pe';
const OPERADOR = 'operador@upc.edu.pe';

test.describe('cancelar una reserva desde /mi-panel', () => {
  test('la alumna cancela una reserva propia escribiendo un motivo', async ({ page }) => {
    await iniciarSesionComo(page, ALUMNA_CON_PERFIL_COMPLETO);
    const nombreProducto = await reservarParaManana(page);

    // reservarParaManana() ya deja a la alumna en /mi-panel -la Server
    // Action reservar() redirige alla-, asi que no hace falta un goto extra
    // aca.
    const seccionProximas = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Próximas', level: 2 }) });
    const tarjetaReserva = seccionProximas
      .locator('[data-slot="card"]')
      .filter({ hasText: nombreProducto });
    await expect(tarjetaReserva).toBeVisible();

    await tarjetaReserva.getByRole('button', { name: 'Cancelar reserva' }).click();

    // Radix monta Dialog.Content en un portal fuera del arbol de la tarjeta,
    // asi que se busca por su rol y no dentro de tarjetaReserva.
    const dialogo = page.getByRole('dialog');

    // Motivo UNICO por corrida, con Date.now(): es la unica forma de que
    // esta prueba reencuentre SU PROPIA tarjeta bajo "Anteriores" mas abajo.
    // El nombre del producto NO alcanza ahi -ver el comentario al final de
    // esta prueba- porque "Anteriores" acumula toda reserva TERMINAL
    // ('cancelled', 'completed') de TODAS las corridas anteriores de esta
    // suite, y todas piden el mismo producto (reservarParaManana() siempre
    // toma la primera tarjeta del catalogo). Un filtro por nombre de
    // producto ahi resuelve a varios elementos: medido, cinco en la segunda
    // corrida de esta prueba y nueve en la tercera, con Playwright fallando
    // por modo estricto.
    const motivoCancelacion = `Prueba e2e cancelar.spec.ts: cancelacion con motivo (${Date.now()})`;
    await dialogo.getByLabel('Motivo de la cancelación').fill(motivoCancelacion);

    // Deshabilitado mientras el motivo este vacio tras trim()
    // (components/reservas/dialogo-cancelar.tsx): confirma que el texto de
    // arriba de verdad se registro antes de intentar el click.
    const botonConfirmarCancelacion = dialogo.getByRole('button', { name: 'Confirmar cancelación' });
    await expect(botonConfirmarCancelacion).toBeEnabled();
    await botonConfirmarCancelacion.click();

    // Tras cancelar bien, cancelar() revalida /mi-panel: la reserva pasa a
    // `cancelled`, grupoDeReserva() (lib/reservas/agrupar.ts) la reclasifica
    // de "proxima" a "pasada", y esta tarjeta concreta desaparece de la
    // seccion Proximas -aunque la seccion siga existiendo por otras reservas
    // futuras del seed-.
    await expect(tarjetaReserva).toHaveCount(0);

    // Y aparece bajo Anteriores, con la etiqueta que etiquetaDeEstado()
    // (lib/reservas/agrupar.ts) asigna al estado 'cancelled'. Se localiza por
    // el MOTIVO (ver arriba) y no por nombreProducto: "Anteriores" en si SI
    // acumula -a diferencia de "Proximas", "En curso" o cualquier columna del
    // mostrador, que solo pintan reservas VIVAS y nunca tienen mas de una a
    // la vez- pero el motivo es unico por corrida, asi que tarjetaCancelada
    // sigue resolviendo a un solo elemento aunque la seccion entera tenga
    // muchos.
    const seccionAnteriores = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Anteriores', level: 2 }) });
    const tarjetaCancelada = seccionAnteriores
      .locator('[data-slot="card"]')
      .filter({ hasText: motivoCancelacion });
    await expect(tarjetaCancelada).toBeVisible();
    await expect(tarjetaCancelada.getByText('Cancelada', { exact: true })).toBeVisible();

    // Y el motivo que se escribio arriba de verdad llego a la base y volvio
    // a la pantalla -components/reservas/tarjeta-reserva.tsx lo pinta como
    // "Motivo de la cancelacion: {motivo}"-, algo que esta prueba antes NO
    // comprobaba: solo miraba que alguna tarjeta del producto apareciera
    // bajo Anteriores con la etiqueta "Cancelada", sin leer el motivo en
    // absoluto.
    await expect(
      tarjetaCancelada.getByText(`Motivo de la cancelación: ${motivoCancelacion}`, { exact: true }),
    ).toBeVisible();

    // Sin LIMPIEZA para la capacidad de CREAR: 'cancelled' es un estado
    // TERMINAL, y daily_limit_per_product y el anti-solape solo cuentan
    // 'reserved' y 'active', asi que esta reserva no le impide a la corrida
    // siguiente reservar el mismo producto.
    //
    // Pero eso no es "dejar la base como se encontro". La fila cancelada NO
    // se borra -terminal es distinto de ausente- y queda pintada bajo
    // Anteriores para siempre, una fila mas por cada corrida. Dejar la base
    // sin nada VIVO no libera la capacidad de IDENTIFICAR una tarjeta
    // concreta ahi, solo la de CREAR una reserva nueva: son dos capacidades
    // distintas, y esta prueba fallaba -en su segunda corrida, con cinco
    // tarjetas encontradas, y en la tercera, con nueve- por confundirlas.
    // Localizar por el motivo, arriba, es la correccion: un dato que esta
    // corrida escribe y ninguna otra.
  });

  // D-62, decision tomada y no discutida aca: el arnes de estas pruebas NUNCA
  // escribe directo en la base -nada de service_role, nada de SQL suelto-,
  // asi que el contraejemplo de "no se ofrece cancelar" no puede ser una
  // reserva ya EMPEZADA -ninguna pantalla deja crear una reserva cuyo inicio
  // ya paso, asi que no hay forma de montar ese escenario recorriendo la
  // interfaz-. El contraejemplo que SI se puede montar por pantalla es una
  // reserva YA ENTREGADA: basta con que el operador pulse "Producto
  // entregado" antes de que la alumna vuelva a mirar /mi-panel.
  //
  // Y hay que ser precisos con lo que esto prueba y lo que no: NO prueba
  // D-38 -que una reserva `reserved` ya EMPEZADA no se puede cancelar, ni
  // desde la pantalla ni desde el motor-. Eso lo prueban la migracion 23
  // (supabase/migrations/20260812053243_cancel_before_start.sql) en pgTAP, y
  // el test de Vitest de seOfreceCancelar() sobre su tercera condicion.
  // Esta prueba cubre la PRIMERA de las tres condiciones de
  // seOfreceCancelar() (lib/reservas/agrupar.ts): `estado === 'reserved'`,
  // que deja de cumplirse en cuanto la reserva pasa a `active`, sin que haga
  // falta que su horario haya empezado.
  test('una reserva ya entregada no ofrece el boton de cancelar', async ({ page, browser, baseURL }) => {
    await iniciarSesionComo(page, ALUMNA_CON_PERFIL_COMPLETO);
    const nombreProducto = await reservarParaManana(page);

    // Segunda sesion, la del operador, en un contexto de navegador aparte:
    // ver el comentario de paginaConSesion() en e2e/apoyo/sesion.ts sobre
    // por que hace falta un contexto separado y no otra pestana.
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
