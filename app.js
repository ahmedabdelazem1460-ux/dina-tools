/* منصة الخطة الأسبوعية — مدارس دينا العالمية
   الأساس: الحالة، الدخول، التنقل، بوابة المعلم، لوحة المتابعة، الفصول */
(function () {
  const cfg = window.APP_CONFIG || {};
  const DEMO = /[?&]demo=1/.test(location.search) || !cfg.supabaseUrl;
  const api = DEMO ? makeDemoApi() : makeApi(cfg);

  // ---------- أدوات ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // الأرقام العربية + التواريخ من اليمين لليسار (اليوم يميناً ثم الشهر ثم السنة)
  const RTLD = m => '\u200F' + m.split('/').join('\u200F/\u200F'); // تاريخ يُقرأ من اليمين: اليوم ثم الشهر ثم السنة
  const AR = s => String(s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]).replace(/[٠-٩]{1,2}\/[٠-٩]{1,2}\/[٠-٩]{4}/g, RTLD);
  const DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const PER = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة', 'الحادية عشرة', 'الثانية عشرة'];
  const ORD = ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر', 'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون', 'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون'];
  const STATUS = { empty: 'لم تُعبّأ', draft: 'مسودة', submitted: 'مُرسلة', returned: 'مُعادة للتعديل', approved: 'معتمدة' };
  const WSTATUS = { open: 'مفتوح للإدخال', locked: 'مقفل', published: 'منشور' };
  const ROLES = { admin: 'مدير القسم', supervisor: 'مشرف', teacher: 'معلم' };
  const PERMS = [['can_manage_users', 'إدارة الحسابات والصلاحيات'], ['can_manage_structure', 'الفصول والمواد والأسابيع'], ['can_edit_timetable', 'تعديل الجدول وإسناد المعلمين'], ['can_approve_timetable', 'اعتماد الجدول'], ['can_review_plans', 'مراجعة الخطط واعتمادها'], ['can_export', 'التصدير']];
  const PKEY = { users: 'can_manage_users', structure: 'can_manage_structure', timetable_edit: 'can_edit_timetable', timetable_approve: 'can_approve_timetable', review: 'can_review_plans', export: 'can_export', nisab: 'can_use_nisab', tt_builder: 'can_use_tt_builder', exec_confirm: 'can_confirm_exec' };
  const TOOL_PERMS = [['can_use_nisab', 'احتساب النصاب'], ['can_use_tt_builder', 'الجدول الآلي'], ['can_confirm_exec', 'التأكيد اليومي نيابةً عن المعلمين']];
  const TOOL_KEYS = ['nisab', 'tt_builder', 'exec_confirm'];
  const ROLE_DEFAULTS = { admin: {}, supervisor: { can_review_plans: true, can_export: true }, teacher: {} };

  const parseDate = s => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const isoDate = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dmy = d => `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  const weekDates = (w, n = 5) => { const s = parseDate(w.start_date); return Array.from({ length: n }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return dmy(d); }); };
  const fmtDT = s => { if (!s) return '—'; const d = new Date(s); return RTLD(AR(`${d.getDate()}/${d.getMonth() + 1}`)) + AR(` — ${d.toLocaleTimeString('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit' })}`); };
  const pct = (a, b) => b ? Math.round(100 * a / b) : 0;
  const norm = s => String(s ?? '').replace(/[_ـ]/g, ' ').replace(/\s+/g, ' ').trim();
  const normKey = s => norm(s).replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/^ال/, '').replace(/ ال/g, ' ').toLowerCase();
  const genPass = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; let s = ''; const r = crypto.getRandomValues(new Uint32Array(8)); r.forEach(x => s += a[x % a.length]); return 'Dina-' + s; };
  const cnt = (n, one, many) => AR(n) + ' ' + ((n % 100 >= 3 && n % 100 <= 10) ? many : one);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  const I = {
    my: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5V5a2 2 0 0 1 2-2h12v16H6.5A2.5 2.5 0 0 0 4 21.5"/><path d="M8 7h6M8 11h8"/></svg>',
    dash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
    classes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
    export: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M12 18v-6M9 15l3 3 3-3"/></svg>',
    timetable: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M9 13h2M13 13h2M9 17h2"/></svg>',
    weeks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M17 11l1.5 1.5L21.5 9"/></svg>',
    nisab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M8 16h2M12 16h2"/></svg>',
    builder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v11M15 10v11"/><path d="M8 2v4M16 2v4"/></svg>',
    posts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    archive: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10h14V9M10 13h4"/></svg>',
    dev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9M7 14l5-5 5 5M4 3h16"/></svg>',
    print: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/></svg>',
    undo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5c3-1 6-1 10 2 4-3 7-3 10-2v14c-3-1-6-1-10 2-4-3-7-3-10-2z"/><path d="M12 7v14"/></svg>',
  };

  // ---------- الحالة ----------
  const S = { extraPages: [], me: null, school: null, sections: [], memberships: [], staff: [], subjects: [], sectionId: null, classes: [], weeks: [], weekId: null, entries: [], notes: [], view: null };
  window.S = S;
  const LS = { get(k) { try { return localStorage.getItem('dwp_' + k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem('dwp_' + k, v); } catch (e) { } } };
  const section = () => S.sections.find(s => s.id === S.sectionId);
  const week = () => S.weeks.find(w => w.id === S.weekId);
  const subj = id => S.subjects.find(s => s.id === id);
  const subjName = id => (subj(id) || {}).name || '';
  const person = id => S.staff.find(s => s.id === id);
  const personName = id => (person(id) || {}).full_name || '';
  const cls = id => S.classes.find(c => c.id === id);
  const myMem = (sec = S.sectionId) => S.memberships.find(m => m.staff_id === S.me.id && m.section_id === sec);
  function perm(p, sec = S.sectionId) {
    if (S.me.is_owner) return true;
    const m = myMem(sec); if (!m) return false;
    if (m.role === 'admin' && !TOOL_KEYS.includes(p)) return true;
    return !!m[PKEY[p]];
  }
  const anyPerm = (...ps) => ps.some(p => perm(p));
  const holidayOf = di => ((week() || {}).holidays || []).find(h => h.day === di);
  const required = e => e.subject_id && !(subj(e.subject_id) || {}).is_activity && !holidayOf(e.day);
  const filled = e => !!(e.topic || '').trim() || !!(e.homework || '').trim();

  // ---------- واجهات مساعدة ----------
  function toast(m, type = '') { const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = m; $('#toasts').appendChild(t); setTimeout(() => t.remove(), type === 'err' ? 6000 : 3200); }
  function modal(html, opt = {}) {
    const o = document.createElement('div'); o.className = 'ovl';
    o.innerHTML = `<div class="modal ${opt.cls || ''}" role="dialog" aria-modal="true"><button class="x" aria-label="إغلاق">×</button>${html}</div>`;
    document.body.appendChild(o);
    const close = () => { o.remove(); opt.onClose && opt.onClose(); };
    o.querySelector('.x').onclick = close;
    o.addEventListener('mousedown', e => { if (e.target === o && !opt.sticky) close(); });
    const m = o.querySelector('.modal');
    setTimeout(() => { const f = m.querySelector('input,select,textarea'); f && !opt.noFocus && f.focus(); }, 30);
    return { el: m, close };
  }
  function confirmBox(text, okLabel = 'تأكيد', danger = false) {
    return new Promise(res => {
      const m = modal(`<h3>تأكيد</h3><p style="line-height:1.8">${text}</p><div class="acts"><button class="btn ghost" data-no>إلغاء</button><button class="btn ${danger ? 'bad' : ''}" data-yes>${okLabel}</button></div>`, { onClose: () => res(false) });
      m.el.querySelector('[data-no]').onclick = () => { m.close(); };
      m.el.querySelector('[data-yes]').onclick = () => { res(true); m.el.parentNode.remove(); };
    });
  }
  async function run(btn, fn) {
    const b = btn; if (b) { b.disabled = true; b.dataset.l = b.innerHTML; b.innerHTML = '<span class="small">جارٍ التنفيذ…</span>'; }
    try { return await fn(); } catch (e) { console.error(e); toast(apiMsg(e), 'err'); } finally { if (b && b.isConnected) { b.disabled = false; b.innerHTML = b.dataset.l; } }
  }
  const pill = st => `<span class="pill st-${st}">${STATUS[st] || st}</span>`;
  const bar = (a, b) => `<div class="bar ${a >= b && b ? 'done' : ''}"><i style="width:${pct(a, b)}%"></i></div>`;
  const emptyBox = (t, sub = '') => `<div class="empty">${I.book}<div style="font-weight:800;font-size:17px">${t}</div><div class="small" style="margin-top:6px">${sub}</div></div>`;
  function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }

  // ---------- الدخول ----------
  function loginScreen(err = '') {
    $('#app').innerHTML = `
    ${DEMO ? '<div class="demo-banner">وضع التجربة — بيانات تجريبية في المتصفح فقط ولا تُحفظ</div>' : ''}
    <div class="login">
      <div class="art">
        <img src="assets/logo_white.svg" alt="مدارس دينا العالمية">
        <div><h1>منصة دينا<br>للتخطيط الدراسي</h1><p>الخطة الأسبوعية، والجدول الدراسي، واحتساب النصاب — في مكان واحد وبهوية دينا.</p></div>
        <div class="small" style="color:#8FB3D9">رحلتهم الكبرى... تبدأ من هنا</div>
        <svg class="deco" viewBox="546 159 116 116"><g fill="none" stroke="#3AB1DB" stroke-width="1"><path d="M 0 0 C -15.09 -0.46 -26.94 -13.08 -26.47 -28.17 L -26.46 -28.29 C -11.38 -27.82 0.47 -15.21 0 -0.12 Z" transform="matrix(0.99,0,0,-0.99,631.90,188.21)"/><path d="M 0 0 C -0.15 15.09 -12.53 27.20 -27.62 27.04 L -27.75 27.03 C -27.59 11.94 -15.22 -0.16 -0.12 0 Z" transform="matrix(0.99,0,0,-0.99,633.06,245.47)"/><path d="M 0 0 C 15.09 -0.14 27.45 11.97 27.59 27.06 L 27.59 27.19 C 12.50 27.34 0.14 15.22 0 0.12 Z" transform="matrix(0.99,0,0,-0.99,575.78,245.46)"/><path d="M 0 0 C -0.45 -15.08 11.41 -27.69 26.50 -28.14 L 26.62 -28.14 C 27.08 -13.05 15.21 -0.45 0.12 0 Z" transform="matrix(0.99,0,0,-0.99,576.96,188.19)"/></g></svg>
      </div>
      <div class="form"><form class="box card" id="lf" autocomplete="on">
        <h2>تسجيل الدخول</h2><p class="sub">ادخل ببريدك المدرسي وكلمة المرور التي استلمتها من الإدارة.</p>
        <div class="field"><label for="le">البريد الإلكتروني</label><input class="in" id="le" type="email" dir="ltr" autocomplete="username" required></div>
        <div class="field"><label for="lp">كلمة المرور</label><input class="in" id="lp" type="password" dir="ltr" autocomplete="current-password" ${DEMO ? '' : 'required'}></div>
        <div class="err-line" id="lerr">${esc(err)}</div>
        <button class="btn" style="width:100%;padding:13px" id="lb">دخول</button>
        ${DEMO ? `<div class="notice info" style="margin-top:16px;display:block"><b>حسابات تجريبية:</b><div class="row" style="margin-top:8px">${api.accounts.map(([l, e]) => `<button type="button" class="btn ghost sm" data-demo="${e}">${l}</button>`).join('')}</div></div>` : '<p class="small muted" style="margin-top:16px">نسيت كلمة المرور؟ تواصل مع إدارة القسم لإعادة تعيينها.</p>'}
      </form></div>
    </div>`;
    $('#lf').onsubmit = async e => {
      e.preventDefault(); $('#lerr').textContent = '';
      await run($('#lb'), async () => { await api.signIn($('#le').value, $('#lp').value); await start(); });
    };
    $$('[data-demo]').forEach(b => b.onclick = () => { $('#le').value = b.dataset.demo; $('#lp').value = 'demo'; $('#lf').requestSubmit(); });
  }

  // ---------- التحميل ----------
  async function start() {
    $('#app').innerHTML = '<div class="spinner"></div>';
    let b;
    try { b = await api.boot(); } catch (e) { return loginScreen(apiMsg(e)); }
    if (!b) return loginScreen();
    if (!b.me) {
      $('#app').innerHTML = `<main><div class="card" style="max-width:560px;margin:60px auto">${emptyBox('حسابك غير مرتبط بالمنصة بعد', `دخلت بالبريد ${esc(b.email)}، لكن لم تُنشئ الإدارة ملفك. تواصل مع إدارة القسم.`)}<div class="row" style="justify-content:center"><button class="btn ghost" id="lo">تسجيل الخروج</button></div></div></main>`;
      $('#lo').onclick = async () => { await api.signOut(); loginScreen(); };
      return;
    }
    Object.assign(S, b); S.realMe = null; S.allSections = b.sections;
    const va = LS.get('viewas');
    if (va && b.me.is_owner) { const t = b.staff.find(x => x.id === va && !x.is_owner); if (t) { S.realMe = b.me; S.me = t; } else LS.set('viewas', ''); }
    S.sections = S.me.is_owner ? S.sections : S.sections.filter(s => S.memberships.some(m => m.staff_id === S.me.id && m.section_id === s.id));
    if (!S.sections.length) {
      $('#app').innerHTML = `<main><div class="card" style="max-width:560px;margin:60px auto">${emptyBox('لم تُضَف إلى أي قسم بعد', 'تواصل مع إدارة القسم لإضافتك.')}<div class="row" style="justify-content:center"><button class="btn ghost" id="lo">تسجيل الخروج</button></div></div></main>`;
      $('#lo').onclick = async () => { await api.signOut(); loginScreen(); }; return;
    }
    const saved = LS.get('section');
    S.sectionId = S.sections.some(s => s.id === saved) ? saved : S.sections[0].id;
    await loadSection();
    shell();
    route();
  }
  async function loadSection(keepWeek) {
    const [c, w] = await Promise.all([api.classes(S.sectionId), api.weeks(S.sectionId)]);
    S.classes = c; S.weeks = w;
    const savedW = keepWeek || LS.get('week_' + S.sectionId);
    const open = w.filter(x => x.status === 'open' && !x.archived).sort((a, b) => a.number - b.number);
    S.weekId = w.some(x => x.id === savedW) ? savedW : (open[0] || w[0] || {}).id || null;
    await loadWeek();
  }
  async function loadWeek() {
    if (!S.weekId) { S.entries = []; S.notes = []; return; }
    const [e, n, x] = await Promise.all([api.entries(S.weekId), api.notes(S.weekId), api.extraPages(S.weekId).catch(() => [])]);
    S.entries = e; S.notes = n; S.extraPages = x;
    if (window.APP_AFTER_WEEK) window.APP_AFTER_WEEK();
  }
  async function refreshPeople() { const [st, me, su] = await Promise.all([api.reloadStaff(), api.reloadMemberships(), api.reloadSubjects()]); S.staff = st; S.memberships = me; S.subjects = su; }

  // ---------- الإطار ----------
  const NAV = [
    ['my', 'خطتي', () => S.entries.some(e => e.teacher_id === S.me.id) || (myMem() || {}).role === 'teacher'],
    ['dash', 'لوحة المتابعة', () => anyPerm('review', 'export', 'structure', 'users')],
    ['classes', 'خطط الفصول', () => anyPerm('review', 'export', 'structure', 'users', 'timetable_edit', 'exec_confirm')],
    ['export', 'التصدير', () => perm('export')],
    ['timetable', 'الجدول الدراسي', () => anyPerm('timetable_edit', 'timetable_approve', 'structure')],
    ['weeks', 'الأسابيع', () => perm('structure')],
    ['nisab', 'احتساب النصاب', () => perm('nisab')],
    ['builder', 'الجدول الآلي', () => perm('tt_builder')],
    ['admin', 'الإدارة', () => S.me.is_owner || anyPerm('users', 'structure')],
    ['reports', 'التقارير', () => S.me.is_owner || anyPerm('review', 'export', 'users')],
    ['posts', 'إعلانات أولياء الأمور', () => S.me.is_owner || anyPerm('users', 'structure')],
    ['archive', 'الأرشيف', () => S.me.is_owner],
    ['dev', 'لوحة المطوّر', () => S.me.is_owner],
  ];
  function shell() {
    const sec = section();
    $('#app').innerHTML = `
    ${DEMO ? '<div class="demo-banner">وضع التجربة — بيانات تجريبية ولا تُحفظ</div>' : ''}
    ${S.realMe ? `<div class="viewas" role="status"><span>تتصفّح الآن بحساب <b>${esc(S.me.full_name)}</b> — ترى ما يراه بالضبط، وأي تعديل يُسجَّل باسمك.</span><button class="btn sky sm" id="backMe"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></svg> العودة لحسابي</button></div>` : ''}
    <header class="top"><div class="top-in">
      <img class="logo" src="assets/logo_white.svg" alt="مدارس دينا العالمية">
      <div class="ttl">منصة دينا للتخطيط الدراسي<small>${esc(S.school.name)}</small></div>
      <div class="grow"></div>
      <div class="pick"><label>القسم</label><select id="secSel">${S.sections.map(s => `<option value="${s.id}" ${s.id === S.sectionId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="pick"><label>الأسبوع</label><select id="weekSel">${S.weeks.length ? S.weeks.map(w => `<option value="${w.id}" ${w.id === S.weekId ? 'selected' : ''}>الأسبوع ${esc(w.word)} ${w.archived ? '· أرشيف' : w.status !== 'open' ? '· ' + WSTATUS[w.status] : ''}</option>`).join('') : '<option>لا توجد أسابيع</option>'}</select></div>
      <button class="userbtn icon-only" id="inboxBtn" aria-label="الرسائل"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16v12H7l-3 3z"/></svg><span class="badge hidden" id="inboxN"></span></button>
      <button class="userbtn" id="ub"><span class="avatar">${esc((S.me.full_name.replace(/^(أ\.|Ms\.|Mr\.|د\.)\s*/, '')[0]) || '؟')}</span><span class="small" style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(S.me.full_name)}</span></button>
    </div></header>
    <nav class="nav" id="nav"></nav>
    <main id="main"></main><nav class="bnav" id="bnav" aria-label="التنقل"></nav>`;
    $('#secSel').onchange = async e => { S.sectionId = e.target.value; LS.set('section', S.sectionId); $('#main').innerHTML = '<div class="spinner"></div>'; await loadSection(); shell(); route(); };
    $('#weekSel').onchange = async e => { S.weekId = e.target.value; LS.set('week_' + S.sectionId, S.weekId); $('#main').innerHTML = '<div class="spinner"></div>'; await loadWeek(); route(); };
    $('#ub').onclick = e => { e.stopPropagation(); userMenu(); };
    const bm = $('#backMe'); if (bm) bm.onclick = () => { LS.set('viewas', ''); location.hash = '#/dev'; start(); };
    if (window.APP_AFTER_SHELL) window.APP_AFTER_SHELL();
    renderNav();
  }
  function moreSheet(items) {
    const o = document.createElement('div'); o.className = 'ovl'; o.style.placeItems = 'end stretch'; o.style.padding = '0';
    o.innerHTML = `<div class="sheet" role="dialog" aria-label="المزيد">${items.map(([k, l]) => `<a href="#/${k}" class="${S.view === k ? 'on' : ''}">${I[k]}<span>${l}</span></a>`).join('')}</div>`;
    document.body.appendChild(o); o.onclick = e => { if (e.target === o || e.target.closest('a')) o.remove(); };
  }
  function renderNav() {
    const myCount = S.entries.filter(e => e.teacher_id === S.me.id && required(e) && !filled(e)).length;
    const items = NAV.filter(n => n[2]());
    if (!$('#nav')) return;
    $('#nav').innerHTML = items.map(([k, l]) => `<a href="#/${k}" class="${S.view === k ? 'on' : ''}" ${S.view === k ? 'aria-current="page"' : ''}>${I[k]}<span>${l}</span>${k === 'my' && myCount ? `<span class="cnt">${AR(myCount)}</span>` : ''}</a>`).join('');
    const bn = $('#bnav'); if (bn) {
      const prim = items.length > 5 ? items.slice(0, 4) : items, rest = items.length > 5 ? items.slice(4) : [];
      const SHORT = { dash: 'المتابعة', classes: 'الفصول', timetable: 'الجدول', builder: 'الجدول الآلي', nisab: 'النصاب', dev: 'المطوّر', posts: 'الإعلانات' };
      bn.innerHTML = prim.map(([k, l]) => `<a href="#/${k}" class="${S.view === k ? 'on' : ''}">${I[k]}<span>${SHORT[k] || l}</span></a>`).join('') +
        (rest.length ? `<button type="button" id="moreBtn" class="${rest.some(r => r[0] === S.view) ? 'on' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg><span>المزيد</span></button>` : '');
      const mb = $('#moreBtn'); if (mb) mb.onclick = () => moreSheet(rest);
    }
  }
  function userMenu() {
    const old = $('.menu'); if (old) return old.remove();
    const m = document.createElement('div'); m.className = 'menu';
    const roles = S.me.is_owner ? 'مالك النظام' : (myMem() ? ROLES[myMem().role] : '');
    m.innerHTML = `<div class="who"><b>${esc(S.me.full_name)}</b><span dir="ltr">${esc(S.me.email || '')}</span><br><span>${roles} · ${esc(section().name)}</span></div>
      <button data-a="pw">تغيير كلمة المرور</button><button data-a="out">تسجيل الخروج</button>`;
    document.body.appendChild(m);
    const off = () => { m.remove(); document.removeEventListener('click', off); };
    setTimeout(() => document.addEventListener('click', off), 0);
    m.querySelector('[data-a=out]').onclick = async () => { await api.signOut(); loginScreen(); };
    m.querySelector('[data-a=pw]').onclick = () => {
      const md = modal(`<h3>تغيير كلمة المرور</h3><div class="field"><label>كلمة المرور الجديدة (٨ أحرف على الأقل)</label><input class="in" type="password" id="np" dir="ltr" autocomplete="new-password"></div><div class="field"><label>تأكيدها</label><input class="in" type="password" id="np2" dir="ltr" autocomplete="new-password"></div><div class="acts"><button class="btn" id="sp">حفظ</button></div>`);
      md.el.querySelector('#sp').onclick = e => run(e.currentTarget, async () => {
        const a = md.el.querySelector('#np').value, b = md.el.querySelector('#np2').value;
        if (a.length < 8) throw new Error('كلمة المرور قصيرة'); if (a !== b) throw new Error('كلمتا المرور غير متطابقتين');
        await api.changePassword(a); md.close(); toast('تم تغيير كلمة المرور', 'ok');
      });
    };
  }
  const VIEWS = {};
  window.VIEWS = VIEWS;
  function route() {
    const k = (location.hash.match(/^#\/(\w+)/) || [])[1];
    const allowed = NAV.filter(n => n[2]()).map(n => n[0]);
    let v = allowed.includes(k) ? k : (LS.get('view') && allowed.includes(LS.get('view')) ? LS.get('view') : (anyPerm('review', 'export', 'structure', 'users') && !S.entries.some(e => e.teacher_id === S.me.id) ? 'dash' : (allowed.includes('my') ? 'my' : allowed[0])));
    S.view = v; LS.set('view', v);
    if (location.hash !== '#/' + v) history.replaceState(null, '', '#/' + v);
    renderNav();
    const main = $('#main'); if (!main) return; main.innerHTML = '';
    try { VIEWS[v](main); } catch (e) { console.error(e); main.innerHTML = `<div class="card">${emptyBox('حدث خطأ في عرض الصفحة', esc(e.message))}</div>`; }
  }
  window.addEventListener('hashchange', () => { if (S.me) route(); });

  // =====================================================================
  //  بوابة المعلم — خطتي
  // =====================================================================
  // ---------- اختيار المعلم لمواده وفصوله ----------
  async function claimView(root, first) {
    root.innerHTML = '<div class="spinner"></div>';
    let slots = []; try { slots = await api.approvedSlots(S.sectionId); } catch (e) { toast(apiMsg(e), 'err'); }
    const pairs = {};
    slots.filter(x => x.subject_id && !(subj(x.subject_id) || {}).is_activity).forEach(x => { const k = x.class_id + '|' + x.subject_id; (pairs[k] = pairs[k] || { c: x.class_id, s: x.subject_id, n: 0, t: x.teacher_id }).n++; if (x.teacher_id) pairs[k].t = x.teacher_id; });
    const bySub = {}; Object.values(pairs).forEach(p => (bySub[p.s] = bySub[p.s] || []).push(p));
    const mineN = Object.values(pairs).filter(p => p.t === S.me.id).length;
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>${first ? 'أهلاً ' + esc(S.me.full_name) + ' — اختر موادك وفصولك' : 'موادي وفصولي'}</h2>
      <p class="sub" style="margin:2px 0 0">اضغط على كل مادة تدرّسها في كل فصل لتظهر حصصها في «خطتي». المادة المسندة لمعلم آخر لا يمكن اختيارها — تواصل مع الإدارة إن كان ذلك خطأ.</p></div>
      ${mineN ? `<button class="btn" id="goMy">${I.my} الانتقال إلى خطتي (${cnt(mineN, 'مادة', 'مواد')})</button>` : ''}</div>
      <input class="in" id="cq" placeholder="ابحث عن مادتك، مثل: الرياضيات" style="max-width:340px;margin-bottom:14px">
      <div id="cg"></div></div>`;
    const draw = () => {
      const q = normKey($('#cq', root).value);
      $('#cg', root).innerHTML = Object.entries(bySub).sort((a, b) => subjName(a[0]).localeCompare(subjName(b[0]), 'ar')).filter(([sid]) => !q || normKey(subjName(sid)).includes(q)).map(([sid, list]) => `<h3 style="margin:16px 0 8px">${esc(subjName(sid))}</h3><div class="claim-grid">${list.sort((a, b) => (cls(a.c)?.sort ?? 0) - (cls(b.c)?.sort ?? 0)).map(p => { const st = p.t === S.me.id ? 'mine' : p.t ? 'taken' : 'free'; return `<button class="claim ${st}" data-c="${p.c}" data-s="${p.s}" data-st="${st}" ${st === 'taken' ? 'aria-disabled="true"' : ''}><span class="c">${esc((cls(p.c) || {}).name || '')}<small>${cnt(p.n, 'حصة', 'حصص')} أسبوعياً${st === 'taken' ? ' · ' + esc(personName(p.t)) : ''}</small></span>${st === 'mine' ? `<span class="pill st-approved">${I.check.replace('<svg', '<svg style="width:14px;height:14px"')} لي</span>` : st === 'free' ? '<span class="pill st-draft">اختيار</span>' : '<span class="pill st-empty">مسندة</span>'}</button>`; }).join('')}</div>`).join('') || emptyBox('لا توجد مواد مطابقة');
      $$('.claim', root).forEach(b => b.onclick = () => run(null, async () => {
        const st = b.dataset.st; if (st === 'taken') return toast('هذه المادة مسندة لمعلم آخر — تواصل مع الإدارة');
        if (st === 'mine' && !(await confirmBox('إلغاء اختيار هذه المادة في هذا الفصل؟ ستختفي حصصها غير المكتوبة من خطتك.', 'إلغاء الاختيار', true))) return;
        if (S.realMe) await api.assignTeacher(b.dataset.c, b.dataset.s, st === 'mine' ? null : S.me.id); else await api.claim(b.dataset.c, b.dataset.s, st === 'mine');
        const p = pairs[b.dataset.c + '|' + b.dataset.s]; p.t = st === 'mine' ? null : S.me.id;
        await loadWeek(); renderNav(); draw(); toast(st === 'mine' ? 'أُلغي الاختيار' : 'أُضيفت إلى خطتك', 'ok');
        const g = $('#goMy', root); if (!g) claimView(root, false);
      }));
    };
    $('#cq', root).oninput = draw; draw();
    const g = $('#goMy', root); if (g) g.onclick = () => VIEWS.my(root);
  }

  // ---------- الانضمام برابط ----------
  async function joinScreen(code) {
    $('#app').innerHTML = '<div class="spinner"></div>';
    let info = null; try { info = await api.joinInfo(code); } catch (e) { }
    const bad = !info;
    $('#app').innerHTML = `<div class="login"><div class="art"><img src="assets/logo_white.svg" alt="مدارس دينا العالمية">
      <div><h1>انضم إلى<br>منصة دينا</h1><p>${bad ? '' : `أنشئ حسابك في ${esc(info.section)} لتكتب خطتك الأسبوعية وترسلها للمراجعة.`}</p></div><div class="small" style="color:#8FB3D9">رحلتهم الكبرى... تبدأ من هنا</div></div>
      <div class="form"><form class="box card" id="jf">
        ${bad ? `<h2>الرابط غير صالح</h2><p class="sub">رابط الانضمام غير صحيح أو أوقفته الإدارة. اطلب رابطاً جديداً، أو سجّل الدخول إن كان لديك حساب.</p><a class="btn" href="${location.pathname}">تسجيل الدخول</a>` : `
        <h2>إنشاء حساب — ${esc(info.section)}</h2><p class="sub">${esc(info.school)} · ${info.role === 'supervisor' ? 'مشرف' : 'معلم'}</p>
        <div class="field"><label for="jn">الاسم كما يظهر في الخطة</label><input class="in" id="jn" required placeholder="أ. الاسم الثلاثي" autocomplete="name"></div>
        <div class="field"><label for="je">البريد الإلكتروني (المدرسي إن وُجد)</label><input class="in" id="je" type="email" dir="ltr" required autocomplete="username"></div>
        <div class="grid g2" style="gap:0 12px"><div class="field"><label for="jph">الجوال</label><input class="in" id="jph" type="tel" dir="ltr" autocomplete="tel" placeholder="05xxxxxxxx"></div>
        <div class="field"><label for="jsp">التخصص</label><input class="in" id="jsp" placeholder="مثال: اللغة العربية"></div></div>
        <div class="field"><label for="jen">الرقم الوظيفي (اختياري)</label><input class="in" id="jen" dir="ltr"></div>
        <div class="field"><label for="jp">كلمة مرور جديدة (٨ أحرف على الأقل)</label><input class="in" id="jp" type="password" dir="ltr" minlength="8" required autocomplete="new-password"></div>
        <div class="field"><label for="jp2">أعد كتابة كلمة المرور</label><input class="in" id="jp2" type="password" dir="ltr" minlength="8" required autocomplete="new-password"></div>
        <div class="err-line" id="jerr" role="alert"></div>
        <button class="btn" style="width:100%;padding:13px" id="jb">إنشاء الحساب والدخول</button>
        <p class="small muted" style="margin-top:14px">لديك حساب؟ <a href="${location.pathname}">سجّل الدخول</a></p>`}
      </form></div></div>`;
    if (bad) return;
    $('#jf').onsubmit = async e => {
      e.preventDefault(); $('#jerr').textContent = '';
      const n = $('#jn').value.trim(), em = $('#je').value.trim(), p1 = $('#jp').value, p2 = $('#jp2').value;
      if (p1 !== p2) { $('#jerr').textContent = 'كلمتا المرور غير متطابقتين'; return; }
      const b = $('#jb'); b.disabled = true; b.textContent = 'جارٍ إنشاء الحساب…';
      try { await api.joinWithCode2(code, { name: n, email: em, password: p1, phone: $('#jph').value.trim(), specialty: $('#jsp').value.trim(), employee_no: $('#jen').value.trim() }); await api.signIn(em, p1); history.replaceState(null, '', location.pathname + (DEMO ? '?demo=1' : '') + '#/my'); await start(); toast('أُنشئ حسابك — اختر موادك وفصولك', 'ok'); }
      catch (err) { $('#jerr').textContent = apiMsg(err); b.disabled = false; b.textContent = 'إنشاء الحساب والدخول'; }
    };
  }

  VIEWS.my = function (root) {
    const w = week();
    if (!w) { root.innerHTML = `<div class="card">${emptyBox('لا يوجد أسبوع مفتوح حالياً', 'سيظهر هنا عند فتح الإدارة لأسبوع جديد.')}</div>`; return; }
    const mine = S.entries.filter(e => e.teacher_id === S.me.id && e.subject_id);
    const dates = weekDates(w, section().days);
    const open = w.status === 'open';
    const filter = LS.get('myfilter') || 'all';
    let sel = LS.get('mysel') || 'all'; if (sel !== 'all' && !mine.some(e => e.class_id + '|' + e.subject_id === sel)) sel = 'all';
    const selOk = e => sel === 'all' || e.class_id + '|' + e.subject_id === sel;
    if (!mine.length) { claimView(root, true); return; }
    const req = mine.filter(required);
    const done = req.filter(filled).length;
    const sent = mine.filter(e => ['submitted', 'approved'].includes(e.status)).length;
    const returned = mine.filter(e => e.status === 'returned');
    const dl = w.deadline ? new Date(w.deadline) : null;
    const late = dl && dl < new Date() && done < req.length;
    root.innerHTML = `
      <div class="head"><div class="grow"><h2 style="margin:0;font-size:24px;font-weight:800">خطتي — الأسبوع ${esc(w.word)}</h2>
        <p class="sub" style="margin:4px 0 0">${AR(dates[0])} : ${AR(dates[dates.length - 1])} · ${cnt(req.length, 'حصة', 'حصص')} مطلوبة · ${esc(section().name)}</p></div>
        <button class="btn ghost sm" id="myClaim">${I.classes} موادي وفصولي</button><button class="btn ghost sm" id="myExec">${I.check} التنفيذ اليومي</button>
        <div class="tabs" style="margin:0;border:0" id="flt">${[['all', 'الكل'], ['todo', 'غير مكتملة'], ['returned', 'مُعادة'], ['done', 'مكتملة']].map(([k, l]) => `<button data-f="${k}" class="${filter === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
      ${!open ? `<div class="notice warn">${I.lock} هذا الأسبوع ${WSTATUS[w.status]} — لا يمكن التعديل.</div>` : ''}
      ${late ? `<div class="notice bad">انتهى موعد التسليم (${fmtDT(w.deadline)}) وما زالت خطتك غير مكتملة.</div>` : (dl && open ? `<div class="notice info">آخر موعد للتسليم: <b>${fmtDT(w.deadline)}</b></div>` : '')}
      ${returned.length ? `<div class="notice warn"><b>${cnt(returned.length, 'حصة', 'حصص')} أُعيدت إليك للتعديل.</b> عدّلها ثم أعد الإرسال.</div>` : ''}
      ${myGrid(mine, dates)}
      <div class="row" style="margin:14px 0 6px;align-items:end"><div class="field" style="margin:0;min-width:240px;flex:1;max-width:420px"><label for="mySel">عرض حصص</label><select class="in" id="mySel"><option value="all">كل حصصي هذا الأسبوع (${AR(mine.length)})</option>${myPairs(mine).map(([k, l, n]) => `<option value="${k}" ${sel === k ? 'selected' : ''}>${esc(l)} — ${cnt(n, 'حصة', 'حصص')}</option>`).join('')}</select></div>
        <span class="small muted">لتغيير الأسبوع استخدم قائمة «الأسبوع» في أعلى الصفحة.</span></div>
      <div id="days"></div>
      <div class="sticky-foot"><div class="card">
        <div style="flex:1;min-width:200px"><div class="row" style="justify-content:space-between"><b>الإنجاز ${AR(pct(done, req.length))}٪</b><span class="small muted">${AR(done)} من ${AR(req.length)} · مُرسلة ${AR(sent)}</span></div>${bar(done, req.length)}</div>
        <span class="savestate" id="saveState"></span>
        ${open ? `<button class="btn sky" id="submitW">${I.send} إرسال للمراجعة</button>` : ''}
      </div></div>`;
    $$('#flt button', root).forEach(b => b.onclick = () => { LS.set('myfilter', b.dataset.f); VIEWS.my(root); });
    $('#myClaim', root).onclick = () => claimView(root, false);
    $('#myExec', root).onclick = () => VIEWS._exec(root);
    $('#mySel', root).onchange = e => { LS.set('mysel', e.target.value); VIEWS.my(root); };
    $$('[data-cell]', root).forEach(c => c.onclick = () => {
      const [cl, sj, id] = c.dataset.cell.split('|'); LS.set('mysel', cl + '|' + sj); LS.set('myfilter', 'all'); VIEWS.my(root);
      setTimeout(() => { const el = document.querySelector(`.lesson[data-eid="${id}"]`); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); const t = el.querySelector('textarea'); if (t && !t.readOnly) t.focus({ preventScroll: true }); } }, 60);
    });
    const days = $('#days', root);
    for (let d = 0; d < section().days; d++) {
      const hol = holidayOf(d);
      let list = mine.filter(e => e.day === d && selOk(e)).sort((a, b) => a.period - b.period || (cls(a.class_id)?.sort ?? 0) - (cls(b.class_id)?.sort ?? 0));
      if (filter === 'todo') list = list.filter(e => required(e) && !filled(e));
      if (filter === 'returned') list = list.filter(e => e.status === 'returned');
      if (filter === 'done') list = list.filter(filled);
      if (!list.length && !hol) continue;
      const h = document.createElement('div');
      h.innerHTML = `<div class="dayhead"><span class="dn">${DAYS[d]}</span><span class="dd">${AR(dates[d])}</span><span class="ln"></span></div>`;
      if (hol) { h.innerHTML += `<div class="notice info">${esc(hol.label || 'إجازة')} — لا تُطلب خطة لهذا اليوم.</div>`; days.appendChild(h); continue; }
      list.forEach(e => h.appendChild(lessonCard(e, open)));
      days.appendChild(h);
    }
    if (!days.children.length) days.innerHTML = `<div class="card">${emptyBox('لا توجد حصص في هذا التصنيف')}</div>`;
    const sb = $('#submitW', root);
    if (sb) sb.onclick = () => run(sb, async () => {
      await flushSaves();
      const pend = mine.filter(e => required(e) && !filled(e)).length;
      if (pend && !(await confirmBox(`ما زالت ${cnt(pend, 'حصة', 'حصص')} بدون موضوع. هل ترسل المكتمل الآن؟`, 'إرسال المكتمل'))) return;
      const n = S.realMe ? await api.review(mine.filter(e => filled(e) && ['draft', 'returned'].includes(e.status)).map(e => e.id), 'submitted') : await api.submitMyWeek(w.id);
      await loadWeek(); VIEWS.my(root); renderNav();
      toast(n ? `أُرسلت ${cnt(n, 'حصة', 'حصص')} للمراجعة` : 'لا توجد حصص جديدة للإرسال', n ? 'ok' : '');
    });
  };
  // ---------- جدول المعلم الأسبوعي (حصصه المسندة فقط) ----------
  function myPairs(mine) {
    const m = {}; mine.forEach(e => { const k = e.class_id + '|' + e.subject_id; (m[k] = m[k] || [k, `${subjName(e.subject_id)} — ${(cls(e.class_id) || {}).name || ''}`, 0])[2]++; });
    return Object.values(m).sort((a, b) => a[1].localeCompare(b[1], 'ar'));
  }
  function myGrid(mine, dates) {
    const P = section().periods || 7, D = dates.length;
    const at = (d, p) => mine.filter(e => e.day === d && e.period === p);
    const cell = (d, p) => {
      const hol = holidayOf(d); const l = at(d, p);
      if (hol) return `<td class="tg-hol">${p === 0 ? esc(hol.label || 'إجازة') : ''}</td>`;
      if (!l.length) return '<td class="tg-free">—</td>';
      return `<td>${l.map(e => `<button class="tg-c ${filled(e) ? 'ok' : required(e) ? 'todo' : ''}" data-cell="${e.class_id}|${e.subject_id}|${e.id}" title="${esc(subjName(e.subject_id))} — ${esc((cls(e.class_id) || {}).name || '')}"><b>${esc(subjName(e.subject_id))}</b><span>${esc((cls(e.class_id) || {}).name || '')}</span></button>`).join('')}</td>`;
    };
    const n = mine.length, f = mine.filter(e => required(e) && filled(e)).length, rq = mine.filter(required).length;
    return `<details class="card tgrid" ${LS.get('mygrid') === '0' ? '' : 'open'} ontoggle="APP.LS.set('mygrid', this.open ? '1' : '0')"><summary><b>جدولي الأسبوعي</b> <span class="small muted">${cnt(n, 'حصة', 'حصص')} · مكتملة ${AR(f)} من ${AR(rq)} · اضغط على أي حصة لفتحها</span></summary>
      <div class="scroll"><table class="tbl tg"><thead><tr><th>اليوم</th>${Array.from({ length: P }, (_, p) => `<th>${PER[p] || AR(p + 1)}</th>`).join('')}</tr></thead>
      <tbody>${dates.map((dt, d) => `<tr><th><b>${DAYS[d]}</b><div class="small faint">${AR(dt)}</div></th>${Array.from({ length: P }, (_, p) => cell(d, p)).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="row small muted" style="margin-top:8px"><span class="tg-c ok tg-key"></span> مكتملة <span class="tg-c todo tg-key"></span> بانتظار الإدخال</div></details>`;
  }
  const pending = new Map();
  async function flushSaves() { const ps = [...pending.values()].map(f => f()); pending.clear(); await Promise.all(ps); }
  function lessonCard(e, open) {
    const c = cls(e.class_id) || {}; const ro = !open || e.status === 'approved';
    const el = document.createElement('div');
    el.className = `lesson ${e.status}`; el.dataset.eid = e.id;
    el.innerHTML = `
      <div class="side"><div><span class="pn">${AR(e.period + 1)}</span> <span class="pw">الحصة ${PER[e.period]}</span></div>
        <div class="cl">${esc(c.name || '')}</div><div class="sj">${esc(subjName(e.subject_id))}</div><div data-st>${pill(e.status)}</div></div>
      <div class="main">
        ${e.status === 'returned' && e.review_note ? `<div class="rnote">ملاحظة المراجعة: ${esc(e.review_note)}</div>` : ''}
        <div class="field full"><label>الموضوع / الدرس</label><textarea class="in" rows="1" data-k="topic" ${ro ? 'readonly' : ''} placeholder="مثال: الفعل الماضي — ص ٤٥">${esc(e.topic)}</textarea></div>
        <div class="field"><label>الواجب</label><input class="in" data-k="homework" ${ro ? 'readonly' : ''} value="${esc(e.homework)}" placeholder="اتركه فارغاً إن لم يوجد"></div>
        <div class="field"><label>ملاحظة (تظهر في ملاحظات اليوم)</label><input class="in" data-k="note" ${ro ? 'readonly' : ''} value="${esc(e.note)}" placeholder="اختياري"></div>
      </div>`;
    if (!ro) {
      const save = async () => {
        pending.delete(e.id);
        const patch = {}; $$('[data-k]', el).forEach(i => patch[i.dataset.k] = i.value.trim());
        if (patch.topic === e.topic && patch.homework === e.homework && patch.note === e.note) return;
        if (e.status === 'returned') patch.status = 'draft';
        const ss = $('#saveState'); ss && (ss.textContent = 'جارٍ الحفظ…');
        try {
          const r = await api.saveEntry(e.id, patch);
          Object.assign(e, r); const i = S.entries.findIndex(x => x.id === e.id); if (i >= 0) S.entries[i] = e;
          el.className = `lesson ${e.status}`; $('[data-st]', el).innerHTML = pill(e.status);
          ss && (ss.textContent = 'حُفظ ✓'); renderNav(); updateMyProgress();
        } catch (err) { ss && (ss.textContent = ''); toast(apiMsg(err), 'err'); }
      };
      const deb = debounce(save, 900);
      $$('[data-k]', el).forEach(i => { i.addEventListener('input', () => { pending.set(e.id, save); deb(); }); i.addEventListener('blur', () => { if (pending.has(e.id)) save(); }); });
      const ta = $('textarea', el); const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.max(44, ta.scrollHeight + 2) + 'px'; }; ta.addEventListener('input', fit); setTimeout(fit, 0);
    }
    return el;
  }
  // تحديث بطاقات «خطتي» لحظياً دون مقاطعة ما يكتبه المعلم
  function refreshMyCards(ids) {
    const w = week(); const open = w && w.status === 'open';
    // إسناد جديد أو سحب حصة من المعلم: إعادة رسم الصفحة كاملة (إن لم يكن يكتب الآن)
    const structural = (ids || []).some(id => { const e = S.entries.find(x => x.id === id); const el = document.querySelector(`.lesson[data-eid="${id}"]`); return e && ((e.teacher_id === S.me.id && e.subject_id && !el) || (el && e.teacher_id !== S.me.id)); });
    if (structural && !(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) && !pending.size) { route(); return; }
    (ids || []).forEach(id => {
      const el = document.querySelector(`.lesson[data-eid="${id}"]`); if (!el || pending.has(id) || el.contains(document.activeElement)) return;
      const e = S.entries.find(x => x.id === id); if (e) el.replaceWith(lessonCard(e, open));
    });
    updateMyProgress();
  }
  function updateMyProgress() {
    const mine = S.entries.filter(e => e.teacher_id === S.me.id && e.subject_id), req = mine.filter(required), done = req.filter(filled).length;
    const f = $('.sticky-foot'); if (!f) return;
    f.querySelector('b').textContent = `الإنجاز ${AR(pct(done, req.length))}٪`;
    f.querySelector('.bar').outerHTML = bar(done, req.length);
  }

  // =====================================================================
  //  لوحة المتابعة
  // =====================================================================
  function stats(list) {
    const req = list.filter(required);
    return { total: req.length, filled: req.filter(filled).length, submitted: list.filter(e => e.status === 'submitted').length, approved: list.filter(e => e.status === 'approved').length, returned: list.filter(e => e.status === 'returned').length, last: list.reduce((m, e) => (e.updated_at && e.updated_at > m ? e.updated_at : m), '') };
  }
  VIEWS.dash = function (root) {
    const w = week();
    if (!w) { root.innerHTML = `<div class="card">${emptyBox('لا توجد أسابيع بعد', perm('structure') ? 'أنشئ أول أسبوع من صفحة الأسابيع.' : '')}</div>`; return; }
    const all = stats(S.entries);
    const unassigned = S.entries.filter(e => required(e) && !e.teacher_id);
    const dl = w.deadline ? new Date(w.deadline) : null;
    const left = dl ? dl - new Date() : null;
    const leftTxt = left == null ? '—' : left < 0 ? 'انتهى' : left > 864e5 ? `${cnt(Math.floor(left / 864e5), 'يوم', 'أيام')}` : `${cnt(Math.floor(left / 36e5), 'ساعة', 'ساعات')}`;
    const byTeacher = {};
    S.entries.filter(e => required(e) && e.teacher_id).forEach(e => (byTeacher[e.teacher_id] = byTeacher[e.teacher_id] || []).push(e));
    const teachers = Object.entries(byTeacher).map(([id, l]) => ({ id, p: person(id), s: stats(l), classes: new Set(l.map(e => e.class_id)).size })).sort((a, b) => pct(a.s.filled, a.s.total) - pct(b.s.filled, b.s.total));
    const lateT = teachers.filter(t => t.s.filled < t.s.total);
    root.innerHTML = `
      <div class="head"><div class="grow"><h2 style="margin:0;font-size:24px;font-weight:800">لوحة المتابعة — الأسبوع ${esc(w.word)}</h2>
        <p class="sub" style="margin:4px 0 0">${esc(section().name)} · ${AR(weekDates(w)[0])} : ${AR(weekDates(w)[4])} · <span class="pill st-${w.status}">${WSTATUS[w.status]}</span></p></div>
        <div class="row">${perm('review') ? `<button class="btn ghost" id="dLang">التدقيق اللغوي</button>` : ''}${perm('review') || perm('exec_confirm') ? `<button class="btn ghost" id="dExec">${I.check} التنفيذ اليومي</button>` : ''}${perm('export') ? `<a class="btn sky" href="#/export">${I.export} التصدير</a>` : ''}</div></div>
      <div class="grid g4">
        <button class="kpi navy btnlike" data-drill="todo"><span class="more">التفاصيل</span><div class="k">نسبة الإنجاز</div><div class="v">${AR(pct(all.filled, all.total))}<small>٪</small></div><div class="d">${AR(all.filled)} من ${cnt(all.total, 'حصة', 'حصص')}</div></button>
        <button class="kpi btnlike" data-drill="submitted"><span class="more">التفاصيل</span><div class="k">معتمدة</div><div class="v">${AR(all.approved)}</div><div class="d">مُرسلة بانتظار المراجعة: ${AR(all.submitted)}</div></button>
        <button class="kpi btnlike" data-drill="returned"><span class="more">التفاصيل</span><div class="k">مُعادة للتعديل</div><div class="v" style="color:var(--warn)">${AR(all.returned)}</div><div class="d">معلمون لم يكملوا: ${AR(lateT.length)}</div></button>
        <button class="kpi btnlike" data-drill="late"><span class="more">التفاصيل</span><div class="k">المتبقي على موعد التسليم</div><div class="v" style="${left != null && left < 0 ? 'color:var(--bad)' : ''}">${leftTxt}</div><div class="d">${dl ? fmtDT(w.deadline) : 'لم يُحدَّد موعد'}</div></button>
      </div>
      ${unassigned.length ? `<div class="notice warn" style="margin-top:16px">${cnt(unassigned.length, 'حصة', 'حصص')} بلا معلم مُسند — لن تظهر لأي معلم. <button class="btn ghost sm" data-drill="unassigned">عرض الحصص</button> ${anyPerm('timetable_edit') ? '<a href="#/timetable" data-tab="assign">إسناد المعلمين</a>' : ''}</div>` : ''}
      <div class="grid g2" style="margin-top:16px;align-items:start">
        <div class="card"><h3>الفصول</h3><div class="scroll"><table class="tbl"><thead><tr><th>الفصل</th><th style="width:34%">الإنجاز</th><th>مُرسلة</th><th>معتمدة</th><th>مُعادة</th></tr></thead><tbody>
          ${S.classes.filter(c => c.active).map(c => { const s = stats(S.entries.filter(e => e.class_id === c.id)); return `<tr class="click" data-c="${c.id}"><td><b>${esc(c.name)}</b></td><td><div class="row" style="flex-wrap:nowrap">${bar(s.filled, s.total)}<span class="small muted">${AR(pct(s.filled, s.total))}٪</span></div></td><td>${AR(s.submitted)}</td><td>${AR(s.approved)}</td><td>${s.returned ? `<span class="pill st-returned">${AR(s.returned)}</span>` : '—'}</td></tr>`; }).join('')}
        </tbody></table></div></div>
        <div class="card"><div class="head" style="margin-bottom:6px"><div class="grow"><h3 style="margin:0">المعلمون</h3><p class="sub" style="margin:2px 0 0">الأقل إنجازاً أولاً</p></div>${lateT.length ? `<button class="btn ghost sm" id="remindAll">${I.mail} تذكير غير المكتملين</button>` : ''}</div>
          <div class="scroll"><table class="tbl"><thead><tr><th>المعلم</th><th style="width:30%">الإنجاز</th><th>آخر تحديث</th><th></th></tr></thead><tbody>
          ${teachers.length ? teachers.map(t => `<tr class="click" data-t="${t.id}" tabindex="0"><td><b>${esc(t.p ? t.p.full_name : '—')}</b><div class="small faint">${cnt(t.classes, 'فصل', 'فصول')} · ${cnt(t.s.total, 'حصة', 'حصص')}</div></td><td><div class="row" style="flex-wrap:nowrap">${bar(t.s.filled, t.s.total)}<span class="small muted">${AR(t.s.filled)}/${AR(t.s.total)}</span></div></td><td class="small muted">${t.s.last ? fmtDT(t.s.last) : 'لم يبدأ'}</td><td>${t.s.filled < t.s.total && t.p && t.p.email ? `<a class="btn ghost sm" href="${remindLink([t.p])}" title="تذكير بالبريد" aria-label="تذكير ${esc(t.p.full_name)} بالبريد">${I.mail}</a>` : (t.s.filled >= t.s.total ? `<span class="pill st-approved">${I.check.replace('<svg', '<svg style="width:14px;height:14px"')} مكتمل</span>` : '')}</td></tr>`).join('') : `<tr><td colspan="4">${emptyBox('لا يوجد معلمون مُسندون بعد')}</td></tr>`}
          </tbody></table></div></div>
      </div>`;
    $$('tr[data-c]', root).forEach(r => r.onclick = () => { LS.set('cls', r.dataset.c); location.hash = '#/classes'; });
    $$('[data-drill]', root).forEach(b => b.onclick = () => drill(b.dataset.drill));
    const dl2 = $('#dLang', root); if (dl2) dl2.onclick = () => VIEWS._lang(null);
    const de2 = $('#dExec', root); if (de2) de2.onclick = () => VIEWS._exec(root, { all: true });
    $$('tr[data-t]', root).forEach(r => { const go = e => { if (e.target.closest('a')) return; drill('teacher', r.dataset.t); }; r.onclick = go; r.onkeydown = e => { if (e.key === 'Enter') go(e); }; });
    $$('tr[data-c]', root).forEach(r => r.tabIndex = 0);
    const ra = $('#remindAll', root); if (ra) ra.onclick = () => { location.href = remindLink(lateT.map(t => t.p).filter(p => p && p.email)); };
    const at = $('[data-tab=assign]', root); if (at) at.onclick = () => LS.set('tttab', 'assign');
  };
  // ---------- تفاصيل عند النقر ----------
  function drill(kind, arg) {
    const w = week();
    const F = { todo: ['غير المكتمل', e => required(e) && !filled(e)], submitted: ['بانتظار المراجعة', e => e.status === 'submitted'], approved: ['المعتمد', e => e.status === 'approved'], returned: ['المُعاد للتعديل', e => e.status === 'returned'], unassigned: ['بلا معلم', e => required(e) && !e.teacher_id], all: ['الكل', e => !!e.subject_id] };
    let base = S.entries, title;
    if (kind === 'teacher') { base = S.entries.filter(e => e.teacher_id === arg); title = 'خطة ' + personName(arg); kind = 'todo'; }
    else if (kind === 'late') {
      const lt = {}; S.entries.filter(e => required(e) && e.teacher_id && !filled(e)).forEach(e => lt[e.teacher_id] = (lt[e.teacher_id] || 0) + 1);
      const list = Object.entries(lt).sort((a, b) => b[1] - a[1]);
      const m = modal(`<h3>المعلمون الذين لم يكملوا — الأسبوع ${esc(w.word)}</h3><p class="sub">${w.deadline ? 'آخر موعد: ' + fmtDT(w.deadline) : 'لم يُحدَّد موعد للتسليم'}</p>
        <div class="scroll drill"><table class="tbl"><thead><tr><th>المعلم</th><th>حصص ناقصة</th><th></th></tr></thead><tbody>${list.map(([id, n]) => `<tr class="click" data-t="${id}"><td><b>${esc(personName(id))}</b></td><td>${cnt(n, 'حصة', 'حصص')}</td><td>${(person(id) || {}).email ? `<a class="btn ghost sm" href="${remindLink([person(id)])}" aria-label="تذكير بالبريد">${I.mail}</a>` : ''}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">الجميع أكمل خطته</td></tr>'}</tbody></table></div>`, { cls: 'wide' });
      $$('tr[data-t]', m.el).forEach(r => r.onclick = e => { if (e.target.closest('a')) return; m.close(); drill('teacher', r.dataset.t); });
      return;
    } else title = F[kind][0] + ' — الأسبوع ' + w.word;
    const m = modal(`<h3>${esc(title)}</h3><div class="chip-filter" id="dfl">${Object.entries(F).filter(([k]) => k !== 'unassigned' || !arg).map(([k, [l]]) => `<button data-f="${k}" class="${k === kind ? 'on' : ''}">${l} <span class="small">(${AR(base.filter(F[k][1]).length)})</span></button>`).join('')}</div><div class="scroll drill" style="max-height:60vh"><table class="tbl"><thead><tr><th>الفصل</th><th>اليوم</th><th>الحصة</th><th>المادة</th>${arg ? '' : '<th>المعلم</th>'}<th>الموضوع</th><th>الحالة</th></tr></thead><tbody id="dtb"></tbody></table></div>`, { cls: 'wide' });
    const draw = k => {
      $$('#dfl button', m.el).forEach(b => b.classList.toggle('on', b.dataset.f === k));
      const list = base.filter(F[k][1]).sort((a, b) => (cls(a.class_id)?.sort ?? 0) - (cls(b.class_id)?.sort ?? 0) || a.day - b.day || a.period - b.period);
      $('#dtb', m.el).innerHTML = list.slice(0, 400).map(e => `<tr class="click" data-c="${e.class_id}"><td><b>${esc((cls(e.class_id) || {}).name || '')}</b></td><td>${DAYS[e.day]}</td><td>${AR(e.period + 1)}</td><td>${esc(subjName(e.subject_id))}</td>${arg ? '' : `<td class="small">${e.teacher_id ? esc(personName(e.teacher_id)) : `<a href="#" class="assignlink" data-assign-c="${e.class_id}" data-assign-s="${e.subject_id}">إسناد</a>`}</td>`}<td class="small">${esc(e.topic) || '<span class="faint">—</span>'}</td><td>${pill(e.status)}</td></tr>`).join('') || `<tr><td colspan="7">${emptyBox('لا توجد حصص في هذا التصنيف')}</td></tr>`;
      $$('tr[data-c]', m.el).forEach(r => r.onclick = () => { m.close(); LS.set('cls', r.dataset.c); location.hash = '#/classes'; if (S.view === 'classes') route(); });
    };
    $$('#dfl button', m.el).forEach(b => b.onclick = () => draw(b.dataset.f)); draw(kind);
  }
  window.APP_DRILL = drill;
  function remindLink(people) {
    const w = week();
    const to = people.map(p => p.email).join(',');
    const body = `السلام عليكم ورحمة الله\n\nنذكّركم بإكمال الخطة الأسبوعية للأسبوع ${w.word} على منصة الخطة الأسبوعية${w.deadline ? ' قبل ' + fmtDT(w.deadline) : ''}.\nرابط المنصة: ${location.href.split('#')[0]}\n\nشاكرين تعاونكم\n${S.me.full_name}`;
    return `mailto:${people.length === 1 ? to : ''}?${people.length > 1 ? 'bcc=' + encodeURIComponent(to) + '&' : ''}subject=${encodeURIComponent('تذكير: الخطة الأسبوعية — الأسبوع ' + w.word)}&body=${encodeURIComponent(body)}`;
  }

  // =====================================================================
  //  خطط الفصول (عرض + مراجعة + ملاحظات)
  // =====================================================================
  VIEWS.classes = function (root) {
    const w = week();
    if (!w) { root.innerHTML = `<div class="card">${emptyBox('لا توجد أسابيع بعد')}</div>`; return; }
    const act = S.classes.filter(c => c.active);
    let cid = LS.get('cls'); if (!act.some(c => c.id === cid)) cid = (act[0] || {}).id;
    const reviewer = perm('review');
    root.innerHTML = `<div class="split"><div class="card" style="padding:14px"><h3>الفصول</h3><div class="cls-list" id="cl"></div></div><div id="cv"></div></div>`;
    const cl = $('#cl', root);
    act.forEach(c => { const s = stats(S.entries.filter(e => e.class_id === c.id)); const b = document.createElement('button'); b.className = c.id === cid ? 'on' : ''; b.innerHTML = `<span>${esc(c.name)}</span>${bar(s.filled, s.total)}`; b.onclick = () => { LS.set('cls', c.id); VIEWS.classes(root); }; cl.appendChild(b); });
    if (!cid) { $('#cv', root).innerHTML = `<div class="card">${emptyBox('لا توجد فصول')}</div>`; return; }
    const c = cls(cid); const list = S.entries.filter(e => e.class_id === cid);
    const s = stats(list); const dates = weekDates(w, section().days);
    const canEdit = e => w.status === 'open' && e.status !== 'approved' && (reviewer || e.teacher_id === S.me.id) || (reviewer && w.status !== 'published');
    const cv = $('#cv', root);
    cv.innerHTML = `<div class="card">
      <div class="head"><div class="grow"><h2>${esc(c.name)}</h2><p class="sub" style="margin:2px 0 0">الأسبوع ${esc(w.word)} · الإنجاز ${AR(s.filled)}/${AR(s.total)} · معتمدة ${AR(s.approved)} · مُرسلة ${AR(s.submitted)}</p></div>
        <div class="row">
          ${reviewer ? `<button class="btn ok sm" id="apAll">${I.check} اعتماد كل المُرسل</button><button class="btn ghost sm" id="apSel">اعتماد المحدد</button><button class="btn ghost sm" id="retSel">${I.undo} إرجاع المحدد</button>` : ''}
          ${reviewer ? `<button class="btn ghost sm" id="langB">التدقيق اللغوي</button>` : ''}<button class="btn sky sm" id="prev">${I.eye} معاينة الملف</button>
        </div></div>
      <div class="scroll"><table class="cgrid"><thead><tr>${reviewer ? '<th style="width:34px"><input type="checkbox" id="selAll" aria-label="تحديد الكل"></th>' : ''}<th>اليوم</th><th>الحصة</th><th style="width:15%">المادة / المعلم</th><th style="width:30%">الموضوع</th><th style="width:22%">الواجب</th><th style="width:14%">ملاحظة</th><th>الحالة</th></tr></thead><tbody id="cgb"></tbody></table></div>
    </div>
    <div class="card" id="notesCard"></div>
    <div class="card" id="xpCard"></div>`;
    const tb = $('#cgb', cv);
    for (let d = 0; d < section().days; d++) {
      const hol = holidayOf(d);
      const rows = list.filter(e => e.day === d).sort((a, b) => a.period - b.period);
      if (hol) { tb.insertAdjacentHTML('beforeend', `<tr><td ${reviewer ? 'colspan="2"' : ''} class="dayc">${DAYS[d]}<div class="small muted">${AR(dates[d])}</div></td><td colspan="6" style="text-align:center;font-weight:800;background:var(--pale)">${esc(hol.label || 'إجازة')}</td></tr>`); continue; }
      rows.forEach((e, k) => {
        const tr = document.createElement('tr'); if (k % 2) tr.className = 'alt';
        const ed = canEdit(e);
        tr.innerHTML = `${reviewer ? `<td><input type="checkbox" data-sel="${e.id}"></td>` : ''}${k === 0 ? `<td class="dayc" rowspan="${rows.length}">${DAYS[d]}<div class="small muted">${AR(dates[d])}</div></td>` : ''}
          <td class="per">${AR(e.period + 1)}</td>
          <td><b>${esc(subjName(e.subject_id) || '—')}</b><div class="small ${e.teacher_id ? 'muted' : ''}" style="${e.teacher_id ? '' : 'color:var(--bad)'}">${e.subject_id ? (e.teacher_id ? esc(personName(e.teacher_id)) : `<a href="#" class="assignlink" data-assign-c="${e.class_id}" data-assign-s="${e.subject_id}">بلا معلم — إسناد</a>`) : ''}</div></td>
          ${['topic', 'homework', 'note'].map(k2 => `<td>${ed ? `<textarea data-k="${k2}" rows="1">${esc(e[k2])}</textarea>` : `<div style="padding:6px">${esc(e[k2]) || '<span class="faint">–</span>'}</div>`}</td>`).join('')}
          <td>${pill(e.status)}${e.subject_id && APP.exPill ? `<div style="margin-top:4px">${APP.exPill(e.exec_status)}</div>` : ''}${e.review_note ? `<div class="small" style="color:var(--warn);margin-top:4px">${esc(e.review_note)}</div>` : ''}</td>`;
        if (ed) {
          const save = async () => {
            const patch = {}; $$('[data-k]', tr).forEach(i => patch[i.dataset.k] = i.value.trim());
            if (patch.topic === e.topic && patch.homework === e.homework && patch.note === e.note) return;
            try { const r = await api.saveEntry(e.id, patch); Object.assign(e, r); tr.lastElementChild.innerHTML = pill(e.status); } catch (err) { toast(apiMsg(err), 'err'); }
          };
          $$('textarea', tr).forEach(t => t.addEventListener('change', save));
        }
        tb.appendChild(tr);
      });
    }
    $('#prev', cv).onclick = () => VIEWS._preview(c);
    const lb = $('#langB', cv); if (lb) lb.onclick = () => VIEWS._lang(c.id);
    if (reviewer) {
      const sel = () => $$('[data-sel]:checked', cv).map(i => i.dataset.sel);
      $('#selAll', cv).onchange = e => $$('[data-sel]', cv).forEach(i => i.checked = e.target.checked);
      const doReview = async (ids, st, note) => { if (!ids.length) return toast('حدّد حصصاً أولاً'); const n = await api.review(ids, st, note); await loadWeek(); VIEWS.classes(root); toast(`${st === 'approved' ? 'اعتُمدت' : 'أُعيدت'} ${cnt(n, 'حصة', 'حصص')}`, 'ok'); };
      $('#apAll', cv).onclick = e => run(e.currentTarget, () => doReview(list.filter(x => x.status === 'submitted').map(x => x.id), 'approved'));
      $('#apSel', cv).onclick = e => run(e.currentTarget, () => doReview(sel(), 'approved'));
      $('#retSel', cv).onclick = () => {
        const ids = sel(); if (!ids.length) return toast('حدّد حصصاً أولاً');
        const m = modal(`<h3>إرجاع ${cnt(ids.length, 'حصة', 'حصص')} للمعلم</h3><div class="field"><label>ملاحظة للمعلم</label><textarea class="in" id="rn" rows="3" placeholder="مثال: يرجى تحديد رقم الصفحة"></textarea></div><div class="acts"><button class="btn" id="rb">${I.undo} إرجاع</button></div>`);
        m.el.querySelector('#rb').onclick = ev => run(ev.currentTarget, async () => { await doReview(ids, 'returned', m.el.querySelector('#rn').value.trim()); m.close(); });
      };
    }
    renderNotes($('#notesCard', cv), c, () => VIEWS.classes(root));
    if (VIEWS._xp) VIEWS._xp($('#xpCard', cv), c, () => VIEWS.classes(root));
  };

  function renderNotes(card, c, refresh) {
    const w = week(); const canN = perm('review') || perm('structure');
    const mine = S.notes.filter(n => n.class_id === c.id || n.class_id === null);
    const where = n => n.placement === 'extra' ? 'صفحة إضافية' : `ملاحظات يوم ${DAYS[n.day] || ''}`;
    card.innerHTML = `<div class="head"><div class="grow"><h3 style="margin:0">ملاحظات الملف</h3><p class="sub" style="margin:2px 0 0">تظهر في صندوق «ملاحظات اليوم» أسفل جدول اليوم، أو في صفحة «ملاحظات وتنبيهات» بعد الخميس.</p></div>${canN && w.status !== 'published' ? `<button class="btn sm" id="addN">${I.plus} إضافة ملاحظة</button>` : ''}</div>
      ${mine.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>الموضع</th><th>النطاق</th><th>العنوان</th><th>النص</th><th></th></tr></thead><tbody>${mine.map(n => `<tr><td>${where(n)}</td><td>${n.class_id ? 'هذا الفصل' : '<span class="pill st-submitted">جميع الفصول</span>'}</td><td><b>${esc(n.title)}</b></td><td style="white-space:pre-line">${esc(n.body)}</td><td>${canN ? `<button class="btn ghost sm" data-en="${n.id}">تعديل</button> <button class="btn bad sm" data-dn="${n.id}">حذف</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted small">لا توجد ملاحظات لهذا الفصل. ملاحظات المعلمين على الحصص تُضاف تلقائياً إلى ملاحظات اليوم.</p>'}`;
    const edit = n => {
      n = n || { class_id: c.id, placement: 'day', day: 0, title: '', body: '' };
      const m = modal(`<h3>${n.id ? 'تعديل' : 'إضافة'} ملاحظة</h3>
        <div class="grid g2"><div class="field"><label>النطاق</label><select class="in" id="nsc"><option value="one">${esc(c.name)} فقط</option><option value="all" ${n.class_id === null ? 'selected' : ''}>جميع الفصول</option></select></div>
        <div class="field"><label>الموضع</label><select class="in" id="npl">${DAYS.slice(0, section().days).map((d, i) => `<option value="${i}" ${n.placement === 'day' && n.day === i ? 'selected' : ''}>ملاحظات يوم ${d}</option>`).join('')}<option value="extra" ${n.placement === 'extra' ? 'selected' : ''}>صفحة إضافية بعد الخميس</option></select></div></div>
        <div class="field"><label>العنوان (اختياري)</label><input class="in" id="nt" value="${esc(n.title)}"></div>
        <div class="field"><label>النص</label><textarea class="in" id="nb" rows="4">${esc(n.body)}</textarea></div>
        <div class="acts"><button class="btn" id="ns">حفظ</button></div>`);
      m.el.querySelector('#ns').onclick = e => run(e.currentTarget, async () => {
        const pl = m.el.querySelector('#npl').value, body = m.el.querySelector('#nb').value.trim();
        if (!body) throw new Error('اكتب نص الملاحظة');
        const row = { week_id: w.id, class_id: m.el.querySelector('#nsc').value === 'all' ? null : c.id, placement: pl === 'extra' ? 'extra' : 'day', day: pl === 'extra' ? null : +pl, title: m.el.querySelector('#nt').value.trim(), body };
        if (n.id) await api.updateNote(n.id, row); else await api.addNote(row);
        S.notes = await api.notes(w.id); m.close(); refresh(); toast('حُفظت الملاحظة', 'ok');
      });
    };
    const a = $('#addN', card); if (a) a.onclick = () => edit();
    $$('[data-en]', card).forEach(b => b.onclick = () => edit(S.notes.find(n => n.id === b.dataset.en)));
    $$('[data-dn]', card).forEach(b => b.onclick = async () => { if (!(await confirmBox('حذف هذه الملاحظة؟', 'حذف', true))) return; await run(null, async () => { await api.deleteNote(b.dataset.dn); S.notes = await api.notes(w.id); refresh(); }); });
  }

  // ---------- مشترك مع الملفات الأخرى ----------
  window.APP = { start: () => start(), TOOL_PERMS, TOOL_KEYS, cnt, api, S, $, $$, esc, AR, DAYS, PER, ORD, STATUS, WSTATUS, ROLES, PERMS, ROLE_DEFAULTS, I, parseDate, isoDate, dmy, weekDates, fmtDT, pct, norm, normKey, genPass, toast, modal, confirmBox, run, pill, bar, emptyBox, download, section, week, subj, subjName, person, personName, cls, myMem, perm, anyPerm, holidayOf, required, filled, stats, loadSection, loadWeek, refreshPeople, refreshMyCards, shell, route, renderNav, LS, DEMO };

  // ---------- تشغيل ----------
  window.addEventListener('DOMContentLoaded', async () => {
    const jc = new URLSearchParams(location.search).get('join');
    try { if (jc) { await api.signOut().catch(() => { }); return joinScreen(jc); } const s = await api.session(); if (s) await start(); else loginScreen(); } catch (e) { loginScreen(apiMsg(e)); }
  });
  window.addEventListener('beforeunload', e => { if (pending.size) { flushSaves(); e.preventDefault(); e.returnValue = ''; } });
})();
