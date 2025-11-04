# Matrix Platform

**Digital Factory** - نظام تشغيل رقمي ذكي لتطوير، إدارة، وتشغيل المشاريع البرمجية والبوتات في بيئة حيّة مترابطة.

## 🎯 Vision

Matrix Platform is not just a deployment platform like Vercel or Netlify.

It's a **Digital Factory** - a complete operating system for running, building, and synchronizing AI applications, bots, and software projects in a live, interconnected environment.

## 🏗️ Architecture

**Global-Ready Architecture** from day one:
- ✅ Multi-Region Ready (Europe / US / Asia)
- ✅ Stateless Architecture (no local sessions)
- ✅ Environment Variables (all configs in .env)
- ✅ PostgreSQL + pgvector (vector search)
- ✅ Redis (caching + event bus)
- ✅ Docker + CI/CD (automated deployment)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- Redis 7+
- Docker (optional)

### Installation

1. **Clone repository**
   ```bash
   git clone https://github.com/sorooh/matrix-platform.git
   cd matrix-platform
   ```

2. **Install dependencies**
   ```bash
   cd matrix-scaffold/backend
   npm install
   ```

3. **Setup environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Setup database**
   ```bash
   # Generate Prisma client
   npm run prisma:generate
   
   # Run migrations
   npm run prisma:migrate
   
   # Enable pgvector extension
   psql $DATABASE_URL -f src/migrations/001_enable_pgvector.sql
   ```

5. **Start development**
   ```bash
   npm run dev
   ```

### Docker Setup

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend npm run prisma:migrate
```

## 📚 Documentation

- [ANALYSIS.md](./ANALYSIS.md) - Complete project analysis
- [STRATEGIC_PLAN.md](./STRATEGIC_PLAN.md) - Strategic plan
- [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - Implementation roadmap
- [GLOBAL_READY_ARCHITECTURE.md](./GLOBAL_READY_ARCHITECTURE.md) - Global-Ready Architecture guide
- [VISION.md](./VISION.md) - Vision and strategy
- [WEAKNESSES_ANALYSIS.md](./WEAKNESSES_ANALYSIS.md) - Current weaknesses analysis
- [PROGRESS.md](./PROGRESS.md) - Progress tracking

## 🧪 Testing

```bash
npm test
```

## 🚀 Deployment

### CI/CD

Automated deployment via GitHub Actions:
- Tests run on every push/PR
- Docker images built and pushed
- Multi-region deployment support

### Manual Deployment

```bash
# Build
npm run build

# Start
npm start
```

## 📊 Status

**Phase 1 - Critical Fixes** (In Progress)
- ✅ Infrastructure setup (PostgreSQL + Redis)
- ✅ Storage migration (JSON → PostgreSQL)
- ✅ Error handling & logging
- ✅ CI/CD pipeline
- ⏳ Testing infrastructure (in progress)

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

Private - All rights reserved

---

**It's not just a platform — it's a living digital ecosystem.** 🌌
