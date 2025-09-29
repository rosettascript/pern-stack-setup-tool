#!/usr/bin/env node

// Set quiet mode before loading any modules to suppress verbose initialization output
process.env.QUIET_MODE = 'true';

/**
 * PERN Setup Tool - Main Entry Point
 * Comprehensive PERN Stack Setup with Advanced Features
 *
 * This tool provides a complete, safe, and user-friendly interface
 * for setting up PERN (PostgreSQL, Express, React, Node.js) stack
 * applications with enterprise-grade features.
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

// Import core modules (using CommonJS for consistency)
const SafetyFramework = require('./utils/safety-framework');
const Logger = require('./utils/logger');
const ConfigurationManager = require('./utils/configuration-manager');
const PerformanceMonitor = require('./utils/performance-monitor');

// Import component modules
const PostgreSQLManager = require('./components/postgresql-manager');
const RedisManager = require('./components/redis-manager');
const DockerManager = require('./components/docker-manager');
const ProjectManager = require('./components/project-manager');
const PM2Manager = require('./components/pm2-manager');
const NginxManager = require('./components/nginx-manager');
const TestManager = require('./components/test-manager');
const SecurityManager = require('./components/security-manager');
const ComplianceManager = require('./components/compliance-manager');
const ToolManager = require('./components/tool-manager');

// Import advanced features
const TemplateEngine = require('./features/template-engine');
const CacheManager = require('./features/cache-manager');
const PluginManager = require('./features/plugin-manager');
const AnalyticsManager = require('./features/analytics-manager');

/**
 * Main Setup Class
 * Orchestrates the entire PERN setup process
 */
class PERNSetupTool {
  constructor() {
    this.safety = new SafetyFramework();
    this.logger = new Logger(true); // Enable quiet mode for cleaner output
    this.config = new ConfigurationManager();
    this.performance = new PerformanceMonitor();

    // Component managers
    this.components = {
      postgresql: new PostgreSQLManager(this),
      redis: new RedisManager(this),
      docker: new DockerManager(this),
      project: new ProjectManager(this),
      pm2: new PM2Manager(this),
      nginx: new NginxManager(this),
      tests: new TestManager(this),
      tools: new ToolManager(this),
      security: new SecurityManager(this),
      compliance: new ComplianceManager(this)
    };

    // Advanced features
    this.features = {
      templates: new TemplateEngine(this),
      cache: new CacheManager(this),
      plugins: new PluginManager(this),
      analytics: new AnalyticsManager(this)
    };

    // Setup state
    this.state = {
      currentStep: 'initialization',
      completedComponents: new Set(),
      errors: [],
      warnings: [],
      startTime: Date.now()
    };

    // Platform detection
    this.platform = {
      isWindows: process.platform === 'win32',
      isLinux: process.platform === 'linux',
      isMacOS: process.platform === 'darwin',
      isWSLAvailable: false
    };
  }

  /**
   * Initialize the setup tool
   */
  async initialize() {
    try {
      // Initialize safety framework silently
      await this.safety.initialize();

      // Check platform compatibility
      await this.checkPlatformCompatibility();

      // Load configuration
      await this.config.load();

      // Initialize performance monitoring
      this.performance.start();

      // Clear quiet mode after initialization
      delete process.env.QUIET_MODE;

      this.logger.info('PERN Setup Tool initialized successfully');

    } catch (error) {
      console.error(chalk.red('❌ Initialization failed:'), error.message);
      await this.handleInitializationError(error);
    }
  }

  /**
   * Check platform compatibility and setup alternatives
   */
  async checkPlatformCompatibility() {
    if (this.platform.isWindows) {
      console.log(chalk.yellow('🪟 Windows detected - checking compatibility...'));

      try {
        // Check WSL availability
        await this.checkWSLAvailability();

        // Show Windows-specific information
        console.log(chalk.blue('ℹ️  Windows-specific notes:'));
        console.log('   • Redis will use PostgreSQL caching');
        console.log('   • PM2 will use Windows Service alternative');
        console.log('   • Nginx will use IIS alternative');
        console.log('   • Consider using WSL for full compatibility\n');

      } catch (error) {
        this.logger.warn('Platform compatibility check failed:', error.message);
      }
    }
  }

  /**
   * Check WSL availability on Windows
   */
  async checkWSLAvailability() {
    try {
      const { exec } = require('child-process-promise');
      await exec('wsl --version');
      this.platform.isWSLAvailable = true;
      console.log(chalk.green('✅ WSL available - enhanced compatibility enabled'));
    } catch (error) {
      console.log(chalk.yellow('ℹ️  WSL not available - using Windows alternatives'));
    }
  }

