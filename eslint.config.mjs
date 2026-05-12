import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "apps/backend/data/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/frontend/src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        document: "readonly",
        fetch: "readonly",
        HTMLElement: "readonly",
        importMeta: "readonly",
        window: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn"
    }
  },
  {
    files: ["apps/backend/src/**/*.ts"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly"
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
);
