/* توزيع الحصص والجدول المرن — مصفوفة (فصل × مادة) قابلة للتعديل الكامل لكل قسم، معلم لكل خلية، قيود، وتوليد جدول يُرسل مسودةً للمراجعة */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, I } = A;
  A.I.plan = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16M15 4v16"/></svg>';
  const uid = () => Math.random().toString(36).slice(2, 9);
  if (!document.getElementById('ttpro-css')) { const st = document.createElement('style'); st.id = 'ttpro-css'; st.textContent = `
  .pl-bk.pf{background:#e8f6ee;border-color:#9fd4b3;color:#2E8B57}
  .pl-dayb{background:none;border:0;font:inherit;font-weight:800;color:var(--navy);cursor:pointer;padding:2px 4px;border-radius:6px}
  .pl-dayb:hover,.pl-dayb:focus-visible{background:#eef4fb;outline:2px solid var(--sky)}
  .pl-f{display:inline-flex;align-items:center;gap:6px;flex-wrap:nowrap}
  .pl-pw td,.pl-pw th{vertical-align:middle}
  .tt-prog{margin-top:12px;padding:12px;border:1px solid var(--border);border-radius:14px;background:#f7fafd}
  .tt-bar{height:10px;border-radius:99px;background:#e3ebf5;overflow:hidden;margin-top:8px}
  .tt-bar i{display:block;height:100%;background:linear-gradient(90deg,#005499,#3AB1DB);border-radius:99px;transition:width .25s}
  .tt-sum{display:flex;gap:16px;align-items:center;margin-top:12px;flex-wrap:wrap}
  .tt-g{width:112px;height:112px;border-radius:50%;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;background:conic-gradient(var(--c) calc(var(--p)*1%),#e3ebf5 0);position:relative;box-shadow:0 6px 18px rgba(8,43,90,.14)}
  .tt-g::before{content:'';position:absolute;inset:10px;border-radius:50%;background:var(--card,#fff)}
  .tt-g b,.tt-g span{position:relative}.tt-g b{font-size:30px;color:var(--navy);line-height:1}.tt-g span{font-size:11px;color:var(--muted)}
  .tt-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
  .tt-kp>div{border:1px solid var(--border);border-radius:12px;padding:8px 10px;background:linear-gradient(180deg,#fff,#f5f8fc);box-shadow:0 2px 6px rgba(8,43,90,.06)}
  .tt-kp span{display:block;font-size:12px;color:var(--muted)}.tt-kp b{font-size:18px;color:var(--navy)}
  .tt-kp2{grid-template-columns:repeat(auto-fit,minmax(170px,1fr))}
  .tt-rules{margin-top:10px;border:1px solid var(--border);border-radius:12px;padding:8px 12px;background:#fff}
  .tt-rules>summary,.tt-rule>summary{cursor:pointer;padding:4px 0}
  .tt-rule{border-top:1px dashed var(--border);padding:2px 0}.tt-rule ul{margin:4px 0 6px;max-height:220px;overflow:auto}
  .tt-imp{margin-top:10px}.tt-alt .ok{color:#2E8B57;font-weight:800}.tt-alt .bad{color:#b42318;font-weight:800}
  .pl-gc{position:relative}.pl-gc.fx{background:repeating-linear-gradient(45deg,#f4f6f9,#f4f6f9 6px,#eceff4 6px,#eceff4 12px);cursor:not-allowed}
  .pl-gc.alt-good{background:#e3f4ea;box-shadow:inset 0 0 0 2px #2E8B57}.pl-gc.alt-ok{background:#f2f8fd}.pl-gc.alt-warn{background:#fff6e5}.pl-gc.alt-bad{background:#fdeceb;opacity:.75}
  .alt-d{position:absolute;top:2px;inset-inline-start:4px;font-size:10px;font-weight:800;color:var(--muted)}
  .pl-gc.alt-good .alt-d{color:#2E8B57}.pl-gc.alt-bad .alt-d{color:#b42318}
  .tt-clash{background:#fdeceb;box-shadow:inset 0 0 0 2px #b42318}
  .pl-rh{margin:16px 0 6px;color:var(--navy)}.pl-rp td,.pl-rp th{text-align:center}.pl-rp td:first-child{text-align:start;font-weight:700}
  @media (prefers-reduced-motion:reduce){.tt-bar i{transition:none}}
  @media (max-width:700px){.tt-g{width:90px;height:90px}.tt-g b{font-size:24px}.pl-f{flex-wrap:wrap}}`; document.head.appendChild(st); }

  const can = () => S.me.is_owner || A.anyPerm('structure', 'timetable_edit', 'tt_builder');
  A.canPlan = can;

  // توزيع القسم العالمي كما في ملف «توزيع الحصص العالمي» — يُعدَّل بعد الاستيراد بحرية
  const INTL = {
    groups: [['Compulsory Subjects', ['English', 'Library', 'Math', 'Arabic', 'Islamic', 'H&G', 'Science']], ['Sciences', ['Comp. Science / ICT', 'Biology', 'Physics', 'Chemistry']], ['Specialists', ['Swimming', 'PE', 'Art', 'Social Studies', 'Play']]],
    // English, Library, Math, Arabic, Islamic, H&G, Science, ICT, Biology, Physics, Chemistry, Swimming, PE, Art, Social, Play
    rows: [
      ['KG1', 'KG', 'KG1', '', [10, 1, 6, 6, 2, 0, 4, 0, 0, 0, 0, 1, 1, 1, 1, 2]],
      ['KG2 A', 'KG', 'KG2', 'A', [10, 1, 6, 6, 2, 0, 4, 0, 0, 0, 0, 1, 1, 1, 1, 2]],
      ['KG2 B', 'KG', 'KG2', 'B', [10, 1, 6, 6, 2, 0, 4, 0, 0, 0, 0, 1, 1, 1, 1, 2]],
      ['KG3 A', 'KG', 'KG3', 'A', [10, 1, 6, 5, 2, 0, 4, 1, 0, 0, 0, 1, 1, 1, 1, 2]],
      ['KG3 B', 'KG', 'KG3', 'B', [10, 1, 6, 5, 2, 0, 4, 1, 0, 0, 0, 1, 1, 1, 1, 2]],
      ['Grade 1 Boys', 'Grade', '1', 'Boys', [9, 1, 6, 5, 3, 0, 4, 2, 0, 0, 0, 1, 1, 2, 1, 0]],
      ['Grade 1 Girls', 'Grade', '1', 'Girls', [9, 1, 6, 5, 3, 0, 4, 2, 0, 0, 0, 1, 1, 2, 1, 0]],
      ['Grade 2 Girls', 'Grade', '2', 'Girls', [9, 1, 6, 5, 3, 0, 4, 2, 0, 0, 0, 1, 1, 2, 1, 0]],
      ['Grade 2 Boys', 'Grade', '2', 'Boys', [9, 1, 6, 5, 3, 0, 4, 2, 0, 0, 0, 1, 1, 2, 1, 0]],
      ['Grade 3 Girls', 'Grade', '3', 'Girls', [9, 1, 6, 5, 3, 0, 4, 2, 0, 0, 0, 1, 1, 2, 1, 0]],
      ['Grade 3 Boys', 'Grade', '3', 'Boys', [9, 1, 6, 5, 3, 0, 4, 2, 0, 0, 0, 1, 1, 2, 1, 0]],
      ['Grade 4 Girls', 'Grade', '4', 'Girls', [9, 0, 5, 5, 3, 2, 4, 2, 0, 0, 0, 1, 1, 2, 1, 0]],
      ['Grade 5 Girls', 'Grade', '5', 'Girls', [9, 0, 5, 5, 3, 2, 4, 2, 0, 0, 0, 1, 1, 2, 1, 0]],
      ['Grade 6 Girls', 'Grade', '6', 'Girls', [9, 0, 5, 5, 3, 2, 4, 2, 0, 0, 0, 1, 1, 2, 1, 0]],
      ['Grade 7 Girls', 'Grade', '7', 'Girls', [8, 0, 5, 5, 3, 2, 0, 2, 2, 2, 2, 1, 1, 2, 0, 0]]
    ]
  };

  let P = null, PSEC = null, tab = 'hours', dirty = false, lastGen = null;
  const blank = () => ({ groups: [], hours: {}, teachers: {}, maxDay: 2, blocks: {}, noDouble: false });
  const allSubs = () => P.groups.flatMap(g => g.subs);
  const sName = id => A.subjName(id) || '؟';
  const secClasses = () => S.classes.filter(c => c.active);
  const cap = () => { const s = A.section(); return s.days * s.periods; };
  const rowTot = cid => allSubs().reduce((a, s) => a + (+((P.hours[cid] || {})[s]) || 0), 0);
  const colTot = sid => secClasses().reduce((a, c) => a + (+((P.hours[c.id] || {})[sid]) || 0), 0);
  const H = (c, s) => +((P.hours[c] || {})[s]) || 0;
  const T = (c, s) => (P.teachers[c] || {})[s] || '';

  async function load() {
    const r = (await api.list('section_plans', { section_id: S.sectionId }))[0];
    P = Object.assign(blank(), r ? r.data : {}); PSEC = S.sectionId; dirty = false; lastGen = null;
    // المواد المستعملة وغير الموجودة في أي مجموعة تُضاف لمجموعة «أخرى»
    const inG = new Set(allSubs()), extra = new Set();
    Object.values(P.hours).forEach(m => Object.keys(m).forEach(s => { if (!inG.has(s) && S.subjects.some(x => x.id === s)) extra.add(s); }));
    if (extra.size) P.groups.push({ id: uid(), name: 'أخرى', subs: [...extra] });
    P.groups.forEach(g => g.subs = g.subs.filter(s => S.subjects.some(x => x.id === s)));
  }
  async function save(silent) {
    const r = await api.ups('section_plans', [{ section_id: S.sectionId, data: P }], 'section_id');
    dirty = false; const st = $('#plSt'); if (st) st.textContent = 'محفوظ · ' + A.fmtDT((r && r[0] && r[0].updated_at) || new Date().toISOString());
    if (!silent) A.toast('حُفظ توزيع الحصص', 'ok');
  }
  const touch = () => { dirty = true; const st = $('#plSt'); if (st) st.textContent = 'تعديلات غير محفوظة'; clearTimeout(touch.t); touch.t = setTimeout(() => save(true).catch(() => {}), 1500); };

  V.plan = async function (root) {
    if (!can()) { root.innerHTML = `<div class="card">${A.emptyBox('غير متاح لحسابك')}</div>`; return; }
    root.innerHTML = '<div class="spinner"></div>';
    try { if (PSEC !== S.sectionId || !P) await load(); } catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', esc(e.message))}</div>`; return; }
    const sec = A.section();
    const tabs = [['hours', 'الحصص لكل فصل'], ['teachers', 'المعلمون'], ['rules', 'القيود'], ['load', 'أحمال المعلمين'], ['gen', 'توليد الجدول'], ['rep', 'التقارير والتحليلات']];
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>توزيع الحصص والجدول المرن</h2>
        <p class="sub" style="margin:2px 0 0">${esc(sec.name)} · ${AR(sec.days)} أيام × ${AR(sec.periods)} حصص = ${AR(cap())} حصة أسبوعياً لكل فصل. عدّل المواد والمجموعات والحصص والمعلمين بحرية، ثم ولّد الجدول ليصل مسودةً تراجعها وتعدّلها وتعتمدها.</p></div>
        <span class="small muted" id="plSt" role="status" aria-live="polite">${dirty ? 'تعديلات غير محفوظة' : 'محفوظ'}</span></div>
      <div class="row pl-bar">
        <button class="btn ghost sm" id="plSub">${I.plus} مادة</button><button class="btn ghost sm" id="plGrp">${I.plus} مجموعة</button>
        <button class="btn ghost sm" id="plPaste">لصق من Excel</button><button class="btn ghost sm" id="plIntl">توزيع القسم العالمي الجاهز</button>
        <button class="btn ghost sm" id="plX">${I.down} Excel</button><div class="grow"></div>
        <button class="btn sky sm" id="plGen">توليد الجدول</button></div>
      <div class="tabs" id="plTabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div id="plB"></div></div>`;
    $$('#plTabs button', root).forEach(b => b.onclick = () => { tab = b.dataset.t; V.plan(root); });
    $('#plSub', root).onclick = () => addSubject(root);
    $('#plGrp', root).onclick = () => { const n = prompt('اسم المجموعة (مثلاً: المواد الأساسية)'); if (!n) return; P.groups.push({ id: uid(), name: n.trim(), subs: [] }); touch(); V.plan(root); };
    $('#plPaste', root).onclick = () => pasteDialog(root);
    $('#plIntl', root).onclick = () => intlDialog(root);
    $('#plX', root).onclick = exportX;
    $('#plGen', root).onclick = () => { tab = 'gen'; V.plan(root); };
    const box = $('#plB', root);
    (({ hours: tHours, teachers: tTeach, rules: tRules, load: tLoad, gen: tGen, rep: tRep })[tab] || tHours)(box, root);
  };

  // ---------- الحصص ----------
  function head() {
    const G = P.groups.filter(g => g.subs.length);
    return `<tr class="pl-g"><th rowspan="2" class="pl-c">الفصل</th>${G.map(g => `<th colspan="${g.subs.length}"><button class="pl-gb" data-g="${g.id}" title="تعديل المجموعة">${esc(g.name)}</button></th>`).join('')}<th rowspan="2">المجموع</th></tr>
      <tr>${G.flatMap(g => g.subs.map(s => `<th class="pl-s"><button class="pl-sb" data-s="${s}" data-gg="${g.id}" title="نقل أو حذف المادة">${esc(sName(s))}</button></th>`)).join('')}</tr>`;
  }
  function tHours(box, root) {
    const cls = secClasses(), subs = allSubs(), c0 = cap();
    if (!subs.length) { box.innerHTML = A.emptyBox('لا توجد مواد في التوزيع بعد', 'أضف مادة، أو الصق جدولاً من Excel، أو استورد توزيع القسم العالمي الجاهز.'); return; }
    box.innerHTML = `<div class="scroll pl-wrap"><table class="tbl pl-t"><thead>${head()}</thead><tbody>
      ${cls.map(c => { const t = rowTot(c.id); return `<tr><th class="pl-c">${esc(c.name)}</th>${P.groups.filter(g => g.subs.length).flatMap(g => g.subs.map(s => `<td><input class="pl-in" inputmode="numeric" data-c="${c.id}" data-s="${s}" value="${H(c.id, s) || ''}" aria-label="${esc(c.name)} — ${esc(sName(s))}"></td>`)).join('')}<td class="pl-tot ${t === c0 ? 'ok' : t > c0 ? 'bad' : 'warn'}" data-rt="${c.id}">${AR(t)}</td></tr>`; }).join('')}
      <tr class="pl-sum"><th class="pl-c">المجموع</th>${P.groups.filter(g => g.subs.length).flatMap(g => g.subs.map(s => `<td data-ct="${s}">${AR(colTot(s))}</td>`)).join('')}<td>${AR(cls.reduce((a, c) => a + rowTot(c.id), 0))}</td></tr></tbody></table></div>
      <p class="small muted" style="margin-top:8px">الأخضر = مكتمل (${AR(c0)})، البرتقالي = أقل (تبقى حصص فارغة)، الأحمر = أكثر من سعة الأسبوع. التعديلات تُحفظ تلقائياً.</p>`;
    $$('.pl-in', box).forEach(i => i.oninput = () => {
      const v = A.normKey ? String(i.value).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) : i.value; const n = Math.max(0, Math.min(40, parseInt(v, 10) || 0));
      (P.hours[i.dataset.c] = P.hours[i.dataset.c] || {})[i.dataset.s] = n; if (!n) delete P.hours[i.dataset.c][i.dataset.s];
      const t = rowTot(i.dataset.c), td = $(`[data-rt="${i.dataset.c}"]`, box); td.textContent = AR(t); td.className = 'pl-tot ' + (t === c0 ? 'ok' : t > c0 ? 'bad' : 'warn');
      const ct = $(`[data-ct="${i.dataset.s}"]`, box); if (ct) ct.textContent = AR(colTot(i.dataset.s)); touch();
    });
    $$('.pl-in', box).forEach(i => i.onkeydown = e => { if (!['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return; e.preventDefault(); const L = $$(`.pl-in[data-s="${i.dataset.s}"]`, box), k = L.indexOf(i) + (e.key === 'ArrowUp' ? -1 : 1); if (L[k]) L[k].focus(); });
    bindHead(box, root);
  }
  function bindHead(box, root) {
    $$('.pl-gb', box).forEach(b => b.onclick = () => groupDialog(b.dataset.g, root));
    $$('.pl-sb', box).forEach(b => b.onclick = () => subjectDialog(b.dataset.s, root));
  }
  function groupDialog(gid, root) {
    const g = P.groups.find(x => x.id === gid); if (!g) return; const i = P.groups.indexOf(g);
    const m = A.modal(`<h3>المجموعة</h3><div class="field"><label for="gN">الاسم</label><input class="in" id="gN" value="${esc(g.name)}"></div>
      <div class="acts"><button class="btn bad sm" id="gD">حذف المجموعة (تنتقل موادها لما قبلها)</button><button class="btn ghost sm" id="gL" ${i ? '' : 'disabled'}>تقديم</button><button class="btn ghost sm" id="gR" ${i < P.groups.length - 1 ? '' : 'disabled'}>تأخير</button><button class="btn" id="gS">حفظ</button></div>`);
    const done = () => { m.close(); touch(); V.plan(root); };
    m.el.querySelector('#gS').onclick = () => { g.name = m.el.querySelector('#gN').value.trim() || g.name; done(); };
    m.el.querySelector('#gL').onclick = () => { P.groups.splice(i, 1); P.groups.splice(i - 1, 0, g); done(); };
    m.el.querySelector('#gR').onclick = () => { P.groups.splice(i, 1); P.groups.splice(i + 1, 0, g); done(); };
    m.el.querySelector('#gD').onclick = () => { if (P.groups.length < 2) { A.toast('أبقِ مجموعة واحدة على الأقل', 'warn'); return; } const to = P.groups[i - 1] || P.groups[i + 1]; to.subs.push(...g.subs); P.groups.splice(i, 1); done(); };
  }
  function subjectDialog(sid, root) {
    const g = P.groups.find(x => x.subs.includes(sid)); const k = g.subs.indexOf(sid);
    const m = A.modal(`<h3>${esc(sName(sid))}</h3><div class="field"><label for="sG">المجموعة</label><select class="in" id="sG">${P.groups.map(x => `<option value="${x.id}" ${x === g ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div class="acts"><button class="btn bad sm" id="sD">إزالة من التوزيع</button><button class="btn ghost sm" id="sL" ${k ? '' : 'disabled'}>تقديم</button><button class="btn ghost sm" id="sR" ${k < g.subs.length - 1 ? '' : 'disabled'}>تأخير</button><button class="btn" id="sS">حفظ</button></div>
      <p class="small muted">الإزالة تحذف حصص هذه المادة من التوزيع فقط؛ لا تمس الجدول المعتمد ولا الخطط.</p>`);
    const done = () => { m.close(); touch(); V.plan(root); };
    m.el.querySelector('#sS').onclick = () => { const to = P.groups.find(x => x.id === m.el.querySelector('#sG').value); if (to !== g) { g.subs.splice(k, 1); to.subs.push(sid); } done(); };
    m.el.querySelector('#sL').onclick = () => { g.subs.splice(k, 1); g.subs.splice(k - 1, 0, sid); done(); };
    m.el.querySelector('#sR').onclick = () => { g.subs.splice(k, 1); g.subs.splice(k + 1, 0, sid); done(); };
    m.el.querySelector('#sD').onclick = async () => { if (!(await A.confirmBox(`إزالة «${esc(sName(sid))}» وحصصها من التوزيع؟`, 'إزالة', true))) return; g.subs.splice(k, 1); Object.values(P.hours).forEach(h => delete h[sid]); Object.values(P.teachers).forEach(h => delete h[sid]); done(); };
  }
  async function ensureSubject(name) {
    const n = A.norm(name); let s = S.subjects.find(x => A.normKey(x.name) === A.normKey(n));
    if (!s) { s = await api.addSubject({ school_id: S.school.id, name: n }).catch(async () => (await api.reloadSubjects()).find(x => A.normKey(x.name) === A.normKey(n))); if (s && !S.subjects.some(x => x.id === s.id)) S.subjects.push(s); }
    return s;
  }
  function addSubject(root) {
    if (!P.groups.length) P.groups.push({ id: uid(), name: 'المواد', subs: [] });
    const used = new Set(allSubs());
    const m = A.modal(`<h3>إضافة مادة إلى التوزيع</h3><div class="field"><label for="aS">مادة موجودة</label><select class="in" id="aS"><option value="">— اختر —</option>${S.subjects.filter(s => !used.has(s.id)).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="aN">أو اسم مادة جديدة</label><input class="in" id="aN" placeholder="مثلاً: Drama"></div>
      <div class="field"><label for="aG">المجموعة</label><select class="in" id="aG">${P.groups.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}</select></div>
      <div class="acts"><button class="btn" id="aOk">إضافة</button></div>`);
    m.el.querySelector('#aOk').onclick = e => A.run(e.currentTarget, async () => {
      let id = m.el.querySelector('#aS').value; const nm = m.el.querySelector('#aN').value.trim();
      if (!id && nm) id = (await ensureSubject(nm) || {}).id; if (!id) throw new Error('اختر مادة أو اكتب اسماً');
      if (allSubs().includes(id)) throw new Error('المادة موجودة في التوزيع');
      P.groups.find(g => g.id === m.el.querySelector('#aG').value).subs.push(id); m.close(); touch(); V.plan(root);
    });
  }

  // لصق جدول من Excel: الصف الأول أسماء المواد، والعمود الأول أسماء الفصول
  function pasteDialog(root) {
    const m = A.modal(`<h3>لصق التوزيع من Excel أو Numbers</h3><p class="sub">انسخ الجدول كما هو: <b>الصف الأول</b> أسماء المواد، و<b>العمود الأول</b> أسماء الفصول، والخلايا عدد الحصص. الفصول تُطابق بالاسم مع فصول هذا القسم، والمواد غير الموجودة تُضاف تلقائياً. عمود «Total» أو «المجموع» يُتجاهل.</p>
      <textarea class="in" id="pT" rows="9" dir="auto"></textarea><div id="pP" class="small" style="margin-top:6px"></div>
      <label class="chk"><input type="checkbox" id="pNew" checked> أنشئ الفصول غير الموجودة في هذا القسم</label>
      <div class="acts"><button class="btn ghost" id="pC">معاينة</button><button class="btn" id="pS" disabled>تطبيق</button></div>`, { cls: 'wide' });
    let parsed = null;
    m.el.querySelector('#pC').onclick = () => {
      const rows = m.el.querySelector('#pT').value.split(/\r?\n/).filter(l => l.trim()).map(l => l.split('\t').map(x => x.trim()));
      if (rows.length < 2) { m.el.querySelector('#pP').textContent = 'الصق صف العناوين وصفاً واحداً على الأقل'; return; }
      const hdr = rows[0], skip = h => !h || /^(total|المجموع|المجموع الكلي|grade|الصف|الفصل)$/i.test(h);
      const cols = hdr.map((h, i) => ({ h, i })).filter(x => x.i > 0 && !skip(x.h));
      const data = rows.slice(1).filter(r => r[0] && !/^(total|المجموع)$/i.test(r[0])).map(r => ({ name: r[0], c: secClasses().find(c => A.normKey(c.name) === A.normKey(r[0])), v: cols.map(x => parseInt(String(r[x.i] || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), 10) || 0) }));
      parsed = { cols, data };
      m.el.querySelector('#pP').innerHTML = `${AR(cols.length)} مادة · ${AR(data.length)} فصل (${AR(data.filter(d => d.c).length)} موجود، ${AR(data.filter(d => !d.c).length)} جديد)<br><span class="muted">${cols.map(c => esc(c.h)).join('، ')}</span>`;
      m.el.querySelector('#pS').disabled = !cols.length || !data.length;
    };
    m.el.querySelector('#pS').onclick = e => A.run(e.currentTarget, async () => {
      const mk = m.el.querySelector('#pNew').checked; const sid = [];
      for (const c of parsed.cols) sid.push((await ensureSubject(c.h)).id);
      if (!P.groups.length) P.groups.push({ id: uid(), name: 'المواد', subs: [] });
      sid.forEach(id => { if (!allSubs().includes(id)) P.groups[P.groups.length - 1].subs.push(id); });
      for (const d of parsed.data) {
        let c = d.c; if (!c && mk) { c = await api.addClass({ section_id: S.sectionId, name: d.name, stage: '', grade_word: d.name, class_label: '', sort: 100 + S.classes.length }); S.classes.push(c); }
        if (!c) continue; P.hours[c.id] = P.hours[c.id] || {}; sid.forEach((s, k) => { if (d.v[k]) P.hours[c.id][s] = d.v[k]; else delete P.hours[c.id][s]; });
      }
      await save(true); m.close(); A.toast('طُبّق التوزيع الملصوق', 'ok'); V.plan(root);
    });
  }

  function intlDialog(root) {
    const sec = A.section(), have = secClasses();
    const m = A.modal(`<h3>توزيع القسم العالمي الجاهز</h3>
      <p class="sub">من ملف «توزيع الحصص العالمي»: ${AR(INTL.rows.length)} فصلاً (KG1 إلى Grade 7) و${AR(16)} مادة في ثلاث مجموعات، ٣٥ حصة لكل فصل. بعد الاستيراد تعدّل أي رقم أو مادة أو فصل بحرية.</p>
      ${/عالمي|دولي|international/i.test(sec.name) ? '' : `<div class="notice warn">القسم الحالي هو «${esc(sec.name)}». الأفضل أن تُنشئ قسماً مستقلاً للعالمي حتى لا تختلط فصوله بفصول هذا القسم.</div>`}
      <div class="acts">${S.me.is_owner ? '<button class="btn sky" id="iNew">إنشاء «القسم العالمي» واستيراد التوزيع فيه</button>' : ''}<button class="btn ghost" id="iHere">استيراد في القسم الحالي</button></div>
      <p class="small muted">الفصول الموجودة بنفس الاسم تُستعمل كما هي (${AR(have.filter(c => INTL.rows.some(r => A.normKey(r[0]) === A.normKey(c.name))).length)} موجودة هنا)، والمواد بأسمائها الإنجليزية تُضاف إن لم تكن موجودة. لا يُمس أي إدخال للمعلمين.</p>`);
    const run = async (secId) => {
      const subIds = []; for (const [, list] of INTL.groups) for (const n of list) subIds.push((await ensureSubject(n)).id);
      let cls = await api.list('classes', { section_id: secId }, { order: 'sort' });
      const plan = blank(); let k = 0;
      plan.groups = INTL.groups.map(([n, list]) => ({ id: uid(), name: n, subs: list.map(() => subIds[k++]) }));
      for (const [i, [name, stage, gw, lbl, v]] of INTL.rows.entries()) {
        let c = cls.find(x => A.normKey(x.name) === A.normKey(name));
        if (!c) { c = await api.addClass({ section_id: secId, name, stage, grade_word: gw, class_label: lbl, sort: i + 1 }); cls.push(c); }
        plan.hours[c.id] = {}; v.forEach((n, j) => { if (n) plan.hours[c.id][subIds[j]] = n; });
      }
      await api.ups('section_plans', [{ section_id: secId, data: plan }], 'section_id');
      return plan;
    };
    const nb = m.el.querySelector('#iNew');
    if (nb) nb.onclick = e => A.run(e.currentTarget, async () => {
      let s = S.sections.find(x => /عالمي|دولي|international/i.test(x.name));
      if (!s) { s = await api.addSection({ school_id: S.school.id, name: 'القسم العالمي', short_name: 'العالمي', days: 5, periods: 7, sort: (S.sections.length + 1) }); S.sections.push(s); }
      await run(s.id); m.close(); A.toast('أُنشئ القسم العالمي واستُورد التوزيع — انتقل إليه من قائمة «القسم»', 'ok');
      S.sectionId = s.id; A.LS.set('section', s.id); PSEC = null; await A.loadSection(); A.shell(); location.hash = '#/plan'; A.route();
    });
    m.el.querySelector('#iHere').onclick = e => A.run(e.currentTarget, async () => { await run(S.sectionId); S.classes = await api.list('classes', { section_id: S.sectionId }, { order: 'sort' }); PSEC = null; m.close(); A.toast('استُورد التوزيع', 'ok'); V.plan(root); });
  }

  // ---------- المعلمون ----------
  function tTeach(box, root) {
    const cls = secClasses(), G = P.groups.filter(g => g.subs.length);
    if (!G.length) { box.innerHTML = A.emptyBox('أضف المواد والحصص أولاً'); return; }
    const staff = S.staff.filter(p => p.active).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
    const opts = sel => `<option value="">—</option>` + staff.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('');
    box.innerHTML = `<div class="row" style="gap:8px;margin:10px 0"><span class="small muted">اختر معلماً لكل مادة في كل فصل. لتعيين معلم لمادة في كل الفصول دفعة واحدة:</span>
        <select class="in" id="bS" style="max-width:200px">${allSubs().map(s => `<option value="${s}">${esc(sName(s))}</option>`).join('')}</select><select class="in" id="bT" style="max-width:220px">${opts('')}</select><button class="btn ghost sm" id="bGo">تعيين للكل</button></div>
      <div class="scroll pl-wrap"><table class="tbl pl-t pl-tt"><thead>${head()}</thead><tbody>
      ${cls.map(c => `<tr><th class="pl-c">${esc(c.name)}</th>${G.flatMap(g => g.subs.map(s => H(c.id, s) ? `<td><select class="pl-sel ${T(c.id, s) ? '' : 'empty'}" data-c="${c.id}" data-s="${s}" aria-label="${esc(c.name)} — ${esc(sName(s))}">${opts(T(c.id, s))}</select><span class="pl-h">${AR(H(c.id, s))}</span></td>` : '<td class="faint">·</td>')).join('')}<td></td></tr>`).join('')}</tbody></table></div>`;
    $$('.pl-sel', box).forEach(x => x.onchange = () => { (P.teachers[x.dataset.c] = P.teachers[x.dataset.c] || {})[x.dataset.s] = x.value; if (!x.value) delete P.teachers[x.dataset.c][x.dataset.s]; x.classList.toggle('empty', !x.value); touch(); });
    $('#bGo', box).onclick = () => { const s = $('#bS', box).value, t = $('#bT', box).value; cls.forEach(c => { if (H(c.id, s)) { (P.teachers[c.id] = P.teachers[c.id] || {})[s] = t; if (!t) delete P.teachers[c.id][s]; } }); touch(); V.plan(root); };
    bindHead(box, root);
  }
  // ---------- القيود (محرك موحّد DinaTT: إلزامية وتفضيلية بمستوى قوة ووزن لكل قيد) ----------
  const ens = () => { P.subj = P.subj || {}; P.rooms = P.rooms || []; P.classOff = P.classOff || {}; P.cpref = P.cpref || {}; P.tlim = P.tlim || {}; P.locks = P.locks || {}; P.joint = P.joint || []; P.blocks = P.blocks || {}; P.rules = P.rules || {}; P.profiles = P.profiles || []; P.reserved = P.reserved || []; P.log = P.log || []; };
  const TT = () => window.DinaTT;
  const DEFCORE = 'العربية، لغتي، الرياضيات، العلوم، الإنجليزية، English، Math، Science، Arabic';
  const logIt = (what) => { ens(); P.log.unshift({ at: new Date().toISOString(), by: S.me.id, what }); if (P.log.length > 300) P.log.length = 300; };
  const dayLbl = d => A.DAYS[d] || ('يوم ' + AR(d + 1));
  // شبكة ثلاثية: فارغ ← × ممنوع ← ✓ مفضّل ← فارغ  (st: Map 'd-p' → 'x'|'p')
  const tri = (st, attr, lbl) => { const sec = A.section(); return `<div class="scroll"><table class="tbl pl-blk"><thead><tr><th></th>${Array.from({ length: sec.periods }, (_, p) => `<th>${AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: sec.days }, (_, d) => `<tr><th><button class="pl-dayb" data-${attr}-day="${d}" title="تطبيق على اليوم كله">${dayLbl(d)}</button></th>${Array.from({ length: sec.periods }, (_, p) => { const k = d + '-' + p, v = st.get(k) || ''; return `<td><button class="pl-bk ${v === 'x' ? 'on' : v === 'p' ? 'pf' : ''}" data-${attr}="${k}" aria-label="${dayLbl(d)} الحصة ${p + 1} ${lbl}: ${v === 'x' ? 'ممنوع' : v === 'p' ? 'مفضّل' : 'محايد'}">${v === 'x' ? '×' : v === 'p' ? '✓' : ''}</button></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
    <p class="small muted" style="margin:4px 0 0">اضغط الخانة: <b>×</b> ممنوع ← <b style="color:#2E8B57">✓</b> مفضّل ← محايد. اضغط اسم اليوم لتطبيق الحالة على اليوم كله.</p>`; };
  const bindTri = (B, attr, get, setv, redraw) => {
    $$(`[data-${attr}]`, B).forEach(b => b.onclick = () => { const k = b.getAttribute('data-' + attr), v = get().get(k) || '', nv = v === '' ? 'x' : v === 'x' ? 'p' : ''; const m = get(); if (nv) m.set(k, nv); else m.delete(k); setv(m); touch(); redraw(); });
    $$(`[data-${attr}-day]`, B).forEach(b => b.onclick = () => { const d = +b.getAttribute('data-' + attr + '-day'), sec = A.section(), m = get(); const ks = Array.from({ length: sec.periods }, (_, p) => d + '-' + p); const v = m.get(ks[0]) || '', nv = v === '' ? 'x' : v === 'x' ? 'p' : ''; ks.forEach(k => nv ? m.set(k, nv) : m.delete(k)); setv(m); touch(); redraw(); });
  };
  const mapOf = (xs, ps) => { const m = new Map(); (ps || []).forEach(k => m.set(k, 'p')); (xs || []).forEach(k => m.set(k, 'x')); return m; };
  const split2 = m => ({ x: [...m].filter(([, v]) => v === 'x').map(([k]) => k), p: [...m].filter(([, v]) => v === 'p').map(([k]) => k) });
  const sel = (id, opts, v, lab, w) => `<label class="small pl-f">${lab} <select class="in" id="${id}" style="max-width:${w || 110}px">${opts.map(([a, b]) => `<option value="${a}" ${String(v ?? '') === String(a) ? 'selected' : ''}>${b}</option>`).join('')}</select></label>`;
  const nOpts = (arr) => [['', '—'], ...arr.map(n => [n, AR(n)])];
  const tidsOf = () => [...new Set(Object.values(P.teachers).flatMap(m => Object.values(m)).filter(Boolean))].sort((a, b) => String(A.personName(a)).localeCompare(String(A.personName(b)), 'ar'));
  const copyDialog = (title, items, cur, onApply) => {
    const m = A.modal(`<h3>${esc(title)}</h3><p class="small muted">اختر من تُنسخ إليهم القيود نفسها (تستبدل قيودهم الحالية من النوع نفسه).</p>
      <div class="row" style="gap:6px;margin-bottom:6px"><button class="btn ghost sm" id="cpA">تحديد الكل</button><button class="btn ghost sm" id="cpN">إلغاء التحديد</button></div>
      <div class="perm-grid" style="max-height:50vh;overflow:auto">${items.filter(([v]) => v !== cur).map(([v, l]) => `<label class="chk small"><input type="checkbox" value="${v}"> ${esc(l)}</label>`).join('')}</div>
      <div class="acts"><button class="btn" id="cpGo">نسخ</button></div>`);
    m.el.querySelector('#cpA').onclick = () => m.el.querySelectorAll('input').forEach(i => i.checked = true);
    m.el.querySelector('#cpN').onclick = () => m.el.querySelectorAll('input').forEach(i => i.checked = false);
    m.el.querySelector('#cpGo').onclick = () => { const ids = [...m.el.querySelectorAll('input:checked')].map(i => i.value); if (!ids.length) return; onApply(ids); m.close(); touch(); A.toast(`نُسخت القيود إلى ${AR(ids.length)}`, 'ok'); };
  };
  function tRules(box, root) {
    ens(); const sec = A.section(), subs = allSubs();
    const tids = tidsOf();
    let who = A.LS.get('pl_bt'); if (!tids.includes(who)) who = tids[0];
    let cw = A.LS.get('pl_bc'); if (!secClasses().some(c => c.id === cw)) cw = (secClasses()[0] || {}).id;
    let rs = A.LS.get('pl_rs') || 'power';
    const nB = Object.values(P.blocks).reduce((a, l) => a + (l || []).length, 0), nT = Object.keys(P.tlim).filter(t => Object.values(P.tlim[t] || {}).some(v => v !== '' && v !== undefined && !(Array.isArray(v) && !v.length))).length;
    const tabs = [['power', 'قوة القيود والأوزان'], ['subj', 'المواد'], ['teach', `المعلمون${nB || nT ? ` (${AR(nT || 0)})` : ''}`], ['cls', 'الفصول'], ['rooms', `القاعات والمعامل${P.rooms.length ? ` (${AR(P.rooms.length)})` : ''}`], ['joint', `المشتركة والمتوازية${P.joint.length ? ` (${AR(P.joint.length)})` : ''}`], ['gen', 'قواعد عامة']];
    box.innerHTML = `<div class="chip-filter" id="rsT" style="margin-top:12px">${tabs.map(([k, l]) => `<button data-v="${k}" class="${rs === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="rsB" class="sec-box"></div>`;
    $$('#rsT button', box).forEach(b => b.onclick = () => { A.LS.set('pl_rs', b.dataset.v); tRules(box, root); });
    const B = $('#rsB', box), redraw = () => tRules(box, root);
    if (!TT()) { B.innerHTML = '<p class="small muted">محرك القيود لم يُحمَّل. حدّث الصفحة.</p>'; return; }
    if (rs === 'power') {
      const R = TT().RULES, groups = [...new Set(Object.values(R).map(r => r[1]))], rep = lastGen && lastGen.report;
      B.innerHTML = `<div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><div class="grow"><b>قوة القيود وأوزانها</b><p class="small muted" style="margin:2px 0 0"><b>إلزامي</b> لا يُخالَف إلا عند الاستحالة ويُعرض خطأً، <b>قوي</b> يُحترم غالباً، <b>مفضّل</b> يُحسّن قدر الإمكان، <b>متوقف</b> لا يُحسب. الوزن (٠–١٠) يحدد الأولوية بين القيود من المستوى نفسه.</p></div>
          <div class="row" style="gap:6px;flex-wrap:wrap"><select class="in" id="pwP" style="max-width:240px" aria-label="ملف جاهز">${Object.entries(TT().PRESETS).map(([k, [l]]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select><button class="btn ghost sm" id="pwA">تطبيق</button><button class="btn ghost sm" id="pwR">الافتراضي</button></div></div>
        <div class="row" style="gap:6px;margin:8px 0;flex-wrap:wrap"><b class="small">ملفاتك المحفوظة:</b>${P.profiles.map(p => `<span class="pill st-empty" style="display:inline-flex;gap:6px;align-items:center">${esc(p.name)} <button class="btn ghost sm" data-pfa="${p.id}" style="padding:0 6px">تطبيق</button><button class="btn bad sm" data-pfd="${p.id}" style="padding:0 6px" aria-label="حذف ${esc(p.name)}">×</button></span>`).join('') || '<span class="small muted">لا يوجد</span>'}<button class="btn ghost sm" id="pwS">${I.plus} حفظ الإعداد الحالي باسم</button></div>
        ${groups.map(gname => `<h4 style="margin:12px 0 4px;color:var(--navy)">${esc(gname)}</h4><div class="scroll"><table class="tbl pl-pw"><thead><tr><th>القيد</th><th style="width:130px">المستوى</th><th style="width:190px">الوزن</th>${rep ? '<th style="width:80px">في آخر توليد</th>' : ''}</tr></thead><tbody>
          ${Object.entries(R).filter(([, r]) => r[1] === gname).map(([k, r]) => { const c = TT().ruleCfg({ rules: P.rules }, k), n = rep ? (rep.byRule[k] || {}).n || 0 : 0; return `<tr><td><b>${esc(r[0])}</b><div class="small muted">${esc(r[4])}</div></td>
            <td>${r[5] ? `<select class="in" data-lv="${k}" aria-label="مستوى ${esc(r[0])}">${Object.entries(TT().LVN).map(([v, l]) => `<option value="${v}" ${c.lv === v ? 'selected' : ''}>${l}</option>`).join('')}</select>` : `<span class="pill st-approved">${TT().LVN[c.lv]} دائماً</span>`}</td>
            <td>${r[5] ? `<div class="row" style="gap:6px;flex-wrap:nowrap"><input type="range" min="0" max="10" step="1" value="${c.w}" data-w="${k}" aria-label="وزن ${esc(r[0])}" style="flex:1"><b data-wv="${k}" style="min-width:22px;text-align:center">${AR(c.w)}</b></div>` : '—'}</td>
            ${rep ? `<td>${n ? `<span class="pill ${c.lv === 'h' ? 'st-returned' : 'st-submitted'}">${AR(n)}</span>` : '<span class="pill st-approved">✓</span>'}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>`).join('')}`;
      $$('[data-lv]', B).forEach(x => x.onchange = () => { (P.rules[x.dataset.lv] = P.rules[x.dataset.lv] || {}).lv = x.value; if (x.dataset.lv === 'adj') P.noDouble = x.value !== 'o'; if (x.dataset.lv === 'emptyLast') P.emptyLast = x.value !== 'o'; touch(); });
      $$('[data-w]', B).forEach(x => x.oninput = () => { (P.rules[x.dataset.w] = P.rules[x.dataset.w] || {}).w = +x.value; $(`[data-wv="${x.dataset.w}"]`, B).textContent = AR(+x.value); touch(); });
      $('#pwA', B).onclick = () => { const pr = TT().PRESETS[$('#pwP', B).value]; P.rules = JSON.parse(JSON.stringify(pr[1])); logIt('تطبيق ملف القيود: ' + pr[0]); touch(); redraw(); };
      $('#pwR', B).onclick = () => { P.rules = {}; touch(); redraw(); };
      $('#pwS', B).onclick = () => { const n = prompt('اسم ملف القيود (مثلاً: جدول رمضان)'); if (!n) return; P.profiles.push({ id: uid(), name: n.trim(), rules: JSON.parse(JSON.stringify(P.rules)) }); touch(); redraw(); };
      $$('[data-pfa]', B).forEach(b => b.onclick = () => { const p = P.profiles.find(x => x.id === b.dataset.pfa); if (!p) return; P.rules = JSON.parse(JSON.stringify(p.rules)); logIt('تطبيق ملف القيود: ' + p.name); touch(); redraw(); });
      $$('[data-pfd]', B).forEach(b => b.onclick = () => { P.profiles = P.profiles.filter(x => x.id !== b.dataset.pfd); touch(); redraw(); });
    } else if (rs === 'subj') {
      const times = [['', '—'], ['early', 'أول اليوم'], ['mid', 'وسط اليوم'], ['late', 'آخر اليوم'], ['avoidFirst', 'ليست الأولى'], ['avoidLast', 'ليست الأخيرة']];
      const coreN = (P.coreList ?? DEFCORE).split(/[،,]/).map(x => A.normKey(x.trim())).filter(Boolean), isCore = s => { const c = P.subj[s] || {}; return c.core !== undefined ? !!c.core : coreN.some(n => A.normKey(sName(s)).includes(n)); };
      B.innerHTML = `<b>قيود المواد</b><p class="small muted" style="margin:2px 0 8px">المزدوجة (حصتان متتاليتان)، أقصى حصص في اليوم، التوقيت (للحصص العملية والرياضة مثلاً)، المادة الأساسية، القاعة أو المعمل، والحصص المسموح بها. «أوقات وأيام» للمنع والتفضيل بالتفصيل.</p>
        <div class="scroll"><table class="tbl pl-sj"><thead><tr><th>المادة</th><th>مزدوجة أسبوعياً</th><th>أقصى يومياً</th><th>التوقيت</th><th>أساسية</th><th>القاعة/المعمل</th><th>الحصص المسموح بها</th><th></th></tr></thead><tbody>${subs.map(s => { const c = P.subj[s] || {}, al = new Set(c.periods || []), nx = (c.off || []).length + (c.offDays || []).length + (c.pref || []).length; return `<tr><td><b>${esc(sName(s))}</b></td>
          <td><select class="in" data-dbl="${s}" style="max-width:80px">${[0, 1, 2, 3].map(n => `<option value="${n}" ${(+c.doubles || 0) === n ? 'selected' : ''}>${n ? AR(n) : '—'}</option>`).join('')}</select></td>
          <td><select class="in" data-smx="${s}" style="max-width:80px">${nOpts([1, 2, 3, 4]).map(([v, l]) => `<option value="${v}" ${String(c.maxDay ?? '') === String(v) ? 'selected' : ''}>${v === '' ? 'العام' : l}</option>`).join('')}</select></td>
          <td><select class="in" data-stm="${s}" style="max-width:120px">${times.map(([v, l]) => `<option value="${v}" ${(c.time || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
          <td><input type="checkbox" data-scr="${s}" ${isCore(s) ? 'checked' : ''} aria-label="${esc(sName(s))} مادة أساسية"></td>
          <td><select class="in" data-room="${s}" style="max-width:150px"><option value="">—</option>${P.rooms.map(r => `<option value="${r.id}" ${c.room === r.id ? 'selected' : ''}>${esc(r.name)}${+r.cap > 1 ? ` (${AR(r.cap)})` : ''}</option>`).join('')}</select></td>
          <td><div class="row" style="gap:3px;flex-wrap:nowrap">${Array.from({ length: sec.periods }, (_, p) => `<button class="pl-pp ${!al.size || al.has(p) ? 'on' : ''}" data-pp="${s}|${p}" aria-pressed="${!al.size || al.has(p)}" title="الحصة ${p + 1}">${AR(p + 1)}</button>`).join('')}</div></td>
          <td><button class="btn ghost sm" data-sdt="${s}">أوقات وأيام${nx ? ` (${AR(nx)})` : ''}</button></td></tr>`; }).join('')}</tbody></table></div>
        <div class="row" style="gap:6px;margin-top:8px"><button class="btn ghost sm" id="sjCp">نسخ قيود مادة إلى مواد أخرى</button></div>`;
      $$('[data-dbl]', B).forEach(x => x.onchange = () => { (P.subj[x.dataset.dbl] = P.subj[x.dataset.dbl] || {}).doubles = +x.value; touch(); });
      $$('[data-smx]', B).forEach(x => x.onchange = () => { (P.subj[x.dataset.smx] = P.subj[x.dataset.smx] || {}).maxDay = x.value === '' ? '' : +x.value; touch(); });
      $$('[data-stm]', B).forEach(x => x.onchange = () => { (P.subj[x.dataset.stm] = P.subj[x.dataset.stm] || {}).time = x.value; touch(); });
      $$('[data-scr]', B).forEach(x => x.onchange = () => { (P.subj[x.dataset.scr] = P.subj[x.dataset.scr] || {}).core = x.checked; touch(); });
      $$('[data-room]', B).forEach(x => x.onchange = () => { (P.subj[x.dataset.room] = P.subj[x.dataset.room] || {}).room = x.value; touch(); });
      $$('[data-pp]', B).forEach(b => b.onclick = () => { const [s, p] = b.dataset.pp.split('|'); const c = P.subj[s] = P.subj[s] || {}; let L = new Set(c.periods && c.periods.length ? c.periods : Array.from({ length: sec.periods }, (_, i) => i)); L.has(+p) ? L.delete(+p) : L.add(+p); c.periods = L.size === sec.periods ? [] : [...L].sort(); b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on')); touch(); });
      $$('[data-sdt]', B).forEach(b => b.onclick = () => subjSlots(b.dataset.sdt, redraw));
      $('#sjCp', B).onclick = () => { const it = subs.map(s => [s, sName(s)]); const m = A.modal(`<h3>نسخ قيود مادة</h3><div class="field"><label for="sjF">من المادة</label><select class="in" id="sjF">${it.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></div><div class="acts"><button class="btn" id="sjN">التالي</button></div>`);
        m.el.querySelector('#sjN').onclick = () => { const f = m.el.querySelector('#sjF').value; m.close(); copyDialog('نسخ قيود «' + sName(f) + '»', it, f, ids => { ids.forEach(s => P.subj[s] = JSON.parse(JSON.stringify(P.subj[f] || {}))); redraw(); }); }; };
    } else if (rs === 'teach') {
      if (!tids.length) { B.innerHTML = '<p class="small muted">عيّن المعلمين أولاً من تبويب «المعلمون».</p>'; return; }
      const lim = P.tlim[who] = P.tlim[who] || {}, ld = {}; secClasses().forEach(c => allSubs().forEach(s => { const t = T(c.id, s); if (t) ld[t] = (ld[t] || 0) + H(c.id, s); }));
      const getM = () => mapOf(P.blocks[who], lim.pref), setM = m => { const z = split2(m); P.blocks[who] = z.x; lim.pref = z.p; };
      const edge = [['', '—'], ['avoid', 'يتجنّبها'], ['prefer', 'يفضّلها']];
      B.innerHTML = `<b>قيود المعلم</b><div class="row" style="gap:8px;margin:8px 0;flex-wrap:wrap"><select class="in" id="rT" style="max-width:260px" aria-label="المعلم">${tids.map(t => `<option value="${t}" ${t === who ? 'selected' : ''}>${esc(A.personName(t))} (${AR(ld[t] || 0)})</option>`).join('')}</select>
          <button class="btn ghost sm" id="rCp">نسخ قيوده إلى معلمين آخرين</button><button class="btn ghost sm" id="rClr">مسح قيوده</button></div>
        <div class="row pl-fs" style="gap:10px;flex-wrap:wrap;margin-bottom:8px">
          <label class="small pl-f">النصاب الأسبوعي <input class="in" id="rQ" inputmode="numeric" style="max-width:70px" value="${lim.quota ?? ''}" placeholder="${AR(ld[who] || 0)}"></label>
          ${sel('rMx', nOpts([2, 3, 4, 5, 6, 7, 8]), lim.maxDay, 'أقصى حصص يومياً')}${sel('rMn', nOpts([1, 2, 3]), lim.minDay, 'أدنى حصص في يوم عمله')}
          ${sel('rGp', nOpts([0, 1, 2, 3, 4]), lim.maxGaps, 'أقصى فراغات يومياً')}${sel('rCs', nOpts([2, 3, 4, 5, 6]), lim.maxConsec, 'أقصى متتالية')}
          ${sel('rDy', nOpts(Array.from({ length: sec.days }, (_, i) => i + 1)), lim.maxDays, 'أقصى أيام عمل')}${sel('rLs', nOpts([0, 1, 2, 3, 4, 5]), lim.maxLast, 'أقصى حصص أخيرة أسبوعياً')}
          ${sel('rFi', edge, lim.first, 'الحصة الأولى')}${sel('rLa', edge, lim.last, 'الحصة الأخيرة')}</div>
        <div class="row" style="gap:10px;margin-bottom:8px;flex-wrap:wrap"><b class="small">أيام إجازته:</b>${Array.from({ length: sec.days }, (_, d) => `<label class="chk small"><input type="checkbox" data-tod="${d}" ${(lim.offDays || []).includes(d) ? 'checked' : ''}> ${dayLbl(d)}</label>`).join('')}</div>
        ${tri(getM(), 'tb', 'المعلم')}`;
      $('#rT', B).onchange = e => { A.LS.set('pl_bt', e.target.value); redraw(); };
      const num = v => v === '' ? '' : +v;
      [['rMx', 'maxDay'], ['rMn', 'minDay'], ['rGp', 'maxGaps'], ['rCs', 'maxConsec'], ['rDy', 'maxDays'], ['rLs', 'maxLast']].forEach(([id, k]) => $('#' + id, B).onchange = e => { lim[k] = num(e.target.value); touch(); });
      $('#rFi', B).onchange = e => { lim.first = e.target.value; touch(); }; $('#rLa', B).onchange = e => { lim.last = e.target.value; touch(); };
      $('#rQ', B).onchange = e => { const v = String(e.target.value).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim(); lim.quota = v === '' ? '' : Math.max(0, parseInt(v, 10) || 0); touch(); };
      $$('[data-tod]', B).forEach(x => x.onchange = () => { const L = new Set(lim.offDays || []); x.checked ? L.add(+x.dataset.tod) : L.delete(+x.dataset.tod); lim.offDays = [...L].sort(); touch(); });
      bindTri(B, 'tb', getM, setM, redraw);
      $('#rClr', B).onclick = () => { P.tlim[who] = {}; P.blocks[who] = []; touch(); redraw(); };
      $('#rCp', B).onclick = () => copyDialog('نسخ قيود ' + A.personName(who), tids.map(t => [t, A.personName(t)]), who, ids => { ids.forEach(t => { const q = (P.tlim[t] || {}).quota; P.tlim[t] = JSON.parse(JSON.stringify(lim)); P.tlim[t].quota = q; P.blocks[t] = (P.blocks[who] || []).slice(); }); redraw(); });
    } else if (rs === 'cls') {
      const getM = () => mapOf(P.classOff[cw], P.cpref[cw]), setM = m => { const z = split2(m); P.classOff[cw] = z.x; P.cpref[cw] = z.p; };
      B.innerHTML = `<b>أوقات الفصل</b><p class="small muted" style="margin:2px 0 8px"><b>×</b> وقت مغلق (نشاط، خروج مبكر، خارج دوام هذا الصف) لا تُجدول فيه أي مادة، و<b>✓</b> وقت مفضّل لحصص الفصل.</p>
        <div class="row" style="gap:8px;margin-bottom:8px"><select class="in" id="rC" style="max-width:240px" aria-label="الفصل">${secClasses().map(c => `<option value="${c.id}" ${c.id === cw ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select><button class="btn ghost sm" id="rCc">نسخ إلى فصول أخرى</button></div>${tri(getM(), 'cb', 'الفصل')}`;
      $('#rC', B).onchange = e => { A.LS.set('pl_bc', e.target.value); redraw(); };
      bindTri(B, 'cb', getM, setM, redraw);
      $('#rCc', B).onclick = () => copyDialog('نسخ أوقات ' + ((A.cls(cw) || {}).name || ''), secClasses().map(c => [c.id, c.name]), cw, ids => { ids.forEach(c => { P.classOff[c] = (P.classOff[cw] || []).slice(); P.cpref[c] = (P.cpref[cw] || []).slice(); }); redraw(); });
    } else if (rs === 'rooms') {
      B.innerHTML = `<b>القاعات والمعامل والصالات</b><p class="small muted" style="margin:2px 0 8px">أضف القاعات المشتركة (المعامل، المختبرات، الملاعب، الصالات)، وحدّد سعة كل منها (عدد الفصول في الوقت نفسه)، وأوقات إغلاقها، ثم اربط كل مادة بقاعتها من «المواد».</p>
        <div class="row" style="gap:8px;margin-bottom:8px;flex-wrap:wrap"><input class="in" id="rN" placeholder="اسم القاعة" style="max-width:220px"><input class="in" id="rK" placeholder="النوع (معمل، ملعب…)" style="max-width:160px"><label class="small">السعة <input class="in" id="rCap" inputmode="numeric" value="1" style="max-width:60px"></label><button class="btn sm" id="rAdd">${I.plus} إضافة</button></div>
        ${P.rooms.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>القاعة</th><th>النوع</th><th>السعة</th><th>المواد</th><th>الإغلاق</th><th></th></tr></thead><tbody>${P.rooms.map(r => `<tr><td><input class="in" data-rn="${r.id}" value="${esc(r.name)}" aria-label="اسم القاعة"></td><td><input class="in" data-rk="${r.id}" value="${esc(r.kind || '')}" style="max-width:130px" aria-label="النوع"></td>
          <td><select class="in" data-rc="${r.id}" style="max-width:70px">${[1, 2, 3, 4, 5, 6].map(n => `<option ${(+r.cap || 1) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></td>
          <td class="small">${esc(allSubs().filter(s => (P.subj[s] || {}).room === r.id).map(sName).join('، ') || '—')}</td>
          <td><button class="btn ghost sm" data-ro="${r.id}">أوقات الإغلاق${(r.off || []).length ? ` (${AR(r.off.length)})` : ''}</button></td><td><button class="btn bad sm" data-rr="${r.id}" aria-label="حذف القاعة">×</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted">لا توجد قاعات بعد.</p>'}`;
      $('#rAdd', B).onclick = () => { const n = $('#rN', B).value.trim(); if (!n) return; P.rooms.push({ id: uid(), name: n, kind: $('#rK', B).value.trim(), cap: Math.max(1, parseInt($('#rCap', B).value, 10) || 1) }); touch(); redraw(); };
      $$('[data-rn]', B).forEach(x => x.onchange = () => { const r = P.rooms.find(z => z.id === x.dataset.rn); r.name = x.value.trim() || r.name; touch(); });
      $$('[data-rk]', B).forEach(x => x.onchange = () => { P.rooms.find(z => z.id === x.dataset.rk).kind = x.value.trim(); touch(); });
      $$('[data-rc]', B).forEach(x => x.onchange = () => { P.rooms.find(z => z.id === x.dataset.rc).cap = +x.value; touch(); });
      $$('[data-ro]', B).forEach(b => b.onclick = () => { const r = P.rooms.find(z => z.id === b.dataset.ro); slotsDialog('أوقات إغلاق ' + r.name, new Set(r.off || []), v => { r.off = v; touch(); redraw(); }); });
      $$('[data-rr]', B).forEach(b => b.onclick = () => { P.rooms = P.rooms.filter(r => r.id !== b.dataset.rr); Object.values(P.subj).forEach(c => { if (c.room === b.dataset.rr) c.room = ''; }); touch(); redraw(); });
    } else if (rs === 'joint') {
      B.innerHTML = `<b>الحصص المشتركة والمتوازية</b><p class="small muted" style="margin:2px 0 8px"><b>مشتركة:</b> مادة واحدة لعدة فصول في الوقت نفسه (دمج فصلين، مسبح، نشاط). <b>متوازية:</b> فصول تدرس في الوقت نفسه مواد مختلفة (المسارات، الاختياري، تقسيم المجموعات). يمكن أن تكون بعض حصص المادة فقط مشتركة.</p>
        <div class="chip-filter" id="jM" style="margin:6px 0">${[['same', 'مشتركة (مادة واحدة)'], ['par', 'متوازية (مواد مختلفة)']].map(([k, l]) => `<button data-v="${k}" class="${(A.LS.get('pl_jm') || 'same') === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div id="jF"></div>
        ${P.joint.map(j => { const par = j.subs && Object.keys(j.subs).length; return `<div class="row" style="justify-content:space-between;border-top:1px dashed var(--border);padding:6px 0;gap:8px"><span><span class="pill ${par ? 'st-submitted' : 'st-approved'}">${par ? 'متوازية' : 'مشتركة'}</span> <b>${par ? esc(j.classes.map(c => `${(A.cls(c) || {}).name || ''}: ${sName(j.subs[c])}`).join(' | ')) : esc(sName(j.sid)) + ' <span class="small muted">· ' + esc(j.classes.map(c => (A.cls(c) || {}).name || '').join('، ')) + '</span>'}</b> <span class="small muted">${j.n ? `· ${AR(j.n)} حصص مشتركة` : '· كل الحصص'}</span></span><button class="btn bad sm" data-jr="${j.id}" aria-label="إلغاء الربط">×</button></div>`; }).join('') || '<p class="small muted">لا توجد حصص مشتركة أو متوازية.</p>'}`;
      $$('#jM button', B).forEach(b => b.onclick = () => { A.LS.set('pl_jm', b.dataset.v); redraw(); });
      const F = $('#jF', B), mode = A.LS.get('pl_jm') || 'same';
      if (mode === 'same') {
        F.innerHTML = `<div class="row" style="gap:8px;align-items:flex-start;flex-wrap:wrap"><select class="in" id="jS" style="max-width:200px" aria-label="المادة">${subs.map(s => `<option value="${s}">${esc(sName(s))}</option>`).join('')}</select><label class="small">عدد الحصص المشتركة <select class="in" id="jN" style="max-width:90px"><option value="">كلها</option>${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}">${AR(n)}</option>`).join('')}</select></label>
          <div class="perm-grid" id="jC" style="flex:1;min-width:240px">${secClasses().map(c => `<label class="chk small"><input type="checkbox" value="${c.id}"> ${esc(c.name)}</label>`).join('')}</div><button class="btn sm" id="jAdd">${I.plus} ربط</button></div>`;
        $('#jAdd', F).onclick = () => { const sid = $('#jS', F).value, n = +$('#jN', F).value || 0, cl = $$('#jC input:checked', F).map(i => i.value); if (cl.length < 2) { A.toast('اختر فصلين على الأقل', 'warn'); return; } const hs = cl.map(c => H(c, sid)); if (hs.some(h => !h)) { A.toast('المادة بلا حصص في بعض الفصول المختارة', 'warn'); return; } if (!n && new Set(hs).size > 1) { A.toast('عدد الحصص مختلف بين الفصول: حدّد «عدد الحصص المشتركة»', 'warn'); return; } if (n && hs.some(h => h < n)) { A.toast('العدد أكبر من حصص المادة في بعض الفصول', 'warn'); return; } P.joint.push({ id: uid(), sid, classes: cl, n: n || '' }); touch(); redraw(); };
      } else {
        F.innerHTML = `<div class="scroll"><table class="tbl"><thead><tr><th>الفصل</th><th>المادة في الوقت نفسه</th></tr></thead><tbody>${secClasses().map(c => `<tr><td><label class="chk small"><input type="checkbox" data-pc="${c.id}"> ${esc(c.name)}</label></td><td><select class="in" data-ps="${c.id}" style="max-width:220px"><option value="">—</option>${subs.filter(s => H(c.id, s)).map(s => `<option value="${s}">${esc(sName(s))} (${AR(H(c.id, s))})</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>
          <div class="row" style="gap:8px;margin-top:6px"><label class="small">عدد الحصص المتوازية <select class="in" id="jN2" style="max-width:90px">${[1, 2, 3, 4, 5, 6].map(n => `<option value="${n}">${AR(n)}</option>`).join('')}</select></label><button class="btn sm" id="jAdd2">${I.plus} ربط</button></div>`;
        $('#jAdd2', F).onclick = () => { const cl = $$('[data-pc]:checked', F).map(i => i.dataset.pc), n = +$('#jN2', F).value; if (cl.length < 2) { A.toast('اختر فصلين على الأقل', 'warn'); return; } const sb = {}; for (const c of cl) { const s = $(`[data-ps="${c}"]`, F).value; if (!s) { A.toast('اختر مادة لكل فصل محدد', 'warn'); return; } if (H(c, s) < n) { A.toast(`حصص ${sName(s)} أقل من ${AR(n)}`, 'warn'); return; } sb[c] = s; } P.joint.push({ id: uid(), sid: sb[cl[0]], classes: cl, n, subs: sb }); touch(); redraw(); };
      }
      $$('[data-jr]', B).forEach(b => b.onclick = () => { P.joint = P.joint.filter(j => j.id !== b.dataset.jr); touch(); redraw(); });
    } else {
      B.innerHTML = `<b>قواعد عامة</b>
        <div class="row pl-fs" style="gap:10px;flex-wrap:wrap;margin-top:8px">${sel('rM', [1, 2, 3, 4].map(n => [n, AR(n)]), P.maxDay || 2, 'أقصى حصص المادة يومياً')}${sel('rG', [0, 1, 2, 3].map(n => [n, AR(n)]), P.gapsDef ?? 1, 'فراغات المعلم المسموحة يومياً')}${sel('rC2', [2, 3, 4, 5, 6].map(n => [n, AR(n)]), P.consecDef ?? 4, 'أقصى حصص متتالية للمعلم')}${sel('rL', nOpts([1, 2, 3, 4, 5]), P.lastDef, 'أقصى حصص أخيرة للمعلم أسبوعياً')}</div>
        <div class="field" style="margin-top:8px"><label for="rCore">المواد الأساسية (تُفضَّل أول اليوم) — أسماء مفصولة بفاصلة</label><input class="in" id="rCore" value="${esc(P.coreList ?? DEFCORE)}"></div>
        <b class="small" style="display:block;margin-top:10px">خانات محجوزة لكل الفصول (اصطفاف، نشاط عام، اجتماع)</b>${(() => { const st = new Map((P.reserved || []).map(k => [k, 'x'])); return tri(st, 'rv', 'محجوزة'); })()}
        <p class="small muted">بعد التوليد: ثبّت أي حصة، أو انقلها لترى أثرها فوراً، ثم أعد توليد الفصول التي تختارها فقط — والمثبّت لا يتحرك.</p>`;
      $('#rM', B).onchange = e => { P.maxDay = +e.target.value; touch(); };
      $('#rG', B).onchange = e => { P.gapsDef = +e.target.value; touch(); };
      $('#rC2', B).onchange = e => { P.consecDef = +e.target.value; touch(); };
      $('#rL', B).onchange = e => { P.lastDef = e.target.value === '' ? '' : +e.target.value; touch(); };
      $('#rCore', B).onchange = e => { P.coreList = e.target.value; touch(); };
      bindTri(B, 'rv', () => new Map((P.reserved || []).map(k => [k, 'x'])), m => { P.reserved = [...m].filter(([, v]) => v).map(([k]) => k); }, redraw);
    }
  }
  function slotsDialog(title, cur, onSave) {
    const st = new Map([...cur].map(k => [k, 'x'])); const m = A.modal(`<h3>${esc(title)}</h3><div id="sdG"></div><div class="acts"><button class="btn" id="sdS">حفظ</button></div>`, { cls: 'wide' });
    const draw = () => { m.el.querySelector('#sdG').innerHTML = tri(st, 'sd', ''); bindTri(m.el, 'sd', () => st, z => { [...z].forEach(([k, v]) => { if (v === 'p') z.delete(k); }); }, draw); };
    draw(); m.el.querySelector('#sdS').onclick = () => { onSave([...st.keys()]); m.close(); };
  }
  function subjSlots(s, redraw) {
    const sec = A.section(), c = P.subj[s] = P.subj[s] || {}; const st = mapOf(c.off, c.pref);
    const m = A.modal(`<h3>أوقات «${esc(sName(s))}»</h3><div class="row" style="gap:10px;margin-bottom:8px;flex-wrap:wrap"><b class="small">أيام ممنوعة:</b>${Array.from({ length: sec.days }, (_, d) => `<label class="chk small"><input type="checkbox" data-sod="${d}" ${(c.offDays || []).includes(d) ? 'checked' : ''}> ${dayLbl(d)}</label>`).join('')}</div><div id="ssG"></div><div class="acts"><button class="btn" id="ssS">حفظ</button></div>`, { cls: 'wide' });
    const draw = () => { m.el.querySelector('#ssG').innerHTML = tri(st, 'ss', ''); bindTri(m.el, 'ss', () => st, () => { }, draw); };
    draw();
    m.el.querySelector('#ssS').onclick = () => { const z = split2(st); c.off = z.x; c.pref = z.p; c.offDays = [...m.el.querySelectorAll('[data-sod]:checked')].map(i => +i.dataset.sod); touch(); m.close(); redraw(); };
  }
  // ---------- الأحمال ----------
  function tLoad(box) {
    const L = {}; secClasses().forEach(c => allSubs().forEach(s => { const t = T(c.id, s), h = H(c.id, s); if (!h) return; const k = t || '—'; const r = L[k] = L[k] || { n: 0, items: [] }; r.n += h; r.items.push(`${sName(s)} ${c.name} (${AR(h)})`); }));
    const c0 = cap(), rows = Object.entries(L).sort((a, b) => b[1].n - a[1].n);
    box.innerHTML = rows.length ? `<div class="scroll" style="margin-top:12px"><table class="tbl"><thead><tr><th>المعلم</th><th>الحصص الأسبوعية</th><th>التفاصيل</th></tr></thead><tbody>${rows.map(([t, r]) => `<tr><td><b>${t === '—' ? '<span style="color:var(--bad)">بلا معلم</span>' : esc(A.personName(t))}</b></td><td><span class="pill ${r.n > c0 ? 'st-returned' : r.n > 24 ? 'st-submitted' : 'st-approved'}">${AR(r.n)}</span></td><td class="small">${esc(r.items.join('، '))}</td></tr>`).join('')}</tbody></table></div><p class="small muted">أكثر من ${AR(c0)} حصة لمعلم واحد يستحيل جدولته؛ وأكثر من ٢٤ حمل مرتفع.</p>` : A.emptyBox('لا توجد حصص بعد');
  }

  // ---------- المحرّك الموحّد DinaTT ----------
  // انشغال المعلم المشترك في الأقسام الأخرى (من جداولها المعتمدة) — يُمنع التعارض بين الأقسام
  let EXT = {};
  async function loadExt() {
    EXT = {}; const secs = (S.allSections || S.sections || []).filter(x => x.id !== S.sectionId);
    for (const sc of secs) { let sl = []; try { sl = await api.approvedSlots(sc.id); } catch (_) {} sl.forEach(x => { if (x.teacher_id) (EXT[x.teacher_id] = EXT[x.teacher_id] || {})[x.day + '-' + x.period] = sc.name; }); }
    return EXT;
  }
  function toX(extra) {
    ens(); const sec = A.section(), cls = secClasses().filter(c => rowTot(c.id)), subs = new Set(allSubs());
    const N = sec.days * sec.periods, res = (P.reserved || []).length;
    const over = cls.filter(c => rowTot(c.id) + new Set([...(P.classOff[c.id] || []), ...(P.reserved || [])]).size > N);
    if (over.length) throw new Error('حصص أكثر من سعة الأسبوع (مع الأوقات المغلقة' + (res ? ' والمحجوزة' : '') + ') في: ' + over.map(c => c.name).join('، '));
    const rules = JSON.parse(JSON.stringify(P.rules || {}));
    if (!rules.adj && !P.noDouble) rules.adj = { lv: 'o' };
    if (!rules.emptyLast && P.emptyLast === false) rules.emptyLast = { lv: 'o' };
    const coreN = (P.coreList ?? DEFCORE).split(/[،,]/).map(x => A.normKey(x.trim())).filter(Boolean);
    const subj = {}; subs.forEach(s => { const c = Object.assign({}, P.subj[s] || {}); if (c.core === undefined) c.core = coreN.some(n => A.normKey(sName(s)).includes(n)); subj[s] = c; });
    const hours = {}; cls.forEach(c => { hours[c.id] = {}; Object.entries(P.hours[c.id] || {}).forEach(([s, h]) => { if (subs.has(s) && +h) hours[c.id][s] = +h; }); });
    const joint = (P.joint || []).map(j => Object.assign({}, j, { classes: j.classes.filter(c => cls.some(x => x.id === c)) })).filter(j => j.classes.length > 1);
    return Object.assign({ D: sec.days, Pn: sec.periods, cls: cls.map(c => ({ id: c.id, name: c.name })), hours, teachers: P.teachers, locks: P.locks, subj, blocks: P.blocks, tlim: P.tlim, classOff: P.classOff, cpref: P.cpref, reserved: P.reserved,
      rooms: P.rooms, joint, maxDay: P.maxDay || 2, gapsDef: P.gapsDef ?? 1, consecDef: P.consecDef ?? 4, lastDef: P.lastDef, rules, ext: EXT, nm: { s: sName, t: t => A.personName(t), days: A.DAYS } }, extra || {});
  }
  const QT = { q: [1800, 1, 'سريع'], n: [5000, 2, 'متوازن'], d: [12000, 3, 'دقيق'], x: [30000, 4, 'أقصى دقة (أبطأ)'] };
  let RUN = null;
  async function runGen(out, root, extra, label) {
    if (!TT()) { A.toast('محرك القيود لم يُحمَّل — حدّث الصفحة', 'err'); return; }
    if (dirty) await save(true); await loadExt();
    const q = QT[P.gq || 'n'] || QT.n; let X; try { X = toX(extra); } catch (e) { A.toast(e.message, 'err'); return; }
    out.innerHTML = `<div class="tt-prog" role="status" aria-live="polite"><div class="row" style="justify-content:space-between;gap:8px"><b id="gpL">يوزّع الحصص ويطبّق القيود الإلزامية…</b><button class="btn ghost sm" id="gpS">إيقاف واعتماد الأفضل</button></div><div class="tt-bar"><i id="gpB" style="width:2%"></i></div><p class="small muted" id="gpC" style="margin:4px 0 0">${esc(label || 'توليد كامل')} · الدقة: ${q[2]}</p></div>`;
    RUN = { stop: false }; const me = RUN; $('#gpS', out).onclick = () => { me.stop = true; };
    let R; try {
      R = await TT().solve(X, { time: q[0], restarts: q[1], stop: () => me.stop, onStep: (f, c) => { const b = $('#gpB', out), l = $('#gpL', out); if (b) b.style.width = Math.max(2, Math.round(f * 100)) + '%'; if (l && c !== null && c !== undefined) l.textContent = c < 0.01 ? 'وُجد جدول يحقق كل القيود…' : c >= 100 ? 'يعالج القيود الإلزامية…' : 'يحسّن القيود التفضيلية…'; } });
    } catch (e) { out.innerHTML = `<div class="notice bad">${esc(e.message)}</div>`; return; }
    RUN = null; lastGen = R; LAST = null; pick = null; logIt(`${label || 'توليد كامل'}: الجودة ${R.report.score}، إلزامية ${R.report.hard}`); touch(); const bx = out.closest('#plB'); if (bx) tGen(bx, root); else showGen(out, root);
  }
  const startGrid = () => { const st = {}; lastGen.cls.forEach((c, i) => st[c.id] = lastGen.grid[i].slice()); return st; };
  function tGen(box, root) {
    ens(); const cls = secClasses().filter(c => rowTot(c.id)); const miss = []; cls.forEach(c => allSubs().forEach(s => { if (H(c.id, s) && !T(c.id, s)) miss.push(1); }));
    const ld = {}; cls.forEach(c => allSubs().forEach(s => { const t = T(c.id, s); if (t) ld[t] = (ld[t] || 0) + H(c.id, s); }));
    const heavy = Object.entries(ld).filter(([, n]) => n > cap());
    const nl = Object.values(P.locks).reduce((a, m) => a + Object.keys(m).length, 0);
    let pre = []; try { const R = TT() && TT().RULES; pre = R ? Object.keys(R).filter(k => TT().isHard({ rules: P.rules }, k)).map(k => R[k][0]) : []; } catch (_) { }
    box.innerHTML = `<div class="sec-box" style="margin-top:12px"><div class="row" style="justify-content:space-between;gap:10px;flex-wrap:wrap"><div class="grow"><b>توليد جدول ${AR(cls.length)} فصلاً من التوزيع</b>
        <p class="small muted" style="margin:4px 0 0">المحرك يطبّق القيود الإلزامية أولاً (${esc(pre.join('، '))}) ثم يحسّن التفضيلية حسب أوزانها${nl ? `، و${AR(nl)} حصة مثبّتة لا تتحرك` : ''}. غيّر قوة أي قيد من «القيود ← قوة القيود والأوزان».${miss.length ? ` <b style="color:#b54708">${AR(miss.length)} خلية بلا معلم.</b>` : ''}</p></div>
        <div class="row" style="gap:6px;flex-wrap:wrap"><select class="in" id="gQ" aria-label="دقة التوليد" style="max-width:170px">${Object.entries(QT).map(([v, x]) => `<option value="${v}" ${(P.gq || 'n') === v ? 'selected' : ''}>${x[2]}</option>`).join('')}</select><button class="btn sky" id="gGo">توليد كامل</button>
          ${lastGen ? `<button class="btn ghost sm" id="gPart">إعادة توليد فصول محددة</button><button class="btn ghost sm" id="gImp">تحسين الجدول الحالي</button>` : ''}</div></div>
      ${heavy.length ? `<div class="notice bad" style="margin-top:10px">لا يمكن جدولة معلم بأكثر من ${AR(cap())} حصة أسبوعياً: ${heavy.map(([t, n]) => `${esc(A.personName(t))} (${AR(n)})`).join('، ')}</div>` : ''}<div id="gOut"></div></div>`;
    const out = $('#gOut', box);
    $('#gQ', box).onchange = e => { P.gq = e.target.value; touch(); };
    if (lastGen) showGen(out, root);
    $('#gGo', box).onclick = e => A.run(e.currentTarget, () => runGen(out, root, null, 'توليد كامل'));
    const gi = $('#gImp', box); if (gi) gi.onclick = e => A.run(e.currentTarget, () => runGen(out, root, { start: startGrid(), warm: true }, 'تحسين الجدول الحالي'));
    const gp = $('#gPart', box); if (gp) gp.onclick = () => {
      const m = A.modal(`<h3>إعادة توليد جزء من الجدول</h3><p class="small muted">تبقى الفصول غير المحددة كما هي تماماً (بحصصها ومواعيدها)، ويُعاد توزيع المحددة فقط مع مراعاة معلميها في بقية الجدول.</p>
        <div class="row" style="gap:6px;margin-bottom:6px;flex-wrap:wrap"><button class="btn ghost sm" id="ppA">الكل</button><button class="btn ghost sm" id="ppN">لا شيء</button><button class="btn ghost sm" id="ppBad">الفصول التي فيها مخالفات</button>
          <select class="in" id="ppT" style="max-width:220px" aria-label="فصول معلم"><option value="">فصول معلم…</option>${tidsOf().map(t => `<option value="${t}">${esc(A.personName(t))}</option>`).join('')}</select></div>
        <div class="perm-grid" style="max-height:46vh;overflow:auto">${lastGen.cls.map(c => `<label class="chk small"><input type="checkbox" value="${c.id}"> ${esc(c.name)}</label>`).join('')}</div>
        <div class="acts"><button class="btn sky" id="ppGo">إعادة توليد المحدد</button></div>`);
      const ins = () => [...m.el.querySelectorAll('.perm-grid input')];
      m.el.querySelector('#ppA').onclick = () => ins().forEach(i => i.checked = true); m.el.querySelector('#ppN').onclick = () => ins().forEach(i => i.checked = false);
      m.el.querySelector('#ppBad').onclick = () => { const M = lastGen.M; ins().forEach(i => { const g2 = lastGen.cls.findIndex(c => c.id === i.value); const bad = M.cc[g2] > 0.5 || M.cards.some(cd => cd.gi === g2 && cd.t && M.tc[cd.t] >= 100); i.checked = bad; }); };
      m.el.querySelector('#ppT').onchange = e => { const t = e.target.value; if (!t) return; ins().forEach(i => { if (allSubs().some(s => T(i.value, s) === t && H(i.value, s))) i.checked = true; }); };
      m.el.querySelector('#ppGo').onclick = () => { const on = new Set(ins().filter(i => i.checked).map(i => i.value)); if (!on.size) { A.toast('اختر فصلاً واحداً على الأقل', 'warn'); return; } m.close(); runGen(out, root, { start: startGrid(), keep: lastGen.cls.filter(c => !on.has(c.id)).map(c => c.id) }, `إعادة توليد ${on.size} فصل`); };
    };
  }
  let pick = null, LAST = null;
  const altTag = dl => dl < -0.05 ? ['يحسّن', 'ok', '▲'] : dl <= 0.05 ? ['بلا أثر', '', '='] : dl < 100 ? [dl <= 3 ? 'أسوأ قليلاً' : 'أسوأ', 'bad', '▼'] : ['يخالف قيداً إلزامياً', 'bad', '⛔'];
  const ruleName = k => ((TT() && TT().RULES[k]) || [k])[0];
  function impactHtml(sw) {
    const a = sw.before, b = sw.after, ch = [];
    Object.keys(b.byRule).forEach(k => { const x = (a.byRule[k] || {}).n || 0, y = (b.byRule[k] || {}).n || 0; if (Math.abs(x - y) > 0.05) ch.push(`<li>${esc(ruleName(k))}: ${AR(Math.round(x * 10) / 10)} ← ${AR(Math.round(y * 10) / 10)} ${y < x ? '<b style="color:#2E8B57">تحسّن</b>' : '<b style="color:#b42318">زاد</b>'}</li>`); });
    return `<div class="notice ${b.hard > a.hard ? 'bad' : b.score >= a.score ? 'ok' : 'warn'} tt-imp"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><b>أثر التعديل: الجودة ${AR(a.score)} ← ${AR(b.score)} · الإلزامية ${AR(a.hard)} ← ${AR(b.hard)}${sw.classes.length > 1 ? ` · نُقلت معها الحصة المشتركة في ${AR(sw.classes.length - 1)} فصل` : ''}</b><button class="btn ghost sm" id="gUndo">تراجع</button></div>${ch.length ? `<ul class="small" style="margin:6px 0 0">${ch.join('')}</ul>` : '<p class="small" style="margin:4px 0 0">لا تغيير في القيود.</p>'}</div>`;
  }
  function showGen(out, root) {
    const g = lastGen, rep = g.report; let view = A.LS.get('pl_gv') || 'class';
    const tids = [...new Set(g.grid.flatMap((r, gi) => r.map(s => g.tch(gi, s)).filter(Boolean)))];
    let sel = A.LS.get(view === 'class' ? 'pl_gc' : 'pl_gt'); const opts = view === 'class' ? g.cls.map(c => [c.id, c.name]) : tids.map(t => [t, A.personName(t)]);
    if (!opts.some(o => o[0] === sel)) sel = (opts[0] || [])[0];
    const gi = g.cls.findIndex(c => c.id === sel);
    let alts = null; if (view === 'class' && pick && pick.gi === gi) { alts = new Map(g.alts(gi, pick.k).map(x => [x.k, x])); }
    const cell = (d, p) => { const k = d * g.Pn + p;
      if (view === 'class') { const s = g.grid[gi][k], t = g.tch(gi, s), lk = (P.locks[sel] || {})[d + '-' + p], cd = g.cards[g.cid[gi][k]], fx = g.fixed[gi][k] && !lk;
        const al = alts && alts.get(k), dl = al ? al.delta : null, cls2 = al ? (dl < -0.05 ? 'alt-good' : dl <= 2.5 ? 'alt-ok' : dl < 100 ? 'alt-warn' : 'alt-bad') : '';
        return `<td class="pl-gc ${pick && pick.k === k && pick.gi === gi ? 'pick' : ''} ${lk ? 'lk' : ''} ${fx ? 'fx' : ''} ${cls2}" data-k="${k}" tabindex="0" ${al ? `title="${altTag(dl)[0]}"` : ''}>${s ? `<b>${esc(sName(s))}</b>${cd && cd.len === 2 ? ' <span class="pill st-empty">مزدوجة</span>' : ''}${cd && cd.j ? ` <span class="pill st-submitted">${(P.joint.find(j => cd.j.startsWith(j.id)) || {}).subs ? 'متوازية' : 'مشتركة'}</span>` : ''}${t ? `<div class="small muted">${esc(A.personName(t))}</div>` : ''}` : `<span class="faint">${fx ? 'مغلقة' : '—'}</span>`}${lk ? '<div class="small" style="color:var(--blue)">مثبّتة</div>' : ''}${al && Math.abs(dl) > 0.05 ? `<span class="alt-d" aria-hidden="true">${altTag(dl)[2]}</span>` : ''}</td>`; }
      const L = g.cls.map((c, i) => [c, g.grid[i][k], i]).filter(([c, s, i]) => s && g.tch(i, s) === sel); return `<td class="${L.length > 1 && new Set(L.map(([, , i]) => (g.cards[g.cid[i][k]] || {}).unit)).size > 1 ? 'tt-clash' : ''}">${L.map(([c, s]) => `<b>${esc(sName(s))}</b><div class="small muted">${esc(c.name)}</div>`).join('') || '<span class="faint">—</span>'}</td>`; };
    const pc = rep.score >= 85 ? '#2E8B57' : rep.score >= 60 ? '#b54708' : '#b42318';
    const ruleRows = Object.entries(rep.byRule).filter(([, r]) => r.n && r.lv !== 'o').sort((a, b) => (b[1].lv === 'h') - (a[1].lv === 'h') || b[1].n - a[1].n);
    const altList = alts ? [...alts.values()].filter(x => x.delta < 100).slice(0, 6) : [];
    out.innerHTML = `<div class="tt-sum"><div class="tt-g" style="--p:${rep.score};--c:${pc}"><b>${AR(rep.score)}</b><span>من ١٠٠</span></div><div class="grow">
        <div class="notice ${rep.hard ? 'bad' : 'ok'}" style="margin:0 0 8px">${rep.hard ? `<b>لم يكتمل الجدول: ${AR(rep.hard)} مخالفة لقيود إلزامية.</b> أعد التوليد بدقة أعلى، أو ثبّت/انقل يدوياً، أو خفّف قوة القيد.` : `<b>تم إنشاء الجدول بنجاح</b> — لا مخالفة لأي قيد إلزامي${rep.soft ? `، و${AR(Math.round(rep.soft))} ملاحظة تفضيلية` : ' ويحقق كل القيود'}.`}</div>
        <div class="tt-kp">${[['اكتمال الخطة', rep.idx.complete + '٪'], ['عدالة الأنصبة', rep.idx.fair + '٪'], ['قلة الفراغات', rep.idx.gaps + '٪'], ['استغلال القاعات', rep.idx.rooms === null ? '—' : rep.idx.rooms + '٪'], ['الحصص الموزعة', AR(rep.placed) + ' / ' + AR(rep.req)]].map(([l, v]) => `<div><span>${l}</span><b>${typeof v === 'string' ? v.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : v}</b></div>`).join('')}</div></div></div>
      ${ruleRows.length ? `<details class="tt-rules" ${rep.hard ? 'open' : ''}><summary><b>تفاصيل المخالفات حسب القيد (${AR(ruleRows.length)})</b></summary>${ruleRows.map(([k, r]) => `<details class="tt-rule"><summary><span class="pill ${r.lv === 'h' ? 'st-returned' : r.lv === 's' ? 'st-submitted' : 'st-empty'}">${TT().LVN[r.lv]}</span> ${esc(ruleName(k))} <b>(${AR(Math.round(r.n * 10) / 10)})</b></summary><ul class="small">${r.items.slice(0, 30).map(x => `<li>${esc(x)}</li>`).join('')}${r.items.length > 30 ? `<li class="muted">و${AR(r.items.length - 30)} أخرى…</li>` : ''}</ul></details>`).join('')}<p class="small muted" style="margin:6px 0 0"><button class="btn ghost sm" id="gPow">تعديل قوة القيود</button> <button class="btn ghost sm" id="gRep">التقارير والتحليلات</button></p></details>` : ''}
      <div id="gImpct">${LAST ? impactHtml(LAST) : ''}</div>
      <div class="row" style="gap:8px;margin:10px 0;flex-wrap:wrap"><div class="chip-filter" id="gV" style="margin:0">${[['class', 'حسب الفصل'], ['teacher', 'حسب المعلم']].map(([k, l]) => `<button data-v="${k}" class="${view === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <select class="in" id="gC" style="max-width:220px" aria-label="اختيار">${opts.map(([v, l]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select><div class="grow"></div>
        <button class="btn ghost sm" id="gRe">إعادة التوليد (المثبّت يبقى)</button><button class="btn sky sm" id="gSave">إنشاء مسودة جدول</button></div>
      ${view === 'class' ? `<p class="small muted" style="margin:0 0 6px">${pick ? '<b>اختر الخانة التي تنقل إليها الحصة.</b> الألوان تبيّن الأثر قبل النقل: الأخضر يحسّن الجدول، والأحمر يزيد المخالفات.' : 'اضغط حصة لترى أفضل الأماكن البديلة لها وأثر نقلها فوراً على كل الجدول.'}</p>` : ''}
      ${pick && view === 'class' ? `<div class="tt-alt row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px"><b class="small">أفضل البدائل:</b>${altList.map(x => `<button class="btn ghost sm" data-go="${x.k}">${dayLbl(Math.floor(x.k / g.Pn))} ح${AR(x.k % g.Pn + 1)} <span class="${altTag(x.delta)[1]}">${altTag(x.delta)[0]}</span></button>`).join('') || '<span class="small muted">لا توجد بدائل ممكنة (مزدوجة/مثبّتة/أوقات مغلقة)</span>'}<div class="grow"></div><button class="btn ghost sm" id="gLock">${(P.locks[sel] || {})[Math.floor(pick.k / g.Pn) + '-' + pick.k % g.Pn] ? 'إلغاء التثبيت' : 'تثبيت هذه الحصة'}</button><button class="btn ghost sm" id="gCan">إلغاء</button></div>` : ''}
      <div class="scroll"><table class="tbl pl-gt"><thead><tr><th></th>${Array.from({ length: g.Pn }, (_, p) => `<th>${AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: g.D }, (_, d) => `<tr><th>${dayLbl(d)}</th>${Array.from({ length: g.Pn }, (_, p) => cell(d, p)).join('')}</tr>`).join('')}</tbody></table></div>`;
    $$('#gV button', out).forEach(b => b.onclick = () => { A.LS.set('pl_gv', b.dataset.v); pick = null; showGen(out, root); });
    $('#gC', out).onchange = e => { A.LS.set(view === 'class' ? 'pl_gc' : 'pl_gt', e.target.value); pick = null; showGen(out, root); };
    const pw = $('#gPow', out); if (pw) pw.onclick = () => { A.LS.set('pl_rs', 'power'); tab = 'rules'; V.plan(root); };
    const rp = $('#gRep', out); if (rp) rp.onclick = () => { tab = 'rep'; V.plan(root); };
    const un = $('#gUndo', out); if (un) un.onclick = () => { if (LAST) { LAST.undo(); logIt('تراجع عن نقل حصة'); LAST = null; touch(); showGen(out, root); } };
    const doMove = (k) => { const a = pick.k; pick = null; const sw = g.swap(gi, a, k); if (!sw) { A.toast('لا يمكن هذا النقل (حصة مزدوجة أو مشتركة لا تتسع، أو خانة مثبّتة/مغلقة)', 'warn'); showGen(out, root); return; }
      LAST = sw; logIt(`نقل ${sName(g.grid[gi][k]) || 'فراغ'} (${g.cls[gi].name}) من ${dayLbl(Math.floor(a / g.Pn))} ح${a % g.Pn + 1} إلى ${dayLbl(Math.floor(k / g.Pn))} ح${k % g.Pn + 1}`); touch(); showGen(out, root); };
    $$('[data-go]', out).forEach(b => b.onclick = () => doMove(+b.dataset.go));
    const gc = $('#gCan', out); if (gc) gc.onclick = () => { pick = null; showGen(out, root); };
    const gl = $('#gLock', out); if (gl) gl.onclick = () => { const k = pick.k, dk = Math.floor(k / g.Pn) + '-' + k % g.Pn; ens(); const m = P.locks[sel] = P.locks[sel] || {}; const s = g.grid[gi][k]; if (m[dk]) { delete m[dk]; g.lock(gi, k, false); } else if (s) { m[dk] = s; g.lock(gi, k, true); } pick = null; touch(); showGen(out, root); };
    $$('.pl-gc', out).forEach(td => { const go = () => { const k = +td.dataset.k; if (!pick) { if (g.fixed[gi][k] && !(P.locks[sel] || {})[Math.floor(k / g.Pn) + '-' + k % g.Pn]) return; pick = { k, gi }; LAST = null; showGen(out, root); return; } if (pick.k === k) { pick = null; showGen(out, root); return; } doMove(k); };
      td.onclick = go; td.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; });
    $('#gRe', out).onclick = e => A.run(e.currentTarget, () => { LAST = null; pick = null; return runGen(out, root, null, 'إعادة التوليد'); });
    $('#gSave', out).onclick = e => A.run(e.currentTarget, async () => {
      if (g.report.hard && !(await A.confirmBox(`في الجدول ${AR(g.report.hard)} مخالفة لقيود إلزامية. إنشاء المسودة على أي حال؟`, 'إنشاء المسودة'))) return;
      const v = await api.createDraft({ section_id: S.sectionId, label: 'من توزيع الحصص — ' + new Date().toLocaleDateString('ar-SA-u-nu-latn') + ` (جودة ${g.report.score})`, source: 'توزيع الحصص', created_by: S.me.id });
      const vs = await api.ttVersions(S.sectionId), ap = vs.find(x => x.status === 'approved'), ids = new Set(g.cls.map(x => x.id));
      if (ap) { const sl = (await api.ttSlots(ap.id)).filter(x => !ids.has(x.class_id)); if (sl.length) await api.replaceSlots(v.id, sl.map(({ class_id, day, period, subject_id, teacher_id }) => ({ class_id, day, period, subject_id, teacher_id }))); }
      const rows = []; g.cls.forEach((x, i) => g.grid[i].forEach((s, k) => rows.push({ class_id: x.id, day: Math.floor(k / g.Pn), period: k % g.Pn, subject_id: s || null, teacher_id: g.tch(i, s) || null })));
      for (let i = 0; i < rows.length; i += 400) await api.upsertSlots(v.id, rows.slice(i, i + 400));
      logIt(`إنشاء مسودة جدول (جودة ${g.report.score}، إلزامية ${g.report.hard})`); await save(true);
      A.LS.set('tttab', 'drafts'); A.toast('أُنشئت مسودة الجدول — راجعها وعدّل ما تريد ثم اعتمدها', 'ok'); location.hash = '#/timetable';
    });
  }
  // ---------- التقارير والتحليلات ----------
  const pct = v => (v === null || v === undefined) ? '—' : AR(v) + '٪';
  function repData() {
    ens(); const g = lastGen, rep = g && g.report, cls = secClasses().filter(c => rowTot(c.id)), c0 = cap();
    const asg = {}; cls.forEach(c => allSubs().forEach(s => { const t = T(c.id, s), h = H(c.id, s); if (!h) return; const k = t || '—'; const r = asg[k] = asg[k] || { n: 0, cls: new Set(), subs: new Set(), items: [] }; r.n += h; r.cls.add(c.id); r.subs.add(s); r.items.push(`${sName(s)} ${c.name} (${AR(h)})`); }));
    const teachers = Object.entries(asg).filter(([t]) => t !== '—').map(([t, r]) => { const q = (P.tlim[t] || {}).quota, x = rep && rep.teachers[t];
      return { t, name: A.personName(t), quota: q === '' || q === undefined ? null : +q, asg: r.n, placed: x ? x.load : null, diff: q === '' || q === undefined ? null : r.n - (+q), cls: r.cls.size, subs: r.subs.size, items: r.items, days: x ? x.days : null, first: x ? x.first : null, last: x ? x.last : null, gaps: x ? x.gaps : null, run: x ? x.maxRun : null, work: x ? x.workDays : null, util: q ? Math.round(100 * r.n / q) : null }; }).sort((a, b) => b.asg - a.asg);
    const noT = asg['—'] ? asg['—'] : null;
    const classes = cls.map(c => { const gi = g ? g.cls.findIndex(x => x.id === c.id) : -1; const req = rowTot(c.id);
      const subs = allSubs().filter(s => H(c.id, s)).map(s => { let placed = null, days = null, maxD = null; if (gi >= 0) { const per = new Array(g.D).fill(0); g.grid[gi].forEach((x, k) => { if (x === s) per[Math.floor(k / g.Pn)]++; }); placed = per.reduce((a, b) => a + b, 0); days = per.filter(Boolean).length; maxD = Math.max(...per); } return { s, name: sName(s), req: H(c.id, s), placed, days, maxD, t: T(c.id, s) }; });
      let placed = null, perDay = null, holes = null; if (gi >= 0) { perDay = Array.from({ length: g.D }, (_, d) => g.grid[gi].slice(d * g.Pn, (d + 1) * g.Pn).filter(Boolean).length); placed = perDay.reduce((a, b) => a + b, 0); holes = 0; for (let d = 0; d < g.D; d++) { const r = g.grid[gi].slice(d * g.Pn, (d + 1) * g.Pn); const lastF = r.map(Boolean).lastIndexOf(true); holes += r.slice(0, lastF + 1).filter(x => !x).length; } }
      return { c, req, cap: c0, placed, perDay, holes, subs }; });
    return { g, rep, teachers, noT, classes, c0 };
  }
  function tRep(box, root) {
    const Dt = repData(), { g, rep } = Dt; let rt = A.LS.get('pl_rt') || 'sum';
    const tabs = [['sum', 'لوحة المؤشرات'], ['teach', 'تقارير المعلمين'], ['cls', 'الفصول والمواد'], ['adm', 'تقارير الإدارة'], ['log', 'سجل التغييرات']];
    box.innerHTML = `<div class="row" style="justify-content:space-between;gap:8px;margin-top:12px;flex-wrap:wrap"><div class="chip-filter" id="rpT" style="margin:0">${tabs.map(([k, l]) => `<button data-v="${k}" class="${rt === k ? 'on' : ''}">${l}</button>`).join('')}</div><div class="row" style="gap:6px"><button class="btn ghost sm" id="rpP">طباعة</button><button class="btn ghost sm" id="rpX">${I.down} Excel</button></div></div>
      ${g ? '' : '<div class="notice warn" style="margin-top:10px">تقارير الأنصبة والخطة جاهزة من التوزيع. ولّد الجدول من «توليد الجدول» لتظهر تقارير التوزيع اليومي والتعارضات والقاعات والمؤشرات.</div>'}<div id="rpB" style="margin-top:10px"></div>`;
    $$('#rpT button', box).forEach(b => b.onclick = () => { A.LS.set('pl_rt', b.dataset.v); tRep(box, root); });
    const B = $('#rpB', box); const blocks = []; // [title, html, aoa]
    const tbl = (head, rows) => `<div class="scroll"><table class="tbl pl-rp"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(x => `<td>${x === null || x === undefined ? '—' : x}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${head.length}" class="muted">لا توجد بيانات</td></tr>`}</tbody></table></div>`;
    const add = (title, head, rows, note) => { blocks.push([title, head, rows]); return `<h4 class="pl-rh">${esc(title)}</h4>${note ? `<p class="small muted" style="margin:0 0 6px">${note}</p>` : ''}${tbl(head, rows)}`; };
    const st = (v, good) => v === null ? '—' : `<span class="pill ${good ? 'st-approved' : 'st-returned'}">${typeof v === 'number' ? AR(v) : v}</span>`;
    let html = '';
    if (rt === 'sum') {
      const T2 = Dt.teachers, tot = T2.reduce((a, x) => a + x.asg, 0), withQ = T2.filter(x => x.quota !== null), def = withQ.filter(x => x.diff < 0), sur = withQ.filter(x => x.diff > 0);
      const req = Dt.classes.reduce((a, x) => a + x.req, 0);
      const kp = [['مؤشر كفاءة الجدول', rep ? AR(rep.score) + ' / ١٠٠' : '—'], ['المخالفات الإلزامية', rep ? AR(rep.hard) : '—'], ['اكتمال الخطة', rep ? pct(rep.idx.complete) : '—'], ['عدالة الأنصبة', rep ? pct(rep.idx.fair) : '—'], ['مؤشر الفراغات (قلّتها)', rep ? pct(rep.idx.gaps) : '—'], ['استغلال القاعات', rep ? pct(rep.idx.rooms) : '—'],
        ['استقرار الجدول (تعديلات بعد التوليد)', AR((P.log || []).filter(l => /^نقل/.test(l.what)).length)], ['الحصص المطلوبة', AR(req)], ['حصص بلا معلم', AR(Dt.noT ? Dt.noT.n : 0)], ['معلمون بعجز في النصاب', withQ.length ? AR(def.length) : '—'], ['معلمون بزيادة على النصاب', withQ.length ? AR(sur.length) : '—'], ['عدد المعلمين', AR(T2.length)]];
      html = `<div class="tt-kp tt-kp2">${kp.map(([l, v]) => `<div><span>${l}</span><b>${v}</b></div>`).join('')}</div>`;
      blocks.push(['لوحة المؤشرات', ['المؤشر', 'القيمة'], kp]);
      if (rep) html += add('ملخص القيود', ['القيد', 'المستوى', 'المخالفات'], Object.entries(rep.byRule).filter(([, r]) => r.lv !== 'o').map(([k, r]) => [esc(ruleName(k)), TT().LVN[r.lv], r.n ? st(Math.round(r.n * 10) / 10, false) : st('✓', true)]));
    } else if (rt === 'teach') {
      html = add('تقرير النصاب الأسبوعي', ['المعلم', 'النصاب المحدد', 'المسند', 'الموزّع في الجدول', 'الفرق', 'نسبة الاستغلال', `مقارنة بالحد (${AR(Dt.c0)})`], Dt.teachers.map(x => [esc(x.name), x.quota === null ? '—' : AR(x.quota), AR(x.asg), x.placed === null ? '—' : AR(x.placed), x.diff === null ? '—' : x.diff === 0 ? st('مكتمل', true) : x.diff > 0 ? st('زيادة ' + AR(x.diff), false) : st('عجز ' + AR(-x.diff), false), x.util === null ? '—' : pct(x.util), x.asg > Dt.c0 ? st('يتجاوز', false) : AR(Dt.c0 - x.asg) + ' متاحة']), 'حدّد النصاب لكل معلم من «القيود ← المعلمون». الفرق = المسند − النصاب.');
      if (g) html += add('تقرير توزيع الحصص', ['المعلم', ...Array.from({ length: g.D }, (_, d) => dayLbl(d)), 'الأولى', 'الأخيرة', 'أطول تتابع', 'الفراغات', 'أيام العمل', 'أيام التفرغ'], Dt.teachers.map(x => [esc(x.name), ...(x.days || []).map(n => n ? AR(n) : '<span class="faint">·</span>'), AR(x.first), AR(x.last), AR(x.run), x.gaps ? st(x.gaps, false) : AR(0), AR(x.work), AR(g.D - x.work)]));
      html += add('تقرير العبء التدريسي', ['المعلم', 'إجمالي الحصص', 'عدد المواد', 'عدد الفصول', 'الانحراف عن المتوسط', 'التفاصيل'], (() => { const avg = Dt.teachers.reduce((a, x) => a + x.asg, 0) / (Dt.teachers.length || 1); return Dt.teachers.map(x => [esc(x.name), AR(x.asg), AR(x.subs), AR(x.cls), (x.asg - avg >= 0 ? '+' : '') + AR(Math.round((x.asg - avg) * 10) / 10), `<span class="small">${esc(x.items.join('، '))}</span>`]); })());
    } else if (rt === 'cls') {
      html = add('مقارنة الحصص المطلوبة بالموزعة لكل فصل', ['الفصل', 'المطلوب', 'السعة', 'الموزّع', ...(g ? Array.from({ length: g.D }, (_, d) => dayLbl(d)) : []), 'فراغات وسط اليوم'], Dt.classes.map(x => [esc(x.c.name), AR(x.req), AR(x.cap), x.placed === null ? '—' : x.placed < x.req ? st(x.placed, false) : AR(x.placed), ...(x.perDay || []).map(n => AR(n)), x.holes === null ? '—' : x.holes ? st(x.holes, false) : AR(0)]));
      const rows = []; Dt.classes.forEach(x => x.subs.forEach(s => rows.push([esc(x.c.name), esc(s.name), esc(A.personName(s.t) || '—'), AR(s.req), s.placed === null ? '—' : s.placed < s.req ? st(s.placed, false) : AR(s.placed), s.days === null ? '—' : AR(s.days), s.maxD === null ? '—' : s.maxD > (+((P.subj[s.s] || {}).maxDay) || P.maxDay || 2) ? st(s.maxD, false) : AR(s.maxD)])));
      html += add('توزيع المواد وكشف التكرار في اليوم', ['الفصل', 'المادة', 'المعلم', 'المطلوب', 'الموزّع', 'عدد الأيام', 'أقصى تكرار في يوم'], rows);
      const un = rows.filter(r => /st-returned/.test(String(r[4])));
      html += add('المواد التي لم تستوفِ خطتها الأسبوعية', ['الفصل', 'المادة', 'المعلم', 'المطلوب', 'الموزّع'], un.map(r => r.slice(0, 5)));
    } else if (rt === 'adm') {
      const conf = rep ? rep.issues.map(i => [esc(ruleName(i.k)), esc(i.x)]) : [];
      html = add('تقرير التعارضات (المخالفات الإلزامية)', ['القيد', 'التفصيل'], conf, rep ? (conf.length ? '' : 'لا توجد تعارضات.') : 'ولّد الجدول أولاً.');
      const vac = []; secClasses().filter(c => rowTot(c.id)).forEach(c => allSubs().forEach(s => { if (H(c.id, s) && !T(c.id, s)) vac.push([esc(c.name), esc(sName(s)), AR(H(c.id, s))]); }));
      html += add('تقرير الحصص الشاغرة (بلا معلم)', ['الفصل', 'المادة', 'الحصص'], vac);
      const need = {}; vac.forEach((r, i) => { const s = r[1]; need[s] = (need[s] || 0) + (+String(r[2]).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) || 0); });
      const withQ = Dt.teachers.filter(x => x.quota !== null && x.diff !== 0);
      html += add('تقرير العجز والزيادة', ['المعلم / المادة', 'النوع', 'الحصص', 'الملاحظة'], [...withQ.map(x => [esc(x.name), x.diff < 0 ? 'عجز في النصاب' : 'زيادة على النصاب', AR(Math.abs(x.diff)), x.diff < 0 ? 'يمكن إسناد حصص إضافية' : 'يحتاج تخفيف أو معلم مساند']), ...Object.entries(need).map(([s, n]) => [s, 'احتياج معلم', AR(n), `≈ ${AR(Math.ceil(n / 24))} معلم بنصاب ٢٤`])]);
      if (rep) {
        html += add('تقرير كفاءة توزيع المعلمين', ['المعلم', 'الحمل', 'الفراغات', 'الأولى/الأخيرة', 'أطول تتابع', 'تكلفة القيود'], Dt.teachers.map(x => [esc(x.name), AR(x.placed), AR(x.gaps), AR(x.first) + ' / ' + AR(x.last), AR(x.run), rep.teachers[x.t] && rep.teachers[x.t].cost > 0.05 ? st(Math.round(rep.teachers[x.t].cost * 10) / 10, false) : st('✓', true)]));
        html += add('تقرير استغلال القاعات', ['القاعة', 'السعة', 'الحصص المستخدمة', 'المتاح', 'نسبة الاستغلال'], Object.values(rep.rooms).map(r => [esc(r.name), AR(r.cap), AR(r.used), AR(r.avail), pct(r.avail ? Math.round(100 * r.used / r.avail) : 0)]), Object.keys(rep.rooms).length ? '' : 'لا توجد قاعات مربوطة بمواد.');
        html += add('تقرير الالتزام بالخطة الدراسية', ['الفصل', 'المطلوب', 'الموزّع', 'نسبة الاكتمال'], Dt.classes.map(x => [esc(x.c.name), AR(x.req), AR(x.placed), pct(Math.round(100 * x.placed / Math.max(1, x.req)))]));
        html += add('تقرير التغطية اليومية', ['اليوم', 'فصول مكتملة اليوم', 'حصص فارغة وسط اليوم', 'إجمالي الحصص'], Array.from({ length: g.D }, (_, d) => { let full = 0, holes = 0, tot = 0; g.grid.forEach(r => { const row = r.slice(d * g.Pn, (d + 1) * g.Pn), lf = row.map(Boolean).lastIndexOf(true); const h = row.slice(0, lf + 1).filter(x => !x).length; holes += h; if (!h) full++; tot += row.filter(Boolean).length; }); return [dayLbl(d), AR(full) + ' / ' + AR(g.grid.length), holes ? st(holes, false) : AR(0), AR(tot)]; }));
      }
    } else {
      html = add('سجل التغييرات على التوزيع والجدول', ['الوقت', 'بواسطة', 'التغيير'], (P.log || []).map(l => [A.fmtDT ? A.fmtDT(l.at) : l.at, esc(A.personName(l.by) || ''), esc(l.what)]), 'يسجّل التوليد وإعادته والنقل اليدوي والتراجع وتطبيق ملفات القيود وإنشاء المسودات.');
      html += `<button class="btn ghost sm" id="rpClr" style="margin-top:6px">مسح السجل</button>`;
    }
    B.innerHTML = html;
    const cl = $('#rpClr', B); if (cl) cl.onclick = async () => { if (!(await A.confirmBox('مسح سجل التغييرات؟', 'مسح', true))) return; P.log = []; touch(); tRep(box, root); };
    const strip = h => String(h === null || h === undefined ? '' : h).replace(/<[^>]+>/g, '').trim();
    $('#rpP', box).onclick = () => A.printDoc(tabs.find(t => t[0] === rt)[1] + ' — الجدول المدرسي', A.section().name + (rep ? ` · مؤشر الكفاءة ${AR(rep.score)}` : ''), `<div class="pl-print">${B.innerHTML.replace(/<button[^>]*>.*?<\/button>/g, '')}</div>`, rt === 'teach' || rt === 'cls');
    $('#rpX', box).onclick = () => { const wb = XLSX.utils.book_new(); blocks.forEach(([t, h, rows], i) => { const ws = XLSX.utils.aoa_to_sheet([h.map(strip), ...rows.map(r => r.map(strip))]); ws['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws, (String(i + 1) + ' ' + t).slice(0, 30).replace(/[\\/?*[\]:]/g, ' ')); }); XLSX.writeFile(wb, `تقارير الجدول - ${A.section().name}.xlsx`); };
  }
  A._planState = () => P; A._lastGen = () => lastGen; A._planReload = () => { PSEC = null; P = null; };
  A._planSave = () => save(true); A._planTab = t => { if (t) tab = t; return tab; }; A._planCap = cap;

  function exportX() {
    const cls = secClasses(), subs = allSubs();
    const ws = XLSX.utils.aoa_to_sheet([['الفصل', ...subs.map(sName), 'المجموع'], ...cls.map(c => [c.name, ...subs.map(s => H(c.id, s) || ''), rowTot(c.id)]), ['المجموع', ...subs.map(colTot), cls.reduce((a, c) => a + rowTot(c.id), 0)]]);
    const wt = XLSX.utils.aoa_to_sheet([['الفصل', ...subs.map(sName)], ...cls.map(c => [c.name, ...subs.map(s => H(c.id, s) ? (A.personName(T(c.id, s)) || '—') : '')])]);
    ws['!views'] = wt['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الحصص'); XLSX.utils.book_append_sheet(wb, wt, 'المعلمون');
    XLSX.writeFile(wb, `توزيع الحصص - ${A.section().name}.xlsx`);
  }
  // عند تغيير القسم يُعاد التحميل
  const prevAfter = window.APP_AFTER_WEEK; window.APP_AFTER_WEEK = async function () { if (prevAfter) await prevAfter.apply(this, arguments); if (PSEC && PSEC !== S.sectionId) { P = null; PSEC = null; } };
})();
