/* وضع التجربة: نفس واجهة البيانات لكن في ذاكرة المتصفح ببيانات تجريبية */
(function () {
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id' + Math.random().toString(36).slice(2));
  const DEMO_PARENT = { id: 'pl1', token: 'demo0parent0link', active: true };
  const DEMO_SYNC = { id: 1, secret: 'demo-secret-0000000000000000', script_url: null };
  const clone = o => JSON.parse(JSON.stringify(o));
  function seed() {
    const D = { assignment_requests: [], entry_delegations: [], parent_posts: [], messages: [], language_issues: [], extra_pages: [], join_codes: [], schools: [], sections: [], staff: [], memberships: [], classes: [], subjects: [], timetable_versions: [], timetable_slots: [], weeks: [], plan_entries: [], notes: [], audit_log: [] };
    const sch = { id: uid(), name: 'مدارس دينا العالمية', term_label: 'الفصل الدراسي الأول · العام الدراسي ١٤٤٨هـ' }; D.schools.push(sch);
    const g = { id: uid(), school_id: sch.id, name: 'قسم البنات', short_name: 'البنات', days: 5, periods: 7, sort: 1 };
    const b = { id: uid(), school_id: sch.id, name: 'قسم البنين', short_name: 'البنين', days: 5, periods: 7, sort: 2 };
    D.sections.push(g, b);
    const subs = ['اللغة العربية', 'الرياضيات', 'العلوم', 'اللغة الإنجليزية', 'الدراسات الإسلامية والقرآن', 'الاجتماعيات', 'المهارات الرقمية', 'التربية البدنية', 'التربية الفنية', 'تحفيظ'];
    subs.forEach(n => D.subjects.push({ id: uid(), school_id: sch.id, name: n, is_activity: n === 'التربية البدنية' }));
    const S = n => D.subjects.find(s => s.name === n).id;
    const person = (n, e, owner) => { const p = { id: uid(), school_id: sch.id, user_id: uid(), full_name: n, email: e, phone: '', is_owner: !!owner, active: true }; D.staff.push(p); return p; };
    const owner = person('أ. أحمد عبد العظيم', 'a.abdelazim@dinaschool.com', true);
    const sup = person('أ. منى الحربي', 'm.harbi@dinaschool.com');
    const T = {
      'اللغة العربية': person('أ. نورة القحطاني', 'n.qahtani@dinaschool.com'),
      'الرياضيات': person('أ. سارة الغامدي', 's.ghamdi@dinaschool.com'),
      'العلوم': person('أ. ريم الزهراني', 'r.zahrani@dinaschool.com'),
      'اللغة الإنجليزية': person('Ms. Lina Haddad', 'l.haddad@dinaschool.com'),
      'الدراسات الإسلامية والقرآن': person('أ. هند العتيبي', 'h.otaibi@dinaschool.com'),
    };
    const tb = { 'اللغة العربية': person('أ. خالد الشهري', 'k.shehri@dinaschool.com'), 'الرياضيات': person('أ. محمد السبيعي', 'm.subaie@dinaschool.com') };
    D.memberships.push({ id: uid(), staff_id: sup.id, section_id: g.id, role: 'supervisor', can_review_plans: true, can_export: true });
    Object.values(T).forEach(t => D.memberships.push({ id: uid(), staff_id: t.id, section_id: g.id, role: 'teacher' }));
    Object.values(tb).forEach(t => D.memberships.push({ id: uid(), staff_id: t.id, section_id: b.id, role: 'teacher' }));
    const mk = (sec, names, tmap) => {
      const v = { id: uid(), section_id: sec.id, label: 'الجدول الحالي', status: 'approved', source: 'تجريبي', created_at: new Date().toISOString(), approved_at: new Date().toISOString() };
      D.timetable_versions.push(v);
      names.forEach(([name, stage, gw, lab], i) => {
        const c = { id: uid(), section_id: sec.id, name, stage, grade_word: gw, class_label: lab, sort: i, active: true }; D.classes.push(c);
        for (let d = 0; d < 5; d++) for (let p = 0; p < 7; p++) {
          const sn = subs[(d * 3 + p + i * 2) % subs.length];
          D.timetable_slots.push({ id: uid(), version_id: v.id, class_id: c.id, day: d, period: p, subject_id: S(sn), teacher_id: tmap[sn] ? tmap[sn].id : null });
        }
      });
      const w = { id: uid(), section_id: sec.id, number: 11, word: 'الحادي عشر', start_date: '2026-11-08', deadline: '2026-11-05T17:00:00Z', status: 'open', holidays: [], timetable_version_id: v.id };
      D.weeks.push(w);
      D.timetable_slots.filter(s => s.version_id === v.id).forEach(s => D.plan_entries.push({ id: uid(), week_id: w.id, class_id: s.class_id, day: s.day, period: s.period, subject_id: s.subject_id, teacher_id: s.teacher_id, topic: '', homework: '', note: '', status: 'empty', review_note: '', updated_at: new Date().toISOString() }));
    };
    mk(g, [['رابع ابتدائي أ', 'الابتدائية', 'الرابع', 'رابع - أ'], ['رابع ابتدائي ب', 'الابتدائية', 'الرابع', 'رابع - ب'], ['خامس ابتدائي أ', 'الابتدائية', 'الخامس', 'خامس - أ'], ['أول متوسط أ', 'المتوسطة', 'الأول', 'أول - أ']], T);
    mk(b, [['رابع ابتدائي أ', 'الابتدائية', 'الرابع', 'رابع - أ'], ['خامس ابتدائي أ', 'الابتدائية', 'الخامس', 'خامس - أ'], ['أول متوسط أ', 'المتوسطة', 'الأول', 'أول - أ']], tb);
    // تعبئة جزئية
    const samples = { 'اللغة العربية': ['درس: الفعل الماضي والمضارع', 'حل تدريبات ص ٤٥'], 'الرياضيات': ['جمع الكسور الاعتيادية', 'تمارين ١ - ٥ ص ٧٢'], 'العلوم': ['دورة حياة النبات', 'رسم دورة الحياة'], 'اللغة الإنجليزية': ['Unit 3: My Day', 'Workbook p. 18'], 'الدراسات الإسلامية والقرآن': ['سورة الضحى: تلاوة وتفسير', 'حفظ الآيات ١ - ٥'] };
    D.plan_entries.forEach((e, i) => {
      const sn = (D.subjects.find(s => s.id === e.subject_id) || {}).name;
      if (samples[sn] && (i % 5 !== 0)) { e.topic = samples[sn][0]; e.homework = i % 3 ? samples[sn][1] : ''; e.status = i % 7 === 0 ? 'approved' : i % 4 === 0 ? 'submitted' : 'draft'; }
    });
    D.plan_entries.forEach((e, i) => { e.exec_status = e.status === 'approved' && e.day < 2 ? (i % 6 === 0 ? 'modified' : 'done') : 'pending'; e.exec_note = ''; if (e.status === 'submitted') e.submitted_at = new Date(Date.now() - (i % 3) * 864e5).toISOString(); });
    const ret = D.plan_entries.find(e => e.status === 'submitted'); if (ret) { ret.status = 'returned'; ret.review_note = 'يرجى تحديد رقم الصفحة في الواجب'; }
    D.notes.push({ id: uid(), week_id: D.weeks[0].id, class_id: null, placement: 'day', day: 3, title: 'تنبيه', body: 'اختبار قصير في الرياضيات يوم الأربعاء', created_at: new Date().toISOString() });
    D.join_codes.push({ code: 'DEMOJOIN', section_id: g.id, role: 'teacher', active: true, uses: 0 });
    return { D, owner, sup, T };
  }

  function make() {
    const { D, owner, sup, T } = seed();
    let session = null, meId = null;
    const pick = (t, f) => clone(D[t].filter(f));
    const find = (t, id) => D[t].find(r => r.id === id);
    const upd = (t, id, p) => { const r = find(t, id); if (!r) throw new Error('غير موجود'); Object.assign(r, p); return clone(r); };
    const ins = (t, r) => { const x = { id: uid(), created_at: new Date().toISOString(), ...r }; D[t].push(x); return clone(x); };
    const del = (t, f) => { D[t] = D[t].filter(r => !f(r)); };
    const log = (action, entity, entity_id, details = {}, section_id = null) => D.audit_log.unshift({ id: D.audit_log.length + 1, at: new Date().toISOString(), staff_id: meId, section_id, action, entity, entity_id, details });
    const wait = (v) => new Promise(r => setTimeout(() => r(v), 60));
    const accounts = { 'a.abdelazim@dinaschool.com': owner.id, 'm.harbi@dinaschool.com': sup.id, 'n.qahtani@dinaschool.com': T['اللغة العربية'].id, 's.ghamdi@dinaschool.com': T['الرياضيات'].id };
    return {
      demo: true,
      accounts: [['المالك (مدير النظام)', 'a.abdelazim@dinaschool.com'], ['مشرفة القسم', 'm.harbi@dinaschool.com'], ['معلمة لغة عربية', 'n.qahtani@dinaschool.com'], ['معلمة رياضيات', 's.ghamdi@dinaschool.com']],
      async session() { return session; },
      async signIn(email) { const id = accounts[email.trim().toLowerCase()] || (D.staff.find(s => s.email === email.trim().toLowerCase()) || {}).id; if (!id) throw new Error('البريد أو كلمة المرور غير صحيحة'); meId = id; session = { user: { email } }; return wait(session); },
      async signOut() { session = null; meId = null; },
      async changePassword() { return wait(true); },
      onAuth() {},
      async boot() {
        if (!meId) return null;
        return wait({ me: clone(find('staff', meId)), school: clone(D.schools[0]), sections: clone(D.sections), memberships: clone(D.memberships), staff: clone(D.staff), subjects: clone(D.subjects) });
      },
      classes: s => wait(pick('classes', c => c.section_id === s).sort((a, b) => a.sort - b.sort)),
      weeks: s => wait(pick('weeks', w => w.section_id === s).sort((a, b) => b.number - a.number)),
      entries: w => wait(pick('plan_entries', e => e.week_id === w)),
      async saveEntry(id, p) {
        const e = find('plan_entries', id); Object.assign(e, p, { updated_at: new Date().toISOString(), updated_by: meId });
        if (['empty', 'draft'].includes(e.status)) e.status = (e.topic || e.homework || e.note) ? 'draft' : 'empty';
        return wait(clone(e));
      },
      async submitMyWeek(w) { let n = 0; D.plan_entries.forEach(e => { if (e.week_id === w && e.teacher_id === meId && (e.topic || e.homework) && ['draft', 'returned'].includes(e.status)) { e.status = 'submitted'; n++; } }); return wait(n); },
      async review(ids, st, note) { ids.forEach(id => { const e = find('plan_entries', id); e.status = st; e.review_note = note || ''; }); return wait(ids.length); },
      notes: w => wait(pick('notes', n => n.week_id === w)),
      addNote: n => wait(ins('notes', { ...n, created_by: meId })),
      updateNote: (id, p) => wait(upd('notes', id, p)),
      deleteNote: id => wait(del('notes', n => n.id === id)),
      updateWeek: (id, p) => { log('update', 'weeks', id, p); return wait(upd('weeks', id, p)); },
      async createWeek(a) {
        const v = D.timetable_versions.find(x => x.section_id === a.section_id && x.status === 'approved');
        if (!v) throw new Error('لا يوجد جدول دراسي معتمد لهذا القسم');
        if (D.weeks.some(w => w.section_id === a.section_id && w.number === a.number)) throw new Error('هذا الأسبوع موجود مسبقاً');
        const w = ins('weeks', { section_id: a.section_id, number: a.number, word: a.word, start_date: a.start_date, deadline: a.deadline, status: 'open', holidays: [], timetable_version_id: v.id });
        const sec = find('sections', a.section_id);
        D.classes.filter(c => c.section_id === a.section_id && c.active).forEach(c => { for (let d = 0; d < sec.days; d++) for (let p = 0; p < sec.periods; p++) { const s = D.timetable_slots.find(x => x.version_id === v.id && x.class_id === c.id && x.day === d && x.period === p) || {}; D.plan_entries.push({ id: uid(), week_id: w.id, class_id: c.id, day: d, period: p, subject_id: s.subject_id || null, teacher_id: s.teacher_id || null, topic: '', homework: '', note: '', status: 'empty', review_note: '' }); } });
        return wait(w.id);
      },
      deleteWeek: id => { del('plan_entries', e => e.week_id === id); return wait(del('weeks', w => w.id === id)); },
      ttVersions: s => wait(pick('timetable_versions', v => v.section_id === s).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))),
      ttSlots: v => wait(pick('timetable_slots', s => s.version_id === v)),
      createDraft: d => wait(ins('timetable_versions', { ...d, status: 'draft', created_by: meId })),
      updateDraft: (id, p) => wait(upd('timetable_versions', id, p)),
      async replaceSlots(v, slots) { del('timetable_slots', s => s.version_id === v); slots.forEach(s => D.timetable_slots.push({ id: uid(), ...s, version_id: v })); return wait(true); },
      async upsertSlots(v, slots) { slots.forEach(s => { const x = D.timetable_slots.find(y => y.version_id === v && y.class_id === s.class_id && y.day === s.day && y.period === s.period); if (x) Object.assign(x, s); else D.timetable_slots.push({ id: uid(), ...s, version_id: v }); }); return wait(true); },
      scheduleTT: (id, from, to) => { upd('timetable_versions', id, { scheduled: true, effective_from: from, effective_to: to || null, scheduled_at: new Date().toISOString() }); return wait({ weeks: D.weeks.filter(w => w.status === 'open' && w.start_date >= from && (!to || w.start_date <= to)).length, updated_entries: 0 }); },
      unscheduleTT: id => { upd('timetable_versions', id, { scheduled: false }); return wait({ weeks: 0 }); },
      promoteTT: () => wait(0),
      async approveTT(id, apply) {
        const v = find('timetable_versions', id);
        D.timetable_versions.forEach(x => { if (x.section_id === v.section_id && x.status === 'approved') x.status = 'archived'; });
        v.status = 'approved'; v.approved_at = new Date().toISOString(); v.approved_by = meId; let n = 0;
        if (apply) D.weeks.filter(w => w.section_id === v.section_id && w.status === 'open').forEach(w => {
          w.timetable_version_id = id;
          D.plan_entries.filter(e => e.week_id === w.id && ['empty', 'draft', 'returned'].includes(e.status)).forEach(e => { const s = D.timetable_slots.find(x => x.version_id === id && x.class_id === e.class_id && x.day === e.day && x.period === e.period); if (s && (s.subject_id !== e.subject_id || s.teacher_id !== e.teacher_id)) { e.subject_id = s.subject_id; e.teacher_id = s.teacher_id; n++; } });
        });
        log('approve', 'timetable_versions', id, {}, v.section_id);
        return wait({ updated_entries: n });
      },
      deleteVersion: id => { del('timetable_slots', s => s.version_id === id); return wait(del('timetable_versions', v => v.id === id)); },
      async assignTeacher(c, s, t) {
        const cl = find('classes', c); const v = D.timetable_versions.find(x => x.section_id === cl.section_id && x.status === 'approved'); let a = 0, b = 0;
        D.timetable_slots.forEach(x => { if (x.version_id === v.id && x.class_id === c && x.subject_id === s) { x.teacher_id = t; a++; } });
        D.plan_entries.forEach(e => { const w = find('weeks', e.week_id); if (w.status === 'open' && e.class_id === c && e.subject_id === s && e.status !== 'approved') { e.teacher_id = t; b++; } });
        if (t && !D.memberships.some(m => m.staff_id === t && m.section_id === cl.section_id)) D.memberships.push({ id: uid(), staff_id: t, section_id: cl.section_id, role: 'teacher' });
        return wait({ slots: a, entries: b });
      },
      async editSlot(c, d, p, s, t) {
        const cl = find('classes', c); const v = D.timetable_versions.find(x => x.section_id === cl.section_id && x.status === 'approved');
        let x = D.timetable_slots.find(y => y.version_id === v.id && y.class_id === c && y.day === d && y.period === p);
        if (!x) { x = { id: uid(), version_id: v.id, class_id: c, day: d, period: p }; D.timetable_slots.push(x); }
        x.subject_id = s || null; x.teacher_id = t || null; let a = 0, b = 0, k = 0;
        D.plan_entries.forEach(e => { const w = find('weeks', e.week_id); if (!w || w.section_id !== cl.section_id || e.class_id !== c || e.day !== d || e.period !== p) return;
          if (e.subject_id === x.subject_id) { if (e.teacher_id !== x.teacher_id) { e.teacher_id = x.teacher_id; a++; } }
          else if (!e.topic && !e.homework && !e.note) { e.subject_id = x.subject_id; e.teacher_id = x.teacher_id; b++; } else k++; });
        return wait({ teacher_fixed: a, subject_changed: b, conflicts: k });
      },
      async slotConflicts(sec) {
        const v = D.timetable_versions.find(x => x.section_id === sec && x.status === 'approved'); if (!v) return wait([]);
        const out = []; D.weeks.filter(w => w.section_id === sec).forEach(w => D.plan_entries.filter(e => e.week_id === w.id).forEach(e => { const s = D.timetable_slots.find(x => x.version_id === v.id && x.class_id === e.class_id && x.day === e.day && x.period === e.period) || {}; if ((s.subject_id || null) !== (e.subject_id || null)) out.push({ entry_id: e.id, week_number: w.number, class_id: e.class_id, day: e.day, period: e.period, entry_subject: e.subject_id, slot_subject: s.subject_id || null, slot_teacher: s.teacher_id || null, topic: e.topic, status: e.status }); }));
        return wait(out);
      },
      async slotConflictApply(id) { const e = find('plan_entries', id); const w = find('weeks', e.week_id); const v = D.timetable_versions.find(x => x.section_id === w.section_id && x.status === 'approved'); const s = D.timetable_slots.find(x => x.version_id === v.id && x.class_id === e.class_id && x.day === e.day && x.period === e.period) || {}; e.subject_id = s.subject_id || null; e.teacher_id = s.teacher_id || null; return wait(null); },
      async bulkReview(wid, classes, action) {
        const w = find('weeks', wid); let n = 0;
        D.plan_entries.forEach(e => { if (e.week_id !== wid || (classes && classes.length && !classes.includes(e.class_id))) return;
          if (action === 'approve' && ['submitted', 'draft'].includes(e.status) && (e.topic || e.homework || e.note)) { e.status = 'approved'; n++; }
          if (action === 'unapprove' && e.status === 'approved') { e.status = 'submitted'; n++; } });
        const un = action === 'unapprove' && w.status === 'published'; if (un) w.status = 'open';
        return wait({ count: n, unpublished: un });
      },
      async resetPassword() { return wait(true); },
      resources: () => wait(clone(D.resources || (D.resources = []))),
      addResource: r => { D.resources = D.resources || []; return wait(ins('resources', { school_id: D.schools[0].id, created_by: meId, ...r })); },
      updateResource: (id, p) => wait(upd('resources', id, p)),
      deleteResource: id => wait(del('resources', r => r.id === id)),
      moduleGrants: () => wait(clone(D.module_grants || (D.module_grants = []))),
      grantModule: (staff_id, module) => { D.module_grants = D.module_grants || []; if (!D.module_grants.some(g => g.staff_id === staff_id && g.module === module)) D.module_grants.push({ staff_id, module }); return wait(true); },
      revokeModule: (staff_id, module) => { D.module_grants = (D.module_grants || []).filter(g => !(g.staff_id === staff_id && g.module === module)); return wait(true); },
      updateSchool: (id, p) => wait(upd('schools', id, p)),
      addStaff: r => wait(ins('staff', { school_id: D.schools[0].id, active: true, is_owner: false, user_id: null, ...r, email: r.email || null })),
      updateStaff: (id, p) => wait(upd('staff', id, p)),
      async setLogin(id, email) { if (D.staff.some(s => s.email === email && s.id !== id)) throw new Error('البريد مستخدم لحساب آخر'); upd('staff', id, { email, user_id: find('staff', id).user_id || uid() }); return wait(null); },
      setActive: (id, a) => wait(upd('staff', id, { active: a })),
      async upsertMembership(r) { const x = D.memberships.find(m => m.staff_id === r.staff_id && m.section_id === r.section_id); if (x) { Object.assign(x, r); return wait(clone(x)); } return wait(ins('memberships', r)); },
      deleteMembership: id => wait(del('memberships', m => m.id === id)),
      addSubject: r => { if (D.subjects.some(s => s.name === r.name)) throw new Error('هذا العنصر موجود مسبقاً'); return wait(ins('subjects', { is_activity: false, ...r })); },
      updateSubject: (id, p) => wait(upd('subjects', id, p)),
      addClass: r => wait(ins('classes', { active: true, ...r })),
      updateClass: (id, p) => wait(upd('classes', id, p)),
      addSection: r => wait(ins('sections', { days: 5, periods: 7, ...r })),
      updateSection: (id, p) => wait(upd('sections', id, p)),
      updateSchool: (id, p) => wait(upd('schools', id, p)),
      audit: () => wait(clone(D.audit_log.slice(0, 200))),
      extraPages: w => wait(pick('extra_pages', x => x.week_id === w).sort((a, b) => (a.sort || 0) - (b.sort || 0))),
      addExtraPage: r => wait(ins('extra_pages', { sort: 0, position: 'end', content: {}, ...r, created_by: meId })),
      updateExtraPage: (id, p) => wait(upd('extra_pages', id, p)),
      deleteExtraPage: id => wait(del('extra_pages', x => x.id === id)),
      joinCodes: () => wait(clone(D.join_codes)),
      createJoinCode: (section_id, role) => wait(ins('join_codes', { code: 'DEMO' + Math.random().toString(36).slice(2, 8).toUpperCase(), section_id, role, active: true, uses: 0 })),
      updateJoinCode: (code, p) => { const x = D.join_codes.find(j => j.code === code); Object.assign(x, p); return wait(clone(x)); },
      async joinInfo(code) { const j = D.join_codes.find(x => x.code === code && x.active); if (!j) return null; return wait({ section: find('sections', j.section_id).name, school: D.schools[0].name, role: j.role }); },
      async joinWithCode(code, name, email) {
        const j = D.join_codes.find(x => x.code === code && x.active); if (!j) throw new Error('رابط الانضمام غير صالح أو أُوقف');
        if (D.staff.some(s => s.email === email.toLowerCase())) throw new Error('هذا البريد مسجّل مسبقاً — سجّل الدخول به');
        const p = ins('staff', { school_id: D.schools[0].id, user_id: uid(), full_name: name, email: email.toLowerCase(), active: true, is_owner: false });
        D.memberships.push({ id: uid(), staff_id: p.id, section_id: j.section_id, role: j.role }); j.uses++; accounts[email.toLowerCase()] = p.id; return wait({ ok: true });
      },
      async claim(c, s, release) {
        const cl = find('classes', c); const v = D.timetable_versions.find(x => x.section_id === cl.section_id && x.status === 'approved');
        const cur = (D.timetable_slots.find(x => x.version_id === v.id && x.class_id === c && x.subject_id === s && x.teacher_id) || {}).teacher_id;
        if (!release && cur && cur !== meId) throw new Error('هذه المادة مسندة لمعلم آخر — تواصل مع الإدارة');
        const ex = D.assignment_requests.find(r => r.staff_id === meId && r.class_id === c && r.subject_id === s && r.status === 'pending');
        if (ex) { ex.status = 'cancelled'; return wait({ cancelled: true }); }
        ins('assignment_requests', { section_id: cl.section_id, staff_id: meId, class_id: c, subject_id: s, kind: release ? 'release' : 'claim', status: 'pending' }); return wait({ pending: true });
      },
      assignRequests: sec => wait(pick('assignment_requests', r => r.section_id === sec && r.status === 'pending')),
      myAssignRequests: () => wait(pick('assignment_requests', r => r.staff_id === meId && r.status === 'pending')),
      async decideRequests(ids, approve) {
        let done = 0, skipped = 0;
        for (const id of ids) { const r = find('assignment_requests', id); if (!r || r.status !== 'pending') continue;
          if (!approve) { r.status = 'rejected'; done++; continue; }
          const v = D.timetable_versions.find(x => x.section_id === r.section_id && x.status === 'approved');
          const cur = (D.timetable_slots.find(x => x.version_id === v.id && x.class_id === r.class_id && x.subject_id === r.subject_id && x.teacher_id) || {}).teacher_id;
          if (r.kind === 'claim' && cur && cur !== r.staff_id) { r.status = 'rejected'; skipped++; continue; }
          const t = r.kind === 'claim' ? r.staff_id : null;
          D.timetable_slots.forEach(x => { if (x.version_id === v.id && x.class_id === r.class_id && x.subject_id === r.subject_id) x.teacher_id = t; });
          D.plan_entries.forEach(e => { const w = find('weeks', e.week_id); if (w.status === 'open' && e.class_id === r.class_id && e.subject_id === r.subject_id && e.status !== 'approved') e.teacher_id = t; });
          r.status = 'approved'; done++; }
        return wait({ done, skipped });
      },
      async approvedSlots(section) { const v = D.timetable_versions.find(x => x.section_id === section && x.status === 'approved'); return wait(v ? pick('timetable_slots', x => x.version_id === v.id) : []); },
      messages: () => wait(pick('messages', m => m.recipient_id === meId || m.sender_id === meId).sort((a, b) => b.created_at.localeCompare(a.created_at))),
      sendMessage: r => wait(ins('messages', { sender_id: meId, kind: 'message', read_at: null, ...r })),
      sendMessages: rows => { rows.forEach(r => ins('messages', { sender_id: meId, kind: 'message', read_at: null, ...r })); return wait(true); },
      markRead: ids => { ids.forEach(id => { const m = find('messages', id); if (m) m.read_at = new Date().toISOString(); }); return wait(true); },
      langIssues: (q = {}) => wait(pick('language_issues', x => (!q.week || x.week_id === q.week) && (!q.teacher || x.teacher_id === q.teacher))),
      addLangIssues: rows => { rows.forEach(r => ins('language_issues', { status: 'applied', checked_by: meId, ...r })); return wait(true); },
      confirmExec: (ids, st, note) => { ids.forEach(id => { const e = find('plan_entries', id); Object.assign(e, { exec_status: st, exec_note: note || '', exec_at: new Date().toISOString(), exec_by: meId }); }); return wait(ids.length); },
      entriesForWeeks: ids => wait(pick('plan_entries', e => ids.includes(e.week_id))),
      auditRange: () => wait(clone(D.audit_log)),
      async uploadAsset(file) { return await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(file); }); },
      joinWithCode2(code, f) { return this.joinWithCode(code, f.name, f.email, f.password); },
      subscribe() { return () => { }; },
      presence(room, key, meta, onSync) {
        const others = D.staff.filter(p => !p.is_owner && p.id !== key).slice(0, 3).map((p, i) => [p.id, [{ staff_id: p.id, name: p.full_name, view: ['my', 'dash', 'classes'][i % 3], at: new Date(Date.now() - (i + 1) * 7 * 60000).toISOString() }]]);
        const st = () => Object.fromEntries([[key, [meta]], ...others]);
        setTimeout(() => onSync(st()), 300);
        return { update: m => { meta = m; onSync(st()); }, stop: () => { } };
      },
      sheetPushUser: (week, rows) => { const w = find('weeks', week); if (w) w.sheet_synced_at = new Date().toISOString(); return wait({ updated: 0, week: w && w.word }); },
      requestSheetSync: (week, dir) => { const w = find('weeks', week); if (!w || !w.sheet_id) return Promise.reject(new Error('لم يُربط هذا الأسبوع بملف Google Sheet بعد')); setTimeout(() => { w.sheet_synced_at = new Date().toISOString(); }, 800); return wait({ queued: true, instant: true }); },
      syncCfg: () => wait(DEMO_SYNC),
      parentLinks: () => wait([DEMO_PARENT]),
      delegations: sec => wait(pick('entry_delegations', d => d.section_id === sec && d.active)),
      addDelegation: r => wait(ins('entry_delegations', { active: true, note: '', ...r })),
      updateDelegation: (id, p) => wait(upd('entry_delegations', id, p)),
      posts: () => wait(clone(D.parent_posts).sort((a, b) => (b.pinned - a.pinned) || String(b.starts_on).localeCompare(a.starts_on))),
      addPost: r => wait(ins('parent_posts', { active: true, pinned: false, kind: 'announcement', starts_on: new Date().toISOString().slice(0, 10), ...r })),
      updatePost: (id, p) => wait(upd('parent_posts', id, p)),
      deletePost: id => { del('parent_posts', r => r.id === id); return wait(null); },
      updateParentLink: (id, p) => { Object.assign(DEMO_PARENT, p); return wait(DEMO_PARENT); },
      updateSyncCfg: p => { Object.assign(DEMO_SYNC, p); return wait(DEMO_SYNC); },
      reloadStaff: () => wait(clone(D.staff)),
      reloadMemberships: () => wait(clone(D.memberships)),
      reloadSubjects: () => wait(clone(D.subjects)),
    };
  }
  window.makeDemoApi = make;
})();
