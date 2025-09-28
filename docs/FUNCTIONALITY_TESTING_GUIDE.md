# PERN Setup Tool - Functionality Testing Guide

## 🎯 Overview

This guide provides a comprehensive framework for testing the PERN Setup Tool functionality. The testing process ensures that all components work correctly, integrations are seamless, and the tool meets production readiness standards.

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **Operating System**: Linux, macOS, or Windows with WSL
- **Memory**: Minimum 4GB RAM, recommended 8GB+
- **Disk Space**: 5GB free space for testing environments
- **Network**: Stable internet connection for package downloads

### Software Dependencies
```bash
# Core testing framework
npm install -g jest supertest cypress newman

# Testing utilities
npm install -g artillery mocha chai sinon nyc

# System monitoring
npm install -g clinic autocannon

# Security testing
npm install -g snyk audit-ci
```

### Test Environment Setup
```bash
# 1. Clone and setup the project
git clone <repository-url>
cd pern-starter-script
npm install

# 2. Create test directories
mkdir -p test-results test-environments test-data

# 3. Setup test databases
createdb pern_test_db
createdb pern_integration_db

# 4. Configure test environment variables
cp .env.example .env.test
# Edit .env.test with test-specific values
```

## 🧪 Testing Methodology

### Test Pyramid Structure
```
┌─────────────────┐
│  E2E Tests      │ ← User workflows
│  (10% of tests) │
├─────────────────┤
│ Integration     │ ← Component interactions
│ Tests (20%)     │
├─────────────────┤
│  Unit Tests     │ ← Individual functions
│  (70% of tests) │
└─────────────────┘
```

### Testing Categories

#### 1. Unit Tests
- **Scope**: Individual functions and methods
- **Tools**: Jest, Mocha, Chai
- **Coverage**: >90% code coverage required
- **Location**: `src/**/*.test.js`

#### 2. Integration Tests
- **Scope**: Component interactions and APIs
- **Tools**: Supertest, Jest
- **Coverage**: All component integrations
- **Location**: `tests/integration/`

#### 3. End-to-End Tests
- **Scope**: Complete user workflows
- **Tools**: Cypress, Playwright
- **Coverage**: Critical user journeys
- **Location**: `tests/e2e/`

#### 4. Performance Tests
- **Scope**: Load, stress, and scalability
- **Tools**: Artillery, k6, autocannon
- **Coverage**: Performance benchmarks
- **Location**: `tests/performance/`

#### 5. Security Tests
- **Scope**: Vulnerability assessment and compliance
- **Tools**: Snyk, OWASP ZAP, custom security tests
- **Coverage**: Security requirements and compliance
- **Location**: `tests/security/`

## 🚀 Test Execution Process

### Phase 1: Environment Preparation (15 minutes)

#### 1.1 System Validation
```bash
# Check Node.js version
node --version  # Should be 18+

# Check npm version
npm --version   # Should be 8+

# Check system resources
df -h           # Disk space check
free -h         # Memory check

# Check required services
systemctl status postgresql  # Should be active
systemctl status redis       # Should be active (if available)
systemctl status docker      # Should be active
```

#### 1.2 Dependency Installation
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Verify installation
npm list --depth=0

# Check for security vulnerabilities
npm audit
npm audit fix
```

#### 1.3 Test Environment Setup
```bash
# Create test databases
createdb pern_unit_test_db
createdb pern_integration_test_db
createdb pern_e2e_test_db

# Setup test data
npm run db:seed:test

# Configure test environment
export NODE_ENV=test
export DATABASE_URL=postgresql://localhost:5432/pern_unit_test_db
export REDIS_URL=redis://localhost:6379
```

### Phase 2: Unit Testing (30 minutes)

#### 2.1 Run Unit Tests
```bash
# Run all unit tests
npm run test:unit

# Run with coverage
npm run test:unit:coverage

# Run specific component tests
npm run test:unit -- --testPathPattern=postgresql-manager
npm run test:unit -- --testPathPattern=redis-manager
npm run test:unit -- --testPathPattern=docker-manager

# Run with verbose output
npm run test:unit -- --verbose
```

#### 2.2 Coverage Analysis
```bash
# Generate coverage report
npm run test:unit:coverage

# View coverage report
open coverage/lcov-report/index.html

# Check coverage thresholds
npx nyc check-coverage --lines 90 --functions 90 --branches 80
```

#### 2.3 Unit Test Validation Criteria
- [ ] All tests pass (0 failures)
- [ ] Code coverage >90% for statements
- [ ] Code coverage >90% for functions
- [ ] Code coverage >80% for branches
- [ ] No memory leaks detected
- [ ] Performance benchmarks met

### Phase 3: Integration Testing (45 minutes)

#### 3.1 Component Integration Tests
```bash
# Run integration tests
npm run test:integration

# Run specific integration tests
npm run test:integration -- --grep="PostgreSQL-Docker"
npm run test:integration -- --grep="Redis-PM2"
npm run test:integration -- --grep="Nginx-SSL"

