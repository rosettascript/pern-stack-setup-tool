/**
 * PERN Setup Tool - Template Engine
 * Advanced template system for project generation with caching and analytics
 */

const inquirer = require('inquirer');
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
        template: template.id,
        targetDir,
        variables
      }, async () => {
        const startTime = Date.now();

        // Generate project from template
        await this.generateProject(template.id, targetDir, variables);

        // Install dependencies
        await this.installTemplateDependencies(targetDir, template);

        // Configure environment
        await this.configureTemplateEnvironment(targetDir, variables, template);

        const duration = Date.now() - startTime;

        // Record analytics
        await this.recordTemplateGeneration(template.id, duration, true);

        console.log(`✅ ${template.name} setup completed in ${Math.floor(duration / 1000)}s`);
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
      console.log('📦 Installing dependencies...');

      // Install server dependencies
      if (await fs.pathExists(`${targetDir}/package.json`)) {
        await this.setup.safety.safeExecute('template-deps-install', { targetDir }, async () => {
          const { exec } = require('child-process-promise');
          await exec('npm install', { cwd: targetDir });
        });
      }

      // Install client dependencies
      const clientDir = path.join(targetDir, 'client');
      if (await fs.pathExists(`${clientDir}/package.json`)) {
        await this.setup.safety.safeExecute('client-deps-install', { targetDir: clientDir }, async () => {
          const { exec } = require('child-process-promise');
          await exec('npm install', { cwd: clientDir });
        });
      }

      console.log('✅ Dependencies installed');
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
      console.log('⚙️  Configuring environment...');

      // Create .env file
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

      const envPath = path.join(targetDir, '.env');
      await fs.writeFile(envPath, envContent);

      // Create .env.example
      const envExamplePath = path.join(targetDir, '.env.example');
      await fs.writeFile(envExamplePath, envContent.replace(variables.jwtSecret, 'your-jwt-secret'));

      console.log('✅ Environment configured');
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
      console.log('This is a placeholder for community template browsing');
      console.log('In a real implementation, this would:');
      console.log('• Connect to template registry');
      console.log('• Display available templates');
      console.log('• Allow template selection and download');
      console.log('• Handle template installation');

      // Placeholder for community template integration
      console.log('\n📚 Available community templates would be displayed here');

    } catch (error) {
      await this.setup.handleError('community-templates', error);
    }

    await this.showInterface();
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