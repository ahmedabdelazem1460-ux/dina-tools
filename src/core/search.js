/* منصة دينا — البحث الشامل (لكل الحسابات)
   زر 🔍 في الشريط العلوي + اختصار Ctrl/⌘+K أو «/»: يبحث فيما يحق للمستخدم فقط:
   الصفحات والأدوات المتاحة له (A.navOK)، الزملاء، الفصول، الطلاب، دروس الخطة، المصادر والملفات، بنك الأسئلة، الاختبارات،
   النماذج، نماذجي، العروض — والبيانات من القاعدة تمر عبر RLS (api.search) فلا يظهر إلا المسموح.
   لوحة مفاتيح كاملة (↑↓ Enter Esc)، تصفية بالنوع، تمييز المطابقة، وآخر عمليات البحث. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  const nk = s => (A.normKey ? A.normKey(s) : String(s || '').toLowerCase());
  const navOK = k => A.NAV.some(n => n[0] === k && A.navOK(n));
  const LSK = 'gs_recent';
  const KINDS = [['all', 'الكل'], ['page', 'الصفحات'], ['person', 'الزملاء'], ['class', 'الفصول'], ['student', 'الطلاب'], ['lesson', 'الدروس'], ['file', 'الملفات والمصادر'], ['q', 'الأسئلة والاختبارات'], ['form', 'النماذج'], ['tool', 'أدوات']];
  const KIC = { page: '📄', person: '👤', class: '🏫', student: '🎓', lesson: '📘', file: '📎', q: '❓', form: '📝', tool: '⚙️' };

  // تمييز المطابقة (بلا حساسية للهمزات و«ال»): نبحث عن أول ظهور لأي كلمة
  function hl(text, q) {
    const t = String(text || ''); const words = String(q || '').trim().split(/\s+/).filter(w => w.length > 1); if (!words.length) return esc(t);
    for (const w of words) { const i = t.indexOf(w); if (i >= 0) return esc(t.slice(0, i)) + '<mark>' + esc(t.slice(i, i + w.length)) + '</mark>' + esc(t.slice(i + w.length)); }
    return esc(t);
  }
  const match = (q, ...fields) => { const words = nk(q).split(' ').filter(Boolean); const hay = nk(fields.join(' ')); return words.every(w => hay.includes(w)); };

  const goStudio = (tab) => { A.LS.set('studio_t', tab); location.hash = '#/studio'; };
  const goTT = (p) => { try { const st = JSON.parse(A.LS.get('ttv_st') || '{}'); A.LS.set('ttv_st', JSON.stringify(Object.assign(st, p))); } catch (_) { A.LS.set('ttv_st', JSON.stringify(p)); } if (S.me.is_owner) goStudio('ttviews'); else location.hash = '#/ttviews'; };
  const canTT = () => S.me.is_owner || navOK('ttviews');

  // ---------- المصادر المحلية ----------
  function local(q) {
    const out = [];
    A.NAV.filter(A.navOK).forEach(([k, l]) => { if (match(q, l, k)) out.push({ kind: 'page', title: l, sub: 'صفحة', go: () => { location.hash = '#/' + k; } }); });
    const tools = [['توقيعي الإلكتروني', 'رسم توقيعك المستخدم في النماذج', () => A.formsSigModal && A.formsSigModal()], ['تغيير كلمة المرور', 'أمان الحساب', () => { const b = $('#ub'); b && b.click(); setTimeout(() => { const x = document.querySelector('.menu [data-a=pw]'); x && x.click(); }, 60); }], ['السمات والمظهر', 'تغيير شكل المنصة', () => { const b = $('#thBtn'); b && b.click(); }]];
    if (A.notifPanel && A.tfeat && A.tfeat('notif')) tools.push(['الإشعارات', 'مركز التنبيهات', () => A.notifPanel()]);
    tools.forEach(([t, s, f]) => { if (match(q, t, s)) out.push({ kind: 'tool', title: t, sub: s, go: f }); });
    (S.staff || []).filter(p => p.active !== false).forEach(p => { if (match(q, p.full_name, p.title || '')) out.push({ kind: 'person', title: p.full_name, sub: p.title || (p.is_owner ? 'الإدارة' : 'معلم'), go: canTT() ? () => goTT({ v: 'teacher', tid: p.id }) : null, hint: canTT() ? 'جدوله' : '' }); });
    const cls = [...new Map([...(S.allClasses || []), ...(S.classes || [])].map(c => [c.id, c])).values()];
    cls.forEach(c => { if (match(q, c.name, c.stage || '')) out.push({ kind: 'class', title: c.name, sub: ((S.sections || []).find(s => s.id === c.section_id) || {}).name || 'فصل', go: canTT() ? () => goTT({ v: 'class', cid: c.id }) : (navOK('classes') ? () => { location.hash = '#/classes'; } : null), hint: canTT() ? 'جدوله' : '' }); });
    const E = S.allEntries || S.entries || [], seen = new Set();
    E.forEach(e => { if (!e.topic && !e.homework) return; if (!match(q, e.topic || '', e.homework || '')) return; const key = e.class_id + '|' + e.subject_id + '|' + e.topic; if (seen.has(key)) return; seen.add(key);
      const mine = e.teacher_id === S.me.id; if (!mine && !navOK('classes') && !S.me.is_owner) return;
      out.push({ kind: 'lesson', title: e.topic || e.homework, sub: [A.subjName(e.subject_id), (A.cls(e.class_id) || {}).name, (A.DAYS || [])[e.day]].filter(Boolean).join(' · ') + (e.homework && e.topic ? ' — واجب: ' + e.homework : ''), go: () => { location.hash = mine && navOK('my') ? '#/my' : '#/classes'; } }); });
    return out;
  }

  // ---------- المصادر من القاعدة (RLS) ----------
  async function remote(q) {
    if (!api.search || String(q).trim().length < 2) return [];
    const sid = S.school && S.school.id, J = [];
    const tryS = (t, cols, o, map) => J.push(api.search(t, cols, q, o).then(r => (r || []).map(map).filter(Boolean)).catch(() => []));
    if (navOK('attendance') || S.me.is_owner) tryS('students', ['full_name', 'student_no'], { eq: { school_id: sid }, select: 'id,full_name,class_id,student_no,active', limit: 8 }, r => r.active === false ? null : ({ kind: 'student', title: r.full_name, sub: ((A.cls(r.class_id) || (S.allClasses || []).find(c => c.id === r.class_id) || {}).name || 'طالب') + (r.student_no ? ' · ' + r.student_no : ''), go: navOK('attendance') ? () => { A.LS.set('atttab', 'students'); try { const st = JSON.parse(A.LS.get('stbr') || '{}'); st.q = r.full_name; A.LS.set('stbr', JSON.stringify(st)); } catch (_) { } location.hash = '#/attendance'; } : null }));
    tryS('resources', ['title', 'note'], { eq: { school_id: sid }, select: 'id,title,url,kind,note', limit: 8 }, r => ({ kind: 'file', title: r.title, sub: r.note || 'مصدر', go: () => r.url && window.open(r.url, '_blank', 'noopener'), hint: 'فتح' }));
    if (navOK('assess') || navOK('qbank')) {
      tryS('questions', ['body'], { eq: { school_id: sid }, select: 'id,body,subject_id,grade_key', limit: 6 }, r => ({ kind: 'q', title: String(r.body || '').slice(0, 110), sub: 'سؤال · ' + (A.subjName(r.subject_id) || ''), go: () => { location.hash = navOK('qbank') ? '#/qbank' : '#/assess'; } }));
      tryS('quizzes', ['title'], { eq: { school_id: sid }, select: 'id,title,kind,subject_id', limit: 6 }, r => ({ kind: 'q', title: r.title || 'اختبار', sub: (r.kind === 'homework' ? 'واجب' : 'اختبار') + ' · ' + (A.subjName(r.subject_id) || ''), go: () => { location.hash = '#/assess'; } }));
    }
    if (navOK('forms')) tryS('form_tasks', ['title'], { eq: { school_id: sid }, select: 'id,title,status,assignee,created_at', limit: 8, order: 'created_at', desc: true }, r => ({ kind: 'form', title: r.title, sub: 'نموذج' + (r.assignee ? ' · ' + (A.personName(r.assignee) || '') : ''), go: () => { location.hash = '#/forms'; } }));
    if (navOK('myforms')) tryS('user_forms', ['name', 'folder'], { eq: { school_id: sid }, select: 'id,name,folder', limit: 6 }, r => ({ kind: 'form', title: r.name, sub: 'نماذجي' + (r.folder ? ' · ' + r.folder : ''), go: () => { location.hash = '#/myforms'; } }));
    if (navOK('slides')) tryS('decks', ['title'], { eq: { school_id: sid }, select: 'id,title', limit: 6 }, r => ({ kind: 'file', title: r.title, sub: 'عرض تقديمي', go: () => { location.hash = '#/slides'; } }));
    return (await Promise.all(J)).flat();
  }

  // ---------- الواجهة ----------
  let OV = null;
  function open(pre) {
    if (OV) { $('#gsI', OV).focus(); return; }
    css();
    const last = document.activeElement;
    OV = document.createElement('div'); OV.className = 'gs-ov'; OV.setAttribute('role', 'dialog'); OV.setAttribute('aria-modal', 'true'); OV.setAttribute('aria-label', 'البحث في المنصة');
    OV.innerHTML = `<div class="gs-box"><div class="gs-top"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="gsI" type="search" placeholder="ابحث عن صفحة، زميل، فصل، طالب، درس، ملف، سؤال، نموذج…" autocomplete="off" role="combobox" aria-expanded="true" aria-controls="gsL" aria-autocomplete="list">
        <kbd class="gs-k">Esc</kbd><button class="gs-x" id="gsX" aria-label="إغلاق البحث">×</button></div>
      <div class="gs-ch" role="group" aria-label="نوع النتائج">${KINDS.map(([k, l]) => `<button type="button" data-k="${k}" class="${k === 'all' ? 'on' : ''}" aria-pressed="${k === 'all'}">${l}</button>`).join('')}</div>
      <div class="gs-l" id="gsL" role="listbox" aria-label="النتائج"></div>
      <div class="gs-f"><span><kbd>↑</kbd><kbd>↓</kbd> تنقّل</span><span><kbd>Enter</kbd> فتح</span><span><kbd>Ctrl</kbd>+<kbd>K</kbd> بحث من أي مكان</span></div></div>`;
    document.body.appendChild(OV); document.documentElement.classList.add('gs-lock');
    const I = $('#gsI', OV), L = $('#gsL', OV); let kind = 'all', items = [], act = 0, tok = 0, tm = null, remoteItems = [], localItems = [];
    const close = () => { if (!OV) return; OV.remove(); OV = null; document.documentElement.classList.remove('gs-lock'); document.removeEventListener('keydown', onKey, true); last && last.focus && last.focus(); };
    const recent = () => { try { return JSON.parse(A.LS.get(LSK) || '[]'); } catch (_) { return []; } };
    const remember = q => { const r = recent().filter(x => x !== q); r.unshift(q); A.LS.set(LSK, JSON.stringify(r.slice(0, 6))); };
    const render = (loading) => {
      const q = I.value.trim();
      if (!q) { const r = recent(); items = []; L.innerHTML = r.length ? `<div class="gs-h">آخر عمليات البحث</div>${r.map(x => `<button type="button" class="gs-r" data-rq="${esc(x)}">🕘 ${esc(x)}</button>`).join('')}` : `<div class="gs-e">اكتب حرفين أو أكثر للبحث فيما هو متاح لحسابك.</div>`;
        $$('[data-rq]', L).forEach(b => b.onclick = () => { I.value = b.dataset.rq; run(); }); return; }
      const all = localItems.concat(remoteItems).filter(x => kind === 'all' || x.kind === kind);
      items = all.slice(0, 60); if (act >= items.length) act = 0;
      const counts = {}; localItems.concat(remoteItems).forEach(x => counts[x.kind] = (counts[x.kind] || 0) + 1);
      $$('.gs-ch [data-k]', OV).forEach(b => { const n = b.dataset.k === 'all' ? localItems.length + remoteItems.length : counts[b.dataset.k] || 0; b.hidden = b.dataset.k !== 'all' && !n; b.innerHTML = KINDS.find(k => k[0] === b.dataset.k)[1] + (n ? ` <b>${AR(n)}</b>` : ''); });
      if (!items.length) { L.innerHTML = loading ? '<div class="gs-e"><span class="gs-sp" aria-hidden="true"></span> جارٍ البحث…</div>' : `<div class="gs-e">لا نتائج لـ «${esc(q)}» ضمن ما يتاح لحسابك.</div>`; return; }
      let html = '', prevK = ''; items.forEach((x, i) => { if (kind === 'all' && x.kind !== prevK) { html += `<div class="gs-h">${KINDS.find(k => k[0] === x.kind)[1]}</div>`; prevK = x.kind; }
        html += `<div class="gs-i ${i === act ? 'on' : ''} ${x.go ? '' : 'ro'}" role="option" id="gsO${i}" aria-selected="${i === act}" data-i="${i}"><span class="gs-ic" aria-hidden="true">${KIC[x.kind]}</span><span class="gs-t"><b>${hl(x.title, q)}</b><small>${hl(x.sub || '', q)}</small></span>${x.go ? `<span class="gs-go">${esc(x.hint || 'فتح')} ←</span>` : ''}</div>`; });
      if (loading) html += '<div class="gs-e small"><span class="gs-sp" aria-hidden="true"></span> البحث في البيانات…</div>';
      L.innerHTML = html; I.setAttribute('aria-activedescendant', 'gsO' + act);
      $$('.gs-i', L).forEach(el => { el.onclick = () => pick(+el.dataset.i); el.onmousemove = () => { if (act !== +el.dataset.i) { act = +el.dataset.i; mark(); } }; });
    };
    const mark = () => { $$('.gs-i', L).forEach(el => { const on = +el.dataset.i === act; el.classList.toggle('on', on); el.setAttribute('aria-selected', on); }); I.setAttribute('aria-activedescendant', 'gsO' + act); const el = $('#gsO' + act, L); el && el.scrollIntoView({ block: 'nearest' }); };
    const pick = i => { const x = items[i]; if (!x || !x.go) return; remember(I.value.trim()); close(); setTimeout(() => x.go(), 0); };
    const run = () => { clearTimeout(tm); const q = I.value.trim(); act = 0; localItems = q ? local(q) : []; remoteItems = []; render(q.length >= 2);
      if (q.length < 2) return; const my = ++tok; tm = setTimeout(async () => { const r = await remote(q); if (my !== tok || !OV) return; remoteItems = r; render(false); }, 260); };
    function onKey(e) {
      if (!OV) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!items.length) return; e.preventDefault(); act = (act + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; mark(); return; }
      if (e.key === 'Enter' && document.activeElement === I) { e.preventDefault(); pick(act); return; }
      if (e.key === 'Tab') { const f = $$('input,button:not([hidden])', OV).filter(x => x.offsetParent); const i = f.indexOf(document.activeElement); if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); } }
    }
    document.addEventListener('keydown', onKey, true);
    I.oninput = run; $('#gsX', OV).onclick = close; OV.onclick = e => { if (e.target === OV) close(); };
    $$('.gs-ch [data-k]', OV).forEach(b => b.onclick = () => { kind = b.dataset.k; act = 0; $$('.gs-ch [data-k]', OV).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); render(false); I.focus(); });
    if (pre) I.value = pre; run(); setTimeout(() => I.focus(), 0);
  }
  A.globalSearch = open;

  // زر في الشريط العلوي (يُعاد إدراجه كلما أُعيد رسم الشريط)
  function ensureBtn() {
    if (!S.me) return; if ($('#gsBtn')) { sideBox(); return; } const ub = $('#ub'); if (!ub || !ub.parentNode) return;
    const b = document.createElement('button'); b.id = 'gsBtn'; b.type = 'button'; b.className = 'gs-btn'; b.title = 'بحث (Ctrl+K)'; b.setAttribute('aria-label', 'البحث في المنصة');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>بحث</span>';
    b.onclick = () => open(); const th = $('#thBtn'); ub.parentNode.insertBefore(b, th && th.parentNode === ub.parentNode ? th : ub); css();
    sideBox();
  }
  // على الشاشات الواسعة: خانة بحث أعلى القائمة الجانبية (الشريط العلوي ممتلئ)
  function sideBox() {
    const nav = $('#nav'); if (!S.me || !nav || nav.querySelector('#gsSide')) return;
    const b = document.createElement('button'); b.id = 'gsSide'; b.type = 'button'; b.className = 'gs-side'; b.setAttribute('aria-label', 'البحث في المنصة (Ctrl+K)');
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg><span>بحث…</span><kbd>Ctrl K</kbd>';
    b.onclick = () => open(); nav.prepend(b);
  }
  new MutationObserver(() => ensureBtn()).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('keydown', e => {
    if (!S.me || OV) return; const t = e.target, typing = t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.code === 'KeyK')) { e.preventDefault(); open(); }
    else if (e.key === '/' && !typing && !document.querySelector('.modal-bg,.rs-ov')) { e.preventDefault(); open(); }
  });

  function css() {
    if (document.getElementById('gs-css')) return;
    const s = document.createElement('style'); s.id = 'gs-css';
    s.textContent = `.gs-btn{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff;width:38px;height:38px;border-radius:12px;display:inline-grid;place-items:center;cursor:pointer;margin-inline:4px;flex:none;padding:0}.gs-btn span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
      .gs-btn svg,.gs-top svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round}.gs-btn:hover{background:rgba(255,255,255,.22)}.gs-btn:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}
      .gs-side{display:none;align-items:center;gap:8px;width:calc(100% - 16px);margin:10px 8px 6px;padding:9px 12px;border:1px solid #DCE7F3;border-radius:12px;background:#F7FAFD;color:#5B7090;font:inherit;font-size:13.5px;cursor:pointer;text-align:start}
      .gs-side svg{width:16px;height:16px;fill:none;stroke:#005499;stroke-width:2.2;stroke-linecap:round;flex:none}.gs-side span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.gs-side kbd{font:inherit;font-size:10.5px;border:1px solid #CFE0F2;border-bottom-width:2px;border-radius:6px;padding:0 5px;background:#fff;direction:ltr}
      .gs-side:hover{border-color:#3AB1DB;background:#fff}.gs-side:focus-visible{outline:3px solid #3AB1DB;outline-offset:1px}
      @media(min-width:1100px){body.ui-side.side-full .gs-side{display:flex}body.ui-side.side-full .gs-btn{display:none!important}}
      html.gs-lock{overflow:hidden}
      .gs-ov{position:fixed;inset:0;z-index:10050;background:rgba(8,43,90,.42);backdrop-filter:blur(3px);display:flex;justify-content:center;align-items:flex-start;padding:8vh 12px 12px}
      .gs-box{width:min(720px,100%);max-height:80vh;display:flex;flex-direction:column;background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(8,43,90,.35),0 2px 0 #3AB1DB inset;overflow:hidden;color:#082B5A}
      .gs-top{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid #E4EBF5}.gs-top svg{color:#005499;flex:none}
      .gs-top input{flex:1;min-width:0;border:0;outline:0;font:inherit;font-size:17px;color:#082B5A;background:transparent}.gs-top input::-webkit-search-cancel-button{display:none}
      .gs-x{border:0;background:#EEF3F9;color:#082B5A;width:32px;height:32px;border-radius:10px;font-size:20px;cursor:pointer}.gs-x:focus-visible{outline:3px solid #3AB1DB}
      .gs-k,.gs-f kbd{font:inherit;font-size:11px;border:1px solid #CFE0F2;border-bottom-width:2px;border-radius:6px;padding:0 5px;color:#40546F;background:#F7FAFD}
      .gs-ch{display:flex;gap:6px;padding:8px 12px;overflow-x:auto;border-bottom:1px solid #F0F4F9}.gs-ch button{flex:none;border:1px solid #DCE7F3;background:#fff;color:#082B5A;border-radius:999px;padding:4px 11px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}
      .gs-ch button b{font-size:11px;background:#EEF3F9;border-radius:99px;padding:0 6px;color:#005499}.gs-ch button.on{background:#082B5A;color:#fff;border-color:#082B5A}.gs-ch button.on b{background:rgba(255,255,255,.2);color:#fff}.gs-ch button:focus-visible{outline:3px solid #3AB1DB}
      .gs-l{overflow:auto;padding:6px 8px 10px;flex:1}.gs-h{font-size:12px;font-weight:800;color:#5B7090;padding:10px 8px 4px}
      .gs-i{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;cursor:pointer}.gs-i.on{background:linear-gradient(90deg,#EEF6FB,#F5F9FD);box-shadow:inset -3px 0 0 #3AB1DB}.gs-i.ro{cursor:default}
      .gs-ic{width:34px;height:34px;flex:none;border-radius:10px;background:#F2F7FC;display:grid;place-items:center;font-size:17px}
      .gs-t{flex:1;min-width:0;display:flex;flex-direction:column}.gs-t b{font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gs-t small{color:#5B7090;font-size:12.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .gs-t mark{background:#FFF1B8;color:inherit;border-radius:3px;padding:0 1px}.gs-go{font-size:12px;color:#005499;font-weight:700;flex:none}
      .gs-e{padding:18px 10px;text-align:center;color:#5B7090}.gs-r{display:block;width:100%;text-align:start;border:0;background:none;font:inherit;padding:8px 10px;border-radius:10px;color:#082B5A;cursor:pointer}.gs-r:hover,.gs-r:focus-visible{background:#F2F7FC;outline:none}
      .gs-f{display:flex;gap:14px;flex-wrap:wrap;padding:8px 14px;border-top:1px solid #E4EBF5;font-size:12px;color:#5B7090;background:#FAFCFE}
      .gs-sp{display:inline-block;width:12px;height:12px;border:2px solid #CFE0F2;border-top-color:#005499;border-radius:50%;animation:gsr .8s linear infinite;vertical-align:-1px}@keyframes gsr{to{transform:rotate(360deg)}}
      @media(max-width:640px){.gs-ov{padding:0}.gs-box{width:100%;max-height:none;height:100%;border-radius:0}.gs-f{display:none}}
      @media(prefers-reduced-motion:reduce){.gs-sp{animation:none}}`;
    document.head.appendChild(s);
  }
})();
