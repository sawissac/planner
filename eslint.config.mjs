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
    // compacto-ui copies — kept byte-identical to the registry (see .prettierignore).
    "src/lib/cn.ts",
    "src/lib/ui-styles.ts",
    "src/lib/color-themes.ts",
    "src/components/ui/button.tsx",
    "src/components/ui/button-group.tsx",
    "src/components/ui/calendar.tsx",
    "src/components/ui/command.tsx",
    "src/components/ui/dialog.tsx",
    "src/components/ui/dropdown-menu.tsx",
    "src/components/ui/input.tsx",
    "src/components/ui/option-grid.tsx",
    "src/components/ui/popover.tsx",
    "src/components/ui/progress.tsx",
    "src/components/ui/select.tsx",
    "src/components/ui/separator.tsx",
    "src/components/ui/sidebar.tsx",
    "src/components/ui/tabs.tsx",
    "src/components/ui/tooltip.tsx",
  ]),
]);

export default eslintConfig;
