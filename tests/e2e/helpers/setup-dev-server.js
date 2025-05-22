/**
 * Helper for setting up and tearing down the development server for E2E tests
 */

const { spawn } = require('child_process');
const waitOn = require('wait-on');

let serverProcess = null;

/**
 * Start the development server
 */
async function setup() {
  const port = process.env.TEST_SERVER_PORT || '3000';

  // Start the server
  serverProcess = spawn('npm', ['run', 'dev'], {
    env: {
      ...process.env,
      PORT: port,
    },
    stdio: 'inherit',
  });

  // Wait for the server to be ready
  await waitOn({
    resources: [`http://localhost:${port}/api/health`],
    timeout: 30000, // 30 seconds
    interval: 100, // check every 100ms
  });

  return serverProcess;
}

/**
 * Stop the development server
 */
async function teardown() {
  if (serverProcess) {
    // Kill the server process
    if (process.platform === 'win32') {
      // Windows requires a different approach to kill the process tree
      spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
    } else {
      // Unix-like systems can use process.kill
      process.kill(-serverProcess.pid);
    }

    // Set to null to indicate it's been stopped
    serverProcess = null;
  }
}

module.exports = {
  setup,
  teardown,
};
