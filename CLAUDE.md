# منصة دينا — دليل العمل لـ Claude

منصة مدرسية عربية (RTL) لمدارس دينا العالمية بجدة، يملكها أ. أحمد عبد العظيم. الهدف القادم: تحويلها إلى منتج يُباع لمدارس أخرى (انظر «خارطة الطريق»).

**اقرأ هذا الملف فقط للبدء.** لا تقرأ ملفات الكود كلها: استخدم `docs/MAP.md` لتحديد الملف، ثم `Grep` داخل الملف المطلوب.

## القواعد الثابتة (شروط المالك)
- الرد بالعربية، بلغة بسيطة لغير المبرمج.
- **لا يتأثر أي إدخال للمعلمين ولا بيانات قاعدة البيانات.** أي تعديل بيانات (لا بنية) يحتاج قراراً صريحاً منه. جرّب صلاحيات القاعدة داخل معاملة ثم `rollback`.
- لا تُدخل كلمات مرور أبداً.
- هوية دينا: كحلي `#082B5A`، أزرق `#005499`، سماوي `#3AB1DB`، أخضر `#2E8B57` / `#BADF93`، خط GE SS Two (fonts/). RTL، وصولية (تباين، تركيز، لوحة مفاتيح، reduced-motion).
- اختبر على 375 / 768 / 1440 بلقطات حقيقية، وأبلغ بصدق عمّا لم يُختبر.
- النشر: المالك يوافق عادة على نشر كل ميزة مكتملة؛ إن لم يطلب صراحة فاسأله.
- جلسة أخرى قد تدفع إلى نفس المستودع: نفّذ `git fetch` وأعد التأسيس (`rebase`) قبل الدفع، ولا تلمس عملها.

## البنية
- **واجهة ثابتة بلا إطار عمل** (vanilla JS) على GitHub Pages: https://ahmedabdelazem1460-ux.github.io/dina-tools/ — الفرع `main` (الفرع المحلي قد يكون باسم آخر: ادفع بـ `git push origin HEAD:main`).
- **Supabase** المشروع `dwibkkrzykqgsgyrrggp` (Postgres + RLS + Realtime). الحماية الفعلية في القاعدة لا في الواجهة.
- المدرسة الحقيقية `30aab7dc-efca-42cc-a503-823fb26941c4` (قسما البنين والبنات). مدرسة تجريبية `b1f74e7e-79fc-489e-97fd-4ceb2d6ea6d9`.

### الملفات
| المسار | المحتوى |
|---|---|
| `index.html` | التطبيق الرئيسي: CSS كله + يحمّل `dist/platform.js` (حزمة واحدة) |
| `src/<مجال>/*.js` | **مصادر المنصة** (٦٢ وحدة): `core` الأساس، `plan` الخطط والتحضير، `schedule` الجداول والتوقيت، `attendance` الحضور والسلوك والإرشاد، `assess` الاختبارات والبنك، `supervision` النماذج |
| جذر: `api.js demo.js bellcore.js export.js live.js omr.js lang.js tpl_consts.js` | وحدات مشتركة تدخل الحزمة وتُحمَّل أيضاً منفردة من صفحات أخرى |
| جذر: `i18n*.js digits.js config.js` | تُحمَّل منفردة في كل الصفحات (`config.js` = مفاتيح Supabase) |
| `build/modules.json` | **ترتيب الوحدات ووصفها** (المصدر الوحيد للترتيب) |
| `build/build.py` | يبني `dist/platform.js` + `index.dev.html` + `docs/MAP.md` ويحدّث رقم الإصدار |
| `docs/MAP.md` | خريطة مولَّدة: كل وحدة، وظيفتها، صفحاتها `V.*`، ما تصدّره `A.*`، واسمها القديم (`appNN.js`) |
| `docs/DB.md` | الجداول، دوال الصلاحيات، الـ RPC، الإعدادات المخزنة JSON |
| `sql/NNN_*.sql` | ترحيلات القاعدة بالترتيب (آخرها 093). كل ما فيها مطبَّق على المشروع |
| صفحات مستقلة | `student.html` (اختبار/واجب الطالب برابط)، `board.html` (شاشة اللوحة اليومية)، `parents.html`، `me.html`، `play.html`، `whiteboard.html`، `tools/*.html` (النصاب، الجدول الآلي، سجلات، تحليل، نماذج الإشراف) |
| `vendor/` | مكتبات: supabase، xlsx، jszip، pdf.js، jspdf، html2canvas، qrcode، `tess/` (OCR عربي) |
| `assets/tpl/` | قالب Excel و Word لبنك الأسئلة (يُبنيان بـ `python3 build/tpl/mk_qtpl.py assets/tpl`) |

