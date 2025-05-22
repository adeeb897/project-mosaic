// This file contains setup code that will be run before each test
// Add global test setup here

// Example: Setting up global mocks
global.console = {
  ...console,
  // Uncomment to suppress specific console methods during tests
  // log: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Example: Setting up environment variables for testing
process.env.NODE_ENV = 'test';

// Add any other test setup code here
