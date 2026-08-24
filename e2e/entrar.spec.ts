import { expect, test } from '@playwright/test';

import { iniciarSesionComo } from './apoyo/sesion';

const ALUMNA_CON_PERFIL_COMPLETO = 'alumno.a@upc.edu.pe';

test.describe('entrar por magic link', () => {
  test('alumno.a@upc.edu.pe entra y cae en /catalogo', async ({ page }) => {
    await iniciarSesionComo(page, ALUMNA_CON_PERFIL_COMPLETO);

    // lib/auth/destino.ts: alumno con perfil completo (nombre, apellido y
    // carrera_id) va a /catalogo.
    await expect(page).toHaveURL('/catalogo');
  });

  // El contraejemplo. Sin esta prueba, la de arriba no distingue "la sesion
  // funciona" de "no hay ninguna proteccion en ningun lado" -las dos
  // dejarian a la alumna en /catalogo igual-. Cada test de Playwright corre
  // en su propio contexto de navegador por defecto, asi que esta prueba NO
  // hereda cookies ni sesion de la anterior: entra sin haber llamado a
  // iniciarSesionComo.
  test('sin sesion, una ruta privada rebota a /login', async ({ page }) => {
    await page.goto('/mi-panel');

    // proxy.ts: RUTAS_PUBLICAS es exactamente ['/', '/login', '/auth',
    // '/faq']. '/mi-panel' no esta en la lista, asi que sin claims rebota.
    await expect(page).toHaveURL('/login');
  });
});
