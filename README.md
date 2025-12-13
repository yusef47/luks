# Lukas AI Orchestrator

منصة ذكاء اصطناعي متقدمة مبنية على Google Gemini API مع نظام Multi-Agent Orchestrator.

**Live Demo:** https://luks-pied.vercel.app

---

## Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │
│  │  Chat   │  │ Tutor   │  │  Auto   │  │ Present │  │  Daily │ │
│  │  Mode   │  │  Mode   │  │  Mode   │  │  Mode   │  │  Feed  │ │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └───┬────┘ │
└───────┼────────────┼────────────┼────────────┼───────────┼──────┘
        │            │            │            │           │
        ▼            ▼            ▼            ▼           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Serverless Functions                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ orchestrator │  │  autonomous  │  │  daily-feed  │           │
│  │     .js      │  │     .js      │  │     .js      │           │
│  └──────┬───────┘  └──────────────┘  └──────────────┘           │
│         │                                                        │
│  ┌──────┴───────────────────────────────────────┐               │
│  │            orchestrator/                      │               │
│  │  ┌────────┐ ┌────────┐ ┌──────────┐ ┌──────┐ │               │
│  │  │ plan   │ │ search │ │ intermed │ │synth │ │               │
│  │  │  .js   │ │  .js   │ │   .js    │ │ .js  │ │               │
│  │  └────────┘ └────────┘ └──────────┘ └──────┘ │               │
│  └──────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Gemini API Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │ gemini-2.5-flash│  │gemini-2.5-flash │  │ gemini-robotics │  │
│  │    (Primary)    │  │  -lite (FB1)    │  │  -er (FB2)      │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### `/api/orchestrator` (POST)
المنسق الرئيسي للمحادثات.

**Request:**
```json
{
  "prompt": "string",
  "conversationHistory": [
    { "prompt": "string", "results": [] }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": "AI response text"
}
```

---

### `/api/orchestrator/plan` (POST)
تحليل الطلب وإنشاء خطة التنفيذ.

**Request:**
```json
{
  "prompt": "string",
  "hasImage": false,
  "hasVideo": false,
  "history": []
}
```

**Response:**
```json
{
  "plan": [
    { "step": 1, "agent": "SearchAgent", "task": "description" }
  ],
  "clarification": null
}
```

---

### `/api/orchestrator/search` (POST)
بحث الويب عبر Google Search Grounding.

**Request:**
```json
{
  "task": "search query"
}
```

**Response:**
```json
{
  "success": true,
  "data": "search results text"
}
```

---

### `/api/orchestrator/intermediate` (POST)
معالجة الخطوات الوسيطة.

**Request:**
```json
{
  "task": "task description",
  "prompt": "user prompt",
  "results": []
}
```

---

### `/api/orchestrator/synthesize` (POST)
تجميع النتائج في رد نهائي.

**Request:**
```json
{
  "prompt": "original prompt",
  "results": [],
  "conversationHistory": []
}
```

---

### `/api/autonomous` (POST)
البحث المستقل مع التقارير.

**Request:**
```json
{
  "query": "research topic"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "report": "markdown report",
    "sources": ["url1", "url2"],
    "stats": [{ "label": "", "value": "" }],
    "chartData": {}
  }
}
```

---

### `/api/daily-feed` (POST)
النشرة الذكية اليومية.

**Request:**
```json
{
  "email": "user@email.com",
  "topics": "AI, technology",
  "language": "ar",
  "preview": false
}
```

---

### `/api/file/process` (POST)
معالجة الملفات (صور، PDF، Word، Excel).

**Request:**
```json
{
  "fileContent": "base64 string",
  "mimeType": "application/pdf",
  "fileName": "document.pdf"
}
```

