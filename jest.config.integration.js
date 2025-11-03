/**
 * Jest configuration for integration tests
 */

const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  testRegex: null, // Remove testRegex from base config
  testMatch: ['<rootDir>/tests/integration/**/*.test.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: [
    'src/api/**/*.{ts,tsx}',
    'src/services/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    // Exclude files that don't need integration test coverage
    '!src/api/gateway/**/*', // Gateway is infrastructure, tested separately
    '!src/services/init.ts', // Initialization file, not business logic
    '!src/core/**/*', // Core models/interfaces don't need integration tests
    '!src/types/**/*', // Type definitions don't need integration tests
    '!src/utils/**/*', // Utils are covered by unit tests
    '!src/persistence/migrations/**/*', // Migration scripts don't need integration tests
    '!src/persistence/scripts/**/*', // Setup scripts don't need integration tests
    '!src/client/**/*', // Client-side code tested separately
    '!src/integrations/**/*', // External integrations tested separately
    '!src/framework/**/*', // Framework code tested separately
  ],
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 15,
      lines: 20,
      statements: 20,
    },
  },
  // Longer timeout for integration tests
  testTimeout: 10000,
};
