/* منصة دينا — اليوم الدراسي والجدول الزمني (لحساب المالك داخل استوديو الجداول)
   لكل قسم: أيام الدراسة، عدد الحصص، جداول زمنية مسمّاة (بداية اليوم، مدة كل حصة، وقت الانتقال، فسحات تختلف حسب الصفوف)،
   تفعيل جدول لفترة محددة ثم العودة تلقائياً للجدول الأساسي، الإجازات بالتاريخ، وملصق «الجدول الزمني لليوم الدراسي» للطباعة والصورة.
   يُحفظ في sections.bell — ولا يمس خطط المعلمين. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, DAYS, PER } = A;
  const uid = () => Math.random().toString(36).slice(2, 9);
  const toMin = t => { const [h, m] = String(t || '07:00').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const hhmm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const fmt = (m, b) => { const h24 = Math.floor(m / 60) % 24, mm = String(m % 60).padStart(2, '0'); if (b && b.h24) return AR(String(h24).padStart(2, '0') + ':' + mm); const h = h24 % 12 || 12; return `${AR(h + ':' + mm)} ${h24 < 12 ? 'ص' : 'م'}`; };
  const isoToday = () => A.isoDate(new Date());
  const dAR = iso => { const [y, m, d] = String(iso || '').split('-'); return d ? AR(`${+d}/${+m}/${y}`) : ''; };
  const allCls = () => (S.allClasses && S.allClasses.length ? S.allClasses : S.classes) || [];
  const DEF_FOOT = 'رحلتهم الكبرى... تبدأ من هنا', DEF_TITLE = 'الجدول الزمني لليوم الدراسي';
  const defSched = (name) => ({ id: uid(), name: name || 'الجدول الأساسي', tag: '', title: DEF_TITLE, foot: DEF_FOOT, start: '07:00', dur: 45, pass: 0, show: true, h24: false, perDur: {}, breaks: [{ id: uid(), after: 3, dur: 20, label: 'الفسحة', classes: [] }] });
  const norm = raw => {
    const b = JSON.parse(JSON.stringify(raw || {}));
    if (!Array.isArray(b.schedules) || !b.schedules.length) b.schedules = [defSched()];
    b.schedules.forEach(s => { s.perDur = s.perDur || {}; s.breaks = s.breaks || []; if (s.show === undefined) s.show = true; s.title = s.title || DEF_TITLE; s.foot = s.foot == null ? DEF_FOOT : s.foot; });
    if (!b.schedules.some(s => s.id === b.def)) b.def = b.schedules[0].id;
    b.acts = Array.isArray(b.acts) ? b.acts : []; b.holidays = Array.isArray(b.holidays) ? b.holidays : [];
    return b;
  };
  const bellOf = sec => norm((sec || A.section() || {}).bell);
  const actOn = (b, d) => b.acts.find(a => a.from && a.to && a.from <= d && d <= a.to && b.schedules.some(s => s.id === a.sid));
  const activeSched = (b, d = isoToday()) => { const pn = window.DinaBell && window.DinaBell.pinOn(b, d); if (pn && pn.kind === 'sched') { const ps = b.schedules.find(s => s.id === pn.id); if (ps) return ps; } const a = actOn(b, d); return b.schedules.find(s => s.id === (a ? a.sid : b.def)) || b.schedules[0]; };
  const applies = (br, cid) => !(br.classes || []).length || (cid && br.classes.includes(cid));
  // الخط الزمني لجدول + فصل (الفسحات المقيّدة بصفوف تظهر لتلك الصفوف فقط)
  function timeline(s, P, cid) {
    const out = []; let t = toMin(s.start);
    for (let p = 0; p < P; p++) {
      const d = +s.perDur[p] || +s.dur || 45; out.push({ k: 'p', i: p, from: t, to: t + d, dur: d }); t += d;
      if (p === P - 1) break;
      const brs = s.breaks.filter(b => +b.after === p + 1 && applies(b, cid));
      if (brs.length) brs.forEach(b => { const bd = +b.dur || 0; out.push({ k: 'b', label: b.label || 'الفسحة', from: t, to: t + bd, dur: bd }); t += bd; });
      else if (+s.pass > 0) { out.push({ k: 't', from: t, to: t + +s.pass, dur: +s.pass }); t += +s.pass; }
    }
    return { items: out, start: toMin(s.start), end: t };
  }
  // أيام هذا الجدول وعدد حصص كل يوم (منفصلة عن إعداد القسم، ولا تتجاوزه)
  const actDays = (s, sec) => { const n = (sec || A.section()).days || 5, all = Array.from({ length: n }, (_, i) => i); return Array.isArray(s.days) && s.days.length ? all.filter(d => s.days.includes(d)) : all; };
  const schedP = (s, sec, d) => { const P = (sec || A.section()).periods || 7, base = Math.min(P, +s.np || P); return d == null ? base : Math.min(P, +(s.perDay || {})[d] || base); };
  const maxP = (s, sec) => Math.max(1, ...actDays(s, sec).map(d => schedP(s, sec, d)));
  A.bell = { norm, bellOf, activeSched, timeline, fmt, actDays, schedP, maxP, posterHTML: (...a) => posterHTML(...a), printPoster: (...a) => printPoster(...a), pngPoster: (...a) => pngPoster(...a) };
  // توقيت اليوم الموحّد مع شاشة اللوحة (bellcore.js): إجازة ← استثنائي منشور ← تفعيل بتاريخ ← أساسي
  const DISP = {}, DISPT = {};
  A.bell.loadDisp = async (sid, force) => { sid = sid || S.sectionId; if (!sid) return []; if (!force && DISP[sid] && Date.now() - DISPT[sid] < 120000) return DISP[sid]; try { DISP[sid] = (await api.list('display_schedules', { section_id: sid })) || []; } catch (_) { DISP[sid] = DISP[sid] || []; } DISPT[sid] = Date.now(); return DISP[sid]; };
  A.bell.dispOf = sid => DISP[sid || S.sectionId];
  A.bell.dayPlan = (sec, iso, cid) => { sec = sec || A.section(); if (!window.DinaBell || !sec) return null; if (!DISP[sec.id]) A.bell.loadDisp(sec.id); return window.DinaBell.dayPlan(sec, iso || isoToday(), DISP[sec.id] || [], cid); };
  /* التحكم في التوقيت المعتمد للعرض (اللوحة اليومية + حضور الحصص + رؤوس الجداول)
     o = { bell: كائن الجدول الزمني (يُعدَّل), save: async bell => حفظ, done: () => بعد الحفظ } — لحساب المالك */
  A.bell.pinCtl = async (el, sec, o) => {
    const DB = window.DinaBell; if (!el || !DB) return;
    const b = o.bell, disp = await A.bell.loadDisp(sec.id, true), td = isoToday(), dow = DB.dowOf(td);
    const nD = sec.days || 5, wkEnd = DB.addDays(td, dow < nD ? nD - 1 - dow : nD - 1 + 7 - dow);
    const sx = () => ({ bell: b, periods: sec.periods, days: sec.days });
    const cur = DB.dayPlan(sx(), td, disp, null), pin = b.pin && b.pin.id ? b.pin : null;
    const pinName = pin ? (pin.kind === 'sched' ? (b.schedules.find(x => x.id === pin.id) || {}).name : (disp.find(x => x.id === pin.id) || {}).label) : '';
    const tS = s => fmt(toMin(s.start), s);
    const opt = (v, t, sel) => `<option value="${v}" ${sel ? 'selected' : ''}>${esc(t)}</option>`;
    el.innerHTML = `<div class="pin-ctl">
      <div class="pin-now"><span>التوقيت المعتمد للعرض الآن:</span> <b>${esc(cur.name || '—')}</b> ${pin ? `<span class="pill st-sub">معتمد يدوياً${pin.to ? ' حتى ' + dAR(pin.to) : ' حتى تغييره'}</span>` : '<span class="pill st-ok">تلقائي</span>'}</div>
      <div class="pin-row">
        <div class="field"><label for="pcS">اختر الجدول المعتمد</label><select class="in" id="pcS">
          ${opt('auto', 'تلقائي — حسب الأولوية (الإجازة ← الاستثنائي المنشور ← المفعّل لفترة ← الأساسي)', !pin)}
          <optgroup label="الجداول الزمنية">${b.schedules.map(s => opt('s:' + s.id, `${(s.name || '').trim()} — يبدأ ${tS(s)}${s.id === b.def ? ' (الأساسي)' : ''}`, pin && pin.kind === 'sched' && pin.id === s.id)).join('')}</optgroup>
          ${disp.length ? `<optgroup label="الجداول الاستثنائية">${disp.slice().sort((x, y) => String(y.date_from).localeCompare(String(x.date_from))).map(d => opt('d:' + d.id, `${d.label} — ${dAR(d.date_from)} إلى ${dAR(d.date_to)}${d.published ? '' : ' (غير منشور)'}${(d.meta && d.meta.times && d.meta.times[0]) ? ' — يبدأ ' + AR(d.meta.times[0][0]) : ''}`, pin && pin.kind === 'disp' && pin.id === d.id)).join('')}</optgroup>` : ''}
        </select></div>
        <div class="field" id="pcRw"><label for="pcR">مدة الاعتماد</label><select class="in" id="pcR">
          ${opt('ever', 'حتى أغيّره', pin && !pin.to)}${opt('today', 'اليوم فقط (' + dAR(td) + ')')}${opt('week', 'حتى نهاية الأسبوع (' + dAR(wkEnd) + ')', pin && pin.to === wkEnd)}${opt('ds', 'فترة الجدول الاستثنائي')}${opt('custom', 'فترة محددة…', pin && pin.to && pin.to !== wkEnd)}
        </select></div>
        <div class="field pc-dt" hidden><label for="pcF">من</label><input class="in" type="date" id="pcF" value="${(pin && pin.from) || td}"></div>
        <div class="field pc-dt" hidden><label for="pcT">إلى</label><input class="in" type="date" id="pcT" value="${(pin && pin.to) || wkEnd}"></div>
        <div class="field"><label>&nbsp;</label><button class="btn sm" id="pcGo">اعتماد وعرض توقيته</button></div>
      </div>
      <div class="pin-pv" id="pcPv" aria-live="polite"></div></div>`;
    const g = id => el.querySelector(id), selV = () => g('#pcS').value;
    const range = () => { const r = g('#pcR').value, v = selV(); if (r === 'today') return [td, td]; if (r === 'week') return [td, wkEnd]; if (r === 'custom') return [g('#pcF').value || td, g('#pcT').value || '']; if (r === 'ds' && v.startsWith('d:')) { const d = disp.find(x => x.id === v.slice(2)); return d ? [d.date_from, d.date_to] : [td, '']; } return [td, '']; };
    const build = () => { const v = selV(); if (v === 'auto') return null; const [from, to] = range(); return { kind: v.startsWith('s:') ? 'sched' : 'disp', id: v.slice(2), from, to: to || null, at: new Date().toISOString(), by: S.me && S.me.id }; };
    const pv = () => {
      const v = selV(), isD = v.startsWith('d:'); g('#pcRw').hidden = v === 'auto'; el.querySelectorAll('.pc-dt').forEach(x => x.hidden = v === 'auto' || g('#pcR').value !== 'custom');
      const dsO = g('#pcR').querySelector('[value="ds"]'); dsO.disabled = !isD; if (!isD && g('#pcR').value === 'ds') g('#pcR').value = 'ever';
      const nb = JSON.parse(JSON.stringify(b)); const np = build(); if (np) nb.pin = np; else delete nb.pin;
      const day = np && np.from && np.from > td ? np.from : td, pl = DB.dayPlan({ bell: nb, periods: sec.periods, days: sec.days }, day, disp, null), ps = pl.items.filter(x => x.k === 'p'), br = pl.items.filter(x => x.k === 'b'), f = m => fmt(m, pl.sched || {});
      g('#pcPv').innerHTML = `<span class="small muted">${day === td ? 'سيظهر اليوم' : 'سيظهر يوم ' + dAR(day)}:</span> <b>${esc(pl.name || DB.SRC[pl.src] || '')}</b> ${ps.length ? `· ${f(pl.start)} – ${f(pl.end)} · ${AR(ps.length)} حصص · ${br.length ? 'الفسحة ' + br.map(x => f(x.from) + ' – ' + f(x.to)).join('، ') : 'بلا فسحة'}` : `· ${esc(DB.SRC[pl.src] || '')}`}${pl.warn.length ? `<div class="small" style="color:#C0392B">${esc(pl.warn.join(' — '))}</div>` : ''}${ps.length ? `<div class="bl-strip" style="margin-top:6px">${pl.items.map(x => `<div class="bl-it ${x.k}" style="flex:${Math.max(1, x.dur)}">${x.k === 'p' ? `<b>${AR(x.i + 1)}</b><small>${f(x.from)}</small>` : x.k === 'b' ? '<b>☕</b>' : ''}</div>`).join('')}</div>` : ''}`;
    };
    ['#pcS', '#pcR', '#pcF', '#pcT'].forEach(id => g(id).onchange = pv); pv();
    g('#pcGo').onclick = ev => A.run(ev.currentTarget, async () => {
      const np = build(); if (np && np.to && np.to < np.from) throw new Error('تاريخ النهاية قبل البداية');
      const nm = np ? (np.kind === 'sched' ? (b.schedules.find(x => x.id === np.id) || {}).name : (disp.find(x => x.id === np.id) || {}).label) : 'التوقيت التلقائي';
      if (!(await A.confirmBox(`اعتماد «${esc(nm)}» للعرض في ${esc(sec.name)}${np ? (np.to ? ` من ${dAR(np.from)} إلى ${dAR(np.to)}` : ' حتى تغييره') : ''}؟<br><span class="small muted">يظهر توقيته في شاشة اللوحة اليومية وحضور الحصص ورؤوس الجداول. لا يُحذف أي جدول ولا تتغيّر الخطط، ويمكن الرجوع للتلقائي في أي وقت.</span>`, 'اعتماد'))) return;
      if (np) b.pin = np; else delete b.pin;
      await o.save(b); A.toast(np ? 'اعتُمد التوقيت للعرض' : 'عاد التوقيت التلقائي', 'ok'); if (o.done) o.done();
    });
  };
  // وقت الحصة في رؤوس الجداول (إن كان الإظهار مفعّلاً في الجدول الساري اليوم)
  A.ptime = (p, cid) => { try { const sec = A.section(); if (!sec || !sec.bell || !sec.bell.schedules) return ''; const b = bellOf(sec), s = activeSched(b); if (!s.show) return ''; const it = timeline(s, maxP(s, sec), cid).items.find(x => x.k === 'p' && x.i === p); return it ? `<small class="ptm" dir="rtl">${fmt(it.from, s)} – ${fmt(it.to, s)}</small>` : ''; } catch (_) { return ''; } };

  // ---------- الملصق ----------
  const CLOCK = '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  const ICO = {
    sun: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#005499" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    flag: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#005499" stroke-width="2" stroke-linecap="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
    book: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#005499" stroke-width="2" stroke-linecap="round"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16"/></svg>',
    time: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#005499" stroke-width="2" stroke-linecap="round"><path d="M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 3-2 4-5 6"/></svg>',
  };
  const ic = svg => `background:#E4EBF5 url(&quot;data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '))}&quot;) center/26px 26px no-repeat`;
  function posterHTML(sec, s, cid) {
    const P = maxP(s, sec), dd = actDays(s, sec), tl = timeline(s, P, cid), durs = tl.items.filter(x => x.k === 'p').map(x => x.dur), same = durs.every(d => d === durs[0]);
    const cls = cid ? (allCls().find(c => c.id === cid) || {}).name : '';
    const row = it => {
      if (it.k === 't') return `<div class="bp-row bp-pass"><span class="bp-tm">${fmt(it.from, s)}</span><span class="bp-dot"></span><span class="bp-lb">انتقال · ${AR(it.dur)} د</span></div>`;
      const cl = it.k === 'b' ? 'bp-brk' : '';
      const lb = it.k === 'b' ? esc(it.label) : `الحصة ${PER[it.i] || AR(it.i + 1)}`;
      return `<div class="bp-row ${cl}"><span class="bp-tm"><b>${fmt(it.from, s)}</b><i>إلى</i><b>${fmt(it.to, s)}</b></span><span class="bp-dot">${it.k === 'b' ? '☕' : AR(it.i + 1)}</span><span class="bp-lb"><b>${lb}</b><i>${AR(it.dur)} دقيقة</i></span></div>`;
    };
    const n = tl.items.length + 1, dense = n > 14 ? (n > 18 ? ' bp-xdense' : ' bp-dense') : '';
    return `<div class="bposter${dense}" dir="rtl">
      <div class="bp-top"><img src="assets/logo.svg" alt="مدارس دينا العالمية">${s.tag ? `<span class="bp-tag">${esc(s.tag)}</span>` : ''}</div>
      <div class="bp-title"><span class="bp-clock">${CLOCK}</span><h1>${esc(s.title || DEF_TITLE)}</h1></div>
      <p class="bp-sub">${esc(sec.name)}${cls ? ' · ' + esc(cls) : ''}${s.name && s.name !== 'الجدول الأساسي' ? ' · ' + esc(s.name) : ''}<br><span class="bp-days">أيام الدراسة: ${dd.length === (sec.days || 5) ? `${DAYS[dd[0]]} – ${DAYS[dd[dd.length - 1]]}` : dd.map(d => DAYS[d]).join('، ')}${dd.some(d => schedP(s, sec, d) !== P) ? ' · ' + dd.filter(d => schedP(s, sec, d) !== P).map(d => `${DAYS[d]} ${AR(schedP(s, sec, d))} حصص`).join('، ') : ''}</span></p>
      <div class="bp-stats">
        <div><span style="${ic(ICO.sun)}"></span><i>بداية اليوم</i><b>${fmt(tl.start, s)}</b></div>
        <div><span style="${ic(ICO.flag)}"></span><i>نهاية اليوم</i><b>${fmt(tl.end, s)}</b></div>
        <div><span style="${ic(ICO.book)}"></span><i>عدد الحصص</i><b>${AR(P)} حصص</b></div>
        <div><span style="${ic(ICO.time)}"></span><i>مدة الحصة</i><b>${same ? AR(durs[0]) + ' دقيقة' : 'متفاوتة'}</b></div></div>
      <div class="bp-line">${tl.items.map(row).join('')}
        <div class="bp-row bp-end"><span class="bp-tm"><b>${fmt(tl.end, s)}</b></span><span class="bp-dot">✓</span><span class="bp-lb"><b>نهاية اليوم الدراسي</b></span></div></div>
      <div class="bp-foot"><svg viewBox="0 0 800 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 40 C 160 0 300 70 460 38 C 600 10 700 30 800 18 L800 120 L0 120 Z" fill="#3AB1DB" opacity=".55"/><path d="M0 60 C 170 18 320 92 480 56 C 620 26 720 52 800 36 L800 120 L0 120 Z" fill="#082B5A"/></svg><p>${esc(s.foot || '')}</p></div>
    </div>`;
  }
  const POSTER_CSS = `.bposter{width:794px;min-height:1123px;box-sizing:border-box;background:#fff;color:#082B5A;font-family:'GE SS Two','Tajawal',sans-serif;position:relative;overflow:hidden;padding:34px 46px 150px;background-image:radial-gradient(circle at 92% 6%,#E4EBF5 0 120px,transparent 121px),radial-gradient(circle at 4% 40%,#EEF3FA 0 90px,transparent 91px)}
    .bp-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.bp-top img{height:76px}.bp-tag{background:#3AB1DB;color:#fff;border-radius:999px;padding:8px 22px;font-weight:800;font-size:18px}
    .bp-title{margin:26px auto 4px;display:flex;align-items:center;gap:14px;justify-content:center;background:#082B5A;color:#fff;border-radius:999px;padding:12px 30px;width:fit-content;box-shadow:0 10px 24px -10px rgba(8,43,90,.6)}.bp-title h1{margin:0;font-size:30px;font-weight:800}.bp-clock{color:#3AB1DB;display:flex}
    .bp-sub{text-align:center;color:#005499;margin:8px 0 18px;font-size:16px;line-height:1.7}.bp-days{font-size:14px;color:#4D6A8F}
    .bp-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:22px}.bp-stats div{border:2px solid #84B7E3;border-radius:18px;padding:12px 8px;text-align:center;background:#fff}.bp-stats span{display:inline-flex;width:46px;height:46px;border-radius:50%;background:#E4EBF5;color:#005499;align-items:center;justify-content:center}.bp-stats i{display:block;font-style:normal;color:#4D6A8F;font-size:14px;margin-top:6px}.bp-stats b{display:block;font-size:21px;margin-top:2px}
    .bp-line{position:relative;padding:0 6px}.bp-line:before{content:'';position:absolute;top:18px;bottom:18px;right:50%;margin-right:-1.5px;width:3px;background:linear-gradient(#3AB1DB,#082B5A);border-radius:3px}
    .bp-row{display:grid;grid-template-columns:1fr 54px 1fr;align-items:center;gap:14px;margin:7px 0;position:relative}
    .bp-tm{justify-self:end;display:flex;gap:8px;align-items:center;background:#E4EBF5;border-radius:999px;padding:8px 18px;font-size:19px;direction:rtl}.bp-tm b{font-weight:800}.bp-tm i{font-style:normal;color:#4D6A8F;font-size:14px}
    .bp-dot{width:46px;height:46px;border-radius:50%;background:#fff;border:3px solid #3AB1DB;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:19px;justify-self:center;z-index:1}
    .bp-lb{justify-self:start;display:flex;flex-direction:column}.bp-lb b{font-size:21px;font-weight:800}.bp-lb i{font-style:normal;color:#4D6A8F;font-size:14px}
    .bp-pass{margin:0}.bp-pass .bp-tm{background:none;padding:0 18px;font-size:14px;color:#4D6A8F}.bp-pass .bp-dot{width:14px;height:14px;border-width:2px;background:#84B7E3}.bp-pass .bp-lb{font-size:14px;color:#4D6A8F}
    .bp-brk .bp-tm{background:#FFF4DC;color:#8A5A12}.bp-brk .bp-dot{border-color:#E8B931;background:#FFF8E1}.bp-brk .bp-lb b{color:#8A5A12}
    .bp-end .bp-tm{background:#082B5A;color:#fff}.bp-end .bp-dot{background:#082B5A;border-color:#082B5A;color:#fff}
    .bp-dense .bp-row{margin:4px 0}.bp-dense .bp-dot{width:40px;height:40px;font-size:17px}.bp-dense .bp-tm{padding:6px 16px;font-size:17px}.bp-dense .bp-lb b{font-size:19px}
    .bp-xdense .bp-row{margin:2px 0}.bp-xdense .bp-dot{width:34px;height:34px;font-size:15px}.bp-xdense .bp-tm{padding:4px 14px;font-size:15px}.bp-xdense .bp-lb b{font-size:17px}.bp-xdense .bp-lb i{font-size:12px}
    .bp-foot{position:absolute;left:0;right:0;bottom:0;height:130px}.bp-foot svg{position:absolute;inset:0;width:100%;height:100%}.bp-foot p{position:absolute;left:0;right:0;bottom:22px;margin:0;text-align:center;color:#fff;font-size:26px;font-weight:800}`;
  const FONT_CSS = `@font-face{font-family:'GE SS Two';font-weight:400 500;src:url(fonts/gess-two-medium.woff2)}@font-face{font-family:'GE SS Two';font-weight:600 900;src:url(fonts/gess-two-bold.woff2)}`;
  if (!document.getElementById('bpCss')) { const st = document.createElement('style'); st.id = 'bpCss'; st.textContent = POSTER_CSS; document.head.appendChild(st); }

  function printPoster(html, title) {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:-9999px;width:900px;height:1200px;border:0'; document.body.appendChild(f);
    const base = location.href.replace(/[^/]*$/, '').split('#')[0];
    f.contentDocument.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="${base}"><title>${esc(title)}</title><style>${FONT_CSS}@page{size:A4 portrait;margin:0}html,body{margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}${POSTER_CSS}.bposter{width:210mm;min-height:297mm;height:297mm}</style></head><body>${html}</body></html>`);
    f.contentDocument.close();
    const go = () => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 3000); };
    const d = f.contentDocument, imgs = [...d.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }));
    Promise.race([Promise.all([d.fonts ? d.fonts.ready : 0, ...imgs]), new Promise(r => setTimeout(r, 1500))]).then(go);
  }
  async function pngPoster(html, name) {
    if (!window.html2canvas) throw new Error('أداة الصورة غير محمّلة');
    const w = document.createElement('div'); w.style.cssText = 'position:fixed;left:-10000px;top:0'; w.innerHTML = html; document.body.appendChild(w);
    try { if (document.fonts) await document.fonts.ready; const el = w.firstElementChild; await Promise.all([...el.querySelectorAll('img')].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
      const c = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true }); await new Promise(r => c.toBlob(b => { A.download(b, name + '.png'); r(); }, 'image/png'));
    } finally { w.remove(); }
  }

  // ---------- الواجهة ----------
  V.bell = function (root) {
    if (!S.me.is_owner) { root.innerHTML = `<div class="card">${A.emptyBox('هذه الإعدادات لحساب المالك')}</div>`; return; }
    const sec = A.section(); let b = bellOf(sec);
    let cur = A.LS.get('bell_s_' + sec.id); if (!b.schedules.some(s => s.id === cur)) cur = b.def;
    let pvCls = '', dirty = false, saving = null;
    const S0 = () => b.schedules.find(s => s.id === cur);
    const save = async (quiet) => {
      const r = await api.updateSection(sec.id, { bell: b }); Object.assign(sec, r); dirty = false; if (A._syncLiveTimes) A._syncLiveTimes();
      const st = $('#blSt', root); if (st) { st.textContent = 'محفوظ · ' + A.fmtDT(new Date().toISOString()); st.className = 'rec-st ok'; }
      if (!quiet) A.toast('حُفظت الإعدادات', 'ok');
    };
    let later = () => { dirty = true; const st = $('#blSt', root); if (st) { st.textContent = 'تعديلات غير محفوظة…'; st.className = 'rec-st'; } clearTimeout(saving); saving = setTimeout(() => save(true).catch(e => { const st2 = $('#blSt', root); if (st2) { st2.textContent = 'تعذّر الحفظ: ' + e.message; st2.className = 'rec-st bad'; } }), 900); };
    const today = isoToday(), act = actOn(b, today), live = activeSched(b, today);

    root.innerHTML = `<div class="card bl">
      <div class="head"><div class="grow"><h2>اليوم الدراسي والجدول الزمني — ${esc(sec.name)}</h2><p class="sub" style="margin:2px 0 0">حدد أيام الدراسة وعدد الحصص، وأنشئ جداول زمنية مسمّاة، وفعّل أيّها لفترة محددة ثم يعود الجدول الأساسي تلقائياً.</p></div><span class="rec-st ok" id="blSt" role="status" aria-live="polite">${sec.bell && sec.bell.schedules ? 'محفوظ' : 'لم يُحفظ بعد'}</span></div>
      <div class="bl-now ${act ? 'tmp' : ''}"><b>الساري اليوم:</b> ${esc(live.name)}${act ? ` <span class="small">(مؤقت${act.label ? ' — ' + esc(act.label) : ''} حتى ${dAR(act.to)}، ثم يعود «${esc((b.schedules.find(s => s.id === b.def) || {}).name)}»)</span>` : ' <span class="small muted">(الأساسي)</span>'}</div>

      <section class="bl-sec bl-chk" id="blChk" aria-live="polite"><h3>فحص التوقيت وما ستعرضه اللوحة اليومية</h3><div class="small muted">جارٍ الفحص…</div></section>

      <section class="bl-sec"><h3>أيام الدراسة والحصص</h3>
        <div class="grid g3"><div class="field"><label for="blDays">أيام الدراسة في الأسبوع</label><select class="in" id="blDays">${[4, 5, 6].map(n => `<option value="${n}" ${sec.days === n ? 'selected' : ''}>${AR(n)} أيام (${DAYS[0]} – ${DAYS[n - 1]})</option>`).join('')}</select></div>
        <div class="field"><label for="blPer">عدد الحصص اليومية</label><input class="in" type="number" id="blPer" min="1" max="12" value="${sec.periods || 7}"></div>
        <div class="field"><label>&nbsp;</label><button class="btn sm" id="blDP">حفظ الأيام والحصص</button></div></div>
        <p class="small muted" style="margin:0">ينطبق على جدول الحصص والخطط الأسبوعية لهذا القسم. تقليل العدد لا يحذف أي خطة مدخلة، لكن الحصص الزائدة تختفي من العرض.</p></section>

      <section class="bl-sec"><h3>الجداول الزمنية</h3>
        <div class="bl-chips" role="tablist">${b.schedules.map(s => `<button role="tab" data-sc="${s.id}" class="${s.id === cur ? 'on' : ''}" aria-selected="${s.id === cur}">${esc(s.name)}${s.id === b.def ? ' <span class="pill st-ok">أساسي</span>' : ''}${act && act.sid === s.id ? ' <span class="pill st-sub">ساري الآن</span>' : ''}${b.pin && b.pin.kind === 'sched' && b.pin.id === s.id ? ' <span class="pill st-warn">معتمد للعرض</span>' : ''}</button>`).join('')}
          <button class="btn ghost sm" id="blNew">+ جدول جديد</button><button class="btn ghost sm" id="blDup">نسخ الحالي</button></div>
        <div id="blEd"></div></section>

      <section class="bl-sec"><h3>تفعيل جدول لفترة محددة</h3><p class="small muted" style="margin:0 0 8px">مثل: رمضان، الاختبارات، التعليم عن بعد. خلال الفترة يُستخدم الجدول المختار، وبعد انتهائها يعود الأساسي تلقائياً دون أي تدخل.</p><div id="blActs"></div></section>

      <section class="bl-sec"><h3>الإجازات بالتاريخ</h3><p class="small muted" style="margin:0 0 8px">أضف الإجازة مرة واحدة ثم «تطبيق على الأسابيع» لتظهر أيامها إجازةً في الأسابيع المطابقة (لا تُحذف أي إجازة موجودة ولا أي خطة).</p><div id="blHol"></div></section>
    </div>
    <div class="card bl-pv"><div class="head"><div class="grow"><h2>ملصق الجدول الزمني</h2><p class="sub" style="margin:2px 0 0">معاينة حية لما سيُطبع — A4 بهوية دينا.</p></div>
      <div class="row" style="gap:6px;flex-wrap:wrap"><select class="in" id="blPvC" aria-label="الملصق لصف" style="width:auto"><option value="">الفسحات العامة</option>${allCls().map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><button class="btn sm" id="blPrint">${A.I.print || ''} طباعة / PDF</button><button class="btn ghost sm" id="blPng">${A.I.down || ''} صورة PNG</button></div></div>
      <div class="bl-stage"><div class="bl-scale" id="blPv"></div></div></div>`;

    const drawPv = () => { const s = S0(); const box = $('#blPv', root); box.innerHTML = posterHTML(sec, s, pvCls); fitPv(); };
    const fitPv = () => { const st = $('.bl-stage', root), sc = $('#blPv', root); if (!st || !sc) return; const k = Math.min(1, (st.clientWidth - 4) / 794); sc.style.transform = `scale(${k})`; st.style.height = Math.ceil(((sc.firstElementChild || {}).offsetHeight || 1123) * k) + 'px'; };
    const ro = new ResizeObserver(fitPv); ro.observe($('.bl-stage', root));

    // ---- محرر الجدول الزمني ----
    const drawEd = () => {
      const s = S0(), SP = sec.periods || 7, P = maxP(s, sec), ed = $('#blEd', root), tl = timeline(s, P, pvCls), dd = actDays(s, sec);
      ed.innerHTML = `<div class="grid g3">
          <div class="field"><label for="eN">اسم الجدول</label><input class="in" id="eN" value="${esc(s.name)}"></div>
          <div class="field"><label for="eTag">شارة أعلى الملصق (اختياري)</label><input class="in" id="eTag" value="${esc(s.tag || '')}" placeholder="مثال: للتعليم عن بعد" list="eTagL"><datalist id="eTagL"><option>للتعليم الحضوري</option><option>للتعليم عن بعد</option><option>دوام شهر رمضان</option><option>أيام الاختبارات</option><option>الدوام الشتوي</option></datalist></div>
          <div class="field"><label for="eTi">عنوان الملصق</label><input class="in" id="eTi" value="${esc(s.title || '')}"></div>
          <div class="field"><label for="eSt">بداية اليوم الدراسي</label><input class="in" type="time" id="eSt" value="${esc(s.start)}"></div>
          <div class="field"><label for="eDu">مدة الحصة (دقيقة)</label><input class="in" type="number" id="eDu" min="10" max="120" value="${+s.dur || 45}"></div>
          <div class="field"><label for="ePa">وقت الانتقال بين الحصص (دقيقة)</label><input class="in" type="number" id="ePa" min="0" max="20" value="${+s.pass || 0}"></div>
          <div class="field"><label for="eFo">عبارة التذييل</label><input class="in" id="eFo" value="${esc(s.foot || '')}"></div>
          <div class="field"><label class="chk" style="margin-top:26px"><input type="checkbox" id="eSh" ${s.show ? 'checked' : ''}> إظهار أوقات الحصص في الجداول</label></div>
          <div class="field"><label class="chk" style="margin-top:26px"><input type="checkbox" id="e24" ${s.h24 ? 'checked' : ''}> نظام ٢٤ ساعة</label></div></div>
        <div class="bl-days"><h4 style="margin:12px 0 6px">أيام هذا الجدول وحصصه <span class="small muted">— مستقلة لكل جدول (مثل التعليم عن بعد بست حصص)</span></h4>
          <div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><div class="field" style="margin:0"><label for="eNp">عدد الحصص في هذا الجدول</label><select class="in" id="eNp">${Array.from({ length: SP }, (_, i) => `<option value="${i + 1}" ${schedP(s, sec) === i + 1 ? 'selected' : ''}>${AR(i + 1)} حصص</option>`).join('')}</select></div><span class="small muted">الحد الأعلى ${AR(SP)} حسب إعداد القسم أعلاه.</span></div>
          <div class="bl-dg">${Array.from({ length: sec.days || 5 }, (_, d) => `<div class="bl-d ${dd.includes(d) ? 'on' : ''}"><label class="chk"><input type="checkbox" data-dy="${d}" ${dd.includes(d) ? 'checked' : ''}> ${DAYS[d]}</label><select class="in" data-dp="${d}" aria-label="حصص ${DAYS[d]}" ${dd.includes(d) ? '' : 'disabled'}>${Array.from({ length: schedP(s, sec) }, (_, i) => `<option value="${i + 1}" ${schedP(s, sec, d) === i + 1 ? 'selected' : ''}>${AR(i + 1)} حصص</option>`).join('')}</select></div>`).join('')}</div></div>
        <details class="bl-det"><summary>مدة مختلفة لحصة معينة <span class="small muted">(اتركها فارغة لتأخذ المدة العامة)</span></summary><div class="bl-pd">${Array.from({ length: P }, (_, p) => `<label><span>${PER[p] || AR(p + 1)}</span><input class="in" type="number" min="10" max="120" data-pd="${p}" value="${s.perDur[p] || ''}" placeholder="${+s.dur || 45}"></label>`).join('')}</div></details>
        <h4 style="margin:14px 0 6px">الفسحات والصلاة <span class="small muted">— يمكن أن تختلف حسب الصفوف</span></h4>
        <div class="bl-brs">${s.breaks.map(br => `<div class="bl-br" data-br="${br.id}">
            <input class="in" data-k="label" value="${esc(br.label || '')}" aria-label="الاسم" placeholder="الفسحة">
            <label>بعد الحصة <select class="in" data-k="after">${Array.from({ length: P - 1 }, (_, p) => `<option value="${p + 1}" ${+br.after === p + 1 ? 'selected' : ''}>${PER[p] || AR(p + 1)}</option>`).join('')}</select></label>
            <label>المدة <input class="in" type="number" min="5" max="90" data-k="dur" value="${+br.dur || 20}" style="width:76px"> د</label>
            <button class="btn ghost sm" data-bc>${(br.classes || []).length ? `لـ ${AR(br.classes.length)} فصل` : 'لجميع الصفوف'}</button>
            <button class="btn bad sm" data-bx aria-label="حذف">×</button></div>`).join('') || '<p class="small muted">لا توجد فسحات.</p>'}</div>
        <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn ghost sm" id="eAddB">+ فسحة / صلاة</button><span class="grow"></span>
          ${s.id !== b.def ? '<button class="btn ok sm" id="eDef">اجعله الأساسي</button><button class="btn bad sm" id="eDel">حذف الجدول</button>' : ''}</div>
        <div class="bl-sum small">اليوم: من <b>${fmt(tl.start, s)}</b> إلى <b>${fmt(tl.end, s)}</b> · ${AR(Math.round((tl.end - tl.start) / 6) / 10)} ساعة${pvCls ? ` · محسوب لـ ${esc((allCls().find(c => c.id === pvCls) || {}).name || '')}` : ''}</div>`;
      const bind = (id, k, num) => { const i = $('#' + id, ed); i.oninput = () => { s[k] = i.type === 'checkbox' ? i.checked : num ? +i.value : i.value; if (k === 'name') { const ch = $(`[data-sc="${s.id}"]`, root); if (ch) ch.firstChild.textContent = i.value; } later(); drawPv(); if (num || k === 'start') sumOnly(); }; };
      $('#eNp', ed).onchange = e => { s.np = +e.target.value; Object.keys(s.perDay || {}).forEach(k => { if (s.perDay[k] >= s.np) delete s.perDay[k]; }); later(); drawEd(); drawPv(); };
      $$('[data-dy]', ed).forEach(c => c.onchange = () => { const on = $$('[data-dy]', ed).filter(x => x.checked).map(x => +x.dataset.dy); if (!on.length) { c.checked = true; A.toast('اختر يوماً واحداً على الأقل', 'err'); return; } s.days = on.length === (sec.days || 5) ? null : on; later(); drawEd(); drawPv(); });
      $$('[data-dp]', ed).forEach(c => c.onchange = () => { s.perDay = s.perDay || {}; if (+c.value >= schedP(s, sec)) delete s.perDay[c.dataset.dp]; else s.perDay[c.dataset.dp] = +c.value; later(); drawPv(); });
      bind('eN', 'name'); bind('eTag', 'tag'); bind('eTi', 'title'); bind('eSt', 'start'); bind('eDu', 'dur', true); bind('ePa', 'pass', true); bind('eFo', 'foot'); bind('eSh', 'show'); bind('e24', 'h24');
      $$('[data-pd]', ed).forEach(i => i.oninput = () => { if (i.value) s.perDur[i.dataset.pd] = +i.value; else delete s.perDur[i.dataset.pd]; later(); drawPv(); sumOnly(); });
      $$('[data-br]', ed).forEach(row => { const br = s.breaks.find(x => x.id === row.dataset.br);
        $$('[data-k]', row).forEach(i => i.oninput = i.onchange = () => { br[i.dataset.k] = i.dataset.k === 'label' ? i.value : +i.value; later(); drawPv(); sumOnly(); });
        $('[data-bx]', row).onclick = () => { s.breaks.splice(s.breaks.indexOf(br), 1); later(); drawEd(); drawPv(); };
        $('[data-bc]', row).onclick = () => pickClasses(br, () => { later(); drawEd(); drawPv(); }); });
      $('#eAddB', ed).onclick = () => { s.breaks.push({ id: uid(), after: Math.min(P - 1, 4), dur: 15, label: s.breaks.length ? 'الصلاة' : 'الفسحة', classes: [] }); later(); drawEd(); drawPv(); };
      const df = $('#eDef', ed); if (df) df.onclick = () => { b.def = s.id; later(); V.bell(root); };
      const dl = $('#eDel', ed); if (dl) dl.onclick = async () => { if (!(await A.confirmBox(`حذف الجدول «${esc(s.name)}»؟ تُلغى فترات التفعيل المرتبطة به.`, 'حذف', true))) return; b.schedules = b.schedules.filter(x => x !== s); b.acts = b.acts.filter(a => a.sid !== s.id); cur = b.def; A.LS.set('bell_s_' + sec.id, cur); await save(); V.bell(root); };
    };
    const sumOnly = () => { const s = S0(), tl = timeline(s, maxP(s, sec), pvCls), el = $('.bl-sum', root); if (el) el.innerHTML = `اليوم: من <b>${fmt(tl.start, s)}</b> إلى <b>${fmt(tl.end, s)}</b> · ${AR(Math.round((tl.end - tl.start) / 6) / 10)} ساعة`; };

    function pickClasses(br, done) {
      const cs = allCls(), groups = {}; cs.forEach(c => { const g = A.stageOf ? A.stageOf(c) : 'الصفوف'; (groups[g] = groups[g] || []).push(c); });
      const m = A.modal(`<h3>الصفوف التي تشملها «${esc(br.label || 'الفسحة')}»</h3><p class="sub">اترك الكل غير محدد لتشمل جميع الصفوف. اختر صفوفاً بعينها إذا اختلف وقت فسحتها.</p>
        ${Object.entries(groups).map(([g, l]) => `<fieldset class="bl-fs"><legend><label class="chk"><input type="checkbox" data-g="${esc(g)}"> ${esc(g)}</label></legend><div class="perm-grid">${l.map(c => `<label class="chk"><input type="checkbox" value="${c.id}" data-gc="${esc(g)}" ${(br.classes || []).includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div></fieldset>`).join('')}
        <div class="acts"><button class="btn ghost" id="pcAll">جميع الصفوف</button><button class="btn" id="pcOk">اعتماد</button></div>`);
      const el = m.el; $$('[data-g]', el).forEach(g => { const kids = $$(`[data-gc="${CSS.escape(g.dataset.g)}"]`, el); g.checked = kids.length && kids.every(k => k.checked); g.onchange = () => kids.forEach(k => k.checked = g.checked); });
      el.querySelector('#pcAll').onclick = () => { br.classes = []; m.close(); done(); };
      el.querySelector('#pcOk').onclick = () => { br.classes = $$('[data-gc]:checked', el).map(i => i.value); m.close(); done(); };
    }

    // ---- فترات التفعيل ----
    const actSt = a => a.to < today ? ['منتهية', 'st-empty'] : a.from <= today ? ['سارية الآن', 'st-ok'] : ['قادمة', 'st-sub'];
    const drawActs = () => {
      const box = $('#blActs', root);
      box.innerHTML = `${b.acts.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>الجدول</th><th>من</th><th>إلى</th><th>الوصف</th><th>الحالة</th><th></th></tr></thead><tbody>${b.acts.slice().sort((x, y) => x.from.localeCompare(y.from)).map(a => { const [t, c] = actSt(a); return `<tr data-ac="${a.id}"><td><select class="in" data-k="sid">${b.schedules.map(s => `<option value="${s.id}" ${s.id === a.sid ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></td><td><input class="in" type="date" data-k="from" value="${esc(a.from)}"></td><td><input class="in" type="date" data-k="to" value="${esc(a.to)}"></td><td><input class="in" data-k="label" value="${esc(a.label || '')}" placeholder="مثال: رمضان"></td><td><span class="pill ${c}">${t}</span></td><td><button class="btn bad sm" data-x aria-label="حذف">×</button></td></tr>`; }).join('')}</tbody></table></div>` : '<p class="small muted" style="margin:0">لا توجد فترات — الجدول الأساسي يعمل دائماً.</p>'}
        <button class="btn ghost sm" id="acAdd" style="margin-top:8px" ${b.schedules.length < 2 ? 'disabled title="أنشئ جدولاً ثانياً أولاً"' : ''}>+ تفعيل جدول لفترة</button>`;
      $$('[data-ac]', box).forEach(tr => { const a = b.acts.find(x => x.id === tr.dataset.ac);
        $$('[data-k]', tr).forEach(i => i.onchange = () => { a[i.dataset.k] = i.value; if (a.to < a.from) { A.toast('تاريخ النهاية قبل البداية', 'err'); return; } later(); drawActs(); });
        $('[data-x]', tr).onclick = () => { b.acts = b.acts.filter(x => x !== a); later(); drawActs(); }; });
      const ad = $('#acAdd', box); if (ad) ad.onclick = () => { const other = b.schedules.find(s => s.id !== b.def) || b.schedules[0]; const d = new Date(); d.setDate(d.getDate() + 6); b.acts.push({ id: uid(), sid: other.id, from: today, to: A.isoDate(d), label: other.tag || other.name }); later(); drawActs(); };
    };

    // ---- الإجازات ----
    const drawHol = () => {
      const box = $('#blHol', root);
      box.innerHTML = `${b.holidays.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>من</th><th>إلى</th><th>المناسبة</th><th>الأسابيع المطابقة</th><th></th></tr></thead><tbody>${b.holidays.slice().sort((x, y) => x.from.localeCompare(y.from)).map(h => `<tr data-ho="${h.id}"><td><input class="in" type="date" data-k="from" value="${esc(h.from)}"></td><td><input class="in" type="date" data-k="to" value="${esc(h.to)}"></td><td><input class="in" data-k="label" value="${esc(h.label || '')}" placeholder="مثال: إجازة اليوم الوطني"></td><td class="small">${esc(hits(h).map(x => x.w.word).filter((v, i, a) => a.indexOf(v) === i).join('، ') || '—')}</td><td><button class="btn bad sm" data-x aria-label="حذف">×</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="small muted" style="margin:0">لا توجد إجازات مسجلة.</p>'}
        <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn ghost sm" id="hoAdd">+ إجازة</button>${b.holidays.length ? '<button class="btn sm" id="hoApply">تطبيق على الأسابيع</button>' : ''}</div>`;
      $$('[data-ho]', box).forEach(tr => { const h = b.holidays.find(x => x.id === tr.dataset.ho);
        $$('[data-k]', tr).forEach(i => i.onchange = () => { h[i.dataset.k] = i.value; if (h.to < h.from) h.to = h.from; later(); drawHol(); });
        $('[data-x]', tr).onclick = () => { b.holidays = b.holidays.filter(x => x !== h); later(); drawHol(); }; });
      $('#hoAdd', box).onclick = () => { b.holidays.push({ id: uid(), from: today, to: today, label: 'إجازة' }); later(); drawHol(); };
      const ap = $('#hoApply', box); if (ap) ap.onclick = ev => A.run(ev.currentTarget, applyHol);
    };
    // أيام الأسابيع التي تقع في إجازة
    const hits = h => { const out = []; (S.weeks || []).forEach(w => { if (!w.start_date) return; const s0 = A.parseDate(w.start_date); for (let i = 0; i < (sec.days || 5); i++) { const d = new Date(s0); d.setDate(s0.getDate() + i); const iso = A.isoDate(d); if (h.from <= iso && iso <= h.to) out.push({ w, day: i }); } }); return out; };
    async function applyHol() {
      if (dirty) await save(true);
      const per = new Map(); b.holidays.forEach(h => hits(h).forEach(({ w, day }) => { const l = per.get(w) || per.set(w, []).get(w); if (!l.some(x => x.day === day)) l.push({ day, label: h.label || 'إجازة' }); }));
      let n = 0, wk = 0;
      for (const [w, add] of per) { const cur0 = (w.holidays || []).slice(), fresh = add.filter(x => !cur0.some(y => y.day === x.day)); if (!fresh.length) continue; const r = await api.updateWeek(w.id, { holidays: cur0.concat(fresh).sort((x, y) => x.day - y.day) }); Object.assign(w, r); n += fresh.length; wk++; }
      A.toast(n ? `أُضيف ${AR(n)} يوم إجازة في ${AR(wk)} أسبوع` : 'الأسابيع محدّثة مسبقاً — لا جديد', 'ok'); drawHol();
    }

    // ---- ربط عام ----
    $$('[data-sc]', root).forEach(c => c.onclick = () => { cur = c.dataset.sc; A.LS.set('bell_s_' + sec.id, cur); $$('[data-sc]', root).forEach(x => { x.classList.toggle('on', x === c); x.setAttribute('aria-selected', x === c); }); drawEd(); drawPv(); });
    $('#blNew', root).onclick = () => { const s = defSched('جدول ' + AR(b.schedules.length + 1)); s.breaks = []; b.schedules.push(s); cur = s.id; A.LS.set('bell_s_' + sec.id, cur); save(true).then(() => V.bell(root)); };
    $('#blDup', root).onclick = () => { const s = JSON.parse(JSON.stringify(S0())); s.id = uid(); s.name = s.name + ' (نسخة)'; s.breaks.forEach(x => x.id = uid()); b.schedules.push(s); cur = s.id; A.LS.set('bell_s_' + sec.id, cur); save(true).then(() => V.bell(root)); };
    $('#blDP', root).onclick = ev => A.run(ev.currentTarget, async () => {
      const days = +$('#blDays', root).value, periods = Math.max(1, Math.min(12, +$('#blPer', root).value || 7));
      if (periods < (sec.periods || 7) && !(await A.confirmBox(`تقليل الحصص من ${AR(sec.periods)} إلى ${AR(periods)}؟<br><span class="small muted">لا تُحذف أي خطة، لكن الحصص بعد ${AR(periods)} لن تظهر.</span>`, 'تأكيد'))) return;
      if (days < (sec.days || 5) && !(await A.confirmBox(`تقليل أيام الدراسة إلى ${AR(days)}؟<br><span class="small muted">لا تُحذف أي خطة، لكن الأيام الزائدة لن تظهر.</span>`, 'تأكيد'))) return;
      const r = await api.updateSection(sec.id, { days, periods }); Object.assign(sec, r);
      b.schedules.forEach(s => s.breaks.forEach(br => { if (+br.after > periods - 1) br.after = periods - 1; }));
      A.toast('حُفظت الأيام والحصص', 'ok'); V.bell(root);
    });
    $('#blPvC', root).onchange = e => { pvCls = e.target.value; drawPv(); sumOnly(); };
    $('#blPrint', root).onclick = () => { A.toast('يجهّز الملصق للطباعة…'); printPoster(posterHTML(sec, S0(), pvCls), 'الجدول الزمني — ' + sec.name); };
    $('#blPng', root).onclick = ev => A.run(ev.currentTarget, () => pngPoster(posterHTML(sec, S0(), pvCls), `الجدول الزمني — ${sec.name} — ${S0().name}`));
    const off = () => { if (!document.body.contains(root) || !$('#blEd', root)) { ro.disconnect(); window.removeEventListener('hashchange', off); if (dirty) save(true).catch(() => {}); } };
    window.addEventListener('hashchange', off);
    // ---- فحص التعارضات + توقيت الأيام القادمة (نفس حساب شاشة اللوحة) ----
    let chkT = null, showAll = false;
    const SRCC = { holiday: 'st-empty', off: 'st-empty', disp: 'st-sub', act: 'st-warn', def: 'st-ok', none: 'st-bad' };
    const drawChk = async () => {
      const box = $('#blChk', root); if (!box || !window.DinaBell) return;
      const DB = window.DinaBell, disp = await A.bell.loadDisp(sec.id), sx = { bell: b, periods: sec.periods, days: sec.days };
      const iss = DB.check(sx, disp, today, 14), nb = iss.filter(x => x.lv === 'bad').length, nw = iss.filter(x => x.lv === 'warn').length;
      const days = []; for (let k = 0, iso = today; days.length < 10 && k < 21; k++, iso = DB.addDays(today, k)) { const pl = DB.dayPlan(sx, iso, disp, null); if (pl.src === 'off' && pl.name === 'يوم غير دراسي') continue; days.push(pl); }
      const tp = DB.dayPlan(sx, today, disp, null), f = m => fmt(m, tp.sched || {});
      const strip = tp.items.length ? `<div class="bl-strip" role="list" aria-label="توقيت اليوم">${tp.items.map(x => `<div role="listitem" class="bl-it ${x.k}" style="flex:${Math.max(1, x.dur)}" title="${x.k === 'p' ? 'الحصة ' + (x.i + 1) : esc(x.label || 'انتقال')} ${f(x.from)} – ${f(x.to)}">${x.k === 'p' ? `<b>${AR(x.i + 1)}</b><small>${f(x.from)}</small>` : x.k === 'b' ? `<b>☕</b><small>${esc(x.label || 'الفسحة')}</small>` : ''}</div>`).join('')}</div>` : `<div class="small muted">${esc(DB.SRC[tp.src] || '')}${tp.name ? ' — ' + esc(tp.name) : ''}</div>`;
      const nonRem = b.schedules.filter(s => !/بعد/.test(s.name + ' ' + (s.tag || '')));
      const defS = b.schedules.find(s => s.id === b.def) || {};
      const fixDef = /بعد/.test((defS.name || '') + ' ' + (defS.tag || '')) && nonRem.length ? `<div class="bl-fix"><label for="blFxD">الجدول الأساسي الصحيح:</label><select class="in" id="blFxD" style="width:auto">${nonRem.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><button class="btn sm" id="blFxDo">اعتماده أساسياً</button><span class="small muted">يبقى «${esc((defS.name || '').trim())}» محفوظاً ويمكن تفعيله لفترة محددة.</span></div>` : '';
      const unclear = b.schedules.filter(s => /^جدول\s*[٠-٩0-9]+$/.test((s.name || '').trim()));
      const fixNm = unclear.map(s => `<div class="bl-fix"><label for="blFxN${s.id}">تسمية «${esc(s.name)}»:</label><input class="in" id="blFxN${s.id}" data-fxn="${s.id}" placeholder="مثل: الحضوري — يبدأ ${esc(s.start || '')}" style="width:auto;min-width:220px"><button class="btn ghost sm" data-fxs="${s.id}">حفظ الاسم</button></div>`).join('');
      const L = showAll ? iss : iss.slice(0, 6);
      box.innerHTML = `<h3>فحص التوقيت وما ستعرضه اللوحة اليومية <span class="pill ${nb ? 'st-bad' : nw ? 'st-warn' : 'st-ok'}">${nb ? AR(nb) + ' تعارض' : nw ? AR(nw) + ' ملاحظة' : 'مرتّب ✓'}</span></h3>
        <div id="blPin"></div>
        <div class="bl-today"><div class="small"><b>اللوحة اليوم:</b> <span class="pill ${SRCC[tp.src]}">${esc(DB.SRC[tp.src])}</span> ${esc(tp.name || '')}${tp.items.length ? ` · من <b>${f(tp.start)}</b> إلى <b>${f(tp.end)}</b> · ${AR(tp.items.filter(x => x.k === 'p').length)} حصص` : ''}</div>${strip}</div>
        ${iss.length ? `<ul class="bl-iss">${L.map(x => `<li class="${x.lv}">${AR(esc(x.t))}</li>`).join('')}</ul>${iss.length > 6 ? `<button class="btn ghost sm" id="blChkMore">${showAll ? 'عرض أقل' : 'عرض الكل (' + AR(iss.length) + ')'}</button>` : ''}` : '<p class="small" style="color:#2E8B57;margin:6px 0">لا تعارض ولا تداخل — التوقيت مرتّب.</p>'}
        ${fixDef}${fixNm}
        <details class="bl-next"><summary>توقيت الأيام الدراسية القادمة كما سيظهر في اللوحة</summary><div class="scroll"><table class="tbl"><thead><tr><th>اليوم</th><th>التاريخ</th><th>المصدر</th><th>الجدول</th><th>البداية</th><th>النهاية</th><th>الحصص</th><th>الفسحة</th></tr></thead><tbody>${days.map(d => { const ps = d.items.filter(x => x.k === 'p'), br = d.items.filter(x => x.k === 'b'), g = m => fmt(m, d.sched || {}); return `<tr class="${d.iso === today ? 'cur' : ''}"><td>${DAYS[d.dow] || ''}</td><td>${dAR(d.iso)}</td><td><span class="pill ${SRCC[d.src]}">${esc(DB.SRC[d.src])}</span></td><td>${esc(d.name || '')}</td><td>${ps.length ? g(d.start) : '—'}</td><td>${ps.length ? g(d.end) : '—'}</td><td>${ps.length ? AR(ps.length) : '—'}</td><td>${br.length ? br.map(x => g(x.from)).join('، ') : '—'}</td></tr>`; }).join('')}</tbody></table></div>
        <p class="small muted" style="margin:6px 0 0">الأولوية في اللوحة والحضور: الإجازة ← الجدول الاستثنائي المنشور (من «جداول العرض الاستثنائية») ← الجدول المفعّل لفترة ← الجدول الأساسي.</p></details>`;
      if (S.me.is_owner) A.bell.pinCtl($('#blPin', box), sec, { bell: b, save: async () => { await save(true); }, done: () => V.bell(root) });
      const mo = $('#blChkMore', box); if (mo) mo.onclick = () => { showAll = !showAll; drawChk(); };
      const fd = $('#blFxDo', box); if (fd) fd.onclick = ev => A.run(ev.currentTarget, async () => { const id = $('#blFxD', box).value, s = b.schedules.find(x => x.id === id); if (!(await A.confirmBox(`اعتماد «${esc(s.name)}» جدولاً أساسياً لـ${esc(sec.name)}؟<br><span class="small muted">لا يُحذف أي جدول، ويمكن التراجع من شارة «أساسي».</span>`, 'اعتماد'))) return; b.def = id; await save(true); A.toast('اعتُمد الجدول الأساسي', 'ok'); V.bell(root); });
      $$('[data-fxs]', box).forEach(bt => bt.onclick = ev => A.run(ev.currentTarget, async () => { const id = bt.dataset.fxs, v = ($(`[data-fxn="${id}"]`, box).value || '').trim(); if (!v) throw new Error('اكتب اسماً واضحاً'); const s = b.schedules.find(x => x.id === id); s.name = v; await save(true); A.toast('حُفظ الاسم', 'ok'); V.bell(root); }));
    };
    const chkLater = () => { clearTimeout(chkT); chkT = setTimeout(drawChk, 500); };
    { const _l = later; later = () => { _l(); chkLater(); }; }
    drawChk();
    drawEd(); drawActs(); drawHol(); drawPv();
  };
})();
