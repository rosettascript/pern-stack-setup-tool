# E-commerce API Usage Examples

## Overview

This document provides practical examples of how to interact with the E-commerce API using various programming languages and tools.

## Authentication Flow

### 1. User Registration

```javascript
// Register a new user
const registerUser = async (userData) => {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'john.doe@example.com',
        password: 'securePassword123!',
        firstName: 'John',
        lastName: 'Doe',
        phone: '+1234567890'
      })
    });

    const data = await response.json();

    if (response.ok) {
      // Store tokens
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      console.log('Registration successful:', data.user);
    } else {
      console.error('Registration failed:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

### 2. User Login

```javascript
const loginUser = async (credentials) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'john.doe@example.com',
        password: 'securePassword123!'
      })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      console.log('Login successful:', data.user);
    } else {
      console.error('Login failed:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

### 3. Token Refresh

```javascript
const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken })
    });

    const data = await response.json();

    if (response.ok) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      console.log('Token refreshed successfully');
    } else {
      // Redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
  }
};
```

## Product Management

### Get Products with Filtering

```javascript
const getProducts = async (filters = {}) => {
  try {
    const queryParams = new URLSearchParams({
      page: filters.page || 1,
      limit: filters.limit || 20,
      search: filters.search || '',
      category: filters.category || '',
      minPrice: filters.minPrice || '',
      maxPrice: filters.maxPrice || '',
      sortBy: filters.sortBy || 'created_at',
      sortOrder: filters.sortOrder || 'desc'
    });

    const response = await fetch(`/api/products?${queryParams}`);
    const data = await response.json();

    if (response.ok) {
      console.log('Products:', data.products);
      console.log('Pagination:', data.pagination);
      return data;
    } else {
      console.error('Failed to get products:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};

// Usage examples
getProducts({ search: 'laptop', minPrice: 500, maxPrice: 2000 });
getProducts({ category: 'electronics', sortBy: 'price', sortOrder: 'asc' });
```

### Get Single Product

```javascript
const getProduct = async (productId) => {
  try {
    const response = await fetch(`/api/products/${productId}`);
    const data = await response.json();

    if (response.ok) {
      console.log('Product:', data.product);
      return data.product;
    } else {
      console.error('Failed to get product:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

### Create Product (Admin/Seller)

```javascript
const createProduct = async (productData) => {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'Wireless Bluetooth Headphones',
        description: 'High-quality wireless headphones with noise cancellation',
        price: 199.99,
        comparePrice: 249.99,
        sku: 'WBH-001',
        quantity: 50,
        trackQuantity: true,
        categoryId: 'electronics-category-id',
        images: ['headphones1.jpg', 'headphones2.jpg'],
        tags: ['electronics', 'audio', 'wireless'],
        weight: 0.3,
        weightUnit: 'kg',
        requiresShipping: true,
        taxable: true
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Product created:', data.product);
      return data.product;
    } else {
      console.error('Failed to create product:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

## Shopping Cart

### Add Item to Cart

```javascript
const addToCart = async (productId, quantity = 1, variantId = null) => {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        productId,
        quantity,
        variantId
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Item added to cart:', data.cart);
      return data.cart;
    } else {
      console.error('Failed to add item to cart:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

### Get Cart Contents

```javascript
const getCart = async () => {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch('/api/cart', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Cart:', data.cart);
      return data.cart;
    } else {
      console.error('Failed to get cart:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

### Update Cart Item

```javascript
const updateCartItem = async (itemId, quantity) => {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch(`/api/cart/${itemId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ quantity })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Cart updated:', data.cart);
      return data.cart;
    } else {
      console.error('Failed to update cart:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

## Order Processing

### Create Order

```javascript
const createOrder = async (orderData) => {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        shippingAddress: {
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US',
          phone: '+1234567890'
        },
        billingAddress: {
          // Same as shipping or different
          firstName: 'John',
          lastName: 'Doe',
          addressLine1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'US'
        },
        paymentMethodId: 'pm_stripe_payment_method_id',
        notes: 'Please handle with care'
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Order created:', data.order);
      console.log('Client secret for payment:', data.clientSecret);
      return data;
    } else {
      console.error('Failed to create order:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

### Get Order History

```javascript
const getOrderHistory = async (page = 1, limit = 10) => {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch(`/api/orders?page=${page}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Orders:', data.orders);
      console.log('Pagination:', data.pagination);
      return data;
    } else {
      console.error('Failed to get orders:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

## Payment Integration (Stripe)

### Frontend Payment Processing

```javascript
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY);

const CheckoutForm = ({ orderId, clientSecret }) => {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: {
          name: 'John Doe',
          email: 'john.doe@example.com',
        },
      }
    });

    if (error) {
      console.error('Payment failed:', error.message);
    } else {
      console.log('Payment succeeded!');
      // Redirect to order confirmation
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <button disabled={!stripe}>Pay Now</button>
    </form>
  );
};
```

### Backend Webhook Handling

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      console.log('Payment succeeded:', paymentIntent.id);

      // Update order status
      await updateOrderStatus(paymentIntent.metadata.orderId, 'paid');
      break;

    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      console.log('Payment failed:', failedPayment.id);

      // Update order status
      await updateOrderStatus(failedPayment.metadata.orderId, 'payment_failed');
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});
```

## Reviews and Ratings

### Submit Product Review

```javascript
const submitReview = async (productId, reviewData) => {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        productId,
        rating: 5,
        title: 'Excellent product!',
        comment: 'This product exceeded my expectations. Highly recommended!',
        images: ['review-photo1.jpg']
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Review submitted:', data.review);
      return data.review;
    } else {
      console.error('Failed to submit review:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

### Get Product Reviews

```javascript
const getProductReviews = async (productId, page = 1, limit = 10) => {
  try {
    const response = await fetch(`/api/products/${productId}/reviews?page=${page}&limit=${limit}`);
    const data = await response.json();

    if (response.ok) {
      console.log('Reviews:', data.reviews);
      console.log('Pagination:', data.pagination);
      return data;
    } else {
      console.error('Failed to get reviews:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

## Admin Operations

### Get Dashboard Statistics

```javascript
const getDashboardStats = async () => {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch('/api/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Dashboard stats:', data.stats);
      return data.stats;
    } else {
      console.error('Failed to get dashboard stats:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

### Update Order Status (Admin)

```javascript
const updateOrderStatus = async (orderId, status) => {
  try {
    const token = localStorage.getItem('token');

    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Order status updated:', data.order);
      return data.order;
    } else {
      console.error('Failed to update order status:', data.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};
```

## Python Client Example

```python
import requests

class EcommerceAPI:
    def __init__(self, base_url='http://localhost:5000/api'):
        self.base_url = base_url
        self.token = None

    def login(self, email, password):
        response = requests.post(f'{self.base_url}/auth/login', json={
            'email': email,
            'password': password
        })

        if response.status_code == 200:
            data = response.json()
            self.token = data['token']
            return data
        else:
            raise Exception(f'Login failed: {response.json()}')

    def get_products(self, **filters):
        headers = {}
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        response = requests.get(f'{self.base_url}/products', params=filters, headers=headers)
        return response.json()

    def create_order(self, order_data):
        headers = {
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json'
        }

        response = requests.post(f'{self.base_url}/orders', json=order_data, headers=headers)
        return response.json()

# Usage
api = EcommerceAPI()
api.login('user@example.com', 'password')
products = api.get_products(search='laptop', limit=10)
```

## cURL Examples

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123!",
    "firstName": "John",
    "lastName": "Doe"
  }'
```

### Get Products
```bash
curl -X GET "http://localhost:5000/api/products?page=1&limit=20&search=laptop" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Create Product (Admin)
```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "name": "New Product",
    "price": 29.99,
    "description": "Product description",
    "sku": "NP-001",
    "quantity": 100
  }'
```

### Create Order
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "shippingAddress": {
      "firstName": "John",
      "lastName": "Doe",
      "addressLine1": "123 Main St",
      "city": "New York",
      "postalCode": "10001",
      "country": "US"
    },
    "paymentMethodId": "pm_stripe_payment_method_id"
  }'
```

## React Hooks Examples

### Custom Hook for Products

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

const useProducts = (filters = {}) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/products', { params: filters });
      setProducts(response.data.products);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [JSON.stringify(filters)]);

  return { products, loading, error, pagination, refetch: fetchProducts };
};

export default useProducts;

// Usage in component
const ProductList = () => {
  const { products, loading, error, pagination } = useProducts({
    category: 'electronics',
    sortBy: 'price'
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {products.map(product => (
        <div key={product.id}>
          <h3>{product.name}</h3>
          <p>${product.price}</p>
        </div>
      ))}
    </div>
  );
};
```

### Custom Hook for Cart

```javascript
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const useCart = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    try {
      const response = await axios.get('/api/cart');
      setCart(response.data.cart);
    } catch (error) {
      console.error('Failed to fetch cart:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = async (productId, quantity = 1) => {
    try {
      const response = await axios.post('/api/cart', { productId, quantity });
      setCart(response.data.cart);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  const updateCartItem = async (itemId, quantity) => {
    try {
      const response = await axios.put(`/api/cart/${itemId}`, { quantity });
      setCart(response.data.cart);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      const response = await axios.delete(`/api/cart/${itemId}`);
      setCart(response.data.cart);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  };

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return {
    cart,
    loading,
    addToCart,
    updateCartItem,
    removeFromCart,
    refetch: fetchCart
  };
};

export default useCart;
```

## Error Handling

### Global Error Handler

```javascript
import { toast } from 'react-toastify';

export const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;

    switch (status) {
      case 400:
        toast.error(data.message || 'Bad request');
        break;
      case 401:
        toast.error('Please login to continue');
        // Redirect to login
        window.location.href = '/login';
        break;
      case 403:
        toast.error('You do not have permission to perform this action');
        break;
      case 404:
        toast.error('The requested resource was not found');
        break;
      case 409:
        toast.error(data.message || 'Conflict with existing data');
        break;
      case 422:
        // Validation errors
        if (data.details) {
          data.details.forEach(detail => {
            toast.error(detail.message);
          });
        } else {
          toast.error(data.message || 'Validation failed');
        }
        break;
      case 429:
        toast.error('Too many requests. Please try again later.');
        break;
      case 500:
        toast.error('Internal server error. Please try again later.');
        break;
      default:
        toast.error(data.message || 'An unexpected error occurred');
    }
  } else if (error.request) {
    // Network error
    toast.error('Network error. Please check your connection.');
  } else {
    // Other error
    toast.error('An unexpected error occurred');
  }

  // Log error for debugging
  console.error('API Error:', error);
};
```

### Axios Interceptor Setup

```javascript
import axios from 'axios';
import { handleApiError } from './errorHandler';

// Request interceptor
axios.interceptors.request.use(
  (config) => {
    // Add auth token to requests
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add timestamp for cache busting
    config.params = {
      ...config.params,
      _t: Date.now()
    };

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    handleApiError(error);
    return Promise.reject(error);
  }
);

export default axios;
```

## Testing Examples

### Unit Test for API Call

```javascript
import axios from 'axios';
import { getProducts } from '../api/products';

jest.mock('axios');
const mockedAxios = axios;

describe('Products API', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('getProducts fetches products successfully', async () => {
    const mockProducts = [
      { id: '1', name: 'Product 1', price: 10.99 },
      { id: '2', name: 'Product 2', price: 15.99 }
    ];

    const mockResponse = {
      data: {
        products: mockProducts,
        pagination: { page: 1, totalCount: 2 }
      }
    };

    mockedAxios.get.mockResolvedValueOnce(mockResponse);

    const result = await getProducts();

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/products', {
      params: { page: 1, limit: 20 }
    });
    expect(result).toEqual(mockResponse.data);
  });

  test('getProducts handles error', async () => {
    const errorMessage = 'Network Error';
    mockedAxios.get.mockRejectedValueOnce(new Error(errorMessage));

    await expect(getProducts()).rejects.toThrow(errorMessage);
  });
});
```

### Integration Test

```javascript
import request from 'supertest';
import app from '../app';
import { query } from '../config/database';

describe('Authentication Endpoints', () => {
  beforeEach(async () => {
    // Clean up database
    await query('DELETE FROM users');
  });

  afterAll(async () => {
    // Close database connection
    await query('SELECT 1'); // Keep connection alive for cleanup
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
    });

    test('should not register user with existing email', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User'
      };

      // Register first user
      await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      // Try to register again
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error).toBe('User already exists');
    });
  });
});
```

These examples demonstrate the comprehensive functionality of the E-commerce API and provide practical implementations for common use cases.