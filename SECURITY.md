# 🔒 Security Guide - API Keys Protection

## المشكلة
الـ API keys كانت تظهر في الـ client-side code على Vercel، مما يعرضها للخطر.

## الحل: Backend Proxy Pattern

### ✅ الآن:
```
Client (Frontend)
    ↓ (POST /api/gemini/call)
Backend Proxy (API Keys محمية)
    ↓ (استخدام الـ keys بأمان)
Gemini API
```

### ❌ قبل:
```
Client (Frontend)
    ↓ (API Key مكشوف!)
Gemini API
```

---

## 📋 الملفات الجديدة

### 1. `/api/gemini-proxy.ts`
- يتعامل مع الـ API keys بأمان
- يعمل key rotation تلقائي
- يتتبع حالة كل key

### 2. `/api/routes/gemini.ts`
- Express routes للـ Gemini API
- Endpoint: `POST /api/gemini/call`
- آمن تماماً

---

## 🚀 الاستخدام

### من الـ Frontend:
```typescript
// بدل استخدام الـ API key مباشرة
const response = await fetch('/api/gemini/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        model: 'gemini-2.5-pro',
        prompt: 'Your prompt here'
    })
});

const result = await response.json();
```

### من الـ Backend:
```typescript
import geminiProxy from './api/gemini-proxy';

const result = await geminiProxy.callGeminiAPI({
    model: 'gemini-2.5-pro',
    prompt: 'Your prompt here'
});
```

---

## 🔐 الأمان

### ✓ الـ API Keys:
- محفوظة في `.env` فقط
- لا تظهر في الـ client code
- محمية من الـ Git

### ✓ الـ Backend:
- يتحكم في الوصول للـ API
- يعمل key rotation
- يسجل الأخطاء

### ✓ الـ Frontend:
- لا تحتاج API keys
- تستخدم الـ backend proxy فقط
- آمنة تماماً

---

## 📝 الخطوات المطلوبة

### 1. تحديث الـ Frontend Code
استبدل جميع الـ direct API calls بـ backend proxy calls

### 2. تحديث الـ Server
أضف الـ routes الجديدة في `server.ts`:

```typescript
import geminiRoutes from './api/routes/gemini';

app.use('/api/gemini', geminiRoutes);
```

### 3. اختبار
```bash
# Local
curl -X POST http://localhost:5000/api/gemini/call \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-2.5-pro","prompt":"Hello"}'

# Vercel
curl -X POST https://your-vercel-app.vercel.app/api/gemini/call \
  -H "Content-Type: application/json" \
  -d '{"model":"gemini-2.5-pro","prompt":"Hello"}'
```

---

## 🎯 الفوائد

✅ **الأمان**: الـ API keys محمية  
✅ **الأداء**: Key rotation تلقائي  
✅ **الموثوقية**: Retry logic مدمج  
✅ **الـ Monitoring**: تتبع حالة الـ keys  
✅ **الـ Scalability**: جاهز للـ production  

---

## ⚠️ ملاحظات مهمة

1. **لا تستخدم الـ API keys مباشرة في الـ Frontend**
2. **استخدم الـ Backend Proxy دائماً**
3. **حافظ على الـ .env محمي من الـ Git**
4. **راقب الـ error logs للـ API issues**

---

## 📞 الدعم

إذا واجهت مشاكل:
1. تحقق من الـ .env variables
2. تحقق من الـ API keys صحيحة
3. شوف الـ server logs
4. جرب key تاني من الـ rotation

