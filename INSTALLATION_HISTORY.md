# تاريخ تركيب المشروع - Matrix Platform
# Installation History

## 📋 نظرة عامة

تم تركيب **Matrix Platform v11.0.0** بطريقتين:
1. **تركيب محلي** (Local Development)
2. **تركيب على السيرفر** (Production Server)

---

## 🖥️ 1. التركيب المحلي (Local Installation)

### المتطلبات المثبتة:

- ✅ **Node.js 20+**
- ✅ **npm 10+**
- ✅ **PostgreSQL 15+** مع pgvector extension
- ✅ **Redis 7+**
- ✅ **Docker** (اختياري)

### الخطوات المتبعة:

#### أ) إعداد المشروع الأساسي:

```powershell
# 1. Clone المشروع
git clone https://github.com/sorooh/matrix-platform.git
cd matrix-platform

# 2. استخدام سكريبت الإعداد التلقائي
.\setup.ps1
```

**ما يفعله `setup.ps1`:**
- ✅ فحص Node.js و npm
- ✅ نسخ `.env.example` إلى `.env`
- ✅ تثبيت المكتبات (`npm install`)
- ✅ توليد Prisma Client (`npm run generate`)
- ✅ بناء المشروع (`npm run build`)
- ✅ تثبيت PM2 (اختياري)

#### ب) إعداد قاعدة البيانات:

```powershell
cd matrix-scaffold\backend

# 1. تعديل ملف .env
# DATABASE_URL=postgresql://user:password@localhost:5432/matrix
# REDIS_URL=redis://localhost:6379

# 2. تشغيل Migrations
npm run migrate

# 3. تفعيل pgvector extension
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

#### ج) التشغيل:

```powershell
# طريقة 1: استخدام السكريبت
.\start.ps1

# طريقة 2: مباشرة
cd matrix-scaffold\backend
npm run dev          # للتطوير
npm start            # للإنتاج
npm run pm2:start    # مع PM2
```

---

## 🐳 2. التركيب مع Docker (Local)

### الخطوات:

```powershell
# 1. تشغيل كل الخدمات
docker-compose up -d

# 2. تشغيل Migrations
docker-compose exec backend npm run migrate

# 3. فحص الحالة
docker-compose ps
docker-compose logs -f backend
```

**ما يتم تثبيته:**
- ✅ **PostgreSQL** (port 5432) مع pgvector
- ✅ **Redis** (port 6379)
- ✅ **Backend** (port 3000)

**الإعدادات:**
- PostgreSQL: 4GB memory, 200 connections
- Redis: 2GB memory, LRU eviction
- Backend: 4GB memory, cluster mode

---

## 🚀 3. التركيب على السيرفر (Production)

### معلومات السيرفر:

- **IP**: 46.224.42.221
- **Domain**: senorbit.ai
- **User**: root
- **OS**: Linux (Hetzner Cloud)

### الخطوات المتبعة:

#### أ) إعداد البيئة الأساسية:

```bash
# 1. تحديث النظام
apt-get update && apt-get upgrade -y

# 2. تثبيت Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# 3. تثبيت PM2
npm install -g pm2

# 4. تثبيت Nginx
apt-get install -y nginx

# 5. تثبيت PostgreSQL
apt-get install -y postgresql postgresql-contrib

# 6. تثبيت Redis
apt-get install -y redis-server

# 7. تثبيت Certbot (SSL)
apt-get install -y certbot python3-certbot-nginx
```

#### ب) Clone المشروع:

```bash
# 1. إنشاء مجلد التطبيق
mkdir -p /opt/matrix-platform
cd /opt/matrix-platform

# 2. Clone من GitHub
git clone https://github.com/sorooh/matrix-platform.git .

# 3. الانتقال للـ Backend
cd matrix-scaffold/backend
```

#### ج) إعداد قاعدة البيانات:

```bash
# 1. إنشاء قاعدة البيانات والمستخدم
sudo -u postgres psql << EOF
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
CREATE EXTENSION IF NOT EXISTS vector;
\q
EOF

# 2. تعيين DATABASE_URL
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
```

#### د) تثبيت المكتبات وبناء المشروع:

```bash
cd /opt/matrix-platform/matrix-scaffold/backend

# 1. تنظيف وإعادة تثبيت
rm -f package-lock.json
rm -rf node_modules
npm install --production --legacy-peer-deps

# 2. توليد Prisma Client
npx prisma generate

# 3. تشغيل Migrations
npx prisma migrate deploy

# 4. بناء المشروع
npm run build
```

#### هـ) إعداد PM2:

```bash
cd /opt/matrix-platform

# 1. إنشاء ملف PM2 config
cat > pm2.ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'matrix-platform',
    script: './matrix-scaffold/backend/dist/main.js',
    cwd: '/opt/matrix-platform',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATABASE_URL: 'postgresql://matrix:matrix_password_2025@localhost:5432/matrix',
      REDIS_URL: 'redis://localhost:6379',
      CORS_ORIGIN: 'https://senorbit.ai,https://www.senorbit.ai'
    },
    autorestart: true,
    max_memory_restart: '2G'
  }]
}
EOF

# 2. إنشاء مجلد اللوجات
mkdir -p /var/log/matrix-platform

