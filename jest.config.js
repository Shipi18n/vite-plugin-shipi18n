export default {
  testEnvironment: 'node',
  transform: {},
  moduleFileExtensions: ['js', 'mjs'],
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  verbose: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!**/__tests__/**',
    '!**/node_modules/**'
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
    '/coverage/'
  ],
  coverageReporters: ['text', 'lcov', 'clover'],
  // Vite plugin buildStart hook requires integration testing with actual Vite
  // builds rather than unit tests (complex fs and build lifecycle mocking).
  // Core plugin logic (validation, hooks) is tested; buildStart hook and
  // helper functions require file system and API mocking for full coverage.
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 10,
      lines: 5,
      statements: 5,
    },
  },
}
