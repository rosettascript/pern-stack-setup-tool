/**
 * PERN Setup Tool - Project Manager
 * Handles project creation, template application, and structure management
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

/**
 * Project Manager Class
 * Manages project creation and template application
 */
class ProjectManager {
  constructor(setupTool) {
    this.setup = setupTool;
    this.logger = setupTool.logger;
    this.safety = setupTool.safety;
    this.config = setupTool.config;
    this.platform = process.platform;
    this.homeDir = os.homedir();
  }

  /**
   * Show project interface
   */
  async showInterface() {
    try {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Folder Structure Section',
          loop: false,
          choices: [
            '1. Create Project',
            '2. Clone Existing Project',
            '3. Go back'
          ]
        }
      ]);

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.createProjectInterface();
          break;
        case 2:
          await this.cloneProjectInterface();
          break;
        case 3:
          return this.setup.showMainInterface();
      }

    } catch (error) {
      await this.setup.handleError('project-interface', error);
    }
  }

  /**
   * Show create project interface
   */
  async createProjectInterface() {
    try {
      // Select project location
      const { location } = await inquirer.prompt({
        type: 'list',
        name: 'location',
        message: 'Select project location:',
        loop: false,
        choices: this.platform === 'win32' ? [
          '1. Downloads folder: C:\\Users\\user\\Downloads',
          '2. Documents folder: C:\\Users\\user\\Documents',
          '3. Generate Projects folder: C:\\Users\\user\\Projects',
          '4. Custom location'
        ] : [
          '1. Downloads folder: /home/user/Downloads',
          '2. Documents folder: /home/user/Documents',
          '3. Generate Projects folder: /home/user/Projects',
          '4. Custom location'
        ]
      });

      let projectPath;
      const selected = parseInt(location.split('.')[0]);

      switch(selected) {
        case 1:
          projectPath = this.platform === 'win32'
            ? `${this.homeDir}\\Downloads`
            : `${this.homeDir}/Downloads`;
          break;
        case 2:
          projectPath = this.platform === 'win32'
            ? `${this.homeDir}\\Documents`
            : `${this.homeDir}/Documents`;
          break;
        case 3:
          projectPath = this.platform === 'win32'
            ? `${this.homeDir}\\Projects`
            : `${this.homeDir}/Projects`;
          break;
        case 4:
          const { customPath } = await inquirer.prompt({
            type: 'input',
            name: 'customPath',
            message: 'Enter custom path:',
            validate: input => input.length > 0 || 'Path is required'
          });
          projectPath = customPath;
          break;
      }

      // Get project name
      const { projectName } = await inquirer.prompt({
        type: 'input',
        name: 'projectName',
        message: 'Enter Project Name:',
        validate: input => input.length > 0 || 'Project name is required'
      });

      // Select project type
      const { projectType } = await inquirer.prompt({
        type: 'list',
        name: 'projectType',
        message: 'Select project type:',
        loop: false,
        choices: [
          '1. Full-stack (PERN)',
          '2. Backend only (Node + PostgreSQL)',
          '3. Frontend only (React)',
          '4. Microservices',
          '5. Go back'
        ]
      });

      if (projectType.includes('5. Go back')) {
        return this.showInterface();
      }

      const fullProjectPath = this.platform === 'win32'
        ? `${projectPath}\\${projectName}`
        : `${projectPath}/${projectName}`;

      // Extract the actual project type from the choice
      const actualProjectType = projectType.includes('Full-stack') ? 'full-stack' :
                               projectType.includes('Backend') ? 'backend' :
                               projectType.includes('Frontend') ? 'frontend' :
                               projectType.includes('Microservices') ? 'microservices' : 'basic';

      await this.setup.safety.safeExecute('project-creation', {
        name: projectName,
        type: actualProjectType,
        location: fullProjectPath
      }, async () => {
        // Create project structure
        await this.createProjectStructure(fullProjectPath, projectType);

        // Update configuration
        this.config.set('project.name', projectName);
        this.config.set('project.type', projectType.split(' ')[0].toLowerCase());
        this.config.set('project.location', fullProjectPath);

        this.setup.state.completedComponents.add('project');
        console.log(`✅ Project created successfully at ${fullProjectPath}`);
        
        // Return a proper result object for validation
        return {
          success: true,
          projectName,
          projectType: actualProjectType,
          location: fullProjectPath,
          timestamp: new Date().toISOString()
        };
      });

    } catch (error) {
      await this.setup.handleError('create-project', error);
    }

    await this.setup.showMainInterface();
  }

  /**
   * Create project structure
   */
  async createProjectStructure(projectPath, projectType) {
    try {
      // Ensure project directory exists
      await fs.ensureDir(projectPath);

      // Basic structure for all project types
      const basicStructure = [
        'client/src',
        'client/public',
        'server/src',
        'server/tests',
        'database/migrations',
        'database/seeds',
        'database/schemas',
        'tests/unit',
        'tests/integration',
        'tests/e2e'
      ];

      // Create basic structure
      for (const dir of basicStructure) {
        const fullPath = this.platform === 'win32'
          ? `${projectPath}\\${dir}`
          : `${projectPath}/${dir}`;
        await fs.ensureDir(fullPath);
      }

      // Add platform-specific components
      if (projectType.includes('Docker')) {
        const dockerDirs = ['docker/client', 'docker/server', 'docker/database'];
        for (const dir of dockerDirs) {
          const fullPath = this.platform === 'win32'
            ? `${projectPath}\\${dir}`
            : `${projectPath}/${dir}`;
          await fs.ensureDir(fullPath);
        }
      }

      // Add Linux/macOS specific components
      if (!this.platform === 'win32' && (projectType.includes('Redis') || projectType.includes('Nginx'))) {
        const nginxDir = this.platform === 'win32'
          ? `${projectPath}\\nginx\\conf.d`
          : `${projectPath}/nginx/conf.d`;
        await fs.ensureDir(nginxDir);
      }

      // Create platform-specific files
      await this.createPlatformSpecificFiles(projectPath, projectType);

      console.log('✅ Project structure created');
    } catch (error) {
      console.error('❌ Project structure creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Create platform-specific files
   */
  async createPlatformSpecificFiles(projectPath, projectType) {
    try {
      // Create .env.example
      const envContent = this.platform === 'win32'
        ? `# Windows Environment Variables
DATABASE_URL=postgresql://postgres:1234@localhost:5432/your_database
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000`
        : `# Linux/macOS Environment Variables
DATABASE_URL=postgresql://postgres:1234@localhost:5432/your_database
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000`;

      if (projectType.includes('Redis') && !this.platform === 'win32') {
        envContent += '\nREDIS_URL=redis://localhost:6379';
      }

      const envPath = this.platform === 'win32'
        ? `${projectPath}\\.env.example`
        : `${projectPath}/.env.example`;
      await fs.writeFile(envPath, envContent);

      // Create docker-compose.yml if Docker is selected
      if (projectType.includes('Docker')) {
        await this.createDockerComposeFile(projectPath);
      }

      // Create PM2 ecosystem file for Linux/macOS
      if (!this.platform === 'win32' && projectType.includes('PM2')) {
        await this.createPM2EcosystemFile(projectPath);
      }

      // Create Windows Service file if Windows
      if (this.platform === 'win32' && projectType.includes('PM2')) {
        await this.createWindowsServiceFile(projectPath);
      }

      // Create README.md
      await this.createReadmeFile(projectPath, projectType);

      console.log('✅ Platform-specific files created');
    } catch (error) {
      console.error('❌ Platform-specific file creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Create Docker Compose file
   */
  async createDockerComposeFile(projectPath) {
    try {
      const composeConfig = {
        version: '3.8',
        services: {
          postgres: {
            image: 'postgres:15',
            environment: {
              POSTGRES_PASSWORD: '1234',
              POSTGRES_DB: 'postgres',
              POSTGRES_USER: 'postgres'
            },
            volumes: ['postgres_data:/var/lib/postgresql/data'],
            networks: ['pern_network'],
            ports: ['5432:5432']
          },
          app: {
            build: '.',
            environment: {
              NODE_ENV: 'development',
              DATABASE_URL: 'postgresql://postgres:1234@postgres:5432/postgres',
              PORT: 5000
            },
            depends_on: ['postgres'],
            networks: ['pern_network'],
            ports: ['5000:5000'],
            volumes: ['.:/app', '/app/node_modules']
          }
        },
        networks: {
          pern_network: {
            driver: 'bridge'
          }
        },
        volumes: {
          postgres_data: {}
        }
      };

      const composePath = this.platform === 'win32'
        ? `${projectPath}\\docker-compose.yml`
        : `${projectPath}/docker-compose.yml`;

      await fs.writeFile(composePath, JSON.stringify(composeConfig, null, 2));
      console.log('✅ Docker Compose file created');
    } catch (error) {
      console.error('❌ Docker Compose file creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Create PM2 ecosystem file
   */
  async createPM2EcosystemFile(projectPath) {
    try {
      const ecosystemConfig = {
        apps: [{
          name: 'pern-app',
          script: 'server/src/index.js',
          instances: 'max',
          autorestart: true,
          watch: false,
          max_memory_restart: '1G',
          env: {
            NODE_ENV: 'development',
            PORT: 5000
          },
          env_production: {
            NODE_ENV: 'production',
            PORT: 5000
          }
        }]
      };

      const ecosystemPath = this.platform === 'win32'
        ? `${projectPath}\\ecosystem.config.js`
        : `${projectPath}/ecosystem.config.js`;

      await fs.writeFile(ecosystemPath, `module.exports = ${JSON.stringify(ecosystemConfig, null, 2)};`);
      console.log('✅ PM2 ecosystem file created');
    } catch (error) {
      console.error('❌ PM2 ecosystem file creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Create Windows Service file
   */
  async createWindowsServiceFile(projectPath) {
    try {
      const serviceContent = `@echo off
cd /d "${projectPath}"
npm start
`;

      const servicePath = this.platform === 'win32'
        ? `${projectPath}\\windows-service.bat`
        : `${projectPath}/windows-service.bat`;

      await fs.writeFile(servicePath, serviceContent);
      console.log('✅ Windows service file created');
    } catch (error) {
      console.error('❌ Windows service file creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Create README file
   */
  async createReadmeFile(projectPath, projectType) {
    try {
      const readmeContent = `# ${this.config.get('project.name', 'PERN Project')}

${this.getProjectDescription(projectType)}

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL (or Docker)
- Redis (optional, Linux/macOS)

### Installation

1. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Setup database**
   \`\`\`bash
   # Using Docker
   docker-compose up -d postgres

   # Or using local PostgreSQL
   createdb your_database
   \`\`\`

3. **Configure environment**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

4. **Run the application**
   \`\`\`bash
   # Development
   npm run dev

   # Production
   npm start
   \`\`\`

## 📁 Project Structure

\`\`\`
${this.getProjectStructure(projectType)}
\`\`\`

## 🔧 Configuration

### Environment Variables
- \`DATABASE_URL\` - PostgreSQL connection string
- \`REDIS_URL\` - Redis connection string (optional)
- \`JWT_SECRET\` - JWT secret for authentication
- \`PORT\` - Server port (default: 5000)

### Database Setup
\`\`\`sql
-- Run migrations
npm run migrate

-- Seed database
npm run seed
\`\`\`

## 🧪 Testing

\`\`\`bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e
\`\`\`

## 🚀 Deployment

### Using Docker
\`\`\`bash
docker-compose up -d
\`\`\`

### Using PM2 (Linux/macOS)
\`\`\`bash
pm2 start ecosystem.config.js
\`\`\`

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] Tests passing
- [ ] Security headers configured
- [ ] Monitoring setup
- [ ] Backup procedures configured

## 🔒 Security

- CORS configured
- Helmet security headers
- Rate limiting enabled
- JWT authentication
- Password hashing with bcrypt

## 📊 Monitoring

- Winston logging configured
- Morgan HTTP request logging
- Performance monitoring
- Error tracking and alerting

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License

## 🆘 Support

For issues and questions:
- Check the troubleshooting guide
- Review the documentation
- Open an issue on GitHub
`;

      const readmePath = this.platform === 'win32'
        ? `${projectPath}\\README.md`
        : `${projectPath}/README.md`;

      await fs.writeFile(readmePath, readmeContent);
      console.log('✅ README file created');
    } catch (error) {
      console.error('❌ README file creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Get project description based on type
   */
  getProjectDescription(projectType) {
    const descriptions = {
      'Full-stack': 'Full-stack PERN application with PostgreSQL, Express, React, and Node.js',
      'Backend': 'Backend API with Node.js, Express, and PostgreSQL',
      'Frontend': 'React frontend application',
      'Microservices': 'Microservices architecture with multiple services'
    };

    return descriptions[projectType.split(' ')[0]] || 'PERN stack application';
  }

  /**
   * Get project structure based on type
   */
  getProjectStructure(projectType) {
    let structure = `project-name/
├── client/          (React frontend)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── README.md
├── server/          (Node.js backend)
│   ├── src/
│   ├── tests/
│   ├── package.json
│   └── README.md
├── database/        (SQL schemas & migrations)
│   ├── migrations/
│   ├── seeds/
│   └── schemas/
├── tests/           (Test suites)
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
└── README.md`;

    if (projectType.includes('Docker')) {
      structure = `project-name/
├── client/          (React frontend)
├── server/          (Node.js backend)
├── database/        (SQL schemas & migrations)
├── docker/          (Docker configurations)
│   ├── client/
│   ├── server/
│   └── database/
├── tests/           (Test suites)
├── .env.example
├── docker-compose.yml
└── README.md`;
    }

    if (projectType.includes('Redis') && !this.platform === 'win32') {
      structure = structure.replace('└── README.md', `├── nginx/           (Nginx configs)
│   └── conf.d/
├── tests/           (Test suites)
├── .env.example
├── docker-compose.yml
├── ecosystem.config.js
└── README.md`);
    }

    return structure;
  }

  /**
   * Clone existing project interface
   */
  async cloneProjectInterface() {
    try {
      const { repoUrl } = await inquirer.prompt({
        type: 'input',
        name: 'repoUrl',
        message: 'Enter repository URL:',
        validate: input => input.length > 0 || 'Repository URL is required'
      });

      const { clonePath } = await inquirer.prompt({
        type: 'input',
        name: 'clonePath',
        message: 'Enter clone location:',
        default: this.homeDir + (this.platform === 'win32' ? '\\Projects' : '/Projects')
      });

      await this.setup.safety.safeExecute('project-clone', {
        repoUrl,
        clonePath
      }, async () => {
        await exec(`git clone ${repoUrl} "${clonePath}"`);

        // Configure cloned project
        await this.configureClonedProject(clonePath);

        console.log(`✅ Project cloned successfully to: ${clonePath}`);
      });

    } catch (error) {
      await this.setup.handleError('project-clone', error);
    }

    await this.setup.showMainInterface();
  }

  /**
   * Configure cloned project
   */
  async configureClonedProject(projectPath) {
    try {
      // Check if it's a PERN project
      const hasPackageJson = await fs.pathExists(`${projectPath}/package.json`);
      const hasClient = await fs.pathExists(`${projectPath}/client`);
      const hasServer = await fs.pathExists(`${projectPath}/server`);

      if (hasPackageJson && (hasClient || hasServer)) {
        console.log('🔧 Configuring cloned PERN project...');

        // Install dependencies
        await exec('npm install', { cwd: projectPath });

        // Install client dependencies if present
        if (hasClient) {
          const clientPackageJson = await fs.pathExists(`${projectPath}/client/package.json`);
          if (clientPackageJson) {
            await exec('npm install', { cwd: `${projectPath}/client` });
          }
        }

        console.log('✅ Cloned project configured');
      } else {
        console.log('ℹ️  Project cloned but may need manual configuration');
      }
    } catch (error) {
      console.error('❌ Project configuration failed:', error.message);
      throw error;
    }
  }
}

module.exports = ProjectManager;