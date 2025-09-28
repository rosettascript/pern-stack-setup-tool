// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

// Custom command to login
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('[data-cy="email-input"]').type(email);
  cy.get('[data-cy="password-input"]').type(password);
  cy.get('[data-cy="login-button"]').click();
  cy.url().should('not.include', '/login');
});

// Custom command to create a user
Cypress.Commands.add('createUser', (userData) => {
  cy.request('POST', '/api/users', userData).then((response) => {
    expect(response.status).to.eq(201);
    return response.body;
  });
});

// Custom command to delete a user
Cypress.Commands.add('deleteUser', (userId) => {
  cy.request('DELETE', `/api/users/${userId}`).then((response) => {
    expect(response.status).to.eq(204);
  });
});

// Custom command to wait for API
Cypress.Commands.add('waitForAPI', (url, timeout = 10000) => {
  cy.request(url).then((response) => {
    expect(response.status).to.be.oneOf([200, 201, 204]);
  });
});

// Custom command to check API health
Cypress.Commands.add('checkAPIHealth', () => {
  cy.request('/api/health').then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body).to.have.property('status', 'healthy');
  });
});

// Custom command to reset database
Cypress.Commands.add('resetDatabase', () => {
  cy.request('POST', '/api/test/reset').then((response) => {
    expect(response.status).to.eq(200);
  });
});

// Custom command for setup tool interaction
Cypress.Commands.add('runSetupCommand', (command) => {
  // This would interact with the CLI interface
  // For now, just simulate the interaction
  cy.log(`Running setup command: ${command}`);
  return cy.wrap({ success: true, command });
});

// Custom command to verify setup completion
Cypress.Commands.add('verifySetupComplete', () => {
  cy.get('[data-cy="setup-summary"]').should('be.visible');
  cy.get('[data-cy="completion-status"]').should('contain', 'Complete');
});

// Custom command to check system requirements
Cypress.Commands.add('checkSystemRequirements', () => {
  cy.request('/api/system/check').then((response) => {
    expect(response.status).to.eq(200);
    expect(response.body.nodeVersion).to.match(/^v18/);
    expect(response.body.memory).to.be.greaterThan(4 * 1024 * 1024 * 1024); // 4GB
  });
});