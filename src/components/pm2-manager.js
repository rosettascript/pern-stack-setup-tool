/**
 * PERN Setup Tool - PM2 Manager
 * Handles PM2 process management, ecosystem configuration, and deployment
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

/**
 * PM2 Manager Class
 * Manages PM2 installation, configuration, and process management
 */
class PM2Manager {
  constructor(setupTool) {
    this.setup = setupTool;
    this.logger = setupTool.logger;
    this.safety = setupTool.safety;
    this.config = setupTool.config;
    this.platform = process.platform;
  }

  /**
   * Show PM2 interface
   */
  async showInterface() {
    try {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'PM2 Section',
          choices: [
            '1. Download PM2',
            '2. Setup PM2',
            '3. Manage Processes',
            '4. Go back'
          ]
        }
      ]);

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.download();
          break;
        case 2:
          await this.setupInterface();
          break;
        case 3:
          await this.manageProcesses();
          break;
        case 4:
          return this.setup.showMainInterface();
      }

    } catch (error) {
      await this.setup.handleError('pm2-interface', error);
    }
  }

  /**
   * Download PM2
   */
  async download() {
    try {
      await this.setup.safety.safeExecute('pm2-download', {}, async () => {
        if (this.platform === 'linux' || this.platform === 'darwin') {
          await exec('npm install -g pm2');
        } else if (this.platform === 'win32') {
          await exec('npm install -g pm2-windows-startup');
        }

        this.setup.state.completedComponents.add('pm2');
        console.log('✅ PM2 downloaded successfully');
      });

    } catch (error) {
      await this.setup.handleError('pm2-download', error);
    }

    await this.showInterface();
  }

  /**
   * Show setup interface
   */
  async setupInterface() {
    try {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Setup PM2 Interface',
          choices: [
            '1. Install PM2 globally',
            '2. Setup PM2 startup script',
            '3. Configure ecosystem file',
            '4. Go back'
          ]
        }
      ]);

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.installGlobally();
          break;
        case 2:
          await this.setupStartupScript();
          break;
        case 3:
          await this.configureEcosystem();
          break;
        case 4:
          return this.showInterface();
      }

    } catch (error) {
      await this.setup.handleError('pm2-setup-interface', error);
    }
  }

  /**
   * Install PM2 globally
   */
  async installGlobally() {
    try {
      await this.setup.safety.safeExecute('pm2-global-install', {}, async () => {
        if (this.platform === 'linux' || this.platform === 'darwin') {
          await exec('npm install -g pm2');
        } else if (this.platform === 'win32') {
          await exec('npm install -g pm2-windows-startup');
        }

        console.log('✅ PM2 installed globally');
      });
    } catch (error) {
      await this.setup.handleError('pm2-global-install', error);
    }

    await this.setupInterface();
  }

  /**
   * Setup PM2 startup script
   */
  async setupStartupScript() {
    try {
      await this.setup.safety.safeExecute('pm2-startup-setup', {}, async () => {
        if (this.platform === 'linux') {
          await exec('pm2 startup');
          console.log('✅ PM2 startup script configured for Linux');
        } else if (this.platform === 'darwin') {
          await exec('pm2 startup');
          console.log('✅ PM2 startup script configured for macOS');
        } else if (this.platform === 'win32') {
          await exec('pm2-startup install');
          console.log('✅ PM2 startup script configured for Windows');
        }
      });
    } catch (error) {
      await this.setup.handleError('pm2-startup-setup', error);
    }

    await this.setupInterface();
  }

  /**
   * Configure ecosystem file
   */
  async configureEcosystem() {
    try {
      const { environment } = await inquirer.prompt({
        type: 'list',
        name: 'environment',
        message: 'Configure for:',
        choices: [
          '1. Development environment',
          '2. Production environment',
          '3. Staging environment',
          '4. Custom configuration'
        ]
      });

      const selected = parseInt(environment.split('.')[0]);

      switch(selected) {
        case 1:
          await this.configureDevelopment();
          break;
        case 2:
          await this.configureProduction();
          break;
        case 3:
          await this.configureStaging();
          break;
        case 4:
          await this.configureCustom();
          break;
      }

    } catch (error) {
      await this.setup.handleError('pm2-ecosystem-config', error);
    }

    await this.setupInterface();
  }

  /**
   * Configure development environment
   */
  async configureDevelopment() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

      const ecosystemConfig = {
        apps: [{
          name: this.config.get('project.name', 'pern-app'),
          script: 'server/src/index.js',
          instances: 1,
          autorestart: true,
          watch: true,
          ignore_watch: ['node_modules', 'client', 'logs'],
          max_memory_restart: '1G',
          env: {
            NODE_ENV: 'development',
            PORT: 5000,
            DEBUG: 'true'
          },
          env_production: {
            NODE_ENV: 'production',
            PORT: 5000
          },
          log_file: path.join(projectPath, 'logs', 'combined.log'),
          out_file: path.join(projectPath, 'logs', 'out.log'),
          error_file: path.join(projectPath, 'logs', 'error.log'),
          time: true
        }]
      };

      const ecosystemPath = path.join(projectPath, 'ecosystem.config.js');
      await fs.writeFile(ecosystemPath, `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)};`);

      this.config.set('pm2.ecosystem', ecosystemConfig);
      console.log('✅ PM2 development ecosystem configured');
    } catch (error) {
      await this.setup.handleError('pm2-dev-config', error);
    }
  }

  /**
   * Configure production environment
   */
  async configureProduction() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

      const ecosystemConfig = {
        apps: [{
          name: this.config.get('project.name', 'pern-app'),
          script: 'server/src/index.js',
          instances: 'max',
          exec_mode: 'cluster',
          autorestart: true,
          watch: false,
          max_memory_restart: '2G',
          env: {
            NODE_ENV: 'production',
            PORT: 5000
          },
          log_file: '/var/log/pm2/pern-app.log',
          out_file: '/var/log/pm2/pern-app-out.log',
          error_file: '/var/log/pm2/pern-app-error.log',
          time: true,
          merge_logs: true,
          log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
        }]
      };

      const ecosystemPath = path.join(projectPath, 'ecosystem.config.js');
      await fs.writeFile(ecosystemPath, `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)};`);

      this.config.set('pm2.ecosystem', ecosystemConfig);
      console.log('✅ PM2 production ecosystem configured');
    } catch (error) {
      await this.setup.handleError('pm2-prod-config', error);
    }
  }

  /**
   * Configure staging environment
   */
  async configureStaging() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());

      const ecosystemConfig = {
        apps: [{
          name: this.config.get('project.name', 'pern-app'),
          script: 'server/src/index.js',
          instances: 2,
          autorestart: true,
          watch: false,
          max_memory_restart: '1G',
          env: {
            NODE_ENV: 'staging',
            PORT: 5000
          },
          log_file: path.join(projectPath, 'logs', 'staging.log'),
          out_file: path.join(projectPath, 'logs', 'staging-out.log'),
          error_file: path.join(projectPath, 'logs', 'staging-error.log'),
          time: true
        }]
      };

      const ecosystemPath = path.join(projectPath, 'ecosystem.config.js');
      await fs.writeFile(ecosystemPath, `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)};`);

      this.config.set('pm2.ecosystem', ecosystemConfig);
      console.log('✅ PM2 staging ecosystem configured');
    } catch (error) {
      await this.setup.handleError('pm2-staging-config', error);
    }
  }

  /**
   * Configure custom ecosystem
   */
  async configureCustom() {
    try {
      const { appName } = await inquirer.prompt({
        type: 'input',
        name: 'appName',
        message: 'Enter app name:',
        default: this.config.get('project.name', 'pern-app')
      });

      const { scriptPath } = await inquirer.prompt({
        type: 'input',
        name: 'scriptPath',
        message: 'Enter script path:',
        default: 'server/src/index.js'
      });

      const { instances } = await inquirer.prompt({
        type: 'number',
        name: 'instances',
        message: 'Number of instances:',
        default: 1
      });

      const { watchMode } = await inquirer.prompt({
        type: 'confirm',
        name: 'watchMode',
        message: 'Enable watch mode?',
        default: false
      });

      const { maxMemory } = await inquirer.prompt({
        type: 'input',
        name: 'maxMemory',
        message: 'Max memory before restart (MB):',
        default: '1024'
      });

      const ecosystemConfig = {
        apps: [{
          name: appName,
          script: scriptPath,
          instances: instances,
          autorestart: true,
          watch: watchMode,
          max_memory_restart: `${maxMemory}M`,
          env: {
            NODE_ENV: 'development',
            PORT: 5000
          }
        }]
      };

      const projectPath = this.config.get('project.location', process.cwd());
      const ecosystemPath = path.join(projectPath, 'ecosystem.config.js');
      await fs.writeFile(ecosystemPath, `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)};`);

      this.config.set('pm2.ecosystem', ecosystemConfig);
      console.log('✅ PM2 custom ecosystem configured');
    } catch (error) {
      await this.setup.handleError('pm2-custom-config', error);
    }
  }

  /**
   * Manage PM2 processes
   */
  async manageProcesses() {
    try {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'PM2 Process Management',
          choices: [
            '1. Start new process',
            '2. List all processes',
            '3. Stop process',
            '4. Restart process',
            '5. Delete process',
            '6. Monitor processes',
            '7. Go back'
          ]
        }
      ]);

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.startNewProcess();
          break;
        case 2:
          await this.listProcesses();
          break;
        case 3:
          await this.stopProcess();
          break;
        case 4:
          await this.restartProcess();
          break;
        case 5:
          await this.deleteProcess();
          break;
        case 6:
          await this.monitorProcesses();
          break;
        case 7:
          return this.showInterface();
      }

    } catch (error) {
      await this.setup.handleError('pm2-process-management', error);
    }
  }

  /**
   * Start new process
   */
  async startNewProcess() {
    try {
      const { scriptPath } = await inquirer.prompt({
        type: 'input',
        name: 'scriptPath',
        message: 'Enter script path:',
        default: 'server/src/index.js'
      });

      const { processName } = await inquirer.prompt({
        type: 'input',
        name: 'processName',
        message: 'Enter process name:',
        default: this.config.get('project.name', 'pern-app')
      });

      await this.setup.safety.safeExecute('pm2-start-process', {
        scriptPath,
        processName
      }, async () => {
        await exec(`pm2 start ${scriptPath} --name ${processName}`);
        console.log(`✅ Process started: ${processName}`);
      });
    } catch (error) {
      await this.setup.handleError('pm2-start-process', error);
    }

    await this.manageProcesses();
  }

  /**
   * List all processes
   */
  async listProcesses() {
    try {
      await this.setup.safety.safeExecute('pm2-list-processes', {}, async () => {
        const { stdout } = await exec('pm2 list');
        console.log('\n📋 PM2 Process List:');
        console.log(stdout);
      });
    } catch (error) {
      await this.setup.handleError('pm2-list-processes', error);
    }

    await this.manageProcesses();
  }

  /**
   * Stop process
   */
  async stopProcess() {
    try {
      const { processName } = await inquirer.prompt({
        type: 'input',
        name: 'processName',
        message: 'Enter process name or ID to stop:',
        default: 'all'
      });

      await this.setup.safety.safeExecute('pm2-stop-process', {
        processName
      }, async () => {
        if (processName === 'all') {
          await exec('pm2 stop all');
          console.log('✅ All processes stopped');
        } else {
          await exec(`pm2 stop ${processName}`);
          console.log(`✅ Process stopped: ${processName}`);
        }
      });
    } catch (error) {
      await this.setup.handleError('pm2-stop-process', error);
    }

    await this.manageProcesses();
  }

  /**
   * Restart process
   */
  async restartProcess() {
    try {
      const { processName } = await inquirer.prompt({
        type: 'input',
        name: 'processName',
        message: 'Enter process name or ID to restart:',
        default: 'all'
      });

      await this.setup.safety.safeExecute('pm2-restart-process', {
        processName
      }, async () => {
        if (processName === 'all') {
          await exec('pm2 restart all');
          console.log('✅ All processes restarted');
        } else {
          await exec(`pm2 restart ${processName}`);
          console.log(`✅ Process restarted: ${processName}`);
        }
      });
    } catch (error) {
      await this.setup.handleError('pm2-restart-process', error);
    }

    await this.manageProcesses();
  }

  /**
   * Delete process
   */
  async deleteProcess() {
    try {
      const { processName } = await inquirer.prompt({
        type: 'input',
        name: 'processName',
        message: 'Enter process name or ID to delete:',
        default: 'all'
      });

      await this.setup.safety.safeExecute('pm2-delete-process', {
        processName
      }, async () => {
        if (processName === 'all') {
          await exec('pm2 delete all');
          console.log('✅ All processes deleted');
        } else {
          await exec(`pm2 delete ${processName}`);
          console.log(`✅ Process deleted: ${processName}`);
        }
      });
    } catch (error) {
      await this.setup.handleError('pm2-delete-process', error);
    }

    await this.manageProcesses();
  }

  /**
   * Monitor processes
   */
  async monitorProcesses() {
    try {
      await this.setup.safety.safeExecute('pm2-monitor-processes', {}, async () => {
        console.log('🔍 Monitoring PM2 processes...');
        console.log('Press Ctrl+C to stop monitoring');

        const { exec } = require('child-process-promise');
        const monitorProcess = exec('pm2 monit');

        // Handle graceful exit
        process.on('SIGINT', () => {
          monitorProcess.childProcess.kill('SIGINT');
          console.log('\n✅ Monitoring stopped');
        });

        await monitorProcess;
      });
    } catch (error) {
      await this.setup.handleError('pm2-monitor-processes', error);
    }

    await this.manageProcesses();
  }

  /**
   * Start PM2 service
   */
  async start() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());
      const ecosystemPath = path.join(projectPath, 'ecosystem.config.js');

      if (await fs.pathExists(ecosystemPath)) {
        await exec(`pm2 start ${ecosystemPath}`);
        console.log('✅ PM2 processes started');
      } else {
        console.log('⚠️  No ecosystem file found, starting with default configuration');
        await exec('pm2 start server/src/index.js --name pern-app');
      }
    } catch (error) {
      console.error('❌ Failed to start PM2:', error.message);
      throw error;
    }
  }

  /**
   * Stop PM2 service
   */
  async stop() {
    try {
      await exec('pm2 stop all');
      console.log('✅ PM2 processes stopped');
    } catch (error) {
      console.error('❌ Failed to stop PM2:', error.message);
      throw error;
    }
  }

  /**
   * Check PM2 status
   */
  async getStatus() {
    try {
      const { stdout } = await exec('pm2 jlist');
      const processes = JSON.parse(stdout);

      return {
        running: processes.length > 0,
        processes: processes.length,
        details: processes.map(p => ({
          name: p.name,
          id: p.pm_id,
          status: p.pm2_env.status,
          memory: p.monit.memory,
          cpu: p.monit.cpu,
          uptime: p.pm2_env.created_at
        }))
      };
    } catch (error) {
      return { running: false, processes: 0, error: error.message };
    }
  }

  /**
   * Test PM2 installation
   */
  async testInstallation() {
    try {
      const { stdout: version } = await exec('pm2 --version');
      const { stdout: status } = await exec('pm2 status');

      return {
        success: true,
        version: version.trim(),
        status: status.includes('online') ? 'running' : 'stopped'
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Create PM2 ecosystem file
   */
  async createEcosystemFile(config) {
    try {
      const projectPath = this.config.get('project.location', process.cwd());
      const ecosystemPath = path.join(projectPath, 'ecosystem.config.js');

      await fs.writeFile(ecosystemPath, `module.exports = ${JSON.stringify(config, null, 2)};`);

      console.log(`✅ PM2 ecosystem file created: ${ecosystemPath}`);
      return ecosystemPath;
    } catch (error) {
      console.error('❌ PM2 ecosystem file creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get PM2 logs
   */
  async getLogs(processName = 'all', lines = 100) {
    try {
      let command;
      if (processName === 'all') {
        command = `pm2 logs --lines ${lines}`;
      } else {
        command = `pm2 logs ${processName} --lines ${lines}`;
      }

      const { stdout } = await exec(command);
      return stdout;
    } catch (error) {
      console.error('❌ Failed to get PM2 logs:', error.message);
      throw error;
    }
  }

  /**
   * Reload PM2 configuration
   */
  async reload() {
    try {
      const projectPath = this.config.get('project.location', process.cwd());
      const ecosystemPath = path.join(projectPath, 'ecosystem.config.js');

      if (await fs.pathExists(ecosystemPath)) {
        await exec(`pm2 reload ${ecosystemPath}`);
        console.log('✅ PM2 configuration reloaded');
      } else {
        console.log('⚠️  No ecosystem file found');
      }
    } catch (error) {
      console.error('❌ Failed to reload PM2:', error.message);
      throw error;
    }
  }

  /**
   * Save PM2 configuration
   */
  async save() {
    try {
      await exec('pm2 save');
      console.log('✅ PM2 configuration saved');
    } catch (error) {
      console.error('❌ Failed to save PM2 configuration:', error.message);
      throw error;
    }
  }
}

module.exports = PM2Manager;