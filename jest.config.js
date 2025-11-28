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
  // builds rather than unit tests (complex fs and build lifecycle mocking)
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 30,
      lines: 10,
      statements: 10,
    },
  },
}
