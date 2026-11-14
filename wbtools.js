/* منصة دينا — الأدوات التفاعلية للسبورة (whiteboard.html)
   «فصل الحصة» واحد تختاره مرة (من فصولك في المنصة، أو أسماء تكتبها، أو أرقام) وتستخدمه كل الأدوات:
   عجلة الأسماء، بطاقة الاسم، نجوم الطلاب، ترتيب الأدوار، تقسيم المجموعات — ومعها: مؤقت، ساعة إيقاف، نرد وعملة،
   نقاط الفرق، إشارة الصف، مقياس الضجيج، والسؤال اللحظي. كل أداة بطاقة عائمة تُسحب وتُكبَّر وتُغلق، وتعمل بلا إنترنت. */
(function () {
  const AR = s => String(s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const LSg = k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, LSs = (k, v) => { try { localStorage.setItem(k, v); } catch (_) { } };
  const LJ = (k, d) => { try { const v = JSON.parse(LSg(k) || 'null'); return v == null ? d : v; } catch (_) { return d; } };
  const RM = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rnd = n => { try { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; } catch (_) { return Math.floor(Math.random() * n); } };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const mmss = s => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60), x = s % 60; return AR(String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0')); };
  const short = n => String(n).trim().split(/\s+/).slice(0, 2).join(' ');
  let audio = null, muted = LSg('dina_wbt_mute') === '1';
  const ac = () => { try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === 'suspended') audio.resume(); return audio; } catch (_) { return null; } };
  const tone = (f, d, t0 = 0, type = 'sine', vol = .22) => { if (muted) return; const a = ac(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + t0; o.type = type; o.frequency.setValueAtTime(f, t); o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.start(t); o.stop(t + d + .02); };
  const beep = (f = 880, d = .25, n = 3) => { for (let i = 0; i < n; i++) tone(f, d, i * (d + .12)); };
  const tick = () => tone(1400, .03, 0, 'square', .06);
  const fanfare = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, i * .11, 'triangle', .2));
  const PAL = ['#005499', '#3AB1DB', '#2E8B57', '#C9A44C', '#E0675A', '#7E5BD6', '#082B5A', '#1E9E8F', '#D2691E', '#C2185B'];

  const CSS = `
.wbt-btn{background:linear-gradient(135deg,#3AB1DB,#005499)!important;box-shadow:0 0 0 2px rgba(255,255,255,.35) inset,0 6px 14px -6px rgba(58,177,219,.9)}
.wbt-pan{position:absolute;z-index:1000;inset-inline-end:10px;top:10px;width:min(560px,calc(100% - 20px));max-height:calc(100% - 20px);overflow:auto;background:linear-gradient(180deg,#fff,#F4F8FD);border-radius:24px;box-shadow:0 30px 70px -24px rgba(8,43,90,.6),0 0 0 1px #C9D7EC;padding:16px}
.wbt-pan h2{margin:0;font-size:19px;padding-inline-end:44px;color:#082B5A}.wbt-pan p.sub{margin:2px 0 10px;color:#43597A;font-size:13px}
.wbt-x{position:absolute;inset-inline-end:12px;top:12px;font:inherit;border:0;background:#EEF4FB;color:#082B5A;border-radius:50%;width:38px;height:38px;cursor:pointer;font-size:18px}
.wbt-ros{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:16px;background:linear-gradient(135deg,#082B5A,#005499);color:#fff;margin-bottom:12px;box-shadow:0 10px 20px -12px rgba(8,43,90,.8)}
.wbt-ros .av{width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,.15);display:grid;place-items:center;font-size:22px}
.wbt-ros b{display:block;font-size:15px}.wbt-ros small{opacity:.8;font-size:12px}.wbt-ros .grow{flex:1;min-width:0}
.wbt-ros button{font:inherit;font-weight:800;border:0;border-radius:12px;padding:8px 12px;background:#fff;color:#082B5A;cursor:pointer}
.wbt-sec{font-size:12px;font-weight:800;color:#5b6b7f;margin:10px 2px 6px}
.wbt-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:10px}
.wbt-t{--c:#005499;position:relative;font:inherit;border:0;border-radius:18px;background:#fff;padding:12px 8px 10px;cursor:pointer;display:grid;justify-items:center;gap:6px;color:#082B5A;box-shadow:0 1px 0 #fff inset,0 0 0 1.5px #DCE7F3,0 8px 0 -3px #DCE7F3,0 14px 22px -16px rgba(8,43,90,.5);transition:transform .15s,box-shadow .15s}
.wbt-t:hover{transform:translateY(-3px);box-shadow:0 0 0 2px var(--c),0 10px 0 -3px #DCE7F3,0 18px 26px -16px rgba(8,43,90,.55)}.wbt-t:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}
.wbt-t i{font-style:normal;width:52px;height:52px;border-radius:16px;display:grid;place-items:center;font-size:28px;background:linear-gradient(145deg,color-mix(in srgb,var(--c) 22%,#fff),color-mix(in srgb,var(--c) 45%,#fff));box-shadow:0 6px 12px -6px var(--c),0 -3px 0 rgba(0,0,0,.08) inset}
.wbt-t b{font-size:14px}.wbt-t small{font-size:11px;color:#5b6b7f;text-align:center;line-height:1.4}
.wbt-t .nm{position:absolute;inset-block-start:6px;inset-inline-start:6px;font-size:10px;font-weight:800;color:#fff;background:#2E8B57;border-radius:8px;padding:1px 6px}
.wbw{--c:#005499;position:absolute;z-index:15;min-width:240px;max-width:min(640px,calc(100% - 16px));background:#fff;border-radius:22px;box-shadow:0 26px 60px -22px rgba(8,43,90,.65),0 0 0 1px #C9D7EC;overflow:hidden;color:#082B5A;display:flex;flex-direction:column}
.wbw.max{inset:8px!important;width:auto!important;max-width:none;max-height:none!important;left:8px!important;top:8px!important}
.wbw-h{display:flex;align-items:center;gap:6px;padding:8px 10px;background:linear-gradient(135deg,var(--c),color-mix(in srgb,var(--c) 60%,#082B5A));color:#fff;cursor:move;touch-action:none;user-select:none}
.wbw-h b{flex:1;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wbw-h button{font:inherit;border:0;background:rgba(255,255,255,.18);color:#fff;border-radius:10px;min-width:34px;height:34px;cursor:pointer}
.wbw-h button:focus-visible,.wbw button:focus-visible,.wbw input:focus-visible,.wbw select:focus-visible,.wbw textarea:focus-visible{outline:3px solid #3AB1DB;outline-offset:1px}
.wbw-b{padding:12px;display:grid;gap:10px;overflow:auto;flex:1;align-content:start}
.wbw .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.wbw .cen{justify-content:center}
.wbw .bt{font:inherit;font-weight:800;border:0;border-radius:12px;min-height:40px;padding:6px 12px;cursor:pointer;background:#EEF4FB;color:#082B5A;box-shadow:0 3px 0 #D3E0EF}
.wbw .bt:active{transform:translateY(2px);box-shadow:none}
.wbw .bt.p{background:linear-gradient(180deg,#1B6FB8,#005499);color:#fff;box-shadow:0 4px 0 #003C70}.wbw .bt.g{background:linear-gradient(180deg,#3AA36B,#2E8B57);color:#fff;box-shadow:0 4px 0 #1F6440}.wbw .bt.s{min-height:34px;padding:4px 10px;font-size:13px}
.wbw .bt.big{font-size:20px;min-height:54px;padding:8px 26px;border-radius:16px}
.wbw input,.wbw select,.wbw textarea{font:inherit;border:1.5px solid #C9D7EC;border-radius:10px;padding:6px 8px;color:#082B5A;background:#fff;min-height:38px}
.wbw textarea{width:100%;resize:vertical}
.wbw .rb{display:flex;align-items:center;gap:8px;background:#F1F7FD;border:1px solid #DCE7F3;border-radius:12px;padding:6px 10px;font-size:13px}.wbw .rb b{flex:1}.wbw .rb button{font:inherit;font-size:12px;font-weight:800;border:0;background:#fff;border-radius:9px;padding:4px 10px;color:#005499;cursor:pointer;box-shadow:0 0 0 1px #C9D7EC}
.wbw .big{font-size:clamp(46px,9vw,96px);font-weight:900;text-align:center;font-variant-numeric:tabular-nums;line-height:1.1;direction:ltr}
.wbw.max .big{font-size:clamp(80px,18vw,240px)}
.wbw .big.end{color:#C62D22;animation:wbtP 1s infinite}@keyframes wbtP{50%{opacity:.35}}
.wbw .bar{height:12px;border-radius:9px;background:#E4EBF5;overflow:hidden}.wbw .bar i{display:block;height:100%;background:linear-gradient(90deg,#2E8B57,#3AB1DB);transition:width .9s linear}
.wbw .muted{color:#5b6b7f;font-size:12px}
.wh-st{position:relative;display:grid;place-items:center;margin:0 auto;width:100%;max-width:440px;aspect-ratio:1}
.wbw.max .wh-st{max-width:min(calc(100vh - 230px),760px)}
.wh-st canvas{width:100%;height:100%;filter:drop-shadow(0 18px 24px rgba(8,43,90,.35))}
.wh-pin{position:absolute;top:-4px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-top:38px solid #C62D22;filter:drop-shadow(0 4px 4px rgba(0,0,0,.35));z-index:2}
.wh-pin.hit{animation:whPin .12s}@keyframes whPin{50%{transform:translateX(-50%) rotate(-14deg)}}
.wh-go{position:absolute;width:24%;aspect-ratio:1;border-radius:50%;border:0;cursor:pointer;font:inherit;font-weight:900;font-size:clamp(14px,2.4vw,22px);color:#082B5A;background:radial-gradient(circle at 35% 30%,#fff,#E4EBF5);box-shadow:0 0 0 6px #fff,0 0 0 10px #082B5A,0 10px 20px rgba(0,0,0,.35);z-index:1}
.wh-go:disabled{cursor:default}
.wh-win{position:absolute;inset:0;display:grid;place-items:center;background:rgba(8,27,58,.55);backdrop-filter:blur(3px);z-index:5;border-radius:18px}
.wh-win>div{background:#fff;border-radius:24px;padding:18px 22px;text-align:center;box-shadow:0 24px 50px -16px rgba(0,0,0,.6);max-width:90%;animation:whPop .45s cubic-bezier(.2,1.6,.4,1)}
.wh-win .n{font-size:clamp(28px,6vw,64px);font-weight:900;color:#082B5A;line-height:1.2;margin:6px 0 12px}
@keyframes whPop{from{transform:scale(.4);opacity:0}}
.wbt-conf{position:absolute;inset:0;pointer-events:none;z-index:6}
.fc{position:relative;perspective:1000px;height:170px}.wbw.max .fc{height:46vh}
.fc>div{position:relative;width:100%;height:100%;transition:transform .7s cubic-bezier(.3,1.4,.5,1);transform-style:preserve-3d}
.fc.on>div{transform:rotateY(180deg)}
.fc .f,.fc .bk{position:absolute;inset:0;backface-visibility:hidden;border-radius:20px;display:grid;place-items:center;font-weight:900;text-align:center;padding:10px}
.fc .f{background:repeating-linear-gradient(45deg,#005499 0 14px,#0A62AD 14px 28px);color:#fff;font-size:64px;box-shadow:0 10px 0 #003C70}
.fc .bk{background:linear-gradient(135deg,#BADF93,#fff);color:#082B5A;font-size:clamp(28px,6vw,72px);transform:rotateY(180deg);box-shadow:0 10px 0 #2E8B57}
.st-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
.st-c{position:relative;border:0;font:inherit;border-radius:16px;padding:10px 8px 8px;background:#fff;box-shadow:0 0 0 1.5px #DCE7F3,0 6px 0 -2px #DCE7F3;cursor:pointer;text-align:center;color:#082B5A}
.st-c:hover{box-shadow:0 0 0 2px #C9A44C,0 6px 0 -2px #DCE7F3}
.st-c .av{width:42px;height:42px;border-radius:50%;margin:0 auto 4px;display:grid;place-items:center;color:#fff;font-weight:900;font-size:18px}
.st-c b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.st-c .s{font-size:15px;font-weight:900;color:#8A6416}.st-c .m{position:absolute;top:4px;inset-inline-start:4px;background:#F1F4F8;border-radius:8px;width:26px;height:26px;display:grid;place-items:center;cursor:pointer;font-weight:900;color:#5b6b7f}
.st-c.top{box-shadow:0 0 0 2.5px #C9A44C,0 6px 0 -2px #E9D49A}
.st-pop{position:absolute;left:50%;top:30%;font-size:26px;pointer-events:none;animation:stUp .8s ease-out forwards}@keyframes stUp{to{transform:translateY(-46px) scale(1.4);opacity:0}}
.to-l{list-style:none;margin:0;padding:0;display:grid;gap:6px;max-height:300px;overflow:auto}.wbw.max .to-l{max-height:none}
.to-l li{display:flex;gap:10px;align-items:center;padding:8px 10px;border-radius:12px;background:#F6F9FD;border:1px solid #E3ECF6;font-weight:700}
.to-l li i{font-style:normal;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#DCE7F3;font-weight:900;flex:none}
.to-l li.cur{background:linear-gradient(90deg,#BADF93,#fff);border-color:#2E8B57;font-size:1.15em}.to-l li.cur i{background:#2E8B57;color:#fff}.to-l li.done{opacity:.55;text-decoration:line-through}
.wbw .grps{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(150px,1fr))}
.wbw .grp{border-radius:16px;padding:8px 10px;border:2px solid #DCE7F3;background:#fff}.wbw .grp b{display:block;margin-bottom:4px}.wbw .grp div{font-size:14px;line-height:1.7}
.wbw .dice{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
.wbw .die{width:84px;height:84px;border-radius:18px;background:#fff;border:3px solid #082B5A;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);padding:10px;box-shadow:0 6px 0 #082B5A}
.wbw .die span{border-radius:50%;margin:3px}.wbw .die span.d{background:#082B5A}
.wbw .coin{width:110px;height:110px;margin:0 auto;border-radius:50%;display:grid;place-items:center;font-size:22px;font-weight:900;background:radial-gradient(circle at 35% 30%,#FFE9A8,#C9A44C);color:#5a4310;border:4px solid #a88430}
.wbw .roll{animation:wbtR .6s ease}@keyframes wbtR{0%{transform:rotate(0) scale(.8)}60%{transform:rotate(540deg) scale(1.1)}100%{transform:rotate(720deg) scale(1)}}
.wbw .teams{display:grid;gap:8px;grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}
.wbw .team{border-radius:18px;padding:10px;text-align:center;color:#fff;box-shadow:0 6px 0 rgba(0,0,0,.18)}.wbw .team input{width:100%;text-align:center;background:rgba(255,255,255,.2);color:#fff;border-color:rgba(255,255,255,.45);font-weight:800}
.wbw .team b{display:block;font-size:44px;line-height:1.2}.wbw .team .row{justify-content:center}.wbw .team .bt{background:rgba(255,255,255,.22);color:#fff;min-width:44px;box-shadow:none}
.wbw .sig{display:grid;gap:8px}.wbw .sig button{font:inherit;font-weight:900;font-size:20px;border:0;border-radius:16px;padding:16px;cursor:pointer;color:#fff;opacity:.45}
.wbw .sig button.on{opacity:1;box-shadow:0 0 0 4px #082B5A inset}
.nz-g{position:relative;height:150px;border-radius:18px;background:linear-gradient(180deg,#F4F8FD,#E4EBF5);overflow:hidden;display:grid;place-items:center}
.nz-g i{position:absolute;inset-inline:0;bottom:0;height:0;transition:height .15s,background .3s}.nz-g .th{position:absolute;inset-inline:0;border-top:3px dashed #C62D22}
.nz-g b{position:relative;font-size:58px;line-height:1}.wbw.max .nz-g{height:55vh}.wbw.max .nz-g b{font-size:140px}
.wbw.shake{animation:nzS .4s}@keyframes nzS{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
@media (prefers-reduced-motion:reduce){.wbt-t,.wbw .bar i,.fc>div{transition:none}.wbw .roll,.wbw .big.end,.wh-win>div,.wh-pin.hit,.st-pop,.wbw.shake{animation:none}}
`;
  // [مفتاح، رمز، الاسم، الوصف، اللون، يعتمد على الأسماء]
  const TOOLS = [
    ['wheel', '🎡', 'عجلة الأسماء', 'تدور وتختار طالباً', '#C62D22', 1],
    ['flip', '🃏', 'بطاقة الاسم', 'اسم مفاجئ بقلب البطاقة', '#2E8B57', 1],
    ['stars', '⭐', 'نجوم الطلاب', 'تعزيز ونقاط لكل طالب', '#C9A44C', 1],
    ['order', '🔢', 'ترتيب الأدوار', 'دور كل طالب بالقرعة', '#7E5BD6', 1],
    ['groups', '👥', 'تقسيم مجموعات', 'عشوائياً بالعدد', '#1E9E8F', 1],
    ['timer', '⏳', 'مؤقت تنازلي', 'لنشاط أو اختبار قصير', '#005499'],
    ['watch', '⏱️', 'ساعة إيقاف', 'قياس زمن المهمة', '#3AB1DB'],
    ['noise', '🔊', 'مقياس الضجيج', 'مستوى صوت الصف', '#E0675A'],
    ['signal', '🚦', 'إشارة الصف', 'هدوء · همس · نقاش', '#2E8B57'],
    ['score', '🏆', 'نقاط الفرق', 'منافسة بين الفرق', '#C9A44C'],
    ['dice', '🎲', 'نرد وعملة', 'للألعاب والأدوار', '#082B5A'],
    ['poll', '📊', 'سؤال لحظي', 'يجيب الطلاب من جوالاتهم', '#005499'],
  ];
  const T = k => TOOLS.find(t => t[0] === k);

  window.WBT = function (o) { // o: { wrap, btn, insertText(v), cfg(): {poll, classes}, askNames(cid, cb), poll() }
    if (!document.getElementById('wbtcss')) { const s = document.createElement('style'); s.id = 'wbtcss'; s.textContent = CSS; document.head.appendChild(s); }
    const wrap = o.wrap; let pan = null, z = 15;

    // ---------- فصل الحصة (مشترك بين الأدوات) ----------
    let R = LJ('dina_wbt_roster', null);
    if (!R) { const old = (LSg('dina_wbt_names') || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean); R = { label: old.length ? 'قائمتي' : '', names: old, key: 'manual' }; }
    const subs = new Set(); const onRoster = f => { subs.add(f); return () => subs.delete(f); };
    const setRoster = r => { R = r; LSs('dina_wbt_roster', JSON.stringify(R)); subs.forEach(f => { try { f(); } catch (_) { } }); };
    const names = () => (R && R.names) || [];
    const rosterLabel = () => names().length ? `${R.label || 'قائمة الأسماء'} · ${AR(names().length)} طالباً` : 'لم يُحدَّد فصل بعد';
    const rosterBar = B => { const d = document.createElement('div'); d.className = 'rb'; const paint = () => { d.innerHTML = `<span aria-hidden="true">👥</span><b>${esc(rosterLabel())}</b><button type="button">تغيير الفصل</button>`; d.querySelector('button').onclick = () => rosterDialog(); }; paint(); B.prepend(d); return onRoster(paint); };
    function rosterDialog(after) {
      const B = card('roster', '👥 فصل الحصة', 440, '#082B5A'); if (!B) return; const cfg = o.cfg() || {}, cls = cfg.classes || [];
      B.innerHTML = `<p class="muted" style="margin:0">اختر فصلك مرة واحدة، فتستخدم أسماءه كل الأدوات: العجلة، والبطاقة، والنجوم، والأدوار، والمجموعات.</p>
        ${cls.length ? `<div class="grps">${cls.map(c => `<button class="bt" data-c="${esc(c.id)}" style="min-height:52px">${esc(c.name)}</button>`).join('')}</div>` : '<p class="muted" style="margin:0">تظهر فصولك هنا عند فتح السبورة من المنصة.</p>'}
        <div class="row"><label class="muted">أرقام من ١ إلى <input type="number" min="2" max="60" class="nn" style="width:72px" aria-label="عدد الطلاب"></label><button class="bt s nb">استخدم الأرقام</button></div>
        <label class="muted" for="wbtNT">أو اكتب الأسماء (اسم في كل سطر)</label><textarea id="wbtNT" rows="5" class="nt">${esc(R.key === 'manual' ? names().join('\n') : '')}</textarea>
        <div class="row"><button class="bt g sv">اعتماد الأسماء المكتوبة</button><span class="muted st" role="status" aria-live="polite">${esc(rosterLabel())}</span></div>`;
      const st = B.querySelector('.st'), done = () => { st.textContent = '✓ ' + rosterLabel(); B.querySelectorAll('[data-c]').forEach(x => x.classList.toggle('p', x.dataset.c === R.key)); if (after) { const f = after; after = null; setTimeout(() => { const c = B.closest('.wbw'); if (c) c.querySelector('.cx').click(); f(); }, 450); } };
      B.querySelectorAll('[data-c]').forEach(b => { b.classList.toggle('p', b.dataset.c === R.key); b.onclick = () => { const c = cls.find(x => x.id === b.dataset.c); st.textContent = 'جارٍ تحميل أسماء «' + c.name + '»…';
        const cache = LJ('dina_wbt_cls_' + c.id, null); o.askNames(c.id, L => { L = (L || []).map(short).filter(Boolean); if (!L.length && cache) L = cache; if (!L.length) { st.textContent = 'لم أجد طلاباً في هذا الفصل'; return; } LSs('dina_wbt_cls_' + c.id, JSON.stringify(L)); setRoster({ key: c.id, label: c.name, names: L }); done(); }); }; });
      B.querySelector('.nb').onclick = () => { const n = Math.min(60, Math.max(2, +B.querySelector('.nn').value || 0)); if (n >= 2) { setRoster({ key: 'num', label: 'أرقام ١–' + AR(n), names: Array.from({ length: n }, (_, i) => 'طالب ' + AR(i + 1)) }); done(); } };
      B.querySelector('.sv').onclick = () => { const L = B.querySelector('.nt').value.split(/\r?\n|،|,/).map(s => s.trim()).filter(Boolean); if (L.length < 2) { st.textContent = 'اكتب اسمين على الأقل'; return; } setRoster({ key: 'manual', label: 'قائمتي', names: L }); done(); };
    }
    const needNames = k => { if (names().length >= 2) return false; rosterDialog(() => open(k)); return true; };

    // ---------- اللوحة ----------
    const close = () => { if (pan) { pan.remove(); pan = null; o.btn.setAttribute('aria-expanded', 'false'); o.btn.focus(); } };
    function panel() { if (pan) return close();
      const cfg = o.cfg() || {}; pan = document.createElement('div'); pan.className = 'wbt-pan'; pan.setAttribute('role', 'dialog'); pan.setAttribute('aria-label', 'الأدوات التفاعلية');
      const tile = ([k, i, n, d, c, nm]) => `<button class="wbt-t" data-w="${k}" style="--c:${c}">${nm && names().length ? `<span class="nm">${AR(names().length)}</span>` : ''}<i aria-hidden="true">${i}</i><b>${n}</b><small>${d}</small></button>`;
      pan.innerHTML = `<button class="wbt-x" aria-label="إغلاق">×</button><h2>الأدوات التفاعلية</h2><p class="sub">تظهر الأداة فوق السبورة: اسحبها من شريطها، وكبّرها بـ ⛶ لملء السبورة، وأغلقها متى شئت.</p>
        <div class="wbt-ros"><span class="av" aria-hidden="true">🎓</span><div class="grow"><b>${esc(names().length ? R.label || 'قائمة الأسماء' : 'فصل الحصة')}</b><small>${names().length ? AR(names().length) + ' طالباً — تستخدمه كل أدوات الأسماء' : 'اختر الفصل لتعمل الأدوات بأسماء طلابك'}</small></div><button class="rs">${names().length ? 'تغيير' : 'اختيار الفصل'}</button></div>
        <div class="wbt-sec">بأسماء الطلاب</div><div class="wbt-g">${TOOLS.filter(t => t[5]).map(tile).join('')}</div>
        <div class="wbt-sec">إدارة الصف</div><div class="wbt-g">${TOOLS.filter(t => !t[5] && (t[0] !== 'poll' || cfg.poll)).map(tile).join('')}</div>
        <label style="display:flex;gap:6px;align-items:center;margin-top:12px;font-size:12px;color:#5b6b7f"><input type="checkbox" class="mu" ${muted ? 'checked' : ''}> كتم أصوات الأدوات</label>`;
      wrap.appendChild(pan); o.btn.setAttribute('aria-expanded', 'true');
      pan.querySelector('.wbt-x').onclick = close; pan.querySelector('.rs').onclick = () => { close(); rosterDialog(); };
      pan.querySelector('.mu').onchange = e => { muted = e.target.checked; LSs('dina_wbt_mute', muted ? '1' : '0'); };
      pan.addEventListener('click', e => { const b = e.target.closest('[data-w]'); if (!b) return; const k = b.dataset.w; close(); if (k === 'poll') o.poll(); else open(k); });
      pan.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }); pan.querySelector('[data-w]').focus(); }
    o.btn.onclick = panel; o.btn.setAttribute('aria-haspopup', 'dialog'); o.btn.setAttribute('aria-expanded', 'false');

    // ---------- البطاقة العائمة ----------
    function place(c, n) { requestAnimationFrame(() => { const W = wrap.clientWidth, H = wrap.clientHeight, w = c.offsetWidth, h = Math.min(c.offsetHeight, H - 16);
      const Rs = [...wrap.querySelectorAll('.wbw')].filter(x => x !== c).map(x => ({ l: x.offsetLeft, t: x.offsetTop, r: x.offsetLeft + x.offsetWidth, b: x.offsetTop + x.offsetHeight }));
      let pos = null; for (let y = 8; y + h <= H - 8 && !pos; y += 16) for (let x = W - w - 8; x >= 8; x -= 16) if (!Rs.some(q => x < q.r + 6 && x + w + 6 > q.l && y < q.b + 6 && y + h + 6 > q.t)) { pos = [x, y]; break; }
      if (!pos) pos = [Math.max(8, W - w - 24 - n * 24), 12 + n * 24]; c.style.left = pos[0] + 'px'; c.style.top = Math.min(pos[1], Math.max(0, H - 60)) + 'px'; c.style.visibility = ''; }); }
    function card(k, title, w, color) { const ex = wrap.querySelector(`.wbw[data-k="${k}"]`); if (ex) { ex.style.zIndex = ++z; ex.querySelector('.cx').focus(); return null; }
      const n = wrap.querySelectorAll('.wbw').length, c = document.createElement('section'); c.className = 'wbw'; c.dataset.k = k; c.setAttribute('aria-label', title); c.style.width = Math.min(w || 340, wrap.clientWidth - 16) + 'px'; c.style.maxHeight = (wrap.clientHeight - 16) + 'px';
      c.style.setProperty('--c', color || (T(k) || [])[4] || '#005499'); c.style.zIndex = ++z; c.style.visibility = 'hidden';
      c.innerHTML = `<div class="wbw-h"><b>${title}</b><button class="mx" aria-label="تكبير لملء السبورة" title="تكبير">⛶</button><button class="mn" aria-label="تصغير" title="تصغير">–</button><button class="cx" aria-label="إغلاق ${title}">×</button></div><div class="wbw-b"></div>`; wrap.appendChild(c);
      place(c, n); const h = c.querySelector('.wbw-h'); let d = null;
      h.addEventListener('pointerdown', e => { if (e.target.closest('button') || c.classList.contains('max')) return; d = { x: e.clientX - c.offsetLeft, y: e.clientY - c.offsetTop }; h.setPointerCapture(e.pointerId); c.style.zIndex = ++z; });
      h.addEventListener('pointermove', e => { if (!d) return; c.style.left = Math.max(0, Math.min(wrap.clientWidth - 60, e.clientX - d.x)) + 'px'; c.style.top = Math.max(0, Math.min(wrap.clientHeight - 40, e.clientY - d.y)) + 'px'; });
      h.addEventListener('pointerup', () => d = null); c.addEventListener('pointerdown', () => c.style.zIndex = ++z);
      c.querySelector('.mx').onclick = () => { c.classList.toggle('max'); c.style.zIndex = ++z; if (c._resize) c._resize(); };
      c.querySelector('.mn').onclick = () => { const b = c.querySelector('.wbw-b'); b.hidden = !b.hidden; };
      c.querySelector('.cx').onclick = () => { if (c._stop) c._stop(); c.remove(); o.btn.focus(); };
      c.addEventListener('keydown', e => { if (e.key === 'Escape' && !e.target.matches('input,textarea')) c.querySelector('.cx').click(); });
      setTimeout(() => { const f = c.querySelector('.wbw-b button'); if (f) f.focus(); }, 30);
      return c.querySelector('.wbw-b'); }

    // احتفال (قصاصات ملونة)
    function confetti(host) { if (RM()) return; const cv = document.createElement('canvas'); cv.className = 'wbt-conf'; host.appendChild(cv); const W = cv.width = host.clientWidth, H = cv.height = host.clientHeight, g = cv.getContext('2d');
      const P = Array.from({ length: 140 }, () => ({ x: W / 2 + (Math.random() - .5) * 60, y: H * .45, vx: (Math.random() - .5) * 12, vy: -Math.random() * 13 - 4, r: 4 + Math.random() * 5, c: PAL[rnd(PAL.length)], a: Math.random() * 6, s: Math.random() < .5 }));
      let f = 0; const step = () => { g.clearRect(0, 0, W, H); P.forEach(p => { p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += .2; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; if (p.s) g.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); else { g.beginPath(); g.arc(0, 0, p.r / 1.4, 0, 7); g.fill(); } g.restore(); }); if (++f < 150) requestAnimationFrame(step); else cv.remove(); }; step(); }
    const shade = (hex, p) => { const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v + p * 2.55))); return `rgb(${c(n >> 16)},${c((n >> 8) & 255)},${c(n & 255)})`; };

    // ---------- الأدوات ----------
    function open(k) {
      if (T(k) && T(k)[5] && needNames(k)) return;

      if (k === 'wheel') { const B = card(k, '🎡 عجلة الأسماء', 480); if (!B) return; const C0 = B.parentNode;
        let pool = [], ang = 0, spinning = false, hist = []; const mark = new Image(); mark.onload = () => draw(); mark.src = 'assets/mark.svg';
        const un = rosterBar(B); B.insertAdjacentHTML('beforeend', `<div class="wh-st"><div class="wh-pin" aria-hidden="true"></div><canvas role="img" aria-label="عجلة أسماء الطلاب"></canvas><button class="wh-go" aria-label="أدِر العجلة">أدِر</button></div>
          <div class="row cen"><label class="muted"><input type="checkbox" class="rmw" checked> إخراج الفائز من العجلة</label><button class="bt s rst">↺ إعادة كل الأسماء</button></div>
          <div class="muted hs" aria-live="polite" style="text-align:center"></div>`);
        const st = B.querySelector('.wh-st'), cv = st.querySelector('canvas'), go = st.querySelector('.wh-go'), pin = st.querySelector('.wh-pin'), hs = B.querySelector('.hs');
        const paintHist = () => { hs.textContent = `في العجلة ${AR(pool.length)} من ${AR(names().length)}` + (hist.length ? ' · اختيروا: ' + hist.slice(-6).join('، ') : ''); };
        const reset = () => { pool = names().slice(); hist = []; paintHist(); draw(); };
        function draw() { const s = Math.round(st.clientWidth * (window.devicePixelRatio || 1)); if (!s) return; if (cv.width !== s) cv.width = cv.height = s; const g = cv.getContext('2d'), r = s / 2, n = Math.max(1, pool.length), seg = Math.PI * 2 / n;
          g.clearRect(0, 0, s, s); g.save(); g.translate(r, r);
          g.beginPath(); g.arc(0, 0, r * .98, 0, 7); g.fillStyle = '#082B5A'; g.fill();
          for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; g.beginPath(); g.arc(Math.cos(a) * r * .93, Math.sin(a) * r * .93, r * .018, 0, 7); g.fillStyle = i % 2 ? '#FFE9A8' : '#fff'; g.fill(); }
          g.rotate(ang);
          for (let i = 0; i < n; i++) { let ci = i % PAL.length; if (i === n - 1 && n > 1 && ci === 0) ci = 2; const c = PAL[ci]; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r * .88, i * seg, (i + 1) * seg); g.closePath();
            const gr = g.createRadialGradient(0, 0, r * .15, 0, 0, r * .88); gr.addColorStop(0, shade(c, 14)); gr.addColorStop(1, shade(c, -14)); g.fillStyle = gr; g.fill(); g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = Math.max(1, s / 300); g.stroke();
            if (pool[i]) { g.save(); const mid = i * seg + seg / 2, wa = ((ang + mid) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2), flip = wa > Math.PI / 2 && wa < Math.PI * 1.5; g.rotate(mid + (flip ? Math.PI : 0)); g.textAlign = flip ? 'left' : 'right'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; const fs = Math.min(r * .1, Math.max(r * .04, seg * r * .4)); g.font = `800 ${fs}px 'GE SS Two', Tahoma, sans-serif`; g.shadowColor = 'rgba(0,0,0,.4)'; g.shadowBlur = 3;
              let t = pool[i], f2 = fs; const mw = r * .62; while (g.measureText(t).width > mw && f2 > r * .05) { f2 -= 1; g.font = `800 ${f2}px 'GE SS Two', Tahoma, sans-serif`; } while (g.measureText(t).width > mw && t.length > 3) t = t.slice(0, -2) + '…'; g.direction = 'rtl'; g.fillText(t, flip ? -r * .84 : r * .84, 0); g.restore(); } }
          g.restore(); g.save(); g.translate(r, r); g.beginPath(); g.arc(0, 0, r * .16, 0, 7); g.fillStyle = '#fff'; g.fill(); if (mark.complete && mark.naturalWidth) g.drawImage(mark, -r * .09, -r * .09, r * .18, r * .18); g.restore(); }
        const idxAt = a => { const n = pool.length, seg = Math.PI * 2 / n; const p = ((-Math.PI / 2 - a) % (Math.PI * 2) + Math.PI * 4) % (Math.PI * 2); return Math.floor(p / seg) % n; };
        function spin() { if (spinning || st.querySelector('.wh-win')) return; if (!pool.length) reset(); if (!pool.length) return; spinning = true; go.disabled = true; ac();
          const n = pool.length, win = rnd(n), seg = Math.PI * 2 / n, target = -Math.PI / 2 - (win * seg + seg * (.2 + Math.random() * .6));
          const start = ang, turns = RM() ? 1 : 6 + rnd(3), end = start + (((target - start) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) + Math.PI * 2 * turns, dur = RM() ? 700 : 5200 + rnd(1200), t0 = performance.now(); let last = idxAt(ang);
          const ease = t => 1 - Math.pow(1 - t, 4);
          const step = now => { const t = Math.min(1, (now - t0) / dur); ang = start + (end - start) * ease(t); draw(); const i = idxAt(ang); if (i !== last) { last = i; tick(); pin.classList.remove('hit'); void pin.offsetWidth; pin.classList.add('hit'); }
            if (t < 1) requestAnimationFrame(step); else { spinning = false; go.disabled = false; result(pool[idxAt(ang)]); } };
          requestAnimationFrame(step); }
        function result(name) { fanfare(); hist.push(name); const w = document.createElement('div'); w.className = 'wh-win'; w.innerHTML = `<div role="alertdialog" aria-label="وقع الاختيار"><div class="muted">🎉 وقع الاختيار على</div><div class="n">${esc(name)}</div><div class="row cen"><button class="bt p ag">أدِر مرة أخرى</button><button class="bt s ins">إدراج في السبورة</button><button class="bt s cl">إغلاق</button></div></div>`;
          st.appendChild(w); confetti(st); w.querySelector('.ag').focus();
          const fin = () => { w.remove(); if (B.querySelector('.rmw').checked) { const i = pool.indexOf(name); if (i >= 0) pool.splice(i, 1); if (!pool.length) pool = names().slice(); } paintHist(); draw(); };
          w.querySelector('.cl').onclick = fin; w.querySelector('.ag').onclick = () => { fin(); spin(); }; w.querySelector('.ins').onclick = () => { o.insertText('🎡 ' + name); w.querySelector('.ins').textContent = '✓ أُدرج'; };
          w.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); fin(); } }); }
        go.onclick = spin; B.querySelector('.rst').onclick = reset; cv.addEventListener('click', spin);
        const ro = window.ResizeObserver ? new ResizeObserver(() => draw()) : null; if (ro) ro.observe(st);
        const un2 = onRoster(reset); C0._stop = () => { un(); un2(); if (ro) ro.disconnect(); }; C0._resize = () => setTimeout(draw, 30);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw); reset(); }

      if (k === 'flip') { const B = card(k, '🃏 بطاقة الاسم', 380); if (!B) return; let used = [];
        const un = rosterBar(B); B.insertAdjacentHTML('beforeend', `<div class="fc" aria-live="polite"><div><div class="f" aria-hidden="true">؟</div><div class="bk"></div></div></div>
          <div class="row cen"><button class="bt p big go">🃏 اقلب البطاقة</button></div><div class="row cen"><label class="muted"><input type="checkbox" class="nr" checked> بلا تكرار</label><button class="bt s ins">إدراج في السبورة</button></div><div class="muted left" style="text-align:center"></div>`);
        const fc = B.querySelector('.fc'), bk = B.querySelector('.bk'), left = () => { const N = names(); B.querySelector('.left').textContent = `المتبقي ${AR(N.filter(x => !used.includes(x)).length)} من ${AR(N.length)}${used.length ? ' · ' + used.slice(-5).join('، ') : ''}`; };
        const show = w => { bk.textContent = w; fc.classList.add('on'); used.push(w); tone(660, .12); tone(990, .2, .12); left(); if (!RM()) setTimeout(() => confetti(fc), 450); };
        B.querySelector('.go').onclick = () => { const N = names(); let p = B.querySelector('.nr').checked ? N.filter(x => !used.includes(x)) : N; if (!p.length) { used = []; p = N; } const w = p[rnd(p.length)];
          if (fc.classList.contains('on')) { fc.classList.remove('on'); setTimeout(() => show(w), RM() ? 0 : 380); } else show(w); };
        B.querySelector('.ins').onclick = () => { if (fc.classList.contains('on')) o.insertText('🃏 ' + bk.textContent); };
        const un2 = onRoster(() => { used = []; fc.classList.remove('on'); left(); }); B.parentNode._stop = () => { un(); un2(); }; left(); }

      if (k === 'stars') { const B = card(k, '⭐ نجوم الطلاب', 560); if (!B) return; const key = () => 'dina_wbt_stars_' + (R.key || 'x') + '_' + new Date().toISOString().slice(0, 10);
        let S = LJ(key(), {}), sort = false; const un = rosterBar(B); const box = document.createElement('div'); box.style.cssText = 'display:grid;gap:10px'; B.appendChild(box);
        const add = n => { S[n] = (S[n] || 0) + 1; LSs(key(), JSON.stringify(S)); tone(1047, .1); tone(1319, .18, .08); draw(); const el = [...box.querySelectorAll('.st-c')].find(x => x.dataset.n === n); if (el) { el.focus(); if (!RM()) { const p = document.createElement('span'); p.className = 'st-pop'; p.textContent = '⭐'; el.appendChild(p); setTimeout(() => p.remove(), 900); } } };
        const draw = () => { const N = names().slice(); if (sort) N.sort((a, b) => (S[b] || 0) - (S[a] || 0)); const mx = Math.max(0, ...N.map(n => S[n] || 0)), tot = N.reduce((a, n) => a + (S[n] || 0), 0);
          box.innerHTML = `<div class="row"><button class="bt s so">${sort ? 'ترتيب الأسماء' : '🏅 ترتيب حسب النجوم'}</button><button class="bt s ra">⭐ لطالب عشوائي</button><button class="bt s ins">إدراج المتصدرين</button><button class="bt s z">تصفير</button><span class="muted">مجموع اليوم: ${AR(tot)} ⭐</span></div>
            <div class="st-g">${N.map(n => `<button class="st-c ${mx && (S[n] || 0) === mx ? 'top' : ''}" data-n="${esc(n)}" aria-label="${esc(n)}: ${AR(S[n] || 0)} نجمة — اضغط لإضافة نجمة"><span class="m" data-m="${esc(n)}" aria-hidden="true" title="إنقاص نجمة">−</span><span class="av" style="background:${PAL[names().indexOf(n) % PAL.length]}">${esc(n.trim()[0] || '؟')}</span><b>${esc(n)}</b><span class="s">${S[n] ? AR(S[n]) + ' ⭐' : '☆'}</span>${mx && (S[n] || 0) === mx ? '<span aria-hidden="true" style="position:absolute;top:2px;inset-inline-end:6px">👑</span>' : ''}</button>`).join('')}</div>`;
          box.querySelector('.so').onclick = () => { sort = !sort; draw(); };
          box.querySelector('.z').onclick = () => { S = {}; LSs(key(), '{}'); draw(); };
          box.querySelector('.ra').onclick = () => { const N2 = names(); add(N2[rnd(N2.length)]); };
          box.querySelector('.ins').onclick = () => { const top = names().filter(n => S[n]).sort((a, b) => S[b] - S[a]).slice(0, 5); if (top.length) o.insertText('⭐ نجوم الحصة: ' + top.map(n => `${n} (${AR(S[n])})`).join('، ')); };
          box.querySelectorAll('.st-c').forEach(b => { b.onclick = e => { const m = e.target.closest('[data-m]'); if (m) { S[m.dataset.m] = Math.max(0, (S[m.dataset.m] || 0) - 1); LSs(key(), JSON.stringify(S)); draw(); return; } add(b.dataset.n); };
            b.onkeydown = e => { if (e.key === '-' || e.key === 'Backspace') { e.preventDefault(); S[b.dataset.n] = Math.max(0, (S[b.dataset.n] || 0) - 1); LSs(key(), JSON.stringify(S)); draw(); } }; }); };
        const un2 = onRoster(() => { S = LJ(key(), {}); draw(); }); B.parentNode._stop = () => { un(); un2(); }; draw(); }

      if (k === 'order') { const B = card(k, '🔢 ترتيب الأدوار', 400); if (!B) return; let L = [], cur = -1, iv = 0;
        const un = rosterBar(B); B.insertAdjacentHTML('beforeend', `<div class="row"><button class="bt p go">🔀 قرعة جديدة</button><button class="bt g nx">التالي ←</button><button class="bt s ins">إدراج في السبورة</button></div><ol class="to-l" aria-live="polite"></ol>`);
        const ol = B.querySelector('.to-l'), draw = () => { ol.innerHTML = L.map((n, i) => `<li class="${i === cur ? 'cur' : i < cur ? 'done' : ''}"><i>${AR(i + 1)}</i>${esc(n)}${i === cur ? ' <span aria-hidden="true">🎤</span>' : ''}</li>`).join(''); const c = ol.querySelector('.cur'); if (c) c.scrollIntoView({ block: 'nearest' }); };
        const shuf = () => { clearInterval(iv); cur = -1; if (RM()) { L = shuffle(names()); return draw(); } let k2 = 0; iv = setInterval(() => { L = shuffle(names()); draw(); tick(); if (++k2 > 8) clearInterval(iv); }, 70); };
        B.querySelector('.go').onclick = shuf; B.querySelector('.nx').onclick = () => { if (!L.length) shuf(); cur = Math.min(L.length - 1, cur + 1); tone(880, .12); draw(); };
        B.querySelector('.ins').onclick = () => { if (L.length) o.insertText('🔢 ترتيب الأدوار: ' + L.map((n, i) => AR(i + 1) + '. ' + n).join('  ')); };
        const un2 = onRoster(shuf); B.parentNode._stop = () => { clearInterval(iv); un(); un2(); }; shuf(); }

      if (k === 'groups') { const B = card(k, '👥 تقسيم مجموعات', 520); if (!B) return; let G = [];
        const un = rosterBar(B); B.insertAdjacentHTML('beforeend', `<div class="row"><label>عدد <select class="md" aria-label="طريقة التقسيم"><option value="g">المجموعات</option><option value="s">الطلاب في كل مجموعة</option></select></label><input type="number" min="2" max="20" value="4" class="gn" style="width:70px" aria-label="العدد"><button class="bt p go">🔀 قسّم</button><button class="bt s ins">إدراج في السبورة</button></div><div class="grps" aria-live="polite"></div>`);
        const GN = ['النجوم', 'الصقور', 'المبدعون', 'الرواد', 'العباقرة', 'الأبطال', 'المكتشفون', 'المتميزون', 'السفراء', 'القادة'];
        const go = () => { const N = shuffle(names()); const v = Math.max(1, +B.querySelector('.gn').value || 2); const g = B.querySelector('.md').value === 'g' ? Math.min(v, N.length) : Math.max(1, Math.ceil(N.length / v));
          G = Array.from({ length: g }, () => []); N.forEach((x, i) => G[i % g].push(x)); tone(784, .15);
          B.querySelector('.grps').innerHTML = G.map((x, i) => `<div class="grp" style="border-color:${PAL[i % PAL.length]}"><b style="color:${PAL[i % PAL.length]}">${AR(i + 1)}. ${GN[i % GN.length]} <span class="muted">(${AR(x.length)})</span></b><div>${x.map(esc).join('<br>')}</div></div>`).join(''); };
        B.querySelector('.go').onclick = go; B.querySelector('.ins').onclick = () => { if (G.length) o.insertText(G.map((x, i) => `${GN[i % GN.length]}: ${x.join('، ')}`).join('\n')); };
        const un2 = onRoster(go); B.parentNode._stop = () => { un(); un2(); }; go(); }

      if (k === 'timer') { const B = card(k, '⏳ مؤقت تنازلي', 340); if (!B) return; let total = 300, left = 300, t = null, end = 0;
        B.innerHTML = `<div class="big" aria-live="off">${mmss(left)}</div><div class="bar" aria-hidden="true"><i style="width:100%"></i></div>
          <div class="row" role="group" aria-label="مدة جاهزة">${[1, 2, 3, 5, 10, 15].map(m => `<button class="bt s" data-m="${m}">${AR(m)} د</button>`).join('')}<input type="number" min="1" max="180" aria-label="دقائق" placeholder="دقائق" class="cm" style="width:84px"></div>
          <div class="row"><button class="bt p go">▶ ابدأ</button><button class="bt rs">↺ إعادة</button><button class="bt s ad">+١ د</button></div><div class="muted st" role="status" aria-live="polite"></div>`;
        const big = B.querySelector('.big'), bar = B.querySelector('.bar i'), go = B.querySelector('.go'), st = B.querySelector('.st');
        const paint = () => { big.textContent = mmss(left); bar.style.width = (total ? left / total * 100 : 0) + '%'; big.classList.toggle('end', left <= 0); };
        const stop = () => { clearInterval(t); t = null; go.textContent = '▶ ابدأ'; };
        let prev = -1; const tk = () => { left = Math.max(0, Math.round((end - Date.now()) / 1000)); paint(); if (left <= 0) { stop(); beep(); st.textContent = 'انتهى الوقت!'; } else if (left <= 5 && left !== prev) tone(660, .1); prev = left; };
        const setM = m => { stop(); total = left = Math.round(m * 60); st.textContent = ''; paint(); };
        B.querySelectorAll('[data-m]').forEach(b => b.onclick = () => setM(+b.dataset.m));
        B.querySelector('.cm').onchange = e => { const v = +e.target.value; if (v > 0) setM(v); };
        go.onclick = () => { if (t) { stop(); st.textContent = 'متوقف مؤقتاً'; return; } if (left <= 0) left = total; end = Date.now() + left * 1000; t = setInterval(tk, 250); go.textContent = '⏸ إيقاف'; st.textContent = 'يعمل…'; ac(); };
        B.querySelector('.rs').onclick = () => { stop(); left = total; st.textContent = ''; paint(); };
        B.querySelector('.ad').onclick = () => { left += 60; total = Math.max(total, left); if (t) end += 60000; paint(); };
        B.parentNode._stop = stop; paint(); }

      if (k === 'watch') { const B = card(k, '⏱️ ساعة إيقاف', 320); if (!B) return; let acc = 0, s0 = 0, t = null, laps = [];
        B.innerHTML = `<div class="big">${mmss(0)}</div><div class="row"><button class="bt p go">▶ ابدأ</button><button class="bt lp">علامة</button><button class="bt rs">↺ تصفير</button></div><ol class="lps muted" style="margin:0;padding-inline-start:20px;max-height:120px;overflow:auto"></ol>`;
        const now = () => acc + (t ? Date.now() - s0 : 0), paint = () => { const v = now(); B.querySelector('.big').innerHTML = mmss(v / 1000 - .499) + `<small style="font-size:.45em">.${AR(Math.floor(v / 100) % 10)}</small>`; };
        const go = B.querySelector('.go'), stop = () => { if (t) { acc = now(); clearInterval(t); t = null; } go.textContent = '▶ استئناف'; };
        go.onclick = () => { if (t) return stop(); s0 = Date.now(); t = setInterval(paint, 100); go.textContent = '⏸ إيقاف'; };
        B.querySelector('.lp').onclick = () => { laps.push(now()); B.querySelector('.lps').innerHTML = laps.map(l => `<li>${mmss(l / 1000 - .499)}</li>`).join(''); };
        B.querySelector('.rs').onclick = () => { if (t) { clearInterval(t); t = null; } acc = 0; laps = []; B.querySelector('.lps').innerHTML = ''; go.textContent = '▶ ابدأ'; paint(); };
        B.parentNode._stop = () => clearInterval(t); }

      if (k === 'noise') { const B = card(k, '🔊 مقياس الضجيج', 360); if (!B) return; let stream = null, raf = 0, lvl = 0, over = 0, lastAlarm = 0, th = +(LSg('dina_wbt_nz') || 60);
        B.innerHTML = `<div class="nz-g"><i></i><div class="th"></div><b aria-hidden="true">😊</b></div><label class="muted">حد الهدوء <input type="range" min="20" max="95" value="${th}" class="tr" aria-label="حد الهدوء" style="width:100%"></label>
          <div class="row"><button class="bt p go">🎙️ تشغيل المقياس</button><span class="muted st" role="status" aria-live="polite">يحتاج إذن الميكروفون — لا يُسجَّل أي صوت.</span></div>`;
        const g = B.querySelector('.nz-g'), bar = g.querySelector('i'), face = g.querySelector('b'), thl = g.querySelector('.th'), st = B.querySelector('.st'), go = B.querySelector('.go');
        const paintTh = () => thl.style.bottom = th + '%'; paintTh(); B.querySelector('.tr').oninput = e => { th = +e.target.value; LSs('dina_wbt_nz', th); paintTh(); };
        const stop = () => { cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(t => t.stop()); stream = null; go.textContent = '🎙️ تشغيل المقياس'; };
        go.onclick = async () => { if (stream) { stop(); st.textContent = 'متوقف'; return; }
          try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { st.textContent = 'لم يُسمح بالميكروفون — اسمح به من إعدادات المتصفح ثم أعد المحاولة.'; return; }
          const a = ac(); if (!a) { st.textContent = 'المتصفح لا يدعم قياس الصوت'; return; } const src = a.createMediaStreamSource(stream), an = a.createAnalyser(); an.fftSize = 1024; src.connect(an); const d = new Uint8Array(an.fftSize); go.textContent = '⏹ إيقاف'; st.textContent = 'يستمع…';
          const loop = () => { an.getByteTimeDomainData(d); let s = 0; for (const v of d) s += (v - 128) * (v - 128); const rms = Math.sqrt(s / d.length); const v = Math.min(100, Math.max(0, (Math.log10(rms + 1) / 1.9) * 100)); lvl = lvl * .8 + v * .2;
            bar.style.height = lvl + '%'; bar.style.background = lvl > th ? 'linear-gradient(0deg,#E0675A,#C62D22)' : lvl > th * .7 ? 'linear-gradient(0deg,#F2C14E,#C9A44C)' : 'linear-gradient(0deg,#BADF93,#2E8B57)'; face.textContent = lvl > th ? '😣' : lvl > th * .7 ? '😐' : '😊';
            if (lvl > th) { if (++over > 45 && Date.now() - lastAlarm > 4000) { lastAlarm = Date.now(); over = 0; tone(440, .3, 0, 'sine', .15); const c = B.parentNode; c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); } } else over = 0;
            raf = requestAnimationFrame(loop); }; loop(); };
        B.parentNode._stop = stop; }

      if (k === 'dice') { const B = card(k, '🎲 نرد وعملة', 340); if (!B) return;
        const P = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] }, die = n => `<div class="die" role="img" aria-label="النرد ${AR(n)}">${Array.from({ length: 9 }, (_, i) => `<span class="${P[n].includes(i) ? 'd' : ''}"></span>`).join('')}</div>`;
        B.innerHTML = `<div class="row"><label class="muted">عدد النرد <select class="dn"><option>1</option><option selected>2</option><option>3</option></select></label><button class="bt p rl">🎲 ارمِ النرد</button><button class="bt cn">🪙 ارمِ العملة</button></div><div class="dice" aria-live="polite">${die(1)}${die(6)}</div><div class="muted sum" style="text-align:center"></div>`;
        const box = B.querySelector('.dice'), sum = B.querySelector('.sum');
        B.querySelector('.rl').onclick = () => { const v = Array.from({ length: +B.querySelector('.dn').value }, () => 1 + rnd(6)); box.innerHTML = v.map(die).join(''); if (!RM()) box.querySelectorAll('.die').forEach(d => d.classList.add('roll')); for (let i = 0; i < 5; i++) setTimeout(tick, i * 90); sum.textContent = v.length > 1 ? 'المجموع: ' + AR(v.reduce((a, b) => a + b, 0)) : ''; };
        B.querySelector('.cn').onclick = () => { const h = rnd(2); box.innerHTML = `<div class="coin ${RM() ? '' : 'roll'}" role="img" aria-label="${h ? 'كتابة' : 'صورة'}">${h ? 'كتابة' : 'صورة'}</div>`; tone(1200, .08); tone(1500, .1, .5); sum.textContent = ''; }; }

      if (k === 'score') { const B = card(k, '🏆 نقاط الفرق', 480); if (!B) return; const COL = ['#E0675A', '#005499', '#2E8B57', '#C9A44C', '#7E5BD6', '#3AB1DB'];
        let TM = LJ('dina_wbt_score', []); if (!TM.length) TM = [{ n: 'الفريق الأول', s: 0 }, { n: 'الفريق الثاني', s: 0 }];
        const save = () => LSs('dina_wbt_score', JSON.stringify(TM));
        const draw = () => { const mx = Math.max(...TM.map(t => t.s)); B.innerHTML = `<div class="teams">${TM.map((t, i) => `<div class="team" style="background:linear-gradient(160deg,${COL[i % 6]},${shade(COL[i % 6], -14)})"><input value="${esc(t.n)}" data-n="${i}" aria-label="اسم الفريق ${AR(i + 1)}"><b aria-live="polite">${AR(t.s)}${mx > 0 && t.s === mx ? ' 👑' : ''}</b><div class="row"><button class="bt" data-d="${i}|-1" aria-label="ناقص نقطة">−</button><button class="bt" data-d="${i}|1" aria-label="زائد نقطة">+</button><button class="bt" data-d="${i}|5" aria-label="زائد خمس نقاط">+٥</button></div></div>`).join('')}</div>
          <div class="row"><button class="bt s ad" ${TM.length >= 6 ? 'disabled' : ''}>+ فريق</button><button class="bt s rm" ${TM.length <= 2 ? 'disabled' : ''}>− فريق</button><button class="bt s z">تصفير النقاط</button><button class="bt s ins">إدراج في السبورة</button></div>`;
          B.querySelectorAll('[data-n]').forEach(x => x.oninput = () => { TM[+x.dataset.n].n = x.value; save(); });
          B.querySelectorAll('[data-d]').forEach(x => x.onclick = () => { const [i, d] = x.dataset.d.split('|').map(Number); TM[i].s = Math.max(0, TM[i].s + d); save(); if (d > 0) { tone(d > 1 ? 1170 : 990, .1); if (d > 1) tone(1319, .15, .1); } draw(); B.querySelector(`[data-d="${x.dataset.d}"]`).focus(); });
          B.querySelector('.ad').onclick = () => { TM.push({ n: 'الفريق ' + AR(TM.length + 1), s: 0 }); save(); draw(); }; B.querySelector('.rm').onclick = () => { TM.pop(); save(); draw(); };
          B.querySelector('.z').onclick = () => { TM.forEach(t => t.s = 0); save(); draw(); };
          B.querySelector('.ins').onclick = () => o.insertText('🏆 ' + TM.map(t => `${t.n}: ${AR(t.s)}`).join('  ·  ')); };
        draw(); }

      if (k === 'signal') { const B = card(k, '🚦 إشارة الصف', 300); if (!B) return; const S = [['#C62D22', '🤫 هدوء تام'], ['#B7862B', '🗣️ همس — عمل ثنائي'], ['#2E8B57', '💬 نقاش جماعي']];
        B.innerHTML = `<div class="sig" role="radiogroup" aria-label="مستوى الصوت المسموح">${S.map(([c, t], i) => `<button role="radio" aria-checked="false" data-s="${i}" style="background:${c}">${t}</button>`).join('')}</div>`;
        B.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { B.querySelectorAll('[data-s]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); B.parentNode.style.setProperty('--c', S[+b.dataset.s][0]); tone(600 + 200 * +b.dataset.s, .15); }); }
    }
    return { open, panel, roster: () => R };
  };
})();