### نمط الكود
- كل وحدة IIFE تبدأ بـ `const A = window.APP, V = window.VIEWS`. الصفحة = `V.name = function(root)`، والقائمة `A.NAV` عناصرها `[key, label, visibleFn]`، والأيقونة `A.I[key]`.
- **التغليف (layering):** وحدة لاحقة قد تحفظ `const prev = V.x` ثم تعرّف `V.x` جديدة تستدعي السابقة. لذلك **الترتيب في modules.json مهم**، وعند البحث عن سلوك صفحة ابحث عن كل تعريفات `V.x` (عمود «الصفحات» في MAP).
- الحالة `A.S` (me, school, sections, sectionId, staff, classes, entries, weeks, weekId…). المالك `S.me.is_owner`.
- مساعدات: `A.modal(html,{cls:'wide'})`، `A.run(btn, asyncFn)`، `A.toast(msg,'ok'|'err')`، `await A.confirmBox(html,label,danger)` (لا تستخدم `confirm()`)، `A.printDoc(title,sub,html,landscape)` (استوديو التقارير)، `A.attDrill`، `A.normKey` (**يحذف «ال» التعريف** ويوحّد الهمزات — انتبه عند المطابقة)، `A.personName`، `A.subjName`، `A.gradeName`، `A.arDate`، `A.LS.get/set`، `A.hasModule(k)`، `A.featMode(k)`.
- البيانات: `api.list(t, filter, {order,desc,select})`، `api.ins(t,rows)`، `api.upd(t,id,patch)`، `api.ups(t,rows,onConflict)`، `api.del(t,id)`، `api.rpc(name,args)`، `api.subscribe(name,table,filter,cb)`، `api.updateSchool/updateSection`.
- وضع التجربة `?demo=1`: بيانات في الذاكرة (`demo.js`). `api.rpc` فيه يدعم أسماء محددة فقط ← الوحدة تحاكي الـ RPC عند الفشل. `subscribe` لا يفعل شيئاً.
- CSS المنصة في `index.html`؛ الوحدات الجديدة تحقن `<style id="...css">` خاصاً بها. تجنّب أسماء أصناف عامة (`.top` مثلاً مستخدم).

## دورة العمل
```bash
# 1) عدّل المصادر في src/ (أو الملفات المشتركة في الجذر)
# 2) ابنِ الحزمة (يحدّث الإصدار ?v= في كل الصفحات، و index.dev.html، و docs/MAP.md)
python3 build/build.py
# 3) اختبر محلياً
python3 -m http.server 8766   # ثم http://localhost:8766/index.html?demo=1  (أو index.dev.html للوحدات منفردة)
# 4) انشر
git fetch origin main && git rebase origin/main   # إن وُجد جديد: أعد البناء بعده
git add -A && git commit -m "..." && git push origin HEAD:main
```
- **لا تعدّل `dist/platform.js` يدوياً** ولا تنسَ البناء قبل الإيداع (`python3 build/build.py --check` يتحقق).
- وحدة جديدة: أنشئها في `src/<مجال>/` وأضفها في `build/modules.json` بمكانها الصحيح.
- تعديل القاعدة: `apply_migration` عبر موصل Supabase + احفظ نفس النص في `sql/NNN_name.sql`. استخدم `create or replace` و`alter policy` (لا حذف). أي جدول جديد: RLS + `school_id`.
- الاختبار: Playwright (مثبّت مع Chromium). دخول التجربة: المالك `[data-demo="a.abdelazim@dinaschool.com"]`. تبديل الهوية في الاختبار: `APP.S.me = {...}`. أخطاء خطوط Google (ERR_TUNNEL) غير مؤثرة. الاختبارات في `tests/` (انظر `tests/README.md`): شغّل `t70.js` و`t173.js` بعد أي تعديل، واكتب اختباراً قصيراً لكل ميزة جديدة والتقط لقطات.
- اختبار الأدوار في القاعدة: داخل `begin; … rollback;` مع `set_config('request.jwt.claims','{"sub":"<auth uid>","role":"authenticated"}',true); set local role authenticated;`.

## فخاخ معروفة
- `String.replace` في node/python مع نص يحوي `$$` يحوّلها إلى `$` ← استخدم split/join أو دالة بديلة.
- جدول `classes` بلا `school_id` (يؤخذ من `sections`).
- `sections.bell` (JSON) فيه: `schedules[]` (start, dur, np, pass, breaks[{after,dur,label,classes[]}], perDur, perDay, days)، `def`، `acts[{sid,from,to}]`، `holidays[]`، `pin{kind:'sched'|'disp',id,from,to}`. **كل حساب للتوقيت يمر عبر `DinaBell.dayPlan`** (bellcore.js) — الأولوية: اعتماد يدوي ← إجازة ← استثنائي منشور ← مفعّل لفترة ← أساسي.
- `schools.settings` (JSON): `features{assess,records,resources,analysis,attendance,supervision}` = all|granted|off، `ehw{mode,staff[],themes[],theme}`، `tui`، `remote`، `printStyle`، `perm_sets`، `cover_images`.
- الواجب الإلكتروني برابط: الإتاحة `A.canHw()` وتُفرض في القاعدة بـ `ehw_ok(school)` على `quizzes` (kind=homework).
- لا يمكن التحقق من الموقع الحي من الحاوية السحابية (النطاق محجوب عن الـ shell) — تحقق محلياً.

