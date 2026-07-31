import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config([
  // Never lint build output, deps, or generated type snapshots.
  {
    ignores: ["dist", "node_modules", "src/lib/api/openapi-types.d.ts"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // Hard cap on file size. A file over 1000 lines is a refactor signal —
      // break it into focused components/hooks/modules (see the course-quiz
      // split into _components/Quiz* + lib/quiz/*). Blank lines and comments
      // don't count toward the limit, only real code.
      "max-lines": [
        "error",
        { max: 1000, skipBlankLines: true, skipComments: true },
      ],

      "no-unused-expressions": "off",
      "@typescript-eslint/no-unused-expressions": "error",
      "no-empty-pattern": "off",

      // Genuinely unused bindings are errors, but a leading underscore is the
      // conventional "intentionally discarded" marker (e.g. renaming a
      // destructured field to _foo to drop it) — honour it.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      "@typescript-eslint/no-empty-interface": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",

      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-refresh/only-export-components": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/rules-of-hooks": "off",
      // react-hooks v7 recommended also ships these stricter rules, not in the
      // original rule list. Kept off for consistency with the rest of the
      // react-hooks family above (the project opts out of hook strictness).
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
    },
  },
  // Tests and config files can grow long without being a design smell.
  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
      "**/*.config.{js,ts}",
    ],
    rules: {
      "max-lines": "off",
    },
  },
]);
