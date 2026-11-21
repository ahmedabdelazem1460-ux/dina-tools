/* منصة دينا — المنتج متعدد المدارس (sql/113 + brand.js)
   (١) تطبيق هوية المدرسة بعد الدخول: DinaBrand.set(schools.settings.brand) — الافتراضي هوية دينا فلا يتغير شيء لدينا.
   (٢) V.setup «تجهيز المدرسة» للمالك: الهوية، الأقسام، الفصول (مولّد)، المعلمون (استيراد)، الطلاب (استيراد)، الانطلاق.
       إضافة فقط: لا يحذف ولا يكرر شيئاً موجوداً. يُفتح تلقائياً لمدرسة جديدة (settings.setup.done = false).
   (٣) V.schools «المدارس والاشتراكات» لمدير المنصة فقط (is_platform_admin): قائمة المدارس، تجهيز مدرسة جديدة برابط تفعيل لمديرها، حالة الاشتراك. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc } = A;
  const AR = A.AR || (n => String(n));
  const BR = () => window.DinaBrand;
  const own = () => !!(S.me && S.me.is_owner);
  const nk = s => (A.normKey ? A.normKey(String(s || '')) : String(s || '').trim());
  const STEPS = [['id', 'الهوية'], ['sec', 'الأقسام'], ['cls', 'الفصول'], ['tch', 'المعلمون'], ['stu', 'الطلاب'], ['go', 'الانطلاق']];
  const STAGES = [['رياض الأطفال', 'KG', ['الأول', 'الثاني', 'الثالث'], ['KG1', 'KG2', 'KG3']], ['الابتدائية', 'ابتدائي', ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'], ['أول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سادس']], ['المتوسطة', 'متوسط', ['الأول', 'الثاني', 'الثالث'], ['أول', 'ثاني', 'ثالث']], ['الثانوية', 'ثانوي', ['الأول', 'الثاني', 'الثالث'], ['أول', 'ثاني', 'ثالث']]];
  const LABELS = { ar: ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي'], num: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'], en: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] };
  const PRESETS = [['الكحلي (الافتراضي)', { navy: '#082B5A', blue: '#005499', sky: '#3AB1DB', green: '#2E8B57' }], ['أخضر', { navy: '#0E3B2E', blue: '#1F6E45', sky: '#5BC48A', green: '#C9A44C' }], ['عنابي', { navy: '#4A1020', blue: '#7A1F35', sky: '#C9A44C', green: '#2E8B57' }], ['بنفسجي', { navy: '#2D1B4E', blue: '#5B3C99', sky: '#9D7FE0', green: '#2E8B57' }], ['فيروزي', { navy: '#06343D', blue: '#0E7C86', sky: '#3FC1C9', green: '#E0A32E' }]];

  // ---------- (١) تطبيق الهوية ----------
  let lastB = null, setupPushed = false;
  setInterval(() => {
    if (!S.school || !BR()) return;
    const b = (S.school.settings || {}).brand || null, k = S.school.id + JSON.stringify(b);
    if (k !== lastB) { lastB = k; BR().set(b, true); }
    const st = (S.school.settings || {}).setup;
    if (!setupPushed && own() && st && st.done === false && !/^#\/setup/.test(location.hash)) { setupPushed = true; location.hash = '#/setup'; }
  }, 700);
  // مدير المنصة
  let PA = null; A.isPlatformAdmin = () => PA === true;
  const checkPA = async () => { if (PA !== null || !S.me) return; PA = false; try { PA = !!(await api.rpc('is_platform_admin', {})); } catch (_) { PA = false; } if (PA && A.renderNav) try { A.renderNav(); } catch (_) { } };
  setInterval(() => { if (S.me && PA === null) checkPA(); }, 1500);

  A.I.setup = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M4 21V8l8-5 8 5v13"/><path d="M9 21v-6h6v6"/><circle cx="12" cy="10" r="1.6"/></svg>';
  A.I.schools = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 21h20"/><path d="M4 21V10l5-3 5 3v11"/><path d="M14 21V6l4-3 4 3v15"/><path d="M7 14h4M17 9h2M17 13h2"/></svg>';
  if (A.NAV) { const at = () => { const i = A.NAV.findIndex(n => n[0] === 'admin'); return i < 0 ? A.NAV.length : i + 1; };
    if (!A.NAV.some(n => n[0] === 'setup')) A.NAV.splice(at(), 0, ['setup', 'تجهيز المدرسة والهوية', () => own()]);
    if (!A.NAV.some(n => n[0] === 'schools')) A.NAV.splice(at(), 0, ['schools', 'المدارس والاشتراكات', () => own() && A.isPlatformAdmin()]); }

  if (!document.getElementById('su-css')) { const s = document.createElement('style'); s.id = 'su-css'; s.textContent = `
  .su-steps{display:flex;gap:6px;overflow-x:auto;margin:8px 0 14px;padding:2px;scrollbar-width:thin;counter-reset:su}
  .su-steps button{flex:1 0 auto;border:1.5px solid var(--border);background:#fff;border-radius:14px;padding:9px 12px;font:inherit;font-weight:800;color:var(--muted);cursor:pointer;display:flex;align-items:center;gap:8px;white-space:nowrap}
  .su-steps button i{font-style:normal;width:24px;height:24px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:var(--pale);color:var(--navy);font-size:12px}
  .su-steps button.on{background:var(--navy);color:#fff;border-color:var(--navy)}.su-steps button.on i{background:#fff}
  .su-steps button.ok i{background:#2E8B57;color:#fff}
  .su-steps button:focus-visible{outline:3px solid var(--sky);outline-offset:2px}
  .su-two{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:16px;align-items:start}
  @media(max-width:900px){.su-two{grid-template-columns:minmax(0,1fr)}}
  .su-pv{border:1px solid var(--border);border-radius:16px;overflow:hidden;background:#F6F9FD;position:sticky;top:12px}
  .su-pv .bar{display:flex;align-items:center;gap:10px;padding:12px 14px;color:#fff}
  .su-pv .bar img{height:38px;max-width:120px;object-fit:contain}
  .su-pv .bar b{font-size:15px;display:block}.su-pv .bar small{opacity:.8}
  .su-pv .body{padding:14px}.su-pv .rep{background:#fff;border-radius:12px;padding:10px;border:1px solid var(--border)}
  .su-pv .rh{border-radius:10px;padding:10px 12px;color:#fff;display:flex;justify-content:space-between;align-items:center}
  .su-pv .chips{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}.su-pv .chips span{border-radius:20px;padding:4px 10px;font-size:12px;font-weight:800;color:#fff}
  .su-logo{display:flex;align-items:center;gap:10px;border:1px dashed var(--border);border-radius:12px;padding:8px;min-height:62px}
  .su-logo img{height:44px;max-width:120px;object-fit:contain;background:repeating-conic-gradient(#eef2f8 0 25%,#fff 0 50%) 0 0/12px 12px;border-radius:6px}
  .su-logo.dark img{background:#082B5A}
  .su-cols{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
  .su-cols label{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--muted)}
  .su-cols input[type=color]{width:44px;height:36px;border:1px solid var(--border);border-radius:8px;padding:2px;background:#fff}
  .su-pre{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}.su-pre button{border:1px solid var(--border);border-radius:20px;background:#fff;padding:4px 10px 4px 6px;font:inherit;font-size:12px;cursor:pointer;display:flex;gap:6px;align-items:center}
  .su-pre i{display:inline-flex;width:28px;height:14px;border-radius:7px;overflow:hidden}.su-pre i b{flex:1}
  .su-grid{border-collapse:separate;border-spacing:0;width:100%;font-size:13px}
  .su-grid th,.su-grid td{padding:6px;border-bottom:1px solid #EEF2F8;text-align:center}
  .su-grid th:first-child,.su-grid td:first-child{text-align:start}
  .su-grid input{width:56px;text-align:center;border:1.5px solid var(--border);border-radius:8px;padding:5px;font:inherit}
  .su-st{font-size:11px;font-weight:800;border-radius:10px;padding:1px 8px;display:inline-block}
  .su-st.new{background:#E5F4EA;color:#23704A}.su-st.old{background:#EEF2F8;color:#4D6A8F}.su-st.bad{background:#FDE7E4;color:#B3261E}
  .su-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px}
  .su-kp div{background:#fff;border:1px solid var(--border);border-radius:14px;padding:10px 12px}.su-kp b{display:block;font-size:24px;color:var(--navy)}.su-kp span{font-size:12px;color:var(--muted);font-weight:700}
  .su-kp .ok b{color:#23704A}.su-kp .no b{color:#B3261E}
  .sc-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px}
  .sc-card{background:#fff;border:1px solid var(--border);border-radius:16px;padding:14px;box-shadow:var(--sh1)}
  .sc-card h4{margin:0 0 4px;color:var(--navy)}
  `; document.head.appendChild(s); }

  // ---------- مساعدات القراءة من Excel أو اللصق ----------
  function parseRows(text) {
    const lines = String(text || '').split(/\r?\n/).map(l => l.trimEnd()).filter(l => l.trim());
    return lines.map(l => (l.includes('\t') ? l.split('\t') : l.split(/[،,;]/)).map(c => c.trim()));
  }
  async function readFile(f) {
    if (/\.(xlsx|xls|csv)$/i.test(f.name) && window.XLSX) { const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const ws = wb.Sheets[wb.SheetNames[0]]; return XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }).filter(r => r.some(c => String(c).trim())).map(r => r.map(c => String(c).trim())); }
    return parseRows(await f.text());
  }
  // كشف الأعمدة من صف العناوين (عربي/إنجليزي/نور)
  function mapCols(rows, defs) {
    const head = (rows[0] || []).map(nk); let hasHead = false; const idx = {};
    defs.forEach(([k, keys]) => { const i = head.findIndex(h => keys.some(x => h && h.includes(nk(x)))); if (i >= 0) { idx[k] = i; hasHead = true; } });
    if (!hasHead) defs.forEach(([k], i) => idx[k] = i);
    return { idx, body: hasHead ? rows.slice(1) : rows };
  }
  const digits = s => String(s || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d+]/g, '');

  // =============== (٢) تجهيز المدرسة ===============
  V.setup = async function (root) {
    if (!own()) { root.innerHTML = ''; location.hash = '#/home'; return; }
    const t = A.LS.get('su_t') || 'id', st = (S.school.settings || {}).setup || {};
    const counts = await stats();
    const okOf = { id: !!(S.school.settings || {}).brand, sec: S.sections.length > 0, cls: counts.cls > 0, tch: counts.staff > 1, stu: counts.stu > 0, go: st.done !== false && !!st.doneAt };
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">تجهيز المدرسة والهوية</h2><p class="sub" style="margin:2px 0 0">خطوات تجهيز المدرسة: الهوية، الأقسام، الفصول، المعلمون، الطلاب. كل خطوة تضيف فقط ولا تحذف أو تكرر ما هو موجود، ويمكنك العودة لأي خطوة لاحقاً.</p></div></div>
      <div class="su-steps" role="tablist">${STEPS.map(([k, n], i) => `<button role="tab" aria-selected="${k === t}" class="${k === t ? 'on' : ''} ${okOf[k] ? 'ok' : ''}" data-s="${k}"><i>${okOf[k] ? '✓' : AR(i + 1)}</i>${n}</button>`).join('')}</div><div id="suB"></div></div>`;
    $$('[data-s]', root).forEach(b => b.onclick = () => { A.LS.set('su_t', b.dataset.s); V.setup(root); });
    const box = $('#suB', root), next = k => { A.LS.set('su_t', k); V.setup(root); };
    ({ id: sId, sec: sSec, cls: sCls, tch: sTch, stu: sStu, go: sGo }[t] || sId)(box, next, counts, root);
  };
  async function stats() {
    const sid = S.school.id; let staff = [], cls = [], stu = 0;
    try { staff = await api.list('staff', { school_id: sid }); } catch (_) { }
    try { cls = await api.list('classes', { section_id: S.sections.map(s => s.id) }); } catch (_) { }
    try { stu = (await api.list('students', { school_id: sid, active: true }, { select: 'id' })).length; } catch (_) { }
    return { staff: staff.filter(x => x.active !== false).length, acc: staff.filter(x => x.user_id).length, cls: cls.length, stu, staffL: staff, clsL: cls };
  }
  const saveSettings = async patch => { const settings = Object.assign({}, S.school.settings || {}, patch); const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; };

  // ----- ١ الهوية -----
  function sId(box, next) {
    const D = BR().DINA, cur = Object.assign({}, (S.school.settings || {}).brand || {}), b = JSON.parse(JSON.stringify(cur)); b.colors = Object.assign({}, D.colors, b.colors); b.signers = Object.assign({}, b.signers || {});
    const isDinaNow = BR().isDina();
    const val = (k, def) => b[k] != null ? b[k] : def;
    box.innerHTML = `<div class="su-two"><div>
      ${isDinaNow && !cur.name ? `<div class="sec-box nobrand" style="margin-bottom:10px"><b>هذه مدرستك الحالية بهوية دينا الافتراضية.</b><div class="small muted">أي تعديل هنا يغيّر هوية هذه المدرسة. للمدارس الجديدة تُضبط هويتها من حساب مديرها.</div></div>` : ''}
      <div class="grid g2">
        <div class="field"><label for="bN">اسم المدرسة كاملاً</label><input class="in" id="bN" value="${esc(val('name', S.school.name || D.name))}"></div>
        <div class="field"><label for="bS">الاسم المختصر (يظهر في «منصة …»)</label><input class="in" id="bS" value="${esc(val('short', D.short))}"></div>
        <div class="field"><label for="bE">الاسم بالإنجليزية</label><input class="in" id="bE" dir="ltr" value="${esc(val('nameEn', D.nameEn))}"></div>
        <div class="field"><label for="bA">اسم المنصة</label><input class="in" id="bA" value="${esc(val('platform', D.platform))}"></div></div>
      <b style="display:block;margin-top:10px">الشعارات</b><p class="small muted" style="margin:2px 0 6px">SVG أو PNG بخلفية شفافة. الشعار الملوّن للتقارير، والأبيض للشريط الداكن، والرمز للأيقونة.</p>
      <div class="grid g3" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px">${[['logo', 'الشعار الملوّن', ''], ['logoWhite', 'الشعار الأبيض', 'dark'], ['mark', 'الرمز (أيقونة)', '']].map(([k, n, c]) => `<div><div class="small" style="font-weight:700;color:var(--muted)">${n}</div><div class="su-logo ${c}"><img alt="${n}" src="${esc(val(k, D[k]) || D[k])}"><label class="btn ghost sm" style="cursor:pointer">رفع<input type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" data-up="${k}" hidden></label>${b[k] ? `<button class="btn ghost sm" data-rm="${k}">افتراضي</button>` : ''}</div></div>`).join('')}</div>
      <b style="display:block;margin-top:12px">الألوان</b>
      <div class="su-cols" style="margin-top:6px">${[['navy', 'الأساسي الداكن'], ['blue', 'الأساسي'], ['sky', 'التمييز'], ['green', 'النجاح/التأكيد']].map(([k, n]) => `<label><input type="color" data-c="${k}" value="${esc(b.colors[k])}"> ${n}</label>`).join('')}</div>
      <div class="su-pre">${PRESETS.map(([n, c], i) => `<button type="button" data-pre="${i}"><i>${Object.values(c).map(x => `<b style="background:${x}"></b>`).join('')}</i>${n}</button>`).join('')}</div>
      <b style="display:block;margin-top:12px">الموقّعون الافتراضيون</b><p class="small muted" style="margin:2px 0 6px">تظهر في نماذج التأمين والتواقيع والتقارير، ويمكن تغييرها في كل نموذج.</p>
      <div class="grid g3" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">${[['principal', 'مدير المدرسة'], ['deputy', 'وكيل المدرسة'], ['academic', 'المدير الأكاديمي']].map(([k, n]) => `<div class="field"><label for="sg${k}">${n}</label><input class="in" id="sg${k}" data-sg="${k}" value="${esc(b.signers[k] != null ? b.signers[k] : BR().sig(k))}"></div>`).join('')}</div>
      <div class="acts" style="justify-content:flex-start"><button class="btn" id="bSv">حفظ الهوية</button><button class="btn ghost" id="bNx">التالي: الأقسام ←</button></div></div>
      <div class="su-pv" id="bPv" aria-label="معاينة الهوية"></div></div>`;
    const pv = () => { const p = BR().preview(b), c = p.colors; $('#bPv', box).innerHTML = `<div class="bar" style="background:linear-gradient(135deg,${c.navy},${c.blue})"><img src="${esc(p.logoWhite || p.logo)}" alt=""><div><b>${esc(p.platform)}</b><small>${esc(p.name)}</small></div></div>
      <div class="body"><div class="rep"><div class="rh" style="background:${c.navy}"><div><b>تقرير تجريبي</b><div class="small" style="opacity:.8">${esc(p.name)}</div></div><img src="${esc(p.logoWhite || p.logo)}" alt="" style="height:34px;max-width:100px;object-fit:contain"></div>
      <table class="tbl" style="margin-top:8px;font-size:12px"><tr><th style="color:${c.navy}">البند</th><th style="color:${c.navy}">القيمة</th></tr><tr><td>مثال</td><td><b style="color:${c.blue}">١٢٣</b></td></tr></table>
      <div class="small" style="margin-top:8px;color:#4D6A8F">${['principal', 'deputy', 'academic'].map(k => (p.signers || {})[k]).filter(Boolean).map(esc).join(' · ') || 'بلا موقّعين افتراضيين'}</div></div>
      <div class="chips">${Object.values(c).map(x => `<span style="background:${x}">${x}</span>`).join('')}</div></div>`; };
    const bind = (id, k) => { const el = $(id, box); el.oninput = () => { b[k] = el.value.trim(); pv(); }; };
    bind('#bN', 'name'); bind('#bS', 'short'); bind('#bE', 'nameEn'); bind('#bA', 'platform');
    $$('[data-c]', box).forEach(i => i.oninput = () => { b.colors[i.dataset.c] = i.value; pv(); });
    $$('[data-pre]', box).forEach(x => x.onclick = () => { b.colors = Object.assign({}, PRESETS[+x.dataset.pre][1]); $$('[data-c]', box).forEach(i => i.value = b.colors[i.dataset.c]); pv(); });
    $$('[data-sg]', box).forEach(i => i.oninput = () => { b.signers[i.dataset.sg] = i.value.trim(); pv(); });
    $$('[data-rm]', box).forEach(x => x.onclick = () => { delete b[x.dataset.rm]; sId.__b = b; pv(); x.closest('.su-logo').querySelector('img').src = D[x.dataset.rm]; x.remove(); });
    $$('[data-up]', box).forEach(i => i.onchange = () => { const f = i.files[0]; if (!f) return; if (f.size > 2e6) return A.toast('الشعار أكبر من ٢ م.ب', 'err'); A.run(null, async () => { const url = await api.uploadAsset(f, { max: 800 }); b[i.dataset.up] = url; i.closest('.su-logo').querySelector('img').src = url; pv(); A.toast('رُفع الشعار — اضغط «حفظ الهوية»', 'ok'); }); });
    const save = async () => { const out = JSON.parse(JSON.stringify(b)); const D2 = BR().DINA; if (JSON.stringify(out.colors) === JSON.stringify(D2.colors)) delete out.colors; Object.keys(out).forEach(k => { if (out[k] === '' || out[k] == null) delete out[k]; }); out.app = 'منصة ' + (out.short || D2.short); await saveSettings({ brand: out }); BR().set(out, true); };
    $('#bSv', box).onclick = ev => A.run(ev.currentTarget, async () => { await save(); A.toast('حُفظت الهوية وطُبّقت على المنصة', 'ok'); });
    $('#bNx', box).onclick = ev => A.run(ev.currentTarget, async () => { await save(); next('sec'); });
    pv();
  }

  // ----- ٢ الأقسام -----
  function sSec(box, next) {
    const L = S.sections.slice();
    box.innerHTML = `<p class="small muted" style="margin-top:0">لكل قسم (بنين، بنات، عالمي، فرع…) فصوله ومعلموه وجدوله وجرسه. عدد الأيام والحصص يُضبط بدقة لاحقاً من «اليوم الدراسي والجدول الزمني».</p>
      <div class="scroll"><table class="tbl"><thead><tr><th>اسم القسم</th><th>الاسم المختصر</th><th>أيام الدراسة</th><th>الحصص اليومية</th></tr></thead><tbody>${L.map(s => `<tr><td><input class="in" data-k="name" data-id="${s.id}" value="${esc(s.name)}" aria-label="اسم القسم"></td><td><input class="in" data-k="short_name" data-id="${s.id}" value="${esc(s.short_name || '')}" aria-label="المختصر" style="max-width:140px"></td><td><input class="in" type="number" min="1" max="7" data-k="days" data-id="${s.id}" value="${s.days || 5}" style="max-width:80px" aria-label="الأيام"></td><td><input class="in" type="number" min="1" max="12" data-k="periods" data-id="${s.id}" value="${s.periods || 7}" style="max-width:80px" aria-label="الحصص"></td></tr>`).join('')}
      <tr><td><input class="in" id="nN" placeholder="قسم جديد — مثال: قسم البنات"></td><td><input class="in" id="nS" placeholder="البنات" style="max-width:140px"></td><td><input class="in" type="number" id="nD" min="1" max="7" value="5" style="max-width:80px"></td><td><input class="in" type="number" id="nP" min="1" max="12" value="7" style="max-width:80px"></td></tr></tbody></table></div>
      <div class="acts" style="justify-content:flex-start"><button class="btn" id="sSv">حفظ الأقسام</button><button class="btn ghost" id="sNx">التالي: الفصول ←</button></div>`;
    const save = async () => {
      for (const s of L) { const p = {}; $$(`[data-id="${s.id}"]`, box).forEach(i => { let v = i.value.trim(); if (i.dataset.k === 'days' || i.dataset.k === 'periods') v = Math.max(1, parseInt(digits(v), 10) || (i.dataset.k === 'days' ? 5 : 7)); if (String(v) !== String(s[i.dataset.k] ?? '')) p[i.dataset.k] = v || null; }); if (Object.keys(p).length) { await api.updateSection(s.id, p); Object.assign(s, p); } }
      const nn = $('#nN', box).value.trim(); if (nn) { const r = await api.addSection({ school_id: S.school.id, name: nn, short_name: $('#nS', box).value.trim() || null, days: +digits($('#nD', box).value) || 5, periods: +digits($('#nP', box).value) || 7, sort: S.sections.length }); if (r) S.sections.push(r); }
    };
    $('#sSv', box).onclick = ev => A.run(ev.currentTarget, async () => { await save(); A.toast('حُفظت الأقسام', 'ok'); sSec(box, next); });
    $('#sNx', box).onclick = ev => A.run(ev.currentTarget, async () => { await save(); next('cls'); });
  }

  // ----- ٣ الفصول (مولّد) -----
  function sCls(box, next, counts) {
    let sec = A.LS.get('su_sec') || S.sectionId; if (!S.sections.some(s => s.id === sec)) sec = (S.sections[0] || {}).id;
    const existing = counts.clsL.filter(c => c.section_id === sec), Q = A.LS.get('su_cls_' + sec) || {}; let lab = A.LS.get('su_lab') || 'ar';
    const nameOf = (st, gi, li) => `${st[3][gi]} ${st[1]} ${LABELS[lab][li]}`.replace(/\s+/g, ' ').trim();
    const plan = () => { const out = []; STAGES.forEach((st, si) => st[2].forEach((gw, gi) => { const n = +Q[si + '-' + gi] || 0; for (let li = 0; li < n; li++) { const name = nameOf(st, gi, li); out.push({ name, stage: st[0], grade_word: gw, class_label: `${st[3][gi]} - ${LABELS[lab][li]}`, exists: existing.some(c => nk(c.name) === nk(name)) }); } })); return out; };
    const draw = () => {
      const P = plan(), add = P.filter(x => !x.exists);
      box.innerHTML = `<div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><div class="field" style="margin:0"><label for="cS">القسم</label><select class="in" id="cS">${S.sections.map(s => `<option value="${s.id}" ${s.id === sec ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field" style="margin:0"><label for="cL">تسمية الفصول</label><select class="in" id="cL"><option value="ar" ${lab === 'ar' ? 'selected' : ''}>أ، ب، ج</option><option value="num" ${lab === 'num' ? 'selected' : ''}>١، ٢، ٣</option><option value="en" ${lab === 'en' ? 'selected' : ''}>A, B, C</option></select></div>
        <span class="small muted">الموجود في القسم: <b>${AR(existing.length)}</b> فصلاً</span></div>
        <p class="small muted">اكتب عدد الفصول لكل صف. الفصول الموجودة بالاسم نفسه لا تتكرر.</p>
        <div class="grid g2" style="grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px">${STAGES.map((st, si) => `<div class="sec-box"><b>${st[0]}</b><table class="su-grid" style="margin-top:6px">${st[2].map((gw, gi) => `<tr><td>${esc(st[3][gi] + ' ' + st[1])}</td><td><input data-q="${si}-${gi}" value="${Q[si + '-' + gi] ? AR(Q[si + '-' + gi]) : ''}" placeholder="٠" inputmode="numeric" aria-label="عدد فصول ${esc(st[3][gi] + ' ' + st[1])}"></td></tr>`).join('')}</table></div>`).join('')}</div>
        <div class="sec-box" style="margin-top:10px"><b>المعاينة: ${AR(P.length)} فصلاً — جديد ${AR(add.length)}</b><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${P.map(x => `<span class="su-st ${x.exists ? 'old' : 'new'}">${esc(x.name)}${x.exists ? ' (موجود)' : ''}</span>`).join('') || '<span class="small muted">لا شيء بعد</span>'}</div></div>
        <div class="acts" style="justify-content:flex-start"><button class="btn" id="cGo" ${add.length ? '' : 'disabled'}>إنشاء ${AR(add.length)} فصلاً</button><button class="btn ghost" id="cNx">التالي: المعلمون ←</button></div>
        ${existing.length ? `<details style="margin-top:8px"><summary class="small">الفصول الموجودة (${AR(existing.length)})</summary><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${existing.slice().sort((a, b) => (A.cmpCls ? A.cmpCls(a, b) : 0)).map(c => `<span class="su-st old">${esc(c.name)}</span>`).join('')}</div></details>` : ''}`;
      $('#cS', box).onchange = e => { A.LS.set('su_sec', e.target.value); sCls(box, next, counts); };
      $('#cL', box).onchange = e => { lab = e.target.value; A.LS.set('su_lab', lab); draw(); };
      $$('[data-q]', box).forEach(i => i.onchange = () => { const v = Math.max(0, Math.min(12, parseInt(digits(i.value), 10) || 0)); if (v) Q[i.dataset.q] = v; else delete Q[i.dataset.q]; A.LS.set('su_cls_' + sec, Q); draw(); const n = box.querySelector(`[data-q="${i.dataset.q}"]`); if (n) n.focus(); });
      const g = $('#cGo', box); if (g) g.onclick = ev => A.run(ev.currentTarget, async () => { let k = existing.length; for (const x of plan().filter(x => !x.exists)) { const r = await api.addClass({ section_id: sec, name: x.name, stage: x.stage, grade_word: x.grade_word, class_label: x.class_label, sort: k++, active: true }); if (r && sec === S.sectionId && S.classes) S.classes.push(r); } A.toast(`أُنشئت ${AR(add.length)} فصلاً`, 'ok'); counts.clsL = await api.list('classes', { section_id: S.sections.map(s => s.id) }); sCls(box, next, counts); });
      $('#cNx', box).onclick = () => next('tch');
    };
    draw();
  }

  // ----- ٤ المعلمون -----
  const TCOLS = [['name', ['الاسم', 'اسم المعلم', 'name', 'الموظف']], ['email', ['البريد', 'الإيميل', 'email', 'mail']], ['phone', ['الجوال', 'الهاتف', 'phone', 'mobile']], ['spec', ['التخصص', 'المادة', 'specialty', 'subject']], ['no', ['الرقم الوظيفي', 'السجل المدني', 'employee', 'id']], ['sec', ['القسم', 'section']]];
  function sTch(box, next, counts) {
    let rows = [], sec = S.sectionId;
    const all = counts.staffL;
    const analyze = () => { const { idx, body } = mapCols(rows, TCOLS); return body.map(r => { const g = k => idx[k] != null ? String(r[idx[k]] || '').trim() : ''; const x = { name: g('name').replace(/\s+/g, ' '), email: g('email').toLowerCase(), phone: digits(g('phone')), spec: g('spec'), no: digits(g('no')) || g('no'), secName: g('sec') };
      x.sec = (S.sections.find(s => x.secName && (nk(s.name).includes(nk(x.secName)) || nk(s.short_name || '').includes(nk(x.secName)))) || {}).id || sec;
      x.bad = x.name.length < 5 ? 'الاسم قصير' : x.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.email) ? 'بريد غير صحيح' : '';
      x.old = all.find(s => (x.email && (s.email || '').toLowerCase() === x.email) || nk(s.full_name) === nk(x.name)); return x; }).filter(x => x.name); };
    const draw = () => {
      const L = analyze(), add = L.filter(x => !x.bad && !x.old);
      box.innerHTML = `<p class="small muted" style="margin-top:0">الصق من Excel (الاسم، البريد، الجوال، التخصص، الرقم الوظيفي، القسم) أو ارفع ملف Excel/CSV. يُنشأ ملف لكل معلم، ثم يفعّل حسابه بنفسه من رابط الانضمام فيُربط بملفه تلقائياً بالبريد أو الاسم.</p>
        <div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><div class="field" style="margin:0"><label for="tS">القسم الافتراضي</label><select class="in" id="tS">${S.sections.map(s => `<option value="${s.id}" ${s.id === sec ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div><label class="btn ghost sm" style="cursor:pointer">📄 ملف Excel/CSV<input type="file" id="tF" accept=".xlsx,.xls,.csv,.txt" hidden></label><span class="small muted">الموجود حالياً: ${AR(all.length)} موظفاً</span></div>
        <textarea class="in" id="tP" rows="5" style="margin-top:8px" placeholder="الاسم	البريد	الجوال	التخصص">${esc(rows.map(r => r.join('\t')).join('\n'))}</textarea>
        ${L.length ? `<div class="scroll" style="max-height:46vh;margin-top:8px"><table class="tbl"><thead><tr><th>الاسم</th><th>البريد</th><th>الجوال</th><th>التخصص</th><th>القسم</th><th>الحالة</th></tr></thead><tbody>${L.map(x => `<tr><td>${esc(x.name)}</td><td dir="ltr">${esc(x.email)}</td><td dir="ltr">${esc(x.phone)}</td><td>${esc(x.spec)}</td><td class="small">${esc((S.sections.find(s => s.id === x.sec) || {}).name || '')}</td><td>${x.bad ? `<span class="su-st bad">${x.bad}</span>` : x.old ? '<span class="su-st old">موجود</span>' : '<span class="su-st new">جديد</span>'}</td></tr>`).join('')}</tbody></table></div>` : ''}
        <div class="acts" style="justify-content:flex-start"><button class="btn" id="tGo" ${add.length ? '' : 'disabled'}>إضافة ${AR(add.length)} معلماً</button><button class="btn ghost" id="tNx">التالي: الطلاب ←</button></div>`;
      $('#tS', box).onchange = e => { sec = e.target.value; draw(); };
      $('#tP', box).onchange = e => { rows = parseRows(e.target.value); draw(); };
      $('#tF', box).onchange = e => { const f = e.target.files[0]; if (f) A.run(null, async () => { rows = await readFile(f); draw(); }); };
      const g = $('#tGo', box); if (g) g.onclick = ev => A.run(ev.currentTarget, async () => { let n = 0; for (const x of analyze().filter(x => !x.bad && !x.old)) { const r = await api.ins('staff', { school_id: S.school.id, full_name: x.name, email: x.email || null, phone: x.phone || null, specialty: x.spec || null, employee_no: x.no || null, active: true }); const st = Array.isArray(r) ? r[0] : r; if (st && st.id) { try { await api.ins('memberships', { staff_id: st.id, section_id: x.sec, role: 'teacher' }); } catch (_) { } all.push(st); n++; } } if (A.refreshPeople) try { await A.refreshPeople(); } catch (_) { } A.toast(`أُضيف ${AR(n)} معلماً — أرسل لهم رابط الانضمام من خطوة «الانطلاق»`, 'ok'); rows = []; draw(); });
      $('#tNx', box).onclick = () => next('stu');
    };
    draw();
  }

  // ----- ٥ الطلاب -----
  const SCOLS = [['name', ['اسم الطالب', 'الاسم', 'name']], ['no', ['رقم الطالب', 'الرقم الأكاديمي', 'student', 'رقم']], ['nid', ['الهوية', 'السجل المدني', 'الإقامة', 'national', 'iqama']], ['cls', ['الفصل', 'الصف', 'class', 'الشعبة']], ['phone', ['جوال ولي الأمر', 'الجوال', 'phone', 'mobile']], ['gname', ['ولي الأمر', 'guardian']]];
  function sStu(box, next, counts) {
    let rows = [], sec = A.LS.get('su_ssec') || S.sectionId, fixCls = '';
    const draw = async () => {
      const C = counts.clsL.filter(c => c.section_id === sec);
      let have = []; try { have = await api.list('students', { school_id: S.school.id, section_id: sec }, { select: 'id,full_name,class_id,student_no' }); } catch (_) { }
      const findC = v => { if (fixCls) return C.find(c => c.id === fixCls); const k = nk(v); if (!k) return null; return C.find(c => nk(c.name) === k) || C.find(c => nk(c.class_label || '') === k) || C.find(c => k.includes(nk(c.name)) || nk(c.name).includes(k)); };
      const { idx, body } = mapCols(rows, SCOLS);
      const L = body.map(r => { const g = k => idx[k] != null ? String(r[idx[k]] || '').trim() : ''; const x = { name: g('name').replace(/\s+/g, ' '), no: digits(g('no')) || g('no'), nid: digits(g('nid')), clsTxt: g('cls'), phone: digits(g('phone')), gname: g('gname') }; const c = findC(x.clsTxt); x.cls = c && c.id;
        x.bad = x.name.length < 5 ? 'الاسم قصير' : !x.cls ? 'الفصل غير معروف' : ''; x.old = have.find(s => (x.no && s.student_no === x.no) || (nk(s.full_name) === nk(x.name) && s.class_id === x.cls)); return x; }).filter(x => x.name);
      const add = L.filter(x => !x.bad && !x.old);
      box.innerHTML = `<p class="small muted" style="margin-top:0">الصق من Excel أو ارفع ملف «بيانات الطلاب» المصدّر من نور: اسم الطالب، رقم الطالب، الهوية، الفصل، جوال ولي الأمر. يُطابق الفصل بالاسم تلقائياً، أو اختر فصلاً واحداً لكل الملف.</p>
        <div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><div class="field" style="margin:0"><label for="uS">القسم</label><select class="in" id="uS">${S.sections.map(s => `<option value="${s.id}" ${s.id === sec ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
          <div class="field" style="margin:0"><label for="uC">الفصل</label><select class="in" id="uC"><option value="">تلقائي من عمود الفصل</option>${C.map(c => `<option value="${c.id}" ${c.id === fixCls ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <label class="btn ghost sm" style="cursor:pointer">📄 ملف Excel/CSV<input type="file" id="uF" accept=".xlsx,.xls,.csv,.txt" hidden></label><span class="small muted">في القسم الآن: ${AR(have.length)} طالباً · ${AR(C.length)} فصلاً</span></div>
        ${!C.length ? `<div class="su-st bad" style="margin-top:8px">لا فصول في هذا القسم — أنشئها من خطوة «الفصول» أولاً.</div>` : ''}
        <textarea class="in" id="uP" rows="5" style="margin-top:8px" placeholder="اسم الطالب	رقم الطالب	الهوية	الفصل	جوال ولي الأمر">${esc(rows.map(r => r.join('\t')).join('\n'))}</textarea>
        ${L.length ? `<div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><span class="su-st new">جديد ${AR(add.length)}</span><span class="su-st old">موجود ${AR(L.filter(x => x.old).length)}</span><span class="su-st bad">يحتاج مراجعة ${AR(L.filter(x => x.bad).length)}</span></div>
          <div class="scroll" style="max-height:46vh;margin-top:6px"><table class="tbl"><thead><tr><th>الطالب</th><th>الرقم</th><th>الفصل</th><th>جوال ولي الأمر</th><th>الحالة</th></tr></thead><tbody>${L.slice(0, 500).map(x => `<tr><td>${esc(x.name)}</td><td dir="ltr">${esc(x.no)}</td><td class="small">${esc(x.cls ? (C.find(c => c.id === x.cls) || {}).name : x.clsTxt)}</td><td dir="ltr">${esc(x.phone)}</td><td>${x.bad ? `<span class="su-st bad">${x.bad}</span>` : x.old ? '<span class="su-st old">موجود</span>' : '<span class="su-st new">جديد</span>'}</td></tr>`).join('')}</tbody></table></div>` : ''}
        <div class="acts" style="justify-content:flex-start"><button class="btn" id="uGo" ${add.length ? '' : 'disabled'}>إضافة ${AR(add.length)} طالباً</button><button class="btn ghost" id="uNx">التالي: الانطلاق ←</button></div>`;
      $('#uS', box).onchange = e => { sec = e.target.value; A.LS.set('su_ssec', sec); fixCls = ''; draw(); };
      $('#uC', box).onchange = e => { fixCls = e.target.value; draw(); };
      $('#uP', box).onchange = e => { rows = parseRows(e.target.value); draw(); };
      $('#uF', box).onchange = e => { const f = e.target.files[0]; if (f) A.run(null, async () => { rows = await readFile(f); draw(); }); };
      const g = $('#uGo', box); if (g) g.onclick = ev => A.run(ev.currentTarget, async () => { const recs = add.map(x => ({ school_id: S.school.id, section_id: sec, class_id: x.cls, full_name: x.name, student_no: x.no || null, national_id: x.nid || null, guardian_phone: x.phone || null, guardian_name: x.gname || null, active: true })); for (let i = 0; i < recs.length; i += 200) await api.ins('students', recs.slice(i, i + 200)); A.toast(`أُضيف ${AR(recs.length)} طالباً`, 'ok'); rows = []; draw(); });
      $('#uNx', box).onclick = () => next('go');
    };
    draw();
  }

  // ----- ٦ الانطلاق -----
  async function sGo(box, next, counts, root) {
    const st = (S.school.settings || {}).setup || {};
    box.innerHTML = `<div class="su-kp"><div class="${(S.school.settings || {}).brand ? 'ok' : ''}"><span>الهوية</span><b>${(S.school.settings || {}).brand ? '✓' : '—'}</b></div><div class="ok"><span>الأقسام</span><b>${AR(S.sections.length)}</b></div><div class="${counts.cls ? 'ok' : 'no'}"><span>الفصول</span><b>${AR(counts.cls)}</b></div>
      <div class="${counts.staff > 1 ? 'ok' : 'no'}"><span>الموظفون</span><b>${AR(counts.staff)}</b></div><div><span>فعّلوا حساباتهم</span><b>${AR(counts.acc)}</b></div><div class="${counts.stu ? 'ok' : 'no'}"><span>الطلاب</span><b>${AR(counts.stu)}</b></div></div>
      <div id="goJ" style="margin-top:12px"></div>
      <div class="sec-box" style="margin-top:12px"><b>بعد التجهيز</b><ul class="small" style="margin:6px 0 0;padding-inline-start:18px;line-height:1.9"><li>اليوم الدراسي والجرس: من «استوديو الجداول ← اليوم الدراسي والجدول الزمني».</li><li>المواد والنصاب والجدول: «استوديو الجداول».</li><li>الميزات الظاهرة للمعلمين: «تخصيص صفحة المعلم».</li><li>حسابات أولياء الأمور: «حسابات الطلاب».</li></ul></div>
      <div class="acts" style="justify-content:flex-start">${st.done === false || !st.doneAt ? '<button class="btn ok" id="goDone">✓ اكتمل التجهيز</button>' : `<span class="su-st new">اكتمل التجهيز ${esc(A.fmtDT ? A.fmtDT(st.doneAt) : '')}</span>`}</div>`;
    if (V._joinPanel) try { await V._joinPanel($('#goJ', box)); } catch (_) { }
    const d = $('#goDone', box); if (d) d.onclick = ev => A.run(ev.currentTarget, async () => { await saveSettings({ setup: Object.assign({}, st, { done: true, doneAt: new Date().toISOString() }) }); A.toast('اكتمل التجهيز — بالتوفيق', 'ok'); V.setup(root); });
  }

  // =============== (٣) المدارس والاشتراكات (مدير المنصة) ===============
  V.schools = async function (root) {
    if (!own() || !A.isPlatformAdmin()) { root.innerHTML = ''; location.hash = '#/home'; return; }
    let L = []; try { L = await api.rpc('platform_schools', {}); } catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', esc(e.message))}</div>`; return; }
    const base = location.origin + location.pathname.replace(/[^/]*$/, '') + '?join=';
    const plan = x => x.plan || {};
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">المدارس والاشتراكات</h2><p class="sub" style="margin:2px 0 0">لك وحدك بصفتك مالك المنصة. كل مدرسة معزولة ببياناتها وهويتها وحساباتها، ويصلها أي تحديث تنشره للمنصة.</p></div><button class="btn" id="scNew">${A.I.plus || '+'} مدرسة جديدة</button></div>
      <div class="sc-cards">${L.map(x => { const o = (x.owners || [])[0] || {}, p = plan(x), code = (x.codes || [])[0]; return `<div class="sc-card"><div class="row" style="justify-content:space-between;gap:6px"><h4>${esc(x.name)}</h4>${x.mine ? '<span class="su-st new">مدرستك</span>' : ''}</div>
        <div class="small muted">${AR(x.sections)} أقسام · ${AR(x.classes)} فصلاً · ${AR(x.staff)} موظفاً (${AR(x.accounts)} مفعّل) · ${AR(x.students)} طالباً</div>
        <div class="small" style="margin-top:4px">المدير: ${esc(o.name || '—')} <span dir="ltr">${esc(o.email || '')}</span> ${o.email ? (o.joined ? '<span class="su-st new">فعّل حسابه</span>' : '<span class="su-st bad">لم يفعّل</span>') : ''}</div>
        <div class="small" style="margin-top:2px">التجهيز: ${x.setup && x.setup.done === false ? '<span class="su-st bad">لم يكتمل</span>' : '<span class="su-st old">مكتمل/قديم</span>'} · الاشتراك: <b>${esc(p.kind || '—')}</b>${p.until ? ' حتى ' + esc(p.until) : ''}</div>
        ${code && !o.joined ? `<div class="row" style="gap:4px;margin-top:6px;flex-wrap:nowrap"><input class="in" readonly dir="ltr" value="${esc(base + code)}" style="min-height:34px;padding:4px 8px;font-size:12px"><button class="btn ghost sm" data-cp="${esc(base + code)}">نسخ</button></div>` : ''}
        <div class="row" style="gap:6px;margin-top:8px"><button class="btn ghost sm" data-pl="${x.id}">الاشتراك والملاحظات</button></div></div>`; }).join('')}</div></div>`;
    $$('[data-cp]', root).forEach(b => b.onclick = () => navigator.clipboard.writeText(b.dataset.cp).then(() => A.toast('نُسخ رابط التفعيل', 'ok')));
    $$('[data-pl]', root).forEach(b => b.onclick = () => { const x = L.find(s => s.id === b.dataset.pl), p = plan(x);
      const m = A.modal(`<h3>الاشتراك — ${esc(x.name)}</h3><div class="grid g2"><div class="field"><label for="pK">نوع الاشتراك</label><select class="in" id="pK">${['تجريبي', 'شهري', 'فصلي', 'سنوي', 'مجاني', 'موقوف'].map(k => `<option ${p.kind === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div><div class="field"><label for="pU">ينتهي في</label><input class="in" id="pU" type="date" value="${esc(p.until || '')}"></div><div class="field"><label for="pP">المبلغ</label><input class="in" id="pP" value="${esc(p.price || '')}"></div><div class="field"><label for="pC">جهة التواصل</label><input class="in" id="pC" value="${esc(p.contact || '')}"></div></div><div class="field"><label for="pN">ملاحظات</label><textarea class="in" id="pN" rows="3">${esc(p.note || '')}</textarea></div><div class="acts"><button class="btn" id="pGo">حفظ</button></div>`);
      m.el.querySelector('#pGo').onclick = ev => A.run(ev.currentTarget, async () => { await api.rpc('platform_school_plan', { p_school: x.id, p_plan: { kind: m.el.querySelector('#pK').value, until: m.el.querySelector('#pU').value, price: m.el.querySelector('#pP').value.trim(), contact: m.el.querySelector('#pC').value.trim(), note: m.el.querySelector('#pN').value.trim() } }); m.close(); A.toast('حُفظ', 'ok'); V.schools(root); }); });
    $('#scNew', root).onclick = () => newSchool(root, base);
  };
  function newSchool(root, base) {
    let secs = [{ name: 'قسم البنين', short_name: 'البنين' }, { name: 'قسم البنات', short_name: 'البنات' }];
    const m = A.modal(`<h3>تجهيز مدرسة جديدة</h3><p class="sub">تُنشأ المدرسة بأقسامها وملف مديرها، ويصلك رابط تفعيل ترسله للمدير ليضع كلمة مروره بنفسه. بعد دخوله يفتح له «تجهيز المدرسة» تلقائياً.</p>
      <div class="grid g2"><div class="field"><label for="nN">اسم المدرسة</label><input class="in" id="nN" placeholder="مثال: مدارس النخبة الأهلية"></div><div class="field"><label for="nS">الاسم المختصر</label><input class="in" id="nS" placeholder="النخبة"></div>
        <div class="field"><label for="nE">الاسم بالإنجليزية (اختياري)</label><input class="in" id="nE" dir="ltr"></div><div class="field"><label for="nT">الفصل الدراسي</label><input class="in" id="nT" value="${esc(S.school.term_label || 'الفصل الدراسي الأول')}"></div></div>
      <div class="sec-box"><div class="row" style="justify-content:space-between"><b>الأقسام / الفروع</b><div class="row" style="gap:4px"><button class="btn ghost sm" type="button" data-ps="1">قسم واحد</button><button class="btn ghost sm" type="button" data-ps="2">بنين وبنات</button><button class="btn ghost sm" type="button" id="nAdd">+ قسم</button></div></div><div id="nSecs" style="margin-top:6px"></div></div>
      <div class="grid g2"><div class="field"><label for="oN">اسم مدير المدرسة</label><input class="in" id="oN"></div><div class="field"><label for="oE">بريده (للدخول)</label><input class="in" id="oE" dir="ltr" type="email"></div><div class="field"><label for="oT">المسمى</label><input class="in" id="oT" value="مدير المدرسة"></div>
        <div class="field"><label for="pK2">الاشتراك</label><select class="in" id="pK2">${['تجريبي', 'شهري', 'فصلي', 'سنوي', 'مجاني'].map(k => `<option>${k}</option>`).join('')}</select></div></div>
      <div class="acts"><button class="btn" id="nGo">إنشاء المدرسة</button></div>`, { cls: 'wide' });
    const drawS = () => { m.el.querySelector('#nSecs').innerHTML = secs.map((s, i) => `<div class="row" style="gap:6px;margin-bottom:6px;flex-wrap:nowrap"><input class="in" data-sn="${i}" value="${esc(s.name)}" aria-label="اسم القسم"><input class="in" data-ss="${i}" value="${esc(s.short_name || '')}" aria-label="المختصر" style="max-width:130px">${secs.length > 1 ? `<button class="btn bad sm" type="button" data-sx="${i}" aria-label="حذف">×</button>` : ''}</div>`).join('');
      $$('[data-sn]', m.el).forEach(i => i.oninput = () => secs[+i.dataset.sn].name = i.value); $$('[data-ss]', m.el).forEach(i => i.oninput = () => secs[+i.dataset.ss].short_name = i.value); $$('[data-sx]', m.el).forEach(b => b.onclick = () => { secs.splice(+b.dataset.sx, 1); drawS(); }); };
    m.el.querySelector('#nAdd').onclick = () => { secs.push({ name: 'قسم ' + AR(secs.length + 1), short_name: '' }); drawS(); };
    $$('[data-ps]', m.el).forEach(b => b.onclick = () => { secs = b.dataset.ps === '1' ? [{ name: 'المدرسة', short_name: '' }] : [{ name: 'قسم البنين', short_name: 'البنين' }, { name: 'قسم البنات', short_name: 'البنات' }]; drawS(); });
    drawS();
    m.el.querySelector('#nGo').onclick = ev => A.run(ev.currentTarget, async () => {
      const v = id => m.el.querySelector(id).value.trim(), em = v('#oE');
      const r = await api.rpc('school_provision', { p: { name: v('#nN'), short: v('#nS'), nameEn: v('#nE'), term_label: v('#nT'), sections: secs.filter(s => s.name.trim()), owner: { name: v('#oN'), email: v('#oE'), title: v('#oT') }, plan: { kind: m.el.querySelector('#pK2').value, since: new Date().toISOString().slice(0, 10) } } });
      const link = base + r.code; m.el.innerHTML = `<h3>✓ أُنشئت المدرسة</h3><p>أرسل هذا الرابط لمدير المدرسة ليفعّل حسابه بكلمة مروره (البريد: <b dir="ltr">${esc(em)}</b>):</p><input class="in" readonly dir="ltr" value="${esc(link)}" onfocus="this.select()"><div class="acts"><button class="btn" id="cp">نسخ الرابط</button><a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('رابط تفعيل حسابك في المنصة:\n' + link)}">واتساب</a></div>`;
      m.el.querySelector('#cp').onclick = () => navigator.clipboard.writeText(link).then(() => A.toast('نُسخ', 'ok'));
      V.schools(root);
    });
  }
})();
