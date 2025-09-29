/**
 * PERN Setup Tool - PostgreSQL Manager
 * Handles PostgreSQL installation, configuration, and management
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const ora = require('ora');

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
          loop: false,
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
      await this.setup.safety.safeExecute('postgresql-download', {
        version: '15.0',
        platform: this.platform
      }, async () => {
        console.log('🔧 Starting PostgreSQL download and installation...');
        console.log('📝 This may take a few minutes depending on your internet connection');
        
        if (this.platform === 'linux') {
          console.log('🐧 Installing PostgreSQL on Linux...');
          
          // Detect package manager
          let packageManager = null;
          let installCommand = null;
          let updateCommand = null;
          
          try {
            await exec('which apt');
            packageManager = 'apt';
            installCommand = 'sudo apt install -y postgresql postgresql-contrib';
            updateCommand = 'sudo apt update';
            console.log('📦 Detected APT package manager (Ubuntu/Debian)');
          } catch (error) {
            try {
              await exec('which yum');
              packageManager = 'yum';
              installCommand = 'sudo yum install -y postgresql-server postgresql-contrib';
              updateCommand = 'sudo yum update -y';
              console.log('📦 Detected YUM package manager (RHEL/CentOS)');
            } catch (error) {
              try {
                await exec('which dnf');
                packageManager = 'dnf';
                installCommand = 'sudo dnf install -y postgresql-server postgresql-contrib';
                updateCommand = 'sudo dnf update -y';
                console.log('📦 Detected DNF package manager (Fedora)');
              } catch (error) {
                try {
                  await exec('which pacman');
                  packageManager = 'pacman';
                  installCommand = 'sudo pacman -S --noconfirm postgresql';
                  updateCommand = 'sudo pacman -Sy';
                  console.log('📦 Detected Pacman package manager (Arch)');
                } catch (error) {
                  throw new Error('No supported package manager found. This tool supports APT (Ubuntu/Debian), YUM (RHEL/CentOS), DNF (Fedora), and Pacman (Arch). Please install PostgreSQL manually for your distribution.');
                }
              }
            }
          }
          
          // Update package lists
          const updateSpinner = ora(`📦 Updating package lists with ${packageManager}...`).start();
          try {
            await exec(updateCommand);
            updateSpinner.succeed(`✅ Package lists updated with ${packageManager}`);
          } catch (error) {
            updateSpinner.fail(`❌ Failed to update package lists with ${packageManager}`);
            throw new Error(`Failed to update package lists with ${packageManager}. Please check your internet connection and sudo access.`);
          }
          
          // Install PostgreSQL
          const installSpinner = ora(`📦 Installing PostgreSQL with ${packageManager}...`).start();
          console.log('⏳ This may take 2-5 minutes...');
          try {
            await exec(installCommand);
            installSpinner.succeed(`✅ PostgreSQL installation completed with ${packageManager}`);
            
            // Initialize database for RHEL/CentOS/Fedora
            if (packageManager === 'yum' || packageManager === 'dnf') {
              console.log('🔧 Initializing PostgreSQL database...');
              await exec('sudo postgresql-setup --initdb');
              console.log('✅ PostgreSQL database initialized');
            }
          } catch (error) {
            installSpinner.fail(`❌ PostgreSQL installation failed with ${packageManager}`);
            throw new Error(`PostgreSQL installation failed with ${packageManager}. Please check your system permissions and try again.`);
          }
          
        } else if (this.platform === 'darwin') {
          console.log('🍎 Installing PostgreSQL on macOS...');
          
          // Check if Homebrew is available
          try {
            await exec('which brew');
          } catch (error) {
            throw new Error('Homebrew not found. Please install Homebrew first: https://brew.sh/');
          }
          
          const brewSpinner = ora('📦 Using Homebrew to install PostgreSQL...').start();
          console.log('⏳ This may take 3-7 minutes...');
          try {
            await exec('brew install postgresql');
            brewSpinner.succeed('✅ PostgreSQL installation completed on macOS');
          } catch (error) {
            brewSpinner.fail('❌ PostgreSQL installation failed');
            throw new Error('PostgreSQL installation failed via Homebrew. Please check your internet connection and try again.');
          }
        } else if (this.platform === 'win32') {
          console.log('🪟 Windows detected - manual installation required');
          console.log('');
          console.log('📥 Download PostgreSQL from: https://postgresql.org/download/windows/');
          console.log('📝 Run the installer and follow the setup wizard');
          console.log('');
          console.log('💡 Important installation tips:');
          console.log('   • Remember the postgres user password you set during installation');
          console.log('   • Choose "PostgreSQL Server" during component selection');
          console.log('   • Default port 5432 is recommended');
          console.log('   • Enable "Stack Builder" if you need additional tools');
          console.log('');
          console.log('🔄 After installation, restart this tool to continue with setup');
          console.log('💡 Alternative: Use Docker Desktop and run: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=1234 postgres');
          
          // Don't mark as completed since it requires manual installation
          return {
            success: true,
            version: '15.0',
            platform: this.platform,
            manualInstallation: true,
            timestamp: new Date().toISOString()
          };
        } else {
          // Handle unsupported platforms
          console.log('❌ Unsupported platform detected:', this.platform);
          console.log('💡 Please install PostgreSQL manually for your platform:');
          console.log('   • Linux: Use your distribution\'s package manager');
          console.log('   • macOS: Use Homebrew or download from postgresql.org');
          console.log('   • Windows: Download from postgresql.org');
          console.log('   • Docker: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=1234 postgres');
          
          return {
            success: false,
            version: '15.0',
            platform: this.platform,
            error: 'Unsupported platform',
            timestamp: new Date().toISOString()
          };
        }

        this.setup.state.completedComponents.add('postgresql');
        console.log('✅ PostgreSQL downloaded successfully');
        
        return {
          success: true,
          version: '15.0',
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
      });

    } catch (error) {
      await this.setup.handleError('postgresql-download', error);
    }

    // Return to main menu after download completion
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
      await this.setup.handleError('postgresql-setup-interface', error);
    }
  }

  /**
   * Automatic PostgreSQL setup
   */
  async automaticSetup() {
    try {
      await this.setup.safety.safeExecute('postgresql-automatic-setup', {
        version: '15.0',
        port: 5432,
        username: 'postgres',
        database: 'postgres',
        password: 'postgres'
      }, async () => {
        console.log('🔧 Setting up PostgreSQL automatically...');
        console.log('📝 The script will auto generate:');
        console.log('- Creates User: postgres');
        console.log('- Creates Database: postgres');
        console.log('- Sets User password: 1234');

        if (this.platform === 'linux') {
          // Check and configure PostgreSQL authentication
          const authResult = await this.ensurePostgresAuthentication();
          
          if (authResult.needsPassword) {
            console.log('📝 You will be prompted for the postgres user password');
            console.log('💡 The postgres user password is the system PostgreSQL admin password, not your application password');
          } else {
            console.log('✅ PostgreSQL authentication is properly configured');
          }

          console.log('🔐 Executing database setup commands...');

          // Execute commands separately to avoid transaction block issues
          console.log('👤 Creating user...');
          await exec('sudo -u postgres psql -c "CREATE USER postgres;" 2>/dev/null || true');

          console.log('🗄️ Creating database...');
          await exec('sudo -u postgres psql -c "CREATE DATABASE postgres;" 2>/dev/null || true');

          console.log('🔑 Setting user password...');
          await exec('sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD \'1234\';"');

          console.log('🔐 Granting privileges...');
          await exec('sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE postgres TO postgres;"');

          // Start service
          await exec('sudo systemctl start postgresql');
          await exec('sudo systemctl enable postgresql');

        } else if (this.platform === 'darwin') {
          console.log('🍎 Setting up PostgreSQL on macOS...');
          await exec('brew services start postgresql');
          
          console.log('🔐 Executing database setup commands...');
          console.log('👤 Creating user...');
          await exec('psql -d postgres -c "CREATE USER postgres;" 2>/dev/null || true');

          console.log('🗄️ Creating database...');
          await exec('psql -d postgres -c "CREATE DATABASE postgres;" 2>/dev/null || true');

          console.log('🔑 Setting user password...');
          await exec('psql -d postgres -c "ALTER USER postgres WITH PASSWORD \'1234\';"');

          console.log('🔐 Granting privileges...');
          await exec('psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE postgres TO postgres;"');

        } else if (this.platform === 'win32') {
          console.log('🪟 Setting up PostgreSQL on Windows...');
          console.log('📝 Assuming PostgreSQL is already installed via the Windows installer');
          console.log('💡 If not installed, please download from: https://postgresql.org/download/windows/');
          
          // Start PostgreSQL service on Windows
          await this.startPostgreSQLService();
          
          console.log('🔐 Executing database setup commands...');
          console.log('👤 Creating user...');
          await exec('psql -U postgres -c "CREATE USER postgres;" 2>nul || echo User may already exist');

          console.log('🗄️ Creating database...');
          await exec('psql -U postgres -c "CREATE DATABASE postgres;" 2>nul || echo Database may already exist');

          console.log('🔑 Setting user password...');
          await exec('psql -U postgres -c "ALTER USER postgres WITH PASSWORD \'1234\';"');

          console.log('🔐 Granting privileges...');
          await exec('psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE postgres TO postgres;"');
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

        return {
          success: true,
          username: 'postgres',
          database: 'postgres',
          version: '15.0',
          port: 5432,
          timestamp: new Date().toISOString()
        };
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
        message: 'Enter User password (minimum 8 characters):',
        validate: input => input.length >= 8 || 'Password must be at least 8 characters for security'
      });

      const { dbName } = await inquirer.prompt({
        type: 'input',
        name: 'dbName',
        message: 'Enter Database name:',
        validate: input => input.length > 0 || 'Database name is required'
      });

      await this.setup.safety.safeExecute('postgresql-manual-setup', {
        version: '15.0',
        port: 5432,
        username,
        database: dbName,
        password
      }, async () => {
        if (this.platform === 'linux') {
          console.log('🔧 Setting up PostgreSQL database...');

          // Check and configure PostgreSQL authentication
          const authResult = await this.ensurePostgresAuthentication();
          
          if (authResult.needsPassword) {
            console.log('📝 You will be prompted for the postgres user password');
            console.log('💡 The postgres user password is the system PostgreSQL admin password, not your application password');
          } else {
            console.log('✅ PostgreSQL authentication is properly configured');
          }

          console.log('🔐 Executing database setup commands...');

          // Execute commands separately to avoid transaction block issues
          console.log('👤 Creating user...');
          try {
            await exec(`sudo -u postgres psql -c "CREATE USER ${username};" 2>/dev/null || echo "User may already exist"`);
          } catch (error) {
            console.log('ℹ️ User creation skipped (user may already exist)');
          }

          console.log('🔑 Setting user password...');
          await exec(`sudo -u postgres psql -c "ALTER USER ${username} WITH PASSWORD '${password}';"`);

          console.log('🗄️ Creating database...');
          try {
            await exec(`sudo -u postgres psql -c "CREATE DATABASE ${dbName};" 2>/dev/null || echo "Database may already exist"`);
          } catch (error) {
            console.log('ℹ️ Database creation skipped (database may already exist)');
          }

          console.log('🔐 Granting privileges...');
          await exec(`sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${username};"`);

        } else if (this.platform === 'darwin') {
          console.log('🍎 Setting up PostgreSQL database on macOS...');
          
          // Start PostgreSQL service
          await exec('brew services start postgresql');
          
          console.log('🔐 Executing database setup commands...');
          console.log('👤 Creating user...');
          try {
            await exec(`psql -d postgres -c "CREATE USER ${username};" 2>/dev/null || echo "User may already exist"`);
          } catch (error) {
            console.log('ℹ️ User creation skipped (user may already exist)');
          }

          console.log('🔑 Setting user password...');
          await exec(`psql -d postgres -c "ALTER USER ${username} WITH PASSWORD '${password}';"`);

          console.log('🗄️ Creating database...');
          try {
            await exec(`psql -d postgres -c "CREATE DATABASE ${dbName};" 2>/dev/null || echo "Database may already exist"`);
          } catch (error) {
            console.log('ℹ️ Database creation skipped (database may already exist)');
          }

          console.log('🔐 Granting privileges...');
          await exec(`psql -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${username};"`);

        } else if (this.platform === 'win32') {
          console.log('🪟 Setting up PostgreSQL database on Windows...');
          console.log('📝 Assuming PostgreSQL is already installed via the Windows installer');
          
          // Start PostgreSQL service on Windows
          await this.startPostgreSQLService();
          
          console.log('🔐 Executing database setup commands...');
          console.log('👤 Creating user...');
          try {
            await exec(`psql -U postgres -c "CREATE USER ${username};" 2>nul || echo User may already exist`);
          } catch (error) {
            console.log('ℹ️ User creation skipped (user may already exist)');
          }

          console.log('🔑 Setting user password...');
          await exec(`psql -U postgres -c "ALTER USER ${username} WITH PASSWORD '${password}';"`);

          console.log('🗄️ Creating database...');
          try {
            await exec(`psql -U postgres -c "CREATE DATABASE ${dbName};" 2>nul || echo Database may already exist`);
          } catch (error) {
            console.log('ℹ️ Database creation skipped (database may already exist)');
          }

          console.log('🔐 Granting privileges...');
          await exec(`psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${username};"`);
        }

        // Update configuration
        this.config.set('database.username', username);
        this.config.set('database.password', password);
        this.config.set('database.name', dbName);

        this.setup.state.completedComponents.add('postgresql');
        console.log('✅ PostgreSQL manual setup completed');

        return {
          success: true,
          username,
          database: dbName,
          version: '15.0',
          port: 5432,
          timestamp: new Date().toISOString()
        };
      });

    } catch (error) {
      // Provide more helpful error messages for common PostgreSQL authentication issues
      if (error.message.includes('password authentication failed')) {
        console.log('\n💡 PostgreSQL Authentication Issue Detected');
        console.log('🔧 Here are some solutions to try:');
        console.log('');
        console.log('1. Set a password for the postgres user:');
        console.log('   sudo -u postgres psql -c "ALTER USER postgres PASSWORD \'yourpassword\';"');
        console.log('');
        console.log('2. Configure trust authentication (temporarily):');
        console.log('   sudo nano /etc/postgresql/*/main/pg_hba.conf');
        console.log('   Change "local all postgres md5" to "local all postgres trust"');
        console.log('   sudo systemctl restart postgresql');
        console.log('');
        console.log('3. Use peer authentication:');
        console.log('   sudo -u postgres createuser --interactive');
        console.log('');
        console.log('4. Reset postgres user password:');
        console.log('   sudo -u postgres psql');
        console.log('   \\password postgres');
        console.log('   \\q');
        console.log('');
      }
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
      } else if (this.platform === 'win32') {
        await this.startPostgreSQLService();
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
      } else if (this.platform === 'win32') {
        await this.stopPostgreSQLService();
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
      } else if (this.platform === 'win32') {
        return await this.getPostgreSQLServiceStatus();
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

  /**
    * Check PostgreSQL authentication and configure if needed
    */
  async ensurePostgresAuthentication() {
    try {
      console.log('🔍 Checking PostgreSQL authentication configuration...');

      // First, check the pg_hba.conf file to see what authentication method is configured
      const authMethods = await this.detectAuthenticationMethods();
      
      console.log(`📄 Detected authentication methods: ${JSON.stringify(authMethods)}`);

      if (authMethods.password && !authMethods.peer && !authMethods.trust) {
        console.log('⚠️ PostgreSQL is configured with password authentication for postgres user');
        console.log('💡 This means you need to provide the postgres user password');
        console.log('🔧 You have a few options:');
        console.log('   1. Enter the postgres user password when prompted (recommended)');
        console.log('   2. Reset postgres password to a new one');
        console.log('   3. Configure trust authentication (less secure but easier)');
        console.log('   4. Use peer authentication (most secure for local development)');
        
        // Ask user what they want to do
        const { choice } = await inquirer.prompt([{
          type: 'list',
          name: 'choice',
          message: 'How would you like to proceed?',
          choices: [
            '1. Enter postgres password when prompted (recommended)',
            '2. Reset postgres password to a new one',
            '3. Configure trust authentication (less secure)',
            '4. Configure peer authentication (most secure)',
            '5. Cancel setup'
          ]
        }]);

        const selected = parseInt(choice.split('.')[0]);
        switch (selected) {
          case 1:
            console.log('✅ Will prompt for postgres password during setup');
            return { method: 'password', working: true, needsPassword: true };
          case 2:
            return await this.resetPostgresPassword();
          case 3:
            return await this.configureTrustAuthentication();
          case 4:
            return await this.configurePeerAuthentication();
          case 5:
            throw new Error('Setup cancelled by user');
        }
      } else if (authMethods.peer || authMethods.trust) {
        console.log('✅ PostgreSQL uses peer/trust authentication (no password required)');
        return { method: authMethods.peer ? 'peer' : 'trust', working: true };
      } else {
        // Fallback: try to connect and see what happens
        try {
          await exec('sudo -u postgres psql -c "SELECT 1;" 2>/dev/null');
          console.log('✅ PostgreSQL authentication is working (no password required)');
          return { method: 'peer', working: true };
        } catch (error) {
          console.log('⚠️ PostgreSQL connection failed, will need authentication configuration');
          return { method: 'password', working: true, needsPassword: true };
        }
      }

    } catch (error) {
      console.error('❌ PostgreSQL authentication check failed:', error.message);
      console.log('💡 Manual configuration may be required:');
      console.log('   1. Check if PostgreSQL is running: sudo systemctl status postgresql');
      console.log('   2. Try connecting manually: sudo -u postgres psql');
      console.log('   3. Reset postgres password: sudo -u postgres psql -c "ALTER USER postgres PASSWORD \'newpassword\';"');
      throw error;
    }
  }

  /**
   * Detect available PostgreSQL authentication methods
   */
  async detectAuthenticationMethods() {
    const methods = { peer: false, trust: false, password: false };

    try {
      // Check pg_hba.conf for authentication methods
      const { stdout: findResult } = await exec('find /etc/postgresql -name "pg_hba.conf" 2>/dev/null | head -1');
      const pgHbaPath = findResult.trim();

      if (pgHbaPath) {
        const { stdout: hbaContent } = await exec(`sudo cat "${pgHbaPath}"`);
        
        // Look for postgres-specific authentication lines
        const postgresLines = hbaContent.split('\n').filter(line => 
          line.includes('postgres') && !line.startsWith('#')
        );
        
        for (const line of postgresLines) {
          if (line.includes('peer')) {
            methods.peer = true;
          }
          if (line.includes('trust')) {
            methods.trust = true;
          }
          if (line.includes('md5') || line.includes('password')) {
            methods.password = true;
          }
        }
        
        console.log(`📄 Found PostgreSQL authentication methods: ${JSON.stringify(methods)}`);
      }
    } catch (error) {
      console.log('ℹ️ Could not read pg_hba.conf, will try direct connection tests');
    }

    // Test direct connections (this will help confirm what actually works)
    try {
      await exec('sudo -u postgres psql -c "SELECT 1;" 2>/dev/null');
      methods.peer = true;
    } catch (error) {
      // Peer authentication failed - this is expected if password auth is configured
    }

    return methods;
  }

  /**
   * Reset postgres user password
   */
  async resetPostgresPassword() {
    try {
      const { newPassword } = await inquirer.prompt([{
        type: 'password',
        name: 'newPassword',
        message: 'Enter new password for postgres user:',
        validate: input => input.length >= 8 || 'Password must be at least 8 characters'
      }]);

      console.log('🔧 Resetting postgres user password...');
      
      // Try to connect and set password
      await exec(`sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${newPassword}';"`);
      
      console.log('✅ Postgres user password updated successfully');
      return { method: 'password', working: true, password: newPassword };
    } catch (error) {
      console.error('❌ Failed to reset postgres password:', error.message);
      throw error;
    }
  }

  /**
   * Configure trust authentication for postgres user
   */
  async configureTrustAuthentication() {
    try {
      console.log('🔧 Configuring PostgreSQL for trust authentication...');

      // Find PostgreSQL configuration directory
      const { stdout: findResult } = await exec('find /etc/postgresql -name "pg_hba.conf" 2>/dev/null | head -1');
      const pgHbaPath = findResult.trim();

      if (!pgHbaPath) {
        throw new Error('Could not find PostgreSQL configuration file (pg_hba.conf)');
      }

      console.log(`📄 Found PostgreSQL configuration at: ${pgHbaPath}`);

      // Create backup of current configuration
      await exec(`sudo cp "${pgHbaPath}" "${pgHbaPath}.backup.$(date +%Y%m%d_%H%M%S)"`);

      // Check current authentication method for postgres user
      let currentConfig = '';
      try {
        const { stdout } = await exec(`sudo grep "local.*all.*postgres" "${pgHbaPath}"`);
        currentConfig = stdout;
      } catch (error) {
        console.log('ℹ️ No specific postgres user authentication found, adding trust authentication');
      }

      if (currentConfig.includes('trust')) {
        console.log('✅ PostgreSQL is already configured with trust authentication');
        return { method: 'trust', working: true };
      }

      // Add or modify postgres authentication line
      if (currentConfig.trim() !== '') {
        // Replace existing postgres authentication line
        await exec(`sudo sed -i 's/local\\s*all\\s*postgres\\s*.*/local   all             postgres                                trust/' "${pgHbaPath}"`);
      } else {
        // Add new postgres authentication line after the existing local lines
        await exec(`sudo sed -i '/^local.*all.*all/a local   all             postgres                                trust' "${pgHbaPath}"`);
      }

      console.log('🔄 Restarting PostgreSQL service...');
      await exec('sudo systemctl restart postgresql');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify the fix worked
      try {
        await exec('sudo -u postgres psql -c "SELECT 1;" 2>/dev/null');
        console.log('✅ PostgreSQL trust authentication configured successfully');
        return { method: 'trust', working: true };
      } catch (error) {
        throw new Error('Failed to verify PostgreSQL trust authentication after configuration');
      }

    } catch (error) {
      console.error('❌ Failed to configure trust authentication:', error.message);
      throw error;
    }
  }

  /**
   * Configure peer authentication for postgres user
   */
  async configurePeerAuthentication() {
    try {
      console.log('🔧 Configuring PostgreSQL for peer authentication...');

      // Find PostgreSQL configuration directory
      const { stdout: findResult } = await exec('find /etc/postgresql -name "pg_hba.conf" 2>/dev/null | head -1');
      const pgHbaPath = findResult.trim();

      if (!pgHbaPath) {
        throw new Error('Could not find PostgreSQL configuration file (pg_hba.conf)');
      }

      console.log(`📄 Found PostgreSQL configuration at: ${pgHbaPath}`);

      // Create backup of current configuration
      await exec(`sudo cp "${pgHbaPath}" "${pgHbaPath}.backup.$(date +%Y%m%d_%H%M%S)"`);

      // Check current authentication method for postgres user
      let currentConfig = '';
      try {
        const { stdout } = await exec(`sudo grep "local.*all.*postgres" "${pgHbaPath}"`);
        currentConfig = stdout;
      } catch (error) {
        console.log('ℹ️ No specific postgres user authentication found, adding peer authentication');
      }

      if (currentConfig.includes('peer')) {
        console.log('✅ PostgreSQL is already configured with peer authentication');
        return { method: 'peer', working: true };
      }

      // Add or modify postgres authentication line to use peer
      if (currentConfig.trim() !== '') {
        // Replace existing postgres authentication line
        await exec(`sudo sed -i 's/local\\s*all\\s*postgres\\s*.*/local   all             postgres                                peer/' "${pgHbaPath}"`);
      } else {
        // Add new postgres authentication line after the existing local lines
        await exec(`sudo sed -i '/^local.*all.*all/a local   all             postgres                                peer' "${pgHbaPath}"`);
      }

      console.log('🔄 Restarting PostgreSQL service...');
      await exec('sudo systemctl restart postgresql');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verify the fix worked
      try {
        await exec('sudo -u postgres psql -c "SELECT 1;" 2>/dev/null');
        console.log('✅ PostgreSQL peer authentication configured successfully');
        return { method: 'peer', working: true };
      } catch (error) {
        throw new Error('Failed to verify PostgreSQL peer authentication after configuration');
      }

    } catch (error) {
      console.error('❌ Failed to configure peer authentication:', error.message);
      throw error;
    }
  }

  /**
   * Start PostgreSQL service on Windows
   */
  async startPostgreSQLService() {
    try {
      console.log('🪟 Starting PostgreSQL service on Windows...');
      
      // Try to start PostgreSQL service using net command
      await exec('net start postgresql-x64-15 2>nul || net start postgresql 2>nul || echo PostgreSQL service may already be running');
      
      // Alternative: Use sc command to start service
      await exec('sc start postgresql-x64-15 2>nul || sc start postgresql 2>nul || echo PostgreSQL service may already be running');
      
      console.log('✅ PostgreSQL service started on Windows');
    } catch (error) {
      console.log('⚠️ PostgreSQL service may already be running or needs manual start');
      console.log('💡 You can manually start it from Services.msc or run: net start postgresql');
    }
  }

  /**
   * Stop PostgreSQL service on Windows
   */
  async stopPostgreSQLService() {
    try {
      console.log('🪟 Stopping PostgreSQL service on Windows...');
      
      // Try to stop PostgreSQL service using net command
      await exec('net stop postgresql-x64-15 2>nul || net stop postgresql 2>nul || echo PostgreSQL service may already be stopped');
      
      console.log('✅ PostgreSQL service stopped on Windows');
    } catch (error) {
      console.log('⚠️ PostgreSQL service may already be stopped or needs manual stop');
      console.log('💡 You can manually stop it from Services.msc or run: net stop postgresql');
    }
  }

  /**
   * Get PostgreSQL service status on Windows
   */
  async getPostgreSQLServiceStatus() {
    try {
      // Try to get service status using sc command
      const { stdout } = await exec('sc query postgresql-x64-15 2>nul || sc query postgresql 2>nul');
      
      if (stdout.includes('RUNNING')) {
        return 'running';
      } else if (stdout.includes('STOPPED')) {
        return 'stopped';
      } else {
        return 'unknown';
      }
    } catch (error) {
      // Try alternative method with net command
      try {
        const { stdout } = await exec('net start | findstr postgresql');
        return stdout.includes('postgresql') ? 'running' : 'stopped';
      } catch (error) {
        return 'unknown';
      }
    }
  }
}

module.exports = PostgreSQLManager;