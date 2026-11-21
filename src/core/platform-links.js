/* منصة دينا — امتداد لوحة مالك المنصة (للمنصة الأم فقط):
   (١) «البيانات الوهمية» لكل مدرسة: توليد بيانات شبيهة بدينا ومسحها (RPC platform_demo_seed / platform_demo_clear — sql/118).
   (٢) تبويب «المنصات التابعة»: الاطلاع على منصة مستقلة (دينا أو غيرها) بقاعدتها الخاصة — قراءة فقط.
       يدخل المالك بحسابه في تلك المنصة مرة واحدة (جلسة منفصلة على هذا الجهاز)، فتُقرأ المؤشرات بصلاحياته هناك
       بعدّ الصفوف فقط (بلا تنزيل بيانات) — لا يُكتب شيء في قاعدتها ولا تُضاف لها أي دالة.
   الإعدادات: schools.settings.platform_links = [{id, name, url, db_url, db_key}] في مدرسة المالك (المنصة الأم). */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A || !A.PC_TABS) return;
  const { S, api, $, $$, esc } = A;
  const AR = A.AR || (n => String(n));
  const PA = () => !!(S.me && S.me.is_owner && A.isPlatformAdmin && A.isPlatformAdmin());
  const iso = d => d.toISOString().slice(0, 10);

  if (!document.getElementById('pl-css')) { const s = document.createElement('style'); s.id = 'pl-css'; s.textContent = `
  .pl-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:12px}
  .pl-card{background:#fff;border:1px solid var(--border);border-radius:16px;padding:14px;box-shadow:var(--sh1)}
  .pl-card h4{margin:0;color:var(--navy);font-size:18px}
  .pl-st{display:inline-block;font-size:12px;font-weight:800;border-radius:999px;padding:3px 10px}
  .pl-st.on{background:#E5F4EA;color:#1D5E3B}.pl-st.off{background:#FFF4DC;color:#6B4510}
  .pl-bar{height:10px;border-radius:6px;background:#EEF2F7;overflow:hidden;margin-top:4px}.pl-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--blue),var(--sky))}
  .pl-card .pc-kp{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:6px}.pl-card .pc-kp div{padding:8px}.pl-card .pc-kp b{font-size:20px}
  .pl-sc{overflow-x:auto;-webkit-overflow-scrolling:touch}.pl-sc .pl-tbl{min-width:520px}
  .pl-tbl{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}.pl-tbl th,.pl-tbl td{border-bottom:1px solid var(--pale);padding:6px;text-align:start}.pl-tbl th{color:var(--muted);font-weight:800}
  .dm-opt{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
  .dm-cnt{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin:10px 0}
  .dm-cnt div{background:#F4F7FB;border-radius:12px;padding:8px;text-align:center}.dm-cnt b{display:block;font-size:22px;color:var(--navy)}.dm-cnt span{font-size:12px;color:var(--muted)}
  `; document.head.appendChild(s); }

  // =============== (١) البيانات الوهمية ===============
  const CNT = [['classes', 'فصلاً'], ['teachers', 'معلماً'], ['students', 'طالباً'], ['weeks', 'أسبوعاً'], ['slots', 'حصة في الجدول'], ['entries', 'حصة في الخطط'], ['attendance', 'رصد حضور'], ['behaviors', 'سلوكاً']];
  const cntHtml = c => `<div class="dm-cnt">${CNT.filter(([k]) => c && c[k] != null).map(([k, n]) => `<div><b>${AR(c[k])}</b><span>${n}</span></div>`).join('')}</div>`;
  const prevActs = A.schoolCardActs;
  A.schoolCardActs = (root, L) => {
    if (prevActs) prevActs(root, L);
    $$('[data-acts]', root).forEach(row => { const x = L.find(s => s.id === row.dataset.acts); if (!x) return;
      const on = !!(((x.platform || {}).demo || {}).on);
      row.insertAdjacentHTML('beforeend', `<button class="btn ghost sm" data-dm="${x.id}">🎲 بيانات وهمية${on ? ' <span class="su-st new">مفعّلة</span>' : ''}</button>`); });
    $$('[data-dm]', root).forEach(b => b.onclick = () => demoDlg(L.find(s => s.id === b.dataset.dm)));
  };
  A.demoDlg = demoDlg;
  function demoDlg(x) {
    const dm = (x.platform || {}).demo || {};
    if (dm.on) {
      const m = A.modal(`<h3>البيانات الوهمية — ${esc(x.name)}</h3><p class="sub">أُنشئت ${esc(A.fmtDT ? A.fmtDT(dm.at) : String(dm.at || '').slice(0, 16))}. تظهر في المنصة كأنها بيانات مدرسة حقيقية (فصول، معلمون بلا حسابات، طلاب، جدول معتمد، خطط، حضور، سلوك).</p>${cntHtml(dm.counts)}
        <div class="pc-al i">المسح يحذف ما أنشأته البيانات الوهمية فقط. أي شيء أضفته بنفسك يبقى كما هو (مادة أو فصل دراسي مستخدَم في بياناتك لا يُحذف).</div>
        <div class="acts"><button class="btn bad" id="dmClr">مسح البيانات الوهمية</button></div>`);
      m.el.querySelector('#dmClr').onclick = ev => A.run(ev.currentTarget, async () => {
        if (!(await A.confirmBox(`مسح كل البيانات الوهمية من «${esc(x.name)}»؟ المسح مباشر ولا رجعة فيه (لا تمر بسلة المحذوفات).`, 'مسح'))) return;
        const r = await api.rpc('platform_demo_clear', { p_school: x.id }); m.close();
        A.toast(`مُسحت: ${AR(r.classes || 0)} فصلاً، ${AR(r.teachers || 0)} معلماً، ${AR(r.students || 0)} طالباً`, 'ok'); afterChange(x);
      });
      return;
    }
    const real = (+x.students || 0) > 0 || (+x.classes || 0) > 0;
    const m = A.modal(`<h3>توليد بيانات وهمية — ${esc(x.name)}</h3>
      <p class="sub">تملأ المدرسة ببيانات شبيهة بمدارس دينا لتجربة المنصة كاملة أو عرضها: فصول من الرابع الابتدائي إلى الثالث الثانوي لكل قسم، معلمون بتخصصاتهم (بلا حسابات دخول)، طلاب، جدول دراسي معتمد بلا تعارض، خطط أسابيع سابقة وحالية وقادمة بحالات مختلفة، حضور يومي وسلوك. يمكن مسحها كلها بزر واحد.</p>
      ${real ? '<div class="pc-al w">⚠️ في هذه المدرسة بيانات حالية. ستُضاف البيانات الوهمية بجانبها ولن تُمس بياناتك، لكن يُفضّل استخدامها في المدارس التجريبية فقط.</div>' : ''}
      <div class="dm-opt">
        <div class="field"><label for="dmK">فصول لكل صف</label><select class="in" id="dmK"><option value="1">فصل واحد</option><option value="2">فصلان (أ، ب)</option><option value="3">ثلاثة فصول</option></select></div>
        <div class="field"><label for="dmS">طلاب لكل فصل</label><select class="in" id="dmS">${[10, 15, 18, 20, 25, 30].map(n => `<option value="${n}" ${n === 18 ? 'selected' : ''}>${AR(n)}</option>`).join('')}</select></div>
        <div class="field"><label for="dmW">أسابيع سابقة بخطط</label><select class="in" id="dmW">${[0, 1, 2, 3, 4, 6, 8].map(n => `<option value="${n}" ${n === 3 ? 'selected' : ''}>${AR(n)}</option>`).join('')}</select></div>
        <div class="field"><label for="dmA">أيام حضور سابقة</label><select class="in" id="dmA">${[0, 5, 10, 15, 20].map(n => `<option value="${n}" ${n === 10 ? 'selected' : ''}>${AR(n)}</option>`).join('')}</select></div>
      </div>
      <p class="small muted" id="dmEst"></p>
      <div class="acts"><button class="btn" id="dmGo">توليد البيانات</button></div>`, { cls: 'wide' });
    const v = id => +m.el.querySelector(id).value;
    const est = () => { const sec = Math.max(1, +x.sections || 1), c = 9 * v('#dmK') * sec; m.el.querySelector('#dmEst').textContent = `تقريباً: ${AR(c)} فصلاً، ${AR(c * v('#dmS'))} طالباً في ${AR(sec)} ${sec > 1 ? 'أقسام' : 'قسم'}. الحجم صغير جداً ولا يؤثر على حصة القاعدة.`; };
    $$('select', m.el).forEach(s => s.onchange = est); est();
    m.el.querySelector('#dmGo').onclick = ev => A.run(ev.currentTarget, async () => {
      const c = await api.rpc('platform_demo_seed', { p_school: x.id, p_opts: { classes_per_grade: v('#dmK'), students: v('#dmS'), weeks_back: v('#dmW'), attendance_days: v('#dmA') } });
      m.el.innerHTML = `<h3>✓ أُنشئت البيانات الوهمية</h3>${cntHtml(c)}${c.no_teacher ? `<div class="pc-al w">${AR(c.no_teacher)} حصة بلا معلم (يمكن إسنادها من استوديو الجداول).</div>` : ''}<p class="small muted">${x.mine ? 'أعد تحميل الصفحة لتظهر البيانات في منصتك.' : 'تظهر لمستخدمي هذه المدرسة عند دخولهم.'}</p><div class="acts">${x.mine ? '<button class="btn" id="dmRl">إعادة تحميل المنصة</button>' : '<button class="btn" id="dmOk">تم</button>'}</div>`;
      const rl = m.el.querySelector('#dmRl'); if (rl) rl.onclick = () => location.reload();
      const ok = m.el.querySelector('#dmOk'); if (ok) ok.onclick = () => m.close();
      afterChange(x, true);
    });
  }
  function afterChange(x, keepOpen) { if (A.schoolsRefresh) A.schoolsRefresh(); if (x.mine && !keepOpen) setTimeout(() => location.reload(), 600); }

  // =============== (٢) المنصات التابعة ===============
  A.PC_TABS.push(['lk', 'المنصات التابعة']);
  // دينا مرتبطة دائماً كمنصة تابعة (من config.js — قاعدتها مستقلة)
  const PRESET = () => { const DBS = window.APP_DBS || {}; return DBS.dina ? [{ id: 'dina', name: 'مدارس دينا العالمية', url: 'https://ahmedabdelazem1460-ux.github.io/dina-tools/', db_url: DBS.dina.supabaseUrl, db_key: DBS.dina.supabaseKey, preset: true }] : []; };
  const links = () => { const own = ((S.school || {}).settings || {}).platform_links || []; const ids = new Set(own.map(l => l.id)); return PRESET().filter(p => !ids.has(p.id)).concat(own); };
  const saveLinks = async L => { const st = Object.assign({}, (S.school || {}).settings || {}, { platform_links: L.filter(l => !l.preset) }); await api.updateSchool(S.school.id, { settings: st }); S.school.settings = st; };
  const CL = {};
  const client = l => {
    if (CL[l.id]) return CL[l.id];
    if (!window.supabase || !l.db_url || !l.db_key) return null;
    if (l.db_url === (window.APP_CONFIG || {}).supabaseUrl) return null; // نفس قاعدة المنصة الحالية
    return (CL[l.id] = window.supabase.createClient(l.db_url, l.db_key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'dwp_link_' + l.id, detectSessionInUrl: false } }));
  };

  A.PC_VIEWS.lk = async function (box) {
    if (!PA()) { box.innerHTML = ''; return; }
    const L = links();
    box.innerHTML = `<div class="card"><div class="head"><div class="grow"><h3 style="margin:0">المنصات التابعة</h3><p class="sub" style="margin:2px 0 0">منصات مستقلة بقاعدة بيانات خاصة بها (مثل منصة دينا). تظهر مؤشراتها وتقاريرها هنا عبر وسيط آمن (مفتاح قراءة محفوظ سراً في Cloudflare) دون حساب لك فيها — <b>قراءة فقط</b>، ولا يُكتب أو يُضاف أي شيء في قاعدتها. وإن لم يُضبط مفتاح منصة بعد، يمكنك الدخول بحسابك فيها.</p></div><button class="btn ghost sm" id="plAdd">+ ربط منصة</button></div>
      <div class="pl-cards">${L.map(l => `<div class="pl-card" data-l="${esc(l.id)}"><div class="row" style="justify-content:space-between;gap:6px;align-items:center"><h4>${esc(l.name)}</h4><span class="pl-st off" data-ls>…</span></div><div class="small muted" dir="ltr" style="text-align:start">${esc((l.url || '').replace(/^https?:\/\//, ''))}</div><div data-lb style="margin-top:10px">${A.emptyBox('جارٍ التحقق…')}</div></div>`).join('') || A.emptyBox('لا منصات مرتبطة')}</div></div>`;
    $('#plAdd', box).onclick = () => addDlg(box);
    L.forEach(l => card(box.querySelector(`[data-l="${CSS.escape(l.id)}"]`), l, box));
  };

  // (أ) الاطلاع الكامل عبر الوسيط الآمن على Cloudflare (/api/link/<id>/overview) — بلا حساب في المنصة التابعة
  async function viaServer(l, fresh) {
    let ses = null; try { ses = await api.session(); } catch (_) { }
    if (!ses || !ses.access_token) return { ok: false, code: 0 };
    try {
      const r = await fetch(`api/link/${encodeURIComponent(l.id)}/overview${fresh ? '?fresh=1' : ''}`, { headers: { authorization: 'Bearer ' + ses.access_token } });
      const ct = r.headers.get('content-type') || ''; if (!/json/.test(ct)) return { ok: false, code: 404 };
      const j = await r.json(); return r.ok ? { ok: true, data: j } : { ok: false, code: r.status, err: j && j.error };
    } catch (_) { return { ok: false, code: 0 }; }
  }
  const pctOf = (a, b) => b ? Math.round(100 * a / b) : 0;
  function fullHtml(o) {
    const k = (v, t, c) => `<div class="${c || ''}"><b>${v == null ? '—' : AR(v)}</b><span>${t}</span></div>`;
    return (o.schools || []).map(s => `<div class="sec-box" style="margin-top:8px"><b style="color:var(--navy)">${esc(s.name)}</b>
      <div class="pc-kp" style="margin-top:8px">${k(s.staff, 'موظفاً')}${k(s.accounts, 'حساباً مفعّلاً')}${k(s.students, 'طالباً')}${k(s.logins, 'دخولاً (٣٠ يوماً)')}${k(s.att, 'رصد حضور اليوم')}${k(s.absent, 'غائباً اليوم', s.absent ? 'bad' : '')}${k(s.late, 'متأخراً اليوم')}${k(s.beh, 'سلوكاً (٧ أيام)')}${k(s.behNeg, 'سلوكاً سلبياً (٧ أيام)', s.behNeg ? 'bad' : '')}${k(s.quizzes, 'اختباراً إلكترونياً (٣٠ يوماً)')}${k(s.preps, 'تحضيراً (٣٠ يوماً)')}${k(s.forms, 'نموذجاً (٣٠ يوماً)')}${k(s.questions, 'سؤالاً في البنك')}</div>
      <div class="pl-sc"><table class="pl-tbl"><thead><tr><th>القسم</th><th>الفصول</th><th>الأسبوع الحالي</th><th>إنجاز الخطط</th><th>معتمد</th><th>نُفّذ</th></tr></thead><tbody>${(s.sections || []).map(x => { const w = x.week; return `<tr><td>${esc(x.name)}</td><td>${AR(x.classes || 0)}</td><td>${w ? 'الأسبوع ' + esc(w.word) : '—'}</td><td>${w ? `${AR(pctOf(w.sent, w.total))}٪ <span class="small muted">(${AR(w.sent)} من ${AR(w.total)})</span><div class="pl-bar"><i style="width:${pctOf(w.sent, w.total)}%"></i></div>` : '—'}</td><td>${w ? AR(pctOf(w.approved, w.total)) + '٪' : '—'}</td><td>${w ? AR(pctOf(w.done, w.total)) + '٪' : '—'}</td></tr>`; }).join('')}</tbody></table></div>
      ${(s.top || []).length ? `<table class="pl-tbl"><thead><tr><th>الأكثر إرسالاً للخطط (٧ أيام)</th><th>حصص</th></tr></thead><tbody>${s.top.map(t => `<tr><td>${esc(t.name)}</td><td>${AR(t.n)}</td></tr>`).join('')}</tbody></table>` : ''}</div>`).join('') +
      `<div class="small muted" style="margin-top:6px">آخر تحديث ${esc(A.fmtDT ? A.fmtDT(o.at) : o.at)}${o.cached ? ' (محفوظ مؤقتاً — يتجدد كل ٥ دقائق)' : ''}</div>`;
  }

  async function card(el, l, box, fresh) {
    const sb = client(l), st = el.querySelector('[data-ls]'), b = el.querySelector('[data-lb]');
    el.querySelectorAll('[data-lnote]').forEach(n => n.remove());
    const sv = await viaServer(l, fresh);
    if (sv.ok) {
      st.textContent = 'اطلاع كامل — قراءة فقط'; st.className = 'pl-st on';
      b.innerHTML = fullHtml(sv.data) + `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px">${l.url ? `<a class="btn ghost sm" href="${esc(l.url)}" target="_blank" rel="noopener">↗ فتح المنصة</a>` : ''}<button class="btn ghost sm" data-lfr>↻ تحديث الآن</button></div>`;
      b.querySelector('[data-lfr]').onclick = ev => A.run(ev.currentTarget, () => card(el, l, box, true));
      return;
    }
    const note = sv.code === 501 ? `<div class="pc-al w">الاطلاع الكامل بلا حساب جاهز، لكن مفتاح القراءة لهذه المنصة لم يُضف بعد في Cloudflare (<span dir="ltr">LINK_KEY_${esc(l.id)}</span>). حتى إضافته يمكنك الدخول بحسابك أدناه.</div>` : sv.code === 403 ? '<div class="pc-al e">الوسيط رفض الطلب: حسابك ليس مدير المنصة الأم.</div>' : sv.code === 502 ? '<div class="pc-al e">تعذّرت القراءة من قاعدة المنصة التابعة (تحقق من صحة المفتاح).</div>' : '';
    if (note) el.querySelector('[data-lb]').insertAdjacentHTML('beforebegin', `<div data-lnote>${note}</div>`);
    const tools = `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px">${l.url ? `<a class="btn ghost sm" href="${esc(l.url)}" target="_blank" rel="noopener">↗ فتح المنصة</a>` : ''}${!l.preset ? '<button class="btn ghost sm" data-ldel>إزالة الربط</button>' : ''}</div>`;
    if (!sb) { st.textContent = 'غير متاح'; b.innerHTML = A.emptyBox('بيانات الاتصال غير مكتملة أو هي نفس هذه المنصة') + tools; bindTools(); return; }
    let ses = null; try { ses = (await sb.auth.getSession()).data.session; } catch (_) { }
    if (!ses) {
      st.textContent = 'لم تدخل بعد'; st.className = 'pl-st off';
      b.innerHTML = `<p class="small" style="margin:0 0 6px">ادخل بحسابك في «${esc(l.name)}» (نفس بريد وكلمة مرور تلك المنصة). تُحفظ الجلسة على هذا الجهاز فقط.</p>
        <form class="grid g2" data-lf autocomplete="on"><div class="field"><label>البريد</label><input class="in" name="e" type="email" dir="ltr" autocomplete="username" required></div><div class="field"><label>كلمة المرور</label><input class="in" name="p" type="password" dir="ltr" autocomplete="current-password" required></div><div><button class="btn sm" type="submit">دخول للاطلاع</button></div></form>` + tools;
      b.querySelector('[data-lf]').onsubmit = ev => { ev.preventDefault(); const f = ev.currentTarget, btn = f.querySelector('button'); A.run(btn, async () => { const { error } = await sb.auth.signInWithPassword({ email: f.e.value.trim().toLowerCase(), password: f.p.value }); f.p.value = ''; if (error) throw new Error(/invalid/i.test(error.message) ? 'البريد أو كلمة المرور غير صحيحة' : error.message); card(el, l, box); }); };
      bindTools(); return;
    }
    st.textContent = 'متصل — قراءة فقط'; st.className = 'pl-st on';
    b.innerHTML = A.emptyBox('جارٍ جمع المؤشرات…');
    try { b.innerHTML = await overview(sb, l) + tools + `<div class="row" style="gap:6px;margin-top:6px"><span class="small muted">الحساب: <span dir="ltr">${esc(ses.user.email || '')}</span></span><button class="btn ghost sm" data-lout>خروج من هذه المنصة</button></div>`; }
    catch (e) { b.innerHTML = A.emptyBox('تعذّر جمع المؤشرات', esc(e.message || String(e))) + tools; }
    const out = b.querySelector('[data-lout]'); if (out) out.onclick = async () => { try { await sb.auth.signOut({ scope: 'local' }); } catch (_) { } card(el, l, box); };
    bindTools();
    function bindTools() { const d = el.querySelector('[data-ldel]'); if (d) d.onclick = () => A.run(d, async () => { if (!(await A.confirmBox(`إزالة ربط «${esc(l.name)}»؟ لا يتأثر شيء في تلك المنصة.`, 'إزالة'))) return; try { await client(l) && client(l).auth.signOut({ scope: 'local' }); } catch (_) { } await saveLinks(links().filter(x => x.id !== l.id)); A.PC_VIEWS.lk(box); }); }
  }

  // مؤشرات منصة تابعة بعدّ الصفوف فقط (head + count) — بصلاحيات حساب المالك فيها
  async function overview(sb, l) {
    const n = async (t, f) => { try { let q = sb.from(t).select('*', { count: 'exact', head: true }); if (f) q = f(q); const { count, error } = await q; return error ? null : count; } catch (_) { return null; } };
    const today = iso(new Date()), w7 = iso(new Date(Date.now() - 6 * 864e5)), d30 = new Date(Date.now() - 29 * 864e5).toISOString();
    const [{ data: me }, { data: sc }] = await Promise.all([sb.from('staff').select('full_name,is_owner,school_id').eq('user_id', (await sb.auth.getUser()).data.user.id).maybeSingle(), sb.from('schools').select('id,name').limit(5)]);
    if (!me) throw new Error('حسابك غير مرتبط بموظف في هذه المنصة');
    const { data: secs } = await sb.from('sections').select('id,name').order('sort');
    // الأسبوع الحالي لكل قسم
    const { data: wks } = await sb.from('weeks').select('id,section_id,word,start_date').lte('start_date', today).order('start_date', { ascending: false }).limit(20);
    const cur = {}; (wks || []).forEach(w => { if (!cur[w.section_id]) cur[w.section_id] = w; });
    const wIds = Object.values(cur).map(w => w.id);
    const [staff, accts, students, classes, logins, att, absent, beh, quizzes, questions, forms, plans, done] = await Promise.all([
      n('staff', q => q.eq('active', true)), n('staff', q => q.eq('active', true).not('user_id', 'is', null)), n('students', q => q.eq('active', true)), n('classes', q => q.eq('active', true)),
      n('login_events', q => q.gte('at', d30)), n('attendance', q => q.eq('day', today)), n('attendance', q => q.eq('day', today).eq('status', 'absent')), n('behaviors', q => q.gte('day', w7)),
      n('quizzes', q => q.gte('created_at', d30)), n('questions'), n('form_tasks', q => q.gte('created_at', d30)),
      wIds.length ? n('plan_entries', q => q.in('week_id', wIds)) : 0, wIds.length ? n('plan_entries', q => q.in('week_id', wIds).in('status', ['submitted', 'approved'])) : 0]);
    const pct = plans ? Math.round(100 * done / plans) : 0;
    const k = (v, t) => `<div><b>${v == null ? '—' : AR(v)}</b><span>${t}</span></div>`;
    let top = '';
    if (me.is_owner) { try {
      // staff_work يعيد [{s: الموظف، c: النوع، d: اليوم، n: العدد}] — والأسماء من جدول الموظفين
      const [{ data }, { data: ppl }] = await Promise.all([sb.rpc('staff_work', { p_from: w7, p_to: today }), sb.from('staff').select('id,full_name').eq('active', true)]);
      const nm = {}; (ppl || []).forEach(p => nm[p.id] = p.full_name); const by = {};
      (data || []).forEach(r => { if (!r.s) return; by[r.s] = (by[r.s] || 0) + (+r.n || 0); });
      const T = Object.entries(by).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
      if (T.length) top = `<table class="pl-tbl"><thead><tr><th>الأكثر إنجازاً (٧ أيام)</th><th>أعمال</th></tr></thead><tbody>${T.map(([id, c]) => `<tr><td>${esc(nm[id] || '—')}</td><td>${AR(c)}</td></tr>`).join('')}</tbody></table>`;
    } catch (_) { } }
    return `<div class="small muted">${esc((sc || []).map(s => s.name).join('، '))} · ${esc((secs || []).map(s => s.name).join('، '))} · دخلت باسم ${esc(me.full_name)}${me.is_owner ? ' (مالك)' : ''}</div>
      <div class="pc-kp" style="margin-top:8px">${k(staff, 'موظفاً')}${k(accts, 'حساباً مفعّلاً')}${k(students, 'طالباً')}${k(classes, 'فصلاً')}${k(logins, 'دخولاً (٣٠ يوماً)')}${k(att, 'رصد حضور اليوم')}${k(absent, 'غائباً اليوم')}${k(beh, 'سلوكاً (٧ أيام)')}${k(quizzes, 'اختباراً إلكترونياً (٣٠ يوماً)')}${k(questions, 'سؤالاً في البنك')}${k(forms, 'نموذجاً (٣٠ يوماً)')}</div>
      <div class="small"><b>خطط الأسبوع الحالي</b> (${esc(Object.values(cur).map(w => 'الأسبوع ' + w.word).filter((v, i, a) => a.indexOf(v) === i).join('، ') || '—')}): ${AR(done)} من ${AR(plans)} حصة مُرسلة أو معتمدة (${AR(pct)}٪)</div><div class="pl-bar"><i style="width:${pct}%"></i></div>${top}`;
  }

  function addDlg(box) {
    const m = A.modal(`<h3>ربط منصة تابعة</h3><p class="sub">لمنصة مستقلة بقاعدة بيانات خاصة. تحتاج رابط المنصة وبيانات الاتصال العامة لقاعدتها (من config.js الخاص بها). المفتاح العام آمن، والحماية في صلاحيات تلك القاعدة.</p>
      <div class="field"><label for="lN">اسم المنصة</label><input class="in" id="lN"></div><div class="field"><label for="lU">رابط المنصة</label><input class="in" id="lU" dir="ltr" placeholder="https://"></div>
      <div class="grid g2"><div class="field"><label for="lD">رابط القاعدة (supabaseUrl)</label><input class="in" id="lD" dir="ltr" placeholder="https://xxxx.supabase.co"></div><div class="field"><label for="lK">المفتاح العام (supabaseKey)</label><input class="in" id="lK" dir="ltr" placeholder="sb_publishable_…"></div></div>
      <div class="acts"><button class="btn" id="lGo">ربط</button></div>`, { cls: 'wide' });
    m.el.querySelector('#lGo').onclick = ev => A.run(ev.currentTarget, async () => {
      const v = id => m.el.querySelector(id).value.trim(), l = { id: 'l' + Date.now().toString(36), name: v('#lN'), url: v('#lU'), db_url: v('#lD').replace(/\/+$/, ''), db_key: v('#lK') };
      if (!l.name) throw new Error('اكتب اسم المنصة'); if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(l.db_url)) throw new Error('رابط القاعدة غير صحيح'); if (!/^(sb_publishable_|eyJ)/.test(l.db_key)) throw new Error('المفتاح العام غير صحيح (لا تضع المفتاح السري أبداً)');
      await saveLinks(links().concat([l])); m.close(); A.toast('رُبطت المنصة', 'ok'); A.PC_VIEWS.lk(box);
    });
  }
})();
