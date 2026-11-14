/* منصة دينا — المعلم التجريبي (للمالك فقط)
   معلم وفصل تجريبيان لا يظهران لأحد غير المالك، ومستثنيان من كل شيء: القوائم، التقارير، لوحات المتابعة، المناوبة والانتظار، التصدير، صفحة ولي الأمر.
   المالك يسند للمعلم التجريبي ما يشاء من المواد والحصص في الفصل التجريبي، ثم «يدخل بحسابه» ليجرّب الأداء خطوة بخطوة، ويتابع مؤشراته. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR, DAYS, PER } = A;
  A.I.testt = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v5l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><circle cx="12" cy="15" r="1.5"/></svg>';
  // ---------- العزل: يختفي التجريبي من كل البيانات إلا في «وضع المعلم التجريبي» ----------
  let TEST = new Set(), TCLS = new Set();
  const testMode = () => !!(S.me && (S.me.is_test || (S.realMe && S.realMe.is_owner && TEST.has(S.me.id))));
  A.isTestMode = testMode; A.isTestStaff = id => TEST.has(id);
  const fStaff = l => { (l || []).forEach(x => { if (x.is_test) TEST.add(x.id); }); return testMode() ? l : (l || []).filter(x => !x.is_test || (S.me && x.id === S.me.id)); };
  const fCls = l => { (l || []).forEach(x => { if (x.is_test) TCLS.add(x.id); }); return testMode() ? l : (l || []).filter(x => !x.is_test); };
  const fEnt = l => testMode() ? l : (l || []).filter(e => !TCLS.has(e.class_id) && !TEST.has(e.teacher_id));
  const b0 = api.boot; api.boot = async function () { const r = await b0.apply(this, arguments); if (r && r.staff) { r.staff.forEach(x => { if (x.is_test) TEST.add(x.id); }); const va = A.LS.get('viewas'); const viewTest = r.me && r.me.is_owner && va && TEST.has(va); if (!viewTest && !(r.me && r.me.is_test)) r.staff = r.staff.filter(x => !x.is_test); } return r; };
  const w = (k, f) => { const o = api[k]; if (o) api[k] = async function () { return f(await o.apply(this, arguments)); }; };
  w('reloadStaff', fStaff); w('classes', fCls); w('entries', fEnt);
  if (api.list) { const l0 = api.list; api.listRaw = l0; api.list = async function (t) { const r = await l0.apply(this, arguments); if (testMode() || !Array.isArray(r)) return r; if (t === 'staff') return fStaff(r); if (t === 'classes') return fCls(r); if (t === 'plan_entries') return fEnt(r); return r; }; }

  if (A.NAV && !A.NAV.some(n => n[0] === 'testt')) A.NAV.push(['testt', 'المعلم التجريبي', () => !!(S.me && S.me.is_owner && !S.realMe)]);

  // ---------- صفحة المالك ----------
  V.testt = async function (root) {
    if (!S.me || !S.me.is_owner) { root.innerHTML = `<div class="card">${A.emptyBox('للمالك فقط')}</div>`; return; }
    root.innerHTML = '<div class="spinner"></div>';
    const sec = A.section();
    let T = (await api.listRaw('staff', { school_id: S.school.id, is_test: true }).catch(() => [])) || [];
    const t = T[0];
    let C = t ? ((await api.listRaw('classes', { section_id: sec.id, is_test: true }).catch(() => [])) || [])[0] : null;
    const cfg = Object.assign({ grid: {} }, (((S.school.settings || {}).testt || {})[sec.id]) || {});
    if (!t) {
      root.innerHTML = `<div class="card"><h2 style="margin-top:0">المعلم التجريبي</h2><p class="sub">أنشئ معلماً وفصلاً تجريبيين في ${esc(sec.name)}. لا يظهران لأحد غيرك، ومستثنيان من التقارير ولوحات المتابعة والمناوبة والانتظار والتصدير وصفحة ولي الأمر. تسند له ما تشاء ثم تدخل بحسابه وتجرّب كل شيء كما يراه المعلم.</p>
        <div class="grid g3"><div class="field"><label for="ttN">اسم المعلم التجريبي</label><input class="in" id="ttN" value="معلم تجريبي"></div><div class="field"><label for="ttG">الصف للفصل التجريبي</label><select class="in" id="ttG">${[...new Set(S.allClasses.map(c => c.stage + '|' + c.grade_word))].map(g => `<option value="${esc(g)}">${esc(A.gradeName(g.split('|')[1], g.split('|')[0]))}</option>`).join('')}</select></div></div>
        <div class="acts"><button class="btn ok" id="ttGo">إنشاء</button></div></div>`;
      $('#ttGo', root).onclick = e => A.run(e.currentTarget, async () => { const [st, gw] = $('#ttG', root).value.split('|');
        const nt = await api.addStaff({ school_id: S.school.id, full_name: $('#ttN', root).value.trim() || 'معلم تجريبي', is_test: true, active: true, title: 'معلم تجريبي' });
        await api.ins('memberships', { staff_id: nt.id, section_id: sec.id, role: 'teacher' }).catch(() => { });
        await api.addClass({ section_id: sec.id, name: 'فصل تجريبي', stage: st, grade_word: gw, class_label: 'تجريبي', is_test: true, active: true, sort: 999 });
        TEST.add(nt.id); A.toast('أُنشئ المعلم والفصل التجريبيان', 'ok'); V.testt(root); });
      return;
    }
    TEST.add(t.id); if (C) TCLS.add(C.id);
    const days = sec.days || 5, P = sec.periods || 7;
    const weeks = (S.weeks || []).filter(x => !x.archived).sort((a, b) => a.number - b.number);
    const wk = A.week() || weeks[0];
    const ents = wk && C ? ((await api.listRaw('plan_entries', { week_id: wk.id, class_id: C.id }).catch(() => [])) || []) : [];
    const mineE = ents.filter(e => e.teacher_id === t.id && e.subject_id);
    const filled = mineE.filter(e => (e.topic || '').trim() || (e.homework || '').trim());
    const [preps, quizzes, res] = await Promise.all([api.list('lesson_preps', { created_by: t.id }).catch(() => []), api.list('quizzes', { teacher_id: t.id }).catch(() => []), api.list('resources', { created_by: t.id }).catch(() => [])]);
    const subjOpts = sel => `<option value="">—</option>${S.subjects.map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}`;
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">المعلم التجريبي — ${esc(t.full_name)}</h2><p class="sub" style="margin:2px 0 0">لا يراه أحد غيرك، ومستثنى من كل التقارير والإحصاءات. ${C ? `فصله: <b>${esc(C.name)}</b> (${esc(A.gradeName(C.grade_word, C.stage))}) في ${esc(sec.name)}.` : ''}</p></div><button class="btn ok" id="ttIn">الدخول بحسابه وتجربة الأداء</button></div>
      <div class="pal-k"><div class="k info"><b>${AR(mineE.length)}</b>حصة مسندة هذا الأسبوع</div><div class="k ${filled.length < mineE.length ? 'warn' : 'ok'}"><b>${AR(A.pct(filled.length, mineE.length))}٪</b>اكتمال الخطة (${AR(filled.length)} من ${AR(mineE.length)})</div><div class="k"><b>${AR(mineE.filter(e => e.status === 'submitted' || e.status === 'approved').length)}</b>مُرسلة / معتمدة</div><div class="k"><b>${AR(preps.length)}</b>تحضير</div><div class="k"><b>${AR(quizzes.length)}</b>اختبار / واجب</div><div class="k"><b>${AR(res.length)}</b>مصدر</div></div>
      <h3 style="margin:14px 0 6px">الإسناد — جدول الفصل التجريبي</h3><p class="small muted" style="margin:0 0 6px">اختر مادة لأي حصة؛ تُسند للمعلم التجريبي في الأسابيع المفتوحة الحالية والقادمة. الفارغ = لا حصة.</p>
      <div class="scroll"><table class="tbl tt-g"><thead><tr><th></th>${Array.from({ length: P }, (_, p) => `<th>${PER[p] || AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${Array.from({ length: days }, (_, d) => `<tr><th>${DAYS[d]}</th>${Array.from({ length: P }, (_, p) => `<td><select class="in" data-g="${d}|${p}" aria-label="${DAYS[d]} ${p + 1}">${subjOpts(cfg.grid[d + '|' + p])}</select></td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn" id="ttSv">حفظ الإسناد وتطبيقه على الأسابيع المفتوحة</button><label class="chk"><input type="checkbox" id="ttCl"> مسح محتوى الحصص التي تتغير مادتها</label></div>
      <details class="dz-det" style="margin-top:14px"><summary>الإعدادات</summary><div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><input class="in" id="ttRn" value="${esc(t.full_name)}" style="max-width:220px"><button class="btn ghost sm" id="ttRs">تغيير الاسم</button><button class="btn bad sm" id="ttOff">${t.active ? 'إيقاف المعلم التجريبي' : 'تفعيل'}</button></div><p class="small muted">الإيقاف يخفي فصله وحصصه أيضاً ويمكن إعادته. لا يُحذف شيء.</p></details></div>`;
    $('#ttIn', root).onclick = async () => { A.LS.set('viewas', t.id); history.replaceState(null, '', location.pathname + location.search + '#/my'); await A.start(); };
    $('#ttSv', root).onclick = e => A.run(e.currentTarget, async () => {
      if (!C) throw new Error('لا يوجد فصل تجريبي');
      const grid = {}; $$('[data-g]', root).forEach(s2 => { if (s2.value) grid[s2.dataset.g] = s2.value; });
      const open = weeks.filter(x => x.status === 'open' || (wk && x.id === wk.id));
      const clear = $('#ttCl', root).checked; let n = 0;
      for (const x of open) { const ex = (await api.listRaw('plan_entries', { week_id: x.id, class_id: C.id }).catch(() => [])) || [];
        for (let d = 0; d < days; d++) for (let p = 0; p < P; p++) { const k = d + '|' + p, sj = grid[k] || null, cur = ex.find(e => e.day === d && e.period === p);
          if ((cur ? cur.subject_id : null) === sj && (!sj || (cur && cur.teacher_id === t.id))) continue;
          await api.rpc('edit_week_cell', { p_week: x.id, p_class: C.id, p_day: d, p_period: p, p_subject: sj, p_teacher: sj ? t.id : null, p_content: clear ? 'clear' : 'keep', p_reset: false }); n++; } }
      const tt = { ...((S.school.settings || {}).testt || {}), [sec.id]: { grid } }; const settings = { ...(S.school.settings || {}), testt: tt }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings;
      A.toast(`حُفظ الإسناد — ${AR(n)} تعديل في ${A.cnt(open.length, 'أسبوع', 'أسابيع')}`, 'ok'); V.testt(root); });
    $('#ttRs', root).onclick = e => A.run(e.currentTarget, async () => { await api.updateStaff(t.id, { full_name: $('#ttRn', root).value.trim() || t.full_name }); V.testt(root); });
    $('#ttOff', root).onclick = e => A.run(e.currentTarget, async () => { await api.updateStaff(t.id, { active: !t.active }); if (C) await api.updateClass(C.id, { active: !t.active }); V.testt(root); });
  };
})();
