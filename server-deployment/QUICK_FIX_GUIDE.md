# دليل الإصلاح السريع - Matrix Platform
## Quick Fix Guide - Matrix Platform

**المشكلة / Problem**: الموقع لا يعمل (Error 521)  
**الحل / Solution**: إصلاح سريع في 3 خطوات

---

## 🚀 الحل السريع (3 خطوات) / Quick Fix (3 Steps)

### الخطوة 1: الاتصال بالسيرفر / Step 1: Connect to Server

```bash
ssh root@46.224.42.221
```

**كلمة المرور / Password**: `aiadsham`

---

### الخطوة 2: تشغيل سكريبت الإصلاح / Step 2: Run Fix Script

```bash
cd /opt/matrix-platform/server-deployment
chmod +x quick-fix.sh
./quick-fix.sh
```

---

### الخطوة 3: التحقق / Step 3: Verify

```bash
curl https://senorbit.ai/health
```

**النتيجة المتوقعة / Expected Result**: HTTP 200

---

## ✅ انتهى! / Done!

إذا كان health endpoint يعيد HTTP 200، فالمشكلة تم إصلاحها!

**If the health endpoint returns HTTP 200, the problem is fixed!**

---

## 🆘 إذا لم يعمل / If It Doesn't Work

جرب الحل الكامل:

```bash
cd /opt/matrix-platform/server-deployment
chmod +x check-and-fix.sh
./check-and-fix.sh
```

---

**Status**: ✅ **Ready to Fix**  
**Time**: 5-10 دقائق / minutes


