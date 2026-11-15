/* منصة دينا — الزيارات الصفية V.visits (sql/108)
   زيارات المدير الأكاديمي/مدير المدرسة/المشرف/الوكيل… لأي فصل:
   - يختار الزائر الفصل ← تُحدَّد الحصة الجارية من الجدول الزمني (DinaBell عبر A.attTimes/A.curPeriod) ← تُجلب بيانات الحصة
     من الخطة الأسبوعية (المعلم، المادة، الدرس، الواجب، حالة التنفيذ) والتحضير (الأهداف، الاستراتيجيات…). كل شيء قابل للتعديل:
     الحصة (تقديم/تأخير/أي حصة في اليوم)، التاريخ، المعلم، المادة، الدرس…
   - نوع الزيارة بمسميات يحددها المالك (زيارة صفية، مفاجئة، متابعة، جولة إشرافية…) أو مسمى حر.
   - نموذج واحد أو أكثر من «خطة ونماذج الإشراف» (مختصر/مفصّل/…) تُدمج في استمارة واحدة، مع «تخصيص العناصر»
     (إضافة/تعديل/حذف/ترتيب البنود والكتل) وحفظ التخصيص كنموذج جاهز.
   - بند «السير في المنهج»: مطابقة ما في الخطة الأسبوعية بما يجري في الحصة (الدرس، الأهداف، الأنشطة، التقويم، الواجب، التقدم).
   - الاستمارة تُحفظ في form_tasks (mode = 'sign', visit = بيانات الزيارة) فتُعبَّأ وتُوقَّع من محرك النماذج (A._forms.openTask)،
     وتُرسل للمعلم للاطلاع والتوقيع مع ملاحظته، ويُوثَّق كل ذلك في السجل (trail).
   - القائمة والتصفية والتقارير والتغطية (من لم يُزر) وExcel والطباعة، والتكامل مع ملفات الإشراف (sup_docs: إرسال/رفع)، والإعدادات للمالك.
   الظهور لغير المالك: منحة «visits» أو «supervision» + تفعيل المالك tfeat('visits'). */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc } = A;
  const AR = A.AR || (n => String(n));
  const DEMO = /[?&]demo=1/.test(location.search);
  const today = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const nowIso = () => new Date().toISOString();
  const dt = (d, wd) => d ? (A.arDate ? A.arDate(String(d).slice(0, 10), wd) : String(d).slice(0, 10)) : '—';
  const nm = id => (id && A.personName && A.personName(id)) || ((S.staff || []).find(p => p.id === id) || {}).full_name || '—';
  const nk = s => A.normKey ? A.normKey(s || '') : String(s || '');
  const own = () => !!(S.me && S.me.is_owner);
  const can = () => own() || !!(A.hasModule && (A.hasModule('visits') || A.hasModule('supervision')));
  const isAdm = () => own() || !!(A.hasModule && A.hasModule('supervision'));
  const clone = o => JSON.parse(JSON.stringify(o == null ? null : o));
  const uid = p => (p || 'x') + Math.random().toString(36).slice(2, 8);
  const PERW = A.PER || [];
  const perL = p => p ? 'الحصة ' + (PERW[p - 1] || AR(p)) : '—';
  const addD = (iso, n) => { const d = A.parseDate(iso); d.setDate(d.getDate() + n); return A.isoDate(d); };
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (_) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { } };

  // ---------- الإعدادات ----------
  const DEF = {
    title: 'الزيارات الصفية',
    types: ['زيارة صفية', 'زيارة مفاجئة', 'زيارة متابعة', 'جولة إشرافية', 'زيارة تطويرية', 'زيارة إشادة وتحفيز'],
    defType: 'زيارة صفية',
    roles: ['المدير الأكاديمي', 'مدير المدرسة', 'المشرف التربوي', 'وكيل الشؤون التعليمية', 'رئيس القسم', 'المشرف الزائر'],
    tpls: ['c-brief', 'c-class', 'c-teacher', 'c-notes', 'f-mutual', 'f-applied'],
    defTpls: ['c-brief'],
    tlabels: { 'c-brief': 'مختصر', 'c-class': 'مفصّل', 'c-teacher': 'تفصيلي بالأوزان', 'c-notes': 'ملاحظات وتوجيهات', 'f-mutual': 'تبادل زيارات', 'f-applied': 'درس تطبيقي' },
    pace: true, head: true, autoPeriod: true, notifyOwner: false, att: true, maxAtt: 4, presets: []
  };
  const cfg = () => { const c = { ...DEF, ...(((S.school || {}).settings || {}).visits || {}) }; c.tlabels = { ...DEF.tlabels, ...(c.tlabels || {}) }; return c; };
  async function saveCfg(patch) { const cur = ((S.school.settings || {}).visits) || {}; const settings = { ...(S.school.settings || {}), visits: { ...cur, ...patch } }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; }
  const myPref = () => lsGet('dina_vis_me_' + (S.me || {}).id, {});
  const setPref = p => lsSet('dina_vis_me_' + (S.me || {}).id, { ...myPref(), ...p });
  const myPresets = () => lsGet('dina_vis_presets_' + (S.me || {}).id, []);

  const STV = { assigned: ['مسودة لدى الزائر', ''], draft: ['مسودة لدى الزائر', ''], returned: ['مسودة لدى الزائر', ''], submitted: ['بانتظار توقيع المعلم', 'st-submitted'], approved: ['موقّعة ومكتملة', 'st-approved'] };
  const PACE = { match: ['مطابق للخطة', 'st-approved'], ahead: ['متقدم عن الخطة', 'st-submitted'], behind: ['متأخر عن الخطة', 'st-returned'], diff: ['مختلف عن الخطة', 'st-returned'], none: ['لا توجد خطة', ''] };
  const PACE_TXT = { match: 'مطابق للخطة', ahead: 'متقدم عن الخطة', behind: 'متأخر عن الخطة', diff: 'مختلف عن الخطة', none: 'لا توجد خطة للحصة' };
  const pill = (M, k) => { const v = M[k] || [k || '—', '']; return `<span class="pill ${v[1]}">${esc(v[0])}</span>`; };

  // ---------- التنقل ----------
  A.I.visits = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M19 3v4M17 5h4"/></svg>';
  if (A.NAV && !A.NAV.some(n => n[0] === 'visits')) { const i = A.NAV.findIndex(n => n[0] === 'forms'); A.NAV.splice(i < 0 ? A.NAV.length : i, 0, ['visits', 'الزيارات الصفية', () => !!S.me && (own() || (can() && !!(A.tfeat && A.tfeat('visits'))))]); }
  // المسمى من الإعدادات
  const navLabel = () => { const it = (A.NAV || []).find(n => n[0] === 'visits'); if (it) it[1] = cfg().title || DEF.title; };

  // ---------- الفصول والحصص والخطة ----------
  const classes = () => ((S.allClasses && S.allClasses.length ? S.allClasses : S.classes) || []).filter(c => c.active !== false && !c.is_test).slice().sort((a, b) => A.cmpCls ? A.cmpCls(a, b) : 0);
  const cName = id => (A.cls && A.cls(id) || {}).name || (classes().find(c => c.id === id) || {}).name || '';
  const times = cid => { try { return (A.attTimes && A.attTimes(cid)) || []; } catch (_) { return []; } };
  const nPer = (cid, extra) => Math.max(times(cid).length, +((A.section && A.section()) || {}).periods || 0, extra || 0, 1);
  const tOf = (cid, p) => times(cid).find(x => x.i === p);
  const nowPer = cid => { try { return A.curPeriod ? A.curPeriod(cid) : -1; } catch (_) { return -1; } };
  const weekFor = iso => (S.weeksAll || S.weeks || []).find(w => w.start_date && w.start_date <= iso && iso <= addD(w.start_date, 6));
  const ECACHE = new Map();
  async function dayEntries(cid, iso) {
    const w = weekFor(iso); if (!w) return { w: null, di: -1, list: [] };
    const di = Math.round((A.parseDate(iso) - A.parseDate(w.start_date)) / 864e5);
    let all;
    if (w.id === S.weekId) all = (S.allEntries || S.entries || []).filter(e => e.class_id === cid);
    else { const k = w.id + '|' + cid; if (!ECACHE.has(k)) { try { ECACHE.set(k, await api.list('plan_entries', { week_id: w.id, class_id: cid })); } catch (_) { ECACHE.set(k, []); } } all = ECACHE.get(k); }
    return { w, di, list: all.filter(e => e.day === di).sort((a, b) => a.period - b.period) };
  }
  const nowEntry = cid => { const p = nowPer(cid); if (p < 0) return null; try { return A.attEntryOf ? A.attEntryOf(cid, today(), p) : null; } catch (_) { return null; } };
  const PREPS = new Map();
  async function prepFor(subject_id, topic) {
    if (!subject_id || !(topic || '').trim()) return null;
    if (!PREPS.has(subject_id)) { try { PREPS.set(subject_id, await api.list('lesson_preps', { school_id: S.school.id, subject_id }, { select: 'id,lesson,unit,data,active' })); } catch (_) { PREPS.set(subject_id, []); } }
    const t = nk(topic), L = PREPS.get(subject_id).filter(x => x.active !== false && x.lesson);
    return L.find(x => nk(x.lesson) === t) || L.find(x => t.includes(nk(x.lesson)) || nk(x.lesson).includes(t)) || null;
  }
  const flat = v => Array.isArray(v) ? v.map(x => typeof x === 'string' ? x : (x && (x.t || x.text || x.name || x.title || x.desc)) || '').filter(Boolean).join(' — ') : String(v || '');
  const EXEC = { done: 'نُفّذت كما في الخطة', modified: 'نُفّذت مع تعديل', pending: 'لم يُسجَّل تنفيذها', missed: 'لم تُنفّذ' };

  // ---------- النماذج: دمج، السير في المنهج، تعبئة تلقائية ----------
  let LIB = null;
  const lib = async () => { if (LIB) return LIB; if (!A.formsLoadLib) throw new Error('محرك النماذج غير متاح'); LIB = await A.formsLoadLib(); return LIB; };
  const evalish = t => (t.blocks || []).some(b => ['rating', 'score', 'notes', 'quick', 'checks'].includes(b.type));
  function allowed(L) { const c = cfg(), byId = id => L.list.find(t => t.id === id);
    const base = c.tpls.map(byId).filter(Boolean).map(t => ({ key: t.id, name: t.name, tag: c.tlabels[t.id] || '', tpl: t.tpl, base: t.id, desc: t.desc }));
    const pre = (c.presets || []).concat(myPresets()).map(p => ({ key: 'p:' + p.id, name: p.name, tag: p.mine ? 'نموذجي' : 'نموذج المدرسة', tpl: p.tpl, base: p.base || 'custom', desc: p.desc || 'نموذج مخصّص', preset: p }));
    return base.concat(pre); }
  // دمج أكثر من نموذج في استمارة واحدة: رأس واحد (بيانات المعلم)، عنوان لكل نموذج، وتوقيعات موحّدة في النهاية
  function merge(items) {
    if (items.length === 1) { const t = clone(items[0].tpl); t.name = items[0].name; return t; }
    const out = clone(items[0].tpl), roles = [], blocks = [];
    items.forEach((it, i) => { const T = clone(it.tpl);
      if (i > 0) blocks.push({ id: 'vh' + i, type: 'text', style: 'h', text: T.title || it.name });
      (T.blocks || []).forEach(b => {
        if (b.type === 'signatures') { (b.roles || []).forEach(r => { if (!roles.some(x => nk(x.label) === nk(r.label))) roles.push({ ...r, id: 's' + roles.length }); }); return; }
        if (i > 0 && b.type === 'fields' && (b.fields || []).some(f => f.key === 'teacher' || f.type === 'teacher')) return;
        if (i > 0) b.id = b.id + '_' + i; blocks.push(b); }); });
    if (roles.length) blocks.push({ id: 'bsigm', type: 'signatures', withSign: true, roles });
    out.blocks = blocks; out.name = items.map(x => x.name).join(' + '); return out;
  }
  const PACE_ROWS = ['الدرس / الموضوع', 'الأهداف ونواتج التعلم', 'الاستراتيجيات والأنشطة', 'التقويم', 'الواجب', 'التقدم في المنهج'];
  function paceBlocks() {
    return [{ id: 'vpace_h', type: 'text', style: 'h', text: 'السير في المنهج — مطابقة الخطة الأسبوعية بما يجري في الحصة' },
      { id: 'vpace_f', type: 'fields', title: '', cols: 4, fields: [{ id: 'f0', label: 'وضع السير في المنهج', type: 'select', opts: 'مطابق للخطة,متقدم عن الخطة,متأخر عن الخطة,مختلف عن الخطة,لا توجد خطة للحصة', w: 2 }, { id: 'f1', label: 'حالة التنفيذ المسجّلة في الخطة', type: 'text', w: 2 }] },
      { id: 'vpace', type: 'table', title: '', n: PACE_ROWS.length, numbered: false, fixed: false, cols: [{ id: 'c0', name: 'البند', type: 'label', w: 2 }, { id: 'c1', name: 'في الخطة الأسبوعية / التحضير', type: 'text', w: 3 }, { id: 'c2', name: 'الملاحظ في الحصة', type: 'text', w: 3 }, { id: 'c3', name: 'مطابق', type: 'check', w: 1 }, { id: 'c4', name: 'غير مطابق', type: 'check', w: 1 }, { id: 'c5', name: 'ملاحظة', type: 'text', w: 2 }], rows: PACE_ROWS.map(l => ({ c0: l })) }];
  }
  function addPace(tp) { if ((tp.blocks || []).some(b => b.id === 'vpace')) return tp; const bs = tp.blocks || []; let at = bs.findIndex(b => b.type === 'fields'); at = at < 0 ? 0 : at + 1; while (bs[at] && (bs[at].type === 'table' && /الزيارة/.test(JSON.stringify(bs[at].cols || [])))) at++; bs.splice(at, 0, ...paceBlocks()); tp.blocks = bs; return tp; }
  // خانة توقيع الزائر: إن لم توجد خانة للزائر تُضاف بصفته واسمه
  function visitorSlot(tp, v) {
    let sb = (tp.blocks || []).find(b => b.type === 'signatures'); if (!sb) { sb = { id: 'bsig', type: 'signatures', withSign: true, roles: [] }; tp.blocks.push(sb); }
    let r = (sb.roles || []).find(x => /الزائر|المقيّم|المقيم/.test(x.label || '')) || (v.role && (sb.roles || []).find(x => nk(x.label) === nk(v.role)));
    if (!r) { r = { id: 's' + (sb.roles.length + 1) + 'v', label: v.role || 'الزائر', name: '' }; sb.roles.unshift(r); }
    r.name = v.visitor_name || r.name; if (!(sb.roles || []).some(x => /المعلم|المعلمة/.test(x.label || '') && !/الزائر/.test(x.label || ''))) sb.roles.push({ id: 'st', label: 'المعلم', name: '' });
    return tp;
  }
  // قيمة الحقل حسب اسمه/مفتاحه
  function valFor(label, key, type, v) {
    const L = label || '';
    if (/الزائر|المقيّم|المقيم|المشرف الزائر/.test(L)) return v.visitor_name;
    if (/المزور/.test(L) || key === 'teacher' || type === 'teacher' || (/المعلم|المعلمة/.test(L) && !/عدد|مواد/.test(L))) return v.teacher_name;
    if (/نوع الزيارة/.test(L)) return v.type;
    if (key === 'subject' || /^المادة|المادة$|التخصص/.test(L)) return v.subject;
    if (key === 'class' || /الصف|الفصل|الشعبة/.test(L)) return v.class_name;
    if (/الحصة/.test(L)) return v.period ? (PERW[v.period - 1] || String(v.period)) : '';
    if (key === 'date' || (type === 'date' && /تاريخ|التاريخ|اليوم/.test(L))) return v.date;
    if (/الموضوع|الدرس|المهارة/.test(L)) return v.topic;
    return null;
  }
  function fill(tp, d, v, over) {
    const put = (o, k, val) => { if (val == null || val === '') return; if (over || o[k] == null || o[k] === '') o[k] = val; };
    (tp.blocks || []).forEach(b => {
      if (b.type === 'fields' && b.id !== 'vpace_f') { const o = d[b.id] = (d[b.id] && typeof d[b.id] === 'object') ? d[b.id] : {}; (b.fields || []).forEach(f => put(o, f.id, valFor(f.label, f.key, f.type, v))); }
      if (b.type === 'table' && b.id !== 'vpace' && (b.cols || []).some(c => /الحصة/.test(c.name || '')) && (b.cols || []).some(c => /الصف|المادة/.test(c.name || ''))) {
        const rows = Array.isArray(d[b.id]) ? d[b.id] : clone(b.rows || []); while (rows.length < Math.max(1, b.n || 0)) rows.push({});
        const r = rows[0] = rows[0] || {}; (b.cols || []).forEach(c => { if (c.type === 'label' || c.type === 'check') return; put(r, c.id, valFor(c.name, c.key, c.type, v)); }); d[b.id] = rows; }
      if (b.id === 'vpace_f') { const o = d[b.id] = d[b.id] || {}; put(o, 'f0', v.pace ? PACE_TXT[v.pace] : ''); put(o, 'f1', v.exec || ''); }
      if (b.id === 'vpace') { const P = v.plan || {}, vals = [v.topic || P.topic, P.objectives, P.activities, P.assessment, v.homework || P.homework, P.unit ? 'الوحدة: ' + P.unit : ''];
        const rows = Array.isArray(d[b.id]) ? d[b.id] : clone(b.rows || []); vals.forEach((x, i) => { rows[i] = rows[i] || { c0: PACE_ROWS[i] || '' }; put(rows[i], 'c1', x); }); d[b.id] = rows; }
    });
    return d;
  }
  // تجهيز القالب النهائي للزيارة
  function buildTpl(items, v, o) {
    let tp = o.custom ? clone(o.custom) : merge(items);
    if (o.pace && !(tp.blocks || []).some(b => b.id === 'vpace')) addPace(tp);
    tp = A.formsWithSig ? A.formsWithSig(tp) : tp; visitorSlot(tp, v);
    if (cfg().head) tp.sub = [v.type, v.class_name, v.period ? perL(v.period) : '', dt(v.date, true)].filter(Boolean).join(' · ');
    return tp;
  }

  // ---------- محرّر العناصر (تخصيص النموذج للزيارة) ----------
  function itemsEditor(tpl0, onDone, opt = {}) {
    const T = clone(tpl0); T.blocks = T.blocks || [];
    const m = A.modal(`<h3>تخصيص عناصر النموذج</h3><p class="sub">عدّل أي بند أو احذفه أو أضف بنوداً وكتلاً جديدة ورتّبها. التعديل يخص هذه الزيارة فقط، ويمكنك حفظه نموذجاً جاهزاً.</p>
      <div class="field"><label for="ieN">اسم النموذج</label><input class="in" id="ieN" value="${esc(T.name || T.title || '')}"></div>
      <div id="ieB" class="vs-ie"></div>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin:8px 0"><span class="small muted">إضافة كتلة:</span>
        <button class="btn ghost sm" data-add="rating" type="button">+ عناصر تقييم (مستويات)</button><button class="btn ghost sm" data-add="numbered" type="button">+ قائمة مرقّمة (نقاط قوة/توصيات…)</button><button class="btn ghost sm" data-add="fields" type="button">+ حقول</button><button class="btn ghost sm" data-add="checks" type="button">+ اختيارات</button><button class="btn ghost sm" data-add="pace" type="button">+ السير في المنهج</button><button class="btn ghost sm" data-add="text" type="button">+ عنوان/نص</button></div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" id="ieOk" type="button">اعتماد التخصيص</button>${opt.noPreset ? '' : `<button class="btn ghost" id="ieSv" type="button">حفظ كنموذج جاهز…</button>`}<button class="btn ghost" id="ieRs" type="button">التراجع عن كل التعديلات</button></div>`, { cls: 'wide', sticky: true });
    const B = $('#ieB', m.el);
    const TN = { fields: 'حقول', rating: 'عناصر تقييم', score: 'محاور بالدرجات', checks: 'اختيارات', numbered: 'قائمة مرقمة', table: 'جدول', notes: 'الملاحظات والتوجيهات', signatures: 'التوقيعات', text: 'نص', matrix: 'مصفوفة', sentence: 'جملة', analysis: 'تحليل (لا يُطبع)', quick: 'ملاحظات سريعة ← تقييم (لا يُطبع)' };
    const inp = (v, a, ph, w) => `<input class="in" ${a} value="${esc(v == null ? '' : v)}" placeholder="${esc(ph || '')}" ${w ? `style="max-width:${w}px"` : ''}>`;
    const row = (inner, a) => `<div class="vs-ir">${inner}<span class="vs-ia"><button type="button" class="btn ghost sm" ${a} data-op="up" aria-label="أعلى">↑</button><button type="button" class="btn ghost sm" ${a} data-op="dn" aria-label="أسفل">↓</button><button type="button" class="btn ghost sm" ${a} data-op="del" aria-label="حذف">✕</button></span></div>`;
    function draw() {
      B.innerHTML = T.blocks.map((b, bi) => {
        let body = '';
        if (b.type === 'fields') body = (b.fields || []).map((f, i) => row(inp(f.label, `data-b="${bi}" data-l="fields" data-i="${i}" data-k="label"`, 'اسم الحقل'), `data-b="${bi}" data-l="fields" data-i="${i}"`)).join('') + `<button type="button" class="btn ghost sm" data-b="${bi}" data-new="fields">+ حقل</button>`;
        if (b.type === 'rating') body = `<div class="small muted">المستويات: ${(b.options || []).map((o, i) => inp(o.label, `data-b="${bi}" data-l="options" data-i="${i}" data-k="label"`, '', 120)).join(' ')} <button type="button" class="btn ghost sm" data-b="${bi}" data-new="options">+ مستوى</button></div>` + (b.groups || []).map((g, gi) => `<div class="vs-ig"><div class="vs-ir">${inp(g.name, `data-b="${bi}" data-g="${gi}" data-k="gname"`, 'اسم المجموعة (اختياري)')}<span class="vs-ia"><button type="button" class="btn ghost sm" data-b="${bi}" data-gdel="${gi}" aria-label="حذف المجموعة">✕ المجموعة</button></span></div>${(g.items || []).map((it, i) => row(inp(it.t, `data-b="${bi}" data-g="${gi}" data-l="items" data-i="${i}" data-k="t"`, 'نص البند'), `data-b="${bi}" data-g="${gi}" data-l="items" data-i="${i}"`)).join('')}<button type="button" class="btn ghost sm" data-b="${bi}" data-g="${gi}" data-new="items">+ بند</button></div>`).join('') + `<button type="button" class="btn ghost sm" data-b="${bi}" data-new="group">+ مجموعة</button>`;
        if (b.type === 'score') body = (b.sections || []).map((s, si) => `<div class="vs-ig"><div class="vs-ir">${inp(s.name, `data-b="${bi}" data-s="${si}" data-k="sname"`, 'اسم المحور')}<span class="vs-ia"><button type="button" class="btn ghost sm" data-b="${bi}" data-sdel="${si}">✕ المحور</button></span></div>${(s.axes || []).map((x, i) => row(inp(x.name, `data-b="${bi}" data-s="${si}" data-l="axes" data-i="${i}" data-k="name"`, 'البند') + inp(x.w, `data-b="${bi}" data-s="${si}" data-l="axes" data-i="${i}" data-k="w" inputmode="decimal" aria-label="الدرجة"`, 'الدرجة', 80), `data-b="${bi}" data-s="${si}" data-l="axes" data-i="${i}"`)).join('')}<button type="button" class="btn ghost sm" data-b="${bi}" data-s="${si}" data-new="axes">+ بند</button></div>`).join('') + `<button type="button" class="btn ghost sm" data-b="${bi}" data-new="section">+ محور</button>`;
        if (b.type === 'checks') body = (b.items || []).map((it, i) => row(inp(it.text, `data-b="${bi}" data-l="items" data-i="${i}" data-k="text"`, 'الخيار'), `data-b="${bi}" data-l="items" data-i="${i}"`)).join('') + `<button type="button" class="btn ghost sm" data-b="${bi}" data-new="citems">+ خيار</button>`;
        if (b.type === 'numbered') body = `<div class="vs-ir">${inp(b.n, `data-b="${bi}" data-k="n" inputmode="numeric" aria-label="عدد البنود"`, 'عدد البنود', 90)}<span class="small muted">عدد الأسطر الابتدائي (يمكن الإضافة أثناء التعبئة)</span></div>`;
        if (b.type === 'table') body = (b.id === 'vpace' ? (b.rows || []).map((r, i) => row(inp(r.c0, `data-b="${bi}" data-l="rows" data-i="${i}" data-k="c0"`, 'البند'), `data-b="${bi}" data-l="rows" data-i="${i}"`)).join('') + `<button type="button" class="btn ghost sm" data-b="${bi}" data-new="prow">+ بند</button>` : `<span class="small muted">${(b.cols || []).map(c => esc(c.name)).join(' · ')}</span>`);
        if (b.type === 'signatures') body = (b.roles || []).map((r, i) => row(inp(r.label, `data-b="${bi}" data-l="roles" data-i="${i}" data-k="label"`, 'الصفة'), `data-b="${bi}" data-l="roles" data-i="${i}"`)).join('') + `<button type="button" class="btn ghost sm" data-b="${bi}" data-new="roles">+ موقّع</button>`;
        if (b.type === 'text') body = inp(b.text, `data-b="${bi}" data-k="text"`, 'النص');
        const ttl = b.type === 'text' ? '' : inp(b.title, `data-b="${bi}" data-k="title"`, 'عنوان الكتلة (اختياري)');
        return `<div class="vs-ib"><div class="vs-ibh"><b>${esc(TN[b.type] || b.type)}</b>${ttl}<span class="vs-ia"><button type="button" class="btn ghost sm" data-bm="${bi}" data-op="up" aria-label="نقل الكتلة لأعلى">↑</button><button type="button" class="btn ghost sm" data-bm="${bi}" data-op="dn" aria-label="نقل الكتلة لأسفل">↓</button><button type="button" class="btn ghost sm" data-bm="${bi}" data-op="del" aria-label="حذف الكتلة">✕</button></span></div>${body}</div>`;
      }).join('') || '<p class="small muted">لا كتل — أضف كتلة من الأزرار أدناه.</p>';
    }
    const listOf = el => { const b = T.blocks[+el.dataset.b]; if (!b) return null; if (el.dataset.g != null && el.dataset.l === 'items') return (b.groups[+el.dataset.g] || {}).items; if (el.dataset.s != null && el.dataset.l === 'axes') return (b.sections[+el.dataset.s] || {}).axes; return b[el.dataset.l]; };
    B.addEventListener('input', e => { const el = e.target; if (!el.dataset || el.dataset.k == null) return; const b = T.blocks[+el.dataset.b], k = el.dataset.k, v = el.value;
      if (el.dataset.l) { const L = listOf(el), it = L && L[+el.dataset.i]; if (it) it[k] = k === 'w' ? (+String(v).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) || 0) : v; return; }
      if (k === 'gname') b.groups[+el.dataset.g].name = v; else if (k === 'sname') b.sections[+el.dataset.s].name = v; else if (k === 'n') b.n = Math.max(0, Math.min(60, +String(v).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) || 0)); else b[k] = v; });
    B.addEventListener('click', e => { const el = e.target.closest('button'); if (!el) return; const d = el.dataset;
      if (d.bm != null) { const i = +d.bm; if (d.op === 'del') T.blocks.splice(i, 1); else { const j = d.op === 'up' ? i - 1 : i + 1; if (j >= 0 && j < T.blocks.length) [T.blocks[i], T.blocks[j]] = [T.blocks[j], T.blocks[i]]; } return draw(); }
      if (d.op && d.l) { const L = listOf(el), i = +d.i; if (!L) return; if (d.op === 'del') L.splice(i, 1); else { const j = d.op === 'up' ? i - 1 : i + 1; if (j >= 0 && j < L.length) [L[i], L[j]] = [L[j], L[i]]; } return draw(); }
      const b = T.blocks[+d.b]; if (!b) return;
      if (d.gdel != null) { b.groups.splice(+d.gdel, 1); return draw(); } if (d.sdel != null) { b.sections.splice(+d.sdel, 1); return draw(); }
      const nw = d.new;
      if (nw === 'fields') (b.fields = b.fields || []).push({ id: uid('f'), label: 'حقل جديد', type: 'text', w: 2 });
      if (nw === 'options') (b.options = b.options || []).push({ v: 0, label: 'مستوى' });
      if (nw === 'items') (b.groups[+d.g].items = b.groups[+d.g].items || []).push({ id: uid('q'), t: '' });
      if (nw === 'group') (b.groups = b.groups || []).push({ id: uid('g'), name: '', items: [{ id: uid('q'), t: '' }] });
      if (nw === 'axes') (b.sections[+d.s].axes = b.sections[+d.s].axes || []).push({ id: uid('x'), name: '', w: 3, items: [] });
      if (nw === 'section') (b.sections = b.sections || []).push({ id: uid('s'), name: 'محور جديد', axes: [{ id: uid('x'), name: '', w: 3, items: [] }] });
      if (nw === 'citems') (b.items = b.items || []).push({ id: uid('l'), text: '' });
      if (nw === 'prow') (b.rows = b.rows || []).push({ c0: '' });
      if (nw === 'roles') (b.roles = b.roles || []).push({ id: uid('s'), label: 'صفة الموقّع', name: '' });
      draw(); setTimeout(() => { const ins = $$('input', B); const last = [...ins].reverse().find(x => !x.value); last && last.focus(); }, 0); });
    $$('[data-add]', m.el).forEach(b => b.onclick = () => { const k = b.dataset.add, id = uid('vb');
      if (k === 'pace') { if (T.blocks.some(x => x.id === 'vpace')) return A.toast('بند السير في المنهج موجود', 'warn'); const sg = T.blocks.findIndex(x => x.type === 'signatures'); T.blocks.splice(sg < 0 ? T.blocks.length : sg, 0, ...paceBlocks()); }
      else { const r0 = T.blocks.find(x => x.type === 'rating'); const nb = k === 'rating' ? { id, type: 'rating', title: 'عناصر إضافية', score: true, note: true, options: r0 ? clone(r0.options) : [{ v: 3, label: 'متميز' }, { v: 2, label: 'جيد' }, { v: 1, label: 'يحتاج تحسين' }], groups: [{ id: uid('g'), name: '', items: [{ id: uid('q'), t: '' }] }] }
        : k === 'numbered' ? { id, type: 'numbered', title: 'ملاحظات', n: 3, rows: [] } : k === 'fields' ? { id, type: 'fields', title: '', cols: 4, fields: [{ id: uid('f'), label: 'حقل جديد', type: 'text', w: 2 }] }
        : k === 'checks' ? { id, type: 'checks', title: '', cols: 3, items: [{ id: uid('l'), text: 'خيار' }] } : { id, type: 'text', style: 'h', text: 'عنوان' };
        const sg = T.blocks.findIndex(x => x.type === 'signatures'); T.blocks.splice(sg < 0 ? T.blocks.length : sg, 0, nb); }
      draw(); B.lastElementChild && B.lastElementChild.scrollIntoView({ block: 'nearest' }); });
    const clean = () => { T.name = $('#ieN', m.el).value.trim() || T.name; T.blocks.forEach(b => { if (b.type === 'rating') b.groups = (b.groups || []).map(g => ({ ...g, items: (g.items || []).filter(x => (x.t || '').trim()) })).filter(g => g.items.length); if (b.type === 'score') b.sections = (b.sections || []).map(s => ({ ...s, axes: (s.axes || []).filter(x => (x.name || '').trim()) })).filter(s => s.axes.length); if (b.type === 'checks') b.items = (b.items || []).filter(x => (x.text || '').trim()); if (b.type === 'fields') b.fields = (b.fields || []).filter(x => (x.label || '').trim()); }); T.blocks = T.blocks.filter(b => !['rating', 'score'].includes(b.type) || (b.groups || b.sections || []).length); return T; };
    $('#ieOk', m.el).onclick = () => { onDone(clean()); m.close(); };
    $('#ieRs', m.el).onclick = async () => { if (!(await A.confirmBox('التراجع عن كل التعديلات على هذا النموذج؟', 'تراجع'))) return; const o = clone(tpl0); T.blocks = o.blocks; T.name = o.name; $('#ieN', m.el).value = T.name || ''; draw(); };
    const sv = $('#ieSv', m.el); if (sv) sv.onclick = () => presetSave(clean(), opt.base);
    draw();
  }
  function presetSave(tpl, base) {
    const m = A.modal(`<h3>حفظ كنموذج جاهز</h3><p class="sub">يظهر في قائمة النماذج عند كل زيارة جديدة.</p>
      <div class="field"><label for="psN">الاسم</label><input class="in" id="psN" value="${esc(tpl.name || '')}"></div>
      ${own() ? `<div class="sm-modes" role="radiogroup" aria-label="لمن"><label class="sm-mode"><input type="radio" name="psW" value="school" checked><b>للمدرسة</b><span class="small muted">يظهر لكل من يقوم بالزيارات.</span></label><label class="sm-mode"><input type="radio" name="psW" value="me"><b>لي فقط</b><span class="small muted">على هذا الجهاز.</span></label></div>` : '<p class="small muted">يُحفظ لك على هذا الجهاز.</p>'}
      <button class="btn" id="psGo" type="button">حفظ</button>`);
    $('#psGo', m.el).onclick = ev => A.run(ev.currentTarget, async () => { const name = $('#psN', m.el).value.trim(); if (!name) throw new Error('اكتب الاسم'); const p = { id: uid('p'), name, base: base || 'custom', tpl: { ...clone(tpl), name }, at: nowIso() };
      if (own() && (($('[name=psW]:checked', m.el) || {}).value || 'school') === 'school') await saveCfg({ presets: (cfg().presets || []).concat([p]).slice(-20) });
      else lsSet('dina_vis_presets_' + S.me.id, myPresets().concat([{ ...p, mine: true }]).slice(-20));
      m.close(); A.toast('حُفظ النموذج الجاهز', 'ok'); });
  }

  // ---------- CSS ----------
  const css = `
  .vs-wrap{display:grid;gap:12px}
  .vs-st{border:1px solid #DCE7F3;border-radius:18px;padding:12px 14px;background:#fff;box-shadow:0 10px 24px -20px rgba(8,43,90,.45)}
  .vs-st>h3{margin:0 0 8px;font-size:16px;color:#082B5A;display:flex;gap:8px;align-items:center}.vs-st>h3 .n{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#082B5A;color:#fff;font-size:13px}
  .vs-cls{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}
  .vs-c{all:unset;box-sizing:border-box;cursor:pointer;border:1.5px solid #DCE7F3;border-radius:14px;padding:9px 11px;display:grid;gap:3px;background:linear-gradient(180deg,#fff,#F6FAFD);min-height:58px}
  .vs-c b{color:#082B5A;font-size:14.5px}.vs-c span{font-size:12px;color:#5B7090;line-height:1.35}
  .vs-c:hover{border-color:#3AB1DB}.vs-c:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}.vs-c.on{border-color:#005499;background:#EAF4FC;box-shadow:inset 0 0 0 1px #005499}
  .vs-c .now{color:#2E8B57;font-weight:700}
  .vs-day{display:flex;gap:6px;overflow-x:auto;padding:4px 2px 8px;scroll-snap-type:x proximity}
  .vs-p{all:unset;box-sizing:border-box;cursor:pointer;flex:0 0 auto;min-width:118px;max-width:170px;scroll-snap-align:start;border:1.5px solid #DCE7F3;border-radius:12px;padding:7px 9px;display:grid;gap:2px;background:#fff}
  .vs-p b{font-size:13px;color:#082B5A}.vs-p span{font-size:11.5px;color:#5B7090;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .vs-p.now{border-color:#2E8B57;background:#F0FAF4}.vs-p.on{border-color:#005499;background:#EAF4FC;box-shadow:inset 0 0 0 1px #005499}.vs-p:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}.vs-p.empty span{color:#A0AEC0}
  .vs-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px 12px}.vs-g .field{margin:0}.vs-g .full{grid-column:1/-1}
  .vs-src{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0}
  .vs-tag{font-size:12px;padding:3px 9px;border-radius:999px;background:#E4EBF5;color:#082B5A}.vs-tag.ok{background:#E3F4EA;color:#1E6B43}.vs-tag.warn{background:#FFF1DA;color:#8A5A00}
  .vs-chips{display:flex;gap:6px;flex-wrap:wrap}.vs-chips button{all:unset;cursor:pointer;padding:7px 12px;border-radius:999px;border:1.5px solid #DCE7F3;background:#fff;font-size:13.5px;color:#082B5A}.vs-chips button.on{background:#082B5A;color:#fff;border-color:#082B5A}.vs-chips button:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}
  .vs-tp{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
  .vs-t{position:relative;border:1.5px solid #DCE7F3;border-radius:14px;padding:10px 12px;background:#fff;display:grid;gap:4px;cursor:pointer}
  .vs-t.on{border-color:#005499;background:#EAF4FC}.vs-t:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}.vs-t b{color:#082B5A}.vs-t .k{position:absolute;inset-inline-end:8px;top:8px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:12px;background:#E4EBF5;color:#082B5A}.vs-t.on .k{background:#005499;color:#fff}
  .vs-cmp{display:grid;gap:4px;font-size:13px;background:#F6FAFD;border:1px dashed #BFD5EA;border-radius:12px;padding:8px 10px;margin-top:8px}.vs-cmp div{display:grid;grid-template-columns:150px 1fr;gap:8px}.vs-cmp b{color:#005499;font-weight:700}
  .vs-bar{position:sticky;bottom:0;z-index:5;display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:rgba(255,255,255,.96);backdrop-filter:blur(6px);border:1px solid #DCE7F3;border-radius:16px;padding:10px 12px;box-shadow:0 -8px 24px -18px rgba(8,43,90,.5)}
  .vs-bar .sum{flex:1;min-width:180px;font-size:13px;color:#40526A}
  .vs-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:8px 0}.vs-kp div{background:#F4F8FC;border:1px solid #DCE7F3;border-radius:14px;padding:10px 12px;display:grid}.vs-kp b{font-size:24px;color:#082B5A}.vs-kp span{font-size:12.5px;color:#5B7090}
  .vs-list{display:grid;gap:10px}
  .vs-card{border:1px solid #DCE7F3;border-radius:16px;padding:10px 14px;background:#fff;display:grid;gap:6px;border-inline-start:5px solid #3AB1DB}
  .vs-card.s-approved{border-inline-start-color:#2E8B57}.vs-card.s-submitted{border-inline-start-color:#E0A526}.vs-card.sel{background:#F2F8FD}
  .vs-card .hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.vs-card .hd b{color:#082B5A;font-size:15px}.vs-card .mt{font-size:12.5px;color:#5B7090;display:flex;gap:10px;flex-wrap:wrap}.vs-card .ac{display:flex;gap:6px;flex-wrap:wrap}
  .vs-flt{display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin:8px 0}.vs-flt .in{max-width:170px}.vs-flt label{display:grid;gap:2px;font-size:12px;color:#5B7090}
  .vs-ie{display:grid;gap:10px;max-height:58vh;overflow:auto;padding:2px}
  .vs-ib{border:1px solid #DCE7F3;border-radius:12px;padding:8px 10px;display:grid;gap:6px;background:#FBFDFF}
  .vs-ibh{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.vs-ibh b{color:#005499;min-width:84px}.vs-ibh .in{flex:1;min-width:140px}
  .vs-ir{display:flex;gap:6px;align-items:center}.vs-ir .in{flex:1;min-width:0}.vs-ia{display:inline-flex;gap:3px;margin-inline-start:auto}.vs-ia .btn{padding:4px 8px;min-width:32px}
  .vs-ig{border-inline-start:3px solid #E4EBF5;padding-inline-start:8px;display:grid;gap:5px}
  .vs-ban{display:flex;gap:6px;flex-wrap:wrap;align-items:center;background:#F4F8FC;border:1px solid #DCE7F3;border-radius:12px;padding:7px 10px;margin:6px 0;font-size:13px}
  .vs-ban .vs-tag{background:#fff;border:1px solid #DCE7F3}
  .vs-att{display:flex;gap:6px;flex-wrap:wrap}.vs-att a,.vs-att span.f{display:inline-flex;align-items:center;gap:4px;border:1px solid #DCE7F3;border-radius:10px;padding:3px;background:#fff;font-size:12px;text-decoration:none;color:#082B5A}.vs-att img{width:54px;height:54px;object-fit:cover;border-radius:8px}
  .vs-bars{display:grid;gap:6px}.vs-bars div{display:grid;grid-template-columns:150px 1fr 40px;gap:8px;align-items:center;font-size:13px}.vs-bars i{display:block;height:10px;border-radius:6px;background:linear-gradient(90deg,#3AB1DB,#005499)}
  .vs-qr{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.vs-qr div{border:1px solid #DCE7F3;border-radius:12px;padding:8px;text-align:center;display:grid;gap:4px}.vs-qr svg{width:120px;height:120px;margin:auto}
  @media (max-width:600px){.vs-cls{grid-template-columns:repeat(2,1fr)}.vs-cmp div{grid-template-columns:1fr}.vs-bars div{grid-template-columns:100px 1fr 32px}.vs-flt .in{max-width:none;width:100%}.vs-flt label{flex:1 1 140px}}
  @media (prefers-reduced-motion:reduce){.vs-day{scroll-behavior:auto}}`;
  const ensureCss = () => { if (!document.getElementById('vscss')) { const s = document.createElement('style'); s.id = 'vscss'; s.textContent = css; document.head.appendChild(s); } };

  // ---------- شريط الزيارة داخل نافذة النموذج ----------
  A.visitBanner = t => { ensureCss(); const v = t.visit || {}, att = ((t.data || {})._att || []);
    return `<div class="vs-ban" role="note"><b>👁️ ${esc(v.type || 'زيارة')}</b>${[v.class_name, v.period ? perL(v.period) + (v.time ? ' (' + v.time + ')' : '') : '', dt(v.date, true), v.subject, v.topic ? 'الدرس: ' + v.topic : '', 'الزائر: ' + (v.visitor_name || nm(t.created_by)) + (v.role ? ' — ' + v.role : '')].filter(Boolean).map(x => `<span class="vs-tag">${esc(x)}</span>`).join('')}${v.pace ? pill(PACE, v.pace) : ''}
      ${att.length ? `<span class="vs-att">${att.map((a, i) => /^data:image/.test(a.d) ? `<a href="#" data-vatt="${t.id}|${i}" title="${esc(a.n)}"><img src="${a.d}" alt="${esc(a.n)}"></a>` : `<a href="#" data-vatt="${t.id}|${i}">📎 ${esc(a.n)}</a>`).join('')}</span>` : ''}
      ${S.me && (t.created_by === S.me.id || own()) && t.id !== 'preview' ? `<button type="button" class="btn ghost sm" data-vedit="${t.id}" style="margin-inline-start:auto">✎ بيانات الزيارة</button>` : ''}</div>`; };
  document.addEventListener('click', async e => {
    const ve = e.target.closest('[data-vedit]'); if (ve) { e.preventDefault(); const [t] = await api.list('form_tasks', { id: ve.dataset.vedit }); if (t) editVisit(t, () => { const o = document.querySelector('.fm-modal'); A.toast('حُفظت بيانات الزيارة — أعد فتح الاستمارة لرؤية التحديث في الورقة', 'ok'); if (o) { } }); return; }
    const va = e.target.closest('[data-vatt]'); if (va) { e.preventDefault(); const [id, i] = va.dataset.vatt.split('|'); const [t] = await api.list('form_tasks', { id }); const a = t && ((t.data || {})._att || [])[+i]; if (!a) return; const w = window.open(); if (w) { w.document.title = a.n; w.document.body.style.margin = '0'; w.document.body.innerHTML = /^data:image/.test(a.d) ? `<img src="${a.d}" style="max-width:100%">` : `<iframe src="${a.d}" style="border:0;width:100vw;height:100vh"></iframe>`; } }
  });

  // ---------- الصفحة ----------
  const st = { tab: 'new', from: '', to: '', q: '', teacher: '', cls: '', type: '', vis: '', status: '', mine: false, sel: new Set() };
  let NV = null; // حالة الزيارة الجديدة
  const resetNV = () => { const p = myPref(), c = cfg(); NV = { cid: '', date: today(), period: 0, teacher_id: '', subject_id: '', topic: '', homework: '', plan_note: '', exec: '', entry: null, auto: true, plan: {}, type: p.type && c.types.includes(p.type) ? p.type : c.defType, role: p.role || (S.me && S.me.title) || '', tpls: (p.tpls && p.tpls.length ? p.tpls : c.defTpls).slice(), custom: null, pace: c.pace, note: '', day: [], q: '' }; };

  V.visits = async function (root) {
    ensureCss(); navLabel();
    if (!can()) { root.innerHTML = `<div class="card">${A.emptyBox('هذه الصفحة غير متاحة لحسابك', 'يمنحها المالك من «المسميات والصلاحيات» (الزيارات) ويفعّلها من «تخصيص صفحة المعلم»')}</div>`; return; }
    if (!NV) resetNV();
    // رابط مباشر لفصل (رمز QR على باب الفصل): ?vc=<class_id>
    const vc = (location.search.match(/[?&]vc=([0-9a-f-]{36})/) || [])[1]; if (vc && !NV._vcUsed && classes().some(c => c.id === vc)) { NV._vcUsed = true; st.tab = 'new'; NV.cid = vc; NV.period = 0; }
    const c = cfg();
    const T = [['new', '＋ زيارة جديدة'], ['list', 'الزيارات'], ['rep', 'التقارير والتغطية'], ['int', 'التكامل مع ملفات الإشراف']].concat(own() ? [['set', 'الإعدادات']] : []);
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>${esc(c.title)}</h2><p class="sub" style="margin:2px 0 0">اختر الفصل فتُحدَّد الحصة الجارية وبياناتها من الجدول والخطة الأسبوعية — وكل شيء قابل للتعديل. تُعبَّأ الاستمارة وتُوقَّع ثم تصل للمعلم للاطلاع والتوقيع.</p></div></div>
      <div class="fm-tabs" role="tablist">${T.map(([k, l]) => `<button role="tab" type="button" data-tb="${k}" class="${st.tab === k ? 'on' : ''}" aria-selected="${st.tab === k}">${l}</button>`).join('')}</div><div id="vsO" class="vs-wrap"></div></div>`;
    $$('[data-tb]', root).forEach(b => b.onclick = () => { st.tab = b.dataset.tb; V.visits(root); });
    const O = $('#vsO', root), reload = () => V.visits(root);
    try {
      if (st.tab === 'new') return await newTab(O, reload);
      if (st.tab === 'list') return await listTab(O, reload);
      if (st.tab === 'rep') return await repTab(O, reload);
      if (st.tab === 'int') return await intTab(O, reload);
      if (st.tab === 'set') return await setTab(O, reload);
    } catch (e) { console.error(e); O.innerHTML = `<div class="notice bad" style="display:block">${esc(e.message || 'تعذّر التحميل')}</div>`; }
  };

  // ---------- زيارة جديدة ----------
  async function newTab(O, reload) {
    const c = cfg(), CL = classes();
    const people = (S.staff || []).filter(p => p.active !== false).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
    const subs = (S.subjects || []).slice().sort((a, b) => A.cmpSubj ? A.cmpSubj(a, b) : 0);
    const clsInfo = cl => { const p = nowPer(cl.id), e = p > 0 ? nowEntry(cl.id) : null; return p > 0 ? `<span class="now">الآن: ${esc(perL(p))}</span><span>${e ? esc([A.subjName ? A.subjName(e.subject_id) : '', nm(e.teacher_id)].filter(x => x && x !== '—').join(' · ')) : 'لا حصة في الخطة'}</span>` : `<span>${(A.curBreaks && A.curBreaks().length) ? 'فسحة/صلاة الآن' : 'لا حصة جارية الآن'}</span>`; };
    O.innerHTML = `
      <section class="vs-st" aria-labelledby="vs1"><h3 id="vs1"><span class="n">١</span>الفصل</h3>
        <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px"><input class="in" id="vsQ" placeholder="ابحث عن الفصل" style="max-width:240px" aria-label="بحث عن الفصل" value="${esc(NV.q)}">${S.sections && S.sections.length > 1 ? `<span class="small muted">فصول ${esc((A.section() || {}).name || '')} — لقسم آخر غيّر القسم من الشريط العلوي</span>` : ''}</div>
        <div class="vs-cls" id="vsC" role="listbox" aria-label="الفصول">${CL.map(cl => `<button type="button" role="option" class="vs-c ${NV.cid === cl.id ? 'on' : ''}" data-c="${cl.id}" aria-selected="${NV.cid === cl.id}" data-nm="${esc(nk(cl.name))}"><b>${esc(cl.name)}</b>${clsInfo(cl)}</button>`).join('') || '<p class="small muted">لا توجد فصول في هذا القسم</p>'}</div></section>
      <section class="vs-st" id="vsS2" aria-labelledby="vs2" ${NV.cid ? '' : 'hidden'}><h3 id="vs2"><span class="n">٢</span>الحصة والمعلم والدرس <span class="small muted" style="font-weight:400">— من الجدول الزمني والخطة الأسبوعية، وقابلة للتعديل</span></h3>
        <div class="row" style="gap:6px;flex-wrap:wrap;align-items:flex-end;margin-bottom:6px">
          <div class="field" style="margin:0"><label for="vsD">التاريخ</label><input class="in" type="date" id="vsD" value="${esc(NV.date)}"></div>
          <button type="button" class="btn ghost sm" id="vsPrev" title="الحصة السابقة">‹ السابقة</button><button type="button" class="btn ghost sm" id="vsNow">⏱ الحصة الجارية</button><button type="button" class="btn ghost sm" id="vsNext" title="الحصة التالية">التالية ›</button>
          <button type="button" class="btn ghost sm" id="vsRe" title="إعادة جلب بيانات الحصة من الخطة">↻ من الخطة</button></div>
        <div class="vs-day" id="vsDay" role="listbox" aria-label="حصص الفصل في اليوم"></div>
        <div class="vs-src" id="vsSrc"></div>
        <div class="vs-g">
          <div class="field"><label for="vsP">الحصة</label><select class="in" id="vsP"></select></div>
          <div class="field"><label for="vsT">المعلم</label><select class="in" id="vsT"><option value="">— اختر المعلم —</option>${people.map(p => `<option value="${p.id}">${esc(p.full_name)}</option>`).join('')}</select></div>
          <div class="field"><label for="vsSb">المادة</label><select class="in" id="vsSb"><option value="">—</option>${subs.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
          <div class="field"><label for="vsTp">الدرس / الموضوع</label><input class="in" id="vsTp" placeholder="من الخطة الأسبوعية"></div>
          <div class="field"><label for="vsHw">الواجب</label><input class="in" id="vsHw"></div>
          <div class="field"><label for="vsPc">السير في المنهج</label><select class="in" id="vsPc"><option value="">— يُحدَّد أثناء الزيارة —</option>${Object.keys(PACE_TXT).map(k => `<option value="${k}">${PACE_TXT[k]}</option>`).join('')}</select></div>
        </div>
        <div class="vs-cmp" id="vsCmp" aria-live="polite"></div></section>
      <section class="vs-st" id="vsS3" aria-labelledby="vs3" ${NV.cid ? '' : 'hidden'}><h3 id="vs3"><span class="n">٣</span>نوع الزيارة وصفة الزائر</h3>
        <div class="vs-chips" id="vsTy" role="radiogroup" aria-label="نوع الزيارة">${c.types.map(t => `<button type="button" role="radio" data-ty="${esc(t)}" class="${NV.type === t ? 'on' : ''}" aria-checked="${NV.type === t}">${esc(t)}</button>`).join('')}<button type="button" data-ty="__o" class="${c.types.includes(NV.type) ? '' : 'on'}">مسمى آخر…</button></div>
        <div class="vs-g" style="margin-top:8px"><div class="field" id="vsTyO" ${c.types.includes(NV.type) ? 'hidden' : ''}><label for="vsTyI">المسمى</label><input class="in" id="vsTyI" value="${c.types.includes(NV.type) ? '' : esc(NV.type)}" placeholder="مثال: زيارة تقويمية"></div>
          <div class="field"><label for="vsR">صفة الزائر (تظهر في خانة التوقيع)</label><input class="in" id="vsR" list="vsRL" value="${esc(NV.role)}"><datalist id="vsRL">${c.roles.map(r => `<option value="${esc(r)}">`).join('')}</datalist></div>
          <div class="field"><label for="vsNt">ملاحظة للمعلم (اختياري)</label><input class="in" id="vsNt" value="${esc(NV.note)}"></div></div></section>
      <section class="vs-st" id="vsS4" aria-labelledby="vs4" ${NV.cid ? '' : 'hidden'}><h3 id="vs4"><span class="n">٤</span>النموذج <span class="small muted" style="font-weight:400">— اختر نموذجاً أو أكثر (تُدمج في استمارة واحدة بترتيب اختيارك)</span></h3>
        <div class="vs-tp" id="vsTpl"><div class="spinner"></div></div>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center"><label class="chk"><input type="checkbox" id="vsPace" ${NV.pace ? 'checked' : ''}> إضافة بند «السير في المنهج» (مطابقة الخطة بالحصة)</label>
          <button type="button" class="btn ghost sm" id="vsCus">✎ تخصيص العناصر</button><button type="button" class="btn ghost sm" id="vsPv">معاينة</button><span class="small" id="vsCusI"></span></div></section>
      <div class="vs-bar" ${NV.cid ? '' : 'hidden'} id="vsBar"><div class="sum" id="vsSum"></div><button type="button" class="btn ghost" id="vsClr">مسح</button><button type="button" class="btn" id="vsGo">بدء الزيارة وفتح الاستمارة</button></div>`;

    // ١) الفصل
    $('#vsQ', O).oninput = e => { NV.q = e.target.value; const v = nk(NV.q); $$('#vsC [data-c]', O).forEach(b => b.hidden = !!v && !b.dataset.nm.includes(v)); }; if (NV.q) $('#vsQ', O).oninput({ target: $('#vsQ', O) });
    $$('#vsC [data-c]', O).forEach(b => b.onclick = async () => { const first = !NV.cid; NV.cid = b.dataset.c; NV.period = 0; NV.custom = NV.custom; $$('#vsC [data-c]', O).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); ['#vsS2', '#vsS3', '#vsS4', '#vsBar'].forEach(s => $(s, O).hidden = false); await loadDay(true); if (first) $('#vsS2', O).scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); });
    // ٢) الحصة
    const fill2 = () => { $('#vsT', O).value = NV.teacher_id || ''; $('#vsSb', O).value = NV.subject_id || ''; $('#vsTp', O).value = NV.topic || ''; $('#vsHw', O).value = NV.homework || ''; $('#vsPc', O).value = NV.pace_v || ''; };
    const pull = (e) => { NV.entry = e || null; NV.teacher_id = e ? e.teacher_id || '' : ''; NV.subject_id = e ? e.subject_id || '' : ''; NV.topic = e ? e.topic || '' : ''; NV.homework = e ? e.homework || '' : ''; NV.plan_note = e ? e.note || '' : ''; NV.exec = e && e.exec_status ? (EXEC[e.exec_status] || e.exec_status) + (e.exec_note ? ' — ' + e.exec_note : '') : ''; NV.auto = true; NV.plan = {}; fill2(); loadPrep(); };
    async function loadPrep() { const box = $('#vsCmp', O); const e = NV.entry; let P = null; try { P = await prepFor(NV.subject_id, NV.topic); } catch (_) { }
      const d = (P && P.data) || {}; NV.plan = { topic: NV.topic, unit: P ? P.unit || '' : '', objectives: flat(d.objectives), activities: [flat(d.strategies), flat(d.activities)].filter(Boolean).join(' — '), assessment: flat(d.assessment), homework: NV.homework || flat(d.homework) };
      const R = [['الدرس في الخطة', NV.topic], ['الوحدة', NV.plan.unit], ['الأهداف (التحضير)', NV.plan.objectives], ['الاستراتيجيات والأنشطة', NV.plan.activities], ['التقويم', NV.plan.assessment], ['الواجب', NV.plan.homework], ['حالة التنفيذ في الخطة', NV.exec], ['ملاحظة المعلم في الخطة', NV.plan_note]].filter(r => (r[1] || '').trim());
      box.innerHTML = R.length ? `<b style="color:#082B5A">ما في الخطة لهذه الحصة (يُنقل لبند «السير في المنهج»):</b>${R.map(r => `<div><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div>`).join('')}` : `<span class="small muted">${e ? 'لا تفاصيل مكتوبة في الخطة لهذه الحصة بعد.' : 'لا توجد حصة في الخطة الأسبوعية لهذا الفصل في هذه الحصة — أدخل البيانات يدوياً أو اختر حصة أخرى.'}</span>`; sum(); }
    function drawSrc() { const t = tOf(NV.cid, NV.period), np = NV.date === today() ? nowPer(NV.cid) : -1, w = weekFor(NV.date);
      $('#vsSrc', O).innerHTML = [NV.period && np === NV.period ? '<span class="vs-tag ok">⏱ الحصة الجارية الآن</span>' : NV.period ? '<span class="vs-tag">اختيار يدوي للحصة</span>' : '', t ? `<span class="vs-tag">${esc(t.f)} – ${esc(t.t)}</span>` : '', w ? `<span class="vs-tag">الأسبوع ${esc(w.word || AR(w.number || ''))}</span>` : '<span class="vs-tag warn">التاريخ خارج أسابيع الخطة</span>', NV.entry ? '<span class="vs-tag ok">من الخطة الأسبوعية</span>' : NV.period ? '<span class="vs-tag warn">لا حصة في الخطة</span>' : '', NV.auto ? '' : '<span class="vs-tag warn">✎ عُدّلت يدوياً</span>'].join(''); }
    async function loadDay(auto) {
      const r = await dayEntries(NV.cid, NV.date); NV.day = r.list;
      const N = nPer(NV.cid, Math.max(0, ...r.list.map(e => e.period || 0)));
      if (auto || !NV.period) { const np = NV.date === today() && cfg().autoPeriod ? nowPer(NV.cid) : -1; NV.period = np > 0 ? np : (NV.period || (r.list[0] || {}).period || 1); }
      $('#vsP', O).innerHTML = Array.from({ length: N }, (_, i) => i + 1).map(p => { const t = tOf(NV.cid, p); return `<option value="${p}">${esc(perL(p))}${t ? ' (' + esc(t.f) + ')' : ''}</option>`; }).join(''); $('#vsP', O).value = String(NV.period);
      const np = NV.date === today() ? nowPer(NV.cid) : -1;
      $('#vsDay', O).innerHTML = Array.from({ length: N }, (_, i) => i + 1).map(p => { const e = r.list.find(x => x.period === p), t = tOf(NV.cid, p);
        return `<button type="button" role="option" class="vs-p ${p === NV.period ? 'on' : ''} ${p === np ? 'now' : ''} ${e ? '' : 'empty'}" data-p="${p}" aria-selected="${p === NV.period}"><b>${esc(perL(p))}${p === np ? ' · الآن' : ''}</b><span>${t ? esc(t.f + ' – ' + t.t) : ''}</span><span>${e ? esc((A.subjName ? A.subjName(e.subject_id) : '') || '—') : 'لا حصة'}</span><span>${e ? esc(nm(e.teacher_id)) : ''}</span></button>`; }).join('');
      $$('#vsDay [data-p]', O).forEach(b => b.onclick = () => setP(+b.dataset.p));
      const on = $('#vsDay .on', O); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
      pull(r.list.find(x => x.period === NV.period)); drawSrc();
    }
    const setP = p => { const N = $('#vsP', O).options.length; if (p < 1 || p > N) return A.toast(p < 1 ? 'هذه أول حصة' : 'هذه آخر حصة', 'warn'); NV.period = p; $('#vsP', O).value = String(p); $$('#vsDay [data-p]', O).forEach(b => { const on = +b.dataset.p === p; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }); pull(NV.day.find(x => x.period === p)); drawSrc(); };
    $('#vsP', O).onchange = e => setP(+e.target.value);
    $('#vsPrev', O).onclick = () => setP(NV.period - 1); $('#vsNext', O).onclick = () => setP(NV.period + 1);
    $('#vsNow', O).onclick = async () => { if (NV.date !== today()) { NV.date = today(); $('#vsD', O).value = NV.date; await loadDay(true); } const np = nowPer(NV.cid); if (np < 0) return A.toast('لا حصة جارية الآن لهذا الفصل (قبل الدوام أو بعده أو وقت فسحة) — اختر الحصة يدوياً', 'warn'); setP(np); };
    $('#vsRe', O).onclick = () => { pull(NV.day.find(x => x.period === NV.period)); drawSrc(); A.toast(NV.entry ? 'جُلبت بيانات الحصة من الخطة' : 'لا حصة في الخطة لهذه الحصة', NV.entry ? 'ok' : 'warn'); };
    $('#vsD', O).onchange = async e => { NV.date = e.target.value || today(); await loadDay(NV.date === today()); };
    const man = (k, el) => el.oninput = el.onchange = () => { NV[k] = el.value; NV.auto = false; drawSrc(); if (k === 'topic' || k === 'subject_id') { clearTimeout(man._t); man._t = setTimeout(loadPrep, 500); } sum(); };
    man('teacher_id', $('#vsT', O)); man('subject_id', $('#vsSb', O)); man('topic', $('#vsTp', O)); man('homework', $('#vsHw', O));
    $('#vsPc', O).onchange = e => { NV.pace_v = e.target.value; sum(); };
    // ٣) النوع
    $$('#vsTy [data-ty]', O).forEach(b => b.onclick = () => { $$('#vsTy [data-ty]', O).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); const o = b.dataset.ty === '__o'; $('#vsTyO', O).hidden = !o; NV.type = o ? ($('#vsTyI', O).value.trim() || '') : b.dataset.ty; if (o) $('#vsTyI', O).focus(); sum(); });
    $('#vsTyI', O).oninput = e => { NV.type = e.target.value.trim(); sum(); };
    $('#vsR', O).oninput = e => { NV.role = e.target.value; }; $('#vsNt', O).oninput = e => { NV.note = e.target.value; };
    // ٤) النماذج
    let L = null, AL = [];
    const drawT = () => { $('#vsTpl', O).innerHTML = AL.map(t => { const k = NV.tpls.indexOf(t.key); return `<div class="vs-t ${k >= 0 ? 'on' : ''}" role="checkbox" tabindex="0" aria-checked="${k >= 0}" data-tk="${esc(t.key)}"><span class="k" aria-hidden="true">${k >= 0 ? AR(k + 1) : ''}</span><b>${esc(t.name)}</b>${t.tag ? `<span class="vs-tag" style="justify-self:start">${esc(t.tag)}</span>` : ''}<span class="small muted">${esc(t.desc || '')}</span></div>`; }).join('') || '<p class="small muted">لا نماذج متاحة — يحددها المالك من الإعدادات</p>';
      $$('#vsTpl [data-tk]', O).forEach(el => { const tg = () => { const k = el.dataset.tk, i = NV.tpls.indexOf(k); if (i >= 0) NV.tpls.splice(i, 1); else NV.tpls.push(k); if (NV.custom) { NV.custom = null; A.toast('تغيّر اختيار النماذج فأُلغي التخصيص السابق', 'warn'); } drawT(); sum(); }; el.onclick = tg; el.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tg(); } }; });
      $('#vsCusI', O).innerHTML = NV.custom ? '<span class="vs-tag ok">✎ مخصّص لهذه الزيارة</span> <button type="button" class="btn ghost sm" id="vsCusX">إلغاء التخصيص</button>' : ''; const x = $('#vsCusX', O); if (x) x.onclick = () => { NV.custom = null; drawT(); }; };
    const picked = () => NV.tpls.map(k => AL.find(t => t.key === k)).filter(Boolean);
    const curTpl = () => { const it = picked(); if (!it.length) throw new Error('اختر نموذجاً واحداً على الأقل'); let tp = NV.custom ? clone(NV.custom) : merge(it); if (NV.pace) addPace(tp); return tp; };
    $('#vsPace', O).onchange = e => { NV.pace = e.target.checked; if (NV.custom && !NV.pace) NV.custom.blocks = NV.custom.blocks.filter(b => !/^vpace/.test(b.id)); };
    $('#vsCus', O).onclick = () => { try { const tp = curTpl(); itemsEditor(tp, t => { NV.custom = t; NV.pace = t.blocks.some(b => b.id === 'vpace'); $('#vsPace', O).checked = NV.pace; drawT(); }, { base: (picked()[0] || {}).base }); } catch (e) { A.toast(e.message, 'warn'); } };
    $('#vsPv', O).onclick = () => { try { const v = visitObj(); const tp = buildTpl(picked(), v, { custom: NV.custom, pace: NV.pace }); const d = fill(tp, {}, v, true); A._forms.openTask({ id: 'preview', title: (v.type || 'زيارة') + ' (معاينة)', tpl: tp, cfg: L.cfg, data: d, sigs: {}, cosign: [], status: 'approved', assignee: null }); } catch (e) { A.toast(e.message, 'warn'); } };
    function visitObj() { const cl = classes().find(x => x.id === NV.cid) || {}, t = tOf(NV.cid, NV.period);
      return { class_id: NV.cid, class_name: cl.name || '', section_id: S.sectionId, date: NV.date, period: NV.period || null, time: t ? t.f + ' – ' + t.t : '', teacher_id: NV.teacher_id || null, teacher_name: NV.teacher_id ? nm(NV.teacher_id) : '', subject_id: NV.subject_id || null, subject: NV.subject_id && A.subjName ? A.subjName(NV.subject_id) : '', topic: (NV.topic || '').trim(), homework: (NV.homework || '').trim(), plan_note: NV.plan_note || '', exec: NV.exec || '', entry_id: NV.entry ? NV.entry.id : null, week_id: (weekFor(NV.date) || {}).id || null, from_plan: !!NV.entry, edited: !NV.auto, now: NV.date === today() && nowPer(NV.cid) === NV.period, type: NV.type || cfg().defType, role: (NV.role || '').trim(), visitor_id: S.me.id, visitor_name: S.me.full_name || '', pace: NV.pace_v || '', plan: NV.plan || {}, tpls: NV.tpls.slice(), custom: !!NV.custom, at: nowIso() }; }
    function sum() { const el = $('#vsSum', O); if (!el) return; const cl = classes().find(x => x.id === NV.cid); el.innerHTML = cl ? `<b>${esc(NV.type || '—')}</b> · ${esc(cl.name)} · ${esc(perL(NV.period))} · ${esc(NV.teacher_id ? nm(NV.teacher_id) : 'لم يُحدَّد المعلم')}${NV.topic ? ' · ' + esc(NV.topic) : ''} · ${AR(NV.tpls.length)} نموذج` : ''; }
    $('#vsClr', O).onclick = () => { resetNV(); reload(); };
    $('#vsGo', O).onclick = ev => A.run(ev.currentTarget, async () => {
      if (!NV.cid) throw new Error('اختر الفصل'); if (!NV.teacher_id) { $('#vsT', O).focus(); throw new Error('اختر المعلم صاحب الحصة'); } if (!NV.type) throw new Error('اكتب نوع الزيارة');
      const items = picked(); if (!items.length) throw new Error('اختر نموذجاً واحداً على الأقل');
      const v = visitObj(), t = await createVisit(v, items, { custom: NV.custom, pace: NV.pace, note: NV.note, cfg: L.cfg });
      setPref({ type: NV.type, role: NV.role, tpls: NV.tpls }); resetNV(); st.tab = 'list';
      A._forms.openTask(t, () => { if (S.view === 'visits') { clearTimeout(newTab._r); newTab._r = setTimeout(reload, 500); } }); reload();
    });
    if (NV.cid) await loadDay(!NV.period); sum();
    try { L = await lib(); AL = allowed(L); drawT(); } catch (e) { $('#vsTpl', O).innerHTML = `<div class="notice bad" style="display:block">${esc(e.message)}</div>`; }
  }

  async function createVisit(v, items, o) {
    const tp = buildTpl(items, v, o), d = fill(tp, {}, v, true), ts = A.formsTeacherSlot ? A.formsTeacherSlot(tp) : null;
    const row = { school_id: S.school.id, batch_id: crypto.randomUUID ? crypto.randomUUID() : null, tid: items.length === 1 ? items[0].base : items.map(x => x.base).join('+'), title: `${v.type}: ${tp.name || items.map(x => x.name).join(' + ')}`, cat: 'visits', tpl: tp, cfg: o.cfg || (LIB || {}).cfg || {}, assignee: v.teacher_id, due_date: null, note: o.note || '', mode: 'sign', perms: { a: 'sign', c: 'sign', share: 'admin', endorse: false }, data: d,
      cosign: ts ? [{ staff_id: v.teacher_id, key: ts.key, label: ts.label, status: 'pending', by: S.me.id }] : [], visit: v,
      trail: [{ at: nowIso(), by: S.me.id, act: 'visit', note: [v.class_name, perL(v.period), v.date, v.edited ? 'بيانات معدّلة يدوياً' : v.from_plan ? 'من الخطة' : 'بلا خطة'].join(' · ') }],
      ...(DEMO ? { created_by: S.me.id, status: 'assigned', sigs: {}, teacher_note: '', created_at: nowIso(), updated_at: nowIso() } : {}) };
    if (!row.batch_id) delete row.batch_id;
    const r = await api.ins('form_tasks', [row]); const t = Array.isArray(r) ? r[0] : r;
    if (cfg().notifyOwner && !own()) { const ids = (S.staff || []).filter(p => p.is_owner).map(p => p.id); if (ids.length && A.notice) A.notice(ids, 'زيارة جديدة: ' + v.type, `${S.me.full_name} زار ${v.class_name} (${perL(v.period)}) — ${v.teacher_name}`, { link: '#/visits' }).catch(() => { }); }
    return t || row;
  }

  // ---------- تعديل بيانات زيارة ----------
  async function editVisit(t0, after) {
    const [t] = await api.list('form_tasks', { id: t0.id }); if (!t) return A.toast('الزيارة غير موجودة', 'err');
    const v = { ...(t.visit || {}) }, c = cfg(), signedT = (t.sigs || {}) && (t.cosign || []).some(x => x.staff_id === t.assignee && x.status === 'signed');
    const people = (S.staff || []).filter(p => p.active !== false).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
    const subs = (S.subjects || []).slice().sort((a, b) => A.cmpSubj ? A.cmpSubj(a, b) : 0);
    let att = ((t.data || {})._att || []).slice();
    const m = A.modal(`<h3>بيانات الزيارة</h3><p class="sub">عدّل أي بيان، أو أعد جلبه من الخطة لحصة أخرى. يُوثَّق التعديل في سجل الاستمارة.</p>
      <div class="vs-g">
        <div class="field"><label for="veC">الفصل</label><select class="in" id="veC">${classes().map(x => `<option value="${x.id}" ${x.id === v.class_id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}${v.class_id && !classes().some(x => x.id === v.class_id) ? `<option value="${esc(v.class_id)}" selected>${esc(v.class_name || '')}</option>` : ''}</select></div>
        <div class="field"><label for="veD">التاريخ</label><input class="in" type="date" id="veD" value="${esc(v.date || today())}"></div>
        <div class="field"><label for="veP">الحصة</label><select class="in" id="veP"></select></div>
        <div class="field"><label for="veT">المعلم</label><select class="in" id="veT" ${signedT || t.status === 'approved' ? 'disabled' : ''}>${people.map(p => `<option value="${p.id}" ${p.id === t.assignee ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select>${signedT || t.status === 'approved' ? '<span class="small muted">وقّع المعلم — لا يمكن تغييره</span>' : ''}</div>
        <div class="field"><label for="veS">المادة</label><select class="in" id="veS"><option value="">—</option>${subs.map(s => `<option value="${s.id}" ${s.id === v.subject_id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="veTp">الدرس / الموضوع</label><input class="in" id="veTp" value="${esc(v.topic || '')}"></div>
        <div class="field"><label for="veHw">الواجب</label><input class="in" id="veHw" value="${esc(v.homework || '')}"></div>
        <div class="field"><label for="veTy">نوع الزيارة</label><input class="in" id="veTy" list="veTyL" value="${esc(v.type || '')}"><datalist id="veTyL">${c.types.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
        <div class="field"><label for="veR">صفة الزائر</label><input class="in" id="veR" list="veRL" value="${esc(v.role || '')}"><datalist id="veRL">${c.roles.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
        <div class="field"><label for="vePc">السير في المنهج</label><select class="in" id="vePc"><option value="">—</option>${Object.keys(PACE_TXT).map(k => `<option value="${k}" ${v.pace === k ? 'selected' : ''}>${PACE_TXT[k]}</option>`).join('')}</select></div>
        <div class="field full"><label for="veN">ملاحظة للمعلم</label><input class="in" id="veN" value="${esc(t.note || '')}"></div>
      </div>
      <div class="row" style="gap:8px;flex-wrap:wrap;margin:6px 0"><button type="button" class="btn ghost sm" id="vePl">↻ جلب من الخطة لهذه الحصة</button><span class="small muted" id="vePlI"></span></div>
      ${c.att ? `<div class="field"><label>الشواهد والمرفقات (صور أو PDF، حتى ${AR(c.maxAtt)})</label><div class="vs-att" id="veA"></div><input type="file" id="veF" accept="image/*,application/pdf" multiple class="in" style="margin-top:6px" aria-label="إضافة مرفقات"></div>` : ''}
      <label class="chk"><input type="checkbox" id="veFl" checked> تحديث الحقول المقابلة داخل الاستمارة (المعلم، الصف، المادة، الحصة، التاريخ، الدرس، السير في المنهج)</label>
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="veOk" type="button">حفظ</button></div>`, { cls: 'wide' });
    const fillP = () => { const cid = $('#veC', m.el).value, N = nPer(cid, v.period || 0); $('#veP', m.el).innerHTML = Array.from({ length: N }, (_, i) => i + 1).map(p => { const x = tOf(cid, p); return `<option value="${p}" ${p === +v.period ? 'selected' : ''}>${esc(perL(p))}${x ? ' (' + esc(x.f) + ')' : ''}</option>`; }).join(''); };
    fillP(); $('#veC', m.el).onchange = fillP;
    let pulled = null;
    $('#vePl', m.el).onclick = async () => { const cid = $('#veC', m.el).value, d = $('#veD', m.el).value, p = +$('#veP', m.el).value; const r = await dayEntries(cid, d), e = r.list.find(x => x.period === p);
      if (!e) { $('#vePlI', m.el).textContent = 'لا حصة في الخطة لهذا الفصل في هذه الحصة'; return; } pulled = e;
      if (!$('#veT', m.el).disabled && e.teacher_id) $('#veT', m.el).value = e.teacher_id; $('#veS', m.el).value = e.subject_id || ''; $('#veTp', m.el).value = e.topic || ''; $('#veHw', m.el).value = e.homework || ''; $('#vePlI', m.el).textContent = 'جُلبت من الخطة ✓'; };
    const drawA = () => { const el = $('#veA', m.el); if (!el) return; el.innerHTML = att.map((a, i) => `<span class="f">${/^data:image/.test(a.d) ? `<img src="${a.d}" alt="${esc(a.n)}">` : '📎 ' + esc(a.n)}<button type="button" class="btn ghost sm" data-ad="${i}" aria-label="حذف ${esc(a.n)}">✕</button></span>`).join('') || '<span class="small muted">لا مرفقات</span>'; $$('[data-ad]', el).forEach(b => b.onclick = () => { att.splice(+b.dataset.ad, 1); drawA(); }); };
    drawA(); const fi = $('#veF', m.el); if (fi) fi.onchange = async () => { for (const f of fi.files) { if (att.length >= c.maxAtt) { A.toast('الحد الأقصى للمرفقات ' + AR(c.maxAtt), 'warn'); break; } try { att.push(await readAtt(f)); } catch (e) { A.toast(e.message, 'err'); } } fi.value = ''; drawA(); };
    $('#veOk', m.el).onclick = ev => A.run(ev.currentTarget, async () => {
      const cid = $('#veC', m.el).value, p = +$('#veP', m.el).value, tm = tOf(cid, p), tid = $('#veT', m.el).value, sid = $('#veS', m.el).value;
      const nv = { ...v, class_id: cid, class_name: cName(cid) || v.class_name, date: $('#veD', m.el).value || v.date, period: p, time: tm ? tm.f + ' – ' + tm.t : v.time, teacher_id: tid, teacher_name: nm(tid), subject_id: sid || null, subject: sid && A.subjName ? A.subjName(sid) : '', topic: $('#veTp', m.el).value.trim(), homework: $('#veHw', m.el).value.trim(), type: $('#veTy', m.el).value.trim() || v.type, role: $('#veR', m.el).value.trim(), pace: $('#vePc', m.el).value, edited: true };
      if (pulled) Object.assign(nv, { entry_id: pulled.id, from_plan: true, exec: pulled.exec_status ? (EXEC[pulled.exec_status] || pulled.exec_status) : nv.exec });
      const FL = { class_name: 'الفصل', date: 'التاريخ', period: 'الحصة', teacher_name: 'المعلم', subject: 'المادة', topic: 'الدرس', homework: 'الواجب', type: 'النوع', role: 'الصفة', pace: 'السير في المنهج' };
      const ch = Object.keys(FL).filter(k => String(v[k] || '') !== String(nv[k] || '')).map(k => `${FL[k]}: ${k === 'pace' ? (PACE_TXT[v[k]] || '—') : (v[k] || '—')} ← ${k === 'pace' ? (PACE_TXT[nv[k]] || '—') : (nv[k] || '—')}`);
      const patch = { visit: nv, note: $('#veN', m.el).value.trim(), title: String(t.title || '').replace(/^[^:]*:/, nv.type + ':'), trail: (t.trail || []).concat(ch.length || att.length !== ((t.data || {})._att || []).length ? [{ at: nowIso(), by: S.me.id, act: 'vedit', note: ch.join('\n') || 'تحديث المرفقات' }] : []) };
      let data = { ...(t.data || {}) }; if (c.att) data._att = att;
      if ($('#veFl', m.el).checked) { data = fill(t.tpl, data, nv, true); if (cfg().head && t.tpl) { patch.tpl = { ...t.tpl, sub: [nv.type, nv.class_name, perL(nv.period), dt(nv.date, true)].filter(Boolean).join(' · ') }; } }
      patch.data = data;
      if (tid && tid !== t.assignee) { if (signedT || t.status === 'approved') throw new Error('وقّع المعلم على الاستمارة — لا يمكن تغيير المعلم'); patch.assignee = tid; patch.cosign = (t.cosign || []).map(x => x.staff_id === t.assignee ? { ...x, staff_id: tid, status: 'pending' } : x); }
      await api.upd('form_tasks', t.id, patch); m.close(); A.toast('حُفظت بيانات الزيارة', 'ok'); after && after();
    });
  }
  function readAtt(f) { return new Promise((ok, no) => {
    if (f.size > 6e6) return no(new Error('الملف كبير: ' + f.name));
    const rd = new FileReader(); rd.onerror = () => no(new Error('تعذّرت قراءة ' + f.name));
    rd.onload = () => { const d = rd.result; if (!/^image\//.test(f.type)) { if (f.size > 9e5) return no(new Error('ملف PDF أكبر من ٩٠٠ ك.ب: ' + f.name)); return ok({ n: f.name, type: f.type, d }); }
      const im = new Image(); im.onload = () => { const s = Math.min(1, 1100 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); ok({ n: f.name, type: 'image/jpeg', d: c.toDataURL('image/jpeg', 0.62) }); }; im.onerror = () => no(new Error('صورة غير صالحة: ' + f.name)); im.src = d; };
    rd.readAsDataURL(f); }); }

  // ---------- تحميل الزيارات ----------
  async function loadVisits() {
    const L = await api.list('form_tasks', { school_id: S.school.id }, { order: 'created_at', desc: true, select: 'id,tid,title,assignee,created_by,status,cosign,mode,teacher_note,note,submitted_at,decided_at,created_at,updated_at,endorsed_at,visit' });
    return L.filter(t => t.visit && (isAdm() || t.created_by === S.me.id));
  }
  const inRange = (t, f, to) => { const d = (t.visit || {}).date || String(t.created_at).slice(0, 10); return (!f || d >= f) && (!to || d <= to); };
  const filt = (L) => L.filter(t => { const v = t.visit || {}; return inRange(t, st.from, st.to) && (!st.teacher || t.assignee === st.teacher) && (!st.cls || v.class_id === st.cls) && (!st.type || v.type === st.type) && (!st.vis || t.created_by === st.vis) && (!st.status || (st.status === 'draft' ? !['submitted', 'approved'].includes(t.status) : t.status === st.status)) && (!st.mine || t.created_by === S.me.id) && (!st.q || nk([v.class_name, v.teacher_name, v.subject, v.topic, v.type, v.visitor_name, t.title].join(' ')).includes(nk(st.q))); });
  const rangeBtns = `<div class="vs-chips" id="vsRg">${[['today', 'اليوم'], ['week', 'هذا الأسبوع'], ['month', 'هذا الشهر'], ['all', 'الكل']].map(([k, l]) => `<button type="button" data-rg="${k}">${l}</button>`).join('')}</div>`;
  const bindRange = (O, redraw) => $$('#vsRg [data-rg]', O).forEach(b => b.onclick = () => { const k = b.dataset.rg, td = today(); const w = weekFor(td);
    if (k === 'today') st.from = st.to = td; else if (k === 'week') { st.from = w ? w.start_date : addD(td, -A.parseDate(td).getDay()); st.to = addD(st.from, 6); } else if (k === 'month') { st.from = td.slice(0, 8) + '01'; st.to = td; } else st.from = st.to = ''; redraw(); });
  const rowX = t => { const v = t.visit || {}; return { 'التاريخ': v.date || '', 'اليوم': v.date ? (A.DAYS || [])[A.parseDate(v.date).getDay()] || '' : '', 'الحصة': v.period || '', 'الوقت': v.time || '', 'الفصل': v.class_name || '', 'المعلم': nm(t.assignee), 'المادة': v.subject || '', 'الدرس': v.topic || '', 'نوع الزيارة': v.type || '', 'الزائر': v.visitor_name || nm(t.created_by), 'الصفة': v.role || '', 'السير في المنهج': PACE_TXT[v.pace] || '', 'الحالة': (STV[t.status] || [t.status])[0], 'ملاحظة المعلم': t.teacher_note || '', 'من الخطة': v.from_plan ? 'نعم' : 'لا', 'عُدّلت يدوياً': v.edited ? 'نعم' : 'لا' }; };
  const toXlsx = (L, name) => { if (!window.XLSX) return A.toast('مكتبة Excel غير محمّلة', 'err'); if (!L.length) return A.toast('لا زيارات', 'warn'); const ws = XLSX.utils.json_to_sheet(L.map(rowX)); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] }; XLSX.utils.book_append_sheet(wb, ws, 'الزيارات'); XLSX.writeFile(wb, (name || 'الزيارات') + '.xlsx'); };

  async function listTab(O, reload) {
    O.innerHTML = '<div class="spinner"></div>';
    const ALL = await loadVisits(), c = cfg();
    const teachers = [...new Set(ALL.map(t => t.assignee))].map(id => [id, nm(id)]).sort((a, b) => a[1].localeCompare(b[1], 'ar'));
    const visitors = [...new Set(ALL.map(t => t.created_by))].map(id => [id, nm(id)]);
    const types = [...new Set(c.types.concat(ALL.map(t => (t.visit || {}).type).filter(Boolean)))];
    const opt = (L, v) => L.map(([k, l]) => `<option value="${esc(k)}" ${v === k ? 'selected' : ''}>${esc(l)}</option>`).join('');
    O.innerHTML = `<div class="vs-flt">
        <label>بحث<input class="in" id="lfQ" value="${esc(st.q)}" placeholder="فصل، معلم، درس…"></label>
        <label>من<input class="in" type="date" id="lfF" value="${esc(st.from)}"></label><label>إلى<input class="in" type="date" id="lfT" value="${esc(st.to)}"></label>
        <label>المعلم<select class="in" id="lfTe"><option value="">الكل</option>${opt(teachers, st.teacher)}</select></label>
        <label>الفصل<select class="in" id="lfC"><option value="">الكل</option>${opt(classes().map(x => [x.id, x.name]), st.cls)}</select></label>
        <label>النوع<select class="in" id="lfTy"><option value="">الكل</option>${opt(types.map(x => [x, x]), st.type)}</select></label>
        ${isAdm() ? `<label>الزائر<select class="in" id="lfV"><option value="">الكل</option>${opt(visitors, st.vis)}</select></label>` : ''}
        <label>الحالة<select class="in" id="lfS"><option value="">الكل</option>${opt([['draft', 'مسودة لدى الزائر'], ['submitted', 'بانتظار توقيع المعلم'], ['approved', 'مكتملة']], st.status)}</select></label>
      </div>${rangeBtns}
      <div class="row" style="gap:6px;flex-wrap:wrap;margin:8px 0"><button class="btn ghost sm" id="lfX" type="button">⬇ Excel</button><button class="btn ghost sm" id="lfPr" type="button">🖨 طباعة القائمة</button>${supOk() ? '<button class="btn ghost sm" id="lfSup" type="button">⇄ إرسال المحدد لملفات الإشراف</button>' : ''}<button class="btn ghost sm" id="lfAll" type="button">تحديد الظاهر</button><span class="small muted" id="lfN"></span></div>
      <div class="vs-list" id="lfL"></div>`;
    const draw = () => {
      const L = filt(ALL); $('#lfN', O).textContent = `${AR(L.length)} زيارة${st.sel.size ? ' · المحدد ' + AR(st.sel.size) : ''}`;
      $('#lfL', O).innerHTML = L.map(t => { const v = t.visit || {}, mine = t.created_by === S.me.id || own();
        return `<div class="vs-card s-${esc(t.status)} ${st.sel.has(t.id) ? 'sel' : ''}"><div class="hd"><label class="chk" style="margin:0"><input type="checkbox" data-sl="${t.id}" ${st.sel.has(t.id) ? 'checked' : ''} aria-label="تحديد"></label><b>${esc(v.class_name || '—')} · ${esc(perL(v.period))}</b>${pill(STV, t.status)}<span class="vs-tag">${esc(v.type || '')}</span>${v.pace ? pill(PACE, v.pace) : ''}${t.endorsed_at ? '<span class="pill fm-end">✦ معمّد</span>' : ''}</div>
          <div class="mt"><span>👤 ${esc(nm(t.assignee))}</span>${v.subject ? `<span>📘 ${esc(v.subject)}</span>` : ''}${v.topic ? `<span>📝 ${esc(v.topic)}</span>` : ''}<span>📅 ${esc(dt(v.date, true))}${v.time ? ' · ' + esc(v.time) : ''}</span><span>👁️ ${esc(v.visitor_name || nm(t.created_by))}${v.role ? ' — ' + esc(v.role) : ''}</span>${v.edited ? '<span>✎ معدّلة</span>' : ''}</div>
          ${t.teacher_note ? `<div class="small" style="background:#F4F8FC;border-radius:10px;padding:5px 8px">ملاحظة المعلم: ${esc(t.teacher_note)}</div>` : ''}
          <div class="ac"><button class="btn sm" data-op="open" data-id="${t.id}" type="button">فتح الاستمارة</button>${mine ? `<button class="btn ghost sm" data-op="edit" data-id="${t.id}" type="button">✎ البيانات</button>` : ''}<button class="btn ghost sm" data-op="again" data-id="${t.id}" type="button">↺ زيارة أخرى لنفس المعلم</button>${supOk() ? `<button class="btn ghost sm" data-op="sup" data-id="${t.id}" type="button">⇄ ملفات الإشراف</button>` : ''}${mine ? `<button class="btn ghost sm" data-op="del" data-id="${t.id}" type="button" aria-label="حذف الزيارة">🗑</button>` : ''}</div></div>`; }).join('') || A.emptyBox('لا زيارات', 'ابدأ من «زيارة جديدة»');
      $$('[data-sl]', O).forEach(i => i.onchange = () => { i.checked ? st.sel.add(i.dataset.sl) : st.sel.delete(i.dataset.sl); draw(); });
      $$('[data-op]', $('#lfL', O)).forEach(b => b.onclick = () => act(b.dataset.op, b.dataset.id, b));
    };
    async function act(op, id, btn) { const t = ALL.find(x => x.id === id);
      if (op === 'open') { const [f] = await api.list('form_tasks', { id }); if (f) A._forms.openTask(f, () => { clearTimeout(act._r); act._r = setTimeout(reload, 500); }); }
      if (op === 'edit') return editVisit(t, reload);
      if (op === 'again') { const v = t.visit || {}; resetNV(); Object.assign(NV, { cid: v.class_id, type: v.type || NV.type, tpls: (v.tpls && v.tpls.length ? v.tpls : NV.tpls), role: v.role || NV.role }); st.tab = 'new'; return reload(); }
      if (op === 'sup') return A.run(btn, async () => { const n = await supSend([id]); A.toast(`أُرسلت ${AR(n)} زيارة إلى ملفات الإشراف`, 'ok'); });
      if (op === 'del') { if (!(await A.confirmBox('حذف هذه الزيارة واستمارتها وتوقيعاتها؟ (تُنقل إلى سلة المحذوفات)', 'حذف', true))) return; return A.run(btn, async () => { await api.del('form_tasks', id); A.toast('حُذفت', 'ok'); reload(); }); } }
    const bind = (id, k) => { const el = $(id, O); if (el) el.oninput = el.onchange = () => { st[k] = el.value; draw(); }; };
    bind('#lfQ', 'q'); bind('#lfF', 'from'); bind('#lfT', 'to'); bind('#lfTe', 'teacher'); bind('#lfC', 'cls'); bind('#lfTy', 'type'); bind('#lfV', 'vis'); bind('#lfS', 'status');
    bindRange(O, () => { $('#lfF', O).value = st.from; $('#lfT', O).value = st.to; draw(); });
    $('#lfX', O).onclick = () => toXlsx(filt(ALL), cfg().title);
    $('#lfPr', O).onclick = () => printList(filt(ALL));
    $('#lfAll', O).onclick = () => { filt(ALL).forEach(t => st.sel.add(t.id)); draw(); };
    if ($('#lfSup', O)) $('#lfSup', O).onclick = ev => A.run(ev.currentTarget, async () => { if (!st.sel.size) throw new Error('حدّد زيارة أو أكثر'); const n = await supSend([...st.sel]); A.toast(`أُرسلت ${AR(n)} زيارة إلى ملفات الإشراف`, 'ok'); });
    draw();
  }
  function printList(L) {
    if (!L.length) return A.toast('لا زيارات', 'warn');
    const rows = L.map(rowX), cols = ['التاريخ', 'الحصة', 'الفصل', 'المعلم', 'المادة', 'الدرس', 'نوع الزيارة', 'الزائر', 'السير في المنهج', 'الحالة'];
    const html = `<table class="tbl"><thead><tr><th>م</th>${cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr><td>${AR(i + 1)}</td>${cols.map(c => `<td>${esc(c === 'التاريخ' ? dt(r[c]) : r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    if (A.printDoc) return A.printDoc(cfg().title, `${AR(L.length)} زيارة${st.from || st.to ? ' · ' + (st.from ? dt(st.from) : '') + ' – ' + (st.to ? dt(st.to) : '') : ''}`, html, true);
    const w = window.open(''); w.document.write(`<html dir="rtl"><body>${html}</body></html>`); w.print();
  }

  // ---------- التقارير والتغطية ----------
  async function repTab(O, reload) {
    O.innerHTML = '<div class="spinner"></div>';
    const ALL = await loadVisits();
    O.innerHTML = `<div class="vs-flt"><label>من<input class="in" type="date" id="rpF" value="${esc(st.from)}"></label><label>إلى<input class="in" type="date" id="rpT" value="${esc(st.to)}"></label></div>${rangeBtns}<div id="rpB"></div>`;
    const draw = () => {
      const L = ALL.filter(t => inRange(t, st.from, st.to)), cnt = (f) => { const m = new Map(); L.forEach(t => { const k = f(t); if (!k) return; m.set(k, (m.get(k) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
      const bars = (E) => { const mx = Math.max(1, ...E.map(x => x[1])); return `<div class="vs-bars">${E.map(([k, n]) => `<div><span>${esc(k)}</span><i style="width:${Math.max(4, n / mx * 100)}%" aria-hidden="true"></i><b>${AR(n)}</b></div>`).join('') || '<span class="small muted">لا بيانات</span>'}</div>`; };
      // المعلمون المستهدفون: من لهم حصص في الخطة (الأسبوع المحمّل) أو جدول القسم
      const tIds = [...new Set((S.allEntries || S.entries || []).map(e => e.teacher_id).filter(Boolean))];
      const visited = new Map(); L.forEach(t => { const x = visited.get(t.assignee) || { n: 0, last: '', pace: [] }; x.n++; const d = (t.visit || {}).date || ''; if (d > x.last) x.last = d; if ((t.visit || {}).pace) x.pace.push(t.visit.pace); visited.set(t.assignee, x); });
      const not = tIds.filter(id => !visited.has(id)).sort((a, b) => nm(a).localeCompare(nm(b), 'ar'));
      const per = [...visited.entries()].sort((a, b) => b[1].n - a[1].n);
      $('#rpB', O).innerHTML = `<div class="vs-kp">${[['الزيارات', L.length], ['مكتملة بتوقيع المعلم', L.filter(t => t.status === 'approved').length], ['بانتظار توقيع المعلم', L.filter(t => t.status === 'submitted').length], ['مسودات لدى الزائر', L.filter(t => !['submitted', 'approved'].includes(t.status)).length], ['معلمون زيروا', visited.size], ['لم يُزاروا (لهم حصص)', not.length]].map(([l, n]) => `<div><b>${AR(n)}</b><span>${l}</span></div>`).join('')}</div>
        <div class="vs-g"><section class="vs-st"><h3>حسب نوع الزيارة</h3>${bars(cnt(t => (t.visit || {}).type))}</section><section class="vs-st"><h3>حسب الزائر</h3>${bars(cnt(t => (t.visit || {}).visitor_name || nm(t.created_by)))}</section><section class="vs-st"><h3>السير في المنهج</h3>${bars(cnt(t => PACE_TXT[(t.visit || {}).pace] || ''))}</section><section class="vs-st"><h3>حسب الحصة</h3>${bars(cnt(t => (t.visit || {}).period ? perL(t.visit.period) : ''))}</section></div>
        <section class="vs-st"><h3>المعلمون الذين زيروا</h3><div class="scroll"><table class="tbl"><thead><tr><th>المعلم</th><th>عدد الزيارات</th><th>آخر زيارة</th><th>مطابقة الخطة</th></tr></thead><tbody>${per.map(([id, x]) => `<tr><td style="text-align:start">${esc(nm(id))}</td><td>${AR(x.n)}</td><td>${esc(dt(x.last))}</td><td>${x.pace.length ? AR(x.pace.filter(p => p === 'match').length) + ' / ' + AR(x.pace.length) : '—'}</td></tr>`).join('') || '<tr><td colspan="4">لا زيارات</td></tr>'}</tbody></table></div></section>
        <section class="vs-st"><h3>لم تتم زيارتهم في الفترة <span class="small muted" style="font-weight:400">(معلمون لهم حصص في خطة الأسبوع المعروض)</span></h3><div class="vs-chips">${not.map(id => `<button type="button" data-nv="${id}" title="بدء زيارة">${esc(nm(id))}</button>`).join('') || '<span class="small muted">زير كل المعلمين 👏</span>'}</div></section>
        <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn ghost sm" id="rpX" type="button">⬇ Excel للفترة</button><button class="btn ghost sm" id="rpP" type="button">🖨 طباعة التقرير</button></div>`;
      $$('[data-nv]', O).forEach(b => b.onclick = () => { const e = (S.allEntries || S.entries || []).find(x => x.teacher_id === b.dataset.nv); resetNV(); if (e) NV.cid = e.class_id; st.tab = 'new'; reload(); });
      $('#rpX', O).onclick = () => toXlsx(L, 'تقرير ' + cfg().title);
      $('#rpP', O).onclick = () => { const body = $('#rpB', O).cloneNode(true); $$('button', body).forEach(b => { if (!b.closest('.vs-chips')) b.remove(); }); const h = body.innerHTML + `<style>${css}</style>`; if (A.printDoc) A.printDoc('تقرير ' + cfg().title, (st.from ? dt(st.from) : 'كل الفترات') + (st.to ? ' – ' + dt(st.to) : ''), h, false); };
    };
    const b = () => { $('#rpF', O).oninput = e => { st.from = e.target.value; draw(); }; $('#rpT', O).oninput = e => { st.to = e.target.value; draw(); }; };
    b(); bindRange(O, () => { $('#rpF', O).value = st.from; $('#rpT', O).value = st.to; draw(); }); draw();
  }

  // ---------- التكامل مع ملفات الإشراف (أداة «خطة ونماذج الإشراف» داخل المنصة: جدول sup_docs بمفاتيح cfg/… tpl/… rec/…) ----------
  const supOk = () => isAdm();
  async function supLoad() {
    let rows = []; try { rows = await api.list('sup_docs', { school_id: S.school.id }, { select: 'key,col,data' }); } catch (_) { rows = []; }
    const o = { cfg: {}, tpl: {}, rec: {} }; rows.forEach(r => { if (r.data == null || !o[r.col]) return; o[r.col][String(r.key).slice(r.col.length + 1)] = r.data; }); return o;
  }
  const supPut = (col, id, obj, meta) => api.ups('sup_docs', [{ school_id: S.school.id, key: col + '/' + id, col, data: obj, meta: { t: Date.now(), ...(meta || {}) } }], 'school_id,key');
  async function supSend(ids) {
    if (!supOk()) throw new Error('الإرسال إلى ملفات الإشراف للمالك ومن لديه «الإشراف التربوي»');
    const o = await supLoad(); if (!o.cfg.main) throw new Error('افتح «الإشراف التربوي ← خطة ونماذج الإشراف» مرة واحدة لتهيئة ملفات الإشراف ثم أعد المحاولة');
    let n = 0;
    for (const id of ids) { const [t] = await api.list('form_tasks', { id }); if (!t || !t.visit) continue; const v = t.visit;
      const base = String(t.tid || '').split('+')[0], same = base && o.tpl[base] && !v.custom && !(v.tpls || []).slice(1).length && !(t.tpl.blocks || []).some(b => /^vpace/.test(b.id));
      let tid = base; if (!same) { tid = 'pv-' + t.id.slice(0, 8); const tp = { ...clone(t.tpl), id: tid, name: (t.tpl.name || t.title) + ' — زيارة ' + (v.class_name || ''), cat: 'cards', hidden: true }; await supPut('tpl', tid, tp, { name: tp.name, cat: 'cards' }); }
      const d = clone(t.data || {}); delete d._att;
      const rid = 'pv' + t.id.replace(/-/g, '').slice(0, 14), old = o.rec[rid] || {};
      const rec = { ...old, id: rid, tid, title: `${v.type || 'زيارة'} — ${v.class_name || ''} — ${nm(t.assignee)}`, teacher: nm(t.assignee), date: v.date || '', status: t.status === 'approved' ? 'done' : 'draft', created: old.created || Date.parse(t.created_at) || Date.now(), updated: Date.now(), d, pct: null, src: 'platform', task: t.id };
      await supPut('rec', rid, rec, { tid, teacher: rec.teacher, date: rec.date, pct: -1 }); n++; }
    return n;
  }
  async function intTab(O, reload) {
    if (!supOk()) { O.innerHTML = `<section class="vs-st"><h3>ملفات الإشراف</h3><p class="small">زياراتك محفوظة في المنصة وتظهر للمالك والإشراف التربوي، ويمكنك تصديرها Excel أو طباعتها من «الزيارات». الإرسال إلى ملفات أداة الإشراف والرفع منها للمالك ومن لديه «الإشراف التربوي».</p></section>`; return; }
    O.innerHTML = '<div class="spinner"></div>';
    const o = await supLoad(), recs = Object.values(o.rec || {}).filter(r => r && !r.deleted), fromP = recs.filter(r => r.src === 'platform');
    const evalT = id => { const t = (o.tpl || {})[id]; return t && (t.blocks || []).some(b => ['rating', 'score'].includes(b.type)); };
    const imp = recs.filter(r => r.src !== 'platform' && !r.platform && evalT(r.tid));
    O.innerHTML = `<section class="vs-st"><h3>أداة «خطة ونماذج الإشراف»</h3><p class="small" style="margin:0 0 6px">ملفات الإشراف (السجلات والتقارير الدورية وخطط التطوير وتحليل الأداء) محفوظة في المنصة. أرسل إليها الزيارات لتدخل في تقاريرها وتحليلها، أو ارفع تقييماتها لتصبح زيارات موثّقة يوقّعها المعلمون.</p>
        ${o.cfg.main ? '' : '<div class="notice warn" style="display:block">لم تُهيّأ ملفات الإشراف بعد — افتح «الإشراف التربوي ← خطة ونماذج الإشراف» مرة واحدة.</div>'}
        <div class="vs-kp"><div><b>${AR(recs.length)}</b><span>سجل في ملفات الإشراف</span></div><div><b>${AR(fromP.length)}</b><span>منها من الزيارات</span></div><div><b>${AR(imp.length)}</b><span>تقييمات يمكن رفعها كزيارات</span></div></div>
        <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn" id="inS" type="button">⇄ إرسال زيارات الفترة إلى ملفات الإشراف</button><a class="btn ghost" href="tools/supervision.html" target="_blank" rel="noopener">فتح أداة الإشراف ↗</a></div>
        <div class="vs-flt" style="margin-top:6px"><label>من<input class="in" type="date" id="inF" value="${esc(st.from)}"></label><label>إلى<input class="in" type="date" id="inT" value="${esc(st.to)}"></label><label class="chk" style="display:flex;align-items:center;gap:6px"><input type="checkbox" id="inA"> مع المسودات والتي بانتظار التوقيع</label></div></section>
      <section class="vs-st"><h3>رفع تقييمات ملفات الإشراف كزيارات</h3>${imp.length ? `<p class="small muted" style="margin:0 0 6px">كل سجل يصبح زيارة (مسودة لديك) بنفس النموذج والبيانات، ثم ترسلها للمعلم للتوقيع.</p><div class="scroll"><table class="tbl"><thead><tr><th></th><th>النموذج</th><th>المعلم في السجل</th><th>المعلم في المنصة</th><th>التاريخ</th></tr></thead><tbody>${imp.map(r => { const tn = r.teacher || ''; const mt = (S.staff || []).find(p => nk(p.full_name) === nk(tn)) || (S.staff || []).find(p => tn && nk(p.full_name).includes(nk(tn)));
          return `<tr><td><input type="checkbox" data-ir="${esc(r.id)}" ${mt ? 'checked' : ''} aria-label="رفع"></td><td style="text-align:start">${esc(((o.tpl || {})[r.tid] || {}).name || r.tid)}</td><td>${esc(tn || '—')}</td><td><select class="in" data-it="${esc(r.id)}" aria-label="المعلم"><option value="">— اختر —</option>${(S.staff || []).filter(p => p.active !== false).map(p => `<option value="${p.id}" ${mt && mt.id === p.id ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select></td><td>${esc(r.date ? dt(r.date) : '—')}</td></tr>`; }).join('')}</tbody></table></div><button class="btn" id="inI" type="button" style="margin-top:8px">رفع المحدد كزيارات</button>` : '<p class="small muted">لا توجد تقييمات في ملفات الإشراف لم تُرفع بعد.</p>'}</section>`;
    $('#inF', O).oninput = e => st.from = e.target.value; $('#inT', O).oninput = e => st.to = e.target.value;
    $('#inS', O).onclick = ev => A.run(ev.currentTarget, async () => { const L = (await loadVisits()).filter(t => inRange(t, st.from, st.to) && ($('#inA', O).checked || t.status === 'approved')); if (!L.length) throw new Error('لا زيارات مكتملة في الفترة (فعّل «مع المسودات» لإرسالها كلها)'); const n = await supSend(L.map(t => t.id)); A.toast(`أُرسلت ${AR(n)} زيارة إلى ملفات الإشراف`, 'ok'); reload(); });
    const ib = $('#inI', O); if (ib) ib.onclick = ev => A.run(ev.currentTarget, async () => {
      const ids = $$('[data-ir]:checked', O).map(i => i.dataset.ir); if (!ids.length) throw new Error('حدّد سجلاً واحداً على الأقل'); let L0; try { L0 = await lib(); } catch (_) { L0 = { cfg: {} }; }
      let n = 0;
      for (const id of ids) { const r = o.rec[id], sid = ($(`[data-it="${CSS.escape(id)}"]`, O) || {}).value; if (!r || !sid) continue; const base = o.tpl[r.tid]; if (!base) continue;
        const v = { class_id: null, class_name: (r.d && Object.values(r.d).map(x => x && typeof x === 'object' ? Object.values(x) : []).flat().find(x => typeof x === 'string' && /ابتدائي|متوسط|ثانوي|Grade|KG/.test(x))) || '', date: r.date || today(), period: null, teacher_id: sid, teacher_name: nm(sid), type: cfg().defType, role: (myPref().role || S.me.title || ''), visitor_id: S.me.id, visitor_name: S.me.full_name, imported: true, tpls: [r.tid], at: nowIso() };
        const tp = A.formsWithSig ? A.formsWithSig(clone(base)) : clone(base); visitorSlot(tp, v); const ts = A.formsTeacherSlot ? A.formsTeacherSlot(tp) : null;
        const t = await api.ins('form_tasks', [{ school_id: S.school.id, tid: r.tid, title: `${v.type}: ${base.name}`, cat: 'visits', tpl: tp, cfg: L0.cfg || {}, assignee: sid, mode: 'sign', perms: { a: 'sign', c: 'sign', share: 'admin', endorse: false }, data: clone(r.d || {}), cosign: ts ? [{ staff_id: sid, key: ts.key, label: ts.label, status: 'pending', by: S.me.id }] : [], visit: v, trail: [{ at: nowIso(), by: S.me.id, act: 'visit', note: 'رُفعت من ملفات الإشراف' }], ...(DEMO ? { created_by: S.me.id, status: 'assigned', sigs: {}, created_at: nowIso() } : {}) }]);
        const ti = Array.isArray(t) ? t[0] : t; await supPut('rec', id, { ...r, platform: (ti && ti.id) || true }, { tid: r.tid, teacher: r.teacher || '', date: r.date || '', pct: r.pct == null ? -1 : r.pct }); n++; }
      A.toast(`رُفعت ${AR(n)} زيارة — تجدها في «الزيارات» مسودات لديك`, 'ok'); st.tab = 'list'; reload(); });
  }

  // ---------- الإعدادات (المالك) ----------
  async function setTab(O, reload) {
    if (!own()) return;
    const c = cfg(); let L = null; try { L = await lib(); } catch (_) { }
    const tl = L ? L.list.filter(t => evalish(t.tpl) || t.cat === 'cards' || /زيار|تقييم|تقويم|بطاقة/.test(t.name)) : [];
    const listEd = (id, arr, ph) => `<div class="vs-ie" id="${id}" style="max-height:none">${arr.map((x, i) => `<div class="vs-ir"><input class="in" value="${esc(x)}" data-i="${i}" aria-label="${ph}"><span class="vs-ia"><button type="button" class="btn ghost sm" data-op="up" data-i="${i}" aria-label="أعلى">↑</button><button type="button" class="btn ghost sm" data-op="dn" data-i="${i}" aria-label="أسفل">↓</button><button type="button" class="btn ghost sm" data-op="del" data-i="${i}" aria-label="حذف">✕</button></span></div>`).join('')}<button type="button" class="btn ghost sm" data-op="add" style="justify-self:start">+ إضافة</button></div>`;
    let types = c.types.slice(), roles = c.roles.slice(), tpls = c.tpls.slice(), defT = c.defTpls.slice(), tlab = { ...c.tlabels }, presets = (c.presets || []).slice();
    O.innerHTML = `<section class="vs-st"><h3>المسمى والسلوك</h3><div class="vs-g">
        <div class="field"><label for="sgT">اسم الصفحة (المسمى)</label><input class="in" id="sgT" value="${esc(c.title)}" list="sgTL"><datalist id="sgTL"><option value="الزيارات الصفية"><option value="الزيارات المفاجئة"><option value="الجولات الإشرافية"><option value="زيارات المتابعة"><option value="الملاحظة الصفية"></datalist></div>
        <div class="field"><label for="sgD">النوع الافتراضي</label><select class="in" id="sgD"></select></div>
        <div class="field"><label for="sgM">الحد الأقصى للمرفقات</label><select class="in" id="sgM">${[0, 1, 2, 3, 4, 5, 6].map(n => `<option value="${n}" ${n === +c.maxAtt ? 'selected' : ''}>${AR(n)}</option>`).join('')}</select></div></div>
        <div class="row" style="gap:12px;flex-wrap:wrap;margin-top:6px"><label class="chk"><input type="checkbox" id="sgA" ${c.autoPeriod ? 'checked' : ''}> تحديد الحصة الجارية تلقائياً من الجدول الزمني</label><label class="chk"><input type="checkbox" id="sgP" ${c.pace ? 'checked' : ''}> إضافة «السير في المنهج» افتراضياً</label><label class="chk"><input type="checkbox" id="sgH" ${c.head ? 'checked' : ''}> إظهار النوع والفصل والحصة في رأس الاستمارة</label><label class="chk"><input type="checkbox" id="sgN" ${c.notifyOwner ? 'checked' : ''}> إشعاري بكل زيارة جديدة من غيري</label><label class="chk"><input type="checkbox" id="sgAt" ${c.att ? 'checked' : ''}> السماح بالشواهد والمرفقات</label></div></section>
      <div class="vs-g"><section class="vs-st"><h3>أنواع الزيارات</h3>${listEd('sgTy', types, 'نوع الزيارة')}</section><section class="vs-st"><h3>صفات الزائرين</h3>${listEd('sgRo', roles, 'الصفة')}</section></div>
      <section class="vs-st"><h3>النماذج المتاحة للزيارات</h3><p class="small muted" style="margin:0 0 6px">حدّد النماذج التي تظهر للزائرين، وسمِّ كل نموذج (مختصر/مفصّل…)، واختر الافتراضي (يمكن أكثر من نموذج). لتعديل نموذج نفسه استخدم «✎ تعديل» من «النماذج والاستمارات» ← إرسال نماذج.</p>
        <div class="scroll"><table class="tbl"><thead><tr><th>يظهر</th><th>النموذج</th><th>التسمية</th><th>افتراضي</th><th></th></tr></thead><tbody id="sgTp">${tl.map(t => `<tr><td><input type="checkbox" data-tpo="${esc(t.id)}" ${tpls.includes(t.id) ? 'checked' : ''} aria-label="يظهر"></td><td style="text-align:start">${esc(t.name)}</td><td><input class="in" data-tpl="${esc(t.id)}" value="${esc(tlab[t.id] || '')}" style="max-width:150px" aria-label="التسمية"></td><td><input type="checkbox" data-tpd="${esc(t.id)}" ${defT.includes(t.id) ? 'checked' : ''} aria-label="افتراضي"></td><td><button type="button" class="btn ghost sm" data-tpc="${esc(t.id)}">نسخة مخصّصة…</button></td></tr>`).join('') || '<tr><td colspan="5">تعذّر تحميل النماذج</td></tr>'}</tbody></table></div>
        <h4 style="margin:10px 0 4px;color:#082B5A">النماذج الجاهزة المخصّصة (للمدرسة)</h4><div id="sgPs"></div></section>
      <section class="vs-st"><h3>رموز الفصول (QR)</h3><p class="small muted" style="margin:0 0 6px">ألصق رمز كل فصل على بابه: يمسحه الزائر بجواله فتفتح «زيارة جديدة» لهذا الفصل مباشرة والحصة الجارية محددة.</p><button type="button" class="btn ghost" id="sgQr">طباعة رموز الفصول</button></section>
      <div class="vs-bar"><div class="sum">تُحفظ الإعدادات للمدرسة كلها.</div><button type="button" class="btn ghost" id="sgRs">الافتراضي</button><button type="button" class="btn" id="sgOk">حفظ الإعدادات</button></div>`;
    const drawD = () => { const s = $('#sgD', O), cur = s.value || c.defType; s.innerHTML = types.filter(Boolean).map(x => `<option ${x === cur ? 'selected' : ''}>${esc(x)}</option>`).join(''); };
    const bindL = (id, arr, after) => { const el = $('#' + id, O); el.oninput = e => { if (e.target.dataset.i != null) { arr[+e.target.dataset.i] = e.target.value; after && after(); } };
      el.onclick = e => { const b = e.target.closest('[data-op]'); if (!b) return; const i = +b.dataset.i, op = b.dataset.op; if (op === 'add') arr.push(''); else if (op === 'del') arr.splice(i, 1); else { const j = op === 'up' ? i - 1 : i + 1; if (j >= 0 && j < arr.length) [arr[i], arr[j]] = [arr[j], arr[i]]; }
        el.outerHTML = listEd(id, arr, ''); bindL(id, arr, after); after && after(); if (op === 'add') { const ins = $$('#' + id + ' input', O); ins[ins.length - 1].focus(); } }; };
    bindL('sgTy', types, drawD); bindL('sgRo', roles); drawD();
    $$('[data-tpo]', O).forEach(i => i.onchange = () => { const k = i.dataset.tpo; tpls = i.checked ? [...new Set(tpls.concat(k))] : tpls.filter(x => x !== k); });
    $$('[data-tpd]', O).forEach(i => i.onchange = () => { const k = i.dataset.tpd; defT = i.checked ? [...new Set(defT.concat(k))] : defT.filter(x => x !== k); if (i.checked) { tpls = [...new Set(tpls.concat(k))]; const o = $(`[data-tpo="${CSS.escape(k)}"]`, O); if (o) o.checked = true; } });
    $$('[data-tpl]', O).forEach(i => i.oninput = () => { tlab[i.dataset.tpl] = i.value.trim(); });
    $$('[data-tpc]', O).forEach(b => b.onclick = () => { const t = L.list.find(x => x.id === b.dataset.tpc); itemsEditor({ ...clone(t.tpl), name: t.name + ' (مخصّص)' }, tp => { presets.push({ id: uid('p'), name: tp.name, base: t.id, tpl: tp, at: nowIso() }); drawPs(); A.toast('أُضيف للنماذج الجاهزة — احفظ الإعدادات', 'ok'); }, { noPreset: true }); });
    const drawPs = () => { $('#sgPs', O).innerHTML = presets.map((p, i) => `<div class="vs-ir"><b style="flex:1">${esc(p.name)}</b><span class="vs-ia"><button type="button" class="btn ghost sm" data-pe="${i}">✎ تعديل</button><button type="button" class="btn ghost sm" data-px="${i}" aria-label="حذف">✕</button></span></div>`).join('') || '<p class="small muted">لا نماذج مخصّصة بعد — أنشئها بزر «نسخة مخصّصة…» أو من «تخصيص العناصر» أثناء الزيارة.</p>';
      $$('[data-px]', O).forEach(b => b.onclick = () => { presets.splice(+b.dataset.px, 1); drawPs(); });
      $$('[data-pe]', O).forEach(b => b.onclick = () => { const p = presets[+b.dataset.pe]; itemsEditor(p.tpl, tp => { p.tpl = tp; p.name = tp.name || p.name; drawPs(); }, { noPreset: true }); }); };
    drawPs();
    $('#sgQr', O).onclick = () => qrSheet();
    $('#sgRs', O).onclick = async () => { if (!(await A.confirmBox('إعادة إعدادات الزيارات إلى الافتراضي؟ (النماذج الجاهزة المخصّصة تبقى)', 'إعادة'))) return; A.run(null, async () => { const keep = cfg().presets; const settings = { ...(S.school.settings || {}), visits: { presets: keep } }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; A.toast('أُعيدت الإعدادات', 'ok'); reload(); }); };
    $('#sgOk', O).onclick = ev => A.run(ev.currentTarget, async () => {
      const ty = types.map(x => (x || '').trim()).filter(Boolean); if (!ty.length) throw new Error('أضف نوع زيارة واحداً على الأقل'); if (!tpls.length) throw new Error('حدّد نموذجاً واحداً على الأقل');
      await saveCfg({ title: $('#sgT', O).value.trim() || DEF.title, types: ty, defType: ty.includes($('#sgD', O).value) ? $('#sgD', O).value : ty[0], roles: roles.map(x => (x || '').trim()).filter(Boolean), tpls, defTpls: defT.filter(x => tpls.includes(x)).length ? defT.filter(x => tpls.includes(x)) : [tpls[0]], tlabels: tlab, autoPeriod: $('#sgA', O).checked, pace: $('#sgP', O).checked, head: $('#sgH', O).checked, notifyOwner: $('#sgN', O).checked, att: $('#sgAt', O).checked, maxAtt: +$('#sgM', O).value, presets });
      navLabel(); A.renderNav && A.renderNav(); A.toast('حُفظت إعدادات الزيارات', 'ok'); reload(); });
  }
  function qrSheet() {
    const L = classes(); if (!window.qrcode) return A.toast('مكتبة QR غير محمّلة', 'err');
    const base = location.origin + location.pathname.replace(/index(\.dev)?\.html$/, '') + 'index.html';
    const html = `<div class="vs-qr">${L.map(c => { let s = ''; try { const q = window.qrcode(0, 'M'); q.addData(base + '?vc=' + c.id + '#/visits'); q.make(); s = q.createSvgTag({ cellSize: 4, margin: 1, scalable: true }); } catch (_) { } return `<div>${s}<b>${esc(c.name)}</b><span class="small">امسح لبدء زيارة</span></div>`; }).join('')}</div><style>${css}</style>`;
    if (A.printDoc) A.printDoc('رموز الفصول — ' + cfg().title, (A.section() || {}).name || '', html, false);
  }

  A._visits = { merge, fill, addPace, buildTpl, createVisit, editVisit, itemsEditor, supSend, cfg, valFor };
})();
