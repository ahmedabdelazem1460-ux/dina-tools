/* منصة دينا — محرر الكروكي (رسم مبسّط لمواقع المدرسة)
   مستطيلات بأسماء (مبانٍ، ساحات)، خطوط وأسهم، نصوص، ودبابيس مرقّمة للمواقع — يُحفظ كصورة PNG مع إمكانية إعادة التعديل. */
(function () {
  const A = window.APP; if (!A) return;
  const { $, $$, esc, AR } = A;
  const W = 1000, H = 640, COLS = ['#082B5A', '#005499', '#3AB1DB', '#2F855A', '#C9A44C', '#E0675A', '#AE95DA', '#5B6B7D'];
  const TOOLS = [['sel', 'تحديد ونقل'], ['rect', 'مستطيل / مبنى'], ['line', 'خط'], ['arrow', 'سهم'], ['text', 'نص'], ['pin', 'موقع مرقّم']];
  A.sketchEditor = function (init, places, onSave) {
    let S = JSON.parse(JSON.stringify(init || [])), tool = 'rect', col = COLS[1], sel = -1, hist = [], drag = null;
    const push = () => { hist.push(JSON.stringify(S)); if (hist.length > 60) hist.shift(); };
    const m = A.modal(`<h3>رسم كروكي المدرسة</h3><p class="sub">ارسم المباني والساحات، وضع دبابيس مرقّمة على مواقع الإشراف والمناوبة. اسحب لرسم المستطيل أو الخط، واضغط لوضع نص أو موقع.</p>
      <div class="sk-bar" role="toolbar" aria-label="أدوات الرسم">${TOOLS.map(([k, n]) => `<button type="button" class="btn ghost sm" data-tl="${k}" aria-pressed="false">${n}</button>`).join('')}
        <span class="sk-cols">${COLS.map(c => `<button type="button" data-cl="${c}" style="background:${c}" aria-label="لون"></button>`).join('')}</span>
        <button type="button" class="btn ghost sm" id="skU">تراجع</button><button type="button" class="btn ghost sm" id="skD">حذف المحدد</button><button type="button" class="btn ghost sm" id="skX">مسح الكل</button></div>
      <div class="sk-wrap"><svg id="skS" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="الكروكي"></svg></div>
      <div class="row" style="gap:6px;margin-top:6px;flex-wrap:wrap"><input class="in" id="skL" placeholder="اسم العنصر المحدد (مبنى، ساحة، موقع…)" style="max-width:320px" list="skPl"><datalist id="skPl">${(places || []).map(p => `<option value="${esc(p)}">`).join('')}</datalist><span class="small muted" id="skH"></span></div>
      <div class="acts"><button class="btn ok" id="skSv">حفظ الكروكي</button></div>`, { cls: 'wide xl' });
    const svg = m.el.querySelector('#skS'), lab = m.el.querySelector('#skL');
    const pt = ev => { const r = svg.getBoundingClientRect(), p = ev.touches ? ev.touches[0] : ev; return { x: Math.round((p.clientX - r.left) / r.width * W), y: Math.round((p.clientY - r.top) / r.height * H) }; };
    const pinN = () => S.filter(s => s.t === 'pin').length + 1;
    const render = () => {
      const g = [`<defs><pattern id="skg" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#E4EBF5" stroke-width="1"/></pattern><marker id="ska" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs><rect width="${W}" height="${H}" fill="#fff"/><rect width="${W}" height="${H}" fill="url(#skg)"/>`];
      S.forEach((s, i) => { const on = i === sel ? ' stroke-dasharray="6 4"' : '';
        if (s.t === 'rect') g.push(`<g data-i="${i}"><rect x="${Math.min(s.x, s.x + s.w)}" y="${Math.min(s.y, s.y + s.h)}" width="${Math.abs(s.w)}" height="${Math.abs(s.h)}" rx="8" fill="${s.c}22" stroke="${s.c}" stroke-width="3"${on}/>${s.l ? `<text x="${s.x + s.w / 2}" y="${s.y + s.h / 2}" text-anchor="middle" dominant-baseline="middle" font-size="20" font-weight="700" fill="${s.c}" font-family="GE SS Two, sans-serif">${esc(s.l)}</text>` : ''}</g>`);
        else if (s.t === 'line' || s.t === 'arrow') g.push(`<g data-i="${i}"><line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="${s.c}" stroke-width="4" stroke-linecap="round"${s.t === 'arrow' ? ' marker-end="url(#ska)"' : ''}${on}/><line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="transparent" stroke-width="16"/></g>`);
        else if (s.t === 'text') g.push(`<g data-i="${i}"><text x="${s.x}" y="${s.y}" text-anchor="middle" font-size="${s.s || 22}" font-weight="700" fill="${s.c}" font-family="GE SS Two, sans-serif"${i === sel ? ' text-decoration="underline"' : ''}>${esc(s.l || 'نص')}</text></g>`);
        else if (s.t === 'pin') g.push(`<g data-i="${i}"><circle cx="${s.x}" cy="${s.y}" r="17" fill="${s.c}" stroke="#fff" stroke-width="3"${on}/><text x="${s.x}" y="${s.y + 1}" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="800" fill="#fff" font-family="GE SS Two, sans-serif">${AR(s.n)}</text>${s.l ? `<text x="${s.x}" y="${s.y + 34}" text-anchor="middle" font-size="15" font-weight="700" fill="${s.c}" font-family="GE SS Two, sans-serif" paint-order="stroke" stroke="#fff" stroke-width="4">${esc(s.l)}</text>` : ''}</g>`); });
      if (drag && drag.ghost) g.push(drag.ghost);
      svg.innerHTML = g.join('');
      $$('[data-tl]', m.el).forEach(b => { const on = b.dataset.tl === tool; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
      lab.value = sel >= 0 ? (S[sel].l || '') : ''; lab.disabled = sel < 0 || !['rect', 'text', 'pin'].includes((S[sel] || {}).t);
      m.el.querySelector('#skH').textContent = `${AR(S.filter(s => s.t === 'pin').length)} موقع مرقّم · ${AR(S.length)} عنصر`;
    };
    const hit = ev => { const g = ev.target.closest && ev.target.closest('[data-i]'); return g ? +g.dataset.i : -1; };
    const down = ev => { ev.preventDefault(); const p = pt(ev);
      if (tool === 'sel') { sel = hit(ev); if (sel >= 0) { push(); drag = { mode: 'move', p, o: JSON.parse(JSON.stringify(S[sel])) }; } render(); return; }
      if (tool === 'text') { push(); S.push({ t: 'text', x: p.x, y: p.y, c: col, l: lab.value.trim() || 'نص', s: 22 }); sel = S.length - 1; tool = 'sel'; render(); lab.focus(); return; }
      if (tool === 'pin') { push(); S.push({ t: 'pin', x: p.x, y: p.y, c: col, n: pinN(), l: (places || [])[pinN() - 1] || '' }); sel = S.length - 1; render(); lab.focus(); return; }
      drag = { mode: tool, p };
    };
    const move = ev => { if (!drag) return; ev.preventDefault(); const p = pt(ev);
      if (drag.mode === 'move') { const s = S[sel], dx = p.x - drag.p.x, dy = p.y - drag.p.y, o = drag.o; if (s.t === 'rect' || s.t === 'text' || s.t === 'pin') { s.x = o.x + dx; s.y = o.y + dy; } else { s.x1 = o.x1 + dx; s.x2 = o.x2 + dx; s.y1 = o.y1 + dy; s.y2 = o.y2 + dy; } render(); return; }
      const a = drag.p; drag.ghost = drag.mode === 'rect' ? `<rect x="${Math.min(a.x, p.x)}" y="${Math.min(a.y, p.y)}" width="${Math.abs(p.x - a.x)}" height="${Math.abs(p.y - a.y)}" rx="8" fill="${col}22" stroke="${col}" stroke-width="3" stroke-dasharray="6 4"/>` : `<line x1="${a.x}" y1="${a.y}" x2="${p.x}" y2="${p.y}" stroke="${col}" stroke-width="4" stroke-dasharray="6 4"/>`; drag.end = p; render(); };
    const up = () => { if (!drag) return; const d = drag; drag = null; if (d.mode === 'move' || !d.end) { render(); return; } const a = d.p, b = d.end;
      if (Math.abs(b.x - a.x) + Math.abs(b.y - a.y) < 12) { render(); return; } push();
      if (d.mode === 'rect') S.push({ t: 'rect', x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y), c: col, l: '' });
      else S.push({ t: d.mode, x1: a.x, y1: a.y, x2: b.x, y2: b.y, c: col });
      sel = S.length - 1; render(); if (d.mode === 'rect') lab.focus(); };
    svg.addEventListener('mousedown', down); svg.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    svg.addEventListener('touchstart', down, { passive: false }); svg.addEventListener('touchmove', move, { passive: false }); svg.addEventListener('touchend', up);
    $$('[data-tl]', m.el).forEach(b => b.onclick = () => { tool = b.dataset.tl; render(); });
    $$('[data-cl]', m.el).forEach(b => b.onclick = () => { col = b.dataset.cl; if (sel >= 0) { push(); S[sel].c = col; } render(); });
    lab.oninput = () => { if (sel >= 0) { S[sel].l = lab.value; render(); lab.focus(); } };
    m.el.querySelector('#skU').onclick = () => { if (hist.length) { S = JSON.parse(hist.pop()); sel = -1; render(); } };
    m.el.querySelector('#skD').onclick = () => { if (sel >= 0) { push(); S.splice(sel, 1); sel = -1; let n = 1; S.forEach(s => { if (s.t === 'pin') s.n = n++; }); render(); } };
    m.el.querySelector('#skX').onclick = async () => { if (!S.length || await A.confirmBox('مسح كل الرسم؟', 'مسح')) { push(); S = []; sel = -1; render(); } };
    document.addEventListener('keydown', function kd(e) { if (!document.body.contains(svg)) return document.removeEventListener('keydown', kd); if ((e.key === 'Delete' || e.key === 'Backspace') && document.activeElement !== lab && sel >= 0) m.el.querySelector('#skD').click(); });
    m.el.querySelector('#skSv').onclick = e => A.run(e.currentTarget, async () => {
      sel = -1; render(); const xml = new XMLSerializer().serializeToString(svg).replace('<svg', `<svg width="${W}" height="${H}"`);
      const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml); await img.decode();
      const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; const x = c.getContext('2d'); x.scale(2, 2); x.drawImage(img, 0, 0);
      const blob = await new Promise(r => c.toBlob(r, 'image/png')); const file = new File([blob], 'kroki.png', { type: 'image/png' });
      await onSave(file, S); m.close();
    });
    render();
  };
})();
