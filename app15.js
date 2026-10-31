/* توزيع الحصص والجدول المرن — مصفوفة (فصل × مادة) قابلة للتعديل الكامل لكل قسم، معلم لكل خلية، قيود، وتوليد جدول يُرسل مسودةً للمراجعة */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, I } = A;
  A.I.plan = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16M15 4v16"/></svg>';
  const uid = () => Math.random().toString(36).slice(2, 9);
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
    const tabs = [['hours', 'الحصص لكل فصل'], ['teachers', 'المعلمون'], ['rules', 'القيود'], ['load', 'أحمال المعلمين'], ['gen', 'توليد الجدول']];
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
    ({ hours: tHours, teachers: tTeach, rules: tRules, load: tLoad, gen: tGen })[tab](box, root);
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
  // ---------- القيود (على طريقة aSc: المعلم، الفصل، المادة، القاعات، الحصص المشتركة، التثبيت) ----------
  const ens = () => { P.subj = P.subj || {}; P.rooms = P.rooms || []; P.classOff = P.classOff || {}; P.tlim = P.tlim || {}; P.locks = P.locks || {}; P.joint = P.joint || []; P.blocks = P.blocks || {}; };
  const grid = (sel, onClick, label) => { const sec = A.section(); return `<div class="scroll"><table class="tbl pl-blk"><thead><tr><th></th>${Array.from({ length: sec.periods }, (_, p) => `<th>${AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: sec.days }, (_, d) => `<tr><th>${A.DAYS[d]}</th>${Array.from({ length: sec.periods }, (_, p) => { const k = d + '-' + p, on = sel.has(k); return `<td><button class="pl-bk ${on ? 'on' : ''}" data-${onClick}="${k}" aria-pressed="${on}" aria-label="${A.DAYS[d]} الحصة ${p + 1} ${label}">${on ? '×' : ''}</button></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`; };
  function tRules(box, root) {
    ens(); const sec = A.section(), subs = allSubs();
    const tids = [...new Set(Object.values(P.teachers).flatMap(m => Object.values(m)).filter(Boolean))];
    let who = A.LS.get('pl_bt'); if (!tids.includes(who)) who = tids[0];
    let cw = A.LS.get('pl_bc'); if (!secClasses().some(c => c.id === cw)) cw = (secClasses()[0] || {}).id;
    let rs = A.LS.get('pl_rs') || 'subj';
    const tabs = [['subj', 'المواد'], ['teach', 'المعلمون'], ['cls', 'الفصول'], ['rooms', 'القاعات'], ['joint', 'حصص مشتركة'], ['gen', 'قواعد عامة']];
    box.innerHTML = `<div class="chip-filter" id="rsT" style="margin-top:12px">${tabs.map(([k, l]) => `<button data-v="${k}" class="${rs === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="rsB" class="sec-box"></div>`;
    $$('#rsT button', box).forEach(b => b.onclick = () => { A.LS.set('pl_rs', b.dataset.v); tRules(box, root); });
    const B = $('#rsB', box);
    if (rs === 'subj') {
      B.innerHTML = `<b>قيود المواد</b><p class="small muted" style="margin:2px 0 8px">الحصص المزدوجة (حصتان متتاليتان في اليوم نفسه)، الحصص المسموح بها للمادة، والقاعة الخاصة بها (المعمل، المسبح، الصالة) فلا يُجدول فيها فصلان في الوقت نفسه.</p>
        <div class="scroll"><table class="tbl"><thead><tr><th>المادة</th><th>حصص مزدوجة أسبوعياً</th><th>الحصص المسموح بها</th><th>القاعة</th></tr></thead><tbody>${subs.map(s => { const c = P.subj[s] || {}, al = new Set(c.periods || []); return `<tr><td><b>${esc(sName(s))}</b></td><td><select class="in" data-dbl="${s}" style="max-width:90px">${[0, 1, 2, 3].map(n => `<option value="${n}" ${(+c.doubles || 0) === n ? 'selected' : ''}>${n ? AR(n) : '—'}</option>`).join('')}</select></td>
          <td><div class="row" style="gap:3px;flex-wrap:nowrap">${Array.from({ length: sec.periods }, (_, p) => `<button class="pl-pp ${!al.size || al.has(p) ? 'on' : ''}" data-pp="${s}|${p}" aria-pressed="${!al.size || al.has(p)}" title="الحصة ${p + 1}">${AR(p + 1)}</button>`).join('')}</div></td>
          <td><select class="in" data-room="${s}" style="max-width:150px"><option value="">—</option>${P.rooms.map(r => `<option value="${r.id}" ${c.room === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></td></tr>`; }).join('')}</tbody></table></div>`;
      $$('[data-dbl]', B).forEach(x => x.onchange = () => { (P.subj[x.dataset.dbl] = P.subj[x.dataset.dbl] || {}).doubles = +x.value; touch(); });
      $$('[data-room]', B).forEach(x => x.onchange = () => { (P.subj[x.dataset.room] = P.subj[x.dataset.room] || {}).room = x.value; touch(); });
      $$('[data-pp]', B).forEach(b => b.onclick = () => { const [s, p] = b.dataset.pp.split('|'); const c = P.subj[s] = P.subj[s] || {}; let L = new Set(c.periods && c.periods.length ? c.periods : Array.from({ length: sec.periods }, (_, i) => i)); L.has(+p) ? L.delete(+p) : L.add(+p); c.periods = L.size === sec.periods ? [] : [...L].sort(); b.classList.toggle('on'); b.setAttribute('aria-pressed', b.classList.contains('on')); touch(); });
    } else if (rs === 'teach') {
      if (!tids.length) { B.innerHTML = '<p class="small muted">عيّن المعلمين أولاً من تبويب «المعلمون».</p>'; return; }
      const lim = P.tlim[who] || {}, bl = new Set(P.blocks[who] || []);
      B.innerHTML = `<b>قيود المعلم</b><div class="row" style="gap:10px;margin:8px 0"><select class="in" id="rT" style="max-width:240px">${tids.map(t => `<option value="${t}" ${t === who ? 'selected' : ''}>${esc(A.personName(t))}</option>`).join('')}</select>
          <label class="small">أقصى حصص في اليوم <select class="in" id="rMx" style="max-width:80px"><option value="">—</option>${[3, 4, 5, 6, 7].map(n => `<option ${+lim.maxDay === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="small">أقصى فراغات بين حصصه يومياً <select class="in" id="rGp" style="max-width:80px"><option value="">—</option>${[0, 1, 2, 3].map(n => `<option ${lim.maxGaps !== undefined && lim.maxGaps !== '' && +lim.maxGaps === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
        <p class="small muted">اضغط الخانة لتعليمها «غير متاح».</p>${grid(bl, 'tb', 'غير متاح')}`;
      $('#rT', B).onchange = e => { A.LS.set('pl_bt', e.target.value); tRules(box, root); };
      $('#rMx', B).onchange = e => { (P.tlim[who] = P.tlim[who] || {}).maxDay = e.target.value ? +e.target.value : ''; touch(); };
      $('#rGp', B).onchange = e => { (P.tlim[who] = P.tlim[who] || {}).maxGaps = e.target.value === '' ? '' : +e.target.value; touch(); };
      $$('[data-tb]', B).forEach(b => b.onclick = () => { const L = new Set(P.blocks[who] || []); L.has(b.dataset.tb) ? L.delete(b.dataset.tb) : L.add(b.dataset.tb); P.blocks[who] = [...L]; b.classList.toggle('on'); b.textContent = b.classList.contains('on') ? '×' : ''; touch(); });
    } else if (rs === 'cls') {
      const bl = new Set(P.classOff[cw] || []);
      B.innerHTML = `<b>أوقات مغلقة للفصل</b><p class="small muted" style="margin:2px 0 8px">مثل حصة نشاط أو خروج مبكر: لا تُجدول فيها أي مادة لهذا الفصل.</p><select class="in" id="rC" style="max-width:240px;margin-bottom:8px">${secClasses().map(c => `<option value="${c.id}" ${c.id === cw ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>${grid(bl, 'cb', 'مغلقة')}`;
      $('#rC', B).onchange = e => { A.LS.set('pl_bc', e.target.value); tRules(box, root); };
      $$('[data-cb]', B).forEach(b => b.onclick = () => { const L = new Set(P.classOff[cw] || []); L.has(b.dataset.cb) ? L.delete(b.dataset.cb) : L.add(b.dataset.cb); P.classOff[cw] = [...L]; b.classList.toggle('on'); b.textContent = b.classList.contains('on') ? '×' : ''; touch(); });
    } else if (rs === 'rooms') {
      B.innerHTML = `<b>القاعات الخاصة</b><p class="small muted" style="margin:2px 0 8px">أضف القاعات المشتركة (معمل العلوم، معمل الحاسب، المسبح، الصالة)، ثم اربط كل مادة بقاعتها من «المواد». لا يُجدول فصلان في القاعة نفسها في الوقت نفسه.</p>
        <div class="row" style="gap:8px;margin-bottom:8px"><input class="in" id="rN" placeholder="اسم القاعة" style="max-width:240px"><button class="btn sm" id="rAdd">${I.plus} إضافة</button></div>
        ${P.rooms.map(r => `<div class="row" style="justify-content:space-between;border-top:1px dashed var(--border);padding:6px 0"><span><b>${esc(r.name)}</b> <span class="small muted">· ${esc(allSubs().filter(s => (P.subj[s] || {}).room === r.id).map(sName).join('، ') || 'بلا مواد')}</span></span><button class="btn bad sm" data-rr="${r.id}" aria-label="حذف القاعة">×</button></div>`).join('') || '<p class="small muted">لا توجد قاعات بعد.</p>'}`;
      $('#rAdd', B).onclick = () => { const n = $('#rN', B).value.trim(); if (!n) return; P.rooms.push({ id: uid(), name: n }); touch(); tRules(box, root); };
      $$('[data-rr]', B).forEach(b => b.onclick = () => { P.rooms = P.rooms.filter(r => r.id !== b.dataset.rr); Object.values(P.subj).forEach(c => { if (c.room === b.dataset.rr) c.room = ''; }); touch(); tRules(box, root); });
    } else if (rs === 'joint') {
      B.innerHTML = `<b>حصص مشتركة</b><p class="small muted" style="margin:2px 0 8px">مادة تُدرَّس لعدة فصول في الوقت نفسه (دمج فصلين، مسبح، نشاط مشترك). تُوضع حصصها معاً في الخانة نفسها لكل الفصول المختارة.</p>
        <div class="row" style="gap:8px;align-items:flex-start;margin-bottom:8px"><select class="in" id="jS" style="max-width:200px">${subs.map(s => `<option value="${s}">${esc(sName(s))}</option>`).join('')}</select>
          <div class="perm-grid" id="jC" style="flex:1">${secClasses().map(c => `<label class="chk small"><input type="checkbox" value="${c.id}"> ${esc(c.name)}</label>`).join('')}</div><button class="btn sm" id="jAdd">${I.plus} ربط</button></div>
        ${P.joint.map(j => `<div class="row" style="justify-content:space-between;border-top:1px dashed var(--border);padding:6px 0"><span><b>${esc(sName(j.sid))}</b> <span class="small muted">· ${esc(j.classes.map(c => (A.cls(c) || {}).name || '').join('، '))}</span></span><button class="btn bad sm" data-jr="${j.id}" aria-label="إلغاء الربط">×</button></div>`).join('') || '<p class="small muted">لا توجد حصص مشتركة.</p>'}`;
      $('#jAdd', B).onclick = () => { const sid = $('#jS', B).value, cl = $$('#jC input:checked', B).map(i => i.value); if (cl.length < 2) { A.toast('اختر فصلين على الأقل', 'warn'); return; } const hs = cl.map(c => H(c, sid)); if (new Set(hs).size > 1 || !hs[0]) { A.toast('يجب أن يكون عدد حصص المادة متساوياً وغير صفر في الفصول المختارة', 'warn'); return; } P.joint.push({ id: uid(), sid, classes: cl }); touch(); tRules(box, root); };
      $$('[data-jr]', B).forEach(b => b.onclick = () => { P.joint = P.joint.filter(j => j.id !== b.dataset.jr); touch(); tRules(box, root); });
    } else {
      B.innerHTML = `<b>قواعد عامة</b>
        <div class="field" style="margin-top:8px"><label for="rM">أقصى عدد حصص للمادة نفسها في اليوم الواحد</label><select class="in" id="rM" style="max-width:120px">${[1, 2, 3, 4].map(n => `<option ${P.maxDay === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <label class="chk"><input type="checkbox" id="rD" ${P.noDouble ? 'checked' : ''}> تجنّب حصتين متتاليتين للمادة نفسها (إلا المزدوجة)</label>
        <label class="chk"><input type="checkbox" id="rE" ${P.emptyLast !== false ? 'checked' : ''}> الحصص الفارغة في آخر اليوم</label>
        <p class="small muted">بعد التوليد: ثبّت أي حصة أو بادل بين حصتين يدوياً، ثم أعد التوليد للباقي — والمثبّت لا يتحرك.</p>`;
      $('#rM', B).onchange = e => { P.maxDay = +e.target.value; touch(); };
      $('#rD', B).onchange = e => { P.noDouble = e.target.checked; touch(); };
      $('#rE', B).onchange = e => { P.emptyLast = e.target.checked; touch(); };
    }
  }
  // ---------- الأحمال ----------
  function tLoad(box) {
    const L = {}; secClasses().forEach(c => allSubs().forEach(s => { const t = T(c.id, s), h = H(c.id, s); if (!h) return; const k = t || '—'; const r = L[k] = L[k] || { n: 0, items: [] }; r.n += h; r.items.push(`${sName(s)} ${c.name} (${AR(h)})`); }));
    const c0 = cap(), rows = Object.entries(L).sort((a, b) => b[1].n - a[1].n);
    box.innerHTML = rows.length ? `<div class="scroll" style="margin-top:12px"><table class="tbl"><thead><tr><th>المعلم</th><th>الحصص الأسبوعية</th><th>التفاصيل</th></tr></thead><tbody>${rows.map(([t, r]) => `<tr><td><b>${t === '—' ? '<span style="color:var(--bad)">بلا معلم</span>' : esc(A.personName(t))}</b></td><td><span class="pill ${r.n > c0 ? 'st-returned' : r.n > 24 ? 'st-submitted' : 'st-approved'}">${AR(r.n)}</span></td><td class="small">${esc(r.items.join('، '))}</td></tr>`).join('')}</tbody></table></div><p class="small muted">أكثر من ${AR(c0)} حصة لمعلم واحد يستحيل جدولته؛ وأكثر من ٢٤ حمل مرتفع.</p>` : A.emptyBox('لا توجد حصص بعد');
  }

  // ---------- المحرّك: بطاقات (مفردة/مزدوجة/مشتركة) + تبادلات داخل الفصل مع تحسين تدريجي ----------
  function build() {
    ens(); const sec = A.section(), D = sec.days, Pn = sec.periods, N = D * Pn, cls = secClasses().filter(c => rowTot(c.id));
    const over = cls.filter(c => rowTot(c.id) + (P.classOff[c.id] || []).length > N); if (over.length) throw new Error('حصص أكثر من سعة الأسبوع (مع الأوقات المغلقة) في: ' + over.map(c => c.name).join('، '));
    const ci = Object.fromEntries(cls.map((c, i) => [c.id, i]));
    const cards = []; // {id, gi, sid, len, joint}
    const jointOf = {}; P.joint.forEach(j => j.classes.forEach(c => { jointOf[c + '|' + j.sid] = j; }));
    const jcards = {}; // جذر البطاقة المشتركة
    cls.forEach((c, gi) => allSubs().forEach(s => { let h = H(c.id, s); if (!h) return; const dbl = Math.min(+((P.subj[s] || {}).doubles) || 0, Math.floor(h / 2)); const j = jointOf[c.id + '|' + s];
      for (let k = 0; k < dbl; k++) { cards.push({ id: cards.length, gi, sid: s, len: 2, j: j ? j.id + ':d' + k : null }); h -= 2; }
      for (let k = 0; k < h; k++) cards.push({ id: cards.length, gi, sid: s, len: 1, j: j ? j.id + ':s' + k : null }); }));
    cards.forEach(cd => { if (cd.j) (jcards[cd.j] = jcards[cd.j] || []).push(cd.id); });
    return { D, Pn, N, cls, ci, cards, jcards };
  }
  // انشغال المعلم المشترك في الأقسام الأخرى (من جداولها المعتمدة) — يُمنع التعارض بين الأقسام
  let EXT = {};
  async function loadExt() {
    EXT = {}; const secs = (S.allSections || S.sections || []).filter(x => x.id !== S.sectionId);
    for (const sc of secs) { let sl = []; try { sl = await api.approvedSlots(sc.id); } catch (_) {} sl.forEach(x => { if (x.teacher_id) (EXT[x.teacher_id] = EXT[x.teacher_id] || new Map()).set(x.day + '-' + x.period, sc.name); }); }
    return EXT;
  }
  function solve(opt) {
    const M = build(), { D, Pn, N, cls, cards, jcards } = M, mx = P.maxDay || 2;
    const blk = Object.fromEntries(Object.entries(P.blocks || {}).map(([t, l]) => [t, new Set(l)]));
    const coff = cls.map(c => new Set(P.classOff[c.id] || []));
    const tch = (gi, s) => s ? T(cls[gi].id, s) : '';
    const room = s => (P.subj[s] || {}).room || '';
    const allow = s => { const l = (P.subj[s] || {}).periods; return l && l.length ? new Set(l) : null; };
    const AL = {}; allSubs().forEach(s => AL[s] = allow(s));
    const lockOf = cls.map(c => P.locks[c.id] || {});
    let best = null;
    for (let rs = 0; rs < (opt.restarts || 4); rs++) {
      // G[gi][k] = رقم البطاقة أو -1، مع تثبيت المقفل أولاً
      const G = cls.map(() => new Array(N).fill(-1)), fixed = cls.map(() => new Array(N).fill(false));
      const placed = new Set();
      const free = gi => { const f = []; for (let k = 0; k < N; k++) if (G[gi][k] < 0 && !coff[gi].has(Math.floor(k / Pn) + '-' + (k % Pn))) f.push(k); return f; };
      // المقفل
      cls.forEach((c, gi) => Object.entries(lockOf[gi]).forEach(([dk, sid]) => { const [d, p] = dk.split('-').map(Number), k = d * Pn + p; const cd = cards.find(x => x.gi === gi && x.sid === sid && x.len === 1 && !placed.has(x.id) && !x.j); if (cd && G[gi][k] < 0) { G[gi][k] = cd.id; fixed[gi][k] = true; placed.add(cd.id); } }));
      const put = (cd, k) => { for (let q = 0; q < cd.len; q++) G[cd.gi][k + q] = cd.id; placed.add(cd.id); };
      const canAt = (gi, k, len) => { if (k % Pn + len > Pn) return false; for (let q = 0; q < len; q++) { const kk = k + q; if (G[gi][kk] >= 0 || coff[gi].has(Math.floor(kk / Pn) + '-' + (kk % Pn))) return false; } return true; };
      // المشتركة والمزدوجة أولاً
      const order = cards.filter(c => !placed.has(c.id)).sort((a, b) => (b.j ? 2 : 0) + b.len - ((a.j ? 2 : 0) + a.len) || Math.random() - .5);
      for (const cd of order) {
        if (placed.has(cd.id)) continue;
        const grp = cd.j ? jcards[cd.j].map(i => cards[i]) : [cd];
        const ks = []; for (let k = 0; k < N; k++) if (grp.every(g => canAt(g.gi, k, g.len))) ks.push(k);
        if (!ks.length) { const f = free(cd.gi); if (f.length) for (const g of grp) { const ff = free(g.gi).filter(k => canAt(g.gi, k, g.len)); if (ff.length) put(g, ff[Math.floor(Math.random() * ff.length)]); } continue; }
        const k = ks[Math.floor(Math.random() * ks.length)]; grp.forEach(g => put(g, k));
      }
      // ما لم يُوضع (مزدوج لم يجد خانتين) يُفكّ إلى مفردات
      cards.forEach(cd => { if (!placed.has(cd.id)) { const f = free(cd.gi); for (let q = 0; q < cd.len && f[q] !== undefined; q++) G[cd.gi][f[q]] = cd.id; placed.add(cd.id); } });
      const C = id => id >= 0 ? cards[id] : null;
      const startOf = (gi, k) => { const id = G[gi][k]; if (id < 0) return k; let s = k; while (s % Pn > 0 && G[gi][s - 1] === id) s--; return s; };
      // تكلفة كاملة (تُحسب كاملة لكل مرشح — عدد الخانات صغير)
      const cost = () => {
        let c = 0; const tslot = new Map(), rslot = new Map();
        for (let gi = 0; gi < G.length; gi++) { const row = G[gi]; const dayCnt = Array.from({ length: D }, () => ({}));
          for (let k = 0; k < N; k++) { const cd = C(row[k]); const d = Math.floor(k / Pn), p = k % Pn;
            if (!cd) { if (P.emptyLast !== false && p < Pn - 1) { for (let q = k + 1; q < (d + 1) * Pn; q++) if (row[q] >= 0) { c += 0.4; break; } } continue; }
            const t = tch(gi, cd.sid), r = room(cd.sid);
            if (t) { const key = k + '|' + t; const prev = tslot.get(key); if (prev !== undefined && !(cd.j && prev === cd.j)) c += 10; tslot.set(key, cd.j || 'x' + gi); if (blk[t] && blk[t].has(d + '-' + p)) c += 8; if (EXT[t] && EXT[t].has(d + '-' + p)) c += 10; }
            if (r) { const key = k + '|' + r; const prev = rslot.get(key); if (prev !== undefined && !(cd.j && prev === cd.j)) c += 8; rslot.set(key, cd.j || 'x' + gi); }
            if (AL[cd.sid] && !AL[cd.sid].has(p)) c += 5;
            if (coff[gi].has(d + '-' + p)) c += 10;
            if (k === startOf(gi, k)) dayCnt[d][cd.sid] = (dayCnt[d][cd.sid] || 0) + 1;
            if (P.noDouble && p > 0 && row[k - 1] >= 0 && row[k - 1] !== row[k] && C(row[k - 1]).sid === cd.sid) c += 1;
          }
          dayCnt.forEach(m => Object.entries(m).forEach(([s, n]) => { const lim = Math.max(mx, 1); if (n > lim) c += 3 * (n - lim); }));
        }
        // حدود المعلم اليومية والفراغات
        Object.entries(P.tlim || {}).forEach(([t, l]) => { if (!l) return; for (let d = 0; d < D; d++) { const ps = []; for (let p = 0; p < Pn; p++) { const k = d * Pn + p; for (let gi = 0; gi < G.length; gi++) { const cd = C(G[gi][k]); if (cd && tch(gi, cd.sid) === t) { ps.push(p); break; } } }
          if (l.maxDay && ps.length > l.maxDay) c += 4 * (ps.length - l.maxDay);
          if (l.maxGaps !== '' && l.maxGaps !== undefined && ps.length > 1) { const gaps = ps[ps.length - 1] - ps[0] + 1 - ps.length; if (gaps > l.maxGaps) c += 1.5 * (gaps - l.maxGaps); } } });
        return c;
      };
      // نقلة: تبادل كتلتين بنفس الطول داخل فصل (مع سحب البطاقات المشتركة معاً)
      const blockAt = (gi, k) => { const id = G[gi][k]; if (id < 0) return { s: k, len: 1, id: -1 }; const s = startOf(gi, k); return { s, len: C(id).len, id }; };
      const swapIn = (gi, a, b, len) => { for (let q = 0; q < len; q++) { const t = G[gi][a + q]; G[gi][a + q] = G[gi][b + q]; G[gi][b + q] = t; } };
      const okBlock = (gi, s, len) => { if (s % Pn + len > Pn) return false; for (let q = 0; q < len; q++) if (fixed[gi][s + q]) return false; const first = G[gi][s], last = G[gi][s + len - 1]; if (first >= 0 && startOf(gi, s) !== s) return false; if (last >= 0 && C(last).len === 2 && startOf(gi, s + len - 1) === s + len - 1 && len === 1) return false; return true; };
      let cur = cost(); const it = opt.iters || 6000, T0 = 3;
      for (let i = 0; i < it && cur > 0.01; i++) {
        const gi = Math.floor(Math.random() * G.length), A1 = blockAt(gi, Math.floor(Math.random() * N)), len = A1.len;
        const b = Math.floor(Math.random() * N); const B1 = { s: b - (b % Pn) + Math.min(b % Pn, Pn - len) };
        if (A1.s === B1.s || !okBlock(gi, A1.s, len) || !okBlock(gi, B1.s, len)) continue;
        if (Math.abs(A1.s - B1.s) < len) continue;
        // البطاقات المشتركة في الكتلتين: تُنقل في كل فصولها
        const js = new Set(); for (let q = 0; q < len; q++) [G[gi][A1.s + q], G[gi][B1.s + q]].forEach(id => { if (id >= 0 && C(id).j) js.add(C(id).j); });
        const moves = [gi]; let bad = false;
        js.forEach(j => jcards[j].forEach(id => { const g2 = cards[id].gi; if (!moves.includes(g2)) { if (!okBlock(g2, A1.s, len) || !okBlock(g2, B1.s, len)) bad = true; moves.push(g2); } }));
        if (bad) continue;
        moves.forEach(g => swapIn(g, A1.s, B1.s, len));
        const nc = cost(), dl = nc - cur, temp = T0 * (1 - i / it) + 0.02;
        if (dl <= 0 || Math.random() < Math.exp(-dl / temp)) cur = nc; else moves.forEach(g => swapIn(g, A1.s, B1.s, len));
      }
      if (!best || cur < best.cost) best = { cost: cur, G: G.map(r => r.slice()), fixed: fixed.map(r => r.slice()) };
      if (best.cost < 0.01) break;
    }
    const res = { ...M, grid: best.G.map(r => r.map(id => id >= 0 ? cards[id].sid : null)), cid: best.G, fixed: best.fixed, cost: best.cost, tch };
    res.issues = issuesOf(res); return res;
  }
  function issuesOf(g) {
    const out = [], { D, Pn, N, cls } = g, tmap = {}, rmap = {};
    g.grid.forEach((row, gi) => row.forEach((s, k) => { if (!s) return; const d = Math.floor(k / Pn), p = k % Pn, t = g.tch(gi, s), r = (P.subj[s] || {}).room, cd = g.cards[g.cid[gi][k]];
      const key = cd && cd.j ? cd.j : 'x' + gi;
      if (t) { const kk = k + '|' + t; (tmap[kk] = tmap[kk] || new Set()).add(key); if ((P.blocks[t] || []).includes(d + '-' + p)) out.push(`${A.personName(t)} غير متاح ${A.DAYS[d]} الحصة ${p + 1} (${cls[gi].name})`); if (EXT[t] && EXT[t].has(d + '-' + p)) out.push(`${A.personName(t)} لديه حصة في ${EXT[t].get(d + '-' + p)} ${A.DAYS[d]} الحصة ${p + 1} (${cls[gi].name})`); }
      if (r) { const kk = k + '|' + r; (rmap[kk] = rmap[kk] || new Set()).add(key); }
      const al = (P.subj[s] || {}).periods; if (al && al.length && !al.includes(p)) out.push(`${sName(s)} في حصة غير مسموحة: ${A.DAYS[d]} ${p + 1} (${cls[gi].name})`);
      if ((P.classOff[cls[gi].id] || []).includes(d + '-' + p)) out.push(`${cls[gi].name}: حصة في وقت مغلق ${A.DAYS[d]} ${p + 1}`); }));
    Object.entries(tmap).forEach(([kk, set]) => { if (set.size > 1) { const [k, t] = kk.split('|'); out.push(`تعارض: ${A.personName(t)} في ${A.DAYS[Math.floor(k / Pn)]} الحصة ${+k % Pn + 1}`); } });
    Object.entries(rmap).forEach(([kk, set]) => { if (set.size > 1) { const [k, r] = kk.split('|'); out.push(`تعارض قاعة «${((P.rooms || []).find(x => x.id === r) || {}).name || ''}» ${A.DAYS[Math.floor(k / Pn)]} الحصة ${+k % Pn + 1}`); } });
    return [...new Set(out)];
  }
  A._planState = () => P; A._lastGen = () => lastGen; A._planReload = () => { PSEC = null; P = null; };
  function tGen(box, root) {
    const cls = secClasses().filter(c => rowTot(c.id)); const miss = []; cls.forEach(c => allSubs().forEach(s => { if (H(c.id, s) && !T(c.id, s)) miss.push(1); }));
    const ld = {}; cls.forEach(c => allSubs().forEach(s => { const t = T(c.id, s); if (t) ld[t] = (ld[t] || 0) + H(c.id, s); }));
    const heavy = Object.entries(ld).filter(([, n]) => n > cap()); ens();
    const nl = Object.values(P.locks).reduce((a, m) => a + Object.keys(m).length, 0);
    box.innerHTML = `<div class="sec-box" style="margin-top:12px"><div class="row" style="justify-content:space-between;gap:10px"><div><b>توليد جدول ${AR(cls.length)} فصلاً من التوزيع</b>
        <p class="small muted" style="margin:4px 0 0">يراعي: عدد الحصص، الحصص المزدوجة، الحصص المشتركة، تعارض المعلم والقاعة، أوقات عدم الإتاحة للمعلم والفصل، انشغال المعلم المشترك في الأقسام الأخرى، الحصص المسموح بها لكل مادة، أقصى ${AR(P.maxDay || 2)} حصص للمادة يومياً، حدود المعلم اليومية والفراغات${nl ? `، و${AR(nl)} حصة مثبّتة` : ''}.${miss.length ? ` <b style="color:#b54708">${AR(miss.length)} خلية بلا معلم.</b>` : ''}</p></div>
        <button class="btn sky" id="gGo">توليد</button></div>${heavy.length ? `<div class="notice bad" style="margin-top:10px">لا يمكن جدولة معلم بأكثر من ${AR(cap())} حصة أسبوعياً: ${heavy.map(([t, n]) => `${esc(A.personName(t))} (${AR(n)})`).join('، ')}</div>` : ''}<div id="gOut"></div></div>`;
    if (lastGen) showGen($('#gOut', box), root);
    $('#gGo', box).onclick = e => A.run(e.currentTarget, async () => {
      if (dirty) await save(true);
      $('#gOut', box).innerHTML = '<div class="spinner"></div>'; await new Promise(r => setTimeout(r, 30));
      await loadExt(); lastGen = solve({ restarts: 3, iters: 7000 }); showGen($('#gOut', box), root);
    });
  }
  let pick = null;
  function showGen(out, root) {
    const g = lastGen; let view = A.LS.get('pl_gv') || 'class';
    const tids = [...new Set(g.grid.flatMap((r, gi) => r.map(s => g.tch(gi, s)).filter(Boolean)))];
    let sel = A.LS.get(view === 'class' ? 'pl_gc' : 'pl_gt'); const opts = view === 'class' ? g.cls.map(c => [c.id, c.name]) : tids.map(t => [t, A.personName(t)]);
    if (!opts.some(o => o[0] === sel)) sel = (opts[0] || [])[0];
    const gi = g.cls.findIndex(c => c.id === sel);
    const cell = (d, p) => { const k = d * g.Pn + p;
      if (view === 'class') { const s = g.grid[gi][k], t = g.tch(gi, s), lk = (P.locks[sel] || {})[d + '-' + p], cd = g.cards[g.cid[gi][k]]; return `<td class="pl-gc ${pick && pick.k === k ? 'pick' : ''} ${lk ? 'lk' : ''}" data-k="${k}" tabindex="0">${s ? `<b>${esc(sName(s))}</b>${cd && cd.len === 2 ? ' <span class="pill st-empty">مزدوجة</span>' : ''}${cd && cd.j ? ' <span class="pill st-submitted">مشتركة</span>' : ''}${t ? `<div class="small muted">${esc(A.personName(t))}</div>` : ''}` : '<span class="faint">—</span>'}${lk ? '<div class="small" style="color:var(--blue)">مثبّتة</div>' : ''}</td>`; }
      const L = g.cls.map((c, i) => [c, g.grid[i][k]]).filter(([c, s], i) => s && g.tch(g.cls.indexOf(c), s) === sel); return `<td>${L.map(([c, s]) => `<b>${esc(sName(s))}</b><div class="small muted">${esc(c.name)}</div>`).join('') || '<span class="faint">—</span>'}</td>`; };
    out.innerHTML = `<div class="notice ${g.issues.length ? 'warn' : 'ok'}" style="margin-top:10px">${g.issues.length ? `${AR(g.issues.length)} مشكلة متبقية — أعد التوليد، أو ثبّت/بادل يدوياً، أو خفّف القيود.<ul class="small" style="margin:6px 0 0">${g.issues.slice(0, 10).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : 'جدول بلا تعارضات ويحقق كل القيود.'}</div>
      <div class="row" style="gap:8px;margin:10px 0;flex-wrap:wrap"><div class="chip-filter" id="gV" style="margin:0">${[['class', 'حسب الفصل'], ['teacher', 'حسب المعلم']].map(([k, l]) => `<button data-v="${k}" class="${view === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <select class="in" id="gC" style="max-width:220px" aria-label="اختيار">${opts.map(([v, l]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select><div class="grow"></div>
        <button class="btn ghost sm" id="gRe">إعادة التوليد (المثبّت يبقى)</button><button class="btn ok" id="gSave">${I.send} إنشاء مسودة جدول للمراجعة</button></div>
      ${view === 'class' ? '<p class="small muted" style="margin:0 0 6px">اضغط حصة ثم حصة أخرى لتبديلهما يدوياً. اضغط مرتين على الحصة نفسها لتثبيتها أو فكّ تثبيتها.</p>' : ''}
      <div class="scroll"><table class="tbl pl-grid"><thead><tr><th></th>${Array.from({ length: g.Pn }, (_, p) => `<th>${AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: g.D }, (_, d) => `<tr><th>${A.DAYS[d]}</th>${Array.from({ length: g.Pn }, (_, p) => cell(d, p)).join('')}</tr>`).join('')}</tbody></table></div>`;
    $$('#gV button', out).forEach(b => b.onclick = () => { A.LS.set('pl_gv', b.dataset.v); pick = null; showGen(out, root); });
    $('#gC', out).onchange = e => { A.LS.set(view === 'class' ? 'pl_gc' : 'pl_gt', e.target.value); pick = null; showGen(out, root); };
    $$('.pl-gc', out).forEach(td => td.onclick = () => {
      const k = +td.dataset.k, d = Math.floor(k / g.Pn), p = k % g.Pn, dk = d + '-' + p;
      if (pick && pick.k === k) { ens(); const m = P.locks[sel] = P.locks[sel] || {}; const s = g.grid[gi][k]; if (m[dk]) delete m[dk]; else if (s) m[dk] = s; pick = null; touch(); showGen(out, root); return; }
      if (!pick) { pick = { k }; showGen(out, root); return; }
      const a = pick.k, b = k; pick = null; const ca = g.cards[g.cid[gi][a]], cb = g.cards[g.cid[gi][b]];
      if ((ca && (ca.len === 2 || ca.j)) || (cb && (cb.len === 2 || cb.j))) { A.toast('المزدوجة والمشتركة تُنقل بإعادة التوليد أو بالتثبيت', 'warn'); showGen(out, root); return; }
      [g.grid[gi][a], g.grid[gi][b]] = [g.grid[gi][b], g.grid[gi][a]]; [g.cid[gi][a], g.cid[gi][b]] = [g.cid[gi][b], g.cid[gi][a]];
      g.issues = issuesOf(g); showGen(out, root);
    });
    $('#gRe', out).onclick = e => A.run(e.currentTarget, async () => { if (dirty) await save(true); await loadExt(); lastGen = solve({ restarts: 3, iters: 7000 }); showGen(out, root); });
    $('#gSave', out).onclick = e => A.run(e.currentTarget, async () => {
      const v = await api.createDraft({ section_id: S.sectionId, label: 'من توزيع الحصص — ' + new Date().toLocaleDateString('ar-SA-u-nu-latn'), source: 'توزيع الحصص', created_by: S.me.id });
      const vs = await api.ttVersions(S.sectionId), ap = vs.find(x => x.status === 'approved'), ids = new Set(g.cls.map(x => x.id));
      if (ap) { const sl = (await api.ttSlots(ap.id)).filter(x => !ids.has(x.class_id)); if (sl.length) await api.replaceSlots(v.id, sl.map(({ class_id, day, period, subject_id, teacher_id }) => ({ class_id, day, period, subject_id, teacher_id }))); }
      const rows = []; g.cls.forEach((x, i) => g.grid[i].forEach((s, k) => rows.push({ class_id: x.id, day: Math.floor(k / g.Pn), period: k % g.Pn, subject_id: s || null, teacher_id: g.tch(i, s) || null })));
      for (let i = 0; i < rows.length; i += 400) await api.upsertSlots(v.id, rows.slice(i, i + 400));
      A.LS.set('tttab', 'drafts'); A.toast('أُنشئت مسودة الجدول — راجعها وعدّل ما تريد ثم اعتمدها', 'ok'); location.hash = '#/timetable';
    });
  }

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
