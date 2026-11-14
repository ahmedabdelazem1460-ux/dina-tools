/* منصة دينا — رعاية الموهوبين (برنامج الكشف والرعاية — إدارة الجودة والتطوير التربوي)
   مرجع متكامل: الفلسفة والحلقات الثلاث، البوابات الخمس، خطة كل مرحلة، مكتبة المقاييس المعتمدة وجدول التفسير، البرامج والأدوار والجودة.
   ملف لكل طالب (gifted_files — sql/100) يتقدم عبر البوابات الخمس: ١٤ نموذجاً واستمارة وخطة قابلة للتعبئة والطباعة،
   وقرار اللجنة بالأوزان والتصنيف، ولوحة مؤشرات وتصدير. الترشيح الذاتي يُربط بمقياس «سمات الموهبة» في البوصلة.
   ملاحظة مهنية: المقاييس المقننة تُطبق وتُفسر من مختصين مرخصين وبنسخ أصلية؛ هنا تُسجَّل نتائجها فقط. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  const DEMO = !!api.demo;
  A.I.gifted = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 15.5 6.7 18.4l1.2-6L3.4 8.3l6-.7z"/><path d="M8 22h8"/></svg>';
  const admin = () => !!S.me && (S.me.is_owner || (A.hasModule && (A.hasModule('gifted') || A.hasModule('counselor'))));
  if (A.NAV && !A.NAV.some(n => n[0] === 'gifted')) { const i = A.NAV.findIndex(n => n[0] === 'compass'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['gifted', 'رعاية الموهوبين', () => !!S.me && !S.realMe && (S.me.is_owner || A.tfeat('gifted'))]); }

  // ================= المرجع =================
  const PRINC = [['⚖️', 'تكافؤ الفرص', 'كل طالب يُتاح له الترشيح بغض النظر عن خلفيته أو لغته أو تحصيله.'], ['🧰', 'تعدد الأدوات', 'لا يُبنى القرار على أداة واحدة؛ نهج المعايير المتعددة.'], ['🌐', 'الشمولية', 'الموهبة متعددة المجالات: عقلية، أكاديمية، إبداعية، قيادية، فنية، حركية.'], ['🔁', 'الاستمرارية', 'الكشف عملية مستمرة عبر المراحل لا حدث واحد.'], ['🤝', 'الشراكة', 'المدرسة والأسرة والمجتمع شركاء في الكشف والرعاية.'], ['🔒', 'السرية والتوثيق', 'ملف موثق لكل طالب، ونتائج تُحفظ بسرية ولا تُستخدم للوصم.']];
  const RINGS = [['قدرة فوق المتوسط', '#005499', 'عامة (الاستدلال، الذاكرة، الطلاقة اللغوية) أو خاصة في مجال.'], ['الالتزام بالمهمة', '#2E8B57', 'المثابرة والانغماس ومعايير الأداء العالية.'], ['الإبداع', '#AE95DA', 'الطلاقة والمرونة والأصالة وحب الاستطلاع.']];
  const GATES = [
    ['📣', 'الترشيح والوعي', 'نشر الوعي بخصائص الموهوبين، وترشيح المعلم وولي الأمر والترشيح الذاتي.', 'الفصل الأول', ['nomT', 'nomP', 'nomS']],
    ['🔎', 'الفرز والتقييم', 'مقياس السمات السلوكية (تقدير المعلم)، ونشاط التفكير الإبداعي، والمقاييس الجمعية.', 'الفصل الأول – الثاني', ['rating', 'torr']],
    ['🧪', 'التشخيص النهائي', 'مقاييس فردية مقننة يطبقها مختص، ومقابلة الطالب، وملف الإنجاز، ثم لجنة الكشف.', 'الفصل الثاني', ['tests', 'intv', 'port']],
    ['📄', 'التقرير الفردي', 'قرار اللجنة بالأوزان وتصنيف الموهبة وإبلاغ ولي الأمر وموافقته.', 'الفصل الثاني', ['dec', 'consent']],
    ['🚀', 'الإلحاق والمتابعة', 'الخطة الفردية (IGP)، وبرامج الإثراء أو التسريع، والرصد الفصلي والموارد.', 'الفصل الثالث وما بعده', ['igp', 'enr', 'res', 'mon']]];
  const STAGES = [
    ['رياض الأطفال (٤–٦ سنوات)', 'فضول عالٍ، حصيلة لغوية مبكرة، ذاكرة قوية، لعب تخيلي.', 'مقياس ستانفورد بينيه (الصورة الخامسة)، وكسلر لما قبل المدرسة WPPSI، مقياس تقدير السمات السلوكية', 'نهاية الفصل الأول', 'معلمة الصف + الأخصائي'],
    ['الابتدائية الدنيا (١–٣)', 'تعلم سريع للقراءة والحساب، أسئلة عميقة، اهتمامات متخصصة.', 'مقياس موهبة للقدرات العقلية المتعددة (م١)، مصفوفات رافن الملونة، عينات أعمال الطالب', 'الفصل الأول – الثاني', 'معلم الصف + منسق البرنامج'],
    ['الابتدائية العليا (٤–٦)', 'تفكير مجرد ناشئ، مثابرة، إبداع واضح، حس قيادي.', 'مقياس موهبة (م٢)، اختبار تورانس للتفكير الإبداعي TTCT، وكسلر WISC-V', 'الفصل الأول – الثاني', 'معلمو المواد + الموجه + اللجنة'],
    ['المتوسطة (٧–٩)', 'تفكير ناقد، ميول متخصصة، حاجة لتحديات وهوية.', 'مقياس موهبة (م٢/م٣)، مصفوفات رافن المتقدمة، مقابلة فردية وتوصيات المعلمين', 'الفصل الأول – الثاني', 'منسق البرنامج + الموجه'],
    ['الثانوية (١٠–١٢)', 'تخصص عميق، بحث مستقل، توجه أكاديمي ومهني.', 'اختبار القدرات العقلية الأولية PMA، واتسون–جليسر للتفكير الناقد، مقياس ستيرنبرغ للذكاء الناجح', 'الفصل الأول', 'منسق البرنامج + المرشد الأكاديمي']];
  const TOOLS = [
    ['ستانفورد بينيه — الصورة الخامسة', 'SB5', 'القدرة المعرفية العامة لفظياً وغير لفظي', 'الروضة فما فوق', 'فردي مقنن', 'iq'],
    ['وكسلر لذكاء ما قبل المدرسة', 'WPPSI', 'القدرات الذهنية قبل الالتحاق بالمدرسة', 'الروضة', 'فردي مقنن', 'iq'],
    ['وكسلر لذكاء الأطفال — الخامسة', 'WISC-V', 'الذكاء العام والقدرات المعرفية المحددة', '٦–١٦ سنة', 'فردي مقنن', 'iq'],
    ['كوفمان لتقييم الأطفال', 'K-ABC', 'أساليب معالجة المعلومات والقدرة العامة', '٣–١٨ سنة', 'فردي مقنن', 'iq'],
    ['مقياس موهبة للقدرات العقلية المتعددة', 'م١/م٢/م٣', 'الاستدلال اللغوي والرياضي والمكاني والعلمي والميكانيكي بتدرج الصعوبة', 'الابتدائية – المتوسطة', 'جمعي مقنن (موهبة)', 'pct'],
    ['مصفوفات رافن (الملونة/المتقدمة)', 'Raven CPM/APM', 'الاستدلال غير اللفظي — مناسب للأصغر أو ضعاف اللغة', 'كل المراحل', 'جمعي/فردي', 'pct'],
    ['اختبار تورانس للتفكير الإبداعي', 'TTCT', 'الطلاقة والمرونة والأصالة والتفاصيل (لفظي وشكلي)', 'كل المراحل', 'جمعي', 'std'],
    ['القدرات العقلية الأولية', 'PMA', 'القدرات اللغوية والمكانية والعددية والاستدلالية أبعاداً منفصلة', 'الثانوية', 'جمعي', 'pct'],
    ['واتسون–جليسر للتفكير الناقد', 'W-GCTA', 'التحليل والاستنتاج والتقييم المنطقي', 'الثانوية', 'جمعي', 'pct'],
    ['ستيرنبرغ للذكاء الناجح', 'STAT', 'الذكاء التحليلي والإبداعي والعملي', 'الثانوية', 'جمعي', 'pct'],
    ['مقياس تقدير السمات السلوكية (المعلم)', '—', 'ملاحظة المعلم المنظمة لمؤشرات الحلقات الثلاث (النموذج ٤)', 'كل المراحل', 'تقدير', 'form'],
    ['ملف الإنجاز والتقييم الديناميكي', 'Portfolio', 'أعمال وشهادات وتوصيات وانعكاس ذاتي وأداء في مهام متدرجة', 'كل المراحل', 'تكميلي', 'form']];
  const IQ = [[130, 999, 'موهوب / متفوق جداً', '#2E8B57'], [120, 129, 'متفوق', '#3F7D2A'], [110, 119, 'فوق المتوسط', '#005499'], [90, 109, 'متوسط', '#5E9BD3'], [70, 89, 'دون المتوسط', '#C9A44C'], [0, 69, 'منخفض جداً', '#B83A3A']];
  const iqBand = v => IQ.find(b => v >= b[0] && v <= b[1]);
  const CARE = [['🏫', 'الإثراء الصفي', 'تمايز ومهام مفتوحة وضغط المنهج داخل الفصل.'], ['🧩', 'البرامج اللاصفية', 'أندية ومسابقات وبرامج صيفية ومشاريع.'], ['⏩', 'التسريع', 'تسريع مادة أو صف وفق ضوابط اللجنة وموافقة الأسرة.'], ['🧭', 'الإرشاد', 'إرشاد نفسي وأكاديمي ومهني وإدارة الكمالية.'], ['🔗', 'نموذج المنهج المتكامل ICM', 'محتوى متقدم + عمليات تفكير عليا + قضايا ومفاهيم كبرى.']];
  const PROGS = [['الابتدائية', ['مستكشف المستقبل', 'نادي المبدع الصغير', 'أكاديمية الخوارزمي', 'مختبر الابتكار الرقمي']], ['المتوسطة', ['الباحث الناشئ', 'رواد الغد', 'تحدي الذكاء الاصطناعي', 'الإثراء الأكاديمي المكثف']], ['الثانوية', ['عالم المستقبل', 'حاضنة المبتكرين والمخترعين', 'الاستعداد للجامعات العالمية', 'منتدى القيادة العالمية']]];
  const ROLES = [['منسق البرنامج', 'يخطط ويتابع البوابات والجدول ويدير الملفات والتقارير.'], ['معلم الصف/المادة', 'يرشّح ويعبّئ مقياس السمات ويطبق الإثراء الصفي.'], ['الموجه الطلابي/الأخصائي', 'المقابلات والمقاييس الفردية والإرشاد.'], ['لجنة الكشف', 'تدرس الملف وتصدر القرار والتصنيف والتوصيات.'], ['ولي الأمر', 'يرشّح ويوافق ويتابع الأنشطة المنزلية.'], ['منسق البرامج الإثرائية', 'ينفذ الخطط والبرامج ويقيس الأثر.']];
  const QUAL = [['نسبة الكشف', 'الموهوبون المصنفون ÷ طلاب المدرسة'], ['نسبة الاحتفاظ', 'المستمرون في البرامج ÷ الملتحقين'], ['رضا أولياء الأمور', 'استبانة نصف سنوية'], ['تنوع مصادر الترشيح', 'معلم/ولي أمر/ذاتي/نتائج'], ['اكتمال الملفات', 'الملفات المكتملة النماذج ÷ الكل'], ['الالتزام الزمني', 'إنجاز البوابات في مواعيدها']];
  const TIMELINE = [['الفصل الأول', ['التوعية والترشيح', 'الفرز: مقياس السمات ونشاط الإبداع', 'المقاييس الجمعية']], ['الفصل الثاني', ['التقييم المتخصص الفردي', 'المقابلات وملفات الإنجاز', 'لجنة القرار والتقارير والموافقات']], ['الفصل الثالث', ['الإلحاق بالبرامج والخطط الفردية', 'الرصد الفصلي', 'التقييم السنوي للبرنامج']]];

  // ================= النماذج =================
  const DOMS = ['قدرة عقلية عامة', 'تفوق أكاديمي تخصصي', 'تفكير إبداعي', 'قيادة', 'موهبة فنية أو أدائية', 'قدرة حركية / رياضية'];
  const RATE = [['قدرة عقلية', ['يتعلم بسرعة ويحتفظ بالمعلومة لفترة طويلة.', 'يمتلك حصيلة لغوية متقدمة لعمره.', 'يدرك العلاقات والأسباب ويستنتج بسهولة.', 'يطرح أسئلة عميقة غير متوقعة لعمره.', 'يحل المشكلات بطرق متعددة.']], ['التزام بالمهمة', ['ينغمس في الموضوعات التي تهمه لفترات طويلة.', 'يثابر لإكمال المهام الصعبة.', 'يسعى للإتقان وينتقد عمله ذاتياً.', 'يعمل باستقلالية ويحتاج إلى قليل من التوجيه.']], ['الإبداع', ['يقدم أفكاراً وحلولاً كثيرة.', 'يأتي بأفكار أصيلة غير مألوفة.', 'يتمتع بخيال واسع وروح دعابة.', 'يغامر فكرياً ولا يخشى الاختلاف.', 'يطوّر الأفكار ويضيف إليها تفاصيل.']]];
  const R4 = ['نادراً', 'أحياناً', 'غالباً', 'دائماً'];
  const INTV = { 'الابتدائية': ['ما الشيء الذي تحب أن تتعلمه أكثر من أي شيء؟ لماذا؟', 'احكِ لي عن شيء صنعته أو اخترعته.', 'لو كان لديك يوم كامل تفعل فيه ما تشاء، ماذا ستفعل؟', 'ما السؤال الذي تتمنى أن تعرف إجابته؟', 'كيف تتصرف عندما يكون الواجب صعباً؟', 'ما الكتاب أو اللعبة التي تحبها؟ ماذا يعجبك فيها؟'],
    'المتوسطة والثانوية': ['ما المجال الذي تشعر أنك متميز فيه؟ وما الدليل؟', 'صف مشروعاً أو إنجازاً تفخر به، وما التحديات التي واجهتك؟', 'ما القضية أو المشكلة التي تشغل تفكيرك وكيف تقترح حلها؟', 'كيف تتعلم شيئاً جديداً بنفسك خارج المدرسة؟', 'ما طموحك الأكاديمي والمهني بعد عشر سنوات؟', 'متى شعرت بالملل في الصف؟ وما الذي كان سيجعله أكثر تحدياً؟'] };
  const PORT = ['أعمال ومنتجات الطالب', 'شهادات وجوائز ومشاركات', 'توصيات المعلمين والمختصين', 'توثيق بصري (صور/فيديو) للأداء', 'سجل القراءة والاهتمامات', 'الانعكاس والتقييم الذاتي'];
  // أنواع الحقول: t نص، a نص طويل، n رقم، d تاريخ، ch خيارات متعددة، sel خيار، r تقدير (بنود)، rows جدول، info نص إرشادي
  const F = {
    nomT: { g: 1, ic: '👩‍🏫', n: 'ترشيح المعلم', sub: 'النموذج ١', fs: [['by', 't', 'اسم المعلم المرشِّح'], ['subj', 't', 'المادة'], ['dom', 'ch', 'مجال التميز الملحوظ', DOMS], ['sit', 'a', 'صف موقفاً ملحوظاً يدل على التميز (متى، ماذا فعل الطالب، كيف كان أداؤه مقارنة بأقرانه)'], ['note', 'a', 'ملاحظات إضافية']] },
    nomP: { g: 1, ic: '🏠', n: 'ترشيح ولي الأمر', sub: 'النموذج ٢', fs: [['by', 't', 'اسم ولي الأمر'], ['ph', 't', 'الجوال'], ['age', 't', 'في أي عمر لاحظتم تميزه؟'], ['dom', 'ch', 'المجالات', DOMS], ['act', 'a', 'الأنشطة والهوايات التي ينجذب إليها'], ['q', 'a', 'أمثلة على أسئلة أو أفكار تفوق عمره'], ['note', 'a', 'ملاحظات']] },
    nomS: { g: 1, ic: '🙋', n: 'الترشيح الذاتي', sub: 'النموذج ٣ (المتوسطة والثانوية)', fs: [['dom', 'ch', 'المجال الذي أشعر بتميزي فيه', DOMS], ['ach', 'a', 'إنجاز أفخر به'], ['wish', 'a', 'ما أتمنى أن أتعلمه أو أطوره'], ['info', 'info', 'يمكن أيضاً تطبيق مقياس «سمات الموهبة» من البوصلة وإضافة نتيجته لهذا الملف تلقائياً.']] },
    rating: { g: 2, ic: '📋', n: 'مقياس تقدير السمات السلوكية', sub: 'النموذج ٤ — يعبّئه المعلم بعد ملاحظة ٤ أسابيع على الأقل', fs: [['by', 't', 'المعلم المقيّم'], ['weeks', 'n', 'مدة الملاحظة (أسابيع)'], ['r', 'r', 'البنود', RATE], ['note', 'a', 'ملاحظات']] },
    torr: { g: 2, ic: '🎨', n: 'نشاط التفكير الإبداعي المصغّر', sub: 'النموذج ٥ — الاستخدامات البديلة', fs: [['info', 'info', 'التعليمات: «اذكر أكبر عدد ممكن من الاستخدامات غير المألوفة لعلبة كرتون فارغة» — ٨ دقائق. سجّل الاستجابات سطراً لكل استجابة.'], ['task', 't', 'المثير المستخدم', null, 'علبة كرتون فارغة'], ['resp', 'a', 'استجابات الطالب (سطر لكل استجابة) — الطلاقة تُحسب تلقائياً'], ['flex', 'n', 'المرونة: عدد الفئات المختلفة للاستجابات'], ['orig', 'n', 'الأصالة: عدد الاستجابات النادرة (غير المتكررة بين الأقران)'], ['elab', 'n', 'التفاصيل: عدد الإضافات والتوضيحات'], ['note', 'a', 'ملاحظات المطبِّق']] },
    tests: { g: 3, ic: '🧪', n: 'نتائج المقاييس المقننة', sub: 'تُطبَّق من مختص مرخص — تُسجَّل النتائج هنا', fs: [['rows', 'rows', 'النتائج', [['tool', 'المقياس', 'sel', TOOLS.filter(x => x[5] !== 'form').map(x => x[0] + (x[1] !== '—' ? ' (' + x[1] + ')' : ''))], ['date', 'التاريخ', 'd'], ['ss', 'الدرجة المعيارية', 'n'], ['pr', 'الرتبة المئينية', 'n'], ['by', 'المطبِّق', 't'], ['note', 'ملاحظة', 't']]], ['mawh', 'n', 'نتيجة مقياس القدرات العقلية المتعددة (٪ أو مئيني) — تدخل في قرار اللجنة بوزن ٣٠٪']] },
    intv: { g: 3, ic: '🗣️', n: 'دليل مقابلة الطالب', sub: 'النموذج ٦', fs: [['stage', 'sel', 'المرحلة', Object.keys(INTV)], ['qs', 'info', ''], ['ans', 'a', 'أبرز إجابات الطالب'], ['r', 'r', 'تقدير القائم بالمقابلة', [['المقابلة', ['الحماس والدافعية', 'عمق التفكير والاستدلال', 'سعة الاهتمامات والمعرفة', 'التواصل والتعبير']]]], ['by', 't', 'القائم بالمقابلة'], ['note', 'a', 'ملاحظات']] },
    port: { g: 3, ic: '🗂️', n: 'قائمة تدقيق ملف الإنجاز', sub: 'النموذج ٧', fs: [['r', 'r', 'جودة محتوى الملف', [['الملف', PORT]]], ['note', 'a', 'ملاحظات اللجنة على الملف']] },
    dec: { g: 4, ic: '⚖️', n: 'قرار لجنة الكشف وتصنيف الموهبة', sub: 'النموذج ٩ — درجة مرجّحة', fs: [['calc', 'info', ''], ['dom', 'ch', 'مجال الموهبة المعتمد', DOMS], ['rec', 'a', 'توصيات اللجنة (البرنامج المقترح، نوع الرعاية)'], ['care', 'ch', 'نوع الرعاية', CARE.map(c => c[1])], ['mem', 'a', 'أعضاء اللجنة'], ['date', 'd', 'تاريخ القرار']] },
    consent: { g: 4, ic: '✍️', n: 'إشعار وموافقة ولي الأمر', sub: 'خطة ٤', fs: [['info', 'info', 'نحيطكم علماً بأن ابنكم/ابنتكم اجتاز مراحل الكشف في برنامج رعاية الموهوبين، ونرجو الاطلاع والموافقة على الالتحاق بالبرنامج.'], ['ok', 'ch', 'الموافقة', ['أوافق على التحاقه بالبرنامج', 'أتعهد بمتابعة الأنشطة المنزلية', 'أرغب في جلسة توجيهية للأسرة']], ['by', 't', 'اسم ولي الأمر'], ['date', 'd', 'التاريخ']] },
    igp: { g: 5, ic: '🎯', n: 'الخطة الفردية لرعاية الموهوب (IGP)', sub: 'خطة ١', fs: [['str', 'a', 'نقاط القوة'], ['need', 'a', 'الاحتياجات المصاحبة (أكاديمية، اجتماعية، انفعالية)'], ['rows', 'rows', 'الأهداف', [['goal', 'الهدف', 't'], ['strat', 'الاستراتيجية', 't'], ['who', 'المسؤول', 't'], ['ind', 'مؤشر التحقق', 't'], ['due', 'الموعد', 'd']]]] },
    enr: { g: 5, ic: '🌟', n: 'خطة الإثراء الفصلية (٦ أسابيع)', sub: 'خطة ٢', fs: [['prog', 't', 'البرنامج الإثرائي'], ['rows', 'rows', 'الأسابيع', [['wk', 'الأسبوع', 't'], ['goal', 'الهدف', 't'], ['act', 'النشاط', 't'], ['tool', 'الأداة', 't'], ['who', 'المسؤول', 't'], ['ind', 'مؤشر الإنجاز', 't']], 6], ['eval', 'a', 'آلية التقويم الختامي']] },
    res: { g: 5, ic: '📦', n: 'طلب الموارد', sub: 'خطة ٣', fs: [['rows', 'rows', 'الموارد', [['type', 'النوع', 'sel', ['بشرية', 'مادية', 'تقنية', 'مالية']], ['item', 'البند', 't'], ['why', 'المبرر', 't'], ['cost', 'التكلفة', 'n'], ['pri', 'الأولوية', 'sel', ['عالية', 'متوسطة', 'منخفضة']]]], ['sig', 'info', 'التوقيعات: منسق البرامج — الإدارة المالية — الإدارة العليا']] },
    mon: { g: 5, ic: '📈', n: 'سجل الرصد الفصلي', sub: 'النموذج ٨', fs: [['rows', 'rows', 'الرصد', [['term', 'الفصل', 'sel', ['الأول', 'الثاني', 'الثالث']], ['prog', 'البرنامج', 't'], ['prg', 'مؤشر التقدم', 'sel', ['متقدم', 'مُرضٍ', 'يحتاج دعماً']], ['rec', 'توصية اللجنة', 't']]]] },
  };
  const ORDER = ['nomT', 'nomP', 'nomS', 'rating', 'torr', 'tests', 'intv', 'port', 'dec', 'consent', 'igp', 'enr', 'res', 'mon'];
  const CFG = () => Object.assign({ w: { rating: 25, mawh: 30, torr: 20, pi: 25 }, cut: { x: 85, g: 70, p: 55 } }, ((S.school || {}).settings || {}).gifted || {});
  const LEVELS = { x: ['موهبة استثنائية', '#082B5A'], g: ['موهوب', '#2E8B57'], p: ['واعد بالموهبة', '#C9A44C'], n: ['يستمر الرصد', '#8A97A8'] };

  // ================= الحساب =================
  const rateTot = d => { const r = (d.rating || {}).r || {}; let s = 0, n = 0; RATE.forEach((g, gi) => g[1].forEach((_, i) => { const v = +r[gi + '-' + i]; if (v) { s += v; n++; } })); return { s, n, max: 56 }; };
  const rateRec = s => s >= 36 ? ['إحالة مباشرة للتقييم المتخصص', '#2E8B57'] : s >= 26 ? ['متابعة ورصد إضافي لفصل دراسي', '#C9A44C'] : ['لا يُحال حالياً — يُعاد التقدير لاحقاً', '#8A97A8'];
  const torrScore = d => { const t = d.torr || {}; const flu = String(t.resp || '').split('\n').map(x => x.trim()).filter(Boolean).length; const v = Math.round(Math.min(flu, 20) / 20 * 25 + Math.min(+t.flex || 0, 10) / 10 * 25 + Math.min(+t.orig || 0, 8) / 8 * 25 + Math.min(+t.elab || 0, 10) / 10 * 25); return { flu, v, has: flu > 0 }; };
  const avgR = (x, n) => { const r = (x || {}).r || {}; const v = Object.values(r).map(Number).filter(Boolean); return v.length ? v.reduce((a, b) => a + b, 0) / v.length / n * 100 : null; };
  function weighted(d) {
    const c = CFG(), rt = rateTot(d), parts = [];
    if (rt.n) parts.push(['rating', 'مقياس السمات السلوكية', Math.round(rt.s / 56 * 100), c.w.rating]);
    const mw = (d.tests || {}).mawh; if (mw !== undefined && mw !== '' && mw !== null) parts.push(['mawh', 'القدرات العقلية المتعددة', Math.min(100, +mw), c.w.mawh]);
    const ts = torrScore(d); if (ts.has) parts.push(['torr', 'التفكير الإبداعي', ts.v, c.w.torr]);
    const pi = [avgR(d.port, 4), avgR(d.intv, 4)].filter(x => x != null); if (pi.length) parts.push(['pi', 'ملف الإنجاز والمقابلة', Math.round(pi.reduce((a, b) => a + b, 0) / pi.length), c.w.pi]);
    const wsum = parts.reduce((a, p) => a + p[3], 0); const total = wsum ? Math.round(parts.reduce((a, p) => a + p[2] * p[3], 0) / wsum) : null;
    const lv = total == null ? '' : total >= c.cut.x ? 'x' : total >= c.cut.g ? 'g' : total >= c.cut.p ? 'p' : 'n';
    return { parts, total, lv, complete: parts.length === 4 };
  }
  const filled = (d, k) => { const x = d[k]; if (!x) return false; return Object.entries(x).some(([key, v]) => key !== '_at' && (Array.isArray(v) ? v.some(r => r && Object.values(r).some(Boolean)) : v && typeof v === 'object' ? Object.keys(v).length : String(v || '').trim())); };
  const gateOf = d => { for (let g = 5; g >= 1; g--) if (GATES[g - 1][4].some(k => filled(d, k))) return g; return 1; };
  const pct = d => Math.round(ORDER.filter(k => filled(d, k)).length / ORDER.length * 100);

  // ================= الأنماط =================
  if (!document.getElementById('gfcss')) { const st = document.createElement('style'); st.id = 'gfcss'; st.textContent = `
.gf-hero{border-radius:22px;padding:18px 20px;color:#fff;background:radial-gradient(500px 200px at 10% 0,rgba(58,177,219,.45),transparent),linear-gradient(135deg,#082B5A,#005499);position:relative;overflow:hidden;margin-bottom:14px}
.gf-hero h3{margin:0 0 4px;font-size:20px}.gf-hero p{margin:0;color:#D6E6F5;line-height:1.8}
.gf-hero::after{content:"";position:absolute;inset-inline-end:-20px;bottom:-40px;width:180px;height:180px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 15.5 6.7 18.4l1.2-6L3.4 8.3l6-.7z' fill='%233AB1DB' opacity='.25'/%3E%3C/svg%3E") no-repeat center/contain}
.gf-sec{margin:18px 0 8px;font-size:17px;color:#082B5A;display:flex;gap:8px;align-items:center}.gf-sec::after{content:"";flex:1;height:2px;background:linear-gradient(90deg,#DCE7F3,transparent)}
.gf-g{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(min(100%,240px),1fr))}
.gf-c{border:1px solid #DCE7F3;border-radius:16px;padding:12px 14px;background:linear-gradient(180deg,#fff,#F6FAFD);box-shadow:0 12px 24px -22px rgba(8,43,90,.7)}
.gf-c b{color:#082B5A;display:block}.gf-c .ic{font-size:24px}.gf-c p{margin:4px 0 0;font-size:13px;color:#4D6A8F;line-height:1.7}
.gf-rings{display:flex;justify-content:center;align-items:center;min-height:210px;position:relative}
.gf-rings span{position:absolute;width:150px;height:150px;border-radius:50%;display:grid;place-items:center;text-align:center;font-weight:800;font-size:13px;padding:30px;mix-blend-mode:multiply;border:2px solid #fff}
.gf-gates{display:grid;gap:10px;grid-template-columns:repeat(5,1fr);counter-reset:g}
.gf-gate{position:relative;border-radius:18px;padding:14px 12px;background:#fff;border:1px solid #DCE7F3;box-shadow:0 14px 26px -22px rgba(8,43,90,.8);text-align:center}
.gf-gate .n{width:44px;height:44px;margin:0 auto 6px;border-radius:14px;display:grid;place-items:center;font-size:22px;background:linear-gradient(145deg,#EAF6FB,#D6E8F6);box-shadow:inset 0 -3px 0 rgba(8,43,90,.1)}
.gf-gate b{display:block;color:#082B5A}.gf-gate small{display:block;color:#4D6A8F;line-height:1.6;margin-top:4px}.gf-gate em{display:inline-block;margin-top:6px;font-style:normal;font-size:11px;font-weight:800;color:#005499;background:#E8F1F9;border-radius:20px;padding:1px 8px}
.gf-steps{display:flex;gap:4px;align-items:center}.gf-steps i{width:22px;height:8px;border-radius:6px;background:#E1E9F2}.gf-steps i.on{background:linear-gradient(90deg,#3AB1DB,#005499)}
.gf-lv{display:inline-block;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:800;color:#fff}
.gf-forms{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr))}
.gf-f{display:flex;gap:10px;align-items:center;border:1.5px solid #DCE7F3;border-radius:16px;padding:10px 12px;background:#fff;cursor:pointer;text-align:start;font:inherit;color:inherit;width:100%}
.gf-f:hover{border-color:#3AB1DB;transform:translateY(-1px)}.gf-f:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}
.gf-f .ic{font-size:22px;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:#F0F6FC;flex:none}
.gf-f.done{border-color:#BADF93;background:#F7FCF2}.gf-f.done .ic{background:#E5F4EA}
.gf-f b{display:block;font-size:14px;color:#082B5A}.gf-f small{color:#5F7896}
.gf-gh{display:flex;gap:8px;align-items:center;margin:14px 0 8px;font-weight:800;color:#082B5A}.gf-gh .n{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;background:#E8F1F9}
.gf-gh.cur .n{background:#005499;color:#fff}
.gf-rt{width:100%;border-collapse:collapse}.gf-rt td,.gf-rt th{border-bottom:1px solid #E4EBF5;padding:7px 6px;text-align:start;font-size:13.5px}
.gf-rt .opt{display:flex;gap:4px}.gf-rt .opt label{display:grid;place-items:center;min-width:52px;min-height:38px;border:1.5px solid #DCE7F3;border-radius:10px;cursor:pointer;font-size:12px;font-weight:700;padding:2px 4px}
.gf-rt .opt input{position:absolute;opacity:0}.gf-rt .opt label:has(input:checked){border-color:#2E8B57;background:#EDF7E4;color:#1F6B44}.gf-rt .opt label:has(input:focus-visible){outline:3px solid #3AB1DB}
.gf-chk{display:flex;gap:6px;flex-wrap:wrap}.gf-chk label{display:flex;gap:6px;align-items:center;border:1.5px solid #DCE7F3;border-radius:12px;padding:6px 10px;cursor:pointer}.gf-chk label:has(input:checked){border-color:#005499;background:#EEF5FC}
.gf-calc{border-radius:16px;padding:12px 14px;background:linear-gradient(135deg,#F3FAEC,#EAF6FB);border:1px solid #CFE7F2}
.gf-kpi{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.gf-kpi>div{border-radius:18px;padding:14px;background:linear-gradient(180deg,#fff,#F5F9FD);border:1px solid #DCE7F3;box-shadow:inset 0 -4px 0 var(--c,#3AB1DB)}.gf-kpi b{display:block;font-size:28px;color:#082B5A}.gf-kpi span{font-size:12.5px;color:#4D6A8F}
@media (max-width:860px){.gf-gates{grid-template-columns:1fr 1fr}.gf-gates .gf-gate:last-child{grid-column:1/-1}}
@media (max-width:520px){.gf-gates{grid-template-columns:1fr}.gf-rt .opt label{min-width:40px;font-size:11px}}
`; document.head.appendChild(st); }

  // ================= البيانات =================
  async function load() { try { return await api.list('gifted_files', { school_id: S.school.id }, { order: 'updated_at', desc: true }); } catch (_) { return []; } }
  async function save(f) { f.updated_at = new Date().toISOString(); f.gate = gateOf(f.data); const w = weighted(f.data); f.level = w.lv || ''; await api.upd('gifted_files', f.id, { data: f.data, gate: f.gate, level: f.level, updated_at: f.updated_at }); }
  async function create(o) {
    const row = { school_id: S.school.id, student_id: o.student_id || null, name: o.name || '', class_id: o.class_id || null, source: o.source || 'teacher', gate: 1, level: '', data: o.data || {}, ...(DEMO ? { id: 'gf' + Date.now() + Math.random().toString(36).slice(2, 6), created_by: S.me.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } : {}) };
    const r = await api.ins('gifted_files', [row]); return (Array.isArray(r) ? r[0] : r) || row;
  }
  // من البوصلة: الترشيح الذاتي بمقياس سمات الموهبة
  A.giftedNominate = async o => {
    const L = await load(); let f = o.student_id && L.find(x => x.student_id === o.student_id);
    if (!f) f = await create({ ...o, data: {} });
    f.data = f.data || {}; f.data.nomS = Object.assign({}, f.data.nomS, { scale: o.self, _at: new Date().toISOString() });
    if (!/self/.test(f.source || '')) f.source = [f.source, 'self'].filter(Boolean).join(',');
    await save(f); try { await api.upd('gifted_files', f.id, { source: f.source }); } catch (_) { }
    return f;
  };
  const SRC = { teacher: 'معلم', parent: 'ولي أمر', self: 'ذاتي', results: 'نتائج' };
  const srcChips = s => String(s || '').split(',').filter(Boolean).map(x => `<span class="pill">${esc(SRC[x] || x)}</span>`).join(' ');
  const lvPill = lv => lv && LEVELS[lv] ? `<span class="gf-lv" style="background:${LEVELS[lv][1]}">${LEVELS[lv][0]}</span>` : '<span class="small muted">—</span>';
  const steps = g => `<span class="gf-steps" aria-label="البوابة ${AR(g)} من ٥">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= g ? 'on' : ''}"></i>`).join('')}</span>`;
  const clsName = id => (A.cls && A.cls(id) || {}).name || '';

  // ================= الصفحة =================
  const st = { tab: 'guide' };
  V.gifted = function (root) {
    const ad = admin();
    const T = [['guide', 'الدليل المرجعي'], ['files', ad ? 'ملفات الطلاب' : 'ترشيحاتي'], ['forms', 'النماذج والاستمارات'], ...(ad ? [['dash', 'المؤشرات والتقارير']] : [])];
    if (!T.some(t => t[0] === st.tab)) st.tab = 'guide';
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>رعاية الموهوبين</h2><p class="sub" style="margin:2px 0 0">برنامج الكشف عن الموهوبين ورعايتهم من الروضة حتى الثانوية — مرجع متكامل وملف لكل طالب عبر البوابات الخمس.</p></div>${st.tab !== 'guide' ? '<button class="btn" id="gfNew">+ ترشيح طالب</button>' : ''}</div>
      <div class="fm-tabs">${T.map(([k, l]) => `<button data-t="${k}" class="${st.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="gfB"></div></div>`;
    $$('[data-t]', root).forEach(b => b.onclick = () => { st.tab = b.dataset.t; V.gifted(root); });
    if ($('#gfNew', root)) $('#gfNew', root).onclick = () => nominate(() => { st.tab = 'files'; V.gifted(root); });
    ({ guide, files, forms, dash })[st.tab]($('#gfB', root), root);
  };

  function guide(B) {
    B.innerHTML = `<div class="gf-hero"><h3>⭐ برنامج الكشف عن الموهوبين ورعايتهم</h3><p>الموهبة متعددة المجالات، والكشف عملية مستمرة تعتمد تعدد الأدوات والمعايير وتشارك فيها المدرسة والأسرة. يتقدم ملف كل طالب عبر خمس بوابات تنتهي بخطة رعاية فردية وبرامج إثراء أو تسريع ومتابعة فصلية.</p></div>
      <div class="gf-sec">المبادئ الستة</div><div class="gf-g">${PRINC.map(p => `<div class="gf-c"><span class="ic" aria-hidden="true">${p[0]}</span><b>${p[1]}</b><p>${p[2]}</p></div>`).join('')}</div>
      <div class="gf-sec">نموذج الحلقات الثلاث</div><div class="grid g2" style="align-items:center"><div class="gf-rings" aria-hidden="true">${RINGS.map((r, i) => `<span style="background:${r[1]}22;color:${r[1]};transform:translate(${[-55, 55, 0][i]}px,${[-30, -30, 50][i]}px)">${r[0]}</span>`).join('')}</div><div class="gf-g" style="grid-template-columns:1fr">${RINGS.map(r => `<div class="gf-c" style="border-inline-start:5px solid ${r[1]}"><b>${r[0]}</b><p>${r[2]}</p></div>`).join('')}<p class="small muted">تتكوّن الموهبة من تفاعل الحلقات الثلاث، ويُتخذ القرار النهائي بنهج المعايير المتعددة لا بأداة واحدة.</p></div></div>
      <div class="gf-sec">البوابات الخمس للكشف</div><div class="gf-gates">${GATES.map((g, i) => `<div class="gf-gate"><div class="n" aria-hidden="true">${g[0]}</div><b>${AR(i + 1)}. ${g[1]}</b><small>${g[2]}</small><em>${g[3]}</em></div>`).join('')}</div>
      <div class="gf-sec">خطة العمل حسب المرحلة</div><div class="scroll"><table class="tbl"><thead><tr><th>المرحلة</th><th>الخصائص النمائية</th><th>الأدوات المقترحة</th><th>التوقيت</th><th>المسؤول</th></tr></thead><tbody>${STAGES.map(s => `<tr>${s.map((x, i) => `<td>${i ? esc(x) : `<b>${esc(x)}</b>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="gf-sec">مكتبة المقاييس المعتمدة</div><div class="scroll"><table class="tbl"><thead><tr><th>المقياس</th><th>الرمز</th><th>ماذا يقيس</th><th>الفئة</th><th>النوع</th></tr></thead><tbody>${TOOLS.map(t => `<tr><td><b>${esc(t[0])}</b></td><td dir="ltr">${esc(t[1])}</td><td>${esc(t[2])}</td><td>${esc(t[3])}</td><td>${esc(t[4])}</td></tr>`).join('')}</tbody></table></div>
      <div class="gf-calc small" style="margin-top:8px">⚠️ المقاييس المقننة تتطلب ترخيصاً مهنياً ونسخاً أصلية من الناشرين، وتُطبَّق وتُفسَّر من مختصين مدربين فقط. تُستخدم المنصة لتوثيق نتائجها ضمن ملف الطالب، والنماذج التوثيقية لا تغني عن الترخيص.</div>
      <div class="gf-sec">تفسير الدرجة المعيارية (IQ)</div><div class="gf-g">${IQ.map(b => `<div class="gf-c" style="border-inline-start:5px solid ${b[3]}"><b>${b[1] > 900 ? AR(b[0]) + ' فأكثر' : AR(b[0]) + ' – ' + AR(b[1])}</b><p>${b[2]}</p></div>`).join('')}</div><p class="small muted">المقاييس الأخرى تُفسَّر وفق جداول معاييرها الخاصة.</p>
      <div class="gf-sec">قرار اللجنة والتصنيف</div><div class="gf-g">${[['مقياس السمات السلوكية', CFG().w.rating], ['القدرات العقلية المتعددة', CFG().w.mawh], ['التفكير الإبداعي', CFG().w.torr], ['ملف الإنجاز والمقابلة', CFG().w.pi]].map(x => `<div class="gf-c"><b>${AR(x[1])}٪</b><p>${x[0]}</p></div>`).join('')}</div>
      <p class="small">التصنيف: ${Object.entries(LEVELS).filter(e => e[0] !== 'n').map(([k, l]) => `${lvPill(k)} ${k === 'x' ? '≥ ' + AR(CFG().cut.x) : k === 'g' ? '≥ ' + AR(CFG().cut.g) : '≥ ' + AR(CFG().cut.p)}`).join(' · ')} — مقياس السمات: ٣٦ فأعلى إحالة مباشرة، ٢٦–٣٥ متابعة فصل دراسي.</p>
      <div class="gf-sec">أنواع الرعاية</div><div class="gf-g">${CARE.map(c => `<div class="gf-c"><span class="ic" aria-hidden="true">${c[0]}</span><b>${c[1]}</b><p>${c[2]}</p></div>`).join('')}</div>
      <div class="gf-sec">البرامج المقترحة لكل مرحلة</div><div class="gf-g">${PROGS.map(p => `<div class="gf-c"><b>${p[0]}</b><p>${p[1].map(esc).join(' · ')}</p></div>`).join('')}</div>
      <div class="gf-sec">الجدول الزمني</div><div class="gf-g">${TIMELINE.map(t => `<div class="gf-c"><b>📅 ${t[0]}</b><p>${t[1].map(esc).join('<br>')}</p></div>`).join('')}</div>
      <div class="gf-sec">الأدوار والمسؤوليات</div><div class="gf-g">${ROLES.map(r => `<div class="gf-c"><b>${r[0]}</b><p>${r[1]}</p></div>`).join('')}</div>
      <div class="gf-sec">معايير الجودة والمتابعة</div><div class="gf-g">${QUAL.map(q => `<div class="gf-c"><b>${q[0]}</b><p>${q[1]}</p></div>`).join('')}</div>
      <p class="small muted" style="margin-top:12px">المرجع: برنامج الكشف عن الموهوبين ورعايتهم — إدارة الجودة والتطوير التربوي، مدارس دينا العالمية ١٤٤٨هـ، والأطر النظرية (رينزولي، غانييه، المعايير المتعددة).</p>
      <div class="acts"><button class="btn ghost" id="gdP">${A.I.print || ''} طباعة الدليل</button></div>`;
    $('#gdP', B).onclick = () => A.printDoc('برنامج الكشف عن الموهوبين ورعايتهم', 'الدليل المرجعي', B.innerHTML.replace(/<div class="acts">[\s\S]*$/, ''), false);
  }

  async function files(B, root) {
    B.innerHTML = '<div class="spinner"></div>'; const L = await load();
    if (!L.length) { B.innerHTML = A.emptyBox('لا ملفات بعد', 'ابدأ بترشيح طالب: معلم أو ولي أمر أو ترشيح ذاتي من مقياس «سمات الموهبة» في البوصلة.'); return; }
    B.innerHTML = `<div class="row" style="gap:6px;margin-bottom:8px;flex-wrap:wrap"><input class="in" id="gfQ" placeholder="بحث بالاسم" style="max-width:240px"><select class="in" id="gfG" style="width:auto"><option value="">كل البوابات</option>${GATES.map((g, i) => `<option value="${i + 1}">${AR(i + 1)}. ${g[1]}</option>`).join('')}</select><select class="in" id="gfLv" style="width:auto"><option value="">كل التصنيفات</option>${Object.entries(LEVELS).map(([k, l]) => `<option value="${k}">${l[0]}</option>`).join('')}</select></div>
      <div class="scroll"><table class="tbl"><thead><tr><th>الطالب</th><th>الفصل</th><th>مصدر الترشيح</th><th>البوابة</th><th>اكتمال الملف</th><th>التصنيف</th></tr></thead><tbody id="gfT"></tbody></table></div>`;
    const draw = () => { const q = $('#gfQ', B).value.trim(), g = $('#gfG', B).value, lv = $('#gfLv', B).value;
      $('#gfT', B).innerHTML = L.filter(f => (!q || (f.name || '').includes(q)) && (!g || +f.gate === +g) && (!lv || f.level === lv)).map(f => `<tr data-f="${f.id}" tabindex="0" style="cursor:pointer"><td><b>${esc(f.name)}</b></td><td>${esc(clsName(f.class_id))}</td><td>${srcChips(f.source)}</td><td>${steps(f.gate || 1)} <span class="small">${esc(GATES[(f.gate || 1) - 1][1])}</span></td><td><div class="nf-meter" style="max-width:120px"><i style="width:${pct(f.data || {})}%"></i></div><span class="small">${AR(pct(f.data || {}))}٪</span></td><td>${lvPill(f.level)}</td></tr>`).join('');
      $$('[data-f]', B).forEach(tr => { const go = () => openFile(L.find(f => f.id === tr.dataset.f), () => files(B, root)); tr.onclick = go; tr.onkeydown = e => { if (e.key === 'Enter') go(); }; }); };
    ['gfQ', 'gfG', 'gfLv'].forEach(id => $('#' + id, B).oninput = draw); draw();
  }

  async function nominate(after) {
    const cls = (S.allClasses || S.classes || []).filter(c => c.active !== false).sort((a, b) => (a.sort || 0) - (b.sort || 0));
    const m = A.modal(`<h3>⭐ ترشيح طالب لبرنامج الموهوبين</h3><div class="grid g2"><div class="field"><label for="nmC">الفصل</label><select class="in" id="nmC">${cls.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label for="nmS">الطالب</label><select class="in" id="nmS"></select></div>
      <div class="field"><label for="nmR">مصدر الترشيح</label><select class="in" id="nmR">${Object.entries(SRC).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div></div>
      <p class="small muted">يُنشأ ملف الطالب ويبدأ من البوابة الأولى، ثم تعبّئ نموذج الترشيح المناسب.</p><div class="acts"><button class="btn" id="nmGo">إنشاء الملف</button></div>`);
    const loadS = async () => { let L = []; try { L = await api.list('students', { class_id: $('#nmC', m.el).value, active: true }, { order: 'full_name', select: 'id,full_name' }); } catch (_) { } $('#nmS', m.el).innerHTML = L.map(s => `<option value="${s.id}">${esc(s.full_name)}</option>`).join('') || '<option value="">لا طلاب</option>'; };
    $('#nmC', m.el).onchange = loadS; await loadS();
    $('#nmGo', m.el).onclick = e => A.run(e.currentTarget, async () => {
      const sel = $('#nmS', m.el); if (!sel.value) return A.toast('اختر الطالب', 'err');
      const ex = (await load()).find(f => f.student_id === sel.value); if (ex) { m.close(); A.toast('للطالب ملف قائم — فُتح', 'ok'); return openFile(ex, after); }
      const src = $('#nmR', m.el).value; const f = await create({ student_id: sel.value, name: sel.options[sel.selectedIndex].text, class_id: $('#nmC', m.el).value, source: src });
      m.close(); after && after(); openFile(f, after, { teacher: 'nomT', parent: 'nomP', self: 'nomS', results: 'tests' }[src]);
    });
  }

  function openFile(f, after, openForm) {
    f.data = f.data || {};
    const draw = () => { const g = gateOf(f.data), w = weighted(f.data);
      return `<div class="gf-hero" style="margin:0 0 10px"><h3>⭐ ${esc(f.name)}</h3><p>${esc(clsName(f.class_id))} · مصدر الترشيح: ${esc(String(f.source || '').split(',').map(x => SRC[x] || x).join('، '))} · اكتمال الملف ${AR(pct(f.data))}٪</p><div style="margin-top:8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">${steps(g)} <b>البوابة ${AR(g)}: ${esc(GATES[g - 1][1])}</b> ${w.total != null ? `<span>الدرجة المرجّحة: <b>${AR(w.total)}٪</b></span> ${lvPill(w.lv)}` : ''}</div></div>
      ${GATES.map((G, i) => `<div class="gf-gh ${i + 1 === g ? 'cur' : ''}"><span class="n">${G[0]}</span>${AR(i + 1)}. ${G[1]} <span class="small muted" style="font-weight:500">— ${G[3]}</span></div><div class="gf-forms">${G[4].map(k => `<button class="gf-f ${filled(f.data, k) ? 'done' : ''}" data-fm="${k}"><span class="ic" aria-hidden="true">${F[k].ic}</span><span><b>${F[k].n}</b><small>${filled(f.data, k) ? '✓ مكتمل' : F[k].sub}</small></span></button>`).join('')}</div>`).join('')}`; };
    const m = A.modal(`<div class="head" style="margin:0 0 8px;padding-inline-end:44px"><div class="grow"><h3 style="margin:0">ملف رعاية الموهوب</h3></div><div class="cp-tools" style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn ghost sm" id="ofP">${A.I.print || ''} التقرير الشامل</button><button class="btn ghost sm" id="ofD">PDF</button><button class="btn ghost sm" id="ofW">واتساب لولي الأمر</button>${admin() ? '<button class="btn ghost sm" id="ofX" style="color:var(--bad)">حذف</button>' : ''}</div></div><div id="ofB">${draw()}</div>`, { cls: 'wide' });
    const bind = () => $$('[data-fm]', m.el).forEach(b => b.onclick = () => form(f, b.dataset.fm, async () => { await save(f); $('#ofB', m.el).innerHTML = draw(); bind(); after && after(); }));
    bind();
    $('#ofP', m.el).onclick = () => A.printDoc('ملف رعاية الموهوب — ' + f.name, clsName(f.class_id), fullReport(f), false);
    $('#ofD', m.el).onclick = e => A.run(e.currentTarget, async () => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;inset-inline-start:-9999px;top:0;width:900px;background:#fff;padding:20px;direction:rtl'; d.innerHTML = `<div class="cp-rep"><div class="cp-rh"><img src="assets/logo_white.svg" alt=""><div class="grow"><b>ملف رعاية الموهوب — ${esc(f.name)}</b><span>${esc(clsName(f.class_id))} · ${esc(A.arDate ? A.arDate(new Date().toISOString().slice(0, 10)) : '')}</span></div></div><div class="cp-rb">${fullReport(f)}</div></div>`; document.body.appendChild(d); try { await A.elToPdf(d, 'ملف الموهوب - ' + f.name); } finally { d.remove(); } });
    $('#ofW', m.el).onclick = async () => { let ph = ((f.data.nomP || {}).ph) || ''; if (!ph && f.student_id) { try { const s = (await api.list('students', { id: f.student_id }, { select: 'guardian_phone' }))[0]; ph = (s || {}).guardian_phone || ''; } catch (_) { } } const w = weighted(f.data);
      const txt = `ولي أمر الطالب/ة ${f.name} الكريم،\nنفيدكم بأن ابنكم/ابنتكم ضمن برنامج الكشف عن الموهوبين ورعايتهم في مدارس دينا العالمية.\nالمرحلة الحالية: البوابة ${gateOf(f.data)} — ${GATES[gateOf(f.data) - 1][1]}${w.lv && w.lv !== 'n' ? `\nالتصنيف: ${LEVELS[w.lv][0]}` : ''}\nنتطلع لشراكتكم في رعاية موهبته.\nمنسق برنامج الموهوبين`; (A.waOpen || ((p, t) => window.open('https://wa.me/?text=' + encodeURIComponent(t))))(ph, txt); };
    if ($('#ofX', m.el)) $('#ofX', m.el).onclick = async () => { if (!await A.confirmBox('حذف ملف <b>' + esc(f.name) + '</b> نهائياً؟', 'حذف', true)) return; await api.del('gifted_files', f.id); m.close(); after && after(); };
    if (openForm) setTimeout(() => { const b = $(`[data-fm="${openForm}"]`, m.el); b && b.click(); }, 50);
  }

  // ---------- محرّر نموذج عام ----------
  function fieldHtml(fk, f, val, k) {
    const [id, ty, label, opts, ph] = f, v = val[id];
    if (ty === 'info') { if (fk === 'intv' && id === 'qs') return `<div class="gf-calc small" id="intQ"></div>`; if (fk === 'dec' && id === 'calc') return `<div class="gf-calc" id="decC"></div>`; return label ? `<div class="gf-calc small">${esc(label)}</div>` : ''; }
    const L = `<label for="g-${id}">${esc(label)}</label>`;
    if (ty === 't' || ty === 'n' || ty === 'd') return `<div class="field">${L}<input class="in" id="g-${id}" data-k="${id}" type="${ty === 'n' ? 'number' : ty === 'd' ? 'date' : 'text'}" value="${esc(v ?? ph ?? '')}" ${ty === 'n' ? 'min="0" inputmode="numeric"' : ''}></div>`;
    if (ty === 'a') return `<div class="field">${L}<textarea class="in" id="g-${id}" data-k="${id}" rows="${id === 'resp' ? 7 : 3}">${esc(v || '')}</textarea></div>`;
    if (ty === 'sel') return `<div class="field">${L}<select class="in" id="g-${id}" data-k="${id}">${opts.map(o => `<option ${v === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`;
    if (ty === 'ch') return `<div class="field"><label>${esc(label)}</label><div class="gf-chk" data-ch="${id}">${opts.map(o => `<label><input type="checkbox" value="${esc(o)}" ${(v || []).includes(o) ? 'checked' : ''}>${esc(o)}</label>`).join('')}</div></div>`;
    if (ty === 'r') { const sc = fk === 'rating' ? R4 : ['ضعيف', 'مقبول', 'جيد', 'متميز']; const r = v || {};
      return `<div class="field"><label>${esc(label)}</label><table class="gf-rt">${opts.map((g, gi) => `<tr><th colspan="2" style="background:#F2F7FC">${esc(g[0])}</th></tr>${g[1].map((it, i) => `<tr><td>${esc(it)}</td><td><div class="opt" role="radiogroup" aria-label="${esc(it)}">${sc.map((l, x) => `<label><input type="radio" name="r-${gi}-${i}" value="${x + 1}" ${+r[gi + '-' + i] === x + 1 ? 'checked' : ''} data-r="${gi}-${i}">${esc(l)}</label>`).join('')}</div></td></tr>`).join('')}`).join('')}</table>${fk === 'rating' ? '<div class="gf-calc" id="rtC" style="margin-top:8px"></div>' : ''}</div>`; }
    if (ty === 'rows') { const cols = opts, rows = (v && v.length ? v : Array.from({ length: k || 2 }, () => ({})));
      return `<div class="field"><label>${esc(label)}</label><div class="scroll"><table class="gf-rt" data-rows="${id}"><thead><tr>${cols.map(c => `<th>${esc(c[1])}</th>`).join('')}<th></th></tr></thead><tbody>${rows.map(r => rowHtml(cols, r)).join('')}</tbody></table></div><button class="btn ghost sm" data-add="${id}" type="button">+ صف</button></div>`; }
    return '';
  }
  const rowHtml = (cols, r) => `<tr>${cols.map(c => `<td>${c[2] === 'sel' ? `<select class="in" data-c="${c[0]}">${['', ...c[3]].map(o => `<option ${r[c[0]] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>` : `<input class="in" data-c="${c[0]}" type="${c[2] === 'n' ? 'number' : c[2] === 'd' ? 'date' : 'text'}" value="${esc(r[c[0]] || '')}" aria-label="${esc(c[1])}">`}</td>`).join('')}<td><button class="btn ghost sm" data-delr type="button" aria-label="حذف الصف">✕</button></td></tr>`;
  function collect(el, def) {
    const o = {};
    $$('[data-k]', el).forEach(i => o[i.dataset.k] = i.value);
    $$('[data-ch]', el).forEach(g => o[g.dataset.ch] = $$('input:checked', g).map(i => i.value));
    const r = {}; $$('[data-r]:checked', el).forEach(i => r[i.dataset.r] = +i.value); if ($$('[data-r]', el).length) o.r = r;
    $$('[data-rows]', el).forEach(t => o[t.dataset.rows] = $$('tbody tr', t).map(tr => { const x = {}; $$('[data-c]', tr).forEach(i => x[i.dataset.c] = i.value); return x; }).filter(x => Object.values(x).some(Boolean)));
    return Object.assign({}, def, o, { _at: new Date().toISOString() });
  }
  function form(file, fk, after) {
    const D = F[fk], val = file.data[fk] || {};
    const m = A.modal(`<div class="head" style="margin:0;padding-inline-end:44px"><div class="grow"><h3 style="margin:0">${D.ic} ${D.n}</h3><span class="small muted">${esc(D.sub)} · ${esc(file.name)}</span></div><button class="btn ghost sm" id="fmP">${A.I.print || ''} طباعة</button></div>
      <div id="fmB" style="margin-top:10px">${D.fs.map(f => fieldHtml(fk, f, val, f[1] === 'rows' ? f[4] : 0)).join('')}${fk === 'nomS' && val.scale ? `<div class="gf-calc"><b>نتيجة مقياس «سمات الموهبة» (البوصلة):</b> ${Object.entries(val.scale).map(([k, v]) => { const sc = window.DinaScales && DinaScales.view('gifted'); return `${esc(sc ? sc.dims[k][0] : k)} ${AR(v)}٪`; }).join(' · ')}</div>` : ''}</div>
      <div class="acts"><button class="btn" id="fmS">حفظ</button></div>`, { cls: 'wide' });
    const el = $('#fmB', m.el);
    const live = () => {
      if (fk === 'rating') { const d = { rating: collect(el, val) }, t = rateTot(d), rec = rateRec(t.s); $('#rtC', el).innerHTML = `المجموع: <b>${AR(t.s)}</b> من ${AR(56)} (${AR(t.n)}/١٤ بنداً) — <b style="color:${rec[1]}">${rec[0]}</b>`; }
      if (fk === 'torr') { /* الطلاقة تلقائية */ }
      if (fk === 'intv') { const s = ($('[data-k="stage"]', el) || {}).value || Object.keys(INTV)[0]; $('#intQ', el).innerHTML = `<b>أسئلة موجهة (${esc(s)}):</b><ol style="margin:6px 0 0;line-height:1.9">${INTV[s].map(q => `<li>${esc(q)}</li>`).join('')}</ol>`; }
      if (fk === 'dec') { const w = weighted(file.data); $('#decC', el).innerHTML = `<b>الدرجة المرجّحة (تُحسب من نماذج الملف):</b><table class="gf-rt" style="margin-top:6px"><tr><th>المكوّن</th><th>الدرجة</th><th>الوزن</th></tr>${[['rating', 'مقياس السمات السلوكية'], ['mawh', 'القدرات العقلية المتعددة'], ['torr', 'التفكير الإبداعي'], ['pi', 'ملف الإنجاز والمقابلة']].map(([k, n]) => { const p = w.parts.find(x => x[0] === k); return `<tr><td>${n}</td><td>${p ? AR(p[2]) + '٪' : '<span class="muted">لم يُعبّأ</span>'}</td><td>${AR(CFG().w[k])}٪</td></tr>`; }).join('')}</table><div style="margin-top:8px">الدرجة: <b style="font-size:20px">${w.total == null ? '—' : AR(w.total) + '٪'}</b> ${lvPill(w.lv)} ${w.complete ? '' : '<span class="small muted">(تُعاد موازنة الأوزان على المكونات المتاحة حتى يكتمل الملف)</span>'}</div>`; }
      if (fk === 'torr') { const t = torrScore({ torr: collect(el, val) }); let x = $('#trC', el); if (!x) { x = document.createElement('div'); x.className = 'gf-calc'; x.id = 'trC'; el.appendChild(x); } x.innerHTML = `الطلاقة: <b>${AR(t.flu)}</b> استجابة — الدرجة المدرسية المبسّطة: <b>${AR(t.v)}٪</b> <span class="small muted">(٢٥٪ لكل من الطلاقة حتى ٢٠، المرونة حتى ١٠، الأصالة حتى ٨، التفاصيل حتى ١٠)</span>`; }
    };
    el.addEventListener('input', live); el.addEventListener('change', live); live();
    el.addEventListener('click', e => { const a = e.target.closest('[data-add]'); if (a) { const fd = D.fs.find(x => x[0] === a.dataset.add); $(`[data-rows="${a.dataset.add}"] tbody`, el).insertAdjacentHTML('beforeend', rowHtml(fd[3], {})); } const d = e.target.closest('[data-delr]'); if (d) d.closest('tr').remove(); });
    $('#fmS', m.el).onclick = e => A.run(e.currentTarget, async () => { file.data[fk] = collect(el, val); if (fk === 'nomP' && !/parent/.test(file.source || '')) { file.source = [file.source, 'parent'].filter(Boolean).join(','); try { await api.upd('gifted_files', file.id, { source: file.source }); } catch (_) { } } await after(); m.close(); A.toast('حُفظ', 'ok'); });
    $('#fmP', m.el).onclick = () => A.printDoc(D.n, file.name + ' · ' + clsName(file.class_id), formPrint(fk, collect(el, val)), false);
  }
  function formPrint(fk, v) {
    const D = F[fk]; v = v || {};
    return D.fs.map(([id, ty, label, opts]) => {
      if (ty === 'info') { if (fk === 'intv' && id === 'qs') { const s = v.stage || Object.keys(INTV)[0]; return `<p><b>أسئلة موجهة:</b></p><ol>${INTV[s].map(q => `<li>${esc(q)}</li>`).join('')}</ol>`; } if (fk === 'dec' && id === 'calc') return ''; return label ? `<p>${esc(label)}</p>` : ''; }
      if (ty === 'ch') return `<p><b>${esc(label)}:</b> ${opts.map(o => `${(v[id] || []).includes(o) ? '☑' : '☐'} ${esc(o)}`).join('&nbsp;&nbsp; ')}</p>`;
      if (ty === 'r') { const sc = fk === 'rating' ? R4 : ['ضعيف', 'مقبول', 'جيد', 'متميز']; const r = v.r || {}; return `<table><tr><th>البند</th>${sc.map(s => `<th>${s}</th>`).join('')}</tr>${opts.map((g, gi) => `<tr><th colspan="${sc.length + 1}">${esc(g[0])}</th></tr>${g[1].map((it, i) => `<tr><td>${esc(it)}</td>${sc.map((_, x) => `<td style="text-align:center">${+r[gi + '-' + i] === x + 1 ? '●' : '○'}</td>`).join('')}</tr>`).join('')}`).join('')}</table>${fk === 'rating' ? `<p>المجموع: ${AR(rateTot({ rating: v }).s)} / ٥٦ — ${rateRec(rateTot({ rating: v }).s)[0]}</p>` : ''}`; }
      if (ty === 'rows') { const rows = (v[id] && v[id].length ? v[id] : Array.from({ length: 5 }, () => ({}))); return `<p><b>${esc(label)}</b></p><table><tr>${opts.map(c => `<th>${esc(c[1])}</th>`).join('')}</tr>${rows.map(r => `<tr>${opts.map(c => `<td>${esc(r[c[0]] || '')}&nbsp;</td>`).join('')}</tr>`).join('')}</table>`; }
      return `<p><b>${esc(label)}:</b> ${esc(v[id] || '') || '<span style="display:inline-block;min-width:60%;border-bottom:1px dotted #999">&nbsp;</span>'}</p>`;
    }).join('') + (fk === 'torr' && v.resp ? `<p>الطلاقة: ${AR(torrScore({ torr: v }).flu)} — الدرجة: ${AR(torrScore({ torr: v }).v)}٪</p>` : '') + '<p style="margin-top:24px">التوقيع: ....................................  التاريخ: ....................</p>';
  }
  function fullReport(f) {
    const d = f.data || {}, w = weighted(d), rt = rateTot(d);
    return `<table><tr><th>الطالب</th><td>${esc(f.name)}</td><th>الفصل</th><td>${esc(clsName(f.class_id))}</td></tr><tr><th>البوابة</th><td>${AR(gateOf(d))} — ${GATES[gateOf(d) - 1][1]}</td><th>التصنيف</th><td>${w.lv ? LEVELS[w.lv][0] : '—'} ${w.total != null ? '(' + AR(w.total) + '٪)' : ''}</td></tr></table>
      <h3>مكونات القرار</h3><table><tr><th>المكوّن</th><th>الدرجة</th><th>الوزن</th></tr>${w.parts.map(p => `<tr><td>${p[1]}</td><td>${AR(p[2])}٪</td><td>${AR(p[3])}٪</td></tr>`).join('') || '<tr><td colspan="3">لم تكتمل النماذج بعد</td></tr>'}</table>
      ${rt.n ? `<p>مقياس السمات السلوكية: ${AR(rt.s)} / ٥٦ — ${rateRec(rt.s)[0]}</p>` : ''}
      ${ORDER.filter(k => filled(d, k)).map(k => `<h3>${F[k].ic} ${F[k].n}</h3>${formPrint(k, d[k]).replace(/<p style="margin-top:24px">[\s\S]*$/, '')}`).join('')}
      <p style="margin-top:24px">منسق البرنامج: ....................   رئيس اللجنة: ....................   التاريخ: ....................</p>`;
  }

  function forms(B) {
    B.innerHTML = `<p class="small muted">النماذج والاستمارات والخطط معتمدة من برنامج المدرسة. اطبع النموذج فارغاً للتعبئة الورقية، أو افتح ملف الطالب لتعبئته إلكترونياً (يُحسب المجموع والتصنيف تلقائياً).</p>
      ${GATES.map((G, i) => `<div class="gf-gh"><span class="n">${G[0]}</span>${AR(i + 1)}. ${G[1]}</div><div class="gf-forms">${G[4].map(k => `<button class="gf-f" data-pf="${k}"><span class="ic" aria-hidden="true">${F[k].ic}</span><span><b>${F[k].n}</b><small>${F[k].sub} · طباعة فارغ</small></span></button>`).join('')}</div>`).join('')}
      <div class="gf-gh"><span class="n">⭐</span>أدوات مرتبطة</div><div class="gf-forms"><button class="gf-f" id="pfS"><span class="ic">🧭</span><span><b>مقياس «سمات الموهبة» للطالب</b><small>ترشيح ذاتي إلكتروني برابط/QR من البوصلة</small></span></button><button class="gf-f" id="pfAll"><span class="ic">🖨️</span><span><b>حزمة النماذج كاملة</b><small>طباعة كل النماذج فارغة</small></span></button></div>`;
    $$('[data-pf]', B).forEach(b => b.onclick = () => A.printDoc(F[b.dataset.pf].n, F[b.dataset.pf].sub + ' — الطالب: ........................ الفصل: ............', formPrint(b.dataset.pf, {}), false));
    $('#pfAll', B).onclick = () => A.printDoc('نماذج برنامج الكشف عن الموهوبين ورعايتهم', 'الطالب: ........................ الفصل: ............', ORDER.map(k => `<h2>${F[k].ic} ${F[k].n}</h2><p class="small">${esc(F[k].sub)}</p>${formPrint(k, {})}<div style="page-break-after:always"></div>`).join(''), false);
    $('#pfS', B).onclick = () => { location.hash = '#/compass'; };
  }

  async function dash(B) {
    B.innerHTML = '<div class="spinner"></div>'; const L = await load(); let nStu = 0; try { nStu = (await api.list('students', { school_id: S.school.id, active: true }, { select: 'id' })).length; } catch (_) { }
    const byG = [1, 2, 3, 4, 5].map(g => L.filter(f => (f.gate || 1) === g).length), byL = Object.keys(LEVELS).map(k => [k, L.filter(f => f.level === k).length]);
    const src = {}; L.forEach(f => String(f.source || '').split(',').filter(Boolean).forEach(s => src[s] = (src[s] || 0) + 1));
    const gifted = L.filter(f => f.level === 'g' || f.level === 'x').length, comp = L.filter(f => pct(f.data || {}) >= 70).length;
    const c = CFG();
    B.innerHTML = `<div class="gf-kpi">${[['ملفات الترشيح', AR(L.length), '#005499'], ['المصنفون موهوبين', AR(gifted), '#2E8B57'], ['نسبة الكشف', nStu ? AR(Math.round(gifted / nStu * 1000) / 10) + '٪' : '—', '#3AB1DB'], ['تنوع مصادر الترشيح', AR(Object.keys(src).length) + ' / ٤', '#C9A44C'], ['اكتمال الملفات (≥٧٠٪)', L.length ? AR(Math.round(comp / L.length * 100)) + '٪' : '—', '#AE95DA']].map(k => `<div style="--c:${k[2]}"><b>${k[1]}</b><span>${k[0]}</span></div>`).join('')}</div>
      <div class="grid g2" style="margin-top:12px;align-items:start"><div class="card" style="margin:0"><h3 style="margin-top:0">الطلاب عبر البوابات</h3>${GATES.map((g, i) => `<div style="display:grid;grid-template-columns:150px 1fr 30px;gap:8px;align-items:center;margin-bottom:6px"><span class="small"><b>${AR(i + 1)}.</b> ${g[1]}</span><div class="nf-meter"><i style="width:${L.length ? byG[i] / L.length * 100 : 0}%"></i></div><b>${AR(byG[i])}</b></div>`).join('')}</div>
        <div class="card" style="margin:0"><h3 style="margin-top:0">التصنيف ومصادر الترشيح</h3><p>${byL.map(([k, n]) => `${lvPill(k)} ${AR(n)}`).join('&nbsp;&nbsp; ')}</p><p>${Object.entries(SRC).map(([k, l]) => `<span class="pill">${l}: ${AR(src[k] || 0)}</span>`).join(' ')}</p></div></div>
      <div class="card" style="margin-top:12px"><h3 style="margin-top:0">إعدادات القرار (للمالك)</h3><div class="grid g2"><div class="field"><label>الأوزان ٪ (السمات، القدرات، الإبداع، الإنجاز والمقابلة)</label><div class="row" style="gap:6px">${['rating', 'mawh', 'torr', 'pi'].map(k => `<input class="in" type="number" data-w="${k}" value="${c.w[k]}" style="width:80px" aria-label="${k}">`).join('')}</div></div><div class="field"><label>حدود التصنيف (استثنائي، موهوب، واعد)</label><div class="row" style="gap:6px">${['x', 'g', 'p'].map(k => `<input class="in" type="number" data-cut="${k}" value="${c.cut[k]}" style="width:80px" aria-label="${LEVELS[k][0]}">`).join('')}</div></div></div>
        <div class="acts">${S.me.is_owner ? '<button class="btn ghost" id="gsS">حفظ الإعدادات</button>' : ''}<button class="btn ghost" id="gsX">Excel</button><button class="btn" id="gsP">${A.I.print || ''} تقرير البرنامج</button></div></div>`;
    if ($('#gsS', B)) $('#gsS', B).onclick = e => A.run(e.currentTarget, async () => { const g = { w: {}, cut: {} }; $$('[data-w]', B).forEach(i => g.w[i.dataset.w] = +i.value || 0); $$('[data-cut]', B).forEach(i => g.cut[i.dataset.cut] = +i.value || 0); const settings = { ...(S.school.settings || {}), gifted: g }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; A.toast('حُفظ', 'ok'); });
    $('#gsX', B).onclick = () => { if (!window.XLSX) return; const ws = XLSX.utils.json_to_sheet(L.map(f => { const w = weighted(f.data || {}); return { 'الطالب': f.name, 'الفصل': clsName(f.class_id), 'المصدر': String(f.source || '').split(',').map(x => SRC[x] || x).join('، '), 'البوابة': f.gate, 'اكتمال الملف ٪': pct(f.data || {}), 'السمات /٥٦': rateTot(f.data || {}).s, 'الدرجة المرجحة': w.total ?? '', 'التصنيف': w.lv ? LEVELS[w.lv][0] : '' }; })); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الموهوبون'); XLSX.writeFile(wb, 'رعاية الموهوبين.xlsx'); };
    $('#gsP', B).onclick = () => A.printDoc('تقرير برنامج رعاية الموهوبين', A.arDate ? A.arDate(new Date().toISOString().slice(0, 10)) : '', `<table><tr><th>ملفات الترشيح</th><th>المصنفون</th><th>نسبة الكشف</th><th>اكتمال الملفات</th></tr><tr><td>${AR(L.length)}</td><td>${AR(gifted)}</td><td>${nStu ? AR(Math.round(gifted / nStu * 1000) / 10) + '٪' : '—'}</td><td>${L.length ? AR(Math.round(comp / L.length * 100)) + '٪' : '—'}</td></tr></table><h3>الطلاب</h3><table><tr><th>الطالب</th><th>الفصل</th><th>البوابة</th><th>الدرجة</th><th>التصنيف</th></tr>${L.map(f => { const w = weighted(f.data || {}); return `<tr><td>${esc(f.name)}</td><td>${esc(clsName(f.class_id))}</td><td>${AR(f.gate || 1)}</td><td>${w.total == null ? '—' : AR(w.total) + '٪'}</td><td>${w.lv ? LEVELS[w.lv][0] : '—'}</td></tr>`; }).join('')}</table>`, true);
  }
})();
