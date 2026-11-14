/* منصة دينا — التقويم الدراسي المرن (داخل «الأسابيع»)
   بداية الفصل + عدد أسابيع الدراسة + الإجازات (أسبوع كامل كإجازة الخريف، أو أيام متفرقة).
   يُحسب ترتيب الأسابيع وتواريخها تلقائياً: أسبوع الإجازة الكاملة لا يُعدّ، فتُرحَّل الأسابيع التالية.
   «تطبيق»: تُحدَّث تواريخ الأسابيع وأيام إجازتها، ويُعاد ربط كل أسبوع بالجدول الساري في تاريخه الجديد (دون مسّ ما كتبه المعلمون). */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, DAYS, ORD, I } = A;
  const iso = d => A.isoDate(d), P = s => A.parseDate(s), add = (s, n) => { const d = P(s); d.setDate(d.getDate() + n); return iso(d); };
  const sun = s => { const d = P(s); d.setDate(d.getDate() - d.getDay()); return iso(d); };
  const today = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const dd = s => AR(A.dmy(P(s)));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const can = () => S.me.is_owner || A.perm('structure');

  // استنتاج تقويم مبدئي من الأسابيع الموجودة (بداية الأسبوع الأول + الفجوات كإجازات)
  function infer() {
    const ws = (S.weeks || []).filter(w => w.start_date && !w.archived).slice().sort((a, b) => a.number - b.number);
    if (!ws.length) return { start: sun(today()), weeks: 18, breaks: [] };
    const uniq = []; ws.forEach(w => { if (!uniq.some(x => x.number === w.number)) uniq.push(w); });
    const start = add(uniq[0].start_date, -7 * (uniq[0].number - 1)), breaks = [];
    // فجوة قبل الأسبوع الأول المسجّل أو بين أسبوعين متتاليين = أسابيع إجازة
    let exp = start;
    for (let n = 1; n <= uniq[uniq.length - 1].number; n++) { const w = uniq.find(x => x.number === n); if (!w) { exp = add(exp, 7); continue; } while (w.start_date > exp) { breaks.push({ id: uid(), from: exp, to: add(exp, 6), label: 'إجازة' }); exp = add(exp, 7); } exp = add(w.start_date, 7); }
    return { start, weeks: Math.max(18, uniq[uniq.length - 1].number), breaks };
  }
  function plan(cal) {
    const nd = (A.section() || {}).days || 5, out = []; let n = 1, d = sun(cal.start || today()), guard = 0;
    const inBr = x => (cal.breaks || []).find(b => b.from <= x && x <= b.to);
    while (n <= (+cal.weeks || 18) && guard++ < 80) {
      const days = Array.from({ length: nd }, (_, i) => ({ i, date: add(d, i), br: inBr(add(d, i)) }));
      const hol = days.filter(x => x.br);
      if (hol.length === nd) out.push({ type: 'break', start: d, end: add(d, nd - 1), label: hol[0].br.label || 'إجازة' });
      else { out.push({ type: 'week', number: n, word: ORD[n] || String(n), start: d, end: add(d, nd - 1), holidays: hol.map(x => ({ day: x.i, label: x.br.label || 'إجازة', auto: true })) }); n++; }
      d = add(d, 7);
    }
    return out;
  }

  const w0 = V.weeks;
  if (w0) V.weeks = function (root) {
    const r = w0.apply(this, arguments);
    if (can()) try { calCard(root); } catch (e) { console.error(e); }
    return r;
  };

  function calCard(root) {
    const sec = A.section(); if (!sec) return;
    const saved = sec.calendar && sec.calendar.start ? JSON.parse(JSON.stringify(sec.calendar)) : null;
    const cal = saved || infer(); cal.breaks = cal.breaks || [];
    const host = document.createElement('div'); host.className = 'card cal-card'; root.insertBefore(host, root.firstChild);
    let onlyFuture = true, createNew = false;
    const draw = () => {
      const pl = plan(cal), ws = S.weeks || [], tw = sun(today());
      const wk = pl.filter(x => x.type === 'week'), brk = pl.filter(x => x.type === 'break');
      const diff = wk.map(x => { const cur = ws.filter(w => w.number === x.number && !w.archived); const moved = cur.some(w => w.start_date !== x.start); const holCh = cur.some(w => JSON.stringify((w.holidays || []).filter(h => h.auto).map(h => h.day)) !== JSON.stringify(x.holidays.map(h => h.day))); return { ...x, cur, moved, holCh, past: x.start < tw && cur.some(w => w.start_date < tw) }; });
      const changes = diff.filter(x => x.cur.length && (x.moved || x.holCh) && !(onlyFuture && x.past));
      const missing = diff.filter(x => !x.cur.length);
      host.innerHTML = `<div class="head"><div class="grow"><h2 style="margin:0">التقويم الدراسي والإجازات</h2><p class="sub" style="margin:2px 0 0">حدّد بداية الفصل وعدد أسابيع الدراسة والإجازات. أسبوع الإجازة الكامل لا يُحسب، فتُرحَّل الأسابيع التالية تلقائياً، ويُربط كل أسبوع بالجدول الساري في تاريخه.</p></div>${saved ? '' : '<span class="pill st-submitted">مقترح من أسابيعك الحالية — راجعه واحفظه</span>'}</div>
        <div class="grid g3"><div class="field"><label for="clS">بداية الأسبوع الأول (الأحد)</label><input class="in" type="date" id="clS" value="${esc(cal.start)}"></div>
          <div class="field"><label for="clN">عدد أسابيع الدراسة</label><input class="in" type="number" id="clN" min="1" max="40" value="${+cal.weeks || 18}"></div>
          <div class="field"><label>&nbsp;</label><div class="small muted">ينتهي الفصل: <b>${wk.length ? dd(wk[wk.length - 1].end) : '—'}</b> · ${AR(brk.length)} أسبوع إجازة كامل</div></div></div>
        <div class="field"><label>الإجازات</label><div class="cal-br">${cal.breaks.slice().sort((a, b) => a.from.localeCompare(b.from)).map(b => `<div class="cal-b" data-b="${b.id}"><input class="in" data-k="label" value="${esc(b.label || '')}" placeholder="مثال: إجازة الخريف" aria-label="اسم الإجازة"><label>من <input class="in" type="date" data-k="from" value="${esc(b.from)}"></label><label>إلى <input class="in" type="date" data-k="to" value="${esc(b.to)}"></label><span class="small muted">${AR(Math.round((P(b.to) - P(b.from)) / 864e5) + 1)} يوم</span><button class="btn bad sm" data-x aria-label="حذف الإجازة">×</button></div>`).join('') || '<p class="small muted">لا توجد إجازات.</p>'}</div>
          <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><button class="btn ghost sm" id="clAddW" type="button">+ أسبوع إجازة كامل</button><button class="btn ghost sm" id="clAddD" type="button">+ يوم أو أيام إجازة</button>${((A.bell && A.bell.bellOf(sec).holidays) || []).length ? '<button class="btn ghost sm" id="clBell" type="button">استيراد إجازات «اليوم الدراسي»</button>' : ''}</div></div>
        <div class="scroll" style="margin-top:8px"><table class="tbl cal-t"><thead><tr><th>الأسبوع</th><th>التواريخ</th><th>أيام الإجازة</th><th>الحالي في المنصة</th></tr></thead><tbody>${pl.map(x => x.type === 'break' ? `<tr class="brk"><td colspan="2"><b>☕ ${esc(x.label)}</b></td><td>${dd(x.start)} — ${dd(x.end)}</td><td class="small">أسبوع إجازة — لا يُحسب</td></tr>` : (() => { const d = diff.find(y => y.number === x.number); return `<tr class="${d.moved ? 'mv' : ''} ${d.past ? 'past' : ''}"><td><b>${esc(x.word)}</b> <span class="small faint">(${AR(x.number)})</span></td><td class="small">${dd(x.start)} — ${dd(x.end)}</td><td class="small">${x.holidays.map(h => `${DAYS[h.day]}${h.label && h.label !== 'إجازة' ? ' (' + esc(h.label) + ')' : ''}`).join('، ') || '—'}</td><td class="small">${d.cur.length ? (d.moved ? `<span class="cal-mv">يُرحَّل من ${dd(d.cur[0].start_date)}</span>` : d.holCh ? '<span class="cal-mv">تتغير الإجازات</span>' : '✓ مطابق') + (d.cur.length > 1 ? ` <span class="faint">(${AR(d.cur.length)} نسخ)</span>` : '') : '<span class="faint">لم يُنشأ بعد</span>'}</td></tr>`; })()).join('')}</tbody></table></div>
        <div class="cal-acts"><label class="chk"><input type="checkbox" id="clF" ${onlyFuture ? 'checked' : ''}> تطبيق على الأسبوع الحالي والقادمة فقط (لا تُغيَّر تواريخ الأسابيع الماضية)</label>
          <label class="chk"><input type="checkbox" id="clC" ${createNew ? 'checked' : ''}> إنشاء الأسابيع غير المنشأة (${AR(missing.length)})</label>
          <div class="row" style="gap:6px"><button class="btn ghost" id="clSave" type="button">حفظ التقويم</button><button class="btn" id="clGo" type="button" ${changes.length || (createNew && missing.length) ? '' : 'disabled'}>تطبيق على الأسابيع (${AR(changes.length + (createNew ? missing.length : 0))})</button></div></div>`;
      const sv = () => { clearTimeout(host._t); host._t = setTimeout(() => api.updateSection(sec.id, { calendar: cal }).then(r => { Object.assign(sec, r); }).catch(() => { }), 700); };
      $('#clS', host).onchange = e => { cal.start = sun(e.target.value); sv(); draw(); };
      $('#clN', host).onchange = e => { cal.weeks = Math.max(1, Math.min(40, +e.target.value || 18)); sv(); draw(); };
      $$('[data-b]', host).forEach(row => { const b = cal.breaks.find(x => x.id === row.dataset.b);
        $$('[data-k]', row).forEach(i => i.onchange = () => { b[i.dataset.k] = i.value; if (b.to < b.from) b.to = b.from; sv(); draw(); });
        $('[data-x]', row).onclick = () => { cal.breaks = cal.breaks.filter(x => x !== b); sv(); draw(); }; });
      $('#clAddW', host).onclick = () => { const s0 = (pl.find(x => x.type === 'week' && x.start > today()) || {}).start || add(sun(today()), 7); cal.breaks.push({ id: uid(), from: s0, to: add(s0, ((sec.days || 5) - 1)), label: 'إجازة' }); sv(); draw(); };
      $('#clAddD', host).onclick = () => { cal.breaks.push({ id: uid(), from: today(), to: today(), label: 'إجازة' }); sv(); draw(); };
      const cb = $('#clBell', host); if (cb) cb.onclick = () => { let n = 0; A.bell.bellOf(sec).holidays.forEach(h => { if (!cal.breaks.some(x => x.from === h.from && x.to === h.to)) { cal.breaks.push({ id: uid(), from: h.from, to: h.to, label: h.label || 'إجازة' }); n++; } }); A.toast(n ? `استُورد ${AR(n)} إجازة` : 'لا جديد', 'ok'); sv(); draw(); };
      $('#clF', host).onchange = e => { onlyFuture = e.target.checked; draw(); };
      $('#clC', host).onchange = e => { createNew = e.target.checked; draw(); };
      $('#clSave', host).onclick = e => A.run(e.currentTarget, async () => { const r = await api.updateSection(sec.id, { calendar: cal }); Object.assign(sec, r); A.toast('حُفظ التقويم', 'ok'); draw(); });
      $('#clGo', host).onclick = e => A.run(e.currentTarget, async () => {
        const mv = changes.filter(x => x.moved), pub = mv.filter(x => x.cur.some(w => w.status !== 'open'));
        if (!(await A.confirmBox(`سيُطبَّق التقويم على ${AR(changes.length)} أسبوع${mv.length ? `، منها ${AR(mv.length)} يتغير تاريخه ويُعاد ربطه بالجدول الساري` : ''}${createNew && missing.length ? `، وإنشاء ${AR(missing.length)} أسبوع جديد` : ''}.${pub.length ? `<br><b>تنبيه:</b> ${AR(pub.length)} منها مقفل أو منشور.` : ''}<br><span class="small muted">ما كتبه المعلمون يبقى كما هو؛ الحصص المكتوبة لا تُنقل تلقائياً إن تغيّر الجدول.</span>`, 'تطبيق'))) return;
        await api.updateSection(sec.id, { calendar: cal });
        const rows = changes.concat(createNew ? missing : []).map(x => ({ number: x.number, word: x.word, start: x.start, holidays: x.holidays, deadline: (() => { const d = P(x.start); d.setDate(d.getDate() - 3); d.setHours(20, 0, 0, 0); return d.toISOString(); })() }));
        const r = await api.rpc('calendar_apply', { p_section: sec.id, p_weeks: rows, p_create: createNew });
        A.toast(`حُدِّث ${AR(r.updated || 0)} أسبوع${r.created ? ` · أُنشئ ${AR(r.created)}` : ''}${r.timetable ? ` · أُعيد ربط ${AR(r.timetable)} بالجدول الساري` : ''}`, 'ok');
        await A.loadSection(S.weekId); A.shell(); A.route();
      });
    };
    draw();
  }
  A._calPlan = plan; A._calInfer = infer;
})();
