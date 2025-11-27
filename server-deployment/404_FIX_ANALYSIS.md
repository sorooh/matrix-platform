# تحليل مشكلة 404 Not Found - Matrix Platform
## 404 Not Found Problem Analysis - Matrix Platform

**التاريخ / Date**: 2025-01-06  
**المشكلة / Problem**: nginx يعطي 404 Not Found  
**الحالة / Status**: ❌ **يحتاج إصلاح / Requires Fix**

---

## 🔍 تحليل المشكلة / Problem Analysis

### الأعراض / Symptoms
- ✅ nginx يعمل (يعطي رسالة 404)
- ❌ التطبيق لا يعمل على المنفذ 3000
- ❌ nginx لا يستطيع الاتصال بالتطبيق

### السبب المحتمل / Probable Cause

nginx يحاول توجيه الطلبات إلى `http://localhost:3000` لكن:
1. **التطبيق غير شغال** - PM2 لا يعمل أو التطبيق متوقف
2. **التطبيق غير مبني** - ملف `dist/main.js` غير موجود
3. **قاعدة البيانات غير متاحة** - التطبيق لا يستطيع الاتصال
4. **المنفذ محجوز** - منفذ 3000 مستخدم من قبل عملية أخرى

---

## ✅ الحل السريع / Quick Fix

### الخطوة 1: الاتصال بالسيرفر / Step 1: Connect to Server

```bash
ssh root@46.224.42.221
# Password: aiadsham
```

### الخطوة 2: التحقق من الحالة / Step 2: Check Status

```bash
# التحقق من PM2 / Check PM2
pm2 status

# التحقق من التطبيق / Check application
curl http://localhost:3000/health

# التحقق من nginx / Check nginx
systemctl status nginx

# التحقق من المنفذ / Check port
netstat -tlnp | grep 3000
```

### الخطوة 3: إصلاح المشكلة / Step 3: Fix Issue

#### الحل 1: إصلاح سريع (موصى به) / Solution 1: Quick Fix (Recommended)

```bash
cd /opt/matrix-platform/server-deployment
chmod +x quick-fix.sh
./quick-fix.sh
```

#### الحل 2: إصلاح شامل / Solution 2: Complete Fix

```bash
cd /opt/matrix-platform/server-deployment
chmod +x check-and-fix.sh
./check-and-fix.sh
```

---

## 🔧 الحلول اليدوية / Manual Solutions

### الحل 1: التطبيق غير شغال / Solution 1: Application Not Running

**المشكلة / Problem**: PM2 لا يعمل أو التطبيق متوقف

**الحل / Solution**:
```bash
# التحقق من PM2 / Check PM2
pm2 status

# إذا كان التطبيق متوقف / If app is stopped
cd /opt/matrix-platform
pm2 start pm2.ecosystem.config.js

# أو إعادة التشغيل / Or restart
pm2 restart matrix-platform

# حفظ الإعدادات / Save configuration
pm2 save
```

---

### الحل 2: التطبيق غير مبني / Solution 2: Application Not Built

**المشكلة / Problem**: ملف `dist/main.js` غير موجود

**الحل / Solution**:
```bash
# الانتقال إلى مجلد التطبيق / Navigate to app directory
cd /opt/matrix-platform/matrix-scaffold/backend

# التحقق من وجود الملف / Check if file exists
ls -la dist/main.js

# إذا لم يكن موجوداً، بناء التطبيق / If not exists, build app
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
npm ci --production
npx prisma migrate deploy
npx prisma generate
npm run build

# التحقق من البناء / Verify build
ls -la dist/main.js

# إعادة تشغيل PM2 / Restart PM2
cd /opt/matrix-platform
pm2 restart matrix-platform
```

---

### الحل 3: قاعدة البيانات غير متاحة / Solution 3: Database Not Available

**المشكلة / Problem**: التطبيق لا يستطيع الاتصال بقاعدة البيانات

**الحل / Solution**:
```bash
# التحقق من PostgreSQL / Check PostgreSQL
systemctl status postgresql

# إذا كان متوقفاً / If stopped
systemctl start postgresql
systemctl enable postgresql

# التحقق من الاتصال / Check connection
psql -U matrix -d matrix -c "SELECT 1;"

# إذا فشل الاتصال، إعادة إنشاء قاعدة البيانات / If connection fails, recreate database
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS matrix;
CREATE DATABASE matrix;
CREATE USER matrix WITH ENCRYPTED PASSWORD 'matrix_password_2025';
GRANT ALL PRIVILEGES ON DATABASE matrix TO matrix;
\c matrix
GRANT ALL ON SCHEMA public TO matrix;
CREATE EXTENSION IF NOT EXISTS vector;
\q
EOF

# إعادة تشغيل migrations / Rerun migrations
cd /opt/matrix-platform/matrix-scaffold/backend
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
npx prisma migrate deploy
npx prisma generate
```

---

### الحل 4: المنفذ محجوز / Solution 4: Port Already in Use

**المشكلة / Problem**: منفذ 3000 مستخدم من قبل عملية أخرى

**الحل / Solution**:
```bash
# التحقق من المنفذ / Check port
netstat -tlnp | grep 3000

# إيجاد العملية / Find process
lsof -i :3000

# إيقاف العملية / Stop process
kill -9 <PID>

# أو إيقاف جميع عمليات Node.js / Or stop all Node.js processes
pkill -f node

# إعادة تشغيل PM2 / Restart PM2
cd /opt/matrix-platform
pm2 restart matrix-platform
```

