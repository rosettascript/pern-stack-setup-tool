/**
 * PERN Setup Tool - Nginx Manager
 * Handles Nginx installation, configuration, and site management
 */

const inquirer = require('inquirer');
const { exec } = require('child-process-promise');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const ProjectDiscovery = require('../utils/project-discovery');

/**
 * Nginx Manager Class
 * Manages Nginx installation, configuration, and site management
 */
class NginxManager {
  constructor(setupTool) {
    this.setup = setupTool;
    this.logger = setupTool.logger;
    this.safety = setupTool.safety;
    this.config = setupTool.config;
    this.platform = process.platform;
    this.projectDiscovery = new ProjectDiscovery();
  }

  /**
   * Show Nginx interface
   */
  async showInterface() {
    try {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Nginx Section',
          loop: false,
        choices: [
            '1. Download Nginx',
            '2. Setup Nginx',
            '3. Manage Sites',
            '4. Go back'
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
          await this.manageSites();
          break;
        case 4:
          return this.setup.showMainInterface();
      }

    } catch (error) {
      await this.setup.handleError('nginx-interface', error);
    }
  }

  /**
   * Download Nginx
   */
  async download() {
    try {
      await this.setup.safety.safeExecute('nginx-download', {
        platform: this.platform
      }, async () => {
        console.log('🔧 Installing Nginx...');
        console.log('📝 This may take a few minutes depending on your internet connection');
        console.log('📝 You may be prompted for sudo password to install Nginx');
        
        if (this.platform === 'linux') {
          console.log('🐧 Installing Nginx on Linux...');
          const ora = require('ora');
          const updateSpinner = ora('📦 Updating package lists...').start();
          console.log('⏳ This may take 1-3 minutes...');
          await exec('sudo apt update');
          updateSpinner.succeed('✅ Package lists updated');
          
          const installSpinner = ora('📦 Installing Nginx...').start();
          console.log('⏳ This may take 2-5 minutes...');
          await exec('sudo apt install -y nginx');
          installSpinner.succeed('✅ Nginx installation completed');
        } else if (this.platform === 'darwin') {
          console.log('🍎 Installing Nginx on macOS...');
          const ora = require('ora');
          const installSpinner = ora('📦 Installing Nginx using Homebrew...').start();
          console.log('⏳ This may take 3-7 minutes...');
          await exec('brew install nginx');
          installSpinner.succeed('✅ Nginx installation completed');
        } else if (this.platform === 'win32') {
          console.log('📥 Nginx alternatives for Windows:');
          console.log('   1. Use IIS (Internet Information Services)');
          console.log('   2. Use Express built-in static file serving');
          console.log('   3. Use Docker: docker run -d -p 80:80 nginx');
          return {
            success: true,
            platform: this.platform,
            message: 'Windows alternatives provided',
            timestamp: new Date().toISOString()
          };
        }

        this.setup.state.completedComponents.add('nginx');
        console.log('✅ Nginx downloaded successfully');
        
        return {
          success: true,
          platform: this.platform,
          timestamp: new Date().toISOString()
        };
      });

    } catch (error) {
      await this.setup.handleError('nginx-download', error);
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
          message: 'Setup Nginx Interface',
          loop: false,
        choices: [
            '1. Basic reverse proxy setup',
            '2. Load balancer setup',
            '3. SSL/TLS configuration',
            '4. Custom configuration',
            '5. Go back'
          ]
        }
      ]);

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.setupReverseProxy();
          break;
        case 2:
          await this.setupLoadBalancer();
          break;
        case 3:
          await this.setupSSL();
          break;
        case 4:
          await this.setupCustom();
          break;
        case 5:
          return this.showInterface();
      }

    } catch (error) {
      await this.setup.handleError('nginx-setup-interface', error);
    }
  }

  /**
   * Setup basic reverse proxy
   */
  async setupReverseProxy() {
    try {
      // Let user select project for Nginx configuration
      const projectDir = await this.projectDiscovery.selectProject('Select project for Nginx reverse proxy setup:');
      
      if (projectDir === 'GO_BACK') {
        return this.showInterface();
      }
      
      console.log(`📁 Selected project: ${projectDir}`);

      const { domain } = await inquirer.prompt({
        type: 'input',
        name: 'domain',
        message: 'Enter domain/subdomain:',
        default: 'localhost'
      });

      const { frontendPort } = await inquirer.prompt({
        type: 'number',
        name: 'frontendPort',
        message: 'Frontend port:',
        default: 3000
      });

      const { backendPort } = await inquirer.prompt({
        type: 'number',
        name: 'backendPort',
        message: 'Backend port:',
        default: 5000
      });

      await this.setup.safety.safeExecute('nginx-reverse-proxy', {
        domain,
        frontendPort,
        backendPort
      }, async () => {
        console.log('🔧 Configuring Nginx reverse proxy...');
        console.log('📝 You may be prompted for sudo password to update Nginx configuration');
        
        const nginxConfig = this.generateReverseProxyConfig(domain, frontendPort, backendPort);

        const configPath = '/etc/nginx/sites-available/pern-app';
        console.log('📝 Writing Nginx configuration...');
        await exec(`echo '${nginxConfig}' | sudo tee ${configPath} > /dev/null`);

        // Enable site
        console.log('🔗 Enabling Nginx site...');
        await exec('sudo ln -sf /etc/nginx/sites-available/pern-app /etc/nginx/sites-enabled/');
        
        console.log('🧪 Testing Nginx configuration...');
        await exec('sudo nginx -t');
        
        console.log('🔄 Reloading Nginx...');
        await exec('sudo systemctl reload nginx');

        // Update configuration
        this.config.set('nginx.domain', domain);
        this.config.set('nginx.frontendPort', frontendPort);
        this.config.set('nginx.backendPort', backendPort);
        this.config.set('nginx.type', 'reverse-proxy');

        this.setup.state.completedComponents.add('nginx');
        console.log('✅ Nginx reverse proxy configured');
        
        return {
          success: true,
          domain,
          frontendPort,
          backendPort,
          configPath,
          timestamp: new Date().toISOString()
        };
      });

    } catch (error) {
      await this.setup.handleError('nginx-reverse-proxy-setup', error);
    }

    await this.setupInterface();
  }

  /**
   * Setup load balancer
   */
  async setupLoadBalancer() {
    try {
      const { domain } = await inquirer.prompt({
        type: 'input',
        name: 'domain',
        message: 'Enter domain/subdomain:',
        default: 'localhost'
      });

      const { backendServers } = await inquirer.prompt({
        type: 'input',
        name: 'backendServers',
        message: 'Enter backend servers (comma-separated):',
        default: 'localhost:5001,localhost:5002,localhost:5003'
      });

      const servers = backendServers.split(',').map(server => server.trim());
      const backendPorts = servers.map(server => {
        const port = server.split(':')[1] || '80';
        return parseInt(port);
      });

      await this.setup.safety.safeExecute('nginx-load-balancer', {
        domain,
        backendPorts
      }, async () => {
        const nginxConfig = this.generateLoadBalancerConfig(domain, servers);

        const configPath = '/etc/nginx/sites-available/pern-app';
        await exec(`echo '${nginxConfig}' | sudo tee ${configPath} > /dev/null`);

        // Enable site
        await exec('sudo ln -sf /etc/nginx/sites-available/pern-app /etc/nginx/sites-enabled/');
        await exec('sudo nginx -t');
        await exec('sudo systemctl reload nginx');

        // Update configuration
        this.config.set('nginx.domain', domain);
        this.config.set('nginx.backendServers', servers);
        this.config.set('nginx.type', 'load-balancer');

        this.setup.state.completedComponents.add('nginx');
        console.log('✅ Nginx load balancer configured');
        
        return {
          success: true,
          domain,
          backendServers: servers,
          backendPorts,
          configPath,
          timestamp: new Date().toISOString()
        };
      });

    } catch (error) {
      await this.setup.handleError('nginx-load-balancer-setup', error);
    }

    await this.setupInterface();
  }

  /**
   * Setup SSL/TLS configuration
   */
  async setupSSL() {
    try {
      const { domain } = await inquirer.prompt({
        type: 'input',
        name: 'domain',
        message: 'Enter domain name:',
        validate: input => input.length > 0 || 'Domain name is required'
      });

      const { sslChoice } = await inquirer.prompt({
        type: 'list',
        name: 'sslChoice',
        message: 'SSL configuration method:',
        loop: false,
        choices: [
          '1. Use Let\'s Encrypt (certbot)',
          '2. Use existing certificates',
          '3. Generate self-signed certificate'
        ]
      });

      const selected = parseInt(sslChoice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.setupLetsEncrypt(domain);
          break;
        case 2:
          await this.setupExistingCertificate(domain);
          break;
        case 3:
          await this.setupSelfSignedCertificate(domain);
          break;
      }

    } catch (error) {
      await this.setup.handleError('nginx-ssl-setup', error);
    }

    await this.setupInterface();
  }

  /**
   * Setup Let's Encrypt SSL
   */
  async setupLetsEncrypt(domain) {
    try {
      const { email } = await inquirer.prompt({
        type: 'input',
        name: 'email',
        message: 'Enter email address for Let\'s Encrypt:',
        validate: (input) => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(input) || 'Please enter a valid email address';
        }
      });

      await this.setup.safety.safeExecute('nginx-letsencrypt', { domain, email }, async () => {
        console.log('🔧 Setting up Let\'s Encrypt SSL certificate...');
        console.log('📝 This may take a few minutes to install certbot and generate certificate');
        
        const ora = require('ora');
        
        // Install certbot
        const installSpinner = ora('📦 Installing certbot and python3-certbot-nginx...').start();
        console.log('⏳ This may take 2-5 minutes...');
        await exec('sudo apt install -y certbot python3-certbot-nginx');
        installSpinner.succeed('✅ Certbot installation completed');

        // Generate SSL certificate
        const certSpinner = ora('🔐 Generating SSL certificate with Let\'s Encrypt...').start();
        console.log('⏳ This may take 1-3 minutes...');
        console.log('📝 You may be prompted for domain verification');
        await exec(`sudo certbot --nginx -d ${domain} --email ${email} --agree-tos --non-interactive`);
        certSpinner.succeed('✅ SSL certificate generated successfully');

        console.log('✅ Let\'s Encrypt SSL certificate configured');
        
        return {
          success: true,
          domain,
          email,
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('nginx-letsencrypt-setup', error);
    }
  }

  /**
   * Setup existing certificate
   */
  async setupExistingCertificate(domain) {
    try {
      const { certPath } = await inquirer.prompt({
        type: 'input',
        name: 'certPath',
        message: 'Certificate file path:',
        default: '/etc/ssl/certs/cert.pem'
      });

      const { keyPath } = await inquirer.prompt({
        type: 'input',
        name: 'keyPath',
        message: 'Private key file path:',
        default: '/etc/ssl/private/key.pem'
      });

      await this.setup.safety.safeExecute('nginx-existing-cert', {
        domain,
        certPath,
        keyPath
      }, async () => {
        console.log('🔧 Configuring existing SSL certificate...');
        console.log('📝 Setting up SSL with existing certificate files');
        
        const ora = require('ora');
        
        // Generate and write Nginx configuration
        const configSpinner = ora('📝 Generating Nginx SSL configuration...').start();
        const nginxConfig = this.generateSSLConfig(domain, certPath, keyPath);

        const configPath = '/etc/nginx/sites-available/pern-app';
        await exec(`echo '${nginxConfig}' | sudo tee ${configPath} > /dev/null`);
        configSpinner.succeed('✅ Nginx SSL configuration written');

        // Test and reload Nginx
        const testSpinner = ora('🧪 Testing Nginx configuration...').start();
        await exec('sudo nginx -t');
        testSpinner.succeed('✅ Nginx configuration test passed');
        
        const reloadSpinner = ora('🔄 Reloading Nginx...').start();
        await exec('sudo systemctl reload nginx');
        reloadSpinner.succeed('✅ Nginx reloaded successfully');

        console.log('✅ Existing SSL certificate configured');
        
        return {
          success: true,
          domain,
          certPath,
          keyPath,
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('nginx-existing-cert-setup', error);
    }
  }

  /**
   * Setup self-signed certificate
   */
  async setupSelfSignedCertificate(domain) {
    try {
      await this.setup.safety.safeExecute('nginx-self-signed', { domain }, async () => {
        console.log('🔧 Setting up self-signed SSL certificate...');
        console.log('📝 Generating self-signed certificate for development/testing');
        
        const ora = require('ora');
        
        // Generate self-signed certificate
        const certSpinner = ora('🔐 Generating self-signed SSL certificate...').start();
        console.log('⏳ This may take 10-30 seconds...');
        await exec(`sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \\
          -keyout /etc/ssl/private/nginx-selfsigned.key \\
          -out /etc/ssl/certs/nginx-selfsigned.crt \\
          -subj "/C=US/ST=State/L=City/O=Organization/CN=${domain}"`);
        certSpinner.succeed('✅ Self-signed certificate generated');

        // Generate and write Nginx configuration
        const configSpinner = ora('📝 Generating Nginx SSL configuration...').start();
        const nginxConfig = this.generateSSLConfig(domain,
          '/etc/ssl/certs/nginx-selfsigned.crt',
          '/etc/ssl/private/nginx-selfsigned.key');

        const configPath = '/etc/nginx/sites-available/pern-app';
        await exec(`echo '${nginxConfig}' | sudo tee ${configPath} > /dev/null`);
        configSpinner.succeed('✅ Nginx SSL configuration written');

        // Test and reload Nginx
        const testSpinner = ora('🧪 Testing Nginx configuration...').start();
        await exec('sudo nginx -t');
        testSpinner.succeed('✅ Nginx configuration test passed');
        
        const reloadSpinner = ora('🔄 Reloading Nginx...').start();
        await exec('sudo systemctl reload nginx');
        reloadSpinner.succeed('✅ Nginx reloaded successfully');

        console.log('✅ Self-signed SSL certificate configured');
        
        return {
          success: true,
          domain,
          certPath: '/etc/ssl/certs/nginx-selfsigned.crt',
          keyPath: '/etc/ssl/private/nginx-selfsigned.key',
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('nginx-self-signed-setup', error);
    }
  }

  /**
   * Setup custom configuration
   */
  async setupCustom() {
    try {
      const { configType } = await inquirer.prompt({
        type: 'list',
        name: 'configType',
        message: 'Configuration type:',
        loop: false,
        choices: [
          '1. Single server proxy',
          '2. Load balanced servers',
          '3. Static file serving',
          '4. WebSocket support',
          '5. Full configuration (all features)'
        ]
      });

      const selected = parseInt(configType.split('.')[0]);

      switch(selected) {
        case 1:
          await this.setupSingleServerProxy();
          break;
        case 2:
          await this.setupLoadBalancedServers();
          break;
        case 3:
          await this.setupStaticFileServing();
          break;
        case 4:
          await this.setupWebSocketSupport();
          break;
        case 5:
          await this.setupFullConfiguration();
          break;
      }

    } catch (error) {
      await this.setup.handleError('nginx-custom-setup', error);
    }
  }

  /**
   * Setup single server proxy
   */
  async setupSingleServerProxy() {
    try {
      const { domain } = await inquirer.prompt({
        type: 'input',
        name: 'domain',
        message: 'Enter domain/subdomain:',
        default: 'localhost'
      });

      const { backendServer } = await inquirer.prompt({
        type: 'input',
        name: 'backendServer',
        message: 'Backend server (host:port):',
        default: 'localhost:5000'
      });

      const backendPort = parseInt(backendServer.split(':')[1] || '80');

      await this.setup.safety.safeExecute('nginx-single-proxy', {
        domain,
        backendPort
      }, async () => {
        const nginxConfig = this.generateSingleProxyConfig(domain, backendServer);

        const configPath = '/etc/nginx/sites-available/pern-app';
        await exec(`echo '${nginxConfig}' | sudo tee ${configPath} > /dev/null`);

        await exec('sudo ln -sf /etc/nginx/sites-available/pern-app /etc/nginx/sites-enabled/');
        await exec('sudo nginx -t');
        await exec('sudo systemctl reload nginx');

        console.log('✅ Single server proxy configured');
        
        return {
          success: true,
          domain,
          backendServer,
          backendPort,
          configPath,
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('nginx-single-proxy-setup', error);
    }
    
    await this.setupInterface();
  }

  /**
   * Setup load balanced servers
   */
  async setupLoadBalancedServers() {
    try {
      const { domain } = await inquirer.prompt({
        type: 'input',
        name: 'domain',
        message: 'Enter domain/subdomain:',
        default: 'localhost'
      });

      const { backendServers } = await inquirer.prompt({
        type: 'input',
        name: 'backendServers',
        message: 'Backend servers (comma-separated):',
        default: 'localhost:5001,localhost:5002,localhost:5003'
      });

      const servers = backendServers.split(',').map(server => server.trim());
      const backendPorts = servers.map(server => {
        const port = server.split(':')[1] || '80';
        return parseInt(port);
      });

      await this.setup.safety.safeExecute('nginx-load-balanced', {
        domain,
        backendPorts
      }, async () => {
        const nginxConfig = this.generateLoadBalancedConfig(domain, servers);

        const configPath = '/etc/nginx/sites-available/pern-app';
        await exec(`echo '${nginxConfig}' | sudo tee ${configPath} > /dev/null`);

        await exec('sudo ln -sf /etc/nginx/sites-available/pern-app /etc/nginx/sites-enabled/');
        await exec('sudo nginx -t');
        await exec('sudo systemctl reload nginx');

        console.log('✅ Load balanced servers configured');
        
        return {
          success: true,
          domain,
          backendServers: servers,
          backendPorts,
          configPath,
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('nginx-load-balanced-setup', error);
    }
    
    await this.setupInterface();
  }

  /**
   * Setup static file serving
   */
  async setupStaticFileServing() {
    try {
      const { domain } = await inquirer.prompt({
        type: 'input',
        name: 'domain',
        message: 'Enter domain/subdomain:',
        default: 'localhost'
      });

      const { rootPath } = await inquirer.prompt({
        type: 'input',
        name: 'rootPath',
        message: 'Static files root path:',
        default: '/var/www/html'
      });

      await this.setup.safety.safeExecute('nginx-static-files', {
        domain,
        rootPath
      }, async () => {
        const nginxConfig = this.generateStaticFileConfig(domain, rootPath);

        const configPath = '/etc/nginx/sites-available/pern-app';
        await exec(`echo '${nginxConfig}' | sudo tee ${configPath} > /dev/null`);

        await exec('sudo ln -sf /etc/nginx/sites-available/pern-app /etc/nginx/sites-enabled/');
        await exec('sudo nginx -t');
        await exec('sudo systemctl reload nginx');

        console.log('✅ Static file serving configured');
      });
    } catch (error) {
      await this.setup.handleError('nginx-static-files-setup', error);
    }
    
    await this.setupInterface();
  }

  /**
   * Setup WebSocket support
   */
  async setupWebSocketSupport() {
    try {
      const { domain } = await inquirer.prompt({
        type: 'input',
        name: 'domain',
        message: 'Enter domain/subdomain:',
        default: 'localhost'
      });

      const { backendServer } = await inquirer.prompt({
        type: 'input',
        name: 'backendServer',
        message: 'WebSocket backend server:',
        default: 'localhost:5000'
      });

      await this.setup.safety.safeExecute('nginx-websocket', {
        domain,
        backendServer
      }, async () => {
        const nginxConfig = this.generateWebSocketConfig(domain, backendServer);

        const configPath = '/etc/nginx/sites-available/pern-app';
        await exec(`echo '${nginxConfig}' | sudo tee ${configPath} > /dev/null`);

        await exec('sudo ln -sf /etc/nginx/sites-available/pern-app /etc/nginx/sites-enabled/');
        await exec('sudo nginx -t');
        await exec('sudo systemctl reload nginx');

        console.log('✅ WebSocket support configured');
      });
    } catch (error) {
      await this.setup.handleError('nginx-websocket-setup', error);
    }
    
    await this.setupInterface();
  }

  /**
   * Setup full configuration
   */
  async setupFullConfiguration() {
    try {
      console.log('🔧 Setting up full Nginx configuration...');

      const { domain } = await inquirer.prompt({
        type: 'input',
        name: 'domain',
        message: 'Enter domain/subdomain:',
        default: 'localhost'
      });

      await this.setup.safety.safeExecute('nginx-full-config', { domain }, async () => {
        const nginxConfig = this.generateFullConfig(domain);

        const configPath = '/etc/nginx/sites-available/pern-app';
        await exec(`echo '${nginxConfig}' | sudo tee ${configPath} > /dev/null`);

        await exec('sudo ln -sf /etc/nginx/sites-available/pern-app /etc/nginx/sites-enabled/');
        await exec('sudo nginx -t');
        await exec('sudo systemctl reload nginx');

        console.log('✅ Full Nginx configuration applied');
        
        return {
          success: true,
          domain: domain,
          configPath: configPath,
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('nginx-full-config-setup', error);
    }
    
    await this.setupInterface();
  }

  /**
   * Manage sites
   */
  async manageSites() {
    try {
      const { choice } = await inquirer.prompt([
        {
          type: 'list',
          name: 'choice',
          message: 'Nginx Site Management',
          loop: false,
        choices: [
            '1. List sites',
            '2. Enable site',
            '3. Disable site',
            '4. Delete site',
            '5. Test configuration',
            '6. Reload Nginx',
            '7. Go back'
          ]
        }
      ]);

      const selected = parseInt(choice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.listSites();
          break;
        case 2:
          await this.enableSite();
          break;
        case 3:
          await this.disableSite();
          break;
        case 4:
          await this.deleteSite();
          break;
        case 5:
          await this.testConfiguration();
          break;
        case 6:
          await this.reloadNginx();
          break;
        case 7:
          return this.showInterface();
      }

    } catch (error) {
      await this.setup.handleError('nginx-site-management', error);
    }
  }

  /**
   * List sites
   */
  async listSites() {
    try {
      await this.setup.safety.safeExecute('nginx-list-sites', {}, async () => {
        console.log('\n📋 Nginx Sites:');
        console.log('Available sites:');
        const { stdout: available } = await exec('ls /etc/nginx/sites-available/');
        console.log(available);

        console.log('\nEnabled sites:');
        const { stdout: enabled } = await exec('ls /etc/nginx/sites-enabled/');
        console.log(enabled);
        
        return {
          success: true,
          available: available.trim().split('\n'),
          enabled: enabled.trim().split('\n'),
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('nginx-list-sites', error);
    }

    await this.manageSites();
  }

  /**
   * Enable site
   */
  async enableSite() {
    try {
      const { siteName } = await inquirer.prompt({
        type: 'input',
        name: 'siteName',
        message: 'Enter site name to enable:',
        validate: input => input.length > 0 || 'Site name is required'
      });

      await this.setup.safety.safeExecute('nginx-enable-site', { siteName }, async () => {
        await exec(`sudo ln -sf /etc/nginx/sites-available/${siteName} /etc/nginx/sites-enabled/`);
        await exec('sudo nginx -t');
        await exec('sudo systemctl reload nginx');

        console.log(`✅ Site enabled: ${siteName}`);
        
        return {
          success: true,
          siteName,
          action: 'enabled',
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('nginx-enable-site', error);
    }

    await this.manageSites();
  }

  /**
   * Disable site
   */
  async disableSite() {
    try {
      const { siteName } = await inquirer.prompt({
        type: 'input',
        name: 'siteName',
        message: 'Enter site name to disable:',
        validate: input => input.length > 0 || 'Site name is required'
      });

      await this.setup.safety.safeExecute('nginx-disable-site', { siteName }, async () => {
        await exec(`sudo rm /etc/nginx/sites-enabled/${siteName}`);
        await exec('sudo nginx -t');
        await exec('sudo systemctl reload nginx');

        console.log(`✅ Site disabled: ${siteName}`);
        
        return {
          success: true,
          siteName,
          action: 'disabled',
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('nginx-disable-site', error);
    }

    await this.manageSites();
  }

  /**
   * Delete site
   */
  async deleteSite() {
    try {
      const { siteName } = await inquirer.prompt({
        type: 'input',
        name: 'siteName',
        message: 'Enter site name to delete:',
        validate: input => input.length > 0 || 'Site name is required'
      });

      await this.setup.safety.safeExecute('nginx-delete-site', { siteName }, async () => {
        await exec(`sudo rm /etc/nginx/sites-available/${siteName}`);
        await exec(`sudo rm /etc/nginx/sites-enabled/${siteName}`);

        console.log(`✅ Site deleted: ${siteName}`);
        
        return {
          success: true,
          siteName,
          action: 'deleted',
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('nginx-delete-site', error);
    }

    await this.manageSites();
  }

  /**
   * Test configuration
   */
  async testConfiguration() {
    try {
      await this.setup.safety.safeExecute('nginx-test-config', {}, async () => {
        const { stdout } = await exec('sudo nginx -t');
        console.log('✅ Nginx configuration test:');
        console.log(stdout);
        
        return {
          success: true,
          action: 'test-config',
          output: stdout,
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      console.error('❌ Nginx configuration test failed:', error.message);
    }

    await this.manageSites();
  }

  /**
   * Reload Nginx
   */
  async reloadNginx() {
    try {
      await this.setup.safety.safeExecute('nginx-reload', {}, async () => {
        await exec('sudo nginx -s reload');
        console.log('✅ Nginx reloaded successfully');
        
        return {
          success: true,
          action: 'reload',
          timestamp: new Date().toISOString()
        };
      });
    } catch (error) {
      await this.setup.handleError('nginx-reload', error);
    }

    await this.manageSites();
  }

  /**
   * Start Nginx service
   */
  async start() {
    try {
      if (this.platform === 'linux') {
        await exec('sudo systemctl start nginx');
      } else if (this.platform === 'darwin') {
        await exec('brew services start nginx');
      }

      console.log('✅ Nginx service started');
    } catch (error) {
      console.error('❌ Failed to start Nginx:', error.message);
      throw error;
    }
  }

  /**
   * Stop Nginx service
   */
  async stop() {
    try {
      if (this.platform === 'linux') {
        await exec('sudo systemctl stop nginx');
      } else if (this.platform === 'darwin') {
        await exec('brew services stop nginx');
      }

      console.log('✅ Nginx service stopped');
    } catch (error) {
      console.error('❌ Failed to stop Nginx:', error.message);
      throw error;
    }
  }

  /**
   * Check Nginx status
   */
  async getStatus() {
    try {
      if (this.platform === 'linux') {
        const { stdout } = await exec('sudo systemctl status nginx --no-pager -l');
        return stdout.includes('Active: active') ? 'running' : 'stopped';
      } else if (this.platform === 'darwin') {
        const { stdout } = await exec('brew services list | grep nginx');
        return stdout.includes('started') ? 'running' : 'stopped';
      }

      return 'unknown';
    } catch (error) {
      return 'error';
    }
  }

  /**
   * Generate reverse proxy configuration
   */
  generateReverseProxyConfig(domain, frontendPort, backendPort) {
    return `server {
    listen 80;
    server_name ${domain};

    # Frontend
    location / {
        proxy_pass http://localhost:${frontendPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:${backendPort};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
}
`;
  }

  /**
   * Generate load balancer configuration
   */
  generateLoadBalancerConfig(domain, servers) {
    const upstreamServers = servers.map((server, index) =>
      `    server ${server} weight=1 max_fails=3 fail_timeout=30s;`
    ).join('\n');

    return `upstream backend {
${upstreamServers}
}

server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Load balancing
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\\n";
        add_header Content-Type text/plain;
    }
}
`;
  }

  /**
   * Generate SSL configuration
   */
  generateSSLConfig(domain, certPath, keyPath) {
    return `server {
    listen 443 ssl http2;
    server_name ${domain};

    ssl_certificate ${certPath};
    ssl_certificate_key ${keyPath};
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;

    # Modern configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS (uncomment if using HTTPS only)
    # add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name ${domain};
    return 301 https://$server_name$request_uri;
}
`;
  }

  /**
   * Generate single proxy configuration
   */
  generateSingleProxyConfig(domain, backendServer) {
    return `server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://${backendServer};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
`;
  }

  /**
   * Generate load balanced configuration
   */
  generateLoadBalancedConfig(domain, servers) {
    const upstreamServers = servers.map(server =>
      `    server ${server} weight=1 max_fails=3 fail_timeout=30s;`
    ).join('\n');

    return `upstream backend {
${upstreamServers}
}

server {
    listen 80;
    server_name ${domain};

    location / {
        proxy_pass http://backend;
        proxy_next_upstream error timeout invalid_header http_500 http_502 http_503 http_504;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}
`;
  }

  /**
   * Generate static file configuration
   */
  generateStaticFileConfig(domain, rootPath) {
    return `server {
    listen 80;
    server_name ${domain};
    root ${rootPath};
    index index.html index.htm;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
`;
  }

  /**
   * Generate WebSocket configuration
   */
  generateWebSocketConfig(domain, backendServer) {
    return `server {
    listen 80;
    server_name ${domain};

    # WebSocket proxy
    location /ws {
        proxy_pass http://${backendServer};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # HTTP proxy
    location / {
        proxy_pass http://${backendServer};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
`;
  }

  /**
   * Generate full configuration
   */
  generateFullConfig(domain) {
    return `server {
    listen 80;
    server_name ${domain};

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Static files
    location /static/ {
        proxy_pass http://localhost:5000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
}
`;
  }
}

module.exports = NginxManager;