# Run with debugging
npm run test:integration -- --inspect-brk
```

#### 3.2 API Integration Tests
```bash
# Test API endpoints
npm run test:api

# Test with different configurations
npm run test:api -- --config=production
npm run test:api -- --config=development
```

#### 3.3 Cross-Platform Integration Tests
```bash
# Test on Linux
npm run test:integration:linux

# Test on macOS
npm run test:integration:macos

# Test on Windows (WSL)
npm run test:integration:windows
```

#### 3.4 Integration Test Validation Criteria
- [ ] All component integrations work
- [ ] API endpoints respond correctly
- [ ] Database connections stable
- [ ] File system operations work
- [ ] Network calls successful
- [ ] Error handling works properly
- [ ] Cross-platform compatibility verified

### Phase 4: End-to-End Testing (60 minutes)

#### 4.1 Setup Complete Workflow Tests
```bash
# Run E2E tests
npm run test:e2e

# Run specific workflows
npm run test:e2e -- --spec="basic-pern-setup"
npm run test:e2e -- --spec="advanced-features"
npm run test:e2e -- --spec="production-deployment"

# Run in headless mode
npm run test:e2e:headless

# Run with video recording
npm run test:e2e:record
```

#### 4.2 User Journey Tests
```bash
# Test complete PERN setup
npm run test:e2e:journey -- --journey=basic-setup

# Test advanced features setup
npm run test:e2e:journey -- --journey=advanced-setup

# Test production deployment
npm run test:e2e:journey -- --journey=production-deploy
```

#### 4.3 Browser Compatibility Tests
```bash
# Test in Chrome
npm run test:e2e -- --browser=chrome

# Test in Firefox
npm run test:e2e -- --browser=firefox

# Test in Safari
npm run test:e2e -- --browser=safari
```

#### 4.4 E2E Test Validation Criteria
- [ ] Complete setup workflows work
- [ ] User interfaces function correctly
- [ ] Error recovery works
- [ ] Generated projects are valid
- [ ] Documentation servers work
- [ ] Interactive examples function
- [ ] Cross-browser compatibility verified

### Phase 5: Performance Testing (30 minutes)

#### 5.1 Load Testing
```bash
# Run load tests
npm run test:performance:load

# Test API endpoints under load
npm run test:performance:api -- --endpoint=/api/users --vus=100 --duration=60s

# Test setup tool performance
npm run test:performance:setup -- --iterations=10
```

#### 5.2 Memory and Resource Testing
```bash
# Memory leak detection
npm run test:performance:memory

# CPU usage monitoring
npm run test:performance:cpu

# Disk I/O testing
npm run test:performance:disk
```

#### 5.3 Scalability Testing
```bash
# Test with different system sizes
npm run test:performance:scale -- --size=small
npm run test:performance:scale -- --size=medium
npm run test:performance:scale -- --size=large
```

#### 5.4 Performance Test Validation Criteria
- [ ] Response times <100ms for CLI operations
- [ ] Memory usage <500MB during normal operation
- [ ] CPU usage <50% during setup operations
- [ ] No memory leaks detected
- [ ] Performance scales linearly with load
- [ ] Benchmarks meet requirements

### Phase 6: Security Testing (45 minutes)

#### 6.1 Vulnerability Scanning
```bash
# Run security scan
npm run test:security:scan

# Check dependencies
npm run test:security:dependencies

# Scan configuration files
npm run test:security:config
```

#### 6.2 Penetration Testing
```bash
# Test command injection prevention
npm run test:security:injection

# Test privilege escalation prevention
npm run test:security:privileges

# Test data exposure prevention
npm run test:security:data
```

#### 6.3 Compliance Testing
```bash
# Test SOC2 compliance
npm run test:compliance:soc2

# Test HIPAA compliance
npm run test:compliance:hipaa

# Test GDPR compliance
npm run test:compliance:gdpr
```

#### 6.4 Security Test Validation Criteria
- [ ] No critical vulnerabilities found
- [ ] Command injection prevented
- [ ] Privilege escalation blocked
- [ ] Sensitive data protected
- [ ] Compliance requirements met
- [ ] Security headers configured
- [ ] SSL/TLS properly configured

### Phase 7: Cross-Platform Testing (30 minutes)

#### 7.1 Platform-Specific Tests
```bash
# Test on Linux
npm run test:platform:linux

# Test on macOS
npm run test:platform:macos

# Test on Windows
npm run test:platform:windows

# Test on WSL
npm run test:platform:wsl
```

#### 7.2 Container Testing
```bash
# Test in Docker containers
npm run test:container:docker

# Test with different base images
npm run test:container:images

