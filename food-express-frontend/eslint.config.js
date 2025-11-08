import js from "@eslint/js";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";

export default [
  js.configs.recommended,
  reactPlugin.configs.flat.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off", // not needed for React 17+
      "react/prop-types": "off",
      "no-unused-vars": "warn",
      "quotes": ["error", "single"],
      "semi": ["error", "always"],
      "indent": ["error", 2],
    },
  },
];
