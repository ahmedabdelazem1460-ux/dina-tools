/* منصة دينا — متابعة السلوك للمالك V.bhadmin + طلبات التوضيح V.clarify (sql/107)
   - «غير المُحالة»: كل سلوك مرصود لم يُحَل بعد، مع الإحالة (فردية أو جماعية) إلى الموجه الطلابي أو الوكيل.
   - تعديل أي سلوك رُصد بالخطأ (الطالب، الفصل، النوع، التصنيف، النقاط، التاريخ، الحصة، الملاحظة، الراصد) مع سجل تعديلات
     تكتبه القاعدة (behaviors.edits) وسبب التعديل، وحذفه أو سحب إحالته.
   - من يعدّل غير المالك: يحدده المالك من «الإعدادات» (schools.settings.bhedit) وتفرضه القاعدة (behaviors_guard).
   - فتح أي حالة إرشادية (A._counsel.openCase) أو إنشاء حالة لأي طالب.
   - طلب توضيح من أي موظف (عام أو بشأن سلوك/طالب/حالة) بمحادثة وإشعار، ويرد الموظف من صفحة «طلبات التوضيح»
     التي لا تظهر لغير المالك إلا بمفتاح tfeat('clarify'). */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc } = A;
  const AR = A.AR || (n => String(n));
  const DEMO = /[?&]demo=1/.test(location.search);
  const today = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const nowIso = () => new Date().toISOString();
  const dt = d => d ? (A.arDate ? A.arDate(String(d).slice(0, 10)) : String(d).slice(0, 10)) : '—';
  const dtt = d => d ? (A.fmtDT ? A.fmtDT(d) : String(d).slice(0, 16)) : '—';
  const nm = id => (A.personName && A.personName(id)) || '—';
  const own = () => !!(S.me && S.me.is_owner);
  const canAsk = () => own() || !!(A.hasModule && A.hasModule('clarify'));
  const nk = s => A.normKey ? A.normKey(s || '') : String(s || '');
  const NEG = ['تأخر صباحي', 'عدم إحضار الكتب والأدوات', 'إزعاج داخل الفصل', 'عدم أداء الواجب', 'الخروج من الحصة دون إذن', 'استخدام الجوال', 'ألفاظ غير لائقة', 'إيذاء زميل', 'إيذاء زميل أو تنمّر', 'شجار', 'عدم الالتزام بتعليمات المعلم', 'إتلاف ممتلكات', 'عدم الالتزام بالزي', 'متابعة حضور', 'غياب متكرر', 'تأخر صباحي متكرر'];
  const POS = ['مشاركة متميزة', 'تعاون مع الزملاء', 'انضباط والتزام', 'مبادرة وقيادة', 'تفوق دراسي', 'خدمة مدرسية'];
  const KIND = { negative: ['يحتاج متابعة', 'st-returned'], positive: ['إيجابي', 'st-approved'], referral: ['إحالة', 'st-submitted'] };
  const TO = { counselor: ['الموجه الطلابي', '🧭'], deputy: ['الوكيل', '🏫'] };
  const PR = { normal: 'عادية', high: 'مهمة', urgent: 'عاجلة' };
  const BST = { open: ['جديدة', 'st-submitted'], in_progress: ['قيد المتابعة', ''], closed: ['مغلقة', 'st-approved'] };
  const CST = { study: 'قيد الدراسة', follow: 'قيد المتابعة', closed: 'مغلقة' };
  const PRIOR = ['لا شيء', 'تنبيه شفهي', 'تواصل مع ولي الأمر', 'تسجيل في سجل المتابعة', 'نقل لمقعد آخر', 'حرمان من نشاط'];
  const FLD = { student_id: 'الطالب', class_id: 'الفصل', day: 'التاريخ', kind: 'النوع', category: 'التصنيف', points: 'النقاط', note: 'الملاحظة', period: 'الحصة', by_staff: 'الراصد' };
  const ABOUT = { general: 'عام', behavior: 'سلوك مرصود', student: 'طالب', case: 'حالة إرشادية' };
  const CRS = { open: ['بانتظار الرد', 'st-submitted'], answered: ['تم الرد', 'st-approved'], closed: ['مغلق', ''] };
  const pill = (M, k) => { const v = M[k] || [k, '']; return `<span class="pill ${v[1] || ''}">${esc(v[0])}</span>`; };
  const CFG_DEF = { rec: 'always', hours: 24, cnsl: true, dep: true, reason: false, notify: true, pend: 'negative' };
  const cfg = () => ({ ...CFG_DEF, ...(((S.school || {}).settings || {}).bhedit || {}) });
  const tfOn = id => { const st = (S.school || {}).settings || {}, v = (st.tfeat || {}).clarify; const p = (S.staff || []).find(x => x.id === id); return !!(p && p.is_owner) || v === true || (v === 'some' && ((st.tfeatTo || {}).clarify || []).includes(id)); };
  const notice = async (ids, title, body, link, asMsg) => { ids = [...new Set(ids || [])].filter(id => id && id !== S.me.id); if (!ids.length) return;
    if (A.notice) return A.notice(ids, title, body, { link, asMessage: !!asMsg }).catch(() => { });
    if (api.sendMessages) return api.sendMessages(ids.map(id => ({ recipient_id: id, subject: title, body }))).catch(() => { }); };

  // ---------- التنقل ----------
  A.I.bhadmin = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>';
  A.I.clarify = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M9.5 8.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.6-.8 1.1v.5M12 14.5h.01"/></svg>';
  if (A.NAV) {
    const at = A.NAV.findIndex(n => n[0] === 'counsel');
    if (!A.NAV.some(n => n[0] === 'bhadmin')) A.NAV.splice(at < 0 ? A.NAV.length : at + 1, 0, ['bhadmin', 'متابعة السلوك', () => own()]);
    if (!A.NAV.some(n => n[0] === 'clarify')) A.NAV.splice(at < 0 ? A.NAV.length : at + 2, 0, ['clarify', 'طلبات التوضيح', () => !!S.me && !own() && (canAsk() || (A.tfeat && A.tfeat('clarify')))]);
  }

  const css = `
  .ba-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:10px 0}
  .ba-kp button{all:unset;cursor:pointer;background:#F4F8FC;border:1px solid #DCE7F3;border-radius:14px;padding:10px 12px;display:grid;gap:2px}
  .ba-kp button:hover,.ba-kp button:focus-visible{border-color:#005499;box-shadow:0 6px 16px -10px rgba(8,43,90,.5)}.ba-kp button:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}
  .ba-kp b{font-size:24px;color:#082B5A}.ba-kp span{font-size:13px;color:#5B7090}.ba-kp .warn b{color:#C0392B}
  .ba-bar{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:10px 0}.ba-bar .in{max-width:190px}
  .ba-list{display:grid;gap:10px}
  .ba-card{border:1px solid #DCE7F3;border-radius:16px;padding:10px 14px;background:#fff;display:grid;gap:6px;border-inline-start:5px solid #3AB1DB}
  .ba-card.k-negative{border-inline-start-color:#D2463F}.ba-card.k-positive{border-inline-start-color:#2E8B57}.ba-card.sel{background:#F2F8FD;border-color:#9CC6EA}
  .ba-card .hd{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.ba-card .hd b{color:#082B5A;font-size:15px}
  .ba-card .mt{font-size:12.5px;color:#5B7090;display:flex;gap:10px;flex-wrap:wrap}
  .ba-card .ac{display:flex;gap:6px;flex-wrap:wrap}.ba-card .ed{font-size:12px;color:#8A5A00;background:#FFF7EC;border-radius:8px;padding:2px 8px;justify-self:start}
  .ba-card input[type=checkbox]{width:18px;height:18px}
  .ba-sel{position:sticky;bottom:8px;z-index:5;display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#082B5A;color:#fff;border-radius:14px;padding:8px 12px;margin-top:10px}
  .ba-sel .btn{background:#fff;color:#082B5A}
  .ba-log{display:grid;gap:8px}.ba-log div{background:#F7FAFE;border:1px solid #E4EBF5;border-radius:12px;padding:8px 10px;font-size:13px}
  .ba-log table{width:100%;border-collapse:collapse;margin-top:4px}.ba-log td{border-top:1px solid #E4EBF5;padding:3px 6px;vertical-align:top}
  .ba-chips{display:flex;flex-wrap:wrap;gap:6px}.ba-chips button{border:1.5px solid #CFE0F2;background:#fff;color:#082B5A;border-radius:99px;padding:6px 12px;font:inherit;font-weight:700;cursor:pointer}
  .ba-chips button.on{background:#082B5A;color:#fff;border-color:#082B5A}
  .ba-ppl{max-height:240px;overflow:auto;border:1px solid #E4EBF5;border-radius:12px;padding:6px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:4px}
  .ba-ppl label{display:flex;gap:6px;align-items:center;padding:4px 6px;border-radius:8px}.ba-ppl label:hover{background:#F4F8FC}
  .ba-th{display:grid;gap:8px;max-height:46vh;overflow:auto;padding:6px;background:#F4F8FC;border-radius:14px}
  .ba-msg{max-width:84%;background:#fff;border:1px solid #E1EAF5;border-radius:14px 14px 14px 4px;padding:8px 12px;justify-self:end}
  .ba-msg.me{justify-self:start;background:#EAF3FC;border-color:#CFE3F5;border-radius:14px 14px 4px 14px}.ba-msg.q{background:#FFF7EC;border-color:#F1DDB0}
  .ba-msg .h{display:flex;gap:8px;font-size:12px;color:#5B7090;margin-bottom:2px;flex-wrap:wrap}.ba-msg .h b{color:#082B5A}
  .ba-warn{background:#FFF4DE;border:1px solid #F1DDB0;border-radius:12px;padding:8px 12px;color:#7A4E00;font-size:13px}
  .ba-set{display:grid;gap:12px}.ba-set .sec-box{display:grid;gap:8px}
  @media(max-width:600px){.ba-bar .in{max-width:none;flex:1 1 140px}.ba-msg{max-width:94%}}
  @media(prefers-reduced-motion:reduce){.ba-kp button{transition:none}}`;
  if (!document.getElementById('bhadmincss')) { const s = document.createElement('style'); s.id = 'bhadmincss'; s.textContent = css; document.head.appendChild(s); }

  // ---------- البيانات ----------
  let CLS = null;
  const allCls = async () => { if (CLS) return CLS; const ids = (S.sections || []).map(s => s.id); try { CLS = ids.length ? await api.list('classes', { section_id: ids }) : []; } catch (_) { CLS = []; } (S.classes || []).forEach(c => { if (!CLS.some(x => x.id === c.id)) CLS.push(c); }); return CLS; };
  const cName = id => ((CLS || []).find(c => c.id === id) || (A.cls && A.cls(id)) || {}).name || '';
  let STU = [];
  const sOf = id => STU.find(x => x.id === id) || {};
  const staffAct = () => (S.staff || []).filter(p => p.active !== false && !p.is_test).sort((a, b) => String(a.full_name).localeCompare(String(b.full_name), 'ar'));
  async function load() {
    const [stu, , bh, cases, reqs] = await Promise.all([A.studentsAll ? A.studentsAll() : api.list('students', { school_id: S.school.id }), allCls(),
      api.list('behaviors', { school_id: S.school.id }, { order: 'created_at', desc: true }).catch(() => []),
      api.list('counsel_cases', { school_id: S.school.id }, { order: 'updated_at', desc: true }).catch(() => []),
      api.list('clar_requests', { school_id: S.school.id }, { order: 'created_at', desc: true }).catch(() => [])]);
    STU = stu || []; return { bh: bh || [], cases: cases || [], reqs: reqs || [] };
  }
  const isPending = (r, c) => !r.referred && (c.pend === 'all' || r.kind !== 'positive');
  const ctxText = r => `${sOf(r.student_id).full_name || 'طالب'} — ${cName(r.class_id)} · ${r.category || ''} · ${dt(r.day)}${r.period ? ' · الحصة ' + AR(r.period) : ''}${r.note ? '\n«' + r.note + '»' : ''}`;

  // ============ الصفحة الرئيسية للمالك ============
  const st = { tab: 'pending', q: '', kind: '', cls: '', by: '', from: '', to: '', ref: '', sel: new Set() };
  V.bhadmin = async function (root) {
    if (!own()) { root.innerHTML = `<div class="card">${A.emptyBox('هذه الصفحة للمالك', '')}</div>`; return; }
    root.innerHTML = '<div class="spinner"></div>';
    const D = await load(), c = cfg();
    const pend = D.bh.filter(r => isPending(r, c)), openRef = D.bh.filter(r => r.referred && (r.status || 'open') !== 'closed');
    const edited = D.bh.filter(r => (r.edits || []).length), waitR = D.reqs.filter(r => r.status === 'open'), openCases = D.cases.filter(x => x.status !== 'closed');
    const reload = () => V.bhadmin(root);
    const T = [['pending', 'غير المُحالة', pend.length], ['all', 'كل السلوكيات', 0], ['cases', 'الحالات', 0], ['clar', 'طلبات التوضيح', waitR.length], ['set', 'الإعدادات', 0]];
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>متابعة السلوك</h2><p class="sub" style="margin:2px 0 0">كل ما رصده المعلمون ومراقبو الأدوار: عدّل ما رُصد بالخطأ، وأحِل ما لم يُحَل، وافتح أي حالة، واطلب توضيحاً من أي موظف.</p></div>
      <div class="row" style="gap:6px"><button class="btn ghost" id="baAsk" type="button">❓ طلب توضيح</button></div></div>
      <div class="ba-kp">${[['pending', 'سلوك غير مُحال', pend.length, pend.length], ['ref', 'إحالات مفتوحة', openRef.length, 0], ['cases', 'حالات مفتوحة', openCases.length, 0], ['edited', 'سلوك عُدِّل', edited.length, 0], ['clar', 'توضيح بانتظار الرد', waitR.length, 0]].map(([k, l, n, w]) => `<button type="button" data-kp="${k}" class="${w ? 'warn' : ''}"><b>${AR(n)}</b><span>${l}</span></button>`).join('')}</div>
      <div class="fm-tabs" role="tablist">${T.map(([k, l, n]) => `<button role="tab" data-tb="${k}" class="${st.tab === k ? 'on' : ''}" aria-selected="${st.tab === k}">${l}${n ? `<span class="n">${AR(n)}</span>` : ''}</button>`).join('')}</div>
      <div id="baO"></div></div>`;
    $$('[data-tb]', root).forEach(b => b.onclick = () => { st.tab = b.dataset.tb; st.sel.clear(); reload(); });
    $$('[data-kp]', root).forEach(b => b.onclick = () => { const k = b.dataset.kp; st.sel.clear();
      if (k === 'pending') st.tab = 'pending'; else if (k === 'cases') st.tab = 'cases'; else if (k === 'clar') st.tab = 'clar';
      else { st.tab = 'all'; st.ref = k === 'ref' ? 'open' : ''; st.edited = k === 'edited'; } reload(); });
    $('#baAsk', root).onclick = () => askDialog({ about: 'general' }, reload);
    const O = $('#baO', root);
    if (st.tab === 'pending' || st.tab === 'all') return bhList(O, st.tab === 'pending' ? pend : D.bh, D, reload, st.tab === 'pending');
    if (st.tab === 'cases') return casesTab(O, D, reload);
    if (st.tab === 'clar') return clarList(O, D.reqs, reload, true);
    if (st.tab === 'set') return settingsTab(O, reload);
  };

  // ---------- قائمة السلوكيات ----------
  function bhList(O, base, D, reload, pendingTab) {
    const recs = [...new Set(D.bh.map(r => r.by_staff).filter(Boolean))].map(id => [id, nm(id)]).sort((a, b) => a[1].localeCompare(b[1], 'ar'));
    const clsL = [...new Set(base.map(r => r.class_id).filter(Boolean))].map(id => [id, cName(id)]).sort((a, b) => a[1].localeCompare(b[1], 'ar'));
    O.innerHTML = `${pendingTab ? `<p class="small muted" style="margin:8px 0 0">${cfg().pend === 'all' ? 'يظهر هنا كل سلوك مرصود (إيجابي أو يحتاج متابعة) لم يُحَل بعد.' : 'يظهر هنا السلوك الذي يحتاج متابعة ولم يُحَل بعد إلى الموجه أو الوكيل. (غيّر ذلك من «الإعدادات»)'}</p>` : ''}
      <div class="ba-bar"><input class="in" id="baQ" placeholder="بحث: الطالب، التصنيف، الملاحظة" value="${esc(st.q)}" aria-label="بحث">
        ${pendingTab ? '' : `<select class="in" id="baK" aria-label="النوع"><option value="">كل الأنواع</option>${Object.entries(KIND).map(([k, v]) => `<option value="${k}" ${st.kind === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
        <select class="in" id="baR" aria-label="الإحالة"><option value="">المُحال وغير المُحال</option><option value="no" ${st.ref === 'no' ? 'selected' : ''}>غير مُحال</option><option value="open" ${st.ref === 'open' ? 'selected' : ''}>إحالة مفتوحة</option><option value="yes" ${st.ref === 'yes' ? 'selected' : ''}>كل المُحال</option></select>`}
        <select class="in" id="baC" aria-label="الفصل"><option value="">كل الفصول</option>${clsL.map(([id, n]) => `<option value="${id}" ${st.cls === id ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
        <select class="in" id="baB" aria-label="الراصد"><option value="">كل الراصدين</option>${recs.map(([id, n]) => `<option value="${id}" ${st.by === id ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>
        <label class="small">من <input class="in" type="date" id="baF" value="${st.from}" style="max-width:150px"></label><label class="small">إلى <input class="in" type="date" id="baT" value="${st.to}" style="max-width:150px"></label>
        ${pendingTab ? '' : `<label class="chk small"><input type="checkbox" id="baE" ${st.edited ? 'checked' : ''}> المعدَّل فقط</label>`}
        <span class="grow"></span><button class="btn ghost sm" type="button" id="baX">${A.I.down || ''} Excel</button></div>
      <div class="ba-list" id="baL"></div><div id="baSel"></div>`;
    const list = () => { const q = nk(st.q); return base.filter(r => (!st.cls || r.class_id === st.cls) && (!st.by || r.by_staff === st.by) && (!st.from || r.day >= st.from) && (!st.to || r.day <= st.to)
      && (pendingTab || ((!st.kind || r.kind === st.kind) && (!st.ref || (st.ref === 'no' ? !r.referred : st.ref === 'yes' ? !!r.referred : r.referred && (r.status || 'open') !== 'closed')) && (!st.edited || (r.edits || []).length)))
      && (!q || nk(`${sOf(r.student_id).full_name || ''} ${r.category || ''} ${r.note || ''} ${nm(r.by_staff)}`).includes(q))); };
    const card = r => { const s = sOf(r.student_id), ne = (r.edits || []).length;
      return `<div class="ba-card k-${r.kind || 'negative'} ${st.sel.has(r.id) ? 'sel' : ''}" data-id="${r.id}"><div class="hd">${!r.referred ? `<input type="checkbox" data-sel="${r.id}" ${st.sel.has(r.id) ? 'checked' : ''} aria-label="تحديد ${esc(s.full_name || '')}">` : ''}<b>${esc(s.full_name || 'طالب غير معروف')}</b><span class="small muted">${esc(cName(r.class_id))}</span>${pill(KIND, r.kind || 'negative')}
        ${r.referred ? `<span class="pill">${TO[r.target === 'deputy' ? 'deputy' : 'counselor'][1]} محال ${r.target === 'deputy' ? 'للوكيل' : 'للموجه'}</span>${pill(BST, r.status || 'open')}` : '<span class="pill">غير مُحال</span>'}</div>
        <div class="mt"><span><b>${esc(r.category || '')}</b>${r.points ? ` (${AR(r.points)} نقطة)` : ''}</span><span>${dt(r.day)}${r.period ? ' · الحصة ' + AR(r.period) : ''}</span><span>رصده: ${esc(nm(r.by_staff))}</span><span>${dtt(r.created_at)}</span></div>
        ${r.note ? `<div style="white-space:pre-wrap">${esc(r.note)}</div>` : ''}${r.reply ? `<div class="small" style="background:#F1F8F4;border-radius:10px;padding:5px 10px"><b>الردّ:</b> ${esc(r.reply)}</div>` : ''}
        ${ne ? `<button type="button" class="ed btnlike" data-log="${r.id}" style="border:0;cursor:pointer">✎ عُدِّل ${AR(ne)} ${ne === 1 ? 'مرة' : 'مرات'} — آخرها ${esc(nm((r.edits[ne - 1] || {}).by))} ${dtt((r.edits[ne - 1] || {}).at)}</button>` : ''}
        <div class="ac">${!r.referred ? `<button class="btn sm" data-rf="${r.id}">إحالة</button>` : ''}<button class="btn ghost sm" data-ed="${r.id}">✎ تعديل</button><button class="btn ghost sm" data-ask="${r.id}">❓ طلب توضيح</button>
          ${r.case_id ? `<button class="btn ghost sm" data-oc="${r.case_id}">فتح الحالة</button>` : `<button class="btn ghost sm" data-nc="${r.id}">فتح حالة</button>`}
          ${r.referred && !r.case_id ? `<button class="btn ghost sm" data-un="${r.id}">سحب الإحالة</button>` : ''}<button class="btn ghost sm" data-del="${r.id}" aria-label="حذف السلوك">🗑 حذف</button></div></div>`; };
    const by = id => D.bh.find(x => x.id === id);
    const drawSel = () => { const n = [...st.sel].filter(id => by(id) && !by(id).referred).length; $('#baSel', O).innerHTML = n ? `<div class="ba-sel" role="region" aria-label="المحدد"><b>${AR(n)} محدد</b><button class="btn sm" id="baSR">إحالة المحدد</button><button class="btn sm" id="baSA">طلب توضيح من راصديها</button><button class="btn ghost sm" id="baSC" style="color:#fff;border-color:#fff">إلغاء التحديد</button></div>` : '';
      if (!n) return; $('#baSR', O).onclick = () => referDialog([...st.sel].map(by).filter(r => r && !r.referred), reload);
      $('#baSA', O).onclick = () => { const L = [...st.sel].map(by).filter(Boolean); askDialog({ about: 'behavior', list: L, to: [...new Set(L.map(r => r.by_staff))] }, reload); };
      $('#baSC', O).onclick = () => { st.sel.clear(); draw(); }; };
    const draw = () => { const L = list();
      $('#baL', O).innerHTML = L.length ? (L.length > 1 && L.some(r => !r.referred) ? `<label class="chk small"><input type="checkbox" id="baAll" ${L.filter(r => !r.referred).every(r => st.sel.has(r.id)) ? 'checked' : ''}> تحديد الكل (${AR(L.filter(r => !r.referred).length)})</label>` : '') + L.slice(0, 300).map(card).join('') + (L.length > 300 ? `<p class="small muted">يظهر أول ٣٠٠ من ${AR(L.length)} — ضيّق البحث.</p>` : '')
        : A.emptyBox(pendingTab ? 'لا يوجد سلوك غير مُحال' : 'لا نتائج', pendingTab ? 'كل ما رُصد أُحيل أو عولج' : '');
      const all = $('#baAll', O); if (all) all.onchange = () => { L.filter(r => !r.referred).forEach(r => all.checked ? st.sel.add(r.id) : st.sel.delete(r.id)); draw(); };
      $$('[data-sel]', O).forEach(i => i.onchange = () => { i.checked ? st.sel.add(i.dataset.sel) : st.sel.delete(i.dataset.sel); i.closest('.ba-card').classList.toggle('sel', i.checked); drawSel(); });
      $$('[data-rf]', O).forEach(b => b.onclick = () => referDialog([by(b.dataset.rf)], reload));
      $$('[data-ed]', O).forEach(b => b.onclick = () => editDialog(by(b.dataset.ed), reload));
      $$('[data-log]', O).forEach(b => b.onclick = () => logDialog(by(b.dataset.log)));
      $$('[data-ask]', O).forEach(b => b.onclick = () => { const r = by(b.dataset.ask); askDialog({ about: 'behavior', list: [r], to: [r.by_staff] }, reload); });
      $$('[data-oc]', O).forEach(b => b.onclick = () => { const cs = D.cases.find(x => x.id === b.dataset.oc); if (cs && A._counsel) A._counsel.openCase(cs, { student: sOf(cs.student_id) }, reload); });
      $$('[data-nc]', O).forEach(b => b.onclick = () => { const r = by(b.dataset.nc); newCase(sOf(r.student_id), D, reload, r); });
      $$('[data-un]', O).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('سحب الإحالة؟ يعود السلوك إلى «غير المُحالة» ويختفي من وارد الجهة المُحال إليها.', 'سحب الإحالة'))) return;
        A.run(b, async () => { await api.upd('behaviors', b.dataset.un, { referred: false, status: 'open' }); A.toast('سُحبت الإحالة', 'ok'); reload(); }); });
      $$('[data-del]', O).forEach(b => b.onclick = async () => { const r = by(b.dataset.del); if (!(await A.confirmBox(`حذف السلوك المرصود للطالب <b>${esc(sOf(r.student_id).full_name || '')}</b> (${esc(r.category || '')})؟ يُحفظ في سلة المحذوفات ويمكن استعادته.`, 'حذف', true))) return;
        A.run(b, async () => { await api.del('behaviors', r.id); st.sel.delete(r.id); A.toast('حُذف', 'ok'); reload(); }); });
      drawSel(); };
    const bind = (id, k, ev) => { const e = $(id, O); if (e) e[ev || 'onchange'] = x => { st[k] = x.target.type === 'checkbox' ? x.target.checked : x.target.value; draw(); }; };
    bind('#baQ', 'q', 'oninput'); bind('#baK', 'kind'); bind('#baR', 'ref'); bind('#baC', 'cls'); bind('#baB', 'by'); bind('#baF', 'from'); bind('#baT', 'to'); bind('#baE', 'edited');
    $('#baX', O).onclick = () => { if (!window.XLSX) return A.toast('مكتبة Excel غير محمّلة', 'err'); const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
      const ws = XLSX.utils.json_to_sheet(list().map(r => ({ التاريخ: r.day, الحصة: r.period || '', الطالب: sOf(r.student_id).full_name || '', الفصل: cName(r.class_id), النوع: (KIND[r.kind] || [r.kind])[0], التصنيف: r.category, النقاط: r.points || 0, الملاحظة: r.note || '', الراصد: nm(r.by_staff), الإحالة: r.referred ? (r.target === 'deputy' ? 'الوكيل' : 'الموجه') : 'غير مُحال', الحالة: r.referred ? (BST[r.status || 'open'] || [''])[0] : '', 'عدد التعديلات': (r.edits || []).length })));
      ws['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws, 'السلوك'); XLSX.writeFile(wb, `متابعة السلوك ${today()}.xlsx`); };
    draw();
  }

  // ---------- تعديل سلوك ----------
  function editDialog(r, after) {
    if (!r) return; const c = cfg(); let kind = r.kind || 'negative';
    const cats = k => { const L = k === 'positive' ? POS : NEG; return L.includes(r.category) || !r.category ? L : [r.category, ...L]; };
    const stuIn = cid => STU.filter(s => s.class_id === cid && s.active !== false).sort((a, b) => String(a.full_name).localeCompare(String(b.full_name), 'ar'));
    const clsL = (CLS || []).filter(x => x.active !== false && !x.is_test).sort((a, b) => (a.sort || 0) - (b.sort || 0) || String(a.name).localeCompare(b.name, 'ar'));
    const m = A.modal(`<h3 style="margin:0">تعديل سلوك مرصود</h3><p class="sub" style="margin:2px 0 10px">رصده ${esc(nm(r.by_staff))} · ${dtt(r.created_at)}${r.referred ? ' · <b>محال</b> (يرى الجهة المُحال إليها التعديل فوراً)' : ''}</p>
      <div class="cs-form" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px 12px">
        <div class="field"><label for="beC">الفصل</label><select class="in" id="beC">${clsL.map(x => `<option value="${x.id}" ${x.id === r.class_id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}${clsL.some(x => x.id === r.class_id) ? '' : `<option value="${r.class_id || ''}" selected>${esc(cName(r.class_id) || '—')}</option>`}</select></div>
        <div class="field"><label for="beQ">بحث عن طالب في كل الفصول</label><input class="in" id="beQ" placeholder="اكتب جزءاً من الاسم"></div>
        <div class="field" style="grid-column:1/-1"><label for="beS">الطالب</label><select class="in" id="beS"></select></div>
        <div class="field"><label>النوع</label><div class="ba-chips" id="beK">${['negative', 'positive'].map(k => `<button type="button" data-k="${k}" class="${kind === k ? 'on' : ''}" aria-pressed="${kind === k}">${KIND[k][0]}</button>`).join('')}</div></div>
        <div class="field"><label for="beCat">التصنيف</label><select class="in" id="beCat"></select><input class="in" id="beCatO" placeholder="تصنيف آخر (اختياري)" style="margin-top:6px"></div>
        <div class="field"><label for="beP">النقاط</label><input class="in" id="beP" type="number" min="0" max="50" value="${r.points || 0}"></div>
        <div class="field"><label for="beD">التاريخ</label><input class="in" id="beD" type="date" value="${r.day || today()}"></div>
        <div class="field"><label for="bePe">الحصة</label><select class="in" id="bePe"><option value="">—</option>${Array.from({ length: 9 }, (_, i) => `<option value="${i + 1}" ${+r.period === i + 1 ? 'selected' : ''}>${A.ORD ? A.ORD[i] || AR(i + 1) : AR(i + 1)}</option>`).join('')}</select></div>
        <div class="field"><label for="beB">الراصد</label><select class="in" id="beB">${staffAct().map(p => `<option value="${p.id}" ${p.id === r.by_staff ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}${staffAct().some(p => p.id === r.by_staff) ? '' : `<option value="${r.by_staff || ''}" selected>${esc(nm(r.by_staff))}</option>`}</select></div></div>
      <div class="field"><label for="beN">الملاحظة</label><textarea class="in" id="beN" rows="3">${esc(r.note || '')}</textarea></div>
      <div class="field"><label for="beR">سبب التعديل <span class="small muted">(يُحفظ في سجل التعديلات)</span></label><input class="in" id="beR" placeholder="مثال: رُصد لطالب آخر بالخطأ"></div>
      <label class="chk"><input type="checkbox" id="beNt" ${c.notify ? 'checked' : ''}> إبلاغ الراصد بالتعديل</label>
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="beGo">حفظ التعديل</button>${(r.edits || []).length ? '<button class="btn ghost" id="beLog" type="button">سجل التعديلات</button>' : ''}</div>`, { cls: 'wide' });
    const E = m.el;
    const drawStu = () => { const q = nk($('#beQ', E).value); const L = q ? STU.filter(s => s.active !== false && nk(s.full_name).includes(q)).slice(0, 80) : stuIn($('#beC', E).value);
      const cur = $('#beS', E).value || r.student_id; const has = L.some(s => s.id === cur);
      $('#beS', E).innerHTML = (has || q ? '' : `<option value="${r.student_id}">${esc(sOf(r.student_id).full_name || '—')} (الحالي)</option>`) + L.map(s => `<option value="${s.id}" ${s.id === cur ? 'selected' : ''}>${esc(s.full_name)}${q ? ' · ' + esc(cName(s.class_id)) : ''}</option>`).join(''); };
    const drawCat = () => { $('#beCat', E).innerHTML = cats(kind).map(x => `<option ${x === r.category ? 'selected' : ''}>${esc(x)}</option>`).join(''); };
    $('#beC', E).onchange = () => { $('#beQ', E).value = ''; $('#beS', E).value = ''; drawStu(); };
    $('#beQ', E).oninput = drawStu;
    $$('[data-k]', E).forEach(b => b.onclick = () => { kind = b.dataset.k; $$('[data-k]', E).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); drawCat(); });
    drawStu(); drawCat();
    const lg = $('#beLog', E); if (lg) lg.onclick = () => logDialog(r);
    $('#beGo', E).onclick = ev => A.run(ev.currentTarget, async () => {
      const sid = $('#beS', E).value; if (!sid) throw new Error('اختر الطالب'); const s = sOf(sid);
      const pe = $('#bePe', E).value;
      const p = { student_id: sid, class_id: s.class_id || $('#beC', E).value || r.class_id, kind, category: $('#beCatO', E).value.trim() || $('#beCat', E).value, points: +$('#beP', E).value || 0, day: $('#beD', E).value || r.day, period: pe ? +pe : null, note: $('#beN', E).value.trim(), by_staff: $('#beB', E).value || r.by_staff };
      const ch = Object.keys(FLD).filter(k => String(p[k] ?? '') !== String(r[k] ?? ''));
      if (!ch.length) throw new Error('لم تغيّر شيئاً');
      const reason = $('#beR', E).value.trim();
      if (DEMO) p.edits = [...(r.edits || []), { at: nowIso(), by: S.me.id, old: Object.fromEntries(ch.map(k => [k, r[k] ?? null])), reason: reason || null }];
      else p.edit_reason = reason || null;
      await api.upd('behaviors', r.id, p);
      if ($('#beNt', E).checked) { const desc = ch.map(k => `${FLD[k]}: ${fmtVal(k, r[k])} ← ${fmtVal(k, p[k])}`).join('\n');
        await notice([r.by_staff, p.by_staff], 'عُدِّل سلوك رصدته: ' + (s.full_name || ''), `عدّل ${S.me.full_name} السلوك المرصود بتاريخ ${dt(r.day)}:\n${desc}${reason ? '\nالسبب: ' + reason : ''}`, ''); }
      m.close(); A.toast('حُفظ التعديل وسُجّل في سجل التعديلات', 'ok'); after && after();
    });
  }
  const fmtVal = (k, v) => v == null || v === '' ? '—' : k === 'student_id' ? (sOf(v).full_name || '—') : k === 'class_id' ? (cName(v) || '—') : k === 'by_staff' ? nm(v) : k === 'kind' ? (KIND[v] || [v])[0] : k === 'day' ? dt(v) : String(v);
  function logDialog(r) {
    if (!r) return; const L = (r.edits || []).slice().reverse();
    A.modal(`<h3 style="margin:0">سجل تعديلات السلوك</h3><p class="sub" style="margin:2px 0 10px">${esc(sOf(r.student_id).full_name || '')} · ${esc(r.category || '')} · رصده ${esc(nm(r.by_staff))} ${dtt(r.created_at)}</p>
      <div class="ba-log">${L.map(e => `<div><b>${esc(nm(e.by))}</b> <span class="small muted">· ${dtt(e.at)}</span>${e.reason ? `<div class="small">السبب: ${esc(e.reason)}</div>` : ''}
        <table><tbody>${Object.entries(e.old || {}).map(([k, v]) => `<tr><td style="width:28%"><b>${esc(FLD[k] || k)}</b></td><td>كان: ${esc(fmtVal(k, v))}</td></tr>`).join('')}</tbody></table></div>`).join('') || '<p class="small muted">لا تعديلات</p>'}</div>
      <p class="small muted" style="margin-top:8px">القيم الحالية ظاهرة في بطاقة السلوك؛ السجل يحفظ ما كان قبل كل تعديل.</p>`, { cls: 'wide' });
  }

  // ---------- الإحالة ----------
  function referDialog(L, after) {
    L = (L || []).filter(Boolean); if (!L.length) return;
    const o = { to: 'counselor', pr: 'normal' };
    const m = A.modal(`<h3 style="margin:0">إحالة ${L.length === 1 ? 'سلوك' : AR(L.length) + ' سلوكيات'}</h3><p class="sub" style="margin:2px 0 10px">${L.length === 1 ? esc(ctxText(L[0])).replace(/\n/g, '<br>') : esc([...new Set(L.map(r => sOf(r.student_id).full_name || ''))].slice(0, 6).join('، ')) + (L.length > 6 ? '…' : '')}</p>
      <div class="field"><label>إحالة إلى</label><div class="ba-chips" id="rfTo">${Object.entries(TO).map(([k, v]) => `<button type="button" data-to="${k}" class="${o.to === k ? 'on' : ''}" aria-pressed="${o.to === k}">${v[1]} ${v[0]}</button>`).join('')}</div></div>
      <div class="field"><label>الأولوية</label><div class="ba-chips" id="rfPr">${Object.entries(PR).map(([k, v]) => `<button type="button" data-pr="${k}" class="${o.pr === k ? 'on' : ''}" aria-pressed="${o.pr === k}">${v}</button>`).join('')}</div></div>
      <div class="field"><label for="rfPa">الإجراء المتخذ قبل الإحالة</label><select class="in" id="rfPa">${PRIOR.map(x => `<option>${x}</option>`).join('')}</select></div>
      <div class="field"><label for="rfN">ملاحظتك للجهة المُحال إليها (اختياري)</label><textarea class="in" id="rfN" rows="3" placeholder="تظهر لهم في محادثة الإحالة ومع الإشعار"></textarea></div>
      <div class="row" style="gap:8px;margin-top:8px"><button class="btn" id="rfGo">إحالة</button></div>`, { cls: 'wide' });
    const E = m.el;
    const tog = (sel, key, attr) => $$(sel, E).forEach(b => b.onclick = () => { o[key] = b.dataset[attr]; $$(sel, E).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); });
    tog('[data-to]', 'to', 'to'); tog('[data-pr]', 'pr', 'pr');
    $('#rfGo', E).onclick = ev => A.run(ev.currentTarget, async () => {
      const note = $('#rfN', E).value.trim(), pa = $('#rfPa', E).value;
      for (const r of L) await api.upd('behaviors', r.id, { referred: true, target: o.to, priority: o.pr, prior_action: pa, status: 'open' });
      let ids = []; try { const fn = o.to === 'deputy' ? 'deputy_ids' : 'counselor_ids'; ids = ((await api.rpc(fn, {})) || []).map(x => (x && x[fn]) || x).filter(x => typeof x === 'string'); } catch (_) { }
      if (note && ids.length) for (const r of L) { try { await api.ins('counsel_msgs', { school_id: S.school.id, from_staff: S.me.id, kind: 'msg', ref_id: r.id, student_id: r.student_id, recipients: ids, body: note, need_ack: false, acks: {}, ...(DEMO ? { created_at: nowIso() } : {}) }); } catch (_) { } }
      const names = [...new Set(L.map(r => sOf(r.student_id).full_name || 'طالب'))];
      await notice(ids, `إحالة ${PR[o.pr]} إلى ${TO[o.to][0]}: ${names.slice(0, 3).join('، ')}${names.length > 3 ? ' و' + AR(names.length - 3) + ' آخرين' : ''}`,
        `أحال ${S.me.full_name} ${L.length === 1 ? 'سلوكاً مرصوداً' : AR(L.length) + ' سلوكيات مرصودة'}:\n${L.slice(0, 8).map(r => '• ' + ctxText(r).split('\n')[0]).join('\n')}${note ? '\nملاحظة: ' + note : ''}`, o.to === 'deputy' ? '#/deputy' : '#/counsel');
      L.forEach(r => st.sel.delete(r.id)); m.close(); A.toast(`أُحيل ${AR(L.length)} إلى ${TO[o.to][0]}${ids.length ? '' : ' (لا يوجد حساب مُسند لهذه الجهة بعد — تظهر لك في الإرشاد)'}`, ids.length ? 'ok' : 'warn'); after && after();
    });
  }

  // ---------- الحالات ----------
  function newCase(s, D, after, r) {
    if (!A._counsel || !s || !s.id) return A.toast('ملف الحالة غير متاح', 'err');
    const open = D.cases.find(c => c.student_id === s.id && c.status !== 'closed');
    if (open) return A.confirmBox(`للطالب <b>${esc(s.full_name)}</b> حالة مفتوحة «${esc(open.title || '')}». فتحها${r ? ' وضمّ هذا السلوك إليها' : ''}؟`, 'فتح الحالة').then(async ok => { if (!ok) return;
      if (r) { try { await api.upd('behaviors', r.id, { referred: true, case_id: open.id, status: 'in_progress' }); } catch (e) { A.toast(e.message || 'تعذّر الضم', 'err'); } }
      A._counsel.openCase(open, { student: s }, after); after && after(); });
    A._counsel.openCase(null, { student: s, refs: r ? [r] : [], title: r ? r.category : undefined, priority: r && r.priority }, async () => {
      if (r && !r.referred) { try { await api.upd('behaviors', r.id, { referred: true, target: 'counselor', status: 'in_progress' }); } catch (_) { } } after && after(); });
  }
  function casesTab(O, D, reload) {
    const cs = { q: '', s: 'open' };
    O.innerHTML = `<div class="ba-bar"><input class="in" id="caQ" placeholder="بحث باسم الطالب أو عنوان الحالة" aria-label="بحث"><select class="in" id="caS" aria-label="الحالة"><option value="open">المفتوحة</option><option value="">كل الحالات</option>${Object.entries(CST).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><span class="grow"></span><button class="btn sm" id="caNew" type="button">${A.I.plus || ''} فتح حالة لطالب</button></div><div class="ba-list" id="caL"></div>`;
    const draw = () => { const q = nk(cs.q); const L = D.cases.filter(c => (cs.s === 'open' ? c.status !== 'closed' : !cs.s || c.status === cs.s) && (!q || nk((sOf(c.student_id).full_name || '') + ' ' + (c.title || '')).includes(q)));
      $('#caL', O).innerHTML = L.map(c => { const s = sOf(c.student_id), n = D.bh.filter(r => r.case_id === c.id).length, late = c.follow_date && c.follow_date <= today() && c.status !== 'closed';
        return `<div class="ba-card"><div class="hd"><b>${esc(s.full_name || '')}</b><span class="small muted">${esc(cName(s.class_id))}</span><span class="pill">${esc(CST[c.status] || c.status)}</span><span class="pill">${esc(PR[c.priority || 'normal'] || '')}</span></div>
          <div class="mt"><span><b>${esc(c.title || '')}</b></span><span>فُتحت ${dt(c.opened_at)}</span><span>${AR(n)} إحالة</span><span>المسؤول: ${esc(nm(c.counselor_id))}</span>${c.follow_date ? `<span style="${late ? 'color:#C0392B;font-weight:800' : ''}">المتابعة ${dt(c.follow_date)}</span>` : ''}</div>
          <div class="ac"><button class="btn sm" data-oc="${c.id}">فتح الحالة</button><button class="btn ghost sm" data-ca="${c.id}">❓ طلب توضيح</button></div></div>`; }).join('') || A.emptyBox('لا حالات', 'افتح حالة لأي طالب من الزر أعلاه');
      $$('[data-oc]', O).forEach(b => b.onclick = () => { const c = D.cases.find(x => x.id === b.dataset.oc); A._counsel && A._counsel.openCase(c, { student: sOf(c.student_id) }, reload); });
      $$('[data-ca]', O).forEach(b => b.onclick = () => { const c = D.cases.find(x => x.id === b.dataset.ca); askDialog({ about: 'case', caseRow: c, to: [c.counselor_id].filter(Boolean) }, reload); }); };
    $('#caQ', O).oninput = e => { cs.q = e.target.value; draw(); }; $('#caS', O).onchange = e => { cs.s = e.target.value; draw(); };
    $('#caNew', O).onclick = () => pickStudent(s => newCase(s, D, reload));
    draw();
  }
  function pickStudent(cb) {
    const m = A.modal(`<h3>اختر الطالب</h3><input class="in" id="pkQ" placeholder="اسم الطالب" aria-label="اسم الطالب"><div class="ba-ppl" id="pkL" style="margin-top:8px"></div>`);
    const draw = () => { const q = nk($('#pkQ', m.el).value); $('#pkL', m.el).innerHTML = STU.filter(s => s.active !== false && (!q || nk(s.full_name).includes(q))).slice(0, 90).map(s => `<button type="button" class="btn ghost sm" data-s="${s.id}" style="justify-content:flex-start;text-align:start">${esc(s.full_name)} <span class="small muted">· ${esc(cName(s.class_id))}</span></button>`).join('') || '<p class="small muted">لا نتائج</p>';
      $$('[data-s]', m.el).forEach(b => b.onclick = () => { m.close(); cb(sOf(b.dataset.s)); }); };
    $('#pkQ', m.el).oninput = draw; draw();
  }

  // ---------- الإعدادات ----------
  function settingsTab(O, reload) {
    const c = cfg();
    const st2 = (S.school.settings || {}).tfeat || {}; const tv = st2.clarify === true ? 'all' : st2.clarify === 'some' ? 'some' : 'off';
    O.innerHTML = `<div class="ba-set" style="margin-top:10px">
      <div class="sec-box"><b>من يعدّل السلوك المرصود غير المالك؟</b><p class="small muted" style="margin:0">المالك يعدّل كل شيء دائماً. هذه القيود تفرضها قاعدة البيانات، وكل تعديل يُسجَّل باسم من عدّله ووقته وما كان قبله.</p>
        <div class="field"><label for="ssRec">الراصد (من سجّل السلوك)</label><select class="in" id="ssRec" style="max-width:320px"><option value="always" ${c.rec === 'always' ? 'selected' : ''}>يعدّل ما رصده في أي وقت</option><option value="hours" ${c.rec === 'hours' ? 'selected' : ''}>يعدّل خلال مدة محددة من الرصد</option><option value="never" ${c.rec === 'never' ? 'selected' : ''}>لا يعدّل (يطلب من المالك)</option></select></div>
        <div class="field" id="ssHw" ${c.rec === 'hours' ? '' : 'hidden'}><label for="ssH">المدة بالساعات</label><input class="in" id="ssH" type="number" min="1" max="720" value="${c.hours}" style="max-width:140px"></div>
        <label class="chk"><input type="checkbox" id="ssC" ${c.cnsl ? 'checked' : ''}> الموجه الطلابي يعدّل السلوك المرصود</label>
        <label class="chk"><input type="checkbox" id="ssD" ${c.dep ? 'checked' : ''}> الوكيل يعدّل الإحالات الموجهة إليه</label>
        <label class="chk"><input type="checkbox" id="ssR" ${c.reason ? 'checked' : ''}> سبب التعديل إلزامي لغير المالك</label></div>
      <div class="sec-box"><b>العرض والتنبيه</b>
        <div class="field"><label for="ssP">تبويب «غير المُحالة» يعرض</label><select class="in" id="ssP" style="max-width:320px"><option value="negative" ${c.pend !== 'all' ? 'selected' : ''}>السلوك الذي يحتاج متابعة فقط</option><option value="all" ${c.pend === 'all' ? 'selected' : ''}>كل السلوك (والإيجابي)</option></select></div>
        <label class="chk"><input type="checkbox" id="ssN" ${c.notify ? 'checked' : ''}> إبلاغ الراصد افتراضياً عند تعديل ما رصده</label></div>
      <div class="sec-box"><b>صفحة «طلبات التوضيح» للموظفين</b><p class="small muted" style="margin:0">ليردّ الموظف من المنصة يحتاج تفعيل الصفحة له. الحالة الآن: <b>${tv === 'all' ? 'مفعّلة للجميع' : tv === 'some' ? 'مفعّلة لـ' + AR((((S.school.settings || {}).tfeatTo || {}).clarify || []).length) + ' موظف' : 'مخفية'}</b>. تُفعَّل تلقائياً لمن ترسل له طلباً (يمكنك إلغاء ذلك عند الإرسال)، أو من «تخصيص صفحة المعلم».</p></div>
      <div class="row"><button class="btn" id="ssGo">حفظ الإعدادات</button></div></div>`;
    $('#ssRec', O).onchange = e => { $('#ssHw', O).hidden = e.target.value !== 'hours'; };
    $('#ssGo', O).onclick = ev => A.run(ev.currentTarget, async () => {
      const v = { rec: $('#ssRec', O).value, hours: Math.max(1, Math.min(720, +$('#ssH', O).value || 24)), cnsl: $('#ssC', O).checked, dep: $('#ssD', O).checked, reason: $('#ssR', O).checked, pend: $('#ssP', O).value, notify: $('#ssN', O).checked };
      await saveSettings({ bhedit: v }); A.toast('حُفظت الإعدادات', 'ok'); reload(); });
  }
  async function saveSettings(patch) { const settings = { ...(S.school.settings || {}), ...patch }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; }

  // ============ طلبات التوضيح ============
  function askDialog(ctx, after) {
    if (!canAsk()) return A.toast('إرسال طلبات التوضيح للمالك', 'err');
    const pick = new Set((ctx.to || []).filter(id => id && id !== S.me.id));
    const people = staffAct().filter(p => p.id !== S.me.id);
    const L = ctx.list || [];
    const about = ctx.about || 'general';
    const ctxLine = about === 'behavior' && L.length ? (L.length === 1 ? 'بشأن السلوك المرصود: ' + ctxText(L[0]) : `بشأن ${AR(L.length)} سلوكيات مرصودة:\n` + L.slice(0, 12).map(r => '• ' + ctxText(r).split('\n')[0]).join('\n'))
      : about === 'case' && ctx.caseRow ? `بشأن الحالة الإرشادية: ${sOf(ctx.caseRow.student_id).full_name || ''} — ${ctx.caseRow.title || ''}` : '';
    const defT = about === 'behavior' && L.length ? 'توضيح بشأن ' + (L.length === 1 ? 'رصد سلوك: ' + (sOf(L[0].student_id).full_name || '') : 'سلوكيات مرصودة') : about === 'case' && ctx.caseRow ? 'توضيح بشأن حالة: ' + (sOf(ctx.caseRow.student_id).full_name || '') : '';
    let stuId = about === 'case' && ctx.caseRow ? ctx.caseRow.student_id : (L.length === 1 ? L[0].student_id : null);
    const m = A.modal(`<h3 style="margin:0">طلب توضيح</h3><p class="sub" style="margin:2px 0 10px">يصل الطلب لكل مستلم وحده مع إشعار، ويردّ عليك من صفحة «طلبات التوضيح»، وتتابع الردود من «متابعة السلوك ← طلبات التوضيح».</p>
      ${ctxLine ? `<div class="ba-warn" style="background:#F2F8FD;border-color:#CFE3F5;color:#082B5A;white-space:pre-wrap">${esc(ctxLine)}</div>` : `<div class="field"><label>الموضوع</label><div class="ba-chips" id="akA">${[['general', 'عام'], ['student', 'بشأن طالب']].map(([k, l]) => `<button type="button" data-ab="${k}" class="${k === 'general' ? 'on' : ''}" aria-pressed="${k === 'general'}">${l}</button>`).join('')}</div><div id="akStu" hidden style="margin-top:6px"><button type="button" class="btn ghost sm" id="akStuB">اختيار الطالب</button> <b id="akStuN"></b></div></div>`}
      <div class="field"><label>المستلمون <span class="small muted" id="akN"></span></label>
        <div class="ba-chips" style="margin-bottom:6px">${L.length ? '<button type="button" data-g="rec">الراصدون</button>' : ''}<button type="button" data-g="cns">الموجهون</button><button type="button" data-g="x">إلغاء التحديد</button></div>
        <input class="in" id="akQ" placeholder="بحث بالاسم أو المسمى" style="max-width:280px" aria-label="بحث في الموظفين"><div class="ba-ppl" id="akP" style="margin-top:6px">${people.map(p => `<label data-nm="${esc(nk(p.full_name + ' ' + (p.title || '')))}"><input type="checkbox" value="${p.id}"> ${esc(p.full_name)}${p.title ? ` <span class="small muted">· ${esc(p.title)}</span>` : ''}</label>`).join('')}</div></div>
      <div class="field"><label for="akT">العنوان</label><input class="in" id="akT" value="${esc(defT)}" placeholder="مثال: توضيح سبب رصد الغياب"></div>
      <div class="field"><label for="akB">المطلوب توضيحه</label><textarea class="in" id="akB" rows="4" placeholder="اكتب سؤالك أو ما تريد توضيحه"></textarea></div>
      <div class="field"><label for="akD">المطلوب الرد قبل (اختياري)</label><input class="in" type="date" id="akD" style="max-width:180px"></div>
      <div id="akW"></div>
      ${A.noticeMsgBox ? A.noticeMsgBox('akM') : '<label class="chk small"><input type="checkbox" id="akM"> إرسال كرسالة أيضاً في صندوق الرسائل</label>'}
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="akGo">إرسال الطلب</button></div>`, { cls: 'wide' });
    const E = m.el; let ab = about;
    const sync = () => { $$('#akP input', E).forEach(i => { i.checked = pick.has(i.value); }); $('#akN', E).textContent = pick.size ? AR(pick.size) + ' مستلم' : 'اختر مستلماً';
      const off = [...pick].filter(id => !tfOn(id)); $('#akW', E).innerHTML = off.length ? `<div class="ba-warn" style="display:grid;gap:6px"><div>صفحة «طلبات التوضيح» غير مفعّلة لـ: <b>${esc(off.map(nm).join('، '))}</b>.</div><label class="chk" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="akEn" checked> تفعيلها لهم الآن ليردّوا من المنصة</label><div class="small">إن ألغيت التفعيل يصلهم الطلب رسالةً فقط ولا يستطيعون الرد عليه من المنصة.</div></div>` : ''; };
    $$('#akP input', E).forEach(i => i.onchange = () => { i.checked ? pick.add(i.value) : pick.delete(i.value); sync(); });
    $('#akQ', E).oninput = e => { const v = nk(e.target.value); $$('#akP label', E).forEach(l => l.hidden = !!v && !l.dataset.nm.includes(v)); };
    $$('[data-g]', E).forEach(b => b.onclick = async () => { const g = b.dataset.g; if (g === 'x') pick.clear(); else if (g === 'rec') L.forEach(r => r.by_staff && r.by_staff !== S.me.id && pick.add(r.by_staff)); else { try { const r = await api.rpc('counselor_ids', {}); (r || []).map(x => (x && x.counselor_ids) || x).filter(x => typeof x === 'string' && x !== S.me.id).forEach(id => pick.add(id)); } catch (_) { } } sync(); });
    $$('[data-ab]', E).forEach(b => b.onclick = () => { ab = b.dataset.ab; $$('[data-ab]', E).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); $('#akStu', E).hidden = ab !== 'student'; });
    const sb = $('#akStuB', E); if (sb) sb.onclick = () => pickStudent(s => { stuId = s.id; $('#akStuN', E).textContent = s.full_name + ' · ' + cName(s.class_id); if (!$('#akT', E).value.trim()) $('#akT', E).value = 'توضيح بشأن الطالب: ' + s.full_name; });
    sync();
    $('#akGo', E).onclick = ev => A.run(ev.currentTarget, async () => {
      if (!pick.size) throw new Error('اختر مستلماً واحداً على الأقل');
      const title = $('#akT', E).value.trim(); if (title.length < 3) throw new Error('اكتب عنوان الطلب');
      const txt = $('#akB', E).value.trim(); if (txt.length < 3) throw new Error('اكتب المطلوب توضيحه');
      if (ab === 'student' && !stuId) throw new Error('اختر الطالب');
      const en = $('#akEn', E), off = [...pick].filter(id => !tfOn(id));
      if (en && en.checked && off.length) { const s0 = S.school.settings || {}, tf = { ...(s0.tfeat || {}) }, to = { ...(s0.tfeatTo || {}) };
        if (tf.clarify !== true) { tf.clarify = 'some'; to.clarify = [...new Set([...(to.clarify || []), ...off])]; } await saveSettings({ tfeat: tf, tfeatTo: to }); }
      const ctxPre = ab === 'student' && stuId ? `بشأن الطالب: ${sOf(stuId).full_name || ''} — ${cName(sOf(stuId).class_id)}` : ctxLine;
      const body = (ctxPre ? ctxPre + '\n\n' : '') + txt, due = $('#akD', E).value || null;
      const rows = [...pick].map(id => ({ school_id: S.school.id, from_staff: S.me.id, to_staff: id, about: ab, behavior_id: L.length === 1 ? L[0].id : null, case_id: ab === 'case' && ctx.caseRow ? ctx.caseRow.id : null, student_id: stuId || null, title, body, due_date: due, status: 'open', ...(DEMO ? { created_at: nowIso(), updated_at: nowIso(), read_at: null } : {}) }));
      await api.ins('clar_requests', rows);
      const asMsg = $('#akM', E).checked, noOn = [...pick].filter(id => !tfOn(id));
      // القاعدة تُرسل الإشعار تلقائياً؛ الرسالة لمن طلبها المالك أو لمن لم تُفعَّل له الصفحة
      const msgTo = asMsg ? [...pick] : noOn;
      if (msgTo.length && api.sendMessages) await api.sendMessages(msgTo.map(id => ({ recipient_id: id, subject: 'طلب توضيح: ' + title, body: body + (tfOn(id) ? '\n— للرد: افتح «طلبات التوضيح» في المنصة.' : '') }))).catch(() => { });
      if (DEMO) await notice([...pick], 'طلب توضيح: ' + title, body, '#/clarify');
      m.close(); A.toast(`أُرسل طلب التوضيح إلى ${AR(pick.size)}`, 'ok'); after && after();
    });
  }

  // قائمة الطلبات (المرسلة للمالك/المانح، أو الواردة للموظف)
  function clarList(O, reqs, reload, sentView) {
    const f = { s: sentView ? '' : 'open', q: '', who: '' };
    const base = reqs.filter(r => sentView ? (own() || r.from_staff === S.me.id) : r.to_staff === S.me.id);
    const ppl = [...new Set(base.map(r => sentView ? r.to_staff : r.from_staff))].map(id => [id, nm(id)]);
    O.innerHTML = `<div class="ba-bar"><select class="in" id="crS" aria-label="الحالة"><option value="">كل الطلبات</option>${Object.entries(CRS).map(([k, v]) => `<option value="${k}" ${f.s === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
      <select class="in" id="crW" aria-label="${sentView ? 'المستلم' : 'المرسل'}"><option value="">${sentView ? 'كل المستلمين' : 'كل المرسلين'}</option>${ppl.map(([id, n]) => `<option value="${id}">${esc(n)}</option>`).join('')}</select>
      <input class="in" id="crQ" placeholder="بحث" aria-label="بحث"><span class="grow"></span>${sentView || canAsk() ? `<button class="btn sm" id="crNew" type="button">❓ طلب جديد</button>` : ''}</div><div class="ba-list" id="crL"></div>`;
    const draw = () => { const q = nk(f.q); const L = base.filter(r => (!f.s || r.status === f.s) && (!f.who || (sentView ? r.to_staff : r.from_staff) === f.who) && (!q || nk(r.title + ' ' + r.body + ' ' + nm(r.to_staff) + ' ' + nm(r.from_staff)).includes(q)));
      $('#crL', O).innerHTML = L.map(r => { const late = r.status === 'open' && r.due_date && r.due_date < today();
        return `<div class="ba-card" style="border-inline-start-color:${r.status === 'open' ? (late ? '#D2463F' : '#D99A2B') : '#2E8B57'}"><div class="hd"><b>${esc(r.title)}</b>${pill(CRS, r.status)}<span class="pill">${esc(ABOUT[r.about] || '')}</span>${late ? '<span class="pill st-returned">متأخر</span>' : ''}</div>
          <div class="mt"><span>${sentView ? 'إلى' : 'من'}: <b>${esc(nm(sentView ? r.to_staff : r.from_staff))}</b></span><span>${dtt(r.created_at)}</span>${r.due_date ? `<span>الرد قبل ${dt(r.due_date)}</span>` : ''}${sentView ? `<span>${r.read_at ? 'اطّلع ' + dtt(r.read_at) : 'لم يطّلع بعد'}</span>` : ''}</div>
          <div class="small" style="white-space:pre-wrap;max-height:4.6em;overflow:hidden">${esc(r.body)}</div><div class="ac"><button class="btn sm" data-th="${r.id}">${sentView ? 'فتح المحادثة' : (r.status === 'open' ? 'الرد' : 'فتح')}</button></div></div>`; }).join('') || A.emptyBox(sentView ? 'لا طلبات توضيح' : 'لا طلبات توضيح موجهة إليك', sentView ? 'أرسل طلباً من زر «طلب توضيح» أو من بطاقة أي سلوك أو حالة' : '');
      $$('[data-th]', O).forEach(b => b.onclick = () => clarThread(base.find(x => x.id === b.dataset.th), reload)); };
    $('#crS', O).onchange = e => { f.s = e.target.value; draw(); }; $('#crW', O).onchange = e => { f.who = e.target.value; draw(); }; $('#crQ', O).oninput = e => { f.q = e.target.value; draw(); };
    const nb = $('#crNew', O); if (nb) nb.onclick = () => askDialog({ about: 'general' }, reload);
    draw();
  }
  async function clarThread(r, after) {
    if (!r) return; const asker = r.from_staff === S.me.id || own(), mine = r.to_staff === S.me.id;
    const m = A.modal(`<div class="fm-top" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start"><div class="grow" style="flex:1"><h3 style="margin:0">${esc(r.title)}</h3><p class="sub" style="margin:2px 0 0">من ${esc(nm(r.from_staff))} إلى ${esc(nm(r.to_staff))} · ${dtt(r.created_at)}${r.due_date ? ' · الرد قبل ' + dt(r.due_date) : ''} · <span id="ctSt">${pill(CRS, r.status)}</span></p></div>
      ${asker ? `<div class="row" style="gap:6px"><button class="btn ghost sm" id="ctCl" type="button">${r.status === 'closed' ? 'إعادة فتح' : 'إغلاق الطلب'}</button><button class="btn ghost sm" id="ctPr" type="button">${A.I.print || ''} طباعة</button><button class="btn ghost sm" id="ctDl" type="button" aria-label="حذف الطلب">🗑</button></div>` : ''}</div>
      <div class="ba-th" id="ctL" style="margin-top:10px"><div class="spinner"></div></div>
      ${r.status === 'closed' && !asker ? '<p class="small muted">أُغلق هذا الطلب.</p>' : `<div class="row" style="gap:8px;align-items:flex-end;margin-top:10px;flex-wrap:nowrap"><textarea class="in" id="ctT" rows="2" style="flex:1" placeholder="${mine ? 'اكتب توضيحك' : 'متابعة أو سؤال إضافي'}" aria-label="الرد"></textarea><button class="btn" id="ctGo">إرسال</button></div>`}`, { cls: 'wide' });
    const E = m.el; let reps = [];
    const load = async () => { reps = await api.list('clar_replies', { request_id: r.id }, { order: 'created_at' }).catch(() => []);
      const all = [{ from_staff: r.from_staff, body: r.body, created_at: r.created_at, q: true }, ...reps];
      $('#ctL', E).innerHTML = all.map(x => `<div class="ba-msg ${x.from_staff === S.me.id ? 'me' : ''} ${x.q ? 'q' : ''}"><div class="h"><b>${esc(nm(x.from_staff))}</b><span>${x.q ? 'الطلب · ' : ''}${dtt(x.created_at)}</span></div><div style="white-space:pre-wrap">${esc(x.body)}</div></div>`).join('');
      const t = $('#ctL', E); t.scrollTop = t.scrollHeight; };
    if (mine && !r.read_at) { try { await api.upd('clar_requests', r.id, { read_at: nowIso() }); r.read_at = nowIso(); } catch (_) { } }
    const go = $('#ctGo', E); if (go) go.onclick = ev => A.run(ev.currentTarget, async () => { const body = $('#ctT', E).value.trim(); if (!body) throw new Error('اكتب الرد');
      await api.ins('clar_replies', { request_id: r.id, school_id: S.school.id, from_staff: S.me.id, body, ...(DEMO ? { created_at: nowIso() } : {}) });
      const ns = mine ? 'answered' : 'open';
      if (DEMO) { await api.upd('clar_requests', r.id, { status: ns, updated_at: nowIso() }); await notice([mine ? r.from_staff : r.to_staff], (mine ? 'ردّ على طلب التوضيح: ' : 'متابعة على طلب التوضيح: ') + r.title, body, '#/clarify'); }
      r.status = ns; $('#ctSt', E).innerHTML = pill(CRS, ns); $('#ctT', E).value = ''; await load(); after && after(); });
    const cl = $('#ctCl', E); if (cl) cl.onclick = ev => A.run(ev.currentTarget, async () => { const ns = r.status === 'closed' ? (reps.some(x => x.from_staff === r.to_staff) ? 'answered' : 'open') : 'closed'; await api.upd('clar_requests', r.id, { status: ns, updated_at: nowIso() }); r.status = ns; m.close(); A.toast(ns === 'closed' ? 'أُغلق الطلب' : 'أُعيد فتح الطلب', 'ok'); after && after(); });
    const dl = $('#ctDl', E); if (dl) dl.onclick = async () => { if (!(await A.confirmBox('حذف طلب التوضيح وكل ردوده؟', 'حذف', true))) return; A.run(dl, async () => { await api.del('clar_requests', r.id); m.close(); A.toast('حُذف', 'ok'); after && after(); }); };
    const pr = $('#ctPr', E); if (pr) pr.onclick = () => A.printDoc && A.printDoc('طلب توضيح', `${nm(r.from_staff)} ← ${nm(r.to_staff)} · ${dt(r.created_at)}`,
      `<h3>${esc(r.title)}</h3><table><tr><th>من</th><th>إلى</th><th>التاريخ</th><th>الحالة</th></tr><tr><td>${esc(nm(r.from_staff))}</td><td>${esc(nm(r.to_staff))}</td><td>${dt(r.created_at)}</td><td>${esc(CRS[r.status][0])}</td></tr></table>
       <h3>المطلوب توضيحه</h3><p style="white-space:pre-wrap;line-height:1.9">${esc(r.body)}</p><h3>الردود</h3>${reps.length ? `<table><tr><th>التاريخ</th><th>من</th><th>الرد</th></tr>${reps.map(x => `<tr><td>${dtt(x.created_at)}</td><td>${esc(nm(x.from_staff))}</td><td style="white-space:pre-wrap">${esc(x.body)}</td></tr>`).join('')}</table>` : '<p>—</p>'}
       <table style="margin-top:28px"><tr><th>المستلم</th><th>صاحب الطلب</th></tr><tr><td style="height:56px">${esc(nm(r.to_staff))}</td><td>${esc(nm(r.from_staff))}</td></tr></table>`);
    load(); const ta = $('#ctT', E); if (ta) setTimeout(() => ta.focus(), 60);
  }

  // صفحة الموظف: طلبات التوضيح الواردة إليه (والمرسلة إن مُنح «clarify»)
  const cst = { tab: 'in' };
  V.clarify = async function (root) {
    if (!S.me) return;
    if (own()) { st.tab = 'clar'; location.hash = '#/bhadmin'; return; }
    if (!(canAsk() || (A.tfeat && A.tfeat('clarify')))) { root.innerHTML = `<div class="card">${A.emptyBox('هذه الصفحة غير مفعّلة لحسابك', 'يفعّلها المالك')}</div>`; return; }
    root.innerHTML = '<div class="spinner"></div>';
    const reqs = await api.list('clar_requests', { school_id: S.school.id }, { order: 'created_at', desc: true }).catch(() => []);
    const inL = reqs.filter(r => r.to_staff === S.me.id), outL = reqs.filter(r => r.from_staff === S.me.id);
    const T = [['in', 'الواردة إليّ', inL.filter(r => r.status === 'open').length], canAsk() && ['out', 'المرسلة', 0]].filter(Boolean);
    if (!T.some(t => t[0] === cst.tab)) cst.tab = 'in';
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>طلبات التوضيح</h2><p class="sub" style="margin:2px 0 0">طلبات التوضيح الموجهة إليك من الإدارة. اكتب توضيحك في الطلب، ويصل لصاحبه إشعار فوراً.</p></div></div>
      ${T.length > 1 ? `<div class="fm-tabs" role="tablist">${T.map(([k, l, n]) => `<button role="tab" data-tb="${k}" class="${cst.tab === k ? 'on' : ''}" aria-selected="${cst.tab === k}">${l}${n ? `<span class="n">${AR(n)}</span>` : ''}</button>`).join('')}</div>` : ''}<div id="clO"></div></div>`;
    $$('[data-tb]', root).forEach(b => b.onclick = () => { cst.tab = b.dataset.tb; V.clarify(root); });
    if (canAsk() && !STU.length) await load().catch(() => { });
    clarList($('#clO', root), cst.tab === 'in' ? inL : outL, () => V.clarify(root), cst.tab === 'out');
  };

  // تنبيه لحظي بطلب توضيح جديد
  let subbed = false; const prev = window.APP_AFTER_WEEK;
  window.APP_AFTER_WEEK = async function () {
    if (prev) await prev.apply(this, arguments);
    if (subbed || !api.subscribe || !S.me) return; subbed = true;
    try { api.subscribe('clar-' + S.me.id, 'clar_requests', null, p => { const n = p && p.new; if (n && p.eventType === 'INSERT' && n.to_staff === S.me.id) A.toast('وصلك طلب توضيح: ' + String(n.title || '').slice(0, 60), 'info'); }); } catch (_) { }
  };
  A._bhadmin = { editDialog, referDialog, askDialog, clarThread, logDialog };
})();