# Test container networking
npm run test:container:network
```

#### 7.3 Cross-Platform Validation Criteria
- [ ] All platforms supported
- [ ] Platform-specific features work
- [ ] File paths handled correctly
- [ ] Permissions managed properly
- [ ] Container deployments work
- [ ] WSL integration functional

## 📊 Test Results and Reporting

### Test Result Analysis
```bash
# Generate comprehensive test report
npm run test:report

# View test results dashboard
npm run test:dashboard

# Export test results
npm run test:export -- --format=json
npm run test:export -- --format=html
npm run test:export -- --format=pdf
```

### Test Metrics Dashboard
```
Test Results Dashboard
======================

Unit Tests:        ✅ PASSED (245/245)
Integration Tests: ✅ PASSED (67/67)
E2E Tests:         ✅ PASSED (23/23)
Performance Tests: ✅ PASSED (12/12)
Security Tests:    ✅ PASSED (45/45)

Code Coverage:     94.2%
Performance Score: A+ (98/100)
Security Score:    A  (95/100)

Total Tests:       392
Passed:           392
Failed:             0
Skipped:            0

Test Duration:     45m 32s
```

### Failure Analysis and Debugging
```bash
# Debug failed tests
npm run test:debug -- --testId=failed-test-123

# Re-run failed tests only
npm run test:rerun-failed

# Generate failure analysis report
npm run test:analyze-failures
```

## 🔧 Troubleshooting Testing Issues

### Common Test Failures

#### Database Connection Issues
```bash
# Check PostgreSQL status
systemctl status postgresql
sudo systemctl start postgresql

# Verify database exists
psql -l | grep pern_test

# Reset test database
npm run db:reset:test
```

#### Port Conflicts
```bash
# Find processes using ports
lsof -i :5432
lsof -i :6379
lsof -i :5000

# Kill conflicting processes
kill -9 <PID>

# Change test ports
export TEST_DB_PORT=5433
export TEST_REDIS_PORT=6380
```

#### Permission Issues
```bash
# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker

# Fix file permissions
chmod +x src/index.js
chmod +x scripts/test-runner.sh
```

#### Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Run tests with less parallelism
npm run test:unit -- --maxWorkers=2
```

#### Network Issues
```bash
# Check network connectivity
ping google.com

# Configure proxy if needed
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
```

## 🎯 Test Success Criteria

### Overall Test Suite Requirements
- [ ] **Unit Tests**: >90% code coverage, 0 failures
- [ ] **Integration Tests**: All component interactions work
- [ ] **E2E Tests**: All user workflows complete successfully
- [ ] **Performance Tests**: Meet performance benchmarks
- [ ] **Security Tests**: No critical vulnerabilities
- [ ] **Cross-Platform Tests**: All platforms supported

### Quality Gates
1. **Gate 1**: Unit tests pass with >90% coverage
2. **Gate 2**: Integration tests pass on all platforms
3. **Gate 3**: E2E tests pass in all browsers
4. **Gate 4**: Performance benchmarks met
5. **Gate 5**: Security scan passes
6. **Gate 6**: Cross-platform compatibility verified

### Production Readiness Checklist
- [ ] All tests pass in CI/CD pipeline
- [ ] Performance benchmarks documented
- [ ] Security vulnerabilities addressed
- [ ] Cross-platform compatibility verified
- [ ] Documentation updated with test results
- [ ] Test automation integrated into development workflow

## 🚀 Continuous Testing Integration

### CI/CD Pipeline Integration
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:unit:coverage
      - run: npm run test:integration
      - run: npm run test:e2e:headless
      - run: npm run test:security
      - run: npm run test:performance
```

### Automated Test Execution
```bash
# Run full test suite
npm run test:all

# Run tests in watch mode during development
npm run test:watch

# Run tests before commits
npm run test:precommit

# Run tests in CI mode
npm run test:ci
```

## 📈 Test Maintenance and Evolution

### Test Suite Maintenance
- **Weekly**: Review and update failing tests
- **Monthly**: Update test dependencies and frameworks
- **Quarterly**: Review test coverage and add missing tests
- **Annually**: Complete test suite refactoring if needed

### Test Data Management
- **Test Data**: Use factories and fixtures for consistent data
- **Database Seeding**: Automated test data setup and teardown
- **Mock Services**: Use mocks for external dependencies
- **Data Cleanup**: Automatic cleanup after test execution

### Performance Benchmarking
- **Baseline**: Establish performance baselines
- **Regression Detection**: Alert on performance regressions
- **Trend Analysis**: Track performance over time
- **Optimization**: Identify and optimize bottlenecks

---

## 🎯 Quick Start Testing Commands

```bash
# Complete test suite (recommended for production readiness)
npm run test:all

# Quick validation (for development)
npm run test:quick

# Specific component testing
npm run test:component -- --component=postgresql
npm run test:component -- --component=docker

# Performance validation
npm run test:performance:baseline

# Security validation
npm run test:security:audit
```

This testing guide ensures comprehensive validation of the PERN Setup Tool's functionality, performance, security, and reliability across all supported platforms and use cases.