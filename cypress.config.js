const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'tests/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'tests/e2e/support/e2e.js',
    fixturesFolder: 'tests/e2e/fixtures',
    screenshotsFolder: 'tests/e2e/screenshots',
    videosFolder: 'tests/e2e/videos',
    downloadsFolder: 'tests/e2e/downloads',
    viewportWidth: 1280,
    viewportHeight: 720,
    defaultCommandTimeout: 10000,
    requestTimeout: 15000,
    responseTimeout: 15000,
    video: true,
    videoCompression: 32,
    screenshotOnRunFailure: true,
    watchForFileChanges: false,
    retries: {
      runMode: 2,
      openMode: 0
    },
    env: {
      API_URL: 'http://localhost:5000/api',
      TEST_USER: 'test@example.com',
      TEST_PASSWORD: 'password123'
    }
  },
  component: {
    specPattern: 'tests/e2e/components/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'tests/e2e/support/component.js',
    indexHtmlFile: 'tests/e2e/support/component-index.html'
  }
});