import { expect, test } from '@playwright/test';

import { reservarParaManana } from './apoyo/reserva';
import { iniciarSesionComo, paginaConSesion } from './apoyo/sesion';

const ALUMNA_CON_PERFIL_COMPLETO = 'alumno.a@upc.edu.pe';
const OPERADOR = 'operador@upc.edu.pe';

test.describe('el mostrador atiende una reserva de punta a punta', () => {
  // Esta prueba es TAMBIEN la comprobacion de que la reserva EXISTE DE
  // VERDAD y no solo en la pantalla que la creo: la crea la SESION de la
  // alumna -una consulta protegida por la politica que la reconoce como
  // DUEÑA de la fila-, y la ve la SESION del operador -otra consulta
  // distinta, en otra pagina, protegida por la politica que lo reconoce
  // como PERSONAL-. Que la segunda sesion la encuentre es evidencia de que
  // la fila quedo escrita de verdad en la base y no solo pintada en la
  // pantalla que la creo.
  //
  // Lo que esta prueba NO es: una lectura directa de la base. En ningun
  // momento abre una conexion a Postgres ni usa la clave service_role -D-62-;
  // todo lo que sabe sobre la reserva lo sabe porque OTRA pantalla, de OTRO
  // usuario, la mostro por su propia consulta.
  test('la alumna reserva, el operador entrega y luego devuelve el equipo', async ({
    page,
    browser,
    baseURL,
  }) => {
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
      const columnaActivas = operador.page
        .locator('section')
        .filter({ has: operador.page.getByRole('heading', { name: 'Activas', level: 2 }) });
      const columnaPorDevolver = operador.page
        .locator('section')
        .filter({ has: operador.page.getByRole('heading', { name: 'Por devolver', level: 2 }) });

      // El filtro de fecha de "Por entregar" ARRANCA en "Todas"
      // (components/mostrador/filtro-fecha.tsx), asi que la reserva de
      // MANANA que dejo reservarParaManana() se ve sin tocar el filtro.
      const tarjetaPorEntregar = columnaPorEntregar
        .locator('[data-slot="card"]')
        .filter({ hasText: nombreProducto });
      await expect(tarjetaPorEntregar).toBeVisible();

      await tarjetaPorEntregar.getByRole('button', { name: 'Producto entregado' }).click();

      // entregar() revalida /mostrador: reserved -> active mueve la tarjeta
      // de "Por entregar" a "Activas" (columnaDeReserva(),
      // lib/mostrador/columnas.ts).
      await expect(tarjetaPorEntregar).toHaveCount(0);
      const tarjetaActiva = columnaActivas
        .locator('[data-slot="card"]')
        .filter({ hasText: nombreProducto });
      await expect(tarjetaActiva).toBeVisible();

      await tarjetaActiva.getByRole('button', { name: 'Producto devuelto' }).click();

      // recibir() deja la reserva en `completed`, estado TERMINAL:
      // reservasMostrador() (lib/mostrador/consultas.ts) solo trae filas con
      // `status in ('reserved', 'active')`, asi que la reserva desaparece de
      // las TRES columnas a la vez -no se mueve a una cuarta, porque el
      // mostrador no tiene una seccion para estados terminales.
      await expect(tarjetaActiva).toHaveCount(0);

      const tarjetaPorDevolver = columnaPorDevolver
        .locator('[data-slot="card"]')
        .filter({ hasText: nombreProducto });
      await expect(tarjetaPorDevolver).toHaveCount(0);

      const tarjetaPorEntregarFinal = columnaPorEntregar
        .locator('[data-slot="card"]')
        .filter({ hasText: nombreProducto });
      await expect(tarjetaPorEntregarFinal).toHaveCount(0);

      // Sin LIMPIEZA aparte: 'completed' ya es un estado TERMINAL, y no
      // cuenta ni para daily_limit_per_product ni para el anti-solape -la
      // corrida siguiente de esta prueba no choca con esta reserva.
    } finally {
      await operador.cerrar();
    }
  });
});
