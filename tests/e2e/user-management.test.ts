/**
 * End-to-End Tests for User Management
 *
 * These tests simulate a real user interacting with the application
 * through a browser using Puppeteer.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { generateMockUser } from '../utils/mock-data-generator';
import { generateTestToken } from '../utils/test-utils';
import { UserStatus } from '../../src/types';

// Mock server for testing
import { app } from '../../src/api/routes';
import http from 'http';

describe('User Management E2E Tests', () => {
  let server: http.Server;
  let browser: Browser;
  let page: Page;
  let adminToken: string;

  // Start server and browser before tests
  beforeAll(async () => {
    // Start server
    server = http.createServer(app);
    await new Promise<void>(resolve => {
      server.listen(3000, () => {
        // Use a logger instead of console.log
        // console.log('Test server running on port 3000');
        resolve();
      });
    });

    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // Generate admin token for API calls
    adminToken = generateTestToken(generateMockUser().id, ['admin']);
  });

  // Close server and browser after tests
  afterAll(async () => {
    await browser.close();
    await new Promise<void>(resolve => {
      server.close(() => {
        // Use a logger instead of console.log
        // console.log('Test server closed');
        resolve();
      });
    });
  });

  // Create a new page before each test
  beforeEach(async () => {
    page = await browser.newPage();

    // Set viewport size
    await page.setViewport({ width: 1280, height: 800 });

    // Set token in localStorage for authentication
    await page.evaluateOnNewDocument(token => {
      localStorage.setItem('auth_token', token);
    }, adminToken);

    // Mock API responses
    await page.setRequestInterception(true);
    page.on('request', async request => {
      const url = request.url();

      // Mock user list response
      if (
        url.includes('/api/users') &&
        request.method() === 'GET' &&
        !url.includes('/api/users/')
      ) {
        const mockUsers = [
          generateMockUser({ status: UserStatus.ACTIVE }),
          generateMockUser({ status: UserStatus.ACTIVE }),
          generateMockUser({ status: UserStatus.SUSPENDED }),
        ];

        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockUsers),
        });
        return;
      }

      // Mock user creation response
      if (url.includes('/api/users') && request.method() === 'POST') {
        const requestBody = JSON.parse(request.postData() || '{}');
        const mockUser = generateMockUser({
          username: requestBody.username,
          email: requestBody.email,
          displayName: requestBody.displayName,
        });

        await request.respond({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(mockUser),
        });
        return;
      }

      // Mock user update response
      if (url.match(/\/api\/users\/[^/]+$/) && request.method() === 'PUT') {
        const userId = url.split('/').pop();
        const requestBody = JSON.parse(request.postData() || '{}');
        const mockUser = generateMockUser({
          id: userId,
          ...requestBody,
        });

        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockUser),
        });
        return;
      }

      // Mock user deletion response
      if (url.match(/\/api\/users\/[^/]+$/) && request.method() === 'DELETE') {
        await request.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
        return;
      }

      // Continue with the request for any other URLs
      request.continue();
    });
  });

  // Close page after each test
  afterEach(async () => {
    await page.close();
  });

  it('should display user list page', async () => {
    // Navigate to user list page
    await page.goto('http://localhost:3000/admin/users');

    // Wait for user list to load
    await page.waitForSelector('.user-list-table');

    // Check if user list is displayed
    const userListTitle = await page.$eval('h1', el => el.textContent);
    expect(userListTitle).toContain('User Management');

    // Check if users are displayed in the table
    const userCount = await page.$$eval('.user-list-table tbody tr', rows => rows.length);
    expect(userCount).toBeGreaterThan(0);
  });

  it('should create a new user', async () => {
    // Navigate to user creation page
    await page.goto('http://localhost:3000/admin/users/new');

    // Fill user form
    await page.type('#username', 'newuser');
    await page.type('#email', 'newuser@example.com');
    await page.type('#password', 'password123');
    await page.type('#displayName', 'New Test User');

    // Submit form
    await Promise.all([page.waitForNavigation(), page.click('#submit-button')]);

    // Check if redirected to user list
    const currentUrl = page.url();
    expect(currentUrl).toContain('/admin/users');

    // Check for success message
    const successMessage = await page.$eval('.alert-success', el => el.textContent);
    expect(successMessage).toContain('User created successfully');
  });

  it('should edit an existing user', async () => {
    // Navigate to user list page
    await page.goto('http://localhost:3000/admin/users');

    // Click on edit button for first user
    await Promise.all([
      page.waitForNavigation(),
      page.click('.user-list-table tbody tr:first-child .edit-button'),
    ]);

    // Check if on edit page
    const pageTitle = await page.$eval('h1', el => el.textContent);
    expect(pageTitle).toContain('Edit User');

    // Update user information
    await page.evaluate(() => {
      (document.querySelector('#displayName') as HTMLInputElement).value = '';
    });
    await page.type('#displayName', 'Updated User Name');

    // Submit form
    await Promise.all([page.waitForNavigation(), page.click('#submit-button')]);

    // Check if redirected to user list
    const currentUrl = page.url();
    expect(currentUrl).toContain('/admin/users');

    // Check for success message
    const successMessage = await page.$eval('.alert-success', el => el.textContent);
    expect(successMessage).toContain('User updated successfully');
  });

  it('should delete a user', async () => {
    // Navigate to user list page
    await page.goto('http://localhost:3000/admin/users');

    // Get initial user count
    const initialUserCount = await page.$$eval('.user-list-table tbody tr', rows => rows.length);

    // Click on delete button for first user
    await page.click('.user-list-table tbody tr:first-child .delete-button');

    // Confirm deletion in modal
    await Promise.all([
      page.waitForResponse(
        response =>
          response.url().includes('/api/users/') && response.request().method() === 'DELETE'
      ),
      page.click('.confirm-delete-button'),
    ]);

    // Check if user is removed from the list
    await page.waitForFunction(
      initialCount => {
        const currentCount = document.querySelectorAll('.user-list-table tbody tr').length;
        return currentCount === initialCount - 1;
      },
      {},
      initialUserCount
    );

    // Check for success message
    const successMessage = await page.$eval('.alert-success', el => el.textContent);
    expect(successMessage).toContain('User deleted successfully');
  });

  it('should filter users by status', async () => {
    // Navigate to user list page
    await page.goto('http://localhost:3000/admin/users');

    // Get initial user count
    const initialUserCount = await page.$$eval('.user-list-table tbody tr', rows => rows.length);

    // Select 'Suspended' from status filter
    await page.select('#status-filter', 'suspended');

    // Wait for filtered results
    await page.waitForResponse(
      response =>
        response.url().includes('/api/users') && response.url().includes('status=suspended')
    );

    // Check if filtered user count is less than initial count
    const filteredUserCount = await page.$$eval('.user-list-table tbody tr', rows => rows.length);
    expect(filteredUserCount).toBeLessThan(initialUserCount);

    // Check if all displayed users have 'Suspended' status
    const statusCells = await page.$$eval('.user-list-table tbody tr .status-cell', cells =>
      cells.map(cell => cell.textContent)
    );

    statusCells.forEach(status => {
      expect(status).toContain('Suspended');
    });
  });
});
