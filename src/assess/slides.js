/* منصة دينا — العروض التقديمية: تحويل بنك الأسئلة أو أي نص/ملف (Word/PDF/صورة) لعرض احترافي بستّ هويات مشتقة من دينا،
   محرر شرائح، عرض بملء الشاشة مع إظهار الإجابة والسؤال اللحظي، وتصدير PowerPoint وPDF. sql/098 (decks) */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  const DEMO = !!api.demo;
  const uid = () => Math.random().toString(36).slice(2, 9);
  const LET = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
  A.I.slides = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8M7 8h6M7 11h10"/></svg>';
  if (A.NAV && !A.NAV.some(n => n[0] === 'slides')) { const i = A.NAV.findIndex(n => n[0] === 'games'); A.NAV.splice(i < 0 ? A.NAV.length : i, 0, ['slides', 'العروض التقديمية', () => !!S.me && !S.realMe && A.tfeat('slides')]); }

  // الهويات: bg، نص، عنوان، لمسة، لمسة٢، نمط زخرفي
  const TH = {
    navy: { n: 'كحلي دينا', bg: '#082B5A', fg: '#FFFFFF', ti: '#FFFFFF', ac: '#3AB1DB', a2: '#BADF93', deco: 'wave-dark' },
    wave: { n: 'موجة دينا', bg: '#FFFFFF', fg: '#1E3556', ti: '#082B5A', ac: '#005499', a2: '#3AB1DB', deco: 'wave' },
    sky: { n: 'سماوي هادئ', bg: '#EEF8FD', fg: '#1E3556', ti: '#005499', ac: '#3AB1DB', a2: '#082B5A', deco: 'corner' },
    green: { n: 'أخضر النمو', bg: '#FFFFFF', fg: '#1E3556', ti: '#1F6B44', ac: '#2E8B57', a2: '#BADF93', deco: 'bar' },
    night: { n: 'ليلي احترافي', bg: '#061B3A', fg: '#E6F0FA', ti: '#FFFFFF', ac: '#BADF93', a2: '#3AB1DB', deco: 'glow' },
    kids: { n: 'مرح للصغار', bg: '#FFFBF2', fg: '#24324A', ti: '#005499', ac: '#E0675A', a2: '#F2C14E', deco: 'dots' },
  };
  if (!document.getElementById('slcss')) { const st = document.createElement('style'); st.id = 'slcss'; st.textContent = `
.sl{position:relative;aspect-ratio:16/9;width:100%;overflow:hidden;border-radius:10px;container-type:inline-size;font-family:'GE SS Two','Tajawal',Tahoma,sans-serif;direction:rtl;box-shadow:0 10px 24px -16px rgba(8,43,90,.6)}
.sl .slin{position:absolute;inset:7cqw 7cqw 9cqw 7cqw;display:flex;flex-direction:column;gap:2.2cqw;z-index:2}
.sl h1{margin:0;font-size:5.2cqw;line-height:1.25;font-weight:900}.sl h2{margin:0;font-size:3.8cqw;line-height:1.3;font-weight:900}
.sl .sub{font-size:2.3cqw;opacity:.85}
.sl ul{margin:0;padding:0;list-style:none;display:grid;gap:1.4cqw}.sl li{font-size:2.5cqw;line-height:1.5;display:flex;gap:1.4cqw;align-items:flex-start}
.sl li::before{content:'';flex:none;width:1.3cqw;height:1.3cqw;border-radius:.35cqw;margin-top:1.1cqw;background:var(--ac);transform:rotate(45deg)}
.sl .ops{display:grid;grid-template-columns:1fr 1fr;gap:1.6cqw}.sl .op{display:flex;gap:1.4cqw;align-items:center;border-radius:1.4cqw;padding:1.4cqw 1.8cqw;font-size:2.3cqw;font-weight:800;background:rgba(127,127,127,.12);border:.25cqw solid transparent}
.sl .op b{width:4cqw;height:4cqw;border-radius:1cqw;display:grid;place-items:center;color:#fff;flex:none;font-size:2.2cqw}
.sl .op.ok{border-color:#2E8B57;background:rgba(46,139,87,.18)}
.sl .qn{font-size:2cqw;font-weight:800;color:var(--ac)}
.sl .ft{position:absolute;bottom:2.4cqw;inset-inline:7cqw;display:flex;justify-content:space-between;align-items:center;font-size:1.5cqw;opacity:.8;z-index:2}
.sl .ft img{height:3.2cqw}
.sl .dc{position:absolute;inset:0;z-index:1;pointer-events:none}
.sl.t-title .slin{justify-content:center}.sl.t-title h1{font-size:6.4cqw}.sl.t-section .slin{justify-content:center;align-items:flex-start}
.sl .ans{font-size:2.3cqw;font-weight:800;padding:1.2cqw 1.6cqw;border-radius:1.2cqw;background:rgba(46,139,87,.18);border-inline-start:.6cqw solid #2E8B57}
.sl-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(100%,260px),1fr))}
.sl-card{border:1px solid #DCE7F3;border-radius:16px;padding:10px;background:#fff;display:grid;gap:8px;box-shadow:0 12px 26px -22px rgba(8,43,90,.6)}
.sl-card b{color:#082B5A}
.sl-ed{display:grid;grid-template-columns:230px minmax(0,1fr);gap:14px;min-height:60vh}
@media (max-width:860px){.sl-ed{grid-template-columns:1fr}}
.sl-th{display:grid;gap:8px;align-content:start;max-height:70vh;overflow:auto;padding:4px}
.sl-th button{border:2px solid transparent;border-radius:12px;padding:3px;background:none;cursor:pointer;position:relative}
.sl-th button.on{border-color:#3AB1DB}.sl-th button span{position:absolute;top:6px;inset-inline-start:8px;z-index:5;background:#082B5A;color:#fff;border-radius:8px;font-size:11px;padding:0 6px}
.sl-thm{display:flex;gap:6px;flex-wrap:wrap}.sl-thm button{border:2px solid #DCE7F3;border-radius:12px;padding:4px 10px;font:inherit;font-weight:700;cursor:pointer;display:flex;gap:6px;align-items:center;background:#fff}
.sl-thm button.on{border-color:#005499;box-shadow:0 0 0 3px rgba(0,84,153,.12)}.sl-thm i{width:16px;height:16px;border-radius:50%;display:inline-block}
.sl-pres{position:fixed;inset:0;z-index:9100;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center}
.sl-pres .stage{width:min(100vw,177.78vh);}
.sl-pres .sl{border-radius:0;box-shadow:none}
.sl-pres .bar{position:fixed;bottom:12px;inset-inline:0;display:flex;justify-content:center;gap:8px;opacity:.15;transition:opacity .2s}.sl-pres .bar:hover,.sl-pres .bar:focus-within{opacity:1}
.sl-pres .bar button{font:inherit;font-weight:800;border:0;border-radius:12px;padding:8px 14px;background:rgba(255,255,255,.9);color:#082B5A;cursor:pointer}
.sl-pres .bar span{color:#fff;align-self:center;font-weight:800}
`; document.head.appendChild(st); }

  function deco(t) {
    const W = { 'wave': `<svg class="dc" viewBox="0 0 1600 900" preserveAspectRatio="none"><path d="M0 800 C 400 720, 900 900, 1600 760 L1600 900 L0 900Z" fill="#3AB1DB" opacity=".9"/><path d="M0 840 C 500 770, 1000 920, 1600 820 L1600 900 L0 900Z" fill="#005499"/><path d="M0 870 C 500 830, 1100 930, 1600 860 L1600 900 L0 900Z" fill="#082B5A"/><rect width="1600" height="14" fill="#082B5A"/></svg>`,
      'wave-dark': `<svg class="dc" viewBox="0 0 1600 900" preserveAspectRatio="none"><path d="M0 760 C 420 690, 950 880, 1600 720 L1600 900 L0 900Z" fill="#005499" opacity=".7"/><path d="M0 830 C 500 760, 1050 920, 1600 800 L1600 900 L0 900Z" fill="#3AB1DB" opacity=".55"/><circle cx="1500" cy="90" r="220" fill="#3AB1DB" opacity=".08"/></svg>`,
      'corner': `<svg class="dc" viewBox="0 0 1600 900" preserveAspectRatio="none"><path d="M1600 0 L1600 300 C 1450 260, 1350 120, 1300 0Z" fill="#3AB1DB" opacity=".35"/><path d="M0 900 L0 650 C 160 700, 260 820, 300 900Z" fill="#005499" opacity=".25"/></svg>`,
      'bar': `<svg class="dc" viewBox="0 0 1600 900" preserveAspectRatio="none"><rect x="1560" width="40" height="900" fill="#2E8B57"/><rect x="1530" width="14" height="900" fill="#BADF93"/><rect y="880" width="1600" height="20" fill="#BADF93" opacity=".7"/></svg>`,
      'glow': `<svg class="dc" viewBox="0 0 1600 900" preserveAspectRatio="none"><defs><radialGradient id="g1"><stop offset="0" stop-color="#3AB1DB" stop-opacity=".35"/><stop offset="1" stop-color="#3AB1DB" stop-opacity="0"/></radialGradient></defs><circle cx="1400" cy="150" r="500" fill="url(#g1)"/><circle cx="150" cy="820" r="380" fill="url(#g1)"/></svg>`,
      'dots': `<svg class="dc" viewBox="0 0 1600 900" preserveAspectRatio="none"><circle cx="1520" cy="90" r="70" fill="#F2C14E" opacity=".5"/><circle cx="1420" cy="40" r="30" fill="#E0675A" opacity=".5"/><circle cx="90" cy="830" r="90" fill="#3AB1DB" opacity=".35"/><circle cx="230" cy="870" r="40" fill="#2E8B57" opacity=".35"/></svg>` };
    return W[t.deco] || '';
  }
  const darkBg = t => ['navy', 'night'].includes(t);
  function slideHTML(s, theme, o = {}) {
    const t = TH[theme] || TH.navy; const logo = darkBg(theme) ? 'assets/logo_white.svg' : 'assets/logo.svg';
    const COL = ['#E0675A', '#005499', '#C9A44C', '#2F855A', '#AE95DA', '#3AB1DB'];
    let body = '';
    if (s.t === 'title') body = `<h1 style="color:${t.ti}">${esc(s.title)}</h1>${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ''}<div style="width:14cqw;height:.8cqw;border-radius:1cqw;background:${t.ac}"></div>`;
    else if (s.t === 'section') body = `<div style="width:10cqw;height:.8cqw;border-radius:1cqw;background:${t.ac}"></div><h1 style="color:${t.ti}">${esc(s.title)}</h1>${s.sub ? `<div class="sub">${esc(s.sub)}</div>` : ''}`;
    else if (s.t === 'question') { const q = s.q || {}; const ops = q.kind === 'tf' ? ['صواب', 'خطأ'] : (q.options || []);
      body = `<div class="qn">${esc(s.title || 'سؤال')}</div><h2 style="color:${t.ti}">${esc(q.body || '')}</h2>${ops.length ? `<div class="ops" ${ops.some(x => String(x).length > 40) ? 'style="grid-template-columns:1fr"' : ''}>${ops.map((x, i) => `<div class="op ${o.reveal && String(q.correct) === String(i) ? 'ok' : ''}"><b style="background:${COL[i % 6]}">${LET[i]}</b>${esc(x)}</div>`).join('')}</div>` : ''}${o.reveal && q.answer && !ops.length ? `<div class="ans">الإجابة: ${esc(q.answer)}</div>` : ''}`; }
    else body = `<h2 style="color:${t.ti}">${esc(s.title || '')}</h2><ul>${(s.items || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    return `<div class="sl t-${s.t}" style="background:${t.bg};color:${t.fg};--ac:${t.ac}">${deco(t)}<div class="slin">${body}</div><div class="ft"><img src="${logo}" alt=""><span>${o.n ? AR(o.n) : ''}</span></div></div>`;
  }
  A.slideHTML = slideHTML;

  // ---------- التحويل ----------
  function textToSlides(title, text) {
    const L = String(text || '').split(/\r?\n/).map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (!title && L.length) title = L.shift(); else if (L[0] === title) L.shift();
    const out = [{ id: uid(), t: 'title', title: title || 'عرض تقديمي', sub: (S.school || {}).name || '' }]; let cur = null;
    const isHead = (l, i) => /^#+\s*/.test(l) || (/[:：]$/.test(l) && l.length < 70) || (l.length <= 50 && !/[.؟?!،,؛]$/.test(l) && !/^([0-9٠-٩]+\s*[-.)]|[-•▪●*])/.test(l) && L[i + 1] && /^([0-9٠-٩]+\s*[-.)]|[-•▪●*])/.test(L[i + 1]));
    L.forEach((l, i) => {
      if (isHead(l, i)) { cur = { id: uid(), t: 'bullets', title: l.replace(/^#+\s*/, '').replace(/[:：]$/, ''), items: [] }; out.push(cur); return; }
      const it = l.replace(/^([0-9٠-٩]+\s*[-.)]|[-•▪●*])\s*/, '');
      if (!cur || cur.items.length >= 6) { cur = { id: uid(), t: 'bullets', title: cur ? cur.title.replace(/ \(تابع\)$/, '') + ' (تابع)' : title, items: [] }; out.push(cur); }
      // الجمل الطويلة تُقسم
      if (it.length > 160) it.split(/(?<=[.؟?!])\s+/).forEach(x => { if (cur.items.length >= 6) { cur = { id: uid(), t: 'bullets', title: cur.title.replace(/ \(تابع\)$/, '') + ' (تابع)', items: [] }; out.push(cur); } cur.items.push(x); });
      else cur.items.push(it);
    });
    out.push({ id: uid(), t: 'section', title: 'شكراً لكم', sub: 'أسئلة ونقاش' });
    return out;
  }
  function bankToSlides(title, qs, opt) {
    const out = [{ id: uid(), t: 'title', title, sub: opt.sub || '' }];
    qs.forEach((q, i) => { const tf = q.qtype === 'tf';
      out.push({ id: uid(), t: 'question', title: 'السؤال ' + AR(i + 1), q: { kind: tf ? 'tf' : (q.options || []).length ? 'mcq' : 'short', body: q.body, options: tf ? [] : (q.options || []).map(o => o.t), correct: tf ? (q.answer === 'صواب' ? '0' : '1') : String(Math.max(0, (q.options || []).findIndex(o => o.ok))), answer: q.answer || '' } }); });
    out.push({ id: uid(), t: 'section', title: 'أحسنتم!', sub: AR(qs.length) + ' سؤالاً' });
    return out;
  }
  A.textToSlides = textToSlides;

  // ---------- البيانات ----------
  async function decks() { try { return (await api.list('decks', { school_id: S.school.id }, { order: 'updated_at', desc: true })) || []; } catch (_) { return []; } }
  async function saveDeck(d) {
    const row = { title: d.title, theme: d.theme, slides: d.slides, shared: !!d.shared, updated_at: new Date().toISOString() };
    if (d.id) { await api.upd('decks', d.id, row); return d; }
    const ins = { school_id: S.school.id, ...row, ...(DEMO ? { id: 'dk' + Date.now(), owner: S.me.id, created_at: new Date().toISOString() } : {}) };
    const r = await api.ins('decks', [ins]); const x = Array.isArray(r) ? r[0] : r; return { ...d, ...(x || ins) };
  }

  // ---------- الصفحة ----------
  V.slides = async function (root) {
    root.innerHTML = '<div class="card"><div class="spinner"></div></div>';
    const all = await decks(); const me = S.me.id; const mine = all.filter(d => d.owner === me || (DEMO && !d.owner)), sh = all.filter(d => !mine.includes(d) && d.shared);
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>العروض التقديمية</h2><p class="sub" style="margin:2px 0 0">حوّل بنك الأسئلة أو أي درس/ملف إلى عرض احترافي بهوية مشتقة من دينا، واعرضه بملء الشاشة مع السؤال اللحظي، أو صدّره PowerPoint وPDF.</p></div><button class="btn" id="slNew">${A.I.plus || '+'} عرض جديد</button></div>
      <div class="sl-grid">${mine.map(d => card(d)).join('') || A.emptyBox('لا عروض بعد', 'ابدأ بـ«عرض جديد» من بنك الأسئلة أو من نص أو ملف.')}</div>
      ${sh.length ? `<h3 style="margin-top:16px">مشاركة من الزملاء</h3><div class="sl-grid">${sh.map(d => card(d, true)).join('')}</div>` : ''}</div>`;
    const reload = () => V.slides(root);
    $('#slNew', root).onclick = () => createDialog(reload);
    $$('[data-op]', root).forEach(b => b.onclick = async () => { const [op, id] = b.dataset.op.split('|'); const d = all.find(x => x.id === id);
      if (op === 'show') return present(d); if (op === 'edit') return editor(d, reload);
      if (op === 'pptx') return A.run(b, () => exportPptx(d)); if (op === 'pdf') return exportPdf(d);
      if (op === 'copy') return A.run(b, async () => { await saveDeck({ ...d, id: null, title: d.title + ' (نسخة)', shared: false }); reload(); });
      if (op === 'share') return A.run(b, async () => { await saveDeck({ ...d, shared: !d.shared }); reload(); });
      if (op === 'del') { if (!(await A.confirmBox(`حذف العرض «${esc(d.title)}»؟`, 'حذف', true))) return; await api.del('decks', id); reload(); } });
  };
  function card(d, foreign) {
    return `<div class="sl-card">${slideHTML((d.slides || [])[0] || { t: 'title', title: d.title }, d.theme)}<b>${esc(d.title)}</b><span class="small muted">${AR((d.slides || []).length)} شريحة · ${esc((TH[d.theme] || TH.navy).n)}${foreign ? ' · ' + esc(A.personName(d.owner) || '') : d.shared ? ' · مشارَك' : ''}</span>
      <div class="row" style="gap:4px;flex-wrap:wrap"><button class="btn sm" data-op="show|${d.id}">عرض</button>${foreign ? `<button class="btn ghost sm" data-op="copy|${d.id}">نسخ لعروضي</button>` : `<button class="btn ghost sm" data-op="edit|${d.id}">تحرير</button><button class="btn ghost sm" data-op="pptx|${d.id}">PowerPoint</button><button class="btn ghost sm" data-op="pdf|${d.id}">PDF</button><button class="btn ghost sm" data-op="share|${d.id}">${d.shared ? 'إلغاء المشاركة' : 'مشاركة'}</button><button class="btn ghost sm" data-op="del|${d.id}">حذف</button>`}</div></div>`;
  }

  function createDialog(after) {
    let way = 'bank', theme = 'wave', fileText = '';
    const m = A.modal(`<h3>عرض تقديمي جديد</h3>
      <div class="mf-ways">${[['bank', 'من بنك الأسئلة', 'مراجعة أو مسابقة صفية بأسئلة الدرس'], ['text', 'من نص', 'الصق محتوى الدرس أو ملخصه'], ['file', 'من ملف', 'Word أو PDF أو صورة']].map(([k, l, d]) => `<button type="button" class="mf-way ${k === way ? 'on' : ''}" data-w="${k}"><b>${l}</b><span class="small muted">${d}</span></button>`).join('')}</div>
      <div class="field"><label for="slT">عنوان العرض</label><input class="in" id="slT" placeholder="مثال: مراجعة درس الكسور"></div>
      <div id="slW"></div>
      <div class="field"><label>الهوية</label><div class="sl-thm">${Object.entries(TH).map(([k, t]) => `<button type="button" data-th="${k}" class="${k === theme ? 'on' : ''}"><i style="background:linear-gradient(135deg,${t.bg} 50%,${t.ac} 50%);border:1px solid #CFE0F2"></i>${t.n}</button>`).join('')}</div></div>
      <div class="acts"><button class="btn" id="slGo">إنشاء العرض</button></div>`, { cls: 'wide' });
    let Q = [], CUR = [];
    const drawW = async () => { const W = m.el.querySelector('#slW');
      if (way === 'bank') { W.innerHTML = '<div class="spinner"></div>'; if (!Q.length) { try { [Q, CUR] = await Promise.all([api.list('questions', { school_id: S.school.id }), api.list('curriculum', { school_id: S.school.id }).catch(() => [])]); } catch (_) { } }
        const subs = [...new Set(Q.map(q => q.subject_id).filter(Boolean))], grades = [...new Set(Q.map(q => q.grade_key).filter(Boolean))];
        W.innerHTML = `<div class="grid g3"><div class="field"><label for="slS">المادة</label><select class="in" id="slS"><option value="">الكل</option>${subs.map(s => `<option value="${s}">${esc(A.subjName(s))}</option>`).join('')}</select></div><div class="field"><label for="slG">الصف</label><select class="in" id="slG"><option value="">الكل</option>${grades.map(g => `<option value="${esc(g)}">${esc(A.gradeName ? (A.gradeName(String(g).split('|')[1], String(g).split('|')[0]) || g) : g)}</option>`).join('')}</select></div><div class="field"><label for="slL">الدرس</label><select class="in" id="slL"><option value="">الكل</option></select></div></div>
          <div class="grid g2"><div class="field"><label for="slN">عدد الأسئلة</label><input class="in" type="number" id="slN" min="1" max="60" value="10"></div><div class="field"><label class="chk" style="margin-top:28px"><input type="checkbox" id="slMix" checked> ترتيب عشوائي</label></div></div><div class="small muted" id="slC"></div>`;
        const upd = () => { const s = W.querySelector('#slS').value, g = W.querySelector('#slG').value; const ls = CUR.filter(c => (!s || c.subject_id === s) && (!g || c.grade_key === g)); const L = W.querySelector('#slL'); const v = L.value; L.innerHTML = '<option value="">الكل</option>' + ls.map(c => `<option value="${c.id}">${esc(c.lesson)}</option>`).join(''); L.value = ls.some(c => c.id === v) ? v : ''; W.querySelector('#slC').textContent = `المتاح: ${AR(pool().length)} سؤالاً (اختيار من متعدد، صواب وخطأ، إجابة قصيرة)`; if (!m.el.querySelector('#slT').value && L.value) m.el.querySelector('#slT').value = 'مراجعة: ' + (CUR.find(c => c.id === L.value) || {}).lesson; };
        ['#slS', '#slG', '#slL'].forEach(k => W.querySelector(k).onchange = upd); upd(); }
      if (way === 'text') W.innerHTML = `<textarea class="in" id="slX" rows="9" style="width:100%" placeholder="العنوان الرئيسي\nأهداف الدرس:\n- يتعرف الطالب على…\n- يميّز بين…\nالمفاهيم الأساسية:\n- …"></textarea><p class="small muted">العناوين القصيرة أو المنتهية بـ«:» تبدأ شريحة جديدة، والأسطر تحتها نقاط (٦ في الشريحة كحد أقصى).</p>`;
      if (way === 'file') { W.innerHTML = `<input type="file" class="in" id="slF" accept=".docx,.pdf,.txt,image/*"><div class="small muted" id="slFs" style="margin-top:6px"></div>`;
        W.querySelector('#slF').onchange = async e => { const f = e.target.files[0]; if (!f) return; const s = W.querySelector('#slFs'); s.textContent = 'جارٍ القراءة…'; try { let l = /^image\//.test(f.type) && A._imageLines ? await A._imageLines(f, p => { s.textContent = 'التعرف الضوئي ' + Math.round((p || 0) * 100) + '٪'; }) : A._fileLines ? await A._fileLines(f) : null; if (!l) throw new Error('صيغة غير مدعومة'); fileText = (Array.isArray(l) ? l : String(l).split('\n')).map(x => typeof x === 'string' ? x : (x.text || x.t || '')).join('\n'); s.textContent = `قُرئ ${AR(fileText.split('\n').filter(Boolean).length)} سطراً.`; if (!m.el.querySelector('#slT').value) m.el.querySelector('#slT').value = f.name.replace(/\.[^.]+$/, ''); } catch (er) { s.textContent = 'تعذّرت القراءة: ' + er.message; } }; }
    };
    const pool = () => { const W = m.el.querySelector('#slW'); const s = (W.querySelector('#slS') || {}).value, g = (W.querySelector('#slG') || {}).value, l = (W.querySelector('#slL') || {}).value; return Q.filter(q => ['mcq', 'tf', 'short', 'blank'].includes(q.qtype) && (!s || q.subject_id === s) && (!g || q.grade_key === g) && (!l || q.lesson_id === l)); };
    $$('[data-w]', m.el).forEach(b => b.onclick = () => { way = b.dataset.w; $$('[data-w]', m.el).forEach(x => x.classList.toggle('on', x === b)); drawW(); });
    $$('[data-th]', m.el).forEach(b => b.onclick = () => { theme = b.dataset.th; $$('[data-th]', m.el).forEach(x => x.classList.toggle('on', x === b)); });
    drawW();
    m.el.querySelector('#slGo').onclick = e => A.run(e.currentTarget, async () => {
      let title = m.el.querySelector('#slT').value.trim(), slides;
      if (way === 'bank') { let p = pool(); if (!p.length) throw new Error('لا أسئلة بهذه الشروط'); if (m.el.querySelector('#slMix').checked) p = p.sort(() => Math.random() - .5); p = p.slice(0, Math.max(1, +m.el.querySelector('#slN').value || 10)); title = title || 'مراجعة'; const s = m.el.querySelector('#slS').value; slides = bankToSlides(title, p, { sub: [s ? A.subjName(s) : '', S.school.name].filter(Boolean).join(' · ') }); }
      else { const txt = way === 'text' ? m.el.querySelector('#slX').value : fileText; if (!txt.trim()) throw new Error(way === 'file' ? 'اختر ملفاً' : 'الصق النص'); slides = textToSlides(title, txt); title = title || slides[0].title; }
      const d = await saveDeck({ title, theme, slides }); m.close(); A.toast(`أُنشئ عرض من ${AR(slides.length)} شريحة`, 'ok'); after && after(); editor(d, after);
    });
  }

  // ---------- المحرر ----------
  function editor(d0, after) {
    const d = JSON.parse(JSON.stringify(d0)); let cur = 0;
    const m = A.modal(`<div class="head" style="margin:0 0 8px"><div class="grow"><input class="in" id="edT" value="${esc(d.title)}" aria-label="عنوان العرض" style="font-weight:800;font-size:18px"></div><button class="btn ghost sm" id="edShow">عرض</button><button class="btn ghost sm" id="edPp">PowerPoint</button><button class="btn" id="edSave">حفظ</button></div>
      <div class="sl-thm" id="edTh" style="margin-bottom:8px">${Object.entries(TH).map(([k, t]) => `<button type="button" data-th="${k}" class="${k === d.theme ? 'on' : ''}"><i style="background:linear-gradient(135deg,${t.bg} 50%,${t.ac} 50%);border:1px solid #CFE0F2"></i>${t.n}</button>`).join('')}</div>
      <div class="sl-ed"><div><div class="sl-th" id="edL"></div><div class="row" style="gap:4px;flex-wrap:wrap;margin-top:6px"><button class="btn ghost sm" data-add="bullets">+ نقاط</button><button class="btn ghost sm" data-add="question">+ سؤال</button><button class="btn ghost sm" data-add="section">+ فاصل</button></div></div><div><div id="edP"></div><div id="edF" style="margin-top:10px"></div></div></div>`, { cls: 'wide fm-modal' });
    const L = m.el.querySelector('#edL'), P = m.el.querySelector('#edP'), F = m.el.querySelector('#edF');
    const drawL = () => { L.innerHTML = d.slides.map((s, i) => `<button data-i="${i}" class="${i === cur ? 'on' : ''}" aria-label="شريحة ${i + 1}"><span>${AR(i + 1)}</span>${slideHTML(s, d.theme)}</button>`).join(''); $$('[data-i]', L).forEach(b => b.onclick = () => { cur = +b.dataset.i; draw(); }); };
    const drawP = () => { P.innerHTML = slideHTML(d.slides[cur], d.theme, { n: cur + 1, reveal: true }); };
    const drawF = () => { const s = d.slides[cur]; if (!s) { F.innerHTML = ''; return; }
      F.innerHTML = `<div class="grid g2"><div class="field"><label for="efT">${s.t === 'question' ? 'عنوان الشريحة' : 'العنوان'}</label><input class="in" id="efT" value="${esc(s.title || '')}"></div>${['title', 'section'].includes(s.t) ? `<div class="field"><label for="efS">سطر فرعي</label><input class="in" id="efS" value="${esc(s.sub || '')}"></div>` : ''}</div>
        ${s.t === 'bullets' ? `<div class="field"><label for="efI">النقاط (سطر لكل نقطة)</label><textarea class="in" id="efI" rows="6">${esc((s.items || []).join('\n'))}</textarea></div>` : ''}
        ${s.t === 'question' ? `<div class="field"><label for="efQ">نص السؤال</label><textarea class="in" id="efQ" rows="2">${esc(s.q.body || '')}</textarea></div>${s.q.kind === 'mcq' ? `<div class="field"><label for="efO">الخيارات (سطر لكل خيار)</label><textarea class="in" id="efO" rows="4">${esc((s.q.options || []).join('\n'))}</textarea></div><div class="field"><label for="efC">رقم الإجابة الصحيحة</label><input class="in" type="number" id="efC" min="1" max="6" value="${(+s.q.correct || 0) + 1}" style="max-width:100px"></div>` : s.q.kind === 'short' ? `<div class="field"><label for="efA">الإجابة النموذجية</label><input class="in" id="efA" value="${esc(s.q.answer || '')}"></div>` : ''}` : ''}
        <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn ghost sm" id="efUp">▲ تقديم</button><button class="btn ghost sm" id="efDn">▼ تأخير</button><button class="btn ghost sm" id="efDup">تكرار</button><button class="btn ghost sm" id="efDel">حذف الشريحة</button></div>`;
      const on = (id, fn) => { const e = F.querySelector(id); if (e) e.oninput = () => { fn(e.value); drawP(); clearTimeout(drawF._t); drawF._t = setTimeout(drawL, 400); }; };
      on('#efT', v => s.title = v); on('#efS', v => s.sub = v); on('#efI', v => s.items = v.split('\n').map(x => x.trim()).filter(Boolean));
      on('#efQ', v => s.q.body = v); on('#efO', v => s.q.options = v.split('\n').map(x => x.trim()).filter(Boolean)); on('#efC', v => s.q.correct = String(Math.max(0, (+v || 1) - 1))); on('#efA', v => s.q.answer = v);
      F.querySelector('#efUp').onclick = () => { if (cur > 0) { [d.slides[cur - 1], d.slides[cur]] = [d.slides[cur], d.slides[cur - 1]]; cur--; draw(); } };
      F.querySelector('#efDn').onclick = () => { if (cur < d.slides.length - 1) { [d.slides[cur + 1], d.slides[cur]] = [d.slides[cur], d.slides[cur + 1]]; cur++; draw(); } };
      F.querySelector('#efDup').onclick = () => { d.slides.splice(cur + 1, 0, { ...JSON.parse(JSON.stringify(s)), id: uid() }); cur++; draw(); };
      F.querySelector('#efDel').onclick = () => { if (d.slides.length <= 1) return; d.slides.splice(cur, 1); cur = Math.max(0, cur - 1); draw(); };
    };
    const draw = () => { drawL(); drawP(); drawF(); };
    $$('[data-th]', m.el).forEach(b => b.onclick = () => { d.theme = b.dataset.th; $$('[data-th]', m.el).forEach(x => x.classList.toggle('on', x === b)); drawL(); drawP(); });
    $$('[data-add]', m.el).forEach(b => b.onclick = () => { const t = b.dataset.add; const s = t === 'question' ? { id: uid(), t, title: 'سؤال', q: { kind: 'mcq', body: 'اكتب السؤال', options: ['الخيار الأول', 'الخيار الثاني', 'الخيار الثالث', 'الخيار الرابع'], correct: '0' } } : t === 'section' ? { id: uid(), t, title: 'عنوان القسم', sub: '' } : { id: uid(), t, title: 'عنوان الشريحة', items: ['نقطة أولى', 'نقطة ثانية'] }; d.slides.splice(cur + 1, 0, s); cur++; draw(); });
    const collect = () => { d.title = m.el.querySelector('#edT').value.trim() || d.title; return d; };
    m.el.querySelector('#edShow').onclick = () => present(collect(), cur);
    m.el.querySelector('#edPp').onclick = e => A.run(e.currentTarget, () => exportPptx(collect()));
    m.el.querySelector('#edSave').onclick = e => A.run(e.currentTarget, async () => { const r = await saveDeck(collect()); Object.assign(d, r); A.toast('حُفظ العرض', 'ok'); after && after(); });
    draw();
  }

  // ---------- العرض بملء الشاشة ----------
  function present(d, start) {
    let i = start || 0, reveal = false;
    const o = document.createElement('div'); o.className = 'sl-pres'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'عرض الشرائح'); document.body.appendChild(o);
    const draw = () => { const s = d.slides[i];
      o.innerHTML = `<div class="stage">${slideHTML(s, d.theme, { n: i + 1, reveal })}</div><div class="bar"><button data-a="prev" aria-label="السابق">›</button><span>${AR(i + 1)} / ${AR(d.slides.length)}</span><button data-a="next" aria-label="التالي">‹</button>${s.t === 'question' ? `<button data-a="rev">${reveal ? 'إخفاء الإجابة' : 'إظهار الإجابة'}</button>${A.livePollStart && A.tfeat('poll') ? '<button data-a="poll">سؤال لحظي للطلاب</button>' : ''}` : ''}<button data-a="fs">⛶</button><button data-a="x">إنهاء</button></div>`;
      $$('[data-a]', o).forEach(b => b.onclick = e => { e.stopPropagation(); act(b.dataset.a); }); };
    const act = a => { if (a === 'next' && i < d.slides.length - 1) { i++; reveal = false; } if (a === 'prev' && i > 0) { i--; reveal = false; } if (a === 'rev') reveal = !reveal;
      if (a === 'x') { close(); return; } if (a === 'fs') { (o.requestFullscreen || o.webkitRequestFullscreen || (() => { })).call(o); return; }
      if (a === 'poll') { const q = d.slides[i].q || {}; A.livePollStart({ kind: q.kind === 'tf' ? 'tf' : q.kind === 'mcq' ? 'mcq' : 'short', question: q.body || '', options: q.kind === 'mcq' ? q.options : [], correct: ['mcq', 'tf'].includes(q.kind) ? q.correct : null }); return; }
      draw(); };
    const key = e => { if (document.querySelector('.lp-ovl')) return; if (['ArrowLeft', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); act('next'); } if (['ArrowRight', 'PageUp'].includes(e.key)) act('prev'); if (e.key === 'Escape') act('x'); if (e.key.toLowerCase() === 'a') act('rev'); };
    const close = () => { document.removeEventListener('keydown', key); if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); o.remove(); };
    document.addEventListener('keydown', key); o.addEventListener('click', e => { if (e.target.closest('.bar')) return; act('next'); });
    draw();
  }
  A.presentDeck = present;

  // ---------- التصدير ----------
  function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('تعذّر تحميل ' + src)); document.head.appendChild(s); }); }
  async function exportPptx(d) {
    if (!window.PptxGenJS) await loadScript('vendor/pptxgen.bundle.js');
    const t = TH[d.theme] || TH.navy, hx = c => c.replace('#', '');
    const p = new window.PptxGenJS(); p.layout = 'LAYOUT_WIDE'; p.rtlMode = true; p.title = d.title; p.company = (S.school || {}).name || '';
    const F = 'Arial', COL = ['E0675A', '005499', 'C9A44C', '2F855A', 'AE95DA', '3AB1DB'];
    d.slides.forEach((s, n) => {
      const sl = p.addSlide(); sl.background = { color: hx(t.bg) };
      sl.addShape(p.ShapeType.rect, { x: 0, y: 7.1, w: 13.33, h: 0.4, fill: { color: hx(t.ac) } }); sl.addShape(p.ShapeType.rect, { x: 0, y: 7.0, w: 13.33, h: 0.1, fill: { color: hx(t.a2) } });
      sl.addText(String(n + 1), { x: 0.4, y: 6.55, w: 1, h: 0.4, fontSize: 12, color: hx(t.fg), fontFace: F });
      sl.addText((S.school || {}).name || '', { x: 8.3, y: 6.55, w: 4.6, h: 0.4, fontSize: 12, color: hx(t.fg), align: 'right', rtlMode: true, fontFace: F });
      if (s.t === 'title' || s.t === 'section') { sl.addText(s.title || '', { x: 0.8, y: 2.3, w: 11.7, h: 1.6, fontSize: s.t === 'title' ? 44 : 38, bold: true, color: hx(t.ti), align: 'right', rtlMode: true, fontFace: F }); sl.addShape(p.ShapeType.rect, { x: 10.6, y: 4.0, w: 1.9, h: 0.12, fill: { color: hx(t.ac) } }); if (s.sub) sl.addText(s.sub, { x: 0.8, y: 4.3, w: 11.7, h: 0.8, fontSize: 20, color: hx(t.fg), align: 'right', rtlMode: true, fontFace: F }); }
      else if (s.t === 'question') { const q = s.q || {}; const ops = q.kind === 'tf' ? ['صواب', 'خطأ'] : (q.options || []);
        sl.addText(s.title || '', { x: 0.8, y: 0.5, w: 11.7, h: 0.5, fontSize: 16, bold: true, color: hx(t.ac), align: 'right', rtlMode: true, fontFace: F });
        sl.addText(q.body || '', { x: 0.8, y: 1.0, w: 11.7, h: 1.6, fontSize: 28, bold: true, color: hx(t.ti), align: 'right', valign: 'top', rtlMode: true, fontFace: F });
        ops.forEach((o, i) => { const col = i % 2, row = Math.floor(i / 2); const x = col === 0 ? 6.85 : 0.8, y = 3.0 + row * 1.15;
          sl.addShape(p.ShapeType.roundRect, { x, y, w: 5.65, h: 0.95, fill: { color: hx(t.bg) === 'FFFFFF' ? 'F1F5FA' : '1A3D6B' }, line: { color: COL[i % 6], width: 2 }, rectRadius: 0.12 });
          sl.addText(LET[i], { x: x + 4.85, y: y + 0.15, w: 0.65, h: 0.65, fontSize: 18, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', fill: { color: COL[i % 6] }, fontFace: F });
          sl.addText(String(o), { x: x + 0.15, y: y + 0.1, w: 4.6, h: 0.75, fontSize: 18, bold: true, color: hx(t.fg), align: 'right', valign: 'middle', rtlMode: true, fontFace: F }); });
        sl.addNotes('الإجابة: ' + (['mcq', 'tf'].includes(q.kind) ? (ops[+q.correct] || '') : (q.answer || ''))); }
      else { sl.addText(s.title || '', { x: 0.8, y: 0.5, w: 11.7, h: 1.0, fontSize: 32, bold: true, color: hx(t.ti), align: 'right', rtlMode: true, fontFace: F });
        sl.addShape(p.ShapeType.rect, { x: 11.2, y: 1.5, w: 1.3, h: 0.08, fill: { color: hx(t.ac) } });
        sl.addText((s.items || []).map(x => ({ text: x, options: { bullet: { code: '25C6' }, rtlMode: true, align: 'right', paraSpaceAfter: 10 } })), { x: 0.8, y: 1.8, w: 11.7, h: 4.7, fontSize: 22, color: hx(t.fg), valign: 'top', rtlMode: true, fontFace: F }); }
    });
    await p.writeFile({ fileName: (d.title || 'عرض').replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 60) + '.pptx' });
    A.toast('صُدّر ملف PowerPoint', 'ok');
  }
  function exportPdf(d) {
    const w = window.open('', '_blank'); if (!w) return A.toast('اسمح بالنوافذ المنبثقة للطباعة', 'err');
    const css = document.getElementById('slcss').textContent;
    const base = location.href.split('#')[0].replace(/[^/]*$/, '');
    w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="${base}"><title>${esc(d.title)}</title><style>@font-face{font-family:'GE SS Two';font-weight:400 500;src:url(fonts/gess-two-medium.woff2) format('woff2')}@font-face{font-family:'GE SS Two';font-weight:600 900;src:url(fonts/gess-two-bold.woff2) format('woff2')}${css}
      @page{size:13.333in 7.5in;margin:0}body{margin:0}.pg{width:13.333in;height:7.5in;page-break-after:always;display:flex}.pg .sl{border-radius:0;box-shadow:none;width:100%;height:100%;aspect-ratio:auto}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>${d.slides.map((s, i) => `<div class="pg">${slideHTML(s, d.theme, { n: i + 1, reveal: true })}</div>`).join('')}<script>document.fonts.ready.then(()=>setTimeout(()=>print(),400))<\/script></body></html>`);
    w.document.close();
  }
})();
