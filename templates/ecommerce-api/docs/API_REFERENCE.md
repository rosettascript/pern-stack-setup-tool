# E-commerce API Reference

## Base URL
```
http://localhost:5000/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

### Token Refresh
Tokens expire after 24 hours. Use the refresh endpoint to get new tokens:
```javascript
const response = await fetch('/api/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken })
});
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error type",
  "message": "Error description",
  "details": { ... }
}
```

---

## Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer",
    "emailVerified": false
  },
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here",
  "requiresEmailVerification": true
}
```

**Error Responses:**
- `400` - Validation failed
- `409` - User already exists
- `500` - Server error

### POST /auth/login
Authenticate user login.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "customer",
    "emailVerified": true
  },
  "token": "jwt_token_here",
  "refreshToken": "refresh_token_here"
}
```

### POST /auth/refresh
Refresh access token.

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response (200):**
```json
{
  "token": "new_jwt_token",
  "refreshToken": "new_refresh_token"
}
```

### POST /auth/forgot-password
Request password reset.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account with this email exists, a password reset link has been sent."
}
```

### POST /auth/reset-password
Reset password with token.

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "new_secure_password"
}
```

**Response (200):**
```json
{
  "message": "Password reset successfully"
}
```

### GET /auth/profile
Get current user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "customer",
    "emailVerified": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### PUT /auth/profile
Update user profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1987654321"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+1987654321",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

## Product Endpoints

### GET /products
Get products with filtering and pagination.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `category` (string): Category UUID
- `search` (string): Search term
- `minPrice` (number): Minimum price
- `maxPrice` (number): Maximum price
- `status` (string): Product status ('active', 'inactive')
- `sortBy` (string): Sort field ('name', 'price', 'created_at', 'rating')
- `sortOrder` (string): Sort order ('asc', 'desc')

**Response (200):**
```json
{
  "products": [
    {
      "id": "uuid",
      "name": "Wireless Headphones",
      "description": "High-quality wireless headphones",
      "price": 99.99,
      "comparePrice": 129.99,
      "sku": "WH-001",
      "quantity": 50,
      "trackQuantity": true,
      "status": "active",
      "images": ["headphones1.jpg", "headphones2.jpg"],
      "tags": ["electronics", "audio", "wireless"],
      "category": "Electronics",
      "averageRating": 4.5,
      "reviewCount": 23,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalCount": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### GET /products/:id
Get detailed product information.

**Response (200):**
```json
{
  "product": {
    "id": "uuid",
    "name": "Wireless Headphones",
    "description": "High-quality wireless headphones with noise cancellation",
    "price": 99.99,
    "comparePrice": 129.99,
    "costPrice": 60.00,
    "sku": "WH-001",
    "barcode": "123456789012",
    "quantity": 50,
    "trackQuantity": true,
    "weight": 0.3,
    "weightUnit": "kg",
    "requiresShipping": true,
    "taxable": true,
    "status": "active",
    "category": {
      "name": "Electronics",
      "description": "Electronic devices and accessories"
    },
    "images": ["headphones1.jpg", "headphones2.jpg"],
    "tags": ["electronics", "audio", "wireless"],
    "variants": [
      {
        "id": "uuid",
        "name": "Color",
        "value": "Black",
        "priceModifier": 0,
        "quantity": 25,
        "sku": "WH-001-BLK"
      }
    ],
    "averageRating": 4.5,
    "reviewCount": 23,
    "metadata": {},
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### POST /products
Create new product (Admin/Seller only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Product",
  "description": "Product description",
  "price": 29.99,
  "comparePrice": 39.99,
  "sku": "NP-001",
  "quantity": 100,
  "trackQuantity": true,
  "categoryId": "category-uuid",
  "images": ["image1.jpg"],
  "tags": ["tag1", "tag2"],
  "weight": 0.5,
  "weightUnit": "kg",
  "requiresShipping": true,
  "taxable": true
}
```

**Response (201):**
```json
{
  "message": "Product created successfully",
  "product": {
    "id": "uuid",
    "name": "New Product",
    "price": 29.99,
    "sku": "NP-001",
    "quantity": 100,
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### PUT /products/:id
Update product (Admin/Seller only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Product Name",
  "price": 34.99,
  "quantity": 75
}
```

### DELETE /products/:id
Delete product (Admin only).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Product deleted successfully"
}
```

### GET /products/categories/list
Get all product categories.

**Response (200):**
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "Electronics",
      "description": "Electronic devices and accessories",
      "imageUrl": "electronics.jpg",
      "parentId": null,
      "productCount": 45
    }
  ]
}
```

### GET /products/search/suggestions
Get product search suggestions.

**Query Parameters:**
- `q` (string): Search query (required)
- `limit` (number): Max suggestions (default: 10, max: 20)

**Response (200):**
```json
{
  "suggestions": [
    {
      "id": "uuid",
      "name": "Wireless Headphones",
      "price": 99.99,
      "image": "headphones.jpg",
      "categoryId": "category-uuid"
    }
  ]
}
```

---

## Cart Endpoints

### GET /cart
Get user's shopping cart.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "cart": {
    "id": "cart-uuid",
    "items": [
      {
        "id": "item-uuid",
        "productId": "product-uuid",
        "productName": "Wireless Headphones",
        "variantId": "variant-uuid",
        "quantity": 2,
        "unitPrice": 99.99,
        "totalPrice": 199.98,
        "image": "headphones.jpg"
      }
    ],
    "subtotal": 199.98,
    "taxAmount": 15.99,
    "shippingAmount": 9.99,
    "total": 225.96,
    "itemCount": 2
  }
}
```

### POST /cart
Add item to cart.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": "product-uuid",
  "variantId": "variant-uuid", // optional
  "quantity": 1
}
```

