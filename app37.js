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

  const CATS = { sup: 'إشراف', duty: 'مناوبة' };
  const catDef = k => k === 'start' || k === 'end' ? 'duty' : 'sup';
  const NOTES_DEF = {
    sup: 'التواجد في الموقع المحدد قبل بداية الفسحة بدقيقتين وحتى دخول آخر طالب.\nمتابعة سلوك الطلاب وسلامتهم ومنع التجمعات والممارسات الخطرة.\nالتأكد من نظافة الموقع والتزام الطلاب بآداب المقصف.\nإبلاغ الوكيل فوراً عن أي إصابة أو مخالفة.',
    duty: 'الحضور قبل بداية الفترة بخمس دقائق، والتواجد عند الموقع حتى نهايتها.\nاستقبال الطلاب ومتابعة دخولهم إلى الطابور / انصرافهم مع أولياء أمورهم فقط.\nعدم مغادرة الموقع قبل خروج آخر طالب، وتسليم المتأخرين للمسؤول.\nتسجيل الملاحظات في المنصة («أنا في موقعي») وإبلاغ الإدارة بالطوارئ.'
  };
  const SMART_DEF = { byLoad: true, prefFree: true, heavy: 6, avoidHeavy: true, spread: true, reserveFree: true };
  const cfgOf = sec => { const c = Object.assign({ slots: [], roster: {}, excl: [], perDay: 1, maxWeek: 0, gen: null, people: {}, places: [], notes: {}, map: null, exp: {}, smart: {} }, JSON.parse(JSON.stringify(sec.duty || {}))); c.smart = Object.assign({}, SMART_DEF, c.smart); c.notes = Object.assign({}, NOTES_DEF, c.notes); c.exp = Object.assign({ title: 'جدول الإشراف والمناوبة', time: true, notes: true, map: true, sign: true, by: 'slot' }, c.exp); c.slots.forEach(x => { x.places = x.places || [{ n: '', need: 1 }]; x.days = Array.isArray(x.days) ? x.days : null; x.cat = x.cat || catDef(x.kind); x.reserve = +x.reserve || 0; }); return c; };
  const pOf = (cfg, t) => Object.assign({ days: null, cats: ['sup', 'duty'], max: 0, prio: 1 }, (cfg.people || {})[t] || {});
  const rkey = (sl, d) => sl.id + '|' + d + '|r';
  const daysOf = sec => Array.from({ length: sec.days || 5 }, (_, i) => i);
  const slotDays = (sl, sec) => sl.days && sl.days.length ? daysOf(sec).filter(d => sl.days.includes(d)) : daysOf(sec);
  const key = (sl, d, pi) => sl.id + '|' + d + '|' + pi;
  function defaults(sec) {
    const { s } = bellCtx(sec);
    const out = [{ id: uid(), name: 'المناوبة الصباحية', kind: 'start', cat: 'duty', reserve: 1, lead: 20, places: [{ n: 'البوابة الرئيسية', need: 1 }, { n: 'الساحة والطابور', need: 2 }] }];
    (s.breaks || []).slice().sort((a, b) => a.after - b.after).forEach(br => out.push({ id: uid(), name: 'إشراف ' + (br.label || 'الفسحة'), kind: 'break', cat: 'sup', reserve: 1, ref: br.id, places: [{ n: 'الساحة', need: 2 }, { n: 'الممرات', need: 1 }, { n: 'المقصف', need: 1 }] }));
    out.push({ id: uid(), name: 'مناوبة الانصراف', kind: 'end', cat: 'duty', reserve: 1, lead: 30, places: [{ n: 'البوابة الرئيسية', need: 1 }, { n: 'منطقة انتظار الطلاب', need: 1 }] });
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
    const dayLoad = {}; slots.forEach(x => { if (x.teacher_id && x.subject_id) dayLoad[x.teacher_id + '|' + x.day] = (dayLoad[x.teacher_id + '|' + x.day] || 0) + 1; });
    CACHE = { sec: sec.id, at: Date.now(), load: loadN, busy, T, dayLoad }; return CACHE;
  }
  const overlap = (a, b) => a && b && a.from < b.to && b.from < a.to;

  // سبب عدم أهلية شخص لخانة (أو '' إن كان مؤهلاً) — يُستخدم في التوزيع والقوائم اليدوية
  function why(cfg, sec, C, t, sl, d) {
    if (cfg.excl.includes(t)) return 'مستثنى';
    const p = pOf(cfg, t);
    if (p.days && p.days.length && !p.days.includes(d)) return 'غير متاح هذا اليوم';
    if (!p.cats.includes(sl.cat)) return 'لا يُكلَّف ' + CATS[sl.cat];
    if (sl.kind === 'period' && C.busy.has(t + '|' + d + '|' + sl.ref)) return 'لديه حصة';
    return '';
  }
  // درجة ملاءمة (الأقل أفضل) — تعتمد على جدول المعلم الفعلي
  function score(cfg, sec, C, t, sl, d, st) {
    const sm = cfg.smart, P = sec.periods || 7, p = pOf(cfg, t); let v = (st.cnt[t] || 0) * 10;
    if (p.prio === 0) v += 6; if (p.prio === 2) v -= 4;
    if (sm.byLoad) v += (C.load[t] || 0) * 0.35;
    const b = per => C.busy.has(t + '|' + d + '|' + per);
    if (sm.prefFree) {
      if (sl.kind === 'break') { const br = (bellCtx(sec).s.breaks || []).find(x => x.id === sl.ref); const a = br ? +br.after : 3; v += (b(a - 1) ? 1.5 : -1) + (b(a) ? 2 : -1.5); }
      if (sl.kind === 'start') v += b(0) ? 2.5 : -1.5;
      if (sl.kind === 'end') v += b(P - 1) ? -1 : 1;
    }
    const dl = C.dayLoad[t + '|' + d] || 0; if (sm.avoidHeavy && dl >= +sm.heavy) v += 5 + (dl - sm.heavy) * 2;
    if (sm.spread) v += (st.same[t + '|' + sl.id] || 0) * 2.5 + (st.dayCnt[t + '|' + d] || 0) * 4;
    return v + Math.random() * 0.6;
  }
  function generate(cfg, sec, C) {
    const R = {}, st = { cnt: {}, dayCnt: {}, same: {} }, miss = [];
    const times = Object.fromEntries(cfg.slots.map(sl => [sl.id, slotTime(sl, sec)]));
    const takenAt = {};
    const order = [];
    daysOf(sec).forEach(d => cfg.slots.forEach(sl => { if (!slotDays(sl, sec).includes(d)) return; sl.places.forEach((pl, pi) => { for (let k = 0; k < (+pl.need || 1); k++) order.push({ sl, d, pi, k }); }); }));
    // الأصعب أولاً: الخانات التي مؤهلوها أقل
    const elig0 = o => C.T.filter(t => !why(cfg, sec, C, t, o.sl, o.d)).length;
    order.forEach(o => o.e = elig0(o)); order.sort((a, b) => a.e - b.e || a.d - b.d);
    const cap = t => { const p = pOf(cfg, t); return +p.max || +cfg.maxWeek || 0; };
    const free = (t, d, tm) => !(takenAt[t + '|' + d] || []).some(r => overlap(r, tm));
    order.forEach(({ sl, d, pi }) => {
      const kk = key(sl, d, pi); R[kk] = R[kk] || []; const tm = times[sl.id];
      const ok = t => !R[kk].includes(t) && !why(cfg, sec, C, t, sl, d) && (st.dayCnt[t + '|' + d] || 0) < (+cfg.perDay || 1) && (!cap(t) || (st.cnt[t] || 0) < cap(t)) && free(t, d, tm);
      const c = C.T.filter(ok).map(t => [t, score(cfg, sec, C, t, sl, d, st)]).sort((a, b) => a[1] - b[1]);
      if (!c.length) { miss.push(`${DAYS[d]} · ${sl.name} · ${sl.places[pi].n || 'موقع'}`); return; }
      const t = c[0][0]; R[kk].push(t); st.cnt[t] = (st.cnt[t] || 0) + 1; st.dayCnt[t + '|' + d] = (st.dayCnt[t + '|' + d] || 0) + 1; st.same[t + '|' + sl.id] = (st.same[t + '|' + sl.id] || 0) + 1; (takenAt[t + '|' + d] = takenAt[t + '|' + d] || []).push(tm);
    });
    // الاحتياط: من غير المكلَّفين في الوقت نفسه، يُفضَّل من لا حصة له في الفترة المجاورة
    daysOf(sec).forEach(d => cfg.slots.forEach(sl => { if (!sl.reserve || !slotDays(sl, sec).includes(d)) return; const tm = times[sl.id], rk = rkey(sl, d); R[rk] = [];
      for (let k = 0; k < sl.reserve; k++) { const c = C.T.filter(t => !R[rk].includes(t) && !why(cfg, sec, C, t, sl, d) && free(t, d, tm)).map(t => [t, score(cfg, sec, C, t, sl, d, st) + (st.res && st.res[t] || 0) * 6]).sort((a, b) => a[1] - b[1]); if (!c.length) break; const t = c[0][0]; R[rk].push(t); st.res = st.res || {}; st.res[t] = (st.res[t] || 0) + 1; } }));
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
      <div class="kpick" id="duT"><button data-t="today">اليوم — المتابعة اللحظية</button><button data-t="roster">الجدول الأسبوعي</button><button data-t="setup">الفترات والأماكن</button><button data-t="smart">المعلمون والإعدادات الذكية</button><button data-t="stats">العدالة والالتزام</button></div><div id="duB" style="margin-top:10px"><div class="spinner"></div></div></div>`;
    $$('#duT button', root).forEach(b => { b.classList.toggle('on', b.dataset.t === tab); b.onclick = () => { A.LS.set('du_t', b.dataset.t); V.duty(root); }; });
    const B = $('#duB', root); let C; try { C = await load(sec); } catch (e) { B.innerHTML = A.emptyBox('تعذّر التحميل', esc(e.message)); return; }
    ({ today: tToday, roster: tRoster, setup: tSetup, smart: tSmart, stats: tStats })[tab](B, sec, C, root);
  };

  const PL_DEF = ['البوابة الرئيسية', 'الساحة', 'الساحة والطابور', 'الممرات', 'الدور الأول', 'الدور الثاني', 'المقصف', 'دورات المياه', 'الملعب', 'المصلى', 'منطقة انتظار الطلاب', 'مواقف الحافلات', 'المكتبة'];
  const placesAll = cfg => [...new Set([...(cfg.places || []).map(x => x.n || x), ...PL_DEF, ...cfg.slots.flatMap(sl => sl.places.map(p => p.n))].filter(Boolean))];

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
            <select class="in" data-f="${i}|cat" aria-label="التصنيف" style="width:auto">${Object.entries(CATS).map(([k, n]) => `<option value="${k}" ${sl.cat === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
            <label class="small" style="white-space:nowrap">احتياط <input class="in" type="number" min="0" max="5" data-f="${i}|reserve" value="${+sl.reserve || 0}" style="width:60px"></label>
            <span class="pill st-submitted">${range(tm, sec)}</span>
            <button class="btn bad sm" data-rm="${i}" aria-label="حذف الفترة">×</button></div>
          <div class="row small" style="gap:8px;margin-top:6px;flex-wrap:wrap"><span class="muted">الأيام:</span>${daysOf(sec).map(d => `<label class="chk"><input type="checkbox" data-dy="${i}|${d}" ${slotDays(sl, sec).includes(d) ? 'checked' : ''}> ${DAYS[d]}</label>`).join('')}</div>
          <div style="margin-top:6px">${sl.places.map((pl, j) => `<div class="row" style="gap:6px;margin-top:4px;flex-wrap:nowrap"><input class="in" data-pl="${i}|${j}|n" value="${esc(pl.n)}" placeholder="الموقع" list="duPlL"><label class="small" style="white-space:nowrap">العدد <input class="in" type="number" min="1" max="8" data-pl="${i}|${j}|need" value="${+pl.need || 1}" style="width:60px"></label><button class="btn ghost sm" data-prm="${i}|${j}" aria-label="حذف الموقع">×</button></div>`).join('')}
            <button class="btn ghost sm" data-pa="${i}" style="margin-top:6px">${I.plus || '+'} موقع</button></div></div>`; }).join('')}</div>
        <div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn ghost" id="duAdd">${I.plus || '+'} فترة</button><button class="btn ok" id="duSv">حفظ</button></div>
        <datalist id="duPlL">${placesAll(cfg).map(n => `<option value="${esc(n)}">`).join('')}</datalist>
        <p class="small muted" style="margin-top:8px">الإعدادات الذكية وتوفر المعلمين وقائمة الأماكن والتعليمات في تبويب «المعلمون والإعدادات الذكية».</p>`;
      const dd = $('#duDef', B); if (dd) dd.onclick = () => { cfg.slots = defaults(sec); draw(); };
      $$('[data-f]', B).forEach(c => c.onchange = () => { const [i, f] = c.dataset.f.split('|'); cfg.slots[+i][f] = f === 'reserve' ? Math.max(0, +c.value || 0) : c.value; if (f === 'kind') { const sl = cfg.slots[+i]; if (sl.kind === 'break') sl.ref = ((s.breaks || [])[0] || {}).id; if (sl.kind === 'period') sl.ref = 0; sl.cat = catDef(sl.kind); } draw(); });
      $$('[data-dy]', B).forEach(c => c.onchange = () => { const [i, d] = c.dataset.dy.split('|').map(Number); const sl = cfg.slots[i]; const cur = slotDays(sl, sec).filter(x => x !== d); if (c.checked) cur.push(d); sl.days = cur.length === daysOf(sec).length ? null : cur.sort(); });
      $$('[data-pl]', B).forEach(c => c.onchange = () => { const [i, j, f] = c.dataset.pl.split('|'); cfg.slots[+i].places[+j][f] = f === 'need' ? Math.max(1, +c.value || 1) : c.value; });
      $$('[data-pa]', B).forEach(b => b.onclick = () => { cfg.slots[+b.dataset.pa].places.push({ n: '', need: 1 }); draw(); });
      $$('[data-prm]', B).forEach(b => b.onclick = () => { const [i, j] = b.dataset.prm.split('|').map(Number); cfg.slots[i].places.splice(j, 1); if (!cfg.slots[i].places.length) cfg.slots[i].places.push({ n: '', need: 1 }); draw(); });
      $$('[data-rm]', B).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذه الفترة وتكليفاتها؟', 'حذف', true))) return; const sl = cfg.slots.splice(+b.dataset.rm, 1)[0]; Object.keys(cfg.roster).forEach(k => k.startsWith(sl.id + '|') && delete cfg.roster[k]); draw(); });
      $('#duAdd', B).onclick = () => { cfg.slots.push({ id: uid(), name: 'فترة إشراف', kind: 'custom', cat: 'sup', reserve: 0, from: '07:00', to: '07:20', places: [{ n: '', need: 1 }] }); draw(); };
      $('#duSv', B).onclick = e => A.run(e.currentTarget, async () => { if (cfg.slots.some(sl => !sl.name.trim())) throw new Error('اكتب اسم كل فترة'); await saveCfg(sec, cfg); A.toast('حُفظت الفترات — انتقل إلى «الجدول الأسبوعي» للتوزيع', 'ok'); });
    };
    draw();
  }

  // ---------- المعلمون والإعدادات الذكية ----------
  function tSmart(B, sec, C, root) {
    const cfg = cfgOf(sec), days = daysOf(sec), sm = cfg.smart;
    const draw = () => {
      B.innerHTML = `<details class="dz-det" open><summary><b>الإعدادات الذكية للتوزيع</b></summary>
          <div class="grid g3" style="margin-top:8px"><div class="field"><label for="duPD">أقصى تكليف للشخص في اليوم</label><input class="in" type="number" min="1" max="5" id="duPD" value="${+cfg.perDay || 1}"></div>
            <div class="field"><label for="duMW">أقصى تكليف في الأسبوع (٠ = بلا حد)</label><input class="in" type="number" min="0" max="30" id="duMW" value="${+cfg.maxWeek || 0}"></div>
            <div class="field"><label for="duHv">اليوم المزدحم = حصص المعلم في اليوم ≥</label><input class="in" type="number" min="3" max="9" id="duHv" value="${+sm.heavy || 6}"></div></div>
          <div class="du-sm">${[['byLoad', 'العدالة حسب النصاب', 'الأقل نصاباً يأخذ تكليفات أكثر.'], ['prefFree', 'الاختيار من جدول المعلم', 'لإشراف الفسحة: يُفضَّل من لا حصة له قبل الفسحة أو بعدها مباشرة. للمناوبة الصباحية: من لا حصة له أولاً.'], ['avoidHeavy', 'تجنّب الأيام المزدحمة', 'لا يُكلَّف المعلم في يوم كثرت فيه حصصه إلا عند الحاجة.'], ['spread', 'التوزيع على الأيام والمواقع', 'لا يتكرر الشخص في الفترة نفسها كل يوم، ويتوزع على أيام مختلفة.'], ['reserveFree', 'احتياط تلقائي', 'لكل فترة احتياط من غير المكلَّفين في الوقت نفسه، يظهر أولاً عند الغياب.']].map(([k, n, d]) => `<label class="chk du-op"><input type="checkbox" data-sm="${k}" ${sm[k] ? 'checked' : ''}><span><b>${n}</b><br><span class="small muted">${d}</span></span></label>`).join('')}</div></details>

        <details class="dz-det" open style="margin-top:10px"><summary><b>المعلمون: التوفر والتصنيف</b> <span class="small muted">— ${AR(C.T.filter(t => !cfg.excl.includes(t)).length)} مشارك من ${AR(C.T.length)}</span></summary>
          <div class="row" style="gap:6px;margin:8px 0;flex-wrap:wrap"><button class="btn ghost sm" id="duPA">تفعيل الكل</button><button class="btn ghost sm" id="duPN">استثناء من نصابه ≥ <input class="in" type="number" id="duPNv" value="22" min="1" max="40" style="width:56px;display:inline-block"></button></div>
          <div class="scroll"><table class="tbl du-pp"><thead><tr><th>مشارك</th><th>المعلم</th><th>النصاب</th>${days.map(d => `<th>${DAYS[d]}</th>`).join('')}<th>إشراف</th><th>مناوبة</th><th>حد أسبوعي</th><th>الأولوية</th></tr></thead><tbody>${C.T.map(t => { const p = pOf(cfg, t), off = cfg.excl.includes(t); return `<tr class="${off ? 'faint' : ''}"><td><input type="checkbox" data-in="${t}" ${off ? '' : 'checked'} aria-label="مشارك"></td><td style="text-align:start"><b>${esc(pn(t))}</b></td><td>${AR(C.load[t] || 0)}</td>${days.map(d => { const n = C.dayLoad[t + '|' + d] || 0; return `<td><label class="du-dy ${n >= sm.heavy ? 'hv' : ''}" title="${AR(n)} حصة"><input type="checkbox" data-pd="${t}|${d}" ${!p.days || p.days.includes(d) ? 'checked' : ''}> <span class="small">${AR(n)}</span></label></td>`; }).join('')}
            <td><input type="checkbox" data-pc="${t}|sup" ${p.cats.includes('sup') ? 'checked' : ''} aria-label="إشراف"></td><td><input type="checkbox" data-pc="${t}|duty" ${p.cats.includes('duty') ? 'checked' : ''} aria-label="مناوبة"></td>
            <td><input class="in" type="number" min="0" max="20" data-pm="${t}" value="${+p.max || 0}" style="width:56px" aria-label="حد أسبوعي"></td><td><select class="in" data-pr="${t}" style="width:auto" aria-label="الأولوية"><option value="0" ${p.prio === 0 ? 'selected' : ''}>أقل</option><option value="1" ${p.prio === 1 ? 'selected' : ''}>عادية</option><option value="2" ${p.prio === 2 ? 'selected' : ''}>أعلى</option></select></td></tr>`; }).join('') || `<tr><td colspan="${days.length + 7}" class="muted small">لا يوجد منسوبون مرتبطون بالقسم</td></tr>`}</tbody></table></div>
          <p class="small muted">الرقم تحت كل يوم = عدد حصص المعلم فيه من الجدول المعتمد (الأحمر يوم مزدحم). ألغِ اليوم إن لم يكن المعلم متاحاً فيه. الحد الأسبوعي ٠ = يتبع الحد العام.</p></details>

        <details class="dz-det" style="margin-top:10px"><summary><b>الأماكن</b> <span class="small muted">— قائمة المدرسة تظهر عند كتابة موقع أي فترة</span></summary>
          <div style="margin-top:8px">${(cfg.places || []).map((x, i) => `<div class="row" style="gap:6px;margin-top:4px;flex-wrap:nowrap"><input class="in" data-plc="${i}|n" value="${esc(x.n || x)}" placeholder="اسم الموقع"><input class="in" data-plc="${i}|d" value="${esc(x.d || '')}" placeholder="وصف أو رمز على الكروكي (اختياري)"><button class="btn ghost sm" data-plx="${i}" aria-label="حذف">×</button></div>`).join('')}
          <button class="btn ghost sm" id="duPlA" style="margin-top:6px">${I.plus || '+'} موقع</button> <button class="btn ghost sm" id="duPlD" style="margin-top:6px">إضافة الأماكن الشائعة</button></div></details>

        <details class="dz-det" style="margin-top:10px"><summary><b>التعليمات</b> <span class="small muted">— تُطبع مع الجدول وتظهر للمناوب</span></summary>
          <div class="grid g2" style="margin-top:8px">${Object.entries(CATS).map(([k, n]) => `<div class="field"><label for="duN_${k}">تعليمات ${n}</label><textarea class="in" id="duN_${k}" rows="6" data-nt="${k}">${esc(cfg.notes[k] || '')}</textarea><button class="btn ghost sm" data-nr="${k}" type="button">استعادة النص الافتراضي</button></div>`).join('')}</div></details>

        <details class="dz-det" style="margin-top:10px"><summary><b>كروكي المدرسة</b> <span class="small muted">— صورة توضح مواقع الإشراف (اختياري)</span></summary>
          <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap;align-items:flex-start">${cfg.map && cfg.map.url ? `<img src="${esc(cfg.map.url)}" alt="${esc(cfg.map.name || 'كروكي المدرسة')}" style="max-width:260px;max-height:200px;border:1px solid #D5E1F0;border-radius:10px">` : '<span class="small muted">لم تُرفع صورة بعد.</span>'}
            <div class="field" style="margin:0;min-width:220px"><label for="duMN">مسمى الكروكي</label><input class="in" id="duMN" value="${esc((cfg.map || {}).name || 'كروكي مواقع الإشراف والمناوبة')}"><label class="btn ghost sm" style="margin-top:6px">رفع صورة<input type="file" id="duMF" accept="image/*" hidden></label>${cfg.map && cfg.map.url ? ' <button class="btn ghost sm" id="duMX">إزالة</button>' : ''}</div></div></details>

        <div class="row" style="gap:6px;margin-top:12px"><button class="btn ok" id="duSv2">حفظ الإعدادات</button><button class="btn ghost" id="duGo2">حفظ وإعادة التوزيع الذكي</button></div>`;
      const P = t => (cfg.people[t] = Object.assign(pOf(cfg, t), cfg.people[t] || {}));
      $$('[data-sm]', B).forEach(c => c.onchange = () => { sm[c.dataset.sm] = c.checked; });
      $$('[data-in]', B).forEach(c => c.onchange = () => { const t = c.dataset.in; cfg.excl = cfg.excl.filter(x => x !== t); if (!c.checked) cfg.excl.push(t); c.closest('tr').classList.toggle('faint', !c.checked); });
      $$('[data-pd]', B).forEach(c => c.onchange = () => { const [t, d] = c.dataset.pd.split('|'); const p = P(t); let l = p.days || days.slice(); l = l.filter(x => x !== +d); if (c.checked) l.push(+d); p.days = l.length === days.length ? null : l.sort(); });
      $$('[data-pc]', B).forEach(c => c.onchange = () => { const [t, k] = c.dataset.pc.split('|'); const p = P(t); p.cats = p.cats.filter(x => x !== k); if (c.checked) p.cats.push(k); });
      $$('[data-pm]', B).forEach(c => c.onchange = () => { P(c.dataset.pm).max = Math.max(0, +c.value || 0); });
      $$('[data-pr]', B).forEach(c => c.onchange = () => { P(c.dataset.pr).prio = +c.value; });
      $('#duPA', B).onclick = () => { cfg.excl = []; draw(); };
      $('#duPN', B).onclick = e => { if (e.target.id === 'duPNv') return; const n = +$('#duPNv', B).value || 22; C.T.forEach(t => { if ((C.load[t] || 0) >= n && !cfg.excl.includes(t)) cfg.excl.push(t); }); draw(); };
      $$('[data-plc]', B).forEach(c => c.onchange = () => { const [i, f] = c.dataset.plc.split('|'); const x = cfg.places[+i]; cfg.places[+i] = typeof x === 'string' ? { n: x } : x; cfg.places[+i][f] = c.value; });
      $$('[data-plx]', B).forEach(b => b.onclick = () => { cfg.places.splice(+b.dataset.plx, 1); draw(); });
      $('#duPlA', B).onclick = () => { cfg.places.push({ n: '', d: '' }); draw(); };
      $('#duPlD', B).onclick = () => { const have = new Set(cfg.places.map(x => x.n || x)); PL_DEF.forEach(n => { if (!have.has(n)) cfg.places.push({ n, d: '' }); }); draw(); };
      $$('[data-nt]', B).forEach(c => c.oninput = () => { cfg.notes[c.dataset.nt] = c.value; });
      $$('[data-nr]', B).forEach(b => b.onclick = () => { cfg.notes[b.dataset.nr] = NOTES_DEF[b.dataset.nr]; draw(); });
      $('#duMN', B).oninput = e => { cfg.map = Object.assign({}, cfg.map || {}, { name: e.target.value }); };
      $('#duMF', B).onchange = e => A.run(null, async () => { const f = e.target.files[0]; if (!f) return; if (f.size > 6e6) throw new Error('الصورة أكبر من ٦ ميجابايت'); const url = await api.uploadAsset(f); cfg.map = Object.assign({}, cfg.map || {}, { url, name: $('#duMN', B).value }); draw(); A.toast('رُفعت الصورة — اضغط «حفظ الإعدادات»', 'ok'); });
      const mx = $('#duMX', B); if (mx) mx.onclick = () => { cfg.map = Object.assign({}, cfg.map, { url: '' }); draw(); };
      const read = () => { cfg.perDay = Math.max(1, +$('#duPD', B).value || 1); cfg.maxWeek = Math.max(0, +$('#duMW', B).value || 0); sm.heavy = Math.max(3, +$('#duHv', B).value || 6); cfg.places = cfg.places.filter(x => (x.n || x || '').trim()); };
      $('#duSv2', B).onclick = e => A.run(e.currentTarget, async () => { read(); await saveCfg(sec, cfg); A.toast('حُفظت الإعدادات', 'ok'); });
      $('#duGo2', B).onclick = e => A.run(e.currentTarget, async () => { read(); if (!cfg.slots.length) throw new Error('أضف الفترات أولاً'); if (Object.keys(cfg.roster).length && !(await A.confirmBox('حفظ الإعدادات وإعادة توزيع الجدول بالكامل؟ التعديلات اليدوية تُستبدل.', 'توزيع'))) return; const r = generate(cfg, sec, C); cfg.roster = r.roster; cfg.gen = new Date().toISOString(); await saveCfg(sec, cfg); A.toast(r.miss.length ? `بقيت ${AR(r.miss.length)} خانة بلا مؤهل — وسّع التوفر أو الحدود` : 'وُزّع توزيعاً ذكياً عادلاً بلا تعارض', r.miss.length ? 'err' : 'ok'); A.LS.set('du_t', 'roster'); V.duty(root); });
    };
    draw();
  }

  // ---------- التصدير بهوية دينا ----------
  function exportDialog(sec, cfg) {
    const ex = cfg.exp, days = daysOf(sec);
    const m = A.modal(`<h3>تصدير جدول الإشراف والمناوبة بهوية دينا</h3>
      <div class="grid g2"><div class="field"><label for="exT">العنوان</label><input class="in" id="exT" value="${esc(ex.title)}"></div>
        <div class="field"><label for="exS">النطاق</label><select class="in" id="exS"><option value="all">كامل (الإشراف والمناوبة)</option><option value="sup">الإشراف فقط</option><option value="duty">المناوبة فقط</option><option value="sep">كامل — كل قسم في صفحة</option></select></div>
        <div class="field"><label for="exB">الترتيب</label><select class="in" id="exB"><option value="slot" ${ex.by === 'slot' ? 'selected' : ''}>الفترات صفوفاً والأيام أعمدة</option><option value="day" ${ex.by === 'day' ? 'selected' : ''}>صفحة لكل يوم</option><option value="person">تكليف لكل منسوب</option></select></div>
        <div class="field"><label for="exSub">سطر فرعي</label><input class="in" id="exSub" value="${esc(ex.sub || sec.name + ' — ' + (S.school.name || ''))}"></div></div>
      <div class="row" style="gap:12px;flex-wrap:wrap">${[['time', 'عمود التوقيت'], ['res', 'الاحتياط'], ['notes', 'التعليمات'], ['map', 'الكروكي'], ['sign', 'خانات التوقيع والاعتماد']].map(([k, n]) => `<label class="chk"><input type="checkbox" data-eo="${k}" ${ex[k] !== false ? 'checked' : ''}> ${n}</label>`).join('')}</div>
      <div class="field"><label for="exSg">أسماء التوقيع (سطر لكل اسم)</label><textarea class="in" id="exSg" rows="2">${esc(ex.signs || 'وكيل شؤون الطلاب\nقائد المدرسة')}</textarea></div>
      <div class="acts"><button class="btn ghost" id="exX">Excel</button><button class="btn ok" id="exP">${I.print || ''} طباعة / PDF</button></div>`, { cls: 'wide' });
    const q = s => m.el.querySelector(s);
    const read = () => { ex.title = q('#exT').value.trim() || 'جدول الإشراف والمناوبة'; ex.sub = q('#exSub').value; ex.by = q('#exB').value; ex.signs = q('#exSg').value; $$('[data-eo]', m.el).forEach(c => ex[c.dataset.eo] = c.checked); saveCfg(sec, cfg).catch(() => { }); return q('#exS').value; };
    const slotsOf = sc => cfg.slots.filter(sl => sc === 'all' || sc === 'sep' || sl.cat === sc);
    const names = l => (l || []).filter(Boolean).map(t => esc(pn(t))).join('<br>') || '—';
    const notesH = cats => ex.notes ? cats.map(k => (cfg.notes[k] || '').trim() ? `<div style="break-inside:avoid;margin-top:12px;border:1px solid #84B7E3;border-radius:12px;padding:8px 12px"><b style="color:#005499">تعليمات ${CATS[k]}</b><ol style="margin:4px 0 0;padding-inline-start:20px;font-size:12px">${cfg.notes[k].split(/\n+/).filter(x => x.trim()).map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : '').join('') : '';
    const mapH = () => ex.map && cfg.map && cfg.map.url ? `<div style="break-inside:avoid;margin-top:12px;text-align:center"><b style="color:#005499">${esc(cfg.map.name || 'كروكي المدرسة')}</b><br><img src="${esc(cfg.map.url)}" style="max-width:100%;max-height:150mm;margin-top:6px;border:1px solid #84B7E3;border-radius:10px"></div>` : '';
    const signH = () => ex.sign ? `<div style="display:flex;justify-content:space-around;margin-top:22px;font-size:12px">${(ex.signs || '').split(/\n+/).filter(Boolean).map(n => `<div style="text-align:center"><b>${esc(n)}</b><br><br>..............................</div>`).join('')}</div>` : '';
    const bySlot = sls => `<table><tr><th>الفترة</th><th>الموقع</th>${ex.time ? '<th>التوقيت</th>' : ''}${days.map(d => `<th>${DAYS[d]}</th>`).join('')}</tr>${sls.map(sl => sl.places.map((pl, pi) => `<tr><td><b>${esc(sl.name)}</b></td><td>${esc(pl.n || '')}</td>${ex.time ? `<td style="white-space:nowrap">${esc(rangeTxt(slotTime(sl, sec), sec))}</td>` : ''}${days.map(d => `<td>${slotDays(sl, sec).includes(d) ? names(cfg.roster[key(sl, d, pi)]) : '—'}</td>`).join('')}</tr>`).join('') + (ex.res && sl.reserve ? `<tr><td><b>${esc(sl.name)}</b></td><td style="color:#B7791F">احتياط</td>${ex.time ? '<td></td>' : ''}${days.map(d => `<td style="color:#B7791F">${slotDays(sl, sec).includes(d) ? names(cfg.roster[rkey(sl, d)]) : '—'}</td>`).join('')}</tr>` : '')).join('')}</table>`;
    const byDay = sls => days.map((d, i) => `<div style="${i ? 'break-before:page;' : ''}"><h2 style="margin:0 0 6px;color:#005499">يوم ${DAYS[d]}</h2><table><tr><th>الفترة</th>${ex.time ? '<th>التوقيت</th>' : ''}<th>الموقع</th><th>المكلَّف</th>${ex.res ? '<th>الاحتياط</th>' : ''}<th>التوقيع</th></tr>${sls.filter(sl => slotDays(sl, sec).includes(d)).map(sl => sl.places.map((pl, pi) => `<tr><td><b>${esc(sl.name)}</b></td>${ex.time ? `<td style="white-space:nowrap">${esc(rangeTxt(slotTime(sl, sec, isoForDow(d)), sec))}</td>` : ''}<td>${esc(pl.n || '')}</td><td>${names(cfg.roster[key(sl, d, pi)])}</td>${ex.res ? `<td>${pi === 0 ? names(cfg.roster[rkey(sl, d)]) : ''}</td>` : ''}<td style="width:80px"></td></tr>`).join('')).join('')}</table></div>`).join('');
    const byPerson = sls => { const per = {}; days.forEach(d => dayList(sec, isoForDow(d), cfg).filter(x => sls.includes(x.sl)).forEach(x => (per[x.t] = per[x.t] || []).push({ d, ...x }))); return Object.keys(per).sort((a, b) => pn(a).localeCompare(pn(b), 'ar')).map(t => `<div style="break-inside:avoid;margin-bottom:14px"><h3 style="margin:0 0 4px">${esc(pn(t))} <small>(${AR(per[t].length)} تكليف)</small></h3><table><tr><th>اليوم</th><th>الفترة</th><th>الموقع</th>${ex.time ? '<th>التوقيت</th>' : ''}</tr>${per[t].map(x => `<tr><td>${DAYS[x.d]}</td><td>${esc(x.sl.name)}</td><td>${esc(x.pl.n || '')}</td>${ex.time ? `<td>${esc(rangeTxt(x.tm, sec))}</td>` : ''}</tr>`).join('')}</table><p style="font-size:12px;margin:4px 0 0">التوقيع بالعلم: ..............................</p></div>`).join(''); };
    q('#exP').onclick = () => { const sc = read(); const parts = sc === 'sep' ? ['sup', 'duty'].filter(k => cfg.slots.some(sl => sl.cat === k)) : [sc]; const body = ex.by === 'day' ? byDay : ex.by === 'person' ? byPerson : bySlot;
      const html = parts.map((k, i) => { const sls = slotsOf(k), cats = k === 'all' ? Object.keys(CATS).filter(c => sls.some(sl => sl.cat === c)) : [k]; return `<div style="${i ? 'break-before:page;' : ''}">${parts.length > 1 ? `<h2 style="margin:0 0 6px;color:#005499">جدول ${CATS[k]}</h2>` : ''}${body(sls)}${notesH(cats)}${signH()}</div>`; }).join('') + mapH();
      A.printDoc(sc === 'sup' ? ex.title.replace('الإشراف والمناوبة', 'الإشراف') : sc === 'duty' ? ex.title.replace('الإشراف والمناوبة', 'المناوبة') : ex.title, ex.sub, html, ex.by !== 'day' && ex.by !== 'person'); };
    q('#exX').onclick = () => { const sc = read(); const wb = XLSX.utils.book_new(); (sc === 'sep' ? ['sup', 'duty'] : [sc]).forEach(k => { const rows = []; slotsOf(k).forEach(sl => { sl.places.forEach((pl, pi) => { const o = { 'الفترة': sl.name, 'التصنيف': CATS[sl.cat], 'الموقع': pl.n }; if (ex.time) o['التوقيت'] = rangeTxt(slotTime(sl, sec), sec); days.forEach(d => o[DAYS[d]] = (cfg.roster[key(sl, d, pi)] || []).filter(Boolean).map(pn).join('، ')); rows.push(o); }); if (ex.res && sl.reserve) { const o = { 'الفترة': sl.name, 'التصنيف': CATS[sl.cat], 'الموقع': 'احتياط' }; if (ex.time) o['التوقيت'] = ''; days.forEach(d => o[DAYS[d]] = (cfg.roster[rkey(sl, d)] || []).filter(Boolean).map(pn).join('، ')); rows.push(o); } }); const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]); ws['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws, k === 'all' ? 'الإشراف والمناوبة' : CATS[k]); }); XLSX.writeFile(wb, `${ex.title} - ${sec.name}.xlsx`); };
  }

  // ---------- الجدول الأسبوعي ----------
  function tRoster(B, sec, C, root) {
    const cfg = cfgOf(sec); if (!cfg.slots.length) { B.innerHTML = A.emptyBox('أضف الفترات أولاً', 'من تبويب «الفترات والأماكن».'); return; }
    const days = daysOf(sec), cnt = {}; Object.entries(cfg.roster).forEach(([k, l]) => { if (k.endsWith('|r')) return; (l || []).forEach(t => { if (t) cnt[t] = (cnt[t] || 0) + 1; }); });
    const clashes = new Set(); days.forEach(d => { const L = dayList(sec, isoForDow(d), cfg); L.forEach((a, i) => L.slice(i + 1).forEach(b => { if (a.t === b.t && overlap(a.tm, b.tm)) { clashes.add(key(a.sl, d, a.pi) + a.t); clashes.add(key(b.sl, d, b.pi) + b.t); } })); });
    const opts = (sel, sl, d) => `<option value="">—</option>` + C.T.map(t => { const w = why(cfg, sec, C, t, sl, d); return `<option value="${t}" ${t === sel ? 'selected' : ''} ${w && t !== sel ? 'disabled' : ''}>${esc(pn(t))} (${AR(cnt[t] || 0)})${w ? ' — ' + w : ''}</option>`; }).join('');
    const cell = (kk, n, sl, d, cls) => Array.from({ length: n }, (_, k) => { const t = (cfg.roster[kk] || [])[k] || ''; return `<select class="in du-s ${cls || ''} ${t && clashes.has(kk + t) ? 'bad' : ''}" data-k="${kk}|${k}" aria-label="${esc(sl.name + ' ' + DAYS[d])}">${opts(t, sl, d)}</select>`; }).join('');
    const cats = Object.keys(CATS).filter(k => cfg.slots.some(sl => sl.cat === k));
    const unfilled = cfg.slots.reduce((a, sl) => a + days.filter(d => slotDays(sl, sec).includes(d)).reduce((b, d) => b + sl.places.reduce((c, pl, pi) => c + Math.max(0, (+pl.need || 1) - (cfg.roster[key(sl, d, pi)] || []).filter(Boolean).length), 0), 0), 0);
    const vals = C.T.filter(t => !cfg.excl.includes(t)).map(t => cnt[t] || 0);
    B.innerHTML = `<div class="row" style="gap:6px;margin-bottom:10px;flex-wrap:wrap"><button class="btn ok" id="duGen">${Object.keys(cfg.roster).length ? 'إعادة التوزيع الذكي' : 'توزيع ذكي تلقائي'}</button><button class="btn" id="duEx">${I.print || ''} تصدير بهوية دينا</button><button class="btn ghost" id="duSm">الإعدادات الذكية</button>${cfg.gen ? `<span class="small muted">آخر توزيع: ${esc(A.fmtDT ? A.fmtDT(cfg.gen) : cfg.gen)}</span>` : ''}</div>
      <div class="pal-k" style="margin-bottom:10px"><div class="k ${unfilled ? 'warn' : 'ok'}"><b>${AR(unfilled)}</b>خانة غير مسندة</div><div class="k ${clashes.size ? 'bad' : 'ok'}"><b>${AR(clashes.size / 2)}</b>تعارض</div><div class="k info"><b>${vals.length ? AR(Math.min(...vals)) + ' – ' + AR(Math.max(...vals)) : '—'}</b>أقل وأعلى تكليف للشخص</div><div class="k"><b>${AR(vals.length)}</b>مشارك</div></div>
      <div class="scroll"><table class="tbl du-g"><thead><tr><th>الفترة / الموقع</th><th>التوقيت</th>${days.map(d => `<th>${DAYS[d]}</th>`).join('')}</tr></thead><tbody>${cats.map(c => `<tr class="du-cat"><th colspan="${days.length + 2}">${CATS[c]}</th></tr>` + cfg.slots.filter(sl => sl.cat === c).map(sl => sl.places.map((pl, pi) => `<tr><th style="text-align:start"><b>${esc(sl.name)}</b><div class="small">${esc(pl.n || '—')}</div></th><td class="small" style="white-space:nowrap">${range(slotTime(sl, sec), sec)}</td>${days.map(d => !slotDays(sl, sec).includes(d) ? '<td class="faint">—</td>' : `<td>${cell(key(sl, d, pi), +pl.need || 1, sl, d)}</td>`).join('')}</tr>`).join('') + (sl.reserve ? `<tr class="du-res"><th style="text-align:start"><b>${esc(sl.name)}</b><div class="small">احتياط</div></th><td></td>${days.map(d => !slotDays(sl, sec).includes(d) ? '<td class="faint">—</td>' : `<td>${cell(rkey(sl, d), sl.reserve, sl, d, 'res')}</td>`).join('')}</tr>` : '')).join('')).join('')}</tbody></table></div>
      <p class="small muted">الرقم بجانب الاسم = عدد تكليفاته في الأسبوع، والأسماء المعطّلة غير مؤهلة لتلك الخانة مع السبب. التعديل اليدوي يُحفظ فوراً.</p>`;
    $$('[data-k]', B).forEach(sel => sel.onchange = () => A.run(null, async () => { const p = sel.dataset.k.split('|'), k = +p.pop(), kk = p.join('|'); cfg.roster[kk] = cfg.roster[kk] || []; cfg.roster[kk][k] = sel.value || null; await saveCfg(sec, cfg); tRoster(B, sec, C, root); A.toast('حُفظ', 'ok'); }));
    $('#duGen', B).onclick = e => A.run(e.currentTarget, async () => { if (Object.keys(cfg.roster).length && !(await A.confirmBox('إعادة توزيع جدول الإشراف والمناوبة بالكامل؟ التعديلات اليدوية الحالية تُستبدل.', 'توزيع'))) return; const r = generate(cfg, sec, C); cfg.roster = r.roster; cfg.gen = new Date().toISOString(); await saveCfg(sec, cfg); A.toast(r.miss.length ? `بقيت ${AR(r.miss.length)} خانة بلا مؤهل — وسّع التوفر أو زِد «أقصى تكليف في اليوم» من الإعدادات الذكية` : 'وُزّع توزيعاً ذكياً عادلاً بلا تعارض', r.miss.length ? 'err' : 'ok'); tRoster(B, sec, C, root); });
    $('#duEx', B).onclick = () => exportDialog(sec, cfg);
    $('#duSm', B).onclick = () => { A.LS.set('du_t', 'smart'); V.duty(root); };
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
      const dw = dowOf(day);
      const sub = (id, sl) => { const rs = ((cfg.roster[rkey(sl, dw)] || []).filter(Boolean)); return `<select class="in" data-sub="${id}" style="width:auto" aria-label="البديل"><option value="">البديل…</option>${rs.length ? `<optgroup label="الاحتياط">${rs.map(t => `<option value="${t}">★ ${esc(pn(t))}</option>`).join('')}</optgroup>` : ''}<optgroup label="الجميع">${C.T.filter(t => !rs.includes(t)).map(t => `<option value="${t}">${esc(pn(t))}</option>`).join('')}</optgroup></select>`; };
      B.innerHTML = `<div class="row" style="gap:8px;margin-bottom:10px;flex-wrap:wrap"><input type="date" class="in" id="duD" value="${day}" max="${today()}" style="width:auto"><span class="small muted">${DAYS[dowOf(day)]}</span>${day === today() ? '<span class="rec-st ok" role="status">لحظي · يتحدّث كل دقيقة</span>' : ''}<button class="btn ghost sm" id="duPD2">${I.print || ''} طباعة اليوم</button></div>
        <div class="pal-k"><div class="k info"><b>${AR(live.length)}</b>مناوب في موقعه الآن (حسب الجدول)</div><div class="k ${comp != null && comp < 90 ? 'bad' : 'ok'}"><b>${comp == null ? '—' : AR(comp) + '٪'}</b>الالتزام في الفترات التي بدأت</div><div class="k warn"><b>${AR(notIn.length)}</b>لم يُسجَّل تواجده</div><div class="k bad"><b>${AR(abs.length)}</b>غياب / تبديل</div><div class="k"><b>${AR(L.length)}</b>تكليف اليوم</div></div>
        ${!L.length ? `<div style="margin-top:12px">${A.emptyBox('لا توجد تكليفات لهذا اليوم', cfg.slots.length ? 'وزّع الجدول من «الجدول الأسبوعي».' : 'ابدأ من «الفترات والأماكن».')}</div>` : ''}
        <div class="du-day">${groups.map(g => { const st = stOf(g.tm, day); return `<div class="sec-box du-c ${st === 'now' ? 'du-now' : ''}"><div class="row" style="justify-content:space-between;gap:6px"><span><b>${esc(g.sl.name)}</b> <span class="small muted">${CATS[g.sl.cat] || ''}</span>${(cfg.roster[rkey(g.sl, dowOf(day))] || []).filter(Boolean).length ? `<div class="small">الاحتياط: <b>${(cfg.roster[rkey(g.sl, dowOf(day))] || []).filter(Boolean).map(t => esc(pn(t))).join('، ')}</b></div>` : ''}</span><span class="row" style="gap:6px"><span class="pill st-submitted">${range(g.tm, sec)}</span>${ST[st] ? `<span class="pill ${ST[st][1] === 'ok' ? 'st-approved' : ST[st][1] === 'warn' ? 'st-returned' : 'st-empty'}">${ST[st][0]}</span>` : ''}</span></div>
          <div class="du-items">${g.items.map(x => { const r = lg(x), id = [x.sl.id, x.pi, x.t].join('|'); return `<div class="du-it"><div class="du-ih"><span class="small muted">${esc(x.pl.n || '—')}</span><b>${esc(pn(x.t))}</b>${r && r.status === 'swap' && r.sub_staff ? `<span class="small">← البديل: <b>${esc(pn(r.sub_staff))}</b></span>` : ''}
            ${r ? `<span class="pill ${LG[r.status][1]}">${LG[r.status][0]}</span><span class="faint small">${esc(new Date(r.at).toLocaleTimeString('ar-SA', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' }))}</span>` : st === 'now' || st === 'done' ? '<span class="pill st-returned">لم يُسجَّل</span>' : ''}</div>
            <div class="du-ia">${['present', 'late', 'absent'].map(k => `<button class="btn ${r && r.status === k ? '' : 'ghost'} sm" data-ck="${id}|${k}">${LG[k][0]}</button>`).join('')}${sub(id, x.sl)}${r ? `<button class="btn ghost sm" data-ck="${id}|clear" aria-label="مسح التسجيل">↺</button>` : ''}</div></div>`; }).join('')}</div></div>`; }).join('')}</div>`;
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
      ${(() => { const cf = cfgOf(sec), cs = [...new Set(wk.map(x => x.sl.cat))]; return cs.map(k => (cf.notes[k] || '').trim() ? `<details style="margin-top:6px"><summary class="small">تعليمات ${CATS[k]}</summary><ol class="small" style="margin:4px 0 0;padding-inline-start:18px">${cf.notes[k].split(/\n+/).filter(x => x.trim()).map(x => `<li>${esc(x)}</li>`).join('')}</ol></details>` : '').join(''); })()}<details style="margin-top:6px"><summary class="small">تكليفاتي هذا الأسبوع</summary><ul class="small" style="margin:4px 0 0;padding-inline-start:18px">${wk.map(x => `<li>${DAYS[x.d]} · ${esc(x.sl.name)} · ${esc(x.pl.n || '')} · ${esc(rangeTxt(slotTime(x.sl, sec, isoForDow(x.d)), sec))}</li>`).join('')}</ul></details></div>`;
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
