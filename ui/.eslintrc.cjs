/* eslint-env node */
require('@rushstack/eslint-patch/modern-module-resolution');

module.exports = {
  root: true,
  extends: [
    'plugin:vue/vue3-recommended',
    'eslint:recommended',
    '@vue/eslint-config-typescript/recommended',
    '@vue/eslint-config-prettier',
    '@unocss',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  env: {
    'vue/setup-compiler-macros': true,
  },
  rules: {
    '@unocss/enforce-class-compile': 1,
  },
};
