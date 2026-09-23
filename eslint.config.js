import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

/**
 * La règle structurante de ce dépôt est la direction des dépendances :
 *
 *     domain/  ←  infra/  ←  app/
 *
 * `domain/` est du métier pur : il doit rester testable sans navigateur, sans
 * React et sans stockage. Si un import remonte la chaîne, la couche métier
 * devient impossible à tester isolément et la comptabilité se retrouve liée au
 * rendu. Les deux blocs `no-restricted-imports` ci-dessous rendent cette
 * erreur impossible à commettre en silence.
 */
export default tseslint.config(
  { ignores: ["dist", "node_modules", "src/app/components/ui/**"] },

  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Un catch muet fait disparaître une corruption de données sans trace.
      "no-empty": ["error", { allowEmptyCatch: false }],
      eqeqeq: ["error", "always"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react-*", "@/app/*", "@/infra/*", "../app/*", "../infra/*", "../../app/*", "../../infra/*"],
              message:
                "domain/ est du métier pur : il n'importe que domain/ et zod. Déplace cet appel dans infra/ ou app/.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["src/infra/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/*", "../app/*", "../../app/*"],
              message: "infra/ ne connaît pas app/. L'orchestration appartient à la couche React.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
);
