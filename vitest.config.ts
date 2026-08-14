import { configDefaults, defineConfig } from 'vitest/config';

// Sin este archivo, Vitest corre con su patron por defecto -leido del propio
// paquete instalado-, que es ["**/*.{test,spec}.?(c|m)[jt]s?(x)"]. Ese patron
// se traga tambien los .spec.ts de e2e/, que son de Playwright, no de Vitest,
// y `npm test` intentaria ejecutarlos con el runner equivocado. Comprobado
// poniendo un .spec.ts de sonda dentro de e2e/ y corriendo `npm test`: Vitest
// lo recogio.
//
// Se EXTIENDE configDefaults.exclude en vez de reescribirlo: pisar la lista
// entera perderia node_modules y dist, que Vitest excluye por defecto.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
});
