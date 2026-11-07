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
    const out = [], dropped = [], removed = {}, gaps = [];
    let moved = 0;
    const wk = {}; src.forEach(x => { if (!sKey(x) || o.exclude.has(sKey(x))) return; const k = x.c + '|' + sKey(x); wk[k] = (wk[k] || 0) + 1; });
    src.forEach(x => { if (sKey(x) && o.exclude.has(sKey(x)) && o.days.includes(x.d)) removed[sName(x)] = (removed[sName(x)] || 0) + 1; });
    for (const d of o.days) {
      const N = Math.max(1, o.cap(d));
      const L = {}; src.filter(x => x.d === d && sKey(x) && !o.exclude.has(sKey(x))).sort((a, b) => a.p - b.p).forEach(x => (L[x.c] = L[x.c] || []).push({ ...x }));
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
    return { slots: out, dropped, removed, gaps, moved, conflicts };
  }
  A.liveRearrange = rearrange;

  const clashMap = slots => { const m = {}; slots.forEach(x => { const t = tKey(x); if (!t) return; const k = t + '|' + x.d + '|' + x.p; (m[k] = m[k] || []).push(x); }); return m; };
  const isClash = (m, x) => { const t = tKey(x); return !!t && (m[t + '|' + x.d + '|' + x.p] || []).length > 1; };

  // شبكة فصل (مشتركة بين المعاينة والتعديل)
  function grid(slots, c, days, nOf, o = {}) {
    const P = Math.max(1, ...days.map(nOf), ...slots.filter(x => x.c === c).map(x => x.p + 1)); const cm = clashMap(slots);
    return `<div class="scroll"><table class="tbl lvx-g"><thead><tr><th>اليوم</th>${Array.from({ length: P }, (_, p) => `<th>${PER[p] || AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${days.map(d => `<tr><th>${DAYS[d]}</th>${Array.from({ length: P }, (_, p) => {
      const x = slots.find(y => y.c === c && y.d === d && y.p === p), off = p >= nOf(d);
      if (!x) return `<td class="${off ? 'off' : 'emp'}">${o.edit && !off ? `<button class="lvx-c add" data-xc="${d}|${p}" aria-label="إضافة حصة ${DAYS[d]} ${AR(p + 1)}">+</button>` : '<span class="faint">—</span>'}</td>`;
      const cl = isClash(cm, x), mv = o.orig && o.orig(x);
      const inner = `<b>${esc(sName(x))}</b><small>${esc(tName(x) || 'بلا معلم')}</small>${cl ? '<i class="lvx-w">تعارض</i>' : mv ? '<i class="lvx-m">نُقلت</i>' : ''}`;
      return `<td class="${cl ? 'clash' : ''} ${off ? 'off' : ''}">${o.edit ? `<button class="lvx-c" data-xc="${d}|${p}">${inner}</button>` : `<div class="lvx-c ro">${inner}</div>`}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
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
    const m = A.modal(`<h3>تحويل يوم أو أسبوع للتعلم عن بعد</h3>
      <p class="sub">يُنشأ جدول استثنائي من الجدول الذي تختاره: تحذف المواد غير المناسبة، وتُرحَّل الحصص الباقية تلقائياً <b>بعدد موحّد لكل الفصول وبلا تعارض للمعلمين</b>. الجدول المعتمد والخطط وما كتبه المعلمون لا يتغير شيء منها.</p>
      <div class="grid g2">
        <div class="field"><label for="cvSrc">من جدول</label><select class="in" id="cvSrc">${vers.map(v => `<option value="v:${v.id}" ${appr && v.id === appr.id ? 'selected' : ''}>${esc(v.label)}${v.status === 'approved' ? ' (المعتمد)' : ' (مسودة)'}</option>`).join('')}${dss.map(d => `<option value="d:${d.id}">جدول استثنائي: ${esc(d.label)}</option>`).join('')}</select></div>
        <div class="field"><label for="cvL">الاسم</label><input class="in" id="cvL" value="جدول التعليم عن بعد"></div>
        <div class="field"><label>المدة</label><div class="kpick" id="cvMode"><button data-m="day" class="on">يوم واحد</button><button data-m="range">أسبوع أو عدة أيام</button></div></div>
        <div class="field" id="cvDayBox"><label for="cvDay">اليوم</label><input class="in" type="date" id="cvDay" value="${t0 >= wf && t0 <= wt ? t0 : wf}"></div>
        <div class="field" id="cvRgBox" style="display:none"><label>الفترة</label><div class="row" style="gap:6px"><input class="in" type="date" id="cvF" value="${wf}" aria-label="من"><input class="in" type="date" id="cvT" value="${wt}" aria-label="إلى"></div></div>
        <div class="field" style="grid-column:1/-1"><label>الأيام المشمولة</label><div class="row" id="cvDays" style="gap:6px;flex-wrap:wrap"></div></div>
        <div class="field"><label for="cvS">التوقيت (من أداة التوقيت)</label><select class="in" id="cvS">${bell.schedules.map(s => `<option value="${s.id}" ${s.id === preS.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="cvN">عدد الحصص اليومية لكل فصل</label><select class="in" id="cvN"></select><span class="small muted">موحّد لكل الفصول. الزيادة تُحذف بأولوية المادة المكررة، والنقص يظهر في التقرير.</span></div>
        <div class="field" style="grid-column:1/-1"><label>المواد المحذوفة في التعلم عن بعد</label><div class="perm-grid" id="cvEx"><span class="muted small">جارٍ التحميل…</span></div></div>
      </div>
      <div class="acts"><button class="btn" id="cvGo">معاينة الترحيل</button></div>
      <div id="cvRes"></div>`, { cls: 'wide' });
    const el = m.el, q = s => el.querySelector(s); let mode = 'day', src = [], res = null, pv = null;
    const range = () => mode === 'day' ? [q('#cvDay').value, q('#cvDay').value] : [q('#cvF').value, q('#cvT').value];
    const secDays = Array.from({ length: Math.max(5, sec.days || 5) }, (_, i) => i).filter(d => d < (sec.days || 5));
    const drawDays = () => { const [f, t] = range(); const on = new Set(); if (f && t && t >= f) for (let x = f, i = 0; x <= t && i < 31; x = H.addD(x, 1), i++) { const w = dowOf(x); if (secDays.includes(w)) on.add(w); }
      q('#cvDays').innerHTML = on.size ? [...on].sort().map(d => `<label class="chk"><input type="checkbox" data-cvd="${d}" checked> ${DAYS[d]}</label>`).join('') : '<span class="small" style="color:var(--bad)">الفترة لا تحتوي أيام دراسة</span>'; };
    const days = () => $$('[data-cvd]', el).filter(i => i.checked).map(i => +i.dataset.cvd);
    const metaOf = () => H.metaFrom(q('#cvS').value);
    const drawN = () => { const M0 = metaOf(), cur = +q('#cvN').value || M0.periods; q('#cvN').innerHTML = Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}" ${i + 1 === Math.min(cur, 10) ? 'selected' : ''}>${AR(i + 1)} حصص${i + 1 === M0.periods ? ' (حسب التوقيت)' : ''}</option>`).join(''); };
    const loadSrc = async () => { const v = q('#cvSrc').value; if (v.startsWith('v:')) src = (await api.list('timetable_slots', { version_id: v.slice(2) })).filter(x => x.subject_id).map(x => ({ c: x.class_id, d: x.day, p: x.period, s: x.subject_id, t: x.teacher_id || null })); else src = JSON.parse(JSON.stringify((dss.find(d => d.id === v.slice(2)) || {}).slots || []));
      const cnt = {}; src.forEach(x => { const k = sKey(x); if (!k) return; (cnt[k] = cnt[k] || { k, n: 0, name: sName(x) }).n++; });
      q('#cvEx').innerHTML = Object.values(cnt).sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(o => `<label class="chk"><input type="checkbox" value="${esc(o.k)}" ${PE_RE.test(o.name) ? 'checked' : ''}> ${esc(o.name)} <span class="small muted">(${AR(o.n)})</span></label>`).join('') || '<span class="muted small">الجدول فارغ</span>'; };
    $$('#cvMode button', el).forEach(b => b.onclick = () => { mode = b.dataset.m; $$('#cvMode button', el).forEach(x => x.classList.toggle('on', x === b)); q('#cvDayBox').style.display = mode === 'day' ? '' : 'none'; q('#cvRgBox').style.display = mode === 'day' ? 'none' : ''; drawDays(); });
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
        ${r.dropped.length ? `<details class="dz-det"><summary>الحصص الزائدة التي لم تتسع (${AR(r.dropped.length)})</summary><ul class="small">${r.dropped.map(x => `<li>${esc(H.cName(x.c))} · ${DAYS[x.d]}: ${esc(sName(x))} — ${esc(tName(x) || 'بلا معلم')} <span class="muted">(${esc(x.why)})</span></li>`).join('')}</ul></details>` : ''}
        ${r.gaps.length ? `<details class="dz-det"><summary>فصول بعدد حصص أقل (${AR(r.gaps.length)}) — يمكنك تعبئتها يدوياً بعد الإنشاء</summary><ul class="small">${Object.entries(gapsBy).map(([c, l]) => `<li>${esc(H.cName(c))}: ${l.map(g => `${DAYS[g.d]} ${AR(g.n)}/${AR(g.N)}`).join('، ')}</li>`).join('')}</ul></details>` : ''}
        <div class="row" style="gap:6px;margin:10px 0 6px;flex-wrap:wrap"><label class="small" for="cvPv">معاينة الفصل</label><select class="in" id="cvPv" style="width:auto">${C.map(c => `<option value="${c}" ${c === pv ? 'selected' : ''}>${esc(H.cName(c))}</option>`).join('')}</select></div>
        ${grid(r.slots, pv, dd, nOf, { orig: x => !og[x.c + '|' + x.d + '|' + sKey(x) + '|' + tKey(x) + '|' + x.p] })}
        <div class="acts" style="flex-wrap:wrap"><button class="btn ok" id="cvPub">${I.check} اعتماد ونشر الآن</button><button class="btn" id="cvEdit">إنشاء وفتح للتعديل</button></div>`;
      q('#cvPv').onchange = e => { pv = e.target.value; show(); };
      const create = async pub => {
        const [f, t] = range(); if (!f || !t || t < f) throw new Error('تحقق من التاريخ');
        const prev = dss.slice().sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0];
        const v = q('#cvSrc').value;
        const row = (await api.ins('display_schedules', { school_id: S.school.id, section_id: S.sectionId, version_id: v.startsWith('v:') ? v.slice(2) : null, label: q('#cvL').value.trim() || 'جدول التعليم عن بعد', tag: 'للتعليم عن بعد', date_from: f, date_to: t, slots: res.r.slots, meta: H.metaFrom(q('#cvS').value, { days: res.dd, n: res.N }), links: prev ? { cls: (prev.links || {}).cls || {}, tch: (prev.links || {}).tch || {}, cell: {} } : {}, published: !!pub, published_at: pub ? new Date().toISOString() : null, created_by: S.me.id }))[0];
        m.close(); A.LS.set('live_open', row.id); A.LS.set('live_tab', pub ? 'cls' : 'edit');
        A.toast(pub ? 'أُنشئ الجدول ونُشر — يظهر للمعلمين وأولياء الأمور' : 'أُنشئ الجدول كمسودة — عدّل ما تريد ثم انشره', 'ok'); V.live(root);
      };
      q('#cvPub').onclick = e => A.run(e.currentTarget, async () => { if (!(await A.confirmBox(`نشر «${esc(q('#cvL').value)}» الآن لأولياء الأمور والمعلمين؟`, 'نشر'))) return; await create(true); });
      q('#cvEdit').onclick = e => A.run(e.currentTarget, () => create(false));
    };
    q('#cvGo').onclick = e => A.run(e.currentTarget, async () => { res = build(); show(); q('#cvRes').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  };

  // ---------------- تبويب «تعديل الحصص والإسناد» ----------------
  A.liveEditTab = function (ds, B, h) {
    const H = L_(); const M = ds.meta || {}; const days = M.days || [0, 1, 2, 3, 4];
    const nOf = d => (M.perDay && M.perDay[d]) || M.periods || 7;
    const classes = () => { const set = new Set(ds.slots.map(x => x.c)); return [...set].sort(clsSort); };
    const staff = (S.staff || []).filter(x => x.active !== false).slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
    const persist = async msg => { await api.upd('display_schedules', ds.id, { slots: ds.slots }); if (msg) A.toast(msg, 'ok'); h.saved(); draw(); };
    const draw = () => {
      const c = h.cls() || classes()[0]; const cm = clashMap(ds.slots); const nC = Object.values(cm).filter(l => l.length > 1).length;
      const subs = {}; ds.slots.forEach(x => { const k = sKey(x); if (k) (subs[k] = subs[k] || { k, n: 0, name: sName(x) }).n++; });
      B.innerHTML = `<div class="lvx-bar">
          <div class="notice ${nC ? 'warn' : 'ok'}" style="display:block;margin:0">${nC ? `${AR(nC)} تعارض للمعلمين — الخانات الحمراء` : 'لا تعارضات للمعلمين ✓'} · ${AR(ds.slots.length)} حصة · ${AR(ds.slots.filter(x => !x.t).length)} بلا معلم مرتبط</div>
          <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">
            <select class="in" id="xeC" style="width:auto" aria-label="الفصل">${classes().map(x => `<option value="${x}" ${x === c ? 'selected' : ''}>${esc(H.cName(x))}</option>`).join('')}</select>
            <button class="btn ghost sm" id="xeDelS">حذف مادة من كامل الجدول</button>
            <button class="btn ghost sm" id="xeRe">إعادة الترحيل بلا تعارضات</button>
            <button class="btn ghost sm" id="xeLoad">تقرير الإسناد والأنصبة</button>
            <button class="btn ghost sm" id="xePr">طباعة</button>
          </div></div>
        <p class="small muted" style="margin:8px 0">اضغط أي حصة لتعديل مادتها أو معلمها، أو نقلها/تبديلها، أو حذفها. الخانة الفارغة (+) لإضافة حصة. التعديل هنا للجدول الاستثنائي فقط.</p>
        ${grid(ds.slots, c, days, nOf, { edit: true })}`;
      $('#xeC', B).onchange = e => { h.setCls(e.target.value); draw(); };
      $$('[data-xc]', B).forEach(b => b.onclick = () => { const [d, p] = b.dataset.xc.split('|').map(Number); cellDialog(c, d, p); });
      $('#xeDelS', B).onclick = () => { const mm = A.modal(`<h3>حذف مادة من كامل الجدول الاستثنائي</h3><div class="perm-grid">${Object.values(subs).sort((a, b) => a.name.localeCompare(b.name, 'ar')).map(o => `<label class="chk"><input type="checkbox" value="${esc(o.k)}"> ${esc(o.name)} <span class="small muted">(${AR(o.n)})</span></label>`).join('')}</div>
          <label class="chk" style="margin-top:8px"><input type="checkbox" id="xdRe" checked> ترحيل الحصص الباقية تلقائياً بعد الحذف (بلا تعارض)</label><div class="acts"><button class="btn bad" id="xdGo">حذف</button></div>`);
        mm.el.querySelector('#xdGo').onclick = e => A.run(e.currentTarget, async () => { const ex = new Set($$('input[value]:checked', mm.el).map(i => i.value)); if (!ex.size) throw new Error('اختر مادة'); const n0 = ds.slots.length;
          if (mm.el.querySelector('#xdRe').checked) { const r = rearrange(ds.slots, { days, exclude: ex, cap: nOf, keepOther: true }); ds.slots = r.slots; mm.close(); await persist(`حُذفت ${AR(n0 - r.slots.length - r.dropped.length)} حصة ورُحِّل الباقي${r.dropped.length ? ` · ${AR(r.dropped.length)} لم تتسع` : ''}`); }
          else { ds.slots = ds.slots.filter(x => !ex.has(sKey(x))); mm.close(); await persist(`حُذفت ${AR(n0 - ds.slots.length)} حصة`); } }); };
      $('#xeRe', B).onclick = e => A.run(e.currentTarget, async () => { const r = rearrange(ds.slots, { days, exclude: new Set(), cap: nOf, keepOther: true }); if (!(await A.confirmBox(`سيُعاد ترتيب الحصص: ${AR(r.moved)} حصة يتغير موعدها، التعارضات بعده ${AR(r.conflicts)}${r.dropped.length ? `، و${AR(r.dropped.length)} حصة لا تتسع ستُحذف` : ''}. متابعة؟`, 'ترحيل'))) return; ds.slots = r.slots; await persist('أُعيد الترحيل بلا تعارضات'); });
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
        <div class="acts" style="flex-wrap:wrap"><button class="btn" id="xcGo">حفظ</button>${x ? '<button class="btn bad" id="xcDel">حذف الحصة</button>' : ''}</div>`);
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
      if (g('#xcDel')) g('#xcDel').onclick = e => A.run(e.currentTarget, async () => { ds.slots = ds.slots.filter(y => y !== x); mm.close(); await persist('حُذفت الحصة'); });
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
})();
