/**
 * PERN Setup Tool - Plugin Manager
 * Extensible plugin system with lifecycle management and marketplace integration
 */

const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const semver = require('semver');

/**
 * Plugin Manager Class
 * Handles plugin lifecycle, dependencies, and marketplace integration
 */
class PluginManager {
  constructor(setupTool) {
    this.setup = setupTool;
    this.logger = setupTool.logger;
    this.safety = setupTool.safety;
    this.config = setupTool.config;
    this.plugins = new Map();
    this.hooks = new Map();
    this.pluginDir = path.join(__dirname, '..', '..', 'plugins');
    this.marketplace = new PluginMarketplace();
    this.dependencies = new Map();
    this.versions = new Map();
  }

  /**
   * Show plugin interface
   */
  async showInterface() {
    try {
      const { pluginChoice } = await inquirer.prompt({
        type: 'list',
        name: 'pluginChoice',
        message: 'Plugin Management:',
        loop: false,
        choices: [
          '1. List installed plugins',
          '2. Install new plugin',
          '3. Update plugins',
          '4. Remove plugin',
          '5. Browse plugin marketplace',
          '6. Create custom plugin',
          new inquirer.Separator('──────────────'),
          '7. Go back'
        ]
      });

      const selected = parseInt(pluginChoice.split('.')[0]);

      switch(selected) {
        case 1:
          await this.listInstalledPlugins();
          break;
        case 2:
          await this.installNewPlugin();
          break;
        case 3:
          await this.updatePlugins();
          break;
        case 4:
          await this.removePlugin();
          break;
        case 5:
          await this.browsePluginMarketplace();
          break;
        case 6:
          await this.createCustomPlugin();
          break;
        case 7:
          return this.setup.showAdvancedFeaturesInterface();
      }

    } catch (error) {
      await this.setup.handleError('plugin-interface', error);
    }
  }

  /**
   * Initialize plugin system
   */
  async initialize() {
    try {
      await fs.ensureDir(this.pluginDir);
      await this.loadPlugins();
      await this.resolveDependencies();

      this.logger.info(`Plugin system initialized with ${this.plugins.size} plugins`);
    } catch (error) {
      this.logger.error('Plugin system initialization failed', error);
      throw error;
    }
  }

  /**
   * Load installed plugins
   */
  async loadPlugins() {
    try {
      const pluginDirs = await fs.readdir(this.pluginDir);

      for (const dir of pluginDirs) {
        const pluginPath = path.join(this.pluginDir, dir);
        const pluginConfig = await this.loadPluginConfig(pluginPath);

        if (pluginConfig && pluginConfig.enabled !== false) {
          await this.loadPlugin(pluginPath, pluginConfig);
        }
      }

      this.logger.info(`Loaded ${this.plugins.size} plugins`);
    } catch (error) {
      this.logger.error('Plugin loading failed', error);
    }
  }

