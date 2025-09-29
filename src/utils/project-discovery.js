const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child-process-promise');
const inquirer = require('inquirer');

class ProjectDiscovery {
  constructor() {
    const os = require('os');
    const homeDir = os.homedir();
    
    // Cross-platform project paths
    this.commonProjectPaths = [
      path.join(homeDir, 'Projects'),
      path.join(homeDir, 'projects'), 
      path.join(homeDir, 'workspace'),
      path.join(homeDir, 'workspaces'),
      path.join(homeDir, 'code'),
      path.join(homeDir, 'dev'),
      path.join(homeDir, 'development'),
      path.join(homeDir, 'work'),
      path.join(homeDir, 'workplace'),
      path.join(homeDir, 'Documents', 'Projects'),
      path.join(homeDir, 'Documents', 'projects'),
      path.join(homeDir, 'Documents', 'work'),
      path.join(homeDir, 'Documents', 'code'),
      path.join(homeDir, 'Documents', 'dev'),
      // Windows-specific paths
      path.join(homeDir, 'Documents', 'Visual Studio Projects'),
      path.join(homeDir, 'Source', 'Repos'),
      path.join(homeDir, 'OneDrive', 'Documents', 'Projects'),
      path.join(homeDir, 'OneDrive', 'Documents', 'work'),
      // macOS-specific paths
      path.join(homeDir, 'Desktop', 'Projects'),
      path.join(homeDir, 'Desktop', 'work'),
      path.join(homeDir, 'Developer', 'Projects'),
      // Common system-wide paths
      '/opt/projects',
      '/var/www',
      '/srv/projects'
    ];
  }

  /**
   * Discover existing projects in common locations
   */
  async discoverProjects() {
    const projects = new Set();
    
    // Add current directory as an option
    const currentDir = process.cwd();
    projects.add({
      name: path.basename(currentDir),
      path: currentDir,
      type: 'current'
    });

    // Scan common project directories
    for (const projectPath of this.commonProjectPaths) {
      try {
        const stats = await fs.stat(projectPath);
        
        if (stats.isDirectory()) {
          const subdirs = await fs.readdir(projectPath);
          
          for (const subdir of subdirs) {
            const fullPath = path.join(projectPath, subdir);
            const subdirStats = await fs.stat(fullPath);
            
            if (subdirStats.isDirectory() && !subdir.startsWith('.')) {
              // Check if it looks like a project (has package.json, src/, etc.)
              const isProject = await this.isProjectDirectory(fullPath);
              if (isProject) {
                projects.add({
                  name: subdir,
                  path: fullPath,
                  type: 'existing'
                });
              }
            }
          }
        }
      } catch (error) {
        // Directory doesn't exist or can't be read, skip
        continue;
      }
    }

    return Array.from(projects);
  }

