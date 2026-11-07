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
  function metaFrom(schedId, lim) {
    const sec = A.section(), b = A.bell.bellOf(sec), s = b.schedules.find(x => x.id === schedId) || A.bell.activeSched(b);
    const P = A.bell.maxP(s, sec), tl = A.bell.timeline(s, P, null);
    const m = { linked: true, sched: s.id, schedName: s.name, days: A.bell.actDays(s, sec), periods: P, perDay: Object.fromEntries(A.bell.actDays(s, sec).map(d => [d, A.bell.schedP(s, sec, d)])), times: tl.items.filter(x => x.k === 'p').map(x => [hhmm(x.from), hhmm(x.to)]), breaks: tl.items.filter(x => x.k === 'b').map((x, i, a) => ({ after: tl.items.slice(0, tl.items.indexOf(x)).filter(y => y.k === 'p').length, label: x.label, from: hhmm(x.from), to: hhmm(x.to) })) };
    // حدود الجدول المحوَّل: أيام محددة وعدد حصص موحّد
    if (lim) { const dd = m.days.filter(d => !lim.days || lim.days.includes(d)); if (dd.length) m.days = dd; if (lim.n) { m.periods = Math.min(m.periods, lim.n); m.perDay = Object.fromEntries(m.days.map(d => [d, Math.min(m.perDay[d] || m.periods, lim.n)])); } else m.perDay = Object.fromEntries(m.days.map(d => [d, m.perDay[d]])); m.lim = lim; }
    return m;
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
  const customFrom = M => { if (M.custom) return JSON.parse(JSON.stringify(M.custom)); const t = M.times || []; const d0 = t[0] ? toMin(t[0][1]) - toMin(t[0][0]) : 40; return { start: (t[0] || ['08:00'])[0], dur: d0, pass: t[1] && !(M.breaks || []).some(b => b.after === 1) ? Math.max(0, toMin(t[1][0]) - toMin(t[0][1])) : 0, np: M.periods || 6, days: M.days || [0, 1, 2, 3, 4], perDay: M.perDay || {}, perDur: Object.fromEntries(t.map((x, p) => [p, toMin(x[1]) - toMin(x[0])]).filter(([, v]) => v > 0 && v !== d0)), breaks: (M.breaks || []).map(b => ({ after: b.after, dur: toMin(b.to) - toMin(b.from), label: b.label })) }; };
  // عند تعديل «اليوم الدراسي والجدول الزمني»: تُحدَّث الجداول الاستثنائية المرتبطة تلقائياً
  // توقيت التعليم عن بعد مستقل تماماً عن توقيت الحضوري: يُنسخ مرة واحدة ثم لا يتأثر أحدهما بالآخر
  const detach = (M0) => { const M = { ...(M0 || {}) }; if (M.linked === false) return M; const cs = customFrom(M); const n = { ...M, linked: false, custom: cs, copiedFrom: M.schedName || '', sched: null, schedName: 'توقيت التعليم عن بعد' }; return n; };
  A._liveDetach = detach;
  A._syncLiveTimes = async () => {}; // لم يعد التوقيت الأساسي يغيّر جداول التعليم عن بعد
  const _syncOld = async () => { try { const l = await api.list('display_schedules', { section_id: S.sectionId }); for (const d of l) { const M = d.meta || {}; if (M.linked === false || !M.sched) continue; const n = metaFrom(M.sched, M.lim); if (M.vis) n.vis = M.vis; if (M.fill) n.fill = M.fill; if (n.sched !== M.sched) continue; if (JSON.stringify(n) !== JSON.stringify(M)) await api.upd('display_schedules', d.id, { meta: n }); } } catch (_) {} };

  V.live = async function (root) {
    if (!can()) { root.innerHTML = `<div class="card">${A.emptyBox('لصاحب صلاحية اعتماد الجدول')}</div>`; return; }
    root.innerHTML = '<div class="card"><div class="spinner"></div></div>';
    const list = (await api.list('display_schedules', { section_id: S.sectionId })).sort((a, b) => String(b.date_from).localeCompare(String(a.date_from)));
    const st = s => !s.published ? ['مسودة', 'st-draft'] : s.date_to < today() ? ['منتهٍ', 'st-empty'] : s.date_from <= today() ? ['منشور · سارٍ الآن', 'st-approved'] : ['منشور · قادم', 'st-submitted'];
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">جدول استثنائي للعرض</h2><p class="sub" style="margin:2px 0 0">مثل جدول التعليم عن بعد لأسبوع: يُعرض للمعلمين وأولياء الأمور مع روابط الحصص الافتراضية، <b>دون أن يمس الخطط أو الجدول المعتمد</b>. ينتهي ظهوره تلقائياً بعد آخر يوم.</p></div><div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn ok" id="lvConv">${I.plus} تحويل يوم أو أسبوع للتعلم عن بعد</button><button class="btn ghost" id="lvNew">جدول استثنائي جديد (لقطة أو ملف)</button></div></div>
      ${list.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>الاسم</th><th>الفترة</th><th>الحالة</th><th>الروابط</th><th></th></tr></thead><tbody>${list.map(s => { const [t, c] = st(s), L = s.links || {}, nc = Object.values(L.cls || {}).filter(urlOk).length, ncs = new Set((s.slots || []).map(x => x.c)).size; return `<tr><td><b>${esc(s.label)}</b>${s.tag ? ` <span class="pill st-submitted">${esc(s.tag)}</span>` : ''}</td><td class="small">${dAR(s.date_from)} — ${dAR(s.date_to)}</td><td><span class="pill ${c}">${t}</span></td><td class="small">${AR(nc)} من ${AR(ncs)} فصل${Object.keys(L.cell || {}).length ? ` · ${AR(Object.keys(L.cell).length)} حصة خاصة` : ''}</td><td><button class="btn ghost sm" data-ed="${s.id}">فتح</button></td></tr>`; }).join('')}</tbody></table></div>` : A.emptyBox('لا توجد جداول استثنائية بعد', 'أنشئ واحداً من أي جدول (مثل مسودة «التعليم عن بعد») واختر الفترة.')}</div><div id="lvEd"></div>`;
    $('#lvNew', root).onclick = () => createDialog(root);
    $('#lvConv', root).onclick = () => A.liveConvert(root);
    $$('[data-ed]', root).forEach(b => b.onclick = () => editor(root, list.find(x => x.id === b.dataset.ed)));
    const open = A.LS.get('live_open'); if (open && list.some(x => x.id === open)) editor(root, list.find(x => x.id === open));
  };

  // ---------- استيراد ملفات aSc إلى الجدول الاستثنائي مباشرة ----------
  const NZ = x => A.normKey(String(x || '').normalize('NFKC')).replace(/ئ/g, 'ي').replace(/\s+/g, ' ').trim();
  const GN = ['', 'أول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سادس'];
  const byName = n => allCls().find(c => NZ(c.name) === NZ(n));
  // رموز الفصول في صفحات المعلمين: «بنين-2»، «أ بنات 1-»، «بنات 3-»، «ب 5-»، «أ-4»، «م 2»، «ث 3»
  function codeCls(b) {
    const n = NZ(b), out = [], re = /(بنين)\s*-\s*(\d)|([اب])\s*بنات\s*(\d)\s*-|بنات\s*(\d)\s*-|([اب])\s*(\d)\s*-|(\d)\s*-\s*([اب])|([اب])\s*-\s*(\d)|([مث])\s*-?\s*(\d)/g; let m;
    while ((m = re.exec(n))) { let nm, alt = null; const sec = x => x === 'ا' ? 'أ' : 'ب';
      if (m[1]) nm = `${GN[m[2]]} ابتدائي بنين`; else if (m[3]) nm = `${GN[m[4]]} ابتدائي ${sec(m[3])} بنات`; else if (m[5]) nm = `${GN[m[5]]} ابتدائي بنات`;
      else if (m[6]) nm = `${GN[m[7]]} ابتدائي ${sec(m[6])}`; else if (m[8]) nm = `${GN[m[8]]} ابتدائي ${sec(m[9])}`; else if (m[10]) { nm = `${GN[m[11]]} ابتدائي ${sec(m[10])}`; alt = `${GN[m[11]]} ابتدائي`; } else nm = `${GN[m[13]]} ${m[12] === 'م' ? 'متوسط' : 'ثانوي'} أ`;
      const c = byName(nm) || (alt && allCls().filter(x => NZ(x.name).startsWith(NZ(alt))).length === 1 ? allCls().find(x => NZ(x.name).startsWith(NZ(alt))) : null) || (/سادس ابتدائي/.test(nm) ? allCls().filter(x => /^سادس/.test(x.name)).length === 1 && allCls().find(x => /^سادس/.test(x.name)) : null);
      if (c && !out.includes(c.id)) out.push(c.id); }
    return out;
  }
  // عنوان صفحة فصل: «الرابع الابتدائي-أ» / «الأول الابتدائي-بنات أ» / «السادس الابتدائي»
  function titleCls(t) {
    const m = A.ttMatch && A.ttMatch.autoC(t, false); if (m) return m;
    const n = NZ(t).replace(/-/g, ' '), tk = n.split(' ').map(x => x.replace(/^ال/, '')); const st = /ابتداي/.test(n) ? 'ابتداي' : /متوسط/.test(n) ? 'متوسط' : 'ثانوي', gender = /بنين/.test(n) ? 'بنين' : /بنات/.test(n) ? 'بنات' : '', sec = tk.filter(x => /^[اب]$/.test(x)).pop() || '';
    const g = NZ(GN.find(x => x && NZ(x) === tk[0]) || tk[0]);
    const l = allCls().filter(c => { const k = NZ(c.name); return k.startsWith(g) && k.includes(st) && (!gender || k.includes(gender)) && (!sec || k.split(' ').includes(sec)) && (gender || !/بنين|بنات/.test(k) || allCls().filter(x => NZ(x.name).startsWith(g) && NZ(x.name).includes(st)).length === 1); });
    return l.length === 1 ? l[0].id : '';
  }
  const PLACE = n => /^(معلم|معلمه|معلمة|معمله|معملة|مدرس|مدرسة)\b/.test(NZ(n));
  function teacherMap(names) {
    const M = {}; names.forEach(n => { M[n] = PLACE(n) || !A.ttMatch ? '' : (A.ttMatch.autoT(n) || ''); });
    const toks = n => (A.ttMatch ? A.ttMatch.toks(n) : NZ(n).split(' ')).length;
    const by = {}; Object.entries(M).forEach(([k, v]) => { if (v) (by[v] = by[v] || []).push(k); });
    Object.values(by).forEach(l => { if (l.length > 1) { l.sort((a, b) => toks(b) - toks(a)); l.slice(1).forEach(k => { M[k] = ''; }); } });
    return M;
  }
  async function importFiles(files) {
    const items = [];
    for (const f of files) {
      if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') { const r = await A.ttParsePdf(f); items.push(...r.items); }
      else { const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); items.push(...window.TT_parse(wb).items.map(x => ({ ...x, src: 'class', file: f.name }))); }
    }
    // تصنيف كل صفحة: صفحة معلم إن كانت أغلب خاناتها رموز فصول
    const pages = {}; items.forEach(it => { const k = it.file + '|' + (it.src === 'teacher' ? it.teacher : it.cls); (pages[k] = pages[k] || []).push(it); });
    const base = [], tch = [];
    Object.values(pages).forEach(l => { const isT = l[0].src === 'teacher' || l.filter(x => codeCls(x.teacher).length || codeCls(x.subject + ' ' + x.teacher).length).length >= l.length * 0.5;
      if (isT) l.forEach(x => tch.push({ tn: x.src === 'teacher' ? x.teacher : x.cls, a: x.subject, b: x.src === 'teacher' ? x.cls : x.teacher, d: x.day, p: x.period }));
      else l.forEach(x => base.push(x)); });
    const slots = [], badC = new Set(), badS = new Set();
    base.forEach(x => { const c = titleCls(x.cls); if (!c) { badC.add(x.cls); return; } const s = A.ttMatch ? A.ttMatch.autoSub(x.subject) : ''; if (!s) badS.add(x.subject); slots.push({ c, d: x.day, p: x.period, s: s || null, sn: x.subject, t: null, tn: (x.teacher || '').trim() && !codeCls(x.teacher).length ? x.teacher.trim() : '' }); });
    let placed = 0, lost = 0;
    const subjOK = (y, a) => { const s0 = A.ttMatch ? A.ttMatch.autoSub(a) : ''; if (s0 && y.s) return s0 === y.s; const ta = A.ttMatch ? A.ttMatch.toks(a) : [a], tb = A.ttMatch ? A.ttMatch.toks(y.sn || '') : [y.sn]; return ta.some(t => tb.includes(t)); };
    tch.forEach(x => { let cs = codeCls(x.b); if (!cs.length) cs = codeCls(x.a + ' ' + x.b); let cand = slots.filter(y => y.d === x.d && y.p === x.p && cs.includes(y.c) && (!base.length || subjOK(y, x.a)));
      if (!cand.length && base.length) { const l = slots.filter(y => y.d === x.d && y.p === x.p && !y.tn && subjOK(y, x.a)); if (l.length === 1) cand = l; }
      if (!cand.length && !base.length) { cs.forEach(c => { const s = A.ttMatch ? A.ttMatch.autoSub(x.a) : ''; const y = { c, d: x.d, p: x.p, s: s || null, sn: x.a, t: null, tn: '' }; slots.push(y); cand.push(y); if (!s) badS.add(x.a); }); }
      if (cand.length) { cand.forEach(y => { if (!y.tn) y.tn = x.tn; }); placed++; } else lost++; });
    const tm = teacherMap([...new Set(slots.map(x => x.tn).filter(Boolean))]);
    slots.forEach(x => { x.t = x.tn ? (tm[x.tn] || null) : null; });
    if (!slots.length) throw new Error('لم تُقرأ حصص يمكن ربطها بفصول هذا القسم' + (badC.size ? ': ' + [...badC].join('، ') : ''));
    return { slots, report: `${slots.length} حصة${badC.size ? ' · فصول غير معروفة: ' + [...badC].join('، ') : ''}${badS.size ? ' · مواد غير معروفة: ' + [...badS].join('، ') : ''}${lost ? ` · ${lost} خانة معلم لم تُطابق` : ''}` };
  }
  A._liveImport = importFiles;
  A._live = { metaFrom, ensureBell, curWeek, cName, allCls, addD, today };

  async function createDialog(root) {
    const vers = (await api.list('timetable_versions', { section_id: S.sectionId })).filter(v => v.status !== 'archived');
    const bell = A.bell.bellOf(A.section()); const [f, t] = curWeek();
    const pre = vers.find(v => /بعد|remote/i.test(v.label)) || vers.find(v => v.status === 'approved') || vers[0];
    const preS = bell.schedules.find(s => /بعد/.test(s.name + ' ' + (s.tag || ''))) || A.bell.activeSched(bell);
    const m = A.modal(`<h3>جدول استثنائي جديد</h3><p class="sub">تُؤخذ لقطة ثابتة من الجدول المختار. تعديل الجدول الأصلي لاحقاً لا يغيّرها (ويمكنك تحديثها يدوياً).</p>
      <div class="grid g2"><div class="field"><label for="lvL">الاسم</label><input class="in" id="lvL" value="جدول التعليم عن بعد"></div><div class="field"><label for="lvT">الشارة</label><input class="in" id="lvT" value="للتعليم عن بعد"></div>
      <div class="field"><label for="lvV">من جدول</label><select class="in" id="lvV"><option value="__file">استيراد من ملف PDF أو Excel (aSc)</option>${vers.map(v => `<option value="${v.id}" ${pre && v.id === pre.id ? 'selected' : ''}>${esc(v.label)}${v.status === 'approved' ? ' (المعتمد)' : ' (مسودة)'}</option>`).join('')}</select></div>
      <div class="field"><label for="lvS">نسخ التوقيت من</label><select class="in" id="lvS">${bell.schedules.map(s => `<option value="${s.id}" ${s.id === preS.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <p class="small muted" style="grid-column:1/-1;margin:-4px 0 0">يُنسخ التوقيت مرة واحدة ويصبح خاصاً بهذا الجدول: تعدّله من تبويب «التوقيت» دون أن يتأثر توقيت الحضوري، ولا يغيّره أي تعديل لاحق في توقيت الحضوري.</p>
      <div class="field" id="lvFileBox" style="grid-column:1/-1" hidden><label for="lvFile">ملفات الجدول</label><input class="in" type="file" id="lvFile" multiple accept=".pdf,.xlsx,.xls,.csv"><span class="small muted">ارفع ملف الفصول وملف المعلمين معاً إن وُجدا: المواد من ملف الفصول، والمعلمة لكل حصة من ملف المعلمين. لا يُنشأ أي جدول آخر ولا تتأثر الخطط.</span></div>
      <div class="field"><label for="lvF">من تاريخ</label><input class="in" type="date" id="lvF" value="${f}"></div><div class="field"><label for="lvTo">إلى تاريخ</label><input class="in" type="date" id="lvTo" value="${t}"></div></div>
      <div class="acts"><button class="btn" id="lvGo">إنشاء</button></div>`);
    const vSel = m.el.querySelector('#lvV'), fb = m.el.querySelector('#lvFileBox'); const syncSrc = () => { fb.hidden = vSel.value !== '__file'; }; vSel.onchange = syncSrc; if (!pre) vSel.value = '__file'; syncSrc();
    m.el.querySelector('#lvGo').onclick = e => A.run(e.currentTarget, async () => {
      const g = id => m.el.querySelector(id).value, from = g('#lvF'), to = g('#lvTo'); if (!from || !to || to < from) throw new Error('تحقق من التاريخين');
      await ensureBell();
      let slots, fromFile = g('#lvV') === '__file', rep = '';
      if (fromFile) { const files = [...m.el.querySelector('#lvFile').files]; if (!files.length) throw new Error('اختر ملف الجدول'); const r = await importFiles(files); slots = r.slots; rep = r.report; }
      else { const sl = await api.list('timetable_slots', { version_id: g('#lvV') }); slots = sl.filter(x => x.subject_id).map(x => ({ c: x.class_id, d: x.day, p: x.period, s: x.subject_id, t: x.teacher_id || null })); }
      if (!slots.length) throw new Error('الجدول المختار فارغ');
      // روابط الفصول من آخر جدول استثنائي (إن وُجد) — القاعات ثابتة غالباً
      const prev = (await api.list('display_schedules', { section_id: S.sectionId })).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
      const r = (await api.ins('display_schedules', { school_id: S.school.id, section_id: S.sectionId, version_id: fromFile ? null : g('#lvV'), label: g('#lvL').trim() || 'جدول استثنائي', tag: g('#lvT').trim(), date_from: from, date_to: to, slots, meta: detach(metaFrom(g('#lvS'))), links: prev ? { cls: (prev.links || {}).cls || {}, tch: (prev.links || {}).tch || {}, cell: {} } : {}, created_by: S.me.id }))[0];
      m.close(); A.LS.set('live_open', r.id); if (fromFile) A.LS.set('live_tab', 'tn'); A.toast(fromFile ? 'استُورد الجدول — راجع ربط أسماء المعلمات ثم أضف الروابط وانشره' : 'أُنشئ الجدول — أضف الروابط ثم انشره', 'ok'); V.live(root);
    });
  }

  function editor(root, ds) {
    A.LS.set('live_open', ds.id);
    { const nf = A._liveFit ? A._liveFit(ds) : 0; if (nf) { api.upd('display_schedules', ds.id, { slots: ds.slots, pool: ds.pool }).then(() => A.toast(`نُقلت ${AR(nf)} حصة زائدة عن عدد حصص التوقيت إلى خانة الحصص أسفل الجدول`, 'warn')).catch(() => { }); } }
    const box = $('#lvEd', root); const L = { cls: {}, tch: {}, cell: {}, ...(ds.links || {}) }; L.cls = { ...L.cls }; L.tch = { ...L.tch }; L.cell = { ...L.cell };
    const classes = [...new Set(ds.slots.map(x => x.c))].sort((a, b) => (allCls().find(c => c.id === a) || {}).sort - (allCls().find(c => c.id === b) || {}).sort || cName(a).localeCompare(cName(b), 'ar'));
    const teachers = [...new Set(ds.slots.map(x => x.t).filter(Boolean))].sort((a, b) => A.personName(a).localeCompare(A.personName(b), 'ar'));
    let pv = classes[0], dirty = false, tab = A.LS.get('live_tab') || 'cls'; A.LS.set('live_tab', '');
    let M = ds.meta || {}, days = M.days || [0, 1, 2, 3, 4], P = M.periods || ((A.section() || {}).periods || 7);
    const setM = n => { if (M && M.vis && n && !n.vis) n.vis = M.vis; if (M && M.fill && n && !n.fill) n.fill = M.fill; M = n; days = M.days || [0, 1, 2, 3, 4]; P = M.periods || P; const sb = $('#lvSub', box); if (sb) sb.innerHTML = subTxt(); };
    const subTxt = () => `${dAR(ds.date_from)} — ${dAR(ds.date_to)} · التوقيت: ${esc(M.schedName || '—')}${M.linked === false ? '' : ' (مرتبط)'} · ${AR(classes.length)} فصل · ${AR(ds.slots.length)} حصة`;
    const linkOf = (c, d, p, t) => L.cell[`${c}|${d}|${p}`] || L.cls[c] || (t && L.tch[t]) || '';
    box.innerHTML = `<div class="card lv-ed"><div class="head"><div class="grow"><h2 style="margin:0">${esc(ds.label)} ${ds.tag ? `<span class="pill st-submitted">${esc(ds.tag)}</span>` : ''}</h2><p class="sub" id="lvSub" style="margin:2px 0 0">${subTxt()}</p></div>
        <span class="rec-st ok" id="lvSt" role="status" aria-live="polite">${ds.published ? 'منشور' : 'مسودة — غير ظاهر بعد'}</span>
        <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn ${ds.published ? 'ghost' : 'ok'}" id="lvPub">${ds.published ? 'إيقاف النشر' : `${I.check} اعتماد ونشر`}</button><button class="btn ghost sm" id="lvDz">تصميم وطباعة</button><button class="btn ghost sm" id="lvRe">تحديث من الجدول</button><button class="btn ghost sm" id="lvDates">تعديل الفترة</button><button class="btn bad sm" id="lvDel">حذف</button></div></div>
      <div class="kpick" id="lvTab"><button data-t="edit">تعديل الحصص والإسناد</button><button data-t="cls" class="on">روابط الفصول</button><button data-t="tch">روابط المعلمين</button><button data-t="cell">رابط لحصة معينة</button><button data-t="time">التوقيت ومواعيد الحصص والفسح</button><button data-t="tn">ربط أسماء المعلمات</button><button data-t="vis">ما يظهر لولي الأمر</button><button data-t="rep">تقرير إنجاز المعلمين</button></div>
      <div id="lvBody" style="margin-top:10px"></div>
      <h3 style="margin:16px 0 6px">معاينة ما يراه ولي الأمر</h3><div class="row" style="gap:6px;margin-bottom:8px"><select class="in" id="lvPv" style="width:auto">${classes.map(c => `<option value="${c}">${esc(cName(c))}</option>`).join('')}</select></div><div id="lvPrev"></div></div>`;
    const save = async () => { const r = await api.upd('display_schedules', ds.id, { links: L }); Object.assign(ds, Array.isArray(r) ? r[0] : r, { links: L }); dirty = false; const s = $('#lvSt', box); if (s) { s.textContent = (ds.published ? 'منشور' : 'مسودة') + ' · حُفظت الروابط'; s.className = 'rec-st ok'; } };
    let tm; const later = () => { dirty = true; const s = $('#lvSt', box); if (s) { s.textContent = 'يحفظ…'; s.className = 'rec-st'; } clearTimeout(tm); tm = setTimeout(() => save().catch(e => A.toast(e.message, 'err')), 800); };
    const inp = (k, id, v, ph) => `<input class="in ${v && !urlOk(v) ? 'bad' : ''}" dir="ltr" data-${k}="${id}" value="${esc(v || '')}" placeholder="${ph || 'https://meet.google.com/…'}" aria-label="الرابط">`;
    const drawBody = () => {
      const B = $('#lvBody', box);
      if (tab === 'vis') { A.liveVisTab(ds, B, async vis => { const n = { ...(ds.meta || {}), vis }; await api.upd('display_schedules', ds.id, { meta: n }); ds.meta = n; setM(n); const st0 = $('#lvSt', box); if (st0) { st0.textContent = 'حُفظت إعدادات العرض'; st0.className = 'rec-st ok'; } drawPrev(); }); return; }
      if (tab === 'rep') { A.liveRepTab(ds, B); return; }
      if (tab === 'edit') { A.liveEditTab(ds, B, { cls: () => pv, setCls: c => { pv = c; $('#lvPv', box).value = c; drawPrev(); }, saved: () => { const st0 = $('#lvSt', box); if (st0) { st0.textContent = 'حُفظ التعديل'; st0.className = 'rec-st ok'; } const sb = $('#lvSub', box); if (sb) sb.innerHTML = subTxt(); drawPrev(); } }); return; }
      if (tab === 'cls') {
        B.innerHTML = `<p class="small muted" style="margin:0 0 8px">رابط القاعة الثابتة لكل فصل — يُستخدم لكل حصص الفصل ما لم تحدد رابطاً لحصة بعينها.</p>
          <details class="dz-det"><summary>لصق مجموعة روابط دفعة واحدة</summary><p class="small muted">سطر لكل فصل: اسم الفصل ثم الرابط (يفصل بينهما مسافة أو فاصلة أو علامة |).</p><textarea class="in" id="lvBulk" rows="4" dir="auto" placeholder="رابع ابتدائي أ | https://meet.google.com/abc-defg-hij"></textarea><button class="btn sm" id="lvBulkGo" style="margin-top:6px">تطبيق</button> <span class="small" id="lvBulkR"></span></details>
          <div class="lv-grid">${classes.map(c => `<label><span>${esc(cName(c))}</span>${inp('lc', c, L.cls[c])}</label>`).join('')}</div>`;
        $$('[data-lc]', B).forEach(i => i.oninput = () => { const v = i.value.trim(); if (v) L.cls[i.dataset.lc] = v; else delete L.cls[i.dataset.lc]; i.classList.toggle('bad', !!v && !urlOk(v)); later(); drawPrev(); });
        $('#lvBulkGo', B).onclick = () => { let n = 0, miss = []; $('#lvBulk', B).value.split('\n').map(x => x.trim()).filter(Boolean).forEach(line => { const m = line.match(/(https?:\/\/\S+)/i); if (!m) return; const nm = A.normKey(line.replace(m[1], '').replace(/[|,،\t:]+/g, ' ').trim()); const c = classes.find(id => A.normKey(cName(id)) === nm) || classes.find(id => A.normKey(cName(id)).includes(nm) || nm.includes(A.normKey(cName(id)))); if (c) { L.cls[c] = m[1]; n++; } else miss.push(nm); }); $('#lvBulkR', B).textContent = `طُبّق ${AR(n)}${miss.length ? ` · لم يُعرف: ${miss.join('، ')}` : ''}`; later(); drawBody(); drawPrev(); };
      } else if (tab === 'time') {
        const tsum = () => (M.times || []).map((t, p) => `<span><b>${AR(p + 1)}</b> <span dir="ltr">${t[0]} – ${t[1]}</span></span>${(M.breaks || []).filter(b => b.after === p + 1).map(b => `<span class="brk">☕ ${esc(b.label || 'استراحة')} <span dir="ltr">${b.from} – ${b.to}</span></span>`).join('')}`).join('');
        const bell = A.bell.bellOf(A.section()), linked = false, cs = customFrom(M), nd = (A.section() || {}).days || 5;
        B.innerHTML = `<div class="tm-sep"><span class="tm-sep-i" aria-hidden="true">⏱</span><div class="grow"><b>توقيت التعليم عن بعد — مستقل</b><span class="small">لا يتأثر بتوقيت الحضوري ولا يؤثر فيه. ${M.copiedFrom ? `نُسخ في البداية من «${esc(M.copiedFrom)}».` : ''}</span></div>
          <span class="row" style="gap:6px;flex-wrap:wrap"><select class="in" id="tmCp" aria-label="نسخ من توقيت الحضوري" style="width:auto"><option value="">نسخ من توقيت الحضوري…</option>${bell.schedules.map(x => `<option value="${x.id}">${esc(x.name)}${x.tag ? ' — ' + esc(x.tag) : ''}</option>`).join('')}</select><button class="btn ghost sm" id="tmCpGo">نسخ</button></span></div>
          ${linked ? `<div class="grid g2" style="margin-top:10px"><div class="field"><label for="tmS">الجدول الزمني</label><select class="in" id="tmS">${bell.schedules.map(x => `<option value="${x.id}" ${x.id === M.sched ? 'selected' : ''}>${esc(x.name)}${x.tag ? ' — ' + esc(x.tag) : ''}</option>`).join('')}</select></div><div class="field"><label>&nbsp;</label><button class="btn ghost sm" id="tmGo">فتح أداة التوقيت لتعديله</button></div></div><p class="small muted" style="margin:0">أي تعديل في هذا الجدول الزمني (بداية اليوم، مدة الحصة، الفسح، الأيام) يُطبَّق هنا تلقائياً، ويصل لأولياء الأمور.</p>`
          : `<div class="grid g3" style="margin-top:10px"><div class="field"><label for="tmSt">بداية اليوم</label><input class="in" type="time" id="tmSt" value="${esc(cs.start)}"></div><div class="field"><label for="tmD">مدة الحصة (دقيقة)</label><input class="in" type="number" min="10" max="120" id="tmD" value="${cs.dur}"></div><div class="field"><label for="tmP">الانتقال بين الحصص (دقيقة)</label><input class="in" type="number" min="0" max="20" id="tmP" value="${cs.pass}"></div>
            <div class="field"><label for="tmN">عدد الحصص</label><select class="in" id="tmN">${Array.from({ length: 10 }, (_, i) => `<option ${+cs.np === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div></div>
            <div class="field"><label>الأيام وحصص كل يوم</label><div class="bl-dg">${Array.from({ length: nd }, (_, d) => { const on = (cs.days || []).includes(d); return `<div class="bl-d ${on ? 'on' : ''}"><label class="chk"><input type="checkbox" data-tdy="${d}" ${on ? 'checked' : ''}> ${DAYS[d]}</label><select class="in" data-tdp="${d}" ${on ? '' : 'disabled'}>${Array.from({ length: +cs.np }, (_, i) => `<option value="${i + 1}" ${(+(cs.perDay || {})[d] || +cs.np) === i + 1 ? 'selected' : ''}>${AR(i + 1)} حصص</option>`).join('')}</select></div>`; }).join('')}</div></div>
            <div class="field"><label>الفسح والصلاة</label><div class="bl-brs">${(cs.breaks || []).map((b, i) => `<div class="bl-br"><input class="in" data-tb="${i}" data-k="label" value="${esc(b.label || '')}" placeholder="استراحة"><label>بعد الحصة <select class="in" data-tb="${i}" data-k="after">${Array.from({ length: Math.max(1, +cs.np - 1) }, (_, p) => `<option value="${p + 1}" ${+b.after === p + 1 ? 'selected' : ''}>${PER[p] || AR(p + 1)}</option>`).join('')}</select></label><label>المدة <input class="in" type="number" min="5" max="90" style="width:76px" data-tb="${i}" data-k="dur" value="${+b.dur || 15}"> د</label><button class="btn bad sm" data-tbx="${i}" aria-label="حذف">×</button></div>`).join('') || '<p class="small muted">لا توجد فسح.</p>'}</div><button class="btn ghost sm" id="tmAddB" style="margin-top:6px">+ فسحة / صلاة</button></div>
            <details class="bl-det"><summary>مدة مختلفة لحصة معينة</summary><div class="bl-pd">${Array.from({ length: +cs.np }, (_, p) => `<label><span>${PER[p] || AR(p + 1)}</span><input class="in" type="number" min="10" max="120" data-tpd="${p}" value="${(cs.perDur || {})[p] || ''}" placeholder="${cs.dur}"></label>`).join('')}</div></details>`}
          <div class="lv-tsum">${tsum()}</div>`;
        const saveMeta = async n => { if (M.vis && !n.vis) n.vis = M.vis; if (M.fill && !n.fill) n.fill = M.fill; if (M.copiedFrom && n.copiedFrom == null) n.copiedFrom = M.copiedFrom; if (M.lim && !n.lim) n.lim = M.lim; setM(n); const r = await api.upd('display_schedules', ds.id, { meta: n }); ds.meta = n; { const nf = A._liveFit ? A._liveFit(ds) : 0; if (nf) { await api.upd('display_schedules', ds.id, { slots: ds.slots, pool: ds.pool }); A.toast(`نُقلت ${AR(nf)} حصة لا تتسع في التوقيت الجديد إلى خانة الحصص أسفل الجدول`, 'warn'); } } const st0 = $('#lvSt', box); if (st0) { st0.textContent = 'حُفظ التوقيت'; st0.className = 'rec-st ok'; } drawPrev(); };
        let tt; const own = structural => { clearTimeout(tt); setM(Object.assign(metaCustom(cs), M.copiedFrom ? { copiedFrom: M.copiedFrom } : {}, M.lim ? { lim: M.lim } : {})); drawPrev(); const sm = $('.lv-tsum', B); if (sm) sm.innerHTML = tsum(); if (structural) drawBody(); tt = setTimeout(() => saveMeta(metaCustom(cs)).catch(e => A.toast(e.message, 'err')), 700); };
        const cpG = $('#tmCpGo', B); if (cpG) cpG.onclick = ev => A.run(ev.currentTarget, async () => { const id = $('#tmCp', B).value; if (!id) throw new Error('اختر توقيتاً للنسخ منه'); if (!(await A.confirmBox('سيُستبدل توقيت هذا الجدول بنسخة من التوقيت المختار. توقيت الحضوري لا يتغير. متابعة؟', 'نسخ'))) return; const src = metaFrom(id, M.lim), n = detach(src); n.copiedFrom = src.schedName; await saveMeta(n); drawBody(); });
        const tS = $('#tmS', B); if (tS) tS.onchange = () => A.run(null, async () => { await ensureBell(); await saveMeta(metaFrom(tS.value, M.lim)); drawBody(); });
        const tG = $('#tmGo', B); if (tG) tG.onclick = () => { A.LS.set('studio_t', 'bell'); A.LS.set('bell_s_' + S.sectionId, M.sched); if (V.studio && document.querySelector('.st-steps')) V.studio(document.querySelector('.st-steps').closest('main') || document.getElementById('app')); else location.hash = '#/studio'; };
        const num = (id, k) => { const i = $(id, B); if (i) i.oninput = i.onchange = () => { cs[k] = i.type === 'time' ? i.value : +i.value; own(); }; };
        num('#tmSt', 'start'); num('#tmD', 'dur'); num('#tmP', 'pass'); const tN = $('#tmN', B); if (tN) tN.onchange = () => { cs.np = +tN.value; own(true); };
        $$('[data-tdy]', B).forEach(c => c.onchange = () => { const on = $$('[data-tdy]', B).filter(x => x.checked).map(x => +x.dataset.tdy); if (!on.length) { c.checked = true; return; } cs.days = on; own(true); });
        $$('[data-tdp]', B).forEach(c => c.onchange = () => { cs.perDay = cs.perDay || {}; cs.perDay[c.dataset.tdp] = +c.value; own(); });
        $$('[data-tb]', B).forEach(i => i.oninput = i.onchange = () => { const b = cs.breaks[+i.dataset.tb]; b[i.dataset.k] = i.dataset.k === 'label' ? i.value : +i.value; own(); });
        $$('[data-tbx]', B).forEach(x => x.onclick = () => { cs.breaks.splice(+x.dataset.tbx, 1); own(true); });
        const ab = $('#tmAddB', B); if (ab) ab.onclick = () => { (cs.breaks = cs.breaks || []).push({ after: Math.min(3, Math.max(1, +cs.np - 1)), dur: 20, label: cs.breaks.length ? 'الصلاة' : 'الفسحة' }); own(true); };
        $$('[data-tpd]', B).forEach(i => i.oninput = () => { cs.perDur = cs.perDur || {}; if (i.value) cs.perDur[i.dataset.tpd] = +i.value; else delete cs.perDur[i.dataset.tpd]; own(); });
      } else if (tab === 'tn') {
        const keyOf = x => x.tn || (x.t ? 't:' + x.t : '');
        const groups = {}; ds.slots.forEach(x => { const k = keyOf(x); if (!k) return; (groups[k] = groups[k] || { k, name: x.tn || A.personName(x.t), n: 0, t: x.t || '' }).n++; });
        const staff = (S.staff || []).filter(x => x.active !== false).slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
        const gl = Object.values(groups).sort((a, b) => (a.t ? 1 : 0) - (b.t ? 1 : 0) || a.name.localeCompare(b.name, 'ar'));
        const un = gl.filter(g => !g.t).length;
        B.innerHTML = `<p class="small muted" style="margin:0 0 8px">الاسم كما ورد في الملف ← المعلمة في المنصة. الربط يجعل الحصص تظهر في «خطتي» للمعلمة، وباسمها الكامل لولي الأمر. غير المرتبطة تظهر لولي الأمر بالاسم الوارد في الملف.</p>
          <div class="notice ${un ? 'warn' : 'ok'}" style="margin-bottom:8px">${un ? `${AR(un)} من ${AR(gl.length)} اسم غير مرتبط` : 'كل الأسماء مرتبطة ✓'}</div>
          <div class="lv-grid">${gl.map(g => `<label class="${g.t ? '' : 'need'}"><span>${esc(g.name)} <span class="small muted">· ${AR(g.n)} حصة</span></span><select class="in" data-tk="${esc(g.k)}"><option value="">— غير مرتبطة —</option>${staff.map(x => `<option value="${x.id}" ${x.id === g.t ? 'selected' : ''}>${esc(x.full_name)}</option>`).join('')}</select></label>`).join('')}</div>`;
        $$('[data-tk]', B).forEach(sel => sel.onchange = () => A.run(null, async () => { const k = sel.dataset.tk, v = sel.value || null; ds.slots.forEach(x => { if (keyOf(x) === k) { if (!x.tn && x.t) x.tn = A.personName(x.t); x.t = v; } }); await api.upd('display_schedules', ds.id, { slots: ds.slots }); const st0 = $('#lvSt', box); if (st0) { st0.textContent = 'حُفظ الربط'; st0.className = 'rec-st ok'; } drawBody(); drawPrev(); }));
      } else if (tab === 'tch') {
        B.innerHTML = `<p class="small muted" style="margin:0 0 8px">اختياري: رابط خاص بالمعلم يُستخدم فقط للفصول التي ليس لها رابط.</p><div class="lv-grid">${teachers.map(t => `<label><span>${esc(A.personName(t))}</span>${inp('lt', t, L.tch[t])}</label>`).join('')}</div>`;
        $$('[data-lt]', B).forEach(i => i.oninput = () => { const v = i.value.trim(); if (v) L.tch[i.dataset.lt] = v; else delete L.tch[i.dataset.lt]; later(); drawPrev(); });
      } else {
        const c = pv; B.innerHTML = `<p class="small muted" style="margin:0 0 8px">رابط مختلف لحصة واحدة (مثل حصة مشتركة أو قاعة أخرى) — للفصل المختار في المعاينة: <b>${esc(cName(c))}</b>.</p>
          <div class="scroll"><table class="tbl lv-cells"><thead><tr><th>اليوم</th>${Array.from({ length: P }, (_, p) => `<th>${AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${days.map(d => `<tr><th>${DAYS[d]}</th>${Array.from({ length: P }, (_, p) => { const x = ds.slots.find(y => y.c === c && y.d === d && y.p === p); return `<td>${x ? `<div class="small"><b>${esc(A.subjName(x.s))}</b></div>${inp('lcell', `${c}|${d}|${p}`, L.cell[`${c}|${d}|${p}`], 'رابط خاص (اختياري)')}` : '<span class="faint">—</span>'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
        $$('[data-lcell]', B).forEach(i => i.oninput = () => { const v = i.value.trim(); if (v) L.cell[i.dataset.lcell] = v; else delete L.cell[i.dataset.lcell]; later(); drawPrev(); });
      }
    };
    // المعاينة تعيد ربط الحصص بالخطة بعد كل تعديل أو تسكين (لا يُخزَّن الربط، يُحسب دائماً من الجدول الحالي)
    let PE = [], prT = 0, sig = '';
    const drawPrev = () => { const k = JSON.stringify(ds.slots) + '|' + JSON.stringify(M.days || ''); if (k !== sig) { sig = k; clearTimeout(prT); prT = setTimeout(() => entriesOf([ds.id], [ds]).then(e => { PE = e; drawPrev0(); }), 250); } drawPrev0(); };
    const leftNote = c => { const l = (ds._planLeft || []).filter(e => e.class_id === c && ((e.topic || '').trim() || (e.homework || '').trim())); return l.length ? `<div class="le-left"><b>دروس في الخطة الأسبوعية بلا حصة عن بعد (${AR(l.length)})</b> — المادة لها حصص في الخطة أكثر من الجدول عن بعد، فبقيت آخر دروسها بلا حصة. يظهر لك وحدك:<ul>${l.map(e => `<li>${esc(A.subjName(e.subject_id))} — ${DAYS[e.day]} ح${AR(e.period + 1)}: ${esc((e.topic || e.homework || '').slice(0, 80))}</li>`).join('')}</ul></div>` : ''; };
    const drawPrev0 = () => { const c = pv, cells = ds.slots.filter(x => x.c === c).map(x => A._liveEntries ? A._liveEntries.withEntry({ c: x.c, d: x.d, p: x.p, subject: A.subjName(x.s), teacher: x.t ? A.personName(x.t) : (x.tn || ''), link: linkOf(c, x.d, x.p, x.t) }, PE, ds.id) : ({ d: x.d, p: x.p, subject: A.subjName(x.s) || x.sn, teacher: x.t ? A.personName(x.t) : (x.tn || ''), link: linkOf(c, x.d, x.p, x.t) })); $('#lvPrev', box).innerHTML = A.liveTable({ label: ds.label, tag: ds.tag, from: ds.date_from, to: ds.date_to, meta: M, cells, cls_link: L.cls[c] }, { now: null, today: today(), preview: true, owner: true }) + leftNote(c); A.bindLive($('#lvPrev', box)); };
    $$('#lvTab button', box).forEach(x => x.classList.toggle('on', x.dataset.t === tab));
    $$('#lvTab button', box).forEach(b => b.onclick = () => { tab = b.dataset.t; $$('#lvTab button', box).forEach(x => x.classList.toggle('on', x === b)); drawBody(); });
    $('#lvPv', box).onchange = e => { pv = e.target.value; drawPrev(); if (tab === 'cell') drawBody(); };
    $('#lvPub', box).onclick = ev => A.run(ev.currentTarget, async () => {
      if (dirty) await save();
      if (!ds.published) { const miss = classes.filter(c => !L.cls[c] && !ds.slots.some(x => x.c === c && (L.tch[x.t] || L.cell[`${c}|${x.d}|${x.p}`]))); if (miss.length && !(await A.confirmBox(`${A.cnt(miss.length, 'فصل', 'فصول')} بلا رابط: ${miss.map(cName).join('، ')}<br><span class="small muted">سيظهر جدولها دون زر الدخول. النشر الآن؟</span>`, 'نشر'))) return; }
      await api.upd('display_schedules', ds.id, { published: !ds.published, published_at: ds.published ? null : new Date().toISOString() });
      A.toast(ds.published ? 'أُوقف النشر' : 'نُشر الجدول — يظهر الآن لأولياء الأمور والمعلمين', 'ok'); V.live(root);
    });
    $('#lvDel', box).onclick = ev => A.run(ev.currentTarget, async () => { if (!(await A.confirmBox(`حذف «${esc(ds.label)}»؟ لا يتأثر أي جدول أو خطة.`, 'حذف', true))) return; await api.del('display_schedules', ds.id); A.LS.set('live_open', ''); V.live(root); });
    $('#lvRe', box).onclick = ev => A.run(ev.currentTarget, async () => { if (!ds.version_id) throw new Error('الجدول الأصلي لم يعد موجوداً'); if (!(await A.confirmBox('تحديث الحصص من الجدول الأصلي الآن؟ الروابط تبقى كما هي.', 'تحديث'))) return; const sl = await api.list('timetable_slots', { version_id: ds.version_id }); await api.upd('display_schedules', ds.id, { slots: sl.filter(x => x.subject_id).map(x => ({ c: x.class_id, d: x.day, p: x.period, s: x.subject_id, t: x.teacher_id || null })), meta: { ...metaFrom(M.sched, M.lim), ...(M.vis ? { vis: M.vis } : {}) } }); A.toast('حُدِّثت الحصص والتوقيت', 'ok'); V.live(root); });
    $('#lvDates', box).onclick = () => { const m = A.modal(`<h3>تعديل الفترة</h3><div class="grid g2"><div class="field"><label for="ldF">من</label><input class="in" type="date" id="ldF" value="${ds.date_from}"></div><div class="field"><label for="ldT">إلى</label><input class="in" type="date" id="ldT" value="${ds.date_to}"></div></div><div class="acts"><button class="btn" id="ldGo">حفظ</button></div>`); m.el.querySelector('#ldGo').onclick = e => A.run(e.currentTarget, async () => { const f = m.el.querySelector('#ldF').value, t = m.el.querySelector('#ldT').value; if (!f || !t || t < f) throw new Error('تحقق من التاريخين'); await api.upd('display_schedules', ds.id, { date_from: f, date_to: t }); m.close(); V.live(root); }); };
    $('#lvDz', box).onclick = () => { if (!A.ttDesign) return; const m = A.modal('<div id="dzM"></div>', { cls: 'wide xl' }); A.ttDesign(m.el.querySelector('#dzM'), { ds: { ...ds, meta: M, links: L } }); };
    drawBody(); drawPrev();
    if (M.linked !== false) { const n = detach(M); api.upd('display_schedules', ds.id, { meta: n }).then(() => { ds.meta = n; setM(n); }).catch(() => {}); }
  }

  // جدول تفاعلي مشترك (لولي الأمر وللمعاينة وللمعلم) — نفس الكود في parents.html
  A.liveTable = (...a) => window.DinaLive ? window.DinaLive.html(...a) : '';
  A.bindLive = el => window.DinaLive && window.DinaLive.bind(el);
  const hookJoin = () => { if (window.DinaLive && !window.DinaLive.onJoin) window.DinaLive.onJoin = (ds, c, d, p) => { try { if (api.rpc) api.rpc('log_live_click_staff', { p_ds: ds, p_class: c, p_day: d, p_period: p }).catch(() => {}); } catch (_) {} }; };

  // بطاقة للمعلم في «خطتي»: حصصه في الجداول الاستثنائية المنشورة السارية
  const ERR = { 'not your period': 'هذه الحصة ليست لك', 'link must start with https://': 'الرابط يجب أن يبدأ بـ https://', 'no such period': 'الحصة غير موجودة في هذا الجدول', 'not found': 'الجدول غير موجود' };
  const saveEntry = async (ds, c, d, p, v) => { if (!api.rpc) return api.ups('live_entries', [{ ds_id: ds, class_id: c, day: d, period: p, topic: v.topic.trim(), homework: v.homework.trim(), note: v.note.trim(), link: v.link, extra: v.extra || [] }], 'ds_id,class_id,day,period'); try { await api.rpc('save_live_entry', { p_ds: ds, p_class: c, p_day: d, p_period: p, p_topic: v.topic, p_homework: v.homework, p_note: v.note, p_link: v.link }); return await api.rpc('save_live_extra', { p_ds: ds, p_class: c, p_day: d, p_period: p, p_extra: v.extra || [] }); } catch (e) { throw new Error(ERR[e.message] || e.message); } };
  // أنواع العناصر الإضافية (تُعرض لولي الأمر بأيقونة ولون)
  const EX = () => (window.DinaLive && window.DinaLive.EX) || {};
  const perfTxt = pt => pt && (pt.text || '').trim() ? pt.text.trim() + ((pt.due || '').trim() ? ' — التسليم: ' + pt.due.trim() : '') : '';
  // نافذة الحصة (للمعلم): الدرس والواجب يأتيان تلقائياً من الخطة الأسبوعية — يضيف المعلم الرابط وما يشاء من عناصر
  function entryDialog(ds, c, d, p, cur, done) {
    const sl = (ds.slots || []).find(x => x.c === c && x.d === d && x.p === p) || {};
    const pl = cur.plan || null, own = cur.own || { topic: cur.topic || '', homework: cur.homework || '', note: cur.note || '' };
    const ov = !!((own.topic || '').trim() || (own.homework || '').trim() || (own.note || '').trim());
    let X = (cur.extra || []).map(x => ({ ...x }));
    const stP = pl ? (pl.status === 'approved' ? '<span class="pill st-approved">معتمدة — تظهر لولي الأمر</span>' : '<span class="pill st-submitted">تظهر لولي الأمر بعد اعتماد الخطة</span>') : '';
    const PC = { topic: '#005499', homework: '#B7791F', note: '#6B4FA3', perf: '#2E8B57' }; const pRow = (k, l, v) => v ? `<div class="le-pr" style="--c:${PC[k]}"><b>${l}</b><span>${esc(v)}</span></div>` : '';
    const planBox = pl && ((pl.topic || '').trim() || (pl.homework || '').trim() || (pl.note || '').trim() || perfTxt(pl.perf_task))
      ? `<div class="le-plan"><div class="le-ph"><b>من خطتك الأسبوعية</b> <span class="pill">درس ${DAYS[pl.day]} — الحصة ${PER[pl.period] || AR(pl.period + 1)}</span> <span class="small muted">يظهر تلقائياً — لا حاجة لإعادة كتابته</span> ${stP}</div>${pRow('topic', 'الدرس', pl.topic)}${pRow('homework', 'الواجب', pl.homework)}${pRow('note', 'ملاحظة', pl.note)}${pRow('perf', 'مهمة أدائية', perfTxt(pl.perf_task))}</div>`
      : `<div class="le-plan empty"><b>لا يوجد درس لهذه الحصة في خطتك الأسبوعية.</b><span class="small">أضِفه في الخطة الأسبوعية ليظهر هنا تلقائياً، أو اكتبه لهذه الحصة فقط من «تخصيص لهذه الحصة».</span></div>`;
    const m = A.modal(`<h3>حصة عن بعد — ${esc(A.subjName(sl.s))} · ${esc(cName(c))}</h3><p class="sub">${DAYS[d]} · الحصة ${PER[p] || AR(p + 1)} · ${esc(ds.label)}. الخطة الأسبوعية لا تتغير.</p>
      ${planBox}
      <div class="field le-main"><label for="leL"><span class="lv-dotk" style="--c:#0E8A9E"></span> رابط الدرس <span class="small muted">(عرض، فيديو، ورقة عمل…)</span></label><input class="in" id="leL" dir="ltr" value="${esc(cur.llink || '')}" placeholder="https://…"><span class="small muted">رابط دخول الحصة نفسه تضيفه الإدارة لكل فصل.</span></div>
      <div class="le-ex"><div class="row" style="justify-content:space-between;gap:6px;flex-wrap:wrap"><b>عناصر إضافية</b><span class="small muted">اختياري — تظهر لولي الأمر تحت الحصة</span></div><div id="leX"></div>
        <div class="le-add" id="leAdd">${Object.entries(EX()).filter(([k]) => !['topic', 'homework', 'note0'].includes(k)).map(([k, v]) => `<button type="button" class="btn ghost sm" data-xa="${k}" style="--c:${v.c}"><i></i>${esc(v.l)}</button>`).join('')}</div></div>
      <details class="dz-det le-ov" ${ov ? 'open' : ''}><summary>تخصيص الدرس والواجب لهذه الحصة فقط</summary><p class="small muted" style="margin:6px 0">يحل محل ما في الخطة في هذه الحصة عن بعد فقط، ولا يغيّر الخطة الأسبوعية. اتركه فارغاً ليظهر ما في الخطة.</p>
        <div class="field"><label for="leT">الدرس / الموضوع</label><textarea class="in" id="leT" rows="2" placeholder="${esc((pl && pl.topic) || 'مثال: الفعل الماضي ص ٤٥')}">${esc(own.topic || '')}</textarea></div>
        <div class="grid g2"><div class="field"><label for="leH">الواجب</label><input class="in" id="leH" value="${esc(own.homework || '')}" placeholder="${esc((pl && pl.homework) || 'اختياري')}"></div><div class="field"><label for="leN">ملاحظة لولي الأمر</label><input class="in" id="leN" value="${esc(own.note || '')}" placeholder="${esc((pl && pl.note) || 'اختياري')}"></div></div></details>
      <div class="acts"><button class="btn" id="leGo">حفظ</button></div>`, { cls: 'wide' });
    const el = m.el, xb = el.querySelector('#leX');
    const drawX = () => { xb.innerHTML = X.map((x, i) => { const t = EX()[x.k] || EX().other || { l: 'أخرى', c: '#5F7896' }; return `<div class="le-xr" style="--c:${t.c}"><select class="in" data-xk="${i}" aria-label="النوع">${Object.entries(EX()).filter(([k]) => !['topic', 'homework'].includes(k)).map(([k, v]) => `<option value="${k}" ${k === x.k ? 'selected' : ''}>${esc(v.l)}</option>`).join('')}</select><input class="in" data-xt="${i}" value="${esc(x.t || '')}" placeholder="${esc(t.ph || 'النص')}" aria-label="النص"><input class="in" data-xu="${i}" dir="ltr" value="${esc(x.u || '')}" placeholder="رابط (اختياري)" aria-label="رابط"><button type="button" class="btn bad sm" data-xd="${i}" aria-label="حذف">×</button></div>`; }).join('');
      $$('[data-xk]', xb).forEach(s2 => s2.onchange = () => { X[+s2.dataset.xk].k = s2.value; drawX(); });
      $$('[data-xt]', xb).forEach(s2 => s2.oninput = () => { X[+s2.dataset.xt].t = s2.value; });
      $$('[data-xu]', xb).forEach(s2 => s2.oninput = () => { X[+s2.dataset.xu].u = s2.value; });
      $$('[data-xd]', xb).forEach(b => b.onclick = () => { X.splice(+b.dataset.xd, 1); drawX(); }); };
    drawX();
    $$('[data-xa]', el).forEach(b => b.onclick = () => { if (X.length >= 12) return A.toast('الحد ١٢ عنصراً', 'warn'); X.push({ k: b.dataset.xa, t: '', u: '' }); drawX(); const l = $$('[data-xt]', xb).pop(); if (l) l.focus(); });
    el.querySelector('#leGo').onclick = e => A.run(e.currentTarget, async () => {
      const ex = X.map(x => ({ k: x.k, t: (x.t || '').trim(), u: (x.u || '').trim() })).filter(x => x.t || x.u);
      const bad = ex.find(x => x.u && !urlOk(x.u)); if (bad) throw new Error('روابط العناصر الإضافية يجب أن تبدأ بـ https://');
      const v = { topic: el.querySelector('#leT').value, homework: el.querySelector('#leH').value, note: el.querySelector('#leN').value, link: el.querySelector('#leL').value.trim(), extra: ex };
      if (v.link && !urlOk(v.link)) throw new Error('الرابط يجب أن يبدأ بـ https://');
      await saveEntry(ds.id, c, d, p, v); m.close(); A.toast('حُفظت — تظهر لولي الأمر', 'ok'); done(); });
  }
  // ربط حصص التعليم عن بعد بالخطة الأسبوعية — قراءة فقط، والخطة لا تتغير:
  // لكل فصل ومادة: دروس الخطة في أيام التعلم عن بعد مرتبةً (اليوم ثم رقم الحصة) تُرحَّل بالتسلسل على حصص المادة في الجدول عن بعد مرتبةً بالطريقة نفسها.
  // مثال: الرياضيات ٥ حصص — لو نُقلت حصة الأحد إلى الخميس، تأخذ حصص عن بعد الدروس ١ ثم ٢ ثم ٣… حسب ترتيبها في الأسبوع.
  const refWeek = ds => { const sw = s0 => { const x = A.parseDate(s0); x.setDate(x.getDate() - x.getDay()); return iso(x); }; const a = sw(ds.date_from), b = sw(ds.date_to), t = sw(today()); return t < a ? a : t > b ? b : t; };
  const remoteDays = ds => { const ws = refWeek(ds); return ((ds.meta || {}).days || [0, 1, 2, 3, 4]).filter(d => { const x = addD(ws, d); return x >= ds.date_from && x <= ds.date_to; }); };
  A._livePlanMap = (ds, P) => {
    const days = remoteDays(ds), out = {}, by = {};
    (ds.slots || []).filter(x => x.s && days.includes(x.d)).sort((a, b) => a.d - b.d || a.p - b.p).forEach(x => { (by[x.c + '|' + x.s] = by[x.c + '|' + x.s] || []).push(x); });
    const pl = {}; (P || []).filter(e => e.subject_id && days.includes(e.day)).sort((a, b) => a.day - b.day || a.period - b.period).forEach(e => { (pl[e.class_id + '|' + e.subject_id] = pl[e.class_id + '|' + e.subject_id] || []).push(e); });
    const left = [];
    Object.entries(by).forEach(([k, l]) => { const q = pl[k] || []; l.forEach((x, i) => { if (q[i]) out[`${x.c}|${x.d}|${x.p}`] = q[i]; }); q.slice(l.length).forEach(e => left.push(e)); });
    Object.entries(pl).forEach(([k, q]) => { if (!by[k]) q.forEach(e => left.push(e)); });
    return { map: out, left };
  };
  const withPlan = async (dsl, E) => {
    const W = (S.weeks || []).filter(w => !w.archived);
    const wOf = ds => { const ws = refWeek(ds), mid = addD(ws, 3); return W.find(w => w.start_date <= mid && addD(w.start_date, 6) >= mid); };
    E.forEach(e => { if (!e.own) e.own = { topic: e.topic || '', homework: e.homework || '', note: e.note || '' }; });
    const need = new Set(); dsl.forEach(ds => { const w = wOf(ds); if (w) need.add(w.id); });
    if (!need.size) return E;
    const P = (await api.list('plan_entries', { week_id: [...need] }).catch(() => [])) || [];
    dsl.forEach(ds => { const w = wOf(ds); if (!w) return; const { map, left } = A._livePlanMap(ds, P.filter(e => e.week_id === w.id)); ds._planLeft = left;
      Object.entries(map).forEach(([k, best]) => { const [c, d, p] = k.split('|'); const x = { c, d: +d, p: +p };
        let e = E.find(y => y.ds_id === ds.id && y.class_id === x.c && y.day === x.d && y.period === x.p);
        if (!e) { e = { ds_id: ds.id, class_id: x.c, day: x.d, period: x.p, topic: '', homework: '', note: '', link: '', extra: [], own: { topic: '', homework: '', note: '' }, virtual: true }; E.push(e); }
        e.plan = best; ['topic', 'homework', 'note'].forEach(f => { e[f] = (e.own[f] || '').trim() || best[f] || ''; }); e.perf = perfTxt(best.perf_task); }); });
    return E;
  };
  const entriesOf = async (ids, dsl) => { let E = []; try { E = ids.length ? (await api.list('live_entries', { ds_id: ids })) || [] : []; } catch (_) { E = []; } try { await withPlan(dsl || ((await api.list('display_schedules', { id: ids })) || []), E); } catch (_) { } return E; };
  const withEntry = (cell, E, ds) => { const e = E.find(x => x.ds_id === ds && x.class_id === cell.c && x.day === cell.d && x.period === cell.p); return e ? { ...cell, topic: e.topic, homework: e.homework, note: e.note, llink: e.link, perf: e.perf || '', extra: e.extra || [], plan: e.plan || null, own: e.own } : cell; };
  A._liveEntries = { entriesOf, withEntry };

  // بطاقة للمعلم في «خطتي»: حصصه في الجداول الاستثنائية المنشورة السارية، مع إضافة بيانات كل حصة
  const my0 = V.my;
  if (my0) V.my = function (root) {
    const r = my0(root);
    // «جدولي»: تبويب للجدول المعتمد وتبويب لكل جدول تعليم عن بعد منشور — مع الفروق والترحيل وما ينقص
    let tabSel = null; const offCache = {};
    const offSlots = async vid => { if (offCache[vid || 'ap']) return offCache[vid || 'ap']; let v = vid; if (!v) { const vs = (await api.list('timetable_versions', { section_id: S.sectionId }).catch(() => [])) || []; v = (vs.find(x => x.status === 'approved') || {}).id; } const r = v ? ((await api.list('timetable_slots', { version_id: v, teacher_id: S.me.id }).catch(() => [])) || []).filter(x => x.subject_id && x.teacher_id === S.me.id).map(x => ({ c: x.class_id, d: x.day, p: x.period, s: x.subject_id })) : []; return (offCache[vid || 'ap'] = r); };
    const pl = p => PER[p] || AR(p + 1), at = (d, p) => `${DAYS[d]} · ${pl(p)}`;
    const offGrid = (O, meta) => { const days = (meta && meta.days) || Array.from({ length: (A.section() || {}).days || 5 }, (_, i) => i), P = Math.max((A.section() || {}).periods || 7, ...O.map(x => x.p + 1));
      if (!O.length) return A.emptyBox('لا توجد لك حصص في الجدول المعتمد');
      return `<div class="scroll"><table class="tbl ms-g"><thead><tr><th>اليوم</th>${Array.from({ length: P }, (_, p) => `<th>${pl(p)}</th>`).join('')}</tr></thead><tbody>${days.map(d => `<tr><th>${DAYS[d]}</th>${Array.from({ length: P }, (_, p) => { const x = O.find(y => y.d === d && y.p === p); return `<td>${x ? `<b>${esc(A.subjName(x.s))}</b><small>${esc(cName(x.c))}</small>` : ''}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div><p class="small muted" style="margin:6px 0 0">${AR(O.length)} حصة في الأسبوع.</p>`; };
    const compare = (ds, O, E) => {
      const R = (ds.slots || []).filter(x => x.t === S.me.id && x.s), key = x => x.c + '|' + x.s, sort = (a, b) => a.d - b.d || a.p - b.p;
      const keys = [...new Set([...O.map(key), ...R.map(key)])];
      let same = 0; const moved = [], removed = [], added = [];
      keys.forEach(k => { const o = O.filter(x => key(x) === k).sort(sort), r = R.filter(x => key(x) === k).sort(sort);
        const eq = (u, v) => u.d === v.d && u.p === v.p; const o2 = o.filter(u => { const k2 = r.findIndex(v => eq(u, v)); if (k2 < 0) return true; r.splice(k2, 1); same++; return false; });
        for (let i = 0; i < Math.max(o2.length, r.length); i++) { if (o2[i] && r[i]) moved.push([o2[i], r[i]]); else if (o2[i]) removed.push(o2[i]); else added.push(r[i]); } });
      const L = ds.links || {}, linkOf = x => (L.cell || {})[`${x.c}|${x.d}|${x.p}`] || (L.cls || {})[x.c] || (L.tch || {})[x.t] || '';
      const eOf = x => E.find(e => e.ds_id === ds.id && e.class_id === x.c && e.day === x.d && e.period === x.p) || {};
      const carry = R.slice().sort(sort).map(x => ({ x, e: eOf(x) })).filter(o => o.e.plan);
      const noLesson = R.filter(x => !((eOf(x).topic || '').trim())), notAppr = carry.filter(o => o.e.plan.status !== 'approved' && !((o.e.own || {}).topic || '').trim()), noLink = R.filter(x => !linkOf(x));
      const left = (ds._planLeft || []).filter(e => R.some(x => x.c === e.class_id && x.s === e.subject_id) || e.teacher_id === S.me.id).filter(e => (e.topic || '').trim() || (e.homework || '').trim());
      const nm = x => `<b>${esc(A.subjName(x.s))}</b> — ${esc(cName(x.c))}`;
      const li = (cls, h) => `<li class="${cls}">${h}</li>`;
      const issues = noLesson.length + notAppr.length + noLink.length + left.length;
      const sec = (ic, t, n, body, tone) => `<details class="ms-s ${tone || ''}" ${n && tone === 'warn' ? 'open' : ''}><summary><span class="ms-si" aria-hidden="true">${ic}</span><b>${t}</b><span class="ms-n">${AR(n)}</span></summary>${n ? `<ul>${body}</ul>` : '<p class="small muted">لا يوجد.</p>'}</details>`;
      return `<div class="ms-cmp"><div class="pal-k"><div class="k info"><b>${AR(O.length)}</b>حصة في المعتمد</div><div class="k info"><b>${AR(R.length)}</b>حصة عن بعد</div><div class="k ${moved.length ? 'warn' : 'ok'}"><b>${AR(moved.length)}</b>نُقل موعدها</div><div class="k ${removed.length ? 'warn' : ''}"><b>${AR(removed.length)}</b>حُذفت</div><div class="k"><b>${AR(added.length)}</b>أُضيفت</div><div class="k ${issues ? 'bad' : 'ok'}"><b>${AR(issues)}</b>${issues ? 'تحتاج إكمالاً' : 'مكتمل ✓'}</div></div>
        ${sec('⚠', 'غير مكتمل', issues, [...noLesson.map(x => li('w', `${nm(x)} · ${at(x.d, x.p)} — <span>بلا درس: أضِفه في خطتك الأسبوعية أو من «تعديل بيانات الحصة»</span>`)), ...notAppr.map(o => li('w', `${nm(o.x)} · ${at(o.x.d, o.x.p)} — <span>الخطة غير معتمدة بعد، فلا يراها ولي الأمر</span>`)), ...noLink.map(x => li('w', `${nm(x)} · ${at(x.d, x.p)} — <span>لا يوجد رابط دخول (تضيفه الإدارة)</span>`)), ...left.map(e => li('w', `<b>${esc(A.subjName(e.subject_id))}</b> — ${esc(cName(e.class_id))} · درس ${at(e.day, e.period)} في الخطة — <span>لم يجد حصة عن بعد: «${esc((e.topic || e.homework).slice(0, 60))}»</span>`))].join(''), 'warn')}
        ${sec('⇄', 'الفرق عن الجدول المعتمد', moved.length + removed.length + added.length, [...moved.map(([o, r]) => li('m', `${nm(o)} — <span class="ms-from">${at(o.d, o.p)}</span> ← <span class="ms-to">${at(r.d, r.p)}</span>`)), ...removed.map(o => li('r', `${nm(o)} — ${at(o.d, o.p)} <span class="pill st-returned">حُذفت في التعليم عن بعد</span>`)), ...added.map(r => li('a', `${nm(r)} — ${at(r.d, r.p)} <span class="pill st-approved">حصة جديدة</span>`))].join(''))}
        ${sec('↪', 'ترحيل دروس الخطة', carry.length, carry.map(({ x, e }) => li(e.plan.day === x.d && e.plan.period === x.p ? '' : 'm', `${nm(x)} · ${at(x.d, x.p)} ← <span class="ms-from">درس ${at(e.plan.day, e.plan.period)}</span>${(e.plan.topic || '').trim() ? `: ${esc(e.plan.topic.slice(0, 70))}` : ' <span class="muted">(بلا موضوع في الخطة)</span>'}`)).join(''))}
        <p class="small muted" style="margin:6px 2px 0">الترحيل بالتسلسل: الدرس الأول للمادة في الأسبوع ← أول حصة لها عن بعد، وهكذا. الخطة الأسبوعية لا تتغير.</p></div>`;
    };
    const paint = async () => { try {
      const t = today(), l = (await api.list('display_schedules', { section_id: S.sectionId })).filter(d => d.published && d.date_to >= t && d.date_from <= addD(t, 7)); const old = $('#lvMy', root);
      const anchor = $('#myMode', root) || $('.head', root); if (!anchor) return;
      const mineL = l.filter(d => (d.slots || []).some(x => x.t === S.me.id));
      if (!mineL.length) { if (old) old.remove(); return; }
      const E = await entriesOf(mineL.map(d => d.id), mineL);
      const O0 = await offSlots(null);
      if (!tabSel || (tabSel !== 'off' && !mineL.some(d => d.id === tabSel))) tabSel = mineL[0].id;
      const box = old || (anchor.insertAdjacentHTML('afterend', '<div id="lvMy"></div>'), $('#lvMy', root));
      const keep = box.querySelector('.lv-days .on'), keepD = keep && keep.dataset.lvd;
      const tabs = `<div class="ms-tabs" role="tablist" aria-label="جداولي"><button type="button" role="tab" data-mst="off" class="${tabSel === 'off' ? 'on' : ''}" aria-selected="${tabSel === 'off'}"><span aria-hidden="true">📘</span> الجدول المعتمد</button>${mineL.map(d => `<button type="button" role="tab" data-mst="${d.id}" class="${tabSel === d.id ? 'on' : ''}" aria-selected="${tabSel === d.id}"><span aria-hidden="true">💻</span> ${esc(d.label)}<small>${esc(d.date_from)} — ${esc(d.date_to)}</small></button>`).join('')}</div>`;
      let body = '';
      if (tabSel === 'off') body = `<div class="card ms-off"><h3 style="margin:0 0 8px">الجدول المعتمد — حصصي</h3>${offGrid(O0)}</div>`;
      else { const d = mineL.find(x => x.id === tabSel); const O = d.version_id ? await offSlots(d.version_id) : O0; const L = d.links || {}; const cells = (d.slots || []).filter(x => x.t === S.me.id).map(x => withEntry({ c: x.c, d: x.d, p: x.p, subject: A.subjName(x.s) + ' — ' + cName(x.c), teacher: '', link: (L.cell || {})[`${x.c}|${x.d}|${x.p}`] || (L.cls || {})[x.c] || (L.tch || {})[x.t] || '' }, E, d.id));
        body = A.liveTable({ id: d.id, label: d.label, tag: d.tag, from: d.date_from, to: d.date_to, meta: d.meta, cells }, { today: t, now: null, teacher: true, edit: true }) + compare(d, O, E); }
      box.innerHTML = `<section class="ms-wrap" aria-label="جداولي">${tabs}${body}</section>`; hookJoin(); A.bindLive(box);
      $$('[data-mst]', box).forEach(b => b.onclick = () => { tabSel = b.dataset.mst; paint(); });
      if (keepD) { const b = box.querySelector(`[data-lvd="${keepD}"]`); if (b) b.click(); }
      box.querySelectorAll('[data-lved]').forEach(b => b.onclick = () => { const [ds, c, d, p] = b.dataset.lved.split('|'); const dsr = l.find(x => x.id === ds); const cur = withEntry({ c, d: +d, p: +p }, E, ds); entryDialog(dsr, c, +d, +p, cur, paint); });
    } catch (e) { console.warn(e); } };
    paint();
    return r;
  };
})();