**Limits:**
- Max file size: 3MB
- Supported: image/*, application/pdf, .docx, .xlsx

---

### `/api/tutor/chat` (POST)
محادثة تعليم الإنجليزية.

**Request:**
```json
{
  "message": "Hello",
  "level": "A1",
  "personaId": "emma"
}
```

---

## Smart Fallback System

### المشكلة
Google Gemini API لديه Rate Limits - كل مفتاح له عدد محدود من الطلبات في الدقيقة (RPM) وفي اليوم (RPD).

### الحل
نظام Fallback ذكي يجرب كل المفاتيح المتاحة وكل الموديلات قبل أن يفشل.

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Request Received                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              Load All API Keys (1-13 + Main)                     │
│              Shuffle them randomly for load balancing            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   attempts = 0                                   │
│                   maxRetries = 30                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │     FOR each MODEL in [Primary,     │
          │         Fallback1, Fallback2]       │
          └──────────────────┬──────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │     FOR each API_KEY in keys[]      │
          └──────────────────┬──────────────────┘
                             │
                             ▼
               ┌─────────────────────────┐
               │  attempts >= maxRetries? │
               └────────────┬────────────┘
                   YES │         │ NO
                       │         │
                       ▼         ▼
              ┌────────────┐  ┌────────────────────┐
              │   THROW    │  │ Call Gemini API    │
              │   ERROR    │  │ with MODEL + KEY   │
              └────────────┘  └─────────┬──────────┘
                                        │
                              ┌─────────┴─────────┐
                              │   Response Code?   │
                              └─────────┬─────────┘
                                        │
              ┌─────────────┬───────────┼───────────┬─────────────┐
              │             │           │           │             │
              ▼             ▼           ▼           ▼             ▼
         ┌────────┐   ┌──────────┐ ┌────────┐ ┌──────────┐  ┌──────────┐
         │  200   │   │   429    │ │  404   │ │ 503/500  │  │  Empty   │
         │SUCCESS │   │Rate Limit│ │Not Found│ │  Error   │  │ Response │
         └───┬────┘   └────┬─────┘ └────┬───┘ └────┬─────┘  └────┬─────┘
             │             │            │          │             │
             ▼             ▼            ▼          ▼             ▼
        ┌────────┐   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ RETURN │   │Try Next  │ │Try Next  │ │Try Next  │ │Try Next  │
        │ RESULT │   │   KEY    │ │  MODEL   │ │   KEY    │ │   KEY    │
        └────────┘   │(continue)│ │ (break)  │ │(continue)│ │(continue)│
                     └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

### الكود الفعلي

```javascript
const MODELS = {
    PRIMARY: 'gemini-2.5-flash',      // الأسرع والأقوى
    FALLBACK_1: 'gemini-2.5-flash-lite', // أخف وأسرع
    FALLBACK_2: 'gemini-robotics-er-1.5-preview' // احتياطي
};

const ALL_MODELS = [MODELS.PRIMARY, MODELS.FALLBACK_1, MODELS.FALLBACK_2];

function getAPIKeys() {
    const keys = [];
    // جمع كل المفاتيح المتاحة
    for (let i = 1; i <= 13; i++) {
        const key = process.env[`GEMINI_API_KEY_${i}`];
        if (key && key.trim().length > 0) {
            keys.push(key.trim());
        }
    }
    // إضافة المفتاح الرئيسي
    if (process.env.GEMINI_API_KEY) {
        keys.push(process.env.GEMINI_API_KEY.trim());
    }
    // خلط عشوائي لتوزيع الحمل
    return keys.sort(() => Math.random() - 0.5);
}

async function callGeminiAPI(prompt, maxRetries = 30) {
    const keys = getAPIKeys();
    console.log(`Found ${keys.length} API keys`);
    
    if (keys.length === 0) {
        throw new Error('No API keys configured');
    }

    let lastError = null;
    let attempts = 0;

    // Loop 1: جرب كل موديل
    for (const model of ALL_MODELS) {
        // Loop 2: جرب كل مفتاح
        for (const apiKey of keys) {
            if (attempts >= maxRetries) {
                console.log(`Reached max retries (${maxRetries})`);
                break;
            }
            attempts++;

            try {
                console.log(`Attempt ${attempts}: ${model} with key ...${apiKey.slice(-6)}`);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'x-goog-api-key': apiKey 
                    },
                    body: JSON.stringify({ /* ... */ })
                });

                // 429 = Rate Limit → جرب مفتاح تاني
                if (response.status === 429) {
                    console.log(`Key rate limited, trying next...`);
                    lastError = new Error('Rate limit');
                    continue; // ← التالي في نفس الـ loop
                }
                
                // 404 = الموديل مش موجود → جرب موديل تاني
                if (response.status === 404) {
                    console.log(`Model not found, trying next model...`);
                    lastError = new Error('Model not found');
                    break; // ← اخرج من loop المفاتيح، روح للموديل التالي
                }
                
                // أي خطأ تاني → جرب مفتاح تاني
                if (!response.ok) {
                    lastError = new Error(`Error ${response.status}`);
                    continue;
                }

                // ✅ نجاح!
                const data = await response.json();
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                
                if (!text) {
                    lastError = new Error('Empty response');
                    continue;
                }

                console.log(`SUCCESS on attempt ${attempts} with ${model}!`);
                return text;

            } catch (e) {
                lastError = e;
                continue;
            }
        }
    }
    
    // كل المحاولات فشلت
    throw lastError || new Error('All API attempts failed');
}
```

### سيناريوهات الـ Fallback

| السيناريو | السلوك |
|-----------|--------|
| Key 1 → 429 | جرب Key 2 على نفس الموديل |
| All keys → 429 | جرب الموديل التالي مع كل المفاتيح |
| Model → 404 | انتقل فوراً للموديل التالي |
| 30 محاولة فشلت | ارجع خطأ للمستخدم |

### Configuration

```
maxRetries = 30  (للـ Daily Feed)
maxRetries = 9   (للـ APIs الأخرى)

