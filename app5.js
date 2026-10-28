/* منصة دينا — الرسائل الداخلية، الإسناد من أي مكان، التصفح كموظف، المزامنة اللحظية،
   التنفيذ اليومي، والتدقيق اللغوي */
(function () {
  const A = window.APP, V = window.VIEWS;
  const { api, S, $, $$, esc, AR, DAYS, PER, I } = A;
  const EX = { pending: 'لم يُؤكَّد بعد', done: 'نُفِّذ كما خُطِّط', modified: 'عُدِّل ثم نُفِّذ', not_done: 'لم يُنفَّذ' };
  A.EX = EX;
  const exPill = st => `<span class="expill ex-${st || 'pending'}"><span class="exdot"></span>${EX[st || 'pending']}</span>`;
  A.exPill = exPill;

  // =====================================================================
  //  التصفح بحساب موظف (للمالك فقط)
  // =====================================================================
  A.viewAs = async function (staffId) {
    const real = S.realMe || S.me; if (!real.is_owner) return;
    const p = A.person(staffId); if (!p || p.is_owner) return;
    if (!(await A.confirmBox(`الدخول بحساب <b>${esc(p.full_name)}</b>؟<br><span class="small muted">ستشاهد المنصة كما يراها بصلاحياته، وتعود لحسابك من الشريط العلوي في أي وقت.</span>`, 'الدخول بحسابه'))) return;
    A.LS.set('viewas', staffId); history.replaceState(null, '', location.pathname + location.search + '#/'); await A.start();
  };

  // =====================================================================
  //  إسناد معلم من أي مكان (خلية «بلا معلم» في الجدول، خطط الفصول، التفاصيل)
  // =====================================================================
  async function assignDialog(classId, subjectId) {
    if (!A.perm('timetable_edit')) return A.toast('إسناد المعلمين لمن يملك صلاحية تعديل الجدول');
    const c = A.cls(classId) || {}; const secId = c.section_id || S.sectionId;
    const inSec = S.staff.filter(p => p.active && !p.is_owner && S.memberships.some(m => m.staff_id === p.id && m.section_id === secId));
    const others = S.staff.filter(p => p.active && !p.is_owner && !inSec.includes(p));
    const opt = p => `<option value="${p.id}">${esc(p.full_name)}${p.specialty ? ' — ' + esc(p.specialty) : ''}</option>`;
    const m = A.modal(`<h3>إسناد معلم: ${esc(A.subjName(subjectId))} — ${esc(c.name || '')}</h3>
      <p class="sub">يُسند لكل حصص المادة في هذا الفصل في الجدول المعتمد والأسابيع المفتوحة.</p>
      <div class="field"><label for="asT">المعلم</label><select class="in" id="asT"><option value="">— اختر —</option><optgroup label="${esc(A.section().name)}">${inSec.map(opt).join('')}</optgroup>${others.length ? `<optgroup label="أقسام أخرى">${others.map(opt).join('')}</optgroup>` : ''}<option value="__new">+ معلم جديد…</option></select></div>
      <div class="field hidden" id="asNewBox"><label for="asNew">اسم المعلم الجديد</label><input class="in" id="asNew" placeholder="أ. الاسم"></div>
      <label class="chk"><input type="checkbox" id="asAll"> أسند نفس المعلم لهذه المادة في كل فصول ${esc(c.grade_word ? 'الصف ' + c.grade_word : 'القسم')}</label>
      <div class="acts"><button class="btn" id="asGo">إسناد</button></div>`);
    const sel = m.el.querySelector('#asT');
    sel.onchange = () => m.el.querySelector('#asNewBox').classList.toggle('hidden', sel.value !== '__new');
    m.el.querySelector('#asGo').onclick = e => A.run(e.currentTarget, async () => {
      let tid = sel.value;
      if (tid === '__new') { const n = m.el.querySelector('#asNew').value.trim(); if (n.length < 4) throw new Error('اكتب اسم المعلم'); tid = (await api.addStaff({ school_id: S.school.id, full_name: n })).id; }
      if (!tid) throw new Error('اختر معلماً');
      const targets = m.el.querySelector('#asAll').checked ? S.classes.filter(x => x.active && x.stage === c.stage && x.grade_word === c.grade_word).map(x => x.id) : [classId];
      for (const cid of targets) await api.assignTeacher(cid, subjectId, tid);
      m.close(); await A.refreshPeople(); await A.loadWeek(); if (A._ttLoadRefresh && document.querySelector('#lb')) A._ttLoadRefresh(); else A.route();
      A.toast(`أُسند ${A.personName(tid)} في ${A.cnt(targets.length, 'فصل', 'فصول')}`, 'ok');
    });
  }
  A.assignDialog = assignDialog;
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-assign-c]'); if (!t) return;
    e.preventDefault(); e.stopPropagation(); assignDialog(t.dataset.assignC, t.dataset.assignS);
  }, true);

  // =====================================================================
  //  الرسائل الداخلية
  // =====================================================================
  let MSG = [];
  async function loadMsgs() { try { MSG = await api.messages(); } catch (e) { MSG = []; } badge(); }
  const myId = () => S.me.id;
  function badge() { const n = MSG.filter(m => m.recipient_id === myId() && !m.read_at).length; const b = $('#inboxN'); if (b) { b.textContent = AR(n); b.classList.toggle('hidden', !n); } }
  const KIND = { message: 'رسالة', language: 'ملاحظة لغوية', return: 'إرجاع حصة', reminder: 'تذكير', system: 'النظام' };
  function inbox(openWith) {
    const threads = {};
    MSG.forEach(m => { const other = m.sender_id === myId() ? m.recipient_id : m.sender_id; (threads[other] = threads[other] || []).push(m); });
    const order = Object.entries(threads).sort((a, b) => b[1][0].created_at.localeCompare(a[1][0].created_at));
    const m = A.modal(`<div class="head" style="margin-bottom:10px"><div class="grow"><h3 style="margin:0">الرسائل</h3></div><button class="btn sm" id="newMsg">${I.plus} رسالة جديدة</button></div>
      <div class="inbox"><div class="lst" id="ibL"></div><div class="rd" id="ibR">${A.emptyBox(order.length ? 'اختر محادثة' : 'لا توجد رسائل بعد', 'راسل أي زميل من «رسالة جديدة».')}</div></div>`, { cls: 'wide' });
    const L = m.el.querySelector('#ibL');
    L.innerHTML = order.map(([pid, list]) => { const un = list.some(x => x.recipient_id === myId() && !x.read_at); return `<button data-p="${pid}" class="${un ? 'unread' : ''}"><b>${esc(A.personName(pid) || '—')}</b><div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(list[0].subject || list[0].body)}</div><div class="small faint">${A.fmtDT(list[0].created_at)}</div></button>`; }).join('');
    const openThread = async pid => {
      $$('button', L).forEach(b => b.classList.toggle('on', b.dataset.p === pid));
      const list = (threads[pid] || []).slice().reverse();
      m.el.querySelector('#ibR').innerHTML = `<h3>${esc(A.personName(pid))}</h3>` + list.map(x => `<div class="msg ${x.sender_id === myId() ? 'me' : ''}"><div class="small muted">${x.sender_id === myId() ? 'أنت' : esc(A.personName(x.sender_id))} · ${A.fmtDT(x.created_at)} · ${KIND[x.kind] || ''}</div>${x.subject ? `<b>${esc(x.subject)}</b><br>` : ''}${esc(x.body)}</div>`).join('') +
        `<div class="field" style="margin-top:12px"><textarea class="in" id="rpl" rows="3" placeholder="اكتب ردك"></textarea></div><button class="btn sm" id="rplGo">${I.send} إرسال</button>`;
      m.el.querySelector('#rplGo').onclick = e => A.run(e.currentTarget, async () => { const body = m.el.querySelector('#rpl').value.trim(); if (!body) return; await api.sendMessage({ recipient_id: pid, body }); await loadMsgs(); m.close(); inbox(pid); });
      const unread = list.filter(x => x.recipient_id === myId() && !x.read_at).map(x => x.id);
      if (unread.length && !S.realMe) { await api.markRead(unread).catch(() => { }); unread.forEach(id => { const x = MSG.find(y => y.id === id); if (x) x.read_at = new Date().toISOString(); }); badge(); }
    };
    $$('button', L).forEach(b => b.onclick = () => openThread(b.dataset.p));
    m.el.querySelector('#newMsg').onclick = () => { m.close(); compose(); };
    if (openWith) openThread(openWith);
  }
  // ---- رسالة جديدة: اختيار بالمربعات مع صفة كل موظف، وإرسال جماعي
  const roleOf = p => {
    if (p.is_owner) return 'مالك النظام';
    const ms = S.memberships.filter(m => m.staff_id === p.id);
    return ms.map(m => `${A.ROLES[m.role] || m.role} · ${(S.sections.find(x => x.id === m.section_id) || {}).short_name || ''}`).join('، ') || 'غير مضاف لقسم';
  };
  function compose(to = [], subject = '', body = '', kind = 'message') {
    const people = S.staff.filter(p => p.active && p.id !== myId()).sort((a, b) => (b.user_id ? 1 : 0) - (a.user_id ? 1 : 0) || a.full_name.localeCompare(b.full_name, 'ar'));
    const sel = new Set(to.filter(id => people.some(p => p.id === id && p.user_id)));
    const inSec = (p, sid) => S.memberships.some(m => m.staff_id === p.id && m.section_id === sid);
    const isRole = (p, r) => S.memberships.some(m => m.staff_id === p.id && m.role === r);
    const groups = [['all', 'الكل', () => true], ['t', 'المعلمون', p => isRole(p, 'teacher')], ['s', 'المشرفون والإدارة', p => p.is_owner || isRole(p, 'supervisor') || isRole(p, 'admin')], ...S.sections.map(x => ['sec' + x.id, x.short_name || x.name, p => inSec(p, x.id)])];
    const m = A.modal(`<h3>رسالة جديدة</h3>
      <div class="field"><label>المستلمون <span class="small muted" id="cCnt"></span></label>
        <div class="chip-filter" id="cGrp" style="margin-bottom:8px">${groups.map(([k, l]) => `<button type="button" data-g="${k}">${esc(l)}</button>`).join('')}<button type="button" data-g="none">إلغاء التحديد</button></div>
        <input class="in" id="cQ" placeholder="بحث بالاسم أو الصفة أو التخصص" style="margin-bottom:8px">
        <div id="cList" class="rcpt"></div></div>
      <div class="field"><label for="cSub">الموضوع</label><input class="in" id="cSub" value="${esc(subject)}"></div>
      <div class="field"><label for="cBody">النص</label><textarea class="in" id="cBody" rows="5">${esc(body)}</textarea></div>
      <div class="acts"><button class="btn" id="cGo">${I.send} إرسال</button></div>`, { cls: 'wide' });
    const L = m.el.querySelector('#cList');
    const draw = () => {
      const q = A.normKey(m.el.querySelector('#cQ').value);
      L.innerHTML = people.filter(p => !q || A.normKey(p.full_name + ' ' + roleOf(p) + ' ' + (p.specialty || '')).includes(q)).map(p => `<label class="rc ${p.user_id ? '' : 'off'}"><input type="checkbox" value="${p.id}" ${sel.has(p.id) ? 'checked' : ''} ${p.user_id ? '' : 'disabled'}><span class="nm"><b>${esc(p.full_name)}</b><span class="small muted">${esc(roleOf(p))}${p.specialty ? ' · ' + esc(p.specialty) : ''}${p.user_id ? '' : ' · لم يُنشئ حساباً بعد'}</span></span></label>`).join('') || `<p class="small muted">لا نتائج</p>`;
      $$('input', L).forEach(i => i.onchange = () => { i.checked ? sel.add(i.value) : sel.delete(i.value); count(); });
      count();
    };
    const count = () => { m.el.querySelector('#cCnt').textContent = sel.size ? `(${AR(sel.size)} محدد)` : ''; m.el.querySelector('#cGo').innerHTML = `${I.send} إرسال${sel.size > 1 ? ` إلى ${AR(sel.size)}` : ''}`; };
    $$('#cGrp button', m.el).forEach(b => b.onclick = () => {
      if (b.dataset.g === 'none') sel.clear();
      else { const g = groups.find(x => x[0] === b.dataset.g); people.filter(p => p.user_id && g[2](p)).forEach(p => sel.add(p.id)); }
      draw();
    });
    m.el.querySelector('#cQ').oninput = draw; draw();
    m.el.querySelector('#cGo').onclick = e => A.run(e.currentTarget, async () => {
      const ids = [...sel]; const b = m.el.querySelector('#cBody').value.trim();
      if (!ids.length) throw new Error('اختر مستلماً واحداً على الأقل'); if (!b) throw new Error('اكتب نص الرسالة');
      const sub = m.el.querySelector('#cSub').value.trim();
      for (let i = 0; i < ids.length; i += 200) await api.sendMessages(ids.slice(i, i + 200).map(id => ({ recipient_id: id, subject: sub, body: b, kind })));
      m.close(); await loadMsgs(); A.toast(`أُرسلت إلى ${A.cnt(ids.length, 'شخص', 'أشخاص')}`, 'ok');
    });
  }
  A.compose = compose; A.inbox = inbox;

  // =====================================================================
  //  المزامنة اللحظية
  // =====================================================================
  let unsub = [];
  function realtime() {
    unsub.forEach(f => f()); unsub = [];
    if (S.weekId) unsub.push(api.subscribe('pe-' + S.weekId, 'plan_entries', 'week_id=eq.' + S.weekId, p => {
      const r = p.new && p.new.id ? p.new : null; if (!r) return;
      const i = S.entries.findIndex(e => e.id === r.id); if (i >= 0) S.entries[i] = { ...S.entries[i], ...r }; else S.entries.push(r);
      changed.add(r.id);
      scheduleRefresh();
    }));
    unsub.push(api.subscribe('arq-' + S.sectionId, 'assignment_requests', 'section_id=eq.' + S.sectionId, () => { if (A._ttReqRefresh && $('#lrq')) A._ttReqRefresh(); if (A._dashReq) A._dashReq(); }));
    unsub.push(api.subscribe('tts-' + S.sectionId, 'timetable_slots', null, () => { clearTimeout(realtime._t); realtime._t = setTimeout(() => { if (A._ttLoadRefresh && $('#lb')) A._ttLoadRefresh(); }, 1500); }));
    if (S.sectionId) unsub.push(api.subscribe('wk-' + S.sectionId, 'weeks', 'section_id=eq.' + S.sectionId, p => {
      const r = p.new && p.new.id ? p.new : null; if (!r) return; const i = S.weeks.findIndex(w => w.id === r.id); if (i >= 0) { S.weeks[i] = { ...S.weeks[i], ...r }; const sb = $('#syncLast'); if (sb && A.syncLabel) sb.innerHTML = A.syncLabel(S.weeks[i]); }
    }));
    unsub.push(api.subscribe('msg-' + myId(), 'messages', 'recipient_id=eq.' + myId(), p => {
      if (p.eventType === 'INSERT') { MSG.unshift(p.new); badge(); A.toast(`رسالة جديدة من ${A.personName(p.new.sender_id)}`); }
    }));
  }
  let rt, changed = new Set();
  function scheduleRefresh() {
    clearTimeout(rt); rt = setTimeout(() => {
      const busy = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if ($('.ovl')) return A.renderNav();
      if (A._exRe && $('#exL')) { A._exRe(); return A.renderNav(); }
      if (S.view === 'my' && A.refreshMyCards) { A.refreshMyCards(changed); changed = new Set(); return A.renderNav(); }
      if (!busy && ['dash', 'classes', 'export', 'reports'].includes(S.view)) A.route(); else A.renderNav();
    }, 1200);
  }
  window.APP_AFTER_SHELL = () => {
    const ib = $('#inboxBtn'); if (ib) ib.onclick = () => inbox();
    loadMsgs(); realtime();
  };
  window.APP_AFTER_WEEK = () => { if ($('#inboxBtn')) realtime(); };

  // =====================================================================
  //  التنفيذ اليومي (تأكيد ما دُرِّس فعلاً)
  // =====================================================================
  V._exec = function (root, opts = {}) {
    const w = A.week(); if (!w) return;
    const dates = A.weekDates(w, A.section().days);
    const today = new Date(); const tIso = A.isoDate(today);
    const start = A.parseDate(w.start_date); let def = Math.round((A.parseDate(tIso) - start) / 864e5); if (def < 0 || def >= dates.length) def = 0;
    let day = opts.day ?? +(A.LS.get('exday') ?? def); if (day >= dates.length) day = 0;
    const reviewer = A.perm('review');
    const scope = opts.all && (reviewer || A.perm('exec_confirm')) ? S.entries.filter(e => e.subject_id) : S.entries.filter(e => e.teacher_id === S.me.id && e.subject_id);
    const list = scope.filter(e => e.day === day && !A.holidayOf(e.day)).sort((a, b) => a.period - b.period || (A.cls(a.class_id)?.sort ?? 0) - (A.cls(b.class_id)?.sort ?? 0));
    const cnt = k => scope.filter(e => (e.exec_status || 'pending') === k && A.required(e)).length;
    const ro = !!opts.all && !A.perm('exec_confirm'); // التأكيد من معلم الحصة، أو ممن مُنح صلاحية «التأكيد نيابةً»
    A._exRe = () => { if (root.isConnected && $('#exL', root)) V._exec(root, { ...opts, day }); else A._exRe = null; };
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>التنفيذ اليومي — ${opts.all ? 'كل الفصول' : 'حصصي'}</h2>
      <p class="sub" style="margin:2px 0 0">${ro ? 'متابعة فقط — يؤكّد كل معلم حصصه بنفسه من «خطتي ← التنفيذ اليومي»، أو من يمنحه المالك صلاحية التأكيد نيابةً. تتحدّث الألوان لحظياً.' : opts.all ? 'لديك صلاحية التأكيد نيابةً عن المعلمين — كل تأكيد يُسجَّل باسمك.' : 'أكّد لكل حصة: نُفِّذت كما خُطِّط (أخضر)، أو عُدِّلت ثم نُفِّذت (أخضر فاتح)، أو لم تُنفَّذ مع السبب. غير المؤكَّد يبقى أصفر.'}</p></div>
      <div class="row">${exPill('done')} ${AR(cnt('done'))} ${exPill('modified')} ${AR(cnt('modified'))} ${exPill('pending')} ${AR(cnt('pending'))} ${exPill('not_done')} ${AR(cnt('not_done'))}</div></div>
      <div class="tabs">${dates.map((d, i) => `<button data-d="${i}" class="${i === day ? 'on' : ''}">${DAYS[i]} <span class="small muted">${AR(d)}</span></button>`).join('')}</div>
      ${list.length && !ro ? `<div class="row" style="margin-bottom:10px"><button class="btn ok sm" id="exAll">${I.check} تأكيد كل حصص اليوم كما خُطِّطت</button></div>` : ''}
      <div id="exL">${list.map(e => `<div class="exrow ex-${e.exec_status || 'pending'}" data-id="${e.id}"><div><b>الحصة ${PER[e.period]}</b> · ${esc((A.cls(e.class_id) || {}).name || '')} · ${esc(A.subjName(e.subject_id))}${opts.all ? ` · <span class="muted">${esc(A.personName(e.teacher_id) || 'بلا معلم')}</span>` : ''}
        <div class="small" style="margin-top:4px">${esc(e.topic) || '<span class="faint">لا يوجد موضوع مكتوب</span>'}${e.homework ? ` — <span style="color:var(--blue)">الواجب: ${esc(e.homework)}</span>` : ''}</div>${e.exec_note ? `<div class="small" style="margin-top:4px;color:var(--warn)">${esc(e.exec_note)}</div>` : ''}</div>
        ${ro ? `<div class="acts">${exPill(e.exec_status)}${e.exec_at ? `<span class="small faint">${A.fmtDT(e.exec_at)}</span>` : ''}</div>` : `<div class="acts"><button class="btn ghost sm ${e.exec_status === 'done' ? 'on' : ''}" data-x="done">نُفِّذت</button><button class="btn ghost sm ${e.exec_status === 'modified' ? 'on' : ''}" data-x="modified">عُدِّلت ثم نُفِّذت</button><button class="btn ghost sm ${e.exec_status === 'not_done' ? 'on' : ''}" data-x="not_done">لم تُنفَّذ</button></div>`}</div>`).join('') || A.emptyBox(A.holidayOf(day) ? 'إجازة' : 'لا توجد حصص في هذا اليوم')}</div></div>`;
    $$('.tabs button', root).forEach(b => b.onclick = () => { A.LS.set('exday', b.dataset.d); V._exec(root, { ...opts, day: +b.dataset.d }); });
    const save = async (ids, st, note) => { await api.confirmExec(ids, st, note); ids.forEach(id => { const e = S.entries.find(x => x.id === id); if (e) { e.exec_status = st; e.exec_note = note || ''; } }); V._exec(root, { ...opts, day }); };
    const ea = $('#exAll', root); if (ea) ea.onclick = e => A.run(e.currentTarget, () => save(list.filter(x => (x.exec_status || 'pending') === 'pending').map(x => x.id), 'done'));
    $$('.exrow', root).forEach(r => $$('[data-x]', r).forEach(b => b.onclick = () => {
      const st = b.dataset.x, id = r.dataset.id;
      if (st === 'done') return A.run(null, () => save([id], 'done'));
      const lbl = st === 'modified' ? 'ما الذي تغيّر؟ (مثال: شُرح جزء من الدرس، أُجّل الواجب)' : 'سبب عدم التنفيذ (غياب، نشاط مدرسي، اختبار…)';
      const quick = st === 'not_done' ? ['غياب المعلم', 'نشاط مدرسي', 'اختبار', 'إجازة طارئة'] : ['شُرح جزء من الدرس', 'أُجّل الواجب', 'تغيّر الموضوع'];
      const m = A.modal(`<h3>${EX[st]}</h3><div class="row" style="margin-bottom:10px">${quick.map(q => `<button class="btn ghost sm" data-q="${q}">${q}</button>`).join('')}</div><div class="field"><label>${lbl}</label><textarea class="in" id="exN" rows="3"></textarea></div><div class="acts"><button class="btn" id="exGo">حفظ</button></div>`);
      $$('[data-q]', m.el).forEach(q => q.onclick = () => { m.el.querySelector('#exN').value = q.dataset.q; });
      m.el.querySelector('#exGo').onclick = ev => A.run(ev.currentTarget, async () => { const n = m.el.querySelector('#exN').value.trim(); if (!n) throw new Error('اكتب السبب أو اختر من الأزرار'); await save([id], st, n); m.close(); });
    }));
  };

  // =====================================================================
  //  التدقيق اللغوي الإلكتروني
  // =====================================================================
  V._lang = function (classId) {
    if (!A.perm('review')) return;
    const act = S.classes.filter(c => c.active);
    const m = A.modal(`<h3>التدقيق اللغوي — الأسبوع ${esc(A.week().word)}</h3>
      <p class="sub">يفحص الموضوع والواجب والملاحظات بقاموس ${AR(LangCheck.dictionarySize)} خطأً شائعاً وقواعد الترقيم والمسافات والهمزات والتاء المربوطة. الكلمات الملتبسة لا تُعدَّل. تراجع كل اقتراح قبل تطبيقه.</p>
      <div class="field"><label>النطاق</label><div class="chip-filter" id="lgS"><button data-s="one" class="${classId ? 'on' : ''}">${classId ? esc(A.cls(classId).name) : 'فصل واحد'}</button><button data-s="all" class="${classId ? '' : 'on'}">كل الفصول</button><button data-s="pick">فصول محددة</button></div>
      <div class="perm-grid hidden" id="lgP">${act.map(c => `<label class="chk"><input type="checkbox" value="${c.id}"> ${esc(c.name)}</label>`).join('')}</div></div>
      <div class="row" style="gap:18px">${[['topic', 'الموضوع'], ['homework', 'الواجب'], ['note', 'الملاحظات']].map(([k, l]) => `<label class="chk"><input type="checkbox" data-f="${k}" checked> ${l}</label>`).join('')}</div>
      <div class="acts"><button class="btn" id="lgGo">بدء التدقيق</button></div><div id="lgR"></div>`, { cls: 'wide' });
    let scope = classId ? 'one' : 'all';
    $$('#lgS button', m.el).forEach(b => b.onclick = () => { scope = b.dataset.s; $$('#lgS button', m.el).forEach(x => x.classList.toggle('on', x === b)); m.el.querySelector('#lgP').classList.toggle('hidden', scope !== 'pick'); });
    m.el.querySelector('#lgGo').onclick = () => {
      const ids = scope === 'one' && classId ? [classId] : scope === 'pick' ? $$('#lgP input:checked', m.el).map(i => i.value) : act.map(c => c.id);
      const fields = $$('[data-f]:checked', m.el).map(i => i.dataset.f);
      const found = [];
      S.entries.filter(e => ids.includes(e.class_id)).forEach(e => fields.forEach(f => { const r = LangCheck.check(e[f]); if (r) found.push({ e, f, ...r }); }));
      const R = m.el.querySelector('#lgR');
      if (!found.length) { R.innerHTML = `<div class="notice ok" style="margin-top:12px">لم تُرصد أخطاء في ${A.cnt(ids.length, 'فصل', 'فصول')}.</div>`; return; }
      const FL = { topic: 'الموضوع', homework: 'الواجب', note: 'ملاحظة' };
      const diff = (a, b) => { const x = a.split(/(\s+)/), y = b.split(/(\s+)/); return [x.map(t => y.includes(t) ? esc(t) : `<del>${esc(t)}</del>`).join(''), y.map(t => x.includes(t) ? esc(t) : `<ins>${esc(t)}</ins>`).join('')]; };
      R.innerHTML = `<div class="notice warn" style="margin-top:12px">${A.cnt(found.length, 'ملاحظة', 'ملاحظات')} في ${A.cnt(new Set(found.map(x => x.e.class_id)).size, 'فصل', 'فصول')} — حدّد ما تريد تطبيقه.</div>
        <label class="chk" style="margin-bottom:6px"><input type="checkbox" id="lgAll" checked> تحديد الكل</label>
        <div style="max-height:46vh;overflow:auto">${found.map((x, i) => { const [a, b] = diff(x.original, x.suggestion); return `<div class="lang-row"><input type="checkbox" data-i="${i}" checked aria-label="تطبيق"><div><div class="small muted">${esc(A.cls(x.e.class_id).name)} · ${DAYS[x.e.day]} ح${AR(x.e.period + 1)} · ${esc(A.subjName(x.e.subject_id))} · ${FL[x.f]} · ${esc(A.personName(x.e.teacher_id) || 'بلا معلم')}</div>${a}</div><div><div class="small muted">${[...new Set(x.changes.map(c => c.rule))].join('، ')}</div>${b}</div></div>`; }).join('')}</div>
        <div class="row" style="margin-top:12px;gap:18px"><label class="chk"><input type="checkbox" id="lgApr"> اعتماد حصص الخطط المصحَّحة بعد التطبيق</label><label class="chk"><input type="checkbox" id="lgMsg" checked> إرسال ملاحظة لكل معلم بأخطائه</label></div>
        <div class="acts"><button class="btn ok" id="lgApply">${I.check} تطبيق التصحيحات المحددة</button></div>`;
      m.el.querySelector('#lgAll').onchange = ev => $$('[data-i]', R).forEach(c => c.checked = ev.target.checked);
      m.el.querySelector('#lgApply').onclick = ev => A.run(ev.currentTarget, async () => {
        const sel = $$('[data-i]', R).filter(c => c.checked).map(c => found[+c.dataset.i]);
        const byEntry = {}; sel.forEach(x => { (byEntry[x.e.id] = byEntry[x.e.id] || {})[x.f] = x.suggestion; });
        for (const [id, patch] of Object.entries(byEntry)) { const r = await api.saveEntry(id, patch); const e = S.entries.find(y => y.id === id); if (e) Object.assign(e, r); }
        const w = A.week();
        await api.addLangIssues(sel.map(x => ({ entry_id: x.e.id, week_id: w.id, class_id: x.e.class_id, teacher_id: x.e.teacher_id, field: x.f, original: x.original, suggestion: x.suggestion, rule: [...new Set(x.changes.map(c => c.rule))].join('، ') })));
        if (m.el.querySelector('#lgApr').checked) await api.review(Object.keys(byEntry), 'approved', '');
        if (m.el.querySelector('#lgMsg').checked) {
          const byT = {}; sel.filter(x => x.e.teacher_id).forEach(x => (byT[x.e.teacher_id] = byT[x.e.teacher_id] || []).push(x));
          await api.sendMessages(Object.entries(byT).map(([tid, l]) => ({ recipient_id: tid, kind: 'language', subject: `ملاحظات لغوية — الأسبوع ${w.word}`, body: `صُحّحت ${A.cnt(l.length, 'ملاحظة', 'ملاحظات')} في خطتك:\n\n` + l.map(x => `• ${A.cls(x.e.class_id).name} — ${DAYS[x.e.day]} ح${AR(x.e.period + 1)}: «${x.original}» ← «${x.suggestion}»`).join('\n') + '\n\nشاكرين حرصكم.' })));
        }
        m.close(); await A.loadWeek(); A.route(); A.toast(`طُبِّقت ${A.cnt(sel.length, 'تصحيح', 'تصحيحات')}`, 'ok');
      });
    };
  };
})();