  /**
   * Main interface - entry point for user interaction
   */
  async showMainInterface() {
    try {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Select a command:',
          loop: false,
          choices: [
            '1. PostgreSQL',
            '2. Redis (Linux/macOS only)',
            '3. Docker',
            '4. Folder Structure',
            '5. PM2 (Linux/macOS only)',
            '6. Nginx (Linux/macOS only)',
            '7. Tests',
            '8. Tool Installation',
            '9. Configuration',
            '10. Advanced Features',
            '11. End'
          ]
        }
      ]);

      const selected = parseInt(choice.split('.')[0]);

      // Platform compatibility check for limited components
      if (this.platform.isWindows && (selected === 2 || selected === 5 || selected === 6)) {
        await this.handleWindowsCompatibility(selected);
        return;
      }

      // Route to appropriate handler
      switch(selected) {
        case 1: await this.components.postgresql.showInterface(); break;
        case 2: await this.components.redis.showInterface(); break;
        case 3: await this.components.docker.showInterface(); break;
        case 4: await this.components.project.showInterface(); break;
        case 5: await this.components.pm2.showInterface(); break;
        case 6: await this.components.nginx.showInterface(); break;
        case 7: await this.components.tests.showInterface(); break;
        case 8: await this.components.tools.showInterface(); break;
        case 9: await this.components.compliance.showInterface(); break;
        case 10: await this.showAdvancedFeaturesInterface(); break;
        case 11: await this.endInterface(); break;
      }

    } catch (error) {
      await this.handleError('main-interface', error);
    }
  }

  /**
   * Handle Windows compatibility for limited components
   */
  async handleWindowsCompatibility(component) {
    console.log(chalk.yellow('⚠️  This component is not natively available on Windows.'));
    console.log(chalk.blue('💡 Consider using alternatives:'));

    switch(component) {
      case 2: // Redis
        console.log('   - Use PostgreSQL for caching instead of Redis');
        break;
      case 5: // PM2
        console.log('   - Use Windows Service or nodemon instead of PM2');
        break;
      case 6: // Nginx
        console.log('   - Use IIS or built-in Express serving instead of Nginx');
        break;
    }

    console.log('   - Or run the setup in WSL (Windows Subsystem for Linux)');

    const { continueChoice } = await inquirer.prompt({
      type: 'list',
      name: 'continueChoice',
      message: 'Windows Compatibility Section',
      loop: false,
        choices: [
        '1. Go back',
        '2. Show Windows alternatives',
        new inquirer.Separator('──────────────'),
        'Continue anyway (may not work)'
      ]
    });

    if (continueChoice.includes('1')) {
      return this.showMainInterface();
    }

    if (continueChoice.includes('2')) {
      return this.showWindowsAlternatives(component);
    }

    // Continue anyway
    console.log(chalk.yellow('⚠️  Continuing with limited platform support...'));
  }

  /**
   * Show Windows alternatives interface
   */
  async showWindowsAlternatives(component) {
    console.log(chalk.blue('\n🪟 Windows Alternatives:'));
    console.log(chalk.gray('========================'));

    switch(component) {
      case 2: // Redis
        console.log('Redis Alternative: Use PostgreSQL for caching');
        console.log('- Install PostgreSQL (already included)');
        console.log('- Use PostgreSQL as both database and cache');
        console.log('- Or use SQLite for lightweight caching');
        break;
      case 5: // PM2
        console.log('PM2 Alternative: Use Windows Service or nodemon');
        console.log('- nodemon: npm install -g nodemon (for development)');
        console.log('- Windows Service: Use node-windows package');
        console.log('- forever: npm install -g forever');
        break;
      case 6: // Nginx
        console.log('Nginx Alternative: Use IIS or built-in Express serving');
        console.log('- IIS: Install Internet Information Services');
        console.log('- Express static: Use express.static() middleware');
        console.log('- Or use Docker with nginx container');
        break;
    }

    console.log(chalk.green('\n💡 WSL Alternative:'));
    console.log('- Install Windows Subsystem for Linux (WSL)');
    console.log('- Run the full setup in WSL environment');
    console.log('- Access from Windows through localhost');

    await this.showMainInterface();
  }

  /**
   * Advanced Features Interface
   */
  async showAdvancedFeaturesInterface() {
    try {
      const { featureChoice } = await inquirer.prompt({
        type: 'list',
        name: 'featureChoice',
        message: 'Advanced Features Section',
        loop: false,
        choices: [
          '1. Project Templates',
          '2. Performance Optimization',
          '3. Security Scanning',
          '4. Compliance Setup',
          '5. Analytics & Insights',
          '6. Plugin Management',
          '7. Microservices Setup',
          '8. Scalability Configuration',
          '9. Interactive Documentation',
          new inquirer.Separator('──────────────'),
          'Go back'
        ]
      });

      // Handle "Go back" option first
      if (featureChoice === 'Go back') {
        return this.showMainInterface();
      }

      const selected = parseInt(featureChoice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.features.templates.showInterface();
          return this.showAdvancedFeaturesInterface();
        case 2:
          await this.showPerformanceInterface();
          return this.showAdvancedFeaturesInterface();
        case 3:
          await this.components.security.showInterface();
          return this.showAdvancedFeaturesInterface();
        case 4:
          await this.components.compliance.showInterface();
          return this.showAdvancedFeaturesInterface();
        case 5:
          await this.features.analytics.showInterface();
          return this.showAdvancedFeaturesInterface();
        case 6:
          await this.features.plugins.showInterface();
          return this.showAdvancedFeaturesInterface();
        case 7:
          await this.showMicroservicesInterface();
          return this.showAdvancedFeaturesInterface();
        case 8:
          await this.showScalabilityInterface();
          return this.showAdvancedFeaturesInterface();
        case 9:
          await this.showDocumentationInterface();
          return this.showAdvancedFeaturesInterface();
      }

    } catch (error) {
      await this.handleError('advanced-features', error);
    }
  }

  /**
   * Performance Optimization Interface
   */
  async showPerformanceInterface() {
    const { optimizationChoice } = await inquirer.prompt({
      type: 'list',
      name: 'optimizationChoice',
      message: 'Performance Optimization Section',
      loop: false,
        choices: [
        '1. Enable intelligent caching',
        '2. Configure parallel processing',
        '3. Setup resource monitoring',
        '4. Optimize for current system',
        '5. View performance analytics',
        new inquirer.Separator('──────────────'),
        'Go back'
      ]
    });

    // Handle "Go back" option first
    if (optimizationChoice === 'Go back') {
      return this.showAdvancedFeaturesInterface();
    }

    switch(parseInt(optimizationChoice.split('.')[0])) {
      case 1:
        await this.features.cache.configure();
        return this.showPerformanceInterface();
      case 2:
        await this.configureParallelProcessing();
        return this.showPerformanceInterface();
      case 3:
        await this.performance.startMonitoring();
        console.log('✅ Resource monitoring started');
        return this.showPerformanceInterface();
      case 4:
        await this.optimizeForCurrentSystem();
        return this.showPerformanceInterface();
      case 5:
        await this.showPerformanceAnalytics();
        return this.showPerformanceInterface();
    }
  }

  /**
   * Configure parallel processing
   */
  async configureParallelProcessing() {
    const { concurrency } = await inquirer.prompt({
      type: 'number',
      name: 'concurrency',
      message: 'Number of parallel processes:',
      default: 4,
      validate: input => input > 0 && input <= 16 || 'Must be between 1 and 16'
    });

    this.config.set('parallel.concurrency', concurrency);
    console.log(`✅ Parallel processing configured: ${concurrency} processes`);
  }

  /**
   * Optimize for current system
   */
  async optimizeForCurrentSystem() {
    const systemInfo = {
      memory: os.totalmem(),
      cpus: os.cpus().length,
      platform: process.platform
    };

    // Auto-configure based on system resources
    const recommendations = {
      concurrency: Math.min(systemInfo.cpus, 4),
      cacheSize: Math.min(Math.floor(systemInfo.memory / 4), 5 * 1024 * 1024 * 1024),
      memoryLimit: Math.floor(systemInfo.memory * 0.8)
    };

    console.log(chalk.blue('🔧 System optimization recommendations:'));
    console.log(`   • Parallel processes: ${recommendations.concurrency}`);
    console.log(`   • Cache size: ${Math.floor(recommendations.cacheSize / 1024 / 1024)}MB`);
    console.log(`   • Memory limit: ${Math.floor(recommendations.memoryLimit / 1024 / 1024)}MB`);

    const { apply } = await inquirer.prompt({
      type: 'confirm',
      name: 'apply',
      message: 'Apply these optimizations?',
      default: true
    });

    if (apply) {
      this.config.set('performance', recommendations);
      console.log('✅ System optimizations applied');
    }
  }

  /**
   * Show performance analytics
   */
  async showPerformanceAnalytics() {
    const report = this.performance.generateReport();

    console.log(chalk.blue('\n📊 Performance Analytics:'));
    console.log(`   Total Duration: ${Math.floor(report.totalDuration / 1000)}s`);
    console.log(`   Operations Completed: ${report.operations || 0}`);
    console.log(`   Average Response Time: ${report.averageResponseTime || 0}ms`);
    console.log(`   Cache Hit Rate: ${report.cacheHitRate || 0}%`);

    if (report.recommendations && report.recommendations.length > 0) {
      console.log(chalk.yellow('\n💡 Recommendations:'));
      report.recommendations.forEach(rec => {
        const icon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`   ${icon} ${rec.message}`);
      });
    }
  }

  /**
   * Microservices Setup Interface
   */
  async showMicroservicesInterface() {
    console.log(chalk.blue('🏗️  Microservices Setup'));
    console.log('This will configure a complete microservices architecture');

    // First, let user select which project to configure
    await this.selectProjectForMicroservices();

    const { setupType } = await inquirer.prompt({
      type: 'list',
      name: 'setupType',
      message: `Microservices Setup Section for: ${this.config.get('project.name', 'Current Project')}`,
      loop: false,
        choices: [
        '1. Basic service mesh',
        '2. Full microservices architecture',
        '3. Kubernetes deployment',
        '4. Change Project',
        new inquirer.Separator('──────────────'),
        'Go back'
      ]
    });

    const selected = parseInt(setupType.split('.')[0]);

    switch(selected) {
      case 1:
        await this.setupBasicServiceMesh();
        return this.showMicroservicesInterface();
      case 2:
        await this.setupFullMicroservicesArchitecture();
        return this.showMicroservicesInterface();
      case 3:
        await this.setupKubernetesDeployment();
        return this.showMicroservicesInterface();
      case 4:
        await this.selectProjectForMicroservices();
        return this.showMicroservicesInterface();
      case 5:
        return this.showAdvancedFeaturesInterface();
    }
  }

  /**
   * Select project for microservices configuration
   */
  async selectProjectForMicroservices() {
    try {
      const existingProjects = this.getExistingProjects();
      
      if (existingProjects.length === 0) {
        console.log(chalk.yellow('⚠️  No existing projects found. Creating new project...'));
        await this.components.project.createProjectInterface();
        return;
      }

      const { projectChoice } = await inquirer.prompt({
        type: 'list',
        name: 'projectChoice',
        message: 'Select project for microservices configuration:',
        loop: false,
        choices: [
          ...existingProjects.map((project, index) => ({
            name: `${project.name} (${project.type}) - ${project.path}`,
            value: index
          })),
          'Create new project'
        ]
      });

      if (projectChoice === 'Create new project') {
        await this.components.project.createProjectInterface();
        return;
      }

      const selectedProject = existingProjects[projectChoice];
      this.config.set('project.path', selectedProject.path);
      this.config.set('project.name', selectedProject.name);
      this.config.set('project.type', selectedProject.type);
      
      console.log(chalk.green(`✅ Selected project: ${selectedProject.name}`));
    } catch (error) {
      await this.handleError('microservices-project-selection', error);
    }
  }

  /**
   * Setup basic service mesh
   */
  async setupBasicServiceMesh() {
    console.log(chalk.blue('🔗 Setting up basic service mesh...'));

    const { numServices } = await inquirer.prompt({
      type: 'number',
      name: 'numServices',
      message: 'Number of microservices:',
      default: 3,
      validate: input => input >= 2 && input <= 10 || 'Must be between 2 and 10 services'
    });

    const services = [];
    for (let i = 0; i < numServices; i++) {
      const { serviceName } = await inquirer.prompt({
        type: 'input',
        name: 'serviceName',
        message: `Service ${i + 1} name:`,
        default: `service-${i + 1}`,
        validate: input => input.length > 0 || 'Service name is required'
      });

      const { servicePort } = await inquirer.prompt({
        type: 'number',
        name: 'servicePort',
        message: `${serviceName} port:`,
        default: 3000 + i,
        validate: input => input > 1024 && input < 65535 || 'Port must be between 1025 and 65534'
      });

      services.push({ name: serviceName, port: servicePort });
    }

    // Setup service registry
    const serviceRegistry = {
      services,
      discovery: {
        type: 'consul',
        port: 8500
      },
      loadBalancer: {
        type: 'nginx',
        upstreams: services.map(s => `${s.name}:${s.port}`)
      }
    };

    this.config.set('microservices.serviceRegistry', serviceRegistry);

    // Generate service mesh configuration
    await this.generateServiceMeshConfig(services);

    console.log('✅ Basic service mesh configured');
    console.log(`📋 Services: ${services.map(s => `${s.name}:${s.port}`).join(', ')}`);
  }

  /**
   * Setup full microservices architecture
   */
  async setupFullMicroservicesArchitecture() {
    console.log(chalk.blue('🏗️  Setting up full microservices architecture...'));

    const { architectureType } = await inquirer.prompt({
      type: 'list',
      name: 'architectureType',
      message: 'Architecture pattern:',
      loop: false,
        choices: [
        '1. API Gateway + Services',
        '2. Event-driven microservices',
        '3. CQRS pattern',
        '4. Custom architecture'
      ]
    });

    const selected = parseInt(architectureType.split('.')[0]);

    switch(selected) {
      case 1:
        await this.setupAPIGatewayArchitecture();
        break;
      case 2:
        await this.setupEventDrivenArchitecture();
        break;
      case 3:
        await this.setupCQRSArchitecture();
        break;
      case 4:
        await this.setupCustomArchitecture();
        break;
    }

    console.log('✅ Full microservices architecture configured');
  }

  /**
   * Setup API Gateway architecture
   */
  async setupAPIGatewayArchitecture() {
    const gatewayConfig = {
      type: 'api-gateway',
      gateway: {
        name: 'api-gateway',
        port: 4000,
        routes: []
      },
      services: [
        { name: 'auth-service', port: 3001, path: '/auth' },
        { name: 'user-service', port: 3002, path: '/users' },
        { name: 'product-service', port: 3003, path: '/products' },
        { name: 'order-service', port: 3004, path: '/orders' }
      ]
    };

    // Generate API Gateway configuration
    await this.generateAPIGatewayConfig(gatewayConfig);

    this.config.set('microservices.architecture', gatewayConfig);
    console.log('✅ API Gateway architecture configured');
  }

  /**
   * Setup event-driven architecture
   */
  async setupEventDrivenArchitecture() {
    const eventConfig = {
      type: 'event-driven',
      messageBroker: {
        type: 'rabbitmq',
        port: 5672,
        managementPort: 15672
      },
      services: [
        { name: 'event-producer', port: 3001, events: ['user_created', 'order_placed'] },
        { name: 'event-consumer', port: 3002, events: ['user_created'] },
        { name: 'notification-service', port: 3003, events: ['order_placed'] }
      ]
    };

    // Generate event-driven configuration
    await this.generateEventDrivenConfig(eventConfig);

    this.config.set('microservices.architecture', eventConfig);
    console.log('✅ Event-driven architecture configured');
  }

  /**
   * Setup CQRS architecture
   */
  async setupCQRSArchitecture() {
    const cqrsConfig = {
      type: 'cqrs',
      commandSide: {
        services: [
          { name: 'command-service', port: 3001, commands: ['create_user', 'place_order'] }
        ]
      },
      querySide: {
        services: [
          { name: 'query-service', port: 3002, queries: ['get_user', 'get_orders'] }
        ]
      },
      eventStore: {
        type: 'eventstore',
        port: 2113
      }
    };

    // Generate CQRS configuration
    await this.generateCQRSConfig(cqrsConfig);

    this.config.set('microservices.architecture', cqrsConfig);
    console.log('✅ CQRS architecture configured');
  }

  /**
   * Setup custom architecture
   */
  async setupCustomArchitecture() {
    const { description } = await inquirer.prompt({
      type: 'input',
      name: 'description',
      message: 'Describe your custom architecture:',
      validate: input => input.length > 10 || 'Please provide a detailed description'
    });

    const customConfig = {
      type: 'custom',
      description,
      services: [],
      patterns: []
    };

    this.config.set('microservices.architecture', customConfig);
    console.log('✅ Custom architecture framework configured');
    console.log('💡 Manual configuration required for your specific architecture');
  }

  /**
   * Setup Kubernetes deployment
   */
  async setupKubernetesDeployment() {
    console.log(chalk.blue('☸️  Setting up Kubernetes deployment...'));

    const { clusterType } = await inquirer.prompt({
      type: 'list',
      name: 'clusterType',
      message: 'Kubernetes cluster type:',
      loop: false,
        choices: [
        '1. Local (Minikube/Docker Desktop)',
        '2. Cloud (AWS EKS)',
        '3. Cloud (Google GKE)',
        '4. Cloud (Azure AKS)',
        '5. On-premises'
      ]
    });

    const selected = parseInt(clusterType.split('.')[0]);

    const k8sConfig = {
      type: 'kubernetes',
      cluster: this.getClusterConfig(selected),
      services: [],
      ingress: {
        enabled: true,
        class: 'nginx'
      },
      monitoring: {
        prometheus: true,
        grafana: true
      }
    };

    // Generate Kubernetes manifests
    await this.generateKubernetesManifests(k8sConfig);

    this.config.set('microservices.kubernetes', k8sConfig);
    console.log('✅ Kubernetes deployment configured');
  }

  /**
   * Get cluster configuration
   */
  getClusterConfig(type) {
    const configs = {
      1: { type: 'local', provider: 'minikube', nodes: 1 },
      2: { type: 'cloud', provider: 'aws', region: 'us-east-1' },
      3: { type: 'cloud', provider: 'gcp', region: 'us-central1' },
      4: { type: 'cloud', provider: 'azure', region: 'eastus' },
      5: { type: 'on-premises', provider: 'custom' }
    };
    return configs[type] || configs[1];
  }

  /**
   * Generate service mesh configuration
   */
  async generateServiceMeshConfig(services) {
    const meshConfig = {
      version: '1.0',
      services: services.map(service => ({
        name: service.name,
        port: service.port,
        healthCheck: {
          path: '/health',
          interval: '30s',
          timeout: '5s'
        }
      })),
      loadBalancer: {
        algorithm: 'round_robin',
        stickySessions: false
      }
    };

    const configPath = path.join(process.cwd(), 'service-mesh-config.json');
    await fs.writeFile(configPath, JSON.stringify(meshConfig, null, 2));

    console.log(`📄 Service mesh config generated: ${configPath}`);
  }

  /**
   * Generate API Gateway configuration
   */
  async generateAPIGatewayConfig(config) {
    const gatewayConfig = {
      server: {
        port: config.gateway.port
      },
      routes: config.services.map(service => ({
        path: service.path,
        target: `http://localhost:${service.port}`
      }))
    };

    const configPath = path.join(process.cwd(), 'api-gateway-config.json');
    await fs.writeFile(configPath, JSON.stringify(gatewayConfig, null, 2));

    console.log(`📄 API Gateway config generated: ${configPath}`);
  }

  /**
   * Generate event-driven configuration
   */
  async generateEventDrivenConfig(config) {
    const eventConfig = {
      messageBroker: config.messageBroker,
      services: config.services,
      events: {
        exchanges: ['user_events', 'order_events', 'notification_events'],
        queues: config.services.flatMap(s => s.events.map(e => `${s.name}_${e}`))
      }
    };

    const configPath = path.join(process.cwd(), 'event-driven-config.json');
    await fs.writeFile(configPath, JSON.stringify(eventConfig, null, 2));

    console.log(`📄 Event-driven config generated: ${configPath}`);
  }

  /**
   * Generate CQRS configuration
   */
  async generateCQRSConfig(config) {
    const cqrsConfig = {
      commandSide: config.commandSide,
      querySide: config.querySide,
      eventStore: config.eventStore,
      projections: {
        user_projection: 'query-service',
        order_projection: 'query-service'
      }
    };

    const configPath = path.join(process.cwd(), 'cqrs-config.json');
    await fs.writeFile(configPath, JSON.stringify(cqrsConfig, null, 2));

    console.log(`📄 CQRS config generated: ${configPath}`);
  }

  /**
   * Generate Kubernetes manifests
   */
  async generateKubernetesManifests(config) {
    const manifests = {
      namespace: {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: { name: 'pern-microservices' }
      },
      services: config.services.map(service => ({
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name: service.name, namespace: 'pern-microservices' },
        spec: {
          selector: { app: service.name },
          ports: [{ port: service.port, targetPort: service.port }]
        }
      }))
    };

    const manifestsPath = path.join(process.cwd(), 'k8s-manifests.json');
    await fs.writeFile(manifestsPath, JSON.stringify(manifests, null, 2));

    console.log(`📄 Kubernetes manifests generated: ${manifestsPath}`);
  }

  /**
   * Scalability Configuration Interface
   */
  async showScalabilityInterface() {
    console.log(chalk.blue('📈 Scalability Configuration'));

    // First, let user select which project to configure
    await this.selectProjectForScalability();

    const { scalabilityChoice } = await inquirer.prompt({
      type: 'list',
      name: 'scalabilityChoice',
      message: `Scalability Configuration Section for: ${this.config.get('project.name', 'Current Project')}`,
      loop: false,
        choices: [
        '1. Configure auto-scaling',
        '2. Setup load balancing',
        '3. Database scaling',
        '4. Performance monitoring',
        '5. Change Project',
        new inquirer.Separator('──────────────'),
        'Go back'
      ]
    });

    // Handle "Go back" option first
    if (scalabilityChoice === 'Go back') {
      return this.showAdvancedFeaturesInterface();
    }

    switch(parseInt(scalabilityChoice.split('.')[0])) {
      case 1:
        await this.configureAutoScaling();
        return this.showScalabilityInterface();
      case 2:
        await this.setupLoadBalancing();
        return this.showScalabilityInterface();
      case 3:
        await this.configureDatabaseScaling();
        return this.showScalabilityInterface();
      case 4:
        await this.setupScalabilityMonitoring();
        return this.showScalabilityInterface();
      case 5:
        await this.selectProjectForScalability();
        return this.showScalabilityInterface();
    }
  }

  /**
   * Select project for scalability configuration
   */
  async selectProjectForScalability() {
    try {
      const existingProjects = this.getExistingProjects();
      
      if (existingProjects.length === 0) {
        console.log(chalk.yellow('⚠️  No existing projects found. Creating new project...'));
        await this.components.project.createProjectInterface();
        return;
      }

      const { projectChoice } = await inquirer.prompt({
        type: 'list',
        name: 'projectChoice',
        message: 'Select project for scalability configuration:',
        loop: false,
        choices: [
          ...existingProjects.map((project, index) => ({
            name: `${project.name} (${project.type}) - ${project.path}`,
            value: index
          })),
          'Create new project'
        ]
      });

      if (projectChoice === 'Create new project') {
        await this.components.project.createProjectInterface();
        return;
      }

      const selectedProject = existingProjects[projectChoice];
      this.config.set('project.path', selectedProject.path);
      this.config.set('project.name', selectedProject.name);
      this.config.set('project.type', selectedProject.type);
      
      console.log(chalk.green(`✅ Selected project: ${selectedProject.name}`));
    } catch (error) {
      await this.handleError('scalability-project-selection', error);
    }
  }

  /**
   * Configure auto-scaling
   */
  async configureAutoScaling() {
    const { scalingConfig } = await inquirer.prompt([
      {
        type: 'number',
        name: 'minInstances',
        message: 'Minimum instances:',
        default: 1
      },
      {
        type: 'number',
        name: 'maxInstances',
        message: 'Maximum instances:',
        default: 10
      },
      {
        type: 'number',
        name: 'targetCPU',
        message: 'Target CPU usage (%):',
        default: 70
      }
    ]);

    this.config.set('scaling', scalingConfig);
    console.log('✅ Auto-scaling configuration saved');
  }

  /**
   * Setup load balancing
   */
  async setupLoadBalancing() {
    console.log(chalk.blue('🔧 Setting up load balancing...'));

    const { lbType } = await inquirer.prompt({
      type: 'list',
      name: 'lbType',
      message: 'Load Balancing Setup Section',
      loop: false,
        choices: [
        '1. Application Load Balancing (HTTP/HTTPS)',
        '2. Network Load Balancing (TCP/UDP)',
        '3. Database Load Balancing',
        '4. Microservices Load Balancing',
        new inquirer.Separator('──────────────'),
        'Go back'
      ]
    });

    if (lbType === 'Go back') {
      return this.showScalabilityInterface();
    }

    const selected = parseInt(lbType.split('.')[0]);

    switch(selected) {
      case 1:
        await this.setupApplicationLoadBalancing();
        break;
      case 2:
        await this.setupNetworkLoadBalancing();
        break;
      case 3:
        await this.setupDatabaseLoadBalancing();
        break;
      case 4:
        await this.setupMicroservicesLoadBalancing();
        break;
    }

    console.log('✅ Load balancing configured');
  }

  /**
   * Setup application load balancing
   */
  async setupApplicationLoadBalancing() {
    const { frontendPort } = await inquirer.prompt({
      type: 'number',
      name: 'frontendPort',
      message: 'Load balancer frontend port:',
      default: 80
    });

    const { backendServers } = await inquirer.prompt({
      type: 'input',
      name: 'backendServers',
      message: 'Backend servers (comma-separated host:port):',
      default: 'localhost:3000,localhost:3001,localhost:3002',
      validate: input => {
        const servers = input.split(',');
        return servers.length >= 2 || 'At least 2 backend servers required';
      }
    });

    const { algorithm } = await inquirer.prompt({
      type: 'list',
      name: 'algorithm',
      message: 'Load balancing algorithm:',
      loop: false,
        choices: [
        'round_robin',
        'least_conn',
        'ip_hash',
        'weighted_round_robin'
      ],
      default: 'round_robin'
    });

    const { sslEnabled } = await inquirer.prompt({
      type: 'confirm',
      name: 'sslEnabled',
      message: 'Enable SSL/TLS termination?',
      default: false
    });

    const servers = backendServers.split(',').map(server => {
      const [host, port] = server.trim().split(':');
      return { host, port: parseInt(port) };
    });

    const lbConfig = {
      type: 'application',
      frontend: {
        port: frontendPort,
        ssl: sslEnabled
      },
      backend: {
        servers,
        algorithm,
        healthCheck: {
          path: '/health',
          interval: 30,
          timeout: 5,
          unhealthyThreshold: 3,
          healthyThreshold: 2
        }
      },
      features: {
        stickySessions: algorithm === 'ip_hash',
        compression: true,
        caching: false
      }
    };

    // Generate Nginx configuration for load balancing
    await this.generateLoadBalancerConfig(lbConfig);

    this.config.set('loadBalancing.application', lbConfig);
    console.log('✅ Application load balancing configured');
  }

  /**
   * Setup network load balancing
   */
  async setupNetworkLoadBalancing() {
    const { protocol } = await inquirer.prompt({
      type: 'list',
      name: 'protocol',
      message: 'Network protocol:',
      loop: false,
        choices: ['TCP', 'UDP', 'Both']
    });

    const { frontendPort } = await inquirer.prompt({
      type: 'number',
      name: 'frontendPort',
      message: 'Frontend port:',
      default: 8080
    });

    const { backendServers } = await inquirer.prompt({
      type: 'input',
      name: 'backendServers',
      message: 'Backend servers (comma-separated host:port):',
      default: 'localhost:3000,localhost:3001',
      validate: input => {
        const servers = input.split(',');
        return servers.length >= 2 || 'At least 2 backend servers required';
      }
    });

    const servers = backendServers.split(',').map(server => {
      const [host, port] = server.trim().split(':');
      return { host, port: parseInt(port) };
    });

    const lbConfig = {
      type: 'network',
      protocol: protocol.toLowerCase(),
      frontend: { port: frontendPort },
      backend: {
        servers,
        algorithm: 'round_robin',
        healthCheck: {
          type: 'tcp',
          interval: 10,
          timeout: 3
        }
      }
    };

    // Generate HAProxy or Nginx TCP load balancing config
    await this.generateNetworkLoadBalancerConfig(lbConfig);

    this.config.set('loadBalancing.network', lbConfig);
    console.log('✅ Network load balancing configured');
  }

  /**
   * Setup database load balancing
   */
  async setupDatabaseLoadBalancing() {
    const { dbType } = await inquirer.prompt({
      type: 'list',
      name: 'dbType',
      message: 'Database type:',
      loop: false,
        choices: ['PostgreSQL', 'MySQL', 'MongoDB']
    });

    const { readWriteSplit } = await inquirer.prompt({
      type: 'confirm',
      name: 'readWriteSplit',
      message: 'Enable read/write splitting?',
      default: true
    });

    const masterConfig = readWriteSplit ? await this.getDatabaseServerConfig('Master') : null;
    const slaveConfigs = await this.getMultipleDatabaseServers('Slave/Read replicas');

    const lbConfig = {
      type: 'database',
      database: dbType.toLowerCase(),
      readWriteSplit,
      master: masterConfig,
      slaves: slaveConfigs,
      connectionPooling: {
        enabled: true,
        maxConnections: 100,
        idleTimeout: 300
      },
      failover: {
        enabled: true,
        autoReconnect: true,
        retryDelay: 5000
      }
    };

    // Generate database load balancing configuration
    await this.generateDatabaseLoadBalancerConfig(lbConfig);

    this.config.set('loadBalancing.database', lbConfig);
    console.log('✅ Database load balancing configured');
  }

  /**
   * Setup microservices load balancing
   */
  async setupMicroservicesLoadBalancing() {
    const { serviceDiscovery } = await inquirer.prompt({
      type: 'list',
      name: 'serviceDiscovery',
      message: 'Service discovery mechanism:',
      loop: false,
        choices: [
        'Consul',
        'etcd',
        'Kubernetes DNS',
        'Custom registry'
      ]
    });

    const { circuitBreaker } = await inquirer.prompt({
      type: 'confirm',
      name: 'circuitBreaker',
      message: 'Enable circuit breaker pattern?',
      default: true
    });

    const { serviceMesh } = await inquirer.prompt({
      type: 'confirm',
      name: 'serviceMesh',
      message: 'Use service mesh (Istio/Linkerd)?',
      default: false
    });

    const lbConfig = {
      type: 'microservices',
      serviceDiscovery: serviceDiscovery.toLowerCase(),
      circuitBreaker: circuitBreaker ? {
        failureThreshold: 5,
        recoveryTimeout: 30000,
        monitoringPeriod: 10000
      } : false,
      serviceMesh: serviceMesh ? {
        provider: 'istio', // or linkerd
        enabled: true
      } : false,
      loadBalancing: {
        algorithm: 'round_robin',
        sessionAffinity: false,
        retryPolicy: {
          attempts: 3,
          backoff: 'exponential'
        }
      }
    };

    // Generate microservices load balancing configuration
    await this.generateMicroservicesLoadBalancerConfig(lbConfig);

    this.config.set('loadBalancing.microservices', lbConfig);
    console.log('✅ Microservices load balancing configured');
  }

  /**
   * Get database server configuration
   */
  async getDatabaseServerConfig(label) {
    const { host } = await inquirer.prompt({
      type: 'input',
      name: 'host',
      message: `${label} host:`,
      default: 'localhost'
    });

    const { port } = await inquirer.prompt({
      type: 'number',
      name: 'port',
      message: `${label} port:`,
      default: 5432
    });

    return { host, port };
  }

  /**
   * Get multiple database servers
   */
  async getMultipleDatabaseServers(label) {
    const { count } = await inquirer.prompt({
      type: 'number',
      name: 'count',
      message: `Number of ${label}:`,
      default: 2,
      validate: input => input >= 1 || 'At least 1 server required'
    });

    const servers = [];
    for (let i = 0; i < count; i++) {
      const server = await this.getDatabaseServerConfig(`${label} ${i + 1}`);
      servers.push(server);
    }

    return servers;
  }

  /**
   * Generate load balancer configuration
   */
  async generateLoadBalancerConfig(config) {
    let nginxConfig = `upstream backend {\n`;

    config.backend.servers.forEach(server => {
      nginxConfig += `    server ${server.host}:${server.port};\n`;
    });

    nginxConfig += `}\n\nserver {\n`;
    nginxConfig += `    listen ${config.frontend.port};\n`;

    if (config.frontend.ssl) {
      nginxConfig += `    listen 443 ssl;\n`;
      nginxConfig += `    ssl_certificate /etc/ssl/certs/cert.pem;\n`;
      nginxConfig += `    ssl_certificate_key /etc/ssl/private/key.pem;\n`;
    }

    nginxConfig += `    server_name localhost;\n\n`;
    nginxConfig += `    location / {\n`;
    nginxConfig += `        proxy_pass http://backend;\n`;
    nginxConfig += `        proxy_set_header Host $host;\n`;
    nginxConfig += `        proxy_set_header X-Real-IP $remote_addr;\n`;
    nginxConfig += `        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n`;
    nginxConfig += `        proxy_set_header X-Forwarded-Proto $scheme;\n`;

    if (config.backend.algorithm === 'ip_hash') {
      nginxConfig += `        ip_hash;\n`;
    } else if (config.backend.algorithm === 'least_conn') {
      nginxConfig += `        least_conn;\n`;
    }

    nginxConfig += `    }\n\n`;
    nginxConfig += `    # Health check endpoint\n`;
    nginxConfig += `    location /health {\n`;
    nginxConfig += `        access_log off;\n`;
    nginxConfig += `        return 200 "healthy\\n";\n`;
    nginxConfig += `        add_header Content-Type text/plain;\n`;
    nginxConfig += `    }\n}\n`;

    const configPath = path.join(process.cwd(), 'nginx-lb.conf');
    await fs.writeFile(configPath, nginxConfig);

    console.log(`📄 Load balancer config generated: ${configPath}`);
  }

  /**
   * Generate network load balancer configuration
   */
  async generateNetworkLoadBalancerConfig(config) {
    let haproxyConfig = `frontend http_front\n`;
    haproxyConfig += `    bind *:${config.frontend.port}\n`;
    haproxyConfig += `    default_backend backend\n\n`;

    haproxyConfig += `backend backend\n`;
    haproxyConfig += `    balance roundrobin\n`;

    config.backend.servers.forEach(server => {
      haproxyConfig += `    server ${server.host}_${server.port} ${server.host}:${server.port} check\n`;
    });

    const configPath = path.join(process.cwd(), 'haproxy-lb.cfg');
    await fs.writeFile(configPath, haproxyConfig);

    console.log(`📄 Network load balancer config generated: ${configPath}`);
  }

  /**
   * Generate database load balancer configuration
   */
  async generateDatabaseLoadBalancerConfig(config) {
    const dbConfig = {
      database: config.database,
      loadBalancing: {
        readWriteSplit: config.readWriteSplit,
        master: config.master,
        slaves: config.slaves,
        connectionPooling: config.connectionPooling,
        failover: config.failover
      }
    };

    const configPath = path.join(process.cwd(), 'db-lb-config.json');
    await fs.writeFile(configPath, JSON.stringify(dbConfig, null, 2));

    console.log(`📄 Database load balancer config generated: ${configPath}`);
  }

  /**
   * Generate microservices load balancer configuration
   */
  async generateMicroservicesLoadBalancerConfig(config) {
    const msConfig = {
      serviceDiscovery: config.serviceDiscovery,
      loadBalancing: config.loadBalancing,
      circuitBreaker: config.circuitBreaker,
      serviceMesh: config.serviceMesh
    };

    const configPath = path.join(process.cwd(), 'microservices-lb-config.json');
    await fs.writeFile(configPath, JSON.stringify(msConfig, null, 2));

    console.log(`📄 Microservices load balancer config generated: ${configPath}`);
  }

  /**
   * Configure database scaling
   */
  async configureDatabaseScaling() {
    console.log(chalk.blue('🗄️  Configuring database scaling...'));

    const { scalingType } = await inquirer.prompt({
      type: 'list',
      name: 'scalingType',
      message: 'Database Scaling Section',
      loop: false,
        choices: [
        '1. Vertical scaling (increase resources)',
        '2. Horizontal scaling (read replicas)',
        '3. Sharding configuration',
        '4. Connection pooling setup',
        new inquirer.Separator('──────────────'),
        'Go back'
      ]
    });

    if (scalingType.includes('5. Go back')) {
      return this.showScalabilityInterface();
    }

    const selected = parseInt(scalingType.split('.')[0]);

    switch(selected) {
      case 1:
        await this.configureVerticalScaling();
        break;
      case 2:
        await this.configureHorizontalScaling();
        break;
      case 3:
        await this.configureSharding();
        break;
      case 4:
        await this.configureConnectionPooling();
        break;
    }

    console.log('✅ Database scaling configured');
  }

  /**
   * Configure vertical scaling
   */
  async configureVerticalScaling() {
    const { currentMemory } = await inquirer.prompt({
      type: 'input',
      name: 'currentMemory',
      message: 'Current database memory (GB):',
      default: '4',
      validate: input => !isNaN(input) && parseFloat(input) > 0 || 'Must be a positive number'
    });

    const { targetMemory } = await inquirer.prompt({
      type: 'input',
      name: 'targetMemory',
      message: 'Target database memory (GB):',
      default: '8',
      validate: input => !isNaN(input) && parseFloat(input) > parseFloat(currentMemory) || 'Target must be greater than current'
    });

    const { currentCPU } = await inquirer.prompt({
      type: 'number',
      name: 'currentCPU',
      message: 'Current CPU cores:',
      default: 2,
      validate: input => input > 0 || 'Must be at least 1'
    });

    const { targetCPU } = await inquirer.prompt({
      type: 'number',
      name: 'targetCPU',
      message: 'Target CPU cores:',
      default: 4,
      validate: input => input >= currentCPU || 'Target must be greater than or equal to current'
    });

    const verticalConfig = {
      type: 'vertical',
      current: {
        memory: `${currentMemory}GB`,
        cpu: currentCPU
      },
      target: {
        memory: `${targetMemory}GB`,
        cpu: targetCPU
      },
      postgresql: {
        sharedBuffers: `${Math.floor(parseFloat(targetMemory) * 0.25)}GB`,
        workMem: `${Math.floor(parseFloat(targetMemory) * 0.02)}MB`,
        maintenanceWorkMem: `${Math.floor(parseFloat(targetMemory) * 0.05)}GB`,
        effectiveCacheSize: `${Math.floor(parseFloat(targetMemory) * 0.75)}GB`
      }
    };

    // Generate PostgreSQL configuration for vertical scaling
    await this.generateVerticalScalingConfig(verticalConfig);

    this.config.set('database.scaling.vertical', verticalConfig);
    console.log('✅ Vertical scaling configured');
    console.log(`📈 Memory: ${currentMemory}GB → ${targetMemory}GB`);
    console.log(`📈 CPU: ${currentCPU} → ${targetCPU} cores`);
  }

  /**
   * Configure horizontal scaling
   */
  async configureHorizontalScaling() {
    const { numReplicas } = await inquirer.prompt({
      type: 'number',
      name: 'numReplicas',
      message: 'Number of read replicas:',
      default: 2,
      validate: input => input >= 1 && input <= 10 || 'Must be between 1 and 10'
    });

    const { replicationType } = await inquirer.prompt({
      type: 'list',
      name: 'replicationType',
      message: 'Replication type:',
      loop: false,
        choices: [
        'Streaming replication',
        'Logical replication',
        'Physical replication'
      ]
    });

    const { loadBalancing } = await inquirer.prompt({
      type: 'confirm',
      name: 'loadBalancing',
      message: 'Enable automatic load balancing?',
      default: true
    });

    const horizontalConfig = {
      type: 'horizontal',
      replicas: numReplicas,
      replication: replicationType.toLowerCase().replace(' ', '_'),
      loadBalancing,
      master: {
        host: 'localhost',
        port: 5432
      },
      replicas: []
    };

    // Configure replica servers
    for (let i = 0; i < numReplicas; i++) {
      const { host } = await inquirer.prompt({
        type: 'input',
        name: 'host',
        message: `Replica ${i + 1} host:`,
        default: `replica-${i + 1}`
      });

      const { port } = await inquirer.prompt({
        type: 'number',
        name: 'port',
        message: `Replica ${i + 1} port:`,
        default: 5432
      });

      horizontalConfig.replicas.push({
        id: i + 1,
        host,
        port,
        priority: numReplicas - i // Higher priority for first replicas
      });
    }

    // Generate replication configuration
    await this.generateHorizontalScalingConfig(horizontalConfig);

    this.config.set('database.scaling.horizontal', horizontalConfig);
    console.log('✅ Horizontal scaling configured');
    console.log(`📋 ${numReplicas} read replicas configured`);
  }

  /**
   * Configure sharding
   */
  async configureSharding() {
    const { shardKey } = await inquirer.prompt({
      type: 'input',
      name: 'shardKey',
      message: 'Primary shard key column:',
      default: 'user_id',
      validate: input => input.length > 0 || 'Shard key is required'
    });

    const { numShards } = await inquirer.prompt({
      type: 'number',
      name: 'numShards',
      message: 'Number of shards:',
      default: 4,
      validate: input => input >= 2 && input <= 32 || 'Must be between 2 and 32'
    });

    const { shardingStrategy } = await inquirer.prompt({
      type: 'list',
      name: 'shardingStrategy',
      message: 'Sharding strategy:',
      loop: false,
        choices: [
        'Hash-based sharding',
        'Range-based sharding',
        'Directory-based sharding'
      ]
    });

    const shardingConfig = {
      type: 'sharding',
      shardKey,
      numShards,
      strategy: shardingStrategy.toLowerCase().replace('-', '_').replace(' ', '_'),
      shards: [],
      coordinator: {
        enabled: true,
        type: 'postgres_fdw' // Foreign Data Wrapper
      }
    };

    // Configure individual shards
    for (let i = 0; i < numShards; i++) {
      shardingConfig.shards.push({
        id: i + 1,
        name: `shard_${i + 1}`,
        host: `shard-${i + 1}`,
        port: 5432,
        database: `shard_${i + 1}_db`,
        range: this.calculateShardRange(i, numShards, shardingStrategy)
      });
    }

    // Generate sharding configuration
    await this.generateShardingConfig(shardingConfig);

    this.config.set('database.scaling.sharding', shardingConfig);
    console.log('✅ Database sharding configured');
    console.log(`🔑 Shard key: ${shardKey}`);
    console.log(`📦 ${numShards} shards configured`);
  }

  /**
   * Configure connection pooling
   */
  async configureConnectionPooling() {
    const { poolType } = await inquirer.prompt({
      type: 'list',
      name: 'poolType',
      message: 'Connection pool type:',
      loop: false,
        choices: [
        'PgBouncer',
        'PgPool-II',
        'Built-in PostgreSQL pooling',
        'Application-level pooling'
      ]
    });

    const { maxConnections } = await inquirer.prompt({
      type: 'number',
      name: 'maxConnections',
      message: 'Maximum connections per pool:',
      default: 20,
      validate: input => input > 0 || 'Must be greater than 0'
    });

    const { minConnections } = await inquirer.prompt({
      type: 'number',
      name: 'minConnections',
      message: 'Minimum connections per pool:',
      default: 2,
      validate: input => input >= 0 && input <= maxConnections || 'Must be between 0 and max connections'
    });

    const { connectionTimeout } = await inquirer.prompt({
      type: 'number',
      name: 'connectionTimeout',
      message: 'Connection timeout (seconds):',
      default: 30
    });

    const { idleTimeout } = await inquirer.prompt({
      type: 'number',
      name: 'idleTimeout',
      message: 'Idle connection timeout (minutes):',
      default: 10
    });

    const poolingConfig = {
      type: 'connection_pooling',
      poolType: poolType.toLowerCase().replace(' ', '_').replace('-', '_'),
      settings: {
        maxConnections,
        minConnections,
        connectionTimeout,
        idleTimeout: idleTimeout * 60, // convert to seconds
        acquireTimeout: 60000,
        reapInterval: 1000,
        createTimeout: 30000,
        destroyTimeout: 5000
      },
      monitoring: {
        enabled: true,
        metrics: ['active_connections', 'idle_connections', 'waiting_clients']
      }
    };

    // Generate connection pooling configuration
    await this.generateConnectionPoolingConfig(poolingConfig);

    this.config.set('database.scaling.pooling', poolingConfig);
    console.log('✅ Connection pooling configured');
    console.log(`🔌 Pool type: ${poolType}`);
    console.log(`📊 Max connections: ${maxConnections}`);
  }

  /**
   * Calculate shard range
   */
  calculateShardRange(shardIndex, totalShards, strategy) {
    if (strategy.includes('hash')) {
      // Hash-based: distribute evenly
      return {
        min: Math.floor((shardIndex / totalShards) * 0xFFFFFFFF),
        max: Math.floor(((shardIndex + 1) / totalShards) * 0xFFFFFFFF)
      };
    } else if (strategy.includes('range')) {
      // Range-based: assume numeric IDs
      const rangeSize = 1000000; // 1M records per shard
      return {
        min: shardIndex * rangeSize,
        max: (shardIndex + 1) * rangeSize - 1
      };
    } else {
      // Directory-based: no range calculation needed
      return null;
    }
  }

  /**
   * Generate vertical scaling configuration
   */
  async generateVerticalScalingConfig(config) {
    const pgConfig = `# PostgreSQL Configuration for Vertical Scaling
# Memory settings
shared_buffers = ${config.postgresql.sharedBuffers}
work_mem = ${config.postgresql.workMem}
maintenance_work_mem = ${config.postgresql.maintenanceWorkMem}
effective_cache_size = ${config.postgresql.effectiveCacheSize}

# CPU settings
max_worker_processes = ${config.target.cpu * 2}
max_parallel_workers = ${config.target.cpu}
max_parallel_workers_per_gather = ${Math.floor(config.target.cpu / 2)}

# Connection settings
max_connections = 200
shared_preload_libraries = 'pg_stat_statements'

# Logging
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_statement = 'ddl'
log_duration = on
log_lock_waits = on
`;

    const configPath = path.join(process.cwd(), 'postgresql-vertical.conf');
    await fs.writeFile(configPath, pgConfig);

    console.log(`📄 Vertical scaling config generated: ${configPath}`);
  }

  /**
   * Generate horizontal scaling configuration
   */
  async generateHorizontalScalingConfig(config) {
    const replicationConfig = {
      master: config.master,
      replicas: config.replicas,
      replication: config.replication,
      loadBalancing: config.loadBalancing
    };

    const configPath = path.join(process.cwd(), 'postgresql-replication.json');
    await fs.writeFile(configPath, JSON.stringify(replicationConfig, null, 2));

    console.log(`📄 Horizontal scaling config generated: ${configPath}`);
  }

  /**
   * Generate sharding configuration
   */
  async generateShardingConfig(config) {
    const shardingConfig = {
      coordinator: config.coordinator,
      shards: config.shards,
      shardKey: config.shardKey,
      strategy: config.strategy
    };

    const configPath = path.join(process.cwd(), 'postgresql-sharding.json');
    await fs.writeFile(configPath, JSON.stringify(shardingConfig, null, 2));

    console.log(`📄 Sharding config generated: ${configPath}`);
  }

  /**
   * Generate connection pooling configuration
   */
  async generateConnectionPoolingConfig(config) {
    let poolConfig = '';

    if (config.poolType === 'pgbouncer') {
      poolConfig = `[databases]
* = host=localhost port=5432

[pgbouncer]
listen_port = 6432
listen_addr = *
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = ${config.settings.maxConnections}
default_pool_size = ${config.settings.minConnections}
reserve_pool_size = 5
reserve_pool_timeout = 3
max_db_connections = ${config.settings.maxConnections}
max_user_connections = ${config.settings.maxConnections}
`;
    } else if (config.poolType === 'pgpool_ii') {
      poolConfig = `listen_addresses = '*'
port = 9999
socket_dir = '/tmp'
pcp_socket_dir = '/tmp'
backend_hostname0 = 'localhost'
backend_port0 = 5432
backend_weight0 = 1
enable_pool_hba = on
pool_passwd = 'pool_passwd'
authentication_timeout = ${config.settings.connectionTimeout}
num_init_children = ${config.settings.maxConnections}
max_pool = 4
child_life_time = 300
connection_life_time = ${config.settings.idleTimeout}
client_idle_limit = 0
`;
    }

    const configPath = path.join(process.cwd(), `${config.poolType}-config.conf`);
    await fs.writeFile(configPath, poolConfig);

    console.log(`📄 Connection pooling config generated: ${configPath}`);
  }

  /**
   * Setup scalability monitoring
   */
  async setupScalabilityMonitoring() {
    const monitoringConfig = {
      enabled: true,
      interval: 5000,
      metrics: ['cpu', 'memory', 'disk', 'network']
    };

    this.config.set('monitoring', monitoringConfig);
    console.log('✅ Scalability monitoring configured');
  }

  /**
   * Interactive Documentation Interface
   */
  async showDocumentationInterface() {
    const { docChoice } = await inquirer.prompt({
      type: 'list',
      name: 'docChoice',
      message: 'Interactive Documentation Section',
      loop: false,
        choices: [
        '1. View setup guide',
        '2. Run interactive examples',
        '3. Configuration preview',
        '4. Troubleshooting guide',
        '5. API documentation',
        '6. Start documentation server',
        new inquirer.Separator('──────────────'),
        'Go back'
      ]
    });

    switch(parseInt(docChoice.split('.')[0])) {
      case 1:
        await this.showSetupGuide();
        return this.showDocumentationInterface();
      case 2:
        await this.runInteractiveExamples();
        return this.showDocumentationInterface();
      case 3:
        await this.showConfigurationPreview();
        return this.showDocumentationInterface();
      case 4:
        await this.showTroubleshootingGuide();
        return this.showDocumentationInterface();
      case 5:
        await this.showAPIDocumentation();
        return this.showDocumentationInterface();
      case 6:
        await this.startDocumentationServer();
        return this.showDocumentationInterface();
      case 7:
        return this.showAdvancedFeaturesInterface();
    }
  }

  /**
   * Show setup guide
   */
  async showSetupGuide() {
    console.log(chalk.blue('\n📚 PERN Setup Guide'));
    console.log('===================');
    console.log('This tool will guide you through setting up a complete PERN stack.');
    console.log('Follow the prompts to configure each component.');
    console.log('\nRecommended order:');
    console.log('1. PostgreSQL (Database)');
    console.log('2. Docker (Containerization)');
    console.log('3. Folder Structure (Project setup)');
    console.log('4. Configuration (Environment & Auth)');
    console.log('5. Advanced Features (Templates & Optimization)');

    const { understood } = await inquirer.prompt({
      type: 'confirm',
      name: 'understood',
      message: 'Ready to continue?',
      default: true
    });

    if (understood) {
      await this.showMainInterface();
    }
  }

  /**
   * Run interactive examples
   */
  async runInteractiveExamples() {
    console.log(chalk.blue('\n🎮 Interactive Examples'));
    console.log('Learn by doing with guided, interactive examples');

    const { exampleCategory } = await inquirer.prompt({
      type: 'list',
      name: 'exampleCategory',
      message: 'Interactive Examples Section',
      loop: false,
        choices: [
        '1. Basic PERN Setup',
        '2. Authentication & Security',
        '3. Database Operations',
        '4. API Development',
        '5. Deployment & Scaling',
        '6. Testing & Quality Assurance',
        new inquirer.Separator('──────────────'),
        'Go back'
      ]
    });

    if (exampleCategory.includes('7. Go back')) {
      return this.showDocumentationInterface();
    }

    const selected = parseInt(exampleCategory.split('.')[0]);

    switch(selected) {
      case 1:
        await this.runBasicSetupExamples();
        break;
      case 2:
        await this.runAuthSecurityExamples();
        break;
      case 3:
        await this.runDatabaseExamples();
        break;
      case 4:
        await this.runAPIExamples();
        break;
      case 5:
        await this.runDeploymentExamples();
        break;
      case 6:
        await this.runTestingExamples();
        break;
    }

    await this.showDocumentationInterface();
  }

  /**
   * Run basic PERN setup examples
   */
  async runBasicSetupExamples() {
    const { example } = await inquirer.prompt({
      type: 'list',
      name: 'example',
      message: 'Basic PERN Setup Examples Section',
      loop: false,
        choices: [
        '1. Hello World PERN Application',
        '2. Project Structure Setup',
        '3. Environment Configuration',
        '4. Basic Docker Setup',
        new inquirer.Separator('──────────────'),
        'Go back'
      ]
    });

    if (example.includes('5. Go back')) {
      return this.runInteractiveExamples();
    }

    const selected = parseInt(example.split('.')[0]);

    switch(selected) {
      case 1:
        await this.runHelloWorldExample();
        break;
      case 2:
        await this.runProjectStructureExample();
        break;
      case 3:
        await this.runEnvironmentConfigExample();
        break;
      case 4:
        await this.runDockerSetupExample();
        break;
    }
  }

  /**
   * Run hello world PERN application example
   */
  async runHelloWorldExample() {
    console.log(chalk.blue('\n🚀 Hello World PERN Application Example'));
    console.log('This will create a complete PERN stack application with:');
    console.log('• PostgreSQL database with a users table');
    console.log('• Express.js API server');
    console.log('• React frontend');
    console.log('• Docker containerization');

    const { createExample } = await inquirer.prompt({
      type: 'confirm',
      name: 'createExample',
      message: 'Create the Hello World example?',
      default: true
    });

    if (createExample) {
      await this.createHelloWorldExample();
      console.log('✅ Hello World example created successfully!');
      console.log('📁 Check the "pern-hello-world" directory');
      console.log('🚀 Run: cd pern-hello-world && docker-compose up');
    }
  }

  /**
   * Create hello world example
   */
  async createHelloWorldExample() {
    const exampleDir = path.join(process.cwd(), 'pern-hello-world');

    // Create directory structure
    await fs.ensureDir(path.join(exampleDir, 'client/src'));
    await fs.ensureDir(path.join(exampleDir, 'server/src'));
    await fs.ensureDir(path.join(exampleDir, 'database'));

    // Create package.json files
    const clientPackage = {
      name: 'pern-hello-world-client',
      version: '1.0.0',
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        'axios': '^1.4.0'
      },
      scripts: {
        start: 'react-scripts start',
        build: 'react-scripts build'
      }
    };

    const serverPackage = {
      name: 'pern-hello-world-server',
      version: '1.0.0',
      dependencies: {
        'express': '^4.18.2',
        'pg': '^8.11.0',
        'cors': '^2.8.5',
        'dotenv': '^16.3.1'
      },
      scripts: {
        start: 'node src/index.js'
      }
    };

    await fs.writeFile(path.join(exampleDir, 'client/package.json'), JSON.stringify(clientPackage, null, 2));
    await fs.writeFile(path.join(exampleDir, 'server/package.json'), JSON.stringify(serverPackage, null, 2));

    // Create React app
    const reactApp = `import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const addUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/users', { name, email });
      setName('');
      setEmail('');
      fetchUsers();
    } catch (error) {
      console.error('Error adding user:', error);
    }
  };

  return (
    <div className="App">
      <h1>PERN Hello World</h1>
      <form onSubmit={addUser}>
        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Add User</button>
      </form>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name} - {user.email}</li>
        ))}
      </ul>
    </div>
  );
}

export default App;
`;

    await fs.writeFile(path.join(exampleDir, 'client/src/App.js'), reactApp);

    // Create Express server
    const expressServer = `const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'pern_hello',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

app.use(cors());
app.use(express.json());

// Routes
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY id');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { name, email } = req.body;
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});
`;

    await fs.writeFile(path.join(exampleDir, 'server/src/index.js'), expressServer);

    // Create database schema
    const schema = `-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (name, email) VALUES
  ('John Doe', 'john@example.com'),
  ('Jane Smith', 'jane@example.com')
ON CONFLICT (email) DO NOTHING;
`;

    await fs.writeFile(path.join(exampleDir, 'database/schema.sql'), schema);

    // Create docker-compose.yml
    const dockerCompose = `version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: pern_hello
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    ports:
      - "5432:5432"

  server:
    build: ./server
    ports:
      - "5000:5000"
    environment:
      DB_HOST: db
      DB_USER: postgres
      DB_PASSWORD: password
      DB_NAME: pern_hello
    depends_on:
      - db

  client:
    build: ./client
    ports:
      - "3000:3000"
    depends_on:
      - server
`;

    await fs.writeFile(path.join(exampleDir, 'docker-compose.yml'), dockerCompose);

    // Create Dockerfiles
    const serverDockerfile = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000
