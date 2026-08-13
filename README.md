# Hisabati Scan

Build Hisabati Scanner — External Thin Client for Hisabati



أريد بناء تطبيق مستقل باسم:



Hisabati Scanner



هذا التطبيق ليس نظامًا محاسبيًا مستقلًا، وليس لديه AI أو OCR أو Fraud Engine خاص به.



هو Thin External Client يتصل مباشرة بـHisabati Core عبر API موجود بالفعل.



1. Existing Hisabati API



Hisabati Core لديه API منشور وجاهز:



POST /functions/v1/submit-receipt



ويعمل داخل مشروع Supabase الخاص بـHisabati.



API Contract:



{

  "organization_id": "uuid",

  "branch_id": "uuid",

  "client_document_id": "uuid",

  "image_base64": "data:image/jpeg;base64,...",

  "note": "optional",

  "captured_at": "ISO timestamp"

}



Authentication:



Authorization: Bearer <supabase user access_token>



مهم جدًا:



لا تنشئ API جديدًا.



لا تنشئ Edge Function جديدة.



لا تنسخ Receipt Processing Logic.



استخدم API الموجود في Hisabati.



---



2. Core Architecture



Architecture:



                 HISABATI SCANNER

                       │

                       │ Supabase Auth

                       │ JWT

                       ▼

              submit-receipt API

                       │

                       ▼

              HISABATI CORE

                       │

             ┌─────────┼─────────┐

             ▼         ▼         ▼

            AI       Fraud    Duplicate

             │         │         │

             └─────────┼─────────┘

                       ▼

                  transfers

                       ▼

                Accounting System



Scanner مسؤول فقط عن:



Login

→ Select Organization

→ Select Branch

→ Capture Receipt

→ Add Optional Note

→ Queue

→ Upload through API

→ Display Result



Hisabati مسؤول عن:



Validation

→ AI Analysis

→ Duplicate Detection

→ Fraud Detection

→ Storage

→ Transfer Creation

→ Ledger

→ Audit

→ Notifications



---



3. Do NOT implement these in Scanner



ممنوع إنشاء أي:



- OCR

- AI receipt analysis

- Gemini integration

- Lovable AI integration

- Fraud detection

- Duplicate detection

- Accounting calculations

- Ledger logic

- Direct insert into "transfers"

- Service Role Key

- Supabase Service Role access

- Public receipt storage

- Client-side business rules



Scanner يجب ألا يعرف كيف يعمل تحليل الإيصال.



هو فقط يرسل الصورة إلى Hisabati.



---



4. Authentication



استخدم نفس Supabase Auth الخاص بـHisabati.



لا تنشئ نظام مستخدمين منفصل.



المستخدم يسجل الدخول باستخدام:



Email + Password



ويجب الاحتفاظ بالـSupabase session والـrefresh token بالطريقة القياسية.



كل API request إلى Hisabati يجب أن يستخدم:



Authorization: Bearer <current_access_token>



لا تستخدم:



SUPABASE_SERVICE_ROLE_KEY



في أي مكان داخل Scanner.



ولا تضع أي Secret Key في:



- frontend

- mobile bundle

- local storage

- source code

- environment variables التي تصل للمتصفح كـpublic variables



---



5. Organization Selection



بعد تسجيل الدخول، اجلب المؤسسات التي ينتمي إليها المستخدم من Hisabati باستخدام نفس Supabase project.



المصدر:



user_roles



اعرض للمستخدم المؤسسات المسموح له بها فقط.



إذا كان المستخدم تابعًا لمؤسسة واحدة:



اختصر العملية ويمكن اختيارها تلقائيًا.



إذا كان تابعًا لأكثر من مؤسسة:



اعرض شاشة:



Select Organization



مثال:



Select Organization



[ Company A ]

[ Company B ]

[ Company C ]



لا تفترض أن المستخدم ينتمي إلى مؤسسة واحدة.



---



6. Branch Selection



بعد اختيار Organization:



اجلب الفروع المسموح بها من:



branches



ويجب احترام صلاحيات Hisabati الحالية.



إذا كان المستخدم مرتبطًا بفرع واحد:



اختاره تلقائيًا.



إذا كان لديه صلاحية أكثر:



اعرض:



Select Branch



[ Main Branch ]

[ Khartoum Branch ]

[ Omdurman Branch ]



لا تسمح للمستخدم بإرسال "branch_id" عشوائي.



Hisabati سيقوم بالتحقق النهائي Server-Side، لكن Scanner يجب أن يعرض فقط الخيارات المسموحة.



---



7. Main Screen



أريد التطبيق شديد البساطة.



الشاشة الرئيسية لا تحتوي على Dashboard معقد.



الهدف الأساسي هو:



Capture Receipt



التصميم المقترح:



┌─────────────────────────────┐

│       Hisabati Scanner      │

│                             │

│      Organization           │

│      Main Company           │

│                             │

│      Branch                 │

│      Main Branch            │

│                             │

│                             │

│          [ 📷 ]             │

│       Scan Receipt          │

│                             │

│     [ Choose from Gallery ] │

│                             │

