/**
 * Global setup for end-to-end tests
 *
 * This file is executed once before all test files are executed.
 */

const { setup: setupDevServer } = require('./helpers/setup-dev-server');

module.exports = async function globalSetup() {
  console.log('Setting up E2E test environment...');

  // Set environment variables for testing
  process.env.NODE_ENV = 'test';
  process.env.TEST_SERVER_PORT = process.env.TEST_SERVER_PORT || '3000';

  // Start development server if needed
  // This is useful for running tests against a real server
  if (process.env.START_SERVER === 'true') {
    console.log('Starting development server...');
    await setupDevServer();
    console.log(`Development server started on port ${process.env.TEST_SERVER_PORT}`);
  }

  console.log('E2E test environment setup complete');
};