CMD ["npm", "start"]
`;

    const clientDockerfile = `FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["npm", "start"]
`;

    await fs.writeFile(path.join(exampleDir, 'server/Dockerfile'), serverDockerfile);
    await fs.writeFile(path.join(exampleDir, 'client/Dockerfile'), clientDockerfile);

    // Create README
    const readme = `# PERN Hello World

A complete PERN (PostgreSQL, Express, React, Node.js) stack example.

## Quick Start

\`\`\`bash
# Start all services
docker-compose up

# Access the application
# Frontend: http://localhost:3000
# API: http://localhost:5000/api/users
\`\`\`

## Services

- **Database**: PostgreSQL on port 5432
- **API Server**: Express.js on port 5000
- **Frontend**: React on port 3000

## API Endpoints

- GET /api/users - Get all users
- POST /api/users - Add a new user

## Development

\`\`\`bash
# Run services individually
cd server && npm install && npm start
cd client && npm install && npm start
\`\`\`
`;

    await fs.writeFile(path.join(exampleDir, 'README.md'), readme);
  }

  /**
   * Run project structure example
   */
  async runProjectStructureExample() {
    console.log(chalk.blue('\n📁 Project Structure Example'));
    console.log('This will demonstrate best practices for PERN project organization');

    const { showStructure } = await inquirer.prompt({
      type: 'confirm',
      name: 'showStructure',
      message: 'Show recommended project structure?',
      default: true
    });

    if (showStructure) {
      console.log(`
📦 Recommended PERN Project Structure:
========================================

pern-project/
├── 📁 client/                 # React frontend
│   ├── 📁 public/
│   ├── 📁 src/
│   │   ├── 📁 components/
│   │   ├── 📁 pages/
│   │   ├── 📁 hooks/
│   │   ├── 📁 utils/
│   │   ├── App.js
│   │   └── index.js
│   ├── package.json
│   └── Dockerfile
│
├── 📁 server/                 # Node.js backend
│   ├── 📁 src/
│   │   ├── 📁 controllers/
│   │   ├── 📁 models/
│   │   ├── 📁 routes/
│   │   ├── 📁 middleware/
│   │   ├── 📁 utils/
│   │   └── index.js
│   ├── 📁 tests/
│   ├── package.json
│   └── Dockerfile
│
├── 📁 database/               # Database files
│   ├── 📁 migrations/
│   ├── 📁 seeds/
│   ├── 📁 schemas/
│   └── 📄 connection.js
│
├── 📁 docker/                 # Docker configurations
│   ├── 📄 docker-compose.yml
│   ├── 📄 docker-compose.prod.yml
│   └── 📄 .dockerignore
│
├── 📁 nginx/                  # Nginx configurations
│   └── 📁 conf.d/
│
├── 📁 tests/                  # Integration tests
│   ├── 📁 unit/
│   ├── 📁 integration/
│   └── 📁 e2e/
│
├── 📁 docs/                   # Documentation
│   ├── 📄 API.md
│   ├── 📄 DEPLOYMENT.md
│   └── 📄 ARCHITECTURE.md
│
├── 📄 .env.example           # Environment template
├── 📄 docker-compose.yml     # Development compose
├── 📄 package.json           # Root package.json
└── 📄 README.md              # Project documentation
      `);

      const { createStructure } = await inquirer.prompt({
        type: 'confirm',
        name: 'createStructure',
        message: 'Create this project structure?',
        default: false
      });

      if (createStructure) {
        await this.createProjectStructureExample();
        console.log('✅ Project structure created!');
      }
    }
  }

  /**
   * Create project structure example
   */
  async createProjectStructureExample() {
    const structureDir = path.join(process.cwd(), 'pern-project-structure');

    const directories = [
      'client/public',
      'client/src/components',
      'client/src/pages',
      'client/src/hooks',
      'client/src/utils',
      'server/src/controllers',
      'server/src/models',
      'server/src/routes',
      'server/src/middleware',
      'server/src/utils',
      'server/tests',
      'database/migrations',
      'database/seeds',
      'database/schemas',
      'docker',
      'nginx/conf.d',
      'tests/unit',
      'tests/integration',
      'tests/e2e',
      'docs'
    ];

    // Create all directories
    for (const dir of directories) {
      await fs.ensureDir(path.join(structureDir, dir));
    }

    // Create example files
    const files = {
      'README.md': '# PERN Project Structure\n\nThis directory demonstrates the recommended structure for a PERN application.',
      'client/package.json': JSON.stringify({ name: 'client', version: '1.0.0' }, null, 2),
      'server/package.json': JSON.stringify({ name: 'server', version: '1.0.0' }, null, 2),
      'docker-compose.yml': 'version: \'3.8\'\nservices:\n  # Add your services here',
      '.env.example': '# Environment variables\nNODE_ENV=development\nPORT=5000\nDATABASE_URL=postgresql://localhost:5432/db'
    };

    for (const [filePath, content] of Object.entries(files)) {
      await fs.writeFile(path.join(structureDir, filePath), content);
    }

    console.log(`📁 Project structure created in: ${structureDir}`);
  }

  /**
   * Run environment configuration example
   */
  async runEnvironmentConfigExample() {
    console.log(chalk.blue('\n⚙️  Environment Configuration Example'));
    console.log('Learn how to properly configure environment variables for different environments');

    const { showConfig } = await inquirer.prompt({
      type: 'confirm',
      name: 'showConfig',
      message: 'Show environment configuration examples?',
      default: true
    });

    if (showConfig) {
      console.log(`
🔧 Environment Configuration Best Practices:
=============================================

1. 📄 .env.example (Template file - commit to git)
   NODE_ENV=development
   PORT=5000
   DATABASE_URL=postgresql://localhost:5432/myapp
   JWT_SECRET=your-super-secret-jwt-key
   REDIS_URL=redis://localhost:6379

2. 📄 .env.local (Local development - never commit)
   DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev
   JWT_SECRET=dev-secret-key-change-in-production

3. 📄 .env.production (Production environment)
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=postgresql://user:pass@prod-db:5432/myapp_prod
   JWT_SECRET=prod-super-secret-key
   REDIS_URL=redis://prod-redis:6379

4. 📄 .env.test (Testing environment)
   NODE_ENV=test
   PORT=5001
   DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_test
   JWT_SECRET=test-secret-key

🔒 Security Notes:
• Never commit .env files with real secrets
• Use different secrets for each environment
• Rotate secrets regularly
• Use environment-specific databases
      `);

      const { createEnvExample } = await inquirer.prompt({
        type: 'confirm',
        name: 'createEnvExample',
        message: 'Create environment configuration example?',
        default: false
      });

      if (createEnvExample) {
        await this.createEnvironmentConfigExample();
        console.log('✅ Environment configuration example created!');
      }
    }
  }

  /**
   * Create environment configuration example
   */
  async createEnvironmentConfigExample() {
    const envDir = path.join(process.cwd(), 'env-config-example');

    const envFiles = {
      '.env.example': `# Environment Variables Template
# Copy this file to .env and fill in your actual values

# Application
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
DB_SSL=false
DB_MAX_CONNECTIONS=20

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12

# Redis (optional)
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# External APIs (optional)
API_KEY_STRIPE=sk_test_...
API_KEY_SENDGRID=SG....

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Security
CORS_ORIGINS=http://localhost:3000,http://localhost:5000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
`,

      '.env.development': `# Development Environment
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

DATABASE_URL=postgresql://postgres:password@localhost:5432/myapp_dev
DB_SSL=false

JWT_SECRET=dev-jwt-secret-change-in-production-123456789
JWT_EXPIRES_IN=24h

REDIS_URL=redis://localhost:6379

LOG_LEVEL=debug
LOG_FILE=logs/dev.log

CORS_ORIGINS=http://localhost:3000
`,

      '.env.production': `# Production Environment
NODE_ENV=production
PORT=5000
CLIENT_URL=https://myapp.com

DATABASE_URL=postgresql://prod_user:prod_password@prod-db-host:5432/myapp_prod
DB_SSL=true
DB_MAX_CONNECTIONS=50

JWT_SECRET=prod-jwt-secret-super-secure-987654321
JWT_EXPIRES_IN=12h
BCRYPT_ROUNDS=15

REDIS_URL=redis://prod-redis-host:6379
REDIS_PASSWORD=prod-redis-password

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=sendgrid-api-key

LOG_LEVEL=warn
LOG_FILE=/var/log/myapp/app.log

CORS_ORIGINS=https://myapp.com,https://api.myapp.com
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=1000

# Production security
TRUST_PROXY=true
SECURE_COOKIES=true
FORCE_HTTPS=true
`
    };

    await fs.ensureDir(envDir);

    for (const [filename, content] of Object.entries(envFiles)) {
      await fs.writeFile(path.join(envDir, filename), content);
    }

    const readme = `# Environment Configuration Example

This directory contains examples of environment configuration for different deployment scenarios.

## Files

- **.env.example**: Template file with all possible variables (safe to commit)
- **.env.development**: Development environment configuration
- **.env.production**: Production environment configuration

## Usage

1. Copy .env.example to .env
2. Fill in your actual values
3. Never commit .env files to version control

## Security Best Practices

- Use strong, unique secrets for each environment
- Rotate secrets regularly
- Use environment-specific databases
- Enable SSL in production
- Use secure cookie settings
- Configure proper CORS origins
`;

    await fs.writeFile(path.join(envDir, 'README.md'), readme);
    console.log(`📁 Environment config example created in: ${envDir}`);
  }

  /**
   * Run Docker setup example
   */
  async runDockerSetupExample() {
    console.log(chalk.blue('\n🐳 Docker Setup Example'));
    console.log('Learn how to containerize your PERN application');

    const { showDocker } = await inquirer.prompt({
      type: 'confirm',
      name: 'showDocker',
      message: 'Show Docker setup examples?',
      default: true
    });

    if (showDocker) {
      console.log(`
🐳 Docker Setup for PERN Applications:
=======================================

📄 docker-compose.yml (Development):
\`\`\`yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  server:
    build: ./server
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:password@db:5432/myapp
      REDIS_URL: redis://redis:6379
    depends_on:
      - db
      - redis

  client:
    build: ./client
    ports:
      - "3000:3000"
    depends_on:
      - server

volumes:
  postgres_data:
\`\`\`

📄 Dockerfile (Server):
\`\`\`dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:5000/health || exit 1

CMD ["npm", "start"]
\`\`\`
      `);

      const { createDockerExample } = await inquirer.prompt({
        type: 'confirm',
        name: 'createDockerExample',
        message: 'Create Docker setup example?',
        default: false
      });

      if (createDockerExample) {
        await this.createDockerSetupExample();
        console.log('✅ Docker setup example created!');
      }
    }
  }

  /**
   * Create Docker setup example
   */
  async createDockerSetupExample() {
    const dockerDir = path.join(process.cwd(), 'docker-setup-example');

    const dockerCompose = `version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  server:
    build:
      context: ./server
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:password@db:5432/myapp
      REDIS_URL: redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./server:/app
      - /app/node_modules
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  client:
    build:
      context: ./client
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:5000/api
    depends_on:
      - server
    volumes:
      - ./client:/app
      - /app/node_modules

volumes:
  postgres_data:
  redis_data:
`;

    const serverDockerfile = `FROM node:18-alpine

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create app directory
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Change ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
  CMD curl -f http://localhost:5000/health || exit 1

EXPOSE 5000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "start"]
`;

    const clientDockerfile = `FROM node:18-alpine

# Install serve for production
RUN npm install -g serve

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

EXPOSE 3000

# Serve the built application
CMD ["serve", "-s", "build", "-l", "3000"]
`;

    const dockerignore = `node_modules
npm-debug.log
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.git
.gitignore
README.md
.DS_Store
.vscode
.idea
*.log
`;

    await fs.ensureDir(dockerDir);
    await fs.ensureDir(path.join(dockerDir, 'database'));

    await fs.writeFile(path.join(dockerDir, 'docker-compose.yml'), dockerCompose);
    await fs.writeFile(path.join(dockerDir, 'server.Dockerfile'), serverDockerfile);
    await fs.writeFile(path.join(dockerDir, 'client.Dockerfile'), clientDockerfile);
    await fs.writeFile(path.join(dockerDir, '.dockerignore'), dockerignore);

    const initSql = `-- Initialize database
CREATE DATABASE IF NOT EXISTS myapp;
\\c myapp;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (name, email) VALUES
  ('Docker User', 'docker@example.com')
ON CONFLICT (email) DO NOTHING;
`;

    await fs.writeFile(path.join(dockerDir, 'database/init.sql'), initSql);

    const readme = `# Docker Setup Example

Complete Docker setup for PERN applications with best practices.

## Quick Start

\`\`\`bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
\`\`\`

## Services

- **PostgreSQL**: Database on port 5432
- **Redis**: Cache on port 6379
- **Server**: API on port 5000
- **Client**: Frontend on port 3000

## Development

\`\`\`bash
# Rebuild and restart
docker-compose up --build

# Run tests in containers
docker-compose exec server npm test
\`\`\`

## Production

\`\`\`bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d
\`\`\`
`;

    await fs.writeFile(path.join(dockerDir, 'README.md'), readme);
    console.log(`📁 Docker setup example created in: ${dockerDir}`);
  }

  /**
   * Show configuration preview
   */
  async showConfigurationPreview() {
    const config = this.config.getAll();
    console.log(chalk.blue('\n⚙️  Configuration Preview:'));
    console.log(JSON.stringify(config, null, 2));
  }

  /**
   * Show troubleshooting guide
   */
  async showTroubleshootingGuide() {
    console.log(chalk.blue('\n🔧 Troubleshooting Guide'));
    console.log('Common issues and solutions:');
    console.log('• Permission denied: Run with sudo or fix user permissions');
    console.log('• Port already in use: Change port or kill existing process');
    console.log('• Module not found: Install missing dependencies');
    console.log('• Database connection: Check service status and credentials');
  }

  /**
   * Show API documentation
   */
  async showAPIDocumentation() {
    console.log(chalk.blue('\n📖 API Documentation'));
    console.log('Generate and view comprehensive API documentation');

    const { docAction } = await inquirer.prompt({
      type: 'list',
      name: 'docAction',
      message: 'API Documentation Section',
      loop: false,
        choices: [
        '1. Generate OpenAPI/Swagger documentation',
        '2. Generate Postman collection',
        '3. Generate API blueprint',
        '4. View existing documentation',
        '5. Setup API documentation server',
        new inquirer.Separator('──────────────'),
        'Go back'
      ]
    });

    if (docAction.includes('6. Go back')) {
      return this.showDocumentationInterface();
    }

    const selected = parseInt(docAction.split('.')[0]);

    switch(selected) {
      case 1:
        await this.generateSwaggerDocs();
        break;
      case 2:
        await this.generatePostmanCollection();
        break;
      case 3:
        await this.generateAPIBlueprint();
        break;
      case 4:
        await this.viewExistingDocumentation();
        break;
      case 5:
        await this.setupAPIDocumentationServer();
        break;
    }

    await this.showDocumentationInterface();
  }

  /**
   * Generate Swagger/OpenAPI documentation
   */
  async generateSwaggerDocs() {
    console.log(chalk.blue('\n📋 Generating OpenAPI/Swagger Documentation'));

    const { apiType } = await inquirer.prompt({
      type: 'list',
      name: 'apiType',
      message: 'API type to document:',
      loop: false,
        choices: [
        'REST API',
        'GraphQL API',
        'Both'
      ]
    });

    const { includeExamples } = await inquirer.prompt({
      type: 'confirm',
      name: 'includeExamples',
      message: 'Include request/response examples?',
      default: true
    });

    const { includeAuth } = await inquirer.prompt({
      type: 'confirm',
      name: 'includeAuth',
      message: 'Include authentication documentation?',
      default: true
    });

    // Generate OpenAPI specification
    const openAPISpec = await this.generateOpenAPISpec(apiType, includeExamples, includeAuth);

    // Save the specification
    const specPath = path.join(process.cwd(), 'openapi-spec.json');
    await fs.writeFile(specPath, JSON.stringify(openAPISpec, null, 2));

    console.log(`✅ OpenAPI specification generated: ${specPath}`);

    // Generate HTML documentation
    const htmlDocs = await this.generateSwaggerHTML(openAPISpec);
    const htmlPath = path.join(process.cwd(), 'api-docs.html');
    await fs.writeFile(htmlPath, htmlDocs);

    console.log(`✅ HTML documentation generated: ${htmlPath}`);

    // Offer to start documentation server
    const { startServer } = await inquirer.prompt({
      type: 'confirm',
      name: 'startServer',
      message: 'Start API documentation server?',
      default: false
    });

    if (startServer) {
      await this.startSwaggerServer(openAPISpec);
    }
  }

  /**
   * Generate OpenAPI specification
   */
  async generateOpenAPISpec(apiType, includeExamples, includeAuth) {
    const spec = {
      openapi: '3.0.3',
      info: {
        title: 'PERN Application API',
        version: '1.0.0',
        description: 'API documentation for PERN application',
        contact: {
          name: 'API Support',
          email: 'support@example.com'
        }
      },
      servers: [
        {
          url: 'http://localhost:5000/api',
          description: 'Development server'
        },
        {
          url: 'https://api.example.com',
          description: 'Production server'
        }
      ],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {}
      }
    };

    // Add authentication if requested
    if (includeAuth) {
      spec.components.securitySchemes = {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
        apiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key'
        }
      };

      spec.security = [
        { bearerAuth: [] },
        { apiKeyAuth: [] }
      ];
    }

    // Add common schemas
    spec.components.schemas = {
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'John Doe' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' }
        }
      },
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Error message' },
          code: { type: 'integer', example: 400 }
        }
      }
    };

    // Add REST API paths
    if (apiType === 'REST API' || apiType === 'Both') {
      spec.paths = {
        '/users': {
          get: {
            summary: 'Get all users',
            tags: ['Users'],
            security: includeAuth ? [{ bearerAuth: [] }] : [],
            responses: {
              200: {
                description: 'List of users',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/User' }
                    },
                    example: includeExamples ? [
                      { id: 1, name: 'John Doe', email: 'john@example.com' },
                      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
                    ] : undefined
                  }
                }
              },
              401: {
                description: 'Unauthorized',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                  }
                }
              }
            }
          },
          post: {
            summary: 'Create a new user',
            tags: ['Users'],
            security: includeAuth ? [{ bearerAuth: [] }] : [],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['name', 'email'],
                    properties: {
                      name: { type: 'string', example: 'John Doe' },
                      email: { type: 'string', format: 'email', example: 'john@example.com' }
                    }
                  },
                  example: includeExamples ? {
                    name: 'John Doe',
                    email: 'john@example.com'
                  } : undefined
                }
              }
            },
            responses: {
              201: {
                description: 'User created',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/User' }
                  }
                }
              },
              400: {
                description: 'Bad request',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                  }
                }
              }
            }
          }
        },
        '/users/{id}': {
          get: {
            summary: 'Get user by ID',
            tags: ['Users'],
            security: includeAuth ? [{ bearerAuth: [] }] : [],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'integer' },
                example: 1
              }
            ],
            responses: {
              200: {
                description: 'User found',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/User' }
                  }
                }
              },
              404: {
                description: 'User not found',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                  }
                }
              }
            }
          },
          put: {
            summary: 'Update user',
            tags: ['Users'],
            security: includeAuth ? [{ bearerAuth: [] }] : [],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'integer' }
              }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      email: { type: 'string', format: 'email' }
                    }
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'User updated',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/User' }
                  }
                }
              }
            }
          },
          delete: {
            summary: 'Delete user',
            tags: ['Users'],
            security: includeAuth ? [{ bearerAuth: [] }] : [],
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'integer' }
              }
            ],
            responses: {
              204: { description: 'User deleted' },
              404: {
                description: 'User not found',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                  }
                }
              }
            }
          }
        },
        '/auth/login': {
          post: {
            summary: 'User login',
            tags: ['Authentication'],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                      email: { type: 'string', format: 'email' },
                      password: { type: 'string' }
                    }
                  }
                }
              }
            },
            responses: {
              200: {
                description: 'Login successful',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        user: { $ref: '#/components/schemas/User' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };
    }

    // Add GraphQL schema if requested
    if (apiType === 'GraphQL API' || apiType === 'Both') {
      spec.paths['/graphql'] = {
        post: {
          summary: 'GraphQL endpoint',
          tags: ['GraphQL'],
          security: includeAuth ? [{ bearerAuth: [] }] : [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    query: { type: 'string' },
                    variables: { type: 'object' }
                  }
                },
                example: includeExamples ? {
                  query: `query GetUsers {
                    users {
                      id
                      name
                      email
                    }
                  }`,
                  variables: {}
                } : undefined
              }
            }
          },
          responses: {
            200: {
              description: 'GraphQL response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'object' },
                      errors: {
                        type: 'array',
                        items: { type: 'object' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      };

      // Add GraphQL schema documentation
      spec.components.schemas.GraphQLSchema = {
        type: 'object',
        description: 'GraphQL schema definition',
        properties: {
          query: { type: 'string', example: 'Query type for fetching data' },
          mutation: { type: 'string', example: 'Mutation type for modifying data' },
          subscription: { type: 'string', example: 'Subscription type for real-time data' }
        }
      };
    }

    return spec;
  }

  /**
   * Generate Swagger HTML documentation
   */
  async generateSwaggerHTML(spec) {
    const html = `<!DOCTYPE html>
<html>
<head>
    <title>PERN API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin: 0; background: #fafafa; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                spec: ${JSON.stringify(spec, null, 2)},
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout"
            });
        };
    </script>
</body>
</html>`;
    return html;
  }

  /**
   * Start Swagger documentation server
   */
  async startSwaggerServer(spec) {
    const express = require('express');
    const swaggerUi = require('swagger-ui-express');
    const app = express();
    const port = 3001;

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));

    app.get('/', (req, res) => {
      res.redirect('/api-docs');
    });

    const server = app.listen(port, () => {
      console.log(`🌐 API Documentation server running at http://localhost:${port}`);
      console.log('📖 View documentation at http://localhost:3001/api-docs');
    });

    // Keep server running for user to view
    const { stopServer } = await inquirer.prompt({
      type: 'confirm',
      name: 'stopServer',
      message: 'Stop documentation server?',
      default: false
    });

    if (stopServer) {
      server.close();
      console.log('🛑 Documentation server stopped');
    }
  }

  /**
   * Generate Postman collection
   */
  async generatePostmanCollection() {
    console.log(chalk.blue('\n📮 Generating Postman Collection'));

    const collection = {
      info: {
        name: 'PERN Application API',
        description: 'Postman collection for PERN application API',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [],
      variable: [
        {
          key: 'baseUrl',
          value: 'http://localhost:5000/api',
          type: 'string'
        },
        {
          key: 'token',
          value: '',
          type: 'string'
        }
      ]
    };

    // Add authentication requests
    collection.item.push({
      name: 'Authentication',
      item: [
        {
          name: 'Login',
          request: {
            method: 'POST',
            header: [
              { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                email: 'user@example.com',
                password: 'password123'
              }, null, 2)
            },
            url: {
              raw: '{{baseUrl}}/auth/login',
              host: ['{{baseUrl}}'],
              path: ['auth', 'login']
            }
          }
        }
      ]
    });

    // Add user management requests
    collection.item.push({
      name: 'Users',
      item: [
        {
          name: 'Get All Users',
          request: {
            method: 'GET',
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' }
            ],
            url: {
              raw: '{{baseUrl}}/users',
              host: ['{{baseUrl}}'],
              path: ['users']
            }
          }
        },
        {
          name: 'Create User',
          request: {
            method: 'POST',
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' },
              { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                name: 'John Doe',
                email: 'john@example.com'
              }, null, 2)
            },
            url: {
              raw: '{{baseUrl}}/users',
              host: ['{{baseUrl}}'],
              path: ['users']
            }
          }
        },
        {
          name: 'Get User by ID',
          request: {
            method: 'GET',
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' }
            ],
            url: {
              raw: '{{baseUrl}}/users/:id',
              host: ['{{baseUrl}}'],
              path: ['users', ':id'],
              variable: [
                { key: 'id', value: '1', description: 'User ID' }
              ]
            }
          }
        },
        {
          name: 'Update User',
          request: {
            method: 'PUT',
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' },
              { key: 'Content-Type', value: 'application/json' }
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                name: 'John Smith',
                email: 'johnsmith@example.com'
              }, null, 2)
            },
            url: {
              raw: '{{baseUrl}}/users/:id',
              host: ['{{baseUrl}}'],
              path: ['users', ':id'],
              variable: [
                { key: 'id', value: '1', description: 'User ID' }
              ]
            }
          }
        },
        {
          name: 'Delete User',
          request: {
            method: 'DELETE',
            header: [
              { key: 'Authorization', value: 'Bearer {{token}}' }
            ],
            url: {
              raw: '{{baseUrl}}/users/:id',
              host: ['{{baseUrl}}'],
              path: ['users', ':id'],
              variable: [
                { key: 'id', value: '1', description: 'User ID' }
              ]
            }
          }
        }
      ]
    });

    const collectionPath = path.join(process.cwd(), 'pern-api-collection.json');
    await fs.writeFile(collectionPath, JSON.stringify(collection, null, 2));

    console.log(`✅ Postman collection generated: ${collectionPath}`);
    console.log('📥 Import this file into Postman to test your API');
  }

  /**
   * Generate API Blueprint
   */
  async generateAPIBlueprint() {
    console.log(chalk.blue('\n📄 Generating API Blueprint Documentation'));

    const blueprint = `# PERN Application API

## API Overview
This API provides endpoints for managing users and authentication in a PERN application.

# Group Authentication

## Login [/auth/login]
### Login [POST]
Login with email and password to receive a JWT token.

+ Request (application/json)
    + Attributes
        + email: john@example.com (string, required) - User's email address
        + password: password123 (string, required) - User's password

+ Response 200 (application/json)
    + Attributes
        + token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (string) - JWT access token
        + user (User)

+ Response 401 (application/json)
    + Attributes
        + error: Invalid credentials (string)

# Group Users

## Users Collection [/users]
### List All Users [GET]
Get a list of all users.

+ Request
    + Headers
        Authorization: Bearer {token}

+ Response 200 (application/json)
    + Attributes (array[User])

### Create User [POST]
Create a new user account.

+ Request (application/json)
    + Headers
        Authorization: Bearer {token}
    + Attributes
        + name: John Doe (string, required) - User's full name
        + email: john@example.com (string, required) - User's email address

+ Response 201 (application/json)
    + Attributes (User)

+ Response 400 (application/json)
    + Attributes
        + error: Email already exists (string)

## User [/users/{id}]
### Get User [GET]
Get a specific user by ID.

+ Parameters
    + id: 1 (number, required) - User's unique identifier

+ Request
    + Headers
        Authorization: Bearer {token}

+ Response 200 (application/json)
    + Attributes (User)

+ Response 404 (application/json)
    + Attributes
        + error: User not found (string)

### Update User [PUT]
Update an existing user's information.

+ Parameters
    + id: 1 (number, required) - User's unique identifier

+ Request (application/json)
    + Headers
        Authorization: Bearer {token}
    + Attributes
        + name: John Smith (string) - Updated name
        + email: johnsmith@example.com (string) - Updated email

+ Response 200 (application/json)
    + Attributes (User)

### Delete User [DELETE]
Delete a user account.

+ Parameters
    + id: 1 (number, required) - User's unique identifier

+ Request
    + Headers
        Authorization: Bearer {token}

+ Response 204

# Data Structures

## User
+ id: 1 (number) - Unique user identifier
+ name: John Doe (string) - User's full name
+ email: john@example.com (string) - User's email address
+ created_at: \`2019-01-01T00:00:00.000Z\` (string) - Account creation timestamp
+ updated_at: \`2019-01-01T00:00:00.000Z\` (string) - Last update timestamp
`;

    const blueprintPath = path.join(process.cwd(), 'api-blueprint.md');
    await fs.writeFile(blueprintPath, blueprint);

    console.log(`✅ API Blueprint generated: ${blueprintPath}`);
    console.log('📖 Use tools like Aglio to render this blueprint into HTML');
  }

  /**
   * View existing documentation
   */
  async viewExistingDocumentation() {
    const docsDir = path.join(process.cwd(), 'docs');
    const possibleDocs = [
      'README.md',
      'API.md',
      'api-docs.html',
      'openapi-spec.json',
      'pern-api-collection.json',
      'api-blueprint.md'
    ];

    console.log(chalk.blue('\n📚 Available Documentation:'));

    let foundDocs = [];
    for (const doc of possibleDocs) {
      const docPath = path.join(process.cwd(), doc);
      if (await fs.pathExists(docPath)) {
        foundDocs.push(doc);
        console.log(`✅ ${doc}`);
      }
    }

    if (foundDocs.length === 0) {
      console.log('❌ No documentation files found in current directory');
      console.log('💡 Generate documentation first using the options above');
      return;
    }

    const { selectedDoc } = await inquirer.prompt({
      type: 'list',
      name: 'selectedDoc',
      message: 'Select documentation to view:',
      loop: false,
        choices: foundDocs
    });

    const docPath = path.join(process.cwd(), selectedDoc);
    const content = await fs.readFile(docPath, 'utf8');

    console.log(chalk.blue(`\n📖 Content of ${selectedDoc}:`));
    console.log('='.repeat(50));

    if (selectedDoc.endsWith('.json')) {
      console.log(JSON.stringify(JSON.parse(content), null, 2));
    } else if (selectedDoc.endsWith('.html')) {
      console.log('HTML file - open in browser or use a documentation server');
      console.log(`File location: ${docPath}`);
    } else {
      console.log(content);
    }
  }

  /**
   * Setup API documentation server
   */
  async setupAPIDocumentationServer() {
    console.log(chalk.blue('\n🌐 Setting up API Documentation Server'));

    const { serverType } = await inquirer.prompt({
      type: 'list',
      name: 'serverType',
      message: 'API Documentation Server Section',
      loop: false,
        choices: [
        'Swagger UI (OpenAPI)',
        'Postman Mock Server',
        'Redoc (OpenAPI)',
        'Stoplight (OpenAPI)',
        new inquirer.Separator('──────────────'),
        'Go back'
      ]
    });

    if (serverType.includes('Go back')) {
      return;
    }

    const selected = serverType.split(' ')[0].toLowerCase();

    switch(selected) {
      case 'swagger':
        await this.setupSwaggerServer();
        break;
      case 'postman':
        await this.setupPostmanMockServer();
        break;
      case 'redoc':
        await this.setupRedocServer();
        break;
      case 'stoplight':
        await this.setupStoplightServer();
        break;
    }
  }

  /**
   * Setup Swagger UI server
   */
  async setupSwaggerServer() {
    const specPath = path.join(process.cwd(), 'openapi-spec.json');

    if (!await fs.pathExists(specPath)) {
      console.log('❌ OpenAPI specification not found. Generate it first.');
      return;
    }

    const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
    await this.startSwaggerServer(spec);
  }

  /**
   * Setup Postman Mock Server
   */
  async setupPostmanMockServer() {
    console.log('📮 Postman Mock Server setup:');
    console.log('1. Import the generated collection into Postman');
    console.log('2. Create a new mock server from the collection');
    console.log('3. Configure mock responses for each endpoint');
    console.log('4. Start the mock server');
    console.log('5. Use the mock server URL for testing');
  }

  /**
   * Setup Redoc server
   */
  async setupRedocServer() {
    const specPath = path.join(process.cwd(), 'openapi-spec.json');

    if (!await fs.pathExists(specPath)) {
      console.log('❌ OpenAPI specification not found. Generate it first.');
      return;
    }

    const redocHtml = `<!DOCTYPE html>
<html>
<head>
    <title>PERN API Documentation - Redoc</title>
</head>
<body>
    <redoc spec-url='./openapi-spec.json'></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"></script>
</body>
</html>`;

    const redocPath = path.join(process.cwd(), 'redoc-docs.html');
    await fs.writeFile(redocPath, redocHtml);

    console.log(`✅ Redoc documentation generated: ${redocPath}`);
    console.log('🌐 Open this file in a browser to view the documentation');
  }

  /**
   * Setup Stoplight server
   */
  async setupStoplightServer() {
    console.log('🛑 Stoplight setup:');
    console.log('1. Go to https://stoplight.io/');
    console.log('2. Create a new project');
    console.log('3. Import your OpenAPI specification');
    console.log('4. Use the hosted documentation URL');
  }

  /**
   * Start documentation server
   */
  async startDocumentationServer() {
    console.log(chalk.blue('🌐 Starting Interactive Documentation Server'));

    const { serverType } = await inquirer.prompt({
      type: 'list',
      name: 'serverType',
      message: 'Documentation Server Section',
      loop: false,
        choices: [
        '1. Full Documentation Hub (Recommended)',
        '2. API Documentation Only',
        '3. Setup Guide Server',
        '4. Troubleshooting Assistant',
        new inquirer.Separator('──────────────'),
        'Go back'
      ]
    });

    if (serverType.includes('5. Go back')) {
      return this.showDocumentationInterface();
    }

    const selected = parseInt(serverType.split('.')[0]);

    switch(selected) {
      case 1:
        await this.startFullDocumentationHub();
        break;
      case 2:
        await this.startAPIDocumentationServer();
        break;
      case 3:
        await this.startSetupGuideServer();
        break;
      case 4:
        await this.startTroubleshootingAssistant();
        break;
    }

    await this.showDocumentationInterface();
  }

  /**
   * Start full documentation hub
   */
  async startFullDocumentationHub() {
    const express = require('express');
    const path = require('path');
    const app = express();
    const port = 3002;

    // Serve static files
    app.use(express.static(path.join(__dirname, '..', 'docs')));
    app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

    // API routes for dynamic content
    app.get('/api/docs', async (req, res) => {
      const docs = await this.getAvailableDocumentation();
      res.json(docs);
    });

    app.get('/api/examples', async (req, res) => {
      const examples = await this.getInteractiveExamples();
      res.json(examples);
    });

    app.post('/api/examples/:example/run', async (req, res) => {
      const example = req.params.example;
      const result = await this.runExampleCode(example, req.body);
      res.json(result);
    });

    app.get('/api/troubleshoot', async (req, res) => {
      const issue = req.query.issue;
      const solution = await this.getTroubleshootingSolution(issue);
      res.json(solution);
    });

    // Main documentation page
    app.get('/', (req, res) => {
      res.send(this.generateDocumentationHubHTML());
    });

    // API documentation
    app.get('/api-docs', async (req, res) => {
      const specPath = path.join(process.cwd(), 'openapi-spec.json');
      if (await fs.pathExists(specPath)) {
        const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
        res.send(this.generateSwaggerHTML(spec));
      } else {
        res.send('<h1>API Documentation Not Found</h1><p>Generate API documentation first.</p>');
      }
    });

    // Setup guide
    app.get('/setup', (req, res) => {
      res.send(this.generateSetupGuideHTML());
    });

    // Troubleshooting
    app.get('/troubleshoot', (req, res) => {
      res.send(this.generateTroubleshootingHTML());
    });

    const server = app.listen(port, () => {
      console.log(`🌐 Full Documentation Hub running at http://localhost:${port}`);
      console.log('📚 Available sections:');
      console.log(`   • Main Hub: http://localhost:${port}`);
      console.log(`   • API Docs: http://localhost:${port}/api-docs`);
      console.log(`   • Setup Guide: http://localhost:${port}/setup`);
      console.log(`   • Troubleshooting: http://localhost:${port}/troubleshoot`);
    });

    // Keep server running
    const { stopServer } = await inquirer.prompt({
      type: 'confirm',
      name: 'stopServer',
      message: 'Stop documentation server?',
      default: false
    });

    if (stopServer) {
      server.close();
      console.log('🛑 Documentation server stopped');
    }
  }

  /**
   * Generate documentation hub HTML
   */
  generateDocumentationHubHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PERN Setup Documentation Hub</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 0; text-align: center; border-radius: 10px; margin-bottom: 30px; }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.2em; opacity: 0.9; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: white; border-radius: 10px; padding: 25px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: transform 0.2s; }
        .card:hover { transform: translateY(-5px); }
        .card h3 { color: #667eea; margin-bottom: 15px; }
        .card p { margin-bottom: 15px; }
        .btn { display: inline-block; background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; transition: background 0.2s; }
        .btn:hover { background: #5a6fd8; }
        .status { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 0.8em; font-weight: bold; }
        .status.available { background: #d4edda; color: #155724; }
        .status.not-available { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 PERN Setup Documentation Hub</h1>
            <p>Comprehensive documentation and interactive examples for your PERN application</p>
        </div>

        <div class="grid">
            <div class="card">
                <h3>📖 Setup Guide</h3>
                <p>Step-by-step guide to set up your PERN application with best practices.</p>
                <a href="/setup" class="btn">View Guide</a>
            </div>

            <div class="card">
                <h3>🔌 API Documentation</h3>
                <p id="api-status">Loading API documentation status...</p>
                <a href="/api-docs" class="btn">View API Docs</a>
            </div>

            <div class="card">
                <h3>🎮 Interactive Examples</h3>
                <p>Run and experiment with code examples in your browser.</p>
                <a href="#examples" class="btn" onclick="showExamples()">View Examples</a>
            </div>

            <div class="card">
                <h3>🔧 Troubleshooting</h3>
                <p>Get help with common issues and error resolution.</p>
                <a href="/troubleshoot" class="btn">Get Help</a>
            </div>

            <div class="card">
                <h3>📊 Performance Analytics</h3>
                <p>Monitor and analyze your application's performance.</p>
                <button class="btn" onclick="showAnalytics()">View Analytics</button>
            </div>

            <div class="card">
                <h3>🛡️ Security Center</h3>
                <p>Security best practices and vulnerability management.</p>
                <button class="btn" onclick="showSecurity()">Security Center</button>
            </div>
        </div>

        <div id="examples-section" style="display: none;">
            <h2>🎮 Interactive Examples</h2>
            <div id="examples-list"></div>
        </div>
    </div>

    <script>
        // Load documentation status
        fetch('/api/docs')
            .then(response => response.json())
            .then(data => {
                const apiStatus = document.getElementById('api-status');
                if (data.apiDocs) {
                    apiStatus.innerHTML = '<span class="status available">Available</span> OpenAPI/Swagger documentation ready';
                } else {
                    apiStatus.innerHTML = '<span class="status not-available">Not Generated</span> Generate API documentation first';
                }
            })
            .catch(error => {
                console.error('Error loading docs status:', error);
            });

        function showExamples() {
            const section = document.getElementById('examples-section');
            const examplesList = document.getElementById('examples-list');

            if (section.style.display === 'none') {
                section.style.display = 'block';

                fetch('/api/examples')
                    .then(response => response.json())
                    .then(examples => {
                        examplesList.innerHTML = examples.map(example => \`
                            <div class="card">
                                <h4>\${example.title}</h4>
                                <p>\${example.description}</p>
                                <button class="btn" onclick="runExample('\${example.id}')">Run Example</button>
                            </div>
                        \`).join('');
                    });
            } else {
                section.style.display = 'none';
            }
        }

        function runExample(exampleId) {
            fetch(\`/api/examples/\${exampleId}/run\`, { method: 'POST' })
                .then(response => response.json())
                .then(result => {
                    alert('Example executed: ' + JSON.stringify(result, null, 2));
                });
        }

        function showAnalytics() {
            alert('Analytics feature coming soon!');
        }

        function showSecurity() {
            alert('Security center feature coming soon!');
        }
    </script>
</body>
</html>`;
  }

  /**
   * Generate setup guide HTML
   */
  generateSetupGuideHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PERN Setup Guide</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .step { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 0 5px 5px 0; }
        .step h3 { color: #667eea; margin-bottom: 10px; }
        .code { background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; font-family: 'Monaco', 'Menlo', monospace; overflow-x: auto; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 10px; border-radius: 5px; }
        .success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 10px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🚀 PERN Setup Guide</h1>
    <p>This guide will walk you through setting up a complete PERN (PostgreSQL, Express, React, Node.js) application.</p>

    <div class="step">
        <h3>Step 1: Choose Your Setup Type</h3>
        <p>Run the PERN setup tool and select your preferred configuration:</p>
        <div class="code">pern-setup</div>
        <p>Choose from: Basic PERN, PERN + Redis, PERN + Docker, or Full-stack with all components.</p>
    </div>

    <div class="step">
        <h3>Step 2: Database Setup</h3>
        <p>Configure PostgreSQL with proper security settings:</p>
        <ul>
            <li>Create a dedicated database user</li>
            <li>Set up proper permissions</li>
            <li>Configure connection pooling</li>
            <li>Enable SSL for production</li>
        </ul>
    </div>

    <div class="step">
        <h3>Step 3: Backend Configuration</h3>
        <p>Set up your Express.js server with:</p>
        <ul>
            <li>Environment variables</li>
            <li>Authentication middleware</li>
            <li>API routes and validation</li>
            <li>Error handling</li>
        </ul>
    </div>

    <div class="step">
        <h3>Step 4: Frontend Setup</h3>
        <p>Create your React application:</p>
        <ul>
            <li>Component structure</li>
            <li>State management</li>
            <li>API integration</li>
            <li>Routing</li>
        </ul>
    </div>

    <div class="step">
        <h3>Step 5: Deployment</h3>
        <p>Deploy your application:</p>
        <ul>
            <li>Use Docker for containerization</li>
            <li>Set up PM2 for process management</li>
            <li>Configure Nginx as reverse proxy</li>
            <li>Set up SSL certificates</li>
        </ul>
    </div>

    <div class="warning">
        <strong>⚠️ Important:</strong> Always use environment variables for sensitive data and never commit secrets to version control.
    </div>

    <div class="success">
        <strong>✅ Next Steps:</strong> After completing the setup, run your tests and deploy to staging before production.
    </div>
</body>
</html>`;
  }

  /**
   * Generate troubleshooting HTML
   */
  generateTroubleshootingHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Troubleshooting Guide</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
        .issue { background: #f8f9fa; border-left: 4px solid #dc3545; padding: 20px; margin: 20px 0; border-radius: 0 5px 5px 0; }
        .issue h3 { color: #dc3545; margin-bottom: 10px; }
        .solution { background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 10px 0; border-radius: 0 5px 5px 0; }
        .code { background: #2d3748; color: #e2e8f0; padding: 10px; border-radius: 3px; font-family: monospace; display: inline-block; margin: 5px 0; }
        .search { width: 100%; padding: 10px; margin: 20px 0; border: 1px solid #ddd; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>🔧 Troubleshooting Guide</h1>
    <p>Find solutions to common PERN setup issues.</p>

    <input type="text" class="search" placeholder="Search for issues..." onkeyup="searchIssues(this.value)">

    <div class="issue" data-issue="database-connection">
        <h3>Database Connection Failed</h3>
        <p>Unable to connect to PostgreSQL database.</p>
        <div class="solution">
            <strong>Solutions:</strong>
            <ul>
                <li>Check if PostgreSQL service is running: <code>sudo systemctl status postgresql</code></li>
                <li>Verify connection string in environment variables</li>
                <li>Ensure database and user exist</li>
                <li>Check firewall settings</li>
            </ul>
        </div>
    </div>

    <div class="issue" data-issue="port-already-in-use">
        <h3>Port Already in Use</h3>
        <p>Application cannot start because port is occupied.</p>
        <div class="solution">
            <strong>Solutions:</strong>
            <ul>
                <li>Find process using port: <code>lsof -i :5000</code></li>
                <li>Kill process: <code>kill -9 PID</code></li>
                <li>Change port in environment variables</li>
                <li>Use PM2 to manage multiple processes</li>
            </ul>
        </div>
    </div>

    <div class="issue" data-issue="npm-install-failed">
        <h3>npm install Failed</h3>
        <p>Package installation fails with errors.</p>
        <div class="solution">
            <strong>Solutions:</strong>
            <ul>
                <li>Clear npm cache: <code>npm cache clean --force</code></li>
                <li>Delete node_modules and package-lock.json</li>
                <li>Check Node.js version compatibility</li>
                <li>Try with different registry: <code>npm install --registry=https://registry.npmjs.org/</code></li>
            </ul>
        </div>
    </div>

    <div class="issue" data-issue="cors-errors">
        <h3>CORS Errors</h3>
        <p>Frontend cannot communicate with backend API.</p>
        <div class="solution">
            <strong>Solutions:</strong>
            <ul>
                <li>Configure CORS in Express server</li>
                <li>Add frontend URL to allowed origins</li>
                <li>Check if API is running on correct port</li>
                <li>Verify environment variables</li>
            </ul>
        </div>
    </div>

    <div class="issue" data-issue="authentication-failed">
        <h3>Authentication Not Working</h3>
        <p>JWT tokens or login functionality fails.</p>
        <div class="solution">
            <strong>Solutions:</strong>
            <ul>
                <li>Check JWT_SECRET environment variable</li>
                <li>Verify token expiration settings</li>
                <li>Ensure proper middleware order</li>
                <li>Check password hashing configuration</li>
            </ul>
        </div>
    </div>

    <script>
        function searchIssues(query) {
            const issues = document.querySelectorAll('.issue');
            const lowerQuery = query.toLowerCase();

            issues.forEach(issue => {
                const text = issue.textContent.toLowerCase();
                const matches = text.includes(lowerQuery);
                issue.style.display = matches || query === '' ? 'block' : 'none';
            });
        }
    </script>
</body>
</html>`;
  }

  /**
   * Start API documentation server
   */
  async startAPIDocumentationServer() {
    const specPath = path.join(process.cwd(), 'openapi-spec.json');

    if (!await fs.pathExists(specPath)) {
      console.log('❌ OpenAPI specification not found. Generate API documentation first.');
      return this.showAPIDocumentation();
    }

    const spec = JSON.parse(await fs.readFile(specPath, 'utf8'));
    await this.startSwaggerServer(spec);
  }

  /**
   * Start setup guide server
   */
  async startSetupGuideServer() {
    const express = require('express');
    const app = express();
    const port = 3003;

    app.get('/', (req, res) => {
      res.send(this.generateSetupGuideHTML());
    });

    app.get('/api/steps', (req, res) => {
      res.json(this.getSetupSteps());
    });

    const server = app.listen(port, () => {
      console.log(`📚 Setup Guide Server running at http://localhost:${port}`);
    });

    const { stopServer } = await inquirer.prompt({
      type: 'confirm',
      name: 'stopServer',
      message: 'Stop setup guide server?',
      default: false
    });

    if (stopServer) {
      server.close();
      console.log('🛑 Setup guide server stopped');
    }
  }

  /**
   * Start troubleshooting assistant
   */
  async startTroubleshootingAssistant() {
    const express = require('express');
    const app = express();
    const port = 3004;

    app.use(express.json());

    app.get('/', (req, res) => {
      res.send(this.generateTroubleshootingHTML());
    });

    app.post('/api/diagnose', async (req, res) => {
      const { error, context } = req.body;
      const diagnosis = await this.diagnoseIssue(error, context);
      res.json(diagnosis);
    });

    const server = app.listen(port, () => {
      console.log(`🔧 Troubleshooting Assistant running at http://localhost:${port}`);
    });

    const { stopServer } = await inquirer.prompt({
      type: 'confirm',
      name: 'stopServer',
      message: 'Stop troubleshooting assistant?',
      default: false
    });

    if (stopServer) {
      server.close();
      console.log('🛑 Troubleshooting assistant stopped');
    }
  }

  /**
   * Get available documentation
   */
  async getAvailableDocumentation() {
    const docs = {
      setupGuide: true,
      apiDocs: await fs.pathExists(path.join(process.cwd(), 'openapi-spec.json')),
      troubleshooting: true,
      examples: true
    };
    return docs;
  }

  /**
   * Get interactive examples
   */
  async getInteractiveExamples() {
    return [
      {
        id: 'hello-world',
        title: 'Hello World PERN App',
        description: 'Complete PERN application with user management'
      },
      {
        id: 'auth-system',
        title: 'Authentication System',
        description: 'JWT-based authentication with role management'
      },
      {
        id: 'docker-setup',
        title: 'Docker Configuration',
        description: 'Containerized PERN application setup'
      }
    ];
  }

  /**
   * Run example code
   */
  async runExampleCode(exampleId, params) {
    // Simulate running example code
    return {
      exampleId,
      status: 'executed',
      output: `Example ${exampleId} executed successfully`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get troubleshooting solution
   */
  async getTroubleshootingSolution(issue) {
    const solutions = {
      'database-connection': {
        issue: 'Database connection failed',
        solutions: [
          'Check PostgreSQL service status',
          'Verify connection string',
          'Ensure database exists',
          'Check firewall settings'
        ]
      },
      'port-in-use': {
        issue: 'Port already in use',
        solutions: [
          'Find process using port with lsof',
          'Kill conflicting process',
          'Change application port',
          'Use PM2 for process management'
        ]
      }
    };

    return solutions[issue] || { issue: 'Unknown issue', solutions: ['Check logs for more details'] };
  }

  /**
   * Get setup steps
   */
  getSetupSteps() {
    return [
      { step: 1, title: 'Choose Setup Type', description: 'Select your preferred PERN configuration' },
      { step: 2, title: 'Database Setup', description: 'Configure PostgreSQL with security' },
      { step: 3, title: 'Backend Configuration', description: 'Set up Express.js server' },
      { step: 4, title: 'Frontend Setup', description: 'Create React application' },
      { step: 5, title: 'Deployment', description: 'Deploy with Docker and PM2' }
    ];
  }

  /**
   * Diagnose issue
   */
  async diagnoseIssue(error, context) {
    // Simple diagnosis logic
    if (error.includes('ECONNREFUSED')) {
      return {
        diagnosis: 'Connection refused - service may not be running',
        solutions: ['Check if service is started', 'Verify port configuration', 'Check firewall']
      };
    } else if (error.includes('ENOTFOUND')) {
      return {
        diagnosis: 'Host not found - DNS or network issue',
        solutions: ['Check hostname', 'Verify network connectivity', 'Check DNS settings']
      };
    } else {
      return {
        diagnosis: 'Unknown error',
        solutions: ['Check application logs', 'Verify configuration', 'Restart services']
      };
    }
  }

  /**
   * End interface - completion and summary
   */
  async endInterface() {
    try {
      const { choice } = await inquirer.prompt({
        type: 'list',
        name: 'choice',
        message: 'Setup Summary Section',
        loop: false,
        choices: [
          '1. View setup summary',
          '2. Export configuration',
          '3. Start all services',
          new inquirer.Separator('──────────────'),
          'Exit'
        ]
      });

      // Handle Exit immediately
      if (choice === 'Exit' || choice.includes('Exit')) {
        console.log(chalk.green('\n👋 Thank you for using PERN Setup Tool!'));
        console.log(chalk.gray('Happy coding! 🚀'));

        // Force exit after a short delay to ensure message is displayed
        setTimeout(() => {
          process.exit(0);
        }, 100);
        return;
      }

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.displaySetupSummary();
          break;
        case 2:
          await this.exportConfiguration();
          break;
        case 3:
          await this.startAllServices();
          break;
      }
    } catch (error) {
      // Force exit on any error
      console.log(chalk.green('\n👋 Thank you for using PERN Setup Tool!'));
      console.log(chalk.gray('Happy coding! 🚀'));
      process.exit(0);
    }
  }

  /**
   * Display comprehensive setup summary
   */
  async displaySetupSummary() {
    const duration = Date.now() - this.state.startTime;
    const report = this.performance.generateReport();

    console.log(chalk.blue.bold('\n📋 Setup Summary'));
    console.log(chalk.gray('================'));
    console.log(`⏱️  Total Duration: ${Math.floor(duration / 1000)}s`);
    console.log(`✅ Components Completed: ${this.state.completedComponents.size}`);
    console.log(`❌ Errors: ${this.state.errors.length}`);
    console.log(`⚠️  Warnings: ${this.state.warnings.length}`);

    // Component status
    console.log(chalk.blue('\n📦 Component Status:'));
    const components = ['postgresql', 'redis', 'docker', 'project', 'pm2', 'nginx', 'tests', 'configuration'];
    components.forEach(component => {
      const status = this.state.completedComponents.has(component) ? '✅' : '❌';
      console.log(`   ${status} ${component.charAt(0).toUpperCase() + component.slice(1)}`);
    });

    // Performance metrics
    if (report.operations > 0) {
      console.log(chalk.blue('\n📊 Performance Metrics:'));
      console.log(`   Operations: ${report.operations}`);
      console.log(`   Average Time: ${report.averageResponseTime || 0}ms`);
      console.log(`   Cache Hit Rate: ${report.cacheHitRate || 0}%`);
    }

    // Next steps
    console.log(chalk.green('\n🚀 Next Steps:'));
    console.log('1. Review generated configurations');
    console.log('2. Start your development environment');
    console.log('3. Run tests to verify setup');
    console.log('4. Deploy to production when ready');

    // Safety recommendations
    const safetyReport = await this.safety.generateSafetyReport();
    if (safetyReport.recommendations.length > 0) {
      console.log(chalk.yellow('\n💡 Recommendations:'));
      safetyReport.recommendations.forEach(rec => {
        const icon = rec.priority === 'high' ? '🔴' : '🟡';
        console.log(`   ${icon} ${rec.message}`);
      });
    }

    await this.endInterface();
  }

  /**
   * Export configuration
   */
  async exportConfiguration() {
    const config = this.config.getAll();
    const exportPath = path.join(process.cwd(), 'pern-setup-config.json');

    await fs.writeFile(exportPath, JSON.stringify(config, null, 2));
    console.log(chalk.green(`✅ Configuration exported to: ${exportPath}`));

    await this.endInterface();
  }

  /**
   * Start all configured services
   */
  async startAllServices() {
    console.log(chalk.blue('🚀 Starting all services...'));

    try {
      // Start services based on completed components
      for (const component of this.state.completedComponents) {
        switch(component) {
          case 'postgresql':
            await this.components.postgresql.start();
            break;
          case 'redis':
            await this.components.redis.start();
            break;
          case 'docker':
            await this.components.docker.start();
            break;
          case 'pm2':
            await this.components.pm2.start();
            break;
          case 'nginx':
            await this.components.nginx.start();
            break;
        }
      }

      console.log(chalk.green('✅ All services started successfully'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to start some services:'), error.message);
    }

    await this.endInterface();
  }

  /**
   * Handle errors with comprehensive error management
   */
  async handleError(context, error) {
    this.state.errors.push({
      context,
      message: error.message,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });

    this.logger.error(`Error in ${context}:`, error);

    // Show user-friendly error message
    console.error(chalk.red(`\n❌ Error in ${context}:`), error.message);

    // Offer recovery options
    const { recoveryChoice } = await inquirer.prompt({
      type: 'list',
      name: 'recoveryChoice',
      message: 'How would you like to proceed?',
      loop: false,
        choices: [
        '1. Retry the operation',
        '2. Skip and continue',
        '3. View troubleshooting guide',
        '4. Exit setup'
      ]
    });

    switch(parseInt(recoveryChoice.split('.')[0])) {
      case 1:
        // Retry logic will be handled by calling function
        throw error;
      case 2:
        console.log(chalk.yellow('⚠️  Skipping and continuing...'));
        break;
      case 3:
        await this.showTroubleshootingGuide();
        throw error;
      case 4:
        await this.exit();
        break;
    }
  }

  /**
   * Handle initialization errors
   */
  async handleInitializationError(error) {
    console.error(chalk.red('❌ Critical error during initialization'));
    console.error('Please check:');
    console.error('• Node.js version (requires 18+)');
    console.error('• System permissions');
    console.error('• Available disk space');
    console.error('• Network connectivity');

    const { retry } = await inquirer.prompt({
      type: 'confirm',
      name: 'retry',
      message: 'Retry initialization?',
      default: true
    });

    if (retry) {
      await this.initialize();
      await this.showMainInterface();
    } else {
      process.exit(1);
    }
  }

  /**
   * Exit the setup tool gracefully
   */
  async exit() {
    try {
      // Generate final reports
      await this.safety.generateSafetyReport();
      await this.performance.generateReport();

      // Cleanup
      await this.safety.cleanup();

      console.log(chalk.green('\n👋 Thank you for using PERN Setup Tool!'));
      console.log(chalk.gray('Happy coding! 🚀'));

      process.exit(0);
    } catch (error) {
      console.error(chalk.red('❌ Error during exit:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Main execution function
   */
  async run() {
    try {
      await this.initialize();
      await this.showMainInterface();
    } catch (error) {
      console.error(chalk.red('❌ Fatal error:'), error.message);
      await this.handleInitializationError(error);
    }
  }
}

// CLI interface using commander
const program = require('commander');

program
  .name('pern-setup')
  .description('Comprehensive PERN Stack Setup Tool')
  .version('1.0.0')
  .option('--safe', 'Run in safe mode with additional validations')
  .option('--verbose', 'Enable verbose logging')
  .option('--config <file>', 'Use specific configuration file')
  .option('--platform <platform>', 'Target platform (linux, macos, windows)')
  .parse();

// Set environment variables from CLI options
if (program.safe) process.env.SAFE_MODE = 'true';
if (program.verbose) process.env.LOG_LEVEL = 'debug';
if (program.config) process.env.CONFIG_FILE = program.config;
if (program.platform) process.env.TARGET_PLATFORM = program.platform;

// Run the setup tool
const setupTool = new PERNSetupTool();
setupTool.run().catch(error => {
  console.error(chalk.red('❌ Unhandled error:'), error);
  process.exit(1);
});

module.exports = PERNSetupTool;