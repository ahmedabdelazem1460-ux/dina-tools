/* منصة دينا — المجسمات التفاعلية (تعمل دون إنترنت، رسم ثلاثي الأبعاد على Canvas دون مكتبات):
   (١) المجسمات الهندسية: مكعب، منشور، هرم، أسطوانة، مخروط، كرة — تدوير بالسحب، الأبعاد قابلة للتغيير، الأوجه والأحرف والرؤوس، والمساحة والحجم.
   (٢) نموذج الذرة (بور) للعناصر ١–٢٠ بتوزيع الإلكترونات على المستويات.
   (٣) المجموعة الشمسية بمدارات متحركة وبطاقة لكل كوكب. تُفتح من «المعامل الافتراضية». */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, $, $$, esc, AR } = A;
  const RM = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!document.getElementById('m3css')) { const st = document.createElement('style'); st.id = 'm3css'; st.textContent = `
.m3-wrap{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px}@media (max-width:860px){.m3-wrap{grid-template-columns:1fr}}
.m3-cv{width:100%;aspect-ratio:4/3;border-radius:18px;background:radial-gradient(circle at 50% 40%,#123d73,#061B3A);touch-action:none;cursor:grab;display:block}
.m3-cv.light{background:radial-gradient(circle at 50% 40%,#fff,#E4EBF5)}
.m3-side{display:grid;gap:10px;align-content:start}
.m3-pick{display:flex;gap:6px;flex-wrap:wrap}.m3-pick button{border:1.5px solid #DCE7F3;border-radius:12px;padding:6px 10px;font:inherit;font-weight:700;background:#fff;cursor:pointer;color:#082B5A}.m3-pick button.on{background:#082B5A;color:#fff;border-color:#082B5A}
.m3-facts{border:1px solid #DCE7F3;border-radius:14px;padding:10px 12px;background:#F7FBFE;display:grid;gap:4px}.m3-facts b{color:#082B5A}
.m3-facts .f{font-family:'GE SS Two';direction:rtl}
.m3-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}
`; document.head.appendChild(st); }

  // ---------- محرك بسيط: تدوير + إسقاط منظوري + تظليل ----------
  function engine(cv, buildMesh, opts = {}) {
    const ctx = cv.getContext('2d'); let rx = -0.5, ry = 0.6, drag = null, alive = true, auto = !RM();
    const fit = () => { const r = cv.getBoundingClientRect(), d = window.devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); };
    const rot = ([x, y, z]) => { let c = Math.cos(ry), s = Math.sin(ry); [x, z] = [x * c + z * s, -x * s + z * c]; c = Math.cos(rx); s = Math.sin(rx); [y, z] = [y * c - z * s, y * s + z * c]; return [x, y, z]; };
    function draw() {
      if (!alive || !document.body.contains(cv)) { alive = false; return; }
      const W = cv.clientWidth, H = cv.clientHeight, sc = Math.min(W, H) * .32, cam = 6;
      const P = p => { const [x, y, z] = rot(p); const k = cam / (cam + z); return [W / 2 + x * sc * k, H / 2 - y * sc * k, z]; };
      ctx.clearRect(0, 0, W, H); const m = buildMesh();
      const faces = m.faces.map(f => { const pts = f.v.map(i => P(m.v[i])); const z = pts.reduce((a, p) => a + p[2], 0) / pts.length;
        const a = rot(m.v[f.v[0]]), b = rot(m.v[f.v[1]]), c = rot(m.v[f.v[2]]); const n = [(b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]), (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]), (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])]; const L = Math.hypot(...n) || 1; const lit = Math.abs((n[0] * -.4 + n[1] * .6 + n[2] * -.7) / L);
        return { pts, z, lit, col: f.c || m.col }; }).sort((a, b) => b.z - a.z);
      faces.forEach(f => { ctx.beginPath(); f.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); const [r, g, b] = f.col; const k = .45 + .55 * f.lit; ctx.fillStyle = `rgba(${r * k | 0},${g * k | 0},${b * k | 0},${m.alpha ?? .92})`; ctx.fill(); if (m.edges !== false) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.2; ctx.stroke(); } });
      if (opts.overlay) opts.overlay(ctx, W, H, P);
      if (auto && !drag) ry += .006;
      requestAnimationFrame(draw);
    }
    cv.onpointerdown = e => { drag = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; };
    cv.onpointermove = e => { if (!drag) return; ry += (e.clientX - drag[0]) * .01; rx += (e.clientY - drag[1]) * .01; rx = Math.max(-1.5, Math.min(1.5, rx)); drag = [e.clientX, e.clientY]; };
    cv.onpointerup = () => { drag = null; cv.style.cursor = 'grab'; auto = false; };
    cv.tabIndex = 0; cv.onkeydown = e => { if (e.key === 'ArrowLeft') ry -= .15; if (e.key === 'ArrowRight') ry += .15; if (e.key === 'ArrowUp') rx -= .15; if (e.key === 'ArrowDown') rx += .15; auto = false; };
    fit(); window.addEventListener('resize', fit); draw(); return { stop: () => { alive = false; } };
  }
  // ---------- المجسمات ----------
  const COL = [[0, 84, 153], [58, 177, 219], [46, 139, 87], [201, 164, 76], [224, 103, 90], [174, 149, 218]];
  function prism(n, r, h, top = r) { const v = [], f = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + Math.PI / n; v.push([r * Math.cos(a), -h / 2, r * Math.sin(a)]); } for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + Math.PI / n; v.push([top * Math.cos(a), h / 2, top * Math.sin(a)]); }
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; f.push({ v: [i, j, n + j, n + i], c: COL[i % 2 ? 1 : 0] }); } f.push({ v: [...Array(n).keys()].reverse(), c: COL[2] }); if (top > 0.0001) f.push({ v: [...Array(n).keys()].map(i => n + i), c: COL[3] }); return { v, faces: f, col: COL[0] }; }
  function pyramid(n, r, h) { const v = []; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + Math.PI / n; v.push([r * Math.cos(a), -h / 2, r * Math.sin(a)]); } v.push([0, h / 2, 0]); const f = []; for (let i = 0; i < n; i++) f.push({ v: [i, (i + 1) % n, n], c: COL[i % 2 ? 1 : 4] }); f.push({ v: [...Array(n).keys()].reverse(), c: COL[2] }); return { v, faces: f, col: COL[0] }; }
  function sphere(r) { const v = [], f = [], LA = 12, LO = 18; for (let i = 0; i <= LA; i++) { const t = i / LA * Math.PI; for (let j = 0; j < LO; j++) { const p = j / LO * Math.PI * 2; v.push([r * Math.sin(t) * Math.cos(p), r * Math.cos(t), r * Math.sin(t) * Math.sin(p)]); } }
    for (let i = 0; i < LA; i++) for (let j = 0; j < LO; j++) { const a = i * LO + j, b = i * LO + (j + 1) % LO; f.push({ v: [a, b, b + LO, a + LO], c: (i + j) % 2 ? COL[0] : COL[1] }); } return { v, faces: f, edges: false, col: COL[0] }; }
  const SOL = {
    cube: { n: 'مكعب', dims: [['a', 'طول الحرف', 2]], mesh: d => { const m = prism(4, d.a / Math.SQRT2, d.a); return m; }, F: 6, E: 12, Vx: 8, area: d => 6 * d.a ** 2, vol: d => d.a ** 3, fa: 'م = ٦ ل²', fv: 'ح = ل³' },
    cuboid: { n: 'متوازي مستطيلات', dims: [['l', 'الطول', 3], ['w', 'العرض', 2], ['h', 'الارتفاع', 1.5]], mesh: d => { const v = [], X = d.l / 2, Y = d.h / 2, Z = d.w / 2; [[-X, -Y, -Z], [X, -Y, -Z], [X, -Y, Z], [-X, -Y, Z], [-X, Y, -Z], [X, Y, -Z], [X, Y, Z], [-X, Y, Z]].forEach(p => v.push(p)); return { v, faces: [{ v: [0, 1, 2, 3], c: COL[2] }, { v: [4, 7, 6, 5], c: COL[3] }, { v: [0, 4, 5, 1], c: COL[0] }, { v: [1, 5, 6, 2], c: COL[1] }, { v: [2, 6, 7, 3], c: COL[0] }, { v: [3, 7, 4, 0], c: COL[1] }], col: COL[0] }; }, F: 6, E: 12, Vx: 8, area: d => 2 * (d.l * d.w + d.l * d.h + d.w * d.h), vol: d => d.l * d.w * d.h, fa: 'م = ٢(ل×ع + ل×ر + ع×ر)', fv: 'ح = ل × ع × ر' },
    tri: { n: 'منشور ثلاثي', dims: [['a', 'ضلع القاعدة', 2], ['h', 'الارتفاع', 2.5]], mesh: d => prism(3, d.a / Math.sqrt(3), d.h), F: 5, E: 9, Vx: 6, area: d => 2 * (Math.sqrt(3) / 4 * d.a ** 2) + 3 * d.a * d.h, vol: d => Math.sqrt(3) / 4 * d.a ** 2 * d.h, fa: 'م = ٢ × مساحة القاعدة + محيطها × ر', fv: 'ح = مساحة القاعدة × ر' },
    pyr: { n: 'هرم رباعي', dims: [['a', 'ضلع القاعدة', 2.4], ['h', 'الارتفاع', 2.4]], mesh: d => pyramid(4, d.a / Math.SQRT2, d.h), F: 5, E: 8, Vx: 5, area: d => d.a ** 2 + 2 * d.a * Math.hypot(d.h, d.a / 2), vol: d => d.a ** 2 * d.h / 3, fa: 'م = مساحة القاعدة + ½ × محيطها × الارتفاع الجانبي', fv: 'ح = ⅓ × مساحة القاعدة × ر' },
    cyl: { n: 'أسطوانة', dims: [['r', 'نصف القطر', 1.1], ['h', 'الارتفاع', 2.4]], mesh: d => prism(28, d.r, d.h), F: 3, E: 2, Vx: 0, area: d => 2 * Math.PI * d.r * (d.r + d.h), vol: d => Math.PI * d.r ** 2 * d.h, fa: 'م = ٢ط نق (نق + ر)', fv: 'ح = ط نق² ر', curved: true },
    cone: { n: 'مخروط', dims: [['r', 'نصف القطر', 1.2], ['h', 'الارتفاع', 2.4]], mesh: d => pyramid(28, d.r, d.h), F: 2, E: 1, Vx: 1, area: d => Math.PI * d.r * (d.r + Math.hypot(d.r, d.h)), vol: d => Math.PI * d.r ** 2 * d.h / 3, fa: 'م = ط نق (نق + ل)', fv: 'ح = ⅓ ط نق² ر', curved: true },
    sph: { n: 'كرة', dims: [['r', 'نصف القطر', 1.4]], mesh: d => sphere(d.r), F: 1, E: 0, Vx: 0, area: d => 4 * Math.PI * d.r ** 2, vol: d => 4 / 3 * Math.PI * d.r ** 3, fa: 'م = ٤ ط نق²', fv: 'ح = ⁴⁄₃ ط نق³', curved: true },
  };
  const num = x => AR((+x).toFixed(2).replace(/\.?0+$/, ''));
  function solids(B) {
    let key = 'cube', d = {}, eng = null;
    const draw = () => { const s = SOL[key]; s.dims.forEach(([k, , v]) => { if (d[k] == null) d[k] = v; });
      B.innerHTML = `<div class="m3-pick" role="tablist">${Object.entries(SOL).map(([k, x]) => `<button data-s="${k}" class="${k === key ? 'on' : ''}">${x.n}</button>`).join('')}</div>
        <div class="m3-wrap" style="margin-top:10px"><canvas class="m3-cv" id="m3c" aria-label="مجسم ${esc(s.n)} — اسحب للتدوير أو استخدم الأسهم"></canvas><div class="m3-side">
          ${s.dims.map(([k, l]) => `<label class="field" style="margin:0"><span class="small">${l}: <b id="dv-${k}">${num(d[k])}</b></span><input type="range" min="0.5" max="3.5" step="0.1" value="${d[k]}" data-d="${k}" aria-label="${l}"></label>`).join('')}
          <div class="m3-facts"><b>${esc(s.n)}</b><span>الأوجه: <b>${AR(s.F)}</b>${s.curved ? ' (منها منحنية)' : ''} · الأحرف: <b>${AR(s.E)}</b> · الرؤوس: <b>${AR(s.Vx)}</b></span>${!s.curved ? `<span class="small muted">صيغة أويلر: و + ر − ح = ${AR(s.F)} + ${AR(s.Vx)} − ${AR(s.E)} = ${AR(s.F + s.Vx - s.E)}</span>` : ''}</div>
          <div class="m3-facts"><span class="f">${s.fa}</span><span>المساحة الكلية ≈ <b id="ar">${num(s.area(d))}</b> وحدة²</span><span class="f">${s.fv}</span><span>الحجم ≈ <b id="vo">${num(s.vol(d))}</b> وحدة³</span></div>
          <p class="small muted">اسحب المجسم لتدويره، أو استخدم الأسهم بعد التركيز عليه.</p></div></div>`;
      $$('[data-s]', B).forEach(b => b.onclick = () => { key = b.dataset.s; d = {}; if (eng) eng.stop(); draw(); });
      $$('[data-d]', B).forEach(r => r.oninput = () => { d[r.dataset.d] = +r.value; $('#dv-' + r.dataset.d, B).textContent = num(r.value); $('#ar', B).textContent = num(s.area(d)); $('#vo', B).textContent = num(s.vol(d)); });
      eng = engine($('#m3c', B), () => { const m = s.mesh(d); const mx = Math.max(...m.v.flat().map(Math.abs)); const k = 1.6 / mx; return { ...m, v: m.v.map(p => p.map(x => x * k)) }; });
    }; draw();
  }
  // ---------- الذرة ----------
  const EL = ['H|هيدروجين', 'He|هيليوم', 'Li|ليثيوم', 'Be|بيريليوم', 'B|بورون', 'C|كربون', 'N|نيتروجين', 'O|أكسجين', 'F|فلور', 'Ne|نيون', 'Na|صوديوم', 'Mg|مغنيسيوم', 'Al|ألومنيوم', 'Si|سيليكون', 'P|فوسفور', 'S|كبريت', 'Cl|كلور', 'Ar|أرغون', 'K|بوتاسيوم', 'Ca|كالسيوم'].map(x => x.split('|'));
  const MASS = [1, 4, 7, 9, 11, 12, 14, 16, 19, 20, 23, 24, 27, 28, 31, 32, 35, 40, 39, 40];
  const shells = z => { const cap = [2, 8, 8, 2], out = []; let r = z; for (const c of cap) { if (r <= 0) break; out.push(Math.min(c, r)); r -= c; } return out; };
  function atom(B) {
    let z = 6, t0 = performance.now(), alive = true;
    const draw = () => { const sh = shells(z), [sym, nm] = EL[z - 1], n = MASS[z - 1] - z;
      B.innerHTML = `<div class="m3-wrap"><canvas class="m3-cv" id="atc" aria-label="نموذج ذرة ${esc(nm)}"></canvas><div class="m3-side"><label class="field" style="margin:0"><span class="small">العنصر (العدد الذري): <b>${AR(z)}</b></span><input type="range" min="1" max="20" value="${z}" id="atz" aria-label="العدد الذري"></label>
        <div class="m3-facts"><b style="font-size:26px">${sym} — ${esc(nm)}</b><span>البروتونات: <b>${AR(z)}</b> · النيوترونات: <b>${AR(n)}</b> · الإلكترونات: <b>${AR(z)}</b></span><span>العدد الكتلي ≈ <b>${AR(MASS[z - 1])}</b></span><span>التوزيع الإلكتروني: <b dir="ltr">${sh.map(AR).join(' , ')}</b></span><span>إلكترونات التكافؤ: <b>${AR(sh[sh.length - 1])}</b> · الدورة: <b>${AR(sh.length)}</b></span></div><p class="small muted">نموذج بور تبسيطي لأغراض تعليمية.</p></div></div>`;
      $('#atz', B).oninput = e => { z = +e.target.value; draw(); };
      const cv = $('#atc', B), ctx = cv.getContext('2d'); const fit = () => { const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); }; fit();
      const loop = now => { if (!document.body.contains(cv)) return; const W = cv.clientWidth, H = cv.clientHeight, cx = W / 2, cy = H / 2, R0 = Math.min(W, H) * .12, step = Math.min(W, H) * .1; ctx.clearRect(0, 0, W, H);
        // النواة
        const nn = z + n; for (let i = 0; i < nn; i++) { const a = i * 2.4, rr = Math.sqrt(i) * R0 / Math.sqrt(nn) * .9; ctx.beginPath(); ctx.arc(cx + rr * Math.cos(a), cy + rr * Math.sin(a), R0 * .2, 0, 7); const mn = Math.min(z, n), pr = i < 2 * mn ? i % 2 === 0 : z > n; ctx.fillStyle = pr ? '#E0675A' : '#9CC4E4'; ctx.fill(); }
        ctx.fillStyle = '#fff'; ctx.font = `900 ${R0 * .6}px 'GE SS Two'`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(sym, cx, cy);
        sh.forEach((ne, k) => { const r = R0 + step * (k + 1); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.strokeStyle = 'rgba(186,223,147,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
          const sp = RM() ? 0 : (now - t0) / 1000 * (0.9 / (k + 1)); for (let e = 0; e < ne; e++) { const a = sp + e / ne * Math.PI * 2; ctx.beginPath(); ctx.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), 6, 0, 7); ctx.fillStyle = '#3AB1DB'; ctx.shadowColor = '#3AB1DB'; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0; } });
        requestAnimationFrame(loop); };
      requestAnimationFrame(loop); };
    draw();
  }
  // ---------- المجموعة الشمسية ----------
  const PL = [['عطارد', '#B7B0A6', .39, 88, 'أقرب كوكب للشمس وأصغرها، بلا أقمار.'], ['الزهرة', '#E8C27A', .72, 225, 'أشد الكواكب حرارة بسبب غلافها الجوي الكثيف.'], ['الأرض', '#3AB1DB', 1, 365, 'الكوكب الوحيد المعروف بوجود الحياة، له قمر واحد.'], ['المريخ', '#E0675A', 1.52, 687, 'الكوكب الأحمر، به أعلى بركان في المجموعة الشمسية.'], ['المشتري', '#D9A066', 2.2, 4333, 'أكبر الكواكب، كوكب غازي له عشرات الأقمار.'], ['زحل', '#E6CF8B', 2.75, 10759, 'تميّزه حلقاته الجميلة من الجليد والصخور.'], ['أورانوس', '#9FE0E6', 3.3, 30687, 'يدور على جانبه، كوكب جليدي عملاق.'], ['نبتون', '#4C6FE0', 3.8, 60190, 'أبعد الكواكب وأشدها رياحاً.']];
  function solar(B) {
    let sel = 2, speed = 1;
    B.innerHTML = `<div class="m3-wrap"><canvas class="m3-cv" id="slc" aria-label="المجموعة الشمسية"></canvas><div class="m3-side"><div class="m3-pick">${PL.map((p, i) => `<button data-p="${i}" class="${i === sel ? 'on' : ''}">${p[0]}</button>`).join('')}</div><div class="m3-facts" id="slf"></div><label class="field" style="margin:0"><span class="small">سرعة الحركة</span><input type="range" min="0" max="5" step="0.5" value="1" id="sls" aria-label="السرعة"></label><p class="small muted">المسافات والأحجام غير مطابقة للواقع لتظهر كلها في الشاشة.</p></div></div>`;
    const info = () => { const p = PL[sel]; $('#slf', B).innerHTML = `<b style="font-size:20px"><span style="color:${p[1]};text-shadow:0 0 1px #082B5A">●</span> ${p[0]}</b><span>البعد عن الشمس ≈ <b>${AR(p[2] === 2.2 ? 5.2 : p[2] === 2.75 ? 9.5 : p[2] === 3.3 ? 19.2 : p[2] === 3.8 ? 30.1 : p[2])}</b> وحدة فلكية</span><span>السنة = <b>${AR(p[3].toLocaleString('en'))}</b> يوماً أرضياً</span><span>${p[4]}</span>`; $$('[data-p]', B).forEach(b => b.classList.toggle('on', +b.dataset.p === sel)); };
    $$('[data-p]', B).forEach(b => b.onclick = () => { sel = +b.dataset.p; info(); }); $('#sls', B).oninput = e => speed = +e.target.value; info();
    const cv = $('#slc', B), ctx = cv.getContext('2d'); const fit = () => { const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1; cv.width = r.width * d; cv.height = r.height * d; ctx.setTransform(d, 0, 0, d, 0, 0); }; fit();
    let t = 0, last = performance.now(); const pos = [];
    cv.onclick = e => { const r = cv.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top; const k = pos.findIndex(p => Math.hypot(p[0] - x, p[1] - y) < 16); if (k >= 0) { sel = k; info(); } };
    const loop = now => { if (!document.body.contains(cv)) return; t += (now - last) / 1000 * (RM() ? 0 : speed); last = now; const W = cv.clientWidth, H = cv.clientHeight, cx = W / 2, cy = H / 2, unit = Math.min(W / 2, H / 2 / .55) / 4.1; ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < 70; i++) { ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect((i * 97) % W, (i * 53) % H, 1.2, 1.2); }
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 26); g.addColorStop(0, '#FFF6C2'); g.addColorStop(1, '#F2A93B'); ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 7); ctx.fillStyle = g; ctx.shadowColor = '#F2C14E'; ctx.shadowBlur = 30; ctx.fill(); ctx.shadowBlur = 0;
      PL.forEach((p, i) => { const r = p[2] * unit + 20; ctx.beginPath(); ctx.ellipse(cx, cy, r, r * .55, 0, 0, 7); ctx.strokeStyle = i === sel ? 'rgba(186,223,147,.8)' : 'rgba(255,255,255,.15)'; ctx.lineWidth = i === sel ? 2 : 1; ctx.stroke();
        const a = t * (365 / p[3]) * 1.2 + i; const x = cx + r * Math.cos(a), y = cy + r * .55 * Math.sin(a); pos[i] = [x, y]; const sz = [3, 5, 5.5, 4, 11, 9.5, 7, 7][i];
        ctx.beginPath(); ctx.arc(x, y, sz, 0, 7); ctx.fillStyle = p[1]; ctx.fill(); if (i === 5) { ctx.beginPath(); ctx.ellipse(x, y, sz * 2, sz * .6, -.3, 0, 7); ctx.strokeStyle = '#E6CF8B'; ctx.stroke(); }
        if (i === sel) { ctx.fillStyle = '#fff'; ctx.font = "800 13px 'GE SS Two'"; ctx.textAlign = 'center'; ctx.fillText(p[0], x, y - sz - 6); } });
      requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }

  function open(tab) {
    const m = A.modal(`<h3 style="margin-top:0">المجسمات التفاعلية</h3><div class="m3-tabs fm-tabs"><button data-t="solids">المجسمات الهندسية</button><button data-t="atom">نموذج الذرة</button><button data-t="solar">المجموعة الشمسية</button></div><div id="m3B"></div>`, { cls: 'wide' });
    const go = t => { $$('[data-t]', m.el).forEach(b => b.classList.toggle('on', b.dataset.t === t)); const B = m.el.querySelector('#m3B'); B.innerHTML = ''; ({ solids, atom, solar })[t](B); };
    $$('[data-t]', m.el).forEach(b => b.onclick = () => go(b.dataset.t)); go(tab || 'solids');
  }
  A.models3d = open;
  const prev = V.labs;
  if (prev) V.labs = function (root) { const r = prev.apply(this, arguments); if (A.tfeat('models3d')) { const c = document.createElement('div'); c.className = 'card'; c.style.marginBottom = '12px'; c.innerHTML = `<div class="head" style="margin:0"><div class="grow"><h3 style="margin:0">المجسمات التفاعلية</h3><p class="sub" style="margin:4px 0 0">مجسمات هندسية بأبعاد قابلة للتغيير، ونموذج الذرة، والمجموعة الشمسية — تعمل دون إنترنت ومناسبة للسبورة الذكية.</p></div><div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-m3="solids">المجسمات الهندسية</button><button class="btn ghost sm" data-m3="atom">الذرة</button><button class="btn ghost sm" data-m3="solar">المجموعة الشمسية</button></div></div>`; root.prepend(c); $$('[data-m3]', c).forEach(b => b.onclick = () => open(b.dataset.m3)); } return r; };
})();
