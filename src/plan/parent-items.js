/* منصة دينا — بنود أولياء الأمور V.pitems + معاينة صفحة «خطط أبنائي» V.pview
   البنود: مراجعات، أسئلة من البنك، ملفات، صور، روابط، فيديو، اختبارات إلكترونية، مصادر، نصوص — تُعرض بترتيب جميل في
   parents.html و family.html (العرض المشترك pitems.js = window.DinaItems). جدول parent_items (sql/110c).
   الإدارة: المالك، ومن يُمنح الوحدة «pitems» من الصلاحيات مع تفعيل المفتاح pitems في «تخصيص صفحة المعلم».
   الإعدادات (للمالك): schools.settings.pitems {title, place, layout, openN, ans, print, pdf, download, dates, subject, count, parents, family, approve, cats[]}
   ونافذة الأسابيع لأولياء الأمور: schools.settings.portal.plan {past, ahead, next} (sql/110a). */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc } = A;
  const AR = A.AR || (n => String(n));
  const DI = () => window.DinaItems;
  const own = () => !!(S.me && S.me.is_owner);
  const can = () => own() || (A.hasModule && A.hasModule('pitems') && !!(A.tfeat && A.tfeat('pitems')));
  const today = () => A.isoDate ? A.isoDate(new Date()) : new Date().toISOString().slice(0, 10);
  const cfg = () => DI().cfgOf(((S.school || {}).settings || {}).pitems);
  const ST = { published: ['منشور', 'st-approved'], pending: ['بانتظار الاعتماد', 'st-submitted'], draft: ['مسودة', 'st-empty'], hidden: ['مخفي', 'st-returned'] };
  const AT = [['file', '📎', 'ملفات'], ['images', '🖼️', 'صور'], ['questions', '❓', 'أسئلة من البنك'], ['quiz', '🧩', 'اختبار/واجب إلكتروني'], ['resource', '📖', 'من المصادر'], ['link', '🔗', 'رابط'], ['video', '🎬', 'فيديو'], ['text', '📝', 'نص']];
  const ATN = Object.fromEntries(AT.map(a => [a[0], a[2]]));
  const MAXF = 3e6;
  const deb = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  A.I.pitems = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h11l5 5v11H4z"/><path d="M15 4v5h5"/><path d="M8 13h8M8 17h5"/><circle cx="8" cy="9" r="1"/></svg>';
  A.I.pview = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M10 18h4"/><path d="M9 7h6M9 10h6M9 13h4"/></svg>';
  if (A.NAV) {
    const at = () => { const i = A.NAV.findIndex(n => n[0] === 'posts'); return i < 0 ? A.NAV.length : i + 1; };
    if (!A.NAV.some(n => n[0] === 'pview')) A.NAV.splice(at(), 0, ['pview', 'معاينة خطط أبنائي', () => own()]);
    if (!A.NAV.some(n => n[0] === 'pitems')) A.NAV.splice(at(), 0, ['pitems', 'بنود أولياء الأمور', () => can()]);
  }

  if (!document.getElementById('pim-css')) { const s = document.createElement('style'); s.id = 'pim-css'; s.textContent = `
.pim-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.pim-tabs button{border:1.5px solid #DCE7F3;background:#fff;border-radius:12px;padding:8px 14px;min-height:42px;font:inherit;font-weight:800;color:#40526a;cursor:pointer}
.pim-tabs button[aria-pressed="true"]{background:#082B5A;border-color:#082B5A;color:#fff}
.pim-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
.pim-bar .in{min-height:42px}.pim-bar select.in{width:auto;min-width:150px;flex:0 1 auto}.pim-bar .grow{flex:1;min-width:180px}
.pim-g{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr))}
.pim-c{background:#fff;border:1px solid #DCE7F3;border-radius:16px;box-shadow:0 12px 26px -22px rgba(8,43,90,.6);display:flex;flex-direction:column;border-inline-start:5px solid var(--pc,#082B5A)}
.pim-c .bd{padding:12px 14px;flex:1}.pim-c h4{margin:6px 0 4px;font-size:16px;color:#082B5A}
.pim-c .ct{display:inline-flex;gap:5px;align-items:center;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:800;color:#fff;background:var(--pc,#082B5A)}
.pim-c .meta{font-size:12.5px;color:#5F7896;margin-top:6px;line-height:1.7}
.pim-c .ft{display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;border-top:1px solid #EEF3FA;align-items:center}
.pim-c .ft .sel{margin-inline-start:auto}
.pim-c.off{opacity:.62}
.pim-cats{display:flex;gap:6px;flex-wrap:wrap}
.pim-cats button{border:2px solid #DCE7F3;background:#fff;border-radius:999px;padding:7px 12px;min-height:42px;font:inherit;font-weight:800;cursor:pointer;color:#40526a}
.pim-cats button[aria-pressed="true"]{border-color:var(--pc);color:var(--pc);background:color-mix(in srgb,var(--pc) 9%,#fff)}
.pim-addb{display:flex;gap:6px;flex-wrap:wrap}
.pim-addb button{border:1.5px dashed #84B7E3;background:#F5F9FD;border-radius:12px;padding:8px 12px;min-height:42px;font:inherit;font-weight:700;color:#005499;cursor:pointer}
.pim-att{display:grid;gap:8px;margin-top:10px}
.pim-a{display:flex;gap:8px;align-items:center;border:1px solid #DCE7F3;border-radius:12px;padding:8px 10px;background:#fff;flex-wrap:wrap}
.pim-a .n{flex:1;min-width:150px}.pim-a .n .in{width:100%}
.pim-a .k{font-size:12px;font-weight:800;color:#005499;background:#E3F2FA;border-radius:999px;padding:2px 8px}
.pim-ed{display:grid;gap:14px;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);align-items:start}
.pim-pv{position:sticky;top:8px;background:#EEF3FA;border-radius:16px;padding:10px;max-height:78vh;overflow:auto}
.pim-pv h5{margin:0 0 6px;color:#5F7896;font-size:13px}
.pim-qp{max-height:46vh;overflow:auto;border:1px solid #DCE7F3;border-radius:12px;padding:6px}
.pim-qp label{display:flex;gap:8px;align-items:flex-start;padding:7px;border-bottom:1px solid #EEF3FA;cursor:pointer}
.pim-set{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))}
.pim-ci{display:grid;grid-template-columns:auto 56px 1fr 46px auto auto;gap:6px;align-items:center;border:1px solid #DCE7F3;border-radius:12px;padding:6px 8px;background:#fff}
.pim-ci input[type=color]{width:46px;height:38px;border:0;background:none;padding:0}
.pv-wrap{display:flex;justify-content:center;background:repeating-linear-gradient(45deg,#EEF3FA,#EEF3FA 12px,#E6EDF7 12px,#E6EDF7 24px);border-radius:18px;padding:14px;min-height:60vh}
.pv-dev{background:#0b1f3a;border-radius:28px;padding:12px;box-shadow:0 30px 60px -30px rgba(8,43,90,.7);transition:width .25s}
.pv-dev iframe{width:100%;height:76vh;border:0;border-radius:18px;background:#fff;display:block}
.pv-dev.full{border-radius:14px;padding:6px}
@media (max-width:900px){.pim-ed{grid-template-columns:1fr}.pim-pv{position:static;max-height:none}}
@media (prefers-reduced-motion:reduce){.pv-dev{transition:none}}`; document.head.appendChild(s); }

  // ---------- البيانات
  let CLS = null;
  async function classes() { if (CLS) return CLS; try { CLS = await api.list('classes', { section_id: S.sections.map(s => s.id) }, { select: 'id,name,section_id,active,stage,grade_word' }); } catch (_) { CLS = (S.allClasses || S.classes || []).slice(); }
    CLS = CLS.filter(c => c.active !== false); if (A.cmpCls) CLS.sort(A.cmpCls); return CLS; }
  const clsName = id => ((CLS || []).find(c => c.id === id) || A.cls && A.cls(id) || {}).name || '';
  const secName = id => (S.sections.find(s => s.id === id) || {}).name || '';
  const audience = it => it.class_ids && it.class_ids.length ? (it.class_ids.length > 3 ? A.cnt ? A.cnt(it.class_ids.length, 'فصل', 'فصول') : AR(it.class_ids.length) + ' فصول' : it.class_ids.map(clsName).filter(Boolean).join('، ')) : it.section_id ? secName(it.section_id) : 'كل المدرسة';
  const toView = it => ({ id: it.id, cat: it.cat, title: it.title || 'بلا عنوان', body: it.body, subject: it.subject_id ? (A.subjName ? A.subjName(it.subject_id) : '') : '', week: it.week_id ? ((S.weeksAll || S.weeks || []).find(w => w.id === it.week_id) || {}).word : '', from: it.starts_on, to: it.ends_on, pinned: it.pinned, att: it.att || [], opts: it.opts || {} });
  const live = it => it.status === 'published' && it.starts_on <= today() && (!it.ends_on || it.ends_on >= today());
  async function saveSettings(patch) { const settings = { ...(S.school.settings || {}), ...patch }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; }

  // ---------- الصفحة
  V.pitems = async function (root) {
    if (!can()) { root.innerHTML = ''; location.hash = '#/home'; return; }
    if (!DI()) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر تحميل العرض', 'حدّث الصفحة.')}</div>`; return; }
    const tab = A.LS.get('pim_tab') || 'list';
    const tabs = [['list', 'البنود'], ...(own() ? [['set', 'الإعدادات والفئات'], ['pv', 'معاينة ما يراه ولي الأمر']] : [])];
    root.innerHTML = `<div class="head"><div class="grow"><h2 style="margin:0">${A.I.pitems ? '' : ''}بنود أولياء الأمور</h2><p class="sub" style="margin:2px 0 0">مراجعات وأسئلة وملفات وروابط وفيديو واختبارات تظهر مرتبة لأولياء الأمور في صفحة «خطط أبنائي» وبوابة ولي الأمر.</p></div></div>
      ${tabs.length > 1 ? `<div class="pim-tabs" role="group" aria-label="الأقسام">${tabs.map(([k, l]) => `<button type="button" data-tb="${k}" aria-pressed="${tab === k}">${l}</button>`).join('')}</div>` : ''}<div id="pimB"><div class="spinner"></div></div>`;
    $$('[data-tb]', root).forEach(b => b.onclick = () => { A.LS.set('pim_tab', b.dataset.tb); V.pitems(root); });
    const B = $('#pimB', root); await classes();
    if (tab === 'set' && own()) return settingsView(B);
    if (tab === 'pv' && own()) return previewView(B);
    return listView(B, root);
  };

  async function listView(B, root) {
    let L = []; try { L = await api.list('parent_items', {}, { order: 'created_at', desc: true }); } catch (e) { B.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', esc(e.message))}</div>`; return; }
    const C = cfg(), f = A.LS.get('pim_f') || { q: '', cat: '', st: '' }, sel = new Set();
    L.sort((a, b) => (b.pinned - a.pinned) || (a.sort - b.sort) || String(b.starts_on).localeCompare(a.starts_on));
    const vis = () => L.filter(it => (!f.cat || it.cat === f.cat) && (!f.st || (f.st === 'live' ? live(it) : it.status === f.st)) && (!f.q || A.normKey([it.title, it.body].join(' ')).includes(A.normKey(f.q))));
    const pend = L.filter(x => x.status === 'pending').length;
    const card = it => { const c = DI().catOf(C, it.cat), [sl, sc] = ST[it.status] || ST.draft, mine = own() || it.created_by === S.me.id;
      return `<div class="pim-c ${live(it) ? '' : 'off'}" style="--pc:${esc(c.c)}"><div class="bd"><span class="ct">${esc(c.ic)} ${esc(c.n)}</span> <span class="pill ${sc}">${sl}</span>${it.pinned ? ' <span class="pill st-submitted">مثبّت</span>' : ''}${it.status === 'published' && !live(it) ? ' <span class="pill st-empty">خارج فترة الظهور</span>' : ''}
        <h4>${esc(it.title)}</h4><div class="meta">👥 ${esc(audience(it))} · 📅 ${AR(it.starts_on)}${it.ends_on ? ' ← ' + AR(it.ends_on) : ''}<br>📎 ${AR((it.att || []).length)} مرفق${(it.att || []).length ? ': ' + [...new Set((it.att || []).map(a => ATN[a.t]))].join('، ') : ''} · 👁 ${AR(it.views || 0)} مشاهدة${own() && it.created_by && it.created_by !== S.me.id && A.personName ? ' · ✍ ' + esc(A.personName(it.created_by)) : ''}</div></div>
        <div class="ft">${own() && it.status === 'pending' ? `<button class="btn ok sm" data-ap="${it.id}">اعتماد ونشر</button>` : ''}${mine ? `<button class="btn ghost sm" data-ed="${it.id}">تعديل</button>` : ''}<button class="btn ghost sm" data-vw="${it.id}">معاينة</button><button class="btn ghost sm" data-cp="${it.id}">نسخ</button>
          ${mine ? `<button class="btn ghost sm" data-pn="${it.id}">${it.pinned ? 'إلغاء التثبيت' : 'تثبيت'}</button>${it.status === 'published' ? `<button class="btn ghost sm" data-hd="${it.id}">إخفاء</button>` : it.status !== 'pending' ? `<button class="btn ghost sm" data-pb="${it.id}">${own() ? 'نشر' : 'إرسال للنشر'}</button>` : ''}<button class="btn bad sm" data-dl="${it.id}">حذف</button>` : ''}
          ${own() ? `<label class="chk sel"><input type="checkbox" data-sl="${it.id}" aria-label="تحديد ${esc(it.title)}"></label>` : ''}</div></div>`; };
    const grid = () => { const l = vis(), G = $('#pimG', B); sel.clear(); const bar = $('#pimSel', B); if (bar) bar.classList.add('hidden');
      G.innerHTML = `<div class="small muted" style="margin-bottom:8px">${AR(l.length)} من ${AR(L.length)} بند · الظاهر لأولياء الأمور الآن: ${AR(L.filter(live).length)}</div>
        <div class="pim-g">${l.map(card).join('') || A.emptyBox('لا توجد بنود', 'أضف أول بند: مراجعة، أسئلة، ملف، فيديو…')}</div>`;
      const get = id => L.find(x => x.id === id);
      $$('[data-ed]', G).forEach(b => b.onclick = () => editor(get(b.dataset.ed), () => listView(B, root)));
      $$('[data-cp]', G).forEach(b => b.onclick = () => { const it = get(b.dataset.cp); editor({ ...it, id: null, title: it.title + ' (نسخة)', status: 'draft', views: 0, created_by: null }, () => listView(B, root)); });
      $$('[data-vw]', G).forEach(b => b.onclick = () => previewItem(get(b.dataset.vw)));
      const upd = (id, p, msg) => A.run(null, async () => { await api.upd('parent_items', id, p); A.toast(msg, 'ok'); listView(B, root); });
      $$('[data-ap]', G).forEach(b => b.onclick = () => upd(b.dataset.ap, { status: 'published' }, 'اعتُمد ونُشر'));
      $$('[data-pb]', G).forEach(b => b.onclick = () => upd(b.dataset.pb, { status: 'published' }, own() ? 'نُشر لأولياء الأمور' : 'أُرسل للنشر'));
      $$('[data-hd]', G).forEach(b => b.onclick = () => upd(b.dataset.hd, { status: 'hidden' }, 'أُخفي'));
      $$('[data-pn]', G).forEach(b => b.onclick = () => { const it = get(b.dataset.pn); upd(it.id, { pinned: !it.pinned }, it.pinned ? 'أُلغي التثبيت' : 'ثُبّت أولاً'); });
      $$('[data-dl]', G).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذا البند نهائياً؟', 'حذف', true))) return; A.run(b, async () => { await api.del('parent_items', b.dataset.dl); A.toast('حُذف', 'ok'); listView(B, root); }); });
      $$('[data-sl]', G).forEach(i => i.onchange = () => { i.checked ? sel.add(i.dataset.sl) : sel.delete(i.dataset.sl); const bar = $('#pimSel', B); bar.classList.toggle('hidden', !sel.size); $('#pimSn', B).textContent = `المحدد: ${AR(sel.size)}`; });
    };
    const paint = () => {
      B.innerHTML = `<div class="pim-bar"><button class="btn" id="pimN">+ بند جديد</button><input class="in grow" id="pimQ" placeholder="بحث في البنود" value="${esc(f.q)}" aria-label="بحث">
        <select class="in" id="pimC" aria-label="الفئة"><option value="">كل الفئات</option>${C.cats.map(c => `<option value="${esc(c.k)}" ${f.cat === c.k ? 'selected' : ''}>${esc(c.ic + ' ' + c.n)}</option>`).join('')}</select>
        <select class="in" id="pimS" aria-label="الحالة"><option value="">كل الحالات</option><option value="live" ${f.st === 'live' ? 'selected' : ''}>ظاهر الآن</option>${Object.entries(ST).map(([k, v]) => `<option value="${k}" ${f.st === k ? 'selected' : ''}>${v[0]}${k === 'pending' && pend ? ` (${AR(pend)})` : ''}</option>`).join('')}</select>
        <button class="btn ghost" id="pimP">🖨 طباعة القائمة</button><button class="btn ghost" id="pimX">Excel</button></div>
        ${own() ? `<div class="pim-bar hidden" id="pimSel"><b id="pimSn"></b><button class="btn ok sm" data-bk="published">نشر</button><button class="btn ghost sm" data-bk="hidden">إخفاء</button><button class="btn bad sm" data-bk="del">حذف</button></div>` : ''}
        <div id="pimG"></div>`;
      const re = () => { A.LS.set('pim_f', f); paint(); };
      $('#pimQ', B).oninput = deb(e => { f.q = e.target.value; A.LS.set('pim_f', f); grid(); }, 250);
      $('#pimC', B).onchange = e => { f.cat = e.target.value; re(); }; $('#pimS', B).onchange = e => { f.st = e.target.value; re(); };
      $('#pimN', B).onclick = () => editor(null, () => listView(B, root));
      $('#pimP', B).onclick = () => printList(vis(), C); $('#pimX', B).onclick = () => excel(vis(), C);
      $$('[data-bk]', B).forEach(b => b.onclick = async () => { const k = b.dataset.bk; if (k === 'del' && !(await A.confirmBox(`حذف ${AR(sel.size)} بند نهائياً؟`, 'حذف', true))) return;
        A.run(b, async () => { for (const id of sel) k === 'del' ? await api.del('parent_items', id) : await api.upd('parent_items', id, { status: k }); A.toast('تم', 'ok'); listView(B, root); }); });
      grid();
    };
    paint();
  }

  function previewItem(it) {
    const m = A.modal(`<h3>معاينة كما يراها ولي الأمر</h3><div id="pimV" style="background:#EEF3FA;border-radius:14px;padding:10px"></div>`, { cls: 'wide' });
    const d = { cfg: { ...cfg(), openN: 9 }, items: [toView(it)] }; const box = $('#pimV', m.el); box.innerHTML = DI().html(d, { preview: true }); DI().bind(box, d, {});
  }
  function printList(l, C) {
    const rows = l.map((it, i) => `<tr><td>${AR(i + 1)}</td><td>${esc(DI().catOf(C, it.cat).n)}</td><td><b>${esc(it.title)}</b></td><td>${esc(audience(it))}</td><td>${(it.att || []).map(a => ATN[a.t]).join('، ')}</td><td>${AR(it.starts_on)}${it.ends_on ? ' ← ' + AR(it.ends_on) : ''}</td><td>${(ST[it.status] || [''])[0]}</td><td>${AR(it.views || 0)}</td></tr>`).join('');
    A.printDoc('بنود أولياء الأمور', `${AR(l.length)} بند · ${AR(today())}`, `<table><thead><tr><th>م</th><th>الفئة</th><th>العنوان</th><th>يظهر لـ</th><th>المرفقات</th><th>الفترة</th><th>الحالة</th><th>المشاهدات</th></tr></thead><tbody>${rows}</tbody></table>`, true);
  }
  function excel(l, C) {
    if (!window.XLSX) return A.toast('مكتبة Excel غير محمّلة', 'err');
    const rows = l.map(it => ({ 'الفئة': DI().catOf(C, it.cat).n, 'العنوان': it.title, 'النص': it.body || '', 'يظهر لـ': audience(it), 'المادة': it.subject_id && A.subjName ? A.subjName(it.subject_id) : '', 'من': it.starts_on, 'إلى': it.ends_on || '', 'الحالة': (ST[it.status] || [''])[0], 'مثبّت': it.pinned ? 'نعم' : '', 'المرفقات': (it.att || []).map(a => `${ATN[a.t]}: ${a.name || a.url || a.code || (a.qs ? a.qs.length + ' سؤال' : '')}`).join(' | '), 'المشاهدات': it.views || 0 }));
    const wb = XLSX.utils.book_new(), ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ '': 'لا بيانات' }]); ws['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws, 'البنود'); XLSX.writeFile(wb, 'بنود أولياء الأمور.xlsx');
  }

  // ---------- المحرر
  function editor(src, done) {
    const isNew = !src || !src.id, C = cfg();
    const it = { cat: (C.cats.find(c => c.on !== false) || C.cats[0]).k, title: '', body: '', subject_id: null, week_id: null, section_id: null, class_ids: [], starts_on: today(), ends_on: null, pinned: false, status: own() ? 'published' : 'pending', att: [], opts: {}, ...(src || {}) };
    it.att = JSON.parse(JSON.stringify(it.att || [])); it.opts = { ...(it.opts || {}) }; it.class_ids = (it.class_ids || []).slice();
    let aud = it.class_ids.length ? 'classes' : it.section_id ? 'section' : 'all', asec = it.section_id || S.sectionId;
    const weeks = (S.weeksAll || S.weeks || []).filter(w => !w.archived).slice().sort((a, b) => String(a.start_date).localeCompare(b.start_date));
    const m = A.modal(`<h3>${isNew ? 'بند جديد لأولياء الأمور' : 'تعديل البند'}</h3><div class="pim-ed"><div>
      <div class="field"><label>الفئة</label><div class="pim-cats" id="eC">${C.cats.map(c => `<button type="button" data-c="${esc(c.k)}" aria-pressed="${it.cat === c.k}" style="--pc:${esc(c.c)}">${esc(c.ic)} ${esc(c.n)}${c.on === false ? ' (مخفية)' : ''}</button>`).join('')}</div></div>
      <div class="field"><label for="eT">العنوان</label><input class="in" id="eT" maxlength="150" value="${esc(it.title)}" placeholder="مثال: مراجعة الوحدة الثالثة — رياضيات"></div>
      <div class="field"><label for="eB">وصف أو تعليمات لولي الأمر (اختياري)</label><textarea class="in" id="eB" rows="3">${esc(it.body || '')}</textarea></div>
      <div class="grid g2"><div class="field"><label for="eS">المادة (اختياري)</label><select class="in" id="eS"><option value="">—</option>${(S.subjects || []).map(s => `<option value="${s.id}" ${it.subject_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="eW">مرتبط بأسبوع (اختياري)</label><select class="in" id="eW"><option value="">يظهر في كل الأسابيع</option>${weeks.map(w => `<option value="${w.id}" ${it.week_id === w.id ? 'selected' : ''}>الأسبوع ${esc(w.word)}${S.sections.length > 1 ? ' — ' + esc(secName(w.section_id)) : ''}</option>`).join('')}</select></div></div>
      <div class="field"><label>المرفقات والمحتوى</label><div class="pim-addb" id="eAdd">${AT.map(([k, ic, n]) => `<button type="button" data-ad="${k}">${ic} ${n}</button>`).join('')}</div><input type="file" id="eF" multiple hidden><input type="file" id="eI" accept="image/*" multiple hidden><div class="pim-att" id="eA"></div></div>
      <div class="field"><label>يظهر لـ</label><div class="pim-cats" id="eAu">${[['all', 'كل المدرسة'], ['section', 'قسم'], ['classes', 'فصول محددة']].map(([k, l]) => `<button type="button" data-au="${k}" aria-pressed="${aud === k}" style="--pc:#082B5A">${l}</button>`).join('')}</div>
        <div id="eAuS" style="margin-top:8px"></div></div>
      <div class="grid g2"><div class="field"><label for="eD1">يظهر من</label><input class="in" type="date" id="eD1" value="${it.starts_on || today()}"></div><div class="field"><label for="eD2">إلى (اختياري)</label><input class="in" type="date" id="eD2" value="${it.ends_on || ''}"></div></div>
      <div class="grid g2"><div class="field"><label for="eAns">إجابات الأسئلة</label><select class="in" id="eAns">${[['', 'حسب الإعدادات العامة'], ['btn', 'زر «إظهار الإجابة»'], ['always', 'ظاهرة دائماً'], ['never', 'مخفية (للتدريب فقط)']].map(([k, l]) => `<option value="${k}" ${(it.opts.ans || '') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="eDl">تنزيل الملفات</label><select class="in" id="eDl"><option value="">مسموح</option><option value="no" ${it.opts.download === false ? 'selected' : ''}>عرض فقط</option></select></div></div>
      <label class="chk"><input type="checkbox" id="eP" ${it.pinned ? 'checked' : ''}> تثبيت في الأعلى</label>
      <div class="acts" style="margin-top:12px">${own() ? `<button class="btn" data-sv="published">${isNew ? 'نشر لأولياء الأمور' : 'حفظ ونشر'}</button>` : `<button class="btn" data-sv="published">إرسال للنشر</button>`}<button class="btn ghost" data-sv="draft">حفظ كمسودة</button>${own() && !isNew ? '<button class="btn ghost" data-sv="hidden">حفظ مخفياً</button>' : ''}</div>
    </div><aside class="pim-pv" aria-label="معاينة"><h5>معاينة حية كما يراها ولي الأمر</h5><div id="ePv"></div></aside></div>`, { cls: 'wide', sticky: true });
    const el = m.el;
    const read = () => { it.title = $('#eT', el).value.trim(); it.body = $('#eB', el).value.trim(); it.subject_id = $('#eS', el).value || null; it.week_id = $('#eW', el).value || null; it.starts_on = $('#eD1', el).value || today(); it.ends_on = $('#eD2', el).value || null; it.pinned = $('#eP', el).checked;
      const an = $('#eAns', el).value; if (an) it.opts.ans = an; else delete it.opts.ans; if ($('#eDl', el).value === 'no') it.opts.download = false; else delete it.opts.download;
      $$('[data-an]', el).forEach(i => { const a = it.att[+i.dataset.an]; if (a) a[i.dataset.f || 'name'] = i.value; }); };
    const pv = () => { read(); const box = $('#ePv', el), d = { cfg: { ...C, openN: 9 }, items: [toView({ ...it, title: it.title || 'عنوان البند' })] }; box.innerHTML = DI().html(d, { preview: true }); DI().bind(box, d, {}); };
    const audBox = () => { const b = $('#eAuS', el);
      if (aud === 'all') { b.innerHTML = '<span class="small muted">كل أولياء الأمور في كل الأقسام.</span>'; return; }
      b.innerHTML = `<select class="in" id="eSec" aria-label="القسم">${S.sections.map(s => `<option value="${s.id}" ${asec === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>${aud === 'classes' ? `<div class="row" style="gap:6px;margin:8px 0 4px"><button type="button" class="btn ghost sm" id="eCA">تحديد الكل</button><button type="button" class="btn ghost sm" id="eCN">إلغاء</button></div><div class="perm-grid">${(CLS || []).filter(c => c.section_id === asec).map(c => `<label class="chk"><input type="checkbox" value="${c.id}" ${it.class_ids.includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div>` : ''}`;
      $('#eSec', el).onchange = e => { asec = e.target.value; it.class_ids = it.class_ids.filter(id => ((CLS || []).find(c => c.id === id) || {}).section_id === asec); audBox(); };
      $$('.perm-grid input', b).forEach(i => i.onchange = () => { i.checked ? it.class_ids.push(i.value) : (it.class_ids = it.class_ids.filter(x => x !== i.value)); });
      if ($('#eCA', b)) { $('#eCA', b).onclick = () => { $$('.perm-grid input', b).forEach(i => { i.checked = true; if (!it.class_ids.includes(i.value)) it.class_ids.push(i.value); }); }; $('#eCN', b).onclick = () => { $$('.perm-grid input', b).forEach(i => { i.checked = false; }); it.class_ids = it.class_ids.filter(id => ((CLS || []).find(c => c.id === id) || {}).section_id !== asec); }; }
    };
    const attRow = (a, i) => { const k = AT.find(x => x[0] === a.t) || AT[0];
      const info = a.t === 'questions' ? `${AR((a.qs || []).length)} سؤال` : a.t === 'images' ? `${AR((a.list || []).length)} صورة` : a.t === 'quiz' ? `رمز ${esc(a.code || '')}` : a.t === 'text' ? '' : `<span dir="ltr" class="small muted" style="word-break:break-all">${esc(String(a.url || '').slice(0, 70))}</span>`;
      const main = a.t === 'text' ? `<textarea class="in" rows="3" data-an="${i}" data-f="body" placeholder="اكتب النص">${esc(a.body || '')}</textarea>` : `<input class="in" data-an="${i}" value="${esc(a.name || '')}" placeholder="الاسم الظاهر" aria-label="اسم المرفق"><div class="small muted">${info}</div>`;
      return `<div class="pim-a"><span class="k">${k[1]} ${k[2]}</span><div class="n">${main}</div><button type="button" class="btn ghost sm" data-mv="${i}|-1" aria-label="أعلى" ${i ? '' : 'disabled'}>↑</button><button type="button" class="btn ghost sm" data-mv="${i}|1" aria-label="أسفل" ${i < it.att.length - 1 ? '' : 'disabled'}>↓</button>${a.t === 'questions' ? `<button type="button" class="btn ghost sm" data-qe="${i}">تعديل الأسئلة</button>` : ''}<button type="button" class="btn bad sm" data-rm="${i}" aria-label="حذف المرفق">×</button></div>`; };
    const paintAtt = () => { const b = $('#eA', el); b.innerHTML = it.att.map(attRow).join('') || '<div class="small muted">لا مرفقات بعد — اختر نوعاً من الأعلى.</div>';
      $$('[data-an]', b).forEach(i => i.oninput = deb(pv, 350));
      $$('[data-rm]', b).forEach(x => x.onclick = () => { read(); it.att.splice(+x.dataset.rm, 1); paintAtt(); pv(); });
      $$('[data-mv]', b).forEach(x => x.onclick = () => { read(); const [i, d] = x.dataset.mv.split('|').map(Number), j = i + d; [it.att[i], it.att[j]] = [it.att[j], it.att[i]]; paintAtt(); pv(); });
      $$('[data-qe]', b).forEach(x => x.onclick = () => { read(); pickQuestions(it.att[+x.dataset.qe], r => { it.att[+x.dataset.qe] = r; paintAtt(); pv(); }); }); };
    const add = a => { read(); it.att.push(a); paintAtt(); pv(); };
    const upload = async files => { const out = []; for (const f of files) { if (f.size > MAXF) { A.toast(`«${f.name}» أكبر من ٣ ميجابايت — استخدم رابطاً (Drive مثلاً)`, 'err'); continue; } const url = await api.uploadAsset(f); out.push({ url, name: f.name, size: f.size, mime: f.type }); } return out; };
    $('#eF', el).onchange = e => A.run(null, async () => { const fs = [...e.target.files]; e.target.value = ''; A.toast('جارٍ الرفع…'); (await upload(fs)).forEach(x => it.att.push({ t: 'file', ...x })); paintAtt(); pv(); });
    $('#eI', el).onchange = e => A.run(null, async () => { const fs = [...e.target.files]; e.target.value = ''; A.toast('جارٍ الرفع…'); const l = await upload(fs); if (l.length) { read(); it.att.push({ t: 'images', name: '', list: l }); paintAtt(); pv(); } });
    $$('[data-ad]', el).forEach(b => b.onclick = () => { const k = b.dataset.ad;
      if (k === 'file') return $('#eF', el).click(); if (k === 'images') return $('#eI', el).click();
      if (k === 'text') return add({ t: 'text', body: '' });
      if (k === 'questions') return pickQuestions(null, r => add(r));
      if (k === 'quiz') return pickQuiz(r => add(r));
      if (k === 'resource') return pickRes(r => add(r));
      linkDialog(k, r => add(r)); });
    $$('#eC button', el).forEach(b => b.onclick = () => { it.cat = b.dataset.c; $$('#eC button', el).forEach(x => x.setAttribute('aria-pressed', x === b)); pv(); });
    $$('#eAu button', el).forEach(b => b.onclick = () => { aud = b.dataset.au; $$('#eAu button', el).forEach(x => x.setAttribute('aria-pressed', x === b)); audBox(); });
    ['#eT', '#eB'].forEach(s => $(s, el).oninput = deb(pv, 350)); ['#eS', '#eW', '#eD1', '#eD2', '#eAns', '#eDl', '#eP'].forEach(s => $(s, el).onchange = pv);
    $$('[data-sv]', el).forEach(b => b.onclick = () => A.run(b, async () => { read();
      if (!it.title) throw new Error('اكتب عنوان البند');
      if (it.ends_on && it.ends_on < it.starts_on) throw new Error('تاريخ النهاية قبل البداية');
      if (aud === 'classes' && !it.class_ids.length) throw new Error('اختر فصلاً واحداً على الأقل');
      if (!it.att.length && !it.body) throw new Error('أضف وصفاً أو مرفقاً واحداً على الأقل');
      it.att = it.att.filter(a => a.t !== 'text' || (a.body || '').trim());
      const rec = { cat: it.cat, title: it.title, body: it.body || null, subject_id: it.subject_id, week_id: it.week_id, starts_on: it.starts_on, ends_on: it.ends_on, pinned: it.pinned, att: it.att, opts: it.opts, status: b.dataset.sv,
        section_id: aud === 'all' ? null : asec, class_ids: aud === 'classes' ? it.class_ids : [] };
      let r; if (isNew) r = await api.ins('parent_items', [{ ...rec, school_id: S.school.id }]); else r = await api.upd('parent_items', it.id, rec);
      const st = (Array.isArray(r) ? r[0] : r || {}).status || rec.status;
      m.close(); done && done(); A.toast(st === 'published' ? 'نُشر لأولياء الأمور' : st === 'pending' ? 'أُرسل للاعتماد' : 'حُفظ', 'ok'); }));
    audBox(); paintAtt(); pv();
  }

  function linkDialog(k, done) {
    const m = A.modal(`<h3>${k === 'video' ? 'فيديو' : 'رابط'}</h3><div class="field"><label for="lU">الرابط</label><input class="in" id="lU" dir="ltr" placeholder="${k === 'video' ? 'https://youtube.com/watch?v=…' : 'https://'}"></div><div class="field"><label for="lN">الاسم الظاهر</label><input class="in" id="lN" placeholder="${k === 'video' ? 'شرح الدرس' : 'ملف المراجعة على Drive'}"></div>${k === 'video' ? '<p class="small muted">يوتيوب يُعرض داخل الصفحة. أو ارفع ملف فيديو صغيراً كـ«ملف».</p>' : ''}<div class="acts"><button class="btn" id="lGo">إضافة</button></div>`);
    $('#lGo', m.el).onclick = () => { const u = $('#lU', m.el).value.trim(); if (!/^https?:\/\//i.test(u)) return A.toast('الرابط يجب أن يبدأ بـ https://', 'err'); done({ t: k, url: u, name: $('#lN', m.el).value.trim() }); m.close(); };
  }
  async function pickQuiz(done) {
    const m = A.modal(`<h3>اختبار أو واجب إلكتروني</h3><input class="in" id="zQ" placeholder="بحث"><div class="pim-qp" id="zL" style="margin-top:8px"><div class="spinner"></div></div>`, { cls: 'wide' });
    let Z = []; try { Z = (await api.list('quizzes', { status: 'published' }, { order: 'created_at', desc: true, select: 'id,title,kind,code,subject_id,class_ids' })).filter(z => z.code); } catch (e) { $('#zL', m.el).innerHTML = A.emptyBox('تعذّر التحميل', esc(e.message)); return; }
    const K = { quiz: 'اختبار قصير', worksheet: 'ورقة عمل', homework: 'واجب إلكتروني', remedial: 'ورقة دعم' };
    const p = () => { const q = A.normKey($('#zQ', m.el).value.trim()); $('#zL', m.el).innerHTML = Z.filter(z => !q || A.normKey(z.title).includes(q)).slice(0, 200).map(z => `<label><input type="radio" name="zz" value="${z.id}"><span><b>${esc(z.title)}</b><br><span class="small muted">${K[z.kind] || z.kind} · ${esc(A.subjName ? A.subjName(z.subject_id) : '')} · ${esc((z.class_ids || []).map(clsName).filter(Boolean).slice(0, 4).join('، '))}</span></span></label>`).join('') || A.emptyBox('لا توجد اختبارات منشورة');
      $$('#zL input', m.el).forEach(i => i.onchange = () => { const z = Z.find(x => x.id === i.value); done({ t: 'quiz', code: z.code, name: z.title, sub: [K[z.kind], A.subjName ? A.subjName(z.subject_id) : ''].filter(Boolean).join(' · ') }); m.close(); }); };
    $('#zQ', m.el).oninput = p; p();
  }
  async function pickRes(done) {
    const m = A.modal(`<h3>من المصادر</h3><input class="in" id="rQ" placeholder="بحث"><div class="pim-qp" id="rL" style="margin-top:8px"><div class="spinner"></div></div>`, { cls: 'wide' });
    let R = []; try { R = (await api.list('resources', {}, { order: 'created_at', desc: true })).filter(r => r.url); } catch (e) { $('#rL', m.el).innerHTML = A.emptyBox('تعذّر التحميل', esc(e.message)); return; }
    const p = () => { const q = A.normKey($('#rQ', m.el).value.trim()); $('#rL', m.el).innerHTML = R.filter(r => !q || A.normKey(r.title || '').includes(q)).slice(0, 300).map(r => `<label><input type="checkbox" value="${r.id}"><span><b>${esc(r.title)}</b><br><span class="small muted">${esc([A.subjName ? A.subjName(r.subject_id) : '', r.note].filter(Boolean).join(' · '))}</span></span></label>`).join('') || A.emptyBox('لا توجد مصادر'); };
    m.el.insertAdjacentHTML('beforeend', '<div class="acts"><button class="btn" id="rGo">إضافة المحدد</button></div>');
    $('#rQ', m.el).oninput = p; p();
    $('#rGo', m.el).onclick = () => { const ids = $$('#rL input:checked', m.el).map(i => i.value); R.filter(r => ids.includes(r.id)).forEach(r => done({ t: 'resource', url: r.url, name: r.title, sub: A.subjName ? A.subjName(r.subject_id) : '' })); m.close(); };
  }
  // أسئلة من البنك (نسخة ثابتة داخل البند حتى لا يتأثر البنك)
  async function pickQuestions(cur, done) {
    const QT = { mcq: 'اختيار', multi: 'متعدد', tf: 'صواب وخطأ', short: 'قصير', essay: 'مقالي', blank: 'فراغات', match: 'توصيل', order: 'ترتيب' };
    const gk = c => `${c.stage}|${c.grade_word}`, grades = []; (CLS || []).forEach(c => { if (!grades.some(g => gk(g) === gk(c))) grades.push(c); });
    const picked = new Map(((cur && cur.qs) || []).map(q => [q.id || q.body, q]));
    const m = A.modal(`<h3>أسئلة من بنك الأسئلة</h3><div class="grid g2"><div class="field"><label for="qS">المادة</label><select class="in" id="qS">${(S.subjects || []).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label for="qG">الصف</label><select class="in" id="qG">${grades.map(c => `<option value="${esc(gk(c))}">${esc(A.gradeName ? A.gradeName(c.grade_word, c.stage) : c.grade_word + ' ' + c.stage)}</option>`).join('')}</select></div></div>
      <div class="field"><label for="qN">عنوان مجموعة الأسئلة</label><input class="in" id="qN" value="${esc((cur && cur.name) || '')}" placeholder="مثال: أسئلة مراجعة الوحدة الثانية"></div>
      <div class="row" style="gap:8px;margin-bottom:6px"><input class="in" id="qQ" placeholder="بحث في الأسئلة" style="flex:1;min-width:160px"><button type="button" class="btn ghost sm" id="qAll">تحديد الظاهر</button><button type="button" class="btn ghost sm" id="qNone">إلغاء الكل</button><b class="small" id="qCnt"></b></div>
      <div class="pim-qp" id="qL"><div class="spinner"></div></div><div class="acts"><button class="btn" id="qGo">اعتماد الأسئلة</button></div>`, { cls: 'wide', sticky: true });
    let Q = [];
    const cnt = () => $('#qCnt', m.el).textContent = `المحدد: ${AR(picked.size)}`;
    const snap = x => ({ id: x.id, qtype: x.qtype, body: x.body, options: x.options || [], answer: x.answer, explanation: x.explanation, image_url: x.image_url });
    const paint = () => { const q = A.normKey($('#qQ', m.el).value.trim()), l = Q.filter(x => !q || A.normKey(x.body || '').includes(q));
      $('#qL', m.el).innerHTML = l.map(x => `<label><input type="checkbox" value="${x.id}" ${picked.has(x.id) ? 'checked' : ''}><span><span class="pill">${QT[x.qtype] || x.qtype}</span> ${esc(String(x.body || '').slice(0, 180))}</span></label>`).join('') || A.emptyBox('لا أسئلة لهذه المادة والصف');
      $$('#qL input', m.el).forEach(i => i.onchange = () => { const x = Q.find(y => y.id === i.value); i.checked ? picked.set(x.id, snap(x)) : picked.delete(x.id); cnt(); }); cnt(); };
    const load = async () => { $('#qL', m.el).innerHTML = '<div class="spinner"></div>'; try { Q = (await api.list('questions', { subject_id: $('#qS', m.el).value, grade_key: $('#qG', m.el).value })).filter(x => x.shared || x.created_by === S.me.id || own()); } catch (_) { Q = []; } paint(); };
    $('#qS', m.el).onchange = load; $('#qG', m.el).onchange = load; $('#qQ', m.el).oninput = paint;
    $('#qAll', m.el).onclick = () => { $$('#qL input', m.el).forEach(i => { i.checked = true; const x = Q.find(y => y.id === i.value); picked.set(x.id, snap(x)); }); cnt(); };
    $('#qNone', m.el).onclick = () => { picked.clear(); $$('#qL input', m.el).forEach(i => i.checked = false); cnt(); };
    $('#qGo', m.el).onclick = () => { if (!picked.size) return A.toast('اختر سؤالاً واحداً على الأقل', 'err'); done({ t: 'questions', name: $('#qN', m.el).value.trim() || 'أسئلة', qs: [...picked.values()] }); m.close(); };
    await load();
  }

  // ---------- الإعدادات (للمالك)
  function settingsView(B) {
    const C = JSON.parse(JSON.stringify(cfg())), P = { past: 28, ahead: 30, next: true, ...((((S.school.settings || {}).portal) || {}).plan || {}) };
    const chk = (k, l) => `<label class="chk"><input type="checkbox" data-k="${k}" ${C[k] !== false ? 'checked' : ''}> ${l}</label>`;
    const sel = (k, l, opts) => `<div class="field"><label for="s_${k}">${l}</label><select class="in" id="s_${k}" data-s="${k}">${opts.map(([v, n]) => `<option value="${v}" ${String(C[k]) === String(v) ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
    const paint = () => {
      B.innerHTML = `<div class="pim-set"><div class="card"><h3 style="margin-top:0">العرض لأولياء الأمور</h3>
        <div class="field"><label for="sT">عنوان القسم في صفحة ولي الأمر</label><input class="in" id="sT" value="${esc(C.title)}"></div>
        ${sel('place', 'مكانه في «خطط أبنائي»', [['before', 'قبل الخطة'], ['after', 'بعد الخطة مباشرة'], ['end', 'آخر الصفحة']])}
        ${sel('layout', 'طريقة العرض', [['tabs', 'أزرار تصفية بالفئات'], ['sections', 'أقسام متتالية بعناوين']])}
        ${sel('openN', 'البنود المفتوحة تلقائياً', [[0, 'لا شيء (عناوين فقط)'], [1, 'الأول'], [2, 'أول اثنين'], [3, 'أول ثلاثة'], [99, 'الكل']])}
        ${sel('ans', 'إجابات الأسئلة افتراضياً', [['btn', 'زر «إظهار الإجابة»'], ['always', 'ظاهرة دائماً'], ['never', 'مخفية']])}</div>
        <div class="card"><h3 style="margin-top:0">الطباعة والتصدير والظهور</h3><div style="display:grid;gap:8px">
        ${chk('print', 'أزرار الطباعة لكل بند (وبالإجابات للأسئلة)')}${chk('pdf', 'تنزيل PDF')}${chk('download', 'تنزيل الملفات المرفقة')}${chk('dates', 'إظهار التواريخ')}${chk('subject', 'إظهار المادة')}${chk('count', 'إظهار عدد المرفقات')}
        <hr style="border:0;border-top:1px solid #EEF3FA;width:100%">${chk('parents', 'يظهر في صفحة «خطط أبنائي» (الرابط العام)')}${chk('family', 'يظهر في بوابة ولي الأمر (الحساب)')}${chk('approve', 'بنود الموظفين تحتاج اعتمادي قبل النشر')}</div></div>
        <div class="card"><h3 style="margin-top:0">الأسابيع الظاهرة لأولياء الأمور</h3><p class="small muted" style="margin-top:0">تنطبق على صفحة «خطط أبنائي» وبوابة ولي الأمر.</p>
          <div class="field"><label for="wP">الأسابيع السابقة حتى (يوماً)</label><input class="in" id="wP" type="number" min="0" max="365" value="${+P.past}"></div>
          <div class="field"><label for="wA">الأسابيع القادمة المنشورة</label><select class="in" id="wA">${[[7, 'أسبوع واحد قادم'], [14, 'حتى أسبوعين'], [30, 'حتى شهر'], [60, 'حتى شهرين'], [-1, 'كل المنشور القادم']].map(([v, n]) => `<option value="${v}" ${+P.ahead === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <label class="chk"><input type="checkbox" id="wN" ${P.next !== false ? 'checked' : ''}> بعد انتهاء أيام الأسبوع الحالي يفتح الأسبوع التالي المنشور تلقائياً</label></div></div>
        <div class="card" style="margin-top:12px"><div class="row sp"><h3 style="margin:0">الفئات (البنود)</h3><button class="btn ghost sm" id="cAdd">+ فئة جديدة</button></div><p class="small muted">الاسم والرمز واللون والترتيب، وإخفاء أي فئة عن أولياء الأمور.</p>
          <div style="display:grid;gap:6px" id="cL">${C.cats.map((c, i) => `<div class="pim-ci"><label class="chk" title="ظاهرة"><input type="checkbox" data-co="${i}" ${c.on !== false ? 'checked' : ''} aria-label="إظهار ${esc(c.n)}"></label><input class="in" data-ci="${i}" value="${esc(c.ic)}" aria-label="الرمز" style="text-align:center"><input class="in" data-cn="${i}" value="${esc(c.n)}" aria-label="الاسم"><input type="color" data-cc="${i}" value="${esc(c.c)}" aria-label="اللون"><span class="row" style="gap:4px"><button type="button" class="btn ghost sm" data-cm="${i}|-1" ${i ? '' : 'disabled'} aria-label="أعلى">↑</button><button type="button" class="btn ghost sm" data-cm="${i}|1" ${i < C.cats.length - 1 ? '' : 'disabled'} aria-label="أسفل">↓</button></span><button type="button" class="btn bad sm" data-cx="${i}" aria-label="حذف الفئة">×</button></div>`).join('')}</div></div>
        <div class="acts" style="position:sticky;bottom:0;background:var(--bg,#EEF3FA);padding:10px 0"><button class="btn" id="sGo">حفظ الإعدادات</button><button class="btn ghost" id="sDef">استعادة الافتراضي</button></div>`;
      const rd = () => { C.title = $('#sT', B).value.trim() || DI().DEF.title; $$('[data-s]', B).forEach(s => C[s.dataset.s] = s.dataset.s === 'openN' ? +s.value : s.value); $$('[data-k]', B).forEach(i => C[i.dataset.k] = i.checked);
        $$('[data-co]', B).forEach(i => C.cats[+i.dataset.co].on = i.checked); $$('[data-ci]', B).forEach(i => C.cats[+i.dataset.ci].ic = i.value.trim() || '📌'); $$('[data-cn]', B).forEach(i => C.cats[+i.dataset.cn].n = i.value.trim() || 'فئة'); $$('[data-cc]', B).forEach(i => C.cats[+i.dataset.cc].c = i.value); };
      $('#cAdd', B).onclick = () => { rd(); C.cats.push({ k: 'c' + Date.now().toString(36), n: 'فئة جديدة', ic: '📌', c: '#005499', on: true }); paint(); };
      $$('[data-cm]', B).forEach(b => b.onclick = () => { rd(); const [i, d] = b.dataset.cm.split('|').map(Number); [C.cats[i], C.cats[i + d]] = [C.cats[i + d], C.cats[i]]; paint(); });
      $$('[data-cx]', B).forEach(b => b.onclick = async () => { rd(); const c = C.cats[+b.dataset.cx]; let n = 0; try { n = (await api.list('parent_items', { cat: c.k }, { select: 'id' })).length; } catch (_) { }
        if (n) return A.toast(`لا يمكن حذف «${c.n}»: فيها ${AR(n)} بند — أخفِها بدلاً من ذلك أو انقل بنودها`, 'err'); C.cats.splice(+b.dataset.cx, 1); paint(); });
      $('#sDef', B).onclick = async () => { if (!(await A.confirmBox('استعادة الإعدادات والفئات الافتراضية؟ (البنود لا تتأثر)', 'استعادة'))) return; Object.assign(C, JSON.parse(JSON.stringify(DI().DEF))); paint(); };
      $('#sGo', B).onclick = e => A.run(e.currentTarget, async () => { rd();
        const plan = { past: Math.max(0, Math.min(365, +$('#wP', B).value || 0)), ahead: +$('#wA', B).value, next: $('#wN', B).checked };
        await saveSettings({ pitems: C, portal: { ...((S.school.settings || {}).portal || {}), plan } }); A.toast('حُفظت الإعدادات — تظهر فوراً لأولياء الأمور', 'ok'); });
    };
    paint();
  }

  // ---------- معاينة صفحة «خطط أبنائي» داخل المنصة
  async function previewView(B) {
    let L; try { L = (await api.parentLinks())[0]; } catch (e) { B.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', esc(e.message))}</div>`; return; }
    if (!L) { B.innerHTML = `<div class="card">${A.emptyBox('لا يوجد رابط لأولياء الأمور', 'أنشئه من لوحة المطوّر.')}</div>`; return; }
    await classes();
    const st = A.LS.get('pv_st') || {}; let sec = st.sec && S.sections.some(s => s.id === st.sec) ? st.sec : S.sectionId, cid = st.cls, dev = st.dev || 'phone';
    const base = location.origin + location.pathname.replace(/[^/]*$/, '') + 'parents.html?t=' + encodeURIComponent(L.token);
    const DEV = { phone: ['جوال', 400], tab: ['لوحي', 780], desk: ['حاسوب', 1240], full: ['ملء العرض', 0] };
    const paint = () => { const list = (CLS || []).filter(c => c.section_id === sec); if (!list.some(c => c.id === cid)) cid = (list[0] || {}).id; A.LS.set('pv_st', { sec, cls: cid, dev });
      const url = base + (cid ? '&c=' + cid : '') + '&pv=1', pub = base + (cid ? '&c=' + cid : '');
      B.innerHTML = `<div class="card" style="margin-bottom:12px"><div class="pim-bar" style="margin:0">${S.sections.length > 1 ? `<select class="in" id="vS" aria-label="القسم">${S.sections.map(s => `<option value="${s.id}" ${s.id === sec ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : ''}
        <select class="in" id="vC" aria-label="الفصل">${list.map(c => `<option value="${c.id}" ${c.id === cid ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
        <div class="pim-tabs" role="group" aria-label="مقاس الجهاز" style="margin:0">${Object.entries(DEV).map(([k, [n]]) => `<button type="button" data-dv="${k}" aria-pressed="${dev === k}">${n}</button>`).join('')}</div>
        <button class="btn ghost" id="vR">↻ تحديث</button><a class="btn ghost" href="${esc(pub)}" target="_blank" rel="noopener">فتح في نافذة</a><button class="btn ghost" id="vCp">نسخ رابط هذا الفصل</button></div>
        <p class="small muted" style="margin:8px 0 0">هذه هي الصفحة نفسها التي يفتحها أولياء الأمور، بالبيانات الحية (المعتمد والمنشور فقط). المعاينة لا تُحتسب مشاهدة ولا تحفظ اختيارات على جهازك.</p></div>
        <div class="pv-wrap"><div class="pv-dev ${dev === 'full' ? 'full' : ''}" style="width:${DEV[dev][1] ? `min(100%,${DEV[dev][1]}px)` : '100%'}"><iframe id="vF" title="معاينة صفحة خطط أبنائي" src="${esc(url)}"></iframe></div></div>`;
      if ($('#vS', B)) $('#vS', B).onchange = e => { sec = e.target.value; cid = null; paint(); };
      $('#vC', B).onchange = e => { cid = e.target.value; paint(); };
      $$('[data-dv]', B).forEach(b => b.onclick = () => { dev = b.dataset.dv; paint(); });
      $('#vR', B).onclick = () => { const f = $('#vF', B); f.src = f.src; };
      $('#vCp', B).onclick = async () => { try { await navigator.clipboard.writeText(pub); A.toast('نُسخ الرابط', 'ok'); } catch (_) { A.toast(pub); } };
    };
    paint();
  }
  V.pview = async function (root) {
    if (!own()) { root.innerHTML = ''; location.hash = '#/home'; return; }
    root.innerHTML = `<div class="head"><div class="grow"><h2 style="margin:0">معاينة صفحة أولياء الأمور</h2><p class="sub" style="margin:2px 0 0">ما يظهر الآن لأولياء الأمور في «خطط أبنائي» لأي فصل، بمقاس الجوال أو اللوحي أو الحاسوب.</p></div><a class="btn ghost" href="#/pitems">بنود أولياء الأمور</a></div><div id="pvB"><div class="spinner"></div></div>`;
    previewView($('#pvB', root));
  };
})();
