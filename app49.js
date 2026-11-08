/* منصة دينا — طلبات الاعتماد:
   - المعلم يضيف مهمة أدائية أثناء الأسبوع، وتظهر في الخطة فوراً بعلامة «بانتظار الاعتماد».
   - تعديل التنفيذ اليومي بعد تأكيده يُرسل للاعتماد بدلاً من الحفظ المباشر.
   - المالك يرى كل الطلبات في لوحة بارزة ويعتمد أو يرفض مع سبب.
   - أنواع المهام الأدائية مع شرح مختصر للمعلم ورسم توضيحي لكل نوع. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;

  const css = `
  .chg-inbox{border:2px solid #E0822B;background:linear-gradient(180deg,#FFF6EC,#fff);border-radius:14px;padding:14px 16px;margin:0 0 16px}
  .chg-inbox h3{margin:0 0 4px;color:#9A4A0B;display:flex;gap:8px;align-items:center}
  .chg-dot{width:10px;height:10px;border-radius:50%;background:#E0822B;box-shadow:0 0 0 0 rgba(224,130,43,.6);animation:chgp 1.6s infinite}
  @keyframes chgp{0%{box-shadow:0 0 0 0 rgba(224,130,43,.6)}70%{box-shadow:0 0 0 10px rgba(224,130,43,0)}100%{box-shadow:0 0 0 0 rgba(224,130,43,0)}}
  @media (prefers-reduced-motion:reduce){.chg-dot{animation:none}}
  .chg-row{display:flex;gap:10px;align-items:flex-start;justify-content:space-between;background:#fff;border:1px solid #F1D3B3;border-radius:10px;padding:10px 12px;margin-top:8px;flex-wrap:wrap}
  .chg-tag{display:inline-block;background:#E0822B;color:#fff;border-radius:999px;padding:1px 9px;font-size:12px;font-weight:700;margin-inline-end:6px}
  .chg-pend{margin-top:4px;background:#FFF1E3;color:#9A4A0B;border-radius:8px;padding:4px 8px;font-size:12px;display:inline-block}
  .pf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;margin:10px 0}
  .pf-card{border:1px solid var(--line,#D8E1EE);background:#fff;border-radius:12px;padding:8px;cursor:pointer;text-align:center;font:inherit;color:inherit}
  .pf-card[aria-pressed=true]{border-color:#005499;box-shadow:0 0 0 2px #3AB1DB inset;background:#EEF6FC}
  .pf-card:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}
  .pf-ic{display:block;width:56px;height:56px;margin:0 auto 4px;color:#005499}
  .pf-ic svg{width:100%;height:100%}
  .pf-info{background:#F4F8FC;border-inline-start:4px solid #3AB1DB;border-radius:8px;padding:10px 12px;margin:6px 0 10px;line-height:1.8}
  @media (max-width:520px){.pf-grid{grid-template-columns:repeat(2,1fr)}}`;
  if (!document.getElementById('app49css')) { const st = document.createElement('style'); st.id = 'app49css'; st.textContent = css; document.head.appendChild(st); }

  // رسوم توضيحية بسيطة لكل نوع مهمة (خطوط، بألوان الهوية عبر currentColor)
  const SVG = p => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICON = {
    general: SVG('<circle cx="24" cy="24" r="17"/><path d="M24 14l3 6.5 7 .9-5 4.8 1.3 7-6.3-3.4-6.3 3.4 1.3-7-5-4.8 7-.9z"/>'),
    homework: SVG('<rect x="10" y="7" width="28" height="34" rx="3"/><path d="M16 15h16M16 21h16M16 27h9"/><path d="M30 36l8-8 3 3-8 8h-3z"/>'),
    folding: SVG('<path d="M8 12h32v24H8z"/><path d="M24 12v24M8 24h16"/><path d="M30 30l3 3 6-6"/>'),
    inquiry: SVG('<circle cx="21" cy="21" r="12"/><path d="M30 30l10 10"/><path d="M18 19a3 3 0 1 1 4 2.8c-.8.4-1 1-1 2"/><circle cx="21" cy="27.5" r=".6"/>'),
    explore: SVG('<circle cx="24" cy="24" r="17"/><path d="M31 17l-4 10-10 4 4-10z"/>'),
    present: SVG('<rect x="6" y="8" width="36" height="24" rx="3"/><path d="M16 40h16M24 32v8"/><path d="M14 24v-6M20 24v-9M26 24v-4M32 24v-8"/>'),
    mindmap: SVG('<circle cx="24" cy="24" r="6"/><circle cx="10" cy="12" r="4"/><circle cx="38" cy="12" r="4"/><circle cx="10" cy="36" r="4"/><circle cx="38" cy="36" r="4"/><path d="M18 21l-4-6M30 21l4-6M18 27l-4 6M30 27l4 6"/>'),
    concept: SVG('<rect x="6" y="8" width="14" height="10" rx="2"/><rect x="28" y="8" width="14" height="10" rx="2"/><rect x="17" y="30" width="14" height="10" rx="2"/><path d="M20 13h8M13 18v4h22v-4M24 22v8"/>'),
    trip: SVG('<path d="M6 12l12-4 12 4 12-4v28l-12 4-12-4-12 4z"/><path d="M18 8v28M30 12v28"/><circle cx="36" cy="22" r="2.5"/>'),
    research: SVG('<path d="M8 8h22a4 4 0 0 1 4 4v28H12a4 4 0 0 1-4-4z"/><path d="M14 16h12M14 22h10"/><circle cx="34" cy="34" r="6"/><path d="M38.5 38.5L43 43"/>'),
    report: SVG('<rect x="10" y="8" width="28" height="34" rx="3"/><path d="M18 6h12v6H18z"/><path d="M16 22l5-5 4 4 7-7M16 34h16"/>'),
    experiment: SVG('<path d="M19 6h10M21 6v12L10 38a3 3 0 0 0 2.6 4.5h22.8A3 3 0 0 0 38 38L27 18V6"/><path d="M16 30h16"/><circle cx="22" cy="36" r="1.2"/><circle cx="28" cy="34" r="1.2"/>'),
    project: SVG('<rect x="6" y="8" width="12" height="32" rx="2"/><rect x="22" y="8" width="12" height="20" rx="2"/><rect x="38" y="8" width="4" height="12" rx="1"/><path d="M8 16h8M24 16h8"/>'),
    complex: SVG('<rect x="6" y="6" width="22" height="14" rx="3"/><rect x="20" y="16" width="22" height="14" rx="3"/><rect x="6" y="28" width="22" height="14" rx="3"/><path d="M28 36l3 3 5-6"/>'),
  };
  // شرح بسيط للمعلم: كيف تُستخدم المهمة
  const HOW = {
    general: 'حدّد نوع الأداء المطلوب (شفوي أو تحريري أو عملي)، واربطه بمعيار واضح، واكتب موعد التسليم أو العرض.',
    homework: 'كلّف الطالب بدراسة موضوع أو حل تمارين في المنزل. صحّحها أول بأول، ودوّن الملاحظات المناسبة.',
    folding: 'يُعدّ الطالب مطوية مختصرة عن موضوع الدرس، تُسلَّم في موعد محدد، وتُقيَّم بالمعايير.',
    inquiry: 'يعمل الطالب مع مجموعته على مشكلة واقعية، ويسجّل خطوات الحل ويعرضها.',
    explore: 'يستخرج الطالب معلومات من النص أو الواقع ويعيد تنظيمها في نص جديد يوضّح ما تعلّمه.',
    present: 'يُعدّ الطالب عرضاً تقديمياً من عدة شرائح، يقدّمه أمام زملائه ويشرح أفكاره.',
    mindmap: 'يبني الطالب خريطة تبدأ من الفكرة الرئيسية وتتفرع منها الأفكار الفرعية بروابط واضحة.',
    concept: 'يرتّب الطالب المفاهيم من الأعم إلى الأخص، ويربط بينها بكلمات الربط في مخطط منظم.',
    trip: 'يبحث الطالب في الإنترنت عن محتوى محدد يتبع رابطاً أو مساراً مرسوماً، ثم يلخّص ما وجده.',
    research: 'يبحث الطالب في موضوع محدد، ويكتب نتائجه مع توثيق المراجع، ويُقيَّم بالتنظيم والشمول.',
    report: 'يكتب الطالب تقريراً بعد زيارة أو تجربة أو قراءة، يرتبط بمحتوى المقرر ويدعم بالصور والبيانات.',
    experiment: 'ينفّذ الطالب تجربة أو عملية رصد، ويسجّل الملاحظات والنتائج، ويقارنها بالتوقعات.',
    project: 'يخطط الطالب لمشروع يبدأ بتحديد المشكلة، ثم ينفّذه ويكتب تقريره ويعرضه على الآخرين.',
    complex: 'مهمة تحتاج مهارات من أكثر من مجال (قراءة وحساب ورسم وعرض)، وتنتهي بناتج إبداعي يحدده الطالب.',
  };
  const typeLabel = k => (A.PERF.find(x => x[0] === k) || [])[1] || '';
  const pendingOf = e => (e.change_requests || []).filter(r => r && r.status !== 'rejected');
  const canDecide = () => !!(S.me && (S.me.is_owner || A.perm('review')));
  const isPriv = () => canDecide();

  // ---------- صف في التنفيذ اليومي: طلب بانتظار الاعتماد ----------
  A.chgRow = e => {
    const out = pendingOf(e).map(r => r.kind === 'exec'
      ? `<div class="chg-pend">⏳ تعديل تنفيذ بانتظار الاعتماد: ${esc(({ done: 'نُفِّذت', modified: 'عُدِّلت ثم نُفِّذت', not_done: 'لم تُنفَّذ', pending: 'بلا تأكيد' })[r.payload && r.payload.status] || '')}</div>`
      : r.kind === 'perf' ? `<div class="chg-pend">⏳ مهمة أدائية بانتظار الاعتماد: ${esc((r.payload || {}).text || '')}</div>` : '').join('');
    const rej = (e.change_requests || []).filter(r => r && r.status === 'rejected').slice(-1).map(r => `<div class="small" style="color:var(--warn);margin-top:4px">مرفوض: ${esc(r.note || 'بلا سبب')}</div>`).join('');
    return out + rej;
  };

  // ---------- تنفيذ اليوم: زر المهمة الأدائية أثناء الأسبوع ----------
  A.exExtras = (root, list, opts, ro) => {
    if (ro) return;
    $$('.exrow', root).forEach(row => {
      const e = list.find(x => x.id === row.dataset.id); if (!e) return;
      const acts = row.querySelector('.acts'); if (!acts || acts.querySelector('[data-pf]')) return;
      const b = document.createElement('button'); b.className = 'btn ghost sm'; b.dataset.pf = '1'; b.textContent = '+ مهمة أدائية';
      b.onclick = () => openPerf(e, root, opts);
      acts.appendChild(b);
    });
  };

  function openPerf(e, root, opts) {
    const cards = A.PERF.map(([k, l]) => `<button type="button" class="pf-card" data-k="${k}" aria-pressed="false"><span class="pf-ic">${ICON[k] || ICON.general}</span><b>${esc(l)}</b></button>`).join('');
    const m = A.modal(`<h3>مهمة أدائية أثناء الأسبوع</h3>
      <p class="small muted">${esc((A.cls(e.class_id) || {}).name || '')} · ${esc(A.subjName(e.subject_id))} · الحصة ${AR(e.period + 1)}. ${isPriv() ? 'ستُحفظ مباشرة في الخطة.' : 'تُرسل للاعتماد، وتظهر في الخطة فوراً بعلامة «بانتظار الاعتماد».'}</p>
      <div class="pf-grid" role="group" aria-label="أنواع المهام">${cards}</div>
      <div id="pfInfo" class="pf-info small">اختر نوع المهمة لترى شرحها وكيفية استخدامها.</div>
      <div class="field"><label for="pfT">نص المهمة</label><textarea class="in" id="pfT" rows="3" maxlength="600" placeholder="ماذا يُنفَّذ الطالب، وبأي معيار يُقيَّم"></textarea></div>
      <div class="field"><label for="pfD">موعد التسليم</label><input class="in" id="pfD" maxlength="200" placeholder="مثال: الخميس القادم"></div>
      <div class="acts"><button class="btn" id="pfGo">${isPriv() ? 'حفظ في الخطة' : 'إرسال للاعتماد'}</button></div>`);
    let type = '';
    m.el.querySelectorAll('.pf-card').forEach(c => c.onclick = () => {
      type = c.dataset.k;
      m.el.querySelectorAll('.pf-card').forEach(x => x.setAttribute('aria-pressed', x === c ? 'true' : 'false'));
      m.el.querySelector('#pfInfo').innerHTML = `<b>${esc(typeLabel(type))}:</b> ${esc(HOW[type] || '')}`;
      const t = m.el.querySelector('#pfT'); if (!t.value.trim()) t.value = (A.PERF.find(x => x[0] === type) || [])[2] || '';
    });
    m.el.querySelector('#pfGo').onclick = ev => A.run(ev.currentTarget, async () => {
      const text = m.el.querySelector('#pfT').value.trim();
      if (!type) throw new Error('اختر نوع المهمة أولاً');
      if (!text) throw new Error('اكتب نص المهمة');
      const r = await api.requestPerf(e.id, { type, text, due: m.el.querySelector('#pfD').value.trim() });
      m.close(); await A.loadWeek();
      A.toast(r && isPriv() ? 'حُفظت المهمة في الخطة' : 'أُرسلت المهمة للاعتماد، وتظهر في الخطة بعلامة «بانتظار الاعتماد»', 'ok');
      if (root && root.isConnected) V._exec(root, opts);
    });
  }

  // ---------- لوحة المالك: طلبات بانتظار الاعتماد ----------
  const dash0 = V.dash;
  if (dash0) V.dash = function (root) {
    dash0(root);
    if (!canDecide()) return;
    const h = $('.head', root); if (!h) return;
    const items = S.entries.flatMap(e => pendingOf(e).map(r => ({ e, r })));
    if (!items.length) return;
    const who = e => A.personName(e.teacher_id) || 'بلا معلم';
    const desc = ({ e, r }) => {
      if (r.kind === 'perf') { const p = r.payload || {}; return `<b>مهمة أدائية:</b> ${esc(typeLabel(p.type) || 'مهمة')} — ${esc(p.text || '')}${p.due ? `<div class="faint small">التسليم: ${esc(p.due)}</div>` : ''}`; }
      const st = { done: 'نُفِّذت', modified: 'عُدِّلت ثم نُفِّذت', not_done: 'لم تُنفَّذ', pending: 'بلا تأكيد' };
      return `<b>تعديل تنفيذ:</b> من «${esc(st[(r.payload || {}).from] || '—')}» إلى «${esc(st[(r.payload || {}).status] || '—')}»${(r.payload || {}).note ? `<div class="small">السبب: ${esc(r.payload.note)}</div>` : ''}`;
    };
    const rows = items.map(it => `<div class="chg-row" data-e="${it.e.id}" data-r="${it.r.id}">
        <div><span class="chg-tag">${it.r.kind === 'perf' ? 'مهمة' : 'تنفيذ'}</span><b>${esc(who(it.e))}</b> · ${esc((A.cls(it.e.class_id) || {}).name || '')} · ${esc(A.subjName(it.e.subject_id))} · الحصة ${AR(it.e.period + 1)}
          <div class="small" style="margin-top:4px">${desc(it)}</div></div>
        <div class="row" style="gap:6px"><button class="btn ok sm" data-ok>اعتماد</button><button class="btn ghost sm" data-no>رفض</button></div></div>`).join('');
    h.insertAdjacentHTML('afterend', `<section class="chg-inbox" id="chgInbox" aria-labelledby="chgH"><h3 id="chgH"><span class="chg-dot" aria-hidden="true"></span>${A.cnt(items.length, 'طلب جديد', 'طلبات جديدة')} بانتظار اعتمادك</h3>
      <p class="small muted" style="margin:0">من تعديلات التنفيذ بعد التأكيد والمهام الأدائية المضافة أثناء الأسبوع. يُعرض أسبوع الخطة المحمّل حالياً.</p>${rows}</section>`);
    const box = $('#chgInbox', root);
    box.querySelectorAll('[data-ok]').forEach(b => b.onclick = () => {
      const row = b.closest('.chg-row');
      A.run(b, async () => { await api.decideChange(row.dataset.e, row.dataset.r, true, ''); await A.loadWeek(); A.toast('اعتُمد الطلب وطُبّق على الخطة', 'ok'); V.dash(root); });
    });
    box.querySelectorAll('[data-no]').forEach(b => b.onclick = () => {
      const row = b.closest('.chg-row');
      const m = A.modal(`<h3>رفض الطلب</h3><p class="small muted">سيظهر السبب للمعلم في حصته.</p><div class="field"><label for="chgN">سبب الرفض</label><textarea class="in" id="chgN" rows="3" maxlength="400"></textarea></div><div class="acts"><button class="btn" id="chgGo">تأكيد الرفض</button></div>`);
      m.el.querySelector('#chgGo').onclick = ev => A.run(ev.currentTarget, async () => {
        await api.decideChange(row.dataset.e, row.dataset.r, false, m.el.querySelector('#chgN').value.trim());
        m.close(); await A.loadWeek(); A.toast('رُفض الطلب، وسيرى المعلم السبب', 'ok'); V.dash(root);
      });
    });
  };

  // =====================================================================
  //  التدقيق اللغوي للنصوص الجديدة (المهمة الأدائية وسبب تعديل التنفيذ)
  //  يقترح فقط ولا يغيّر شيئاً إلا إذا ضغط المستخدم «تطبيق الاقتراح».
  // =====================================================================
  const LC = () => window.LangCheck && typeof window.LangCheck.check === 'function' ? window.LangCheck : null;
  const diffHtml = (a, b) => { const x = a.split(/(\s+)/), y = b.split(/(\s+)/); return y.map(t => x.includes(t) ? esc(t) : `<ins>${esc(t)}</ins>`).join(''); };
  A.langOf = t => { const L = LC(); if (!L || !String(t || '').trim()) return null; try { return L.check(t); } catch (_) { return null; } };
  A.langHint = ta => {
    if (!ta || ta.dataset.lh) return; ta.dataset.lh = '1';
    const w = document.createElement('div'); w.className = 'lh-box';
    w.innerHTML = `<button type="button" class="btn ghost sm lh-go">تدقيق لغوي</button><div class="lh-out small" aria-live="polite"></div>`;
    ta.insertAdjacentElement('afterend', w);
    const out = w.querySelector('.lh-out');
    w.querySelector('.lh-go').onclick = () => {
      if (!LC()) { out.textContent = 'أداة التدقيق غير متاحة حالياً.'; return; }
      const r = A.langOf(ta.value);
      if (!String(ta.value || '').trim()) { out.textContent = 'اكتب النص أولاً.'; return; }
      if (!r) { out.innerHTML = '<span class="lh-ok">لا ملاحظات لغوية.</span>'; return; }
      out.innerHTML = `<div class="lh-sug">اقتراح: ${diffHtml(r.original, r.suggestion)}</div><div class="faint">${esc([...new Set((r.changes || []).map(c => c.rule))].join('، '))}</div><button type="button" class="btn ok sm lh-ap">تطبيق الاقتراح</button>`;
      out.querySelector('.lh-ap').onclick = () => { ta.value = r.suggestion; ta.dispatchEvent(new Event('input', { bubbles: true })); out.innerHTML = '<span class="lh-ok">طُبّق الاقتراح — راجع النص قبل الحفظ.</span>'; };
    };
  };
  const css2 = `.lh-box{margin:4px 0 8px;display:flex;flex-direction:column;gap:4px;align-items:flex-start}.lh-out ins{background:#E3F3E9;color:#1F6B44;text-decoration:none;border-radius:4px;padding:0 3px}.lh-ok{color:#1F6B44}.lh-sug{line-height:1.8}
  .chg-lang{margin-top:6px;background:#F4F8FC;border-inline-start:3px solid #3AB1DB;border-radius:6px;padding:6px 8px}.chg-lang ins{background:#E3F3E9;color:#1F6B44;text-decoration:none;border-radius:4px;padding:0 3px}
  .ace-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0}.ace-k div.k{display:block;margin:0;box-shadow:none;background:#fff;border:1px solid #DCE7F3;border-radius:12px;padding:10px 12px}.ace-k b{display:block;font-size:22px;color:#082B5A}.ace-k span{font-size:12.5px;color:#5F7896}
  .ace-f{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;margin-top:10px}.ace-bar{display:flex;align-items:center;gap:6px;min-width:90px}
  .ace-late{color:#B23B2B;font-weight:700}`;
  if (!document.getElementById('app49css2')) { const st = document.createElement('style'); st.id = 'app49css2'; st.textContent = css2; document.head.appendChild(st); }

  // ---------- تكليف إلكتروني إضافي أثناء الأسبوع (واجب/اختبار/ورقة عمل) ----------
  // يفتح محرر الاختبارات الحالي مربوطاً بأسبوع الحصة ويومها وفصلها، ولا يغيّر شيئاً في الخطة.
  async function openEAssign(e) {
    const X = A._assess; if (!X || !X.quizEditor) return A.toast('أداة الاختبارات غير متاحة في هذه الصفحة', 'err');
    const c = A.cls(e.class_id); if (!c) return;
    const m = A.modal(`<h3>تكليف إلكتروني إضافي</h3><p class="small muted">${esc(c.name)} · ${esc(A.subjName(e.subject_id))} · ${A.DAYS[e.day]} الحصة ${AR(e.period + 1)}. يُضاف تكليفاً جديداً مرتبطاً بهذا الأسبوع واليوم، ويظهر للطلاب وأولياء الأمور بعد نشره، دون تغيير ما في الخطة.</p>
      <div class="row" style="gap:8px;flex-wrap:wrap">${[['homework', 'واجب إلكتروني'], ['quiz', 'اختبار قصير'], ['worksheet', 'ورقة عمل']].map(([k, l]) => `<button class="btn ghost" data-ek="${k}">${l}</button>`).join('')}</div>`);
    m.el.querySelectorAll('[data-ek]').forEach(b => b.onclick = () => A.run(b, async () => {
      X.ctx.subj = e.subject_id; X.ctx.grade = X.gk(c); await X.loadCtx();
      m.close();
      if (!(X.QB || []).length) return A.toast('لا توجد أسئلة في بنك هذه المادة والصف بعد. أضف أسئلة من «التقويم ← بنك الأسئلة» ثم أنشئ التكليف.', 'warn');
      const kind = b.dataset.ek, lbl = ({ homework: 'واجب إلكتروني', quiz: 'اختبار قصير', worksheet: 'ورقة عمل' })[kind];
      X.quizEditor({ kind, title: `${lbl} — ${A.subjName(e.subject_id)}`, week_id: S.weekId, day: e.day, class_ids: [e.class_id] }, () => { });
      // الفصل نفسه فقط محدَّد افتراضياً
      const ov = [...document.querySelectorAll('.ovl')].pop(); if (ov) ov.querySelectorAll('[data-c]').forEach(i => { i.checked = i.dataset.c === e.class_id; });
    }));
  }

  // ربط الأزرار الإضافية في صف التنفيذ
  const exExtras0 = A.exExtras;
  A.exExtras = (root, list, opts, ro) => {
    exExtras0(root, list, opts, ro); if (ro) return;
    $$('.exrow', root).forEach(row => {
      const e = list.find(x => x.id === row.dataset.id); if (!e) return;
      const acts = row.querySelector('.acts'); if (!acts || acts.querySelector('[data-ea]')) return;
      const b = document.createElement('button'); b.className = 'btn ghost sm'; b.dataset.ea = '1'; b.textContent = '+ تكليف إلكتروني';
      b.onclick = () => openEAssign(e); acts.appendChild(b);
    });
  };
  // تدقيق لغوي في نافذة المهمة الأدائية
  const mo = new MutationObserver(() => { const t = document.querySelector('.ovl #pfT'); if (t) A.langHint(t); const n = document.querySelector('.ovl #exN'); if (n) A.langHint(n); });
  mo.observe(document.body, { childList: true, subtree: true });

  // ---------- لوحة الاعتماد: تدقيق لغوي و«اعتماد مع التصحيح» ----------
  const dash1 = V.dash;
  V.dash = function (root) {
    dash1(root);
    const box = $('#chgInbox', root); if (!box) return;
    box.querySelectorAll('.chg-row').forEach(row => {
      const e = S.entries.find(x => x.id === row.dataset.e); if (!e) return;
      const r = (e.change_requests || []).find(x => x.id === row.dataset.r); if (!r) return;
      const txt = r.kind === 'perf' ? (r.payload || {}).text : (r.payload || {}).note;
      const L = A.langOf(txt); if (!L) return;
      row.querySelector('div').insertAdjacentHTML('beforeend', `<div class="chg-lang small"><b>تدقيق لغوي:</b> ${diffHtml(L.original, L.suggestion)}</div>`);
      const b = document.createElement('button'); b.className = 'btn sky sm'; b.textContent = 'اعتماد مع التصحيح';
      row.querySelector('.row').prepend(b);
      b.onclick = () => A.run(b, async () => {
        await api.decideChange(e.id, r.id, true, '');
        if (r.kind === 'perf') await api.requestPerf(e.id, { ...(r.payload || {}), text: L.suggestion });
        else await api.confirmExec([e.id], (r.payload || {}).status, L.suggestion);
        await A.loadWeek(); A.toast('اعتُمد الطلب بعد التصحيح اللغوي', 'ok'); V.dash(root);
      });
    });
  };

  // =====================================================================
  //  تقرير الاعتماد والتأكيد والتنفيذ اليومي — قراءة فقط
  // =====================================================================
  const ST = { done: 'نُفِّذت', modified: 'عُدِّلت ثم نُفِّذت', not_done: 'لم تُنفَّذ' };
  const pct = (a, b) => b ? Math.round(a * 100 / b) : 0;
  const bar = (p, c) => `<span class="ace-bar"><i style="display:inline-block;flex:1;min-width:60px;height:7px;border-radius:99px;background:#E4EBF5;overflow:hidden;vertical-align:middle"><s style="display:block;height:100%;width:${p}%;background:${c || '#005499'};border-radius:99px;text-decoration:none"></s></i><b>${AR(p)}٪</b></span>`;
  function aceData(st) {
    const w = A.week(); const start = A.parseDate(w.start_date);
    const today = Math.round((A.parseDate(A.isoDate(new Date())) - start) / 864e5);
    const E = S.entries.filter(e => e.subject_id && A.required(e) && (st.day === '' || e.day === +st.day) && (!st.teacher || e.teacher_id === st.teacher));
    const one = () => ({ req: 0, filled: 0, sent: 0, appr: 0, ret: 0, conf: 0, late: 0, done: 0, mod: 0, nd: 0, reqs: 0, rej: 0, perf: 0, perfP: 0, lang: 0 });
    const T = {}, D = {}, tot = one(), late = [], pend = [];
    E.forEach(e => {
      const g = [tot, T[e.teacher_id || '-'] = T[e.teacher_id || '-'] || one(), D[e.day] = D[e.day] || one()];
      const x = e.exec_status || 'pending', cr = e.change_requests || [];
      const pp = cr.filter(r => r.status !== 'rejected'), rj = cr.filter(r => r.status === 'rejected');
      const lang = ['topic', 'homework', 'note', 'exec_note'].filter(f => A.langOf(e[f])).length + (e.perf_task && A.langOf(e.perf_task.text) ? 1 : 0);
      g.forEach(o => {
        o.req++; if (A.filled(e)) o.filled++; if (['submitted', 'approved'].includes(e.status)) o.sent++; if (e.status === 'approved') o.appr++; if (e.status === 'returned') o.ret++;
        if (x !== 'pending') o.conf++; else if (e.day < today) o.late++;
        if (x === 'done') o.done++; if (x === 'modified') o.mod++; if (x === 'not_done') o.nd++;
        o.reqs += pp.length; o.rej += rj.length; if (e.perf_task && (e.perf_task.text || '').trim()) o.perf++; o.perfP += pp.filter(r => r.kind === 'perf').length; o.lang += lang;
      });
      if (x === 'pending' && e.day < today) late.push(e);
      pp.forEach(r => pend.push({ e, r }));
    });
    const rows = Object.entries(T).map(([id, t]) => ({ id, name: id === '-' ? 'بلا معلم' : (A.personName(id) || '—'), ...t })).sort((a, b) => pct(a.conf, a.req) - pct(b.conf, b.req) || a.name.localeCompare(b.name, 'ar'));
    return { w, today, E, tot, rows, D, late, pend };
  }
  function aceHtml(R) {
    const t = R.tot, exd = t.done + t.mod;
    const kpi = [['الحصص المطلوبة', AR(t.req), ''], ['نسبة الاعتماد', AR(pct(t.appr, t.req)) + '٪', `${AR(t.appr)} معتمدة · ${AR(t.ret)} مُرجعة`], ['نسبة التأكيد اليومي', AR(pct(t.conf, t.req)) + '٪', `${AR(t.conf)} مؤكدة · ${AR(t.late)} متأخرة`], ['نسبة التنفيذ', AR(pct(exd, t.conf)) + '٪', `من المؤكَّد: ${AR(t.done)} كما خُطِّط · ${AR(t.mod)} معدَّلة · ${AR(t.nd)} لم تُنفَّذ`], ['طلبات بانتظار الاعتماد', AR(t.reqs), `${AR(t.perfP)} مهمة أدائية · ${AR(t.rej)} مرفوضة`], ['ملاحظات لغوية', AR(t.lang), 'اقتراحات تدقيق في نصوص الحصص']];
    const days = A.weekDates(R.w, A.section().days);
    const dRows = Object.keys(R.D).map(Number).sort((a, b) => a - b).map(d => { const o = R.D[d]; return `<tr><th>${A.DAYS[d]} <span class="small muted">${AR(days[d] || '')}</span></th><td>${AR(o.req)}</td><td>${bar(pct(o.appr, o.req), '#2E8B57')}</td><td>${bar(pct(o.conf, o.req), '#005499')}</td><td>${AR(o.done)}</td><td>${AR(o.mod)}</td><td>${AR(o.nd)}</td><td class="${o.late ? 'ace-late' : ''}">${AR(o.late)}</td><td>${AR(o.reqs)}</td></tr>`; }).join('');
    const tRows = R.rows.map(r => `<tr><th>${esc(r.name)}</th><td>${AR(r.req)}</td><td>${bar(pct(r.appr, r.req), '#2E8B57')}</td><td>${AR(r.ret)}</td><td>${bar(pct(r.conf, r.req), '#005499')}</td><td>${AR(r.done)}</td><td>${AR(r.mod)}</td><td>${AR(r.nd)}</td><td class="${r.late ? 'ace-late' : ''}">${AR(r.late)}</td><td>${AR(r.reqs)}</td><td>${AR(r.perf)}</td><td>${AR(r.lang)}</td></tr>`).join('');
    const nm = e => `${esc((A.cls(e.class_id) || {}).name || '')} · ${esc(A.subjName(e.subject_id))} · ${A.DAYS[e.day]} ح${AR(e.period + 1)}`;
    const pRows = R.pend.map(({ e, r }) => `<tr><td>${esc(A.personName(e.teacher_id) || '—')}</td><td>${nm(e)}</td><td>${r.kind === 'perf' ? 'مهمة أدائية' : 'تعديل تنفيذ'}</td><td>${esc(r.kind === 'perf' ? (r.payload || {}).text || '' : `${ST[(r.payload || {}).from] || '—'} ← ${ST[(r.payload || {}).status] || '—'}${(r.payload || {}).note ? ': ' + r.payload.note : ''}`)}</td><td>${r.at ? esc(A.fmtDT(r.at)) : ''}</td></tr>`).join('');
    const lRows = R.late.sort((a, b) => a.day - b.day || a.period - b.period).map(e => `<tr><td>${esc(A.personName(e.teacher_id) || '—')}</td><td>${nm(e)}</td><td>${esc(e.topic || '')}</td></tr>`).join('');
    const tbl = (h, b, empty) => b ? `<div class="scroll"><table class="tbl"><thead><tr>${h.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${b}</tbody></table></div>` : `<p class="small muted">${empty}</p>`;
    const AK = ['req', 'appr', 'conf', 'exec', 'pend', 'lang'];
    return `<div class="ace-k">${kpi.map(([l, v, s], i) => `<button type="button" class="k dd-k" data-ak="${AK[i]}" style="font:inherit;text-align:start;width:100%"><span>${l}</span><b>${v}</b><span>${s}</span></button>`).join('')}</div>
      <h3>حسب اليوم</h3>${tbl(['اليوم', 'الحصص', 'الاعتماد', 'التأكيد', 'كما خُطِّط', 'معدَّلة', 'لم تُنفَّذ', 'متأخرة التأكيد', 'طلبات معلقة'], dRows, 'لا حصص.')}
      <h3>حسب المعلم</h3>${tbl(['المعلم', 'الحصص', 'الاعتماد', 'مُرجعة', 'التأكيد', 'كما خُطِّط', 'معدَّلة', 'لم تُنفَّذ', 'متأخرة التأكيد', 'طلبات معلقة', 'مهام أدائية', 'ملاحظات لغوية'], tRows, 'لا معلمين.')}
      <h3>طلبات بانتظار الاعتماد</h3>${tbl(['المعلم', 'الحصة', 'النوع', 'التفاصيل', 'الوقت'], pRows, 'لا طلبات معلقة.')}
      <h3>حصص مضى يومها ولم تُؤكَّد</h3>${tbl(['المعلم', 'الحصة', 'الدرس'], lRows, 'لا حصص متأخرة التأكيد.')}`;
  }
  function repAce(root) {
    const w = A.week(); if (!w) { root.innerHTML = `<div class="card">${A.emptyBox('اختر أسبوعاً من القائمة العلوية')}</div>`; return; }
    const st = Object.assign({ day: '', teacher: '' }, (() => { try { return JSON.parse(A.LS.get('rep_ace') || '{}'); } catch (_) { return {}; } })());
    const tids = [...new Set(S.entries.filter(e => e.subject_id && e.teacher_id).map(e => e.teacher_id))].sort((a, b) => (A.personName(a) || '').localeCompare(A.personName(b) || '', 'ar'));
    if (st.teacher && !tids.includes(st.teacher)) st.teacher = '';
    const days = A.weekDates(w, A.section().days);
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">تقرير الاعتماد والتأكيد والتنفيذ اليومي</h2><p class="sub" style="margin:2px 0 0">${esc(A.section().name)} · الأسبوع ${esc(w.word || AR(w.number))}. قراءة فقط: لا يغيّر شيئاً مما أدخله المعلمون. الأسبوع والقسم من القائمة العلوية.</p></div><button class="btn ghost sm" id="aceBack">رجوع للتقارير</button></div>
      <div class="ace-f"><div class="field"><label for="aceD">اليوم</label><select class="in" id="aceD"><option value="">كل الأيام</option>${days.map((d, i) => `<option value="${i}" ${String(st.day) === String(i) ? 'selected' : ''}>${A.DAYS[i]} ${AR(d)}</option>`).join('')}</select></div>
        <div class="field"><label for="aceT">المعلم</label><select class="in" id="aceT"><option value="">كل المعلمين</option>${tids.map(t => `<option value="${t}" ${st.teacher === t ? 'selected' : ''}>${esc(A.personName(t) || '—')}</option>`).join('')}</select></div>
        <div class="field" style="align-self:end"><div class="row" style="gap:6px"><button class="btn ghost sm" id="aceX">Excel</button><button class="btn ghost sm" id="aceP">طباعة / PDF</button></div></div></div>
      <div id="aceO"></div></div>`;
    let R = null;
    const ST2 = { done: 'نُفِّذت', modified: 'عُدِّلت ثم نُفِّذت', not_done: 'لم تُنفَّذ', pending: 'لم تُؤكَّد' }, SS = { approved: 'معتمدة', submitted: 'مرسلة', returned: 'مُرجعة', draft: 'مسودة', empty: 'فارغة' };
    const eRow = e => ({ cells: [`<b>${esc(A.personName(e.teacher_id) || '—')}</b>`, esc((A.cls(e.class_id) || {}).name || ''), esc(A.subjName(e.subject_id)), A.DAYS[e.day] + ' ح' + AR(e.period + 1), esc(e.topic || ''), SS[e.status] || esc(e.status || ''), ST2[e.exec_status || 'pending']], q: (A.personName(e.teacher_id) || '') + ' ' + ((A.cls(e.class_id) || {}).name || '') + ' ' + A.subjName(e.subject_id) });
    const EC = ['المعلم', 'الفصل', 'المادة', 'الحصة', 'الدرس', 'الخطة', 'التنفيذ'];
    const AKD = { req: () => ({ title: 'الحصص المطلوبة', cols: EC, rows: R.E.map(eRow) }), appr: () => ({ title: 'حالة اعتماد الخطة (غير المعتمدة أولاً)', cols: EC, rows: R.E.slice().sort((a, b) => (a.status === 'approved') - (b.status === 'approved')).map(eRow) }),
      conf: () => ({ title: 'حصص مضى يومها ولم تُؤكَّد', cols: EC, rows: R.late.map(eRow) }), exec: () => ({ title: 'التنفيذ اليومي', cols: EC, rows: R.E.filter(e => (e.exec_status || 'pending') !== 'pending').map(eRow) }),
      pend: () => ({ title: 'طلبات بانتظار الاعتماد', cols: ['المعلم', 'الحصة', 'النوع', 'التفاصيل'], rows: R.pend.map(({ e, r }) => ({ cells: [esc(A.personName(e.teacher_id) || ''), esc((A.cls(e.class_id) || {}).name || '') + ' · ' + A.DAYS[e.day] + ' ح' + AR(e.period + 1), r.kind === 'perf' ? 'مهمة أدائية' : 'تعديل تنفيذ', esc(r.kind === 'perf' ? (r.payload || {}).text || '' : (ST2[(r.payload || {}).from] || '') + ' ← ' + (ST2[(r.payload || {}).status] || ''))], q: A.personName(e.teacher_id) || '' })) }),
      lang: () => ({ title: 'ملاحظات لغوية في نصوص الحصص', cols: ['المعلم', 'الحصة', 'الحقل', 'النص', 'الاقتراح'], rows: R.E.flatMap(e => ['topic', 'homework', 'note', 'exec_note'].map(f => [f, e[f]]).concat(e.perf_task ? [['perf', e.perf_task.text]] : []).map(([f, t]) => { const L = A.langOf(t); return L ? { cells: [esc(A.personName(e.teacher_id) || ''), esc((A.cls(e.class_id) || {}).name || '') + ' · ' + A.DAYS[e.day] + ' ح' + AR(e.period + 1), ({ topic: 'الدرس', homework: 'الواجب', note: 'ملاحظة', exec_note: 'سبب التنفيذ', perf: 'مهمة أدائية' })[f], esc(L.original), esc(L.suggestion)], q: A.personName(e.teacher_id) || '' } : null; }).filter(Boolean)) }) };
    const run = () => { R = aceData(st); $('#aceO', root).innerHTML = R.E.length ? aceHtml(R) : A.emptyBox('لا حصص مطلوبة بهذه التصفية'); $$('[data-ak]', root).forEach(b => b.onclick = () => { if (A.attDrill) A.attDrill({ ...AKD[b.dataset.ak](), sub: esc(A.section().name) }); }); A.LS.set('rep_ace', JSON.stringify(st)); };
    $('#aceBack', root).onclick = () => { A.LS.set('rep', ''); V.reports(root); };
    $('#aceD', root).onchange = ev => { st.day = ev.target.value; run(); };
    $('#aceT', root).onchange = ev => { st.teacher = ev.target.value; run(); };
    $('#aceX', root).onclick = () => {
      if (!R || !window.XLSX) return A.toast('انتظر اكتمال التقرير', 'warn');
      const wb = XLSX.utils.book_new(); const add = (n, rows) => { const s = XLSX.utils.json_to_sheet(rows.length ? rows : [{ '': 'لا بيانات' }]); s['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, s, n); };
      add('حسب اليوم', Object.keys(R.D).map(Number).sort((a, b) => a - b).map(d => { const o = R.D[d]; return { 'اليوم': A.DAYS[d], 'الحصص': o.req, 'معتمدة': o.appr, 'نسبة الاعتماد %': pct(o.appr, o.req), 'مؤكدة': o.conf, 'نسبة التأكيد %': pct(o.conf, o.req), 'كما خُطِّط': o.done, 'معدَّلة': o.mod, 'لم تُنفَّذ': o.nd, 'متأخرة التأكيد': o.late, 'طلبات معلقة': o.reqs }; }));
      add('حسب المعلم', R.rows.map(r => ({ 'المعلم': r.name, 'الحصص': r.req, 'معتمدة': r.appr, 'نسبة الاعتماد %': pct(r.appr, r.req), 'مُرجعة': r.ret, 'مؤكدة': r.conf, 'نسبة التأكيد %': pct(r.conf, r.req), 'كما خُطِّط': r.done, 'معدَّلة': r.mod, 'لم تُنفَّذ': r.nd, 'متأخرة التأكيد': r.late, 'طلبات معلقة': r.reqs, 'مرفوضة': r.rej, 'مهام أدائية': r.perf, 'ملاحظات لغوية': r.lang })));
      add('طلبات معلقة', R.pend.map(({ e, r }) => ({ 'المعلم': A.personName(e.teacher_id) || '', 'الفصل': (A.cls(e.class_id) || {}).name || '', 'المادة': A.subjName(e.subject_id), 'اليوم': A.DAYS[e.day], 'الحصة': e.period + 1, 'النوع': r.kind === 'perf' ? 'مهمة أدائية' : 'تعديل تنفيذ', 'التفاصيل': r.kind === 'perf' ? (r.payload || {}).text || '' : `${ST[(r.payload || {}).from] || ''} ← ${ST[(r.payload || {}).status] || ''} ${(r.payload || {}).note || ''}` })));
      add('متأخرة التأكيد', R.late.map(e => ({ 'المعلم': A.personName(e.teacher_id) || '', 'الفصل': (A.cls(e.class_id) || {}).name || '', 'المادة': A.subjName(e.subject_id), 'اليوم': A.DAYS[e.day], 'الحصة': e.period + 1, 'الدرس': e.topic || '' })));
      wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, `تقرير الاعتماد والتأكيد والتنفيذ — ${A.section().name} — الأسبوع ${R.w.word || R.w.number}.xlsx`);
    };
    $('#aceP', root).onclick = () => { if (!R) return; A.printDoc('تقرير الاعتماد والتأكيد والتنفيذ اليومي', `${A.section().name} · الأسبوع ${R.w.word || AR(R.w.number)}${st.day !== '' ? ' · ' + A.DAYS[+st.day] : ''}${st.teacher ? ' · ' + (A.personName(st.teacher) || '') : ''}`, $('#aceO', root).innerHTML, true); };
    run();
  }
  const rep0 = V.reports; if (rep0) V.reports = function (root) {
    if (A.LS.get('rep') === 'ace') return repAce(root);
    const res = rep0.apply(this, arguments); const g = root.querySelector('.rep-grid');
    if (g && !g.querySelector('[data-r="ace"]')) {
      g.insertAdjacentHTML('afterbegin', `<button class="rep-card rep-new" data-r="ace"><b>الاعتماد والتأكيد والتنفيذ اليومي</b><span class="small muted">لكل يوم ولكل معلم: نسبة الاعتماد والتأكيد اليومي والتنفيذ، والحصص المتأخرة، والطلبات المعلقة، والملاحظات اللغوية.</span></button>`);
      g.querySelector('[data-r="ace"]').onclick = ev => { ev.stopPropagation(); A.LS.set('rep', 'ace'); repAce(root); };
    }
    return res;
  };
  A.repAce = repAce;
})();
