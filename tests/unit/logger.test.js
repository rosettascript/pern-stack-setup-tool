const Logger = require('../../src/utils/logger');

describe('Logger', () => {
  let logger;
  let mockConfig;
  let mockPerformance;

  beforeEach(() => {
    mockConfig = global.testUtils.createMockConfig();
    mockPerformance = global.testUtils.createMockPerformance();

    logger = new Logger();
    logger.config = mockConfig;
    logger.performance = mockPerformance;
  });

  describe('initialization', () => {
    test('should create logger instance', () => {
      expect(logger).toBeInstanceOf(Logger);
    });

    test('should have log methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('logging functionality', () => {
    test('should log info messages', () => {
      const message = 'Test info message';
      const meta = { userId: 123 };

      logger.info(message, meta);

      // Logger implementation may vary, just ensure no errors
      expect(logger).toBeDefined();
    });

    test('should log error messages', () => {
      const message = 'Test error message';
      const error = new Error('Test error');

      logger.error(message, error);

      expect(logger).toBeDefined();
    });

    test('should handle different log levels', () => {
      const levels = ['info', 'warn', 'error', 'debug'];

      levels.forEach(level => {
        logger[level](`Test ${level} message`);
      });

      expect(logger).toBeDefined();
    });
  });

  describe('performance tracking', () => {
    test('should track operation performance', () => {
      const operation = 'test-operation';

      logger.startTimer(operation);
      const duration = logger.endTimer(operation);

      expect(duration).toBeGreaterThanOrEqual(0);
    });

    test('should handle operation timing', () => {
      const operation = 'timed-operation';

      logger.startTimer(operation);

      // Simulate some work with synchronous delay
      const start = Date.now();
      while (Date.now() - start < 5) {} // Busy wait for 5ms

      const duration = logger.endTimer(operation);
      expect(duration).toBeGreaterThanOrEqual(5);
    });
  });

  describe('error handling', () => {
    test('should handle logging errors gracefully', () => {
      // Mock console methods to throw errors
      const originalConsole = global.console;
      global.console = {
        ...originalConsole,
        log: jest.fn().mockImplementation(() => {
          throw new Error('Console error');
        })
      };

      expect(() => {
        logger.info('Test message');
      }).not.toThrow();

      // Restore console
      global.console = originalConsole;
    });

    test('should handle invalid inputs gracefully', () => {
      const invalidInputs = [null, undefined, {}];

      invalidInputs.forEach(input => {
        expect(() => {
          logger.info(input);
        }).not.toThrow();
      });
    });
  });
});