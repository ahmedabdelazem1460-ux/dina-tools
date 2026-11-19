/* منصة دينا — ربط أدوات الجداول ببعضها + إكمال جداول الفصل الثاني (للمالك ومن يملك التوزيع)
   ١) نقل النصاب إلى «التوزيع والقيود والتوليد» بمعالج مرن: الفصل الدراسي (الثانوي يختلف)، مطابقة الفصول والمواد، طريقة النقل، واقتراح المعلمين.
   ٢) اقتراح المعلمين بحسب إسنادهم في الفصل الأول (الجدول المعتمد أو أي إصدار أو نسخة محفوظة): الفصل نفسه ← الصف ← القسم ← التخصص، مع موازنة النصاب.
   ٣) الأداة الكلاسيكية: استيراد أسماء معلمي المنصة وإسنادهم بدل «معلم/ة ١».
   ٤) مركز طباعة التوزيع والإسناد والأحمال والجدول المولَّد (A4 طولي/عرضي) عبر استوديو التقارير.
   ٥) دليل «إكمال جداول الفصل الثاني» خطوة بخطوة لكل قسم. لا يمس الجدول المعتمد ولا خطط المعلمين: كل ما يُولَّد يصل مسودةً. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, I } = A;
  const GW = ['أول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سادس'];
  const STG = { p: 'ابتدائي', m: 'متوسط', s: 'ثانوي' }, NG = { p: 6, m: 3, s: 3 };
  const LIST = { p: 'primarySubjects', m: 'middleSubjects', s: 'secondarySubjects' };
  const gIdx = c => { const g = String(c.grade_word || c.name || ''); return GW.findIndex(w => g.includes(w)); };
  const stg = c => { const s = String(c.stage || '') + ' ' + c.name; return /ابتدائ/.test(s) ? 'p' : /متوسط/.test(s) ? 'm' : /ثانوي/.test(s) ? 's' : ''; };
  const gradeKey = c => { const s = stg(c), g = gIdx(c); return s && g >= 0 ? s + g : ''; };
  const gradeLbl = k => k ? `${GW[+k.slice(1)]} ${STG[k[0]]}` : '';
  const ALL_G = Object.keys(NG).flatMap(k => Array.from({ length: NG[k] }, (_, i) => k + i));
  const canPlan = () => S.me.is_owner || (A.canPlan && A.canPlan());
  const cls = () => S.classes.filter(c => c.active).slice().sort(A.cmpCls || (() => 0));
  const staff = () => S.staff.filter(p => p.active).slice().sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
  const cap = () => { const s = A.section(); return s.days * s.periods; };
  const today = () => new Date().toLocaleDateString('ar-SA-u-nu-latn-ca-gregory', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const LSJ = (k, d) => { try { return JSON.parse(A.LS.get(k) || '') || d; } catch (_) { return d; } };
  const short = n => { const w = String(n || '').trim().split(/\s+/); return w.length > 2 ? w[0] + ' ' + w[w.length - 1] : (n || ''); };
  const toks = n => new Set(A.normKey(n).split(/\s+/).map(w => w.replace(/^و/, '').replace(/^ال/, '')).filter(w => w.length > 1));
  const sim = (x, y) => { const a = toks(x), b = toks(y); const i = [...a].filter(w => b.has(w)).length; return i / Math.max(1, new Set([...a, ...b]).size); };
  const ALIAS = { 'الدراسات الاجتماعية': 'الاجتماعيات', 'الاجتماعيات': 'الدراسات الاجتماعية', 'الحاسب': 'الحاسب الآلي', 'التقنية الرقمية': 'المهارات الرقمية', 'المهارات الرقمية': 'التقنية الرقمية', 'الدراسات الإسلامية': 'الدراسات الإسلامية والقرآن', 'اللياقة والثقافة الصحية': 'التربية البدنية', 'التربية الصحية والبدنية': 'التربية البدنية', 'الفنون': 'التربية الفنية' };
  function subMatch(n) {
    const k = A.normKey(n), al = ALIAS[n] && A.normKey(ALIAS[n]);
    const ex = S.subjects.find(s => A.normKey(s.name) === k) || (al && S.subjects.find(s => A.normKey(s.name) === al)); if (ex) return ex.id;
    const best = S.subjects.map(s => [s, Math.max(sim(s.name, n), al ? sim(s.name, ALIAS[n]) : 0)]).sort((x, y) => y[1] - x[1])[0];
    return best && best[1] >= 0.6 ? best[0].id : '';
  }
  // ---------- النصاب ----------
  async function nisab() { if (A.readNisabAny) return await A.readNisabAny(); try { return JSON.parse(localStorage.getItem('dina_nisab_state_v2') || 'null'); } catch (_) { return null; } }
  // حصص كل مادة لصف معيّن في فصل دراسي معيّن: الثانوي = [ف١ ص١، ف٢ ص١، ف١ ص٢ …]
  function gradeHours(st, gk, term) {
    if (!st || !gk) return []; const s = gk[0], g = +gk.slice(1), list = st[LIST[s]] || [];
    const idx = s === 's' ? g * 2 + (term === 2 ? 1 : 0) : g;
    return list.map(x => ({ name: String(x.name || '').trim(), group: x.group || '', h: +((x.hours || [])[idx]) || 0 })).filter(x => x.name && x.h > 0);
  }
  const nisabGroups = st => { const m = {}; if (st) Object.values(LIST).forEach(k => (st[k] || []).forEach(x => { if (x.group) m[A.normKey(x.name)] = x.group; })); return m; };
  // الفصل الدراسي المتوقَّع: الثاني إن كان مفعّلاً أو قيد التجهيز
  const termGuess = () => { const L = S.terms || []; const t2 = L.find(t => t.ord === 2 && t.status !== 'closed'); const act = L.find(t => t.status === 'active'); return (act && act.ord === 2) || (t2 && t2.status === 'prep') ? 2 : +(A.LS.get('tb_term') || 1) || 1; };

  // ---------- مصادر الإسناد السابق (الفصل الأول) ----------
  async function sources() {
    const out = [];
    try { const vs = await api.ttVersions(S.sectionId); vs.forEach(v => out.push({ id: 'v:' + v.id, label: (v.status === 'approved' ? '★ الجدول المعتمد الحالي — ' : 'إصدار: ') + (A.verName ? A.verName(v) : (v.label || '')) + (v.status !== 'approved' ? ` (${v.status === 'draft' ? 'مسودة' : 'سابق'})` : ''), ap: v.status === 'approved' })); } catch (_) { }
    out.sort((a, b) => b.ap - a.ap);
    out.push({ id: 'plan', label: 'الإسناد الحالي في التوزيع' });
    try { (await api.list('tool_snapshots', { school_id: S.school.id, tool: 'plan', scope: S.sectionId }, { order: 'created_at', desc: true })).slice(0, 20).forEach(s => out.push({ id: 's:' + s.id, label: 'نسخة محفوظة: ' + s.name, data: s.data })); } catch (_) { }
    return out;
  }
  // → قائمة {class_id, subject_id, teacher_id, n}
  async function sourceRows(src, P, srcs) {
    if (src.startsWith('v:')) { const sl = await api.ttSlots(src.slice(2)); const m = {}; sl.forEach(x => { if (!x.teacher_id || !x.subject_id) return; const k = x.class_id + '|' + x.subject_id + '|' + x.teacher_id; m[k] = (m[k] || 0) + 1; }); return Object.entries(m).map(([k, n]) => { const [c, s, t] = k.split('|'); return { c, s, t, n }; }); }
    const D = src === 'plan' ? P : ((srcs || []).find(x => x.id === src) || {}).data || {};
    const out = []; Object.entries(D.teachers || {}).forEach(([c, m]) => Object.entries(m || {}).forEach(([s, t]) => { if (t) out.push({ c, s, t, n: +(((D.hours || {})[c] || {})[s]) || 1 }); }));
    return out;
  }
  // ---------- محرك الاقتراح ----------
  const WHY = { same: ['الفصل نفسه', 'tb-w1'], grade: ['نفس الصف', 'tb-w2'], sec: ['نفس المادة في القسم', 'tb-w3'], spec: ['نفس التخصص', 'tb-w4'], keep: ['الحالي', 'tb-w0'], none: ['لا اقتراح', 'tb-w5'] };
  function suggest(P, rows, o) {
    const st = o.st, NG2 = nisabGroups(st), mp = LSJ('tb_map_' + S.sectionId, {}), G2 = {};
    // تخصص كل مادة في المنصة: من اسمها في النصاب، أو من مطابقة المواد المحفوظة، أو من أقرب اسم
    if (st) Object.values(LIST).forEach(k => (st[k] || []).forEach(x => { if (!x.group) return; const id = (mp['s:' + x.name] && mp['s:' + x.name] !== '__new' && mp['s:' + x.name] !== '__skip') ? mp['s:' + x.name] : subMatch(x.name); if (id && !G2[id]) G2[id] = x.group; }));
    const grpOf = sid => G2[sid] || NG2[A.normKey(A.subjName(sid) || '')] || '';
    const C = cls(), byId = Object.fromEntries((S.allClasses || S.classes).map(c => [c.id, c]));
    const idx = { same: {}, grade: {}, sec: {}, spec: {} }, add = (m, k, t, n) => { const x = m[k] = m[k] || {}; x[t] = (x[t] || 0) + n; };
    const tSubj = {}; // المعلم ← المواد التي درّسها
    rows.forEach(r => { const c = byId[r.c]; add(idx.same, r.c + '|' + r.s, r.t, r.n); if (c) add(idx.grade, gradeKey(c) + '|' + r.s, r.t, r.n); add(idx.sec, r.s, r.t, r.n); const g = grpOf(r.s); if (g) add(idx.spec, g, r.t, r.n); (tSubj[r.t] = tSubj[r.t] || new Set()).add(r.s); });
    const ok = new Set(staff().map(p => p.id)), load = {};
    const H = (c, s) => +(((P.hours || {})[c] || {})[s]) || 0, T = (c, s) => ((P.teachers || {})[c] || {})[s] || '';
    const items = []; C.forEach(c => Object.keys(P.hours[c.id] || {}).forEach(s => { if (H(c.id, s)) items.push({ c: c.id, s, h: H(c.id, s), cur: T(c.id, s) }); }));
    if (!o.replace) items.forEach(it => { if (it.cur) load[it.cur] = (load[it.cur] || 0) + it.h; });
    // الأكثر حصصاً أولاً حتى يحصل على معلمه قبل امتلاء النصاب
    items.sort((a, b) => b.h - a.h || (A.cmpCls ? A.cmpCls(a.c, b.c) : 0));
    items.forEach(it => {
      if (it.cur && !o.replace) { it.t = it.cur; it.why = 'keep'; return; }
      const c = byId[it.c], tiers = [['same', idx.same[it.c + '|' + it.s]], ['grade', c && idx.grade[gradeKey(c) + '|' + it.s]], ['sec', idx.sec[it.s]], ['spec', grpOf(it.s) && idx.spec[grpOf(it.s)]]].filter(([k, m]) => o.tiers[k] && m);
      let pick = null; const alts = [];
      for (const [k, m] of tiers) {
        const L = Object.entries(m).filter(([t]) => ok.has(t)).sort((x, y) => y[1] - x[1] || (load[x[0]] || 0) - (load[y[0]] || 0));
        L.forEach(([t]) => { if (!alts.some(a => a.t === t)) alts.push({ t, why: k }); });
        if (pick) continue;
        const fit = L.find(([t]) => !o.max || (load[t] || 0) + it.h <= o.max);
        if (fit) pick = { t: fit[0], why: k };
      }
      if (!pick && it.cur) pick = { t: it.cur, why: 'keep' };
      it.t = pick ? pick.t : ''; it.why = pick ? pick.why : 'none'; it.alts = alts.slice(0, 6);
      if (it.t) load[it.t] = (load[it.t] || 0) + it.h;
    });
    items.sort((a, b) => (A.cmpCls ? A.cmpCls(a.c, b.c) : 0) || (A.cmpSubj ? A.cmpSubj(a.s, b.s) : 0));
    return { items, load, tSubj };
  }
  A._tbSuggest = (P, rows, o) => suggest(P, rows, o);
  function applySuggest(P, items, onlyChecked) {
    let n = 0; P.teachers = P.teachers || {};
    items.forEach(it => { if (onlyChecked && !onlyChecked.has(it.c + '|' + it.s)) return; if (!it.t || it.t === it.cur) return; (P.teachers[it.c] = P.teachers[it.c] || {})[it.s] = it.t; n++; });
    return n;
  }
  async function loadPlan() { const r = (await api.list('section_plans', { section_id: S.sectionId }))[0]; return Object.assign({ groups: [], hours: {}, teachers: {}, maxDay: 2, blocks: {} }, r ? r.data : {}); }
  async function savePlan(P) { await api.ups('section_plans', [{ section_id: S.sectionId, data: P }], 'section_id'); if (A._planReload) A._planReload(); }
  async function snapshot(P, name) { if (!A.addSnapshot || !P || !Object.keys(P.hours || {}).length) return; try { await A.addSnapshot('plan', S.sectionId, name, JSON.parse(JSON.stringify(P)), true); } catch (_) { } }
  const goPlan = (root, sub) => {
    if (A._planTab) A._planTab(sub || 'teachers');
    if (S.me.is_owner) { A.LS.set('studio_t', 'plan'); const h = document.querySelector('.st-head'); if (h && V.studio) { V.studio(h.parentElement); return; } location.hash = '#/studio'; }
    else location.hash = '#/plan';
    if (A.route) A.route();
  };

  // =====================================================================
  //  ١) معالج نقل النصاب إلى التوزيع
  // =====================================================================
  A.nisabTransfer = async function (o = {}) {
    if (!canPlan()) return A.toast('غير متاح لحسابك', 'warn');
    const st = await nisab();
    if (!st) return A.toast('لا توجد بيانات في أداة النصاب بعد — افتح «النصاب» وأدخلها أولاً', 'warn');
    const sec = A.section(), C = cls(), term0 = o.term || termGuess();
    const mk = 'tb_map_' + S.sectionId, saved = LSJ(mk, {});
    const srcs = await sources(); const P0 = await loadPlan();
    const S0 = { term: term0, hours: A.LS.get('tb_hm') || 'nisab', sug: A.LS.get('tb_sg') !== '0', rep: false, src: (srcs.find(x => x.ap) || srcs[0] || {}).id || 'plan', max: +(A.LS.get('tb_max') || 0), snap: true, after: A.LS.get('tb_after') || 'teachers' };
    const gsel = c => saved['c:' + c.id] !== undefined ? saved['c:' + c.id] : gradeKey(c);
    const m = A.modal(`<h3>نقل النصاب إلى «التوزيع والقيود والتوليد» — ${esc(sec.name)}</h3>
      <p class="sub">يُنقل عدد حصص كل مادة لكل فصل من أداة النصاب، ويُقترح معلم كل مادة من إسناد الفصل السابق. يُحفظ التوزيع الحالي نسخةً قبل النقل، ولا يتغير الجدول المعتمد ولا خطط المعلمين حتى تولّد جدولاً وتعتمده.</p>
      <div class="tb-terms" role="radiogroup" aria-label="الفصل الدراسي">${[1, 2].map(t => `<button type="button" role="radio" data-term="${t}" aria-checked="${t === S0.term}" class="${t === S0.term ? 'on' : ''}"><b>الفصل الدراسي ${t === 1 ? 'الأول' : 'الثاني'}</b><span>${t === 2 ? 'مواد الثانوي وحصصه للفصل الثاني' : 'حصص الفصل الأول'}</span></button>`).join('')}</div>
      <div class="tabs" id="tbT"><button class="on" data-s="o">الخيارات</button><button data-s="c">الفصول</button><button data-s="s">المواد</button><button data-s="v">المعاينة</button></div>
      <div data-p="o" class="tb-opts">
        <fieldset><legend>طريقة نقل الحصص</legend>
          ${[['nisab', 'استبدال حصص مواد النصاب فقط', 'المواد الأخرى في التوزيع تبقى كما هي'], ['all', 'استبدال كل حصص الفصول المطابقة', 'يبدأ التوزيع من النصاب تماماً (مناسب للفصل الثاني)'], ['empty', 'إكمال الفارغ فقط', 'لا يغيّر أي رقم موجود']].map(([v, l, d]) => `<label class="chk"><input type="radio" name="tbHm" value="${v}" ${S0.hours === v ? 'checked' : ''}> <span><b>${l}</b><br><span class="small muted">${d}</span></span></label>`).join('')}</fieldset>
        <fieldset><legend>المعلمون</legend>
          <label class="chk"><input type="checkbox" id="tbSg" ${S0.sug ? 'checked' : ''}> اقتراح معلم لكل مادة من إسناد سابق</label>
          <div class="field"><label for="tbSrc">مصدر الإسناد (الفصل الأول)</label><select class="in" id="tbSrc">${srcs.map(x => `<option value="${x.id}" ${x.id === S0.src ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></div>
          <label class="chk"><input type="checkbox" id="tbRep"> استبدال المعلمين المعيّنين حالياً أيضاً (وإلا تُملأ الخانات الفارغة فقط)</label>
          <div class="field"><label for="tbMax">ألا يتجاوز نصاب المعلم</label><select class="in" id="tbMax" style="max-width:160px"><option value="0">بلا حد</option>${[18, 20, 22, 24, 26, 28, 30].map(n => `<option value="${n}" ${S0.max === n ? 'selected' : ''}>${AR(n)} حصة</option>`).join('')}</select></div></fieldset>
        <fieldset><legend>بعد النقل</legend>
          <label class="chk"><input type="checkbox" id="tbSnap" checked> حفظ نسخة من التوزيع الحالي قبل النقل (يمكن الرجوع إليها من «النسخ المحفوظة»)</label>
          <div class="field"><label for="tbAf">افتح</label><select class="in" id="tbAf" style="max-width:240px">${[['teachers', 'المعلمون (لمراجعة الإسناد)'], ['hours', 'الحصص لكل فصل'], ['rules', 'القيود'], ['gen', 'توليد الجدول']].map(([v, l]) => `<option value="${v}" ${S0.after === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></fieldset>
      </div>
      <div data-p="c" class="hidden"><p class="small muted">طابِق كل فصل في المنصة بصفّه في النصاب. اختر «لا يُنقل» لإبقاء الفصل كما هو.</p><div class="scroll" style="max-height:48vh"><table class="tbl"><thead><tr><th>الفصل في المنصة</th><th>الصف في النصاب</th><th>الحصص</th></tr></thead><tbody>${C.map(c => `<tr><td><b>${esc(c.name)}</b></td><td><select class="in" data-gc="${c.id}" aria-label="صف ${esc(c.name)}"><option value="">— لا يُنقل —</option>${ALL_G.map(k => `<option value="${k}" ${gsel(c) === k ? 'selected' : ''}>${gradeLbl(k)}</option>`).join('')}</select></td><td data-gh="${c.id}" class="small"></td></tr>`).join('')}</tbody></table></div></div>
      <div data-p="s" class="hidden"><div id="tbSub"></div></div>
      <div data-p="v" class="hidden"><div id="tbPv"></div></div>
      <div class="acts"><span class="small muted grow" id="tbSum"></span><button class="btn sky" id="tbGo">نقل إلى التوزيع</button></div><div class="small muted" id="tbPr" role="status" aria-live="polite"></div>`, { cls: 'wide' });
    const el = m.el, Q = s => el.querySelector(s);
    const tabs = $$('#tbT button', el); tabs.forEach(b => b.onclick = () => { tabs.forEach(x => x.classList.toggle('on', x === b)); $$('[data-p]', el).forEach(p => p.classList.toggle('hidden', p.dataset.p !== b.dataset.s)); if (b.dataset.s === 'v') preview(); });
    $$('[data-term]', el).forEach(b => b.onclick = () => { S0.term = +b.dataset.term; $$('[data-term]', el).forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); }); refresh(); });
    const gmap = () => { const r = {}; $$('[data-gc]', el).forEach(s => { r[s.dataset.gc] = s.value; }); return r; };
    let smap = {};
    const names = () => { const g = gmap(), N = {}; C.forEach(c => gradeHours(st, g[c.id], S0.term).forEach(x => { const k = x.name; N[k] = N[k] || { name: k, group: x.group, h: 0, n: 0 }; N[k].h += x.h; N[k].n++; })); return Object.values(N); };
    function drawSubs() {
      const L = names(); const box = Q('#tbSub');
      L.forEach(x => { if (smap[x.name] === undefined) smap[x.name] = saved['s:' + x.name] !== undefined ? saved['s:' + x.name] : (subMatch(x.name) || '__new'); });
      box.innerHTML = L.length ? `<p class="small muted">مادة النصاب ← مادة المنصة. «إضافة كمادة جديدة» تُنشئها في مواد المدرسة، و«تجاهل» لا تنقل حصصها.</p><div class="scroll" style="max-height:48vh"><table class="tbl"><thead><tr><th>المادة في النصاب</th><th>التخصص</th><th>الفصول</th><th>المادة في المنصة</th></tr></thead><tbody>${L.map(x => `<tr class="${smap[x.name] === '__new' ? 'tb-new' : ''}"><td><b>${esc(x.name)}</b></td><td class="small">${esc(x.group || '—')}</td><td class="small">${AR(x.n)}</td><td><select class="in" data-sm="${esc(x.name)}" aria-label="مطابقة ${esc(x.name)}"><option value="__new" ${smap[x.name] === '__new' ? 'selected' : ''}>+ إضافة كمادة جديدة</option><option value="__skip" ${smap[x.name] === '__skip' ? 'selected' : ''}>— تجاهل —</option>${S.subjects.map(s => `<option value="${s.id}" ${s.id === smap[x.name] ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>` : A.emptyBox('لا توجد مواد بحصص للفصول المختارة', 'اختر صفوف النصاب للفصول من تبويب «الفصول».');
      $$('[data-sm]', box).forEach(s => s.onchange = () => { smap[s.dataset.sm] = s.value; s.closest('tr').classList.toggle('tb-new', s.value === '__new'); refresh(true); });
    }
    function refresh(keepSubs) {
      const g = gmap(); C.forEach(c => { const td = el.querySelector(`[data-gh="${c.id}"]`), h = gradeHours(st, g[c.id], S0.term).reduce((a, x) => a + x.h, 0); td.innerHTML = g[c.id] ? `<span class="${h > cap() ? 'tb-bad' : h === cap() ? 'tb-ok' : ''}">${AR(h)} / ${AR(cap())}</span>` : '<span class="faint">—</span>'; });
      if (!keepSubs) drawSubs();
      const n = C.filter(c => g[c.id]).length, L = names(), nw = L.filter(x => smap[x.name] === '__new').length;
      Q('#tbSum').textContent = `${AR(n)} فصلاً · ${AR(L.length)} مادة${nw ? ` (${AR(nw)} جديدة)` : ''} · الفصل الدراسي ${S0.term === 2 ? 'الثاني' : 'الأول'}`;
    }
    $$('[data-gc]', el).forEach(s => s.onchange = () => refresh());
    // ---- بناء التوزيع الجديد (بلا حفظ) ----
    function buildPlan(P) {
      const g = gmap(), hm = (el.querySelector('[name="tbHm"]:checked') || {}).value || 'nisab', ids = {};
      let n = 0; P.hours = P.hours || {}; P.groups = P.groups || [];
      const inG = new Set(P.groups.flatMap(x => x.subs));
      C.forEach(c => {
        if (!g[c.id]) return; const H = {}; gradeHours(st, g[c.id], S0.term).forEach(x => { const sid = smap[x.name]; if (!sid || sid === '__skip') return; const id = sid === '__new' ? ids[x.name] || ('__new:' + x.name) : sid; H[id] = (H[id] || 0) + x.h; if (!inG.has(id)) { const gn = x.group || 'من النصاب'; let gr = P.groups.find(q => q.name === gn); if (!gr) { gr = { id: 'g' + Math.random().toString(36).slice(2, 8), name: gn, subs: [] }; P.groups.push(gr); } gr.subs.push(id); inG.add(id); } });
        const cur = P.hours[c.id] = P.hours[c.id] || {};
        if (hm === 'all') Object.keys(cur).forEach(k => delete cur[k]);
        Object.entries(H).forEach(([s, h]) => { if (hm === 'empty' && cur[s]) return; if (cur[s] !== h) n++; cur[s] = h; });
      });
      P.nisab = { at: new Date().toISOString(), by: S.me.id, term: S0.term }; P.term = S0.term;
      return { P, n, hm };
    }
    async function preview() {
      const box = Q('#tbPv'); box.innerHTML = '<div class="spinner"></div>';
      const P = buildPlan(JSON.parse(JSON.stringify(P0))).P; let sg = null;
      if (Q('#tbSg').checked) { try { const rows = await sourceRows(Q('#tbSrc').value, P0, srcs); sg = suggest(P, rows, { st, replace: Q('#tbRep').checked, max: +Q('#tbMax').value, tiers: { same: 1, grade: 1, sec: 1, spec: 1 } }); } catch (e) { sg = null; } }
      const g = gmap(), CC = C.filter(c => g[c.id]), subs = [...new Set(CC.flatMap(c => Object.keys(P.hours[c.id] || {})))];
      const sn = id => id.startsWith('__new:') ? id.slice(6) + ' ✚' : A.subjName(id);
      const tOf = (c, s) => { const it = sg && sg.items.find(x => x.c === c && x.s === s); return it ? it.t : ((P.teachers[c] || {})[s] || ''); };
      box.innerHTML = CC.length ? `<div class="scroll" style="max-height:50vh"><table class="tbl tb-pv"><thead><tr><th>الفصل</th>${subs.map(s => `<th>${esc(sn(s))}</th>`).join('')}<th>المجموع</th></tr></thead><tbody>${CC.map(c => { const t = Object.values(P.hours[c.id] || {}).reduce((a, x) => a + (+x || 0), 0); return `<tr><th>${esc(c.name)}</th>${subs.map(s => { const h = (P.hours[c.id] || {})[s], tt = tOf(c.id, s); return `<td>${h ? `<b>${AR(h)}</b>${tt ? `<div class="tb-tn">${esc(short(A.personName(tt)))}</div>` : `<div class="tb-tn faint">—</div>`}` : '<span class="faint">·</span>'}</td>`; }).join('')}<td class="${t > cap() ? 'tb-bad' : t === cap() ? 'tb-ok' : ''}">${AR(t)}</td></tr>`; }).join('')}</tbody></table></div>${sg ? `<p class="small muted">اقتُرح معلم لـ${AR(sg.items.filter(x => x.t && x.why !== 'keep').length)} خانة، وبقي ${AR(sg.items.filter(x => !x.t).length)} بلا معلم. راجعها بعد النقل من «المعلمون».</p>` : ''}` : A.emptyBox('اختر صفوف النصاب للفصول أولاً');
    }
    refresh();
    Q('#tbGo').onclick = ev => A.run(ev.currentTarget, async () => {
      const pr = Q('#tbPr'), g = gmap(); if (!C.some(c => g[c.id])) throw new Error('اختر صفاً من النصاب لفصل واحد على الأقل');
      const map = {}; C.forEach(c => { map['c:' + c.id] = g[c.id]; }); Object.entries(smap).forEach(([k, v]) => { map['s:' + k] = v; });
      const P = await loadPlan();
      if (Q('#tbSnap').checked) { pr.textContent = 'حفظ نسخة من التوزيع الحالي…'; await snapshot(P, `قبل النقل من النصاب (${S0.term === 2 ? 'الفصل الثاني' : 'الفصل الأول'}) — ${today()}`); }
      // المواد الجديدة
      const ids = {};
      for (const nm of names().map(x => x.name).filter(n => smap[n] === '__new')) { pr.textContent = 'إضافة مادة: ' + nm; let r = null; try { r = await api.addSubject({ school_id: S.school.id, name: A.norm ? A.norm(nm) : nm }); } catch (_) { } if (!r) { S.subjects = await api.reloadSubjects(); r = S.subjects.find(x => A.normKey(x.name) === A.normKey(nm)); } if (r) { ids[nm] = r.id; smap[nm] = r.id; map['s:' + nm] = r.id; } }
      if (Object.keys(ids).length) S.subjects = await api.reloadSubjects();
      A.LS.set(mk, JSON.stringify(map));
      const { n } = buildPlan(P);
      let ns = 0;
      if (Q('#tbSg').checked) { pr.textContent = 'اقتراح المعلمين…'; const rows = await sourceRows(Q('#tbSrc').value, P0, srcs); const sg = suggest(P, rows, { st, replace: Q('#tbRep').checked, max: +Q('#tbMax').value, tiers: { same: 1, grade: 1, sec: 1, spec: 1 } }); ns = applySuggest(P, sg.items); }
      pr.textContent = 'الحفظ…'; await savePlan(P);
      const settings = { ...(S.school.settings || {}) }; settings.nisab_ok = { ...(settings.nisab_ok || {}), [S.sectionId]: P.nisab.at };
      try { const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; } catch (_) { S.school.settings = settings; }
      [['tb_hm', (el.querySelector('[name="tbHm"]:checked') || {}).value], ['tb_sg', Q('#tbSg').checked ? '1' : '0'], ['tb_max', Q('#tbMax').value], ['tb_after', Q('#tbAf').value], ['tb_term', String(S0.term)]].forEach(([k, v]) => A.LS.set(k, v || ''));
      m.close(); A.toast(`نُقل النصاب: ${AR(n)} قيمة${ns ? ` واقتُرح ${AR(ns)} معلماً` : ''} — راجع ثم ولّد الجدول`, 'ok');
      goPlan(o.root, Q('#tbAf').value);
    });
  };

  // =====================================================================
  //  ٢) نافذة اقتراح المعلمين (داخل التوزيع)
  // =====================================================================
  A.planSuggest = async function (root) {
    if (!canPlan()) return;
    const P = (A._planState && A._planState()) || await loadPlan(), st = await nisab(), srcs = await sources();
    if (!Object.keys(P.hours || {}).length) return A.toast('أدخل الحصص أولاً (أو انقلها من النصاب)', 'warn');
    const o = { src: (srcs.find(x => x.ap) || srcs[0] || {}).id || 'plan', replace: false, max: +(A.LS.get('tb_max') || 0), tiers: Object.assign({ same: 1, grade: 1, sec: 1, spec: 1 }, LSJ('tb_tiers', {})), st, only: 'all' };
    const m = A.modal(`<h3>اقتراح المعلمين من الفصل الأول</h3>
      <p class="sub">يُقترح لكل مادة في كل فصل المعلمُ الذي كان يدرّسها: في الفصل نفسه ← نفس الصف ← نفس المادة في القسم ← نفس التخصص (من النصاب)، مع مراعاة حد النصاب. راجع واختر ثم اعتمد.</p>
      <div class="tb-bar"><label class="small">المصدر <select class="in" id="sgSrc">${srcs.map(x => `<option value="${x.id}" ${x.id === o.src ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></label>
        <label class="small">النصاب الأقصى <select class="in" id="sgMax"><option value="0">بلا حد</option>${[18, 20, 22, 24, 26, 28, 30].map(n => `<option value="${n}" ${o.max === n ? 'selected' : ''}>${AR(n)}</option>`).join('')}</select></label>
        <label class="chk small"><input type="checkbox" id="sgRep"> استبدال المعيّنين حالياً</label>
        <span class="small muted">المستويات:</span>${['same', 'grade', 'sec', 'spec'].map(k => `<label class="chk small"><input type="checkbox" data-tier="${k}" ${o.tiers[k] ? 'checked' : ''}> ${WHY[k][0]}</label>`).join('')}</div>
      <div class="tb-bar"><div class="chip-filter" id="sgF" style="margin:0">${[['all', 'الكل'], ['chg', 'التغييرات'], ['none', 'بلا معلم']].map(([k, l]) => `<button data-v="${k}" class="${o.only === k ? 'on' : ''}">${l}</button>`).join('')}</div><input class="in" id="sgQ" placeholder="بحث بالفصل أو المادة أو المعلم" style="max-width:240px"></div>
      <div class="tb-sg"><div id="sgL" class="scroll" style="max-height:52vh"></div><aside id="sgLd" class="tb-ld" aria-label="أحمال المعلمين"></aside></div>
      <div class="acts"><span class="small muted grow" id="sgSum"></span><button class="btn ghost sm" id="sgAll">تحديد الكل</button><button class="btn ghost sm" id="sgNone">إلغاء التحديد</button><button class="btn" id="sgOk">اعتماد المحدد</button></div>`, { cls: 'wide' });
    const el = m.el, Q = s => el.querySelector(s); let R = null, chk = new Set();
    const opts = (sel, alts) => { const A2 = (alts || []).map(a => a.t), rest = staff().filter(p => !A2.includes(p.id)); return `<option value="">— بلا معلم —</option>${A2.length ? `<optgroup label="مقترحون">${(alts || []).map(a => `<option value="${a.t}" ${a.t === sel ? 'selected' : ''}>${esc(A.personName(a.t))} · ${WHY[a.why][0]}</option>`).join('')}</optgroup>` : ''}<optgroup label="كل المعلمين">${rest.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</optgroup>`; };
    const loads = () => { const L = {}; R.items.forEach(it => { if (it.t) L[it.t] = (L[it.t] || 0) + it.h; }); return L; };
    function drawLoad() {
      const L = loads(), mx = o.max || cap(), rows = Object.entries(L).sort((a, b) => b[1] - a[1]);
      Q('#sgLd').innerHTML = `<b>الأحمال بعد الاعتماد</b>${rows.map(([t, n]) => `<div class="tb-lr ${n > mx ? 'bad' : n > mx - 2 ? 'warn' : ''}"><span>${esc(short(A.personName(t)))}</span><i style="width:${Math.min(100, n / Math.max(mx, 1) * 100)}%"></i><b>${AR(n)}</b></div>`).join('') || '<p class="small muted">لا يوجد</p>'}`;
    }
    function draw() {
      const q = A.normKey(Q('#sgQ').value || ''), byC = {};
      R.items.forEach(it => { if (o.only === 'chg' && (it.t === it.cur)) return; if (o.only === 'none' && it.t) return; if (q && !A.normKey(`${(A.cls(it.c) || {}).name} ${A.subjName(it.s)} ${A.personName(it.t)} ${A.personName(it.cur)}`).includes(q)) return; (byC[it.c] = byC[it.c] || []).push(it); });
      const keys = Object.keys(byC);
      Q('#sgL').innerHTML = keys.length ? `<table class="tbl tb-st"><thead><tr><th style="width:28px"></th><th>المادة</th><th>الحصص</th><th>الحالي</th><th>المقترح</th><th>السبب</th></tr></thead>${keys.map(c => `<tbody><tr class="tb-ch"><th colspan="6">${esc((A.cls(c) || {}).name || '')}</th></tr>${byC[c].map(it => { const k = it.c + '|' + it.s, w = WHY[it.why] || WHY.none; return `<tr class="${it.t !== it.cur ? 'tb-chg' : ''}"><td><input type="checkbox" data-k="${k}" ${chk.has(k) ? 'checked' : ''} aria-label="تحديد ${esc(A.subjName(it.s))}"></td><td><b>${esc(A.subjName(it.s))}</b></td><td>${AR(it.h)}</td><td class="small">${it.cur ? esc(A.personName(it.cur)) : '<span class="faint">—</span>'}</td><td><select class="in" data-st="${k}" aria-label="المعلم المقترح">${opts(it.t, it.alts)}</select></td><td><span class="tb-why ${w[1]}">${w[0]}</span></td></tr>`; }).join('')}</tbody>`).join('')}</table>` : A.emptyBox('لا شيء في هذا التصنيف');
      $$('[data-k]', el).forEach(x => x.onchange = () => { x.checked ? chk.add(x.dataset.k) : chk.delete(x.dataset.k); sum(); });
      $$('[data-st]', el).forEach(x => x.onchange = () => { const it = R.items.find(i => i.c + '|' + i.s === x.dataset.st); it.t = x.value; it.why = (it.alts || []).some(a => a.t === x.value) ? it.alts.find(a => a.t === x.value).why : x.value ? (x.value === it.cur ? 'keep' : 'keep') : 'none'; chk.add(x.dataset.st); const c = el.querySelector(`[data-k="${x.dataset.st}"]`); if (c) c.checked = true; x.closest('tr').classList.toggle('tb-chg', it.t !== it.cur); drawLoad(); sum(); });
      sum();
    }
    const sum = () => { const ch = R.items.filter(it => chk.has(it.c + '|' + it.s) && it.t !== it.cur).length; Q('#sgSum').textContent = `${AR(R.items.length)} خانة · مقترح ${AR(R.items.filter(x => x.t).length)} · بلا معلم ${AR(R.items.filter(x => !x.t).length)} · سيتغير ${AR(ch)}`; };
    async function run() {
      Q('#sgL').innerHTML = '<div class="spinner"></div>';
      const rows = await sourceRows(o.src, P, srcs); R = suggest(P, rows, o);
      chk = new Set(R.items.filter(it => it.t && it.t !== it.cur).map(it => it.c + '|' + it.s)); draw(); drawLoad();
    }
    Q('#sgSrc').onchange = e => { o.src = e.target.value; run(); };
    Q('#sgMax').onchange = e => { o.max = +e.target.value; A.LS.set('tb_max', e.target.value); run(); };
    Q('#sgRep').onchange = e => { o.replace = e.target.checked; run(); };
    $$('[data-tier]', el).forEach(x => x.onchange = () => { o.tiers[x.dataset.tier] = x.checked ? 1 : 0; A.LS.set('tb_tiers', JSON.stringify(o.tiers)); run(); });
    $$('#sgF button', el).forEach(b => b.onclick = () => { o.only = b.dataset.v; $$('#sgF button', el).forEach(x => x.classList.toggle('on', x === b)); draw(); });
    Q('#sgQ').oninput = () => draw();
    Q('#sgAll').onclick = () => { R.items.forEach(it => { if (it.t !== it.cur) chk.add(it.c + '|' + it.s); }); draw(); };
    Q('#sgNone').onclick = () => { chk.clear(); draw(); };
    Q('#sgOk').onclick = ev => A.run(ev.currentTarget, async () => {
      P.teachers = P.teachers || {}; let n = 0;
      R.items.forEach(it => { const k = it.c + '|' + it.s; if (!chk.has(k) || it.t === it.cur) return; P.teachers[it.c] = P.teachers[it.c] || {}; if (it.t) P.teachers[it.c][it.s] = it.t; else delete P.teachers[it.c][it.s]; n++; });
      if (!n) throw new Error('لم تحدد أي تغيير');
      if (A._planSave && A._planState && A._planState() === P) await A._planSave(); else await savePlan(P);
      m.close(); A.toast(`اعتُمد ${AR(n)} إسناداً`, 'ok'); if (root && V.plan) { if (A._planTab) A._planTab('teachers'); V.plan(root); }
    });
    run();
  };

  // =====================================================================
  //  ٣) الأداة الكلاسيكية: استيراد معلمي المنصة وإسنادهم
  // =====================================================================
  const CK = 'dina_timetable_state_v1';
  A.builderImport = async function (frame) {
    let st; try { st = JSON.parse(localStorage.getItem(CK) || 'null'); } catch (_) { st = null; }
    if (!st || !st.subjectData) return A.toast('افتح الأداة الكلاسيكية مرة واحدة أولاً حتى تُنشأ بياناتها', 'warn');
    const sd = st.subjectData, sem = (st.settings || {}).semester === 'ثاني' ? 2 : 1;
    const LET = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'], KEYS = [['p', 'sectionsPrimary'], ['m', 'sectionsMiddle'], ['s', 'sectionsSecondary']];
    const ccls = []; KEYS.forEach(([k, key]) => (sd[key] || []).forEach((n, gi) => { for (let s = 1; s <= (+n || 0); s++) ccls.push({ id: `${k}_${gi}_${s}`, k, gi, s }); }));
    const guess = c => { const same = cls().filter(x => gradeKey(x) === c.k + c.gi); return (same.find(x => String(x.class_label || x.name).includes(LET[c.s - 1])) || same[c.s - 1] || {}).id || ''; };
    const slots = await api.approvedSlots(S.sectionId).catch(() => []);
    const grpOf = {}; Object.values(LIST).forEach(k => (sd[k] || []).forEach(x => { if (x.group) grpOf[A.normKey(x.name)] = x.group; }));
    const teachIn = {}; slots.forEach(x => { if (x.teacher_id && x.subject_id) { const g = grpOf[A.normKey(A.subjName(x.subject_id))] || ''; const m = teachIn[x.teacher_id] = teachIn[x.teacher_id] || {}; m[g] = (m[g] || 0) + 1; } });
    const secT = new Set([...slots.map(x => x.teacher_id).filter(Boolean), ...(S.memberships || []).filter(x => x.section_id === S.sectionId).map(x => x.staff_id)]);
    const people = staff().filter(p => !p.is_owner || secT.has(p.id));
    const ph = t => /^معلم\/ة\s/.test(t.name || '');
    const m = A.modal(`<h3>استيراد معلمي المنصة إلى الأداة الكلاسيكية</h3>
      <p class="sub">تُضاف أسماء المعلمين الموجودين في المنصة بتخصصاتهم (من المواد التي يدرّسونها)، ويُقترح إسناد كل مادة لكل فصل من الجدول المعتمد الحالي. الأداة تحفظ نسخة تراجع (↶) قبل التغيير.</p>
      <label class="chk"><input type="radio" name="bwho" value="sec" checked> معلمو «${esc(A.section().name)}» (${AR(people.filter(p => secT.has(p.id)).length)})</label>
      <label class="chk"><input type="radio" name="bwho" value="all"> كل موظفي المدرسة (${AR(people.length)})</label>
      <label class="chk"><input type="checkbox" id="bRep" ${st.teachers.some(ph) ? 'checked' : ''}> حذف المعلمين الافتراضيين «معلم/ة …» (${AR(st.teachers.filter(ph).length)})</label>
      <label class="chk"><input type="checkbox" id="bAsg" checked> اقتراح الإسناد من الجدول المعتمد (الفصول المطابقة فقط، الخانات الفارغة)</label>
      <label class="chk"><input type="checkbox" id="bLim" checked> النصاب الأقصى لكل معلم = ${AR((st.settings || {}).nisab || 24)} (من إعدادات الأداة)</label>
      <div class="acts"><button class="btn" id="bGo">استيراد</button></div>`);
    m.el.querySelector('#bGo').onclick = ev => A.run(ev.currentTarget, async () => {
      const all = m.el.querySelector('[name="bwho"]:checked').value === 'all', list = people.filter(p => all || secT.has(p.id));
      const before = JSON.stringify(st); try { localStorage.setItem('dina_timetable_undo_import', before); } catch (_) { }
      if (m.el.querySelector('#bRep').checked) { const drop = new Set(st.teachers.filter(ph).map(t => t.id)); st.teachers = st.teachers.filter(t => !drop.has(t.id)); Object.keys(st.workAssignments || {}).forEach(k => { if (drop.has(st.workAssignments[k])) delete st.workAssignments[k]; }); }
      const byName = Object.fromEntries(st.teachers.map(t => [A.normKey(t.name), t])), idOf = {}; let added = 0;
      list.forEach(p => { let t = byName[A.normKey(p.full_name)]; if (!t) { const g = Object.entries(teachIn[p.id] || {}).sort((a, b) => b[1] - a[1])[0]; t = { id: 't' + Math.random().toString(36).slice(2, 9), name: p.full_name, group: g ? g[0] : '', maxWeek: (st.settings || {}).nisab || 24, maxDay: (st.settings || {}).maxPerDay || 6, unavailable: [], preferred: [], maxDays: 0, maxConsec: 0, platform_id: p.id }; st.teachers.push(t); added++; } else t.platform_id = p.id; idOf[p.id] = t.id; });
      let asg = 0;
      if (m.el.querySelector('#bAsg').checked) {
        st.workAssignments = st.workAssignments || {}; const load = {}; Object.entries(st.workAssignments).forEach(([k, t]) => { load[t] = (load[t] || 0) + 1; });
        const lim = m.el.querySelector('#bLim').checked ? ((st.settings || {}).nisab || 24) : 0;
        ccls.forEach(c => {
          const pid = guess(c); if (!pid) return; const idx = c.k === 's' ? c.gi * 2 + (sem === 2 ? 1 : 0) : c.gi;
          (sd[LIST[c.k]] || []).forEach(x => { const h = +((x.hours || [])[idx]) || 0; if (!h) return; const key = `${c.id}|${x.name}`; if (st.workAssignments[key]) return;
            const sid = subMatch(x.name); if (!sid) return; const cnt = {}; slots.forEach(y => { if (y.class_id === pid && y.subject_id === sid && y.teacher_id && idOf[y.teacher_id]) cnt[y.teacher_id] = (cnt[y.teacher_id] || 0) + 1; });
            const best = Object.entries(cnt).sort((a, b) => b[1] - a[1]).find(([t]) => !lim || (load[idOf[t]] || 0) + h <= lim); if (!best) return;
            st.workAssignments[key] = idOf[best[0]]; load[idOf[best[0]]] = (load[idOf[best[0]]] || 0) + h; asg++; });
        });
      }
      localStorage.setItem(CK, JSON.stringify(st));
      m.close(); A.toast(`أُضيف ${AR(added)} معلماً${asg ? ` واقتُرح ${AR(asg)} إسناداً` : ''} — تجده في تبويب المعلمين بالأداة`, 'ok');
      if (frame) frame.src = frame.src;
    });
  };

  // =====================================================================
  //  ٤) مركز الطباعة: التوزيع والإسناد والأحمال والجدول المولَّد
  // =====================================================================
  A.planPrint = async function () {
    const P = (A._planState && A._planState()) || await loadPlan(), G = A._lastGen ? A._lastGen() : null, sec = A.section();
    const C = cls(), subs = (P.groups || []).flatMap(g => g.subs).filter(s => S.subjects.some(x => x.id === s));
    const o = Object.assign({ hours: 1, teach: 1, load: 1, rules: 0, gc: G ? 1 : 0, gt: 0, land: 'auto', names: 'short', per: 2, cls: [], merge: 1, cols: 'auto' }, LSJ('tb_pr', {}));
    if (!G) { o.gc = 0; o.gt = 0; }
    const m = A.modal(`<h3>طباعة التوزيع والجداول — ${esc(sec.name)}</h3>
      <p class="sub">اختر المحتوى والاتجاه، ثم تُفتح المعاينة في استوديو التقارير (الأنماط، حجم الخط، الهوامش، التوقيعات، PDF).</p>
      <fieldset class="tb-pf"><legend>المحتوى</legend>${[['hours', 'الحصص لكل فصل (مصفوفة)'], ['teach', 'إسناد المعلمين (مصفوفة بالأسماء)'], ['merge', 'دمج الحصص والمعلم في جدول واحد'], ['load', 'كشف المعلمين وأحمالهم'], ['rules', 'ملخص القيود']].map(([k, l]) => `<label class="chk"><input type="checkbox" data-o="${k}" ${o[k] ? 'checked' : ''}> ${l}</label>`).join('')}
        ${G ? [['gc', 'الجدول المولَّد — جدول لكل فصل'], ['gt', 'الجدول المولَّد — جدول لكل معلم']].map(([k, l]) => `<label class="chk"><input type="checkbox" data-o="${k}" ${o[k] ? 'checked' : ''}> ${l}</label>`).join('') : '<p class="small muted">لطباعة الجدول المولَّد ولّده أولاً من «توليد الجدول».</p>'}</fieldset>
      <fieldset class="tb-pf"><legend>الورقة</legend><div class="tb-seg" role="radiogroup" aria-label="الاتجاه">${[['auto', 'تلقائي'], ['p', 'A4 طولي ▯'], ['l', 'A4 عرضي ▭']].map(([v, l]) => `<button type="button" role="radio" data-land="${v}" aria-checked="${o.land === v}" class="${o.land === v ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="row" style="gap:10px;margin-top:8px;flex-wrap:wrap"><label class="small">الأسماء <select class="in" id="ppN"><option value="short" ${o.names === 'short' ? 'selected' : ''}>مختصرة (الأول والأخير)</option><option value="full" ${o.names === 'full' ? 'selected' : ''}>كاملة</option></select></label>
        <label class="small">المواد في الجدول الواحد <select class="in" id="ppCols">${[['auto', 'تلقائي حسب الاتجاه'], ['6', '٦'], ['8', '٨'], ['10', '١٠'], ['13', '١٣'], ['16', '١٦'], ['all', 'كلها في جدول واحد']].map(([v, l]) => `<option value="${v}" ${String(o.cols) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="small">جداول الفصول/المعلمين في الصفحة <select class="in" id="ppPer">${[1, 2, 3, 4].map(n => `<option value="${n}" ${+o.per === n ? 'selected' : ''}>${AR(n)}</option>`).join('')}</select></label></div></fieldset>
      <fieldset class="tb-pf"><legend>الفصول</legend><div class="perm-grid">${C.map(c => `<label class="chk small"><input type="checkbox" data-pc="${c.id}" ${!o.cls.length || o.cls.includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div></fieldset>
      <div class="acts"><button class="btn" id="ppGo">${I.print || ''} معاينة وطباعة</button></div>`, { cls: 'wide' });
    const el = m.el;
    $$('[data-land]', el).forEach(b => b.onclick = () => { o.land = b.dataset.land; $$('[data-land]', el).forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); }); });
    el.querySelector('#ppGo').onclick = () => {
      $$('[data-o]', el).forEach(x => { o[x.dataset.o] = x.checked ? 1 : 0; }); o.names = el.querySelector('#ppN').value; o.cols = el.querySelector('#ppCols').value; o.per = +el.querySelector('#ppPer').value;
      const pc = $$('[data-pc]', el).filter(x => x.checked).map(x => x.dataset.pc); o.cls = pc.length === C.length ? [] : pc;
      A.LS.set('tb_pr', JSON.stringify(o));
      const CC = C.filter(c => !o.cls.length || o.cls.includes(c.id)); if (!CC.length) return A.toast('اختر فصلاً واحداً على الأقل', 'warn');
      const nm = t => t ? (o.names === 'full' ? A.personName(t) : short(A.personName(t))) : '';
      const H = (c, s) => +(((P.hours || {})[c] || {})[s]) || 0, T = (c, s) => ((P.teachers || {})[c] || {})[s] || '';
      const used = subs.filter(s => CC.some(c => H(c.id, s)));
      const th = 'background:#082B5A;color:#fff;padding:4px 3px;border:1px solid #c9d6e6;font-size:.85em', td = 'border:1px solid #c9d6e6;padding:3px 3px;text-align:center;vertical-align:middle';
      const parts = [];
      const wide0 = used.length > 9 || (G && (o.gc || o.gt) && G.Pn > 7), land = o.land === 'l' ? true : o.land === 'p' ? false : !!wide0;
      // المصفوفة العريضة تُقسَّم على أكثر من جدول (عدد المواد في الجدول الواحد قابل للضبط)
      const per = o.cols === 'all' ? used.length : +o.cols || (land ? 13 : 8), chunks = []; for (let i = 0; i < used.length; i += Math.max(1, per)) chunks.push(used.slice(i, i + Math.max(1, per)));
      const matrix = (title, fn) => `<h3>${title}</h3>` + chunks.map((cols, ci) => `${chunks.length > 1 ? `<div style="font-size:.8em;color:#5b6b80;margin:6px 0 2px">الجزء ${AR(ci + 1)} من ${AR(chunks.length)}</div>` : ''}<table style="width:100%;border-collapse:collapse;margin-bottom:8px;break-inside:avoid"><thead><tr><th style="${th}">الفصل</th>${cols.map(s => `<th style="${th}">${esc(A.subjName(s))}</th>`).join('')}${ci === chunks.length - 1 ? `<th style="${th}">المجموع</th>` : ''}</tr></thead><tbody>${CC.map((c, i) => `<tr style="background:${i % 2 ? '#F4F8FC' : '#fff'}"><th style="${td};text-align:right;white-space:nowrap;color:#082B5A">${esc(c.name)}</th>${cols.map(s => `<td style="${td}">${fn(c.id, s)}</td>`).join('')}${ci === chunks.length - 1 ? `<td style="${td};font-weight:800">${AR(used.reduce((a, s) => a + H(c.id, s), 0))}</td>` : ''}</tr>`).join('')}</tbody></table>`).join('');
      if (o.merge && (o.hours || o.teach)) parts.push(matrix('توزيع الحصص والمعلمين', (c, s) => H(c, s) ? `<b>${AR(H(c, s))}</b>${T(c, s) ? `<div style="font-size:.78em;color:#005499;line-height:1.25">${esc(nm(T(c, s)))}</div>` : '<div style="font-size:.78em;color:#c0392b">—</div>'}` : '<span style="color:#bbb">·</span>'));
      else { if (o.hours) parts.push(matrix('الحصص لكل فصل', (c, s) => H(c, s) ? AR(H(c, s)) : '<span style="color:#bbb">·</span>')); if (o.teach) parts.push(matrix('إسناد المعلمين', (c, s) => H(c, s) ? `<span style="font-size:.85em">${esc(nm(T(c, s))) || '<span style="color:#c0392b">—</span>'}</span>` : '<span style="color:#bbb">·</span>')); }
      if (o.load) {
        const L = {}; CC.forEach(c => used.forEach(s => { const h = H(c.id, s); if (!h) return; const t = T(c.id, s) || '—'; const r = L[t] = L[t] || { n: 0, it: {} }; r.n += h; const k = A.subjName(s); r.it[k] = r.it[k] || []; r.it[k].push(`${c.name} (${AR(h)})`); }));
        const rows = Object.entries(L).sort((a, b) => b[1].n - a[1].n);
        parts.push(`<h3>كشف المعلمين وأحمالهم</h3><table style="width:100%;border-collapse:collapse"><thead><tr><th style="${th}">م</th><th style="${th}">المعلم</th><th style="${th}">النصاب</th><th style="${th}">المواد والفصول</th></tr></thead><tbody>${rows.map(([t, r], i) => `<tr style="background:${i % 2 ? '#F4F8FC' : '#fff'}"><td style="${td}">${AR(i + 1)}</td><td style="${td};text-align:right;font-weight:700">${t === '—' ? '<span style="color:#c0392b">بلا معلم</span>' : esc(A.personName(t))}</td><td style="${td};font-weight:800">${AR(r.n)}</td><td style="${td};text-align:right;font-size:.85em">${Object.entries(r.it).map(([s, l]) => `<b>${esc(s)}:</b> ${esc(l.join('، '))}`).join('<br>')}</td></tr>`).join('')}</tbody></table>`);
      }
      if (o.rules) {
        const R = []; Object.entries(P.blocks || {}).forEach(([t, l]) => { if ((l || []).length) R.push(`${A.personName(t)}: غير متاح في ${AR(l.length)} حصة`); }); Object.entries(P.tlim || {}).forEach(([t, l]) => { if (l && (l.maxDay || (l.maxGaps !== '' && l.maxGaps !== undefined))) R.push(`${A.personName(t)}: ${l.maxDay ? 'أقصى ' + AR(l.maxDay) + ' يومياً' : ''} ${l.maxGaps !== '' && l.maxGaps !== undefined ? '· فراغات ≤ ' + AR(l.maxGaps) : ''}`); });
        Object.entries(P.subj || {}).forEach(([s, c]) => { if (c && (+c.doubles || (c.periods || []).length || c.room)) R.push(`${A.subjName(s)}: ${+c.doubles ? AR(c.doubles) + ' مزدوجة' : ''} ${(c.periods || []).length ? '· حصص مسموحة ' + c.periods.map(p => AR(p + 1)).join('،') : ''} ${c.room ? '· ' + (((P.rooms || []).find(r => r.id === c.room) || {}).name || '') : ''}`); });
        (P.joint || []).forEach(j => R.push(`مشتركة: ${A.subjName(j.sid)} — ${j.classes.map(c => (A.cls(c) || {}).name || '').join('، ')}`));
        Object.entries(P.classOff || {}).forEach(([c, l]) => { if ((l || []).length) R.push(`${(A.cls(c) || {}).name || ''}: ${AR(l.length)} حصة مغلقة`); });
        R.push(`أقصى حصص للمادة يومياً: ${AR(P.maxDay || 2)}${P.noDouble ? ' · تجنّب حصتين متتاليتين' : ''}`);
        parts.push(`<h3>ملخص القيود</h3><ul style="margin:0;padding-inline-start:18px;line-height:1.9">${R.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`);
      }
      const grid = (title, cell) => `<div style="break-inside:avoid;margin-bottom:10px"><div style="font-weight:800;color:#082B5A;margin:4px 0">${esc(title)}</div><table style="width:100%;border-collapse:collapse;table-layout:fixed"><thead><tr><th style="${th};width:15%">اليوم</th>${Array.from({ length: G.Pn }, (_, p) => `<th style="${th}">${AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: G.D }, (_, d) => `<tr><th style="${td};background:#EAF3FA;color:#082B5A">${A.DAYS[d]}</th>${Array.from({ length: G.Pn }, (_, p) => `<td style="${td};height:34px;font-size:.85em">${cell(d * G.Pn + p)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      const pack = (title, L) => { const per = Math.max(1, o.per || 1); const out = [`<h3>${title}</h3>`]; L.forEach((x, i) => { if (i && i % per === 0) out.push('<div style="break-before:page"></div>'); out.push(x); }); return out.join(''); };
      if (G && o.gc) { const L = G.cls.map((c, gi) => [c, gi]).filter(([c]) => CC.some(x => x.id === c.id)).map(([c, gi]) => grid(c.name, k => { const s = G.grid[gi][k]; if (!s) return '<span style="color:#bbb">—</span>'; const t = G.tch(gi, s); return `<b>${esc(A.subjName(s))}</b>${t ? `<div style="font-size:.85em;color:#005499">${esc(nm(t))}</div>` : ''}`; })); parts.push(pack('الجدول المولَّد — الفصول', L)); }
      if (G && o.gt) { const tids = [...new Set(G.grid.flatMap((r, gi) => r.map(s => G.tch(gi, s)).filter(Boolean)))].sort((a, b) => A.personName(a).localeCompare(A.personName(b), 'ar')); const L = tids.map(t => grid(A.personName(t), k => { const l = G.cls.map((c, gi) => [c, G.grid[gi][k], gi]).filter(([c, s, gi]) => s && G.tch(gi, s) === t); return l.map(([c, s]) => `<b>${esc(A.subjName(s))}</b><div style="font-size:.85em;color:#005499">${esc(c.name)}</div>`).join('') || '<span style="color:#bbb">—</span>'; })); parts.push(pack('الجدول المولَّد — المعلمون', L)); }
      if (!parts.length) return A.toast('اختر محتوى للطباعة', 'warn');
      m.close();
      A.printDoc('توزيع الحصص والجداول', `${sec.name}${P.term ? ' · الفصل الدراسي ' + (P.term === 2 ? 'الثاني' : 'الأول') : ''} · ${today()}`, parts.join(''), land);
    };
  };

  // =====================================================================
  //  ٥) دليل إكمال جداول الفصل الثاني
  // =====================================================================
  A.term2View = async function (box, root) {
    box.innerHTML = '<div class="card"><div class="spinner"></div></div>';
    const P = await loadPlan(), st = await nisab(), sec = A.section(), C = cls();
    let snaps = []; try { snaps = await api.list('tool_snapshots', { school_id: S.school.id, tool: 'plan', scope: S.sectionId }, { order: 'created_at', desc: true }); } catch (_) { }
    let vs = []; try { vs = await api.ttVersions(S.sectionId); } catch (_) { }
    const t2 = P.term === 2 || (P.nisab && P.nisab.term === 2), at = P.nisab && P.nisab.at;
    const hasT1 = snaps.some(s => /الفصل الأول/.test(s.name));
    let cells = 0, noT = 0, over = 0; C.forEach(c => { let t = 0; Object.entries(P.hours[c.id] || {}).forEach(([s, h]) => { if (!+h) return; cells++; t += +h; if (!((P.teachers[c.id] || {})[s])) noT++; }); if (t > cap()) over++; });
    const nRules = Object.values(P.blocks || {}).filter(l => (l || []).length).length + Object.keys(P.subj || {}).length + (P.joint || []).length + Object.values(P.classOff || {}).filter(l => (l || []).length).length;
    const G = A._lastGen ? A._lastGen() : null;
    const drafts = vs.filter(v => v.status === 'draft' && (!at || (v.created_at || '') >= at));
    const ap = vs.find(v => v.status === 'approved'), apNew = ap && at && (ap.approved_at || ap.created_at || '') >= at;
    const secHrs = st ? C.filter(c => stg(c) === 's').length : 0;
    const steps = [
      ['n', 'النصاب', st ? `البيانات موجودة${secHrs ? ` · ${AR(secHrs)} فصل ثانوي حصصه تختلف في الفصل الثاني` : ''}` : 'لم تُدخل بيانات النصاب بعد', st ? 'ok' : 'todo', 'فتح النصاب', 'nisab'],
      ['s1', 'حفظ توزيع الفصل الأول', hasT1 ? 'محفوظ في «النسخ المحفوظة» — يُستخدم مصدراً لاقتراح المعلمين' : 'احفظ نسخة باسم «الفصل الأول» قبل أي تغيير', hasT1 ? 'ok' : 'todo', 'حفظ نسخة الفصل الأول', 'snap'],
      ['x', 'نقل النصاب للفصل الثاني', t2 ? `نُقل ${A.fmtDT(at)}` : 'انقل حصص الفصل الثاني إلى التوزيع (مع اقتراح المعلمين)', t2 ? 'ok' : 'todo', 'نقل النصاب (الفصل الثاني)', 'xfer'],
      ['t', 'المعلمون', cells ? (noT ? `${AR(noT)} من ${AR(cells)} خانة بلا معلم` : `كل الخانات (${AR(cells)}) لها معلم`) : 'لا توجد حصص بعد', cells && !noT ? 'ok' : cells ? 'warn' : 'todo', 'اقتراح من الفصل الأول', 'sug'],
      ['r', 'القيود', nRules ? `${AR(nRules)} قيداً محفوظاً — تنتقل كما هي، راجع ما تغيّر` : 'لا توجد قيود (اختياري)', nRules ? 'ok' : 'opt', 'مراجعة القيود', 'rules'],
      ['g', 'توليد الجدول', over ? `${AR(over)} فصل حصصه أكثر من سعة الأسبوع` : G ? `مولَّد · ${AR(G.issues.length)} مشكلة` : 'لم يُولَّد في هذه الجلسة', G && !G.issues.length && !over ? 'ok' : over ? 'warn' : 'todo', 'توليد الجدول', 'gen'],
      ['d', 'المسودة والاعتماد', apNew ? 'اعتُمد جدول جديد بعد النقل' : drafts.length ? `${AR(drafts.length)} مسودة بانتظار المراجعة والاعتماد` : 'أنشئ مسودة من نتيجة التوليد ثم اعتمدها وحدّد تاريخ بدء الفصل الثاني', apNew ? 'ok' : drafts.length ? 'warn' : 'todo', 'الجدول المعتمد والمسودات', 'tt'],
      ['p', 'الطباعة والنشر', 'اطبع التوزيع والإسناد والجداول (A4 طولي/عرضي)، ثم اعرضها للمعلمين من «عرض الجداول»', 'opt', 'طباعة', 'print']
    ];
    const ic = { ok: '✓', warn: '!', todo: '•', opt: '○' };
    box.innerHTML = `<div class="card tb-t2"><div class="head"><div class="grow"><h2>إكمال جداول الفصل الثاني — ${esc(sec.name)}</h2><p class="sub" style="margin:2px 0 0">اتبع الخطوات بالترتيب لكل قسم. لا يتغير الجدول المعتمد ولا خطط المعلمين حتى تعتمد المسودة، ويمكنك الرجوع لتوزيع الفصل الأول من «النسخ المحفوظة» في أي وقت.</p></div>
      <div class="row"><button class="btn ghost sm" id="t2Pr">طباعة</button></div></div>
      <ol class="tb-steps">${steps.map(([k, l, d, s, b, act], i) => `<li class="tb-s ${s}"><span class="tb-n" aria-hidden="true">${ic[s]}</span><div class="grow"><b>${AR(i + 1)}. ${l}</b><div class="small muted">${esc(d)}</div></div><button class="btn ${s === 'todo' || s === 'warn' ? 'sky' : 'ghost'} sm" data-act="${act}">${b}</button></li>`).join('')}</ol>
      <div id="t2All" class="sec-box" style="margin-top:12px"><b>حالة الأقسام</b><div class="spinner"></div></div></div>`;
    const go = t => { A.LS.set('studio_t', t); V.studio(root); };
    $$('[data-act]', box).forEach(b => b.onclick = ev => A.run(ev.currentTarget, async () => {
      const a = b.dataset.act;
      if (a === 'nisab') return go('nisab');
      if (a === 'snap') { const cur = await loadPlan(); if (!Object.keys(cur.hours || {}).length) throw new Error('التوزيع فارغ — لا يوجد ما يُحفظ'); await A.addSnapshot('plan', S.sectionId, `توزيع الفصل الأول — ${today()}`, cur, false); A.toast('حُفظت نسخة الفصل الأول', 'ok'); return A.term2View(box, root); }
      if (a === 'xfer') return A.nisabTransfer({ term: 2, root });
      if (a === 'sug') { if (A._planTab) A._planTab('teachers'); go('plan'); setTimeout(() => A.planSuggest(document.getElementById('stBody')), 400); return; }
      if (a === 'rules' || a === 'gen') { if (A._planTab) A._planTab(a); return go('plan'); }
      if (a === 'tt') { A.LS.set('tttab', 'drafts'); return go('timetable'); }
      if (a === 'print') return A.planPrint();
    }));
    $('#t2Pr', box).onclick = () => A.planPrint();
    // حالة كل الأقسام
    try {
      const secs = S.sections, rows = await api.list('section_plans', { section_id: secs.map(s => s.id) });
      $('#t2All', box).innerHTML = `<b>حالة الأقسام</b><div class="scroll"><table class="tbl"><thead><tr><th>القسم</th><th>النقل للفصل الثاني</th><th>آخر نقل</th><th></th></tr></thead><tbody>${secs.map(s => { const r = rows.find(x => x.section_id === s.id), d = (r && r.data) || {}, ok = d.term === 2 || (d.nisab && d.nisab.term === 2); return `<tr><td><b>${esc(s.name)}</b></td><td><span class="pill ${ok ? 'st-approved' : 'st-empty'}">${ok ? 'تم' : 'لم يُنقل'}</span></td><td class="small">${d.nisab ? A.fmtDT(d.nisab.at) : '—'}</td><td>${s.id === S.sectionId ? '<span class="small muted">الحالي</span>' : `<button class="btn ghost sm" data-gs="${s.id}">فتح</button>`}</td></tr>`; }).join('')}</tbody></table></div>`;
      $$('[data-gs]', box).forEach(b => b.onclick = () => { const sel = $('#secSel'); if (sel) { sel.value = b.dataset.gs; sel.dispatchEvent(new Event('change')); } });
    } catch (_) { $('#t2All', box).innerHTML = ''; }
  };

  // =====================================================================
  //  التغليف: أزرار في النصاب والتوزيع والأداة الكلاسيكية
  // =====================================================================
  const nis0 = V.nisab;
  if (nis0) V.nisab = async function (root) {
    await nis0(root);
    const head = $('.card .row .row', root) || $('.card .row', root), fr = $('iframe', root);
    if (head && canPlan() && !$('#tbSend', head)) { head.insertAdjacentHTML('afterbegin', `<button class="btn sky sm" id="tbSend">نقل إلى التوزيع والقيود والتوليد</button>`); $('#tbSend', head).onclick = () => A.nisabTransfer({ root }); }
    if (fr && canPlan()) {
      const onMsg = e => { if (e.source !== fr.contentWindow || !e.data || e.data.type !== 'dina-nisab-send') return; A.nisabTransfer({ term: e.data.term === 2 ? 2 : 1, root }); };
      window.addEventListener('message', onMsg);
      const hello = () => { try { fr.contentWindow.postMessage({ type: 'dina-nisab-host' }, location.origin); } catch (_) { } };
      fr.addEventListener('load', hello); hello();
      const off = () => { if (!document.body.contains(fr)) { window.removeEventListener('message', onMsg); window.removeEventListener('hashchange', off); } }; window.addEventListener('hashchange', off);
    }
  };
  const plan0 = V.plan;
  if (plan0) V.plan = async function (root) {
    await plan0(root);
    const bar = $('.pl-bar', root); if (!bar || $('#tbNs', bar)) return;
    const gen = $('#plGen', bar);
    const html = `<button class="btn ghost sm" id="tbNs">↧ من النصاب</button><button class="btn ghost sm" id="tbSg">✨ اقتراح المعلمين</button><button class="btn ghost sm" id="tbPr">طباعة</button>`;
    if (gen) gen.insertAdjacentHTML('beforebegin', html); else bar.insertAdjacentHTML('beforeend', html);
    $('#tbNs', bar).onclick = () => A.nisabTransfer({ root });
    $('#tbSg', bar).onclick = () => A.planSuggest(root);
    $('#tbPr', bar).onclick = () => A.planPrint();
    const P = A._planState && A._planState();
    if (P && (P.term || (P.nisab && P.nisab.term))) { const h = $('.card .sub', root); if (h && !$('.tb-tag', h)) h.insertAdjacentHTML('afterbegin', `<span class="tb-tag">الفصل الدراسي ${(P.term || P.nisab.term) === 2 ? 'الثاني' : 'الأول'}</span> `); }
    const on = $('#plTabs .on', root);
    if (on && on.dataset.t === 'teachers' && P) {
      let n = 0, e = 0; Object.entries(P.hours || {}).forEach(([c, m]) => { if (!S.classes.some(x => x.id === c && x.active)) return; Object.entries(m).forEach(([s, h]) => { if (+h) { n++; if (!((P.teachers[c] || {})[s])) e++; } }); });
      const b = $('#plB', root); if (b && e) b.insertAdjacentHTML('afterbegin', `<div class="notice warn tb-nt"><span>${AR(e)} خانة من ${AR(n)} بلا معلم.</span> <button class="btn sky sm" id="tbSg2">✨ اقتراح من الفصل الأول</button></div>`);
      const b2 = $('#tbSg2', root); if (b2) b2.onclick = () => A.planSuggest(root);
    }
  };
  const bld0 = V.builder;
  if (bld0) V.builder = function (root) {
    bld0(root);
    const head = $('.card .row .row', root) || $('.card .row', root), fr = $('iframe', root);
    if (head && !$('#tbBI', head)) { head.insertAdjacentHTML('afterbegin', `<button class="btn ghost sm" id="tbBI">👥 استيراد معلمي المنصة</button>`); $('#tbBI', head).onclick = ev => A.run(ev.currentTarget, () => A.builderImport(fr)); }
    if (S.me.is_owner && !$('.tb-hint', root)) { const c = $('.card', root); if (c) c.insertAdjacentHTML('beforeend', `<div class="notice tb-hint" style="margin:10px 0 0">خيارات أوسع (معلمو المنصة، القيود، التوليد، الطباعة A4): <button class="btn sky sm" id="tbGoPlan">انقل النصاب إلى «التوزيع والقيود والتوليد»</button></div>`); const g = $('#tbGoPlan', root); if (g) g.onclick = () => A.nisabTransfer({ root }); }
  };

  // ---------- الأنماط ----------
  if (!document.getElementById('tb-css')) { const s = document.createElement('style'); s.id = 'tb-css'; s.textContent = `
    .tb-terms{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 10px}.tb-terms button{border:2px solid var(--border,#d7e0ec);background:#fff;border-radius:12px;padding:10px;text-align:right;cursor:pointer;font:inherit;display:flex;flex-direction:column;gap:2px}.tb-terms button span{font-size:12px;color:#5b6b80}.tb-terms button.on{border-color:#3AB1DB;background:#EAF7FC;box-shadow:0 0 0 3px rgba(58,177,219,.18)}.tb-terms button:focus-visible{outline:3px solid #005499;outline-offset:2px}
    .tb-opts{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px}.tb-opts fieldset,.tb-pf{border:1px solid var(--border,#d7e0ec);border-radius:12px;padding:8px 12px;margin:0 0 8px}.tb-opts legend,.tb-pf legend{font-weight:800;color:#082B5A;padding:0 6px}.tb-opts .chk{align-items:flex-start;margin:4px 0}
    .tb-new td{background:#FFF8E4}.tb-bad{color:#b42318;font-weight:800}.tb-ok{color:#2E8B57;font-weight:800}
    .tb-pv td,.tb-pv th{text-align:center;font-size:12px;padding:4px}.tb-tn{font-size:10.5px;color:#005499;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:90px;margin:auto}
    .tb-bar{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin:8px 0}.tb-bar .in{padding:5px 8px;max-width:260px}
    .tb-sg{display:grid;grid-template-columns:1fr 230px;gap:10px}.tb-ld{border:1px solid var(--border,#d7e0ec);border-radius:12px;padding:8px;max-height:52vh;overflow:auto;font-size:12.5px}.tb-lr{display:grid;grid-template-columns:1fr 60px 28px;gap:6px;align-items:center;margin:4px 0}.tb-lr i{display:block;height:7px;border-radius:4px;background:#3AB1DB}.tb-lr.warn i{background:#E0A800}.tb-lr.bad i{background:#c0392b}.tb-lr.bad b{color:#b42318}
    .tb-st .in{padding:4px 6px;min-width:150px}.tb-ch th{background:#EAF3FA;color:#082B5A;text-align:right}.tb-chg td{background:#F2FBF5}
    .tb-why{display:inline-block;border-radius:999px;padding:2px 8px;font-size:11px;font-weight:700;white-space:nowrap}.tb-w0{background:#eef1f5;color:#4a5668}.tb-w1{background:#E3F4EA;color:#1f6b43}.tb-w2{background:#E4F2FA;color:#005499}.tb-w3{background:#EEE8F8;color:#5b3fa0}.tb-w4{background:#FFF3D6;color:#8a5a00}.tb-w5{background:#FDECEC;color:#b42318}
    .tb-seg{display:inline-flex;border:1px solid var(--border,#d7e0ec);border-radius:10px;overflow:hidden}.tb-seg button{border:0;background:#fff;padding:7px 14px;font:inherit;cursor:pointer}.tb-seg button.on{background:#082B5A;color:#fff}.tb-seg button:focus-visible{outline:3px solid #3AB1DB;outline-offset:-3px}
    .tb-tag{display:inline-block;background:#3AB1DB;color:#fff;border-radius:999px;padding:1px 10px;font-size:12px;font-weight:700}.tb-nt{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:10px 0 0}
    .tb-steps{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:8px}.tb-s{display:flex;gap:12px;align-items:center;border:1px solid var(--border,#d7e0ec);border-radius:14px;padding:10px 12px;background:#fff;box-shadow:0 2px 0 rgba(8,43,90,.05)}.tb-n{flex:0 0 30px;height:30px;border-radius:50%;display:grid;place-items:center;font-weight:900;background:#eef1f5;color:#4a5668}.tb-s.ok .tb-n{background:#2E8B57;color:#fff}.tb-s.warn .tb-n{background:#E0A800;color:#fff}.tb-s.todo .tb-n{background:#3AB1DB;color:#fff}.tb-s.ok{border-color:#BADF93}.tb-s.warn{border-color:#f1d27a}
    @media (max-width:600px){.tb-st thead{display:none}.tb-st tr:not(.tb-ch){display:grid;grid-template-columns:28px 1fr auto;gap:4px 8px;padding:8px 4px;border-bottom:1px solid #e3e9f1}.tb-st td{border:0!important;padding:2px!important}.tb-st td:nth-child(4){grid-column:2/-1;font-size:12px}.tb-st td:nth-child(4)::before{content:'الحالي: ';color:#5b6b80}.tb-st td:nth-child(5){grid-column:1/-1}.tb-st td:nth-child(5) .in{width:100%}.tb-st td:nth-child(6){grid-column:2/-1}.tb-ch,.tb-ch th{display:block}}
    @media (max-width:760px){.tb-sg{grid-template-columns:1fr}.tb-ld{max-height:none}.tb-terms{grid-template-columns:1fr}.tb-s{flex-wrap:wrap}.tb-s .btn{width:100%}}
    @media (prefers-reduced-motion:reduce){.tb-lr i{transition:none}}`; document.head.appendChild(s); }
})();
