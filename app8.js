/* منصة دينا — القائمة الجانبية وإعدادات المظهر، ومن يعمل على المنصة الآن */
(function () {
  const A = window.APP;
  const { api, S, $, $$, esc, AR } = A;

  // =====================================================================
  //  إعدادات المظهر (لكل مستخدم على جهازه)
  // =====================================================================
  const DEF = { nav: 'side', side: 'full', accent: 'section', density: 'cozy', scale: 'md', motion: 'on' };
  const get = () => { try { return { ...DEF, ...JSON.parse(localStorage.getItem('dina_ui') || '{}') }; } catch (_) { return { ...DEF }; } };
  const put = u => { try { localStorage.setItem('dina_ui', JSON.stringify(u)); } catch (_) { } apply(); };
  const ACCENTS = {
    dina: { n: 'سماوي دينا', v: {} },
    lavender: { n: 'بنفسجي (قسم البنات)', v: { '--sky': '#AE95DA', '--blue': '#6B4FA3', '--pale': '#EEEBF6', '--line': '#C4B5E3', '--mid': '#9B84CF', '--soft': '#B7A6DE', '--bg': '#F4F1FA' } },
    green: { n: 'أخضر دينا', v: { '--sky': '#8CC56A', '--blue': '#3F7D2A', '--pale': '#EEF6E6', '--line': '#BADF93', '--mid': '#7DB65A', '--soft': '#A5D27F', '--bg': '#F2F8EE' } },
    navy: { n: 'كحلي رسمي', v: { '--sky': '#5E9BD3', '--blue': '#082B5A', '--pale': '#E9EEF5', '--line': '#A9C1DE', '--bg': '#F1F4F8' } },
  };
  const css = document.createElement('style');
  css.textContent = `
  @media (min-width:761px){
    body.ui-side .nav{position:fixed;top:var(--toph,74px);inset-inline-start:0;bottom:0;z-index:25;width:248px;max-width:none;margin:0;padding:14px 12px 12px;flex-direction:column;gap:4px;overflow-y:auto;overflow-x:hidden;background:var(--card);border-inline-end:1px solid var(--border);box-shadow:var(--sh1);transition:width .2s ease}
    body.ui-side .nav a{background:none;border:0;border-radius:12px;padding:11px 12px;flex:none}
    body.ui-side .nav a:hover{background:var(--pale);color:var(--navy)}
    body.ui-side .nav a.on{background:var(--navy);color:#fff}
    body.ui-side .nav a svg{width:20px;height:20px;flex:none}
    body.ui-side .nav a .cnt{margin-inline-start:auto}
    body.ui-side main{max-width:none;margin-inline-start:248px;transition:margin .2s ease}
    body.ui-side .nav .sfoot{margin-top:auto;padding-top:10px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:4px}
    body.ui-side .nav .sfoot button{display:flex;align-items:center;gap:10px;border:0;background:none;color:var(--muted);font:inherit;font-weight:700;padding:10px 12px;border-radius:12px;cursor:pointer;text-align:start;white-space:nowrap}
    body.ui-side .nav .sfoot button:hover{background:var(--pale);color:var(--navy)}
    body.ui-side .nav .sfoot svg{width:20px;height:20px;flex:none}
    body.ui-side.side-icons .nav,body.ui-side.side-auto .nav{width:72px}
    body.ui-side.side-icons main,body.ui-side.side-auto main{margin-inline-start:72px}
    body.ui-side.side-icons .nav a span,body.ui-side.side-auto .nav a span,body.ui-side.side-icons .nav .sfoot span,body.ui-side.side-auto .nav .sfoot span{display:none}
    body.ui-side.side-icons .nav a,body.ui-side.side-auto .nav a,body.ui-side.side-icons .nav .sfoot button,body.ui-side.side-auto .nav .sfoot button{justify-content:center;padding:12px 0}
    body.ui-side.side-auto .nav:hover,body.ui-side.side-auto .nav:focus-within{width:248px;box-shadow:var(--sh3)}
    body.ui-side.side-auto .nav:hover a span,body.ui-side.side-auto .nav:focus-within a span,body.ui-side.side-auto .nav:hover .sfoot span,body.ui-side.side-auto .nav:focus-within .sfoot span{display:inline}
    body.ui-side.side-auto .nav:hover a,body.ui-side.side-auto .nav:focus-within a,body.ui-side.side-auto .nav:hover .sfoot button,body.ui-side.side-auto .nav:focus-within .sfoot button{justify-content:flex-start;padding:11px 12px}
    body.ui-side.side-hidden .nav{width:0;padding:0;border:0;overflow:hidden}
    body.ui-side.side-hidden main{margin-inline-start:0}
    .side-fab{display:none}
    body.ui-side.side-hidden .side-fab{display:grid;position:fixed;inset-inline-start:14px;bottom:18px;z-index:26;width:48px;height:48px;border-radius:50%;place-items:center;border:0;background:var(--navy);color:#fff;box-shadow:var(--sh3);cursor:pointer}
  }
  body:not(.ui-side) .nav .sfoot{display:flex;gap:8px;margin-inline-start:auto}
  body:not(.ui-side) .nav .sfoot button{display:flex;align-items:center;gap:6px;padding:10px 14px;border-radius:12px;border:1px solid var(--border);background:rgba(255,255,255,.6);color:var(--muted);font:inherit;font-weight:700;cursor:pointer;white-space:nowrap}
  body:not(.ui-side) .nav .sfoot svg{width:18px;height:18px}
  body:not(.ui-side) .nav .sfoot [data-sf=collapse]{display:none}
  body.ui-compact .card{padding:14px}body.ui-compact .tbl td,body.ui-compact .tbl th{padding-top:6px;padding-bottom:6px}body.ui-compact .kpi{padding:14px}
  body.fs-sm{zoom:.92}body.fs-lg{zoom:1.08}@media print{body{zoom:1!important}main{margin:0!important}.side-fab{display:none!important}}
  body.no-motion *,body.no-motion *::before,body.no-motion *::after{animation:none!important;transition:none!important}
  .ui-opt{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
  .ui-opt button{border:2px solid var(--border);background:var(--card);border-radius:14px;padding:10px;font:inherit;font-weight:700;color:var(--ink);cursor:pointer;text-align:center;min-height:44px}
  .ui-opt button.on{border-color:var(--navy);background:var(--pale)}
  .ui-opt .sw{display:block;height:10px;border-radius:6px;margin-bottom:6px}
  .online-btn{position:relative}.online-btn .dot{position:absolute;top:4px;inset-inline-end:4px;min-width:18px;height:18px;border-radius:9px;background:#2E8B57;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;padding:0 4px;border:2px solid var(--navy)}
  .who-row{display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid var(--border)}.who-row:last-child{border:0}
  .who-row .av{width:36px;height:36px;border-radius:50%;background:var(--pale);color:var(--navy);display:grid;place-items:center;font-weight:800;position:relative;flex:none}
  .who-row .av::after{content:"";position:absolute;bottom:0;inset-inline-end:0;width:11px;height:11px;border-radius:50%;background:#2E8B57;border:2px solid #fff}
  .who-row .grow{flex:1;min-width:0}`;
  document.head.appendChild(css);

  const sectionAccent = () => { const t = (A.section && A.section() || {}).theme; return t && ACCENTS[t] ? t : 'dina'; };
  function apply() {
    const u = get(), b = document.body; if (!b) return;
    b.classList.toggle('ui-side', u.nav === 'side');
    ['full', 'icons', 'auto', 'hidden'].forEach(k => b.classList.toggle('side-' + k, u.side === k));
    b.classList.toggle('ui-compact', u.density === 'compact');
    b.classList.toggle('fs-sm', u.scale === 'sm'); b.classList.toggle('fs-lg', u.scale === 'lg');
    b.classList.toggle('no-motion', u.motion === 'off');
    const acc = u.accent === 'section' ? sectionAccent() : u.accent;
    const root = document.documentElement.style;
    Object.values(ACCENTS).forEach(a => Object.keys(a.v).forEach(k => root.removeProperty(k)));
    Object.entries((ACCENTS[acc] || ACCENTS.dina).v).forEach(([k, v]) => root.setProperty(k, v));
    measure();
  }
  function measure() { const t = $('.top'); if (t) document.documentElement.style.setProperty('--toph', Math.max(0, Math.round(t.getBoundingClientRect().bottom)) + 'px'); }
  window.addEventListener('resize', measure); window.addEventListener('scroll', measure, { passive: true });

  const IC = {
    collapse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M15 4v16"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>',
    users: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
  };
  const NEXT = { full: 'icons', icons: 'auto', auto: 'hidden', hidden: 'full' };
  const SIDE_L = { full: 'مثبّتة كاملة', icons: 'أيقونات فقط', auto: 'تتوسّع عند المرور', hidden: 'مخفية' };
  // إضافة أزرار التحكم أسفل القائمة كلما أُعيد رسمها
  function decorateNav() {
    const nav = $('#nav'); if (!nav) return;
    $$('a', nav).forEach(a => { if (!a.title) a.title = (a.querySelector('span') || a).textContent.trim(); });
    if (!$('.sfoot', nav)) {
      const f = document.createElement('div'); f.className = 'sfoot';
      f.innerHTML = `<button data-sf="collapse" title="شكل القائمة: ${SIDE_L[get().side]}" aria-label="تغيير شكل القائمة الجانبية">${IC.collapse}<span>${SIDE_L[get().side]}</span></button><button data-sf="ui" title="إعدادات المظهر" aria-label="إعدادات المظهر">${IC.gear}<span>المظهر</span></button>`;
      nav.appendChild(f);
      f.querySelector('[data-sf=collapse]').onclick = () => { const u = get(); u.side = NEXT[u.side] || 'full'; put(u); nav.querySelector('.sfoot').remove(); decorateNav(); A.toast('القائمة: ' + SIDE_L[u.side] + (u.side === 'hidden' ? ' — أظهرها من الزر العائم' : '')); };
      f.querySelector('[data-sf=ui]').onclick = settings;
    }
    if (!$('.side-fab')) { const b = document.createElement('button'); b.className = 'side-fab'; b.setAttribute('aria-label', 'إظهار القائمة'); b.innerHTML = IC.menu; b.onclick = () => { const u = get(); u.side = 'full'; put(u); const s = $('#nav .sfoot'); if (s) s.remove(); decorateNav(); }; document.body.appendChild(b); }
  }
  const mo = new MutationObserver(() => decorateNav());
  function watchNav() { const nav = $('#nav'); if (nav && !nav.dataset.watch) { nav.dataset.watch = 1; mo.observe(nav, { childList: true }); decorateNav(); } }

  function settings() {
    const u = get();
    const grp = (k, opts) => `<div class="ui-opt" data-g="${k}">${opts.map(([v, l, sw]) => `<button data-v="${v}" class="${u[k] === v ? 'on' : ''}" aria-pressed="${u[k] === v}">${sw ? `<span class="sw" style="background:${sw}"></span>` : ''}${l}</button>`).join('')}</div>`;
    const m = A.modal(`<h3>إعدادات المظهر</h3><p class="small muted" style="margin-top:-4px">تُحفظ على هذا الجهاز لحسابك، ولا تؤثر على الآخرين أو على ملفات التصدير.</p>
      <div class="field"><label>مكان القائمة</label>${grp('nav', [['side', 'جانبية'], ['top', 'علوية']])}</div>
      <div class="field"><label>شكل القائمة الجانبية</label>${grp('side', Object.entries(SIDE_L))}</div>
      <div class="field"><label>ألوان الواجهة (من هوية دينا)</label>${grp('accent', [['section', 'حسب القسم', 'linear-gradient(90deg,#3AB1DB,#AE95DA)'], ...Object.entries(ACCENTS).map(([k, a]) => [k, a.n, a.v['--sky'] || '#3AB1DB'])])}</div>
      <div class="field"><label>الكثافة</label>${grp('density', [['cozy', 'مريحة'], ['compact', 'مضغوطة']])}</div>
      <div class="field"><label>حجم الخط</label>${grp('scale', [['sm', 'صغير'], ['md', 'متوسط'], ['lg', 'كبير']])}</div>
      <div class="field"><label>الحركة</label>${grp('motion', [['on', 'مفعّلة'], ['off', 'بدون حركة']])}</div>
      <div class="acts"><button class="btn ghost" id="uiR">استعادة الافتراضي</button><button class="btn" id="uiD">تم</button></div>`);
    $$('[data-g]', m.el).forEach(g => $$('button', g).forEach(b => b.onclick = () => {
      const x = get(); x[g.dataset.g] = b.dataset.v; put(x);
      $$('button', g).forEach(y => { y.classList.toggle('on', y === b); y.setAttribute('aria-pressed', y === b); });
      const s = $('#nav .sfoot'); if (s) s.remove(); decorateNav();
    }));
    m.el.querySelector('#uiR').onclick = () => { put({ ...DEF }); m.close(); const s = $('#nav .sfoot'); if (s) s.remove(); decorateNav(); };
    m.el.querySelector('#uiD').onclick = () => m.close();
  }
  A.uiSettings = settings;
  // متاحة أيضاً من قائمة الحساب (مهمة على الجوال حيث القائمة السفلية)
  document.addEventListener('click', e => { if (!e.target.closest('#ub')) return; setTimeout(() => { const m = $('.menu'); if (!m || $('[data-uiset]', m)) return; const b = document.createElement('button'); b.dataset.uiset = 1; b.textContent = 'إعدادات المظهر'; b.onclick = () => { m.remove(); settings(); }; const who = $('.who', m); who ? who.after(b) : m.prepend(b); }, 0); }, true);

  // =====================================================================
  //  من يعمل على المنصة الآن
  // =====================================================================
  const PAGE = { my: 'خطتي', dash: 'لوحة المتابعة', classes: 'خطط الفصول', export: 'التصدير', timetable: 'الجدول الدراسي', weeks: 'الأسابيع', nisab: 'احتساب النصاب', builder: 'الجدول الآلي', admin: 'الإدارة', reports: 'التقارير', archive: 'الأرشيف', dev: 'لوحة المطوّر' };
  let pres = null, online = {}, presKey = null;
  const canSee = () => S.me.is_owner || A.perm('users') || A.perm('review');
  const meta = () => ({ staff_id: (S.realMe || S.me).id, name: (S.realMe || S.me).full_name, view: S.view || '', section: S.sectionId, at: pres && pres.since || new Date().toISOString() });
  function startPresence() {
    const me = S.realMe || S.me; if (!me || !S.school) return;
    if (pres && presKey === me.id) { pres.update(meta()); return; }
    if (pres) pres.stop();
    presKey = me.id; const since = new Date().toISOString();
    pres = api.presence('online-' + S.school.id, me.id, { ...meta(), at: since }, st => { online = st; badge(); const l = $('#whoL'); if (l) l.innerHTML = list(); });
    pres.since = since;
  }
  const people = () => Object.values(online).map(a => a[0]).filter(Boolean).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
  function badge() { const d = $('#onlineN'); if (d) { const n = people().length; d.textContent = AR(n); d.hidden = !n; } }
  const mins = iso => { const m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000)); return m < 1 ? 'الآن' : m < 60 ? `منذ ${AR(m)} د` : `منذ ${AR(Math.floor(m / 60))} س`; };
  function list() {
    const me = (S.realMe || S.me).id;
    return people().map(p => { const sec = (S.sections.find(s => s.id === p.section) || {}).short_name || ''; return `<div class="who-row"><span class="av">${esc((p.name || '؟').replace(/^(أ\.|Ms\.|Mr\.|د\.)\s*/, '')[0] || '؟')}</span><div class="grow"><b>${esc(p.name || '')}${p.staff_id === me ? ' <span class="small muted">(أنت)</span>' : ''}</b><div class="small muted">${esc(PAGE[p.view] || 'المنصة')}${sec ? ' · ' + esc(sec) : ''} · دخل ${mins(p.at)}</div></div>${p.staff_id !== me && A.compose ? `<button class="btn ghost sm" data-msg="${p.staff_id}">مراسلة</button>` : ''}</div>`; }).join('') || A.emptyBox('لا أحد متصل الآن');
  }
  function whoDialog() {
    const m = A.modal(`<h3>${IC.users} يعمل على المنصة الآن</h3><div id="whoL">${list()}</div><p class="small faint" style="margin:8px 0 0">تتحدّث القائمة لحظياً.</p>`);
    m.el.addEventListener('click', e => { const b = e.target.closest('[data-msg]'); if (b) { m.close(); A.compose([b.dataset.msg]); } });
  }
  function addOnlineBtn() {
    if (!canSee() || $('#onlineBtn')) return; const ib = $('#inboxBtn'); if (!ib) return;
    const b = document.createElement('button'); b.className = 'userbtn icon-only online-btn'; b.id = 'onlineBtn'; b.setAttribute('aria-label', 'من يعمل الآن'); b.title = 'من يعمل على المنصة الآن';
    b.innerHTML = IC.users + '<span class="dot" id="onlineN" hidden></span>'; b.onclick = whoDialog; ib.before(b); badge();
  }

  // ---- انتهاء الجلسة (مثلاً بعد تغيير كلمة المرور من جهاز آخر): العودة لشاشة الدخول بدل أخطاء الصلاحية
  if (api.onAuth && !api.demo) api.onAuth(ev => { if (ev === 'SIGNED_OUT' && S.me) { A.toast('انتهت جلستك — سجّل الدخول من جديد', 'err'); setTimeout(() => location.reload(), 1500); } });
  // ---- الربط بعد رسم الواجهة
  const after0 = window.APP_AFTER_SHELL;
  window.APP_AFTER_SHELL = () => { if (after0) after0(); apply(); watchNav(); addOnlineBtn(); startPresence(); };
  window.addEventListener('hashchange', () => setTimeout(() => { if (pres && S.me) pres.update(meta()); }, 50));
  apply();
})();
