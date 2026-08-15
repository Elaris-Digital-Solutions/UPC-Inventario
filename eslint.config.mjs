import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Anadidos del proyecto. El script es `eslint .`, asi que sin esto el lint
    // recorre cosas que no son codigo de la aplicacion y reporta errores que
    // nadie puede arreglar. Importa porque desde la tanda 0 el lint BLOQUEA el
    // CI: un ignore que falte no es ruido, es un PR que no entra.
    "supabase/**", // estado local de la CLI en supabase/.temp
    ".remember/**", // scratch de un plugin, ajeno al repositorio
    // Artefactos de una corrida de Playwright, que entro en la T4. El reporte
    // HTML lleva JavaScript minificado dentro, asi que `eslint .` lo recorre y
    // reporta miles de problemas que nadie puede arreglar. `.gitignore` ya los
    // cubre desde la Task 3, pero ESLint NO lee `.gitignore`: son dos listas
    // distintas y hay que mantener las dos. Medido el 2026-08-15, correr el
    // E2E y despues el lint da miles de problemas, todos de playwright-report/.
    // Hoy el CI no se rompe por esto porque ci.yml no corre el E2E y e2e.yml no
    // corre el lint, pero esa separacion es como quedaron repartidos los
    // workflows y no una proteccion deliberada.
    "test-results/**", // capturas y trazas de los fallos
    "playwright-report/**", // reporte HTML, con JS minificado dentro
  ]),
]);

export default eslintConfig;
