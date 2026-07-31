import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

// Type-aware linting needs the TypeScript program, which makes a full run take
// ~50s vs a couple seconds untyped. `ESLINT_FAST=1 npm run lint` (or
// `npm run lint:fast`) skips the type-checked block for quick local feedback;
// CI and the default `npm run lint` keep it on so the promise rules actually run.
const FAST = process.env.ESLINT_FAST === "1";

const typeCheckedBlock = FAST
  ? []
  : [
      {
        files: ["src/**/*.{ts,tsx}"],
        extends: [...tseslint.configs.recommendedTypeChecked],
        languageOptions: {
          parserOptions: {
            projectService: true,
            tsconfigRootDir: import.meta.dirname,
          },
        },
        rules: {
          "@typescript-eslint/no-floating-promises": "warn",
          "@typescript-eslint/no-misused-promises": "warn",
          "@typescript-eslint/no-explicit-any": "warn",
          // The any-family: real signal but overwhelming on a codebase that
          // leans on generated API types. Off for now; revisit once promises
          // are clean.
          "@typescript-eslint/no-unsafe-assignment": "off",
          "@typescript-eslint/no-unsafe-member-access": "off",
          "@typescript-eslint/no-unsafe-call": "off",
          "@typescript-eslint/no-unsafe-argument": "off",
          "@typescript-eslint/no-unsafe-return": "off",
          "@typescript-eslint/no-unnecessary-type-assertion": "warn",
          "@typescript-eslint/no-redundant-type-constituents": "warn",
          "@typescript-eslint/restrict-template-expressions": "off",
          // Other recommendedTypeChecked rules that fire on pre-existing code.
          // Downgraded to warn for the same reason as the promise rules: real
          // signal, but landing them as build-breaking errors on code the team
          // hasn't triaged just trains people to ignore lint. Promote to error
          // per-rule as each is driven to zero.
          "@typescript-eslint/require-await": "warn",
          "@typescript-eslint/no-base-to-string": "warn",
          "@typescript-eslint/unbound-method": "warn",
          "@typescript-eslint/only-throw-error": "warn",
        },
      },
    ];

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
      // Contributes rules-of-hooks (error, below) plus exhaustive-deps and the
      // v7 compiler rules. We keep rules-of-hooks on and opt out of the noisier
      // ones individually — so this extends is doing real work, not decoration.
      reactHooks.configs.flat.recommended,
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      // --- File / function size --------------------------------------------
      // max-lines is the BLUNT backstop: a file over 1000 lines is worth a
      // second look, but line count is a weak proxy for complexity. The two
      // rules below are the SHARP signal — a 200-line function with a dozen
      // branches is the actual "break this up" trigger. They're `warn` because
      // the codebase predates them (120+ functions over 150 lines today);
      // errors here would just be noise. Fix them opportunistically.
      "max-lines": [
        "error",
        { max: 1000, skipBlankLines: true, skipComments: true },
      ],
      "max-lines-per-function": [
        "warn",
        { max: 150, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      complexity: ["warn", 15],

      // --- Correctness (not style) -----------------------------------------
      // rules-of-hooks has no false positives by construction: a hook called
      // conditionally or in a loop corrupts React's hook ordering, landing
      // state on the wrong variable or crashing on a branch-changing rerender.
      // There is no code where turning this off is correct. Currently 0
      // violations — it costs nothing today and guards against a real class of
      // bug tomorrow.
      "react-hooks/rules-of-hooks": "error",
      // Catches `const {} = useThing()` (always a mistake). The narrow valid
      // case — `function Foo({}: Props)` — is exempted via the option.
      "no-empty-pattern": ["error", { allowObjectPatternsAsParameters: true }],

      "no-unused-expressions": "off",
      "@typescript-eslint/no-unused-expressions": "error",

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

      // --- react-hooks opt-outs (taste / aggressive-on-legacy) -------------
      // These are genuinely noisy or aggressive on code that predates the v7
      // compiler rules. Correctness (rules-of-hooks) does NOT need to agree
      // with taste (exhaustive-deps) — they're kept separate on purpose.
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/refs": "off",
      "react-hooks/purity": "off",
      "react-hooks/static-components": "off",
    },
  },

  // --- Type-aware linting (src only) --------------------------------------
  // This is where most real bug-catching lives for an API-heavy app.
  // no-floating-promises / no-misused-promises alone find far more actual
  // defects than any size rule. Scoped to src/** because it needs the
  // TypeScript program (slower) and tests/e2e have their own looser shape.
  // Skipped when ESLINT_FAST=1 (see top of file).
  ...typeCheckedBlock,

  // Tests and config files: no size caps, and NOT type-checked (they don't
  // live in the app tsconfig program).
  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/__tests__/**/*.{ts,tsx}",
      "**/*.config.{js,ts}",
    ],
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      complexity: "off",
    },
  },
]);
