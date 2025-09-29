/**
 * PERN Setup Tool - PostgreSQL Manager
 * Handles PostgreSQL installation, configuration, and management
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const { spawn } = require('child_process');
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
    this.authCache = new Map(); // Cache for successful authentication methods
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
            '3. Add Extension',
            '4. List Databases',
            '5. List Users',
            '6. Delete Database',
            '7. Go back'
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
          await this.extensionInterface();
          break;
        case 4:
          await this.listDatabases();
          break;
        case 5:
          await this.listUsers();
          break;
        case 6:
          await this.deleteDatabase();
          break;
        case 7:
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
    * Show extension interface
    */
  async extensionInterface() {
    try {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'PostgreSQL Extensions',
          loop: false,
          choices: [
            '1. List available extensions',
            '2. Install extension',
            '3. Remove extension',
            '4. List installed extensions',
            '5. Setup authentication (if having permission issues)',
            '6. Go back'
          ]
        }
      ]);

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.listAvailableExtensions();
          break;
        case 2:
          await this.installExtension();
          break;
        case 3:
          await this.removeExtension();
          break;
        case 4:
          await this.listInstalledExtensions();
          break;
        case 5:
          await this.setupAuthentication();
          break;
        case 6:
          return this.showInterface();
      }

    } catch (error) {
      await this.setup.handleError('postgresql-extension-interface', error);
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
    * List all databases
    */
  async listDatabases() {
    try {
      console.log('\n🗄️ PostgreSQL Databases');
      console.log('======================');
      console.log('');

      const listSpinner = ora('Fetching database list...').start();

      try {
        // Use smart authentication to handle different access methods
        const { stdout } = await this.smartAuthExec('psql -d postgres -c "SELECT datname as database_name, pg_size_pretty(pg_database_size(datname)) as size, encoding as character_encoding, datcollate as collation, datctype as character_classification FROM pg_database ORDER BY datname;"', {
          timeoutMs: 10000,
          operation: 'Listing databases',
          allowSudo: false
        });

        listSpinner.succeed('Database list retrieved');

        console.log('\n📊 Database Information:');
        console.log('========================');
        console.log(stdout);

        // Show additional database statistics
        console.log('\n📈 Database Statistics:');
        console.log('=======================');

        try {
          const { stdout: stats } = await this.smartAuthExec('psql -d postgres -c "SELECT COUNT(*) as total_databases, SUM(pg_database_size(datname)) as total_size_bytes FROM pg_database;"', {
            timeoutMs: 10000,
            operation: 'Database statistics',
            allowSudo: false
          });

          console.log(stats);

          // Parse total size for user-friendly display
          const statsLines = stats.trim().split('\n');
          const totalLine = statsLines.find(line => line.includes('total_size_bytes'));
          if (totalLine) {
            const sizeMatch = totalLine.match(/(\d+)/);
            if (sizeMatch) {
              const bytes = parseInt(sizeMatch[1]);
              const sizeMB = (bytes / (1024 * 1024)).toFixed(2);
              console.log(`💾 Total size: ${sizeMB} MB`);
            }
          }

        } catch (statsError) {
          console.log('ℹ️ Could not retrieve database statistics');
        }

        console.log('\n💡 Database Tips:');
        console.log('• Use "kim" database for your application');
        console.log('• "postgres" is the default administrative database');
        console.log('• Template databases (template0, template1) should not be modified');
        console.log('• Size calculation may take time for large databases');

      } catch (error) {
        listSpinner.fail('Failed to list databases');
        throw error;
      }

    } catch (error) {
      console.error('❌ Failed to list databases:', error.message);
      console.log('');
      console.log('💡 Troubleshooting:');
      console.log('• Ensure PostgreSQL is running');
      console.log('• Check if you have access to the postgres database');
      console.log('• Try running: psql -d postgres -c "\\l"');
      console.log('');
      console.log('🔧 Manual command:');
      console.log('   psql -d postgres -c "SELECT datname FROM pg_database;"');
    }

    // Return to main interface
    console.log('\n🔄 Returning to PostgreSQL menu...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.showInterface();
  }

  /**
    * List all database users
    */
  async listUsers() {
    try {
      console.log('\n👥 PostgreSQL Users');
      console.log('===================');
      console.log('');

      const listSpinner = ora('Fetching user list...').start();

      try {
        // Use smart authentication to handle different access methods
        const { stdout } = await this.smartAuthExec('psql -d postgres -c "SELECT usename as username, usesysid as user_id, usecreatedb as can_create_db, usesuper as is_superuser, valuntil as password_expires FROM pg_user ORDER BY usename;"', {
          timeoutMs: 10000,
          operation: 'Listing users',
          allowSudo: false
        });

        listSpinner.succeed('User list retrieved');

        console.log('\n👤 User Information:');
        console.log('====================');
        console.log(stdout);

        // Show user role analysis
        console.log('\n🔍 User Role Analysis:');
        console.log('=======================');

        try {
          const { stdout: roleStats } = await this.smartAuthExec('psql -d postgres -c "SELECT COUNT(*) as total_users, COUNT(CASE WHEN usesuper THEN 1 END) as superusers, COUNT(CASE WHEN usecreatedb THEN 1 END) as can_create_db FROM pg_user;"', {
            timeoutMs: 10000,
            operation: 'User role statistics',
            allowSudo: false
          });

          console.log(roleStats);

        } catch (statsError) {
          console.log('ℹ️ Could not retrieve user role statistics');
        }

        // Show current user information
        console.log('\n🔐 Current Session Info:');
        console.log('========================');
        try {
          const { stdout: sessionInfo } = await this.smartAuthExec('psql -d postgres -c "SELECT current_user as current_user, session_user as session_user, current_database() as current_database;"', {
            timeoutMs: 10000,
            operation: 'Session information',
            allowSudo: false
          });

          console.log(sessionInfo);

        } catch (sessionError) {
          console.log('ℹ️ Could not retrieve session information');
        }

        console.log('\n💡 User Management Tips:');
        console.log('• "postgres" is the default superuser');
        console.log('• "kim" is your application user');
        console.log('• Superusers can bypass all permissions');
        console.log('• Users with "createdb" can create new databases');
        console.log('• Regular users need specific database privileges');

        console.log('\n🔧 Common User Operations:');
        console.log('• Create user: CREATE USER username WITH PASSWORD \'password\';');
        console.log('• Grant privileges: GRANT SELECT ON table TO username;');
        console.log('• Change password: ALTER USER username WITH PASSWORD \'newpassword\';');
        console.log('• Delete user: DROP USER username;');

      } catch (error) {
        listSpinner.fail('Failed to list users');
        throw error;
      }

    } catch (error) {
      console.error('❌ Failed to list users:', error.message);
      console.log('');
      console.log('💡 Troubleshooting:');
      console.log('• Ensure PostgreSQL is running');
      console.log('• Check if you have access to the postgres database');
      console.log('• You may need superuser privileges to view all users');
      console.log('');
      console.log('🔧 Manual commands:');
      console.log('   psql -d postgres -c "SELECT usename FROM pg_user;"');
      console.log('   psql -d postgres -c "\\du" (detailed user info)');
    }

    // Return to main interface
    console.log('\n🔄 Returning to PostgreSQL menu...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.showInterface();
  }

  /**
    * Delete a PostgreSQL database
    */
  async deleteDatabase() {
    try {
      console.log('\n🗑️ Delete PostgreSQL Database');
      console.log('=============================');
      console.log('');
      console.log('⚠️ WARNING: This operation will permanently delete a database and all its data!');
      console.log('💡 This action cannot be undone.');
      console.log('');

      // First, show available databases
      console.log('📊 Available Databases:');
      console.log('=======================');

      try {
        const { stdout: dbList } = await this.smartAuthExec('psql -d postgres -c "SELECT datname as database_name, pg_size_pretty(pg_database_size(datname)) as size, CASE WHEN datname IN (\'postgres\', \'template0\', \'template1\') THEN \'SYSTEM\' ELSE \'USER\' END as type FROM pg_database ORDER BY datname;"', {
          timeoutMs: 10000,
          operation: 'Listing databases for deletion',
          allowSudo: false
        });

        console.log(dbList);

      } catch (error) {
        console.log('❌ Could not retrieve database list');
        console.log('💡 Make sure PostgreSQL is running and accessible');
        await this.showInterface();
        return;
      }

      // Get database name to delete
      const { dbName } = await inquirer.prompt({
        type: 'input',
        name: 'dbName',
        message: 'Enter the name of the database to delete:',
        validate: input => {
          if (!input || input.trim().length === 0) {
            return 'Database name is required';
          }
          if (['postgres', 'template0', 'template1'].includes(input.toLowerCase())) {
            return 'Cannot delete system databases (postgres, template0, template1)';
          }
          return true;
        }
      });

      const databaseName = dbName.trim();

      // Get database info before deletion
      let dbInfo = null;
      try {
        const { stdout: info } = await this.smartAuthExec(`psql -d postgres -c "SELECT datname, pg_size_pretty(pg_database_size(datname)) as size FROM pg_database WHERE datname = '${databaseName}';"`, {
          timeoutMs: 10000,
          operation: 'Getting database info',
          allowSudo: false
        });
        dbInfo = info;
      } catch (error) {
        // Database might not exist
      }

      // Safety confirmations
      console.log(`\n⚠️ DANGER ZONE`);
      console.log(`==============`);
      console.log(`You are about to delete database: ${databaseName}`);

      if (dbInfo) {
        console.log(`Database info: ${dbInfo.trim()}`);
      }

      console.log('');
      console.log('🔒 Safety Checks:');
      console.log('• This will permanently delete ALL data in the database');
      console.log('• All tables, views, functions, and other objects will be lost');
      console.log('• This action CANNOT be undone');
      console.log('');

      // Multiple confirmation steps
      const { confirm1 } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm1',
        message: `Are you absolutely sure you want to delete database '${databaseName}'?`,
        default: false
      });

      if (!confirm1) {
        console.log('❌ Database deletion cancelled');
        await this.showInterface();
        return;
      }

      const { confirm2 } = await inquirer.prompt({
        type: 'input',
        name: 'confirm2',
        message: `Type '${databaseName}' to confirm deletion:`,
        validate: input => input === databaseName || 'Confirmation text does not match database name'
      });

      if (confirm2 !== databaseName) {
        console.log('❌ Database deletion cancelled - confirmation failed');
        await this.showInterface();
        return;
      }

      // Check if database is currently in use
      console.log('\n🔍 Checking for active connections...');

      try {
        const { stdout: connections } = await this.smartAuthExec(`psql -d postgres -c "SELECT COUNT(*) as active_connections FROM pg_stat_activity WHERE datname = '${databaseName}';"`, {
          timeoutMs: 10000,
          operation: 'Checking active connections',
          allowSudo: false
        });

        console.log(`Active connections: ${connections.trim()}`);

        if (connections.includes('1') || connections.includes('2') || connections.includes('3')) {
          console.log('⚠️ Database has active connections');

          const { forceDelete } = await inquirer.prompt({
            type: 'confirm',
            name: 'forceDelete',
            message: 'Force delete database (will terminate active connections)?',
            default: false
          });

          if (!forceDelete) {
            console.log('❌ Database deletion cancelled - active connections present');
            await this.showInterface();
            return;
          }

          console.log('🔧 Terminating active connections...');
          await this.smartAuthExec(`psql -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${databaseName}' AND pid <> pg_backend_pid();"`, {
            timeoutMs: 15000,
            operation: 'Terminating connections',
            allowSudo: false
          });
        }

      } catch (error) {
        console.log('ℹ️ Could not check active connections, proceeding with caution');
      }

      // Perform the deletion
      console.log(`\n🗑️ Deleting database '${databaseName}'...`);
      const deleteSpinner = ora('Deleting database...').start();

      try {
        await this.smartAuthExec(`psql -d postgres -c "DROP DATABASE IF EXISTS ${databaseName};"`, {
          timeoutMs: 30000, // Longer timeout for large databases
          operation: `Deleting database: ${databaseName}`,
          allowSudo: false
        });

        deleteSpinner.succeed(`✅ Database '${databaseName}' deleted successfully`);

        console.log('\n🎉 Database Deletion Complete');
        console.log('=============================');
        console.log(`✅ Database '${databaseName}' has been permanently deleted`);
        console.log('✅ All associated data has been removed');
        console.log('✅ Disk space has been freed');

      } catch (error) {
        deleteSpinner.fail(`❌ Failed to delete database '${databaseName}'`);

        if (error.message.includes('does not exist')) {
          console.log('ℹ️ Database was already deleted or does not exist');
        } else if (error.message.includes('is being accessed by other users')) {
          console.log('❌ Database is currently in use by other users');
          console.log('💡 Try again when no one is using the database');
        } else {
          console.log(`❌ Deletion failed: ${error.message}`);
          console.log('');
          console.log('🔧 Manual deletion command:');
          console.log(`   psql -d postgres -c "DROP DATABASE ${databaseName};"`);
        }
      }

    } catch (error) {
      console.error('❌ Database deletion process failed:', error.message);
      console.log('');
      console.log('💡 Troubleshooting:');
      console.log('• Ensure you have DROP privileges on the database');
      console.log('• Check if the database is currently in use');
      console.log('• Verify PostgreSQL is running');
      console.log('• Make sure you\'re not trying to delete a system database');
    }

    // Return to main interface
    console.log('\n🔄 Returning to PostgreSQL menu...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    await this.showInterface();
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

  /**
   * List available PostgreSQL extensions
   */
  async listAvailableExtensions() {
    try {
      const listSpinner = ora('Fetching available PostgreSQL extensions...').start();
      
      const { stdout } = await exec('psql -d postgres -c "SELECT name, default_version, comment FROM pg_available_extensions ORDER BY name;"');
      
      listSpinner.succeed('Available extensions retrieved');
      
      console.log('\n📦 Available PostgreSQL Extensions:');
      console.log('=====================================');
      console.log(stdout);
      
      console.log('\n💡 Popular extensions you might want to install:');
      console.log('• postgis - Geographic objects support');
      console.log('• uuid-ossp - UUID generation functions');
      console.log('• pgcrypto - Cryptographic functions');
      console.log('• hstore - Key-value pair data type');
      console.log('• ltree - Hierarchical tree data type');
      console.log('• pg_stat_statements - Query execution statistics');
      console.log('• citext - Case-insensitive text type');
      console.log('• unaccent - Text search accent removal');
      
    } catch (error) {
      console.error('❌ Failed to list available extensions:', error.message);
      console.log('💡 Make sure PostgreSQL is running and accessible');
    }
    
    await this.extensionInterface();
  }

  /**
   * Install a PostgreSQL extension
   */
  async installExtension() {
    try {
      // Get database name
      const { dbName } = await inquirer.prompt({
        type: 'input',
        name: 'dbName',
        message: 'Enter database name to install extension in:',
        default: 'postgres',
        validate: input => input.length > 0 || 'Database name is required'
      });

      // Get extension name
      const { extensionName } = await inquirer.prompt({
        type: 'input',
        name: 'extensionName',
        message: 'Enter extension name (e.g., postgis, uuid-ossp, pgcrypto):',
        validate: input => input.length > 0 || 'Extension name is required'
      });

      // Get version (optional)
      const { version } = await inquirer.prompt({
        type: 'input',
        name: 'version',
        message: 'Enter extension version (leave empty for default):',
        default: ''
      });

      console.log(`🔧 Installing extension '${extensionName}' in database '${dbName}'...`);

      let installCommand;
      if (version) {
        installCommand = `psql -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS ${extensionName} VERSION '${version}';"`;
      } else {
        installCommand = `psql -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS ${extensionName};"`;
      }

      // Add loading spinner for extension installation
      const installSpinner = ora(`Installing extension '${extensionName}'...`).start();

      try {
        // Use smart authentication to avoid hanging on sudo prompts
        await this.smartAuthExec(installCommand, {
          timeoutMs: 15000,
          operation: `Extension installation: ${extensionName}`,
          allowSudo: true
        });
        installSpinner.succeed(`✅ Extension '${extensionName}' installed successfully in database '${dbName}'`);
        
        // Show extension info with loading indicator
        const infoSpinner = ora('Fetching extension information...').start();
        const { stdout: info } = await exec(`psql -d ${dbName} -c "SELECT extname, extversion, extrelocatable FROM pg_extension WHERE extname = '${extensionName}';"`);
        infoSpinner.succeed('Extension information retrieved');
        
        console.log('\n📋 Extension Information:');
        console.log(info);
        
        // Show usage examples for common extensions
        this.showExtensionUsageExamples(extensionName);
        
      } catch (error) {
        installSpinner.fail(`❌ Failed to install extension '${extensionName}'`);
        
        // Check for different types of errors
        if (error.message.includes('extension') && error.message.includes('not available')) {
          console.log(`❌ Extension '${extensionName}' is not available in your PostgreSQL installation.`);
          console.log('💡 This extension may need to be installed at the system level first.');
          
          // Offer to install system-level packages for common extensions
          await this.handleSystemLevelInstallation(extensionName);
        } else if (error.message.includes('permission denied') || error.message.includes('Must be superuser') || error.message.includes('Must have CREATE privilege')) {
          console.log(`❌ Permission denied to create extension '${extensionName}'.`);
          console.log('💡 You need elevated privileges to install this extension.');
          
          // Handle privilege issues
          await this.handlePrivilegeIssues(extensionName, dbName);
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to install extension:', error.message);
      console.log('💡 Common issues:');
      console.log('• Extension not available in your PostgreSQL installation');
      console.log('• Database doesn\'t exist');
      console.log('• Insufficient privileges');
      console.log('• Extension already installed');
    }
    
    await this.extensionInterface();
  }

  /**
   * Remove a PostgreSQL extension
   */
  async removeExtension() {
    try {
      // Get database name
      const { dbName } = await inquirer.prompt({
        type: 'input',
        name: 'dbName',
        message: 'Enter database name to remove extension from:',
        default: 'postgres',
        validate: input => input.length > 0 || 'Database name is required'
      });

      // Get extension name
      const { extensionName } = await inquirer.prompt({
        type: 'input',
        name: 'extensionName',
        message: 'Enter extension name to remove:',
        validate: input => input.length > 0 || 'Extension name is required'
      });

      // Confirm removal
      const { confirm } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to remove extension '${extensionName}' from database '${dbName}'?`,
        default: false
      });

      if (!confirm) {
        console.log('❌ Extension removal cancelled');
        await this.extensionInterface();
        return;
      }

      const removeSpinner = ora(`Removing extension '${extensionName}' from database '${dbName}'...`).start();
      
      await exec(`psql -d ${dbName} -c "DROP EXTENSION IF EXISTS ${extensionName};"`);
      
      removeSpinner.succeed(`Extension '${extensionName}' removed successfully from database '${dbName}'`);
      
    } catch (error) {
      console.error('❌ Failed to remove extension:', error.message);
      console.log('💡 Common issues:');
      console.log('• Extension not installed');
      console.log('• Database doesn\'t exist');
      console.log('• Extension is being used by other objects');
      console.log('• Insufficient privileges');
    }
    
    await this.extensionInterface();
  }

  /**
    * Setup authentication for PostgreSQL operations
    */
  async setupAuthentication() {
    try {
      console.log('\n🔐 PostgreSQL Authentication Setup');
      console.log('==================================');
      console.log('');
      console.log('This will help you configure authentication to avoid permission issues');
      console.log('when installing extensions or managing PostgreSQL.');
      console.log('');

      const { choice } = await inquirer.prompt([{
        type: 'list',
        name: 'choice',
        message: 'Choose an authentication setup method:',
        choices: [
          '1. Configure passwordless sudo (recommended)',
          '2. Test current authentication methods',
          '3. Setup postgres user password',
          '4. Grant privileges to current user',
          '5. Go back'
        ]
      }]);

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.configurePasswordlessSudo();
          break;
        case 2:
          await this.testAuthenticationMethods();
          break;
        case 3:
          await this.setupPostgresPassword();
          break;
        case 4:
          await this.grantUserPrivileges();
          break;
        case 5:
          await this.extensionInterface();
          return;
      }

    } catch (error) {
      console.error('❌ Authentication setup failed:', error.message);
      await this.extensionInterface();
    }
  }

  /**
   * Configure passwordless sudo for PostgreSQL operations
   */
  async configurePasswordlessSudo() {
    try {
      console.log('\n🔧 Configuring Passwordless Sudo');
      console.log('===============================');
      console.log('');
      console.log('This will allow the tool to run PostgreSQL commands without password prompts.');
      console.log('');

      const currentUser = process.env.USER || 'current_user';
      console.log(`👤 Current user: ${currentUser}`);
      console.log('');

      console.log('📝 Configuration steps:');
      console.log('1. Add sudo rule for PostgreSQL operations');
      console.log('2. Test the configuration');
      console.log('3. Verify extension installation works');
      console.log('');

      const { confirm } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'Would you like to configure passwordless sudo for PostgreSQL operations?',
        default: true
      });

      if (!confirm) {
        console.log('❌ Passwordless sudo configuration cancelled');
        await this.extensionInterface();
        return;
      }

      console.log('\n🔧 Adding sudo rule...');
      console.log('You will be prompted for your sudo password to edit the sudoers file.');

      try {
        // Add rule to sudoers for psql commands
        const sudoRule = `${currentUser} ALL=(postgres) NOPASSWD: /usr/bin/psql`;
        const sudoersFile = `/etc/sudoers.d/postgresql-${currentUser}`;
        await this.smartAuthExec(`echo "${sudoRule}" | sudo tee ${sudoersFile}`, {
          timeoutMs: 10000,
          operation: 'Adding sudo rule for PostgreSQL',
          allowSudo: true
        });

        console.log('✅ Sudo rule added successfully');

        // Set proper permissions on sudoers file
        await this.smartAuthExec(`sudo chmod 0440 ${sudoersFile}`, {
          timeoutMs: 10000,
          operation: 'Setting sudoers file permissions',
          allowSudo: true
        });

        console.log('✅ Sudoers file permissions set');

        // Test the configuration
        console.log('\n🧪 Testing configuration...');
        try {
          await this.smartAuthExec('psql -d postgres -c "SELECT version();"', {
            timeoutMs: 10000,
            operation: 'Testing PostgreSQL access',
            allowSudo: false
          });
          console.log('✅ Configuration test successful!');
        } catch (error) {
          console.log('⚠️ Configuration test failed, but sudo rule was added');
          console.log('💡 You may need to restart your terminal session or log out and back in');
        }

        console.log('\n🎉 Passwordless sudo configured successfully!');
        console.log('💡 Extension installation should now work without password prompts');

      } catch (error) {
        console.log('\n❌ Failed to configure passwordless sudo');
        console.log('💡 Manual configuration instructions:');
        console.log('');
        console.log('1. Run: sudo visudo');
        console.log(`2. Add this line at the end: ${currentUser} ALL=(postgres) NOPASSWD: /usr/bin/psql`);
        console.log('3. Save and exit');
        console.log('4. Restart your terminal or run: sudo -k && sudo -v');
      }

    } catch (error) {
      console.error('❌ Passwordless sudo configuration failed:', error.message);
    }

    await this.extensionInterface();
  }

  /**
   * Test available authentication methods
   */
  async testAuthenticationMethods() {
    try {
      console.log('\n🔍 Testing Authentication Methods');
      console.log('================================');
      console.log('');

      const testCommands = [
        {
          name: 'Direct psql access',
          command: 'psql -d postgres -c "SELECT 1;"',
          description: 'Try to connect to PostgreSQL directly'
        },
        {
          name: 'Sudo psql access',
          command: 'sudo -u postgres psql -d postgres -c "SELECT 1;"',
          description: 'Try to connect as postgres user with sudo'
        },
        {
          name: 'Sudo without password',
          command: 'sudo -n psql -d postgres -c "SELECT 1;"',
          description: 'Try sudo without password prompt'
        }
      ];

      for (const test of testCommands) {
        console.log(`🧪 Testing: ${test.name}`);
        console.log(`   Command: ${test.command}`);
        console.log(`   Description: ${test.description}`);

        try {
          await this.smartAuthExec(test.command, {
            timeoutMs: 10000,
            operation: test.name,
            allowSudo: true
          });
          console.log('   ✅ SUCCESS');
        } catch (error) {
          console.log(`   ❌ FAILED: ${error.message}`);
        }
        console.log('');
      }

      console.log('💡 Use the method that succeeded for your extension installations');

    } catch (error) {
      console.error('❌ Authentication testing failed:', error.message);
    }

    await this.extensionInterface();
  }

  /**
   * Setup postgres user password
   */
  async setupPostgresPassword() {
    try {
      console.log('\n🔑 Setting Up Postgres User Password');
      console.log('===================================');
      console.log('');
      console.log('This will help you set a password for the postgres user');
      console.log('so you can authenticate when needed.');
      console.log('');

      const { newPassword } = await inquirer.prompt([{
        type: 'password',
        name: 'newPassword',
        message: 'Enter new password for postgres user:',
        validate: input => input.length >= 8 || 'Password must be at least 8 characters'
      }]);

      const { confirmPassword } = await inquirer.prompt([{
        type: 'password',
        name: 'confirmPassword',
        message: 'Confirm password:',
        validate: input => input === newPassword || 'Passwords do not match'
      }]);

      console.log('\n🔧 Setting postgres user password...');

      try {
        // Try to set password using smart authentication
        await this.smartAuthExec(`sudo -u postgres psql -c "ALTER USER postgres PASSWORD '${newPassword}';"`, {
          timeoutMs: 15000,
          operation: 'Setting postgres user password',
          allowSudo: true
        });

        console.log('✅ Postgres user password set successfully');
        console.log('');
        console.log('💡 You can now use this password for PostgreSQL authentication');
        console.log('📝 Password authentication methods will now work');

      } catch (error) {
        console.log('\n❌ Failed to set postgres password automatically');
        console.log('💡 Manual instructions:');
        console.log('');
        console.log('1. Switch to postgres user: sudo su - postgres');
        console.log('2. Connect to PostgreSQL: psql');
        console.log('3. Set password: ALTER USER postgres PASSWORD \'yourpassword\';');
        console.log('4. Exit: \\q');
        console.log('5. Return to your user: exit');
      }

    } catch (error) {
      console.error('❌ Postgres password setup failed:', error.message);
    }

    await this.extensionInterface();
  }

  /**
   * Grant privileges to current user
   */
  async grantUserPrivileges() {
    try {
      console.log('\n👤 Granting Privileges to Current User');
      console.log('=====================================');
      console.log('');
      console.log('This will grant the necessary privileges to your current user');
      console.log('so you can install extensions without switching to postgres user.');
      console.log('');

      const currentUser = process.env.USER || 'current_user';
      console.log(`👤 Current user: ${currentUser}`);
      console.log('');

      const { confirm } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: `Grant CREATE privileges on postgres database to ${currentUser}?`,
        default: true
      });

      if (!confirm) {
        console.log('❌ Privilege grant cancelled');
        await this.extensionInterface();
        return;
      }

      console.log('\n🔧 Granting privileges...');

      try {
        // Grant CREATE privilege on postgres database
        await this.smartAuthExec(`sudo -u postgres psql -d postgres -c "GRANT CREATE ON DATABASE postgres TO ${currentUser};"`, {
          timeoutMs: 15000,
          operation: 'Granting CREATE privilege',
          allowSudo: true
        });

        console.log('✅ CREATE privilege granted successfully');
        console.log('');
        console.log('💡 You should now be able to install extensions directly');
        console.log('🔧 Try installing an extension to test the new privileges');

      } catch (error) {
        console.log('\n❌ Failed to grant privileges automatically');
        console.log('💡 Manual instructions:');
        console.log('');
        console.log('1. Switch to postgres user: sudo su - postgres');
        console.log('2. Connect to PostgreSQL: psql -d postgres');
        console.log(`3. Grant privileges: GRANT CREATE ON DATABASE postgres TO ${currentUser};`);
        console.log('4. Exit: \\q');
        console.log('5. Return to your user: exit');
      }

    } catch (error) {
      console.error('❌ Privilege grant failed:', error.message);
    }

    await this.extensionInterface();
  }

  /**
    * List installed extensions
    */
  async listInstalledExtensions() {
    try {
      // Get database name
      const { dbName } = await inquirer.prompt({
        type: 'input',
        name: 'dbName',
        message: 'Enter database name to check extensions:',
        default: 'postgres',
        validate: input => input.length > 0 || 'Database name is required'
      });

      const listSpinner = ora(`Checking installed extensions in database '${dbName}'...`).start();

      try {
        const { stdout } = await this.smartAuthExec(`psql -d ${dbName} -c "SELECT extname, extversion, extrelocatable, nspname as schema FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid ORDER BY extname;"`, {
          timeoutMs: 10000,
          operation: 'Listing installed extensions',
          allowSudo: false
        });

        listSpinner.succeed(`Installed extensions retrieved from '${dbName}'`);

        console.log(`\n📦 Installed Extensions in '${dbName}':`);
        console.log('=====================================');
        console.log(stdout);

      } catch (error) {
        listSpinner.fail('Failed to list installed extensions');
        throw error;
      }

    } catch (error) {
      console.error('❌ Failed to list installed extensions:', error.message);
      console.log('💡 Make sure PostgreSQL is running and the database exists');
      console.log('🔧 Try running "Setup authentication" if you have permission issues');
    }

    await this.extensionInterface();
  }

  /**
   * Show usage examples for common extensions
   */
  showExtensionUsageExamples(extensionName) {
    console.log('\n📚 Usage Examples:');
    console.log('==================');
    
    switch (extensionName.toLowerCase()) {
      case 'postgis':
        console.log('🗺️ PostGIS - Geographic Information System:');
        console.log('   CREATE TABLE locations (id SERIAL PRIMARY KEY, name TEXT, geom GEOMETRY(POINT, 4326));');
        console.log('   INSERT INTO locations (name, geom) VALUES (\'Paris\', ST_GeomFromText(\'POINT(2.3522 48.8566)\', 4326));');
        console.log('   SELECT name, ST_AsText(geom) FROM locations;');
        break;
        
      case 'uuid-ossp':
        console.log('🆔 UUID-OSSP - UUID generation:');
        console.log('   SELECT uuid_generate_v4(); -- Generate random UUID');
        console.log('   SELECT uuid_generate_v1(); -- Generate time-based UUID');
        console.log('   CREATE TABLE users (id UUID DEFAULT uuid_generate_v4() PRIMARY KEY, name TEXT);');
        break;
        
      case 'pgcrypto':
        console.log('🔐 PGCrypto - Cryptographic functions:');
        console.log('   SELECT crypt(\'password\', gen_salt(\'bf\')); -- Hash password');
        console.log('   SELECT encode(digest(\'text\', \'sha256\'), \'hex\'); -- SHA256 hash');
        console.log('   SELECT gen_random_uuid(); -- Generate random UUID');
        break;
        
      case 'hstore':
        console.log('🗂️ HStore - Key-value storage:');
        console.log('   CREATE TABLE products (id SERIAL PRIMARY KEY, attributes HSTORE);');
        console.log('   INSERT INTO products (attributes) VALUES (\'color => "red", size => "large"\');');
        console.log('   SELECT attributes->\'color\' FROM products; -- Get value by key');
        break;
        
      case 'ltree':
        console.log('🌳 LTree - Hierarchical tree data:');
        console.log('   CREATE TABLE categories (id SERIAL PRIMARY KEY, path LTREE);');
        console.log('   INSERT INTO categories (path) VALUES (\'Top.Science.Astronomy\');');
        console.log('   SELECT * FROM categories WHERE path <@ \'Top.Science\'; -- Find descendants');
        break;
        
      case 'pg_stat_statements':
        console.log('📊 PG_STAT_STATEMENTS - Query statistics:');
        console.log('   -- View query performance statistics');
        console.log('   SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;');
        break;
        
      case 'citext':
        console.log('📝 CIText - Case-insensitive text:');
        console.log('   CREATE TABLE users (id SERIAL PRIMARY KEY, email CITEXT UNIQUE);');
        console.log('   INSERT INTO users (email) VALUES (\'User@Example.COM\');');
        console.log('   SELECT * FROM users WHERE email = \'user@example.com\'; -- Case-insensitive match');
        break;
        
      case 'unaccent':
        console.log('🔤 Unaccent - Text search without accents:');
        console.log('   SELECT unaccent(\'café\'); -- Returns \'cafe\'');
        console.log('   CREATE INDEX ON users USING gin(to_tsvector(\'unaccent\', name));');
        break;
        
      default:
        console.log(`📖 For more information about '${extensionName}', check the PostgreSQL documentation:`);
        console.log(`   https://www.postgresql.org/docs/current/${extensionName}.html`);
    }
  }

  /**
   * Handle system-level installation for extensions that need it
   */
  async handleSystemLevelInstallation(extensionName) {
    try {
      console.log('\n🔧 System-Level Installation Required');
      console.log('=====================================');
      
      // Check if we can detect the PostgreSQL version
      let pgVersion = '17'; // Default to 17
      try {
        const { stdout } = await exec('psql --version');
        const versionMatch = stdout.match(/PostgreSQL (\d+)/);
        if (versionMatch) {
          pgVersion = versionMatch[1];
        }
      } catch (error) {
        console.log('⚠️ Could not detect PostgreSQL version, using default');
      }
      
      console.log(`📦 Detected PostgreSQL version: ${pgVersion}`);
      
      // Provide installation instructions for common extensions
      const systemPackages = await this.getSystemPackagesForExtension(extensionName, pgVersion);
      
      if (systemPackages.length > 0) {
        console.log(`\n💡 To install '${extensionName}', you need to install these system packages:`);
        systemPackages.forEach(pkg => {
          console.log(`   • ${pkg}`);
        });
        
        console.log('\n📋 Installation Commands:');
        console.log('========================');
        
        if (this.platform === 'linux') {
          // Detect package manager
          let packageManager = null;
          let installCommand = null;
          
          try {
            await exec('which apt');
            packageManager = 'apt';
            installCommand = `sudo apt install -y ${systemPackages.join(' ')}`;
            console.log(`🐧 For Ubuntu/Debian (using apt):`);
            console.log(`   ${installCommand}`);
          } catch (error) {
            try {
              await exec('which yum');
              packageManager = 'yum';
              installCommand = `sudo yum install -y ${systemPackages.join(' ')}`;
              console.log(`🐧 For RHEL/CentOS (using yum):`);
              console.log(`   ${installCommand}`);
            } catch (error) {
              try {
                await exec('which dnf');
                packageManager = 'dnf';
                installCommand = `sudo dnf install -y ${systemPackages.join(' ')}`;
                console.log(`🐧 For Fedora (using dnf):`);
                console.log(`   ${installCommand}`);
              } catch (error) {
                console.log(`🐧 For your Linux distribution, install: ${systemPackages.join(', ')}`);
              }
            }
          }
        } else if (this.platform === 'darwin') {
          console.log(`🍎 For macOS (using Homebrew):`);
          console.log(`   brew install ${systemPackages.join(' ')}`);
        } else if (this.platform === 'win32') {
          console.log(`🪟 For Windows:`);
          console.log(`   Download and install from: https://postgis.net/install/`);
        }
        
        // Ask if user wants to try automatic installation
        const { autoInstall } = await inquirer.prompt({
          type: 'confirm',
          name: 'autoInstall',
          message: 'Would you like me to try installing the system packages automatically?',
          default: false
        });
        
        if (autoInstall) {
          await this.installSystemPackages(systemPackages);
        } else {
          console.log('\n📝 Manual Installation Steps:');
          console.log('1. Run the installation command above');
          console.log('2. Restart PostgreSQL service if needed');
          console.log('3. Come back to this tool and try installing the extension again');
        }
      } else {
        console.log(`\n❓ Extension '${extensionName}' is not recognized as requiring system-level installation.`);
        console.log('💡 This might be a custom extension or one that needs manual setup.');
        console.log('📖 Check the extension documentation for installation instructions.');
      }
      
    } catch (error) {
      console.error('❌ Failed to handle system-level installation:', error.message);
    }
    
    await this.extensionInterface();
  }

  /**
   * Get system packages needed for specific extensions
   */
  async getSystemPackagesForExtension(extensionName, pgVersion) {
    const packages = {
      'postgis': {
        linux: {
          ubuntu: [`postgresql-${pgVersion}-postgis-3`],
          debian: [`postgresql-${pgVersion}-postgis-3`],
          rhel: [`postgresql${pgVersion}-postgis`],
          centos: [`postgresql${pgVersion}-postgis`],
          fedora: [`postgresql${pgVersion}-postgis`],
          arch: ['postgis']
        },
        darwin: ['postgis'],
        win32: ['postgis']
      },
      'postgis-topology': {
        linux: {
          ubuntu: [`postgresql-${pgVersion}-postgis-3`],
          debian: [`postgresql-${pgVersion}-postgis-3`],
          rhel: [`postgresql${pgVersion}-postgis`],
          centos: [`postgresql${pgVersion}-postgis`],
          fedora: [`postgresql${pgVersion}-postgis`],
          arch: ['postgis']
        },
        darwin: ['postgis'],
        win32: ['postgis']
      },
      'pgrouting': {
        linux: {
          ubuntu: [`postgresql-${pgVersion}-pgrouting`],
          debian: [`postgresql-${pgVersion}-pgrouting`],
          rhel: [`postgresql${pgVersion}-pgrouting`],
          centos: [`postgresql${pgVersion}-pgrouting`],
          fedora: [`postgresql${pgVersion}-pgrouting`],
          arch: ['pgrouting']
        },
        darwin: ['pgrouting'],
        win32: ['pgrouting']
      }
    };
    
    const extensionPackages = packages[extensionName.toLowerCase()];
    if (!extensionPackages) return [];
    
    const platformPackages = extensionPackages[this.platform];
    if (!platformPackages) return [];
    
    // For Linux, try to detect distribution
    if (this.platform === 'linux') {
      try {
        const { stdout } = await exec('lsb_release -is 2>/dev/null || cat /etc/os-release | grep ^ID= | cut -d= -f2');
        const distro = stdout.trim().toLowerCase();
        
        if (distro.includes('ubuntu')) {
          return platformPackages.ubuntu || [];
        } else if (distro.includes('debian')) {
          return platformPackages.debian || [];
        } else if (distro.includes('rhel') || distro.includes('redhat')) {
          return platformPackages.rhel || [];
        } else if (distro.includes('centos')) {
          return platformPackages.centos || [];
        } else if (distro.includes('fedora')) {
          return platformPackages.fedora || [];
        } else if (distro.includes('arch')) {
          return platformPackages.arch || [];
        }
      } catch (error) {
        console.log('⚠️ Could not detect Linux distribution, using default packages');
      }
    }
    
    return platformPackages.default || platformPackages;
  }

  /**
   * Install system packages for extensions
   */
  async installSystemPackages(packages) {
    try {
      console.log(`🔧 Installing system packages: ${packages.join(', ')}`);
      
      if (this.platform === 'linux') {
        // Detect package manager with loading indicator
        const detectSpinner = ora('Detecting package manager...').start();
        let packageManager = null;
        let installCommand = null;
        let updateCommand = null;
        
        try {
          await exec('which apt');
          packageManager = 'apt';
          installCommand = `sudo apt install -y ${packages.join(' ')}`;
          updateCommand = 'sudo apt update';
          detectSpinner.succeed('Detected APT package manager (Ubuntu/Debian)');
        } catch (error) {
          try {
            await exec('which yum');
            packageManager = 'yum';
            installCommand = `sudo yum install -y ${packages.join(' ')}`;
            updateCommand = 'sudo yum update -y';
            detectSpinner.succeed('Detected YUM package manager (RHEL/CentOS)');
          } catch (error) {
            try {
              await exec('which dnf');
              packageManager = 'dnf';
              installCommand = `sudo dnf install -y ${packages.join(' ')}`;
              updateCommand = 'sudo dnf update -y';
              detectSpinner.succeed('Detected DNF package manager (Fedora)');
            } catch (error) {
              try {
                await exec('which pacman');
                packageManager = 'pacman';
                installCommand = `sudo pacman -S --noconfirm ${packages.join(' ')}`;
                updateCommand = 'sudo pacman -Sy';
                detectSpinner.succeed('Detected Pacman package manager (Arch)');
              } catch (error) {
                detectSpinner.fail('No supported package manager found');
                throw new Error('No supported package manager found. This tool supports APT (Ubuntu/Debian), YUM (RHEL/CentOS), DNF (Fedora), and Pacman (Arch).');
              }
            }
          }
        }
        
        // Update package lists
        const updateSpinner = ora(`Updating package lists with ${packageManager}...`).start();
        try {
          await exec(updateCommand);
          updateSpinner.succeed(`Package lists updated with ${packageManager}`);
        } catch (error) {
          updateSpinner.warn(`Failed to update package lists, continuing with installation...`);
        }
        
        // Install packages
        const installSpinner = ora(`Installing packages with ${packageManager}...`).start();
        console.log('⏳ This may take 2-5 minutes depending on package size...');
        try {
          // Use smart authentication for package installation
          await this.smartAuthExec(installCommand, {
            timeoutMs: 300000, // 5 minutes for package installation
            operation: `Package installation with ${packageManager}`,
            allowSudo: true
          });
          installSpinner.succeed(`System packages installed successfully with ${packageManager}`);
        } catch (error) {
          installSpinner.fail(`Failed to install packages with ${packageManager}`);
          if (error.message.includes('timed out')) {
            console.log('\n💡 Package installation timed out. This might be due to:');
            console.log('• Large packages requiring more time');
            console.log('• Network connectivity issues');
            console.log('• Sudo password prompt in non-interactive environment');
            console.log('\n🔧 Try running this command manually:');
            console.log(`   ${installCommand}`);
          }
          throw new Error(`Package installation failed with ${packageManager}. Please check your system permissions and try again.`);
        }
        
        // Restart PostgreSQL service
        const restartSpinner = ora('Restarting PostgreSQL service...').start();
        try {
          await exec('sudo systemctl restart postgresql');
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for service to restart
          restartSpinner.succeed('PostgreSQL service restarted successfully');
        } catch (error) {
          restartSpinner.warn('PostgreSQL service restart failed, but packages are installed');
        }
        
      } else if (this.platform === 'darwin') {
        // Check if Homebrew is available
        const brewCheckSpinner = ora('Checking Homebrew availability...').start();
        try {
          await exec('which brew');
          brewCheckSpinner.succeed('Homebrew found');
        } catch (error) {
          brewCheckSpinner.fail('Homebrew not found');
          throw new Error('Homebrew not found. Please install Homebrew first: https://brew.sh/');
        }
        
        // Install packages with Homebrew
        const brewSpinner = ora(`Installing packages with Homebrew...`).start();
        console.log('⏳ This may take 3-7 minutes...');
        try {
          await exec(`brew install ${packages.join(' ')}`);
          brewSpinner.succeed('System packages installed successfully with Homebrew');
        } catch (error) {
          brewSpinner.fail('Failed to install packages with Homebrew');
          throw new Error('Package installation failed via Homebrew. Please check your internet connection and try again.');
        }
        
        // Restart PostgreSQL service on macOS
        const restartSpinner = ora('Restarting PostgreSQL service...').start();
        try {
          await exec('brew services restart postgresql');
          restartSpinner.succeed('PostgreSQL service restarted successfully');
        } catch (error) {
          restartSpinner.warn('PostgreSQL service restart failed, but packages are installed');
        }
        
      } else if (this.platform === 'win32') {
        console.log('🪟 Windows detected - manual installation required');
        console.log('');
        console.log('📥 For PostGIS on Windows:');
        console.log('1. Download PostGIS from: https://postgis.net/install/');
        console.log('2. Run the installer and follow the setup wizard');
        console.log('3. Restart PostgreSQL service');
        console.log('');
        console.log('💡 Alternative: Use Docker with PostGIS:');
        console.log('   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=1234 postgis/postgis');
        console.log('');
        console.log('🔄 After installation, restart this tool to continue with setup');
        
        return {
          success: true,
          platform: this.platform,
          manualInstallation: true,
          timestamp: new Date().toISOString()
        };
        
      } else {
        throw new Error(`Unsupported platform: ${this.platform}`);
      }
      
      console.log('\n🎉 System packages installed successfully!');
      console.log('💡 You can now try installing the extension again.');
      
    } catch (error) {
      console.error('❌ Failed to install system packages:', error.message);
      console.log('💡 Please install the packages manually and try again.');
      console.log('📖 Check the installation instructions above for your platform.');
    }
  }

  /**
   * Handle privilege issues when installing extensions
   */
  async handlePrivilegeIssues(extensionName, dbName) {
    try {
      console.log('\n🔐 Privilege Issues Detected');
      console.log('============================');
      console.log(`❌ You don't have sufficient privileges to install '${extensionName}' in database '${dbName}'.`);
      console.log('');
      console.log('💡 Here are several solutions to try:');
      console.log('');
      
      // Check current user and suggest solutions
      const currentUser = process.env.USER || 'unknown';
      console.log(`👤 Current user: ${currentUser}`);
      console.log('');
      
      console.log('🔧 Solution Options:');
      console.log('===================');
      console.log('');
      console.log('⚠️  IMPORTANT: Automatic operations may hang on password prompts');
      console.log('💡 If the tool appears stuck, press Ctrl+C to cancel and try manual approach');
      console.log('🔧 Manual approach is recommended to avoid hanging issues');
      console.log('');
      console.log('1. 🐧 For Linux/macOS - Use sudo with postgres user:');
      console.log(`   sudo -u postgres psql -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS ${extensionName};"`);
      console.log('');
      console.log('2. 🔑 Grant CREATE privilege to your user:');
      console.log(`   sudo -u postgres psql -d ${dbName} -c "GRANT CREATE ON DATABASE ${dbName} TO ${currentUser};"`);
      console.log('');
      console.log('3. 👑 Connect as postgres superuser:');
      console.log(`   psql -U postgres -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS ${extensionName};"`);
      console.log('');
      console.log('4. 🔄 Switch to postgres user and try again:');
      console.log('   sudo su - postgres');
      console.log(`   psql -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS ${extensionName};"`);
      console.log('');
      
      // Ask if user wants to try automatic solutions
      const { trySolution } = await inquirer.prompt({
        type: 'list',
        name: 'trySolution',
        message: 'Would you like me to try one of these solutions automatically?',
        choices: [
          '1. Show manual instructions only (recommended - avoids hanging)',
          '2. Try with sudo and postgres user (may hang on password prompt)',
          '3. Grant CREATE privilege to current user (may hang on password prompt)',
          '4. Connect as postgres superuser (may hang on password prompt)',
          '5. Cancel and go back'
        ]
      });
      
      const selected = parseInt(trySolution.split('.')[0]);
      
      switch (selected) {
        case 1:
          console.log('\n📝 Manual Installation Steps (Recommended):');
          console.log('==========================================');
          console.log('');
          console.log('🔧 Step-by-step instructions:');
          console.log('');
          console.log('1. Open a new terminal window');
          console.log('2. Run one of these commands:');
          console.log('');
          console.log('   Option A - Use sudo with postgres user:');
          console.log(`   sudo -u postgres psql -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS ${extensionName};"`);
          console.log('');
          console.log('   Option B - Grant privileges first:');
          console.log(`   sudo -u postgres psql -d ${dbName} -c "GRANT CREATE ON DATABASE ${dbName} TO ${currentUser};"`);
          console.log(`   psql -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS ${extensionName};"`);
          console.log('');
          console.log('   Option C - Connect as postgres superuser:');
          console.log(`   psql -U postgres -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS ${extensionName};"`);
          console.log('');
          console.log('3. Come back to this tool and verify the extension is installed');
          console.log('4. Use "List installed extensions" to check if it worked');
          break;
        case 2:
          await this.trySudoPostgresUser(extensionName, dbName);
          break;
        case 3:
          await this.grantCreatePrivilege(currentUser, dbName, extensionName);
          break;
        case 4:
          await this.tryAsPostgresSuperuser(extensionName, dbName);
          break;
        case 5:
          console.log('❌ Extension installation cancelled');
          break;
      }
      
    } catch (error) {
      console.error('❌ Failed to handle privilege issues:', error.message);
    }
    
    await this.extensionInterface();
  }

  /**
   * Smart authentication handler for PostgreSQL operations
   * Automatically detects and uses the best available authentication method
   */
  async smartAuthExec(command, options = {}) {
    const {
      timeoutMs = 10000,
      maxRetries = 3,
      operation = 'PostgreSQL operation',
      allowSudo = true
    } = options;

    let lastError;

    // Check cache first for successful methods
    const cacheKey = this.getCacheKey(command);
    const cachedMethod = this.authCache.get(cacheKey);
    if (cachedMethod && cachedMethod.success) {
      console.log(`💾 Using cached authentication method: ${cachedMethod.name}`);
      try {
        const result = await cachedMethod.execute();
        return result;
      } catch (error) {
        console.log(`⚠️ Cached method failed, trying alternatives: ${error.message}`);
        this.authCache.delete(cacheKey); // Remove failed cached method
      }
    }

    // Try different authentication methods in order of preference
    const authMethods = [
      {
        name: 'Direct execution (no sudo)',
        test: () => this.testDirectExecution(command, timeoutMs),
        execute: () => this.executeDirect(command, timeoutMs)
      },
      {
        name: 'Sudo without password',
        test: () => this.testSudoNoPassword(command, timeoutMs),
        execute: () => this.executeSudoNoPassword(command, timeoutMs)
      },
      {
        name: 'Sudo with cached password',
        test: () => this.testSudoCached(command, timeoutMs),
        execute: () => this.executeSudoCached(command, timeoutMs)
      }
    ];

    // Add sudo with password prompt only if explicitly allowed
    if (allowSudo) {
      authMethods.push({
        name: 'Sudo with password prompt',
        test: () => this.testSudoPassword(command, timeoutMs),
        execute: () => this.executeSudoPassword(command, timeoutMs, operation)
      });
    }

    // Try each method
    for (const method of authMethods) {
      try {
        console.log(`🔍 Trying ${method.name}...`);

        // Test if this method will work
        const canUse = await method.test();
        if (!canUse) {
          console.log(`❌ ${method.name} not available`);
          continue;
        }

        console.log(`✅ Using ${method.name}`);

        // Execute with retries
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const result = await method.execute();

            // Cache successful method
            this.authCache.set(cacheKey, {
              name: method.name,
              success: true,
              execute: method.execute,
              timestamp: Date.now()
            });

            console.log(`✅ ${operation} completed successfully`);
            return result;
          } catch (error) {
            lastError = error;
            console.log(`⚠️ Attempt ${attempt}/${maxRetries} failed: ${error.message}`);

            if (attempt < maxRetries) {
              console.log(`🔄 Retrying in 2 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          }
        }

      } catch (error) {
        lastError = error;
        console.log(`❌ ${method.name} failed: ${error.message}`);
      }
    }

    // All methods failed
    throw new Error(`${operation} failed with all authentication methods. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Generate cache key for authentication method
   */
  getCacheKey(command) {
    // Create a simple hash of the command for caching
    return `auth_${command.replace(/\s+/g, '_').substring(0, 50)}`;
  }

  /**
   * Clear authentication cache
   */
  clearAuthCache() {
    this.authCache.clear();
    console.log('💾 Authentication cache cleared');
  }

  /**
   * Show cached authentication methods
   */
  showAuthCache() {
    console.log('\n💾 Cached Authentication Methods:');
    console.log('================================');
    if (this.authCache.size === 0) {
      console.log('No cached methods');
      return;
    }

    for (const [key, method] of this.authCache.entries()) {
      const age = Math.round((Date.now() - method.timestamp) / 1000 / 60); // minutes
      console.log(`• ${method.name} (${key}) - cached ${age} minutes ago`);
    }
    console.log('');
  }

  /**
   * Test if direct execution (no sudo) works
   */
  async testDirectExecution(command, timeoutMs) {
    try {
      await this.execWithTimeout(command, timeoutMs);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute command directly without sudo
   */
  async executeDirect(command, timeoutMs) {
    return await this.execWithTimeout(command, timeoutMs);
  }

  /**
   * Test if sudo works without password
   */
  async testSudoNoPassword(command, timeoutMs) {
    try {
      // Try a simple sudo command that should work without password
      await this.execWithTimeout('sudo -n true', Math.min(timeoutMs, 3000));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute command with sudo (no password required)
   */
  async executeSudoNoPassword(command, timeoutMs) {
    // For psql commands, we need to handle user switching properly
    if (command.includes('psql')) {
      const sudoCommand = `sudo -n -u postgres ${command}`;
      return await this.execWithTimeout(sudoCommand, timeoutMs);
    } else {
      const sudoCommand = `sudo -n ${command}`;
      return await this.execWithTimeout(sudoCommand, timeoutMs);
    }
  }

  /**
   * Test if we have a cached sudo password
   */
  async testSudoCached(command, timeoutMs) {
    try {
      // Check if sudo timestamp is still valid (within last 15 minutes)
      await this.execWithTimeout('sudo -n true', Math.min(timeoutMs, 3000));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Execute command with cached sudo password
   */
  async executeSudoCached(command, timeoutMs) {
    // For psql commands, we need to handle user switching properly
    if (command.includes('psql')) {
      const sudoCommand = `sudo -u postgres ${command}`;
      return await this.execWithTimeout(sudoCommand, timeoutMs);
    } else {
      const sudoCommand = `sudo ${command}`;
      return await this.execWithTimeout(sudoCommand, timeoutMs);
    }
  }

  /**
   * Test if sudo with password prompt is feasible
   */
  async testSudoPassword(command, timeoutMs) {
    // Only suggest password prompt if we're in an interactive environment
    // and the command is likely to need a password
    return process.stdin.isTTY && command.includes('sudo');
  }

  /**
   * Execute command with sudo password prompt (interactive only)
   */
  async executeSudoPassword(command, timeoutMs, operation) {
    if (!process.stdin.isTTY) {
      throw new Error('Cannot prompt for sudo password in non-interactive environment');
    }

    console.log(`\n🔐 ${operation} requires sudo access`);
    console.log(`🔑 Please enter your sudo password when prompted`);
    console.log(`💡 If the command hangs, press Ctrl+C to cancel\n`);

    // For psql commands, we need to handle user switching properly
    if (command.includes('psql')) {
      const sudoCommand = `sudo -u postgres ${command}`;
      return await this.execWithTimeout(sudoCommand, timeoutMs);
    } else {
      const sudoCommand = `sudo ${command}`;
      return await this.execWithTimeout(sudoCommand, timeoutMs);
    }
  }

  /**
   * Execute command with proper timeout handling and no interactive prompts
   */
  async execWithTimeout(command, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      // Use exec with timeout instead of spawn to avoid interactive prompt issues
      const { exec } = require('child_process');

      const timeout = setTimeout(() => {
        reject(new Error('Operation timed out - this may indicate a password prompt or system issue'));
      }, timeoutMs);

      exec(command, {
        timeout: timeoutMs - 1000, // Leave 1 second buffer
        maxBuffer: 1024 * 1024 // 1MB buffer
      }, (error, stdout, stderr) => {
        clearTimeout(timeout);

        if (error) {
          if (error.code === 'TIMEOUT') {
            reject(new Error('Operation timed out - likely waiting for password input'));
          } else {
            reject(new Error(`Command failed: ${stderr || error.message}`));
          }
        } else {
          resolve({ stdout, stderr });
        }
      });
    });
  }

  /**
   * Try installing extension with sudo and postgres user
   */
  async trySudoPostgresUser(extensionName, dbName) {
    try {
      console.log(`🔧 Trying to install '${extensionName}' with sudo and postgres user...`);
      console.log('⏳ This may take a moment and may prompt for your sudo password...');
      console.log('💡 If it hangs, press Ctrl+C to cancel and try manual approach');
      
      const sudoSpinner = ora(`Installing extension with elevated privileges...`).start();
      
      try {
        const installCommand = `sudo -u postgres psql -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS ${extensionName};"`;
        await this.execWithTimeout(installCommand, 20000); // 20 second timeout
        
        sudoSpinner.succeed(`✅ Extension '${extensionName}' installed successfully with postgres user`);
        
        // Verify installation
        const verifySpinner = ora('Verifying extension installation...').start();
        const { stdout: info } = await this.execWithTimeout(`psql -d ${dbName} -c "SELECT extname, extversion FROM pg_extension WHERE extname = '${extensionName}';"`, 10000);
        verifySpinner.succeed('Extension verification completed');
        
        console.log('\n📋 Extension Information:');
        console.log(info);
        
        this.showExtensionUsageExamples(extensionName);
        
      } catch (error) {
        sudoSpinner.fail('Failed to install extension with sudo');
        if (error.message.includes('timed out')) {
          console.log('⏰ Operation timed out. This might be due to:');
          console.log('• Sudo password prompt (check your terminal)');
          console.log('• PostgreSQL authentication issues');
          console.log('• Network connectivity problems');
          console.log('');
          console.log('💡 Try running this command manually:');
          console.log(`   sudo -u postgres psql -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS ${extensionName};"`);
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to install with sudo and postgres user:', error.message);
      console.log('💡 You may need to enter your sudo password or check PostgreSQL configuration');
    }
  }

  /**
   * Grant CREATE privilege to current user
   */
  async grantCreatePrivilege(currentUser, dbName, extensionName) {
    try {
      console.log(`🔑 Granting CREATE privilege to user '${currentUser}' on database '${dbName}'...`);
      console.log('⏳ This may take a moment and may prompt for your sudo password...');
      console.log('💡 If it hangs, press Ctrl+C to cancel and try manual approach');
      
      const grantSpinner = ora('Granting CREATE privilege...').start();
      
      try {
        const grantCommand = `sudo -u postgres psql -d ${dbName} -c "GRANT CREATE ON DATABASE ${dbName} TO ${currentUser};"`;
        await this.execWithTimeout(grantCommand, 20000); // 20 second timeout
        
        grantSpinner.succeed(`CREATE privilege granted to '${currentUser}'`);
        
        // Try installing the extension again
        console.log(`🔧 Now trying to install '${extensionName}'...`);
        const installSpinner = ora(`Installing extension '${extensionName}'...`).start();
        
        try {
          await this.execWithTimeout(`psql -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS ${extensionName};"`, 10000);
          installSpinner.succeed(`✅ Extension '${extensionName}' installed successfully`);
          
          // Show extension info
          const infoSpinner = ora('Fetching extension information...').start();
          const { stdout: info } = await this.execWithTimeout(`psql -d ${dbName} -c "SELECT extname, extversion FROM pg_extension WHERE extname = '${extensionName}';"`, 10000);
          infoSpinner.succeed('Extension information retrieved');
          
          console.log('\n📋 Extension Information:');
          console.log(info);
          
          this.showExtensionUsageExamples(extensionName);
          
        } catch (installError) {
          installSpinner.fail('Failed to install extension after granting privileges');
          console.log('❌ Extension installation still failed after granting privileges');
          console.log('💡 The privilege grant may not have been sufficient or there may be other issues');
          console.log('🔧 Try one of the other solutions or run the command manually');
        }
        
      } catch (error) {
        grantSpinner.fail('Failed to grant CREATE privilege');
        if (error.message.includes('timed out')) {
          console.log('⏰ Operation timed out. This might be due to:');
          console.log('• Sudo password prompt (check your terminal)');
          console.log('• PostgreSQL authentication issues');
          console.log('• Network connectivity problems');
          console.log('');
          console.log('💡 Try running this command manually:');
          console.log(`   sudo -u postgres psql -d ${dbName} -c "GRANT CREATE ON DATABASE ${dbName} TO ${currentUser};"`);
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to grant privileges:', error.message);
      console.log('💡 Common issues:');
      console.log('• Sudo password prompt (check your terminal)');
      console.log('• PostgreSQL authentication configuration');
      console.log('• User permissions in PostgreSQL');
      console.log('');
      console.log('🔧 Manual solution:');
      console.log(`   sudo -u postgres psql -d ${dbName} -c "GRANT CREATE ON DATABASE ${dbName} TO ${currentUser};"`);
    }
  }

  /**
   * Try installing extension as postgres superuser
   */
  async tryAsPostgresSuperuser(extensionName, dbName) {
    try {
      console.log(`🔧 Trying to install '${extensionName}' as postgres superuser...`);
      console.log('💡 You will be prompted for the postgres user password');
      console.log('💡 If it hangs, press Ctrl+C to cancel and try manual approach');
      
      const superuserSpinner = ora(`Installing extension as postgres superuser...`).start();
      
      try {
        const installCommand = `psql -U postgres -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS ${extensionName};"`;
        await this.execWithTimeout(installCommand, 20000); // 20 second timeout
        
        superuserSpinner.succeed(`✅ Extension '${extensionName}' installed successfully as postgres superuser`);
        
        // Show extension info
        const infoSpinner = ora('Fetching extension information...').start();
        const { stdout: info } = await this.execWithTimeout(`psql -d ${dbName} -c "SELECT extname, extversion FROM pg_extension WHERE extname = '${extensionName}';"`, 10000);
        infoSpinner.succeed('Extension information retrieved');
        
        console.log('\n📋 Extension Information:');
        console.log(info);
        
        this.showExtensionUsageExamples(extensionName);
        
      } catch (error) {
        superuserSpinner.fail('Failed to install as postgres superuser');
        if (error.message.includes('timed out')) {
          console.log('⏰ Operation timed out. This might be due to:');
          console.log('• Postgres user password prompt (check your terminal)');
          console.log('• PostgreSQL authentication issues');
          console.log('• Network connectivity problems');
          console.log('');
          console.log('💡 Try running this command manually:');
          console.log(`   psql -U postgres -d ${dbName} -c "CREATE EXTENSION IF NOT EXISTS ${extensionName};"`);
        } else {
          throw error;
        }
      }
      
    } catch (error) {
      console.error('❌ Failed to install as postgres superuser:', error.message);
      console.log('💡 You may need to set a password for the postgres user or check PostgreSQL authentication');
      console.log('');
      console.log('🔧 To set postgres user password:');
      console.log('   sudo -u postgres psql -c "ALTER USER postgres PASSWORD \'yourpassword\';"');
    }
  }
}

module.exports = PostgreSQLManager;