  /**
   * Load plugin configuration
   */
  async loadPluginConfig(pluginPath) {
    try {
      const configPath = path.join(pluginPath, 'plugin.json');
      const configData = await fs.readFile(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      return null;
    }
  }

  /**
   * Load individual plugin
   */
  async loadPlugin(pluginPath, config) {
    try {
      const plugin = require(pluginPath);
      const pluginInfo = {
        instance: plugin,
        config: config,
        path: pluginPath,
        loaded: new Date().toISOString()
      };

      this.plugins.set(config.name, pluginInfo);

      // Register hooks
      if (plugin.hooks) {
        await this.registerPluginHooks(config.name, plugin.hooks);
      }

      // Track dependencies
      if (config.dependencies) {
        this.dependencies.set(config.name, config.dependencies);
      }

      // Track version
      this.versions.set(config.name, config.version);

      this.logger.info(`Plugin loaded: ${config.name} v${config.version}`);
    } catch (error) {
      this.logger.error(`Failed to load plugin ${config.name}:`, error);
    }
  }

  /**
   * Register plugin hooks
   */
  async registerPluginHooks(pluginName, hooks) {
    for (const [hookName, hookFunction] of Object.entries(hooks)) {
      if (!this.hooks.has(hookName)) {
        this.hooks.set(hookName, []);
      }

      const wrappedHook = async (...args) => {
        try {
          return await hookFunction.apply(this.plugins.get(pluginName).instance, args);
        } catch (error) {
          this.logger.error(`Hook ${hookName} failed for plugin ${pluginName}:`, error);
          throw error;
        }
      };

      this.hooks.get(hookName).push({
        plugin: pluginName,
        handler: wrappedHook
      });
    }
  }

  /**
   * Execute plugin hooks
   */
  async executeHook(hookName, ...args) {
    const hooks = this.hooks.get(hookName) || [];

    for (const hook of hooks) {
      try {
        await hook.handler(...args);
      } catch (error) {
        this.logger.error(`Hook execution failed: ${hookName}`, error);
        // Continue with other hooks even if one fails
      }
    }
  }

  /**
   * List installed plugins
   */
  async listInstalledPlugins() {
    try {
      const plugins = Array.from(this.plugins.entries()).map(([name, plugin]) => ({
        name,
        version: plugin.config.version,
        description: plugin.config.description,
        enabled: plugin.config.enabled !== false,
        dependencies: plugin.config.dependencies || [],
        hooks: Object.keys(plugin.instance.hooks || {})
      }));

      console.log('\n📦 Installed Plugins:');
      console.table(plugins);

      if (plugins.length === 0) {
        console.log('ℹ️  No plugins installed');
        console.log('💡 Use "Install new plugin" to add plugins');
      }

    } catch (error) {
      await this.setup.handleError('list-plugins', error);
    }

    await this.showInterface();
  }

  /**
   * Install new plugin
   */
  async installNewPlugin() {
    try {
      const availablePlugins = await this.marketplace.getAvailablePlugins();
      const choices = availablePlugins.map(p => `${p.name} - ${p.description} (${p.version})`);

      const { pluginChoice } = await inquirer.prompt({
        type: 'list',
        name: 'pluginChoice',
        message: 'Select plugin to install:',
        loop: false,
        choices: [...choices, 'Enter plugin name manually', new inquirer.Separator('──────────────'), 'Go back']
      });

      if (pluginChoice === 'Go back') {
        return this.showInterface();
      }

      let pluginName;
      if (pluginChoice === 'Enter plugin name manually') {
        const { manualName } = await inquirer.prompt({
          type: 'input',
          name: 'manualName',
          message: 'Enter plugin name:',
          validate: input => input.length > 0 || 'Plugin name is required'
        });
        pluginName = manualName;
      } else {
        pluginName = pluginChoice.split(' - ')[0];
      }

      const { version } = await inquirer.prompt({
        type: 'input',
        name: 'version',
        message: 'Enter version (or leave empty for latest):',
        default: 'latest'
      });

      await this.installPlugin(pluginName, version);
      console.log(`✅ Plugin installed: ${pluginName}`);

    } catch (error) {
      await this.setup.handleError('install-plugin', error);
    }

    await this.showInterface();
  }

  /**
   * Install plugin with dependency resolution
   */
  async installPlugin(pluginId, version) {
    try {
      // Check if already installed
      if (this.plugins.has(pluginId)) {
        const currentVersion = this.versions.get(pluginId);
        if (version === 'latest' || semver.gte(currentVersion, version)) {
          console.log(`ℹ️  Plugin ${pluginId} already installed (v${currentVersion})`);
          return;
        }
      }

      // Get plugin info from marketplace
      const pluginInfo = await this.marketplace.getPluginInfo(pluginId, version);
      if (!pluginInfo) {
        throw new Error(`Plugin not found: ${pluginId}`);
      }

      // Check and install dependencies first
      if (pluginInfo.dependencies) {
        for (const dep of pluginInfo.dependencies) {
          await this.installPlugin(dep.name, dep.version);
        }
      }

      // Download and install plugin
      const pluginPackage = await this.marketplace.download(pluginId, version);
      await this.extractPlugin(pluginPackage);
      await this.loadPlugin(pluginPackage.path, pluginInfo);

      // Update tracking
      this.versions.set(pluginId, pluginInfo.version);

      console.log(`✅ Plugin installed successfully: ${pluginId} v${pluginInfo.version}`);

    } catch (error) {
      this.logger.error(`Plugin installation failed: ${pluginId}`, error);
      throw error;
    }
  }

  /**
   * Extract plugin package
   */
  async extractPlugin(pluginPackage) {
    try {
      const pluginPath = path.join(this.pluginDir, pluginPackage.name);
      await fs.ensureDir(pluginPath);

      // Extract plugin files
      if (pluginPackage.files) {
        for (const file of pluginPackage.files) {
          const filePath = path.join(pluginPath, file.name);
          await fs.writeFile(filePath, file.content);
        }
      }

      console.log(`📦 Plugin extracted: ${pluginPath}`);
    } catch (error) {
      this.logger.error('Plugin extraction failed', error);
      throw error;
    }
  }

  /**
   * Update all plugins
   */
  async updatePlugins() {
    try {
      const plugins = Array.from(this.plugins.keys());
      const updates = [];

      for (const pluginName of plugins) {
        const update = await this.updatePlugin(pluginName);
        if (update.updated) {
          updates.push(update);
        }
      }

      if (updates.length === 0) {
        console.log('✅ All plugins are up to date');
      } else {
        console.log(`✅ Updated ${updates.length} plugins:`);
        updates.forEach(update => {
          console.log(`   • ${update.name}: ${update.oldVersion} → ${update.newVersion}`);
        });
      }

    } catch (error) {
      await this.setup.handleError('update-plugins', error);
    }

    await this.showInterface();
  }

  /**
   * Update specific plugin
   */
  async updatePlugin(pluginId) {
    try {
      const currentVersion = this.versions.get(pluginId);
      const latestVersion = await this.marketplace.getLatestVersion(pluginId);

      if (semver.gt(latestVersion, currentVersion)) {
        console.log(`🔄 Updating ${pluginId}: ${currentVersion} → ${latestVersion}`);

        // Remove old version
        await this.removePlugin(pluginId, false);

        // Install new version
        await this.installPlugin(pluginId, latestVersion);

        return {
          name: pluginId,
          oldVersion: currentVersion,
          newVersion: latestVersion,
          updated: true
        };
      }

      return {
        name: pluginId,
        version: currentVersion,
        updated: false
      };

    } catch (error) {
      this.logger.error(`Plugin update failed: ${pluginId}`, error);
      throw error;
    }
  }

  /**
   * Remove plugin
   */
  async removePlugin(pluginId = null, confirmation = true) {
    try {
      let pluginToRemove = pluginId;

      if (!pluginToRemove) {
        const plugins = Array.from(this.plugins.keys());
        const { choice } = await inquirer.prompt({
          type: 'list',
          name: 'choice',
          message: 'Select plugin to remove:',
          loop: false,
        choices: [...plugins, new inquirer.Separator('──────────────'), 'Go back']
        });

        if (choice === 'Go back') {
          return this.showInterface();
        }

        pluginToRemove = choice;
      }

      if (confirmation) {
        const { confirm } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirm',
          message: `Remove plugin "${pluginToRemove}"?`,
          default: false
        });

        if (!confirm) {
          return this.showInterface();
        }
      }

      const plugin = this.plugins.get(pluginToRemove);
      if (!plugin) {
        console.log(`❌ Plugin not found: ${pluginToRemove}`);
        return;
      }

      // Remove plugin directory
      await fs.remove(plugin.path);

      // Update tracking
      this.plugins.delete(pluginToRemove);
      this.versions.delete(pluginToRemove);
      this.dependencies.delete(pluginToRemove);

      // Remove hooks
      for (const [hookName, hooks] of this.hooks.entries()) {
        this.hooks.set(hookName, hooks.filter(h => h.plugin !== pluginToRemove));
      }

      console.log(`✅ Plugin removed: ${pluginToRemove}`);

    } catch (error) {
      await this.setup.handleError('remove-plugin', error);
    }

