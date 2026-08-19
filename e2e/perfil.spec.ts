import { expect, test } from '@playwright/test';

import { iniciarSesionComo } from './apoyo/sesion';

// D-79: el formulario de datos salta en la PRIMERA RESERVA, no al entrar.
// Antes lo disparaba app/(alumno)/layout.tsx al pisar el grupo (alumno), o sea
// que nadie podia ni mirar el catalogo sin llenarlo.
//
// POR QUE ESTA PRUEBA EXISTE (Q-25, cerrado en la F3-T2): las otras cuatro
// specs entran como alumno.a, que el seed siembra con confirmo_facultad = true,
// asi que NINGUNA pasa por esta puerta. Hasta hoy se comprobaba a mano -- se
// hizo el 2026-08-18 al cerrar la F3-T1 --, o sea que dependia de que alguien
// se acordara.
//
// ⚠ ESTA PRUEBA DEJA A BRUNO CONFIRMADO, y por eso EXIGE BASE LIMPIA: al
// terminar, confirmo_facultad queda en true y una segunda corrida sin
// `db reset` NO veria el rebote -- entraria directo a reservar y la asercion
// de la URL fallaria sin que nada este roto --. No es una deuda nueva: Q-26 ya
// dice que el E2E entero necesita base limpia, y la correccion 8 del plan de
// la F3-T1 midio que tres corridas seguidas sin resetear bajan de 6/6 a 3/6.
// El orden que funciona es: db reset -> calentar Auth -> E2E.
//
// NO SE TOCA LA BASE PARA DEJARLA COMO ESTABA (D-62): el arnes entra por la
// superficie real y solo por ella. Deshacerlo por psql seria arreglar con una
// herramienta lo que la prueba hizo con otra, y taparia justo la dependencia
// que este comentario declara.
const ALUMNO_SIN_CONFIRMAR = 'alumno.b@upc.edu.pe';

test.describe('la puerta de perfil de la primera reserva', () => {
  test('Bruno mira el catalogo sin formulario, y al reservar pasa por el', async ({ page }) => {
    await iniciarSesionComo(page, ALUMNO_SIN_CONFIRMAR);

    // PRIMER EFECTO DE D-79, y el que el cliente pidio: quien solo viene a
    // mirar, mira. Con el perfil a medias cae igual en /catalogo.
    await expect(page).toHaveURL('/catalogo');

    // La primera tarjeta, no un nombre a mano: el seed es una fixture de
    // valores convenientes y atarse a un nombre concreto rompe la prueba en
    // cuanto cambie. Mismo criterio que e2e/apoyo/reserva.ts.
    await page.locator('a[href^="/catalogo/"]').first().click();
    await expect(page).toHaveURL(/\/catalogo\/[^/?]+\?sede=[^/?]+/);

    // El destino al que se QUERIA ir. Se captura de la URL real en vez de
    // construirlo, para que la asercion final compare contra el sitio del que
    // de verdad se salio.
    const detalle = new URL(page.url());
    const destinoEsperado = `${detalle.pathname}/reservar?sede=${detalle.searchParams.get('sede')}`;

    await page.getByRole('link', { name: 'Reservar', exact: true }).click();

    // SEGUNDO EFECTO DE D-79: la puerta. Rebota, y se lleva el destino en la
    // URL. Se afirma sobre el parametro ya decodificado y no sobre la cadena
    // cruda: como el destino lleva su propio `?sede=`, va URL-encoded
    // -- %2F y %3F --, y comparar el texto crudo seria comparar el
    // codificador, no el destino.
    await expect(page).toHaveURL(/\/completar-perfil\?volver=/);
    const volver = new URL(page.url()).searchParams.get('volver');
    expect(volver).toBe(destinoEsperado);

    // LA CORRECCION 7 DE LA F3-T1, que ningun typecheck puede ver: el
    // desplegable llega con la carrera que Bruno YA tenia -- "Ciencias de la
    // Computacion" en el seed -- y no con el placeholder vacio. Se afirma que
    // no esta vacio, y no el nombre, para no atarse al seed: el valor vacio es
    // el del <option disabled>, o sea exactamente el defecto que se corrigio.
    const carrera = page.locator('#carrera_id');
    await expect(carrera).not.toHaveValue('');

    // Y EL CONTROL QUE HACE VALIDA LA ASERCION DE ABAJO: la casilla llega
    // SIN marcar. Si llegara marcada, "marcarla y guardar" no probaria que la
    // puerta dependa de ella.
    const confirmo = page.locator('#confirmo_facultad');
    await expect(confirmo).not.toBeChecked();

    // La casilla de profesor NO se toca. Que siga sin marcar despues de
    // guardar es lo que prueba que no se marca sola -- el comentario de la
    // puerta advierte que con es_profesor dentro de la condicion todo alumno
    // se habria quedado fuera --.
    await expect(page.locator('#es_profesor')).not.toBeChecked();

    await confirmo.check();
    await page.getByRole('button', { name: 'Guardar' }).click();

    // TERCER EFECTO: vuelve al destino EXACTO del que salio, no a /catalogo.
    await expect(page).toHaveURL(destinoEsperado);
  });
});
