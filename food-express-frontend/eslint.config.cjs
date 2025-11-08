const js = require("@eslint/js");
const globals = require("globals");
const reactPlugin = require("eslint-plugin-react");

module.exports = [
  js.configs.recommended,
  reactPlugin.configs.flat.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2021 },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "no-unused-vars": "warn",
      quotes: ["error", "single"],
      semi: ["error", "always"],
      indent: ["error", 2],
    },
  },
];
