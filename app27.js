/* منصة دينا — «جدول استثنائي للعرض» (مثل التعليم عن بعد لأسبوع)
   لقطة ثابتة من أي جدول (مسودة أو معتمد) لفترة محددة، للعرض فقط: لا تمس الخطط ولا الجدول المعتمد ولا الأسابيع.
   روابط الحصص الافتراضية: رابط لكل فصل (الافتراضي)، ويمكن رابط لكل معلم أو لحصة بعينها. بعد النشر يظهر لأولياء الأمور جدولاً تفاعلياً بزر «دخول الحصة»، وللمعلم في «خطتي». */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, DAYS, PER, I } = A;
  const iso = d => A.isoDate(d), addD = (s, n) => { const d = A.parseDate(s); d.setDate(d.getDate() + n); return iso(d); };
  const today = () => iso(new Date());
  const weekStartOf = s => { const d = A.parseDate(s); d.setDate(d.getDate() - d.getDay()); return iso(d); }; // الأحد
  const dAR = s => AR(A.dmy(A.parseDate(s)));
  const allCls = () => (S.allClasses && S.allClasses.length ? S.allClasses : S.classes) || [];
  const cName = id => (allCls().find(c => c.id === id) || A.cls(id) || {}).name || '';
  const urlOk = u => /^https?:\/\/\S+$/i.test((u || '').trim());
  const hhmm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const can = () => S.me.is_owner || A.perm('timetable_approve');
  const curWeek = () => { const t = today(), w = (S.weeks || []).find(x => !x.archived && x.start_date <= t && addD(x.start_date, 6) >= t); const s = w ? w.start_date : weekStartOf(t); return [s, addD(s, ((A.section() || {}).days || 5) - 1)]; };

  // توقيت من «اليوم الدراسي والجدول الزمني»
  // تثبيت معرّفات الجداول الزمنية (إن لم تُحفظ إعدادات القسم بعد) حتى يبقى الربط صحيحاً
  const ensureBell = async () => { const sec = A.section(); if (sec && !(sec.bell && Array.isArray(sec.bell.schedules) && sec.bell.schedules.length)) { const b = A.bell.bellOf(sec); b.schedules.forEach(x => { x.show = false; }); const r = await api.updateSection(sec.id, { bell: b }); Object.assign(sec, r); } };
  function metaFrom(schedId) {
    const sec = A.section(), b = A.bell.bellOf(sec), s = b.schedules.find(x => x.id === schedId) || A.bell.activeSched(b);
    const P = A.bell.maxP(s, sec), tl = A.bell.timeline(s, P, null);
    return { linked: true, sched: s.id, schedName: s.name, days: A.bell.actDays(s, sec), periods: P, perDay: Object.fromEntries(A.bell.actDays(s, sec).map(d => [d, A.bell.schedP(s, sec, d)])), times: tl.items.filter(x => x.k === 'p').map(x => [hhmm(x.from), hhmm(x.to)]), breaks: tl.items.filter(x => x.k === 'b').map((x, i, a) => ({ after: tl.items.slice(0, tl.items.indexOf(x)).filter(y => y.k === 'p').length, label: x.label, from: hhmm(x.from), to: hhmm(x.to) })) };
  }

  // توقيت خاص بالجدول الاستثنائي (غير مرتبط بأداة التوقيت)
  function metaCustom(cs) {
    const sec = A.section(), nd = Math.max(5, sec.days || 5), days = (cs.days && cs.days.length ? cs.days : Array.from({ length: sec.days || 5 }, (_, i) => i)).filter(d => d < nd).sort();
    const P = Math.max(1, Math.min(10, +cs.np || 6));
    const ps = { start: cs.start || '08:00', dur: +cs.dur || 40, pass: +cs.pass || 0, perDur: cs.perDur || {}, breaks: (cs.breaks || []).map(b => ({ ...b, classes: [] })) };
    const tl = A.bell.timeline(ps, P, null);
    return { linked: false, custom: cs, sched: null, schedName: 'توقيت خاص بهذا الجدول', days, periods: P, perDay: Object.fromEntries(days.map(d => [d, Math.min(P, +(cs.perDay || {})[d] || P)])), times: tl.items.filter(x => x.k === 'p').map(x => [hhmm(x.from), hhmm(x.to)]), breaks: tl.items.filter(x => x.k === 'b').map(x => ({ after: tl.items.slice(0, tl.items.indexOf(x)).filter(y => y.k === 'p').length, label: x.label, from: hhmm(x.from), to: hhmm(x.to) })) };
  }
  const toMin = t => { const [h, m] = String(t || '0:0').split(':').map(Number); return h * 60 + m; };
  const customFrom = M => { if (M.custom) return JSON.parse(JSON.stringify(M.custom)); const t = M.times || []; const d0 = t[0] ? toMin(t[0][1]) - toMin(t[0][0]) : 40; return { start: (t[0] || ['08:00'])[0], dur: d0, pass: t[1] && !(M.breaks || []).some(b => b.after === 1) ? Math.max(0, toMin(t[1][0]) - toMin(t[0][1])) : 0, np: M.periods || 6, days: M.days || [0, 1, 2, 3, 4], perDay: M.perDay || {}, perDur: {}, breaks: (M.breaks || []).map(b => ({ after: b.after, dur: toMin(b.to) - toMin(b.from), label: b.label })) }; };
  // عند تعديل «اليوم الدراسي والجدول الزمني»: تُحدَّث الجداول الاستثنائية المرتبطة تلقائياً
  A._syncLiveTimes = async () => { try { const l = await api.list('display_schedules', { section_id: S.sectionId }); for (const d of l) { const M = d.meta || {}; if (M.linked === false || !M.sched) continue; const n = metaFrom(M.sched); if (n.sched !== M.sched) continue; if (JSON.stringify(n) !== JSON.stringify(M)) await api.upd('display_schedules', d.id, { meta: n }); } } catch (_) {} };

  V.live = async function (root) {
    if (!can()) { root.innerHTML = `<div class="card">${A.emptyBox('لصاحب صلاحية اعتماد الجدول')}</div>`; return; }
    root.innerHTML = '<div class="card"><div class="spinner"></div></div>';
    const list = (await api.list('display_schedules', { section_id: S.sectionId })).sort((a, b) => String(b.date_from).localeCompare(String(a.date_from)));
    const st = s => !s.published ? ['مسودة', 'st-draft'] : s.date_to < today() ? ['منتهٍ', 'st-empty'] : s.date_from <= today() ? ['منشور · سارٍ الآن', 'st-approved'] : ['منشور · قادم', 'st-submitted'];
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">جدول استثنائي للعرض</h2><p class="sub" style="margin:2px 0 0">مثل جدول التعليم عن بعد لأسبوع: يُعرض للمعلمين وأولياء الأمور مع روابط الحصص الافتراضية، <b>دون أن يمس الخطط أو الجدول المعتمد</b>. ينتهي ظهوره تلقائياً بعد آخر يوم.</p></div><button class="btn" id="lvNew">${I.plus} جدول استثنائي جديد</button></div>
      ${list.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>الاسم</th><th>الفترة</th><th>الحالة</th><th>الروابط</th><th></th></tr></thead><tbody>${list.map(s => { const [t, c] = st(s), L = s.links || {}, nc = Object.values(L.cls || {}).filter(urlOk).length, ncs = new Set((s.slots || []).map(x => x.c)).size; return `<tr><td><b>${esc(s.label)}</b>${s.tag ? ` <span class="pill st-submitted">${esc(s.tag)}</span>` : ''}</td><td class="small">${dAR(s.date_from)} — ${dAR(s.date_to)}</td><td><span class="pill ${c}">${t}</span></td><td class="small">${AR(nc)} من ${AR(ncs)} فصل${Object.keys(L.cell || {}).length ? ` · ${AR(Object.keys(L.cell).length)} حصة خاصة` : ''}</td><td><button class="btn ghost sm" data-ed="${s.id}">فتح</button></td></tr>`; }).join('')}</tbody></table></div>` : A.emptyBox('لا توجد جداول استثنائية بعد', 'أنشئ واحداً من أي جدول (مثل مسودة «التعليم عن بعد») واختر الفترة.')}</div><div id="lvEd"></div>`;
    $('#lvNew', root).onclick = () => createDialog(root);
    $$('[data-ed]', root).forEach(b => b.onclick = () => editor(root, list.find(x => x.id === b.dataset.ed)));
    const open = A.LS.get('live_open'); if (open && list.some(x => x.id === open)) editor(root, list.find(x => x.id === open));
  };

  async function createDialog(root) {
    const vers = (await api.list('timetable_versions', { section_id: S.sectionId })).filter(v => v.status !== 'archived');
    const bell = A.bell.bellOf(A.section()); const [f, t] = curWeek();
    const pre = vers.find(v => /بعد|remote/i.test(v.label)) || vers.find(v => v.status === 'approved') || vers[0];
    const preS = bell.schedules.find(s => /بعد/.test(s.name + ' ' + (s.tag || ''))) || A.bell.activeSched(bell);
    const m = A.modal(`<h3>جدول استثنائي جديد</h3><p class="sub">تُؤخذ لقطة ثابتة من الجدول المختار. تعديل الجدول الأصلي لاحقاً لا يغيّرها (ويمكنك تحديثها يدوياً).</p>
      <div class="grid g2"><div class="field"><label for="lvL">الاسم</label><input class="in" id="lvL" value="جدول التعليم عن بعد"></div><div class="field"><label for="lvT">الشارة</label><input class="in" id="lvT" value="للتعليم عن بعد"></div>
      <div class="field"><label for="lvV">من جدول</label><select class="in" id="lvV">${vers.map(v => `<option value="${v.id}" ${pre && v.id === pre.id ? 'selected' : ''}>${esc(v.label)}${v.status === 'approved' ? ' (المعتمد)' : ' (مسودة)'}</option>`).join('')}</select></div>
      <div class="field"><label for="lvS">التوقيت</label><select class="in" id="lvS">${bell.schedules.map(s => `<option value="${s.id}" ${s.id === preS.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="lvF">من تاريخ</label><input class="in" type="date" id="lvF" value="${f}"></div><div class="field"><label for="lvTo">إلى تاريخ</label><input class="in" type="date" id="lvTo" value="${t}"></div></div>
      <div class="acts"><button class="btn" id="lvGo">إنشاء</button></div>`);
    m.el.querySelector('#lvGo').onclick = e => A.run(e.currentTarget, async () => {
      const g = id => m.el.querySelector(id).value, from = g('#lvF'), to = g('#lvTo'); if (!from || !to || to < from) throw new Error('تحقق من التاريخين');
      await ensureBell();
      const sl = await api.list('timetable_slots', { version_id: g('#lvV') });
      const slots = sl.filter(x => x.subject_id).map(x => ({ c: x.class_id, d: x.day, p: x.period, s: x.subject_id, t: x.teacher_id || null }));
      if (!slots.length) throw new Error('الجدول المختار فارغ');
      // روابط الفصول من آخر جدول استثنائي (إن وُجد) — القاعات ثابتة غالباً
      const prev = (await api.list('display_schedules', { section_id: S.sectionId })).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
      const r = (await api.ins('display_schedules', { school_id: S.school.id, section_id: S.sectionId, version_id: g('#lvV'), label: g('#lvL').trim() || 'جدول استثنائي', tag: g('#lvT').trim(), date_from: from, date_to: to, slots, meta: metaFrom(g('#lvS')), links: prev ? { cls: (prev.links || {}).cls || {}, tch: (prev.links || {}).tch || {}, cell: {} } : {}, created_by: S.me.id }))[0];
      m.close(); A.LS.set('live_open', r.id); A.toast('أُنشئ الجدول — أضف الروابط ثم انشره', 'ok'); V.live(root);
    });
  }

  function editor(root, ds) {
    A.LS.set('live_open', ds.id);
    const box = $('#lvEd', root); const L = { cls: {}, tch: {}, cell: {}, ...(ds.links || {}) }; L.cls = { ...L.cls }; L.tch = { ...L.tch }; L.cell = { ...L.cell };
    const classes = [...new Set(ds.slots.map(x => x.c))].sort((a, b) => (allCls().find(c => c.id === a) || {}).sort - (allCls().find(c => c.id === b) || {}).sort || cName(a).localeCompare(cName(b), 'ar'));
    const teachers = [...new Set(ds.slots.map(x => x.t).filter(Boolean))].sort((a, b) => A.personName(a).localeCompare(A.personName(b), 'ar'));
    let pv = classes[0], dirty = false, tab = 'cls';
    let M = ds.meta || {}, days = M.days || [0, 1, 2, 3, 4], P = M.periods || ((A.section() || {}).periods || 7);
    const setM = n => { M = n; days = M.days || [0, 1, 2, 3, 4]; P = M.periods || P; const sb = $('#lvSub', box); if (sb) sb.innerHTML = subTxt(); };
    const subTxt = () => `${dAR(ds.date_from)} — ${dAR(ds.date_to)} · التوقيت: ${esc(M.schedName || '—')}${M.linked === false ? '' : ' (مرتبط)'} · ${AR(classes.length)} فصل · ${AR(ds.slots.length)} حصة`;
    const linkOf = (c, d, p, t) => L.cell[`${c}|${d}|${p}`] || L.cls[c] || (t && L.tch[t]) || '';
    box.innerHTML = `<div class="card lv-ed"><div class="head"><div class="grow"><h2 style="margin:0">${esc(ds.label)} ${ds.tag ? `<span class="pill st-submitted">${esc(ds.tag)}</span>` : ''}</h2><p class="sub" id="lvSub" style="margin:2px 0 0">${subTxt()}</p></div>
        <span class="rec-st ok" id="lvSt" role="status" aria-live="polite">${ds.published ? 'منشور' : 'مسودة — غير ظاهر بعد'}</span>
        <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn ${ds.published ? 'ghost' : 'ok'}" id="lvPub">${ds.published ? 'إيقاف النشر' : `${I.check} اعتماد ونشر`}</button><button class="btn ghost sm" id="lvDz">تصميم وطباعة</button><button class="btn ghost sm" id="lvRe">تحديث من الجدول</button><button class="btn ghost sm" id="lvDates">تعديل الفترة</button><button class="btn bad sm" id="lvDel">حذف</button></div></div>
      <div class="kpick" id="lvTab"><button data-t="cls" class="on">روابط الفصول</button><button data-t="tch">روابط المعلمين</button><button data-t="cell">رابط لحصة معينة</button><button data-t="time">التوقيت ومواعيد الحصص والفسح</button></div>
      <div id="lvBody" style="margin-top:10px"></div>
      <h3 style="margin:16px 0 6px">معاينة ما يراه ولي الأمر</h3><div class="row" style="gap:6px;margin-bottom:8px"><select class="in" id="lvPv" style="width:auto">${classes.map(c => `<option value="${c}">${esc(cName(c))}</option>`).join('')}</select></div><div id="lvPrev"></div></div>`;
    const save = async () => { const r = await api.upd('display_schedules', ds.id, { links: L }); Object.assign(ds, Array.isArray(r) ? r[0] : r, { links: L }); dirty = false; const s = $('#lvSt', box); if (s) { s.textContent = (ds.published ? 'منشور' : 'مسودة') + ' · حُفظت الروابط'; s.className = 'rec-st ok'; } };
    let tm; const later = () => { dirty = true; const s = $('#lvSt', box); if (s) { s.textContent = 'يحفظ…'; s.className = 'rec-st'; } clearTimeout(tm); tm = setTimeout(() => save().catch(e => A.toast(e.message, 'err')), 800); };
    const inp = (k, id, v, ph) => `<input class="in ${v && !urlOk(v) ? 'bad' : ''}" dir="ltr" data-${k}="${id}" value="${esc(v || '')}" placeholder="${ph || 'https://meet.google.com/…'}" aria-label="الرابط">`;
    const drawBody = () => {
      const B = $('#lvBody', box);
      if (tab === 'cls') {
        B.innerHTML = `<p class="small muted" style="margin:0 0 8px">رابط القاعة الثابتة لكل فصل — يُستخدم لكل حصص الفصل ما لم تحدد رابطاً لحصة بعينها.</p>
          <details class="dz-det"><summary>لصق مجموعة روابط دفعة واحدة</summary><p class="small muted">سطر لكل فصل: اسم الفصل ثم الرابط (يفصل بينهما مسافة أو فاصلة أو علامة |).</p><textarea class="in" id="lvBulk" rows="4" dir="auto" placeholder="رابع ابتدائي أ | https://meet.google.com/abc-defg-hij"></textarea><button class="btn sm" id="lvBulkGo" style="margin-top:6px">تطبيق</button> <span class="small" id="lvBulkR"></span></details>
          <div class="lv-grid">${classes.map(c => `<label><span>${esc(cName(c))}</span>${inp('lc', c, L.cls[c])}</label>`).join('')}</div>`;
        $$('[data-lc]', B).forEach(i => i.oninput = () => { const v = i.value.trim(); if (v) L.cls[i.dataset.lc] = v; else delete L.cls[i.dataset.lc]; i.classList.toggle('bad', !!v && !urlOk(v)); later(); drawPrev(); });
        $('#lvBulkGo', B).onclick = () => { let n = 0, miss = []; $('#lvBulk', B).value.split('\n').map(x => x.trim()).filter(Boolean).forEach(line => { const m = line.match(/(https?:\/\/\S+)/i); if (!m) return; const nm = A.normKey(line.replace(m[1], '').replace(/[|,،\t:]+/g, ' ').trim()); const c = classes.find(id => A.normKey(cName(id)) === nm) || classes.find(id => A.normKey(cName(id)).includes(nm) || nm.includes(A.normKey(cName(id)))); if (c) { L.cls[c] = m[1]; n++; } else miss.push(nm); }); $('#lvBulkR', B).textContent = `طُبّق ${AR(n)}${miss.length ? ` · لم يُعرف: ${miss.join('، ')}` : ''}`; later(); drawBody(); drawPrev(); };
      } else if (tab === 'time') {
        const tsum = () => (M.times || []).map((t, p) => `<span><b>${AR(p + 1)}</b> <span dir="ltr">${t[0]} – ${t[1]}</span></span>${(M.breaks || []).filter(b => b.after === p + 1).map(b => `<span class="brk">☕ ${esc(b.label || 'استراحة')} <span dir="ltr">${b.from} – ${b.to}</span></span>`).join('')}`).join('');
        const bell = A.bell.bellOf(A.section()), linked = M.linked !== false, cs = customFrom(M), nd = (A.section() || {}).days || 5;
        B.innerHTML = `<div class="kpick" id="tmM"><button data-m="link" class="${linked ? 'on' : ''}">مرتبط بأداة التوقيت</button><button data-m="own" class="${linked ? '' : 'on'}">توقيت خاص بهذا الجدول</button></div>
          ${linked ? `<div class="grid g2" style="margin-top:10px"><div class="field"><label for="tmS">الجدول الزمني</label><select class="in" id="tmS">${bell.schedules.map(x => `<option value="${x.id}" ${x.id === M.sched ? 'selected' : ''}>${esc(x.name)}${x.tag ? ' — ' + esc(x.tag) : ''}</option>`).join('')}</select></div><div class="field"><label>&nbsp;</label><button class="btn ghost sm" id="tmGo">فتح أداة التوقيت لتعديله</button></div></div><p class="small muted" style="margin:0">أي تعديل في هذا الجدول الزمني (بداية اليوم، مدة الحصة، الفسح، الأيام) يُطبَّق هنا تلقائياً، ويصل لأولياء الأمور.</p>`
          : `<div class="grid g3" style="margin-top:10px"><div class="field"><label for="tmSt">بداية اليوم</label><input class="in" type="time" id="tmSt" value="${esc(cs.start)}"></div><div class="field"><label for="tmD">مدة الحصة (دقيقة)</label><input class="in" type="number" min="10" max="120" id="tmD" value="${cs.dur}"></div><div class="field"><label for="tmP">الانتقال بين الحصص (دقيقة)</label><input class="in" type="number" min="0" max="20" id="tmP" value="${cs.pass}"></div>
            <div class="field"><label for="tmN">عدد الحصص</label><select class="in" id="tmN">${Array.from({ length: 10 }, (_, i) => `<option ${+cs.np === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div></div>
            <div class="field"><label>الأيام وحصص كل يوم</label><div class="bl-dg">${Array.from({ length: nd }, (_, d) => { const on = (cs.days || []).includes(d); return `<div class="bl-d ${on ? 'on' : ''}"><label class="chk"><input type="checkbox" data-tdy="${d}" ${on ? 'checked' : ''}> ${DAYS[d]}</label><select class="in" data-tdp="${d}" ${on ? '' : 'disabled'}>${Array.from({ length: +cs.np }, (_, i) => `<option value="${i + 1}" ${(+(cs.perDay || {})[d] || +cs.np) === i + 1 ? 'selected' : ''}>${AR(i + 1)} حصص</option>`).join('')}</select></div>`; }).join('')}</div></div>
            <div class="field"><label>الفسح والصلاة</label><div class="bl-brs">${(cs.breaks || []).map((b, i) => `<div class="bl-br"><input class="in" data-tb="${i}" data-k="label" value="${esc(b.label || '')}" placeholder="استراحة"><label>بعد الحصة <select class="in" data-tb="${i}" data-k="after">${Array.from({ length: Math.max(1, +cs.np - 1) }, (_, p) => `<option value="${p + 1}" ${+b.after === p + 1 ? 'selected' : ''}>${PER[p] || AR(p + 1)}</option>`).join('')}</select></label><label>المدة <input class="in" type="number" min="5" max="90" style="width:76px" data-tb="${i}" data-k="dur" value="${+b.dur || 15}"> د</label><button class="btn bad sm" data-tbx="${i}" aria-label="حذف">×</button></div>`).join('') || '<p class="small muted">لا توجد فسح.</p>'}</div><button class="btn ghost sm" id="tmAddB" style="margin-top:6px">+ فسحة / صلاة</button></div>
            <details class="bl-det"><summary>مدة مختلفة لحصة معينة</summary><div class="bl-pd">${Array.from({ length: +cs.np }, (_, p) => `<label><span>${PER[p] || AR(p + 1)}</span><input class="in" type="number" min="10" max="120" data-tpd="${p}" value="${(cs.perDur || {})[p] || ''}" placeholder="${cs.dur}"></label>`).join('')}</div></details>`}
          <div class="lv-tsum">${tsum()}</div>`;
        const saveMeta = async n => { setM(n); const r = await api.upd('display_schedules', ds.id, { meta: n }); ds.meta = n; const st0 = $('#lvSt', box); if (st0) { st0.textContent = 'حُفظ التوقيت'; st0.className = 'rec-st ok'; } drawPrev(); };
        let tt; const own = structural => { clearTimeout(tt); setM(metaCustom(cs)); drawPrev(); const sm = $('.lv-tsum', B); if (sm) sm.innerHTML = tsum(); if (structural) drawBody(); tt = setTimeout(() => saveMeta(metaCustom(cs)).catch(e => A.toast(e.message, 'err')), 700); };
        $$('#tmM button', B).forEach(b => b.onclick = ev => A.run(ev.currentTarget, async () => { if ((b.dataset.m === 'link') === linked) return; if (b.dataset.m === 'link') await ensureBell(); await saveMeta(b.dataset.m === 'link' ? metaFrom(M.sched || (bell.schedules[0] || {}).id) : metaCustom(cs)); drawBody(); }));
        const tS = $('#tmS', B); if (tS) tS.onchange = () => A.run(null, async () => { await ensureBell(); await saveMeta(metaFrom(tS.value)); drawBody(); });
        const tG = $('#tmGo', B); if (tG) tG.onclick = () => { A.LS.set('studio_t', 'bell'); A.LS.set('bell_s_' + S.sectionId, M.sched); if (V.studio && document.querySelector('.st-steps')) V.studio(document.querySelector('.st-steps').closest('main') || document.getElementById('app')); else location.hash = '#/studio'; };
        const num = (id, k) => { const i = $(id, B); if (i) i.oninput = i.onchange = () => { cs[k] = i.type === 'time' ? i.value : +i.value; own(); }; };
        num('#tmSt', 'start'); num('#tmD', 'dur'); num('#tmP', 'pass'); const tN = $('#tmN', B); if (tN) tN.onchange = () => { cs.np = +tN.value; own(true); };
        $$('[data-tdy]', B).forEach(c => c.onchange = () => { const on = $$('[data-tdy]', B).filter(x => x.checked).map(x => +x.dataset.tdy); if (!on.length) { c.checked = true; return; } cs.days = on; own(true); });
        $$('[data-tdp]', B).forEach(c => c.onchange = () => { cs.perDay = cs.perDay || {}; cs.perDay[c.dataset.tdp] = +c.value; own(); });
        $$('[data-tb]', B).forEach(i => i.oninput = i.onchange = () => { const b = cs.breaks[+i.dataset.tb]; b[i.dataset.k] = i.dataset.k === 'label' ? i.value : +i.value; own(); });
        $$('[data-tbx]', B).forEach(x => x.onclick = () => { cs.breaks.splice(+x.dataset.tbx, 1); own(true); });
        const ab = $('#tmAddB', B); if (ab) ab.onclick = () => { (cs.breaks = cs.breaks || []).push({ after: Math.min(3, Math.max(1, +cs.np - 1)), dur: 20, label: cs.breaks.length ? 'الصلاة' : 'الفسحة' }); own(true); };
        $$('[data-tpd]', B).forEach(i => i.oninput = () => { cs.perDur = cs.perDur || {}; if (i.value) cs.perDur[i.dataset.tpd] = +i.value; else delete cs.perDur[i.dataset.tpd]; own(); });
      } else if (tab === 'tch') {
        B.innerHTML = `<p class="small muted" style="margin:0 0 8px">اختياري: رابط خاص بالمعلم يُستخدم فقط للفصول التي ليس لها رابط.</p><div class="lv-grid">${teachers.map(t => `<label><span>${esc(A.personName(t))}</span>${inp('lt', t, L.tch[t])}</label>`).join('')}</div>`;
        $$('[data-lt]', B).forEach(i => i.oninput = () => { const v = i.value.trim(); if (v) L.tch[i.dataset.lt] = v; else delete L.tch[i.dataset.lt]; later(); drawPrev(); });
      } else {
        const c = pv; B.innerHTML = `<p class="small muted" style="margin:0 0 8px">رابط مختلف لحصة واحدة (مثل حصة مشتركة أو قاعة أخرى) — للفصل المختار في المعاينة: <b>${esc(cName(c))}</b>.</p>
          <div class="scroll"><table class="tbl lv-cells"><thead><tr><th>اليوم</th>${Array.from({ length: P }, (_, p) => `<th>${AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${days.map(d => `<tr><th>${DAYS[d]}</th>${Array.from({ length: P }, (_, p) => { const x = ds.slots.find(y => y.c === c && y.d === d && y.p === p); return `<td>${x ? `<div class="small"><b>${esc(A.subjName(x.s))}</b></div>${inp('lcell', `${c}|${d}|${p}`, L.cell[`${c}|${d}|${p}`], 'رابط خاص (اختياري)')}` : '<span class="faint">—</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
        $$('[data-lcell]', B).forEach(i => i.oninput = () => { const v = i.value.trim(); if (v) L.cell[i.dataset.lcell] = v; else delete L.cell[i.dataset.lcell]; later(); drawPrev(); });
      }
    };
    let PE = []; entriesOf([ds.id]).then(e => { PE = e; drawPrev(); });
    const drawPrev = () => { const c = pv, cells = ds.slots.filter(x => x.c === c).map(x => A._liveEntries ? A._liveEntries.withEntry({ c: x.c, d: x.d, p: x.p, subject: A.subjName(x.s), teacher: A.personName(x.t), link: linkOf(c, x.d, x.p, x.t) }, PE, ds.id) : ({ d: x.d, p: x.p, subject: A.subjName(x.s), teacher: A.personName(x.t), link: linkOf(c, x.d, x.p, x.t) })); $('#lvPrev', box).innerHTML = A.liveTable({ label: ds.label, tag: ds.tag, from: ds.date_from, to: ds.date_to, meta: M, cells, cls_link: L.cls[c] }, { now: null, today: today(), preview: true }); A.bindLive($('#lvPrev', box)); };
    $$('#lvTab button', box).forEach(b => b.onclick = () => { tab = b.dataset.t; $$('#lvTab button', box).forEach(x => x.classList.toggle('on', x === b)); drawBody(); });
    $('#lvPv', box).onchange = e => { pv = e.target.value; drawPrev(); if (tab === 'cell') drawBody(); };
    $('#lvPub', box).onclick = ev => A.run(ev.currentTarget, async () => {
      if (dirty) await save();
      if (!ds.published) { const miss = classes.filter(c => !L.cls[c] && !ds.slots.some(x => x.c === c && (L.tch[x.t] || L.cell[`${c}|${x.d}|${x.p}`]))); if (miss.length && !(await A.confirmBox(`${A.cnt(miss.length, 'فصل', 'فصول')} بلا رابط: ${miss.map(cName).join('، ')}<br><span class="small muted">سيظهر جدولها دون زر الدخول. النشر الآن؟</span>`, 'نشر'))) return; }
      await api.upd('display_schedules', ds.id, { published: !ds.published, published_at: ds.published ? null : new Date().toISOString() });
      A.toast(ds.published ? 'أُوقف النشر' : 'نُشر الجدول — يظهر الآن لأولياء الأمور والمعلمين', 'ok'); V.live(root);
    });
    $('#lvDel', box).onclick = ev => A.run(ev.currentTarget, async () => { if (!(await A.confirmBox(`حذف «${esc(ds.label)}»؟ لا يتأثر أي جدول أو خطة.`, 'حذف', true))) return; await api.del('display_schedules', ds.id); A.LS.set('live_open', ''); V.live(root); });
    $('#lvRe', box).onclick = ev => A.run(ev.currentTarget, async () => { if (!ds.version_id) throw new Error('الجدول الأصلي لم يعد موجوداً'); if (!(await A.confirmBox('تحديث الحصص من الجدول الأصلي الآن؟ الروابط تبقى كما هي.', 'تحديث'))) return; const sl = await api.list('timetable_slots', { version_id: ds.version_id }); await api.upd('display_schedules', ds.id, { slots: sl.filter(x => x.subject_id).map(x => ({ c: x.class_id, d: x.day, p: x.period, s: x.subject_id, t: x.teacher_id || null })), meta: metaFrom(M.sched) }); A.toast('حُدِّثت الحصص والتوقيت', 'ok'); V.live(root); });
    $('#lvDates', box).onclick = () => { const m = A.modal(`<h3>تعديل الفترة</h3><div class="grid g2"><div class="field"><label for="ldF">من</label><input class="in" type="date" id="ldF" value="${ds.date_from}"></div><div class="field"><label for="ldT">إلى</label><input class="in" type="date" id="ldT" value="${ds.date_to}"></div></div><div class="acts"><button class="btn" id="ldGo">حفظ</button></div>`); m.el.querySelector('#ldGo').onclick = e => A.run(e.currentTarget, async () => { const f = m.el.querySelector('#ldF').value, t = m.el.querySelector('#ldT').value; if (!f || !t || t < f) throw new Error('تحقق من التاريخين'); await api.upd('display_schedules', ds.id, { date_from: f, date_to: t }); m.close(); V.live(root); }); };
    $('#lvDz', box).onclick = () => { const mm = A.modal('<div id="dzM"></div>', { cls: 'wide xl' }); A.ttDesign(mm.el.querySelector('#dzM'), { version: ds.version_id }); };
    drawBody(); drawPrev();
    if (M.linked !== false && M.sched) { const n = metaFrom(M.sched); if (n.sched === M.sched && JSON.stringify(n) !== JSON.stringify(M)) api.upd('display_schedules', ds.id, { meta: n }).then(() => { ds.meta = n; setM(n); drawPrev(); }).catch(() => {}); }
  }

  // جدول تفاعلي مشترك (لولي الأمر وللمعاينة وللمعلم) — نفس الكود في parents.html
  A.liveTable = (...a) => window.DinaLive ? window.DinaLive.html(...a) : '';
  A.bindLive = el => window.DinaLive && window.DinaLive.bind(el);
  const hookJoin = () => { if (window.DinaLive && !window.DinaLive.onJoin) window.DinaLive.onJoin = (ds, c, d, p) => { try { if (api.rpc) api.rpc('log_live_click_staff', { p_ds: ds, p_class: c, p_day: d, p_period: p }).catch(() => {}); } catch (_) {} }; };

  // بطاقة للمعلم في «خطتي»: حصصه في الجداول الاستثنائية المنشورة السارية
  const ERR = { 'not your period': 'هذه الحصة ليست لك', 'link must start with https://': 'الرابط يجب أن يبدأ بـ https://', 'no such period': 'الحصة غير موجودة في هذا الجدول', 'not found': 'الجدول غير موجود' };
  const saveEntry = async (ds, c, d, p, v) => { if (!api.rpc) return api.ups('live_entries', [{ ds_id: ds, class_id: c, day: d, period: p, topic: v.topic.trim(), homework: v.homework.trim(), note: v.note.trim(), link: v.link }], 'ds_id,class_id,day,period'); try { return await api.rpc('save_live_entry', { p_ds: ds, p_class: c, p_day: d, p_period: p, p_topic: v.topic, p_homework: v.homework, p_note: v.note, p_link: v.link }); } catch (e) { throw new Error(ERR[e.message] || e.message); } };
  // نافذة إدخال بيانات الحصة (للمعلم) — منفصلة تماماً عن الخطة الأسبوعية
  function entryDialog(ds, c, d, p, cur, done) {
    const sl = (ds.slots || []).find(x => x.c === c && x.d === d && x.p === p) || {};
    const plan = S.entries.find(e => e.class_id === c && e.day === d && e.period === p && e.teacher_id === S.me.id && (e.topic || e.homework));
    const m = A.modal(`<h3>بيانات الحصة — ${esc(A.subjName(sl.s))} · ${esc(cName(c))}</h3><p class="sub">${DAYS[d]} · الحصة ${PER[p] || AR(p + 1)} · ${esc(ds.label)}. تظهر لولي الأمر بأيقونات ملونة، ولا تؤثر على الخطة الأسبوعية.</p>
      ${plan ? `<button class="btn ghost sm" id="leCp" style="margin-bottom:8px">نسخ الموضوع والواجب من خطتي الأسبوعية</button>` : ''}
      <div class="field"><label for="leT"><span class="lv-dotk" style="--c:#005499"></span> الدرس / الموضوع</label><textarea class="in" id="leT" rows="2" placeholder="مثال: الفعل الماضي ص ٤٥">${esc(cur.topic || '')}</textarea></div>
      <div class="field"><label for="leH"><span class="lv-dotk" style="--c:#B7791F"></span> الواجب</label><input class="in" id="leH" value="${esc(cur.homework || '')}" placeholder="اختياري"></div>
      <div class="field"><label for="leN"><span class="lv-dotk" style="--c:#6B4FA3"></span> ملاحظة لولي الأمر</label><input class="in" id="leN" value="${esc(cur.note || '')}" placeholder="اختياري — مثل: تجهيز الكتاب والدفتر"></div>
      <div class="field"><label for="leL"><span class="lv-dotk" style="--c:#0E8A9E"></span> رابط الدرس (عرض، فيديو، ورقة عمل…)</label><input class="in" id="leL" dir="ltr" value="${esc(cur.llink || '')}" placeholder="https://…"><span class="small muted">رابط دخول الحصة نفسه تضيفه الإدارة لكل فصل.</span></div>
      <div class="acts"><button class="btn" id="leGo">حفظ</button></div>`);
    const el = m.el, cp = el.querySelector('#leCp'); if (cp) cp.onclick = () => { el.querySelector('#leT').value = plan.topic || ''; el.querySelector('#leH').value = plan.homework || ''; };
    el.querySelector('#leGo').onclick = e => A.run(e.currentTarget, async () => { const v = { topic: el.querySelector('#leT').value, homework: el.querySelector('#leH').value, note: el.querySelector('#leN').value, link: el.querySelector('#leL').value.trim() }; if (v.link && !urlOk(v.link)) throw new Error('الرابط يجب أن يبدأ بـ https://'); await saveEntry(ds.id, c, d, p, v); m.close(); A.toast('حُفظت بيانات الحصة — تظهر لولي الأمر', 'ok'); done(); });
  }
  const entriesOf = async ids => { try { return ids.length ? await api.list('live_entries', { ds_id: ids }) : []; } catch (_) { return []; } };
  const withEntry = (cell, E, ds) => { const e = E.find(x => x.ds_id === ds && x.class_id === cell.c && x.day === cell.d && x.period === cell.p); return e ? { ...cell, topic: e.topic, homework: e.homework, note: e.note, llink: e.link } : cell; };
  A._liveEntries = { entriesOf, withEntry };

  // بطاقة للمعلم في «خطتي»: حصصه في الجداول الاستثنائية المنشورة السارية، مع إضافة بيانات كل حصة
  const my0 = V.my;
  if (my0) V.my = function (root) {
    const r = my0(root);
    const paint = async () => { try {
      const t = today(), l = (await api.list('display_schedules', { section_id: S.sectionId })).filter(d => d.published && d.date_to >= t && d.date_from <= addD(t, 7)); const old = $('#lvMy', root);
      if (!l.length) { if (old) old.remove(); return; } const anchor = $('#myMode', root) || $('.head', root); if (!anchor) return;
      const E = await entriesOf(l.map(d => d.id));
      const html = l.map(d => { const mine = (d.slots || []).filter(x => x.t === S.me.id); if (!mine.length) return ''; const L = d.links || {}; const cells = mine.map(x => withEntry({ c: x.c, d: x.d, p: x.p, subject: A.subjName(x.s) + ' — ' + cName(x.c), teacher: '', link: (L.cell || {})[`${x.c}|${x.d}|${x.p}`] || (L.cls || {})[x.c] || (L.tch || {})[x.t] || '' }, E, d.id)); return A.liveTable({ id: d.id, label: d.label, tag: d.tag, from: d.date_from, to: d.date_to, meta: d.meta, cells }, { today: t, now: null, teacher: true, edit: A.week() ? true : true }); }).join('');
      if (!html) { if (old) old.remove(); return; }
      const box = old || (anchor.insertAdjacentHTML('afterend', '<div id="lvMy"></div>'), $('#lvMy', root));
      const keep = box.querySelector('.lv-days .on'), keepD = keep && keep.dataset.lvd;
      box.innerHTML = html; hookJoin(); A.bindLive(box);
      if (keepD) { const b = box.querySelector(`[data-lvd="${keepD}"]`); if (b) b.click(); }
      box.querySelectorAll('[data-lved]').forEach(b => b.onclick = () => { const [ds, c, d, p] = b.dataset.lved.split('|'); const dsr = l.find(x => x.id === ds); const cur = withEntry({ c, d: +d, p: +p }, E, ds); entryDialog(dsr, c, +d, +p, cur, paint); });
    } catch (_) {} };
    paint();
    return r;
  };
})();
