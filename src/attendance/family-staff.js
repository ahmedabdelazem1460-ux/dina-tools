/* منصة دينا — «أولياء الأمور» لجهة المدرسة (V.pmsg) — يعمل مع بوابة ولي الأمر family.html (sql/104)
   - الرسائل الخاصة: كل موظف يرى محادثاته فقط (RLS: staff_id = me()) — لا يطّلع عليها أحد غير طرفيها، ولا المالك.
   - إرسال التقارير لأولياء الأمور (تُعتمد من المالك/المدير إن فُعّل «الاعتماد») + A.sendToParents للوحدات الأخرى.
   - نشر التدريب من بنك الأسئلة: تدريب تفاعلي، اختبار تجريبي، مراجعة بالحلول، كراسة.
   - الأعذار (للمالك والحضور والإشراف والإرشاد): عرض المرفق، القبول يحوّل الغياب إلى «مستأذن».
   يظهر لغير المالك بمفتاح tfeat('pmsg'). */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A || !V) return;
  const { S, api, $, $$, esc, AR } = A;
  A.I.pmsg = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="3"/><path d="M2 20c0-3.3 2.7-6 6-6"/><path d="M22 12a5 5 0 0 1-7.4 4.4L11 17.5l1.1-3.4A5 5 0 1 1 22 12z"/></svg>';
  if (A.NOTIF_KINDS && !A.NOTIF_KINDS.parent) A.NOTIF_KINDS.parent = ['أولياء الأمور', 'رسائل أولياء الأمور وأعذارهم والتقارير بانتظار الاعتماد'];
  const isMgr = () => !!(S.me && (S.me.is_owner || (A.hasModule && ['attendance', 'supervision', 'counselor'].some(k => A.hasModule(k)))));
  const on = () => !!(S.me && (S.me.is_owner || (A.tfeat && A.tfeat('pmsg'))));
  if (A.NAV && !A.NAV.some(n => n[0] === 'pmsg')) { const i = A.NAV.findIndex(n => n[0] === 'stucodes'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['pmsg', 'أولياء الأمور', () => on()]); }
  const ERR = { 'no permission': 'ليست لديك صلاحية', NO_ACCOUNT: 'ولي أمر هذا الطالب لم يفعّل حسابه في البوابة بعد', EMPTY: 'اكتب الرسالة أولاً', NO_QUESTIONS: 'اختر أسئلة من البنك (المشتركة أو أسئلتك)' };
  const KREP = [['report', 'تقرير'], ['results', 'نتائج'], ['certificate', 'شهادة'], ['note', 'ملاحظة']];
  const KP = [['practice', 'تدريب تفاعلي 🎯'], ['mock', 'اختبار تجريبي 📝'], ['review', 'مراجعة بالحلول 📗'], ['booklet', 'كراسة تدريب 📘']];
  const QT = { mcq: 'اختيار', multi: 'متعدد', tf: 'صواب/خطأ', short: 'قصير', blank: 'فراغات', match: 'مزاوجة', order: 'ترتيب', essay: 'مقالي' };
  const ST = { pending: ['بانتظار الاعتماد', 'st-draft'], published: ['منشور', 'st-approved'], rejected: ['مسحوب / مرفوض', 'st-returned'], accepted: ['مقبول', 'st-approved'] };
  const EXK = { medical: 'طبي', family: 'عائلي', other: 'آخر' };
  const fmt = d => d ? (A.fmtDT ? A.fmtDT(d) : new Date(d).toLocaleString('ar-SA')) : '';
  const adate = d => { try { return new Date(d + 'T12:00:00').toLocaleDateString('ar-SA', { weekday: 'short', day: 'numeric', month: 'short' }); } catch (_) { return d; } };
  const cls = () => (S.allClasses || S.classes || []).filter(c => c.active !== false).slice().sort(A.cmpCls || (() => 0));
  const gk = c => c ? `${c.stage}|${c.grade_word}` : '';

  /* وضع التجربة: محاكاة في الذاكرة */
  const DM = { msgs: [], reps: [], prac: [], exc: [] };
  async function demo(n, a) {
    const me = S.me.id, stu = await api.list('students', {});
    if (n === 'pmsg_inbox') { const g = {}; DM.msgs.filter(x => x.staff === me).forEach(x => { (g[x.acc] = g[x.acc] || []).push(x); }); return Object.entries(g).map(([k, l]) => ({ account: k, parent: 'ولي أمر ' + ((stu.find(s => s.id === l[0].kid) || {}).full_name || '').split(' ')[0], kids: (stu.find(s => s.id === l[0].kid) || {}).full_name, last: l[l.length - 1].body, last_at: l[l.length - 1].at, unread: l.filter(x => x.fp && !x.read).length })); }
    if (n === 'pmsg_thread') { DM.msgs.filter(x => x.acc === a.p_account && x.staff === me && x.fp).forEach(x => x.read = 1); const l = DM.msgs.filter(x => x.acc === a.p_account && x.staff === me); const k = stu.find(s => s.id === (l[0] || {}).kid) || {}; return { parent: 'ولي أمر ' + (k.full_name || '').split(' ')[0], kids: [{ id: k.id, name: k.full_name }], msgs: l.map(x => ({ id: x.id, me: !x.fp, body: x.body, at: x.at, read: !!x.read })) }; }
    if (n === 'pmsg_send') { const acc = a.p_account || 'acc-' + a.p_student; DM.msgs.push({ id: Math.random().toString(36).slice(2), acc, staff: me, kid: a.p_student || (DM.msgs.find(x => x.acc === acc) || {}).kid, fp: false, body: a.p_body, at: new Date().toISOString() }); return { ok: true, account: acc }; }
    if (n === 'preport_send') { (a.p_items || []).forEach(it => DM.reps.push({ id: Math.random().toString(36).slice(2), student_id: it.student, kind: it.kind, title: it.title, html: it.html, status: isMgr() ? 'published' : 'pending', created_by: me, created_at: new Date().toISOString() })); return { sent: a.p_items.length, published: isMgr() }; }
    if (n === 'preport_decide') { DM.reps.filter(r => a.p_ids.includes(r.id)).forEach(r => r.status = a.p_publish ? 'published' : 'rejected'); return a.p_ids.length; }
    if (n === 'preport_del') { const r = DM.reps.find(r => r.id === a.p_id); if (r) r.status = 'rejected'; return null; }
    if (n === 'ppractice_save') { const id = Math.random().toString(36).slice(2); DM.prac.push({ id, kind: a.p_kind, title: a.p_title, subject_id: a.p_subject, grade_key: a.p_grade, class_ids: a.p_classes, question_ids: a.p_qids, status: isMgr() ? 'published' : 'pending', created_by: me, created_at: new Date().toISOString() }); return { id, published: isMgr(), n: a.p_qids.length }; }
    if (n === 'ppractice_decide') { DM.prac.filter(r => a.p_ids.includes(r.id)).forEach(r => r.status = a.p_publish ? 'published' : 'rejected'); return a.p_ids.length; }
    if (n === 'ppractice_del') { const r = DM.prac.find(r => r.id === a.p_id); if (r) r.status = 'rejected'; return null; }
    if (n === 'excuse_list') return DM.exc.filter(e => a.p_status === 'all' || e.status === a.p_status);
    if (n === 'excuse_decide') { const e = DM.exc.find(e => e.id === a.p_id); e.status = a.p_accept ? 'accepted' : 'rejected'; e.reply = a.p_reply; return { days: a.p_accept ? e.absent : 0, periods: 0 }; }
    if (n === 'excuse_file') return { name: 'تقرير.png', type: 'image/png', b64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' };
    return null;
  }
  A.__famDemo = DM;
  const rpc = async (n, a) => { if (api.demo) return demo(n, a); try { const r = await api.rpc(n, a); if (r && r.error) throw new Error(ERR[r.error] || r.error); return r; } catch (e) { throw new Error(ERR[e.message] || e.message); } };
  const tbl = async (t, o) => api.demo ? (t === 'parent_reports' ? DM.reps : DM.prac).slice().reverse() : api.list(t, {}, o);

  /** إرسال تقارير لأولياء الأمور من أي وحدة: items = [{student, title, kind, html}] */
  A.sendToParents = items => rpc('preport_send', { p_items: items });

  if (!document.getElementById('fscss')) { const st = document.createElement('style'); st.id = 'fscss'; st.textContent = `
.fs-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}
.fs-tabs button{font:inherit;font-weight:800;border:1.5px solid #C9D7EC;background:#fff;color:#005499;border-radius:999px;padding:8px 16px;cursor:pointer;min-height:44px}
.fs-tabs button[aria-selected="true"]{background:#082B5A;color:#fff;border-color:#082B5A}
.fs-chat{display:grid;grid-template-columns:320px 1fr;gap:12px;min-height:440px}
@media (max-width:860px){.fs-chat{grid-template-columns:1fr}.fs-chat.open .fs-in{display:none}.fs-chat:not(.open) .fs-cv{display:none}}
.fs-in .c{display:flex;gap:10px;align-items:center;width:100%;border:1px solid #DCE7F3;background:#fff;border-radius:16px;padding:10px;margin-bottom:8px;cursor:pointer;text-align:start;font:inherit;color:inherit;min-height:58px}
.fs-in .c[aria-current="true"]{border-color:#082B5A;background:#EEF5FD}
.fs-in .c .x{min-width:0;flex:1}.fs-in .c b,.fs-in .c .lst{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fs-in .c .n{background:#e2463b;color:#fff;border-radius:99px;font-size:11px;min-width:20px;height:20px;display:inline-grid;place-items:center;padding:0 5px}
.fs-cv{display:flex;flex-direction:column;border:1px solid #DCE7F3;border-radius:18px;background:linear-gradient(180deg,#f7fafe,#eef3fa);overflow:hidden;min-height:440px}
.fs-cv .hd{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#fff;border-bottom:1px solid #DCE7F3}
.fs-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;max-height:56vh}
.fs-b{max-width:82%;border-radius:18px;padding:8px 12px;white-space:pre-wrap;word-break:break-word;box-shadow:0 1px 2px rgba(8,43,90,.1)}
.fs-b.me{align-self:flex-start;background:linear-gradient(180deg,#0a72c4,#005499);color:#fff;border-end-start-radius:6px}
.fs-b.them{align-self:flex-end;background:#fff;border:1px solid #DCE7F3;border-end-end-radius:6px}
.fs-b small{display:block;font-size:11px;opacity:.75;margin-top:2px}
.fs-comp{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #DCE7F3;align-items:flex-end}
.fs-comp textarea{flex:1;min-height:48px;max-height:140px}
.fs-box{border:1px solid #DCE7F3;border-radius:16px;padding:14px;background:linear-gradient(180deg,#fff,#F5F9FD);margin-bottom:12px}
.fs-box h3{margin:0 0 8px;color:#082B5A;font-size:16px}
.fs-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
.fs-pick{max-height:320px;overflow:auto;border:1px solid #DCE7F3;border-radius:12px;background:#fff}
.fs-pick label{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-bottom:1px solid #EEF2F8;cursor:pointer}
.fs-pick label:last-child{border-bottom:0}.fs-pick input{width:18px;height:18px;flex:none;margin-top:4px;accent-color:#005499}
.fs-row{display:flex;align-items:center;gap:10px;border:1px solid #DCE7F3;border-radius:14px;padding:10px 12px;margin-bottom:8px;background:#fff;flex-wrap:wrap}
.fs-row .x{flex:1;min-width:200px}
.fs-note{border:1px solid #bfe0f1;background:#eef8fd;color:#0b4f72;border-radius:14px;padding:10px 12px;font-size:13.5px;margin:0 0 12px}
`; document.head.appendChild(st); }

  const TABS = () => [['msgs', 'الرسائل'], ['reps', 'التقارير'], ['prac', 'التدريب'], ...(isMgr() ? [['exc', 'الأعذار']] : [])];
  let tab = null, poll = null;
  V.pmsg = async function (root) {
    if (!on()) { root.innerHTML = `<div class="card">${A.emptyBox('غير متاح لحسابك')}</div>`; return; }
    tab = tab || A.LS.get('fs_t') || 'msgs'; if (!TABS().some(t => t[0] === tab)) tab = 'msgs';
    clearInterval(poll);
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">أولياء الأمور</h2><p class="sub" style="margin:2px 0 0">تواصل خاص مع أولياء أمور طلابك، وإرسال التقارير والتدريبات لبوابة ولي الأمر${isMgr() ? '، ومراجعة الأعذار' : ''}.</p></div></div>
      <div class="fs-tabs" role="tablist">${TABS().map(([k, n]) => `<button role="tab" data-ft="${k}" aria-selected="${k === tab}">${n}</button>`).join('')}</div><div id="fsB"></div></div>`;
    $$('[data-ft]', root).forEach(b => b.onclick = () => { tab = b.dataset.ft; A.LS.set('fs_t', tab); V.pmsg(root); });
    const B = $('#fsB', root);
    ({ msgs, reps, prac, exc })[tab](B);
  };

  /* ---------- الرسائل ---------- */
  let cur = null;
  async function msgs(B) {
    B.innerHTML = `<div class="fs-note">🔒 الرسائل خاصة بينك وبين ولي الأمر فقط — لا يطّلع عليها أي موظف آخر ولا الإدارة.</div>
      <div class="row" style="gap:8px;margin-bottom:10px"><input class="in" id="fsQ" placeholder="بحث باسم ولي الأمر أو الطالب" style="flex:1;min-width:180px"><button class="btn ok" id="fsNew">رسالة جديدة لولي أمر</button></div>
      <div class="fs-chat ${cur ? 'open' : ''}"><div class="fs-in" id="fsIn"><div class="spinner"></div></div><div class="fs-cv" id="fsCv">${cur ? '<div class="spinner"></div>' : `<div style="margin:auto">${A.emptyBox('اختر محادثة')}</div>`}</div></div>`;
    let L = [];
    const paintIn = () => { const q = A.normKey($('#fsQ', B).value.trim()), l = L.filter(t => !q || A.normKey(`${t.parent} ${t.kids}`).includes(q));
      $('#fsIn', B).innerHTML = l.map(t => `<button class="c" data-acc="${t.account}" aria-current="${t.account === cur}"><span class="x"><b>${esc(t.parent)}</b><span class="small muted lst">${esc(t.kids || '')}</span><span class="small lst">${esc(t.last || '')}</span></span>${+t.unread ? `<span class="n">${AR(t.unread)}</span>` : `<span class="small muted">${esc(fmt(t.last_at))}</span>`}</button>`).join('') || A.emptyBox(L.length ? 'لا نتائج' : 'لا توجد محادثات بعد', L.length ? '' : 'تصلك هنا رسائل أولياء الأمور من البوابة.');
      $$('[data-acc]', B).forEach(b => b.onclick = () => { cur = b.dataset.acc; msgs(B); }); };
    const loadIn = async () => { try { L = await rpc('pmsg_inbox', {}) || []; } catch (e) { $('#fsIn', B).innerHTML = A.emptyBox('تعذّر التحميل', esc(e.message)); return; } paintIn(); };
    $('#fsQ', B).oninput = paintIn;
    $('#fsNew', B).onclick = newMsg;
    await loadIn();
    if (cur) thread($('#fsCv', B), loadIn);
    poll = setInterval(() => { if (document.visibilityState === 'visible' && document.body.contains(B)) { loadIn(); } else if (!document.body.contains(B)) clearInterval(poll); }, 30000);
  }
  async function thread(cv, refresh) {
    let T; try { T = await rpc('pmsg_thread', { p_account: cur }); } catch (e) { cv.innerHTML = A.emptyBox('تعذّر التحميل', esc(e.message)); return; }
    const kids = T.kids || [];
    cv.innerHTML = `<div class="hd"><button class="btn ghost sm" id="fsBk" aria-label="رجوع">→</button><div style="flex:1;min-width:0"><b>${esc(T.parent)}</b><div class="small muted">${kids.map(k => esc(k.name) + (k.class ? ' · ' + esc(k.class) : '')).join('، ')}</div></div></div>
      <div class="fs-msgs" role="log">${T.msgs.map(x => `<div class="fs-b ${x.me ? 'me' : 'them'}">${esc(x.body)}<small>${x.kid ? 'بخصوص ' + esc(x.kid) + ' · ' : ''}${esc(fmt(x.at))}${x.me ? (x.read ? ' · قُرئت ✓✓' : ' · أُرسلت ✓') : ''}</small></div>`).join('')}</div>
      <form class="fs-comp" id="fsF">${kids.length > 1 ? `<select class="in" id="fsK" style="width:auto" aria-label="بخصوص">${kids.map(k => `<option value="${k.id}">${esc(k.name.split(' ')[0])}</option>`).join('')}</select>` : ''}<textarea class="in" id="fsT" maxlength="4000" placeholder="اكتب ردك… (Ctrl+Enter للإرسال)" aria-label="الرد"></textarea><button class="btn" id="fsS">إرسال</button></form>`;
    const mb = $('.fs-msgs', cv); mb.scrollTop = mb.scrollHeight;
    $('#fsBk', cv).onclick = () => { cur = null; const r = cv.closest('#fsB'); msgs(r); };
    const t = $('#fsT', cv); t.onkeydown = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('#fsF', cv).requestSubmit(); };
    $('#fsF', cv).onsubmit = e => { e.preventDefault(); const body = t.value.trim(); if (!body) return; A.run($('#fsS', cv), async () => { await rpc('pmsg_send', { p_account: cur, p_student: ($('#fsK', cv) || {}).value || (kids[0] || {}).id || null, p_body: body }); await thread(cv, refresh); refresh && refresh(); }); };
  }
  function newMsg() {
    const C = cls();
    const m = A.modal(`<h3>رسالة جديدة لولي أمر</h3><p class="sub">تصل لولي الأمر في البوابة إن كان قد فعّل حسابه.</p>
      <div class="fs-grid"><label class="small">الفصل <select class="in" id="nmC">${C.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label><label class="small">الطالب <select class="in" id="nmS"></select></label></div>
      <label class="small" style="display:block;margin-top:8px">الرسالة <textarea class="in" id="nmT" rows="5" maxlength="4000"></textarea></label>
      <div class="row" style="margin-top:10px;gap:8px"><button class="btn ok" id="nmGo">إرسال</button></div>`, { cls: 'wide' });
    const fill = async () => { const l = await api.list('students', { class_id: $('#nmC', m.el).value }); $('#nmS', m.el).innerHTML = l.filter(s => s.active !== false).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar')).map(s => `<option value="${s.id}">${esc(s.full_name)}</option>`).join(''); };
    $('#nmC', m.el).onchange = fill; fill();
    $('#nmGo', m.el).onclick = e => A.run(e.currentTarget, async () => { const body = $('#nmT', m.el).value.trim(); if (!body) throw new Error(ERR.EMPTY); const r = await rpc('pmsg_send', { p_account: null, p_student: $('#nmS', m.el).value, p_body: body }); m.close(); cur = r.account; A.toast('أُرسلت', 'ok'); const B = $('#fsB'); if (B) msgs(B); });
  }

  /* ---------- التقارير ---------- */
  async function reps(B) {
    const C = cls(), d30 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    B.innerHTML = `<div class="fs-box"><h3>إرسال تقرير لأولياء الأمور</h3>${!isMgr() && (((S.school || {}).settings || {}).portal || {}).approve !== false ? '<p class="small muted" style="margin:0 0 8px">تُعرض على الإدارة للاعتماد قبل ظهورها لولي الأمر.</p>' : ''}
      <div class="fs-grid"><label class="small">الفصل <select class="in" id="rC">${C.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>
        <label class="small">النوع <select class="in" id="rK">${KREP.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <label class="small">العنوان <input class="in" id="rT" placeholder="مثال: تقرير الأداء الشهري"></label></div>
      <label class="small" style="display:block;margin-top:8px">نص التقرير (يُكتب مرة ويصل لكل طالب محدد باسمه) <textarea class="in" id="rB" rows="5" placeholder="السلام عليكم ولي أمر الطالب {الاسم}…"></textarea></label>
      <div class="small muted">اكتب <code>{الاسم}</code> ليُستبدل باسم الطالب.</div>
      <label class="row small" style="margin-top:8px;gap:6px"><input type="checkbox" id="rA" checked> إرفاق ملخص حضور كل طالب منذ <input class="in" type="date" id="rD" value="${d30}" style="width:auto"></label>
      <div class="row" style="margin:10px 0 6px;gap:8px"><b class="small">الطلاب</b><button class="btn ghost sm" id="rAll">تحديد الكل</button><button class="btn ghost sm" id="rNone">إلغاء التحديد</button></div>
      <div class="fs-pick" id="rS"><div class="spinner"></div></div>
      <div class="row" style="margin-top:10px;gap:8px"><button class="btn ghost" id="rPv">معاينة</button><button class="btn ok" id="rGo">إرسال</button></div></div>
      <div id="rL"><div class="spinner"></div></div>`;
    let stu = [];
    const loadS = async () => { stu = (await api.list('students', { class_id: $('#rC', B).value })).filter(s => s.active !== false).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
      $('#rS', B).innerHTML = stu.map(s => `<label><input type="checkbox" value="${s.id}" checked><span>${esc(s.full_name)}</span></label>`).join('') || A.emptyBox('لا طلاب'); };
    $('#rC', B).onchange = loadS; await loadS();
    $('#rAll', B).onclick = () => $$('#rS input', B).forEach(i => i.checked = true); $('#rNone', B).onclick = () => $$('#rS input', B).forEach(i => i.checked = false);
    const build = async ids => {
      const txt = $('#rB', B).value.trim(), from = $('#rD', B).value, withA = $('#rA', B).checked;
      let att = []; if (withA) { try { att = await api.list('attendance', { class_id: $('#rC', B).value }, { gte: { day: from } }); } catch (_) { att = []; } }
      const L = { absent: 'غائب', late: 'متأخر', excused: 'مستأذن' };
      return ids.map(id => { const s = stu.find(x => x.id === id), mine = att.filter(a => a.student_id === id), bad = mine.filter(a => a.status !== 'present').sort((a, b) => a.day < b.day ? -1 : 1);
        const p = esc(txt.split('{الاسم}').join(s.full_name)).split(/\n{2,}/).map(x => `<p>${x.replace(/\n/g, '<br>')}</p>`).join('');
        const a = withA ? `<h2>الحضور منذ ${esc(adate(from))}</h2><table><tr><th>حاضر</th><th>غائب</th><th>متأخر</th><th>مستأذن</th></tr><tr><td>${AR(mine.filter(x => x.status === 'present').length)}</td><td>${AR(mine.filter(x => x.status === 'absent').length)}</td><td>${AR(mine.filter(x => x.status === 'late').length)}</td><td>${AR(mine.filter(x => x.status === 'excused').length)}</td></tr></table>${bad.length ? `<p>${bad.map(x => esc(adate(x.day)) + ': ' + (L[x.status] || x.status)).join(' · ')}</p>` : ''}` : '';
        return { student: id, kind: $('#rK', B).value, title: $('#rT', B).value.trim() || 'تقرير', html: `<p><b>الطالب:</b> ${esc(s.full_name)}</p>${p}${a}<p style="margin-top:16px;color:#56657f">${esc(S.me.full_name || '')}</p>` }; });
    };
    const sel = () => $$('#rS input:checked', B).map(i => i.value);
    $('#rPv', B).onclick = e => A.run(e.currentTarget, async () => { const ids = sel(); if (!ids.length) throw new Error('اختر طالباً'); const [it] = await build(ids.slice(0, 1)); A.modal(`<h3>${esc(it.title)}</h3><div style="border:1px solid #DCE7F3;border-radius:12px;padding:12px;max-height:60vh;overflow:auto">${it.html}</div>`, { cls: 'wide' }); });
    $('#rGo', B).onclick = e => A.run(e.currentTarget, async () => { const ids = sel(); if (!ids.length) throw new Error('اختر طالباً'); if (!$('#rB', B).value.trim() && !$('#rA', B).checked) throw new Error('اكتب نص التقرير');
      if (!(await A.confirmBox(`إرسال «${esc($('#rT', B).value.trim() || 'تقرير')}» لأولياء أمور ${AR(ids.length)} طالب؟`, 'إرسال'))) return;
      const r = await rpc('preport_send', { p_items: await build(ids) }); A.toast(r.published ? `نُشر ${AR(r.sent)} تقرير` : `أُرسل ${AR(r.sent)} تقرير للاعتماد`, 'ok'); list(); });
    const list = async () => {
      const box = $('#rL', B); let R = [], names = {};
      try { R = await tbl('parent_reports', { order: 'created_at', desc: true, select: 'id,student_id,kind,title,status,created_by,created_at,seen_at,approved_at' }); const st = await api.list('students', {}, { select: 'id,full_name' }); st.forEach(s => names[s.id] = s.full_name); } catch (e) { box.innerHTML = A.emptyBox('تعذّر التحميل', esc(e.message)); return; }
      const pend = R.filter(r => r.status === 'pending'), done = R.filter(r => r.status !== 'pending').slice(0, 200);
      const row = (r, chk) => `<div class="fs-row">${chk ? `<input type="checkbox" class="rq" value="${r.id}" aria-label="تحديد">` : ''}<div class="x"><b>${esc(r.title)}</b><div class="small muted">${esc(names[r.student_id] || '')} · ${esc(fmt(r.created_at))} · ${esc(A.personName ? A.personName(r.created_by) : '')}</div></div><span class="pill ${ST[r.status][1]}">${ST[r.status][0]}</span>${r.status === 'published' ? `<span class="small ${r.seen_at ? '' : 'muted'}">${r.seen_at ? 'اطّلع ✓' : 'لم يطّلع'}</span><button class="btn ghost sm" data-wd="${r.id}">سحب</button>` : ''}</div>`;
      box.innerHTML = `${isMgr() && pend.length ? `<div class="fs-box"><h3>بانتظار الاعتماد (${AR(pend.length)})</h3>${pend.map(r => row(r, true)).join('')}<div class="row" style="gap:8px"><button class="btn ok" id="rPub">اعتماد المحدد</button><button class="btn ghost" id="rRej">رفض المحدد</button><button class="btn ghost sm" id="rPA">تحديد الكل</button></div></div>` : ''}
        <div class="fs-box"><h3>${isMgr() ? 'التقارير المرسلة' : 'تقاريري'}</h3>${(isMgr() ? done : R).map(r => row(r, false)).join('') || A.emptyBox('لا تقارير بعد')}</div>`;
      const dec = pub => A.run(null, async () => { const ids = $$('.rq:checked', box).map(i => i.value); if (!ids.length) throw new Error('حدد تقريراً'); await rpc('preport_decide', { p_ids: ids, p_publish: pub }); A.toast('تم', 'ok'); list(); });
      if ($('#rPub', box)) { $('#rPub', box).onclick = () => dec(true); $('#rRej', box).onclick = () => dec(false); $('#rPA', box).onclick = () => $$('.rq', box).forEach(i => i.checked = true); }
      $$('[data-wd]', box).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('سحب التقرير من بوابة ولي الأمر؟', 'سحب', true))) return; A.run(b, async () => { await rpc('preport_del', { p_id: b.dataset.wd }); list(); }); });
    };
    list();
  }

  /* ---------- التدريب ---------- */
  async function prac(B) {
    const C = cls(), grades = [...new Map(C.map(c => [gk(c), c])).values()], subs = (S.subjects || []).slice().sort((a, b) => A.cmpSubj ? A.cmpSubj(a.id, b.id) : a.name.localeCompare(b.name, 'ar'));
    B.innerHTML = `<div class="fs-box"><h3>نشر تدريب لأولياء الأمور</h3><p class="small muted" style="margin:0 0 8px">من أسئلتك أو الأسئلة المشتركة في بنك المدرسة. يحلّها الطالب في البوابة ويرى التصحيح فوراً (لا تُرصد).</p>
      <div class="fs-grid"><label class="small">النوع <select class="in" id="pK">${KP.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
        <label class="small">العنوان <input class="in" id="pT" placeholder="مثال: مراجعة الوحدة الثانية"></label>
        <label class="small">المادة <select class="in" id="pS">${subs.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></label>
        <label class="small">الصف <select class="in" id="pG">${grades.map(c => `<option value="${esc(gk(c))}">${esc(A.gradeName ? A.gradeName(c.grade_word, c.stage) : c.grade_word + ' ' + c.stage)}</option>`).join('')}</select></label></div>
      <div class="small" style="margin-top:8px"><b>الفصول</b> <span class="muted">(بلا تحديد = كل فصول الصف)</span></div><div class="row" id="pC" style="gap:10px;flex-wrap:wrap;margin-top:4px"></div>
      <div class="row" style="margin:10px 0 6px;gap:8px"><input class="in" id="pQ" placeholder="بحث في الأسئلة" style="flex:1;min-width:160px"><button class="btn ghost sm" id="pAll">تحديد الظاهر</button><button class="btn ghost sm" id="pNone">إلغاء</button><span class="small" id="pN"></span></div>
      <div class="fs-pick" id="pL"><div class="spinner"></div></div>
      <div class="row" style="margin-top:10px"><button class="btn ok" id="pGo">نشر</button></div></div><div id="pX"><div class="spinner"></div></div>`;
    let Q = [], picked = new Set();
    const cnt = () => $('#pN', B).textContent = `المحدد: ${AR(picked.size)}`;
    const paintQ = () => { const q = A.normKey($('#pQ', B).value.trim()), l = Q.filter(x => !q || A.normKey(x.body || '').includes(q));
      $('#pL', B).innerHTML = l.map(x => `<label><input type="checkbox" value="${x.id}" ${picked.has(x.id) ? 'checked' : ''}><span><span class="pill">${QT[x.qtype] || x.qtype}</span> ${esc(String(x.body || '').slice(0, 160))}${x.shared ? '' : ' <span class="small muted">(خاص بك)</span>'}</span></label>`).join('') || A.emptyBox('لا أسئلة لهذه المادة والصف', 'أضف أسئلة في بنك الأسئلة أو اجعلها «مشتركة».');
      $$('#pL input', B).forEach(i => i.onchange = () => { i.checked ? picked.add(i.value) : picked.delete(i.value); cnt(); }); cnt(); };
    const loadQ = async () => { picked = new Set(); $('#pL', B).innerHTML = '<div class="spinner"></div>';
      const g = $('#pG', B).value; $('#pC', B).innerHTML = C.filter(c => gk(c) === g).map(c => `<label class="row small" style="gap:4px"><input type="checkbox" value="${c.id}">${esc(c.name)}</label>`).join('');
      try { Q = (await api.list('questions', { subject_id: $('#pS', B).value, grade_key: g })).filter(x => x.shared || x.created_by === S.me.id || isMgr()); } catch (e) { Q = []; } paintQ(); };
    $('#pS', B).onchange = loadQ; $('#pG', B).onchange = loadQ; $('#pQ', B).oninput = paintQ; await loadQ();
    $('#pAll', B).onclick = () => { $$('#pL input', B).forEach(i => { i.checked = true; picked.add(i.value); }); cnt(); };
    $('#pNone', B).onclick = () => { picked.clear(); $$('#pL input', B).forEach(i => i.checked = false); cnt(); };
    $('#pGo', B).onclick = e => A.run(e.currentTarget, async () => { if (!picked.size) throw new Error(ERR.NO_QUESTIONS); const kind = $('#pK', B).value;
      const ids = Q.filter(x => picked.has(x.id)).map(x => x.id);
      const r = await rpc('ppractice_save', { p_id: null, p_kind: kind, p_title: $('#pT', B).value.trim() || (KP.find(k => k[0] === kind) || [])[1], p_subject: $('#pS', B).value, p_grade: $('#pG', B).value, p_classes: $$('#pC input:checked', B).map(i => i.value), p_qids: ids, p_settings: {} });
      A.toast(r.published ? `نُشر (${AR(r.n)} سؤال)` : 'أُرسل للاعتماد', 'ok'); picked.clear(); paintQ(); list(); });
    const list = async () => {
      const box = $('#pX', B); let R = [];
      try { R = await tbl('parent_practice', { order: 'created_at', desc: true }); } catch (e) { box.innerHTML = A.emptyBox('تعذّر التحميل', esc(e.message)); return; }
      const mine = R.filter(r => isMgr() || r.created_by === S.me.id);
      box.innerHTML = `<div class="fs-box"><h3>التدريبات المنشورة</h3>${mine.map(r => `<div class="fs-row"><div class="x"><b>${esc(r.title)}</b><div class="small muted">${(KP.find(k => k[0] === r.kind) || [, r.kind])[1]} · ${esc(A.subjName ? A.subjName(r.subject_id) : '')} · ${AR((r.question_ids || []).length)} سؤال · ${esc(fmt(r.created_at))}${isMgr() ? ' · ' + esc(A.personName ? A.personName(r.created_by) : '') : ''}</div></div><span class="pill ${ST[r.status][1]}">${ST[r.status][0]}</span>
        ${isMgr() && r.status === 'pending' ? `<button class="btn ok sm" data-pp="${r.id}">اعتماد</button><button class="btn ghost sm" data-pr="${r.id}">رفض</button>` : ''}${r.status === 'published' ? `<button class="btn ghost sm" data-pw="${r.id}">سحب</button>` : ''}</div>`).join('') || A.emptyBox('لا تدريبات بعد')}</div>`;
      $$('[data-pp]', box).forEach(b => b.onclick = () => A.run(b, async () => { await rpc('ppractice_decide', { p_ids: [b.dataset.pp], p_publish: true }); list(); }));
      $$('[data-pr]', box).forEach(b => b.onclick = () => A.run(b, async () => { await rpc('ppractice_decide', { p_ids: [b.dataset.pr], p_publish: false }); list(); }));
      $$('[data-pw]', box).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('سحب التدريب من بوابة ولي الأمر؟', 'سحب', true))) return; A.run(b, async () => { await rpc('ppractice_del', { p_id: b.dataset.pw }); list(); }); });
    };
    list();
  }

  /* ---------- الأعذار ---------- */
  let exSt = 'pending';
  async function exc(B) {
    B.innerHTML = `<div class="fs-note">المرفقات (التقارير الطبية) سرية: لا تظهر إلا للمالك وصلاحيات الحضور والإشراف والإرشاد. القبول يحوّل غياب الأيام المحددة إلى «مستأذن» (اليومي والحصص).</div>
      <div class="row" style="gap:6px;margin-bottom:10px">${[['pending', 'بانتظار المراجعة'], ['accepted', 'المقبولة'], ['rejected', 'المرفوضة'], ['all', 'الكل']].map(([k, n]) => `<button class="btn ${k === exSt ? '' : 'ghost'} sm" data-es="${k}">${n}</button>`).join('')}</div><div id="eL"><div class="spinner"></div></div>`;
    $$('[data-es]', B).forEach(b => b.onclick = () => { exSt = b.dataset.es; exc(B); });
    let L = []; try { L = await rpc('excuse_list', { p_status: exSt }) || []; } catch (e) { $('#eL', B).innerHTML = A.emptyBox('تعذّر التحميل', esc(e.message)); return; }
    $('#eL', B).innerHTML = L.map(e => `<div class="fs-box"><div class="row" style="justify-content:space-between;gap:8px"><div><b>${esc(e.student)}</b> <span class="small muted">· ${esc(e.class || '')} · ولي الأمر: ${esc(e.parent || '')}</span></div><span class="pill ${(ST[e.status] || ST.pending)[1]}">${e.status === 'pending' ? 'قيد المراجعة' : e.status === 'accepted' ? 'مقبول' : 'مرفوض'}</span></div>
      <div class="small" style="margin:6px 0">عذر <b>${EXK[e.kind] || ''}</b> · ${esc(adate(e.from))}${e.to !== e.from ? ' — ' + esc(adate(e.to)) : ''} · أيام غياب مسجّلة في الفترة: <b>${AR(e.absent)}</b> · قُدّم ${esc(fmt(e.at))}</div>
      ${e.note ? `<div style="white-space:pre-wrap;background:#fff;border:1px solid #DCE7F3;border-radius:10px;padding:6px 10px">${esc(e.note)}</div>` : ''}
      <div class="row" style="gap:8px;margin-top:8px">${e.file ? `<button class="btn ghost sm" data-ef="${e.id}">📎 عرض المرفق (${esc(e.file)})</button>` : '<span class="small muted">بلا مرفق</span>'}</div>
      ${e.status === 'pending' ? `<label class="small" style="display:block;margin-top:8px">رد لولي الأمر (اختياري) <input class="in" data-er="${e.id}" maxlength="300"></label><div class="row" style="gap:8px;margin-top:8px"><button class="btn ok sm" data-ea="${e.id}">قبول العذر</button><button class="btn ghost sm" data-ej="${e.id}">رفض</button></div>` : `<div class="small muted" style="margin-top:6px">${e.by ? 'بواسطة ' + esc(e.by) + ' · ' : ''}${esc(fmt(e.decided_at))}${e.reply ? ' · الرد: ' + esc(e.reply) : ''}</div>`}</div>`).join('') || A.emptyBox(exSt === 'pending' ? 'لا أعذار بانتظار المراجعة' : 'لا يوجد');
    $$('[data-ef]', B).forEach(b => b.onclick = () => A.run(b, async () => { const f = await rpc('excuse_file', { p_id: b.dataset.ef }); if (!f) throw new Error('لا مرفق');
      const bin = atob(f.b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); const url = URL.createObjectURL(new Blob([u8], { type: f.type }));
      if (/^image\//.test(f.type)) A.modal(`<h3>${esc(f.name || 'المرفق')}</h3><img src="${url}" alt="مرفق العذر" style="max-width:100%;border-radius:12px"><div class="row" style="margin-top:8px"><a class="btn ghost" href="${url}" download="${esc(f.name || 'excuse')}">تنزيل</a></div>`, { cls: 'wide' });
      else { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.download = f.name || 'excuse.pdf'; a.click(); } }));
    const dec = (b, ok) => A.run(b, async () => { const id = ok ? b.dataset.ea : b.dataset.ej, reply = ($(`[data-er="${id}"]`, B) || {}).value || '';
      if (!ok && !(await A.confirmBox('رفض العذر؟ يصل الرفض لولي الأمر' + (reply ? ' مع ردك' : '') + '.', 'رفض', true))) return;
      const r = await rpc('excuse_decide', { p_id: id, p_accept: ok, p_reply: reply }); A.toast(ok ? `قُبل — حُوّل ${AR(r.days)} يوم و${AR(r.periods)} حصة إلى «مستأذن»` : 'رُفض', 'ok'); exc(B); });
    $$('[data-ea]', B).forEach(b => b.onclick = () => dec(b, true)); $$('[data-ej]', B).forEach(b => b.onclick = () => dec(b, false));
  }
})();