**Response (200):**
```json
{
  "message": "Item added to cart",
  "cart": { ... }
}
```

### PUT /cart/:id
Update cart item quantity.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "quantity": 3
}
```

### DELETE /cart/:id
Remove item from cart.

**Headers:**
```
Authorization: Bearer <token>
```

### DELETE /cart
Clear entire cart.

**Headers:**
```
Authorization: Bearer <token>
```

---

## Order Endpoints

### GET /orders
Get user's order history.

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 10)
- `status` (string): Filter by status

**Response (200):**
```json
{
  "orders": [
    {
      "id": "order-uuid",
      "orderNumber": "ORD-2024-001",
      "status": "completed",
      "total": 225.96,
      "currency": "USD",
      "paymentStatus": "paid",
      "createdAt": "2024-01-01T00:00:00Z",
      "itemCount": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 5,
    "totalPages": 1
  }
}
```

### GET /orders/:id
Get detailed order information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "order": {
    "id": "order-uuid",
    "orderNumber": "ORD-2024-001",
    "status": "completed",
    "subtotal": 199.98,
    "taxAmount": 15.99,
    "shippingAmount": 9.99,
    "discountAmount": 0,
    "total": 225.96,
    "currency": "USD",
    "paymentStatus": "paid",
    "paymentMethod": "stripe",
    "shippingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "addressLine1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postalCode": "10001",
      "country": "US"
    },
    "billingAddress": { ... },
    "items": [
      {
        "id": "item-uuid",
        "productId": "product-uuid",
        "productName": "Wireless Headphones",
        "productSku": "WH-001",
        "quantity": 2,
        "unitPrice": 99.99,
        "totalPrice": 199.98
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### POST /orders
Create new order from cart.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "shippingAddress": {
    "firstName": "John",
    "lastName": "Doe",
    "addressLine1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postalCode": "10001",
    "country": "US",
    "phone": "+1234567890"
  },
  "billingAddress": { ... },
  "paymentMethodId": "pm_stripe_payment_method_id",
  "notes": "Please handle with care"
}
```

**Response (201):**
```json
{
  "message": "Order created successfully",
  "order": { ... },
  "clientSecret": "pi_stripe_client_secret"
}
```

### PUT /orders/:id/cancel
Cancel order (if allowed by status).

**Headers:**
```
Authorization: Bearer <token>
```

---

## Payment Endpoints

### POST /payments/create-payment-intent
Create Stripe payment intent.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "amount": 22596, // Amount in cents
  "currency": "usd",
  "orderId": "order-uuid"
}
```

**Response (200):**
```json
{
  "clientSecret": "pi_stripe_client_secret",
  "paymentIntentId": "pi_stripe_id"
}
```

### POST /payments/webhook
Stripe webhook handler (no auth required).

**Headers:**
```
stripe-signature: <signature>
```

---

## Review Endpoints

### GET /reviews
Get reviews with filtering.

**Query Parameters:**
- `productId` (string): Filter by product
- `userId` (string): Filter by user
- `rating` (number): Filter by rating (1-5)
- `verified` (boolean): Filter verified reviews only
- `page` (number): Page number
- `limit` (number): Items per page

### POST /reviews
Create product review.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "productId": "product-uuid",
  "rating": 5,
  "title": "Excellent product!",
  "comment": "This product exceeded my expectations.",
  "images": ["review1.jpg"]
}
```

