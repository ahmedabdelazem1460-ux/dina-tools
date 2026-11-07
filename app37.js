/* منصة دينا — جداول الإشراف والمناوبة المرتبطة بالجدول الزمني
   فترات (قبل الطابور، كل فسحة، الانصراف، أثناء حصة، أو وقت مخصص) تُحسب أوقاتها من «اليوم الدراسي والجدول الزمني» النشط في ذلك اليوم،
   فإذا تغيّر الجدول الزمني (رمضان، يوم مختصر) تتغير أوقات المناوبة تلقائياً. لكل فترة أماكن وعدد مناوبين، وتوزيع عادل آلي بلا تعارض،
   ومتابعة لحظية: من في موقعه الآن، تسجيل التواجد من المناوب نفسه أو المسؤول، الغياب والبديل، وتقرير العدالة والالتزام. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR, DAYS, PER, I } = A;
  A.I.duty = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6z"/><path d="M12 8v4l2.5 1.5"/></svg>';
  const uid = () => Math.random().toString(36).slice(2, 9);
  const today = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const nowMin = () => { const d = new Date(Date.now() + 3 * 36e5); return d.getUTCHours() * 60 + d.getUTCMinutes(); };
  const dowOf = iso => A.parseDate(iso).getDay();
  const pn = id => A.personName(id) || '—';
  const can = () => S.me && (S.me.is_owner || A.perm('structure') || A.perm('timetable_edit') || (A.hasModule && (A.hasModule('supervision') || A.hasModule('attendance'))));
  if (A.NAV && !A.NAV.some(n => n[0] === 'duty')) { const i = A.NAV.findIndex(n => n[0] === 'board'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['duty', 'الإشراف والمناوبة', () => can()]); }

  // ---------- الأوقات من الجدول الزمني ----------
  const bellCtx = (sec, iso) => { const b = A.bell.bellOf(sec), s = A.bell.activeSched(b, iso || today()); return { b, s, P: A.bell.maxP(s, sec) }; };
  const KINDS = [['start', 'قبل بداية اليوم (الطابور)'], ['break', 'فسحة'], ['end', 'بعد نهاية اليوم (الانصراف)'], ['period', 'أثناء حصة'], ['custom', 'وقت مخصص']];
  const toMin = t => { const [h, m] = String(t || '00:00').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  function breakTime(s, P, brId) {
    const br = (s.breaks || []).find(x => x.id === brId); if (!br) return null;
    const it = A.bell.timeline(s, P, (br.classes || [])[0] || null).items; const k = it.findIndex(x => x.k === 'p' && x.i === +br.after - 1);
    const b = it.slice(k + 1).find(x => x.k === 'b' && x.label === (br.label || 'الفسحة')) || it.slice(k + 1).find(x => x.k === 'b');
    return b ? { from: b.from, to: b.to } : null;
  }
  function slotTime(sl, sec, iso) {
    try {
      const { s, P } = bellCtx(sec, iso), tl = A.bell.timeline(s, P, null);
      if (sl.kind === 'start') return { from: tl.start - (+sl.lead || 20), to: tl.start + (+sl.tail || 0) };
      if (sl.kind === 'end') return { from: tl.end - (+sl.tail || 0), to: tl.end + (+sl.lead || 20) };
      if (sl.kind === 'break') { const t = breakTime(s, P, sl.ref); if (t) return t; const any = tl.items.filter(x => x.k === 'b')[+sl.idx || 0]; return any ? { from: any.from, to: any.to } : null; }
      if (sl.kind === 'period') { const p = tl.items.find(x => x.k === 'p' && x.i === +sl.ref); return p ? { from: p.from, to: p.to } : null; }
      return { from: toMin(sl.from), to: toMin(sl.to) };
    } catch (_) { return null; }
  }
  const fmtT = (m, sec) => { try { return A.bell.fmt(m, bellCtx(sec).s); } catch (_) { return AR(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')); } };
  const range = (t, sec) => t ? `<span dir="ltr" style="display:inline-block;direction:rtl">${fmtT(t.from, sec)} – ${fmtT(t.to, sec)}</span>` : '—';
  const rangeTxt = (t, sec) => t ? `${fmtT(t.from, sec)} – ${fmtT(t.to, sec)}` : '';

  const cfgOf = sec => { const c = Object.assign({ slots: [], roster: {}, excl: [], perDay: 1, maxWeek: 0, gen: null }, JSON.parse(JSON.stringify(sec.duty || {}))); c.slots.forEach(x => { x.places = x.places || [{ n: '', need: 1 }]; x.days = Array.isArray(x.days) ? x.days : null; }); return c; };
  const daysOf = sec => Array.from({ length: sec.days || 5 }, (_, i) => i);
  const slotDays = (sl, sec) => sl.days && sl.days.length ? daysOf(sec).filter(d => sl.days.includes(d)) : daysOf(sec);
  const key = (sl, d, pi) => sl.id + '|' + d + '|' + pi;
  function defaults(sec) {
    const { s } = bellCtx(sec);
    const out = [{ id: uid(), name: 'الإشراف الصباحي', kind: 'start', lead: 20, places: [{ n: 'البوابة الرئيسية', need: 1 }, { n: 'الساحة والطابور', need: 2 }] }];
    (s.breaks || []).slice().sort((a, b) => a.after - b.after).forEach(br => out.push({ id: uid(), name: 'إشراف ' + (br.label || 'الفسحة'), kind: 'break', ref: br.id, places: [{ n: 'الساحة', need: 2 }, { n: 'الممرات', need: 1 }, { n: 'المقصف', need: 1 }] }));
    out.push({ id: uid(), name: 'مناوبة الانصراف', kind: 'end', lead: 30, places: [{ n: 'البوابة الرئيسية', need: 1 }, { n: 'منطقة انتظار الطلاب', need: 1 }] });
    return out;
  }

  // ---------- المنسوبون والأنصبة ----------
  let CACHE = null;
  async function load(sec) {
    if (CACHE && CACHE.sec === sec.id && Date.now() - CACHE.at < 120000) return CACHE;
    const vers = await api.list('timetable_versions', { status: 'approved' }).catch(() => []);
    const slots = vers.length ? await api.list('timetable_slots', { version_id: vers.map(v => v.id) }).catch(() => []) : [];
    const loadN = {}; slots.forEach(x => { if (x.teacher_id && x.subject_id) loadN[x.teacher_id] = (loadN[x.teacher_id] || 0) + 1; });
    const busy = new Set(slots.filter(x => x.teacher_id && x.subject_id).map(x => x.teacher_id + '|' + x.day + '|' + x.period));
    const mem = new Set((S.memberships || []).filter(m => m.section_id === sec.id).map(m => m.staff_id));
    const T = (S.staff || []).filter(x => x.active !== false && !x.is_owner && (mem.has(x.id) || loadN[x.id])).map(x => x.id).sort((a, b) => pn(a).localeCompare(pn(b), 'ar'));
    CACHE = { sec: sec.id, at: Date.now(), load: loadN, busy, T }; return CACHE;
  }
  const overlap = (a, b) => a && b && a.from < b.to && b.from < a.to;

  function generate(cfg, sec, C) {
    const R = {}, cnt = {}, dayCnt = {}, miss = [];
    const elig = C.T.filter(t => !cfg.excl.includes(t));
    const times = Object.fromEntries(cfg.slots.map(sl => [sl.id, slotTime(sl, sec)]));
    const takenAt = {}; // t|d → [ranges]
    const order = [];
    daysOf(sec).forEach(d => cfg.slots.forEach(sl => { if (!slotDays(sl, sec).includes(d)) return; sl.places.forEach((pl, pi) => { for (let k = 0; k < (+pl.need || 1); k++) order.push({ sl, d, pi, k }); }); }));
    // الأصعب أولاً: فترات أثناء الحصص لأن المؤهلين فيها أقل
    order.sort((a, b) => (a.sl.kind === 'period' ? 0 : 1) - (b.sl.kind === 'period' ? 0 : 1) || a.d - b.d);
    order.forEach(({ sl, d, pi }) => {
      const kk = key(sl, d, pi); R[kk] = R[kk] || []; const tm = times[sl.id];
      const ok = t => !R[kk].includes(t) && (sl.kind !== 'period' || !C.busy.has(t + '|' + d + '|' + sl.ref)) && (dayCnt[t + '|' + d] || 0) < (+cfg.perDay || 1) && (!cfg.maxWeek || (cnt[t] || 0) < +cfg.maxWeek) && !(takenAt[t + '|' + d] || []).some(r => overlap(r, tm));
      const c = elig.filter(ok).sort((a, b) => (cnt[a] || 0) - (cnt[b] || 0) || (C.load[a] || 0) - (C.load[b] || 0) || Math.random() - 0.5);
      if (!c.length) { miss.push(`${DAYS[d]} · ${sl.name} · ${sl.places[pi].n || 'موقع'}`); return; }
      const t = c[0]; R[kk].push(t); cnt[t] = (cnt[t] || 0) + 1; dayCnt[t + '|' + d] = (dayCnt[t + '|' + d] || 0) + 1; (takenAt[t + '|' + d] = takenAt[t + '|' + d] || []).push(tm);
    });
    return { roster: R, miss };
  }
  const saveCfg = async (sec, cfg) => { const r = await api.rpc('save_duty', { p_section: sec.id, p_duty: cfg }); sec.duty = r || cfg; return sec.duty; };
  const ERR = m => ({ 'no permission': 'ليست لديك صلاحية — المالك أو صلاحية الجداول أو الإشراف أو الحضور', 'future day': 'لا يمكن التسجيل ليوم قادم' })[m] || m;

  // تكليفات يوم معيّن (مرتّبة بالوقت)
  function dayList(sec, iso, cfg) {
    cfg = cfg || cfgOf(sec); const d = dowOf(iso), out = [];
    cfg.slots.forEach(sl => { if (!slotDays(sl, sec).includes(d)) return; const tm = slotTime(sl, sec, iso); sl.places.forEach((pl, pi) => (cfg.roster[key(sl, d, pi)] || []).filter(Boolean).forEach(t => out.push({ sl, pl, pi, t, tm }))); });
    return out.sort((a, b) => ((a.tm || {}).from || 0) - ((b.tm || {}).from || 0));
  }
  A.dutyDay = dayList;
  const stOf = (tm, iso) => { if (!tm) return ''; if (iso < today()) return 'done'; if (iso > today()) return 'next'; const n = nowMin(); return n >= tm.to ? 'done' : n >= tm.from ? 'now' : n >= tm.from - 15 ? 'soon' : 'next'; };
  const ST = { now: ['جارية الآن', 'ok'], soon: ['تبدأ قريباً', 'warn'], next: ['لاحقاً', ''], done: ['انتهت', 'faint'] };
  const LG = { present: ['في موقعه', 'st-approved'], late: ['متأخر', 'st-returned'], absent: ['غائب', 'st-returned'], swap: ['بديل', 'st-submitted'] };

  // ---------- الصفحة ----------
  V.duty = async function (root) {
    if (!can()) { root.innerHTML = `<div class="card">${A.emptyBox('غير متاح لحسابك')}</div>`; return; }
    const sec = A.section(); let tab = A.LS.get('du_t') || (cfgOf(sec).slots.length ? 'today' : 'setup');
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">الإشراف والمناوبة — ${esc(sec.name)}</h2><p class="sub" style="margin:2px 0 0">الأوقات مرتبطة بالجدول الزمني النشط لكل يوم؛ إذا تغيّر الجدول الزمني تتغير أوقات المناوبة تلقائياً.</p></div></div>
      <div class="kpick" id="duT"><button data-t="today">اليوم — المتابعة اللحظية</button><button data-t="roster">الجدول الأسبوعي</button><button data-t="setup">الفترات والأماكن</button><button data-t="stats">العدالة والالتزام</button></div><div id="duB" style="margin-top:10px"><div class="spinner"></div></div></div>`;
    $$('#duT button', root).forEach(b => { b.classList.toggle('on', b.dataset.t === tab); b.onclick = () => { A.LS.set('du_t', b.dataset.t); V.duty(root); }; });
    const B = $('#duB', root); let C; try { C = await load(sec); } catch (e) { B.innerHTML = A.emptyBox('تعذّر التحميل', esc(e.message)); return; }
    ({ today: tToday, roster: tRoster, setup: tSetup, stats: tStats })[tab](B, sec, C, root);
  };

  // ---------- الفترات والأماكن ----------
  function tSetup(B, sec, C, root) {
    const cfg = cfgOf(sec); const { s, P } = bellCtx(sec);
    const draw = () => {
      B.innerHTML = `<div class="notice info" style="display:block">الجدول الزمني النشط اليوم: <b>${esc(s.name)}</b> — يبدأ ${fmtT(A.bell.timeline(s, P, null).start, sec)}. عدّل الفسحات وأوقات الحصص من «استوديو الجداول ← اليوم الدراسي والجدول الزمني».</div>
        ${cfg.slots.length ? '' : `<div class="card" style="text-align:center;padding:18px"><p>لا توجد فترات بعد.</p><button class="btn ok" id="duDef">إنشاء الفترات تلقائياً من الجدول الزمني</button></div>`}
        <div class="du-sl">${cfg.slots.map((sl, i) => { const tm = slotTime(sl, sec); return `<div class="sec-box du-c"><div class="row" style="gap:6px;flex-wrap:wrap">
            <input class="in" data-f="${i}|name" value="${esc(sl.name)}" aria-label="اسم الفترة" style="flex:1 1 180px;font-weight:700">
            <select class="in" data-f="${i}|kind" aria-label="الارتباط بالوقت" style="width:auto">${KINDS.map(([k, n]) => `<option value="${k}" ${sl.kind === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
            ${sl.kind === 'break' ? `<select class="in" data-f="${i}|ref" style="width:auto" aria-label="الفسحة">${(s.breaks || []).map(br => `<option value="${br.id}" ${sl.ref === br.id ? 'selected' : ''}>${esc(br.label || 'الفسحة')} — بعد الحصة ${AR(br.after)}${(br.classes || []).length ? ' (صفوف محددة)' : ''}</option>`).join('') || '<option>لا توجد فسحات</option>'}</select>` : ''}
            ${sl.kind === 'period' ? `<select class="in" data-f="${i}|ref" style="width:auto" aria-label="الحصة">${Array.from({ length: P }, (_, p) => `<option value="${p}" ${+sl.ref === p ? 'selected' : ''}>الحصة ${PER[p] || AR(p + 1)}</option>`).join('')}</select>` : ''}
            ${sl.kind === 'start' || sl.kind === 'end' ? `<label class="small">${sl.kind === 'start' ? 'قبل البداية بـ' : 'بعد النهاية لمدة'} <input class="in" type="number" min="0" max="120" data-f="${i}|lead" value="${+sl.lead || 20}" style="width:70px"> د</label>` : ''}
            ${sl.kind === 'custom' ? `<input class="in" type="time" data-f="${i}|from" value="${esc(sl.from || '07:00')}" style="width:auto" aria-label="من"><input class="in" type="time" data-f="${i}|to" value="${esc(sl.to || '07:20')}" style="width:auto" aria-label="إلى">` : ''}
            <span class="pill st-submitted">${range(tm, sec)}</span>
            <button class="btn bad sm" data-rm="${i}" aria-label="حذف الفترة">×</button></div>
          <div class="row small" style="gap:8px;margin-top:6px;flex-wrap:wrap"><span class="muted">الأيام:</span>${daysOf(sec).map(d => `<label class="chk"><input type="checkbox" data-dy="${i}|${d}" ${slotDays(sl, sec).includes(d) ? 'checked' : ''}> ${DAYS[d]}</label>`).join('')}</div>
          <div style="margin-top:6px">${sl.places.map((pl, j) => `<div class="row" style="gap:6px;margin-top:4px;flex-wrap:nowrap"><input class="in" data-pl="${i}|${j}|n" value="${esc(pl.n)}" placeholder="الموقع"><label class="small" style="white-space:nowrap">العدد <input class="in" type="number" min="1" max="8" data-pl="${i}|${j}|need" value="${+pl.need || 1}" style="width:60px"></label><button class="btn ghost sm" data-prm="${i}|${j}" aria-label="حذف الموقع">×</button></div>`).join('')}
            <button class="btn ghost sm" data-pa="${i}" style="margin-top:6px">${I.plus || '+'} موقع</button></div></div>`; }).join('')}</div>
        <div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn ghost" id="duAdd">${I.plus || '+'} فترة</button><button class="btn ok" id="duSv">حفظ</button></div>
        <details class="dz-det" style="margin-top:12px"><summary>القواعد والمستثنون</summary>
          <div class="grid g3" style="margin-top:8px"><div class="field"><label for="duPD">أقصى تكليف في اليوم للشخص</label><input class="in" type="number" min="1" max="5" id="duPD" value="${+cfg.perDay || 1}"></div>
            <div class="field"><label for="duMW">أقصى تكليف في الأسبوع (٠ = بلا حد)</label><input class="in" type="number" min="0" max="30" id="duMW" value="${+cfg.maxWeek || 0}"></div></div>
          <p class="small muted">يُعطى التكليف أولاً للأقل تكليفاً ثم للأقل نصاباً، ولا يُكلَّف أحد في فترتين متداخلتين، ولا في «أثناء حصة» يدرّس فيها.</p>
          <div class="perm-grid">${C.T.map(t => `<label class="chk"><input type="checkbox" data-ex="${t}" ${cfg.excl.includes(t) ? '' : 'checked'}> ${esc(pn(t))} <span class="faint small">(${AR(C.load[t] || 0)} حصة)</span></label>`).join('') || '<span class="muted small">لا يوجد منسوبون مرتبطون بالقسم</span>'}</div></details>`;
      const dd = $('#duDef', B); if (dd) dd.onclick = () => { cfg.slots = defaults(sec); draw(); };
      $$('[data-f]', B).forEach(c => c.onchange = () => { const [i, f] = c.dataset.f.split('|'); cfg.slots[+i][f] = c.value; if (f === 'kind') { const sl = cfg.slots[+i]; if (sl.kind === 'break') sl.ref = ((s.breaks || [])[0] || {}).id; if (sl.kind === 'period') sl.ref = 0; } draw(); });
      $$('[data-dy]', B).forEach(c => c.onchange = () => { const [i, d] = c.dataset.dy.split('|').map(Number); const sl = cfg.slots[i]; const cur = slotDays(sl, sec).filter(x => x !== d); if (c.checked) cur.push(d); sl.days = cur.length === daysOf(sec).length ? null : cur.sort(); });
      $$('[data-pl]', B).forEach(c => c.onchange = () => { const [i, j, f] = c.dataset.pl.split('|'); cfg.slots[+i].places[+j][f] = f === 'need' ? Math.max(1, +c.value || 1) : c.value; });
      $$('[data-pa]', B).forEach(b => b.onclick = () => { cfg.slots[+b.dataset.pa].places.push({ n: '', need: 1 }); draw(); });
      $$('[data-prm]', B).forEach(b => b.onclick = () => { const [i, j] = b.dataset.prm.split('|').map(Number); cfg.slots[i].places.splice(j, 1); if (!cfg.slots[i].places.length) cfg.slots[i].places.push({ n: '', need: 1 }); draw(); });
      $$('[data-rm]', B).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذه الفترة وتكليفاتها؟', 'حذف', true))) return; const sl = cfg.slots.splice(+b.dataset.rm, 1)[0]; Object.keys(cfg.roster).forEach(k => k.startsWith(sl.id + '|') && delete cfg.roster[k]); draw(); });
      $('#duAdd', B).onclick = () => { cfg.slots.push({ id: uid(), name: 'فترة إشراف', kind: 'custom', from: '07:00', to: '07:20', places: [{ n: '', need: 1 }] }); draw(); };
      $$('[data-ex]', B).forEach(c => c.onchange = () => { const t = c.dataset.ex; cfg.excl = cfg.excl.filter(x => x !== t); if (!c.checked) cfg.excl.push(t); });
      $('#duSv', B).onclick = e => A.run(e.currentTarget, async () => { cfg.perDay = Math.max(1, +$('#duPD', B).value || 1); cfg.maxWeek = Math.max(0, +$('#duMW', B).value || 0); if (cfg.slots.some(sl => !sl.name.trim())) throw new Error('اكتب اسم كل فترة'); await saveCfg(sec, cfg); A.toast('حُفظت الفترات — انتقل إلى «الجدول الأسبوعي» للتوزيع', 'ok'); });
    };
    draw();
  }

  // ---------- الجدول الأسبوعي ----------
  function tRoster(B, sec, C, root) {
    const cfg = cfgOf(sec); if (!cfg.slots.length) { B.innerHTML = A.emptyBox('أضف الفترات أولاً', 'من تبويب «الفترات والأماكن».'); return; }
    const days = daysOf(sec), cnt = {}; Object.values(cfg.roster).forEach(l => (l || []).forEach(t => { if (t) cnt[t] = (cnt[t] || 0) + 1; }));
    const clashes = new Set(); days.forEach(d => { const L = dayList(sec, isoForDow(d), cfg); L.forEach((a, i) => L.slice(i + 1).forEach(b => { if (a.t === b.t && overlap(a.tm, b.tm)) { clashes.add(key(a.sl, d, a.pi) + a.t); clashes.add(key(b.sl, d, b.pi) + b.t); } })); });
    const busyBad = (sl, d, t) => sl.kind === 'period' && C.busy.has(t + '|' + d + '|' + sl.ref);
    const opts = (sel, sl, d) => `<option value="">—</option>` + C.T.map(t => `<option value="${t}" ${t === sel ? 'selected' : ''} ${busyBad(sl, d, t) && t !== sel ? 'disabled' : ''}>${esc(pn(t))} (${AR(cnt[t] || 0)})</option>`).join('');
    B.innerHTML = `<div class="row" style="gap:6px;margin-bottom:10px;flex-wrap:wrap"><button class="btn ok" id="duGen">${Object.keys(cfg.roster).length ? 'إعادة التوزيع العادل' : 'توزيع عادل تلقائي'}</button><button class="btn ghost" id="duPr">${I.print || ''} طباعة الأسبوعي</button><button class="btn ghost" id="duPs">${I.print || ''} تكليف لكل منسوب</button><button class="btn ghost" id="duX">Excel</button>${cfg.gen ? `<span class="small muted">آخر توزيع: ${esc(A.fmtDT ? A.fmtDT(cfg.gen) : cfg.gen)}</span>` : ''}</div>
      ${clashes.size ? `<div class="notice warn" style="display:block">يوجد ${AR(clashes.size / 2)} تعارض (الشخص نفسه في فترتين متداخلتين) — مظلّلة باللون الأحمر.</div>` : ''}
      <div class="scroll"><table class="tbl du-g"><thead><tr><th>الفترة / الموقع</th>${days.map(d => `<th>${DAYS[d]}</th>`).join('')}</tr></thead><tbody>${cfg.slots.map(sl => sl.places.map((pl, pi) => `<tr><th style="text-align:start"><b>${esc(sl.name)}</b><div class="small">${esc(pl.n || '—')}</div><div class="small muted">${range(slotTime(sl, sec), sec)}</div></th>${days.map(d => !slotDays(sl, sec).includes(d) ? '<td class="faint">—</td>' : `<td>${Array.from({ length: +pl.need || 1 }, (_, k) => { const t = (cfg.roster[key(sl, d, pi)] || [])[k] || ''; return `<select class="in du-s ${t && clashes.has(key(sl, d, pi) + t) ? 'bad' : ''}" data-k="${key(sl, d, pi)}|${k}" aria-label="${esc(sl.name + ' ' + DAYS[d])}">${opts(t, sl, d)}</select>`; }).join('')}</td>`).join('')}</tr>`).join('')).join('')}</tbody></table></div>
      <p class="small muted">الرقم بجانب الاسم = عدد تكليفاته في الأسبوع. التعديل اليدوي يُحفظ فوراً.</p>`;
    $$('[data-k]', B).forEach(sel => sel.onchange = () => A.run(null, async () => { const p = sel.dataset.k.split('|'), k = +p.pop(), kk = p.join('|'); cfg.roster[kk] = cfg.roster[kk] || []; cfg.roster[kk][k] = sel.value || null; await saveCfg(sec, cfg); tRoster(B, sec, C, root); A.toast('حُفظ', 'ok'); }));
    $('#duGen', B).onclick = e => A.run(e.currentTarget, async () => { if (Object.keys(cfg.roster).length && !(await A.confirmBox('إعادة توزيع جدول الإشراف والمناوبة بالكامل؟ التعديلات اليدوية الحالية تُستبدل.', 'توزيع'))) return; const r = generate(cfg, sec, C); cfg.roster = r.roster; cfg.gen = new Date().toISOString(); await saveCfg(sec, cfg); A.toast(r.miss.length ? `بقيت ${AR(r.miss.length)} خانة بلا مؤهل — زِد «أقصى تكليف في اليوم» أو قلّل عدد المناوبين` : 'وُزّع بعدالة دون تعارض', r.miss.length ? 'err' : 'ok'); tRoster(B, sec, C, root); });
    const tbl = () => `<table><tr><th>الفترة</th><th>الموقع</th><th>الوقت</th>${days.map(d => `<th>${DAYS[d]}</th>`).join('')}</tr>${cfg.slots.map(sl => sl.places.map((pl, pi) => `<tr><td><b>${esc(sl.name)}</b></td><td>${esc(pl.n || '')}</td><td style="white-space:nowrap">${esc(rangeTxt(slotTime(sl, sec), sec))}</td>${days.map(d => `<td>${slotDays(sl, sec).includes(d) ? (cfg.roster[key(sl, d, pi)] || []).filter(Boolean).map(t => esc(pn(t))).join('<br>') || '—' : '—'}</td>`).join('')}</tr>`).join('')).join('')}</table>`;
    $('#duPr', B).onclick = () => A.printDoc('جدول الإشراف والمناوبة', sec.name, tbl(), true);
    $('#duPs', B).onclick = () => { const per = {}; days.forEach(d => dayList(sec, isoForDow(d), cfg).forEach(x => (per[x.t] = per[x.t] || []).push({ d, ...x })));
      A.printDoc('تكليفات الإشراف والمناوبة', sec.name, Object.keys(per).sort((a, b) => pn(a).localeCompare(pn(b), 'ar')).map(t => `<div style="break-inside:avoid;margin-bottom:14px"><h3 style="margin:0 0 4px">${esc(pn(t))} <small>(${AR(per[t].length)} تكليف)</small></h3><table><tr><th>اليوم</th><th>الفترة</th><th>الموقع</th><th>الوقت</th></tr>${per[t].map(x => `<tr><td>${DAYS[x.d]}</td><td>${esc(x.sl.name)}</td><td>${esc(x.pl.n || '')}</td><td>${esc(rangeTxt(x.tm, sec))}</td></tr>`).join('')}</table><p style="font-size:12px;margin:4px 0 0">التوقيع بالعلم: ..............................</p></div>`).join(''), false); };
    $('#duX', B).onclick = () => { const rows = []; cfg.slots.forEach(sl => sl.places.forEach((pl, pi) => { const o = { 'الفترة': sl.name, 'الموقع': pl.n, 'الوقت': rangeTxt(slotTime(sl, sec), sec) }; days.forEach(d => o[DAYS[d]] = (cfg.roster[key(sl, d, pi)] || []).filter(Boolean).map(pn).join('، ')); rows.push(o); })); const ws = XLSX.utils.json_to_sheet(rows); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'المناوبة'); XLSX.writeFile(wb, `جدول الإشراف والمناوبة - ${sec.name}.xlsx`); };
  }
  // تاريخ يقع في هذا اليوم من الأسبوع الحالي (للأوقات)
  function isoForDow(d) { const t = A.parseDate(today()); t.setDate(t.getDate() + (d - t.getDay())); return A.isoDate(t); }

  // ---------- اليوم — المتابعة اللحظية ----------
  let liveT = null;
  async function tToday(B, sec, C, root) {
    let day = A.LS.get('du_day') || today(); if (day > today()) day = today();
    const draw = async () => {
      if (!document.body.contains(B)) { clearInterval(liveT); return; }
      const cfg = cfgOf(sec), L = dayList(sec, day, cfg);
      const logs = await api.list('duty_log', { section_id: sec.id, day }).catch(() => []);
      const lg = (x) => logs.find(r => r.slot === x.sl.id && r.place === String(x.pi) && r.staff_id === x.t);
      const live = L.filter(x => stOf(x.tm, day) === 'now'), started = L.filter(x => ['now', 'done'].includes(stOf(x.tm, day)));
      const notIn = started.filter(x => !lg(x)), abs = logs.filter(r => r.status === 'absent' || r.status === 'swap');
      const comp = started.length ? Math.round(100 * started.filter(x => { const r = lg(x); return r && (r.status === 'present' || r.status === 'late' || r.status === 'swap'); }).length / started.length) : null;
      const groups = []; L.forEach(x => { let g = groups.find(g => g.sl.id === x.sl.id); if (!g) groups.push(g = { sl: x.sl, tm: x.tm, items: [] }); g.items.push(x); });
      const sub = id => `<select class="in" data-sub="${id}" style="width:auto" aria-label="البديل"><option value="">البديل…</option>${C.T.map(t => `<option value="${t}">${esc(pn(t))}</option>`).join('')}</select>`;
      B.innerHTML = `<div class="row" style="gap:8px;margin-bottom:10px;flex-wrap:wrap"><input type="date" class="in" id="duD" value="${day}" max="${today()}" style="width:auto"><span class="small muted">${DAYS[dowOf(day)]}</span>${day === today() ? '<span class="rec-st ok" role="status">لحظي · يتحدّث كل دقيقة</span>' : ''}<button class="btn ghost sm" id="duPD2">${I.print || ''} طباعة اليوم</button></div>
        <div class="pal-k"><div class="k info"><b>${AR(live.length)}</b>مناوب في موقعه الآن (حسب الجدول)</div><div class="k ${comp != null && comp < 90 ? 'bad' : 'ok'}"><b>${comp == null ? '—' : AR(comp) + '٪'}</b>الالتزام في الفترات التي بدأت</div><div class="k warn"><b>${AR(notIn.length)}</b>لم يُسجَّل تواجده</div><div class="k bad"><b>${AR(abs.length)}</b>غياب / تبديل</div><div class="k"><b>${AR(L.length)}</b>تكليف اليوم</div></div>
        ${!L.length ? `<div style="margin-top:12px">${A.emptyBox('لا توجد تكليفات لهذا اليوم', cfg.slots.length ? 'وزّع الجدول من «الجدول الأسبوعي».' : 'ابدأ من «الفترات والأماكن».')}</div>` : ''}
        <div class="du-day">${groups.map(g => { const st = stOf(g.tm, day); return `<div class="sec-box du-c ${st === 'now' ? 'du-now' : ''}"><div class="row" style="justify-content:space-between;gap:6px"><b>${esc(g.sl.name)}</b><span class="row" style="gap:6px"><span class="pill st-submitted">${range(g.tm, sec)}</span>${ST[st] ? `<span class="pill ${ST[st][1] === 'ok' ? 'st-approved' : ST[st][1] === 'warn' ? 'st-returned' : 'st-empty'}">${ST[st][0]}</span>` : ''}</span></div>
          <div class="du-items">${g.items.map(x => { const r = lg(x), id = [x.sl.id, x.pi, x.t].join('|'); return `<div class="du-it"><div class="du-ih"><span class="small muted">${esc(x.pl.n || '—')}</span><b>${esc(pn(x.t))}</b>${r && r.status === 'swap' && r.sub_staff ? `<span class="small">← البديل: <b>${esc(pn(r.sub_staff))}</b></span>` : ''}
            ${r ? `<span class="pill ${LG[r.status][1]}">${LG[r.status][0]}</span><span class="faint small">${esc(new Date(r.at).toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' }))}</span>` : st === 'now' || st === 'done' ? '<span class="pill st-returned">لم يُسجَّل</span>' : ''}</div>
            <div class="du-ia">${['present', 'late', 'absent'].map(k => `<button class="btn ${r && r.status === k ? '' : 'ghost'} sm" data-ck="${id}|${k}">${LG[k][0]}</button>`).join('')}${sub(id)}${r ? `<button class="btn ghost sm" data-ck="${id}|clear" aria-label="مسح التسجيل">↺</button>` : ''}</div></div>`; }).join('')}</div></div>`; }).join('')}</div>`;
      $('#duD', B).onchange = e => { day = e.target.value || today(); A.LS.set('du_day', day); draw(); };
      const ck = (id, status, subId) => A.run(null, async () => { const [slot, pi, t] = id.split('|'); try { await api.rpc('duty_check', { p_section: sec.id, p_day: day, p_slot: slot, p_place: pi, p_staff: t, p_status: status, p_sub: subId || null, p_note: '' }); } catch (e) { throw new Error(ERR(e.message)); } draw(); });
      $$('[data-ck]', B).forEach(b => b.onclick = () => { const p = b.dataset.ck.split('|'); ck(p.slice(0, 3).join('|'), p[3]); });
      $$('[data-sub]', B).forEach(s => s.onchange = () => s.value && ck(s.dataset.sub, 'swap', s.value));
      $('#duPD2', B).onclick = () => A.printDoc(`الإشراف والمناوبة — ${DAYS[dowOf(day)]} ${A.dmy(A.parseDate(day))}`, sec.name, `<table><tr><th>الفترة</th><th>الوقت</th><th>الموقع</th><th>المناوب</th><th>الحالة</th><th>التوقيع</th></tr>${L.map(x => { const r = lg(x); return `<tr><td>${esc(x.sl.name)}</td><td style="white-space:nowrap">${esc(rangeTxt(x.tm, sec))}</td><td>${esc(x.pl.n || '')}</td><td>${esc(pn(x.t))}${r && r.sub_staff ? ' ← ' + esc(pn(r.sub_staff)) : ''}</td><td>${r ? LG[r.status][0] : ''}</td><td style="width:90px"></td></tr>`; }).join('')}</table>`, false);
    };
    await draw(); clearInterval(liveT); liveT = setInterval(() => { if (!document.hidden && day === today()) draw().catch(() => { }); }, 60000);
  }

  // ---------- العدالة والالتزام ----------
  async function tStats(B, sec, C) {
    const cfg = cfgOf(sec), cnt = {}, mins = {};
    daysOf(sec).forEach(d => dayList(sec, isoForDow(d), cfg).forEach(x => { cnt[x.t] = (cnt[x.t] || 0) + 1; mins[x.t] = (mins[x.t] || 0) + (x.tm ? x.tm.to - x.tm.from : 0); }));
    let from = A.LS.get('du_sf') || A.isoDate(new Date(A.parseDate(today()).getTime() - 30 * 864e5)), to = today();
    const draw = async () => {
      const logs = (await api.list('duty_log', { section_id: sec.id }, { gte: { day: from } }).catch(() => [])).filter(r => r.day <= to);
      const by = {}; logs.forEach(r => { const o = by[r.staff_id] = by[r.staff_id] || { present: 0, late: 0, absent: 0, swap: 0, cover: 0 }; o[r.status]++; if (r.sub_staff) { const s2 = by[r.sub_staff] = by[r.sub_staff] || { present: 0, late: 0, absent: 0, swap: 0, cover: 0 }; s2.cover++; } });
      const T = C.T.filter(t => cnt[t] || by[t]).sort((a, b) => (cnt[b] || 0) - (cnt[a] || 0));
      const vals = C.T.filter(t => !cfg.excl.includes(t)).map(t => cnt[t] || 0), mx = Math.max(0, ...vals), mn = vals.length ? Math.min(...vals) : 0;
      B.innerHTML = `<div class="pal-k"><div class="k info"><b>${AR(Object.values(cnt).reduce((a, b) => a + b, 0))}</b>تكليف أسبوعي</div><div class="k ${mx - mn > 1 ? 'warn' : 'ok'}"><b>${AR(mn)} – ${AR(mx)}</b>أقل وأعلى تكليف للشخص</div><div class="k"><b>${AR(logs.length)}</b>تسجيل في الفترة</div><div class="k bad"><b>${AR(logs.filter(r => r.status === 'absent' || r.status === 'swap').length)}</b>غياب / تبديل</div></div>
        <div class="row" style="gap:8px;margin:10px 0;flex-wrap:wrap"><label class="small">من <input type="date" class="in" id="duF" value="${from}" style="width:auto"></label><label class="small">إلى <input type="date" class="in" id="duTo" value="${to}" style="width:auto"></label><button class="btn ghost sm" id="duSP">${I.print || ''} طباعة</button></div>
        <div class="scroll"><table class="tbl" id="duST"><thead><tr><th>المنسوب</th><th>النصاب</th><th>تكليفات الأسبوع</th><th>دقائق أسبوعياً</th><th>في موقعه</th><th>متأخر</th><th>غائب</th><th>أُبدل</th><th>غطّى عن زميل</th><th>الالتزام</th></tr></thead><tbody>${T.map(t => { const o = by[t] || { present: 0, late: 0, absent: 0, swap: 0, cover: 0 }, n = o.present + o.late + o.absent + o.swap, c = n ? Math.round(100 * (o.present + o.late * 0.5) / n) : null; return `<tr><td><b>${esc(pn(t))}</b></td><td>${AR(C.load[t] || 0)}</td><td>${AR(cnt[t] || 0)}</td><td>${AR(mins[t] || 0)}</td><td>${AR(o.present)}</td><td>${AR(o.late)}</td><td>${AR(o.absent)}</td><td>${AR(o.swap)}</td><td>${AR(o.cover)}</td><td>${c == null ? '—' : `<b style="color:${c < 80 ? 'var(--bad)' : 'var(--ok)'}">${AR(c)}٪</b>`}</td></tr>`; }).join('') || '<tr><td colspan="10" class="muted small">لا توجد بيانات</td></tr>'}</tbody></table></div>`;
      $('#duF', B).onchange = e => { from = e.target.value; A.LS.set('du_sf', from); draw(); }; $('#duTo', B).onchange = e => { to = e.target.value || today(); draw(); };
      $('#duSP', B).onclick = () => A.printDoc('تقرير العدالة والالتزام — الإشراف والمناوبة', `${sec.name} · ${A.dmy(A.parseDate(from))} – ${A.dmy(A.parseDate(to))}`, $('#duST', B).outerHTML, true);
    };
    draw();
  }

  // ---------- مناوبتي (لوحة المعلم) ----------
  A.myDuty = async function (el) {
    if (!el || !S.me) return; const sec = A.section(); if (!sec || !(sec.duty && (sec.duty.slots || []).length)) { el.innerHTML = ''; return; }
    const day = today(), L = dayList(sec, day).filter(x => x.t === S.me.id);
    const wk = daysOf(sec).flatMap(d => dayList(sec, isoForDow(d)).filter(x => x.t === S.me.id).map(x => ({ d, ...x })));
    if (!wk.length) { el.innerHTML = ''; return; }
    const logs = L.length ? await api.list('duty_log', { section_id: sec.id, day, staff_id: S.me.id }).catch(() => []) : [];
    el.innerHTML = `<div class="sec-box du-me"><div class="row" style="justify-content:space-between"><b>${A.I.duty} الإشراف والمناوبة</b><span class="small muted">${AR(wk.length)} تكليف هذا الأسبوع</span></div>
      ${L.length ? L.map(x => { const st = stOf(x.tm, day), r = logs.find(l => l.slot === x.sl.id && l.place === String(x.pi)); return `<div class="row du-mi ${st === 'now' ? 'du-now' : ''}" style="justify-content:space-between;gap:6px;margin-top:6px"><span><b>${esc(x.sl.name)}</b> · ${esc(x.pl.n || '')} · ${range(x.tm, sec)} ${ST[st] ? `<span class="pill ${st === 'now' ? 'st-approved' : st === 'soon' ? 'st-returned' : 'st-empty'}">${ST[st][0]}</span>` : ''}</span>${r ? `<span class="pill ${LG[r.status][1]}">${LG[r.status][0]}</span>` : st === 'now' || st === 'soon' ? `<button class="btn ok sm" data-me="${x.sl.id}|${x.pi}">أنا في موقعي</button>` : ''}</div>`; }).join('') : '<p class="small muted" style="margin:6px 0 0">لا مناوبة لك اليوم.</p>'}
      <details style="margin-top:6px"><summary class="small">تكليفاتي هذا الأسبوع</summary><ul class="small" style="margin:4px 0 0;padding-inline-start:18px">${wk.map(x => `<li>${DAYS[x.d]} · ${esc(x.sl.name)} · ${esc(x.pl.n || '')} · ${esc(rangeTxt(slotTime(x.sl, sec, isoForDow(x.d)), sec))}</li>`).join('')}</ul></details></div>`;
    $$('[data-me]', el).forEach(b => b.onclick = () => A.run(b, async () => { const [slot, pi] = b.dataset.me.split('|'); const st = stOf(L.find(x => x.sl.id === slot).tm, day); await api.rpc('duty_check', { p_section: sec.id, p_day: day, p_slot: slot, p_place: pi, p_staff: S.me.id, p_status: 'present', p_sub: null, p_note: '' }).catch(e => { throw new Error(ERR(e.message)); }); A.toast('سُجّل تواجدك', 'ok'); A.myDuty(el); }));
  };

  // ---------- صندوق «المناوبة الآن» للمتابعة اللحظية في اللوحة اليومية ----------
  A.dutyNowBox = async function (el) {
    if (!el) return; const sec = A.section(); const day = today(); const L = dayList(sec, day); if (!L.length) { el.innerHTML = ''; return; }
    const logs = await api.list('duty_log', { section_id: sec.id, day }).catch(() => []);
    const cur = L.filter(x => stOf(x.tm, day) === 'now'), nxt = L.filter(x => stOf(x.tm, day) === 'soon' || stOf(x.tm, day) === 'next').slice(0, 6);
    const lg = x => logs.find(r => r.slot === x.sl.id && r.place === String(x.pi) && r.staff_id === x.t);
    const row = x => { const r = lg(x); return `<li>${esc(x.sl.name)} · ${esc(x.pl.n || '')}: <b>${esc(pn(r && r.sub_staff ? r.sub_staff : x.t))}</b> ${r ? `<span class="pill ${LG[r.status][1]}">${LG[r.status][0]}</span>` : stOf(x.tm, day) === 'now' ? '<span class="pill st-returned">لم يُسجَّل</span>' : `<span class="small muted">${range(x.tm, sec)}</span>`}</li>`; };
    el.innerHTML = `<div class="sec-box" style="margin-top:12px"><div class="row" style="justify-content:space-between"><b>الإشراف والمناوبة الآن</b><a class="small" href="#/duty">التفاصيل</a></div>${cur.length ? `<ul class="small" style="margin:6px 0 0;padding-inline-start:18px">${cur.map(row).join('')}</ul>` : '<p class="small muted" style="margin:6px 0 0">لا توجد فترة إشراف جارية الآن.</p>'}${nxt.length ? `<b class="small" style="display:block;margin-top:8px">التالي</b><ul class="small" style="margin:4px 0 0;padding-inline-start:18px">${nxt.map(row).join('')}</ul>` : ''}</div>`;
  };
})();
