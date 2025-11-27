# قواعد الـ AI Agent - عشان ما يكزب
# AI Agent Rules - Prevent Errors

## 🎯 القواعد الأساسية

### 1. Type Safety - الأمان في الأنواع
```typescript
// ❌ خطأ - لا تستخدم any
function process(data: any) { }

// ✅ صحيح - استخدم unknown أو types محددة
function process(data: unknown) {
  if (typeof data === 'string') {
    // الآن TypeScript يعرف أن data هو string
  }
}
```

### 2. Error Handling - معالجة الأخطاء
```typescript
// ❌ خطأ - تجاهل الأخطاء
async function fetchData() {
  const data = await api.get('/data');
  return data;
}

// ✅ صحيح - معالجة الأخطاء
async function fetchData() {
  try {
    const data = await api.get('/data');
    return data;
  } catch (error) {
    logger.error('Failed to fetch data', { error });
    throw new Error('Data fetch failed', { cause: error });
  }
}
```

### 3. Validation - التحقق من البيانات
```typescript
// ❌ خطأ - لا تثق بالبيانات
function createUser(data: any) {
  return db.users.create(data);
}

// ✅ صحيح - تحقق من البيانات
function createUser(data: unknown) {
  const validated = userSchema.parse(data); // Zod validation
  return db.users.create(validated);
}
```

### 4. Environment Variables - المتغيرات البيئية
```typescript
// ❌ خطأ - hardcoded values
const apiKey = 'sk-1234567890';

// ✅ صحيح - environment variables
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('OPENAI_API_KEY is required');
}
```

### 5. Database Queries - استعلامات قاعدة البيانات
```typescript
// ❌ خطأ - SQL injection risk
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ صحيح - parameterized queries
const user = await prisma.user.findUnique({
  where: { id: userId }
});
```

## 🔍 Extensions المهمة للـ Agent

### Error Detection
- **Error Lens**: يعرض الأخطاء مباشرة في الكود
- **SonarLint**: يكتشف المشاكل الأمنية والجودة
- **Pretty TypeScript Errors**: يوضح أخطاء TypeScript

### Type Safety
- **TypeScript Next**: أحدث إصدار TypeScript
- **ESLint**: يكتشف أخطاء الكود
- **Prettier**: ينسق الكود

### Testing
- **Jest Runner**: لتشغيل الاختبارات
- **Jest**: للاختبارات

### Code Quality
- **Code Spell Checker**: يكتشف الأخطاء الإملائية
- **Todo Tree**: يكتشف TODO/FIXME
- **Trailing Spaces**: يزيل المسافات الزائدة

## 📋 Checklist قبل الـ Commit

- [ ] ✅ لا توجد أخطاء TypeScript (`npm run typecheck`)
- [ ] ✅ لا توجد أخطاء ESLint (`npm run lint`)
- [ ] ✅ الكود منسق (`npm run format`)
- [ ] ✅ جميع الاختبارات تمر (`npm test`)
- [ ] ✅ لا توجد console.log في production code
- [ ] ✅ جميع environment variables موجودة
- [ ] ✅ Error handling موجود في كل async function
- [ ] ✅ لا يوجد `any` type

## 🚨 أخطاء شائعة يجب تجنبها

1. **استخدام `any`**: استخدم `unknown` بدلاً منه
2. **تجاهل الأخطاء**: دائماً استخدم try-catch
3. **Hardcoded values**: استخدم environment variables
4. **SQL injection**: استخدم parameterized queries
5. **Missing validation**: تحقق من جميع المدخلات
6. **Silent failures**: سجل جميع الأخطاء
7. **Memory leaks**: أغلق connections و streams
8. **Race conditions**: استخدم proper async/await

## 💡 Tips للـ Agent

1. **اقرأ الكود قبل التعديل**: فهم السياق مهم
2. **اختبر التغييرات**: شغل الاختبارات
3. **راجع الأخطاء**: Error Lens يساعد
4. **استخدم TypeScript**: Type safety مهم
5. **سجل الأخطاء**: Logger مهم للـ debugging
6. **تحقق من Types**: استخدم type guards
7. **استخدم Linter**: ESLint يكتشف المشاكل
8. **راجع Documentation**: اقرأ التوثيق

---

**✅ اتبع هذه القواعد عشان الـ Agent ما يكزب!**
