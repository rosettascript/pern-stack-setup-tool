/**
 * Database Configuration
 * PostgreSQL connection and initialization
 */

const { Pool } = require('pg');
const winston = require('winston');

// Configure Winston logger for database
const dbLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'database' },
  transports: [
    new winston.transports.File({ filename: 'logs/database.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  dbLogger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || '{{databaseName}}',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '1234',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Create connection pool
const pool = new Pool(dbConfig);

// Handle pool events
pool.on('connect', (client) => {
  dbLogger.info('New client connected to database');
});

pool.on('error', (err, client) => {
  dbLogger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    dbLogger.info('Database connection test successful');
    client.release();
    return true;
  } catch (error) {
    dbLogger.error('Database connection test failed:', error.message);
    return false;
  }
}

// Initialize database with required tables
async function initDatabase() {
  try {
    dbLogger.info('Initializing database...');

    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to database');
    }

    // Create tables
    await createTables();

    // Create indexes
    await createIndexes();

    // Create triggers
    await createTriggers();

    dbLogger.info('Database initialized successfully');
  } catch (error) {
    dbLogger.error('Database initialization failed:', error);
    throw error;
  }
}

// Create database tables
async function createTables() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        phone VARCHAR(20),
        role VARCHAR(20) DEFAULT 'customer',
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        image_url VARCHAR(500),
        parent_id UUID REFERENCES categories(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        compare_price DECIMAL(10,2),
        cost_price DECIMAL(10,2),
        sku VARCHAR(100) UNIQUE,
        barcode VARCHAR(100),
        quantity INTEGER DEFAULT 0,
        track_quantity BOOLEAN DEFAULT true,
        weight DECIMAL(8,2),
        weight_unit VARCHAR(10) DEFAULT 'kg',
        requires_shipping BOOLEAN DEFAULT true,
        taxable BOOLEAN DEFAULT true,
        status VARCHAR(20) DEFAULT 'active',
        category_id UUID REFERENCES categories(id),
        images TEXT[],
        tags TEXT[],
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Product variants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        value VARCHAR(255) NOT NULL,
        price_modifier DECIMAL(10,2) DEFAULT 0,
        quantity INTEGER DEFAULT 0,
        sku VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Shopping cart table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        session_id VARCHAR(255),
        product_id UUID NOT NULL REFERENCES products(id),
        variant_id UUID REFERENCES product_variants(id),
        quantity INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product_id, variant_id),
        UNIQUE(session_id, product_id, variant_id)
      )
    `);

    // Orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(50) UNIQUE NOT NULL,
        user_id UUID REFERENCES users(id),
        status VARCHAR(30) DEFAULT 'pending',
        subtotal DECIMAL(10,2) NOT NULL,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        shipping_amount DECIMAL(10,2) DEFAULT 0,
        discount_amount DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        payment_status VARCHAR(20) DEFAULT 'pending',
        payment_method VARCHAR(50),
        shipping_address JSONB,
        billing_address JSONB,
        notes TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Order items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id),
        variant_id UUID REFERENCES product_variants(id),
        product_name VARCHAR(255) NOT NULL,
        product_sku VARCHAR(100),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Reviews table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        order_id UUID REFERENCES orders(id),
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        title VARCHAR(255),
        comment TEXT,
        images TEXT[],
        verified BOOLEAN DEFAULT false,
        helpful_votes INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Addresses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) DEFAULT 'shipping',
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        company VARCHAR(100),
        address_line_1 VARCHAR(255) NOT NULL,
        address_line_2 VARCHAR(255),
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100),
        postal_code VARCHAR(20) NOT NULL,
        country VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query('COMMIT');
    dbLogger.info('Database tables created successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    dbLogger.error('Failed to create tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Create database indexes
async function createIndexes() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Users indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)');

    // Products indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_status ON products(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_price ON products(price)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_products_tags ON products USING gin(tags)');

    // Orders indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number)');

    // Reviews indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating)');

    // Cart indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cart_session ON cart_items(session_id)');

    await client.query('COMMIT');
    dbLogger.info('Database indexes created successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    dbLogger.error('Failed to create indexes:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Create database triggers
async function createTriggers() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Apply updated_at triggers
    const tables = ['users', 'categories', 'products', 'cart_items', 'orders', 'reviews', 'addresses'];
    for (const table of tables) {
      await client.query(`
        DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
        CREATE TRIGGER update_${table}_updated_at
          BEFORE UPDATE ON ${table}
          FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);
    }

    await client.query('COMMIT');
    dbLogger.info('Database triggers created successfully');

  } catch (error) {
    await client.query('ROLLBACK');
    dbLogger.error('Failed to create triggers:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Query helper functions
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    dbLogger.debug('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    dbLogger.error('Query failed', { text, duration, error: error.message });
    throw error;
  }
}

async function getClient() {
  const client = await pool.connect();
  const query = client.query;
  const release = client.release;

  // Set a timeout of 5 seconds, after which we will log this client's last query
  const timeout = setTimeout(() => {
    dbLogger.error('A client has been checked out for more than 5 seconds!');
    dbLogger.error(`The last executed query on this client was: ${client.lastQuery}`);
  }, 5000);

  // Monkey patch the query method to keep track of the last query executed
  client.query = (...args) => {
    client.lastQuery = args;
    return query.apply(client, args);
  };

  client.release = () => {
    clearTimeout(timeout);
    // Set the methods back to their old un-monkey-patched version
    client.query = query;
    client.release = release;
    return release.apply(client);
  };

  return client;
}

module.exports = {
  pool,
  query,
  getClient,
  initDatabase,
  testConnection,
};