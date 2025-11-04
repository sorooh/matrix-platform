# Deployment Guide - Matrix Platform

## 🚀 Global-Ready Architecture Deployment

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- Redis 7+
- Docker (optional)
- AWS Account (for S3/CDN, optional)

---

## 📋 Step-by-Step Deployment

### 1. Environment Setup

```bash
# Clone repository
git clone https://github.com/sorooh/matrix-platform.git
cd matrix-platform

# Navigate to backend
cd matrix-scaffold/backend

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor
```

### 2. Install Dependencies

```bash
# Install npm packages
npm install

# Generate Prisma Client
npm run prisma:generate
```

### 3. Database Setup

```bash
# Run Prisma migrations
npm run prisma:migrate

# Enable pgvector extension
psql $DATABASE_URL -f src/migrations/001_enable_pgvector.sql

# (Optional) Run migration from JSON to PostgreSQL
npm run migrate:from-json
```

### 4. Development

```bash
# Start development server
npm run dev

# In another terminal, start worker
npm run worker
```

### 5. Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

---

## 🐳 Docker Deployment

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t matrix-platform/backend:latest .

# Run container
docker run -d \
  --name matrix-backend \
  -p 3000:3000 \
  --env-file .env \
  matrix-platform/backend:latest
```

---

## ☁️ Cloud Deployment

### AWS (EC2 / ECS / Lambda)

1. **EC2 Deployment**
   ```bash
   # SSH into EC2 instance
   ssh user@your-ec2-instance

   # Clone repository
   git clone https://github.com/sorooh/matrix-platform.git
   cd matrix-platform/matrix-scaffold/backend

   # Install dependencies
   npm install --production

   # Run migrations
   npm run prisma:migrate:deploy

   # Start with PM2
   pm2 start dist/main.js --name matrix-platform
   ```

2. **ECS Deployment**
   - Use provided Dockerfile
   - Configure ECS task definition
   - Set environment variables
   - Connect to RDS (PostgreSQL) and ElastiCache (Redis)

3. **Lambda Deployment**
   - Use serverless framework
   - Configure RDS Proxy
   - Set up API Gateway

### Google Cloud (Cloud Run)

```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/matrix-platform

# Deploy to Cloud Run
gcloud run deploy matrix-platform \
  --image gcr.io/PROJECT_ID/matrix-platform \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Vercel / Netlify

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

---

## 🔧 Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_URL=redis://host:6379

# Server
PORT=3000
NODE_ENV=production
REGION=us-east-1
```

### Optional Environment Variables

```env
# AI
OPENAI_API_KEY=your-key
ANTHROPIC_API_KEY=your-key

# AWS
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET=your-bucket

# Monitoring
SENTRY_DSN=your-dsn

# Integrations
SLACK_WEBHOOK_URL=your-webhook
GITHUB_TOKEN=your-token
```

---

## 🔍 Health Checks

### Local Health Check

```bash
curl http://localhost:3000/health
```

### Production Health Check

```bash
curl https://api.matrix-platform.com/health
```

### Expected Response

```json
{
  "status": "healthy",
  "timestamp": "2025-01-04T12:00:00.000Z",
  "services": {
    "database": true,
    "redis": true,
    "api": true
  },
  "uptime": 3600,
  "region": "us-east-1",
  "version": "0.1.0"
}
```

---

## 📊 Monitoring

### Metrics Endpoint

```bash
curl http://localhost:3000/metrics
```

### KPIs Endpoint

```bash
curl http://localhost:3000/api/suig/kpis
```

### Logs

- **Development**: Console output
- **Production**: Winston logs in `logs/` directory
- **Cloud**: CloudWatch / Datadog / Sentry

---

## 🔐 Security

### HTTPS

- Use reverse proxy (Nginx / Cloudflare)
- Configure SSL certificates
- Enable HTTPS only

### Authentication (Planned)

- JWT tokens
- OAuth2 integration
- Role-based access control (RBAC)

### Encryption

- Encrypt sensitive data at rest
- Use TLS for data in transit
- Encrypt logs

---

## 🚦 CI/CD

### GitHub Actions

Automated deployment on push to `main`:

1. Run tests
2. Build Docker image
3. Push to registry
4. Deploy to production

### Manual Deployment

```bash
# Build
npm run build

# Test
npm test

# Deploy
npm run deploy
```

---

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Check pgvector extension
psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector'"
```

### Redis Connection Issues

```bash
# Check Redis connection
redis-cli -u $REDIS_URL ping
```

### Port Already in Use

```bash
# Find process using port
lsof -i :3000

# Kill process
kill -9 <PID>
```

---

## 📚 Additional Resources

- [Architecture Documentation](./GLOBAL_READY_ARCHITECTURE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

**Global-Ready from day one** 🌍

