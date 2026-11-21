/* منصة دينا — جودة الجدول ومقارنة النسخ V.ttquality (تبويب في استوديو الجداول، للمالك)
   يقرأ أي إصدار جدول (مسودة/معتمد/مؤرشف) أو آخر جدول مولَّد دون أي تعديل في البيانات، ويحسب:
   - القيود الإلزامية: تعارض المعلم في الحصة نفسها، حصة بلا معلم، حصص فارغة وسط يوم الفصل.
   - القيود التفضيلية بأوزان قابلة للتعديل (٠–١٠): تكرار المادة في اليوم، تباعد المادة على الأيام، فراغات المعلم، التتابع الطويل،
     توازن يوم المعلم، عدالة الحصص الأولى والأخيرة، توازن يوم الفصل، المواد الأساسية أول اليوم، عدالة الأنصبة.
   - مؤشر جودة من ١٠٠ (يُحدّ بـ٥٩ عند وجود مخالفة إلزامية)، وتفاصيل كل مخالفة، وتقرير المعلمين، ومقارنة نسختين، وطباعة وExcel.
   الأوزان: schools.settings.ttq (للمالك) + محلياً dwp_ttq. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc } = A;
  const AR = A.AR || (n => String(n));
  const DAYS = A.DAYS || ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const CRIT = [
    ['rep', 'تكرار المادة في اليوم', 'ألا تتكرر المادة للفصل أكثر من الحد في اليوم', 8],
    ['spread', 'تباعد المادة على أيام الأسبوع', 'توزيع حصص المادة على أكبر عدد من الأيام', 6],
    ['gaps', 'فراغات المعلم', 'تقليل الحصص الفارغة بين حصص المعلم في اليوم', 7],
    ['run', 'التتابع الطويل للمعلم', 'ألا يُدرّس المعلم أكثر من الحد متتالياً', 6],
    ['tbal', 'توازن يوم المعلم', 'تقارب عدد حصص المعلم بين أيامه', 4],
    ['edge', 'عدالة الحصص الأولى والأخيرة', 'توزيع الحصة الأولى والأخيرة بعدل بين المعلمين', 3],
    ['cbal', 'توازن يوم الفصل', 'تقارب عدد حصص الفصل في الأيام', 3],
    ['core', 'المواد الأساسية أول اليوم', 'وضع المواد الأساسية في النصف الأول من اليوم', 5],
    ['fair', 'عدالة الأنصبة', 'تقارب الأنصبة الأسبوعية بين المعلمين', 2]];
  const DEF = { w: Object.fromEntries(CRIT.map(c => [c[0], c[3]])), maxRep: 2, maxRun: 4, core: 'العربية، لغتي، الرياضيات، العلوم، الإنجليزية، English، Math، Science، Arabic' };
  const cfg = () => { const s = ((S.school || {}).settings || {}).ttq || {}, l = A.LS.get('dwp_ttq') || {}; return Object.assign({}, DEF, s, l, { w: Object.assign({}, DEF.w, s.w, l.w) }); };

  if (!document.getElementById('ttq-css')) { const s = document.createElement('style'); s.id = 'ttq-css'; s.textContent = `
  .tq-top{display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:center}
  @media(max-width:700px){.tq-top{grid-template-columns:1fr;justify-items:center}}
  .tq-g{width:150px;height:150px;position:relative}
  .tq-g b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;font-size:38px;color:var(--navy);line-height:1}
  .tq-g b small{font-size:12px;color:var(--muted);font-weight:700;margin-top:4px}
  .tq-hard{display:flex;gap:8px;flex-wrap:wrap}
  .tq-hard span{border-radius:12px;padding:6px 12px;font-weight:800;font-size:13px}
  .tq-hard .ok{background:#E5F4EA;color:#23704A}.tq-hard .bad{background:#FDE7E4;color:#B3261E}
  .tq-tbl td,.tq-tbl th{vertical-align:middle}
  .tq-bar{height:9px;border-radius:6px;background:#EEF2F8;overflow:hidden;min-width:70px}.tq-bar i{display:block;height:100%}
  .tq-w{width:110px;accent-color:#005499}
  .tq-d{font-size:13px;max-height:260px;overflow:auto;margin:6px 0 0;padding-inline-start:18px}
  .tq-up{color:#23704A;font-weight:800}.tq-dn{color:#B3261E;font-weight:800}
  `; document.head.appendChild(s); }

  // ---------- التحليل ----------
  function analyze(slots, o) {
    o = o || {}; const c = cfg(), sec = (A.section && A.section()) || {}, ND = +sec.days || 5, NP = +sec.periods || 7;
    const coreK = String(c.core || '').split(/[،,]/).map(x => (A.normKey ? A.normKey(x) : x.trim())).filter(Boolean);
    const sn = id => (A.subjName ? A.subjName(id) : '') || '', tn = id => (A.personName ? A.personName(id) : '') || '—', cn = id => ((A.cls && A.cls(id)) || {}).name || '';
    const isCore = id => { const k = A.normKey ? A.normKey(sn(id)) : sn(id); return coreK.some(x => x && k.includes(x)); };
    const L = (slots || []).filter(s => s.subject_id && s.day < ND && s.period < NP);
    const H = { conflict: [], noT: [], holes: [], joint: 0 }, D = {}; CRIT.forEach(k => D[k[0]] = []);
    // تعارض المعلم
    const tk = {}; L.forEach(s => { if (!s.teacher_id) return; const k = s.teacher_id + '|' + s.day + '|' + s.period; (tk[k] = tk[k] || []).push(s); });
    Object.values(tk).forEach(a => { if (a.length > 1 && new Set(a.map(s => s.subject_id)).size === 1) { H.joint = (H.joint || 0) + 1; return; } if (a.length > 1) H.conflict.push(`${tn(a[0].teacher_id)} — ${DAYS[a[0].day]} الحصة ${AR(a[0].period + 1)}: ${a.map(s => cn(s.class_id)).join(' و ')}`); });
    L.forEach(s => { if (!s.teacher_id) H.noT.push(`${cn(s.class_id)} — ${DAYS[s.day]} الحصة ${AR(s.period + 1)} (${sn(s.subject_id)})`); });
    // الفصول
    const byC = {}; L.forEach(s => (byC[s.class_id] = byC[s.class_id] || []).push(s));
    let rT = 0, rB = 0, spT = 0, spB = 0, cbT = 0, cbB = 0, coT = 0, coB = 0;
    Object.entries(byC).forEach(([cid, a]) => {
      const perDay = Array.from({ length: ND }, (_, d) => a.filter(s => s.day === d));
      perDay.forEach((x, d) => { if (!x.length) return; const ps = x.map(s => s.period).sort((p, q) => p - q); for (let p = ps[0]; p < ps[ps.length - 1]; p++) if (!ps.includes(p)) H.holes.push(`${cn(cid)} — ${DAYS[d]} الحصة ${AR(p + 1)} فارغة وسط اليوم`); });
      const subj = {}; a.forEach(s => (subj[s.subject_id] = subj[s.subject_id] || []).push(s));
      Object.entries(subj).forEach(([sid, x]) => {
        perDay.forEach((_, d) => { const n = x.filter(s => s.day === d).length; rT++; if (n > c.maxRep) { rB++; D.rep.push(`${cn(cid)}: ${sn(sid)} ${AR(n)} حصص يوم ${DAYS[d]}`); } });
        const days = new Set(x.map(s => s.day)).size, want = Math.min(x.length, ND); spT += want; spB += want - days; if (days < want) D.spread.push(`${cn(cid)}: ${sn(sid)} في ${AR(days)} أيام فقط (${AR(x.length)} حصص)`);
        if (isCore(sid)) x.forEach(s => { coT++; if (s.period >= Math.ceil(NP / 2)) { coB++; if (D.core.length < 400) D.core.push(`${cn(cid)}: ${sn(sid)} — ${DAYS[s.day]} الحصة ${AR(s.period + 1)}`); } });
      });
      const loads = perDay.map(x => x.length), mx = Math.max(...loads), mn = Math.min(...loads); cbT += mx; cbB += mx - mn; if (mx - mn > 1) D.cbal.push(`${cn(cid)}: بين ${AR(mn)} و${AR(mx)} حصص في اليوم`);
    });
    // المعلمون
    const byT = {}; L.forEach(s => { if (s.teacher_id) (byT[s.teacher_id] = byT[s.teacher_id] || []).push(s); });
    let gT = 0, gB = 0, uT = 0, uB = 0, tbT = 0, tbB = 0; const T = [];
    Object.entries(byT).forEach(([tid, a]) => {
      const r = { id: tid, name: tn(tid), n: a.length, days: 0, gaps: 0, run: 0, first: 0, last: 0, per: [] };
      for (let d = 0; d < ND; d++) {
        const ps = [...new Set(a.filter(s => s.day === d).map(s => s.period))].sort((p, q) => p - q); r.per.push(ps.length); if (!ps.length) continue; r.days++;
        const span = ps[ps.length - 1] - ps[0] + 1, g = span - ps.length; r.gaps += g; gT += Math.max(0, NP - ps.length); gB += g; if (g > 1) D.gaps.push(`${r.name} — ${DAYS[d]}: ${AR(g)} حصص فراغ`);
        let run = 1, best = 1; for (let i = 1; i < ps.length; i++) { run = ps[i] === ps[i - 1] + 1 ? run + 1 : 1; best = Math.max(best, run); } r.run = Math.max(r.run, best); uT++; if (best > c.maxRun) { uB++; D.run.push(`${r.name} — ${DAYS[d]}: ${AR(best)} حصص متتالية`); }
        if (ps[0] === 0) r.first++; if (ps[ps.length - 1] === NP - 1) r.last++;
      }
      const act = r.per.filter(Boolean), mx = Math.max(0, ...act), mn = act.length ? Math.min(...act) : 0; tbT += mx; tbB += Math.max(0, mx - mn - 1); if (mx - mn > 2) D.tbal.push(`${r.name}: بين ${AR(mn)} و${AR(mx)} حصص في أيام عمله`);
      T.push(r);
    });
    const cv = arr => { if (arr.length < 2) return 0; const m = arr.reduce((a, b) => a + b, 0) / arr.length; if (!m) return 0; return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length) / m; };
    const edgeR = T.filter(t => t.days).map(t => (t.first + t.last) / Math.max(1, t.days)), edgeCv = cv(edgeR), fairCv = cv(T.map(t => t.n));
    T.filter(t => t.days && (t.first + t.last) / t.days > 1.2).forEach(t => D.edge.push(`${t.name}: ${AR(t.first)} أولى و${AR(t.last)} أخيرة في ${AR(t.days)} أيام`));
    const avg = T.length ? T.reduce((a, t) => a + t.n, 0) / T.length : 0; T.filter(t => avg && Math.abs(t.n - avg) / avg > 0.35).forEach(t => D.fair.push(`${t.name}: ${AR(t.n)} حصة (المتوسط ${AR(Math.round(avg))})`));
    const sc = { rep: rT ? 1 - rB / rT * 4 : 1, spread: spT ? 1 - spB / spT * 2 : 1, gaps: gT ? 1 - gB / gT * 3 : 1, run: uT ? 1 - uB / uT * 2 : 1, tbal: tbT ? 1 - tbB / tbT * 2 : 1, edge: 1 - edgeCv, cbal: cbT ? 1 - cbB / cbT * 2 : 1, core: coT ? 1 - coB / coT * 1.4 : 1, fair: 1 - fairCv };
    Object.keys(sc).forEach(k => sc[k] = Math.max(0, Math.min(1, sc[k])));
    const W = c.w, sw = CRIT.reduce((a, k) => a + (+W[k[0]] || 0), 0) || 1;
    let score = Math.round(CRIT.reduce((a, k) => a + (+W[k[0]] || 0) * sc[k[0]], 0) / sw * 100);
    const soft = score, hard = H.conflict.length + H.noT.length; if (hard) score = Math.min(score, 59);
    const total = Object.keys(byC).length * ND * NP;
    return { score, soft, sc, D, H, T: T.sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar')), hard, n: L.length, fill: total ? L.length / total : 0, ND, NP };
  }
  A.ttQuality = analyze;

  const col = v => v >= 0.85 ? '#2E8B57' : v >= 0.65 ? '#C9A44C' : '#E0675A';
  const gauge = s => { const r = 62, C = 2 * Math.PI * r, f = C * s / 100; return `<div class="tq-g" role="img" aria-label="مؤشر الجودة ${s} من ١٠٠"><svg viewBox="0 0 150 150" width="150" height="150"><circle cx="75" cy="75" r="${r}" fill="none" stroke="#EEF2F8" stroke-width="14"/><circle cx="75" cy="75" r="${r}" fill="none" stroke="${col(s / 100)}" stroke-width="14" stroke-linecap="round" stroke-dasharray="${f} ${C}" transform="rotate(-90 75 75)"/></svg><b>${AR(s)}<small>من ١٠٠</small></b></div>`; };
  const verLabel = v => (A.verName ? A.verName(v) : v.label) + ' — ' + ({ approved: 'معتمد', draft: 'مسودة', archived: 'مؤرشف' }[v.status] || v.status || '');

  V.ttquality = async function (root) {
    if (!(S.me && S.me.is_owner)) { root.innerHTML = ''; return; }
    root.innerHTML = `<div class="card">${A.emptyBox ? A.emptyBox('جارٍ التحميل…') : ''}</div>`;
    let vers = []; try { vers = await api.ttVersions(S.sectionId); } catch (_) { }
    const opts = vers.map(v => [v.id, verLabel(v)]);
    if (!opts.length) { root.innerHTML = `<div class="card">${A.emptyBox('لا توجد جداول لهذا القسم بعد', 'ولّد جدولاً من «التوزيع والقيود والتوليد».')}</div>`; return; }
    const st = { a: A.LS.get('ttq_a') || (vers.find(v => v.status === 'approved') || vers[0] || {}).id || opts[0][0], b: A.LS.get('ttq_b') || '' };
    if (!opts.some(o => o[0] === st.a)) st.a = opts[0][0]; if (st.b && !opts.some(o => o[0] === st.b)) st.b = '';
    const cache = {}; const load = async id => { if (!id) return null; if (!cache[id]) cache[id] = await api.ttSlots(id); return cache[id]; };
    const draw = async () => {
      const c = cfg(), [sa, sb] = await Promise.all([load(st.a), load(st.b)]), R = analyze(sa), Q = sb ? analyze(sb) : null;
      root.innerHTML = `<div class="card"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end">
          <div class="field" style="margin:0;flex:1 1 240px"><label for="tqA">الجدول</label><select class="in" id="tqA">${opts.map(([k, n]) => `<option value="${k}" ${k === st.a ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
          <div class="field" style="margin:0;flex:1 1 240px"><label for="tqB">مقارنة مع (اختياري)</label><select class="in" id="tqB"><option value="">— بلا مقارنة —</option>${opts.filter(o => o[0] !== st.a).map(([k, n]) => `<option value="${k}" ${k === st.b ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select></div>
          <button class="btn ghost sm" id="tqPr">طباعة التقرير</button><button class="btn ghost sm" id="tqX">Excel</button></div></div>
        <div class="card"><div class="tq-top">${gauge(R.score)}<div><h3 style="margin:0 0 6px">مؤشر جودة الجدول ${Q ? `<span class="${Q.score <= R.score ? 'tq-up' : 'tq-dn'}" style="font-size:15px">(المقارن: ${AR(Q.score)} · ${R.score >= Q.score ? '+' : '−'}${AR(Math.abs(R.score - Q.score))})</span>` : ''}</h3>
          <div class="tq-hard"><span class="${R.H.conflict.length ? 'bad' : 'ok'}">تعارض المعلمين: ${AR(R.H.conflict.length)}</span><span class="${R.H.noT.length ? 'bad' : 'ok'}">حصص بلا معلم: ${AR(R.H.noT.length)}</span><span class="${R.H.holes.length ? 'bad' : 'ok'}">فراغات وسط يوم الفصل: ${AR(R.H.holes.length)}</span>${R.H.joint ? `<span class="ok">حصص مشتركة (دمج فصول): ${AR(R.H.joint)}</span>` : ''}<span class="ok">الحصص: ${AR(R.n)} · الامتلاء ${AR(Math.round(R.fill * 100))}٪</span></div>
          <p class="small muted" style="margin:8px 0 0">${R.hard ? `يوجد مخالفة إلزامية — لا يُنصح بالاعتماد قبل معالجتها (المؤشر محدود بـ٥٩). جودة القيود التفضيلية وحدها: <b>${AR(R.soft)}</b>${Q ? ` (المقارن ${AR(Q.soft)})` : ''}.` : 'لا مخالفات إلزامية. المؤشر يقيس جودة القيود التفضيلية حسب الأوزان التي تحددها.'}</p>
          ${R.hard ? `<details style="margin-top:6px"><summary class="small"><b>تفاصيل المخالفات الإلزامية</b></summary><ul class="tq-d">${[...R.H.conflict, ...R.H.noT].slice(0, 300).map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
          ${R.H.holes.length ? `<details style="margin-top:4px"><summary class="small">الفراغات وسط يوم الفصل</summary><ul class="tq-d">${R.H.holes.slice(0, 200).map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}</div></div></div>
        <div class="card"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><b class="grow">القيود التفضيلية وأوزانها</b>
          <label class="small">أقصى تكرار للمادة يومياً <select class="in" id="tqR" style="width:auto;min-height:36px;padding:4px 8px">${[1, 2, 3].map(n => `<option ${+c.maxRep === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <label class="small">أقصى تتابع للمعلم <select class="in" id="tqU" style="width:auto;min-height:36px;padding:4px 8px">${[2, 3, 4, 5, 6].map(n => `<option ${+c.maxRun === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <button class="btn ghost sm" id="tqS">حفظ الأوزان للمدرسة</button><button class="btn ghost sm" id="tqZ">الافتراضي</button></div>
          <div class="field" style="margin-top:8px"><label for="tqC">المواد الأساسية (تُفصل بفاصلة)</label><input class="in" id="tqC" value="${esc(c.core)}"></div>
          <div class="scroll"><table class="tbl tq-tbl"><thead><tr><th>القيد</th><th>الوزن</th><th>التحقق</th>${Q ? '<th>المقارن</th>' : ''}<th>المخالفات</th></tr></thead><tbody>${CRIT.map(([k, n, d]) => `<tr><td><b>${n}</b><div class="small muted">${d}</div></td>
            <td><input type="range" class="tq-w" min="0" max="10" value="${+c.w[k] || 0}" data-w="${k}" aria-label="وزن ${n}"> <b data-wv="${k}">${AR(+c.w[k] || 0)}</b></td>
            <td><div class="row" style="gap:6px;flex-wrap:nowrap"><div class="tq-bar" style="flex:1"><i style="width:${Math.round(R.sc[k] * 100)}%;background:${col(R.sc[k])}"></i></div><b>${AR(Math.round(R.sc[k] * 100))}٪</b></div></td>
            ${Q ? `<td class="${Q.sc[k] <= R.sc[k] ? 'tq-up' : 'tq-dn'}">${AR(Math.round(Q.sc[k] * 100))}٪</td>` : ''}
            <td>${R.D[k].length ? `<details><summary class="small">${AR(R.D[k].length)} — عرض</summary><ul class="tq-d">${R.D[k].slice(0, 200).map(x => `<li>${esc(x)}</li>`).join('')}</ul></details>` : '<span class="small" style="color:#23704A">لا شيء</span>'}</td></tr>`).join('')}</tbody></table></div></div>
        <div class="card"><b>تقرير المعلمين</b><div class="scroll" style="max-height:60vh;margin-top:8px"><table class="tbl"><thead><tr><th>المعلم</th><th>الحصص</th><th>أيام العمل</th><th>حصص كل يوم</th><th>الفراغات</th><th>أطول تتابع</th><th>الأولى</th><th>الأخيرة</th></tr></thead><tbody>${R.T.map(t => `<tr><td>${esc(t.name)}</td><td><b>${AR(t.n)}</b></td><td>${AR(t.days)}</td><td class="small">${t.per.map(AR).join(' · ')}</td><td style="color:${t.gaps > R.ND ? '#B3261E' : 'inherit'}">${AR(t.gaps)}</td><td style="color:${t.run > c.maxRun ? '#B3261E' : 'inherit'}">${AR(t.run)}</td><td>${AR(t.first)}</td><td>${AR(t.last)}</td></tr>`).join('')}</tbody></table></div></div>`;
      const setL = (patch) => { const l = A.LS.get('dwp_ttq') || {}; A.LS.set('dwp_ttq', Object.assign(l, patch, patch.w ? { w: Object.assign({}, l.w, patch.w) } : {})); };
      $('#tqA', root).onchange = e => { st.a = e.target.value; A.LS.set('ttq_a', st.a); if (st.b === st.a) st.b = ''; draw(); };
      $('#tqB', root).onchange = e => { st.b = e.target.value; A.LS.set('ttq_b', st.b); draw(); };
      $$('[data-w]', root).forEach(i => { i.oninput = () => { $(`[data-wv="${i.dataset.w}"]`, root).textContent = AR(i.value); }; i.onchange = () => { setL({ w: { [i.dataset.w]: +i.value } }); draw(); }; });
      $('#tqR', root).onchange = e => { setL({ maxRep: +e.target.value }); draw(); };
      $('#tqU', root).onchange = e => { setL({ maxRun: +e.target.value }); draw(); };
      $('#tqC', root).onchange = e => { setL({ core: e.target.value }); draw(); };
      $('#tqZ', root).onclick = () => { A.LS.set('dwp_ttq', {}); draw(); };
      $('#tqS', root).onclick = ev => A.run(ev.currentTarget, async () => { const c2 = cfg(), settings = Object.assign({}, S.school.settings || {}, { ttq: { w: c2.w, maxRep: c2.maxRep, maxRun: c2.maxRun, core: c2.core } }); const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; A.LS.set('dwp_ttq', {}); A.toast('حُفظت الأوزان للمدرسة', 'ok'); });
      $('#tqPr', root).onclick = () => { const nm = (opts.find(o => o[0] === st.a) || [])[1] || '';
        A.printDoc('تقرير جودة الجدول', nm, `<h3>مؤشر الجودة: ${AR(R.score)} من ١٠٠${Q ? ` — المقارن: ${AR(Q.score)}` : ''}</h3><p>تعارض المعلمين: ${AR(R.H.conflict.length)} · حصص بلا معلم: ${AR(R.H.noT.length)} · فراغات وسط يوم الفصل: ${AR(R.H.holes.length)} · الحصص: ${AR(R.n)}</p>
          <table><tr><th>القيد</th><th>الوزن</th><th>التحقق</th>${Q ? '<th>المقارن</th>' : ''}<th>المخالفات</th></tr>${CRIT.map(([k, n]) => `<tr><td>${n}</td><td>${AR(+c.w[k] || 0)}</td><td>${AR(Math.round(R.sc[k] * 100))}٪</td>${Q ? `<td>${AR(Math.round(Q.sc[k] * 100))}٪</td>` : ''}<td>${AR(R.D[k].length)}</td></tr>`).join('')}</table>
          ${R.hard ? `<h3>المخالفات الإلزامية</h3><ul>${[...R.H.conflict, ...R.H.noT].map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          <h3>تقرير المعلمين</h3><table><tr><th>المعلم</th><th>الحصص</th><th>الأيام</th><th>كل يوم</th><th>الفراغات</th><th>أطول تتابع</th><th>الأولى</th><th>الأخيرة</th></tr>${R.T.map(t => `<tr><td style="text-align:right">${esc(t.name)}</td><td>${AR(t.n)}</td><td>${AR(t.days)}</td><td>${t.per.map(AR).join(' · ')}</td><td>${AR(t.gaps)}</td><td>${AR(t.run)}</td><td>${AR(t.first)}</td><td>${AR(t.last)}</td></tr>`).join('')}</table>
          ${CRIT.filter(([k]) => R.D[k].length).map(([k, n]) => `<h3>${n} (${AR(R.D[k].length)})</h3><ul>${R.D[k].slice(0, 150).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`).join('')}`); };
      $('#tqX', root).onclick = () => { if (!window.XLSX) return A.toast('مكتبة Excel غير محمّلة', 'err'); const wb = XLSX.utils.book_new(), add = (n, a) => XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), n.slice(0, 30));
        add('المؤشر', [['القيد', 'الوزن', 'التحقق ٪', 'المخالفات'], ...CRIT.map(([k, n]) => [n, +c.w[k] || 0, Math.round(R.sc[k] * 100), R.D[k].length]), [], ['مؤشر الجودة', R.score], ['تعارض المعلمين', R.H.conflict.length], ['حصص بلا معلم', R.H.noT.length], ['فراغات الفصول', R.H.holes.length]]);
        add('المعلمون', [['المعلم', 'الحصص', 'الأيام', 'الفراغات', 'أطول تتابع', 'الأولى', 'الأخيرة'], ...R.T.map(t => [t.name, t.n, t.days, t.gaps, t.run, t.first, t.last])]);
        add('التفاصيل', [['النوع', 'التفصيل'], ...R.H.conflict.map(x => ['تعارض', x]), ...R.H.noT.map(x => ['بلا معلم', x]), ...CRIT.flatMap(([k, n]) => R.D[k].map(x => [n, x]))]);
        wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, 'تقرير جودة الجدول.xlsx'); };
    };
    await draw();
  };
})();
