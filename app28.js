/* منصة دينا — تحويل يوم أو أسبوع للتعلم عن بعد + تحكم كامل في حصص الجدول الاستثنائي
   - حذف مواد (البدنية، السباحة، الفنية…) ثم ترحيل الحصص تلقائياً بعدد موحّد لكل الفصول وبلا تعارض للمعلمين
     (تلوين حواف ثنائي — مضمون رياضياً ما دام نصاب المعلم اليومي لا يتجاوز عدد الحصص).
   - معاينة قبل الإنشاء، ثم «اعتماد ونشر» أو «إنشاء وفتح للتعديل».
   - تبويب «تعديل الحصص والإسناد»: تعديل/حذف/نقل/تبديل/إضافة حصة، إسناد المعلم، حذف مادة من كامل الجدول، إعادة الترحيل، تقرير الأنصبة، الطباعة.
   كل ذلك داخل الجدول الاستثنائي فقط: لا يمس الجدول المعتمد ولا الخطط ولا ما أدخله المعلمون. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, DAYS, PER, I } = A;
  const L_ = () => A._live;
  const PE_RE = /بدني|بدنية|سباح|فنية|فنون|رياضة|لياق/;
  const sKey = x => x.s || (x.sn ? 'n:' + x.sn : '');
  const tKey = x => x.t || (x.tn ? 'n:' + x.tn : '');
  const sName = x => (x.s && A.subjName(x.s)) || x.sn || '—';
  const tName = x => (x.t && A.personName(x.t)) || x.tn || '';
  const clsSort = (a, b) => { const C = L_().allCls(); return ((C.find(c => c.id === a) || {}).sort || 0) - ((C.find(c => c.id === b) || {}).sort || 0) || L_().cName(a).localeCompare(L_().cName(b), 'ar'); };
  const dowOf = s => A.parseDate(s).getDay();

  // ---------------- محرّك الترحيل ----------------
  // src: [{c,d,p,s,t,sn,tn}] · o: {days:[], exclude:Set(sKey), cap:d=>N}
  function rearrange(src, o) {
    const isEx = x => o.excl ? o.excl(x) : o.exclude.has(sKey(x)); // o.excl: استبعاد حسب المادة والمرحلة
    const out = [], dropped = [], removed = {}, gaps = [], removedItems = [];
    let moved = 0;
    const wk = {}; src.forEach(x => { if (!sKey(x) || isEx(x)) return; const k = x.c + '|' + sKey(x); wk[k] = (wk[k] || 0) + 1; });
    src.forEach(x => { if (sKey(x) && isEx(x) && o.days.includes(x.d)) { removed[sName(x)] = (removed[sName(x)] || 0) + 1; removedItems.push({ c: x.c, s: x.s || null, sn: x.sn || '', t: x.t || null, tn: x.tn || '', why: 'removed' }); } });
    for (const d of o.days) {
      const N = Math.max(1, o.cap(d));
      const L = {}; src.filter(x => x.d === d && sKey(x) && !isEx(x)).sort((a, b) => a.p - b.p).forEach(x => (L[x.c] = L[x.c] || []).push({ ...x }));
      const drop = (arr, i, why) => { const [x] = arr.splice(i, 1); dropped.push({ ...x, why }); wk[x.c + '|' + sKey(x)]--; };
      // أولوية الحذف عند الزيادة: المادة المكررة في اليوم، ثم الأكثر حصصاً في الأسبوع، ثم الأخيرة
      const worst = arr => { let bi = arr.length - 1, bs = -1; arr.forEach((x, i) => { const rep = arr.filter(y => sKey(y) === sKey(x)).length, sc = (rep > 1 ? 1000 : 0) + (wk[x.c + '|' + sKey(x)] || 0) * 10 + i / 100; if (sc > bs) { bs = sc; bi = i; } }); return bi; };
      Object.values(L).forEach(arr => { while (arr.length > N) drop(arr, worst(arr), 'زيادة عن عدد الحصص'); });
      // نصاب المعلم اليومي فوق عدد الحصص — مستحيل بلا تعارض، فتُحذف الزيادة
      for (;;) { const deg = {}; Object.values(L).flat().forEach(x => { const t = tKey(x); if (t) deg[t] = (deg[t] || 0) + 1; }); const over = Object.keys(deg).find(t => deg[t] > N); if (!over) break;
        let best = null; Object.values(L).forEach(arr => arr.forEach((x, i) => { if (tKey(x) !== over) return; const sc = (wk[x.c + '|' + sKey(x)] || 0) + (arr.filter(y => sKey(y) === sKey(x)).length > 1 ? 100 : 0); if (!best || sc > best.sc) best = { arr, i, sc }; }));
        drop(best.arr, best.i, 'نصاب المعلم اليومي أكبر من عدد الحصص'); }
      // تلوين الحواف: رأس للفصل ورأس للمعلم، اللون = رقم الحصة
      const occ = new Map(); const at = v => { if (!occ.has(v)) occ.set(v, Array(N).fill(null)); return occ.get(v); };
      const E = []; let u0 = 0;
      Object.keys(L).sort(clsSort).forEach(c => L[c].forEach((x, k) => E.push({ x, u: 'c:' + c, v: tKey(x) ? 'T:' + tKey(x) : 'x:' + (u0++), pref: k, col: -1 })));
      E.sort((a, b) => a.pref - b.pref);
      const near = (arr, pref) => { let best = -1; for (let k = 0; k < N; k++) if (!arr[k] && (best < 0 || Math.abs(k - pref) < Math.abs(best - pref))) best = k; return best; };
      const put = (e, k) => { e.col = k; at(e.u)[k] = e; at(e.v)[k] = e; };
      for (const e of E) {
        const U = at(e.u), W = at(e.v);
        if (!U[e.pref] && !W[e.pref]) { put(e, e.pref); continue; }
        const a = near(U, e.pref); if (!W[a]) { put(e, a); continue; }
        const b = near(W, e.pref);
        // سلسلة متناوبة a/b تبدأ من رأس المعلم ثم تبديل لونيها
        const path = []; let node = e.v, c1 = a, c2 = b;
        for (;;) { const f = at(node)[c1]; if (!f || path.includes(f)) break; path.push(f); node = f.u === node ? f.v : f.u; [c1, c2] = [c2, c1]; }
        path.forEach(f => { at(f.u)[f.col] = null; at(f.v)[f.col] = null; });
        path.forEach(f => { const nc = f.col === a ? b : a; put(f, nc); });
        put(e, a);
      }
      // ضغط الفراغات للأعلى ما أمكن دون تعارض
      for (let ch = true; ch;) { ch = false; Object.keys(L).forEach(c => { const U = at('c:' + c); for (let k = 0; k < N; k++) { if (U[k]) continue; for (let j = k + 1; j < N; j++) { const e = U[j]; if (e && !at(e.v)[k]) { at(e.u)[j] = null; at(e.v)[j] = null; put(e, k); ch = true; break; } } } }); }
      E.forEach(e => { if (e.col !== e.x.p) moved++; out.push({ ...e.x, p: e.col }); });
      Object.keys(L).forEach(c => { const n = L[c].length; if (n < N) gaps.push({ c, d, n, N }); });
    }
    if (o.keepOther) src.filter(x => !o.days.includes(x.d)).forEach(x => out.push({ ...x }));
    // تحقق نهائي
    const seen = {}; let conflicts = 0; out.forEach(x => { const t = tKey(x); if (!t) return; const k = t + '|' + x.d + '|' + x.p; if (seen[k]) conflicts++; seen[k] = 1; });
    return { slots: out, dropped, removed, gaps, moved, conflicts, pool: removedItems.concat(dropped.map(x => ({ c: x.c, s: x.s || null, sn: x.sn || '', t: x.t || null, tn: x.tn || '', why: 'over' }))) };
  }
  A.liveRearrange = rearrange;

  const clashMap = slots => { const m = {}; slots.forEach(x => { const t = tKey(x); if (!t) return; const k = t + '|' + x.d + '|' + x.p; (m[k] = m[k] || []).push(x); }); return m; };
  const isClash = (m, x) => { const t = tKey(x); return !!t && (m[t + '|' + x.d + '|' + x.p] || []).length > 1; };

  // شبكة فصل (مشتركة بين المعاينة والتعديل)
  // لون مميز لكل مادة (للخانات وعناصر الخانة السفلية)
  const hue = k => { let h = 0; for (const ch of String(k)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  const subjVar = x => `--sc:hsl(${hue(sKey(x))} 62% 44%);--sb:hsl(${hue(sKey(x))} 70% 96%)`;
  A._liveHue = subjVar;
  function grid(slots, c, days, nOf, o = {}) {
    const P = Math.max(1, ...days.map(nOf), ...slots.filter(x => x.c === c).map(x => x.p + 1)); const cm = clashMap(slots);
    return `<div class="scroll"><table class="tbl lvx-g"><thead><tr><th>اليوم</th>${Array.from({ length: P }, (_, p) => `<th>${PER[p] || AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${days.map(d => `<tr><th>${DAYS[d]}</th>${Array.from({ length: P }, (_, p) => {
      const x = slots.find(y => y.c === c && y.d === d && y.p === p), off = p >= nOf(d);
      if (!x) return `<td class="${off ? 'off' : 'emp'}">${o.edit && !off ? `<button class="lvx-c add" data-xc="${d}|${p}" aria-label="إضافة حصة ${DAYS[d]} ${AR(p + 1)}">+</button>` : '<span class="faint">—</span>'}</td>`;
      const cl = isClash(cm, x), mv = o.orig && o.orig(x);
      const inner = `<b>${esc(sName(x))}</b><small>${esc(tName(x) || 'بلا معلم')}</small>${cl ? '<i class="lvx-w">تعارض</i>' : mv ? '<i class="lvx-m">نُقلت</i>' : ''}`;
      return `<td class="${cl ? 'clash' : ''} ${off ? 'off' : ''}">${o.edit ? `<button class="lvx-c sj" style="${subjVar(x)}" data-xc="${d}|${p}" draggable="true" title="اسحب لنقلها أو تبديلها، أو اضغط لتعديلها">${inner}</button>` : `<div class="lvx-c ro sj" style="${subjVar(x)}">${inner}</div>`}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  // ---------------- نافذة التحويل ----------------
  A.liveConvert = async function (root) {
    const H = L_(); await H.ensureBell();
    const sec = A.section(), bell = A.bell.bellOf(sec);
    const vers = (await api.list('timetable_versions', { section_id: S.sectionId })).filter(v => v.status !== 'archived');
    const dss = (await api.list('display_schedules', { section_id: S.sectionId }));
    const appr = vers.find(v => v.status === 'approved') || vers[0];
    const preS = bell.schedules.find(s => /بعد/.test(s.name + ' ' + (s.tag || ''))) || A.bell.activeSched(bell);
    const [wf, wt] = H.curWeek(); const t0 = H.today();
    const WKS = []; (S.weeks || []).filter(w => !w.archived && w.start_date).slice().sort((x, y) => x.number - y.number).forEach(w => { if (!WKS.some(x => x.number === w.number)) WKS.push(w); });
    const WKT = (WKS.find(w => w.start_date <= t0 && t0 <= H.addD(w.start_date, 6)) || {}).id, WK0 = WKT || (WKS.find(w => w.start_date > t0) || WKS[WKS.length - 1] || {}).id;
    const m = A.modal(`<h3>تحويل يوم أو أسبوع للتعلم عن بعد</h3>
      <p class="sub">يُنشأ جدول استثنائي من الجدول الذي تختاره: تحذف المواد غير المناسبة، وتُرحَّل الحصص الباقية تلقائياً <b>بعدد موحّد لكل الفصول وبلا تعارض للمعلمين</b>. الجدول المعتمد والخطط وما كتبه المعلمون لا يتغير شيء منها.</p>
      <div class="grid g2">
        <div class="field"><label for="cvSrc">من جدول</label><select class="in" id="cvSrc">${vers.map(v => `<option value="v:${v.id}" ${appr && v.id === appr.id ? 'selected' : ''}>${esc(v.label)}${v.status === 'approved' ? ' (المعتمد)' : ' (مسودة)'}</option>`).join('')}${dss.map(d => `<option value="d:${d.id}">جدول استثنائي: ${esc(d.label)}</option>`).join('')}</select></div>
        <div class="field"><label for="cvL">الاسم</label><input class="in" id="cvL" value="جدول التعليم عن بعد"></div>
        <div class="field"><label>المدة</label><div class="kpick" id="cvMode"><button data-m="week" class="on">أسبوع دراسي</button><button data-m="day">يوم واحد</button><button data-m="range">فترة محددة</button></div></div>
        <div class="field" id="cvWkBox"><label for="cvWk">الأسبوع</label><select class="in" id="cvWk">${WKS.map(w => `<option value="${w.id}" ${w.id === WK0 ? 'selected' : ''}>الأسبوع ${esc(w.word)} — ${AR(A.dmy(A.parseDate(w.start_date)))}${w.id === WKT ? ' (الحالي)' : ''}</option>`).join('')}</select><span class="small muted">تُضبط الفترة على أيام الأسبوع المختار تلقائياً (مع استبعاد أيام إجازته).</span></div>
        <div class="field" id="cvDayBox" style="display:none"><label for="cvDay">اليوم</label><input class="in" type="date" id="cvDay" value="${t0 >= wf && t0 <= wt ? t0 : wf}"></div>
        <div class="field" id="cvRgBox" style="display:none"><label>الفترة</label><div class="row" style="gap:6px"><input class="in" type="date" id="cvF" value="${wf}" aria-label="من"><input class="in" type="date" id="cvT" value="${wt}" aria-label="إلى"></div></div>
        <div class="field" style="grid-column:1/-1"><label>الأيام المشمولة</label><div class="row" id="cvDays" style="gap:6px;flex-wrap:wrap"></div></div>
        <div class="field"><label for="cvS">التوقيت (من أداة التوقيت)</label><select class="in" id="cvS">${bell.schedules.map(s => `<option value="${s.id}" ${s.id === preS.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="cvN">عدد الحصص اليومية لكل فصل</label><select class="in" id="cvN"></select><span class="small muted">موحّد لكل الفصول. الزيادة تُحذف بأولوية المادة المكررة، والنقص يظهر في التقرير.</span></div>
        <div class="field" style="grid-column:1/-1"><label>المواد المحذوفة في التعلم عن بعد</label><div class="perm-grid" id="cvEx"><span class="muted small">جارٍ التحميل…</span></div></div>
      </div>
      <div class="acts"><button class="btn" id="cvGo">معاينة الترحيل</button></div>
      <div id="cvRes"></div>`, { cls: 'wide' });
    const el = m.el, q = s => el.querySelector(s); let mode = 'week', src = [], res = null, pv = null;
    const wkSel = () => WKS.find(w => w.id === q('#cvWk').value);
    const range = () => { if (mode === 'week') { const w = wkSel(); if (!w) return ['', '']; return [w.start_date, H.addD(w.start_date, ((A.section() || {}).days || 5) - 1)]; } return mode === 'day' ? [q('#cvDay').value, q('#cvDay').value] : [q('#cvF').value, q('#cvT').value]; };
    const secDays = Array.from({ length: Math.max(5, sec.days || 5) }, (_, i) => i).filter(d => d < (sec.days || 5));
    const drawDays = () => { const [f, t] = range(); const on = new Set(); if (f && t && t >= f) for (let x = f, i = 0; x <= t && i < 31; x = H.addD(x, 1), i++) { const w = dowOf(x); if (secDays.includes(w)) on.add(w); }
      q('#cvDays').innerHTML = on.size ? [...on].sort().map(d => `<label class="chk"><input type="checkbox" data-cvd="${d}" ${wkHol().includes(d) ? '' : 'checked'}> ${DAYS[d]}${wkHol().includes(d) ? ' <span class="small" style="color:#B7791F">(إجازة)</span>' : ''}</label>`).join('') : '<span class="small" style="color:var(--bad)">الفترة لا تحتوي أيام دراسة</span>'; };
    const days = () => $$('[data-cvd]', el).filter(i => i.checked).map(i => +i.dataset.cvd);
    const wkHol = () => mode === 'week' && wkSel() ? (wkSel().holidays || []).map(h => +h.day) : [];
    const metaOf = () => H.metaFrom(q('#cvS').value);
    const drawN = () => { const M0 = metaOf(), cur = +q('#cvN').value || M0.periods; q('#cvN').innerHTML = Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${i + 1 === Math.min(cur, 10) ? 'selected' : ''}>${AR(i + 1)} حصص${i + 1 === M0.periods ? ' (حسب التوقيت)' : ''}</option>`).join(''); };
    const loadSrc = async () => { const v = q('#cvSrc').value; if (v.startsWith('v:')) src = (await api.list('timetable_slots', { version_id: v.slice(2) })).filter(x => x.subject_id).map(x => ({ c: x.class_id, d: x.day, p: x.period, s: x.subject_id, t: x.teacher_id || null })); else src = JSON.parse(JSON.stringify((dss.find(d => d.id === v.slice(2)) || {}).slots || []));
      const cnt = {}; src.forEach(x => { const k = sKey(x); if (!k) return; (cnt[k] = cnt[k] || { k, n: 0, name: sName(x) }).n++; });
      q('#cvEx').innerHTML = Object.values(cnt).sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(o => `<label class="chk"><input type="checkbox" value="${esc(o.k)}" ${PE_RE.test(o.name) ? 'checked' : ''}> ${esc(o.name)} <span class="small muted">(${AR(o.n)})</span></label>`).join('') || '<span class="muted small">الجدول فارغ</span>'; };
    $$('#cvMode button', el).forEach(b => b.onclick = () => { mode = b.dataset.m; $$('#cvMode button', el).forEach(x => x.classList.toggle('on', x === b)); q('#cvDayBox').style.display = mode === 'day' ? '' : 'none'; q('#cvRgBox').style.display = mode === 'range' ? '' : 'none'; q('#cvWkBox').style.display = mode === 'week' ? '' : 'none'; drawDays(); });
    q('#cvWk').onchange = drawDays;
    ['#cvDay', '#cvF', '#cvT'].forEach(s => q(s).onchange = drawDays);
    q('#cvS').onchange = drawN; q('#cvSrc').onchange = () => A.run(null, loadSrc);
    drawDays(); drawN(); await loadSrc();
    const build = () => {
      const dd = days(); if (!dd.length) throw new Error('اختر يوماً واحداً على الأقل');
      const ex = new Set($$('#cvEx input:checked', el).map(i => i.value)), N = +q('#cvN').value, M0 = metaOf();
      const cap = d => Math.min(N, M0.perDay[d] || M0.periods);
      return { dd, N, M0, r: rearrange(src, { days: dd, exclude: ex, cap }) };
    };
    const show = () => {
      const { dd, N, M0, r } = res; const C = [...new Set(r.slots.map(x => x.c))].sort(clsSort); if (!pv || !C.includes(pv)) pv = C[0];
      const og = {}; src.forEach(x => { og[x.c + '|' + x.d + '|' + sKey(x) + '|' + tKey(x) + '|' + x.p] = 1; });
      const nOf = d => Math.min(N, M0.perDay[d] || M0.periods);
      const gapsBy = {}; r.gaps.forEach(g => { (gapsBy[g.c] = gapsBy[g.c] || []).push(g); });
      q('#cvRes').innerHTML = `<div class="lvx-sum">
          <div class="k"><b>${AR(r.slots.length)}</b>حصة بعد الترحيل</div><div class="k"><b>${AR(Object.values(r.removed).reduce((a, b) => a + b, 0))}</b>حصة محذوفة (مواد)</div>
          <div class="k"><b>${AR(r.moved)}</b>حصة نُقل موعدها</div><div class="k ${r.dropped.length ? 'w' : ''}"><b>${AR(r.dropped.length)}</b>حصة زائدة لم تتسع</div>
          <div class="k ${r.conflicts ? 'bad' : 'ok'}"><b>${AR(r.conflicts)}</b>تعارض للمعلمين</div><div class="k ${r.gaps.length ? 'w' : ''}"><b>${AR(r.gaps.length)}</b>يوم فصل أقل من ${AR(N)}</div></div>
        ${Object.keys(r.removed).length ? `<p class="small" style="margin:6px 0">المحذوف: ${Object.entries(r.removed).map(([k, v]) => `${esc(k)} (${AR(v)})`).join('، ')}</p>` : ''}
        ${r.dropped.length ? `<details class="dz-det"><summary>الحصص الزائدة التي لم تتسع (${AR(r.dropped.length)}) — تنتقل إلى خانة الحصص أسفل الجدول للتعديل</summary><ul class="small">${r.dropped.map(x => `<li>${esc(H.cName(x.c))} · ${DAYS[x.d]}: ${esc(sName(x))} — ${esc(tName(x) || 'بلا معلم')} <span class="muted">(${esc(x.why)})</span></li>`).join('')}</ul></details>` : ''}
        ${r.gaps.length ? `<details class="dz-det"><summary>فصول بعدد حصص أقل (${AR(r.gaps.length)}) — يمكنك تعبئتها يدوياً بعد الإنشاء</summary><ul class="small">${Object.entries(gapsBy).map(([c, l]) => `<li>${esc(H.cName(c))}: ${l.map(g => `${DAYS[g.d]} ${AR(g.n)}/${AR(g.N)}`).join('، ')}</li>`).join('')}</ul></details>` : ''}
        <div class="row" style="gap:6px;margin:10px 0 6px;flex-wrap:wrap"><label class="small" for="cvPv">معاينة الفصل</label><select class="in" id="cvPv" style="width:auto">${C.map(c => `<option value="${c}" ${c === pv ? 'selected' : ''}>${esc(H.cName(c))}</option>`).join('')}</select></div>
        ${grid(r.slots, pv, dd, nOf, { orig: x => !og[x.c + '|' + x.d + '|' + sKey(x) + '|' + tKey(x) + '|' + x.p] })}
        <div class="acts" style="flex-wrap:wrap"><button class="btn ok" id="cvPub">${I.check} اعتماد ونشر الآن</button><button class="btn" id="cvEdit">إنشاء وفتح للتعديل</button></div>`;
      q('#cvPv').onchange = e => { pv = e.target.value; show(); };
      const create = async pub => {
        const [f, t] = range(); if (!f || !t || t < f) throw new Error('تحقق من التاريخ');
        const prev = dss.slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
        const v = q('#cvSrc').value;
        const row = (await api.ins('display_schedules', { school_id: S.school.id, section_id: S.sectionId, version_id: v.startsWith('v:') ? v.slice(2) : null, label: q('#cvL').value.trim() || 'جدول التعليم عن بعد', tag: 'للتعليم عن بعد', date_from: f, date_to: t, slots: res.r.slots, pool: res.r.pool, meta: H.metaFrom(q('#cvS').value, { days: res.dd, n: res.N }), links: prev ? { cls: (prev.links || {}).cls || {}, tch: (prev.links || {}).tch || {}, cell: {} } : {}, published: !!pub, published_at: pub ? new Date().toISOString() : null, created_by: S.me.id }))[0];
        m.close(); A.LS.set('live_open', row.id); A.LS.set('live_tab', pub ? 'cls' : 'edit');
        A.toast(pub ? 'أُنشئ الجدول ونُشر — يظهر للمعلمين وأولياء الأمور' : 'أُنشئ الجدول كمسودة — عدّل ما تريد ثم انشره', 'ok'); V.live(root);
      };
      q('#cvPub').onclick = e => A.run(e.currentTarget, async () => { if (!(await A.confirmBox(`نشر «${esc(q('#cvL').value)}» الآن لأولياء الأمور والمعلمين؟`, 'نشر'))) return; await create(true); });
      q('#cvEdit').onclick = e => A.run(e.currentTarget, () => create(false));
    };
    q('#cvGo').onclick = e => A.run(e.currentTarget, async () => { res = build(); show(); q('#cvRes').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  };

  // ---------------- تبويب «تعديل الحصص والإسناد» ----------------
  // الحصص خارج التوقيت (بعد آخر حصة في اليوم، أو في يوم غير مفعّل) تنتقل إلى خانة الحصص الزائدة أسفل الجدول
  A._liveFit = ds => { const M = ds.meta || {}, days = M.days || [0, 1, 2, 3, 4], n = d => Math.min(M.periods || 7, (M.perDay && M.perDay[d]) || M.periods || 7); const keep = [], out = [];
    (ds.slots || []).forEach(x => (days.includes(x.d) && x.p >= 0 && x.p < n(x.d) ? keep : out).push(x)); if (!out.length) return 0;
    ds.pool = (Array.isArray(ds.pool) ? ds.pool : []).concat(out.map(x => ({ c: x.c, s: x.s || null, sn: x.sn || '', t: x.t || null, tn: x.tn || '', why: 'over' }))); ds.slots = keep; return out.length; };
  A.liveEditTab = function (ds, B, h) {
    const H = L_(); const M = ds.meta || {}; const days = M.days || [0, 1, 2, 3, 4];
    const nOf = d => (M.perDay && M.perDay[d]) || M.periods || 7;
    const classes = () => { const set = new Set(ds.slots.map(x => x.c)); return [...set].sort(clsSort); };
    const staff = (S.staff || []).filter(x => x.active !== false).slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
    ds.pool = Array.isArray(ds.pool) ? ds.pool : [];
    let pick = null, poolAll = false; // عنصر محدد من الخانة لوضعه في جدول الفصل
    const persist = async msg => { await api.upd('display_schedules', ds.id, { slots: ds.slots, pool: ds.pool }); if (msg) A.toast(msg, 'ok'); h.saved(); draw(); };
    const capOf = () => days.reduce((a, d) => a + nOf(d), 0);
    const cnt = c => ds.slots.filter(x => x.c === c).length;
    const sib = c => { const k = (x => { const o = A.cls(x) || (H.allCls().find(y => y.id === x) || {}); return (o.stage || '') + '|' + (o.grade_word || String(o.name || '').split(' ').slice(0, 2).join(' ')); }); return classes().filter(x => k(x) === k(c)); };
    const toPool = (x, why) => ds.pool.push({ c: x.c, s: x.s || null, sn: x.sn || sName(x), t: x.t || null, tn: x.tn || '', why });
    const busyT = (tk, d, p, except) => !!tk && ds.slots.some(y => y !== except && y.d === d && y.p === p && tKey(y) === tk);
    const draw = () => {
      const c = h.cls() || classes()[0]; const cm = clashMap(ds.slots); const nC = Object.values(cm).filter(l => l.length > 1).length;
      const subs = {}; ds.slots.forEach(x => { const k = sKey(x); if (k) (subs[k] = subs[k] || { k, n: 0, name: sName(x) }).n++; });
      B.innerHTML = `<div class="lvx-bar">
          <div class="notice ${nC ? 'warn' : 'ok'}" style="display:block;margin:0">${nC ? `${AR(nC)} تعارض للمعلمين — الخانات الحمراء` : 'لا تعارضات للمعلمين ✓'} · ${AR(ds.slots.length)} حصة · ${AR(ds.slots.filter(x => !x.t).length)} بلا معلم مرتبط</div>
          <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">
            <select class="in" id="xeC" style="width:auto" aria-label="الفصل">${classes().map(x => `<option value="${x}" ${x === c ? 'selected' : ''}>${esc(H.cName(x))} — ${AR(cnt(x))}/${AR(capOf())}</option>`).join('')}</select>
            <button class="btn sm" id="xeAuto">تعبئة الفراغات آلياً</button>
            <button class="btn ghost sm" id="xeDelS">حذف مادة من كامل الجدول</button>
            <button class="btn ghost sm" id="xeRe">إعادة الترحيل بلا تعارضات</button>
            <button class="btn ghost sm" id="xeLoad">تقرير الإسناد والأنصبة</button>
            <button class="btn ghost sm" id="xePr">طباعة</button>
          </div></div>
        <p class="small muted" style="margin:8px 0">اضغط أي حصة لتعديل مادتها أو معلمها، أو نقلها/تبديلها، أو حذفها. الخانة الفارغة (+) لإضافة حصة. التعديل هنا للجدول الاستثنائي فقط.</p>
        ${pick ? `<div class="notice info" style="display:block;margin-bottom:6px">اختر خانة فارغة (+) لوضع «${esc(sName(pick))}»${tName(pick) ? ' — ' + esc(tName(pick)) : ''} · <button class="btn ghost sm" id="xePk0" type="button">إلغاء</button></div>` : ''}
        ${grid(ds.slots, c, days, nOf, { edit: true })}
        <div class="lvp">${(() => { const caps = capOf(), all = classes(); const lo = all.filter(x => cnt(x) < caps);
          return `<div class="lvp-cnt"><b>عدد الحصص في الأسبوع لكل فصل</b> <span class="small muted">(السعة ${AR(caps)})</span><div>${all.map(x => { const n = cnt(x); return `<button class="lvp-c ${n < caps ? 'lo' : n > caps ? 'hi' : ''} ${x === c ? 'on' : ''}" data-gc="${x}">${esc(H.cName(x))} <b>${AR(n)}</b></button>`; }).join('')}</div>${lo.length ? `<p class="small" style="color:#B7791F;margin:4px 0 0">${AR(lo.length)} فصل أقل من السعة — أكمله من الخانة أدناه أو بـ«تعبئة الفراغات آلياً».</p>` : ''}</div>`; })()}
          ${(() => { const P = ds.pool.map((x, i) => ({ ...x, i })).filter(x => poolAll || x.c === c); const W = { removed: 'محذوفة', over: 'زائدة', manual: 'أُزيلت يدوياً' };
            return `<div class="lvp-box"><div class="row" style="justify-content:space-between;gap:6px;flex-wrap:wrap"><b>خانة الحصص المحذوفة والزائدة (${AR(P.length)}${poolAll ? '' : ' لهذا الفصل'} · ${AR(ds.pool.length)} إجمالاً)</b><label class="chk small"><input type="checkbox" id="xePA" ${poolAll ? 'checked' : ''}> كل الفصول</label></div>
              ${P.length ? `<div class="lvp-items">${P.map(x => `<span class="lvp-it ${x.why} ${pick && pick._i === x.i ? 'on' : ''}" style="${subjVar(x)}"><button type="button" data-pk="${x.i}" draggable="true" title="اسحبها إلى خانة في الجدول، أو اضغطها ثم اضغط الخانة"><b>${esc(sName(x))}</b><small>${esc(tName(x) || 'بلا معلم')}${poolAll ? ' · ' + esc(H.cName(x.c)) : ''} · ${W[x.why] || ''}</small></button><button type="button" class="x" data-pkx="${x.i}" aria-label="حذف من الخانة">×</button></span>`).join('')}</div>` : '<p class="small muted" style="margin:6px 0 0">لا توجد حصص في الخانة.</p>'}<p class="small muted" style="margin:6px 0 0"><span class="lvp-k removed">المحذوفة (كالبدنية)</span> <span class="lvp-k over">الزائدة</span> <span class="lvp-k manual">أُزيلت يدوياً</span> · اسحب أي حصة من الجدول إلى هنا لإزالتها.</p></div>`; })()}</div>`;
      $('#xeC', B).onchange = e => { h.setCls(e.target.value); pick = null; draw(); };
      $$('[data-gc]', B).forEach(b => b.onclick = () => { h.setCls(b.dataset.gc); pick = null; draw(); });
      const pa = $('#xePA', B); if (pa) pa.onchange = e => { poolAll = e.target.checked; draw(); };
      const pk0 = $('#xePk0', B); if (pk0) pk0.onclick = () => { pick = null; draw(); };
      $$('[data-pk]', B).forEach(b => b.onclick = () => { const it = ds.pool[+b.dataset.pk]; if (it.c !== c) h.setCls(it.c); pick = { ...it, _i: +b.dataset.pk }; draw(); });
      $$('[data-pkx]', B).forEach(b => b.onclick = () => A.run(b, async () => { if (!(await A.confirmBox('حذف هذه الحصة من الخانة؟', 'حذف', true))) return; ds.pool.splice(+b.dataset.pkx, 1); pick = null; await persist(''); }));
      $('#xeAuto', B).onclick = () => autoDialog(c);
      $$('[data-xc]', B).forEach(b => b.onclick = () => { const [d, p] = b.dataset.xc.split('|').map(Number);
        if (pick) return A.run(b, () => dropOn({ pool: pick._i }, d, p, c));
        cellDialog(c, d, p); });
      bindSmart(c);
      $('#xeDelS', B).onclick = () => { const mm = A.modal(`<h3>حذف مادة من كامل الجدول الاستثنائي</h3><div class="perm-grid">${Object.values(subs).sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(o => `<label class="chk"><input type="checkbox" value="${esc(o.k)}"> ${esc(o.name)} <span class="small muted">(${AR(o.n)})</span></label>`).join('')}</div>
          <label class="chk" style="margin-top:8px"><input type="checkbox" id="xdRe" checked> ترحيل الحصص الباقية تلقائياً بعد الحذف (بلا تعارض)</label><div class="acts"><button class="btn bad" id="xdGo">حذف</button></div>`);
        mm.el.querySelector('#xdGo').onclick = e => A.run(e.currentTarget, async () => { const ex = new Set($$('input[value]:checked', mm.el).map(i => i.value)); if (!ex.size) throw new Error('اختر مادة'); const n0 = ds.slots.length;
          if (mm.el.querySelector('#xdRe').checked) { const r = rearrange(ds.slots, { days, exclude: ex, cap: nOf, keepOther: true }); ds.slots = r.slots; ds.pool = ds.pool.concat(r.pool); mm.close(); await persist(`حُذفت ${AR(n0 - r.slots.length - r.dropped.length)} حصة ورُحِّل الباقي${r.dropped.length ? ` · ${AR(r.dropped.length)} لم تتسع` : ''}`); }
          else { ds.slots.filter(x => ex.has(sKey(x))).forEach(x => toPool(x, 'removed')); ds.slots = ds.slots.filter(x => !ex.has(sKey(x))); mm.close(); await persist(`حُذفت ${AR(n0 - ds.slots.length)} حصة`); } }); };
      $('#xeRe', B).onclick = e => A.run(e.currentTarget, async () => { const r = rearrange(ds.slots, { days, exclude: new Set(), cap: nOf, keepOther: true }); if (!(await A.confirmBox(`سيُعاد ترتيب الحصص: ${AR(r.moved)} حصة يتغير موعدها، التعارضات بعده ${AR(r.conflicts)}${r.dropped.length ? `، و${AR(r.dropped.length)} حصة لا تتسع تنتقل إلى خانة الحصص أسفل الجدول` : ''}. متابعة؟`, 'ترحيل'))) return; ds.slots = r.slots; ds.pool = ds.pool.concat(r.pool.filter(x => x.why === 'over')); await persist('أُعيد الترحيل بلا تعارضات'); });
      $('#xeLoad', B).onclick = () => loadReport();
      $('#xePr', B).onclick = () => printDialog();
    };
    const cellDialog = (c, d, p) => {
      const x = ds.slots.find(y => y.c === c && y.d === d && y.p === p);
      const slotsOpt = days.flatMap(dd => Array.from({ length: nOf(dd) }, (_, pp) => [dd, pp])).filter(([dd, pp]) => !(dd === d && pp === p));
      const mm = A.modal(`<h3>${x ? 'تعديل حصة' : 'إضافة حصة'} — ${esc(H.cName(c))} · ${DAYS[d]} · الحصة ${PER[p] || AR(p + 1)}</h3>
        <div class="grid g2"><div class="field"><label for="xcS">المادة</label><select class="in" id="xcS"><option value="">— اختر —</option>${S.subjects.map(s => `<option value="${s.id}" ${x && x.s === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}${x && !x.s && x.sn ? `<option value="n:${esc(x.sn)}" selected>${esc(x.sn)} (من الملف)</option>` : ''}</select></div>
        <div class="field"><label for="xcT">المعلم</label><select class="in" id="xcT"><option value="">— بلا معلم —</option>${staff.map(s => `<option value="${s.id}" ${x && x.t === s.id ? 'selected' : ''}>${esc(s.full_name)}</option>`).join('')}${x && !x.t && x.tn ? `<option value="n:${esc(x.tn)}" selected>${esc(x.tn)} (غير مرتبط)</option>` : ''}</select></div></div>
        ${x ? `<div class="field"><label for="xcMv">نقل إلى (يُبدَّل تلقائياً إن كانت مشغولة)</label><select class="in" id="xcMv"><option value="">— دون نقل —</option>${slotsOpt.map(([dd, pp]) => { const o = ds.slots.find(y => y.c === c && y.d === dd && y.p === pp); return `<option value="${dd}|${pp}">${DAYS[dd]} · ${PER[pp] || AR(pp + 1)}${o ? ' — تبديل مع ' + esc(sName(o)) : ' — فارغة'}</option>`; }).join('')}</select></div>` : ''}
        <div id="xcW" class="small" style="min-height:20px"></div>
        <div class="acts" style="flex-wrap:wrap"><button class="btn" id="xcGo">حفظ</button>${x ? '<button class="btn bad" id="xcDel">إزالة إلى خانة الحصص</button>' : ''}</div>`);
      const g = s => mm.el.querySelector(s);
      const target = () => { const v = g('#xcMv') && g('#xcMv').value; return v ? v.split('|').map(Number) : [d, p]; };
      const warn = () => { const tv = g('#xcT').value; if (!tv) { g('#xcW').innerHTML = ''; return; } const tk = tv; const [dd, pp] = target(); const busy = ds.slots.filter(y => y !== x && y.c !== c && y.d === dd && y.p === pp && tKey(y) === tk);
        g('#xcW').innerHTML = busy.length ? `<div class="notice warn" style="display:block">تعارض: المعلم لديه حصة في نفس الوقت في ${busy.map(y => esc(H.cName(y.c))).join('، ')}. يمكنك الحفظ وسيظهر بالأحمر، أو اختيار وقت آخر.</div>` : `<span style="color:var(--ok)">✓ المعلم متاح في هذا الوقت</span>`; };
      g('#xcT').onchange = warn; if (g('#xcMv')) g('#xcMv').onchange = warn; warn();
      g('#xcGo').onclick = e => A.run(e.currentTarget, async () => {
        const sv = g('#xcS').value, tv = g('#xcT').value; if (!sv) throw new Error('اختر المادة');
        const val = { s: sv.startsWith('n:') ? null : sv, sn: sv.startsWith('n:') ? sv.slice(2) : (A.subjName(sv) || ''), t: tv && !tv.startsWith('n:') ? tv : null, tn: tv ? (tv.startsWith('n:') ? tv.slice(2) : (x && x.t === tv ? x.tn || '' : '')) : '' };
        const [dd, pp] = target();
        if (x) { Object.assign(x, val); if (dd !== d || pp !== p) { const o = ds.slots.find(y => y !== x && y.c === c && y.d === dd && y.p === pp); if (o) { o.d = d; o.p = p; } x.d = dd; x.p = pp; } }
        else ds.slots.push({ c, d, p, ...val });
        mm.close(); await persist(x ? 'حُفظت الحصة' : 'أُضيفت الحصة');
      });
      if (g('#xcDel')) g('#xcDel').onclick = e => A.run(e.currentTarget, async () => { toPool(x, 'manual'); ds.slots = ds.slots.filter(y => y !== x); mm.close(); await persist('نُقلت الحصة إلى خانة الحصص أسفل الجدول'); });
    };
    // ---------- اقتراحات ذكية + سحب وإفلات ----------
    const verdict = (it, d, p, self, c) => { const tk = tKey(it); const cl = tk ? ds.slots.filter(y => y !== self && y.c !== c && y.d === d && y.p === p && tKey(y) === tk) : []; if (cl.length) return { v: 'bad', cl };
      const k = sKey(it), same = ds.slots.filter(y => y !== self && y.c === c && y.d === d && sKey(y) === k).length; return { v: same >= 2 ? 'day' : 'ok', cl: [] }; };
    const markCells = (it, self, c) => $$('[data-xc]', B).forEach(b => { const [d, p] = b.dataset.xc.split('|').map(Number); b.classList.remove('sg-ok', 'sg-bad', 'sg-day'); if (!it) return; if (self && self.d === d && self.p === p) return; const r = verdict(it, d, p, self, c); b.classList.add('sg-' + r.v); b.title = r.v === 'bad' ? 'تعارض: ' + tName(it) + ' لديه حصة في ' + r.cl.map(y => H.cName(y.c)).join('، ') : r.v === 'day' ? 'المادة مكررة في هذا اليوم' : 'مناسبة ✓'; });
    const clashMsg = (it, d, p, self, c) => { const r = verdict(it, d, p, self, c); return r.v === 'bad' ? `تعارض: «${esc(tName(it))}» لديه حصة في الوقت نفسه في ${r.cl.map(y => esc(H.cName(y.c))).join('، ')}.` : r.v === 'day' ? `«${esc(sName(it))}» مكررة مرتين أو أكثر في هذا اليوم.` : ''; };
    function bindSmart(c) {
      if (pick) markCells(pick, null, c);
      let drag = null;
      const start = (e, info) => { drag = info; try { e.dataTransfer.setData('text/plain', 'x'); e.dataTransfer.effectAllowed = 'move'; } catch (_) { } const it = info.pool != null ? ds.pool[info.pool] : info.cell; markCells(it, info.cell || null, c); B.classList.add('dragging'); };
      const end = () => { B.classList.remove('dragging'); markCells(null, null, c); $$('.drop-on', B).forEach(x => x.classList.remove('drop-on')); };
      $$('[data-pk]', B).forEach(b => { b.ondragstart = e => { const it = ds.pool[+b.dataset.pk]; if (it.c !== c) { e.preventDefault(); h.setCls(it.c); draw(); return A.toast('فُتح فصل هذه الحصة — اسحبها الآن', 'ok'); } start(e, { pool: +b.dataset.pk }); }; b.ondragend = end; });
      $$('.lvx-c[data-xc]:not(.add)', B).forEach(b => { b.ondragstart = e => { const [d, p] = b.dataset.xc.split('|').map(Number); start(e, { cell: ds.slots.find(y => y.c === c && y.d === d && y.p === p) }); }; b.ondragend = end; });
      const over = e => { if (!drag) return; e.preventDefault(); e.currentTarget.classList.add('drop-on'); }, leave = e => e.currentTarget.classList.remove('drop-on');
      $$('[data-xc]', B).forEach(b => { b.ondragover = over; b.ondragleave = leave; b.ondrop = e => { e.preventDefault(); const info = drag; drag = null; end(); if (!info) return; const [d, p] = b.dataset.xc.split('|').map(Number); A.run(null, () => dropOn(info, d, p, c)); }; });
      const pb = $('.lvp-box', B); if (pb) { pb.ondragover = e => { if (drag && drag.cell) { e.preventDefault(); pb.classList.add('drop-on'); } }; pb.ondragleave = () => pb.classList.remove('drop-on'); pb.ondrop = e => { e.preventDefault(); const info = drag; drag = null; end(); if (!info || !info.cell) return; A.run(null, async () => { toPool(info.cell, 'manual'); ds.slots = ds.slots.filter(y => y !== info.cell); await persist('نُقلت الحصة إلى الخانة'); }); }; }
    }
    async function dropOn(info, d, p, c) {
      const o = ds.slots.find(y => y.c === c && y.d === d && y.p === p);
      if (info.pool != null) { const it = ds.pool[info.pool]; const m = clashMsg(it, d, p, null, c);
        if (m && !(await A.confirmBox(m + '<br>هل تريد وضعها رغم ذلك؟', 'وضع'))) return;
        if (o) toPool(o, 'manual'), ds.slots = ds.slots.filter(y => y !== o);
        ds.slots.push({ c, d, p, s: it.s || null, sn: it.sn || '', t: it.t || null, tn: it.tn || '' }); ds.pool.splice(info.pool, 1); pick = null;
        return persist(o ? 'وُضعت الحصة ونُقلت السابقة إلى الخانة' : 'وُضعت الحصة'); }
      const x = info.cell; if (!x || (x.d === d && x.p === p)) return;
      const m1 = clashMsg(x, d, p, x, c), m2 = o ? clashMsg(o, x.d, x.p, o, c) : '';
      if ((m1 || m2) && !(await A.confirmBox([m1, m2].filter(Boolean).join('<br>') + '<br>المتابعة رغم ذلك؟', o ? 'تبديل' : 'نقل'))) return;
      const sd = x.d, sp = x.p; x.d = d; x.p = p; if (o) { o.d = sd; o.p = sp; }
      return persist(o ? 'بُدّلت الحصتان' : 'نُقلت الحصة');
    }
    // ---------- التعبئة الآلية للفراغات وفق قواعد ----------
    function autoFill(R) {
      const caps = capOf(), all = classes();
      const scope = R.scope === 'one' ? [R.c] : R.scope === 'sib' ? sib(R.c) : all;
      const target = c => R.target === 'n' ? Math.min(caps, +R.n || caps) : R.target === 'sib' ? Math.min(caps, Math.max(...sib(c).map(cnt))) : caps;
      const per = {}; let added = 0;
      const tpl = c => { const m = {}; ds.slots.concat(ds.pool).filter(x => x.c === c && sKey(x)).forEach(x => { const k = sKey(x); if (!m[k]) m[k] = { s: x.s || null, sn: x.sn || sName(x), t: x.t || null, tn: x.tn || '' }; }); return m; };
      for (const c of scope) {
        let need = target(c) - cnt(c); if (need <= 0) continue;
        const T = tpl(c);
        const cand = [];
        if (R.over) ds.pool.forEach((x, i) => { if (x.c === c && x.why !== 'removed') cand.push({ ...x, _i: i }); });
        if (R.removed) ds.pool.forEach((x, i) => { if (x.c === c && x.why === 'removed') cand.push({ ...x, _i: i }); });
        const used = new Set();
        const empties = () => days.flatMap(d => Array.from({ length: nOf(d) }, (_, p) => ({ d, p }))).filter(e => !ds.slots.some(y => y.c === c && y.d === e.d && y.p === e.p))
          .sort((a, b) => ds.slots.filter(y => y.c === c && y.d === a.d).length - ds.slots.filter(y => y.c === c && y.d === b.d).length || a.p - b.p);
        const perDay = (d, k) => ds.slots.filter(y => y.c === c && y.d === d && sKey(y) === k).length;
        const tryPlace = x => { const k = sKey(x); for (const e of empties()) { if (perDay(e.d, k) >= R.maxDay) continue; if (busyT(tKey(x), e.d, e.p)) continue; ds.slots.push({ c, d: e.d, p: e.p, s: x.s || null, sn: x.sn || '', t: x.t || null, tn: x.tn || '' }); return true; } return false; };
        for (const x of cand) { if (need <= 0) break; if (tryPlace(x)) { used.add(x._i); need--; added++; per[c] = (per[c] || 0) + 1; } }
        // تكرار مواد مختارة بمعلمها في الفصل نفسه (بالترتيب، دورياً)
        let guard = 0;
        while (need > 0 && (R.rep || []).length && guard++ < 200) { let any = false; for (const k of R.rep) { if (need <= 0) break; const t = T[k]; if (!t) continue; if (tryPlace(t)) { need--; added++; per[c] = (per[c] || 0) + 1; any = true; } } if (!any) break; }
        ds.pool = ds.pool.filter((_, i) => !used.has(i));
      }
      return { added, per, left: scope.filter(c => cnt(c) < target(c)).map(c => ({ c, n: cnt(c), t: target(c) })) };
    }
    const autoDialog = c => {
      const subj = {}; ds.slots.concat(ds.pool).forEach(x => { const k = sKey(x); if (k) subj[k] = sName(x); });
      const saved = (ds.meta || {}).fill || {};
      const mm = A.modal(`<h3>تعبئة الفراغات آلياً</h3><p class="sub">تُملأ الخانات الفارغة دون أي تعارض للمعلمين، وفق القواعد التي تختارها. يمكنك التراجع بحذف أي حصة لاحقاً (تعود للخانة).</p>
        <div class="grid g2"><div class="field"><label>النطاق</label><select class="in" id="afS"><option value="one">${esc(H.cName(c))} فقط</option><option value="sib" selected>الفصول المتشابهة (نفس الصف): ${esc(sib(c).map(H.cName).join('، '))}</option><option value="all">كل الفصول</option></select></div>
        <div class="field"><label>الهدف</label><select class="in" id="afT"><option value="caps">ملء كل الفراغات حتى السعة (${AR(capOf())})</option><option value="sib" ${saved.target === 'sib' ? 'selected' : ''}>مساواة الفصول المتشابهة بأعلاها</option><option value="n" ${saved.target === 'n' ? 'selected' : ''}>عدد محدد في الأسبوع</option></select></div>
        <div class="field" id="afNb"><label for="afN">العدد في الأسبوع</label><input class="in" type="number" id="afN" min="1" max="${capOf()}" value="${saved.n || Math.min(30, capOf())}"></div>
        <div class="field"><label for="afM">أقصى عدد للمادة نفسها في اليوم</label><select class="in" id="afM">${[1, 2, 3].map(n => `<option ${+(saved.maxDay || 2) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
        <div class="field"><label>مصادر التعبئة (بالترتيب)</label><label class="chk"><input type="checkbox" id="afO" ${saved.over === false ? '' : 'checked'}> ١ — الحصص الزائدة في الخانة</label><label class="chk"><input type="checkbox" id="afR" ${saved.removed ? 'checked' : ''}> ٢ — الحصص المحذوفة في الخانة (مثل البدنية والفنية)</label></div>
        <div class="field"><label>٣ — ثم تكرار هذه المواد بمعلمها في الفصل (بالترتيب المحدد)</label><div class="perm-grid">${Object.entries(subj).sort((a, b) => a[1].localeCompare(b[1], 'ar')).map(([k, n]) => `<label class="chk"><input type="checkbox" data-rp="${esc(k)}" ${(saved.rep || []).includes(k) ? 'checked' : ''}> ${esc(n)}</label>`).join('')}</div></div>
        <div id="afP" class="small"></div><div class="acts"><button class="btn ghost" id="afPv" type="button">معاينة</button><button class="btn" id="afGo" type="button">تطبيق</button></div>`, { cls: 'wide' });
      const g = x => mm.el.querySelector(x); const nb = () => { g('#afNb').style.display = g('#afT').value === 'n' ? '' : 'none'; }; g('#afT').onchange = nb; nb();
      const rules = () => ({ c, scope: g('#afS').value, target: g('#afT').value, n: +g('#afN').value, maxDay: +g('#afM').value, over: g('#afO').checked, removed: g('#afR').checked, rep: $$('[data-rp]', mm.el).filter(i => i.checked).map(i => i.dataset.rp) });
      const sim = () => { const bs = JSON.stringify(ds.slots), bp = JSON.stringify(ds.pool); const r = autoFill(rules()); ds.slots = JSON.parse(bs); ds.pool = JSON.parse(bp); return r; };
      const show = r => { g('#afP').innerHTML = `<div class="notice ${r.left.length ? 'warn' : 'ok'}" style="display:block">ستُضاف ${AR(r.added)} حصة${Object.keys(r.per).length ? ': ' + Object.entries(r.per).map(([k, v]) => `${esc(H.cName(k))} ${AR(v)}`).join('، ') : ''}.${r.left.length ? `<br>يبقى أقل من الهدف: ${r.left.map(x => `${esc(H.cName(x.c))} ${AR(x.n)}/${AR(x.t)}`).join('، ')} — أضف مواد للتكرار أو فعّل الحصص المحذوفة.` : ' كل الفصول تصل للهدف ✓'}</div>`; };
      g('#afPv').onclick = () => show(sim());
      g('#afGo').onclick = e => A.run(e.currentTarget, async () => { const R = rules(); const r = autoFill(R); const meta = { ...(ds.meta || {}), fill: { target: R.target, n: R.n, maxDay: R.maxDay, over: R.over, removed: R.removed, rep: R.rep } }; await api.upd('display_schedules', ds.id, { meta }); ds.meta = meta; mm.close(); await persist(`أُضيفت ${AR(r.added)} حصة بلا تعارضات${r.left.length ? ` · ${AR(r.left.length)} فصل لم يصل للهدف` : ''}`); });
    };
    const loadRows = () => { const by = {}; ds.slots.forEach(x => { const k = tKey(x) || '—'; const o = by[k] = by[k] || { name: tName(x) || 'بلا معلم', linked: !!x.t, n: 0, d: {}, cls: new Set(), sub: new Set() }; o.n++; o.d[x.d] = (o.d[x.d] || 0) + 1; o.cls.add(H.cName(x.c)); o.sub.add(sName(x)); }); return Object.values(by).sort((a, b) => b.n - a.n); };
    const loadTable = rows => `<table class="tbl"><thead><tr><th>المعلم</th>${days.map(d => `<th>${DAYS[d]}</th>`).join('')}<th>المجموع</th><th>المواد</th><th>الفصول</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.name)}</b>${r.linked ? '' : ' <span class="small" style="color:#B7791F">(غير مرتبط)</span>'}</td>${days.map(d => `<td>${AR(r.d[d] || 0)}</td>`).join('')}<td><b>${AR(r.n)}</b></td><td class="small">${esc([...r.sub].join('، '))}</td><td class="small">${esc([...r.cls].join('، '))}</td></tr>`).join('')}</tbody></table>`;
    const loadReport = () => { const rows = loadRows(); const mm = A.modal(`<h3>تقرير الإسناد والأنصبة — ${esc(ds.label)}</h3><p class="sub">${AR(rows.length)} معلم · ${AR(ds.slots.length)} حصة</p><div class="scroll">${loadTable(rows)}</div><div class="acts"><button class="btn" id="lrP">طباعة</button><button class="btn ghost" id="lrX">تصدير Excel</button></div>`, { cls: 'wide' });
      mm.el.querySelector('#lrP').onclick = () => A.printDoc('الإسناد والأنصبة — ' + ds.label, `${ds.date_from} — ${ds.date_to}`, loadTable(rows), true);
      mm.el.querySelector('#lrX').onclick = () => { if (!window.XLSX) return A.toast('مكتبة Excel غير محملة', 'err'); const wb = XLSX.utils.book_new(); const ws = XLSX.utils.json_to_sheet(rows.map(r => ({ 'المعلم': r.name, ...Object.fromEntries(days.map(d => [DAYS[d], r.d[d] || 0])), 'المجموع': r.n, 'المواد': [...r.sub].join('، '), 'الفصول': [...r.cls].join('، ') }))); ws['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws, 'الأنصبة'); XLSX.writeFile(wb, 'الأنصبة - ' + ds.label + '.xlsx'); }; };
    const tblFor = (pred, label) => { const P = Math.max(1, ...days.map(nOf)); const T = M.times || []; return `<h3 style="margin:14px 0 6px">${esc(label)}</h3><table><thead><tr><th>اليوم</th>${Array.from({ length: P }, (_, p) => `<th>${PER[p] || AR(p + 1)}${T[p] ? `<div style="font-weight:400;font-size:10px" dir="ltr">${T[p][0]}–${T[p][1]}</div>` : ''}</th>`).join('')}</tr></thead><tbody>${days.map(d => `<tr><th style="background:#005499">${DAYS[d]}</th>${Array.from({ length: P }, (_, p) => { const l = ds.slots.filter(x => x.d === d && x.p === p && pred(x)); return `<td>${l.map(x => `<b>${esc(sName(x))}</b><div style="font-size:10px">${esc(pred.tch ? H.cName(x.c) : tName(x))}</div>`).join('<hr style="border:0;border-top:1px dashed #84B7E3">') || '—'}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`; };
    const printDialog = () => { const mm = A.modal(`<h3>طباعة الجدول الاستثنائي</h3><div class="perm-grid"><label class="chk"><input type="radio" name="xp" value="cls" checked> جداول كل الفصول</label><label class="chk"><input type="radio" name="xp" value="one"> الفصل الحالي فقط</label><label class="chk"><input type="radio" name="xp" value="tch"> جداول كل المعلمين</label><label class="chk"><input type="radio" name="xp" value="load"> تقرير الإسناد والأنصبة</label></div><div class="acts"><button class="btn" id="xpGo">طباعة</button></div>`);
      mm.el.querySelector('#xpGo').onclick = () => { const k = (mm.el.querySelector('[name=xp]:checked') || {}).value; const sub = `${ds.date_from} — ${ds.date_to} · ${M.schedName || ''}`; let body = '';
        const brk = i => i ? '<div style="page-break-before:always"></div>' : '';
        if (k === 'load') body = loadTable(loadRows());
        else if (k === 'tch') { const ts = [...new Set(ds.slots.map(tKey).filter(Boolean))].sort((a, b) => tName(ds.slots.find(x => tKey(x) === a)).localeCompare(tName(ds.slots.find(x => tKey(x) === b)), 'ar')); body = ts.map((t, i) => { const pr = x => tKey(x) === t; pr.tch = true; return brk(i) + tblFor(pr, 'جدول: ' + tName(ds.slots.find(x => tKey(x) === t))); }).join(''); }
        else { const cs = k === 'one' ? [h.cls() || classes()[0]] : classes(); body = cs.map((c, i) => brk(i) + tblFor(x => x.c === c, 'جدول فصل: ' + H.cName(c))).join(''); }
        mm.close(); A.printDoc(ds.label, sub, body, true); }; };
    draw();
  };

  // ---------------- ما يظهر لولي الأمر (إعدادات المالك لكل جدول) ----------------
  const VIS0 = { teacher: 1, topic: 1, homework: 1, note: 1, perf: 1, extra: 1, llink: 1, join: 1, room: 1, times: 1, export: 1, legend: 1, views: ['day', 'table', 'week', 'hw'] };
  A.liveVisTab = function (ds, B, onSave) {
    const v = Object.assign({}, VIS0, (ds.meta || {}).vis || {}); v.views = (v.views || []).slice();
    const F = [['join', 'زر «دخول الحصة» والروابط'], ['room', 'زر «دخول قاعة الفصل» في الأعلى'], ['teacher', 'اسم المعلم/المعلمة'], ['times', 'أوقات الحصص'], ['topic', 'الدرس / الموضوع'], ['homework', 'الواجب'], ['note', 'ملاحظة المعلم'], ['perf', 'المهمة الأدائية (من الخطة)'], ['extra', 'العناصر الإضافية (أوراق عمل، تجهيزات…)'], ['llink', 'رابط الدرس (عرض، فيديو…)'], ['legend', 'دلالة الألوان'], ['export', 'أزرار الطباعة والتصدير والتقويم']];
    const W = [['day', 'اليوم (بطاقات)'], ['table', 'جدول الأسبوع'], ['week', 'الأسبوع كاملاً'], ['hw', 'الدروس والواجبات']];
    B.innerHTML = `<p class="small muted" style="margin:0 0 8px">تتحكم هنا فيما يراه ولي الأمر في هذا الجدول. التغيير يصل فوراً لصفحة ولي الأمر، والمعاينة بالأسفل تعكسه. المعلمون يرون حصصهم كاملة دائماً. وعبارات «لم يُضف الدرس» و«بلا رابط» لا تظهر لولي الأمر إطلاقاً — تظهر لك وحدك.</p>
      <div class="grid g2" style="align-items:start"><div class="sec-box"><b>عناصر الحصة</b><div class="perm-grid" style="margin-top:6px">${F.map(([k, l]) => `<label class="chk"><input type="checkbox" data-vf="${k}" ${v[k] ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
      <div class="sec-box"><b>طرق العرض المتاحة</b><div class="perm-grid" style="margin-top:6px">${W.map(([k, l]) => `<label class="chk"><input type="checkbox" data-vw="${k}" ${v.views.includes(k) ? 'checked' : ''}> ${l}</label>`).join('')}</div><p class="small muted" style="margin:6px 0 0">أول طريقة محددة هي ما يُفتح افتراضياً.</p>
        <div class="row" style="gap:6px;margin-top:8px"><button class="btn ghost sm" id="vAll" type="button">إظهار الكل</button><button class="btn ghost sm" id="vMin" type="button">الجدول والدخول فقط</button></div></div></div>`;
    let tm; const go = () => { clearTimeout(tm); tm = setTimeout(() => A.run(null, () => onSave(JSON.parse(JSON.stringify(v)))), 350); };
    $$('[data-vf]', B).forEach(c => c.onchange = () => { v[c.dataset.vf] = c.checked ? 1 : 0; go(); });
    $$('[data-vw]', B).forEach(c => c.onchange = () => { const on = $$('[data-vw]', B).filter(x => x.checked).map(x => x.dataset.vw); if (!on.length) { c.checked = true; return A.toast('اترك طريقة عرض واحدة على الأقل', 'warn'); } v.views = W.map(w => w[0]).filter(k => on.includes(k)); go(); });
    $('#vAll', B).onclick = () => { Object.assign(v, JSON.parse(JSON.stringify(VIS0))); A.liveVisTab({ ...ds, meta: { ...(ds.meta || {}), vis: v } }, B, onSave); onSave(JSON.parse(JSON.stringify(v))); };
    $('#vMin', B).onclick = () => { Object.assign(v, { teacher: 1, topic: 0, homework: 0, note: 0, perf: 0, extra: 0, llink: 0, join: 1, room: 1, times: 1, export: 0, legend: 0, views: ['day', 'table'] }); A.liveVisTab({ ...ds, meta: { ...(ds.meta || {}), vis: v } }, B, onSave); onSave(JSON.parse(JSON.stringify(v))); };
  };

  // ---------------- تقرير إنجاز المعلمين في الجدول الاستثنائي ----------------
  A.liveRepTab = async function (ds, B) {
    const H = L_(); const M = ds.meta || {};
    const dates = []; { const ws = A.parseDate(ds.date_from); ws.setDate(ws.getDate() - ws.getDay()); for (let i = 0; i < 7 * 6; i++) { const x = new Date(ws); x.setDate(ws.getDate() + i); const iso = A.isoDate(x); if (iso < ds.date_from) continue; if (iso > ds.date_to) break; if ((M.days || [0, 1, 2, 3, 4]).includes(x.getDay())) dates.push({ iso, d: x.getDay() }); } }
    B.innerHTML = '<div class="spinner"></div>';
    let E = []; try { E = A._liveEntries ? await A._liveEntries.entriesOf([ds.id], [ds]) : await api.list('live_entries', { ds_id: ds.id }); } catch (_) { }
    const L = ds.links || {}, linkOf = x => (L.cell || {})[`${x.c}|${x.d}|${x.p}`] || (L.cls || {})[x.c] || (x.t && (L.tch || {})[x.t]) || '';
    const teachers = [...new Set(ds.slots.map(tKey).filter(Boolean))].map(k => ({ k, n: tName(ds.slots.find(x => tKey(x) === k)) })).sort((a, b) => a.n.localeCompare(b.n, 'ar'));
    const st = { scope: 'all', day: (dates.find(x => x.iso >= H.today()) || dates[0] || {}).iso, from: ds.date_from, to: ds.date_to, t: '' };
    const rows = () => {
      const inR = dt => st.scope === 'day' ? dt === st.day : st.scope === 'range' ? dt >= st.from && dt <= st.to : true;
      const sel = dates.filter(x => inR(x.iso));
      const by = {};
      sel.forEach(({ iso, d }) => ds.slots.filter(x => x.d === d && (!st.t || tKey(x) === st.t)).forEach(x => { const k = tKey(x) || '—'; const o = by[k] = by[k] || { n: tName(x) || 'بلا معلم', linked: !!x.t, tot: 0, topic: 0, hw: 0, any: 0, link: 0, miss: [] };
        const e = E.find(y => y.class_id === x.c && y.day === x.d && y.period === x.p) || {}; const has = (e.topic || '').trim() || (e.homework || '').trim() || (e.note || '').trim() || (e.link || '').trim();
        o.tot++; if ((e.topic || '').trim()) o.topic++; if ((e.homework || '').trim()) o.hw++; if (has) o.any++; if (linkOf(x)) o.link++; if (!has) o.miss.push({ iso, d, p: x.p, c: x.c, s: sName(x) }); }));
      return Object.values(by).sort((a, b) => (a.any / a.tot) - (b.any / b.tot) || a.n.localeCompare(b.n, 'ar'));
    };
    const pc = (a, b) => b ? Math.round(100 * a / b) : 0;
    const label = () => st.scope === 'day' ? `يوم ${DAYS[A.parseDate(st.day).getDay()]} ${AR(A.dmy(A.parseDate(st.day)))}` : st.scope === 'range' ? `من ${AR(A.dmy(A.parseDate(st.from)))} إلى ${AR(A.dmy(A.parseDate(st.to)))}` : `كامل الفترة ${AR(A.dmy(A.parseDate(ds.date_from)))} — ${AR(A.dmy(A.parseDate(ds.date_to)))}`;
    const table = (R, forPrint) => `<table class="${forPrint ? '' : 'tbl'}"><thead><tr><th>المعلم</th><th>الحصص</th><th>أُضيف لها بيانات</th><th>الإنجاز</th><th>الدرس</th><th>الواجب</th><th>لها رابط دخول</th></tr></thead><tbody>${R.map(r => { const p = pc(r.any, r.tot); return `<tr><td><b>${esc(r.n)}</b>${r.linked ? '' : ' <small style="color:#B7791F">(غير مرتبط)</small>'}</td><td>${AR(r.tot)}</td><td>${AR(r.any)}</td><td>${forPrint ? AR(p) + '٪' : `<div class="lvr-bar"><i style="width:${p}%;background:${p >= 80 ? '#2F855A' : p >= 50 ? '#D69E2E' : '#C53030'}"></i></div><b>${AR(p)}٪</b>`}</td><td>${AR(r.topic)}</td><td>${AR(r.hw)}</td><td>${AR(r.link)}/${AR(r.tot)}</td></tr>`; }).join('') || '<tr><td colspan="7">لا توجد حصص في هذا النطاق</td></tr>'}</tbody></table>`;
    const draw = () => {
      const R = rows(), T = R.reduce((a, r) => ({ tot: a.tot + r.tot, any: a.any + r.any, link: a.link + r.link }), { tot: 0, any: 0, link: 0 });
      B.innerHTML = `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:end;margin-bottom:10px">
          <div class="field" style="margin:0"><label>النطاق</label><div class="kpick" id="rpS">${[['all', 'كامل الفترة'], ['day', 'يوم'], ['range', 'فترة محددة']].map(([k, l]) => `<button data-s="${k}" class="${st.scope === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
          ${st.scope === 'day' ? `<div class="field" style="margin:0"><label for="rpD">اليوم</label><select class="in" id="rpD">${dates.map(x => `<option value="${x.iso}" ${x.iso === st.day ? 'selected' : ''}>${DAYS[x.d]} ${AR(A.dmy(A.parseDate(x.iso)))}</option>`).join('')}</select></div>` : ''}
          ${st.scope === 'range' ? `<div class="field" style="margin:0"><label for="rpF">من</label><input class="in" type="date" id="rpF" value="${st.from}" min="${ds.date_from}" max="${ds.date_to}"></div><div class="field" style="margin:0"><label for="rpT">إلى</label><input class="in" type="date" id="rpT" value="${st.to}" min="${ds.date_from}" max="${ds.date_to}"></div>` : ''}
          <div class="field" style="margin:0"><label for="rpTc">المعلم</label><select class="in" id="rpTc"><option value="">كل المعلمين</option>${teachers.map(t => `<option value="${esc(t.k)}" ${t.k === st.t ? 'selected' : ''}>${esc(t.n)}</option>`).join('')}</select></div>
          <button class="btn ghost sm" id="rpP" type="button">${I.print || ''} طباعة / PDF</button><button class="btn ghost sm" id="rpX" type="button">تصدير Excel</button></div>
        <div class="lvx-sum" style="margin:0 0 10px"><div class="k"><b>${AR(pc(T.any, T.tot))}٪</b>نسبة الإنجاز</div><div class="k"><b>${AR(T.any)}/${AR(T.tot)}</b>حصة أُضيف لها درس أو واجب</div><div class="k ${T.link < T.tot ? 'w' : 'ok'}"><b>${AR(T.link)}/${AR(T.tot)}</b>حصة لها رابط دخول</div><div class="k"><b>${AR(R.filter(r => pc(r.any, r.tot) < 50).length)}</b>معلم أقل من ٥٠٪</div></div>
        <div class="scroll">${table(R)}</div>
        ${st.t && R[0] && R[0].miss.length ? `<details class="dz-det" open><summary>حصص لم تُضف لها بيانات (${AR(R[0].miss.length)})</summary><ul class="small">${R[0].miss.map(m => `<li>${DAYS[m.d]} ${AR(A.dmy(A.parseDate(m.iso)))} · الحصة ${AR(m.p + 1)} · ${esc(H.cName(m.c))} — ${esc(m.s)}</li>`).join('')}</ul></details>` : ''}
        <p class="small muted">«أُضيف لها بيانات» = كتب المعلم الدرس أو الواجب أو ملاحظة أو رابط درس. هذا التقرير لك وحدك.</p>`;
      $$('#rpS button', B).forEach(b => b.onclick = () => { st.scope = b.dataset.s; draw(); });
      const g = id => $(id, B); if (g('#rpD')) g('#rpD').onchange = e => { st.day = e.target.value; draw(); };
      if (g('#rpF')) g('#rpF').onchange = e => { st.from = e.target.value; draw(); }; if (g('#rpT')) g('#rpT').onchange = e => { st.to = e.target.value; draw(); };
      g('#rpTc').onchange = e => { st.t = e.target.value; draw(); };
      g('#rpP').onclick = () => { const R2 = rows(); A.printDoc('تقرير إنجاز المعلمين — ' + ds.label, label() + (st.t ? ' · ' + (teachers.find(t => t.k === st.t) || {}).n : ''), table(R2, true) + (st.t && R2[0] && R2[0].miss.length ? `<h3>حصص لم تُضف لها بيانات</h3><table><tr><th>اليوم</th><th>الحصة</th><th>الفصل</th><th>المادة</th></tr>${R2[0].miss.map(m => `<tr><td>${DAYS[m.d]} ${AR(A.dmy(A.parseDate(m.iso)))}</td><td>${AR(m.p + 1)}</td><td>${esc(H.cName(m.c))}</td><td>${esc(m.s)}</td></tr>`).join('')}</table>` : ''), false); };
      g('#rpX').onclick = () => { if (!window.XLSX) return; const R2 = rows(); const ws = XLSX.utils.json_to_sheet(R2.map(r => ({ 'المعلم': r.n, 'الحصص': r.tot, 'أُضيف لها بيانات': r.any, 'نسبة الإنجاز %': pc(r.any, r.tot), 'الدرس': r.topic, 'الواجب': r.hw, 'لها رابط دخول': r.link }))); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الإنجاز'); XLSX.writeFile(wb, `إنجاز المعلمين - ${ds.label}.xlsx`); };
    };
    draw();
  };
})();
