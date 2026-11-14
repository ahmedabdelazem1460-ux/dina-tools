/* منصة دينا — السؤال اللحظي (مثل ClassPoint): المعلم يطرح سؤالاً في أي لحظة (من الصفحة، أو السبورة، أو العرض التقديمي)
   فيجيب الطلاب من جوالاتهم برمز/QR على poll.html، وتظهر النتائج لحظياً: أعمدة، سحابة كلمات، إجابات قصيرة، مقياس، أرقام.
   ويمكن إدراج النتائج صورةً في السبورة. sql/098 */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  const DEMO = !!api.demo;
  const KINDS = [['mcq', 'اختيار من متعدد', 'أ ب ج د'], ['tf', 'صواب أم خطأ', '✓ ✗'], ['cloud', 'سحابة كلمات', 'كلمة أو كلمتان'], ['short', 'إجابة قصيرة', 'جملة'], ['scale', 'مقياس ١–٥', 'رأي/ثقة'], ['number', 'إجابة رقمية', '١٢٣']];
  const COL = ['#E0675A', '#005499', '#C9A44C', '#2F855A', '#AE95DA', '#3AB1DB'], LET = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
  A.I.poll = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>';
  if (A.NAV && !A.NAV.some(n => n[0] === 'poll')) { const i = A.NAV.findIndex(n => n[0] === 'games'); A.NAV.splice(i < 0 ? A.NAV.length : i, 0, ['poll', 'السؤال اللحظي', () => !!S.me && !S.realMe && A.tfeat('poll')]); }

  if (!document.getElementById('lpcss')) { const st = document.createElement('style'); st.id = 'lpcss'; st.textContent = `
.lp-ovl{position:fixed;inset:0;z-index:9000;background:radial-gradient(1200px 600px at 50% -20%,#0E3E7A,#061B3A);color:#fff;display:flex;flex-direction:column}
.lp-top{display:flex;gap:10px;align-items:center;padding:10px 16px;border-bottom:4px solid #3AB1DB;flex-wrap:wrap}
.lp-top .grow{min-width:160px}.lp-top b{font-size:18px}
.lp-top button,.lp-act button{font:inherit;font-weight:800;border:0;border-radius:12px;padding:9px 14px;cursor:pointer;background:rgba(255,255,255,.12);color:#fff}
.lp-top button.pri,.lp-act button.pri{background:#fff;color:#082B5A}
.lp-top button:focus-visible,.lp-act button:focus-visible{outline:3px solid #3AB1DB}
.lp-body{flex:1;display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:16px;padding:16px;min-height:0}
@media (max-width:860px){.lp-body{grid-template-columns:1fr;overflow:auto}}
.lp-main{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:18px;display:flex;flex-direction:column;min-height:0;overflow:auto}
.lp-q{font-size:clamp(20px,2.6vw,34px);font-weight:900;line-height:1.5;margin:0 0 12px;white-space:pre-line}
.lp-side{display:grid;gap:12px;align-content:start}
.lp-code{background:#fff;color:#082B5A;border-radius:22px;padding:14px;text-align:center}
.lp-code .qr{width:100%;max-width:220px;margin:0 auto}.lp-code .c{font-size:34px;font-weight:900;letter-spacing:.18em;direction:ltr}
.lp-code .u{font-size:12px;color:#43597A;direction:ltr;word-break:break-all}
.lp-n{display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,.08);border-radius:16px;padding:12px 14px}.lp-n b{font-size:30px}
.lp-bars{display:grid;gap:12px;margin-top:6px}
.lp-bar{display:grid;grid-template-columns:44px 1fr 70px;gap:10px;align-items:center}
.lp-bar .l{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;font-weight:900;font-size:18px}
.lp-bar .t{position:relative;height:44px;border-radius:12px;background:rgba(255,255,255,.08);overflow:hidden}
.lp-bar .t i{position:absolute;inset-block:0;inset-inline-start:0;border-radius:12px;transition:width .6s ease}
.lp-bar .t span{position:relative;z-index:1;display:flex;align-items:center;height:100%;padding:0 12px;font-weight:800}
.lp-bar.ok .t{outline:3px solid #BADF93}
.lp-bar .p{font-weight:900;font-size:18px;text-align:end}
.lp-cloud{display:flex;flex-wrap:wrap;gap:8px 16px;justify-content:center;align-items:center;padding:12px;min-height:200px}
.lp-cloud span{font-weight:900;line-height:1.1}
.lp-list{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}
.lp-list div{background:#fff;color:#082B5A;border-radius:14px;padding:10px 12px;font-weight:700;box-shadow:0 8px 16px -10px rgba(0,0,0,.5)}
.lp-list small{display:block;color:#5b6b7f;font-weight:500}
.lp-stat{display:flex;gap:12px;flex-wrap:wrap}.lp-stat div{background:rgba(255,255,255,.08);border-radius:16px;padding:12px 16px}.lp-stat b{display:block;font-size:30px}
.lp-act{display:flex;gap:8px;flex-wrap:wrap}
.lp-setup{display:grid;gap:12px}
.lp-kinds{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(150px,1fr))}
.lp-k{border:1.5px solid #DCE7F3;border-radius:14px;padding:12px;background:#fff;font:inherit;cursor:pointer;text-align:start;display:grid;gap:2px}
.lp-k.on{border-color:#005499;background:#F1F7FD;box-shadow:0 0 0 3px rgba(0,84,153,.12)}.lp-k b{color:#082B5A}.lp-k small{color:#5b6b7f}
.lp-opts{display:grid;gap:6px}.lp-opts .row{gap:6px;align-items:center}
@media (prefers-reduced-motion:reduce){.lp-bar .t i{transition:none}}
`; document.head.appendChild(st); }

  const genCode = () => { const ab = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 6; i++) s += ab[Math.floor(Math.random() * ab.length)]; return s; };
  const joinUrl = c => location.origin + location.pathname.replace(/[^/]*$/, '') + 'poll.html?c=' + c;

  // ---------- نافذة الإعداد ----------
  function setup(pre = {}, src) {
    let kind = pre.kind || 'mcq';
    const m = A.modal(`<h3>سؤال لحظي</h3><div class="lp-setup">
      <div class="lp-kinds" role="radiogroup" aria-label="نوع السؤال">${KINDS.map(([k, l, d]) => `<button type="button" class="lp-k ${k === kind ? 'on' : ''}" data-k="${k}" role="radio" aria-checked="${k === kind}"><b>${l}</b><small>${d}</small></button>`).join('')}</div>
      <div class="field"><label for="lpQ">نص السؤال <span class="small muted">(اختياري — يمكنك طرحه شفهياً أو على السبورة)</span></label><textarea class="in" id="lpQ" rows="2">${esc(pre.question || '')}</textarea></div>
      <div id="lpO"></div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn ghost sm" id="lpBank">اختيار من بنك الأسئلة</button></div>
      <div class="acts"><button class="btn" id="lpGo">ابدأ واعرض الرمز</button></div></div>`, { cls: 'wide' });
    let opts = (pre.options && pre.options.length ? pre.options : ['', '', '', '']).slice(), correct = pre.correct != null ? String(pre.correct) : '';
    const drawO = () => { const O = m.el.querySelector('#lpO');
      if (kind === 'mcq') { O.innerHTML = `<div class="lp-opts"><label class="small">الخيارات — اختر الإجابة الصحيحة (اختياري)</label>${opts.map((o, i) => `<div class="row"><label class="chk" style="width:auto"><input type="radio" name="lpC" value="${i}" ${correct === String(i) ? 'checked' : ''} aria-label="صحيحة"></label><span class="pill" style="background:${COL[i]};color:#fff">${LET[i]}</span><input class="in" data-o="${i}" value="${esc(o)}" placeholder="الخيار ${LET[i]} (يُترك فارغاً ليُعرض الحرف فقط)"></div>`).join('')}<div class="row" style="gap:6px">${opts.length < 6 ? '<button class="btn ghost sm" id="lpAdd">+ خيار</button>' : ''}${opts.length > 2 ? '<button class="btn ghost sm" id="lpRm">− خيار</button>' : ''}</div></div>`;
        $$('[data-o]', O).forEach(i => i.oninput = () => { opts[+i.dataset.o] = i.value; }); $$('[name=lpC]', O).forEach(r => r.onchange = () => { correct = r.value; });
        const ad = O.querySelector('#lpAdd'); if (ad) ad.onclick = () => { opts.push(''); drawO(); }; const rm = O.querySelector('#lpRm'); if (rm) rm.onclick = () => { opts.pop(); if (+correct >= opts.length) correct = ''; drawO(); }; }
      else if (kind === 'tf') O.innerHTML = `<div class="row" style="gap:8px"><span class="small">الإجابة الصحيحة (اختياري):</span><label class="chk"><input type="radio" name="lpT" value="0" ${correct === '0' ? 'checked' : ''}> صواب</label><label class="chk"><input type="radio" name="lpT" value="1" ${correct === '1' ? 'checked' : ''}> خطأ</label></div>`, $$('[name=lpT]', O).forEach(r => r.onchange = () => { correct = r.value; });
      else if (kind === 'scale') O.innerHTML = `<div class="grid g2"><div class="field"><label for="lpS1">طرف ١</label><input class="in" id="lpS1" value="${esc(opts[0] && opts.length === 2 ? opts[0] : 'لا أوافق')}"></div><div class="field"><label for="lpS5">طرف ٥</label><input class="in" id="lpS5" value="${esc(opts[1] && opts.length === 2 ? opts[1] : 'أوافق تماماً')}"></div></div>`;
      else O.innerHTML = '';
    };
    $$('[data-k]', m.el).forEach(b => b.onclick = () => { kind = b.dataset.k; correct = ''; $$('[data-k]', m.el).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); drawO(); });
    m.el.querySelector('#lpBank').onclick = () => pickBank(q => { m.el.querySelector('#lpQ').value = q.body; if (q.qtype === 'tf') { kind = 'tf'; correct = q.answer === 'صواب' ? '0' : '1'; } else if ((q.options || []).length) { kind = 'mcq'; opts = q.options.map(o => o.t).slice(0, 6); correct = String(Math.max(0, q.options.findIndex(o => o.ok))); } else kind = 'short'; $$('[data-k]', m.el).forEach(x => x.classList.toggle('on', x.dataset.k === kind)); drawO(); });
    drawO();
    m.el.querySelector('#lpGo').onclick = e => A.run(e.currentTarget, async () => {
      const q = m.el.querySelector('#lpQ').value.trim();
      let o = []; if (kind === 'mcq') { o = opts.map((x, i) => x.trim() || LET[i]); } if (kind === 'scale') o = [m.el.querySelector('#lpS1').value.trim(), m.el.querySelector('#lpS5').value.trim()];
      m.close(); await host({ kind, question: q, options: o, correct: (kind === 'mcq' || kind === 'tf') && correct !== '' ? correct : null }, src);
    });
  }
  async function pickBank(cb) {
    let Q = []; try { Q = (await api.list('questions', { school_id: S.school.id }, { order: 'created_at', desc: true })).filter(q => ['mcq', 'tf', 'short', 'blank'].includes(q.qtype)); } catch (_) { }
    const m = A.modal(`<h3>اختيار سؤال من البنك</h3><input class="in" id="pbQ" placeholder="بحث في الأسئلة" style="margin-bottom:8px"><div id="pbL" style="display:grid;gap:6px;max-height:55vh;overflow:auto"></div>`, { cls: 'wide' });
    const draw = () => { const k = A.normKey(m.el.querySelector('#pbQ').value); m.el.querySelector('#pbL').innerHTML = Q.filter(q => !k || A.normKey(q.body).includes(k)).slice(0, 80).map(q => `<button class="btn ghost" style="text-align:start;justify-content:flex-start;white-space:normal" data-q="${q.id}">${esc(q.body.slice(0, 160))} <span class="small muted">· ${esc(A.subjName ? A.subjName(q.subject_id) : '')}</span></button>`).join('') || A.emptyBox('لا أسئلة', 'أضف أسئلة في بنك الأسئلة أولاً'); $$('[data-q]', m.el).forEach(b => b.onclick = () => { m.close(); cb(Q.find(q => q.id === b.dataset.q)); }); };
    m.el.querySelector('#pbQ').oninput = draw; draw();
  }

  // ---------- شاشة العرض المباشر ----------
  async function host(spec, src) {
    let poll;
    if (DEMO) poll = { id: 'lp' + Date.now(), code: genCode(), q_no: 1, state: 'open', ...spec };
    else { for (let k = 0; k < 4 && !poll; k++) { try { const r = await api.ins('live_polls', [{ school_id: S.school.id, code: genCode(), kind: spec.kind, question: spec.question, options: spec.options, correct: spec.correct }]); poll = Array.isArray(r) ? r[0] : r; if (!poll || !poll.id) { const l = await api.list('live_polls', { host: S.me.id }, { order: 'created_at', desc: true }); poll = l[0]; } } catch (e) { if (!/duplicate|unique/i.test(e.message || '')) throw e; } } }
    if (!poll) throw new Error('تعذّر إنشاء السؤال');
    let votes = [], unsub = null, poller = null, demoT = null, reveal = false;
    const o = document.createElement('div'); o.className = 'lp-ovl'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', 'السؤال اللحظي');
    document.body.appendChild(o);
    const qrSvg = () => { try { const q = window.qrcode(0, 'M'); q.addData(joinUrl(poll.code)); q.make(); return q.createSvgTag({ cellSize: 5, margin: 1, scalable: true }); } catch (_) { return ''; } };
    const optsOf = () => poll.kind === 'tf' ? ['صواب', 'خطأ'] : poll.kind === 'scale' ? ['١', '٢', '٣', '٤', '٥'] : (poll.options || []);
    function results() {
      const n = votes.length;
      if (['mcq', 'tf', 'scale'].includes(poll.kind)) { const L = optsOf(); const c = L.map((_, i) => votes.filter(v => String(v.answer) === String(poll.kind === 'scale' ? i + 1 : i)).length); const mx = Math.max(1, ...c);
        return `<div class="lp-bars">${L.map((t, i) => `<div class="lp-bar ${reveal && poll.correct != null && String(poll.correct) === String(i) ? 'ok' : ''}"><span class="l" style="background:${poll.kind === 'scale' ? '#005499' : COL[i % 6]}">${poll.kind === 'scale' ? AR(i + 1) : LET[i]}</span><div class="t"><i style="width:${Math.round(c[i] / mx * 100)}%;background:${poll.kind === 'scale' ? 'linear-gradient(90deg,#005499,#3AB1DB)' : COL[i % 6]}"></i><span>${esc(poll.kind === 'scale' ? (i === 0 ? (poll.options || [])[0] || '' : i === 4 ? (poll.options || [])[1] || '' : '') : t)}</span></div><span class="p">${AR(n ? Math.round(c[i] / n * 100) : 0)}٪<br><small style="font-weight:500;opacity:.8">${AR(c[i])}</small></span></div>`).join('')}</div>${poll.kind === 'scale' && n ? `<p style="margin-top:10px">المتوسط: <b>${AR((votes.reduce((a, v) => a + (+v.answer || 0), 0) / n).toFixed(1))}</b> من ٥</p>` : ''}`; }
      if (poll.kind === 'cloud') { const f = {}; votes.forEach(v => { const k = String(v.answer).trim(); if (k) f[k] = (f[k] || 0) + 1; }); const E = Object.entries(f).sort((a, b) => b[1] - a[1]).slice(0, 60); const mx = Math.max(1, ...E.map(e => e[1]));
        const pal = ['#FFFFFF', '#3AB1DB', '#BADF93', '#F2C14E', '#9CC4E4', '#E0675A'];
        return `<div class="lp-cloud">${E.map(([w, c], i) => `<span style="font-size:${Math.round(18 + (c / mx) * 46)}px;color:${pal[i % pal.length]}" title="${AR(c)}">${esc(w)}</span>`).join('') || '<p style="opacity:.7">بانتظار الكلمات…</p>'}</div>`; }
      if (poll.kind === 'number') { const xs = votes.map(v => parseFloat(String(v.answer).replace(',', '.'))).filter(x => isFinite(x)).sort((a, b) => a - b); if (!xs.length) return '<p style="opacity:.7">بانتظار الإجابات…</p>';
        const avg = xs.reduce((a, b) => a + b, 0) / xs.length, med = xs[Math.floor(xs.length / 2)]; const f = {}; xs.forEach(x => f[x] = (f[x] || 0) + 1); const top = Object.entries(f).sort((a, b) => b[1] - a[1]).slice(0, 8);
        return `<div class="lp-stat"><div>المتوسط<b>${AR(+avg.toFixed(2))}</b></div><div>الوسيط<b>${AR(med)}</b></div><div>الأصغر<b>${AR(xs[0])}</b></div><div>الأكبر<b>${AR(xs[xs.length - 1])}</b></div></div><div class="lp-bars" style="margin-top:12px">${top.map(([x, c]) => `<div class="lp-bar"><span class="l" style="background:#005499;font-size:13px">${AR(x)}</span><div class="t"><i style="width:${Math.round(c / top[0][1] * 100)}%;background:linear-gradient(90deg,#005499,#3AB1DB)"></i></div><span class="p">${AR(c)}</span></div>`).join('')}</div>`; }
      return `<div class="lp-list">${votes.slice().reverse().map(v => `<div>${esc(v.answer)}<small>${esc(v.name || 'طالب')}</small></div>`).join('') || '<p style="opacity:.7">بانتظار الإجابات…</p>'}</div>`;
    }
    function draw() {
      o.innerHTML = `<div class="lp-top"><img src="assets/logo_white.svg" alt="" style="height:30px"><div class="grow"><b>السؤال اللحظي</b> <span style="opacity:.75">· السؤال ${AR(poll.q_no)} · ${poll.state === 'open' ? 'مفتوح للإجابة' : 'مغلق'}</span></div>
        ${src ? '<button id="lpIns">إدراج النتائج في السبورة</button>' : ''}<button id="lpNew">سؤال جديد بنفس الرمز</button><button id="lpEnd" class="pri">إنهاء</button></div>
        <div class="lp-body"><div class="lp-main"><div class="lp-q">${esc(poll.question || (poll.kind === 'cloud' ? 'اكتب كلمة…' : 'أجيبوا على السؤال المعروض'))}</div><div id="lpR">${results()}</div>
          <div class="lp-act" style="margin-top:auto;padding-top:14px">${poll.state === 'open' ? '<button id="lpClose" class="pri">إغلاق الإجابات</button>' : '<button id="lpOpen">إعادة فتح الإجابات</button>'}${poll.correct != null ? `<button id="lpRev">${reveal ? 'إخفاء الإجابة' : 'إظهار الإجابة الصحيحة'}</button>` : ''}</div></div>
        <div class="lp-side"><div class="lp-code"><div class="qr">${qrSvg()}</div><div class="c">${esc(poll.code)}</div><div class="u">${esc(joinUrl(poll.code).replace(/^https?:\/\//, '').replace(/\?c=.*/, ''))}</div></div>
          <div class="lp-n"><span>الإجابات</span><b id="lpN">${AR(votes.length)}</b></div></div></div>`;
      o.querySelector('#lpEnd').onclick = end; o.querySelector('#lpNew').onclick = () => { setupNext(); };
      const c1 = o.querySelector('#lpClose'); if (c1) c1.onclick = () => setState('closed'); const c2 = o.querySelector('#lpOpen'); if (c2) c2.onclick = () => setState('open');
      const rv = o.querySelector('#lpRev'); if (rv) rv.onclick = () => { reveal = !reveal; if (reveal && poll.state === 'open') setState('closed'); else draw(); };
      const ins = o.querySelector('#lpIns'); if (ins) ins.onclick = insertToBoard;
      o.querySelector('#lpEnd').focus();
    }
    const refresh = () => { const r = o.querySelector('#lpR'); if (r) r.innerHTML = results(); const n = o.querySelector('#lpN'); if (n) n.textContent = AR(votes.length); };
    async function loadVotes() { if (DEMO) return; try { votes = await api.list('live_votes', { poll_id: poll.id, q_no: poll.q_no }); refresh(); } catch (_) { } }
    async function setState(s) { poll.state = s; if (!DEMO) await api.upd('live_polls', poll.id, { state: s, updated_at: new Date().toISOString() }).catch(() => { }); draw(); }
    function setupNext() {
      const prevO = document.querySelector('.lp-ovl'); prevO.style.display = 'none';
      const done = async spec => { prevO.style.display = ''; if (!spec) return draw(); Object.assign(poll, spec, { q_no: poll.q_no + 1, state: 'open' }); votes = []; reveal = false;
        if (!DEMO) await api.upd('live_polls', poll.id, { kind: spec.kind, question: spec.question, options: spec.options, correct: spec.correct, q_no: poll.q_no, state: 'open', updated_at: new Date().toISOString() }); draw(); demoFeed(); };
      nextSetup(done);
    }
    function demoFeed() { if (!DEMO) return; clearInterval(demoT); const N = ['سارة', 'ريم', 'ليان', 'جود', 'نوف', 'دانة', 'شهد', 'غلا', 'لمى', 'رهف'], W = ['التعاون', 'الصبر', 'الأمانة', 'الإتقان', 'التعاون', 'الاحترام', 'التعاون', 'الصبر'];
      let k = 0; demoT = setInterval(() => { if (poll.state !== 'open' || k > 22) return; k++; const ans = poll.kind === 'mcq' ? String(poll.correct != null && Math.random() < .6 ? poll.correct : Math.floor(Math.random() * optsOf().length)) : poll.kind === 'tf' ? (Math.random() < .7 ? '0' : '1') : poll.kind === 'scale' ? String(3 + Math.floor(Math.random() * 3)) : poll.kind === 'cloud' ? W[k % W.length] : poll.kind === 'number' ? String(10 + Math.floor(Math.random() * 6)) : 'إجابة ' + AR(k); votes.push({ answer: ans, name: N[k % N.length] }); refresh(); }, 450); }
    async function end() { clearInterval(demoT); clearInterval(poller); if (unsub) try { unsub(); } catch (_) { } if (!DEMO) await api.upd('live_polls', poll.id, { state: 'ended' }).catch(() => { }); o.remove(); document.removeEventListener('keydown', esc1); }
    const esc1 = e => { if (e.key === 'Escape' && document.body.contains(o) && !document.querySelector('.ovl')) end(); }; document.addEventListener('keydown', esc1);
    async function insertToBoard() {
      try { const r = o.querySelector('.lp-main'); if (!window.html2canvas) await new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'vendor/html2canvas.min.js'; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
        const cv = await window.html2canvas(r, { backgroundColor: '#082B5A', scale: 1.5 }); src.postMessage({ type: 'dina-wb-img', src: cv.toDataURL('image/png') }, '*'); A.toast('أُدرجت النتائج في السبورة', 'ok'); }
      catch (e) { A.toast('تعذّر الإدراج: ' + (e.message || ''), 'err'); }
    }
    draw();
    if (DEMO) demoFeed(); else { const ch = api.subscribe('lp-' + poll.id, 'live_votes', 'poll_id=eq.' + poll.id, p => { const r = p.new; if (!r || r.q_no !== poll.q_no) return; const i = votes.findIndex(v => v.device === r.device); if (i >= 0) votes[i] = r; else votes.push(r); refresh(); }); unsub = typeof ch === 'function' ? ch : null; poller = setInterval(loadVotes, 4000); loadVotes(); }
  }
  let nextSetup = cb => { // نافذة مختصرة للسؤال التالي (تعيد استخدام نافذة الإعداد)
    const orig = host; host = async spec => { host = orig; cb(spec); }; setup({}, null);
    const obs = new MutationObserver(() => { if (!document.querySelector('.ovl')) { obs.disconnect(); if (host !== orig) { host = orig; cb(null); } } }); setTimeout(() => obs.observe(document.body, { childList: true, subtree: true }), 50);
  };
  A.livePoll = (pre, src) => setup(pre || {}, src || null);
  A.livePollStart = (spec, src) => host(spec, src || null);

  // من السبورة (داخل المنصة أو نافذتها المستقلة)
  window.addEventListener('message', e => { if (e.origin !== location.origin || !e.data || !S.me) return;
    if (e.data.type === 'dina-wb-hello') { try { e.source.postMessage({ type: 'dina-wb-cfg', poll: A.tfeat('poll') && !S.realMe }, location.origin); } catch (_) { } }
    if (e.data.type === 'dina-poll' && A.tfeat('poll')) setup(e.data.pre || {}, e.source); });

  V.poll = function (root) {
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>السؤال اللحظي</h2><p class="sub" style="margin:2px 0 0">اطرح سؤالاً في أي لحظة من الحصة، فيجيب الطلاب من جوالاتهم بمسح الرمز — بلا حسابات ولا تطبيقات — وتظهر النتائج فوراً على الشاشة.</p></div><button class="btn" id="pg">${A.I.poll} سؤال جديد</button></div>
      <div class="lp-kinds" style="margin-top:10px">${KINDS.map(([k, l, d]) => `<button type="button" class="lp-k" data-k="${k}"><b>${l}</b><small>${d}</small></button>`).join('')}</div>
      <p class="small muted" style="margin-top:12px">تجده أيضاً في السبورة التفاعلية (زر «سؤال لحظي») وفي العروض التقديمية على شرائح الأسئلة. رابط الطلاب: <b dir="ltr">${esc(joinUrl('').replace(/\?c=$/, ''))}</b></p></div>`;
    root.querySelector('#pg').onclick = () => setup(); $$('[data-k]', root).forEach(b => b.onclick = () => setup({ kind: b.dataset.k }));
  };
})();
