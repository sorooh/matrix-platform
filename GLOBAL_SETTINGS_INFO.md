# إعدادات Cursor العامة - تطبق على كل المشاريع
# Global Cursor Settings - Apply to All Projects

## ✅ ما تم إعداده

تم إضافة الإعدادات المهمة إلى **User Settings** عشان تبقى في كل المشاريع الجديدة!

### الموقع:
```
C:\Users\Zulik\AppData\Roaming\Cursor\User\settings.json
```

---

## 📋 الإعدادات المضافة

### 1. Terminal Persistent Sessions
- ✅ Scrollback: 50,000 سطر
- ✅ Persistent Sessions: مفعّل
- ✅ Auto-restore: Terminal يرجع تلقائياً
- ✅ Multiple Profiles: PowerShell, CMD, Git Bash

### 2. Session Persistence
- ✅ Hot Exit: يحفظ كل شي قبل الإغلاق
- ✅ Local History: يحفظ نسخ من الملفات (50 نسخة)
- ✅ Workspace State: يحفظ حالة الـ Workspace
- ✅ Editor State: يحفظ حالة الملفات المفتوحة

### 3. Live Preview
- ✅ Live Server: Port 5500
- ✅ Browser Preview: Auto-refresh
- ✅ Custom Browser: Chrome

### 4. Chat History
- ✅ GitHub Copilot: مفعّل
- ✅ Copilot Chat: يحفظ المحادثات
- ✅ Tabnine: Auto-imports

### 5. Code Quality
- ✅ Error Lens: يعرض الأخطاء مباشرة
- ✅ SonarLint: يكتشف المشاكل
- ✅ Pretty TS Errors: يوضح أخطاء TypeScript
- ✅ Todo Tree: يكتشف TODO/FIXME
- ✅ Spell Checker: يكتشف الأخطاء الإملائية

---

## 🎯 الفرق بين User Settings و Workspace Settings

### User Settings (Global)
- **الموقع**: `C:\Users\Zulik\AppData\Roaming\Cursor\User\settings.json`
- **التطبيق**: على **كل المشاريع** الجديدة
- **المحتوى**: إعدادات عامة (Terminal, Session, Chat, Code Quality)

### Workspace Settings (Project-Specific)
- **الموقع**: `.vscode/settings.json` في كل مشروع
- **التطبيق**: على **مشروع واحد فقط**
- **المحتوى**: إعدادات خاصة بالمشروع (Remote SSH, Project-specific paths)

---

## ✅ النتيجة

الآن لما تفتح **مشروع جديد**:
- ✅ Terminal Persistent Sessions: **موجود**
- ✅ Session Persistence: **موجود**
- ✅ Live Preview: **موجود**
- ✅ Chat History: **موجود**
- ✅ Code Quality Tools: **موجودة**

**كل شي راح يبقى في كل المشاريع الجديدة!** 🚀

---

## 🔧 كيفية التعديل

### تعديل User Settings (لكل المشاريع):
1. اضغط `Ctrl+Shift+P`
2. اكتب "Preferences: Open User Settings (JSON)"
3. عدّل الملف

### تعديل Workspace Settings (لمشروع واحد):
1. اضغط `Ctrl+Shift+P`
2. اكتب "Preferences: Open Workspace Settings (JSON)"
3. عدّل الملف

---

## 💡 Tips

1. **User Settings**: للإعدادات العامة التي تريدها في كل المشاريع
2. **Workspace Settings**: للإعدادات الخاصة بمشروع معين
3. **Extensions**: Extensions المثبتة تطبق على كل المشاريع
4. **Workspace Extensions**: يمكن تحديد Extensions خاصة بمشروع في `.vscode/extensions.json`

---

**✅ كل شي جاهز! الإعدادات راح تبقى في كل المشاريع الجديدة!** 🎉
