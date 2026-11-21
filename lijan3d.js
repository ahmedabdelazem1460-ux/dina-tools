/* منصة دينا — محرك كروكي اللجان ثلاثي الأبعاد (مشترك: المنصة + lijan.html)
   window.DinaLijan:
   - map(rooms, opts)  → SVG متساوي القياس للمباني والأدوار واللجان (الباب على واجهة الممر يميناً أو يساراً)
   - room(room, opts)  → SVG متساوي القياس للجنة من الداخل: السبورة، الباب، المقاعد مرقّمة، وتمييز مقعد طالب
   - seats(room)       → مواقع المقاعد بترتيب الترقيم [{r,c,x,y}]
   - top(rooms, opts)  → مخطط علوي ثنائي الأبعاد للدور (للتحرير بالسحب)
   تعريف الغرفة: {name, w, d, x, y, f (الدور), b (المبنى), door 'r'|'l' (اللجنة يمين الداخل أو يساره),
     board 'near'|'far' (السبورة بجانب الباب أو مقابلها), rows, cols, from 'door'|'far', snake, color}
   كل النصوص تُهرَّب؛ لا يعتمد على المنصة. */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const C30 = Math.cos(Math.PI / 6), FONT = "GE SS Two, Tajawal, Arial, sans-serif";
  const PAL = ['#005499', '#3AB1DB', '#2E8B57', '#C9A44C', '#7E62C2', '#E0675A', '#0E7C86', '#5B6B7D'];
  const DEF = { w: 4, d: 3, x: 0, y: 0, f: 0, b: 0, door: 'r', board: 'near', rows: 5, cols: 4, from: 'door', snake: false };
  const norm = r => { const o = Object.assign({}, DEF); Object.entries(r || {}).forEach(([k, v]) => { if (v != null && v !== '') o[k] = v; }); ['w', 'd', 'x', 'y', 'f', 'b', 'rows', 'cols'].forEach(k => o[k] = +o[k] || (k === 'w' || k === 'd' || k === 'rows' || k === 'cols' ? DEF[k] : 0)); return o; };

  function shade(hex, k) { // k>0 أفتح، k<0 أغمق
    const n = parseInt(String(hex || '#005499').slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = v => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
    return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
  }
  function proj(s, ox, oy) { return (x, y, z) => [ox + (x - y) * C30 * s, oy + (x + y) * 0.5 * s - z * s]; }
  const pts = a => a.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
  function box(P, x, y, z, w, d, h, col, o) {
    o = o || {}; const T = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
    const L = [P(x, y + d, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x, y + d, z + h)];
    const R = [P(x + w, y, z), P(x + w, y + d, z), P(x + w, y + d, z + h), P(x + w, y, z + h)];
    const st = o.stroke || shade(col, -0.45), sw = o.sw || 1;
    return `<polygon points="${pts(L)}" fill="${o.left || shade(col, -0.12)}" stroke="${st}" stroke-width="${sw}" stroke-linejoin="round"/>` +
      `<polygon points="${pts(R)}" fill="${o.right || shade(col, -0.3)}" stroke="${st}" stroke-width="${sw}" stroke-linejoin="round"/>` +
      `<polygon points="${pts(T)}" fill="${o.top || shade(col, 0.35)}" stroke="${st}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  }
  function bounds(list) { let a = [Infinity, Infinity, -Infinity, -Infinity]; list.forEach(p => { a[0] = Math.min(a[0], p[0]); a[1] = Math.min(a[1], p[1]); a[2] = Math.max(a[2], p[0]); a[3] = Math.max(a[3], p[1]); }); return a; }

  // ============ المقاعد ============
  // الصفوف (rows) تُعدّ من السبورة، والأعمدة (cols) عبر عرض الغرفة؛ الترقيم يبدأ من الصف الأقرب للسبورة
  function geom(r) {
    r = norm(r); const R = Math.max(1, +r.rows || 1), Cn = Math.max(1, +r.cols || 1);
    const L = 1.8 + R * 1.45 + 0.7, D = Cn * 1.35 + 0.9; // الطول (باتجاه السبورة) والعمق (من الجدار البعيد إلى الممر)
    // الباب على جدار الممر (y=D). «r» = اللجنة على يمين الداخل ← الباب عند الطرف الأيسر (x صغير)
    const doorX = r.door === 'l' ? L - 1.5 : 0.3;
    const boardAtStart = (r.board === 'far') ? (r.door === 'l') : (r.door !== 'l'); // السبورة عند x=0 أو x=L
    return { r, R, Cn, L, D, doorX, boardAtStart };
  }
  function seats(room) {
    const g = geom(room), out = [];
    for (let i = 0; i < g.R; i++) {
      let cols = Array.from({ length: g.Cn }, (_, j) => j);
      const nearDoor = g.r.from !== 'far'; if (nearDoor) cols.reverse(); // الأقرب للممر أولاً
      if (g.r.snake && i % 2) cols.reverse();
      cols.forEach(j => { const xr = 1.8 + i * 1.45 + 0.25; out.push({ r: i, c: j, x: g.boardAtStart ? xr : g.L - xr - 0.9, y: 0.45 + j * 1.35 }); });
    }
    return out;
  }

  // ============ الغرفة من الداخل ============
  function room(rm, o) {
    o = o || {}; const g = geom(rm), r = g.r, col = r.color || '#005499', s = o.scale || 34;
    const P0 = proj(s, 0, 0), raw = [[0, 0, 0], [g.L, 0, 0], [g.L, g.D, 0], [0, g.D, 0], [0, 0, 2.6], [g.L, 0, 2.6], [0, g.D, 2.6], [g.doorX + 0.6, g.D + 3.2, 0], [g.doorX - 1.6, g.D + 3.2, 0], [g.doorX + 2.6, g.D + 3.2, 0]].map(p => P0(...p)), bb = bounds(raw);
    const pad = 26, W = Math.ceil(bb[2] - bb[0] + pad * 2), H = Math.ceil(bb[3] - bb[1] + pad * 2 + 34), P = proj(s, pad - bb[0], pad - bb[1] + 4);
    const SEATS = seats(r), labels = o.labels || [], hl = o.highlight == null ? -1 : +o.highlight, used = o.count == null ? SEATS.length : +o.count;
    const g2 = [];
    g2.push(`<defs><linearGradient id="lj-fl${o.id || ''}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F4F7FB"/><stop offset="1" stop-color="#E2EAF4"/></linearGradient></defs>`);
    // الأرضية
    g2.push(`<polygon points="${pts([P(0, 0, 0), P(g.L, 0, 0), P(g.L, g.D, 0), P(0, g.D, 0)])}" fill="url(#lj-fl${o.id || ''})" stroke="#9FB6D2" stroke-width="1.2"/>`);
    for (let x = 1; x < g.L; x += 1) g2.push(`<line x1="${P(x, 0, 0)[0]}" y1="${P(x, 0, 0)[1]}" x2="${P(x, g.D, 0)[0]}" y2="${P(x, g.D, 0)[1]}" stroke="#D8E2EF" stroke-width=".6"/>`);
    // الجداران البعيدان (y=0 و x=0)
    g2.push(`<polygon points="${pts([P(0, 0, 0), P(g.L, 0, 0), P(g.L, 0, 2.6), P(0, 0, 2.6)])}" fill="${shade(col, 0.82)}" stroke="#9FB6D2"/>`);
    g2.push(`<polygon points="${pts([P(0, 0, 0), P(0, g.D, 0), P(0, g.D, 2.6), P(0, 0, 2.6)])}" fill="${shade(col, 0.74)}" stroke="#9FB6D2"/>`);
    // نوافذ على الجدار البعيد
    for (let x = 1.6; x < g.L - 1; x += 2.6) g2.push(`<polygon points="${pts([P(x, 0, 1.1), P(x + 1.5, 0, 1.1), P(x + 1.5, 0, 2.1), P(x, 0, 2.1)])}" fill="#CFE9F7" stroke="#84B7E3"/>`);
    // السبورة
    if (g.boardAtStart) g2.push(`<polygon points="${pts([P(0, g.D * 0.18, 0.95), P(0, g.D * 0.82, 0.95), P(0, g.D * 0.82, 2.05), P(0, g.D * 0.18, 2.05)])}" fill="#1E3A2F" stroke="#0E2219" stroke-width="2"/>`
      + (() => { const c = P(0, g.D / 2, 1.5); return `<text x="${c[0]}" y="${c[1]}" fill="#fff" font-size="${s * 0.36}" font-family="${FONT}" font-weight="700" text-anchor="middle" dominant-baseline="middle">السبورة</text>`; })());
    else { const a = P(g.L, g.D * 0.18, 0.02), b = P(g.L, g.D * 0.82, 0.02), c = P(g.L, g.D / 2, 0); g2.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#1E3A2F" stroke-width="7" stroke-linecap="round"/><text x="${c[0] + 8}" y="${c[1] + 16}" fill="#1E3A2F" font-size="${s * 0.34}" font-family="${FONT}" font-weight="700">السبورة</text>`); }
    // طاولة الملاحظ قرب السبورة
    const tx = g.boardAtStart ? 0.55 : g.L - 1.55; g2.push(box(P, tx, g.D * 0.36, 0, 1, g.D * 0.28, 0.75, '#8B6B4A'));
    // المقاعد (ترتيب الرسم: الأبعد أولاً)
    const order = SEATS.map((p, k) => ({ p, k })).sort((a, b) => (a.p.x + a.p.y) - (b.p.x + b.p.y));
    order.forEach(({ p, k }) => {
      const on = k === hl, empty = k >= used, c0 = on ? '#C9A44C' : empty ? '#C9D5E4' : col;
      g2.push(`<g class="lj-seat${on ? ' lj-on' : ''}" data-k="${k}">` + box(P, p.x, p.y, 0, 0.9, 0.85, 0.62, c0, { sw: on ? 2 : 1 }));
      const t = P(p.x + 0.45, p.y + 0.42, 0.62), lab = labels[k] != null ? labels[k] : (empty ? '' : AR(k + 1));
      if (lab !== '') g2.push(`<text x="${t[0]}" y="${t[1] + 1}" font-size="${s * (String(lab).length > 3 ? 0.27 : 0.34)}" font-weight="800" fill="${on ? '#3B2A00' : '#fff'}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT}" paint-order="stroke" stroke="${on ? '#F6E7B8' : shade(c0, -0.35)}" stroke-width="2">${esc(lab)}</text>`);
      if (on) { const top = P(p.x + 0.45, p.y + 0.42, 1.7); g2.push(`<g class="lj-pin"><path d="M${top[0]} ${top[1] + 18} l-9 -14 a11 11 0 1 1 18 0z" fill="#E0675A" stroke="#fff" stroke-width="2"/><circle cx="${top[0]}" cy="${top[1] - 3}" r="4" fill="#fff"/></g>`); }
      g2.push('</g>');
    });
    // جدار الممر (منخفض شفاف) مع فتحة الباب
    const d0 = g.doorX, d1 = g.doorX + 1.2;
    const low = (x0, x1) => `<polygon points="${pts([P(x0, g.D, 0), P(x1, g.D, 0), P(x1, g.D, 0.45), P(x0, g.D, 0.45)])}" fill="${shade(col, 0.6)}" fill-opacity=".85" stroke="#7F9CC0"/>`;
    if (d0 > 0.01) g2.push(low(0, d0)); g2.push(low(d1, g.L));
    g2.push(`<polygon points="${pts([P(g.L, 0, 0), P(g.L, g.D, 0), P(g.L, g.D, 0.45), P(g.L, 0, 0.45)])}" fill="${shade(col, 0.5)}" fill-opacity=".8" stroke="#7F9CC0"/>`);
    // الباب: فتحة + ضلفة مفتوحة + سهم الدخول
    const dA = P(d0, g.D, 0), dB = P(d1, g.D, 0), dC = P(d0, g.D + 0.95, 0);
    g2.push(`<path d="M${dA[0]} ${dA[1]} L${dC[0]} ${dC[1]}" stroke="#2E8B57" stroke-width="4" stroke-linecap="round"/><path d="M${dB[0]} ${dB[1]} Q${(dB[0] + dC[0]) / 2 + 6} ${(dB[1] + dC[1]) / 2 + 10} ${dC[0]} ${dC[1]}" fill="none" stroke="#2E8B57" stroke-width="1.5" stroke-dasharray="4 3"/>`);
    const e1 = P(d0 + 0.6, g.D + 2.2, 0), e2 = P(d0 + 0.6, g.D + 0.25, 0);
    g2.push(`<defs><marker id="lj-ar${o.id || ''}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#2E8B57"/></marker></defs><line x1="${e1[0]}" y1="${e1[1]}" x2="${e2[0]}" y2="${e2[1]}" stroke="#2E8B57" stroke-width="3.5" marker-end="url(#lj-ar${o.id || ''})"/><text x="${e1[0]}" y="${e1[1] + 16}" font-size="${s * 0.36}" font-weight="800" fill="#2E8B57" text-anchor="middle" font-family="${FONT}">الباب — الدخول</text>`);
    if (o.title !== false) g2.push(`<text x="${W / 2}" y="${H - 8}" font-size="15" font-weight="800" fill="#082B5A" text-anchor="middle" font-family="${FONT}">${esc(r.name || '')}${o.sub ? ' · ' + esc(o.sub) : ''}</text>`);
    return `<svg class="lj-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="direction:ltr" role="img" aria-label="${esc('مخطط ' + (r.name || 'اللجنة') + (hl >= 0 ? ' — المقعد ' + AR(hl + 1) : ''))}">${g2.join('')}</svg>`;
  }

  // ============ خريطة المبنى ============
  const RH = 1.8; // ارتفاع الدور وارتفاع اللجنة
  function map(rooms, o) {
    o = o || {}; const s = o.scale || 22, L = (rooms || []).map((r, i) => Object.assign({ i }, norm(r))).filter(r => o.building == null || +r.b === +o.building);
    const marks = (o.marks || []).filter(m => o.building == null || +(m.b || 0) === +o.building);
    if (!L.length && !marks.length) return '';
    const floors = [...new Set(L.map(r => +r.f).concat(marks.map(m => +(m.f || 0))))].sort((a, b) => a - b);
    const X = Math.max(8, ...L.map(r => r.x + r.w), ...marks.map(m => (m.x || 0) + 1)) + 1, Y = Math.max(5, ...L.map(r => r.y + r.d), ...marks.map(m => (m.y || 0) + 1)) + 3;
    const FH = (X + Y + 2) * 0.5 + RH + 1.6; // أدوار مفصولة رأسياً لا يغطي أحدها الآخر
    const zOf = f => floors.indexOf(f) * FH;
    const P0 = proj(s, 0, 0), corners = []; floors.forEach(f => [[-1, -1], [X, -1], [X, Y], [-1, Y]].forEach(([x, y]) => { corners.push(P0(x, y, zOf(f))); corners.push(P0(x, y, zOf(f) + RH + 2.4)); }));
    const bb = bounds(corners), pad = 20, W = Math.ceil(bb[2] - bb[0] + pad * 2), H = Math.ceil(bb[3] - bb[1] + pad * 2), P = proj(s, pad - bb[0], pad - bb[1]);
    const hl = o.highlight == null ? -1 : +o.highlight, fnm = o.floorName || (f => f === 0 ? 'الدور الأرضي' : 'الدور ' + ['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'][f] || 'الدور ' + AR(f));
    const g = [];
    floors.forEach(f => {
      const z = zOf(f);
      g.push(`<polygon points="${pts([P(-1, -1, z), P(X, -1, z), P(X, Y, z), P(-1, Y, z)])}" fill="${f ? '#EEF3FA' : '#E4EBF5'}" fill-opacity="1" stroke="#9FB6D2" stroke-width="1.2"/>`);
      // الممر أمام اللجان
      const cy = Math.max(...L.filter(r => +r.f === f).map(r => r.y + r.d), 4);
      g.push(`<polygon points="${pts([P(-1, cy, z), P(X, cy, z), P(X, cy + 1.6, z), P(-1, cy + 1.6, z)])}" fill="#F9F3E3" stroke="#E2D2A6" stroke-dasharray="4 3"/>`);
      const ct = P(X - 2, cy + 0.8, z); g.push(`<text x="${ct[0]}" y="${ct[1]}" font-size="${s * 0.5}" fill="#8A5A12" font-family="${FONT}" text-anchor="middle" dominant-baseline="middle">الممر</text>`);
      const lb = P(-1, Y, z); g.push(`<text x="${lb[0] + 6}" y="${lb[1] + 18}" font-size="${s * 0.62}" font-weight="800" fill="#082B5A" font-family="${FONT}">${esc(fnm(f))}</text>`);
      marks.filter(m => +(m.f || 0) === f).forEach(m => { const c = P((m.x || 0) + 0.5, (m.y || 0) + 0.5, z + 0.6); g.push(box(P, m.x || 0, m.y || 0, z, 1, 1, 0.6, '#5B6B7D') + `<text x="${c[0]}" y="${c[1] - 8}" font-size="${s * 0.55}" font-weight="700" fill="#33475B" text-anchor="middle" font-family="${FONT}" paint-order="stroke" stroke="#fff" stroke-width="3">${esc((m.icon || '') + ' ' + (m.label || ''))}</text>`); });
      L.filter(r => +r.f === f).sort((a, b) => (a.x + a.y) - (b.x + b.y)).forEach(r => {
        const on = r.i === hl, dim = hl >= 0 && !on, col = on ? '#C9A44C' : (r.color || PAL[r.i % PAL.length]);
        g.push(`<g class="lj-room${on ? ' lj-on' : ''}" data-i="${r.i}" style="cursor:${o.clickable ? 'pointer' : 'default'}" ${dim ? 'opacity=".5"' : ''}>` + box(P, r.x, r.y, z, r.w, r.d, RH, col, { sw: on ? 2.4 : 1.2 }));
        // الباب على واجهة الممر (y+d)
        const dx = r.door === 'l' ? r.x + r.w - 1.15 : r.x + 0.35, dp = [P(dx, r.y + r.d, z), P(dx + 0.8, r.y + r.d, z), P(dx + 0.8, r.y + r.d, z + RH * 0.78), P(dx, r.y + r.d, z + RH * 0.78)];
        g.push(`<polygon points="${pts(dp)}" fill="#2E8B57" stroke="#1C5C39"/><circle cx="${P(dx + 0.65, r.y + r.d, z + RH * 0.4)[0]}" cy="${P(dx + 0.65, r.y + r.d, z + RH * 0.4)[1]}" r="1.8" fill="#F6E7B8"/>`);
        // نوافذ صغيرة
        for (let wx = r.x + (r.door === 'l' ? 0.4 : 1.5); wx < r.x + r.w - (r.door === 'l' ? 1.4 : 0.4) - 0.6; wx += 1.1) g.push(`<polygon points="${pts([P(wx, r.y + r.d, z + RH * 0.45), P(wx + 0.65, r.y + r.d, z + RH * 0.45), P(wx + 0.65, r.y + r.d, z + RH * 0.8), P(wx, r.y + r.d, z + RH * 0.8)])}" fill="#CFE9F7" stroke="${shade(col, -0.4)}" stroke-width=".6"/>`);
        const c = P(r.x + r.w / 2, r.y + r.d / 2, z + RH), nm = r.name || ('لجنة ' + AR(r.i + 1));
        g.push(`<text x="${c[0]}" y="${c[1] - 2}" font-size="${s * (nm.length > 12 ? 0.52 : 0.64)}" font-weight="800" fill="${on ? '#3B2A00' : '#082B5A'}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT}" paint-order="stroke" stroke="#fff" stroke-width="3.5">${esc(nm)}</text>`);
        if (o.sub && o.sub[r.i]) g.push(`<text x="${c[0]}" y="${c[1] + s * 0.62}" font-size="${s * 0.46}" font-weight="700" fill="#33475B" text-anchor="middle" font-family="${FONT}" paint-order="stroke" stroke="#fff" stroke-width="3">${esc(o.sub[r.i])}</text>`);
        if (on) { const t = P(r.x + r.w / 2, r.y + r.d / 2, z + RH + 2.2); g.push(`<g class="lj-pin"><path d="M${t[0]} ${t[1] + 22} l-11 -17 a13 13 0 1 1 22 0z" fill="#E0675A" stroke="#fff" stroke-width="2"/><circle cx="${t[0]}" cy="${t[1] - 2}" r="5" fill="#fff"/></g>`); }
        g.push('</g>');
      });
    });
    return `<svg class="lj-svg lj-map" xmlns="http://www.w3.org/2000/svg" style="direction:ltr" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(o.label || 'كروكي اللجان')}">${g.join('')}</svg>`;
  }

  // ============ مخطط علوي للتحرير ============
  function top(rooms, o) {
    o = o || {}; const u = o.unit || 34, GX = o.cols || 24, GY = o.rows || 12, sel = o.selected == null ? -1 : +o.selected;
    const L = (rooms || []).map((r, i) => Object.assign({ i }, norm(r))).filter(r => +r.f === +(o.floor || 0) && +r.b === +(o.building || 0));
    const g = [`<rect width="${GX * u}" height="${GY * u}" fill="#fff"/>`];
    for (let x = 0; x <= GX; x++) g.push(`<line x1="${x * u}" y1="0" x2="${x * u}" y2="${GY * u}" stroke="#E4EBF5"/>`);
    for (let y = 0; y <= GY; y++) g.push(`<line x1="0" y1="${y * u}" x2="${GX * u}" y2="${y * u}" stroke="#E4EBF5"/>`);
    (o.marks || []).filter(m => +(m.f || 0) === +(o.floor || 0) && +(m.b || 0) === +(o.building || 0)).forEach(m => g.push(`<g class="lj-tm" data-m="${m.k}"><rect x="${m.x * u + 2}" y="${m.y * u + 2}" width="${u - 4}" height="${u - 4}" rx="6" fill="#5B6B7D"/><text x="${m.x * u + u / 2}" y="${m.y * u + u / 2 + 1}" font-size="${u * 0.5}" text-anchor="middle" dominant-baseline="middle">${esc(m.icon || '•')}</text></g>`));
    L.forEach(r => {
      const col = r.color || PAL[r.i % PAL.length], on = r.i === sel;
      g.push(`<g class="lj-tr" data-i="${r.i}" style="cursor:move"><rect x="${r.x * u + 2}" y="${r.y * u + 2}" width="${r.w * u - 4}" height="${r.d * u - 4}" rx="7" fill="${shade(col, 0.75)}" stroke="${on ? '#C9A44C' : col}" stroke-width="${on ? 4 : 2}"/>`);
      const dx = r.door === 'l' ? (r.x + r.w - 1.15) * u : (r.x + 0.35) * u; g.push(`<rect x="${dx}" y="${(r.y + r.d) * u - 6}" width="${0.8 * u}" height="8" rx="2" fill="#2E8B57"/>`);
      g.push(`<text x="${(r.x + r.w / 2) * u}" y="${(r.y + r.d / 2) * u}" font-size="${Math.min(15, u * 0.44)}" font-weight="800" fill="${shade(col, -0.4)}" text-anchor="middle" dominant-baseline="middle" font-family="${FONT}">${esc(r.name || '')}</text>`);
      g.push(`<rect class="lj-rz" data-z="${r.i}" x="${(r.x + r.w) * u - 12}" y="${(r.y + r.d) * u - 12}" width="11" height="11" rx="2" fill="${col}" style="cursor:nwse-resize"/></g>`);
    });
    g.push(`<text x="${GX * u - 8}" y="${GY * u - 8}" font-size="12" fill="#5F7896" text-anchor="end" font-family="${FONT}">الخط الأخضر = الباب على جهة الممر</text>`);
    return `<svg class="lj-top" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GX * u} ${GY * u}" data-u="${u}" role="application" aria-label="مخطط الدور — اسحب اللجان لتغيير مواقعها">${g.join('')}</svg>`;
  }

  window.DinaLijan = { map, room, seats, top, geom, shade, norm, PAL, AR, esc };
})();
