describe('PERN Setup Tool - Basic Setup', () => {
  beforeEach(() => {
    // Reset application state before each test
    cy.resetDatabase();
    cy.checkAPIHealth();
  });

  it('should load the main interface', () => {
    cy.visit('/');
    cy.contains('PERN Setup Tool').should('be.visible');
    cy.contains('Select a command').should('be.visible');
  });

  it('should display all main menu options', () => {
    cy.visit('/');

    // Check that all menu options are present
    cy.contains('1. PostgreSQL').should('be.visible');
    cy.contains('2. Redis').should('be.visible');
    cy.contains('3. Docker').should('be.visible');
    cy.contains('4. Folder Structure').should('be.visible');
    cy.contains('5. PM2').should('be.visible');
    cy.contains('6. Nginx').should('be.visible');
    cy.contains('7. Tests').should('be.visible');
    cy.contains('8. Configuration').should('be.visible');
    cy.contains('9. Advanced Features').should('be.visible');
    cy.contains('10. End').should('be.visible');
  });

  it('should navigate to PostgreSQL section', () => {
    cy.visit('/');
    cy.runSetupCommand('postgresql');

    // Should navigate to PostgreSQL interface
    cy.contains('PostgreSQL Section').should('be.visible');
    cy.contains('1. Download PostgreSQL').should('be.visible');
    cy.contains('2. Setup PostgreSQL').should('be.visible');
  });

  it('should handle Windows compatibility warnings', () => {
    // Mock Windows environment
    cy.window().then((win) => {
      Object.defineProperty(win.navigator, 'platform', {
        value: 'Win32'
      });
    });

    cy.visit('/');

    // Redis option should show compatibility warning
    cy.contains('Redis (Linux/macOS only)').should('be.visible');
  });

  it('should complete basic PERN setup workflow', () => {
    cy.visit('/');

    // Simulate complete setup workflow
    cy.runSetupCommand('postgresql');
    cy.runSetupCommand('docker');
    cy.runSetupCommand('folder-structure');
    cy.runSetupCommand('configuration');

    // Should show completion summary
    cy.verifySetupComplete();
  });

  it('should handle setup errors gracefully', () => {
    cy.visit('/');

    // Simulate a setup error
    cy.runSetupCommand('invalid-command');

    // Should show error message and recovery options
    cy.contains('error').should('be.visible');
    cy.contains('retry').should('be.visible');
    cy.contains('skip').should('be.visible');
  });

  it('should validate system requirements', () => {
    cy.checkSystemRequirements();

    // Should pass system checks
    cy.contains('System requirements met').should('be.visible');
  });

  it('should generate proper setup summary', () => {
    cy.visit('/');

    // Complete setup process
    cy.runSetupCommand('complete-setup');

    // Check summary contains all expected information
    cy.get('[data-cy="setup-summary"]').within(() => {
      cy.contains('Components installed').should('be.visible');
      cy.contains('Configurations created').should('be.visible');
      cy.contains('Services running').should('be.visible');
    });
  });

  it('should export configuration successfully', () => {
    cy.visit('/');

    // Complete setup and export
    cy.runSetupCommand('complete-setup');
    cy.contains('Export configuration').click();

    // Should download configuration file
    cy.readFile('pern-setup-config.json').should('exist');
  });

  it('should start all services after setup', () => {
    cy.visit('/');

    // Complete setup and start services
    cy.runSetupCommand('complete-setup');
    cy.contains('Start all services').click();

    // Should show services starting
    cy.contains('Starting services').should('be.visible');

    // Should eventually show all services running
    cy.contains('All services started').should('be.visible');
  });
});