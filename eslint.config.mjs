import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    plugins: {
      "unused-imports": unusedImports,
      "simple-import-sort": simpleImportSort,
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      // Unused imports and variables
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",

      // Import sorting and organization
      "simple-import-sort/imports": "warn",
      "simple-import-sort/exports": "warn",
      "import/no-duplicates": "warn",
      "import/newline-after-import": ["warn", { count: 1 }],
      "import/no-unresolved": "warn",

      // TypeScript specific (non type-aware)
      "@typescript-eslint/no-var-requires": "warn",
      "react-hooks/set-state-in-effect": "warn",

      // General code quality
      "prefer-const": "warn",
      "no-var": "warn",
      "no-console": "warn",
      eqeqeq: ["warn", "always"],
      curly: ["warn", "all"],

      // React specific
      "react/jsx-key": "warn",
      "react/jsx-no-duplicate-props": "warn",
      "react/jsx-no-undef": "warn",
      "react/self-closing-comp": "warn",
      "react/no-unescaped-entities": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/incompatible-library": "off",
      "react-hooks/rules-of-hooks": "off",
      "react-hooks/refs": "off",
      "react-hooks/exhaustive-deps": "off",
      // Next.js specific
      "@next/next/no-img-element": "warn",

      // console
      "no-console": "off",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Type-aware TypeScript rules
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "coverage/**",
    "node_modules/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