    await this.showInterface();
  }

  /**
   * Browse plugin marketplace
   */
  async browsePluginMarketplace() {
    try {
      console.log('🌐 Browsing plugin marketplace...');

      const categories = await this.marketplace.getCategories();
      const { categoryChoice } = await inquirer.prompt({
        type: 'list',
        name: 'categoryChoice',
        message: 'Select plugin category:',
        loop: false,
        choices: [...categories.map(c => c.name), 'View all plugins', new inquirer.Separator('──────────────'), 'Go back']
      });

      if (categoryChoice === 'Go back') {
        return this.showInterface();
      }

      let plugins;
      if (categoryChoice === 'View all plugins') {
        plugins = await this.marketplace.getAllPlugins();
      } else {
        plugins = await this.marketplace.getPluginsByCategory(categoryChoice);
      }

      const choices = plugins.map(p => `${p.name} - ${p.description} (${p.version})`);

      const { pluginChoice } = await inquirer.prompt({
        type: 'list',
        name: 'pluginChoice',
        message: 'Select plugin to view details:',
        loop: false,
        choices: [...choices, new inquirer.Separator('──────────────'), 'Go back']
      });

      if (pluginChoice === 'Go back') {
        return this.browsePluginMarketplace();
      }

      const selectedPlugin = plugins.find(p => pluginChoice.startsWith(p.name));
      await this.showPluginDetails(selectedPlugin);

    } catch (error) {
      await this.setup.handleError('browse-marketplace', error);
    }
  }

  /**
   * Show plugin details
   */
  async showPluginDetails(plugin) {
    console.log(`\n📦 Plugin Details: ${plugin.name}`);
    console.log('================================');
    console.log(`Name: ${plugin.name}`);
    console.log(`Version: ${plugin.version}`);
    console.log(`Description: ${plugin.description}`);
    console.log(`Author: ${plugin.author}`);
    console.log(`Category: ${plugin.category}`);
    console.log(`Downloads: ${plugin.downloads || 0}`);
    console.log(`Rating: ${plugin.rating || 'N/A'}`);

    if (plugin.dependencies && plugin.dependencies.length > 0) {
      console.log(`Dependencies: ${plugin.dependencies.map(d => `${d.name}@${d.version}`).join(', ')}`);
    }

    const { action } = await inquirer.prompt({
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      loop: false,
        choices: [
        '1. Install this plugin',
        '2. View more details',
        new inquirer.Separator('──────────────'),
        '3. Go back to marketplace',
        '4. Go back to plugin management'
      ]
    });

    switch(parseInt(action.split('.')[0])) {
      case 1:
        await this.installPlugin(plugin.name, plugin.version);
        break;
      case 2:
        console.log('📋 More details:');
        console.log(JSON.stringify(plugin, null, 2));
        await this.showPluginDetails(plugin);
        break;
      case 3:
        await this.browsePluginMarketplace();
        break;
      case 4:
        await this.showInterface();
        break;
    }
  }

  /**
   * Create custom plugin
   */
  async createCustomPlugin() {
    try {
      const { pluginName } = await inquirer.prompt({
        type: 'input',
        name: 'pluginName',
        message: 'Enter plugin name:',
        validate: input => input.length > 0 || 'Plugin name is required'
      });

      const { description } = await inquirer.prompt({
        type: 'input',
        name: 'description',
        message: 'Enter plugin description:'
      });

      const { version } = await inquirer.prompt({
        type: 'input',
        name: 'version',
        message: 'Enter version:',
        default: '1.0.0',
        validate: input => semver.valid(input) || 'Must be a valid version'
      });

      const { hooks } = await inquirer.prompt({
        type: 'checkbox',
        name: 'hooks',
        message: 'Select plugin hooks:',
        choices: [
          'onPreInstall',
          'onPostInstall',
          'onPreConfigure',
          'onPostConfigure',
          'onError',
          'onSetupComplete'
        ]
      });

      const pluginConfig = {
        name: pluginName,
        version,
        description,
        author: os.userInfo().username,
        hooks,
        custom: true,
        created: new Date().toISOString()
      };

      await this.createCustomPluginFiles(pluginConfig);
      console.log(`✅ Custom plugin created: ${pluginName}`);

    } catch (error) {
      await this.setup.handleError('create-custom-plugin', error);
    }

    await this.showInterface();
  }

  /**
   * Create custom plugin files
   */
  async createCustomPluginFiles(config) {
    try {
      const pluginId = `custom-${config.name.toLowerCase()}`;
      const pluginDir = path.join(this.pluginDir, pluginId);

      await fs.ensureDir(pluginDir);

      // Create plugin.json
      await fs.writeFile(
        path.join(pluginDir, 'plugin.json'),
        JSON.stringify(config, null, 2)
      );

      // Create index.js
      const pluginCode = this.generatePluginCode(config);
      await fs.writeFile(path.join(pluginDir, 'index.js'), pluginCode);

      // Create README.md
      const readmeContent = `# ${config.name} Plugin

${config.description}

## Installation

This plugin was created with the PERN Setup Tool plugin generator.

## Usage

The plugin provides the following hooks:
${config.hooks.map(hook => `- \`${hook}\``).join('\n')}

