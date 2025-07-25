module.exports = {
  extends: ['eslint:recommended', 'plugin:security/recommended'],
  plugins: ['security', '@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    // Add any specific security rule overrides here
    // Disable unsafe regex warnings for patterns that are safely handled
    'security/detect-unsafe-regex': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    '*.min.js',
    'tests/',
    'coverage/',
    '.eslintrc.js',
    '.eslintrc.*.js',
  ],
};
