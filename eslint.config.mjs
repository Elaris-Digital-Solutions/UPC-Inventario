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
  ]),
]);

export default eslintConfig;
