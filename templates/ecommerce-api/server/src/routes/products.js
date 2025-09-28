/**
 * Products Routes
 * Product management, search, filtering, and inventory
 */

const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { query: dbQuery } = require('../config/database');
const { optionalAuth, requireAdmin, requireSeller } = require('../middleware/auth');

const router = express.Router();

/**
 * Get all products with filtering and pagination
 */
router.get('/', optionalAuth, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('category').optional().isUUID(),
  query('search').optional().trim().isLength({ min: 1, max: 100 }),
  query('minPrice').optional().isFloat({ min: 0 }),
  query('maxPrice').optional().isFloat({ min: 0 }),
  query('status').optional().isIn(['active', 'inactive']),
  query('sortBy').optional().isIn(['name', 'price', 'created_at', 'rating']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      category,
      search,
      minPrice,
      maxPrice,
      status = 'active',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE clause
    const whereConditions = ['status = $1'];
    const values = [status];
    let paramCount = 2;

    if (category) {
      whereConditions.push(`category_id = $${paramCount++}`);
      values.push(category);
    }

    if (search) {
      whereConditions.push(`(name ILIKE $${paramCount} OR description ILIKE $${paramCount})`);
      values.push(`%${search}%`);
      paramCount++;
    }

    if (minPrice !== undefined) {
      whereConditions.push(`price >= $${paramCount++}`);
      values.push(minPrice);
    }

    if (maxPrice !== undefined) {
      whereConditions.push(`price <= $${paramCount++}`);
      values.push(maxPrice);
    }

    const whereClause = whereConditions.join(' AND ');

    // Build ORDER BY clause
    const validSortColumns = {
      name: 'name',
      price: 'price',
      created_at: 'created_at',
      rating: 'rating'
    };

    const sortColumn = validSortColumns[sortBy] || 'created_at';
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM products WHERE ${whereClause}`;
    const countResult = await dbQuery(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalCount / limit);

    // Get products
    const productsQuery = `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.compare_price,
        p.sku,
        p.quantity,
        p.track_quantity,
        p.status,
        p.images,
        p.tags,
        p.created_at,
        p.updated_at,
        c.name as category_name,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN reviews r ON p.id = r.product_id AND r.created_at >= CURRENT_DATE - INTERVAL '30 days'
      WHERE ${whereClause}
      GROUP BY p.id, c.name
      ORDER BY ${sortColumn} ${orderDirection}
      LIMIT $${paramCount++} OFFSET $${paramCount++}
    `;

    values.push(limit, offset);

    const productsResult = await dbQuery(productsQuery, values);

    // Format products
    const products = productsResult.rows.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: parseFloat(product.price),
      comparePrice: product.compare_price ? parseFloat(product.compare_price) : null,
      sku: product.sku,
      quantity: product.quantity,
      trackQuantity: product.track_quantity,
      status: product.status,
      images: product.images || [],
      tags: product.tags || [],
      category: product.category_name,
      averageRating: parseFloat(product.average_rating),
      reviewCount: parseInt(product.review_count),
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    }));

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      error: 'Failed to get products',
      message: 'An error occurred while retrieving products'
    });
  }
});

/**
 * Get single product by ID
 */
router.get('/:id', optionalAuth, [
  param('id').isUUID(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;

    const productQuery = `
      SELECT
        p.*,
        c.name as category_name,
        c.description as category_description,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count,
        json_agg(
          DISTINCT jsonb_build_object(
            'id', pv.id,
            'name', pv.name,
            'value', pv.value,
            'price_modifier', pv.price_modifier,
            'quantity', pv.quantity,
            'sku', pv.sku
          )
        ) FILTER (WHERE pv.id IS NOT NULL) as variants
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      LEFT JOIN reviews r ON p.id = r.product_id
      WHERE p.id = $1
      GROUP BY p.id, c.name, c.description
    `;

    const result = await dbQuery(productQuery, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        message: 'The requested product does not exist'
      });
    }

    const product = result.rows[0];

    // Format response
    const formattedProduct = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: parseFloat(product.price),
      comparePrice: product.compare_price ? parseFloat(product.compare_price) : null,
      costPrice: product.cost_price ? parseFloat(product.cost_price) : null,
      sku: product.sku,
      barcode: product.barcode,
      quantity: product.quantity,
      trackQuantity: product.track_quantity,
      weight: product.weight ? parseFloat(product.weight) : null,
      weightUnit: product.weight_unit,
      requiresShipping: product.requires_shipping,
      taxable: product.taxable,
      status: product.status,
      category: {
        name: product.category_name,
        description: product.category_description,
      },
      images: product.images || [],
      tags: product.tags || [],
      variants: product.variants || [],
      averageRating: parseFloat(product.average_rating),
      reviewCount: parseInt(product.review_count),
      metadata: product.metadata || {},
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    };

    res.json({ product: formattedProduct });

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      error: 'Failed to get product',
      message: 'An error occurred while retrieving the product'
    });
  }
});

/**
 * Create new product (Admin/Seller only)
 */
router.post('/', requireSeller, [
  body('name').trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('price').isFloat({ min: 0 }),
  body('comparePrice').optional().isFloat({ min: 0 }),
  body('sku').optional().trim().isLength({ min: 1, max: 100 }),
  body('quantity').optional().isInt({ min: 0 }),
  body('trackQuantity').optional().isBoolean(),
  body('categoryId').optional().isUUID(),
  body('images').optional().isArray(),
  body('tags').optional().isArray(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      name,
      description,
      price,
      comparePrice,
      sku,
      quantity = 0,
      trackQuantity = true,
      categoryId,
      images = [],
      tags = [],
      weight,
      weightUnit = 'kg',
      requiresShipping = true,
      taxable = true,
      metadata = {},
    } = req.body;

    // Check if SKU already exists
    if (sku) {
      const existingSku = await dbQuery('SELECT id FROM products WHERE sku = $1', [sku]);
      if (existingSku.rows.length > 0) {
        return res.status(409).json({
          error: 'SKU already exists',
          message: 'A product with this SKU already exists'
        });
      }
    }

    // Insert product
    const result = await dbQuery(`
      INSERT INTO products (
        name, description, price, compare_price, sku, quantity,
        track_quantity, weight, weight_unit, requires_shipping, taxable,
        category_id, images, tags, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      name, description, price, comparePrice, sku, quantity,
      trackQuantity, weight, weightUnit, requiresShipping, taxable,
      categoryId, images, tags, metadata
    ]);

    const product = result.rows[0];

    res.status(201).json({
      message: 'Product created successfully',
      product: {
        id: product.id,
        name: product.name,
        description: product.description,
        price: parseFloat(product.price),
        sku: product.sku,
        quantity: product.quantity,
        status: product.status,
        createdAt: product.created_at,
      },
    });

  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      error: 'Failed to create product',
      message: 'An error occurred while creating the product'
    });
  }
});

