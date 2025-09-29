/**
 * PERN Setup Tool - Tool Installation Manager
 * Handles installation of development tools and utilities
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const ora = require('ora');

/**
 * Tool Installation Manager Class
 * Manages installation of development tools and utilities
 */
class ToolManager {
  constructor(setupTool) {
    this.setup = setupTool;
    this.logger = setupTool.logger;
    this.safety = setupTool.safety;
    this.config = setupTool.config;
    this.platform = process.platform;
    this.homeDir = os.homedir();

    // Available tools for installation
    this.availableTools = {
      // GIS and Geospatial Tools
      gdal: {
        name: 'GDAL (Geospatial Data Abstraction Library)',
        description: 'Library for reading and writing geospatial data formats',
        category: 'GIS',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: [
            'sudo apt update',
            'sudo apt install -y gdal-bin python3-gdal',
            'pip3 install gdal'
          ],
          darwin: [
            'brew install gdal',
            'pip3 install gdal'
          ],
          win32: [
            'choco install gdal -y',
            'pip install gdal'
          ]
        },
        checkCommand: process.platform === 'win32' ? 'gdalinfo' : 'gdalinfo --version',
        dependencies: ['python3', 'pip3']
      },
      ogr2ogr: {
        name: 'ogr2ogr (Vector Data Translation)',
        description: 'Command-line tool for converting geospatial vector data',
        category: 'GIS',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: [
            'sudo apt install -y gdal-bin'
          ],
          darwin: [
            'brew install gdal'
          ],
          win32: [
            'choco install gdal -y'
          ]
        },
        checkCommand: process.platform === 'win32' ? 'ogr2ogr' : 'ogr2ogr --version',
        parentTool: 'gdal'
      },
      postgis: {
        name: 'PostGIS',
        description: 'Spatial database extender for PostgreSQL',
        category: 'Database',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: [
            'sudo apt install -y postgresql-15-postgis-3',
            'sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS postgis;"'
          ],
          darwin: [
            'brew install postgis',
            'brew services start postgresql'
          ],
          win32: [
            'choco install postgis -y'
          ]
        },
        checkCommand: 'psql --version',
        dependencies: ['postgresql']
      },

      // Development Tools
      docker: {
        name: 'Docker',
        description: 'Containerization platform',
        category: 'Development',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: [
            'curl -fsSL https://get.docker.com -o get-docker.sh',
            'sudo sh get-docker.sh',
            'sudo usermod -aG docker $USER'
          ],
          darwin: [
            'brew install --cask docker',
            'open -a Docker'
          ],
          win32: [
            'choco install docker-desktop -y'
          ]
        },
        checkCommand: 'docker --version',
        postInstall: ['docker_post_install']
      },
      git: {
        name: 'Git',
        description: 'Version control system',
        category: 'Development',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: ['sudo apt install -y git'],
          darwin: ['brew install git'],
          win32: ['choco install git -y']
        },
        checkCommand: 'git --version'
      },
      nodejs: {
        name: 'Node.js',
        description: 'JavaScript runtime environment',
        category: 'Development',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: [
            'curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -',
            'sudo apt install -y nodejs'
          ],
          darwin: ['brew install node'],
          win32: ['choco install nodejs -y']
        },
        checkCommand: 'node --version'
      },
      yarn: {
        name: 'Yarn',
        description: 'Fast, reliable, and secure dependency management',
        category: 'Development',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: ['npm install -g yarn'],
          darwin: ['brew install yarn'],
          win32: ['choco install yarn -y']
        },
        checkCommand: 'yarn --version',
        dependencies: ['nodejs']
      },

      // Database Tools
      postgresql: {
        name: 'PostgreSQL',
        description: 'Advanced open source relational database',
        category: 'Database',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: ['sudo apt install -y postgresql postgresql-contrib'],
          darwin: ['brew install postgresql'],
          win32: ['choco install postgresql -y']
        },
        checkCommand: 'psql --version',
        postInstall: ['postgresql_post_install']
      },
      redis: {
        name: 'Redis',
        description: 'In-memory data structure store',
        category: 'Database',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: ['sudo apt install -y redis-server'],
          darwin: ['brew install redis'],
          win32: ['choco install redis-64 -y']
        },
        checkCommand: 'redis-cli --version',
        postInstall: ['redis_post_install']
      },
      mongodb: {
        name: 'MongoDB',
        description: 'NoSQL document database',
        category: 'Database',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: [
            'wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -',
            'echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list',
            'sudo apt update',
            'sudo apt install -y mongodb-org'
          ],
          darwin: ['brew install mongodb-community'],
          win32: ['choco install mongodb -y']
        },
        checkCommand: 'mongod --version',
        postInstall: ['mongodb_post_install']
      },

      // Monitoring and Performance Tools
      htop: {
        name: 'htop',
        description: 'Interactive process viewer',
        category: 'Monitoring',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: ['sudo apt install -y htop'],
          darwin: ['brew install htop'],
          win32: ['choco install htop -y']
        },
        checkCommand: 'htop --version'
      },
      nmap: {
        name: 'nmap',
        description: 'Network discovery and security auditing',
        category: 'Monitoring',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: ['sudo apt install -y nmap'],
          darwin: ['brew install nmap'],
          win32: ['choco install nmap -y']
        },
        checkCommand: 'nmap --version'
      },

      // Text Editors and IDEs
      vim: {
        name: 'Vim',
        description: 'Highly configurable text editor',
        category: 'Editor',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: ['sudo apt install -y vim'],
          darwin: ['brew install vim'],
          win32: ['choco install vim -y']
        },
        checkCommand: 'vim --version'
      },
      nano: {
        name: 'nano',
        description: 'Simple, user-friendly text editor',
        category: 'Editor',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: ['sudo apt install -y nano'],
          darwin: ['brew install nano'],
          win32: ['choco install nano -y']
        },
        checkCommand: 'nano --version'
      },

      // Windows-specific tools
      visualstudio: {
        name: 'Visual Studio Code',
        description: 'Free source-code editor',
        category: 'Editor',
        platformSupport: ['win32'],
        installCommands: {
          win32: ['choco install vscode -y']
        },
        checkCommand: 'code --version'
      },
      powershell: {
        name: 'PowerShell Core',
        description: 'Cross-platform task automation and configuration management',
        category: 'Development',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: ['sudo apt install -y powershell'],
          darwin: ['brew install --cask powershell'],
          win32: ['choco install powershell-core -y']
        },
        checkCommand: 'pwsh --version'
      },
      wget: {
        name: 'Wget',
        description: 'Free utility for non-interactive download of files',
        category: 'Development',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: ['sudo apt install -y wget'],
          darwin: ['brew install wget'],
          win32: ['choco install wget -y']
        },
        checkCommand: 'wget --version'
      },
      curl: {
        name: 'curl',
        description: 'Command line tool for transferring data with URLs',
        category: 'Development',
        platformSupport: ['linux', 'darwin', 'win32'],
        installCommands: {
          linux: ['sudo apt install -y curl'],
          darwin: ['brew install curl'],
          win32: ['choco install curl -y']
        },
        checkCommand: 'curl --version'
      }
    };
  }

  /**
   * Show tool installation interface
   */
  async showInterface() {
    try {
      // Show loading animation for interface initialization
      const spinner = ora('Loading Tool Installation Manager...').start();

      // Simulate loading platform information
      await new Promise(resolve => setTimeout(resolve, 500));

      spinner.succeed('Tool Installation Manager loaded');
      spinner.stop();

      // Show platform-specific information
      this.showPlatformInfo();

      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Tool Installation Section',
          loop: false,
          choices: [
            '1. Install Development Tools',
            '2. Install GIS Tools (GDAL, PostGIS, etc.)',
            '3. Install Database Tools',
            '4. Install Monitoring Tools',
            '5. Install Text Editors',
            '6. Check Installed Tools',
            '7. Update Package Managers',
            '8. View Installation History',
            new inquirer.Separator('──────────────'),
            'Go back'
          ]
        }
      ]);

      // Handle "Go back" option
      if (choice === 'Go back') {
        return this.setup.showMainInterface();
      }

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.showDevelopmentToolsInterface();
          break;
        case 2:
          await this.showGISToolsInterface();
          break;
        case 3:
          await this.showDatabaseToolsInterface();
          break;
        case 4:
          await this.showMonitoringToolsInterface();
          break;
        case 5:
          await this.showEditorToolsInterface();
          break;
        case 6:
          await this.checkInstalledTools();
          break;
        case 7:
          await this.updatePackageManagers();
          break;
        case 8:
          await this.showInstallationHistory();
          break;
      }

    } catch (error) {
      await this.setup.handleError('tool-interface', error);
    }
  }

  /**
   * Show development tools interface
   */
  async showDevelopmentToolsInterface() {
    try {
      const categorySpinner = ora('Loading development tools...').start();
      const devTools = this.getToolsByCategory('Development');

      if (devTools.length === 0) {
        categorySpinner.warn(`No development tools available for ${this.getPlatformName()}`);
        return this.showInterface();
      }

      categorySpinner.succeed(`Found ${devTools.length} development tools for ${this.getPlatformName()}`);

      const { tools } = await inquirer.prompt({
        type: 'list',
        name: 'tools',
        message: 'Development Tools Section',
        loop: false,
        choices: [
          ...devTools.map(tool => ({
            name: `${tool.name} - ${tool.description}`,
            value: tool.key
          })),
          new inquirer.Separator('──────────────'),
          'Go back'
        ]
      });

      if (tools === 'Go back') {
        return this.showInterface();
      }

      await this.installMultipleTools(tools);
      await this.showInterface();

    } catch (error) {
      await this.setup.handleError('development-tools', error);
    }
  }

  /**
   * Show GIS tools interface
   */
  async showGISToolsInterface() {
    try {
      const gisSpinner = ora('Loading GIS tools (GDAL, PostGIS, etc.)...').start();
      const gisTools = this.getToolsByCategory('GIS');

      if (gisTools.length === 0) {
        gisSpinner.warn(`No GIS tools available for ${this.getPlatformName()}`);
        return this.showInterface();
      }

      gisSpinner.succeed(`Found ${gisTools.length} GIS tools for ${this.getPlatformName()}`);

      const { tools } = await inquirer.prompt({
        type: 'list',
        name: 'tools',
        message: 'GIS Tools Section',
        loop: false,
        choices: [
          ...gisTools.map(tool => ({
            name: `${tool.name} - ${tool.description}`,
            value: tool.key
          })),
          new inquirer.Separator('──────────────'),
          'Go back'
        ]
      });

      if (tools === 'Go back') {
        return this.showInterface();
      }

      await this.installMultipleTools(tools);
      await this.showInterface();

    } catch (error) {
      await this.setup.handleError('gis-tools', error);
    }
  }

  /**
   * Show database tools interface
   */
  async showDatabaseToolsInterface() {
    try {
      const dbTools = this.getToolsByCategory('Database');
      const { tools } = await inquirer.prompt({
        type: 'list',
        name: 'tools',
        message: 'Database Tools Section',
        loop: false,
        choices: [
          ...dbTools.map(tool => ({
            name: `${tool.name} - ${tool.description}`,
            value: tool.key
          })),
          new inquirer.Separator('──────────────'),
          'Go back'
        ]
      });

      if (tools === 'Go back') {
        return this.showInterface();
      }

      await this.installMultipleTools(tools);
      await this.showInterface();

    } catch (error) {
      await this.setup.handleError('database-tools', error);
    }
  }

  /**
   * Show monitoring tools interface
   */
  async showMonitoringToolsInterface() {
    try {
      const monitoringTools = this.getToolsByCategory('Monitoring');
      const { tools } = await inquirer.prompt({
        type: 'list',
        name: 'tools',
        message: 'Monitoring Tools Section',
        loop: false,
        choices: [
          ...monitoringTools.map(tool => ({
            name: `${tool.name} - ${tool.description}`,
            value: tool.key
          })),
          new inquirer.Separator('──────────────'),
          'Go back'
        ]
      });

      if (tools === 'Go back') {
        return this.showInterface();
      }

      await this.installMultipleTools(tools);
      await this.showInterface();

    } catch (error) {
      await this.setup.handleError('monitoring-tools', error);
    }
  }

  /**
   * Show editor tools interface
   */
  async showEditorToolsInterface() {
    try {
      const editorTools = this.getToolsByCategory('Editor');
      const { tools } = await inquirer.prompt({
        type: 'list',
        name: 'tools',
        message: 'Text Editors Section',
        loop: false,
        choices: [
          ...editorTools.map(tool => ({
            name: `${tool.name} - ${tool.description}`,
            value: tool.key
          })),
          new inquirer.Separator('──────────────'),
          'Go back'
        ]
      });

      if (tools === 'Go back') {
        return this.showInterface();
      }

      await this.installMultipleTools(tools);
      await this.showInterface();

    } catch (error) {
      await this.setup.handleError('editor-tools', error);
    }
  }

  /**
   * Get platform name for display
   */
  getPlatformName() {
    const platformNames = {
      'linux': 'Linux',
      'darwin': 'macOS',
      'win32': 'Windows'
    };
    return platformNames[this.platform] || this.platform;
  }

  /**
   * Get available tools for current platform
   */
  getAvailableToolsForPlatform() {
    return Object.entries(this.availableTools)
      .filter(([key, tool]) => tool.platformSupport.includes(this.platform))
      .map(([key, tool]) => ({ key, ...tool }));
  }

  /**
   * Get tools by category (filtered by platform support)
   */
  getToolsByCategory(category) {
    return Object.entries(this.availableTools)
      .filter(([key, tool]) =>
        tool.category === category &&
        tool.platformSupport.includes(this.platform)
      )
      .map(([key, tool]) => ({ key, ...tool }));
  }

  /**
   * Install multiple tools
   */
  async installMultipleTools(toolKeys) {
    const results = [];
    const totalTools = toolKeys.length;

    const multiSpinner = ora(`Installing ${totalTools} tools...`).start();

    for (let i = 0; i < toolKeys.length; i++) {
      const toolKey = toolKeys[i];
      const progress = `${i + 1}/${totalTools}`;

      try {
        multiSpinner.text = `[${progress}] Installing ${this.availableTools[toolKey].name}...`;

        const result = await this.installTool(toolKey);
        results.push({ tool: toolKey, success: true, result });

        multiSpinner.text = `[${progress}] ✅ ${this.availableTools[toolKey].name} installed`;

      } catch (error) {
        multiSpinner.text = `[${progress}] ❌ Failed to install ${this.availableTools[toolKey].name}`;

        // Enhanced error logging
        console.error(`❌ Failed to install ${this.availableTools[toolKey].name}:`, error.message);
        this.logger.error(`Tool installation failed: ${toolKey}`, {
          tool: toolKey,
          platform: this.platform,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        });

        results.push({
          tool: toolKey,
          success: false,
          error: error.message,
          platform: this.platform,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n📋 Installation Summary for ${this.getPlatformName()}:`);
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${totalTools}`);

    if (failed > 0) {
      console.log(`\n❌ Failed tools:`);
      results.filter(r => !r.success).forEach(r => {
        console.log(`   • ${this.availableTools[r.tool].name}: ${r.error}`);
      });

      // Platform-specific troubleshooting suggestions
      console.log(`\n💡 Troubleshooting suggestions for ${this.getPlatformName()}:`);
      if (this.platform === 'linux') {
        console.log(`   • Ensure you have sudo privileges`);
        console.log(`   • Check if package managers need updating`);
        console.log(`   • Verify internet connection`);
      } else if (this.platform === 'darwin') {
        console.log(`   • Ensure Homebrew is installed and updated`);
        console.log(`   • Check if Xcode command line tools are installed`);
        console.log(`   • Verify internet connection`);
      } else if (this.platform === 'win32') {
        console.log(`   • Run as Administrator if needed`);
        console.log(`   • Ensure Chocolatey is installed and updated`);
        console.log(`   • Check Windows Developer Mode settings`);
      }
    } else {
      console.log(`\n🎉 All tools installed successfully on ${this.getPlatformName()}!`);
    }
  }

  /**
   * Install a single tool
   */
  async installTool(toolKey) {
    const tool = this.availableTools[toolKey];

    if (!tool) {
      throw new Error(`Tool ${toolKey} not found`);
    }

    // Check platform support
    if (!tool.platformSupport.includes(this.platform)) {
      throw new Error(`${tool.name} is not supported on ${this.getPlatformName()}`);
    }

    // Show platform-specific prerequisites with loading animation
    const prereqSpinner = ora(`Checking prerequisites for ${tool.name}...`).start();
    await this.showPlatformPrerequisites(tool);
    prereqSpinner.succeed(`Prerequisites checked for ${tool.name}`);

    // Check dependencies
    if (tool.dependencies) {
      await this.checkDependencies(tool.dependencies);
    }

    // Install parent tool if required
    if (tool.parentTool && !await this.isToolInstalled(tool.parentTool)) {
      console.log(`📦 Installing parent tool: ${this.availableTools[tool.parentTool].name}`);
      await this.installTool(tool.parentTool);
    }

    const installCommands = tool.installCommands[this.platform];

    if (!installCommands || installCommands.length === 0) {
      throw new Error(`No installation commands available for ${tool.name} on ${this.platform}`);
    }

    return await this.setup.safety.safeExecute(`tool-install-${toolKey}`, {
      toolName: tool.name,
      platform: this.platform,
      commands: installCommands
    }, async () => {
      const results = [];

      for (const command of installCommands) {
        const commandSpinner = ora(`Executing: ${command}`).start();

        try {
          const result = await exec(command);
          results.push({ command, success: true, output: result.stdout });
          commandSpinner.succeed(`Completed: ${command}`);

          // Add delay between commands
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          results.push({ command, success: false, error: error.message });
          commandSpinner.fail(`Failed: ${command}`);
          throw error;
        }
      }

      // Run post-installation steps
      if (tool.postInstall) {
        for (const postStep of tool.postInstall) {
          await this.runPostInstallStep(postStep, tool);
        }
      }

      // Verify installation
      const verifySpinner = ora(`Verifying ${tool.name} installation...`).start();
      const isInstalled = await this.verifyInstallation(tool);
      if (isInstalled) {
        verifySpinner.succeed(`${tool.name} installation verified`);
      } else {
        verifySpinner.fail(`${tool.name} installation verification failed`);
        throw new Error(`Installation verification failed for ${tool.name}`);
      }

      return {
        success: true,
        tool: toolKey,
        commands: results,
        verified: true,
        timestamp: new Date().toISOString()
      };
    });
  }

  /**
   * Check if dependencies are installed
   */
  async checkDependencies(dependencies) {
    for (const dep of dependencies) {
      const depSpinner = ora(`Checking dependency: ${dep}...`).start();

      if (!await this.isToolInstalled(dep)) {
        depSpinner.text = `Installing dependency: ${dep}...`;
        await this.installTool(dep);
        depSpinner.succeed(`Dependency ${dep} installed`);
      } else {
        depSpinner.succeed(`Dependency ${dep} already installed`);
      }
    }
  }

  /**
   * Check if a tool is already installed
   */
  async isToolInstalled(toolKey) {
    const tool = this.availableTools[toolKey];
    if (!tool || !tool.checkCommand) {
      return false;
    }

    try {
      await exec(tool.checkCommand);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify tool installation
   */
  async verifyInstallation(tool) {
    try {
      await exec(tool.checkCommand);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Run post-installation steps
   */
  async runPostInstallStep(step, tool) {
    switch(step) {
      case 'docker_post_install':
        await this.dockerPostInstall();
        break;
      case 'postgresql_post_install':
        await this.postgresqlPostInstall();
        break;
      case 'redis_post_install':
        await this.redisPostInstall();
        break;
      case 'mongodb_post_install':
        await this.mongodbPostInstall();
        break;
    }
  }

  /**
   * Docker post-installation setup
   */
  async dockerPostInstall() {
    try {
      if (this.platform === 'linux') {
        console.log('🐳 Setting up Docker group permissions...');
        await exec('sudo usermod -aG docker $USER');
        console.log('ℹ️  Please log out and log back in for Docker permissions to take effect');
      } else if (this.platform === 'win32') {
        console.log('🐳 Docker Desktop installed. Please start Docker Desktop from the Start menu');
      } else if (this.platform === 'darwin') {
        console.log('🐳 Docker installed. Please start Docker from Applications');
      }
    } catch (error) {
      console.warn('⚠️  Docker post-install setup failed:', error.message);
    }
  }

  /**
   * PostgreSQL post-installation setup
   */
  async postgresqlPostInstall() {
    try {
      if (this.platform === 'linux') {
        console.log('🐘 Setting up PostgreSQL...');
        await exec('sudo systemctl enable postgresql');
        await exec('sudo systemctl start postgresql');
      }
    } catch (error) {
      console.warn('⚠️  PostgreSQL post-install setup failed:', error.message);
    }
  }

  /**
   * Redis post-installation setup
   */
  async redisPostInstall() {
    try {
      if (this.platform === 'linux') {
        console.log('🔴 Setting up Redis...');
        await exec('sudo systemctl enable redis-server');
        await exec('sudo systemctl start redis-server');
      }
    } catch (error) {
      console.warn('⚠️  Redis post-install setup failed:', error.message);
    }
  }

  /**
   * MongoDB post-installation setup
   */
  async mongodbPostInstall() {
    try {
      if (this.platform === 'linux') {
        console.log('🍃 Setting up MongoDB...');
        await exec('sudo systemctl enable mongod');
        await exec('sudo systemctl start mongod');
      }
    } catch (error) {
      console.warn('⚠️  MongoDB post-install setup failed:', error.message);
    }
  }

  /**
   * Check installed tools
   */
  async checkInstalledTools() {
    const checkSpinner = ora(`Checking installed tools on ${this.getPlatformName()}...`).start();

    const results = [];
    const availableTools = this.getAvailableToolsForPlatform();

    checkSpinner.text = `Found ${availableTools.length} available tools for ${this.getPlatformName()}`;
    await new Promise(resolve => setTimeout(resolve, 800));
    checkSpinner.succeed(`Tool check completed for ${this.getPlatformName()}`);

    console.log(`\n📋 Available tools for ${this.getPlatformName()}: ${availableTools.length}\n`);

    for (const [toolKey, tool] of Object.entries(this.availableTools)) {
      // Only check tools available for current platform
      if (!tool.platformSupport.includes(this.platform)) {
        continue;
      }

      const toolSpinner = ora(`Checking ${tool.name}...`).start();

      const isInstalled = await this.isToolInstalled(toolKey);
      const status = isInstalled ? '✅' : '❌';

      if (isInstalled) {
        toolSpinner.succeed(`${tool.name} - Installed`);
      } else {
        toolSpinner.warn(`${tool.name} - Not installed`);
      }

      results.push({
        tool: toolKey,
        name: tool.name,
        installed: isInstalled,
        category: tool.category
      });
    }

    // Summary by category
    console.log('\n📊 Installation Summary by Category:');
    const categories = [...new Set(results.map(r => r.category))];

    categories.forEach(category => {
      const categoryTools = results.filter(r => r.category === category);
      const installed = categoryTools.filter(r => r.installed).length;
      const total = categoryTools.length;

      console.log(`   ${category.padEnd(12)} - ${installed}/${total} installed`);
    });

    const { action } = await inquirer.prompt({
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      loop: false,
      choices: [
        '1. Install missing tools',
        '2. Export tool status',
        '3. View installation history',
        '4. Return to main PERN setup menu',
        new inquirer.Separator('──────────────'),
        '5. Go back'
      ]
    });

    const selected = parseInt(action.split('.')[0]);

    switch(selected) {
      case 1:
        const missingTools = results.filter(r => !r.installed).map(r => r.tool);
        if (missingTools.length > 0) {
          await this.installMultipleTools(missingTools);
        } else {
          console.log('✅ All tools are already installed!');
        }
        break;
      case 2:
        return this.showInterface();
      case 3:
        await this.exportToolStatus(results);
        break;
      case 4:
        await this.showInstallationHistory();
        break;
      case 5:
        return this.setup.showMainInterface();
    }

    await this.showInterface();
  }

  /**
   * Update package managers
   */
  async updatePackageManagers() {
    const updateSpinner = ora('Updating package managers...').start();

    try {
      const updateCommands = this.getUpdateCommands();

      updateSpinner.text = `Found ${Object.keys(updateCommands).length} package managers to update`;

      for (const [manager, command] of Object.entries(updateCommands)) {
        const managerSpinner = ora(`Updating ${manager}...`).start();

        try {
          await exec(command);
          managerSpinner.succeed(`${manager} updated successfully`);
        } catch (error) {
          managerSpinner.fail(`Failed to update ${manager}: ${error.message}`);
          console.warn(`⚠️  Failed to update ${manager}:`, error.message);
        }
      }

      updateSpinner.succeed('Package managers update completed');

    } catch (error) {
      updateSpinner.fail('Package managers update failed');
      console.error('❌ Failed to update package managers:', error.message);
    }

    // Ask user what to do next
    const { nextAction } = await inquirer.prompt({
      type: 'list',
      name: 'nextAction',
      message: 'Package manager update completed. What would you like to do?',
      loop: false,
      choices: [
        '1. Update package managers again',
        '2. Return to main PERN setup menu',
        new inquirer.Separator('──────────────'),
        '3. Go back'
      ]
    });

    const nextSelected = parseInt(nextAction.split('.')[0]);

    switch(nextSelected) {
      case 1:
        await this.updatePackageManagers();
        break;
      case 2:
        await this.showInterface();
        break;
      case 3:
        await this.setup.showMainInterface();
        break;
    }
  }

  /**
   * Get update commands for current platform
   */
  getUpdateCommands() {
    const commands = {};

    switch(this.platform) {
      case 'linux':
        commands['apt'] = 'sudo apt update && sudo apt upgrade -y';
        commands['snap'] = 'sudo snap refresh';
        commands['flatpak'] = 'flatpak update -y';
        commands['npm'] = 'npm install -g npm@latest';
        break;
      case 'darwin':
        commands['brew'] = 'brew update && brew upgrade';
        commands['npm'] = 'npm install -g npm@latest';
        break;
      case 'win32':
        commands['chocolatey'] = 'choco upgrade all -y';
        commands['winget'] = 'winget upgrade --all';
        commands['scoop'] = 'scoop update *';
        commands['npm'] = 'npm install -g npm@latest';
        break;
    }

    return commands;
  }

  /**
   * Show platform-specific prerequisites
   */
  async showPlatformPrerequisites(tool) {
    if (this.platform === 'win32') {
      console.log(`📋 Prerequisites for ${tool.name} on Windows:`);
      console.log('   • Windows 10/11 or Windows Server');
      console.log('   • PowerShell 5.1 or later');
      console.log('   • Chocolatey package manager (will be installed if missing)');
      if (tool.dependencies && tool.dependencies.length > 0) {
        console.log(`   • Dependencies: ${tool.dependencies.join(', ')}`);
      }
    } else if (this.platform === 'linux') {
      console.log(`📋 Prerequisites for ${tool.name} on Linux:`);
      console.log('   • sudo privileges');
      console.log('   • APT package manager');
      if (tool.dependencies && tool.dependencies.length > 0) {
        console.log(`   • Dependencies: ${tool.dependencies.join(', ')}`);
      }
    } else if (this.platform === 'darwin') {
      console.log(`📋 Prerequisites for ${tool.name} on macOS:`);
      console.log('   • Homebrew package manager');
      console.log('   • Xcode command line tools');
      if (tool.dependencies && tool.dependencies.length > 0) {
        console.log(`   • Dependencies: ${tool.dependencies.join(', ')}`);
      }
    }
  }

  /**
   * Show platform-specific information
   */
  showPlatformInfo() {
    console.log(`\n🖥️  Platform Information:`);
    console.log(`   Operating System: ${this.getPlatformName()}`);
    console.log(`   Architecture: ${process.arch}`);
    console.log(`   Node.js Version: ${process.version}`);

    switch(this.platform) {
      case 'linux':
        console.log(`   Package Managers: APT, Snap, Flatpak`);
        console.log(`   Recommended: Use sudo for system packages`);
        break;
      case 'darwin':
        console.log(`   Package Managers: Homebrew`);
        console.log(`   Recommended: Install Xcode command line tools first`);
        break;
      case 'win32':
        console.log(`   Package Managers: Chocolatey, Winget, Scoop`);
        console.log(`   Recommended: Run as Administrator for system packages`);
        break;
    }
  }

  /**
   * Export tool installation status
   */
  async exportToolStatus(results) {
    const exportSpinner = ora('Exporting tool installation status...').start();

    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        platform: this.platform,
        platformName: this.getPlatformName(),
        tools: results,
        summary: {
          total: results.length,
          installed: results.filter(r => r.installed).length,
          missing: results.filter(r => !r.installed).length
        }
      };

      const exportPath = path.join(process.cwd(), 'tool-installation-status.json');
      await fs.writeFile(exportPath, JSON.stringify(exportData, null, 2));

      exportSpinner.succeed(`Tool status exported to: ${exportPath}`);
    } catch (error) {
      exportSpinner.fail('Failed to export tool status');
      throw error;
    }
  }

  /**
   * Show installation history and logs
   */
  async showInstallationHistory() {
    const historySpinner = ora('Loading installation history...').start();

    try {
      const logPath = path.join(process.cwd(), 'tool-installation-status.json');

      if (!await fs.pathExists(logPath)) {
        historySpinner.warn('No installation history found');
        console.log('💡 Run some tool installations first to generate history');
        return this.showInterface();
      }

      const historyData = JSON.parse(await fs.readFile(logPath, 'utf8'));
      historySpinner.succeed('Installation history loaded');

      console.log(`\n📜 Installation History (${historyData.platformName})`);
      console.log(`📅 Last Updated: ${new Date(historyData.timestamp).toLocaleString()}`);
      console.log(`📊 Summary: ${historyData.summary.installed}/${historyData.summary.total} tools installed`);

      if (historyData.tools && historyData.tools.length > 0) {
        console.log('\n📋 Tool Status:');
        historyData.tools.forEach(tool => {
          const status = tool.installed ? '✅' : '❌';
          console.log(`   ${status} ${tool.name}`);
        });
      }

      const { action } = await inquirer.prompt({
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        loop: false,
        choices: [
          '1. View detailed logs',
          '2. Export current status',
          '3. Clear history',
          new inquirer.Separator('──────────────'),
          '4. Go back'
        ]
      });

      const selected = parseInt(action.split('.')[0]);

      switch(selected) {
        case 1:
          await this.showDetailedLogs();
          break;
        case 2:
          await this.exportToolStatus(historyData.tools);
          break;
        case 3:
          await this.clearHistory();
          break;
        case 4:
          return this.showInterface();
      }

    } catch (error) {
      historySpinner.fail('Failed to load installation history');
      console.error('❌ Error loading history:', error.message);
    }

    await this.showInterface();
  }

  /**
   * Show detailed installation logs
   */
  async showDetailedLogs() {
    console.log('\n📄 Detailed Installation Logs:');
    console.log('This feature will show detailed logs from the main application logger');
    console.log('Check the logs directory for detailed installation logs');

    const { action } = await inquirer.prompt({
      type: 'list',
      name: 'action',
      message: 'Log viewing options:',
      loop: false,
      choices: [
        '1. View recent logs',
        '2. View error logs only',
        new inquirer.Separator('──────────────'),
        '3. Go back'
      ]
    });

    const selected = parseInt(action.split('.')[0]);

    switch(selected) {
      case 1:
        console.log('📋 Recent logs: Check logs/app.log for recent activity');
        break;
      case 2:
        console.log('⚠️  Error logs: Check logs/error.log for errors');
        break;
      case 3:
        return this.showInstallationHistory();
    }

    await this.showInstallationHistory();
  }

  /**
   * Clear installation history
   */
  async clearHistory() {
    const clearSpinner = ora('Clearing installation history...').start();

    try {
      const logPath = path.join(process.cwd(), 'tool-installation-status.json');

      if (await fs.pathExists(logPath)) {
        await fs.unlink(logPath);
        clearSpinner.succeed('Installation history cleared');
      } else {
        clearSpinner.warn('No history file found to clear');
      }
    } catch (error) {
      clearSpinner.fail('Failed to clear history');
      console.error('❌ Error clearing history:', error.message);
    }

    await this.showInstallationHistory();
  }
}

module.exports = ToolManager;