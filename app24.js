/* منصة دينا — مصمم الجداول (جدول الحصص بهوية دينا مع التوقيتات) — للطباعة وPDF والصور
   مرن: جدول فصل أو معلم، أي إصدار (المعتمد/المجدول/مسودة)، أي جدول زمني، شارة وعنوان، استراحات، أسماء مواد مختصرة قابلة للتخصيص،
   رابط القاعة الافتراضية كرمز QR لكل فصل، وألوان. تصدير الحالي أو الكل (طباعة متعددة الصفحات / صور ZIP). */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, DAYS, PER, I } = A;
  const svgUrl = (svg, c) => `url(&quot;data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" `).replace(/currentColor/g, c))}&quot;)`;
  const IC = {
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/><rect x="7" y="13" width="3" height="3" rx=".5"/><rect x="14" y="13" width="3" height="3" rx=".5"/></svg>',
    wifi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19.5" r="1.2" fill="currentColor"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    cup: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h1.5a2.5 2.5 0 0 1 0 5H17M8 3v3M12 3v3"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
    flower: '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20c-6-10 0-16 0-16s6 6 0 16zM20 20c10-6 16 0 16 0s-6 6-16 0zM20 20c6 10 0 16 0 16s-6-6 0-16zM20 20C10 26 4 20 4 20s6-6 16 0z"/></svg>',
  };
  const THEMES = { navy: { a: '#082B5A', b: '#3AB1DB', p: '#E4EBF5', l: '#84B7E3' }, sky: { a: '#005499', b: '#3AB1DB', p: '#E6F5FB', l: '#9ED6EC' }, green: { a: '#1F5E3A', b: '#7CBF5A', p: '#EAF5E3', l: '#B5DC9C' }, purple: { a: '#3F2A73', b: '#AE95DA', p: '#EFEAF8', l: '#CBBCEA' } };
  const SHORT = { 'اللغة العربية': 'لغتي', 'اللغة الإنجليزية': 'E', 'الدراسات الإسلامية والقرآن': 'إسلامية', 'المهارات الرقمية': 'رقمية', 'المهارات الحياتية': 'حياتية', 'الرياضيات': 'رياضيات', 'العلوم': 'علوم', 'الاجتماعيات': 'اجتماعيات', 'تمكين وإتقان': 'تمكين', 'التربية البدنية': 'بدنية', 'التربية الفنية': 'فنية', 'التقنية الرقمية': 'تقنية رقمية', 'الكفايات اللغوية': 'كفايات لغوية', 'التفكير الناقد': 'تفكير ناقد', 'البحث ومصادر المعلومات': 'بحث ومصادر', 'علوم الأرض والفضاء': 'علوم الأرض', 'التربية الصحية والبدنية': 'صحية وبدنية', 'التربية الحياتية والأسرية': 'حياتية وأسرية' };
  const DKEY = () => 'tt_design_' + S.sectionId;
  const loadCfg = () => { const sec = A.section(), b = (sec.bell && sec.bell.design) || {}; let l = {}; try { l = JSON.parse(localStorage.getItem(DKEY()) || '{}'); } catch (_) {} return Object.assign({ kind: 'class', title: 'جدول الحصص الدراسي', tag: '', label: '', theme: 'navy', times: true, brk: true, who: true, nums: true, shortN: true, short: {}, links: {}, link0: '', qrT: 'رابط القاعة الافتراضية', qrS: 'امسح الكود للدخول إلى القاعة', foot: 'رحلتهم الكبرى... تبدأ من هنا', sched: '' }, b, l); };
  const saveCfg = async c => { try { localStorage.setItem(DKEY(), JSON.stringify(c)); } catch (_) {} if (S.me.is_owner) { const sec = A.section(), bell = Object.assign({}, sec.bell || {}, { design: c }); try { const r = await api.updateSection(sec.id, { bell }); Object.assign(sec, r); } catch (_) {} } };
  function subShort(c, sid) {
    if (!sid) return ''; if (c.short[sid]) return c.short[sid]; const full = A.subjName(sid) || ''; if (!c.shortN) return full;
    try { const mp = (JSON.parse(localStorage.getItem('tt_map_' + S.school.id) || '{}').s) || {}; const ks = Object.keys(mp).filter(k => mp[k] === sid).sort((a, b) => a.length - b.length); if (ks[0]) return ks[0]; } catch (_) {}
    return SHORT[full] || full.replace(/^ال/, '');
  }
  const tShort = id => { const n = ((A.person(id) || {}).full_name || '').replace(/^(أ\.|أ\/|م\.|د\.)\s*/, '').trim().split(/\s+/); return n.length > 2 ? n[0] + ' ' + n[n.length - 1] : n.join(' '); };
  const cName = id => (A.cls(id) || (S.allClasses || []).find(c => c.id === id) || {}).name || '';
  const qrSvg = (txt, color) => { if (!window.qrcode || !txt) return ''; try { const q = qrcode(0, 'M'); q.addData(txt); q.make(); const n = q.getModuleCount(); let r = ''; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) r += `M${x},${y}h1v1h-1z`; return `<svg xmlns="http://www.w3.org/2000/svg" width="${(n + 4) * 6}" height="${(n + 4) * 6}" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${r}" fill="${color}"/></svg>`; } catch (_) { return ''; } };

  // ---------- الرسم ----------
  function posterHTML(c, D, target) {
    const sec = A.section(), T = THEMES[c.theme] || THEMES.navy, B = A.bell, s = D.sched;
    const days = s ? B.actDays(s, sec) : Array.from({ length: sec.days || 5 }, (_, i) => i);
    const P = s ? B.maxP(s, sec) : (sec.periods || 7);
    const cid = c.kind === 'class' ? target : null;
    const tl = s ? B.timeline(s, P, cid) : null;
    const pt = p => tl && c.times ? tl.items.find(x => x.k === 'p' && x.i === p) : null;
    const brAfter = p => tl && c.brk ? tl.items.filter((x, i) => x.k === 'b' && tl.items.slice(0, i).filter(y => y.k === 'p').length === p + 1) : [];
    const fm = m => { const h = Math.floor(m / 60) % 24, mm = String(m % 60).padStart(2, '0'); return (s && s.h24 ? String(h).padStart(2, '0') : String(h % 12 || 12)) + ':' + mm; };
    const range = it => `${fm(it.from)} – ${fm(it.to)}`;
    const slots = D.slots.filter(x => c.kind === 'class' ? x.class_id === target : x.teacher_id === target);
    const at = (d, p) => slots.filter(x => x.day === d && x.period === p && x.subject_id);
    const cols = []; for (let p = 0; p < P; p++) { cols.push({ k: 'p', p }); brAfter(p).forEach(b => cols.push({ k: 'b', b })); }
    if (cols.length && cols[cols.length - 1].k === 'b') cols.pop();
    const nB = cols.filter(x => x.k === 'b').length, dayW = 116, bW = 52, pW = (1060 - dayW - nB * bW) / P;
    const big = pW > 150 ? 26 : pW > 120 ? 23 : 20;
    const cell = (d, p) => {
      if (s && p >= B.schedP(s, sec, d)) return `<td class="dz-x"></td>`;
      const l = at(d, p); if (!l.length) return '<td></td>';
      const t = l.map(x => { const n = subShort(c, x.subject_id), sub = c.who ? (c.kind === 'class' ? tShort(x.teacher_id) : cName(x.class_id)) : ''; const fs = n.length > 12 ? big - 8 : n.length > 8 ? big - 4 : big; return `<b style="font-size:${l.length > 1 ? fs - 6 : fs}px">${esc(n)}</b>${sub ? `<i>${esc(sub)}</i>` : ''}`; }).join('<hr>');
      return `<td>${t}</td>`;
    };
    const who = c.kind === 'class' ? cName(target) : ((A.person(target) || {}).full_name || '');
    const link = (c.links[target] || c.link0 || '').trim(), qr = link ? qrSvg(link, T.a) : '';
    const dec = svgUrl(IC.flower, T.l);
    return `<div class="dz" dir="rtl" style="--a:${T.a};--b:${T.b};--p:${T.p};--l:${T.l}">
      <span class="dz-fl" style="background-image:${dec};top:18px;left:300px;width:46px;height:46px"></span><span class="dz-fl" style="background-image:${dec};top:520px;left:-14px;width:70px;height:70px;opacity:.5"></span><span class="dz-fl" style="background-image:${dec};top:-10px;left:-10px;width:90px;height:90px;opacity:.45"></span>
      <div class="dz-top"><div class="dz-logo"><img src="assets/logo.svg" alt="مدارس دينا العالمية"></div>
        <div class="dz-mid"><div class="dz-title"><span class="dz-ic" style="background-image:${svgUrl(IC.cal, '#fff')}"></span><h1>${esc(c.title || 'جدول الحصص الدراسي')}</h1></div>
          ${c.tag ? `<div class="dz-tag"><span>${esc(c.tag)}</span><span class="dz-ic sm" style="background-image:${svgUrl(IC.wifi, T.a)}"></span></div>` : ''}</div>
        <div class="dz-art"><span class="dz-lap"></span></div></div>
      <div class="dz-who"><span>${esc(c.label || (c.kind === 'class' ? 'الصف:' : 'المعلم:'))}</span><b>${esc(who)}</b></div>
      <table class="dz-t"><colgroup><col style="width:${dayW}px">${cols.map(x => `<col style="width:${x.k === 'b' ? bW : pW}px">`).join('')}</colgroup>
        <tbody><tr class="dz-h"><th class="dz-dh">اليوم</th>${cols.map(x => x.k === 'b' ? `<th class="dz-b" rowspan="${days.length + 1}"><div class="dz-bi"><span class="dz-ic sm" style="background-image:${svgUrl(IC.cup, T.a)}"></span><div class="dz-bv" style="height:${Math.max(200, days.length * 58 + 30)}px"><span><b>${esc(x.b.label || 'استراحة')}</b>${c.times ? `<i>${range(x.b)}</i>` : ''}</span></div></div></th>` : `<th class="dz-ph">${c.nums ? `<span class="dz-n">${AR(x.p + 1)}</span>` : ''}<span class="dz-pn">الحصة ${PER[x.p] || AR(x.p + 1)}</span>${pt(x.p) ? `<span class="dz-tm"><span class="dz-ic xs" style="background-image:${svgUrl(IC.clock, T.a)}"></span><span>${range(pt(x.p))}</span></span>` : ''}</th>`).join('')}</tr>
        ${days.map(d => `<tr><th class="dz-d">${DAYS[d]}</th>${cols.filter(x => x.k === 'p').map(x => cell(d, x.p)).join('')}</tr>`).join('')}</tbody></table>
      <div class="dz-foot"><svg viewBox="0 0 1123 140" preserveAspectRatio="none" aria-hidden="true"><path d="M0 70 C 200 20 380 110 600 60 C 800 20 960 70 1123 40 L1123 140 L0 140Z" fill="${T.b}" opacity=".35"/><path d="M0 95 C 220 50 420 130 640 85 C 840 50 980 95 1123 70 L1123 140 L0 140Z" fill="${T.a}"/></svg>
        ${qr ? `<div class="dz-qr"><div class="dz-ql"><span class="dz-ic" style="background-image:${svgUrl(IC.link, T.a)}"></span><div><b>${esc(c.qrT)}</b><i>${esc(c.qrS)}</i></div></div><div class="dz-qc"><img alt="QR" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}"></div></div>` : c.foot ? `<p class="dz-ft">${esc(c.foot)}</p>` : ''}</div>
    </div>`;
  }
  const CSS = `.dz{width:1123px;height:794px;box-sizing:border-box;position:relative;overflow:hidden;background:#fff;color:var(--a);font-family:'GE SS Two','Tajawal',sans-serif;padding:22px 32px 0;background-image:radial-gradient(circle at 98% 2%,var(--p) 0 110px,transparent 111px),radial-gradient(circle at 0 100%,var(--p) 0 140px,transparent 141px)}
    .dz-fl{position:absolute;background-size:contain;background-repeat:no-repeat}
    .dz-top{display:grid;grid-template-columns:230px 1fr 230px;align-items:center;gap:10px;position:relative}.dz-logo img{height:96px;display:block}
    .dz-mid{display:flex;flex-direction:column;align-items:center;gap:8px}.dz-title{display:flex;align-items:center;gap:16px;background:var(--a);color:#fff;border-radius:999px;padding:12px 40px;border:4px solid var(--l);box-shadow:0 10px 22px -12px rgba(8,43,90,.7)}.dz-title h1{margin:0;font-size:36px;font-weight:800}
    .dz-ic{display:inline-block;width:38px;height:38px;background-size:contain;background-repeat:no-repeat;background-position:center;flex:none}.dz-ic.sm{width:24px;height:24px}.dz-ic.xs{width:15px;height:15px}
    .dz-tag{display:flex;align-items:center;gap:10px;background:var(--p);border:2px solid var(--l);border-radius:999px;padding:5px 26px;font-size:20px;font-weight:800}
    .dz-art{justify-self:start;position:relative;height:96px;width:170px}.dz-lap{position:absolute;inset:8px 20px 14px 10px;border:5px solid var(--a);border-radius:10px;background:linear-gradient(var(--p),#fff)}.dz-lap:after{content:'';position:absolute;left:-22px;right:-22px;bottom:-16px;height:10px;background:var(--a);border-radius:0 0 12px 12px}.dz-lap:before{content:'';position:absolute;width:30px;height:30px;border-radius:50%;background:var(--b);top:18px;right:22px;box-shadow:-48px 10px 0 -6px var(--l)}
    .dz-who{display:flex;align-items:center;gap:14px;justify-content:center;margin:10px auto 12px;border:2px solid var(--l);border-radius:999px;padding:6px 36px;width:fit-content;min-width:520px}.dz-who span{font-size:18px;color:var(--a);opacity:.8}.dz-who b{font-size:24px;border-bottom:2px dotted var(--l);flex:1;text-align:center;padding:0 20px}
    .dz-t{width:1060px;margin:0 auto;border-collapse:separate;border-spacing:0;table-layout:fixed;border:2px solid var(--l);border-radius:16px;overflow:hidden;position:relative;z-index:1;background:#fff}
    .dz-t .dz-h th{background:var(--a);color:#fff;padding:7px 4px 9px;border-left:1px solid rgba(255,255,255,.25);vertical-align:top}.dz-t .dz-h th:last-child{border-left:0}
    .dz-dh{font-size:24px;font-weight:800;vertical-align:middle!important}.dz-ph{font-size:15px}.dz-n{display:block;width:26px;height:26px;line-height:27px;border-radius:50%;background:#fff;color:var(--a);margin:0 auto 3px;font-weight:800;font-size:16px}.dz-pn{display:block;font-weight:700}
    .dz-tm{font-family:'Myriad Pro',Arial,sans-serif;display:flex;align-items:center;justify-content:center;gap:5px;background:#fff;color:var(--a);border-radius:8px;margin:6px 4px 0;padding:3px 4px;font-size:14px;font-weight:700;direction:ltr}
    .dz-b{background:var(--p)!important;color:var(--a)!important;padding:0!important;border-left:2px solid var(--l)!important;border-right:2px solid var(--l);vertical-align:middle!important}.dz-bi{display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 0}.dz-bv{width:44px;position:relative}.dz-bv>span{position:absolute;top:50%;left:50%;width:260px;display:flex;align-items:center;justify-content:center;gap:12px;transform:translate(-50%,-50%) rotate(-90deg)}.dz-bv b{font-size:22px;font-weight:800;white-space:nowrap}.dz-bv i{font-family:'Myriad Pro',Arial,sans-serif;font-size:14px!important;font-style:normal;font-size:13px;font-weight:700;border:2px solid var(--l);border-radius:999px;padding:2px 10px;background:#fff;direction:ltr;white-space:nowrap}
    .dz-t td{border-top:1px solid var(--l);border-left:1px solid var(--l);text-align:center;vertical-align:middle;height:58px;padding:2px 4px;line-height:1.15}.dz-t td:last-child{border-left:0}.dz-t td b{display:block;font-weight:700;color:#0b1f3a}.dz-t td i{display:block;font-style:normal;font-size:12px;color:var(--a);opacity:.75;margin-top:2px}.dz-t td hr{border:0;border-top:1px dashed var(--l);margin:2px 8px}
    .dz-d{background:var(--p);color:var(--a);font-size:19px;font-weight:800;border-top:1px solid var(--l);border-left:1px solid var(--l)}.dz-x{background:repeating-linear-gradient(45deg,#f4f7fb 0 6px,#fff 6px 12px)}
    .dz-foot{position:absolute;left:0;right:0;bottom:0;height:140px}.dz-foot svg{position:absolute;inset:0;width:100%;height:100%}
    .dz-qr{position:absolute;bottom:12px;left:0;right:0;display:flex;justify-content:center;align-items:flex-end;gap:22px}.dz-ql{display:flex;align-items:center;gap:12px;background:var(--a);color:#fff;border:3px solid var(--l);border-radius:999px;padding:10px 26px}.dz-ql .dz-ic{background-color:#fff;border-radius:50%;width:42px;height:42px;background-size:26px}.dz-ql b{display:block;font-size:21px}.dz-ql i{display:block;font-style:normal;font-size:13px;opacity:.85}
    .dz-qc{background:#fff;border-radius:14px;padding:6px;border:3px solid var(--b);margin-bottom:6px}.dz-qc img{width:104px;height:104px;display:block}
    .dz-ft{position:absolute;left:0;right:0;bottom:16px;margin:0;text-align:center;color:#fff;font-size:24px;font-weight:800}`;
  if (!document.getElementById('dzCss')) { const st = document.createElement('style'); st.id = 'dzCss'; st.textContent = CSS; document.head.appendChild(st); }
  const FONT = `@font-face{font-family:'Myriad Pro';src:url(fonts/myriad-pro-regular.woff2)}@font-face{font-family:'GE SS Two';font-weight:400 500;src:url(fonts/gess-two-medium.woff2)}@font-face{font-family:'GE SS Two';font-weight:600 900;src:url(fonts/gess-two-bold.woff2)}`;

  function printMany(pages, title) {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:-9999px;width:1200px;height:900px;border:0'; document.body.appendChild(f);
    const base = location.href.replace(/[^/]*$/, '').split('#')[0];
    f.contentDocument.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="${base}"><title>${esc(title)}</title><style>${FONT}@page{size:A4 landscape;margin:0}html,body{margin:0}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}${CSS}.pg{width:297mm;height:210mm;overflow:hidden;page-break-after:always;display:flex;align-items:center;justify-content:center}.pg:last-child{page-break-after:auto}.pg .dz{zoom:1.0}</style></head><body>${pages.map(h => `<div class="pg">${h}</div>`).join('')}</body></html>`);
    f.contentDocument.close();
    const d = f.contentDocument, imgs = [...d.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }));
    Promise.race([Promise.all([d.fonts ? d.fonts.ready : 0, ...imgs]), new Promise(r => setTimeout(r, 2000))]).then(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 4000); });
  }
  async function toCanvas(html) {
    const w = document.createElement('div'); w.style.cssText = 'position:fixed;left:-12000px;top:0'; w.innerHTML = html; document.body.appendChild(w);
    try { if (document.fonts) await document.fonts.ready; const el = w.firstElementChild; await Promise.all([...el.querySelectorAll('img')].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); return await html2canvas(el, { scale: 2, backgroundColor: '#ffffff' }); } finally { w.remove(); }
  }
  const blobOf = c => new Promise(r => c.toBlob(r, 'image/png'));

  // ---------- الواجهة ----------
  A.ttDesign = async function (root, opts = {}) {
    const sec = A.section(); let c = loadCfg(); if (opts.version) c.version = opts.version;
    root.innerHTML = '<div class="card"><div class="spinner"></div></div>';
    const vers = (await api.list('timetable_versions', { section_id: S.sectionId })).filter(v => v.status !== 'archived').sort((a, b) => (a.status === 'approved' ? -1 : 0) - (b.status === 'approved' ? -1 : 0));
    if (!vers.length) { root.innerHTML = `<div class="card">${A.emptyBox('لا يوجد جدول بعد', 'أنشئ جدولاً أو استورده أولاً.')}</div>`; return; }
    if (!vers.some(v => v.id === c.version)) c.version = (vers.find(v => v.status === 'approved') || vers[0]).id;
    const bell = A.bell.bellOf(sec);
    const slotCache = {}; const slotsOf = async id => slotCache[id] || (slotCache[id] = await api.list('timetable_slots', { version_id: id }));
    let D = { slots: await slotsOf(c.version), sched: null };
    const pickSched = () => { D.sched = c.sched === 'none' ? null : (bell.schedules.find(s => s.id === c.sched) || A.bell.activeSched(bell)); };
    pickSched();
    const targets = () => c.kind === 'class' ? (S.allClasses && S.allClasses.length ? S.allClasses : S.classes).filter(x => D.slots.some(s => s.class_id === x.id && s.subject_id)).map(x => [x.id, x.name]) : [...new Set(D.slots.filter(s => s.teacher_id && s.subject_id).map(s => s.teacher_id))].map(id => [id, (A.person(id) || {}).full_name || '—']).sort((a, b) => a[1].localeCompare(b[1], 'ar'));
    let tg = targets(); let cur = tg.some(t => t[0] === c.cur) ? c.cur : (tg[0] || [])[0];
    const vLbl = v => `${v.label}${v.status === 'approved' ? ' (المعتمد)' : v.scheduled ? ' (مجدول)' : ' (مسودة)'}`;
    root.innerHTML = `<div class="dzw"><aside class="card dz-side" aria-label="إعدادات التصميم">
        <h2 style="margin:0 0 4px">تصميم الجداول وتصديرها</h2><p class="small muted" style="margin:0 0 10px">كل تعديل يظهر مباشرة في المعاينة، ويُحفظ للمرة القادمة.</p>
        <div class="kpick" id="zK"><button type="button" data-k="class" class="${c.kind === 'class' ? 'on' : ''}">جدول فصل</button><button type="button" data-k="teacher" class="${c.kind === 'teacher' ? 'on' : ''}">جدول معلم</button></div>
        <div class="field"><label for="zT">${c.kind === 'class' ? 'الفصل' : 'المعلم'}</label><select class="in" id="zT"></select></div>
        <div class="field"><label for="zV">الجدول</label><select class="in" id="zV">${vers.map(v => `<option value="${v.id}" ${v.id === c.version ? 'selected' : ''}>${esc(vLbl(v))}</option>`).join('')}</select></div>
        <div class="field"><label for="zS">التوقيت (من «اليوم الدراسي والجدول الزمني»)</label><select class="in" id="zS"><option value="">الساري اليوم</option>${bell.schedules.map(s => `<option value="${s.id}" ${c.sched === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}<option value="none" ${c.sched === 'none' ? 'selected' : ''}>بدون توقيت</option></select></div>
        <div class="field"><label for="zTi">العنوان</label><input class="in" id="zTi" data-c="title" value="${esc(c.title)}"></div>
        <div class="field"><label for="zTg">الشارة (اختياري)</label><input class="in" id="zTg" data-c="tag" value="${esc(c.tag)}" list="zTgL" placeholder="مثال: للتعليم عن بعد"><datalist id="zTgL"><option>للتعليم عن بعد</option><option>للتعليم الحضوري</option><option>دوام شهر رمضان</option><option>الفصل الدراسي الثاني</option></datalist></div>
        <fieldset class="dz-fs"><legend>إظهار</legend>
          <label class="chk"><input type="checkbox" data-b="times" ${c.times ? 'checked' : ''}> أوقات الحصص</label><label class="chk"><input type="checkbox" data-b="brk" ${c.brk ? 'checked' : ''}> عمود الاستراحة</label>
          <label class="chk"><input type="checkbox" data-b="who" ${c.who ? 'checked' : ''}> ${c.kind === 'class' ? 'اسم المعلم' : 'اسم الفصل'} تحت المادة</label><label class="chk"><input type="checkbox" data-b="nums" ${c.nums ? 'checked' : ''}> أرقام الحصص</label>
          <label class="chk"><input type="checkbox" data-b="shortN" ${c.shortN ? 'checked' : ''}> أسماء مواد مختصرة</label></fieldset>
        <div class="field"><label>اللون</label><div class="dz-th">${Object.entries(THEMES).map(([k, t]) => `<button type="button" data-th="${k}" class="${c.theme === k ? 'on' : ''}" style="background:linear-gradient(135deg,${t.a} 55%,${t.b} 55%)" aria-label="لون ${({ navy: "كحلي", sky: "أزرق", green: "أخضر", purple: "بنفسجي" })[k]}" title="${({ navy: "كحلي", sky: "أزرق", green: "أخضر", purple: "بنفسجي" })[k]}"></button>`).join('')}</div></div>
        <details class="dz-det"><summary>رابط القاعة الافتراضية (QR)</summary>
          <div class="field"><label for="zL">رابط ${c.kind === 'class' ? 'هذا الفصل' : 'هذا المعلم'}</label><input class="in" id="zL" dir="ltr" placeholder="https://…"></div>
          <div class="field"><label for="zL0">رابط عام لكل الجداول (إن لم يُحدد رابط خاص)</label><input class="in" id="zL0" dir="ltr" data-c="link0" value="${esc(c.link0)}" placeholder="https://…"></div>
          <div class="grid g2"><div class="field"><label for="zQ1">عنوان الزر</label><input class="in" id="zQ1" data-c="qrT" value="${esc(c.qrT)}"></div><div class="field"><label for="zQ2">النص الفرعي</label><input class="in" id="zQ2" data-c="qrS" value="${esc(c.qrS)}"></div></div>
          <div class="field"><label for="zF">عبارة التذييل (عند عدم وجود رابط)</label><input class="in" id="zF" data-c="foot" value="${esc(c.foot)}"></div></details>
        <details class="dz-det"><summary>تخصيص أسماء المواد</summary><div id="zSh" class="dz-sh"></div></details>
        <div class="dz-ex"><button class="btn" id="zP">${I.print || ''} طباعة / PDF</button><button class="btn ghost" id="zPng">${I.down || ''} صورة PNG</button>
          <button class="btn sky" id="zPA">طباعة الكل (${'<span id="zN"></span>'})</button><button class="btn ghost" id="zZip">صور الكل (ZIP)</button></div>
      </aside>
      <section class="card dz-pv"><div class="dz-stage" id="zStage"><div class="dz-scale" id="zPv"></div></div><p class="small muted" id="zInfo" style="margin:8px 0 0"></p></section></div>`;
    const drawT = () => { tg = targets(); if (!tg.some(t => t[0] === cur)) cur = (tg[0] || [])[0]; $('#zT', root).innerHTML = tg.map(([id, n]) => `<option value="${id}" ${id === cur ? 'selected' : ''}>${esc(n)}</option>`).join('') || '<option>لا يوجد</option>'; $('#zN', root).textContent = AR(tg.length); };
    const drawSh = () => { const ids = [...new Set(D.slots.filter(s => s.subject_id).map(s => s.subject_id))].sort((a, b) => (A.subjName(a) || '').localeCompare(A.subjName(b) || '', 'ar')); $('#zSh', root).innerHTML = ids.map(id => `<label><span>${esc(A.subjName(id))}</span><input class="in" data-sh="${id}" value="${esc(c.short[id] || '')}" placeholder="${esc(subShort(Object.assign({}, c, { short: {} }), id))}"></label>`).join(''); $$('[data-sh]', root).forEach(i => i.oninput = () => { if (i.value.trim()) c.short[i.dataset.sh] = i.value.trim(); else delete c.short[i.dataset.sh]; changed(); }); };
    const fit = () => { const st = $('#zStage', root), sc = $('#zPv', root); if (!st) return; const k = Math.min(1, (st.clientWidth - 4) / 1123); sc.style.transform = `scale(${k})`; st.style.height = Math.ceil(794 * k) + 'px'; };
    const draw = () => { if (!cur) { $('#zPv', root).innerHTML = A.emptyBox('لا توجد حصص في هذا الجدول'); return; } $('#zPv', root).innerHTML = posterHTML(c, D, cur); $('#zL', root).value = c.links[cur] || ''; fit();
      const s = D.sched; $('#zInfo', root).textContent = s ? `التوقيت: ${s.name} · ${AR(A.bell.maxP(s, sec))} حصص · الأيام: ${A.bell.actDays(s, sec).map(d => DAYS[d]).join('، ')}` : 'بدون توقيت — يظهر الجدول بعدد حصص القسم.'; };
    let sv = null; const changed = () => { draw(); clearTimeout(sv); sv = setTimeout(() => saveCfg(Object.assign({}, c, { cur })), 900); };
    new ResizeObserver(fit).observe($('#zStage', root));
    $$('#zK button', root).forEach(b => b.onclick = () => { c.kind = b.dataset.k; saveCfg(c); A.ttDesign(root, opts); });
    $('#zT', root).onchange = e => { cur = e.target.value; changed(); };
    $('#zV', root).onchange = async e => { c.version = e.target.value; D.slots = await slotsOf(c.version); drawT(); drawSh(); changed(); };
    $('#zS', root).onchange = e => { c.sched = e.target.value; pickSched(); changed(); };
    $$('[data-c]', root).forEach(i => i.oninput = () => { c[i.dataset.c] = i.value; changed(); });
    $$('[data-b]', root).forEach(i => i.onchange = () => { c[i.dataset.b] = i.checked; if (i.dataset.b === 'shortN') drawSh(); changed(); });
    $$('[data-th]', root).forEach(b => b.onclick = () => { c.theme = b.dataset.th; $$('[data-th]', root).forEach(x => x.classList.toggle('on', x === b)); changed(); });
    $('#zL', root).oninput = e => { if (e.target.value.trim()) c.links[cur] = e.target.value.trim(); else delete c.links[cur]; changed(); };
    const nameOf = id => (tg.find(t => t[0] === id) || [, ''])[1];
    $('#zP', root).onclick = () => { A.toast('يجهّز الجدول للطباعة…'); printMany([posterHTML(c, D, cur)], `${c.title} — ${nameOf(cur)}`); };
    $('#zPA', root).onclick = () => { A.toast(`يجهّز ${AR(tg.length)} جدولاً للطباعة…`); printMany(tg.map(([id]) => posterHTML(c, D, id)), `${c.title} — ${sec.name}`); };
    $('#zPng', root).onclick = ev => A.run(ev.currentTarget, async () => { const cv = await toCanvas(posterHTML(c, D, cur)); A.download(await blobOf(cv), `${c.title} — ${nameOf(cur)}.png`); });
    $('#zZip', root).onclick = ev => { const btn = ev.currentTarget; A.run(btn, async () => { if (!window.JSZip) throw new Error('أداة الضغط غير محمّلة'); const z = new JSZip(); let n = 0; try { for (const [id, nm] of tg) { btn.textContent = `يجهّز ${AR(++n)} من ${AR(tg.length)}…`; z.file(`${nm.replace(/[\\/:*?"<>|]/g, '-')}.png`, await blobOf(await toCanvas(posterHTML(c, D, id)))); } A.download(await z.generateAsync({ type: 'blob' }), `${c.title} — ${sec.name}.zip`); } finally { btn.textContent = 'صور الكل (ZIP)'; } }); };
    drawT(); drawSh(); draw();
  };
  V.ttdesign = root => A.ttDesign(root);

  // زر في «الجدول المعتمد» لمن يملك الاطلاع على الجداول
  const tt0 = V.timetable;
  if (tt0) V.timetable = async function (root) { const r = await tt0(root); const h = root.querySelector('.card .head'); if (h && !root.querySelector('#ttDz')) { h.insertAdjacentHTML('beforeend', `<button class="btn ghost sm" id="ttDz">تصميم الجدول وتصديره</button>`); root.querySelector('#ttDz').onclick = () => { const m = A.modal('<div id="dzM"></div>', { cls: 'wide xl' }); A.ttDesign(m.el.querySelector('#dzM')); }; } return r; };
})();
