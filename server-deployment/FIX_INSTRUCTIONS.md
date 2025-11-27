# إصلاح مشكلة الموقع - Matrix Platform v11.0.0
## Fix Website Issue - Matrix Platform v11.0.0

**المشكلة**: الموقع لا يعمل (Cloudflare Error 521)  
**Problem**: Website not working (Cloudflare Error 521)

---

## 🔍 المشكلة / Problem

الموقع يعطي خطأ **521 - Web server is down** من Cloudflare. هذا يعني:
- ✅ Cloudflare يعمل بشكل صحيح
- ✅ DNS مضبوط بشكل صحيح
- ❌ **السيرفر غير متاح أو التطبيق غير شغال**

The website shows **521 - Web server is down** error from Cloudflare. This means:
- ✅ Cloudflare is working correctly
- ✅ DNS is configured correctly
- ❌ **Server is not available or application is not running**

---

## ✅ الحل السريع / Quick Fix

### الطريقة 1: إصلاح سريع (موصى به) / Method 1: Quick Fix (Recommended)

```bash
# 1. الاتصال بالسيرفر / Connect to server
ssh root@46.224.42.221

# 2. تشغيل سكريبت الإصلاح / Run fix script
cd /opt/matrix-platform/server-deployment
chmod +x quick-fix.sh
./quick-fix.sh
```

### الطريقة 2: إصلاح كامل / Method 2: Complete Fix

```bash
# 1. الاتصال بالسيرفر / Connect to server
ssh root@46.224.42.221

# 2. تشغيل سكريبت التحقق والإصلاح / Run check and fix script
cd /opt/matrix-platform/server-deployment
chmod +x check-and-fix.sh
./check-and-fix.sh
```

### الطريقة 3: إعادة النشر / Method 3: Redeploy

إذا لم تعمل الطرق السابقة، قم بإعادة النشر:
If the above methods don't work, redeploy:

```bash
# 1. الاتصال بالسيرفر / Connect to server
ssh root@46.224.42.221

# 2. إعادة النشر / Redeploy
cd /opt/matrix-platform/server-deployment
chmod +x deploy-simple.sh
./deploy-simple.sh
```

---

## 🔧 خطوات يدوية / Manual Steps

إذا كنت تريد إصلاح المشكلة يدوياً:
If you want to fix manually:

### 1. التحقق من الخدمات / Check Services

```bash
# التحقق من حالة الخدمات / Check service status
systemctl status nginx
systemctl status postgresql
systemctl status redis-server
pm2 status
```

### 2. إعادة تشغيل الخدمات / Restart Services

```bash
# إعادة تشغيل الخدمات / Restart services
systemctl restart nginx
systemctl restart postgresql
systemctl restart redis-server
pm2 restart matrix-platform
```

### 3. التحقق من التطبيق / Check Application

```bash
# التحقق من حالة التطبيق / Check application status
cd /opt/matrix-platform
pm2 logs matrix-platform --lines 50

# التحقق من health endpoint / Check health endpoint
curl http://localhost:3000/health
```

### 4. إعادة بناء التطبيق (إذا لزم الأمر) / Rebuild Application (if needed)

```bash
# الانتقال إلى مجلد التطبيق / Navigate to application directory
cd /opt/matrix-platform/matrix-scaffold/backend

# تثبيت الحزم / Install packages
npm ci --production

# تشغيل migrations / Run migrations
export DATABASE_URL="postgresql://matrix:matrix_password_2025@localhost:5432/matrix"
npx prisma migrate deploy
npx prisma generate

# بناء التطبيق / Build application
npm run build

# إعادة تشغيل PM2 / Restart PM2
cd /opt/matrix-platform
pm2 restart matrix-platform
```

---

## 🧪 التحقق من الإصلاح / Verify Fix

بعد الإصلاح، تحقق من:
After fixing, verify:

```bash
# 1. التحقق من health endpoint / Check health endpoint
curl https://senorbit.ai/health

# 2. التحقق من الخدمات / Check services
systemctl status nginx postgresql redis-server
pm2 status

# 3. التحقق من logs / Check logs
pm2 logs matrix-platform --lines 20
```

**النتيجة المتوقعة / Expected Result**:
- ✅ Health endpoint يعيد HTTP 200
- ✅ جميع الخدمات تعمل
- ✅ لا توجد أخطاء في logs

**Expected Result**:
- ✅ Health endpoint returns HTTP 200
- ✅ All services running
- ✅ No errors in logs

---

## 📋 قائمة التحقق / Checklist

- [ ] الاتصال بالسيرفر / Connected to server
- [ ] الخدمات تعمل / Services running
- [ ] PM2 يعمل / PM2 running
- [ ] Health endpoint يعمل / Health endpoint working
- [ ] الموقع يعمل / Website working

---

## 🆘 إذا لم يعمل / If It Doesn't Work

إذا لم تعمل الطرق السابقة:

1. **تحقق من logs** / **Check logs**:
   ```bash
   pm2 logs matrix-platform --lines 100
   tail -f /var/log/nginx/senorbit.ai.error.log
   ```

2. **تحقق من قاعدة البيانات** / **Check database**:
   ```bash
   psql -U matrix -d matrix -c "SELECT 1;"
   ```

3. **تحقق من Redis** / **Check Redis**:
   ```bash
   redis-cli ping
   ```

4. **إعادة النشر الكامل** / **Full redeploy**:
   ```bash
   cd /opt/matrix-platform/server-deployment
   ./deploy-simple.sh
   ```

---

## 📞 معلومات الاتصال / Contact Info

**Server**: 46.224.42.221  
**Domain**: senorbit.ai  
**SSH**: `ssh root@46.224.42.221`  
**Password**: aiadsham

---

**Status**: ✅ **Ready to Fix**  
**Last Updated**: 2025-01-05


