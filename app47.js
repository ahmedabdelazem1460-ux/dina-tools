/* منصة دينا — (١) خانة الواجب المخصصة: نوع الواجب، أنواع الأسئلة، التمايز، المرجع والتسليم والزمن
               (٢) تقارير التحضير: لكل المعلمين حسب القسم والمرحلة أو لمعلم واحد — عناصر التحضير وأرقامه ونسب الإنجاز والواجبات، مع الدمج بتقارير أخرى
   قراءة فقط في التقارير؛ لا يغيّر شيئاً مما أدخله المعلمون. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;

  // ===================== (١) خانة الواجب =====================
  const HWT = ['حل من الكتاب', 'ورقة عمل', 'واجب إلكتروني', 'قراءة', 'تلخيص', 'حفظ وتسميع', 'بحث / تقرير', 'مشروع', 'نشاط أو تجربة منزلية', 'تصميم / رسم / خريطة ذهنية', 'مراجعة واستعداد'];
  const QT = ['اختيار من متعدد', 'صح وخطأ', 'أكمل الفراغ', 'توصيل', 'ترتيب', 'إجابة قصيرة', 'مقالي', 'علّل', 'قارن', 'صنّف', 'استنتج', 'مسألة / تطبيق', 'رسم أو تخطيط'];
  const LV = ['للجميع', 'علاجي', 'إثرائي', 'اختياري'];
  const DUE = ['الحصة القادمة', 'اليوم التالي', 'بعد يومين', 'نهاية الأسبوع'];
  A.HW_TYPES = HWT; A.HW_QTYPES = QT;
  const chips = (list, sel, k, ro) => `<div class="pp-chips hw-c">${list.map(s => `<label class="${sel.includes(s) ? 'on' : ''}"><input type="checkbox" data-${k}="${esc(s)}" ${sel.includes(s) ? 'checked' : ''} ${ro ? 'disabled' : ''}> ${esc(s)}</label>`).join('')}</div>`;
  A.hwBox = function (D, opt = {}) {
    const H = D.hw = Object.assign({ types: [], q: [], lv: [], ref: '', due: '', mins: '' }, D.hw || {}); const ro = !!opt.ro, id = opt.id || 'hwT';
    return `<div class="hw-box"><div class="hw-h"><span class="hw-i" aria-hidden="true">📚</span><div><b>الواجب</b><small>نوّع الواجب وحدّد أنواع أسئلته — يظهر النص لولي الأمر في الخطة</small></div></div>
      <textarea class="in" id="${id}" rows="3" ${ro ? 'disabled' : ''} placeholder="نص الواجب كما يظهر للطالب وولي الأمر">${esc(D.homework || '')}</textarea>
      <div class="hw-g"><span class="hw-l">نوع الواجب</span>${chips(HWT, H.types, 'hwt', ro)}</div>
      <div class="hw-g"><span class="hw-l">أنواع الأسئلة</span>${chips(QT, H.q, 'hwq', ro)}</div>
      <div class="hw-g"><span class="hw-l">التمايز</span>${chips(LV, H.lv, 'hwl', ro)}</div>
      <div class="grid g3 hw-m"><div class="field"><label>المرجع (صفحات أو رابط)</label><input class="in" data-hwf="ref" value="${esc(H.ref)}" ${ro ? 'disabled' : ''} placeholder="مثال: ص ٤٥ – ٤٦"></div>
        <div class="field"><label>التسليم</label><select class="in" data-hwf="due" ${ro ? 'disabled' : ''}><option value="">—</option>${DUE.map(d => `<option ${H.due === d ? 'selected' : ''}>${d}</option>`).join('')}</select></div>
        <div class="field"><label>الزمن المتوقع (دقيقة)</label><input class="in" type="number" min="0" max="240" data-hwf="mins" value="${esc(H.mins)}" ${ro ? 'disabled' : ''}></div></div>
      ${ro ? '' : `<button type="button" class="btn ghost sm" data-hwgen>✨ صياغة الواجب من الاختيارات</button>`}</div>`;
  };
  A.hwBind = function (el, D, onText) {
    const H = D.hw; const tx = el.querySelector('.hw-box textarea');
    const tog = (k, arr) => $$(`[data-${k}]`, el).forEach(i => i.onchange = () => { const v = i.dataset[k]; const a = H[arr]; const ix = a.indexOf(v); if (i.checked && ix < 0) a.push(v); if (!i.checked && ix >= 0) a.splice(ix, 1); i.parentElement.classList.toggle('on', i.checked); });
    tog('hwt', 'types'); tog('hwq', 'q'); tog('hwl', 'lv');
    $$('[data-hwf]', el).forEach(i => i.oninput = i.onchange = () => { H[i.dataset.hwf] = i.value; });
    if (tx) tx.oninput = () => { D.homework = tx.value; if (onText) onText(tx.value); };
    const g = el.querySelector('[data-hwgen]'); if (g) g.onclick = () => {
      if (!H.types.length && !H.q.length) return A.toast('اختر نوع الواجب أو أنواع الأسئلة أولاً', 'warn');
      const parts = []; parts.push((H.types.length ? H.types.join(' + ') : 'واجب') + (H.ref ? ' ' + H.ref : ''));
      if (H.q.length) parts.push('الأسئلة: ' + H.q.join('، '));
      if (H.lv.length && !(H.lv.length === 1 && H.lv[0] === 'للجميع')) parts.push('(' + H.lv.join(' / ') + ')');
      if (H.due) parts.push('التسليم: ' + H.due); if (H.mins) parts.push('الزمن: ' + AR(H.mins) + ' دقيقة');
      const s = parts.join(' — '); tx.value = (tx.value.trim() ? tx.value.trim() + '\n' : '') + s; D.homework = tx.value; if (onText) onText(tx.value); };
  };

  // ===================== (٢) تقارير التحضير =====================
  const EL = [['objectives', 'الأهداف'], ['warmup', 'التمهيد'], ['strategies', 'الاستراتيجيات'], ['tools', 'الوسائل'], ['activities', 'سير الدرس'], ['assessment', 'التقويم'], ['homework', 'الواجب'], ['perf_task', 'المهمة الأدائية'], ['enrichment', 'الإثراء'], ['remedial', 'العلاج والدعم'], ['resources', 'المصادر والملفات'], ['quiz', 'اختبار / واجب إلكتروني']];
  const has = (D, k) => { D = D || {}; if (k === 'resources') return (D.resources || []).some(r => r && (r.u || r.t)) || (D.files || []).length > 0; if (k === 'quiz') return (D.quiz_ids || []).length > 0; if (k === 'activities') return (D.activities || []).some(a => a && ((a.t || '').trim() || (a.d || a.x || '').toString().trim())); const v = D[k]; return Array.isArray(v) ? v.length > 0 : !!String(v || '').trim(); };
  const pct = (a, b) => b ? Math.round(a * 100 / b) : 0;
  const tone = p => p >= 85 ? 'ok' : p >= 60 ? 'mid' : p > 0 ? 'low' : 'zero';
  const MERGE = [['plan', 'إنجاز الخطة الأسبوعية'], ['appr', 'الاعتماد'], ['exec', 'التنفيذ اليومي'], ['quiz', 'الاختبارات والواجبات الإلكترونية'], ['res', 'المصادر']];

  async function repPrep(root) {
    const st = Object.assign({ stage: '', teacher: '', from: '', to: '', merge: ['plan'] }, (() => { try { return JSON.parse(A.LS.get('rep_prep') || '{}'); } catch (_) { return {}; } })());
    const WK = (S.weeks || []).filter(w => !w.archived).sort((a, b) => a.number - b.number); const cw = A.week() || WK[WK.length - 1];
    if (!st.from || !WK.some(w => w.id === st.from)) st.from = cw && cw.id; if (!st.to || !WK.some(w => w.id === st.to)) st.to = cw && cw.id;
    const cls = S.allClasses || [], stages = [...new Set(cls.map(c => c.stage).filter(Boolean))];
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">تقارير التحضير — ${esc(A.section().name)}</h2><p class="sub" style="margin:2px 0 0">عناصر التحضير وأرقامه ونسب إنجازه والواجبات، لكل المعلمين أو حسب المرحلة أو لمعلم واحد. القسم من القائمة العلوية.</p></div><button class="btn ghost sm" id="rpBack">كل التقارير</button></div>
      <div class="rp-f"><div class="field"><label for="rpS">المرحلة</label><select class="in" id="rpS"><option value="">كل المراحل</option>${stages.map(s => `<option ${st.stage === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
        <div class="field"><label for="rpT">المعلم</label><select class="in" id="rpT"><option value="">كل المعلمين</option></select></div>
        <div class="field"><label for="rpF">من أسبوع</label><select class="in" id="rpF">${WK.map(w => `<option value="${w.id}" ${w.id === st.from ? 'selected' : ''}>الأسبوع ${esc(w.word || AR(w.number))}</option>`).join('')}</select></div>
        <div class="field"><label for="rpTo">إلى أسبوع</label><select class="in" id="rpTo">${WK.map(w => `<option value="${w.id}" ${w.id === st.to ? 'selected' : ''}>الأسبوع ${esc(w.word || AR(w.number))}</option>`).join('')}</select></div></div>
      <div class="rp-mg"><span class="small muted">دمج مع:</span>${MERGE.map(([k, l]) => `<label class="chk"><input type="checkbox" data-mg="${k}" ${st.merge.includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}
        <span class="grow"></span><button class="btn ghost sm" id="rpX">Excel</button><button class="btn ghost sm" id="rpP">طباعة / PDF</button></div>
      <div id="rpO"><div class="spinner"></div></div></div>`;
    $('#rpBack', root).onclick = () => { A.LS.set('rep', ''); V.reports(root); };
    const save = () => A.LS.set('rep_prep', JSON.stringify(st));
    let R = null;
    const run = async () => {
      const O = $('#rpO', root); O.innerHTML = '<div class="spinner"></div>';
      const i0 = WK.findIndex(w => w.id === st.from), i1 = WK.findIndex(w => w.id === st.to); const W = WK.slice(Math.min(i0, i1), Math.max(i0, i1) + 1); const wIds = new Set(W.map(w => w.id));
      const [ES, PR, QZ, RS] = await Promise.all([api.entriesForWeeks([...wIds]).catch(() => []), api.list('lesson_preps', { school_id: S.school.id }).catch(() => []), st.merge.includes('quiz') ? api.list('quizzes', {}).catch(() => []) : [], st.merge.includes('res') ? api.list('resources', {}).catch(() => []) : []]);
      const stOf = c => (cls.find(x => x.id === c) || {}).stage || '';
      const req = (ES || []).filter(e => e.teacher_id && e.subject_id && (A.required ? A.required(e) : true) && (!st.stage || stOf(e.class_id) === st.stage));
      const tIds = [...new Set(req.map(e => e.teacher_id))].filter(t => !A.isTestStaff || !A.isTestStaff(t));
      const sel = $('#rpT', root); sel.innerHTML = `<option value="">كل المعلمين (${AR(tIds.length)})</option>` + tIds.map(t => [t, A.personName(t)]).sort((a, b) => a[1].localeCompare(b[1], 'ar')).map(([t, n]) => `<option value="${t}" ${st.teacher === t ? 'selected' : ''}>${esc(n)}</option>`).join('');
      const TS = st.teacher && tIds.includes(st.teacher) ? [st.teacher] : tIds;
      // التحاضير المرتبطة بحصص الأسابيع المختارة (أو المنشأة خلالها)
      const d0 = W[0] && W[0].start_date, d1 = W.length ? A._live ? A._live.addD(W[W.length - 1].start_date, 6) : W[W.length - 1].start_date : '';
      const linkedE = new Map(); const prepsOf = {};
      (PR || []).forEach(p => { if (!TS.includes(p.created_by)) return; const L = ((p.data || {}).links || []).filter(l => wIds.has(l.w)); const ca = String(p.updated_at || p.created_at || '').slice(0, 10);
        if (!L.length && !(ca >= d0 && ca <= d1)) return; (prepsOf[p.created_by] = prepsOf[p.created_by] || []).push(p); L.forEach(l => { if (l.e) linkedE.set(l.e, p); }); });
      const rows = TS.map(t => { const E = req.filter(e => e.teacher_id === t), P = prepsOf[t] || []; const prep = E.filter(e => linkedE.has(e.id)).length;
        const el = Object.fromEntries(EL.map(([k]) => [k, P.filter(p => has(p.data, k)).length]));
        const comp = P.length ? Math.round(P.reduce((a, p) => a + EL.filter(([k]) => has(p.data, k)).length / EL.length, 0) * 100 / P.length) : 0;
        const hwT = new Set(), hwQ = new Set(); P.forEach(p => { const h = (p.data || {}).hw || {}; (h.types || []).forEach(x => hwT.add(x)); (h.q || []).forEach(x => hwQ.add(x)); });
        const r = { t, name: A.personName(t), req: E.length, prep, pp: pct(prep, E.length), preps: P.length, lessons: new Set(P.map(p => p.lesson_id || p.lesson)).size, comp, el, hwT: [...hwT], hwQ: [...hwQ], P, hwE: E.filter(e => (e.homework || '').trim()).length };
        if (st.merge.includes('plan')) r.plan = pct(E.filter(e => A.filled ? A.filled(e) : (e.topic || '').trim()).length, E.length);
        if (st.merge.includes('appr')) r.appr = pct(E.filter(e => e.status === 'approved').length, E.length);
        if (st.merge.includes('exec')) { const x = E.filter(e => e.exec_status); r.exec = pct(x.filter(e => e.exec_status === 'done' || e.exec_status === 'modified').length, x.length); r.execN = x.length; }
        if (st.merge.includes('quiz')) r.quiz = (QZ || []).filter(z => z.teacher_id === t && String(z.created_at || '').slice(0, 10) >= d0 && String(z.created_at || '').slice(0, 10) <= d1).length;
        if (st.merge.includes('res')) r.res = (RS || []).filter(z => z.created_by === t && String(z.created_at || '').slice(0, 10) >= d0 && String(z.created_at || '').slice(0, 10) <= d1).length;
        return r; }).sort((a, b) => b.pp - a.pp || b.comp - a.comp);
      const tot = { req: rows.reduce((a, r) => a + r.req, 0), prep: rows.reduce((a, r) => a + r.prep, 0), preps: rows.reduce((a, r) => a + r.preps, 0) };
      const allP = rows.flatMap(r => r.P); const avgComp = allP.length ? Math.round(allP.reduce((a, p) => a + EL.filter(([k]) => has(p.data, k)).length / EL.length, 0) * 100 / allP.length) : 0;
      const cntBy = (f) => { const m = {}; allP.forEach(p => f(p).forEach(x => { m[x] = (m[x] || 0) + 1; })); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
      const byT = cntBy(p => ((p.data || {}).hw || {}).types || []), byQ = cntBy(p => ((p.data || {}).hw || {}).q || []);
      const wl = W.length === 1 ? `الأسبوع ${W[0].word || AR(W[0].number)}` : `الأسابيع ${W[0].word || AR(W[0].number)} — ${W[W.length - 1].word || AR(W[W.length - 1].number)}`;
      R = { rows, tot, avgComp, byT, byQ, wl, W };
      const mcols = st.merge.filter(k => k !== 'res' && k !== 'quiz' ? true : true);
      const bar = (p) => `<span class="rp-bar ${tone(p)}"><i style="width:${p}%"></i><b>${AR(p)}٪</b></span>`;
      const bars = (list, n) => list.length ? `<div class="rp-bl">${list.map(([k, v]) => `<div><span>${esc(k)}</span><i style="width:${pct(v, Math.max(1, list[0][1]))}%"></i><b>${AR(v)}</b></div>`).join('')}</div>` : `<p class="small muted">لم تُحدَّد بعد في التحاضير — تُحدَّد من خانة الواجب في التحضير.</p>`;
      O.innerHTML = `<div class="rp-kpi"><div class="k"><b>${AR(rows.length)}</b>معلم</div><div class="k"><b>${AR(tot.req)}</b>حصة مطلوبة</div><div class="k ${tone(pct(tot.prep, tot.req))}"><b>${AR(pct(tot.prep, tot.req))}٪</b>حصص محضّرة (${AR(tot.prep)})</div><div class="k"><b>${AR(tot.preps)}</b>تحضير</div><div class="k ${tone(avgComp)}"><b>${AR(avgComp)}٪</b>اكتمال عناصر التحضير</div><div class="k"><b>${AR(byT.length)}</b>نوع واجب مستخدم</div><div class="k"><b>${AR(byQ.length)}</b>نوع سؤال مستخدم</div></div>
        <h3 class="rp-h">المعلمون — ${esc(wl)}${st.stage ? ' · ' + esc(st.stage) : ''}</h3>
        <div class="scroll"><table class="tbl rp-t"><thead><tr><th>المعلم</th><th>حصص مطلوبة</th><th>محضّرة</th><th>نسبة التحضير</th><th>تحاضير</th><th>اكتمال العناصر</th><th>أنواع الواجب</th><th>أنواع الأسئلة</th>${st.merge.includes('plan') ? '<th>إنجاز الخطة</th>' : ''}${st.merge.includes('appr') ? '<th>الاعتماد</th>' : ''}${st.merge.includes('exec') ? '<th>التنفيذ</th>' : ''}${st.merge.includes('quiz') ? '<th>اختبارات</th>' : ''}${st.merge.includes('res') ? '<th>مصادر</th>' : ''}</tr></thead>
        <tbody>${rows.map(r => `<tr data-rt="${r.t}" tabindex="0"><th>${esc(r.name)}</th><td>${AR(r.req)}</td><td>${AR(r.prep)}</td><td>${bar(r.pp)}</td><td>${AR(r.preps)}</td><td>${bar(r.comp)}</td><td>${AR(r.hwT.length)}</td><td>${AR(r.hwQ.length)}</td>${st.merge.includes('plan') ? `<td>${bar(r.plan)}</td>` : ''}${st.merge.includes('appr') ? `<td>${bar(r.appr)}</td>` : ''}${st.merge.includes('exec') ? `<td>${r.execN ? bar(r.exec) : '<span class="muted">—</span>'}</td>` : ''}${st.merge.includes('quiz') ? `<td>${AR(r.quiz)}</td>` : ''}${st.merge.includes('res') ? `<td>${AR(r.res)}</td>` : ''}</tr>`).join('') || `<tr><td colspan="12">${A.emptyBox('لا توجد حصص مسندة في الاختيار')}</td></tr>`}</tbody></table></div>
        <p class="small muted">اضغط اسم المعلم لتفاصيل تحاضيره. «محضّرة» = حصص الخطة المرتبطة بتحضير.</p>
        <h3 class="rp-h">عناصر التحضير — كم تحضيراً يحوي كل عنصر</h3>
        <div class="scroll"><table class="tbl rp-heat"><thead><tr><th>المعلم</th>${EL.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${rows.filter(r => r.preps).map(r => `<tr><th>${esc(r.name)}</th>${EL.map(([k]) => { const p = pct(r.el[k], r.preps); return `<td class="h-${tone(p)}" title="${AR(r.el[k])} من ${AR(r.preps)}">${AR(r.el[k])}<small>${AR(p)}٪</small></td>`; }).join('')}</tr>`).join('')}
          <tr class="rp-sum"><th>الإجمالي</th>${EL.map(([k]) => { const n = allP.filter(p => has(p.data, k)).length, p = pct(n, allP.length); return `<td class="h-${tone(p)}">${AR(n)}<small>${AR(p)}٪</small></td>`; }).join('')}</tr></tbody></table></div>
        <div class="grid g2" style="align-items:start"><div><h3 class="rp-h">تنويع الواجبات</h3>${bars(byT)}</div><div><h3 class="rp-h">أنواع الأسئلة في الواجبات</h3>${bars(byQ)}</div></div>`;
      $$('[data-rt]', O).forEach(tr => tr.onclick = tr.onkeydown = ev => { if (ev.type === 'keydown' && ev.key !== 'Enter') return; detail(rows.find(r => r.t === tr.dataset.rt)); });
    };
    const detail = r => { if (!r) return; A.modal(`<h3>تحاضير ${esc(r.name)} — ${esc(R.wl)}</h3><p class="sub">${AR(r.preps)} تحضير · ${AR(r.prep)} من ${AR(r.req)} حصة محضّرة (${AR(r.pp)}٪) · اكتمال العناصر ${AR(r.comp)}٪</p>
      ${r.P.length ? `<div class="rp-pl">${r.P.map(p => { const D = p.data || {}, h = D.hw || {}, n = EL.filter(([k]) => has(D, k)).length; return `<div class="rp-pi"><div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap"><b>${esc(p.lesson || 'بلا عنوان')}</b><span class="small muted">${esc(A.subjName(p.subject_id) || '')} · ${AR(((D.links || []).length))} حصة مرتبطة · ${AR(n)} من ${AR(EL.length)} عنصر</span></div>
        <div class="rp-els">${EL.map(([k, l]) => `<span class="${has(D, k) ? 'y' : 'n'}">${has(D, k) ? '✓' : '·'} ${l}</span>`).join('')}</div>
        ${(D.homework || '').trim() || (h.types || []).length ? `<div class="small" style="margin-top:6px"><b>الواجب:</b> ${esc((D.homework || '').slice(0, 160))}${(h.types || []).length ? ` <span class="pill">${esc(h.types.join('، '))}</span>` : ''}${(h.q || []).length ? ` <span class="pill">${esc(h.q.join('، '))}</span>` : ''}</div>` : ''}</div>`; }).join('')}</div>` : A.emptyBox('لا توجد تحاضير في الفترة المختارة')}`, { cls: 'wide' }); };
    const sync = () => { st.stage = $('#rpS', root).value; st.teacher = $('#rpT', root).value; st.from = $('#rpF', root).value; st.to = $('#rpTo', root).value; st.merge = $$('[data-mg]', root).filter(i => i.checked).map(i => i.dataset.mg); save(); run(); };
    ['#rpS', '#rpT', '#rpF', '#rpTo'].forEach(s => $(s, root).onchange = sync); $$('[data-mg]', root).forEach(i => i.onchange = sync);
    $('#rpX', root).onclick = () => { if (!R || !window.XLSX) return A.toast('انتظر اكتمال التقرير', 'warn'); const wb = XLSX.utils.book_new();
      const add = (n, rows) => { const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{}]); ws['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws, n); };
      add('المعلمون', R.rows.map(r => ({ 'المعلم': r.name, 'حصص مطلوبة': r.req, 'محضّرة': r.prep, 'نسبة التحضير %': r.pp, 'تحاضير': r.preps, 'دروس': r.lessons, 'اكتمال العناصر %': r.comp, 'أنواع الواجب': r.hwT.join('، '), 'أنواع الأسئلة': r.hwQ.join('، '), ...(r.plan != null ? { 'إنجاز الخطة %': r.plan } : {}), ...(r.appr != null ? { 'الاعتماد %': r.appr } : {}), ...(r.exec != null ? { 'التنفيذ %': r.exec } : {}), ...(r.quiz != null ? { 'اختبارات': r.quiz } : {}), ...(r.res != null ? { 'مصادر': r.res } : {}) })));
      add('العناصر', R.rows.map(r => Object.assign({ 'المعلم': r.name, 'تحاضير': r.preps }, Object.fromEntries(EL.map(([k, l]) => [l, r.el[k]])))));
      add('التحاضير', R.rows.flatMap(r => r.P.map(p => { const D = p.data || {}, h = D.hw || {}; return Object.assign({ 'المعلم': r.name, 'المادة': A.subjName(p.subject_id) || '', 'الدرس': p.lesson || '', 'حصص مرتبطة': (D.links || []).length }, Object.fromEntries(EL.map(([k, l]) => [l, has(D, k) ? '✓' : ''])), { 'الواجب': D.homework || '', 'نوع الواجب': (h.types || []).join('، '), 'أنواع الأسئلة': (h.q || []).join('، '), 'التمايز': (h.lv || []).join('، ') }); })));
      add('الواجبات', [...R.byT.map(([k, v]) => ({ 'التصنيف': 'نوع الواجب', 'البند': k, 'العدد': v })), ...R.byQ.map(([k, v]) => ({ 'التصنيف': 'نوع السؤال', 'البند': k, 'العدد': v }))]);
      wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, `تقرير التحضير — ${A.section().name} — ${R.wl}.xlsx`); };
    $('#rpP', root).onclick = () => { if (!R) return; const O = $('#rpO', root).cloneNode(true); $$('[data-rt]', O).forEach(x => x.removeAttribute('tabindex')); A.printDoc('تقرير التحضير', `${A.section().name} · ${R.wl}${st.stage ? ' · ' + st.stage : ''}${st.teacher ? ' · ' + A.personName(st.teacher) : ''}`, `<style>${RP_CSS}</style>` + O.innerHTML, true); };
    run();
  }
  const RP_CSS = `.rp-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:10px 0}.rp-kpi .k{border:1px solid #DCE7F3;border-radius:14px;padding:10px 12px;background:#fff;font-size:12.5px;color:#4D6A8F}.rp-kpi .k b{display:block;font-size:22px;color:#082B5A}.rp-kpi .k.ok b{color:#1F7A4A}.rp-kpi .k.mid b{color:#B7791F}.rp-kpi .k.low b,.rp-kpi .k.zero b{color:#C0392B}
.rp-h{margin:16px 0 8px;font-size:15px;color:#082B5A;border-inline-start:4px solid #3AB1DB;padding-inline-start:8px}
.rp-bar{display:inline-flex;align-items:center;gap:6px;min-width:110px}.rp-bar i{display:block;height:8px;border-radius:8px;background:currentColor;flex:none;max-width:70px}.rp-bar{color:#1F7A4A}.rp-bar.mid{color:#D99A1E}.rp-bar.low,.rp-bar.zero{color:#C0392B}.rp-bar b{color:#082B5A;font-size:12.5px}
.rp-heat td{text-align:center;font-weight:800;color:#082B5A}.rp-heat td small{display:block;font-weight:500;font-size:10.5px;opacity:.8}.h-ok{background:#E3F3E9}.h-mid{background:#FFF3D6}.h-low{background:#FDE7E4}.h-zero{background:#F5F7FA;color:#9AA9BC!important}.rp-sum th,.rp-sum td{border-top:2px solid #082B5A}
.rp-bl{display:grid;gap:6px}.rp-bl div{display:grid;grid-template-columns:150px 1fr 40px;align-items:center;gap:8px;font-size:13px}.rp-bl i{display:block;height:12px;border-radius:8px;background:linear-gradient(90deg,#3AB1DB,#005499)}.rp-bl b{color:#082B5A}`;

  // تسجيل التقرير في صفحة التقارير
  const r0 = V.reports; if (r0) V.reports = function (root) {
    if (A.LS.get('rep') === 'prep') return repPrep(root);
    const res = r0.apply(this, arguments); const g = root.querySelector('.rep-grid');
    if (g && !g.querySelector('[data-r="prep"]')) { g.insertAdjacentHTML('afterbegin', `<button class="rep-card rep-new" data-r="prep"><b>تقارير التحضير</b><span class="small muted">لكل المعلمين حسب القسم والمرحلة أو لمعلم واحد: عناصر التحضير وأرقامه ونسب الإنجاز وتنويع الواجبات وأنواع الأسئلة، مع الدمج بالخطة والاعتماد والتنفيذ.</span></button>`); g.querySelector('[data-r="prep"]').onclick = () => { A.LS.set('rep', 'prep'); V.reports(root); }; }
    return res; };
  A.repPrep = repPrep;
  const css = document.createElement('style'); css.textContent = RP_CSS + `.rp-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin-top:10px}.rp-mg{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;margin:6px 0 4px}.rp-t tbody tr{cursor:pointer}.rp-t tbody tr:hover{background:#F4F9FE}.rp-t tbody tr:focus-visible{outline:3px solid #3AB1DB}.rep-new{border-color:#3AB1DB!important;box-shadow:0 0 0 3px rgba(58,177,219,.18)}
.rp-pl{display:grid;gap:8px}.rp-pi{border:1px solid #DCE7F3;border-radius:12px;padding:10px 12px}.rp-els{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}.rp-els span{font-size:11.5px;border-radius:99px;padding:2px 9px}.rp-els .y{background:#E3F3E9;color:#1F6B44}.rp-els .n{background:#F3F5F8;color:#9AA9BC}
.hw-box{border:1px solid #CFE0F2;border-radius:16px;padding:12px;background:linear-gradient(180deg,#F5FAFE,#fff);display:grid;gap:8px;grid-column:1/-1}.hw-h{display:flex;gap:10px;align-items:center}.hw-h b{display:block;color:#082B5A;font-size:15px}.hw-h small{color:#4D6A8F;font-size:12px}.hw-i{width:36px;height:36px;border-radius:11px;background:#E4EBF5;display:grid;place-items:center;font-size:18px}.hw-g{display:grid;grid-template-columns:110px 1fr;gap:8px;align-items:start}.hw-l{font-size:12.5px;font-weight:800;color:#005499;padding-top:6px}.hw-c label{font-size:12.5px}.hw-m .field{margin:0}
@media(max-width:640px){.hw-g{grid-template-columns:1fr}.rp-bl div{grid-template-columns:110px 1fr 34px}}`; document.head.appendChild(css);
})();
