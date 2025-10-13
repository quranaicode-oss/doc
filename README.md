# MAS ERP Document Management Module

## English Overview
This repository contains the Razor views that power MAS ERP's document management experience. The UI (`docfront.cshtml`) provides a bilingual front-end for browsing, uploading, and editing document metadata, while the API view (`docapi.cshtml`) exposes server-side helpers used by the front-end through AJAX calls. Together they orchestrate professional handling of Word (`.docx`) and Excel (`.xlsx`) records while preserving the original formatting and metadata captured inside the files.

### High-level Architecture
- **Front-end Razor View (`docfront.cshtml`)**
  - Loads a configurable documents root (`~/Docs`) and optional subfolders.
  - Builds an Arabic/English terminology dictionary to localize the UI dynamically based on the `UserLang` cookie.
  - Provides tabs for document metadata, data records, and administrative tools (upload, duplicate, delete, JSON export, PDF export, etc.).
  - Surfaces a version history selector that queries the API for available DOCX revisions so users can review or switch to older templates before exporting or saving data.
  - Delegates all file operations to AJAX endpoints surfaced by `docapi.cshtml` so the UI stays decoupled from storage logic.
- **API Razor View (`docapi.cshtml`)**
  - Hosts helper classes such as `DocxToJsonConverter2` that translate between Open XML structures and JSON payloads consumed by the SPA-like front-end.
  - Safely resolves document paths inside the application root to prevent path traversal and validates identifiers before touching the filesystem.
  - Exposes a lightweight `?id=versions` endpoint that enumerates stored revisions (version number, timestamp, relative path) for the UI dropdown.
  - Interacts with the MAS ERP database via `DBHelper` for metadata lookups, audit trails, and report footers.

### DOCX Handling Strategy
The `DocxToJsonConverter2` class demonstrates how we preserve the fidelity of Word documents:
- **Structure traversal** – opens `.docx` files through the Open XML SDK, inspects paragraphs, tables, and hyperlinks, and serializes each element with unique IDs so the front-end can render and edit them predictably.
- **Deterministic mapping** – attaches a `StructureKey` to each paragraph/table that encodes its hierarchical path so edited JSON targets the exact source element even across nested content controls.
- **Formatting capture** – collects run-level formatting (bold, italics, underline, font family/size, colors, shading, highlighting) and paragraph-level settings (alignment, bidirectional layout, background fills).
- **Line fidelity** – preserves manual line breaks, tabs, and checkbox glyphs when translating runs to JSON/HTML to keep the Word layout intact during round-trips.
- **Table intelligence** – records table, row, and cell borders, merged cells (`GridSpan`, vertical merges with computed `rowSpan`), background fills, and paragraph direction so complex layouts survive round-trips.
- **Interactive controls** – detects content controls for checkboxes (`SdtRun`) and maps them to structured JSON objects containing both the checked state and descriptive text.
- **Culture awareness** – inspects document defaults to determine left-to-right vs. right-to-left direction, ensuring Arabic layouts keep their reading order when rendered on the web.
- **Editing pipeline** – when JSON is posted back, updates paragraphs, tables, and content controls, removes stale runs, and injects fresh Open XML nodes so formatting persists.
- **Audit footer** – appends footers with printing metadata sourced from the database, giving exported documents a consistent signature.

