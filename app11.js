/* منصة دينا — الحضور والغياب والسلوك (مشرفو الأدوار والمرشد الطلابي) + الإشراف التربوي (تقارير، إقرار بتوقيع، خطط علاجية) */
(function () {
  const A = window.APP, V = window.VIEWS;
  const { api, S, $, $$, esc, AR, I } = A;
  const today = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const mod = m => !!(A.hasModule && A.hasModule(m));
  const sch = () => S.school.id;
  const ST = [['present', 'حاضر', 'ok'], ['absent', 'غائب', 'bad'], ['late', 'متأخر', 'warn'], ['excused', 'مستأذن', 'info'], ['early', 'خروج مبكر', 'info']];
  const stName = k => (ST.find(x => x[0] === k) || [])[1] || k;
  const NEG = ['تأخر صباحي', 'عدم إحضار الكتب والأدوات', 'إزعاج داخل الفصل', 'عدم أداء الواجب', 'الخروج من الحصة دون إذن', 'استخدام الجوال', 'ألفاظ غير لائقة', 'إيذاء زميل', 'عدم الالتزام بالزي'];
  const POS = ['مشاركة متميزة', 'تعاون مع الزملاء', 'انضباط والتزام', 'مبادرة وقيادة', 'تفوق دراسي', 'خدمة مدرسية'];
  let STU = [];
  async function loadStudents(force) { if (!STU.length || force) STU = await api.list('students', { school_id: sch(), active: true }, { order: 'full_name' }); return STU; }
  const stu = id => STU.find(s => s.id === id) || {};
  const classesOf = () => S.classes.filter(c => c.active);

  // تنبيه لحظي للمرشد عند وصول إحالة جديدة
  const prevAfter = window.APP_AFTER_WEEK;
  window.APP_AFTER_WEEK = async function () {
    if (prevAfter) await prevAfter.apply(this, arguments);
    if (S._attSub === S.me.id || !api.subscribe) return; S._attSub = S.me.id;
    try {
      if (mod('counselor')) api.subscribe('bh-' + sch(), 'behaviors', null, p => { const r = p && p.new; if (r && r.referred && r.by_staff !== S.me.id) A.toast('إحالة جديدة للمرشد الطلابي: ' + (stu(r.student_id).full_name || 'طالب'), 'ok'); if (A._attRefresh) A._attRefresh(); });
      if (mod('attendance') || mod('counselor')) api.subscribe('att-' + sch(), 'attendance', null, () => { if (A._attRefresh) A._attRefresh(); });
      api.subscribe('spr-' + S.me.id, 'sup_records', null, p => { const r = p && p.new; if (r && r.teacher_id === S.me.id && r.status === 'sent') { A.toast('وصلك تقرير إشرافي جديد: ' + r.title, 'ok'); S.supCount = (S.supCount || 0) + 1; A.renderNav && A.renderNav(); } });
      const mine = await api.list('sup_records', { teacher_id: S.me.id }, { select: 'id,status' }); S.supCount = mine.filter(r => r.status !== 'draft').length; S.supPending = mine.filter(r => r.status === 'sent').length; if (S.supCount) A.renderNav && A.renderNav();
    } catch (_) { }
  };

  // =====================================================================
  //  الحضور والسلوك
  // =====================================================================
  V.attendance = async function (root) {
    if (!(mod('attendance') || mod('counselor') || mod('supervision'))) { root.innerHTML = `<div class="card">${A.emptyBox('غير متاح لحسابك', 'يمنحه مالك النظام لمشرفي الأدوار والمرشد الطلابي من «المسميات والصلاحيات».')}</div>`; return; }
    root.innerHTML = '<div class="spinner"></div>';
    await loadStudents(true);
    const tabs = [mod('attendance') && ['take', 'أخذ الحضور'], (mod('attendance') || mod('counselor')) && ['behavior', 'السلوك'], (mod('counselor') || S.me.is_owner) && ['refer', 'الإحالات'], ['reports', 'التقارير'], S.me.is_owner && ['students', 'الطلاب']].filter(Boolean);
    let tab = A.LS.get('atttab'); if (!tabs.some(t => t[0] === tab)) tab = tabs[0][0];
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>الحضور والغياب والسلوك</h2><p class="sub" style="margin:2px 0 0">${AR(STU.length)} طالب في قاعدة البيانات · المزامنة لحظية بين المشرفين والمرشد الطلابي.</p></div></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="atb"></div></div>`;
    $$('.tabs button', root).forEach(b => b.onclick = () => { A.LS.set('atttab', b.dataset.t); V.attendance(root); });
    const box = $('#atb', root);
    if (!STU.length && tab !== 'students') { box.innerHTML = A.emptyBox('لا يوجد طلاب بعد', S.me.is_owner ? 'استورد بيانات الطلاب من تبويب «الطلاب».' : 'يستورد مالك النظام بيانات الطلاب أولاً.'); return; }
    ({ take: tTake, behavior: tBehavior, refer: tRefer, reports: tReports, students: tStudents })[tab](box);
  };

  async function tTake(box) {
    let day = A.LS.get('attday') || today(), cid = A.LS.get('attcls') || (classesOf()[0] || {}).id;
    const draw = async () => {
      const recs = await api.list('attendance', { school_id: sch(), day });
      const byS = Object.fromEntries(recs.map(r => [r.student_id, r]));
      const takenCls = new Set(recs.map(r => r.class_id));
      const list = STU.filter(s => s.class_id === cid);
      const state = Object.fromEntries(list.map(s => [s.id, byS[s.id] ? { ...byS[s.id] } : { status: 'present', minutes: null, note: '', referred: false }]));
      box.innerHTML = `<div class="row" style="margin:12px 0;gap:8px"><input type="date" class="in" id="atD" value="${day}" style="max-width:180px">
        <span class="small muted">${AR(takenCls.size)} من ${AR(classesOf().length)} فصل أُخذ حضوره في هذا اليوم</span></div>
        <div class="row" style="gap:6px;margin-bottom:10px">${classesOf().map(c => `<button class="btn sm ${c.id === cid ? '' : 'ghost'}" data-c="${c.id}">${esc(c.name)} ${takenCls.has(c.id) ? '✓' : ''}</button>`).join('')}</div>
        ${list.length ? `<div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="small muted">الافتراضي «حاضر» — اضغط على حالة الطالب لتغييرها</span><span class="row"><button class="btn ghost sm" id="atAllP">الكل حاضر</button><button class="btn ok" id="atSave">${I.check} حفظ الحضور</button></span></div>
        <div class="scroll"><table class="tbl att"><thead><tr><th>#</th><th>الطالب</th><th>الحالة</th><th>دقائق التأخر</th><th>ملاحظة</th><th>إحالة للمرشد</th></tr></thead><tbody>
        ${list.map((s, i) => `<tr data-s="${s.id}"><td>${AR(i + 1)}</td><td><b>${esc(s.full_name)}</b></td><td><div class="seg" role="radiogroup" aria-label="حالة ${esc(s.full_name)}">${ST.map(([k, l, c]) => `<button type="button" role="radio" class="sg ${c} ${state[s.id].status === k ? 'on' : ''}" data-st="${k}" aria-checked="${state[s.id].status === k}">${l}</button>`).join('')}</div></td>
          <td><input class="in" type="number" min="1" max="240" data-m value="${state[s.id].minutes || ''}" style="width:80px;padding:6px" aria-label="دقائق التأخر"></td><td><input class="in" data-n value="${esc(state[s.id].note || '')}" style="padding:6px" aria-label="ملاحظة"></td><td><input type="checkbox" data-r ${state[s.id].referred ? 'checked' : ''} aria-label="إحالة للمرشد"></td></tr>`).join('')}
        </tbody></table></div>` : A.emptyBox('لا يوجد طلاب في هذا الفصل')}`;
      $('#atD', box).onchange = e => { day = e.target.value; A.LS.set('attday', day); draw(); };
      $$('[data-c]', box).forEach(b => b.onclick = () => { cid = b.dataset.c; A.LS.set('attcls', cid); draw(); });
      $$('tr[data-s]', box).forEach(tr => { const sid = tr.dataset.s;
        $$('[data-st]', tr).forEach(b => b.onclick = () => { state[sid].status = b.dataset.st; $$('[data-st]', tr).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); });
        $('[data-m]', tr).oninput = e => state[sid].minutes = e.target.value ? +e.target.value : null;
        $('[data-n]', tr).oninput = e => state[sid].note = e.target.value;
        $('[data-r]', tr).onchange = e => state[sid].referred = e.target.checked; });
      const ap = $('#atAllP', box); if (ap) ap.onclick = () => { list.forEach(s => state[s.id].status = 'present'); $$('[data-st]', box).forEach(x => { const on = x.dataset.st === 'present'; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); }); };
      const sv = $('#atSave', box); if (sv) sv.onclick = e => A.run(e.currentTarget, async () => {
        const rows = list.map(s => ({ school_id: sch(), student_id: s.id, class_id: cid, day, status: state[s.id].status, minutes: state[s.id].status === 'late' ? state[s.id].minutes : null, note: state[s.id].note || '', referred: !!state[s.id].referred, by_staff: S.me.id, updated_at: new Date().toISOString() }));
        await api.ups('attendance', rows, 'student_id,day');
        const ab = rows.filter(r => r.status === 'absent').length, lt = rows.filter(r => r.status === 'late').length;
        A.toast(`حُفظ حضور ${(A.cls(cid) || {}).name}: غائب ${AR(ab)} · متأخر ${AR(lt)}`, 'ok'); draw();
      });
    };
    A._attRefresh = () => { if (box.isConnected && !box.contains(document.activeElement)) draw(); };
    draw();
  }

  async function tBehavior(box) {
    let cid = A.LS.get('attcls') || (classesOf()[0] || {}).id;
    const draw = async () => {
      const recent = await api.list('behaviors', { school_id: sch() }, { order: 'created_at', desc: true });
      const list = STU.filter(s => s.class_id === cid);
      box.innerHTML = `<div class="grid g2" style="margin-top:12px;align-items:start"><div class="sec-box"><b>تسجيل سلوك</b>
        <div class="field" style="margin-top:8px"><label for="bC">الفصل</label><select class="in" id="bC">${classesOf().map(c => `<option value="${c.id}" ${c.id === cid ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="bS">الطالب</label><select class="in" id="bS">${list.map(s => `<option value="${s.id}">${esc(s.full_name)}</option>`).join('')}</select></div>
        <div class="chip-filter" id="bK"><button data-k="negative" class="on">سلوك يحتاج متابعة</button><button data-k="positive">سلوك إيجابي</button></div>
        <div class="field"><label for="bCat">التصنيف</label><select class="in" id="bCat">${NEG.map(x => `<option>${x}</option>`).join('')}</select></div>
        <div class="grid g2"><div class="field"><label for="bP">النقاط</label><input class="in" id="bP" type="number" value="1" min="0" max="20"></div><div class="field"><label for="bD">التاريخ</label><input class="in" id="bD" type="date" value="${today()}"></div></div>
        <div class="field"><label for="bN">ملاحظة</label><textarea class="in" id="bN" rows="2"></textarea></div>
        <label class="chk"><input type="checkbox" id="bR"> إحالة للمرشد الطلابي (يصله تنبيه فوري)</label>
        <div class="acts"><button class="btn" id="bGo">تسجيل</button></div></div>
        <div class="sec-box"><b>آخر السلوكيات المسجلة</b><div style="margin-top:8px;max-height:520px;overflow:auto">${recent.slice(0, 60).map(r => `<div class="bh ${r.kind}"><b>${esc(stu(r.student_id).full_name || '')}</b> <span class="small muted">· ${esc((A.cls(r.class_id) || {}).name || '')} · ${AR(r.day)}</span><div class="small">${esc(r.category)}${r.points ? ` (${AR(r.points)})` : ''}${r.note ? ' — ' + esc(r.note) : ''}</div>${r.referred ? `<span class="pill ${r.status === 'closed' ? 'st-approved' : 'st-submitted'}">محال للمرشد · ${r.status === 'closed' ? 'مغلق' : r.status === 'in_progress' ? 'قيد المتابعة' : 'جديد'}</span>` : ''}</div>`).join('') || '<p class="muted small">لا يوجد</p>'}</div></div></div>`;
      let kind = 'negative';
      $('#bC', box).onchange = e => { cid = e.target.value; A.LS.set('attcls', cid); draw(); };
      $$('#bK button', box).forEach(b => b.onclick = () => { kind = b.dataset.k; $$('#bK button', box).forEach(x => x.classList.toggle('on', x === b)); $('#bCat', box).innerHTML = (kind === 'positive' ? POS : NEG).map(x => `<option>${x}</option>`).join(''); });
      $('#bGo', box).onclick = e => A.run(e.currentTarget, async () => {
        const sid = $('#bS', box).value; if (!sid) throw new Error('اختر الطالب');
        await api.ins('behaviors', { school_id: sch(), student_id: sid, class_id: cid, day: $('#bD', box).value || today(), kind, category: $('#bCat', box).value, points: +$('#bP', box).value || 0, note: $('#bN', box).value.trim(), referred: $('#bR', box).checked, by_staff: S.me.id });
        A.toast('سُجِّل السلوك' + ($('#bR', box).checked ? ' وأُحيل للمرشد' : ''), 'ok'); draw();
      });
    };
    A._attRefresh = () => { if (box.isConnected && !box.contains(document.activeElement)) draw(); };
    draw();
  }

  async function tRefer(box) {
    const draw = async () => {
      const [bh, ab] = await Promise.all([api.list('behaviors', { school_id: sch(), referred: true }, { order: 'created_at', desc: true }), api.list('attendance', { school_id: sch(), referred: true }, { order: 'day', desc: true })]);
      const open = bh.filter(r => r.status !== 'closed');
      box.innerHTML = `<div class="grid g3" style="margin:12px 0"><div class="kpi"><div class="k">إحالات سلوكية مفتوحة</div><div class="v">${AR(open.length)}</div></div><div class="kpi"><div class="k">إحالات غياب وتأخر</div><div class="v">${AR(ab.length)}</div></div><div class="kpi"><div class="k">أُغلقت</div><div class="v">${AR(bh.length - open.length)}</div></div></div>
        <div class="scroll"><table class="tbl"><thead><tr><th>الطالب</th><th>الفصل</th><th>التاريخ</th><th>السبب</th><th>من أحال</th><th>الحالة</th><th style="width:28%">إجراء المرشد</th></tr></thead><tbody>
        ${bh.map(r => `<tr><td><b>${esc(stu(r.student_id).full_name || '')}</b></td><td>${esc((A.cls(r.class_id) || {}).name || '')}</td><td>${AR(r.day)}</td><td class="small">${esc(r.category)}${r.note ? ' — ' + esc(r.note) : ''}</td><td class="small">${esc(A.personName(r.by_staff) || '')}</td>
          <td><select class="in" data-bs="${r.id}" style="padding:6px">${[['open', 'جديد'], ['in_progress', 'قيد المتابعة'], ['closed', 'مغلق']].map(([k, l]) => `<option value="${k}" ${r.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
          <td><input class="in" data-bn="${r.id}" value="${esc(r.counselor_note)}" placeholder="الإجراء المتخذ" style="padding:6px"></td></tr>`).join('')}
        ${ab.map(r => `<tr><td><b>${esc(stu(r.student_id).full_name || '')}</b></td><td>${esc((A.cls(r.class_id) || {}).name || '')}</td><td>${AR(r.day)}</td><td class="small">${stName(r.status)}${r.note ? ' — ' + esc(r.note) : ''}</td><td class="small">${esc(A.personName(r.by_staff) || '')}</td><td><span class="pill st-submitted">إحالة حضور</span></td><td></td></tr>`).join('') || (bh.length ? '' : `<tr><td colspan="7">${A.emptyBox('لا توجد إحالات')}</td></tr>`)}
        </tbody></table></div>`;
      const can = mod('counselor') || S.me.is_owner;
      $$('[data-bs]', box).forEach(s => { s.disabled = !can; s.onchange = () => A.run(null, async () => { await api.upd('behaviors', s.dataset.bs, { status: s.value }); A.toast('حُدِّثت الحالة', 'ok'); }); });
      $$('[data-bn]', box).forEach(i => { i.readOnly = !can; i.onchange = () => A.run(null, async () => { await api.upd('behaviors', i.dataset.bn, { counselor_note: i.value.trim() }); A.toast('حُفظ الإجراء', 'ok'); }); });
    };
    A._attRefresh = () => { if (box.isConnected && !box.contains(document.activeElement)) draw(); };
    draw();
  }

  async function tReports(box) {
    const d0 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    box.innerHTML = `<div class="row" style="margin:12px 0;gap:8px"><label class="small">من <input type="date" class="in" id="rF" value="${d0}" style="max-width:170px"></label><label class="small">إلى <input type="date" class="in" id="rT" value="${today()}" style="max-width:170px"></label>
      <select class="in" id="rScope" style="max-width:200px"><option value="school">المدرسة كاملة</option>${S.sections.map(s => `<option value="sec:${s.id}">${esc(s.name)}</option>`).join('')}${classesOf().map(c => `<option value="cls:${c.id}">${esc(c.name)}</option>`).join('')}</select>
      <button class="btn" id="rGo">عرض</button></div><div id="rOut"></div>`;
    $('#rGo', box).onclick = e => A.run(e.currentTarget, async () => {
      const from = $('#rF', box).value, to = $('#rT', box).value, sc = $('#rScope', box).value;
      const [att, bh] = await Promise.all([api.list('attendance', { school_id: sch() }, { gte: { day: from }, lte: { day: to } }), api.list('behaviors', { school_id: sch() }, { gte: { day: from }, lte: { day: to } })]);
      const inScope = s => sc === 'school' || (sc.startsWith('sec:') && s.section_id === sc.slice(4)) || (sc.startsWith('cls:') && s.class_id === sc.slice(4));
      const list = STU.filter(inScope); const R = {};
      list.forEach(s => R[s.id] = { s, absent: 0, late: 0, lateMin: 0, excused: 0, early: 0, pos: 0, neg: 0, days: 0 });
      att.forEach(a => { const r = R[a.student_id]; if (!r) return; r.days++; if (a.status === 'absent') r.absent++; if (a.status === 'late') { r.late++; r.lateMin += a.minutes || 0; } if (a.status === 'excused') r.excused++; if (a.status === 'early') r.early++; });
      bh.forEach(b => { const r = R[b.student_id]; if (!r) return; if (b.kind === 'positive') r.pos += b.points || 1; else r.neg += b.points || 1; });
      const rows = Object.values(R).sort((a, b) => b.absent - a.absent || b.late - a.late);
      const tot = rows.reduce((a, r) => ({ absent: a.absent + r.absent, late: a.late + r.late, days: a.days + r.days, neg: a.neg + r.neg }), { absent: 0, late: 0, days: 0, neg: 0 });
      const byCls = {}; rows.forEach(r => { const k = r.s.class_id; const o = byCls[k] = byCls[k] || { n: 0, absent: 0, late: 0, days: 0 }; o.n++; o.absent += r.absent; o.late += r.late; o.days += r.days; });
      const tbl = `<div class="scroll"><table class="tbl"><thead><tr><th>الطالب</th><th>الفصل</th><th>أيام مرصودة</th><th>غياب</th><th>تأخر</th><th>مستأذن</th><th>خروج مبكر</th><th>إيجابي</th><th>يحتاج متابعة</th><th></th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.s.full_name)}</b></td><td>${esc((A.cls(r.s.class_id) || {}).name || '')}</td><td>${AR(r.days)}</td><td>${r.absent ? `<span class="pill st-returned">${AR(r.absent)}</span>` : '—'}</td><td>${r.late ? AR(r.late) + (r.lateMin ? ` <span class="small muted">(${AR(r.lateMin)} د)</span>` : '') : '—'}</td><td>${AR(r.excused)}</td><td>${AR(r.early)}</td><td>${AR(r.pos)}</td><td>${AR(r.neg)}</td><td><button class="btn ghost sm" data-sr="${r.s.id}">تقرير شامل</button></td></tr>`).join('')}</tbody></table></div>`;
      const clsT = `<h3 style="margin-top:16px">حسب الفصل</h3><div class="scroll"><table class="tbl"><thead><tr><th>الفصل</th><th>الطلاب</th><th>نسبة الحضور</th><th>غياب</th><th>تأخر</th></tr></thead><tbody>${Object.entries(byCls).map(([k, o]) => `<tr><td><b>${esc((A.cls(k) || {}).name || '')}</b></td><td>${AR(o.n)}</td><td>${o.days ? AR(A.pct(o.days - o.absent, o.days)) + '٪' : '—'}</td><td>${AR(o.absent)}</td><td>${AR(o.late)}</td></tr>`).join('')}</tbody></table></div>`;
      const kp = `<div class="grid g4" style="margin:12px 0"><div class="kpi navy"><div class="k">نسبة الحضور</div><div class="v">${tot.days ? AR(A.pct(tot.days - tot.absent, tot.days)) : '—'}<small>٪</small></div></div><div class="kpi"><div class="k">أيام غياب</div><div class="v">${AR(tot.absent)}</div></div><div class="kpi"><div class="k">حالات تأخر</div><div class="v">${AR(tot.late)}</div></div><div class="kpi"><div class="k">نقاط سلوك تحتاج متابعة</div><div class="v">${AR(tot.neg)}</div></div></div>`;
      $('#rOut', box).innerHTML = `<div class="row"><button class="btn ghost sm" id="rX">${I.down} Excel</button><button class="btn ghost sm" id="rP">${I.print} طباعة</button></div>` + kp + tbl + clsT;
      $('#rX', box).onclick = () => { const ws = XLSX.utils.json_to_sheet(rows.map(r => ({ الطالب: r.s.full_name, الفصل: (A.cls(r.s.class_id) || {}).name, 'أيام مرصودة': r.days, غياب: r.absent, تأخر: r.late, 'دقائق التأخر': r.lateMin, مستأذن: r.excused, 'خروج مبكر': r.early, إيجابي: r.pos, 'يحتاج متابعة': r.neg }))); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الحضور والسلوك'); wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, `تقرير الحضور والسلوك ${from} - ${to}.xlsx`); };
      $('#rP', box).onclick = () => A.printDoc('تقرير الحضور والسلوك', `${$('#rScope', box).selectedOptions[0].textContent} · ${from} إلى ${to}`, kp.replace(/<small>٪<\/small>/g, '٪') + tbl.replace(/<button[^>]*>.*?<\/button>/g, '') + clsT, true);
      $$('[data-sr]', box).forEach(b => b.onclick = () => studentReport(stu(b.dataset.sr), att.filter(a => a.student_id === b.dataset.sr), bh.filter(x => x.student_id === b.dataset.sr), from, to));
    });
  }
  function studentReport(s, att, bh, from, to) {
    const cnt = k => att.filter(a => a.status === k).length;
    const body = `<div><span class="k"><b>${AR(att.length)}</b>أيام مرصودة</span><span class="k"><b>${AR(cnt('absent'))}</b>غياب</span><span class="k"><b>${AR(cnt('late'))}</b>تأخر</span><span class="k"><b>${AR(cnt('excused'))}</b>مستأذن</span><span class="k"><b>${AR(bh.filter(b => b.kind === 'positive').length)}</b>سلوك إيجابي</span><span class="k"><b>${AR(bh.filter(b => b.kind === 'negative').length)}</b>يحتاج متابعة</span></div>
      <h3>سجل الحضور (غير الحضور فقط)</h3><table><tr><th>التاريخ</th><th>الحالة</th><th>ملاحظة</th></tr>${att.filter(a => a.status !== 'present').sort((a, b) => a.day.localeCompare(b.day)).map(a => `<tr><td>${esc(a.day)}</td><td>${stName(a.status)}${a.minutes ? ` (${a.minutes} د)` : ''}</td><td>${esc(a.note)}</td></tr>`).join('') || '<tr><td colspan="3">منتظم في الحضور</td></tr>'}</table>
      <h3>السلوك</h3><table><tr><th>التاريخ</th><th>النوع</th><th>التصنيف</th><th>ملاحظة</th><th>إجراء المرشد</th></tr>${bh.map(b => `<tr><td>${esc(b.day)}</td><td>${b.kind === 'positive' ? 'إيجابي' : 'يحتاج متابعة'}</td><td>${esc(b.category)}</td><td>${esc(b.note)}</td><td>${esc(b.counselor_note)}</td></tr>`).join('') || '<tr><td colspan="5">لا يوجد</td></tr>'}</table>`;
    A.printDoc(`التقرير الشامل للطالب: ${s.full_name}`, `${(A.cls(s.class_id) || {}).name || ''} · ${from} إلى ${to}`, body, false);
  }

  async function tStudents(box) {
    const draw = () => {
      const by = {}; STU.forEach(s => by[s.class_id] = (by[s.class_id] || 0) + 1);
      box.innerHTML = `<div class="notice info" style="display:block;margin:12px 0">استيراد من Excel: الأعمدة <b>الاسم</b>، <b>الفصل</b> (كما هو مكتوب في المنصة)، واختيارياً <b>رقم الهوية</b> (للربط الآلي بأوراق الاختبارات والباركود)، <b>رقم الطالب</b>، <b>اسم ولي الأمر</b>، <b>جوال ولي الأمر</b>. لا يُحذف أي طالب موجود؛ المطابق بالاسم والفصل يُحدَّث فقط.</div>
        <div class="row" style="margin-bottom:12px"><label class="btn"><input type="file" id="stF" accept=".xlsx,.xls,.csv" hidden> ${I.down} استيراد ملف</label><button class="btn ghost" id="stAdd">${I.plus} إضافة طالب</button><button class="btn ghost" id="stTpl">تنزيل نموذج</button></div>
        <div class="row" style="gap:6px">${classesOf().map(c => `<span class="ldc">${esc(c.name)} <b>${AR(by[c.id] || 0)}</b></span>`).join('')}</div>
        <div class="scroll" style="margin-top:10px;max-height:520px"><table class="tbl"><thead><tr><th>الطالب</th><th>الفصل</th><th>رقم الهوية</th><th>رقم الطالب</th><th>ولي الأمر</th><th></th></tr></thead><tbody>${STU.slice(0, 600).map(s => `<tr><td><b>${esc(s.full_name)}</b></td><td>${esc((A.cls(s.class_id) || {}).name || '—')}</td><td dir="ltr" class="small">${s.national_id ? esc(s.national_id) : '<span class="faint">—</span>'}</td><td>${esc(s.student_no || '')}</td><td class="small">${esc(s.guardian_name || '')} <span dir="ltr">${esc(s.guardian_phone || '')}</span></td><td class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn ghost sm" data-ed="${s.id}">تعديل</button><button class="btn bad sm" data-off="${s.id}" title="إيقاف (لا يحذف سجله)">إيقاف</button></td></tr>`).join('')}</tbody></table></div>`;
      $('#stTpl', box).onclick = () => { const ws = XLSX.utils.json_to_sheet([{ الاسم: 'محمد عبدالله العتيبي', الفصل: (classesOf()[0] || {}).name || '', 'رقم الهوية': '1100000001', 'رقم الطالب': '1001', 'اسم ولي الأمر': 'عبدالله العتيبي', 'جوال ولي الأمر': '0500000000' }]); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الطلاب'); XLSX.writeFile(wb, 'نموذج بيانات الطلاب.xlsx'); };
      $('#stAdd', box).onclick = () => { const m = A.modal(`<h3>إضافة طالب</h3><div class="grid g2"><div class="field"><label for="sn">الاسم</label><input class="in" id="sn"></div><div class="field"><label for="sc">الفصل</label><select class="in" id="sc">${classesOf().map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label for="snid">رقم الهوية / الإقامة</label><input class="in" id="snid" dir="ltr" inputmode="numeric"></div><div class="field"><label for="sno">رقم الطالب</label><input class="in" id="sno"></div><div class="field"><label for="sph">جوال ولي الأمر</label><input class="in" id="sph" dir="ltr"></div></div><div class="acts"><button class="btn" id="sgo">إضافة</button></div>`);
        m.el.querySelector('#sgo').onclick = e => A.run(e.currentTarget, async () => { const n = m.el.querySelector('#sn').value.trim(); if (n.length < 5) throw new Error('اكتب الاسم كاملاً'); const c = m.el.querySelector('#sc').value; await api.ins('students', { school_id: sch(), section_id: (A.cls(c) || {}).section_id || S.sectionId, class_id: c, full_name: n, student_no: m.el.querySelector('#sno').value.trim() || null, national_id: m.el.querySelector('#snid').value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '') || null, guardian_phone: m.el.querySelector('#sph').value.trim() || null }); m.close(); await loadStudents(true); draw(); A.toast('أُضيف الطالب', 'ok'); }); };
      $$('[data-ed]', box).forEach(b => b.onclick = () => { const st = STU.find(x => x.id === b.dataset.ed); const m = A.modal(`<h3>تعديل بيانات الطالب</h3><div class="grid g2"><div class="field"><label for="en">الاسم</label><input class="in" id="en" value="${esc(st.full_name)}"></div><div class="field"><label for="ec">الفصل</label><select class="in" id="ec">${classesOf().map(c => `<option value="${c.id}" ${c.id === st.class_id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label for="enid">رقم الهوية / الإقامة</label><input class="in" id="enid" dir="ltr" inputmode="numeric" value="${esc(st.national_id || '')}"></div><div class="field"><label for="eno">رقم الطالب</label><input class="in" id="eno" value="${esc(st.student_no || '')}"></div><div class="field"><label for="egn">اسم ولي الأمر</label><input class="in" id="egn" value="${esc(st.guardian_name || '')}"></div><div class="field"><label for="egp">جوال ولي الأمر</label><input class="in" id="egp" dir="ltr" value="${esc(st.guardian_phone || '')}"></div></div><div class="acts"><button class="btn" id="ego">حفظ</button></div>`);
        m.el.querySelector('#ego').onclick = e => A.run(e.currentTarget, async () => { const n = m.el.querySelector('#en').value.trim(); if (n.length < 5) throw new Error('اكتب الاسم كاملاً'); await api.upd('students', st.id, { full_name: n, class_id: m.el.querySelector('#ec').value, national_id: m.el.querySelector('#enid').value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, '') || null, student_no: m.el.querySelector('#eno').value.trim() || null, guardian_name: m.el.querySelector('#egn').value.trim() || null, guardian_phone: m.el.querySelector('#egp').value.trim() || null }); m.close(); await loadStudents(true); draw(); A.toast('حُفظ', 'ok'); }); });
      $$('[data-off]', box).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('إيقاف هذا الطالب (نقل أو انسحاب)؟ يبقى سجله في التقارير.', 'إيقاف', true))) return; A.run(null, async () => { await api.upd('students', b.dataset.off, { active: false }); await loadStudents(true); draw(); }); });
      $('#stF', box).onchange = e => A.run(null, async () => {
        const f = e.target.files[0]; if (!f) return; const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        const allCls = []; for (const sec of S.sections) { const cl = sec.id === S.sectionId ? S.classes : await api.classes(sec.id); cl.forEach(c => allCls.push(c)); }
        const norm = x => A.normKey(String(x || '')); const findC = n => allCls.find(c => norm(c.name) === norm(n));
        const ok = [], bad = []; rows.forEach((r, i) => { const n = String(r['الاسم'] || r['اسم الطالب'] || '').trim(); const c = findC(r['الفصل']); if (!n || !c) bad.push(i + 2); else ok.push({ n, c, r }); });
        if (!(await A.confirmBox(`سيُستورد ${A.cnt(ok.length, 'طالب', 'طلاب')}${bad.length ? `، وتُترك ${AR(bad.length)} صفوف لم يُعرف فصلها (الصفوف: ${bad.slice(0, 12).join('، ')})` : ''}. المطابق بالاسم والفصل يُحدَّث.`, 'استيراد'))) return;
        const exist = new Map(STU.map(s => [norm(s.full_name) + '|' + s.class_id, s])); const add = [];
        for (const { n, c, r } of ok) { const nid = String(r['رقم الهوية'] || r['الهوية'] || r['السجل المدني'] || r['رقم الإقامة'] || r['رقم الهوية الوطنية'] || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/\D/g, ''); const p = { ...(nid ? { national_id: nid } : {}), student_no: String(r['رقم الطالب'] || '').trim() || null, guardian_name: String(r['اسم ولي الأمر'] || '').trim() || null, guardian_phone: String(r['جوال ولي الأمر'] || '').trim() || null }; const x = exist.get(norm(n) + '|' + c.id); if (x) await api.upd('students', x.id, p); else add.push({ school_id: sch(), section_id: c.section_id, class_id: c.id, full_name: n, ...p }); }
        for (let i = 0; i < add.length; i += 400) await api.ins('students', add.slice(i, i + 400));
        await loadStudents(true); draw(); A.toast(`استُورد ${A.cnt(add.length, 'طالب جديد', 'طلاب جدد')} وحُدِّث ${AR(ok.length - add.length)}`, 'ok');
      });
    };
    draw();
  }

  // =====================================================================
  //  الإشراف التربوي — قوالب، تقارير خاصة، إرسال جماعي، إقرار بتوقيع إلكتروني، خطط علاجية
  // =====================================================================
  const KINDS = { visit: 'زيارة صفية', report: 'تقرير متابعة', remedial: 'خطة علاجية', notice: 'إشعار / تنبيه' };
  const BUILT = [
    { key: 'b-visit', kind: 'visit', title: 'نموذج زيارة صفية', requires_ack: true, fields: [{ id: 'f1', type: 'rating', label: 'محاور التقييم', scale: 5, items: ['التخطيط للدرس', 'إدارة الصف', 'استراتيجيات التدريس', 'التقويم والمتابعة', 'توظيف التقنية والوسائل', 'التعامل مع الطلاب'] }, { id: 'f2', type: 'text', label: 'نقاط القوة' }, { id: 'f3', type: 'text', label: 'التوصيات' }] },
    { key: 'b-report', kind: 'report', title: 'تقرير متابعة', requires_ack: true, fields: [{ id: 'f1', type: 'text', label: 'الملاحظات' }, { id: 'f2', type: 'text', label: 'التوصيات' }] },
    { key: 'b-remedial', kind: 'remedial', title: 'خطة علاجية', requires_ack: true, fields: [{ id: 'f1', type: 'text', label: 'الهدف' }, { id: 'f2', type: 'rows', label: 'الإجراءات', columns: ['الإجراء', 'المسؤول', 'الموعد'] }, { id: 'f3', type: 'text', label: 'مؤشرات النجاح' }] },
    { key: 'b-notice', kind: 'notice', title: 'إشعار', requires_ack: true, fields: [{ id: 'f1', type: 'text', label: 'نص الإشعار' }] },
  ];
  function formHTML(fields, data, ro) {
    data = data || {};
    return fields.map(f => {
      const v = data[f.id];
      if (f.type === 'rating') { const sc = f.scale || 5; return `<div class="field"><label>${esc(f.label)}</label><table class="tbl rt"><thead><tr><th>المحور</th>${Array.from({ length: sc }, (_, i) => `<th>${AR(i + 1)}</th>`).join('')}</tr></thead><tbody>${(f.items || []).map((it, i) => `<tr><td>${esc(it)}</td>${Array.from({ length: sc }, (_, k) => `<td><input type="radio" name="${f.id}_${i}" value="${k + 1}" ${(v || [])[i] == k + 1 ? 'checked' : ''} ${ro ? 'disabled' : ''} aria-label="${esc(it)} ${k + 1}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
      if (f.type === 'rows') { const rows = (v && v.length ? v : [{}, {}]); return `<div class="field"><label>${esc(f.label)}</label><table class="tbl"><thead><tr>${(f.columns || []).map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody data-rows="${f.id}">${rows.map(r => `<tr>${(f.columns || []).map((c, ci) => `<td>${ro ? esc((r || {})[ci] || '') : `<input class="in" data-c="${ci}" value="${esc((r || {})[ci] || '')}" style="padding:6px">`}</td>`).join('')}</tr>`).join('')}</tbody></table>${ro ? '' : `<button type="button" class="btn ghost sm" data-addrow="${f.id}">${I.plus} سطر</button>`}</div>`; }
      return `<div class="field"><label>${esc(f.label)}</label>${ro ? `<div class="ro-txt">${esc(v || '—')}</div>` : `<textarea class="in" data-f="${f.id}" rows="3">${esc(v || '')}</textarea>`}</div>`;
    }).join('');
  }
  function bindForm(el, fields) { $$('[data-addrow]', el).forEach(b => b.onclick = () => { const f = fields.find(x => x.id === b.dataset.addrow); const tb = el.querySelector(`[data-rows="${f.id}"]`); tb.insertAdjacentHTML('beforeend', `<tr>${f.columns.map((c, ci) => `<td><input class="in" data-c="${ci}" style="padding:6px"></td>`).join('')}</tr>`); }); }
  function readForm(el, fields) { const d = {}; fields.forEach(f => { if (f.type === 'rating') d[f.id] = (f.items || []).map((_, i) => { const r = el.querySelector(`input[name="${f.id}_${i}"]:checked`); return r ? +r.value : null; }); else if (f.type === 'rows') d[f.id] = $$(`[data-rows="${f.id}"] tr`, el).map(tr => $$('[data-c]', tr).map(i => i.value.trim())).filter(r => r.some(Boolean)); else d[f.id] = (el.querySelector(`[data-f="${f.id}"]`) || {}).value || ''; }); return d; }
  function printRecord(r) {
    const fields = (r.data && r.data._fields) || []; const body = formHTML(fields, r.data, true).replace(/class="field"/g, 'style="margin-bottom:10px"').replace(/<label>/g, '<h3 style="margin:8px 0 4px;font-size:15px">').replace(/<\/label>/g, '</h3>');
    const sig = r.status === 'acknowledged' ? `<div style="margin-top:18px;border-top:2px solid #3AB1DB;padding-top:10px;display:flex;justify-content:space-between;align-items:center"><div><b>إقرار المعلم:</b> ${esc(r.ack_name || '')}<br><span style="font-size:11px">بتاريخ ${esc(A.fmtDT(r.ack_at))}</span>${r.ack_note ? `<br><span style="font-size:12px">ملاحظة: ${esc(r.ack_note)}</span>` : ''}</div>${r.ack_signature ? `<img src="${r.ack_signature}" style="height:70px">` : ''}</div>` : `<div style="margin-top:18px;color:#a85d00">لم يُقرّ المعلم بعد</div>`;
    A.printDoc(r.title, `${KINDS[r.kind] || ''} · المعلم: ${A.personName(r.teacher_id)} · ${A.fmtDT(r.sent_at || r.created_at)}`, body + sig, false);
  }

  V.supervision = async function (root) {
    if (!mod('supervision')) { root.innerHTML = `<div class="card">${A.emptyBox('غير متاح لحسابك', 'يمنحه مالك النظام من «المسميات والصلاحيات».')}</div>`; return; }
    root.innerHTML = '<div class="spinner"></div>';
    let [tpls, recs] = await Promise.all([api.list('sup_templates', { school_id: sch() }, { order: 'created_at' }), api.list('sup_records', { school_id: sch() }, { order: 'created_at', desc: true })]);
    const allT = () => BUILT.filter(b => !tpls.some(t => t.title === b.title)).map(b => ({ ...b, id: b.key, builtin: true })).concat(tpls);
    let tab = A.LS.get('suptab') || 'forms';
    const teachers = S.staff.filter(p => p.active && !p.is_owner);
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>الإشراف التربوي</h2><p class="sub" style="margin:2px 0 0">تقارير خاصة تُرسل للمعلم، يُقرّ بها بتوقيع إلكتروني تُحفظ معه، وخطط علاجية تظهر في حسابه.</p></div><button class="btn" id="spNew">${I.plus} تقرير جديد</button></div>
      <div class="tabs"><button data-t="forms" class="${tab === 'forms' ? 'on' : ''}">نماذج الإشراف الكاملة</button><button data-t="records" class="${tab === 'records' ? 'on' : ''}">التقارير المرسلة</button><button data-t="templates" class="${tab === 'templates' ? 'on' : ''}">القوالب</button></div><div id="spb"></div></div>`;
    $$('.tabs button', root).forEach(b => b.onclick = () => { A.LS.set('suptab', b.dataset.t); V.supervision(root); });
    const box = $('#spb', root);
    const reload = async () => { [tpls, recs] = await Promise.all([api.list('sup_templates', { school_id: sch() }, { order: 'created_at' }), api.list('sup_records', { school_id: sch() }, { order: 'created_at', desc: true })]); draw(); };
    const newRecord = (tplId, rec) => {
      const t = rec ? { fields: rec.data._fields, title: rec.title, kind: rec.kind, requires_ack: rec.requires_ack } : allT().find(x => x.id === tplId) || allT()[0];
      const m = A.modal(`<h3>${rec ? 'تعديل تقرير' : 'تقرير جديد'}</h3>
        <div class="grid g3"><div class="field"><label for="rtp">القالب</label><select class="in" id="rtp" ${rec ? 'disabled' : ''}>${allT().map(x => `<option value="${x.id}" ${x.title === t.title ? 'selected' : ''}>${esc(x.title)} — ${KINDS[x.kind]}</option>`).join('')}</select></div>
        <div class="field"><label for="rti">العنوان</label><input class="in" id="rti" value="${esc(rec ? rec.title : t.title)}"></div><div class="field"><label for="rdu">موعد الإقرار (اختياري)</label><input class="in" type="date" id="rdu" value="${rec && rec.due_date || ''}"></div></div>
        ${rec ? `<p class="small muted">المعلم: <b>${esc(A.personName(rec.teacher_id))}</b></p>` : `<div class="field"><label>المعلمون (يُنشأ تقرير خاص منفصل لكل معلم)</label><input class="in" id="rq" placeholder="بحث بالاسم" style="margin-bottom:6px"><div class="perm-grid" id="rts" style="max-height:200px;overflow:auto">${teachers.map(p => `<label class="chk"><input type="checkbox" value="${p.id}"> ${esc(p.full_name)}${p.title ? ` <span class="small muted">— ${esc(p.title)}</span>` : ''}</label>`).join('')}</div></div>`}
        <label class="chk"><input type="checkbox" id="rack" ${t.requires_ack !== false ? 'checked' : ''}> يتطلب إقرار المعلم بتوقيع إلكتروني</label>
        <div id="rform" style="margin-top:10px">${formHTML(t.fields, rec && rec.data, false)}</div>
        <div class="acts"><button class="btn ghost" id="rdraft">حفظ مسودة</button><button class="btn" id="rsend">إرسال للمعلم</button></div>`, { cls: 'wide' });
      bindForm(m.el, t.fields);
      if (!rec) { m.el.querySelector('#rtp').onchange = e => { m.close(); newRecord(e.target.value); }; m.el.querySelector('#rq').oninput = e => { const q = A.normKey(e.target.value); $$('#rts label', m.el).forEach(l => l.style.display = !q || A.normKey(l.textContent).includes(q) ? '' : 'none'); }; }
      const save = send => async ev => A.run(ev.currentTarget, async () => {
        const data = { ...readForm(m.el, t.fields), _fields: t.fields }; const title = m.el.querySelector('#rti').value.trim() || t.title; const due = m.el.querySelector('#rdu').value || null; const ack = m.el.querySelector('#rack').checked;
        const patch = { title, data, due_date: due, requires_ack: ack, ...(send ? { status: 'sent', sent_at: new Date().toISOString() } : {}), updated_at: new Date().toISOString() };
        let ids = [];
        if (rec) { await api.upd('sup_records', rec.id, patch); ids = [rec.teacher_id]; }
        else { ids = $$('#rts input:checked', m.el).map(i => i.value); if (!ids.length) throw new Error('اختر معلماً واحداً على الأقل'); await api.ins('sup_records', ids.map(tid => ({ school_id: sch(), template_id: tpls.some(x => x.id === m.el.querySelector('#rtp').value) ? m.el.querySelector('#rtp').value : null, teacher_id: tid, kind: t.kind, status: 'draft', created_by: S.me.id, ...patch }))); }
        if (send && api.sendMessages) await api.sendMessages(ids.map(tid => ({ recipient_id: tid, subject: 'تقرير إشرافي: ' + title, body: `وصلك ${KINDS[t.kind] || 'تقرير'} «${title}» في صفحة «تقاريري».${ack ? ' يرجى الاطلاع والإقرار بالتوقيع' + (due ? ' قبل ' + due : '') + '.' : ''}`, kind: 'system' }))).catch(() => { });
        m.close(); await reload(); A.toast(send ? `أُرسل إلى ${A.cnt(ids.length, 'معلم', 'معلمين')}` : 'حُفظت المسودة', 'ok');
      });
      m.el.querySelector('#rdraft').onclick = save(false); m.el.querySelector('#rsend').onclick = save(true);
    };
    const editTpl = t => {
      t = t ? JSON.parse(JSON.stringify(t)) : { kind: 'report', title: '', requires_ack: true, fields: [{ id: 'f1', type: 'text', label: 'الملاحظات' }] };
      const m = A.modal(`<h3>${t.id && !t.builtin ? 'تعديل قالب' : 'قالب جديد'}</h3><div class="grid g2"><div class="field"><label for="tt">العنوان</label><input class="in" id="tt" value="${esc(t.title)}"></div><div class="field"><label for="tk">النوع</label><select class="in" id="tk">${Object.entries(KINDS).map(([k, l]) => `<option value="${k}" ${t.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
        <label class="chk"><input type="checkbox" id="tack" ${t.requires_ack ? 'checked' : ''}> يتطلب إقرار المعلم</label><div id="tf" style="margin-top:10px"></div>
        <div class="row" style="margin-top:6px"><button class="btn ghost sm" data-af="text">${I.plus} نص</button><button class="btn ghost sm" data-af="rating">${I.plus} جدول تقييم</button><button class="btn ghost sm" data-af="rows">${I.plus} جدول إجراءات</button></div>
        <div class="acts">${t.id && !t.builtin ? '<button class="btn bad" id="tdel">حذف</button>' : ''}<button class="btn" id="tgo">اعتماد القالب</button></div>`, { cls: 'wide' });
      const draw2 = () => { m.el.querySelector('#tf').innerHTML = t.fields.map((f, i) => `<div class="sec-box" style="margin-bottom:6px"><div class="row" style="flex-wrap:nowrap"><span class="pill st-submitted">${f.type === 'rating' ? 'تقييم' : f.type === 'rows' ? 'جدول' : 'نص'}</span><input class="in" data-fl="${i}" value="${esc(f.label)}" placeholder="عنوان الحقل"><button class="btn bad sm" data-fr="${i}" aria-label="حذف">×</button></div>${f.type !== 'text' ? `<input class="in" data-fi="${i}" style="margin-top:6px" value="${esc((f.items || f.columns || []).join('، '))}" placeholder="${f.type === 'rating' ? 'المحاور مفصولة بفاصلة' : 'الأعمدة مفصولة بفاصلة'}">` : ''}</div>`).join('');
        $$('[data-fl]', m.el).forEach(i => i.oninput = () => t.fields[+i.dataset.fl].label = i.value);
        $$('[data-fi]', m.el).forEach(i => i.oninput = () => { const f = t.fields[+i.dataset.fi]; const l = i.value.split(/[،,]/).map(x => x.trim()).filter(Boolean); if (f.type === 'rating') f.items = l; else f.columns = l; });
        $$('[data-fr]', m.el).forEach(b => b.onclick = () => { t.fields.splice(+b.dataset.fr, 1); draw2(); }); };
      $$('[data-af]', m.el).forEach(b => b.onclick = () => { const ty = b.dataset.af; t.fields.push({ id: 'f' + Date.now().toString(36), type: ty, label: '', ...(ty === 'rating' ? { scale: 5, items: [] } : ty === 'rows' ? { columns: ['الإجراء', 'المسؤول', 'الموعد'] } : {}) }); draw2(); });
      draw2();
      m.el.querySelector('#tgo').onclick = e => A.run(e.currentTarget, async () => { const row = { school_id: sch(), title: m.el.querySelector('#tt').value.trim(), kind: m.el.querySelector('#tk').value, requires_ack: m.el.querySelector('#tack').checked, fields: t.fields.filter(f => f.label.trim()), status: 'approved' }; if (!row.title) throw new Error('اكتب عنوان القالب'); if (!row.fields.length) throw new Error('أضف حقلاً واحداً على الأقل'); if (t.id && !t.builtin) await api.upd('sup_templates', t.id, row); else await api.ins('sup_templates', row); m.close(); await reload(); A.toast('اعتُمد القالب', 'ok'); });
      const td = m.el.querySelector('#tdel'); if (td) td.onclick = e => A.run(e.currentTarget, async () => { await api.del('sup_templates', t.id); m.close(); await reload(); });
    };
    const draw = () => {
      if (tab === 'forms') {
        box.innerHTML = `<div class="row" style="margin:10px 0;gap:8px"><span class="small muted">كل نماذج «خطة ونماذج الإشراف ١٤٤٨هـ» (${'الخطط والجداول، النماذج واللقاءات، بطاقات التقويم والزيارات، التقارير والقرارات، التعاميم والتكليفات والمساءلات، التطوير المهني'}) بهوية دينا، قابلة للتعديل والإضافة والحذف، وتُحفظ في قاعدة بيانات المنصة. المعلمون يُضافون تلقائياً من حسابات المنصة.</span><div class="grow"></div><a class="btn ghost sm" href="tools/supervision.html" target="_blank" rel="noopener">صفحة كاملة</a></div>
          <iframe class="sup-frame" src="tools/supervision.html?v=${Date.now().toString(36).slice(0, 5)}" title="نماذج الإشراف التربوي"></iframe>`;
        return;
      }
      if (tab === 'templates') {
        box.innerHTML = `<div class="row" style="margin:12px 0"><button class="btn ghost" id="tNew">${I.plus} قالب مخصص</button><span class="small muted">القوالب المعتمدة (ومنها الخطط العلاجية) تظهر للمعلم عند إرسالها له.</span></div><div class="res-grid">${allT().map(t => `<div class="res"><div class="rk" style="--k:${t.kind === 'remedial' ? '#C9A44C' : t.kind === 'visit' ? '#2E7FC9' : '#3AB1DB'}">${KINDS[t.kind]}</div><div class="rt">${esc(t.title)}</div><div class="small muted">${A.cnt(t.fields.length, 'حقل', 'حقول')}${t.requires_ack ? ' · يتطلب إقراراً' : ''}${t.builtin ? ' · قالب جاهز' : ''}</div><div class="rf"><span></span><span class="row" style="gap:4px"><button class="btn ghost sm" data-use="${t.id}">استخدام</button><button class="btn ghost sm" data-et="${t.id}">${t.builtin ? 'تخصيص' : 'تعديل'}</button></span></div></div>`).join('')}</div>`;
        $('#tNew', box).onclick = () => editTpl();
        $$('[data-use]', box).forEach(b => b.onclick = () => newRecord(b.dataset.use));
        $$('[data-et]', box).forEach(b => b.onclick = () => { const t = allT().find(x => x.id === b.dataset.et); editTpl(t.builtin ? { ...t, id: null, builtin: false } : t); });
        return;
      }
      const now = today(); const late = r => r.status === 'sent' && r.due_date && r.due_date < now;
      const k = { sent: recs.filter(r => r.status === 'sent').length, ack: recs.filter(r => r.status === 'acknowledged').length, draft: recs.filter(r => r.status === 'draft').length, late: recs.filter(late).length };
      box.innerHTML = `<div class="grid g4" style="margin:12px 0"><div class="kpi navy"><div class="k">بانتظار الإقرار</div><div class="v">${AR(k.sent)}</div></div><div class="kpi"><div class="k">أُقِرّ بها</div><div class="v">${AR(k.ack)}</div></div><div class="kpi"><div class="k">متأخر عن الموعد</div><div class="v" style="${k.late ? 'color:var(--bad)' : ''}">${AR(k.late)}</div></div><div class="kpi"><div class="k">مسودات</div><div class="v">${AR(k.draft)}</div></div></div>
        ${k.late ? `<div class="notice warn" style="display:block;margin-bottom:10px">${A.cnt(k.late, 'تقرير', 'تقارير')} تجاوزت موعد الإقرار. <button class="btn ghost sm" id="spRem">${I.mail} تذكير المتأخرين</button></div>` : ''}
        <div class="scroll"><table class="tbl"><thead><tr><th>العنوان</th><th>النوع</th><th>المعلم</th><th>الحالة</th><th>الإرسال</th><th>الإقرار</th><th></th></tr></thead><tbody>${recs.map(r => `<tr><td><b>${esc(r.title)}</b></td><td>${KINDS[r.kind] || ''}</td><td>${esc(A.personName(r.teacher_id))}</td><td><span class="pill ${r.status === 'acknowledged' ? 'st-approved' : r.status === 'sent' ? (late(r) ? 'st-returned' : 'st-submitted') : 'st-empty'}">${r.status === 'acknowledged' ? 'أُقِرّ' : r.status === 'sent' ? (late(r) ? 'متأخر' : 'مرسل') : r.status === 'closed' ? 'مغلق' : 'مسودة'}</span></td><td class="small">${r.sent_at ? A.fmtDT(r.sent_at) : '—'}</td><td class="small">${r.ack_at ? A.fmtDT(r.ack_at) + ' · ' + esc(r.ack_name || '') : r.due_date ? 'قبل ' + AR(r.due_date) : '—'}</td><td class="row" style="flex-wrap:nowrap;gap:4px">${r.status === 'draft' ? `<button class="btn ghost sm" data-ed="${r.id}">تعديل</button>` : ''}<button class="btn ghost sm" data-pr="${r.id}">${I.print}</button>${r.status !== 'acknowledged' ? `<button class="btn bad sm" data-dl="${r.id}" aria-label="حذف">×</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="7">${A.emptyBox('لا توجد تقارير بعد', 'ابدأ من «تقرير جديد» أو من القوالب.')}</td></tr>`}</tbody></table></div>`;
      $$('[data-ed]', box).forEach(b => b.onclick = () => newRecord(null, recs.find(r => r.id === b.dataset.ed)));
      $$('[data-pr]', box).forEach(b => b.onclick = () => printRecord(recs.find(r => r.id === b.dataset.pr)));
      $$('[data-dl]', box).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذا التقرير؟', 'حذف', true))) return; A.run(null, async () => { await api.del('sup_records', b.dataset.dl); await reload(); }); });
      const rm = $('#spRem', box); if (rm) rm.onclick = e => A.run(e.currentTarget, async () => { const l = recs.filter(late); await api.sendMessages(l.map(r => ({ recipient_id: r.teacher_id, subject: 'تذكير: إقرار تقرير إشرافي', body: `نذكّركم بالاطلاع على «${r.title}» والإقرار به في صفحة «تقاريري».`, kind: 'system' }))); A.toast(`أُرسل التذكير إلى ${A.cnt(l.length, 'معلم', 'معلمين')}`, 'ok'); });
    };
    $('#spNew', root).onclick = () => newRecord(allT()[0].id);
    draw();
  };

  // ---------- صفحة المعلم: تقاريري ----------
  V.myreports = async function (root) {
    root.innerHTML = '<div class="spinner"></div>';
    const recs = (await api.list('sup_records', { teacher_id: S.me.id }, { order: 'sent_at', desc: true })).filter(r => r.status !== 'draft');
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>تقاريري</h2><p class="sub" style="margin:2px 0 0">التقارير والخطط العلاجية الموجهة إليك من الإشراف — خاصة بك وحدك.</p></div></div>
      ${recs.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>العنوان</th><th>النوع</th><th>التاريخ</th><th>الحالة</th><th></th></tr></thead><tbody>${recs.map(r => `<tr><td><b>${esc(r.title)}</b></td><td>${KINDS[r.kind] || ''}</td><td class="small">${A.fmtDT(r.sent_at)}</td><td><span class="pill ${r.status === 'acknowledged' ? 'st-approved' : 'st-submitted'}">${r.status === 'acknowledged' ? 'تم الإقرار' : r.requires_ack ? 'بانتظار إقرارك' : 'للاطلاع'}</span></td><td><button class="btn sm" data-o="${r.id}">فتح</button></td></tr>`).join('')}</tbody></table></div>` : A.emptyBox('لا توجد تقارير موجهة إليك')}</div>`;
    $$('[data-o]', root).forEach(b => b.onclick = () => openRec(recs.find(r => r.id === b.dataset.o)));
    function openRec(r) {
      const fields = (r.data && r.data._fields) || [];
      const m = A.modal(`<h3>${esc(r.title)}</h3><p class="sub">${KINDS[r.kind] || ''} · ${A.fmtDT(r.sent_at)}${r.due_date ? ' · الإقرار قبل ' + AR(r.due_date) : ''}</p>${formHTML(fields, r.data, true)}
        ${r.status === 'acknowledged' ? `<div class="notice ok" style="display:block">أقررت بتاريخ ${A.fmtDT(r.ack_at)} — ${esc(r.ack_name || '')}${r.ack_signature ? `<br><img src="${r.ack_signature}" alt="التوقيع" style="height:60px;background:#fff;border-radius:8px;margin-top:6px">` : ''}</div>`
        : r.requires_ack ? `<div class="sec-box"><b>الإقرار بالاطلاع</b><div class="field" style="margin-top:6px"><label for="an">الاسم</label><input class="in" id="an" value="${esc(S.me.full_name)}"></div>
          <div class="field"><label>التوقيع (ارسم بالإصبع أو الفأرة)</label><canvas id="sig" width="560" height="160" style="width:100%;max-width:560px;height:160px;border:1.5px dashed var(--border);border-radius:12px;background:#fff;touch-action:none" aria-label="لوحة التوقيع"></canvas><button type="button" class="btn ghost sm" id="sclr">مسح</button></div>
          <div class="field"><label for="ano">ملاحظة (اختياري)</label><textarea class="in" id="ano" rows="2"></textarea></div><div class="acts"><button class="btn ok" id="ago">${I.check} أقرّ بالاطلاع</button></div></div>` : ''}
        <div class="acts"><button class="btn ghost" id="apr">${I.print} طباعة</button></div>`, { cls: 'wide' });
      m.el.querySelector('#apr').onclick = () => printRecord(r);
      const cv = m.el.querySelector('#sig'); if (!cv) return;
      const ctx = cv.getContext('2d'); ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.strokeStyle = '#082B5A'; let drawing = false, drawn = false;
      const pos = e => { const b = cv.getBoundingClientRect(); return [(e.clientX - b.left) * cv.width / b.width, (e.clientY - b.top) * cv.height / b.height]; };
      cv.onpointerdown = e => { drawing = true; cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); };
      cv.onpointermove = e => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); drawn = true; };
      cv.onpointerup = () => drawing = false;
      m.el.querySelector('#sclr').onclick = () => { ctx.clearRect(0, 0, cv.width, cv.height); drawn = false; };
      m.el.querySelector('#ago').onclick = e => A.run(e.currentTarget, async () => {
        if (!drawn) throw new Error('ارسم توقيعك أولاً'); const name = m.el.querySelector('#an').value.trim(); if (name.length < 3) throw new Error('اكتب اسمك');
        await api.rpc('sup_acknowledge', { p_id: r.id, p_name: name, p_signature: cv.toDataURL('image/png'), p_note: m.el.querySelector('#ano').value.trim() });
        m.close(); A.toast('تم الإقرار وحُفظ توقيعك', 'ok'); S.supPending = Math.max(0, (S.supPending || 1) - 1); V.myreports(root);
      });
    }
  };
})();
