# {{projectName}} - E-commerce API

A full-featured e-commerce application built with the PERN stack (PostgreSQL, Express.js, React, Node.js) featuring Stripe payment integration, user authentication, product management, and order processing.

## 🚀 Features

### Core Features
- **User Authentication**: JWT-based authentication with email verification
- **Product Management**: Complete product catalog with categories, variants, and inventory
- **Shopping Cart**: Persistent cart with session management
- **Order Processing**: Complete order lifecycle with payment integration
- **Payment Processing**: Stripe integration for secure payments
- **Review System**: Product reviews and ratings
- **Admin Dashboard**: Comprehensive admin panel for store management

### Technical Features
- **RESTful API**: Well-documented REST API endpoints
- **Database**: PostgreSQL with optimized queries and indexing
- **Caching**: Redis for performance optimization
- **Security**: Helmet, CORS, rate limiting, input validation
- **Email**: Nodemailer integration for notifications
- **File Uploads**: Multer for product images
- **Docker**: Containerized deployment ready

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **Redis** - Caching and session store
- **JWT** - Authentication tokens
- **Stripe** - Payment processing
- **Nodemailer** - Email notifications

### Frontend
- **React** - UI framework
- **Redux Toolkit** - State management
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Styled Components** - CSS-in-JS styling
- **React Hook Form** - Form handling

### DevOps
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **PM2** - Process management
- **Nginx** - Reverse proxy (production)

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)
- Stripe account (for payments)
- SMTP server (for emails)

## 🚀 Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd {{projectName}}

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install

# Return to root
cd ..
```

### 2. Environment Setup

Create `.env` file in the server directory:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME={{databaseName}}
DB_USER=postgres
DB_PASSWORD=1234

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis1234

# JWT
JWT_SECRET={{jwtSecret}}

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Application
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
```

Create `.env` file in the client directory:

```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Database Setup

```bash
# Start PostgreSQL and Redis (if not using Docker)
# Then run database migrations
cd server
npm run db:migrate

# Seed with sample data
npm run db:seed
```

### 4. Start Development Servers

```bash
# Terminal 1: Start API server
cd server
npm run dev

# Terminal 2: Start React client
cd ../client
npm start
```

Visit `http://localhost:3000` to see the application.

## 🐳 Docker Setup (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📚 API Documentation

### Authentication Endpoints

```
POST /api/auth/register - User registration
POST /api/auth/login - User login
POST /api/auth/refresh - Refresh access token
POST /api/auth/forgot-password - Request password reset
POST /api/auth/reset-password - Reset password
GET /api/auth/profile - Get user profile
PUT /api/auth/profile - Update user profile
```

### Product Endpoints

```
GET /api/products - List products (with filtering/pagination)
GET /api/products/:id - Get product details
POST /api/products - Create product (admin/seller)
PUT /api/products/:id - Update product (admin/seller)
DELETE /api/products/:id - Delete product (admin)
GET /api/products/categories/list - List categories
```

### Cart Endpoints

```
GET /api/cart - Get cart items
POST /api/cart - Add item to cart
PUT /api/cart/:id - Update cart item
DELETE /api/cart/:id - Remove cart item
DELETE /api/cart - Clear cart
```

### Order Endpoints

```
GET /api/orders - List user orders
GET /api/orders/:id - Get order details
POST /api/orders - Create order
PUT /api/orders/:id/cancel - Cancel order
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit
npm run test:integration
npm run test:e2e

# Run with coverage
npm run test:coverage
```

## 🚀 Production Deployment

### Using Docker Compose

```bash
# Build for production
docker-compose -f docker-compose.prod.yml up -d

# Scale services
docker-compose up -d --scale api=3
```

### Manual Deployment

```bash
# Build client
cd client && npm run build

# Start server with PM2
cd ../server
npm install -g pm2
pm2 start ecosystem.config.js --env production

# Configure Nginx
sudo cp nginx/nginx.conf /etc/nginx/sites-available/{{projectName}}
sudo ln -s /etc/nginx/sites-available/{{projectName}} /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | development |
| `PORT` | Server port | 5000 |
| `DB_HOST` | Database host | localhost |
| `DB_NAME` | Database name | ecommerce_db |
| `JWT_SECRET` | JWT signing secret | (required) |
| `STRIPE_SECRET_KEY` | Stripe secret key | (required) |
| `SMTP_HOST` | Email SMTP host | (optional) |

### Database Schema

The application uses the following main tables:
- `users` - User accounts and profiles
- `products` - Product catalog
- `categories` - Product categories
- `orders` - Customer orders
- `order_items` - Order line items
- `cart_items` - Shopping cart items
- `reviews` - Product reviews
- `addresses` - User addresses

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing control
- **Rate Limiting**: API rate limiting
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy
- **Authentication**: JWT with refresh tokens
- **Authorization**: Role-based access control

## 📊 Performance Optimizations

- **Database Indexing**: Optimized queries with proper indexing
- **Redis Caching**: Product and session caching
- **Compression**: Response compression
- **Connection Pooling**: Database connection pooling
- **Lazy Loading**: Image and component lazy loading
- **CDN Ready**: Static asset optimization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the troubleshooting guide

## 📈 Roadmap

- [ ] Mobile app (React Native)
- [ ] Multi-language support (i18n)
- [ ] Advanced analytics dashboard
- [ ] Inventory management system
- [ ] Loyalty program
- [ ] Social commerce features
- [ ] AI-powered recommendations

---

Built with ❤️ using the PERN stack