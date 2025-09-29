/**
 * PERN Setup Tool - Template Engine
 * Advanced template system for project generation with caching and analytics
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

/**
 * Template Engine Class
 * Handles project template generation with advanced features
 */
class TemplateEngine {
  constructor(setupTool) {
    this.setup = setupTool;
    this.logger = setupTool.logger;
    this.safety = setupTool.safety;
    this.config = setupTool.config;
    this.templatesDir = path.join(__dirname, '..', '..', 'templates');
    this.templateCache = new Map();
    this.variablePattern = /\{\{(\w+)\}\}/g;
    this.analytics = {
      generations: [],
      popularTemplates: new Map(),
      averageTime: new Map()
    };
  }

  /**
   * Show template interface
   */
  async showInterface() {
    try {
      const templates = this.getAvailableTemplates();
      const choices = templates.map(t => `${t.name} - ${t.description} (${t.estimatedTime})`);

      const { templateChoice } = await inquirer.prompt({
        type: 'list',
        name: 'templateChoice',
        message: 'Select project template:',
        loop: false,
        choices: [...choices, 'Custom template configuration', 'Browse community templates', 'Go back']
      });

      if (templateChoice === 'Go back') {
        return this.setup.showAdvancedFeaturesInterface();
      }

      if (templateChoice === 'Custom template configuration') {
        return await this.customTemplateConfiguration();
      }

      if (templateChoice === 'Browse community templates') {
        return await this.browseCommunityTemplates();
      }

      const selectedTemplate = templates.find(t => templateChoice.startsWith(t.name));
      await this.setupProjectFromTemplate(selectedTemplate);

    } catch (error) {
      await this.setup.handleError('template-interface', error);
    }
  }

  /**
   * Get available templates
   */
  getAvailableTemplates() {
    return [
      {
        id: 'blog-cms',
        name: 'Blog CMS',
        description: 'Full-featured blog with content management system',
        features: ['authentication', 'posts', 'categories', 'comments', 'admin-panel', 'seo'],
        technologies: ['react', 'express', 'postgresql', 'redis', 'nginx'],
        estimatedTime: '15 minutes',
        files: 25
      },
      {
        id: 'ecommerce-api',
        name: 'E-commerce API',
        description: 'Complete e-commerce platform with payments and inventory',
        features: ['products', 'orders', 'payments', 'inventory', 'users', 'reviews', 'cart', 'stripe'],
        technologies: ['react', 'express', 'postgresql', 'redis', 'stripe', 'jwt', 'docker'],
        estimatedTime: '20 minutes',
        files: 45
      },
      {
        id: 'real-time-dashboard',
        name: 'Real-time Dashboard',
        description: 'Dashboard with real-time updates and analytics',
        features: ['websockets', 'charts', 'notifications', 'metrics', 'alerts'],
        technologies: ['react', 'socket.io', 'd3.js', 'redis', 'postgresql'],
        estimatedTime: '18 minutes',
        files: 30
      },
      {
        id: 'microservices-architecture',
        name: 'Microservices Architecture',
        description: 'Complete microservices setup with service discovery',
        features: ['service-discovery', 'api-gateway', 'load-balancing', 'monitoring'],
        technologies: ['docker', 'kubernetes', 'consul', 'nginx', 'prometheus'],
        estimatedTime: '25 minutes',
        files: 40
      }
    ];
  }

