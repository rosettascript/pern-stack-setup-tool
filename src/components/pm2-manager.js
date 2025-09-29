/**
 * PERN Setup Tool - PM2 Manager
 * Handles PM2 process management, ecosystem configuration, and deployment
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const ProjectDiscovery = require('../utils/project-discovery');

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
    this.projectDiscovery = new ProjectDiscovery();
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
          loop: false,
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
      await this.setup.safety.safeExecute('pm2-download', {
        version: '5.3.0',
        platform: this.platform
      }, async () => {
        console.log('🔧 Installing PM2...');
        console.log('📝 This may take a few minutes depending on your internet connection');
        console.log('📝 You may be prompted for sudo password to install PM2 globally');
        
        if (this.platform === 'linux' || this.platform === 'darwin') {
          console.log('🐧 Installing PM2 on Linux/macOS...');
          
          const ora = require('ora');
          const pm2Spinner = ora('📦 Installing PM2 globally using npm...').start();
          console.log('⏳ This may take 2-5 minutes...');
          await exec('sudo npm install -g pm2');
          pm2Spinner.succeed('✅ PM2 installation completed');
        } else if (this.platform === 'win32') {
          console.log('🪟 Installing PM2 on Windows...');
          
          const ora = require('ora');
          const pm2Spinner = ora('📦 Installing PM2 for Windows...').start();
          console.log('⏳ This may take 1-3 minutes...');
          await exec('npm install -g pm2-windows-startup');
          pm2Spinner.succeed('✅ PM2 installation completed');
        }

        this.setup.state.completedComponents.add('pm2');
        console.log('✅ PM2 downloaded successfully');
        
        return {
          success: true,
          version: '5.3.0',
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
      });

    } catch (error) {
      await this.setup.handleError('pm2-download', error);
    }
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
          loop: false,
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
      await this.setup.safety.safeExecute('pm2-global-install', {
        platform: this.platform
      }, async () => {
        console.log('🔧 Installing PM2 globally...');
        console.log('📝 This may take a few minutes depending on your internet connection');
        console.log('📝 You may be prompted for sudo password to install PM2 globally');
        
        if (this.platform === 'linux' || this.platform === 'darwin') {
          console.log('🐧 Installing PM2 on Linux/macOS...');
          
          const ora = require('ora');
          const pm2Spinner = ora('📦 Installing PM2 globally using npm...').start();
          console.log('⏳ This may take 2-5 minutes...');
          await exec('sudo npm install -g pm2');
          pm2Spinner.succeed('✅ PM2 installation completed');
        } else if (this.platform === 'win32') {
          console.log('🪟 Installing PM2 on Windows...');
          
          const ora = require('ora');
          const pm2Spinner = ora('📦 Installing PM2 for Windows...').start();
          console.log('⏳ This may take 1-3 minutes...');
          await exec('npm install -g pm2-windows-startup');
          pm2Spinner.succeed('✅ PM2 installation completed');
        }

        console.log('✅ PM2 installed globally');
        
        return {
          success: true,
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
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
      await this.setup.safety.safeExecute('pm2-startup-setup', {
        platform: this.platform
      }, async () => {
        console.log('🔧 Setting up PM2 startup script...');
        console.log('📝 This will configure PM2 to start automatically on system boot');
        
        // Check if PM2 is installed first
        try {
          await exec('pm2 --version');
          console.log('✅ PM2 is installed and available');
        } catch (error) {
          console.log('❌ PM2 is not installed or not available in PATH');
          console.log('💡 Please install PM2 first using the download option');
          throw new Error('PM2 is not installed. Please install PM2 first.');
        }
        
        if (this.platform === 'linux') {
          console.log('🐧 Configuring PM2 startup for Linux...');
          try {
            // Try different PM2 startup approaches
            console.log('🔄 Attempting PM2 startup configuration...');
            await exec('pm2 startup');
            console.log('✅ PM2 startup script configured for Linux');
          } catch (error) {
            console.log('⚠️  PM2 startup configuration failed');
            console.log('💡 This is common and can be configured manually later');
            console.log('📝 To configure PM2 startup manually, run:');
            console.log('   1. pm2 startup');
            console.log('   2. Follow the instructions shown');
            console.log('   3. pm2 save');
            console.log('   4. pm2 unstartup (to remove if needed)');
            console.log('💡 PM2 startup is optional - your processes will still work without it');
            
            // Don't throw error, just warn and continue
            console.log('✅ PM2 startup setup completed (manual configuration required)');
          }
        } else if (this.platform === 'darwin') {
          console.log('🍎 Configuring PM2 startup for macOS...');
          try {
            console.log('🔄 Attempting PM2 startup configuration...');
            await exec('pm2 startup');
            console.log('✅ PM2 startup script configured for macOS');
          } catch (error) {
            console.log('⚠️  PM2 startup configuration failed');
            console.log('💡 This is common and can be configured manually later');
            console.log('📝 To configure PM2 startup manually, run:');
            console.log('   1. pm2 startup');
            console.log('   2. Follow the instructions shown');
            console.log('   3. pm2 save');
            console.log('💡 PM2 startup is optional - your processes will still work without it');
            console.log('✅ PM2 startup setup completed (manual configuration required)');
          }
        } else if (this.platform === 'win32') {
          console.log('🪟 Configuring PM2 startup for Windows...');
          try {
            console.log('🔄 Attempting PM2 startup configuration...');
            await exec('pm2-startup install');
            console.log('✅ PM2 startup script configured for Windows');
          } catch (error) {
            console.log('⚠️  PM2 startup configuration failed');
            console.log('💡 This is common and can be configured manually later');
            console.log('📝 To configure PM2 startup manually, run:');
            console.log('   1. pm2-startup install');
            console.log('   2. Follow the instructions shown');
            console.log('   3. pm2 save');
            console.log('💡 PM2 startup is optional - your processes will still work without it');
            console.log('✅ PM2 startup setup completed (manual configuration required)');
          }
        }
        
        return {
          success: true,
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
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
      // Let user select project for PM2 configuration
      let projectDir;
      try {
        projectDir = await this.projectDiscovery.selectProject('Select project for PM2 configuration:');
        
        if (projectDir === 'GO_BACK') {
          return this.showInterface();
        }
        
        console.log(`📁 Selected project: ${projectDir}`);
      } catch (error) {
        if (error.message === 'User chose to go back') {
          return this.setupInterface();
        }
        throw error;
      }

      const { environment } = await inquirer.prompt({
        type: 'list',
        name: 'environment',
        message: 'Configure for:',
        loop: false,
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
          await this.configureDevelopment(projectDir);
          break;
        case 2:
          await this.configureProduction(projectDir);
          break;
        case 3:
          await this.configureStaging(projectDir);
          break;
        case 4:
          await this.configureCustom(projectDir);
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
  async configureDevelopment(projectDir) {
    try {
      const projectPath = projectDir;

      // Try to detect the main script file
      const commonPaths = [
        'server/src/index.js',
        'src/index.js',
        'index.js',
        'app.js',
        'server.js',
        'bin/www',
        'dist/index.js',
        'build/index.js'
      ];
      
      let detectedScript = 'server/src/index.js';
      for (const scriptPath of commonPaths) {
        const fullPath = path.join(projectPath, scriptPath);
        if (fs.existsSync(fullPath)) {
          detectedScript = scriptPath;
          break;
        }
      }

      const ecosystemConfig = {
        apps: [{
          name: this.config.get('project.name', 'pern-app'),
          script: detectedScript,
          instances: 1,
          autorestart: true,
          watch: true,
          ignore_watch: ['node_modules', 'client', 'logs', 'dist', 'build'],
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
      this.config.set('pm2.projectDir', projectPath);
      this.setup.state.completedComponents.add('pm2');
      console.log(`✅ PM2 development ecosystem configured for project: ${path.basename(projectPath)}`);
    } catch (error) {
      await this.setup.handleError('pm2-dev-config', error);
    }
  }

  /**
   * Configure production environment
   */
  async configureProduction(projectDir) {
    try {
      const projectPath = projectDir;

      // Try to detect the main script file
      const commonPaths = [
        'server/src/index.js',
        'src/index.js',
        'index.js',
        'app.js',
        'server.js',
        'bin/www',
        'dist/index.js',
        'build/index.js'
      ];
      
      let detectedScript = 'server/src/index.js';
      for (const scriptPath of commonPaths) {
        const fullPath = path.join(projectPath, scriptPath);
        if (fs.existsSync(fullPath)) {
          detectedScript = scriptPath;
          break;
        }
      }

      const ecosystemConfig = {
        apps: [{
          name: this.config.get('project.name', 'pern-app'),
          script: detectedScript,
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
      this.config.set('pm2.projectDir', projectPath);
      this.setup.state.completedComponents.add('pm2');
      console.log(`✅ PM2 production ecosystem configured for project: ${path.basename(projectPath)}`);
    } catch (error) {
      await this.setup.handleError('pm2-prod-config', error);
    }
  }

  /**
   * Configure staging environment
   */
  async configureStaging(projectDir) {
    try {
      const projectPath = projectDir;

      // Try to detect the main script file
      const commonPaths = [
        'server/src/index.js',
        'src/index.js',
        'index.js',
        'app.js',
        'server.js',
        'bin/www',
        'dist/index.js',
        'build/index.js'
      ];
      
      let detectedScript = 'server/src/index.js';
      for (const scriptPath of commonPaths) {
        const fullPath = path.join(projectPath, scriptPath);
        if (fs.existsSync(fullPath)) {
          detectedScript = scriptPath;
          break;
        }
      }

      const ecosystemConfig = {
        apps: [{
          name: this.config.get('project.name', 'pern-app'),
          script: detectedScript,
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
      this.config.set('pm2.projectDir', projectPath);
      this.setup.state.completedComponents.add('pm2');
      console.log(`✅ PM2 staging ecosystem configured for project: ${path.basename(projectPath)}`);
    } catch (error) {
      await this.setup.handleError('pm2-staging-config', error);
    }
  }

  /**
   * Configure custom ecosystem
   */
  async configureCustom(projectDir) {
    try {
      const { appName } = await inquirer.prompt({
        type: 'input',
        name: 'appName',
        message: 'Enter app name:',
        default: path.basename(projectDir)
      });

      // Try to detect common script paths
      const projectPath = projectDir;
      const commonPaths = [
        'server/src/index.js',
        'src/index.js',
        'index.js',
        'app.js',
        'server.js',
        'bin/www',
        'dist/index.js',
        'build/index.js'
      ];
      
      let detectedPath = null;
      for (const scriptPath of commonPaths) {
        const fullPath = path.join(projectPath, scriptPath);
        if (fs.existsSync(fullPath)) {
          detectedPath = scriptPath;
          break;
        }
      }

      const { scriptPath } = await inquirer.prompt({
        type: 'input',
        name: 'scriptPath',
        message: 'Enter script path (relative to project root):',
        default: detectedPath || 'server/src/index.js',
        validate: (input) => {
          if (!input.trim()) {
            return 'Script path is required';
          }
          const fullPath = path.join(projectPath, input);
          if (!fs.existsSync(fullPath)) {
            return `Script file not found: ${fullPath}\n💡 Make sure the file exists or use an absolute path`;
          }
          return true;
        }
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

      const ecosystemPath = path.join(projectPath, 'ecosystem.config.js');
      await fs.writeFile(ecosystemPath, `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)};`);

      this.config.set('pm2.ecosystem', ecosystemConfig);
      this.config.set('pm2.projectDir', projectPath);
      this.setup.state.completedComponents.add('pm2');
      console.log(`✅ PM2 custom ecosystem configured for project: ${path.basename(projectPath)}`);
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
          loop: false,
        choices: [
            '1. Start project process',
            '2. List all processes',
            '3. Stop project process',
            '4. Restart project process',
            '5. Delete project process',
            '6. Monitor processes',
            '7. Go back'
          ]
        }
      ]);

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.startProjectProcess();
          break;
        case 2:
          await this.listProcesses();
          break;
        case 3:
          await this.stopProjectProcess();
          break;
        case 4:
          await this.restartProjectProcess();
          break;
        case 5:
          await this.deleteProjectProcess();
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
   * Start project process
   */
  async startProjectProcess() {
    try {
      // Let user select project for PM2 process management
      const projectDir = await this.projectDiscovery.selectProject('Select project to start PM2 process:');
      
      if (projectDir === 'GO_BACK') {
        return this.manageProcesses();
      }
      
      console.log(`📁 Selected project: ${projectDir}`);

      const ecosystemPath = path.join(projectDir, 'ecosystem.config.js');

      if (await fs.pathExists(ecosystemPath)) {
        console.log('🚀 Starting PM2 process for project...');
        await exec(`pm2 start ${ecosystemPath}`);
        console.log(`✅ PM2 process started for project: ${path.basename(projectDir)}`);
      } else {
        console.log('⚠️  No ecosystem file found in project directory');
        console.log('💡 Please configure PM2 ecosystem file first');
      }
    } catch (error) {
      await this.setup.handleError('pm2-start-project-process', error);
    }

    await this.manageProcesses();
  }

  /**
   * Stop project process
   */
  async stopProjectProcess() {
    try {
      // Let user select project for PM2 process management
      const projectDir = await this.projectDiscovery.selectProject('Select project to stop PM2 process:');
      
      if (projectDir === 'GO_BACK') {
        return this.manageProcesses();
      }
      
      console.log(`📁 Selected project: ${projectDir}`);

      const ecosystemPath = path.join(projectDir, 'ecosystem.config.js');

      if (await fs.pathExists(ecosystemPath)) {
        console.log('🛑 Stopping PM2 process for project...');
        await exec(`pm2 stop ${ecosystemPath}`);
        console.log(`✅ PM2 process stopped for project: ${path.basename(projectDir)}`);
      } else {
        console.log('⚠️  No ecosystem file found in project directory');
        console.log('💡 Please configure PM2 ecosystem file first');
      }
    } catch (error) {
      await this.setup.handleError('pm2-stop-project-process', error);
    }

    await this.manageProcesses();
  }

  /**
   * Restart project process
   */
  async restartProjectProcess() {
    try {
      // Let user select project for PM2 process management
      const projectDir = await this.projectDiscovery.selectProject('Select project to restart PM2 process:');
      
      if (projectDir === 'GO_BACK') {
        return this.manageProcesses();
      }
      
      console.log(`📁 Selected project: ${projectDir}`);

      const ecosystemPath = path.join(projectDir, 'ecosystem.config.js');

      if (await fs.pathExists(ecosystemPath)) {
        console.log('🔄 Restarting PM2 process for project...');
        await exec(`pm2 restart ${ecosystemPath}`);
        console.log(`✅ PM2 process restarted for project: ${path.basename(projectDir)}`);
      } else {
        console.log('⚠️  No ecosystem file found in project directory');
        console.log('💡 Please configure PM2 ecosystem file first');
      }
    } catch (error) {
      await this.setup.handleError('pm2-restart-project-process', error);
    }

    await this.manageProcesses();
  }

  /**
   * Delete project process
   */
  async deleteProjectProcess() {
    try {
      // Let user select project for PM2 process management
      const projectDir = await this.projectDiscovery.selectProject('Select project to delete PM2 process:');
      
      if (projectDir === 'GO_BACK') {
        return this.manageProcesses();
      }
      
      console.log(`📁 Selected project: ${projectDir}`);

      const ecosystemPath = path.join(projectDir, 'ecosystem.config.js');

      if (await fs.pathExists(ecosystemPath)) {
        console.log('🗑️  Deleting PM2 process for project...');
        await exec(`pm2 delete ${ecosystemPath}`);
        console.log(`✅ PM2 process deleted for project: ${path.basename(projectDir)}`);
      } else {
        console.log('⚠️  No ecosystem file found in project directory');
        console.log('💡 Please configure PM2 ecosystem file first');
      }
    } catch (error) {
      await this.setup.handleError('pm2-delete-project-process', error);
    }

    await this.manageProcesses();
  }

  /**
   * Start new process
   */
  async startNewProcess() {
    try {
      console.log('🚀 Starting new PM2 process...');
      console.log('📝 This will help you start a Node.js application with PM2');
      
      // Get current project information
      const projectName = this.config.get('project.name', 'pern-app');
      const projectPath = this.config.get('project.location', process.cwd());
      
      // Try to detect common script paths
      const commonPaths = [
        'server/src/index.js',
        'src/index.js',
        'index.js',
        'app.js',
        'server.js',
        'bin/www',
        'dist/index.js',
        'build/index.js'
      ];
      
      let detectedPath = null;
      for (const scriptPath of commonPaths) {
        const fullPath = path.join(projectPath, scriptPath);
        if (fs.existsSync(fullPath)) {
          detectedPath = scriptPath;
          break;
        }
      }
      
      const { scriptPath } = await inquirer.prompt({
        type: 'input',
        name: 'scriptPath',
        message: 'Enter script path (relative to project root):',
        default: detectedPath || 'server/src/index.js',
        validate: (input) => {
          if (!input.trim()) {
            return 'Script path is required';
          }
          const fullPath = path.join(projectPath, input);
          if (!fs.existsSync(fullPath)) {
            return `Script file not found: ${fullPath}\n💡 Make sure the file exists or use an absolute path`;
          }
          return true;
        }
      });

      const { processName } = await inquirer.prompt({
        type: 'input',
        name: 'processName',
        message: 'Enter process name:',
        default: projectName,
        validate: (input) => {
          if (!input.trim()) {
            return 'Process name is required';
          }
          return true;
        }
      });

      const { instances } = await inquirer.prompt({
        type: 'input',
        name: 'instances',
        message: 'Number of instances (or "max" for cluster mode):',
        default: '1',
        validate: (input) => {
          if (input === 'max' || input === '1' || !isNaN(parseInt(input))) {
            return true;
          }
          return 'Enter a number or "max" for cluster mode';
        }
      });

      await this.setup.safety.safeExecute('pm2-start-process', {
        scriptPath,
        processName,
        instances
      }, async () => {
        console.log('🔧 Starting PM2 process...');
        console.log(`📁 Script: ${scriptPath}`);
        console.log(`🏷️  Name: ${processName}`);
        console.log(`🔢 Instances: ${instances}`);
        
        const command = instances === 'max' 
          ? `pm2 start ${scriptPath} --name ${processName} -i max`
          : `pm2 start ${scriptPath} --name ${processName} -i ${instances}`;
          
        await exec(command);
        console.log(`✅ Process started: ${processName}`);
        console.log('💡 Use "List processes" to see running processes');
        console.log('💡 Use "Monitor processes" to watch real-time status');
        
        return {
          success: true,
          scriptPath,
          processName,
          instances,
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
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
      await this.setup.safety.safeExecute('pm2-list-processes', {
        platform: this.platform
      }, async () => {
        const { stdout } = await exec('pm2 list');
        console.log('\n📋 PM2 Process List:');
        console.log(stdout);
        
        return {
          success: true,
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
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
        console.log('🔧 Stopping PM2 process...');
        
        // Check if any processes are running first
        try {
          const { stdout } = await exec('pm2 list --no-color');
          if (stdout.includes('No process found') || stdout.trim() === '') {
            console.log('⚠️  No PM2 processes are currently running');
            console.log('💡 You need to start processes first using "Start process" option');
            console.log('✅ PM2 stop operation completed (no processes to stop)');
            return {
              success: true,
              message: 'No processes to stop',
              platform: this.platform,
              timestamp: new Date().toISOString()
            };
          }
        } catch (error) {
          console.log('⚠️  Could not check PM2 process list');
        }
        
        if (processName === 'all') {
          try {
            await exec('pm2 stop all');
            console.log('✅ All processes stopped');
          } catch (error) {
            if (error.message.includes('No process found')) {
              console.log('⚠️  No PM2 processes are currently running');
              console.log('💡 You need to start processes first using "Start process" option');
              console.log('✅ PM2 stop operation completed (no processes to stop)');
            } else {
              throw error;
            }
          }
        } else {
          try {
            await exec(`pm2 stop ${processName}`);
            console.log(`✅ Process stopped: ${processName}`);
          } catch (error) {
            if (error.message.includes('No process found')) {
              console.log(`⚠️  Process "${processName}" not found`);
              console.log('💡 Use "List processes" to see available processes');
              console.log('💡 Or start a new process using "Start process" option');
              console.log('✅ PM2 stop operation completed (process not found)');
            } else {
              throw error;
            }
          }
        }
        
        return {
          success: true,
          processName,
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
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
        console.log('🔧 Restarting PM2 process...');
        
        // Check if any processes are running first
        try {
          const { stdout } = await exec('pm2 list --no-color');
          if (stdout.includes('No process found') || stdout.trim() === '') {
            console.log('⚠️  No PM2 processes are currently running');
            console.log('💡 You need to start processes first using "Start process" option');
            console.log('💡 Or create an ecosystem.config.js file and run: pm2 start ecosystem.config.js');
            console.log('✅ PM2 restart operation completed (no processes to restart)');
            return {
              success: true,
              message: 'No processes to restart',
              platform: this.platform,
              timestamp: new Date().toISOString()
            };
          }
        } catch (error) {
          console.log('⚠️  Could not check PM2 process list');
        }
        
        if (processName === 'all') {
          try {
            await exec('pm2 restart all');
            console.log('✅ All processes restarted');
          } catch (error) {
            if (error.message.includes('No process found')) {
              console.log('⚠️  No PM2 processes are currently running');
              console.log('💡 You need to start processes first using "Start process" option');
              console.log('💡 Or create an ecosystem.config.js file and run: pm2 start ecosystem.config.js');
              console.log('✅ PM2 restart operation completed (no processes to restart)');
            } else {
              throw error;
            }
          }
        } else {
          try {
            await exec(`pm2 restart ${processName}`);
            console.log(`✅ Process restarted: ${processName}`);
          } catch (error) {
            if (error.message.includes('No process found')) {
              console.log(`⚠️  Process "${processName}" not found`);
              console.log('💡 Use "List processes" to see available processes');
              console.log('💡 Or start a new process using "Start process" option');
              console.log('✅ PM2 restart operation completed (process not found)');
            } else {
              throw error;
            }
          }
        }
        
        return {
          success: true,
          processName,
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
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
        console.log('🔧 Deleting PM2 process...');
        
        // Check if any processes are running first
        try {
          const { stdout } = await exec('pm2 list --no-color');
          if (stdout.includes('No process found') || stdout.trim() === '') {
            console.log('⚠️  No PM2 processes are currently running');
            console.log('💡 You need to start processes first using "Start process" option');
            console.log('✅ PM2 delete operation completed (no processes to delete)');
            return {
              success: true,
              message: 'No processes to delete',
              platform: this.platform,
              timestamp: new Date().toISOString()
            };
          }
        } catch (error) {
          console.log('⚠️  Could not check PM2 process list');
        }
        
        if (processName === 'all') {
          try {
            await exec('pm2 delete all');
            console.log('✅ All processes deleted');
          } catch (error) {
            if (error.message.includes('No process found')) {
              console.log('⚠️  No PM2 processes are currently running');
              console.log('💡 You need to start processes first using "Start process" option');
              console.log('✅ PM2 delete operation completed (no processes to delete)');
            } else {
              throw error;
            }
          }
        } else {
          try {
            await exec(`pm2 delete ${processName}`);
            console.log(`✅ Process deleted: ${processName}`);
          } catch (error) {
            if (error.message.includes('No process found')) {
              console.log(`⚠️  Process "${processName}" not found`);
              console.log('💡 Use "List processes" to see available processes');
              console.log('💡 Or start a new process using "Start process" option');
              console.log('✅ PM2 delete operation completed (process not found)');
            } else {
              throw error;
            }
          }
        }
        
        return {
          success: true,
          processName,
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
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
      // Ask user for monitoring options
      const { monitorChoice } = await inquirer.prompt({
        type: 'list',
        name: 'monitorChoice',
        message: 'Select monitoring option:',
        loop: false,
        choices: [
          '1. Start PM2 monitoring (pm2 monit)',
          '2. Show PM2 status list',
          '3. Show PM2 logs (live)',
          '4. Go Back'
        ]
      });

      const selected = parseInt(monitorChoice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.startPM2Monitoring();
          break;
        case 2:
          await this.showPM2Status();
          break;
        case 3:
          await this.showPM2Logs();
          break;
        case 4:
          return this.manageProcesses();
      }

    } catch (error) {
      await this.setup.handleError('pm2-monitor-processes', error);
    }

    await this.manageProcesses();
  }

  /**
   * Start PM2 monitoring with proper signal handling
   */
  async startPM2Monitoring() {
    try {
      // First check if PM2 has any processes running
      console.log('🔍 Checking PM2 processes...');
      
      const { exec } = require('child-process-promise');
      let hasProcesses = false;
      
      try {
        const { stdout } = await exec('pm2 list --no-color');
        hasProcesses = !stdout.includes('No process found') && stdout.trim() !== '';
      } catch (error) {
        console.log('⚠️  Could not check PM2 process list');
      }

      if (!hasProcesses) {
        console.log('⚠️  No PM2 processes are currently running');
        console.log('💡 You need to start processes first using "Start process" option');
        console.log('💡 Or create an ecosystem.config.js file and run: pm2 start ecosystem.config.js');
        
        const { continueChoice } = await inquirer.prompt({
          type: 'list',
          name: 'continueChoice',
          message: 'What would you like to do?',
          loop: false,
          choices: [
            '1. Go back to process management',
            '2. Try monitoring anyway (may show errors)',
            '3. Show PM2 status instead'
          ]
        });

        const selected = parseInt(continueChoice.split('.')[0]);
        switch(selected) {
          case 1:
            return this.manageProcesses();
          case 2:
            // Continue with monitoring despite no processes
            break;
          case 3:
            return this.showPM2Status();
        }
      }

      await this.setup.safety.safeExecute('pm2-monitor-processes', {
        platform: this.platform
      }, async () => {
        console.log('🔍 Starting PM2 monitoring...');
        console.log('Press Ctrl+C to stop monitoring and return to menu');

        const monitorProcess = exec('pm2 monit');

        // Store original SIGINT handler
        const originalSigintHandler = process.listeners('SIGINT').slice();
        
        // Remove all existing SIGINT handlers temporarily
        process.removeAllListeners('SIGINT');

        // Add our custom SIGINT handler
        const handleSigint = () => {
          console.log('\n🛑 Stopping PM2 monitoring...');
          monitorProcess.childProcess.kill('SIGINT');
          
          // Restore original handlers
          process.removeAllListeners('SIGINT');
          originalSigintHandler.forEach(handler => process.on('SIGINT', handler));
          
          console.log('✅ Monitoring stopped');
          // Return to menu instead of exiting
          setTimeout(() => {
            this.manageProcesses();
          }, 100);
        };

        process.on('SIGINT', handleSigint);

        try {
          await monitorProcess;
        } catch (error) {
          // Handle process termination gracefully
          if (error.message.includes('SIGINT') || error.code === 'SIGINT') {
            console.log('✅ PM2 monitoring stopped by user');
          } else if (error.message.includes('disconnectBus') || error.message.includes('Cannot read properties of undefined')) {
            console.log('⚠️  PM2 monitoring encountered an error (this is common when no processes are running)');
            console.log('💡 Try starting some PM2 processes first, then monitor again');
            console.log('✅ Returning to menu...');
          } else {
            throw error;
          }
        }
        
        return {
          success: true,
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      // Handle the specific disconnectBus error gracefully
      if (error.message && error.message.includes('disconnectBus')) {
        console.log('⚠️  PM2 monitoring failed due to internal PM2 error');
        console.log('💡 This usually happens when PM2 is not properly initialized or no processes are running');
        console.log('💡 Try using "Show PM2 status" instead, or start some processes first');
        
        const { fallbackChoice } = await inquirer.prompt({
          type: 'list',
          name: 'fallbackChoice',
          message: 'What would you like to do?',
          loop: false,
          choices: [
            '1. Show PM2 status instead',
            '2. Go back to process management',
            '3. Try again'
          ]
        });

        const selected = parseInt(fallbackChoice.split('.')[0]);
        switch(selected) {
          case 1:
            return this.showPM2Status();
          case 2:
            return this.manageProcesses();
          case 3:
            return this.startPM2Monitoring();
        }
      } else {
        await this.setup.handleError('pm2-monitor-processes', error);
      }
    }
  }

  /**
   * Show PM2 status list
   */
  async showPM2Status() {
    try {
      await this.setup.safety.safeExecute('pm2-status', {
        platform: this.platform
      }, async () => {
        console.log('📊 PM2 Process Status:');
        console.log('=' .repeat(50));
        
        const { exec } = require('child-process-promise');
        
        try {
          const { stdout } = await exec('pm2 list --no-color');
          console.log(stdout);
          
          if (stdout.includes('No process found') || stdout.trim() === '') {
            console.log('\n⚠️  No PM2 processes are currently running');
            console.log('💡 To start processes:');
            console.log('   • Use "Start process" option in this menu');
            console.log('   • Or create an ecosystem.config.js file and run: pm2 start ecosystem.config.js');
            console.log('   • Or start a process manually: pm2 start app.js');
          } else {
            console.log('\n💡 Use "pm2 monit" for real-time monitoring');
            console.log('💡 Use "pm2 logs" for live logs');
          }
        } catch (error) {
          console.log('⚠️  Could not retrieve PM2 process list');
          console.log('💡 Make sure PM2 is installed and running');
          console.log('💡 Try running: pm2 list');
        }
        
        return {
          success: true,
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('pm2-status', error);
    }
  }

  /**
   * Show PM2 logs with timeout
   */
  async showPM2Logs() {
    try {
      const { logDuration } = await inquirer.prompt({
        type: 'list',
        name: 'logDuration',
        message: 'How long to show logs?',
        loop: false,
        choices: [
          '1. 30 seconds',
          '2. 1 minute',
          '3. 5 minutes',
          '4. Until stopped (Ctrl+C)',
          '5. Go Back'
        ]
      });

      const selected = parseInt(logDuration.split('.')[0]);

      if (selected === 5) {
        return this.monitorProcesses();
      }

      let duration = 0;
      switch(selected) {
        case 1: duration = 30; break;
        case 2: duration = 60; break;
        case 3: duration = 300; break;
        case 4: duration = 0; break; // 0 means until stopped
      }

      // First check if PM2 has any processes running
      console.log('🔍 Checking PM2 processes...');
      
      const { exec } = require('child-process-promise');
      let hasProcesses = false;
      
      try {
        const { stdout } = await exec('pm2 list --no-color');
        hasProcesses = !stdout.includes('No process found') && stdout.trim() !== '';
      } catch (error) {
        console.log('⚠️  Could not check PM2 process list');
      }

      if (!hasProcesses) {
        console.log('⚠️  No PM2 processes are currently running');
        console.log('💡 You need to start processes first to view logs');
        
        const { logChoice } = await inquirer.prompt({
          type: 'list',
          name: 'logChoice',
          message: 'What would you like to do?',
          loop: false,
          choices: [
            '1. Go back to monitoring options',
            '2. Show PM2 status instead',
            '3. Try showing logs anyway (may show errors)'
          ]
        });

        const selected = parseInt(logChoice.split('.')[0]);
        switch(selected) {
          case 1:
            return this.monitorProcesses();
          case 2:
            return this.showPM2Status();
          case 3:
            // Continue with logs despite no processes
            break;
        }
      }

      await this.setup.safety.safeExecute('pm2-logs', {
        platform: this.platform,
        duration
      }, async () => {
        console.log('📋 Showing PM2 logs...');
        if (duration > 0) {
          console.log(`⏱️  Will show logs for ${duration} seconds`);
        } else {
          console.log('⏱️  Press Ctrl+C to stop showing logs');
        }
        
        if (duration > 0) {
          // Show logs for specific duration
          const logProcess = exec('pm2 logs --lines 100');
          
          // Set timeout
          setTimeout(() => {
            logProcess.childProcess.kill('SIGINT');
            console.log('\n✅ Log viewing completed');
          }, duration * 1000);
          
          try {
            await logProcess;
          } catch (error) {
            if (error.message.includes('SIGINT') || error.code === 'SIGINT') {
              console.log('✅ Log viewing stopped');
            } else {
              throw error;
            }
          }
        } else {
          // Show logs until Ctrl+C
          const logProcess = exec('pm2 logs --lines 100');
          
          // Store original SIGINT handler
          const originalSigintHandler = process.listeners('SIGINT').slice();
          process.removeAllListeners('SIGINT');

          const handleSigint = () => {
            console.log('\n🛑 Stopping log viewing...');
            logProcess.childProcess.kill('SIGINT');
            
            // Restore original handlers
            process.removeAllListeners('SIGINT');
            originalSigintHandler.forEach(handler => process.on('SIGINT', handler));
            
            console.log('✅ Log viewing stopped');
            setTimeout(() => {
              this.manageProcesses();
            }, 100);
          };

          process.on('SIGINT', handleSigint);

          try {
            await logProcess;
          } catch (error) {
            if (error.message.includes('SIGINT') || error.code === 'SIGINT') {
              console.log('✅ Log viewing stopped by user');
            } else {
              throw error;
            }
          }
        }
        
        return {
          success: true,
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('pm2-logs', error);
    }
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