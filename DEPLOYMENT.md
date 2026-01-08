# Lukas AI: دليل النشر (Deployment Guide)

هذا الدليل يشرح كيفية نشر نظام "المخ والعضلات" بالكامل.

---

## 1. المخ (The Brain) - Vercel

المخ مستضاف بالفعل على Vercel. تأكد من إضافة المتغيرات البيئية التالية:

### Environment Variables (Vercel Dashboard):

| المتغير | الوصف |
|---------|-------|
| `GEMINI_API_KEY_1` ... `GEMINI_API_KEY_15` | مفاتيح Google Gemini |
| `OPENROUTER_API_KEY_1` ... | مفاتيح OpenRouter |
| `GROQ_API_KEY_1` ... | مفاتيح Groq |
| `WORKER_URL` | رابط سيرفر العضلات (Hugging Face Space) |
| `WORKER_SECRET` | كلمة السر للاتصال الآمن |

---

## 2. العضلات (The Muscles) - Hugging Face Spaces

### خطوات الإعداد:

1. **أنشئ Space جديد:**
   - اذهب إلى [huggingface.co/new-space](https://huggingface.co/new-space)
   - اختر **Docker** كـ SDK
   - اختر **CPU basic** (16GB RAM مجاني)

2. **ارفع محتويات مجلد `worker/`:**
   - `Dockerfile`
   - `package.json`
   - `index.js`
   - `README.md`

3. **أضف Environment Variables في Settings:**
   - `WORKER_SECRET` = نفس القيمة في Vercel

4. **انتظر البناء:**
   - Hugging Face سيبني الـ Docker تلقائياً
   - بعد الانتهاء، ستحصل على رابط مثل: `https://your-username-lukas-worker.hf.space`

5. **حدّث Vercel:**
   - أضف رابط الـ Space في `WORKER_URL` على Vercel

---

## 3. الاختبار

بعد النشر، يمكنك اختبار الاتصال:

```bash
# من أي مكان
curl https://your-username-lukas-worker.hf.space/health
```

النتيجة المتوقعة:
```json
{"status": "healthy", "timestamp": "..."}
```

---

## 4. الأمان

- ✅ كل الاتصالات تتطلب `WORKER_SECRET`
- ✅ لا يوجد وصول مباشر للمتصفح بدون مصادقة
- ✅ البث المباشر يمر عبر Vercel (لا يتم كشف Worker URL للمستخدمين)

---

## 5. التطوير المحلي

للتطوير على جهازك:

```bash
# Terminal 1: تشغيل العضلات محلياً
cd worker
npm install
npx playwright install chromium
npm start

# Terminal 2: تشغيل المخ (Vite)
npm run dev
```

ثم أضف في `.env`:
```
WORKER_URL=http://localhost:7860
WORKER_SECRET=lukas-dev-secret
```
