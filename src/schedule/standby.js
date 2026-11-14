/* منصة دينا — حصص الانتظار وتأمين الحصص (استوديو الجداول ← «حصص الانتظار وتأمين الحصص»)
   (١) جدول الانتظار الأسبوعي: توزيع عادل آلي (منتظر ١، منتظر ٢…) على من نصابه أقل من الحد، في حصص فراغه فقط، مع حد يومي.
   (٢) تأمين حصص اليوم: تحديد الغائبين ← تُسند حصصهم تلقائياً للمنتظرين ثم للأقل تغطية، مع تعديل يدوي وحفظ وطباعة. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, DAYS, PER, I } = A;
  const today = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const pn = id => A.personName(id) || '—';
  const cName = id => (A.cls(id) || {}).name || '';
  let CACHE = null;
  async function load() {
    const vers = await api.list('timetable_versions', { status: 'approved' });
    const slots = vers.length ? await api.list('timetable_slots', { version_id: vers.map(v => v.id) }) : [];
    const cur = vers.find(v => v.section_id === S.sectionId);
    const load = {}; slots.forEach(x => { if (x.teacher_id && x.subject_id) load[x.teacher_id] = (load[x.teacher_id] || 0) + 1; });
    const busy = new Set(slots.filter(x => x.teacher_id && x.subject_id).map(x => x.teacher_id + '|' + x.day + '|' + x.period));
    const mine = cur ? slots.filter(x => x.version_id === cur.id) : [];
    const T = [...new Set(mine.filter(x => x.teacher_id).map(x => x.teacher_id))].sort((a, b) => pn(a).localeCompare(pn(b), 'ar'));
    CACHE = { vers, slots, cur, load, busy, mine, T }; return CACHE;
  }
  const cfgOf = sec => Object.assign({ max: 24, per: 2, perDay: 2, excl: [], roster: {} }, sec.standby || {});

  function generate(C, cfg, sec) {
    const days = Array.from({ length: sec.days || 5 }, (_, i) => i), P = sec.periods || 7;
    const elig = C.T.filter(t => !cfg.excl.includes(t) && (C.load[t] || 0) < cfg.max);
    const cap = t => cfg.max - (C.load[t] || 0), cnt = {}, dayCnt = {}, R = {};
    const order = []; for (let k = 0; k < cfg.per; k++) for (const d of days) for (let p = 0; p < P; p++) order.push({ d, p, k });
    const miss = [];
    order.forEach(({ d, p, k }) => { const key = d + '|' + p; R[key] = R[key] || [];
      const c = elig.filter(t => !C.busy.has(t + '|' + d + '|' + p) && !R[key].includes(t) && (cnt[t] || 0) < cap(t) && (dayCnt[t + '|' + d] || 0) < cfg.perDay)
        .sort((a, b) => ((cnt[a] || 0) / cap(a)) - ((cnt[b] || 0) / cap(b)) || (C.load[a] || 0) - (C.load[b] || 0) || (dayCnt[a + '|' + d] || 0) - (dayCnt[b + '|' + d] || 0));
      if (!c.length) { miss.push({ d, p, k }); return; }
      const t = c[0]; R[key][k] = t; cnt[t] = (cnt[t] || 0) + 1; dayCnt[t + '|' + d] = (dayCnt[t + '|' + d] || 0) + 1; });
    return { roster: R, miss, elig };
  }

  V.standby = async function (root) {
    if (!S.me.is_owner) { root.innerHTML = `<div class="card">${A.emptyBox('لحساب المالك')}</div>`; return; }
    root.innerHTML = '<div class="card"><div class="spinner"></div></div>';
    const sec = A.section(); let C; try { C = await load(); } catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', esc(e.message))}</div>`; return; }
    if (!C.cur) { root.innerHTML = `<div class="card">${A.emptyBox('لا يوجد جدول معتمد لهذا القسم')}</div>`; return; }
    let tab = A.LS.get('sb_t') || 'roster';
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">حصص الانتظار وتأمين الحصص — ${esc(sec.name)}</h2><p class="sub" style="margin:2px 0 0">يُحسب النصاب من كل الجداول المعتمدة (كل الأقسام)، وتُختار حصص الفراغ فقط فلا تعارض.</p></div></div>
      <div class="kpick" id="sbT"><button data-t="roster">جدول الانتظار الأسبوعي</button><button data-t="cover">تأمين حصص اليوم</button><button data-t="stats">تقرير العدالة</button></div><div id="sbB" style="margin-top:10px"></div></div>`;
    $$('#sbT button', root).forEach(b => { b.classList.toggle('on', b.dataset.t === tab); b.onclick = () => { A.LS.set('sb_t', b.dataset.t); V.standby(root); }; });
    const B = $('#sbB', root);
    ({ roster, cover, stats })[tab](B, C, sec, root);
  };

  // ---------- جدول الانتظار الأسبوعي ----------
  function roster(B, C, sec, root) {
    const cfg = cfgOf(sec), days = Array.from({ length: sec.days || 5 }, (_, i) => i), P = sec.periods || 7;
    const saveCfg = async () => { const r = await api.updateSection(sec.id, { standby: cfg }); Object.assign(sec, r); };
    const cnt = {}; Object.values(cfg.roster).forEach(l => (l || []).forEach(t => { if (t) cnt[t] = (cnt[t] || 0) + 1; }));
    const elig = C.T.filter(t => !cfg.excl.includes(t) && (C.load[t] || 0) < cfg.max);
    B.innerHTML = `<div class="grid g3"><div class="field"><label for="sbM">من نصابه أقل من</label><input class="in" type="number" id="sbM" min="1" max="40" value="${cfg.max}"></div><div class="field"><label for="sbP">عدد المنتظرين في كل حصة</label><input class="in" type="number" id="sbP" min="1" max="6" value="${cfg.per}"></div><div class="field"><label for="sbD">أقصى انتظار للمعلم في اليوم</label><input class="in" type="number" id="sbD" min="1" max="6" value="${cfg.perDay}"></div></div>
      <details class="dz-det"><summary>المعلمون المؤهلون (${AR(elig.length)} من ${AR(C.T.length)}) — يمكنك استثناء أي معلم</summary><div class="perm-grid" style="margin-top:6px">${C.T.map(t => `<label class="chk ${(C.load[t] || 0) >= cfg.max ? 'faint' : ''}"><input type="checkbox" data-ex="${t}" ${cfg.excl.includes(t) ? '' : 'checked'} ${(C.load[t] || 0) >= cfg.max ? 'disabled' : ''}> ${esc(pn(t))} <span class="small muted">· نصابه ${AR(C.load[t] || 0)}</span></label>`).join('')}</div></details>
      <div class="row" style="gap:6px;margin:10px 0;flex-wrap:wrap"><button class="btn" id="sbGen">${Object.keys(cfg.roster).length ? 'إعادة التوزيع العادل' : 'توزيع عادل تلقائي'}</button><button class="btn ghost" id="sbPr">${I.print || ''} طباعة الأسبوعي</button><button class="btn ghost" id="sbPd">${I.print || ''} طباعة جدول يوم</button><select class="in" id="sbPdD" style="width:auto">${days.map(d => `<option value="${d}">${DAYS[d]}</option>`).join('')}</select><button class="btn ghost" id="sbX">Excel</button>${cfg.gen ? `<span class="small muted">آخر توزيع: ${A.fmtDT(cfg.gen)}</span>` : ''}</div>
      <div class="scroll"><table class="tbl sb-g"><thead><tr><th>اليوم</th>${Array.from({ length: P }, (_, p) => `<th>${PER[p] || AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${days.map(d => `<tr><th>${DAYS[d]}</th>${Array.from({ length: P }, (_, p) => { const l = cfg.roster[d + '|' + p] || []; return `<td>${Array.from({ length: cfg.per }, (_, k) => `<select class="in sb-s" data-k="${d}|${p}|${k}" aria-label="منتظر ${AR(k + 1)} — ${DAYS[d]} الحصة ${AR(p + 1)}"><option value="">منتظر ${AR(k + 1)} —</option>${elig.filter(t => !C.busy.has(t + '|' + d + '|' + p) || t === l[k]).map(t => `<option value="${t}" ${t === l[k] ? 'selected' : ''}>${esc(pn(t))}</option>`).join('')}</select>`).join('')}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="small muted">القائمة في كل خانة لا تعرض إلا المعلمين الذين لديهم فراغ في تلك الحصة. يُطبَّق التعديل اليدوي ويُحفظ فوراً.</p>`;
    const num = (id, k, lo, hi) => $(id, B).onchange = e => { cfg[k] = Math.max(lo, Math.min(hi, +e.target.value || cfg[k])); saveCfg().then(() => roster(B, C, sec, root)); };
    num('#sbM', 'max', 1, 40); num('#sbP', 'per', 1, 6); num('#sbD', 'perDay', 1, 6);
    $$('[data-ex]', B).forEach(c => c.onchange = () => { const t = c.dataset.ex; cfg.excl = cfg.excl.filter(x => x !== t); if (!c.checked) cfg.excl.push(t); saveCfg(); });
    $$('[data-k]', B).forEach(s => s.onchange = () => { const [d, p, k] = s.dataset.k.split('|'); const key = d + '|' + p; cfg.roster[key] = cfg.roster[key] || []; cfg.roster[key][+k] = s.value || null; saveCfg().then(() => A.toast('حُفظ', 'ok')); });
    $('#sbGen', B).onclick = e => A.run(e.currentTarget, async () => { if (Object.keys(cfg.roster).length && !(await A.confirmBox('إعادة توزيع جدول الانتظار بالكامل؟ التعديلات اليدوية الحالية تُستبدل.', 'توزيع'))) return; const r = generate(C, cfg, sec); cfg.roster = r.roster; cfg.gen = new Date().toISOString(); await saveCfg(); A.toast(r.miss.length ? `وُزّع الجدول · ${AR(r.miss.length)} خانة بلا منتظر متاح` : 'وُزّع جدول الانتظار بعدالة ✓', r.miss.length ? 'warn' : 'ok'); roster(B, C, sec, root); });
    const tbl = dl => `<table><tr><th>اليوم</th>${Array.from({ length: P }, (_, p) => `<th>${AR(p + 1)}</th>`).join('')}</tr>${dl.map(d => `<tr><td><b>${DAYS[d]}</b></td>${Array.from({ length: P }, (_, p) => `<td>${(cfg.roster[d + '|' + p] || []).map((t, k) => t ? `<div><small>منتظر ${AR(k + 1)}:</small> ${esc(pn(t))}</div>` : '').join('') || '—'}</td>`).join('')}</tr>`).join('')}</table>`;
    $('#sbPr', B).onclick = () => A.printDoc('جدول حصص الانتظار', sec.name, tbl(days), true);
    $('#sbPd', B).onclick = () => { const d = +$('#sbPdD', B).value; A.printDoc(`جدول المنتظرين — يوم ${DAYS[d]}`, sec.name, `<table><tr><th>الحصة</th>${Array.from({ length: cfg.per }, (_, k) => `<th>منتظر ${AR(k + 1)}</th>`).join('')}</tr>${Array.from({ length: P }, (_, p) => `<tr><td><b>${PER[p] || AR(p + 1)}</b></td>${Array.from({ length: cfg.per }, (_, k) => `<td>${esc(pn((cfg.roster[d + '|' + p] || [])[k]))}</td>`).join('')}</tr>`).join('')}</table>`, false); };
    $('#sbX', B).onclick = () => { const rows = []; days.forEach(d => { for (let p = 0; p < P; p++) { const o = { 'اليوم': DAYS[d], 'الحصة': p + 1 }; for (let k = 0; k < cfg.per; k++) o['منتظر ' + (k + 1)] = (cfg.roster[d + '|' + p] || [])[k] ? pn(cfg.roster[d + '|' + p][k]) : ''; rows.push(o); } }); const ws = XLSX.utils.json_to_sheet(rows); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الانتظار'); XLSX.writeFile(wb, 'جدول الانتظار - ' + sec.name + '.xlsx'); };
  }

  // ---------- تأمين حصص اليوم ----------
  async function cover(B, C, sec, root) {
    const cfg = cfgOf(sec); let day = A.LS.get('sb_day') || today(); let abs = new Set((A.LS.get('sb_abs_' + day) || '').split(',').filter(Boolean));
    const draw = async () => {
      const d = A.parseDate(day).getDay(), P = sec.periods || 7;
      const [ex, hist] = await Promise.all([api.list('substitutions', { section_id: sec.id, day }).catch(() => []), api.list('substitutions', { section_id: sec.id }, { select: 'sub_teacher,day', gte: { day: (() => { const x = A.parseDate(day); x.setDate(x.getDate() - 30); return A.isoDate(x); })() } }).catch(() => [])]);
      ex.forEach(x => { if (x.absent_teacher) abs.add(x.absent_teacher); });
      const hrA = await api.list('staff_att', { school_id: S.school.id, day }).catch(() => []); const hrAbs = hrA.filter(x => ['absent', 'leave'].includes(x.status) && C.T.includes(x.staff_id)); hrAbs.forEach(x => abs.add(x.staff_id));
      const covN = {}; hist.forEach(x => { if (x.sub_teacher) covN[x.sub_teacher] = (covN[x.sub_teacher] || 0) + 1; });
      const needs = C.mine.filter(x => x.day === d && x.subject_id && x.teacher_id && abs.has(x.teacher_id)).sort((a, b) => a.period - b.period || cName(a.class_id).localeCompare(cName(b.class_id), 'ar'));
      const taken = {}; const pickFor = x => { const e = ex.find(y => y.class_id === x.class_id && y.period === x.period); if (e) return e.sub_teacher; const k = d + '|' + x.period, used = taken[x.period] = taken[x.period] || new Set();
        const free = t => t && !abs.has(t) && !C.busy.has(t + '|' + d + '|' + x.period) && !used.has(t);
        const sb = (cfg.roster[k] || []).find(free); if (sb) { used.add(sb); return sb; }
        const alt = C.T.filter(t => free(t) && !cfg.excl.includes(t)).sort((a, b) => (covN[a] || 0) - (covN[b] || 0) || (C.load[a] || 0) - (C.load[b] || 0))[0]; if (alt) used.add(alt); return alt || ''; };
      const rows = needs.map(x => ({ x, sub: pickFor(x), saved: ex.some(y => y.class_id === x.class_id && y.period === x.period) }));
      B.innerHTML = `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:end"><div class="field" style="margin:0"><label for="cvD">اليوم</label><input class="in" type="date" id="cvD" value="${day}"></div><span class="small muted">${DAYS[d] || ''}</span></div>
        ${hrAbs.length ? `<div class="notice info" style="display:block;margin-top:8px">حُدِّد ${A.cnt(hrAbs.length, 'غائب', 'غائبين')} تلقائياً من رصد الموارد البشرية، واقتُرح لكل حصة بديل — راجع ثم اعتمد.</div>` : ''}
        <div class="field" style="margin-top:8px"><label>المعلمون الغائبون</label><div class="sb-abs">${C.T.map(t => `<label class="chk ${abs.has(t) ? 'on' : ''}"><input type="checkbox" data-ab="${t}" ${abs.has(t) ? 'checked' : ''}> ${esc(pn(t))}</label>`).join('')}</div></div>
        ${rows.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>الحصة</th><th>الفصل</th><th>المادة</th><th>الغائب</th><th>البديل</th><th></th></tr></thead><tbody>${rows.map((r, i) => { const k = d + '|' + r.x.period, sb = cfg.roster[k] || []; const opts = C.T.filter(t => !abs.has(t) && (!C.busy.has(t + '|' + d + '|' + r.x.period) || t === r.sub));
          return `<tr><td>${PER[r.x.period] || AR(r.x.period + 1)}</td><td><b>${esc(cName(r.x.class_id))}</b></td><td>${esc(A.subjName(r.x.subject_id))}</td><td class="small">${esc(pn(r.x.teacher_id))}</td><td><select class="in" data-sub="${i}"><option value="">— بلا بديل —</option>${opts.map(t => `<option value="${t}" ${t === r.sub ? 'selected' : ''}>${esc(pn(t))}${sb.includes(t) ? ` (منتظر ${AR(sb.indexOf(t) + 1)})` : ''} · غطّى ${AR(covN[t] || 0)}</option>`).join('')}</select></td><td>${r.saved ? '<span class="pill st-approved">محفوظ</span>' : '<span class="pill st-submitted">مقترح</span>'}</td></tr>`; }).join('')}</tbody></table></div>
          <div class="acts" style="flex-wrap:wrap"><button class="btn ok" id="cvSv">${I.check} اعتماد التأمين</button><button class="btn ghost" id="cvPr">${I.print || ''} طباعة تأمين اليوم</button></div>` : `<p class="small muted" style="margin-top:8px">${abs.size ? 'لا حصص للغائبين في هذا اليوم.' : 'حدد المعلمين الغائبين لتظهر حصصهم والبديل المقترح لكل حصة.'}</p>`}`;
      $('#cvD', B).onchange = e => { day = e.target.value; A.LS.set('sb_day', day); abs = new Set((A.LS.get('sb_abs_' + day) || '').split(',').filter(Boolean)); draw(); };
      $$('[data-ab]', B).forEach(c => c.onchange = () => { c.checked ? abs.add(c.dataset.ab) : abs.delete(c.dataset.ab); A.LS.set('sb_abs_' + day, [...abs].join(',')); draw(); });
      $$('[data-sub]', B).forEach(s => s.onchange = () => { rows[+s.dataset.sub].sub = s.value; });
      const sv = $('#cvSv', B); if (sv) sv.onclick = e => A.run(e.currentTarget, async () => {
        const cl = rows.filter(r => r.sub).map(r => ({ school_id: S.school.id, section_id: sec.id, day, period: r.x.period, class_id: r.x.class_id, absent_teacher: r.x.teacher_id, sub_teacher: r.sub, subject_id: r.x.subject_id, kind: (cfg.roster[d + '|' + r.x.period] || []).includes(r.sub) ? 'standby' : 'auto' }));
        if (cl.length) await api.ups('substitutions', cl, 'day,class_id,period');
        A.toast(`حُفظ تأمين ${AR(cl.length)} حصة${rows.length - cl.length ? ` · ${AR(rows.length - cl.length)} بلا بديل` : ''}`, rows.length - cl.length ? 'warn' : 'ok'); draw(); });
      const pr = $('#cvPr', B); if (pr) pr.onclick = () => A.printDoc(`تأمين حصص يوم ${DAYS[d]}`, `${AR(A.dmy(A.parseDate(day)))} · ${sec.name}`, `<table><tr><th>الحصة</th><th>الفصل</th><th>المادة</th><th>المعلم الغائب</th><th>البديل</th><th>توقيع البديل</th></tr>${rows.map(r => `<tr><td>${AR(r.x.period + 1)}</td><td>${esc(cName(r.x.class_id))}</td><td>${esc(A.subjName(r.x.subject_id))}</td><td>${esc(pn(r.x.teacher_id))}</td><td><b>${esc(r.sub ? pn(r.sub) : '—')}</b></td><td></td></tr>`).join('')}</table>
        <h3>المنتظرون اليوم</h3><table><tr><th>الحصة</th>${Array.from({ length: cfg.per }, (_, k) => `<th>منتظر ${AR(k + 1)}</th>`).join('')}</tr>${Array.from({ length: P }, (_, p) => `<tr><td>${AR(p + 1)}</td>${Array.from({ length: cfg.per }, (_, k) => `<td>${esc(pn((cfg.roster[d + '|' + p] || [])[k]))}</td>`).join('')}</tr>`).join('')}</table>`, false);
    };
    await draw();
  }

  // ---------- تقرير العدالة ----------
  async function stats(B, C, sec) {
    const cfg = cfgOf(sec); const sbN = {}; Object.values(cfg.roster).forEach(l => (l || []).forEach(t => { if (t) sbN[t] = (sbN[t] || 0) + 1; }));
    const hist = await api.list('substitutions', { section_id: sec.id }, { select: 'sub_teacher,absent_teacher' }).catch(() => []);
    const cov = {}, ab = {}; hist.forEach(x => { if (x.sub_teacher) cov[x.sub_teacher] = (cov[x.sub_teacher] || 0) + 1; if (x.absent_teacher) ab[x.absent_teacher] = (ab[x.absent_teacher] || 0) + 1; });
    const R = C.T.map(t => ({ t, load: C.load[t] || 0, sb: sbN[t] || 0, cov: cov[t] || 0, ab: ab[t] || 0 })).sort((a, b) => (b.load + b.sb) - (a.load + a.sb));
    const tbl = pr => `<table class="${pr ? '' : 'tbl'}"><thead><tr><th>المعلم</th><th>النصاب</th><th>الانتظار الأسبوعي</th><th>النصاب + الانتظار</th><th>حصص غطّاها</th><th>حصص غاب عنها</th></tr></thead><tbody>${R.map(r => `<tr><td><b>${esc(pn(r.t))}</b>${cfg.excl.includes(r.t) ? ' <small>(مستثنى)</small>' : ''}</td><td>${AR(r.load)}</td><td>${AR(r.sb)}</td><td><b style="color:${r.load + r.sb > cfg.max ? '#C53030' : 'inherit'}">${AR(r.load + r.sb)}</b></td><td>${AR(r.cov)}</td><td>${AR(r.ab)}</td></tr>`).join('')}</tbody></table>`;
    B.innerHTML = `<div class="row" style="gap:6px;margin-bottom:8px"><button class="btn ghost sm" id="stP">${I.print || ''} طباعة</button></div><div class="scroll">${tbl()}</div><p class="small muted">الحد: ${AR(cfg.max)} حصة. «حصص غطّاها» و«غاب عنها» من سجل التأمين المحفوظ.</p>`;
    $('#stP', B).onclick = () => A.printDoc('تقرير عدالة الانتظار والتأمين', sec.name, tbl(true), true);
  }
})();
