/* منصة دينا — الموارد البشرية: حضور الموظفين وانصرافهم (الموقع الجغرافي + رمز QR متغير + رصد يدوي)،
   لوحة اليوم، السجل والتقارير والتصدير، المساءلات (من نموذج «طلب إفادة» بهوية المدرسة)، والإعدادات.
   الغياب المرصود يُغذّي «تأمين حصص اليوم» تلقائياً، ولا يُحتسب واجب المعلم الغائب. sql/096 */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  const DEMO = !!api.demo;
  const ST = { present: ['حاضر', 'hr-p'], late: ['متأخر', 'hr-l'], absent: ['غائب', 'hr-a'], excused: ['مستأذن', 'hr-e'], leave: ['إجازة', 'hr-v'], early: ['انصراف مبكر', 'hr-o'] };
  const isAdm = () => !!(S.me && !S.realMe && (S.me.is_owner || (A.tfeat('hr') && A.hasModule && A.hasModule('hr'))));
  const cfg = () => Object.assign({ enabled: false, gps: true, qr: false, radius: 150, start: '07:00', grace: 10, end: '13:30', days: [0, 1, 2, 3, 4], excl: [] }, ((S.school || {}).settings || {}).hr || {});
  const todayIso = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const hm = s => s ? new Date(s).toLocaleTimeString('ar-SA-u-nu-latn', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Riyadh' }) : '—';
  const people = () => (S.staff || []).filter(p => p.active && !p.is_test && !p.is_owner).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
  const pill = s => `<span class="hr-pill ${(ST[s] || ['', ''])[1]}">${(ST[s] || [s || 'لم يسجّل'])[0]}</span>`;

  A.I.hr = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.7-3 3-4.8 5.5-4.8S13.8 16 14.5 19"/><path d="M16 11l2 2 3.5-3.5"/><path d="M16 4.5h5M18.5 2v5" opacity=".0"/></svg>';
  if (A.NAV && !A.NAV.some(n => n[0] === 'hr')) { const i = A.NAV.findIndex(n => n[0] === 'attendance'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['hr', 'الموارد البشرية', () => !!S.me && (isAdm() || (A.tfeat('hr') && cfg().enabled))]); }
  if (A.NOTIF_KINDS && !A.NOTIF_KINDS.hr) A.NOTIF_KINDS.hr = ['الموارد البشرية', 'الحضور والتأخر والغياب'];

  if (!document.getElementById('hrcss')) { const st = document.createElement('style'); st.id = 'hrcss'; st.textContent = `
.hr-pill{display:inline-flex;align-items:center;gap:5px;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:800;white-space:nowrap;background:#EEF1F5;color:#5b6b7f}
.hr-pill::before{content:'';width:7px;height:7px;border-radius:50%;background:currentColor}
.hr-p{background:#E5F3EA;color:#2E8B57}.hr-l{background:#FFF3DC;color:#8a5a00}.hr-a{background:#FDE8E6;color:#B42318}.hr-e{background:#E8F1F9;color:#005499}.hr-v{background:#F0EBFA;color:#5B3FA8}.hr-o{background:#FFF0E0;color:#9A4B00}
.hr-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin:12px 0}
.hr-kpi{border:1px solid #DCE7F3;border-radius:16px;padding:12px 14px;background:linear-gradient(180deg,#fff,#F5F9FD);box-shadow:0 10px 22px -18px rgba(8,43,90,.5),inset 0 -3px 0 var(--c,#3AB1DB);text-align:start;font:inherit;cursor:pointer}
.hr-kpi b{display:block;font-size:26px;color:#082B5A;line-height:1.1}.hr-kpi span{font-size:12.5px;color:#4D6A8F}
.hr-kpi:focus-visible{outline:3px solid #3AB1DB}
.hr-row-acts{display:flex;gap:4px;flex-wrap:wrap}.hr-row-acts button{border:1px solid #DCE7F3;background:#fff;border-radius:9px;padding:3px 8px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;color:#43597A}
.hr-row-acts button.on{background:#082B5A;color:#fff;border-color:#082B5A}.hr-row-acts button:focus-visible{outline:2px solid #3AB1DB}
.hr-me{display:flex;gap:14px;align-items:center;flex-wrap:wrap;border-radius:20px;padding:16px;background:linear-gradient(135deg,#082B5A,#005499 60%,#3AB1DB);color:#fff;box-shadow:0 18px 34px -22px rgba(8,43,90,.9)}
.hr-me .grow{min-width:200px}.hr-me b{font-size:18px}.hr-me .small{color:#D6E9F8}
.hr-me .btn{background:#fff;color:#082B5A}.hr-me .btn.ghost{background:transparent;color:#fff;border-color:rgba(255,255,255,.5)}
.hr-big{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;background:rgba(255,255,255,.14)}.hr-big svg{width:34px;height:34px}
.hr-qr{display:grid;place-items:center;gap:10px;text-align:center}.hr-qr .q{width:min(70vmin,420px);background:#fff;padding:14px;border-radius:22px;box-shadow:0 20px 50px -20px rgba(8,43,90,.6)}
.hr-qr .tk{font-size:34px;font-weight:900;letter-spacing:.2em;color:#082B5A;direction:ltr}
.hr-ring{height:8px;width:min(70vmin,420px);background:#E6EDF4;border-radius:8px;overflow:hidden}.hr-ring i{display:block;height:100%;background:linear-gradient(90deg,#2E8B57,#BADF93);transition:width 1s linear}
@media (prefers-reduced-motion:reduce){.hr-ring i{transition:none}}
.hr-set{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))}
.hr-map{border:1px solid #DCE7F3;border-radius:14px;padding:10px 12px;background:#F7FBFE}
`; document.head.appendChild(st); }

  // ---------- استدعاءات (مع محاكاة للتجربة) ----------
  async function attList(q) { try { return await api.list('staff_att', { school_id: S.school.id, ...q }, { order: 'day' }); } catch (_) { return []; } }
  async function mark(staff, day, status, note, late) {
    if (DEMO) { const [x] = await api.list('staff_att', { staff_id: staff, day }); if (status === 'clear') { if (x) await api.del('staff_att', x.id); return; } const row = { status, note: note || (x || {}).note || '', late_min: late ?? (status === 'late' ? (x || {}).late_min || 0 : 0), method: 'manual', by_staff: S.me.id, check_in: (x || {}).check_in || (['present', 'late'].includes(status) ? new Date().toISOString() : null) }; if (x) await api.upd('staff_att', x.id, row); else await api.ins('staff_att', [{ id: 'sa' + Date.now() + Math.random(), school_id: S.school.id, staff_id: staff, day, ...row }]); return; }
    return api.rpc('hr_mark', { p_staff: staff, p_day: day, p_status: status, p_note: note || '', p_late: late ?? null });
  }
  async function autoAbsent(day) {
    if (DEMO) { const have = new Set((await attList({ day })).map(x => x.staff_id)); let n = 0; for (const p of people()) if (!have.has(p.id) && !cfg().excl.includes(p.id)) { await mark(p.id, day, 'absent', 'لم يسجّل حضوره'); n++; } return n; }
    return api.rpc('hr_auto_absent', { p_day: day });
  }
  async function token() {
    if (DEMO) { const w = Math.floor(Date.now() / 30000); return { token: (w.toString(36).toUpperCase() + 'DINA').slice(-8), left: 30 - Math.floor(Date.now() / 1000) % 30 }; }
    return api.rpc('hr_token', {});
  }
  async function saveCfg(patch) {
    const hr = { ...cfg(), ...patch }; if (!hr.secret) hr.secret = (crypto.randomUUID ? crypto.randomUUID() : String(Math.random())).replace(/-/g, '');
    const settings = { ...(S.school.settings || {}), hr }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings;
  }

  // لا يُحتسب واجب المعلم الغائب: يحذف من الحساب حصص الأيام التي غاب فيها المعلم (رصد الموارد البشرية أو سجل التأمين)
  A.dropAbsent = async function (entries, wk) {
    try {
      if (!wk || !entries || !entries.length) return entries;
      const dates = A.weekDates(wk, (A.section() || {}).days || 5).map(d => A.isoDate(d));
      const [att, subs] = await Promise.all([api.list('staff_att', { school_id: S.school.id }, { gte: { day: dates[0] }, lte: { day: dates[dates.length - 1] } }).catch(() => []), api.list('substitutions', { section_id: wk.section_id }, { gte: { day: dates[0] }, lte: { day: dates[dates.length - 1] } }).catch(() => [])]);
      const off = new Set(att.filter(x => ['absent', 'leave'].includes(x.status)).map(x => x.staff_id + '|' + x.day));
      const cov = new Set(subs.filter(x => x.absent_teacher).map(x => x.day + '|' + x.class_id + '|' + x.period));
      if (!off.size && !cov.size) return entries;
      return entries.filter(e => { const d = dates[e.day]; return !(off.has(e.teacher_id + '|' + d) || cov.has(d + '|' + e.class_id + '|' + e.period)); });
    } catch (_) { return entries; }
  };

  // ---------- تسجيل الموظف لنفسه ----------
  function geo() { return new Promise((res, rej) => { if (!navigator.geolocation) return rej(new Error('هذا الجهاز لا يدعم تحديد الموقع')); navigator.geolocation.getCurrentPosition(p => res(p.coords), e => rej(new Error(e.code === 1 ? 'اسمح للمنصة باستخدام موقعك من إعدادات المتصفح' : 'تعذّر تحديد موقعك — أعد المحاولة في مكان مفتوح')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }); }); }
  async function selfCheck(out, tok) {
    const c = cfg(); let co = null;
    if (c.gps) co = await geo();
    if (c.qr && !tok) { tok = await promptToken(); if (!tok) return null; }
    if (DEMO) { const day = todayIso(); const [x] = await api.list('staff_att', { staff_id: S.me.id, day }); if (out) { if (!x) throw new Error('لم يُسجَّل حضورك اليوم'); await api.upd('staff_att', x.id, { check_out: new Date().toISOString() }); return x; } if (x && x.check_in) return x; const now = new Date(Date.now() + 3 * 36e5); const [h, m] = c.start.split(':').map(Number); const lm = Math.max(0, now.getUTCHours() * 60 + now.getUTCMinutes() - (h * 60 + m)); const row = { id: 'sa' + Date.now(), school_id: S.school.id, staff_id: S.me.id, day, status: lm > c.grace ? 'late' : 'present', late_min: lm > c.grace ? lm : 0, check_in: new Date().toISOString(), method: c.gps ? 'gps' : 'qr', dist: 25 }; await api.ins('staff_att', [row]); return row; }
    return api.rpc('hr_checkin', { p_lat: co ? co.latitude : null, p_lng: co ? co.longitude : null, p_acc: co ? co.accuracy : null, p_token: tok || null, p_out: !!out });
  }
  function promptToken() { return new Promise(res => { const m = A.modal(`<h3>رمز الحضور</h3><p class="sub">امسح رمز QR الظاهر على شاشة المدرسة بكاميرا جوالك، أو اكتب الرمز المكتوب تحته.</p><div class="field"><label for="hrTk">الرمز</label><input class="in" id="hrTk" dir="ltr" autocomplete="off" style="font-size:22px;letter-spacing:.2em;text-align:center" maxlength="8"></div><button class="btn" id="hrTkGo">تسجيل</button>`); let done = false; m.el.querySelector('#hrTkGo').onclick = () => { const v = m.el.querySelector('#hrTk').value.trim(); if (!v) return; done = true; m.close(); res(v); }; const o = new MutationObserver(() => { if (!document.body.contains(m.el)) { o.disconnect(); if (!done) res(null); } }); o.observe(document.body, { childList: true, subtree: true }); setTimeout(() => m.el.querySelector('#hrTk').focus(), 50); }); }
  async function meCard(box) {
    const c = cfg(); if (!c.enabled || S.realMe) { box.innerHTML = ''; return; }
    const [x] = await attList({ staff_id: S.me.id, day: todayIso() });
    const ic = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>';
    box.innerHTML = `<div class="hr-me"><div class="hr-big">${ic}</div><div class="grow"><b>${x && x.check_in ? (x.check_out ? 'سُجّل انصرافك اليوم' : 'سُجّل حضورك اليوم') : 'سجّل حضورك اليوم'}</b><div class="small">${x && x.check_in ? `الحضور ${hm(x.check_in)}${x.late_min ? ` · متأخر ${AR(x.late_min)} دقيقة` : ''}${x.check_out ? ` · الانصراف ${hm(x.check_out)}` : ''}` : `بداية الدوام ${esc(c.start)} · ${c.gps ? 'يُتحقق من وجودك داخل المدرسة' : ''}${c.gps && c.qr ? ' + ' : ''}${c.qr ? 'رمز الشاشة' : ''}`}</div></div>
      ${x && x.check_in ? (x.check_out ? pill(x.status) : `<button class="btn" id="hrOut">تسجيل الانصراف</button>`) : `<button class="btn" id="hrIn">تسجيل الحضور</button>`}</div>`;
    const go = (out) => async e => A.run(e.currentTarget, async () => { const r = await selfCheck(out); if (!r) return; A.toast(out ? 'سُجّل انصرافك' : (r.status === 'late' ? `سُجّل حضورك — متأخر ${AR(r.late_min)} دقيقة` : 'سُجّل حضورك، يومك سعيد'), r.status === 'late' ? 'warn' : 'ok'); meCard(box); });
    const bi = box.querySelector('#hrIn'); if (bi) bi.onclick = go(false); const bo = box.querySelector('#hrOut'); if (bo) bo.onclick = go(true);
  }
  // على الصفحة الرئيسية
  const prevHome = V.home;
  V.home = function (root) { const r = prevHome.apply(this, arguments); if (cfg().enabled && !S.realMe && !S.me.is_owner && A.tfeat('hr')) { const b = document.createElement('div'); b.style.marginBottom = '12px'; root.prepend(b); meCard(b).catch(() => { }); } return r; };

  // ---------- الصفحة ----------
  const st = { tab: null, day: null, month: null };
  V.hr = async function (root) {
    const adm = isAdm();
    if (!adm) { root.innerHTML = `<div class="card"><h2>حضوري</h2><div id="hrMe"></div><div id="hrMine" style="margin-top:12px"></div></div>`; await meCard($('#hrMe', root)); mineLog($('#hrMine', root)); return; }
    if (/cover=1/.test(location.hash)) st.tab = 'today';
    st.tab = st.tab || A.LS.get('hr_t') || 'today'; st.day = st.day || todayIso();
    const T = [['today', 'اليوم'], ['log', 'السجل والتقارير'], ['acc', 'المساءلات'], ['qr', 'شاشة رمز الحضور'], ['set', 'الإعدادات']];
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>الموارد البشرية — حضور الموظفين</h2><p class="sub" style="margin:2px 0 0">${cfg().enabled ? `الدوام ${esc(cfg().start)}–${esc(cfg().end)} · سماح ${AR(cfg().grace)} د · ${cfg().gps ? 'الموقع' : ''}${cfg().gps && cfg().qr ? ' + ' : ''}${cfg().qr ? 'رمز QR' : ''}` : 'تسجيل الحضور الذاتي غير مفعّل — فعّله من «الإعدادات». الرصد اليدوي متاح دائماً.'}</p></div></div>
      <div class="fm-tabs" role="tablist">${T.map(([k, l]) => `<button role="tab" data-t="${k}" class="${st.tab === k ? 'on' : ''}" aria-selected="${st.tab === k}">${l}</button>`).join('')}</div><div id="hrB"></div></div>`;
    $$('[data-t]', root).forEach(b => b.onclick = () => { st.tab = b.dataset.t; A.LS.set('hr_t', st.tab); V.hr(root); });
    const B = $('#hrB', root);
    ({ today, log, acc, qr, set })[st.tab](B, root);
  };

  async function today(B, root) {
    const day = st.day; const rows = await attList({ day }); const by = {}; rows.forEach(r => by[r.staff_id] = r);
    const P = people(); const cnt = k => P.filter(p => (by[p.id] || {}).status === k).length; const none = P.filter(p => !by[p.id]).length;
    let f = '';
    B.innerHTML = `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:end"><div class="field" style="margin:0"><label for="hrD">اليوم</label><input class="in" type="date" id="hrD" value="${day}"></div>
        <button class="btn ghost" id="hrAuto">رصد غياب من لم يسجّل</button><button class="btn" id="hrCover">تأمين حصص الغائبين</button><button class="btn ghost" id="hrPr">${A.I.print || ''} طباعة</button></div>
      <div class="hr-kpis">${[['present', 'حاضر', '#2E8B57'], ['late', 'متأخر', '#D99A1E'], ['absent', 'غائب', '#B42318'], ['excused', 'مستأذن', '#005499'], ['leave', 'إجازة', '#5B3FA8'], ['none', 'لم يسجّل', '#8A97A8']].map(([k, l, c]) => `<button class="hr-kpi" data-f="${k}" style="--c:${c}"><b>${AR(k === 'none' ? none : cnt(k))}</b><span>${l}</span></button>`).join('')}</div>
      <input class="in" id="hrQ" placeholder="بحث بالاسم" style="max-width:280px;margin-bottom:8px" aria-label="بحث">
      <div class="scroll"><table class="tbl"><thead><tr><th>الموظف</th><th>الحالة</th><th>الحضور</th><th>الانصراف</th><th>الطريقة</th><th>رصد يدوي</th></tr></thead><tbody id="hrT"></tbody></table></div>`;
    const draw = () => { const q = A.normKey($('#hrQ', B).value);
      $('#hrT', B).innerHTML = P.filter(p => (!q || A.normKey(p.full_name).includes(q)) && (!f || (f === 'none' ? !by[p.id] : (by[p.id] || {}).status === f))).map(p => { const r = by[p.id] || {};
        return `<tr><td><b>${esc(p.full_name)}</b>${r.note ? `<div class="small muted">${esc(r.note)}</div>` : ''}</td><td>${pill(r.status)}${r.late_min ? ` <span class="small">${AR(r.late_min)} د</span>` : ''}</td><td>${hm(r.check_in)}</td><td>${hm(r.check_out)}</td><td class="small">${esc({ gps: 'الموقع', qr: 'رمز QR', 'gps+qr': 'الموقع + QR', manual: 'يدوي', auto: 'آلي', self: 'ذاتي' }[r.method] || '—')}${r.dist != null ? ` · ${AR(r.dist)} م` : ''}</td>
          <td><div class="hr-row-acts">${['present', 'late', 'absent', 'excused', 'leave'].map(k => `<button data-mk="${p.id}|${k}" class="${r.status === k ? 'on' : ''}" aria-pressed="${r.status === k}">${ST[k][0]}</button>`).join('')}${r.status ? `<button data-mk="${p.id}|clear" aria-label="مسح">×</button>` : ''}</div></td></tr>`; }).join('') || `<tr><td colspan="6">${A.emptyBox('لا نتائج')}</td></tr>`;
      $$('[data-mk]', B).forEach(b => b.onclick = async () => { const [id, k] = b.dataset.mk.split('|'); let note = '', late = null;
        if (k === 'late') { const v = await ask('دقائق التأخر', (by[id] || {}).late_min || 15, 'number'); if (v == null) return; late = +v || 0; }
        if (k === 'excused' || k === 'leave') { const v = await ask(k === 'leave' ? 'نوع الإجازة أو ملاحظة' : 'سبب الاستئذان', ''); if (v == null) return; note = v; }
        await A.run(b, async () => { await mark(id, day, k, note, late); A.toast('حُفظ', 'ok'); today(B, root); }); }); };
    $('#hrQ', B).oninput = draw; $$('[data-f]', B).forEach(b => b.onclick = () => { f = f === b.dataset.f ? '' : b.dataset.f; $$('[data-f]', B).forEach(x => x.style.outline = x.dataset.f === f ? '3px solid #3AB1DB' : ''); draw(); }); draw();
    $('#hrD', B).onchange = e => { st.day = e.target.value; today(B, root); };
    $('#hrAuto', B).onclick = e => A.run(e.currentTarget, async () => { if (!(await A.confirmBox(`رصد «غائب» لكل من لم يسجّل حضوره يوم ${esc(A.arDate ? A.arDate(day) : day)}؟<br><span class="small muted">يُستثنى المالك ومن استثنيتهم في الإعدادات، ويمكنك تعديل أي حالة بعدها.</span>`, 'رصد'))) return; const n = await autoAbsent(day); A.toast(`رُصد ${A.cnt(n || 0, 'غائب', 'غائبين')}`, 'ok'); today(B, root); });
    $('#hrCover', B).onclick = () => { const abs = rows.filter(r => ['absent', 'leave'].includes(r.status)).map(r => r.staff_id); A.LS.set('sb_day', day); A.LS.set('sb_abs_' + day, abs.join(',')); A.LS.set('sb_t', 'cover'); A.LS.set('studio_t', 'standby'); location.hash = '#/studio'; };
    $('#hrPr', B).onclick = () => A.printDoc('كشف حضور الموظفين', `${A.arDate ? A.arDate(day) : day}`, `<table><tr><th>م</th><th>الموظف</th><th>الحالة</th><th>الحضور</th><th>الانصراف</th><th>ملاحظة</th></tr>${P.map((p, i) => { const r = by[p.id] || {}; return `<tr><td>${AR(i + 1)}</td><td>${esc(p.full_name)}</td><td>${(ST[r.status] || ['لم يسجّل'])[0]}${r.late_min ? ` (${AR(r.late_min)} د)` : ''}</td><td>${hm(r.check_in)}</td><td>${hm(r.check_out)}</td><td>${esc(r.note || '')}</td></tr>`; }).join('')}</table>`, false);
  }
  function ask(label, val, type) { return new Promise(res => { const m = A.modal(`<h3>${esc(label)}</h3><input class="in" id="hrAsk" type="${type || 'text'}" value="${esc(String(val ?? ''))}"><div class="acts"><button class="btn" id="hrAskGo">حفظ</button></div>`); let done = false; m.el.querySelector('#hrAskGo').onclick = () => { done = true; const v = m.el.querySelector('#hrAsk').value; m.close(); res(v); }; const o = new MutationObserver(() => { if (!document.body.contains(m.el)) { o.disconnect(); if (!done) res(null); } }); o.observe(document.body, { childList: true, subtree: true }); }); }

  const monthRange = mo => { const [y, m] = mo.split('-').map(Number); const a = `${mo}-01`; const e = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); return [a, e]; };
  async function log(B) {
    st.month = st.month || todayIso().slice(0, 7); const [a, e] = monthRange(st.month);
    const rows = (await api.list('staff_att', { school_id: S.school.id }, { gte: { day: a }, lte: { day: e } }).catch(() => []));
    const P = people(); const agg = {}; P.forEach(p => agg[p.id] = { p, present: 0, late: 0, absent: 0, excused: 0, leave: 0, early: 0, lm: 0 });
    rows.forEach(r => { const g = agg[r.staff_id]; if (!g) return; g[r.status] = (g[r.status] || 0) + 1; g.lm += r.late_min || 0; });
    const L = Object.values(agg).sort((x, y) => (y.absent * 3 + y.late) - (x.absent * 3 + x.late));
    const tbl = pr => `<table class="${pr ? '' : 'tbl'}"><thead><tr><th>الموظف</th><th>حضور</th><th>تأخر</th><th>دقائق التأخر</th><th>غياب</th><th>استئذان</th><th>إجازة</th><th>انصراف مبكر</th></tr></thead><tbody>${L.map(g => `<tr><td><b>${esc(g.p.full_name)}</b></td><td>${AR(g.present)}</td><td>${AR(g.late)}</td><td>${AR(g.lm)}</td><td>${g.absent ? `<b style="color:#B42318">${AR(g.absent)}</b>` : '٠'}</td><td>${AR(g.excused)}</td><td>${AR(g.leave)}</td><td>${AR(g.early)}</td></tr>`).join('')}</tbody></table>`;
    B.innerHTML = `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:end"><div class="field" style="margin:0"><label for="hrM">الشهر</label><input class="in" type="month" id="hrM" value="${st.month}"></div><button class="btn ghost" id="hrX">تصدير Excel</button><button class="btn ghost" id="hrP">${A.I.print || ''} طباعة</button></div>
      <div class="scroll" style="margin-top:10px">${tbl()}</div><p class="small muted">التصدير يشمل السجل اليومي التفصيلي وملخص كل موظف — مناسب للرفع لأنظمة الموارد البشرية.</p>`;
    $('#hrM', B).onchange = ev => { st.month = ev.target.value; log(B); };
    $('#hrP', B).onclick = () => A.printDoc('تقرير حضور الموظفين', st.month, tbl(true), true);
    $('#hrX', B).onclick = () => { if (!window.XLSX) return A.toast('مكتبة Excel غير محملة', 'err'); const wb = XLSX.utils.book_new();
      const s1 = XLSX.utils.json_to_sheet(L.map(g => ({ 'الموظف': g.p.full_name, 'الهوية/الرقم': g.p.national_id || g.p.emp_no || '', 'حضور': g.present, 'تأخر': g.late, 'دقائق التأخر': g.lm, 'غياب': g.absent, 'استئذان': g.excused, 'إجازة': g.leave, 'انصراف مبكر': g.early }))); s1['!views'] = [{ RTL: true }];
      const s2 = XLSX.utils.json_to_sheet(rows.map(r => ({ 'التاريخ': r.day, 'الموظف': A.personName(r.staff_id), 'الحالة': (ST[r.status] || [r.status])[0], 'الحضور': hm(r.check_in), 'الانصراف': hm(r.check_out), 'دقائق التأخر': r.late_min || 0, 'الطريقة': r.method, 'المسافة (م)': r.dist ?? '', 'ملاحظة': r.note || '' }))); s2['!views'] = [{ RTL: true }];
      XLSX.utils.book_append_sheet(wb, s1, 'الملخص'); XLSX.utils.book_append_sheet(wb, s2, 'السجل اليومي'); XLSX.writeFile(wb, `حضور-الموظفين-${st.month}.xlsx`); };
  }

  async function acc(B) {
    st.month = st.month || todayIso().slice(0, 7); const [a, e] = monthRange(st.month);
    const [rows, tasks] = await Promise.all([api.list('staff_att', { school_id: S.school.id }, { gte: { day: a }, lte: { day: e } }).catch(() => []), api.list('form_tasks', { school_id: S.school.id }, { select: 'id,batch_id' }).catch(() => [])]);
    const done = new Set(tasks.map(t => t.batch_id));
    const L = rows.filter(r => ['late', 'absent', 'early'].includes(r.status)).sort((x, y) => y.day.localeCompare(x.day));
    B.innerHTML = `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:end"><div class="field" style="margin:0"><label for="acM">الشهر</label><input class="in" type="month" id="acM" value="${st.month}"></div><span class="small muted">تُصدر المساءلة من نموذج «طلب إفادة» في خطة ونماذج الإشراف بهوية المدرسة، وتصل للموظف للاطلاع والتوقيع والرد.</span></div>
      <div class="scroll" style="margin-top:10px"><table class="tbl"><thead><tr><th>التاريخ</th><th>الموظف</th><th>الواقعة</th><th></th></tr></thead><tbody>${L.map(r => { const key = r.id; return `<tr><td>${esc(A.arDate ? A.arDate(r.day) : r.day)}</td><td><b>${esc(A.personName(r.staff_id))}</b></td><td>${pill(r.status)}${r.late_min ? ` ${AR(r.late_min)} د` : ''}</td><td>${done.has(key) ? '<span class="pill st-approved">صدرت مساءلة</span>' : `<button class="btn sm" data-q="${r.id}">إصدار مساءلة</button>`}</td></tr>`; }).join('') || `<tr><td colspan="4">${A.emptyBox('لا وقائع تأخر أو غياب في هذا الشهر')}</td></tr>`}</tbody></table></div>`;
    $('#acM', B).onchange = ev => { st.month = ev.target.value; acc(B); };
    $$('[data-q]', B).forEach(b => b.onclick = () => A.run(b, async () => { const r = L.find(x => x.id === b.dataset.q); await issueQuery(r); A.toast('أُصدرت المساءلة ووصلت للموظف', 'ok'); acc(B); }));
  }
  async function issueQuery(r) {
    if (!A.formsLoadLib) throw new Error('وحدة النماذج غير متاحة');
    const lib = await A.formsLoadLib(); const it = lib.list.find(t => t.id === 'l-query') || lib.list.find(t => /مساءلة|إفادة/.test(t.name)); if (!it) throw new Error('لم يُعثر على نموذج «طلب إفادة» في المكتبة');
    const tp = A.formsWithSig(it.tpl); const who = A.person(r.staff_id) || {};
    const subj = r.status === 'absent' ? `الغياب يوم ${A.arDate ? A.arDate(r.day) : r.day}` : r.status === 'late' ? `التأخر الصباحي يوم ${A.arDate ? A.arDate(r.day) : r.day} (${r.late_min} دقيقة)` : `الانصراف المبكر يوم ${A.arDate ? A.arDate(r.day) : r.day}`;
    const d0 = {}; (tp.blocks || []).forEach(b => { if (b.type !== 'fields') return; (b.fields || []).forEach(f => { if (f.key === 'teacher') (d0[b.id] = d0[b.id] || {})[f.id] = who.full_name || ''; if (f.key === 'subject') (d0[b.id] = d0[b.id] || {})[f.id] = subj; if (f.key === 'date') (d0[b.id] = d0[b.id] || {})[f.id] = todayIso(); }); });
    const ts = A.formsTeacherSlot ? A.formsTeacherSlot(tp) : null;
    const row = { school_id: S.school.id, batch_id: r.id, tid: it.id, title: 'مساءلة: ' + subj, cat: it.cat, tpl: tp, cfg: lib.cfg || {}, assignee: r.staff_id, note: 'صادرة من الموارد البشرية — اطّلع ووقّع، ويمكنك إضافة ردك (ملاحظتي).', mode: 'sign', perms: { a: 'sign', c: 'sign', share: 'admin', endorse: false }, data: d0, cosign: ts ? [{ staff_id: r.staff_id, key: ts.key, label: ts.label, status: 'pending', by: S.me.id }] : [], ...(DEMO ? { created_by: S.me.id, status: 'assigned', sigs: {}, created_at: new Date().toISOString() } : {}) };
    await api.ins('form_tasks', [row]);
  }

  async function qr(B) {
    B.innerHTML = `<div class="hr-qr"><p class="sub">اعرض هذه الشاشة عند مدخل المدرسة (جهاز أو شاشة). يمسحها الموظف بجواله فيُسجَّل حضوره. يتغير الرمز كل ٣٠ ثانية فلا يصلح تصويره وإرساله.</p><div class="q" id="qrQ"></div><div class="tk" id="qrT">——</div><div class="hr-ring"><i id="qrR" style="width:100%"></i></div><button class="btn ghost" id="qrF">ملء الشاشة</button></div>`;
    let alive = true; const obs = new MutationObserver(() => { if (!document.body.contains(B) || !$('#qrQ', B)) { alive = false; obs.disconnect(); } }); obs.observe(document.body, { childList: true, subtree: true });
    const base = location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html?att=';
    const tick = async () => { if (!alive || !$('#qrQ', B)) return; try { const t = await token(); const q = window.qrcode(0, 'M'); q.addData(base + t.token); q.make(); $('#qrQ', B).innerHTML = q.createSvgTag({ cellSize: 6, margin: 1, scalable: true }); $('#qrT', B).textContent = t.token; const r = $('#qrR', B); r.style.transition = 'none'; r.style.width = (t.left / 30 * 100) + '%'; requestAnimationFrame(() => { r.style.transition = ''; r.style.width = '0%'; r.style.transitionDuration = t.left + 's'; }); setTimeout(tick, t.left * 1000 + 200); } catch (e) { $('#qrT', B).textContent = e.message; setTimeout(tick, 10000); } };
    tick(); $('#qrF', B).onclick = () => { const el = $('.hr-qr', B); (el.requestFullscreen || el.webkitRequestFullscreen || (() => { })).call(el); };
  }

  function set(B) {
    const c = cfg(); const P = people();
    B.innerHTML = `<label class="chk" style="font-weight:800;margin-bottom:10px"><input type="checkbox" id="sEn" ${c.enabled ? 'checked' : ''}> تفعيل تسجيل الحضور الذاتي للموظفين</label>
      <div class="hr-set"><div class="hr-map"><b>موقع المدرسة</b><div class="grid g2" style="margin-top:6px"><div class="field"><label for="sLat">خط العرض</label><input class="in" id="sLat" dir="ltr" value="${c.lat ?? ''}"></div><div class="field"><label for="sLng">خط الطول</label><input class="in" id="sLng" dir="ltr" value="${c.lng ?? ''}"></div></div>
          <button class="btn ghost sm" id="sHere">استخدم موقعي الحالي (وأنا داخل المدرسة)</button>${c.lat ? ` <a class="btn ghost sm" target="_blank" rel="noopener" href="https://maps.google.com/?q=${c.lat},${c.lng}">عرض على الخريطة</a>` : ''}
          <div class="field" style="margin-top:8px"><label for="sRad">نطاق القبول (متر)</label><input class="in" type="number" id="sRad" min="30" max="2000" value="${c.radius}"></div></div>
        <div class="hr-map"><b>الدوام</b><div class="grid g2" style="margin-top:6px"><div class="field"><label for="sSt">بداية الدوام</label><input class="in" type="time" id="sSt" value="${c.start}"></div><div class="field"><label for="sEnd">نهاية الدوام</label><input class="in" type="time" id="sEnd" value="${c.end}"></div><div class="field"><label for="sGr">دقائق السماح</label><input class="in" type="number" id="sGr" min="0" max="120" value="${c.grace}"></div></div></div>
        <div class="hr-map"><b>طريقة التحقق</b><label class="chk" style="margin-top:6px"><input type="checkbox" id="sGps" ${c.gps ? 'checked' : ''}> الموقع الجغرافي (داخل نطاق المدرسة)</label><label class="chk"><input type="checkbox" id="sQr" ${c.qr ? 'checked' : ''}> رمز QR متغير من شاشة المدرسة</label><p class="small muted">الجمع بين الطريقتين يمنع التحايل ببرامج تزييف الموقع.</p></div>
        <div class="hr-map"><b>مستثنون من الرصد الآلي</b><select class="in" id="sEx" multiple size="6" style="margin-top:6px">${P.map(p => `<option value="${p.id}" ${c.excl.includes(p.id) ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select><p class="small muted">اضغط Ctrl/⌘ للاختيار المتعدد.</p></div></div>
      <div class="acts"><button class="btn" id="sSave">حفظ الإعدادات</button></div>`;
    $('#sHere', B).onclick = e => A.run(e.currentTarget, async () => { const co = await geo(); $('#sLat', B).value = co.latitude.toFixed(6); $('#sLng', B).value = co.longitude.toFixed(6); A.toast(`حُدّد الموقع (دقة ±${Math.round(co.accuracy)} م)`, 'ok'); });
    $('#sSave', B).onclick = e => A.run(e.currentTarget, async () => {
      const lat = parseFloat($('#sLat', B).value), lng = parseFloat($('#sLng', B).value), gps = $('#sGps', B).checked, qr = $('#sQr', B).checked;
      if ($('#sEn', B).checked && gps && !(isFinite(lat) && isFinite(lng))) throw new Error('حدّد موقع المدرسة أو ألغِ التحقق بالموقع');
      if ($('#sEn', B).checked && !gps && !qr) throw new Error('اختر طريقة تحقق واحدة على الأقل');
      await saveCfg({ enabled: $('#sEn', B).checked, lat: isFinite(lat) ? lat : null, lng: isFinite(lng) ? lng : null, radius: +$('#sRad', B).value || 150, start: $('#sSt', B).value || '07:00', end: $('#sEnd', B).value || '13:30', grace: +$('#sGr', B).value || 0, gps, qr, excl: [...$('#sEx', B).selectedOptions].map(o => o.value) });
      A.toast('حُفظت الإعدادات', 'ok'); A.renderNav && A.renderNav();
    });
  }

  async function mineLog(box) {
    const rows = (await attList({ staff_id: S.me.id })).slice(-30).reverse();
    box.innerHTML = rows.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>التاريخ</th><th>الحالة</th><th>الحضور</th><th>الانصراف</th></tr></thead><tbody>${rows.map(r => `<tr><td>${esc(A.arDate ? A.arDate(r.day) : r.day)}</td><td>${pill(r.status)}${r.late_min ? ` ${AR(r.late_min)} د` : ''}</td><td>${hm(r.check_in)}</td><td>${hm(r.check_out)}</td></tr>`).join('')}</tbody></table></div>` : A.emptyBox('لا سجل بعد');
  }

  // فتح رابط الرمز ?att=TOKEN بعد الدخول
  const att = new URLSearchParams(location.search).get('att');
  if (att) { const prev0 = 1; const prev = window.APP_AFTER_SHELL; let done = false; window.APP_AFTER_SHELL = function () { if (prev) prev.apply(this, arguments); if (done || !S.me || !A.tfeat('hr')) return; done = true; history.replaceState(null, '', location.pathname + location.hash);
    setTimeout(async () => { try { const r = await selfCheck(false, att); if (r) A.toast(r.status === 'late' ? `سُجّل حضورك — متأخر ${AR(r.late_min)} دقيقة` : 'سُجّل حضورك، يومك سعيد', r.status === 'late' ? 'warn' : 'ok'); } catch (e) { A.toast(e.message, 'err'); } }, 800); }; }
})();
