/* منصة دينا — الإرشاد الطلابي
   - «إحالة إلى الموجه» لكل معلم ومراقب دور: إحالة سريعة بالأولوية والإجراء السابق، و«إحالاتي» بحالتها وردّ الموجه.
   - «الإرشاد الطلابي» للموجه الطلابي والمالك: الوارد، الحالات (دراسة/متابعة/مغلقة)، ملف الحالة بسجل إجراءات
     (مع ملاحظات سرية ومواعيد متابعة)، ملف الطالب الشامل، والتقارير.
   السرية والصلاحيات تفرضها قاعدة البيانات (counsel_cases/counsel_actions للموجه والمالك فقط،
   والمُحيل لا يغيّر الحالة ولا ردّ الموجه). */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  const isC = () => !!(S.me && A.hasModule && A.hasModule('counselor'));
  const isD = () => !!(S.me && A.hasModule && A.hasModule('deputy'));
  // جهة الإحالة: الموجه الطلابي (الافتراضي) أو الوكيل
  const TO = { counselor: ['الموجه الطلابي', '🧭'], deputy: ['الوكيل', '🏫'] };
  const toOf = r => (r && r.target) === 'deputy' ? 'deputy' : 'counselor';
  const today = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const dt = d => d ? (A.arDate ? A.arDate(String(d).slice(0, 10)) : String(d).slice(0, 10)) : '—';
  const nm = id => (A.personName && A.personName(id)) || '—';
  const role = id => { const p = (S.staff || []).find(x => x.id === id) || {}; return p.title || (p.is_owner ? 'المالك' : 'معلم'); };
  const TYPES = { behavior: ['سلوكية', ['إزعاج داخل الفصل', 'عدم الالتزام بتعليمات المعلم', 'ألفاظ غير لائقة', 'إيذاء زميل أو تنمّر', 'شجار', 'استخدام الجوال', 'الخروج من الحصة دون إذن', 'إتلاف ممتلكات', 'عدم الالتزام بالزي', 'التأخر عن الحصص', 'أخرى']],
    academic: ['دراسية', ['تراجع ملحوظ في المستوى', 'عدم أداء الواجبات المتكرر', 'ضعف التركيز والانتباه', 'صعوبات تعلّم محتملة', 'أخرى']],
    social: ['نفسية واجتماعية', ['انطواء وعزلة', 'قلق أو توتر واضح', 'تغيّر مفاجئ في السلوك', 'ظروف أسرية', 'صعوبة في التكيّف', 'أخرى']],
    attendance: ['المواظبة', ['غياب متكرر', 'تأخر صباحي متكرر', 'هروب من الحصص', 'أخرى']],
    health: ['صحية', ['أعراض صحية متكررة', 'إرهاق أو نعاس مستمر', 'أخرى']] };
  const PR = { normal: ['عادية', ''], high: ['مهمة', 'st-submitted'], urgent: ['عاجلة', 'st-returned'] };
  const BST = { open: ['جديدة', 'st-submitted'], in_progress: ['قيد المتابعة', ''], closed: ['مغلقة', 'st-approved'] };
  const CST = { study: ['قيد الدراسة', 'st-submitted'], follow: ['قيد المتابعة', ''], closed: ['مغلقة', 'st-approved'] };
  const ACT = [['session', 'جلسة إرشادية فردية'], ['group', 'جلسة إرشادية جماعية'], ['parent_call', 'اتصال بولي الأمر'], ['parent_meet', 'استدعاء ولي الأمر'], ['pledge', 'تعهد خطي'], ['plan', 'خطة تعديل سلوك'], ['reinforce', 'تعزيز إيجابي'], ['teacher', 'تنسيق مع المعلم'], ['admin', 'إحالة للوكيل / الإدارة'], ['external', 'إحالة لجهة مختصة'], ['follow', 'متابعة'], ['note', 'ملاحظة']];
  const actName = k => (ACT.find(a => a[0] === k) || [])[1] || k;
  const PRIOR = ['لا شيء', 'تنبيه شفهي', 'تواصل مع ولي الأمر', 'تسجيل في سجل المتابعة', 'نقل لمقعد آخر', 'حرمان من نشاط'];
  const pill = (M, k) => `<span class="pill ${(M[k] || [])[1] || ''}">${(M[k] || [k])[0]}</span>`;
  const typeOf = r => (Object.entries(TYPES).find(([, v]) => v[1].includes(r.category)) || ['behavior'])[0];
  const notify = (ids, subject, body) => { if (!api.sendMessages) return; const rows = [...new Set(ids)].filter(id => id && id !== S.me.id).map(id => ({ recipient_id: id, subject, body })); if (rows.length) api.sendMessages(rows).catch(() => { }); };
  let CLS = null; const allCls = async () => { if (CLS) return CLS; const ids = (S.sections || []).map(s => s.id); try { CLS = ids.length ? await api.list('classes', { section_id: ids }) : []; } catch (_) { CLS = []; } (S.classes || []).forEach(c => { if (!CLS.some(x => x.id === c.id)) CLS.push(c); }); return CLS; };
  const cName = id => ((CLS || []).find(c => c.id === id) || (A.cls && A.cls(id)) || {}).name || '';

  // ---------- التنقل ----------
  A.I.refer = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>';
  A.I.counsel = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.6-7 10-7 10z"/><path d="M9.5 11.5h5M12 9v5"/></svg>';
  A.I.deputy = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V8l7-5 7 5v13"/><path d="M10 21v-5h4v5M9 11h6"/></svg>';
  if (A.NAV) {
    const at = A.NAV.findIndex(n => n[0] === 'attendance');
    if (!A.NAV.some(n => n[0] === 'counsel')) A.NAV.splice(at < 0 ? A.NAV.length : at + 1, 0, ['counsel', 'الإرشاد الطلابي', () => isC()]);
    if (!A.NAV.some(n => n[0] === 'deputy')) A.NAV.splice(at < 0 ? A.NAV.length : at + 1, 0, ['deputy', 'إحالات الوكيل', () => isD()]);
    if (!A.NAV.some(n => n[0] === 'refer')) A.NAV.splice(at < 0 ? A.NAV.length : at + 1, 0, ['refer', 'إحالة طالب', () => !!S.me]);
  }

  const css = `
  .cs-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px 14px}
  .cs-chips{display:flex;flex-wrap:wrap;gap:6px}.cs-chips button{border:1.5px solid #CFE0F2;background:#fff;color:#082B5A;border-radius:99px;padding:6px 12px;font:inherit;font-weight:700;cursor:pointer}
  .cs-chips button.on{background:#082B5A;color:#fff;border-color:#082B5A}.cs-chips button.pr-high.on{background:#D99A2B;border-color:#D99A2B}.cs-chips button.pr-urgent.on{background:#D2463F;border-color:#D2463F}
  .cs-stu{max-height:230px;overflow:auto;border:1px solid #E4EBF5;border-radius:12px;padding:4px;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:4px}
  .cs-stu button{text-align:start;border:1px solid transparent;background:#F7FAFE;border-radius:10px;padding:7px 10px;font:inherit;cursor:pointer;color:#082B5A}.cs-stu button.on{border-color:#005499;background:#EAF3FC;font-weight:800}
  .cs-card{border:1px solid #DCE7F3;border-radius:16px;padding:12px 14px;background:#fff;display:grid;gap:6px;position:relative}
  .cs-card.pr-urgent{border-inline-start:5px solid #D2463F}.cs-card.pr-high{border-inline-start:5px solid #D99A2B}.cs-card.pr-normal{border-inline-start:5px solid #3AB1DB}
  .cs-card .cs-hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.cs-card .cs-hd b{color:#082B5A;font-size:15px}
  .cs-card .meta{font-size:12.5px;color:#5B7090;display:flex;gap:10px;flex-wrap:wrap}
  .cs-card .rep{background:#F1F8F4;border-radius:10px;padding:6px 10px;font-size:13px}.cs-card .acts{display:flex;gap:6px;flex-wrap:wrap}
  .cs-list{display:grid;gap:10px}
  .cs-board{display:grid;grid-template-columns:repeat(3,minmax(240px,1fr));gap:12px;align-items:start}@media(max-width:900px){.cs-board{grid-template-columns:1fr}}
  .cs-col{background:#F4F8FC;border-radius:16px;padding:10px;display:grid;gap:8px}.cs-col h3{margin:0 0 2px;font-size:14px;color:#082B5A;display:flex;justify-content:space-between}
  .cs-case{cursor:pointer;transition:box-shadow .15s,transform .15s}.cs-case:hover,.cs-case:focus-visible{box-shadow:0 8px 20px -10px rgba(8,43,90,.4);transform:translateY(-1px);outline:none}
  .cs-due{color:#C0392B;font-weight:800}
  .cs-ev.gd{background:#F2F8FD;border-color:#CFE3F5}.cs-ev.gd:before{background:#005499}.cs-ev.bk:before{background:#2E8B57}
  .cs-th{display:grid;gap:8px;max-height:52vh;overflow:auto;padding:4px;background:#F4F8FC;border-radius:14px}
  .cs-msg{max-width:82%;background:#fff;border:1px solid #E1EAF5;border-radius:14px 14px 14px 4px;padding:8px 12px;justify-self:end}
  .cs-msg.me{justify-self:start;background:#EAF3FC;border-color:#CFE3F5;border-radius:14px 14px 4px 14px}.cs-msg.st{background:#FFF7EC;border-color:#F1DDB0}
  .cs-msg .h{display:flex;gap:8px;font-size:12px;color:#5B7090;margin-bottom:2px}.cs-msg .h b{color:#082B5A}
  .cs-th-in{display:flex;gap:8px;align-items:flex-end;margin-top:10px}.cs-th-in textarea{flex:1}
  .cs-tl{position:relative;display:grid;gap:10px;padding-inline-start:22px}.cs-tl:before{content:'';position:absolute;inset-block:4px;inset-inline-start:8px;width:2px;background:#DCE7F3}
  .cs-ev{position:relative;background:#fff;border:1px solid #E4EBF5;border-radius:12px;padding:8px 12px}.cs-ev:before{content:'';position:absolute;inset-inline-start:-19px;top:12px;width:12px;height:12px;border-radius:50%;background:#3AB1DB;box-shadow:0 0 0 3px #fff}
  .cs-ev.priv{background:#FFFBF2;border-color:#F1DDB0}.cs-ev.priv:before{background:#D99A2B}.cs-ev.ref:before{background:#D2463F}
  .cs-ev .h{display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:12.5px;color:#5B7090}.cs-ev .h b{color:#082B5A;font-size:13.5px}
  .cs-alert{display:flex;gap:10px;align-items:center;background:#FFF4DE;border:1px solid #F1DDB0;border-radius:14px;padding:8px 12px;margin:8px 0;color:#7A4E00}
  .cs-prof{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:8px 0}.cs-prof div{background:#F4F8FC;border-radius:12px;padding:8px 10px}.cs-prof b{display:block;font-size:20px;color:#082B5A}
  .cs-bars{display:grid;gap:6px}.cs-bar{display:grid;grid-template-columns:minmax(110px,190px) 1fr 40px;gap:8px;align-items:center;font-size:13px}.cs-bar i{display:block;height:12px;border-radius:6px;background:linear-gradient(90deg,#3AB1DB,#005499)}`;
  if (!document.getElementById('app60css')) { const s = document.createElement('style'); s.id = 'app60css'; s.textContent = css; document.head.appendChild(s); }

  // ============ طباعة الإحالات بهوية دينا (استوديو التقارير A.printDoc) ============
  const refRows = r => [['الجهة المُحال إليها', TO[toOf(r)][0]], ['نوع الإحالة', TYPES[typeOf(r)][0]], ['السبب', r.category], ['الأولوية', PR[r.priority || 'normal'][0]], ['التاريخ', dt(r.day) + (r.period ? ' · الحصة ' + AR(r.period) : '')], ['المُحيل', nm(r.by_staff) + ' — ' + role(r.by_staff)], ['الإجراء قبل الإحالة', r.prior_action || '—'], ['حالة الإحالة', BST[r.status || 'open'][0]]];
  function printRef(r, s) {
    if (!A.printDoc || !r) return;
    const body = `<h3>بيانات الطالب</h3><table><tr><th>الطالب</th><th>الفصل</th><th>رقم الطالب</th></tr><tr><td><b>${esc(s.full_name || '')}</b></td><td>${esc(cName(r.class_id))}</td><td>${esc(s.student_no || '—')}</td></tr></table>
      <h3>بيانات الإحالة</h3><table>${refRows(r).map(([k, v]) => `<tr><th style="width:32%">${k}</th><td>${esc(v || '—')}</td></tr>`).join('')}</table>
      <h3>وصف الحالة</h3><p style="white-space:pre-wrap;line-height:1.9">${esc(r.note || '—')}</p>
      ${r.reply ? `<h3>ردّ ${TO[toOf(r)][0]}</h3><p style="white-space:pre-wrap;line-height:1.9">${esc(r.reply)}${r.replied_at ? ` <span style="color:#5B7090">(${dt(r.replied_at)})</span>` : ''}</p>` : ''}
      <table style="margin-top:28px"><tr><th>المُحيل</th><th>${TO[toOf(r)][0]}</th><th>مدير المدرسة</th></tr><tr><td style="height:56px">${esc(nm(r.by_staff))}</td><td></td><td></td></tr></table>`;
    A.printDoc('نموذج إحالة طالب إلى ' + TO[toOf(r)][0], `${s.full_name || ''} · ${cName(r.class_id)} · ${dt(r.day)}`, body);
  }
  function printRefList(L, sOf, title, sub) {
    if (!A.printDoc) return;
    const cnt = (f) => { const m = {}; L.forEach(r => { const k = f(r); m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const sumT = (h, E) => `<table><tr><th>${h}</th><th>العدد</th></tr>${E.map(([k, n]) => `<tr><td>${esc(k)}</td><td>${AR(n)}</td></tr>`).join('')}</table>`;
    const body = `<h3>ملخص</h3><table><tr><th>إجمالي الإحالات</th><th>جديدة</th><th>قيد المتابعة</th><th>مغلقة</th></tr><tr><td><b>${AR(L.length)}</b></td><td>${AR(L.filter(r => (r.status || 'open') === 'open').length)}</td><td>${AR(L.filter(r => r.status === 'in_progress').length)}</td><td>${AR(L.filter(r => r.status === 'closed').length)}</td></tr></table>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div><h3>حسب السبب</h3>${sumT('السبب', cnt(r => r.category))}</div><div><h3>حسب الجهة</h3>${sumT('الجهة', cnt(r => TO[toOf(r)][0]))}</div></div>
      <h3>تفاصيل الإحالات</h3><table><tr><th>#</th><th>التاريخ</th><th>الطالب</th><th>الفصل</th><th>إلى</th><th>السبب</th><th>الأولوية</th><th>المُحيل</th><th>الحالة</th><th>الردّ</th></tr>${L.map((r, i) => `<tr><td>${AR(i + 1)}</td><td>${dt(r.day)}</td><td><b>${esc(sOf(r.student_id).full_name || '')}</b></td><td>${esc(cName(r.class_id))}</td><td>${TO[toOf(r)][0]}</td><td>${esc(r.category)}</td><td>${PR[r.priority || 'normal'][0]}</td><td>${esc(nm(r.by_staff))}</td><td>${BST[r.status || 'open'][0]}</td><td>${esc(r.reply || '')}</td></tr>`).join('')}</table>`;
    A.printDoc(title, sub, body, true);
  }

  // ============ مساحة الوكيل: إحالات الطلاب الموجّهة إليه ============
  const dst = { tab: 'inbox', s: '', q: '' };
  V.deputy = async function (root) {
    if (!isD()) { root.innerHTML = `<div class="card">${A.emptyBox('هذه الصفحة للوكيل والمالك', 'يمنحها المالك من «المسميات والصلاحيات» ← وحدة الوكيل')}</div>`; return; }
    root.innerHTML = '<div class="spinner"></div>';
    const [stu, , all] = await Promise.all([A.studentsAll ? A.studentsAll() : api.list('students', { school_id: S.school.id }), allCls(),
      api.list('behaviors', { school_id: S.school.id, referred: true, target: 'deputy' }, { order: 'created_at', desc: true }).catch(() => [])]);
    const sOf = id => (stu || []).find(x => x.id === id) || {};
    const rank = r => ({ urgent: 0, high: 1, normal: 2 }[r.priority || 'normal']);
    const inbox = all.filter(r => (r.status || 'open') !== 'closed').sort((a, b) => rank(a) - rank(b) || String(b.created_at).localeCompare(String(a.created_at)));
    const reload = () => V.deputy(root);
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>إحالات الوكيل</h2><p class="sub" style="margin:2px 0 0">الطلاب المُحالون إليك من المعلمين ومراقبي الأدوار — عالج الإحالة وردّ على المُحيل، واطبع الإحالة أو التقرير بهوية دينا.</p></div></div>
      <div class="grid g4" style="margin:8px 0">${[['جديدة', all.filter(r => (r.status || 'open') === 'open').length, all.some(r => (r.status || 'open') === 'open' && r.priority === 'urgent') ? 'var(--bad)' : ''], ['قيد المتابعة', all.filter(r => r.status === 'in_progress').length, ''], ['مغلقة', all.filter(r => r.status === 'closed').length, ''], ['هذا الشهر', all.filter(r => String(r.created_at || r.day).slice(0, 7) === today().slice(0, 7)).length, '']].map(([l, n, c]) => `<div class="kpi"><b style="${c ? 'color:' + c : ''}">${AR(n)}</b><span>${l}</span></div>`).join('')}</div>
      <div class="fm-tabs" role="tablist">${[['inbox', 'الوارد', inbox.length], ['all', 'كل الإحالات', 0]].map(([k, l, n]) => `<button role="tab" data-tb="${k}" class="${dst.tab === k ? 'on' : ''}" aria-selected="${dst.tab === k}">${l}${n ? `<span class="n">${AR(n)}</span>` : ''}</button>`).join('')}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap;margin:10px 0"><select class="in" id="dpS" style="max-width:170px" aria-label="الحالة"><option value="">كل الحالات</option>${Object.entries(BST).map(([k, v]) => `<option value="${k}" ${dst.s === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select><input class="in" id="dpQ" placeholder="بحث باسم الطالب أو المُحيل" style="max-width:260px" value="${esc(dst.q)}"><span class="grow"></span><button class="btn ghost sm" id="dpPr" type="button">${A.I.print || ''} طباعة التقرير</button></div>
      <div id="dpL"></div></div>`;
    $$('[data-tb]', root).forEach(b => b.onclick = () => { dst.tab = b.dataset.tb; reload(); });
    const list = () => { const base = dst.tab === 'inbox' ? inbox : all, q = A.normKey ? A.normKey(dst.q) : dst.q;
      return base.filter(r => (!dst.s || (r.status || 'open') === dst.s) && (!q || (A.normKey ? A.normKey(sOf(r.student_id).full_name + ' ' + nm(r.by_staff)) : '').includes(q))); };
    const card = r => { const s = sOf(r.student_id); return `<div class="cs-card pr-${r.priority || 'normal'}"><div class="cs-hd"><b>${esc(s.full_name || '')}</b><span class="small muted">${esc(cName(r.class_id))}</span>${pill(PR, r.priority || 'normal')}${pill(BST, r.status || 'open')}<span class="pill">${esc(TYPES[typeOf(r)][0])}</span></div>
      <div class="meta"><span><b>${esc(r.category)}</b></span><span>من ${esc(nm(r.by_staff))} · ${esc(role(r.by_staff))}</span><span>${dt(r.day)}${r.period ? ' · الحصة ' + AR(r.period) : ''}</span></div>
      ${r.note ? `<div style="white-space:pre-wrap">${esc(r.note)}</div>` : ''}${r.prior_action && r.prior_action !== 'لا شيء' ? `<div class="small muted">الإجراء قبل الإحالة: ${esc(r.prior_action)}</div>` : ''}${r.reply ? `<div class="rep"><b>ردّك:</b> ${esc(r.reply)}</div>` : ''}
      <div class="acts">${(r.status || 'open') === 'open' ? `<button class="btn ghost sm" data-ip="${r.id}">بدء المتابعة</button>` : ''}${r.status !== 'closed' ? `<button class="btn sm" data-cl="${r.id}">ردّ وإغلاق</button>` : `<button class="btn ghost sm" data-ro="${r.id}">إعادة فتح</button>`}<button class="btn ghost sm" data-rp="${r.id}">ردّ على المُحيل</button><button class="btn ghost sm" data-pr="${r.id}">${A.I.print || ''} طباعة</button></div></div>`; };
    const draw = () => { const L = list(); $('#dpL', root).innerHTML = L.length ? `<div class="cs-list">${L.slice(0, 300).map(card).join('')}</div>` : A.emptyBox(dst.tab === 'inbox' ? 'لا إحالات بانتظار المعالجة' : 'لا إحالات');
      const by = id => all.find(x => x.id === id);
      const upd = async (r, patch, msg) => { await api.upd('behaviors', r.id, patch); if (msg) notify([r.by_staff], 'ردّ الوكيل على إحالتك: ' + (sOf(r.student_id).full_name || ''), msg); A.toast('حُفظ', 'ok'); reload(); };
      $$('[data-ip]', root).forEach(b => b.onclick = () => A.run(b, () => upd(by(b.dataset.ip), { status: 'in_progress' })));
      $$('[data-ro]', root).forEach(b => b.onclick = () => A.run(b, () => upd(by(b.dataset.ro), { status: 'in_progress' })));
      $$('[data-cl]', root).forEach(b => b.onclick = async () => { const r = by(b.dataset.cl); const v = await ask('ردّك على المُحيل (يظهر له في «إحالاتي»)', r.reply || 'اطّلعت على الحالة وتمت معالجتها'); if (v == null) return; A.run(b, () => upd(r, { status: 'closed', reply: v, replied_at: new Date().toISOString() }, v)); });
      $$('[data-rp]', root).forEach(b => b.onclick = async () => { const r = by(b.dataset.rp); const v = await ask('ردّك على المُحيل', r.reply || ''); if (v == null) return; A.run(b, () => upd(r, { reply: v, replied_at: new Date().toISOString(), status: (r.status || 'open') === 'open' ? 'in_progress' : r.status }, v)); });
      $$('[data-pr]', root).forEach(b => b.onclick = () => { const r = by(b.dataset.pr); printRef(r, sOf(r.student_id)); }); };
    $('#dpS', root).onchange = e => { dst.s = e.target.value; draw(); };
    $('#dpQ', root).oninput = e => { dst.q = e.target.value; draw(); };
    $('#dpPr', root).onclick = () => printRefList(list(), sOf, 'تقرير إحالات الوكيل', `${(S.school || {}).name || ''} · ${dst.tab === 'inbox' ? 'الوارد' : 'كل الإحالات'}${dst.s ? ' · ' + BST[dst.s][0] : ''}`);
    draw();
  };

  // ============ صفحة الإحالة (لكل المعلمين ومراقبي الأدوار) ============
  const rf = { type: 'behavior', pr: 'normal', cls: '', sid: '', to: 'counselor' };
  V.refer = async function (root) {
    root.innerHTML = '<div class="spinner"></div>';
    const [stu, cl] = await Promise.all([A.studentsAll ? A.studentsAll() : api.list('students', { school_id: S.school.id }), allCls()]);
    const myCls = new Set((S.allEntries || S.entries || []).filter(e => e.teacher_id === S.me.id).map(e => e.class_id));
    const classes = cl.filter(c => c.active !== false && !c.is_test && (stu || []).some(s => s.class_id === c.id && s.active !== false)).sort((a, b) => (myCls.has(b.id) - myCls.has(a.id)) || (a.sort || 0) - (b.sort || 0) || String(a.name).localeCompare(b.name, 'ar'));
    if (!classes.some(c => c.id === rf.cls)) rf.cls = (classes[0] || {}).id || '';
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>إحالة طالب</h2><p class="sub" style="margin:2px 0 0">أحِل طالباً إلى <b>الموجه الطلابي</b> أو <b>الوكيل</b> مع السبب. يصل لهم تنبيه فوري، وتتابع الحالة والردّ من «إحالاتي»، ويمكنك طباعة الإحالة والتقرير بهوية دينا.</p></div></div>
      <div class="cs-form" style="margin-top:8px">
        <div class="field"><label for="rfC">الفصل</label><select class="in" id="rfC">${classes.map(c => `<option value="${c.id}" ${c.id === rf.cls ? 'selected' : ''}>${esc(c.name)}${myCls.has(c.id) ? ' ★' : ''}</option>`).join('')}</select></div>
        <div class="field"><label for="rfQ">بحث عن طالب</label><input class="in" id="rfQ" placeholder="اكتب جزءاً من الاسم (يبحث في كل الفصول)"></div></div>
      <div class="field"><label>الطالب <span class="small muted" id="rfSel"></span></label><div class="cs-stu" id="rfS" role="listbox" aria-label="الطلاب"></div></div>
      <div class="field"><label>إحالة إلى</label><div class="cs-chips" id="rfTo">${Object.entries(TO).map(([k, v]) => `<button type="button" data-to="${k}" class="${rf.to === k ? 'on' : ''}" aria-pressed="${rf.to === k}">${v[1]} ${v[0]}</button>`).join('')}</div></div>
      <div class="field"><label>نوع الإحالة</label><div class="cs-chips" id="rfT">${Object.entries(TYPES).map(([k, v]) => `<button type="button" data-t="${k}" class="${rf.type === k ? 'on' : ''}" aria-pressed="${rf.type === k}">${v[0]}</button>`).join('')}</div></div>
      <div class="cs-form">
        <div class="field"><label for="rfCat">السبب</label><select class="in" id="rfCat"></select></div>
        <div class="field"><label>الأولوية</label><div class="cs-chips" id="rfP">${Object.entries(PR).map(([k, v]) => `<button type="button" data-p="${k}" class="pr-${k} ${rf.pr === k ? 'on' : ''}" aria-pressed="${rf.pr === k}">${v[0]}</button>`).join('')}</div></div>
        <div class="field"><label for="rfD">التاريخ</label><input class="in" type="date" id="rfD" value="${today()}"></div>
        <div class="field"><label for="rfPe">الحصة (اختياري)</label><select class="in" id="rfPe"><option value="">—</option>${Array.from({ length: 8 }, (_, i) => `<option value="${i + 1}">${A.ORD ? A.ORD[i] || AR(i + 1) : AR(i + 1)}</option>`).join('')}</select></div></div>
      <div class="field"><label for="rfN">وصف الحالة</label><textarea class="in" id="rfN" rows="3" placeholder="ماذا حدث؟ متى؟ هل تكرر؟"></textarea></div>
      <div class="field"><label for="rfPa">الإجراء المتخذ قبل الإحالة</label><select class="in" id="rfPa">${PRIOR.map(x => `<option>${x}</option>`).join('')}</select></div>
      <div class="row" style="gap:8px;margin-top:6px"><button class="btn" id="rfGo">إرسال الإحالة</button><span class="small muted" id="rfPriv">الإحالة سرية: لا يراها إلا ${TO[rf.to][0]} والمالك وأنت.</span></div></div>
      <div class="card"><div class="head"><h2 style="margin:0" class="grow">إحالاتي</h2><button class="btn ghost sm" id="rfPrAll" type="button">${A.I.print || ''} طباعة تقرير إحالاتي</button></div><div id="rfMine"><div class="spinner"></div></div></div>
      <div class="card" id="rfGc"><div class="head"><h2 style="margin:0">توجيهات الموجه <span class="pill" id="rfGn" hidden></span></h2></div><div id="rfG"><div class="spinner"></div></div></div>`;
    myGuides($('#rfG', root)).then(n => { const p = $('#rfGn', root); if (n) { p.hidden = false; p.className = 'pill st-submitted'; p.textContent = AR(n) + ' بانتظار اطلاعك'; const c = $('#rfGc', root); c.parentNode.insertBefore(c, c.parentNode.firstChild); } });
    const drawStu = () => { const q = A.normKey ? A.normKey($('#rfQ', root).value) : $('#rfQ', root).value;
      const L = (stu || []).filter(s => s.active !== false && (q ? (A.normKey ? A.normKey(s.full_name) : s.full_name).includes(q) : s.class_id === rf.cls)).slice(0, 200);
      $('#rfS', root).innerHTML = L.map(s => `<button type="button" role="option" data-s="${s.id}" class="${rf.sid === s.id ? 'on' : ''}" aria-selected="${rf.sid === s.id}">${esc(s.full_name)}${q ? ` <span class="small muted">· ${esc(cName(s.class_id))}</span>` : ''}</button>`).join('') || '<p class="small muted" style="padding:6px">لا طلاب</p>';
      $$('[data-s]', root).forEach(b => b.onclick = () => { rf.sid = b.dataset.s; $$('[data-s]', root).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); const s = stu.find(x => x.id === rf.sid); $('#rfSel', root).textContent = s ? '— ' + s.full_name : ''; }); };
    const drawCat = () => { $('#rfCat', root).innerHTML = TYPES[rf.type][1].map(x => `<option>${x}</option>`).join(''); };
    $('#rfC', root).onchange = e => { rf.cls = e.target.value; rf.sid = ''; $('#rfSel', root).textContent = ''; drawStu(); };
    $('#rfQ', root).oninput = drawStu;
    $$('[data-t]', root).forEach(b => b.onclick = () => { rf.type = b.dataset.t; $$('[data-t]', root).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); drawCat(); });
    $$('[data-to]', root).forEach(b => b.onclick = () => { rf.to = b.dataset.to; $$('[data-to]', root).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); $('#rfPriv', root).textContent = `الإحالة سرية: لا يراها إلا ${TO[rf.to][0]} والمالك وأنت.`; });
    $$('[data-p]', root).forEach(b => b.onclick = () => { rf.pr = b.dataset.p; $$('[data-p]', root).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); });
    drawStu(); drawCat();
    $('#rfGo', root).onclick = ev => A.run(ev.currentTarget, async () => {
      const s = (stu || []).find(x => x.id === rf.sid); if (!s) throw new Error('اختر الطالب');
      const note = $('#rfN', root).value.trim(); if (note.length < 5) throw new Error('اكتب وصفاً مختصراً للحالة');
      const pe = $('#rfPe', root).value;
      await api.ins('behaviors', { school_id: S.school.id, student_id: s.id, class_id: s.class_id, day: $('#rfD', root).value || today(), kind: rf.type === 'behavior' ? 'negative' : 'referral', category: $('#rfCat', root).value, points: 0, note, referred: true, status: 'open', priority: rf.pr, prior_action: $('#rfPa', root).value, period: pe ? +pe : null, target: rf.to, by_staff: S.me.id, ...(A.DEMO || /[?&]demo=1/.test(location.search) ? { created_at: new Date().toISOString(), reply: '' } : {}) });
      try { const fn = rf.to === 'deputy' ? 'deputy_ids' : 'counselor_ids', ids = await api.rpc(fn, {}); notify((ids || []).map(x => x[fn] || x), `إحالة ${PR[rf.pr][0]} إلى ${TO[rf.to][0]}: ${s.full_name}`, `أحال ${S.me.full_name} (${role(S.me.id)}) الطالب ${s.full_name} — ${cName(s.class_id)}: ${$('#rfCat', root).value}.`); } catch (_) { }
      A.toast('أُرسلت الإحالة إلى ' + TO[rf.to][0], 'ok'); rf.sid = ''; $('#rfN', root).value = ''; $('#rfSel', root).textContent = ''; drawStu(); mine();
    });
    async function mine() {
      const L = await api.list('behaviors', { school_id: S.school.id, by_staff: S.me.id, referred: true }, { order: 'created_at', desc: true }).catch(() => []);
      $('#rfMine', root).innerHTML = L.length ? `<div class="cs-list">${L.map(r => { const s = (stu || []).find(x => x.id === r.student_id) || {};
        return `<div class="cs-card pr-${r.priority || 'normal'}"><div class="cs-hd"><b>${esc(s.full_name || '')}</b><span class="small muted">${esc(cName(r.class_id))}</span><span class="pill">${TO[toOf(r)][1]} ${TO[toOf(r)][0]}</span>${pill(BST, r.status || 'open')}${pill(PR, r.priority || 'normal')}</div>
          <div class="meta"><span>${esc(r.category)}</span><span>${dt(r.day)}</span></div>${r.reply ? `<div class="rep"><b>آخر ردّ ${toOf(r) === 'deputy' ? 'للوكيل' : 'للموجه'}:</b> ${esc(r.reply)}${r.replied_at ? ` <span class="small muted">· ${dt(r.replied_at)}</span>` : ''}</div>` : `<div class="small muted">بانتظار اطلاع ${TO[toOf(r)][0]}</div>`}<div class="acts">${toOf(r) === 'counselor' ? `<button class="btn ghost sm" data-th="${r.id}">💬 المحادثة مع الموجه</button>` : ''}<button class="btn ghost sm" data-prr="${r.id}">${A.I.print || ''} طباعة الإحالة</button></div></div>`; }).join('')}</div>` : A.emptyBox('لم تُرسل إحالات بعد');
      $$('[data-prr]', root).forEach(b => b.onclick = () => { const r = L.find(x => x.id === b.dataset.prr); printRef(r, (stu || []).find(x => x.id === r.student_id) || {}); });
      $('#rfPrAll', root).onclick = () => printRefList(L, id => (stu || []).find(x => x.id === id) || {}, 'تقرير إحالاتي', S.me.full_name || '');
      $$('[data-th]', root).forEach(b => b.onclick = () => { const r = L.find(x => x.id === b.dataset.th); thread(r, ((stu || []).find(x => x.id === r.student_id) || {}).full_name, mine); });
    }
    mine();
  };

  // ============ مساحة الموجه الطلابي ============
  const cst = { tab: 'inbox' };
  V.counsel = async function (root) {
    if (!isC()) { root.innerHTML = `<div class="card">${A.emptyBox('هذه الصفحة للموجه الطلابي والمالك', 'يمنحها المالك من «المسميات والصلاحيات» ← وحدة المرشد الطلابي')}</div>`; return; }
    root.innerHTML = '<div class="spinner"></div>';
    const [stu, , refs, cases] = await Promise.all([A.studentsAll ? A.studentsAll() : api.list('students', { school_id: S.school.id }), allCls(),
      api.list('behaviors', { school_id: S.school.id, referred: true }, { order: 'created_at', desc: true }).then(L => (L || []).filter(r => toOf(r) === 'counselor')).catch(() => []), api.list('counsel_cases', { school_id: S.school.id }, { order: 'updated_at', desc: true }).catch(() => [])]);
    const sOf = id => (stu || []).find(x => x.id === id) || {};
    const inbox = refs.filter(r => (r.status || 'open') !== 'closed' && !r.case_id).sort((a, b) => ({ urgent: 0, high: 1, normal: 2 }[a.priority || 'normal'] - { urgent: 0, high: 1, normal: 2 }[b.priority || 'normal']) || String(b.created_at).localeCompare(String(a.created_at)));
    const due = cases.filter(c => c.status !== 'closed' && c.follow_date && c.follow_date <= today());
    const open = cases.filter(c => c.status !== 'closed');
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>الإرشاد الطلابي</h2><p class="sub" style="margin:2px 0 0">إحالات المعلمين ومراقبي الأدوار، وحالات الطلاب ومتابعتها، وملف كل طالب.</p></div><div class="row" style="gap:6px"><button class="btn ghost" id="csNew">${A.I.plus || ''} حالة جديدة</button></div></div>
      ${due.length ? `<div class="cs-alert" role="status">⏰ <span>${AR(due.length)} ${due.length === 1 ? 'حالة موعد متابعتها' : 'حالات موعد متابعتها'} اليوم أو قبله: ${due.slice(0, 4).map(c => `<b>${esc(sOf(c.student_id).full_name || '')}</b>`).join('، ')}</span></div>` : ''}
      <div class="grid g4" style="margin:8px 0">${[['inbox', 'إحالات بانتظار المعالجة', inbox.length, inbox.some(r => r.priority === 'urgent') ? 'var(--bad)' : ''], ['cases', 'حالات مفتوحة', open.length, ''], ['due', 'متابعات مستحقة', due.length, due.length ? 'var(--bad)' : ''], ['month', 'إحالات هذا الشهر', refs.filter(r => String(r.created_at || r.day).slice(0, 7) === today().slice(0, 7)).length, '']].map(([k, l, v, c], i) => `<button type="button" class="kpi ${i ? '' : 'navy'} btnlike" data-k="${k}"><span class="more">التفاصيل</span><div class="k">${l}</div><div class="v"${c ? ` style="color:${c}"` : ''}>${AR(v)}</div></button>`).join('')}</div>
      <div class="fm-tabs" role="tablist">${[['inbox', 'الوارد', inbox.length], ['cases', 'الحالات', 0], ['msgs', 'الرسائل', 0], ['students', 'ملف الطالب', 0], ['all', 'كل الإحالات', 0], ['rep', 'التقارير', 0]].map(([k, l, n]) => `<button role="tab" data-tb="${k}" class="${cst.tab === k ? 'on' : ''}" aria-selected="${cst.tab === k}">${l}${n ? `<span class="n">${AR(n)}</span>` : ''}</button>`).join('')}</div><div id="csO"></div></div>`;
    const reload = () => V.counsel(root);
    $$('[data-tb]', root).forEach(b => b.onclick = () => { cst.tab = b.dataset.tb; reload(); });
    $$('[data-k]', root).forEach(b => b.onclick = () => { const k = b.dataset.k; if (k === 'inbox' || k === 'month') { cst.tab = k === 'inbox' ? 'inbox' : 'all'; return reload(); } if (A.attDrill) A.attDrill({ title: k === 'due' ? 'متابعات مستحقة' : 'الحالات المفتوحة', cols: ['الطالب', 'الفصل', 'الحالة', 'الأولوية', 'موعد المتابعة'], rows: (k === 'due' ? due : open).map(c => ({ q: sOf(c.student_id).full_name || '', cells: [`<b>${esc(sOf(c.student_id).full_name || '')}</b>`, esc(cName(sOf(c.student_id).class_id)), pill(CST, c.status), pill(PR, c.priority), dt(c.follow_date)] })) }); });
    $('#csNew', root).onclick = () => pickStudent(stu, s => openCase(null, { student: s, refs: [] }, reload));
    const O = $('#csO', root);
    const refCard = (r, actions) => { const s = sOf(r.student_id); return `<div class="cs-card pr-${r.priority || 'normal'}"><div class="cs-hd"><b>${esc(s.full_name || '')}</b><span class="small muted">${esc(cName(r.class_id))}</span>${pill(PR, r.priority || 'normal')}${pill(BST, r.status || 'open')}<span class="pill">${esc(TYPES[typeOf(r)][0])}</span></div>
      <div class="meta"><span><b>${esc(r.category)}</b></span><span>من ${esc(nm(r.by_staff))} · ${esc(role(r.by_staff))}</span><span>${dt(r.day)}${r.period ? ' · الحصة ' + AR(r.period) : ''}</span></div>
      ${r.note ? `<div>${esc(r.note)}</div>` : ''}${r.prior_action && r.prior_action !== 'لا شيء' ? `<div class="small muted">الإجراء قبل الإحالة: ${esc(r.prior_action)}</div>` : ''}${r.reply ? `<div class="rep"><b>ردّك:</b> ${esc(r.reply)}</div>` : ''}${actions ? `<div class="acts">${actions}</div>` : ''}</div>`; };
    if (cst.tab === 'inbox') {
      O.innerHTML = inbox.length ? `<div class="cs-list">${inbox.map(r => refCard(r, `<button class="btn sm" data-open="${r.id}">فتح حالة</button>${cases.some(c => c.student_id === r.student_id && c.status !== 'closed') ? `<button class="btn ghost sm" data-att="${r.id}">ضمّ لحالة الطالب المفتوحة</button>` : ''}<button class="btn ghost sm" data-quick="${r.id}">ردّ وإغلاق</button><button class="btn ghost sm" data-thr="${r.id}">💬 محادثة المُحيل</button><button class="btn ghost sm" data-gd="${r.id}">📣 توجيه</button>`)).join('')}</div>` : A.emptyBox('لا إحالات جديدة', 'تظهر هنا إحالات المعلمين ومراقبي الأدوار فور إرسالها');
      $$('[data-thr]', O).forEach(b => b.onclick = () => { const r = refs.find(x => x.id === b.dataset.thr); thread(r, sOf(r.student_id).full_name, reload); });
      $$('[data-gd]', O).forEach(b => b.onclick = () => { const r = refs.find(x => x.id === b.dataset.gd); guideModal(sOf(r.student_id), { refs: refs.filter(x => x.student_id === r.student_id) }, reload); });
      $$('[data-open]', O).forEach(b => b.onclick = () => { const r = refs.find(x => x.id === b.dataset.open); openCase(null, { student: sOf(r.student_id), refs: [r], priority: r.priority, title: r.category }, reload); });
      $$('[data-att]', O).forEach(b => b.onclick = () => A.run(b, async () => { const r = refs.find(x => x.id === b.dataset.att); const c = cases.find(x => x.student_id === r.student_id && x.status !== 'closed'); await api.upd('behaviors', r.id, { case_id: c.id, status: 'in_progress' }); A.toast('ضُمّت للحالة', 'ok'); openCase(c, { student: sOf(c.student_id) }, reload); }));
      $$('[data-quick]', O).forEach(b => b.onclick = async () => { const r = refs.find(x => x.id === b.dataset.quick); const v = await ask('ردّك على المُحيل (يظهر له في «إحالاتي»)', 'اطّلعت على الحالة وتمت معالجتها'); if (v == null) return; A.run(b, async () => { await api.upd('behaviors', r.id, { status: 'closed', reply: v, replied_at: new Date().toISOString() }); notify([r.by_staff], 'ردّ الموجه على إحالتك: ' + (sOf(r.student_id).full_name || ''), v); A.toast('أُغلقت الإحالة وأُبلغ المُحيل', 'ok'); reload(); }); });
    }
    if (cst.tab === 'cases') {
      const col = (k, L) => `<section class="cs-col"><h3>${CST[k][0]} <span class="pill">${AR(L.length)}</span></h3>${L.map(c => { const s = sOf(c.student_id), n = refs.filter(r => r.case_id === c.id).length, late = c.follow_date && c.follow_date <= today() && c.status !== 'closed';
        return `<div class="cs-card cs-case pr-${c.priority || 'normal'}" data-c="${c.id}" tabindex="0" role="button"><div class="cs-hd"><b>${esc(s.full_name || '')}</b>${pill(PR, c.priority || 'normal')}</div><div class="meta"><span>${esc(cName(s.class_id))}</span><span>${esc(c.title || '')}</span></div><div class="meta"><span>${AR(n)} إحالة</span>${c.follow_date ? `<span class="${late ? 'cs-due' : ''}">المتابعة ${dt(c.follow_date)}</span>` : ''}</div></div>`; }).join('') || '<p class="small muted">—</p>'}</section>`;
      O.innerHTML = `<div class="cs-board">${col('study', cases.filter(c => c.status === 'study'))}${col('follow', cases.filter(c => c.status === 'follow'))}${col('closed', cases.filter(c => c.status === 'closed').slice(0, 30))}</div>`;
      $$('[data-c]', O).forEach(e => { const go = () => { const c = cases.find(x => x.id === e.dataset.c); openCase(c, { student: sOf(c.student_id) }, reload); }; e.onclick = go; e.onkeydown = k => { if (k.key === 'Enter') go(); }; });
    }
    if (cst.tab === 'students') {
      O.innerHTML = `<div class="field"><label for="csQ">ابحث عن طالب</label><input class="in" id="csQ" placeholder="اسم الطالب" style="max-width:360px"></div><div id="csSR" class="cs-stu" style="max-height:none"></div>`;
      const top = [...new Set(refs.map(r => r.student_id))].map(id => ({ s: sOf(id), n: refs.filter(r => r.student_id === id).length })).filter(x => x.s.id).sort((a, b) => b.n - a.n).slice(0, 24);
      const draw = () => { const q = A.normKey ? A.normKey($('#csQ', O).value) : $('#csQ', O).value; const L = q ? (stu || []).filter(s => (A.normKey ? A.normKey(s.full_name) : s.full_name).includes(q)).slice(0, 60).map(s => ({ s, n: refs.filter(r => r.student_id === s.id).length })) : top;
        $('#csSR', O).innerHTML = (q ? '' : '<p class="small muted" style="grid-column:1/-1;margin:4px">الأكثر إحالة:</p>') + L.map(x => `<button type="button" data-sp="${x.s.id}">${esc(x.s.full_name)} <span class="small muted">· ${esc(cName(x.s.class_id))}${x.n ? ' · ' + AR(x.n) + ' إحالة' : ''}</span></button>`).join('');
        $$('[data-sp]', O).forEach(b => b.onclick = () => profile(sOf(b.dataset.sp), refs, cases, reload)); };
      $('#csQ', O).oninput = draw; draw();
    }
    if (cst.tab === 'all') {
      O.innerHTML = `<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:8px"><select class="in" id="alS" style="max-width:180px" aria-label="الحالة"><option value="">كل الحالات</option>${Object.entries(BST).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select><select class="in" id="alT" style="max-width:180px" aria-label="النوع"><option value="">كل الأنواع</option>${Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}</select><input class="in" id="alQ" placeholder="بحث بالطالب أو المُحيل" style="max-width:240px"></div><div id="alL" class="cs-list"></div>`;
      const draw = () => { const s = $('#alS', O).value, t = $('#alT', O).value, q = A.normKey ? A.normKey($('#alQ', O).value) : $('#alQ', O).value; const L = refs.filter(r => (!s || (r.status || 'open') === s) && (!t || typeOf(r) === t) && (!q || (A.normKey ? A.normKey(sOf(r.student_id).full_name + ' ' + nm(r.by_staff)) : '').includes(q)));
        $('#alL', O).innerHTML = L.slice(0, 200).map(r => refCard(r, r.case_id ? `<button class="btn ghost sm" data-gc="${r.case_id}">فتح الحالة</button>` : '')).join('') || A.emptyBox('لا نتائج');
        $$('[data-gc]', O).forEach(b => b.onclick = () => { const c = cases.find(x => x.id === b.dataset.gc); if (c) openCase(c, { student: sOf(c.student_id) }, reload); }); };
      ['#alS', '#alT'].forEach(x => $(x, O).onchange = draw); $('#alQ', O).oninput = draw; draw();
    }
    if (cst.tab === 'rep') report(O, refs, cases, sOf);
    if (cst.tab === 'msgs') { O.innerHTML = '<div class="spinner"></div>'; const M = (await api.list('counsel_msgs', { school_id: S.school.id }, { order: 'created_at', desc: true }).catch(() => [])).filter(x => x.from_staff !== S.me.id && x.kind === 'msg').slice(0, 150);
      const G = (await api.list('counsel_msgs', { school_id: S.school.id }, { order: 'created_at', desc: true }).catch(() => [])).filter(x => x.kind === 'guide' && x.from_staff === S.me.id).slice(0, 60);
      O.innerHTML = `<h3 style="margin:4px 0 8px">الردود الواردة</h3>${M.length ? `<div class="cs-list">${M.map(x => `<div class="cs-card pr-normal"><div class="cs-hd"><b>${esc(nm(x.from_staff))}</b><span class="small muted">${esc(role(x.from_staff))} · ${dt(x.created_at)}</span>${x.student_id ? `<span class="pill">${esc(sOf(x.student_id).full_name || '')}</span>` : ''}</div><div style="white-space:pre-wrap">${esc(x.body)}</div><div class="acts">${x.ref_id ? `<button class="btn ghost sm" data-mth="${x.ref_id}">💬 فتح المحادثة</button>` : ''}${x.student_id ? `<button class="btn ghost sm" data-msp="${x.student_id}">ملف الطالب</button>` : ''}</div></div>`).join('')}</div>` : A.emptyBox('لا ردود بعد')}
        <h3 style="margin:16px 0 8px">التوجيهات المرسلة</h3>${G.length ? `<div class="cs-list">${G.map(g => { const n2 = (g.recipients || []).length, a2 = Object.keys(g.acks || {}).length; return `<div class="cs-card pr-normal"><div class="cs-hd"><b>${esc(sOf(g.student_id).full_name || '')}</b><span class="small muted">${dt(g.created_at)} · إلى ${AR(n2)}</span>${g.need_ack ? `<span class="pill ${a2 >= n2 ? 'st-approved' : 'st-submitted'}">اطّلع ${AR(a2)} من ${AR(n2)}</span>` : ''}</div><div style="white-space:pre-wrap">${esc(g.body)}</div>${g.need_ack && a2 < n2 ? `<div class="small muted">لم يطّلع بعد: ${esc((g.recipients || []).filter(id => !(g.acks || {})[id]).map(nm).join('، '))}</div>` : ''}</div>`; }).join('')}</div>` : A.emptyBox('لم تُرسل توجيهات بعد', 'أرسلها من بطاقة الإحالة أو من ملف الحالة')}`;
      $$('[data-mth]', O).forEach(b => b.onclick = () => { const rr = refs.find(x => x.id === b.dataset.mth); if (rr) thread(rr, sOf(rr.student_id).full_name, reload); });
      $$('[data-msp]', O).forEach(b => b.onclick = () => profile(sOf(b.dataset.msp), refs, cases, reload)); }
  };

  function ask(label, val) { return new Promise(res => { const m = A.modal(`<h3>${esc(label)}</h3><textarea class="in" id="akT" rows="4" style="width:100%">${esc(val || '')}</textarea><div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="akOk">متابعة</button></div>`); let done = false; $('#akOk', m.el).onclick = () => { const v = $('#akT', m.el).value.trim(); if (!v) return A.toast('اكتب الردّ', 'warn'); done = true; m.close(); res(v); }; const o = new MutationObserver(() => { if (!document.body.contains(m.el)) { o.disconnect(); if (!done) res(null); } }); o.observe(document.body, { childList: true, subtree: true }); }); }
  function pickStudent(stu, cb) {
    const m = A.modal(`<h3>حالة جديدة — اختر الطالب</h3><input class="in" id="pkQ" placeholder="اسم الطالب"><div class="cs-stu" id="pkL" style="margin-top:8px"></div>`);
    const draw = () => { const q = A.normKey ? A.normKey($('#pkQ', m.el).value) : $('#pkQ', m.el).value; $('#pkL', m.el).innerHTML = (stu || []).filter(s => s.active !== false && (!q || (A.normKey ? A.normKey(s.full_name) : s.full_name).includes(q))).slice(0, 80).map(s => `<button type="button" data-s="${s.id}">${esc(s.full_name)} <span class="small muted">· ${esc(cName(s.class_id))}</span></button>`).join('');
      $$('[data-s]', m.el).forEach(b => b.onclick = () => { m.close(); cb(stu.find(s => s.id === b.dataset.s)); }); };
    $('#pkQ', m.el).oninput = draw; draw(); setTimeout(() => $('#pkQ', m.el).focus(), 50);
  }

  // ---------- ملف الحالة ----------
  async function openCase(c, ctx, after) {
    const s = ctx.student || {};
    if (!c) { // إنشاء الحالة وربط الإحالات
      const row = { school_id: S.school.id, student_id: s.id, title: ctx.title || 'متابعة إرشادية', priority: ctx.priority || 'normal', status: 'study', counselor_id: S.me.id, ...(/[?&]demo=1/.test(location.search) ? { opened_at: new Date().toISOString(), updated_at: new Date().toISOString(), outcome: '', summary: '' } : {}) };
      const r = await api.ins('counsel_cases', row); c = Array.isArray(r) ? r[0] : r;
      for (const x of ctx.refs || []) { await api.upd('behaviors', x.id, { case_id: c.id, status: 'in_progress', reply: 'استلم الموجه الطلابي الحالة وبدأ دراستها.', replied_at: new Date().toISOString() }); notify([x.by_staff], 'استلم الموجه إحالتك: ' + (s.full_name || ''), 'استلم الموجه الطلابي الحالة وبدأ دراستها.'); }
      after && after();
    }
    const m = A.modal(`<div id="csM"><div class="spinner"></div></div>`, { cls: 'wide' });
    const load = async () => {
      const [refs, acts, att, msgs] = await Promise.all([api.list('behaviors', { case_id: c.id }).catch(() => []), api.list('counsel_actions', { case_id: c.id }, { order: 'day' }).catch(() => []), api.list('attendance', { student_id: s.id }).catch(() => []), api.list('counsel_msgs', { student_id: s.id }, { order: 'created_at' }).catch(() => [])]);
      const guides = msgs.filter(x => x.kind === 'guide'), back = msgs.filter(x => x.kind === 'msg' && !x.ref_id);
      const ev = [...refs.map(r => ({ t: 'ref', day: r.day, at: r.created_at, r })), ...acts.map(a => ({ t: 'act', day: a.day, at: a.created_at, a })), ...guides.map(g => ({ t: 'guide', day: String(g.created_at).slice(0, 10), at: g.created_at, g })), ...back.map(g => ({ t: 'back', day: String(g.created_at).slice(0, 10), at: g.created_at, g }))].sort((x, y) => String(x.day).localeCompare(String(y.day)) || String(x.at).localeCompare(String(y.at)));
      const abs = att.filter(a => a.status === 'absent').length, late = att.filter(a => a.status === 'late').length;
      const B = $('#csM', m.el);
      B.innerHTML = `<div class="fm-top"><div class="grow"><h3 style="margin:0">ملف حالة: ${esc(s.full_name || '')}</h3><p class="sub" style="margin:2px 0 0">${esc(cName(s.class_id))} · فُتحت ${dt(c.opened_at)} · ${pill(CST, c.status)} ${pill(PR, c.priority || 'normal')}</p></div>
          <div class="fm-acts"><button class="btn ghost sm" id="cmPr">${A.I.print || ''} طباعة</button><button class="btn sm" id="cmGd">📣 إرسال توجيه</button><button class="btn ghost sm" id="cmProf">ملف الطالب</button></div></div>
        <div class="cs-prof"><div><b>${AR(refs.length)}</b>إحالة في الحالة</div><div><b>${AR(acts.length)}</b>إجراء</div><div><b>${AR(abs)}</b>غياب مسجّل</div><div><b>${AR(late)}</b>تأخر مسجّل</div></div>
        <div class="cs-form"><div class="field"><label for="cmT">عنوان الحالة</label><input class="in" id="cmT" value="${esc(c.title || '')}"></div>
          <div class="field"><label for="cmS">حالة الملف</label><select class="in" id="cmS">${Object.entries(CST).map(([k, v]) => `<option value="${k}" ${c.status === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
          <div class="field"><label for="cmP">الأولوية</label><select class="in" id="cmP">${Object.entries(PR).map(([k, v]) => `<option value="${k}" ${(c.priority || 'normal') === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
          <div class="field"><label for="cmF">موعد المتابعة القادم</label><input class="in" type="date" id="cmF" value="${c.follow_date || ''}"></div></div>
        <div class="field"><label for="cmSum">ملخص الحالة (سري)</label><textarea class="in" id="cmSum" rows="2">${esc(c.summary || '')}</textarea></div>
        <h3 style="margin:14px 0 8px">سجل الحالة</h3>
        <div class="cs-tl">${ev.map(e => e.t === 'guide' ? `<div class="cs-ev gd"><div class="h"><b>📣 توجيه</b><span>${dt(e.g.created_at)}</span><span>إلى ${AR((e.g.recipients || []).length)}: ${esc((e.g.recipients || []).map(nm).slice(0, 4).join('، '))}${(e.g.recipients || []).length > 4 ? '…' : ''}</span>${e.g.need_ack ? `<span class="pill ${Object.keys(e.g.acks || {}).length >= (e.g.recipients || []).length ? 'st-approved' : 'st-submitted'}">اطّلع ${AR(Object.keys(e.g.acks || {}).length)} من ${AR((e.g.recipients || []).length)}</span>` : ''}</div><div style="white-space:pre-wrap">${esc(e.g.body)}</div></div>` : e.t === 'back' ? `<div class="cs-ev bk"><div class="h"><b>↩ ردّ من ${esc(nm(e.g.from_staff))}</b><span>${dt(e.g.created_at)}</span></div><div style="white-space:pre-wrap">${esc(e.g.body)}</div></div>` : e.t === 'ref' ? `<div class="cs-ev ref"><div class="h"><b>إحالة: ${esc(e.r.category)}</b><span>من ${esc(nm(e.r.by_staff))} · ${esc(role(e.r.by_staff))}</span><span>${dt(e.r.day)}</span>${pill(BST, e.r.status || 'open')}</div>${e.r.note ? `<div>${esc(e.r.note)}</div>` : ''}
            <div class="row" style="gap:6px;margin-top:6px;flex-wrap:nowrap"><input class="in" data-rp="${e.r.id}" value="${esc(e.r.reply || '')}" placeholder="ردّك على المُحيل (يظهر له)" style="padding:6px"><button class="btn ghost sm" data-rs="${e.r.id}">إرسال الردّ</button><button class="btn ghost sm" data-cth="${e.r.id}">💬 المحادثة</button></div></div>`
          : `<div class="cs-ev ${e.a.private ? 'priv' : ''}"><div class="h"><b>${esc(actName(e.a.kind))}</b><span>${dt(e.a.day)}</span><span>${esc(nm(e.a.by_staff))}</span>${e.a.private ? '<span class="pill">🔒 سري</span>' : ''}${e.a.next_date ? `<span>المتابعة ${dt(e.a.next_date)}</span>` : ''}<button class="btn ghost sm" data-del="${e.a.id}" style="margin-inline-start:auto;padding:2px 8px" aria-label="حذف الإجراء">×</button></div>${e.a.note ? `<div style="white-space:pre-wrap">${esc(e.a.note)}</div>` : ''}</div>`).join('') || '<p class="small muted">لا أحداث بعد</p>'}</div>
        <div class="sec-box" style="margin-top:12px"><b>إضافة إجراء</b><div class="cs-form" style="margin-top:6px"><div class="field"><label for="caK">الإجراء</label><select class="in" id="caK">${ACT.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div><div class="field"><label for="caD">التاريخ</label><input class="in" type="date" id="caD" value="${today()}"></div><div class="field"><label for="caN2">متابعة بعدها (اختياري)</label><input class="in" type="date" id="caN2"></div></div>
          <div class="field"><label for="caN">التفاصيل</label><textarea class="in" id="caN" rows="2" placeholder="ما تم، وما اتُّفق عليه"></textarea></div><label class="chk"><input type="checkbox" id="caP" checked> سري (للموجه والمالك فقط)</label><div class="row" style="margin-top:6px"><button class="btn sm" id="caGo">إضافة إلى السجل</button></div></div>
        <div class="field" style="margin-top:12px"><label for="cmO">النتيجة / سبب الإغلاق</label><textarea class="in" id="cmO" rows="2" placeholder="يُطلب عند إغلاق الحالة">${esc(c.outcome || '')}</textarea></div>
        <div class="row" style="gap:8px;margin-top:8px"><button class="btn" id="cmSv">حفظ</button>${c.status !== 'closed' ? '<button class="btn ok" id="cmCl">إغلاق الحالة</button>' : ''}</div>`;
      const save = async (extra) => { const p = { title: $('#cmT', B).value.trim(), status: $('#cmS', B).value, priority: $('#cmP', B).value, follow_date: $('#cmF', B).value || null, summary: $('#cmSum', B).value, outcome: $('#cmO', B).value, updated_at: new Date().toISOString(), ...(extra || {}) }; await api.upd('counsel_cases', c.id, p); Object.assign(c, p); };
      $('#cmSv', B).onclick = ev2 => A.run(ev2.currentTarget, async () => { await save(); A.toast('حُفظ', 'ok'); after && after(); load(); });
      const cl = $('#cmCl', B); if (cl) cl.onclick = ev2 => A.run(ev2.currentTarget, async () => { if (!$('#cmO', B).value.trim()) { $('#cmO', B).focus(); throw new Error('اكتب نتيجة الحالة قبل إغلاقها'); } await save({ status: 'closed', closed_at: new Date().toISOString() });
        for (const r of refs.filter(r => r.status !== 'closed')) { await api.upd('behaviors', r.id, { status: 'closed', reply: r.reply || 'تمت معالجة الحالة وإغلاقها.', replied_at: new Date().toISOString() }); notify([r.by_staff], 'أُغلقت الحالة التي أحلتها: ' + (s.full_name || ''), r.reply || 'تمت معالجة الحالة وإغلاقها.'); }
        A.toast('أُغلقت الحالة وأُبلغ المُحيلون', 'ok'); after && after(); load(); });
      $('#caGo', B).onclick = ev2 => A.run(ev2.currentTarget, async () => { const note = $('#caN', B).value.trim(); const nx = $('#caN2', B).value || null;
        await api.ins('counsel_actions', { case_id: c.id, school_id: S.school.id, kind: $('#caK', B).value, note, private: $('#caP', B).checked, day: $('#caD', B).value || today(), next_date: nx, by_staff: S.me.id, ...(/[?&]demo=1/.test(location.search) ? { created_at: new Date().toISOString() } : {}) });
        const p = { updated_at: new Date().toISOString() }; if (nx) p.follow_date = nx; if (c.status === 'study' && $('#caK', B).value !== 'note') p.status = 'follow'; await api.upd('counsel_cases', c.id, p); Object.assign(c, p);
        A.toast('أُضيف الإجراء', 'ok'); after && after(); load(); });
      $$('[data-rs]', B).forEach(b => b.onclick = () => A.run(b, async () => { const r = refs.find(x => x.id === b.dataset.rs); const v = $(`[data-rp="${r.id}"]`, B).value.trim(); if (!v) throw new Error('اكتب الردّ'); await api.upd('behaviors', r.id, { reply: v, replied_at: new Date().toISOString(), status: r.status === 'open' ? 'in_progress' : r.status }); notify([r.by_staff], 'ردّ الموجه على إحالتك: ' + (s.full_name || ''), v); A.toast('أُرسل الردّ للمُحيل', 'ok'); load(); }));
      $$('[data-del]', B).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذا الإجراء من السجل؟', 'حذف', true))) return; A.run(b, async () => { await api.del('counsel_actions', b.dataset.del); load(); }); });
      $('#cmGd', B).onclick = () => guideModal(s, { case: c, refs }, load);
      $$('[data-cth]', B).forEach(b => b.onclick = () => thread(refs.find(x => x.id === b.dataset.cth), s.full_name, load));
      $('#cmProf', B).onclick = async () => { const [all, cs] = await Promise.all([api.list('behaviors', { student_id: s.id }).catch(() => []), api.list('counsel_cases', { student_id: s.id }).catch(() => [])]); profile(s, all.filter(r => r.referred), cs, after, all); };
      $('#cmPr', B).onclick = async () => { const priv = await A.confirmBox('تضمين الملخص والإجراءات السرية في الطباعة؟', 'تضمينها');
        A.printDoc('ملف حالة إرشادية', `${s.full_name || ''} · ${cName(s.class_id)}`, `<h3>بيانات الحالة</h3><table><tr><th>العنوان</th><th>الحالة</th><th>الأولوية</th><th>فُتحت</th><th>المتابعة</th></tr><tr><td>${esc(c.title || '')}</td><td>${CST[c.status][0]}</td><td>${PR[c.priority || 'normal'][0]}</td><td>${dt(c.opened_at)}</td><td>${dt(c.follow_date)}</td></tr></table>${priv && c.summary ? `<h3>الملخص</h3><p>${esc(c.summary)}</p>` : ''}
          <h3>الإحالات</h3><table><tr><th>التاريخ</th><th>السبب</th><th>المُحيل</th><th>الوصف</th><th>الردّ</th></tr>${refs.map(r => `<tr><td>${dt(r.day)}</td><td>${esc(r.category)}</td><td>${esc(nm(r.by_staff))}</td><td>${esc(r.note || '')}</td><td>${esc(r.reply || '')}</td></tr>`).join('') || '<tr><td colspan="5">—</td></tr>'}</table>
          <h3>الإجراءات</h3><table><tr><th>التاريخ</th><th>الإجراء</th><th>التفاصيل</th><th>بواسطة</th></tr>${acts.filter(a => priv || !a.private).map(a => `<tr><td>${dt(a.day)}</td><td>${esc(actName(a.kind))}</td><td>${esc(a.note || '')}</td><td>${esc(nm(a.by_staff))}</td></tr>`).join('') || '<tr><td colspan="4">—</td></tr>'}</table>${c.outcome ? `<h3>النتيجة</h3><p>${esc(c.outcome)}</p>` : ''}`); };
    };
    load();
  }

  // ---------- ملف الطالب ----------
  async function profile(s, refsAll, casesAll, after, bhAll) {
    const m = A.modal(`<div id="pfB"><div class="spinner"></div></div>`, { cls: 'wide' });
    const [bh, att] = await Promise.all([bhAll ? Promise.resolve(bhAll) : api.list('behaviors', { student_id: s.id }).catch(() => []), api.list('attendance', { student_id: s.id }).catch(() => [])]);
    const refs = bh.filter(r => r.referred), pos = bh.filter(r => r.kind === 'positive'), neg = bh.filter(r => r.kind === 'negative');
    const cs = (casesAll || []).filter(c => c.student_id === s.id);
    const ev = bh.slice().sort((a, b) => String(b.day).localeCompare(String(a.day)));
    $('#pfB', m.el).innerHTML = `<h3 style="margin:0">ملف الطالب: ${esc(s.full_name || '')}</h3><p class="sub" style="margin:2px 0 0">${esc(cName(s.class_id))}${s.student_no ? ' · رقم ' + esc(s.student_no) : ''}</p>
      <div class="cs-prof"><div><b>${AR(refs.length)}</b>إحالة</div><div><b>${AR(cs.length)}</b>حالة إرشادية</div><div><b style="color:#2E8B57">${AR(pos.length)}</b>سلوك إيجابي</div><div><b style="color:#D2463F">${AR(neg.length)}</b>سلوك يحتاج متابعة</div><div><b>${AR(att.filter(a => a.status === 'absent').length)}</b>غياب</div><div><b>${AR(att.filter(a => a.status === 'late').length)}</b>تأخر</div></div>
      ${cs.length ? `<h3 style="margin:12px 0 6px">الحالات</h3><div class="cs-list">${cs.map(c => `<div class="cs-card cs-case pr-${c.priority || 'normal'}" data-c="${c.id}" tabindex="0" role="button"><div class="cs-hd"><b>${esc(c.title || '')}</b>${pill(CST, c.status)}</div><div class="meta"><span>فُتحت ${dt(c.opened_at)}</span>${c.closed_at ? `<span>أُغلقت ${dt(c.closed_at)}</span>` : ''}</div></div>`).join('')}</div>` : ''}
      <h3 style="margin:12px 0 6px">السجل السلوكي</h3><div class="cs-tl">${ev.map(r => `<div class="cs-ev ${r.referred ? 'ref' : ''}" style="${r.kind === 'positive' ? 'border-color:#CBE8D5' : ''}"><div class="h"><b>${esc(r.category)}</b><span>${dt(r.day)}</span><span>${esc(nm(r.by_staff))}</span>${r.referred ? pill(BST, r.status || 'open') : r.kind === 'positive' ? '<span class="pill st-approved">إيجابي</span>' : ''}</div>${r.note ? `<div>${esc(r.note)}</div>` : ''}</div>`).join('') || '<p class="small muted">لا سجل</p>'}</div>`;
    $$('[data-c]', m.el).forEach(e => e.onclick = () => { const c = cs.find(x => x.id === e.dataset.c); m.close(); openCase(c, { student: s }, after); });
  }

  // ---------- التقارير ----------
  function report(O, refs, cases, sOf) {
    const by = f => { const mp = new Map(); refs.forEach(r => { const k = f(r); mp.set(k, (mp.get(k) || 0) + 1); }); return [...mp.entries()].sort((a, b) => b[1] - a[1]); };
    const bars = L => { const mx = Math.max(1, ...L.map(x => x[1])); return `<div class="cs-bars">${L.slice(0, 12).map(([k, v]) => `<div class="cs-bar"><span>${esc(k || '—')}</span><i style="width:${Math.round(v / mx * 100)}%"></i><b>${AR(v)}</b></div>`).join('') || '<p class="small muted">—</p>'}</div>`; };
    const replied = refs.filter(r => r.replied_at && r.created_at), avgH = replied.length ? Math.round(replied.reduce((a, r) => a + (new Date(r.replied_at) - new Date(r.created_at)), 0) / replied.length / 36e5) : null;
    const rep = [...new Set(refs.map(r => r.student_id))].map(id => ({ s: sOf(id), n: refs.filter(r => r.student_id === id).length })).filter(x => x.n >= 2).sort((a, b) => b.n - a.n);
    const months = by(r => String(r.day || '').slice(0, 7)).sort((a, b) => a[0].localeCompare(b[0]));
    const html = `<div class="cs-prof"><div><b>${AR(refs.length)}</b>إجمالي الإحالات</div><div><b>${AR(refs.filter(r => r.status === 'closed').length)}</b>مغلقة</div><div><b>${AR(cases.length)}</b>حالة إرشادية</div><div><b>${avgH == null ? '—' : AR(avgH)}</b>متوسط زمن الردّ (ساعة)</div><div><b>${AR(rep.length)}</b>طالب متكرر الإحالة</div></div>
      <div class="nr-g2" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px">
        <div class="sec-box"><b>حسب السبب</b>${bars(by(r => r.category))}</div><div class="sec-box"><b>حسب النوع</b>${bars(by(r => TYPES[typeOf(r)][0]))}</div>
        <div class="sec-box"><b>حسب الفصل</b>${bars(by(r => cName(r.class_id)))}</div><div class="sec-box"><b>حسب المُحيل</b>${bars(by(r => nm(r.by_staff)))}</div>
        <div class="sec-box"><b>حسب الشهر</b>${bars(months)}</div><div class="sec-box"><b>حسب الأولوية</b>${bars(by(r => PR[r.priority || 'normal'][0]))}</div></div>
      <h3>الطلاب متكررو الإحالة</h3><table class="tbl"><thead><tr><th>الطالب</th><th>الفصل</th><th>عدد الإحالات</th><th>آخر إحالة</th></tr></thead><tbody>${rep.map(x => `<tr><td><b>${esc(x.s.full_name || '')}</b></td><td>${esc(cName(x.s.class_id))}</td><td>${AR(x.n)}</td><td>${dt(refs.filter(r => r.student_id === x.s.id).map(r => r.day).sort().pop())}</td></tr>`).join('') || '<tr><td colspan="4">—</td></tr>'}</tbody></table>`;
    O.innerHTML = `<div class="row" style="justify-content:flex-end;gap:6px;margin-bottom:6px"><button class="btn ghost sm" id="crX">${A.I.down || ''} Excel</button><button class="btn ghost sm" id="crP">${A.I.print || ''} طباعة</button></div>${html}`;
    $('#crP', O).onclick = () => A.printDoc('تقرير الإرشاد الطلابي', (S.school || {}).name || '', html);
    $('#crX', O).onclick = () => { const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] }; const ws = XLSX.utils.json_to_sheet(refs.map(r => ({ التاريخ: r.day, الطالب: sOf(r.student_id).full_name || '', الفصل: cName(r.class_id), النوع: TYPES[typeOf(r)][0], السبب: r.category, الأولوية: PR[r.priority || 'normal'][0], المحيل: nm(r.by_staff), الحالة: (BST[r.status || 'open'] || [''])[0], 'ردّ الموجه': r.reply || '' }))); ws['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws, 'الإحالات'); XLSX.writeFile(wb, 'تقرير الإرشاد الطلابي.xlsx'); };
  }

  // ============ محادثة الإحالة وتوجيهات الموجه ============
  const DEMO = /[?&]demo=1/.test(location.search);
  const counselorIds = async () => { try { const r = await api.rpc('counselor_ids', {}); const L = (r || []).map(x => x.counselor_ids || x).filter(Boolean); if (L.length) return L; } catch (_) { } return (S.staff || []).filter(p => p.is_owner).map(p => p.id); };
  const GUIDE_T = ['عزّز الطالب إيجابياً عند كل مشاركة صحيحة', 'تجنّب مواجهة الطالب أو توبيخه أمام زملائه', 'أجلس الطالب في المقاعد الأمامية قريباً منك', 'كلّفه بمهمة قيادية بسيطة داخل الفصل', 'تابع أداءه في الواجبات وأبلغني أسبوعياً', 'أعطه وقتاً إضافياً عند الحاجة', 'تواصل معي فور تكرر السلوك'];
  async function sendMsg(row) { const r = await api.ins('counsel_msgs', { school_id: S.school.id, from_staff: S.me.id, kind: 'msg', need_ack: false, acks: {}, ...(DEMO ? { created_at: new Date().toISOString() } : {}), ...row }); return Array.isArray(r) ? r[0] : r; }
  // نافذة المحادثة لإحالة واحدة
  async function thread(ref, sName, onChange) {
    const m = A.modal(`<h3 style="margin:0">محادثة الإحالة: ${esc(sName || '')}</h3><p class="sub" style="margin:2px 0 8px">${esc(ref.category)} · ${dt(ref.day)} · المُحيل ${esc(nm(ref.by_staff))}</p><div class="cs-th" id="thL"><div class="spinner"></div></div>
      <div class="cs-th-in"><textarea class="in" id="thT" rows="2" placeholder="${isC() ? 'ردّك أو توجيهك للمُحيل' : 'رسالتك للموجه الطلابي'}" aria-label="الرسالة"></textarea><button class="btn" id="thGo">إرسال</button></div>`, { cls: 'wide' });
    const load = async () => { const L = await api.list('counsel_msgs', { ref_id: ref.id }, { order: 'created_at' }).catch(() => []);
      const first = ref.reply && !L.length ? [{ from_staff: null, body: ref.reply, created_at: ref.replied_at, legacy: true }] : [];
      const all = [{ from_staff: ref.by_staff, body: ref.note || ref.category, created_at: ref.created_at, start: true }, ...first, ...L];
      $('#thL', m.el).innerHTML = all.map(x => { const mine = x.from_staff === S.me.id, who = x.legacy ? 'الموجه الطلابي' : nm(x.from_staff);
        return `<div class="cs-msg ${mine ? 'me' : ''} ${x.start ? 'st' : ''}"><div class="h"><b>${esc(who)}</b><span>${x.start ? 'الإحالة · ' : ''}${x.created_at ? dt(x.created_at) + ' ' + new Date(x.created_at).toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit' }) : ''}</span></div><div style="white-space:pre-wrap">${esc(x.body)}</div></div>`; }).join('');
      const t = $('#thL', m.el); t.scrollTop = t.scrollHeight; };
    $('#thGo', m.el).onclick = ev => A.run(ev.currentTarget, async () => {
      const body = $('#thT', m.el).value.trim(); if (!body) throw new Error('اكتب الرسالة');
      if (isC()) { await sendMsg({ ref_id: ref.id, case_id: ref.case_id || null, student_id: ref.student_id, recipients: [ref.by_staff], body });
        await api.upd('behaviors', ref.id, { reply: body, replied_at: new Date().toISOString(), ...(ref.status === 'open' || !ref.status ? { status: 'in_progress' } : {}) }); Object.assign(ref, { reply: body });
        notify([ref.by_staff], 'رسالة من الموجه الطلابي: ' + (sName || ''), body); }
      else { const ids = await counselorIds(); await sendMsg({ ref_id: ref.id, student_id: ref.student_id, recipients: ids, body }); notify(ids, 'ردّ على إحالة: ' + (sName || ''), `${S.me.full_name}: ${body}`); }
      $('#thT', m.el).value = ''; await load(); onChange && onChange();
    });
    load(); setTimeout(() => $('#thT', m.el).focus(), 60);
  }
  // نافذة إرسال توجيه (للموجه)
  async function guideModal(s, ctx, after) {
    const people = (S.staff || []).filter(p => p.active && p.id !== S.me.id).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
    let teachers = []; try { const r = await api.rpc('class_teachers', { p_class: s.class_id }); teachers = (r || []).map(x => x.class_teachers || x); } catch (_) { teachers = [...new Set((S.allEntries || S.entries || []).filter(e => e.class_id === s.class_id).map(e => e.teacher_id))]; }
    const referrers = [...new Set((ctx.refs || []).map(r => r.by_staff))], monitors = people.filter(p => /مراقب/.test(p.title || '')).map(p => p.id);
    const pick = new Set();
    const m = A.modal(`<h3 style="margin:0">توجيه بشأن الطالب: ${esc(s.full_name || '')}</h3><p class="sub" style="margin:2px 0 8px">${esc(cName(s.class_id))} · يصل التوجيه لمن تختارهم مع إشعار، ويؤكدون اطلاعهم ويمكنهم الرد عليك. لا تُرسل معه أي ملاحظة سرية.</p>
      <div class="field"><label>المستلمون <span class="small muted" id="gdN">لا أحد</span></label><div class="cs-chips" style="margin-bottom:6px">${teachers.length ? `<button type="button" data-grp="t">معلمو الفصل (${AR(teachers.length)})</button>` : ''}${referrers.length ? `<button type="button" data-grp="r">المُحيلون (${AR(referrers.length)})</button>` : ''}${monitors.length ? `<button type="button" data-grp="m">مراقبو الأدوار (${AR(monitors.length)})</button>` : ''}<button type="button" data-grp="x">إلغاء التحديد</button></div>
        <input class="in" id="gdQ" placeholder="بحث بالاسم" style="max-width:260px"><div class="sm-ppl" id="gdP" style="margin-top:6px">${people.map(p => `<label class="chk" data-nm="${esc(A.normKey ? A.normKey(p.full_name + ' ' + (p.title || '')) : p.full_name)}"><input type="checkbox" value="${p.id}"> ${esc(p.full_name)}${teachers.includes(p.id) ? ' <span class="pill">معلم الفصل</span>' : ''}${p.title ? ` <span class="small muted">· ${esc(p.title)}</span>` : ''}</label>`).join('')}</div></div>
      <div class="field"><label>توجيهات جاهزة <span class="small muted">— اضغط لإضافتها</span></label><div class="cs-chips">${GUIDE_T.map((t, i) => `<button type="button" data-gt="${i}">${esc(t)}</button>`).join('')}</div></div>
      <div class="field"><label for="gdB">نص التوجيه</label><textarea class="in" id="gdB" rows="4" placeholder="ما المطلوب من المستلم في التعامل مع الطالب؟"></textarea></div>
      <label class="chk"><input type="checkbox" id="gdA" checked> يتطلب تأكيد الاطلاع</label>
      <div class="row" style="margin-top:8px"><button class="btn" id="gdGo">إرسال التوجيه</button></div>`, { cls: 'wide' });
    const sync = () => { $$('#gdP input', m.el).forEach(i => { i.checked = pick.has(i.value); }); $('#gdN', m.el).textContent = pick.size ? AR(pick.size) + ' مستلم' : 'لا أحد'; };
    $$('[data-grp]', m.el).forEach(b => b.onclick = () => { const g = b.dataset.grp; if (g === 'x') pick.clear(); else (g === 't' ? teachers : g === 'r' ? referrers : monitors).forEach(id => id !== S.me.id && pick.add(id)); sync(); });
    $$('#gdP input', m.el).forEach(i => i.onchange = () => { i.checked ? pick.add(i.value) : pick.delete(i.value); sync(); });
    $('#gdQ', m.el).oninput = e => { const v = A.normKey ? A.normKey(e.target.value) : e.target.value; $$('#gdP label', m.el).forEach(l => l.hidden = !!v && !l.dataset.nm.includes(v)); };
    $$('[data-gt]', m.el).forEach(b => b.onclick = () => { const ta = $('#gdB', m.el); ta.value = (ta.value.trim() ? ta.value.trim() + '\n' : '') + '• ' + GUIDE_T[+b.dataset.gt]; ta.focus(); });
    if (teachers.length) { teachers.forEach(id => id !== S.me.id && pick.add(id)); sync(); }
    $('#gdGo', m.el).onclick = ev => A.run(ev.currentTarget, async () => {
      const body = $('#gdB', m.el).value.trim(); if (body.length < 5) throw new Error('اكتب نص التوجيه'); if (!pick.size) throw new Error('اختر مستلماً واحداً على الأقل');
      await sendMsg({ kind: 'guide', student_id: s.id, case_id: ctx.case ? ctx.case.id : null, recipients: [...pick], body, need_ack: $('#gdA', m.el).checked });
      notify([...pick], 'توجيه من الموجه الطلابي بشأن: ' + (s.full_name || ''), body + ($('#gdA', m.el).checked ? '\n— افتح «إحالة إلى الموجه» ← «توجيهات الموجه» لتأكيد الاطلاع.' : ''));
      m.close(); A.toast(`أُرسل التوجيه إلى ${AR(pick.size)}`, 'ok'); after && after();
    });
  }
  // توجيهات الموجه الواردة لي (في صفحة الإحالة)
  async function myGuides(box) {
    const L = (await api.list('counsel_msgs', { school_id: S.school.id }, { order: 'created_at', desc: true }).catch(() => [])).filter(x => x.kind === 'guide' && (x.recipients || []).includes(S.me.id));
    if (!L.length) { box.innerHTML = A.emptyBox('لا توجيهات', 'تظهر هنا توجيهات الموجه الطلابي بشأن طلابك'); return 0; }
    const stu = A.studentsAll ? await A.studentsAll() : []; const sn = id => ((stu || []).find(x => x.id === id) || {}).full_name || '';
    box.innerHTML = `<div class="cs-list">${L.map(g => { const ack = (g.acks || {})[S.me.id];
      return `<div class="cs-card ${g.need_ack && !ack ? 'pr-high' : 'pr-normal'}"><div class="cs-hd"><b>${esc(sn(g.student_id))}</b><span class="small muted">من ${esc(nm(g.from_staff))} · ${dt(g.created_at)}</span>${g.need_ack ? (ack ? `<span class="pill st-approved">اطّلعت ${dt(ack)}</span>` : '<span class="pill st-submitted">بانتظار تأكيد اطلاعك</span>') : ''}</div>
        <div style="white-space:pre-wrap">${esc(g.body)}</div><div class="acts">${g.need_ack && !ack ? `<button class="btn sm" data-ack="${g.id}">تأكيد الاطلاع</button>` : ''}<button class="btn ghost sm" data-gr="${g.id}">ردّ على الموجه</button></div></div>`; }).join('')}</div>`;
    $$('[data-ack]', box).forEach(b => b.onclick = () => A.run(b, async () => { if (DEMO) { const g = L.find(x => x.id === b.dataset.ack); await api.upd('counsel_msgs', g.id, { acks: { ...(g.acks || {}), [S.me.id]: new Date().toISOString() } }); } else await api.rpc('counsel_ack', { p_id: b.dataset.ack }); A.toast('شكراً، سُجّل اطلاعك', 'ok'); myGuides(box); }));
    $$('[data-gr]', box).forEach(b => b.onclick = async () => { const g = L.find(x => x.id === b.dataset.gr); const v = await ask('ردّك على الموجه الطلابي', ''); if (v == null) return; A.run(b, async () => { const ids = [g.from_staff]; await sendMsg({ student_id: g.student_id, case_id: g.case_id, recipients: ids, body: v }); notify(ids, 'ردّ على توجيهك بشأن: ' + sn(g.student_id), `${S.me.full_name}: ${v}`); A.toast('أُرسل ردّك', 'ok'); }); });
    return L.filter(g => g.need_ack && !(g.acks || {})[S.me.id]).length;
  }

  // ---------- تنبيهات لحظية ----------
  let subbed = false; const prev = window.APP_AFTER_WEEK;
  window.APP_AFTER_WEEK = async function () {
    if (prev) await prev.apply(this, arguments);
    if (subbed || !api.subscribe || !S.me) return; subbed = true;
    try { api.subscribe('bhr-' + S.me.id, 'behaviors', null, p => { const n = p && p.new, o = p && p.old; if (!n) return;
      if (n.by_staff === S.me.id && n.reply && (!o || o.reply !== n.reply)) A.toast('ردّ الموجه الطلابي على إحالتك: ' + n.reply.slice(0, 60), 'info'); }); } catch (_) { }
    try { api.subscribe('cmsg-' + S.me.id, 'counsel_msgs', null, p => { const n = p && p.new; if (!n || p.eventType !== 'INSERT' || n.from_staff === S.me.id || !(n.recipients || []).includes(S.me.id)) return; A.toast(n.kind === 'guide' ? 'وصلك توجيه من الموجه الطلابي' : 'رسالة جديدة: ' + String(n.body || '').slice(0, 60), 'info'); }); } catch (_) { }
  };
  A._counsel = { openCase, profile, thread, guideModal };
})();
