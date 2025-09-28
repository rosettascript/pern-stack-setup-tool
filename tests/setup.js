// Jest test setup file
// Configures test environment and global test utilities

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests

// Mock external dependencies that might not be available in test environment
jest.mock('child-process-promise', () => ({
  exec: jest.fn().mockResolvedValue({ stdout: '', stderr: '' }),
  spawn: jest.fn()
}));

// Mock Docker if not available
jest.mock('dockerode', () => {
  return jest.fn().mockImplementation(() => ({
    listContainers: jest.fn().mockResolvedValue([]),
    createContainer: jest.fn().mockResolvedValue({
      start: jest.fn().mockResolvedValue(),
      stop: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue()
    }),
    getContainer: jest.fn().mockReturnValue({
      inspect: jest.fn().mockResolvedValue({}),
      start: jest.fn().mockResolvedValue(),
      stop: jest.fn().mockResolvedValue(),
      remove: jest.fn().mockResolvedValue()
    })
  }));
});

// Global test utilities
global.testUtils = {
  // Create mock configuration
  createMockConfig: () => ({
    get: jest.fn(),
    set: jest.fn(),
    save: jest.fn().mockResolvedValue(),
    load: jest.fn().mockResolvedValue()
  }),

  // Create mock logger
  createMockLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }),

  // Create mock performance monitor
  createMockPerformance: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    getMetrics: jest.fn().mockReturnValue({}),
    generateReport: jest.fn().mockReturnValue({})
  }),

  // Clean up after each test
  cleanup: async () => {
    jest.clearAllMocks();
    // Add any additional cleanup logic here
  }
};

// Setup and teardown
beforeAll(async () => {
  // Global setup
});

afterAll(async () => {
  // Global cleanup
});

beforeEach(async () => {
  // Per-test setup
});

afterEach(async () => {
  // Per-test cleanup
  await global.testUtils.cleanup();
});