# Project Mosaic Testing Strategy

This document outlines the comprehensive testing strategy for Project Mosaic, including unit tests, integration tests, and end-to-end tests.

## Testing Levels

### Unit Tests

Unit tests focus on testing individual components in isolation, mocking all dependencies.

- **Location**: `tests/unit/`
- **Configuration**: `jest.config.unit.js`
- **Run Command**: `npm run test:unit`
- **Coverage Command**: `npm run test:unit:coverage`
- **Coverage Target**: 80% (branches, functions, lines, statements)

### Integration Tests

Integration tests verify that different components work together correctly, testing the interaction between services, APIs, and the database.

- **Location**: `tests/integration/`
- **Configuration**: `jest.config.integration.js`
- **Run Command**: `npm run test:integration`
- **Coverage Command**: `npm run test:integration:coverage`
- **Coverage Target**: 70% (branches, functions, lines, statements)

### End-to-End Tests

End-to-end tests simulate real user interactions with the application through a browser using Puppeteer.

- **Location**: `tests/e2e/`
- **Configuration**: `jest.config.e2e.js`
- **Run Command**: `npm run test:e2e`
- **Note**: E2E tests don't generate coverage reports as they test the entire system.

## Test Utilities

### Mock Data Generator

The mock data generator (`tests/utils/mock-data-generator.ts`) provides functions to generate mock data for testing purposes. It includes generators for all major data models in the system.

```typescript
// Example: Generate a mock user
const mockUser = generateMockUser();

// Example: Generate a mock user with specific properties
const customUser = generateMockUser({
  status: UserStatus.ACTIVE,
  email: 'custom@example.com',
});
```

### Test Utilities

The test utilities (`tests/utils/test-utils.ts`) provide common functions for testing, such as creating mock Express requests and responses, generating JWT tokens, and creating mock services.

```typescript
// Example: Create a mock Express request
const req = createMockRequest({ body: { username: 'testuser' } });

// Example: Create a mock Express response
const res = createMockResponse();

// Example: Generate a JWT token for testing
const token = generateTestToken(userId, ['admin']);
```

## Continuous Integration

The CI/CD pipeline runs unit and integration tests automatically on every pull request and push to the main and develop branches. The pipeline includes:

1. Linting
2. Unit tests with coverage
3. Integration tests with coverage
4. Coverage report upload to Codecov

## Running Tests Locally

### Running All Tests

```bash
npm run test:all
```

### Running Unit Tests

```bash
npm run test:unit
```

### Running Integration Tests

```bash
npm run test:integration
```

### Running End-to-End Tests

```bash
npm run test:e2e
```

### Running Tests with Coverage

```bash
npm run test:coverage
```

## Test Structure

### Unit Test Structure

Unit tests follow the Arrange-Act-Assert pattern:

```typescript
describe('ComponentName', () => {
  describe('methodName', () => {
    it('should do something specific', () => {
      // Arrange
      const input = ...;

      // Act
      const result = component.method(input);

      // Assert
      expect(result).toEqual(expectedOutput);
    });
  });
});
```

### Integration Test Structure

Integration tests focus on API endpoints and service interactions:

```typescript
describe('API Endpoint', () => {
  it('should return the expected response', async () => {
    // Arrange
    const requestData = ...;

    // Act
    const response = await request(app)
      .post('/api/endpoint')
      .send(requestData);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expectedResponse);
  });
});
```

### End-to-End Test Structure

E2E tests simulate user interactions:

```typescript
describe('User Flow', () => {
  it('should complete a specific user journey', async () => {
    // Navigate to page
    await page.goto('http://localhost:3000/path');

    // Interact with the page
    await page.click('#button-id');
    await page.type('#input-id', 'text to type');

    // Assert the expected outcome
    const element = await page.$('#result-id');
    const text = await page.evaluate(el => el.textContent, element);
    expect(text).toContain('Expected result');
  });
});
```

## Best Practices

1. **Test Isolation**: Each test should be independent and not rely on the state from other tests.
2. **Mock External Dependencies**: Use mocks for external services, APIs, and databases in unit tests.
3. **Descriptive Test Names**: Use descriptive names that explain what the test is verifying.
4. **Test Edge Cases**: Include tests for edge cases and error conditions.
5. **Keep Tests Fast**: Unit and integration tests should run quickly to provide fast feedback.
6. **Maintain Test Coverage**: Aim to maintain the coverage targets for each type of test.
7. **Test Real User Flows**: E2E tests should simulate real user interactions and common user journeys.
