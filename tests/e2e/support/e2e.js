// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Global test configuration
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // when an uncaught exception occurs in the application code
  return false;
});

Cypress.on('fail', (error, runnable) => {
  // Log additional information on test failure
  console.error('Test failed:', runnable.title);
  console.error('Error:', error.message);

  // Take screenshot on failure
  cy.screenshot(`failure-${runnable.title}`, { capture: 'fullPage' });

  throw error;
});

// Global before each test
beforeEach(() => {
  // Reset application state
  cy.window().then((win) => {
    // Clear local storage
    win.localStorage.clear();

    // Clear session storage
    win.sessionStorage.clear();
  });

  // Set consistent viewport
  cy.viewport(1280, 720);
});

// Global after each test
afterEach(() => {
  // Clean up any test data
  cy.window().then((win) => {
    // Additional cleanup if needed
  });
});