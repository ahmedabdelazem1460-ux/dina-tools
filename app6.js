/* منصة دينا — التقارير، الأرشيف، استيراد الموظفين، هوية كل قسم */
(function () {
  const A = window.APP, V = window.VIEWS;
  const { api, S, $, $$, esc, AR, DAYS, PER, ROLES, I } = A;

  // ---------- أدوات مشتركة ----------
  const xlsx = (name, sheets) => { const wb = XLSX.utils.book_new(); sheets.forEach(([n, rows]) => { const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]); ws['!views'] = [{ RTL: true }]; Object.keys(ws).forEach(k => { const c = ws[k]; if (k[0] !== '!' && c && typeof c.v === 'string') { const u = c.v.match(/https?:\/\/[^\s،]+/); if (u) c.l = { Target: u[0], Tooltip: 'فتح الرابط' }; } }); XLSX.utils.book_append_sheet(wb, ws, n.slice(0, 31)); }); wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, name + '.xlsx'); };
  function printDoc(title, sub, bodyHtml, land) {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:-9999px;width:1100px;height:800px;border:0'; document.body.appendChild(f);
    const base = location.href.replace(/[^/]*$/, '').split('#')[0];
    f.contentDocument.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="${base}"><title>${esc(title)}</title><style>
      @font-face{font-family:'GE SS Two';font-weight:400 500;src:url(fonts/gess-two-medium.woff2)}@font-face{font-family:'GE SS Two';font-weight:600 900;src:url(fonts/gess-two-bold.woff2)}@font-face{font-family:'Myriad Pro';src:url(fonts/myriad-pro-regular.woff2)}
      @page{size:A4 ${land ? 'landscape' : 'portrait'};margin:14mm 12mm}body{font-family:'GE SS Two','Myriad Pro',sans-serif;color:#082B5A;margin:0}
      header{display:flex;align-items:center;justify-content:space-between;border-bottom:3px solid #3AB1DB;padding-bottom:10px;margin-bottom:14px}header img{height:58px}
      h1{margin:0;font-size:22px;font-weight:800}p.s{margin:4px 0 0;color:#005499;font-size:13px}
      table{width:100%;border-collapse:collapse;font-size:12px}th{background:#082B5A;color:#fff;padding:7px;font-weight:800}td{border-bottom:1px solid #84B7E3;padding:6px;text-align:center;vertical-align:top}
      tr:nth-child(even) td{background:#E4EBF5}.k{display:inline-block;border:1px solid #84B7E3;border-radius:12px;padding:8px 14px;margin:0 0 10px 8px}.k b{display:block;font-size:20px}
      footer{margin-top:16px;border-top:2px solid #082B5A;padding-top:6px;font-size:11px;display:flex;justify-content:space-between}</style></head><body>
      <header><div><h1>${esc(title)}</h1><p class="s">${esc(sub)}</p></div><img src="assets/logo.svg"></header>${bodyHtml}
      <footer><span>${esc(S.school.name)}</span><span dir="ltr">Dinaaedu · 920035881</span></footer></body></html>`);
    f.contentDocument.close();
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 3000); }, 700);
  }
  A.printDoc = printDoc;
  const weeksPicker = (id, def = 4) => `<div class="field"><label>الأسابيع</label><div class="perm-grid" id="${id}">${S.weeks.slice().sort((a, b) => b.number - a.number).map((w, i) => `<label class="chk"><input type="checkbox" value="${w.id}" ${i < def ? 'checked' : ''}> الأسبوع ${esc(w.word)}${w.archived ? ' (أرشيف)' : ''}</label>`).join('')}</div></div>`;
  const pickedWeeks = (root, id) => $$(`#${id} input:checked`, root).map(i => S.weeks.find(w => w.id === i.value)).filter(Boolean).sort((a, b) => a.number - b.number);
  const onTime = (e, w) => !!e.submitted_at && (!w.deadline || new Date(e.submitted_at) <= new Date(w.deadline));

  // =====================================================================
  //  التقارير
  // =====================================================================
  const REPORTS = [
    ['custom', 'منشئ التقارير المخصصة', 'اختر التجميع (معلم، فصل، مادة، أسبوع، يوم) والمقاييس والأسابيع، واحفظ التقرير قالباً تعيد استخدامه.'],
    ['completion', 'نسب إنجاز المعلمين', 'أسبوعي أو لعدة أسابيع أو للفصل كاملاً: الإنجاز والإرسال والاعتماد والتنفيذ لكل معلم، مع مصفوفة المعلمين × الأسابيع.'],
    ['teachers', 'التزام المعلمين', 'لكل معلم: الإنجاز، الإرسال في الوقت، التأخر، الأخطاء اللغوية، التنفيذ.'],
    ['teacher', 'تقرير معلم', 'تفصيل معلم واحد أسبوعاً بأسبوع، قابل للطباعة والإرسال له.'],
    ['subject', 'خطة مادة لفصل', 'خطة مادة لفصل واحد عبر عدة أسابيع أو الفصل الدراسي كاملاً.'],
    ['edits', 'التعديلات والتدقيق', 'التصحيحات اللغوية والتعديلات حسب الفصل والمعلم والحصة.'],
    ['exec', 'التنفيذ اليومي', 'نسبة ما نُفِّذ كما خُطِّط وما عُدِّل وما لم يُنفَّذ.'],
    ['daily', 'الخطة اليومية للفصول', 'ما دُرِّس فعلاً (المؤكَّد) أو خطة اليوم كاملة أو الواجبات فقط كتذكير — طباعة وExcel ونص جاهز للإرسال.'],
  ];
  V.reports = function (root) {
    const cur = A.LS.get('rep') || '';
    if (!cur) {
      root.innerHTML = `<div class="card"><h2>التقارير</h2><p class="sub">اختر تقريراً، حدّد الأسابيع، ثم صدّره Excel أو اطبعه بهوية دينا.</p><div class="rep-grid">${REPORTS.map(([k, l, d]) => `<button class="rep-card" data-r="${k}"><b>${l}</b><span class="small muted">${d}</span></button>`).join('')}</div></div>`;
      $$('[data-r]', root).forEach(b => b.onclick = () => { A.LS.set('rep', b.dataset.r); V.reports(root); });
      return;
    }
    const [, title] = REPORTS.find(r => r[0] === cur);
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>${title} — ${esc(A.section().name)}</h2></div><button class="btn ghost sm" id="rBack">كل التقارير</button></div><div id="rForm"></div><div id="rOut"></div></div>`;
    $('#rBack', root).onclick = () => { A.LS.set('rep', ''); V.reports(root); };
    ({ custom: repCustom, completion: repCompletion, teachers: repTeachers, teacher: repTeacher, subject: repSubject, edits: repEdits, exec: repExec, daily: repDaily })[cur]($('#rForm', root), $('#rOut', root));
  };
  async function load(weeks) { const es = await api.entriesForWeeks(weeks.map(w => w.id)); return es; }
  function teacherStats(es, weeks, li) {
    const out = {};
    es.filter(e => e.teacher_id && A.required(e)).forEach(e => {
      const t = out[e.teacher_id] = out[e.teacher_id] || { req: 0, filled: 0, sub: 0, ontime: 0, late: 0, ret: 0, done: 0, mod: 0, nd: 0, lang: 0 };
      const w = weeks.find(x => x.id === e.week_id); t.req++;
      if (A.filled(e)) t.filled++;
      if (e.submitted_at || ['submitted', 'approved'].includes(e.status)) { t.sub++; if (onTime(e, w)) t.ontime++; else if (e.submitted_at) t.late++; }
      else if (w.deadline && new Date(w.deadline) < new Date() && !A.filled(e)) t.late++;
      if (e.status === 'returned') t.ret++;
      if (e.exec_status === 'done') t.done++; if (e.exec_status === 'modified') t.mod++; if (e.exec_status === 'not_done') t.nd++;
    });
    (li || []).forEach(x => { if (out[x.teacher_id]) out[x.teacher_id].lang++; });
    return out;
  }
  // منشئ التقارير المخصصة — يقرأ فقط ولا يغيّر أي بيانات
  const DIMS = [['teacher', 'المعلم', e => e.teacher_id ? A.personName(e.teacher_id) : 'بلا معلم'], ['class', 'الفصل', e => (A.cls(e.class_id) || {}).name || ''], ['subject', 'المادة', e => A.subjName(e.subject_id) || '—'], ['week', 'الأسبوع', (e, W) => 'الأسبوع ' + ((W[e.week_id] || {}).word || '')], ['day', 'اليوم', e => DAYS[e.day]]];
  const METRICS = [['req', 'الحصص المطلوبة', 1], ['filled', 'المكتمل', 1], ['pf', 'نسبة الإنجاز %', 0], ['sent', 'مُرسلة', 1], ['appr', 'معتمدة', 1], ['pa', 'نسبة الاعتماد %', 0], ['ret', 'مُعادة', 1], ['hw', 'حصص بواجب', 1], ['done', 'نُفِّذت كما خُطِّط', 1], ['mod', 'نُفِّذت بتعديل', 1], ['nd', 'لم تُنفَّذ', 1], ['pe', 'نسبة التنفيذ %', 0], ['task', 'مهام أدائية', 1]];
  function repCustom(F, O) {
    let saved = []; try { saved = JSON.parse(A.LS.get('rep_tpls') || '[]'); } catch (_) { }
    const cfg = { dims: ['teacher'], metrics: ['req', 'filled', 'pf', 'appr', 'pe'] };
    const render = () => {
      F.innerHTML = `${saved.length ? `<div class="row" style="margin-bottom:10px;gap:6px"><span class="small muted">قوالبي:</span>${saved.map((t, i) => `<span class="ldc"><button class="ldbtn" data-tp="${i}" style="border:0;background:none">${esc(t.name)}</button><button class="ldx" data-tx="${i}" aria-label="حذف القالب">×</button></span>`).join('')}</div>` : ''}
        <div class="grid g2"><div class="field"><label>التجميع حسب (بالترتيب)</label><div class="perm-grid">${DIMS.map(([k, l]) => `<label class="chk"><input type="checkbox" data-d="${k}" ${cfg.dims.includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
        <div class="field"><label>المقاييس</label><div class="perm-grid">${METRICS.map(([k, l]) => `<label class="chk"><input type="checkbox" data-m="${k}" ${cfg.metrics.includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div></div></div>
        ${weeksPicker('rw', 4)}<div class="row"><button class="btn" id="rGo">عرض التقرير</button><button class="btn ghost" id="rSv">حفظ كقالب</button></div>`;
      $$('[data-d]', F).forEach(i => i.onchange = () => { cfg.dims = DIMS.map(d => d[0]).filter(k => $(`[data-d="${k}"]`, F).checked); });
      $$('[data-m]', F).forEach(i => i.onchange = () => { cfg.metrics = METRICS.map(d => d[0]).filter(k => $(`[data-m="${k}"]`, F).checked); });
      $$('[data-tp]', F).forEach(b => b.onclick = () => { const t = saved[+b.dataset.tp]; cfg.dims = t.dims.slice(); cfg.metrics = t.metrics.slice(); render(); });
      $$('[data-tx]', F).forEach(b => b.onclick = () => { saved.splice(+b.dataset.tx, 1); A.LS.set('rep_tpls', JSON.stringify(saved)); render(); });
      $('#rSv', F).onclick = () => { const m = A.modal(`<h3>حفظ القالب</h3><div class="field"><label for="tpn">اسم القالب</label><input class="in" id="tpn" placeholder="مثال: اعتماد المواد لكل فصل"></div><div class="acts"><button class="btn" id="tpg">حفظ</button></div>`); m.el.querySelector('#tpg').onclick = () => { const n = m.el.querySelector('#tpn').value.trim(); if (!n) return; saved.push({ name: n, dims: cfg.dims.slice(), metrics: cfg.metrics.slice() }); A.LS.set('rep_tpls', JSON.stringify(saved)); m.close(); render(); A.toast('حُفظ القالب', 'ok'); }; };
      $('#rGo', F).onclick = e => A.run(e.currentTarget, async () => {
        const weeks = pickedWeeks(F, 'rw'); if (!weeks.length) throw new Error('اختر أسبوعاً'); if (!cfg.dims.length) throw new Error('اختر تجميعاً واحداً على الأقل'); if (!cfg.metrics.length) throw new Error('اختر مقياساً');
        const W = Object.fromEntries(weeks.map(w => [w.id, w])); const es = (await load(weeks)).filter(e => e.subject_id);
        const dims = cfg.dims.map(k => DIMS.find(d => d[0] === k)); const G = new Map();
        es.forEach(e => { const key = dims.map(d => d[2](e, W)); const k = key.join('\u0001'); const g = G.get(k) || (G.set(k, { key, req: 0, filled: 0, sent: 0, appr: 0, ret: 0, hw: 0, done: 0, mod: 0, nd: 0, task: 0 }), G.get(k));
          if (A.required(e)) g.req++; if (A.filled(e)) g.filled++; if (['submitted', 'approved'].includes(e.status) || (e.status === 'draft' && A.filled(e))) g.sent++; if (e.status === 'approved') g.appr++; if (e.status === 'returned') g.ret++; if ((e.homework || '').trim()) g.hw++;
          if (e.exec_status === 'done') g.done++; if (e.exec_status === 'modified') g.mod++; if (e.exec_status === 'not_done') g.nd++; if (e.perf_task && e.perf_task.text) g.task++; });
        const rows = [...G.values()].map(g => ({ ...g, pf: A.pct(g.filled, g.req), pa: A.pct(g.appr, g.req), pe: A.pct(g.done + g.mod, g.req) })).sort((a, b) => a.key.join(' ').localeCompare(b.key.join(' '), 'ar'));
        const ms = cfg.metrics.map(k => METRICS.find(m => m[0] === k));
        const tot = {}; ms.forEach(([k, , sum]) => { if (sum) tot[k] = rows.reduce((a, r) => a + r[k], 0); }); const T2 = { req: rows.reduce((a, r) => a + r.req, 0), filled: rows.reduce((a, r) => a + r.filled, 0), appr: rows.reduce((a, r) => a + r.appr, 0), ex: rows.reduce((a, r) => a + r.done + r.mod, 0) }; tot.pf = A.pct(T2.filled, T2.req); tot.pa = A.pct(T2.appr, T2.req); tot.pe = A.pct(T2.ex, T2.req);
        const table = `<div class="scroll"><table class="tbl"><thead><tr>${dims.map(d => `<th>${d[1]}</th>`).join('')}${ms.map(m => `<th>${m[1]}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.key.map(k => `<td><b>${esc(k)}</b></td>`).join('')}${ms.map(([k]) => `<td>${AR(r[k])}</td>`).join('')}</tr>`).join('')}<tr style="background:var(--pale);font-weight:800"><td colspan="${dims.length}">الإجمالي</td>${ms.map(([k]) => `<td>${AR(tot[k])}</td>`).join('')}</tr></tbody></table></div>`;
        const scope = weeks.map(w => 'الأسبوع ' + w.word).join('، ');
        O.innerHTML = `<div class="row" style="margin-top:14px"><button class="btn ghost sm" id="rX">${I.down} Excel</button><button class="btn ghost sm" id="rP">${I.print} طباعة</button><span class="small muted">${AR(rows.length)} صف · ${esc(scope)}</span></div>` + table;
        const flat = rows.map(r => Object.assign({}, ...dims.map((d, i) => ({ [d[1]]: r.key[i] })), ...ms.map(([k, l]) => ({ [l]: r[k] }))));
        $('#rX', O).onclick = () => xlsx(`تقرير مخصص - ${A.section().name}`, [['التقرير', flat]]);
        $('#rP', O).onclick = () => printDoc('تقرير مخصص', `${A.section().name} · ${dims.map(d => d[1]).join(' × ')} · ${scope}`, table, dims.length + ms.length > 7);
      });
    };
    render();
  }
  // نسب إنجاز المعلمين: نطاق أسبوع / عدة أسابيع / الفصل كاملاً
  function repCompletion(F, O) {
    const all = S.weeks.slice().sort((a, b) => a.number - b.number);
    const today = new Date().toISOString().slice(0, 10);
    const cur = all.filter(w => w.start_date <= today).slice(-1)[0] || all[0];
    F.innerHTML = `<div class="chip-filter" id="rcR" style="margin-bottom:10px"><button data-r="week" class="on">الأسبوع الحالي</button><button data-r="multi">عدة أسابيع</button><button data-r="term">الفصل الدراسي كاملاً</button></div><div id="rcW" class="hidden">${weeksPicker('rw', 4)}</div><button class="btn" id="rGo">عرض التقرير</button>`;
    let mode = 'week';
    $$('#rcR button', F).forEach(b => b.onclick = () => { mode = b.dataset.r; $$('#rcR button', F).forEach(x => x.classList.toggle('on', x === b)); $('#rcW', F).classList.toggle('hidden', mode !== 'multi'); });
    $('#rGo', F).onclick = e => A.run(e.currentTarget, async () => {
      const weeks = mode === 'week' ? [cur].filter(Boolean) : mode === 'term' ? (all.filter(w => w.start_date <= today).length ? all.filter(w => w.start_date <= today) : all) : pickedWeeks(F, 'rw');
      if (!weeks.length) throw new Error('اختر أسبوعاً');
      const es = (await load(weeks)).filter(e => e.teacher_id && A.required(e));
      const T = {}; es.forEach(e => { const t = T[e.teacher_id] = T[e.teacher_id] || { req: 0, filled: 0, sent: 0, appr: 0, exec: 0, w: {} }; const x = t.w[e.week_id] = t.w[e.week_id] || { req: 0, filled: 0 };
        t.req++; x.req++; if (A.filled(e)) { t.filled++; x.filled++; } if (['submitted', 'approved'].includes(e.status) || (e.status === 'draft' && A.filled(e))) t.sent++; if (e.status === 'approved') t.appr++; if (e.exec_status && e.exec_status !== 'pending') t.exec++; });
      const rows = Object.entries(T).map(([id, t]) => ({ id, name: A.personName(id), ...t, pf: A.pct(t.filled, t.req), pa: A.pct(t.appr, t.req), pe: A.pct(t.exec, t.req) })).sort((a, b) => b.pf - a.pf);
      const tot = rows.reduce((a, r) => ({ req: a.req + r.req, filled: a.filled + r.filled, appr: a.appr + r.appr, exec: a.exec + r.exec }), { req: 0, filled: 0, appr: 0, exec: 0 });
      const lvl = v => v >= 90 ? 'st-approved' : v >= 60 ? 'st-submitted' : 'st-returned';
      const scope = mode === 'week' ? 'الأسبوع ' + weeks[0].word : mode === 'term' ? `الفصل الدراسي (${AR(weeks.length)} أسابيع)` : weeks.map(w => 'الأسبوع ' + w.word).join('، ');
      const kpis = `<div class="grid g4" style="margin:14px 0">${[['متوسط الإنجاز', A.pct(tot.filled, tot.req)], ['نسبة الاعتماد', A.pct(tot.appr, tot.req)], ['نسبة التنفيذ المؤكَّد', A.pct(tot.exec, tot.req)], ['معلمون مكتملون', null]].map(([k, v]) => `<div class="kpi"><div class="k">${k}</div><div class="v">${v == null ? AR(rows.filter(r => r.pf >= 100).length) + `<small> / ${AR(rows.length)}</small>` : AR(v) + '<small>٪</small>'}</div></div>`).join('')}</div>`;
      const matrix = weeks.length > 1 ? `<h3 style="margin-top:18px">المعلمون × الأسابيع (نسبة الإنجاز)</h3><div class="scroll"><table class="tbl"><thead><tr><th>المعلم</th>${weeks.map(w => `<th>${esc(w.word)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.name)}</b></td>${weeks.map(w => { const x = r.w[w.id]; if (!x) return '<td class="faint">—</td>'; const v = A.pct(x.filled, x.req); return `<td><span class="pill ${lvl(v)}">${AR(v)}٪</span></td>`; }).join('')}</tr>`).join('')}</tbody></table></div>` : '';
      const table = `<div class="scroll"><table class="tbl"><thead><tr><th>المعلم</th><th>الحصص المطلوبة</th><th>الإنجاز</th><th>مُرسلة</th><th>معتمدة</th><th>تنفيذ مؤكَّد</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.name)}</b></td><td>${AR(r.req)}</td><td><div class="row" style="flex-wrap:nowrap">${A.bar(r.filled, r.req)}<span class="pill ${lvl(r.pf)}">${AR(r.pf)}٪</span></div></td><td>${AR(r.sent)}</td><td>${AR(r.appr)} <span class="small muted">(${AR(r.pa)}٪)</span></td><td>${AR(r.exec)} <span class="small muted">(${AR(r.pe)}٪)</span></td></tr>`).join('') || '<tr><td colspan="6" class="muted">لا توجد بيانات</td></tr>'}</tbody></table></div>`;
      O.innerHTML = `<div class="row" style="margin-top:14px"><button class="btn ghost sm" id="rX">${I.down} Excel</button><button class="btn ghost sm" id="rP">${I.print} طباعة</button></div><p class="sub" style="margin:8px 0 0">${esc(scope)}</p>` + kpis + table + matrix;
      const flat = rows.map(r => ({ المعلم: r.name, 'الحصص المطلوبة': r.req, المكتمل: r.filled, 'نسبة الإنجاز %': r.pf, مُرسلة: r.sent, معتمدة: r.appr, 'نسبة الاعتماد %': r.pa, 'تنفيذ مؤكَّد': r.exec, 'نسبة التنفيذ %': r.pe }));
      const mflat = rows.map(r => Object.assign({ المعلم: r.name }, ...weeks.map(w => ({ ['الأسبوع ' + w.word]: r.w[w.id] ? A.pct(r.w[w.id].filled, r.w[w.id].req) : '' }))));
      $('#rX', O).onclick = () => xlsx(`نسب إنجاز المعلمين - ${A.section().name}`, [['الإنجاز', flat]].concat(weeks.length > 1 ? [['حسب الأسبوع', mflat]] : []));
      $('#rP', O).onclick = () => printDoc('نسب إنجاز المعلمين', `${A.section().name} · ${scope}`, (kpis + table + matrix), weeks.length > 4);
    });
  }
  function repTeachers(F, O) {
    F.innerHTML = weeksPicker('rw') + `<button class="btn" id="rGo">عرض التقرير</button>`;
    $('#rGo', F).onclick = e => A.run(e.currentTarget, async () => {
      const weeks = pickedWeeks(F, 'rw'); if (!weeks.length) throw new Error('اختر أسبوعاً');
      const [es, li] = await Promise.all([load(weeks), api.langIssues().catch(() => [])]);
      const st = teacherStats(es, weeks, li.filter(x => weeks.some(w => w.id === x.week_id)));
      const rows = Object.entries(st).map(([id, t]) => ({ id, name: A.personName(id), ...t, pf: A.pct(t.filled, t.req), pt: A.pct(t.ontime, t.sub || 1), pe: A.pct(t.done + t.mod, t.req) })).sort((a, b) => a.pf - b.pf);
      O.innerHTML = `<div class="row" style="margin:14px 0"><button class="btn ghost sm" id="rX">${I.down} Excel</button><button class="btn ghost sm" id="rP">${I.print} طباعة</button></div>
        <div class="scroll"><table class="tbl"><thead><tr><th>المعلم</th><th>المطلوب</th><th>الإنجاز</th><th>أُرسل في الوقت</th><th>متأخر</th><th>مُعاد</th><th>أخطاء لغوية</th><th>نُفِّذ</th><th></th></tr></thead><tbody>
        ${rows.map(r => `<tr><td><b>${esc(r.name)}</b></td><td>${AR(r.req)}</td><td><div class="row" style="flex-wrap:nowrap">${A.bar(r.filled, r.req)}<span class="small">${AR(r.pf)}٪</span></div></td><td>${AR(r.ontime)} <span class="small muted">(${AR(r.pt)}٪)</span></td><td>${r.late ? `<span class="pill st-returned">${AR(r.late)}</span>` : '—'}</td><td>${AR(r.ret)}</td><td>${AR(r.lang)}</td><td>${AR(r.pe)}٪</td><td><button class="btn ghost sm" data-msg="${r.id}" aria-label="مراسلة">${I.mail}</button></td></tr>`).join('') || '<tr><td colspan="9" class="muted">لا توجد بيانات</td></tr>'}</tbody></table></div>`;
      const flat = rows.map(r => ({ المعلم: r.name, المطلوب: r.req, المكتمل: r.filled, 'نسبة الإنجاز %': r.pf, 'أُرسل في الوقت': r.ontime, متأخر: r.late, مُعاد: r.ret, 'أخطاء لغوية': r.lang, نُفِّذ: r.done, 'عُدِّل ثم نُفِّذ': r.mod, 'لم يُنفَّذ': r.nd }));
      $('#rX', O).onclick = () => xlsx(`تقرير التزام المعلمين - ${A.section().name}`, [['التزام المعلمين', flat]]);
      $('#rP', O).onclick = () => printDoc('تقرير التزام المعلمين', `${A.section().name} · ${weeks.map(w => 'الأسبوع ' + w.word).join('، ')}`, `<table><tr>${Object.keys(flat[0] || {}).map(k => `<th>${k}</th>`).join('')}</tr>${flat.map(r => `<tr>${Object.values(r).map(v => `<td>${esc(typeof v === 'number' ? AR(v) : v)}</td>`).join('')}</tr>`).join('')}</table>`, true);
      $$('[data-msg]', O).forEach(b => b.onclick = () => A.compose([b.dataset.msg], 'متابعة الخطة الأسبوعية', ''));
    });
  }
  function repTeacher(F, O) {
    const ts = S.staff.filter(p => S.entries.some(e => e.teacher_id === p.id) || S.memberships.some(m => m.staff_id === p.id && m.section_id === S.sectionId));
    F.innerHTML = `<div class="field"><label>المعلم</label><select class="in" id="rt">${ts.map(p => `<option value="${p.id}">${esc(p.full_name)}</option>`).join('')}</select></div>` + weeksPicker('rw', 6) + `<button class="btn" id="rGo">عرض التقرير</button>`;
    $('#rGo', F).onclick = e => A.run(e.currentTarget, async () => {
      const tid = $('#rt', F).value, weeks = pickedWeeks(F, 'rw'); if (!weeks.length) throw new Error('اختر أسبوعاً');
      const [es, li] = await Promise.all([load(weeks), api.langIssues({ teacher: tid }).catch(() => [])]);
      const mine = es.filter(e => e.teacher_id === tid);
      const perW = weeks.map(w => { const l = mine.filter(e => e.week_id === w.id && A.required(e)); const sub = l.filter(e => e.submitted_at); const first = sub.map(e => e.submitted_at).sort()[0];
        return { w, req: l.length, filled: l.filter(A.filled).length, first, ontime: !first ? null : !w.deadline || new Date(first) <= new Date(w.deadline), lang: li.filter(x => x.week_id === w.id).length, done: l.filter(e => ['done', 'modified'].includes(e.exec_status)).length, nd: l.filter(e => e.exec_status === 'not_done').length }; });
      const tot = perW.reduce((a, r) => ({ req: a.req + r.req, filled: a.filled + r.filled, lang: a.lang + r.lang, done: a.done + r.done, late: a.late + (r.ontime === false ? 1 : 0) }), { req: 0, filled: 0, lang: 0, done: 0, late: 0 });
      const body = `<div class="grid g4" style="margin:14px 0">${[['نسبة الإنجاز', AR(A.pct(tot.filled, tot.req)) + '٪'], ['أسابيع متأخرة', AR(tot.late)], ['أخطاء لغوية', AR(tot.lang)], ['نسبة التنفيذ', AR(A.pct(tot.done, tot.req)) + '٪']].map(([k, v]) => `<div class="kpi"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>
        <div class="scroll"><table class="tbl"><thead><tr><th>الأسبوع</th><th>المطلوب</th><th>المكتمل</th><th>أول إرسال</th><th>الالتزام بالموعد</th><th>أخطاء لغوية</th><th>نُفِّذ</th><th>لم يُنفَّذ</th></tr></thead><tbody>${perW.map(r => `<tr><td><b>${esc(r.w.word)}</b></td><td>${AR(r.req)}</td><td>${AR(r.filled)}</td><td class="small">${r.first ? A.fmtDT(r.first) : '—'}</td><td>${r.ontime == null ? '<span class="pill st-empty">لم يُرسل</span>' : r.ontime ? '<span class="pill st-approved">في الوقت</span>' : '<span class="pill st-returned">متأخر</span>'}</td><td>${AR(r.lang)}</td><td>${AR(r.done)}</td><td>${AR(r.nd)}</td></tr>`).join('')}</tbody></table></div>
        ${li.length ? `<h3 style="margin-top:16px">الملاحظات اللغوية</h3><div class="scroll"><table class="tbl"><thead><tr><th>الفصل</th><th>قبل</th><th>بعد</th><th>النوع</th></tr></thead><tbody>${li.slice(0, 200).map(x => `<tr><td>${esc((A.cls(x.class_id) || {}).name || '')}</td><td class="small">${esc(x.original)}</td><td class="small">${esc(x.suggestion)}</td><td class="small">${esc(x.rule)}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
      O.innerHTML = `<div class="row" style="margin-top:14px"><button class="btn ghost sm" id="rX">${I.down} Excel</button><button class="btn ghost sm" id="rP">${I.print} طباعة</button><button class="btn ghost sm" id="rM">${I.mail} إرسال ملخص للمعلم</button></div>` + body;
      const name = A.personName(tid);
      $('#rX', O).onclick = () => xlsx(`تقرير ${name}`, [['الأسابيع', perW.map(r => ({ الأسبوع: r.w.word, المطلوب: r.req, المكتمل: r.filled, 'أول إرسال': r.first || '', الالتزام: r.ontime == null ? 'لم يُرسل' : r.ontime ? 'في الوقت' : 'متأخر', 'أخطاء لغوية': r.lang, نُفِّذ: r.done, 'لم يُنفَّذ': r.nd }))], ['الملاحظات اللغوية', li.map(x => ({ الفصل: (A.cls(x.class_id) || {}).name, قبل: x.original, بعد: x.suggestion, النوع: x.rule }))]]);
      $('#rP', O).onclick = () => printDoc(`تقرير المعلم: ${name}`, A.section().name, body.replace(/<button[^>]*>.*?<\/button>/g, ''), false);
      $('#rM', O).onclick = () => A.compose([tid], 'ملخص أدائك في الخطة الأسبوعية', perW.map(r => `الأسبوع ${r.w.word}: أنجزت ${r.filled} من ${r.req}${r.ontime === false ? ' (متأخر)' : ''}${r.lang ? ` — ${r.lang} ملاحظة لغوية` : ''}`).join('\n'));
    });
  }
  function repSubject(F, O) {
    const subs = [...new Set(S.entries.filter(e => e.subject_id).map(e => e.subject_id))];
    F.innerHTML = `<div class="grid g2"><div class="field"><label>الفصل</label><select class="in" id="rc">${S.classes.filter(c => c.active).map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label>المادة</label><select class="in" id="rs">${subs.map(s => `<option value="${s}">${esc(A.subjName(s))}</option>`).join('')}</select></div></div>` + weeksPicker('rw', 99) + `<button class="btn" id="rGo">عرض الخطة</button>`;
    $('#rGo', F).onclick = e => A.run(e.currentTarget, async () => {
      const cid = $('#rc', F).value, sid = $('#rs', F).value, weeks = pickedWeeks(F, 'rw'); if (!weeks.length) throw new Error('اختر أسبوعاً');
      const es = (await load(weeks)).filter(x => x.class_id === cid && x.subject_id === sid).sort((a, b) => weeks.findIndex(w => w.id === a.week_id) - weeks.findIndex(w => w.id === b.week_id) || a.day - b.day || a.period - b.period);
      const rows = es.map(x => { const w = weeks.find(y => y.id === x.week_id); return { الأسبوع: w.word, اليوم: DAYS[x.day], التاريخ: A.weekDates(w)[x.day], الحصة: x.period + 1, الموضوع: x.topic, الواجب: x.homework, التنفيذ: A.EX ? A.EX[x.exec_status || 'pending'] : '' }; });
      const c = A.cls(cid), title = `خطة ${A.subjName(sid)} — ${c.name}`;
      const table = `<table><tr><th>الأسبوع</th><th>اليوم</th><th>التاريخ</th><th>الحصة</th><th>الموضوع</th><th>الواجب</th><th>التنفيذ</th></tr>${rows.map(r => `<tr><td>${esc(r.الأسبوع)}</td><td>${r.اليوم}</td><td dir="ltr">${AR(r.التاريخ)}</td><td>${AR(r.الحصة)}</td><td>${esc(r.الموضوع) || '–'}</td><td>${esc(r.الواجب) || '–'}</td><td>${esc(r.التنفيذ)}</td></tr>`).join('')}</table>`;
      O.innerHTML = `<div class="row" style="margin:14px 0"><button class="btn ghost sm" id="rX">${I.down} Excel</button><button class="btn ghost sm" id="rP">${I.print} طباعة بهوية دينا</button><span class="small muted">${A.cnt(rows.length, 'حصة', 'حصص')} في ${A.cnt(weeks.length, 'أسبوع', 'أسابيع')}</span></div><div class="scroll">${table.replace('<table>', '<table class="tbl">')}</div>`;
      $('#rX', O).onclick = () => xlsx(title, [['الخطة', rows]]);
      $('#rP', O).onclick = () => printDoc(title, `${S.school.term_label} · ${A.section().name}`, table, false);
    });
  }
  function repEdits(F, O) {
    F.innerHTML = weeksPicker('rw') + `<div class="field"><label>التجميع حسب</label><select class="in" id="rg" style="max-width:240px"><option value="teacher">المعلم</option><option value="class">الفصل</option><option value="period">الحصة</option></select></div><button class="btn" id="rGo">عرض التقرير</button>`;
    $('#rGo', F).onclick = e => A.run(e.currentTarget, async () => {
      const weeks = pickedWeeks(F, 'rw'); const ids = weeks.map(w => w.id);
      const [li, es] = await Promise.all([api.langIssues(), load(weeks)]);
      const L = li.filter(x => ids.includes(x.week_id)); const by = $('#rg', F).value;
      const ent = Object.fromEntries(es.map(x => [x.id, x]));
      const key = x => by === 'teacher' ? A.personName(x.teacher_id) || 'بلا معلم' : by === 'class' ? (A.cls(x.class_id) || {}).name || '' : 'الحصة ' + PER[(ent[x.entry_id] || {}).period ?? 0];
      const g = {}; L.forEach(x => { const k = key(x); (g[k] = g[k] || []).push(x); });
      const returned = es.filter(x => x.status === 'returned' || x.review_note);
      const rows = L.map(x => { const e2 = ent[x.entry_id] || {}; const w = weeks.find(y => y.id === x.week_id) || {}; return { الأسبوع: w.word, الفصل: (A.cls(x.class_id) || {}).name, المعلم: A.personName(x.teacher_id), اليوم: DAYS[e2.day] || '', الحصة: (e2.period ?? -1) + 1, الحقل: { topic: 'الموضوع', homework: 'الواجب', note: 'ملاحظة' }[x.field], قبل: x.original, بعد: x.suggestion, النوع: x.rule, التاريخ: x.created_at }; });
      O.innerHTML = `<div class="row" style="margin:14px 0"><button class="btn ghost sm" id="rX">${I.down} Excel</button><span class="small muted">${A.cnt(L.length, 'تصحيح لغوي', 'تصحيحات لغوية')} · ${A.cnt(returned.length, 'حصة مُعادة أو عليها ملاحظة', 'حصص مُعادة أو عليها ملاحظات')}</span></div>
        <div class="grid g2"><div><h3>عدد التصحيحات حسب ${{ teacher: 'المعلم', class: 'الفصل', period: 'الحصة' }[by]}</h3><table class="tbl"><tbody>${Object.entries(g).sort((a, b) => b[1].length - a[1].length).map(([k, l]) => `<tr><td><b>${esc(k)}</b></td><td>${A.bar(l.length, L.length)}</td><td>${AR(l.length)}</td></tr>`).join('') || '<tr><td class="muted">لا توجد تصحيحات في هذه الأسابيع</td></tr>'}</tbody></table></div>
        <div><h3>ملاحظات المراجعة على الحصص</h3><table class="tbl"><tbody>${returned.slice(0, 60).map(x => `<tr><td>${esc((A.cls(x.class_id) || {}).name)}</td><td class="small">${esc(A.subjName(x.subject_id))}</td><td class="small">${esc(x.review_note || 'مُعادة')}</td></tr>`).join('') || '<tr><td class="muted">لا يوجد</td></tr>'}</tbody></table></div></div>`;
      $('#rX', O).onclick = () => xlsx('تقرير التعديلات والتدقيق', [['التصحيحات اللغوية', rows], ['ملاحظات المراجعة', returned.map(x => ({ الفصل: (A.cls(x.class_id) || {}).name, المادة: A.subjName(x.subject_id), المعلم: A.personName(x.teacher_id), اليوم: DAYS[x.day], الحصة: x.period + 1, الملاحظة: x.review_note, الحالة: A.STATUS[x.status] }))]]);
    });
  }
  function repExec(F, O) {
    F.innerHTML = weeksPicker('rw', 1) + `<button class="btn" id="rGo">عرض التقرير</button>`;
    $('#rGo', F).onclick = e => A.run(e.currentTarget, async () => {
      const weeks = pickedWeeks(F, 'rw'); const es = (await load(weeks)).filter(A.required);
      const agg = (f) => { const g = {}; es.forEach(x => { const k = f(x); const t = g[k] = g[k] || { all: 0, done: 0, modified: 0, not_done: 0, pending: 0 }; t.all++; t[x.exec_status || 'pending']++; }); return g; };
      const tbl = (g, lbl) => `<h3>${lbl}</h3><div class="scroll"><table class="tbl"><thead><tr><th>${lbl}</th><th>${A.exPill('done')}</th><th>${A.exPill('modified')}</th><th>${A.exPill('not_done')}</th><th>${A.exPill('pending')}</th></tr></thead><tbody>${Object.entries(g).map(([k, t]) => `<tr><td><b>${esc(k)}</b></td><td>${AR(t.done)}</td><td>${AR(t.modified)}</td><td>${AR(t.not_done)}</td><td>${AR(t.pending)}</td></tr>`).join('')}</tbody></table></div>`;
      const gc = agg(x => (A.cls(x.class_id) || {}).name || ''), gt = agg(x => A.personName(x.teacher_id) || 'بلا معلم');
      O.innerHTML = `<div class="row" style="margin:14px 0"><button class="btn ghost sm" id="rX">${I.down} Excel</button></div><div class="grid g2"><div>${tbl(gc, 'الفصل')}</div><div>${tbl(gt, 'المعلم')}</div></div>`;
      const flat = g => Object.entries(g).map(([k, t]) => ({ الاسم: k, 'نُفِّذ': t.done, 'عُدِّل ثم نُفِّذ': t.modified, 'لم يُنفَّذ': t.not_done, 'لم يُؤكَّد': t.pending }));
      $('#rX', O).onclick = () => xlsx('تقرير التنفيذ اليومي', [['حسب الفصل', flat(gc)], ['حسب المعلم', flat(gt)]]);
    });
  }

  // ---------- الخطة اليومية للفصول ----------
  const DTYPES = [['taught', 'ما دُرِّس فعلاً', 'الحصص المؤكَّد تنفيذها فقط (أخضر وأخضر فاتح)'], ['plan', 'خطة اليوم كاملة', 'كل الحصص المخطَّطة دون اشتراط التأكيد'], ['hw', 'الواجبات فقط', 'تذكير بواجبات اليوم للطلاب وأولياء الأمور']];
  function repDaily(F, O) {
    const w0 = A.week(); const days = A.section().days;
    const today = (() => { if (!w0) return 0; const d = Math.round((A.parseDate(A.isoDate(new Date())) - A.parseDate(w0.start_date)) / 864e5); return d >= 0 && d < days ? d : 0; })();
    F.innerHTML = `<div class="grid g3">
      <div class="field"><label for="dW">الأسبوع</label><select class="in" id="dW">${S.weeks.map(w => `<option value="${w.id}" ${w.id === S.weekId ? 'selected' : ''}>الأسبوع ${esc(w.word)}${w.archived ? ' (أرشيف)' : ''}</option>`).join('')}</select></div>
      <div class="field"><label for="dD">اليوم</label><select class="in" id="dD">${DAYS.slice(0, days).map((d, i) => `<option value="${i}" ${i === today ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
      <div class="field"><label>نوع التصدير</label><div class="ui-opt" id="dT">${DTYPES.map(([k, l, d], i) => `<button type="button" data-v="${k}" class="${i ? '' : 'on'}" title="${d}">${l}</button>`).join('')}</div></div></div>
      <div class="field"><label>الفصول <button type="button" class="btn ghost sm" id="dAll">الكل</button></label><div class="perm-grid" id="dC">${S.classes.filter(c => c.active).map(c => `<label class="chk"><input type="checkbox" value="${c.id}" checked> ${esc(c.name)}</label>`).join('')}</div></div>
      <label class="chk" style="margin-bottom:10px"><input type="checkbox" id="dSt" checked> إظهار حالة التنفيذ في خطة اليوم</label>
      <button class="btn" id="rGo">عرض الخطة اليومية</button>`;
    let type = 'taught';
    $$('#dT button', F).forEach(b => b.onclick = () => { type = b.dataset.v; $$('#dT button', F).forEach(x => x.classList.toggle('on', x === b)); });
    $('#dAll', F).onclick = () => { const ins = $$('#dC input', F); const on = ins.some(i => !i.checked); ins.forEach(i => i.checked = on); };
    $('#rGo', F).onclick = e => A.run(e.currentTarget, async () => {
      const w = S.weeks.find(x => x.id === $('#dW', F).value); const day = +$('#dD', F).value; const showSt = $('#dSt', F).checked;
      const cids = $$('#dC input:checked', F).map(i => i.value); if (!cids.length) throw new Error('اختر فصلاً واحداً على الأقل');
      const all = w.id === S.weekId ? S.entries : await load([w]);
      const date = A.weekDates(w)[day]; const hol = (w.holidays || []).find(h => h.day === day);
      const pick = x => x.day === day && x.subject_id && cids.includes(x.class_id) && (type === 'taught' ? ['done', 'modified'].includes(x.exec_status) : type === 'hw' ? !!x.homework : A.required(x) || x.topic);
      const byC = S.classes.filter(c => cids.includes(c.id)).map(c => ({ c, rows: all.filter(x => x.class_id === c.id && pick(x)).sort((a, b) => a.period - b.period) }));
      const tLabel = DTYPES.find(t => t[0] === type)[1];
      const head = type === 'hw' ? ['الحصة', 'المادة', 'الواجب'] : ['الحصة', 'المادة', 'الموضوع / الدرس', 'الواجب', ...(type === 'taught' ? ['ملاحظة التنفيذ'] : showSt ? ['التنفيذ'] : [])];
      const cells = x => type === 'hw' ? [PER[x.period], A.subjName(x.subject_id), x.homework] : [PER[x.period], A.subjName(x.subject_id), x.topic || '—', x.homework || '—', ...(type === 'taught' ? [x.exec_status === 'modified' ? (x.exec_note || 'عُدِّل ثم نُفِّذ') : 'نُفِّذ كما خُطِّط'] : showSt ? [A.EX ? A.EX[x.exec_status || 'pending'] : ''] : [])];
      const total = byC.reduce((n, g) => n + g.rows.length, 0);
      O.innerHTML = `${hol ? `<div class="notice info">${esc(hol.label || 'إجازة')} في هذا اليوم.</div>` : ''}
        <div class="row" style="margin:14px 0"><b>${tLabel} — ${DAYS[day]} ${AR(date)}</b><span class="small muted">${A.cnt(total, 'حصة', 'حصص')} في ${A.cnt(byC.filter(g => g.rows.length).length, 'فصل', 'فصول')}</span><span class="grow"></span>
          <button class="btn sky sm" id="rP">${I.export} طباعة / PDF</button><button class="btn ghost sm" id="rX">${I.down} Excel</button><button class="btn ghost sm" id="rT">نسخ نص للإرسال</button></div>
        ${byC.map(g => `<div class="card" style="margin-bottom:12px;padding:14px"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(g.c.name)}</h3><button class="btn ghost sm" data-txt="${g.c.id}">نسخ نص الفصل</button></div>
          ${g.rows.length ? `<div class="scroll"><table class="tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${g.rows.map(x => `<tr>${cells(x).map((v, i) => `<td${i > 1 ? ' style="text-align:start"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p class="small muted" style="margin:8px 0 0">${type === 'taught' ? 'لم يُؤكَّد تنفيذ أي حصة بعد.' : type === 'hw' ? 'لا واجبات اليوم.' : 'لا حصص.'}</p>`}</div>`).join('')}`;
      const txt = g => `${g.c.name} — ${DAYS[day]} ${date}\n${tLabel}\n` + (g.rows.length ? g.rows.map(x => type === 'hw' ? `• ${A.subjName(x.subject_id)}: ${x.homework}` : `• الحصة ${PER[x.period]} — ${A.subjName(x.subject_id)}: ${x.topic || '—'}${x.homework ? `\n   الواجب: ${x.homework}` : ''}`).join('\n') : (type === 'hw' ? 'لا واجبات اليوم.' : 'لا يوجد.'));
      const copy = async t => { await navigator.clipboard.writeText(t); A.toast('نُسخ النص — الصقه في واتساب أو البريد', 'ok'); };
      $$('[data-txt]', O).forEach(b => b.onclick = () => copy(txt(byC.find(g => g.c.id === b.dataset.txt))));
      $('#rT', O).onclick = () => copy(byC.filter(g => g.rows.length).map(txt).join('\n\n— — —\n\n'));
      $('#rX', O).onclick = () => xlsx(`${tLabel} - ${DAYS[day]} ${date}`, byC.filter(g => g.rows.length).map(g => [g.c.name, g.rows.map(x => Object.fromEntries(head.map((h, i) => [h, cells(x)[i]])))]));
      $('#rP', O).onclick = () => printDoc(`${tLabel} — ${DAYS[day]}`, `${A.section().name} · الأسبوع ${w.word} · ${date}`,
        byC.filter(g => g.rows.length).map((g, i) => `<div style="${i ? 'page-break-before:always;' : ''}"><h2 style="margin:0 0 8px;font-size:18px;border-inline-start:6px solid #3AB1DB;padding-inline-start:10px">${esc(g.c.name)}</h2><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${g.rows.map(x => `<tr>${cells(x).map((v, k) => `<td${k > 1 ? ' style="text-align:right"' : ''}>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`).join('') || '<p>لا توجد بيانات.</p>');
    });
  }

  // =====================================================================
  //  الأرشيف (للمالك فقط)
  // =====================================================================
  V.archive = function (root) {
    if (!S.me.is_owner) { root.innerHTML = ''; return; }
    const arch = S.weeks.filter(w => w.archived);
    root.innerHTML = `<div class="card"><h2>الأرشيف</h2><p class="sub">الأسابيع المؤرشفة لا يراها إلا أنت. تبقى قابلة للعرض والتصدير والتقارير، ويمكن إعادتها في أي وقت.</p>
      <div class="scroll"><table class="tbl"><thead><tr><th>الأسبوع</th><th>التواريخ</th><th>الحالة</th><th></th></tr></thead><tbody>${arch.sort((a, b) => b.number - a.number).map(w => `<tr><td><b>الأسبوع ${esc(w.word)}</b></td><td class="small">${AR(A.weekDates(w)[0])} : ${AR(A.weekDates(w)[4])}</td><td><span class="pill st-${w.status}">${A.WSTATUS[w.status]}</span></td><td class="row" style="flex-wrap:nowrap"><button class="btn ghost sm" data-open="${w.id}">${I.eye} فتح</button><button class="btn ghost sm" data-un="${w.id}">إعادة من الأرشيف</button></td></tr>`).join('') || `<tr><td colspan="4">${A.emptyBox('الأرشيف فارغ', 'أرشف الأسابيع المنتهية من صفحة «الأسابيع».')}</td></tr>`}</tbody></table></div></div>`;
    $$('[data-open]', root).forEach(b => b.onclick = async () => { S.weekId = b.dataset.open; A.LS.set('week_' + S.sectionId, S.weekId); await A.loadWeek(); A.shell(); location.hash = '#/classes'; A.route(); });
    $$('[data-un]', root).forEach(b => b.onclick = () => A.run(b, async () => { await api.updateWeek(b.dataset.un, { archived: false }); await A.loadSection(S.weekId); A.shell(); A.route(); }));
  };

  // =====================================================================
  //  استيراد الموظفين من Excel + هوية كل قسم (تُستدعى من الإدارة)
  // =====================================================================
  const COLS = ['الاسم', 'البريد', 'الجوال', 'التخصص', 'الرقم الوظيفي', 'القسم', 'الدور', 'إنشاء حساب'];
  V._staffImport = function (again) {
    const m = A.modal(`<h3>استيراد المعلمين من Excel</h3><p class="sub">نزّل القالب، املأه (سطر لكل معلم)، ثم ارفعه. من يُكتب له بريد و«إنشاء حساب = نعم» يحصل على كلمة مرور تلقائية تظهر لك في ملف للتسليم.</p>
      <div class="row" style="margin-bottom:12px"><button class="btn ghost" id="siT">${I.down} قالب الاستيراد</button></div>
      <label class="drop" id="siD"><input type="file" id="siF" accept=".xlsx,.xls,.csv" hidden><b>${I.up.replace('<svg', '<svg style="width:26px;height:26px"')}<br>اختر ملف Excel</b></label><div id="siR" style="margin-top:12px"></div>`, { cls: 'wide' });
    m.el.querySelector('#siT').onclick = () => xlsx('قالب استيراد المعلمين', [['المعلمون', [Object.fromEntries(COLS.map((c, i) => [c, ['أ. نورة القحطاني', 'n.qahtani@dinaschool.com', '05xxxxxxxx', 'اللغة العربية', '1234', A.section().name, 'معلم', 'نعم'][i]]))]]]);
    m.el.querySelector('#siF').onchange = async ev => {
      const f = ev.target.files[0]; if (!f) return;
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' }).map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [A.norm(k), A.norm(v)]))).filter(r => r['الاسم']);
      const secOf = n => S.sections.find(s => A.normKey(s.name) === A.normKey(n) || A.normKey(s.short_name) === A.normKey(n)) || A.section();
      const roleOf = r => /مشرف/.test(r) ? 'supervisor' : /مدير/.test(r) ? 'admin' : 'teacher';
      const R = m.el.querySelector('#siR');
      R.innerHTML = `<div class="notice info">قُرئ ${A.cnt(rows.length, 'سطر', 'أسطر')}.</div><div class="scroll" style="max-height:40vh"><table class="tbl"><thead><tr>${COLS.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${COLS.map(c => `<td class="small">${esc(c === 'القسم' ? secOf(r[c]).name : c === 'الدور' ? ROLES[roleOf(r[c])] : r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></div><div class="acts"><button class="btn" id="siGo">استيراد</button></div><div class="small muted" id="siP"></div>`;
      R.querySelector('#siGo').onclick = e2 => A.run(e2.currentTarget, async () => {
        const creds = [], errs = [];
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i]; R.querySelector('#siP').textContent = `${AR(i + 1)} / ${AR(rows.length)} — ${r['الاسم']}`;
          try {
            const em = (r['البريد'] || '').toLowerCase();
            let p = S.staff.find(x => A.normKey(x.full_name) === A.normKey(r['الاسم']) || (em && (x.email || '') === em));
            const extra = { phone: r['الجوال'] || null, specialty: r['التخصص'] || null, employee_no: r['الرقم الوظيفي'] || null };
            if (!p) p = await api.addStaff({ school_id: S.school.id, full_name: r['الاسم'], email: em || null, ...extra });
            else await api.updateStaff(p.id, extra).catch(() => { });
            if (em && !p.user_id && /نعم|yes|1/i.test(r['إنشاء حساب'] || 'نعم')) { const pw = A.genPass(); await api.setLogin(p.id, em, pw); creds.push([r['الاسم'], em, pw]); }
            const sec = secOf(r['القسم']); const role = roleOf(r['الدور']);
            if (!S.memberships.some(x => x.staff_id === p.id && x.section_id === sec.id)) await api.upsertMembership({ staff_id: p.id, section_id: sec.id, role, ...(A.ROLE_DEFAULTS[role] || {}) });
          } catch (er) { errs.push(`${r['الاسم']}: ${apiMsg(er)}`); }
        }
        await A.refreshPeople(); m.close(); again();
        if (errs.length) A.toast('تعذّر: ' + errs.slice(0, 3).join(' | '), 'err');
        if (creds.length) xlsx('بيانات دخول المعلمين', [['الحسابات', creds.map(([n, e, p]) => ({ الاسم: n, البريد: e, 'كلمة المرور': p, 'رابط المنصة': location.href.split('#')[0].split('?')[0] }))]]);
        A.toast(`استُورد ${A.cnt(rows.length - errs.length, 'معلم', 'معلمين')}${creds.length ? ' ونُزّل ملف كلمات المرور' : ''}`, 'ok');
      });
    };
  };
  V._sectionLook = function (box) {
    if (!S.me.is_owner) return;
    const st = S.school.settings || {}; const imgs = st.cover_images || {};
    box.insertAdjacentHTML('beforeend', `<h3 style="margin-top:24px">هوية تصميم كل قسم</h3><p class="sub">ألوان الملفات المصدَّرة لكل قسم (الكحلي ثابت والمساند يتغير)، وصورة اختيارية تظهر على غلاف الخطة.</p>
      <table class="tbl"><thead><tr><th>القسم</th><th>الهوية</th><th>صورة الغلاف</th></tr></thead><tbody>${S.sections.map(s => `<tr><td><b>${esc(s.name)}</b></td><td><select class="in" data-theme="${s.id}" style="max-width:200px">${[['dina', 'دينا — سماوي'], ['lavender', 'دينا — بنفسجي'], ['green', 'دينا — أخضر']].map(([k, l]) => `<option value="${k}" ${s.theme === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td><td><div class="row">${imgs[s.id] ? `<img src="${esc(imgs[s.id])}" alt="" style="height:44px;border-radius:8px">` : ''}<label class="btn ghost sm">${I.up} ${imgs[s.id] ? 'تغيير' : 'رفع صورة'}<input type="file" accept="image/*" data-img="${s.id}" hidden></label>${imgs[s.id] ? `<button class="btn bad sm" data-rmimg="${s.id}">إزالة</button>` : ''}</div></td></tr>`).join('')}</tbody></table>`);
    $$('[data-theme]', box).forEach(sel => sel.onchange = () => A.run(null, async () => { const r = await api.updateSection(sel.dataset.theme, { theme: sel.value }); Object.assign(S.sections.find(s => s.id === sel.dataset.theme), r); A.toast('حُفظت هوية القسم', 'ok'); }));
    const saveImgs = async next => { S.school = await api.updateSchool(S.school.id, { settings: { ...(S.school.settings || {}), cover_images: next } }); V.admin(box.closest('main')); };
    $$('[data-img]', box).forEach(inp => inp.onchange = () => A.run(null, async () => { const f = inp.files[0]; if (!f) return; if (f.size > 3e6) throw new Error('الصورة أكبر من ٣ ميجابايت'); const url = await api.uploadAsset(f); await saveImgs({ ...imgs, [inp.dataset.img]: url }); A.toast('رُفعت الصورة', 'ok'); }));
    $$('[data-rmimg]', box).forEach(b => b.onclick = () => A.run(b, async () => { const n = { ...imgs }; delete n[b.dataset.rmimg]; await saveImgs(n); }));
  };
})();