## Development

To modify this plugin:
1. Edit the hook functions in \`index.js\`
2. Update the configuration in \`plugin.json\`
3. Test the plugin functionality
4. Share with the community

## Author

${config.author}
`;

      await fs.writeFile(path.join(pluginDir, 'README.md'), readmeContent);

      console.log(`📁 Plugin created at: ${pluginDir}`);

    } catch (error) {
      this.logger.error('Custom plugin creation failed', error);
      throw error;
    }
  }

  /**
   * Generate plugin code
   */
  generatePluginCode(config) {
    return `/**
 * ${config.name} Plugin
 * Generated by PERN Setup Tool
 */

class ${config.name.replace(/[^a-zA-Z0-9]/g, '')}Plugin {
  constructor() {
    this.name = '${config.name}';
    this.version = '${config.version}';
    this.description = '${config.description}';
  }

  // Hook implementations
  ${config.hooks.map(hook => `
  async ${hook}(...args) {
    console.log(\`Plugin ${config.name}: ${hook} called\`, args);
    // Add your custom logic here
  }`).join('\n')}
}

// Export plugin instance
const plugin = new ${config.name.replace(/[^a-zA-Z0-9]/g, '')}Plugin();

// Export hooks object
plugin.hooks = {
  ${config.hooks.map(hook => `'${hook}': plugin.${hook}.bind(plugin)`).join(',\n  ')}
};