الموديلات المدعومة:
1. gemini-2.5-flash (Primary - 5 RPM)
2. gemini-2.5-flash-lite (Fallback - 10 RPM)
3. gemini-robotics-er-1.5-preview (Fallback - 10 RPM)

المفاتيح المدعومة:
- GEMINI_API_KEY (الرئيسي)
- GEMINI_API_KEY_1 إلى GEMINI_API_KEY_13 (13 مفتاح إضافي)
```

---

## Backend-Only Architecture

### لماذا Backend فقط؟

1. **الأمان**: API Keys لا تظهر في الـ Frontend أبداً
2. **التحكم**: Rate limiting والـ logging في مكان واحد
3. **المرونة**: تغيير الموديلات بدون تحديث الـ Frontend

### كيف يعمل؟

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (Browser)                       │
│                                                                  │
│   ❌ لا يوجد API Keys هنا                                        │
│   ❌ لا يوجد اتصال مباشر بـ Gemini                               │
│                                                                  │
│   ✅ يرسل الطلبات فقط لـ /api/*                                 │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 │ HTTP Request
                                 │ (prompt only, no keys)
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Vercel Serverless Functions                   │
│                                                                  │
│   ✅ API Keys محفوظة كـ Environment Variables                   │
│   ✅ كل الاتصالات بـ Gemini من هنا                              │
│   ✅ Fallback Logic                                              │
│   ✅ Error Handling                                              │
│   ✅ Logging                                                     │
│                                                                  │
│   process.env.GEMINI_API_KEY  ← سري، مش ظاهر للمستخدم           │
│   process.env.GEMINI_API_KEY_1                                   │
│   process.env.GEMINI_API_KEY_2                                   │
│   ...                                                            │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 │ API Request
                                 │ (with API Key in header)
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Google Gemini API                           │
│                                                                  │
│   https://generativelanguage.googleapis.com/v1beta/models/      │
│   x-goog-api-key: [API_KEY from server]                         │
└─────────────────────────────────────────────────────────────────┘
```

### مقارنة: Frontend vs Backend API Calls

| الجانب | Frontend (❌ خطر) | Backend (✅ آمن) |
|--------|------------------|------------------|
| API Key | ظاهر في الكود | مخفي في Environment |
| المستخدم | يقدر يسرق المفتاح | مش شايف حاجة |
| Rate Limit | مفيش تحكم | تحكم كامل |
| الـ Fallback | صعب التنفيذ | سهل ومركزي |
| الـ Logging | مفيش | كل request متسجل |

### مثال عملي

**Frontend (App.tsx):**
```typescript
// ❌ لا يوجد API Key هنا
const response = await fetch('/api/orchestrator', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: userMessage })
});
```

**Backend (api/orchestrator.js):**
```javascript
// ✅ API Key هنا فقط
export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY; // ← سري
    
    const response = await fetch(GEMINI_URL, {
        headers: { 'x-goog-api-key': apiKey } // ← يُرسل للـ Gemini
    });
    
    return res.json({ data: response });
}
```

### Vercel Environment Variables

```
Vercel Dashboard → Project → Settings → Environment Variables

┌────────────────────┬────────────────────────────┐
│ Name               │ Value                      │
├────────────────────┼────────────────────────────┤
│ GEMINI_API_KEY     │ AIza...xxxxx               │
│ GEMINI_API_KEY_1   │ AIza...yyyyy               │
│ GEMINI_API_KEY_2   │ AIza...zzzzz               │
│ ...                │ ...                        │
│ RESEND_API_KEY     │ re_...xxxxx                │
└────────────────────┴────────────────────────────┘

هذه القيم:
- ❌ لا تظهر في الكود
- ❌ لا تظهر في الـ Build logs
- ❌ لا يمكن للمستخدم رؤيتها
- ✅ متاحة فقط في الـ Serverless Functions
```

---

## Frontend Components

### `App.tsx`
Main application component. Manages:
- Conversation state
- Mode switching (Chat/Tutor/Presentation/Autonomous)
- File attachments
- Speech synthesis

### `Sidebar.tsx`
Navigation with mode toggles:
- New Project
- Presentation Mode
- Autonomous Mode
- Daily Intelligence
- Tutor Controls

