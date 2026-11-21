/* منصة دينا — لوحة مالك المنصة (للمنصة الأم؛ sql/114) — يغلّف V.schools بتبويبات:
   نظرة عامة (مؤشرات + تنبيهات)، المدارس (من school-setup.js + الحالة والميزات ورابط تفعيل جديد)، المستخدمون، المشكلات (أخطاء تلقائية + بلاغات)، التقارير.
   + تسجيل الأخطاء تلقائياً (log_error؛ يتوقف بصمت إن لم تكن الدالة في القاعدة)
   + «الدعم الفني» V.support لكل موظف (مفتاح support) لإرسال بلاغ بصورة ومتابعة الرد
   + فرض حالة المدرسة: settings.platform {status: suspended, msg, features{مفتاح:false}} */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc } = A;
  const AR = A.AR || (n => String(n));
  const own = () => !!(S.me && S.me.is_owner);
  const PA = () => !!(A.isPlatformAdmin && A.isPlatformAdmin());
  const fmt = d => d ? (A.fmtDT ? A.fmtDT(d) : String(d).slice(0, 16)) : '—';
  const daysAgo = d => d ? Math.floor((Date.now() - new Date(d)) / 864e5) : null;
  const iso = d => d.toISOString().slice(0, 10);
  const TABS = [['ov', 'نظرة عامة'], ['sc', 'المدارس'], ['us', 'المستخدمون'], ['pr', 'المشكلات'], ['rp', 'التقارير']];
  const MET = [['active_users', 'مستخدمون نشطون'], ['actions', 'عمليات'], ['plans', 'حصص خطط'], ['attendance', 'رصد حضور'], ['behaviors', 'سلوك'], ['quizzes', 'اختبارات إلكترونية'], ['questions', 'أسئلة'], ['forms', 'نماذج'], ['preps', 'تحضير'], ['exams', 'اختبارات ورقية'], ['errors', 'أخطاء'], ['reports', 'بلاغات']];

  // ---------- تسجيل الأخطاء تلقائياً ----------
  let errOn = true, sent = 0; const seen = new Set();
  const report = (msg, stack, where) => {
    if (!errOn || !S.me || sent >= 25 || A.DEMO) return; const k = String(msg).slice(0, 200) + '|' + location.hash; if (seen.has(k)) return; seen.add(k); sent++;
    api.rpc('log_error', { p: { msg: String(msg || '').slice(0, 1000), stack: String(stack || '').slice(0, 4000), where: String(where || ''), page: location.hash.split('?')[0] || '#/', ua: navigator.userAgent, url: location.href.split('#')[0], ver: window.DINA_V || '' } })
      .catch(e => { if (/function|not find|404|PGRST202/i.test(String(e && (e.message || e.code)))) errOn = false; });
  };
  window.addEventListener('error', e => { if (!e || (e.message || '').includes('ResizeObserver')) return; report(e.message, e.error && e.error.stack, (e.filename || '').split('/').pop() + ':' + e.lineno); });
  window.addEventListener('unhandledrejection', e => { const r = e && e.reason; const m = r && (r.message || String(r)); if (!m || /Failed to fetch|NetworkError|aborted/i.test(m)) return; report(m, r && r.stack, 'promise'); });

  // ---------- حالة المدرسة: الإيقاف والميزات ----------
  const plat = () => ((S.school || {}).settings || {}).platform || {};
  if (A.NAV) A.NAV.forEach(n => { const f = n[2]; if (typeof f === 'function' && !f.__pc) { const g = () => { const off = (plat().features || {})[n[0]] === false; return off && !PA() ? false : f(); }; g.__pc = 1; n[2] = g; } });
  let blocked = false;
  setInterval(() => {
    if (!S.school || !S.me) return; const p = plat();
    if (p.status === 'suspended' && !PA()) { if (!blocked) { blocked = true; const d = document.createElement('div'); d.id = 'pcBlock'; d.setAttribute('role', 'alertdialog'); d.style.cssText = 'position:fixed;inset:0;z-index:20000;background:rgba(8,43,90,.92);display:flex;align-items:center;justify-content:center;padding:20px;color:#fff;text-align:center'; d.innerHTML = `<div style="max-width:440px"><div style="font-size:42px">⏸️</div><h2 style="color:#fff">الحساب موقوف مؤقتاً</h2><p style="line-height:1.9">${esc(p.msg || 'يُرجى التواصل مع إدارة المنصة لتجديد الاشتراك. بياناتكم محفوظة كما هي.')}</p></div>`; document.body.appendChild(d); } }
    else if (blocked) { blocked = false; const d = document.getElementById('pcBlock'); if (d) d.remove(); }
  }, 1500);

  // ---------- الدعم الفني (لكل موظف) ----------
  A.I.support = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17h.01"/></svg>';
  const canSup = () => own() || !!(A.tfeat && A.tfeat('support'));
  if (A.NAV && !A.NAV.some(n => n[0] === 'support')) A.NAV.push(['support', 'الدعم الفني والبلاغات', () => canSup()]);
  V.support = async function (root) {
    if (!canSup()) { root.innerHTML = ''; location.hash = '#/home'; return; }
    let mine = []; try { mine = await api.list('support_reports', { staff_id: S.me.id }, { order: 'created_at', desc: true }); } catch (_) { }
    const ST = { open: ['جديد', 'st-submitted'], working: ['قيد المعالجة', 'st-draft'], done: ['تمت المعالجة', 'st-approved'] };
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">الدعم الفني والبلاغات</h2><p class="sub" style="margin:2px 0 0">صف المشكلة أو الاقتراح، وأرفق صورة للشاشة إن أمكن. يصلك الرد هنا.</p></div></div>
      <div class="field"><label for="spB">وصف المشكلة</label><textarea class="in" id="spB" rows="4" placeholder="ماذا كنت تفعل؟ وماذا ظهر لك؟"></textarea></div>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label class="btn ghost sm" style="cursor:pointer">📷 إرفاق صورة<input type="file" id="spF" accept="image/*" hidden></label><span class="small muted" id="spFn"></span><div class="grow"></div><button class="btn" id="spGo">إرسال البلاغ</button></div></div>
      <div class="card"><b>بلاغاتي</b>${mine.length ? mine.map(r => `<div class="sec-box" style="margin-top:8px"><div class="row" style="justify-content:space-between;gap:6px"><span class="small muted">${fmt(r.created_at)}</span><span class="pill ${(ST[r.status] || [])[1] || ''}">${(ST[r.status] || [r.status])[0]}</span></div><div style="white-space:pre-line;margin-top:4px">${esc(r.body)}</div>${r.reply ? `<div style="margin-top:6px;background:#E5F4EA;border-radius:10px;padding:8px"><b>رد الدعم:</b> ${esc(r.reply)}</div>` : ''}</div>`).join('') : A.emptyBox('لا بلاغات بعد')}</div>`;
    let shot = null;
    $('#spF', root).onchange = async e => { const f = e.target.files[0]; if (!f) return; shot = await new Promise(res => { const img = new Image(); img.onload = () => { const k = Math.min(1, 1200 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.7)); URL.revokeObjectURL(img.src); }; img.onerror = () => res(null); img.src = URL.createObjectURL(f); }); $('#spFn', root).textContent = shot ? '✓ ' + f.name : 'تعذّرت قراءة الصورة'; };
    $('#spGo', root).onclick = ev => A.run(ev.currentTarget, async () => { const body = $('#spB', root).value.trim(); if (body.length < 5) throw new Error('اكتب وصفاً للمشكلة'); await api.rpc('support_report', { p: { body, shot, page: A.LS.get('pc_last_page') || '', ua: navigator.userAgent } }); A.toast('وصل بلاغك — شكراً لك', 'ok'); V.support(root); });
  };
  window.addEventListener('hashchange', e => { const o = (e.oldURL || '').split('#')[1]; if (o && !/^\/support/.test(o)) A.LS.set('pc_last_page', '#' + o); });

  // ---------- لوحة مالك المنصة ----------
  if (!document.getElementById('pc-css')) { const s = document.createElement('style'); s.id = 'pc-css'; s.textContent = `
  .pc-tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:2px solid var(--pale);margin:4px 0 14px}
  .pc-tabs button{border:0;background:none;padding:10px 12px;font:inherit;font-weight:800;color:var(--muted);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;white-space:nowrap}
  .pc-tabs button.on,.pc-tabs button[aria-selected=true]{background:var(--navy)!important;color:#fff!important;border-color:var(--sky);border-radius:12px 12px 0 0}.pc-tabs button:focus-visible{outline:3px solid var(--sky);border-radius:8px}
  .pc-tabs .bd{display:inline-block;min-width:20px;border-radius:10px;background:#E0675A;color:#fff;font-size:11px;padding:0 6px;margin-inline-start:4px}
  .pc-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:12px}
  .pc-kp div{background:#fff;border:1px solid var(--border);border-radius:14px;padding:10px 12px;box-shadow:var(--sh1)}.pc-kp b{display:block;font-size:26px;color:var(--navy);line-height:1.2}.pc-kp span{font-size:12px;color:var(--muted);font-weight:700}
  .pc-kp .bad b{color:#B3261E}.pc-kp .ok b{color:#23704A}
  .pc-al{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border-radius:12px;margin-bottom:6px;font-size:14px}
  .pc-al.w{background:#FFF4DC;color:#6B4510}.pc-al.e{background:#FDE7E4;color:#8C1D18}.pc-al.i{background:#E8F5FB;color:#0B3F6B}
  .pc-err{border:1px solid var(--border);border-radius:12px;padding:10px;margin-bottom:8px;background:#fff}
  .pc-err.res{opacity:.6}.pc-err code{font-size:12px;direction:ltr;display:block;white-space:pre-wrap;max-height:120px;overflow:auto;background:#F4F7FB;border-radius:8px;padding:6px;margin-top:6px}
  .pc-shot{max-width:100%;max-height:260px;border-radius:10px;border:1px solid var(--border);margin-top:6px}
  `; document.head.appendChild(s); }

  const prevSchools = V.schools;
  V.schools = async function (root) {
    if (!own() || !PA()) { root.innerHTML = ''; location.hash = '#/home'; return; }
    A._scRoot = root; const t = A.LS.get('pc_t') || 'ov';
    root.innerHTML = `<div class="card" style="padding-bottom:6px"><div class="head" style="margin-bottom:0"><div class="grow"><h2 style="margin:0">لوحة مالك المنصة</h2><p class="sub" style="margin:2px 0 0">كل المدارس ومستخدموها ومشكلاتها وتقاريرها في مكان واحد — لك وحدك. كل إجراء دعم يُسجَّل ويراه مالك المدرسة.</p></div></div>
      <div class="pc-tabs" role="tablist">${TABS.map(([k, n]) => `<button role="tab" aria-selected="${k === t}" class="${k === t ? 'on' : ''}" data-t="${k}">${n}<span class="bd" data-bd="${k}" hidden></span></button>`).join('')}</div></div><div id="pcB"></div>`;
    $$('[data-t]', root).forEach(b => b.onclick = () => { A.LS.set('pc_t', b.dataset.t); V.schools(root); });
    const box = $('#pcB', root);
    badges(root);
    if (t === 'sc') return A.schoolsList ? A.schoolsList(box) : (prevSchools && prevSchools(box));
    return ({ ov, us, pr, rp }[t] || ov)(box, root);
  };
  async function badges(root) { try { const [e, r] = await Promise.all([api.rpc('platform_errors_list', { p_days: 30 }), api.rpc('platform_reports_list', { p_status: null })]); const n = (e || []).filter(x => !x.resolved).length + (r || []).filter(x => x.status !== 'done').length; const b = root.querySelector('[data-bd="pr"]'); if (b && n) { b.hidden = false; b.textContent = AR(n); } } catch (_) { } }

  // أزرار إضافية على بطاقة كل مدرسة
  A.schoolCardActs = (root, L) => {
    $$('[data-acts]', root).forEach(row => { const id = row.dataset.acts, x = L.find(s => s.id === id); if (!x) return;
      row.insertAdjacentHTML('beforeend', `<button class="btn ghost sm" data-us="${id}">المستخدمون</button><button class="btn ghost sm" data-st="${id}">الحالة والميزات</button><button class="btn ghost sm" data-ol="${id}">رابط تفعيل جديد للمدير</button>${((x.platform || {}).status === 'suspended') ? '<span class="su-st bad">موقوفة</span>' : ''}`);
    });
    $$('[data-us]', root).forEach(b => b.onclick = () => { A.LS.set('pc_t', 'us'); A.LS.set('pc_us', b.dataset.us); V.schools(A._scRoot); });
    $$('[data-st]', root).forEach(b => b.onclick = () => stateDlg(L.find(s => s.id === b.dataset.st)));
    $$('[data-ol]', root).forEach(b => b.onclick = () => A.run(b, async () => { if (!(await A.confirmBox('إنشاء رابط تفعيل جديد لمدير هذه المدرسة؟ يتوقف الرابط السابق.', 'إنشاء'))) return; const c = await api.rpc('platform_owner_link', { p_school: b.dataset.ol }); const link = location.origin + location.pathname.replace(/[^/]*$/, '') + '?join=' + c; await navigator.clipboard.writeText(link).catch(() => { }); A.modal(`<h3>رابط التفعيل الجديد</h3><input class="in" readonly dir="ltr" value="${esc(link)}" onfocus="this.select()"><p class="small muted">نُسخ الرابط. أرسله لمدير المدرسة.</p>`); }));
  };
  function stateDlg(x) {
    const p = Object.assign({ status: 'active', features: {} }, (x.platform || x.plat || {}));
    const items = (A.NAV || []).filter(n => !['home', 'schools', 'setup', 'support'].includes(n[0]));
    const m = A.modal(`<h3>الحالة والميزات — ${esc(x.name)}</h3>
      <div class="field"><label>حالة المدرسة</label><div class="row" style="gap:12px"><label class="chk"><input type="radio" name="pst" value="active" ${p.status !== 'suspended' ? 'checked' : ''}> فعّالة</label><label class="chk"><input type="radio" name="pst" value="suspended" ${p.status === 'suspended' ? 'checked' : ''}> موقوفة (تظهر لهم رسالة، والبيانات محفوظة)</label></div></div>
      <div class="field"><label for="pMsg">رسالة الإيقاف</label><input class="in" id="pMsg" value="${esc(p.msg || '')}" placeholder="يُرجى التواصل مع إدارة المنصة لتجديد الاشتراك."></div>
      <b>الأقسام الظاهرة في منصتهم</b><p class="small muted" style="margin:2px 0 6px">أزل العلامة لإخفاء القسم عن كل حسابات هذه المدرسة (حسب باقة الاشتراك مثلاً).</p>
      <div class="perm-grid" style="max-height:40vh;overflow:auto">${items.map(n => `<label class="chk small"><input type="checkbox" data-f="${n[0]}" ${(p.features || {})[n[0]] === false ? '' : 'checked'}> ${esc(n[1])}</label>`).join('')}</div>
      <div class="acts"><button class="btn" id="pGo">حفظ</button></div>`, { cls: 'wide' });
    m.el.querySelector('#pGo').onclick = ev => A.run(ev.currentTarget, async () => { const f = {}; $$('[data-f]', m.el).forEach(i => { if (!i.checked) f[i.dataset.f] = false; }); await api.rpc('platform_school_set', { p_school: x.id, p_platform: { status: m.el.querySelector('[name=pst]:checked').value, msg: m.el.querySelector('#pMsg').value.trim(), features: f } }); m.close(); A.toast('حُفظت حالة المدرسة', 'ok'); A.schoolsRefresh(); });
  }

  // ----- نظرة عامة -----
  async function ov(box) {
    box.innerHTML = `<div class="card">${A.emptyBox('جارٍ التحميل…')}</div>`;
    const to = new Date(), from = new Date(Date.now() - 6 * 864e5);
    let L = [], U = [], E = [], R = [];
    try { [L, U, E, R] = await Promise.all([api.rpc('platform_schools', {}), api.rpc('platform_usage', { p_from: iso(from), p_to: iso(to) }).catch(() => []), api.rpc('platform_errors_list', { p_days: 7 }).catch(() => []), api.rpc('platform_reports_list', { p_status: null }).catch(() => [])]); } catch (e) { box.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', esc(e.message))}</div>`; return; }
    const sum = k => L.reduce((a, x) => a + (+x[k] || 0), 0), act = U.reduce((a, x) => a + (+x.active_users || 0), 0);
    const al = [];
    L.forEach(x => { const o = (x.owners || [])[0]; const p = x.plan || {};
      if (o && !o.joined) al.push(['w', `«${x.name}»: مدير المدرسة لم يفعّل حسابه بعد`]);
      if (x.setup && x.setup.done === false) al.push(['i', `«${x.name}»: التجهيز لم يكتمل (${AR(x.classes)} فصلاً، ${AR(x.students)} طالباً)`]);
      if (p.until) { const d = Math.ceil((new Date(p.until) - Date.now()) / 864e5); if (d < 0) al.push(['e', `«${x.name}»: انتهى الاشتراك منذ ${AR(-d)} يوماً`]); else if (d <= 14) al.push(['w', `«${x.name}»: ينتهي الاشتراك بعد ${AR(d)} يوماً`]); }
      if (((x.platform || {}).status) === 'suspended') al.push(['e', `«${x.name}»: موقوفة`]); });
    const eo = E.filter(e => !e.resolved), ro = R.filter(r => r.status !== 'done');
    if (eo.length) al.push(['e', `${AR(eo.length)} خطأ غير معالج خلال ٧ أيام (تكرر ${AR(eo.reduce((a, e) => a + e.n, 0))} مرة)`]);
    if (ro.length) al.push(['w', `${AR(ro.length)} بلاغ من المستخدمين بانتظار الرد`]);
    box.innerHTML = `<div class="pc-kp"><div><span>المدارس</span><b>${AR(L.length)}</b></div><div><span>الموظفون</span><b>${AR(sum('staff'))}</b></div><div><span>فعّلوا حساباتهم</span><b>${AR(sum('accounts'))}</b></div><div><span>الطلاب</span><b>${AR(sum('students'))}</b></div><div class="${act ? 'ok' : ''}"><span>نشطون هذا الأسبوع</span><b>${AR(act)}</b></div><div class="${eo.length ? 'bad' : 'ok'}"><span>أخطاء مفتوحة</span><b>${AR(eo.length)}</b></div><div class="${ro.length ? 'bad' : 'ok'}"><span>بلاغات مفتوحة</span><b>${AR(ro.length)}</b></div></div>
      <div class="card" style="margin-top:0"><b>تنبيهات تحتاج انتباهك</b><div style="margin-top:8px">${al.map(([c, t]) => `<div class="pc-al ${c}">${c === 'e' ? '⛔' : c === 'w' ? '⚠️' : 'ℹ️'} <span>${esc(t)}</span></div>`).join('') || '<div class="pc-al i">✓ لا تنبيهات — كل شيء على ما يرام</div>'}</div></div>
      <div class="card"><b>الاستخدام في آخر ٧ أيام</b><div class="scroll" style="margin-top:8px"><table class="tbl"><thead><tr><th>المدرسة</th>${MET.map(m => `<th>${m[1]}</th>`).join('')}</tr></thead><tbody>${U.map(u => `<tr><td><b>${esc(u.name)}</b></td>${MET.map(m => `<td style="${m[0] === 'errors' && u.errors ? 'color:#B3261E;font-weight:800' : ''}">${AR(u[m[0]] || 0)}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${MET.length + 1}">${A.emptyBox('لا بيانات')}</td></tr>`}</tbody></table></div></div>`;
  }

  // ----- المستخدمون -----
  async function us(box) {
    let L = []; try { L = await api.rpc('platform_schools', {}); } catch (_) { }
    let sid = A.LS.get('pc_us') || ((L.find(x => x.mine) || L[0]) || {}).id, flt = A.LS.get('pc_uf') || 'all', q = '';
    const draw = async () => {
      let U = []; try { U = await api.rpc('platform_users', { p_school: sid }); } catch (e) { box.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', esc(e.message))}</div>`; return; }
      const F = { all: () => true, never: u => !u.joined, idle: u => u.joined && (daysAgo(u.last_in) == null || daysAgo(u.last_in) > 14), week: u => daysAgo(u.last_in) != null && daysAgo(u.last_in) <= 7, off: u => !u.active };
      const V2 = U.filter(F[flt] || F.all).filter(u => !q || (A.normKey(u.name + ' ' + (u.email || ''))).includes(A.normKey(q)));
      box.innerHTML = `<div class="card" style="margin-top:0"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><div class="field" style="margin:0"><label for="uS">المدرسة</label><select class="in" id="uS">${L.map(x => `<option value="${x.id}" ${x.id === sid ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
        <div class="field" style="margin:0"><label for="uF">عرض</label><select class="in" id="uF">${[['all', 'الكل'], ['week', 'نشط هذا الأسبوع'], ['idle', 'لم يدخل منذ ١٤ يوماً'], ['never', 'لم يفعّل حسابه'], ['off', 'موقوف']].map(([k, n]) => `<option value="${k}" ${flt === k ? 'selected' : ''}>${n} (${AR(U.filter(F[k]).length)})</option>`).join('')}</select></div>
        <input class="in" id="uQ" placeholder="بحث بالاسم أو البريد" style="max-width:220px" value="${esc(q)}"><div class="grow"></div><button class="btn ghost sm" id="uX">Excel</button></div>
        <div class="scroll" style="max-height:64vh;margin-top:10px"><table class="tbl"><thead><tr><th>الاسم</th><th>البريد</th><th>الأدوار</th><th>الحساب</th><th>آخر دخول</th><th>عمليات ٣٠ يوماً</th></tr></thead><tbody>${V2.map(u => `<tr><td>${esc(u.name)}${u.owner ? ' <span class="su-st new">مالك</span>' : ''}${u.active === false ? ' <span class="su-st bad">موقوف</span>' : ''}</td><td dir="ltr" class="small">${esc(u.email || '')}</td><td class="small">${esc((u.roles || []).join('، '))}</td><td>${u.joined ? '<span class="su-st new">مفعّل</span>' : '<span class="su-st bad">لم يفعّل</span>'}</td><td class="small">${u.last_in ? fmt(u.last_in) + ` <span class="muted">(${AR(daysAgo(u.last_in))} ي)</span>` : '—'}</td><td>${AR(u.acts30 || 0)}</td></tr>`).join('') || `<tr><td colspan="6">${A.emptyBox('لا أحد')}</td></tr>`}</tbody></table></div></div>`;
      $('#uS', box).onchange = e => { sid = e.target.value; A.LS.set('pc_us', sid); draw(); };
      $('#uF', box).onchange = e => { flt = e.target.value; A.LS.set('pc_uf', flt); draw(); };
      $('#uQ', box).onchange = e => { q = e.target.value.trim(); draw(); };
      $('#uX', box).onclick = () => { if (!window.XLSX) return; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['الاسم', 'البريد', 'الأدوار', 'مفعّل', 'آخر دخول', 'عمليات ٣٠ يوماً'], ...V2.map(u => [u.name, u.email || '', (u.roles || []).join('، '), u.joined ? 'نعم' : 'لا', u.last_in || '', u.acts30 || 0])]), 'المستخدمون'); wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, `مستخدمو ${(L.find(x => x.id === sid) || {}).name || ''}.xlsx`); };
    };
    draw();
  }

  // ----- المشكلات -----
  async function pr(box) {
    let sub = A.LS.get('pc_pr') || 'err', days = +(A.LS.get('pc_prd') || 30), showRes = false;
    const draw = async () => {
      let E = [], R = []; try { [E, R] = await Promise.all([api.rpc('platform_errors_list', { p_days: days }), api.rpc('platform_reports_list', { p_status: null })]); } catch (e) { box.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', esc(e.message))}</div>`; return; }
      const RS = { open: 'جديد', working: 'قيد المعالجة', done: 'تمت' };
      box.innerHTML = `<div class="card" style="margin-top:0"><div class="row" style="gap:8px;flex-wrap:wrap"><div class="chip-filter" style="margin:0"><button data-sb="err" class="${sub === 'err' ? 'on' : ''}">أخطاء تلقائية (${AR(E.filter(e => !e.resolved).length)})</button><button data-sb="rep" class="${sub === 'rep' ? 'on' : ''}">بلاغات المستخدمين (${AR(R.filter(r => r.status !== 'done').length)})</button></div><div class="grow"></div>
        ${sub === 'err' ? `<select class="in" id="pD" style="width:auto;min-height:36px;padding:4px 8px">${[7, 30, 90].map(d => `<option value="${d}" ${days === d ? 'selected' : ''}>آخر ${AR(d)} يوماً</option>`).join('')}</select><label class="chk small"><input type="checkbox" id="pRs" ${showRes ? 'checked' : ''}> إظهار المعالَجة</label>` : ''}</div>
        <div style="margin-top:10px">${sub === 'err' ? (E.filter(e => showRes || !e.resolved).map(e => `<div class="pc-err ${e.resolved ? 'res' : ''}"><div class="row" style="justify-content:space-between;gap:6px;flex-wrap:wrap"><b style="color:#8C1D18">${esc(e.msg || '')}</b><span class="su-st ${e.n > 5 ? 'bad' : 'old'}">تكرر ${AR(e.n)} مرة</span></div>
          <div class="small muted">${esc(e.school || 'صفحة عامة')} · الصفحة ${esc(e.page || '')} · آخر مرة ${fmt(e.last_at)}${e.who ? ' · ' + esc(e.who) : ''} · الإصدار ${esc(e.ver || '—')}</div>
          ${e.stack ? `<details><summary class="small">التفاصيل التقنية</summary><code>${esc(e.stack)}\n${esc(e.ua || '')}</code></details>` : ''}
          <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><input class="in" data-en="${e.id}" value="${esc(e.note || '')}" placeholder="ملاحظة" style="max-width:280px;min-height:34px;padding:4px 8px"><button class="btn ${e.resolved ? 'ghost' : 'ok'} sm" data-er="${e.id}" data-v="${e.resolved ? 0 : 1}">${e.resolved ? 'إعادة فتح' : '✓ عولج'}</button></div></div>`).join('') || A.emptyBox('لا أخطاء — ممتاز')) :
          (R.map(r => `<div class="pc-err"><div class="row" style="justify-content:space-between;gap:6px;flex-wrap:wrap"><b>${esc(r.who || '')} — ${esc(r.school || '')}</b><span class="su-st ${r.status === 'done' ? 'new' : 'bad'}">${RS[r.status] || r.status}</span></div><div class="small muted">${fmt(r.created_at)} · الصفحة ${esc(r.page || '')}</div><div style="white-space:pre-line;margin-top:4px">${esc(r.body)}</div>${r.shot ? `<img class="pc-shot" src="${esc(r.shot)}" alt="صورة البلاغ">` : ''}
            <div class="field" style="margin-top:6px"><textarea class="in" data-rr="${r.id}" rows="2" placeholder="الرد على المستخدم">${esc(r.reply || '')}</textarea></div><div class="row" style="gap:6px">${['working', 'done'].map(s => `<button class="btn ${s === 'done' ? 'ok' : 'ghost'} sm" data-rs="${r.id}" data-s="${s}">${s === 'done' ? '✓ تمت المعالجة' : 'قيد المعالجة'}</button>`).join('')}</div></div>`).join('') || A.emptyBox('لا بلاغات'))}</div></div>`;
      $$('[data-sb]', box).forEach(b => b.onclick = () => { sub = b.dataset.sb; A.LS.set('pc_pr', sub); draw(); });
      const d = $('#pD', box); if (d) d.onchange = () => { days = +d.value; A.LS.set('pc_prd', days); draw(); };
      const rs = $('#pRs', box); if (rs) rs.onchange = () => { showRes = rs.checked; draw(); };
      $$('[data-er]', box).forEach(b => b.onclick = () => A.run(b, async () => { const n = box.querySelector(`[data-en="${b.dataset.er}"]`); await api.rpc('platform_error_set', { p_id: +b.dataset.er, p_resolved: b.dataset.v === '1', p_note: n ? n.value.trim() : '' }); draw(); }));
      $$('[data-rs]', box).forEach(b => b.onclick = () => A.run(b, async () => { const t = box.querySelector(`[data-rr="${b.dataset.rs}"]`); await api.rpc('platform_report_set', { p_id: b.dataset.rs, p_status: b.dataset.s, p_reply: t ? t.value.trim() : '' }); A.toast('حُفظ — يظهر الرد للمستخدم', 'ok'); draw(); }));
    };
    draw();
  }

  // ----- التقارير -----
  function rp(box) {
    const def = A.LS.get('pc_rp') || {}; let from = def.from || iso(new Date(Date.now() - 29 * 864e5)), to = def.to || iso(new Date());
    const draw = async () => {
      let U = []; try { U = await api.rpc('platform_usage', { p_from: from, p_to: to }); } catch (e) { box.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', esc(e.message))}</div>`; return; }
      const tot = k => U.reduce((a, u) => a + (+u[k] || 0), 0), mx = k => Math.max(1, ...U.map(u => +u[k] || 0));
      const table = `<table><tr><th>المدرسة</th>${MET.map(m => `<th>${m[1]}</th>`).join('')}</tr>${U.map(u => `<tr><td style="text-align:right"><b>${esc(u.name)}</b></td>${MET.map(m => `<td>${AR(u[m[0]] || 0)}</td>`).join('')}</tr>`).join('')}<tr><th>المجموع</th>${MET.map(m => `<th>${AR(tot(m[0]))}</th>`).join('')}</tr></table>`;
      box.innerHTML = `<div class="card" style="margin-top:0"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><div class="field" style="margin:0"><label for="rF">من</label><input class="in" type="date" id="rF" value="${from}"></div><div class="field" style="margin:0"><label for="rT">إلى</label><input class="in" type="date" id="rT" value="${to}"></div>
        <div class="chip-filter" style="margin:0">${[[7, 'أسبوع'], [30, 'شهر'], [90, 'فصل']].map(([d, n]) => `<button data-q="${d}">${n}</button>`).join('')}</div><div class="grow"></div><button class="btn ghost sm" id="rPr">طباعة</button><button class="btn ghost sm" id="rX">Excel</button></div>
        <div class="scroll" style="margin-top:10px"><table class="tbl"><thead><tr><th>المدرسة</th>${MET.map(m => `<th>${m[1]}</th>`).join('')}</tr></thead><tbody>${U.map(u => `<tr><td><b>${esc(u.name)}</b></td>${MET.map(m => `<td><div style="display:flex;align-items:center;gap:6px"><span style="min-width:28px">${AR(u[m[0]] || 0)}</span><span style="flex:1;min-width:30px;height:6px;border-radius:4px;background:#EEF2F8"><i style="display:block;height:100%;border-radius:4px;width:${Math.round((+u[m[0]] || 0) / mx(m[0]) * 100)}%;background:${m[0] === 'errors' ? '#E0675A' : 'var(--sky)'}"></i></span></div></td>`).join('')}</tr>`).join('')}</tbody><tfoot><tr><th>المجموع</th>${MET.map(m => `<th>${AR(tot(m[0]))}</th>`).join('')}</tr></tfoot></table></div></div>`;
      const set = () => { A.LS.set('pc_rp', { from, to }); draw(); };
      $('#rF', box).onchange = e => { from = e.target.value; set(); }; $('#rT', box).onchange = e => { to = e.target.value; set(); };
      $$('[data-q]', box).forEach(b => b.onclick = () => { to = iso(new Date()); from = iso(new Date(Date.now() - (+b.dataset.q - 1) * 864e5)); set(); });
      $('#rPr', box).onclick = () => A.printDoc('تقرير استخدام المنصة', `من ${from} إلى ${to}`, table, true);
      $('#rX', box).onclick = () => { if (!window.XLSX) return; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['المدرسة', ...MET.map(m => m[1])], ...U.map(u => [u.name, ...MET.map(m => u[m[0]] || 0)])]), 'الاستخدام'); wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, `تقرير الاستخدام ${from} - ${to}.xlsx`); };
    };
    draw();
  }
})();
