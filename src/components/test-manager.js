/**
 * PERN Setup Tool - Test Manager
 * Comprehensive testing framework with multiple test types and automation
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

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
        await this.setupFramework(framework);
      }

      this.setup.state.completedComponents.add('tests');
      console.log('✅ Testing frameworks configured');

    } catch (error) {
      await this.setup.handleError('testing-framework-setup', error);
    }

    await this.showInterface();
  }

  /**
   * Setup individual framework
   */
  async setupFramework(framework) {
    try {
      await this.setup.safety.safeExecute(`setup-${framework}`, {}, async () => {
        switch(framework) {
          case 'jest':
            await this.setupJest();
            break;
          case 'supertest':
            await this.setupSupertest();
            break;
          case 'cypress':
            await this.setupCypress();
            break;
          case 'newman':
            await this.setupNewman();
            break;
          case 'artillery':
            await this.setupArtillery();
            break;
        }

        console.log(`✅ ${this.testFrameworks[framework].name} configured`);
      });
    } catch (error) {
      console.error(`❌ ${framework} setup failed:`, error.message);
    }
  }

  /**
   * Setup Jest for unit testing
   */
  async setupJest() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

      // Install Jest
      await exec('npm install --save-dev jest', { cwd: projectPath });

      // Create Jest configuration
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

      // Create test setup file
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

      // Create sample test
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

      console.log('✅ Jest configured with sample tests');
    } catch (error) {
      console.error('❌ Jest setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup Supertest for integration testing
   */
  async setupSupertest() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

      // Install Supertest
      await exec('npm install --save-dev supertest', { cwd: projectPath });

      // Create integration test
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

      console.log('✅ Supertest configured with integration tests');
    } catch (error) {
      console.error('❌ Supertest setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup Cypress for E2E testing
   */
  async setupCypress() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

      // Install Cypress
      await exec('npm install --save-dev cypress', { cwd: projectPath });

      // Create Cypress configuration
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

      // Create E2E test
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

      console.log('✅ Cypress configured with E2E tests');
    } catch (error) {
      console.error('❌ Cypress setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup Newman for API testing
   */
  async setupNewman() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

      // Install Newman
      await exec('npm install --save-dev newman', { cwd: projectPath });

      // Create Postman collection
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

      console.log('✅ Newman configured with API tests');
    } catch (error) {
      console.error('❌ Newman setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Setup Artillery for performance testing
   */
  async setupArtillery() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

      // Install Artillery
      await exec('npm install --save-dev artillery', { cwd: projectPath });

      // Create Artillery configuration
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

      console.log('✅ Artillery configured with performance tests');
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
      const { testType } = await inquirer.prompt({
        type: 'list',
        name: 'testType',
        message: 'Select test type to run:',
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
          await this.runJestTests();
          break;
        case 2:
          await this.runSupertestTests();
          break;
        case 3:
          await this.runCypressTests();
          break;
        case 4:
          await this.runNewmanTests();
          break;
        case 5:
          await this.runArtilleryTests();
          break;
        case 6:
          await this.runAllTests();
          break;
        case 7:
          return this.showInterface();
      }

    } catch (error) {
      await this.setup.handleError('run-tests', error);
    }

    await this.showInterface();
  }

  /**
   * Run Jest unit tests
   */
  async runJestTests() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

      console.log('🧪 Running Jest unit tests...');
      const { stdout } = await exec('npx jest', { cwd: projectPath });

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
  async runSupertestTests() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

      console.log('🔗 Running Supertest integration tests...');
      const { stdout } = await exec('npx jest tests/integration/', { cwd: projectPath });

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
  async runCypressTests() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

      console.log('🌐 Running Cypress E2E tests...');
      const { stdout } = await exec('npx cypress run', { cwd: projectPath });

      console.log(stdout);
      console.log('✅ E2E tests completed');
    } catch (error) {
      console.error('❌ E2E tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Run Newman API tests
   */
  async runNewmanTests() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

      console.log('📡 Running Newman API tests...');
      const { stdout } = await exec('npx newman run tests/api/collection.json', { cwd: projectPath });

      console.log(stdout);
      console.log('✅ API tests completed');
    } catch (error) {
      console.error('❌ API tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Run Artillery performance tests
   */
  async runArtilleryTests() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

      console.log('⚡ Running Artillery performance tests...');
      const { stdout } = await exec('npx artillery run tests/performance/load-test.yml', { cwd: projectPath });

      console.log(stdout);
      console.log('✅ Performance tests completed');
    } catch (error) {
      console.error('❌ Performance tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    try {
      console.log('🏃 Running all tests...');

      await this.runJestTests();
      await this.runSupertestTests();
      await this.runNewmanTests();
      await this.runArtilleryTests();

      console.log('✅ All tests completed');
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
      const { platform } = await inquirer.prompt({
        type: 'list',
        name: 'platform',
        message: 'Select CI/CD platform:',
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
          await this.configureGitHubActions();
          break;
        case 2:
          await this.configureGitLabCI();
          break;
        case 3:
          await this.configureJenkins();
          break;
        case 4:
          await this.configureCircleCI();
          break;
        case 5:
          await this.configureAzureDevOps();
          break;
        case 6:
          return this.showInterface();
      }

    } catch (error) {
      await this.setup.handleError('ci-configuration', error);
    }

    await this.showInterface();
  }

  /**
   * Configure GitHub Actions
   */
  async configureGitHubActions() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

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
  async configureGitLabCI() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

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
  async configureJenkins() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

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
  async configureCircleCI() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

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
  async configureAzureDevOps() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

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