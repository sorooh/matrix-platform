# كيفية تشغيل الإصلاح على السيرفرات

## الطريقة 1: يدوياً (الأسهل)

### لكل سيرفر:

1. افتح Terminal (PowerShell)
2. اتصل بالسيرفر:
   ```bash
   ssh root@46.224.42.221
   ```
   (الباسورد: `aiadsham`)

3. انسخ الأمر من ملف `ONE_COMMAND_FIX.txt` والصقه
4. اضغط Enter
5. انتظر 5-10 دقائق

---

## الطريقة 2: تلقائياً (يحتاج PuTTY)

### تثبيت PuTTY:
```powershell
winget install PuTTY.PuTTY
```

### تشغيل السكريبت:
```powershell
.\AUTO_FIX_ALL_SERVERS.ps1
```

---

## الطريقة 3: استخدام SSH Key (الأسرع)

### إنشاء SSH Key:
```bash
ssh-keygen -t rsa -b 4096
```

### نسخ المفتاح للسيرفر:
```bash
ssh-copy-id root@46.224.42.221
```

### ثم تشغيل الأمر مباشرة:
```bash
ssh root@46.224.42.221 "bash -s" < ONE_COMMAND_FIX.txt
```

---

## ملاحظات

- الأمر موجود في: `ONE_COMMAND_FIX.txt`
- السكريبت التلقائي: `AUTO_FIX_ALL_SERVERS.ps1`
- الوقت المتوقع: 5-10 دقائق لكل سيرفر
