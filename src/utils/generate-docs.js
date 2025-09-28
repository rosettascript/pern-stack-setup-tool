#!/usr/bin/env node

/**
 * PERN Setup Tool - Documentation Generator
 * Generates comprehensive API documentation from the codebase
 */

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

class DocumentationGenerator {
  constructor() {
    this.projectRoot = path.join(__dirname, '..', '..');
    this.docsDir = path.join(this.projectRoot, 'docs');
    this.apiSpecPath = path.join(this.projectRoot, 'openapi-spec.json');
  }

  async generateDocumentation() {
    console.log('📚 Generating comprehensive documentation...');

    try {
      // Ensure docs directory exists
      await fs.ensureDir(this.docsDir);

      // Generate API documentation
      await this.generateAPISpec();

      // Generate component documentation
      await this.generateComponentDocs();

      // Generate setup documentation
      await this.generateSetupDocs();

      // Generate troubleshooting guide
      await this.generateTroubleshootingDocs();

      console.log('✅ Documentation generated successfully!');
      console.log(`📁 Documentation available in: ${this.docsDir}`);

    } catch (error) {
      console.error('❌ Documentation generation failed:', error.message);
      process.exit(1);
    }
  }

  async generateAPISpec() {
    console.log('🔧 Generating OpenAPI specification...');

    const openAPISpec = {
      openapi: '3.0.3',
      info: {
        title: 'PERN Setup Tool API',
        version: '2.0.0',
        description: 'RESTful API for PERN stack setup and management',
        contact: {
          name: 'PERN Setup Tool',
          url: 'https://github.com/your-org/pern-setup-tool'
        },
        license: {
          name: 'MIT'
        }
      },
      servers: [
        {
          url: 'http://localhost:5000',
          description: 'Development server'
        },
        {
          url: 'https://api.pern-setup.com',
          description: 'Production server'
        }
      ],
      paths: this.generateAPIPaths(),
      components: {
        schemas: this.generateSchemas(),
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      security: [
        {
          bearerAuth: []
        }
      ]
    };

    await fs.writeFile(this.apiSpecPath, JSON.stringify(openAPISpec, null, 2));
    console.log(`📄 OpenAPI spec generated: ${this.apiSpecPath}`);
  }

  generateAPIPaths() {
    return {
      '/api/health': {
        get: {
          summary: 'Health check endpoint',
          responses: {
            200: {
              description: 'Server is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'OK' },
                      timestamp: { type: 'string', format: 'date-time' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/setup': {
        post: {
          summary: 'Initialize PERN setup',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SetupRequest'
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Setup completed successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SetupResponse'
                  }
                }
              }
            },
            400: {
              description: 'Invalid setup configuration'
            }
          }
        }
      }
    };
  }

