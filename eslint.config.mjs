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
    // Pasta local do QA com agentes (06/10/2026), fora do git: sem isto, o lint
    // da máquina de quem a tem falha por arquivo que o CI nem vê.
    ".qa-agentes/**",
  ]),
]);

export default eslintConfig;
