/* منصة دينا — النشاط والدخول (لحساب المالك فقط)
   مرات الدخول وآخر دخول لكل موظف، وتوقيت إدخال الخطط (أول وآخر إدخال)، مع تصدير Excel وطباعة بهوية دينا وإدراجها في التقارير. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, I } = A;
  A.I.activity = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg>';
  const isOwner = () => !!(S.realMe || S.me).is_owner;
  const day = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const RANGES = [['7', 'آخر ٧ أيام'], ['30', 'آخر ٣٠ يوماً'], ['90', 'آخر ٩٠ يوماً'], ['custom', 'فترة محددة']];

  async function collect(st) {
    const to = st.r === 'custom' && st.to ? new Date(st.to + 'T23:59:59') : new Date(), from = st.r === 'custom' && st.from ? new Date(st.from + 'T00:00:00') : new Date(Date.now() - (+st.r || 7) * 864e5);
    let logs = []; try { logs = await api.list('login_events', { school_id: S.school.id }, { gte: { at: from.toISOString() }, lte: { at: to.toISOString() }, order: 'at', desc: true }); } catch (_) {}
    const sec = new Set(S.memberships.filter(m => m.section_id === S.sectionId).map(m => m.staff_id));
    const people = S.staff.filter(p => p.active && !p.is_owner && (sec.has(p.id) || S.entries.some(e => e.teacher_id === p.id)));
    const rows = people.map(p => {
      const L = logs.filter(l => l.staff_id === p.id), es = S.entries.filter(e => e.teacher_id === p.id && A.required(e)), done = es.filter(A.filled);
      const times = S.entries.filter(e => e.updated_by === p.id && (e.topic || e.homework || e.note)).map(e => e.updated_at).filter(Boolean).sort();
      return { p, n: L.length, last: L[0] && L[0].at, dev: L[0] && L[0].device, days: new Set(L.map(l => day(l.at))).size, req: es.length, done: done.length, first: times[0], lastE: times[times.length - 1] };
    }).sort((a, b) => b.n - a.n || a.p.full_name.localeCompare(b.p.full_name, 'ar'));
    return { from, to, logs, rows };
  }

  function render(box, st, again) {
    box.innerHTML = '<div class="spinner"></div>';
    collect(st).then(({ from, to, logs, rows }) => {
      const w = A.week(), never = rows.filter(r => !r.n).length;
      const byDay = {}; for (let t = new Date(from); t <= to; t = new Date(t.getTime() + 864e5)) byDay[day(t)] = 0; logs.forEach(l => { const k = day(l.at); if (k in byDay) byDay[k]++; });
      const dk = Object.keys(byDay).slice(-45), mx = Math.max(1, ...dk.map(k => byDay[k]));
      box.innerHTML = `<div class="grid g4" style="margin-top:12px"><div class="kpi navy"><div class="k">مرات الدخول</div><div class="v">${AR(logs.length)}</div><div class="d">${AR(new Set(logs.map(l => l.staff_id)).size)} موظفاً دخلوا</div></div>
          <div class="kpi"><div class="k">لم يدخلوا في الفترة</div><div class="v" style="color:${never ? 'var(--bad)' : 'var(--ok)'}">${AR(never)}</div><div class="d">من ${AR(rows.length)}</div></div>
          <div class="kpi"><div class="k">إنجاز الأسبوع ${w ? esc(w.word) : ''}</div><div class="v">${AR(A.pct(rows.reduce((a, r) => a + r.done, 0), rows.reduce((a, r) => a + r.req, 0)))}<small>٪</small></div></div>
          <div class="kpi"><div class="k">متوسط أيام الدخول</div><div class="v">${AR(rows.length ? Math.round(rows.reduce((a, r) => a + r.days, 0) / rows.length * 10) / 10 : 0)}</div></div></div>
        <div class="sec-box" style="margin-top:12px"><b>الدخول اليومي</b><div class="act-bars" role="img" aria-label="عدد مرات الدخول لكل يوم">${dk.map(k => `<div class="act-b" title="${AR(k)}: ${AR(byDay[k])}"><i style="height:${Math.round(byDay[k] / mx * 100)}%"></i><span>${AR(k.slice(8))}</span></div>`).join('')}</div></div>
        <div class="row" style="gap:8px;margin:12px 0"><input class="in" id="acQ" placeholder="بحث بالاسم" style="max-width:240px"><div class="chip-filter" id="acF" style="margin:0"><button data-f="" class="on">الكل</button><button data-f="never">لم يدخلوا</button><button data-f="low">إنجاز أقل من ٥٠٪</button></div><div class="grow"></div><button class="btn ghost sm" id="acX">${I.down} Excel</button><button class="btn ghost sm" id="acP">${I.print} طباعة</button></div>
        <div class="scroll"><table class="tbl"><thead><tr><th>الموظف</th><th>المسمى</th><th>مرات الدخول</th><th>أيام الدخول</th><th>آخر دخول</th><th>الجهاز</th><th>إنجاز الأسبوع</th><th>أول إدخال</th><th>آخر إدخال</th></tr></thead><tbody id="acB"></tbody></table></div>
        <details style="margin-top:12px"><summary><b>سجل الدخول التفصيلي</b> <span class="small muted">(آخر ${AR(Math.min(200, logs.length))})</span></summary><div class="scroll" style="max-height:360px"><table class="tbl"><thead><tr><th>الوقت</th><th>الموظف</th><th>الجهاز</th></tr></thead><tbody>${logs.slice(0, 200).map(l => `<tr><td class="small">${A.fmtDT(l.at)}</td><td>${esc(A.personName(l.staff_id))}</td><td class="small">${esc(l.device || '')}</td></tr>`).join('') || `<tr><td colspan="3">${A.emptyBox('لا يوجد دخول مسجّل في هذه الفترة', 'يبدأ التسجيل من تاريخ تفعيل الميزة.')}</td></tr>`}</tbody></table></div></details>`;
      let f = '';
      const draw = () => { const q = A.normKey($('#acQ', box).value || ''); $('#acB', box).innerHTML = rows.filter(r => (!q || A.normKey(r.p.full_name).includes(q)) && (!f || (f === 'never' ? !r.n : r.req && A.pct(r.done, r.req) < 50))).map(r => `<tr><td><b>${esc(r.p.full_name)}</b></td><td class="small">${esc(r.p.title || '')}</td><td>${r.n ? AR(r.n) : '<span class="pill st-returned">لم يدخل</span>'}</td><td>${AR(r.days)}</td><td class="small">${r.last ? A.fmtDT(r.last) : '—'}</td><td class="small">${esc(r.dev || '')}</td><td>${r.req ? `<div class="row" style="flex-wrap:nowrap;gap:6px">${A.bar(r.done, r.req)}<span class="small">${AR(A.pct(r.done, r.req))}٪</span></div>` : '<span class="faint">—</span>'}</td><td class="small">${r.first ? A.fmtDT(r.first) : '—'}</td><td class="small">${r.lastE ? A.fmtDT(r.lastE) : '—'}</td></tr>`).join('') || `<tr><td colspan="9">${A.emptyBox('لا توجد نتائج')}</td></tr>`; };
      $('#acQ', box).oninput = draw; $$('#acF button', box).forEach(b => b.onclick = () => { f = b.dataset.f; $$('#acF button', box).forEach(x => x.classList.toggle('on', x === b)); draw(); }); draw();
      const fmt = d => d ? new Date(d).toLocaleString('ar-SA-u-nu-latn', { dateStyle: 'short', timeStyle: 'short' }) : '';
      $('#acX', box).onclick = () => { const wb = XLSX.utils.book_new(); const a = XLSX.utils.json_to_sheet(rows.map(r => ({ الموظف: r.p.full_name, المسمى: r.p.title || '', 'مرات الدخول': r.n, 'أيام الدخول': r.days, 'آخر دخول': fmt(r.last), الجهاز: r.dev || '', 'الحصص المطلوبة': r.req, المدخلة: r.done, 'النسبة %': A.pct(r.done, r.req), 'أول إدخال': fmt(r.first), 'آخر إدخال': fmt(r.lastE) }))); a['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, a, 'ملخص الموظفين');
        const b = XLSX.utils.json_to_sheet(logs.map(l => ({ الوقت: fmt(l.at), الموظف: A.personName(l.staff_id), الجهاز: l.device || '' }))); b['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, b, 'سجل الدخول'); XLSX.writeFile(wb, `النشاط والدخول - ${A.section().name}.xlsx`); };
      $('#acP', box).onclick = () => A.printDoc('تقرير النشاط والدخول', `${A.section().name} · من ${day(from)} إلى ${day(to)}${w ? ' · إنجاز الأسبوع ' + w.word : ''}`, `<table><tr><th>الموظف</th><th>المسمى</th><th>مرات الدخول</th><th>أيام الدخول</th><th>آخر دخول</th><th>الإنجاز</th><th>أول إدخال</th><th>آخر إدخال</th></tr>${rows.map(r => `<tr><td style="text-align:right">${esc(r.p.full_name)}</td><td>${esc(r.p.title || '')}</td><td>${r.n || 'لم يدخل'}</td><td>${r.days}</td><td>${fmt(r.last)}</td><td>${r.req ? A.pct(r.done, r.req) + '%' : '—'}</td><td>${fmt(r.first)}</td><td>${fmt(r.lastE)}</td></tr>`).join('')}</table>`, true);
    });
  }

  V.activity = function (root) {
    if (!isOwner()) { root.innerHTML = `<div class="card">${A.emptyBox('هذه الصفحة لحساب المالك فقط')}</div>`; return; }
    const st = { r: A.LS.get('ac_r') || '7', from: A.LS.get('ac_f') || '', to: A.LS.get('ac_t') || '' };
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>النشاط والدخول</h2><p class="sub" style="margin:2px 0 0">يظهر لك وحدك: مرات دخول كل موظف وآخر دخول، وتوقيت إدخال الخطط في الأسبوع المختار من أعلى الصفحة. وتوقيت كل حصة يظهر لك أيضاً أسفل حالتها في «خطط الفصول».</p></div></div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><div class="chip-filter" id="acR" style="margin:0">${RANGES.map(([k, l]) => `<button data-r="${k}" class="${st.r === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <span id="acC" class="row" style="gap:6px;${st.r === 'custom' ? '' : 'display:none'}"><label class="small">من <input class="in" type="date" id="acFr" value="${st.from}"></label><label class="small">إلى <input class="in" type="date" id="acTo" value="${st.to}"></label><button class="btn sm" id="acGo">عرض</button></span></div>
      <div id="acOut"></div></div>`;
    const out = $('#acOut', root), go = () => render(out, st);
    $$('#acR button', root).forEach(b => b.onclick = () => { st.r = b.dataset.r; A.LS.set('ac_r', st.r); $$('#acR button', root).forEach(x => x.classList.toggle('on', x === b)); $('#acC', root).style.display = st.r === 'custom' ? '' : 'none'; if (st.r !== 'custom') go(); });
    $('#acGo', root).onclick = () => { st.from = $('#acFr', root).value; st.to = $('#acTo', root).value; A.LS.set('ac_f', st.from); A.LS.set('ac_t', st.to); go(); };
    go();
  };

  // بطاقة في صفحة التقارير (للمالك فقط)
  const r0 = V.reports;
  if (r0) V.reports = function (root) { r0(root); if (!isOwner()) return; const g = $('.rep-grid', root); if (g && !$('[data-act]', g)) { g.insertAdjacentHTML('beforeend', '<button class="rep-card" data-act><b>النشاط والدخول</b><span class="small muted">مرات الدخول وآخر دخول وتوقيت إدخال الخطط لكل موظف — يظهر لك وحدك.</span></button>'); $('[data-act]', g).onclick = () => { location.hash = '#/activity'; }; } };
})();
