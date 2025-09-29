/**
 * PERN Setup Tool - Redis Manager
 * Handles Redis installation, configuration, and management
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const ora = require('ora');
const ProjectDiscovery = require('../utils/project-discovery');

/**
 * Redis Manager Class
 * Manages Redis installation and configuration
 */
class RedisManager {
  constructor(setupTool) {
    this.setup = setupTool;
    this.logger = setupTool.logger;
    this.safety = setupTool.safety;
    this.config = setupTool.config;
    this.platform = process.platform;
    this.projectDiscovery = new ProjectDiscovery();
  }

  /**
   * Show Redis interface
   */
  async showInterface() {
    try {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Redis Section',
          loop: false,
        choices: [
            '1. Download Redis',
            '2. Setup Redis',
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
      await this.setup.handleError('redis-interface', error);
    }
  }

  /**
   * Download Redis
   */
  async download() {
    try {
      await this.setup.safety.safeExecute('redis-download', {
        version: '7.0',
        platform: this.platform
      }, async () => {
        console.log('🔧 Starting Redis download and installation...');
        console.log('📝 This may take a few minutes depending on your internet connection');
        
        if (this.platform === 'linux') {
          console.log('🐧 Installing Redis on Linux...');
          
          const updateSpinner = ora('📦 Updating package lists...').start();
          await exec('sudo apt update');
          updateSpinner.succeed('✅ Package lists updated');
          
          const installSpinner = ora('📦 Installing Redis server...').start();
          console.log('⏳ This may take 1-3 minutes...');
          await exec('sudo apt install -y redis-server');
          installSpinner.succeed('✅ Redis installation completed on Linux');
        } else if (this.platform === 'darwin') {
          console.log('🍎 Installing Redis on macOS...');
          
          const brewSpinner = ora('📦 Using Homebrew to install Redis...').start();
          console.log('⏳ This may take 2-5 minutes...');
          await exec('brew install redis');
          brewSpinner.succeed('✅ Redis installation completed on macOS');
        } else if (this.platform === 'win32') {
          console.log('🪟 Windows detected - Redis not natively supported');
          console.log('📥 Redis is not natively supported on Windows.');
          console.log('💡 Alternatives:');
          console.log('   1. Use PostgreSQL for caching');
          console.log('   2. Use Docker: docker run -d -p 6379:6379 redis');
          console.log('   3. Use WSL (Windows Subsystem for Linux)');
          return;
        }

        this.setup.state.completedComponents.add('redis');
        console.log('✅ Redis downloaded successfully');
        
        return {
          success: true,
          version: '7.0',
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
      });

    } catch (error) {
      await this.setup.handleError('redis-download', error);
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
      await this.setup.handleError('redis-setup-interface', error);
    }
  }

  /**
   * Automatic Redis setup
   */
  async automaticSetup() {
    try {
      // Let user select project for Redis configuration
      let projectDir;
      try {
        projectDir = await this.projectDiscovery.selectProject('Select project for Redis setup:');
        
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

      await this.setup.safety.safeExecute('redis-automatic-setup', {
        port: 6379,
        platform: this.platform,
        projectDir
      }, async () => {
        console.log('Setting up Redis automatically...');
        console.log('The script will auto configure:');
        console.log('- Port: 6379 (default)');
        console.log('- Password: redis1234');
        console.log('- Max Memory: 256MB');
        console.log('- Persistence: AOF enabled');
        console.log(`📁 Project directory: ${projectDir}`);

        if (this.platform === 'linux') {
          // Configure Redis
          const redisConfig = {
            port: 6379,
            requirepass: 'redis1234',
            maxmemory: '256mb',
            appendonly: 'yes'
          };

          await this.updateRedisConfig(redisConfig);

          // Start Redis service
          console.log('🔄 Starting Redis service...');
          try {
            await exec('sudo systemctl start redis');
            console.log('✅ Redis service started');
          } catch (error) {
            console.log('⚠️  Redis service may already be running');
          }

          console.log('🔄 Enabling Redis service...');
          try {
            await exec('sudo systemctl enable redis');
            console.log('✅ Redis service enabled');
          } catch (error) {
            console.log('⚠️  Redis service may already be enabled or there is a service conflict');
            console.log('💡 This is normal if Redis was previously installed');
          }

        } else if (this.platform === 'darwin') {
          await exec('brew services start redis');
        }

        // Ensure project directory exists
        await exec(`mkdir -p "${projectDir}"`);

        // Create project-specific Redis configuration file
        const redisProjectConfig = {
          host: 'localhost',
          port: 6379,
          password: 'redis1234',
          database: 0,
          maxMemory: '256mb',
          persistence: 'aof',
          projectName: path.basename(projectDir),
          projectDir: projectDir,
          connectionString: 'redis://:redis1234@localhost:6379/0'
        };

        // Write project-specific Redis config
        const configPath = path.join(projectDir, 'redis.config.js');
        const configContent = `/**
 * Redis Configuration for ${path.basename(projectDir)}
 * Generated by PERN Setup Tool
 */

module.exports = {
  redis: {
    host: '${redisProjectConfig.host}',
    port: ${redisProjectConfig.port},
    password: '${redisProjectConfig.password}',
    database: ${redisProjectConfig.database},
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true
  },
  
  // Connection string for easy use
  connectionString: '${redisProjectConfig.connectionString}',
  
  // Project info
  projectName: '${redisProjectConfig.projectName}',
  projectDir: '${redisProjectConfig.projectDir}',
  
  // Configuration details
  maxMemory: '${redisProjectConfig.maxMemory}',
  persistence: '${redisProjectConfig.persistence}'
};
`;

        await fs.writeFile(configPath, configContent);
        console.log(`✅ Project-specific Redis config created: ${configPath}`);

        // Create docker-compose.yml with Redis service if it doesn't exist
        const composePath = path.join(projectDir, 'docker-compose.yml');
        let composeExists = false;
        try {
          await fs.access(composePath);
          composeExists = true;
        } catch (error) {
          // File doesn't exist, will create it
        }

        if (!composeExists) {
          const composeContent = `version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: \${PROJECT_NAME:-${path.basename(projectDir)}}_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    command: redis-server --requirepass redis1234 --appendonly yes --maxmemory 256mb
    volumes:
      - redis_data:/data
    environment:
      - REDIS_PASSWORD=redis1234

volumes:
  redis_data:
    driver: local
`;

          await fs.writeFile(composePath, composeContent);
          console.log(`✅ Docker Compose file created with Redis service: ${composePath}`);
        } else {
          console.log(`📝 Docker Compose file already exists: ${composePath}`);
          console.log('💡 You may want to add Redis service manually to your existing docker-compose.yml');
        }

        // Update global configuration
        this.config.set('redis.host', 'localhost');
        this.config.set('redis.port', 6379);
        this.config.set('redis.password', 'redis1234');
        this.config.set('redis.maxMemory', '256mb');
        this.config.set('redis.persistence', 'aof');
        this.config.set('redis.projectDir', projectDir);

        this.setup.state.completedComponents.add('redis');
        console.log('✅ Redis automatic setup completed');
        
        return {
          success: true,
          port: 6379,
          platform: this.platform,
          projectDir,
          timestamp: new Date().toISOString()
        };
      });

    } catch (error) {
      await this.setup.handleError('redis-automatic-setup', error);
    }

    await this.setup.showMainInterface();
  }

  /**
   * Manual Redis setup
   */
  async manualSetup() {
    try {
      // Let user select project for Redis configuration
      let projectDir;
      try {
        projectDir = await this.projectDiscovery.selectProject('Select project for Redis setup:');
        
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

      const { port } = await inquirer.prompt({
        type: 'input',
        name: 'port',
        message: 'Enter Port number:',
        default: '6379',
        validate: input => !isNaN(input) && parseInt(input) > 0 || 'Port must be a positive number'
      });

      const { password } = await inquirer.prompt({
        type: 'password',
        name: 'password',
        message: 'Set Password (optional):',
        default: ''
      });

      const { maxMemory } = await inquirer.prompt({
        type: 'input',
        name: 'maxMemory',
        message: 'Configure Max Memory (MB):',
        default: '256',
        validate: input => !isNaN(input) && parseInt(input) > 0 || 'Memory must be a positive number'
      });

      const { persistence } = await inquirer.prompt({
        type: 'list',
        name: 'persistence',
        message: 'Enable Persistence:',
        loop: false,
        choices: ['RDB', 'AOF', 'Both', 'None']
      });

      const { maxClients } = await inquirer.prompt({
        type: 'input',
        name: 'maxClients',
        message: 'Set Max Clients:',
        default: '10000',
        validate: input => !isNaN(input) && parseInt(input) > 0 || 'Max clients must be a positive number'
      });

      await this.setup.safety.safeExecute('redis-manual-setup', {
        port: parseInt(port),
        password,
        maxMemory: parseInt(maxMemory),
        persistence,
        maxClients: parseInt(maxClients),
        platform: this.platform,
        projectDir
      }, async () => {
        if (this.platform === 'linux') {
          const redisConfig = {
            port: parseInt(port),
            maxmemory: `${maxMemory}mb`,
            maxclients: parseInt(maxClients)
          };

          if (password) {
            redisConfig.requirepass = password;
          }

          // Configure persistence
          switch(persistence) {
            case 'RDB':
              redisConfig.save = '900 1 300 10 60 10000';
              break;
            case 'AOF':
              redisConfig.appendonly = 'yes';
              break;
            case 'Both':
              redisConfig.save = '900 1 300 10 60 10000';
              redisConfig.appendonly = 'yes';
              break;
          }

          await this.updateRedisConfig(redisConfig);

          // Restart Redis service
          console.log('🔄 Restarting Redis service...');
          try {
            await exec('sudo systemctl restart redis');
            console.log('✅ Redis service restarted');
          } catch (error) {
            console.log('⚠️  Redis service restart failed, trying to start...');
            try {
              await exec('sudo systemctl start redis');
              console.log('✅ Redis service started');
            } catch (startError) {
              console.log('⚠️  Redis service may already be running');
            }
          }
        }

        // Ensure project directory exists
        await exec(`mkdir -p "${projectDir}"`);

        // Create project-specific Redis configuration file
        const redisProjectConfig = {
          host: 'localhost',
          port: parseInt(port),
          password: password || '',
          database: 0,
          maxMemory: `${maxMemory}mb`,
          persistence: persistence.toLowerCase(),
          maxClients: parseInt(maxClients),
          projectName: path.basename(projectDir),
          projectDir: projectDir,
          connectionString: password ? `redis://:${password}@localhost:${port}/0` : `redis://localhost:${port}/0`
        };

        // Write project-specific Redis config
        const configPath = path.join(projectDir, 'redis.config.js');
        const configContent = `/**
 * Redis Configuration for ${path.basename(projectDir)}
 * Generated by PERN Setup Tool
 */

module.exports = {
  redis: {
    host: '${redisProjectConfig.host}',
    port: ${redisProjectConfig.port},
    password: '${redisProjectConfig.password}',
    database: ${redisProjectConfig.database},
    retryDelayOnFailover: 100,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    lazyConnect: true
  },
  
  // Connection string for easy use
  connectionString: '${redisProjectConfig.connectionString}',
  
  // Project info
  projectName: '${redisProjectConfig.projectName}',
  projectDir: '${redisProjectConfig.projectDir}',
  
  // Configuration details
  maxMemory: '${redisProjectConfig.maxMemory}',
  persistence: '${redisProjectConfig.persistence}',
  maxClients: ${redisProjectConfig.maxClients}
};
`;

        await fs.writeFile(configPath, configContent);
        console.log(`✅ Project-specific Redis config created: ${configPath}`);

        // Create docker-compose.yml with Redis service if it doesn't exist
        const composePath = path.join(projectDir, 'docker-compose.yml');
        let composeExists = false;
        try {
          await fs.access(composePath);
          composeExists = true;
        } catch (error) {
          // File doesn't exist, will create it
        }

        if (!composeExists) {
          const redisCommand = password ? 
            `redis-server --requirepass ${password} --maxmemory ${maxMemory}mb` :
            `redis-server --maxmemory ${maxMemory}mb`;
          
          const composeContent = `version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: \${PROJECT_NAME:-${path.basename(projectDir)}}_redis
    restart: unless-stopped
    ports:
      - "${port}:${port}"
    command: ${redisCommand}${persistence === 'AOF' || persistence === 'Both' ? ' --appendonly yes' : ''}${persistence === 'RDB' || persistence === 'Both' ? ' --save 900 1 300 10 60 10000' : ''}
    volumes:
      - redis_data:/data
    environment:
      - REDIS_PASSWORD=${password || ''}
      - REDIS_MAX_MEMORY=${maxMemory}mb
      - REDIS_MAX_CLIENTS=${maxClients}

volumes:
  redis_data:
    driver: local
`;

          await fs.writeFile(composePath, composeContent);
          console.log(`✅ Docker Compose file created with Redis service: ${composePath}`);
        } else {
          console.log(`📝 Docker Compose file already exists: ${composePath}`);
          console.log('💡 You may want to add Redis service manually to your existing docker-compose.yml');
        }

        // Update global configuration
        this.config.set('redis.host', 'localhost');
        this.config.set('redis.port', parseInt(port));
        this.config.set('redis.password', password);
        this.config.set('redis.maxMemory', `${maxMemory}mb`);
        this.config.set('redis.persistence', persistence.toLowerCase());
        this.config.set('redis.maxClients', parseInt(maxClients));
        this.config.set('redis.projectDir', projectDir);

        this.setup.state.completedComponents.add('redis');
        console.log('✅ Redis manual setup completed');
        
        return {
          success: true,
          port: parseInt(port),
          maxMemory: parseInt(maxMemory),
          persistence,
          maxClients: parseInt(maxClients),
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
      });

    } catch (error) {
      await this.setup.handleError('redis-manual-setup', error);
    }

    await this.setup.showMainInterface();
  }

  /**
   * Update Redis configuration
   */
  async updateRedisConfig(config) {
    try {
      const configPath = '/etc/redis/redis.conf';

      console.log('🔧 Updating Redis configuration...');
      console.log('📝 You may be prompted for sudo password to update Redis config');

      // Backup existing config using sudo
      await exec(`sudo cp ${configPath} ${configPath}.backup.${Date.now()}`);

      // Update configuration values using sudo and sed
      for (const [key, value] of Object.entries(config)) {
        console.log(`🔧 Setting ${key} to ${value}...`);
        await exec(`sudo sed -i 's/^#\\?\\s*${key}\\s.*/${key} ${value}/' ${configPath}`);
      }

      console.log('✅ Redis configuration updated');
    } catch (error) {
      console.error('❌ Redis configuration update failed:', error.message);
      throw error;
    }
  }

  /**
   * Start Redis service
   */
  async start() {
    try {
      if (this.platform === 'linux') {
        await exec('sudo systemctl start redis');
      } else if (this.platform === 'darwin') {
        await exec('brew services start redis');
      }

      console.log('✅ Redis service started');
    } catch (error) {
      console.error('❌ Failed to start Redis:', error.message);
      throw error;
    }
  }

  /**
   * Stop Redis service
   */
  async stop() {
    try {
      if (this.platform === 'linux') {
        await exec('sudo systemctl stop redis');
      } else if (this.platform === 'darwin') {
        await exec('brew services stop redis');
      }

      console.log('✅ Redis service stopped');
    } catch (error) {
      console.error('❌ Failed to stop Redis:', error.message);
      throw error;
    }
  }

  /**
   * Check Redis status
   */
  async getStatus() {
    try {
      if (this.platform === 'linux') {
        const { stdout } = await exec('sudo systemctl status redis --no-pager -l');
        return stdout.includes('Active: active') ? 'running' : 'stopped';
      } else if (this.platform === 'darwin') {
        const { stdout } = await exec('brew services list | grep redis');
        return stdout.includes('started') ? 'running' : 'stopped';
      }

      return 'unknown';
    } catch (error) {
      return 'error';
    }
  }

  /**
   * Test Redis connection
   */
  async testConnection() {
    try {
      const config = this.config.get('redis', {});
      const Redis = require('ioredis');

      const redis = new Redis({
        host: config.host || 'localhost',
        port: config.port || 6379,
        password: config.password || undefined
      });

      await redis.ping();
      redis.disconnect();

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get Redis info
   */
  async getInfo() {
    try {
      const config = this.config.get('redis', {});
      const Redis = require('ioredis');

      const redis = new Redis({
        host: config.host || 'localhost',
        port: config.port || 6379,
        password: config.password || undefined
      });

      const info = await redis.info();
      redis.disconnect();

      return { success: true, info };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = RedisManager;