# Matrix Platform - دليل الإعداد السريع
# Quick Setup Guide

## 🚀 التشغيل التلقائي السريع

### الطريقة الأولى: استخدام Scripts الجاهزة

```powershell
# 1. الإعداد الكامل (مرة واحدة فقط)
.\setup.ps1

# 2. التشغيل التلقائي
.\start.ps1

# 3. إيقاف كل شيء
.\stop-all.ps1
```

### الطريقة الثانية: يدوياً

```powershell
# 1. اذهب لمجلد Backend
cd matrix-scaffold\backend

# 2. نسخ ملف الإعدادات
Copy-Item .env.example .env
# ثم عدّل .env بإعداداتك

# 3. تثبيت المكتبات
npm install

# 4. توليد Prisma Client
npm run generate

# 5. بناء المشروع
npm run build

# 6. التشغيل
npm start
# أو للتطوير: npm run dev
```

## 📋 المتطلبات

- **Node.js 20+** (https://nodejs.org/)
- **PostgreSQL 15+** مع pgvector extension
- **Redis 7+**
- **npm 10+**

## ⚙️ الإعدادات الاحترافية

### 1. Docker Compose (موصى به)

```powershell
# تشغيل كل شيء مع Docker
docker-compose up -d

# إيقاف
docker-compose down
```

### 2. PM2 للتشغيل التلقائي

```powershell
# تثبيت PM2
npm install -g pm2

# تشغيل مع PM2
cd matrix-scaffold\backend
npm run pm2:start

# عرض اللوجات
npm run pm2:logs

# مراقبة الأداء
npm run pm2:monit
```

## 🔧 الإعدادات المتقدمة

### ملف .env

عدّل ملف `.env` في `matrix-scaffold/backend/.env`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/matrix

# Redis
REDIS_URL=redis://localhost:6379

# Security (مهم!)
JWT_SECRET=your_very_long_secret_key_here
ENCRYPTION_KEY=your_encryption_key_here
```

### PostgreSQL Optimization

تم ضبط PostgreSQL في `docker-compose.yml` لتحمل:
- **200 connection** كحد أقصى
- **4GB memory** للكاش
- **Optimized settings** للأداء العالي

### Redis Optimization

تم ضبط Redis لـ:
- **2GB memory** كحد أقصى
- **Auto persistence** مع AOF
- **LRU eviction** policy

## 📊 المراقبة والصحة

### Health Check

```powershell
# فحص الصحة
curl http://localhost:3000/health

# أو
npm run health
```

### Logs

```powershell
# Logs مع PM2
npm run pm2:logs

# Logs في Docker
docker-compose logs -f backend
```

## 🛠️ Scripts المتاحة

### Development
- `npm run dev` - تشغيل مع hot reload
- `npm run dev:debug` - تشغيل مع debugger
- `npm run dev:hot` - تشغيل مع nodemon

### Production
- `npm start` - تشغيل عادي
- `npm run start:production` - تشغيل production
- `npm run start:cluster` - تشغيل مع cluster mode

### PM2
- `npm run pm2:start` - تشغيل مع PM2
- `npm run pm2:stop` - إيقاف
- `npm run pm2:restart` - إعادة تشغيل
- `npm run pm2:logs` - عرض اللوجات
- `npm run pm2:monit` - مراقبة الأداء

### Database
- `npm run migrate` - تشغيل migrations
- `npm run migrate:deploy` - deploy migrations
- `npm run db:studio` - فتح Prisma Studio
- `npm run generate` - توليد Prisma Client

### Testing
- `npm test` - تشغيل الاختبارات
- `npm run test:watch` - watch mode
- `npm run test:smoke` - smoke tests
- `npm run test:load` - load tests

## 🔒 الأمان

1. **غير JWT_SECRET** في `.env` - مهم جداً!
2. **غير ENCRYPTION_KEY** - مهم جداً!
3. **استخدم HTTPS** في production
4. **فعّل Rate Limiting** (مفعّل افتراضياً)

## 📈 الأداء

### الإعدادات الافتراضية:
- **PostgreSQL**: 200 connections, 4GB cache
- **Redis**: 2GB memory, LRU eviction
- **Backend**: 4GB memory, cluster mode مع PM2
- **Node.js**: 4GB heap size

### للتطبيقات الكبيرة:
عدّل في `docker-compose.yml`:
- زيادة `cpus` و `memory` limits
- زيادة `DB_POOL_SIZE` في `.env`
- استخدام `CLUSTER_WORKERS=8` في `.env`

## 🆘 حل المشاكل

### المشروع لا يشتغل:
```powershell
# 1. تحقق من Node.js
node -v  # يجب أن يكون 20+

# 2. نظف واعيد البناء
npm run clean
npm install
npm run build

# 3. تحقق من .env
# تأكد أن DATABASE_URL و REDIS_URL صحيحين
```

### Database connection error:
```powershell
# تحقق من PostgreSQL
# تأكد أنه يعمل على port 5432
```

### Port already in use:
```powershell
# غير PORT في .env
PORT=3001
```

## 📞 الدعم

إذا واجهت مشاكل:
1. تحقق من اللوجات: `npm run pm2:logs`
2. تحقق من Health: `npm run health`
3. راجع ملف `.env`
4. تأكد من أن PostgreSQL و Redis يعملان

---

**✅ كل شيء جاهز! استمتع بـ Matrix Platform!** 🚀

