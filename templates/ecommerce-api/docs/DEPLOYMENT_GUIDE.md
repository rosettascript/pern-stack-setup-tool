# E-commerce API Deployment Guide

## Overview

This guide covers deploying the E-commerce API to production environments using Docker, manual setup, and cloud platforms.

## Prerequisites

### System Requirements
- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB available space
- **Network**: Stable internet connection

### Software Requirements
- Docker & Docker Compose (recommended)
- Node.js 18+ (for manual deployment)
- PostgreSQL 15+ (for manual deployment)
- Redis 7+ (for manual deployment)
- Nginx (for production proxy)

### Accounts & Services
- **Domain registrar** for custom domain
- **SSL certificate provider** (Let's Encrypt recommended)
- **SMTP service** for email notifications
- **Stripe account** for payment processing
- **Cloud storage** for file uploads (optional)

## Quick Start with Docker

### 1. Clone and Configure

```bash
# Clone the repository
git clone <repository-url>
cd ecommerce-api

# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 2. Environment Configuration

```env
# Application
NODE_ENV=production
PORT=5000
CLIENT_URL=https://yourdomain.com

# Database
DB_HOST=postgres
DB_PORT=5432
DB_NAME=ecommerce_db
DB_USER=postgres
DB_PASSWORD=secure_password_here

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=secure_redis_password

# JWT
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-token-secret-here

# Stripe
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
```

### 3. SSL Certificate Setup

```bash
# Install Certbot for Let's Encrypt
sudo apt update
sudo apt install certbot

# Generate SSL certificate
sudo certbot certonly --standalone -d yourdomain.com

# Certificates will be stored in /etc/letsencrypt/live/yourdomain.com/
```

### 4. Docker Compose Production Setup

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: ecommerce-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ecommerce_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database:/docker-entrypoint-initdb.d
    networks:
      - ecommerce-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: ecommerce-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 512mb --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - ecommerce-network
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Node.js API Server
  api:
    build:
      context: ./server
      dockerfile: Dockerfile.prod
    container_name: ecommerce-api
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 5000
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: ecommerce_db
      DB_USER: postgres
      DB_PASSWORD: ${DB_PASSWORD}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      CLIENT_URL: ${CLIENT_URL}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
    ports:
      - "127.0.0.1:5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - ecommerce-network
    volumes:
      - ./server/uploads:/app/uploads
      - ./server/logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # React Client (Production Build)
  client:
    build:
      context: ./client
      dockerfile: Dockerfile.prod
    container_name: ecommerce-client
    restart: unless-stopped
    environment:
      REACT_APP_API_URL: https://api.yourdomain.com
      REACT_APP_STRIPE_PUBLISHABLE_KEY: ${REACT_APP_STRIPE_PUBLISHABLE_KEY}
    networks:
      - ecommerce-network

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: ecommerce-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - nginx_logs:/var/log/nginx
      - client_static:/var/www/html
    depends_on:
      - api
      - client
    networks:
      - ecommerce-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  postgres_data:
  redis_data:
  nginx_logs:
  client_static:

networks:
  ecommerce-network:
    driver: bridge
```

### 5. Nginx Configuration

Create `nginx/nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    # Logging
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    # Performance
    sendfile        on;
    tcp_nopush      on;
    tcp_nodelay     on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 16M;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml+rss
        application/atom+xml
        image/svg+xml;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=auth:10m rate=3r/m;

    upstream api_backend {
        server api:5000;
    }

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;

        # Redirect HTTP to HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;
        add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

        # Root directory for React app
        root /var/www/html;
        index index.html;

        # API proxy
        location /api/ {
            limit_req zone=api burst=20 nodelay;

            proxy_pass http://api_backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;

            # CORS headers
            add_header 'Access-Control-Allow-Origin' 'https://yourdomain.com' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, X-Requested-With' always;
            add_header 'Access-Control-Allow-Credentials' 'true' always;

            # Handle preflight requests
            if ($request_method = 'OPTIONS') {
                return 204;
            }
        }

        # Static files with caching
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
            try_files $uri =404;
        }

        # Service worker
        location /sw.js {
            add_header Cache-Control "no-cache";
            try_files $uri =404;
        }

        # React Router history fallback
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Health check
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### 6. Deploy with Docker Compose

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale API service
docker-compose -f docker-compose.prod.yml up -d --scale api=3
```

## Manual Deployment

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Install Redis
sudo apt install redis-server -y
sudo systemctl start redis
sudo systemctl enable redis

# Install Nginx
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# Install PM2
sudo npm install -g pm2
```

### 2. Database Setup

```bash
# Create database and user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE ecommerce_db;
CREATE USER ecommerce_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE ecommerce_db TO ecommerce_user;
ALTER USER ecommerce_user CREATEDB;
\q
```

### 3. Application Deployment

```bash
# Create application directory
sudo mkdir -p /var/www/ecommerce
sudo chown -R $USER:$USER /var/www/ecommerce

# Clone repository
cd /var/www/ecommerce
git clone <repository-url> .

# Install server dependencies
cd server
npm install --production

# Install client dependencies and build
cd ../client
npm install
npm run build

# Copy built client to Nginx directory
sudo cp -r build/* /var/www/html/

# Configure environment
cp .env.example .env
nano .env  # Edit with production values
```

### 4. PM2 Configuration

Create `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'ecommerce-api',
    script: 'src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/log/pm2/ecommerce-api-error.log',
    out_file: '/var/log/pm2/ecommerce-api-out.log',
    log_file: '/var/log/pm2/ecommerce-api.log',
    merge_logs: true,
    time: true,
    max_memory_restart: '1G',
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

```bash
# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. Nginx Configuration

```bash
# Create Nginx site configuration
sudo nano /etc/nginx/sites-available/ecommerce

# Add the configuration from above
# Then enable site
sudo ln -s /etc/nginx/sites-available/ecommerce /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Cloud Deployment

### AWS EC2 Deployment

```bash
# Launch EC2 instance (t3.medium recommended)
# Ubuntu 22.04 LTS, security group with ports 22, 80, 443

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.17.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone and deploy
git clone <repository-url>
cd ecommerce-api
docker-compose -f docker-compose.prod.yml up -d --build
```

### DigitalOcean App Platform

1. Connect GitHub repository
2. Configure environment variables
3. Set up database cluster
4. Configure domains and SSL
5. Deploy

### Heroku Deployment

```bash
# Create Heroku app
heroku create your-app-name

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Add Redis addon
heroku addons:create heroku-redis:hobby-dev

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret
# ... other variables

# Deploy
git push heroku main
```

## Monitoring & Maintenance

### Health Checks

```bash
# Application health
curl https://yourdomain.com/api/health

# Database connectivity
docker-compose exec postgres pg_isready -U postgres

# Redis connectivity
docker-compose exec redis redis-cli ping
```

### Log Management

```bash
# View application logs
pm2 logs ecommerce-api

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Database logs
docker-compose logs postgres
```

### Backup Strategy

```bash
# Database backup
docker-compose exec postgres pg_dump -U postgres ecommerce_db > backup_$(date +%Y%m%d_%H%M%S).sql

# File backup
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz server/uploads/

# Automated backup script
crontab -e
# Add: 0 2 * * * /path/to/backup-script.sh
```

### Performance Monitoring

```bash
# PM2 monitoring
pm2 monit

# System resources
htop
df -h
free -h

# Application metrics
curl https://yourdomain.com/api/admin/metrics
```

## Security Hardening

### SSL/TLS Configuration

```bash
# Generate strong Diffie-Hellman parameters
sudo openssl dhparam -out /etc/nginx/ssl/dhparam.pem 2048

# SSL configuration in Nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

### Firewall Configuration

```bash
# UFW firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw status
```

### Security Headers

```nginx
# In Nginx configuration
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com;" always;
```

## Scaling

### Horizontal Scaling

```bash
# Scale API instances
docker-compose up -d --scale api=3

# Load balancer configuration
upstream api_backend {
    server api1:5000;
    server api2:5000;
    server api3:5000;
}
```

### Database Scaling

```bash
# Add read replicas
# Configure connection pooling
# Implement database sharding
```

### CDN Integration

```nginx
# Static file serving with CDN
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header X-CDN "CloudFlare";
}
```

## Troubleshooting

### Common Issues

#### Application Won't Start
```bash
# Check logs
pm2 logs ecommerce-api

# Check environment variables
pm2 show ecommerce-api

# Restart application
pm2 restart ecommerce-api
```

#### Database Connection Failed
```bash
# Test database connection
docker-compose exec postgres pg_isready -U postgres

# Check database logs
docker-compose logs postgres

# Reset database connection
docker-compose restart postgres
```

#### High Memory Usage
```bash
# Check memory usage
pm2 monit

# Restart with memory limit
pm2 restart ecommerce-api --max-memory 1G
```

#### SSL Certificate Issues
```bash
# Renew Let's Encrypt certificate
sudo certbot renew

# Reload Nginx
sudo nginx -s reload
```

## Backup & Recovery

### Automated Backups

```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/ecommerce"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
docker-compose exec -T postgres pg_dump -U postgres ecommerce_db > $BACKUP_DIR/db_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/db_$DATE.sql

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/db_$DATE.sql.gz s3://your-backup-bucket/

# Clean old backups (keep last 7 days)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_DIR/db_$DATE.sql.gz"
```

### Disaster Recovery

1. **Stop the application**
2. **Restore database from backup**
3. **Restore uploaded files**
4. **Update configuration if needed**
5. **Restart application**
6. **Verify functionality**

## Performance Optimization

### Database Optimization

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM products WHERE category_id = $1;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_products_category_created ON products(category_id, created_at DESC);

-- Vacuum and analyze
VACUUM ANALYZE products;
```

### Application Optimization

```javascript
// Enable gzip compression
const compression = require('compression');
app.use(compression());

// Cache static files
app.use(express.static('public', { maxAge: '1y' }));

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);
```

### CDN Setup

```bash
# CloudFlare configuration
# 1. Add domain to CloudFlare
# 2. Update nameservers
# 3. Configure SSL/TLS
# 4. Set up caching rules
# 5. Configure firewall rules
```

## Monitoring & Alerting

### Application Monitoring

```bash
# PM2 monitoring
pm2 install pm2-server-monit

# Custom health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version
  });
});
```

### Error Tracking

```javascript
// Sentry integration
const Sentry = require('@sentry/node');
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV
});
```

### Log Aggregation

```bash
# Install ELK stack or use cloud logging
# Configure log shipping
# Set up alerts for errors
```

## Cost Optimization

### Resource Optimization

```bash
# Right-size EC2 instances
# Use spot instances for non-critical workloads
# Implement auto-scaling
# Use CloudFront for static assets
```

### Database Optimization

```sql
-- Archive old data
CREATE TABLE orders_archived (LIKE orders);
INSERT INTO orders_archived SELECT * FROM orders WHERE created_at < '2023-01-01';

-- Partition large tables
CREATE TABLE orders_y2024 PARTITION OF orders FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### Caching Strategy

```javascript
// Implement multi-layer caching
// Browser caching
// CDN caching
// Application caching
// Database query caching
```

## Compliance & Security

### GDPR Compliance

```javascript
// Data export functionality
app.get('/api/user/data-export', authenticateToken, async (req, res) => {
  const userData = await exportUserData(req.userId);
  res.json(userData);
});

// Right to erasure
app.delete('/api/user/delete', authenticateToken, async (req, res) => {
  await deleteUserData(req.userId);
  res.json({ message: 'Account deleted successfully' });
});
```

### PCI DSS Compliance

```javascript
// Never store full card details
// Use Stripe Elements for card input
// Implement proper logging without sensitive data
// Regular security audits
```

## Maintenance Schedule

### Daily Tasks
- Monitor application logs
- Check disk space usage
- Verify backup completion
- Review error rates

### Weekly Tasks
- Update dependencies
- Review performance metrics
- Clean up old log files
- Test backup restoration

### Monthly Tasks
- Security updates
- Database maintenance
- SSL certificate renewal
- Performance optimization

### Quarterly Tasks
- Comprehensive security audit
- Load testing
- Disaster recovery testing
- Compliance review

This deployment guide provides a comprehensive roadmap for deploying the E-commerce API in production environments with high availability, security, and performance considerations.