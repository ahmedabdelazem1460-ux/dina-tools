/* منصة دينا — الصفحة الرئيسية التفاعلية
   تُفتح بالضغط على شعار المدرسة أعلى أي صفحة. تعرض بطاقات لكل مزايا المنصة المتاحة لحسابك فقط، مع مؤشرات حيّة وبحث. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, $, $$, esc, AR, I } = A;
  A.I.home = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>';
  // ترتيب منطقي: من عمل المعلم اليومي إلى أدوات الصف ثم التقويم ثم الطلاب، وأدوات القيادة والإدارة آخراً — مع لون لكل مجموعة
  const GROUPS = [
    ['عملي اليومي', ['my', 'prep', 'assistant', 'records', 'hwf', 'myforms', 'myreports'], '#3AB1DB', '#005499', '🗓️'],
    ['داخل الصف', ['slides', 'poll', 'wboard', 'games', 'labs', 'resources'], '#5BC48A', '#2E8B57', '🍎'],
    ['الاختبارات والتقويم', ['assess', 'qbank', 'paper', 'analysis', 'noor'], '#C2AEEB', '#7E62C2', '✅'],
    ['الطلاب والرعاية', ['refer', 'attendance', 'compass', 'gifted', 'counsel', 'deputy', 'stucodes'], '#F2C66D', '#C98A12', '🧑‍🎓'],
    ['التواصل', ['notify', 'x_notif', 'x_app', 'posts', 'board'], '#84B7E3', '#082B5A', '💬'],
    ['المتابعة والتخطيط', ['dash', 'classes', 'export', 'weeks', 'reports'], '#5E9BD3', '#082B5A', '📈'],
    ['الجداول والأنصبة', ['studio', 'timetable', 'nisab', 'plan', 'builder'], '#3AB1DB', '#0B3F8A', '🧩'],
    ['الإشراف والموارد البشرية', ['supervision', 'forms', 'duty', 'hr'], '#F09A8E', '#D0564A', '📋'],
    ['الإدارة', ['admin', 'roles', 'tui', 'testt', 'activity', 'archive', 'trash', 'dev'], '#9AA9BC', '#40526A', '⚙️'],
  ];
  A.HOME_GROUPS = GROUPS;
  const DESC = {
    hwf: 'متابعة الواجبات: الحِمل اليومي لكل فصل، وواجبات كل معلم وأنواعها، والواجبات الإلكترونية وتسليماتها.',
    my: 'أدخل خطتك الأسبوعية لكل حصة وأرسلها للمراجعة.', classes: 'خطة كل فصل أسبوعياً مع الاعتماد والإرجاع والمعاينة.', dash: 'نسب الإنجاز والإرسال والاعتماد لكل فصل ومعلم.', export: 'ملفات PDF وWord للخطة بهوية دينا.', weeks: 'الأسابيع والمواعيد والإجازات.', reports: 'تقارير الالتزام والإنجاز والتنفيذ والتعديلات.',
    studio: 'استوديو الجداول: النصاب والتوزيع والتوليد والاعتماد في مكان واحد.', timetable: 'الجدول المعتمد لكل قسم وإسناد المعلمين.', nisab: 'احتساب النصاب واحتياج المعلمين.', plan: 'توزيع الحصص بقيود مرنة وتوليد آلي.', builder: 'بناء الجدول آلياً.',
    prep: 'تحضير الدروس بالمولّد الآلي، ومكتبة المدرسة، والإدراج في الخطة.', assess: 'الاختبارات الورقية والإلكترونية: أوراق تظليل وتصحيح آلي، بنك أسئلة، تحليل ولجان وخطط علاجية.', paper: 'اختبارات ورقية بأوراق تظليل وتصحيح آلي وتحليل ومشاركة.', analysis: 'تحليل نتائج الاختبارات.', records: 'سجل متابعة الطلاب بغلاف دينا وحفظ سحابي.', resources: 'مكتبة المصادر وأوراق العمل وروابط Drive.',
    board: 'شاشة المدرسة اليومية والمتابعة اللحظية.', labs: 'محاكيات علمية ورياضية تفاعلية مصنفة بالمادة والمرحلة.', wboard: 'سبورة رسم وكتابة وصفحات للعرض على السبورة الذكية.', games: 'مسابقة مباشرة برمز يجيب فيها الطلاب من جوالاتهم، وألعاب ذاتية (بطاقات، مطابقة، تحدٍّ، صح أم خطأ، عجلة) من بنك الأسئلة.', stucodes: 'رموز دخول الطلاب إلى «حسابي»: خطة الفصل والاختبارات والنتائج، مع بطاقات QR وإرسال واتساب.', duty: 'جداول الإشراف والمناوبة المرتبطة بالجدول الزمني، والتوزيع العادل، والمتابعة اللحظية للتواجد.', attendance: 'الحضور والسلوك والإحالات.', supervision: 'نماذج الإشراف التربوي والزيارات والتقارير.', myreports: 'تقارير الإشراف الموجهة إليك.', posts: 'إعلانات أولياء الأمور.',
    assistant: 'جهّز درسك تلقائياً: أهداف، سير الحصة، أنشطة، أسئلة، واجب وتمايز.', myforms: 'نماذج عملك الخاصة بهوية المدرسة: إنشاء وتعبئة وترتيب.', qbank: 'كل أسئلة المدرسة في بنك واحد مع التصدير والإتاحة.', noor: 'تحليل درجات نور ومقارنة الفصول والمواد.',
    slides: 'حوّل الدرس أو البنك أو الملف إلى عرض احترافي بهوية دينا.', poll: 'سؤال يجيب عنه الطلاب من جوالاتهم برمز، ونتائج لحظية.', compass: 'مقاييس تربوية للطلاب وتقارير وتوصيات لكل طالب وفصل.', gifted: 'الكشف عن الموهوبين وترشيحهم ورعايتهم.',
    refer: 'أحِل طالباً للإرشاد أو الوكيل بخطوات بسيطة.', counsel: 'ملفات الإرشاد الطلابي والإحالات والمتابعة.', deputy: 'إحالات الوكيل والإجراءات.', hr: 'حضور الموظفين بالموقع ورمز QR والمساءلات.', forms: 'النماذج والاستمارات بالتوقيع الإلكتروني.',
    notify: 'مركز الإشعارات: إصدار التنبيهات ومتابعتها.', x_notif: 'تنبيهاتك: النماذج المطلوبة، حصص الانتظار، الرسائل والإعلانات.', x_app: 'ثبّت المنصة على جوالك كتطبيق: أندرويد وآيفون.', qx: '',
    admin: 'المدرسة والأقسام والفصول والمواد والموظفون.', trash: 'كل ما حُذف — استعادة أو حذف نهائي.', testt: 'معلم وفصل تجريبيان لا يراهما غيرك، لتجربة الأداء والإسناد دون التأثير على التقارير.', tui: 'ما يظهر للمعلمين في صفحتهم والقائمة، وإخفاء التحضير من حساب المالك.', roles: 'المسميات وحزم الصلاحيات وإظهار البنود.', activity: 'مرات الدخول وتوقيت الإدخال — لك وحدك.', archive: 'الأسابيع المؤرشفة.', dev: 'أدوات المالك المتقدمة.',
  };
  const ACT = {
    x_notif: ['الإشعارات', () => A.tfeat && A.tfeat('notif') && A.notifPanel && !A.navOK(A.NAV.find(n => n[0] === 'notify') || ['', '', () => false]), () => A.notifPanel(), 'bell'],
    x_app: ['تطبيق الجوال', () => A.tfeat && A.tfeat('app') && A.appDialog, () => A.appDialog(), 'phone'],
  };
  A.HOME_ACT = ACT;
  const PHONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>';
  const BELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
  A.HOME_ICO = k => k === 'x_app' ? PHONE : k === 'x_notif' ? (I.notify || BELL) : (I[k] || I.home);
  const navItems = () => [...A.NAV.filter(A.navOK).map(n => [n[0], n[1]]).filter(([k]) => k !== 'home'), ...Object.entries(ACT).filter(([, a]) => { try { return a[1](); } catch (_) { return false; } }).map(([k, a]) => [k, a[0]])];
  const hello = () => { const h = new Date().getHours(); return h < 12 ? 'صباح الخير' : 'مساء الخير'; };

  if (!document.getElementById('hm2css')) { const st = document.createElement('style'); st.id = 'hm2css'; st.textContent = `
.hm-grp h2{display:flex;align-items:center;gap:8px}
.hm-ge{width:30px;height:30px;border-radius:10px;display:grid;place-items:center;font-size:16px;background:linear-gradient(145deg,var(--ga),var(--gb));box-shadow:0 6px 12px -6px var(--gb)}
.hm-gn{font-size:12px;font-weight:800;color:var(--gb);background:#fff;border:1px solid #e3eaf3;border-radius:20px;padding:0 8px;margin-inline-start:2px}
.hm-grp .hm-ic{background:linear-gradient(145deg,var(--ga),var(--gb));box-shadow:0 8px 16px -8px var(--gb);position:relative;overflow:hidden}
.hm-grp .hm-ic::before{content:"";position:absolute;inset:2px 2px 52% 2px;border-radius:10px 10px 40% 40%;background:linear-gradient(180deg,rgba(255,255,255,.4),rgba(255,255,255,0))}
.hm-grp .hm-card{border-top:3px solid var(--ga)}
.hm-grp .hm-card:focus-visible{outline:3px solid var(--ga);outline-offset:2px}
@media (max-width:600px){.hm-grp .hm-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.hm-grp .hm-card{padding:12px 10px;align-items:center;text-align:center}.hm-grp .hm-card b{font-size:14px}.hm-grp .hm-d{display:none}.hm-grp .hm-go{display:none}}
@media (prefers-reduced-motion:reduce){.hm-grp .hm-card{transition:none}}`; document.head.appendChild(st); }
  V.home = function (root) {
    const items = navItems(), have = new Map(items), w = A.week();
    const mine = S.entries.filter(e => e.teacher_id === S.me.id && A.required(e)), myDone = mine.filter(A.filled).length;
    const all = S.entries.filter(A.required), allDone = all.filter(A.filled).length;
    const toReview = S.entries.filter(e => e.status === 'submitted').length;
    const unread = +((document.querySelector('#inboxN') || {}).textContent || '0').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) || 0;
    const kpis = [
      mine.length ? ['خطتي هذا الأسبوع', `${AR(A.pct(myDone, mine.length))}٪`, `${AR(myDone)} من ${AR(mine.length)} حصة`, 'my'] : null,
      have.has('dash') ? ['إنجاز القسم', `${AR(A.pct(allDone, all.length))}٪`, `${AR(allDone)} من ${AR(all.length)}`, 'dash'] : null,
      have.has('classes') && A.anyPerm('review') ? ['بانتظار المراجعة', AR(toReview), 'حصة مُرسلة', 'classes'] : null,
      ['الرسائل', AR(unread), unread ? 'غير مقروءة' : 'لا جديد', 'inbox'],
    ].filter(Boolean);
    const groups = GROUPS.map(([g, ks, ca, cb, em]) => [g, ks.filter(k => have.has(k)), ca, cb, em]).filter(([, ks]) => ks.length);
    const other = items.filter(([k]) => !GROUPS.some(([, ks]) => ks.includes(k)));
    if (other.length) groups.push(['المزيد', other.map(([k]) => k), '#3AB1DB', '#005499', '✨']);
    root.innerHTML = `<section class="hm-hero"><div class="hm-hero-in"><div><p class="hm-hi">${hello()}، ${esc(S.me.full_name)}</p><h1>منصة دينا للتخطيط الدراسي</h1><p class="hm-sub">${esc(S.school.name)} · ${esc(A.section().name)}${w ? ' · الأسبوع ' + esc(w.word) : ''}</p></div>
        <img src="assets/logo_white.svg" alt="" class="hm-logo"></div>
        <div class="hm-kpis">${kpis.map(([l, v, d, go]) => `<button class="hm-kpi" data-go="${go}"><span class="hm-kl">${l}</span><b>${v}</b><span class="hm-kd">${d}</span></button>`).join('')}</div></section>
      <div class="hm-tools"><input class="in" id="hmQ" type="search" placeholder="ابحث عن ميزة… (مثال: جدول، اختبار، تقرير)" aria-label="بحث في مزايا المنصة"><span class="small muted" id="hmN"></span></div>
      <div id="hmG">${groups.map(([g, ks, ca, cb, em]) => `<section class="hm-grp" style="--ga:${ca};--gb:${cb}"><h2><span class="hm-ge" aria-hidden="true">${em}</span>${g}<span class="hm-gn">${AR(ks.length)}</span></h2><div class="hm-grid">${ks.map(k => `<a class="hm-card" href="${ACT[k] ? '#/home' : '#/' + k}" ${ACT[k] ? `data-act="${k}" role="button"` : ''} data-k="${k}" data-s="${esc(have.get(k) + ' ' + (DESC[k] || ''))}"><span class="hm-ic">${A.HOME_ICO(k)}</span><b>${esc(have.get(k))}</b><span class="hm-d">${esc(DESC[k] || '')}</span><span class="hm-go" aria-hidden="true">←</span></a>`).join('')}</div></section>`).join('')}</div>`;
    $$('.hm-kpi', root).forEach(b => b.onclick = () => { if (b.dataset.go === 'inbox') { const ib = $('#inboxBtn'); if (ib) ib.click(); } else location.hash = '#/' + b.dataset.go; });
    $$('[data-act]', root).forEach(a => a.onclick = e => { e.preventDefault(); ACT[a.dataset.act][2](); });
    const q = $('#hmQ', root), n = $('#hmN', root);
    q.oninput = () => { const t = A.normKey(q.value || ''); let c = 0; $$('.hm-card', root).forEach(a => { const ok = !t || A.normKey(a.dataset.s).includes(t); a.hidden = !ok; if (ok) c++; }); $$('.hm-grp', root).forEach(s => s.hidden = !$$('.hm-card:not([hidden])', s).length); n.textContent = t ? `${AR(c)} نتيجة` : ''; };
    // ميلان ثلاثي الأبعاد خفيف (يُعطَّل مع تقليل الحركة)
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) $$('.hm-card', root).forEach(c => { c.onpointermove = e => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; c.style.transform = `perspective(700px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg) translateY(-3px)`; }; c.onpointerleave = () => { c.style.transform = ''; }; });
  };

  // الشعار أعلى الصفحة يفتح الرئيسية
  const bindLogo = () => { const lg = document.querySelector('header.top .logo'); if (!lg || lg.closest('a')) return; const a = document.createElement('a'); a.href = '#/home'; a.className = 'logo-link'; a.setAttribute('aria-label', 'الصفحة الرئيسية'); a.title = 'الصفحة الرئيسية'; lg.replaceWith(a); a.appendChild(lg); };
  const app = document.getElementById('app'); if (app) new MutationObserver(bindLogo).observe(app, { childList: true });
})();
