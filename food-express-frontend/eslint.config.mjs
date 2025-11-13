import js from "@eslint/js";
import react from "eslint-plugin-react";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "coverage/**",
      "public/firebase-messaging-sw.js"
    ],
  },
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      parser: await import("@babel/eslint-parser"),
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ["@babel/preset-react"],
        },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        Notification: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
        setTimeout: "readonly",
        process: "readonly",
        importScripts: "readonly",
        clients: "readonly",
        firebase: "readonly",
        console: "readonly",
        alert: "readonly",
        atob: "readonly",
        require: "readonly"
      },
    },
    plugins: { react },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      quotes: ["error", "single"],
      semi: ["error", "always"],
      indent: ["error", 2],
      "no-unused-vars": ["off", {"argsIgnorePattern": "^_","varsIgnorePattern": "^_","caughtErrors": "none"}],
      "no-empty": ["warn"],
      "react/prop-types": "off" // Disable prop-types warnings for simplicity
    },
  },
  {
    files: ["**/*.test.js", "**/*.test.jsx", "src/setupTests.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        test: "readonly",
        it: "readonly",
        expect: "readonly",
        jest: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        afterAll: "readonly",
        global: "readonly"
      }
    }
  },
  {
    files: ["public/firebase-messaging-sw.js"],
    languageOptions: {
      globals: {
        importScripts: "readonly",
        clients: "readonly",
        firebase: "readonly"
      }
    }
  }
];
