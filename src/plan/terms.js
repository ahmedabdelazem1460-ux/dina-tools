/* منصة دينا — الفصول الدراسية: مؤشر الفصل في الشريط العلوي وقائمة المستخدم، وتبويب «الفصول الدراسية»
   في الإدارة لإضافة الفصل الثاني وتجهيزه (قيد التجهيز لا يراه المعلمون) ثم تفعيله. sql/094 */
(function () {
  const A = window.APP, V = window.VIEWS;
  const { api, S, $, $$, esc, AR } = A;
  const ST = { prep: ['قيد التجهيز', 'tm-prep'], active: ['الفصل الحالي', 'tm-act'], closed: ['منتهٍ', 'tm-cls'] };
  const ORDN = ['', 'الأول', 'الثاني', 'الثالث'];
  const owner = () => !!(S.me && S.me.is_owner && !S.realMe);
  const canPrep = () => owner() || (A.perm && A.perm('structure'));

  if (!document.getElementById('termcss')) {
    const st = document.createElement('style'); st.id = 'termcss';
    st.textContent = `
.tm-pick select{font-weight:800;max-width:130px}
@media (max-width:1600px){.top-in:has(.tm-pick) .ttl{display:none}}
.top-in:has(.tm-pick){flex-wrap:wrap}
.tm-pill{display:inline-flex;align-items:center;gap:5px;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:800;white-space:nowrap}
.tm-pill::before{content:'';width:7px;height:7px;border-radius:50%;background:currentColor}
.tm-act{background:#E5F3EA;color:#2E8B57}.tm-prep{background:#FFF3DC;color:#8a5a00}.tm-cls{background:#EEF1F5;color:#5b6b7f}
.tm-menu{padding:10px 12px;border-bottom:1px solid var(--border);margin-bottom:6px}
.tm-menu .tm-l{font-size:12px;color:var(--muted)}
.tm-menu .tm-n{display:flex;align-items:center;gap:6px;justify-content:space-between;font-weight:800;color:#082B5A;margin:2px 0 6px}
.tm-seg{display:flex;gap:4px;background:#F1F5FA;border-radius:12px;padding:3px}
.tm-seg button{flex:1;border:0;background:none;border-radius:9px;padding:7px 6px !important;font-weight:800;font-size:12.5px;color:var(--muted);text-align:center !important}
.tm-seg button.on{background:#fff;color:#082B5A;box-shadow:0 1px 3px rgba(8,43,90,.15)}
.tm-seg button:focus-visible{outline:2px solid #3AB1DB}
.tm-prog{height:6px;border-radius:6px;background:#E6EDF4;overflow:hidden;margin-top:8px}.tm-prog i{display:block;height:100%;background:linear-gradient(90deg,#005499,#3AB1DB)}
.tm-cards{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))}
.tm-card{position:relative;border:1px solid var(--border);border-radius:18px;padding:16px;background:linear-gradient(180deg,#fff,#F7FAFD);box-shadow:0 10px 24px -18px rgba(8,43,90,.45),0 1px 0 rgba(8,43,90,.05)}
.tm-card.cur{border-color:#2E8B57;box-shadow:0 12px 28px -18px rgba(46,139,87,.6),inset 0 0 0 1px #BADF93}
.tm-card .tm-num{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-weight:900;font-size:20px;color:#fff;background:linear-gradient(145deg,#005499,#082B5A);box-shadow:0 6px 14px -6px rgba(0,84,153,.7)}
.tm-card h3{margin:0;color:#082B5A}
.tm-card .tm-meta{display:grid;gap:4px;margin:12px 0;font-size:13px;color:var(--muted)}
.tm-card .tm-acts{display:flex;gap:6px;flex-wrap:wrap}
.tm-add{border:2px dashed #BFD9EE;border-radius:18px;padding:16px;display:grid;place-items:center;text-align:center;gap:8px;background:#F7FBFE;min-height:200px;cursor:pointer;font:inherit;color:#005499}
.tm-add:hover,.tm-add:focus-visible{border-color:#3AB1DB;background:#EEF8FD;outline:none}
.tm-add b{font-size:16px}
.tm-steps{display:grid;gap:8px;margin:6px 0 12px}
.tm-steps li{display:flex;gap:8px;align-items:flex-start}
.tm-chk{display:grid;gap:6px;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))}
.tm-chk label{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border:1px solid var(--border);border-radius:12px;background:#fff}
.tm-chk label small{display:block;color:var(--muted)}
.tm-sec{border:1px solid var(--border);border-radius:12px;padding:8px 10px;margin-bottom:6px;background:#fff;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
`;
    document.head.appendChild(st);
  }

  // ---------------- البيانات ----------------
  const virtualFirst = () => ({ id: '__t1', ord: 1, name: 'الفصل الدراسي الأول', status: 'active', virtual: true, year_label: '' });
  async function loadTerms() {
    let l = [];
    try { l = (await api.list('terms', { school_id: S.school.id }, { order: 'ord' })) || []; } catch (_) { l = []; }
    l = l.slice().sort((a, b) => a.ord - b.ord);
    if (!l.some(t => t.ord === 1)) l.unshift(virtualFirst());
    S.terms = l; return l;
  }
  const first = () => (S.terms || []).find(t => t.ord === 1) || virtualFirst();
  const termOf = w => (w && w.term_id) || first().id;
  const visibleTerms = () => (S.terms || []).filter(t => t.status !== 'prep' || canPrep());
  const activeTerm = () => (S.terms || []).find(t => t.status === 'active') || first();
  A.termOf = termOf;
  A.termCur = () => (S.terms || []).find(t => t.id === S.termView) || activeTerm();

  // يُستدعى من loadSection: يحدد الفصل المعروض ويعيد أسابيعه فقط
  A.termFilter = async function (weeks) {
    await loadTerms();
    const vis = visibleTerms();
    const saved = A.LS.get('term_view');
    S.termView = vis.some(t => t.id === saved) ? saved : activeTerm().id;
    if (vis.length <= 1 && !weeks.some(w => w.term_id)) return weeks;
    return weeks.filter(w => termOf(w) === S.termView);
  };
  A.termPickHtml = function () {
    const vis = visibleTerms(); if (vis.length <= 1 || !A.tfeat('terms')) return '';
    return `<div class="pick tm-pick"><label for="termSel">الفصل</label><select id="termSel" aria-label="الفصل الدراسي">${vis.map(t => `<option value="${t.id}" ${t.id === S.termView ? 'selected' : ''}>${esc(shortName(t))}${t.status === 'prep' ? ' · قيد التجهيز' : ''}</option>`).join('')}</select></div>`;
  };
  const shortName = t => (t.name || '').replace(/^الفصل الدراسي\s*/, 'الفصل ') || ('الفصل ' + (ORDN[t.ord] || AR(t.ord)));
  async function switchTerm(id) {
    if (id === S.termView) return;
    A.LS.set('term_view', id); S.termView = id;
    const main = $('#main'); if (main) main.innerHTML = '<div class="spinner"></div>';
    await A.loadSection(); A.shell(); A.route();
    const t = A.termCur(); A.toast('تعرض الآن: ' + t.name + (t.status === 'prep' ? ' (قيد التجهيز — لا يراه المعلمون)' : ''), 'ok');
  }
  A.termSwitch = switchTerm;

  // تقدّم الفصل: الأسبوع الحالي من عدد الأسابيع والأيام المتبقية
  function progress(t) {
    const ws = (S.weeksAll || []).filter(w => termOf(w) === t.id).sort((a, b) => a.start_date.localeCompare(b.start_date));
    if (!ws.length) return null;
    const today = A.isoDate(new Date());
    const idx = ws.filter(w => w.start_date <= today).length;
    const end = t.end_date || (() => { const d = A.parseDate(ws[ws.length - 1].start_date); d.setDate(d.getDate() + 4); return A.isoDate(d); })();
    const left = Math.max(0, Math.round((A.parseDate(end) - A.parseDate(today)) / 864e5));
    return { n: ws.length, cur: Math.min(idx, ws.length), left, pct: Math.round(Math.min(idx, ws.length) / ws.length * 100), started: idx > 0 };
  }

  // ---------------- قائمة المستخدم ----------------
  document.addEventListener('click', e => {
    if (!e.target.closest('#ub')) return;
    setTimeout(() => {
      const m = $('.menu'); if (!m || m.querySelector('.tm-menu') || !S.terms || !A.tfeat('terms')) return;
      const t = A.termCur(); const vis = visibleTerms(); const pr = progress(t);
      const box = document.createElement('div'); box.className = 'tm-menu';
      box.innerHTML = `<div class="tm-l">الفصل الدراسي</div><div class="tm-n"><span>${esc(t.name)}</span><span class="tm-pill ${ST[t.status][1]}">${ST[t.status][0]}</span></div>
        ${vis.length > 1 ? `<div class="tm-seg" role="group" aria-label="اختيار الفصل الدراسي">${vis.map(x => `<button type="button" data-tm="${x.id}" class="${x.id === t.id ? 'on' : ''}" aria-pressed="${x.id === t.id}">${esc(shortName(x))}</button>`).join('')}</div>` : ''}
        ${pr ? `<div class="tm-prog" aria-hidden="true"><i style="width:${pr.pct}%"></i></div><div class="small muted" style="margin-top:4px">${pr.started ? `الأسبوع ${AR(pr.cur)} من ${AR(pr.n)} · متبقٍ ${AR(pr.left)} يوماً` : `${AR(pr.n)} أسبوعاً · لم يبدأ بعد`}</div>` : ''}
        ${owner() ? `<button type="button" data-tmgo style="margin-top:6px;color:#005499;font-weight:800">إدارة الفصول الدراسية ←</button>` : ''}`;
      const who = m.querySelector('.who'); (who ? who.after(box) : m.prepend(box));
      $$('[data-tm]', box).forEach(b => b.onclick = ev => { ev.stopPropagation(); m.remove(); switchTerm(b.dataset.tm); });
      const g = box.querySelector('[data-tmgo]'); if (g) g.onclick = () => { m.remove(); A.LS.set('admtab', 'terms'); if (location.hash === '#/admin') A.route(); else location.hash = '#/admin'; };
    }, 0);
  }, true);

  // ---------------- تبويب الإدارة ----------------
  const prevAdmin = V.admin;
  V.admin = function (root) {
    const want = A.LS.get('admtab') === 'terms' && owner();
    prevAdmin(root);
    if (!owner()) return;
    const tabs = root.querySelector('.tabs'); if (!tabs || tabs.querySelector('[data-t="terms"]')) return;
    const b = document.createElement('button'); b.dataset.t = 'terms'; b.textContent = 'الفصول الدراسية';
    const org = tabs.querySelector('[data-t="org"]'); org ? org.before(b) : tabs.appendChild(b);
    b.onclick = () => { A.LS.set('admtab', 'terms'); V.admin(root); };
    if (want) { A.LS.set('admtab', 'terms'); $$('button', tabs).forEach(x => x.classList.toggle('on', x === b)); termsPanel(root.querySelector('#ad'), () => V.admin(root)); }
  };

  async function ensureFirst() {
    if (!first().virtual) return first();
    if (api.demo) { const r = { id: 'term1', school_id: S.school.id, ord: 1, name: 'الفصل الدراسي الأول', year_label: '', status: 'active', start_date: (S.weeksAll || []).map(w => w.start_date).sort()[0] || null, end_date: null, note: '' }; await api.ins('terms', [r]); await loadTerms(); return first(); }
    await api.rpc('term_ensure_first', {}); await loadTerms(); return first();
  }
  async function termsPanel(box, again) {
    box.innerHTML = '<div class="spinner"></div>';
    await loadTerms();
    // أسابيع كل الأقسام لحساب العدد
    const per = {}; for (const sec of S.sections) { try { per[sec.id] = sec.id === S.sectionId && S.weeksAll ? S.weeksAll : await api.weeks(sec.id); } catch (_) { per[sec.id] = []; } }
    const cnt = t => S.sections.map(sec => ({ sec, n: (per[sec.id] || []).filter(w => termOf(w) === t.id).length }));
    const next = Math.max(...S.terms.map(t => t.ord)) + 1;
    box.innerHTML = `<div class="head"><div class="grow"><h3 style="margin:0">الفصول الدراسية</h3><p class="sub" style="margin:4px 0 0">جهّز الفصل الجديد وهو «قيد التجهيز» فلا يراه المعلمون، ثم فعّله عند بدايته. الخطط والأسابيع السابقة تبقى محفوظة ويمكن الرجوع إليها من مؤشر الفصل.</p></div></div>
      <div class="tm-cards">${S.terms.map(t => { const c = cnt(t); const cur = t.id === S.termView; return `<div class="tm-card ${t.status === 'active' ? 'cur' : ''}">
        <div class="row" style="gap:10px;align-items:center"><div class="tm-num">${AR(t.ord)}</div><div class="grow"><h3>${esc(t.name)}</h3><div class="small muted">${esc(t.year_label || '')}</div></div><span class="tm-pill ${ST[t.status][1]}">${ST[t.status][0]}</span></div>
        <div class="tm-meta"><span>${t.start_date ? 'من ' + esc(A.arDate ? A.arDate(t.start_date) : t.start_date) : 'لم تُحدَّد البداية'}${t.end_date ? ' إلى ' + esc(A.arDate ? A.arDate(t.end_date) : t.end_date) : ''}</span>
          <span>${c.map(x => `${esc(x.sec.short_name || x.sec.name)}: ${x.n ? A.cnt(x.n, 'أسبوع', 'أسابيع') : 'بلا أسابيع'}`).join(' · ')}</span>${cur ? '<span style="color:#005499;font-weight:800">معروض الآن</span>' : ''}</div>
        <div class="tm-acts">${!cur ? `<button class="btn ghost sm" data-view="${t.id}">عرض</button>` : ''}
          ${t.status !== 'active' ? `<button class="btn sm" data-act="${t.id}">تفعيل كفصل حالي</button>` : ''}
          ${t.status === 'closed' ? `<button class="btn ghost sm" data-st="${t.id}" data-to="prep">إعادة للتجهيز</button>` : ''}
          ${t.status === 'active' && S.terms.length > 1 ? `<button class="btn ghost sm" data-st="${t.id}" data-to="closed">إنهاء الفصل</button>` : ''}
          ${!t.virtual ? `<button class="btn ghost sm" data-ed="${t.id}">تعديل</button>` : ''}
          ${c.some(x => !x.n) && !t.virtual ? `<button class="btn ghost sm" data-wk="${t.id}">إنشاء الأسابيع</button>` : ''}</div></div>`; }).join('')}
        ${next <= 3 ? `<button class="tm-add" id="tmAdd"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><b>إضافة الفصل الدراسي ${ORDN[next]}</b><span class="small muted">بنفس المعلمين والطلاب والفصول والجدول المعتمد</span></button>` : ''}</div>`;
    const act = async (fn, msg) => { try { await fn(); A.toast(msg, 'ok'); await A.loadSection(); A.shell(); A.LS.set('admtab', 'terms'); A.route(); } catch (e) { A.toast(window.apiMsg ? apiMsg(e) : e.message, 'err'); } };
    const setStatus = async (id, to) => {
      if (api.demo) { if (to === 'active') for (const t of S.terms.filter(x => x.status === 'active' && x.id !== id && !x.virtual)) await api.upd('terms', t.id, { status: 'closed' }); await api.upd('terms', id, { status: to }); return; }
      await api.rpc('term_set_status', { p_id: id, p_status: to });
    };
    $$('[data-view]', box).forEach(b => b.onclick = () => switchTerm(b.dataset.view));
    $$('[data-act]', box).forEach(b => b.onclick = async () => {
      let t = S.terms.find(x => x.id === b.dataset.act);
      if (!(await A.confirmBox(`تفعيل <b>${esc(t.name)}</b> كفصل حالي؟<br><span class="small muted">سيظهر للمعلمين وتصبح أسابيعه هي المعروضة افتراضياً، ويُعلَّم الفصل الحالي «منتهياً» (تبقى خططه محفوظة ويمكن الرجوع إليها).</span>`, 'تفعيل'))) return;
      await act(async () => { if (t.virtual) t = await ensureFirst(); else await ensureFirst(); await setStatus(t.id, 'active'); A.LS.set('term_view', t.id); if (!api.demo) { try { S.school = await api.updateSchool(S.school.id, { term_label: t.name + (t.year_label ? ' ' + t.year_label : '') }); } catch (_) { } } }, 'فُعِّل ' + t.name);
    });
    $$('[data-st]', box).forEach(b => b.onclick = async () => {
      const t = S.terms.find(x => x.id === b.dataset.st); const to = b.dataset.to;
      if (to === 'closed' && !(await A.confirmBox(`إنهاء <b>${esc(t.name)}</b>؟ تبقى خططه محفوظة للرجوع إليها.`, 'إنهاء'))) return;
      await act(async () => { const tt = t.virtual ? await ensureFirst() : t; await setStatus(tt.id, to); }, 'حُدِّثت الحالة');
    });
    $$('[data-ed]', box).forEach(b => b.onclick = () => termDialog(S.terms.find(x => x.id === b.dataset.ed), again));
    $$('[data-wk]', box).forEach(b => b.onclick = () => weeksDialog(S.terms.find(x => x.id === b.dataset.wk), per, again));
    const ad = box.querySelector('#tmAdd'); if (ad) ad.onclick = () => termDialog(null, again, next);
  }

  // ---------------- معالج إضافة/تعديل فصل ----------------
  const nextSunday = d => { const x = new Date(d); x.setDate(x.getDate() + ((7 - x.getDay()) % 7)); return x; };
  function termDialog(t, again, ord) {
    const isNew = !t; ord = t ? t.ord : ord;
    const lastEnd = (() => { const all = (S.weeksAll || []).map(w => w.start_date).sort(); if (!all.length) return new Date(); const d = A.parseDate(all[all.length - 1]); d.setDate(d.getDate() + 14); return d; })();
    const st0 = t && t.start_date ? t.start_date : A.isoDate(nextSunday(lastEnd));
    const end0 = t && t.end_date ? t.end_date : (() => { const d = A.parseDate(st0); d.setDate(d.getDate() + 18 * 7 - 3); return A.isoDate(d); })();
    const y0 = t ? t.year_label : ((S.terms || []).map(x => x.year_label).find(Boolean) || '');
    const m = A.modal(`<h3>${isNew ? 'إضافة الفصل الدراسي ' + (ORDN[ord] || AR(ord)) : 'تعديل ' + esc(t.name)}</h3>
      ${isNew ? `<ol class="tm-steps small"><li><span class="tm-pill tm-prep">١</span> يُنشأ الفصل «قيد التجهيز» — لا يراه المعلمون.</li><li><span class="tm-pill tm-prep">٢</span> تُنشأ أسابيعه لكل قسم تختاره، بالجدول المعتمد والمعلمين المسندين حالياً.</li><li><span class="tm-pill tm-prep">٣</span> تجهّز ما تريد (الجدول، التوزيع، الإجازات) ثم تفعّله عند بدايته.</li></ol>` : ''}
      <div class="grid g2"><div class="field"><label for="tmN">اسم الفصل</label><input class="in" id="tmN" value="${esc(t ? t.name : 'الفصل الدراسي ' + (ORDN[ord] || AR(ord)))}"></div>
        <div class="field"><label for="tmY">العام الدراسي</label><input class="in" id="tmY" value="${esc(y0)}" placeholder="مثال: ١٤٤٨هـ"></div>
        <div class="field"><label for="tmS">بداية الفصل (الأحد)</label><input class="in" type="date" id="tmS" value="${st0}"></div>
        <div class="field"><label for="tmE">نهاية الفصل</label><input class="in" type="date" id="tmE" value="${end0}"></div></div>
      ${isNew ? `<div class="field"><label for="tmW">عدد الأسابيع</label><input class="in" type="number" id="tmW" min="1" max="25" value="18" style="max-width:140px"> <span class="small muted" id="tmWh"></span></div>
        <div class="field"><label>الأقسام التي تُنشأ أسابيعها الآن</label>${S.sections.map(s => `<label class="tm-sec"><input type="checkbox" data-sec="${s.id}" checked> <b>${esc(s.name)}</b></label>`).join('')}<div class="small muted">يمكنك إنشاء أسابيع أي قسم لاحقاً من بطاقة الفصل.</div></div>
        <div class="field"><label>ما ينتقل تلقائياً للفصل الجديد</label><div class="tm-chk">
          ${[['المعلمون والصلاحيات', 'كما هي'], ['الطلاب والفصول', 'كما هي'], ['الجدول المعتمد والإسنادات', 'تُبنى عليه أسابيع الفصل'], ['بنك الأسئلة والمصادر', 'متاحة دون تغيير'], ['خطط الفصل الأول', 'تبقى محفوظة للرجوع إليها']].map(([a, b]) => `<label><input type="checkbox" checked disabled> <span><b>${a}</b><small>${b}</small></span></label>`).join('')}</div>
          <div class="small muted" style="margin-top:6px">لتغيير الجدول للفصل الثاني: عدّله من «الجداول والأنصبة» واعتمده مع تطبيقه على الأسابيع المفتوحة.</div></div>` : ''}
      <div class="acts"><button class="btn" id="tmGo">${isNew ? 'إنشاء الفصل' : 'حفظ'}</button></div>`, { cls: 'wide' });
    const W = m.el.querySelector('#tmW');
    const hint = () => { if (!W) return; const s = m.el.querySelector('#tmS').value, e = m.el.querySelector('#tmE').value; if (s && e) { const n = Math.round((A.parseDate(e) - A.parseDate(s)) / 864e5 / 7) + 1; m.el.querySelector('#tmWh').textContent = `حسب التاريخين ≈ ${AR(Math.max(1, n))} أسبوعاً`; if (!W.dataset.touched) W.value = Math.max(1, Math.min(25, n)); } };
    if (W) W.oninput = () => { W.dataset.touched = 1; };
    if (W) { m.el.querySelector('#tmS').onchange = m.el.querySelector('#tmE').onchange = hint; hint(); }
    m.el.querySelector('#tmGo').onclick = e => A.run(e.currentTarget, async () => {
      const name = m.el.querySelector('#tmN').value.trim(), year = m.el.querySelector('#tmY').value.trim(), s = m.el.querySelector('#tmS').value, en = m.el.querySelector('#tmE').value;
      if (!name) throw new Error('اكتب اسم الفصل'); if (!s) throw new Error('حدد بداية الفصل');
      if (en && en < s) throw new Error('تاريخ النهاية قبل البداية');
      if (isNew && A.parseDate(s).getDay() !== 0 && !(await A.confirmBox('تاريخ البداية ليس يوم أحد. المتابعة؟', 'متابعة'))) return;
      let term;
      if (api.demo) {
        await ensureFirst();
        if (isNew) { term = { id: 'term' + ord + '-' + Date.now(), school_id: S.school.id, ord, name, year_label: year, start_date: s, end_date: en || null, status: 'prep', note: '' }; await api.ins('terms', [term]); }
        else { await api.upd('terms', t.id, { name, year_label: year, start_date: s, end_date: en || null }); term = t; }
      } else term = await api.rpc('term_save', { p_id: isNew ? null : t.id, p_ord: ord, p_name: name, p_year: year, p_start: s, p_end: en || null, p_note: '' });
      let made = 0, errs = [];
      if (isNew) {
        const n = Math.max(1, Math.min(25, +W.value || 18));
        for (const cb of $$('[data-sec]', m.el).filter(x => x.checked)) {
          try { made += await createWeeks(term, cb.dataset.sec, s, n); } catch (er) { errs.push((S.sections.find(x => x.id === cb.dataset.sec) || {}).name + ': ' + (window.apiMsg ? apiMsg(er) : er.message)); }
        }
      }
      m.close();
      if (isNew) { A.LS.set('term_view', term.id); await A.loadSection(); A.shell(); A.LS.set('admtab', 'terms'); A.route(); }
      else again();
      A.toast(isNew ? `أُنشئ ${name} قيد التجهيز${made ? ' مع ' + A.cnt(made, 'أسبوع', 'أسابيع') : ''}` : 'حُفظ', errs.length ? 'err' : 'ok');
      if (errs.length) A.modal(`<h3>لم تُنشأ أسابيع بعض الأقسام</h3><ul>${errs.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="small muted">غالباً لعدم وجود جدول معتمد للقسم. اعتمد الجدول ثم أنشئ الأسابيع من بطاقة الفصل.</p>`);
    });
  }
  async function createWeeks(term, secId, start, n) {
    if (!api.demo) return await api.rpc('term_create_weeks', { p_term: term.id, p_section: secId, p_start: start, p_count: n, p_deadline_days: 3 });
    const all = await api.list('weeks', { section_id: secId }); let n0 = Math.max(0, ...all.map(w => w.number)); let k = 0;
    for (let i = 1; i <= n; i++) { const d = A.parseDate(start); d.setDate(d.getDate() + (i - 1) * 7); const dl = new Date(d); dl.setDate(dl.getDate() - 3); dl.setHours(20, 0, 0, 0); const id = await api.createWeek({ section_id: secId, number: n0 + i, word: A.ORD[i] || AR(i), start_date: A.isoDate(d), deadline: dl.toISOString() }); await api.upd('weeks', id, { term_id: term.id }); k++; }
    return k;
  }
  function weeksDialog(t, per, again) {
    const missing = S.sections.filter(s => !(per[s.id] || []).some(w => termOf(w) === t.id));
    const m = A.modal(`<h3>إنشاء أسابيع ${esc(t.name)}</h3>
      <div class="grid g2"><div class="field"><label for="twS">بداية أول أسبوع (الأحد)</label><input class="in" type="date" id="twS" value="${t.start_date || ''}"></div><div class="field"><label for="twN">عدد الأسابيع</label><input class="in" type="number" id="twN" min="1" max="25" value="18"></div></div>
      <div class="field"><label>الأقسام</label>${missing.map(s => `<label class="tm-sec"><input type="checkbox" data-sec="${s.id}" checked> <b>${esc(s.name)}</b></label>`).join('')}</div>
      <div class="acts"><button class="btn" id="twGo">إنشاء</button></div>`);
    m.el.querySelector('#twGo').onclick = e => A.run(e.currentTarget, async () => {
      const s = m.el.querySelector('#twS').value, n = Math.max(1, Math.min(25, +m.el.querySelector('#twN').value || 18)); if (!s) throw new Error('حدد تاريخ البداية');
      let made = 0; for (const cb of $$('[data-sec]', m.el).filter(x => x.checked)) made += await createWeeks(t, cb.dataset.sec, s, n);
      m.close(); await A.loadSection(); A.shell(); A.LS.set('admtab', 'terms'); A.route(); A.toast('أُنشئ ' + A.cnt(made, 'أسبوع', 'أسابيع'), 'ok');
    });
  }

  // أسبوع يُنشأ يدوياً أثناء عرض فصل غير الأول ينتمي لذلك الفصل
  if (api.createWeek && !api.createWeek._tm) {
    const cw = api.createWeek;
    api.createWeek = async function (a) { const id = await cw.apply(this, arguments); const t = A.termCur && A.termCur(); if (id && t && !t.virtual && t.ord !== 1) { try { api.demo ? await api.upd('weeks', id, { term_id: t.id }) : await api.updateWeek(id, { term_id: t.id }); } catch (_) { } } return id; };
    api.createWeek._tm = 1;
  }

  // ---------------- ربط مؤشر الشريط العلوي ----------------
  const prevAfter = window.APP_AFTER_SHELL;
  window.APP_AFTER_SHELL = function () {
    if (prevAfter) prevAfter.apply(this, arguments);
    const s = $('#termSel'); if (s) s.onchange = e => switchTerm(e.target.value);
  };
})();
