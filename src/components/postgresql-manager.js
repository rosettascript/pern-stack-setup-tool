/**
 * PERN Setup Tool - PostgreSQL Manager
 * Handles PostgreSQL installation, configuration, and management
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

/**
 * PostgreSQL Manager Class
 * Manages PostgreSQL installation and configuration
 */
class PostgreSQLManager {
  constructor(setupTool) {
    this.setup = setupTool;
    this.logger = setupTool.logger;
    this.safety = setupTool.safety;
    this.config = setupTool.config;
    this.platform = process.platform;
  }

  /**
   * Show PostgreSQL interface
   */
  async showInterface() {
    try {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'PostgreSQL Section',
          choices: [
            '1. Download PostgreSQL',
            '2. Setup PostgreSQL',
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
      await this.setup.handleError('postgresql-interface', error);
    }
  }

  /**
   * Download PostgreSQL
   */
  async download() {
    try {
      await this.setup.safety.safeExecute('postgresql-download', {}, async () => {
        if (this.platform === 'linux') {
          await exec('sudo apt update');
          await exec('sudo apt install -y postgresql postgresql-contrib');
        } else if (this.platform === 'darwin') {
          await exec('brew install postgresql');
        } else if (this.platform === 'win32') {
          console.log('📥 Download PostgreSQL from: https://postgresql.org/download/windows/');
          console.log('Run the installer and follow the setup wizard');
        }

        this.setup.state.completedComponents.add('postgresql');
        console.log('✅ PostgreSQL downloaded successfully');
      });

    } catch (error) {
      await this.setup.handleError('postgresql-download', error);
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
      await this.setup.handleError('postgresql-setup-interface', error);
    }
  }

  /**
   * Automatic PostgreSQL setup
   */
  async automaticSetup() {
    try {
      await this.setup.safety.safeExecute('postgresql-automatic-setup', {
        backup: true,
        targetPath: '/etc/postgresql'
      }, async () => {
        console.log('Setting up PostgreSQL automatically...');
        console.log('The script will auto generate:');
        console.log('- Creates User: postgres');
        console.log('- Creates Database: postgres');
        console.log('- Sets User password: 1234');

        if (this.platform === 'linux') {
          // Create user
          await exec('sudo -u postgres psql -c "CREATE USER postgres;" 2>/dev/null || true');

          // Create database
          await exec('sudo -u postgres psql -c "CREATE DATABASE postgres;" 2>/dev/null || true');

          // Set password
          await exec('sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD \'1234\';"');

          // Grant privileges
          await exec('sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE postgres TO postgres;"');

          // Start service
          await exec('sudo systemctl start postgresql');
          await exec('sudo systemctl enable postgresql');

        } else if (this.platform === 'darwin') {
          await exec('brew services start postgresql');
        }

        // Update configuration
        this.config.set('database.type', 'postgresql');
        this.config.set('database.host', 'localhost');
        this.config.set('database.port', 5432);
        this.config.set('database.username', 'postgres');
        this.config.set('database.password', '1234');
        this.config.set('database.name', 'postgres');

        this.setup.state.completedComponents.add('postgresql');
        console.log('✅ PostgreSQL setup completed successfully');
      });

    } catch (error) {
      await this.setup.handleError('postgresql-automatic-setup', error);
    }

    await this.setup.showMainInterface();
  }

  /**
   * Manual PostgreSQL setup
   */
  async manualSetup() {
    try {
      const { username } = await inquirer.prompt({
        type: 'input',
        name: 'username',
        message: 'Enter Username:',
        validate: input => input.length > 0 || 'Username is required'
      });

      const { password } = await inquirer.prompt({
        type: 'password',
        name: 'password',
        message: 'Enter User password:',
        validate: input => input.length >= 4 || 'Password must be at least 4 characters'
      });

      const { dbName } = await inquirer.prompt({
        type: 'input',
        name: 'dbName',
        message: 'Enter Database name:',
        validate: input => input.length > 0 || 'Database name is required'
      });

      await this.setup.safety.safeExecute('postgresql-manual-setup', {
        username,
        password,
        dbName
      }, async () => {
        if (this.platform === 'linux') {
          // Create user
          await exec(`sudo -u postgres psql -c "CREATE USER ${username};"`);

          // Set password
          await exec(`sudo -u postgres psql -c "ALTER USER ${username} WITH PASSWORD '${password}';"`, {});

          // Create database
          await exec(`sudo -u postgres psql -c "CREATE DATABASE ${dbName};"`);

          // Grant privileges
          await exec(`sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${username};"`);
        }

        // Update configuration
        this.config.set('database.username', username);
        this.config.set('database.password', password);
        this.config.set('database.name', dbName);

        this.setup.state.completedComponents.add('postgresql');
        console.log('✅ PostgreSQL manual setup completed');
      });

    } catch (error) {
      await this.setup.handleError('postgresql-manual-setup', error);
    }

    await this.setup.showMainInterface();
  }

  /**
   * Start PostgreSQL service
   */
  async start() {
    try {
      if (this.platform === 'linux') {
        await exec('sudo systemctl start postgresql');
      } else if (this.platform === 'darwin') {
        await exec('brew services start postgresql');
      }

      console.log('✅ PostgreSQL service started');
    } catch (error) {
      console.error('❌ Failed to start PostgreSQL:', error.message);
      throw error;
    }
  }

  /**
   * Stop PostgreSQL service
   */
  async stop() {
    try {
      if (this.platform === 'linux') {
        await exec('sudo systemctl stop postgresql');
      } else if (this.platform === 'darwin') {
        await exec('brew services stop postgresql');
      }

      console.log('✅ PostgreSQL service stopped');
    } catch (error) {
      console.error('❌ Failed to stop PostgreSQL:', error.message);
      throw error;
    }
  }

  /**
   * Check PostgreSQL status
   */
  async getStatus() {
    try {
      if (this.platform === 'linux') {
        const { stdout } = await exec('sudo systemctl status postgresql --no-pager -l');
        return stdout.includes('Active: active') ? 'running' : 'stopped';
      } else if (this.platform === 'darwin') {
        const { stdout } = await exec('brew services list | grep postgresql');
        return stdout.includes('started') ? 'running' : 'stopped';
      }

      return 'unknown';
    } catch (error) {
      return 'error';
    }
  }

  /**
   * Test database connection
   */
  async testConnection() {
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

      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = PostgreSQLManager;