/* منصة دينا — أدوات عرض مشتركة:
   - التاريخ بالعربية من اليمين لليسار في كل حقول التاريخ (اليوم الشهر السنة) دون تغيير قيمة الحقل.
   - نافذة تفاصيل موحّدة تُفتح عند الضغط على أي رقم (بحث، طباعة بهوية دينا، Excel).
   - رسم بياني احترافي للحضور (أعمدة مزدوجة متدرجة + خط نسبة الحضور) يُقرأ من اليمين لليسار. */
(function () {
  const A = window.APP; if (!A) return;
  const { esc, AR } = A;
  const MON = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const WD = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  // «٨ نوفمبر ٢٠٢٦» أو مع اسم اليوم — نص عربي يُقرأ من اليمين: اليوم ثم الشهر ثم السنة
  A.arDate = (iso, withDay) => { if (!iso) return ''; const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number); if (!y) return ''; const wd = new Date(y, m - 1, d, 12).getDay(); return `${withDay ? WD[wd] + ' ' : ''}${AR(d)} ${MON[m - 1]} ${AR(y)}`; };
  A.arDateShort = iso => { if (!iso) return ''; const [, m, d] = String(iso).slice(0, 10).split('-').map(Number); return `${AR(d)} ${MON[m - 1]}`; };

  const css = `
  .dz-dt{position:relative;display:inline-block;max-width:100%;vertical-align:middle}
  .dz-dt.blk{display:block}
  .dz-dt.has>input[type=date]{color:transparent}
  .dz-dt.has>input[type=date]::-webkit-datetime-edit{color:transparent}
  .dz-dl{position:absolute;inset-block:0;inset-inline-start:38px;display:flex;align-items:center;pointer-events:none;direction:rtl;font:inherit;color:#082B5A;white-space:nowrap;overflow:hidden}
  .dz-dt:not(.has) .dz-dl{display:none}
  .pal-k button.k,.rp2-k button.k{font:inherit;text-align:start;width:100%;display:block}
  .dd-k{cursor:pointer;transition:transform .15s,box-shadow .15s,border-color .15s;position:relative}
  .dd-k:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(8,43,90,.12);border-color:#3AB1DB!important}
  .dd-k:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}
  .dd-k::after{content:'التفاصيل ‹';position:absolute;inset-inline-end:10px;bottom:6px;font-size:11px;color:#3AB1DB;opacity:0;transition:opacity .15s}
  .dd-k:hover::after,.dd-k:focus-visible::after{opacity:1}
  .dd-n{cursor:pointer;color:#005499;text-decoration:underline dotted;text-underline-offset:3px;background:none;border:0;font:inherit;padding:0}
  .dd-n:hover{color:#C53030}
  .dd-m .dd-bar{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}
  .dd-m table td,.dd-m table th{white-space:nowrap}
  .ach{border:1px solid #DCE7F3;border-radius:16px;padding:14px 14px 6px;background:linear-gradient(180deg,#fff,#F7FAFE);margin:10px 0}
  .ach-h{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px}
  .ach-h h3{margin:0;color:#082B5A;font-size:16px}
  .ach-lg{display:flex;gap:12px;flex-wrap:wrap;font-size:12.5px;color:#43597A}
  .ach-lg i{display:inline-block;width:12px;height:12px;border-radius:4px;margin-inline-end:5px;vertical-align:-2px}
  .ach-lg i.ln{height:3px;border-radius:2px;vertical-align:3px;width:16px}
  .ach svg .bx{cursor:pointer;transition:opacity .15s}.ach svg .bx:hover{opacity:.8}
  .ach svg .grow{animation:achG .9s cubic-bezier(.2,.8,.2,1) both;transform-box:fill-box;transform-origin:bottom}
  @keyframes achG{from{transform:scaleY(0)}}
  @media (prefers-reduced-motion:reduce){.ach svg .grow{animation:none}}
  .ach-one{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;align-items:stretch}
  .ach-st{height:22px;display:flex;border-radius:99px;overflow:hidden;background:#E4EBF5;margin:6px 0 10px}
  .ach-st span{display:block;height:100%}`;
  if (!document.getElementById('app52css')) { const st = document.createElement('style'); st.id = 'app52css'; st.textContent = css; document.head.appendChild(st); }

  // ---------- حقول التاريخ: عرض عربي من اليمين لليسار ----------
  const VD = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  function decorate(inp) {
    if (inp.dataset.rtld || !inp.parentNode) return; inp.dataset.rtld = '1';
    const w = document.createElement('span'); w.className = 'dz-dt';
    const cs = getComputedStyle(inp); if (cs.display === 'block' || (inp.style.width === '' && inp.style.maxWidth === '' && cs.width && inp.parentNode && inp.parentNode.classList && inp.parentNode.classList.contains('field'))) w.classList.add('blk');
    if (inp.style.maxWidth) w.style.maxWidth = inp.style.maxWidth; if (inp.style.width) w.style.width = inp.style.width;
    inp.parentNode.insertBefore(w, inp); w.appendChild(inp);
    const l = document.createElement('span'); l.className = 'dz-dl'; l.setAttribute('aria-hidden', 'true'); w.appendChild(l);
    const up = () => { const v = VD.get.call(inp); if (v) { l.style.maxWidth = Math.max(60, (inp.offsetWidth || 170) - 52) + 'px'; l.textContent = A.arDate(v); w.classList.add('has'); if (l.scrollWidth > l.clientWidth + 1) { const [y, m, d] = v.split('-').map(Number); l.textContent = `${AR(d)}‏/‏${AR(m)}‏/‏${AR(y)}`; } l.title = A.arDate(v, true); } else { l.textContent = ''; w.classList.remove('has'); } };
    Object.defineProperty(inp, 'value', { configurable: true, get() { return VD.get.call(this); }, set(v) { VD.set.call(this, v); up(); } });
    inp.addEventListener('input', up); inp.addEventListener('change', up);
    inp.addEventListener('click', () => { try { inp.showPicker && inp.showPicker(); } catch (_) { } });
    up(); requestAnimationFrame(up);
  }
  const scan = root => (root.querySelectorAll ? root.querySelectorAll('input[type=date]:not([data-rtld])') : []).forEach(decorate);
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.matches && n.matches('input[type=date]')) decorate(n); else scan(n); } }))).observe(document.documentElement, { childList: true, subtree: true });
  if (document.body) scan(document.body);

  // ---------- نافذة التفاصيل الموحدة ----------
  // o = { title, sub, cols:[عناوين], rows:[{ cells:[html], q:'نص البحث', x:{كائن Excel} }], empty }
  A.attDrill = function (o) {
    const rows = o.rows || [];
    const tbl = list => list.length ? `<div class="scroll" style="max-height:60vh"><table class="tbl"><thead><tr><th>#</th>${o.cols.map(c => `<th>${c}</th>`).join('')}</tr></thead><tbody>${list.map((r, i) => `<tr><td>${AR(i + 1)}</td>${r.cells.map(c => `<td>${c == null || c === '' ? '—' : c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : A.emptyBox(o.empty || 'لا توجد بيانات');
    const m = A.modal(`<div class="dd-m"><h3>${esc(o.title)}</h3>${o.sub ? `<p class="sub">${o.sub}</p>` : ''}
      <div class="dd-bar"><span class="pill st-approved">${A.cnt(rows.length, 'سجل', 'سجلات')}</span>${rows.length > 6 ? '<input class="in" id="ddQ" placeholder="بحث" style="max-width:220px;padding:6px 10px" aria-label="بحث في التفاصيل">' : ''}<button class="btn ghost sm" id="ddP" type="button">${A.I.print || ''} طباعة</button><button class="btn ghost sm" id="ddX" type="button">${A.I.down || ''} Excel</button></div>
      <div id="ddB">${tbl(rows)}</div></div>`, { cls: 'wide' });
    const B = m.el.querySelector('#ddB'); let cur = rows;
    const q = m.el.querySelector('#ddQ'); if (q) q.oninput = () => { const v = A.normKey ? A.normKey(q.value) : q.value; cur = !v ? rows : rows.filter(r => (A.normKey ? A.normKey(r.q || '') : (r.q || '')).includes(v)); B.innerHTML = tbl(cur); };
    m.el.querySelector('#ddP').onclick = () => A.printDoc(o.title, (o.sub || '').replace(/<[^>]+>/g, ''), tbl(cur).replace(/max-height:60vh/, ''), o.cols.length > 6);
    m.el.querySelector('#ddX').onclick = () => { if (!window.XLSX) return; const data = cur.map((r, i) => r.x || Object.fromEntries(o.cols.map((c, k) => [c.replace(/<[^>]+>/g, ''), String(r.cells[k] == null ? '' : r.cells[k]).replace(/<[^>]+>/g, '')]))); const ws = XLSX.utils.json_to_sheet(data.length ? data : [{ '': 'لا بيانات' }]); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'التفاصيل'); wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, `${o.title.replace(/[\\/:*?"<>|]/g, '-')}.xlsx`); };
    return m;
  };

  // ---------- رسم الحضور: أعمدة مزدوجة متدرجة + خط النسبة ----------
  // pts = [{ d:'YYYY-MM-DD', a: غياب يومي, p: غياب حصص, r: نسبة الحضور أو null }]، onPick(d)
  A.attChart = function (el, pts, onPick) {
    if (!el) return;
    if (!pts.length) { el.innerHTML = '<p class="small muted">لا رصد في هذه الفترة.</p>'; return; }
    const lg = `<div class="ach-lg"><span><i style="background:linear-gradient(#E05252,#9B1C1C)"></i>غياب يومي</span><span><i style="background:linear-gradient(#F6A957,#C0661A)"></i>غياب حصص</span><span><i class="ln" style="background:#2E8B57"></i>نسبة الحضور</span></div>`;
    if (pts.length === 1) {
      const x = pts[0];
      el.innerHTML = `<div class="ach"><div class="ach-h"><h3>${esc(A.arDate(x.d, true))}</h3>${lg}</div><div class="ach-one">
        <button type="button" class="k dd-k" data-pd="${x.d}" style="border:1px solid #F3C9C9;border-radius:14px;padding:12px;background:#FFF5F5;text-align:start;font:inherit"><span style="color:#9B1C1C;font-size:13px">غياب يومي</span><b style="display:block;font-size:34px;color:#C53030">${AR(x.a)}</b></button>
        <button type="button" class="k dd-k" data-pd="${x.d}" style="border:1px solid #F6DDBF;border-radius:14px;padding:12px;background:#FFF9F1;text-align:start;font:inherit"><span style="color:#9A4A0B;font-size:13px">غياب حصص</span><b style="display:block;font-size:34px;color:#E0822B">${AR(x.p)}</b></button>
        <div style="border:1px solid #CFE8DA;border-radius:14px;padding:12px;background:#F3FBF6"><span style="color:#1F6B44;font-size:13px">نسبة الحضور</span><b style="display:block;font-size:34px;color:#2E8B57">${x.r == null ? '—' : AR(x.r) + '٪'}</b><div class="ach-st"><span style="width:${x.r || 0}%;background:linear-gradient(90deg,#2E8B57,#69C08E)"></span><span style="flex:1;background:linear-gradient(90deg,#E05252,#C53030)"></span></div></div></div>
        <p class="small muted" style="margin:6px 0">اختر فترة أطول من «الفترة» لعرض الاتجاه عبر الأيام.</p></div>`;
      el.querySelectorAll('[data-pd]').forEach(b => b.onclick = () => onPick && onPick(b.dataset.pd));
      return;
    }
    const n = pts.length, H = 270, band = 64, padT = 22 + band, padB = 46, padX = 34, slot = Math.max(38, Math.min(70, 760 / n)), W = padX * 2 + slot * n;
    const mx = Math.max(1, ...pts.map(p => Math.max(p.a, p.p)));
    const nice = mx <= 5 ? 5 : mx <= 10 ? 10 : Math.ceil(mx / 5) * 5;
    const rs = pts.filter(p => p.r != null).map(p => p.r), rMin = Math.max(0, Math.min(...rs.concat([100])) - 5);
    const y = v => padT + (H - padT - padB) * (1 - v / nice), yr = r => 14 + (band - 22) * (1 - (r - rMin) / Math.max(1, 100 - rMin));
    // من اليمين لليسار: أقدم يوم على اليمين
    const cx = i => W - padX - slot * (i + .5);
    const bw = Math.min(16, slot / 3.2);
    const grid = [0, .25, .5, .75, 1].map(f => { const v = Math.round(nice * f), yy = y(v); return `<line x1="${padX}" x2="${W - padX}" y1="${yy}" y2="${yy}" stroke="#E4EBF5" stroke-dasharray="${f ? '4 4' : ''}"/><text x="${W - padX + 6}" y="${yy + 4}" font-size="10" fill="#8AA0BC" text-anchor="start">${AR(v)}</text>`; }).join('');
    const bars = pts.map((p, i) => { const x0 = cx(i);
      return `<g class="bx" data-pd="${p.d}" tabindex="0" role="button" aria-label="${esc(A.arDate(p.d, true))}: غياب يومي ${p.a}، غياب حصص ${p.p}"><title>${A.arDate(p.d, true)}\nغياب يومي: ${p.a}\nغياب حصص: ${p.p}${p.r == null ? '' : '\nنسبة الحضور: ' + p.r + '٪'}</title>
        <rect x="${x0 - slot / 2 + 2}" y="${padT - 6}" width="${slot - 4}" height="${H - padT - padB + 6}" fill="transparent"/>
        <rect class="grow" x="${x0 + 1}" y="${y(p.a)}" width="${bw}" height="${Math.max(0, H - padB - y(p.a))}" rx="${Math.min(6, bw / 2)}" fill="url(#gA)" style="animation-delay:${i * 40}ms"/>
        <rect class="grow" x="${x0 - bw - 1}" y="${y(p.p)}" width="${bw}" height="${Math.max(0, H - padB - y(p.p))}" rx="${Math.min(6, bw / 2)}" fill="url(#gP)" style="animation-delay:${i * 40 + 20}ms"/>
        ${p.a ? `<text x="${x0 + 1 + bw / 2}" y="${y(p.a) - 5}" font-size="10.5" font-weight="700" text-anchor="middle" fill="#9B1C1C">${AR(p.a)}</text>` : ''}
        <text x="${x0}" y="${H - padB + 16}" font-size="10.5" text-anchor="middle" fill="#43597A">${esc(A.arDateShort(p.d))}</text>
        <text x="${x0}" y="${H - padB + 30}" font-size="9.5" text-anchor="middle" fill="#8AA0BC">${esc(WD[A.parseDate(p.d).getDay()] || '')}</text></g>`; }).join('');
    const rp = pts.map((p, i) => p.r == null ? null : [cx(i), yr(p.r), p.r]).filter(Boolean);
    const line = rp.length > 1 ? `<path d="M${rp.map(q => q[0] + ' ' + q[1]).join(' L')}" fill="none" stroke="#2E8B57" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` : '';
    const dots = rp.map(q => `<circle cx="${q[0]}" cy="${q[1]}" r="4" fill="#fff" stroke="#2E8B57" stroke-width="2"><title>نسبة الحضور ${q[2]}٪</title></circle><text x="${q[0]}" y="${q[1] - 8}" font-size="9.5" text-anchor="middle" fill="#1F6B44">${AR(q[2])}٪</text>`).join('');
    const bandBg = `<rect x="${padX}" y="4" width="${W - padX * 2}" height="${band - 6}" rx="10" fill="#F1F9F4"/><text x="${W - padX + 6}" y="${band / 2 + 4}" font-size="10" fill="#2E8B57" text-anchor="start">٪</text>`;
    el.innerHTML = `<div class="ach"><div class="ach-h"><h3>الغياب ونسبة الحضور حسب اليوم</h3>${lg}</div><div class="scroll"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="max-width:none;display:block;margin-inline-start:auto" role="img" aria-label="رسم الغياب حسب اليوم">
      <defs><linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F06A6A"/><stop offset="1" stop-color="#9B1C1C"/></linearGradient><linearGradient id="gP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6B26B"/><stop offset="1" stop-color="#C0661A"/></linearGradient></defs>
      ${bandBg}${grid}${bars}${line}${dots}</svg></div><p class="small muted" style="margin:4px 0 6px">اضغط على أي يوم لعرض غائبيه. الخط الأخضر نسبة الحضور اليومي (من ١٠٠٪).</p></div>`;
    el.querySelectorAll('[data-pd]').forEach(g => { const go = () => onPick && onPick(g.dataset.pd); g.onclick = go; g.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; });
  };
})();