  /**
   * Check if a directory looks like a project
   */
  async isProjectDirectory(dirPath) {
    try {
      const files = await fs.readdir(dirPath);
      
      // Common project indicators
      const projectIndicators = [
        'package.json',
        'src/',
        'app/',
        'lib/',
        'server/',
        'client/',
        'docker-compose.yml',
        'Dockerfile',
        'README.md',
        'requirements.txt',
        'pom.xml',
        'Cargo.toml',
        'go.mod'
      ];

      // Check for at least one project indicator
      for (const indicator of projectIndicators) {
        if (files.includes(indicator)) {
          return true;
        }
        
        // Check for directories
        if (indicator.endsWith('/')) {
          const dirName = indicator.slice(0, -1);
          if (files.includes(dirName)) {
            try {
              const stats = await fs.stat(path.join(dirPath, dirName));
              if (stats.isDirectory()) {
                return true;
              }
            } catch (error) {
              continue;
            }
          }
        }
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Let user select a project from discovered projects
   */
  async selectProject(message = 'Select a project to configure:') {
    const projects = await this.discoverProjects();
    
    if (projects.length === 0) {
      throw new Error('No projects found. Please ensure you have projects in common directories like ~/Projects, ~/workspace, etc.');
    }

    // Sort projects: current first, then alphabetically
    projects.sort((a, b) => {
      if (a.type === 'current' && b.type !== 'current') return -1;
      if (b.type === 'current' && a.type !== 'current') return 1;
      return a.name.localeCompare(b.name);
    });

    const choices = projects.map(project => ({
      name: `${project.name} ${project.type === 'current' ? '(current)' : ''} - ${project.path}`,
      value: project.path,
      short: project.name
    }));

    // Add option to create new project
    choices.push({
      name: '+ Create new project',
      value: 'create_new',
      short: 'New Project'
    });

    // Add option to enter custom project path
    choices.push({
      name: '📁 Enter custom project path',
      value: 'custom_path',
      short: 'Custom Path'
    });

    // Add option to go back
    choices.push({
      name: '← Go back',
      value: 'go_back',
      short: 'Go Back'
    });

    const { selectedProject } = await inquirer.prompt({
      type: 'list',
      name: 'selectedProject',
      message: message,
      choices: choices,
      pageSize: 10,
      loop: false
    });

    if (selectedProject === 'create_new') {
      return await this.createNewProject();
    }

    if (selectedProject === 'custom_path') {
      return await this.getCustomProjectPath();
    }

    if (selectedProject === 'go_back') {
      throw new Error('User chose to go back');
    }

    return selectedProject;
  }

  /**
   * Create a new project directory
   */
  async createNewProject() {
    const { projectName } = await inquirer.prompt({
      type: 'input',
      name: 'projectName',
      message: 'Enter new project name:',
      validate: input => {
        if (!input.trim()) return 'Project name is required';
        if (!/^[a-zA-Z0-9_-]+$/.test(input)) return 'Project name can only contain letters, numbers, hyphens, and underscores';
        return true;
      }
    });

    const os = require('os');
    const homeDir = os.homedir();
    
    const { projectLocation } = await inquirer.prompt({
      type: 'list',
      name: 'projectLocation',
      message: 'Where should the project be created?',
      choices: [
        { name: 'Current directory', value: 'current' },
        { name: `${path.join(homeDir, 'Projects')}`, value: path.join(homeDir, 'Projects') },
        { name: `${path.join(homeDir, 'workspace')}`, value: path.join(homeDir, 'workspace') },
        { name: 'Custom path', value: 'custom' }
      ]
    });

    let projectPath;
    
    if (projectLocation === 'current') {
      projectPath = path.join(process.cwd(), projectName);
    } else if (projectLocation === 'custom') {
      const { customPath } = await inquirer.prompt({
        type: 'input',
        name: 'customPath',
        message: 'Enter full path for project directory:',
        validate: input => {
          if (!input.trim()) return 'Path is required';
          return true;
        }
      });
      projectPath = path.join(customPath, projectName);
    } else {
      projectPath = path.join(projectLocation, projectName);
    }

    // Create project directory
    await fs.mkdir(projectPath, { recursive: true });
    
    console.log(`✅ Created project directory: ${projectPath}`);
    
    return projectPath;
  }

  /**
   * Get project info for display
   */
  async getProjectInfo(projectPath) {
    try {
      const stats = await fs.stat(projectPath);
      if (!stats.isDirectory()) {
        return null;
      }

      const files = await fs.readdir(projectPath);
      const projectType = this.detectProjectType(files);
      
      return {
        name: path.basename(projectPath),
        path: projectPath,
        type: projectType,
        files: files
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Get custom project path from user input
   */
  async getCustomProjectPath() {
    const { customPath } = await inquirer.prompt({
      type: 'input',
      name: 'customPath',
      message: 'Enter the full path to your project directory:',
      validate: input => {
        if (!input.trim()) return 'Project path is required';
        if (!path.isAbsolute(input)) return 'Please enter an absolute path (starting with / or C:\\)';
        return true;
      }
    });

    try {
      // Check if the path exists and is a directory
      const stats = await fs.stat(customPath);
      if (!stats.isDirectory()) {
        throw new Error('Path exists but is not a directory');
      }

      // Check if it looks like a project
      const isProject = await this.isProjectDirectory(customPath);
      if (!isProject) {
        const { proceed } = await inquirer.prompt({
          type: 'confirm',
          name: 'proceed',
          message: 'This directory doesn\'t appear to be a project directory. Continue anyway?',
          default: false
        });
        
        if (!proceed) {
          return await this.selectProject();
        }
      }

      console.log(`✅ Using custom project path: ${customPath}`);
      return customPath;
    } catch (error) {
      console.log(`❌ Error accessing path: ${error.message}`);
      const { retry } = await inquirer.prompt({
        type: 'confirm',
        name: 'retry',
        message: 'Would you like to try entering a different path?',
        default: true
      });
      
      if (retry) {
        return await this.getCustomProjectPath();
      } else {
        return await this.selectProject();
      }
    }
  }

  /**
   * Detect project type based on files
   */
  detectProjectType(files) {
    if (files.includes('package.json')) {
      const packageJson = require(path.join(process.cwd(), 'package.json'));
      if (packageJson.dependencies && packageJson.dependencies.react) return 'React';
      if (packageJson.dependencies && packageJson.dependencies.vue) return 'Vue';
      if (packageJson.dependencies && packageJson.dependencies.express) return 'Node.js';
      return 'Node.js';
    }
    if (files.includes('requirements.txt')) return 'Python';
    if (files.includes('pom.xml')) return 'Java';
    if (files.includes('Cargo.toml')) return 'Rust';
    if (files.includes('go.mod')) return 'Go';
    if (files.includes('Dockerfile')) return 'Docker';
    return 'Unknown';
  }
}

module.exports = ProjectDiscovery;
