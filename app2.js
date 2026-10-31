/* منصة الخطة الأسبوعية — التصدير، الجدول الدراسي، الأسابيع، الإدارة */
(function () {
  const A = window.APP, V = window.VIEWS;
  const { api, S, $, $$, esc, AR, DAYS, PER, ORD, WSTATUS, ROLES, PERMS, ROLE_DEFAULTS, I } = A;

  // =====================================================================
  //  التصدير
  // =====================================================================
  // ---------- خيارات القالب ----------
  const TEMPLATES = [
    ['classic', 'هوية دينا — طولي', 'غلاف + صفحة لكل يوم (المعتمد)', { layout: 'daily', orientation: 'portrait' }, '<i style="inset:8px 30% 8px 30%;background:#fff"></i><i style="top:16px;left:34%;right:34%;height:10px;background:#082B5A"></i><i style="top:32px;left:34%;right:34%;height:44px;background:#3AB1DB;opacity:.5"></i>'],
    ['classic-land', 'هوية دينا — عرضي', 'نفس التصميم بصفحات أفقية', { layout: 'daily', orientation: 'landscape' }, '<i style="inset:18px 12% 18px 12%;background:#fff"></i><i style="top:24px;left:16%;right:16%;height:8px;background:#082B5A"></i><i style="top:36px;left:16%;right:16%;height:30px;background:#3AB1DB;opacity:.5"></i>'],
    ['band', 'الشريط المزخرف — طولي', 'شريط كحلي بزخرفة الزهرة وغلاف بحقول كبسولية', { layout: 'daily', orientation: 'portrait', style: 'band' }, '<i style="inset:8px 30% 8px 30%;background:#fff"></i><i style="top:8px;left:30%;right:30%;height:12px;background:#082B5A"></i><i style="bottom:8px;left:30%;right:30%;height:12px;background:#082B5A"></i><i style="top:40px;left:38%;right:44%;height:8px;background:#2E7FC9;border-radius:6px"></i><i style="top:40px;left:44%;right:36%;height:8px;background:#3AB1DB;opacity:.5;border-radius:6px"></i><i style="top:54px;left:38%;right:44%;height:8px;background:#2E7FC9;border-radius:6px"></i><i style="top:54px;left:44%;right:36%;height:8px;background:#3AB1DB;opacity:.5;border-radius:6px"></i>'],
    ['band-land', 'الشريط المزخرف — عرضي', 'نفس الهوية بصفحات أفقية', { layout: 'daily', orientation: 'landscape', style: 'band' }, '<i style="inset:18px 12% 18px 12%;background:#fff"></i><i style="top:18px;left:12%;right:12%;height:10px;background:#082B5A"></i><i style="bottom:18px;left:12%;right:12%;height:10px;background:#082B5A"></i><i style="top:40px;left:30%;right:46%;height:8px;background:#2E7FC9;border-radius:6px"></i><i style="top:40px;left:46%;right:30%;height:8px;background:#3AB1DB;opacity:.5;border-radius:6px"></i>'],
    ['overview', 'نظرة أسبوعية', 'الأسبوع كاملاً في صفحة عرضية واحدة', { layout: 'overview', orientation: 'landscape' }, '<i style="inset:18px 12% 18px 12%;background:#fff"></i><i style="top:24px;left:16%;width:10%;bottom:24px;right:auto;background:#082B5A"></i>' + [0, 1, 2, 3].map(k => `<i style="top:${26 + k * 11}px;left:28%;right:16%;height:7px;background:${k % 2 ? '#E4EBF5' : '#84B7E3'}"></i>`).join('')],
  ];
  function expOpts() { let o = {}; try { o = JSON.parse(A.LS.get('expopts') || '{}'); } catch (e) { } const t = TEMPLATES.find(x => x[0] === (o.tpl || 'classic')) || TEMPLATES[0]; const sec = A.section() || {}; const st = (S.school && S.school.settings) || {};
    return { tpl: t[0], ...t[3], ink: !!o.ink, cover: o.cover !== false, notes: o.notes !== false, extras: o.extras !== false, theme: o.theme || sec.theme || 'dina', rich: !!o.rich, coverImg: o.noimg ? '' : ((st.cover_images || {})[sec.id] || '') }; }
  function setExpOpts(p) { const o = { ...expOpts(), ...p }; A.LS.set('expopts', JSON.stringify({ tpl: o.tpl, ink: o.ink, cover: o.cover, notes: o.notes, extras: o.extras, theme: o.theme, rich: o.rich, noimg: o.noimg })); }
  function optsPanel(box, onChange) {
    const o = expOpts();
    box.innerHTML = `<h3>قالب الطباعة والتصدير</h3><div class="tpl-grid">${TEMPLATES.map(([k, l, d, , pv]) => `<label class="tpl ${o.tpl === k ? 'on' : ''}"><input type="radio" name="tpl" value="${k}" ${o.tpl === k ? 'checked' : ''}><div class="pv">${pv}</div>${l}<small>${d}</small></label>`).join('')}</div>
      <div class="row" style="margin-top:12px;gap:8px"><span class="small muted">هوية الألوان:</span>${[['dina', 'دينا — سماوي', '#3AB1DB'], ['royal', 'دينا — أزرق ملكي', '#2E7FC9'], ['lavender', 'دينا — بنفسجي (بنات)', '#AE95DA'], ['green', 'دينا — أخضر', '#8CC56A'], ['gold', 'دينا — ذهبي للمناسبات', '#C9A44C']].map(([k, l, c]) => `<button type="button" class="btn ${o.theme === k ? '' : 'ghost'} sm" data-th="${k}"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${c};box-shadow:0 0 0 2px #fff,0 0 0 3px #082B5A"></span> ${l}</button>`).join('')}</div>
      <div class="row" style="margin-top:12px;gap:18px">${[['rich', 'زخارف مجسمة'], ['cover', 'صفحة الغلاف'], ['notes', 'ملاحظات اليوم'], ['extras', 'الصفحات الإضافية'], ['ink', 'موفّر للحبر (بلا خلفيات داكنة)']].map(([k, l]) => `<label class="chk"><input type="checkbox" data-o="${k}" ${o[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div>`;
    $$('input[name=tpl]', box).forEach(i => i.onchange = () => { setExpOpts({ tpl: i.value }); optsPanel(box, onChange); onChange && onChange(); });
    $$('[data-o]', box).forEach(i => i.onchange = () => { setExpOpts({ [i.dataset.o]: i.checked }); onChange && onChange(); });
    $$('[data-th]', box).forEach(b => b.onclick = () => { setExpOpts({ theme: b.dataset.th }); optsPanel(box, onChange); onChange && onChange(); });
  }
  V._optsPanel = optsPanel; V._buildDoc = c => buildDoc(c);
  function buildDoc(c) {
    const w = A.week(), sec = A.section();
    const days = [], dayNotes = [], extra = [];
    // الواجبات وأوراق العمل الإلكترونية المرتبطة بهذا الأسبوع وهذا الفصل
    const QK = { quiz: 'اختبار قصير', worksheet: 'ورقة عمل', homework: 'واجب إلكتروني', remedial: 'ورقة دعم' };
    const qURL = code => location.href.split('#')[0].replace(/[^/]*$/, '') + 'student.html?q=' + code;
    const wq = (S.weekQuizzes || []).filter(z => (z.class_ids || []).includes(c.id));
    for (let d = 0; d < sec.days; d++) {
      const hol = A.holidayOf(d);
      const rows = [];
      for (let p = 0; p < sec.periods; p++) {
        const e = S.entries.find(x => x.class_id === c.id && x.day === d && x.period === p) || {};
        rows.push(hol ? [A.subjName(e.subject_id), hol.label || 'إجازة', ''] : [A.subjName(e.subject_id), e.topic || '', e.homework || '']);
      }
      if (hol) rows.forEach(r => r[1] = (hol.label || 'إجازة').includes('إجازة') ? (hol.label || 'إجازة') : 'إجازة — ' + hol.label);
      days.push(rows);
      const dn = [];
      if (!hol) S.entries.filter(x => x.class_id === c.id && x.day === d && (x.note || '').trim()).sort((a, b) => a.period - b.period).forEach(x => dn.push([A.subjName(x.subject_id), x.note]));
      S.notes.filter(n => n.placement === 'day' && n.day === d && (n.class_id === c.id || n.class_id === null)).forEach(n => dn.push([n.title, n.body]));
      if (!hol) wq.filter(z => z.day === d).forEach(z => dn.push([`${QK[z.kind] || 'واجب إلكتروني'} — ${A.subjName(z.subject_id)}`, `${z.title}: ${qURL(z.code)}`]));
      dayNotes.push(dn);
    }
    S.notes.filter(n => n.placement === 'extra' && (n.class_id === c.id || n.class_id === null)).forEach(n => extra.push([n.title, n.body]));
    const flex = wq.filter(z => z.day == null);
    if (flex.length) extra.push(['الواجبات وأوراق العمل الإلكترونية هذا الأسبوع', flex.map(z => `${A.subjName(z.subject_id)} — ${QK[z.kind] || ''}: ${z.title}\n${qURL(z.code)}`).join('\n')]);
    const term = S.school.term_label || '';
    return {
      info: { name: c.name, stage: c.stage, grade_word: c.grade_word, class_label: c.class_label },
      week: { word: w.word, term, dates: A.weekDates(w, sec.days), footer: term.replace(/العام الدراسي\s*/, '') },
      days, dayNotes, extra,
      extraPages: (S.extraPages || []).filter(x => x.class_id === c.id || x.class_id === null),
      opts: expOpts(),
    };
  }
  const fileName = c => `الخطة الأسبوعية للأسبوع ${A.week().word} - ${c.name}`;
  V._preview = async function (c) {
    const m = A.modal(`<div class="row" style="margin:0 0 10px 40px"><h3 style="margin:0;flex:1">${esc(fileName(c))}</h3>
      <button class="btn sky sm" id="pp">${I.print} طباعة / حفظ PDF</button><button class="btn ghost sm" id="pd">${I.down} تنزيل PDF</button></div>
      <div style="flex:1;min-height:0;border-radius:12px;overflow:hidden" id="pf"><div class="spinner"></div></div>
      <p class="small muted" style="margin:8px 0 0">«طباعة / حفظ PDF» تعطي أعلى جودة (نص قابل للتحديد): اختر «حفظ بتنسيق PDF» في نافذة الطباعة. «تنزيل PDF» يحفظ مباشرة كصور عالية الدقة.</p>`, { cls: 'full', noFocus: true });
    const f = PlanExport.makeFrame(true); const box = m.el.querySelector('#pf');
    box.innerHTML = ''; box.appendChild(f);
    const op = document.createElement('div'); op.className = 'card'; op.style.cssText = 'padding:12px;margin-bottom:10px;box-shadow:none';
    box.parentNode.insertBefore(op, box);
    const draw = async () => { box.style.opacity = .4; await PlanExport.renderInto(f, buildDoc(c), fileName(c)); box.style.opacity = 1; };
    optsPanel(op, draw); op.querySelector('h3').style.display = 'none';
    await draw();
    m.el.querySelector('#pp').onclick = () => { f.contentWindow.focus(); f.contentWindow.print(); };
    m.el.querySelector('#pd').onclick = e => A.run(e.currentTarget, async () => A.download(await PlanExport.toPdfBlob(buildDoc(c), fileName(c)), fileName(c) + '.pdf'));
  };
  V.export = function (root) {
    const w = A.week();
    if (!w) { root.innerHTML = `<div class="card">${A.emptyBox('لا توجد أسابيع')}</div>`; return; }
    const rows = S.classes.filter(c => c.active).map(c => ({ c, s: A.stats(S.entries.filter(e => e.class_id === c.id)) }));
    const ready = r => r.s.filled >= r.s.total - 1;
    root.innerHTML = `<div class="card">
      <div class="head"><div class="grow"><h2>تصدير ملفات الأسبوع ${esc(w.word)}</h2><p class="sub" style="margin:2px 0 0">القالب: <b>هوية دينا ٢٠٢٦</b> (المعتمد) · ${esc(A.section().name)} · ${AR(rows.filter(ready).length)} من ${A.cnt(rows.length, 'فصل', 'فصول')} جاهز</p></div>
        <div class="row"><label class="chk"><input type="checkbox" id="onlyReady" checked> الجاهزة فقط</label><button class="btn" id="zipB">${I.down} تنزيل المحدد (ZIP)</button></div></div>
      <div id="optsBox" class="sec-box" style="margin-bottom:14px"></div>
      <div class="notice info">الفصل «جاهز» عندما تكتمل حصصه (يُسمح بحصة واحدة ناقصة). الخانات الفارغة تظهر بعلامة «–». اسم الملف: <code class="k">${esc(fileName({ name: 'اسم الفصل' }))}.pdf</code></div>
      <div class="scroll"><table class="tbl"><thead><tr><th style="width:34px"><input type="checkbox" id="sa" checked></th><th>الفصل</th><th style="width:26%">الإنجاز</th><th>الحالة</th><th>معتمدة</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr><td><input type="checkbox" data-x="${r.c.id}" ${ready(r) ? 'checked' : ''}></td><td><b>${esc(r.c.name)}</b></td><td><div class="row" style="flex-wrap:nowrap">${A.bar(r.s.filled, r.s.total)}<span class="small muted">${AR(r.s.filled)}/${AR(r.s.total)}</span></div></td><td>${ready(r) ? '<span class="pill st-approved">جاهز</span>' : '<span class="pill st-returned">غير مكتمل</span>'}</td><td>${AR(r.s.approved)}</td><td class="row" style="flex-wrap:nowrap"><button class="btn sky sm" data-pv="${r.c.id}">${I.eye} معاينة</button><button class="btn ghost sm" data-dl="${r.c.id}">${I.down} PDF</button></td></tr>`).join('')}
      </tbody></table></div>
      <div class="small muted" id="zipProg" style="margin-top:10px"></div></div>`;
    optsPanel($('#optsBox', root));
    $('#sa', root).onchange = e => $$('[data-x]', root).forEach(i => i.checked = e.target.checked);
    $('#onlyReady', root).onchange = e => $$('[data-x]', root).forEach(i => { const r = rows.find(x => x.c.id === i.dataset.x); i.checked = e.target.checked ? ready(r) : true; });
    $$('[data-pv]', root).forEach(b => b.onclick = () => V._preview(A.cls(b.dataset.pv)));
    $$('[data-dl]', root).forEach(b => b.onclick = () => A.run(b, async () => { const c = A.cls(b.dataset.dl); A.download(await PlanExport.toPdfBlob(buildDoc(c), fileName(c)), fileName(c) + '.pdf'); }));
    $('#zipB', root).onclick = e => A.run(e.currentTarget, async () => {
      const ids = $$('[data-x]:checked', root).map(i => i.dataset.x); if (!ids.length) throw new Error('حدّد فصلاً واحداً على الأقل');
      const zip = new JSZip(); const pr = $('#zipProg', root);
      for (let i = 0; i < ids.length; i++) { const c = A.cls(ids[i]); pr.textContent = `جارٍ إنشاء ${AR(i + 1)} من ${AR(ids.length)}: ${c.name}`; zip.file(fileName(c) + '.pdf', await PlanExport.toPdfBlob(buildDoc(c), fileName(c))); }
      pr.textContent = 'جارٍ الضغط…';
      A.download(await zip.generateAsync({ type: 'blob' }), `ملفات الخطة الأسبوعية ${w.word} لـ${A.section().name}.zip`);
      pr.textContent = `تم تنزيل ${A.cnt(ids.length, 'ملف', 'ملفات')}.`;
    });
  };

  // =====================================================================
  //  الجدول الدراسي
  // =====================================================================
  const T = { versions: [], slots: {}, tab: null, cls: null, draft: null };
  async function loadVersions() { T.versions = await api.ttVersions(S.sectionId); }
  async function slotsOf(v) { if (!T.slots[v]) T.slots[v] = await api.ttSlots(v); return T.slots[v]; }
  const approved = () => T.versions.find(v => v.status === 'approved');
  const teachersOpts = (sel) => `<option value="">— بلا معلم —</option>` + S.staff.filter(p => p.active).map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('');
  const subjOpts = (sel) => `<option value="">— فراغ —</option>` + S.subjects.map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
  V.timetable = async function (root) {
    root.innerHTML = '<div class="spinner"></div>';
    T.slots = {}; await loadVersions();
    T.tab = A.LS.get('tttab') || 'view';
    const tabs = [['view', 'الجدول المعتمد'], ['load', 'نصاب المعلمين'], ['assign', 'إسناد المعلمين'], ['drafts', 'تعديل واستيراد الجدول']];
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>الجدول الدراسي — ${esc(A.section().name)}</h2>
      <p class="sub" style="margin:2px 0 0">${approved() ? `المعتمد: <b>${esc(approved().label)}</b> · ${A.fmtDT(approved().approved_at)}` : '<span style="color:var(--bad)">لا يوجد جدول معتمد</span>'}</p></div></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${T.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="tt"></div></div>`;
    $$('.tabs button', root).forEach(b => b.onclick = () => { A.LS.set('tttab', b.dataset.t); V.timetable(root); });
    const box = $('#tt', root);
    if (T.tab === 'view') return ttView(box);
    if (T.tab === 'assign') return ttAssign(box);
    if (T.tab === 'load') return ttLoad(box);
    return ttDrafts(box, root);
  };
  function classChips(box, onPick, cur) {
    const d = document.createElement('div'); d.className = 'row'; d.style.marginBottom = '12px';
    S.classes.filter(c => c.active).forEach(c => { const b = document.createElement('button'); b.className = 'btn sm ' + (c.id === cur ? '' : 'ghost'); b.textContent = c.name; b.onclick = () => onPick(c.id); d.appendChild(b); });
    box.appendChild(d);
  }
  // تعارض المعلم: نفس المعلم في أكثر من فصل في نفس اليوم والحصة
  function clashes(slots) {
    const m = new Map();
    slots.forEach(s => { if (!s.teacher_id || !s.subject_id) return; const k = s.teacher_id + '|' + s.day + '|' + s.period; (m.get(k) || m.set(k, []).get(k)).push(s); });
    for (const [k, l] of m) if (l.length < 2) m.delete(k);
    return m;
  }
  const clashOf = (cm, s) => (s && s.teacher_id) ? (cm.get(s.teacher_id + '|' + s.day + '|' + s.period) || []).filter(x => x.class_id !== s.class_id) : [];
  function grid(slots, c, editable, base, opt = {}) {
    const sec = A.section(); const cm = opt.clash || null;
    let h = `<div class="scroll"><table class="tt tt-days"><thead><tr><th style="width:90px"></th>${Array.from({ length: sec.periods }, (_, p) => `<th>الحصة ${PER[p]}</th>`).join('')}</tr></thead><tbody>`;
    for (let d = 0; d < sec.days; d++) {
      h += `<tr class="dayrow d${d % 2}"><td class="dayh">${DAYS[d]}</td>`;
      for (let p = 0; p < sec.periods; p++) {
        const s = slots.find(x => x.class_id === c && x.day === d && x.period === p) || {};
        const b = base ? (base.find(x => x.class_id === c && x.day === d && x.period === p) || {}) : null;
        const chg = b && ((b.subject_id || null) !== (s.subject_id || null) || (b.teacher_id || null) !== (s.teacher_id || null));
        const cl = cm ? clashOf(cm, s) : [];
        h += editable
          ? `<td class="${chg ? 'chg' : ''}"><select data-d="${d}" data-p="${p}" data-f="subject_id">${subjOpts(s.subject_id)}</select><select data-d="${d}" data-p="${p}" data-f="teacher_id" style="margin-top:4px">${teachersOpts(s.teacher_id)}</select></td>`
          : `<td class="${s.subject_id && !s.teacher_id ? 'noteach' : ''} ${cl.length ? 'clash' : ''}">${opt.edit ? `<button class="slot-ed" data-sd="${d}" data-sp="${p}" title="تعديل هذه الحصة" aria-label="تعديل حصة ${DAYS[d]} الحصة ${PER[p]}">✎</button>` : ''}<div class="s">${esc(A.subjName(s.subject_id)) || '<span class="faint">—</span>'}</div><div class="t">${s.subject_id ? (s.teacher_id ? esc(A.personName(s.teacher_id)) : `<a href="#" class="assignlink" data-assign-c="${c}" data-assign-s="${s.subject_id}">بلا معلم — إسناد</a>`) : ''}</div>${cl.length ? `<div class="clash-n" title="المعلم نفسه في هذه الحصة لدى فصل آخر">تعارض: ${cl.map(x => esc((A.cls(x.class_id) || {}).name || '')).join('، ')}</div>` : ''}</td>`;
      }
      h += '</tr>';
    }
    return h + '</tbody></table></div>';
  }
  // ملخص الفصل: المادة وعدد حصصها الأسبوعية ومعلمها
  function classSummary(slots, c) {
    const by = {}; slots.filter(s => s.class_id === c && s.subject_id).forEach(s => { const o = by[s.subject_id] = by[s.subject_id] || { n: 0, t: {} }; o.n++; o.t[s.teacher_id || ''] = (o.t[s.teacher_id || ''] || 0) + 1; });
    const rows = Object.entries(by).sort((a, b) => b[1].n - a[1].n || A.subjName(a[0]).localeCompare(A.subjName(b[0]), 'ar'));
    const tot = rows.reduce((a, [, o]) => a + o.n, 0);
    return `<div class="sec-box" style="margin-top:14px"><div class="row" style="justify-content:space-between"><b>ملخص ${esc((A.cls(c) || {}).name || '')}</b><span class="small muted">${A.cnt(rows.length, 'مادة', 'مواد')} · ${A.cnt(tot, 'حصة', 'حصص')} أسبوعياً</span></div>
      <div class="scroll" style="margin-top:8px"><table class="tbl"><thead><tr><th>المادة</th><th>الحصص الأسبوعية</th><th>المعلم</th></tr></thead><tbody>
      ${rows.map(([sid, o]) => `<tr><td><b>${esc(A.subjName(sid))}</b></td><td>${AR(o.n)}</td><td>${Object.entries(o.t).map(([t, n]) => t ? `${esc(A.personName(t))}${Object.keys(o.t).length > 1 ? ` <span class="small muted">(${AR(n)})</span>` : ''}` : `<a href="#" class="assignlink" data-assign-c="${c}" data-assign-s="${sid}">بلا معلم — إسناد</a>`).join('، ')}</td></tr>`).join('') || `<tr><td colspan="3" class="muted">لا توجد حصص</td></tr>`}
      </tbody></table></div></div>`;
  }
  // تعديل حصة واحدة في الجدول المعتمد — يسري فوراً على الأسابيع الجارية والقادمة دون مسّ ما أدخله المعلمون
  async function slotDialog(c, d, p, onDone) {
    if (!T.versions.length || !approved()) await loadVersions();
    const v = approved(); if (!v) return A.toast('لا يوجد جدول معتمد', 'err');
    const sl = await slotsOf(v.id); const s = sl.find(x => x.class_id === c && x.day === d && x.period === p) || {};
    const busy = tid => sl.filter(x => x.teacher_id === tid && x.day === d && x.period === p && x.class_id !== c);
    const m = A.modal(`<h3>تعديل حصة — ${esc((A.cls(c) || {}).name || '')} · ${DAYS[d]} · الحصة ${PER[p]}</h3>
      <p class="sub">يُطبَّق على الجدول المعتمد، ثم على الأسبوع الحالي والأسابيع القادمة فوراً. الخلية التي فيها محتوى من المعلم لا تُغيَّر مادتها تلقائياً؛ تظهر لك في «تعارضات تحتاج قرارك».</p>
      <div class="grid g2"><div class="field"><label for="sdS">المادة</label><select class="in" id="sdS">${subjOpts(s.subject_id)}</select></div>
      <div class="field"><label for="sdT">المعلم</label><select class="in" id="sdT">${teachersOpts(s.teacher_id)}</select></div></div>
      <div id="sdW" class="small" style="min-height:20px"></div>
      <div class="acts"><button class="btn" id="sdGo">حفظ التعديل</button></div>`);
    const warn = () => { const t = m.el.querySelector('#sdT').value; const b = t ? busy(t) : []; m.el.querySelector('#sdW').innerHTML = b.length ? `<div class="notice warn" style="display:block">تعارض: ${esc(A.personName(t))} لديه حصة في نفس الوقت في ${b.map(x => esc((A.cls(x.class_id) || {}).name || '')).join('، ')}. يمكنك الحفظ مؤقتاً وسيظهر التعارض بوضوح في الجدول.</div>` : ''; };
    m.el.querySelector('#sdT').onchange = warn; warn();
    m.el.querySelector('#sdGo').onclick = e => A.run(e.currentTarget, async () => {
      const sid = m.el.querySelector('#sdS').value || null, tid = m.el.querySelector('#sdT').value || null;
      const r = await api.editSlot(c, d, p, sid, tid);
      T.slots[v.id] = null; m.close();
      const parts = []; if (r.teacher_fixed) parts.push(`حُدِّث المعلم في ${A.cnt(r.teacher_fixed, 'خلية', 'خلايا')}`); if (r.subject_changed) parts.push(`تغيّرت المادة في ${A.cnt(r.subject_changed, 'خلية فارغة', 'خلايا فارغة')}`); if (r.conflicts) parts.push(`${A.cnt(r.conflicts, 'خلية فيها محتوى', 'خلايا فيها محتوى')} بانتظار قرارك`);
      A.toast('حُفظت الحصة' + (parts.length ? ' — ' + parts.join(' · ') : ''), 'ok');
      await A.loadWeek(); if (onDone) await onDone();
    });
  }
  A.slotDialog = slotDialog;
  // خلايا فيها محتوى مادتها تخالف الجدول بعد التعديل — قرار صريح فقط
  async function conflictsPanel(el, refresh) {
    if (!A.perm('timetable_edit') || !api.slotConflicts) { el.innerHTML = ''; return; }
    let list = []; try { list = await api.slotConflicts(S.sectionId); } catch (_) { }
    const withContent = list.filter(x => (x.topic || '').trim());
    if (!withContent.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<details class="sec-box" style="margin-top:14px;border-color:var(--warn)"><summary><b>تعارضات تحتاج قرارك (${AR(withContent.length)})</b> <span class="small muted">خلايا كتب فيها المعلم محتوى، ومادتها في الخطة تختلف عن الجدول الحالي — لم تُغيَّر تلقائياً</span></summary>
      <div class="scroll" style="margin-top:8px"><table class="tbl"><thead><tr><th>الأسبوع</th><th>الفصل</th><th>اليوم/الحصة</th><th>في الخطة</th><th>في الجدول</th><th>المحتوى</th><th></th></tr></thead><tbody>
      ${withContent.map(x => `<tr><td>${AR(x.week_number)}</td><td><b>${esc((A.cls(x.class_id) || {}).name || '')}</b></td><td>${DAYS[x.day]} · ${AR(x.period + 1)}</td><td>${esc(A.subjName(x.entry_subject) || '—')}</td><td>${esc(A.subjName(x.slot_subject) || '—')}${x.slot_teacher ? `<div class="small muted">${esc(A.personName(x.slot_teacher))}</div>` : ''}</td><td class="small">${esc(x.topic)}</td><td><button class="btn ghost sm" data-cfa="${x.entry_id}" title="تُنقل الخلية لمادة الجدول ويبقى النص كما هو">اعتماد مادة الجدول</button></td></tr>`).join('')}
      </tbody></table></div><p class="small muted">«اعتماد مادة الجدول» يغيّر مادة الخلية ومعلمها فقط، ويبقى النص المكتوب كما هو. اتركها إن كان الصحيح ما في الخطة، ثم صحّح الجدول بدلاً من ذلك.</p></details>`;
    $$('[data-cfa]', el).forEach(b => b.onclick = () => A.run(b, async () => { await api.slotConflictApply(b.dataset.cfa); await A.loadWeek(); A.toast('طُبِّقت مادة الجدول على الخلية', 'ok'); refresh(); }));
  }
  async function ttView(box) {
    const v = approved(); if (!v) { box.innerHTML = A.emptyBox('لا يوجد جدول معتمد', 'أنشئ مسودة من تبويب «تعديل واستيراد الجدول» ثم اعتمدها.'); return; }
    const sl = await slotsOf(v.id); const cm = clashes(sl); const canE = A.perm('timetable_edit');
    T.cls = T.cls && A.cls(T.cls) ? T.cls : (S.classes[0] || {}).id;
    const open = A.LS.get('ttfold') !== '0';
    box.innerHTML = ''; classChips(box, id => { T.cls = id; ttView(box); }, T.cls);
    const allClash = [...cm.values()];
    box.insertAdjacentHTML('beforeend', `${allClash.length ? `<details class="notice warn" style="display:block;margin-bottom:10px"><summary><b>${A.cnt(allClash.length, 'تعارض', 'تعارضات')} في القسم</b> — معلم في أكثر من فصل في نفس الحصة (مسموح مؤقتاً ويظهر بلون مميز). اضغط لعرضها.</summary><div style="margin-top:6px">${allClash.map(l => `<button class="ldc ldbtn" data-gc="${l[0].class_id}">${esc(A.personName(l[0].teacher_id))} · ${DAYS[l[0].day]} الحصة ${PER[l[0].period]}: ${l.map(x => esc((A.cls(x.class_id) || {}).name || '')).join(' + ')}</button>`).join('')}</div></details>` : ''}
      <details class="ttfold" ${open ? 'open' : ''}><summary><b>جدول ${esc((A.cls(T.cls) || {}).name || '')}</b> <span class="small muted">${canE ? 'اضغط ✎ على أي حصة لتصحيحها — يسري فوراً على الخطط والأسابيع القادمة' : 'اضغط للطي أو الفتح'}</span></summary>${grid(sl, T.cls, false, null, { clash: cm, edit: canE })}</details>
      ${classSummary(sl, T.cls)}<div id="cfp"></div>`);
    const fold = $('.ttfold', box); fold.ontoggle = () => A.LS.set('ttfold', fold.open ? '1' : '0');
    $$('[data-gc]', box).forEach(b => b.onclick = () => { T.cls = b.dataset.gc; ttView(box); });
    $$('[data-sd]', box).forEach(b => b.onclick = () => slotDialog(T.cls, +b.dataset.sd, +b.dataset.sp, () => ttView(box)));
    conflictsPanel($('#cfp', box), () => ttView(box));
  }
  async function ttAssign(box) {
    const v = approved(); if (!v) { box.innerHTML = A.emptyBox('لا يوجد جدول معتمد'); return; }
    const can = A.perm('timetable_edit');
    const sl = await slotsOf(v.id);
    const rows = [];
    S.classes.filter(c => c.active).forEach(c => {
      const bySub = {};
      sl.filter(s => s.class_id === c.id && s.subject_id).forEach(s => { (bySub[s.subject_id] = bySub[s.subject_id] || { n: 0, t: {} }).n++; bySub[s.subject_id].t[s.teacher_id || ''] = 1; });
      Object.entries(bySub).forEach(([sid, o]) => rows.push({ c, sid, n: o.n, t: Object.keys(o.t).length === 1 ? Object.keys(o.t)[0] : '*' }));
    });
    const missing = rows.filter(r => !r.t).length;
    box.innerHTML = `${missing ? `<div class="notice warn">${A.cnt(missing, 'مادة', 'مواد')} في الفصول بلا معلم مُسند. الإسناد يُطبَّق على الجدول المعتمد وعلى حصص الأسابيع المفتوحة غير المعتمدة.</div>` : '<div class="notice ok">كل المواد مُسندة إلى معلمين.</div>'}
      <div class="row" style="margin-bottom:12px"><input class="in" id="af" placeholder="بحث بالفصل أو المادة أو المعلم" style="max-width:320px"><label class="chk"><input type="checkbox" id="am"> غير المُسند فقط</label>
      ${can ? `<button class="btn ghost sm" id="bulkA">إسناد جماعي</button>` : ''}</div>
      <div class="scroll"><table class="tbl"><thead><tr><th>الفصل</th><th>المادة</th><th>عدد الحصص</th><th style="width:34%">المعلم</th></tr></thead><tbody id="ab"></tbody></table></div>`;
    const draw = () => {
      const q = A.normKey($('#af', box).value), only = $('#am', box).checked;
      $('#ab', box).innerHTML = rows.filter(r => (!only || !r.t) && (!q || A.normKey(r.c.name + ' ' + A.subjName(r.sid) + ' ' + A.personName(r.t)).includes(q))).map(r => `<tr><td><b>${esc(r.c.name)}</b></td><td>${esc(A.subjName(r.sid))}</td><td>${AR(r.n)}</td><td>${can ? `<select class="in" data-c="${r.c.id}" data-s="${r.sid}" style="padding:6px 10px">${r.t === '*' ? '<option value="*" selected>— أكثر من معلم —</option>' : ''}${teachersOpts(r.t)}</select>` : esc(A.personName(r.t) || 'بلا معلم')}</td></tr>`).join('');
      $$('select[data-c]', box).forEach(s => s.onchange = () => A.run(null, async () => {
        if (s.value === '*') return;
        const r = await api.assignTeacher(s.dataset.c, s.dataset.s, s.value || null);
        const row = rows.find(x => x.c.id === s.dataset.c && x.sid === s.dataset.s); row.t = s.value;
        sl.filter(x => x.class_id === s.dataset.c && x.subject_id === s.dataset.s).forEach(x => x.teacher_id = s.value || null);
        await A.loadWeek(); await A.refreshPeople();
        A.toast(`تم الإسناد: ${A.cnt(r.slots, 'حصة', 'حصص')} في الجدول و${AR(r.entries)} في الأسابيع المفتوحة`, 'ok');
      }));
    };
    $('#af', box).oninput = draw; $('#am', box).onchange = draw; draw();
    const bb = $('#bulkA', box);
    if (bb) bb.onclick = () => {
      const m = A.modal(`<h3>إسناد جماعي</h3><p class="sub">أسند معلماً واحداً لمادة في عدة فصول دفعة واحدة.</p>
        <div class="grid g2"><div class="field"><label>المادة</label><select class="in" id="bs">${S.subjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>المعلم</label><select class="in" id="bt">${teachersOpts('')}</select></div></div>
        <div class="field"><label>الفصول</label><div class="perm-grid" id="bc"></div></div><div class="acts"><button class="btn" id="bgo">إسناد</button></div>`, { cls: 'wide' });
      const fill = () => { const sid = m.el.querySelector('#bs').value; m.el.querySelector('#bc').innerHTML = rows.filter(r => r.sid === sid).map(r => `<label class="chk"><input type="checkbox" value="${r.c.id}" checked> ${esc(r.c.name)}</label>`).join('') || '<span class="muted small">هذه المادة غير موجودة في جدول أي فصل</span>'; };
      m.el.querySelector('#bs').onchange = fill; fill();
      m.el.querySelector('#bgo').onclick = e => A.run(e.currentTarget, async () => {
        const sid = m.el.querySelector('#bs').value, tid = m.el.querySelector('#bt').value || null;
        const cs = $$('#bc input:checked', m.el).map(i => i.value); if (!cs.length) throw new Error('اختر فصلاً');
        for (const c of cs) await api.assignTeacher(c, sid, tid);
        m.close(); await A.loadWeek(); await A.refreshPeople(); A.toast(`أُسند المعلم في ${A.cnt(cs.length, 'فصل', 'فصول')}`, 'ok'); V.timetable(box.closest('main'));
      });
    };
  }
  // ---------- نصاب المعلمين: الفصول والمواد وعدد الحصص لكل معلم، مع التعديل المباشر ----------
  async function ttLoad(box) {
    const v = approved(); if (!v) { box.innerHTML = A.emptyBox('لا يوجد جدول معتمد'); return; }
    const can = A.perm('timetable_edit');
    const sl = await slotsOf(v.id);
    let dl = []; try { dl = await api.delegations(S.sectionId); } catch (_) { }
    const act = s => s.subject_id && !(A.subj(s.subject_id) || {}).is_activity;
    const secMem = id => S.memberships.some(m => m.staff_id === id && m.section_id === S.sectionId);
    const build = () => {
      const by = {};
      sl.filter(s => s.subject_id).forEach(s => {
        const t = s.teacher_id || ''; const k = s.class_id + '|' + s.subject_id;
        const o = by[t] = by[t] || { pairs: {}, n: 0, nAct: 0 };
        (o.pairs[k] = o.pairs[k] || { c: s.class_id, s: s.subject_id, n: 0 }).n++; o.n++; if (act(s)) o.nAct++;
      });
      return by;
    };
    let by = build();
    const people = () => S.staff.filter(p => p.active && (secMem(p.id) || by[p.id])).map(p => ({ p, o: by[p.id] || { pairs: {}, n: 0, nAct: 0 } }));
    const chip = (pr, tid) => `<span class="ldc">${esc(A.subjName(pr.s))} — ${esc((A.cls(pr.c) || {}).name || '')} <b>${AR(pr.n)}</b>${can ? `<button class="ldx" title="تغيير المعلم" aria-label="تغيير المعلم" data-re="${pr.c}|${pr.s}">⇄</button><button class="ldx" title="إلغاء الإسناد" aria-label="إلغاء الإسناد" data-rm="${pr.c}|${pr.s}">×</button>` : ''}</span>`;
    const draw = () => {
      by = build();
      const q = A.normKey(($('#lq', box) || {}).value || ''); const sort = ($('#ls', box) || {}).value || 'load';
      let list = people().filter(x => !q || A.normKey(x.p.full_name + ' ' + (x.p.specialty || '') + ' ' + Object.values(x.o.pairs).map(pr => A.subjName(pr.s) + ' ' + (A.cls(pr.c) || {}).name).join(' ')).includes(q));
      list.sort((a, b) => sort === 'name' ? a.p.full_name.localeCompare(b.p.full_name, 'ar') : b.o.n - a.o.n);
      const un = by[''] || { pairs: {}, n: 0 }; const assigned = sl.filter(s => s.subject_id && s.teacher_id).length;
      $('#lsum', box).innerHTML = `<div class="kpi"><div class="k">معلمون في القسم</div><div class="v">${AR(people().length)}</div></div><div class="kpi"><div class="k">حصص مُسندة</div><div class="v">${AR(assigned)}</div><div class="d">من ${AR(assigned + un.n)} حصة في الجدول</div></div><div class="kpi"><div class="k">حصص بلا معلم</div><div class="v" style="${un.n ? 'color:var(--warn)' : ''}">${AR(un.n)}</div><div class="d">${A.cnt(Object.keys(un.pairs).length, 'مادة', 'مواد')} في الفصول</div></div>`;
      const cm = clashes(sl); const tClash = {}; for (const l of cm.values()) (tClash[l[0].teacher_id] = tClash[l[0].teacher_id] || []).push(l);
      $('#lb', box).innerHTML = list.map(({ p, o }) => { const pairs = Object.values(o.pairs).sort((a, b) => (A.cls(a.c)?.sort ?? 0) - (A.cls(b.c)?.sort ?? 0)); const nCls = new Set(pairs.map(x => x.c)).size, nSub = new Set(pairs.map(x => x.s)).size; const tc = tClash[p.id] || [];
        return `<tr><td><b>${esc(p.full_name)}</b><div class="small muted">${esc(p.specialty || '')}${p.user_id ? '' : ' · بلا حساب دخول'}</div>${tc.length ? `<div class="clash-n" title="${tc.map(l => `${DAYS[l[0].day]} الحصة ${PER[l[0].period]}: ${l.map(x => (A.cls(x.class_id) || {}).name || '').join(' + ')}`).join(' | ')}">${A.cnt(tc.length, 'تعارض', 'تعارضات')} في الجدول</div>` : ''}</td>
          <td class="ldn"><b>${AR(o.n)}</b><div class="small muted">حصة/أسبوع</div>${o.n !== o.nAct ? `<div class="small faint">منها ${AR(o.n - o.nAct)} نشاط</div>` : ''}</td>
          <td class="small">${AR(nSub)} مادة · ${AR(nCls)} فصل</td>
          <td>${pairs.map(pr => chip(pr, p.id)).join('') || '<span class="faint small">لا يوجد إسناد</span>'}${can ? `<button class="btn ghost sm" data-add="${p.id}" style="margin:4px 0">+ إسناد</button>${o.n ? ` <button class="btn ghost sm" data-dlg="${p.id}" style="margin:4px 0">تكليف مؤقت للإدخال</button>` : ''}` : ''}${dl.some(d => d.from_teacher === p.id) ? `<div class="small" style="color:var(--warn);margin-top:4px">يُدخل عنه حالياً: ${dl.filter(d => d.from_teacher === p.id).map(d => esc(A.personName(d.to_teacher))).join('، ')}</div>` : ''}</td></tr>`; }).join('') || `<tr><td colspan="4">${A.emptyBox('لا يوجد معلمون في هذا القسم بعد', 'أضفهم من الإدارة أو برابط الانضمام.')}</td></tr>`;
      const wk = id => (S.weeks.find(w => w.id === id) || {}).word || '';
      $('#ldl', box).innerHTML = dl.length ? `<div class="sec-box" style="margin-bottom:12px"><b>تكليفات مؤقتة للإدخال (${AR(dl.length)})</b> <span class="small muted">المكلَّف يُدخل الخطط نيابةً عن المعلم دون نقل الحصص</span>
        ${dl.map(d => `<div class="row" style="margin-top:8px;justify-content:space-between;border-top:1px dashed var(--border);padding-top:8px"><span><b>${esc(A.personName(d.to_teacher))}</b> <span class="small muted">نيابةً عن</span> <b>${esc(A.personName(d.from_teacher))}</b><br><span class="small muted">${d.pairs ? d.pairs.map(x => `${A.subjName(x.s)} — ${(A.cls(x.c) || {}).name || ''}`).join('، ') : 'كل مواده'} · الأسبوع ${d.week_ids.map(wk).filter(Boolean).join('، ')}${d.note ? ' · ' + esc(d.note) : ''}</span></span>${can ? `<button class="btn ghost sm" data-dlx="${d.id}">إنهاء التكليف</button>` : ''}</div>`).join('')}</div>` : '';
      $('#lun', box).innerHTML = un.n ? `<details class="sec-box" style="margin-top:12px"><summary><b>حصص بلا معلم (${AR(un.n)})</b> <span class="small muted">اضغط على أي مادة لإسنادها</span></summary><div style="margin-top:8px">${Object.values(un.pairs).sort((a, b) => (A.cls(a.c)?.sort ?? 0) - (A.cls(b.c)?.sort ?? 0)).map(pr => `<button class="ldc ldbtn" data-re="${pr.c}|${pr.s}">${esc(A.subjName(pr.s))} — ${esc((A.cls(pr.c) || {}).name || '')} <b>${AR(pr.n)}</b></button>`).join('')}</div></details>` : '<div class="notice ok" style="margin-top:12px">كل حصص الجدول مُسندة.</div>';
      bind(); drawReqs();
    };
    const after = async (msg) => { T.slots[v.id] = null; const fresh = await slotsOf(v.id); sl.length = 0; fresh.forEach(x => sl.push(x)); await A.loadWeek(); await A.refreshPeople(); draw(); if (msg) A.toast(msg, 'ok'); };
    A._ttLoadRefresh = () => { if (box.isConnected) after(); };
    const bind = () => {
      $$('[data-rm]', box).forEach(b => b.onclick = () => A.run(b, async () => { const [c, s] = b.dataset.rm.split('|'); if (!(await A.confirmBox(`إلغاء إسناد ${esc(A.subjName(s))} — ${esc((A.cls(c) || {}).name || '')}؟<br><span class="small muted">تصبح الحصص «بلا معلم» في الجدول والأسابيع المفتوحة.</span>`, 'إلغاء الإسناد', true))) return; await api.assignTeacher(c, s, null); await after('أُلغي الإسناد'); }));
      $$('[data-re]', box).forEach(b => b.onclick = () => { const [c, s] = b.dataset.re.split('|'); A.assignDialog(c, s); });
      $$('[data-add]', box).forEach(b => b.onclick = () => addDialog(b.dataset.add));
      $$('[data-dlg]', box).forEach(b => b.onclick = () => dlgDialog(b.dataset.dlg));
      $$('[data-dlx]', box).forEach(b => b.onclick = () => A.run(b, async () => { if (!(await A.confirmBox('إنهاء هذا التكليف؟ تعود الحصص لإدخال معلمها فقط، ويبقى ما أُدخل.', 'إنهاء'))) return; await api.updateDelegation(b.dataset.dlx, { active: false }); dl = await api.delegations(S.sectionId); await A.loadWeek(); draw(); A.toast('انتهى التكليف', 'ok'); }));
    };
    const dlgDialog = fid => {
      const o = by[fid] || { pairs: {} }; const pairs = Object.values(o.pairs);
      const subs = S.staff.filter(p => p.active && p.id !== fid && (secMem(p.id) || by[p.id]));
      const wks = S.weeks.filter(w => !w.archived && w.status === 'open').sort((a, b) => a.number - b.number);
      const m = A.modal(`<h3>تكليف مؤقت للإدخال نيابةً عن ${esc(A.personName(fid))}</h3><p class="sub">المكلَّف يرى هذه الحصص في صفحته ويُدخل خططها ويرسلها، بينما تبقى الحصص مسندة للمعلم الأصلي في الجدول والتقارير. يُسجَّل كل تعديل باسم من أدخله.</p>
        <div class="field"><label for="dgT">المعلم المكلَّف</label><select class="in" id="dgT"><option value="">— اختر —</option>${subs.map(p => `<option value="${p.id}">${esc(p.full_name)}${p.specialty ? ' — ' + esc(p.specialty) : ''}</option>`).join('')}</select></div>
        <div class="field"><label>المواد</label><label class="chk"><input type="checkbox" id="dgAll" checked> كل مواده (${AR(pairs.length)})</label><div class="perm-grid hidden" id="dgP" style="margin-top:6px">${pairs.map(pr => `<label class="chk"><input type="checkbox" value="${pr.c}|${pr.s}" checked> ${esc(A.subjName(pr.s))} — ${esc((A.cls(pr.c) || {}).name || '')}</label>`).join('')}</div></div>
        <div class="field"><label>الأسابيع</label><div class="perm-grid" id="dgW">${wks.map(w => `<label class="chk"><input type="checkbox" value="${w.id}" ${w.id === S.weekId ? 'checked' : ''}> الأسبوع ${esc(w.word)}</label>`).join('') || '<span class="small muted">لا توجد أسابيع مفتوحة</span>'}</div></div>
        <div class="field"><label for="dgN">السبب (اختياري)</label><input class="in" id="dgN" placeholder="مثال: إجازة مرضية"></div>
        <label class="chk"><input type="checkbox" id="dgM" checked> إرسال رسالة للمعلم المكلَّف والمعلم الأصلي</label>
        <div class="acts"><button class="btn" id="dgGo">تكليف</button></div>`, { cls: 'wide' });
      m.el.querySelector('#dgAll').onchange = e => m.el.querySelector('#dgP').classList.toggle('hidden', e.target.checked);
      m.el.querySelector('#dgGo').onclick = e => A.run(e.currentTarget, async () => {
        const to = m.el.querySelector('#dgT').value; if (!to) throw new Error('اختر المعلم المكلَّف');
        const all = m.el.querySelector('#dgAll').checked; const ps = $$('#dgP input:checked', m.el).map(i => { const [c, s2] = i.value.split('|'); return { c, s: s2 }; });
        if (!all && !ps.length) throw new Error('اختر مادة واحدة على الأقل');
        const ws = $$('#dgW input:checked', m.el).map(i => i.value); if (!ws.length) throw new Error('اختر أسبوعاً واحداً على الأقل');
        const note = m.el.querySelector('#dgN').value.trim();
        await api.addDelegation({ section_id: S.sectionId, from_teacher: fid, to_teacher: to, pairs: all ? null : ps, week_ids: ws, note });
        if (m.el.querySelector('#dgM').checked) {
          const wl = ws.map(id => 'الأسبوع ' + ((S.weeks.find(w => w.id === id) || {}).word || '')).join('، '); const scope = all ? 'كل مواده' : ps.map(x => `${A.subjName(x.s)} — ${(A.cls(x.c) || {}).name || ''}`).join('، ');
          await api.sendMessages([{ recipient_id: to, subject: 'تكليف مؤقت بإدخال خطط', body: `كُلِّفت بإدخال خطط ${A.personName(fid)} (${scope}) في ${wl}${note ? ' — ' + note : ''}. ستجدها في صفحتك «خطتي» بعلامة «نيابة».`, kind: 'system' }, { recipient_id: fid, subject: 'تكليف مؤقت', body: `كُلِّف ${A.personName(to)} بإدخال خططك (${scope}) في ${wl}${note ? ' — ' + note : ''}.`, kind: 'system' }]).catch(() => { });
        }
        m.close(); dl = await api.delegations(S.sectionId); await A.loadWeek(); draw(); A.toast(`كُلِّف ${A.personName(to)} بالإدخال نيابةً عن ${A.personName(fid)}`, 'ok');
      });
    };
    // إسناد لمعلم: اختر المادة فتظهر كل فصولها — الفارغ عادي، المسند لغيره باهت وتحته اسمه ويمكن نقله
    const addDialog = tid => {
      const pairs = {}; sl.filter(s => s.subject_id).forEach(s => { const k = s.class_id + '|' + s.subject_id; (pairs[k] = pairs[k] || { c: s.class_id, s: s.subject_id, n: 0, t: s.teacher_id }).n++; });
      const subs = [...new Set(Object.values(pairs).map(x => x.s))].sort((x, y) => A.subjName(x).localeCompare(A.subjName(y), 'ar'));
      const t = A.person(tid) || {}; const spec = A.normKey(t.specialty || '');
      const guess = subs.find(x => spec && (A.normKey(A.subjName(x)).includes(spec) || spec.includes(A.normKey(A.subjName(x))))) || subs.find(x => Object.values(pairs).some(p => p.s === x && p.t === tid)) || subs[0];
      const m = A.modal(`<h3>إسناد إلى ${esc(t.full_name || '')}${t.specialty ? ` <span class="small muted">— ${esc(t.specialty)}</span>` : ''}</h3>
        <p class="sub">اختر المادة فتظهر كل فصولها. الفصول المسندة لمعلم آخر تظهر باهتة وتحتها اسمه — اخترها لنقلها إلى ${esc(t.full_name || '')}.</p>
        <div class="field"><label for="ads">المادة</label><select class="in" id="ads">${subs.map(x => `<option value="${x}" ${x === guess ? 'selected' : ''}>${esc(A.subjName(x))} (${AR(Object.values(pairs).filter(p => p.s === x).length)} فصل)</option>`).join('')}</select></div>
        <div class="row small" style="margin-bottom:8px;gap:14px"><span><span class="lg lg-free"></span> بلا معلم</span><span><span class="lg lg-oth"></span> مسندة لمعلم آخر</span><span><span class="lg lg-mine"></span> مسندة له</span><button type="button" class="btn ghost sm" id="adA">تحديد كل المتاح</button></div>
        <div class="claim-grid" id="adl"></div><div class="acts"><span class="small muted" id="adn"></span><button class="btn" id="adg">إسناد</button></div>`, { cls: 'wide' });
      const sel = new Set();
      // تعارض الوقت: حصص هذه المادة في الفصل التي يكون فيها المعلم مشغولاً بفصل آخر (يشمل ما حدّدته الآن)
      const conflictsFor = (k) => { const [c, s2] = k.split('|'); const busy = new Set(sl.filter(x => x.teacher_id === tid && !(x.class_id === c && x.subject_id === s2)).map(x => x.day + '|' + x.period));
        [...sel].filter(k2 => k2 !== k).forEach(k2 => { const [c2, s3] = k2.split('|'); sl.filter(x => x.class_id === c2 && x.subject_id === s3).forEach(x => busy.add(x.day + '|' + x.period)); });
        return sl.filter(x => x.class_id === c && x.subject_id === s2 && busy.has(x.day + '|' + x.period)); };
      const dr = () => {
        const sid = m.el.querySelector('#ads').value; const list = Object.values(pairs).filter(p => p.s === sid).sort((x, y) => (A.cls(x.c)?.sort ?? 0) - (A.cls(y.c)?.sort ?? 0));
        m.el.querySelector('#adl').innerHTML = list.map(p => { const k = p.c + '|' + p.s; const st = p.t === tid ? 'mine' : p.t ? 'oth' : 'free'; const cf = st === 'mine' ? [] : conflictsFor(k);
          return `<label class="claim as-${st} ${sel.has(k) ? 'on' : ''}" ${st === 'mine' ? 'aria-disabled="true"' : ''}><input type="checkbox" value="${k}" ${st === 'mine' ? 'checked disabled' : sel.has(k) ? 'checked' : ''} style="width:20px;height:20px;accent-color:var(--blue)"><span class="c">${esc((A.cls(p.c) || {}).name || '')}<small>${A.cnt(p.n, 'حصة', 'حصص')}${st === 'oth' ? ` · <span class="oth-n">${esc(A.personName(p.t))}</span>` : st === 'mine' ? ' · مسندة له' : ' · بلا معلم'}</small>${cf.length ? `<small class="clash-n" title="${cf.map(x => DAYS[x.day] + ' الحصة ' + PER[x.period]).join('، ')}">تعارض وقت في ${A.cnt(cf.length, 'حصة', 'حصص')}</small>` : ''}</span></label>`; }).join('');
        $$('#adl input', m.el).forEach(i => i.onchange = () => { i.checked ? sel.add(i.value) : sel.delete(i.value); dr(); }); cnt();
      };
      const cnt = () => { const n = [...sel].reduce((a2, k) => a2 + (pairs[k] || { n: 0 }).n, 0), mv = [...sel].filter(k => pairs[k] && pairs[k].t && pairs[k].t !== tid).length;
        m.el.querySelector('#adn').textContent = sel.size ? `${A.cnt(sel.size, 'فصل', 'فصول')} · ${A.cnt(n, 'حصة', 'حصص')}${mv ? ` · منها ${AR(mv)} نقل من معلم آخر` : ''}` : ''; };
      m.el.querySelector('#ads').onchange = dr;
      m.el.querySelector('#adA').onclick = () => { const sid = m.el.querySelector('#ads').value; Object.values(pairs).filter(p => p.s === sid && !p.t).forEach(p => sel.add(p.c + '|' + p.s)); dr(); };
      dr();
      m.el.querySelector('#adg').onclick = e => A.run(e.currentTarget, async () => {
        if (!sel.size) throw new Error('اختر فصلاً واحداً على الأقل');
        const moves = [...sel].filter(k => pairs[k] && pairs[k].t && pairs[k].t !== tid);
        if (moves.length && !(await A.confirmBox(`سيُنقل ${A.cnt(moves.length, 'فصل', 'فصول')} من معلمين آخرين إلى ${esc(t.full_name || '')}:<br><span class="small muted">${moves.map(k => `${esc(A.subjName(pairs[k].s))} — ${esc((A.cls(pairs[k].c) || {}).name || '')} (من ${esc(A.personName(pairs[k].t))})`).join('<br>')}</span>`, 'نقل وإسناد'))) return;
        const cfl = [...sel].map(k => [k, conflictsFor(k)]).filter(([, l]) => l.length);
        if (cfl.length && !(await A.confirmBox(`تنبيه تعارض وقت: ${esc(t.full_name || '')} سيكون في أكثر من فصل في نفس الحصة:<br><span class="small muted">${cfl.map(([k, l]) => `${esc((A.cls(k.split('|')[0]) || {}).name || '')}: ${l.map(x => DAYS[x.day] + ' الحصة ' + PER[x.period]).join('، ')}`).join('<br>')}</span><br>يمكنك الإسناد مؤقتاً، وسيظهر التعارض بلون مميز في الجدول والنصاب حتى يُعالَج.`, 'إسناد مع التعارض مؤقتاً'))) return;
        for (const k of sel) { const [c, s2] = k.split('|'); await api.assignTeacher(c, s2, tid); }
        m.close(); await after(`أُسند ${A.cnt(sel.size, 'فصل', 'فصول')} إلى ${t.full_name}`);
      });
    };
    // طلبات المعلمين لاختيار موادهم — تُعتمد هنا
    const canDecide = S.me.is_owner || A.perm('timetable_approve');
    let reqs = []; try { reqs = canDecide && api.assignRequests ? await api.assignRequests(S.sectionId) : []; } catch (_) { }
    const drawReqs = () => {
      const el = $('#lrq', box); if (!el) return;
      if (!reqs.length) { el.innerHTML = ''; return; }
      const byT = {}; reqs.forEach(r => (byT[r.staff_id] = byT[r.staff_id] || []).push(r));
      el.innerHTML = `<div class="sec-box" style="margin-bottom:12px;border-color:var(--sky)"><div class="row" style="justify-content:space-between"><b>طلبات اختيار المواد بانتظار اعتمادك (${AR(reqs.length)})</b><span class="row"><button class="btn ok sm" data-rqa="all">${I.check} اعتماد الكل</button></span></div>
        ${Object.entries(byT).map(([sid, l]) => `<div style="margin-top:10px;border-top:1px dashed var(--border);padding-top:8px"><b>${esc(A.personName(sid))}</b>${(A.person(sid) || {}).specialty ? ` <span class="small muted">— ${esc(A.person(sid).specialty)}</span>` : ''}
          <div>${l.map(r => { const cur = sl.find(x => x.class_id === r.class_id && x.subject_id === r.subject_id && x.teacher_id); return `<span class="ldc" style="background:${r.kind === 'claim' ? 'var(--okbg)' : 'var(--warnbg)'}">${r.kind === 'claim' ? 'يطلب' : 'يطلب إلغاء'}: ${esc(A.subjName(r.subject_id))} — ${esc((A.cls(r.class_id) || {}).name || '')}${r.kind === 'claim' && cur && cur.teacher_id !== sid ? ` <span class="small" style="color:var(--bad)">(مسندة لـ${esc(A.personName(cur.teacher_id))})</span>` : ''}<button class="ldx" title="اعتماد" aria-label="اعتماد" data-rqa="${r.id}">✓</button><button class="ldx" title="رفض" aria-label="رفض" data-rqr="${r.id}">×</button></span>`; }).join('')}
          <button class="btn ghost sm" data-rqt="${sid}">اعتماد طلباته</button></div></div>`).join('')}</div>`;
      const decide = async (ids, ok2) => { const r = await api.decideRequests(ids, ok2); reqs = await api.assignRequests(S.sectionId); await after(ok2 ? `اعتُمد ${A.cnt(r.done, 'طلب', 'طلبات')}${r.skipped ? ` · تُرك ${AR(r.skipped)} لأنها مسندة لغيره` : ''}` : 'رُفض الطلب'); };
      $$('[data-rqa]', el).forEach(b => b.onclick = () => A.run(b, () => decide(b.dataset.rqa === 'all' ? reqs.map(x => x.id) : [b.dataset.rqa], true)));
      $$('[data-rqt]', el).forEach(b => b.onclick = () => A.run(b, () => decide(reqs.filter(x => x.staff_id === b.dataset.rqt).map(x => x.id), true)));
      $$('[data-rqr]', el).forEach(b => b.onclick = () => A.run(b, () => decide([b.dataset.rqr], false)));
    };
    A._ttReqRefresh = async () => { try { reqs = await api.assignRequests(S.sectionId); drawReqs(); } catch (_) { } };
    box.innerHTML = `<p class="sub" style="margin-top:0">نصاب كل معلم من الجدول المعتمد: المواد والفصول وعدد الحصص الأسبوعية. أي تعديل هنا يُطبَّق فوراً على الجدول وإسناد المعلمين وكل الأسابيع المفتوحة وصفحات المعلمين.</p>
      <div class="grid g3" id="lsum" style="margin-bottom:14px"></div><div id="lrq"></div><div id="ldl"></div>
      <div class="row" style="margin-bottom:12px"><input class="in" id="lq" placeholder="بحث بالمعلم أو المادة أو الفصل" style="max-width:320px"><select class="in" id="ls" style="max-width:200px"><option value="load">الأعلى نصاباً أولاً</option><option value="name">حسب الاسم</option></select><button class="btn ghost sm" id="lx">${I.down} Excel</button></div>
      <div class="scroll"><table class="tbl"><thead><tr><th>المعلم</th><th>النصاب</th><th>التوزيع</th><th style="width:52%">المواد والفصول (عدد الحصص)</th></tr></thead><tbody id="lb"></tbody></table></div><div id="lun"></div>`;
    $('#lq', box).oninput = draw; $('#ls', box).onchange = draw;
    $('#lx', box).onclick = () => { const rows = people().map(({ p, o }) => ({ المعلم: p.full_name, التخصص: p.specialty || '', 'النصاب (حصة/أسبوع)': o.n, 'المواد والفصول': Object.values(o.pairs).map(pr => `${A.subjName(pr.s)} - ${(A.cls(pr.c) || {}).name} (${pr.n})`).join('، ') })); const ws = XLSX.utils.json_to_sheet(rows); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'النصاب'); wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, `نصاب المعلمين - ${A.section().name}.xlsx`); };
    draw();
  }
  async function ttDrafts(box, root) {
    const canE = A.perm('timetable_edit'), canA = A.perm('timetable_approve');
    const drafts = T.versions.filter(v => v.status === 'draft');
    const LBL = { draft: 'مسودة', approved: 'معتمد', archived: 'مؤرشف' };
    if (!T.draft || !drafts.some(d => d.id === T.draft)) T.draft = (drafts[0] || {}).id || null;
    box.innerHTML = `<div class="notice info">التعديل يتم على <b>مسودة</b> ولا يؤثر على الأسابيع حتى تُعتمد. ${canA ? 'عند الاعتماد يمكنك تطبيق التغييرات على الأسابيع المفتوحة (الحصص المعتمدة لا تتغير).' : 'الاعتماد يتم من صاحب صلاحية «اعتماد الجدول».'}</div>
      <div class="row" style="margin-bottom:14px">
        ${canE ? `<button class="btn" id="nd">${I.plus} مسودة جديدة من الجدول الحالي</button><button class="btn ghost" id="ne">مسودة فارغة</button>` : ''}
        <button class="btn ghost" id="tpl">${I.down} قالب Excel للجدول</button>${A.perm('tt_builder') ? `<a class="btn sky" href="#/builder">${I.builder} مزامنة من الجدول الآلي</a>` : ''}</div>
      <table class="tbl" style="margin-bottom:16px"><thead><tr><th>الإصدار</th><th>الحالة</th><th>المصدر</th><th>التاريخ</th><th></th></tr></thead><tbody>
      ${T.versions.map(v => `<tr><td><b>${esc(v.label)}</b>${v.note ? `<div class="small muted">${esc(v.note)}</div>` : ''}</td><td><span class="pill ${v.status === 'approved' ? 'st-approved' : v.scheduled ? 'st-submitted' : v.status === 'draft' ? 'st-draft' : 'st-empty'}">${v.scheduled ? (v.effective_to ? 'مجدول مؤقتاً' : 'مجدول') : LBL[v.status]}</span>${v.scheduled ? `<div class="small muted" style="margin-top:4px">${winTxt(v)}</div>` : ''}</td><td class="small">${esc(v.source || '')}</td><td class="small muted">${A.fmtDT(v.approved_at || v.created_at)}</td><td class="row" style="flex-wrap:nowrap">${v.status === 'draft' ? `<button class="btn sm ${v.id === T.draft ? '' : 'ghost'}" data-open="${v.id}">فتح</button>` : ''}${v.scheduled && canA ? `<button class="btn ghost sm" data-unsch="${v.id}">إلغاء الجدولة</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="5" class="muted">لا توجد إصدارات</td></tr>'}
      </tbody></table><div id="de"></div>`;
    const mkDraft = async (copy) => {
      const lbl = prompt('اسم المسودة', copy ? 'تعديل الجدول — ' + new Date().toLocaleDateString('ar-SA-u-nu-latn') : 'جدول جديد'); if (!lbl) return;
      const v = await api.createDraft({ section_id: S.sectionId, label: lbl, source: copy ? 'نسخ من المعتمد' : 'يدوي', created_by: S.me.id });
      if (copy && approved()) { const sl = await slotsOf(approved().id); await api.replaceSlots(v.id, sl.map(({ class_id, day, period, subject_id, teacher_id }) => ({ class_id, day, period, subject_id, teacher_id }))); }
      T.draft = v.id; A.toast('أُنشئت المسودة', 'ok'); V.timetable(root);
    };
    const nd = $('#nd', box); if (nd) nd.onclick = e => A.run(e.currentTarget, () => mkDraft(true));
    const ne = $('#ne', box); if (ne) ne.onclick = e => A.run(e.currentTarget, () => mkDraft(false));
    $('#tpl', box).onclick = e => A.run(e.currentTarget, async () => exportTemplate(approved() ? await slotsOf(approved().id) : []));
    $$('[data-open]', box).forEach(b => b.onclick = () => { T.draft = b.dataset.open; V.timetable(root); });
    $$('[data-unsch]', box).forEach(b => b.onclick = () => A.run(b, async () => { if (!(await A.confirmBox('إلغاء جدولة هذا الجدول؟ يعود مسودة قابلة للتعديل، وتعود الأسابيع التي طُبّق عليها إلى الجدول الساري (الحصص المعتمدة لا تتغير).', 'إلغاء الجدولة'))) return; const r = await api.unscheduleTT(b.dataset.unsch); await A.loadWeek(); A.toast(`أُلغيت الجدولة${r && r.weeks ? ` وأُعيد ${A.cnt(r.weeks, 'أسبوع', 'أسابيع')}` : ''}`, 'ok'); V.timetable(root); }));
    if (!T.draft) return;
    const d = T.versions.find(v => v.id === T.draft); const sl = await slotsOf(d.id); const base = approved() ? await slotsOf(approved().id) : [];
    const locked = !!d.scheduled; const canE2 = canE && !locked;
    const changes = sl.filter(s => { const b = base.find(x => x.class_id === s.class_id && x.day === s.day && x.period === s.period) || {}; return (b.subject_id || null) !== (s.subject_id || null) || (b.teacher_id || null) !== (s.teacher_id || null); }).length;
    T.cls = T.cls && A.cls(T.cls) ? T.cls : (S.classes[0] || {}).id;
    const de = $('#de', box);
    de.innerHTML = `<div class="sec-box"><div class="head" style="margin-bottom:8px"><div class="grow"><h3 style="margin:0">المسودة: ${esc(d.label)}</h3><p class="sub" style="margin:2px 0 0">${A.cnt(changes, 'تغيير', 'تغييرات')} عن الجدول المعتمد · الخانات المتغيرة مظللة باللون السماوي</p></div>
      <div class="row">${canE2 ? `<button class="btn ghost sm" id="imp">${I.up} استيراد ملف</button><button class="btn bad sm" id="dd">حذف المسودة</button>` : ''}${canA && !locked ? `<button class="btn ok sm" id="ap">${I.check} اعتماد / جدولة هذا الجدول</button>` : ''}${canA && locked ? `<button class="btn ghost sm" data-unsch="${d.id}">إلغاء الجدولة</button>` : ''}</div></div>
      ${locked ? `<div class="notice info">هذا الجدول <b>${d.effective_to ? 'مجدول مؤقتاً' : 'مجدول'}</b>: ${winTxt(d)}. التعديل مقفل حتى تُلغى الجدولة.</div>` : ''}<div id="dg"></div></div>`;
    const draw = () => {
      const dg = $('#dg', de); dg.innerHTML = ''; classChips(dg, id => { T.cls = id; draw(); }, T.cls);
      dg.insertAdjacentHTML('beforeend', grid(sl, T.cls, canE2, base));
      $$('select[data-f]', dg).forEach(s => s.onchange = () => A.run(null, async () => {
        const dd = +s.dataset.d, pp = +s.dataset.p; let x = sl.find(y => y.class_id === T.cls && y.day === dd && y.period === pp);
        if (!x) { x = { class_id: T.cls, day: dd, period: pp, subject_id: null, teacher_id: null }; sl.push(x); }
        x[s.dataset.f] = s.value || null;
        await api.upsertSlots(d.id, [{ class_id: x.class_id, day: dd, period: pp, subject_id: x.subject_id, teacher_id: x.teacher_id }]);
        const b = base.find(y => y.class_id === T.cls && y.day === dd && y.period === pp) || {};
        s.closest('td').classList.toggle('chg', (b.subject_id || null) !== (x.subject_id || null) || (b.teacher_id || null) !== (x.teacher_id || null));
      }));
    };
    draw();
    const imp = $('#imp', de); if (imp) imp.onclick = () => importDialog(d, sl, () => { T.slots[d.id] = null; V.timetable(root); });
    $$('[data-unsch]', de).forEach(b => b.onclick = () => A.run(b, async () => { if (!(await A.confirmBox('إلغاء جدولة هذا الجدول؟ يعود مسودة قابلة للتعديل، وتعود الأسابيع التي طُبّق عليها إلى الجدول الساري.', 'إلغاء الجدولة'))) return; await api.unscheduleTT(b.dataset.unsch); await A.loadWeek(); A.toast('أُلغيت الجدولة', 'ok'); V.timetable(root); }));
    const dd = $('#dd', de); if (dd) dd.onclick = async () => { if (!(await confirmBox2('حذف المسودة نهائياً؟'))) return; await A.run(null, async () => { await api.deleteVersion(d.id); T.draft = null; V.timetable(root); }); };
    const ap = $('#ap', de); if (ap) ap.onclick = () => {
      const ws = S.weeks.filter(w => !w.archived).slice().sort((x, y) => x.start_date.localeCompare(y.start_date));
      const wOpt = (sel, end) => ws.map(w => { const v = end ? A.isoDate(new Date(A.parseDate(w.start_date).getTime() + 4 * 864e5)) : w.start_date; return `<option value="${v}" ${w.id === sel ? 'selected' : ''}>الأسبوع ${esc(w.word)} — ${AR(A.weekDates(w)[end ? 4 : 0])}</option>`; }).join('') + '<option value="custom">تاريخ آخر…</option>';
      const cur = S.weekId; const nxt = (ws.find(w => w.start_date > ((ws.find(x => x.id === cur) || {}).start_date || '')) || {}).id || cur;
      const m = A.modal(`<h3>اعتماد «${esc(d.label)}»</h3><p class="sub">عدد التغييرات عن الجدول الحالي: <b>${AR(changes)}</b>. اختر متى يسري هذا الجدول:</p>
        <div class="kpick" id="apm" style="margin-bottom:12px"><button type="button" data-m="now" class="on">الآن</button><button type="button" data-m="from">من أسبوع / تاريخ</button><button type="button" data-m="temp">مؤقت لفترة ثم يعود الحالي</button></div>
        <div id="apNow"><p class="small muted" style="margin-top:0">يصبح الجدول المعتمد فوراً ويُؤرشف السابق.</p><label class="chk"><input type="checkbox" id="apw" checked> تطبيق التغييرات على الأسابيع المفتوحة (الحصص غير المعتمدة فقط)</label></div>
        <div id="apFrom" class="hidden"><div class="grid g2"><div class="field"><label for="apF">يسري ابتداءً من</label><select class="in" id="apF">${wOpt(nxt)}</select><input class="in hidden" type="date" id="apFd" style="margin-top:6px"></div>
          <div class="field" id="apToBox"><label for="apT">وينتهي في (للمؤقت)</label><select class="in" id="apT">${wOpt(nxt, true)}</select><input class="in hidden" type="date" id="apTd" style="margin-top:6px"></div></div>
          <p class="small muted" id="apHint" style="margin:0"></p></div>
        <div class="acts"><button class="btn ok" id="apgo">${I.check} تأكيد</button></div>`, { cls: 'wide' });
      let mode = 'now';
      const sync = () => { m.el.querySelector('#apNow').classList.toggle('hidden', mode !== 'now'); m.el.querySelector('#apFrom').classList.toggle('hidden', mode === 'now'); m.el.querySelector('#apToBox').classList.toggle('hidden', mode !== 'temp');
        m.el.querySelector('#apHint').textContent = mode === 'from' ? 'يُطبَّق على الأسابيع المفتوحة من هذا التاريخ وما بعدها فوراً، وعلى الأسابيع التي تُنشأ لاحقاً، ويصبح الجدول المعتمد تلقائياً عند حلول التاريخ.' : mode === 'temp' ? 'يُطبَّق فقط على أسابيع هذه الفترة (مثل رمضان أو الاختبارات)، ثم تعود الأسابيع بعدها للجدول المعتمد الحالي تلقائياً.' : ''; };
      $$('#apm button', m.el).forEach(b => b.onclick = () => { mode = b.dataset.m; $$('#apm button', m.el).forEach(x => x.classList.toggle('on', x === b)); sync(); });
      [['#apF', '#apFd'], ['#apT', '#apTd']].forEach(([a2, b2]) => { m.el.querySelector(a2).onchange = e => m.el.querySelector(b2).classList.toggle('hidden', e.target.value !== 'custom'); });
      const val = (a2, b2) => { const v = m.el.querySelector(a2).value; return v === 'custom' ? m.el.querySelector(b2).value : v; };
      sync();
      m.el.querySelector('#apgo').onclick = e => A.run(e.currentTarget, async () => {
        if (mode === 'now') { const r = await api.approveTT(d.id, m.el.querySelector('#apw').checked); m.close(); await A.loadWeek(); A.toast(`اعتُمد الجدول${r && r.updated_entries ? ` وحُدِّثت ${A.cnt(r.updated_entries, 'حصة', 'حصص')} في الأسابيع الجارية والقادمة` : ''}${r && r.conflicts ? ` · ${A.cnt(r.conflicts, 'خلية فيها محتوى', 'خلايا فيها محتوى')} تنتظر قرارك في «الجدول المعتمد»` : ''}`, 'ok'); A.LS.set('tttab', 'view'); V.timetable(root); return; }
        const from = val('#apF', '#apFd'); if (!from) throw new Error('حدد تاريخ البداية');
        const to = mode === 'temp' ? val('#apT', '#apTd') : null; if (mode === 'temp' && !to) throw new Error('حدد تاريخ النهاية'); if (to && to < from) throw new Error('تاريخ النهاية قبل البداية');
        const r = await api.scheduleTT(d.id, from, to);
        m.close(); T.versions = null; await A.loadWeek(); A.toast(`جُدول الجدول ${to ? 'مؤقتاً' : ''} — طُبّق على ${A.cnt((r && r.weeks) || 0, 'أسبوع مفتوح', 'أسابيع مفتوحة')}`, 'ok'); V.timetable(root);
      });
    };
  }
  const winTxt = v => v.effective_to ? `من ${AR(A.dmy(A.parseDate(v.effective_from)))} إلى ${AR(A.dmy(A.parseDate(v.effective_to)))} ثم يعود الجدول المعتمد` : `يسري من ${AR(A.dmy(A.parseDate(v.effective_from)))}`;
  const confirmBox2 = t => A.confirmBox(t, 'حذف', true);

  // ---- قالب وتصدير الجدول ----
  function exportTemplate(slots) {
    const rows = [['الفصل', 'اليوم', 'الحصة', 'المادة', 'المعلم']];
    S.classes.filter(c => c.active).forEach(c => { for (let d = 0; d < A.section().days; d++) for (let p = 0; p < A.section().periods; p++) { const s = slots.find(x => x.class_id === c.id && x.day === d && x.period === p) || {}; rows.push([c.name, DAYS[d], p + 1, A.subjName(s.subject_id), A.personName(s.teacher_id)]); } });
    const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 7 }, { wch: 26 }, { wch: 26 }]; ws['!views'] = [{ RTL: true }];
    wb.Workbook = { Views: [{ RTL: true }] };
    XLSX.utils.book_append_sheet(wb, ws, 'الجدول');
    XLSX.writeFile(wb, `الجدول الدراسي - ${A.section().name}.xlsx`);
  }
  // ---- استيراد جدول جاهز ----
  const DAYKEY = d => { const k = A.normKey(d); return ['احد', 'اثنين', 'ثلاثاء', 'اربعاء', 'خميس', 'جمعه', 'سبت'].findIndex(x => k.includes(x)); };
  const PERKEY = p => { if (p == null || p === '') return -1; const n = parseInt(String(p).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), 10); if (!isNaN(n)) return n - 1; const k = A.normKey(p); return ['اول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سادس', 'سابع', 'ثامن', 'تاسع', 'عاشر'].findIndex(x => k.includes(x)); };
  function matchClass(name) { const k = A.normKey(name); return S.classes.find(c => A.normKey(c.name) === k); }
  function parseWorkbook(wb) {
    const out = []; const err = new Set();
    wb.SheetNames.forEach(sn => {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' }).map(r => r.map(x => A.norm(x)));
      if (!rows.length) return;
      const hdr = rows[0].map(A.normKey);
      const ci = k => hdr.findIndex(h => h.includes(k));
      const fc = ci('فصل'), fd = ci('يوم'), fp = ci('حصه'), fs = ci('ماده'), ft = hdr.findIndex(h => h.includes('معلم'));
      if (fc >= 0 && fd >= 0 && fp >= 0 && fs >= 0) {            // صيغة جدول مسطح
        rows.slice(1).forEach(r => { if (!r[fc]) return; out.push({ cls: r[fc], day: DAYKEY(r[fd]), period: PERKEY(r[fp]), subject: r[fs], teacher: ft >= 0 ? r[ft] : '' }); });
        return;
      }
      const c = matchClass(sn); if (!c) { err.add(sn); return; }
      if (fd >= 0 && fp >= 0 && fs >= 0) {                        // صيغة شيت الخطة (ورقة لكل فصل)
        let day = -1;
        rows.slice(1).forEach(r => { if (r[fd]) day = DAYKEY(r[fd]); if (day < 0 || !r[fp]) return; out.push({ cls: c.name, day, period: PERKEY(r[fp]), subject: r[fs], teacher: ft >= 0 ? r[ft] : '' }); });
        return;
      }
      // صيغة مصفوفة: صفوف = أيام، أعمدة = حصص
      rows.forEach(r => { const d = DAYKEY(r[0]); if (d < 0) return; r.slice(1).forEach((v, p) => { if (v || true) out.push({ cls: c.name, day: d, period: p, subject: v, teacher: '' }); }); });
    });
    return { items: out.filter(x => x.day >= 0 && x.period >= 0 && x.period < A.section().periods && x.day < A.section().days), badSheets: [...err] };
  }
  function importDialog(draft, sl, done) {
    const m = A.modal(`<h3>استيراد جدول جاهز إلى المسودة</h3>
      <p class="sub">يقبل النظام ملف Excel أو CSV بإحدى الصيغ: <b>(١)</b> جدول بأعمدة الفصل | اليوم | الحصة | المادة | المعلم (نزّل القالب)، <b>(٢)</b> ورقة لكل فصل باسم الفصل بنفس صيغة شيت الخطة (اليوم | رقم الحصة | المادة)، <b>(٣)</b> ورقة لكل فصل: الصفوف أيام والأعمدة حصص.</p>
      <label class="drop" id="dz"><input type="file" id="ff" accept=".xlsx,.xls,.csv" hidden><div style="font-weight:800">${I.up.replace('<svg', '<svg style="width:28px;height:28px"')}<br>اختر الملف أو اسحبه هنا</div></label>
      <div id="ires" style="margin-top:14px"></div>`, { cls: 'wide' });
    const handle = async file => {
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const { items, badSheets } = parseWorkbook(wb);
      const unkClass = new Set(), unkSub = new Set(), unkT = new Set(); const res = [];
      items.forEach(it => {
        const c = matchClass(it.cls); if (!c) { unkClass.add(it.cls); return; }
        let sid = null; if (it.subject) { const s = S.subjects.find(x => A.normKey(x.name) === A.normKey(it.subject)); if (s) sid = s.id; else unkSub.add(it.subject); }
        let tid = null; if (it.teacher) { const t = S.staff.find(x => A.normKey(x.full_name) === A.normKey(it.teacher) || A.normKey(x.full_name).includes(A.normKey(it.teacher))); if (t) tid = t.id; else unkT.add(it.teacher); }
        res.push({ class_id: c.id, day: it.day, period: it.period, subject_id: sid, teacher_id: tid, _sub: it.subject });
      });
      const classesN = new Set(res.map(r => r.class_id)).size;
      const box = m.el.querySelector('#ires');
      box.innerHTML = `<div class="notice ${res.length ? 'ok' : 'bad'}">قُرئت <b>${AR(res.length)}</b> حصة لـ <b>${AR(classesN)}</b> فصل.</div>
        ${unkClass.size || badSheets.length ? `<div class="notice warn">فصول غير معروفة (ستُتجاهل): ${[...unkClass, ...badSheets].map(esc).join('، ')}</div>` : ''}
        ${unkSub.size ? `<div class="notice warn">مواد جديدة غير موجودة: ${[...unkSub].map(esc).join('، ')}<br><label class="chk" style="margin-top:6px"><input type="checkbox" id="mkSub" checked> إضافتها إلى قائمة المواد</label></div>` : ''}
        ${unkT.size ? `<div class="notice warn">معلمون غير موجودين (ستبقى حصصهم بلا معلم): ${[...unkT].map(esc).join('، ')}</div>` : ''}
        <label class="chk"><input type="checkbox" id="keepT" checked> إبقاء المعلمين الحاليين للحصص التي لا يحدد الملف معلمها</label>
        <div class="acts"><button class="btn" id="igo" ${res.length ? '' : 'disabled'}>تطبيق على المسودة</button></div>`;
      box.querySelector('#igo').onclick = e => A.run(e.currentTarget, async () => {
        if (unkSub.size && box.querySelector('#mkSub') && box.querySelector('#mkSub').checked) {
          for (const n of unkSub) { try { await api.addSubject({ school_id: S.school.id, name: n }); } catch (er) { } }
          S.subjects = await api.reloadSubjects();
          res.forEach(r => { if (!r.subject_id && r._sub) { const s = S.subjects.find(x => A.normKey(x.name) === A.normKey(r._sub)); if (s) r.subject_id = s.id; } });
        }
        const keep = box.querySelector('#keepT').checked;
        const rows = res.map(r => { const old = sl.find(x => x.class_id === r.class_id && x.day === r.day && x.period === r.period) || {}; return { class_id: r.class_id, day: r.day, period: r.period, subject_id: r.subject_id, teacher_id: r.teacher_id || (keep && old.subject_id === r.subject_id ? old.teacher_id || null : null) }; });
        for (let i = 0; i < rows.length; i += 400) await api.upsertSlots(draft.id, rows.slice(i, i + 400));
        await api.updateDraft(draft.id, { source: 'استيراد ملف: ' + file.name });
        m.close(); A.toast(`طُبِّقت ${A.cnt(rows.length, 'حصة', 'حصص')} على المسودة — راجعها ثم اعتمدها`, 'ok'); done();
      });
    };
    const ff = m.el.querySelector('#ff'); ff.onchange = () => ff.files[0] && A.run(null, () => handle(ff.files[0]));
    const dz = m.el.querySelector('#dz');
    dz.addEventListener('dragover', e => { e.preventDefault(); }); dz.addEventListener('drop', e => { e.preventDefault(); const f = e.dataTransfer.files[0]; f && A.run(null, () => handle(f)); });
  }
  window.TT_parse = parseWorkbook;

  // =====================================================================
  //  الأسابيع
  // =====================================================================
  V.weeks = function (root) {
    const ws = S.weeks;
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>الأسابيع — ${esc(A.section().name)}</h2><p class="sub" style="margin:2px 0 0">إنشاء الأسبوع يولّد حصص كل الفصول من الجدول المعتمد مع المعلمين المسندين.</p></div><button class="btn" id="nw">${I.plus} أسبوع جديد</button></div>
      <div class="scroll"><table class="tbl"><thead><tr><th>الأسبوع</th><th>التواريخ</th><th>موعد التسليم</th><th>الحالة</th><th>الإجازات</th><th></th></tr></thead><tbody>
      ${ws.map(w => { const dd = A.weekDates(w); return `<tr><td><b>الأسبوع ${esc(w.word)}</b> <span class="small faint">(${AR(w.number)})</span></td><td class="small">${AR(dd[0])} : ${AR(dd[4])}</td><td class="small">${A.fmtDT(w.deadline)}</td><td><span class="pill st-${w.status}">${WSTATUS[w.status]}</span></td><td class="small">${(w.holidays || []).map(h => DAYS[h.day]).join('، ') || '—'}</td>
        <td class="row" style="flex-wrap:nowrap">${w.status === 'open' ? `<button class="btn ghost sm" data-st="locked" data-w="${w.id}">${I.lock} قفل</button>` : `<button class="btn ghost sm" data-st="open" data-w="${w.id}">فتح</button>`}${w.status !== 'published' ? `<button class="btn ghost sm" data-st="published" data-w="${w.id}">نشر</button>` : ''}<button class="btn ghost sm" data-ed="${w.id}">تعديل</button>${S.me.is_owner ? `<button class="btn ghost sm" data-arc="${w.id}" data-v="${w.archived ? 0 : 1}">${w.archived ? 'إلغاء الأرشفة' : 'أرشفة'}</button>` : ''}<button class="btn bad sm" data-del="${w.id}">حذف</button></td></tr>`; }).join('') || `<tr><td colspan="6">${A.emptyBox('لا توجد أسابيع')}</td></tr>`}
      </tbody></table></div>
      <p class="small muted">«مقفل»: يتوقف المعلمون عن التعديل ويستمر المراجع. «منشور»: اكتمل الأسبوع وصُدّرت ملفاته.</p></div>`;
    const reload = async () => { await A.loadSection(A.S.weekId); A.shell(); A.route(); };
    $$('[data-st]', root).forEach(b => b.onclick = () => A.run(b, async () => { await api.updateWeek(b.dataset.w, { status: b.dataset.st }); await reload(); A.toast('تم تحديث حالة الأسبوع', 'ok'); }));
    $$('[data-del]', root).forEach(b => b.onclick = async () => { const w = ws.find(x => x.id === b.dataset.del); if (!(await A.confirmBox(`حذف الأسبوع ${esc(w.word)} وكل خططه نهائياً؟ لا يمكن التراجع.`, 'حذف نهائي', true))) return; A.run(null, async () => { await api.deleteWeek(w.id); S.weekId = null; await reload(); }); });
    $$('[data-ed]', root).forEach(b => b.onclick = () => weekDialog(ws.find(x => x.id === b.dataset.ed), reload));
    $$('[data-arc]', root).forEach(b => b.onclick = () => A.run(b, async () => { await api.updateWeek(b.dataset.arc, { archived: b.dataset.v === '1' }); await reload(); A.toast(b.dataset.v === '1' ? 'أُرشف الأسبوع — لا يراه غيرك' : 'أُعيد الأسبوع', 'ok'); }));
    $('#nw', root).onclick = () => weekDialog(null, reload);
  };
  function weekDialog(w, reload) {
    const last = S.weeks[0];
    const num = w ? w.number : (last ? last.number + 1 : 1);
    let start = w ? A.parseDate(w.start_date) : (last ? A.parseDate(last.start_date) : new Date());
    if (!w) { if (last) start.setDate(start.getDate() + 7); else { start.setDate(start.getDate() + ((7 - start.getDay()) % 7)); } }
    const dl = w && w.deadline ? new Date(w.deadline) : (() => { const d = new Date(start); d.setDate(d.getDate() - 3); d.setHours(20, 0, 0, 0); return d; })();
    const local = d => `${A.isoDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const hol = (w && w.holidays) || [];
    const m = A.modal(`<h3>${w ? 'تعديل الأسبوع ' + esc(w.word) : 'أسبوع جديد'}</h3>
      <div class="grid g2"><div class="field"><label>رقم الأسبوع</label><input class="in" type="number" id="wn" min="1" max="25" value="${num}" ${w ? 'disabled' : ''}></div>
      <div class="field"><label>الاسم (يظهر في الملفات)</label><input class="in" id="ww" value="${esc(w ? w.word : ORD[num] || '')}"></div>
      <div class="field"><label>تاريخ بداية الأسبوع (الأحد)</label><input class="in" type="date" id="wsd" value="${A.isoDate(start)}" ${w ? 'disabled' : ''}></div>
      <div class="field"><label>آخر موعد لتسليم المعلمين</label><input class="in" type="datetime-local" id="wdl" value="${local(dl)}"></div></div>
      ${w ? `<div class="field"><label>أيام الإجازة في هذا الأسبوع</label>${DAYS.slice(0, A.section().days).map((d, i) => { const h = hol.find(x => x.day === i); return `<div class="row" style="margin-bottom:6px"><label class="chk" style="width:110px"><input type="checkbox" data-hd="${i}" ${h ? 'checked' : ''}> ${d}</label><input class="in" data-hl="${i}" value="${esc(h ? h.label : 'إجازة')}" style="max-width:300px"></div>`; }).join('')}</div>` : '<p class="small muted">الإجازات تُضبط بعد الإنشاء من «تعديل».</p>'}
      <div class="acts"><button class="btn" id="wgo">${w ? 'حفظ' : 'إنشاء الأسبوع'}</button></div>`);
    if (!w) m.el.querySelector('#wn').oninput = e => { m.el.querySelector('#ww').value = ORD[+e.target.value] || ''; };
    m.el.querySelector('#wgo').onclick = e => A.run(e.currentTarget, async () => {
      const word = m.el.querySelector('#ww').value.trim(); if (!word) throw new Error('اكتب اسم الأسبوع');
      const deadline = m.el.querySelector('#wdl').value ? new Date(m.el.querySelector('#wdl').value).toISOString() : null;
      if (w) {
        const holidays = $$('[data-hd]', m.el).filter(i => i.checked).map(i => ({ day: +i.dataset.hd, label: m.el.querySelector(`[data-hl="${i.dataset.hd}"]`).value.trim() || 'إجازة' }));
        await api.updateWeek(w.id, { word, deadline, holidays });
      } else {
        const sd = A.parseDate(m.el.querySelector('#wsd').value);
        if (sd.getDay() !== 0 && !(await A.confirmBox('التاريخ المختار ليس يوم أحد. هل تريد المتابعة؟', 'متابعة'))) return;
        const id = await api.createWeek({ section_id: S.sectionId, number: +m.el.querySelector('#wn').value, word, start_date: A.isoDate(sd), deadline });
        S.weekId = id; A.LS.set('week_' + S.sectionId, id);
      }
      m.close(); await reload(); A.toast(w ? 'حُفظ الأسبوع' : 'أُنشئ الأسبوع وحصصه', 'ok');
    });
  }

  // =====================================================================
  //  الإدارة
  // =====================================================================
  V.admin = function (root) {
    const tabs = [['staff', 'المعلمون والصلاحيات', () => S.me.is_owner || A.perm('users')], ['subjects', 'المواد', () => A.anyPerm('structure', 'timetable_edit')], ['classes', 'الفصول', () => A.perm('structure')], ['org', 'المدرسة والأقسام', () => S.me.is_owner], ['audit', 'سجل العمليات', () => S.me.is_owner || A.perm('users')]].filter(t => t[2]());
    let tab = A.LS.get('admtab'); if (!tabs.some(t => t[0] === tab)) tab = tabs[0][0];
    root.innerHTML = `<div class="card"><div class="tabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="ad"></div></div>`;
    $$('.tabs button', root).forEach(b => b.onclick = () => { A.LS.set('admtab', b.dataset.t); V.admin(root); });
    const box = $('#ad', root); const again = () => V.admin(root);
    ({ staff: admStaff, subjects: admSubjects, classes: admClasses, org: admOrg, audit: admAudit })[tab](box, again);
  };
  const memsOf = id => S.memberships.filter(m => m.staff_id === id);
  function admStaff(box, again) {
    const fsec = A.LS.get('stsec') || 'all';
    box.innerHTML = `<div class="head"><div class="grow"><p class="sub" style="margin:0">أضف المعلمين وأنشئ حسابات دخولهم وحدد صلاحياتهم في كل قسم. يمكنك تفويض أي صلاحية (مثل تعديل الجدول أو اعتماده) لمعلم أو لحساب مكلّف.</p></div>
      <button class="btn" id="add1">${I.plus} إضافة موظف</button><button class="btn ghost" id="addN">إضافة جماعية</button><button class="btn ghost" id="addX">${I.up} استيراد Excel</button></div>
      <div id="joinBox"></div>
      <div class="row" style="margin-bottom:12px"><input class="in" id="q" placeholder="بحث بالاسم أو البريد" style="max-width:300px"><select class="in" id="fs" style="max-width:220px"><option value="all">كل الأقسام</option>${S.sections.map(s => `<option value="${s.id}" ${fsec === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}<option value="none" ${fsec === 'none' ? 'selected' : ''}>غير مضاف لقسم</option></select></div>
      <div class="scroll"><table class="tbl"><thead><tr><th>الاسم</th><th>البريد</th><th>الدخول</th><th>الأقسام والأدوار</th><th></th></tr></thead><tbody id="sb"></tbody></table></div>`;
    const draw = () => {
      const q = A.normKey($('#q', box).value), f = $('#fs', box).value; A.LS.set('stsec', f);
      $('#sb', box).innerHTML = S.staff.filter(p => (!q || A.normKey(p.full_name + ' ' + (p.email || '')).includes(q)) && (f === 'all' || (f === 'none' ? !memsOf(p.id).length && !p.is_owner : memsOf(p.id).some(m => m.section_id === f)))).map(p => `<tr style="${p.active ? '' : 'opacity:.55'}"><td><b>${esc(p.full_name)}</b>${p.is_owner ? ' <span class="pill st-approved">مالك</span>' : ''}${p.active ? '' : ' <span class="pill st-empty">موقوف</span>'}</td><td dir="ltr" class="small" style="text-align:right">${esc(p.email || '—')}</td><td>${p.user_id ? '<span class="pill st-approved">مفعّل</span>' : '<span class="pill st-empty">بلا حساب</span>'}</td><td class="small">${p.is_owner ? 'كل الصلاحيات' : memsOf(p.id).map(m => `${esc((S.sections.find(s => s.id === m.section_id) || {}).short_name || '')}: ${ROLES[m.role]}${PERMS.some(([k]) => m[k]) && m.role !== 'admin' ? ' +' : ''}`).join(' · ') || '<span class="faint">—</span>'}</td><td><button class="btn ghost sm" data-e="${p.id}">إدارة</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">لا نتائج</td></tr>';
      $$('[data-e]', box).forEach(b => b.onclick = () => staffDialog(S.staff.find(p => p.id === b.dataset.e), again));
    };
    $('#q', box).oninput = draw; $('#fs', box).onchange = draw; draw();
    $('#add1', box).onclick = () => staffDialog(null, again);
    if (V._joinPanel) V._joinPanel($('#joinBox', box));
    $('#addN', box).onclick = () => bulkDialog(again);
    $('#addX', box).onclick = () => V._staffImport(again);
  }
  function staffDialog(p, again) {
    const isNew = !p; p = p || { full_name: '', email: '', phone: '', active: true };
    const canOwnerEdit = !p.is_owner || S.me.is_owner;
    const secs = S.sections.filter(s => S.me.is_owner || A.perm('users', s.id));
    const m = A.modal(`<h3>${isNew ? 'إضافة موظف' : esc(p.full_name)}</h3>
      <div class="grid g2"><div class="field"><label>الاسم كما يظهر</label><input class="in" id="sn" value="${esc(p.full_name)}" placeholder="أ. الاسم"></div><div class="field"><label>الجوال (اختياري)</label><input class="in" id="sp" dir="ltr" value="${esc(p.phone || '')}"></div></div>
      <div class="sec-box"><b>حساب الدخول</b><div class="grid g2" style="margin-top:8px"><div class="field"><label>البريد الإلكتروني</label><input class="in" id="se" dir="ltr" value="${esc(p.email || '')}" placeholder="name@dinaschool.com"></div>
        <div class="field"><label>${p.user_id ? 'كلمة مرور جديدة (اتركها فارغة للإبقاء)' : 'كلمة المرور'}</label><div class="row" style="flex-wrap:nowrap"><input class="in" id="spw" dir="ltr" placeholder="${p.user_id ? '••••••••' : ''}"><button class="btn ghost sm" id="gp" type="button">توليد</button></div></div></div>
        <p class="small muted" style="margin:0">${p.user_id ? 'الحساب مفعّل.' : 'بدون كلمة مرور يُحفظ الموظف بلا حساب دخول (يمكن إسناد الحصص له لاحقاً).'} انسخ كلمة المرور وأرسلها للمعلم، ويمكنه تغييرها بعد الدخول.</p></div>
      ${p.is_owner ? '<div class="notice ok">مالك النظام — كل الصلاحيات في كل الأقسام.</div>' : `<div><b>الأقسام والصلاحيات</b>${secs.map(s => { const mm = S.memberships.find(x => x.staff_id === p.id && x.section_id === s.id) || {}; return `<div class="sec-box" data-sec="${s.id}" style="margin-top:8px"><div class="row" style="justify-content:space-between"><b>${esc(s.name)}</b><select class="in" data-role style="max-width:200px"><option value="">غير مضاف</option>${Object.entries(ROLES).map(([k, l]) => `<option value="${k}" ${mm.role === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="perm-grid" style="margin-top:10px">${PERMS.map(([k, l]) => `<label class="chk"><input type="checkbox" data-p="${k}" ${mm[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div><div class="perm-grid" style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border)"><span class="small muted">صلاحيات يمنحها المالك:</span>${A.TOOL_PERMS.map(([k, l]) => `<label class="chk"><input type="checkbox" data-tp="${k}" ${mm[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div><p class="small faint" style="margin:6px 0 0">«مدير القسم» يملك كل الصلاحيات في القسم. للمعلم والمشرف فعّل ما تريد تفويضه.</p></div>`; }).join('')}</div>`}
      <div class="acts">${!isNew && !p.is_owner && (S.realMe || S.me).is_owner ? `<button class="btn ghost" id="sview">${I.eye} الدخول بحسابه</button>` : ''}${!isNew && !p.is_owner && p.id !== S.me.id ? `<button class="btn bad" id="sact">${p.active ? 'إيقاف الحساب' : 'إعادة التفعيل'}</button>` : ''}<button class="btn" id="ssave">حفظ</button></div>`, { cls: 'wide' });
    const syncRole = box => { const r = box.querySelector('[data-role]').value; $$('[data-p]', box).forEach(i => { i.disabled = !r || r === 'admin'; if (r === 'admin') i.checked = true; }); $$('[data-tp]', box).forEach(i => { i.disabled = !r; }); };
    $$('[data-sec]', m.el).forEach(b => { syncRole(b); b.querySelector('[data-role]').onchange = e => { const r = e.target.value; if (r && ROLE_DEFAULTS[r]) $$('[data-p]', b).forEach(i => i.checked = r === 'admin' || !!ROLE_DEFAULTS[r][i.dataset.p]); syncRole(b); }; });
    const sv = m.el.querySelector('#sview'); if (sv) sv.onclick = () => { m.close(); A.viewAs(p.id); };
    m.el.querySelector('#gp').onclick = () => { m.el.querySelector('#spw').value = A.genPass(); };
    const act = m.el.querySelector('#sact'); if (act) act.onclick = e => A.run(e.currentTarget, async () => { await api.setActive(p.id, !p.active); await A.refreshPeople(); m.close(); again(); A.toast('تم', 'ok'); });
    m.el.querySelector('#ssave').onclick = e => A.run(e.currentTarget, async () => {
      if (!canOwnerEdit) throw new Error('لا يمكن تعديل حساب المالك');
      const name = m.el.querySelector('#sn').value.trim(); if (!name) throw new Error('اكتب الاسم');
      const email = m.el.querySelector('#se').value.trim().toLowerCase(), pw = m.el.querySelector('#spw').value.trim();
      let row = p;
      if (isNew) row = await api.addStaff({ school_id: S.school.id, full_name: name, phone: m.el.querySelector('#sp').value.trim() || null, email: email || null });
      else if (name !== p.full_name || (m.el.querySelector('#sp').value.trim() || null) !== (p.phone || null)) row = await api.updateStaff(p.id, { full_name: name, phone: m.el.querySelector('#sp').value.trim() || null });
      if (email && (pw || (p.user_id && email !== (p.email || '')))) await api.setLogin(row.id, email, pw || null);
      else if (email && !p.user_id && email !== (p.email || '') && !isNew) await api.updateStaff(row.id, { email });
      if (!p.is_owner) for (const b of $$('[data-sec]', m.el)) {
        const sid = b.dataset.sec, role = b.querySelector('[data-role]').value;
        const ex = S.memberships.find(x => x.staff_id === row.id && x.section_id === sid);
        if (!role) { if (ex) await api.deleteMembership(ex.id); continue; }
        const rec = { staff_id: row.id, section_id: sid, role }; PERMS.forEach(([k]) => rec[k] = role === 'admin' ? true : b.querySelector(`[data-p="${k}"]`).checked);
        A.TOOL_PERMS.forEach(([k]) => rec[k] = !!(S.me.is_owner ? b.querySelector(`[data-tp="${k}"]`).checked : (ex || {})[k]));
        const changed = !ex || ex.role !== role || [...PERMS, ...A.TOOL_PERMS].some(([k]) => !!ex[k] !== rec[k]);
        if (changed) await api.upsertMembership(rec);
      }
      await A.refreshPeople(); m.close(); again();
      if (pw) showCreds([[name, email, pw]]); else A.toast('حُفظ', 'ok');
    });
  }
  function showCreds(list) {
    const txt = list.map(([n, e, p]) => `${n}\nالبريد: ${e}\nكلمة المرور: ${p}`).join('\n\n');
    const m = A.modal(`<h3>بيانات الدخول</h3><p class="sub">انسخها وأرسلها لأصحابها الآن — لن تظهر كلمات المرور مرة أخرى. رابط المنصة: <span dir="ltr">${esc(location.href.split('#')[0])}</span></p>
      <textarea class="in" rows="${Math.min(14, list.length * 4)}" readonly dir="auto" id="ct">${esc(txt)}</textarea>
      <div class="acts"><button class="btn ghost" id="cx">${I.down} تنزيل Excel</button><button class="btn" id="cc">نسخ</button></div>`, { sticky: true });
    m.el.querySelector('#cc').onclick = async () => { try { await navigator.clipboard.writeText(txt); A.toast('نُسخت', 'ok'); } catch (e) { m.el.querySelector('#ct').select(); } };
    m.el.querySelector('#cx').onclick = () => { const wb = XLSX.utils.book_new(); const ws = XLSX.utils.aoa_to_sheet([['الاسم', 'البريد', 'كلمة المرور', 'رابط المنصة'], ...list.map(r => [...r, location.href.split('#')[0]])]); ws['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws, 'الحسابات'); XLSX.writeFile(wb, 'بيانات دخول المنصة.xlsx'); };
  }
  function bulkDialog(again) {
    const secs = S.sections.filter(s => S.me.is_owner || A.perm('users', s.id));
    const m = A.modal(`<h3>إضافة جماعية للمعلمين</h3><p class="sub">سطر لكل معلم: <code class="k">الاسم، البريد</code> — البريد اختياري. من له بريد يُنشأ له حساب بكلمة مرور تلقائية.</p>
      <textarea class="in" id="bl" rows="8" placeholder="أ. نورة القحطاني، n.qahtani@dinaschool.com&#10;أ. سارة الغامدي، s.ghamdi@dinaschool.com"></textarea>
      <div class="grid g2" style="margin-top:10px"><div class="field"><label>إضافة إلى القسم</label><select class="in" id="bs">${secs.map(s => `<option value="${s.id}" ${s.id === S.sectionId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label>الدور</label><select class="in" id="br"><option value="teacher">معلم</option><option value="supervisor">مشرف</option></select></div></div>
      <div class="acts"><button class="btn" id="bgo">إضافة</button></div><div class="small muted" id="bp"></div>`, { cls: 'wide' });
    m.el.querySelector('#bgo').onclick = e => A.run(e.currentTarget, async () => {
      const lines = m.el.querySelector('#bl').value.split('\n').map(l => l.trim()).filter(Boolean);
      if (!lines.length) throw new Error('أدخل سطراً واحداً على الأقل');
      const sid = m.el.querySelector('#bs').value, role = m.el.querySelector('#br').value; const creds = []; const errs = [];
      for (let i = 0; i < lines.length; i++) {
        const [name, email] = lines[i].split(/[،,\t;]/).map(x => (x || '').trim());
        m.el.querySelector('#bp').textContent = `${AR(i + 1)} / ${AR(lines.length)} — ${name}`;
        try {
          let p = S.staff.find(x => A.normKey(x.full_name) === A.normKey(name) || (email && (x.email || '') === email.toLowerCase()));
          if (!p) p = await api.addStaff({ school_id: S.school.id, full_name: name, email: email ? email.toLowerCase() : null });
          if (email && !p.user_id) { const pw = A.genPass(); await api.setLogin(p.id, email, pw); creds.push([name, email.toLowerCase(), pw]); }
          if (!S.memberships.some(x => x.staff_id === p.id && x.section_id === sid)) await api.upsertMembership({ staff_id: p.id, section_id: sid, role, ...(ROLE_DEFAULTS[role] || {}) });
        } catch (er) { errs.push(`${name}: ${apiMsg(er)}`); }
      }
      await A.refreshPeople(); m.close(); again();
      if (errs.length) A.toast('تعذّر: ' + errs.join(' | '), 'err');
      if (creds.length) showCreds(creds); else A.toast(`أُضيف ${A.cnt(lines.length - errs.length, 'موظف', 'موظفين')}`, 'ok');
    });
  }
  function admSubjects(box, again) {
    box.innerHTML = `<div class="row" style="margin-bottom:12px"><input class="in" id="ns" placeholder="اسم مادة جديدة" style="max-width:300px"><button class="btn" id="as">${I.plus} إضافة</button></div>
      <p class="small muted">«بدون خطة»: مواد/أنشطة لا تُطلب لها خطة ولا تدخل في نسبة الإنجاز (مثل الفسحة أو النشاط).</p>
      <div class="scroll"><table class="tbl"><thead><tr><th>المادة</th><th>بدون خطة</th><th></th></tr></thead><tbody>${S.subjects.map(s => `<tr><td><input class="in" value="${esc(s.name)}" data-n="${s.id}" style="max-width:340px"></td><td><label class="chk"><input type="checkbox" data-a="${s.id}" ${s.is_activity ? 'checked' : ''}></label></td><td></td></tr>`).join('')}</tbody></table></div>`;
    $('#as', box).onclick = e => A.run(e.currentTarget, async () => { const n = A.norm($('#ns', box).value); if (!n) return; await api.addSubject({ school_id: S.school.id, name: n }); S.subjects = await api.reloadSubjects(); again(); });
    $$('[data-n]', box).forEach(i => i.onchange = () => A.run(null, async () => { await api.updateSubject(i.dataset.n, { name: A.norm(i.value) }); S.subjects = await api.reloadSubjects(); A.toast('حُفظ', 'ok'); }));
    $$('[data-a]', box).forEach(i => i.onchange = () => A.run(null, async () => { await api.updateSubject(i.dataset.a, { is_activity: i.checked }); S.subjects = await api.reloadSubjects(); A.toast('حُفظ', 'ok'); }));
  }
  const ORDW = { 'أول': 'الأول', 'ثاني': 'الثاني', 'ثالث': 'الثالث', 'رابع': 'الرابع', 'خامس': 'الخامس', 'سادس': 'السادس' };
  const STG = { 'ابتدائي': 'الابتدائية', 'متوسط': 'المتوسطة', 'ثانوي': 'الثانوية' };
  function parseClassName(n) {
    const p = A.norm(n).split(' '); if (p.length < 2 || !ORDW[p[0]] || !STG[p[1]]) return null;
    const rest = p.slice(2); const sec = rest.filter(x => ['أ', 'ب', 'ج', 'د'].includes(x)).join(' '), gen = rest.filter(x => ['بنين', 'بنات'].includes(x)).join(' ');
    const lab = [sec, gen].filter(Boolean).join(' ');
    return { name: p.join(' '), stage: STG[p[1]], grade_word: ORDW[p[0]], class_label: lab ? `${p[0]} - ${lab}` : p[0] };
  }
  function admClasses(box, again) {
    box.innerHTML = `<p class="sub">فصول ${esc(A.section().name)}. التسمية المعتمدة: <code class="k">الصف المرحلة الشعبة [بنين|بنات]</code> — مثل «رابع ابتدائي أ» أو «أول ابتدائي ب بنات». من الرابع الابتدائي إلى الثالث الثانوي لكل فصل حرف (أ، ب).</p>
      <div class="row" style="margin-bottom:12px"><input class="in" id="nc" placeholder="مثال: سادس ابتدائي ب" style="max-width:300px"><button class="btn" id="ac">${I.plus} إضافة فصل</button></div>
      <div class="scroll"><table class="tbl"><thead><tr><th>الترتيب</th><th>الاسم</th><th>المرحلة</th><th>الصف</th><th>الفصل (في الغلاف)</th><th>نشط</th></tr></thead><tbody>${S.classes.map(c => `<tr><td><input class="in" type="number" data-o="${c.id}" value="${c.sort}" style="width:76px"></td><td><b>${esc(c.name)}</b></td><td>${esc(c.stage)}</td><td>${esc(c.grade_word)}</td><td><input class="in" data-l="${c.id}" value="${esc(c.class_label)}" style="max-width:180px"></td><td><input type="checkbox" data-act="${c.id}" ${c.active ? 'checked' : ''}></td></tr>`).join('')}</tbody></table></div>
      <p class="small muted">الفصل الجديد يظهر في الأسابيع التي تُنشأ بعد إضافته، بعد إضافة حصصه في الجدول واعتماده.</p>`;
    $('#ac', box).onclick = e => A.run(e.currentTarget, async () => {
      const info = parseClassName($('#nc', box).value); if (!info) throw new Error('الاسم لا يتبع التسمية المعتمدة، مثل: سادس ابتدائي ب');
      await api.addClass({ section_id: S.sectionId, ...info, sort: S.classes.length }); S.allClasses = S.classes = await api.classes(S.sectionId); again(); A.toast('أُضيف الفصل', 'ok');
    });
    $$('[data-o]', box).forEach(i => i.onchange = () => A.run(null, async () => { await api.updateClass(i.dataset.o, { sort: +i.value }); S.allClasses = S.classes = await api.classes(S.sectionId); }));
    $$('[data-l]', box).forEach(i => i.onchange = () => A.run(null, async () => { await api.updateClass(i.dataset.l, { class_label: i.value.trim() }); S.allClasses = S.classes = await api.classes(S.sectionId); A.toast('حُفظ', 'ok'); }));
    $$('[data-act]', box).forEach(i => i.onchange = () => A.run(null, async () => { await api.updateClass(i.dataset.act, { active: i.checked }); S.allClasses = S.classes = await api.classes(S.sectionId); }));
  }
  function admOrg(box, again) {
    box.innerHTML = `<div class="grid g2"><div class="field"><label>اسم المدرسة</label><input class="in" id="on" value="${esc(S.school.name)}"></div><div class="field"><label>سطر الفصل الدراسي في الغلاف</label><input class="in" id="ot" value="${esc(S.school.term_label)}"></div></div>
      <button class="btn" id="os">حفظ</button>
      <h3 style="margin-top:24px">الأقسام</h3><p class="sub">كل قسم له فصوله وجدوله وأسابيعه ومعلموه. أضف قسماً جديداً (أو مدرسة/فرعاً) عند الحاجة.</p>
      <table class="tbl"><thead><tr><th>القسم</th><th>الاسم المختصر</th><th>أيام الأسبوع</th><th>عدد الحصص</th></tr></thead><tbody>${S.sections.map(s => `<tr><td><input class="in" data-sn="${s.id}" value="${esc(s.name)}"></td><td><input class="in" data-ss="${s.id}" value="${esc(s.short_name)}"></td><td>${AR(s.days)}</td><td><input class="in" type="number" min="4" max="10" data-sp="${s.id}" value="${s.periods}" style="width:80px"></td></tr>`).join('')}</tbody></table>
      <div class="row" style="margin-top:12px"><input class="in" id="nsn" placeholder="اسم القسم، مثل: قسم الطفولة المبكرة" style="max-width:320px"><input class="in" id="nss" placeholder="مختصر" style="max-width:140px"><button class="btn" id="nsb">${I.plus} إضافة قسم</button></div>`;
    box.insertAdjacentHTML('beforeend', `<h3 style="margin-top:24px">النسخ الاحتياطي</h3><p class="sub">تنزيل نسخة كاملة من بيانات المنصة (الأقسام والفصول والمعلمين والجداول وكل الخطط) في ملف Excel واحد. يُنصح بتنزيلها أسبوعياً وحفظها في الدرايف.</p><button class="btn ghost" id="bk">${I.down} تنزيل نسخة احتياطية</button>`);
    $('#bk', box).onclick = e => A.run(e.currentTarget, async () => {
      const wb = XLSX.utils.book_new(); const add = (name, rows) => { const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]); ws['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws, name); };
      const sub = id => A.subjName(id), per = id => A.personName(id);
      add('المعلمون', S.staff.map(p => ({ الاسم: p.full_name, البريد: p.email, الجوال: p.phone, نشط: p.active ? 'نعم' : 'لا', id: p.id })));
      add('الصلاحيات', S.memberships.map(m => ({ الاسم: per(m.staff_id), القسم: (S.sections.find(s => s.id === m.section_id) || {}).name, الدور: ROLES[m.role], ...Object.fromEntries(PERMS.map(([k, l]) => [l, m[k] ? 'نعم' : ''])) })));
      add('المواد', S.subjects.map(s => ({ المادة: s.name, 'بدون خطة': s.is_activity ? 'نعم' : '', id: s.id })));
      for (const sec of S.sections) {
        const cl = await api.classes(sec.id), ws = await api.weeks(sec.id), vs = await api.ttVersions(sec.id); const cn = id => (cl.find(c => c.id === id) || {}).name;
        const ap = vs.find(v => v.status === 'approved');
        if (ap) add(('جدول ' + sec.short_name).slice(0, 31), (await api.ttSlots(ap.id)).sort((a, b) => cn(a.class_id).localeCompare(cn(b.class_id)) || a.day - b.day || a.period - b.period).map(x => ({ الفصل: cn(x.class_id), اليوم: DAYS[x.day], الحصة: x.period + 1, المادة: sub(x.subject_id), المعلم: per(x.teacher_id) })));
        for (const w of ws) {
          const es = await api.entries(w.id);
          add(`${sec.short_name} أسبوع ${w.number}`.slice(0, 31), es.sort((a, b) => cn(a.class_id).localeCompare(cn(b.class_id)) || a.day - b.day || a.period - b.period).map(x => ({ الفصل: cn(x.class_id), اليوم: DAYS[x.day], الحصة: x.period + 1, المادة: sub(x.subject_id), المعلم: per(x.teacher_id), الموضوع: x.topic, الواجب: x.homework, ملاحظة: x.note, الحالة: A.STATUS[x.status], 'ملاحظة المراجعة': x.review_note })));
        }
      }
      wb.Workbook = { Views: [{ RTL: true }] };
      XLSX.writeFile(wb, `نسخة احتياطية - منصة الخطة الأسبوعية - ${A.isoDate(new Date())}.xlsx`);
    });
    $('#os', box).onclick = e => A.run(e.currentTarget, async () => { S.school = await api.updateSchool(S.school.id, { name: $('#on', box).value.trim(), term_label: $('#ot', box).value.trim() }); A.toast('حُفظ', 'ok'); });
    const upd = (sel, key, num) => $$(`[${sel}]`, box).forEach(i => i.onchange = () => A.run(null, async () => { const id = i.getAttribute(sel); const r = await api.updateSection(id, { [key]: num ? +i.value : i.value.trim() }); Object.assign(S.sections.find(s => s.id === id), r); A.toast('حُفظ', 'ok'); }));
    upd('data-sn', 'name'); upd('data-ss', 'short_name'); upd('data-sp', 'periods', true);
    if (V._sectionLook) V._sectionLook(box);
    $('#nsb', box).onclick = e => A.run(e.currentTarget, async () => { const n = $('#nsn', box).value.trim(); if (!n) throw new Error('اكتب اسم القسم'); const s = await api.addSection({ school_id: S.school.id, name: n, short_name: $('#nss', box).value.trim() || n.replace(/^قسم\s*/, ''), sort: S.sections.length + 1 }); S.sections.push(s); A.shell(); A.route(); A.toast('أُضيف القسم — أضف فصوله وجدوله', 'ok'); });
  }
  async function admAudit(box) {
    box.innerHTML = '<div class="spinner"></div>';
    const L = await api.audit(300);
    const AL = { insert: 'إضافة', update: 'تعديل', delete: 'حذف', assign: 'إسناد معلم', set_login: 'حساب دخول', approve: 'اعتماد' };
    const EL = { plan_entries: 'حصة', timetable_versions: 'جدول', weeks: 'أسبوع', memberships: 'صلاحية', classes: 'فصل', staff: 'موظف' };
    box.innerHTML = `<div class="scroll" style="max-height:70vh"><table class="tbl"><thead><tr><th>الوقت</th><th>المستخدم</th><th>العملية</th><th>التفاصيل</th></tr></thead><tbody>${L.map(r => `<tr><td class="small muted">${A.fmtDT(r.at)}</td><td>${esc(A.personName(r.staff_id) || 'النظام')}</td><td>${AL[r.action] || r.action} ${EL[r.entity] || r.entity}</td><td class="small">${esc(detail(r))}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">لا يوجد</td></tr>'}</tbody></table></div>`;
    function detail(r) { const d = r.details || {}; if (r.entity === 'plan_entries') return `${(A.cls(d.class_id) || {}).name || ''} ${DAYS[d.day] || ''} ح${AR((d.period ?? -1) + 1)} ← ${A.STATUS[d.status] || d.status || ''}`; if (r.entity === 'classes') return `${(A.cls(r.entity_id) || {}).name || ''}: ${A.subjName(d.subject_id)} ← ${A.personName(d.teacher_id) || 'بلا معلم'}`; if (d.status) return d.status; if (d.email) return d.email; if (d.role) return `${A.personName(d.staff_id)}: ${ROLES[d.role]}`; return ''; }
  }
})();
