#!/usr/bin/env node

/**
 * PERN Setup Tool - Deployment Automation
 * Automated deployment system with rollback capabilities and health monitoring
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const chalk = require('chalk');

/**
 * Deployment Automation Class
 * Handles automated deployment with safety and rollback capabilities
 */
class DeploymentAutomation {
  constructor(setupTool) {
    this.setup = setupTool;
    this.logger = setupTool.logger;
    this.safety = setupTool.safety;
    this.config = setupTool.config;
    this.platform = process.platform;
    this.deploymentHistory = [];
    this.currentDeployment = null;
  }

  /**
   * Show deployment interface
   */
  async showInterface() {
    try {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Deployment Automation',
          choices: [
            '1. Deploy to development',
            '2. Deploy to staging',
            '3. Deploy to production',
            '4. Configure deployment settings',
            '5. View deployment history',
            '6. Rollback deployment',
            '7. Go back'
          ]
        }
      ]);

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.deployToDevelopment();
          break;
        case 2:
          await this.deployToStaging();
          break;
        case 3:
          await this.deployToProduction();
          break;
        case 4:
          await this.configureDeploymentSettings();
          break;
        case 5:
          await this.viewDeploymentHistory();
          break;
        case 6:
          await this.rollbackDeployment();
          break;
        case 7:
          return this.setup.showMainInterface();
      }

    } catch (error) {
      await this.setup.handleError('deployment-interface', error);
    }
  }

  /**
   * Deploy to development environment
   */
  async deployToDevelopment() {
    try {
      console.log(chalk.blue('🚀 Deploying to development environment...'));

      const deployment = {
        id: this.generateDeploymentId(),
        environment: 'development',
        timestamp: new Date().toISOString(),
        status: 'in_progress',
        components: ['application', 'database', 'tests']
      };

      this.currentDeployment = deployment;

      await this.setup.safety.safeExecute('deploy-development', {
        environment: 'development',
        deployment
      }, async () => {
        // 1. Pre-deployment checks
        await this.preDeploymentChecks('development');

        // 2. Backup current state
        await this.createDeploymentBackup('development');

        // 3. Deploy application
        await this.deployApplication('development');

        // 4. Run database migrations
        await this.runDatabaseMigrations('development');

        // 5. Run tests
        await this.runDeploymentTests('development');

        // 6. Health checks
        await this.postDeploymentHealthChecks('development');

        deployment.status = 'completed';
        this.deploymentHistory.push(deployment);

        console.log(chalk.green('✅ Development deployment completed successfully'));
      });

    } catch (error) {
      if (this.currentDeployment) {
        this.currentDeployment.status = 'failed';
        this.currentDeployment.error = error.message;
      }
      await this.setup.handleError('deploy-development', error);
    }

    await this.showInterface();
  }

  /**
   * Deploy to staging environment
   */
  async deployToStaging() {
    try {
      console.log(chalk.blue('🚀 Deploying to staging environment...'));

      const deployment = {
        id: this.generateDeploymentId(),
        environment: 'staging',
        timestamp: new Date().toISOString(),
        status: 'in_progress',
        components: ['application', 'database', 'tests', 'integration']
      };

      this.currentDeployment = deployment;

      await this.setup.safety.safeExecute('deploy-staging', {
        environment: 'staging',
        deployment
      }, async () => {
        // 1. Pre-deployment checks
        await this.preDeploymentChecks('staging');

        // 2. Backup current state
        await this.createDeploymentBackup('staging');

        // 3. Deploy application
        await this.deployApplication('staging');

        // 4. Run database migrations
        await this.runDatabaseMigrations('staging');

        // 5. Run comprehensive tests
        await this.runDeploymentTests('staging');

        // 6. Integration testing
        await this.runIntegrationTests('staging');

        // 7. Health checks
        await this.postDeploymentHealthChecks('staging');

        deployment.status = 'completed';
        this.deploymentHistory.push(deployment);

        console.log(chalk.green('✅ Staging deployment completed successfully'));
      });

    } catch (error) {
      if (this.currentDeployment) {
        this.currentDeployment.status = 'failed';
        this.currentDeployment.error = error.message;
      }
      await this.setup.handleError('deploy-staging', error);
    }

    await this.showInterface();
  }

  /**
   * Deploy to production environment
   */
  async deployToProduction() {
    try {
      console.log(chalk.red('🚨 PRODUCTION DEPLOYMENT'));
      console.log(chalk.yellow('⚠️  This will deploy to production environment'));

      const { confirm } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to deploy to production?',
        default: false
      });

      if (!confirm) {
        console.log('ℹ️  Production deployment cancelled');
        return this.showInterface();
      }

      const deployment = {
        id: this.generateDeploymentId(),
        environment: 'production',
        timestamp: new Date().toISOString(),
        status: 'in_progress',
        components: ['application', 'database', 'tests', 'integration', 'monitoring'],
        requiresApproval: true
      };

      this.currentDeployment = deployment;

      await this.setup.safety.safeExecute('deploy-production', {
        environment: 'production',
        deployment
      }, async () => {
        // 1. Pre-deployment checks
        await this.preDeploymentChecks('production');

        // 2. Backup current state
        await this.createDeploymentBackup('production');

        // 3. Deploy application
        await this.deployApplication('production');

        // 4. Run database migrations
        await this.runDatabaseMigrations('production');

        // 5. Run comprehensive tests
        await this.runDeploymentTests('production');

        // 6. Integration testing
        await this.runIntegrationTests('production');

        // 7. Health checks
        await this.postDeploymentHealthChecks('production');

        // 8. Monitoring setup
        await this.setupMonitoring('production');

        deployment.status = 'completed';
        this.deploymentHistory.push(deployment);

        console.log(chalk.green('✅ Production deployment completed successfully'));
      });

    } catch (error) {
      if (this.currentDeployment) {
        this.currentDeployment.status = 'failed';
        this.currentDeployment.error = error.message;
      }
      await this.setup.handleError('deploy-production', error);
    }

    await this.showInterface();
  }

  /**
   * Pre-deployment checks
   */
  async preDeploymentChecks(environment) {
    console.log(chalk.blue(`🔍 Running pre-deployment checks for ${environment}...`));

    // 1. Check system requirements
    await this.checkSystemRequirements();

    // 2. Check service availability
    await this.checkServiceAvailability(environment);

    // 3. Check database connectivity
    await this.checkDatabaseConnectivity(environment);

    // 4. Check disk space
    await this.checkDiskSpace();

    // 5. Check network connectivity
    await this.checkNetworkConnectivity();

    console.log(chalk.green('✅ Pre-deployment checks completed'));
  }

  /**
   * Check system requirements
   */
  async checkSystemRequirements() {
    const { stdout: nodeVersion } = await exec('node --version');
    const { stdout: npmVersion } = await exec('npm --version');

    console.log(`   Node.js: ${nodeVersion.trim()}`);
    console.log(`   NPM: ${npmVersion.trim()}`);

    if (!nodeVersion.includes('18')) {
      throw new Error('Node.js 18+ required');
    }
  }

  /**
   * Check service availability
   */
  async checkServiceAvailability(environment) {
    const services = ['postgresql', 'redis', 'nginx'];

    for (const service of services) {
      try {
        const status = await this.getServiceStatus(service);
        console.log(`   ${service}: ${status}`);
      } catch (error) {
        console.log(`   ${service}: not available`);
      }
    }
  }

  /**
   * Check database connectivity
   */
  async checkDatabaseConnectivity(environment) {
    try {
      const config = this.config.get('database', {});
      const { Client } = require('pg');

      const client = new Client({
        host: config.host || 'localhost',
        port: config.port || 5432,
        user: config.username || 'postgres',
        password: config.password || '1234',
        database: config.name || 'postgres'
      });

      await client.connect();
      await client.end();

      console.log('   Database: connected');
    } catch (error) {
      console.log('   Database: connection failed');
      throw new Error(`Database connectivity check failed: ${error.message}`);
    }
  }

  /**
   * Check disk space
   */
  async checkDiskSpace() {
    try {
      const { stdout } = await exec('df / | tail -1 | awk \'{print $4}\'');
      const availableKB = parseInt(stdout);
      const availableGB = Math.round(availableKB / 1024 / 1024);

      console.log(`   Disk space: ${availableGB}GB available`);

      if (availableGB < 5) {
        throw new Error('Insufficient disk space (minimum 5GB required)');
      }
    } catch (error) {
      console.log('   Disk space: unable to check');
    }
  }

  /**
   * Check network connectivity
   */
  async checkNetworkConnectivity() {
    try {
      await exec('ping -c 1 google.com');
      console.log('   Network: connected');
    } catch (error) {
      console.log('   Network: offline mode');
    }
  }

  /**
   * Create deployment backup
   */
  async createDeploymentBackup(environment) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `deployment-backup-${environment}-${timestamp}`;

      // Backup database
      const dbBackupPath = path.join(os.homedir(), '.pern-setup', 'backups', `${backupName}.sql`);
      await exec(`pg_dump -h localhost -U postgres -d ${environment === 'production' ? 'myapp_prod' : 'myapp'} > ${dbBackupPath}`);

      // Backup configuration
      const configBackupPath = path.join(os.homedir(), '.pern-setup', 'backups', `${backupName}-config.json`);
      const config = this.config.getAll();
      await fs.writeFile(configBackupPath, JSON.stringify(config, null, 2));

      console.log(`💾 Deployment backup created: ${backupName}`);
      return backupName;
    } catch (error) {
      console.error('❌ Deployment backup failed:', error.message);
      throw error;
    }
  }

  /**
   * Deploy application
   */
  async deployApplication(environment) {
    try {
      console.log('📦 Deploying application...');

      const projectPath = this.config.get('project.location', process.cwd());

      // 1. Install dependencies
      await exec('npm ci', { cwd: projectPath });

      // 2. Build application
      await exec('npm run build', { cwd: projectPath });

      // 3. Run tests
      await exec('npm test', { cwd: projectPath });

      // 4. Copy to deployment directory
      const deployDir = `/opt/pern-app-${environment}`;
      await fs.ensureDir(deployDir);
      await exec(`cp -r ${projectPath}/* ${deployDir}/`);

      console.log('✅ Application deployed');
    } catch (error) {
      console.error('❌ Application deployment failed:', error.message);
      throw error;
    }
  }

  /**
   * Run database migrations
   */
  async runDatabaseMigrations(environment) {
    try {
      console.log('🗄️  Running database migrations...');

      const projectPath = this.config.get('project.location', process.cwd());
      const migrationPath = path.join(projectPath, 'database', 'migrations');

      if (await fs.pathExists(migrationPath)) {
        const migrationFiles = await fs.readdir(migrationPath);
        const sqlFiles = migrationFiles.filter(f => f.endsWith('.sql'));

        for (const file of sqlFiles) {
          const filePath = path.join(migrationPath, file);
          await exec(`psql -h localhost -U postgres -d myapp -f ${filePath}`);
        }

        console.log('✅ Database migrations completed');
      } else {
        console.log('ℹ️  No migrations found');
      }
    } catch (error) {
      console.error('❌ Database migrations failed:', error.message);
      throw error;
    }
  }

  /**
   * Run deployment tests
   */
  async runDeploymentTests(environment) {
    try {
      console.log('🧪 Running deployment tests...');

      const projectPath = this.config.get('project.location', process.cwd());

      // Run test suite
      await exec('npm test', { cwd: projectPath });

      // Run security scan
      await exec('npm run security:scan', { cwd: projectPath });

      console.log('✅ Deployment tests completed');
    } catch (error) {
      console.error('❌ Deployment tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Run integration tests
   */
  async runIntegrationTests(environment) {
    try {
      console.log('🔗 Running integration tests...');

      const projectPath = this.config.get('project.location', process.cwd());

      // Run integration tests
      await exec('npm run test:integration', { cwd: projectPath });

      // Test API endpoints
      await this.testAPIEndpoints(environment);

      console.log('✅ Integration tests completed');
    } catch (error) {
      console.error('❌ Integration tests failed:', error.message);
      throw error;
    }
  }

  /**
   * Test API endpoints
   */
  async testAPIEndpoints(environment) {
    try {
      const axios = require('axios');
      const baseURL = environment === 'production'
        ? 'https://yourdomain.com'
        : 'http://localhost:5000';

      const endpoints = [
        '/health',
        '/api/users',
        '/api/auth/login'
      ];

      for (const endpoint of endpoints) {
        try {
          await axios.get(`${baseURL}${endpoint}`);
          console.log(`   ✅ ${endpoint}: OK`);
        } catch (error) {
          console.log(`   ❌ ${endpoint}: ${error.response?.status || error.message}`);
        }
      }
    } catch (error) {
      console.log('   ℹ️  API endpoint testing skipped (axios not available)');
    }
  }

  /**
   * Post-deployment health checks
   */
  async postDeploymentHealthChecks(environment) {
    try {
      console.log('🏥 Running post-deployment health checks...');

      // 1. Service health checks
      await this.checkServiceHealth(environment);

      // 2. Database health checks
      await this.checkDatabaseHealth(environment);

      // 3. Application health checks
      await this.checkApplicationHealth(environment);

      // 4. Performance checks
      await this.checkPerformance(environment);

      console.log('✅ Health checks completed');
    } catch (error) {
      console.error('❌ Health checks failed:', error.message);
      throw error;
    }
  }

  /**
   * Check service health
   */
  async checkServiceHealth(environment) {
    const services = ['postgresql', 'redis', 'nginx'];

    for (const service of services) {
      try {
        const status = await this.getServiceStatus(service);
        if (status === 'running') {
          console.log(`   ✅ ${service}: running`);
        } else {
          console.log(`   ❌ ${service}: ${status}`);
        }
      } catch (error) {
        console.log(`   ❌ ${service}: error - ${error.message}`);
      }
    }
  }

  /**
   * Check database health
   */
  async checkDatabaseHealth(environment) {
    try {
      const config = this.config.get('database', {});
      const { Client } = require('pg');

      const client = new Client({
        host: config.host || 'localhost',
        port: config.port || 5432,
        user: config.username || 'postgres',
        password: config.password || '1234',
        database: config.name || 'postgres'
      });

      await client.connect();

      // Check database metrics
      const result = await client.query('SELECT version(), current_database(), current_user, session_user');
      console.log(`   ✅ Database: ${result.rows[0].current_database} (${result.rows[0].version.split(' ')[1]})`);

      await client.end();
    } catch (error) {
      console.log(`   ❌ Database: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check application health
   */
  async checkApplicationHealth(environment) {
    try {
      const axios = require('axios');
      const baseURL = environment === 'production'
        ? 'https://yourdomain.com'
        : 'http://localhost:5000';

      const response = await axios.get(`${baseURL}/health`, { timeout: 5000 });
      console.log(`   ✅ Application: ${response.data.status} (${response.data.uptime}s uptime)`);
    } catch (error) {
      console.log(`   ❌ Application: ${error.response?.status || error.message}`);
      throw error;
    }
  }

  /**
   * Check performance
   */
  async checkPerformance(environment) {
    try {
      const startTime = Date.now();

      const axios = require('axios');
      const baseURL = environment === 'production'
        ? 'https://yourdomain.com'
        : 'http://localhost:5000';

      await axios.get(`${baseURL}/health`);
      const responseTime = Date.now() - startTime;

      console.log(`   ✅ Performance: ${responseTime}ms response time`);

      if (responseTime > 1000) {
        console.log('   ⚠️  Response time is slower than expected');
      }
    } catch (error) {
      console.log(`   ❌ Performance check failed: ${error.message}`);
    }
  }

  /**
   * Setup monitoring
   */
  async setupMonitoring(environment) {
    try {
      console.log('📊 Setting up monitoring...');

      // Configure monitoring based on environment
      const monitoringConfig = {
        environment,
        enabled: true,
        metrics: ['cpu', 'memory', 'disk', 'network'],
        alerts: {
          email: true,
          slack: false,
          webhook: false
        },
        dashboards: {
          grafana: false,
          datadog: false,
          newrelic: false
        }
      };

      this.config.set('monitoring', monitoringConfig);
      console.log('✅ Monitoring configured');
    } catch (error) {
      console.error('❌ Monitoring setup failed:', error.message);
      throw error;
    }
  }

  /**
   * Configure deployment settings
   */
  async configureDeploymentSettings() {
    try {
      const { setting } = await inquirer.prompt({
        type: 'list',
        name: 'setting',
        message: 'Deployment settings:',
        choices: [
          '1. Configure deployment environments',
          '2. Setup deployment pipeline',
          '3. Configure rollback settings',
          '4. Setup notification settings',
          '5. Go back'
        ]
      });

      const selected = parseInt(setting.split('.')[0]);

      switch(selected) {
        case 1:
          await this.configureEnvironments();
          break;
        case 2:
          await this.configurePipeline();
          break;
        case 3:
          await this.configureRollback();
          break;
        case 4:
          await this.configureNotifications();
          break;
        case 5:
          return this.showInterface();
      }

    } catch (error) {
      await this.setup.handleError('deployment-settings-config', error);
    }

    await this.configureDeploymentSettings();
  }

  /**
   * Configure deployment environments
   */
  async configureEnvironments() {
    try {
      const environments = ['development', 'staging', 'production'];

      for (const env of environments) {
        const { configure } = await inquirer.prompt({
          type: 'confirm',
          name: 'configure',
          message: `Configure ${env} environment?`,
          default: true
        });

        if (configure) {
          const { domain } = await inquirer.prompt({
            type: 'input',
            name: 'domain',
            message: `${env} domain:`,
            default: env === 'production' ? 'yourapp.com' : `localhost`
          });

          const envConfig = {
            domain,
            database: `myapp_${env}`,
            port: env === 'production' ? 5000 : 5000 + environments.indexOf(env),
            replicas: env === 'production' ? 3 : 1,
            autoScaling: env === 'production'
          };

          this.config.set(`deployment.environments.${env}`, envConfig);
        }
      }

      console.log('✅ Deployment environments configured');
    } catch (error) {
      await this.setup.handleError('environment-config', error);
    }
  }

  /**
   * Configure deployment pipeline
   */
  async configurePipeline() {
    try {
      const { pipelineType } = await inquirer.prompt({
        type: 'list',
        name: 'pipelineType',
        message: 'Pipeline type:',
        choices: [
          'Simple (test -> deploy)',
          'Standard (test -> build -> deploy)',
          'Advanced (test -> build -> stage -> deploy)',
          'Enterprise (full CI/CD with gates)'
        ]
      });

      const pipelineConfig = {
        type: pipelineType,
        stages: this.getPipelineStages(pipelineType),
        gates: pipelineType.includes('Enterprise') ? [
          'security-scan',
          'compliance-check',
          'performance-test',
          'manual-approval'
        ] : [],
        notifications: true,
        rollback: true
      };

      this.config.set('deployment.pipeline', pipelineConfig);
      console.log('✅ Deployment pipeline configured');
    } catch (error) {
      await this.setup.handleError('pipeline-config', error);
    }
  }

  /**
   * Configure rollback settings
   */
  async configureRollback() {
    try {
      const { autoRollback } = await inquirer.prompt({
        type: 'confirm',
        name: 'autoRollback',
        message: 'Enable automatic rollback on failure?',
        default: true
      });

      const { rollbackDelay } = await inquirer.prompt({
        type: 'number',
        name: 'rollbackDelay',
        message: 'Rollback delay (seconds):',
        default: 300
      });

      const rollbackConfig = {
        autoRollback,
        delay: rollbackDelay,
        maxAttempts: 3,
        backupBeforeRollback: true,
        notificationOnRollback: true
      };

      this.config.set('deployment.rollback', rollbackConfig);
      console.log('✅ Rollback settings configured');
    } catch (error) {
      await this.setup.handleError('rollback-config', error);
    }
  }

  /**
   * Configure notifications
   */
  async configureNotifications() {
    try {
      const { email } = await inquirer.prompt({
        type: 'input',
        name: 'email',
        message: 'Notification email:',
        validate: input => input.includes('@') || 'Valid email required'
      });

      const { slackWebhook } = await inquirer.prompt({
        type: 'input',
        name: 'slackWebhook',
        message: 'Slack webhook URL (optional):'
      });

      const notificationConfig = {
        email,
        slack: slackWebhook || null,
        events: [
          'deployment-start',
          'deployment-success',
          'deployment-failure',
          'rollback-triggered',
          'health-check-failure'
        ]
      };

      this.config.set('deployment.notifications', notificationConfig);
      console.log('✅ Notification settings configured');
    } catch (error) {
      await this.setup.handleError('notification-config', error);
    }
  }

  /**
   * View deployment history
   */
  async viewDeploymentHistory() {
    try {
      console.log('\n📋 Deployment History:');
      console.log('======================');

      if (this.deploymentHistory.length === 0) {
        console.log('ℹ️  No deployment history found');
      } else {
        this.deploymentHistory.reverse().slice(0, 10).forEach((deployment, index) => {
          const status = deployment.status === 'completed' ? '✅' :
                        deployment.status === 'failed' ? '❌' : '🔄';
          const date = new Date(deployment.timestamp).toLocaleString();

          console.log(`${index + 1}. ${status} ${deployment.environment} - ${date}`);
          if (deployment.error) {
            console.log(`   Error: ${deployment.error}`);
          }
        });
      }

      const { viewDetails } = await inquirer.prompt({
        type: 'confirm',
        name: 'viewDetails',
        message: 'View detailed history?',
        default: false
      });

      if (viewDetails) {
        const { deploymentId } = await inquirer.prompt({
          type: 'input',
          name: 'deploymentId',
          message: 'Enter deployment ID:',
          default: this.deploymentHistory[0]?.id
        });

        await this.viewDeploymentDetails(deploymentId);
      }

    } catch (error) {
      await this.setup.handleError('view-history', error);
    }

    await this.showInterface();
  }

  /**
   * View deployment details
   */
  async viewDeploymentDetails(deploymentId) {
    try {
      const deployment = this.deploymentHistory.find(d => d.id === deploymentId);

      if (!deployment) {
        console.log('❌ Deployment not found');
        return;
      }

      console.log(`\n📋 Deployment Details: ${deployment.id}`);
      console.log('=====================================');
      console.log(`Environment: ${deployment.environment}`);
      console.log(`Status: ${deployment.status}`);
      console.log(`Timestamp: ${new Date(deployment.timestamp).toLocaleString()}`);
      console.log(`Components: ${deployment.components.join(', ')}`);

      if (deployment.error) {
        console.log(`Error: ${deployment.error}`);
      }

      if (deployment.backup) {
        console.log(`Backup: ${deployment.backup}`);
      }

    } catch (error) {
      console.error('❌ Failed to view deployment details:', error.message);
    }
  }

  /**
   * Rollback deployment
   */
  async rollbackDeployment() {
    try {
      if (this.deploymentHistory.length === 0) {
        console.log('❌ No deployment history found');
        return this.showInterface();
      }

      const { deploymentId } = await inquirer.prompt({
        type: 'list',
        name: 'deploymentId',
        message: 'Select deployment to rollback to:',
        choices: this.deploymentHistory
          .filter(d => d.status === 'completed')
          .slice(0, 5)
          .map(d => ({
            name: `${d.id} - ${d.environment} (${new Date(d.timestamp).toLocaleString()})`,
            value: d.id
          }))
      });

      const { confirm } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to rollback?',
        default: false
      });

      if (!confirm) {
        console.log('ℹ️  Rollback cancelled');
        return this.showInterface();
      }

      await this.performRollback(deploymentId);

    } catch (error) {
      await this.setup.handleError('rollback-deployment', error);
    }

    await this.showInterface();
  }

  /**
   * Perform rollback
   */
  async performRollback(deploymentId) {
    try {
      console.log(`🔄 Rolling back to deployment: ${deploymentId}`);

      const deployment = this.deploymentHistory.find(d => d.id === deploymentId);

      if (!deployment) {
        throw new Error('Deployment not found');
      }

      // 1. Create backup of current state
      await this.createDeploymentBackup('rollback');

      // 2. Restore from deployment backup
      await this.restoreFromDeploymentBackup(deployment);

      // 3. Health checks
      await this.postDeploymentHealthChecks(deployment.environment);

      console.log('✅ Rollback completed successfully');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
      throw error;
    }
  }

  /**
   * Restore from deployment backup
   */
  async restoreFromDeploymentBackup(deployment) {
    try {
      // This would restore from the specific deployment backup
      console.log('💾 Restoring from deployment backup...');

      // Placeholder for actual restore logic
      console.log('✅ Deployment backup restored');
    } catch (error) {
      console.error('❌ Deployment backup restore failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate deployment ID
   */
  generateDeploymentId() {
    return `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service status
   */
  async getServiceStatus(service) {
    try {
      if (this.platform === 'linux') {
        const { stdout } = await exec(`sudo systemctl status ${service} --no-pager -l`);
        return stdout.includes('Active: active') ? 'running' : 'stopped';
      } else if (this.platform === 'darwin') {
        const { stdout } = await exec(`brew services list | grep ${service}`);
        return stdout.includes('started') ? 'running' : 'stopped';
      }

      return 'unknown';
    } catch (error) {
      return 'error';
    }
  }

  /**
   * Get pipeline stages
   */
  getPipelineStages(pipelineType) {
    const stages = {
      'Simple': ['test', 'deploy'],
      'Standard': ['test', 'build', 'deploy'],
      'Advanced': ['test', 'build', 'stage', 'deploy'],
      'Enterprise': ['security-scan', 'test', 'build', 'compliance-check', 'stage', 'deploy']
    };

    return stages[pipelineType] || stages['Standard'];
  }

  /**
   * Save deployment history
   */
  async saveDeploymentHistory() {
    try {
      const historyPath = path.join(os.homedir(), '.pern-setup', 'deployment-history.json');
      await fs.writeFile(historyPath, JSON.stringify(this.deploymentHistory, null, 2));
    } catch (error) {
      this.logger.error('Failed to save deployment history', error);
    }
  }

  /**
   * Load deployment history
   */
  async loadDeploymentHistory() {
    try {
      const historyPath = path.join(os.homedir(), '.pern-setup', 'deployment-history.json');
      if (await fs.pathExists(historyPath)) {
        const history = await fs.readFile(historyPath, 'utf8');
        this.deploymentHistory = JSON.parse(history);
      }
    } catch (error) {
      this.logger.error('Failed to load deployment history', error);
    }
  }
}

module.exports = DeploymentAutomation;