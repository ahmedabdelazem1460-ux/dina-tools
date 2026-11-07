/* منصة دينا — التحضير من الجدول
   في صفحة المعلم: جدول حصصه الأسبوعي؛ بالضغط على أي حصة يحضّرها سريعاً (كل الخانات اختيارية): الدرس، الأهداف، الواجب، المهمة الأدائية،
   مصادر وروابط، صور وملفات، اختبار أو ورقة عمل — ويُربط تلقائياً بالخطة الأسبوعية (الموضوع والواجب والمهمة الأدائية) وبالتحضير.
   وبالضغط على المادة تظهر حصصها الأسبوعية فيحضّرها دفعة واحدة. مع مؤشر: الحصص المحضَّرة، الواجبات، المهام، الاختبارات، الملفات. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR, DAYS, PER, I } = A;
  const gk = c => c ? `${c.stage}|${c.grade_word}` : '';
  const cName = id => (A.cls(id) || {}).name || '';
  const base = () => location.href.split('#')[0].replace(/[^/]*$/, '');
  const KQ = { quiz: 'اختبار قصير', worksheet: 'ورقة عمل', homework: 'واجب إلكتروني', remedial: 'ورقة دعم علاجية' };
  let P = null; // { at, preps, quizzes }
  async function loadP(force) {
    if (!force && P && P.week === S.weekId && Date.now() - P.at < 60000) return P;
    const [preps, quizzes] = await Promise.all([
      api.list('lesson_preps', { school_id: S.school.id, kind: 'mine', created_by: S.me.id }, { order: 'updated_at', desc: true }).catch(() => []),
      api.list('quizzes', { school_id: S.school.id, teacher_id: S.me.id }, { order: 'created_at', desc: true }).catch(() => [])]);
    P = { at: Date.now(), week: S.weekId, preps, quizzes }; return P;
  }
  const myEntries = () => S.entries.filter(e => e.teacher_id === S.me.id && e.subject_id).sort((a, b) => a.day - b.day || a.period - b.period);
  const prepOf = e => (P.preps || []).find(x => ((x.data || {}).links || []).some(l => l.e === e.id));
  const ptxt = e => e.perf_task && (e.perf_task.text || '').trim();
  const isPrepared = e => !!prepOf(e);

  function stats(L) {
    const pr = L.filter(isPrepared), linked = new Set(); L.forEach(e => { const x = prepOf(e); if (x) linked.add(x.id); });
    const X = [...linked].map(id => P.preps.find(p => p.id === id));
    const hw = L.filter(e => (e.homework || '').trim()).length, pt = L.filter(ptxt).length;
    const qz = new Set(); X.forEach(x => ((x.data || {}).quiz_ids || []).forEach(q => qz.add(q))); (P.quizzes || []).filter(z => z.week_id && z.week_id === S.weekId).forEach(z => qz.add(z.id));
    const files = X.reduce((a, x) => a + ((x.data || {}).files || []).length, 0), res = X.reduce((a, x) => a + ((x.data || {}).resources || []).length, 0);
    return { n: L.length, pr: pr.length, hw, pt, qz: qz.size, files, res };
  }

  // ---------- لوحة «جدولي والتحضير» ----------
  A.myPrepBoard = async function (el, opts) {
    if (!el || !S.me) return; const L = myEntries(); if (!L.length) { el.innerHTML = ''; return; }
    await loadP(); if (!document.body.contains(el)) return;
    const sec = A.section() || {}, days = [...new Set(L.map(e => e.day))].sort(), Pn = Math.max(...L.map(e => e.period)) + 1;
    const st = stats(L), pct = st.n ? Math.round(100 * st.pr / st.n) : 0;
    const groups = {}; L.forEach(e => { const c = A.cls(e.class_id); const k = e.subject_id + '|' + gk(c); (groups[k] = groups[k] || { s: e.subject_id, g: gk(c), L: [] }).L.push(e); });
    const cellOf = (d, p) => L.filter(e => e.day === d && e.period === p);
    const cellBtn = e => { const d = e.day, p = e.period, x = prepOf(e), h = (e.homework || '').trim(), t = ptxt(e), q = x && ((x.data || {}).quiz_ids || []).length, f = x && (((x.data || {}).files || []).length + ((x.data || {}).resources || []).length); return `<button type="button" class="pb-c ${x ? 'ok' : (e.topic || '').trim() ? 'part' : ''}" data-pe="${e.id}" aria-label="تحضير ${esc(A.subjName(e.subject_id))} ${esc(cName(e.class_id))} ${DAYS[d]} الحصة ${p + 1}"><b>${esc(A.subjName(e.subject_id))}</b><span>${esc(cName(e.class_id))}</span>${(e.topic || '').trim() ? `<i>${esc(e.topic.slice(0, 26))}</i>` : ''}<em>${x ? '<u title="محضَّرة">✓</u>' : ''}${h ? '<u title="واجب">و</u>' : ''}${t ? '<u title="مهمة أدائية">م</u>' : ''}${q ? '<u title="اختبار">خ</u>' : ''}${f ? `<u title="ملفات ومصادر">${AR(f)}</u>` : ''}</em></button>`; };
    el.innerHTML = `<section class="sec-box pb-w" aria-label="جدولي والتحضير"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><b>${A.I.prep || ''} جدولي والتحضير</b><span class="small muted">اضغط على الحصة لتحضيرها، أو على المادة لتحضير حصصها الأسبوعية</span></div>
      <div class="pb-k"><div class="pb-m"><div class="pb-ring" style="--p:${pct}"><b>${AR(pct)}٪</b></div><span>محضَّرة<br><b>${AR(st.pr)} من ${AR(st.n)}</b> حصة</span></div>
        <div class="k"><b>${AR(st.hw)}</b>واجب</div><div class="k"><b>${AR(st.pt)}</b>مهمة أدائية</div><div class="k"><b>${AR(st.qz)}</b>اختبار / ورقة عمل</div><div class="k"><b>${AR(st.files + st.res)}</b>ملف ومصدر</div></div>
      <div class="pb-subj">${Object.values(groups).map(g => { const n = g.L.length, d = g.L.filter(isPrepared).length; return `<button type="button" class="pb-sb ${d === n ? 'ok' : ''}" data-sb="${g.s}|${g.g}"><b>${esc(A.subjName(g.s))}</b><span>${esc(A.gradeName(...g.g.split('|').reverse()))}</span><small>${A.cnt(n, 'حصة', 'حصص')} · محضَّر ${AR(d)}</small></button>`; }).join('')}</div>
      <div class="pb-mob">${days.map(d => `<div class="pb-day"><b>${DAYS[d]}</b><div class="pb-dl">${L.filter(e => e.day === d).map(e => `<div class="pb-pi"><span>${PER[e.period] || AR(e.period + 1)}</span>${cellBtn(e)}</div>`).join('')}</div></div>`).join('')}</div><div class="scroll pb-desk"><table class="pb-g"><thead><tr><th></th>${Array.from({ length: Pn }, (_, p) => `<th>${PER[p] || AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${days.map(d => `<tr><th>${DAYS[d]}</th>${Array.from({ length: Pn }, (_, p) => { const es = cellOf(d, p); if (!es.length) return '<td class="pb-e"></td>'; return `<td>${es.map(cellBtn).join('')}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="small muted" style="margin:6px 0 0">✓ محضَّرة · و واجب · م مهمة أدائية · خ اختبار/ورقة عمل · الرقم = ملفات ومصادر. ${A.prepEditor ? '' : ''}</p></section>`;
    const re = () => A.myPrepBoard(el, opts);
    $$('[data-pe]', el).forEach(b => b.onclick = () => quick([L.find(e => e.id === b.dataset.pe)], re));
    $$('[data-sb]', el).forEach(b => b.onclick = () => { const [s, ...g] = b.dataset.sb.split('|'); subjDialog(s, g.join('|'), re); });
  };

  // ---------- المادة: الحصص الأسبوعية ----------
  function subjDialog(subj, grade, done) {
    const L = myEntries().filter(e => e.subject_id === subj && gk(A.cls(e.class_id)) === grade);
    const byC = {}; L.forEach(e => (byC[e.class_id] = byC[e.class_id] || []).push(e));
    const m = A.modal(`<h3>${esc(A.subjName(subj))} — ${esc(A.gradeName(...grade.split('|').reverse()))}</h3>
      <p class="sub">${A.cnt(L.length, 'حصة', 'حصص')} هذا الأسبوع: ${Object.entries(byC).map(([c, l]) => `${esc(cName(c))} (${AR(l.length)})`).join(' · ')} — محضَّر ${AR(L.filter(isPrepared).length)}.</p>
      <div class="row" style="gap:6px;margin-bottom:6px;flex-wrap:wrap"><button class="btn ghost sm" id="sdA" type="button">تحديد الكل</button><button class="btn ghost sm" id="sdN" type="button">غير المحضَّرة فقط</button></div>
      <div class="perm-grid">${L.map(e => { const x = prepOf(e); return `<label class="chk"><input type="checkbox" value="${e.id}" ${x ? '' : 'checked'}> ${DAYS[e.day]} · الحصة ${AR(e.period + 1)} · ${esc(cName(e.class_id))} ${x ? `<span class="pill st-approved">محضَّرة: ${esc((x.lesson || '').slice(0, 24))}</span>` : (e.topic || '').trim() ? `<span class="small muted">(${esc(e.topic.slice(0, 24))})</span>` : ''}</label>`; }).join('')}</div>
      <p class="small muted">تحضير واحد للحصص المحددة (درس واحد يُدرَّس لعدة فصول، أو عدة حصص للدرس نفسه). يمكنك بعد ذلك فتح أي حصة وتعديلها منفردة.</p>
      <div class="acts"><button class="btn ok" id="sdGo">تحضير المحدد</button></div>`, { cls: 'wide' });
    const ch = () => $$('.perm-grid input', m.el);
    m.el.querySelector('#sdA').onclick = () => ch().forEach(i => i.checked = true);
    m.el.querySelector('#sdN').onclick = () => ch().forEach(i => i.checked = !isPrepared(L.find(e => e.id === i.value)));
    m.el.querySelector('#sdGo').onclick = () => { const ids = ch().filter(i => i.checked).map(i => i.value); if (!ids.length) return A.toast('حدّد حصة', 'err'); m.close(); quick(L.filter(e => ids.includes(e.id)), done); };
  }

  // ---------- التحضير السريع ----------
  async function quick(ES, done) {
    await loadP(); const e0 = ES[0], c0 = A.cls(e0.class_id), x = prepOf(e0);
    const D = JSON.parse(JSON.stringify((x && x.data) || {})); D.resources = D.resources || []; D.files = D.files || []; D.quiz_ids = D.quiz_ids || [];
    const F = { lesson: x ? x.lesson : (e0.topic || '').trim(), unit: x ? x.unit : '', lesson_id: x ? x.lesson_id : null, objectives: D.objectives || '', homework: D.homework || (e0.homework || ''), perf: D.perf_task || ptxt(e0) || '', perfType: (e0.perf_task || {}).type || '', notes: D.notes || '' };
    let CUR = []; try { CUR = await api.list('curriculum', { school_id: S.school.id, subject_id: e0.subject_id, grade_key: gk(c0) }, { order: 'sort' }); } catch (_) { }
    const myQ = (P.quizzes || []).filter(z => z.subject_id === e0.subject_id && (!z.grade_key || z.grade_key === gk(c0)));
    const locked = ES.filter(e => e.status === 'approved');
    const m = A.modal(`<h3>تحضير ${ES.length > 1 ? AR(ES.length) + ' حصص' : 'الحصة'} — ${esc(A.subjName(e0.subject_id))}</h3>
      <p class="sub">${ES.map(e => `${DAYS[e.day]} · الحصة ${PER[e.period] || AR(e.period + 1)} · ${esc(cName(e.class_id))}`).join(' — ')}<br><span class="small">كل الخانات اختيارية — احفظ ما تريد فقط.</span></p><div id="qpB"></div>`, { cls: 'wide xl' });
    const B = m.el.querySelector('#qpB'), q = s => B.querySelector(s);
    const draw = () => {
      B.innerHTML = `<div class="grid g3"><div class="field"><label for="qpC">من دروس المنهج</label><select class="in" id="qpC"><option value="">—</option>${CUR.map(l => `<option value="${l.id}" ${l.id === F.lesson_id ? 'selected' : ''}>${esc(l.unit ? l.unit + ' — ' : '')}${esc(l.lesson)}</option>`).join('')}</select></div>
          <div class="field" style="grid-column:span 2"><label for="qpL">الدرس / الموضوع</label><input class="in" id="qpL" value="${esc(F.lesson)}" placeholder="اسم الدرس (اختياري)"></div></div>
        <div class="grid g2" style="align-items:start">
          <div class="field"><label for="qpO">الأهداف</label><textarea class="in" id="qpO" rows="3" placeholder="سطر لكل هدف">${esc(F.objectives)}</textarea>${A.prepGen ? '<button class="btn ghost sm" id="qpG" type="button">اقتراح أهداف وواجب ومهمة</button>' : ''}</div>
          <div class="field"><label for="qpH">الواجب</label><textarea class="in" id="qpH" rows="3">${esc(F.homework)}</textarea></div>
          <div class="field"><label for="qpPt">المهمة الأدائية</label><select class="in" id="qpPT" style="margin-bottom:4px"><option value="">— النوع —</option>${(A.PERF || []).map(([k, l]) => `<option value="${k}" ${F.perfType === k ? 'selected' : ''}>${l}</option>`).join('')}</select><textarea class="in" id="qpPt" rows="2">${esc(F.perf)}</textarea></div>
          <div class="field"><label for="qpN">ملاحظات</label><textarea class="in" id="qpN" rows="3">${esc(F.notes)}</textarea></div></div>
        <div class="field"><label>اختبار أو ورقة عمل أو واجب إلكتروني</label><div class="row" style="gap:6px;flex-wrap:wrap">${myQ.length ? myQ.map(z => `<label class="chk"><input type="checkbox" data-qz="${z.id}" ${D.quiz_ids.includes(z.id) ? 'checked' : ''}> ${esc(z.title)} <span class="small muted">(${KQ[z.kind] || ''}${z.status === 'published' ? '' : ' — مسودة'})</span></label>`).join('') : '<span class="small muted">لا توجد اختبارات لهذه المادة والصف بعد.</span>'}<button class="btn ghost sm" id="qpQN" type="button">إنشاء من بنك الأسئلة</button></div></div>
        <div class="field"><label>المصادر والروابط</label>${D.resources.map((r, i) => `<div class="row" style="gap:6px;margin-bottom:6px;flex-wrap:nowrap"><input class="in" data-r="${i}|t" value="${esc(r.t || '')}" placeholder="العنوان"><input class="in" dir="ltr" data-r="${i}|u" value="${esc(r.u || '')}" placeholder="https://"><button class="btn ghost sm" data-rx="${i}" type="button" aria-label="حذف">×</button></div>`).join('')}<button class="btn ghost sm" id="qpRa" type="button">${I.plus || '+'} رابط</button> <button class="btn ghost sm" id="qpRs" type="button">من مصادر المدرسة</button><div id="qpLR" class="qp-lr"></div></div>
        <div class="field"><label>صور وملفات</label><div class="qp-files">${D.files.map((f, i) => `<div class="qp-f">${/^image\//.test(f.t || '') || /^data:image/.test(f.u) ? `<img src="${esc(f.u)}" alt="${esc(f.n)}">` : '<span class="qp-ic">📄</span>'}<a href="${esc(f.u)}" target="_blank" rel="noopener" class="small">${esc(f.n)}</a><button class="btn ghost sm" data-fx="${i}" type="button" aria-label="حذف الملف">×</button></div>`).join('')}
          <label class="qp-up">${I.plus || '+'} رفع صور أو ملفات<input type="file" id="qpF" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" hidden></label></div><div id="qpUp" class="small muted" role="status"></div></div>
        <div class="sec-box" style="margin-top:6px"><label class="chk"><input type="checkbox" id="qpPl" checked> ربط بالخطة الأسبوعية — يُكتب الدرس في «الموضوع» والواجب والمهمة الأدائية في ${ES.length > 1 ? 'الحصص المحددة' : 'الحصة'}</label>
          <label class="chk"><input type="checkbox" id="qpOv"> استبدال ما كُتب سابقاً في الخطة (وإلا تُملأ الخانات الفارغة فقط)</label>
          <label class="chk"><input type="checkbox" id="qpQL" checked> إضافة رابط الاختبار المختار إلى الواجب</label>
          ${locked.length ? `<p class="small" style="color:var(--bad);margin:4px 0 0">${AR(locked.length)} حصة معتمدة لن تتغير خطتها.</p>` : ''}</div>
        <div class="acts" style="flex-wrap:wrap"><button class="btn ok" id="qpSv" type="button">حفظ وربط</button>${A.prepEditor ? '<button class="btn ghost" id="qpFull" type="button">حفظ وفتح التحضير الكامل</button>' : ''}${x ? '<button class="btn ghost" id="qpUn" type="button">فك الربط</button>' : ''}</div>`;
      const rd = () => { F.lesson = q('#qpL').value; F.objectives = q('#qpO').value; F.homework = q('#qpH').value; F.perf = q('#qpPt').value; F.perfType = q('#qpPT').value; F.notes = q('#qpN').value; };
      q('#qpC').onchange = e => { rd(); const l = CUR.find(y => y.id === e.target.value); F.lesson_id = l ? l.id : null; if (l) { F.lesson = l.lesson; F.unit = l.unit || ''; } draw(); };
      q('#qpPT').onchange = e => { rd(); const t = (A.PERF || []).find(p => p[0] === e.target.value); if (t && !F.perf.trim()) F.perf = t[2]; draw(); };
      const g = q('#qpG'); if (g) g.onclick = () => { rd(); if (!F.lesson.trim()) return A.toast('اكتب الدرس أو اختره من المنهج أولاً', 'err'); const G = A.prepGen(F.lesson, A.subjName(e0.subject_id)); if (!F.objectives.trim()) F.objectives = [].concat(G.objectives || []).join('\n'); if (!F.homework.trim()) F.homework = G.homework; if (!F.perf.trim()) F.perf = G.perf_task; draw(); };
      $$('[data-qz]', B).forEach(c => c.onchange = () => { D.quiz_ids = D.quiz_ids.filter(z => z !== c.dataset.qz); if (c.checked) D.quiz_ids.push(c.dataset.qz); });
      q('#qpQN').onclick = () => { m.close(); A.LS.set('as_s', e0.subject_id); A.LS.set('as_g', gk(c0)); A.LS.set('as_t', 'quizzes'); location.hash = '#/assess'; };
      $$('[data-r]', B).forEach(i => i.oninput = () => { const [n, k] = i.dataset.r.split('|'); D.resources[+n][k] = i.value.trim(); });
      $$('[data-rx]', B).forEach(b => b.onclick = () => { rd(); D.resources.splice(+b.dataset.rx, 1); draw(); });
      q('#qpRa').onclick = () => { rd(); D.resources.push({ t: '', u: '' }); draw(); };
      const addR = r => { rd(); if (D.resources.some(y => y.u === r.url) || D.files.some(y => y.u === r.url)) return A.toast('مضاف مسبقاً', 'warn'); if (r.kind === 'image' || r.kind === 'file' || r.file_type) D.files.push({ n: r.title, u: r.url, t: r.file_type || (r.kind === 'image' ? 'image/*' : '') }); else D.resources.push({ t: r.title, u: r.url }); draw(); A.toast('أُضيف من مصادر المدرسة', 'ok'); };
      q('#qpRs').onclick = () => { rd(); A.pickResource(e0.subject_id, e0.class_id, addR, { lesson_id: F.lesson_id, lesson: F.lesson, grade_key: gk(c0) }); };
      // مصادر الدرس نفسه في المدرسة (رفعها زملاء أو المكتبة)
      if (A.lessonResources && (F.lesson_id || F.lesson.trim())) A.lessonResources(e0.subject_id, gk(c0), F.lesson_id, F.lesson, x && x.id).then(l => { const box = q('#qpLR'); if (!box) return; l = l.filter(r => !D.resources.some(y => y.u === r.url) && !D.files.some(y => y.u === r.url)); box.innerHTML = l.length ? `<div class="small" style="margin-top:6px"><b>في مصادر المدرسة لهذا الدرس (${AR(l.length)}):</b></div>${l.slice(0, 8).map(r => `<button type="button" class="btn ghost sm" data-lr="${r.id}" title="${esc(A.personName(r.created_by) || '')}">+ ${esc(r.title.slice(0, 40))}</button>`).join(' ')}` : ''; $$('[data-lr]', box).forEach(b => b.onclick = () => addR(l.find(r => r.id === b.dataset.lr))); }).catch(() => { });
      $$('[data-fx]', B).forEach(b => b.onclick = () => { rd(); D.files.splice(+b.dataset.fx, 1); draw(); });
      q('#qpF').onchange = ev => A.run(null, async () => { rd(); const fs = [...ev.target.files]; if (!fs.length) return; const big = fs.find(f => f.size > 15e6); if (big) throw new Error(`«${big.name}» أكبر من ١٥ ميجابايت`); let k = 0; for (const f of fs) { q('#qpUp').textContent = `جارٍ الرفع ${AR(++k)} من ${AR(fs.length)}…`; const u = await api.uploadAsset(f); D.files.push({ n: f.name, u, t: f.type }); } draw(); A.toast(`رُفع ${AR(fs.length)} ملف`, 'ok'); });
      const save = async () => {
        rd(); D.resources = D.resources.filter(r => r.u); D.objectives = F.objectives; D.homework = F.homework; D.perf_task = F.perf; D.notes = F.notes; D.periods = ES.length;
        const links = ES.map(e => ({ w: e.week_id, e: e.id, c: e.class_id, d: e.day, p: e.period }));
        // حصة كانت مربوطة بتحضير آخر تُفك منه أولاً
        for (const e of ES) { const o = prepOf(e); if (o && (!x || o.id !== x.id)) { const ol = ((o.data || {}).links || []).filter(l => l.e !== e.id); await api.upd('lesson_preps', o.id, { data: { ...o.data, links: ol }, updated_at: new Date().toISOString() }); o.data = { ...o.data, links: ol }; } }
        D.links = x ? [...((D.links || []).filter(l => !ES.some(e => e.id === l.e))), ...links] : links;
        const title = F.lesson.trim() || `تحضير ${A.subjName(e0.subject_id)} — ${DAYS[e0.day]} الحصة ${e0.period + 1}`;
        const row = { subject_id: e0.subject_id, grade_key: gk(c0), lesson_id: F.lesson_id, unit: F.unit || '', lesson: title, data: D, updated_at: new Date().toISOString() };
        let saved; if (x) saved = await api.upd('lesson_preps', x.id, row); else saved = (await api.ins('lesson_preps', { ...row, school_id: S.school.id, kind: 'mine' }))[0];
        if (A.syncPrepRes) await A.syncPrepRes(saved && saved.id ? saved : { ...x, ...row });
        let n = 0;
        if (q('#qpPl').checked) { const ov = q('#qpOv').checked, ql = q('#qpQL').checked; const qz = (P.quizzes || []).filter(z => D.quiz_ids.includes(z.id) && z.status === 'published');
          const hwFull = [F.homework.trim(), ...(ql ? qz.map(z => `${KQ[z.kind] || 'اختبار'}: ${base()}student.html?q=${z.code}`) : [])].filter(Boolean).join('\n');
          for (const e of ES) { if (e.status === 'approved') continue; const patch = {};
            if (F.lesson.trim() && (ov || !(e.topic || '').trim())) patch.topic = F.lesson.trim();
            if (hwFull && (ov || !(e.homework || '').trim())) patch.homework = hwFull;
            if (F.perf.trim() && (ov || !ptxt(e))) patch.perf_task = { ...(e.perf_task || {}), type: F.perfType || (e.perf_task || {}).type || '', text: F.perf.trim() };
            if (!Object.keys(patch).length) continue; const r = await api.saveEntry(e.id, patch); Object.assign(e, r); n++; } }
        await loadP(true); return { saved, n };
      };
      q('#qpSv').onclick = ev => A.run(ev.currentTarget, async () => { const r = await save(); m.close(); A.toast(r.n ? `حُفظ التحضير وأُضيف إلى ${A.cnt(r.n, 'حصة', 'حصص')} في الخطة` : 'حُفظ التحضير', 'ok'); done && done(); });
      const fu = q('#qpFull'); if (fu) fu.onclick = ev => A.run(ev.currentTarget, async () => { const r = await save(); m.close(); A.prepEditor(r.saved, () => { loadP(true).then(() => done && done()); }); });
      const un = q('#qpUn'); if (un) un.onclick = ev => A.run(ev.currentTarget, async () => { const ol = ((x.data || {}).links || []).filter(l => !ES.some(e => e.id === l.e)); await api.upd('lesson_preps', x.id, { data: { ...x.data, links: ol }, updated_at: new Date().toISOString() }); await loadP(true); m.close(); A.toast('فُكّ الربط — التحضير باقٍ في «تحضيراتي»، والخطة لم تتغير', 'ok'); done && done(); });
    };
    draw();
  }
  A.quickPrep = quick;

  // في صفحة التحضير: اللوحة أعلى «تحضيراتي»
  const p0 = V.prep;
  if (p0) V.prep = async function (root) { await p0.apply(this, arguments); try { if ((A.LS.get('pp_t') || 'mine') === 'mine' && myEntries().length) { const k = $('#ppT', root); if (k && !$('#ppBoard', root)) { const d = document.createElement('div'); d.id = 'ppBoard'; d.style.marginTop = '10px'; k.insertAdjacentElement('afterend', d); A.myPrepBoard(d); } } } catch (_) { } };
})();
