# خريطة وحدات المنصة

> ملف مولَّد آلياً بـ `python3 build/build.py` — لا تعدّله يدوياً. عدّل الوصف في `build/modules.json`.
>
> الترتيب = ترتيب التحميل. وحدة لاحقة قد **تغلّف** صفحة عرّفتها وحدة سابقة (نفس اسم `V.x`)، فالأخيرة هي النافذة.

| # | الملف | الاسم القديم | ك.ب | الوظيفة | الصفحات V.* | يصدّر A.* (أبرزها) |
|---|---|---|---|---|---|---|
| 1 | `tpl_consts.js` | — | 8 | ثوابت قوالب التصدير (TPL) | — | — |
| 2 | `export.js` | — | 35 | قوالب تصدير الخطة الأسبوعية PDF/Word بهوية المدرسة | — | — |
| 3 | `api.js` | — | 16 | طبقة البيانات Supabase: list/ins/upd/ups/del/rpc/subscribe | — | — |
| 4 | `demo.js` | — | 40 | وضع التجربة ?demo=1: نفس واجهة api في الذاكرة | — | — |
| 5 | `bellcore.js` | — | 17 | نواة التوقيت الموحّدة DinaBell (المنصة + board.html) | — | — |
| 6 | `src/core/core.js` | app.js | 104 | الأساس: الحالة S، الدخول، التنقل NAV/route، «خطتي» V.my، لوحة المتابعة V.dash، المساعدات A.* | — | — |
| 7 | `src/plan/export-timetable-weeks-admin.js` | app2.js | 111 | التصدير، الجدول الدراسي، الأسابيع، الإدارة | admin export timetable weeks | _ttLoadRefresh _ttReqRefresh slotDialog |
| 8 | `src/core/tools-dev.js` | app3.js | 18 | أداتا النصاب والجدول الآلي داخل المنصة + لوحة المطوّر | builder dev nisab | — |
| 9 | `src/plan/extra-pages-join.js` | app4.js | 23 | الصفحات الإضافية في الخطة + روابط انضمام المعلمين | — | — |
| 10 | `lang.js` | — | 25 | التدقيق اللغوي للخطة | — | — |
| 11 | `src/core/messages-sync.js` | app5.js | 27 | الرسائل الداخلية، الإسناد، التصفح كموظف، المزامنة اللحظية | — | EX _exRe assignDialog compose exPill inbox viewAs |
| 12 | `src/core/reports-archive-staff.js` | app6.js | 54 | التقارير، الأرشيف، استيراد الموظفين، هوية كل قسم | archive reports | printDoc |
| 13 | `src/plan/sheets-sync.js` | app7.js | 20 | مزامنة Google Sheets | classes dash dev weeks | _dashReq pullFromSheet syncLabel |
| 14 | `src/core/sidebar-appearance.js` | app8.js | 17 | القائمة الجانبية، المظهر، من يعمل الآن | — | uiSettings |
| 15 | `src/core/notifications.js` | — | 37 | الإشعارات: الجرس، إذن الجهاز، التنبيهات العامة والمجدولة، التفضيلات وتحكم المالك، مركز الإشعارات V.notify، التثبيت كتطبيق | notify | NOTIF_KINDS appDialog notifIssue notifMarkRead notifPanel |
| 16 | `src/plan/parent-posts.js` | app9.js | 12 | إعلانات أولياء الأمور | posts | POST_KINDS |
| 17 | `src/core/resources-analysis-roles.js` | app10.js | 29 | المصادر (قديم)، تحليل النتائج، المسميات والصلاحيات V.roles وإظهار البنود features | analysis resources roles | fetchResources hasModule pickResource |
| 18 | `src/attendance/attendance-behavior-supervision.js` | app11.js | 62 | الحضور والغياب والسلوك V.attendance + الإشراف التربوي V.supervision | attendance myreports supervision | _attRefresh attWho |
| 19 | `src/assess/assess.js` | app12.js | 86 | الاختبارات V.assess: المنهج، بنك الأسئلة، المواصفات، التكليفات الإلكترونية، النتائج — يصدّر A._assess | assess | _assess _liveRes assessMode canAssess |
| 20 | `src/core/drive-folders.js` | app13.js | 5 | مجلدات Google Drive لكل معلم | roles | driveDialog |
| 21 | `src/assess/records.js` | app14.js | 10 | سجل المتابعة (سجلات برو) داخل المنصة | records | — |
| 22 | `src/schedule/distribution.js` | app15.js | 55 | توزيع الحصص والجدول المرن V.plan | plan | _lastGen _planReload _planState canPlan |
| 23 | `omr.js` | — | 22 | محرك ورقة التظليل والقراءة الآلية | — | — |
| 24 | `src/assess/paper-exams.js` | app16.js | 106 | الاختبارات الورقية والتصحيح الآلي واللجان V.paper | paper | — |
| 25 | `src/core/activity.js` | app17.js | 10 | النشاط والدخول (للمالك) | activity reports | — |
| 26 | `src/core/home.js` | app18.js | 9 | الصفحة الرئيسية V.home | home | — |
| 27 | `src/schedule/studio.js` | app19.js | 12 | استوديو الجداول والأنصبة V.studio (حاوية تبويبات) | studio | — |
| 28 | `src/schedule/saved-versions.js` | app20.js | 10 | النسخ المحفوظة والحفظ السحابي للنصاب والتوزيع | nisab plan | addSnapshot readNisabAny snapshots |
| 29 | `src/schedule/bell.js` | app21.js | 61 | اليوم الدراسي والجدول الزمني V.bell + A.bell + التحكم في الجدول المعتمد pin + فحص التوقيت | bell | bell ptime |
| 30 | `src/schedule/import-timetable.js` | app22.js | 20 | استيراد الجداول الجاهزة (Excel/CSV/PDF من aSc) | — | ttImport ttMatch ttParsePdf |
| 31 | `src/schedule/approve-timetable.js` | app23.js | 10 | اعتماد الجدول مع معاينة الأثر | — | ttApprove |
| 32 | `src/schedule/timetable-designer.js` | app24.js | 48 | مصمم الجداول للطباعة V.timetable | timetable | ttDesign |
| 33 | `src/plan/timetable-mismatch.js` | app25.js | 7 | تنبيه «حصص مكتوبة تخالف الجدول» | dash | conflictsDialog |
| 34 | `src/plan/unified-entry.js` | app26.js | 16 | الإدخال الموحّد لعدة فصول | my | unifiedEditor |
| 35 | `live.js` | — | 44 | عرض الجدول الاستثنائي التفاعلي (مشترك مع صفحات العرض) | — | — |
| 36 | `src/schedule/display-schedule.js` | app27.js | 67 | الجدول الاستثنائي للعرض display_schedules V.live | live my | _live _liveDetach _liveEntries _liveImport _livePlanMap _syncLiveTimes bindLive liveTable |
| 37 | `src/schedule/remote-day.js` | app28.js | 61 | تحويل يوم/أسبوع للتعلم عن بعد | — | _liveFit _liveHue liveConvert liveEditTab liveRearrange liveRepTab liveVisTab |
| 38 | `src/assess/import-questions.js` | app29.js | 44 | «المطلوب مني» في خطتي + استيراد الأسئلة A.importQ (Excel/Word/PDF/صور OCR) | my | _fileLines _imageLines _ocrDone _ocrProg _parseQ importQ |
| 39 | `src/attendance/period-attendance.js` | app30.js | 27 | حضور الحصص (معلم الحصة) | — | _paLive attEntryOf attLive attPassed attPeriods attTimes curBreaks curPeriod myPeriodAtt takePeriod |
| 40 | `src/plan/calendar.js` | app31.js | 12 | التقويم الدراسي المرن داخل الأسابيع | weeks | _calInfer _calPlan |
| 41 | `src/core/trash.js` | app32.js | 6 | سلة المحذوفات V.trash | trash | confirmBox |
| 42 | `src/schedule/standby.js` | app33.js | 18 | حصص الانتظار وتأمين الحصص V.standby | standby | — |
| 43 | `src/schedule/daily-board.js` | app34.js | 24 | اللوحة اليومية V.board + رابط الشاشة board.html | board | — |
| 44 | `src/plan/prep.js` | app35.js | 32 | تحضير الدروس V.prep | prep | prepEditor prepGen |
| 45 | `src/assess/smart-bank.js` | app36.js | 28 | بنك الأسئلة الذكي: بلوم، كشف التكرار، توليد من نص | — | bankSmart bloomOf dupOf genFromText qGenText smartQuiz |
| 46 | `src/schedule/duty.js` | app37.js | 61 | جداول الإشراف والمناوبة V.duty | duty | dutyDay dutyNowBox myDuty |
| 47 | `src/plan/prep-from-timetable.js` | app38.js | 26 | التحضير من الجدول | prep | myPrepBoard quickPrep |
| 48 | `src/plan/resources-store.js` | app39.js | 39 | المصادر: مخزن المدرسة V.resources | resources | lessonResources pickResource resVisible syncPrepRes |
| 49 | `src/schedule/sketch-editor.js` | app40.js | 9 | محرر الكروكي لمواقع المدرسة | — | sketchEditor |
| 50 | `src/attendance/student-codes.js` | app41.js | 10 | حسابات الطلاب برمز دخول (me.html) | stucodes | — |
| 51 | `src/assess/games.js` | app42.js | 21 | الألعاب التعليمية V.games (play.html) | games | — |
| 52 | `src/assess/whiteboard-labs.js` | app43.js | 15 | السبورة التفاعلية والمعامل الافتراضية | labs wboard | — |
| 53 | `src/core/teacher-ui.js` | app44.js | 17 | تخصيص صفحة المعلم (للمالك) V.tui | tui | TUI_BASIC tuiApply tuiWrapNav |
| 54 | `src/core/test-teacher.js` | app45.js | 10 | المعلم التجريبي (للمالك) | testt | isTestMode isTestStaff |
| 55 | `src/schedule/remote-template.js` | app46.js | 23 | قالب التعليم عن بعد | live | remoteOptimize remoteQuick remoteSettings |
| 56 | `src/plan/homework-cell.js` | app47.js | 27 | خانة الواجب المخصصة في الخطة | reports | HW_QTYPES HW_TYPES hwBind hwBox repPrep |
| 57 | `src/plan/homework-follow.js` | app48.js | 19 | متابعة الواجبات V.hwf | hwf | — |
| 58 | `src/plan/approval-requests.js` | app49.js | 37 | طلبات الاعتماد والمهام الأدائية | dash reports | chgRow exExtras langHint langOf repAce |
| 59 | `src/attendance/monitor-attendance.js` | app50.js | 54 | رصد الحضور لمراقب الدور | — | attAlerts attPicker attRecord attReports |
| 60 | `src/attendance/live-attendance-board.js` | app51.js | 14 | لوحة الحضور اللحظية | — | _attFabBound _attFabEl attDash attMerge |
| 61 | `src/core/ui-helpers.js` | app52.js | 14 | أدوات عرض مشتركة (تواريخ عربية…) | — | arDate arDateShort attChart attDrill |
| 62 | `src/attendance/students-db.js` | app53.js | 5 | قاعدة الطلاب الموحّدة A.studentsAll | analysis | studentsAll studentsPayload syncStudentsNow |
| 63 | `src/core/owner-controls.js` | app54.js | 4 | تحكم المالك في الشاشات اللحظية | tui | liveOK |
| 64 | `src/core/kpi-drill.js` | app55.js | 3 | الأرقام التفاعلية A.attDrill | — | — |
| 65 | `src/assess/noor-analysis.js` | app56.js | 68 | تحليل درجات نظام نور V.noor (استيراد ملفات نور) | noor | _noor |
| 66 | `src/supervision/forms.js` | app57.js | 70 | النماذج والاستمارات بالتوقيع الإلكتروني V.forms (مع tools/supervision.html) | forms | _forms formsLoadLib formsSlots formsTeacherSlot formsWithSig |
| 67 | `src/assess/ehomework.js` | app58.js | 4 | الواجب الإلكتروني برابط: أزرار ونافذة المشاركة QR | assess hwf | — |
| 68 | `src/core/report-studio.js` | app59.js | 31 | استوديو التقارير A.printDoc بهوية المدرسة | — | printDoc printDocDirect printStyle |
| 69 | `src/attendance/counseling.js` | app60.js | 94 | الإرشاد الطلابي: الإحالات والحالات والوكيل V.refer/V.counsel/V.deputy | counsel deputy refer | _counsel refData refDrill refLive refStats |
| 70 | `src/attendance/students-browser.js` | app61.js | 17 | تبويب الطلاب: قوائم وإحصاءات تفاعلية A.stuBrowser | — | stuBrowser |
| 71 | `src/assess/school-bank.js` | app62.js | 32 | بنك أسئلة المدرسة V.qbank + إتاحة الواجب الإلكتروني + واجهات الطالب + تصدير Excel | qbank | QTHEMES canAssess canAssessFull canEhw canHw ehwCfg ehwOnly qExport themePick |
| 72 | `src/plan/terms.js` | — | 24 | الفصول الدراسية: مؤشر الفصل في الشريط وقائمة المستخدم، تبويب الإدارة لإضافة الفصل الثاني وتجهيزه وتفعيله (sql/094) | admin | termCur termFilter termOf termPickHtml termSwitch |
| 73 | `src/attendance/hr.js` | — | 33 | الموارد البشرية V.hr: حضور الموظفين بالموقع ورمز QR المتغير والرصد اليدوي، السجل والتصدير، المساءلات، الإعدادات، وربط الغياب بتأمين الحصص وعدم احتساب واجب الغائب (sql/096) | home hr | dropAbsent |
