import { expect, test } from '@playwright/test';

import { iniciarSesionComo, paginaConSesion } from './apoyo/sesion';

const ADMIN = 'admin@upc.edu.pe';
const ALUMNA_CON_PERFIL_COMPLETO = 'alumno.a@upc.edu.pe';

// El dia de MANANA en Lima, con el nombre que usan las dos pantallas.
//
// SE CALCULA CON Intl Y CON LA ZONA EXPLICITA, no con `getDay()` sobre el reloj
// del runner: el CI corre en UTC y en Lima -UTC-5- la fecha civil va un dia por
// detras durante las cinco primeras horas del dia UTC. Sin la zona, esta prueba
// pediria el turno de un dia y comprobaria el calendario de otro, y fallaria
// solo en esa franja horaria.
function nombreDeManana(): string {
  const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const dia = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    weekday: 'long',
  }).format(manana);
  return dia.charAt(0).toUpperCase() + dia.slice(1);
}

// F3-T4, Tarea 12: el calendario del alumno sale de los turnos del operador.
//
// LA PRUEBA MIDE EL CAMBIO Y NO EL ESTADO, que es lo que la distingue de las
// otras siete: no comprueba que haya franjas -eso ya lo cubre reservar.spec.ts-
// sino que las franjas DESAPARECEN al quitar la cobertura y VUELVEN al
// reponerla. Una prueba que pasara con y sin el cambio no mediria el cambio.
test.describe('horarios y turnos', () => {
  test('el calendario del alumno sale de los turnos del operador', async ({
    page,
    browser,
    baseURL,
  }) => {
    const MANANA = nombreDeManana();

    await iniciarSesionComo(page, ADMIN);
    await page.goto('/admin/horarios');

    // 1 · D-76: "cerrado" no es "sin operador", y el panel los separa.
    //
    // EL CONTROL ESTA EN LA MISMA FILA: el seed deja a San Miguel sin turno el
    // MIERCOLES a proposito, y a Monterrico con los siete dias cubiertos. Si el
    // panel dijera lo mismo de los dos, D-76 no estaria implementado. Con una
    // ventana de siete dias, el miercoles cae dentro siempre.
    const panel = page.locator('section').filter({ hasText: 'Los próximos' }).first();
    const miercoles = panel.getByRole('row').filter({ hasText: 'Miércoles' });
    // El orden de las columnas sale de `order('name')` en listarHorariosPorSede():
    // celda 1 = Monterrico, celda 2 = San Miguel.
    await expect(miercoles.getByRole('cell').nth(1)).toContainText('Cubierto');
    await expect(miercoles.getByRole('cell').nth(2)).toContainText('Sin operador');

    // 2 · Se quita la cobertura de MANANA en las dos sedes. Se borran todas las
    //     filas de ese dia sin saber cuantas hay: si manana fuera miercoles,
    //     San Miguel no tiene ninguna.
    const turnos = page.locator('section').filter({ hasText: 'Turnos del personal' }).first();
    const filasDeManana = turnos.getByRole('row').filter({ hasText: MANANA });

    const cuantos = await filasDeManana.count();
    expect(cuantos, `el seed deberia dejar al menos un turno el ${MANANA}`).toBeGreaterThan(0);

    for (let i = 0; i < cuantos; i += 1) {
      await filasDeManana.first().getByRole('button', { name: 'Borrar' }).click();
      await page.getByRole('button', { name: 'Borrar de todos modos' }).click();
      await expect(filasDeManana).toHaveCount(cuantos - i - 1);
    }

    // 3 · El alumno: manana ya no ofrece ninguna franja, y el mensaje NO nombra
    //     a nadie -- quien falta es dato de personal (Tarea 11, paso 3).
    const alumna = await paginaConSesion(browser, baseURL, ALUMNA_CON_PERFIL_COMPLETO);
    try {
      await alumna.page.locator('a[href^="/catalogo/"]').first().click();
      await expect(alumna.page).toHaveURL(/\/catalogo\/[^/?]+\?sede=[^/?]+/);
      await alumna.page.getByRole('link', { name: 'Reservar', exact: true }).click();

      // El segundo boton del grupo es MANANA: el primero es hoy, por contrato de
      // diasDeLaVentana() (lib/reservas/rejilla.ts).
      const grupoDias = alumna.page.getByRole('group', { name: 'Día de la reserva' });
      await grupoDias.getByRole('button').nth(1).click();
      await expect(alumna.page).toHaveURL(/[?&]dia=\d{4}-\d{2}-\d{2}/);

      await expect(alumna.page.getByText('No hay franjas disponibles')).toBeVisible();
      // El control de que el mensaje es el generico y no otro: no aparece el de
      // dia inhabilitado, que tambien da cero franjas.
      await expect(alumna.page.getByText('no hay atención')).toHaveCount(0);

      // 4 · Se repone la cobertura, y las franjas VUELVEN. Es la mitad que
      //     convierte esto en una prueba del cambio: sin ella, "no hay franjas"
      //     tambien lo cumpliria una consulta rota.
      // SE REPONE EN LAS DOS SEDES y no solo en la primera: la sede que la
      // alumna esta mirando sale del filtro del catalogo, y esta prueba no la
      // conoce. Reponer una sola dejaria la mitad de las corridas sin franjas
      // por un motivo que no es el que se esta midiendo.
      await turnos.getByLabel('Persona').click();
      await page.getByRole('option').first().click();

      for (const nombreSede of ['Monterrico', 'San Miguel']) {
        await turnos.getByLabel('Sede').click();
        await page.getByRole('option', { name: nombreSede, exact: true }).click();
        await turnos.getByLabel('Día').click();
        await page.getByRole('option', { name: MANANA, exact: true }).click();
        await turnos.getByRole('button', { name: 'Añadir turno' }).click();
      }

      await expect(filasDeManana).toHaveCount(2);

      await alumna.page.reload();
      await expect(alumna.page.locator('ul button[aria-pressed]').first()).toBeVisible();
    } finally {
      await alumna.cerrar();
    }
  });
});
