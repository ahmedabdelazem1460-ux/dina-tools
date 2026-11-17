/* منصة دينا — عرض «بنود أولياء الأمور» (مراجعات، أسئلة، ملفات، روابط، فيديو، اختبارات…)
   مشترك بين: parents.html (خطط أبنائي)، family.html (بوابة ولي الأمر)، ومعاينة المنصة.
   window.DinaItems = { DEF, cfgOf(cfg), html(data, o), bind(root, data, o), printItem(it, cfg, withAns) } */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const AR = s => String(s ?? '').replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const safe = u => { u = String(u || '').trim(); return /^https?:\/\//i.test(u) || /^(student|parents|play|poll|scale)\.html/.test(u) || /^data:(image\/(png|jpe?g|gif|webp)|application\/pdf);/i.test(u) ? u : ''; };
  const LET = ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح'];
  const QT = { mcq: 'اختيار من متعدد', multi: 'اختيار متعدد', tf: 'صواب وخطأ', short: 'إجابة قصيرة', essay: 'مقالي', blank: 'أكمل الفراغ', match: 'توصيل', order: 'ترتيب' };
  // الفئات الافتراضية — يعدّلها المالك من الإعدادات (الاسم، الرمز، اللون، الترتيب، الإظهار)
  const DEF = {
    title: 'مراجعات وأسئلة ومرفقات', place: 'after', layout: 'tabs', openN: 2, ans: 'btn', print: true, download: true, pdf: true, dates: true, subject: true, count: true,
    cats: [
      { k: 'review', n: 'مراجعات', ic: '📚', c: '#005499', on: true },
      { k: 'questions', n: 'أسئلة وتدريبات', ic: '❓', c: '#6B4FA3', on: true },
      { k: 'tasks', n: 'واجبات ومهام', ic: '📝', c: '#8A5A12', on: true },
      { k: 'files', n: 'ملفات ومرفقات', ic: '📎', c: '#082B5A', on: true },
      { k: 'media', n: 'فيديو وصور', ic: '🎬', c: '#B4472F', on: true },
      { k: 'tips', n: 'إرشادات لولي الأمر', ic: '💡', c: '#23704A', on: true },
      { k: 'events', n: 'فعاليات ومناسبات', ic: '📅', c: '#3AB1DB', on: true },
    ],
  };
  const cfgOf = c => { c = c || {}; const o = { ...DEF, ...c }; o.cats = Array.isArray(c.cats) && c.cats.length ? c.cats : DEF.cats; return o; };
  const catOf = (cfg, k) => cfg.cats.find(x => x.k === k) || { k, n: 'أخرى', ic: '📌', c: '#4D6A8F', on: true };
  const ext = n => (String(n || '').split('?')[0].split('.').pop() || '').toLowerCase();
  const FI = { pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗', ppt: '📙', pptx: '📙', zip: '🗜️', mp3: '🎧', m4a: '🎧', mp4: '🎬' };
  const size = b => !b ? '' : b > 1048576 ? AR((b / 1048576).toFixed(1)) + ' م.ب' : AR(Math.max(1, Math.round(b / 1024))) + ' ك.ب';
  const ytId = u => { const m = String(u || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : ''; };
  const fmtD = d => { try { const x = new Date(d + 'T12:00:00'); return AR(`${x.getDate()}/${x.getMonth() + 1}/${x.getFullYear()}`); } catch (_) { return ''; } };

  const CSS = `
.pi-wrap{margin:14px 0}
.pi-hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 2px 10px}
.pi-hd h3{margin:0;font-size:18px;color:#082B5A;flex:1}
.pi-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
.pi-chips button{border:1.5px solid #D5E1F0;background:#fff;border-radius:999px;padding:6px 12px;min-height:40px;font:inherit;font-weight:700;font-size:13.5px;color:#4D6A8F;cursor:pointer;display:inline-flex;align-items:center;gap:6px}
.pi-chips button[aria-pressed="true"]{background:var(--pc,#082B5A);border-color:var(--pc,#082B5A);color:#fff}
.pi-chips button:focus-visible,.pi-it summary:focus-visible,.pi-btn:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}
.pi-cat{margin:14px 0 8px;display:flex;align-items:center;gap:8px;font-weight:800;color:var(--pc,#082B5A)}
.pi-cat::after{content:"";flex:1;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,var(--pc,#082B5A))}
.pi-it{background:#fff;border:1px solid #D5E1F0;border-radius:16px;margin-bottom:10px;box-shadow:0 10px 24px -20px rgba(8,43,90,.55);overflow:hidden;border-inline-start:5px solid var(--pc,#082B5A)}
.pi-it>summary{list-style:none;cursor:pointer;padding:12px 14px;display:flex;gap:10px;align-items:flex-start}
.pi-it>summary::-webkit-details-marker{display:none}
.pi-ic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;font-size:20px;flex:none;background:color-mix(in srgb,var(--pc,#082B5A) 12%,#fff)}
.pi-tt{flex:1;min-width:0}.pi-tt b{display:block;font-size:15.5px;color:#082B5A;line-height:1.5}
.pi-meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:4px}
.pi-meta span{font-size:12px;font-weight:700;border-radius:999px;padding:1px 9px;background:#EEF3FA;color:#4D6A8F}
.pi-meta .pi-pin{background:#FFF4DC;color:#8A5A12}
.pi-ch{flex:none;transition:transform .2s;color:#4D6A8F;margin-top:8px}.pi-it[open] .pi-ch{transform:rotate(180deg)}
.pi-bd{padding:0 14px 14px}
.pi-body{white-space:pre-line;line-height:1.8;color:#0b1f3a;margin:0 0 10px}
.pi-att{display:grid;gap:8px}
.pi-a{display:flex;align-items:center;gap:10px;border:1px solid #E1E9F4;border-radius:12px;padding:8px 10px;background:#F8FBFE;flex-wrap:wrap}
.pi-a .pi-n{flex:1;min-width:150px;font-weight:700;color:#082B5A;word-break:break-word}.pi-a .pi-n small{display:block;font-weight:500;color:#5F7896}
.pi-a .pi-fi{font-size:22px}
.pi-btn{display:inline-flex;align-items:center;gap:6px;min-height:40px;padding:6px 12px;border-radius:10px;border:1.5px solid #D5E1F0;background:#fff;color:#082B5A;font:inherit;font-weight:700;font-size:13.5px;cursor:pointer;text-decoration:none}
.pi-btn.pri{background:#082B5A;border-color:#082B5A;color:#fff}.pi-btn.ok{background:#2E8B57;border-color:#2E8B57;color:#fff}
.pi-imgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
.pi-imgs img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px;border:1px solid #E1E9F4;cursor:zoom-in;background:#EEF3FA}
.pi-vid{position:relative;border-radius:12px;overflow:hidden;background:#0b1f3a;aspect-ratio:16/9}
.pi-vid iframe,.pi-vid video{position:absolute;inset:0;width:100%;height:100%;border:0}
.pi-vid button{position:absolute;inset:0;border:0;background:#0b1f3a center/cover;color:#fff;font:inherit;font-weight:800;font-size:16px;cursor:pointer;display:grid;place-items:center}
.pi-vid button span{background:rgba(8,43,90,.85);border-radius:999px;padding:10px 18px}
.pi-txt{background:#F5F9FD;border-radius:12px;padding:10px 12px;white-space:pre-line;line-height:1.8}
.pi-qs{border:1px solid #E1E9F4;border-radius:14px;padding:10px;background:#FBFDFF}
.pi-qs-h{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px}.pi-qs-h b{flex:1;color:#082B5A}
.pi-q{border-top:1px dashed #D5E1F0;padding:10px 2px}
.pi-q:first-of-type{border-top:0}
.pi-q .pi-qb{font-weight:700;line-height:1.8;color:#0b1f3a}.pi-q .pi-qn{display:inline-grid;place-items:center;min-width:26px;height:26px;border-radius:8px;background:#082B5A;color:#fff;font-size:13px;margin-inline-end:6px}
.pi-q .pi-qt{font-size:11.5px;color:#6B4FA3;font-weight:700}
.pi-q img{max-width:100%;max-height:260px;border-radius:10px;margin:6px 0;display:block}
.pi-opts{display:grid;gap:6px;margin:6px 0}
.pi-opt{display:flex;gap:8px;align-items:flex-start;border:1.5px solid #E1E9F4;border-radius:10px;padding:7px 10px;background:#fff;cursor:pointer;font:inherit;text-align:start;min-height:40px;color:#0b1f3a}
.pi-opt .pi-l{font-weight:800;color:#005499}
.pi-opt.ok{border-color:#2E8B57;background:#E5F4EA}.pi-opt.no{border-color:#C0392B;background:#FCEDEA}
.pi-ans{display:none;margin-top:6px;background:#E5F4EA;color:#1F5E3B;border-radius:10px;padding:7px 10px;font-weight:700;line-height:1.7}
.pi-ans.on{display:block}.pi-ans .pi-ex{font-weight:500;color:#23704A;display:block;margin-top:2px}
.pi-acts{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #EEF3FA}
.pi-empty{padding:16px;text-align:center;color:#5F7896}
.pi-lb{position:fixed;inset:0;background:rgba(5,20,45,.88);z-index:9999;display:grid;place-items:center;padding:16px}
.pi-lb img{max-width:100%;max-height:88vh;border-radius:12px}
.pi-lb button{position:absolute;top:14px;inset-inline-end:14px;width:44px;height:44px;border-radius:50%;border:0;background:#fff;font-size:22px;cursor:pointer}
@media (prefers-reduced-motion:reduce){.pi-ch{transition:none}}
@media print{.pi-acts,.pi-chips,.pi-btn{display:none!important}.pi-it{break-inside:avoid;box-shadow:none}.pi-ans{display:block}}`;
  function injectCss() { if (document.getElementById('pi-css')) return; const s = document.createElement('style'); s.id = 'pi-css'; s.textContent = CSS; document.head.appendChild(s); }

  // ---- الأسئلة
  function keyOf(q) { const o = q.options || [];
    if (q.qtype === 'mcq' || q.qtype === 'multi') return o.map((x, i) => x.ok ? `${LET[i]}) ${x.t}` : '').filter(Boolean).join(' ، ') || '—';
    if (q.qtype === 'tf') return q.answer || '—';
    if (q.qtype === 'blank') return o.map(x => String(x.t || '').split('|')[0]).join(' ، ') || String(q.answer || '').split('|')[0] || '—';
    if (q.qtype === 'match') return o.map(x => `${x.t} ← ${x.m}`).join(' ، ');
    if (q.qtype === 'order') return o.map((x, i) => `${AR(i + 1)}. ${x.t}`).join(' ، ');
    return String(q.answer || '').split('|')[0] || (q.qtype === 'essay' ? 'إجابة مفتوحة' : '—'); }
  function qHtml(q, n, mode, forPrint) {
    const o = q.options || [], show = mode === 'always';
    let opts = '';
    if (q.qtype === 'mcq' || q.qtype === 'multi') opts = `<div class="pi-opts">${o.map((x, i) => forPrint ? `<div class="pi-opt"><span class="pi-l">${LET[i]})</span><span>${esc(x.t)}</span></div>` : `<button type="button" class="pi-opt" data-qo="${x.ok ? 1 : 0}"><span class="pi-l">${LET[i]})</span><span>${esc(x.t)}</span></button>`).join('')}</div>`;
    else if (q.qtype === 'tf') opts = `<div class="pi-opts" style="grid-template-columns:1fr 1fr">${['صواب', 'خطأ'].map(t => forPrint ? `<div class="pi-opt">${t}</div>` : `<button type="button" class="pi-opt" data-qo="${String(q.answer || '').trim().startsWith(t[0]) ? 1 : 0}">${t}</button>`).join('')}</div>`;
    else if (q.qtype === 'match') { const R = o.map((x, i) => ({ m: x.m, i })); if (R.length > 1) R.push(R.shift());
      opts = `<div class="pi-opts" style="grid-template-columns:1fr 1fr">${o.map((x, i) => `<div class="pi-opt"><span class="pi-l">${AR(i + 1)}</span><span>${esc(x.t)}</span></div><div class="pi-opt"><span class="pi-l">${LET[i]})</span><span>${esc((R[i] || {}).m)}</span></div>`).join('')}</div>`; }
    else if (q.qtype === 'order') { const R = o.slice(); if (R.length > 1) R.push(R.shift()); opts = `<div class="pi-opts">${R.map((x, i) => `<div class="pi-opt"><span class="pi-l">${LET[i]})</span><span>${esc(x.t)}</span></div>`).join('')}</div>`; }
    const body = q.qtype === 'blank' ? esc(q.body).replace(/_{3,}|\.{4,}|…{2,}|\[\s*\]/g, '<span style="display:inline-block;min-width:70px;border-bottom:2px solid #84B7E3">&nbsp;</span>') : esc(q.body);
    const ans = mode === 'never' ? '' : `<div class="pi-ans ${show || forPrint === 'ans' ? 'on' : ''}">الإجابة: ${esc(keyOf(q))}${q.explanation ? `<span class="pi-ex">${esc(q.explanation)}</span>` : ''}</div>`;
    const btn = !forPrint && mode === 'btn' ? `<button type="button" class="pi-btn" data-qa style="margin-top:6px">إظهار الإجابة</button>` : '';
    return `<div class="pi-q"><div class="pi-qb"><span class="pi-qn">${AR(n)}</span>${body} <span class="pi-qt">(${QT[q.qtype] || ''})</span></div>${q.image_url && safe(q.image_url) ? `<img src="${esc(q.image_url)}" alt="صورة السؤال ${AR(n)}" loading="lazy">` : ''}${opts}${btn}${forPrint === true ? '' : ans}</div>`;
  }
  function qsHtml(a, mode, forPrint) {
    const qs = a.qs || [];
    return `<div class="pi-qs">${forPrint ? '' : `<div class="pi-qs-h"><b>❓ ${esc(a.name || 'أسئلة')} <span style="font-weight:500;color:#5F7896">(${AR(qs.length)} سؤال)</span></b>${mode === 'btn' ? '<button type="button" class="pi-btn" data-qall>إظهار كل الإجابات</button>' : ''}</div>`}${qs.map((q, i) => qHtml(q, i + 1, mode, forPrint)).join('')}</div>`;
  }

  // ---- المرفق
  function attHtml(a, cfg, it, i) {
    const dl = cfg.download !== false && (it.opts || {}).download !== false;
    const mode = (it.opts || {}).ans || cfg.ans || 'btn';
    if (a.t === 'text') return `<div class="pi-txt">${esc(a.body)}</div>`;
    if (a.t === 'questions') return qsHtml(a, mode, false);
    if (a.t === 'images') return `<div class="pi-imgs">${(a.list || []).filter(x => safe(x.url)).map(x => `<img src="${esc(x.url)}" alt="${esc(x.name || it.title)}" loading="lazy" data-lb="${esc(x.url)}">`).join('')}</div>`;
    if (a.t === 'video') { const y = ytId(a.url), u = safe(a.url); if (!u) return '';
      return y ? `<div class="pi-vid"><button type="button" data-yt="${y}" style="background-image:url(https://i.ytimg.com/vi/${y}/hqdefault.jpg)"><span>▶ تشغيل: ${esc(a.name || 'الفيديو')}</span></button></div>`
        : /\.(mp4|webm|ogg)(\?|$)/i.test(u) ? `<div class="pi-vid"><video src="${esc(u)}" controls preload="none"></video></div>` : `<div class="pi-a"><span class="pi-fi">🎬</span><span class="pi-n">${esc(a.name || 'فيديو')}</span><a class="pi-btn pri" href="${esc(u)}" target="_blank" rel="noopener">مشاهدة</a></div>`; }
    if (a.t === 'quiz') return `<div class="pi-a"><span class="pi-fi">🧩</span><span class="pi-n">${esc(a.name || 'اختبار إلكتروني')}<small>${esc(a.sub || 'يحلّه الطالب من الجوال')}</small></span><a class="pi-btn ok" href="student.html?q=${encodeURIComponent(a.code || '')}" target="_blank" rel="noopener">حلّ الآن</a></div>`;
    const u = safe(a.url); if (!u) return '';
    if (a.t === 'link' || a.t === 'resource') return `<div class="pi-a"><span class="pi-fi">${a.t === 'resource' ? '📖' : '🔗'}</span><span class="pi-n">${esc(a.name || u)}${a.sub ? `<small>${esc(a.sub)}</small>` : ''}</span><a class="pi-btn pri" href="${esc(u)}" target="_blank" rel="noopener">فتح</a></div>`;
    // ملف
    const e = ext(a.name || u), isImg = /^(png|jpe?g|gif|webp)$/.test(e);
    if (isImg) return `<div class="pi-imgs"><img src="${esc(u)}" alt="${esc(a.name || '')}" loading="lazy" data-lb="${esc(u)}"></div>`;
    return `<div class="pi-a"><span class="pi-fi">${FI[e] || '📄'}</span><span class="pi-n">${esc(a.name || 'ملف')}<small>${esc([e.toUpperCase(), size(a.size)].filter(Boolean).join(' · '))}</small></span><a class="pi-btn pri" href="${esc(u)}" target="_blank" rel="noopener">عرض</a>${dl ? `<a class="pi-btn" href="${esc(u)}" download="${esc(a.name || '')}" target="_blank" rel="noopener">تنزيل</a>` : ''}</div>`;
  }
  function itemHtml(it, cfg, open) {
    const c = catOf(cfg, it.cat), att = it.att || [];
    const meta = [it.pinned ? '<span class="pi-pin">مثبّت</span>' : '', cfg.subject && it.subject ? `<span>${esc(it.subject)}</span>` : '', it.week ? `<span>الأسبوع ${esc(it.week)}</span>` : '',
      cfg.dates && it.from ? `<span>${fmtD(it.from)}${it.to ? ' ← ' + fmtD(it.to) : ''}</span>` : '', cfg.count && att.length ? `<span>${AR(att.length)} مرفق</span>` : ''].join('');
    const hasQ = att.some(a => a.t === 'questions');
    return `<details class="pi-it" style="--pc:${esc(c.c)}" data-pi="${esc(it.id)}" ${open ? 'open' : ''}><summary><span class="pi-ic" aria-hidden="true">${esc(c.ic)}</span><span class="pi-tt"><b>${esc(it.title)}</b><span class="pi-meta">${meta}</span></span><span class="pi-ch" aria-hidden="true">▾</span></summary>
      <div class="pi-bd">${it.body ? `<p class="pi-body">${esc(it.body)}</p>` : ''}<div class="pi-att">${att.map((a, i) => attHtml(a, cfg, it, i)).join('')}</div>
      ${cfg.print !== false ? `<div class="pi-acts"><button type="button" class="pi-btn" data-pp="0">🖨 طباعة</button>${hasQ && ((it.opts || {}).ans || cfg.ans) !== 'never' ? '<button type="button" class="pi-btn" data-pp="1">🖨 طباعة بالإجابات</button>' : ''}${cfg.pdf !== false ? '<button type="button" class="pi-btn" data-pp="pdf">PDF</button>' : ''}</div>` : ''}</div></details>`;
  }
  // data = {cfg, items}  o = {cat (المختار), preview}
  function html(data, o) {
    injectCss(); o = o || {};
    const cfg = cfgOf(data && data.cfg), on = new Set(cfg.cats.filter(c => c.on !== false).map(c => c.k));
    const items = ((data && data.items) || []).filter(it => on.has(it.cat) || !cfg.cats.some(c => c.k === it.cat));
    if (!items.length) return o.preview ? `<div class="pi-wrap"><div class="pi-empty">لا توجد بنود ظاهرة لهذا الفصل الآن.</div></div>` : '';
    const used = cfg.cats.filter(c => c.on !== false && items.some(i => i.cat === c.k)); if (items.some(i => !cfg.cats.some(c => c.k === i.cat))) used.push(catOf(cfg, '__'));
    const sel = o.cat && used.some(c => c.k === o.cat) ? o.cat : 'all';
    let n = 0; const one = c => items.filter(i => c.k === '__' ? !cfg.cats.some(x => x.k === i.cat) : i.cat === c.k);
    const body = cfg.layout === 'tabs'
      ? (sel === 'all' ? items : one(used.find(c => c.k === sel))).map(it => itemHtml(it, cfg, n++ < (+cfg.openN || 0))).join('')
      : used.map(c => `<div class="pi-cat" style="--pc:${esc(c.c)}"><span aria-hidden="true">${esc(c.ic)}</span>${esc(c.n)} <span style="font-weight:500;color:#5F7896">(${AR(one(c).length)})</span></div>${one(c).map(it => itemHtml(it, cfg, n++ < (+cfg.openN || 0))).join('')}`).join('');
    return `<section class="pi-wrap" aria-label="${esc(cfg.title)}"><div class="pi-hd"><h3>${esc(cfg.title)} <span style="font-weight:500;font-size:14px;color:#5F7896">(${AR(items.length)})</span></h3></div>
      ${cfg.layout === 'tabs' && used.length > 1 ? `<div class="pi-chips" role="group" aria-label="تصفية حسب النوع"><button type="button" data-pc="all" aria-pressed="${sel === 'all'}">الكل</button>${used.map(c => `<button type="button" data-pc="${esc(c.k)}" aria-pressed="${sel === c.k}" style="--pc:${esc(c.c)}"><span aria-hidden="true">${esc(c.ic)}</span>${esc(c.n)}</button>`).join('')}</div>` : ''}${body}</section>`;
  }
  // طباعة بند بهوية المدرسة
  function docBody(it, cfg, withAns) {
    const att = it.att || [];
    return `${it.body ? `<p style="white-space:pre-line;line-height:1.9">${esc(it.body)}</p>` : ''}${att.map(a => {
      if (a.t === 'questions') return `<h3 style="margin:14px 0 6px">${esc(a.name || 'الأسئلة')}</h3>` + (a.qs || []).map((q, i) => qHtml(q, i + 1, withAns ? 'always' : 'never', withAns ? 'ans' : true)).join('');
      if (a.t === 'text') return `<div class="pi-txt">${esc(a.body)}</div>`;
      if (a.t === 'images') return `<div class="pi-imgs">${(a.list || []).filter(x => safe(x.url)).map(x => `<img src="${esc(x.url)}" alt="" crossorigin="anonymous">`).join('')}</div>`;
      if (a.t === 'quiz') return `<p>🧩 ${esc(a.name || 'اختبار إلكتروني')} — رمز: <b dir="ltr">${esc(a.code || '')}</b></p>`;
      const u = safe(a.url); return u ? `<p>${a.t === 'video' ? '🎬' : a.t === 'file' ? '📄' : '🔗'} ${esc(a.name || '')} <span dir="ltr" style="font-size:11px;color:#5F7896;word-break:break-all">${esc(u)}</span></p>` : '';
    }).join('')}`;
  }
  async function printItem(it, cfg, mode) {
    cfg = cfgOf(cfg); const c = catOf(cfg, it.cat), withAns = mode === '1';
    const css = `<style>${CSS}.pi-q{break-inside:avoid}.pi-opt{border:1px solid #D5E1F0}</style>`;
    const title = it.title + (withAns ? ' — بالإجابات' : ''), sub = [c.n, it.subject, it.week ? 'الأسبوع ' + it.week : ''].filter(Boolean).join(' · ');
    if (window.DinaLive && window.DinaLive.exportDoc) return window.DinaLive.exportDoc(mode === 'pdf' ? 'pdf' : 'print', title, sub, css + docBody(it, cfg, withAns), title);
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(title)}</title>${css}<style>body{font-family:'GE SS Two',Tahoma,sans-serif;padding:24px;color:#082B5A}h1{margin:0 0 4px}</style></head><body><h1>${esc(title)}</h1><div style="color:#5F7896;margin-bottom:12px">${esc(sub)}</div>${docBody(it, cfg, withAns)}<script>onload=()=>setTimeout(()=>print(),300)<\/script></body></html>`); w.document.close();
  }
  // ربط التفاعل. o = {onCat(k), onSeen(id)}
  function bind(root, data, o) {
    o = o || {}; const cfg = cfgOf(data && data.cfg), items = (data && data.items) || [];
    root.querySelectorAll('[data-pc]').forEach(b => b.onclick = () => o.onCat && o.onCat(b.dataset.pc));
    root.querySelectorAll('details.pi-it').forEach(d => d.addEventListener('toggle', () => { if (d.open && !d._seen) { d._seen = 1; o.onSeen && o.onSeen(d.dataset.pi); } }));
    root.querySelectorAll('[data-qo]').forEach(b => b.onclick = () => { const q = b.closest('.pi-q'); b.classList.add(b.dataset.qo === '1' ? 'ok' : 'no'); if (b.dataset.qo === '1') q.querySelectorAll('.pi-opt').forEach(x => x.disabled = true); });
    root.querySelectorAll('[data-qa]').forEach(b => b.onclick = () => { const a = b.closest('.pi-q').querySelector('.pi-ans'); if (!a) return; a.classList.toggle('on'); b.textContent = a.classList.contains('on') ? 'إخفاء الإجابة' : 'إظهار الإجابة'; });
    root.querySelectorAll('[data-qall]').forEach(b => b.onclick = () => { const box = b.closest('.pi-qs'), on = !b._on; b._on = on; box.querySelectorAll('.pi-ans').forEach(a => a.classList.toggle('on', on)); box.querySelectorAll('[data-qa]').forEach(x => x.textContent = on ? 'إخفاء الإجابة' : 'إظهار الإجابة'); b.textContent = on ? 'إخفاء كل الإجابات' : 'إظهار كل الإجابات'; });
    root.querySelectorAll('[data-yt]').forEach(b => b.onclick = () => { const f = document.createElement('iframe'); f.src = `https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&rel=0`; f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true; f.title = 'فيديو'; b.replaceWith(f); });
    root.querySelectorAll('[data-lb]').forEach(im => im.onclick = () => { const d = document.createElement('div'); d.className = 'pi-lb'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'عرض الصورة'); d.innerHTML = `<img src="${esc(im.dataset.lb)}" alt=""><button type="button" aria-label="إغلاق">×</button>`; const x = () => { d.remove(); removeEventListener('keydown', k); im.focus(); }, k = e => { if (e.key === 'Escape') x(); }; d.onclick = e => { if (e.target === d || e.target.tagName === 'BUTTON') x(); }; addEventListener('keydown', k); document.body.appendChild(d); d.querySelector('button').focus(); });
    root.querySelectorAll('[data-pp]').forEach(b => b.onclick = async () => { const it = items.find(x => x.id === b.closest('[data-pi]').dataset.pi); if (!it) return; b.disabled = true; try { await printItem(it, cfg, b.dataset.pp); } catch (e) { } finally { b.disabled = false; } });
  }
  window.DinaItems = { DEF, cfgOf, catOf, html, bind, printItem, keyOf, injectCss };
})();