### `ChatPanel.tsx`
Chat interface with:
- Message display
- Typing indicator
- File preview
- Voice input

### `AutonomousMode.tsx`
Research mode with:
- Progress tracking
- Chart rendering (Donut, Bar, Ranking, Score, Versus)
- PDF export
- Source citations

### `PresentationGenerator.tsx`
PowerPoint creation with:
- PDF upload and parsing
- Slide preview
- Theme selection
- PPTX download

### `DailyFeedSettings.tsx`
Daily digest configuration:
- Topic selection
- Schedule setting
- Language preference
- Preview functionality

---

## Data Types

```typescript
interface Exchange {
  id: string;
  prompt: string;
  status: 'planning' | 'executing' | 'completed' | 'error';
  plan: PlanStep[] | null;
  results: StepResult[];
  imageFile: File | null;
  videoFile: File | null;
  documentFile: File | null;
}

interface PlanStep {
  step: number;
  agent: Agent;
  task: string;
}

enum Agent {
  Orchestrator = 'Orchestrator',
  SearchAgent = 'SearchAgent',
  MapsAgent = 'MapsAgent',
  VisionAgent = 'VisionAgent',
  VideoAgent = 'VideoAgent',
  EmailAgent = 'EmailAgent',
  SheetsAgent = 'SheetsAgent',
  DriveAgent = 'DriveAgent'
}
```

---

## Environment Variables

```env
# Required
GEMINI_API_KEY=your_primary_key

# Optional - Additional keys for load balancing
GEMINI_API_KEY_1=key1
GEMINI_API_KEY_2=key2
GEMINI_API_KEY_3=key3
# ... up to GEMINI_API_KEY_13

# Email (for Daily Feed)
RESEND_API_KEY=your_resend_key
```

---

## Installation

```bash
# Clone
git clone https://github.com/yusef47/luks.git
cd luks

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your API keys

# Development
npm run dev

# Build
npm run build
```

---

## Deployment

### Vercel (Recommended)

1. Connect GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy

**Limits (Hobby Plan):**
- 12 Serverless Functions max
- 10 second function timeout
- 4.5MB request body limit

---

## File Structure

```
lukas/
├── api/
│   ├── orchestrator.js          # Main chat orchestrator
│   ├── orchestrator/
│   │   ├── plan.js              # Task planning
│   │   ├── search.js            # Web search with grounding
│   │   ├── intermediate.js      # Step processing
│   │   └── synthesize.js        # Response synthesis
│   ├── autonomous.js            # Research mode
│   ├── daily-feed.js            # Daily digest
│   ├── file/
│   │   └── process.js           # File processing
│   ├── tutor/
│   │   ├── chat.js              # Tutor conversation
│   │   └── generate-response.js # Tutor responses
│   └── gemini/
│       └── call.js              # Generic Gemini calls
├── src/
│   ├── components/
│   │   ├── AutonomousMode.tsx
│   │   ├── DailyFeedSettings.tsx
│   │   ├── chat/
│   │   │   ├── ChatPanel.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   └── TutorControls.tsx
│   │   ├── presentation/
│   │   │   └── PresentationGenerator.tsx
│   │   └── computer/
│   │       ├── VirtualComputer.tsx
│   │       └── TaskProgress.tsx
│   ├── services/
│   │   ├── speechService.ts
│   │   └── tutorClient.ts
│   └── config/
│       └── tutorPersonas.ts
├── App.tsx
├── types.ts
├── localization.ts
└── package.json
```

---

## Technologies

| Category | Technology |
|----------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, CSS Variables |
| AI | Google Gemini 2.5 Flash/Lite |
| Search | Google Search Grounding |
| Hosting | Vercel Serverless |
| Email | Resend API |
| PDF | pdf-lib, pptxgenjs |

---

## Current Limitations

1. **Vercel Timeout**: 10 second max for API calls
2. **File Size**: 3MB max for uploads
3. **Functions**: 12 max on Hobby plan
4. **Email**: Requires domain verification for external recipients
5. **Rate Limits**: Depends on Gemini API quota

---

## Version History

- **v1.0**: Basic chat with orchestrator
- **v1.1**: Multi-agent system
- **v1.2**: Tutor mode
- **v1.3**: Presentation generator
- **v1.4**: Autonomous research mode
- **v1.5**: Daily intelligence feed
- **v1.6**: Smart fallback system with 30 retries
- **v1.7**: Ensemble AI System (Gemini + Groq) with parallel processing

---

## 🧠 Ensemble AI System (v1.7)

### ما هو نظام Ensemble؟

