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
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  // Longer timeout for integration tests
  testTimeout: 10000,
};
