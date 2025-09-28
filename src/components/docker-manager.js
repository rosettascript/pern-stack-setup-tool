/**
 * PERN Setup Tool - Docker Manager
 * Handles Docker installation, configuration, and container management
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

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
          choices: [
            '1. Download Docker',
            '2. Setup Docker',
            '3. Go back'
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
          return this.setup.showMainInterface();
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
      await this.setup.safety.safeExecute('docker-download', {}, async () => {
        if (this.platform === 'linux') {
          await exec('curl -fsSL https://get.docker.com | sh');
        } else if (this.platform === 'darwin') {
          console.log('📥 Download Docker Desktop from: https://docs.docker.com/desktop/install/mac-install/');
          console.log('Run the installer and follow the setup wizard');
        } else if (this.platform === 'win32') {
          console.log('📥 Download Docker Desktop from: https://docs.docker.com/desktop/install/windows-install/');
          console.log('Run Docker Desktop Installer as Administrator');
        }

        this.setup.state.completedComponents.add('docker');
        console.log('✅ Docker downloaded successfully');
      });

    } catch (error) {
      await this.setup.handleError('docker-download', error);
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
          message: 'Select setup type:',
          choices: [
            '1. Automatic setup',
            '2. Manual setup',
            '3. Go back'
          ]
        }
      ]);

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.automaticSetup();
          break;
        case 2:
          await this.manualSetup();
          break;
        case 3:
          return this.showInterface();
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
      await this.setup.safety.safeExecute('docker-automatic-setup', {
        backup: true,
        targetPath: '/etc/docker/daemon.json'
      }, async () => {
        console.log('Setting up Docker automatically...');
        console.log('The script will:');
        console.log('- Install Docker Engine');
        console.log('- Install Docker Compose');
        console.log('- Add current user to docker group');
        console.log('- Enable Docker service on startup');
        console.log('- Create default network: pern_network');

        if (this.platform === 'linux') {
          // Install Docker
          await exec('curl -fsSL https://get.docker.com | sh');

          // Install Docker Compose
          await exec('sudo apt install docker-compose-plugin -y');

          // Add user to docker group
          await exec(`sudo usermod -aG docker ${os.userInfo().username}`);

          // Enable Docker service
          await exec('sudo systemctl enable docker');
          await exec('sudo systemctl start docker');

          // Create default network
          await exec('docker network create pern_network');

        } else if (this.platform === 'darwin') {
          console.log('🐳 Docker Desktop should be installed manually on macOS');
          console.log('📥 Download from: https://docs.docker.com/desktop/install/mac-install/');
        } else if (this.platform === 'win32') {
          console.log('🐳 Docker Desktop should be installed manually on Windows');
          console.log('📥 Download from: https://docs.docker.com/desktop/install/windows-install/');
        }

        // Update configuration
        this.config.set('docker.networks', ['pern_network']);
        this.config.set('docker.volumes', []);
        this.config.set('docker.composeFile', 'docker-compose.yml');

        this.setup.state.completedComponents.add('docker');
        console.log('✅ Docker automatic setup completed');
        console.log('⚠️  Please log out and log back in for group changes to take effect (Linux/macOS)');
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
        choices: [
          '1. Install Docker Engine only',
          '2. Install Docker Compose only',
          '3. Configure Docker daemon',
          '4. Setup Docker networks',
          '5. Setup Docker volumes',
          '6. Go back'
        ]
      });

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
        case 6:
          return this.setupInterface();
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
      await this.setup.safety.safeExecute('docker-engine-install', {}, async () => {
        if (this.platform === 'linux') {
          await exec('curl -fsSL https://get.docker.com | sh');
          await exec('sudo systemctl enable docker');
          await exec('sudo systemctl start docker');
        }

        console.log('✅ Docker Engine installed');
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
      await this.setup.safety.safeExecute('docker-compose-install', {}, async () => {
        if (this.platform === 'linux') {
          await exec('sudo apt install docker-compose-plugin -y');
        }

        console.log('✅ Docker Compose installed');
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
      const { logLevel } = await inquirer.prompt({
        type: 'list',
        name: 'logLevel',
        message: 'Docker daemon log level:',
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
        targetPath: '/etc/docker/daemon.json'
      }, async () => {
        const configPath = '/etc/docker/daemon.json';
        await fs.writeFile(configPath, JSON.stringify(daemonConfig, null, 2));

        // Restart Docker daemon
        if (this.platform === 'linux') {
          await exec('sudo systemctl restart docker');
        }

        this.config.set('docker.daemon', daemonConfig);
        console.log('✅ Docker daemon configured');
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
      const { networkName } = await inquirer.prompt({
        type: 'input',
        name: 'networkName',
        message: 'Enter network name:',
        default: 'pern_network'
      });

      await this.setup.safety.safeExecute('docker-network-setup', {
        networkName
      }, async () => {
        await exec(`docker network create ${networkName}`);

        // Update configuration
        const networks = this.config.get('docker.networks', []);
        networks.push(networkName);
        this.config.set('docker.networks', networks);

        console.log(`✅ Docker network created: ${networkName}`);
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
      const { volumeName } = await inquirer.prompt({
        type: 'input',
        name: 'volumeName',
        message: 'Enter volume name:',
        default: 'pern_data'
      });

      await this.setup.safety.safeExecute('docker-volume-setup', {
        volumeName
      }, async () => {
        await exec(`docker volume create ${volumeName}`);

        // Update configuration
        const volumes = this.config.get('docker.volumes', []);
        volumes.push(volumeName);
        this.config.set('docker.volumes', volumes);

        console.log(`✅ Docker volume created: ${volumeName}`);
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