│      Pending: 2             │

└─────────────────────────────┘



لا تضع عشرات الخيارات.



هذه أداة تشغيلية وليست لوحة تحكم.



---



8. Capture Flow



عند الضغط على:



Scan Receipt



افتح Camera.



بعد التقاط الصورة:



اعرض Preview.



┌─────────────────────────────┐

│                             │

│        Receipt Image        │

│                             │

│                             │

├─────────────────────────────┤

│ Optional Note               │

│ [_______________________]   │

│                             │

│ [ Retake ]   [ Submit ]     │

└─────────────────────────────┘



المستخدم يستطيع:



- Retake

- Add Note

- Submit



---



9. Gallery Upload



أضف أيضًا:



Choose from Gallery



حتى يستطيع المستخدم اختيار صورة موجودة مسبقًا.



بعد الاختيار يجب أن تمر بنفس الـpipeline.



لا يوجد مسار مختلف للـGallery.



كلاهما:



Camera

   ↓

Image

   ↓

Compress

   ↓

Preview

   ↓

Submit



و:



Gallery

   ↓

Image

   ↓

Compress

   ↓

Preview

   ↓

Submit



---



10. Image Optimization



قبل إرسال الصورة:



- Resize

- Downscale

- Compress

- JPEG quality approximately 0.7

- Maximum long edge approximately 1600px



الهدف تقليل استهلاك الذاكرة والـnetwork.



لا ترسل صور الكاميرا الأصلية الضخمة إلى API.



لكن لا تغيّر محتوى الإيصال بشكل يمنع AI من قراءته.



---



11. Generate client_document_id



عند التقاط أو اختيار صورة جديدة:



أنشئ UUID:



client_document_id



ويجب أن يتم إنشاؤه مرة واحدة فقط لهذه العملية.



مثلاً:



Capture

→ client_document_id = UUID-123



إذا فشل الإنترنت:



Retry

→ UUID-123



وليس:



UUID-456



مهم جدًا:



لا تعيد إنشاء "client_document_id" عند Retry.



هذا هو أساس Idempotency.



---



12. Submit



عند الضغط على Submit:



استدع:



POST /functions/v1/submit-receipt



مع:



{

  "organization_id": "selected-org-id",

  "branch_id": "selected-branch-id",

  "client_document_id": "generated-once",

  "image_base64": "data:image/jpeg;base64,...",

  "note": "optional note",

  "captured_at": "current ISO timestamp"

}



Authorization:



Bearer <current Supabase access token>



---



13. Loading State



أثناء التحليل لا تجعل المستخدم يعتقد أن التطبيق توقف.



اعرض حالة بسيطة:



Uploading receipt...



ثم:



Analyzing receipt...



ثم:



Saving to Hisabati...



لكن هذه الرسائل UI فقط.



لا تحاول تنفيذ هذه المراحل منفصلة من Scanner.



الـAPI نفسه يقوم بكل شيء.



---



14. Success Screen



عند:



status = created



اعرض نتيجة بسيطة:



✓ Receipt submitted



Amount:

250,000



Date:

10 Aug 2026



Sender:

Example Company



Status:

Saved to Hisabati



Review:

No review required



ويكون هناك زر:



[ Scan Another ]



---



15. needs_review



إذا:



needs_review = true



لا تعتبر العملية فاشلة.



اعرض:



✓ Receipt saved



⚠ This receipt needs review in Hisabati.



لأن Hisabati هو المسؤول عن المراجعة.



Scanner لا يقرر أن المعاملة صحيحة أو خاطئة.



---



16. Duplicate



إذا رجع:



409 duplicate_image



اعرض:



This receipt already exists in Hisabati.



ولا تعيد الإرسال تلقائيًا.



إذا:



409 duplicate_transaction



اعرض:



This transaction already exists in Hisabati.



---



17. duplicate_retry



إذا رجع:



status = duplicate_retry



فهذا ليس خطأ.



معناه أن Scanner أرسل نفس العملية سابقًا لكن ربما لم يستلم response بسبب الشبكة.



اعرض:



✓ Receipt already submitted



Transfer ID:

...



ثم احذف العنصر من Pending Queue.



---



18. Offline Queue



هذه ميزة مهمة جدًا.



إذا التقط المستخدم صورة ولا يوجد Internet:



لا تفشل العملية.



احفظ محليًا:



client_document_id

image

organization_id

branch_id

note

captured_at

status = pending



ثم:



Internet restored

        ↓

Retry queue

        ↓

submit-receipt



لا تعيد إنشاء:



"client_document_id"



عند Retry.



---



19. Retry Policy



أعد المحاولة فقط في:



- Network error

- HTTP 429

- HTTP 500

- HTTP 502

- HTTP 503

- HTTP 504



لا تعيد المحاولة تلقائيًا على:



- 400

- 401

- 403

- 409

- 413

- 415

- 422



باستثناء 429.



استخدم exponential backoff.



---



20. Authentication Expiration



إذا رجع:



401 unauthorized



حاول أولًا:



refreshSession()



ثم أعد الطلب مرة واحدة.



إذا فشل refresh:



