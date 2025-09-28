/**
 * Authentication Middleware
 * JWT token validation and user authentication
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const winston = require('winston');

// Configure logger
const authLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'auth-middleware' },
  transports: [
    new winston.transports.File({ filename: 'logs/auth.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  authLogger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

/**
 * Authenticate JWT token middleware
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      authLogger.warn('No token provided', { ip: req.ip, path: req.path });
      return res.status(401).json({
        error: 'Access token required',
        message: 'Please provide a valid authentication token'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const result = await query(
      'SELECT id, email, first_name, last_name, role, email_verified FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      authLogger.warn('User not found for token', { userId: decoded.userId, ip: req.ip });
      return res.status(401).json({
        error: 'Invalid token',
        message: 'User associated with this token no longer exists'
      });
    }

    // Attach user to request
    req.user = result.rows[0];
    req.userId = decoded.userId;

    authLogger.debug('Token authenticated successfully', {
      userId: req.user.id,
      email: req.user.email,
      role: req.user.role,
      path: req.path
    });

    next();

  } catch (error) {
    authLogger.error('Token authentication failed', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'The provided token is invalid or malformed'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your authentication token has expired. Please login again.'
      });
    }

    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const result = await query(
        'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (result.rows.length > 0) {
        req.user = result.rows[0];
        req.userId = decoded.userId;
      }
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    authLogger.debug('Optional auth failed, continuing without user', {
      error: error.message,
      ip: req.ip
    });
    next();
  }
};

/**
 * Admin role authorization middleware
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please login to access this resource'
    });
  }

  if (req.user.role !== 'admin') {
    authLogger.warn('Unauthorized admin access attempt', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path,
      ip: req.ip
    });

    return res.status(403).json({
      error: 'Insufficient permissions',
      message: 'Admin privileges required to access this resource'
    });
  }

  next();
};

/**
 * Seller/vendor role authorization middleware
 */
const requireSeller = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please login to access this resource'
    });
  }

  if (!['admin', 'seller'].includes(req.user.role)) {
    authLogger.warn('Unauthorized seller access attempt', {
      userId: req.user.id,
      role: req.user.role,
      path: req.path,
      ip: req.ip
    });

    return res.status(403).json({
      error: 'Insufficient permissions',
      message: 'Seller privileges required to access this resource'
    });
  }

  next();
};

/**
 * Generate JWT token
 */
const generateToken = (userId, expiresIn = '24h') => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

/**
 * Verify refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

/**
 * Rate limiting for auth endpoints
 */
const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
};

/**
 * Password reset token generation
 */
const generatePasswordResetToken = (userId) => {
  return jwt.sign(
    { userId, type: 'password_reset' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

/**
 * Verify password reset token
 */
const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'password_reset') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired password reset token');
  }
};

/**
 * Email verification token generation
 */
const generateEmailVerificationToken = (userId) => {
  return jwt.sign(
    { userId, type: 'email_verification' },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * Verify email verification token
 */
const verifyEmailVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'email_verification') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired email verification token');
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requireSeller,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  generateEmailVerificationToken,
  verifyEmailVerificationToken,
  authRateLimit,
};