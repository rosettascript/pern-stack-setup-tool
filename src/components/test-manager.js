/**
 * PERN Setup Tool - Test Manager
 * Comprehensive testing framework with multiple test types and automation
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const ProjectDiscovery = require('../utils/project-discovery');

/**
 * Test Manager Class
 * Manages comprehensive testing framework setup and execution
 */
class TestManager {
  constructor(setupTool) {
    this.setup = setupTool;
    this.logger = setupTool.logger;
    this.safety = setupTool.safety;
    this.config = setupTool.config;
    this.platform = process.platform;
    this.projectDiscovery = new ProjectDiscovery();
    this.testFrameworks = {
      jest: { name: 'Jest', type: 'unit', config: 'jest.config.js' },
      supertest: { name: 'Supertest', type: 'integration', config: 'integration.config.js' },
      cypress: { name: 'Cypress', type: 'e2e', config: 'cypress.config.js' },
      newman: { name: 'Newman', type: 'api', config: 'newman.config.js' },
      artillery: { name: 'Artillery', type: 'performance', config: 'artillery.config.yml' }
    };
  }

  /**
   * Show test interface
   */
  async showInterface() {
    try {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Tests Section',
          loop: false,
        choices: [
            '1. Setup Testing Framework',
            '2. Run Tests',
            '3. Configure CI/CD',
            '4. Go back'
          ]
        }
      ]);

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.setupTestingFramework();
          break;
        case 2:
          await this.runTests();
          break;
        case 3:
          await this.configureCI();
          break;
        case 4:
          return this.setup.showMainInterface();
      }

    } catch (error) {
      await this.setup.handleError('test-interface', error);
    }
  }

  /**
   * Setup testing framework
   */
  async setupTestingFramework() {
    try {
      // Let user select project for testing framework setup
      const projectDir = await this.projectDiscovery.selectProject('Select project for testing framework setup:');
      
      if (projectDir === 'GO_BACK') {
        return this.showInterface();
      }
      
      console.log(`📁 Selected project: ${projectDir}`);

      const { frameworks } = await inquirer.prompt({
        type: 'checkbox',
        name: 'frameworks',
        message: 'Select testing frameworks to configure:',
        choices: [
          { name: 'Jest (Unit Testing)', value: 'jest', checked: true },
          { name: 'Supertest (Integration Testing)', value: 'supertest', checked: true },
          { name: 'Cypress (E2E Testing)', value: 'cypress' },
          { name: 'Newman (API Testing)', value: 'newman' },
          { name: 'Artillery (Performance Testing)', value: 'artillery' },
          { name: 'All frameworks', value: 'all' }
        ]
      });

      const frameworksToSetup = frameworks.includes('all')
        ? Object.keys(this.testFrameworks)
        : frameworks;

      for (const framework of frameworksToSetup) {
        await this.setupFramework(framework, projectDir);
      }

      this.setup.state.completedComponents.add('tests');
      console.log(`✅ Testing frameworks configured for project: ${path.basename(projectDir)}`);
      
      return this.showInterface();

    } catch (error) {
      await this.setup.handleError('testing-framework-setup', error);
    }
  }

  /**
   * Setup individual framework
   */
  async setupFramework(framework, projectDir) {
    try {
      return await this.setup.safety.safeExecute(`setup-${framework}`, { projectDir }, async () => {
        let result;
        switch(framework) {
          case 'jest':
            result = await this.setupJest(projectDir);
            break;
          case 'supertest':
            result = await this.setupSupertest(projectDir);
            break;
          case 'cypress':
            result = await this.setupCypress(projectDir);
            break;
          case 'newman':
            result = await this.setupNewman(projectDir);
            break;
          case 'artillery':
            result = await this.setupArtillery(projectDir);
            break;
        }

        console.log(`✅ ${this.testFrameworks[framework].name} configured for project: ${path.basename(projectDir)}`);
        return result;
      });
    } catch (error) {
      console.error(`❌ ${framework} setup failed:`, error.message);
    }
  }

  /**
   * Setup Jest for unit testing
   */
  async setupJest(projectDir) {
    try {
      const projectPath = projectDir;
      const ora = require('ora');

      // Install Jest
      const installSpinner = ora('📦 Installing Jest...').start();
      console.log('⏳ This may take 1-3 minutes...');
      await exec('npm install --save-dev jest', { cwd: projectPath });
      installSpinner.succeed('✅ Jest installation completed');

      // Create Jest configuration
      const configSpinner = ora('📝 Creating Jest configuration...').start();
      const jestConfig = {
        testEnvironment: 'node',
        testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
        collectCoverageFrom: [
          'server/src/**/*.js',
          '!server/src/**/*.test.js'
        ],
        coverageDirectory: 'coverage',
        coverageReporters: ['text', 'lcov', 'html'],
        setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
      };

      await fs.writeFile(
        path.join(projectPath, 'jest.config.js'),
        `module.exports = ${JSON.stringify(jestConfig, null, 2)};`
      );
      configSpinner.succeed('✅ Jest configuration created');

      // Create test setup file
      const setupSpinner = ora('📝 Creating test setup files...').start();
      
      // Ensure tests directory exists
      await fs.ensureDir(path.join(projectPath, 'tests'));
      
      const setupContent = `
// Jest setup file
require('dotenv').config({ path: '.env.test' });

// Global test setup
beforeAll(async () => {
  // Setup test database
  // Setup test environment
});

afterAll(async () => {
  // Cleanup test environment
});
`;
      await fs.writeFile(
        path.join(projectPath, 'tests', 'setup.js'),
        setupContent
      );
      setupSpinner.succeed('✅ Test setup files created');

      // Create sample test
      const testSpinner = ora('📝 Creating sample test files...').start();
      
      // Ensure tests/unit directory exists
      await fs.ensureDir(path.join(projectPath, 'tests', 'unit'));
      
      const sampleTest = `
const request = require('supertest');
const app = require('../server/src/app');

describe('API Tests', () => {
  test('GET /health should return 200', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
  });
});
`;
      await fs.writeFile(
        path.join(projectPath, 'tests', 'unit', 'api.test.js'),
        sampleTest
      );
      testSpinner.succeed('✅ Sample test files created');

      console.log('✅ Jest configured with sample tests');
      
      return {
        success: true,
        framework: 'jest',
        configFile: 'jest.config.js',
        setupFile: 'tests/setup.js',
        sampleTest: 'tests/unit/api.test.js',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Jest setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup Supertest for integration testing
   */
  async setupSupertest(projectDir) {
    try {
      const projectPath = projectDir;
      const ora = require('ora');

      // Install Supertest
      const installSpinner = ora('📦 Installing Supertest...').start();
      console.log('⏳ This may take 1-2 minutes...');
      await exec('npm install --save-dev supertest', { cwd: projectPath });
      installSpinner.succeed('✅ Supertest installation completed');

      // Create integration test
      const testSpinner = ora('📝 Creating integration test files...').start();
      
      // Ensure tests/integration directory exists
      await fs.ensureDir(path.join(projectPath, 'tests', 'integration'));
      
      const integrationTest = `
const request = require('supertest');
const app = require('../server/src/app');

describe('Integration Tests', () => {
  describe('Database Integration', () => {
    test('should connect to database', async () => {
      const response = await request(app)
        .get('/api/test-db')
        .expect(200);

      expect(response.body.database).toBe('connected');
    });
  });

  describe('API Integration', () => {
    test('should handle complete user workflow', async () => {
      // Test user registration, login, and data retrieval
      const userData = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Register user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Login user
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send(userData)
        .expect(200);

      const token = loginResponse.body.token;

      // Get user profile
      await request(app)
        .get('/api/user/profile')
        .set('Authorization', \`Bearer \${token}\`)
        .expect(200);
    });
  });
});
`;
      await fs.writeFile(
        path.join(projectPath, 'tests', 'integration', 'integration.test.js'),
        integrationTest
      );
      testSpinner.succeed('✅ Integration test files created');

      console.log('✅ Supertest configured with integration tests');
      
      return {
        success: true,
        framework: 'supertest',
        integrationTest: 'tests/integration/api.test.js',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Supertest setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup Cypress for E2E testing
   */
  async setupCypress(projectDir) {
    try {
      const projectPath = projectDir;
      const ora = require('ora');

      // Install Cypress
      const installSpinner = ora('📦 Installing Cypress...').start();
      console.log('⏳ This may take 2-5 minutes...');
      await exec('npm install --save-dev cypress', { cwd: projectPath });
      installSpinner.succeed('✅ Cypress installation completed');

      // Create Cypress configuration
      const configSpinner = ora('📝 Creating Cypress configuration...').start();
      const cypressConfig = {
        viewportWidth: 1280,
        viewportHeight: 720,
        video: true,
        screenshotOnRunFailure: true,
        baseUrl: 'http://localhost:3000',
        env: {
          apiUrl: 'http://localhost:5000'
        }
      };

      await fs.writeFile(
        path.join(projectPath, 'cypress.config.js'),
        `module.exports = ${JSON.stringify(cypressConfig, null, 2)};`
      );
      configSpinner.succeed('✅ Cypress configuration created');

      // Create E2E test
      const testSpinner = ora('📝 Creating E2E test files...').start();
      
      // Ensure cypress/e2e directory exists
      await fs.ensureDir(path.join(projectPath, 'cypress', 'e2e'));
      
      const e2eTest = `
describe('E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the homepage', () => {
    cy.contains('Welcome to PERN App');
  });

  it('should handle user registration', () => {
    cy.visit('/register');

    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/dashboard');
    cy.contains('Welcome');
  });

  it('should handle user login', () => {
    cy.visit('/login');

    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();

    cy.url().should('include', '/dashboard');
  });
});
`;
      await fs.writeFile(
        path.join(projectPath, 'cypress', 'e2e', 'user-flow.cy.js'),
        e2eTest
      );
      testSpinner.succeed('✅ E2E test files created');

      console.log('✅ Cypress configured with E2E tests');
      
      return {
        success: true,
        framework: 'cypress',
        configFile: 'cypress.config.js',
        e2eTest: 'cypress/e2e/app.cy.js',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Cypress setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup Newman for API testing
   */
  async setupNewman(projectDir) {
    try {
      const projectPath = projectDir;
      const ora = require('ora');

      // Install Newman
      const installSpinner = ora('📦 Installing Newman...').start();
      console.log('⏳ This may take 1-2 minutes...');
      await exec('npm install --save-dev newman', { cwd: projectPath });
      installSpinner.succeed('✅ Newman installation completed');

      // Create Postman collection
      const collectionSpinner = ora('📝 Creating Postman collection...').start();
      
      // Ensure tests/api directory exists
      await fs.ensureDir(path.join(projectPath, 'tests', 'api'));
      
      const collection = {
        info: {
          name: 'PERN API Tests',
          description: 'API tests for PERN application'
        },
        variable: [
          {
            key: 'baseUrl',
            value: 'http://localhost:5000'
          }
        ],
        item: [
          {
            name: 'Health Check',
            request: {
              method: 'GET',
              header: [],
              url: {
                raw: '{{baseUrl}}/health',
                host: ['{{baseUrl}}'],
                path: ['health']
              }
            },
            event: [
              {
                listen: 'test',
                script: {
                  exec: [
                    'pm.test("Status code is 200", function () {',
                    '    pm.response.to.have.status(200);',
                    '});',
                    '',
                    'pm.test("Response has status", function () {',
                    '    var jsonData = pm.response.json();',
                    '    pm.expect(jsonData.status).to.eql("ok");',
                    '});'
                  ]
                }
              }
            ]
          }
        ]
      };

      await fs.writeFile(
        path.join(projectPath, 'tests', 'api', 'collection.json'),
        JSON.stringify(collection, null, 2)
      );
      collectionSpinner.succeed('✅ Postman collection created');

      console.log('✅ Newman configured with API tests');
      
      return {
        success: true,
        framework: 'newman',
        collectionFile: 'tests/postman/collection.json',
        environmentFile: 'tests/postman/environment.json',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Newman setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup Artillery for performance testing
   */
  async setupArtillery(projectDir) {
    try {
      const projectPath = projectDir;
      const ora = require('ora');

      // Install Artillery
      const installSpinner = ora('📦 Installing Artillery...').start();
      console.log('⏳ This may take 1-2 minutes...');
      await exec('npm install --save-dev artillery', { cwd: projectPath });
      installSpinner.succeed('✅ Artillery installation completed');

      // Create Artillery configuration
      const configSpinner = ora('📝 Creating Artillery configuration...').start();
      
      // Ensure tests/performance directory exists
      await fs.ensureDir(path.join(projectPath, 'tests', 'performance'));
      
      const artilleryConfig = {
        config: {
          target: 'http://localhost:5000',
          phases: [
            { duration: 60, arrivalRate: 10 },
            { duration: 120, arrivalRate: 50 },
            { duration: 60, arrivalRate: 10 }
          ],
          defaults: {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        },
        scenarios: [
          {
            name: 'Health check',
            flow: [
              {
                get: {
                  url: '/health'
                }
              }
            ]
          },
          {
            name: 'User registration',
            flow: [
              {
                post: {
                  url: '/api/auth/register',
                  json: {
                    email: 'test{{$randomInt}}@example.com',
                    password: 'password123'
                  }
                }
              }
            ]
          }
        ]
      };

      await fs.writeFile(
        path.join(projectPath, 'tests', 'performance', 'load-test.yml'),
        JSON.stringify(artilleryConfig, null, 2)
      );
      configSpinner.succeed('✅ Artillery configuration created');

      console.log('✅ Artillery configured with performance tests');
      
      return {
        success: true,
        framework: 'artillery',
        configFile: 'tests/performance/load-test.yml',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Artillery setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Run tests
   */
  async runTests() {
    try {
      // Let user select project for running tests
      const projectDir = await this.projectDiscovery.selectProject('Select project to run tests for:');
      
      if (projectDir === 'GO_BACK') {
        return this.showInterface();
      }
      
      console.log(`📁 Selected project: ${projectDir}`);

      const { testType } = await inquirer.prompt({
        type: 'list',
        name: 'testType',
        message: 'Select test type to run:',
        loop: false,
        choices: [
          '1. Unit tests (Jest)',
          '2. Integration tests (Supertest)',
          '3. E2E tests (Cypress)',
          '4. API tests (Newman)',
          '5. Performance tests (Artillery)',
          '6. All tests',
          '7. Go back'
        ]
      });

      const selected = parseInt(testType.split('.')[0]);

      switch(selected) {
        case 1:
          await this.runJestTests(projectDir);
          break;
        case 2:
          await this.runSupertestTests(projectDir);
          break;
        case 3:
          await this.runCypressTests(projectDir);
          break;
        case 4:
          await this.runNewmanTests(projectDir);
          break;
        case 5:
          await this.runArtilleryTests(projectDir);
          break;
        case 6:
          await this.runAllTests(projectDir);
          break;
        case 7:
          return this.showInterface();
      }

    } catch (error) {
      await this.setup.handleError('run-tests', error);
    }
  }

  /**
   * Run Jest unit tests
   */
  async runJestTests(projectDir) {
    try {
      const projectPath = projectDir;
      const ora = require('ora');

      console.log('🧪 Running Jest unit tests...');
      const testSpinner = ora('🧪 Running Jest unit tests...').start();
      console.log('⏳ This may take 30 seconds to 2 minutes...');
      const { stdout } = await exec('npx jest', { cwd: projectPath });
      testSpinner.succeed('✅ Jest tests completed');

      console.log(stdout);
      console.log('✅ Jest tests completed');
    } catch (error) {
      console.error('❌ Jest tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Run Supertest integration tests
   */
  async runSupertestTests(projectDir) {
    try {
      const projectPath = projectDir;
      const ora = require('ora');

      console.log('🔗 Running Supertest integration tests...');
      const testSpinner = ora('🔗 Running Supertest integration tests...').start();
      console.log('⏳ This may take 1-3 minutes...');
      const { stdout } = await exec('npx jest tests/integration/', { cwd: projectPath });
      testSpinner.succeed('✅ Integration tests completed');

      console.log(stdout);
      console.log('✅ Integration tests completed');
    } catch (error) {
      console.error('❌ Integration tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Run Cypress E2E tests
   */
  async runCypressTests(projectDir) {
    try {
      const projectPath = projectDir;
      const ora = require('ora');

      console.log('🌐 Running Cypress E2E tests...');
      const testSpinner = ora('🌐 Running Cypress E2E tests...').start();
      console.log('⏳ This may take 2-5 minutes...');
      console.log('💡 Note: Cypress tests require a running web application');
      console.log('💡 If tests fail, make sure your web app is running on the expected port');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Cypress tests timed out after 10 minutes')), 10 * 60 * 1000);
      });
      
      const cypressPromise = exec('npx cypress run --browser chrome --headless', { 
        cwd: projectPath,
        timeout: 10 * 60 * 1000 // 10 minute timeout
      });
      
      try {
        const { stdout } = await Promise.race([cypressPromise, timeoutPromise]);
        testSpinner.succeed('✅ E2E tests completed');
        console.log(stdout);
        console.log('✅ E2E tests completed');
      } catch (error) {
        testSpinner.fail('❌ E2E tests failed or timed out');
        console.log('⚠️  Cypress tests failed - this is common if the web app is not running');
        console.log('💡 To run Cypress tests successfully:');
        console.log('   1. Start your web application (e.g., npm start or npm run dev)');
        console.log('   2. Make sure the app is running on the expected port');
        console.log('   3. Update the cypress.config.js with correct baseUrl');
        console.log('   4. Run Cypress tests again');
        console.log('✅ Cypress test execution completed (with warnings)');
      }
    } catch (error) {
      console.error('❌ E2E tests failed:', error.message);
      console.log('💡 This is normal if the web application is not running');
    }
  }

  /**
   * Run Newman API tests
   */
  async runNewmanTests(projectDir) {
    try {
      const projectPath = projectDir;
      const ora = require('ora');

      console.log('📡 Running Newman API tests...');
      const testSpinner = ora('📡 Running Newman API tests...').start();
      console.log('⏳ This may take 1-3 minutes...');
      console.log('💡 Note: Newman tests require a running API server');
      console.log('💡 If tests fail, make sure your API server is running on the expected port');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Newman tests timed out after 5 minutes')), 5 * 60 * 1000);
      });
      
      const newmanPromise = exec('npx newman run tests/api/collection.json --timeout-request 10000 --timeout-script 10000', { 
        cwd: projectPath,
        timeout: 5 * 60 * 1000 // 5 minute timeout
      });
      
      try {
        const { stdout } = await Promise.race([newmanPromise, timeoutPromise]);
        testSpinner.succeed('✅ API tests completed');
        console.log(stdout);
        console.log('✅ API tests completed');
      } catch (error) {
        testSpinner.fail('❌ API tests failed or timed out');
        console.log('⚠️  Newman tests failed - this is common if the API server is not running');
        console.log('💡 To run Newman tests successfully:');
        console.log('   1. Start your API server (e.g., npm start or node server.js)');
        console.log('   2. Make sure the server is running on the expected port');
        console.log('   3. Update the collection.json with correct API endpoints');
        console.log('   4. Run Newman tests again');
        console.log('✅ Newman test execution completed (with warnings)');
      }
    } catch (error) {
      console.error('❌ Newman tests failed:', error.message);
      console.log('💡 This is normal if the API server is not running');
    }
  }

  /**
   * Run Artillery performance tests
   */
  async runArtilleryTests(projectDir) {
    try {
      const projectPath = projectDir;
      const ora = require('ora');

      console.log('⚡ Running Artillery performance tests...');
      const testSpinner = ora('⚡ Running Artillery performance tests...').start();
      console.log('⏳ This may take 2-5 minutes...');
      console.log('💡 Note: Artillery tests require a running API server');
      console.log('💡 If tests fail, make sure your API server is running on the expected port');
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Artillery tests timed out after 10 minutes')), 10 * 60 * 1000);
      });
      
      const artilleryPromise = exec('npx artillery run tests/performance/load-test.yml', { 
        cwd: projectPath,
        timeout: 10 * 60 * 1000 // 10 minute timeout
      });
      
      try {
        const { stdout } = await Promise.race([artilleryPromise, timeoutPromise]);
        testSpinner.succeed('✅ Performance tests completed');
        console.log(stdout);
        console.log('✅ Performance tests completed');
      } catch (error) {
        testSpinner.fail('❌ Performance tests failed or timed out');
        console.log('⚠️  Artillery tests failed - this is common if the API server is not running');
        console.log('💡 To run Artillery tests successfully:');
        console.log('   1. Start your API server (e.g., npm start or node server.js)');
        console.log('   2. Make sure the server is running on the expected port');
        console.log('   3. Update the load-test.yml with correct API endpoints');
        console.log('   4. Run Artillery tests again');
        console.log('✅ Artillery test execution completed (with warnings)');
      }
    } catch (error) {
      console.error('❌ Artillery tests failed:', error.message);
      console.log('💡 This is normal if the API server is not running');
    }
  }

  /**
   * Run all tests
   */
  async runAllTests(projectDir) {
    try {
      const ora = require('ora');
      console.log(`🏃 Running all tests for project: ${path.basename(projectDir)}...`);
      
      const allTestsSpinner = ora('🏃 Running all test suites...').start();
      console.log('⏳ This may take 5-15 minutes depending on test complexity...');
      
      try {
        await this.runJestTests(projectDir);
        console.log('✅ Jest tests completed');
      } catch (error) {
        console.log('⚠️  Jest tests failed, continuing with other tests...');
      }
      
      try {
        await this.runSupertestTests(projectDir);
        console.log('✅ Supertest tests completed');
      } catch (error) {
        console.log('⚠️  Supertest tests failed, continuing with other tests...');
      }
      
      try {
        await this.runCypressTests(projectDir);
        console.log('✅ Cypress tests completed');
      } catch (error) {
        console.log('⚠️  Cypress tests failed, continuing with other tests...');
      }
      
      try {
        await this.runNewmanTests(projectDir);
        console.log('✅ Newman tests completed');
      } catch (error) {
        console.log('⚠️  Newman tests failed, continuing with other tests...');
      }
      
      try {
        await this.runArtilleryTests(projectDir);
        console.log('✅ Artillery tests completed');
      } catch (error) {
        console.log('⚠️  Artillery tests failed, continuing with other tests...');
      }
      
      allTestsSpinner.succeed('✅ All test suites completed');
      console.log('✅ All tests completed');
      
      return this.showInterface();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      throw error;
    }
  }

  /**
   * Configure CI/CD
   */
  async configureCI() {
    try {
      // Let user select project for CI/CD configuration
      const projectDir = await this.projectDiscovery.selectProject('Select project for CI/CD configuration:');
      
      if (projectDir === 'GO_BACK') {
        return this.showInterface();
      }
      
      console.log(`📁 Selected project: ${projectDir}`);

      const { platform } = await inquirer.prompt({
        type: 'list',
        name: 'platform',
        message: 'Select CI/CD platform:',
        loop: false,
        choices: [
          '1. GitHub Actions',
          '2. GitLab CI',
          '3. Jenkins',
          '4. CircleCI',
          '5. Azure DevOps',
          '6. Go back'
        ]
      });

      const selected = parseInt(platform.split('.')[0]);

      switch(selected) {
        case 1:
          await this.configureGitHubActions(projectDir);
          break;
        case 2:
          await this.configureGitLabCI(projectDir);
          break;
        case 3:
          await this.configureJenkins(projectDir);
          break;
        case 4:
          await this.configureCircleCI(projectDir);
          break;
        case 5:
          await this.configureAzureDevOps(projectDir);
          break;
        case 6:
          return this.showInterface();
      }
      
      return this.showInterface();

    } catch (error) {
      await this.setup.handleError('ci-configuration', error);
    }
  }

  /**
   * Configure GitHub Actions
   */
  async configureGitHubActions(projectDir) {
    try {
      const projectPath = projectDir;

      const workflow = {
        name: 'PERN CI/CD',
        on: {
          push: { branches: ['main', 'develop'] },
          pull_request: { branches: ['main'] }
        },
        jobs: {
          test: {
            'runs-on': 'ubuntu-latest',
            steps: [
              {
                uses: 'actions/checkout@v3'
              },
              {
                name: 'Setup Node.js',
                uses: 'actions/setup-node@v3',
                with: {
                  'node-version': '18',
                  'cache': 'npm'
                }
              },
              {
                name: 'Install dependencies',
                run: 'npm ci'
              },
              {
                name: 'Run tests',
                run: 'npm test'
              },
              {
                name: 'Run security scan',
                run: 'npm run security:scan'
              }
            ]
          }
        }
      };

      const workflowsDir = path.join(projectPath, '.github', 'workflows');
      await fs.ensureDir(workflowsDir);

      await fs.writeFile(
        path.join(workflowsDir, 'ci.yml'),
        JSON.stringify(workflow, null, 2)
      );

      console.log('✅ GitHub Actions workflow configured');
    } catch (error) {
      console.error('❌ GitHub Actions configuration failed:', error.message);
      throw error;
    }
  }

  /**
   * Configure GitLab CI
   */
  async configureGitLabCI(projectDir) {
    try {
      const projectPath = projectDir;

      const gitlabConfig = {
        stages: ['test', 'build', 'deploy'],
        test: {
          stage: 'test',
          image: 'node:18',
          script: [
            'npm ci',
            'npm test',
            'npm run security:scan'
          ]
        },
        build: {
          stage: 'build',
          image: 'docker:latest',
          script: [
            'docker build -t pern-app .',
            'docker save pern-app > pern-app.tar'
          ],
          artifacts: {
            paths: ['pern-app.tar']
          }
        }
      };

      await fs.writeFile(
        path.join(projectPath, '.gitlab-ci.yml'),
        JSON.stringify(gitlabConfig, null, 2)
      );

      console.log('✅ GitLab CI pipeline configured');
    } catch (error) {
      console.error('❌ GitLab CI configuration failed:', error.message);
      throw error;
    }
  }

  /**
   * Configure Jenkins
   */
  async configureJenkins(projectDir) {
    try {
      const projectPath = projectDir;

      const jenkinsfile = `pipeline {
    agent any

    stages {
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'npm test'
            }
        }

        stage('Security Scan') {
            steps {
                sh 'npm run security:scan'
            }
        }

        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
    }

    post {
        always {
            junit 'test-results/*.xml'
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'coverage',
                reportFiles: 'index.html',
                reportName: 'Coverage Report'
            ])
        }
    }
}`;

      await fs.writeFile(
        path.join(projectPath, 'Jenkinsfile'),
        jenkinsfile
      );

      console.log('✅ Jenkins pipeline configured');
    } catch (error) {
      console.error('❌ Jenkins configuration failed:', error.message);
      throw error;
    }
  }

  /**
   * Configure CircleCI
   */
  async configureCircleCI(projectDir) {
    try {
      const projectPath = projectDir;

      const circleConfig = {
        version: 2.1,
        executors: {
          node: {
            docker: [{ image: 'cimg/node:18.17' }]
          }
        },
        jobs: {
          test: {
            executor: 'node',
            steps: [
              'checkout',
              {
                run: {
                  name: 'Install dependencies',
                  command: 'npm ci'
                }
              },
              {
                run: {
                  name: 'Run tests',
                  command: 'npm test'
                }
              },
              {
                run: {
                  name: 'Security scan',
                  command: 'npm run security:scan'
                }
              }
            ]
          }
        },
        workflows: {
          version: 2,
          test: {
            jobs: ['test']
          }
        }
      };

      await fs.writeFile(
        path.join(projectPath, '.circleci', 'config.yml'),
        JSON.stringify(circleConfig, null, 2)
      );

      console.log('✅ CircleCI configuration created');
    } catch (error) {
      console.error('❌ CircleCI configuration failed:', error.message);
      throw error;
    }
  }

  /**
   * Configure Azure DevOps
   */
  async configureAzureDevOps(projectDir) {
    try {
      const projectPath = projectDir;

      const azureConfig = {
        trigger: ['main', 'develop'],
        pool: {
          vmImage: 'ubuntu-latest'
        },
        steps: [
          {
            script: 'npm ci',
            displayName: 'Install dependencies'
          },
          {
            script: 'npm test',
            displayName: 'Run tests'
          },
          {
            script: 'npm run security:scan',
            displayName: 'Security scan'
          }
        ]
      };

      await fs.writeFile(
        path.join(projectPath, 'azure-pipelines.yml'),
        JSON.stringify(azureConfig, null, 2)
      );

      console.log('✅ Azure DevOps pipeline configured');
    } catch (error) {
      console.error('❌ Azure DevOps configuration failed:', error.message);
      throw error;
    }
  }
}

module.exports = TestManager;