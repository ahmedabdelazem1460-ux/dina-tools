/* منصة دينا — دمج الحسابات المكررة وحذف الموظفين/الطلاب بأمان (للمالك فقط)
   القاعدة (sql/111b): people_dups(kind) · people_refs(kind,id) · people_merge(kind,from,into,drop_login) · people_delete(kind,id,force)
   الدمج ينقل كل ما يخص الحساب المكرر (الخطط، الجداول، النماذج، الحضور، الصلاحيات…) إلى الحساب الباقي ثم يحذف المكرر.
   الحذف النهائي للموظف لا يتم إلا إن لم يكن له عمل محفوظ (وإلا: الدمج أو الإيقاف). */
(function () {
  const A = window.APP;
  const { api, S, $, $$, esc, AR } = A;
  const own = () => !!((S.realMe || S.me) && (S.realMe || S.me).is_owner);
  const KIND = { staff: { one: 'الموظف', tbl: 'staff', name: r => r.full_name || r.name }, student: { one: 'الطالب', tbl: 'students', name: r => r.full_name || r.name } };
  // أسماء الجداول للعرض
  const TN = { plan_entries: 'إدخالات الخطة', timetable_slots: 'حصص الجدول', memberships: 'عضويات الأقسام', module_grants: 'الصلاحيات', notifications: 'الإشعارات', messages: 'الرسائل', attendance: 'الحضور', period_attendance: 'حضور الحصص', behaviors: 'السلوك', form_tasks: 'النماذج', questions: 'أسئلة البنك', quizzes: 'الاختبارات والواجبات', quiz_attempts: 'محاولات الطلاب', resources: 'المصادر', substitutions: 'حصص الانتظار', standby_days: 'سجلات التأمين', staff_att: 'حضور الموظف', lesson_preps: 'التحضير', audit_log: 'سجل العمليات', login_events: 'مرات الدخول', counsel_cases: 'حالات الإرشاد', noor_scores: 'درجات نور', paper_results: 'نتائج الورقي', student_codes: 'رموز الطالب', family_links: 'روابط العائلة', parent_msgs: 'رسائل أولياء الأمور', parent_reports: 'تقارير أولياء الأمور', parent_excuses: 'الأعذار', sections: 'إعدادات الأقسام', schools: 'إعدادات المدرسة', user_forms: 'نماذجي', decks: 'العروض', trash: 'سلة المحذوفات', record_books: 'سجل المتابعة', sup_records: 'سجلات الإشراف', staff_signatures: 'التوقيع المحفوظ', live_entries: 'الحصص المباشرة', remedial_plans: 'الخطط العلاجية' };
  const tname = t => TN[t] || t;
  const css = () => { if (document.getElementById('pm-css')) return; const s = document.createElement('style'); s.id = 'pm-css';
    s.textContent = `.pm-grp{border:1px solid var(--border,#E4EBF5);border-radius:14px;padding:10px;margin:8px 0;background:var(--card,#fff)}.pm-r{display:flex;gap:8px;align-items:flex-start;padding:6px;border-radius:10px;cursor:pointer}.pm-r:hover{background:#F4F8FC}.pm-r input{margin-top:4px;width:20px;height:20px}.pm-r .pm-m{font-size:12.5px;color:#5B7090}.pm-keep{background:#F3FBF6;outline:2px solid #2E8B57}
      .pm-refs{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.pm-refs span{background:#EEF4FA;color:#082B5A;border-radius:999px;padding:2px 8px;font-size:12px}.pm-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.pm-tabs button{min-height:40px}`;
    document.head.appendChild(s); };
  const rpc = (n, a) => api.rpc(n, a);
  const isDemo = () => !!(A.DEMO || api.demo);
  const norm = x => A.normKey(String(x || '').replace(/^(أ\.|ا\.|أ\/|م\.|د\.)\s*/, '')).replace(/\s+/g, '');
  const refsHtml = refs => { const L = (refs || []).filter(r => r.t !== 'trash' && r.t !== 'audit_log'); return L.length ? `<div class="pm-refs">${L.map(r => `<span>${esc(tname(r.t))}: ${AR(r.n || r.moved || 0)}</span>`).join('')}</div>` : '<p class="small muted">لا توجد بيانات مرتبطة به.</p>'; };
  async function refsOf(kind, id) { if (isDemo()) return []; try { return await rpc('people_refs', { p_kind: kind, p_id: id }); } catch (e) { if (/people_refs|function/.test(e.message)) throw new Error('ميزة الدمج والحذف تحتاج تحديث القاعدة (ترحيل 111b) — أبلغ الدعم الفني'); throw e; } }
  async function doMerge(kind, from, into) {
    if (isDemo()) { const tb = KIND[kind].tbl; await api.del(tb, from); return []; }
    return await rpc('people_merge', { p_kind: kind, p_from: from, p_into: into, p_drop_login: true });
  }
  async function refresh(kind) { try { if (kind === 'staff' && A.refreshPeople) await A.refreshPeople(); if (kind === 'student' && A.studentsAll) await A.studentsAll(true); } catch (_) { } }
  const label = (kind, r) => kind === 'staff'
    ? `${r.email ? `<span dir="ltr">${esc(r.email)}</span> · ` : ''}${r.active === false ? 'موقوف' : 'نشط'} · ${r.login || r.user_id ? 'له حساب دخول' : 'بلا حساب دخول'}${r.last ? ` · آخر دخول ${A.fmtDT(r.last)}` : ''}${r.created || r.created_at ? ` · أُنشئ ${A.arDate ? A.arDate(String(r.created || r.created_at).slice(0, 10)) : String(r.created || r.created_at).slice(0, 10)}` : ''}`
    : `${esc(((A.cls && A.cls(r.class_id)) || {}).name || '')}${r.nid || r.national_id ? ` · هوية <span dir="ltr">${esc(r.nid || r.national_id)}</span>` : ''}${r.no || r.student_no ? ` · رقم ${esc(r.no || r.student_no)}` : ''} · ${r.active === false ? 'موقوف' : 'نشط'}`;

  // ---- الحسابات المكررة ----
  A.peopleDups = async function (kind, after) {
    if (!own()) return; css();
    const m = A.modal(`<h3>${kind === 'staff' ? 'الحسابات المكررة للموظفين' : 'الطلاب المكررون'}</h3><p class="small muted">مجموعات بنفس الاسم (بعد توحيد الهمزات والمسافات واللقب). اختر الحساب الذي يبقى في كل مجموعة ثم «دمج»: يُنقل إليه كل عمل الحسابات الأخرى (الخطط، الجداول، النماذج، الصلاحيات…) وتُحذف هي${kind === 'staff' ? ' مع حساب دخولها' : ''}. لا يُفقد شيء.</p><div id="pmL"><div class="spinner"></div></div>`, { cls: 'wide' });
    const L = $('#pmL', m.el);
    let groups = [];
    try {
      if (isDemo()) { const all = kind === 'staff' ? (S.staff || []).filter(s => !s.is_owner) : await api.list('students', { school_id: S.school.id }); const by = {}; all.forEach(r => { const k = norm(r.full_name); (by[k] = by[k] || []).push(Object.assign({ name: r.full_name, login: !!r.user_id, created: r.created_at, nid: r.national_id, no: r.student_no }, r)); }); groups = Object.values(by).filter(g => g.length > 1); }
      else groups = await rpc('people_dups', { p_kind: kind });
    } catch (e) { L.innerHTML = A.emptyBox('تعذّر الفحص', esc(/people_dups|function/.test(e.message) ? 'ميزة الدمج تحتاج تحديث القاعدة (ترحيل 111b).' : e.message)); return; }
    const draw = () => {
      if (!groups.length) { L.innerHTML = A.emptyBox('لا توجد حسابات مكررة ✓', kind === 'staff' ? 'كل موظف له حساب واحد.' : 'لا يوجد طالبان بنفس الاسم.'); return; }
      L.innerHTML = groups.map((g, gi) => { const keep = g.find(r => r.active !== false && (r.login || kind === 'student')) || g[0];
        return `<div class="pm-grp" data-g="${gi}"><b>${esc(g[0].name)}</b> <span class="small muted">(${AR(g.length)} حسابات)</span>
          ${g.map(r => `<label class="pm-r ${r.id === keep.id ? 'pm-keep' : ''}"><input type="radio" name="pk${gi}" value="${r.id}" ${r.id === keep.id ? 'checked' : ''}><span><b>${esc(r.name)}</b><div class="pm-m">${label(kind, r)}</div><div class="pm-rf small muted" data-rf="${r.id}"></div></span></label>`).join('')}
          <div class="acts" style="margin-top:6px"><button class="btn ghost sm" data-show="${gi}">عرض بيانات كل حساب</button><button class="btn sm" data-mg="${gi}">دمج في المحدد</button></div></div>`; }).join('');
      $$('.pm-grp', L).forEach(gEl => $$('input[type=radio]', gEl).forEach(i => i.onchange = () => $$('.pm-r', gEl).forEach(x => x.classList.toggle('pm-keep', x.querySelector('input').checked))));
      $$('[data-show]', L).forEach(b => b.onclick = () => A.run(b, async () => { for (const r of groups[+b.dataset.show]) { const el = L.querySelector(`[data-rf="${r.id}"]`); el.innerHTML = refsHtml(await refsOf(kind, r.id)); } }));
      $$('[data-mg]', L).forEach(b => b.onclick = () => A.run(b, async () => { const gi = +b.dataset.mg, g = groups[gi], into = L.querySelector(`input[name=pk${gi}]:checked`).value, keep = g.find(r => r.id === into), rest = g.filter(r => r.id !== into);
        if (!(await A.confirmBox(`دمج ${A.cnt(rest.length, 'حساب', 'حسابات')} في «${esc(keep.name)}»؟<br><span class="small muted">يُنقل كل عملها إليه وتُحذف${kind === 'staff' ? ' مع حسابات دخولها — سيدخل المعلم بعدها بحساب «' + esc(keep.email || keep.name) + '» فقط' : ''}. لا يمكن التراجع.</span>`, 'دمج', true))) return;
        let moved = 0; for (const r of rest) { const out = await doMerge(kind, r.id, into); (out || []).forEach(x => moved += +x.moved || 0); }
        groups.splice(gi, 1); await refresh(kind); A.toast(`تم الدمج ✓${moved ? ` — نُقل ${AR(moved)} سجل` : ''}`, 'ok'); draw(); after && after(); }));
    };
    draw();
  };

  // ---- إزالة حساب: دمج في آخر / حذف نهائي / إيقاف ----
  A.peopleRemove = async function (kind, rec, after) {
    if (!own() || !rec) return; css();
    const K = KIND[kind], nm = K.name(rec);
    let others = kind === 'staff' ? (S.staff || []).filter(s => s.id !== rec.id && !s.is_owner) : ((A.studentsAll ? await A.studentsAll().catch(() => null) : null) || await api.list('students', { school_id: S.school.id }, { select: 'id,full_name,class_id,active' })).filter(s => s.id !== rec.id);
    const k0 = norm(nm); others.sort((a, b) => (norm(b.full_name) === k0) - (norm(a.full_name) === k0) || (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
    const m = A.modal(`<h3>إزالة ${K.one}: ${esc(nm)}</h3><div id="pmR" class="small muted">جارٍ فحص البيانات المرتبطة…</div>
      <div class="pm-tabs" role="tablist"><button class="btn ghost on" data-pt="merge">دمج في ${kind === 'staff' ? 'حساب' : 'طالب'} آخر (مكرر)</button><button class="btn ghost" data-pt="del">حذف نهائي</button>${rec.active !== false ? '<button class="btn ghost" data-pt="off">إيقاف فقط</button>' : ''}</div><div id="pmB"></div>`, { cls: 'wide' });
    const R = $('#pmR', m.el), Bx = $('#pmB', m.el); let refs = [];
    refsOf(kind, rec.id).then(r => { refs = r || []; R.innerHTML = `<b>البيانات المرتبطة:</b> ${refsHtml(refs)}`; }).catch(e => { R.innerHTML = `<div class="notice bad" style="display:block">${esc(e.message)}</div>`; });
    const blocking = () => refs.filter(r => kind === 'staff' ? !['memberships', 'module_grants', 'notif_prefs', 'notifications', 'login_events', 'audit_log', 'trash', 'staff_signatures', 'join_codes'].includes(r.t) : r.k === 'uuid' && !['audit_log', 'trash'].includes(r.t));
    const tab = t => { $$('[data-pt]', m.el).forEach(b => b.classList.toggle('on', b.dataset.pt === t));
      if (t === 'merge') { Bx.innerHTML = `<p class="small">ينقل كل ما يخص «${esc(nm)}» إلى الحساب الذي تختاره ثم يحذفه${kind === 'staff' ? ' مع حساب دخوله' : ''}. استخدمه لمن له أكثر من حساب.</p>
          <div class="field"><label for="pmI">${kind === 'staff' ? 'الحساب الذي يبقى' : 'الطالب الذي يبقى'}</label><select class="in" id="pmI">${others.map(o => `<option value="${o.id}">${esc(o.full_name)}${kind === 'staff' ? (o.email ? ' — ' + esc(o.email) : '') + (o.active === false ? ' (موقوف)' : '') : ' — ' + esc(((A.cls && A.cls(o.class_id)) || {}).name || '') + (o.active === false ? ' (موقوف)' : '')}${norm(o.full_name) === k0 ? ' ★ نفس الاسم' : ''}</option>`).join('')}</select></div>
          <div class="acts"><button class="btn" id="pmGo">دمج</button></div>`;
        $('#pmGo', Bx).onclick = e => A.run(e.currentTarget, async () => { const into = $('#pmI', Bx).value; const o = others.find(x => x.id === into); if (!o) throw new Error('اختر الحساب');
          if (!(await A.confirmBox(`دمج «${esc(nm)}» في «${esc(o.full_name)}»؟ لا يمكن التراجع.`, 'دمج', true))) return;
          const out = await doMerge(kind, rec.id, into); let n = 0; (out || []).forEach(x => n += +x.moved || 0); await refresh(kind); m.close(); A.toast(`تم الدمج ✓${n ? ` — نُقل ${AR(n)} سجل` : ''}`, 'ok'); after && after(); }); }
      else if (t === 'del') { const bl = blocking(), lockStaff = kind === 'staff' && bl.length;
        Bx.innerHTML = lockStaff ? `<div class="notice warn" style="display:block">لا يمكن حذف هذا الموظف نهائياً لأن له عملاً محفوظاً (${bl.map(r => esc(tname(r.t))).join('، ')}). حذفه يُتلف الخطط والجداول المرتبطة به.<br>• إن كان حساباً مكرراً: استخدم «دمج في حساب آخر».<br>• إن ترك المدرسة: استخدم «إيقاف فقط» — يبقى عمله في التقارير ولا يستطيع الدخول.</div>`
          : `${bl.length ? `<div class="notice bad" style="display:block">سيُحذف معه نهائياً: ${bl.map(r => `${esc(tname(r.t))} (${AR(r.n)})`).join('، ')}.</div>` : '<p class="small">لا توجد بيانات تُفقد بحذفه.</p>'}
            <div class="field"><label for="pmC">للتأكيد اكتب: حذف</label><input class="in" id="pmC" autocomplete="off"></div><div class="acts"><button class="btn bad" id="pmDel">حذف نهائي</button></div>`;
        const d = $('#pmDel', Bx); if (d) d.onclick = e => A.run(e.currentTarget, async () => { if ($('#pmC', Bx).value.trim() !== 'حذف') throw new Error('اكتب كلمة «حذف» للتأكيد');
          if (isDemo()) await api.del(K.tbl, rec.id); else await rpc('people_delete', { p_kind: kind, p_id: rec.id, p_force: kind === 'student' });
          await refresh(kind); m.close(); A.toast(`حُذف ${K.one} نهائياً`, 'ok'); after && after(); }); }
      else { Bx.innerHTML = `<p class="small">${kind === 'staff' ? 'يُمنع من الدخول ويختفي من القوائم، ويبقى عمله في التقارير. يمكن إعادة تفعيله لاحقاً.' : 'يختفي من القوائم والحضور، ويبقى سجله في التقارير. يمكن إعادته لاحقاً.'}</p><div class="acts"><button class="btn bad" id="pmOff">إيقاف</button></div>`;
        $('#pmOff', Bx).onclick = e => A.run(e.currentTarget, async () => { if (kind === 'staff') await (api.setActive ? api.setActive(rec.id, false) : api.updateStaff(rec.id, { active: false })); else await api.upd('students', rec.id, { active: false }); await refresh(kind); m.close(); A.toast('أُوقف', 'ok'); after && after(); }); }
    };
    $$('[data-pt]', m.el).forEach(b => b.onclick = () => tab(b.dataset.pt)); tab('merge');
  };
})();