---

### الحل 5: nginx لا يستطيع الاتصال / Solution 5: nginx Can't Connect

**المشكلة / Problem**: nginx لا يستطيع الاتصال بـ localhost:3000

**الحل / Solution**:
```bash
# التحقق من إعدادات nginx / Check nginx configuration
cat /etc/nginx/sites-available/senorbit.ai

# التحقق من صحة الإعدادات / Validate configuration
nginx -t

# إعادة تحميل nginx / Reload nginx
systemctl reload nginx

# أو إعادة التشغيل / Or restart
systemctl restart nginx

# التحقق من logs / Check logs
tail -f /var/log/nginx/senorbit.ai.error.log
```

---

## 🧪 التحقق من الإصلاح / Verify Fix

بعد الإصلاح، تحقق من:

```bash
# 1. التحقق من PM2 / Check PM2
pm2 status
pm2 logs matrix-platform --lines 20

# 2. التحقق من health endpoint محلياً / Check health endpoint locally
curl http://localhost:3000/health

# 3. التحقق من nginx / Check nginx
systemctl status nginx
curl https://senorbit.ai/health

# 4. التحقق من جميع الخدمات / Check all services
systemctl status nginx postgresql redis-server
```

**النتيجة المتوقعة / Expected Result**:
- ✅ PM2 يعمل (status: online)
- ✅ Health endpoint يعيد HTTP 200
- ✅ nginx يعمل بشكل صحيح
- ✅ جميع الخدمات تعمل

---

## 📋 قائمة التحقق / Checklist

### قبل الإصلاح / Before Fix
- [ ] الاتصال بالسيرفر / Connected to server
- [ ] التحقق من حالة الخدمات / Checked service status
- [ ] التحقق من logs / Checked logs

### أثناء الإصلاح / During Fix
- [ ] PM2 يعمل / PM2 running
- [ ] التطبيق مبني / Application built
- [ ] قاعدة البيانات متاحة / Database available
- [ ] المنفذ 3000 حر / Port 3000 free
- [ ] nginx يعمل / nginx running

### بعد الإصلاح / After Fix
- [ ] Health endpoint يعمل محلياً / Health endpoint works locally
- [ ] Health endpoint يعمل عبر nginx / Health endpoint works via nginx
- [ ] الموقع يعمل / Website working
- [ ] لا توجد أخطاء في logs / No errors in logs

---

## 🆘 إذا لم يعمل / If It Doesn't Work

### 1. فحص logs بالتفصيل / Detailed Log Check

```bash
# PM2 logs
pm2 logs matrix-platform --lines 100

# nginx error logs
tail -100 /var/log/nginx/senorbit.ai.error.log

# nginx access logs
tail -100 /var/log/nginx/senorbit.ai.access.log

# System logs
journalctl -u nginx -n 100
journalctl -u postgresql -n 100
```

### 2. إعادة النشر الكامل / Full Redeploy

```bash
cd /opt/matrix-platform/server-deployment
chmod +x deploy-simple.sh
./deploy-simple.sh
```

### 3. التحقق من الإعدادات / Check Configuration

```bash
# PM2 configuration
cat /opt/matrix-platform/pm2.ecosystem.config.js

# nginx configuration
cat /etc/nginx/sites-available/senorbit.ai

# Environment variables
pm2 env 0
```

---

## 📊 معلومات السيرفر / Server Information

**السيرفر / Server**:
- **IP**: 46.224.42.221
- **Domain**: senorbit.ai
- **Provider**: Hetzner Cloud
- **Server Name**: senorbit-core

**الوصول / Access**:
- **SSH**: `ssh root@46.224.42.221`
- **Password**: aiadsham
- **Port**: 22

**الخدمات / Services**:
- **Backend**: PM2 Cluster (2 instances) on port 3000
- **Web Server**: Nginx on ports 80/443
- **Database**: PostgreSQL on port 5432
- **Cache**: Redis on port 6379

**المسارات / Paths**:
- **Application**: `/opt/matrix-platform/matrix-scaffold/backend/dist/main.js`
- **PM2 Config**: `/opt/matrix-platform/pm2.ecosystem.config.js`
- **Nginx Config**: `/etc/nginx/sites-available/senorbit.ai`
- **Logs**: `/var/log/matrix-platform/`

---

## 🎯 الخطوات التالية / Next Steps

1. ✅ **الاتصال بالسيرفر** / **Connect to server**
   ```bash
   ssh root@46.224.42.221
   ```

2. ✅ **تشغيل سكريبت الإصلاح** / **Run fix script**
   ```bash
   cd /opt/matrix-platform/server-deployment
   chmod +x quick-fix.sh
   ./quick-fix.sh
   ```

3. ✅ **التحقق من النتيجة** / **Verify result**
   ```bash
   curl https://senorbit.ai/health
   ```

---

**Status**: ❌ **يحتاج إصلاح / Requires Fix**  
**Priority**: 🔴 **عالية / High**  
**Last Updated**: 2025-01-06

---

**تم إنشاء هذا التحليل بواسطة / This analysis was created by**:  
**Auto - Cursor AI Assistant**  
**Date**: 2025-01-06

