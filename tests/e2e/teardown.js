/**
 * Global teardown for end-to-end tests
 *
 * This file is executed once after all test files have been executed.
 */

const { teardown: teardownDevServer } = require('./helpers/setup-dev-server');

module.exports = async function globalTeardown() {
  console.log('Tearing down E2E test environment...');

  // Stop development server if it was started
  if (process.env.START_SERVER === 'true') {
    console.log('Stopping development server...');
    await teardownDevServer();
    console.log('Development server stopped');
  }

  // Clean up any test artifacts
  console.log('Cleaning up test artifacts...');

  console.log('E2E test environment teardown complete');
};