  generateSchemas() {
    return {
      SetupRequest: {
        type: 'object',
        required: ['projectName', 'database'],
        properties: {
          projectName: {
            type: 'string',
            description: 'Name of the project',
            example: 'my-pern-app'
          },
          database: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['postgresql', 'mysql'], example: 'postgresql' },
              host: { type: 'string', example: 'localhost' },
              port: { type: 'integer', example: 5432 },
              name: { type: 'string', example: 'pern_db' }
            }
          },
          features: {
            type: 'array',
            items: { type: 'string' },
            example: ['authentication', 'docker', 'nginx']
          }
        }
      },
      SetupResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          projectPath: { type: 'string', example: '/path/to/project' },
          components: {
            type: 'array',
            items: { type: 'string' },
            example: ['postgresql', 'express', 'react']
          },
          nextSteps: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    };
  }

  async generateComponentDocs() {
    console.log('📖 Generating component documentation...');

    const components = [
      'postgresql-manager',
      'redis-manager',
      'docker-manager',
      'pm2-manager',
      'nginx-manager',
      'test-manager',
      'security-manager'
    ];

    for (const component of components) {
      await this.generateComponentDoc(component);
    }
  }

  async generateComponentDoc(componentName) {
    const componentPath = path.join(this.projectRoot, 'src', 'components', `${componentName}.js`);

    if (!await fs.pathExists(componentPath)) {
      console.log(`⚠️  Component not found: ${componentName}`);
      return;
    }

    const content = await fs.readFile(componentPath, 'utf8');
    const docPath = path.join(this.docsDir, 'components', `${componentName}.md`);

    await fs.ensureDir(path.dirname(docPath));

    const docContent = this.extractComponentDocumentation(componentName, content);
    await fs.writeFile(docPath, docContent);
  }

  extractComponentDocumentation(componentName, content) {
    const lines = content.split('\n');
    let documentation = `# ${componentName.replace('-', ' ').toUpperCase()}\n\n`;

    // Extract class description
    const classMatch = content.match(/\/\*\*\s*\n\s*\*\s*([^*\n]+)/);
    if (classMatch) {
      documentation += `${classMatch[1]}\n\n`;
    }

    // Extract methods
    const methodRegex = /\/\*\*\s*\n\s*\*\s*([^*\n]+)\s*\n([\s\S]*?)\*\//g;
    let methodMatch;

    while ((methodMatch = methodRegex.exec(content)) !== null) {
      const methodDesc = methodMatch[1].trim();
      documentation += `## ${methodDesc}\n\n`;
    }

    return documentation;
  }

  async generateSetupDocs() {
    console.log('📋 Generating setup documentation...');

    const setupDoc = `# PERN Setup Guide

## Quick Start

\`\`\`bash
npm install -g pern-setup-tool
pern-setup
\`\`\`

## Prerequisites

- Node.js 18+
- PostgreSQL (optional, can be installed automatically)
- Docker (optional)
- Administrative privileges for system installations

## Configuration Options

### Database Setup
- PostgreSQL with automatic user/database creation
- Manual configuration with custom credentials
- Connection pooling and optimization

### Application Features
- Authentication (JWT + bcrypt)
- File uploads with multer
- Rate limiting and security middleware
- CORS configuration

### Deployment Options
- PM2 process management
- Nginx reverse proxy
- Docker containerization
- SSL/TLS configuration

## Troubleshooting

See the troubleshooting guide for common issues and solutions.
`;

    const setupPath = path.join(this.docsDir, 'SETUP.md');
    await fs.writeFile(setupPath, setupDoc);
  }

  async generateTroubleshootingDocs() {
    console.log('🔧 Generating troubleshooting documentation...');

    const troubleshootingDoc = `# Troubleshooting Guide

## Common Issues

### Database Connection Failed
**Symptoms:** Application cannot connect to PostgreSQL
**Solutions:**
1. Verify PostgreSQL service is running: \`sudo systemctl status postgresql\`
2. Check connection string in environment variables
3. Ensure database and user exist
4. Verify firewall settings

### Port Already in Use
**Symptoms:** Application fails to start with EADDRINUSE error
**Solutions:**
1. Find process using port: \`lsof -i :5000\`
2. Kill conflicting process: \`kill -9 <PID>\`
3. Change port in environment configuration
4. Use PM2 for process management

### npm Install Fails
**Symptoms:** Package installation fails
**Solutions:**
1. Clear npm cache: \`npm cache clean --force\`
2. Delete node_modules and package-lock.json
3. Check Node.js version compatibility
4. Try with different registry

### CORS Errors
**Symptoms:** Frontend cannot communicate with backend
**Solutions:**
1. Configure CORS in Express server
2. Add frontend URL to allowed origins
3. Check if API is running on correct port
4. Verify environment variables

## Getting Help

- Check the logs in \`logs/\` directory
- Run diagnostics: \`npm run validate\`
- View security audit: \`npm run security:audit\`
- Generate system report: \`npm run docs\`
`;

    const troubleshootingPath = path.join(this.docsDir, 'TROUBLESHOOTING.md');
    await fs.writeFile(troubleshootingPath, troubleshootingDoc);
  }
}

// Run documentation generation if called directly
if (require.main === module) {
  const generator = new DocumentationGenerator();
  generator.generateDocumentation().catch(console.error);
}

module.exports = DocumentationGenerator;