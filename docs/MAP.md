# خريطة وحدات المنصة

> ملف مولَّد آلياً بـ `python3 build/build.py` — لا تعدّله يدوياً. عدّل الوصف في `build/modules.json`.
>
> الترتيب = ترتيب التحميل. وحدة لاحقة قد **تغلّف** صفحة عرّفتها وحدة سابقة (نفس اسم `V.x`)، فالأخيرة هي النافذة.

| # | الملف | الاسم القديم | ك.ب | الوظيفة | الصفحات V.* | يصدّر A.* (أبرزها) |
|---|---|---|---|---|---|---|
| 1 | `tpl_consts.js` | — | 8 | ثوابت قوالب التصدير (TPL) | — | — |
| 2 | `export.js` | — | 35 | قوالب تصدير الخطة الأسبوعية PDF/Word بهوية المدرسة | — | — |
| 3 | `api.js` | — | 18 | طبقة البيانات Supabase: list/ins/upd/ups/del/rpc/subscribe | — | — |
| 4 | `demo.js` | — | 41 | وضع التجربة ?demo=1: نفس واجهة api في الذاكرة | — | — |
| 5 | `bellcore.js` | — | 17 | نواة التوقيت الموحّدة DinaBell (المنصة + board.html) | — | — |
| 6 | `src/core/core.js` | app.js | 105 | الأساس: الحالة S، الدخول، التنقل NAV/route، «خطتي» V.my، لوحة المتابعة V.dash، المساعدات A.* | — | — |
| 7 | `src/core/order.js` | — | 2 | ترتيب منطقي موحّد للمراحل والصفوف والفصول والمواد: A.cmpCls / A.cmpSubj / A.cmpEntrySG (عرض فقط) | — | clsRank cmpCls cmpEntrySG cmpSubj gradeOrd stageIdx subjRank |
| 8 | `src/plan/export-timetable-weeks-admin.js` | app2.js | 113 | التصدير، الجدول الدراسي، الأسابيع، الإدارة | admin export timetable weeks | _ttLoadRefresh _ttReqRefresh slotDialog verName verWhen |
| 9 | `src/core/tools-dev.js` | app3.js | 18 | أداتا النصاب والجدول الآلي داخل المنصة + لوحة المطوّر | builder dev nisab | — |
| 10 | `src/plan/extra-pages-join.js` | app4.js | 23 | الصفحات الإضافية في الخطة + روابط انضمام المعلمين | — | — |
| 11 | `lang.js` | — | 25 | التدقيق اللغوي للخطة | — | — |
| 12 | `src/core/messages-sync.js` | app5.js | 27 | الرسائل الداخلية، الإسناد، التصفح كموظف، المزامنة اللحظية | — | EX _exRe assignDialog compose exPill inbox viewAs |
| 13 | `src/core/reports-archive-staff.js` | app6.js | 54 | التقارير، الأرشيف، استيراد الموظفين، هوية كل قسم | archive reports | printDoc |
| 14 | `src/plan/sheets-sync.js` | app7.js | 20 | مزامنة Google Sheets | classes dash dev weeks | _dashReq pullFromSheet syncLabel |
| 15 | `src/core/sidebar-appearance.js` | app8.js | 17 | القائمة الجانبية، المظهر، من يعمل الآن | — | uiSettings |
| 16 | `src/core/notifications.js` | — | 40 | الإشعارات: الجرس، إذن الجهاز، التنبيهات العامة والمجدولة، التفضيلات وتحكم المالك، مركز الإشعارات V.notify، التثبيت كتطبيق | notify | NOTIF_KINDS appDialog notice noticeMsgBox notifIssue notifMarkRead notifPanel tfeat |
| 17 | `src/plan/parent-posts.js` | app9.js | 16 | إعلانات أولياء الأمور | posts | POST_KINDS shrinkPosts |
| 18 | `pitems.js` | — | 22 | عرض بنود أولياء الأمور DinaItems (مشترك مع parents.html و family.html): فئات، أسئلة تفاعلية بإظهار الإجابة، ملفات وصور وفيديو وروابط واختبارات، طباعة/PDF | — | — |
| 19 | `src/plan/parent-items.js` | — | 49 | بنود أولياء الأمور V.pitems (مراجعات، أسئلة من البنك، ملفات، صور، روابط، فيديو، اختبارات، مصادر، نصوص) بمحرر ومعاينة حية واعتماد وطباعة وExcel، الإعدادات والفئات ونافذة الأسابيع لأولياء الأمور (للمالك)، ومعاينة صفحة «خطط أبنائي» V.pview — مفتاح pitems ومنحة pitems (sql/110) | pitems pview | — |
| 20 | `src/core/resources-analysis-roles.js` | app10.js | 30 | المصادر (قديم)، تحليل النتائج، المسميات والصلاحيات V.roles وإظهار البنود features | analysis resources roles | fetchResources hasModule pickResource |
| 21 | `src/attendance/attendance-behavior-supervision.js` | app11.js | 63 | الحضور والغياب والسلوك V.attendance + الإشراف التربوي V.supervision | attendance myreports supervision | _attRefresh attWho |
| 22 | `src/assess/assess.js` | app12.js | 105 | الاختبارات V.assess: المنهج، بنك الأسئلة، المواصفات، التكليفات الإلكترونية، النتائج — يصدّر A._assess | assess | _assess _liveRes assessMode canAssess |
| 23 | `src/core/drive-folders.js` | app13.js | 5 | مجلدات Google Drive لكل معلم | roles | driveDialog |
| 24 | `src/assess/records.js` | app14.js | 10 | سجل المتابعة (سجلات برو) داخل المنصة | records | — |
| 25 | `src/schedule/tt-engine.js` | — | 34 | محرك الجداول الموحّد DinaTT: قيود إلزامية وتفضيلية بمستوى ووزن، مشتركة ومتوازية، سعة القاعات، توليد جزئي، بدائل التعديل وأثره | — | — |
| 26 | `src/schedule/distribution.js` | app15.js | 95 | توزيع الحصص والجدول المرن V.plan | plan | _lastGen _planCap _planReload _planSave _planState _planTab canPlan |
| 27 | `omr.js` | — | 32 | محرك ورقة التظليل والقراءة الآلية | — | — |
| 28 | `src/assess/paper-exams.js` | app16.js | 127 | الاختبارات الورقية والتصحيح الآلي واللجان V.paper | paper | — |
| 29 | `lijan3d.js` | — | 18 | محرك كروكي اللجان ثلاثي الأبعاد DinaLijan (مشترك مع lijan.html): خريطة المباني والأدوار، اللجنة من الداخل بالباب والسبورة والمقاعد، والمخطط العلوي للتحرير | — | — |
| 30 | `src/assess/committees-pro.js` | — | 87 | اللجان والمقاعد V.lijan: توزيعات متعددة مسودة/معتمد، كشاف الأعداد لكل لجنة من كل صف/فصل بمؤشرات المتبقي، طرق التوزيع والترقيم والتثبيت، كروكي ثلاثي الأبعاد بالباب والصورة، جدول الاختبارات، ١٠ تقارير وExcel، ورابط أولياء الأمور lijan.html — مفتاح lijan ومنحة lijan (sql/112) | lijan | lijanCan lijanOpen |
| 31 | `src/core/activity.js` | app17.js | 10 | النشاط والدخول (للمالك) | activity reports | — |
| 32 | `src/core/home.js` | app18.js | 14 | الصفحة الرئيسية V.home | home | HOME_ACT HOME_GROUPS HOME_ICO |
| 33 | `src/schedule/studio.js` | app19.js | 12 | استوديو الجداول والأنصبة V.studio (حاوية تبويبات) | studio | — |
| 34 | `src/schedule/saved-versions.js` | app20.js | 10 | النسخ المحفوظة والحفظ السحابي للنصاب والتوزيع | nisab plan | addSnapshot readNisabAny snapshots |
| 35 | `src/schedule/term-bridge.js` | — | 67 | ربط أدوات الجداول: نقل النصاب إلى التوزيع بمعالج (الفصل الأول/الثاني، مطابقة الفصول والمواد)، اقتراح المعلمين من إسناد الفصل الأول، استيراد معلمي المنصة للأداة الكلاسيكية، طباعة التوزيع والجداول A4 طولي/عرضي، ودليل إكمال جداول الفصل الثاني | builder nisab plan | _tbSuggest builderImport nisabTransfer planPrint planSuggest term2View |
| 36 | `src/schedule/bell.js` | app21.js | 65 | اليوم الدراسي والجدول الزمني V.bell + A.bell + التحكم في الجدول المعتمد pin + فحص التوقيت | bell | bell ptime |
| 37 | `src/schedule/import-timetable.js` | app22.js | 20 | استيراد الجداول الجاهزة (Excel/CSV/PDF من aSc) | — | ttImport ttMatch ttParsePdf |
| 38 | `src/schedule/approve-timetable.js` | app23.js | 10 | اعتماد الجدول مع معاينة الأثر | — | ttApprove |
| 39 | `src/schedule/timetable-designer.js` | app24.js | 50 | مصمم الجداول للطباعة V.timetable | timetable | ttDesign |
| 40 | `src/plan/timetable-mismatch.js` | app25.js | 8 | تنبيه «حصص مكتوبة تخالف الجدول» | dash | conflictsDialog |
| 41 | `src/plan/unified-entry.js` | app26.js | 16 | الإدخال الموحّد لعدة فصول | my | unifiedEditor |
| 42 | `live.js` | — | 44 | عرض الجدول الاستثنائي التفاعلي (مشترك مع صفحات العرض) | — | — |
| 43 | `src/schedule/display-schedule.js` | app27.js | 67 | الجدول الاستثنائي للعرض display_schedules V.live | live my | _live _liveDetach _liveEntries _liveImport _livePlanMap _syncLiveTimes bindLive liveTable |
| 44 | `src/schedule/remote-day.js` | app28.js | 61 | تحويل يوم/أسبوع للتعلم عن بعد | — | _liveFit _liveHue liveConvert liveEditTab liveRearrange liveRepTab liveVisTab |
| 45 | `src/assess/import-questions.js` | app29.js | 61 | «المطلوب مني» في خطتي + استيراد الأسئلة A.importQ (Excel/Word/PDF/صور OCR) | my | _fileLines _imageLines _imageQs _ocrDone _ocrProg _parseQ _smartType importQ |
| 46 | `src/attendance/period-attendance.js` | app30.js | 27 | حضور الحصص (معلم الحصة) | — | _paLive attEntryOf attLive attPassed attPeriods attTimes curBreaks curPeriod myPeriodAtt takePeriod |
| 47 | `src/plan/calendar.js` | app31.js | 12 | التقويم الدراسي المرن داخل الأسابيع | weeks | _calInfer _calPlan |
| 48 | `src/core/trash.js` | app32.js | 6 | سلة المحذوفات V.trash | trash | confirmBox |
| 49 | `src/schedule/standby.js` | app33.js | 71 | حصص الانتظار وتأمين الحصص V.standby | standby | sbCan |
| 50 | `src/schedule/daily-board.js` | app34.js | 24 | اللوحة اليومية V.board + رابط الشاشة board.html | board | — |
| 51 | `src/plan/prep.js` | app35.js | 33 | تحضير الدروس V.prep | prep | prepEditor prepGen |
| 52 | `src/assess/smart-bank.js` | app36.js | 28 | بنك الأسئلة الذكي: بلوم، كشف التكرار، توليد من نص | — | bankSmart bloomOf dupOf genFromText qGenText smartQuiz |
| 53 | `src/schedule/duty.js` | app37.js | 61 | جداول الإشراف والمناوبة V.duty | duty | dutyDay dutyNowBox myDuty |
| 54 | `src/plan/prep-from-timetable.js` | app38.js | 26 | التحضير من الجدول | prep | myPrepBoard quickPrep |
| 55 | `src/plan/resources-store.js` | app39.js | 39 | المصادر: مخزن المدرسة V.resources | resources | lessonResources pickResource resVisible syncPrepRes |
| 56 | `src/schedule/sketch-editor.js` | app40.js | 9 | محرر الكروكي لمواقع المدرسة | — | sketchEditor |
| 57 | `src/attendance/student-codes.js` | app41.js | 10 | حسابات الطلاب برمز دخول (me.html) | stucodes | — |
| 58 | `src/attendance/family-accounts.js` | — | 39 | حسابات أولياء الأمور برمز عائلة + التصدير الشامل + ما يراه ولي الأمر (sql/103) | stucodes | — |
| 59 | `src/attendance/family-staff.js` | — | 35 | أولياء الأمور لجهة المدرسة V.pmsg: رسائل خاصة، تقارير واعتمادها، تدريب من البنك، أعذار (sql/104، family.html) | pmsg | __famDemo sendToParents |
| 60 | `src/attendance/pickup.js` | — | 32 | النداء الآلي للاستئذان V.pcall: لوحة حية بالمراحل، السجل وExcel، الإعدادات (التفعيل لحسابات مختارة، موقع المدرسة من رابط خرائط جوجل، النطاق، الأدوار، شاشة call.html) — sql/106 | pcall | __pickDemo parseLatLng |
| 61 | `src/assess/games.js` | app42.js | 21 | الألعاب التعليمية V.games (play.html) | games | — |
| 62 | `src/assess/whiteboard-labs.js` | app43.js | 15 | السبورة التفاعلية والمعامل الافتراضية | labs wboard | — |
| 63 | `src/core/teacher-ui.js` | app44.js | 17 | تخصيص صفحة المعلم (للمالك) V.tui | tui | TUI_BASIC tuiApply tuiWrapNav |
| 64 | `src/core/test-teacher.js` | app45.js | 10 | المعلم التجريبي (للمالك) | testt | isTestMode isTestStaff |
| 65 | `src/schedule/remote-template.js` | app46.js | 23 | قالب التعليم عن بعد | live | remoteOptimize remoteQuick remoteSettings |
| 66 | `src/plan/homework-cell.js` | app47.js | 27 | خانة الواجب المخصصة في الخطة | reports | HW_QTYPES HW_TYPES hwBind hwBox repPrep |
| 67 | `src/plan/homework-follow.js` | app48.js | 19 | متابعة الواجبات V.hwf | hwf | — |
| 68 | `src/plan/approval-requests.js` | app49.js | 37 | طلبات الاعتماد والمهام الأدائية | dash reports | chgRow exExtras langHint langOf repAce |
| 69 | `src/attendance/monitor-attendance.js` | app50.js | 54 | رصد الحضور لمراقب الدور | — | attAlerts attPicker attRecord attReports |
| 70 | `src/attendance/live-attendance-board.js` | app51.js | 14 | لوحة الحضور اللحظية | — | _attFabBound _attFabEl attDash attMerge |
| 71 | `src/core/ui-helpers.js` | app52.js | 14 | أدوات عرض مشتركة (تواريخ عربية…) | — | arDate arDateShort attChart attDrill |
| 72 | `src/attendance/students-db.js` | app53.js | 5 | قاعدة الطلاب الموحّدة A.studentsAll | analysis | studentsAll studentsPayload syncStudentsNow |
| 73 | `src/core/owner-controls.js` | app54.js | 4 | تحكم المالك في الشاشات اللحظية | tui | liveOK |
| 74 | `src/core/kpi-drill.js` | app55.js | 3 | الأرقام التفاعلية A.attDrill | — | — |
| 75 | `src/assess/noor-analysis.js` | app56.js | 68 | تحليل درجات نظام نور V.noor (استيراد ملفات نور) | noor | _noor |
| 76 | `src/supervision/forms.js` | app57.js | 71 | النماذج والاستمارات بالتوقيع الإلكتروني V.forms (مع tools/supervision.html) | forms | _forms formsLoadLib formsSigModal formsSlots formsTeacherSlot formsWithSig |
| 77 | `src/supervision/delegated-sigs.js` | — | 15 | التواقيع المفوّضة للمالك A.dsig: توقيع مدير المدرسة (وغيره) نيابةً من حسابه في النماذج — اختيار عند التوقيع، زر داخل النموذج، توقيع جماعي، مكتبة في owner_vault | — | dsig |
| 78 | `src/assess/ehomework.js` | app58.js | 4 | الواجب الإلكتروني برابط: أزرار ونافذة المشاركة QR | assess hwf | — |
| 79 | `src/core/report-studio.js` | app59.js | 31 | استوديو التقارير A.printDoc بهوية المدرسة | — | printDoc printDocDirect printStyle |
| 80 | `src/attendance/counseling.js` | app60.js | 94 | الإرشاد الطلابي: الإحالات والحالات والوكيل V.refer/V.counsel/V.deputy | counsel deputy refer | _counsel refData refDrill refLive refStats |
| 81 | `src/attendance/behavior-admin.js` | — | 62 | متابعة السلوك للمالك V.bhadmin: غير المُحالة وإحالتها (فردي/جماعي)، تعديل السلوك المرصود بالخطأ بسجل تعديلات وصلاحيات يحددها المالك (behaviors_guard + settings.bhedit)، فتح أي حالة، وطلبات التوضيح لأي موظف V.clarify بمفتاح clarify (sql/107) | bhadmin clarify | _bhadmin |
| 82 | `src/attendance/students-browser.js` | app61.js | 17 | تبويب الطلاب: قوائم وإحصاءات تفاعلية A.stuBrowser | — | stuBrowser |
| 83 | `src/assess/school-bank.js` | app62.js | 32 | بنك أسئلة المدرسة V.qbank + إتاحة الواجب الإلكتروني + واجهات الطالب + تصدير Excel | qbank | QTHEMES canAssess canAssessFull canEhw canHw ehwCfg ehwOnly qExport themePick |
| 84 | `src/assess/bank-booklet.js` | — | 27 | كراسة التدريب PDF من بنك الأسئلة A.bankBooklet: غلاف بهوية المدرسة، ثلاثة أنماط (تدريب/اختبار تجريبي/مراجعة بالحل)، تقسيم آلي لصفحات A4، مفتاح الإجابة وورقة إجابة، QR، طباعة/حفظ PDF وتنزيل مباشر | — | bankBooklet |
| 85 | `src/plan/terms.js` | — | 24 | الفصول الدراسية: مؤشر الفصل في الشريط وقائمة المستخدم، تبويب الإدارة لإضافة الفصل الثاني وتجهيزه وتفعيله (sql/094) | admin | termCur termFilter termOf termPickHtml termSwitch |
| 86 | `src/attendance/hr.js` | — | 33 | الموارد البشرية V.hr: حضور الموظفين بالموقع ورمز QR المتغير والرصد اليدوي، السجل والتصدير، المساءلات، الإعدادات، وربط الغياب بتأمين الحصص وعدم احتساب واجب الغائب (sql/096) | home hr | dropAbsent |
| 87 | `src/supervision/myforms.js` | — | 30 | نماذجي V.myforms: نماذج المستخدم من الصفر أو نص أو ملف (تحويل ذكي A.textToTpl) بهوية المدرسة، تعبئة وحفظ وترتيب ومجلدات ومشاركة (sql/097) | myforms | textToTpl |
| 88 | `src/supervision/visits.js` | — | 106 | الزيارات الصفية V.visits: اختيار الفصل ← الحصة الجارية من الجدول الزمني وبياناتها من الخطة الأسبوعية والتحضير (قابلة للتعديل)، نوع الزيارة، نموذج أو أكثر مدمجة مع تخصيص العناصر وبند السير في المنهج، استمارة form_tasks (mode=sign, visit) يوقّعها المعلم، التقارير والتغطية، التكامل مع أداة الإشراف، الإعدادات ورموز QR للفصول (sql/108) — مفتاح visits | visits | _visits visitBanner |
| 89 | `src/core/teacher-features.js` | — | 24 | التحكم في الميزات الجديدة داخل حسابات المعلمين (للمالك) — schools.settings.tfeat ويقرؤه A.tfeat | tui | TFEAT |
| 90 | `src/assess/live-poll.js` | — | 23 | السؤال اللحظي V.poll + A.livePoll (مثل ClassPoint): رمز/QR للطلاب على poll.html، نتائج لحظية، إدراج النتائج في السبورة (sql/098) | poll | livePoll livePollStart |
| 91 | `src/assess/slides.js` | — | 34 | العروض التقديمية V.slides: من بنك الأسئلة أو نص/ملف، ست هويات مشتقة من دينا، محرر، عرض بملء الشاشة مع السؤال اللحظي، تصدير PowerPoint (vendor/pptxgen) وPDF (sql/098 decks) | slides | presentDeck slideHTML textToSlides |
| 92 | `scales.js` | — | 65 | تعريف مقاييس البوصلة DinaScales (مشترك مع scale.html) | — | — |
| 93 | `src/attendance/compass.js` | — | 57 | البوصلة ٢ V.compass: ٩ مقاييس بثلاث لغات وأربعة مستويات (scales.js) برابط scale.html، تقارير احترافية للفصل والطالب (رادار، مقارنة، توصيات)، PDF/صورة/Excel وواتساب لولي الأمر، ومؤشرات الأداء للمالك (sql/099–100). يصدّر A.elToPdf/elToPng/waOpen | compass | compassPoster elToPdf elToPng waOpen |
| 94 | `src/attendance/gifted.js` | — | 65 | رعاية الموهوبين V.gifted: الدليل المرجعي، البوابات الخمس، ١٤ نموذجاً وخطة، قرار اللجنة بالأوزان والتصنيف، المؤشرات — gifted_files (sql/100)، A.giftedNominate | gifted | giftedNominate |
| 95 | `src/plan/assistant.js` | — | 18 | مساعد المعلم V.assistant (مجاني داخل المتصفح): أهداف بلوم، ملخص، سير الحصة، استراتيجيات، أسئلة (A.genFromText)، واجب، تمايز، طباعة، تحويل لعرض/سؤال لحظي | assistant | lessonAssist |
| 96 | `src/assess/models3d.js` | — | 20 | المجسمات التفاعلية A.models3d داخل المعامل: مجسمات هندسية بمحرك Canvas، نموذج الذرة، المجموعة الشمسية | labs | models3d |
| 97 | `src/schedule/tt-views.js` | — | 144 | عرض الجداول والإسنادات V.ttviews: الحصص الجارية الآن، جدول الفصل/المعلم/اليوم/الأسبوع، إسنادات الفصول، الكشاف العام (بالمعلم/بالمادة/مصفوفة)، التحكم في الظهور، الطباعة الاحترافية بأربعة أنماط مع التوقيعات وختم الاعتماد، Excel — مفتاح ttviews لغير المالك | ttviews | ttViews |
| 98 | `src/schedule/tt-quality.js` | — | 21 | جودة الجدول ومقارنة النسخ V.ttquality (تبويب الاستوديو، للمالك): القيود الإلزامية (تعارض المعلم، بلا معلم، فراغات الفصل) وتسعة قيود تفضيلية بأوزان قابلة للتعديل، مؤشر من ١٠٠، تقرير المعلمين، مقارنة نسختين، طباعة وExcel — قراءة فقط | ttquality | ttQuality |
| 99 | `src/core/owner-text.js` | — | 1 | إخفاء عبارات المالك عن غيره: تنقية A.emptyBox و A.toast لغير المالك (A.ownerClean) | — | emptyBox ownerClean toast |
| 100 | `src/core/search.js` | — | 20 | البحث الشامل لكل الحسابات (Ctrl+K) ضمن الصلاحيات | — | globalSearch |
| 101 | `src/core/staff-work.js` | — | 20 | متابعة الموظفين وأعمالهم V.staffwork (للمالك) | staffwork | — |
| 102 | `src/core/people-merge.js` | — | 15 | دمج الحسابات المكررة وحذف الموظفين/الطلاب بأمان (للمالك) A.peopleDups A.peopleRemove — sql/111b | — | peopleDups peopleRemove |
| 103 | `src/core/ui-pro.js` | — | 27 | الواجهة الاحترافية: السمات (كلاسيكي/عمق ثلاثي الأبعاد/زجاجي/زخارف دينا) وأيقونات القائمة التفاعلية، لوحة المعلم home2 (الأسبوع أعلى الصفحة + أيقونات)، أيقونات الإشعارات ونوع new، «ما الجديد»، A.announceNew عند تفعيل ميزة — يجب أن تبقى آخر وحدة (تغلّف V.my) | — | THEMES announceNew applyTheme |
