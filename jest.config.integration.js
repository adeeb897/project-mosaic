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
  ],
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 5,
      lines: 10,
      statements: 10,
    },
  },
  // Longer timeout for integration tests
  testTimeout: 10000,
};
