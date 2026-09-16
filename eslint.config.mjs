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
    ".vercel/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Os payloads de integrações legadas são deliberadamente dinâmicos.
      "@typescript-eslint/no-explicit-any": "off",
      // Muitos componentes sincronizam estado local com dados externos no carregamento.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
