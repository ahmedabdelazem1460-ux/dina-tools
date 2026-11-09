/* منصة دينا — حضور الحصص: رصد الحضور لكل حصة (معلم الحصة، أو من مُنح صلاحية «الحضور» كمراقبي الأدوار)
   + لوحة حضور لحظية (غياب، تأخر، استئذان، خروج مبكر، الحصص التي لم تُرصد) + تقرير يومي للطباعة. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, DAYS, PER, I } = A;
  const PST = [['present', 'حاضر', 'ok'], ['absent', 'غائب', 'bad'], ['late', 'متأخر', 'warn'], ['excused', 'مستأذن', 'info'], ['early', 'خروج مبكر', 'info']];
  const stName = k => (PST.find(x => x[0] === k) || [])[1] || k;
  const today = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const mod = m => !!(A.hasModule && A.hasModule(m));
  const canAll = () => S.me.is_owner || mod('attendance');
  const dow = d => A.parseDate(d).getDay();
  const cName = id => (A.cls(id) || {}).name || '';
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
  // أوقات الحصص من «اليوم الدراسي والجدول الزمني»
  function times(cid) { try { const sec = A.section(), b = A.bell.bellOf(sec), s = A.bell.activeSched(b);
    // جدول استثنائي منشور يغطي اليوم يتقدّم على الجدول الزمني (نفس ما تعرضه اللوحة اليومية)
    const pl = A.bell.dayPlan && A.bell.dayPlan(sec, null, cid); if (pl && pl.src === 'disp' && pl.items.length) return pl.items.filter(x => x.k === 'p').map(x => ({ i: x.i, from: x.from, to: x.to, f: A.bell.fmt(x.from, s), t: A.bell.fmt(x.to, s) }));
    return A.bell.timeline(s, A.bell.maxP(s, sec), cid).items.filter(x => x.k === 'p').map(x => ({ i: x.i, from: x.from, to: x.to, f: A.bell.fmt(x.from, s), t: A.bell.fmt(x.to, s) })); } catch (_) { return []; } }
  A.attTimes = cid => times(cid); A.attPassed = (cid, day, p) => passed(cid, day, p); A.attEntryOf = (cid, day, p) => entryOf(cid, day, p);
  A.curPeriod = cid => { const n = nowMin(), t = times(cid).find(x => n >= x.from && n < x.to); return t ? t.i : -1; };
  var passed = (cid, day, p) => { if (day < today()) return true; if (day > today()) return false; const t = times(cid).find(x => x.i === p); return t ? nowMin() >= t.from : false; };
  // الحصة في ذلك اليوم: من خطة الأسبوع المحمّل إن كان اليوم داخله
  var entryOf = (cid, day, p) => { const w = A.week(); if (!w) return null; const i = Math.round((A.parseDate(day) - A.parseDate(w.start_date)) / 864e5); if (i < 0 || i > 6) return null; return (S.allEntries || S.entries).find(e => e.class_id === cid && e.day === i && e.period === p) || null; };
  const save = (cid, day, p, rows) => api.rpc('save_period_attendance', { p_class: cid, p_day: day, p_period: p, p_rows: rows });
  const ERR = { 'no permission': 'ليست لديك صلاحية رصد هذه الحصة — يرصدها معلمها أو من مُنح صلاحية الحضور', 'future day': 'لا يمكن الرصد ليوم قادم', 'class not found': 'الفصل غير موجود' };

  // ---------- نافذة رصد حصة ----------
  A.takePeriod = async function (cid, day, p, after) {
    const e = entryOf(cid, day, p), tm = times(cid).find(x => x.i === p);
    const m = A.modal(`<h3>تحضير الطلاب — ${esc(cName(cid))}</h3><p class="sub">${DAYS[dow(day)]} ${AR(A.dmy(A.parseDate(day)))} · الحصة ${PER[p] || AR(p + 1)}${tm ? ` · <span dir="ltr">${tm.f} – ${tm.t}</span>` : ''}${e && e.subject_id ? ` · ${esc(A.subjName(e.subject_id))}${e.teacher_id ? ' — ' + esc(A.personName(e.teacher_id)) : ''}` : ''}</p><div id="paB"><div class="spinner"></div></div>`, { cls: 'wide' });
    const B = m.el.querySelector('#paB');
    let stu = [], pa = [], daily = [];
    try { [stu, pa] = await Promise.all([api.list('students', { class_id: cid, active: true }, { order: 'full_name' }), api.list('period_attendance', { class_id: cid, day })]); } catch (er) { B.innerHTML = A.emptyBox('تعذّر التحميل', esc(er.message)); return; }
    try { daily = await api.list('attendance', { class_id: cid, day }); } catch (_) { daily = []; }
    if (!stu.length) { B.innerHTML = A.emptyBox('لا يوجد طلاب في هذا الفصل', 'يستورد مالك النظام بيانات الطلاب من «الحضور والسلوك ← الطلاب».'); return; }
    const mine = pa.filter(x => x.period === p), prev = pa.filter(x => x.period < p).sort((a, b) => b.period - a.period);
    const st = Object.fromEntries(stu.map(s => { const r = mine.find(x => x.student_id === s.id); if (r) return [s.id, { st: r.status, m: r.minutes, n: r.note || '', src: '' }];
      const d = daily.find(x => x.student_id === s.id); if (d && ['absent', 'excused'].includes(d.status)) return [s.id, { st: d.status, m: null, n: '', src: 'من الحضور الصباحي' }];
      const pv = prev.find(x => x.student_id === s.id); if (pv && ['absent', 'early'].includes(pv.status)) return [s.id, { st: pv.status === 'early' ? 'early' : 'absent', m: null, n: '', src: `من الحصة ${PER[pv.period] || AR(pv.period + 1)}` }];
      return [s.id, { st: 'present', m: null, n: '', src: '' }]; }));
    const done = mine.length > 0;
    const sum = () => PST.map(([k, l, c]) => `<span class="pa-k ${c}"><b>${AR(stu.filter(s => st[s.id].st === k).length)}</b>${l}</span>`).join('');
    B.innerHTML = `<div class="pa-top"><div class="pa-sum" id="paS">${sum()}</div><div class="row" style="gap:6px"><button class="btn ghost sm" id="paAll" type="button">الكل حاضر</button>${done ? '<span class="pill st-approved">مرصودة سابقاً — يمكنك التعديل</span>' : ''}</div></div>
      <div class="pa-list">${stu.map((s, i) => `<div class="pa-r" data-s="${s.id}"><span class="pa-i">${AR(i + 1)}</span><div class="pa-nm"><b>${esc(s.full_name)}</b>${st[s.id].src ? `<small>${esc(st[s.id].src)}</small>` : ''}</div>
        <div class="pa-seg" role="radiogroup" aria-label="حالة ${esc(s.full_name)}">${PST.map(([k, l, c]) => `<button type="button" role="radio" class="${c} ${st[s.id].st === k ? 'on' : ''}" data-st="${k}" aria-checked="${st[s.id].st === k}">${l}</button>`).join('')}</div>
        <input class="in pa-m" type="number" min="1" max="120" placeholder="دقائق" data-m value="${st[s.id].m || ''}" aria-label="دقائق التأخر" ${st[s.id].st === 'late' ? '' : 'hidden'}>
        <input class="in pa-n" data-n value="${esc(st[s.id].n)}" placeholder="ملاحظة" aria-label="ملاحظة"></div>`).join('')}</div>
      <div class="acts"><button class="btn ok" id="paGo" type="button">${I.check} حفظ التحضير</button></div>`;
    const redraw = () => { B.querySelector('#paS').innerHTML = sum(); };
    $$('.pa-r', B).forEach(r => { const sid = r.dataset.s;
      $$('[data-st]', r).forEach(b => b.onclick = () => { st[sid].st = b.dataset.st; $$('[data-st]', r).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); r.querySelector('[data-m]').hidden = b.dataset.st !== 'late'; redraw(); });
      r.querySelector('[data-m]').oninput = ev => st[sid].m = ev.target.value ? +ev.target.value : null;
      r.querySelector('[data-n]').oninput = ev => st[sid].n = ev.target.value; });
    B.querySelector('#paAll').onclick = () => { stu.forEach(s => st[s.id].st = 'present'); $$('.pa-r', B).forEach(r => { $$('[data-st]', r).forEach(x => { const on = x.dataset.st === 'present'; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); }); r.querySelector('[data-m]').hidden = true; }); redraw(); };
    B.querySelector('#paGo').onclick = ev => A.run(ev.currentTarget, async () => {
      const rows = stu.map(s => ({ s: s.id, st: st[s.id].st, m: st[s.id].st === 'late' && st[s.id].m ? String(st[s.id].m) : '', n: st[s.id].n || '' }));
      try { await save(cid, day, p, rows); } catch (er) { throw new Error(ERR[er.message] || er.message); }
      const ab = rows.filter(r => r.st === 'absent').length, lt = rows.filter(r => r.st === 'late').length;
      m.close(); A.toast(`حُفظ تحضير ${cName(cid)} · الحصة ${PER[p] || AR(p + 1)}: غائب ${AR(ab)} · متأخر ${AR(lt)}`, 'ok'); after && after();
    });
  };

  // ---------- تبويب «حضور الحصص» (لمن مُنح صلاحية الحضور) ----------
  A.attPeriods = async function (box) {
    let day = A.LS.get('paday') || today(), cid = A.LS.get('pacls'); const cls = S.classes.filter(c => c.active); if (!cls.some(c => c.id === cid)) cid = (cls[0] || {}).id;
    const draw = async () => {
      const pa = await api.list('period_attendance', { school_id: S.school.id, day }).catch(() => []);
      const P = (A.section() || {}).periods || 7, cur = day === today() ? A.curPeriod(cid) : -1;
      const done = (c, p) => pa.filter(x => x.class_id === c && x.period === p);
      const clsDone = c => Array.from({ length: P }, (_, p) => p).filter(p => done(c, p).length).length;
      box.innerHTML = `<div class="row" style="margin:12px 0;gap:8px;flex-wrap:wrap"><input type="date" class="in" id="paD" value="${day}" style="max-width:180px" aria-label="اليوم"><span class="small muted">اختر الفصل ثم الحصة. الحصة المرصودة تظهر بعلامة ✓ وعدد الغائبين.</span></div>
        <div class="row" style="gap:6px;margin-bottom:10px;flex-wrap:wrap">${cls.map(c => `<button class="btn sm ${c.id === cid ? '' : 'ghost'}" data-c="${c.id}">${esc(c.name)} <span class="small">${AR(clsDone(c.id))}/${AR(P)}</span></button>`).join('')}</div>
        <div class="pa-pg">${Array.from({ length: P }, (_, p) => { const d = done(cid, p), e = entryOf(cid, day, p), ab = d.filter(x => x.status === 'absent').length, tm = times(cid).find(x => x.i === p), late = !d.length && passed(cid, day, p) && e && e.subject_id;
          return `<button type="button" class="pa-p ${d.length ? 'ok' : late ? 'miss' : ''} ${p === cur ? 'cur' : ''}" data-p="${p}"><b>${PER[p] || AR(p + 1)}</b>${tm ? `<small dir="ltr">${tm.f} – ${tm.t}</small>` : ''}<span>${e && e.subject_id ? esc(A.subjName(e.subject_id)) : '—'}</span>${e && e.teacher_id ? `<small>${esc(A.personName(e.teacher_id))}</small>` : ''}<i>${d.length ? `✓ غائب ${AR(ab)}` : late ? 'لم تُرصد' : p === cur ? 'الآن' : 'لم تُرصد بعد'}</i></button>`; }).join('')}</div>`;
      $('#paD', box).onchange = e => { day = e.target.value; A.LS.set('paday', day); draw(); };
      $$('[data-c]', box).forEach(b => b.onclick = () => { cid = b.dataset.c; A.LS.set('pacls', cid); draw(); });
      $$('[data-p]', box).forEach(b => b.onclick = () => A.takePeriod(cid, day, +b.dataset.p, draw));
    };
    await draw();
  };

  // ---------- لوحة الحضور اللحظية ----------
  let liveT = null, liveSub = null;
  A.attLive = async function (box) {
    let day = A.LS.get('lvday') || today(); if (day > today()) day = today();
    const draw = async () => {
      if (!document.body.contains(box)) { clearInterval(liveT); return; }
      const [pa, stu, dl] = await Promise.all([api.list('period_attendance', { school_id: S.school.id, day }).catch(() => []), api.list('students', { school_id: S.school.id, active: true }, { select: 'id,full_name,class_id' }).catch(() => []), api.list('attendance', { school_id: S.school.id, day }).catch(() => [])]);
      const cls = S.classes.filter(c => c.active), P = (A.section() || {}).periods || 7, ids = new Set(cls.map(c => c.id));
      const L = pa.filter(x => ids.has(x.class_id)), sN = id => (stu.find(s => s.id === id) || {}).full_name || '—';
      // الغياب الصباحي (لليوم كاملاً) يُدمج مع غياب الحصص
      const D = dl.filter(x => ids.has(x.class_id));
      const by = k => new Set(L.filter(x => x.status === k).map(x => x.student_id).concat(D.filter(x => x.status === k).map(x => x.student_id)));
      const dayAbs = new Set(D.filter(x => x.status === 'absent').map(x => x.student_id));
      const dRate = D.length ? Math.round(100 * D.filter(x => x.status !== 'absent').length / D.length) : null;
      const abs = by('absent'), late = by('late'), exc = by('excused'), early = by('early');
      const total = stu.filter(s => ids.has(s.class_id)).length;
      const slots = []; cls.forEach(c => { for (let p = 0; p < P; p++) { const e = entryOf(c.id, day, p); if (e && e.subject_id) slots.push({ c: c.id, p, e }); } });
      const missing = slots.filter(x => passed(x.c, day, x.p) && !L.some(y => y.class_id === x.c && y.period === x.p));
      const taken = new Set(L.map(x => x.class_id + '|' + x.period)).size;
      const rate = L.length ? Math.round(100 * L.filter(x => x.status !== 'absent').length / L.length) : null;
      const cell = (c, p) => { const l = L.filter(x => x.class_id === c && x.period === p), e = entryOf(c, day, p); if (l.length) { const a = l.filter(x => x.status === 'absent').length, t = l.filter(x => x.status === 'late').length; return `<td class="${a ? 'a' : 'ok'}" title="${esc(A.subjName((e || {}).subject_id) || '')}"><b>${a ? AR(a) : '✓'}</b>${t ? `<small>تأخر ${AR(t)}</small>` : ''}</td>`; } if (!e || !e.subject_id) return '<td class="na">—</td>'; return passed(c, day, p) ? `<td class="miss" title="${esc(A.personName(e.teacher_id) || '')}">لم تُرصد</td>` : '<td class="fut"></td>'; };
      const absList = [...abs].map(id => ({ id, n: sN(id), c: (L.find(x => x.student_id === id) || D.find(x => x.student_id === id) || {}).class_id, day: dayAbs.has(id), ps: L.filter(x => x.student_id === id && x.status === 'absent').map(x => x.period).sort((a, b) => a - b) })).sort((a, b) => (b.day - a.day) || b.ps.length - a.ps.length || a.n.localeCompare(b.n, 'ar'));
      const psTxt = x => x.day ? 'اليوم كاملاً' + (x.ps.length ? ' · الحصص: ' + x.ps.map(p => AR(p + 1)).join('، ') : '') : 'الحصص: ' + x.ps.map(p => AR(p + 1)).join('، ');
      const other = L.filter(x => ['late', 'excused', 'early'].includes(x.status)).concat(D.filter(x => ['late', 'excused', 'early'].includes(x.status)).map(x => ({ ...x, period: -1 }))).sort((a, b) => a.period - b.period);
      const pTxt = p => p < 0 ? 'الصباحي' : 'الحصة ' + AR(p + 1);
      const dCell = c => { const l = D.filter(x => x.class_id === c); if (!l.length) return '<td class="na">—</td>'; const a = l.filter(x => x.status === 'absent').length; return `<td class="${a ? 'a' : 'ok'}"><b>${a ? AR(a) : '✓'}</b></td>`; };
      box.innerHTML = `<div class="row" style="margin:12px 0;gap:8px;flex-wrap:wrap;align-items:center"><input type="date" class="in" id="lvD" value="${day}" max="${today()}" style="max-width:180px" aria-label="اليوم"><span class="rec-st ok" role="status">${day === today() ? 'لحظي · يتحدّث تلقائياً' : 'يوم سابق'}</span><button class="btn ghost sm" id="lvPr">${I.print || ''} التقرير اليومي</button></div>
        <div class="pal-k">
          <button type="button" data-kd="dr" class="dd-k k"><b>${dRate == null ? '—' : AR(dRate) + '٪'}</b>الحضور الصباحي</button>
          <button type="button" data-kd="pr" class="dd-k k"><b>${rate == null ? '—' : AR(rate) + '٪'}</b>نسبة الحضور في الحصص</button>
          <button type="button" data-kd="ab" class="dd-k k bad"><b>${AR(abs.size)}</b>طالب غائب (اليوم كاملاً أو حصة)</button>
          <button type="button" data-kd="lt" class="dd-k k warn"><b>${AR(late.size)}</b>متأخر</button>
          <button type="button" data-kd="ex" class="dd-k k info"><b>${AR(exc.size)}</b>مستأذن</button>
          <button type="button" data-kd="ea" class="dd-k k info"><b>${AR(early.size)}</b>خروج مبكر</button>
          <button type="button" data-kd="miss" class="dd-k k ${missing.length ? 'bad' : 'ok'}"><b>${AR(missing.length)}</b>حصة مضت ولم تُرصد</button>
          <button type="button" data-kd="tk" class="dd-k k"><b>${AR(taken)}/${AR(slots.length)}</b>حصة مرصودة من ${AR(total)} طالب</button>
        </div>
        <h3 style="margin:16px 0 6px">الفصول × الحصص <span class="small muted">(الرقم = عدد الغائبين)</span></h3>
        <div class="scroll"><table class="tbl pal-m"><thead><tr><th>الفصل</th><th title="الحضور الصباحي لليوم كاملاً">صباحي</th>${Array.from({ length: P }, (_, p) => `<th>${PER[p] || AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${cls.map(c => `<tr><th><button class="lnk" data-gc="${c.id}">${esc(c.name)}</button></th>${dCell(c.id)}${Array.from({ length: P }, (_, p) => cell(c.id, p).replace('<td', `<td data-cp="${c.id}|${p}"`)).join('')}</tr>`).join('')}</tbody></table></div>
        <div class="grid g2" style="margin-top:14px;align-items:start">
          <div class="sec-box"><b>الغائبون اليوم (${AR(absList.length)})</b>${absList.length ? `<table class="tbl" style="margin-top:6px"><tbody>${absList.map(x => `<tr><td><b>${esc(x.n)}</b><div class="small muted">${esc(cName(x.c))}</div></td><td class="small">${psTxt(x)}</td></tr>`).join('')}</tbody></table>` : '<p class="small muted">لا غياب مسجّل.</p>'}</div>
          <div class="sec-box"><b>التأخر والاستئذان والخروج المبكر (${AR(other.length)})</b>${other.length ? `<table class="tbl" style="margin-top:6px"><tbody>${other.map(x => `<tr><td><b>${esc(sN(x.student_id))}</b><div class="small muted">${esc(cName(x.class_id))}</div></td><td><span class="pill st-${x.status === 'late' ? 'returned' : 'submitted'}">${stName(x.status)}${x.minutes ? ' ' + AR(x.minutes) + ' د' : ''}${x.time_at ? ' · ' + AR(String(x.time_at).slice(0, 5)) : ''}</span></td><td class="small">${pTxt(x.period)}${x.note ? ' · ' + esc(x.note) : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="small muted">لا يوجد.</p>'}</div>
        </div>
        ${missing.length ? `<div class="sec-box" style="margin-top:12px;border-color:#C53030"><b>حصص مضت ولم تُرصد (${AR(missing.length)})</b><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${missing.map(x => `<button class="ldc ldbtn" data-cp="${x.c}|${x.p}">${esc(cName(x.c))} · ${AR(x.p + 1)} — ${esc(A.subjName(x.e.subject_id))}${x.e.teacher_id ? ' · ' + esc(A.personName(x.e.teacher_id)) : ''}</button>`).join('')}</div></div>` : ''}`;
      $('#lvD', box).onchange = e => { day = e.target.value; A.LS.set('lvday', day); draw(); };
      // الضغط على أي رقم يعرض بياناته كاملة
      const sec = id => cName(id), recRow = x => ({ cells: [`<b>${esc(sN(x.student_id))}</b>`, esc(sec(x.class_id)), stName(x.status), x.period >= 0 && x.period != null ? 'الحصة ' + AR(x.period + 1) : 'اليوم كاملاً', x.time_at ? AR(String(x.time_at).slice(0, 5)) : '', x.minutes ? AR(x.minutes) : '', esc(x.note || '')], q: sN(x.student_id) + ' ' + sec(x.class_id) });
      const RC = ['الطالب', 'الفصل', 'الحالة', 'متى', 'الوقت', 'الدقائق', 'ملاحظة'], sub = `${DAYS[dow(day)]} ${A.arDate ? A.arDate(day) : AR(day)}`;
      const byK = k => L.filter(x => x.status === k).concat(D.filter(x => x.status === k).map(x => ({ ...x, period: -1 })));
      const DR = { dr: () => ({ title: 'الحضور الصباحي حسب الفصل', cols: ['الفصل', 'المرصودون', 'الغائبون', 'نسبة الحضور'], rows: cls.map(c => { const l = D.filter(x => x.class_id === c.id), a = l.filter(x => x.status === 'absent').length; return { cells: [`<b>${esc(c.name)}</b>`, AR(l.length), AR(a), l.length ? AR(Math.round(100 * (l.length - a) / l.length)) + '٪' : 'لم يُرصد'], q: c.name }; }) }),
        pr: () => ({ title: 'الحضور في الحصص حسب الفصل', cols: ['الفصل', 'حصص مرصودة', 'سجلات', 'غياب', 'نسبة الحضور'], rows: cls.map(c => { const l = L.filter(x => x.class_id === c.id), a = l.filter(x => x.status === 'absent').length; return { cells: [`<b>${esc(c.name)}</b>`, AR(new Set(l.map(x => x.period)).size), AR(l.length), AR(a), l.length ? AR(Math.round(100 * (l.length - a) / l.length)) + '٪' : '—'], q: c.name }; }) }),
        ab: () => ({ title: 'الطلاب الغائبون', cols: ['الطالب', 'الفصل', 'الغياب'], rows: absList.map(x => ({ cells: [`<b>${esc(x.n)}</b>`, esc(sec(x.c)), psTxt(x)], q: x.n + ' ' + sec(x.c) })) }),
        lt: () => ({ title: 'المتأخرون', cols: RC, rows: byK('late').map(recRow) }), ex: () => ({ title: 'المستأذنون', cols: RC, rows: byK('excused').map(recRow) }), ea: () => ({ title: 'الخروج المبكر', cols: RC, rows: byK('early').map(recRow) }),
        miss: () => ({ title: 'حصص مضت ولم تُرصد', cols: ['الفصل', 'الحصة', 'المادة', 'المعلم'], rows: missing.map(x => ({ cells: [`<b>${esc(sec(x.c))}</b>`, AR(x.p + 1), esc(A.subjName(x.e.subject_id)), esc(A.personName(x.e.teacher_id) || '')], q: sec(x.c) + ' ' + (A.personName(x.e.teacher_id) || '') })) }),
        tk: () => ({ title: 'الحصص المرصودة', cols: ['الفصل', 'الحصة', 'المرصودون', 'الغائبون'], rows: [...new Set(L.map(x => x.class_id + '|' + x.period))].map(k => { const [c, p] = k.split('|'); const l = L.filter(x => x.class_id === c && x.period === +p); return { cells: [`<b>${esc(sec(c))}</b>`, AR(+p + 1), AR(l.length), AR(l.filter(x => x.status === 'absent').length)], q: sec(c) }; }) }) };
      $$('[data-kd]', box).forEach(b => b.onclick = () => { const o = DR[b.dataset.kd](); if (A.attDrill) A.attDrill({ ...o, sub }); });
      $$('[data-cp]', box).forEach(b => b.onclick = () => { if (!canAll()) return; const [c, p] = b.dataset.cp.split('|'); if (b.classList.contains('fut') || b.classList.contains('na')) return; A.takePeriod(c, day, +p, draw); });
      $$('[data-gc]', box).forEach(b => b.onclick = () => { A.LS.set('pacls', b.dataset.gc); A.LS.set('paday', day); A.LS.set('atttab', 'periods'); V.attendance(box.closest('main') || document.querySelector('main')); });
      $('#lvPr', box).onclick = () => A.printDoc('التقرير اليومي للحضور', `${DAYS[dow(day)]} ${AR(A.dmy(A.parseDate(day)))} · ${(A.section() || {}).name || ''}`,
        `<div><span class="k"><b>${rate == null ? '—' : AR(rate) + '٪'}</b>نسبة الحضور</span><span class="k"><b>${AR(abs.size)}</b>غائب</span><span class="k"><b>${AR(late.size)}</b>متأخر</span><span class="k"><b>${AR(exc.size)}</b>مستأذن</span><span class="k"><b>${AR(early.size)}</b>خروج مبكر</span><span class="k"><b>${AR(missing.length)}</b>حصة لم تُرصد</span></div>
         <h3>الفصول × الحصص (عدد الغائبين)</h3><table><tr><th>الفصل</th>${Array.from({ length: P }, (_, p) => `<th>${AR(p + 1)}</th>`).join('')}</tr>${cls.map(c => `<tr><td><b>${esc(c.name)}</b></td>${Array.from({ length: P }, (_, p) => { const l = L.filter(x => x.class_id === c.id && x.period === p); const e = entryOf(c.id, day, p); return `<td>${l.length ? (l.filter(x => x.status === 'absent').length ? AR(l.filter(x => x.status === 'absent').length) : '✓') : e && e.subject_id && passed(c.id, day, p) ? 'لم تُرصد' : '—'}</td>`; }).join('')}</tr>`).join('')}</table>
         <h3>الغائبون</h3><table><tr><th>الطالب</th><th>الفصل</th><th>الغياب</th></tr>${absList.map(x => `<tr><td>${esc(x.n)}</td><td>${esc(cName(x.c))}</td><td>${psTxt(x)}</td></tr>`).join('') || '<tr><td colspan="3">لا يوجد</td></tr>'}</table>
         <h3>التأخر والاستئذان والخروج المبكر</h3><table><tr><th>الطالب</th><th>الفصل</th><th>الحالة</th><th>الحصة</th><th>ملاحظة</th></tr>${other.map(x => `<tr><td>${esc(sN(x.student_id))}</td><td>${esc(cName(x.class_id))}</td><td>${stName(x.status)}${x.minutes ? ' ' + AR(x.minutes) + ' د' : ''}${x.time_at ? ' · ' + AR(String(x.time_at).slice(0, 5)) : ''}</td><td>${pTxt(x.period)}</td><td>${esc(x.note || '')}</td></tr>`).join('') || '<tr><td colspan="5">لا يوجد</td></tr>'}</table>`, true);
    };
    await draw();
    clearInterval(liveT); liveT = setInterval(() => { if (day === today() && !document.hidden) draw().catch(() => {}); }, 60000);
    if (api.subscribe && !liveSub) { try { liveSub = api.subscribe('pa-' + S.school.id, 'period_attendance', null, () => { if (A._paLive) A._paLive(); }); api.subscribe('pad-' + S.school.id, 'attendance', null, () => { if (A._paLive) A._paLive(); }); } catch (_) { } }
    A._paLive = () => { if (document.body.contains(box)) draw().catch(() => {}); };
  };

  // ---------- للمعلم: تحضير حصص اليوم من «خطتي» ----------
  A.myPeriodAtt = async function (holder) {
    const w = A.week(); if (!w || !holder) return;
    const day = today(), i = Math.round((A.parseDate(day) - A.parseDate(w.start_date)) / 864e5); if (i < 0 || i > 6) return;
    const L = S.entries.filter(e => e.teacher_id === S.me.id && e.day === i && e.subject_id).sort((a, b) => a.period - b.period); if (!L.length) return;
    const pa = await api.list('period_attendance', { day, teacher_id: S.me.id }, { select: 'class_id,period,status' }).catch(() => []);
    const cur = A.curPeriod(L[0].class_id);
    holder.innerHTML = `<div class="mt-pa"><span class="small muted">تحضير الطلاب اليوم:</span>${L.map(e => { const d = pa.filter(x => x.class_id === e.class_id && x.period === e.period), ab = d.filter(x => x.status === 'absent').length, miss = !d.length && passed(e.class_id, day, e.period);
      return `<button type="button" class="mt-pb ${d.length ? 'ok' : miss ? 'miss' : ''} ${e.period === cur ? 'cur' : ''}" data-pa="${e.class_id}|${e.period}">${AR(e.period + 1)} · ${esc(cName(e.class_id))}<small>${d.length ? `✓ غائب ${AR(ab)}` : e.period === cur ? 'الآن — حضّر' : miss ? 'لم تُحضَّر' : 'لاحقاً'}</small></button>`; }).join('')}</div>`;
    $$('[data-pa]', holder).forEach(b => b.onclick = () => { const [c, p] = b.dataset.pa.split('|'); A.takePeriod(c, day, +p, () => A.myPeriodAtt(holder)); });
  };
})();
