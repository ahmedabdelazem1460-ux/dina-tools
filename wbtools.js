/* منصة دينا — الأدوات التفاعلية للسبورة (whiteboard.html)
   مؤقت، ساعة إيقاف، اختيار طالب عشوائي (عجلة)، تقسيم مجموعات، نرد وعملة، نقاط الفرق، إشارة الصف، والسؤال اللحظي.
   كل أداة بطاقة عائمة تُسحب وتُغلق، وتعمل بلا إنترنت. الأسماء من فصول المعلم (عند فتح السبورة من المنصة) أو تُكتب يدوياً. */
(function () {
  const AR = s => String(s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const LSg = k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, LSs = (k, v) => { try { localStorage.setItem(k, v); } catch (_) { } };
  const RM = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = n => { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; } catch (_) { return Math.floor(Math.random() * n); } };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const mmss = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), x = s % 60; return AR(String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0')); };
  let audio = null; const beep = (f = 880, d = .25, n = 3) => { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); for (let i = 0; i < n; i++) { const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = f; o.connect(g); g.connect(audio.destination); const t = audio.currentTime + i * (d + .12); g.gain.setValueAtTime(.25, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.start(t); o.stop(t + d); } } catch (_) { } };

  const CSS = `
.wbt-btn{background:linear-gradient(135deg,#3AB1DB,#005499)!important;box-shadow:0 0 0 2px rgba(255,255,255,.35) inset}
.wbt-pan{position:absolute;z-index:1000;inset-inline-end:10px;top:10px;width:min(440px,calc(100% - 20px));max-height:calc(100% - 20px);overflow:auto;background:#fff;border-radius:20px;box-shadow:0 24px 60px -20px rgba(8,43,90,.55);border:1px solid #C9D7EC;padding:14px}
.wbt-pan h2{margin:0 0 2px;font-size:18px;padding-inline-end:44px}.wbt-pan p{margin:0 0 10px;color:#43597A;font-size:13px}
.wbt-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
.wbt-t{font:inherit;border:1.5px solid #DCE7F3;border-radius:16px;background:linear-gradient(180deg,#fff,#F3F8FD);padding:12px 8px;cursor:pointer;display:grid;justify-items:center;gap:4px;color:#082B5A;box-shadow:0 6px 0 -2px #DCE7F3;transition:transform .12s}
.wbt-t:hover{transform:translateY(-2px);border-color:#3AB1DB}.wbt-t:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}
.wbt-t i{font-style:normal;font-size:28px;line-height:1}.wbt-t b{font-size:14px}.wbt-t small{font-size:11px;color:#5b6b7f;text-align:center}
.wbt-x{position:absolute;inset-inline-end:10px;top:10px;font:inherit;border:0;background:#EEF4FB;color:#082B5A;border-radius:50%;width:36px;height:36px;cursor:pointer;font-size:18px}
.wbw{position:absolute;z-index:15;min-width:240px;max-width:min(560px,calc(100% - 16px));background:#fff;border-radius:20px;box-shadow:0 20px 50px -18px rgba(8,43,90,.6);border:1px solid #C9D7EC;overflow:hidden;color:#082B5A}
.wbw-h{display:flex;align-items:center;gap:8px;padding:8px 10px;background:linear-gradient(135deg,#082B5A,#005499);color:#fff;cursor:move;touch-action:none;user-select:none}
.wbw-h b{flex:1;font-size:15px}.wbw-h button{font:inherit;border:0;background:rgba(255,255,255,.15);color:#fff;border-radius:10px;min-width:34px;height:34px;cursor:pointer}
.wbw-h button:focus-visible,.wbw button:focus-visible,.wbw input:focus-visible,.wbw select:focus-visible,.wbw textarea:focus-visible{outline:3px solid #3AB1DB;outline-offset:1px}
.wbw-b{padding:12px;display:grid;gap:10px}
.wbw .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.wbw .bt{font:inherit;font-weight:800;border:0;border-radius:12px;min-height:40px;padding:6px 12px;cursor:pointer;background:#EEF4FB;color:#082B5A}
.wbw .bt.p{background:#005499;color:#fff}.wbw .bt.g{background:#2E8B57;color:#fff}.wbw .bt.r{background:#C62D22;color:#fff}.wbw .bt.s{min-height:34px;padding:4px 10px;font-size:13px}
.wbw input,.wbw select,.wbw textarea{font:inherit;border:1.5px solid #C9D7EC;border-radius:10px;padding:6px 8px;color:#082B5A;background:#fff;min-height:38px}
.wbw textarea{width:100%;resize:vertical}
.wbw .big{font-size:clamp(46px,9vw,96px);font-weight:900;text-align:center;font-variant-numeric:tabular-nums;line-height:1.1;direction:ltr}
.wbw .big.end{color:#C62D22;animation:wbtP 1s infinite}
@keyframes wbtP{50%{opacity:.35}}
.wbw .bar{height:10px;border-radius:9px;background:#E4EBF5;overflow:hidden}.wbw .bar i{display:block;height:100%;background:linear-gradient(90deg,#2E8B57,#3AB1DB);transition:width .9s linear}
.wbw .pick{font-size:clamp(28px,5vw,52px);font-weight:900;text-align:center;min-height:1.4em;padding:10px;border-radius:16px;background:#F1F7FD;border:2px dashed #3AB1DB}
.wbw .pick.on{background:#BADF93;border-color:#2E8B57;border-style:solid}
.wbw .grps{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.wbw .grp{border-radius:14px;padding:8px 10px;border:1.5px solid #DCE7F3}.wbw .grp b{display:block;margin-bottom:4px}.wbw .grp div{font-size:14px;line-height:1.6}
.wbw .dice{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.wbw .die{width:84px;height:84px;border-radius:18px;background:#fff;border:3px solid #082B5A;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:10px;box-shadow:0 6px 0 #082B5A}
.wbw .die span{border-radius:50%;margin:3px}.wbw .die span.d{background:#082B5A}
.wbw .coin{width:110px;height:110px;margin:0 auto;border-radius:50%;display:grid;place-items:center;font-size:22px;font-weight:900;background:radial-gradient(circle at 35% 30%,#FFE9A8,#C9A44C);color:#5a4310;border:4px solid #a88430}
.wbw .roll{animation:wbtR .6s ease}@keyframes wbtR{0%{transform:rotate(0) scale(.8)}60%{transform:rotate(540deg) scale(1.1)}100%{transform:rotate(720deg) scale(1)}}
.wbw .teams{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}
.wbw .team{border-radius:16px;padding:10px;text-align:center;color:#fff}.wbw .team input{width:100%;text-align:center;background:rgba(255,255,255,.2);color:#fff;border-color:rgba(255,255,255,.45);font-weight:800}
.wbw .team b{display:block;font-size:44px;line-height:1.2}.wbw .team .row{justify-content:center}.wbw .team .bt{background:rgba(255,255,255,.22);color:#fff;min-width:44px}
.wbw .sig{display:grid;gap:8px}.wbw .sig button{font:inherit;font-weight:900;font-size:20px;border:0;border-radius:16px;padding:16px;cursor:pointer;color:#fff;opacity:.45}
.wbw .sig button.on{opacity:1;box-shadow:0 0 0 4px #082B5A inset}
.wbw .muted{color:#5b6b7f;font-size:12px}
@media (prefers-reduced-motion:reduce){.wbt-t,.wbw .bar i{transition:none}.wbw .roll,.wbw .big.end{animation:none}}
`;
  const TOOLS = [
    ['timer', '⏳', 'مؤقت تنازلي', 'لنشاط أو اختبار قصير'],
    ['watch', '⏱️', 'ساعة إيقاف', 'قياس زمن المهمة'],
    ['pick', '🎯', 'اختيار طالب', 'عجلة أسماء عشوائية'],
    ['groups', '👥', 'تقسيم مجموعات', 'عشوائياً بالعدد'],
    ['dice', '🎲', 'نرد وعملة', 'للألعاب والأدوار'],
    ['score', '🏆', 'نقاط الفرق', 'منافسة بين الفرق'],
    ['signal', '🚦', 'إشارة الصف', 'هدوء · عمل · نقاش'],
    ['poll', '📊', 'سؤال لحظي', 'يجيب الطلاب من جوالاتهم'],
  ];

  window.WBT = function (o) { // o: { wrap, btn, insertText(v), cfg(): {poll, names}, askNames(cb), poll() }
    if (!document.getElementById('wbtcss')) { const s = document.createElement('style'); s.id = 'wbtcss'; s.textContent = CSS; document.head.appendChild(s); }
    const wrap = o.wrap; let pan = null, z = 15;
    const close = () => { if (pan) { pan.remove(); pan = null; o.btn.setAttribute('aria-expanded', 'false'); o.btn.focus(); } };
    function panel() { if (pan) return close();
      const cfg = o.cfg() || {}; pan = document.createElement('div'); pan.className = 'wbt-pan'; pan.setAttribute('role', 'dialog'); pan.setAttribute('aria-label', 'الأدوات التفاعلية');
      pan.innerHTML = `<button class="wbt-x" aria-label="إغلاق">×</button><h2>الأدوات التفاعلية</h2><p>اختر أداة لتظهر فوق السبورة — اسحبها من شريطها، وأغلقها متى شئت.</p>
        <div class="wbt-g">${TOOLS.filter(t => t[0] !== 'poll' || cfg.poll).map(([k, i, n, d]) => `<button class="wbt-t" data-w="${k}"><i aria-hidden="true">${i}</i><b>${n}</b><small>${d}</small></button>`).join('')}</div>`;
      wrap.appendChild(pan); o.btn.setAttribute('aria-expanded', 'true');
      pan.querySelector('.wbt-x').onclick = close; pan.onclick = e => { const b = e.target.closest('[data-w]'); if (!b) return; const k = b.dataset.w; close(); if (k === 'poll') o.poll(); else open(k); };
      pan.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }); pan.querySelector('[data-w]').focus(); }
    o.btn.onclick = panel; o.btn.setAttribute('aria-haspopup', 'dialog'); o.btn.setAttribute('aria-expanded', 'false');

    // أول مكان فارغ (من اليمين) لا يغطي البطاقات المفتوحة، وإلا تتابع مائل
    function place(c, n) { requestAnimationFrame(() => { const W = wrap.clientWidth, H = wrap.clientHeight, w = c.offsetWidth, h = Math.min(c.offsetHeight, H - 16);
      const R = [...wrap.querySelectorAll('.wbw')].filter(x => x !== c).map(x => ({ l: x.offsetLeft, t: x.offsetTop, r: x.offsetLeft + x.offsetWidth, b: x.offsetTop + x.offsetHeight }));
      let pos = null; for (let y = 8; y + h <= H - 8 && !pos; y += 16) for (let x = W - w - 8; x >= 8; x -= 16) if (!R.some(q => x < q.r + 6 && x + w + 6 > q.l && y < q.b + 6 && y + h + 6 > q.t)) { pos = [x, y]; break; }
      if (!pos) pos = [Math.max(8, W - w - 24 - n * 24), 12 + n * 24]; c.style.left = pos[0] + 'px'; c.style.top = Math.min(pos[1], Math.max(0, H - 60)) + 'px'; c.style.visibility = ''; }); }
    // بطاقة عائمة قابلة للسحب
    function card(k, title, w) { const ex = wrap.querySelector(`.wbw[data-k="${k}"]`); if (ex) { ex.style.zIndex = ++z; ex.querySelector('.wbw-h button').focus(); return null; }
      const n = wrap.querySelectorAll('.wbw').length, c = document.createElement('section'); c.className = 'wbw'; c.dataset.k = k; c.setAttribute('aria-label', title); c.style.width = Math.min(w || 340, wrap.clientWidth - 16) + 'px';
      c.style.zIndex = ++z; c.style.visibility = 'hidden';
      c.innerHTML = `<div class="wbw-h"><b>${title}</b><button class="mn" aria-label="تصغير" title="تصغير">–</button><button class="cx" aria-label="إغلاق ${title}">×</button></div><div class="wbw-b"></div>`; wrap.appendChild(c);
      place(c, n); const h = c.querySelector('.wbw-h'); let d = null;
      h.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; d = { x: e.clientX - c.offsetLeft, y: e.clientY - c.offsetTop }; h.setPointerCapture(e.pointerId); c.style.zIndex = ++z; });
      h.addEventListener('pointermove', e => { if (!d) return; c.style.left = Math.max(0, Math.min(wrap.clientWidth - 60, e.clientX - d.x)) + 'px'; c.style.top = Math.max(0, Math.min(wrap.clientHeight - 40, e.clientY - d.y)) + 'px'; });
      h.addEventListener('pointerup', () => d = null); c.addEventListener('pointerdown', () => c.style.zIndex = ++z);
      c.querySelector('.mn').onclick = () => { const b = c.querySelector('.wbw-b'); b.hidden = !b.hidden; };
      c.querySelector('.cx').onclick = () => { if (c._stop) c._stop(); c.remove(); o.btn.focus(); };
      c.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.target.matches('input,textarea')) c.querySelector('.cx').click(); });
      setTimeout(() => { const f = c.querySelector('.wbw-b button'); if (f) f.focus(); }, 30);
      return c.querySelector('.wbw-b'); }

    // ---------- الأسماء ----------
    const getNames = () => (LSg('dina_wbt_names') || '').split(/\r?\n|،|,/).map(s => s.trim()).filter(Boolean);
    function namesEditor(B, onChange) {
      const cfg = o.cfg() || {}, cls = cfg.classes || [];
      B.insertAdjacentHTML('beforeend', `<details class="nm"><summary class="muted" style="cursor:pointer">الأسماء (${AR(getNames().length)}) — تعديل</summary>
        ${cls.length ? `<div class="row" style="margin-top:6px"><select aria-label="فصل" class="cl"><option value="">— من فصولي —</option>${cls.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div>` : ''}
        <div class="row" style="margin-top:6px"><label class="muted">أو أرقام من ١ إلى <input type="number" min="2" max="60" class="nn" style="width:70px" aria-label="عدد الطلاب"></label><button class="bt s nb">إنشاء</button></div>
        <textarea rows="5" class="nt" aria-label="اسم في كل سطر" placeholder="اسم في كل سطر" style="margin-top:6px">${esc(getNames().join('\n'))}</textarea></details>`);
      const ta = B.querySelector('.nt'), set = v => { ta.value = v.join('\n'); LSs('dina_wbt_names', ta.value); B.querySelector('.nm summary').textContent = `الأسماء (${AR(v.length)}) — تعديل`; onChange(); };
      ta.oninput = () => { LSs('dina_wbt_names', ta.value); B.querySelector('.nm summary').textContent = `الأسماء (${AR(getNames().length)}) — تعديل`; onChange(); };
      B.querySelector('.nb').onclick = () => { const n = Math.min(60, Math.max(2, +B.querySelector('.nn').value || 0)); if (n >= 2) set(Array.from({ length: n }, (_, i) => 'طالب ' + AR(i + 1))); };
      const sel = B.querySelector('.cl'); if (sel) sel.onchange = () => { if (!sel.value) return; ta.value = 'جارٍ التحميل…'; o.askNames(sel.value, L => set((L || []).map(x => x.split(' ').slice(0, 3).join(' ')))); };
      if (!getNames().length) B.querySelector('.nm').open = true;
    }

    // ---------- الأدوات ----------
    function open(k) {
      if (k === 'timer') { const B = card(k, '⏳ مؤقت تنازلي', 340); if (!B) return; let total = 300, left = 300, t = null, end = 0;
        B.innerHTML = `<div class="big" aria-live="off">${mmss(left)}</div><div class="bar" aria-hidden="true"><i style="width:100%"></i></div>
          <div class="row" role="group" aria-label="مدة جاهزة">${[1, 2, 3, 5, 10, 15].map(m => `<button class="bt s" data-m="${m}">${AR(m)} د</button>`).join('')}<input type="number" min="1" max="180" aria-label="دقائق" placeholder="دقائق" class="cm" style="width:84px"></div>
          <div class="row"><button class="bt p go">▶ ابدأ</button><button class="bt rs">↺ إعادة</button><button class="bt s ad">+١ د</button></div><div class="muted st" role="status" aria-live="polite"></div>`;
        const big = B.querySelector('.big'), bar = B.querySelector('.bar i'), go = B.querySelector('.go'), st = B.querySelector('.st');
        const paint = () => { big.textContent = mmss(left); bar.style.width = (total ? left / total * 100 : 0) + '%'; big.classList.toggle('end', left <= 0); };
        const stop = () => { clearInterval(t); t = null; go.textContent = '▶ ابدأ'; };
        const tick = () => { left = Math.max(0, Math.round((end - Date.now()) / 1000)); paint(); if (left <= 0) { stop(); beep(); st.textContent = 'انتهى الوقت!'; } else if (left === 10) beep(660, .12, 1); };
        const setM = m => { stop(); total = left = Math.round(m * 60); st.textContent = ''; paint(); };
        B.querySelectorAll('[data-m]').forEach(b => b.onclick = () => setM(+b.dataset.m));
        B.querySelector('.cm').onchange = e => { const v = +e.target.value; if (v > 0) setM(v); };
        go.onclick = () => { if (t) { stop(); st.textContent = 'متوقف مؤقتاً'; return; } if (left <= 0) left = total; end = Date.now() + left * 1000; t = setInterval(tick, 250); go.textContent = '⏸ إيقاف'; st.textContent = 'يعمل…'; };
        B.querySelector('.rs').onclick = () => { stop(); left = total; st.textContent = ''; paint(); };
        B.querySelector('.ad').onclick = () => { left += 60; total = Math.max(total, left); if (t) end += 60000; paint(); };
        B.parentNode._stop = stop; paint(); }

      if (k === 'watch') { const B = card(k, '⏱️ ساعة إيقاف', 320); if (!B) return; let acc = 0, s0 = 0, t = null, laps = [];
        B.innerHTML = `<div class="big">${mmss(0)}<small class="ms" style="font-size:.45em">.${AR(0)}</small></div><div class="row"><button class="bt p go">▶ ابدأ</button><button class="bt lp">علامة</button><button class="bt rs">↺ تصفير</button></div><ol class="lps muted" style="margin:0;padding-inline-start:20px;max-height:120px;overflow:auto"></ol>`;
        const now = () => acc + (t ? Date.now() - s0 : 0), paint = () => { const v = now(); B.querySelector('.big').innerHTML = mmss(v / 1000 - .499) + `<small style="font-size:.45em">.${AR(Math.floor(v / 100) % 10)}</small>`; };
        const go = B.querySelector('.go'), stop = () => { if (t) { acc = now(); clearInterval(t); t = null; } go.textContent = '▶ استئناف'; };
        go.onclick = () => { if (t) return stop(); s0 = Date.now(); t = setInterval(paint, 100); go.textContent = '⏸ إيقاف'; };
        B.querySelector('.lp').onclick = () => { laps.push(now()); B.querySelector('.lps').innerHTML = laps.map(l => `<li>${mmss(l / 1000 - .499)}</li>`).join(''); };
        B.querySelector('.rs').onclick = () => { if (t) { clearInterval(t); t = null; } acc = 0; laps = []; B.querySelector('.lps').innerHTML = ''; go.textContent = '▶ ابدأ'; paint(); };
        B.parentNode._stop = () => clearInterval(t); }

      if (k === 'pick') { const B = card(k, '🎯 اختيار طالب عشوائي', 360); if (!B) return; let used = [];
        B.innerHTML = `<div class="pick" aria-live="polite">؟</div><div class="row"><button class="bt p go">🎲 اختر</button><label class="muted"><input type="checkbox" class="nr" checked> بلا تكرار</label><button class="bt s ins">إدراج في السبورة</button></div><div class="muted left"></div>`;
        const pk = B.querySelector('.pick'), left = () => { const N = getNames(); B.querySelector('.left').textContent = N.length ? `المتبقي ${AR(N.filter(x => !used.includes(x)).length)} من ${AR(N.length)}${used.length ? ' · اختير: ' + used.slice(-5).join('، ') : ''}` : 'أضف الأسماء أولاً'; };
        namesEditor(B, () => { used = []; left(); });
        B.querySelector('.go').onclick = () => { const N = getNames(); if (!N.length) { B.querySelector('.nm').open = true; return; } let pool = B.querySelector('.nr').checked ? N.filter(x => !used.includes(x)) : N; if (!pool.length) { used = []; pool = N; }
          const win = pool[rnd(pool.length)]; pk.classList.remove('on'); const steps = RM() ? 1 : 18; let i = 0;
          const spin = () => { if (i < steps - 1) { pk.textContent = N[rnd(N.length)]; i++; setTimeout(spin, 30 + i * 6); } else { pk.textContent = win; pk.classList.add('on'); used.push(win); beep(990, .15, 1); left(); } }; spin(); };
        B.querySelector('.ins').onclick = () => { const v = pk.textContent; if (v && v !== '؟') o.insertText('🎯 ' + v); };
        left(); }

      if (k === 'groups') { const B = card(k, '👥 تقسيم مجموعات', 460); if (!B) return; let G = [];
        B.innerHTML = `<div class="row"><label>عدد <select class="md" aria-label="طريقة التقسيم"><option value="g">المجموعات</option><option value="s">الطلاب في كل مجموعة</option></select></label><input type="number" min="2" max="20" value="4" class="gn" style="width:70px" aria-label="العدد"><button class="bt p go">قسّم</button><button class="bt s ins">إدراج في السبورة</button></div><div class="grps" aria-live="polite"></div>`;
        namesEditor(B, () => { });
        const COL = ['#E0675A', '#005499', '#2E8B57', '#C9A44C', '#AE95DA', '#3AB1DB', '#082B5A', '#D2691E'];
        B.querySelector('.go').onclick = () => { const N = shuffle(getNames()); if (N.length < 2) { B.querySelector('.nm').open = true; return; } const v = Math.max(1, +B.querySelector('.gn').value || 2); const g = B.querySelector('.md').value === 'g' ? Math.min(v, N.length) : Math.max(1, Math.ceil(N.length / v));
          G = Array.from({ length: g }, () => []); N.forEach((x, i) => G[i % g].push(x));
          B.querySelector('.grps').innerHTML = G.map((x, i) => `<div class="grp" style="border-color:${COL[i % 8]}"><b style="color:${COL[i % 8]}">المجموعة ${AR(i + 1)}</b><div>${x.map(esc).join('<br>')}</div></div>`).join(''); };
        B.querySelector('.ins').onclick = () => { if (G.length) o.insertText(G.map((x, i) => `المجموعة ${AR(i + 1)}: ${x.join('، ')}`).join('\n')); }; }

      if (k === 'dice') { const B = card(k, '🎲 نرد وعملة', 340); if (!B) return;
        const P = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }, die = n => `<div class="die" role="img" aria-label="النرد ${AR(n)}">${Array.from({ length: 9 }, (_, i) => `<span class="${P[n].includes(i) ? 'd' : ''}"></span>`).join('')}</div>`;
        B.innerHTML = `<div class="row"><label class="muted">عدد النرد <select class="dn"><option>1</option><option selected>2</option><option>3</option></select></label><button class="bt p rl">🎲 ارمِ النرد</button><button class="bt cn">🪙 ارمِ العملة</button></div><div class="dice" aria-live="polite">${die(1)}${die(6)}</div><div class="muted sum" style="text-align:center"></div>`;
        const box = B.querySelector('.dice'), sum = B.querySelector('.sum');
        B.querySelector('.rl').onclick = () => { const v = Array.from({ length: +B.querySelector('.dn').value }, () => 1 + rnd(6)); box.innerHTML = v.map(die).join(''); if (!RM()) box.querySelectorAll('.die').forEach(d => d.classList.add('roll')); sum.textContent = v.length > 1 ? 'المجموع: ' + AR(v.reduce((a, b) => a + b, 0)) : ''; };
        B.querySelector('.cn').onclick = () => { const h = rnd(2); box.innerHTML = `<div class="coin ${RM() ? '' : 'roll'}" role="img" aria-label="${h ? 'كتابة' : 'صورة'}">${h ? 'كتابة' : 'صورة'}</div>`; sum.textContent = ''; }; }

      if (k === 'score') { const B = card(k, '🏆 نقاط الفرق', 480); if (!B) return; const COL = ['#E0675A', '#005499', '#2E8B57', '#C9A44C', '#AE95DA', '#3AB1DB'];
        let T = []; try { T = JSON.parse(LSg('dina_wbt_score') || '[]'); } catch (_) { } if (!T.length) T = [{ n: 'الفريق الأول', s: 0 }, { n: 'الفريق الثاني', s: 0 }];
        const save = () => LSs('dina_wbt_score', JSON.stringify(T));
        const draw = () => { const mx = Math.max(...T.map(t => t.s)); B.innerHTML = `<div class="teams">${T.map((t, i) => `<div class="team" style="background:${COL[i % 6]}"><input value="${esc(t.n)}" data-n="${i}" aria-label="اسم الفريق ${AR(i + 1)}"><b aria-live="polite">${AR(t.s)}${mx > 0 && t.s === mx ? ' 👑' : ''}</b><div class="row"><button class="bt" data-d="${i}|-1" aria-label="ناقص نقطة">−</button><button class="bt" data-d="${i}|1" aria-label="زائد نقطة">+</button><button class="bt" data-d="${i}|5" aria-label="زائد خمس نقاط">+٥</button></div></div>`).join('')}</div>
          <div class="row"><button class="bt s ad" ${T.length >= 6 ? 'disabled' : ''}>+ فريق</button><button class="bt s rm" ${T.length <= 2 ? 'disabled' : ''}>− فريق</button><button class="bt s z">تصفير النقاط</button><button class="bt s ins">إدراج في السبورة</button></div>`;
          B.querySelectorAll('[data-n]').forEach(x => x.oninput = () => { T[+x.dataset.n].n = x.value; save(); });
          B.querySelectorAll('[data-d]').forEach(x => x.onclick = () => { const [i, d] = x.dataset.d.split('|').map(Number); T[i].s = Math.max(0, T[i].s + d); save(); if (d > 0) beep(d > 1 ? 1170 : 990, .1, 1); draw(); B.querySelector(`[data-d="${x.dataset.d}"]`).focus(); });
          B.querySelector('.ad').onclick = () => { T.push({ n: 'الفريق ' + AR(T.length + 1), s: 0 }); save(); draw(); }; B.querySelector('.rm').onclick = () => { T.pop(); save(); draw(); };
          B.querySelector('.z').onclick = () => { T.forEach(t => t.s = 0); save(); draw(); };
          B.querySelector('.ins').onclick = () => o.insertText('🏆 ' + T.map(t => `${t.n}: ${AR(t.s)}`).join('  ·  ')); };
        draw(); }

      if (k === 'signal') { const B = card(k, '🚦 إشارة الصف', 300); if (!B) return; const S = [['#C62D22', '🤫 هدوء تام'], ['#C9A44C', '🗣️ همس — عمل ثنائي'], ['#2E8B57', '💬 نقاش جماعي']];
        B.innerHTML = `<div class="sig" role="radiogroup" aria-label="مستوى الصوت المسموح">${S.map(([c, t], i) => `<button role="radio" aria-checked="false" data-s="${i}" style="background:${c}">${t}</button>`).join('')}</div>`;
        B.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { B.querySelectorAll('[data-s]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); B.parentNode.querySelector('.wbw-h').style.background = S[+b.dataset.s][0]; }); }
    }
    return { open, panel };
  };
})();
