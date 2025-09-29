/**
 * PERN Setup Tool - Docker Manager
 * Handles Docker installation, configuration, and container management
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const ora = require('ora');
const ProjectDiscovery = require('../utils/project-discovery');

/**
 * Docker Manager Class
 * Manages Docker installation and configuration
 */
class DockerManager {
  constructor(setupTool) {
    this.setup = setupTool;
    this.logger = setupTool.logger;
    this.safety = setupTool.safety;
    this.config = setupTool.config;
    this.platform = process.platform;
    this.projectDiscovery = new ProjectDiscovery();
  }

  /**
   * Show Docker interface
   */
  async showInterface() {
    try {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Docker Section',
          loop: false,
        choices: [
            '1. Download Docker',
            '2. Setup Docker',
            new inquirer.Separator(),
            {
              name: 'Go back',
              value: 'go_back',
              checked: false
            }
          ]
        }
      ]);

      if (choice === 'go_back') {
        return this.setup.showMainInterface();
      }

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.download();
          break;
        case 2:
          await this.setupInterface();
          break;
      }

    } catch (error) {
      await this.setup.handleError('docker-interface', error);
    }
  }

  /**
   * Download Docker
   */
  async download() {
    try {
      await this.setup.safety.safeExecute('docker-download', {
        version: '24.0',
        platform: this.platform
      }, async () => {
        console.log('🔧 Starting Docker download and installation...');
        console.log('📝 This may take a few minutes depending on your internet connection');
        
        if (this.platform === 'linux') {
          console.log('🐧 Installing Docker on Linux...');
          
          const dockerSpinner = ora('📦 Installing Docker using official script...').start();
          console.log('⏳ This may take 3-7 minutes...');
          await exec('curl -fsSL https://get.docker.com | sh');
          dockerSpinner.succeed('✅ Docker installation completed on Linux');
        } else if (this.platform === 'darwin') {
          console.log('🍎 Installing Docker on macOS...');
          console.log('📥 Download Docker Desktop from: https://docs.docker.com/desktop/install/mac-install/');
          console.log('📝 Run the installer and follow the setup wizard');
          console.log('⏳ This may take 5-10 minutes...');
        } else if (this.platform === 'win32') {
          console.log('🪟 Installing Docker on Windows...');
          console.log('📥 Download Docker Desktop from: https://docs.docker.com/desktop/install/windows-install/');
          console.log('📝 Run Docker Desktop Installer as Administrator');
          console.log('⏳ This may take 5-10 minutes...');
        }

        this.setup.state.completedComponents.add('docker');
        console.log('✅ Docker downloaded successfully');
        
        return {
          success: true,
          version: '24.0',
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
      });

    } catch (error) {
      await this.setup.handleError('docker-download', error);
    }

    await this.setup.showMainInterface();
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
          message: 'Select setup type:',
          loop: false,
        choices: [
            '1. Automatic setup',
            '2. Manual setup',
            new inquirer.Separator(),
            {
              name: 'Go back',
              value: 'go_back',
              checked: false
            }
          ]
        }
      ]);

      if (choice === 'go_back') {
        return this.showInterface();
      }

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.automaticSetup();
          break;
        case 2:
          await this.manualSetup();
          break;
      }

    } catch (error) {
      await this.setup.handleError('docker-setup-interface', error);
    }
  }

  /**
   * Automatic Docker setup
   */
  async automaticSetup() {
    try {
      // Let user select project for Docker setup
      const projectDir = await this.projectDiscovery.selectProject('Select project for Docker automatic setup:');
      
      if (projectDir === 'GO_BACK') {
        return this.showInterface();
      }
      
      console.log(`📁 Selected project: ${projectDir}`);

      await this.setup.safety.safeExecute('docker-automatic-setup', {
        backup: true,
        targetPath: '/etc/docker/daemon.json',
        platform: this.platform,
        projectDir
      }, async () => {
        console.log('🔧 Starting automatic Docker setup...');
        console.log(`📁 Project directory: ${projectDir}`);
        console.log('📝 This will take several minutes depending on your internet connection');
        console.log('📋 The script will:');
        console.log('  - Install Docker Engine');
        console.log('  - Install Docker Compose');
        console.log('  - Add current user to docker group');
        console.log('  - Enable Docker service on startup');
        console.log('  - Create project-specific network and configuration');

        if (this.platform === 'linux') {
          console.log('🐧 Setting up Docker on Linux...');
          
          // Install Docker
          console.log('🔄 Step 1/5: Installing Docker Engine...');
          const dockerSpinner = ora('📦 Installing Docker Engine using official script...').start();
          console.log('⏳ This may take 3-7 minutes...');
          await exec('curl -fsSL https://get.docker.com | sh');
          dockerSpinner.succeed('✅ Docker Engine installation completed');

          // Install Docker Compose
          console.log('🔄 Step 2/5: Installing Docker Compose...');
          const composeSpinner = ora('📦 Installing Docker Compose plugin...').start();
          console.log('⏳ This may take 1-3 minutes...');
          await exec('sudo apt install docker-compose-plugin -y');
          composeSpinner.succeed('✅ Docker Compose installation completed');

          // Add user to docker group
          console.log('🔄 Step 3/5: Adding user to docker group...');
          const userSpinner = ora('👤 Adding current user to docker group...').start();
          await exec(`sudo usermod -aG docker ${os.userInfo().username}`);
          userSpinner.succeed('✅ User added to docker group');

          // Enable Docker service
          console.log('🔄 Step 4/5: Enabling Docker service...');
          const serviceSpinner = ora('🔄 Enabling and starting Docker service...').start();
          try {
            await exec('sudo systemctl enable docker');
            await exec('sudo systemctl start docker');
            serviceSpinner.succeed('✅ Docker service enabled and started');
          } catch (error) {
            serviceSpinner.warn('⚠️  Docker service may already be running');
          }

          // Create project-specific network and configuration
          console.log('🔄 Step 5/5: Creating project-specific network and configuration...');
          const networkSpinner = ora('🌐 Creating project-specific Docker network...').start();
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for Docker to be ready
          
          const projectName = path.basename(projectDir);
          const networkName = `${projectName}_network`;
          
          try {
            await exec(`sudo docker network create ${networkName}`);
            networkSpinner.succeed(`✅ Project network created: ${networkName}`);
          } catch (error) {
            if (error.message.includes(`network with name ${networkName} already exists`)) {
              networkSpinner.succeed(`✅ Project network already exists: ${networkName}`);
            } else {
              networkSpinner.fail(`❌ Failed to create network: ${networkName}`);
              throw error;
            }
          }

          // Create project-specific docker-compose.yml
          console.log('🔄 Creating project-specific Docker configuration...');
          const configSpinner = ora('📝 Creating Docker Compose files...').start();
          
          // Ensure project directory exists
          await fs.ensureDir(projectDir);
          
          // Create docker-compose.yml
          const composeContent = `version: '3.8'

networks:
  ${networkName}:
    external: true

services:
  # Add your services here
  # Example:
  # app:
  #   image: node:18
  #   networks:
  #     - ${networkName}
  #   volumes:
  #     - .:/app
  #   working_dir: /app
  #   ports:
  #     - "3000:3000"
`;

          // Create docker-compose.override.yml
          const overrideContent = `version: '3.8'

# Docker Compose override for project-specific settings
# This file extends the main docker-compose.yml with project-specific configurations

# You can override Docker daemon settings here if needed
# Example:
# services:
#   your-service:
#     logging:
#       driver: json-file
#       options:
#         max-size: "10m"
#         max-file: "3"
`;

          await fs.writeFile(path.join(projectDir, 'docker-compose.yml'), composeContent);
          await fs.writeFile(path.join(projectDir, 'docker-compose.override.yml'), overrideContent);
          
          configSpinner.succeed('✅ Project-specific Docker configuration created');

        } else if (this.platform === 'darwin') {
          console.log('🐳 Docker Desktop should be installed manually on macOS');
          console.log('📥 Download from: https://docs.docker.com/desktop/install/mac-install/');
        } else if (this.platform === 'win32') {
          console.log('🐳 Docker Desktop should be installed manually on Windows');
          console.log('📥 Download from: https://docs.docker.com/desktop/install/windows-install/');
        }

        // Update configuration with project-specific settings
        const projectName = path.basename(projectDir);
        const networkName = `${projectName}_network`;
        
        this.config.set('docker.networks', [networkName]);
        this.config.set('docker.volumes', []);
        this.config.set('docker.composeFile', 'docker-compose.yml');
        this.config.set('docker.projectDir', projectDir);

        this.setup.state.completedComponents.add('docker');
        console.log('🎉 Docker automatic setup completed successfully!');
        console.log(`✅ Project network created: ${networkName}`);
        console.log(`✅ Docker Compose files created in: ${projectDir}`);
        console.log('📝 Note: You may need to log out and log back in for docker group changes to take effect');
        
        return {
          success: true,
          platform: this.platform,
          projectDir,
          networks: [networkName],
          volumes: [],
          timestamp: new Date().toISOString()
        };
      });

    } catch (error) {
      await this.setup.handleError('docker-automatic-setup', error);
    }

    await this.setup.showMainInterface();
  }

  /**
   * Manual Docker setup
   */
  async manualSetup() {
    try {
      const { setupType } = await inquirer.prompt({
        type: 'list',
        name: 'setupType',
        message: 'Select manual setup type:',
        loop: false,
        choices: [
          '1. Install Docker Engine only',
          '2. Install Docker Compose only',
          '3. Configure Docker daemon',
          '4. Setup Docker networks',
          '5. Setup Docker volumes',
          new inquirer.Separator(),
          {
            name: 'Go back',
            value: 'go_back',
            checked: false
          }
        ]
      });

      if (setupType === 'go_back') {
        return this.setupInterface();
      }

      const selected = parseInt(setupType.split('.')[0]);

      switch(selected) {
        case 1:
          await this.installDockerEngine();
          break;
        case 2:
          await this.installDockerCompose();
          break;
        case 3:
          await this.configureDockerDaemon();
          break;
        case 4:
          await this.setupDockerNetworks();
          break;
        case 5:
          await this.setupDockerVolumes();
          break;
      }

    } catch (error) {
      await this.setup.handleError('docker-manual-setup', error);
    }

    await this.setupInterface();
  }

  /**
   * Install Docker Engine only
   */
  async installDockerEngine() {
    try {
      await this.setup.safety.safeExecute('docker-engine-install', {
        platform: this.platform
      }, async () => {
        console.log('🔧 Installing Docker Engine...');
        console.log('📝 This may take a few minutes depending on your internet connection');
        
        if (this.platform === 'linux') {
          console.log('🐧 Installing Docker Engine on Linux...');
          
          const dockerSpinner = ora('📦 Installing Docker Engine using official script...').start();
          console.log('⏳ This may take 3-7 minutes...');
          await exec('curl -fsSL https://get.docker.com | sh');
          dockerSpinner.succeed('✅ Docker Engine installation completed');
          
          console.log('🔄 Enabling Docker service...');
          try {
            await exec('sudo systemctl enable docker');
            console.log('✅ Docker service enabled');
          } catch (error) {
            console.log('⚠️  Docker service may already be enabled');
          }
          
          console.log('🔄 Starting Docker service...');
          try {
            await exec('sudo systemctl start docker');
            console.log('✅ Docker service started');
          } catch (error) {
            console.log('⚠️  Docker service may already be running');
          }
        }

        console.log('✅ Docker Engine installed');
        
        // Mark Docker as completed in setup state
        this.setup.state.completedComponents.add('docker');
        
        return {
          success: true,
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('docker-engine-install', error);
    }
  }

  /**
   * Install Docker Compose only
   */
  async installDockerCompose() {
    try {
      await this.setup.safety.safeExecute('docker-compose-install', {
        platform: this.platform
      }, async () => {
        console.log('🔧 Installing Docker Compose...');
        console.log('📝 This may take a few minutes depending on your internet connection');
        
        if (this.platform === 'linux') {
          console.log('🐧 Installing Docker Compose on Linux...');
          
          const composeSpinner = ora('📦 Installing Docker Compose plugin...').start();
          console.log('⏳ This may take 1-3 minutes...');
          await exec('sudo apt install docker-compose-plugin -y');
          composeSpinner.succeed('✅ Docker Compose installation completed');
        }

        console.log('✅ Docker Compose installed');
        
        return {
          success: true,
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('docker-compose-install', error);
    }
  }

  /**
   * Configure Docker daemon
   */
  async configureDockerDaemon() {
    try {
      // Let user select project for Docker daemon configuration
      const projectDir = await this.projectDiscovery.selectProject('Select project for Docker daemon configuration:');
      
      if (projectDir === 'GO_BACK') {
        return this.showInterface();
      }
      
      console.log(`📁 Selected project: ${projectDir}`);

      const { logLevel } = await inquirer.prompt({
        type: 'list',
        name: 'logLevel',
        message: 'Docker daemon log level:',
        loop: false,
        choices: ['debug', 'info', 'warn', 'error'],
        default: 'info'
      });

      const daemonConfig = {
        'log-level': logLevel,
        'storage-driver': 'overlay2',
        'log-driver': 'json-file',
        'log-opts': {
          'max-size': '10m',
          'max-file': '3'
        }
      };

      await this.setup.safety.safeExecute('docker-daemon-config', {
        backup: true,
        targetPath: '/etc/docker/daemon.json',
        platform: this.platform,
        projectDir
      }, async () => {
        console.log('🔧 Configuring Docker daemon for project...');
        console.log(`📁 Project directory: ${projectDir}`);
        console.log('📝 You may be prompted for sudo password to update Docker configuration');
        
        // Create project-specific daemon configuration
        const projectConfigPath = path.join(projectDir, 'docker-daemon.json');
        const globalConfigPath = '/etc/docker/daemon.json';
        const configContent = JSON.stringify(daemonConfig, null, 2);
        
        // Create project-specific configuration file
        console.log('🔄 Creating project-specific Docker daemon configuration...');
        await fs.writeFile(projectConfigPath, configContent);
        
        // Also create a backup of global configuration if it exists
        console.log('🔄 Creating backup of global Docker daemon configuration...');
        await exec(`sudo cp ${globalConfigPath} ${globalConfigPath}.backup.${Date.now()} 2>/dev/null || true`);
        
        // Update global configuration for current session
        console.log('🔄 Updating global Docker daemon configuration...');
        await exec(`echo '${configContent}' | sudo tee ${globalConfigPath} > /dev/null`);

        // Create a docker-compose override for project-specific settings
        const composeOverride = `version: '3.8'

# Docker Compose override for project-specific daemon settings
# This file extends the main docker-compose.yml with project-specific configurations

# You can override Docker daemon settings here if needed
# Example:
# services:
#   your-service:
#     logging:
#       driver: json-file
#       options:
#         max-size: "10m"
#         max-file: "3"
`;

        const overridePath = path.join(projectDir, 'docker-compose.override.yml');
        await fs.writeFile(overridePath, composeOverride);

        // Restart Docker daemon
        if (this.platform === 'linux') {
          console.log('🔄 Restarting Docker daemon...');
          try {
            await exec('sudo systemctl restart docker');
            console.log('✅ Docker daemon restarted');
          } catch (error) {
            console.log('⚠️  Docker daemon restart failed, trying to start...');
            try {
              await exec('sudo systemctl start docker');
              console.log('✅ Docker daemon started');
            } catch (startError) {
              console.log('⚠️  Docker daemon may already be running');
            }
          }
        }

        // Update configuration
        this.config.set('docker.daemon', daemonConfig);
        this.config.set('docker.projectDir', projectDir);
        
        console.log('✅ Docker daemon configured for project');
        console.log(`✅ Project-specific config created: ${projectConfigPath}`);
        console.log(`✅ Docker Compose override created: ${overridePath}`);
        
        // Mark Docker as completed in setup state
        this.setup.state.completedComponents.add('docker');
        
        return {
          success: true,
          platform: this.platform,
          projectDir,
          projectConfigPath,
          globalConfigPath,
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('docker-daemon-config', error);
    }
  }

  /**
   * Setup Docker networks
   */
  async setupDockerNetworks() {
    try {
      // Let user select project for Docker configuration
      const projectDir = await this.projectDiscovery.selectProject('Select project for Docker network setup:');
      
      if (projectDir === 'GO_BACK') {
        return this.showInterface();
      }
      
      console.log(`📁 Selected project: ${projectDir}`);

      const { networkName } = await inquirer.prompt({
        type: 'input',
        name: 'networkName',
        message: 'Enter network name:',
        default: 'pern_network'
      });

      await this.setup.safety.safeExecute('docker-network-setup', {
        networkName,
        projectDir
      }, async () => {
        console.log('🔧 Creating Docker network...');
        console.log(`📁 Project directory: ${projectDir}`);
        console.log('📝 You may be prompted for sudo password to start Docker and create network');
        
        // Ensure project directory exists
        await exec(`mkdir -p "${projectDir}"`);
        
        // Start Docker daemon first
        console.log('🔄 Starting Docker daemon...');
        try {
          await exec('sudo systemctl start docker');
          console.log('✅ Docker daemon started');
        } catch (error) {
          console.log('⚠️  Docker daemon may already be running');
        }
        
        // Wait a moment for Docker to fully start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await exec(`sudo docker network create ${networkName}`);

        // Create docker-compose.yml in project directory
        const composeContent = `version: '3.8'

networks:
  ${networkName}:
    external: true

services:
  # Add your services here
  # Example:
  # app:
  #   image: node:18
  #   networks:
  #     - ${networkName}
  #   volumes:
  #     - .:/app
  #   working_dir: /app
`;

        const fs = require('fs').promises;
        await fs.writeFile(`${projectDir}/docker-compose.yml`, composeContent);

        // Update configuration
        const networks = this.config.get('docker.networks', []);
        networks.push(networkName);
        this.config.set('docker.networks', networks);
        this.config.set('docker.projectDir', projectDir);

        console.log(`✅ Docker network created: ${networkName}`);
        console.log(`✅ Docker Compose file created: ${projectDir}/docker-compose.yml`);
        
        // Mark Docker as completed in setup state
        this.setup.state.completedComponents.add('docker');
        
        return {
          success: true,
          networkName,
          projectDir,
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('docker-network-setup', error);
    }
  }

  /**
   * Setup Docker volumes
   */
  async setupDockerVolumes() {
    try {
      // Let user select project for Docker configuration
      const projectDir = await this.projectDiscovery.selectProject('Select project for Docker volume setup:');
      
      if (projectDir === 'GO_BACK') {
        return this.showInterface();
      }
      
      console.log(`📁 Selected project: ${projectDir}`);

      const { volumeName } = await inquirer.prompt({
        type: 'input',
        name: 'volumeName',
        message: 'Enter volume name:',
        default: 'pern_data'
      });

      await this.setup.safety.safeExecute('docker-volume-setup', {
        volumeName,
        projectDir
      }, async () => {
        console.log('🔧 Creating Docker volume...');
        console.log(`📁 Project directory: ${projectDir}`);
        console.log('📝 You may be prompted for sudo password to start Docker and create volume');
        
        // Ensure project directory exists
        await exec(`mkdir -p "${projectDir}"`);
        
        // Start Docker daemon first
        console.log('🔄 Starting Docker daemon...');
        try {
          await exec('sudo systemctl start docker');
          console.log('✅ Docker daemon started');
        } catch (error) {
          console.log('⚠️  Docker daemon may already be running');
        }
        
        // Wait a moment for Docker to fully start
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await exec(`sudo docker volume create ${volumeName}`);

        // Update configuration
        const volumes = this.config.get('docker.volumes', []);
        volumes.push(volumeName);
        this.config.set('docker.volumes', volumes);
        this.config.set('docker.projectDir', projectDir);

        console.log(`✅ Docker volume created: ${volumeName}`);
        
        // Mark Docker as completed in setup state
        this.setup.state.completedComponents.add('docker');
        
        return {
          success: true,
          volumeName,
          projectDir,
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('docker-volume-setup', error);
    }
  }

  /**
   * Start Docker service
   */
  async start() {
    try {
      if (this.platform === 'linux') {
        await exec('sudo systemctl start docker');
      } else if (this.platform === 'darwin') {
        await exec('brew services start docker');
      }

      console.log('✅ Docker service started');
    } catch (error) {
      console.error('❌ Failed to start Docker:', error.message);
      throw error;
    }
  }

  /**
   * Stop Docker service
   */
  async stop() {
    try {
      if (this.platform === 'linux') {
        await exec('sudo systemctl stop docker');
      } else if (this.platform === 'darwin') {
        await exec('brew services stop docker');
      }

      console.log('✅ Docker service stopped');
    } catch (error) {
      console.error('❌ Failed to stop Docker:', error.message);
      throw error;
    }
  }

  /**
   * Check Docker status
   */
  async getStatus() {
    try {
      const Docker = require('dockerode');
      const docker = new Docker();

      await docker.info();
      return 'running';
    } catch (error) {
      return 'stopped';
    }
  }

  /**
   * Test Docker installation
   */
  async testInstallation() {
    try {
      const Docker = require('dockerode');
      const docker = new Docker();

      const info = await docker.info();
      const version = await docker.version();

      return {
        success: true,
        info: {
          serverVersion: info.ServerVersion,
          containers: info.Containers,
          containersRunning: info.ContainersRunning,
          containersPaused: info.ContainersPaused,
          containersStopped: info.ContainersStopped,
          images: info.Images,
          driver: info.Driver,
          memory: info.MemTotal,
          cpus: info.NCPU
        }
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Create Docker Compose file
   */
  async createDockerCompose(services = ['postgres', 'redis', 'app']) {
    try {
      const composeConfig = {
        version: '3.8',
        services: {},
        networks: {
          pern_network: {
            driver: 'bridge'
          }
        },
        volumes: {
          postgres_data: {},
          redis_data: {}
        }
      };

      // Add PostgreSQL service
      if (services.includes('postgres')) {
        composeConfig.services.postgres = {
          image: 'postgres:15',
          environment: {
            POSTGRES_PASSWORD: this.config.get('database.password', '1234'),
            POSTGRES_DB: this.config.get('database.name', 'postgres'),
            POSTGRES_USER: this.config.get('database.username', 'postgres')
          },
          volumes: ['postgres_data:/var/lib/postgresql/data'],
          networks: ['pern_network'],
          ports: ['5432:5432']
        };
      }

      // Add Redis service
      if (services.includes('redis')) {
        composeConfig.services.redis = {
          image: 'redis:7-alpine',
          command: `redis-server --requirepass ${this.config.get('redis.password', 'redis1234')}`,
          volumes: ['redis_data:/data'],
          networks: ['pern_network'],
          ports: ['6379:6379']
        };
      }

      // Add application service
      if (services.includes('app')) {
        composeConfig.services.app = {
          build: '.',
          environment: {
            NODE_ENV: 'production',
            DATABASE_URL: `postgresql://${this.config.get('database.username', 'postgres')}:${this.config.get('database.password', '1234')}@postgres:5432/${this.config.get('database.name', 'postgres')}`,
            REDIS_URL: `redis://:${this.config.get('redis.password', 'redis1234')}@redis:6379`,
            PORT: 5000
          },
          depends_on: ['postgres', 'redis'],
          networks: ['pern_network'],
          ports: ['5000:5000']
        };
      }

      const composePath = 'docker-compose.yml';
      await fs.writeFile(composePath, JSON.stringify(composeConfig, null, 2));

      console.log(`✅ Docker Compose file created: ${composePath}`);
      return composePath;
    } catch (error) {
      console.error('❌ Docker Compose creation failed:', error.message);
      throw error;
    }
  }
}

module.exports = DockerManager;