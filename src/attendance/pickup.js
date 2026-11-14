/* منصة دينا — النداء الآلي للاستئذان (V.pcall) — sql/106، بوابة ولي الأمر family.html، شاشة الفصل call.html
   المراحل الموثقة: طلب ← اعتماد ← في الطريق ← نداء (اقتراب ولي الأمر من المدرسة بالموقع أو نداء يدوي) ← خرج من الفصل ← التسليم.
   الإشعارات حسب الأدوار المسندة (المعتمدون، البوابة)، وشاشة الفصل/البوابة برمز سري.
   مخفي عن الجميع حتى يفعّله المالك: لولي الأمر بـ settings.pickup.mode (off|all|some + phones)، وللموظفين بـ tfeat('pcall'). */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A || !V) return;
  const { S, api, $, $$, esc, AR } = A;
  A.I.pcall = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
  if (A.NOTIF_KINDS && !A.NOTIF_KINDS.pickup) A.NOTIF_KINDS.pickup = ['النداء والاستئذان', 'طلبات الاستئذان ونداءات أولياء الأمور'];
  const isOwner = () => !!(S.me && S.me.is_owner);
  const cfgRaw = () => ((S.school || {}).settings || {}).pickup || {};
  const inStaff = () => { const c = cfgRaw().staff || {}, id = S.me && S.me.id; return [...(c.approve || []), ...(c.gate || [])].includes(id); };
  const isStaff = () => !!(S.me && (isOwner() || inStaff() || (A.hasModule && ['attendance', 'deputy', 'counselor'].some(k => A.hasModule(k)))));
  const on = () => !!(S.me && (isOwner() || (A.tfeat && A.tfeat('pcall') && isStaff())));
  if (A.NAV && !A.NAV.some(n => n[0] === 'pcall')) { const i = A.NAV.findIndex(n => n[0] === 'pmsg'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['pcall', 'النداء والاستئذان', () => on()]); }
  const DEF = { mode: 'off', phones: [], approve: true, auto: true, confirm: true, alerts: true, radius: 300, stages: { coming: true, release: true, handover: true }, staff: { approve: [], gate: [] }, from: '06:30', to: '14:00', voice: true, reasons: ['موعد طبي', 'ظرف عائلي', 'وعكة صحية', 'سفر', 'أخرى'] };
  const cfg = () => { const c = cfgRaw(), h = ((S.school || {}).settings || {}).hr || {}; return Object.assign({}, DEF, { lat: h.lat ?? null, lng: h.lng ?? null }, c, { stages: Object.assign({}, DEF.stages, c.stages || {}), staff: Object.assign({}, DEF.staff, c.staff || {}) }); };
  const ST = { requested: ['طلب جديد', '#a85d00', '#fff1d6', '📝'], approved: ['معتمد', '#005499', '#e5f1fb', '✅'], coming: ['في الطريق', '#06648f', '#e5f3fb', '🚗'], called: ['نداء', '#17814a', '#e3f5ea', '📣'], released: ['خرج من الفصل', '#2E8B57', '#eaf6df', '🚶'], handed: ['سُلّم — بانتظار تأكيد ولي الأمر', '#7a4b00', '#fff8e8', '✍️'], done: ['اكتمل', '#40526a', '#eef1f5', '🤝'], rejected: ['مرفوض', '#c62d22', '#fde8e6', '✖'], cancelled: ['ملغى', '#5b6b7f', '#eef1f5', '↺'] };
  const hm = s => s ? new Date(s).toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit' }) : '';
  const ERR = { 'no permission': 'ليست لديك صلاحية', CLOSED: 'الطلب منتهٍ', STATE: 'لا يمكن تنفيذ ذلك في هذه المرحلة' };
  const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const base = () => location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '');

  /* وضع التجربة */
  const DM = { calls: [] };
  A.__pickDemo = DM;
  async function demo(n, a) {
    const nm = (S.me || {}).full_name, stu = await api.list('students', {}), cl = S.allClasses || S.classes || [];
    const step = (c, st, note) => { c.status = st; c.trail.push({ st, at: new Date().toISOString(), name: nm, note }); if (st === 'called') c.called_at = new Date().toISOString(); };
    if (n === 'pickup_list') return DM.calls.map(c => { const s = stu.find(x => x.id === c.student_id) || {}; return Object.assign({}, c, { student: s.full_name, class: (cl.find(x => x.id === s.class_id) || {}).name, class_id: s.class_id, phone: s.guardian_phone, parent: 'ولي الأمر' }); }).reverse();
    if (n === 'pickup_new') { const c = { id: Math.random().toString(36).slice(2), student_id: a.p_student, reason: a.p_reason, person: a.p_person, day: today(), status: 'requested', trail: [{ st: 'requested', at: new Date().toISOString(), name: nm, note: 'سُجّل من المدرسة' }], at: new Date().toISOString() }; DM.calls.push(c); step(c, 'approved'); if (a.p_call) step(c, 'called'); return { id: c.id, status: c.status }; }
    if (n === 'pickup_act') { const c = DM.calls.find(x => x.id === a.p_id); const st = { approve: 'approved', reject: 'rejected', call: 'called', release: 'released', done: cfg().confirm && c.account && c.status !== 'handed' ? 'handed' : 'done', cancel: 'cancelled' }[a.p_act]; step(c, st, a.p_note); return { ok: true, status: c.status }; }
    return null;
  }
  const rpc = async (n, a) => { if (api.demo) return demo(n, a); try { const r = await api.rpc(n, a); if (r && r.error) throw new Error(ERR[r.error] || r.error); return r; } catch (e) { throw new Error(ERR[e.message] || e.message); } };

  if (!document.getElementById('pccss')) { const st = document.createElement('style'); st.id = 'pccss'; st.textContent = `
.pc-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}
.pc-tabs button{font:inherit;font-weight:800;border:1.5px solid #C9D7EC;background:#fff;color:#005499;border-radius:999px;padding:8px 16px;cursor:pointer;min-height:44px}
.pc-tabs button[aria-selected="true"]{background:#082B5A;color:#fff;border-color:#082B5A}
.pc-board{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px}
.pc-col{border:1px solid #DCE7F3;border-radius:18px;background:linear-gradient(180deg,#F8FBFE,#EEF4FB);padding:10px;min-height:120px}
.pc-col h3{margin:0 0 8px;font-size:15px;display:flex;align-items:center;gap:6px;color:#082B5A}.pc-col h3 .n{margin-inline-start:auto;background:#082B5A;color:#fff;border-radius:99px;font-size:12px;min-width:24px;height:24px;display:inline-grid;place-items:center;padding:0 6px}
.pc-card{background:#fff;border:1px solid #DCE7F3;border-inline-start:5px solid var(--c,#3AB1DB);border-radius:14px;padding:10px 12px;margin-bottom:8px;box-shadow:0 8px 18px -16px rgba(8,43,90,.6)}
.pc-card b{display:block;font-size:15.5px}.pc-card .m{font-size:12.5px;color:#56657f}
.pc-card .acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.pc-card.flash{animation:pcf 1.2s ease-in-out 3}
@keyframes pcf{50%{box-shadow:0 0 0 5px rgba(46,139,87,.35)}}
.pc-trail{display:flex;gap:4px;flex-wrap:wrap;margin-top:6px}.pc-trail span{font-size:11px;border-radius:99px;padding:1px 8px;background:#EEF4FB;color:#30476b}
.pc-box{border:1px solid #DCE7F3;border-radius:16px;padding:14px;background:linear-gradient(180deg,#fff,#F5F9FD);margin-bottom:12px}
.pc-box h3{margin:0 0 8px;color:#082B5A;font-size:16px}
.pc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px}
.pc-opt{display:flex;gap:10px;align-items:flex-start;border:1px solid #DCE7F3;border-radius:14px;padding:10px 12px;margin-bottom:8px;background:#fff;cursor:pointer}
.pc-opt input{width:20px;height:20px;accent-color:#005499;flex:none;margin-top:3px}
.pc-pick{max-height:240px;overflow:auto;border:1px solid #DCE7F3;border-radius:12px;background:#fff}
.pc-pick label{display:flex;gap:8px;align-items:center;padding:6px 10px;border-bottom:1px solid #EEF2F8;cursor:pointer}
.pc-note{border:1px solid #bfe0f1;background:#eef8fd;color:#0b4f72;border-radius:14px;padding:10px 12px;font-size:13.5px;margin:0 0 12px}
@media (prefers-reduced-motion:reduce){.pc-card.flash{animation:none}}
`; document.head.appendChild(st); }

  let tab = null, timer = null, seen = new Set();
  const TABS = () => [['today', 'اليوم'], ['log', 'السجل'], ...(isOwner() ? [['set', 'الإعدادات']] : [])];
  V.pcall = async function (root) {
    if (!on()) { root.innerHTML = `<div class="card">${A.emptyBox('غير متاح لحسابك')}</div>`; return; }
    tab = tab || 'today'; if (!TABS().some(t => t[0] === tab)) tab = 'today';
    clearInterval(timer);
    const c = cfg();
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">النداء الآلي والاستئذان</h2><p class="sub" style="margin:2px 0 0">ولي الأمر يطلب الاستئذان من البوابة، وعند اقترابه من المدرسة يُنادى ابنه على شاشة الفصل ويُبلَّغ المسؤولون — وكل مرحلة موثّقة بوقتها ومنفّذها.</p></div>
      <span class="pill ${c.mode === 'off' ? 'st-returned' : 'st-approved'}">${c.mode === 'off' ? 'متوقف لأولياء الأمور' : c.mode === 'all' ? 'مفعّل للجميع' : 'مفعّل لـ ' + AR((c.phones || []).length) + ' حساب'}</span></div>
      <div class="pc-tabs" role="tablist">${TABS().map(([k, n]) => `<button role="tab" data-pt="${k}" aria-selected="${k === tab}">${n}</button>`).join('')}</div><div id="pcB"></div></div>`;
    $$('[data-pt]', root).forEach(b => b.onclick = () => { tab = b.dataset.pt; V.pcall(root); });
    const B = $('#pcB', root);
    if (tab === 'today') return board(B);
    if (tab === 'log') return log(B);
    return settings(B, root);
  };

  /* ---------- اللوحة الحية ---------- */
  const COLS = [['new', 'بانتظار الاعتماد', ['requested'], '📝'], ['wait', 'معتمد / في الطريق', ['approved', 'coming'], '🚗'], ['call', 'نداء — أرسلوا الطالب', ['called'], '📣'], ['out', 'خرج / بانتظار تأكيد ولي الأمر', ['released', 'handed'], '🚶'], ['end', 'منتهٍ اليوم', ['done', 'rejected', 'cancelled'], '🤝']];
  const beep = () => { try { const x = new (window.AudioContext || window.webkitAudioContext)(), o = x.createOscillator(), g = x.createGain(); o.connect(g); g.connect(x.destination); o.frequency.value = 880; g.gain.setValueAtTime(.15, x.currentTime); g.gain.exponentialRampToValueAtTime(.001, x.currentTime + .6); o.start(); o.stop(x.currentTime + .6); } catch (_) { } };
  async function board(B) {
    const c = cfg();
    B.innerHTML = `${c.mode === 'off' && isOwner() ? '<div class="pc-note">الميزة متوقفة لأولياء الأمور الآن — يمكنك تجربتها من هنا بتسجيل استئذان يدوي، ثم فعّلها من «الإعدادات» للجميع أو لحسابات تختارها.</div>' : ''}
      <div class="row" style="gap:8px;margin-bottom:10px;flex-wrap:wrap"><button class="btn ok" id="pcNew">+ تسجيل استئذان</button>${c.token ? `<a class="btn ghost" href="call.html?t=${encodeURIComponent(c.token)}" target="_blank" rel="noopener">فتح شاشة النداء</a>` : ''}<button class="btn ghost" id="pcRf">تحديث</button><span class="small muted" id="pcAt"></span></div>
      <div class="pc-board" id="pcL"><div class="spinner"></div></div>`;
    let L = [];
    const draw = () => {
      const by = {}; COLS.forEach(([k, , sts]) => by[k] = L.filter(x => sts.includes(x.status)));
      $('#pcL', B).innerHTML = COLS.map(([k, n, , e]) => `<section class="pc-col" aria-label="${n}"><h3><span aria-hidden="true">${e}</span>${n}<span class="n">${AR(by[k].length)}</span></h3>${by[k].map(x => card(x)).join('') || '<div class="small muted" style="text-align:center;padding:12px">—</div>'}</section>`).join('');
      $$('[data-pa]', B).forEach(b => b.onclick = () => A.run(b, async () => { let note = null; if (b.dataset.pa === 'reject') { note = await ask('سبب الرفض (يصل لولي الأمر)'); if (note === null) return; } if (b.dataset.pa === 'done' && b.dataset.st === 'handed') { note = await ask('سبب الإغلاق دون تأكيد ولي الأمر (يُوثَّق)'); if (note === null || !note) return; } await rpc('pickup_act', { p_id: b.dataset.id, p_act: b.dataset.pa, p_note: note }); await load(); }));
      $('#pcAt', B).textContent = 'آخر تحديث ' + hm(new Date());
    };
    const card = x => { const s = ST[x.status] || ST.requested, fl = x.status === 'called' && !seen.has(x.id);
      const acts = { requested: [['approve', 'اعتماد', 'ok'], ['reject', 'رفض', 'ghost']], approved: [['call', 'نداء الآن', ''], ['cancel', 'إلغاء', 'ghost']], coming: [['call', 'نداء الآن', ''], ['cancel', 'إلغاء', 'ghost']], called: c.stages.release ? [['release', 'خرج من الفصل', 'ok'], ['done', 'سُلّم', 'ghost']] : [['done', 'سُلّم', 'ok']], released: [['done', 'تم التسليم', 'ok']], handed: [['done', 'إغلاق دون تأكيد', 'ghost']] }[x.status] || [];
      return `<div class="pc-card ${fl ? 'flash' : ''}" style="--c:${s[1]}"><b>${esc(x.student || '')}</b><div class="m">${esc(x.class || '')} · ${esc(x.reason || 'استئذان')}</div><div class="m">المستلم: ${esc(x.person || '—')}${x.phone ? ` · <a href="tel:${esc(x.phone)}" dir="ltr">${esc(x.phone)}</a>` : ''}${x.dist != null && ['approved', 'coming'].includes(x.status) ? ` · يبعد ${x.dist >= 1000 ? AR((x.dist / 1000).toFixed(1)) + ' كم' : AR(x.dist) + ' م'}` : ''}</div>
        <div class="pc-trail">${(x.trail || []).map(t => `<span title="${esc(t.name || '')}${t.note ? ' — ' + esc(t.note) : ''}">${(ST[t.st] || [t.st])[0]} ${hm(t.at)}</span>`).join('')}</div>
        ${acts.length ? `<div class="acts">${acts.map(([a, n, cl]) => `<button class="btn ${cl} sm" data-pa="${a}" data-id="${x.id}" data-st="${x.status}">${n}</button>`).join('')}</div>` : ''}</div>`; };
    const load = async () => { try { const l = await rpc('pickup_list', { p_from: null, p_to: null }) || []; const nw = l.filter(x => x.status === 'called' && !seen.has(x.id)); if (L.length && nw.length) { beep(); A.toast('📣 نداء جديد: ' + nw.map(x => x.student).join('، '), 'ok'); } L = l; draw(); L.filter(x => x.status === 'called').forEach(x => seen.add(x.id)); } catch (e) { $('#pcL', B).innerHTML = A.emptyBox('تعذّر التحميل', esc(e.message)); } };
    $('#pcRf', B).onclick = load; $('#pcNew', B).onclick = () => newCall(load);
    await load();
    timer = setInterval(() => { if (!document.body.contains(B)) return clearInterval(timer); if (document.visibilityState === 'visible') load(); }, 15000);
  }
  const ask = label => new Promise(res => { const m = A.modal(`<h3>${esc(label)}</h3><input class="in" id="pcAsk" maxlength="300"><div class="row" style="margin-top:10px;gap:8px"><button class="btn" id="pcOk">تأكيد</button><button class="btn ghost" id="pcNo">إلغاء</button></div>`, { onClose: () => res(null) });
    $('#pcOk', m.el).onclick = () => { const v = $('#pcAsk', m.el).value.trim(); res(v); m.close(); }; $('#pcNo', m.el).onclick = () => m.close(); });
  function newCall(done) {
    const C = (S.allClasses || S.classes || []).filter(c => c.active !== false).slice().sort(A.cmpCls || (() => 0)), c = cfg();
    const m = A.modal(`<h3>تسجيل استئذان</h3><p class="sub">عندما يتصل ولي الأمر أو يحضر دون البوابة الإلكترونية. يُوثَّق باسمك.</p>
      <div class="pc-grid"><label class="small">الفصل <select class="in" id="ncC">${C.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label><label class="small">الطالب <select class="in" id="ncS"></select></label>
        <label class="small">السبب <select class="in" id="ncR">${(c.reasons || DEF.reasons).map(x => `<option>${esc(x)}</option>`).join('')}</select></label><label class="small">المستلم <input class="in" id="ncP" placeholder="مثال: الأب"></label></div>
      <label class="row small" style="gap:6px;margin-top:8px"><input type="checkbox" id="ncNow" checked> ولي الأمر موجود الآن — أطلق النداء فوراً</label>
      <div class="row" style="margin-top:10px"><button class="btn ok" id="ncGo">تسجيل</button></div>`, { cls: 'wide' });
    const fill = async () => { const l = (await api.list('students', { class_id: $('#ncC', m.el).value })).filter(s => s.active !== false).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar')); $('#ncS', m.el).innerHTML = l.map(s => `<option value="${s.id}">${esc(s.full_name)}</option>`).join(''); };
    $('#ncC', m.el).onchange = fill; fill();
    $('#ncGo', m.el).onclick = e => A.run(e.currentTarget, async () => { if (!$('#ncS', m.el).value) throw new Error('اختر الطالب'); if ($('#ncP', m.el).value.trim().length < 2) throw new Error('اكتب اسم المستلم');
      await rpc('pickup_new', { p_student: $('#ncS', m.el).value, p_reason: $('#ncR', m.el).value, p_person: $('#ncP', m.el).value.trim(), p_call: $('#ncNow', m.el).checked }); m.close(); A.toast('سُجّل', 'ok'); done && done(); });
  }

  /* ---------- السجل ---------- */
  async function log(B) {
    const d1 = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    B.innerHTML = `<div class="row" style="gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:flex-end"><label class="small">من <input class="in" type="date" id="lgF" value="${d1}" style="width:auto"></label><label class="small">إلى <input class="in" type="date" id="lgT" value="${today()}" style="width:auto"></label><button class="btn" id="lgGo">عرض</button><button class="btn ghost" id="lgX">Excel</button></div><div id="lgL"></div>`;
    let L = [];
    const dur = (a, b) => a && b ? Math.round((new Date(b) - new Date(a)) / 60000) : null;
    const go = async () => { $('#lgL', B).innerHTML = '<div class="spinner"></div>'; try { L = await rpc('pickup_list', { p_from: $('#lgF', B).value, p_to: $('#lgT', B).value }) || []; } catch (e) { $('#lgL', B).innerHTML = A.emptyBox('تعذّر التحميل', esc(e.message)); return; }
      const done = L.filter(x => x.status === 'done'), w = done.map(x => dur(x.called_at, x.done_at)).filter(x => x != null), avg = w.length ? Math.round(w.reduce((a, b) => a + b, 0) / w.length) : null;
      $('#lgL', B).innerHTML = `<div class="pal-k" style="margin-bottom:10px"><div class="k"><b>${AR(L.length)}</b>طلب</div><div class="k ok"><b>${AR(done.length)}</b>سُلّم</div><div class="k bad"><b>${AR(L.filter(x => x.status === 'rejected').length)}</b>مرفوض</div><div class="k info"><b>${avg == null ? '—' : AR(avg) + ' د'}</b>متوسط النداء ← التسليم</div></div>
        <div class="scroll"><table class="tbl"><thead><tr><th>اليوم</th><th>الطالب</th><th>السبب</th><th>المستلم</th><th>الحالة</th><th>المراحل</th></tr></thead><tbody>${L.map(x => `<tr><td class="small">${esc(x.day)}</td><td style="text-align:start"><b>${esc(x.student)}</b><div class="small muted">${esc(x.class || '')}</div></td><td>${esc(x.reason || '')}</td><td>${esc(x.person || '')}</td><td><span class="pill" style="background:${(ST[x.status] || ST.requested)[2]};color:${(ST[x.status] || ST.requested)[1]}">${(ST[x.status] || [x.status])[0]}</span></td><td class="small" style="text-align:start">${(x.trail || []).map(t => `${(ST[t.st] || [t.st])[0]} ${hm(t.at)}${t.name ? ' (' + esc(t.name) + ')' : ''}`).join(' ← ')}</td></tr>`).join('') || `<tr><td colspan="6">${A.emptyBox('لا طلبات في الفترة')}</td></tr>`}</tbody></table></div>`; };
    $('#lgGo', B).onclick = go; await go();
    $('#lgX', B).onclick = () => { if (!window.XLSX || !L.length) return A.toast('لا بيانات', 'err'); const ws = XLSX.utils.json_to_sheet(L.map(x => { const t = {}; (x.trail || []).forEach(s => t[s.st] = s); return { 'اليوم': x.day, 'الطالب': x.student, 'الفصل': x.class, 'السبب': x.reason, 'المستلم': x.person, 'جوال ولي الأمر': x.phone || '', 'الحالة': (ST[x.status] || [x.status])[0], 'الطلب': hm((t.requested || {}).at), 'الاعتماد': hm((t.approved || {}).at), 'المعتمِد': (t.approved || {}).name || '', 'النداء': hm(x.called_at), 'خرج من الفصل': hm(x.released_at), 'التسليم': hm(x.done_at), 'سلّمه': (t.done || {}).name || '', 'المسافة عند آخر موقع (م)': x.dist ?? '' }; })); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الاستئذان'); XLSX.writeFile(wb, `سجل الاستئذان ${$('#lgF', B).value} - ${$('#lgT', B).value}.xlsx`); };
  }

  /* ---------- الإعدادات (المالك) ---------- */
  /** يستخرج الإحداثيات من رابط خرائط جوجل أو نص «lat, lng» */
  A.parseLatLng = t => { const s = decodeURIComponent(String(t || '')); let m = s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/) || s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/) || s.match(/[?&](?:q|query|ll|destination|daddr)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/) || s.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[,،\s]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    if (!m) return null; const lat = +m[1], lng = +m[2]; return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat: +lat.toFixed(6), lng: +lng.toFixed(6) } : null; };
  async function settings(B, root) {
    const c = cfg(), staff = (S.staff || []).filter(x => x.active !== false).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
    let fams = []; try { fams = api.demo ? [] : (await api.rpc('parent_codes_list', { p_section: null })) || []; } catch (_) { fams = []; }
    const pick = (k, sel) => `<div class="pc-pick" data-pk="${k}">${staff.map(x => `<label><input type="checkbox" value="${x.id}" ${sel.includes(x.id) ? 'checked' : ''}>${esc(x.full_name)}${x.is_owner ? ' <span class="small muted">(مالك)</span>' : ''}</label>`).join('')}</div>`;
    B.innerHTML = `<div class="pc-grid">
      <div class="pc-box"><h3>التفعيل لأولياء الأمور</h3>
        <select class="in" id="ssM"><option value="off" ${c.mode === 'off' ? 'selected' : ''}>متوقف (لا يظهر لأي ولي أمر)</option><option value="some" ${c.mode === 'some' ? 'selected' : ''}>لحسابات أختارها</option><option value="all" ${c.mode === 'all' ? 'selected' : ''}>لكل أولياء الأمور</option></select>
        <div id="ssPh" style="margin-top:8px;${c.mode === 'some' ? '' : 'display:none'}"><input class="in" id="ssQ" placeholder="ابحث باسم ولي الأمر أو الطالب"><div class="pc-pick" style="margin-top:6px">${fams.map(f => `<label data-q="${esc(A.normKey((f.gname || '') + ' ' + f.kids.map(k => k.name).join(' ')))}"><input type="checkbox" value="${f.phone}" ${(c.phones || []).includes(f.phone) ? 'checked' : ''}>${esc(f.gname || 'ولي الأمر')} <span class="small muted">· ${esc(f.kids.map(k => k.name.split(' ')[0]).join('، '))}${f.activated ? '' : ' · لم يفعّل'}</span></label>`).join('') || '<div class="small muted" style="padding:8px">أنشئ رموز أولياء الأمور أولاً</div>'}</div></div>
        <label class="pc-opt" style="margin-top:8px"><input type="checkbox" id="ssA" ${c.approve ? 'checked' : ''}><span><b>يحتاج اعتماد المدرسة</b><div class="small muted">وإلا يُعتمد تلقائياً عند الطلب.</div></span></label>
        <label class="pc-opt"><input type="checkbox" id="ssAu" ${c.auto ? 'checked' : ''}><span><b>نداء تلقائي عند الاقتراب</b><div class="small muted">يُطلق النداء عندما يدخل ولي الأمر نطاق المدرسة.</div></span></label>
        <div class="pc-grid" style="gap:8px"><label class="small">يبدأ <input class="in" type="time" id="ssF" value="${esc(c.from || '')}"></label><label class="small">ينتهي <input class="in" type="time" id="ssT" value="${esc(c.to || '')}"></label></div>
        <label class="small" style="display:block;margin-top:8px">الأسباب (سطر لكل سبب) <textarea class="in" id="ssR" rows="4">${esc((c.reasons || []).join('\n'))}</textarea></label></div>
      <div class="pc-box"><h3>موقع المدرسة</h3>
        <label class="small">الصق رابط خرائط جوجل أو الإحداثيات <input class="in" id="ssL" dir="ltr" placeholder="https://www.google.com/maps/@21.54,39.17,17z  أو  21.54, 39.17"></label>
        <div class="small muted" style="margin-top:4px">الروابط المختصرة (maps.app.goo.gl) افتحها أولاً ثم انسخ الرابط الطويل من شريط العنوان، أو اضغط مطولاً على الموقع في الخريطة وانسخ الإحداثيات.</div>
        <div class="pc-grid" style="gap:8px;margin-top:8px"><label class="small">خط العرض <input class="in" id="ssLa" dir="ltr" value="${c.lat ?? ''}"></label><label class="small">خط الطول <input class="in" id="ssLo" dir="ltr" value="${c.lng ?? ''}"></label></div>
        <label class="small" style="display:block;margin-top:8px">نطاق النداء: <b id="ssRv">${AR(c.radius || 300)}</b> م <input type="range" id="ssRa" min="50" max="2000" step="25" value="${c.radius || 300}" style="width:100%"></label>
        <div class="row" style="gap:8px;margin-top:6px;flex-wrap:wrap"><button class="btn ghost sm" id="ssMe">📍 موقعي الحالي</button><a class="btn ghost sm" id="ssMap" target="_blank" rel="noopener">عرض على الخريطة</a></div></div>
      <div class="pc-box"><h3>المراحل</h3>
        <label class="pc-opt"><input type="checkbox" id="ssS1" ${c.stages.coming ? 'checked' : ''}><span><b>«في الطريق»</b><div class="small muted">تظهر المسافة للمسؤولين قبل الوصول.</div></span></label>
        <label class="pc-opt"><input type="checkbox" id="ssS2" ${c.stages.release ? 'checked' : ''}><span><b>«خرج من الفصل»</b><div class="small muted">يؤكدها المعلم من شاشة الفصل أو المسؤول.</div></span></label>
        <label class="pc-opt"><input type="checkbox" id="ssS3" ${c.stages.handover ? 'checked' : ''}><span><b>«التسليم»</b><div class="small muted">يؤكدها مسؤول البوابة.</div></span></label>
        <label class="pc-opt"><input type="checkbox" id="ssCf" ${c.confirm !== false ? 'checked' : ''}><span><b>تأكيد ولي الأمر للاستلام (إلزامي)</b><div class="small muted">بعد «التسليم» لا يكتمل الطلب حتى يضغط ولي الأمر «تأكيد استلام ابني»؛ والإغلاق دونه يحتاج سبباً يُوثَّق.</div></span></label>
        <label class="pc-opt"><input type="checkbox" id="ssAl" ${c.alerts !== false ? 'checked' : ''}><span><b>تنبيه ولي الأمر بكل مرحلة</b><div class="small muted">صوت واهتزاز وإشعار على جهازه عند الاعتماد والنداء والخروج والتسليم (أثناء فتح البوابة).</div></span></label>
        <label class="pc-opt"><input type="checkbox" id="ssV" ${c.voice ? 'checked' : ''}><span><b>نداء صوتي على الشاشة</b><div class="small muted">نغمة + قراءة اسم الطالب بالعربية.</div></span></label></div>
      <div class="pc-box"><h3>الأدوار والإشعارات</h3><div class="small"><b>يعتمدون الطلبات ويُبلَّغون بالنداء</b></div>${pick('approve', c.staff.approve || [])}<div class="small" style="margin-top:8px"><b>مسؤولو البوابة (يُبلَّغون بالنداء والخروج)</b></div>${pick('gate', c.staff.gate || [])}
        <div class="small muted" style="margin-top:6px">بلا تحديد: تصل طلبات الاعتماد للمالك. ويستطيع المالك وصلاحيات الحضور والوكيل والإرشاد إدارة الطلبات من هذه الصفحة.</div></div>
      <div class="pc-box"><h3>شاشة النداء (الفصل / البوابة)</h3><p class="small muted" style="margin:0 0 8px">تُفتح على شاشة الفصل أو البوابة دون حساب، برمز سري. تجديد الرمز يوقف الروابط القديمة.</p>
        <div id="ssScr"></div><div class="row" style="gap:8px;margin-top:8px"><button class="btn ghost sm" id="ssTok">${c.token ? 'تجديد الرمز' : 'إنشاء رمز الشاشة'}</button></div></div></div>
      <div class="row" style="margin-top:10px"><button class="btn ok" id="ssSave">حفظ الإعدادات</button></div>`;
    let token = c.token || '';
    const mapLink = () => { const la = $('#ssLa', B).value.trim(), lo = $('#ssLo', B).value.trim(); $('#ssMap', B).href = la && lo ? `https://www.google.com/maps/search/?api=1&query=${la},${lo}` : '#'; };
    const scr = () => { const C = (S.allClasses || S.classes || []).filter(x => x.active !== false).slice().sort(A.cmpCls || (() => 0));
      $('#ssScr', B).innerHTML = token ? `<div class="row" style="gap:6px;flex-wrap:wrap"><a class="btn sm" href="call.html?t=${encodeURIComponent(token)}" target="_blank" rel="noopener">شاشة البوابة (كل الفصول)</a><button class="btn ghost sm" data-cp="${base()}call.html?t=${encodeURIComponent(token)}">نسخ الرابط</button></div>
        <label class="small" style="display:block;margin-top:8px">رابط شاشة فصل <select class="in" id="ssCl">${C.map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></label><div class="row" style="gap:6px;margin-top:6px"><a class="btn ghost sm" id="ssClGo" target="_blank" rel="noopener">فتح</a><button class="btn ghost sm" id="ssClCp">نسخ</button></div>` : '<div class="small muted">لا يوجد رمز بعد.</div>';
      $$('[data-cp]', B).forEach(b => b.onclick = () => navigator.clipboard.writeText(b.dataset.cp).then(() => A.toast('نُسخ', 'ok')));
      const cl = $('#ssCl', B); if (cl) { const u = () => `${base()}call.html?t=${encodeURIComponent(token)}&c=${cl.value}`; const set = () => $('#ssClGo', B).href = u(); cl.onchange = set; set(); $('#ssClCp', B).onclick = () => navigator.clipboard.writeText(u()).then(() => A.toast('نُسخ', 'ok')); } };
    scr(); mapLink();
    $('#ssM', B).onchange = e => $('#ssPh', B).style.display = e.target.value === 'some' ? '' : 'none';
    if ($('#ssQ', B)) $('#ssQ', B).oninput = e => { const q = A.normKey(e.target.value.trim()); $$('#ssPh label', B).forEach(l => l.style.display = !q || (l.dataset.q || '').includes(q) ? '' : 'none'); };
    $('#ssL', B).oninput = e => { const p = A.parseLatLng(e.target.value); if (p) { $('#ssLa', B).value = p.lat; $('#ssLo', B).value = p.lng; mapLink(); A.toast('استُخرجت الإحداثيات', 'ok'); } };
    $('#ssLa', B).oninput = mapLink; $('#ssLo', B).oninput = mapLink;
    $('#ssRa', B).oninput = e => $('#ssRv', B).textContent = AR(e.target.value);
    $('#ssMe', B).onclick = e => { if (!navigator.geolocation) return A.toast('المتصفح لا يدعم الموقع', 'err'); const b = e.currentTarget; b.disabled = true; navigator.geolocation.getCurrentPosition(p => { $('#ssLa', B).value = p.coords.latitude.toFixed(6); $('#ssLo', B).value = p.coords.longitude.toFixed(6); mapLink(); b.disabled = false; A.toast('حُدّد الموقع (الدقة ' + AR(Math.round(p.coords.accuracy)) + ' م)', 'ok'); }, () => { b.disabled = false; A.toast('تعذّر تحديد الموقع', 'err'); }, { enableHighAccuracy: true, timeout: 20000 }); };
    $('#ssTok', B).onclick = async () => { if (token && !(await A.confirmBox('تجديد رمز الشاشة؟ ستتوقف الروابط المفتوحة حالياً حتى تُفتح بالرابط الجديد.', 'تجديد'))) return; const a = new Uint8Array(18); crypto.getRandomValues(a); token = [...a].map(x => 'abcdefghijkmnpqrstuvwxyz23456789'[x % 32]).join(''); scr(); A.toast('احفظ الإعدادات لاعتماد الرمز', 'ok'); };
    $('#ssSave', B).onclick = e => A.run(e.currentTarget, async () => {
      const la = $('#ssLa', B).value.trim(), lo = $('#ssLo', B).value.trim(), mode = $('#ssM', B).value;
      if ((la || lo) && !A.parseLatLng(`${la},${lo}`)) throw new Error('الإحداثيات غير صحيحة');
      if (mode !== 'off' && !(la && lo)) throw new Error('حدد موقع المدرسة أولاً حتى يعمل النداء بالموقع');
      const pickup = { mode, phones: mode === 'some' ? $$('#ssPh input:checked', B).map(i => i.value) : (c.phones || []), approve: $('#ssA', B).checked, auto: $('#ssAu', B).checked, from: $('#ssF', B).value, to: $('#ssT', B).value,
        reasons: $('#ssR', B).value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 12), lat: la ? +la : null, lng: lo ? +lo : null, radius: +$('#ssRa', B).value,
        stages: { coming: $('#ssS1', B).checked, release: $('#ssS2', B).checked, handover: $('#ssS3', B).checked }, voice: $('#ssV', B).checked, confirm: $('#ssCf', B).checked, alerts: $('#ssAl', B).checked,
        staff: { approve: $$('[data-pk="approve"] input:checked', B).map(i => i.value), gate: $$('[data-pk="gate"] input:checked', B).map(i => i.value) }, token };
      if (mode === 'some' && !pickup.phones.length) throw new Error('اختر حساباً واحداً على الأقل');
      const settings = { ...(S.school.settings || {}), pickup }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings;
      A.toast('حُفظت الإعدادات', 'ok'); V.pcall(root);
    });
  }
})();
