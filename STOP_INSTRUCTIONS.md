# تعليمات إيقاف الموقع

## المشكلة
عندما تشغل التيرمنال، الموقع يتعطل بسبب تعارض المنافذ (Ports).

## الحل السريع

### طريقة 1: استخدام السكريبت (الأسهل)
```powershell
powershell -ExecutionPolicy Bypass -File stop-all.ps1
```

### طريقة 2: إيقاف يدوي
```powershell
Get-Process -Name node | Stop-Process -Force
```

## المنافذ المستخدمة
- **3000**: Backend API
- **5173**: Frontend Dev Server  
- **5432**: PostgreSQL
- **6379**: Redis

## ملاحظات
- السكريبت `stop-all.ps1` يوقف كل شيء تلقائياً
- استخدمه قبل تشغيل أي أمر في التيرمنال
- إذا ظهرت عمليات Node.js أخرى، قد تكون من تطبيقات أخرى (مثل VS Code)

## التحقق من المنافذ
```powershell
netstat -ano | findstr ":3000"
```

إذا كان المنفذ حراً، لن يظهر أي شيء.

