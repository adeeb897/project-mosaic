/**
 * Jest configuration for end-to-end tests
 */

const baseConfig = require('./jest.config');

module.exports = {
  ...baseConfig,
  testRegex: null, // Remove testRegex from base config
  testMatch: ['<rootDir>/tests/e2e/**/*.test.ts'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // E2E tests don't need coverage reporting
  collectCoverage: false,
  // Longer timeout for E2E tests
  testTimeout: 30000,
  // Retry failed tests
  retry: 2,
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/e2e/setup.js',
  globalTeardown: '<rootDir>/tests/e2e/teardown.js',
};
