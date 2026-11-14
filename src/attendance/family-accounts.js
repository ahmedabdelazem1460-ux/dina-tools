/* منصة دينا — حسابات أولياء الأمور والتصدير الشامل (تغليف V.stucodes)
   - رمز واحد لكل جوال ولي أمر يجمع كل أبنائه في المدرسة (القسمين) — RPC parent_codes_gen/list/toggle (sql/103).
   - تصدير شامل: Excel (طلاب + أولياء أمور، وورقة لكل فصل اختيارياً) وبطاقات طباعة بهوية دينا مع QR.
   - «ما يراه ولي الأمر»: schools.settings.portal {att, res, beh: none|positive|all} — للمالك فقط.
   يظهر لغير المالك بمفتاح tfeat('pcodes')، وإلا تبقى صفحة «حسابات الطلاب» كما هي. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A || !V) return;
  const { S, api, $, $$, esc, AR } = A;
  const prev = V.stucodes; if (!prev) return;
  const isOwner = () => !!(S.me && S.me.is_owner);
  const mgr = () => !!(S.me && (S.me.is_owner || (A.hasModule && (A.hasModule('attendance') || A.hasModule('supervision')))));
  const on = () => !!(S.me && (isOwner() || (A.tfeat && A.tfeat('pcodes'))) && mgr());
  const base = () => location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '');
  const sLink = c => base() + 'me.html?c=' + encodeURIComponent(c);
  const pLink = c => base() + 'family.html?a=' + encodeURIComponent(c);
  const pHome = () => base() + 'family.html';
  const waNum = p => { let d = String(p || '').replace(/\D/g, ''); if (/^05\d{8}$/.test(d)) d = '966' + d.slice(1); else if (/^5\d{8}$/.test(d)) d = '966' + d; return d.length >= 11 ? d : ''; };
  const showPh = p => { const d = String(p || ''); return /^9665\d{8}$/.test(d) ? '0' + d.slice(3) : d; };
  const ERR = m => ({ 'no permission': 'ليست لديك صلاحية — المالك أو صلاحية الحضور أو الإشراف' })[m] || m;
  let QR = null; const loadQR = () => QR ? Promise.resolve(QR) : new Promise(ok => { if (window.qrcode) return ok(QR = window.qrcode); const s = document.createElement('script'); s.src = 'vendor/qrcode.js'; s.onload = () => ok(QR = window.qrcode); s.onerror = () => ok(null); document.head.appendChild(s); });
  const qrSvg = (q, t) => { if (!q) return ''; const x = q(0, 'M'); x.addData(t); x.make(); return x.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); };
  const fmt = d => d ? (A.fmtDT ? A.fmtDT(d) : new Date(d).toLocaleString('ar-SA')) : '';
  const CFG0 = { att: true, res: true, beh: 'none', msg: 'all', excuse: true, reports: true, auto: true, noor: false, paper: true, practice: true, sharedQ: false, approve: true, selfLink: false };
  const cfgOf = () => Object.assign({}, CFG0, ((S.school || {}).settings || {}).portal || {});

  /* ---------- وضع التجربة: محاكاة الدوال في الذاكرة ---------- */
  const DM = { pc: [] };
  const rnd = n => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < n; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };
  const normPh = p => { const d = String(p || '').replace(/\D/g, ''); if (/^05\d{8}$/.test(d)) return '966' + d.slice(1); if (/^5\d{8}$/.test(d)) return '966' + d; return d.length >= 9 ? d : null; };
  async function demoRpc(n, a) {
    const st = (await api.list('students', {})).filter(x => x.active !== false), cls = await api.list('classes', {});
    if (n === 'parent_codes_gen') { let k = 0; const phs = [...new Set(st.filter(x => !a.p_section || x.section_id === a.p_section).map(x => normPh(x.guardian_phone)).filter(Boolean))].filter(p => !a.p_phone || p === normPh(a.p_phone));
      phs.forEach(p => { if (!a.p_phone && DM.pc.some(c => c.phone === p)) return; DM.pc = DM.pc.filter(c => c.phone !== p); DM.pc.push({ code: rnd(5) + '-' + rnd(5), phone: p, active: true, logins: 0 }); k++; });
      return { created: k, nophone: st.filter(x => !normPh(x.guardian_phone)).length }; }
    if (n === 'family_requests') return [];
    if (n === 'family_link') { DM.links = DM.links || []; DM.links.push({ phone: normPh(a.p_phone), student: a.p_student, kind: a.p_kind }); return { ok: true }; }
    if (n === 'family_change_phone') { const c = DM.pc.find(c => c.phone === normPh(a.p_old)); if (c) c.phone = normPh(a.p_new); return { ok: true }; }
    if (n === 'parent_code_toggle') { const c = DM.pc.find(c => c.phone === normPh(a.p_phone)); if (c) c.active = a.p_active; return null; }
    if (n === 'parent_codes_list') { const g = {}; st.forEach(x => { const p = normPh(x.guardian_phone); if (p) (g[p] = g[p] || []).push(x); });
      return Object.entries(g).filter(([, k]) => !a.p_section || k.some(x => x.section_id === a.p_section)).map(([p, k]) => { const c = DM.pc.find(c => c.phone === p) || {};
        return { phone: p, gname: k[0].guardian_name || '', code: c.code || null, active: c.active, activated: c.activated || null, last: null, logins: 0, kids: k.map(x => ({ id: x.id, name: x.full_name, no: x.student_no, class: (cls.find(c => c.id === x.class_id) || {}).name, class_id: x.class_id, section_id: x.section_id })) }; }); }
    return null;
  }
  const rpc = async (n, a) => { if (api.demo && /^(parent_code|family_)/.test(n)) return demoRpc(n, a); try { return await api.rpc(n, a); } catch (e) { throw new Error(ERR(e.message)); } };

  if (!document.getElementById('facss')) { const st = document.createElement('style'); st.id = 'facss'; st.textContent = `
.fa-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 12px}
.fa-tabs button{font:inherit;font-weight:800;border:1.5px solid #C9D7EC;background:#fff;color:#005499;border-radius:999px;padding:8px 16px;cursor:pointer;min-height:44px}
.fa-tabs button[aria-selected="true"]{background:#082B5A;color:#fff;border-color:#082B5A}
.fa-tabs button:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}
.fa-tbl td:first-child{min-width:130px}.fa-tbl code{white-space:nowrap}
.fa-kids{display:flex;flex-wrap:wrap;gap:4px}.fa-kids span{background:#EEF4FB;border-radius:10px;padding:2px 8px;font-size:12.5px}
.fa-note{border:1px solid #F3D9A4;background:#FFF8E8;color:#7a4b00;border-radius:14px;padding:10px 12px;font-size:13.5px;margin:10px 0}
.fa-opt{display:flex;gap:10px;align-items:flex-start;border:1px solid #DCE7F3;border-radius:14px;padding:10px 12px;margin-bottom:8px;background:#fff;cursor:pointer}
.fa-opt input{width:20px;height:20px;accent-color:#005499;flex:none;margin-top:3px}
.fa-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}
.fa-box{border:1px solid #DCE7F3;border-radius:16px;padding:14px;background:linear-gradient(180deg,#fff,#F5F9FD)}
.fa-box h3{margin:0 0 6px;color:#082B5A;font-size:16px}
@media (max-width:600px){.fa-hide-m{display:none}}
`; document.head.appendChild(st); }

  const TABS = () => [['stu', 'حسابات الطلاب', true], ['par', 'أولياء الأمور', true], ['exp', 'التصدير الشامل', true], ['set', 'ما يراه ولي الأمر', isOwner()]].filter(t => t[2]);

  V.stucodes = async function (root) {
    if (!on()) return prev(root);
    let tab = A.LS.get('fa_t') || 'stu'; if (!TABS().some(t => t[0] === tab)) tab = 'stu';
    root.innerHTML = `<div class="fa-tabs" role="tablist" aria-label="حسابات الطلاب وأولياء الأمور">${TABS().map(([k, n]) => `<button role="tab" data-fa="${k}" aria-selected="${k === tab}">${n}</button>`).join('')}</div><div id="faB"></div>`;
    $$('[data-fa]', root).forEach(b => b.onclick = () => { A.LS.set('fa_t', b.dataset.fa); V.stucodes(root); });
    const B = $('#faB', root);
    if (tab === 'stu') return prev(B);
    if (tab === 'par') return parents(B);
    if (tab === 'exp') return exportAll(B);
    return settings(B);
  };

  /* ---------- أولياء الأمور ---------- */
  async function parents(B) {
    const secs = S.sections || [];
    let sec = A.LS.get('fa_sec'); if (sec !== 'all' && !secs.some(s => s.id === sec)) sec = S.sectionId || 'all';
    let q = '', L = [], last = null;
    B.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">حسابات أولياء الأمور</h2><p class="sub" style="margin:2px 0 0">رمز واحد لكل جوال ولي أمر، يرى به كل أبنائه المسجلين بنفس الرقم: الخطة، والاختبارات والنتائج، والحضور — حسب ما تحدده في «ما يراه ولي الأمر».</p></div></div>
      <details class="rs-how"><summary><b>كيف تعمل؟</b></summary><ul>
        <li>يُجمع الأبناء تلقائياً من رقم «جوال ولي الأمر» في بيانات الطلاب. وللمرونة: «إدارة» لكل عائلة تربط ابناً مسجلاً بجوال آخر، أو تخفي ابناً، أو تغيّر جوال العائلة (مع الرمز والحساب)؛ و«ولي أمر بجوال آخر» يضيف أماً أو ولياً ثانياً بحساب مستقل.</li>
        <li>إن فعّلت «طلب ربط ابن» في «ما يراه ولي الأمر»، يطلب ولي الأمر ربط ابن مسجّل بجوال آخر برمز دخول الطالب ورقمه، ويظهر الطلب هنا لتعتمده.</li>
        <li>الرمز (١٠ خانات) <b>للتفعيل مرة واحدة</b>: يفتح ولي الأمر «بوابة ولي الأمر»، ويكتب جواله والرمز، ويختار كلمة مرور خاصة به؛ بعدها يدخل بالجوال وكلمة المرور فقط.</li>
        <li>نسي كلمة المرور؟ «رمز جديد» يلغي كلمة المرور الحالية ويخرجه من كل الأجهزة، ثم يفعّل من جديد. و«إيقاف» يمنع الدخول فوراً دون حذف.</li>
        <li>بعد ١٥ محاولة خاطئة خلال ربع ساعة يُحجب الجهاز مؤقتاً، وبعد ٨ محاولات خاطئة لنفس الحساب يُقفل ربع ساعة. كلمات المرور مشفّرة ولا يراها أحد.</li>
        <li>لا يرى ولي الأمر ملاحظات المرشد أو الإحالات أبداً، ورسائله مع المعلمين خاصة بالطرفين فقط.</li></ul></details>
      <div class="row" style="gap:8px;margin:10px 0;flex-wrap:wrap;align-items:flex-end">
        <label class="small">القسم <select class="in" id="faS" style="width:auto"><option value="all">كل الأقسام</option>${secs.map(s => `<option value="${s.id}" ${s.id === sec ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
        <label class="small" style="flex:1;min-width:180px">بحث <input class="in" id="faQ" placeholder="اسم ولي الأمر أو الطالب أو الجوال"></label>
        <button class="btn ok" id="faGen">إنشاء رموز للعائلات الجديدة</button>
        <button class="btn ghost" id="faPr">${A.I.print || ''} طباعة البطاقات</button>
        <button class="btn ghost" id="faX">Excel</button>
        <button class="btn ghost" id="faAdd">+ ولي أمر بجوال آخر</button>
        <a class="btn ghost" href="family.html" target="_blank" rel="noopener">فتح بوابة ولي الأمر</a></div>
      <div id="faRq"></div><div id="faL"><div class="spinner"></div></div></div>`;
    const box = $('#faL', B);
    const view = () => { const k = A.normKey ? A.normKey(q) : q; return L.filter(f => !q || [f.gname, showPh(f.phone), f.phone, ...f.kids.map(x => x.name)].some(t => (A.normKey ? A.normKey(t || '') : (t || '')).includes(k))); };
    const paint = () => {
      const withC = L.filter(f => f.code), act = withC.filter(f => f.active), used = withC.filter(f => f.activated), sib = L.filter(f => f.kids.length > 1), V2 = view();
      box.innerHTML = `<div class="pal-k" style="margin-bottom:10px"><div class="k"><b>${AR(L.length)}</b>عائلة</div><div class="k ${withC.length < L.length ? 'warn' : 'ok'}"><b>${AR(withC.length)}</b>لديها رمز</div><div class="k info"><b>${AR(sib.length)}</b>عائلة بأكثر من ابن</div><div class="k ${used.length ? 'ok' : ''}"><b>${AR(used.length)}</b>فعّلت حسابها</div><div class="k ${act.length < withC.length ? 'bad' : ''}"><b>${AR(withC.length - act.length)}</b>موقوف</div></div>
        ${last && last.nophone ? `<div class="fa-note">${AR(last.nophone)} طالب بلا رقم جوال ولي أمر صحيح — لن يظهروا هنا حتى يُضاف الرقم في بيانات الطلاب.</div>` : ''}
        <div class="scroll"><table class="tbl fa-tbl"><thead><tr><th>ولي الأمر</th><th>الأبناء</th><th>الرمز</th><th class="fa-hide-m">آخر دخول</th><th>الحالة</th><th></th></tr></thead><tbody>${V2.map(f => `<tr>
          <td style="text-align:start"><b>${esc(f.gname || 'ولي الأمر')}</b><div class="small muted" dir="ltr" style="text-align:end">${esc(showPh(f.phone))}</div></td>
          <td style="text-align:start"><div class="fa-kids">${f.kids.map(x => `<span>${esc(x.name)} <span class="muted">· ${esc(x.class || '')}</span>${x.linked ? ' <span title="مربوط يدوياً">🔗</span>' : ''}</span>`).join('')}${(f.hidden || []).length ? `<span class="muted" title="${esc(f.hidden.map(h => h.name).join('، '))}">+${AR(f.hidden.length)} مخفي</span>` : ''}</div></td>
          <td>${f.code ? `<code dir="ltr" style="font-size:15px;letter-spacing:2px">${esc(f.code)}</code>` : '<span class="small muted">—</span>'}</td>
          <td class="small fa-hide-m">${f.last ? esc(fmt(f.last)) + ` <span class="muted">(${AR(f.logins)})</span>` : '<span class="muted">لم يدخل</span>'}</td>
          <td>${!f.code ? '' : !f.active ? '<span class="pill st-returned">موقوف</span>' : f.activated ? '<span class="pill st-approved">مُفعّل</span>' : '<span class="pill st-draft">بانتظار التفعيل</span>'}</td>
          <td class="row" style="gap:4px;flex-wrap:wrap">${f.code ? `<button class="btn ghost sm" data-cp="${f.phone}">نسخ</button>${waNum(f.phone) ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/${waNum(f.phone)}?text=${encodeURIComponent(waText(f))}">واتساب</a>` : ''}<button class="btn ghost sm" data-tg="${f.phone}" data-v="${f.active ? 0 : 1}">${f.active ? 'إيقاف' : 'تفعيل'}</button>` : ''}<button class="btn ghost sm" data-rg="${f.phone}">${f.code ? 'رمز جديد' : 'إنشاء رمز'}</button><button class="btn ghost sm" data-mg="${f.phone}">إدارة</button></td></tr>`).join('') || `<tr><td colspan="6">${A.emptyBox(L.length ? 'لا نتائج للبحث' : 'لا توجد عائلات', L.length ? '' : 'أضف أرقام جوال أولياء الأمور في بيانات الطلاب.')}</td></tr>`}</tbody></table></div>`;
      const F = p => L.find(f => f.phone === p);
      $$('[data-mg]', box).forEach(b => b.onclick = () => manage(F(b.dataset.mg), load));
      $$('[data-cp]', box).forEach(b => b.onclick = () => { const f = F(b.dataset.cp); navigator.clipboard.writeText(waText(f)).then(() => A.toast('نُسخ', 'ok'), () => A.toast('تعذّر النسخ', 'err')); });
      $$('[data-tg]', box).forEach(b => b.onclick = () => A.run(b, async () => { await rpc('parent_code_toggle', { p_phone: b.dataset.tg, p_active: b.dataset.v === '1' }); load(); }));
      $$('[data-rg]', box).forEach(b => b.onclick = async () => { const f = F(b.dataset.rg); if (f.code && !(await A.confirmBox(`إنشاء رمز جديد لولي أمر «${esc(f.kids.map(x => x.name.split(/\s+/)[0]).join('، '))}»؟ يتوقف الرمز الحالي${f.activated ? '، وتُلغى كلمة المرور ويُخرج من كل الأجهزة حتى يفعّل من جديد' : ''}.`, 'رمز جديد'))) return; A.run(b, async () => { await rpc('parent_codes_gen', { p_section: null, p_phone: f.phone }); load(); A.toast('أُنشئ الرمز', 'ok'); }); });
    };
    const load = async () => { box.innerHTML = '<div class="spinner"></div>'; try { L = await rpc('parent_codes_list', { p_section: sec === 'all' ? null : sec }) || []; } catch (e) { box.innerHTML = A.emptyBox('تعذّر التحميل', esc(e.message)); return; } paint(); requests(); };
    const requests = async () => { const R0 = $('#faRq', B); let Q = []; try { Q = await rpc('family_requests', {}) || []; } catch (_) { Q = []; }
      R0.innerHTML = Q.length ? `<div class="fa-box" style="margin-bottom:10px;border-color:#F3D9A4;background:#FFF8E8"><h3>طلبات ربط من أولياء الأمور (${AR(Q.length)})</h3>${Q.map((x, i) => `<div class="row" style="gap:8px;justify-content:space-between;border-top:1px solid #F3D9A4;padding:8px 0"><div><b>${esc(x.name)}</b> <span class="small muted">· ${esc(x.class || '')} · جواله المسجّل ${esc(x.reg_phone || '—')}</span><div class="small">يطلبه: <span dir="ltr">${esc(showPh(x.phone))}</span>${x.note ? ' · ' + esc(x.note) : ''}</div></div><div class="row" style="gap:6px"><button class="btn ok sm" data-rqa="${i}">اعتماد</button><button class="btn ghost sm" data-rqr="${i}">رفض</button></div></div>`).join('')}</div>` : '';
      $$('[data-rqa],[data-rqr]', R0).forEach(b => b.onclick = () => A.run(b, async () => { const x = Q[+(b.dataset.rqa ?? b.dataset.rqr)]; await rpc('family_link', { p_phone: x.phone, p_student: x.student, p_kind: b.dataset.rqa != null ? 'add' : 'none', p_name: null }); A.toast(b.dataset.rqa != null ? 'اعتُمد الربط' : 'رُفض', 'ok'); load(); })); };
    $('#faAdd', B).onclick = () => manage(null, load);
    $('#faS', B).onchange = e => { sec = e.target.value; A.LS.set('fa_sec', sec); load(); };
    $('#faQ', B).oninput = e => { q = e.target.value.trim(); paint(); };
    $('#faGen', B).onclick = e => A.run(e.currentTarget, async () => { last = await rpc('parent_codes_gen', { p_section: sec === 'all' ? null : sec, p_phone: null }); A.toast(last.created ? `أُنشئ ${AR(last.created)} رمز` : 'كل العائلات لديها رموز', 'ok'); await load(); });
    $('#faPr', B).onclick = e => A.run(e.currentTarget, async () => { const l = view().filter(f => f.code && f.active); if (!l.length) throw new Error('لا توجد رموز نشطة — أنشئ الرموز أولاً'); await printParents(l); });
    $('#faX', B).onclick = () => { const l = view(); if (!l.length) return A.toast('لا بيانات', 'err'); xlsx([['أولياء الأمور', parentRows(l)]], 'رموز أولياء الأمور'); };
    load();
  }
  /* إدارة عائلة: ربط/إخفاء ابن، تغيير الجوال — أو عائلة جديدة بجوال آخر (f = null) */
  let ALLS = null;
  const allStudents = async () => ALLS || (ALLS = (await api.list('students', {}, { select: 'id,full_name,class_id,guardian_phone,active' })).filter(x => x.active !== false));
  async function manage(f, done) {
    const isNew = !f, C = {}; (S.allClasses || S.classes || []).forEach(c => C[c.id] = c.name);
    const m = A.modal(`<h3>${isNew ? 'إضافة ولي أمر بجوال آخر' : 'إدارة عائلة ' + esc(f.gname || '')}</h3>
      ${isNew ? `<p class="sub">لأم أو ولي ثانٍ، أو ابن مسجّل بجوال قديم: اكتب الجوال واختر الأبناء، ثم أنشئ له رمزاً. لا تتغير بيانات الطلاب.</p><label class="small">الجوال <input class="in" id="mgP" dir="ltr" inputmode="tel" placeholder="05xxxxxxxx"></label><label class="small">اسم ولي الأمر (اختياري) <input class="in" id="mgN"></label>`
        : `<div class="small muted" dir="ltr" style="text-align:end">${esc(showPh(f.phone))}</div>
      <div class="fa-box"><h3>الأبناء في هذا الحساب</h3>${f.kids.map(x => `<div class="row" style="justify-content:space-between;gap:8px;padding:4px 0"><span>${esc(x.name)} <span class="small muted">· ${esc(x.class || '')}</span>${x.linked ? ' <span class="pill">مربوط يدوياً</span>' : ''}</span><button class="btn ghost sm" data-un="${x.id}" data-k="${x.linked ? 'none' : 'hide'}">${x.linked ? 'إلغاء الربط' : 'إخفاء من الحساب'}</button></div>`).join('')}
        ${(f.hidden || []).map(x => `<div class="row" style="justify-content:space-between;gap:8px;padding:4px 0;opacity:.7"><span>${esc(x.name)} <span class="pill st-returned">مخفي</span></span><button class="btn ghost sm" data-un="${x.id}" data-k="none">إظهار</button></div>`).join('')}</div>`}
      <div class="fa-box"><h3>${isNew ? 'الأبناء' : 'ربط ابن آخر'}</h3><input class="in" id="mgQ" placeholder="ابحث باسم الطالب"><div class="fs-pick" id="mgL" style="max-height:220px;overflow:auto;margin-top:6px"></div></div>
      ${isNew ? '' : `<div class="fa-box"><h3>تغيير جوال العائلة</h3><p class="small muted" style="margin:0 0 6px">ينتقل الرمز والحساب وكلمة المرور والأبناء للرقم الجديد.</p><div class="row" style="gap:8px"><input class="in" id="mgNP" dir="ltr" inputmode="tel" placeholder="الرقم الجديد 05xxxxxxxx" style="flex:1;min-width:160px"><button class="btn" id="mgCh">تغيير</button></div><label class="row small" style="gap:6px;margin-top:6px"><input type="checkbox" id="mgUp"> تحديث «جوال ولي الأمر» في بيانات الطلاب أيضاً</label></div>`}
      ${isNew ? '<div class="row" style="margin-top:10px"><button class="btn ok" id="mgSave">حفظ وإنشاء رمز</button></div>' : ''}`, { cls: 'wide' });
    const el = m.el, picked = new Set();
    const paintL = async () => { const q = A.normKey($('#mgQ', el).value.trim()), have = new Set(isNew ? [] : f.kids.map(x => x.id)); const l = (await allStudents()).filter(x => !have.has(x.id) && (!q ? picked.has(x.id) : A.normKey(x.full_name).includes(q))).slice(0, 40);
      $('#mgL', el).innerHTML = l.map(x => `<label style="display:flex;gap:8px;padding:6px 8px;border-bottom:1px solid #EEF2F8;cursor:pointer"><input type="checkbox" value="${x.id}" ${picked.has(x.id) ? 'checked' : ''}><span>${esc(x.full_name)} <span class="small muted">· ${esc(C[x.class_id] || '')} · ${esc(x.guardian_phone || 'بلا جوال')}</span></span>${isNew ? '' : `<button class="btn ok sm" data-ad="${x.id}" style="margin-inline-start:auto">ربط</button>`}</label>`).join('') || `<div class="small muted" style="padding:8px">${q ? 'لا نتائج' : 'اكتب للبحث'}</div>`;
      $$('#mgL input', el).forEach(i => i.onchange = () => i.checked ? picked.add(i.value) : picked.delete(i.value));
      $$('[data-ad]', el).forEach(b => b.onclick = e => { e.preventDefault(); A.run(b, async () => { await rpc('family_link', { p_phone: f.phone, p_student: b.dataset.ad, p_kind: 'add', p_name: null }); A.toast('رُبط', 'ok'); m.close(); done && done(); }); }); };
    $('#mgQ', el).oninput = paintL; paintL();
    $$('[data-un]', el).forEach(b => b.onclick = () => A.run(b, async () => { await rpc('family_link', { p_phone: f.phone, p_student: b.dataset.un, p_kind: b.dataset.k, p_name: null }); A.toast('تم', 'ok'); m.close(); done && done(); }));
    if ($('#mgCh', el)) $('#mgCh', el).onclick = e => A.run(e.currentTarget, async () => { const np = $('#mgNP', el).value.trim(); if (!/^0?5\d{8}$/.test(np.replace(/\D/g, '').replace(/^966/, '0'))) throw new Error('اكتب رقم جوال سعودياً صحيحاً');
      const up = $('#mgUp', el).checked; if (!(await A.confirmBox(`تغيير جوال العائلة إلى ${esc(np)}؟${up ? ' وسيُحدَّث جوال ولي الأمر في بيانات أبنائها.' : ''}`, 'تغيير'))) return;
      const r = await rpc('family_change_phone', { p_old: f.phone, p_new: np, p_update_students: up }); if (r && r.error) throw new Error(r.error === 'EXISTS' ? 'هذا الرقم لديه حساب أو رمز بالفعل' : 'رقم غير صحيح'); A.toast('تم تغيير الجوال', 'ok'); m.close(); done && done(); });
    if ($('#mgSave', el)) $('#mgSave', el).onclick = e => A.run(e.currentTarget, async () => { const np = $('#mgP', el).value.trim(); if (!/^0?5\d{8}$/.test(np.replace(/\D/g, '').replace(/^966/, '0'))) throw new Error('اكتب رقم جوال سعودياً صحيحاً'); if (!picked.size) throw new Error('اختر ابناً واحداً على الأقل');
      for (const id of picked) { const r = await rpc('family_link', { p_phone: np, p_student: id, p_kind: 'add', p_name: $('#mgN', el).value.trim() || null }); if (r && r.error) throw new Error('رقم غير صحيح'); }
      await rpc('parent_codes_gen', { p_section: null, p_phone: np }); A.toast('أُضيف ولي الأمر وأُنشئ رمزه', 'ok'); m.close(); done && done(); });
  }
  const waText = f => `ولي أمر ${f.kids.map(x => x.name).join(' و')}،\nحسابك في بوابة أولياء أمور ${(S.school || {}).name || 'مدارس دينا'} جاهز لمتابعة ${f.kids.length > 1 ? 'أبنائك' : 'ابنك/ابنتك'}: الخطط، الواجبات والنتائج، الحضور والأعذار، التقارير، والتواصل مع المعلمين.\n\nللتفعيل افتح: ${pLink(f.code)}\nرقم جوالك: ${showPh(f.phone)}\nرمز التفعيل: ${f.code}\nثم اختر كلمة مرور خاصة بك (الرمز يُستخدم مرة واحدة).\nيُرجى عدم مشاركة الرمز مع أحد.`;
  const parentRows = l => l.map(f => ({ 'ولي الأمر': f.gname || '', 'الجوال': showPh(f.phone), 'الأبناء': f.kids.map(x => `${x.name} (${x.class || ''})`).join('، '), 'عدد الأبناء': f.kids.length, 'الرمز': f.code || '', 'الرابط': f.code ? pLink(f.code) : '', 'الحالة': !f.code ? 'بلا رمز' : !f.active ? 'موقوف' : f.activated ? 'مُفعّل' : 'بانتظار التفعيل', 'مرات الدخول': f.logins || 0 }));
  function xlsx(sheets, name) {
    if (!window.XLSX) return A.toast('مكتبة Excel غير محمّلة', 'err');
    const wb = XLSX.utils.book_new(), used = new Set();
    sheets.forEach(([n, rows]) => { if (!rows.length) return; let s = String(n).replace(/[\\/?*[\]:]/g, ' ').slice(0, 28) || 'ورقة', i = 2; while (used.has(s)) s = s.slice(0, 25) + ' ' + i++; used.add(s); const ws = XLSX.utils.json_to_sheet(rows); ws['!views'] = [{ RTL: true }]; ws['!cols'] = Object.keys(rows[0]).map(k => ({ wch: Math.min(48, Math.max(10, k.length + 2, ...rows.map(r => String(r[k] ?? '').length))) })); XLSX.utils.book_append_sheet(wb, ws, s); });
    if (!wb.SheetNames.length) return A.toast('لا بيانات للتصدير', 'err');
    XLSX.writeFile(wb, `${name}.xlsx`);
  }
  const CARD_CSS = `<style>.cards{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.sc{border:2px solid #082B5A;border-radius:14px;padding:10px 12px;display:flex;gap:10px;align-items:center;break-inside:avoid;page-break-inside:avoid}.sc .qr{width:92px;height:92px;flex:none}.sc .qr svg{width:100%;height:100%}.sc b{font-size:15px;display:block}.sc .cd{font-family:'Myriad Pro',monospace;font-size:19px;letter-spacing:3px;direction:ltr;color:#005499;font-weight:800}.sc small{display:block;color:#5b6b7d;font-size:11.5px}.sc .kd{font-size:12.5px;color:#082B5A}.grp{break-before:page;page-break-before:always}.grp:first-child{break-before:auto;page-break-before:auto}.grp h3{margin:0 0 8px;color:#082B5A}</style>`;
  async function printParents(l) {
    const q = await loadQR(), nm = (S.school || {}).name || 'مدارس دينا العالمية';
    A.printDoc('بطاقات تفعيل حسابات أولياء الأمور', `${nm} · البوابة: ${pHome()}`, CARD_CSS + `<div class="cards">${l.map(f => `<div class="sc"><div class="qr">${qrSvg(q, pLink(f.code))}</div><div><small>${esc(nm)} — بوابة ولي الأمر</small><b>${esc(f.gname || 'ولي الأمر')}</b><div class="kd">${f.kids.map(x => esc(x.name.split(/\s+/).slice(0, 2).join(' ')) + ' · ' + esc(x.class || '')).join('<br>')}</div><small>رمز التفعيل (مرة واحدة):</small><div class="cd">${esc(f.code)}</div><small>امسح الرمز، اكتب جوالك ${esc(showPh(f.phone))} والرمز، ثم اختر كلمة مرورك — لا تشارك الرمز</small></div></div>`).join('')}</div>`, false);
  }

  /* ---------- التصدير الشامل ---------- */
  async function exportAll(B) {
    const secs = S.sections || [];
    B.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">التصدير الشامل لبيانات الدخول</h2><p class="sub" style="margin:2px 0 0">ملف واحد لكل المدرسة أو قسم: رموز الطلاب ورموز أولياء الأمور، أو بطاقات جاهزة للطباعة مقسّمة حسب الفصل.</p></div></div>
      <div class="fa-note"><b>تنبيه أمني:</b> هذه الملفات فيها رموز دخول فعلية. احفظها في مكان آمن ولا ترسلها في مجموعات عامة؛ وإن تسرّب ملف فأعد توليد الرموز من التبويبين السابقين فيتوقف القديم فوراً.</div>
      <div class="fa-grid">
        <div class="fa-box"><h3>النطاق والمحتوى</h3>
          <label class="small">القسم <select class="in" id="xS"><option value="all">كل الأقسام</option>${secs.map(s => `<option value="${s.id}" ${s.id === S.sectionId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
          <label class="fa-opt"><input type="checkbox" id="xStu" checked><span><b>رموز الطلاب</b><div class="small muted">رمز ٨ خانات لكل طالب.</div></span></label>
          <label class="fa-opt"><input type="checkbox" id="xPar" checked><span><b>رموز أولياء الأمور</b><div class="small muted">رمز ١٠ خانات لكل جوال، مع أسماء الأبناء.</div></span></label>
          <label class="fa-opt"><input type="checkbox" id="xCls"><span><b>ورقة مستقلة لكل فصل</b><div class="small muted">في Excel، لتوزيعها على رواد الفصول.</div></span></label>
          <label class="fa-opt"><input type="checkbox" id="xGen" checked><span><b>إنشاء الرموز الناقصة أولاً</b><div class="small muted">لا تتغير الرموز الموجودة.</div></span></label></div>
        <div class="fa-box"><h3>التصدير</h3><div id="xSum" class="small muted" style="min-height:44px">اختر ثم صدّر.</div>
          <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn ok" id="xX">تنزيل Excel</button><button class="btn ghost" id="xP">${A.I.print || ''} طباعة البطاقات / PDF</button></div>
          <p class="small muted" style="margin:10px 0 0">للحفظ PDF اختر «حفظ بتنسيق PDF» في نافذة الطباعة.</p></div></div></div>`;
    const sum = $('#xSum', B);
    const collect = async () => {
      const sec = $('#xS', B).value, ss = sec === 'all' ? secs : secs.filter(s => s.id === sec), wantS = $('#xStu', B).checked, wantP = $('#xPar', B).checked, gen = $('#xGen', B).checked;
      if (!wantS && !wantP) throw new Error('اختر رموز الطلاب أو أولياء الأمور');
      const out = { classes: [], fams: [] }; let made = 0;
      if (wantS) for (const s of ss) {
        let cls = []; try { cls = (await (api.classes ? api.classes(s.id) : api.list('classes', { section_id: s.id }, { order: 'sort' }))) || []; } catch (_) { cls = s.id === S.sectionId ? S.classes || [] : []; }
        cls = cls.filter(c => c.active !== false); if (A.cmpCls) cls.sort(A.cmpCls);
        for (const c of cls) { sum.textContent = `جارٍ تجهيز ${c.name}…`;
          if (gen) { const r = await api.rpc('student_codes_gen', { p_class: c.id, p_student: null }).catch(e => { throw new Error(ERR(e.message)); }); made += (r && r.created) || 0; }
          const l = await api.rpc('student_codes_list', { p_class: c.id }).catch(e => { throw new Error(ERR(e.message)); });
          out.classes.push({ c, s, l: (l || []) }); }
      }
      if (wantP) { sum.textContent = 'جارٍ تجهيز أولياء الأمور…';
        if (gen) { const r = await rpc('parent_codes_gen', { p_section: sec === 'all' ? null : sec, p_phone: null }); made += (r && r.created) || 0; out.nophone = r && r.nophone; }
        out.fams = await rpc('parent_codes_list', { p_section: sec === 'all' ? null : sec }) || []; }
      const nS = out.classes.reduce((a, x) => a + x.l.length, 0), cS = out.classes.reduce((a, x) => a + x.l.filter(y => y.code).length, 0);
      sum.innerHTML = `${wantS ? `<b>${AR(cS)}</b> من ${AR(nS)} طالب لديهم رمز في ${AR(out.classes.length)} فصل.<br>` : ''}${wantP ? `<b>${AR(out.fams.filter(f => f.code).length)}</b> من ${AR(out.fams.length)} عائلة لديها رمز.${out.nophone ? ` (${AR(out.nophone)} طالب بلا جوال)` : ''}<br>` : ''}${made ? `أُنشئ الآن ${AR(made)} رمز جديد.` : ''}`;
      return out;
    };
    $('#xX', B).onclick = e => A.run(e.currentTarget, async () => {
      const o = await collect(), per = $('#xCls', B).checked, sheets = [];
      const sRow = (x, c, s) => ({ 'القسم': s.name, 'الفصل': c.name, 'الطالب': x.name, 'رقم الطالب': x.no || '', 'الرمز': x.code || '', 'الرابط': x.code ? sLink(x.code) : '', 'جوال ولي الأمر': x.phone || '', 'الحالة': !x.code ? 'بلا رمز' : x.active ? 'نشط' : 'موقوف' });
      if (o.classes.length) sheets.push(['الطلاب', o.classes.flatMap(({ c, s, l }) => l.map(x => sRow(x, c, s)))]);
      if (o.fams.length) sheets.push(['أولياء الأمور', parentRows(o.fams)]);
      if (per) o.classes.forEach(({ c, s, l }) => sheets.push([c.name, l.map(x => sRow(x, c, s))]));
      xlsx(sheets, `بيانات الدخول - ${(S.school || {}).name || ''} - ${new Date().toISOString().slice(0, 10)}`);
    });
    $('#xP', B).onclick = e => A.run(e.currentTarget, async () => {
      const o = await collect(), q = await loadQR(), nm = (S.school || {}).name || 'مدارس دينا العالمية', dom = esc(base().replace(/^https?:\/\//, '')) + 'me.html';
      const grp = o.classes.map(({ c, l }) => { const a = l.filter(x => x.code && x.active); return a.length ? `<div class="grp"><h3>${esc(c.name)} — ${AR(a.length)} طالب</h3><div class="cards">${a.map(x => `<div class="sc"><div class="qr">${qrSvg(q, sLink(x.code))}</div><div><small>${esc(nm)} — حسابي</small><b>${esc(x.name)}</b><small>${esc(c.name)}</small><div class="cd">${esc(x.code)}</div><small>امسح الرمز أو ادخل: ${dom}</small></div></div>`).join('')}</div></div>` : ''; }).join('');
      const pf = o.fams.filter(f => f.code && f.active);
      const pg = pf.length ? `<div class="grp"><h3>أولياء الأمور — ${AR(pf.length)} عائلة</h3><div class="cards">${pf.map(f => `<div class="sc"><div class="qr">${qrSvg(q, pLink(f.code))}</div><div><small>${esc(nm)} — بوابة ولي الأمر</small><b>${esc(f.gname || 'ولي الأمر')}</b><div class="kd">${f.kids.map(x => esc(x.name.split(/\s+/).slice(0, 2).join(' ')) + ' · ' + esc(x.class || '')).join('<br>')}</div><small>رمز التفعيل (مرة واحدة):</small><div class="cd">${esc(f.code)}</div><small>امسح الرمز، اكتب جوالك ${esc(showPh(f.phone))} والرمز، ثم اختر كلمة مرورك</small></div></div>`).join('')}</div></div>` : '';
      if (!grp && !pg) throw new Error('لا توجد رموز نشطة للطباعة');
      A.printDoc('بطاقات الدخول', `${nm} · ${new Date().toLocaleDateString('ar-SA')}`, CARD_CSS + grp + pg, false);
    });
  }

  /* ---------- ما يراه ولي الأمر ---------- */
  function settings(B) {
    const c = cfgOf();
    const chk = (k, t, d) => `<label class="fa-opt"><input type="checkbox" data-k="${k}" ${c[k] === true || c[k] === 'true' ? 'checked' : ''}><span><b>${t}</b>${d ? `<div class="small muted">${d}</div>` : ''}</span></label>`;
    B.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">ما يراه ولي الأمر</h2><p class="sub" style="margin:2px 0 0">تحكّم كامل فيما يظهر في «بوابة ولي الأمر». تُطبَّق فوراً وتفرضها قاعدة البيانات (لا يصل ولي الأمر لما أخفيته).</p></div><a class="btn ghost" href="family.html" target="_blank" rel="noopener">فتح البوابة</a></div>
      <div class="fa-grid">
        <div class="fa-box"><h3>المتابعة الدراسية</h3>
          <div class="fa-opt" style="cursor:default"><input type="checkbox" checked disabled><span><b>خطة الأسبوع والاختبارات المفتوحة والمصادر</b><div class="small muted">تظهر دائماً (نفس ما يراه الطالب).</div></span></div>
          ${chk('res', 'نتائج الاختبارات والواجبات الإلكترونية')}${chk('paper', 'نتائج الاختبارات الورقية')}${chk('noor', 'نتائج نور المستوردة', 'تظهر كل الاستيرادات — فعّلها بعد اعتماد النتائج.')}</div>
        <div class="fa-box"><h3>الحضور والسلوك</h3>
          ${chk('att', 'الحضور والغياب والتأخر', 'اليومي والحصص — آخر ١٢٠ يوماً.')}${chk('excuse', 'تقديم الأعذار بمرفق', 'يراجعها المالك وصلاحية الحضور والإرشاد؛ القبول يحوّل الغياب إلى «مستأذن».')}
          <label class="small" for="cB" style="display:block;margin-top:8px"><b>السلوك</b></label>
          <select class="in" id="cB"><option value="none" ${c.beh === 'none' ? 'selected' : ''}>لا يظهر</option><option value="positive" ${c.beh === 'positive' ? 'selected' : ''}>الإيجابي فقط</option><option value="all" ${c.beh === 'all' ? 'selected' : ''}>الإيجابي والسلبي</option></select>
          <p class="small muted" style="margin:6px 0 0">لا تظهر ملاحظات المرشد ولا تفاصيل الإحالات أبداً.</p></div>
        <div class="fa-box"><h3>التقارير</h3>
          ${chk('reports', 'تقارير المعلمين والإدارة', 'ما يُرسل من صفحة «أولياء الأمور».')}${chk('approve', 'تحتاج تقارير المعلمين وتدريباتهم اعتماداً قبل الظهور', 'تقاريرك وتقارير صلاحية الحضور/الإشراف/الإرشاد تُنشر مباشرة.')}${chk('auto', 'التقرير الدوري التلقائي', 'أسبوعي وشهري ومنذ بداية الفصل، يولّده ولي الأمر متى شاء.')}</div>
        <div class="fa-box"><h3>التدريب والتواصل</h3>
          ${chk('selfLink', 'طلب ربط ابن من ولي الأمر', 'يطلب ربط ابن مسجّل بجوال آخر برمز دخول الطالب ورقمه (أو آخر ٤ من الهوية)، ويُعتمد من تبويب «أولياء الأمور».')}${chk('practice', 'التدريبات والكراسات والاختبارات التجريبية', 'ما ينشره المعلمون من بنوك الأسئلة.')}${chk('sharedQ', 'التدريب الحر من الأسئلة المشتركة', 'أسئلة عشوائية من الأسئلة التي جعلها المعلمون «مشتركة» لصف الابن.')}
          <label class="small" for="cM" style="display:block;margin-top:8px"><b>المراسلة الخاصة</b></label>
          <select class="in" id="cM"><option value="all" ${c.msg === 'all' ? 'selected' : ''}>المعلمون والإدارة</option><option value="teachers" ${c.msg === 'teachers' ? 'selected' : ''}>معلمو الابن فقط</option><option value="admin" ${c.msg === 'admin' ? 'selected' : ''}>الإدارة والإرشاد فقط</option><option value="off" ${c.msg === 'off' ? 'selected' : ''}>متوقفة</option></select>
          <p class="small muted" style="margin:6px 0 0">الرسائل خاصة بين ولي الأمر والموظف فقط — لا يقرؤها غيرهما.</p></div></div>
      <div style="margin-top:12px"><button class="btn ok" id="cS">حفظ</button></div></div>`;
    $('#cS', B).onclick = e => A.run(e.currentTarget, async () => {
      const portal = { ...cfgOf(), beh: $('#cB', B).value, msg: $('#cM', B).value };
      $$('[data-k]', B).forEach(i => portal[i.dataset.k] = i.checked);
      const settings = { ...(S.school.settings || {}), portal };
      const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; A.toast('حُفظ', 'ok');
    });
  }
})();
