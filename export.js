/* قالب تصدير الخطة الأسبوعية — هوية دينا (معتمد 2026-10-26)
   منقول من مسار التصدير المعتمد (build_html2) مع ضبط تلقائي لكل صفحة */
(function () {
  const AR = s => String(s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hasAr = s => /[؀-ۿ]/.test(s || '');
  const clean = s => String(s ?? '').split(/\s+/).join(' ').trim().replace(/\s*->\s*/g, ' ← ');
  const ar = s => esc(AR(clean(s)));
  const iso = d => `<span dir="ltr" style="unicode-bidi:isolate;display:inline-block">${esc(AR(d))}</span>`;
  const NAVY = '#082B5A', SKY = '#3AB1DB', BLUE = '#005499';
  const ARNUM = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١', '١٢'];
  const PERIODS = TPL.PERIODS.concat(['الحصة الثامنة', 'الحصة التاسعة']).map(p => p.replace('الحصة ', ''));
  const PERIODS_FULL = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة'];
  const DAYS = TPL.DAYS;

  const fmt = (t, o) => t.replace(/\{(\w+)\}/g, (_, k) => o[k]);
  const pin = st => fmt(TPL.SVG_PIN, { st });
  const quad = st => fmt(TPL.SVG_QUAD, { st });
  const flower = (st, stroke = SKY, sw = 1.0, op = 1) => fmt(TPL.FLOWER, { st, stroke, sw, op });
  const star = (st, fill = 'none', stroke = NAVY, sw = 2.14) =>
    `<svg viewBox="394 184 62 62" style="${st}"><path fill="${fill}" stroke="${stroke}" stroke-width="${sw}" d="${TPL.STAR_ABS}"/></svg>`;
  const dots = (st, color = SKY) => {
    let c = ''; for (const y of [3, 15, 27]) for (const x of [3, 15.5, 28, 40.5]) c += `<circle cx="${x}" cy="${y}" r="2.2" fill="${color}"/>`;
    return `<svg viewBox="0 0 44 30" style="${st}">${c}</svg>`;
  };
  const icon = (k, size = 40, color = BLUE) =>
    `<svg viewBox="0 0 48 48" style="width:${size}px;height:${size}px" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">${TPL.ICON[k]}</svg>`;

  const FONTS = `
@font-face{font-family:'Tajawal';font-weight:500;src:url(fonts/tajawal-arabic-500-normal.woff2) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF,U+200C-200E}
@font-face{font-family:'Tajawal';font-weight:700;src:url(fonts/tajawal-arabic-700-normal.woff2) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF,U+200C-200E}
@font-face{font-family:'Tajawal';font-weight:800;src:url(fonts/tajawal-arabic-800-normal.woff2) format('woff2');unicode-range:U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF,U+200C-200E}
@font-face{font-family:'Tajawal';font-weight:500;src:url(fonts/tajawal-latin-500-normal.woff2) format('woff2')}
@font-face{font-family:'Tajawal';font-weight:700;src:url(fonts/tajawal-latin-700-normal.woff2) format('woff2')}
@font-face{font-family:'Tajawal';font-weight:800;src:url(fonts/tajawal-latin-800-normal.woff2) format('woff2')}
@font-face{font-family:'Source Sans 3';font-weight:400;src:url(fonts/source-sans-3-latin-400-normal.woff2) format('woff2')}
@font-face{font-family:'Source Sans 3';font-weight:600;src:url(fonts/source-sans-3-latin-600-normal.woff2) format('woff2')}
@font-face{font-family:'Source Sans 3';font-weight:700;src:url(fonts/source-sans-3-latin-700-normal.woff2) format('woff2')}
@font-face{font-family:'GE SS Two';font-weight:700;src:local('GE SS Two Bold'),local('GESSTwoBold-Bold')}
`;
  // GE SS Two يُستخدم تلقائياً إن كان مثبتاً على الجهاز، وإلا Tajawal
  const CSS = FONTS + TPL.CSS2.replace("font-family:'Tajawal'", "font-family:'GE SS Two','Tajawal'") +
    `@media screen{body{background:#cfd8e6}.page{margin:0 auto 18px;box-shadow:0 6px 24px rgba(8,43,90,.18)}}
     table.plan td.c{overflow-wrap:anywhere}
     .notes ul{list-style:none;padding:8px 18px 10px 16px}.notes li .bl{color:#3AB1DB;font-size:9px;vertical-align:middle;margin-inline-end:4px}`;

  const cell = (s, cls = '') => {
    s = clean(s);
    if (!s) return `<td class="dash ${cls}">–</td>`;
    if (hasAr(s)) return `<td class="${cls}">${ar(s)}</td>`;
    return `<td class="en ${cls}" dir="ltr">${esc(s)}</td>`;
  };
  const footer = t => `<div class="footline"></div><div class="foot"><div class="r">${t}</div>` +
    `<div class="l"><span style="letter-spacing:3px">Dinaaedu</span>&#160;&#160;&#160;&#160;${TPL.PHONE} <span style="letter-spacing:1px">920035881</span></div></div>`;
  const header = (week, info) => `<div class="topbar"></div><div class="hd1">الخطة الأسبوعية</div>` +
    `<div class="hd2">الأسبوع ${esc(week.word)} · ${esc(info.name)}</div>` +
    `<img class="abs" src="assets/logo.svg" style="top:26px;left:40px;width:150px">` +
    `<div class="rule"></div>`;

  function coverPage(info, week) {
    const p = [];
    p.push('<div class="page cover"><div class="topbar"></div>');
    p.push(pin('position:absolute;top:46px;left:48px;width:92px;height:92px'));
    p.push(star('position:absolute;top:150px;left:150px;width:28px;height:28px'));
    p.push(quad('position:absolute;top:58px;right:62px;width:34px;height:34px'));
    p.push(dots('position:absolute;top:112px;right:54px;width:44px;height:30px'));
    p.push('<img class="abs" src="assets/logo.svg" style="top:150px;left:262px;width:270px">');
    p.push('<div class="ctitle">الخطة الأسبوعية</div>');
    p.push('<div class="cdiv"><span></span>&#160;&#160;' + star('width:16px;height:16px;vertical-align:middle', SKY, SKY, 0) + '&#160;&#160;<span></span></div>');
    p.push(`<div class="csub">${esc(week.term)}</div>`);
    p.push('<div class="week">' + flower('position:absolute;top:-26px;left:-30px;width:120px;height:120px', SKY, 1.4, 0.35) +
      `<div class="w1">الأسبوع ${esc(week.word)}</div><div class="w2" dir="ltr">${iso(week.dates[0])}&#160;&#160;:&#160;&#160;${iso(week.dates[week.dates.length - 1])}</div></div>`);
    const cards = [['stage', 'المرحلة', info.stage], ['grade', 'الصف', info.grade_word], ['class', 'الفصل', info.class_label]];
    p.push('<table class="cards"><tr>' + cards.map(([k, l, v]) => `<td>${icon(k)}<div class="lb">${l}</div><div class="vl">${esc(v)}</div></td>`).join('') + '</tr></table>');
    p.push(flower('position:absolute;bottom:20px;left:-60px;width:300px;height:300px', SKY, 0.9));
    p.push(flower('position:absolute;bottom:110px;right:70px;width:86px;height:86px', '#5E9BD3', 1.6));
    p.push(dots('position:absolute;bottom:92px;right:176px;width:33px;height:23px', NAVY));
    p.push(footer(`${TPL.PIN} جدة - حي الفلاح - شارع عبدالله الخزرجي`) + '</div>');
    return p.join('');
  }

  function dayPage(info, week, di, day, notes, rowH, fs) {
    const p = [];
    p.push(`<div class="page day" data-fit="${di}">` + header(week, info));
    p.push('<div class="banner">' + flower('position:absolute;top:-22px;left:250px;width:128px;height:128px', '#FFFFFF', 1.3, 0.22) +
      `<div class="dl">اليوم</div><div class="dn">${DAYS[di]}</div>` +
      `<div class="chip">${TPL.CAL}<span class="t">التاريخ</span><span class="d">${iso(week.dates[di])}</span></div></div>`);
    p.push(`<div class="body"><div class="tw"><table class="plan" style="--rh:${rowH}px"><colgroup><col style="width:13%"><col style="width:21%"><col style="width:36%"><col style="width:30%"></colgroup>` +
      '<tr><th>الحصة</th><th>المادة</th><th>الموضوع</th><th>الواجب</th></tr>');
    const tops = day.map(r => clean(r[1]));
    const merged = tops.length && tops.every(t => t === tops[0]) && tops[0] && tops[0].includes('إجازة');
    const st = `style="font-size:${fs}px;height:${rowH}px"`;
    day.forEach(([s, t, h], k) => {
      const per = `<td class="per" style="height:${rowH}px"><div class="n">${ARNUM[k]}</div><div class="w">${PERIODS_FULL[k]}</div></td>`;
      const cls = k % 2 ? ' class="alt"' : '';
      if (merged) p.push(`<tr${cls}>${per}` + (k === 0 ? `<td class="merged" colspan="3" rowspan="${day.length}">${ar(t)}</td>` : '') + '</tr>');
      else p.push(`<tr${cls}>${per}` + [cell(s, 'c subj'), cell(t, 'c'), cell(h, 'c')].map(x => x.replace('<td ', `<td ${st} `)).join('') + '</tr>');
    });
    p.push('</table></div>');
    if (notes && notes.length) {
      const items = notes.map(([a, b]) => '<li><span class="bl">●</span> ' + (a ? `<b>${ar(a)}:</b> ` : '') + `${ar(b)}</li>`).join('');
      p.push(`<div class="notes"><div class="nh">${icon('note', 20, NAVY)} ملاحظات اليوم</div><ul>${items}</ul></div>`);
    }
    p.push('</div>');
    p.push(quad('position:absolute;bottom:92px;left:46px;width:30px;height:30px'));
    p.push(pin('position:absolute;bottom:86px;right:44px;width:44px;height:44px'));
    p.push(dots('position:absolute;bottom:96px;left:90px;width:33px;height:23px'));
    p.push(footer(esc(week.footer || 'الفصل الدراسي الأول · ١٤٤٨هـ')) + '</div>');
    return p.join('');
  }

  function extraPage(info, week, extra) {
    let p = `<div class="page day">` + header(week, info) +
      '<div class="banner">' + flower('position:absolute;top:-22px;left:250px;width:128px;height:128px', '#FFFFFF', 1.3, 0.22) +
      '<div class="dn" style="right:26px">ملاحظات وتنبيهات</div></div><div class="body">';
    for (const [a, b] of extra) p += '<div class="xn">' + (a ? `<div class="t">${ar(a)}</div>` : '') + `<div class="x">${ar(b)}</div></div>`;
    return p + '</div>' + footer(esc(week.footer || 'الفصل الدراسي الأول · ١٤٤٨هـ')) + '</div>';
  }

  const TRIES = [[88, 15], [78, 14], [70, 13.5], [62, 13], [56, 12], [50, 11.5], [46, 11]];
  const TRIES_N = [[74, 14.5], [66, 14], [60, 13], [54, 12.5], [50, 12], [46, 11.5], [42, 11]];

  // doc: {info, week:{word,term,dates[],footer}, days:[5][7][subj,topic,hw], dayNotes:[5][[title,text]], extra:[[title,text]]}
  function pagesHTML(doc, fits) {
    let h = coverPage(doc.info, doc.week);
    doc.days.forEach((day, di) => {
      const has = doc.dayNotes[di] && doc.dayNotes[di].length;
      const [rh, fs] = (has ? TRIES_N : TRIES)[fits ? fits[di] : 0];
      h += dayPage(doc.info, doc.week, di, day, doc.dayNotes[di], rh, fs);
    });
    if (doc.extra && doc.extra.length) h += extraPage(doc.info, doc.week, doc.extra);
    return h;
  }
  const shell = (body, title) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="${location.href.replace(/[^/]*$/, '')}"><title>${esc(title || '')}</title><style>${CSS}</style></head><body>${body}</body></html>`;

  async function renderInto(frame, doc, title) {
    const fits = doc.days.map(() => 0);
    const write = () => { const d = frame.contentDocument; d.open(); d.write(shell(pagesHTML(doc, fits), title)); d.close(); };
    write();
    await new Promise(r => frame.contentWindow.addEventListener('load', r, { once: true }));
    await frame.contentDocument.fonts.ready;
    for (let pass = 0; pass < TRIES.length; pass++) {
      let changed = false;
      frame.contentDocument.querySelectorAll('.page[data-fit]').forEach(pg => {
        const di = +pg.dataset.fit, body = pg.querySelector('.body');
        const bottom = body.getBoundingClientRect().bottom - pg.getBoundingClientRect().top;
        if (bottom > 1040 && fits[di] < TRIES.length - 1) { fits[di]++; changed = true; }
      });
      if (!changed) break;
      write();
      await new Promise(r => frame.contentWindow.addEventListener('load', r, { once: true }));
      await frame.contentDocument.fonts.ready;
    }
    return frame;
  }

  function makeFrame(visible) {
    const f = document.createElement('iframe');
    f.style.cssText = visible ? 'width:100%;height:100%;border:0;background:#cfd8e6' : 'position:fixed;left:-10000px;top:0;width:820px;height:1200px;border:0';
    return f;
  }

  // html2canvas لا يرسم SVG المضمّن بدقة: نحوله إلى صور قبل الالتقاط
  async function svgToImg(d) {
    const svgs = [...d.querySelectorAll('.page svg')];
    await Promise.all(svgs.map(svg => new Promise(res => {
      const r = svg.getBoundingClientRect(); const c = svg.cloneNode(true);
      c.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); c.setAttribute('width', r.width); c.setAttribute('height', r.height); c.removeAttribute('style');
      const img = d.createElement('img'); img.setAttribute('style', svg.getAttribute('style') || ''); img.style.width = r.width + 'px'; img.style.height = r.height + 'px';
      img.onload = img.onerror = () => res(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(c));
      svg.replaceWith(img);
    })));
  }
  async function toPdfBlob(doc, title) {
    const f = makeFrame(false); document.body.appendChild(f);
    try {
      await renderInto(f, doc, title);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ['px_scaling'], compress: true });
      await svgToImg(f.contentDocument);
      const pages = [...f.contentDocument.querySelectorAll('.page')];
      for (let i = 0; i < pages.length; i++) {
        const c = await html2canvas(pages[i], { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 820 });
        if (i) pdf.addPage([794, 1123], 'portrait');
        pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, 794, 1123, undefined, 'FAST');
      }
      pdf.setProperties({ title });
      return pdf.output('blob');
    } finally { f.remove(); }
  }

  window.PlanExport = { renderInto, makeFrame, toPdfBlob, pagesHTML, AR, PERIODS_FULL, DAYS };
})();