  /**
   * Setup project from template
   */
  async setupProjectFromTemplate(template) {
    try {
      console.log(`🚀 Setting up ${template.name}...`);

      // Collect project variables
      const variables = await this.collectProjectVariables();

      // Select project location
      const targetDir = await this.selectProjectLocation();

      // Use caching for faster setup
      const cache = this.setup.features.cache;
      const cacheKey = `template-${template.id}-${JSON.stringify(variables)}`;

      await this.setup.safety.safeExecute('template-generation', {
        templateName: template.name,
        projectName: variables.projectName,
        authorName: variables.author,
        databaseName: variables.databaseName,
        jwtSecret: variables.jwtSecret,
        projectLocation: targetDir
      }, async () => {
        const startTime = Date.now();
        const ora = require('ora');
        let structureSpinner = null;
        let depsSpinner = null;
        let configSpinner = null;

        try {
          // Step 1: Generate project structure
          console.log('🏗️  Generating project structure...');
          structureSpinner = ora('🏗️  Creating project files and directories...').start();
          await this.generateProject(template.id, targetDir, variables);
          structureSpinner.succeed('✅ Project structure generated');
          console.log('📁 Project files created successfully');

          // Step 2: Install dependencies
          console.log('📦 Installing dependencies...');
          depsSpinner = ora('📦 Installing project dependencies...').start();
          await this.installTemplateDependencies(targetDir, template);
          depsSpinner.succeed('✅ Dependencies installed');
          console.log('📦 All dependencies installed successfully');

          // Step 3: Configure environment
          console.log('⚙️  Configuring environment...');
          configSpinner = ora('⚙️  Setting up environment configuration...').start();
          await this.configureTemplateEnvironment(targetDir, variables, template);
          configSpinner.succeed('✅ Environment configured');
          console.log('⚙️  Environment configuration completed');

          const duration = Date.now() - startTime;

          // Record analytics
          await this.recordTemplateGeneration(template.id, duration, true);

          console.log(`🎉 ${template.name} setup completed in ${Math.floor(duration / 1000)}s`);
          console.log(`📁 Project created at: ${targetDir}`);
          console.log('🚀 Your project is ready to use!');

          // Return proper result object
          return {
            success: true,
            message: `${template.name} setup completed successfully`,
            timestamp: new Date().toISOString(),
            duration: duration,
            projectPath: targetDir
          };
        } catch (error) {
          // Stop any running spinners
          if (structureSpinner) structureSpinner.fail('❌ Project structure generation failed');
          if (depsSpinner) depsSpinner.fail('❌ Dependencies installation failed');
          if (configSpinner) configSpinner.fail('❌ Environment configuration failed');
          throw error;
        }
      });

    } catch (error) {
      await this.recordTemplateGeneration(template.id, 0, false, error.message);
      await this.setup.handleError('template-setup', error);
    }

    await this.setup.showAdvancedFeaturesInterface();
  }

  /**
   * Collect project variables
   */
  async collectProjectVariables() {
    const { projectName } = await inquirer.prompt({
      type: 'input',
      name: 'projectName',
      message: 'Enter project name:',
      default: 'my-pern-app',
      validate: input => input.length > 0 || 'Project name is required'
    });

    const { author } = await inquirer.prompt({
      type: 'input',
      name: 'author',
      message: 'Enter author name:',
      default: os.userInfo().username
    });

    const { databaseName } = await inquirer.prompt({
      type: 'input',
      name: 'databaseName',
      message: 'Enter database name:',
      default: projectName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
    });

    const { jwtSecret } = await inquirer.prompt({
      type: 'input',
      name: 'jwtSecret',
      message: 'Enter JWT secret (or leave empty to auto-generate):',
      default: ''
    });

    return {
      projectName,
      author,
      databaseName,
      jwtSecret: jwtSecret || this.generateSecureSecret(),
      port: 5000,
      nodeEnv: 'development'
    };
  }

  /**
   * Select project location
   */
  async selectProjectLocation() {
    const defaultLocation = path.join(os.homedir(), 'Projects');

    const { location } = await inquirer.prompt({
      type: 'input',
      name: 'location',
      message: 'Enter project location:',
      default: defaultLocation
    });

    return location;
  }