## آخر ما وصلنا له (حدّث هذا القسم بعد كل عمل)
- **2026-11-14 (ب)** — الإشعارات `src/core/notifications.js` + `sql/093`: جدول `notifications` و`notif_prefs`، `notify_send/retract/sent`، `notif_set_prefs`، مشغّلات (الرسائل، النماذج + «اكتمل العمل» للدفعة، الانتظار) آمنة لا تعطل الحفظ. مركز الإشعارات `V.notify`، الجرس، إذن الجهاز، PWA (`manifest.webmanifest`، `sw.js`، `assets/icon-*.png`). اختبار `tests/t174.js`. **لم يُفعَّل Web Push بعد** (الإشعار خارج المتصفح المغلق) — sw.js جاهز لاستقباله.
- **خطة المالك (مراحل متبقية):** ٢ صلاحيات النماذج (زائر يعدّل/مزور يوقّع فقط، إعادة لأي طرف بأسباب، تعميد)، ونماذج المستخدم بهوية المدرسة؛ ٣ انتظار آلي عند رصد غياب معلم + لا يُحتسب واجب الغائب؛ ٤ أسئلة لحظية (ClassPoint) وألعاب (Kahoot/Wordwall) من البنوك ودمجها بالسبورة ومعامل بمجسمات؛ ٥ عروض تقديمية من البنوك والملفات بهويات مشتقة من دينا؛ ٦ موارد بشرية: حضور تلقائي بالموقع + QR متغير، ربطه بالموارد البشرية ونماذج المساءلة/اللائحة وتصديرها؛ ٧ «بوصلة» باسم عام: مقاييس طلاب + مؤشرات أداء؛ ٨ مساعد ذكي للمعلم **بأدوات مجانية مبدئياً**؛ ٩ تطبيق متاجر.
- **2026-11-14** — إعادة تنظيم: نقل `appNN.js` إلى `src/` بأسماء دالة، حزمة واحدة `dist/platform.js`، هذا الدليل. بنك أسئلة المدرسة `V.qbank`، استيراد Excel/Word/PDF/صور (OCR)، التحكم في الواجب الإلكتروني، خمس واجهات للطالب (sql/092).
- **2026-11-10** — إصلاح حفظ حضور الحصة (sql/091). الإحالات: الوكيل، التصنيف، إشعار المالك (087–090، من جلسة أخرى).
- **2026-11-09** — توحيد التوقيت (bellcore)، التحكم في الجدول المعتمد، الصلاة/الفسحة بعد آخر حصة ولكل فئة، تحديث لحظي (083–086).
- قبلها: النماذج بالتوقيع الإلكتروني، استوديو التقارير، الإرشاد الطلابي، تبويب الطلاب، الواجب الإلكتروني برابط.

## خارطة الطريق (لم تُنفَّذ — بالترتيب المتفق عليه)
1. ✅ توحيد البنية والحزمة ودليل المشروع.
2. **منتج متعدد المدارس:** شاشة تسجيل/تجهيز مدرسة، هوية لكل مدرسة (شعار/ألوان/اسم بدل ثوابت دينا في الكود والقوالب)، عام دراسي وفصول دراسية مع ترحيل (معلمون، طلاب، فصول، جداول، بنك) وأرشفة.
3. **معالج إعداد ذكي:** استيراد من ملفات نور (PDF/Excel) للطلاب والمعلمين والفصول والجداول مع مراجعة قبل الاعتماد.
4. استضافة خاصة ونطاق، مستودع خاص، اشتراكات.
- تنظيف مؤجل: دمج طبقات التغليف المتكررة لنفس الصفحة (`V.dash`، `V.reports`، `V.my`، `V.weeks`…) في تعريف واحد لكل صفحة؛ نقل CSS من `index.html` إلى ملفات؛ تصغير الحزمة.
- قرارات معلّقة عند المالك: الجدول الأساسي لكل قسم (حالياً «التعليم عن بعد»)، نشر الجداول الاستثنائية، إتاحة الواجب الإلكتروني للمعلمين (بند الاختبارات «لمن أمنحه» ولم يُمنح لأحد).
