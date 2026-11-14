/* منصة دينا — البوصلة: (١) مقاييس تربوية للطلاب (أنماط التعلم، الذكاءات المتعددة، الميول المهنية، مهارات الدراسة، الدافعية، الرضا)
   تُطبَّق على فصل برابط/QR (scale.html) وتُعرض نتائجها للفصل ولكل طالب مع توصيات تدريسية وتصدير.
   (٢) مؤشرات الأداء للمالك: إنجاز الخطط، الواجبات، النماذج، الحضور — لكل معلم وللمدرسة. sql/099 + scales.js */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  const DEMO = !!api.demo, DS = () => window.DinaScales;
  A.I.compass = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>';
  if (A.NAV && !A.NAV.some(n => n[0] === 'compass')) { const i = A.NAV.findIndex(n => n[0] === 'analysis'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['compass', 'البوصلة', () => !!S.me && !S.realMe && A.tfeat('compass')]); }
  const TIPS = {
    styles: { v: 'استخدم الخرائط الذهنية والمخططات والفيديو.', a: 'نوّع بالشرح المسموع والنقاش والتسميع.', r: 'وفّر نصوصاً وملخصات ومهام كتابية.', k: 'أدخل التجارب والأنشطة الحركية ولعب الأدوار.' },
    mi: { ling: 'مشاريع كتابة وإلقاء.', logic: 'مسائل تحدٍّ وتحليل بيانات.', spat: 'تصميم ملصقات وإنفوجرافيك.', body: 'نماذج يدوية وأنشطة ميدانية.', mus: 'أناشيد وإيقاع للحفظ.', inter: 'تعلم تعاوني وأدوار قيادية.', intra: 'سجل تعلم ذاتي وأهداف شخصية.', nat: 'تصنيف ورحلات واستكشاف.' },
    riasec: { R: 'المسارات التقنية والهندسية التطبيقية.', I: 'المسارات العلمية والصحية والبحثية.', A: 'التصميم والإعلام والفنون.', S: 'التعليم والإرشاد والخدمات الصحية.', E: 'إدارة الأعمال والريادة والقانون.', C: 'المحاسبة والإدارة ونظم المعلومات.' },
    study: { time: 'تدريب على الجدولة الأسبوعية.', focus: 'استراتيجيات تقليل المشتتات (بومودورو).', notes: 'تعليم طريقة كورنيل للتدوين.', exam: 'برنامج إرشادي لقلق الاختبار.' },
    motive: { inner: 'ربط الدروس باهتماماته وتحديات إثرائية.', outer: 'نظام تعزيز ونقاط واضح.', pers: 'أهداف قصيرة ومتابعة تقدّم مرئية.' },
    wellbeing: { happy: 'أنشطة ترحيبية وتحفيز يومي.', safe: 'تواصل مع الموجه الطلابي.', friends: 'دمج في مجموعات تعاونية.', teacher: 'لقاء فردي قصير مع المعلم.' },
  };
  if (!document.getElementById('cpcss')) { const st = document.createElement('style'); st.id = 'cpcss'; st.textContent = `
.cp-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr))}
.cp-sc{border:1px solid #DCE7F3;border-radius:18px;padding:14px;background:linear-gradient(180deg,#fff,#F5F9FD);display:grid;gap:6px;box-shadow:0 12px 26px -22px rgba(8,43,90,.6)}
.cp-sc .ic{font-size:28px}.cp-sc b{color:#082B5A;font-size:16px}.cp-sc .chips{display:flex;gap:4px;flex-wrap:wrap}.cp-sc .chips span{font-size:11px;border-radius:20px;padding:1px 8px;color:#fff}
.cp-bars{display:grid;gap:8px}.cp-bars div{display:grid;grid-template-columns:130px 1fr 48px;gap:8px;align-items:center;font-size:13.5px;font-weight:700}
.cp-bars i{display:block;height:14px;border-radius:8px}
.cp-kpi{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin:10px 0}
.cp-k{border:1px solid #DCE7F3;border-radius:18px;padding:14px;background:linear-gradient(180deg,#fff,#F5F9FD);box-shadow:inset 0 -4px 0 var(--c,#3AB1DB)}
.cp-k b{display:block;font-size:30px;color:#082B5A}.cp-k span{font-size:12.5px;color:#4D6A8F}
.cp-ring{--p:0;width:64px;height:64px;border-radius:50%;background:conic-gradient(var(--c) calc(var(--p)*1%),#E6EDF4 0);display:grid;place-items:center;float:inline-end}
.cp-ring::after{content:attr(data-v);width:48px;height:48px;border-radius:50%;background:#fff;display:grid;place-items:center;font-weight:900;color:#082B5A;font-size:13px}
.cp-pill{display:inline-block;border-radius:20px;padding:1px 9px;font-size:12px;font-weight:800;color:#fff}
`; document.head.appendChild(st); }
  const genCode = () => { const ab = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 6; i++) s += ab[Math.floor(Math.random() * ab.length)]; return s; };
  const link = c => location.origin + location.pathname.replace(/[^/]*$/, '') + 'scale.html?c=' + c;
  const bars = (sc, sco) => `<div class="cp-bars">${DS().top(sc, sco).map(x => `<div><span>${esc(x.n)}</span><i style="width:${Math.max(3, x.v)}%;background:${x.c}"></i><span>${AR(x.v)}٪</span></div>`).join('')}</div>`;
  const avgScores = (sc, rs) => { const o = {}; Object.keys(sc.dims).forEach(k => { const v = rs.map(r => (r.scores || {})[k]).filter(x => x != null); o[k] = v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; }); return o; };

  const st = { tab: null };
  V.compass = async function (root) {
    const own = S.me.is_owner && !S.realMe;
    st.tab = st.tab || 'scales'; if (st.tab === 'kpi' && !own) st.tab = 'scales';
    const T = [['scales', 'المقاييس'], ['runs', 'التطبيقات والنتائج'], ...(own ? [['kpi', 'مؤشرات الأداء']] : [])];
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>البوصلة</h2><p class="sub" style="margin:2px 0 0">مقاييس تربوية تكشف أنماط تعلم الطلاب وقدراتهم وميولهم لتوجيه التدريس والإرشاد${own ? '، ومؤشرات أداء المدرسة والمعلمين' : ''}.</p></div></div>
      <div class="fm-tabs">${T.map(([k, l]) => `<button data-t="${k}" class="${st.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="cpB"></div></div>`;
    $$('[data-t]', root).forEach(b => b.onclick = () => { st.tab = b.dataset.t; V.compass(root); });
    const B = $('#cpB', root); ({ scales, runs, kpi })[st.tab](B, root);
  };
  function scales(B, root) {
    B.innerHTML = `<div class="cp-grid">${DS().list.map(s => `<div class="cp-sc"><span class="ic" aria-hidden="true">${s.icon}</span><b>${esc(s.name)}</b><span class="small muted">${esc(s.about)}</span><span class="small">المراحل: ${s.stages.join('، ')} · ${AR(s.items.length)} عبارة</span><div class="chips">${Object.values(s.dims).map(d => `<span style="background:${d[1]}">${esc(d[0])}</span>`).join('')}</div><button class="btn sm" data-run="${s.key}">تطبيق على فصل</button></div>`).join('')}</div>
      <p class="small muted" style="margin-top:10px">العبارات أُعدّت للاستخدام المدرسي الإرشادي، وليست اختبارات تشخيصية مقننة؛ تُستخدم نتائجها لتنويع التدريس والتوجيه لا للحكم على الطالب.</p>`;
    $$('[data-run]', B).forEach(b => b.onclick = () => runDialog(DS().get(b.dataset.run), () => { st.tab = 'runs'; V.compass(root); }));
  }
  function runDialog(sc, after) {
    const cls = (S.allClasses || S.classes || []).filter(c => c.active !== false).sort((a, b) => (a.sort || 0) - (b.sort || 0));
    const m = A.modal(`<h3>${sc.icon} تطبيق «${esc(sc.name)}»</h3><div class="grid g2"><div class="field"><label for="crC">الفصل</label><select class="in" id="crC">${cls.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div><div class="field"><label for="crT">العنوان</label><input class="in" id="crT" value="${esc(sc.name)}"></div></div>
      <p class="small muted">يختار الطالب اسمه من قائمة فصله ثم يجيب. يمكنك إغلاق التطبيق متى شئت.</p><div class="acts"><button class="btn" id="crGo">إنشاء الرابط</button></div>`);
    m.el.querySelector('#crGo').onclick = e => A.run(e.currentTarget, async () => {
      const row = { school_id: S.school.id, scale_key: sc.key, title: m.el.querySelector('#crT').value.trim() || sc.name, class_id: m.el.querySelector('#crC').value, code: genCode(), ...(DEMO ? { id: 'sr' + Date.now(), owner: S.me.id, state: 'open', created_at: new Date().toISOString() } : {}) };
      await api.ins('scale_runs', [row]); m.close(); share(row); after && after();
    });
  }
  function share(r) {
    let qr = ''; try { const q = window.qrcode(0, 'M'); q.addData(link(r.code)); q.make(); qr = q.createSvgTag({ cellSize: 5, margin: 1, scalable: true }); } catch (_) { }
    const m = A.modal(`<h3>رابط المقياس للطلاب</h3><div style="display:grid;place-items:center;gap:8px;text-align:center"><div style="width:220px">${qr}</div><b style="font-size:28px;letter-spacing:.2em" dir="ltr">${esc(r.code)}</b><input class="in" readonly value="${esc(link(r.code))}" dir="ltr" onclick="this.select()"><div class="row" style="gap:6px"><button class="btn sm" id="shC">نسخ الرابط</button><a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('مقياس ' + r.title + ': ' + link(r.code))}">واتساب</a></div></div>`);
    m.el.querySelector('#shC').onclick = async () => { try { await navigator.clipboard.writeText(link(r.code)); A.toast('نُسخ', 'ok'); } catch (_) { } };
  }
  async function runs(B) {
    B.innerHTML = '<div class="spinner"></div>';
    let R = [], P = []; try { R = await api.list('scale_runs', { school_id: S.school.id }, { order: 'created_at', desc: true }); P = R.length ? await api.list('scale_resp', { run_id: R.map(r => r.id) }) : []; } catch (_) { }
    if (DEMO) R.forEach(r => { if (!P.some(p => p.run_id === r.id)) { const sc = DS().get(r.scale_key); (S.allClasses ? [] : []); const st = (A.studentsAll ? [] : []); for (let k = 0; k < 18; k++) { const ans = sc.items.map(() => 1 + Math.floor(Math.random() * sc.scale.length)); P.push({ id: 'p' + k + r.id, run_id: r.id, name: 'طالب ' + AR(k + 1), answers: ans, scores: DS().score(sc, ans) }); } } });
    B.innerHTML = R.length ? `<div class="fm-list">${R.map(r => { const sc = DS().get(r.scale_key) || { icon: '', name: r.scale_key }; const n = P.filter(p => p.run_id === r.id).length; return `<div class="fm-row" data-r="${r.id}" tabindex="0" role="button"><div style="display:flex;gap:10px;align-items:center"><span style="font-size:26px">${sc.icon}</span><div><b>${esc(r.title)}</b><div class="meta"><span>${esc((A.cls(r.class_id) || {}).name || '')}</span><span>${AR(n)} استجابة</span><span class="pill ${r.state === 'open' ? 'st-approved' : ''}">${r.state === 'open' ? 'مفتوح' : 'مغلق'}</span></div></div></div><span class="small muted">${esc(A.arDate ? A.arDate(String(r.created_at).slice(0, 10)) : '')}</span></div>`; }).join('')}</div>` : A.emptyBox('لا تطبيقات بعد', 'من تبويب «المقاييس» اختر مقياساً وطبّقه على فصل.');
    $$('[data-r]', B).forEach(x => { const go = () => { const r = R.find(y => y.id === x.dataset.r); report(r, P.filter(p => p.run_id === r.id), () => runs(B)); }; x.onclick = go; x.onkeydown = e => { if (e.key === 'Enter') go(); }; });
  }
  function report(r, rs, after) {
    const sc = DS().get(r.scale_key); const avg = avgScores(sc, rs); const t = DS().top(sc, avg); const tips = TIPS[sc.key] || {};
    const grp = {}; rs.forEach(p => { const k = DS().top(sc, p.scores || {})[0]; if (k) (grp[k.k] = grp[k.k] || []).push(p); });
    const m = A.modal(`<div class="head" style="margin:0;padding-inline-end:44px"><div class="grow"><h3 style="margin:0">${sc.icon} ${esc(r.title)} — ${esc((A.cls(r.class_id) || {}).name || '')}</h3><span class="small muted">${AR(rs.length)} استجابة</span></div>
        <button class="btn ghost sm" id="rpS">الرابط</button><button class="btn ghost sm" id="rpT">${r.state === 'open' ? 'إغلاق' : 'إعادة فتح'}</button><button class="btn ghost sm" id="rpX">Excel</button><button class="btn sm" id="rpP">${A.I.print || ''} تقرير الفصل</button></div>
      <div class="grid g2" style="align-items:start;margin-top:10px"><div class="card" style="margin:0"><h3 style="margin-top:0">ملف الفصل</h3>${bars(sc, avg)}<p class="small" style="margin-top:10px"><b>توصية تدريسية:</b> ${esc(tips[t[0].k] || '')}${t[1] ? ' و' + esc(tips[t[1].k] || '') : ''}</p></div>
        <div class="card" style="margin:0"><h3 style="margin-top:0">مجموعات حسب البُعد الأبرز</h3>${Object.entries(grp).sort((a, b) => b[1].length - a[1].length).map(([k, L]) => `<div style="margin-bottom:8px"><span class="cp-pill" style="background:${sc.dims[k][1]}">${esc(sc.dims[k][0])} · ${AR(L.length)}</span> <span class="small">${L.map(p => esc(p.name)).join('، ')}</span></div>`).join('') || A.emptyBox('لا استجابات بعد')}</div></div>
      <h3>الطلاب</h3><div class="scroll"><table class="tbl"><thead><tr><th>الطالب</th>${Object.values(sc.dims).map(d => `<th>${esc(d[0])}</th>`).join('')}<th>الأبرز</th><th></th></tr></thead><tbody>${rs.map((p, i) => { const tp = DS().top(sc, p.scores || {})[0] || {}; return `<tr><td><b>${esc(p.name)}</b></td>${Object.keys(sc.dims).map(k => `<td>${AR((p.scores || {})[k] ?? 0)}٪</td>`).join('')}<td><span class="cp-pill" style="background:${tp.c || '#999'}">${esc(tp.n || '')}</span></td><td><button class="btn ghost sm" data-ind="${i}">تقرير</button></td></tr>`; }).join('')}</tbody></table></div>`, { cls: 'wide' });
    m.el.querySelector('#rpS').onclick = () => share(r);
    m.el.querySelector('#rpT').onclick = e => A.run(e.currentTarget, async () => { r.state = r.state === 'open' ? 'closed' : 'open'; await api.upd('scale_runs', r.id, { state: r.state }); m.close(); after && after(); });
    m.el.querySelector('#rpP').onclick = () => A.printDoc(`${sc.name} — ${(A.cls(r.class_id) || {}).name || ''}`, `${AR(rs.length)} طالباً`, `<h3>ملف الفصل</h3><table><tr>${t.map(x => `<th>${esc(x.n)}</th>`).join('')}</tr><tr>${t.map(x => `<td>${AR(x.v)}٪</td>`).join('')}</tr></table><p><b>توصية تدريسية:</b> ${esc(tips[t[0].k] || '')}</p><h3>الطلاب</h3><table><tr><th>الطالب</th>${Object.values(sc.dims).map(d => `<th>${esc(d[0])}</th>`).join('')}<th>الأبرز</th></tr>${rs.map(p => `<tr><td>${esc(p.name)}</td>${Object.keys(sc.dims).map(k => `<td>${AR((p.scores || {})[k] ?? 0)}٪</td>`).join('')}<td>${esc((DS().top(sc, p.scores || {})[0] || {}).n || '')}</td></tr>`).join('')}</table>`, true);
    m.el.querySelector('#rpX').onclick = () => { if (!window.XLSX) return; const ws = XLSX.utils.json_to_sheet(rs.map(p => { const o = { 'الطالب': p.name }; Object.entries(sc.dims).forEach(([k, d]) => o[d[0]] = (p.scores || {})[k] ?? 0); o['الأبرز'] = (DS().top(sc, p.scores || {})[0] || {}).n || ''; return o; })); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'النتائج'); XLSX.writeFile(wb, `${sc.name}.xlsx`); };
    $$('[data-ind]', m.el).forEach(b => b.onclick = () => { const p = rs[+b.dataset.ind]; const tp = DS().top(sc, p.scores || {}); A.printDoc(`${sc.name} — ${p.name}`, (A.cls(r.class_id) || {}).name || '', `<table><tr><th>البُعد</th><th>الدرجة</th><th>الوصف</th></tr>${tp.map(x => `<tr><td><b>${esc(x.n)}</b></td><td>${AR(x.v)}٪</td><td>${esc(x.d || '')}</td></tr>`).join('')}</table><p><b>أبرز ما يميز الطالب:</b> ${esc(tp[0].n)}.</p><p><b>توصيات:</b> ${esc(tips[tp[0].k] || '')} ${tp[1] ? esc(tips[tp[1].k] || '') : ''}</p>`, false); });
  }

  // ---------- مؤشرات الأداء (للمالك) ----------
  async function kpi(B) {
    B.innerHTML = '<div class="spinner"></div>';
    const E = (S.allEntries || S.entries || []).filter(e => e.subject_id && e.teacher_id);
    const month = new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 7);
    const [F, H] = await Promise.all([api.list('form_tasks', { school_id: S.school.id }, { select: 'id,assignee,status,mode' }).catch(() => []), api.list('staff_att', { school_id: S.school.id }, { gte: { day: month + '-01' } }).catch(() => [])]);
    const filled = e => e.status && e.status !== 'empty', hasHw = e => { const h = (e.homework || '').trim(); return !!h && !/^لا يوجد|^بدون|^[-–—.\s]+$/.test(h); };
    const pct = (a, b) => b ? Math.round(a * 100 / b) : null;
    const T = [...new Set(E.map(e => e.teacher_id))].map(id => { const es = E.filter(e => e.teacher_id === id), fl = es.filter(filled); const fs = F.filter(f => f.assignee === id && f.mode !== 'sign'); const hs = H.filter(h => h.staff_id === id);
      const o = { id, plan: pct(fl.length, es.length), hw: pct(fl.filter(hasHw).length, fl.length), forms: fs.length ? pct(fs.filter(f => ['submitted', 'approved'].includes(f.status)).length, fs.length) : null, att: hs.length ? pct(hs.filter(h => ['present', 'excused', 'leave'].includes(h.status)).length, hs.length) : null };
      const v = [o.plan, o.hw, o.forms, o.att].filter(x => x != null); o.idx = v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; return o; }).sort((a, b) => b.idx - a.idx);
    const avg = k => { const v = T.map(t => t[k]).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
    const ring = (v, c) => `<span class="cp-ring" style="--p:${v || 0};--c:${c}" data-v="${v == null ? '—' : AR(v) + '٪'}"></span>`;
    const tone = v => v == null ? '' : v >= 85 ? 'color:#1F6B44' : v >= 60 ? 'color:#8a5a00' : 'color:#B42318';
    B.innerHTML = `<div class="cp-kpi">${[['plan', 'إنجاز خطة الأسبوع', '#005499'], ['hw', 'حصص فيها واجب', '#3AB1DB'], ['forms', 'إنجاز النماذج', '#2E8B57'], ['att', 'انضباط الحضور (الشهر)', '#C9A44C'], ['idx', 'المؤشر العام', '#082B5A']].map(([k, l, c]) => `<div class="cp-k" style="--c:${c}">${ring(avg(k), c)}<b>${avg(k) == null ? '—' : AR(avg(k)) + '٪'}</b><span>${l}</span></div>`).join('')}</div>
      <div class="scroll"><table class="tbl"><thead><tr><th>المعلم</th><th>الخطة</th><th>الواجبات</th><th>النماذج</th><th>الحضور</th><th>المؤشر العام</th></tr></thead><tbody>${T.map(t => `<tr><td><b>${esc(A.personName(t.id) || '')}</b></td>${['plan', 'hw', 'forms', 'att', 'idx'].map(k => `<td style="font-weight:800;${tone(t[k])}">${t[k] == null ? '—' : AR(t[k]) + '٪'}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="6">${A.emptyBox('لا بيانات للأسبوع المحدد')}</td></tr>`}</tbody></table></div>
      <p class="small muted">الخطة والواجبات من الأسبوع المعروض حالياً، والنماذج من كل النماذج المرسلة، والحضور من الموارد البشرية هذا الشهر. المؤشر العام متوسط المتاح منها. — المؤشرات وسيلة متابعة وتحسين لا حكم نهائي.</p>
      <div class="acts"><button class="btn ghost" id="kpP">${A.I.print || ''} طباعة</button></div>`;
    $('#kpP', B).onclick = () => A.printDoc('مؤشرات الأداء', (A.week() ? 'الأسبوع ' + A.week().word : '') + ' · ' + month, `<table><tr><th>المعلم</th><th>الخطة</th><th>الواجبات</th><th>النماذج</th><th>الحضور</th><th>المؤشر</th></tr>${T.map(t => `<tr><td>${esc(A.personName(t.id) || '')}</td>${['plan', 'hw', 'forms', 'att', 'idx'].map(k => `<td>${t[k] == null ? '—' : AR(t[k]) + '٪'}</td>`).join('')}</tr>`).join('')}</table>`, true);
  }
})();