اعرض:



Your session has expired.

Please sign in again.



لا تعيد إرسال العملية باستخدام Client Document ID جديد.



---



21. Rate Limit



Hisabati API لديه:



20 requests / minute / user



إذا رجع:



429 rate_limited



اقرأ:



Retry-After



وضع العملية في queue.



لا تعمل aggressive retry.



---



22. API Configuration



لا hard-code أي شيء غير ضروري.



اجعل:



HISABATI_SUPABASE_URL



هو عنوان مشروع Hisabati.



لكن لا تجعل أي Service Role Secret يصل إلى Client.



Scanner يحتاج فقط:



Supabase Project URL

Supabase Publishable/Anon Key



بالإضافة إلى API path:



/functions/v1/submit-receipt



---



23. Architecture Principle



أريد الفصل التالي بوضوح:



                 Scanner

                   │

                   │

             Authentication

                   │

                   ▼

          submit-receipt API

                   │

                   ▼

              Hisabati Core

                   │

        ┌──────────┼──────────┐

        ▼          ▼          ▼

       AI        Fraud     Database

                              │

                              ▼

                           Ledger



Scanner ليس Database Client بالنسبة إلى "transfers".



Scanner ليس Accounting Client.



Scanner هو API Client.



---



24. UI Philosophy



أريد التطبيق:



- سريع

- بسيط

- عملي

- Mobile-first

- Camera-first

- قليل الشاشات

- قليل الأزرار

- واضح جدًا للمستخدم



لا تبنِ:



- Dashboard ضخم

- Reports

- Accounting screens

- Product management

- Customer management

- AI settings

- Server settings



كل هذه الأشياء موجودة في Hisabati.



---



25. Optional Pending Screen



يمكن إضافة شاشة بسيطة:



Pending Uploads



2 receipts waiting



[ Receipt 1 ] Uploading...

[ Receipt 2 ] Waiting for Internet



لكن لا تحول التطبيق إلى إدارة ملفات.



---



26. Security



ممنوع تمامًا:



Service Role Key



داخل Scanner.



ممنوع:



Direct database writes to transfers



ممنوع:



Public receipt URLs



ممنوع:



AI API keys



ممنوع:



Fraud calculations



كل هذه الأشياء ملك لـHisabati Core.



---



27. Important API Contract



استخدم الـAPI الحالي كما هو.



POST /functions/v1/submit-receipt



Response success:



{

  "success": true,

  "status": "created",

  "transfer_id": "uuid",

  "client_document_id": "uuid",

  "needs_review": false,

  "fraud": {

    "score": 15,

    "flags": []

  },

  "data": {

    "amount": 250000,

    "transfer_date": "2026-08-10",

    "sender_name": "...",

    "transaction_id": "...",

    "receiver_account": "...",

    "sender_account": "...",

    "bank_comment": "...",

    "reference_number": "...",

    "confidence": 88

  }

}



---



28. First Build Scope



لا تبدأ بكل شيء دفعة واحدة.



النسخة الأولى يجب أن تحتوي على:



1. Login

2. Organization selection

3. Branch selection

4. Camera

5. Gallery

6. Image compression

7. Note

8. Submit

9. Loading state

10. Success result

11. Error handling

12. Local pending queue

13. Retry using same client_document_id



---



29. Do Not Modify Hisabati



هذا مشروع منفصل.



لا تعدّل:



- Hisabati database

- Hisabati Edge Functions

- Hisabati AI

- Hisabati RLS

- Hisabati triggers



إلا إذا ظهر أثناء integration أن الـAPI Contract نفسه يحتاج تغييرًا.



في الحالة الطبيعية:



Scanner يتكيف مع Hisabati API، وليس العكس.



---



30. Final Goal



الهدف النهائي:



المستخدم يفتح Scanner



↓



يختار المؤسسة/الفرع



↓



يضغط Camera



↓



يصوّر الإيصال



↓



يضيف تعليقًا اختياريًا



↓



Submit



↓



Hisabati يستقبل الصورة



↓



Hisabati يحللها



↓



Hisabati يتحقق من التكرار والاحتيال



↓



Hisabati يحفظها



↓



Hisabati ينفذ الـdatabase triggers



↓



Scanner يعرض:



"تم حفظ الإيصال في حساباتي"



هذا هو الـMVP.



ابدأ ببناء هذا التطبيق فقط، ولا تضف وظائف خارج هذا النطاق في المرحلة الأولى.

UI / UX Direction

The interface should feel like a dedicated professional business scanner.

Keep it extremely simple.

The user should understand the application immediately.

Recommended primary navigation:

Scanner

Recent

Settings

Avoid unnecessary screens.

The primary CTA should be visually dominant:

"Scan Receipt"

Secondary action:

"Choose from Gallery"

The design should be clean, modern, fast, and suitable for business users.

17. Responsive / Mobile First

The primary target is mobile.

Optimize for:

Android phones

iPhones

tablets

The camera interaction should feel natural.

Large touch targets.

Minimal typing.

Fast loading.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a5e6e1f4-9577-4e07-a320-8e039f11f33d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
