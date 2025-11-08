import globals from "globals";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "quotes": ["error", "single"],
      "semi": ["error", "always"],
      "indent": ["error", 2],
      "no-console": "off", // allow console.log in backend
    },
  },
];
