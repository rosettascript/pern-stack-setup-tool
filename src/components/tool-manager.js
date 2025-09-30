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
        description: 'Interactive process viewer (Linux/macOS only)',
        category: 'Monitoring',
        platformSupport: ['linux', 'darwin'],
        requiresSudo: true,
        installCommands: {
          linux: ['sudo apt install -y htop'],
          darwin: ['brew install htop']
        },
        alternativeCommands: {
          linux: ['apt install -y htop', 'snap install htop']
        },
        checkCommand: 'htop --version',
        manualInstallGuide: {
          linux: [
            '1. Open a terminal',
            '2. Run: sudo apt update',
            '3. Run: sudo apt install htop',
            '4. Enter your password when prompted',
            '5. Verify with: htop --version'
          ],
          darwin: [
            '1. Install Homebrew if not already installed',
            '2. Run: brew install htop',
            '3. Verify with: htop --version'
          ]
        }
      },
      taskmanager: {
        name: 'Task Manager Alternative',
        description: 'Windows Task Manager + Process Explorer',
        category: 'Monitoring',
        platformSupport: ['win32'],
        installCommands: {
          win32: ['choco install procexp -y', 'choco install processhacker -y']
        },
        checkCommand: 'procexp.exe'
      },
      node_monitor: {
        name: 'Node.js Process Monitor',
        description: 'Lightweight process monitoring using Node.js (no sudo required)',
        category: 'Monitoring',
        platformSupport: ['linux', 'darwin', 'win32'],
        requiresSudo: false,
        installCommands: {
          linux: ['npm install systeminformation'],
          darwin: ['npm install systeminformation'],
          win32: ['npm install systeminformation']
        },
        checkCommand: 'node -e "try { require(\'./node_modules/systeminformation\'); console.log(\'systeminformation available\'); } catch(e) { process.exit(1); }"',
        postInstall: ['create_node_monitor_script_local']
      },
      sysinfo: {
        name: 'System Info Tool',
        description: 'Basic system information using built-in Node.js APIs (works everywhere)',
        category: 'Monitoring',
        platformSupport: ['linux', 'darwin', 'win32'],
        requiresSudo: false,
        installCommands: {
          linux: [],
          darwin: [],
          win32: []
        },
        checkCommand: 'node --version',
        postInstall: ['create_sysinfo_script']
      },
      disk_monitor: {
        name: 'Disk Usage Monitor',
        description: 'Monitor disk space and file system usage (no installation required)',
        category: 'Monitoring',
        platformSupport: ['linux', 'darwin', 'win32'],
        requiresSudo: false,
        installCommands: {
          linux: [],
          darwin: [],
          win32: []
        },
        checkCommand: 'node --version',
        postInstall: ['create_disk_monitor_script']
      },
      network_monitor: {
        name: 'Network Monitor',
        description: 'Basic network interface and connection monitoring',
        category: 'Monitoring',
        platformSupport: ['linux', 'darwin', 'win32'],
        requiresSudo: false,
        installCommands: {
          linux: [],
          darwin: [],
          win32: []
        },
        checkCommand: 'node --version',
        postInstall: ['create_network_monitor_script']
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
      const devTools = this.getToolsByCategory('Development');

      if (devTools.length === 0) {
        console.log(`No development tools available for ${this.getPlatformName()}`);
        return this.showInterface();
      }

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

      // Ensure tools is an array
      const toolKeys = Array.isArray(tools) ? tools : [tools];
      await this.installMultipleTools(toolKeys);
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
      const gisTools = this.getToolsByCategory('GIS');

      if (gisTools.length === 0) {
        console.log(`No GIS tools available for ${this.getPlatformName()}`);
        return this.showInterface();
      }

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

      // Ensure tools is an array
      const toolKeys = Array.isArray(tools) ? tools : [tools];
      await this.installMultipleTools(toolKeys);
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

      // Ensure tools is an array
      const toolKeys = Array.isArray(tools) ? tools : [tools];
      await this.installMultipleTools(toolKeys);
      await this.showInterface();

    } catch (error) {
      await this.setup.handleError('database-tools', error);
    }
  }

  /**
   * Show monitoring tools interface with improved reliability
   */
  async showMonitoringToolsInterface() {
    try {
      console.log('\n🖥️  Monitoring Tools');
      console.log('─'.repeat(40));

      const monitoringTools = this.getToolsByCategory('Monitoring');

      if (monitoringTools.length === 0) {
        console.log(`No monitoring tools available for ${this.getPlatformName()}`);
        return this.showInterface();
      }

      // Separate tools into working and problematic categories
      const workingTools = monitoringTools.filter(tool => {
        // Tools that work without sudo or installation
        return tool.key === 'sysinfo' ||
               (!tool.requiresSudo && tool.installCommands[this.platform]?.length === 0);
      });

      const installableTools = monitoringTools.filter(tool => {
        // Tools that might work with user guidance
        return tool.key !== 'sysinfo' &&
               (!tool.requiresSudo || tool.key === 'node_monitor');
      });

      const sudoRequiredTools = monitoringTools.filter(tool => {
        // Tools that definitely require sudo (shown with warning)
        return tool.requiresSudo && tool.key !== 'node_monitor';
      });

      const choices = [];

      // Add working tools first (guaranteed to work)
      if (workingTools.length > 0) {
        choices.push({
          name: '🚀 WORKING TOOLS (No Installation Required)',
          value: null,
          disabled: true
        });
        workingTools.forEach(tool => {
          choices.push({
            name: `✅ ${tool.name} - ${tool.description}`,
            value: tool.key
          });
        });
        choices.push(new inquirer.Separator());
      }

      // Add installable tools (might work)
      if (installableTools.length > 0) {
        choices.push({
          name: '📦 INSTALLABLE TOOLS (May require setup)',
          value: null,
          disabled: true
        });
        installableTools.forEach(tool => {
          choices.push({
            name: `📦 ${tool.name} - ${tool.description}`,
            value: tool.key
          });
        });
        choices.push(new inquirer.Separator());
      }

      // Add sudo-required tools (likely to fail, shown with warning)
      if (sudoRequiredTools.length > 0) {
        choices.push({
          name: '⚠️  SYSTEM TOOLS (Require sudo/admin privileges)',
          value: null,
          disabled: true
        });
        sudoRequiredTools.forEach(tool => {
          choices.push({
            name: `⚠️  ${tool.name} - ${tool.description}`,
            value: tool.key
          });
        });
        choices.push(new inquirer.Separator());
      }

      choices.push('Go back');

      const { tools } = await inquirer.prompt({
        type: 'list',
        name: 'tools',
        message: 'Select a monitoring tool to install/setup:',
        choices: choices,
        loop: false,
        pageSize: 15
      });

      if (tools === 'Go back') {
        return this.showInterface();
      }

      // Get the selected tool
      const selectedTool = monitoringTools.find(tool => tool.key === tools);
      if (!selectedTool) {
        console.log('❌ Tool not found');
        return this.showMonitoringToolsInterface();
      }

      // Show installation approach based on tool type
      if (selectedTool.requiresSudo && this.platform === 'linux') {
        console.log(`\n⚠️  ${selectedTool.name} requires system administrator privileges.`);
        console.log('This tool will likely fail in this environment.');
        console.log('\n💡 Recommended alternatives:');
        if (workingTools.length > 0) {
          workingTools.forEach(tool => {
            console.log(`   • ${tool.name}`);
          });
        }

        const { proceed } = await inquirer.prompt({
          type: 'confirm',
          name: 'proceed',
          message: 'Do you still want to try installing this system tool?',
          default: false
        });

        if (!proceed) {
          return this.showMonitoringToolsInterface();
        }
      }

      // Attempt installation
      try {
        await this.installTool(tools);
        console.log(`\n✅ ${selectedTool.name} setup completed!`);
      } catch (error) {
        console.log(`\n❌ ${selectedTool.name} setup failed: ${error.message}`);

        // Offer alternatives for failed tools
        if (workingTools.length > 0) {
          console.log('\n💡 Try these working alternatives instead:');
          workingTools.forEach(tool => {
            console.log(`   • ${tool.name} - ${tool.description}`);
          });
        }
      }

      // Ask to continue or go back
      const { nextAction } = await inquirer.prompt({
        type: 'list',
        name: 'nextAction',
        message: 'What would you like to do next?',
        choices: [
          'Install another monitoring tool',
          'Go back to main menu'
        ]
      });

      if (nextAction === 'Install another monitoring tool') {
        return this.showMonitoringToolsInterface();
      } else {
        return this.showInterface();
      }

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

      // Ensure tools is an array
      const toolKeys = Array.isArray(tools) ? tools : [tools];
      await this.installMultipleTools(toolKeys);
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
        tool && 
        tool.category === category &&
        tool.platformSupport && 
        tool.platformSupport.includes(this.platform)
      )
      .map(([key, tool]) => ({ key, ...tool }))
      .filter(tool => tool.name && tool.description); // Ensure required properties exist
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
        const tool = this.availableTools[toolKey];
        if (!tool || !tool.name) {
          multiSpinner.text = `[${progress}] ❌ Tool ${toolKey} not found`;
          results.push({ tool: toolKey, success: false, error: 'Tool definition not found' });
          continue;
        }

        multiSpinner.text = `[${progress}] Installing ${tool.name}...`;

        const result = await this.installTool(toolKey);
        results.push({ tool: toolKey, success: true, result });

        multiSpinner.text = `[${progress}] ✅ ${tool.name} installed`;

      } catch (error) {
        const toolName = this.availableTools[toolKey]?.name || toolKey;
        multiSpinner.text = `[${progress}] ❌ Failed to install ${toolName}`;

        // Enhanced error logging
        console.error(`❌ Failed to install ${toolName}:`, error.message);
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

    // Stop the spinner
    multiSpinner.stop();
  }

  /**
   * Show manual installation guide for a tool
   */
  async showManualInstallGuide(tool) {
    console.log(`\n📋 Manual Installation Guide for ${tool.name}`);
    console.log(`Platform: ${this.getPlatformName()}`);
    console.log('─'.repeat(50));
    
    if (tool.manualInstallGuide && tool.manualInstallGuide[this.platform]) {
      const steps = tool.manualInstallGuide[this.platform];
      steps.forEach(step => {
        console.log(`   ${step}`);
      });
    } else if (tool.installCommands && tool.installCommands[this.platform]) {
      console.log('   Manual installation commands:');
      tool.installCommands[this.platform].forEach(cmd => {
        console.log(`   • ${cmd}`);
      });
    }
    
    console.log('\n💡 After installation, you can verify with:');
    if (tool.checkCommand) {
      console.log(`   ${tool.checkCommand}`);
    }
    
    console.log('\n🔄 Run the tool installer again to verify installation.');
    
    // Ask if user wants to try verification
    const { verifyNow } = await inquirer.prompt({
      type: 'confirm',
      name: 'verifyNow',
      message: 'Would you like to verify if the tool is now installed?',
      default: true
    });
    
    if (verifyNow) {
      const isInstalled = await this.verifyInstallation(tool);
      if (isInstalled) {
        console.log(`✅ ${tool.name} is now installed and working!`);
        return { success: true, verified: true };
      } else {
        console.log(`❌ ${tool.name} is still not installed or not working properly.`);
        console.log(`💡 Please follow the manual installation steps above.`);
        return { success: false, verified: false };
      }
    }
    
    return { success: false, verified: false, manual: true };
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

    // Check if tool is already installed first
    if (await this.isToolInstalled(tool.checkCommand)) {
      console.log(`✅ ${tool.name} is already installed!`);
      return {
        success: true,
        tool: toolKey,
        message: 'Already installed',
        platform: this.platform,
        timestamp: new Date().toISOString()
      };
    }

    // Show platform-specific prerequisites
    await this.showPlatformPrerequisites(tool);

    // Check if tool requires sudo and offer manual installation option
    if (tool.requiresSudo && this.platform === 'linux') {
      console.log(`⚠️  ${tool.name} requires sudo privileges for installation.`);
      const { installMethod } = await inquirer.prompt({
        type: 'list',
        name: 'installMethod',
        message: 'How would you like to proceed?',
        choices: [
          {
            name: 'Try automatic installation (may require password)',
            value: 'automatic'
          },
          {
            name: 'Show manual installation guide',
            value: 'manual'
          },
          {
            name: 'Skip this tool',
            value: 'skip'
          }
        ]
      });

      if (installMethod === 'manual') {
        return await this.showManualInstallGuide(tool);
      } else if (installMethod === 'skip') {
        console.log(`⏭️  Skipping ${tool.name} installation.`);
        return {
          success: false,
          tool: toolKey,
          message: 'Skipped by user',
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
      }
      // Continue with automatic installation if chosen
    }

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
    const hasCommands = installCommands && installCommands.length > 0;

    if (!hasCommands && !tool.postInstall) {
      throw new Error(`No installation commands or post-install steps available for ${tool.name} on ${this.platform}`);
    }

    console.log(`🔧 Installing ${tool.name}...`);

    // Start installation spinner
    const installSpinner = ora(`Installing ${tool.name}...`).start();

    const results = [];

    if (hasCommands) {
      for (const command of installCommands) {
      console.log(`📦 Executing: ${command}`);
      
      // Show user-friendly message for sudo commands
      if (command.includes('sudo') && this.platform === 'linux') {
        console.log(`💡 You may be prompted for your password to install system packages`);
        console.log(`💡 If the installation hangs, press Ctrl+C and run the command manually`);
      }

      try {
        // Update spinner for current command
        installSpinner.text = `Executing: ${command.split(' ')[0]}...`;

        // Use spawn instead of exec to avoid blocking issues
        const { spawn } = require('child_process');
        const timeoutMs = 30000; // 30 seconds timeout (reduced)

        const result = await new Promise((resolve, reject) => {
          const parts = command.split(' ');
          const cmd = parts[0];
          const args = parts.slice(1);
          
          const child = spawn(cmd, args, { 
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
          });
          
          let stdout = '';
          let stderr = '';
          
          child.stdout.on('data', (data) => {
            stdout += data.toString();
          });
          
          child.stderr.on('data', (data) => {
            stderr += data.toString();
          });
          
          const timeout = setTimeout(() => {
            child.kill('SIGTERM');
            reject(new Error('Command timed out after 30 seconds'));
          }, timeoutMs);
          
          child.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
              resolve({ stdout, stderr });
            } else {
              reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
            }
          });
          
          child.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        });
        
        results.push({ command, success: true, output: result.stdout });
        installSpinner.succeed(`Completed: ${command.split(' ')[0]}`);

      } catch (error) {
        results.push({ command, success: false, error: error.message });
        installSpinner.fail(`Failed: ${command.split(' ')[0]}`);

        // Provide user-friendly error messages and alternatives
        if (error.message.includes('timed out')) {
          console.log(`⏰ Command timed out - this usually means it's waiting for input`);
          console.log(`💡 Try running the command manually in a separate terminal:`);
          console.log(`   ${command}`);
          console.log(`💡 Or install the package manually and then run the tool again`);
        } else if (error.message.includes('sudo') || error.message.includes('password')) {
          console.log(`🔐 This command requires sudo privileges`);
          console.log(`💡 Try running manually: ${command}`);
          console.log(`💡 Or install without sudo: apt install ${command.split(' ').pop()}`);
        } else if (error.message.includes('not found')) {
          console.log(`💡 Package manager or package not found`);
          console.log(`💡 Try updating package lists first: sudo apt update`);
        } else if (error.message.includes('permission')) {
          console.log(`💡 Permission denied - try running with administrator privileges`);
        }
        
        // Try alternative commands if available
        if (tool.alternativeCommands && tool.alternativeCommands[this.platform]) {
          console.log(`🔄 Trying alternative installation method...`);
          const altCommands = tool.alternativeCommands[this.platform];
          
          for (const altCommand of altCommands) {
            try {
              console.log(`📦 Trying: ${altCommand}`);
              const altResult = await new Promise((resolve, reject) => {
                const { spawn } = require('child_process');
                const parts = altCommand.split(' ');
                const cmd = parts[0];
                const args = parts.slice(1);
                
                const child = spawn(cmd, args, { 
                  stdio: ['ignore', 'pipe', 'pipe'],
                  detached: false
                });
                
                let stdout = '';
                let stderr = '';
                
                child.stdout.on('data', (data) => {
                  stdout += data.toString();
                });
                
                child.stderr.on('data', (data) => {
                  stderr += data.toString();
                });
                
                const timeout = setTimeout(() => {
                  child.kill('SIGTERM');
                  reject(new Error('Alternative command timed out'));
                }, 30000);
                
                child.on('close', (code) => {
                  clearTimeout(timeout);
                  if (code === 0) {
                    resolve({ stdout, stderr });
                  } else {
                    reject(new Error(`Alternative command failed with exit code ${code}: ${stderr}`));
                  }
                });
                
                child.on('error', (error) => {
                  clearTimeout(timeout);
                  reject(error);
                });
              });
              
              results.push({ command: altCommand, success: true, output: altResult.stdout, alternative: true });
              console.log(`✅ Alternative command succeeded: ${altCommand.split(' ')[0]}`);
              break; // Exit loop if one alternative succeeds
              
            } catch (altError) {
              results.push({ command: altCommand, success: false, error: altError.message, alternative: true });
              console.log(`❌ Alternative failed: ${altCommand.split(' ')[0]}`);
            }
          }
        } else {
          // Don't throw error immediately, try to continue with other commands
          console.log(`⚠️  Continuing with remaining commands...`);
        }
      }
    }
    }

    // Run post-installation steps (always run if they exist, even with no install commands)
    if (tool.postInstall) {
      for (const postStep of tool.postInstall) {
        await this.runPostInstallStep(postStep, tool);
      }
    }

    // Check if any commands succeeded
    const successfulCommands = results.filter(r => r.success);
    const failedCommands = results.filter(r => !r.success);
    
    if (successfulCommands.length === 0) {
      console.log(`❌ All installation commands failed for ${tool.name}`);
      console.log(`📋 Summary:`);
      failedCommands.forEach(cmd => {
        console.log(`   ❌ ${cmd.command}: ${cmd.error}`);
      });
      throw new Error(`Installation failed for ${tool.name}`);
    }
    
    // Verify installation if any commands succeeded
    console.log(`Verifying ${tool.name} installation...`);
    const isInstalled = await this.verifyInstallation(tool);
    
    if (isInstalled) {
      console.log(`✅ ${tool.name} installation verified successfully!`);
      if (failedCommands.length > 0) {
        console.log(`⚠️  Some commands failed but the tool is working:`);
        failedCommands.forEach(cmd => {
          console.log(`   ⚠️  ${cmd.command}: ${cmd.error}`);
        });
      }
    } else {
      console.log(`❌ ${tool.name} installation verification failed`);
      console.log(`📋 Command results:`);
      results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        console.log(`   ${status} ${result.command}`);
      });
      
      if (failedCommands.length > 0) {
        console.log(`\n💡 Troubleshooting suggestions:`);
        console.log(`   1. Try running the failed commands manually`);
        console.log(`   2. Check if the package is available in your package manager`);
        console.log(`   3. Update your package lists: sudo apt update`);
      }
      
      throw new Error(`Installation verification failed for ${tool.name}`);
    }

    // Stop the spinner
    installSpinner.stop();

    return {
      success: true,
      tool: toolKey,
      commands: results,
      successfulCommands: successfulCommands.length,
      failedCommands: failedCommands.length,
      verified: isInstalled,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check if dependencies are installed
   */
  async checkDependencies(dependencies) {
    for (const dep of dependencies) {
      if (!await this.isToolInstalled(dep)) {
        console.log(`Installing dependency: ${dep}...`);
        await this.installTool(dep);
        console.log(`✅ Dependency ${dep} installed`);
      } else {
        console.log(`✅ Dependency ${dep} already installed`);
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
      case 'create_node_monitor_script':
        await this.createNodeMonitorScript();
        break;
      case 'create_node_monitor_script_local':
        await this.createNodeMonitorScriptLocal();
        break;
      case 'create_sysinfo_script':
        await this.createSysinfoScript();
        break;
      case 'create_disk_monitor_script':
        await this.createDiskMonitorScript();
        break;
      case 'create_network_monitor_script':
        await this.createNetworkMonitorScript();
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
   * Create Node.js monitor script (local installation)
   */
  async createNodeMonitorScriptLocal() {
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      const scriptContent = `#!/usr/bin/env node
const si = require('systeminformation');

async function showSystemInfo() {
  try {
    console.log('🖥️  System Information');
    console.log('─'.repeat(40));

    const cpu = await si.cpu();
    const mem = await si.mem();
    const processes = await si.processes();

    console.log(\`CPU: \${cpu.manufacturer} \${cpu.brand}\`);
    console.log(\`Cores: \${cpu.cores}\`);
    console.log(\`Memory: \${(mem.total / 1024 / 1024 / 1024).toFixed(1)}GB total, \${((mem.used / mem.total) * 100).toFixed(1)}% used\`);
    console.log(\`Processes: \${processes.all} total, \${processes.running} running\`);

    console.log('\\n📊 Top 5 processes by CPU usage:');
    processes.list.slice(0, 5).forEach((proc, i) => {
      console.log(\`\${i + 1}. \${proc.name} - \${proc.cpu.toFixed(1)}% CPU, \${proc.mem.toFixed(1)}% RAM\`);
    });

  } catch (error) {
    console.error('Error getting system info:', error.message);
  }
}

showSystemInfo();
`;

      const scriptPath = path.join(process.cwd(), 'node-monitor.js');
      fs.writeFileSync(scriptPath, scriptContent);

      // Make it executable on Unix systems
      if (this.platform !== 'win32') {
        const { spawn } = require('child_process');
        const child = spawn('chmod', ['+x', scriptPath], { stdio: 'ignore' });
        await new Promise((resolve) => child.on('close', resolve));
      }

      console.log(`✅ Node.js monitor script created: ${scriptPath}`);
      console.log(`💡 Run it with: node ${scriptPath}`);

    } catch (error) {
      console.log(`⚠️  Could not create monitor script: ${error.message}`);
    }
  }

  /**
   * Create system info script (uses built-in Node.js APIs)
   */
  async createSysinfoScript() {
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      const scriptContent = `#!/usr/bin/env node
const os = require('os');

console.log('🖥️  Basic System Information');
console.log('─'.repeat(40));

console.log(\`Platform: \${os.platform()} \${os.arch()}\`);
console.log(\`OS Release: \${os.release()}\`);
console.log(\`Total Memory: \${(os.totalmem() / 1024 / 1024 / 1024).toFixed(1)} GB\`);
console.log(\`Free Memory: \${(os.freemem() / 1024 / 1024 / 1024).toFixed(1)} GB\`);
console.log(\`CPU Cores: \${os.cpus().length}\`);
console.log(\`CPU Model: \${os.cpus()[0].model}\`);
console.log(\`Uptime: \${(os.uptime() / 3600).toFixed(1)} hours\`);
console.log(\`Load Average: \${os.loadavg().map(x => x.toFixed(2)).join(', ')}\`);

console.log('\\n🏠 User Information:');
console.log(\`Username: \${os.userInfo().username}\`);
console.log(\`Home Directory: \${os.homedir()}\`);
console.log(\`Temp Directory: \${os.tmpdir()}\`);

console.log('\\n📁 Network Interfaces:');
const interfaces = os.networkInterfaces();
for (const [name, addrs] of Object.entries(interfaces)) {
  console.log(\`  \${name}:\`);
  addrs.forEach(addr => {
    if (addr.family === 'IPv4' && !addr.internal) {
      console.log(\`    \${addr.address}\`);
    }
  });
}
`;

      const scriptPath = path.join(process.cwd(), 'sysinfo.js');
      fs.writeFileSync(scriptPath, scriptContent);

      // Make it executable on Unix systems
      if (this.platform !== 'win32') {
        const { spawn } = require('child_process');
        const child = spawn('chmod', ['+x', scriptPath], { stdio: 'ignore' });
        await new Promise((resolve) => child.on('close', resolve));
      }

      console.log(`✅ System info script created: ${scriptPath}`);
      console.log(`💡 Run it with: node ${scriptPath}`);

    } catch (error) {
      console.log(`⚠️  Could not create system info script: ${error.message}`);
    }
  }

  /**
   * Create disk usage monitor script
   */
  async createDiskMonitorScript() {
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      const scriptContent = `#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');

console.log('💾 Disk Usage Monitor');
console.log('─'.repeat(40));

// Get disk usage for current directory and system info
try {
  const cwd = process.cwd();
  const stats = fs.statSync(cwd);
  const totalSpace = os.totalmem(); // This is RAM, not disk space
  const freeSpace = os.freemem();

  console.log(\`Current Directory: \${cwd}\`);

  // Get disk usage using basic Node.js APIs
  console.log(\`\\n📊 System Memory (RAM):\`);
  console.log(\`Total RAM: \${(totalSpace / 1024 / 1024 / 1024).toFixed(1)} GB\`);
  console.log(\`Free RAM: \${(freeSpace / 1024 / 1024 / 1024).toFixed(1)} GB\`);
  console.log(\`Used RAM: \${((totalSpace - freeSpace) / 1024 / 1024 / 1024).toFixed(1)} GB\`);
  console.log(\`RAM Usage: \${((1 - freeSpace / totalSpace) * 100).toFixed(1)}%\`);

  // Try to get basic directory size (limited)
  console.log(\`\\n📁 Current Directory Contents:\`);
  try {
    const files = fs.readdirSync(cwd);
    const fileCount = files.length;
    console.log(\`Files/Directories in current folder: \${fileCount}\`);

    // Show largest files in current directory
    const fileStats = files.map(file => {
      try {
        const filePath = path.join(cwd, file);
        const stat = fs.statSync(filePath);
        return { name: file, size: stat.size, isDir: stat.isDirectory() };
      } catch (e) {
        return null;
      }
    }).filter(Boolean);

    const sortedFiles = fileStats.sort((a, b) => b.size - a.size).slice(0, 10);
    console.log('\\n📄 Largest files in current directory:');
    sortedFiles.forEach((file, i) => {
      if (!file.isDir && file.size > 0) {
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);
        console.log(\`\${i + 1}. \${file.name} - \${sizeMB} MB\`);
      }
    });

  } catch (dirError) {
    console.log('Could not read directory contents');
  }

  console.log('\\n💡 For detailed disk space analysis, consider using:');
  console.log('   • df -h (Linux/macOS)');
  console.log('   • du -sh * (directory sizes)');
  console.log('   • System monitor tools');

} catch (error) {
  console.log('Error getting disk information:', error.message);
}
`;

      const scriptPath = path.join(process.cwd(), 'disk-monitor.js');
      fs.writeFileSync(scriptPath, scriptContent);

      // Make it executable on Unix systems
      if (this.platform !== 'win32') {
        const { spawn } = require('child_process');
        const child = spawn('chmod', ['+x', scriptPath], { stdio: 'ignore' });
        await new Promise((resolve) => child.on('close', resolve));
      }

      console.log(`✅ Disk monitor script created: ${scriptPath}`);
      console.log(`💡 Run it with: node ${scriptPath}`);

    } catch (error) {
      console.log(`⚠️  Could not create disk monitor script: ${error.message}`);
    }
  }

  /**
   * Create network monitor script
   */
  async createNetworkMonitorScript() {
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');

      const scriptContent = `#!/usr/bin/env node
const os = require('os');

console.log('🌐 Network Monitor');
console.log('─'.repeat(40));

const interfaces = os.networkInterfaces();

console.log('📡 Network Interfaces:');
let interfaceCount = 0;

for (const [name, addrs] of Object.entries(interfaces)) {
  interfaceCount++;
  console.log(\`\\n\${interfaceCount}. \${name}:\`);

  if (!addrs || addrs.length === 0) {
    console.log('   No addresses configured');
    continue;
  }

  addrs.forEach((addr, index) => {
    const type = addr.family === 'IPv4' ? 'IPv4' : 'IPv6';
    const internal = addr.internal ? '(internal)' : '';

    if (addr.family === 'IPv4') {
      console.log(\`   \${type}: \${addr.address} \${internal}\`);
      if (addr.netmask) {
        console.log(\`   Netmask: \${addr.netmask}\`);
      }
    } else if (addr.family === 'IPv6') {
      console.log(\`   \${type}: \${addr.address} \${internal}\`);
    }
  });

  // Try to get interface status (limited info available)
  console.log(\`   Status: \${addrs.some(addr => !addr.internal) ? 'Active' : 'Internal/Localhost'}\`);
}

console.log(\`\\n📊 Summary:\`);
console.log(\`Total interfaces: \${interfaceCount}\`);
console.log(\`Active external interfaces: \${Object.values(interfaces).filter(addrs => addrs && addrs.some(addr => !addr.internal)).length}\`);

console.log('\\n💡 For advanced network monitoring, consider:');
console.log('   • ping -c 4 google.com (connectivity test)');
console.log('   • netstat -tuln (open ports)');
console.log('   • ifconfig or ip addr (detailed interface info)');
console.log('   • System network monitoring tools');
`;

      const scriptPath = path.join(process.cwd(), 'network-monitor.js');
      fs.writeFileSync(scriptPath, scriptContent);

      // Make it executable on Unix systems
      if (this.platform !== 'win32') {
        const { spawn } = require('child_process');
        const child = spawn('chmod', ['+x', scriptPath], { stdio: 'ignore' });
        await new Promise((resolve) => child.on('close', resolve));
      }

      console.log(`✅ Network monitor script created: ${scriptPath}`);
      console.log(`💡 Run it with: node ${scriptPath}`);

    } catch (error) {
      console.log(`⚠️  Could not create network monitor script: ${error.message}`);
    }
  }

  /**
   * Create Node.js monitor script
   */
  async createNodeMonitorScript() {
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      const scriptContent = `#!/usr/bin/env node
const si = require('systeminformation');

async function showSystemInfo() {
  try {
    console.log('🖥️  System Information');
    console.log('─'.repeat(40));
    
    const cpu = await si.cpu();
    const mem = await si.mem();
    const processes = await si.processes();
    
    console.log(\`CPU: \${cpu.manufacturer} \${cpu.brand}\`);
    console.log(\`Cores: \${cpu.cores}\`);
    console.log(\`Memory: \${(mem.total / 1024 / 1024 / 1024).toFixed(1)}GB total, \${((mem.used / mem.total) * 100).toFixed(1)}% used\`);
    console.log(\`Processes: \${processes.all} total, \${processes.running} running\`);
    
    console.log('\\n📊 Top 5 processes by CPU usage:');
    processes.list.slice(0, 5).forEach((proc, i) => {
      console.log(\`\${i + 1}. \${proc.name} - \${proc.cpu.toFixed(1)}% CPU, \${proc.mem.toFixed(1)}% RAM\`);
    });
    
  } catch (error) {
    console.error('Error getting system info:', error.message);
  }
}

showSystemInfo();
`;

      const scriptPath = path.join(os.homedir(), 'node-monitor.js');
      fs.writeFileSync(scriptPath, scriptContent);
      
      // Make it executable on Unix systems
      if (this.platform !== 'win32') {
        const { exec } = require('child_process');
        await exec(`chmod +x ${scriptPath}`);
      }
      
      console.log(`✅ Node.js monitor script created: ${scriptPath}`);
      console.log(`💡 Run it with: node ${scriptPath}`);
      
    } catch (error) {
      console.log(`⚠️  Could not create monitor script: ${error.message}`);
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
    const results = [];
    const availableTools = this.getAvailableToolsForPlatform();

    console.log(`\n📋 Available tools for ${this.getPlatformName()}: ${availableTools.length}\n`);

    for (const [toolKey, tool] of Object.entries(this.availableTools)) {
      // Only check tools available for current platform
      if (!tool.platformSupport.includes(this.platform)) {
        continue;
      }

      const isInstalled = await this.isToolInstalled(toolKey);
      const status = isInstalled ? '✅' : '❌';

      console.log(`${status} ${tool.name}`);

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
    try {
      const updateCommands = this.getUpdateCommands();

      console.log(`Found ${Object.keys(updateCommands).length} package managers to update`);

      for (const [manager, command] of Object.entries(updateCommands)) {
        console.log(`Updating ${manager}...`);

        try {
          await exec(command);
          console.log(`✅ ${manager} updated successfully`);
        } catch (error) {
          console.warn(`⚠️  Failed to update ${manager}:`, error.message);
        }
      }

      console.log('✅ Package managers update completed');

    } catch (error) {
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
      console.log('   • Chocolatey package manager');
      console.log('   • Administrator privileges');
      if (tool.dependencies && tool.dependencies.length > 0) {
        console.log(`   • Dependencies: ${tool.dependencies.join(', ')}`);
      }
      
      console.log(`\n💡 Windows Users: If Chocolatey is not installed, run this command in PowerShell as Administrator:`);
      console.log(`   Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))`);
    } else if (this.platform === 'linux') {
      console.log(`📋 Prerequisites for ${tool.name} on Linux:`);
      console.log('   • sudo privileges (you may be prompted for password)');
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

      console.log(`✅ Tool status exported to: ${exportPath}`);
    } catch (error) {
      console.error('❌ Failed to export tool status:', error.message);
      throw error;
    }
  }

  /**
   * Show installation history and logs
   */
  async showInstallationHistory() {
    try {
      const logPath = path.join(process.cwd(), 'tool-installation-status.json');

      if (!await fs.pathExists(logPath)) {
        console.log('💡 No installation history found. Run some tool installations first to generate history');
        return this.showInterface();
      }

      const historyData = JSON.parse(await fs.readFile(logPath, 'utf8'));

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
    try {
      const logPath = path.join(process.cwd(), 'tool-installation-status.json');

      if (await fs.pathExists(logPath)) {
        await fs.unlink(logPath);
        console.log('✅ Installation history cleared');
      } else {
        console.log('ℹ️  No history file found to clear');
      }
    } catch (error) {
      console.error('❌ Error clearing history:', error.message);
    }

    await this.showInstallationHistory();
  }
}

module.exports = ToolManager;