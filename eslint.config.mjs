import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefak build Capacitor. Bukan kode kita dan tidak dilacak git
    // (android/app/build/** ada di .gitignore), tapi `eslint .` tetap
    // memeriksanya dan satu file di dalamnya melaporkan error untuk aturan
    // TypeScript yang tidak dipasang project ini -- sehingga `npm run lint`
    // selalu berakhir gagal karena sesuatu yang tidak bisa kita perbaiki.
    "android/**",
  ]),
]);

export default eslintConfig;
