/* منصة دينا — قالب التعليم عن بعد (جاهز بضغطة زر)
   إعدادات محفوظة لكل قسم: المواد المستبعدة على مستويين (الأول: الأنشطة البدنية والسباحة… / الثاني: تخفيف إضافي كالمهارات الحياتية والتحفيظ والموهبة…)
   مع تحديد المراحل لكل مادة، وتوقيت خاص بالتعليم عن بعد، وقيود جودة احترافية.
   الإنشاء: من الجدول المعتمد، دون تغيير الأيام ولا نقل حصة من يوم إلى يوم — تُرتَّب حصص كل يوم داخله فقط:
   بلا تعارض للمعلمين، بلا تتابع لنفس المادة، المواد الأساسية في أول اليوم، بلا فراغات، وتجنّب تتابع طويل للمعلم.
   لا يمس الجدول المعتمد ولا الخطط ولا ما أدخله المعلمون. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR, DAYS, PER } = A;
  const sKey = x => x.s || (x.sn ? 'n:' + x.sn : ''), tKey = x => x.t || (x.tn ? 'n:' + x.tn : '');
  const sName = x => (x.s && A.subjName(x.s)) || x.sn || '—';
  const L1 = /بدني|سباح|نشاط رياض|رياضة|لياق|فنية|فنون/, L2 = /حياتية|إدارية|ادارية|تحفيظ|موهبة|ناقد/;
  const HEAVY = /عربي|لغتي|رياضيات|علوم|إنجليز|انجليز|فيزياء|كيمياء|أحياء|لغة|قراء/;
  const STAGES = ['الابتدائية', 'المتوسطة', 'الثانوية'];
  const Q0 = { noAdj: true, heavyEarly: true, compact: true, keepOrig: true, tMaxRun: 3 };
  const H = () => A._live;
  const cfgOf = () => { const r = ((S.school.settings || {}).remote || {})[S.sectionId] || {}; return { level: 1, rules: {}, cs: null, name: 'جدول التعليم عن بعد', tag: 'للتعليم عن بعد', pub: false, ...r, q: { ...Q0, ...(r.q || {}) } }; };
  const saveCfg = async c => { const all = { ...((S.school.settings || {}).remote || {}), [S.sectionId]: c }; const settings = { ...(S.school.settings || {}), remote: all }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; };
  const stageOf = c => ((A.cls(c) || (S.allClasses || []).find(x => x.id === c) || {}).stage || '');
  const ruleOf = (c, k, nm) => c.rules[k] || { lv: L1.test(nm) ? 1 : L2.test(nm) ? 2 : 0, st: [] };
  const exclFn = (c, level) => x => { const r = ruleOf(c, sKey(x), sName(x)); if (!r.lv || r.lv > level) return false; return !r.st || !r.st.length || r.st.includes(stageOf(x.c)); };

  const approved = async () => { const vs = (await api.list('timetable_versions', { section_id: S.sectionId })) || []; const v = vs.find(x => x.status === 'approved') || vs.find(x => x.status !== 'archived'); if (!v) throw new Error('لا يوجد جدول معتمد في هذا القسم'); const sl = (await api.list('timetable_slots', { version_id: v.id })) || []; return { v, src: sl.filter(x => x.subject_id).map(x => ({ c: x.class_id, d: x.day, p: x.period, s: x.subject_id, t: x.teacher_id || null })) }; };
  const defaultCs = async () => { const dss = (await api.list('display_schedules', { section_id: S.sectionId }).catch(() => [])) || []; const last = dss.filter(d => d.meta && (d.meta.custom || d.meta.times)).sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0]; if (last) return H().customFrom(last.meta); const b = A.bell.bellOf(A.section()); const s = b.schedules.find(x => /بعد/.test(x.name + ' ' + (x.tag || ''))) || A.bell.activeSched(b); return H().customFrom(H().metaFrom(s.id)); };

  // ---------- تحسين ترتيب الحصص داخل اليوم نفسه (لا نقل بين الأيام) ----------
  function optimize(slots, days, cap, Q, src) {
    const orig = new Set(src.map(x => `${x.c}|${x.d}|${sKey(x)}|${x.p}`));
    const cls = {}, tch = {}, at = {}; slots.forEach(x => { (cls[x.c + '|' + x.d] = cls[x.c + '|' + x.d] || []).push(x); const t = tKey(x); if (t) { (tch[t + '|' + x.d] = tch[t + '|' + x.d] || []).push(x); at[t + '|' + x.d + '|' + x.p] = x; } });
    const pC = (arr, N) => { const row = Array(N).fill(null); arr.forEach(x => { row[x.p] = x; }); let s = 0;
      for (let p = 1; p < N; p++) if (Q.noAdj && row[p] && row[p - 1] && sKey(row[p]) === sKey(row[p - 1])) s += 20;
      if (Q.heavyEarly) row.forEach((x, p) => { if (x && HEAVY.test(sName(x))) s += p * 0.15 + (p === N - 1 ? 2 : 0); });
      if (Q.compact) { let seen = false; for (let p = N - 1; p >= 0; p--) { if (row[p]) seen = true; else if (seen) s += 8; } }
      if (Q.keepOrig) arr.forEach(x => { if (!orig.has(`${x.c}|${x.d}|${sKey(x)}|${x.p}`)) s += 0.4; });
      return s; };
    const pT = (t, d) => { if (!t) return 0; const ps = (tch[t + '|' + d] || []).map(x => x.p).sort((a, b) => a - b); let s = 0, run = 1; for (let i = 1; i < ps.length; i++) { if (ps[i] === ps[i - 1] + 1) { run++; if (run > Q.tMaxRun) s += 6; } else { run = 1; s += (ps[i] - ps[i - 1] - 1) * 0.5; } } return s; };
    const stat = () => { let adj = 0, runs = 0; Object.entries(cls).forEach(([k, arr]) => { const row = {}; arr.forEach(x => { row[x.p] = x; }); Object.keys(row).forEach(p => { const a = row[p], b = row[+p - 1]; if (a && b && sKey(a) === sKey(b)) adj++; }); });
      Object.entries(tch).forEach(([k, arr]) => { const ps = arr.map(x => x.p).sort((a, b) => a - b); let run = 1; for (let i = 1; i < ps.length; i++) { run = ps[i] === ps[i - 1] + 1 ? run + 1 : 1; if (run === Q.tMaxRun + 1) runs++; } }); return { adj, runs }; };
    const before = stat();
    // بحث «التلدين المحاكى» داخل كل يوم: تبديل حصتين لنفس الفصل في اليوم نفسه، مع منع أي تعارض للمعلم
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const mv = (x, q, d) => { if (!x) return; const t = tKey(x); if (t && at[t + '|' + d + '|' + x.p] === x) delete at[t + '|' + d + '|' + x.p]; x.p = q; if (t) at[t + '|' + d + '|' + q] = x; };
    const trySwap = (arr, d, i, j) => { const a = arr.find(x => x.p === i), b = arr.find(x => x.p === j); if (!a && !b) return null; const ta = a && tKey(a), tb = b && tKey(b);
      if (ta && at[ta + '|' + d + '|' + j] && at[ta + '|' + d + '|' + j] !== b) return null; if (tb && at[tb + '|' + d + '|' + i] && at[tb + '|' + d + '|' + i] !== a) return null; return { a, b, ta, tb }; };
    const cost = (arr, N, d, ta, tb) => pC(arr, N) + pT(ta, d) + (tb && tb !== ta ? pT(tb, d) : 0);
    const doSwap = (arr, d, i, j, sw) => { mv(sw.a, j, d); mv(sw.b, i, d); if (sw.a && sw.ta) at[sw.ta + '|' + d + '|' + j] = sw.a; if (sw.b && sw.tb) at[sw.tb + '|' + d + '|' + i] = sw.b; };
    for (const d of days) {
      const ks = Object.keys(cls).filter(k => cls[k][0].d === d); if (!ks.length) continue; const N = Math.max(1, cap(d));
      const total = () => ks.reduce((a, k) => a + pC(cls[k], N), 0) + [...new Set(ks.flatMap(k => cls[k].map(tKey)).filter(Boolean))].reduce((a, t) => a + pT(t, d), 0);
      const snap = () => ks.flatMap(k => cls[k].map(x => [x, x.p])); const restore = sn => { sn.forEach(([x]) => { const t = tKey(x); if (t) delete at[t + '|' + d + '|' + x.p]; }); sn.forEach(([x, q]) => { x.p = q; const t = tKey(x); if (t) at[t + '|' + d + '|' + q] = x; }); };
      let cur = total(), best = cur, bestS = snap(); const IT = Math.min(60000, 2500 * ks.length);
      for (let it = 0; it < IT && best > 0; it++) { const T = 6 * Math.pow(0.02 / 6, it / IT);
        const k = ks[Math.floor(rnd() * ks.length)], arr = cls[k]; const i = Math.floor(rnd() * N); let j = Math.floor(rnd() * (N - 1)); if (j >= i) j++;
        const sw = trySwap(arr, d, i, j); if (!sw) continue; const c0 = cost(arr, N, d, sw.ta, sw.tb); doSwap(arr, d, i, j, sw); const dl = cost(arr, N, d, sw.ta, sw.tb) - c0;
        if (dl <= 0 || rnd() < Math.exp(-dl / T)) { cur += dl; if (cur < best - 1e-9) { best = cur; bestS = snap(); } } else { const sb = trySwap(arr, d, j, i); if (sb) doSwap(arr, d, j, i, sb); } }
      restore(bestS);
    }
    const seen = {}; let conflicts = 0; slots.forEach(x => { const t = tKey(x); if (!t) return; const k = t + '|' + x.d + '|' + x.p; if (seen[k]) conflicts++; seen[k] = 1; });
    return { slots, before, after: stat(), conflicts };
  }
  A.remoteOptimize = optimize;

  // ---------- الإنشاء ----------
  async function build(c, week, level) {
    const sec = A.section(), nd = sec.days || 5; const { v, src } = await approved();
    const hol = (week.holidays || []).map(h => +h.day);
    const dd = Array.from({ length: nd }, (_, i) => i).filter(d => !hol.includes(d)); if (!dd.length) throw new Error('كل أيام هذا الأسبوع إجازة');
    const cs = { ...(c.cs || await defaultCs()) }; cs.days = dd; cs.perDay = {};
    const meta = H().metaCustom(cs); meta.schedName = 'توقيت التعليم عن بعد'; meta.copiedFrom = 'قالب التعليم عن بعد'; meta.lim = { days: dd, n: meta.periods };
    const cap = d => Math.min(meta.periods, meta.perDay[d] || meta.periods);
    const r = A.liveRearrange(src, { days: dd, exclude: new Set(), excl: exclFn(c, level), cap });
    const o = optimize(r.slots, dd, cap, c.q, src);
    return { v, src, meta, dd, r, o, from: week.start_date, to: H().addD(week.start_date, nd - 1) };
  }
  const report = (b, level) => { const rm = Object.entries(b.r.removed), sum = rm.reduce((a, [, n]) => a + n, 0);
    return `<div class="lvx-sum"><div class="k"><b>${AR(b.r.slots.length)}</b>حصة في الجدول</div><div class="k"><b>${AR(sum)}</b>حصة مستبعدة (المستوى ${AR(level)})</div><div class="k ${b.r.dropped.length ? 'w' : ''}"><b>${AR(b.r.dropped.length)}</b>حصة زائدة عن ${AR(b.meta.periods)} حصص</div><div class="k ${b.o.conflicts ? 'bad' : 'ok'}"><b>${AR(b.o.conflicts)}</b>تعارض للمعلمين</div><div class="k ${b.o.after.adj ? 'w' : 'ok'}"><b>${AR(b.o.after.adj)}</b>تتابع نفس المادة <small>(كان ${AR(b.o.before.adj)})</small></div><div class="k ${b.o.after.runs ? 'w' : 'ok'}"><b>${AR(b.o.after.runs)}</b>تتابع طويل لمعلم <small>(كان ${AR(b.o.before.runs)})</small></div><div class="k ${b.r.gaps.length ? 'w' : 'ok'}"><b>${AR(b.r.gaps.length)}</b>يوم فصل ناقص</div></div>
      ${rm.length ? `<p class="small" style="margin:6px 0">المستبعد: ${rm.map(([k, n]) => `${esc(k)} (${AR(n)})`).join('، ')}</p>` : ''}
      <p class="small muted" style="margin:4px 0 0">الأيام كما هي (${b.dd.map(d => DAYS[d]).join('، ')})، ولم تُنقل أي حصة من يوم إلى آخر. الحصص الزائدة والمستبعدة في خانة الحصص أسفل الجدول.</p>`; };

  // ---------- الإعدادات ----------
  async function settingsDialog(onDone) {
    const c = cfgOf(); const { src } = await approved(); if (!c.cs) c.cs = await defaultCs();
    const subs = {}; src.forEach(x => { const k = sKey(x); (subs[k] = subs[k] || { k, name: sName(x), n: 0, st: new Set() }).n++; subs[k].st.add(stageOf(x.c)); });
    const list = Object.values(subs).sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    const bell = A.bell.bellOf(A.section()); const cs = c.cs;
    const m = A.modal(`<h3>قالب التعليم عن بعد — ${esc(A.section().name)}</h3><p class="sub">يُحفظ لهذا القسم. عند تعليق الدراسة اضغط «جدول تعليم عن بعد بضغطة» فيُبنى الجدول من الجدول المعتمد وفق هذه الإعدادات، دون تغيير الأيام ولا نقل حصة من يوم إلى يوم.</p>
      <h4 class="rt-h">١ · المواد المستبعدة</h4><p class="small muted" style="margin:0 0 6px"><b>المستوى الأول</b>: يُستبعد دائماً (الأنشطة البدنية والسباحة…). <b>المستوى الثاني</b>: يُستبعد أيضاً عند اختيار التخفيف الإضافي. حدّد المراحل إن كان الاستبعاد لمراحل معينة (بلا تحديد = كل المراحل).</p>
      <div class="scroll"><table class="tbl rt-t"><thead><tr><th>المادة</th><th>حصص/أسبوع</th><th>في التعليم عن بعد</th><th>المراحل</th></tr></thead><tbody>${list.map(o => { const r = ruleOf(c, o.k, o.name); return `<tr data-rk="${esc(o.k)}" class="lv${r.lv}"><th>${esc(o.name)}</th><td>${AR(o.n)}</td><td><div class="kpick rt-lv">${[[0, 'تبقى'], [1, 'المستوى ١'], [2, 'المستوى ٢']].map(([v, l]) => `<button type="button" data-lv="${v}" class="${r.lv === v ? 'on' : ''}">${l}</button>`).join('')}</div></td><td><div class="rt-st">${STAGES.filter(st => o.st.has(st)).map(st => `<label class="chk"><input type="checkbox" data-st="${st}" ${(r.st || []).includes(st) ? 'checked' : ''} ${r.lv ? '' : 'disabled'}> ${st.replace(/^ال/, '')}</label>`).join('')}</div></td></tr>`; }).join('')}</tbody></table></div>
      <h4 class="rt-h">٢ · توقيت التعليم عن بعد</h4>
      <div class="grid g3"><div class="field"><label for="rtSt">بداية اليوم</label><input class="in" type="time" id="rtSt" value="${esc(cs.start || '08:00')}"></div><div class="field"><label for="rtD">مدة الحصة (دقيقة)</label><input class="in" type="number" min="10" max="120" id="rtD" value="${+cs.dur || 40}"></div><div class="field"><label for="rtP">الانتقال بين الحصص</label><input class="in" type="number" min="0" max="20" id="rtP" value="${+cs.pass || 0}"></div>
        <div class="field"><label for="rtN">عدد الحصص اليومية</label><select class="in" id="rtN">${Array.from({ length: 10 }, (_, i) => `<option ${+cs.np === i + 1 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div><div class="field"><label for="rtCp">نسخ من توقيت الحضوري</label><div class="row" style="gap:6px"><select class="in" id="rtCp"><option value="">—</option>${bell.schedules.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><button type="button" class="btn ghost sm" id="rtCpGo">نسخ</button></div></div></div>
      <div class="field"><label>الفسح</label><div id="rtB" class="bl-brs"></div><button type="button" class="btn ghost sm" id="rtAddB">+ فسحة</button></div>
      <h4 class="rt-h">٣ · قيود الجودة</h4><div class="perm-grid">
        <label class="chk"><input type="checkbox" data-q="noAdj" ${c.q.noAdj ? 'checked' : ''}> عدم تتابع حصتين لنفس المادة في الفصل</label>
        <label class="chk"><input type="checkbox" data-q="heavyEarly" ${c.q.heavyEarly ? 'checked' : ''}> المواد الأساسية في أول اليوم، وليست آخر حصة</label>
        <label class="chk"><input type="checkbox" data-q="compact" ${c.q.compact ? 'checked' : ''}> بلا فراغات بين حصص الفصل</label>
        <label class="chk"><input type="checkbox" data-q="keepOrig" ${c.q.keepOrig ? 'checked' : ''}> الإبقاء على مواعيد الجدول المعتمد ما أمكن</label>
        <label class="chk">أقصى حصص متتالية للمعلم <select class="in" id="rtRun" style="width:auto">${[2, 3, 4, 5, 6].map(n => `<option ${c.q.tMaxRun === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <span class="small muted">دائماً: بلا تعارض للمعلمين، وبلا نقل بين الأيام.</span></div>
      <h4 class="rt-h">٤ · الإنشاء</h4><div class="grid g3"><div class="field"><label for="rtNm">اسم الجدول</label><input class="in" id="rtNm" value="${esc(c.name)}"></div><div class="field"><label for="rtTg">الشارة</label><input class="in" id="rtTg" value="${esc(c.tag)}"></div><div class="field"><label for="rtLv">المستوى الافتراضي</label><select class="in" id="rtLv"><option value="1" ${c.level === 1 ? 'selected' : ''}>المستوى الأول</option><option value="2" ${c.level === 2 ? 'selected' : ''}>المستوى الثاني (تخفيف إضافي)</option></select></div></div>
      <label class="chk"><input type="checkbox" id="rtPub" ${c.pub ? 'checked' : ''}> نشره مباشرة للمعلمين وأولياء الأمور بعد الإنشاء (بدون التحديد: يُنشأ مسودة للمراجعة)</label>
      <div class="acts"><button class="btn" id="rtSave">حفظ القالب</button></div>`, { cls: 'wide' });
    const el = m.el, q = s => el.querySelector(s);
    const drawB = () => { q('#rtB').innerHTML = (cs.breaks || []).map((b, i) => `<div class="bl-br"><input class="in" data-b="${i}" data-k="label" value="${esc(b.label || '')}" placeholder="الفسحة"><label>بعد الحصة <select class="in" data-b="${i}" data-k="after">${Array.from({ length: Math.max(1, +cs.np - 1) }, (_, p) => `<option value="${p + 1}" ${+b.after === p + 1 ? 'selected' : ''}>${PER[p] || AR(p + 1)}</option>`).join('')}</select></label><label>المدة <input class="in" type="number" min="5" max="90" style="width:76px" data-b="${i}" data-k="dur" value="${+b.dur || 15}"> د</label><button type="button" class="btn bad sm" data-bx="${i}" aria-label="حذف">×</button></div>`).join('') || '<span class="small muted">بلا فسحة</span>';
      $$('[data-b]', el).forEach(i => i.oninput = i.onchange = () => { const b = cs.breaks[+i.dataset.b]; b[i.dataset.k] = i.dataset.k === 'label' ? i.value : +i.value; }); $$('[data-bx]', el).forEach(x => x.onclick = () => { cs.breaks.splice(+x.dataset.bx, 1); drawB(); }); };
    drawB(); q('#rtAddB').onclick = () => { (cs.breaks = cs.breaks || []).push({ after: Math.min(3, Math.max(1, +cs.np - 1)), dur: 20, label: 'الفسحة' }); drawB(); };
    q('#rtN').onchange = () => { cs.np = +q('#rtN').value; drawB(); };
    q('#rtCpGo').onclick = () => { const id = q('#rtCp').value; if (!id) return; Object.assign(cs, H().customFrom(H().metaFrom(id))); q('#rtSt').value = cs.start; q('#rtD').value = cs.dur; q('#rtP').value = cs.pass; q('#rtN').value = cs.np; drawB(); A.toast('نُسخ التوقيت إلى القالب — توقيت الحضوري لم يتغير', 'ok'); };
    $$('tr[data-rk]', el).forEach(tr => { $$('[data-lv]', tr).forEach(b => b.onclick = () => { $$('[data-lv]', tr).forEach(x => x.classList.toggle('on', x === b)); tr.className = 'lv' + b.dataset.lv; $$('[data-st]', tr).forEach(i => { i.disabled = b.dataset.lv === '0'; }); }); });
    q('#rtSave').onclick = e => A.run(e.currentTarget, async () => {
      const rules = {}; $$('tr[data-rk]', el).forEach(tr => { const lv = +((tr.querySelector('[data-lv].on') || {}).dataset || {}).lv || 0; rules[tr.dataset.rk] = { lv, st: lv ? $$('[data-st]', tr).filter(i => i.checked).map(i => i.dataset.st) : [] }; });
      Object.assign(cs, { start: q('#rtSt').value || '08:00', dur: +q('#rtD').value || 40, pass: +q('#rtP').value || 0, np: +q('#rtN').value || 6 });
      const q2 = {}; $$('[data-q]', el).forEach(i => { q2[i.dataset.q] = i.checked; }); q2.tMaxRun = +q('#rtRun').value || 3;
      const nc = { ...c, rules, cs, q: q2, name: q('#rtNm').value.trim() || 'جدول التعليم عن بعد', tag: q('#rtTg').value.trim(), level: +q('#rtLv').value || 1, pub: q('#rtPub').checked };
      await saveCfg(nc); m.close(); A.toast('حُفظ قالب التعليم عن بعد', 'ok'); if (onDone) onDone(); });
  }

  // ---------- بضغطة زر ----------
  async function quickDialog(root) {
    const c = cfgOf(), t0 = H().today();
    const WKS = (S.weeks || []).filter(w => !w.archived && w.start_date).sort((a, b) => a.start_date.localeCompare(b.start_date));
    const cur = WKS.find(w => w.start_date <= t0 && t0 <= H().addD(w.start_date, 6)), nxt = WKS.find(w => w.start_date > t0);
    const def = (cur && H().addD(cur.start_date, ((A.section() || {}).days || 5) - 1) >= t0 ? cur : nxt) || WKS[WKS.length - 1];
    if (!def) throw new Error('لا توجد أسابيع في هذا القسم');
    const saved = !!(((S.school.settings || {}).remote || {})[S.sectionId]);
    const m = A.modal(`<h3>جدول تعليم عن بعد بضغطة</h3><p class="sub">من الجدول المعتمد وفق قالب التعليم عن بعد${saved ? '' : ' (الإعدادات الافتراضية — يمكنك ضبطها من «قالب التعليم عن بعد»)'}.</p>
      <div class="grid g2"><div class="field"><label for="qkW">الأسبوع</label><select class="in" id="qkW">${WKS.map(w => `<option value="${w.id}" ${w.id === def.id ? 'selected' : ''}>الأسبوع ${esc(w.word || AR(w.number))} — ${esc(w.start_date)}${cur && w.id === cur.id ? ' (الحالي)' : ''}</option>`).join('')}</select></div>
      <div class="field"><label>مستوى الاستبعاد</label><div class="kpick" id="qkL"><button type="button" data-l="1" class="${c.level !== 2 ? 'on' : ''}">المستوى الأول</button><button type="button" data-l="2" class="${c.level === 2 ? 'on' : ''}">المستوى الثاني</button></div></div></div>
      <div id="qkR"><div class="spinner"></div></div>
      <div class="acts" style="flex-wrap:wrap"><button class="btn ok" id="qkGo">${c.pub ? 'إنشاء ونشر' : 'إنشاء'}</button><button class="btn ghost" id="qkSet">قالب التعليم عن بعد</button></div>`, { cls: 'wide' });
    const el = m.el, q = s => el.querySelector(s); let level = c.level === 2 ? 2 : 1, B = null;
    const prev = async () => { q('#qkR').innerHTML = '<div class="spinner"></div>'; try { B = await build(c, WKS.find(w => w.id === q('#qkW').value), level); q('#qkR').innerHTML = report(B, level); } catch (e) { B = null; q('#qkR').innerHTML = `<div class="notice bad">${esc(e.message)}</div>`; } };
    q('#qkW').onchange = prev; $$('#qkL button', el).forEach(b => b.onclick = () => { level = +b.dataset.l; $$('#qkL button', el).forEach(x => x.classList.toggle('on', x === b)); prev(); });
    q('#qkSet').onclick = () => { m.close(); settingsDialog(() => quickDialog(root)); };
    q('#qkGo').onclick = e => A.run(e.currentTarget, async () => { if (!B) throw new Error('تعذّر بناء الجدول'); if (c.pub && !(await A.confirmBox('نشر الجدول للمعلمين وأولياء الأمور فور إنشائه؟', 'نشر'))) return;
      const dss = (await api.list('display_schedules', { section_id: S.sectionId })) || []; const pv = dss.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
      const row = (await api.ins('display_schedules', { school_id: S.school.id, section_id: S.sectionId, version_id: B.v.id, label: c.name + (level === 2 ? ' (مخفف)' : ''), tag: c.tag, date_from: B.from, date_to: B.to, slots: B.o.slots, pool: B.r.pool, meta: B.meta, links: pv ? { cls: (pv.links || {}).cls || {}, tch: (pv.links || {}).tch || {}, cell: {} } : {}, published: !!c.pub, published_at: c.pub ? new Date().toISOString() : null, created_by: S.me.id }))[0];
      m.close(); A.LS.set('live_open', row.id); A.LS.set('live_tab', 'edit'); A.toast(c.pub ? 'أُنشئ الجدول ونُشر' : 'أُنشئ الجدول كمسودة — راجعه ثم «اعتماد ونشر»', 'ok'); V.live(root); });
    prev();
  }
  A.remoteQuick = quickDialog; A.remoteSettings = settingsDialog;

  // أزرار في صفحة الجداول الاستثنائية
  const lv0 = V.live; if (lv0) V.live = async function (root) { const r = await lv0.apply(this, arguments); const b = root.querySelector('#lvConv'); if (b && S.me && (S.me.is_owner || A.can && A.can('timetable_edit')) && !root.querySelector('#rtQuick')) { b.insertAdjacentHTML('beforebegin', '<button class="btn ok" id="rtQuick">⚡ جدول تعليم عن بعد بضغطة</button><button class="btn ghost" id="rtSet">قالب التعليم عن بعد</button>'); root.querySelector('#rtQuick').onclick = e => A.run(e.currentTarget, () => quickDialog(root)); root.querySelector('#rtSet').onclick = e => A.run(e.currentTarget, () => settingsDialog()); b.classList.remove('ok'); b.classList.add('ghost'); } return r; };
})();
