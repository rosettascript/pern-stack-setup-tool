# Contributing to PERN Stack Setup Tool

Thank you for your interest in contributing to PERN Stack Setup Tool! This document provides guidelines and information for contributors to our comprehensive enterprise-grade PERN stack automation tool.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

## Getting Started

### Prerequisites

- Node.js 16.0.0 or higher
- PostgreSQL 12.0.0 or higher
- Git
- Bash shell (for script development)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/rosettascript/pern-stack-setup-tool.git
   cd pern-stack-setup-tool
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/rosettascript/pern-stack-setup-tool.git
   ```

## Development Setup

### Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the setup tool**:
   ```bash
   npm start
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

4. **Run security scan**:
   ```bash
   npm run security:scan
   ```

### Testing Your Changes

1. **Test the setup tool**:
   ```bash
   # Run comprehensive tests
   npm run test:all
   
   # Test specific components
   npm run test:unit
   npm run test:integration
   npm run test:e2e
   ```

2. **Test security and compliance**:
   ```bash
   # Run security scans
   npm run test:security
   npm run test:compliance
   
   # Test performance
   npm run test:performance
   ```

3. **Validate generated projects**:
   - Check that all dependencies install correctly
   - Verify that development servers start
   - Test database connections
   - Validate security configurations
   - Test compliance frameworks

## Contributing Process

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b bugfix/issue-number
# or
git checkout -b docs/update-readme
```

### 2. Make Your Changes

- Follow the [coding standards](#coding-standards)
- Add tests for new functionality
- Update documentation as needed
- Ensure all scripts are executable

### 3. Test Your Changes

```bash
# Test the setup tool
npm test

# Test specific components
npm run test:unit
npm run test:integration
npm run test:e2e

# Test security and compliance
npm run test:security
npm run test:compliance

# Test performance
npm run test:performance
```

### 4. Commit Your Changes

Follow conventional commit format:

```bash
git add .
git commit -m "feat: add new template option for microservices"
# or
git commit -m "fix: resolve database connection issue in Docker setup"
# or
git commit -m "docs: update installation instructions"
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub with:
- Clear description of changes
- Reference to any related issues
- Screenshots if UI changes
- Test results

## Coding Standards

### JavaScript/Node.js

- Use ES6+ features and modern JavaScript
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use meaningful variable and function names
- Add JSDoc comments for functions and classes
- Use async/await for asynchronous operations
- Implement proper error handling with try/catch
- Use const/let instead of var

Example:
```javascript
/**
 * Creates a new project directory with proper structure
 * @param {string} projectPath - The path where the project will be created
 * @param {string} projectName - The name of the project
 * @returns {Promise<boolean>} - Returns true if successful
 */
async function createProjectDirectory(projectPath, projectName) {
    try {
        if (fs.existsSync(projectPath)) {
            throw new Error(`Directory ${projectPath} already exists`);
        }
        
        await fs.promises.mkdir(projectPath, { recursive: true });
        logger.success(`Created project directory: ${projectPath}`);
        return true;
    } catch (error) {
        logger.error(`Failed to create project directory: ${error.message}`);
        return false;
    }
}
```

### JSON Files

- Use 2-space indentation
- Sort keys alphabetically
- Use consistent naming conventions
- Add comments where helpful (though JSON doesn't support comments natively)

### Documentation

- Use clear, concise language
- Include code examples
- Update both README.md and relevant docs/ files
- Follow markdown best practices

## Testing Guidelines

### Component Testing

Each component should be tested for:

1. **Unit Testing**:
   - Individual functions and methods
   - Input validation and error handling
   - Return values and side effects
   - Edge cases and boundary conditions

2. **Integration Testing**:
   - Component interactions
   - Database connections
   - External service integrations
   - API endpoints and responses

3. **Security Testing**:
   - Vulnerability scanning
   - Compliance framework validation
   - Authentication and authorization
   - Data protection and encryption

4. **Performance Testing**:
   - Load testing and stress testing
   - Memory usage and optimization
   - Response times and throughput
   - Caching effectiveness

### Test Checklist

- [ ] All unit tests pass
- [ ] Integration tests complete successfully
- [ ] Security scans show no vulnerabilities
- [ ] Compliance frameworks validate correctly
- [ ] Performance benchmarks are met
- [ ] Cross-platform compatibility verified
- [ ] Documentation is updated

## Documentation

### Required Documentation Updates

When adding new features or components:

1. **Update README.md**:
   - Add feature to the features list
   - Update usage examples
   - Add new component descriptions
   - Update installation instructions

2. **Update package.json**:
   - Increment version appropriately
   - Add new dependencies if needed
   - Update scripts and commands

3. **Update CHANGELOG.md**:
   - Add new features and improvements
   - Document breaking changes
   - Include bug fixes and security updates

### Documentation Standards

- Use clear, concise language
- Include practical examples
- Provide troubleshooting information
- Keep documentation up-to-date with code changes
- All documentation is organized in the `docs/` folder
- Update the `docs/README.md` for navigation changes

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (3.0.0): Breaking changes, major new features
- **MINOR** (3.1.0): New features, backward compatible
- **PATCH** (3.0.1): Bug fixes, backward compatible

### Release Checklist

- [ ] All tests pass
- [ ] Documentation is updated
- [ ] Changelog is updated
- [ ] Version numbers are incremented
- [ ] package.json is updated
- [ ] Release notes are prepared

### Creating a Release

1. Update version numbers in:
   - `package.json`
   - `README.md` (if needed)
   - `CHANGELOG.md`

2. Create a release branch:
   ```bash
   git checkout -b release/v1.0.0
   git push origin release/v1.0.0
   ```

3. Create a pull request for the release
4. After approval, merge and tag:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

## Getting Help

- **Issues**: Create an issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check the docs/ folder for detailed guides
- **Examples**: Look at existing templates for reference

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes
- Project documentation

Thank you for contributing to PERN Stack Setup! 🚀

