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
  // ---------- القيود ----------
  function tRules(box, root) {
    const sec = A.section(), tids = [...new Set(Object.values(P.teachers).flatMap(m => Object.values(m)).filter(Boolean))];
    let who = A.LS.get('pl_bt'); if (!tids.includes(who)) who = tids[0];
    const bl = new Set((P.blocks[who] || []));
    box.innerHTML = `<div class="grid g2" style="align-items:start;margin-top:12px"><div class="sec-box"><b>قواعد عامة</b>
        <div class="field" style="margin-top:8px"><label for="rM">أقصى عدد حصص للمادة نفسها في اليوم الواحد</label><select class="in" id="rM" style="max-width:120px">${[1, 2, 3, 4].map(n => `<option ${P.maxDay === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <label class="chk"><input type="checkbox" id="rD" ${P.noDouble ? 'checked' : ''}> تجنّب حصتين متتاليتين للمادة نفسها</label>
        <p class="small muted">الجدول المولَّد يصل مسودةً؛ أي حصة تعدّلها يدوياً في «الجدول الدراسي» قبل الاعتماد.</p></div>
      <div class="sec-box"><b>أوقات لا يتاح فيها المعلم</b>${tids.length ? `<div class="field" style="margin-top:8px"><select class="in" id="rT">${tids.map(t => `<option value="${t}" ${t === who ? 'selected' : ''}>${esc(A.personName(t))}</option>`).join('')}</select></div>
        <div class="scroll"><table class="tbl pl-blk"><thead><tr><th></th>${Array.from({ length: sec.periods }, (_, p) => `<th>${AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: sec.days }, (_, d) => `<tr><th>${A.DAYS[d]}</th>${Array.from({ length: sec.periods }, (_, p) => `<td><button class="pl-bk ${bl.has(d + '-' + p) ? 'on' : ''}" data-k="${d}-${p}" aria-pressed="${bl.has(d + '-' + p)}" aria-label="${A.DAYS[d]} الحصة ${p + 1}">${bl.has(d + '-' + p) ? '×' : ''}</button></td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="small muted">اضغط الخانة لتعليمها «غير متاح».</p>` : '<p class="small muted">عيّن المعلمين أولاً من تبويب «المعلمون».</p>'}</div></div>`;
    $('#rM', box).onchange = e => { P.maxDay = +e.target.value; touch(); };
    $('#rD', box).onchange = e => { P.noDouble = e.target.checked; touch(); };
    const rt = $('#rT', box); if (rt) rt.onchange = e => { A.LS.set('pl_bt', e.target.value); tRules(box, root); };
    $$('.pl-bk', box).forEach(b => b.onclick = () => { const L = new Set(P.blocks[who] || []); L.has(b.dataset.k) ? L.delete(b.dataset.k) : L.add(b.dataset.k); P.blocks[who] = [...L]; b.classList.toggle('on'); b.textContent = b.classList.contains('on') ? '×' : ''; b.setAttribute('aria-pressed', b.classList.contains('on')); touch(); });
  }
  // ---------- الأحمال ----------
  function tLoad(box) {
    const L = {}; secClasses().forEach(c => allSubs().forEach(s => { const t = T(c.id, s), h = H(c.id, s); if (!h) return; const k = t || '—'; const r = L[k] = L[k] || { n: 0, items: [] }; r.n += h; r.items.push(`${sName(s)} ${c.name} (${AR(h)})`); }));
    const c0 = cap(), rows = Object.entries(L).sort((a, b) => b[1].n - a[1].n);
    box.innerHTML = rows.length ? `<div class="scroll" style="margin-top:12px"><table class="tbl"><thead><tr><th>المعلم</th><th>الحصص الأسبوعية</th><th>التفاصيل</th></tr></thead><tbody>${rows.map(([t, r]) => `<tr><td><b>${t === '—' ? '<span style="color:var(--bad)">بلا معلم</span>' : esc(A.personName(t))}</b></td><td><span class="pill ${r.n > c0 ? 'st-returned' : r.n > 24 ? 'st-submitted' : 'st-approved'}">${AR(r.n)}</span></td><td class="small">${esc(r.items.join('، '))}</td></tr>`).join('')}</tbody></table></div><p class="small muted">أكثر من ${AR(c0)} حصة لمعلم واحد يستحيل جدولته؛ وأكثر من ٢٤ حمل مرتفع.</p>` : A.emptyBox('لا توجد حصص بعد');
  }

  // ---------- التوليد ----------
  function solve(opt) {
    const sec = A.section(), D = sec.days, Pn = sec.periods, N = D * Pn, cls = secClasses().filter(c => rowTot(c.id));
    const over = cls.filter(c => rowTot(c.id) > N); if (over.length) throw new Error('حصص أكثر من سعة الأسبوع في: ' + over.map(c => c.name).join('، '));
    const mx = P.maxDay || 2, blk = Object.fromEntries(Object.entries(P.blocks || {}).map(([t, l]) => [t, new Set(l)]));
    const G = cls.map(c => { const L = []; allSubs().forEach(s => { for (let i = 0; i < H(c.id, s); i++) L.push(s); }); while (L.length < N) L.push(null); return { c, L }; });
    const tch = (gi, s) => s ? T(G[gi].c.id, s) : '';
    let best = null;
    for (let rs = 0; rs < (opt.restarts || 4); rs++) {
      // بداية موزّعة: كل مادة تتوزع على الأيام بالتناوب
      const grid = G.map(g => { const by = {}; g.L.forEach(s => (by[s] = by[s] || []).push(s)); const days = Array.from({ length: D }, () => []); let d = Math.floor(Math.random() * D);
        Object.values(by).sort((a, b) => b.length - a.length).forEach(arr => arr.forEach(s => { let k = 0; while (days[d].length >= Pn && k++ < D) d = (d + 1) % D; days[d].push(s); d = (d + 1) % D; }));
        days.forEach(x => x.sort(() => Math.random() - .5)); return days.flat(); });
      const tc = Array.from({ length: N }, () => new Map()), sd = G.map(() => Array.from({ length: D }, () => new Map()));
      const add = (gi, k, s, v) => { if (!s) return; const t = tch(gi, s); if (t) tc[k].set(t, (tc[k].get(t) || 0) + v); const m = sd[gi][Math.floor(k / Pn)]; m.set(s, (m.get(s) || 0) + v); };
      grid.forEach((row, gi) => row.forEach((s, k) => add(gi, k, s, 1)));
      const cellCost = (gi, k) => { const s = grid[gi][k]; if (!s) return 0; let c = 0; const t = tch(gi, s);
        if (t) { const n = tc[k].get(t) || 0; if (n > 1) c += 10 * (n - 1); if (blk[t] && blk[t].has(Math.floor(k / Pn) + '-' + (k % Pn))) c += 8; }
        const n2 = sd[gi][Math.floor(k / Pn)].get(s) || 0; if (n2 > mx) c += 3 * (n2 - mx) / n2;
        if (P.noDouble) { const p = k % Pn; if (p > 0 && grid[gi][k - 1] === s) c += 1; if (p < Pn - 1 && grid[gi][k + 1] === s) c += 1; }
        return c; };
      const total = () => { let c = 0; grid.forEach((r, gi) => r.forEach((_, k) => c += cellCost(gi, k))); return c; };
      // تكلفة الخلايا المتأثرة بتبديل خانتين في فصل واحد
      const affected = (gi, a, b) => { const set = new Set([gi + ':' + a, gi + ':' + b]); [a, b].forEach(k => { G.forEach((_, gj) => { if (gj !== gi && grid[gj][k]) set.add(gj + ':' + k); }); const d = Math.floor(k / Pn); for (let q = d * Pn; q < d * Pn + Pn; q++) set.add(gi + ':' + q); }); return [...set].map(x => x.split(':').map(Number)); };
      const sumC = L => L.reduce((a, [g, k]) => a + cellCost(g, k), 0);
      let cost = total(), T0 = 2.5; const it = opt.iters || 60000;
      for (let i = 0; i < it && cost > 0.001; i++) {
        const gi = Math.floor(Math.random() * G.length), a = Math.floor(Math.random() * N); let b = Math.floor(Math.random() * N); if (a === b || grid[gi][a] === grid[gi][b]) continue;
        const L = affected(gi, a, b), before = sumC(L);
        const sa = grid[gi][a], sb = grid[gi][b]; add(gi, a, sa, -1); add(gi, b, sb, -1); grid[gi][a] = sb; grid[gi][b] = sa; add(gi, a, sb, 1); add(gi, b, sa, 1);
        const after = sumC(L), dlt = after - before, temp = T0 * (1 - i / it) + 0.02;
        if (dlt <= 0 || Math.random() < Math.exp(-dlt / temp)) cost += dlt;
        else { add(gi, a, sb, -1); add(gi, b, sa, -1); grid[gi][a] = sa; grid[gi][b] = sb; add(gi, a, sa, 1); add(gi, b, sb, 1); }
      }
      cost = total();
      if (!best || cost < best.cost) best = { cost, grid: grid.map(r => r.slice()) };
      if (best.cost < 0.001) break;
    }
    // تقرير المشكلات
    const issues = []; const tcount = {};
    best.grid.forEach((r, gi) => r.forEach((s, k) => { const t = tch(gi, s); if (t) { const key = k + '|' + t; (tcount[key] = tcount[key] || []).push(gi); } }));
    Object.entries(tcount).forEach(([key, l]) => { if (l.length > 1) { const [k, t] = key.split('|'); issues.push(`تعارض: ${A.personName(t)} في ${A.DAYS[Math.floor(k / Pn)]} الحصة ${+k % Pn + 1} (${l.map(g => G[g].c.name).join('، ')})`); } });
    return { D, Pn, G, grid: best.grid, cost: best.cost, issues, tch };
  }
  A._planState = () => P;
  function tGen(box, root) {
    const cls = secClasses().filter(c => rowTot(c.id)); const miss = []; cls.forEach(c => allSubs().forEach(s => { if (H(c.id, s) && !T(c.id, s)) miss.push(1); }));
    const ld = {}; cls.forEach(c => allSubs().forEach(s => { const t = T(c.id, s); if (t) ld[t] = (ld[t] || 0) + H(c.id, s); }));
    const heavy = Object.entries(ld).filter(([, n]) => n > cap());
    box.innerHTML = `<div class="sec-box" style="margin-top:12px"><div class="row" style="justify-content:space-between;gap:10px"><div><b>توليد جدول ${AR(cls.length)} فصلاً من التوزيع</b>
        <p class="small muted" style="margin:4px 0 0">يراعي: عدد حصص كل مادة، عدم تعارض المعلم، أقصى ${AR(P.maxDay || 2)} حصص للمادة يومياً${P.noDouble ? '، تجنب التتالي' : ''}، وأوقات عدم الإتاحة.${miss.length ? ` <b style="color:var(--warn,#b54708)">${AR(miss.length)} خلية بلا معلم — ستُجدول بلا تعارض معلمين.</b>` : ''}</p></div>
        <button class="btn sky" id="gGo">توليد</button></div>${heavy.length ? `<div class="notice bad" style="margin-top:10px">لا يمكن جدولة معلم بأكثر من ${AR(cap())} حصة أسبوعياً: ${heavy.map(([t, n]) => `${esc(A.personName(t))} (${AR(n)})`).join('، ')} — وزّع حصصه على معلم آخر من تبويب «المعلمون».</div>` : ''}<div id="gOut"></div></div>`;
    if (lastGen) showGen($('#gOut', box), root);
    $('#gGo', box).onclick = e => A.run(e.currentTarget, async () => {
      if (dirty) await save(true);
      $('#gOut', box).innerHTML = '<div class="spinner"></div>'; await new Promise(r => setTimeout(r, 30));
      lastGen = solve({ restarts: 5, iters: 80000 }); showGen($('#gOut', box), root);
    });
  }
  function showGen(out, root) {
    const g = lastGen; let sel = A.LS.get('pl_gc'); if (!g.G.some(x => x.c.id === sel)) sel = g.G[0].c.id; const gi = g.G.findIndex(x => x.c.id === sel);
    out.innerHTML = `<div class="notice ${g.issues.length ? 'warn' : 'ok'}" style="margin-top:10px">${g.issues.length ? `${AR(g.issues.length)} مشكلة متبقية — أعد التوليد أو خفّف القيود، أو أنشئ المسودة وعدّلها يدوياً.<ul class="small" style="margin:6px 0 0">${g.issues.slice(0, 8).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : 'جدول بلا تعارضات ويحقق كل القيود.'}</div>
      <div class="row" style="gap:8px;margin:10px 0"><label class="small">عرض فصل <select class="in" id="gC" style="max-width:220px">${g.G.map(x => `<option value="${x.c.id}" ${x.c.id === sel ? 'selected' : ''}>${esc(x.c.name)}</option>`).join('')}</select></label><div class="grow"></div><button class="btn ghost sm" id="gRe">إعادة التوليد</button><button class="btn ok" id="gSave">${I.send} إنشاء مسودة جدول للمراجعة</button></div>
      <div class="scroll"><table class="tbl pl-grid"><thead><tr><th></th>${Array.from({ length: g.Pn }, (_, p) => `<th>${AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: g.D }, (_, d) => `<tr><th>${A.DAYS[d]}</th>${Array.from({ length: g.Pn }, (_, p) => { const s = g.grid[gi][d * g.Pn + p], t = g.tch(gi, s); return `<td>${s ? `<b>${esc(sName(s))}</b>${t ? `<div class="small muted">${esc(A.personName(t))}</div>` : ''}` : '<span class="faint">—</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    $('#gC', out).onchange = e => { A.LS.set('pl_gc', e.target.value); showGen(out, root); };
    $('#gRe', out).onclick = e => A.run(e.currentTarget, async () => { lastGen = solve({ restarts: 5, iters: 80000 }); showGen(out, root); });
    $('#gSave', out).onclick = e => A.run(e.currentTarget, async () => {
      const v = await api.createDraft({ section_id: S.sectionId, label: 'من توزيع الحصص — ' + new Date().toLocaleDateString('ar-SA-u-nu-latn'), source: 'توزيع الحصص', created_by: S.me.id });
      const vs = await api.ttVersions(S.sectionId), ap = vs.find(x => x.status === 'approved'), ids = new Set(g.G.map(x => x.c.id));
      if (ap) { const sl = (await api.ttSlots(ap.id)).filter(x => !ids.has(x.class_id)); if (sl.length) await api.replaceSlots(v.id, sl.map(({ class_id, day, period, subject_id, teacher_id }) => ({ class_id, day, period, subject_id, teacher_id }))); }
      const rows = []; g.G.forEach((x, gi) => g.grid[gi].forEach((s, k) => rows.push({ class_id: x.c.id, day: Math.floor(k / g.Pn), period: k % g.Pn, subject_id: s || null, teacher_id: g.tch(gi, s) || null })));
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