نظام متقدم يشغل **عدة مزودين للذكاء الاصطناعي بالتوازي** (Gemini + Groq) للحصول على أفضل إجابة وضمان أعلى موثوقية.

### كيف يعمل؟

```
┌─────────────────────────────────────────────────────────────────┐
│                    👤 سؤال المستخدم                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
             ┌───────────────┴───────────────┐
             │         بالتوازي              │
             ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│  🔵 فريق Gemini     │       │  🟣 فريق Groq       │
│  10 مفاتيح          │       │  5 مفاتيح           │
│  3 موديلات          │       │  2 موديلات          │
└─────────┬───────────┘       └─────────┬───────────┘
          │                             │
          │    📝 إجابة 1               │  📝 إجابة 2
          │                             │
          └───────────────┬─────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                 🧠 Synthesizer (الدامج)                         │
│                                                                 │
│   • مقارنة الإجابتين                                            │
│   • اختيار الأفضل أو الدمج                                      │
│   • تفضيل Gemini للعربية                                        │
└────────────────────────────┬────────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ✅ الإجابة النهائية                          │
└─────────────────────────────────────────────────────────────────┘
```

### المزودين المدعومين

| المزود | الموديلات | المفاتيح | السرعة |
|--------|----------|----------|--------|
| **Gemini** | gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash | 10 | ~100 tok/s |
| **Groq** | llama-3.3-70b-versatile, llama-3.1-8b-instant | 5 | ~400 tok/s |

### مميزات النظام

| الميزة | الوصف |
|--------|-------|
| **Parallel Processing** | الفريقين يشتغلوا بالتوازي = سرعة أعلى |
| **Auto-Fallback** | لو واحد فشل، التاني شغال |
| **Smart Synthesis** | دمج أفضل ما في الإجابتين |
| **Arabic Preference** | Gemini يُفضل للأسئلة العربية |
| **99.9% Uptime** | 15 مفتاح × 5 موديلات = 75 خيار fallback |

### Environment Variables (Groq)

```env
# Groq API Keys (5 مفاتيح)
GROQ_API_KEY_1=gsk_xxxxx
GROQ_API_KEY_2=gsk_xxxxx
GROQ_API_KEY_3=gsk_xxxxx
GROQ_API_KEY_4=gsk_xxxxx
GROQ_API_KEY_5=gsk_xxxxx
```

### استخدام Ensemble

```javascript
import { runEnsemble, runEnsembleFast } from './api/lib/ensemble.js';

// تشغيل كلا الفريقين بالتوازي ودمج النتائج
const result = await runEnsemble('ما هو الذكاء الاصطناعي؟');

// أو استخدام Fast Mode (أول من يرد)
const fastResult = await runEnsembleFast('What is AI?');
```

### نتائج الاختبارات

```
┌─────────────────────────────────────────────────────────────────┐
│                    📊 Stress Test Results                        │
├─────────────────────────────────────────────────────────────────┤
│  Total Requests:     100                                        │
│  Success Rate:       100% ✅                                    │
│  Average Speed:      19.2 req/s                                 │
│  Fallback Usage:     ~50% (worked perfectly)                    │
│                                                                 │
│  Per Key Stats:                                                 │
│  • Luks1: ✅20 success | ⚠️10 rate-limited → fallback          │
│  • Luks2: ✅20 success | ⚠️20 rate-limited → fallback          │
│  • Luks3: ✅20 success | ⚠️18 rate-limited → fallback          │
│  • Luks4: ✅20 success | ⚠️30 rate-limited → fallback          │
│  • Luks5: ✅20 success | ⚠️29 rate-limited → fallback          │
└─────────────────────────────────────────────────────────────────┘
```

### Groq vs Gemini

| المقارنة | Groq | Gemini |
|----------|------|--------|
| **السرعة** | ⚡ 400+ tok/s | 100 tok/s |
| **Max Tokens** | 32K | 8K-32K |
| **العربية** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **مجاني** | ✅ | ✅ |
| **Rate Limits** | 30 req/min | 5-10 RPM |

---

## Capacity Planning

### القدرة الحالية (15 مفتاح)

```
Gemini:  10 keys × 900 req/hour = 9,000 req/hour
Groq:    5 keys × 30 req/min   = 9,000 req/hour

Total Capacity: ~18,000 requests/hour
               = 432,000 requests/day
```

### التوصيات للـ Scale

| المستخدمين/يوم | المطلوب |
|----------------|---------|
| 1,000 | 15 مفتاح (الحالي) ✅ |
| 5,000 | 25 مفتاح |
| 10,000 | 40 مفتاح |
| 50,000+ | Enterprise Plan |