  /**
   * Generate secure secret
   */
  generateSecureSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let secret = '';
    for (let i = 0; i < 64; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  /**
   * Generate project from template
   */
  async generateProject(templateId, targetDir, variables) {
    try {
      const templateDir = path.join(this.templatesDir, templateId);

      if (!await fs.pathExists(templateDir)) {
        throw new Error(`Template not found: ${templateId}`);
      }

      const items = await fs.readdir(templateDir);

      for (const item of items) {
        const sourcePath = path.join(templateDir, item);
        const targetPath = path.join(targetDir, this.interpolateName(item, variables));
        const stat = await fs.stat(sourcePath);

        if (stat.isDirectory()) {
          await fs.ensureDir(targetPath);
          await this.generateProjectFromDirectory(sourcePath, targetPath, variables);
        } else {
          const content = await fs.readFile(sourcePath, 'utf8');
          const renderedContent = this.interpolateVariables(content, variables);
          await fs.writeFile(targetPath, renderedContent);
        }
      }

      console.log('✅ Project structure generated');
    } catch (error) {
      console.error('❌ Project generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate project from directory
   */
  async generateProjectFromDirectory(sourceDir, targetDir, variables) {
    const items = await fs.readdir(sourceDir);

    for (const item of items) {
      const sourcePath = path.join(sourceDir, item);
      const targetPath = path.join(targetDir, this.interpolateName(item, variables));
      const stat = await fs.stat(sourcePath);

      if (stat.isDirectory()) {
        await fs.ensureDir(targetPath);
        await this.generateProjectFromDirectory(sourcePath, targetPath, variables);
      } else {
        const content = await fs.readFile(sourcePath, 'utf8');
        const renderedContent = this.interpolateVariables(content, variables);
        await fs.writeFile(targetPath, renderedContent);
      }
    }
  }

  /**
   * Interpolate variable in filename
   */
  interpolateName(name, variables) {
    return name.replace(this.variablePattern, (match, varName) => {
      return variables[varName] !== undefined ? variables[varName] : match;
    });
  }

  /**
   * Interpolate variables in content
   */
  interpolateVariables(content, variables) {
    return content.replace(this.variablePattern, (match, varName) => {
      return variables[varName] !== undefined ? variables[varName] : match;
    });
  }

  /**
   * Install template dependencies
   */
  async installTemplateDependencies(targetDir, template) {
    try {
      const ora = require('ora');
      let serverSpinner = null;
      let clientSpinner = null;

      // Install server dependencies
      if (await fs.pathExists(`${targetDir}/package.json`)) {
        console.log('📦 Installing server dependencies...');
        serverSpinner = ora('📦 Installing server dependencies (Express, etc.)...').start();
        try {
          await this.setup.safety.safeExecute('template-deps-install', { projectPath: targetDir }, async () => {
            const { exec } = require('child-process-promise');
            await exec('npm install', { cwd: targetDir });
            
            // Return proper result object
            return {
              success: true,
              message: 'Template dependencies installed successfully',
              timestamp: new Date().toISOString(),
              projectPath: targetDir
            };
          });
          serverSpinner.succeed('✅ Server dependencies installed');
          console.log('📦 Server dependencies installed successfully');
        } catch (error) {
          serverSpinner.fail('❌ Server dependencies installation failed');
          throw error;
        }
      }

      // Install client dependencies
      const clientDir = path.join(targetDir, 'client');
      if (await fs.pathExists(`${clientDir}/package.json`)) {
        console.log('📦 Installing client dependencies...');
        clientSpinner = ora('📦 Installing client dependencies (React, etc.)...').start();
        try {
          await this.setup.safety.safeExecute('client-deps-install', { projectPath: clientDir }, async () => {
            const { exec } = require('child-process-promise');
            await exec('npm install', { cwd: clientDir });
            
            // Return proper result object
            return {
              success: true,
              message: 'Client dependencies installed successfully',
              timestamp: new Date().toISOString(),
              projectPath: clientDir
            };
          });
          clientSpinner.succeed('✅ Client dependencies installed');
          console.log('📦 Client dependencies installed successfully');
        } catch (error) {
          clientSpinner.fail('❌ Client dependencies installation failed');
          throw error;
        }
      }

      console.log('✅ All dependencies installed');
      
      // Return proper result object
      return {
        success: true,
        message: 'Dependencies installed successfully',
        timestamp: new Date().toISOString(),
        serverDeps: await fs.pathExists(`${targetDir}/package.json`),
        clientDeps: await fs.pathExists(`${clientDir}/package.json`)
      };
    } catch (error) {
      console.error('❌ Dependency installation failed:', error.message);
      throw error;
    }
  }

  /**
   * Configure template environment
   */
  async configureTemplateEnvironment(targetDir, variables, template) {
    try {
      const ora = require('ora');
      let envSpinner = null;
      let exampleSpinner = null;

      // Define envContent outside try-catch blocks
      const envContent = `# Generated by PERN Setup Tool
NODE_ENV=${variables.nodeEnv}
PORT=${variables.port}

# Database Configuration
DATABASE_URL=postgresql://postgres:1234@localhost:5432/${variables.databaseName}
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=${variables.databaseName}
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=1234

# Security Configuration
JWT_SECRET=${variables.jwtSecret}
BCRYPT_ROUNDS=12
SESSION_TIMEOUT=3600

# Application Configuration
PROJECT_NAME=${variables.projectName}
AUTHOR=${variables.author}
`;

      // Create .env file
      console.log('⚙️  Creating environment configuration...');
      envSpinner = ora('⚙️  Setting up environment variables...').start();
      try {
        const envPath = path.join(targetDir, '.env');
        await fs.writeFile(envPath, envContent);
        envSpinner.succeed('✅ Environment configuration created');
        console.log('⚙️  Environment file created successfully');
      } catch (error) {
        envSpinner.fail('❌ Environment configuration failed');
        throw error;
      }

      // Create .env.example
      console.log('📝 Creating example environment file...');
      exampleSpinner = ora('📝 Creating .env.example file...').start();
      try {
        const envExamplePath = path.join(targetDir, '.env.example');
        await fs.writeFile(envExamplePath, envContent.replace(variables.jwtSecret, 'your-jwt-secret'));
        exampleSpinner.succeed('✅ Example environment file created');
        console.log('📝 Example environment file created successfully');
      } catch (error) {
        exampleSpinner.fail('❌ Example environment file creation failed');
        throw error;
      }

      console.log('✅ Environment configured');

      // Return proper result object
      return {
        success: true,
        message: 'Environment configured successfully',
        timestamp: new Date().toISOString(),
        envFile: path.join(targetDir, '.env'),
        exampleFile: path.join(targetDir, '.env.example')
      };
    } catch (error) {
      console.error('❌ Environment configuration failed:', error.message);
      throw error;
    }
  }

  /**
   * Custom template configuration
   */
  async customTemplateConfiguration() {
    try {
      console.log('🔧 Custom Template Configuration');
      console.log('This will create a custom project template');

      const { templateName } = await inquirer.prompt({
        type: 'input',
        name: 'templateName',
        message: 'Enter template name:',
        validate: input => input.length > 0 || 'Template name is required'
      });

      const { description } = await inquirer.prompt({
        type: 'input',
        name: 'description',
        message: 'Enter template description:'
      });

      const { features } = await inquirer.prompt({
        type: 'checkbox',
        name: 'features',
        message: 'Select features to include:',
        choices: [
          'authentication',
          'database',
          'redis',
          'docker',
          'nginx',
          'pm2',
          'tests',
          'security',
          'monitoring'
        ]
      });

      const templateConfig = {
        name: templateName,
        description,
        features,
        technologies: ['react', 'express', 'postgresql'],
        estimatedTime: '20 minutes',
        custom: true
      };

      await this.createCustomTemplate(templateConfig);
      console.log(`✅ Custom template created: ${templateName}`);

    } catch (error) {
      await this.setup.handleError('custom-template', error);
    }

    await this.showInterface();
  }

  /**
   * Create custom template
   */
  async createCustomTemplate(templateConfig) {
    try {
      const templateId = `custom-${Date.now()}`;
      const templateDir = path.join(this.templatesDir, templateId);

      await fs.ensureDir(templateDir);

      // Create template structure
      await this.createTemplateStructure(templateDir, templateConfig);

      // Save template metadata
      await fs.writeFile(
        path.join(templateDir, 'template.json'),
        JSON.stringify(templateConfig, null, 2)
      );

      console.log(`✅ Custom template created: ${templateDir}`);
    } catch (error) {
      console.error('❌ Custom template creation failed:', error.message);
      throw error;
    }
  }

  /**
   * Create template structure
   */
  async createTemplateStructure(templateDir, config) {
    // Create basic structure
    const structure = [
      'client/src/components',
      'client/src/pages',
      'client/src/utils',
      'client/public',
      'server/src/routes',
      'server/src/middleware',
      'server/src/models',
      'server/src/controllers',
      'database/migrations',
      'database/seeds',
      'tests/unit',
      'tests/integration'
    ];

    for (const dir of structure) {
      await fs.ensureDir(path.join(templateDir, dir));
    }

    // Create template files
    await this.createTemplateFiles(templateDir, config);
  }

  /**
   * Create template files
   */
  async createTemplateFiles(templateDir, config) {
    // Server package.json
    const serverPackage = {
      name: '{{projectName}}-server',
      version: '1.0.0',
      main: 'src/index.js',
      scripts: {
        start: 'node src/index.js',
        dev: 'nodemon src/index.js',
        test: 'jest'
      },
      dependencies: {
        express: '^4.18.0',
        cors: '^2.8.5',
        helmet: '^6.0.0',
        'express-rate-limit': '^6.7.0',
        bcrypt: '^5.1.0',
        jsonwebtoken: '^9.0.0',
        pg: '^8.10.0',
        dotenv: '^16.0.3'
      },
      devDependencies: {
        nodemon: '^2.0.22',
        jest: '^29.5.0',
        supertest: '^6.3.0'
      }
    };

    await fs.writeFile(
      path.join(templateDir, 'server', 'package.json'),
      JSON.stringify(serverPackage, null, 2)
    );

    // Client package.json
    const clientPackage = {
      name: '{{projectName}}-client',
      version: '1.0.0',
      private: true,
      dependencies: {
        react: '^18.2.0',
        'react-dom': '^18.2.0',
        'react-router-dom': '^6.10.0',
        axios: '^1.4.0'
      },
      devDependencies: {
        '@vitejs/plugin-react': '^4.0.0',
        vite: '^4.3.0'
      },
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      }
    };

    await fs.writeFile(
      path.join(templateDir, 'client', 'package.json'),
      JSON.stringify(clientPackage, null, 2)
    );
  }

  /**
   * Browse community templates
   */
  async browseCommunityTemplates() {
    try {
      console.log('🌐 Browsing community templates...');
      
      // Fetch community templates from registry
      const communityTemplates = await this.fetchCommunityTemplates();
      
      if (communityTemplates.length === 0) {
        console.log('📚 No community templates available at the moment');
        console.log('💡 Check back later or contribute your own template!');
        return;
      }

      // Display available templates
      console.log('\n📚 Available Community Templates:');
      console.log('=====================================');
      
      communityTemplates.forEach((template, index) => {
        console.log(`\n${index + 1}. ${template.name}`);
        console.log(`   📝 ${template.description}`);
        console.log(`   ⭐ Stars: ${template.stars} | 📥 Downloads: ${template.downloads}`);
        console.log(`   🏷️  Tags: ${template.tags.join(', ')}`);
        console.log(`   👤 Author: ${template.author}`);
      });

      // Allow user to select and install template
      const selectedTemplate = await this.selectCommunityTemplate(communityTemplates);
      if (selectedTemplate) {
        await this.installCommunityTemplate(selectedTemplate);
      }

    } catch (error) {
      await this.setup.handleError('community-templates', error);
    }

    await this.showInterface();
  }

  /**
   * Fetch community templates from registry
   */
  async fetchCommunityTemplates() {
    try {
      // In a real implementation, this would fetch from a template registry API
      // For now, return mock data representing community templates
      return [
        {
          id: 'react-admin-dashboard',
          name: 'React Admin Dashboard',
          description: 'Complete admin dashboard with authentication, user management, and analytics',
          author: 'community-dev',
          stars: 245,
          downloads: 1200,
          tags: ['react', 'admin', 'dashboard', 'authentication'],
          repository: 'https://github.com/community-dev/react-admin-dashboard',
          version: '1.2.0'
        },
        {
          id: 'ecommerce-fullstack',
          name: 'E-commerce Full Stack',
          description: 'Complete e-commerce solution with payment integration, inventory management',
          author: 'ecommerce-team',
          stars: 189,
          downloads: 890,
          tags: ['ecommerce', 'payment', 'inventory', 'fullstack'],
          repository: 'https://github.com/ecommerce-team/fullstack-store',
          version: '2.1.0'
        },
        {
          id: 'blog-cms-advanced',
          name: 'Advanced Blog CMS',
          description: 'Feature-rich blog CMS with SEO optimization, content management, and analytics',
          author: 'blog-master',
          stars: 156,
          downloads: 650,
          tags: ['blog', 'cms', 'seo', 'content-management'],
          repository: 'https://github.com/blog-master/advanced-cms',
          version: '1.5.2'
        },
        {
          id: 'api-gateway-microservices',
          name: 'API Gateway Microservices',
          description: 'Microservices architecture with API gateway, service discovery, and load balancing',
          author: 'microservices-expert',
          stars: 98,
          downloads: 420,
          tags: ['microservices', 'api-gateway', 'service-discovery', 'load-balancing'],
          repository: 'https://github.com/microservices-expert/api-gateway',
          version: '1.0.3'
        }
      ];
    } catch (error) {
      console.error('❌ Failed to fetch community templates:', error.message);
      return [];
    }
  }

  /**
   * Select community template
   */
  async selectCommunityTemplate(templates) {
    try {
      const inquirer = require('inquirer');
      const { templateIndex } = await inquirer.prompt({
        type: 'input',
        name: 'templateIndex',
        message: 'Enter the number of the template you want to install (or press Enter to cancel):',
        validate: (input) => {
          if (!input) return true; // Allow empty input to cancel
          const num = parseInt(input);
          return (num >= 1 && num <= templates.length) || 'Please enter a valid template number';
        }
      });

      if (!templateIndex) {
        console.log('❌ Template selection cancelled');
        return null;
      }

      const selectedIndex = parseInt(templateIndex) - 1;
      return templates[selectedIndex];
    } catch (error) {
      console.error('❌ Failed to select template:', error.message);
      return null;
    }
  }

  /**
   * Install community template
   */
  async installCommunityTemplate(template) {
    try {
      console.log(`\n🚀 Installing ${template.name}...`);
      
      // Clone repository
      const tempDir = path.join(process.cwd(), 'temp-templates');
      const templateDir = path.join(tempDir, template.id);
      
      if (!fs.existsSync(tempDir)) {
        await fs.promises.mkdir(tempDir, { recursive: true });
      }

      // Clone the repository
      console.log(`📥 Cloning ${template.repository}...`);
      await exec(`git clone ${template.repository} ${templateDir}`);
      
      // Copy template files to templates directory
      const targetTemplateDir = path.join(process.cwd(), 'templates', template.id);
      await fs.promises.cp(templateDir, targetTemplateDir, { recursive: true });
      
      // Clean up temp directory
      await fs.promises.rm(tempDir, { recursive: true });
      
      console.log(`✅ Community template installed: ${template.name}`);
      console.log(`📁 Template location: ${targetTemplateDir}`);
      
      // Ask if user wants to use this template
      const { useTemplate } = await inquirer.prompt({
        type: 'confirm',
        name: 'useTemplate',
        message: `Would you like to create a new project using ${template.name}?`,
        default: true
      });

      if (useTemplate) {
        await this.setupProjectFromTemplate(template.id);
      }

    } catch (error) {
      console.error('❌ Failed to install community template:', error.message);
      throw error;
    }
  }

  /**
   * Record template generation analytics
   */
  async recordTemplateGeneration(templateId, duration, success, errorMessage = null) {
    const record = {
      templateId,
      duration,
      success,
      errorMessage,
      timestamp: Date.now(),
      platform: process.platform,
      nodeVersion: process.version
    };

    this.analytics.generations.push(record);

    // Update popularity stats
    const current = this.analytics.popularTemplates.get(templateId) || 0;
    this.analytics.popularTemplates.set(templateId, current + 1);

    // Update average time
    if (success) {
      const current = this.analytics.averageTime.get(templateId) || { total: 0, count: 0 };
      current.total += duration;
      current.count += 1;
      this.analytics.averageTime.set(templateId, current);
    }
  }

  /**
   * Get template analytics
   */
  getTemplateAnalytics() {
    const totalGenerations = this.analytics.generations.length;
    const successfulGenerations = this.analytics.generations.filter(g => g.success).length;
    const successRate = totalGenerations > 0 ? (successfulGenerations / totalGenerations) * 100 : 0;

    const popularTemplates = Array.from(this.analytics.popularTemplates.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({ id, count }));

    return {
      totalGenerations,
      successfulGenerations,
      successRate: Math.round(successRate),
      popularTemplates,
      averageGenerationTime: this.calculateAverageGenerationTime()
    };
  }

  /**
   * Calculate average generation time
   */
  calculateAverageGenerationTime() {
    const successful = this.analytics.generations.filter(g => g.success);
    if (successful.length === 0) return 0;

    const totalTime = successful.reduce((sum, g) => sum + g.duration, 0);
    return Math.round(totalTime / successful.length);
  }

  /**
   * Load template from cache
   */
  async loadTemplate(templateName) {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName);
    }

    const templatePath = path.join(this.templatesDir, templateName);
    const template = await fs.readFile(templatePath, 'utf8');
    this.templateCache.set(templateName, template);

    return template;
  }

  /**
   * Render template with variables
   */
  async renderTemplate(templateName, variables) {
    const template = await this.loadTemplate(templateName);
    return this.interpolateVariables(template, variables);
  }
}

module.exports = TemplateEngine;