/**
 * Update product (Admin/Seller only)
 */
router.put('/:id', requireSeller, [
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('price').optional().isFloat({ min: 0 }),
  body('comparePrice').optional().isFloat({ min: 0 }),
  body('sku').optional().trim().isLength({ min: 1, max: 100 }),
  body('quantity').optional().isInt({ min: 0 }),
  body('trackQuantity').optional().isBoolean(),
  body('categoryId').optional().isUUID(),
  body('status').optional().isIn(['active', 'inactive']),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;

    // Check if product exists
    const existingProduct = await dbQuery('SELECT id FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        message: 'The product you are trying to update does not exist'
      });
    }

    // Check SKU uniqueness if updating SKU
    if (updates.sku) {
      const existingSku = await dbQuery('SELECT id FROM products WHERE sku = $1 AND id != $2', [updates.sku, id]);
      if (existingSku.rows.length > 0) {
        return res.status(409).json({
          error: 'SKU already exists',
          message: 'Another product with this SKU already exists'
        });
      }
    }

    // Build update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      updateFields.push(`${dbKey} = $${paramCount++}`);
      values.push(updates[key]);
    });

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const updateQuery = `
      UPDATE products
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await dbQuery(updateQuery, values);
    const product = result.rows[0];

    res.json({
      message: 'Product updated successfully',
      product: {
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        sku: product.sku,
        quantity: product.quantity,
        status: product.status,
        updatedAt: product.updated_at,
      },
    });

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      error: 'Failed to update product',
      message: 'An error occurred while updating the product'
    });
  }
});

/**
 * Delete product (Admin only)
 */
router.delete('/:id', requireAdmin, [
  param('id').isUUID(),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;

    // Check if product exists
    const existingProduct = await dbQuery('SELECT id FROM products WHERE id = $1', [id]);
    if (existingProduct.rows.length === 0) {
      return res.status(404).json({
        error: 'Product not found',
        message: 'The product you are trying to delete does not exist'
      });
    }

    // Delete product (cascade will handle related records)
    await dbQuery('DELETE FROM products WHERE id = $1', [id]);

    res.json({
      message: 'Product deleted successfully',
    });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      error: 'Failed to delete product',
      message: 'An error occurred while deleting the product'
    });
  }
});

/**
 * Get product categories
 */
router.get('/categories/list', async (req, res) => {
  try {
    const result = await dbQuery(`
      SELECT
        id,
        name,
        description,
        image_url,
        parent_id,
        (
          SELECT COUNT(*)
          FROM products p
          WHERE p.category_id = c.id AND p.status = 'active'
        ) as product_count
      FROM categories c
      ORDER BY name
    `);

    const categories = result.rows.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      imageUrl: category.image_url,
      parentId: category.parent_id,
      productCount: parseInt(category.product_count),
    }));

    res.json({ categories });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      error: 'Failed to get categories',
      message: 'An error occurred while retrieving categories'
    });
  }
});

/**
 * Get product reviews
 */
router.get('/:id/reviews', [
  param('id').isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Get reviews
    const reviewsQuery = `
      SELECT
        r.id,
        r.rating,
        r.title,
        r.comment,
        r.images,
        r.verified,
        r.helpful_votes,
        r.created_at,
        u.first_name,
        u.last_name
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      WHERE r.product_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const reviewsResult = await dbQuery(reviewsQuery, [id, limit, offset]);

    // Get total count
    const countResult = await dbQuery('SELECT COUNT(*) FROM reviews WHERE product_id = $1', [id]);
    const totalCount = parseInt(countResult.rows[0].count);

    const reviews = reviewsResult.rows.map(review => ({
      id: review.id,
      rating: review.rating,
      title: review.title,
      comment: review.comment,
      images: review.images || [],
      verified: review.verified,
      helpfulVotes: review.helpful_votes,
      createdAt: review.created_at,
      author: {
        firstName: review.first_name,
        lastName: review.last_name,
      },
    }));

    res.json({
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });

  } catch (error) {
    console.error('Get product reviews error:', error);
    res.status(500).json({
      error: 'Failed to get reviews',
      message: 'An error occurred while retrieving product reviews'
    });
  }
});

/**
 * Search products
 */
router.get('/search/suggestions', [
  query('q').trim().isLength({ min: 1, max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 20 }),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { q: searchQuery, limit = 10 } = req.query;

    const result = await dbQuery(`
      SELECT
        id,
        name,
        price,
        images,
        category_id
      FROM products
      WHERE status = 'active'
        AND (name ILIKE $1 OR description ILIKE $1)
      ORDER BY
        CASE WHEN name ILIKE $2 THEN 1 ELSE 2 END,
        name
      LIMIT $3
    `, [`%${searchQuery}%`, `${searchQuery}%`, limit]);

    const suggestions = result.rows.map(product => ({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price),
      image: product.images ? product.images[0] : null,
      categoryId: product.category_id,
    }));

    res.json({ suggestions });

  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: 'An error occurred while searching products'
    });
  }
});

module.exports = router;