#!/usr/bin/env node

/**
 * PERN Setup Tool - Documentation Server
 * Serves interactive documentation with live examples
 */

const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const { exec } = require('child-process-promise');

class DocumentationServer {
  constructor(port = 3001) {
    this.port = port;
    this.app = express();
    this.projectRoot = path.join(__dirname, '..', '..');
    this.docsDir = path.join(this.projectRoot, 'docs');
    this.templatesDir = path.join(this.projectRoot, 'templates');
  }

  async start() {
    console.log('🚀 Starting documentation server...');

    // Setup middleware
    this.setupMiddleware();

    // Setup routes
    this.setupRoutes();

    // Start server
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        console.log(`🌐 Documentation server running at http://localhost:${this.port}`);
        console.log('📚 Available sections:');
        console.log(`   • Main Hub: http://localhost:${this.port}`);
        console.log(`   • API Docs: http://localhost:${this.port}/api-docs`);
        console.log(`   • Setup Guide: http://localhost:${this.port}/setup`);
        console.log(`   • Troubleshooting: http://localhost:${this.port}/troubleshoot`);
        resolve();
      });
    });
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, 'public')));
    this.app.set('view engine', 'ejs');
    this.app.set('views', path.join(__dirname, 'views'));
  }

  setupRoutes() {
    // Main documentation hub
    this.app.get('/', (req, res) => {
      res.send(this.generateDocumentationHubHTML());
    });

    // API documentation
    this.app.get('/api-docs', async (req, res) => {
      const apiSpec = await this.getAPISpecification();
      if (apiSpec) {
        res.send(this.generateSwaggerUIHTML(apiSpec));
      } else {
        res.send(this.generateAPIDocsPlaceholder());
      }
    });

    // Setup guide
    this.app.get('/setup', (req, res) => {
      res.send(this.generateSetupGuideHTML());
    });

    // Troubleshooting
    this.app.get('/troubleshoot', (req, res) => {
      res.send(this.generateTroubleshootingHTML());
    });

    // API endpoints
    this.app.get('/api/docs', async (req, res) => {
      const docs = await this.getAvailableDocumentation();
      res.json(docs);
    });

    this.app.get('/api/examples', async (req, res) => {
      const examples = await this.getInteractiveExamples();
      res.json(examples);
    });

    this.app.post('/api/examples/:id/run', async (req, res) => {
      const result = await this.runExampleCode(req.params.id, req.body);
      res.json(result);
    });

    this.app.post('/api/diagnose', async (req, res) => {
      const diagnosis = await this.diagnoseIssue(req.body.error, req.body.context);
      res.json(diagnosis);
    });

    this.app.get('/api/templates', async (req, res) => {
      const templates = await this.getAvailableTemplates();
      res.json(templates);
    });

    // Performance analytics
    this.app.get('/api/analytics', async (req, res) => {
      const analytics = await this.getPerformanceAnalytics();
      res.json(analytics);
    });
  }

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

  generateAPIDocsPlaceholder() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Documentation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 50px; }
        .placeholder { background: #f8f9fa; padding: 40px; border-radius: 10px; max-width: 600px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="placeholder">
        <h1>🔌 API Documentation</h1>
        <p>API documentation not yet generated.</p>
        <p>Run <code>npm run docs</code> to generate OpenAPI specification.</p>
        <button onclick="window.location.href='/'">Back to Documentation Hub</button>
    </div>
</body>
</html>`;
  }

  generateSwaggerUIHTML(spec) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PERN Setup API Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.25.0/swagger-ui.css" />
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@3.25.0/swagger-ui-bundle.js"></script>
    <script>
        SwaggerUIBundle({
            spec: ${JSON.stringify(spec)},
            dom_id: '#swagger-ui',
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIBundle.presets.standalone
            ],
            layout: "BaseLayout"
        });
    </script>
</body>
</html>`;
  }

  async getAPISpecification() {
    const specPath = path.join(this.projectRoot, 'openapi-spec.json');
    if (await fs.pathExists(specPath)) {
      return JSON.parse(await fs.readFile(specPath, 'utf8'));
    }
    return null;
  }

  async getAvailableDocumentation() {
    return {
      setupGuide: true,
      apiDocs: await fs.pathExists(path.join(this.projectRoot, 'openapi-spec.json')),
      troubleshooting: true,
      examples: true
    };
  }

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

  async runExampleCode(exampleId, params) {
    // Simulate running example code
    return {
      exampleId,
      status: 'executed',
      output: `Example ${exampleId} executed successfully`,
      timestamp: new Date().toISOString()
    };
  }

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

  async getAvailableTemplates() {
    const templates = [];
    const templateDirs = await fs.readdir(this.templatesDir);

    for (const dir of templateDirs) {
      const templatePath = path.join(this.templatesDir, dir);
      const stat = await fs.stat(templatePath);

      if (stat.isDirectory()) {
        const templateJsonPath = path.join(templatePath, 'template.json');
        if (await fs.pathExists(templateJsonPath)) {
          const template = JSON.parse(await fs.readFile(templateJsonPath, 'utf8'));
          templates.push(template);
        }
      }
    }

    return templates;
  }

  async getPerformanceAnalytics() {
    // Mock analytics data
    return {
      totalRequests: 1250,
      averageResponseTime: 45,
      errorRate: 0.02,
      cacheHitRate: 0.85,
      memoryUsage: '120MB',
      cpuUsage: '15%'
    };
  }

  async stop() {
    if (this.server) {
      this.server.close();
      console.log('🛑 Documentation server stopped');
    }
  }
}

// Run documentation server if called directly
if (require.main === module) {
  const server = new DocumentationServer();
  server.start().then(() => {
    console.log('Press Ctrl+C to stop the server');
    process.on('SIGINT', () => server.stop());
  });
}

module.exports = DocumentationServer;