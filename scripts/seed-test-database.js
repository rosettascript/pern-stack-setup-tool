#!/usr/bin/env node

/**
 * PERN Setup Tool - Test Database Seeder
 * Seeds the test database with sample data for testing
 */

const { Client } = require('pg');
require('dotenv').config();

async function seedTestDatabase() {
  console.log('🌱 Seeding test database...');

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

    // Create tables
    await createTables(client);

    // Seed data
    await seedUsers(client);
    await seedPosts(client);
    await seedCategories(client);
    await seedComments(client);

    console.log('✅ Test database seeded successfully');

  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

async function createTables(client) {
  console.log('📋 Creating tables...');

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
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
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const createPostsTable = `
    CREATE TABLE IF NOT EXISTS posts (
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
    CREATE TABLE IF NOT EXISTS comments (
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

  console.log('✅ Tables created');
}

async function seedUsers(client) {
  console.log('👥 Seeding users...');

  const bcrypt = require('bcrypt');
  const saltRounds = 12;

  const users = [
    {
      username: 'admin',
      email: 'admin@test.com',
      password: 'Admin123!',
      role: 'admin'
    },
    {
      username: 'moderator',
      email: 'moderator@test.com',
      password: 'Mod123!',
      role: 'moderator'
    },
    {
      username: 'user1',
      email: 'user1@test.com',
      password: 'User123!',
      role: 'user'
    },
    {
      username: 'user2',
      email: 'user2@test.com',
      password: 'User123!',
      role: 'user'
    }
  ];

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, saltRounds);

    await client.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING',
      [user.username, user.email, passwordHash, user.role]
    );
  }

  console.log('✅ Users seeded');
}

async function seedCategories(client) {
  console.log('📂 Seeding categories...');

  const categories = [
    { name: 'Technology', slug: 'technology', description: 'Tech news and tutorials' },
    { name: 'Lifestyle', slug: 'lifestyle', description: 'Life hacks and tips' },
    { name: 'Travel', slug: 'travel', description: 'Travel guides and stories' },
    { name: 'Food', slug: 'food', description: 'Recipes and food reviews' }
  ];

  for (const category of categories) {
    await client.query(
      'INSERT INTO categories (name, slug, description) VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING',
      [category.name, category.slug, category.description]
    );
  }

  console.log('✅ Categories seeded');
}

async function seedPosts(client) {
  console.log('📝 Seeding posts...');

  const posts = [
    {
      title: 'Getting Started with PERN Stack',
      slug: 'getting-started-pern-stack',
      content: 'Learn how to build modern web applications with PostgreSQL, Express, React, and Node.js...',
      excerpt: 'A comprehensive guide to getting started with the PERN stack',
      author_username: 'admin',
      category_name: 'Technology',
      status: 'published'
    },
    {
      title: '10 Tips for Better Code Quality',
      slug: '10-tips-better-code-quality',
      content: 'Writing clean, maintainable code is essential for any developer...',
      excerpt: 'Essential tips for improving code quality and maintainability',
      author_username: 'moderator',
      category_name: 'Technology',
      status: 'published'
    },
    {
      title: 'Healthy Eating Habits',
      slug: 'healthy-eating-habits',
      content: 'Maintaining a healthy diet doesn\'t have to be complicated...',
      excerpt: 'Simple tips for developing healthy eating habits',
      author_username: 'user1',
      category_name: 'Lifestyle',
      status: 'published'
    },
    {
      title: 'Hidden Gems in Southeast Asia',
      slug: 'hidden-gems-southeast-asia',
      content: 'Discover amazing places that most tourists never see...',
      excerpt: 'Explore lesser-known destinations in Southeast Asia',
      author_username: 'user2',
      category_name: 'Travel',
      status: 'draft'
    }
  ];

  for (const post of posts) {
    // Get author ID
    const authorResult = await client.query('SELECT id FROM users WHERE username = $1', [post.author_username]);
    const authorId = authorResult.rows[0]?.id;

    // Get category ID
    const categoryResult = await client.query('SELECT id FROM categories WHERE name = $1', [post.category_name]);
    const categoryId = categoryResult.rows[0]?.id;

    if (authorId && categoryId) {
      const publishedAt = post.status === 'published' ? new Date() : null;

      await client.query(
        'INSERT INTO posts (title, slug, content, excerpt, author_id, category_id, status, published_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (slug) DO NOTHING',
        [post.title, post.slug, post.content, post.excerpt, authorId, categoryId, post.status, publishedAt]
      );
    }
  }

  console.log('✅ Posts seeded');
}

async function seedComments(client) {
  console.log('💬 Seeding comments...');

  // Get some post IDs
  const postsResult = await client.query('SELECT id FROM posts LIMIT 2');
  const postIds = postsResult.rows.map(row => row.id);

  // Get some user IDs
  const usersResult = await client.query('SELECT id FROM users LIMIT 2');
  const userIds = usersResult.rows.map(row => row.id);

  if (postIds.length > 0 && userIds.length > 0) {
    const comments = [
      {
        content: 'Great article! Very helpful for beginners.',
        author_id: userIds[0],
        post_id: postIds[0],
        is_approved: true
      },
      {
        content: 'Thanks for sharing this information.',
        author_id: userIds[1],
        post_id: postIds[0],
        is_approved: true
      },
      {
        content: 'I learned something new today!',
        author_id: userIds[0],
        post_id: postIds[1],
        is_approved: false
      }
    ];

    for (const comment of comments) {
      await client.query(
        'INSERT INTO comments (content, author_id, post_id, is_approved) VALUES ($1, $2, $3, $4)',
        [comment.content, comment.author_id, comment.post_id, comment.is_approved]
      );
    }
  }

  console.log('✅ Comments seeded');
}

// Run seeder if called directly
if (require.main === module) {
  seedTestDatabase().catch(console.error);
}

module.exports = { seedTestDatabase };