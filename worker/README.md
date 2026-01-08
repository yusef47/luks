# Lukas Worker - Browser Automation Engine

هذا المجلد يحتوي على "عضلات" لوكاس - السيرفر المسؤول عن تشغيل المتصفح والبث المباشر.

## 🚀 الرفع على Hugging Face Spaces

1. أنشئ Space جديد على [Hugging Face](https://huggingface.co/new-space)
2. اختر **Docker** كـ SDK
3. ارفع محتويات هذا المجلد
4. أضف Environment Variable:
   - `WORKER_SECRET` = (نفس القيمة في Vercel)

## ⚙️ Environment Variables

| المتغير | الوصف |
|---------|-------|
| `WORKER_SECRET` | كلمة السر للاتصال الآمن مع "المخ" |
| `PORT` | البورت (افتراضي: 7860) |

## 🔌 الأوامر المتاحة (Socket.io Events)

| الحدث | الوصف |
|-------|-------|
| `browser:goto` | الذهاب لرابط معين |
| `browser:click` | الضغط على عنصر |
| `browser:type` | الكتابة في حقل |
| `browser:scroll` | التمرير لأعلى/لأسفل |
| `browser:screenshot` | أخذ لقطة شاشة |
| `browser:getContent` | جلب محتوى الصفحة |
| `stream:frame` | (صادر) إطار البث المباشر |

## 🧪 التشغيل المحلي

```bash
cd worker
npm install
npx playwright install chromium
npm start
```
