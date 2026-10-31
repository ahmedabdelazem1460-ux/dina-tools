/* قوالب تصدير الخطة الأسبوعية — هوية مدارس دينا
   القالب الأساسي معتمد (2026-10-26) ومنقول من مسار التصدير build_html2.
   الخيارات: طولي/عرضي، موفّر للحبر، نظرة أسبوعية في صفحة واحدة، صفحات إضافية (وسام التميز، إعلانات، مهام أدائية، صفحة حرة). */
(function () {
  const AR = s => String(s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const RTLD = m => '\u200F' + m.split('/').join('\u200F/\u200F'); // تاريخ يُقرأ من اليمين: اليوم ثم الشهر ثم السنة

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const hasAr = s => /[؀-ۿ]/.test(s || '');
  const clean = s => String(s ?? '').split(/\s+/).join(' ').trim().replace(/\s*->\s*/g, ' ← ');
  const cleanML = s => String(s ?? '').split('\n').map(l => l.split(/\s+/).join(' ').trim()).join('\n').trim();
  const ar = s => esc(AR(clean(s)));
  const arML = s => esc(AR(cleanML(s)));
  const iso = d => `<span dir="rtl" style="unicode-bidi:isolate;display:inline-block">${esc(RTLD(AR(d)))}</span>`;
  const NAVY = '#082B5A', SKY = '#3AB1DB', BLUE = '#005499';
  const ARNUM = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩', '١٠', '١١', '١٢'];
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
@font-face{font-family:'GE SS Two';font-weight:300;font-display:swap;src:url(fonts/gess-two-light.woff2) format('woff2')}
@font-face{font-family:'GE SS Two';font-weight:400 500;font-display:swap;src:url(fonts/gess-two-medium.woff2) format('woff2')}
@font-face{font-family:'GE SS Two';font-weight:600 900;font-display:swap;src:url(fonts/gess-two-bold.woff2) format('woff2')}
@font-face{font-family:'Myriad Pro';font-weight:300 400;font-display:swap;src:url(fonts/myriad-pro-regular.woff2) format('woff2')}
@font-face{font-family:'Myriad Pro';font-weight:500 600;font-display:swap;src:url(fonts/myriad-pro-semibold.woff2) format('woff2')}
@font-face{font-family:'Myriad Pro';font-weight:700 900;font-display:swap;src:url(fonts/myriad-pro-bold.woff2) format('woff2')}
`;
  const BASE = FONTS + TPL.CSS2.replace("font-family:'Tajawal'", "font-family:'GE SS Two','Myriad Pro','Tajawal'").replace(/'Source Sans 3'/g, "'Myriad Pro','Source Sans 3'") + `
@media screen{body{background:#cfd8e6;padding:12px 0}.page{margin:0 auto 18px;box-shadow:0 6px 24px rgba(8,43,90,.18)}}
table.plan td.c{overflow-wrap:anywhere}
a.lnk{color:#005499;text-decoration:underline;text-underline-offset:2px;font-family:'Myriad Pro','Source Sans 3',sans-serif;unicode-bidi:isolate;word-break:break-all}
.notes ul{list-style:none;padding:8px 18px 10px 16px}.notes li .bl{color:#3AB1DB;font-size:9px;vertical-align:middle;margin-inline-end:4px}
/* ---- عرضي ---- */
.page.land{width:1123px;height:794px}
.land .hd1{top:26px}.land .hd2{top:62px}.land .rule{top:112px}
.land .banner{top:128px;left:40px;right:40px;width:auto;height:62px;border-radius:18px}
.land .banner .dl{top:23px}.land .banner .dn{top:12px;font-size:29px}
.land .chip{top:8px;height:46px;line-height:46px}
.land .body{top:206px;left:40px;right:40px;width:auto}
.land td.per{padding:2px 4px}.land td.per .n{font-size:17px;display:inline}.land td.per .w{font-size:12px;display:inline;margin:0 4px 0 0}
.land table.plan th{height:40px}.land table.plan td{padding:3px 10px}
/* ---- النظرة الأسبوعية ---- */
table.wk{width:100%;border-collapse:collapse;table-layout:fixed;direction:rtl}
table.wk th{background:#3AB1DB;color:#082B5A;font-weight:800;height:34px;font-size:13px;border-left:1px solid #fff}
table.wk th:first-child{border-start-start-radius:14px}table.wk th:last-child{border-start-end-radius:14px;border-left:0}
table.wk td{border-left:1px solid #84B7E3;border-bottom:1px solid #84B7E3;vertical-align:top;padding:5px 6px;text-align:center;line-height:1.35;font-weight:700}
table.wk td:last-child{border-left:0}
table.wk tr.alt td{background:#E4EBF5}
table.wk td.dy{background:#082B5A!important;color:#fff;vertical-align:middle;font-weight:800;border-bottom:1px solid #005499}
table.wk td.dy small{display:block;color:#3AB1DB;font-size:11px;font-weight:700;margin-top:2px}
table.wk .s{color:#082B5A;font-weight:800}
table.wk .t{color:#082B5A;font-weight:500}
table.wk .h{color:#005499;font-weight:700}
table.wk .h b{color:#3AB1DB}
table.wk td.hol{vertical-align:middle;font-size:18px;font-weight:800;background:#E4EBF5}
.wkwrap{border:1.5px solid #082B5A;border-radius:16px;overflow:hidden}
.wknotes{margin-top:10px;border:1.5px solid #3AB1DB;border-radius:14px;padding:6px 14px;font-size:12px;line-height:1.6;font-weight:500}
.wknotes b{color:#005499}
/* ---- صفحات إضافية ---- */
.xtitle{font-size:16px;font-weight:500;color:#005499;text-align:center;margin:0 0 14px;line-height:1.7;white-space:pre-line}
table.honor{width:100%;border-collapse:separate;border-spacing:12px;table-layout:fixed;margin:0 -12px}
table.honor td{background:#E4EBF5;border-radius:18px;padding:14px 14px 12px;text-align:center;vertical-align:top;position:relative}
table.honor .nm{font-size:20px;font-weight:800;color:#082B5A;margin-top:4px}
table.honor .rs{font-size:14px;font-weight:500;color:#005499;margin-top:4px;line-height:1.5}
.medal{text-align:center;margin:4px 0 6px}
table.tasks{width:100%;border-collapse:collapse;table-layout:fixed;direction:rtl}
table.tasks th{background:#3AB1DB;color:#082B5A;font-weight:800;height:44px;font-size:15px;border-left:1px solid #fff}
table.tasks td{border-left:1px solid #84B7E3;border-bottom:1px solid #84B7E3;padding:10px;text-align:center;font-size:14px;font-weight:700;line-height:1.5}
table.tasks td:last-child,table.tasks th:last-child{border-left:0}
table.tasks tr.alt td{background:#E4EBF5}
table.tasks td.sj{color:#082B5A;font-weight:800}table.tasks td.du{color:#005499}
/* ---- موفّر للحبر ---- */
body.ink .banner,body.ink .week{background:#fff!important;border:2px solid #082B5A}
body.ink .banner .dn,body.ink .week .w1{color:#082B5A}
body.ink .chip{background:#fff;border:1.5px solid #3AB1DB}
body.ink .foot{background:#fff;color:#082B5A;border-top:2px solid #082B5A}
body.ink .footline{display:none}
body.ink table.plan th,body.ink table.wk th,body.ink table.tasks th{background:#fff;border-bottom:2.5px solid #3AB1DB}
body.ink table.plan td.per{background:#fff!important;color:#082B5A;border-left:2px solid #082B5A}
body.ink td.per .n{color:#005499}
body.ink tr.alt td,body.ink table.wk td.hol,body.ink td.merged{background:#fff!important}
body.ink table.wk td.dy{background:#fff!important;color:#082B5A;border-left:2px solid #082B5A}
body.ink .cards td,body.ink table.honor td,body.ink .xn,body.ink .notes .nh{background:#fff;border:1.5px solid #84B7E3}
body.ink .topbar{background:#fff;border-bottom:3px solid #3AB1DB}
`;

  // الروابط: تبقى أرقامها لاتينية وتصبح قابلة للنقر في المعاينة والطباعة وملف PDF
  const URL_RE = /(https?:\/\/[^\s<>"'،]+|www\.[^\s<>"'،]+)/gi;
  const short = u => { const t = u.replace(/^https?:\/\//i, '').replace(/^www\./i, ''); return t.length > 38 ? t.slice(0, 36) + '…' : t; };
  const link = u => { const href = /^www\./i.test(u) ? 'https://' + u : u; return `<a class="lnk" href="${esc(href)}" target="_blank" rel="noopener" dir="ltr">${esc(short(u))}</a>`; };
  const withLinks = (s, f) => { URL_RE.lastIndex = 0; if (!URL_RE.test(s)) return f(s); URL_RE.lastIndex = 0; let out = '', i = 0, m; while ((m = URL_RE.exec(s))) { out += f(s.slice(i, m.index)) + link(m[0].replace(/[.,؛)]+$/, '')); i = m.index + m[0].replace(/[.,؛)]+$/, '').length; URL_RE.lastIndex = i; } return out + f(s.slice(i)); };
  const cell = (s, cls = '', st = '') => {
    s = clean(s);
    if (!s) return `<td class="dash ${cls}" ${st}>–</td>`;
    if (hasAr(s)) return `<td class="${cls}" ${st}>${withLinks(s, x => esc(AR(x)))}</td>`;
    return `<td class="en ${cls}" dir="ltr" ${st}>${withLinks(s, esc)}</td>`;
  };
  const txt = s => { s = clean(s); return !s ? '' : hasAr(s) ? withLinks(s, x => esc(AR(x))) : `<span class="en" dir="ltr">${withLinks(s, esc)}</span>`; };
  const footer = t => `<div class="footline"></div><div class="foot"><div class="r">${t}</div>` +
    `<div class="l"><span style="letter-spacing:3px">Dinaaedu</span>&#160;&#160;&#160;&#160;${TPL.PHONE} <span style="letter-spacing:1px">920035881</span></div></div>`;
  const header = (week, info, land) => `<div class="topbar"></div><div class="hd1">الخطة الأسبوعية</div>` +
    `<div class="hd2">الأسبوع ${esc(week.word)} · ${esc(info.name)}</div>` +
    `<img class="abs" src="assets/logo.svg" style="top:${land ? 20 : 26}px;left:40px;width:${land ? 130 : 150}px">` +
    `<div class="rule"></div>`;
  const pageFooter = (week, land) => (land ? '' : quad('position:absolute;bottom:92px;left:46px;width:30px;height:30px') +
    pin('position:absolute;bottom:86px;right:44px;width:44px;height:44px') + dots('position:absolute;bottom:96px;left:90px;width:33px;height:23px')) +
    footer(esc(week.footer || 'الفصل الدراسي الأول · ١٤٤٨هـ'));
  const banner = (land, inner) => '<div class="banner">' + flower(`position:absolute;top:-22px;left:${land ? 380 : 250}px;width:128px;height:128px`, '#FFFFFF', 1.3, 0.22) + inner + '</div>';

  function coverPage(info, week, land) {
    const W = land ? 1123 : 794, p = [];
    const y = land ? { logo: 60, title: 250, div: 322, sub: 344, week: 396, cards: 540 } : { logo: 150, title: 378, div: 458, sub: 484, week: 560, cards: 708 };
    p.push(`<div class="page cover ${land ? 'land' : ''}"><div class="topbar"></div>`);
    p.push(pin('position:absolute;top:46px;left:48px;width:92px;height:92px'));
    p.push(star('position:absolute;top:150px;left:150px;width:28px;height:28px'));
    p.push(quad('position:absolute;top:58px;right:62px;width:34px;height:34px'));
    p.push(dots('position:absolute;top:112px;right:54px;width:44px;height:30px'));
    p.push(`<img class="abs" src="assets/logo.svg" style="top:${y.logo}px;left:${(W - 270) / 2}px;width:270px">`);
    p.push(`<div class="ctitle" style="top:${y.title}px">الخطة الأسبوعية</div>`);
    p.push(`<div class="cdiv" style="top:${y.div}px"><span></span>&#160;&#160;` + star('width:16px;height:16px;vertical-align:middle', SKY, SKY, 0) + '&#160;&#160;<span></span></div>');
    p.push(`<div class="csub" style="top:${y.sub}px">${esc(week.term)}</div>`);
    p.push(`<div class="week" style="top:${y.week}px;left:${(W - 470) / 2}px">` + flower('position:absolute;top:-26px;left:-30px;width:120px;height:120px', SKY, 1.4, 0.35) +
      `<div class="w1">الأسبوع ${esc(week.word)}</div><div class="w2" dir="rtl">${iso(week.dates[0])}&#160;&#160;:&#160;&#160;${iso(week.dates[week.dates.length - 1])}</div></div>`);
    const cards = [['stage', 'المرحلة', info.stage], ['grade', 'الصف', info.grade_word], ['class', 'الفصل', info.class_label]];
    p.push(`<table class="cards" style="top:${y.cards}px;left:${(W - 654) / 2}px">` + '<tr>' + cards.map(([k, l, v]) => `<td>${icon(k)}<div class="lb">${l}</div><div class="vl">${esc(v)}</div></td>`).join('') + '</tr></table>');
    p.push(flower(`position:absolute;bottom:20px;left:-60px;width:${land ? 240 : 300}px;height:${land ? 240 : 300}px`, SKY, 0.9));
    p.push(flower('position:absolute;bottom:110px;right:70px;width:86px;height:86px', '#5E9BD3', 1.6));
    p.push(dots('position:absolute;bottom:92px;right:176px;width:33px;height:23px', NAVY));
    p.push(footer(`${TPL.PIN} جدة - حي الفلاح - شارع عبدالله الخزرجي`) + '</div>');
    return p.join('');
  }

  function dayPage(info, week, di, day, notes, rowH, fs, land) {
    const p = [];
    p.push(`<div class="page day ${land ? 'land' : ''}" data-fit="${di}">` + header(week, info, land));
    p.push(banner(land, `<div class="dl">اليوم</div><div class="dn">${DAYS[di]}</div>` +
      `<div class="chip">${TPL.CAL}<span class="t">التاريخ</span><span class="d">${iso(week.dates[di])}</span></div>`));
    p.push(`<div class="body"><div class="tw"><table class="plan"><colgroup><col style="width:${land ? 10 : 13}%"><col style="width:${land ? 19 : 21}%"><col style="width:${land ? 40 : 36}%"><col style="width:${land ? 31 : 30}%"></colgroup>` +
      '<tr><th>الحصة</th><th>المادة</th><th>الموضوع</th><th>الواجب</th></tr>');
    const tops = day.map(r => clean(r[1]));
    const merged = tops.length && tops.every(t => t === tops[0]) && tops[0] && tops[0].includes('إجازة');
    const st = `style="font-size:${fs}px;height:${rowH}px"`;
    day.forEach(([s, t, h], k) => {
      const per = `<td class="per" style="height:${rowH}px"><div class="n">${ARNUM[k]}</div><div class="w">${PERIODS_FULL[k]}</div></td>`;
      const cls = k % 2 ? ' class="alt"' : '';
      if (merged) p.push(`<tr${cls}>${per}` + (k === 0 ? `<td class="merged" colspan="3" rowspan="${day.length}">${ar(t)}</td>` : '') + '</tr>');
      else p.push(`<tr${cls}>${per}` + cell(s, 'c subj', st) + cell(t, 'c', st) + cell(h, 'c', st) + '</tr>');
    });
    p.push('</table></div>');
    if (notes && notes.length) {
      const items = notes.map(([a, b]) => '<li><span class="bl">●</span> ' + (a ? `<b>${ar(a)}:</b> ` : '') + `${ar(b)}</li>`).join('');
      p.push(`<div class="notes"><div class="nh">${icon('note', 20, NAVY)} ملاحظات اليوم</div><ul>${items}</ul></div>`);
    }
    p.push('</div>' + pageFooter(week, land) + '</div>');
    return p.join('');
  }

  // النظرة الأسبوعية: كل أيام الأسبوع في صفحة عرضية واحدة
  function overviewPage(doc, fs) {
    const { info, week } = doc; const np = Math.max(...doc.days.map(d => d.length));
    let h = `<div class="page day land" data-fitov="1">` + header(week, info, true) +
      banner(true, `<div class="dn" style="right:26px">نظرة الأسبوع كاملاً</div><div class="chip">${TPL.CAL}<span class="t">من</span><span class="d">${iso(week.dates[0])}</span><span class="t">إلى</span><span class="d">${iso(week.dates[week.dates.length - 1])}</span></div>`) +
      `<div class="body"><div class="wkwrap"><table class="wk" style="font-size:${fs}px"><colgroup><col style="width:9%">${Array.from({ length: np }, () => `<col style="width:${91 / np}%">`).join('')}</colgroup>` +
      `<tr><th>اليوم</th>${Array.from({ length: np }, (_, k) => `<th>الحصة ${PERIODS_FULL[k]}</th>`).join('')}</tr>`;
    doc.days.forEach((day, di) => {
      const tops = day.map(r => clean(r[1])); const hol = tops.length && tops.every(t => t === tops[0]) && tops[0] && tops[0].includes('إجازة');
      h += `<tr class="${di % 2 ? 'alt' : ''}"><td class="dy">${DAYS[di]}<small>${iso(week.dates[di])}</small></td>`;
      if (hol) h += `<td class="hol" colspan="${np}">${ar(tops[0])}</td>`;
      else day.forEach(([s, t, hw]) => {
        h += `<td><div class="s">${txt(s) || '–'}</div>${clean(t) ? `<div class="t">${txt(t)}</div>` : ''}${clean(hw) ? `<div class="h"><b>●</b> ${txt(hw)}</div>` : ''}</td>`;
      });
      h += '</tr>';
    });
    h += '</table></div>';
    const notes = doc.dayNotes.map((n, di) => n && n.length ? `<div><b>${DAYS[di]}:</b> ${n.map(([a, b]) => (a ? ar(a) + ': ' : '') + ar(b)).join(' — ')}</div>` : '').join('');
    if (notes) h += `<div class="wknotes">${notes}</div>`;
    return h + '</div>' + pageFooter(week, true) + '</div>';
  }

  // صفحات إضافية
  function framePage(doc, land, title, body) {
    return `<div class="page day ${land ? 'land' : ''}">` + header(doc.week, doc.info, land) +
      banner(land, `<div class="dn" style="right:26px">${esc(title)}</div>`) + `<div class="body">${body}</div>` + pageFooter(doc.week, land) + '</div>';
  }
  function extraPageHTML(doc, x, land) {
    const c = x.content || {};
    if (x.kind === 'honor') {
      const st = (c.students || []).filter(s => clean(s.name));
      const cols = land ? 3 : 2; let rows = '';
      for (let i = 0; i < st.length; i += cols) rows += '<tr>' + Array.from({ length: cols }, (_, j) => { const s = st[i + j]; return s ? `<td>${star('width:26px;height:26px', SKY, NAVY, 2.4)}<div class="nm">${ar(s.name)}</div>${clean(s.reason) ? `<div class="rs">${ar(s.reason)}</div>` : ''}</td>` : '<td style="background:none"></td>'; }).join('') + '</tr>';
      const body = `<div class="medal">${star('width:70px;height:70px', SKY, NAVY, 1.6)}</div>` +
        (clean(c.message) ? `<p class="xtitle">${arML(c.message)}</p>` : '') + `<table class="honor">${rows}</table>`;
      return framePage(doc, land, x.title || 'وسام التميز', body);
    }
    if (x.kind === 'tasks') {
      const rows = (c.rows || []).filter(r => clean(r.task) || clean(r.subject));
      const body = (clean(c.intro) ? `<p class="xtitle">${arML(c.intro)}</p>` : '') +
        `<div class="tw"><table class="tasks"><colgroup><col style="width:20%"><col style="width:44%"><col style="width:16%"><col style="width:20%"></colgroup><tr><th>المادة</th><th>المهمة الأدائية</th><th>موعد التسليم</th><th>ملاحظات</th></tr>` +
        rows.map((r, i) => `<tr class="${i % 2 ? 'alt' : ''}"><td class="sj">${txt(r.subject) || '–'}</td><td>${txt(r.task) || '–'}</td><td class="du">${txt(r.due) || '–'}</td><td>${txt(r.notes) || '–'}</td></tr>`).join('') + '</table></div>';
      return framePage(doc, land, x.title || 'المهام الأدائية', body);
    }
    if (x.kind === 'announcement') {
      const body = (c.items || []).filter(i => clean(i.body) || clean(i.title)).map(i => '<div class="xn">' + (clean(i.title) ? `<div class="t">${ar(i.title)}</div>` : '') + `<div class="x">${arML(i.body)}</div></div>`).join('');
      return framePage(doc, land, x.title || 'إعلانات', body);
    }
    return framePage(doc, land, x.title || 'صفحة', `<div class="xn"><div class="x">${arML(c.body)}</div></div>`);
  }
  function notesPage(doc, land) {
    return framePage(doc, land, 'ملاحظات وتنبيهات', doc.extra.map(([a, b]) => '<div class="xn">' + (a ? `<div class="t">${ar(a)}</div>` : '') + `<div class="x">${arML(b)}</div></div>`).join(''));
  }

  const TRIES = [[88, 15], [78, 14], [70, 13.5], [62, 13], [56, 12], [50, 11.5], [46, 11]];
  const TRIES_N = [[74, 14.5], [66, 14], [60, 13], [54, 12.5], [50, 12], [46, 11.5], [42, 11]];
  const TRIES_L = [[58, 14], [52, 13.5], [48, 13], [44, 12.5], [40, 12], [36, 11.5], [33, 11]];
  const TRIES_LN = [[50, 13.5], [46, 13], [42, 12.5], [38, 12], [35, 11.5], [32, 11], [30, 10.5]];
  const OV = [12.5, 12, 11.5, 11, 10.5, 10, 9.5, 9, 8.5, 8];

  /* doc: {info, week:{word,term,dates,footer}, days:[d][p][subj,topic,hw], dayNotes:[d][[title,text]], extra:[[title,text]],
          extraPages:[{kind,title,content,position}], opts:{layout:'daily'|'overview', orientation:'portrait'|'landscape', ink, cover, notes, extras}} */
  function pagesHTML(doc, fits, ovfit) {
    const o = Object.assign({ layout: 'daily', orientation: 'portrait', ink: false, cover: true, notes: true, extras: true }, doc.opts || {});
    const land = o.layout === 'overview' || o.orientation === 'landscape';
    const xp = o.extras ? (doc.extraPages || []) : [];
    let h = '';
    if (o.cover) h += coverPage(doc.info, doc.week, land);
    xp.filter(x => x.position === 'after_cover').forEach(x => h += extraPageHTML(doc, x, land));
    const dn = o.notes ? doc.dayNotes : doc.days.map(() => []);
    if (o.layout === 'overview') h += overviewPage({ ...doc, dayNotes: dn }, OV[ovfit || 0]);
    else doc.days.forEach((day, di) => {
      const has = dn[di] && dn[di].length;
      const T = land ? (has ? TRIES_LN : TRIES_L) : (has ? TRIES_N : TRIES);
      const [rh, fs] = T[fits ? fits[di] : 0];
      h += dayPage(doc.info, doc.week, di, day, dn[di], rh, fs, land);
    });
    if (o.notes && doc.extra && doc.extra.length) h += notesPage(doc, land);
    xp.filter(x => x.position !== 'after_cover').forEach(x => h += extraPageHTML(doc, x, land));
    if (o.rich) h = richDecor(h, land);
    if (o.coverImg && o.cover) h = h.replace('<div class="page cover', `<div class="page cover`).replace(/(<div class="page cover[^>]*>)/, `$1<img class="cimg" src="${esc(o.coverImg)}" crossorigin="anonymous" style="top:${land ? 640 : 860}px;width:${land ? 220 : 300}px;height:${land ? 90 : 150}px">`);
    return { html: themed(h, { name: o.theme }), land, ink: o.ink, rich: o.rich, theme: o.theme };
  }
  // هويات التصميم المشتقة من دليل هوية دينا (الكحلي ثابت؛ يتغير اللون المساند)
  const THEMES = {
    dina: null,
    lavender: { '#3AB1DB': '#AE95DA', '#84B7E3': '#C4B5E3', '#E4EBF5': '#EEEBF6', '#5E9BD3': '#AE95DA', '#6EA7DA': '#DAD5EB' },
    green: { '#3AB1DB': '#8CC56A', '#84B7E3': '#BADF93', '#E4EBF5': '#EEF6E6', '#5E9BD3': '#8CC56A', '#6EA7DA': '#BADF93' },
  };
  const RICH = `.rich .banner,.rich .week{border-bottom:5px solid #3AB1DB}
.rich .cards td,.rich table.honor td,.rich .xn{border-bottom:4px solid #84B7E3}
.rich .tw,.rich .wkwrap{border-bottom-width:4px}
.rich .chip{border-bottom:3px solid #082B5A}`;
  function themed(html, t) { const map = t && THEMES[t.name]; if (!map) return html; return html.replace(/#(3AB1DB|84B7E3|E4EBF5|5E9BD3|6EA7DA)\b/gi, m => map[m.toUpperCase()] || m); }
  function richDecor(html, land) {
    const add = (land ? '' : pin('position:absolute;top:150px;right:46px;width:40px;height:40px;opacity:.9')) + star('position:absolute;bottom:150px;left:52px;width:22px;height:22px', SKY, NAVY, 2.4) + flower('position:absolute;top:150px;left:-46px;width:120px;height:120px', SKY, 1.1, 0.5);
    return html.replace(/<div class="page day([^"]*)"([^>]*)>/g, (m) => m + add);
  }
  const shell = (r, title) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="${location.href.replace(/[^/]*$/, '')}"><title>${esc(title || '')}</title><style>${themed(BASE + (r.rich ? RICH : ''), { name: r.theme })}@page{size:A4 ${r.land ? 'landscape' : 'portrait'};margin:0}.cimg{position:absolute;left:50%;transform:translateX(-50%);border-radius:18px;object-fit:cover;box-shadow:0 12px 26px -12px rgba(8,43,90,.5)}</style></head><body class="${r.ink ? 'ink' : ''} ${r.rich ? 'rich' : ''}">${r.html}</body></html>`;

  async function renderInto(frame, doc, title) {
    const fits = doc.days.map(() => 0); let ov = 0; let r;
    const write = async () => {
      r = pagesHTML(doc, fits, ov); const d = frame.contentDocument; d.open(); d.write(shell(r, title)); d.close();
      await new Promise(res => { if (frame.contentDocument.readyState === 'complete') res(); else frame.contentWindow.addEventListener('load', res, { once: true }); });
      await frame.contentDocument.fonts.ready;
      await Promise.all([...frame.contentDocument.images].map(i => i.complete ? 0 : new Promise(x => { i.onload = i.onerror = x; })));
    };
    await write();
    const H = r.land ? 794 : 1123, limit = H - 83;
    for (let pass = 0; pass < 10; pass++) {
      let changed = false;
      frame.contentDocument.querySelectorAll('.page[data-fit]').forEach(pg => {
        const di = +pg.dataset.fit, body = pg.querySelector('.body');
        const bottom = body.getBoundingClientRect().bottom - pg.getBoundingClientRect().top;
        if (bottom > limit && fits[di] < TRIES.length - 1) { fits[di]++; changed = true; }
      });
      frame.contentDocument.querySelectorAll('.page[data-fitov]').forEach(pg => {
        const body = pg.querySelector('.body');
        const bottom = body.getBoundingClientRect().bottom - pg.getBoundingClientRect().top;
        if (bottom > limit && ov < OV.length - 1) { ov++; changed = true; }
      });
      if (!changed) break;
      await write();
    }
    frame.dataset.land = r.land ? '1' : '';
    return frame;
  }

  function makeFrame(visible) {
    const f = document.createElement('iframe');
    f.style.cssText = visible ? 'width:100%;height:100%;border:0;background:#cfd8e6' : 'position:fixed;left:-12000px;top:0;width:1160px;height:1200px;border:0';
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
      const land = f.dataset.land === '1'; const W = land ? 1123 : 794, H = land ? 794 : 1123;
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'px', format: [W, H], orientation: land ? 'landscape' : 'portrait', hotfixes: ['px_scaling'], compress: true });
      await svgToImg(f.contentDocument);
      const pages = [...f.contentDocument.querySelectorAll('.page')];
      for (let i = 0; i < pages.length; i++) {
        const c = await html2canvas(pages[i], { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: 1160 });
        if (i) pdf.addPage([W, H], land ? 'landscape' : 'portrait');
        pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, W, H, undefined, 'FAST');
        // مناطق نقر فوق الروابط حتى تعمل داخل ملف PDF
        const pr = pages[i].getBoundingClientRect(), kx = W / pr.width, ky = H / pr.height;
        pages[i].querySelectorAll('a[href^="http"]').forEach(a => { const r = a.getBoundingClientRect(); if (r.width && r.height) pdf.link((r.left - pr.left) * kx, (r.top - pr.top) * ky, r.width * kx, r.height * ky, { url: a.href }); });
      }
      pdf.setProperties({ title });
      return pdf.output('blob');
    } finally { f.remove(); }
  }

  window.PlanExport = { renderInto, makeFrame, toPdfBlob, pagesHTML, AR, PERIODS_FULL, DAYS };
})();
