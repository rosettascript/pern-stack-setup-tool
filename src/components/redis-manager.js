/**
 * PERN Setup Tool - Redis Manager
 * Handles Redis installation, configuration, and management
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

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
      await this.setup.safety.safeExecute('redis-download', {}, async () => {
        if (this.platform === 'linux') {
          await exec('sudo apt update');
          await exec('sudo apt install -y redis-server');
        } else if (this.platform === 'darwin') {
          await exec('brew install redis');
        } else if (this.platform === 'win32') {
          console.log('📥 Redis is not natively supported on Windows.');
          console.log('💡 Alternatives:');
          console.log('   1. Use PostgreSQL for caching');
          console.log('   2. Use Docker: docker run -d -p 6379:6379 redis');
          console.log('   3. Use WSL (Windows Subsystem for Linux)');
          return;
        }

        this.setup.state.completedComponents.add('redis');
        console.log('✅ Redis downloaded successfully');
      });

    } catch (error) {
      await this.setup.handleError('redis-download', error);
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
      await this.setup.handleError('redis-setup-interface', error);
    }
  }

  /**
   * Automatic Redis setup
   */
  async automaticSetup() {
    try {
      await this.setup.safety.safeExecute('redis-automatic-setup', {
        backup: true,
        targetPath: '/etc/redis/redis.conf'
      }, async () => {
        console.log('Setting up Redis automatically...');
        console.log('The script will auto configure:');
        console.log('- Port: 6379 (default)');
        console.log('- Password: redis1234');
        console.log('- Max Memory: 256MB');
        console.log('- Persistence: AOF enabled');

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
          await exec('sudo systemctl start redis');
          await exec('sudo systemctl enable redis');

        } else if (this.platform === 'darwin') {
          await exec('brew services start redis');
        }

        // Update configuration
        this.config.set('redis.host', 'localhost');
        this.config.set('redis.port', 6379);
        this.config.set('redis.password', 'redis1234');
        this.config.set('redis.maxMemory', '256mb');
        this.config.set('redis.persistence', 'aof');

        this.setup.state.completedComponents.add('redis');
        console.log('✅ Redis automatic setup completed');
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
        maxClients: parseInt(maxClients)
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
          await exec('sudo systemctl restart redis');
        }

        // Update configuration
        this.config.set('redis.host', 'localhost');
        this.config.set('redis.port', parseInt(port));
        this.config.set('redis.password', password);
        this.config.set('redis.maxMemory', `${maxMemory}mb`);
        this.config.set('redis.persistence', persistence.toLowerCase());
        this.config.set('redis.maxClients', parseInt(maxClients));

        this.setup.state.completedComponents.add('redis');
        console.log('✅ Redis manual setup completed');
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

      // Backup existing config
      if (await fs.pathExists(configPath)) {
        await this.setup.safety.createBackup('redis-config', configPath);
      }

      // Read current config
      let redisConf = await fs.readFile(configPath, 'utf8');

      // Update configuration values
      Object.entries(config).forEach(([key, value]) => {
        const regex = new RegExp(`^#?\\s*${key}\\s+.*$`, 'gm');
        const replacement = `${key} ${value}`;
        redisConf = redisConf.replace(regex, replacement);
      });

      // Write updated config
      await fs.writeFile(configPath, redisConf);

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