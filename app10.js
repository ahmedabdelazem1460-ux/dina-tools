/* منصة دينا — المصادر (روابط Drive)، تحليل النتائج (للمالك ومن يُمنح)، المسميات وحزم الصلاحيات */
(function () {
  const A = window.APP, V = window.VIEWS;
  const { api, S, $, $$, esc, AR, I } = A;

  // ---------- صلاحيات الأنظمة الخاصة (تحليل النتائج، سجلاتي…) ----------
  const FOPT = { all: 'لكل المعلمين', granted: 'لمن أمنحه فقط', off: 'مخفي (للمالك فقط)' };
  const FEATS = [['assess', 'التقويم والاختبارات', ['all', 'granted', 'off']], ['records', 'سجل المتابعة', ['all', 'granted', 'off']], ['resources', 'المصادر', ['all', 'granted', 'off']], ['analysis', 'تحليل النتائج', ['granted', 'off']], ['attendance', 'الحضور والسلوك والإرشاد', ['granted', 'off']], ['supervision', 'الإشراف التربوي وتقاريري', ['granted', 'off']]];
  const MODULES = [['assess', 'التقويم والاختبارات (عند تفعيله «لمن أمنحه»)', 'التقويم'], ['analysis', 'تحليل النتائج والاختبارات التشخيصية', 'التحليل'], ['supervision', 'الإشراف التربوي', 'الإشراف'], ['attendance', 'الحضور والسلوك — مشرف دور', 'الحضور'], ['counselor', 'الإرشاد الطلابي — الإحالات', 'المرشد'], ['records', 'سجل المتابعة (عند تفعيله «لمن أمنحه»)', 'السجل'], ['resources', 'المصادر (عند تفعيلها «لمن أمنحه»)', 'المصادر']];
  A.hasModule = m => !!S.me && (S.me.is_owner || (S.grants || []).some(g => g.module === m && g.staff_id === S.me.id));
  async function loadGrants() { try { S.grants = await api.moduleGrants(); } catch (_) { S.grants = []; } }
  const prevAfter = window.APP_AFTER_WEEK;
  window.APP_AFTER_WEEK = async function () { if (prevAfter) await prevAfter.apply(this, arguments); if (S._grantsAt !== S.me.id) { S._grantsAt = S.me.id; await loadGrants(); A.renderNav && A.renderNav(); } };

  // =====================================================================
  //  المصادر — روابط Drive وأوراق العمل وملفات المراجعة
  // =====================================================================
  const KINDS = [['worksheet', 'ورقة عمل', '#3AB1DB'], ['review', 'ملف مراجعة', '#2E7FC9'], ['test', 'اختبار / تقويم', '#C9A44C'], ['presentation', 'عرض تقديمي', '#AE95DA'], ['video', 'فيديو', '#E0675A'], ['folder', 'مجلد Drive', '#082B5A'], ['link', 'رابط آخر', '#8CC56A']];
  const kindOf = k => KINDS.find(x => x[0] === k) || KINDS[KINDS.length - 1];
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return ''; } };
  const isDrive = u => /drive\.google|docs\.google/.test(u || '');
  let RES = [];
  V.resources = async function (root) {
    root.innerHTML = '<div class="spinner"></div>';
    try { RES = await api.resources(); } catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر تحميل المصادر', e.message)}</div>`; return; }
    const st = { q: '', subj: A.LS.get('rs_s') || '', kind: '', mine: false };
    const secClasses = S.classes.filter(c => c.active);
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>المصادر</h2><p class="sub" style="margin:2px 0 0">أوراق العمل وملفات المراجعة والعروض — روابط Drive منظمة حسب المادة والفصل، تُفتح وتُطبع بهوية دينا.</p></div>
      <div class="row"><button class="btn" id="rsAdd">${I.plus} إضافة مصدر</button><button class="btn ghost" id="rsPrint">${I.print} طباعة القائمة</button></div></div>
      <div class="row" style="margin-bottom:12px;gap:8px"><input class="in" id="rsQ" placeholder="بحث بالعنوان أو الملاحظة" style="max-width:260px">
        <select class="in" id="rsS" style="max-width:200px"><option value="">كل المواد</option>${S.subjects.map(s => `<option value="${s.id}" ${st.subj === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
        <select class="in" id="rsK" style="max-width:170px"><option value="">كل الأنواع</option>${KINDS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
        <label class="chk"><input type="checkbox" id="rsM"> مصادري فقط</label></div>
      <div id="rsL" class="res-grid"></div></div>`;
    const list = () => RES.filter(r => (!st.subj || r.subject_id === st.subj) && (!st.kind || r.kind === st.kind) && (!st.mine || r.created_by === S.me.id) && (!r.section_id || r.section_id === S.sectionId) && (!st.q || A.normKey(r.title + ' ' + r.note).includes(A.normKey(st.q))));
    const canEd = r => S.me.is_owner || r.created_by === S.me.id || A.perm('review');
    const draw = () => {
      const l = list();
      $('#rsL', root).innerHTML = l.map(r => { const [, kl, kc] = kindOf(r.kind); const cl = (r.class_ids || []).map(id => (A.cls(id) || {}).name).filter(Boolean);
        return `<div class="res"><div class="rk" style="--k:${kc}">${kl}</div><a class="rt" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>
          <div class="small muted">${esc(A.subjName(r.subject_id) || 'عام')}${cl.length ? ' · ' + esc(cl.join('، ')) : ''}${r.visible_to_parents ? ' · <span class="pill st-approved">يظهر لأولياء الأمور</span>' : ''}</div>${r.note ? `<div class="small" style="margin-top:4px">${esc(r.note)}</div>` : ''}
          <div class="rf"><span class="small faint">${isDrive(r.url) ? 'Google Drive' : esc(host(r.url))} · ${esc(A.personName(r.created_by) || '')}</span><span class="row" style="gap:4px"><button class="btn ghost sm" data-cp="${r.id}" title="نسخ الرابط" aria-label="نسخ الرابط">نسخ</button>${canEd(r) ? `<button class="btn ghost sm" data-ed="${r.id}">تعديل</button><button class="btn bad sm" data-del="${r.id}" aria-label="حذف">×</button>` : ''}</span></div></div>`; }).join('') || A.emptyBox('لا توجد مصادر بعد', 'أضف رابط ملف أو مجلد من Drive، وحدّد المادة والفصول.');
      $$('[data-cp]', root).forEach(b => b.onclick = () => { const r = RES.find(x => x.id === b.dataset.cp); navigator.clipboard.writeText(r.url).then(() => A.toast('نُسخ الرابط', 'ok')); });
      $$('[data-ed]', root).forEach(b => b.onclick = () => edit(RES.find(x => x.id === b.dataset.ed)));
      $$('[data-del]', root).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذا المصدر من القائمة؟ الملف نفسه في Drive لا يتأثر.', 'حذف', true))) return; await A.run(null, async () => { await api.deleteResource(b.dataset.del); RES = RES.filter(x => x.id !== b.dataset.del); draw(); }); });
    };
    const edit = r => {
      r = r || { kind: 'worksheet', subject_id: st.subj || null, class_ids: [], title: '', url: '', note: '' };
      const m = A.modal(`<h3>${r.id ? 'تعديل' : 'إضافة'} مصدر</h3>
        <div class="field"><label for="reU">الرابط (Drive أو أي رابط)</label><input class="in" id="reU" dir="ltr" value="${esc(r.url)}" placeholder="https://drive.google.com/..."></div>
        <div class="grid g2"><div class="field"><label for="reT">العنوان</label><input class="in" id="reT" value="${esc(r.title)}" placeholder="مثال: ورقة عمل الكسور العشرية"></div>
        <div class="field"><label for="reK">النوع</label><select class="in" id="reK">${KINDS.map(([k, l]) => `<option value="${k}" ${r.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="reS">المادة</label><select class="in" id="reS"><option value="">عام</option>${S.subjects.map(s => `<option value="${s.id}" ${r.subject_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="reN">ملاحظة (اختياري)</label><input class="in" id="reN" value="${esc(r.note || '')}"></div></div>
        <label class="chk" style="margin-bottom:8px"><input type="checkbox" id="reP" ${r.visible_to_parents ? 'checked' : ''}> يظهر لأولياء الأمور في بوابتهم مع خطة الأسبوع</label>
        <div class="field"><label>الفصول (اتركها كلها فارغة ليظهر للجميع)</label><div class="perm-grid">${secClasses.map(c => `<label class="chk"><input type="checkbox" value="${c.id}" ${(r.class_ids || []).includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div></div>
        <div class="acts"><button class="btn" id="reGo">حفظ</button></div>`, { cls: 'wide' });
      const u = m.el.querySelector('#reU'); u.onchange = () => { const k = m.el.querySelector('#reK'); if (/\/folders\//.test(u.value)) k.value = 'folder'; else if (/presentation/.test(u.value)) k.value = 'presentation'; else if (/youtu/.test(u.value)) k.value = 'video'; };
      m.el.querySelector('#reGo').onclick = e => A.run(e.currentTarget, async () => {
        const url = u.value.trim(); if (!/^https?:\/\//i.test(url)) throw new Error('الرابط يجب أن يبدأ بـ https://');
        const row = { url, title: m.el.querySelector('#reT').value.trim() || host(url), kind: m.el.querySelector('#reK').value, subject_id: m.el.querySelector('#reS').value || null, note: m.el.querySelector('#reN').value.trim(), visible_to_parents: m.el.querySelector('#reP').checked, class_ids: $$('.perm-grid input:checked', m.el).map(i => i.value), section_id: S.sectionId, school_id: S.school.id };
        if (r.id) { const x = await api.updateResource(r.id, row); Object.assign(r, x); } else RES.unshift(await api.addResource(row));
        m.close(); S._resAt = 0; draw(); A.toast('حُفظ المصدر', 'ok');
      });
    };
    $('#rsAdd', root).onclick = () => edit();
    $('#rsQ', root).oninput = e => { st.q = e.target.value; draw(); };
    $('#rsS', root).onchange = e => { st.subj = e.target.value; A.LS.set('rs_s', st.subj); draw(); };
    $('#rsK', root).onchange = e => { st.kind = e.target.value; draw(); };
    $('#rsM', root).onchange = e => { st.mine = e.target.checked; draw(); };
    $('#rsPrint', root).onclick = () => {
      const l = list(); const by = {}; l.forEach(r => (by[A.subjName(r.subject_id) || 'عام'] = by[A.subjName(r.subject_id) || 'عام'] || []).push(r));
      const body = Object.entries(by).map(([s, rs]) => `<h3 style="margin:14px 0 6px;border-inline-start:6px solid #3AB1DB;padding-inline-start:8px">${esc(s)}</h3><table><tr><th>المصدر</th><th>النوع</th><th>الفصول</th><th>الرابط</th></tr>${rs.map(r => `<tr><td style="text-align:start"><b>${esc(r.title)}</b>${r.note ? `<div style="font-size:11px">${esc(r.note)}</div>` : ''}</td><td>${kindOf(r.kind)[1]}</td><td>${esc((r.class_ids || []).map(id => (A.cls(id) || {}).name).filter(Boolean).join('، ') || 'الجميع')}</td><td dir="ltr" style="font-size:11px"><a href="${esc(r.url)}">${esc(isDrive(r.url) ? 'Google Drive' : host(r.url))}</a></td></tr>`).join('')}</table>`).join('');
      A.printDoc ? A.printDoc('قائمة المصادر', A.section().name, body) : window.print();
    };
    draw();
  };

  // ---------- منتقي المصادر (يُستدعى من بطاقة الحصة ومن الخطط العلاجية) ----------
  async function fetchRes() { if (!S._resAt || Date.now() - S._resAt > 60000) { try { S.resCache = await api.resources(); S._resAt = Date.now(); } catch (_) { S.resCache = S.resCache || []; } } return S.resCache; }
  A.fetchResources = fetchRes;
  A.pickResource = async function (subjectId, classId, onPick) {
    const all = await fetchRes();
    const fit = r => (!r.section_id || r.section_id === S.sectionId) && (!r.class_ids || !r.class_ids.length || !classId || r.class_ids.includes(classId));
    let onlySubj = true;
    const m = A.modal(`<h3>إرفاق مصدر</h3><p class="sub">اختر مصدراً ليُضاف رابطه إلى واجب الحصة. أضف مصادر جديدة من صفحة «المصادر».</p>
      <div class="row" style="margin-bottom:8px"><input class="in" id="prq" placeholder="بحث" style="max-width:240px"><label class="chk"><input type="checkbox" id="prs" checked> مصادر ${esc(A.subjName(subjectId) || 'المادة')} فقط</label></div><div id="prl" style="max-height:52vh;overflow:auto"></div>`, { cls: 'wide' });
    const draw = () => { const q = A.normKey(m.el.querySelector('#prq').value || ''); const l = all.filter(fit).filter(r => (!onlySubj || r.subject_id === subjectId || !r.subject_id) && (!q || A.normKey(r.title + ' ' + r.note).includes(q)));
      m.el.querySelector('#prl').innerHTML = l.map(r => { const [, kl, kc] = kindOf(r.kind); return `<button type="button" class="pick-r" data-id="${r.id}"><span class="rk" style="--k:${kc}">${kl}</span><span><b>${esc(r.title)}</b><br><span class="small muted">${esc(A.subjName(r.subject_id) || 'عام')}${r.note ? ' · ' + esc(r.note) : ''}</span></span></button>`; }).join('') || A.emptyBox('لا توجد مصادر مطابقة', 'أضفها من صفحة «المصادر».');
      $$('[data-id]', m.el).forEach(b => b.onclick = () => { const r = all.find(x => x.id === b.dataset.id); m.close(); onPick(r); }); };
    m.el.querySelector('#prq').oninput = draw; m.el.querySelector('#prs').onchange = e => { onlySubj = e.target.checked; draw(); }; draw();
  };

  // =====================================================================
  //  تحليل النتائج والاختبارات التشخيصية — للمالك ومن يمنحه (التصحيح الآلي للمالك فقط)
  // =====================================================================
  V.analysis = function (root) {
    if (!A.hasModule('analysis')) { root.innerHTML = `<div class="card">${A.emptyBox('هذا النظام غير متاح لحسابك', 'يمنحه مالك النظام من «المسميات والصلاحيات».')}</div>`; return; }
    root.innerHTML = `<div class="card" style="padding:10px"><div class="head" style="margin-bottom:8px"><div class="grow"><h2 style="margin:0">تحليل النتائج والاختبارات التشخيصية</h2><p class="sub" style="margin:2px 0 0">${S.me.is_owner ? 'نسختك الكاملة بما فيها التصحيح الآلي.' : 'التصحيح الآلي متاح لمالك النظام فقط.'} البيانات تُحفظ في هذا المتصفح — استخدم «النسخ الاحتياطي» داخل النظام لنقلها.</p></div><a class="btn ghost sm" href="tools/analysis.html" target="_blank" rel="noopener">فتح في نافذة مستقلة</a></div>
      <iframe id="anF" src="tools/analysis.html" title="نظام تحليل النتائج" style="width:100%;height:calc(100vh - 210px);min-height:560px;border:1px solid var(--border);border-radius:14px;background:#fff"></iframe></div>`;
    const f = $('#anF', root);
    if (!S.me.is_owner) f.onload = () => { try { const d = f.contentDocument; const st = d.createElement('style'); st.textContent = '[data-tab="omr"]{display:none!important}'; d.head.appendChild(st); const hide = () => d.querySelectorAll('[data-tab="omr"]').forEach(x => x.remove()); hide(); new MutationObserver(hide).observe(d.body, { childList: true, subtree: true }); } catch (_) { } };
  };

  // =====================================================================
  //  المسميات وحزم الصلاحيات — تعيين جماعي أو فردي
  // =====================================================================
  const BUILTIN = [
    { id: 'teacher', name: 'معلم', role: 'teacher', perms: {} },
    { id: 'coord', name: 'منسق مادة', role: 'supervisor', perms: { can_review_plans: true, can_export: true } },
    { id: 'sup', name: 'مشرف تربوي', role: 'supervisor', perms: { can_review_plans: true, can_export: true } },
    { id: 'counselor', name: 'مرشد طلابي', role: 'supervisor', perms: { can_export: true } },
    { id: 'deputy', name: 'وكيل', role: 'supervisor', perms: { can_review_plans: true, can_export: true, can_manage_structure: true, can_edit_timetable: true } },
    { id: 'head', name: 'مدير القسم', role: 'admin', perms: { can_manage_users: true, can_manage_structure: true, can_edit_timetable: true, can_approve_timetable: true, can_review_plans: true, can_export: true } },
  ];
  const ALLP = A.PERMS.concat(A.TOOL_PERMS);
  V.roles = function (root) {
    if (!(S.me.is_owner || A.perm('users'))) { root.innerHTML = `<div class="card">${A.emptyBox('غير متاح')}</div>`; return; }
    const sets = () => { const c = ((S.school.settings || {}).perm_sets) || []; return BUILTIN.filter(b => !c.some(x => x.id === b.id)).concat(c); };
    const people = S.staff.filter(p => p.active && !p.is_owner);
    const memOf = (sid, sec) => S.memberships.find(m => m.staff_id === sid && m.section_id === sec);
    const secs = S.sections;
    let sel = new Set();
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>المسميات والصلاحيات</h2><p class="sub" style="margin:2px 0 0">مسمى وظيفي مخصص لكل موظف، وحزم صلاحيات جاهزة أو مخصصة تُمنح لعدة أشخاص دفعة واحدة. لا يتأثر أي إدخال للمعلمين.</p></div></div>
      ${S.me.is_owner ? `<div class="sec-box" style="margin-bottom:14px"><b>إظهار بنود المنصة للمعلمين</b><p class="small muted" style="margin:2px 0 8px">الإخفاء يخفي البند من حسابات المعلمين فقط؛ كل ما أُدخل سابقاً يبقى محفوظاً، والروابط المنشورة للطلاب تبقى تعمل حتى تُغلقها.</p>
        <div class="feat-tbl">${FEATS.map(([k, lb, opts]) => `<div class="feat-row"><span class="feat-l">${lb}</span><div class="chip-filter" data-feat="${k}" role="group" aria-label="${lb}">${opts.map(o => `<button data-v="${o}" aria-pressed="${A.featMode(k) === o}" class="${A.featMode(k) === o ? 'on' : ''}">${FOPT[o]}</button>`).join('')}</div></div>`).join('')}</div></div>` : ''}
      <div class="sec-box" style="margin-bottom:14px"><div class="row" style="justify-content:space-between"><b>حزم الصلاحيات</b>${S.me.is_owner ? `<button class="btn ghost sm" id="drvBulk">روابط مجلدات Drive دفعة واحدة</button> <button class="btn ghost sm" id="psNew">${I.plus} حزمة مخصصة</button>` : ''}</div><div id="psL" style="margin-top:8px"></div></div>
      <div class="row" style="margin-bottom:10px;gap:8px"><input class="in" id="rq" placeholder="بحث بالاسم أو المسمى" style="max-width:260px"><span class="small muted" id="rsel"></span>
        <select class="in" id="rset" style="max-width:200px"><option value="">— حزمة للمحددين —</option></select>
        <select class="in" id="rsec" style="max-width:170px"><option value="all">كل الأقسام</option>${secs.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select>
        <label class="chk"><input type="checkbox" id="rtitle" checked> اجعل اسم الحزمة مسمى وظيفياً</label>
        <button class="btn sm" id="rgo">تطبيق على المحددين</button></div>
      <div class="scroll"><table class="tbl"><thead><tr><th style="width:34px"><input type="checkbox" id="rall" aria-label="تحديد الكل"></th><th>الموظف</th><th style="width:22%">المسمى الوظيفي</th>${secs.map(s => `<th>${esc(s.short_name || s.name)}</th>`).join('')}${S.me.is_owner ? '<th>أنظمة خاصة</th>' : ''}</tr></thead><tbody id="rb"></tbody></table></div></div>`;
    const drawSets = () => {
      $('#psL', root).innerHTML = sets().map(p => `<span class="ldc" title="${esc(ALLP.filter(([k]) => p.perms[k]).map(([, l]) => l).join('، ') || 'بلا صلاحيات إضافية')}"><b style="background:var(--blue)">${A.ROLES[p.role] || p.role}</b> ${esc(p.name)}${S.me.is_owner && !BUILTIN.some(b => b.id === p.id && !((S.school.settings || {}).perm_sets || []).some(x => x.id === p.id)) ? `<button class="ldx" data-pe="${p.id}" aria-label="تعديل">✎</button>` : S.me.is_owner ? `<button class="ldx" data-pe="${p.id}" aria-label="تخصيص">✎</button>` : ''}</span>`).join('');
      $('#rset', root).innerHTML = '<option value="">— حزمة للمحددين —</option>' + sets().map(p => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
      $$('[data-pe]', root).forEach(b => b.onclick = () => editSet(sets().find(x => x.id === b.dataset.pe)));
    };
    const editSet = p => {
      p = p ? JSON.parse(JSON.stringify(p)) : { id: 'c' + Date.now().toString(36), name: '', role: 'supervisor', perms: {} };
      const m = A.modal(`<h3>${p.name ? 'تعديل حزمة: ' + esc(p.name) : 'حزمة صلاحيات جديدة'}</h3>
        <div class="grid g2"><div class="field"><label for="pn">اسم الحزمة / المسمى</label><input class="in" id="pn" value="${esc(p.name)}" placeholder="مثال: رائد نشاط"></div>
        <div class="field"><label for="pr">الدور الأساسي</label><select class="in" id="pr">${Object.entries(A.ROLES).map(([k, l]) => `<option value="${k}" ${p.role === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
        <div class="perm-grid">${ALLP.map(([k, l]) => `<label class="chk"><input type="checkbox" value="${k}" ${p.perms[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div>
        <div class="acts">${((S.school.settings || {}).perm_sets || []).some(x => x.id === p.id) ? '<button class="btn bad" id="pdel">حذف الحزمة</button>' : ''}<button class="btn" id="pgo">حفظ</button></div>`, { cls: 'wide' });
      const save = async (del) => { const cur = ((S.school.settings || {}).perm_sets || []).filter(x => x.id !== p.id); if (!del) { p.name = m.el.querySelector('#pn').value.trim(); if (!p.name) throw new Error('اكتب اسم الحزمة'); p.role = m.el.querySelector('#pr').value; p.perms = {}; $$('.perm-grid input:checked', m.el).forEach(i => p.perms[i.value] = true); cur.push(p); }
        const settings = { ...(S.school.settings || {}), perm_sets: cur }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = r.settings || settings; m.close(); drawSets(); A.toast(del ? 'حُذفت الحزمة' : 'حُفظت الحزمة', 'ok'); };
      m.el.querySelector('#pgo').onclick = e => A.run(e.currentTarget, () => save(false));
      const pd = m.el.querySelector('#pdel'); if (pd) pd.onclick = e => A.run(e.currentTarget, () => save(true));
    };
    const roleCell = (p, s) => { const m = memOf(p.id, s.id); if (!m) return '<span class="faint small">—</span>'; const n = ALLP.filter(([k]) => m[k]).length; return `<span class="pill ${m.role === 'admin' ? 'st-approved' : m.role === 'supervisor' ? 'st-submitted' : 'st-empty'}">${A.ROLES[m.role]}</span>${n ? ` <span class="small muted">+${AR(n)}</span>` : ''}`; };
    const draw = () => {
      const q = A.normKey($('#rq', root).value || '');
      const l = people.filter(p => !q || A.normKey(p.full_name + ' ' + (p.title || '') + ' ' + (p.specialty || '')).includes(q));
      $('#rb', root).innerHTML = l.map(p => `<tr><td><input type="checkbox" data-s="${p.id}" ${sel.has(p.id) ? 'checked' : ''} aria-label="تحديد ${esc(p.full_name)}"></td><td><b>${esc(p.full_name)}</b><div class="small muted">${esc(p.specialty || '')}${p.email ? ' · ' + esc(p.email) : ''}</div></td>
        <td><input class="in" data-t="${p.id}" value="${esc(p.title || '')}" placeholder="اكتب المسمى…" style="padding:6px 10px"><button class="drv-link ${p.drive_url ? 'on' : ''}" data-dv="${p.id}" title="${p.drive_url ? 'مجلد Drive مربوط — اضغط للتعديل' : 'ربط مجلد Drive'}">${p.drive_url ? '✓ مجلد Drive' : '+ مجلد Drive'}</button></td>${secs.map(s => `<td>${roleCell(p, s)}</td>`).join('')}
        ${S.me.is_owner ? `<td><div class="mg-grid">${MODULES.map(([k, lb, sh]) => `<label class="chk small" title="${lb}"><input type="checkbox" data-mg="${p.id}|${k}" ${(S.grants || []).some(g => g.staff_id === p.id && g.module === k) ? 'checked' : ''}> ${sh}</label>`).join('')}</div></td>` : ''}</tr>`).join('') || `<tr><td colspan="9">${A.emptyBox('لا يوجد موظفون')}</td></tr>`;
      $('#rsel', root).textContent = sel.size ? `محدد: ${AR(sel.size)}` : '';
      $$('[data-s]', root).forEach(i => i.onchange = () => { i.checked ? sel.add(i.dataset.s) : sel.delete(i.dataset.s); $('#rsel', root).textContent = sel.size ? `محدد: ${AR(sel.size)}` : ''; });
      $$('[data-dv]', root).forEach(b => b.onclick = () => A.driveDialog(S.staff.find(x => x.id === b.dataset.dv), draw));
    $$('[data-t]', root).forEach(i => i.onchange = () => A.run(null, async () => { const r = await api.updateStaff(i.dataset.t, { title: i.value.trim() || null }); const p = S.staff.find(x => x.id === i.dataset.t); if (p) p.title = r.title; A.toast('حُفظ المسمى', 'ok'); }));
      $$('[data-mg]', root).forEach(i => i.onchange = () => A.run(null, async () => { const [sid, mod] = i.dataset.mg.split('|'); if (i.checked) await api.grantModule(sid, mod); else await api.revokeModule(sid, mod); await loadGrants(); A.toast(i.checked ? 'مُنح النظام' : 'سُحب النظام', 'ok'); }));
    };
    $$('[data-feat] button', root).forEach(b => b.onclick = () => A.run(b, async () => { const k = b.parentElement.dataset.feat, v = b.dataset.v; const settings = { ...(S.school.settings || {}) }; settings.features = { ...(settings.features || {}), [k]: v }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = r.settings || settings; $$('button', b.parentElement).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); A.renderNav && A.renderNav(); const nm = (FEATS.find(f => f[0] === k) || [])[1]; A.toast(v === 'off' ? `أُخفي «${nm}» من حسابات المعلمين — البيانات محفوظة` : v === 'granted' ? `«${nm}» يظهر لمن تمنحه فقط — استخدم عمود «أنظمة خاصة»` : `«${nm}» ظاهر لكل المعلمين`, 'ok'); }));
    $('#rq', root).oninput = draw;
    $('#rall', root).onchange = e => { people.forEach(p => e.target.checked ? sel.add(p.id) : sel.delete(p.id)); draw(); };
    $('#rgo', root).onclick = e => A.run(e.currentTarget, async () => {
      const p = sets().find(x => x.id === $('#rset', root).value); if (!p) throw new Error('اختر حزمة'); if (!sel.size) throw new Error('حدّد موظفاً واحداً على الأقل');
      const sv = $('#rsec', root).value; const targets = sv === 'all' ? secs.map(s => s.id) : [sv];
      if (!(await A.confirmBox(`تطبيق حزمة «${esc(p.name)}» على ${A.cnt(sel.size, 'موظف', 'موظفين')} في ${sv === 'all' ? 'كل الأقسام' : esc((secs.find(s => s.id === sv) || {}).name || '')}؟<br><span class="small muted">تُستبدل صلاحياتهم في هذه الأقسام بصلاحيات الحزمة. خططهم ومدخلاتهم لا تتأثر.</span>`, 'تطبيق'))) return;
      const tools = S.me.is_owner ? A.TOOL_PERMS.map(([k]) => k) : [];
      for (const sid of sel) for (const sec of targets) {
        const row = { staff_id: sid, section_id: sec, role: p.role }; A.PERMS.forEach(([k]) => row[k] = !!p.perms[k]); tools.forEach(k => row[k] = !!p.perms[k]);
        await api.upsertMembership(row);
        if ($('#rtitle', root).checked) { const r = await api.updateStaff(sid, { title: p.name }); const x = S.staff.find(y => y.id === sid); if (x) x.title = r.title; }
      }
      await A.refreshPeople(); sel = new Set(); draw(); A.toast(`طُبِّقت الحزمة على ${A.cnt(targets.length, 'قسم', 'أقسام')}`, 'ok');
    });
    (async () => { if (S.me.is_owner) await loadGrants(); drawSets(); draw(); })();
  };
})();