### PUT /reviews/:id
Update review (review owner only).

### DELETE /reviews/:id
Delete review (review owner or admin).

---

## Admin Endpoints

### GET /admin/dashboard
Get admin dashboard statistics.

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "stats": {
    "totalUsers": 1250,
    "totalOrders": 450,
    "totalRevenue": 45678.90,
    "totalProducts": 89,
    "recentOrders": 12,
    "lowStockProducts": 5,
    "pendingReviews": 8
  }
}
```

### GET /admin/products
Admin product management with advanced filtering.

### GET /admin/orders
Admin order management with status updates.

### GET /admin/users
Admin user management.

---

## Error Codes

### Authentication Errors
- `INVALID_CREDENTIALS` (401): Email or password incorrect
- `TOKEN_EXPIRED` (401): JWT token has expired
- `TOKEN_INVALID` (401): JWT token is invalid
- `INSUFFICIENT_PERMISSIONS` (403): User lacks required permissions

### Validation Errors
- `VALIDATION_FAILED` (400): Request data validation failed
- `MISSING_REQUIRED_FIELD` (400): Required field is missing
- `INVALID_FORMAT` (400): Field format is invalid

### Resource Errors
- `RESOURCE_NOT_FOUND` (404): Requested resource doesn't exist
- `RESOURCE_ALREADY_EXISTS` (409): Resource already exists
- `INSUFFICIENT_STOCK` (409): Product out of stock

### Payment Errors
- `PAYMENT_FAILED` (402): Payment processing failed
- `PAYMENT_METHOD_INVALID` (400): Invalid payment method

### Server Errors
- `INTERNAL_SERVER_ERROR` (500): Unexpected server error
- `DATABASE_ERROR` (500): Database operation failed
- `EXTERNAL_SERVICE_ERROR` (502): External service unavailable

---

## Rate Limits

- **General endpoints**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **Admin endpoints**: 200 requests per 15 minutes per IP

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1640995200
```

---

## WebSocket Events (Future Feature)

The API supports real-time updates via WebSocket for:
- Order status updates
- Inventory changes
- New product notifications
- Cart updates

Connection URL: `ws://localhost:5000`

---

## File Upload

Product images can be uploaded via the admin interface. Supported formats:
- JPEG, PNG, WebP
- Maximum file size: 5MB
- Stored in `/uploads` directory

---

## Data Export

Admin users can export data in various formats:
- CSV for products and orders
- JSON for full database backup
- PDF reports for analytics

---

## API Versioning

The API uses URL versioning:
- Current version: v1
- Base URL: `/api/v1/`

Future versions will be available at `/api/v2/`, etc.

---

## SDKs and Libraries

### JavaScript Client
```javascript
import { EcommerceAPI } from 'ecommerce-api-client';

const api = new EcommerceAPI({
  baseURL: 'http://localhost:5000/api',
  token: 'jwt_token'
});

// Example usage
const products = await api.products.list({ category: 'electronics' });
const cart = await api.cart.get();
```

### Mobile SDKs (Future)
- React Native SDK
- iOS SDK
- Android SDK

---

## Changelog

### Version 1.0.0
- Initial release
- Complete e-commerce functionality
- JWT authentication
- Stripe payment integration
- PostgreSQL database
- Redis caching
- Docker support