/* منصة دينا — النماذج والاستمارات للمعلمين مع التوقيع الإلكتروني
   - المالك (ومن له «الإشراف التربوي») يختار نماذج من «خطة ونماذج الإشراف» (تبادل الزيارات، الدرس التطبيقي، …)
     ويرسلها لمعلم أو أكثر بموعد وملاحظة.
   - المعلم يعبّئ النموذج نفسه بهوية دينا، ويوقّع، ويطلب توقيع زميل (مثل المعلم المزور)، ثم يرسله للاعتماد.
   - المالك يعتمد (مع توقيعه) أو يعيد بملاحظة. تقارير ومتابعة وExcel.
   - لكل حساب توقيع إلكتروني محفوظ يُستخدم في كل النماذج.
   الصلاحيات تفرضها قاعدة البيانات (form_tasks + form_save/form_sign/form_share/form_decide). */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  const DEMO = /[?&]demo=1/.test(location.search);
  const isAdmin = () => !!(S.me && (S.me.is_owner || (A.hasModule && A.hasModule('supervision'))));
  const canEditAdmin = t => !!(S.me && (S.me.is_owner || t.created_by === S.me.id));
  const STS = { assigned: ['جديد', ''], draft: ['قيد التعبئة', 'st-submitted'], submitted: ['بانتظار الاعتماد', 'st-submitted'], returned: ['مُعاد للتعديل', 'st-returned'], approved: ['معتمد', 'st-approved'] };
  const STE = { assigned: ['مسودة لدى المقيّم', ''], draft: ['مسودة لدى المقيّم', ''], submitted: ['بانتظار توقيع المعلم', 'st-submitted'], returned: ['مسودة لدى المقيّم', ''], approved: ['موقّعة ومكتملة', 'st-approved'] };
  const isEval = t => t && t.mode === 'sign';
  const pill = (s, ev) => { const M = ev ? STE : STS; return `<span class="pill ${M[s] ? M[s][1] : ''}">${M[s] ? M[s][0] : esc(s)}</span>`; };
  const pillT = t => pill(t.status, isEval(t)) + (isEval(t) ? ' <span class="pill fm-ev">استمارة تقييم</span>' : '');
  // خانة توقيع المعلم في استمارة التقييم
  const teacherSlot = tpl => { const L = slotsOf(tpl); return L.find(s => /المعلم|المعلمة|الموظف|المقيَّم|المُقيَّم|صاحب العلاقة/.test(s.label) && !/الزائر|المزور|المقيِّم|المشرف|المدير/.test(s.label) && !s.auto) || L.find(s => !s.auto) || L[0]; };
  const EVAL_RE = /تقييم|تقويم|بطاقة|زيارة صفية|ملاحظة صفية|مساءلة|لفت نظر|تنبيه/;
  const today = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const overdue = t => t.due_date && t.due_date < today() && !['submitted', 'approved'].includes(t.status);
  const dt = d => d ? (A.arDate ? A.arDate(String(d).slice(0, 10)) : String(d).slice(0, 10)) : '—';
  const nm = id => (A.personName && A.personName(id)) || ((S.staff || []).find(p => p.id === id) || {}).full_name || '—';
  const FRAME = 'tools/supervision.html?formEmbed=1&v=' + ((document.querySelector('script[src*="app57.js"]') || {}).src || '').split('v=')[1];

  // ---------- الأيقونة والتنقل ----------
  A.I.forms = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8.5 16.5c1.2-1.6 2.2-1.6 3 0s1.8 1.6 3.5-.5"/></svg>';
  if (A.NAV && !A.NAV.some(n => n[0] === 'forms')) { const i = A.NAV.findIndex(n => n[0] === 'supervision' || n[0] === 'myreports'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['forms', 'النماذج والاستمارات', () => !!S.me]); }

  // ---------- استدعاءات الخادم (مع محاكاة للعرض التجريبي) ----------
  async function rpc(n, a) {
    if (!DEMO) return api.rpc(n, a);
    const [t] = await api.list('form_tasks', { id: a.p_id }); if (!t) throw new Error('النموذج غير موجود');
    const me = S.me.id, adm = isAdmin(), cos = t.cosign || [];
    if (n === 'form_teacher_note') { if (t.assignee !== me) throw new Error('الملاحظة للمعلم صاحب الاستمارة'); await api.upd('form_tasks', t.id, { teacher_note: a.p_note }); return Object.assign(t, { teacher_note: a.p_note }); }
    if (n === 'form_save') { if (isEval(t) && !canEditAdmin(t)) throw new Error('هذه الاستمارة يعبّئها المقيّم، ويكتفي المعلم بالاطلاع والتوقيع'); if (t.assignee !== me && !canEditAdmin(t)) throw new Error('لا تملك تعبئة هذا النموذج'); const p = { data: a.p_data || t.data, status: a.p_submit ? 'submitted' : (t.status === 'assigned' && !isEval(t)) ? 'draft' : t.status, updated_at: new Date().toISOString() }; if (a.p_submit) p.submitted_at = p.updated_at; return api.upd('form_tasks', t.id, p).then(() => Object.assign(t, p)); }
    if (n === 'form_sign') { const sigs = { ...(t.sigs || {}) }; if (a.p_remove) delete sigs[a.p_key]; else sigs[a.p_key] = { img: a.p_img, name: a.p_name, label: a.p_label, staff_id: me, at: new Date().toISOString() };
      const c2 = cos.map(c => c.key === a.p_key ? { ...c, status: a.p_remove ? 'pending' : (c.staff_id === me ? 'signed' : c.status) } : c); const p = { sigs, cosign: c2 }; if (isEval(t) && !a.p_remove && t.status === 'submitted' && c2.every(c => c.status === 'signed')) Object.assign(p, { status: 'approved', decided_at: new Date().toISOString(), decided_by: me }); await api.upd('form_tasks', t.id, p); return Object.assign(t, p); }
    if (n === 'form_share') { const c2 = cos.filter(c => c.key !== a.p_key).concat([{ staff_id: a.p_staff, key: a.p_key, label: a.p_label, status: 'pending', by: me, requested_at: new Date().toISOString() }]); await api.upd('form_tasks', t.id, { cosign: c2 }); return Object.assign(t, { cosign: c2 }); }
    if (n === 'form_decide') { if (!adm) throw new Error('الاعتماد للمالك أو المشرف'); const p = { status: a.p_approve ? 'approved' : 'returned', review_note: a.p_note || '', decided_at: new Date().toISOString(), decided_by: me }; await api.upd('form_tasks', t.id, p); return Object.assign(t, p); }
  }
  const notify = (ids, subject, body) => { if (!api.sendMessages) return; const rows = [...new Set(ids)].filter(id => id && id !== S.me.id).map(id => ({ recipient_id: id, subject, body })); if (rows.length) api.sendMessages(rows).catch(() => { }); };

  // ---------- مكتبة النماذج (من أداة الإشراف) ----------
  let LIB = null;
  function loadLib() {
    if (LIB) return Promise.resolve(LIB);
    return new Promise((res, rej) => {
      const f = document.createElement('iframe'); f.src = FRAME; f.style.cssText = 'position:absolute;width:1px;height:1px;opacity:0;pointer-events:none;border:0'; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
      const to = setTimeout(() => { cleanup(); rej(new Error('تعذّر تحميل مكتبة النماذج')); }, 20000);
      const on = e => { if (e.source !== f.contentWindow || !e.data) return;
        if (e.data.type === 'dina-form-ready') f.contentWindow.postMessage({ type: 'dina-form-lib', req: 1 }, location.origin);
        if (e.data.type === 'dina-form-lib') { LIB = e.data; cleanup(); res(LIB); } };
      const cleanup = () => { clearTimeout(to); window.removeEventListener('message', on); f.remove(); };
      window.addEventListener('message', on); document.body.appendChild(f);
    });
  }
  const slotsOf = tpl => { const out = []; (tpl.blocks || []).forEach(b => { if (b.type !== 'signatures') return; (b.roles || []).forEach(r => out.push({ key: b.id + '|' + r.id, label: r.label, auto: String(r.name || '').charAt(0) === '@' })); }); return out; };
  // نموذج بلا خانات توقيع: تُضاف خانتا المعلم والاعتماد
  const withSig = tpl => { const t = JSON.parse(JSON.stringify(tpl)); if (!slotsOf(t).length) t.blocks = (t.blocks || []).concat([{ id: 'bsig', type: 'signatures', withSign: true, roles: [{ id: 's0', label: 'المعلم', name: '' }, { id: 's1', label: 'المدير الأكاديمي', name: '@academic' }] }]); return t; };

  // ---------- التوقيع الإلكتروني ----------
  let MYSIG, SIGUSER; // التوقيع المحفوظ مرتبط بالحساب الحالي فقط
  async function mySig() { if (SIGUSER !== S.me.id) { MYSIG = undefined; SIGUSER = S.me.id; } if (MYSIG !== undefined) return MYSIG; try { const [r] = await api.list('staff_signatures', { staff_id: S.me.id }); MYSIG = r ? r.img : null; } catch (_) { MYSIG = null; } return MYSIG; }
  function sigModal(onSaved) {
    const m = A.modal(`<h3>توقيعي الإلكتروني</h3><p class="sub">ارسم توقيعك مرة واحدة بالإصبع أو الفأرة، ويُستخدم في كل النماذج التي توقّعها. يمكنك تغييره متى شئت.</p>
      <div class="sg-wrap"><canvas id="sgC" width="900" height="300" aria-label="مساحة رسم التوقيع"></canvas><span class="sg-line" aria-hidden="true"></span><span class="sg-ph" id="sgPh">وقّع هنا</span></div>
      <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn" id="sgS">حفظ التوقيع</button><button class="btn ghost" id="sgX">مسح</button>${MYSIG ? `<span class="small muted" style="margin-inline-start:auto">توقيعك الحالي:</span><img src="${MYSIG}" alt="توقيعي الحالي" style="height:44px;border:1px solid #E4EBF5;border-radius:8px;background:#fff">` : ''}</div>`);
    const c = $('#sgC', m.el), g = c.getContext('2d'); let drawn = false, last = null;
    g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#082B5A';
    const pt = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
    c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); last = pt(e); drawn = true; $('#sgPh', m.el).hidden = true; g.beginPath(); g.arc(last[0], last[1], 2, 0, 7); g.fillStyle = '#082B5A'; g.fill(); });
    c.addEventListener('pointermove', e => { if (!last) return; const p = pt(e); g.beginPath(); g.moveTo(last[0], last[1]); g.quadraticCurveTo(last[0], last[1], p[0], p[1]); g.stroke(); last = p; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(k => c.addEventListener(k, () => last = null));
    $('#sgX', m.el).onclick = () => { g.clearRect(0, 0, c.width, c.height); drawn = false; $('#sgPh', m.el).hidden = false; };
    $('#sgS', m.el).onclick = ev => A.run(ev.currentTarget, async () => {
      if (!drawn) throw new Error('ارسم توقيعك أولاً');
      // قصّ الفراغ حول التوقيع
      const d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
      for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (d[(y * c.width + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      const pad = 12, w = Math.max(20, x1 - x0 + pad * 2), h = Math.max(20, y1 - y0 + pad * 2), o = document.createElement('canvas'); o.width = w; o.height = h;
      o.getContext('2d').drawImage(c, x0 - pad, y0 - pad, w, h, 0, 0, w, h);
      const img = o.toDataURL('image/png');
      await api.ups('staff_signatures', [{ staff_id: S.me.id, img, updated_at: new Date().toISOString() }], 'staff_id');
      MYSIG = img; SIGUSER = S.me.id; m.close(); A.toast('حُفظ توقيعك', 'ok'); onSaved && onSaved(img);
    });
  }
  const ensureSig = () => new Promise(async res => { const s = await mySig(); if (s && SIGUSER !== S.me.id) return res(null); if (s) return res(s); sigModal(img => res(img)); });

  // ---------- فتح نموذج ----------
  function slotState(t) {
    const me = S.me.id, adm = isAdmin(), out = {}, app = t.status === 'approved';
    slotsOf(t.tpl).forEach(s => {
      const sg = (t.sigs || {})[s.key], co = (t.cosign || []).find(c => c.key === s.key);
      if (sg) out[s.key] = { mine: !app && (sg.staff_id === me || adm) };
      else if (co && co.status !== 'signed') out[s.key] = co.staff_id === me ? { can: !app } : { wait: nm(co.staff_id), can: !app && adm };
      else out[s.key] = { can: !app && (adm || (!isEval(t) && t.assignee === me && !s.auto && !['submitted'].includes(t.status))) };
    });
    return out;
  }
  const editable = t => t.status !== 'approved' && (isEval(t) ? canEditAdmin(t) : (t.assignee === S.me.id && ['assigned', 'draft', 'returned'].includes(t.status)) || (canEditAdmin(t) && t.status !== 'approved'));

  function openTask(t, after) {
    const me = S.me.id, adm = isAdmin(), mineTask = t.assignee === me;
    const myCo = (t.cosign || []).find(c => c.staff_id === me && c.status !== 'signed');
    const m = A.modal(`<div class="fm-top"><div class="grow"><h3 style="margin:0">${esc(t.title)}</h3>
        ${t.id === 'preview' ? `<p class="sub" style="margin:2px 0 0">معاينة النموذج كما يصل للمعلم</p>` : ''}<p class="sub" style="margin:2px 0 0${t.id === 'preview' ? ';display:none' : ''}">المعلم: <b>${esc(nm(t.assignee))}</b> · <span id="fmSt">${pill(t.status)}</span>${t.due_date ? ` · الموعد ${dt(t.due_date)}${overdue(t) ? ' <span class="pill st-returned">متأخر</span>' : ''}` : ''} <span class="small muted" id="fmSv"></span></p></div>
        <div class="fm-acts" id="fmA"></div></div>
      ${t.note ? `<div class="notice info" style="display:block;margin:6px 0">ملاحظة المرسل: ${esc(t.note)}</div>` : ''}
      ${t.status === 'returned' && t.review_note ? `<div class="notice warn" style="display:block;margin:6px 0">ملاحظة الإعادة: ${esc(t.review_note)}</div>` : ''}
      ${isEval(t) && mineTask && t.status === 'submitted' ? `<div class="notice info fm-evb" style="display:block;margin:6px 0"><b>استمارة تقييمك من ${esc(nm(t.created_by))}</b><br>اطّلع على التقييم، ثم اضغط «✍ توقيع» في خانة «${esc((myCo || {}).label || 'المعلم')}» داخل الاستمارة للعلم. يمكنك إضافة ملاحظتك قبل التوقيع أو بعده.</div>` : myCo ? `<div class="notice info" style="display:block;margin:6px 0">مطلوب توقيعك في خانة «${esc(myCo.label)}» — اضغط «✍ توقيع» داخل النموذج.</div>` : ''}
      <div id="fmTn"></div>
      <div class="fm-co" id="fmCo"></div>
      <iframe class="fm-frame" id="fmF" src="${FRAME}" title="${esc(t.title)}"></iframe>`, { cls: 'wide fm-modal' });
    const f = $('#fmF', m.el); let D = t.data || {}, dirty = false, timer = null;
    const post = o => f.contentWindow && f.contentWindow.postMessage(o, location.origin);
    const setSv = s => { const e = $('#fmSv', m.el); if (e) e.textContent = s; };
    const initMsg = () => ({ type: 'dina-form-init', style: A.printStyle ? A.printStyle() : null, tpl: t.tpl, cfg: t.cfg, data: D, sigs: t.sigs || {}, slots: slotState(t), ro: !editable(t) });
    const resend = () => post({ type: 'dina-form-sigs', sigs: t.sigs || {}, slots: slotState(t), ro: !editable(t) });
    const save = async (submit) => { const r = await rpc('form_save', { p_id: t.id, p_data: D, p_submit: !!submit }); Object.assign(t, r || {}); dirty = false; setSv('· حُفظ'); return r; };
    const drawTn = () => { const el = $('#fmTn', m.el); if (el) el.innerHTML = isEval(t) && t.teacher_note ? `<div class="notice" style="display:block;margin:6px 0;background:#F4F8FC;border:1px solid #DCE7F3"><b>ملاحظة المعلم:</b> ${esc(t.teacher_note)}</div>` : ''; };
    const drawCo = () => { drawTn(); const el = $('#fmCo', m.el); const L = isEval(t) ? (t.cosign || []).filter(c => c.staff_id !== t.assignee) : (t.cosign || []); el.innerHTML = L.length ? `<span class="small muted">توقيعات الزملاء:</span> ${L.map(c => `<span class="pill ${c.status === 'signed' ? 'st-approved' : 'st-submitted'}">${esc(nm(c.staff_id))} · ${esc(c.label)} · ${c.status === 'signed' ? 'وقّع' : 'بانتظار التوقيع'}</span>`).join(' ')}` : ''; };
    function drawActs() {
      const a = $('#fmA', m.el); const ed = editable(t), b = []; const ps = $('#fmSt', m.el); if (ps) ps.innerHTML = pillT(t);
      if (t.id === 'preview') { a.innerHTML = `<button class="btn ghost sm" data-a="print">${A.I.print || ''} طباعة / PDF</button>`; $$('[data-a]', a).forEach(x => x.onclick = ev => act(x.dataset.a, ev.currentTarget)); return; }
      if (ed) b.push(`<button class="btn ghost sm" data-a="save">حفظ</button>`);
      if (isEval(t)) {
        if (canEditAdmin(t) && t.status !== 'approved') b.push(`<button class="btn ghost sm" data-a="share">إضافة موقّع</button>`);
        if (canEditAdmin(t) && ['assigned', 'draft', 'returned'].includes(t.status)) b.push(`<button class="btn sm" data-a="sendEval">إرسال للمعلم للتوقيع</button>`);
        if (adm && t.status === 'submitted') b.push(`<button class="btn ghost sm" data-a="remind">تذكير المعلم</button>`);
        if (mineTask && t.status !== 'assigned') b.push(`<button class="btn ghost sm" data-a="tnote">${t.teacher_note ? 'تعديل ملاحظتي' : 'إضافة ملاحظتي'}</button>`);
      } else {
      if (t.status !== 'approved' && (mineTask || adm)) b.push(`<button class="btn ghost sm" data-a="share">طلب توقيع زميل</button>`);
      if (mineTask && ['assigned', 'draft', 'returned'].includes(t.status)) b.push(`<button class="btn sm" data-a="submit">إرسال للاعتماد</button>`);
      }
      if (!isEval(t) && adm && t.status === 'submitted') b.push(`<button class="btn ok sm" data-a="approve">اعتماد</button><button class="btn ghost sm" data-a="return">إعادة للمعلم</button>`);
      if (!isEval(t) && adm && t.status === 'approved') b.push(`<button class="btn ghost sm" data-a="reopen">إلغاء الاعتماد</button>`);
      b.push(`<button class="btn ghost sm" data-a="print">${A.I.print || ''} طباعة / PDF</button><button class="btn ghost sm" data-a="mysig">توقيعي</button>`);
      a.innerHTML = b.join('');
      $$('[data-a]', a).forEach(x => x.onclick = ev => act(x.dataset.a, ev.currentTarget));
    }
    async function act(k, btn) {
      if (k === 'print') { if (dirty && editable(t)) await save(false).catch(() => { }); return post({ type: 'dina-form-print' }); }
      if (k === 'mysig') return sigModal();
      if (k === 'sendEval') return A.run(btn, async () => {
        const ts = (t.cosign || []).find(c => c.staff_id === t.assignee);
        if (!Object.keys(t.sigs || {}).some(k2 => !ts || k2 !== ts.key) && !(await A.confirmBox('لم توقّع على الاستمارة بعد (يمكنك التوقيع في خانة المقيّم داخلها). هل ترسلها للمعلم الآن؟', 'إرسال'))) return;
        await save(true); notify([t.assignee], 'استمارة تقييم بانتظار توقيعك: ' + t.title, `أرسل لك ${S.me.full_name} «${t.title}». اطّلع عليها ووقّع بالعلم من صفحة «النماذج والاستمارات» ← «بانتظار توقيعي».`);
        A.toast('أُرسلت للمعلم للتوقيع', 'ok'); drawActs(); resend(); after && after(); });
      if (k === 'remind') { notify([t.assignee], 'تذكير: استمارة تقييم بانتظار توقيعك', `«${t.title}» بانتظار اطلاعك وتوقيعك في صفحة «النماذج والاستمارات».`); return A.toast('أُرسل التذكير', 'ok'); }
      if (k === 'tnote') { const v = await askNote('ملاحظتك على التقييم (تظهر للمقيّم وفي الاستمارة)', t.teacher_note); if (v == null) return; return A.run(btn, async () => { const r2 = await rpc('form_teacher_note', { p_id: t.id, p_note: v }); Object.assign(t, r2 || {}); notify([t.created_by], 'ملاحظة معلم على تقييمه: ' + t.title, `${S.me.full_name}: ${v}`); A.toast('حُفظت ملاحظتك', 'ok'); drawActs(); drawTn(); after && after(); }); }
      if (k === 'save') return A.run(btn, async () => { await save(false); A.toast('حُفظ', 'ok'); });
      if (k === 'submit') return A.run(btn, async () => {
        const st = slotState(t), pend = (t.cosign || []).filter(c => c.status !== 'signed');
        if (pend.length && !(await A.confirmBox(`ما زال توقيع ${pend.map(c => nm(c.staff_id)).join('، ')} معلّقاً. هل ترسل للاعتماد الآن؟`, 'إرسال'))) return;
        await save(true); notify([t.created_by], 'نموذج بانتظار اعتمادك: ' + t.title, `أرسل ${nm(t.assignee)} نموذج «${t.title}» للاعتماد من صفحة «النماذج والاستمارات».`);
        A.toast('أُرسل للاعتماد', 'ok'); drawActs(); resend(); after && after();
      });
      if (k === 'approve' || k === 'return') {
        let note = '';
        if (k === 'return') { note = await askNote('سبب الإعادة أو المطلوب تعديله'); if (note == null) return; }
        return A.run(btn, async () => { if (dirty && canEditAdmin(t)) await save(false); const r = await rpc('form_decide', { p_id: t.id, p_approve: k === 'approve', p_note: note }); Object.assign(t, r || {});
          notify([t.assignee], (k === 'approve' ? 'اعتُمد نموذج: ' : 'أُعيد إليك نموذج: ') + t.title, k === 'approve' ? `اعتُمد نموذج «${t.title}».` : `أُعيد نموذج «${t.title}» للتعديل: ${note}`);
          A.toast(k === 'approve' ? 'اعتُمد النموذج' : 'أُعيد للمعلم', 'ok'); drawActs(); resend(); after && after(); });
      }
      if (k === 'reopen') return A.run(btn, async () => { const r = await rpc('form_decide', { p_id: t.id, p_approve: false, p_note: 'أُلغي الاعتماد' }); Object.assign(t, r || {}); drawActs(); resend(); after && after(); });
      if (k === 'share') return shareModal();
    }
    function shareModal() {
      const free = slotsOf(t.tpl).filter(s => !(t.sigs || {})[s.key]);
      if (!free.length) return A.toast('كل خانات التوقيع موقّعة', 'warn');
      const people = (S.staff || []).filter(p => p.active && p.id !== S.me.id).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
      const mm = A.modal(`<h3>طلب توقيع زميل</h3><p class="sub">يصل للزميل إشعار، ويفتح النموذج للاطلاع والتوقيع في الخانة المحددة فقط.</p>
        <div class="field"><label for="shK">خانة التوقيع</label><select class="in" id="shK">${free.map(s => `<option value="${esc(s.key)}" ${/مزور|المزور/.test(s.label) ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select></div>
        <div class="field"><label for="shQ">الزميل</label><input class="in" id="shQ" placeholder="ابحث بالاسم" aria-label="بحث"><select class="in" id="shP" size="7" style="margin-top:6px">${people.map(p => `<option value="${p.id}">${esc(p.full_name)}${p.title ? ' — ' + esc(p.title) : ''}</option>`).join('')}</select></div>
        <button class="btn" id="shGo">إرسال طلب التوقيع</button>`);
      $('#shQ', mm.el).oninput = e => { const v = A.normKey ? A.normKey(e.target.value) : e.target.value; [...$('#shP', mm.el).options].forEach(o => o.hidden = !!v && !(A.normKey ? A.normKey(o.text) : o.text).includes(v)); };
      $('#shGo', mm.el).onclick = ev => A.run(ev.currentTarget, async () => {
        const sid = $('#shP', mm.el).value, key = $('#shK', mm.el).value; if (!sid) throw new Error('اختر الزميل');
        if (dirty && editable(t)) await save(false);
        const lab = (free.find(s => s.key === key) || {}).label || '';
        const r = await rpc('form_share', { p_id: t.id, p_staff: sid, p_key: key, p_label: lab }); Object.assign(t, r || {});
        notify([sid], 'مطلوب توقيعك: ' + t.title, `يطلب ${S.me.full_name} توقيعك في خانة «${lab}» بنموذج «${t.title}». افتح «النماذج والاستمارات» ← «بانتظار توقيعي».`);
        mm.close(); A.toast('أُرسل طلب التوقيع', 'ok'); drawCo(); resend(); after && after();
      });
    }
    const onMsg = async e => {
      if (e.source !== f.contentWindow || !e.data) return; const d = e.data;
      if (d.type === 'dina-form-ready') post(initMsg());
      if (d.type === 'dina-form-change' && editable(t)) { D = d.d; dirty = true; setSv('· تغييرات غير محفوظة'); clearTimeout(timer); timer = setTimeout(() => save(false).catch(err => setSv('· تعذّر الحفظ: ' + err.message)), 2500); }
      if (d.type === 'dina-form-sign') {
        try {
          if (!d.remove) { const img = await ensureSig(); if (!img) return; if (dirty && editable(t)) await save(false);
            const r = await rpc('form_sign', { p_id: t.id, p_key: d.key, p_label: d.label, p_img: img, p_name: S.me.full_name, p_remove: false }); Object.assign(t, r || {});
            const co = (t.cosign || []).find(c => c.key === d.key && c.staff_id === S.me.id); if (co) notify([t.assignee], 'وقّع زميلك: ' + t.title, `وقّع ${S.me.full_name} في خانة «${co.label}» بنموذج «${t.title}».`);
            if (isEval(t) && t.status === 'approved' && t.assignee === S.me.id) { notify([t.created_by], 'وقّع المعلم على استمارة التقييم: ' + t.title, `اطّلع ${S.me.full_name} على «${t.title}» ووقّع بالعلم.${t.teacher_note ? ' ملاحظته: ' + t.teacher_note : ''}`); A.toast('تم توقيعك واكتملت الاستمارة', 'ok'); drawActs(); } else A.toast('تم التوقيع', 'ok'); }
          else { const r = await rpc('form_sign', { p_id: t.id, p_key: d.key, p_label: d.label || '', p_img: '', p_name: '', p_remove: true }); Object.assign(t, r || {}); A.toast('حُذف التوقيع', 'ok'); }
          drawCo(); resend(); after && after();
        } catch (err) { A.toast(err.message || 'تعذّر التوقيع', 'bad'); }
      }
    };
    window.addEventListener('message', onMsg);
    const obs = new MutationObserver(() => { if (!document.body.contains(m.el)) { window.removeEventListener('message', onMsg); obs.disconnect(); clearTimeout(timer); if (dirty && editable(t)) save(false).catch(() => { }); } });
    obs.observe(document.body, { childList: true, subtree: true });
    drawActs(); drawCo();
  }
  function askNote(label, val) { return new Promise(res => { const m = A.modal(`<h3>${esc(label)}</h3><textarea class="in" id="anT" rows="4" style="width:100%">${esc(val || '')}</textarea><div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="anOk">متابعة</button></div>`); let done = false; $('#anOk', m.el).onclick = () => { const v = $('#anT', m.el).value.trim(); if (!v) return A.toast('اكتب الملاحظة', 'warn'); done = true; m.close(); res(v); }; const o = new MutationObserver(() => { if (!document.body.contains(m.el)) { o.disconnect(); if (!done) res(null); } }); o.observe(document.body, { childList: true, subtree: true }); }); }

  // ---------- إرسال نماذج (المالك/المشرف) ----------
  // تعديل قالب من «خطة ونماذج الإشراف» مباشرة (التذييل، التوقيعات، الحقول، العناوين) — يُحفظ في المكتبة ويُستخدم في كل إرسال جديد
  function editTpl(id, after) {
    const m = A.modal(`<h3 style="margin:0">تعديل النموذج</h3><p class="sub" style="margin:4px 0 0">عدّل ما تريد (التذييل والتوقيعات، الحقول، العناوين، الأقسام) — يُحفظ تلقائياً. النماذج المرسلة سابقاً لا تتغير.</p>
      <iframe class="fm-frame" id="feT" src="tools/supervision.html?edit=${encodeURIComponent(id)}&v=${FRAME.split('v=')[1] || ''}" title="تعديل النموذج"></iframe>
      <div class="acts"><button class="btn ok" id="feDone" type="button">حفظ وإغلاق</button></div>`, { cls: 'wide fm-modal', sticky: true });
    const done = async ev => { if (ev && ev.currentTarget) ev.currentTarget.disabled = true; try { const w = m.el.querySelector('#feT').contentWindow; if (w && typeof w.flush === 'function') await w.flush(); } catch (_) { } m.close(); LIB = null; if (after) after(); };
    m.el.querySelector('#feDone').onclick = done; m.el.querySelector('.x').onclick = done;
  }
  function preview(item) { openTask({ id: 'preview', title: item.name + ' (معاينة)', tpl: withSig(item.tpl), cfg: LIB.cfg, data: {}, sigs: {}, cosign: [], status: 'approved', assignee: null }); }
  async function sendModal(after) {
    const m = A.modal(`<h3>إرسال نماذج للمعلمين</h3><p class="sub">اختر نموذجاً أو أكثر من «خطة ونماذج الإشراف»، ثم المعلمين. يصل لكل معلم إشعار، ويعبّئ النموذج ويوقّعه ويرسله لاعتمادك.</p><div id="smB"><div class="spinner"></div></div>`, { cls: 'wide' });
    let lib; try { lib = await loadLib(); } catch (e) { $('#smB', m.el).innerHTML = `<div class="notice bad" style="display:block">${esc(e.message)}</div>`; return; }
    const pick = new Set(), ppl = new Set();
    const cats = lib.cats.filter(c => lib.list.some(t => t.cat === c.id));
    let cat = cats.some(c => c.id === 'forms') ? 'forms' : (cats[0] || {}).id;
    const people = (S.staff || []).filter(p => p.active && !p.is_owner).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
    $('#smB', m.el).innerHTML = `<div class="sm-step"><b>١</b> النماذج <span class="pill" id="smN1">لا شيء</span></div>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin:6px 0"><input class="in" id="smQ" placeholder="بحث في النماذج" style="max-width:240px" aria-label="بحث في النماذج"></div>
      <div class="sm-cats" role="tablist">${cats.map(c => `<button type="button" role="tab" data-c="${esc(c.id)}">${esc(c.name)}</button>`).join('')}</div>
      <div class="sm-grid" id="smG"></div>
      <div class="sm-step" style="margin-top:14px"><b>٢</b> المعلمون <span class="pill" id="smN2">لا أحد</span></div>
      <div class="row" style="gap:6px;flex-wrap:wrap;margin:6px 0"><input class="in" id="smPQ" placeholder="بحث بالاسم أو المسمى" style="max-width:240px" aria-label="بحث في المعلمين"><button class="btn ghost sm" id="smAll">تحديد الظاهرين</button><button class="btn ghost sm" id="smNone">إلغاء التحديد</button></div>
      <div class="sm-ppl" id="smP">${people.map(p => `<label class="chk" data-nm="${esc(A.normKey ? A.normKey(p.full_name + ' ' + (p.title || '')) : p.full_name)}"><input type="checkbox" value="${p.id}"> ${esc(p.full_name)}${p.title ? ` <span class="small muted">· ${esc(p.title)}</span>` : ''}</label>`).join('')}</div>
      <div class="sm-step" style="margin-top:14px"><b>٣</b> طريقة النموذج</div>
      <div class="sm-modes" role="radiogroup" aria-label="طريقة النموذج"><label class="sm-mode"><input type="radio" name="smMd" value="fill" checked><b>يعبّئه المعلم</b><span class="small muted">مثل تبادل الزيارات والدرس التطبيقي: يعبّئه ويوقّعه ويرسله لاعتمادك.</span></label><label class="sm-mode"><input type="radio" name="smMd" value="sign"><b>أعبّئه أنا ويوقّع المعلم</b><span class="small muted">استمارة تقييم أو زيارة صفية: تعبّئها وتوقّعها، ثم تصل للمعلم للاطلاع والتوقيع بالعلم مع ملاحظته، دون تعديل.</span></label></div>
      <div class="sm-step" style="margin-top:14px"><b>٤</b> الإرسال</div>
      <div class="nr-meta" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px"><div class="field"><label for="smD">موعد التسليم (اختياري)</label><input class="in" type="date" id="smD"></div><div class="field" style="grid-column:span 2"><label for="smNt">ملاحظة للمعلمين (اختياري)</label><input class="in" id="smNt" placeholder="مثال: تبادل زيارة مع زميل من نفس التخصص هذا الأسبوع"></div></div>
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="smGo">إرسال</button><span class="small muted" id="smSum"></span></div>`;
    let mdTouched = false; const autoMode = () => { if (mdTouched) return; const ev = [...pick].some(id => { const it = lib.list.find(t => t.id === id); return it && (it.cat === 'cards' || EVAL_RE.test(it.name)); }); const rb = $(`[name=smMd][value=${ev ? 'sign' : 'fill'}]`, m.el); if (rb) rb.checked = true; };
    const sum = () => { autoMode(); $('#smN1', m.el).textContent = pick.size ? AR(pick.size) + ' نموذج' : 'لا شيء'; $('#smN2', m.el).textContent = ppl.size ? AR(ppl.size) + ' معلم' : 'لا أحد'; $('#smSum', m.el).textContent = pick.size && ppl.size ? `سيُرسل ${AR(pick.size * ppl.size)} نموذج` : ''; };
    const drawG = () => { const q = A.normKey ? A.normKey($('#smQ', m.el).value) : $('#smQ', m.el).value;
      const L = lib.list.filter(t => q ? (A.normKey ? A.normKey(t.name + ' ' + t.desc) : t.name).includes(q) : t.cat === cat);
      $$('[data-c]', m.el).forEach(b => { b.classList.toggle('on', !q && b.dataset.c === cat); b.setAttribute('aria-selected', !q && b.dataset.c === cat); });
      $('#smG', m.el).innerHTML = L.map(t => `<div class="sm-card ${pick.has(t.id) ? 'on' : ''}" data-t="${esc(t.id)}" role="checkbox" aria-checked="${pick.has(t.id)}" tabindex="0"><span class="sm-ck" aria-hidden="true">✓</span><b>${esc(t.name)}</b><span class="small muted">${esc(t.desc || '')}</span><span class="small sm-sl">${slotsOf(t.tpl).length ? '✍ ' + slotsOf(t.tpl).map(s => esc(s.label)).join(' · ') : '✍ المعلم · الاعتماد'}</span><span class="row" style="gap:4px"><button type="button" class="btn ghost sm" data-pv="${esc(t.id)}">معاينة</button><button type="button" class="btn ghost sm" data-ed="${esc(t.id)}" title="تعديل التذييل والتوقيعات والحقول">✎ تعديل</button></span></div>`).join('') || `<p class="small muted">لا نماذج</p>`;
      $$('[data-t]', m.el).forEach(c => { const tg = () => { pick.has(c.dataset.t) ? pick.delete(c.dataset.t) : pick.add(c.dataset.t); c.classList.toggle('on'); c.setAttribute('aria-checked', pick.has(c.dataset.t)); sum(); }; c.onclick = e => { if (e.target.closest('[data-pv],[data-ed]')) return; tg(); }; c.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tg(); } }; });
      $$('[data-pv]', m.el).forEach(b => b.onclick = () => preview(lib.list.find(t => t.id === b.dataset.pv)));
      $$('[data-ed]', m.el).forEach(b => b.onclick = () => editTpl(b.dataset.ed, async () => { try { lib = await loadLib(); drawG(); A.toast('حُفظ تعديل النموذج — يُستخدم في كل إرسال جديد', 'ok'); } catch (e) { A.toast(e.message, 'err'); } })); };
    $$('[data-c]', m.el).forEach(b => b.onclick = () => { cat = b.dataset.c; $('#smQ', m.el).value = ''; drawG(); });
    $('#smQ', m.el).oninput = drawG; drawG();
    $('#smPQ', m.el).oninput = e => { const v = A.normKey ? A.normKey(e.target.value) : e.target.value; $$('#smP label', m.el).forEach(l => l.hidden = !!v && !l.dataset.nm.includes(v)); };
    $$('#smP input', m.el).forEach(i => i.onchange = () => { i.checked ? ppl.add(i.value) : ppl.delete(i.value); sum(); });
    $('#smAll', m.el).onclick = () => { $$('#smP label:not([hidden]) input', m.el).forEach(i => { i.checked = true; ppl.add(i.value); }); sum(); };
    $('#smNone', m.el).onclick = () => { $$('#smP input', m.el).forEach(i => { i.checked = false; }); ppl.clear(); sum(); };
    $$('[name=smMd]', m.el).forEach(x => x.onchange = () => { mdTouched = true; });
    $('#smGo', m.el).onclick = ev => A.run(ev.currentTarget, async () => {
      const mode = ($('[name=smMd]:checked', m.el) || {}).value || 'fill';
      if (!pick.size) throw new Error('اختر نموذجاً واحداً على الأقل'); if (!ppl.size) throw new Error('اختر معلماً واحداً على الأقل');
      const batch = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), due = $('#smD', m.el).value || null, note = $('#smNt', m.el).value.trim();
      const rows = []; [...pick].forEach(id => { const it = lib.list.find(t => t.id === id); [...ppl].forEach(sid => { const tp = withSig(it.tpl), ts = teacherSlot(tp), who = (S.staff || []).find(p => p.id === sid) || {};
        // تعبئة اسم المعلم تلقائياً في حقل «المعلم» إن وُجد
        const d0 = {}; if (mode === 'sign') (tp.blocks || []).forEach(b => { if (b.type !== 'fields') return; (b.fields || []).forEach(f => { if ((f.key === 'teacher' || f.type === 'teacher') && /المعلم|اسم/.test(f.label || '') && !/الزائر/.test(f.label || '')) { (d0[b.id] = d0[b.id] || {})[f.id] = who.full_name || ''; } }); });
        rows.push({ school_id: S.school.id, batch_id: batch, tid: it.id, title: it.name, cat: it.cat, tpl: tp, cfg: lib.cfg || {}, assignee: sid, due_date: due, note, mode, data: d0, cosign: mode === 'sign' && ts ? [{ staff_id: sid, key: ts.key, label: ts.label, status: 'pending', by: S.me.id }] : [], ...(DEMO ? { created_by: S.me.id, status: 'assigned', sigs: {}, teacher_note: '', created_at: new Date().toISOString() } : {}) }); }); });
      for (let k = 0; k < rows.length; k += 50) await api.ins('form_tasks', rows.slice(k, k + 50));
      const names = [...pick].map(id => lib.list.find(t => t.id === id).name).join('، ');
      if (mode === 'sign') { m.close(); A.toast(`أُنشئت ${AR(rows.length)} استمارة تقييم — عبّئها ووقّعها من تبويب «استمارات التقييم» ثم أرسلها للمعلم`, 'ok'); st.tab = 'evals'; after && after(); return; }
      notify([...ppl], 'نموذج جديد للتعبئة: ' + names, `أرسل لك ${S.me.full_name} ${pick.size > 1 ? 'نماذج' : 'نموذج'} «${names}»${due ? ' — الموعد ' + due : ''}. افتح «النماذج والاستمارات».${note ? '\n' + note : ''}`);
      m.close(); A.toast(`أُرسل ${AR(rows.length)} نموذج`, 'ok'); after && after();
    });
  }

  // ---------- الصفحة ----------
  const css = `
  .fm-modal .modal,.modal.fm-modal{max-width:min(1180px,96vw)!important;width:96vw}
  .fm-top{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap}.fm-acts{display:flex;gap:6px;flex-wrap:wrap}
  .fm-frame{width:100%;height:calc(100vh - 230px);min-height:420px;border:1px solid #DCE7F3;border-radius:14px;background:#EEF3F9;margin-top:8px}
  .fm-co{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0}
  .sm-step{display:flex;gap:8px;align-items:center;font-weight:800;color:#082B5A}.sm-step b{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#082B5A;color:#fff;font-size:13px}
  .sm-cats{display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 8px}.sm-cats button{border:1px solid #CFE0F2;background:#fff;color:#082B5A;border-radius:99px;padding:5px 12px;font:inherit;font-weight:700;cursor:pointer}.sm-cats button.on{background:#082B5A;color:#fff}
  .sm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;max-height:330px;overflow:auto;padding:2px}
  .sm-card{position:relative;display:flex;flex-direction:column;gap:4px;border:1.5px solid #DCE7F3;border-radius:14px;padding:10px 12px;background:#fff;cursor:pointer;transition:border-color .15s,box-shadow .15s}
  .sm-card:hover{border-color:#3AB1DB}.sm-card:focus-visible{outline:3px solid #3AB1DB;outline-offset:1px}.sm-card.on{border-color:#2E8B57;box-shadow:0 0 0 3px rgba(46,139,87,.15);background:#F6FBF7}
  .sm-card b{color:#082B5A;padding-inline-end:24px}.sm-card .btn{align-self:flex-start;margin-top:4px}.sm-sl{color:#005499}
  .sm-ck{position:absolute;top:8px;inset-inline-end:8px;width:20px;height:20px;border-radius:50%;border:1.5px solid #CFE0F2;display:grid;place-items:center;color:transparent;font-size:12px}.sm-card.on .sm-ck{background:#2E8B57;border-color:#2E8B57;color:#fff}
  .sm-ppl{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px 12px;max-height:220px;overflow:auto;border:1px solid #E4EBF5;border-radius:12px;padding:8px}
  .sg-wrap{position:relative;border:2px dashed #9CC4E4;border-radius:16px;background:linear-gradient(180deg,#fff,#F5F9FD);touch-action:none}
  .sg-wrap canvas{display:block;width:100%;height:auto;aspect-ratio:3/1;cursor:crosshair;touch-action:none}
  .sg-line{position:absolute;inset-inline:8%;bottom:26%;border-bottom:1.5px solid #CFE0F2;pointer-events:none}.sg-ph{position:absolute;inset:0;display:grid;place-items:center;color:#9AAAC2;font-size:22px;pointer-events:none}
  .fm-ev{background:#EEF3FB;color:#005499}.fm-gh{margin:14px 0 8px;font-size:15px;color:#082B5A}.fm-gh:first-child{margin-top:4px}
  .sm-modes{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px;margin:6px 0}
  .sm-mode{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:start;border:1.5px solid #DCE7F3;border-radius:14px;padding:10px 12px;cursor:pointer;background:#fff}
  .sm-mode input{grid-row:span 2;width:20px;height:20px;margin-top:2px;accent-color:#005499}.sm-mode:has(input:checked){border-color:#005499;background:#F1F7FD;box-shadow:0 0 0 3px rgba(0,84,153,.1)}
  .fm-evb{border-inline-start:4px solid #3AB1DB}
  .fm-list{display:grid;gap:8px}.fm-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;border:1px solid #DCE7F3;border-radius:14px;padding:10px 12px;background:#fff;cursor:pointer;transition:box-shadow .15s,transform .15s}
  .fm-row:hover,.fm-row:focus-visible{box-shadow:0 6px 18px rgba(8,43,90,.1);transform:translateY(-1px);outline:none}.fm-row b{color:#082B5A}
  .fm-row .meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:3px;font-size:12.5px;color:#43597A}
  .fm-ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(135deg,#005499,#3AB1DB);color:#fff;flex:none}.fm-ic svg{width:22px;height:22px}
  .fm-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.fm-tabs button{border:1px solid #CFE0F2;background:#fff;color:#082B5A;border-radius:99px;padding:7px 14px;font:inherit;font-weight:700;cursor:pointer}.fm-tabs button.on{background:#082B5A;color:#fff;border-color:#082B5A}
  .fm-tabs .n{display:inline-block;min-width:20px;padding:0 6px;margin-inline-start:6px;border-radius:99px;background:#D2463F;color:#fff;font-size:11.5px}
  .fm-sig{display:flex;align-items:center;gap:8px;border:1px solid #E4EBF5;border-radius:12px;padding:4px 10px;background:#fff}.fm-sig img{height:30px}
  @media(max-width:600px){.fm-frame{height:calc(100vh - 260px)}.fm-row{grid-template-columns:1fr}}`;
  if (!document.getElementById('app57css')) { const st = document.createElement('style'); st.id = 'app57css'; st.textContent = css; document.head.appendChild(st); }

  const st = { tab: null };
  V.forms = async function (root) {
    root.innerHTML = '<div class="spinner"></div>';
    const adm = isAdmin(), me = S.me.id;
    let all;
    try { all = await api.list('form_tasks', { school_id: S.school.id }, { order: 'created_at', desc: true, select: 'id,school_id,batch_id,tid,title,cat,assignee,created_by,status,cosign,sigs,due_date,note,review_note,mode,teacher_note,submitted_at,decided_at,created_at,updated_at' }); }
    catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', e.message)}</div>`; return; }
    await mySig();
    const mine = all.filter(t => t.assignee === me && !isEval(t)), toSign = all.filter(t => (t.cosign || []).some(c => c.staff_id === me && c.status !== 'signed') && t.status !== 'approved' && !(isEval(t) && t.status === 'assigned'));
    const pendApp = all.filter(t => t.status === 'submitted' && !isEval(t));
    const evals = all.filter(isEval), evDraft = evals.filter(t => ['assigned', 'draft', 'returned'].includes(t.status) && canEditAdmin(t)), myEvals = evals.filter(t => t.assignee === me && t.status !== 'assigned');
    const myOpen = mine.filter(t => ['assigned', 'draft', 'returned'].includes(t.status));
    const tabs = [adm && ['inbox', 'بانتظار الاعتماد', pendApp.length], adm && ['evals', 'استمارات التقييم', evDraft.length], adm && ['track', 'المتابعة', 0], adm && ['rep', 'التقارير', 0], (mine.length || !adm) && ['mine', 'نماذجي', myOpen.length], (toSign.length || !adm) && ['sign', 'بانتظار توقيعي', toSign.length], myEvals.length && ['myevals', 'تقييماتي', 0]].filter(Boolean);
    if (st.user !== me) { st.user = me; st.tab = null; }
    if (!st.tab || !tabs.some(t => t[0] === st.tab)) st.tab = (toSign.length && 'sign') || (myOpen.length && 'mine') || tabs[0][0];
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>النماذج والاستمارات</h2><p class="sub" style="margin:2px 0 0">${adm ? 'أرسل نماذج «خطة ونماذج الإشراف» للمعلمين، وتابع التعبئة والتوقيعات، واعتمدها بتوقيعك.' : 'النماذج المرسلة إليك للتعبئة والتوقيع، وطلبات توقيع الزملاء.'}</p></div>
      <div class="row" style="gap:6px;flex-wrap:wrap">${adm ? `<button class="btn" id="fmSend">${A.I.plus || ''} إرسال نموذج</button>` : ''}<button class="fm-sig btnlike" id="fmMySig" type="button" aria-label="توقيعي الإلكتروني">${MYSIG ? `<img src="${MYSIG}" alt="">` : '✍'} <span class="small">${MYSIG ? 'تغيير توقيعي' : 'إضافة توقيعي'}</span></button></div></div>
      <div class="fm-tabs" role="tablist">${tabs.map(([k, l, n]) => `<button role="tab" data-tb="${k}" class="${st.tab === k ? 'on' : ''}" aria-selected="${st.tab === k}">${l}${n ? `<span class="n">${AR(n)}</span>` : ''}</button>`).join('')}</div><div id="fmO"></div></div>`;
    const reload = () => V.forms(root);
    if ($('#fmSend', root)) $('#fmSend', root).onclick = () => sendModal(reload);
    $('#fmMySig', root).onclick = () => sigModal(() => reload());
    $$('[data-tb]', root).forEach(b => b.onclick = () => { st.tab = b.dataset.tb; reload(); });
    const O = $('#fmO', root);
    const open = async id => { const [t] = await api.list('form_tasks', { id }); if (t) openTask(t, () => { clearTimeout(open._r); open._r = setTimeout(reload, 400); }); };
    const rowHtml = (t, sub) => { const co = t.cosign || [], sg = Object.keys(t.sigs || {}).length;
      return `<div class="fm-row" data-id="${t.id}" tabindex="0" role="button" aria-label="${esc(t.title)}"><div style="display:flex;gap:10px;align-items:center;min-width:0"><span class="fm-ic">${A.I.forms}</span><div style="min-width:0"><b>${esc(t.title)}</b>
        <div class="meta">${sub}${pillT(t)}${t.due_date ? `<span>الموعد ${dt(t.due_date)}</span>` : ''}${overdue(t) ? '<span class="pill st-returned">متأخر</span>' : ''}<span>✍ ${AR(sg)} توقيع</span>${co.length ? `<span>${co.filter(c => c.status === 'signed').length === co.length ? '✓ ' : '⌛ '}زملاء ${AR(co.filter(c => c.status === 'signed').length)}/${AR(co.length)}</span>` : ''}</div></div></div>
        <span class="small muted">${dt(t.updated_at || t.created_at)}</span></div>`; };
    const bindRows = () => $$('[data-id]', O).forEach(r => { r.onclick = () => open(r.dataset.id); r.onkeydown = e => { if (e.key === 'Enter') open(r.dataset.id); }; });
    if (st.tab === 'mine') { O.innerHTML = mine.length ? `<div class="fm-list">${mine.map(t => rowHtml(t, `<span>من ${esc(nm(t.created_by))}</span>`)).join('')}</div>` : A.emptyBox('لا نماذج مرسلة إليك', 'تظهر هنا النماذج التي يرسلها لك المالك أو المشرف'); bindRows(); }
    if (st.tab === 'sign') { O.innerHTML = toSign.length ? `<div class="fm-list">${toSign.map(t => rowHtml(t, `<span>${esc(nm(t.assignee))} يطلب توقيعك في «${esc((t.cosign.find(c => c.staff_id === me) || {}).label || '')}»</span>`)).join('')}</div>` : A.emptyBox('لا طلبات توقيع', 'عندما يطلب زميل توقيعك على نموذج يظهر هنا'); bindRows(); }
    if (st.tab === 'evals') { const grp = [['مسودات لديك — عبّئها ووقّعها ثم أرسلها', evals.filter(t => ['assigned', 'draft', 'returned'].includes(t.status))], ['بانتظار توقيع المعلم', evals.filter(t => t.status === 'submitted')], ['موقّعة ومكتملة', evals.filter(t => t.status === 'approved')]];
      O.innerHTML = evals.length ? grp.filter(g => g[1].length).map(([h, L]) => `<h3 class="fm-gh">${h} <span class="pill">${AR(L.length)}</span></h3><div class="fm-list">${L.map(t => rowHtml(t, `<span>${esc(nm(t.assignee))}</span>${t.teacher_note ? '<span>💬 ملاحظة المعلم</span>' : ''}`)).join('')}</div>`).join('') : A.emptyBox('لا استمارات تقييم بعد', 'من «إرسال نموذج» اختر بطاقة تقييم أو زيارة صفية، واختر «أعبّئه أنا ويوقّع المعلم».'); bindRows(); }
    if (st.tab === 'myevals') { O.innerHTML = `<div class="fm-list">${myEvals.map(t => rowHtml(t, `<span>من ${esc(nm(t.created_by))}</span>`)).join('')}</div>`; bindRows(); }
    if (st.tab === 'inbox') { O.innerHTML = pendApp.length ? `<div class="fm-list">${pendApp.map(t => rowHtml(t, `<span>${esc(nm(t.assignee))}</span><span>أُرسل ${dt(t.submitted_at)}</span>`)).join('')}</div>` : A.emptyBox('لا نماذج بانتظار الاعتماد'); bindRows(); }
    if (st.tab === 'track') track(O, all, open, reload);
    if (st.tab === 'rep') report(O, all);
  };

  function track(O, all, open, reload) {
    const tpls = [...new Set(all.map(t => t.title))].sort((a, b) => a.localeCompare(b, 'ar'));
    O.innerHTML = `<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:8px"><select class="in" id="tkT" style="max-width:240px" aria-label="النموذج"><option value="">كل النماذج</option>${tpls.map(t => `<option>${esc(t)}</option>`).join('')}</select>
      <select class="in" id="tkS" style="max-width:200px" aria-label="الحالة"><option value="">كل الحالات</option>${Object.entries(STS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('')}<option value="late">متأخر</option></select>
      <input class="in" id="tkQ" placeholder="بحث باسم المعلم" style="max-width:220px" aria-label="بحث باسم المعلم"><button class="btn ghost sm" id="tkX">${A.I.down || ''} Excel</button></div>
      <div class="scroll"><table class="tbl"><thead><tr><th>النموذج</th><th>المعلم</th><th>الحالة</th><th>الموعد</th><th>التوقيعات</th><th>الزملاء</th><th>آخر تحديث</th><th></th></tr></thead><tbody id="tkB"></tbody></table></div>`;
    const list = () => { const T = $('#tkT', O).value, s = $('#tkS', O).value, q = A.normKey ? A.normKey($('#tkQ', O).value) : $('#tkQ', O).value; return all.filter(t => (!T || t.title === T) && (!s || (s === 'late' ? overdue(t) : t.status === s)) && (!q || (A.normKey ? A.normKey(nm(t.assignee)) : nm(t.assignee)).includes(q))); };
    const draw = () => { $('#tkB', O).innerHTML = list().map(t => `<tr class="click" data-id="${t.id}"><td><b>${esc(t.title)}</b></td><td>${esc(nm(t.assignee))}</td><td>${pillT(t)}${overdue(t) ? ' <span class="pill st-returned">متأخر</span>' : ''}</td><td>${dt(t.due_date)}</td><td>${AR(Object.keys(t.sigs || {}).length)}</td><td>${(t.cosign || []).map(c => `<span class="small">${esc(nm(c.staff_id))} ${c.status === 'signed' ? '✓' : '⌛'}</span>`).join('<br>') || '—'}</td><td class="small">${dt(t.updated_at)}</td><td><button class="btn ghost sm" data-del="${t.id}" aria-label="حذف">حذف</button></td></tr>`).join('') || `<tr><td colspan="8">${A.emptyBox('لا نتائج')}</td></tr>`;
      $$('tr[data-id]', O).forEach(r => r.onclick = e => { if (e.target.closest('[data-del]')) return; open(r.dataset.id); });
      $$('[data-del]', O).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذا النموذج وما فيه من بيانات وتوقيعات؟', 'حذف', true))) return; A.run(b, async () => { await api.del('form_tasks', b.dataset.del); A.toast('حُذف', 'ok'); reload(); }); }); };
    ['#tkT', '#tkS'].forEach(s => $(s, O).onchange = draw); $('#tkQ', O).oninput = draw; draw();
    $('#tkX', O).onclick = () => { const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] }; const ws = XLSX.utils.json_to_sheet(list().map(t => ({ النموذج: t.title, المعلم: nm(t.assignee), النوع: isEval(t) ? 'استمارة تقييم' : 'يعبّئه المعلم', الحالة: (isEval(t) ? STE : STS)[t.status][0], 'ملاحظة المعلم': t.teacher_note || '', متأخر: overdue(t) ? 'نعم' : '', الموعد: t.due_date || '', 'عدد التوقيعات': Object.keys(t.sigs || {}).length, الزملاء: (t.cosign || []).map(c => nm(c.staff_id) + (c.status === 'signed' ? ' ✓' : ' ⌛')).join('، '), 'أُرسل للاعتماد': t.submitted_at ? String(t.submitted_at).slice(0, 10) : '', 'اعتُمد': t.status === 'approved' ? String(t.decided_at || '').slice(0, 10) : '' }))); ws['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws, 'متابعة النماذج'); XLSX.writeFile(wb, 'متابعة النماذج والاستمارات.xlsx'); };
  }

  function report(O, all) {
    const n = f => all.filter(f).length, tot = all.length;
    const K = [['all', 'المُرسلة', tot, () => true], ['prog', 'قيد التعبئة', n(t => ['assigned', 'draft', 'returned'].includes(t.status)), t => ['assigned', 'draft', 'returned'].includes(t.status)], ['sub', 'بانتظار الاعتماد', n(t => t.status === 'submitted'), t => t.status === 'submitted'], ['app', 'المعتمدة', n(t => t.status === 'approved'), t => t.status === 'approved'], ['late', 'المتأخرة', n(overdue), overdue], ['co', 'بانتظار توقيع زميل', n(t => (t.cosign || []).some(c => c.status !== 'signed')), t => (t.cosign || []).some(c => c.status !== 'signed')]];
    const by = (key) => { const m = new Map(); all.forEach(t => { const k = key(t); const o = m.get(k) || m.set(k, { k, n: 0, sub: 0, app: 0, late: 0 }).get(k); o.n++; if (['submitted', 'approved'].includes(t.status)) o.sub++; if (t.status === 'approved') o.app++; if (overdue(t)) o.late++; }); return [...m.values()].sort((a, b) => b.n - a.n); };
    const T = by(t => t.title), P = by(t => nm(t.assignee));
    const bar = v => `<span class="nr-mini" style="display:inline-block;height:8px;border-radius:4px;vertical-align:middle;width:${Math.round(v * 0.8)}px;background:${v >= 80 ? '#2E8B57' : v >= 50 ? '#3AB1DB' : '#D99A2B'};margin-inline-start:6px"></span>`;
    const pc = (a, b) => b ? Math.round(a / b * 100) : 0;
    O.innerHTML = `<div class="grid g4" style="margin:6px 0 12px">${K.map(([k, l, v], i) => `<button type="button" class="kpi ${i === 0 ? 'navy' : ''} btnlike" data-k="${k}"><span class="more">التفاصيل</span><div class="k">${l}</div><div class="v"${k === 'late' && v ? ' style="color:var(--bad)"' : k === 'app' ? ' style="color:var(--ok)"' : ''}>${AR(v)}</div>${tot && k !== 'all' ? `<div class="d">${AR(pc(v, tot))}٪</div>` : ''}</button>`).join('')}</div>
      <div class="row" style="justify-content:flex-end;margin-bottom:6px"><button class="btn ghost sm" id="rpX">${A.I.down || ''} Excel</button><button class="btn ghost sm" id="rpP">${A.I.print || ''} طباعة</button></div>
      <div id="rpBody"><h3>حسب النموذج</h3><div class="scroll"><table class="tbl"><thead><tr><th>النموذج</th><th>المُرسلة</th><th>سُلِّمت</th><th>اعتُمدت</th><th>نسبة الاعتماد</th><th>متأخرة</th></tr></thead><tbody>${T.map(o => `<tr><td><b>${esc(o.k)}</b></td><td>${AR(o.n)}</td><td>${AR(o.sub)}</td><td>${AR(o.app)}</td><td>${AR(pc(o.app, o.n))}٪${bar(pc(o.app, o.n))}</td><td>${o.late ? `<span class="pill st-returned">${AR(o.late)}</span>` : '—'}</td></tr>`).join('') || `<tr><td colspan="6">${A.emptyBox('لا نماذج مرسلة بعد')}</td></tr>`}</tbody></table></div>
      <h3 style="margin-top:14px">حسب المعلم</h3><div class="scroll"><table class="tbl"><thead><tr><th>المعلم</th><th>المُرسلة إليه</th><th>سلّم</th><th>اعتُمد</th><th>الإنجاز</th><th>متأخر</th></tr></thead><tbody>${P.map(o => `<tr><td><b>${esc(o.k)}</b></td><td>${AR(o.n)}</td><td>${AR(o.sub)}</td><td>${AR(o.app)}</td><td>${AR(pc(o.sub, o.n))}٪${bar(pc(o.sub, o.n))}</td><td>${o.late ? `<span class="pill st-returned">${AR(o.late)}</span>` : '—'}</td></tr>`).join('') || `<tr><td colspan="6">—</td></tr>`}</tbody></table></div></div>`;
    $$('[data-k]', O).forEach(b => b.onclick = () => { const k = K.find(x => x[0] === b.dataset.k); A.attDrill && A.attDrill({ title: 'النماذج — ' + k[1], cols: ['النموذج', 'المعلم', 'الحالة', 'الموعد', 'آخر تحديث'], rows: all.filter(k[3]).map(t => ({ q: t.title + ' ' + nm(t.assignee), cells: [`<b>${esc(t.title)}</b>`, esc(nm(t.assignee)), pillT(t), dt(t.due_date), dt(t.updated_at)] })) }); });
    $('#rpP', O).onclick = () => A.printDoc('تقرير النماذج والاستمارات', S.school.name || '', K.map(([, l, v]) => `<span class="k">${l}<b>${AR(v)}</b></span>`).join('') + $('#rpBody', O).innerHTML);
    $('#rpX', O).onclick = () => { const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] }; const add = (nmS, rows) => { const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ '': 'لا بيانات' }]); ws['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws, nmS); };
      add('حسب النموذج', T.map(o => ({ النموذج: o.k, المرسلة: o.n, سلمت: o.sub, اعتمدت: o.app, 'نسبة الاعتماد %': pc(o.app, o.n), متأخرة: o.late }))); add('حسب المعلم', P.map(o => ({ المعلم: o.k, المرسلة: o.n, سلم: o.sub, اعتمد: o.app, 'الإنجاز %': pc(o.sub, o.n), متأخر: o.late })));
      XLSX.writeFile(wb, 'تقرير النماذج والاستمارات.xlsx'); };
  }

  // ---------- تنبيه لحظي ----------
  let subbed = false;
  const prev = window.APP_AFTER_WEEK;
  window.APP_AFTER_WEEK = async function () {
    if (prev) await prev.apply(this, arguments);
    if (subbed || !api.subscribe || !S.me) return; subbed = true;
    try { api.subscribe('ft-' + S.me.id, 'form_tasks', null, p => { const r = p && p.new; if (!r) return;
      if (r.assignee === S.me.id && p.eventType === 'INSERT') A.toast('وصلك نموذج جديد: ' + (r.title || ''), 'info');
      else if ((r.cosign || []).some(c => c.staff_id === S.me.id && c.status === 'pending') && !(p.old && (p.old.cosign || []).some(c => c.staff_id === S.me.id))) A.toast('مطلوب توقيعك على: ' + (r.title || ''), 'info');
      else if (isAdmin() && r.status === 'submitted' && p.old && p.old.status !== 'submitted') A.toast('نموذج بانتظار اعتمادك: ' + (r.title || ''), 'info'); }); } catch (_) { }
  };
  A._forms = { openTask, sendModal, sigModal, slotState };
})();
