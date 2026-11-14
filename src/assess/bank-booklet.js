/* منصة دينا — كراسة التدريب PDF من بنك الأسئلة
   A.bankBooklet(questions, opts): نافذة معاينة حية بصفحات A4 مقسّمة آلياً، بثلاثة أنماط:
   كراسة تدريب (مفتاح الإجابة في آخرها)، اختبار تجريبي (بلا حل + ورقة إجابة للتظليل)، مراجعة بالحل (الإجابة تحت كل سؤال).
   خيارات: غلاف بهوية المدرسة، تعليمات، تجميع حسب الدرس، خلط الأسئلة والخيارات، ثلاث سمات لونية، جدول «قيّم نفسك»، رمز QR لرابط تدريب إلكتروني.
   المخرجات: «طباعة / حفظ PDF» (نص حقيقي قابل للبحث) و«تنزيل PDF مباشرة» (صفحات مصوّرة). */
(function () {
  const A = window.APP; if (!A) return;
  const { S, $, $$, esc, AR } = A;
  const LET = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح'];
  const TH = { navy: ['#082B5A', '#005499', '#3AB1DB', '#EAF3FB'], green: ['#1F5F3B', '#2E8B57', '#BADF93', '#EEF8EA'], sky: ['#005499', '#3AB1DB', '#9CD8EE', '#E8F6FC'] };
  const TYN = { mcq: 'اختيار من متعدد', multi: 'اختيار متعدد الإجابات', tf: 'صواب أو خطأ', blank: 'أكمل الفراغ', short: 'إجابة قصيرة', essay: 'سؤال مقالي', match: 'المزاوجة', order: 'الترتيب' };
  const MODES = [['practice', 'كراسة تدريب', 'الأسئلة ثم مفتاح الإجابة في آخر الكراسة'], ['mock', 'اختبار تجريبي', 'بلا حل، مع ورقة إجابة للتظليل ومفتاح منفصل'], ['review', 'مراجعة بالحل', 'الإجابة الصحيحة والتفسير تحت كل سؤال']];
  const seeded = seed => { let x = 0; for (const c of String(seed)) x = (x * 31 + c.charCodeAt(0)) | 0; return () => { x = (x * 1103515245 + 12345) & 0x7fffffff; return x / 0x7fffffff; }; };
  const shuf = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const blanks = /\.{3,}|…+|_{3,}/g;

  const CSS = th => `
.bk-pg{width:794px;height:1123px;background:#fff;position:relative;overflow:hidden;box-sizing:border-box;padding:70px 46px 60px;font-family:'GE SS Two','Tajawal',Tahoma,sans-serif;color:#1d2b3f;direction:rtl;font-size:14.5px;line-height:1.75}
.bk-pg *{box-sizing:border-box}
.bk-hd{position:absolute;top:0;inset-inline:0;height:50px;display:flex;align-items:center;gap:10px;padding:0 46px;background:linear-gradient(90deg,${th[0]},${th[1]});color:#fff;font-size:12.5px}
.bk-hd img{height:30px}.bk-hd b{flex:1;font-size:14px}.bk-hd span{opacity:.85}
.bk-hd:after{content:'';position:absolute;bottom:-4px;inset-inline:0;height:4px;background:${th[2]}}
.bk-ft{position:absolute;bottom:18px;inset-inline:46px;display:flex;justify-content:space-between;font-size:11px;color:#6b7a90;border-top:1px solid #e3e9f2;padding-top:6px}
.bk-ft .n{font-weight:800;color:${th[1]}}
.bk-sec{display:flex;align-items:center;gap:10px;margin:4px 0 12px;color:${th[0]}}
.bk-sec i{font-style:normal;width:34px;height:34px;border-radius:10px;background:${th[1]};color:#fff;display:grid;place-items:center;font-weight:900;font-size:15px}
.bk-sec b{font-size:17px}.bk-sec:after{content:'';flex:1;height:2px;background:linear-gradient(90deg,${th[2]},transparent)}
.bk-q{border:1px solid #dfe7f1;border-radius:14px;padding:12px 14px 10px;margin-bottom:12px;break-inside:avoid;background:#fff;position:relative}
.bk-qh{display:flex;gap:10px;align-items:flex-start}
.bk-no{flex:none;min-width:32px;height:32px;padding:0 6px;border-radius:10px;background:${th[3]};color:${th[0]};font-weight:900;display:grid;place-items:center;font-size:15px;border:1.5px solid ${th[2]}}
.bk-tx{flex:1;font-weight:700;font-size:15px;color:#13233a}
.bk-pt{flex:none;font-size:11px;color:${th[1]};background:${th[3]};border-radius:20px;padding:1px 8px;font-weight:700;white-space:nowrap}
.bk-ty{font-size:10.5px;color:#7a8799;font-weight:500}
.bk-img{max-width:100%;max-height:170px;border-radius:8px;margin:6px 0;display:block}
.bk-op{display:grid;gap:6px 18px;margin:8px 42px 2px 0}.bk-op.c2{grid-template-columns:1fr 1fr}.bk-op.c4{grid-template-columns:repeat(4,1fr)}
.bk-o{display:flex;gap:8px;align-items:flex-start}.bk-o i{font-style:normal;flex:none;width:24px;height:24px;border-radius:50%;border:1.6px solid ${th[1]};color:${th[1]};display:grid;place-items:center;font-size:12px;font-weight:800;margin-top:2px}
.bk-o.ok i{background:#2E8B57;border-color:#2E8B57;color:#fff}.bk-o.ok{color:#1d6b40;font-weight:800}
.bk-sq{display:inline-block;width:18px;height:18px;border:1.6px solid ${th[1]};border-radius:4px;vertical-align:middle;margin-inline-start:6px}
.bk-tf{display:flex;gap:18px;margin:8px 42px 0 0}.bk-tf span{display:flex;align-items:center;gap:6px;border:1.5px solid #d3deeb;border-radius:20px;padding:2px 14px}.bk-tf .ok{border-color:#2E8B57;background:#EEF8EA;color:#1d6b40;font-weight:800}
.bk-ln{margin:8px 42px 0 0}.bk-ln div{border-bottom:1.4px dotted #9fb3cc;height:30px}
.bk-bl{display:inline-block;min-width:90px;border-bottom:1.6px dotted ${th[1]};margin:0 3px;text-align:center;color:#1d6b40;font-weight:800}
.bk-mt{width:calc(100% - 42px);margin:8px 42px 0 0;border-collapse:separate;border-spacing:0 5px;font-size:14px}.bk-mt td{padding:4px 8px;background:${th[3]};border-radius:8px}.bk-mt td.p{width:46px;background:none;text-align:center}
.bk-or{display:flex;flex-wrap:wrap;gap:6px;margin:8px 42px 0 0}.bk-or span{border:1.4px solid #c9d7ec;border-radius:10px;padding:2px 10px}.bk-or b{color:${th[1]}}
.bk-wb{margin:8px 42px 0 0;font-size:13px;border:1px dashed ${th[2]};border-radius:10px;padding:4px 10px;background:${th[3]}}
.bk-ans{margin:8px 42px 0 0;border-inline-start:4px solid #2E8B57;background:#F3FAF0;border-radius:8px;padding:5px 10px;font-size:13px;color:#1d4d33}
.bk-ex{margin:6px 42px 0 0;font-size:12.5px;color:#4b5b72;background:#F6F8FB;border-radius:8px;padding:4px 10px}
/* الغلاف */
.bk-cv{padding:0;background:linear-gradient(160deg,${th[0]} 0%,${th[1]} 58%,${th[2]} 100%);color:#fff}
.bk-cv .bk-sh{position:absolute;border-radius:50%;background:rgba(255,255,255,.07)}
.bk-cv .bk-in{position:absolute;inset:60px 56px;display:flex;flex-direction:column}
.bk-cv .bk-lg{height:70px;align-self:flex-start}
.bk-cv .bk-tg{margin-top:80px;display:inline-block;align-self:flex-start;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);border-radius:30px;padding:4px 16px;font-size:15px}
.bk-cv h1{font-size:50px;line-height:1.25;margin:18px 0 8px;font-weight:900}
.bk-cv .bk-st{font-size:22px;opacity:.92}
.bk-cv .bk-kp{display:flex;gap:12px;margin-top:34px}.bk-cv .bk-kp div{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);border-radius:18px;padding:12px 18px;min-width:120px}.bk-cv .bk-kp b{display:block;font-size:30px;line-height:1.2}.bk-cv .bk-kp span{font-size:13px;opacity:.9}
.bk-cv .bk-card{margin-top:auto;background:#fff;color:#1d2b3f;border-radius:22px;padding:20px 22px;box-shadow:0 20px 40px -20px rgba(0,0,0,.5);display:grid;gap:12px}
.bk-cv .bk-card .bk-r{display:flex;gap:18px}.bk-cv .bk-card .bk-f{flex:1;border-bottom:1.6px dotted #9fb3cc;padding-bottom:4px;font-size:14px;color:#566384}
.bk-cv .bk-qr{display:flex;gap:12px;align-items:center;font-size:13px;color:#566384}.bk-cv .bk-qr .bk-qi{flex:none;width:92px;height:92px;overflow:hidden}.bk-cv .bk-qr .bk-qi svg{width:92px!important;height:92px!important;display:block}
.bk-cv .bk-by{margin-top:14px;font-size:13px;opacity:.9}
.bk-ins{border:1.5px solid ${th[2]};background:${th[3]};border-radius:14px;padding:10px 14px;margin-bottom:14px;font-size:13.5px}.bk-ins b{color:${th[0]}}.bk-ins ul{margin:4px 0 0;padding-inline-start:18px}
.bk-self{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}.bk-self th,.bk-self td{border:1px solid #d5e0ee;padding:5px;text-align:center}.bk-self th{background:${th[3]};color:${th[0]}}
/* ورقة الإجابة والمفتاح */
.bk-sheet{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 20px;font-size:13px}.bk-sheet div{display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid #eef2f7}.bk-sheet b{min-width:26px;color:${th[0]}}
.bk-sheet i{font-style:normal;width:21px;height:21px;border-radius:50%;border:1.4px solid #8ea6c4;display:grid;place-items:center;font-size:10.5px;color:#5b6b7f}
.bk-key{display:grid;grid-template-columns:repeat(2,1fr);gap:4px 22px;font-size:13px}.bk-key div{display:flex;gap:8px;padding:4px 6px;border-bottom:1px solid #eef2f7;break-inside:avoid}.bk-key b{min-width:28px;color:${th[1]}}
`;

  // ---------- تجهيز البيانات ----------
  function prep(src, o) { const r = seeded(o.seed || 'dina');
    let qs = src.map(q => JSON.parse(JSON.stringify(q)));
    if (o.shuffleQ) qs = shuf(qs, r);
    if (o.group) { const L = o.lessonOf || (() => ''); const by = new Map(); qs.forEach(q => { const k = L(q) || 'أسئلة متنوعة'; if (!by.has(k)) by.set(k, []); by.get(k).push(q); }); qs = [...by.values()].flat(); }
    qs.forEach(q => { q.options = q.options || []; if (o.shuffleO && (q.qtype === 'mcq' || q.qtype === 'multi') && !q.options.some(x => /جميع|كل ما سبق|لا شيء مما|ليس مما/.test(x.t || ''))) q.options = shuf(q.options, r);
      if (q.qtype === 'match') q._R = shuf(q.options.map((x, i) => ({ m: x.m, i })), r);
      if (q.qtype === 'order') q._O = shuf(q.options.map((x, i) => ({ t: x.t, i })), r); });
    return qs; }
  const keyOf = q => { const o = q.options || [];
    if (q.qtype === 'mcq' || q.qtype === 'multi') { const k = o.map((x, i) => x.ok ? i : -1).filter(i => i >= 0); return k.map(i => `${LET[i]}) ${o[i].t}`).join(' ، ') || '—'; }
    if (q.qtype === 'tf') return q.answer || '—';
    if (q.qtype === 'blank') return o.map((x, i) => `${o.length > 1 ? AR(i + 1) + ': ' : ''}${String(x.t || '').split('|')[0]}`).join(' ، ') || '—';
    if (q.qtype === 'match') return q._R ? o.map((x, i) => `${AR(i + 1)} مع ${LET[q._R.findIndex(y => y.i === i)]}`).join('، ') : '—';
    if (q.qtype === 'order') return q._O ? 'الترتيب: ' + o.map((_, i) => LET[q._O.findIndex(y => y.i === i)]).join('، ') : '—';
    return String(q.answer || '').split('|')[0] || (q.qtype === 'essay' ? 'إجابة مفتوحة — تُقيَّم حسب المعايير' : '—'); };

  // ---------- عرض سؤال ----------
  function qBlock(q, n, solved) { const o = q.options || [], img = q.image_url ? `<img class="bk-img" src="${esc(q.image_url)}" alt="" crossorigin="anonymous">` : '';
    let body = esc(q.body), extra = '';
    if (q.qtype === 'blank') { let k = 0; body = esc(q.body).replace(blanks, () => `<span class="bk-bl">${solved ? esc(String((o[k++] || {}).t || '').split('|')[0]) : (k++, '&nbsp;')}</span>`); if (q.answer === 'bank' && !solved) extra = `<div class="bk-wb"><b>بنك الكلمات:</b> ${shuf(o.map(x => String(x.t).split('|')[0]), seeded(q.id || q.body)).map(esc).join(' &nbsp;·&nbsp; ')}</div>`; }
    if (q.qtype === 'mcq' || q.qtype === 'multi') { const mx = Math.max(...o.map(x => String(x.t || '').length)), c = mx <= 14 && o.length === 4 ? 'c4' : mx <= 38 ? 'c2' : '';
      extra = `${q.qtype === 'multi' ? '<div class="bk-ty" style="margin:4px 42px 0 0">(اختر كل الإجابات الصحيحة)</div>' : ''}<div class="bk-op ${c}">${o.map((x, i) => `<div class="bk-o ${solved && x.ok ? 'ok' : ''}"><i>${solved && x.ok ? '✓' : LET[i] || AR(i + 1)}</i><span>${esc(x.t)}</span></div>`).join('')}</div>`; }
    else if (q.qtype === 'tf') extra = `<div class="bk-tf">${['صواب', 'خطأ'].map(v => `<span class="${solved && q.answer === v ? 'ok' : ''}">${solved && q.answer === v ? '✓' : '<span class="bk-sq" style="margin:0;border-radius:50%;width:16px;height:16px;padding:0;border-width:1.5px"></span>'} ${v}</span>`).join('')}</div>`;
    else if (q.qtype === 'match') extra = `<table class="bk-mt">${o.map((x, i) => `<tr><td>${AR(i + 1)}. ${esc(x.t)}</td><td class="p">${solved ? `<b style="color:#1d6b40">${LET[q._R.findIndex(y => y.i === i)]}</b>` : '(&nbsp;&nbsp;&nbsp;)'}</td><td>${LET[i]}. ${esc((q._R[i] || {}).m || '')}</td></tr>`).join('')}</table>`;
    else if (q.qtype === 'order') extra = `<div class="bk-or">${q._O.map((x, i) => `<span><b>${LET[i]}</b> ${esc(x.t)} ${solved ? `<b style="color:#1d6b40">(${AR(x.i + 1)})</b>` : '(&nbsp;&nbsp;)'}</span>`).join('')}</div>`;
    else if (q.qtype === 'short' || q.qtype === 'essay') extra = solved ? '' : `<div class="bk-ln">${'<div></div>'.repeat(q.qtype === 'essay' ? 3 : 1)}</div>`;
    const ans = solved && !['mcq', 'multi', 'tf', 'blank', 'match', 'order'].includes(q.qtype) ? `<div class="bk-ans"><b>الإجابة:</b> ${esc(keyOf(q))}</div>` : '';
    const ex = solved && q.explanation ? `<div class="bk-ex">💡 ${esc(q.explanation)}</div>` : '';
    return `<div class="bk-q"><div class="bk-qh"><span class="bk-no">${AR(n)}</span><div class="bk-tx">${body}<div class="bk-ty">${TYN[q.qtype] || ''}</div></div><span class="bk-pt">${AR(q.points || 1)} ${+q.points > 2 ? 'درجات' : 'درجة'}</span></div>${img}${extra}${ans}${ex}</div>`; }

  // ---------- بناء الصفحات (تقسيم آلي بالقياس) ----------
  function build(host, qs, o) {
    const th = TH[o.theme] || TH.navy, logoW = 'assets/logo_white.svg', solved = o.mode === 'review';
    host.innerHTML = `<style>${CSS(th)}</style>`; const pages = [];
    const hd = () => `<div class="bk-hd"><img src="${logoW}" alt=""><b>${esc(o.title)}</b><span>${esc(o.sub)}</span></div>`;
    const newPage = (cls = '') => { const p = document.createElement('div'); p.className = 'bk-pg ' + cls; host.appendChild(p); pages.push(p); return p; };
    const body = p => { const b = document.createElement('div'); b.className = 'bk-body'; p.appendChild(b); return b; };
    const total = qs.reduce((a, q) => a + (+q.points || 1), 0);
    // الغلاف
    if (o.cover) { const p = newPage('bk-cv'); p.innerHTML = `<div class="bk-sh" style="width:520px;height:520px;top:-180px;left:-200px"></div><div class="bk-sh" style="width:300px;height:300px;bottom:180px;right:-120px"></div><div class="bk-sh" style="width:160px;height:160px;top:330px;left:90px"></div>
      <div class="bk-in"><img class="bk-lg" src="${logoW}" alt="${esc((S.school || {}).name || 'مدارس دينا العالمية')}"><span class="bk-tg">${esc(MODES.find(m => m[0] === o.mode)[1])}</span><h1>${esc(o.title)}</h1><div class="bk-st">${esc(o.sub)}</div>
        <div class="bk-kp"><div><b>${AR(qs.length)}</b><span>سؤالاً</span></div><div><b>${AR(total)}</b><span>درجة</span></div><div><b>${AR(new Set(qs.map(q => q.qtype)).size)}</b><span>أنماط أسئلة</span></div></div>
        <div class="bk-card"><div class="bk-r"><div class="bk-f">اسم الطالب/ـة:</div><div class="bk-f" style="flex:.5">الفصل:</div></div><div class="bk-r"><div class="bk-f">التاريخ:</div><div class="bk-f" style="flex:.5">الدرجة: ......... / ${AR(total)}</div></div>
          ${o.qr ? `<div class="bk-qr"><div class="bk-qi">${o.qr}</div><div><b style="color:#082B5A">تدرّب إلكترونياً</b><br>امسح الرمز لحل الأسئلة نفسها على الجوال وتصحيحها فوراً.</div></div>` : ''}</div>
        <div class="bk-by">${esc(o.by ? 'إعداد: ' + o.by + ' · ' : '')}${esc((S.school || {}).name || 'مدارس دينا العالمية')}</div></div>`; }
    // صفحات الأسئلة
    let p = newPage(), b = body(p); p.insertAdjacentHTML('afterbegin', hd());
    const limit = () => 1123 - 60; // أسفل منطقة الكتابة
    const fits = () => b.getBoundingClientRect().bottom - p.getBoundingClientRect().top <= limit();
    const add = html => { b.insertAdjacentHTML('beforeend', html); if (!fits() && b.children.length > 1) { const last = b.lastElementChild; last.remove(); p = newPage(); b = body(p); p.insertAdjacentHTML('afterbegin', hd()); b.appendChild(last); } };
    if (o.ins) add(`<div class="bk-ins"><b>تعليمات</b><ul><li>اقرأ كل سؤال بعناية قبل الإجابة.</li><li>${o.mode === 'mock' ? 'ظلّل الإجابة في ورقة الإجابة في آخر الكراسة.' : 'اكتب إجابتك في المكان المخصص أو ضع دائرة حول رمز الإجابة.'}</li><li>${o.mode === 'review' ? 'الإجابات الصحيحة موضحة باللون الأخضر — راجعها وافهم سببها.' : 'قارن إجاباتك بمفتاح الإجابة في آخر الكراسة بعد الانتهاء.'}</li></ul></div>`);
    let sec = null, n = 0; const L = o.lessonOf || (() => '');
    qs.forEach(q => { if (o.group) { const s = L(q) || 'أسئلة متنوعة'; if (s !== sec) { sec = s; add(`<div class="bk-sec"><i>${AR([...new Set(qs.map(x => L(x) || 'أسئلة متنوعة'))].indexOf(s) + 1)}</i><b>${esc(s)}</b></div>`); } } add(qBlock(q, ++n, solved)); });
    if (o.self) add(`<div class="bk-q" style="break-inside:avoid"><div class="bk-sec" style="margin:0 0 4px"><i>✓</i><b>قيّم نفسك</b></div><table class="bk-self"><tr><th>عدد الأسئلة</th><th>إجاباتي الصحيحة</th><th>درجتي</th><th>أحتاج مراجعة</th></tr><tr><td>${AR(qs.length)}</td><td></td><td>&nbsp;/ ${AR(total)}</td><td style="height:34px"></td></tr></table></div>`);
    // ورقة الإجابة (الاختبار التجريبي)
    if (o.mode === 'mock') { p = newPage(); b = body(p); p.insertAdjacentHTML('afterbegin', hd()); add(`<div class="bk-sec"><i>✎</i><b>ورقة الإجابة</b></div>`);
      add(`<div class="bk-sheet">${qs.map((q, i) => `<div><b>${AR(i + 1)}</b>${q.qtype === 'mcq' || q.qtype === 'multi' ? q.options.map((_, k) => `<i>${LET[k]}</i>`).join('') : q.qtype === 'tf' ? '<i>✓</i><i>✗</i>' : '<span style="flex:1;border-bottom:1px dotted #9fb3cc;height:18px"></span>'}</div>`).join('')}</div>`); }
    // مفتاح الإجابة
    if (o.mode !== 'review' && o.key) { p = newPage(); b = body(p); p.insertAdjacentHTML('afterbegin', hd()); add(`<div class="bk-sec"><i>🔑</i><b>مفتاح الإجابة</b></div>`);
      const K = qs.map((q, i) => `<div><b>${AR(i + 1)}</b><span>${esc(keyOf(q))}</span></div>`); for (let i = 0; i < K.length; i += 10) add(`<div class="bk-key">${K.slice(i, i + 10).join('')}</div>`); }
    pages.forEach((pg, i) => { if (pg.classList.contains('bk-cv')) return; pg.insertAdjacentHTML('beforeend', `<div class="bk-ft"><span>${esc((S.school || {}).name || 'مدارس دينا العالمية')}${o.by ? ' · ' + esc(o.by) : ''}</span><span>صفحة <span class="n">${AR(i + 1)}</span> من ${AR(pages.length)}</span></div>`); });
    return pages;
  }

  // ---------- النافذة ----------
  A.bankBooklet = function (list, o0) {
    o0 = o0 || {}; if (!list || !list.length) return A.toast('لا توجد أسئلة للتصدير', 'err');
    const o = Object.assign({ mode: 'practice', theme: 'navy', cover: true, ins: true, group: !!o0.lessonOf, shuffleQ: false, shuffleO: false, self: true, key: true, link: '', by: (S.me && S.me.full_name) || '', seed: String(Date.now() % 100000) }, o0);
    const m = A.modal(`<div class="bk-ui"><div class="bk-side"><h3 style="margin:0 0 6px">كراسة تدريب PDF</h3><p class="small muted" style="margin:0 0 10px">${AR(list.length)} سؤال — معاينة حية بصفحات A4.</p>
        <div class="field"><label for="bkT">العنوان</label><input class="in" id="bkT" value="${esc(o.title || 'كراسة التدريب')}"></div>
        <div class="field"><label for="bkS">العنوان الفرعي</label><input class="in" id="bkS" value="${esc(o.sub || '')}"></div>
        <div class="field"><label for="bkB">إعداد</label><input class="in" id="bkB" value="${esc(o.by)}"></div>
        <div class="field"><label>النمط</label><div class="bk-modes" role="radiogroup" aria-label="نمط الكراسة">${MODES.map(([k, n, d]) => `<button type="button" role="radio" aria-checked="${o.mode === k}" class="bk-md ${o.mode === k ? 'on' : ''}" data-md="${k}"><b>${n}</b><small>${d}</small></button>`).join('')}</div></div>
        <div class="field"><label>السمة</label><div class="row" style="gap:6px">${Object.entries(TH).map(([k, c]) => `<button type="button" class="bk-th ${o.theme === k ? 'on' : ''}" data-th="${k}" aria-label="سمة ${k === 'navy' ? 'كحلي' : k === 'green' ? 'أخضر' : 'سماوي'}" style="background:linear-gradient(135deg,${c[0]},${c[2]})"></button>`).join('')}</div></div>
        <div class="bk-chks">${[['cover', 'صفحة غلاف'], ['ins', 'تعليمات'], ['group', 'تجميع حسب الدرس'], ['shuffleQ', 'خلط ترتيب الأسئلة'], ['shuffleO', 'خلط الخيارات'], ['self', 'جدول «قيّم نفسك»'], ['key', 'مفتاح الإجابة']].map(([k, n]) => `<label class="chk small"><input type="checkbox" data-op="${k}" ${o[k] ? 'checked' : ''}> ${n}</label>`).join('')}</div>
        <div class="field"><label for="bkL">رابط التدريب الإلكتروني (اختياري — يظهر رمز QR على الغلاف)</label><input class="in" id="bkL" dir="ltr" placeholder="https://…" value="${esc(o.link)}"></div>
        <div class="bk-go"><button class="btn" id="bkP">🖨️ طباعة / حفظ PDF</button><button class="btn ghost" id="bkD">⬇ تنزيل PDF مباشرة</button><span class="small muted" id="bkM" role="status" aria-live="polite"></span></div>
        <p class="small muted" style="margin:6px 0 0">«طباعة / حفظ PDF»: اختر «حفظ بتنسيق PDF» في نافذة الطباعة — نص حقيقي قابل للبحث وأصغر حجماً.</p></div>
      <div class="bk-prev" aria-label="معاينة الكراسة"><div class="bk-host"></div></div></div>`, { cls: 'wide bk-modal' });
    if (!document.getElementById('bkui')) { const st = document.createElement('style'); st.id = 'bkui'; st.textContent = `
.bk-modal{max-width:min(1280px,96vw)!important;width:96vw!important}
.bk-ui{display:grid;grid-template-columns:330px 1fr;gap:16px;min-height:70vh}@media (max-width:860px){.bk-ui{grid-template-columns:1fr}}
.bk-side{overflow:auto;max-height:78vh;padding-inline-end:4px}.bk-side .field{margin-bottom:10px}
.bk-modes{display:grid;gap:6px}.bk-md{font:inherit;text-align:start;border:1.5px solid #DCE7F3;border-radius:12px;background:#fff;padding:8px 10px;cursor:pointer;display:grid;gap:2px;color:#082B5A}.bk-md small{color:#5b6b7f}.bk-md.on{border-color:#005499;background:#F1F7FD;box-shadow:0 0 0 3px rgba(0,84,153,.12)}
.bk-th{width:40px;height:40px;border-radius:12px;border:3px solid #fff;box-shadow:0 0 0 1.5px #C9D7EC;cursor:pointer}.bk-th.on{box-shadow:0 0 0 3px #005499}
.bk-chks{display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;margin-bottom:10px}
.bk-go{display:flex;flex-wrap:wrap;gap:8px;align-items:center;position:sticky;bottom:0;background:#fff;padding:8px 0}
.bk-prev{background:#E4EBF5;border-radius:16px;overflow:auto;max-height:78vh;padding:16px}
.bk-host{transform-origin:top right;display:grid;gap:16px;justify-content:center}.bk-host .bk-pg{box-shadow:0 10px 30px -14px rgba(8,43,90,.45)}
.bk-md:focus-visible,.bk-th:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}`; document.head.appendChild(st); }
    const host = m.el.querySelector('.bk-host'), prev = m.el.querySelector('.bk-prev'), msg = m.el.querySelector('#bkM'); let pages = [], T = 0;
    const qrSvg = url => { try { if (!url || !window.qrcode) return ''; const q = window.qrcode(0, 'M'); q.addData(url); q.make(); return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (_) { return ''; } };
    const read = () => { o.title = m.el.querySelector('#bkT').value.trim() || 'كراسة التدريب'; o.sub = m.el.querySelector('#bkS').value.trim(); o.by = m.el.querySelector('#bkB').value.trim(); o.link = m.el.querySelector('#bkL').value.trim(); $$('[data-op]', m.el).forEach(c => o[c.dataset.op] = c.checked); o.qr = /^https?:\/\//.test(o.link) ? qrSvg(o.link) : ''; };
    const fit = () => { const w = prev.clientWidth - 32, k = Math.min(1, w / 794); host.style.transform = `scale(${k})`; host.style.height = (host.scrollHeight * k) + 'px'; host.style.width = (794 * k) + 'px'; host.style.margin = '0 auto'; };
    const render = () => { read(); host.style.transform = ''; host.style.height = ''; host.style.width = ''; const qs = prep(list, o); pages = build(host, qs, o); fit(); msg.textContent = `${AR(pages.length)} صفحة`; };
    const later = () => { clearTimeout(T); T = setTimeout(render, 250); };
    $$('[data-md]', m.el).forEach(b => b.onclick = () => { o.mode = b.dataset.md; $$('[data-md]', m.el).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); render(); });
    $$('[data-th]', m.el).forEach(b => b.onclick = () => { o.theme = b.dataset.th; $$('[data-th]', m.el).forEach(x => x.classList.toggle('on', x === b)); render(); });
    $$('[data-op]', m.el).forEach(c => c.onchange = () => { if (c.dataset.op.startsWith('shuffle')) o.seed = String(Date.now() % 100000); render(); });
    ['#bkT', '#bkS', '#bkB', '#bkL'].forEach(s => m.el.querySelector(s).oninput = later);
    const fname = () => (o.title + (o.sub ? ' - ' + o.sub : '')).replace(/[\\/:*?"<>|]/g, '').slice(0, 90);
    // طباعة (نص حقيقي): نافذة طباعة مخفية بالصفحات نفسها
    m.el.querySelector('#bkP').onclick = () => { render(); const base = location.href.replace(/[#?].*$/, '').replace(/[^/]*$/, ''); const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;height:1200px'; document.body.appendChild(f);
      const d = f.contentDocument; d.open(); d.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="${base}"><title>${esc(fname())}</title><style>@font-face{font-family:'GE SS Two';font-weight:400 500;src:url(fonts/gess-two-medium.woff2) format('woff2')}@font-face{font-family:'GE SS Two';font-weight:600 900;src:url(fonts/gess-two-bold.woff2) format('woff2')}@page{size:A4;margin:0}html,body{margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}.bk-pg{page-break-after:always;break-after:page}.bk-pg:last-child{page-break-after:auto}</style></head><body>${host.innerHTML}</body></html>`); d.close();
      const go = () => { try { f.contentWindow.focus(); f.contentWindow.print(); } catch (_) { } setTimeout(() => f.remove(), 60000); };
      (d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve()).then(() => setTimeout(go, 400)); };
    // تنزيل مباشر (صفحات مصوّرة)
    m.el.querySelector('#bkD').onclick = e => A.run(e.currentTarget, async () => { if (!window.html2canvas || !window.jspdf) throw new Error('مكتبة PDF غير محمّلة'); render(); const k0 = host.style.transform; host.style.transform = ''; host.style.height = ''; host.style.width = '';
      try { const pdf = new window.jspdf.jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
        for (let i = 0; i < pages.length; i++) { msg.textContent = `تجهيز الصفحة ${AR(i + 1)} من ${AR(pages.length)}…`; const c = await window.html2canvas(pages[i], { scale: 2, backgroundColor: '#ffffff', useCORS: true, width: 794, height: 1123, windowWidth: 1000 }); if (i) pdf.addPage(); pdf.addImage(c.toDataURL('image/jpeg', .9), 'JPEG', 0, 0, 210, 297); }
        const url = URL.createObjectURL(pdf.output('blob')), a = document.createElement('a'); a.href = url; a.download = fname() + '.pdf'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000); msg.textContent = `✓ نُزّلت ${AR(pages.length)} صفحة`; } finally { host.style.transform = k0; fit(); } });
    window.addEventListener('resize', fit, { once: true });
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(render);
  };
})();
