module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test patterns
  testMatch: ['**/tests/**/*.test.js', '**/tests/**/*.test.ts'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    'scripts/ai-review/**/*.js',
    '!src/**/*.d.ts',
    '!scripts/ai-review/test-*.js',
    '!**/node_modules/**',
  ],

  // Transform configuration
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.js$': 'babel-jest',
  },

  // Module file extensions
  moduleFileExtensions: ['js', 'ts', 'json'],

  // Clear mocks between tests
  clearMocks: true,

  // Test timeout
  testTimeout: 10000,

  // Verbose output
  verbose: true,
};
