#!/usr/bin/env node

/**
 * PERN Setup Tool - Test Database Reset
 * Resets the test database by dropping and recreating tables
 */

const { Client } = require('pg');
require('dotenv').config();

async function resetTestDatabase() {
  console.log('🔄 Resetting test database...');

  // Test database configuration
  const testDbConfig = {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: process.env.TEST_DB_PORT || 5432,
    database: process.env.TEST_DB_NAME || 'pern_test',
    user: process.env.TEST_DB_USER || 'postgres',
    password: process.env.TEST_DB_PASSWORD || '1234',
    ssl: process.env.TEST_DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  };

  const client = new Client(testDbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to test database');

    // Drop existing tables (in reverse order due to foreign keys)
    await dropTables(client);

    // Recreate tables
    await createTables(client);

    console.log('✅ Test database reset successfully');

  } catch (error) {
    console.error('❌ Database reset failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function dropTables(client) {
  console.log('🗑️  Dropping existing tables...');

  const tables = ['comments', 'posts', 'categories', 'users'];

  for (const table of tables) {
    try {
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
      console.log(`   Dropped table: ${table}`);
    } catch (error) {
      console.warn(`   Warning: Could not drop table ${table}:`, error.message);
    }
  }

  console.log('✅ Tables dropped');
}

async function createTables(client) {
  console.log('📋 Recreating tables...');

  const createUsersTable = `
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createCategoriesTable = `
    CREATE TABLE categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createPostsTable = `
    CREATE TABLE posts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) UNIQUE NOT NULL,
      content TEXT NOT NULL,
      excerpt TEXT,
      author_id INTEGER REFERENCES users(id),
      category_id INTEGER REFERENCES categories(id),
      status VARCHAR(20) DEFAULT 'draft',
      published_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createCommentsTable = `
    CREATE TABLE comments (
      id SERIAL PRIMARY KEY,
      content TEXT NOT NULL,
      author_id INTEGER REFERENCES users(id),
      post_id INTEGER REFERENCES posts(id),
      parent_id INTEGER REFERENCES comments(id),
      is_approved BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await client.query(createUsersTable);
  await client.query(createCategoriesTable);
  await client.query(createPostsTable);
  await client.query(createCommentsTable);

  console.log('✅ Tables recreated');
}

// Run reset if called directly
if (require.main === module) {
  resetTestDatabase().catch(console.error);
}

module.exports = { resetTestDatabase };