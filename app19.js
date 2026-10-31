/* منصة دينا — استوديو الجداول والأنصبة (لحساب المالك)
   أيقونة واحدة تجمع: احتساب النصاب ← اعتماده ونقله إلى توزيع الحصص ← القيود والتوليد ← الجدول المعتمد لكل قسم ← كشف التعارض بين الأقسام.
   لا يمس خطط المعلمين: الجدول المولَّد يصل مسودةً تراجعها وتعتمدها كما هو معتاد. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, I, DAYS } = A;
  A.I.studio = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/><circle cx="18" cy="4" r="2.4" fill="currentColor"/></svg>';
  const TABS = [['nisab', 'النصاب', '١'], ['plan', 'التوزيع والقيود والتوليد', '٢'], ['timetable', 'الجدول المعتمد', '٣'], ['conflicts', 'تعارضات الأقسام', '٤'], ['builder', 'الأداة الكلاسيكية', '']];
  const GW = ['أول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سادس'];
  const gIdx = c => { const g = String(c.grade_word || c.name || ''); return GW.findIndex(w => g.includes(w)); };
  const stg = c => { const s = String(c.stage || '') + ' ' + c.name; return /ابتدائ/.test(s) ? 'p' : /متوسط/.test(s) ? 'm' : /ثانوي/.test(s) ? 's' : ''; };

  V.studio = function (root) {
    if (!S.me.is_owner) { root.innerHTML = `<div class="card">${A.emptyBox('استوديو الجداول لحساب المالك فقط')}</div>`; return; }
    let t = A.LS.get('studio_t') || 'plan'; if (!TABS.some(x => x[0] === t)) t = 'plan';
    const ap = (S.school.settings || {}).nisab_ok || {};
    root.innerHTML = `<div class="card st-head"><div class="head"><div class="grow"><h2>استوديو الجداول والأنصبة</h2><p class="sub" style="margin:2px 0 0">من النصاب إلى الجدول المعتمد في مكان واحد. لكل قسم جدوله الخاص، ويُكشف تعارض المعلم المشترك بين الأقسام تلقائياً. الأقسام تُضاف من «الإدارة ← المدرسة والأقسام».</p></div></div>
        <div class="st-secs" role="group" aria-label="القسم">${S.sections.map(s => `<button data-sec="${s.id}" class="${s.id === S.sectionId ? 'on' : ''}" aria-pressed="${s.id === S.sectionId}">${esc(s.name)}</button>`).join('')}</div>
        <ol class="st-steps">${TABS.map(([k, l, n]) => `<li><button data-t="${k}" class="${t === k ? 'on' : ''} ${n ? '' : 'aux'}" aria-current="${t === k ? 'step' : 'false'}">${n ? `<i>${n}</i>` : ''}${l}</button></li>`).join('')}</ol>
        ${t === 'nisab' || t === 'plan' ? `<div class="st-bridge"><div><b>النصاب ← توزيع الحصص</b><span class="small muted">${ap[S.sectionId] ? `آخر اعتماد لهذا القسم: ${A.fmtDT(ap[S.sectionId])}` : 'لم يُعتمد النصاب لهذا القسم بعد.'} يُنقل عدد حصص كل مادة لكل صف من أداة النصاب إلى فصول «${esc(A.section().name)}» — وتبقى حرّاً في التعديل بعدها.</span></div><button class="btn sky sm" id="stApprove">اعتماد النصاب ونقله إلى التوزيع</button></div>` : ''}</div>
      <div id="stBody"></div>`;
    $$('[data-sec]', root).forEach(b => b.onclick = () => { if (b.dataset.sec === S.sectionId) return; const sel = $('#secSel'); if (sel) { sel.value = b.dataset.sec; sel.dispatchEvent(new Event('change')); } });
    $$('.st-steps [data-t]', root).forEach(b => b.onclick = () => { A.LS.set('studio_t', b.dataset.t); V.studio(root); });
    const ab = $('#stApprove', root); if (ab) ab.onclick = () => approveNisab(root);
    const body = $('#stBody', root);
    if (t === 'conflicts') return conflicts(body);
    const fn = V[t]; if (!fn) { body.innerHTML = `<div class="card">${A.emptyBox('غير متاح')}</div>`; return; }
    try { const r = fn(body); if (r && r.catch) r.catch(e => { body.innerHTML = `<div class="card">${A.emptyBox('تعذّر العرض', esc(e.message))}</div>`; }); } catch (e) { body.innerHTML = `<div class="card">${A.emptyBox('تعذّر العرض', esc(e.message))}</div>`; }
  };

  // ---------- اعتماد النصاب ونقله ----------
  function readNisab() { try { return JSON.parse(localStorage.getItem('dina_nisab_state_v2') || 'null'); } catch (_) { return null; } }
  function nisabHours(st, c) {
    const s = stg(c), g = gIdx(c); if (!s || g < 0) return null;
    const list = s === 'p' ? st.primarySubjects : s === 'm' ? st.middleSubjects : st.secondarySubjects; if (!list) return null;
    const idx = s === 's' ? g * 2 : g; // الثانوي: الفصل الدراسي الأول لكل صف
    return list.map(x => [x.name, +((x.hours || [])[idx]) || 0]).filter(([, n]) => n > 0);
  }
  async function approveNisab(root) {
    const st = readNisab();
    if (!st) return A.toast('لا توجد بيانات في أداة النصاب على هذا الجهاز بعد — افتح تبويب «النصاب» وأدخلها أولاً', 'warn');
    const cls = S.classes.filter(c => c.active), map = cls.map(c => [c, nisabHours(st, c)]), ok = map.filter(([, h]) => h && h.length), skip = map.filter(([, h]) => !h || !h.length);
    if (!ok.length) return A.toast('لم يُتعرَّف على صفوف هذا القسم في النصاب (ابتدائي/متوسط/ثانوي). للقسم العالمي استخدم «توزيع القسم العالمي الجاهز» أو اللصق من Excel.', 'warn');
    const names = [...new Set(ok.flatMap(([, h]) => h.map(x => x[0])))], find = n => S.subjects.find(s => A.normKey(s.name) === A.normKey(n));
    const missing = names.filter(n => !find(n));
    const m = A.modal(`<h3>اعتماد النصاب ونقله إلى «${esc(A.section().name)}»</h3>
      <p class="sub">سيُنقل عدد حصص ${AR(names.length)} مادة إلى ${AR(ok.length)} فصلاً. المعلمون والقيود الحالية تبقى كما هي، ويمكنك تعديل أي رقم بعد النقل. لا يتأثر الجدول المعتمد ولا خطط المعلمين حتى تولّد جدولاً جديداً وتعتمده.</p>
      ${skip.length ? `<div class="notice warn">فصول لم تُطابق صفاً في النصاب وستبقى كما هي: ${esc(skip.map(([c]) => c.name).join('، '))}</div>` : ''}
      ${missing.length ? `<div class="notice">مواد في النصاب غير موجودة في المنصة: <b>${esc(missing.join('، '))}</b><label class="chk" style="margin-top:6px"><input type="checkbox" id="nsAdd" checked> أضفها إلى مواد المدرسة</label></div>` : ''}
      <label class="chk"><input type="checkbox" id="nsRep" checked> استبدال حصص المواد الموجودة في النصاب فقط (المواد الأخرى تبقى)</label>
      <div class="acts"><button class="btn" id="nsGo">اعتماد ونقل</button></div>`, { cls: 'wide' });
    m.el.querySelector('#nsGo').onclick = ev => A.run(ev.currentTarget, async () => {
      if (missing.length && (m.el.querySelector('#nsAdd') || {}).checked) { for (const n of missing) { try { await api.addSubject({ school_id: S.school.id, name: n }); } catch (_) {} } S.subjects = await api.reloadSubjects(); }
      const row = (await api.list('section_plans', { section_id: S.sectionId }))[0], P = Object.assign({ groups: [], hours: {}, teachers: {}, maxDay: 2, blocks: {} }, row ? row.data : {});
      const rep = m.el.querySelector('#nsRep').checked; let grp = P.groups.find(g => g.name === 'من النصاب'); const inG = new Set(P.groups.flatMap(g => g.subs));
      let n = 0;
      ok.forEach(([c, h]) => { P.hours[c.id] = P.hours[c.id] || {}; h.forEach(([nm, v]) => { const s = find(nm); if (!s) return; if (rep || !P.hours[c.id][s.id]) { P.hours[c.id][s.id] = v; n++; } if (!inG.has(s.id)) { if (!grp) { grp = { id: 'g' + Date.now().toString(36), name: 'من النصاب', subs: [] }; P.groups.push(grp); } grp.subs.push(s.id); inG.add(s.id); } }); });
      P.nisab = { at: new Date().toISOString(), by: S.me.id };
      await api.ups('section_plans', [{ section_id: S.sectionId, data: P }], 'section_id');
      const settings = { ...(S.school.settings || {}) }; settings.nisab_ok = { ...(settings.nisab_ok || {}), [S.sectionId]: P.nisab.at }; try { const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = r.settings || settings; } catch (_) { S.school.settings = settings; }
      if (A._planReload) A._planReload(); m.close(); A.LS.set('studio_t', 'plan'); V.studio(root); A.toast(`اعتُمد النصاب ونُقلت ${AR(n)} قيمة إلى توزيع الحصص`, 'ok');
    });
  }

  // ---------- كشف التعارض بين الأقسام ----------
  async function conflicts(box) {
    box.innerHTML = '<div class="card"><div class="spinner"></div></div>';
    const secs = S.allSections || S.sections, all = [];
    for (const s of secs) { try { (await api.approvedSlots(s.id)).forEach(x => { if (x.teacher_id) all.push({ ...x, sec: s }); }); } catch (_) {} }
    const key = x => `${x.teacher_id}|${x.day}|${x.period}`, by = {};
    all.forEach(x => (by[key(x)] = by[key(x)] || []).push(x));
    const clash = Object.values(by).filter(l => l.length > 1).map(l => ({ t: l[0].teacher_id, d: l[0].day, p: l[0].period, l, cross: new Set(l.map(x => x.sec.id)).size > 1 }));
    clash.sort((a, b) => (b.cross - a.cross) || A.personName(a.t).localeCompare(A.personName(b.t), 'ar') || a.d - b.d || a.p - b.p);
    const shared = {}; all.forEach(x => { (shared[x.teacher_id] = shared[x.teacher_id] || new Set()).add(x.sec.id); });
    const multi = Object.entries(shared).filter(([, s]) => s.size > 1);
    const cn = id => { for (const s of secs) { const c = (S.allClasses || S.classes).find(x => x.id === id); if (c) return c.name; } return ''; };
    box.innerHTML = `<div class="card"><div class="grid g4"><div class="kpi ${clash.length ? '' : 'navy'}"><div class="k">تعارضات في الجداول المعتمدة</div><div class="v" style="color:${clash.length ? 'var(--bad)' : ''}">${AR(clash.length)}</div><div class="d">منها بين الأقسام: ${AR(clash.filter(c => c.cross).length)}</div></div>
        <div class="kpi"><div class="k">معلمون مشتركون بين الأقسام</div><div class="v">${AR(multi.length)}</div></div><div class="kpi"><div class="k">أقسام لها جدول معتمد</div><div class="v">${AR(new Set(all.map(x => x.sec.id)).size)} / ${AR(secs.length)}</div></div></div>
      <p class="small muted" style="margin:10px 0">عند توليد جدول أي قسم من «التوزيع والقيود والتوليد» تُحجز تلقائياً حصص المعلم المشترك في الأقسام الأخرى فلا يتكرر التعارض. التعارض يُقاس بنفس اليوم ورقم الحصة.</p>
      ${clash.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>المعلم</th><th>اليوم</th><th>الحصة</th><th>الحصص المتعارضة</th><th>النوع</th></tr></thead><tbody>${clash.map(c => `<tr><td><b>${esc(A.personName(c.t))}</b></td><td>${DAYS[c.d] || AR(c.d + 1)}</td><td>${AR(c.p + 1)}</td><td class="small">${c.l.map(x => `${esc(x.sec.name)} — ${esc(cn(x.class_id))} (${esc(A.subjName(x.subject_id) || '')})`).join('<br>')}</td><td><span class="pill ${c.cross ? 'st-returned' : 'st-submitted'}">${c.cross ? 'بين الأقسام' : 'داخل القسم'}</span></td></tr>`).join('')}</tbody></table></div>` : `<div class="notice ok">لا يوجد أي تعارض بين الجداول المعتمدة.</div>`}
      ${multi.length ? `<details style="margin-top:12px"><summary><b>المعلمون المشتركون</b></summary><ul class="small">${multi.map(([t, s]) => `<li>${esc(A.personName(t))}: ${esc([...s].map(id => (secs.find(x => x.id === id) || {}).name).join('، '))} — ${AR(all.filter(x => x.teacher_id === t).length)} حصة</li>`).join('')}</ul></details>` : ''}</div>`;
  }
})();
