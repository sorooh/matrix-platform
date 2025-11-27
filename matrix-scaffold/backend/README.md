# Matrix Platform Backend

**Global-Ready Architecture** - Backend API for Matrix Platform

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ (required)
- PostgreSQL 15+ with pgvector extension
- Redis 7+
- Docker (optional)

### Key Dependencies

- **AI Providers**: OpenAI, Anthropic, Google Generative AI
- **Web Scraping**: Puppeteer, Cheerio, Playwright
- **Monitoring**: Prometheus (prom-client), Sentry
- **Database**: PostgreSQL (pg), Prisma ORM
- **Security**: bcrypt, jsonwebtoken, helmet
- **Utilities**: axios, uuid, bull, express, compression, morgan

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

4. **Run migrations**
   ```bash
   npm run prisma:migrate
   ```

5. **Enable pgvector extension**
   ```bash
   psql $DATABASE_URL -f src/migrations/001_enable_pgvector.sql
   ```

6. **Start development**
   ```bash
   npm run dev
   ```

## 📚 Architecture

### Global-Ready Features

- ✅ **Multi-Region Ready**: Works from any region (Europe / US / Asia)
- ✅ **Stateless Architecture**: No local sessions, all data in database
- ✅ **Environment Variables**: All configs in .env
- ✅ **PostgreSQL + pgvector**: Vector search optimization
- ✅ **Redis**: Caching and event bus
- ✅ **Docker + CI/CD**: Automated deployment

### Storage System

- **Primary**: PostgreSQL with Prisma ORM
- **Fallback**: JSON files (for backward compatibility)
- **Vector Search**: pgvector with HNSW indexes
- **Caching**: Redis with TTL support

### Error Handling

- **Winston**: Structured logging
- **Sentry**: Error tracking and monitoring
- **Error Context**: Request tracing and context

### API Endpoints

- `/api/projects` - Project management
- `/api/jobs` - Job management
- `/api/memory` - Memory operations
- `/api/graph` - Knowledge graph
- `/api/suig` - Unified query system
- `/api/nicholas` - Planning and orchestration
- `/health` - Health check endpoint

## 🧪 Testing

```bash
npm test
```

## 🚀 Deployment

### Docker

```bash
docker-compose up -d
```

### Production

```bash
npm run build
npm start
```

## 📊 Monitoring

- Health check: `GET /health`
- Metrics: `GET /api/metrics/series`
- KPIs: `GET /api/suig/kpis`

## 🔐 Security

- JWT authentication (planned)
- OAuth2 integration (planned)
- HTTPS only
- Encrypted logs
- Role-based access control (planned)

## 📝 License

Private - All rights reserved

---

**Global-Ready from day one** 🌍

