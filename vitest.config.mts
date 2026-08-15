// EL NOMBRE ES `.mts` Y NO `.ts` A PROPOSITO (2026-08-15). `package.json` no
// declara `"type": "module"`, asi que un `.ts` con sintaxis ESM lo carga Vite
// como CommonJS y avisa en cada `npm test` de que el cargador nativo -el que
// sera por defecto en una version mayor futura de Vite- no lo va a soportar.
// La extension `.mts` lo declara como modulo sin tocar `package.json`, que
// arrastraria tambien a next.config.ts y a los demas archivos de raiz.
//
// `tsconfig.json` ya incluye `**/*.mts`, comprobado antes de renombrar, asi
// que el archivo no se sale del `typecheck`. Y el control de que Vitest lo
// sigue leyendo es el `exclude` de abajo: si dejara de leerse, los .spec.ts de
// e2e/ volverian a entrar y el recuento de pruebas cambiaria.
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
