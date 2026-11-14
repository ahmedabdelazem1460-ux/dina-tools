/* منصة دينا — الإشعارات: الجرس، إذن ظهور الإشعارات على الجهاز، التنبيهات العامة والمجدولة،
   تفضيلات كل موظف وتحكم المالك، ومركز الإشعارات V.notify، وتثبيت المنصة كتطبيق (PWA) */
(function () {
  const A = window.APP, V = window.VIEWS;
  const { api, S, $, $$, esc, AR } = A;

  const KINDS = {
    notice: ['تنبيه عام', 'ما تصدره الإدارة للجميع أو لفئة'],
    reminder: ['تذكير', 'تذكير بالخطط أو المهام'],
    message: ['الرسائل', 'رسالة جديدة في صندوقك'],
    form_assigned: ['نموذج جديد', 'تكليفك بنموذج أو استمارة'],
    form_sign: ['طلب توقيع', 'طلب توقيعك على نموذج'],
    form_submitted: ['إرسال نموذج', 'إرسال نموذج كلّفت به للاعتماد'],
    form_returned: ['إعادة نموذج', 'إعادة نموذجك مع ملاحظات'],
    form_approved: ['اعتماد نموذج', 'اعتماد نموذجك'],
    form_done: ['اكتمال عمل', 'اكتمال تعبئة وتوقيع الجميع على نموذج'],
    standby: ['حصص الانتظار', 'تكليفك بحصة انتظار'],
  };
  A.NOTIF_KINDS = KINDS;
  const ICO = {
    bell: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
    gear: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/></svg>',
    phone: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/></svg>',
  };
  // الميزات الجديدة لا تظهر لغير المالك إلا بعد أن يفعّلها المالك من «تخصيص صفحة المعلم» (schools.settings.tfeat)
  // القيمة: true = للجميع، 'some' = لمن في settings.tfeatTo[k] فقط، وغير ذلك = مخفية
  A.tfeat = k => { if (!S.me) return false; if (!S.realMe && S.me.is_owner) return true; const st = (S.school || {}).settings || {}, v = (st.tfeat || {})[k];
    return v === true || (v === 'some' && Array.isArray((st.tfeatTo || {})[k]) && st.tfeatTo[k].includes(S.me.id)); };
  const canIssue = () => !!(S.me && !S.realMe && (S.me.is_owner || (A.hasModule && A.hasModule('supervision'))));
  const myId = () => S.me && S.me.id;
  const nowIso = () => new Date().toISOString();
  let LIST = [], unsub = null, tick = null;
  const visible = () => LIST.filter(n => n.show_at <= nowIso());
  const unread = () => visible().filter(n => !n.read_at);
  const ago = s => {
    const m = Math.round((Date.now() - new Date(s)) / 6e4);
    if (m < 1) return 'الآن'; if (m < 60) return 'منذ ' + AR(m) + ' د'; const h = Math.round(m / 60); if (h < 24) return 'منذ ' + AR(h) + ' س';
    return A.fmtDT ? A.fmtDT(s) : new Date(s).toLocaleDateString('ar-SA');
  };

  // ---------------- التنسيق ----------------
  if (!document.getElementById('notifcss')) {
    const st = document.createElement('style'); st.id = 'notifcss';
    st.textContent = `
.nf-btn{position:relative}
.nf-wrap{display:grid;gap:10px}
.nf-perm{display:flex;gap:10px;align-items:center;flex-wrap:wrap;background:linear-gradient(135deg,#EAF6FB,#F3FAEC);border:1px solid #CFE7F2;border-radius:14px;padding:10px 12px}
.nf-perm .grow{min-width:180px}
.nf-list{display:grid;gap:6px;max-height:min(60vh,520px);overflow:auto;padding:2px}
.nf-it{display:flex;gap:10px;align-items:flex-start;text-align:right;width:100%;background:#fff;border:1px solid var(--border);border-radius:14px;padding:10px 12px;cursor:pointer;font:inherit;color:inherit;box-shadow:0 1px 0 rgba(8,43,90,.04)}
.nf-it:hover{border-color:#3AB1DB}
.nf-it:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}
.nf-it.un{background:#F2F8FD;border-color:#BFD9EE}
.nf-it .nf-dot{width:10px;height:10px;border-radius:50%;margin-top:6px;flex:none;background:transparent}
.nf-it.un .nf-dot{background:#005499}
.nf-it b{display:block;color:#082B5A}
.nf-it .nf-b{white-space:pre-line;color:var(--muted);font-size:13px;margin-top:2px;overflow-wrap:anywhere}
.nf-it .nf-m{font-size:11.5px;color:var(--faint,#8a97a8);margin-top:4px}
.nf-k{display:inline-block;font-size:11px;font-weight:800;border-radius:20px;padding:1px 8px;background:#E8F1F9;color:#005499;margin-inline-start:6px;vertical-align:middle}
.nf-k.k-form_done{background:#E5F3EA;color:#2E8B57}.nf-k.k-notice{background:#082B5A;color:#fff}.nf-k.k-reminder{background:#FFF3DC;color:#8a5a00}
.nf-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.nf-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr))}
.nf-kinds{display:grid;gap:6px}
.nf-kinds label{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border:1px solid var(--border);border-radius:12px;background:#fff}
.nf-kinds label small{display:block;color:var(--muted)}
.nf-kinds label.lock{opacity:.6}
.nf-sent{display:grid;gap:8px}
.nf-sent .row-s{display:flex;gap:10px;align-items:center;flex-wrap:wrap;border:1px solid var(--border);border-radius:12px;padding:8px 10px;background:#fff}
.nf-meter{height:6px;border-radius:6px;background:#E6EDF4;overflow:hidden;min-width:90px;flex:1}
.nf-meter i{display:block;height:100%;background:linear-gradient(90deg,#2E8B57,#BADF93)}
.nf-rc{display:grid;gap:4px;max-height:220px;overflow:auto;border:1px solid var(--border);border-radius:12px;padding:6px;background:#fff}
.nf-rc label{display:flex;gap:8px;align-items:center;padding:3px 6px;border-radius:8px}
.nf-rc label:hover{background:#F2F8FD}
.nf-toastpush{position:fixed;inset-inline-start:16px;bottom:16px;z-index:9999;max-width:min(380px,calc(100vw - 32px));background:#082B5A;color:#fff;border-radius:16px;padding:12px 14px;box-shadow:0 12px 30px rgba(8,43,90,.35);display:flex;gap:10px;align-items:flex-start;cursor:pointer}
.nf-toastpush b{display:block}
.nf-toastpush span{font-size:13px;opacity:.9}
@media (prefers-reduced-motion:no-preference){.nf-toastpush{animation:nfIn .35s ease}@keyframes nfIn{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}}
`;
    document.head.appendChild(st);
  }

  // ---------------- البيانات ----------------
  async function load() {
    if (!myId()) return;
    try { LIST = (await api.list('notifications', { staff_id: myId() }, { order: 'show_at', desc: true })) || []; } catch (_) { LIST = []; }
    if (api.demo && !LIST.length && !load._seeded) { // أمثلة لوضع التجربة فقط
      load._seeded = 1; const t = m => new Date(Date.now() - m * 6e4).toISOString();
      await api.ins('notifications', [
        { id: 'dn1-' + myId(), school_id: S.school.id, staff_id: myId(), kind: 'form_done', title: 'اكتمل: نموذج تبادل الزيارات', body: 'أنجز جميع المكلّفين (١٢) النموذج واكتملت التوقيعات.', link: '#/forms', show_at: t(3), created_at: t(3), read_at: null },
        { id: 'dn2-' + myId(), school_id: S.school.id, staff_id: myId(), kind: 'standby', title: 'حصة انتظار', body: 'الحصة ٣ — الأول متوسط أ (بدلاً من أ. خالد)', link: '#/standby', show_at: t(40), created_at: t(40), read_at: null },
        { id: 'dn3-' + myId(), school_id: S.school.id, staff_id: myId(), kind: 'notice', title: 'اجتماع المعلمين', body: 'يُعقد اجتماع يوم الأحد الساعة ١٢:٣٠ في قاعة الاجتماعات.', link: '', show_at: t(600), created_at: t(600), read_at: t(500) },
      ]);
      LIST = (await api.list('notifications', { staff_id: myId() }, { order: 'show_at', desc: true })) || [];
    }
    if (LIST.length > 300) LIST = LIST.slice(0, 300);
    badge(); deliverDue(true);
  }
  function badge() {
    const b = $('#notifN'); if (!b) return; const n = unread().length;
    b.textContent = n > 99 ? '+٩٩' : AR(n); b.classList.toggle('hidden', !n);
    const btn = $('#notifBtn'); if (btn) btn.setAttribute('aria-label', n ? `الإشعارات — ${AR(n)} غير مقروء` : 'الإشعارات');
    if (navigator.setAppBadge) { try { n ? navigator.setAppBadge(n) : navigator.clearAppBadge(); } catch (_) { } }
  }
  async function markRead(ids) {
    ids = ids.filter(id => { const n = LIST.find(x => x.id === id); return n && !n.read_at; }); if (!ids.length || S.realMe) return;
    const t = nowIso(); ids.forEach(id => { const n = LIST.find(x => x.id === id); if (n) n.read_at = t; }); badge();
    try { if (api.demo) ids.forEach(id => api.upd('notifications', id, { read_at: t })); else for (const id of ids) await api.upd('notifications', id, { read_at: t }); } catch (_) { }
  }
  A.notifMarkRead = markRead;

  // ---------------- الإشعار على الجهاز ----------------
  const LSK = 'nf_shown';
  const shownSet = () => { let a = []; try { a = JSON.parse(A.LS.get(LSK) || '[]'); } catch (_) { } return new Set(a.slice(-400)); };
  function remember(id) { const s = shownSet(); s.add(id); A.LS.set(LSK, JSON.stringify([...s])); }
  const permOK = () => 'Notification' in window && Notification.permission === 'granted';
  async function osNotify(n) {
    if (!permOK() || S.realMe) return false;
    const opts = { body: n.body || '', icon: 'assets/icon-192.png', badge: 'assets/icon-192.png', tag: 'dina-' + n.id, dir: 'rtl', lang: 'ar', data: { link: n.link || '', id: n.id } };
    try { const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration(); if (reg) { await reg.showNotification(n.title || 'منصة دينا', opts); return true; } } catch (_) { }
    try { const x = new Notification(n.title || 'منصة دينا', opts); x.onclick = () => { window.focus(); openItem(n); x.close(); }; return true; } catch (_) { return false; }
  }
  function inPage(n) {
    const old = $('.nf-toastpush:not(#nfSoft)'); if (old) old.remove();
    const d = document.createElement('div'); d.className = 'nf-toastpush'; d.setAttribute('role', 'status'); d.tabIndex = 0;
    d.innerHTML = `${ICO.bell}<div><b>${esc(n.title)}</b><span>${esc((n.body || '').slice(0, 140))}</span></div>`;
    d.onclick = () => { d.remove(); openItem(n); }; d.onkeydown = e => { if (e.key === 'Enter') d.click(); if (e.key === 'Escape') d.remove(); };
    document.body.appendChild(d); setTimeout(() => d.remove(), 7000);
  }
  // يعرض ما حان وقته ولم يُعرض بعد (التنبيهات المجدولة أيضاً)
  function deliverDue(initial) {
    const s = shownSet(); const due = unread().filter(n => !s.has(n.id));
    if (initial) { // عند الدخول: لا نُغرق المستخدم بالقديم — نعرض ما وصل في آخر ساعتين فقط
      due.filter(n => Date.now() - new Date(n.show_at) > 2 * 36e5).forEach(n => remember(n.id));
    }
    due.filter(n => !shownSet().has(n.id)).slice(0, 3).forEach(n => { remember(n.id); if (document.hidden) osNotify(n); else { inPage(n); if (permOK() && n.kind !== 'message') osNotify(n); } });
    badge();
  }

  function openItem(n) {
    markRead([n.id]); const m = $('.ovl.nf-ovl'); if (m) m.remove();
    const l = n.link || '';
    if (l.startsWith('#msg:')) { if (A.inbox) A.inbox(l.slice(5) || undefined); return; }
    if (l.startsWith('#/')) { if (location.hash === l.split('?')[0]) A.route(); else location.hash = l.split('?')[0]; return; }
    if (/^https?:\/\//.test(l)) { window.open(l, '_blank', 'noopener'); return; }
    if (!l) A.modal(`<h3>${esc(n.title)}</h3><p style="white-space:pre-line">${esc(n.body || '')}</p><p class="small muted">${esc(ago(n.show_at))}${n.created_by ? ' · ' + esc(A.personName(n.created_by) || '') : ''}</p>`);
  }

  // ---------------- إذن الإشعارات والتثبيت كتطبيق ----------------
  let installEv = null;
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEv = e; });
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  async function askPerm() {
    if (!('Notification' in window)) { A.toast(isIOS() ? 'على الآيفون: ثبّت المنصة على الشاشة الرئيسية أولاً ثم فعّل الإشعارات من داخلها' : 'هذا المتصفح لا يدعم الإشعارات', 'err'); return false; }
    const r = await Notification.requestPermission();
    if (r === 'granted') { A.toast('تم تفعيل الإشعارات على هذا الجهاز', 'ok'); osNotify({ id: 'test', title: 'منصة دينا', body: 'ستصلك التنبيهات هنا.', link: '' }); return true; }
    A.toast(r === 'denied' ? 'الإشعارات محظورة — فعّلها من إعدادات المتصفح (رمز القفل بجانب العنوان)' : 'لم يُمنح الإذن', 'err'); return false;
  }
  function permBox() {
    const has = 'Notification' in window; const p = has ? Notification.permission : 'na';
    const showInstall = !isStandalone() && (installEv || isIOS());
    if (p === 'granted' && !showInstall) return '';
    return `<div class="nf-perm" id="nfPerm">${ICO.bell}<div class="grow"><b>${p === 'granted' ? 'ثبّت المنصة كتطبيق' : 'فعّل الإشعارات على هذا الجهاز'}</b><div class="small muted">${p === 'denied' ? 'الإشعارات محظورة في المتصفح — افتح إعدادات الموقع (رمز القفل) واسمح بالإشعارات.' : p === 'granted' ? 'أيقونة على الشاشة الرئيسية وفتح أسرع.' : 'لتصلك التنبيهات المهمة حتى لو كانت المنصة في الخلفية.'}</div></div>
      ${p === 'default' ? `<button class="btn sm" id="nfAsk">تفعيل</button>` : ''}${showInstall ? `<button class="btn ghost sm" id="nfInst">${ICO.phone} تثبيت كتطبيق</button>` : ''}</div>`;
  }
  function bindPerm(root, after) {
    const a = root.querySelector('#nfAsk'); if (a) a.onclick = async () => { await askPerm(); after && after(); };
    const i = root.querySelector('#nfInst'); if (i) i.onclick = async () => {
      if (installEv) { installEv.prompt(); const r = await installEv.userChoice.catch(() => ({})); installEv = null; if (r.outcome === 'accepted') A.toast('ثُبّتت المنصة كتطبيق', 'ok'); after && after(); }
      else A.modal(`<h3>تثبيت المنصة على الآيفون</h3><ol style="line-height:2"><li>افتح المنصة في متصفح <b>Safari</b>.</li><li>اضغط زر <b>المشاركة</b> (المربع والسهم).</li><li>اختر <b>«إضافة إلى الشاشة الرئيسية»</b>.</li><li>افتح المنصة من الأيقونة الجديدة ثم فعّل الإشعارات من الجرس.</li></ol>`);
    };
  }
  // شريط لطيف مرة واحدة بعد الدخول
  function softPrompt() {
    if (S.realMe || !A.tfeat('notif') || !('Notification' in window) || Notification.permission !== 'default' || A.LS.get('nf_soft') || $('#nfSoft')) return;
    const d = document.createElement('div'); d.id = 'nfSoft'; d.className = 'nf-toastpush'; d.style.cursor = 'default'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'تفعيل الإشعارات');
    d.innerHTML = `${ICO.bell}<div class="grow"><b>هل تريد تفعيل إشعارات المنصة؟</b><span>تصلك النماذج المطلوبة وحصص الانتظار والتنبيهات فور صدورها.</span><div class="row" style="gap:6px;margin-top:8px"><button class="btn sky sm" id="nfSY">تفعيل</button><button class="btn ghost sm" id="nfSN" style="color:#fff;border-color:rgba(255,255,255,.4)">لاحقاً</button></div></div>`;
    document.body.appendChild(d);
    d.querySelector('#nfSY').onclick = async () => { d.remove(); A.LS.set('nf_soft', 1); await askPerm(); };
    d.querySelector('#nfSN').onclick = () => { d.remove(); A.LS.set('nf_soft', 1); };
  }

  // ---------------- تطبيق الجوال (أندرويد وآيفون) ----------------
  function appDialog() {
    const url = location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html?src=app';
    let qr = ''; try { const q = window.qrcode(0, 'M'); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (_) { }
    const and = /android/i.test(navigator.userAgent), ios = isIOS();
    const m = A.modal(`<h3>تطبيق منصة دينا على الجوال</h3><p class="sub">ثبّت المنصة على الشاشة الرئيسية لتعمل كتطبيق مستقل: أيقونة دينا، فتح بملء الشاشة، وإشعارات.</p>
      <div class="nf-grid" style="align-items:start">
        <div class="card" style="margin:0"><h3 style="margin-top:0">أندرويد</h3><ol style="line-height:1.9;margin:0;padding-inline-start:18px"><li>افتح المنصة في <b>Chrome</b>.</li><li>اضغط <b>«تثبيت»</b> بالأسفل، أو القائمة ⋮ ← <b>«تثبيت التطبيق»</b>.</li><li>افتح «منصة دينا» من الشاشة الرئيسية وفعّل الإشعارات.</li></ol>${installEv ? `<button class="btn sm" id="apInst" style="margin-top:10px">${ICO.phone} تثبيت الآن</button>` : ''}</div>
        <div class="card" style="margin:0"><h3 style="margin-top:0">آيفون وآيباد</h3><ol style="line-height:1.9;margin:0;padding-inline-start:18px"><li>افتح المنصة في <b>Safari</b>.</li><li>اضغط زر <b>المشاركة</b> (المربع والسهم).</li><li>اختر <b>«إضافة إلى الشاشة الرئيسية»</b>.</li><li>افتح التطبيق من الأيقونة وفعّل الإشعارات من الجرس.</li></ol></div>
        <div class="card" style="margin:0;text-align:center"><h3 style="margin-top:0">من جهاز آخر</h3><div style="width:170px;margin:0 auto">${qr}</div><p class="small muted" style="margin:6px 0 0">امسح الرمز بكاميرا الجوال لفتح المنصة ثم ثبّتها.</p><button class="btn ghost sm" id="apCopy">نسخ الرابط</button></div>
      </div>${isStandalone() ? '<div class="notice ok" style="margin-top:12px">أنت تستخدم المنصة كتطبيق مثبّت على هذا الجهاز.</div>' : (and || ios ? '' : '')}`, { cls: 'wide' });
    const bi = m.el.querySelector('#apInst'); if (bi) bi.onclick = async () => { installEv.prompt(); await installEv.userChoice.catch(() => { }); installEv = null; m.close(); };
    m.el.querySelector('#apCopy').onclick = async () => { try { await navigator.clipboard.writeText(url); A.toast('نُسخ الرابط', 'ok'); } catch (_) { A.toast(url); } };
  }
  A.appDialog = appDialog;
  A.notifPanel = () => panel();
  document.addEventListener('click', e => {
    if (!e.target.closest('#ub')) return;
    setTimeout(() => { const m = $('.menu'); if (!m || !A.tfeat('app') || m.querySelector('[data-a="app"]')) return; const b = document.createElement('button'); b.dataset.a = 'app'; b.innerHTML = `${ICO.phone} تطبيق الجوال (أندرويد وآيفون)`; b.style.display = 'flex'; b.style.gap = '8px'; b.style.alignItems = 'center'; b.onclick = () => { m.remove(); appDialog(); }; const lang = m.querySelector('[data-a="lang"]'); lang ? lang.before(b) : m.appendChild(b); }, 0);
  }, true);

  // ---------------- لوحة الإشعارات ----------------
  function panel() {
    let only = false;
    const m = A.modal(`<div class="nf-wrap"><div class="nf-head"><h3 style="margin:0" class="grow">الإشعارات</h3>
      ${canIssue() ? `<button class="btn sm" id="nfIssue">${ICO.send} إصدار تنبيه</button>` : ''}
      <button class="btn ghost sm" id="nfPrefs">${ICO.gear} الإعدادات</button></div>
      <div id="nfPB">${permBox()}</div>
      <div class="chip-filter" style="margin:0"><button type="button" data-f="all" class="on">الكل</button><button type="button" data-f="un">غير المقروء</button><button type="button" id="nfAll">تحديد الكل كمقروء</button></div>
      <div class="nf-list" id="nfL" role="list"></div></div>`, { cls: 'wide' });
    m.el.closest('.ovl') && m.el.closest('.ovl').classList.add('nf-ovl');
    const draw = () => {
      const l = (only ? unread() : visible()).slice(0, 150);
      m.el.querySelector('#nfL').innerHTML = l.length ? l.map(n => `<button class="nf-it ${n.read_at ? '' : 'un'}" data-id="${n.id}" role="listitem"><span class="nf-dot"></span><div class="grow"><b>${esc(n.title)}<span class="nf-k k-${esc(n.kind)}">${esc((KINDS[n.kind] || [n.kind])[0])}</span></b>${n.body ? `<div class="nf-b">${esc(n.body.slice(0, 300))}</div>` : ''}<div class="nf-m">${esc(ago(n.show_at))}${n.created_by && n.created_by !== myId() ? ' · ' + esc(A.personName(n.created_by) || '') : ''}</div></div></button>`).join('')
        : A.emptyBox(only ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات بعد', 'ستظهر هنا النماذج المطلوبة منك وحصص الانتظار وتنبيهات الإدارة.');
      $$('.nf-it', m.el).forEach(b => b.onclick = () => { const n = LIST.find(x => x.id === b.dataset.id); m.close(); openItem(n); });
    };
    $$('[data-f]', m.el).forEach(b => b.onclick = () => { only = b.dataset.f === 'un'; $$('[data-f]', m.el).forEach(x => x.classList.toggle('on', x === b)); draw(); });
    m.el.querySelector('#nfAll').onclick = async () => { await markRead(visible().filter(n => !n.read_at).map(n => n.id)); draw(); };
    m.el.querySelector('#nfPrefs').onclick = () => { m.close(); prefsDialog(myId(), false); };
    const iss = m.el.querySelector('#nfIssue'); if (iss) iss.onclick = () => { m.close(); issueDialog(); };
    bindPerm(m.el, () => { m.el.querySelector('#nfPB').innerHTML = permBox(); bindPerm(m.el); });
    draw();
  }
  A.notifPanel = panel;

  // ---------------- التفضيلات ----------------
  async function getPrefs(staffId) {
    try { const r = await api.list('notif_prefs', { staff_id: staffId }); return r[0] || { off: [], admin_off: [] }; } catch (_) { return { off: [], admin_off: [] }; }
  }
  async function savePrefs(staffId, off, admin) {
    if (api.demo) { const ex = (await api.list('notif_prefs', { staff_id: staffId }))[0]; const patch = admin ? { admin_off: off } : { off }; if (ex) await api.upd('notif_prefs', ex.id, patch); else await api.ins('notif_prefs', [{ id: staffId, staff_id: staffId, school_id: S.school.id, off: [], admin_off: [], ...patch }]); return; }
    await api.rpc('notif_set_prefs', { p_staff: staffId, p_off: off, p_admin: !!admin });
  }
  async function prefsDialog(staffId, admin) {
    const p = await getPrefs(staffId); const gOff = ((S.school.settings || {}).notif || {}).off || [];
    const mine = new Set(admin ? p.admin_off || [] : p.off || []); const locked = new Set(admin ? [] : p.admin_off || []);
    const who = staffId === myId() ? 'إشعاراتي' : 'إشعارات ' + (A.personName(staffId) || '');
    const m = A.modal(`<h3>${esc(who)}</h3><p class="sub">${admin ? 'ما توقفه هنا لا يستطيع الموظف تشغيله.' : 'اختر ما تريد أن يصلك. المعلم يصله فقط ما يخصه، والتنبيهات العامة التي تصدرها الإدارة.'}</p>
      <div class="nf-kinds">${Object.entries(KINDS).map(([k, [l, d]]) => { const g = gOff.includes(k), lk = locked.has(k); return `<label class="${g || lk ? 'lock' : ''}"><input type="checkbox" value="${k}" ${!mine.has(k) && !g && !lk ? 'checked' : ''} ${g || lk ? 'disabled' : ''}><span><b>${esc(l)}</b><small>${esc(d)}${g ? ' — موقوف للجميع' : lk ? ' — أوقفته الإدارة' : ''}</small></span></label>`; }).join('')}</div>
      <div class="acts"><button class="btn" id="npGo">حفظ</button></div>`);
    m.el.querySelector('#npGo').onclick = e => A.run(e.currentTarget, async () => {
      const off = $$('input[type=checkbox]', m.el).filter(i => !i.checked && !i.disabled).map(i => i.value);
      await savePrefs(staffId, off, admin); m.close(); A.toast('حُفظت الإعدادات', 'ok'); if (S.view === 'notify') A.route();
    });
  }

  // ---------------- إصدار تنبيه ----------------
  const isRole = (p, r) => S.memberships.some(m => m.staff_id === p.id && m.role === r);
  function lateTeachers() { // لم يكملوا خطة الأسبوع الحالي
    const ids = new Set(); (S.entries || []).forEach(e => { if (e.teacher_id && e.subject_id && (!e.status || e.status === 'empty')) ids.add(e.teacher_id); }); return ids;
  }
  const LINKS = [['', 'بدون رابط'], ['#/my', 'خطتي'], ['#/forms', 'النماذج'], ['#/standby', 'حصص الانتظار'], ['#/home', 'الرئيسية'], ['custom', 'رابط آخر…']];
  function issueDialog(pre = {}) {
    if (!canIssue()) return;
    const people = S.staff.filter(p => p.active && p.id !== myId() && !p.is_test).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
    const sel = new Set(pre.ids || []);
    const late = lateTeachers();
    const groups = [['all', 'الجميع', () => true], ['t', 'المعلمون', p => isRole(p, 'teacher')], ['s', 'الإدارة والمشرفون', p => p.is_owner || isRole(p, 'supervisor') || isRole(p, 'admin')], ...S.sections.map(x => ['sec' + x.id, 'قسم ' + (x.short_name || x.name), p => S.memberships.some(m => m.staff_id === p.id && m.section_id === x.id)]), ['late', 'لم يكملوا خطة الأسبوع (' + AR(late.size) + ')', p => late.has(p.id)]];
    const m = A.modal(`<h3>إصدار تنبيه</h3>
      <div class="chip-filter" id="isTpl"><button type="button" data-t="plan">قالب: تذكير بالخطة</button><button type="button" data-t="forms">قالب: تذكير بالنماذج</button><button type="button" data-t="meet">قالب: اجتماع</button></div>
      <div class="field"><label for="isT">العنوان</label><input class="in" id="isT" maxlength="200" value="${esc(pre.title || '')}"></div>
      <div class="field"><label for="isB">النص</label><textarea class="in" id="isB" rows="4" maxlength="2000">${esc(pre.body || '')}</textarea></div>
      <div class="nf-grid" style="gap:10px"><div class="field"><label for="isK">النوع</label><select class="in" id="isK"><option value="notice">تنبيه عام</option><option value="reminder" ${pre.kind === 'reminder' ? 'selected' : ''}>تذكير</option></select></div>
      <div class="field"><label for="isL">يفتح عند الضغط</label><select class="in" id="isL">${LINKS.map(([v, l]) => `<option value="${v}" ${pre.link === v ? 'selected' : ''}>${l}</option>`).join('')}</select><input class="in hidden" id="isLc" placeholder="https://… أو #/صفحة" style="margin-top:6px"></div>
      <div class="field"><label for="isW">موعد الظهور (اختياري)</label><input class="in" type="datetime-local" id="isW"><div class="small muted">اتركه فارغاً للإرسال الآن.</div></div></div>
      <div class="field"><label>المستلمون <span class="small muted" id="isC"></span></label>
        <div class="chip-filter" id="isG">${groups.map(([k, l]) => `<button type="button" data-g="${k}">${esc(l)}</button>`).join('')}<button type="button" data-g="none">إلغاء التحديد</button></div>
        <input class="in" id="isQ" placeholder="بحث بالاسم" style="margin-bottom:6px"><div class="nf-rc" id="isR"></div></div>
      <div class="acts"><button class="btn" id="isGo">${ICO.send} إرسال</button></div>`, { cls: 'wide' });
    const R = m.el.querySelector('#isR');
    const cnt = () => { m.el.querySelector('#isC').textContent = sel.size ? `(${AR(sel.size)} محدد)` : '(لم تحدد أحداً)'; };
    const draw = () => { const q = A.normKey(m.el.querySelector('#isQ').value); R.innerHTML = people.filter(p => !q || A.normKey(p.full_name).includes(q)).map(p => `<label><input type="checkbox" value="${p.id}" ${sel.has(p.id) ? 'checked' : ''}> ${esc(p.full_name)}${p.user_id ? '' : ' <span class="small faint">(لم يدخل المنصة بعد)</span>'}</label>`).join(''); $$('input', R).forEach(i => i.onchange = () => { i.checked ? sel.add(i.value) : sel.delete(i.value); cnt(); }); cnt(); };
    $$('#isG button', m.el).forEach(b => b.onclick = () => { if (b.dataset.g === 'none') sel.clear(); else { const g = groups.find(x => x[0] === b.dataset.g); people.filter(g[2]).forEach(p => sel.add(p.id)); } draw(); });
    m.el.querySelector('#isQ').oninput = draw;
    const L = m.el.querySelector('#isL'); L.onchange = () => m.el.querySelector('#isLc').classList.toggle('hidden', L.value !== 'custom');
    const TPL = { plan: ['تذكير بإكمال الخطة الأسبوعية', 'نأمل إكمال خطة الأسبوع قبل الموعد المحدد. شكراً لتعاونكم.', '#/my', 'reminder', 'late'], forms: ['تذكير بالنماذج المطلوبة', 'لديك نماذج تنتظر التعبئة أو التوقيع.', '#/forms', 'reminder', null], meet: ['اجتماع', 'يُعقد اجتماع يوم … الساعة … في …', '', 'notice', null] };
    $$('#isTpl button', m.el).forEach(b => b.onclick = () => { const t = TPL[b.dataset.t]; m.el.querySelector('#isT').value = t[0]; m.el.querySelector('#isB').value = t[1]; L.value = t[2]; m.el.querySelector('#isK').value = t[3]; L.onchange(); if (t[4]) { sel.clear(); const g = groups.find(x => x[0] === t[4]); people.filter(g[2]).forEach(p => sel.add(p.id)); draw(); } });
    draw();
    m.el.querySelector('#isGo').onclick = e => A.run(e.currentTarget, async () => {
      const title = m.el.querySelector('#isT').value.trim(), body = m.el.querySelector('#isB').value.trim();
      if (!title) throw new Error('اكتب عنوان التنبيه'); if (!sel.size) throw new Error('اختر المستلمين');
      let link = L.value === 'custom' ? m.el.querySelector('#isLc').value.trim() : L.value;
      if (link && !/^(#\/|https?:\/\/)/.test(link)) throw new Error('الرابط يبدأ بـ #/ أو https://');
      const w = m.el.querySelector('#isW').value; const when = w ? new Date(w).toISOString() : null;
      const kind = m.el.querySelector('#isK').value; const ids = [...sel];
      const all = ids.length === people.length;
      let n;
      if (api.demo) { const bc = 'bc' + Date.now(); await api.ins('notifications', ids.map(id => ({ id: bc + id, school_id: S.school.id, staff_id: id, kind, title, body, link, broadcast_id: bc, created_by: myId(), show_at: when || nowIso(), created_at: nowIso(), read_at: null }))); n = ids.length; }
      else n = await api.rpc('notify_send', { p_ids: all ? null : ids, p_title: title, p_body: body, p_link: link, p_kind: kind, p_show_at: when });
      m.close(); A.toast(`${when ? 'جُدول' : 'أُرسل'} التنبيه إلى ${A.cnt(n || ids.length, 'شخص', 'أشخاص')}`, 'ok'); if (S.view === 'notify') A.route();
    });
  }
  A.notifIssue = issueDialog;

  // ---------------- مركز الإشعارات (للمالك ومن يملك الإشراف) ----------------
  async function sentList() {
    if (api.demo) {
      const all = (await api.list('notifications', {})).filter(n => n.broadcast_id); const g = {};
      all.forEach(n => { const x = g[n.broadcast_id] = g[n.broadcast_id] || { ...n, total: 0, seen: 0 }; x.total++; if (n.read_at) x.seen++; });
      return Object.values(g).sort((a, b) => b.show_at.localeCompare(a.show_at));
    }
    try { return (await api.rpc('notify_sent', {})) || []; } catch (_) { return []; }
  }
  V.notify = async function (root) {
    root.innerHTML = '<div class="spinner"></div>';
    const sent = await sentList(); const gOff = new Set(((S.school.settings || {}).notif || {}).off || []);
    const owner = S.me.is_owner && !S.realMe;
    root.innerHTML = `<div class="head"><div class="grow"><h2>مركز الإشعارات</h2><p class="sub">إصدار التنبيهات العامة والمجدولة، ومتابعة من اطّلع، والتحكم فيما يصل لكل حساب.</p></div><button class="btn" id="nvIssue">${ICO.send} إصدار تنبيه</button></div>
      <div class="nf-grid">
        <div class="card"><h3>التنبيهات المرسلة</h3><div class="nf-sent">${sent.length ? sent.map(s => { const due = s.show_at > nowIso(); return `<div class="row-s"><div class="grow" style="min-width:180px"><b>${esc(s.title)}</b><div class="small muted">${due ? 'مجدول: ' : ''}${esc(A.fmtDT ? A.fmtDT(s.show_at) : s.show_at)} · ${esc((KINDS[s.kind] || [s.kind])[0])}</div></div><div class="nf-meter" title="اطّلع ${AR(s.seen)} من ${AR(s.total)}"><i style="width:${s.total ? Math.round(s.seen / s.total * 100) : 0}%"></i></div><span class="small">${AR(s.seen)}/${AR(s.total)}</span><button class="btn ghost sm" data-rt="${s.broadcast_id}">سحب</button></div>`; }).join('') : A.emptyBox('لم تُرسل تنبيهات بعد', 'استخدم «إصدار تنبيه» لإرسال تذكير أو إعلان لكل الموظفين أو لفئة منهم.')}</div></div>
        ${owner ? `<div class="card"><h3>الإشعارات التلقائية للجميع</h3><p class="small muted">أوقف نوعاً هنا فلا يصل لأي حساب.</p><div class="nf-kinds" id="nvG">${Object.entries(KINDS).filter(([k]) => k !== 'notice').map(([k, [l, d]]) => `<label><input type="checkbox" value="${k}" ${gOff.has(k) ? '' : 'checked'}><span><b>${esc(l)}</b><small>${esc(d)}</small></span></label>`).join('')}</div><div class="acts"><button class="btn sm" id="nvGS">حفظ</button></div>
          <h3 style="margin-top:16px">إشعارات حساب معيّن</h3><div class="row" style="gap:8px"><select class="in" id="nvP" style="flex:1;min-width:200px"><option value="">— اختر موظفاً —</option>${S.staff.filter(p => p.active).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar')).map(p => `<option value="${p.id}">${esc(p.full_name)}</option>`).join('')}</select><button class="btn ghost sm" id="nvPS">${ICO.gear} ضبط</button></div></div>` : ''}
      </div>`;
    root.querySelector('#nvIssue').onclick = () => issueDialog();
    $$('[data-rt]', root).forEach(b => b.onclick = async () => {
      if (!(await A.confirmBox('سحب هذا التنبيه من حسابات جميع المستلمين؟', 'سحب', true))) return;
      await A.run(b, async () => { if (api.demo) { for (const n of (await api.list('notifications', { broadcast_id: b.dataset.rt }))) await api.del('notifications', n.id); } else await api.rpc('notify_retract', { p_broadcast: b.dataset.rt }); A.toast('سُحب التنبيه', 'ok'); V.notify(root); });
    });
    const gs = root.querySelector('#nvGS'); if (gs) gs.onclick = e => A.run(e.currentTarget, async () => {
      const off = $$('#nvG input', root).filter(i => !i.checked).map(i => i.value);
      const settings = { ...(S.school.settings || {}), notif: { ...((S.school.settings || {}).notif || {}), off } };
      const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; A.toast('حُفظت الإعدادات', 'ok');
    });
    const ps = root.querySelector('#nvPS'); if (ps) ps.onclick = () => { const v = root.querySelector('#nvP').value; if (!v) return A.toast('اختر موظفاً', 'err'); prefsDialog(v, v !== myId()); };
  };
  if (A.NAV && !A.NAV.some(n => n[0] === 'notify')) { const i = A.NAV.findIndex(n => n[0] === 'roles'); A.NAV.splice(i < 0 ? A.NAV.length : i, 0, ['notify', 'مركز الإشعارات', canIssue]); }
  if (A.I && !A.I.notify) A.I.notify = ICO.bell;

  // ---------------- الربط ----------------
  function addBtn() {
    if (!A.tfeat('notif')) { const o = $('#notifBtn'); if (o) o.remove(); return; }
    if ($('#notifBtn')) return; const ib = $('#inboxBtn'); if (!ib) return;
    const b = document.createElement('button'); b.className = 'userbtn icon-only nf-btn'; b.id = 'notifBtn'; b.setAttribute('aria-label', 'الإشعارات'); b.title = 'الإشعارات';
    b.innerHTML = ICO.bell + '<span class="badge hidden" id="notifN"></span>'; b.onclick = panel; ib.before(b);
  }
  function realtime() {
    if (unsub) { try { unsub(); } catch (_) { } unsub = null; }
    if (!myId() || api.demo) return;
    const ch = api.subscribe('nf-' + myId(), 'notifications', 'staff_id=eq.' + myId(), p => {
      if (p.eventType === 'INSERT' && p.new) { if (!LIST.some(x => x.id === p.new.id)) LIST.unshift(p.new); deliverDue(false); }
      else if (p.eventType === 'DELETE' && p.old) { LIST = LIST.filter(x => x.id !== p.old.id); badge(); }
      else if (p.eventType === 'UPDATE' && p.new) { const i = LIST.findIndex(x => x.id === p.new.id); if (i >= 0) LIST[i] = p.new; badge(); }
    });
    unsub = typeof ch === 'function' ? ch : (ch && ch.unsubscribe ? () => ch.unsubscribe() : null);
  }
  let lastMe = null;
  const prevAfter = window.APP_AFTER_SHELL;
  window.APP_AFTER_SHELL = function () {
    if (prevAfter) prevAfter.apply(this, arguments);
    addBtn(); badge();
    if (!A.tfeat('notif')) { if (unsub) { try { unsub(); } catch (_) { } unsub = null; } lastMe = null; LIST = []; return; }
    if (lastMe !== myId()) { lastMe = myId(); LIST = []; load(); realtime(); }
    clearInterval(tick); tick = setInterval(() => { deliverDue(false); }, 60000);
    setTimeout(softPrompt, 4000);
  };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && myId() && A.tfeat('notif')) load(); });
  // فتح رابط الإشعار عند الضغط عليه من خارج المنصة (service worker)
  if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => { const d = e.data || {}; if (d.type === 'nf-open') { const n = LIST.find(x => x.id === d.id) || { id: d.id, link: d.link }; openItem(n); } });
  // فتح مباشر عبر ?nf=<id>
  const qid = new URLSearchParams(location.search).get('nf');
  if (qid) { const once = window.APP_AFTER_SHELL; window.APP_AFTER_SHELL = function () { once.apply(this, arguments); setTimeout(() => { const n = LIST.find(x => x.id === qid); if (n) openItem(n); }, 1500); }; }
})();