> **Recommended Libraries for DOCX Enhancements**
> - [DocumentFormat.OpenXml](https://github.com/OfficeDev/Open-XML-SDK) (already in use) for low-level manipulation.
> - [Open-Xml-PowerTools](https://github.com/OfficeDev/Open-Xml-PowerTools) for advanced merging, HTML conversion, and style normalization.
> - [Aspose.Words](https://products.aspose.com/words/net/) (commercial) when high-fidelity conversion to PDF/HTML is required beyond what Open XML provides.

### XLSX Handling Strategy
Although the current snapshot focuses on Word files, the same design can be extended to spreadsheets:
- **Library options**
  - `DocumentFormat.OpenXml` – consistent with DOCX handling; offers fine-grained control over worksheets, styles, and shared strings.
  - `EPPlus` – easier object model for reading/writing tables, pivot tables, and styles, licensed under Polyform Noncommercial.
  - `ClosedXML` – LINQ-friendly API for working with structured tables and preserving formatting.
- **Recommended workflow**
  1. Resolve and validate the target Excel path exactly as done for Word files to avoid traversal attacks.
  2. Load the workbook in read-only mode to map worksheets into JSON payloads (sheet name, data range, cell styles, merged ranges, filters).
  3. Capture formatting metadata such as number formats, cell alignment, background fills, conditional formatting, and named ranges.
  4. When updates arrive from the UI, reopen the workbook in edit mode, apply value changes, and mirror styling updates through the library's style objects.
  5. Maintain a version history (e.g., by saving deltas or archiving previous files) before overwriting to guarantee traceability.

### Security & Reliability Notes
- Always verify the requested path resolves under `HttpRuntime.AppDomainAppPath` and reject inputs containing `..`.
- Log every create/update/delete operation alongside the current ERP user to support auditing.
- Wrap file operations in `try/catch` blocks that return localized error messages to the front-end while logging detailed diagnostics server-side.
- For concurrent edits, introduce optimistic locking (timestamps or hash checks) before overwriting the source file.

### Future Enhancements
- Introduce a service layer (Web API controller) to migrate logic out of Razor pages for cleaner separation of concerns.
- Add background jobs for generating thumbnails/previews of DOCX/XLSX files using Open XML + Headless Chromium or LibreOffice.
- Provide fine-grained permission checks (view/edit/download) sourced from MAS ERP's role management tables.
- Cache parsed JSON representations for frequently accessed documents to minimize repeated Open XML traversals.

### Mishkah HTMLx Demo Pages
- `index-htmlx.html`, `index-htmlx-v2.html`, and `chat.html` are standalone demos that load both `acorn` and `acorn-walk` before the shared `mishkah-htmlx.js` helper to avoid secure evaluator errors.
- The reusable HTMLx helper lives at the repository root as `mishkah-htmlx.js`, eliminating the need for `dist/mishkah-htmlx.js` duplicates.

### صفحات عرض Mishkah HTMLx
- ملفات `index-htmlx.html` و`index-htmlx-v2.html` و`chat.html` عبارة عن عروض مستقلة تحمّل مكتبات `acorn` و`acorn-walk` قبل ملف المساعدة الموحد `mishkah-htmlx.js` لتفادي أخطاء التحقق الآمن.
- ملف المساعدة المشترك يوجد في الجذر باسم `mishkah-htmlx.js` مما يلغي الحاجة إلى نسخة `dist/mishkah-htmlx.js`.

## نظرة عامة بالعربية
يحتوي هذا المستودع على صفحتي Razor المسؤولتين عن تجربة إدارة المستندات في MAS ERP. الواجهة (`docfront.cshtml`) تعرض شاشات ثنائية اللغة لتصفح المستندات ورفعها وتحرير بياناتها، بينما تقدم صفحة الـ API (`docapi.cshtml`) أدوات خدمية يتواصل معها الواجهة الأمامية عبر طلبات AJAX لإجراء عمليات الملفات وحفظ البيانات.

### معمارية عامة
- **واجهة المستخدم (`docfront.cshtml`)**
  - تحدد مسار مجلد المستندات الجذري مع إمكانية اختيار مجلدات فرعية.
  - تُنشئ قاموس مصطلحات عربي/إنجليزي لتغيير اللغة حسب ملف تعريف الارتباط `UserLang`.
  - تعرض تبويبات لمعلومات المستند وبياناته والأدوات الإدارية (عرض، رفع، تنزيل، تكرار، حذف، حفظ JSON، تصدير PDF).
  - توفر قائمة لاختيار إصدارات القالب وتستدعي الـ API للحصول على المراجعات المتاحة لملف DOCX حتى يتمكن المستخدم من معاينة الإصدارات السابقة أو الرجوع إليها قبل الحفظ أو الطباعة.
  - تعتمد على `docapi.cshtml` لتنفيذ أي عملية على الملفات بهدف الفصل بين العرض ومعالجة البيانات.
- **خدمات الخلفية (`docapi.cshtml`)**
  - تشمل فئات مثل `DocxToJsonConverter2` لتحويل محتوى ملفات Word إلى JSON والعكس مع الحفاظ على التنسيق.
  - تتحقق من صلاحية المسارات وتمنع أي محاولة لتجاوز المجلدات المسموح بها.
  - توفر مسارًا خفيفًا عبر `?id=versions` لإرجاع بيانات الإصدارات (رقم الإصدار، وقت التعديل، المسار النسبي) لاستخدامها داخل قائمة الواجهة.
  - تتكامل مع قاعدة بيانات MAS ERP لاسترجاع بيانات المستندات وإضافة تواقيع الطباعة.

### منهجية التعامل مع ملفات Word
- **قراءة الهيكل**: يتم فتح الملف عبر Open XML واستعراض الفقرات والجداول والارتباطات مع إعطاء كل عنصر رقمًا فريدًا.
- **مفتاح بنيوي ثابت**: تتم إضافة خاصية `StructureKey` لكل فقرة/جدول لتمثيل مسارها داخل المستند، مما يسمح بإعادة الحقن داخل العنصر الصحيح حتى مع وجود عناصر متداخلة.
- **حفظ التنسيق**: يتم التقاط خصائص الخطوط (غامق، مائل، مسطر، اللون، حجم الخط، اسم الخط، الخلفيات) بالإضافة إلى محاذاة الفقرات واتجاهها.
- **الحفاظ على الأسطر**: يتم الاحتفاظ بعمليات الانتقال للسطر (`Line Breaks`) وعلامات التبويب ومربعات الاختيار أثناء التحويل بين JSON و HTML لضمان تطابق العرض مع ملف Word الأصلي.
- **ذكاء الجداول**: تُحفظ حدود الجداول والصفوف والخلايا، وحالات الدمج، ولون الخلفية، واتجاه الكتابة داخل كل خلية.
- **عناصر تفاعلية**: يتم اكتشاف مربعات الاختيار داخل المستند وتحويلها إلى JSON مع حالة التحديد والنص المرافق.
- **دعم اللغات**: يتم تحديد اتجاه المستند (RTL/LTR) تلقائيًا لضمان ظهور المستندات العربية بشكل صحيح.
- **قناة التعديل**: عند استقبال JSON محدث يتم استبدال عقد Open XML القديمة وإعادة بناء العناصر للحفاظ على التنسيق الأصلي.
- **توقيع التدقيق**: يضيف النظام تذييلاً يحتوي على معلومات المستخدم الذي طبع الملف وتاريخ الطباعة.

### منهجية التعامل مع ملفات Excel
- اختيار مكتبة ملائمة مثل Open XML أو EPPlus أو ClosedXML.
- تحويل أوراق العمل إلى JSON يشمل القيم والتنسيقات (تنسيقات الأرقام، المحاذاة، الألوان، الدمج، النطاقات المسماة).
- تطبيق التحديثات على الخلايا مع مراعاة النسخ الاحتياطي قبل الحفظ لضمان تتبع الإصدارات.

### توصيات أمنية وتشغيلية
- التحقق من المسارات ومنع الإدخال غير الآمن.
- تسجيل كل عملية تعديل باسم المستخدم وتوقيتها.
- التعامل مع الأخطاء برسائل ودية للمستخدم مع تسجيل التفاصيل في السجلات.
- إضافة آلية قفل تشاركي لمنع ضياع التعديلات المتزامنة.

### تحسينات مقترحة
- نقل المنطق إلى طبقة خدمات Web API لسهولة الاختبار والتوسع.
- إنشاء مهام خلفية لتوليد معاينات للمستندات.
- ربط الصلاحيات بأدوار النظام للتحكم في رؤية وتعديل المستندات.
- تخزين تمثيل JSON مؤقتًا للمستندات كثيرة الاستخدام لتسريع التحميل.