# 3. تشغيل التطبيق
pm2 start pm2.ecosystem.config.js

# 4. حفظ الإعدادات
pm2 save

# 5. تفعيل التشغيل التلقائي
pm2 startup systemd -u root --hp /root
```

#### و) إعداد Nginx:

```bash
# 1. إنشاء ملف الإعدادات
cat > /etc/nginx/sites-available/senorbit.ai << 'EOF'
server {
    listen 80;
    server_name senorbit.ai www.senorbit.ai;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name senorbit.ai www.senorbit.ai;

    ssl_certificate /etc/letsencrypt/live/senorbit.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/senorbit.ai/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 2. تفعيل الموقع
ln -s /etc/nginx/sites-available/senorbit.ai /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 3. اختبار الإعدادات
nginx -t

# 4. إعادة تحميل Nginx
systemctl reload nginx
```

#### ز) إعداد SSL:

```bash
# 1. الحصول على شهادة SSL
certbot --nginx -d senorbit.ai -d www.senorbit.ai \
    --non-interactive \
    --agree-tos \
    --email admin@senorbit.ai \
    --redirect

# 2. تفعيل التجديد التلقائي
systemctl enable certbot.timer
```

---

## 🔧 4. الإصلاحات التي تمت على السيرفر

### المشاكل التي واجهناها:

1. **❌ Prisma Schema Duplicates**
   - **الحل**: `head -n 1495 prisma/schema.prisma` لإزالة التكرارات

2. **❌ npm ci lock file out of sync**
   - **الحل**: `rm -f package-lock.json && npm install --production --legacy-peer-deps`

3. **❌ Missing Prisma Relations**
   - **الحل**: إضافة `user User? @relation(...)` في `Project` model
   - **الحل**: إضافة `@unique` في `Referral.referredUserId`

4. **❌ Prisma Query Engine Not Found**
   - **الحل**: `rm -rf node_modules && npm install && npx prisma generate`

### الأمر الشامل للإصلاح:

تم إنشاء `ONE_COMMAND_FIX.txt` الذي يحتوي على أمر واحد يصلح كل شيء:

```bash
bash << 'EOF'
# ... (الأمر الكامل موجود في ONE_COMMAND_FIX.txt)
EOF
```

---

## 📊 5. الملفات المهمة

### ملفات الإعداد:

- ✅ `setup.ps1` - إعداد محلي تلقائي
- ✅ `start.ps1` - تشغيل محلي
- ✅ `docker-compose.yml` - إعداد Docker
- ✅ `Dockerfile` - بناء Docker image
- ✅ `ecosystem.config.js` - إعداد PM2
- ✅ `.env.example` - قالب متغيرات البيئة

### ملفات التوثيق:

- ✅ `README.md` - نظرة عامة
- ✅ `README_SETUP.md` - دليل الإعداد
- ✅ `DEPLOYMENT_GUIDE.md` - دليل النشر
- ✅ `server-deployment/DEPLOYMENT_GUIDE.md` - دليل النشر على السيرفر

### ملفات الإصلاح:

- ✅ `ONE_COMMAND_FIX.txt` - أمر إصلاح شامل
- ✅ `FIX_SERVER_DIRECT.sh` - سكريبت إصلاح مباشر
- ✅ `AUTO_FIX_ALL_SERVERS.ps1` - إصلاح تلقائي لعدة سيرفرات

---

## ✅ 6. حالة التركيب الحالية

### محلياً (Local):
- ✅ **Node.js**: مثبت
- ✅ **Dependencies**: مثبتة
- ✅ **Database**: جاهزة (PostgreSQL + pgvector)
- ✅ **Redis**: جاهز
- ✅ **Build**: ناجح
- ✅ **Development**: يعمل على `http://localhost:3000`

### على السيرفر (Production):
- ✅ **System**: Linux (Hetzner)
- ✅ **Node.js 20**: مثبت
- ✅ **PM2**: مثبت ومشغل
- ✅ **Nginx**: مثبت ومُعد
- ✅ **PostgreSQL**: مثبت ومُعد
- ✅ **Redis**: مثبت ومشغل
- ✅ **SSL**: مثبت (Let's Encrypt)
- ✅ **Application**: يعمل على `https://senorbit.ai`
- ✅ **Health Check**: `https://senorbit.ai/health`

---

## 🔄 7. التحديثات المستقبلية

### للتحديث على السيرفر:

```bash
cd /opt/matrix-platform
git pull origin master
cd matrix-scaffold/backend
npm install --production --legacy-peer-deps
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart matrix-platform
```

---

## 📝 8. ملاحظات مهمة

1. **الباسوردات**: يجب تغييرها في production
2. **SSH Keys**: يُفضل استخدام SSH keys بدلاً من الباسورد
3. **Firewall**: يجب تفعيل UFW وفتح المنافذ المطلوبة
4. **Backups**: يجب إعداد نسخ احتياطية للقاعدة البيانات
5. **Monitoring**: يجب إعداد مراقبة للأداء (PM2 monit, logs)

---

**تاريخ الإنشاء**: 2025-01-05
**الإصدار**: Matrix Platform v11.0.0
**الحالة**: ✅ **مثبت ويعمل**