module.exports = plugin;
`;
  }

  /**
   * Resolve plugin dependencies
   */
  async resolveDependencies() {
    try {
      for (const [pluginName, deps] of this.dependencies.entries()) {
        for (const dep of deps) {
          if (!this.plugins.has(dep.name)) {
            this.logger.warn(`Missing dependency for ${pluginName}: ${dep.name}`);
          }
        }
      }

      this.logger.info('Plugin dependencies resolved');
    } catch (error) {
      this.logger.error('Dependency resolution failed', error);
    }
  }

  /**
   * Get plugin information
   */
  getPlugin(name) {
    return this.plugins.get(name);
  }

  /**
   * List all plugins
   */
  listPlugins() {
    return Array.from(this.plugins.entries()).map(([name, plugin]) => ({
      name,
      version: plugin.config.version,
      description: plugin.config.description,
      enabled: plugin.config.enabled !== false,
      hooks: Object.keys(plugin.instance.hooks || {})
    }));
  }

  /**
   * Enable/disable plugin
   */
  async togglePlugin(pluginName, enabled) {
    try {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginName}`);
      }

      plugin.config.enabled = enabled;
      await fs.writeFile(
        path.join(plugin.path, 'plugin.json'),
        JSON.stringify(plugin.config, null, 2)
      );

      console.log(`✅ Plugin ${pluginName} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (error) {
      this.logger.error(`Plugin toggle failed: ${pluginName}`, error);
      throw error;
    }
  }
}

/**
 * Plugin Marketplace Class
 * Handles plugin discovery and distribution
 */
class PluginMarketplace {
  constructor() {
    this.registryUrl = 'https://api.pern-setup.plugins/registry';
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hour
  }

  /**
   * Get available plugins
   */
  async getAvailablePlugins() {
    try {
      const cacheKey = 'available-plugins';

      // Check cache
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      // Fetch from registry
      const plugins = await this.fetchFromRegistry('/plugins');
      this.cache.set(cacheKey, {
        data: plugins,
        timestamp: Date.now()
      });

      return plugins;
    } catch (error) {
      console.error('Failed to fetch available plugins:', error.message);
      return [];
    }
  }

  /**
   * Get plugin info
   */
  async getPluginInfo(pluginId, version) {
    try {
      const plugins = await this.getAvailablePlugins();
      const plugin = plugins.find(p => p.name === pluginId);

      if (!plugin) {
        return null;
      }

      if (version !== 'latest' && !plugin.versions.includes(version)) {
        throw new Error(`Version ${version} not available for plugin ${pluginId}`);
      }

      return {
        ...plugin,
        version: version === 'latest' ? plugin.latestVersion : version
      };
    } catch (error) {
      console.error('Failed to get plugin info:', error.message);
      return null;
    }
  }

  /**
   * Get latest version
   */
  async getLatestVersion(pluginId) {
    try {
      const plugin = await this.getPluginInfo(pluginId, 'latest');
      return plugin ? plugin.version : null;
    } catch (error) {
      console.error('Failed to get latest version:', error.message);
      return null;
    }
  }

  /**
   * Download plugin
   */
  async download(pluginId, version) {
    try {
      console.log(`📥 Downloading plugin: ${pluginId} v${version}`);

      // In a real implementation, this would download from the registry
      // For now, return a mock package
      const pluginPackage = {
        name: pluginId,
        version,
        path: `/tmp/plugin-${pluginId}-${version}`,
        files: [
          {
            name: 'index.js',
            content: '// Plugin code would be here'
          },
          {
            name: 'plugin.json',
            content: JSON.stringify({
              name: pluginId,
              version,
              description: 'Downloaded plugin'
            })
          }
        ]
      };

      return pluginPackage;
    } catch (error) {
      console.error('Plugin download failed:', error.message);
      throw error;
    }
  }

  /**
   * Get categories
   */
  async getCategories() {
    try {
      const cacheKey = 'categories';

      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const categories = await this.fetchFromRegistry('/categories');
      this.cache.set(cacheKey, {
        data: categories,
        timestamp: Date.now()
      });

      return categories;
    } catch (error) {
      console.error('Failed to fetch categories:', error.message);
      return [];
    }
  }

  /**
   * Get plugins by category
   */
  async getPluginsByCategory(category) {
    try {
      const plugins = await this.getAvailablePlugins();
      return plugins.filter(p => p.category === category);
    } catch (error) {
      console.error('Failed to get plugins by category:', error.message);
      return [];
    }
  }

  /**
   * Get all plugins
   */
  async getAllPlugins() {
    return await this.getAvailablePlugins();
  }

  /**
   * Fetch from registry
   */
  async fetchFromRegistry(endpoint) {
    // Mock implementation - in reality this would make HTTP requests
    return [];
  }
}

module.exports = PluginManager;