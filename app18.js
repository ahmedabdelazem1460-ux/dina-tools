/* منصة دينا — الصفحة الرئيسية التفاعلية
   تُفتح بالضغط على شعار المدرسة أعلى أي صفحة. تعرض بطاقات لكل مزايا المنصة المتاحة لحسابك فقط، مع مؤشرات حيّة وبحث. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, $, $$, esc, AR, I } = A;
  A.I.home = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>';
  const GROUPS = [
    ['التخطيط والمتابعة', ['my', 'classes', 'dash', 'export', 'weeks', 'reports']],
    ['الجداول والأنصبة', ['studio', 'timetable', 'nisab', 'plan', 'builder']],
    ['التقويم والتعلّم', ['assess', 'paper', 'analysis', 'records', 'resources']],
    ['الطلاب والإشراف', ['attendance', 'supervision', 'myreports', 'posts']],
    ['الإدارة', ['admin', 'roles', 'activity', 'archive', 'dev']],
  ];
  const DESC = {
    my: 'أدخل خطتك الأسبوعية لكل حصة وأرسلها للمراجعة.', classes: 'خطة كل فصل أسبوعياً مع الاعتماد والإرجاع والمعاينة.', dash: 'نسب الإنجاز والإرسال والاعتماد لكل فصل ومعلم.', export: 'ملفات PDF وWord للخطة بهوية دينا.', weeks: 'الأسابيع والمواعيد والإجازات.', reports: 'تقارير الالتزام والإنجاز والتنفيذ والتعديلات.',
    studio: 'استوديو الجداول: النصاب والتوزيع والتوليد والاعتماد في مكان واحد.', timetable: 'الجدول المعتمد لكل قسم وإسناد المعلمين.', nisab: 'احتساب النصاب واحتياج المعلمين.', plan: 'توزيع الحصص بقيود مرنة وتوليد آلي.', builder: 'بناء الجدول آلياً.',
    assess: 'بنك الأسئلة والاختبارات الإلكترونية والتحليل والخطط العلاجية.', paper: 'اختبارات ورقية بأوراق تظليل وتصحيح آلي وتحليل ومشاركة.', analysis: 'تحليل نتائج الاختبارات.', records: 'سجل متابعة الطلاب بغلاف دينا وحفظ سحابي.', resources: 'مكتبة المصادر وأوراق العمل وروابط Drive.',
    attendance: 'الحضور والسلوك والإحالات.', supervision: 'نماذج الإشراف التربوي والزيارات والتقارير.', myreports: 'تقارير الإشراف الموجهة إليك.', posts: 'إعلانات أولياء الأمور.',
    admin: 'المدرسة والأقسام والفصول والمواد والموظفون.', roles: 'المسميات وحزم الصلاحيات وإظهار البنود.', activity: 'مرات الدخول وتوقيت الإدخال — لك وحدك.', archive: 'الأسابيع المؤرشفة.', dev: 'أدوات المالك المتقدمة.',
  };
  const navItems = () => A.NAV.filter(A.navOK).map(n => [n[0], n[1]]).filter(([k]) => k !== 'home');
  const hello = () => { const h = new Date().getHours(); return h < 12 ? 'صباح الخير' : 'مساء الخير'; };

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
    const groups = GROUPS.map(([g, ks]) => [g, ks.filter(k => have.has(k))]).filter(([, ks]) => ks.length);
    const other = items.filter(([k]) => !GROUPS.some(([, ks]) => ks.includes(k)));
    if (other.length) groups.push(['المزيد', other.map(([k]) => k)]);
    root.innerHTML = `<section class="hm-hero"><div class="hm-hero-in"><div><p class="hm-hi">${hello()}، ${esc(S.me.full_name)}</p><h1>منصة دينا للتخطيط الدراسي</h1><p class="hm-sub">${esc(S.school.name)} · ${esc(A.section().name)}${w ? ' · الأسبوع ' + esc(w.word) : ''}</p></div>
        <img src="assets/logo_white.svg" alt="" class="hm-logo"></div>
        <div class="hm-kpis">${kpis.map(([l, v, d, go]) => `<button class="hm-kpi" data-go="${go}"><span class="hm-kl">${l}</span><b>${v}</b><span class="hm-kd">${d}</span></button>`).join('')}</div></section>
      <div class="hm-tools"><input class="in" id="hmQ" type="search" placeholder="ابحث عن ميزة… (مثال: جدول، اختبار، تقرير)" aria-label="بحث في مزايا المنصة"><span class="small muted" id="hmN"></span></div>
      <div id="hmG">${groups.map(([g, ks]) => `<section class="hm-grp"><h2>${g}</h2><div class="hm-grid">${ks.map(k => `<a class="hm-card" href="#/${k}" data-k="${k}" data-s="${esc(have.get(k) + ' ' + (DESC[k] || ''))}"><span class="hm-ic">${I[k] || I.home}</span><b>${esc(have.get(k))}</b><span class="hm-d">${esc(DESC[k] || '')}</span><span class="hm-go" aria-hidden="true">←</span></a>`).join('')}</div></section>`).join('')}</div>`;
    $$('.hm-kpi', root).forEach(b => b.onclick = () => { if (b.dataset.go === 'inbox') { const ib = $('#inboxBtn'); if (ib) ib.click(); } else location.hash = '#/' + b.dataset.go; });
    const q = $('#hmQ', root), n = $('#hmN', root);
    q.oninput = () => { const t = A.normKey(q.value || ''); let c = 0; $$('.hm-card', root).forEach(a => { const ok = !t || A.normKey(a.dataset.s).includes(t); a.hidden = !ok; if (ok) c++; }); $$('.hm-grp', root).forEach(s => s.hidden = !$$('.hm-card:not([hidden])', s).length); n.textContent = t ? `${AR(c)} نتيجة` : ''; };
    // ميلان ثلاثي الأبعاد خفيف (يُعطَّل مع تقليل الحركة)
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) $$('.hm-card', root).forEach(c => { c.onpointermove = e => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; c.style.transform = `perspective(700px) rotateX(${-y * 6}deg) rotateY(${x * 8}deg) translateY(-3px)`; }; c.onpointerleave = () => { c.style.transform = ''; }; });
  };

  // الشعار أعلى الصفحة يفتح الرئيسية
  const bindLogo = () => { const lg = document.querySelector('header.top .logo'); if (!lg || lg.closest('a')) return; const a = document.createElement('a'); a.href = '#/home'; a.className = 'logo-link'; a.setAttribute('aria-label', 'الصفحة الرئيسية'); a.title = 'الصفحة الرئيسية'; lg.replaceWith(a); a.appendChild(lg); };
  const app = document.getElementById('app'); if (app) new MutationObserver(bindLogo).observe(app, { childList: true });
})();
