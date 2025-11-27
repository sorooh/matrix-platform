# إصلاح السيرفر - Matrix Platform
# Server Fix - Matrix Platform

## 🚨 المشكلة
صيانة السيرفر قالوا "خلي المبرمج يزبط الملف" - هذا الملف يصلح كل شي!

## ✅ الحل السريع

### الخطوة 1: الاتصال بالسيرفر
```bash
ssh root@46.224.42.221
# Password: aiadsham
```

### الخطوة 2: تشغيل ملف الإصلاح
```bash
cd /opt/matrix-platform/server-deployment
chmod +x FIX_NOW.sh
./FIX_NOW.sh
```

**أو انسخ هذا الأمر كامل:**

```bash
cd /opt/matrix-platform/server-deployment && chmod +x FIX_NOW.sh && ./FIX_NOW.sh
```

---

## 📋 ما يفعله الملف

الملف `FIX_NOW.sh` يصلح:

1. ✅ **يحدث المشروع من GitHub**
2. ✅ **يشغل PostgreSQL و Redis و Nginx**
3. ✅ **ينشئ قاعدة البيانات**
4. ✅ **يبني التطبيق (npm install, build)**
5. ✅ **ينشئ Prisma Client**
6. ✅ **يشغل Migrations**
7. ✅ **ينشئ PM2 config**
8. ✅ **يشغل التطبيق مع PM2**
9. ✅ **ينشئ Nginx config**
10. ✅ **ينشئ SSL certificate**
11. ✅ **يتحقق من كل شي**

---

## 🔍 التحقق من الحل

بعد ما ينتهي السكريبت:

```bash
# تحقق من PM2
pm2 status

# تحقق من Health
curl http://localhost:3000/health

# تحقق من الموقع
curl https://senorbit.ai/health
```

---

## 🆘 إذا ما اشتغل

### تحقق من اللوجات:
```bash
# PM2 logs
pm2 logs matrix-platform --lines 50

# Nginx logs
tail -f /var/log/nginx/error.log

# Application logs
tail -f /var/log/matrix-platform/error.log
```

### إعادة تشغيل:
```bash
pm2 restart matrix-platform
systemctl restart nginx
```

---

## 📞 المشاكل الشائعة

### 1. التطبيق ما يشتغل
```bash
# تحقق من البناء
ls -la /opt/matrix-platform/matrix-scaffold/backend/dist/main.js

# إذا ما موجود، ابني:
cd /opt/matrix-platform/matrix-scaffold/backend
npm run build
```

### 2. قاعدة البيانات ما تشتغل
```bash
# تحقق من PostgreSQL
systemctl status postgresql

# إذا ما شغال:
systemctl start postgresql
```

### 3. PM2 ما يشتغل
```bash
# تحقق من PM2
pm2 status

# إذا ما موجود:
npm install -g pm2
pm2 start pm2.ecosystem.config.js
```

---

**✅ الملف جاهز! شغّله على السيرفر!** 🚀
