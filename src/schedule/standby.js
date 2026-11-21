/* منصة دينا — حصص الانتظار وتأمين الحصص (استوديو الجداول ← «حصص الانتظار وتأمين الحصص»، وبند قائمة لمن يُسند إليه)
   (١) جدول الانتظار الأسبوعي: توزيع عادل آلي (منتظر ١، منتظر ٢…) على من نصابه أقل من الحد، في حصص فراغه فقط، مع حد يومي وقيود لكل معلم.
   (٢) تأمين حصص اليوم: الغائبون ← البديل لكل حصة بالأولوية: معلم فصله خالٍ (لم يحضر أحد) ← المنتظر ← الأقل تغطية،
       مع القيود (مستثنى / عند الضرورة فقط / حد يومي وأسبوعي / أيام وحصص ممنوعة) ← حفظ ← إرسال للاعتماد ← اعتماد (sql/109: sb_approve).
   (٣) نموذج التأمين المعتمد: جدول بتوقيع كل معلم بديل أمام حصته (إلكترونياً من حسابه sb_sign أو ورقياً)، وأسفله توقيعات الاعتماد
       (افتراضياً: وكيل المدرسة، المدير الأكاديمي، مدير المدرسة) — التلقائي منها يُختم عند الاعتماد من خزنة المالك owner_vault أو توقيع الحساب المرتبط.
   الصلاحيات المقسّمة (منح الوحدات module_grants): sb_view عرض · sb_cover إعداد التأمين · sb_roster جدول الانتظار · sb_approve الاعتماد · sb_print الطباعة والتصدير.
   الإعدادات والقيود ونموذج الاعتماد للمالك وحده. المعلم البديل يرى حصصه ويوقّع عليها بمفتاح tfeat('sbsign'). */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, DAYS, PER, I } = A;
  const today = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const pn = id => A.personName(id) || '—';
  const cName = id => (A.cls(id) || {}).name || '';
  const own = () => !!(S.me && S.me.is_owner && !S.realMe);
  const mod = m => !!S.me && (S.grants || []).some(g => g.module === m && g.staff_id === S.me.id);
  const SBM = [['sb_view', 'عرض', 'يطّلع على جدول الانتظار والتأمين والنموذج المعتمد'], ['sb_cover', 'إعداد التأمين', 'يحدد الغائبين والفصول الخالية ويوزّع البدلاء ويرسلها للاعتماد'], ['sb_roster', 'جدول الانتظار', 'يوزّع جدول الانتظار الأسبوعي ويعدّله'], ['sb_approve', 'الاعتماد', 'يعتمد تأمين اليوم أو يلغي اعتماده (ويشمل إعداد التأمين)'], ['sb_print', 'الطباعة والتصدير', 'يطبع النماذج والتقارير ويصدّرها Excel']];
  // can: نفس منطق sb_ok في القاعدة
  const can = k => own() || A.perm('timetable_edit') || mod('sb_' + k) || (k === 'view' && SBM.some(([m]) => mod(m))) || (k === 'cover' && mod('sb_approve')) || (k === 'print' && (mod('sb_cover') || mod('sb_approve')));
  A.sbCan = can;
  if (!A.I.standby) A.I.standby = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 20v-1a6 6 0 0 1 9-5.2"/><path d="M16 13l2 2 4-4"/><rect x="13" y="16" width="0" height="0"/></svg>';
  if (A.NAV && !A.NAV.some(n => n[0] === 'standby')) { const i = A.NAV.findIndex(n => n[0] === 'timetable'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['standby', 'حصص الانتظار', () => !!S.me && !S.me.is_owner && (can('view') || (A.tfeat && A.tfeat('sbsign')))]); }

  const SG = k => (window.DinaBrand ? DinaBrand.sig(k) : '');
  const DEF_SIGS = () => [{ id: 'wk', title: 'وكيل المدرسة', name: SG('deputy'), mode: 'blank' }, { id: 'ad', title: 'المدير الأكاديمي', name: SG('academic'), mode: 'auto' }, { id: 'pr', title: 'مدير المدرسة', name: SG('principal'), mode: 'auto' }];
  const FORM_DEF = () => ({ title: 'نموذج تأمين حصص الانتظار', tsig: 'e', showRoster: false, note: '', sigs: DEF_SIGS() });
  const cfgOf = sec => { const c = Object.assign({ max: 24, per: 2, perDay: 2, excl: [], roster: {}, rules: {}, prio: 'first', coverDay: 2 }, sec.standby || {}); c.form = Object.assign(FORM_DEF(), c.form || {}); if (!Array.isArray(c.form.sigs)) c.form.sigs = DEF_SIGS(); c.rules = c.rules || {}; c.excl = c.excl || []; return c; };
  // قيود المعلم: mode normal|limit|last|never، perDay، perWeek، days[]، periods[]، why
  const ruleOf = (cfg, t) => Object.assign({ mode: cfg.excl.includes(t) ? 'never' : 'normal', perDay: 0, perWeek: 0, days: [], periods: [], why: '' }, cfg.rules[t] || {});
  const blocked = (r, d, p) => r.mode === 'never' || (r.days || []).includes(d) || (r.periods || []).includes(p);
  const RMODE = { normal: 'عادي', limit: 'بحد خاص', last: 'عند الضرورة فقط', never: 'مستثنى' };

  let CACHE = null;
  async function load() {
    const vers = await api.list('timetable_versions', { status: 'approved' });
    const slots = vers.length ? await api.list('timetable_slots', { version_id: vers.map(v => v.id) }) : [];
    const cur = vers.find(v => v.section_id === S.sectionId);
    const load = {}; slots.forEach(x => { if (x.teacher_id && x.subject_id) load[x.teacher_id] = (load[x.teacher_id] || 0) + 1; });
    const busy = new Set(slots.filter(x => x.teacher_id && x.subject_id).map(x => x.teacher_id + '|' + x.day + '|' + x.period));
    const mine = cur ? slots.filter(x => x.version_id === cur.id) : [];
    const T = [...new Set(mine.filter(x => x.teacher_id).map(x => x.teacher_id))].sort((a, b) => pn(a).localeCompare(pn(b), 'ar'));
    CACHE = { vers, slots, cur, load, busy, mine, T }; return CACHE;
  }

  function generate(C, cfg, sec, keep) {
    const days = Array.from({ length: sec.days || 5 }, (_, i) => i), P = sec.periods || 7;
    const R0 = t => ruleOf(cfg, t);
    const elig = C.T.filter(t => R0(t).mode !== 'never' && (C.load[t] || 0) < cfg.max);
    const cap = t => { const r = R0(t), c = cfg.max - (C.load[t] || 0); return r.perWeek ? Math.min(c, r.perWeek) : c; };
    const dayCap = t => { const r = R0(t); return r.perDay ? Math.min(r.perDay, cfg.perDay) : cfg.perDay; };
    const cnt = {}, dayCnt = {}, R = {};
    // keep: الإبقاء على الخانات المعبأة وإكمال الفارغة فقط (مع احتساب الموجود في العدالة)
    if (keep) Object.entries(cfg.roster || {}).forEach(([key, l]) => { const d = +key.split('|')[0]; R[key] = (l || []).slice(0, cfg.per); R[key].forEach(t => { if (t) { cnt[t] = (cnt[t] || 0) + 1; dayCnt[t + '|' + d] = (dayCnt[t + '|' + d] || 0) + 1; } }); });
    const order = []; for (let k = 0; k < cfg.per; k++) for (const d of days) for (let p = 0; p < P; p++) order.push({ d, p, k });
    const miss = [];
    order.forEach(({ d, p, k }) => { const key = d + '|' + p; R[key] = R[key] || []; if (R[key][k]) return;
      const c = elig.filter(t => !C.busy.has(t + '|' + d + '|' + p) && !R[key].includes(t) && !blocked(R0(t), d, p) && (cnt[t] || 0) < cap(t) && (dayCnt[t + '|' + d] || 0) < dayCap(t))
        .sort((a, b) => (R0(a).mode === 'last') - (R0(b).mode === 'last') || ((cnt[a] || 0) / cap(a)) - ((cnt[b] || 0) / cap(b)) || (C.load[a] || 0) - (C.load[b] || 0) || (dayCnt[a + '|' + d] || 0) - (dayCnt[b + '|' + d] || 0));
      if (!c.length) { miss.push({ d, p, k }); return; }
      const t = c[0]; R[key][k] = t; cnt[t] = (cnt[t] || 0) + 1; dayCnt[t + '|' + d] = (dayCnt[t + '|' + d] || 0) + 1; });
    return { roster: R, miss, elig };
  }

  // ---------- الصفحة ----------
  V.standby = async function (root) {
    if (!can('view')) { if (A.tfeat && A.tfeat('sbsign')) return mine(root, true); root.innerHTML = ''; if (location.hash !== '#/home') location.hash = '#/home'; return; }
    css();
    root.innerHTML = '<div class="card"><div class="spinner"></div></div>';
    const sec = A.section(); let C; try { C = await load(); } catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', esc(e.message))}</div>`; return; }
    if (!C.cur) { root.innerHTML = `<div class="card">${A.emptyBox('لا يوجد جدول معتمد لهذا القسم')}</div>`; return; }
    const TABS = [['roster', 'جدول الانتظار الأسبوعي'], ['cover', 'تأمين حصص اليوم'], ['stats', 'تقرير العدالة']];
    if (A.tfeat && A.tfeat('sbsign') && !own()) TABS.push(['mine', 'حصصي']);
    let tab = A.LS.get('sb_t') || 'cover'; if (!TABS.some(t => t[0] === tab)) tab = 'cover';
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">حصص الانتظار وتأمين الحصص — ${esc(sec.name)}</h2><p class="sub" style="margin:2px 0 0">يُحسب النصاب من كل الجداول المعتمدة (كل الأقسام)، وتُختار حصص الفراغ فقط فلا تعارض.</p></div>
        ${own() ? `<div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn ghost sm" id="sbRules">⚖️ قيود التوزيع العادل</button><button class="btn ghost sm" id="sbForm">✍️ نموذج الاعتماد والتوقيعات</button><button class="btn ghost sm" id="sbPerm">🔑 الصلاحيات</button></div>` : ''}</div>
      <div class="kpick" id="sbT">${TABS.map(([k, l]) => `<button data-t="${k}">${l}</button>`).join('')}</div><div id="sbB" style="margin-top:10px"></div></div>`;
    $$('#sbT button', root).forEach(b => { b.classList.toggle('on', b.dataset.t === tab); b.onclick = () => { A.LS.set('sb_t', b.dataset.t); V.standby(root); }; });
    if (own()) { $('#sbRules', root).onclick = () => rulesDialog(C, sec, () => V.standby(root)); $('#sbForm', root).onclick = () => formDialog(sec, () => V.standby(root)); $('#sbPerm', root).onclick = () => permDialog(); }
    const B = $('#sbB', root);
    if (tab === 'mine') return mine(B, false);
    ({ roster, cover, stats })[tab](B, C, sec, root);
  };

  const saveCfg = async (sec, cfg) => { const r = await api.updateSection(sec.id, { standby: cfg }); Object.assign(sec, r); };

  // ---------- جدول الانتظار الأسبوعي ----------
  function roster(B, C, sec, root) {
    const cfg = cfgOf(sec), days = Array.from({ length: sec.days || 5 }, (_, i) => i), P = sec.periods || 7;
    const edit = can('roster'), setts = own(), apv = can('approve');
    const rst = cfg.rstat || {};
    const saveRoster = async () => { if (setts) { cfg.rstat = { s: 'approved', by: S.me.id, at: new Date().toISOString() }; return saveCfg(sec, cfg); } const r = await api.rpc('sb_save_roster', { p_section: sec.id, p_roster: cfg.roster, p_gen: cfg.gen || null }); if (r) sec.standby = r; else sec.standby = Object.assign({}, sec.standby || {}, { roster: cfg.roster, gen: cfg.gen }); };
    const redraw = () => roster(B, C, sec, root);
    const elig = C.T.filter(t => ruleOf(cfg, t).mode !== 'never' && (C.load[t] || 0) < cfg.max);
    const nRules = Object.keys(cfg.rules).filter(t => ruleOf(cfg, t).mode !== 'normal' || (cfg.rules[t].days || []).length || (cfg.rules[t].periods || []).length).length + cfg.excl.filter(t => !cfg.rules[t]).length;
    const filled = Object.values(cfg.roster).reduce((n, l) => n + (l || []).slice(0, cfg.per).filter(Boolean).length, 0), total = days.length * P * cfg.per;
    const inRoster = [...new Set(Object.values(cfg.roster).flatMap(l => (l || []).slice(0, cfg.per).filter(Boolean)))].sort((a, b) => pn(a).localeCompare(pn(b), 'ar'));
    const pend = rst.s === 'pending';
    B.innerHTML = `${pend ? `<div class="notice ${apv ? 'warn' : 'info'} sb-rpend" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px"><span class="grow">${apv ? '⏳ جدول الانتظار الأسبوعي بانتظار اعتمادك' : '⏳ أُرسل جدول الانتظار للاعتماد'} — عدّله ${esc(pn(rst.by))}${rst.at ? ` · ${A.fmtDT(rst.at)}` : ''}</span>${apv ? `<button class="btn ok sm" id="sbRAp">${I.check} اعتماد الجدول</button>` : ''}</div>` : rst.s === 'approved' && rst.ok_by ? `<p class="small muted" style="margin:0 0 6px">✓ معتمد · ${esc(pn(rst.ok_by))}${rst.at ? ` · ${A.fmtDT(rst.at)}` : ''}</p>` : ''}
      ${setts ? `<div class="grid g3"><div class="field"><label for="sbM">من نصابه أقل من</label><input class="in" type="number" id="sbM" min="1" max="40" value="${cfg.max}"></div><div class="field"><label for="sbD">أقصى انتظار للمعلم في اليوم</label><input class="in" type="number" id="sbD" min="1" max="6" value="${cfg.perDay}"></div>
        <div class="field"><label>عدد المنتظرين في كل حصة</label><div class="sb-lv" id="sbLv" role="group" aria-label="عدد المنتظرين في كل حصة">${[1, 2, 3, 4, 5, 6].map(n => `<button type="button" data-lv="${n}" class="${cfg.per === n ? 'on' : ''}" aria-pressed="${cfg.per === n}">${AR(n)}</button>`).join('')}</div></div></div>
      <p class="small muted" style="margin:0 0 6px">المؤهلون ${AR(elig.length)} من ${AR(C.T.length)} معلماً${nRules ? ` · ${AR(nRules)} معلم بقيود خاصة` : ''} — <button class="linkbtn" id="sbRules2">تعديل القيود والاستثناءات</button></p>` : ''}
      <div class="row" style="gap:6px;margin:10px 0;flex-wrap:wrap;align-items:center">${edit ? `<button class="btn" id="sbGen">${Object.keys(cfg.roster).length ? 'إعادة التوزيع العادل' : 'توزيع عادل تلقائي'}</button>${filled && filled < total ? `<button class="btn ghost" id="sbFill">إكمال الخانات الفارغة بعدل (${AR(total - filled)})</button>` : ''}${filled ? `<button class="btn ghost" id="sbRm">إزالة معلم من الجدول</button><button class="btn ghost bad" id="sbClr">مسح الجدول</button>` : ''}` : ''}${can('print') ? `<button class="btn ghost" id="sbPr">${I.print || ''} طباعة الأسبوعي</button><button class="btn ghost" id="sbPd">${I.print || ''} طباعة جدول يوم</button><select class="in" id="sbPdD" style="width:auto" aria-label="اليوم">${days.map(d => `<option value="${d}">${DAYS[d]}</option>`).join('')}</select><button class="btn ghost" id="sbX">Excel</button>` : ''}${cfg.gen ? `<span class="small muted">آخر توزيع: ${A.fmtDT(cfg.gen)}</span>` : ''}<span class="small muted">المعبأ ${AR(filled)} من ${AR(total)}</span></div>
      <div class="scroll"><table class="tbl sb-g"><thead><tr><th>اليوم</th>${Array.from({ length: P }, (_, p) => `<th>${PER[p] || AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${days.map(d => `<tr><th>${DAYS[d]}${edit && Array.from({ length: P }, (_, p) => (cfg.roster[d + '|' + p] || []).some(Boolean)).some(Boolean) ? `<br><button type="button" class="linkbtn small" data-cd="${d}" aria-label="مسح منتظري يوم ${DAYS[d]}">مسح اليوم</button>` : ''}</th>${Array.from({ length: P }, (_, p) => { const l = cfg.roster[d + '|' + p] || []; return `<td>${Array.from({ length: cfg.per }, (_, k) => edit ? `<div class="sb-cell"><span class="sb-lvn" aria-hidden="true">${AR(k + 1)}</span><select class="in sb-s" data-k="${d}|${p}|${k}" aria-label="منتظر ${AR(k + 1)} — ${DAYS[d]} الحصة ${AR(p + 1)}"><option value="">منتظر ${AR(k + 1)} —</option>${elig.filter(t => (!C.busy.has(t + '|' + d + '|' + p) && !blocked(ruleOf(cfg, t), d, p)) || t === l[k]).map(t => `<option value="${t}" ${t === l[k] ? 'selected' : ''}>${esc(pn(t))}</option>`).join('')}</select>${l[k] ? `<button type="button" class="sb-x" data-x="${d}|${p}|${k}" aria-label="حذف منتظر ${AR(k + 1)} — ${DAYS[d]} الحصة ${AR(p + 1)}" title="حذف">✕</button>` : ''}</div>` : `<div class="small">${l[k] ? `<span class="muted">${AR(k + 1)}:</span> ${esc(pn(l[k]))}` : '—'}</div>`).join('')}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
      ${edit ? `<p class="small muted">القائمة في كل خانة لا تعرض إلا المعلمين الذين لديهم فراغ في تلك الحصة ولا تمنعهم قيودهم. يُحفظ التعديل اليدوي فوراً${apv ? '' : '، ويُرسل للاعتماد'}. المنتظر ١ يُقدَّم أولاً عند التأمين ثم ٢ ثم ٣.</p>` : ''}`;
    if (setts) { const num = (id, k, lo, hi) => $(id, B).onchange = e => { cfg[k] = Math.max(lo, Math.min(hi, +A.norm(e.target.value) || cfg[k])); saveCfg(sec, cfg).then(redraw); };
      num('#sbM', 'max', 1, 40); num('#sbD', 'perDay', 1, 6); $('#sbRules2', B).onclick = () => rulesDialog(C, sec, redraw);
      $$('[data-lv]', B).forEach(b => b.onclick = () => A.run(null, async () => { const n = +b.dataset.lv; if (n === cfg.per) return; const up = n > cfg.per; cfg.per = n;
        let msg = `صار عدد المنتظرين ${AR(n)} في كل حصة`;
        if (up && Object.keys(cfg.roster).length && await A.confirmBox(`توزيع المنتظر ${AR(n)} الجديد بعدل على كل الحصص؟<br><span class="small muted">المنتظرون الحاليون يبقون كما هم، وتُملأ الخانات الجديدة فقط.</span>`, 'توزيع الآن')) { const r = generate(C, cfg, sec, true); cfg.roster = r.roster; cfg.gen = new Date().toISOString(); msg += r.miss.length ? ` · ${AR(r.miss.length)} خانة بلا منتظر متاح` : ' ووُزّعوا بعدل ✓'; }
        await saveRoster(); A.toast(msg, 'ok'); redraw(); })); }
    const ra = $('#sbRAp', B); if (ra) ra.onclick = e => A.run(e.currentTarget, async () => { if (A.DEMO) { cfg.rstat = Object.assign({}, rst, { s: 'approved', ok_by: S.me.id, at: new Date().toISOString() }); await saveCfg(sec, cfg); } else { const r = await api.rpc('sb_approve_roster', { p_section: sec.id }); if (r) sec.standby = r; } A.toast('اعتُمد جدول الانتظار ✓', 'ok'); redraw(); });
    const setCell = (d, p, k, v) => { const key = d + '|' + p; cfg.roster[key] = cfg.roster[key] || []; cfg.roster[key][+k] = v || null; };
    $$('[data-k]', B).forEach(s => s.onchange = () => A.run(null, async () => { const [d, p, k] = s.dataset.k.split('|'); setCell(d, p, k, s.value); await saveRoster(); A.toast('حُفظ', 'ok'); redraw(); }));
    $$('[data-x]', B).forEach(x => x.onclick = () => A.run(null, async () => { const [d, p, k] = x.dataset.x.split('|'); setCell(d, p, k, null); await saveRoster(); A.toast('حُذف المنتظر', 'ok'); redraw(); }));
    $$('[data-cd]', B).forEach(x => x.onclick = () => A.run(null, async () => { const d = x.dataset.cd; if (!(await A.confirmBox(`مسح كل منتظري يوم ${DAYS[d]}؟`, 'مسح', true))) return; for (let p = 0; p < P; p++) delete cfg.roster[d + '|' + p]; await saveRoster(); A.toast('مُسح اليوم', 'ok'); redraw(); }));
    const g = $('#sbGen', B); if (g) g.onclick = e => A.run(e.currentTarget, async () => { if (Object.keys(cfg.roster).length && !(await A.confirmBox('إعادة توزيع جدول الانتظار بالكامل؟ التعديلات اليدوية الحالية تُستبدل.<br><span class="small muted">لإبقاء الموجود استخدم «إكمال الخانات الفارغة».</span>', 'توزيع'))) return; const r = generate(C, cfg, sec); cfg.roster = r.roster; cfg.gen = new Date().toISOString(); await saveRoster(); A.toast(r.miss.length ? `وُزّع الجدول · ${AR(r.miss.length)} خانة بلا منتظر متاح` : 'وُزّع جدول الانتظار بعدالة ✓', r.miss.length ? 'warn' : 'ok'); redraw(); });
    const fl = $('#sbFill', B); if (fl) fl.onclick = e => A.run(e.currentTarget, async () => { const r = generate(C, cfg, sec, true); const before = filled; cfg.roster = r.roster; cfg.gen = new Date().toISOString(); await saveRoster(); const after = Object.values(cfg.roster).reduce((n, l) => n + (l || []).slice(0, cfg.per).filter(Boolean).length, 0); A.toast(`أُضيف ${AR(after - before)} منتظر${r.miss.length ? ` · ${AR(r.miss.length)} خانة بلا منتظر متاح` : ''}`, r.miss.length ? 'warn' : 'ok'); redraw(); });
    const clr = $('#sbClr', B); if (clr) clr.onclick = e => A.run(e.currentTarget, async () => { if (!(await A.confirmBox('مسح جدول الانتظار الأسبوعي بالكامل؟ لا يتأثر تأمين الأيام المحفوظة.', 'مسح الجدول', true))) return; cfg.roster = {}; cfg.gen = null; await saveRoster(); A.toast('مُسح جدول الانتظار', 'ok'); redraw(); });
    const rm = $('#sbRm', B); if (rm) rm.onclick = () => { const m = A.modal(`<h3>إزالة معلم من جدول الانتظار</h3><div class="field"><label for="rmT">المعلم</label><select class="in" id="rmT">${inRoster.map(t => { let n = 0; Object.values(cfg.roster).forEach(l => (l || []).slice(0, cfg.per).forEach(x => { if (x === t) n++; })); return `<option value="${t}">${esc(pn(t))} (${AR(n)})</option>`; }).join('')}</select></div>
        <label class="chk"><input type="checkbox" id="rmF" checked> تعويض خاناته بمنتظرين آخرين بعدل</label>${setts ? '<label class="chk"><input type="checkbox" id="rmX"> استثناؤه من الانتظار مستقبلاً</label>' : ''}
        <div class="acts"><button class="btn bad" id="rmGo">إزالة</button></div>`);
      m.el.querySelector('#rmGo').onclick = ev => A.run(ev.currentTarget, async () => { const t = m.el.querySelector('#rmT').value; let n = 0;
        Object.keys(cfg.roster).forEach(k => { cfg.roster[k] = (cfg.roster[k] || []).map(x => { if (x === t) { n++; return null; } return x; }); });
        if (setts && m.el.querySelector('#rmX').checked) { cfg.rules[t] = Object.assign({}, cfg.rules[t] || {}, { mode: 'never' }); if (!cfg.excl.includes(t)) cfg.excl.push(t); }
        if (m.el.querySelector('#rmF').checked) { const save = cfg.rules[t]; cfg.rules[t] = Object.assign({}, save || {}, { mode: 'never' }); const r = generate(C, cfg, sec, true); if (save === undefined) delete cfg.rules[t]; else cfg.rules[t] = save; cfg.roster = r.roster; }
        await saveRoster(); m.close(); A.toast(`أُزيل ${pn(t)} من ${AR(n)} خانة`, 'ok'); redraw(); }); };
    if (!can('print')) return;
    const tbl = dl => `<table><tr><th>اليوم</th>${Array.from({ length: P }, (_, p) => `<th>${AR(p + 1)}</th>`).join('')}</tr>${dl.map(d => `<tr><td><b>${DAYS[d]}</b></td>${Array.from({ length: P }, (_, p) => `<td>${(cfg.roster[d + '|' + p] || []).map((t, k) => t ? `<div><small>منتظر ${AR(k + 1)}:</small> ${esc(pn(t))}</div>` : '').join('') || '—'}</td>`).join('')}</tr>`).join('')}</table>`;
    $('#sbPr', B).onclick = () => A.printDoc('جدول حصص الانتظار', sec.name, tbl(days), true);
    $('#sbPd', B).onclick = () => { const d = +$('#sbPdD', B).value; A.printDoc(`جدول المنتظرين — يوم ${DAYS[d]}`, sec.name, `<table><tr><th>الحصة</th>${Array.from({ length: cfg.per }, (_, k) => `<th>منتظر ${AR(k + 1)}</th>`).join('')}</tr>${Array.from({ length: P }, (_, p) => `<tr><td><b>${PER[p] || AR(p + 1)}</b></td>${Array.from({ length: cfg.per }, (_, k) => `<td>${esc(pn((cfg.roster[d + '|' + p] || [])[k]))}</td>`).join('')}</tr>`).join('')}</table>`, false); };
    $('#sbX', B).onclick = () => { const rows = []; days.forEach(d => { for (let p = 0; p < P; p++) { const o = { 'اليوم': DAYS[d], 'الحصة': p + 1 }; for (let k = 0; k < cfg.per; k++) o['منتظر ' + (k + 1)] = (cfg.roster[d + '|' + p] || [])[k] ? pn(cfg.roster[d + '|' + p][k]) : ''; rows.push(o); } }); xlsx(rows, 'الانتظار', 'جدول الانتظار - ' + sec.name); };
  }
  const xlsx = (rows, sheet, file) => { const ws = XLSX.utils.json_to_sheet(rows); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheet); XLSX.writeFile(wb, file + '.xlsx'); };

  // ---------- تأمين حصص اليوم ----------
  const ST = { draft: ['مسودة', 'st-empty'], pending: ['بانتظار الاعتماد', 'st-submitted'], approved: ['معتمد', 'st-approved'] };
  async function cover(B, C, sec, root) {
    const cfg = cfgOf(sec); let day = A.LS.get('sb_day') || today(); let abs = null, empty = null, skip = null, DAYROW = null;
    const ed = can('cover'), apv = can('approve');
    const draw = async () => {
      const d = A.parseDate(day).getDay(), P = sec.periods || 7, wk0 = (() => { const x = A.parseDate(day); x.setDate(x.getDate() - x.getDay()); return A.isoDate(x); })();
      B.innerHTML = '<div class="spinner"></div>';
      const back30 = (() => { const x = A.parseDate(day); x.setDate(x.getDate() - 30); return A.isoDate(x); })();
      const [ex, hist, hrA, dr, pendAll] = await Promise.all([api.list('substitutions', { section_id: sec.id, day }).catch(() => []), api.list('substitutions', { section_id: sec.id }, { select: 'sub_teacher,day', gte: { day: back30 } }).catch(() => []), api.list('staff_att', { school_id: S.school.id, day }).catch(() => []), api.list('standby_days', { section_id: sec.id, day }).catch(() => []), apv ? api.list('standby_days', { section_id: sec.id, status: 'pending' }).catch(() => []) : Promise.resolve([])]);
      DAYROW = dr[0] || null; const status = DAYROW ? DAYROW.status : (ex.length ? 'draft' : '');
      const locked = status === 'approved';
      const hrAbs = hrA.filter(x => ['absent', 'leave'].includes(x.status) && C.T.includes(x.staff_id));
      if (!abs) { abs = new Set((A.LS.get('sb_abs_' + day) || '').split(',').filter(Boolean)); ex.forEach(x => { if (x.absent_teacher) abs.add(x.absent_teacher); }); hrAbs.forEach(x => abs.add(x.staff_id)); }
      if (!empty) empty = (DAYROW && DAYROW.empty) || [];
      if (!skip) skip = new Set((DAYROW && DAYROW.skip) || []);
      const isEmpty = (cid, p) => empty.some(e => e.class_id === cid && (!(e.periods || []).length || e.periods.includes(p)));
      const covN = {}, wkN = {}; hist.forEach(x => { if (x.sub_teacher) { covN[x.sub_teacher] = (covN[x.sub_teacher] || 0) + 1; if (x.day >= wk0 && x.day !== day) wkN[x.sub_teacher] = (wkN[x.sub_teacher] || 0) + 1; } });
      // من صار فارغاً لأن فصله خالٍ في هذه الحصة
      const freedAt = p => new Set(C.mine.filter(x => x.day === d && x.period === p && x.teacher_id && x.subject_id && isEmpty(x.class_id, p)).map(x => x.teacher_id));
      const needsAll = C.mine.filter(x => x.day === d && x.subject_id && x.teacher_id && abs.has(x.teacher_id) && !isEmpty(x.class_id, x.period)).sort((a, b) => a.period - b.period || cName(a.class_id).localeCompare(cName(b.class_id), 'ar'));
      const skipped = needsAll.filter(x => skip.has(x.class_id + '|' + x.period)), needs = needsAll.filter(x => !skip.has(x.class_id + '|' + x.period));
      const taken = {}, dayN = {};
      const okFor = (t, p) => { const r = ruleOf(cfg, t); if (blocked(r, d, p)) return false; const lim = r.perDay || cfg.coverDay || 99; if ((dayN[t] || 0) >= lim) return false; if (r.perWeek && (wkN[t] || 0) + (dayN[t] || 0) >= r.perWeek) return false; return true; };
      const isFree = (t, p) => t && !abs.has(t) && (!C.busy.has(t + '|' + d + '|' + p) || freedAt(p).has(t));
      const pickFor = x => { const e = ex.find(y => y.class_id === x.class_id && y.period === x.period); const used = taken[x.period] = taken[x.period] || new Set();
        if (e && e.sub_teacher) { used.add(e.sub_teacher); dayN[e.sub_teacher] = (dayN[e.sub_teacher] || 0) + 1; return { t: e.sub_teacher, why: e.prio || e.kind }; }
        const free = t => isFree(t, x.period) && !used.has(t) && okFor(t, x.period);
        const take = (t, why) => { used.add(t); dayN[t] = (dayN[t] || 0) + 1; return { t, why }; };
        const fr = [...freedAt(x.period)].filter(free).sort((a, b) => (covN[a] || 0) - (covN[b] || 0));
        const sb = (cfg.roster[d + '|' + x.period] || []).find(t => free(t));
        if (cfg.prio !== 'off' && cfg.prio !== 'after' && fr[0]) return take(fr[0], 'empty');
        if (sb) return take(sb, 'standby');
        if (cfg.prio === 'after' && fr[0]) return take(fr[0], 'empty');
        const alt = C.T.filter(t => free(t) && ruleOf(cfg, t).mode !== 'never').sort((a, b) => (ruleOf(cfg, a).mode === 'last') - (ruleOf(cfg, b).mode === 'last') || (covN[a] || 0) - (covN[b] || 0) || (C.load[a] || 0) - (C.load[b] || 0))[0];
        return alt ? take(alt, ruleOf(cfg, alt).mode === 'last' ? 'last' : 'auto') : { t: '', why: '' }; };
      const rows = needs.map(x => { const r = pickFor(x), e = ex.find(y => y.class_id === x.class_id && y.period === x.period); return { x, sub: r.t, why: r.why, saved: !!e, rec: e }; });
      const WHY = { empty: ['فصله خالٍ', 'sb-wE'], standby: ['منتظر', 'sb-wS'], auto: ['توزيع عادل', 'sb-wA'], last: ['عند الضرورة', 'sb-wL'] };
      const allCls = S.classes.filter(c => c.active !== false);
      const pendO = (pendAll || []).filter(x => x.day !== day).sort((a, b) => a.day.localeCompare(b.day));
      B.innerHTML = `${pendO.length ? `<div class="notice warn" style="display:block;margin-bottom:8px">⏳ ${A.cnt(pendO.length, 'يوم', 'أيام')} بانتظار اعتمادك:<div class="sb-pd">${pendO.map(x => `<button type="button" class="btn ghost sm" data-gd="${x.day}">${DAYS[A.parseDate(x.day).getDay()] || ''} ${AR(A.dmy(A.parseDate(x.day)))}</button>`).join('')}</div></div>` : ''}
        ${apv && status === 'pending' ? `<div class="notice warn" style="display:block;margin-bottom:8px">⏳ تأمين هذا اليوم بانتظار اعتمادك${DAYROW && DAYROW.prepared_by ? ` — أعدّه ${esc(pn(DAYROW.prepared_by))}` : ''}. راجع البدلاء ثم اضغط «اعتماد التأمين» أسفل الجدول.</div>` : ''}
        <div class="row" style="gap:8px;flex-wrap:wrap;align-items:end"><div class="field" style="margin:0"><label for="cvD">اليوم</label><input class="in" type="date" id="cvD" value="${day}"></div><span class="small muted">${DAYS[d] || ''}</span>
          ${status ? `<span class="pill ${ST[status][1]}">${ST[status][0]}</span>` : ''}${DAYROW && DAYROW.approved_at ? `<span class="small muted">اعتمده ${esc(pn(DAYROW.approved_by))} · ${A.fmtDT(DAYROW.approved_at)}</span>` : ''}</div>
        ${hrAbs.length && !locked ? `<div class="notice info" style="display:block;margin-top:8px">حُدِّد ${A.cnt(hrAbs.length, 'غائب', 'غائبين')} تلقائياً من رصد الموارد البشرية، واقتُرح لكل حصة بديل — راجع ثم اعتمد.</div>` : ''}
        ${locked ? '' : `<div class="field" style="margin-top:8px"><label>المعلمون الغائبون</label><div class="sb-abs">${C.T.map(t => `<label class="chk ${abs.has(t) ? 'on' : ''}"><input type="checkbox" data-ab="${t}" ${abs.has(t) ? 'checked' : ''} ${ed ? '' : 'disabled'}> ${esc(pn(t))}</label>`).join('')}</div></div>
        <details class="dz-det sb-emp" ${empty.length ? 'open' : ''}><summary>فصول لم يحضر منها أحد (${AR(empty.length)}) — معلموها في تلك الحصص يُسند إليهم الانتظار ${cfg.prio === 'off' ? '' : 'بالأولوية'}</summary>
          <div class="small muted" style="margin:6px 0">اختر الفصل (اليوم كله) أو حدّد حصصاً بعينها. حصص الفصل الخالي لا تحتاج تأميناً، ومعلمها يصير متاحاً للتأمين في فصل آخر.</div>
          ${ed ? '<button class="btn ghost sm" id="cvSug">اقتراح من الحضور المرصود</button>' : ''}
          <div class="sb-ecls">${allCls.map(c => { const e = empty.find(x => x.class_id === c.id); return `<div class="sb-ec ${e ? 'on' : ''}"><label class="chk"><input type="checkbox" data-ec="${c.id}" ${e ? 'checked' : ''} ${ed ? '' : 'disabled'}> ${esc(c.name)}</label>${e ? `<span class="sb-eps">${Array.from({ length: P }, (_, p) => `<button type="button" class="${!(e.periods || []).length || e.periods.includes(p) ? 'on' : ''}" data-ep="${c.id}|${p}" ${ed ? '' : 'disabled'} aria-label="الحصة ${AR(p + 1)}">${AR(p + 1)}</button>`).join('')}</span>` : ''}</div>`; }).join('')}</div></details>`}
        ${locked ? '' : rows.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>الحصة</th><th>الفصل</th><th>المادة</th><th>الغائب</th><th>البديل</th><th>الأساس</th><th></th>${ed ? '<th><span class="sr-only">حذف</span></th>' : ''}</tr></thead><tbody>${rows.map((r, i) => { const k = d + '|' + r.x.period, sb = cfg.roster[k] || [], fr = freedAt(r.x.period); const opts = C.T.filter(t => (isFree(t, r.x.period) && ruleOf(cfg, t).mode !== 'never') || t === r.sub);
          const w = WHY[r.why] || (r.sub ? ['يدوي', 'sb-wA'] : null);
          return `<tr><td>${PER[r.x.period] || AR(r.x.period + 1)}</td><td><b>${esc(cName(r.x.class_id))}</b></td><td>${esc(A.subjName(r.x.subject_id))}</td><td class="small">${esc(pn(r.x.teacher_id))}</td><td>${locked || !ed ? `<b>${esc(r.sub ? pn(r.sub) : '—')}</b>` : `<select class="in" data-sub="${i}" aria-label="البديل — ${esc(cName(r.x.class_id))} الحصة ${AR(r.x.period + 1)}"><option value="">— بلا بديل —</option>${opts.map(t => { const rl = ruleOf(cfg, t); return `<option value="${t}" ${t === r.sub ? 'selected' : ''}>${esc(pn(t))}${fr.has(t) ? ' (فصله خالٍ)' : ''}${sb.includes(t) ? ` (منتظر ${AR(sb.indexOf(t) + 1)})` : ''}${rl.mode !== 'normal' ? ` · ${RMODE[rl.mode]}` : ''} · غطّى ${AR(covN[t] || 0)}</option>`; }).join('')}</select>`}</td><td>${w ? `<span class="sb-why ${w[1]}">${w[0]}</span>` : ''}</td><td>${r.saved ? (r.rec.sig_at ? '<span class="pill st-approved">وقّع ✓</span>' : '<span class="pill st-approved">محفوظ</span>') : '<span class="pill st-submitted">مقترح</span>'}</td>${ed ? `<td><button type="button" class="sb-rx" data-rx="${r.x.class_id}|${r.x.period}" aria-label="حذف هذه الحصة من التأمين — ${esc(cName(r.x.class_id))} الحصة ${AR(r.x.period + 1)}" title="حذف من التأمين">✕</button></td>` : ''}</tr>`; }).join('')}</tbody></table></div>` : `<p class="small muted" style="margin-top:8px">${abs.size ? 'لا حصص للغائبين تحتاج تأميناً في هذا اليوم.' : 'حدد المعلمين الغائبين لتظهر حصصهم والبديل المقترح لكل حصة.'}</p>`}
        ${!locked && skipped.length ? `<p class="small muted" style="margin:6px 0">حُذفت ${A.cnt(skipped.length, 'حصة', 'حصص')} من التأمين: ${skipped.map(x => `${esc(cName(x.class_id))} (${AR(x.period + 1)})${ed ? ` <button type="button" class="linkbtn" data-ru="${x.class_id}|${x.period}">استعادة</button>` : ''}`).join(' · ')}</p>` : ''}
        <div class="acts" style="flex-wrap:wrap">${locked ? (apv ? '<button class="btn ghost" id="cvRe">إلغاء الاعتماد للتعديل</button>' : '') : `${ed && (rows.length || skipped.length) ? `<button class="btn ghost" id="cvSv">${apv ? 'حفظ' : 'حفظ كمسودة'}</button>` : ''}${ed && !apv && rows.length ? '<button class="btn" id="cvSend">حفظ وإرسال للاعتماد</button>' : ''}${apv && rows.length ? `<button class="btn ok" id="cvAp">${I.check} اعتماد التأمين</button>` : ''}`}
          ${(rows.length || ex.length) && can('print') ? `<button class="btn ghost" id="cvPr">${I.print || ''} طباعة النموذج</button><button class="btn ghost" id="cvX">Excel</button>` : ''}</div>
        <div id="cvForm"></div>`;
      $('#cvD', B).onchange = e => { day = e.target.value; A.LS.set('sb_day', day); abs = null; empty = null; skip = null; draw(); };
      $$('[data-gd]', B).forEach(b => b.onclick = () => { day = b.dataset.gd; A.LS.set('sb_day', day); abs = null; empty = null; skip = null; draw(); });
      $$('[data-rx]', B).forEach(b => b.onclick = () => { skip.add(b.dataset.rx); draw(); });
      $$('[data-ru]', B).forEach(b => b.onclick = () => { skip.delete(b.dataset.ru); draw(); });
      $$('[data-ab]', B).forEach(c => c.onchange = () => { c.checked ? abs.add(c.dataset.ab) : abs.delete(c.dataset.ab); A.LS.set('sb_abs_' + day, [...abs].join(',')); draw(); });
      $$('[data-ec]', B).forEach(c => c.onchange = () => { const id = c.dataset.ec; empty = empty.filter(e => e.class_id !== id); if (c.checked) empty.push({ class_id: id, periods: [] }); draw(); });
      $$('[data-ep]', B).forEach(b => b.onclick = () => { const [id, p] = b.dataset.ep.split('|'); const e = empty.find(x => x.class_id === id); const all = Array.from({ length: P }, (_, i) => i); let ps = (e.periods || []).length ? e.periods.slice() : all; ps = ps.includes(+p) ? ps.filter(x => x !== +p) : ps.concat(+p).sort((a, b) => a - b); if (!ps.length) empty = empty.filter(x => x !== e); else e.periods = ps.length === P ? [] : ps; draw(); });
      const sug = $('#cvSug', B); if (sug) sug.onclick = e => A.run(e.currentTarget, async () => {
        const [att, pa] = await Promise.all([api.list('attendance', { school_id: S.school.id, day }).catch(() => []), api.list('period_attendance', { section_id: sec.id, day }).catch(() => [])]);
        const out = []; allCls.forEach(c => { const a = att.filter(x => x.class_id === c.id); if (a.length && a.every(x => x.status === 'absent')) { out.push({ class_id: c.id, periods: [] }); return; }
          const ps = []; for (let p = 0; p < P; p++) { const r = pa.filter(x => x.class_id === c.id && x.period === p); if (r.length && r.every(x => x.status === 'absent')) ps.push(p); } if (ps.length) out.push({ class_id: c.id, periods: ps.length === P ? [] : ps }); });
        if (!out.length) return A.toast('لا يوجد في الحضور المرصود فصل غاب كل طلابه', 'warn');
        out.forEach(o => { if (!empty.some(e => e.class_id === o.class_id)) empty.push(o); }); A.toast(`أُضيف ${AR(out.length)} فصل — راجعها`, 'ok'); draw(); });
      $$('[data-sub]', B).forEach(s => s.onchange = () => { const r = rows[+s.dataset.sub]; r.sub = s.value; r.why = s.value ? (freedAt(r.x.period).has(s.value) ? 'empty' : (cfg.roster[d + '|' + r.x.period] || []).includes(s.value) ? 'standby' : 'manual') : ''; });
      const persist = async st => {
        const cl = rows.filter(r => r.sub).map(r => ({ school_id: S.school.id, section_id: sec.id, day, period: r.x.period, class_id: r.x.class_id, absent_teacher: r.x.teacher_id, sub_teacher: r.sub, subject_id: r.x.subject_id, kind: r.why === 'standby' ? 'standby' : 'auto', prio: r.why === 'empty' ? 'empty' : r.why === 'last' ? 'last' : r.why === 'manual' ? 'manual' : null }));
        // سجل اليوم أولاً: وجوده (غير معتمد) يؤجّل إشعار البدلاء حتى الاعتماد
        // المُعِد يبقى كما هو عند اعتماد المعتمد لعمل غيره
        const keepPrep = DAYROW && DAYROW.prepared_by && apv && DAYROW.prepared_by !== S.me.id;
        const row = { section_id: sec.id, day, empty, skip: [...skip], status: st }; if (!keepPrep) Object.assign(row, { prepared_by: S.me.id, prepared_at: new Date().toISOString() });
        if (DAYROW) await api.upd('standby_days', DAYROW.id, row); else await api.ins('standby_days', [Object.assign({ school_id: S.school.id }, row)]);
        if (cl.length) await api.ups('substitutions', cl, 'day,class_id,period');
        // ما حُفظ سابقاً ولم يعد مطلوباً (أُلغي غياب المعلم، صار الفصل خالياً، أو «بلا بديل»)
        const keep = new Set(cl.map(r => r.class_id + '|' + r.period)); for (const e of ex) if (!keep.has(e.class_id + '|' + e.period)) await api.del('substitutions', e.id);
        return cl.length;
      };
      const sv = $('#cvSv', B); if (sv) sv.onclick = e => A.run(e.currentTarget, async () => { const n = await persist(DAYROW && DAYROW.status === 'pending' ? 'pending' : 'draft'); A.toast(`حُفظ تأمين ${AR(n)} حصة${rows.length - n ? ` · ${AR(rows.length - n)} بلا بديل` : ''}`, rows.length - n ? 'warn' : 'ok'); draw(); });
      // الإشعار للمعتمدين من القاعدة (sql/111a: sbd_notify) عند صيرورة اليوم «بانتظار الاعتماد»
      const sd = $('#cvSend', B); if (sd) sd.onclick = e => A.run(e.currentTarget, async () => { if (DAYROW && DAYROW.status === 'pending') await persist('draft'); await persist('pending');
        A.toast('أُرسل للاعتماد وأُشعر المعتمدون ✓', 'ok'); draw(); });
      const ap = $('#cvAp', B); if (ap) ap.onclick = e => A.run(e.currentTarget, async () => { const miss = rows.filter(r => !r.sub).length;
        if (miss && !(await A.confirmBox(`${A.cnt(miss, 'حصة', 'حصص')} بلا بديل. اعتماد التأمين على هذا الحال؟`, 'اعتماد'))) return;
        await persist(DAYROW ? DAYROW.status === 'approved' ? 'pending' : DAYROW.status : 'draft');
        if (A.DEMO) { const r = (await api.list('standby_days', { section_id: sec.id, day }))[0]; await api.upd('standby_days', r.id, { status: 'approved', approved_by: S.me.id, approved_at: new Date().toISOString(), signs: await demoSigns(cfg) }); }
        else await api.rpc('sb_approve', { p_section: sec.id, p_day: day, p_note: null });
        A.toast('اعتُمد تأمين اليوم وأُشعر البدلاء ✓', 'ok'); await draw(); const f = $('#cvForm', B); if (f) f.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); });
      const re = $('#cvRe', B); if (re) re.onclick = e => A.run(e.currentTarget, async () => { if (!(await A.confirmBox('إلغاء اعتماد تأمين هذا اليوم لتعديله؟ تُزال توقيعات الاعتماد وتُعاد عند الاعتماد مجدداً.', 'إلغاء الاعتماد', true))) return;
        if (A.DEMO) await api.upd('standby_days', DAYROW.id, { status: 'pending', signs: {}, approved_at: null, approved_by: null }); else await api.rpc('sb_reopen', { p_section: sec.id, p_day: day }); draw(); });
      const ctx = { sec, cfg, day, d, P, DAYROW, C };
      const pr = $('#cvPr', B); if (pr) pr.onclick = e => A.run(e.currentTarget, async () => printForm(ctx, await formRows(ctx)));
      const xb = $('#cvX', B); if (xb) xb.onclick = e => A.run(e.currentTarget, async () => { const R = await formRows(ctx); xlsx(R.rows.map((r, i) => ({ 'م': i + 1, 'الحصة': r.period + 1, 'الفصل': cName(r.class_id), 'المادة': A.subjName(r.subject_id), 'المعلم الغائب': pn(r.absent_teacher), 'البديل': r.sub_teacher ? pn(r.sub_teacher) : '', 'التوقيع': r.sig_at ? 'وقّع ' + A.fmtDT(r.sig_at) : '' })), 'التأمين', `تأمين الحصص ${day} - ${sec.name}`); });
      if (locked || (DAYROW && ex.length)) { const f = $('#cvForm', B); formRows(ctx).then(R => { if (f.isConnected) f.innerHTML = `<h3 class="sb-fh">${esc(cfg.form.title)} ${locked ? '<span class="pill st-approved">معتمد</span>' : '<span class="pill st-submitted">لم يُعتمد بعد</span>'}</h3>${formHtml(ctx, R, false)}`; }).catch(() => { }); }
    };
    await draw();
  }
  async function demoSigns(cfg) { const o = {}; for (const s of cfg.form.sigs) if (s.mode === 'auto') { const v = (await api.list('owner_vault', { key: 'sbsig:' + s.id }).catch(() => []))[0]; if (v && v.data && v.data.img) o[s.id] = { img: v.data.img, at: new Date().toISOString() }; } return o; }
  async function formRows(ctx) {
    const rows = (await api.list('substitutions', { section_id: ctx.sec.id, day: ctx.day })).sort((a, b) => a.period - b.period || cName(a.class_id).localeCompare(cName(b.class_id), 'ar'));
    let sigs = {}, dayRow = ctx.DAYROW;
    if (!A.DEMO) { try { const r = await api.rpc('sb_day', { p_section: ctx.sec.id, p_day: ctx.day }); if (r) { sigs = r.sigs || {}; dayRow = r.day || dayRow; } } catch (_) { } }
    else { const me = (await api.list('staff_signatures', {}).catch(() => [])); rows.forEach(r => { const g = me.find(x => x.staff_id === r.sub_teacher); if (r.sig_at && g) sigs[r.id] = g.img; }); }
    return { rows, sigs, dayRow };
  }
  function formHtml(ctx, R, print) {
    const f = ctx.cfg.form, signs = (R.dayRow && R.dayRow.status === 'approved' && R.dayRow.signs) || {};
    const sigCell = r => { if (f.tsig === 'paper') return ''; if (r.sig_at && R.sigs[r.id]) return `<img src="${R.sigs[r.id]}" alt="توقيع ${esc(pn(r.sub_teacher))}" style="max-height:34px;max-width:120px">`; if (r.sig_at) return '✓ وقّع'; return print ? '' : '<span class="small muted">لم يوقّع بعد</span>'; };
    const tb = `<table class="${print ? '' : 'tbl sb-ft'}"><thead><tr><th>م</th><th>الحصة</th><th>الفصل</th><th>المادة</th><th>المعلم الغائب</th><th>المعلم البديل</th><th style="min-width:110px">توقيع المعلم</th></tr></thead><tbody>${R.rows.map((r, i) => `<tr><td>${AR(i + 1)}</td><td>${PER[r.period] || AR(r.period + 1)}</td><td><b>${esc(cName(r.class_id))}</b></td><td>${esc(A.subjName(r.subject_id))}</td><td>${esc(pn(r.absent_teacher))}</td><td><b>${esc(r.sub_teacher ? pn(r.sub_teacher) : '—')}</b></td><td style="height:40px">${sigCell(r)}</td></tr>`).join('') || `<tr><td colspan="7">لا حصص مؤمَّنة</td></tr>`}</tbody></table>`;
    const sg = (f.sigs || []).filter(s => s.title || s.name);
    const sigs = sg.length ? `<div class="rs-sig sb-sigs" style="display:grid;grid-template-columns:repeat(${Math.min(sg.length, 4)},1fr);gap:14px;margin-top:22px;break-inside:avoid">${sg.map(s => `<div style="text-align:center;border-top:1.5px solid #CFE0F2;padding-top:6px;min-height:80px"><b style="display:block">${esc(s.title)}</b><span>${esc(s.name)}</span><span style="height:46px;display:flex;align-items:center;justify-content:center">${signs[s.id] && signs[s.id].img ? `<img src="${signs[s.id].img}" alt="توقيع ${esc(s.title)}" style="max-height:44px;max-width:150px">` : (print ? '' : '<span class="small muted">التوقيع</span>')}</span></div>`).join('')}</div>` : '';
    const note = f.note ? `<p style="margin:8px 0 0">${esc(f.note)}</p>` : '';
    let rost = '';
    if (print && f.showRoster) { const cfg = ctx.cfg; rost = `<h3>المنتظرون اليوم</h3><table><tr><th>الحصة</th>${Array.from({ length: cfg.per }, (_, k) => `<th>منتظر ${AR(k + 1)}</th>`).join('')}</tr>${Array.from({ length: ctx.P }, (_, p) => `<tr><td>${AR(p + 1)}</td>${Array.from({ length: cfg.per }, (_, k) => `<td>${esc(pn((cfg.roster[ctx.d + '|' + p] || [])[k]))}</td>`).join('')}</tr>`).join('')}</table>`; }
    const emp = (R.dayRow && R.dayRow.empty) || []; const empTxt = emp.length ? `<p class="small" style="margin:6px 0 0">فصول لم يحضر منها أحد: ${emp.map(e => esc(cName(e.class_id)) + ((e.periods || []).length ? ` (الحصص ${e.periods.map(p => AR(p + 1)).join('، ')})` : '')).join(' · ')}</p>` : '';
    return (print ? '' : '<div class="scroll">') + tb + (print ? '' : '</div>') + empTxt + note + sigs + rost;
  }
  function printForm(ctx, R) { A.printDoc(ctx.cfg.form.title, `يوم ${DAYS[ctx.d]} ${AR(A.dmy(A.parseDate(ctx.day)))} · ${ctx.sec.name}`, formHtml(ctx, R, true), false); }

  // ---------- حصصي (للمعلم البديل) ----------
  async function mine(root, page) {
    css();
    root.innerHTML = '<div class="spinner"></div>';
    const from = (() => { const x = A.parseDate(today()); x.setDate(x.getDate() - 14); return A.isoDate(x); })();
    let rows = [], hasSig = false;
    try { [rows, hasSig] = await Promise.all([api.list('substitutions', { sub_teacher: S.me.id }, { gte: { day: from } }), api.list('staff_signatures', { staff_id: S.me.id }).then(r => !!r.length).catch(() => false)]); } catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', esc(e.message))}</div>`; return; }
    rows = rows.filter(r => r.notified_at || A.DEMO).sort((a, b) => b.day.localeCompare(a.day) || a.period - b.period);
    const body = `<p class="sub" style="margin:2px 0 10px">الحصص التي أُسندت إليك بعد اعتماد التأمين. وقّع أمام كل حصة بعد تغطيتها.</p>
      ${rows.length ? `<div class="sb-my">${rows.map(r => `<div class="sb-mc ${r.sig_at ? 'ok' : ''}"><div class="sb-md"><b>${esc(DAYS[A.parseDate(r.day).getDay()] || '')}</b><span>${AR(A.dmy(A.parseDate(r.day)))}</span><i>${PER[r.period] || 'الحصة ' + AR(r.period + 1)}</i></div>
        <div class="sb-mb"><b>${esc(cName(r.class_id))}</b><span>${esc(A.subjName(r.subject_id))}</span><small>بدلاً من ${esc(pn(r.absent_teacher))}</small></div>
        <div class="sb-ms">${r.sig_at ? `<span class="pill st-approved">وقّعت ✓</span><small>${A.fmtDT(r.sig_at)}</small>` : `<button class="btn sm" data-sg="${r.id}">✍️ توقيع</button>`}</div></div>`).join('')}</div>` : `<div>${A.emptyBox('لا حصص انتظار مسندة إليك حالياً')}</div>`}`;
    root.innerHTML = page ? `<div class="card"><h2 style="margin:0">حصص الانتظار المسندة إليّ</h2>${body}</div>` : body;
    $$('[data-sg]', root).forEach(b => b.onclick = e => A.run(e.currentTarget, async () => {
      if (!hasSig) { if (A.formsSigModal) { A.formsSigModal(() => { hasSig = true; A.toast('حُفظ توقيعك — اضغط «توقيع» أمام الحصة الآن', 'ok'); }); return; } throw new Error('احفظ توقيعك الإلكتروني أولاً'); }
      if (A.DEMO) await api.upd('substitutions', b.dataset.sg, { sig_at: new Date().toISOString() });
      else { try { await api.rpc('sb_sign', { p_id: b.dataset.sg }); } catch (er) { throw new Error(/NO_SIG/.test(er.message) ? 'احفظ توقيعك الإلكتروني أولاً' : /NOT_ALLOWED/.test(er.message) ? 'لا يمكن التوقيع قبل اعتماد التأمين' : er.message); } }
      A.toast('وُقّع ✓', 'ok'); mine(root, page); }));
  }

  // ---------- قيود التوزيع العادل (المالك) ----------
  function rulesDialog(C, sec, done) {
    const cfg = cfgOf(sec), days = Array.from({ length: sec.days || 5 }, (_, i) => i), P = sec.periods || 7;
    const R = {}; C.T.forEach(t => R[t] = ruleOf(cfg, t));
    const m = A.modal(`<h3>قيود التوزيع العادل والاستثناءات</h3><p class="sub">للمكلّفين بأعمال أخرى (رائد نشاط، منسّق، إشراف…): استثناء كامل، أو «عند الضرورة فقط» (آخر من يُسند إليه)، أو حد خاص يومي/أسبوعي، أو أيام وحصص لا يُسند فيها. تُطبَّق على جدول الانتظار الأسبوعي وتأمين الحصص معاً.</p>
      <div class="grid g3"><div class="field"><label for="ruCD">أقصى تأمين للمعلم في اليوم (للجميع)</label><input class="in" type="number" id="ruCD" min="1" max="8" value="${cfg.coverDay || 2}"></div>
      <div class="field"><label for="ruPr">معلم الفصل الخالي (لم يحضر أحد)</label><select class="in" id="ruPr"><option value="first" ${cfg.prio === 'first' ? 'selected' : ''}>أولوية قبل المنتظرين</option><option value="after" ${cfg.prio === 'after' ? 'selected' : ''}>بعد المنتظرين</option><option value="off" ${cfg.prio === 'off' ? 'selected' : ''}>كغيره (بلا أولوية)</option></select></div>
      <div class="field"><label for="ruQ">بحث</label><input class="in" id="ruQ" placeholder="اسم المعلم"></div></div>
      <div class="scroll" style="max-height:52vh"><table class="tbl sb-ru"><thead><tr><th>المعلم</th><th>الحالة</th><th>حد يومي</th><th>حد أسبوعي</th><th>أيام لا يُسند فيها</th><th>حصص لا يُسند فيها</th><th>السبب / التكليف</th></tr></thead><tbody>${C.T.map(t => { const r = R[t]; return `<tr data-t="${t}" data-n="${esc(A.normKey(pn(t)))}"><td><b>${esc(pn(t))}</b><div class="small muted">نصابه ${AR(C.load[t] || 0)}</div></td>
        <td><select class="in" data-f="mode" aria-label="الحالة">${Object.entries(RMODE).map(([k, l]) => `<option value="${k}" ${r.mode === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
        <td><input class="in sb-n" type="number" min="0" max="8" data-f="perDay" value="${r.perDay || ''}" placeholder="—" aria-label="حد يومي"></td><td><input class="in sb-n" type="number" min="0" max="30" data-f="perWeek" value="${r.perWeek || ''}" placeholder="—" aria-label="حد أسبوعي"></td>
        <td><span class="sb-eps">${days.map(d => `<button type="button" data-d="${d}" class="${(r.days || []).includes(d) ? 'on' : ''}" title="${DAYS[d]}">${DAYS[d].slice(0, 2)}</button>`).join('')}</span></td>
        <td><span class="sb-eps">${Array.from({ length: P }, (_, p) => `<button type="button" data-p="${p}" class="${(r.periods || []).includes(p) ? 'on' : ''}" aria-label="الحصة ${AR(p + 1)}">${AR(p + 1)}</button>`).join('')}</span></td>
        <td><input class="in" data-f="why" value="${esc(r.why || '')}" placeholder="مثال: رائد النشاط" aria-label="السبب"></td></tr>`; }).join('')}</tbody></table></div>
      <div class="acts"><button class="btn" id="ruOk">حفظ القيود</button></div>`, { cls: 'wide' });
    $('#ruQ', m.el).oninput = e => { const q = A.normKey(e.target.value); $$('tr[data-t]', m.el).forEach(tr => tr.hidden = !!q && !tr.dataset.n.includes(q)); };
    $$('tr[data-t] .sb-eps button', m.el).forEach(b => b.onclick = () => b.classList.toggle('on'));
    $('#ruOk', m.el).onclick = e => A.run(e.currentTarget, async () => {
      const rules = {}; $$('tr[data-t]', m.el).forEach(tr => { const g = f => tr.querySelector(`[data-f="${f}"]`).value; const r = { mode: g('mode'), perDay: +A.norm(g('perDay')) || 0, perWeek: +A.norm(g('perWeek')) || 0, days: $$('[data-d].on', tr).map(b => +b.dataset.d), periods: $$('[data-p].on', tr).map(b => +b.dataset.p), why: g('why').trim() };
        if (r.mode !== 'normal' || r.perDay || r.perWeek || r.days.length || r.periods.length || r.why) rules[tr.dataset.t] = r; });
      cfg.rules = rules; cfg.excl = Object.keys(rules).filter(t => rules[t].mode === 'never'); cfg.coverDay = Math.max(1, Math.min(8, +A.norm($('#ruCD', m.el).value) || 2)); cfg.prio = $('#ruPr', m.el).value;
      await saveCfg(sec, cfg); m.close(); A.toast('حُفظت القيود ✓ — أعد التوزيع العادل لتطبيقها على الجدول الأسبوعي', 'ok'); done && done(); });
  }

  // ---------- نموذج الاعتماد والتوقيعات (المالك) ----------
  async function formDialog(sec, done) {
    const cfg = cfgOf(sec), f = JSON.parse(JSON.stringify(cfg.form));
    const vault = {}; try { (await api.list('owner_vault', {})).forEach(v => { if (/^sbsig:/.test(v.key)) vault[v.key.slice(6)] = (v.data || {}).img; }); } catch (_) { }
    const staff = (S.staff || []).filter(s => s.active !== false).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
    const m = A.modal(`<h3>نموذج تأمين الحصص — الاعتماد والتوقيعات</h3><p class="sub">هذه الإعدادات لك وحدك. التوقيع «التلقائي» يُختم على النموذج لحظة الاعتماد فقط (لا يظهر قبله)، من صورة ترفعها/ترسمها هنا أو من التوقيع المحفوظ في حساب الموظف الذي تربطه.</p>
      <div class="grid g2"><div class="field"><label for="ffT">عنوان النموذج</label><input class="in" id="ffT" value="${esc(f.title)}"></div>
      <div class="field"><label for="ffS">توقيع المعلم البديل</label><select class="in" id="ffS"><option value="e" ${f.tsig === 'e' ? 'selected' : ''}>إلكتروني من حسابه (مع خانة فارغة للورقي)</option><option value="paper" ${f.tsig === 'paper' ? 'selected' : ''}>ورقي فقط (خانة فارغة)</option></select></div></div>
      <div class="field"><label for="ffN">ملاحظة تظهر أسفل الجدول (اختياري)</label><input class="in" id="ffN" value="${esc(f.note || '')}"></div>
      <label class="chk"><input type="checkbox" id="ffR" ${f.showRoster ? 'checked' : ''}> إرفاق جدول المنتظرين لليوم في الطباعة</label>
      <h4 style="margin:14px 0 6px">التوقيعات أسفل الجدول</h4><div id="ffL"></div><button class="btn ghost sm" id="ffAdd">+ إضافة توقيع</button>
      <div class="acts"><button class="btn" id="ffOk">حفظ</button><button class="btn ghost" id="ffDef">الافتراضي</button></div>`, { cls: 'wide' });
    const L = $('#ffL', m.el), pend = {};
    const draw = () => { L.innerHTML = f.sigs.map((s, i) => { const img = pend[s.id] !== undefined ? pend[s.id] : vault[s.id]; return `<div class="sb-sg" data-i="${i}">
        <div class="grid g3"><div class="field"><label>الصفة</label><input class="in" data-k="title" value="${esc(s.title)}"></div><div class="field"><label>الاسم</label><input class="in" data-k="name" value="${esc(s.name)}"></div>
        <div class="field"><label>طريقة التوقيع</label><select class="in" data-k="mode"><option value="blank" ${s.mode !== 'auto' ? 'selected' : ''}>يدوي (خانة فارغة)</option><option value="auto" ${s.mode === 'auto' ? 'selected' : ''}>تلقائي عند الاعتماد</option></select></div></div>
        ${s.mode === 'auto' ? `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><span class="small muted">الصورة:</span>${img ? `<img src="${img}" alt="توقيع ${esc(s.title)}" class="sb-sgi">` : '<span class="small" style="color:#B7791F">لا صورة بعد</span>'}<button class="btn ghost sm" data-draw="${i}">✍️ رسم</button><label class="btn ghost sm" style="cursor:pointer">رفع صورة<input type="file" accept="image/*" data-up="${i}" hidden></label>${S.me && i >= 0 ? `<button class="btn ghost sm" data-mine="${i}">توقيعي المحفوظ</button>` : ''}${A.dsig ? `<button class="btn ghost sm" data-ds="${i}">من التواقيع المفوّضة</button>` : ''}${img ? `<button class="btn ghost sm" data-clr="${i}">إزالة</button>` : ''}
          <span class="small muted" style="margin-inline-start:auto">أو من حساب:</span><select class="in" data-k="staff" style="width:auto;max-width:200px"><option value="">—</option>${staff.map(x => `<option value="${x.id}" ${s.staff === x.id ? 'selected' : ''}>${esc(x.full_name)}</option>`).join('')}</select></div>` : ''}
        <div class="row" style="gap:4px;justify-content:flex-end"><button class="btn ghost sm" data-mv="${i}|-1" aria-label="أعلى" ${i ? '' : 'disabled'}>▲</button><button class="btn ghost sm" data-mv="${i}|1" aria-label="أسفل" ${i < f.sigs.length - 1 ? '' : 'disabled'}>▼</button><button class="btn ghost sm" data-rm="${i}">حذف</button></div></div>`; }).join('') || '<p class="small muted">بلا توقيعات</p>';
      $$('[data-k]', L).forEach(el => el.onchange = el.oninput = () => { const s = f.sigs[+el.closest('[data-i]').dataset.i]; s[el.dataset.k] = el.value; if (el.dataset.k === 'mode') draw(); });
      $$('[data-rm]', L).forEach(b => b.onclick = () => { f.sigs.splice(+b.dataset.rm, 1); draw(); });
      $$('[data-mv]', L).forEach(b => b.onclick = () => { const [i, dd] = b.dataset.mv.split('|').map(Number); const t = f.sigs[i]; f.sigs[i] = f.sigs[i + dd]; f.sigs[i + dd] = t; draw(); });
      $$('[data-clr]', L).forEach(b => b.onclick = () => { pend[f.sigs[+b.dataset.clr].id] = null; draw(); });
      $$('[data-draw]', L).forEach(b => b.onclick = () => drawPad(img => { pend[f.sigs[+b.dataset.draw].id] = img; draw(); }));
      $$('[data-mine]', L).forEach(b => b.onclick = () => A.run(b, async () => { const r = (await api.list('staff_signatures', { staff_id: S.me.id }))[0]; if (!r) throw new Error('لا يوجد توقيع محفوظ في حسابك'); pend[f.sigs[+b.dataset.mine].id] = r.img; draw(); }));
      $$('[data-ds]', L).forEach(b => b.onclick = () => A.run(b, async () => { const sg = f.sigs[+b.dataset.ds]; const ch = await A.dsig.choose(sg.title); if (!ch) return; let img = ch.img; if (!img) { const r = (await api.list('staff_signatures', { staff_id: S.me.id }))[0]; if (!r) throw new Error('لا يوجد توقيع محفوظ في حسابك'); img = r.img; } pend[sg.id] = img; draw(); }));
      $$('[data-up]', L).forEach(inp => inp.onchange = () => { const fl = inp.files[0]; if (!fl) return; shrink(fl).then(img => { pend[f.sigs[+inp.dataset.up].id] = img; draw(); }).catch(e => A.toast(e.message, 'err')); });
    };
    draw();
    $('#ffAdd', m.el).onclick = () => { f.sigs.push({ id: 's' + Date.now().toString(36), title: '', name: '', mode: 'blank' }); draw(); };
    $('#ffDef', m.el).onclick = () => { f.sigs = DEF_SIGS(); draw(); };
    $('#ffOk', m.el).onclick = e => A.run(e.currentTarget, async () => {
      f.title = $('#ffT', m.el).value.trim() || FORM_DEF().title; f.tsig = $('#ffS', m.el).value; f.note = $('#ffN', m.el).value.trim(); f.showRoster = $('#ffR', m.el).checked;
      f.sigs = f.sigs.filter(s => (s.title || s.name).trim()).map(s => ({ id: s.id, title: s.title.trim(), name: s.name.trim(), mode: s.mode === 'auto' ? 'auto' : 'blank', staff: s.mode === 'auto' && s.staff ? s.staff : undefined }));
      for (const [id, img] of Object.entries(pend)) await api.ups('owner_vault', [{ school_id: S.school.id, key: 'sbsig:' + id, data: img ? { img } : {}, updated_at: new Date().toISOString() }], 'school_id,key');
      cfg.form = f; await saveCfg(sec, cfg); m.close(); A.toast('حُفظ نموذج الاعتماد ✓', 'ok'); done && done(); });
  }
  const shrink = file => new Promise((res, rej) => { if (file.size > 4e6) return rej(new Error('الصورة أكبر من ٤ م.ب')); const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(1, 500 / im.width, 200 / im.height), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/png')); }; im.onerror = () => rej(new Error('تعذّر قراءة الصورة')); im.src = r.result; }; r.readAsDataURL(file); });
  function drawPad(done) {
    const m = A.modal(`<h3>رسم التوقيع</h3><div class="sg-wrap"><canvas id="dpC" width="900" height="300" aria-label="مساحة رسم التوقيع"></canvas><span class="sg-line" aria-hidden="true"></span></div><div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="dpS">اعتماد</button><button class="btn ghost" id="dpX">مسح</button></div>`);
    const c = $('#dpC', m.el), g = c.getContext('2d'); let last = null, drawn = false; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#082B5A';
    const pt = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
    c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); last = pt(e); drawn = true; });
    c.addEventListener('pointermove', e => { if (!last) return; const p = pt(e); g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke(); last = p; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(k => c.addEventListener(k, () => last = null));
    $('#dpX', m.el).onclick = () => { g.clearRect(0, 0, c.width, c.height); drawn = false; };
    $('#dpS', m.el).onclick = () => { if (!drawn) return A.toast('ارسم التوقيع أولاً', 'err');
      const d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
      for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (d[(y * c.width + x) * 4 + 3] > 10) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const pad = 12, w = Math.max(20, x1 - x0 + pad * 2), h = Math.max(20, y1 - y0 + pad * 2), o = document.createElement('canvas'); o.width = w; o.height = h; o.getContext('2d').drawImage(c, x0 - pad, y0 - pad, w, h, 0, 0, w, h);
      m.close(); done(o.toDataURL('image/png')); };
  }

  // ---------- الصلاحيات المقسّمة (المالك) ----------
  function permDialog() {
    const staff = (S.staff || []).filter(s => !s.is_owner && s.active !== false).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
    const has = (id, m) => (S.grants || []).some(g => g.staff_id === id && g.module === m);
    const m = A.modal(`<h3>صلاحيات الانتظار والتأمين</h3><p class="sub">أسند المهمة لأي معلم أو موظف وقسّمها كما تريد. الإعدادات والقيود ونموذج الاعتماد تبقى لك وحدك. يظهر لهم بند «حصص الانتظار» في القائمة بحسب ما تمنحه.</p>
      <div class="sb-pl">${SBM.map(([k, l, d]) => `<span><b>${l}</b>: ${d}</span>`).join('')}</div>
      <input class="in" id="pmQ" placeholder="بحث بالاسم" style="margin:8px 0">
      <div class="scroll" style="max-height:55vh"><table class="tbl"><thead><tr><th>الموظف</th>${SBM.map(([k, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${staff.map(s => `<tr data-n="${esc(A.normKey(s.full_name || ''))}"><td><b>${esc(s.full_name)}</b>${s.title ? `<div class="small muted">${esc(s.title)}</div>` : ''}</td>${SBM.map(([k, l]) => `<td style="text-align:center"><input type="checkbox" data-g="${s.id}|${k}" ${has(s.id, k) ? 'checked' : ''} aria-label="${esc(l)} — ${esc(s.full_name)}"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`, { cls: 'wide' });
    $('#pmQ', m.el).oninput = e => { const q = A.normKey(e.target.value); $$('tr[data-n]', m.el).forEach(tr => tr.hidden = !!q && !tr.dataset.n.includes(q)); };
    $$('[data-g]', m.el).forEach(c => c.onchange = () => A.run(null, async () => { const [id, k] = c.dataset.g.split('|');
      try { if (c.checked) { await api.grantModule(id, k); S.grants = (S.grants || []).concat([{ staff_id: id, module: k }]); } else { await api.revokeModule(id, k); S.grants = (S.grants || []).filter(g => !(g.staff_id === id && g.module === k)); } A.toast('حُفظ ✓', 'ok'); }
      catch (er) { c.checked = !c.checked; throw er; } }));
  }

  // ---------- تقرير العدالة ----------
  async function stats(B, C, sec) {
    const cfg = cfgOf(sec); const sbN = {}; Object.values(cfg.roster).forEach(l => (l || []).forEach(t => { if (t) sbN[t] = (sbN[t] || 0) + 1; }));
    const hist = await api.list('substitutions', { section_id: sec.id }, { select: 'sub_teacher,absent_teacher,prio' }).catch(() => []);
    const cov = {}, ab = {}, em = {}; hist.forEach(x => { if (x.sub_teacher) { cov[x.sub_teacher] = (cov[x.sub_teacher] || 0) + 1; if (x.prio === 'empty') em[x.sub_teacher] = (em[x.sub_teacher] || 0) + 1; } if (x.absent_teacher) ab[x.absent_teacher] = (ab[x.absent_teacher] || 0) + 1; });
    const R = C.T.map(t => ({ t, r: ruleOf(cfg, t), load: C.load[t] || 0, sb: sbN[t] || 0, cov: cov[t] || 0, em: em[t] || 0, ab: ab[t] || 0 })).sort((a, b) => (b.load + b.sb) - (a.load + a.sb));
    const tbl = pr => `<table class="${pr ? '' : 'tbl'}"><thead><tr><th>المعلم</th><th>النصاب</th><th>الانتظار الأسبوعي</th><th>النصاب + الانتظار</th><th>حصص غطّاها</th><th>منها لخلوّ فصله</th><th>حصص غاب عنها</th></tr></thead><tbody>${R.map(r => `<tr><td><b>${esc(pn(r.t))}</b>${r.r.mode !== 'normal' ? ` <small>(${RMODE[r.r.mode]}${r.r.why ? ' — ' + esc(r.r.why) : ''})</small>` : ''}</td><td>${AR(r.load)}</td><td>${AR(r.sb)}</td><td><b style="color:${r.load + r.sb > cfg.max ? '#C53030' : 'inherit'}">${AR(r.load + r.sb)}</b></td><td>${AR(r.cov)}</td><td>${AR(r.em)}</td><td>${AR(r.ab)}</td></tr>`).join('')}</tbody></table>`;
    B.innerHTML = `${can('print') ? `<div class="row" style="gap:6px;margin-bottom:8px"><button class="btn ghost sm" id="stP">${I.print || ''} طباعة</button></div>` : ''}<div class="scroll">${tbl()}</div><p class="small muted">الحد: ${AR(cfg.max)} حصة. «حصص غطّاها» و«غاب عنها» من سجل التأمين المحفوظ.</p>`;
    const p = $('#stP', B); if (p) p.onclick = () => A.printDoc('تقرير عدالة الانتظار والتأمين', sec.name, tbl(true), true);
  }

  function css() {
    if (document.getElementById('sbp-css')) return;
    const s = document.createElement('style'); s.id = 'sbp-css';
    s.textContent = `.sb-why{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap}.sb-wE{background:#E8F6EE;color:#1F6B43}.sb-wS{background:#E4EBF5;color:#082B5A}.sb-wA{background:#EEF6FB;color:#005499}.sb-wL{background:#FFF4E0;color:#8A5A00}
      .sb-ecls{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.sb-ec{border:1px solid var(--border,#E4EBF5);border-radius:10px;padding:4px 8px;display:flex;align-items:center;gap:6px;flex-wrap:wrap}.sb-ec.on{border-color:#2E8B57;background:#F3FBF6}
      .sb-eps{display:inline-flex;flex-wrap:wrap;gap:3px}.sb-eps button{min-width:28px;height:28px;border-radius:8px;border:1px solid #CFE0F2;background:#fff;color:#082B5A;font:inherit;font-size:12px;cursor:pointer}.sb-eps button.on{background:#082B5A;color:#fff;border-color:#082B5A}.sb-eps button:focus-visible{outline:3px solid #3AB1DB;outline-offset:1px}
      .sb-fh{margin:18px 0 8px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}.sb-ft td{vertical-align:middle}.sb-sigs{margin-bottom:6px}
      .sb-sg{border:1px solid var(--border,#E4EBF5);border-radius:12px;padding:10px;margin-bottom:8px;background:var(--card,#fff)}.sb-sgi{height:40px;max-width:160px;border:1px solid #E4EBF5;border-radius:8px;background:#fff}
      .sb-ru td{vertical-align:middle}.sb-ru .in{min-width:0}.sb-ru .sb-n{width:62px}.sb-ru td:last-child .in{min-width:130px}
      .sb-pl{display:grid;gap:4px;font-size:13px;background:#F4F8FC;border-radius:10px;padding:8px 10px}
      .linkbtn{background:none;border:0;padding:0;color:#005499;text-decoration:underline;cursor:pointer;font:inherit}
      .sb-my{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}.sb-mc{display:flex;gap:10px;align-items:center;border:1px solid #E4EBF5;border-radius:14px;padding:10px;background:#fff;border-inline-start:4px solid #3AB1DB}.sb-mc.ok{border-inline-start-color:#2E8B57}
      .sb-md{display:flex;flex-direction:column;align-items:center;min-width:74px;background:#F2F7FC;border-radius:10px;padding:6px}.sb-md span{font-size:11.5px;color:#5B7090}.sb-md i{font-style:normal;font-size:12px;font-weight:700;color:#005499}
      .sb-mb{flex:1;min-width:0;display:flex;flex-direction:column}.sb-mb span{font-size:13px}.sb-mb small{color:#5B7090}.sb-ms{display:flex;flex-direction:column;align-items:center;gap:2px}.sb-ms small{font-size:11px;color:#5B7090}
      .sb-cell{display:flex;align-items:center;gap:3px;margin:2px 0}.sb-cell .sb-s{flex:1;min-width:110px}.sb-lvn{display:inline-grid;place-items:center;min-width:20px;height:20px;border-radius:999px;background:#E4EBF5;color:#082B5A;font-size:11px;font-weight:800}
      .sb-cell:nth-child(1) .sb-lvn{background:#082B5A;color:#fff}.sb-cell:nth-child(2) .sb-lvn{background:#005499;color:#fff}.sb-cell:nth-child(3) .sb-lvn{background:#3AB1DB;color:#082B5A}
      .sb-x{border:0;background:#FDECEC;color:#A12B2B;border-radius:8px;min-width:28px;height:28px;cursor:pointer;font:inherit;font-size:13px}.sb-x:hover{background:#F9D6D6}.sb-x:focus-visible,.sb-rx:focus-visible{outline:3px solid #3AB1DB;outline-offset:1px}
      .sb-lv{display:flex!important;flex-direction:row;gap:6px;flex-wrap:wrap}.sb-lv button{flex:0 0 auto;width:auto!important;min-width:44px;min-height:40px;padding:0 12px;border:2px solid #CFE0F2;border-radius:999px;background:#fff;color:#082B5A;font:inherit;font-weight:800;cursor:pointer}.sb-lv button.on{background:#082B5A;border-color:#082B5A;color:#fff}.sb-lv button:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}.sb-rx{border:0;background:none;color:#A12B2B;cursor:pointer;font:inherit;min-width:32px;min-height:32px;border-radius:8px}.sb-rx:hover{background:#FDECEC}
      .sb-pd{display:flex;gap:6px;flex-wrap:wrap;margin-top:6px}`;
    document.head.appendChild(s);
  }
})();
