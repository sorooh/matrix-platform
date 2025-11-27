# دليل إعداد Cursor - كل شي عشان الـ Agent
# Cursor Setup Guide - Everything for the Agent

## ✅ ما تم إعداده

### 1. Terminal & Server - للـ Agent
- ✅ **Persistent Sessions**: Terminal يبقى حتى لو اتسكر الكمبيوتر
- ✅ **Scrollback**: 50,000 سطر (بدل 10,000)
- ✅ **Auto-restore**: Terminal يرجع تلقائياً
- ✅ **Multiple Profiles**: PowerShell, CMD, Git Bash

### 2. Live Preview - يشوف اللي عم يصير
- ✅ **Live Server**: معاينة مباشرة للصفحة
- ✅ **Browser Preview**: معاينة داخل Cursor
- ✅ **Auto-refresh**: يتحدث تلقائياً عند التغيير

### 3. Session Persistence - يبقى حتى لو اتسكر
- ✅ **Hot Exit**: يحفظ كل شي قبل الإغلاق
- ✅ **Local History**: يحفظ نسخ من الملفات
- ✅ **Project Manager**: يحفظ المشاريع
- ✅ **Bookmarks**: يحفظ الأماكن المهمة
- ✅ **Workspace State**: يحفظ حالة الـ Workspace

### 4. Chat History - الدردشات تبقى
- ✅ **GitHub Copilot Chat**: يحفظ المحادثات
- ✅ **Tabnine**: يحفظ السياق
- ✅ **Chat Persistence**: الدردشات تبقى في Cursor

---

## 🚀 كيفية الاستخدام

### Terminal Persistent Sessions

1. **افتح Terminal**: `Ctrl + `` (backtick)
2. **Terminal يبقى**: حتى لو أغلقت Cursor
3. **ارجع للـ Terminal**: `Ctrl + Shift + ``

**إعدادات Terminal:**
- Scrollback: 50,000 سطر
- Auto-restore: مفعّل
- Multiple tabs: ممكن

### Live Preview - يشوف اللي عم يصير

#### طريقة 1: Live Server
1. اضغط `Ctrl+Shift+P`
2. اكتب "Live Server: Open with Live Server"
3. أو اضغط `Alt+L` ثم `Alt+O`

#### طريقة 2: Browser Preview
1. اضغط `Ctrl+Shift+P`
2. اكتب "Browser Preview: Open Preview"
3. أو اضغط `Ctrl+Shift+B`

#### طريقة 3: من Terminal
```powershell
# في مجلد Frontend
cd matrix-scaffold/frontend
npx live-server --port=5500 --open=/index.html
```

### Session Persistence - يبقى حتى لو اتسكر

#### Local History
- **استرجاع ملف**: `Ctrl+Shift+P` → "Local History: Find Entry to Restore"
- **مشاهدة التاريخ**: `Ctrl+Shift+P` → "Local History: Compare with Previous"

#### Project Manager
- **حفظ مشروع**: `Ctrl+Shift+P` → "Project Manager: Save Project"
- **فتح مشروع**: `Ctrl+Shift+P` → "Project Manager: List Projects to Open"

#### Bookmarks
- **إضافة bookmark**: `Ctrl+Alt+K`
- **الانتقال للـ bookmark**: `Ctrl+Alt+J`
- **قائمة Bookmarks**: `Ctrl+Alt+L`

### Chat History - الدردشات تبقى

#### GitHub Copilot Chat
1. **فتح Chat**: `Ctrl+L` أو `Ctrl+Shift+L`
2. **المحادثات تبقى**: في الـ Chat Panel
3. **الرجوع للمحادثات**: من الـ Chat History

#### Cursor Chat
- **المحادثات محفوظة**: تلقائياً في Cursor
- **الرجوع**: من الـ Chat Panel في اليسار
- **البحث**: في الـ Chat History

---

## 📦 Extensions المهمة

### Terminal & Server
- `ms-vscode.remote-ssh` - SSH للـ Server
- `ms-vscode.remote-containers` - Docker Containers
- `formulahendry.auto-rename-tag` - Auto rename

### Live Preview
- `ms-vscode.live-server` - Live Server
- `auchenberg.vscode-browser-preview` - Browser Preview
- `ms-playwright.playwright` - Playwright Testing

### Session Persistence
- `alefragnani.project-manager` - Project Manager
- `alefragnani.bookmarks` - Bookmarks
- `eamodio.gitlens` - Git History

### Chat & AI
- `github.copilot` - GitHub Copilot
- `github.copilot-chat` - Copilot Chat
- `tabnine.tabnine-vscode` - Tabnine

---

## ⚙️ الإعدادات المهمة

### Terminal Settings
```json
{
  "terminal.integrated.persistentSessionReviveProcess": "onExit",
  "terminal.integrated.enablePersistentSessions": true,
  "terminal.integrated.scrollback": 50000
}
```

### Session Persistence
```json
{
  "files.hotExit": "onExitAndWindowClose",
  "workbench.localHistory.enabled": true,
  "workbench.editor.restoreViewState": true
}
```

### Live Preview
```json
{
  "liveServer.settings.port": 5500,
  "liveServer.settings.CustomBrowser": "chrome",
  "browser-preview.startUrl": "http://localhost:3000"
}
```

---

## 🔧 Troubleshooting

### Terminal لا يبقى
1. تحقق من: `terminal.integrated.enablePersistentSessions: true`
2. أعد فتح Cursor
3. تحقق من الـ Settings

### Live Preview لا يعمل
1. تأكد من تثبيت `Live Server` extension
2. تأكد من أن الملف `index.html` موجود
3. جرب `Ctrl+Shift+P` → "Live Server: Open with Live Server"

### Chat History لا يبقى
1. تأكد من أن GitHub Copilot مفعّل
2. تحقق من الـ Chat Panel في اليسار
3. جرب إعادة فتح Cursor

### Session لا يبقى
1. تحقق من: `files.hotExit: "onExitAndWindowClose"`
2. تأكد من عدم حذف ملفات `.vscode`
3. جرب حفظ Workspace: `File → Save Workspace As...`

---

## 💡 Tips

1. **استخدم Workspace**: احفظ Workspace عشان كل شي يبقى
2. **Bookmarks مهمة**: احفظ الأماكن المهمة
3. **Local History**: مفيد للرجوع للملفات القديمة
4. **Terminal Tabs**: استخدم tabs للتنظيم
5. **Live Preview**: مفيد للتطوير السريع

---

**✅ كل شي جاهز! استمتع بـ Cursor المحسّن!** 🚀
