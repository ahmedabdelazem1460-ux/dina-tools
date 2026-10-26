/* طبقة البيانات — Supabase */
(function () {
  function msg(e) {
    if (!e) return 'خطأ غير معروف';
    const m = e.message || String(e);
    if (/Invalid login credentials/i.test(m)) return 'البريد أو كلمة المرور غير صحيحة';
    if (/Failed to fetch|NetworkError/i.test(m)) return 'تعذّر الاتصال بالخادم — تحقق من الإنترنت';
    if (/row-level security|permission denied/i.test(m)) return 'ليست لديك صلاحية لهذا الإجراء';
    if (/duplicate key/i.test(m)) return 'هذا العنصر موجود مسبقاً';
    if (/JWT expired/i.test(m)) return 'انتهت الجلسة — سجّل الدخول من جديد';
    return m;
  }
  function make(cfg) {
    const sb = supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true } });
    const ok = r => { if (r.error) throw new Error(msg(r.error)); return r.data; };
    const T = t => sb.from(t);
    return {
      demo: false,
      async session() { const { data } = await sb.auth.getSession(); return data.session; },
      async signIn(email, password) { return ok(await sb.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })); },
      async signOut() { await sb.auth.signOut(); },
      async changePassword(pw) { return ok(await sb.auth.updateUser({ password: pw })); },
      onAuth(cb) { sb.auth.onAuthStateChange((ev) => cb(ev)); },

      async boot() {
        const { data: { user } } = await sb.auth.getUser();
        if (!user) return null;
        const me = ok(await T('staff').select('*').eq('user_id', user.id).maybeSingle());
        if (!me) return { me: null, email: user.email };
        const [school, sections, memberships, staff, subjects] = await Promise.all([
          T('schools').select('*').eq('id', me.school_id).single().then(ok),
          T('sections').select('*').order('sort').then(ok),
          T('memberships').select('*').then(ok),
          T('staff').select('*').order('full_name').then(ok),
          T('subjects').select('*').order('name').then(ok)]);
        return { me, school, sections, memberships, staff, subjects };
      },
      classes: s => T('classes').select('*').eq('section_id', s).order('sort').then(ok),
      weeks: s => T('weeks').select('*').eq('section_id', s).order('number', { ascending: false }).then(ok),
      async entries(w) {
        let all = [], from = 0;
        for (;;) { const r = ok(await T('plan_entries').select('*').eq('week_id', w).order('class_id').order('day').order('period').range(from, from + 999)); all = all.concat(r); if (r.length < 1000) break; from += 1000; }
        return all;
      },
      saveEntry: (id, patch) => T('plan_entries').update(patch).eq('id', id).select().single().then(ok),
      submitMyWeek: w => sb.rpc('submit_my_week', { p_week: w }).then(ok),
      review: (ids, status, note) => sb.rpc('review_entries', { p_ids: ids, p_status: status, p_note: note || '' }).then(ok),
      notes: w => T('notes').select('*').eq('week_id', w).order('created_at').then(ok),
      addNote: n => T('notes').insert(n).select().single().then(ok),
      updateNote: (id, p) => T('notes').update(p).eq('id', id).select().single().then(ok),
      deleteNote: id => T('notes').delete().eq('id', id).then(ok),
      updateWeek: (id, p) => T('weeks').update(p).eq('id', id).select().single().then(ok),
      createWeek: a => sb.rpc('create_week', { p_section: a.section_id, p_number: a.number, p_word: a.word, p_start: a.start_date, p_deadline: a.deadline }).then(ok),
      deleteWeek: id => T('weeks').delete().eq('id', id).then(ok),

      ttVersions: s => T('timetable_versions').select('*').eq('section_id', s).order('created_at', { ascending: false }).then(ok),
      ttSlots: v => T('timetable_slots').select('*').eq('version_id', v).then(ok),
      createDraft: d => T('timetable_versions').insert({ ...d, status: 'draft' }).select().single().then(ok),
      updateDraft: (id, p) => T('timetable_versions').update(p).eq('id', id).select().single().then(ok),
      async replaceSlots(v, slots) {
        ok(await T('timetable_slots').delete().eq('version_id', v));
        for (let i = 0; i < slots.length; i += 500) ok(await T('timetable_slots').insert(slots.slice(i, i + 500).map(s => ({ ...s, version_id: v }))));
      },
      upsertSlots: (v, slots) => T('timetable_slots').upsert(slots.map(s => ({ ...s, version_id: v })), { onConflict: 'version_id,class_id,day,period' }).then(ok),
      approveTT: (id, apply) => sb.rpc('approve_timetable', { p_version: id, p_apply_open_weeks: apply }).then(ok),
      deleteVersion: id => T('timetable_versions').delete().eq('id', id).then(ok),
      assignTeacher: (c, s, t) => sb.rpc('assign_teacher', { p_class: c, p_subject: s, p_teacher: t }).then(ok),

      addStaff: r => T('staff').insert(r).select().single().then(ok),
      updateStaff: (id, p) => T('staff').update(p).eq('id', id).select().single().then(ok),
      setLogin: (id, email, pw) => sb.rpc('set_login', { p_staff: id, p_email: email, p_password: pw || null }).then(ok),
      setActive: (id, a) => sb.rpc('set_staff_active', { p_staff: id, p_active: a }).then(ok),
      upsertMembership: r => T('memberships').upsert(r, { onConflict: 'staff_id,section_id' }).select().single().then(ok),
      deleteMembership: id => T('memberships').delete().eq('id', id).then(ok),
      addSubject: r => T('subjects').insert(r).select().single().then(ok),
      updateSubject: (id, p) => T('subjects').update(p).eq('id', id).select().single().then(ok),
      addClass: r => T('classes').insert(r).select().single().then(ok),
      updateClass: (id, p) => T('classes').update(p).eq('id', id).select().single().then(ok),
      addSection: r => T('sections').insert(r).select().single().then(ok),
      updateSection: (id, p) => T('sections').update(p).eq('id', id).select().single().then(ok),
      updateSchool: (id, p) => T('schools').update(p).eq('id', id).select().single().then(ok),
      audit: (lim = 200) => T('audit_log').select('*').order('at', { ascending: false }).limit(lim).then(ok),
      extraPages: w => T('extra_pages').select('*').eq('week_id', w).order('sort').order('created_at').then(ok),
      addExtraPage: r => T('extra_pages').insert(r).select().single().then(ok),
      updateExtraPage: (id, p) => T('extra_pages').update(p).eq('id', id).select().single().then(ok),
      deleteExtraPage: id => T('extra_pages').delete().eq('id', id).then(ok),
      joinCodes: () => T('join_codes').select('*').order('created_at').then(ok),
      createJoinCode: (section_id, role) => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; let c = ''; crypto.getRandomValues(new Uint32Array(12)).forEach(x => c += a[x % a.length]); return T('join_codes').insert({ code: c, section_id, role }).select().single().then(ok); },
      updateJoinCode: (code, p) => T('join_codes').update(p).eq('code', code).select().single().then(ok),
      joinInfo: code => sb.rpc('join_info', { p_code: code }).then(ok),
      joinWithCode: (code, name, email, pw) => sb.rpc('join_with_code', { p_code: code, p_full_name: name, p_email: email, p_password: pw }).then(ok),
      claim: (c, s, release) => sb.rpc('claim_assignment', { p_class: c, p_subject: s, p_release: !!release }).then(ok),
      async approvedSlots(section) { const v = ok(await T('timetable_versions').select('id').eq('section_id', section).eq('status', 'approved').maybeSingle()); return v ? ok(await T('timetable_slots').select('*').eq('version_id', v.id)) : []; },
      // ---- مراسلات
      messages: () => T('messages').select('*').order('created_at', { ascending: false }).limit(300).then(ok),
      sendMessage: r => T('messages').insert(r).select().single().then(ok),
      sendMessages: rows => T('messages').insert(rows).then(ok),
      markRead: ids => T('messages').update({ read_at: new Date().toISOString() }).in('id', ids).then(ok),
      // ---- تدقيق لغوي
      langIssues: (q = {}) => { let x = T('language_issues').select('*').order('created_at', { ascending: false }).limit(2000); if (q.week) x = x.eq('week_id', q.week); if (q.teacher) x = x.eq('teacher_id', q.teacher); return x.then(ok); },
      addLangIssues: rows => T('language_issues').insert(rows).then(ok),
      // ---- التنفيذ اليومي
      confirmExec: (ids, st, note) => sb.rpc('confirm_exec', { p_ids: ids, p_status: st, p_note: note || '' }).then(ok),
      // ---- تقارير
      async entriesForWeeks(ids) {
        let all = [];
        for (const w of ids) { let from = 0; for (;;) { const r = ok(await T('plan_entries').select('*').eq('week_id', w).range(from, from + 999)); all = all.concat(r); if (r.length < 1000) break; from += 1000; } }
        return all;
      },
      auditRange: (sinceIso, lim = 3000) => T('audit_log').select('*').gte('at', sinceIso).order('at', { ascending: false }).limit(lim).then(ok),
      // ---- ملفات وصور
      async uploadAsset(file) {
        const ext = (file.name.split('.').pop() || 'png').toLowerCase();
        const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        ok(await sb.storage.from('plan-assets').upload(path, file, { contentType: file.type, upsert: false }));
        return sb.storage.from('plan-assets').getPublicUrl(path).data.publicUrl;
      },
      joinWithCode2: (code, f) => sb.rpc('join_with_code_v2', { p_code: code, p_full_name: f.name, p_email: f.email, p_password: f.password, p_phone: f.phone || null, p_specialty: f.specialty || null, p_employee_no: f.employee_no || null }).then(ok),
      // ---- مزامنة لحظية
      subscribe(name, table, filter, cb) {
        const ch = sb.channel(name).on('postgres_changes', { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }, p => cb(p)).subscribe();
        return () => sb.removeChannel(ch);
      },
      reloadStaff: () => T('staff').select('*').order('full_name').then(ok),
      reloadMemberships: () => T('memberships').select('*').then(ok),
      reloadSubjects: () => T('subjects').select('*').order('name').then(ok),
    };
  }
  window.makeApi = make;
  window.apiMsg = msg;
})();
