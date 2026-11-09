/* منصة دينا — عرض «الجدول الاستثنائي» التفاعلي (مثل التعليم عن بعد) بزر دخول الحصة
   ملف مستقل يعمل في صفحة ولي الأمر وفي المنصة. أربع طرق عرض: اليوم (بطاقات تُفتح بالضغط)، جدول الأسبوع، الأسبوع كاملاً، الدروس والواجبات.
   طباعة وتصدير PDF وصورة وإضافة للتقويم. يبرز «الآن» والتالية تلقائياً كل ٣٠ ثانية. */
(function () {
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const PER = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة'];
  const AR = s => String(s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const pd = s => new Date(s + 'T00:00:00');
  const dmy = s => { const x = pd(s); return '\u200F' + AR(x.getDate()) + '\u200F/\u200F' + AR(x.getMonth() + 1); };
  const safe = u => /^https?:\/\//i.test(u || '') ? u : '';
  const t12 = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')}`; };
  const LSg = k => { try { return localStorage.getItem('dlv_' + k); } catch (_) { return null; } };
  const LSs = (k, v) => { try { localStorage.setItem('dlv_' + k, v); } catch (_) { } };
  const svg = (p, sz = 16, sw = 2.2) => `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const CAMP = '<rect x="2" y="6" width="14" height="12" rx="3"/><path d="M16 10l6-3v10l-6-3z"/>';
  const CAM = svg(CAMP, 18);
  const G = {
    day: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/><rect x="7" y="12" width="4" height="4" rx="1"/>',
    table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16"/>',
    week: '<path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2"/>',
    hw: '<path d="M9 4h6l1 2h3v15H5V6h3z"/><path d="M9 12l2 2 4-4"/>',
    print: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    pdf: '<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M12 18v-6M9 15l3 3 3-3"/>',
    img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
    cal: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4M12 13v5M9.5 15.5h5"/>',
    chev: '<path d="M6 9l6 6 6-6"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
  };
  const IC = {
    topic: ['#005499', '#E1F0FB', 'الدرس', '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 5v16"/>'],
    homework: ['#B7791F', '#FFF4DC', 'الواجب', '<path d="M9 4h6l1 2h3v15H5V6h3z"/><path d="M9 12l2 2 4-4"/>'],
    note: ['#6B4FA3', '#EFEAF8', 'ملاحظة', '<path d="M4 5h16v11H8l-4 4z"/>'],
    perf: ['#2E8B57', '#E6F4EC', 'مهمة أدائية', '<path d="M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.4 6.8 19.1l1-5.8L3.5 9.2l5.9-.9z"/>'],
    llink: ['#0E8A9E', '#E0F5F8', 'رابط الدرس', '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>'],
  };
  const ico = (k, sz = 15) => svg(IC[k][3], sz);
  const KEYS = ['topic', 'homework', 'note', 'perf'];
  // عناصر إضافية يضيفها المعلم لحصة عن بعد
  const EX = { note: { l: 'ملاحظة', c: '#6B4FA3', ph: 'مثال: تجهيز الكتاب والدفتر' }, perf: { l: 'مهمة أدائية', c: '#2E8B57', ph: 'وصف المهمة وموعد التسليم' }, ws: { l: 'ورقة عمل', c: '#0E8A9E', ph: 'اسم الورقة أو المطلوب فيها' }, prep: { l: 'تجهيزات مطلوبة', c: '#B7791F', ph: 'مثال: ألوان، مسطرة، الكتاب ص ٤٥' }, act: { l: 'نشاط / تكليف', c: '#005499', ph: 'وصف النشاط' }, read: { l: 'قراءة / مراجعة', c: '#3AB1DB', ph: 'ما يُقرأ أو يُراجع' }, quiz: { l: 'اختبار قصير', c: '#C0392B', ph: 'موضوع الاختبار وموعده' }, link: { l: 'رابط إضافي', c: '#0E8A9E', ph: 'وصف الرابط' }, other: { l: 'أخرى', c: '#5F7896', ph: 'النص' } };
  const exOf = y => (Array.isArray(y.extra) ? y.extra : []).filter(x => x && ((x.t || '').trim() || safe(x.u)));
  const hasInfo = y => KEYS.some(k => (y[k] || '').trim()) || !!safe(y.llink) || exOf(y).length > 0;
  const dots = y => `<span class="lv-dots" aria-hidden="true">${KEYS.filter(k => (y[k] || '').trim()).map(k => `<i style="--c:${IC[k][0]}"></i>`).join('')}${safe(y.llink) ? `<i style="--c:${IC.llink[0]}"></i>` : ''}${exOf(y).length ? `<i style="--c:#5F7896"></i>` : ''}</span>`;
  const exHtml = y => exOf(y).map(x => { const t = EX[x.k] || EX.other; return `<div class="lv-x lv-xx" style="--c:${t.c};--bg2:${t.c}14"><b><i class="lv-xd"></i> ${esc(t.l)}:</b> ${esc(x.t || '')}${safe(x.u) ? ` <a href="${esc(safe(x.u))}" target="_blank" rel="noopener" class="lv-xl">فتح ↗</a>` : ''}</div>`; }).join('');

  const CSS = `.lv{--n:#082B5A;--b:#005499;--s:#3AB1DB;--p:#E4EBF5;--l:#D5E1F0;--m:#4D6A8F;border:1px solid #C9DAEE;border-radius:20px;background:#fff;margin:0 0 16px;overflow:hidden;box-shadow:0 1px 0 #fff inset,0 18px 40px -26px rgba(8,43,90,.55)}
    .lv-h{position:relative;background:radial-gradient(120% 140% at 100% 0,#0B4F96 0,#082B5A 55%,#061F43 100%);color:#fff;padding:16px 18px 18px;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;overflow:hidden}
    .lv-h::after{content:"";position:absolute;inset:auto 0 0 0;height:4px;background:linear-gradient(90deg,#3AB1DB,#5E9BD3,#3AB1DB)}
    .lv-h::before{content:"";position:absolute;width:220px;height:220px;border-radius:50%;left:-70px;top:-120px;background:radial-gradient(circle,rgba(58,177,219,.35),transparent 70%)}
    .lv-ht{position:relative;display:flex;flex-direction:column;gap:2px;min-width:0}.lv-h h3{margin:0;font-size:19px;color:#fff;line-height:1.3}.lv-tag{align-self:flex-start;background:rgba(58,177,219,.22);border:1px solid rgba(58,177,219,.7);color:#fff;border-radius:999px;padding:2px 12px;font-size:12px;font-weight:800}
    .lv-dt{font-size:13px;color:#BFD9F2;display:inline-flex;gap:6px;align-items:center}.lv-h .lv-room{position:relative;margin-inline-start:auto}
    .lv-room{display:inline-flex;align-items:center;gap:8px;background:#fff;color:var(--n);border-radius:14px;padding:9px 16px;font-weight:800;text-decoration:none;font-size:14px;min-height:44px;box-shadow:0 6px 16px -8px rgba(0,0,0,.5)}.lv-room:hover{background:#E1F3FA}
    .lv :focus-visible{outline:3px solid var(--s);outline-offset:2px}
    .lv-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:12px 12px 0}
    .lv-seg{display:flex;gap:4px;background:var(--p);border-radius:14px;padding:4px;overflow-x:auto;scrollbar-width:none;max-width:100%}.lv-seg::-webkit-scrollbar{display:none}
    .lv-seg button{flex:0 0 auto;display:inline-flex;align-items:center;gap:6px;border:0;background:none;border-radius:10px;padding:7px 12px;font:inherit;font-weight:700;color:var(--m);cursor:pointer;min-height:40px;font-size:14px}.lv-seg button.on{background:#fff;color:var(--n);box-shadow:0 1px 2px rgba(8,43,90,.08),0 4px 10px -4px rgba(8,43,90,.25)}
    .lv-tools{display:flex;gap:4px;flex-wrap:wrap}.lv-tb{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--l);background:#fff;color:var(--n);border-radius:10px;padding:6px 10px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;min-height:40px}.lv-tb:hover{border-color:var(--s);background:#F3F9FD}.lv-tb[disabled]{opacity:.55;cursor:wait}
    .lv-days{display:flex;gap:6px;overflow-x:auto;padding:12px 12px 4px;scrollbar-width:thin}.lv-days button{flex:1 0 auto;min-width:74px;border:1px solid var(--l);background:#fff;border-radius:14px;padding:7px 10px;font:inherit;font-weight:700;color:var(--n);cursor:pointer;text-align:center;min-height:50px;line-height:1.3}.lv-days button span{display:block;font-size:12px;font-weight:500;color:var(--m)}.lv-days button.on{background:var(--n);color:#fff;border-color:var(--n)}.lv-days button.on span{color:var(--s)}.lv-days button.today:not(.on){border-color:var(--s);box-shadow:inset 0 0 0 1px var(--s)}
    .lv-list{padding:6px 12px 12px;display:flex;flex-direction:column;gap:8px}
    .lv-r{display:grid;grid-template-columns:1fr auto;align-items:center;border:1px solid var(--l);border-radius:16px;background:#fff;transition:border-color .2s,box-shadow .2s;overflow:hidden}.lv-r:hover{border-color:#A9C8E8}
    .lv-rh{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:0;background:none;padding:9px 10px;font:inherit;color:inherit;text-align:start;cursor:pointer;min-height:58px;width:100%}.lv-rh[disabled]{cursor:default}
    .lv-n{width:50px;text-align:center}.lv-n b{display:block;width:36px;height:36px;line-height:37px;margin:0 auto;border-radius:12px;background:var(--p);color:var(--n);font-weight:800;font-size:16px}.lv-n i{display:block;font-style:normal;font-size:11px;color:var(--m);margin-top:3px;white-space:nowrap;font-family:'Myriad Pro',sans-serif}
    .lv-s{min-width:0}.lv-s b{display:block;font-size:16px;color:var(--n);line-height:1.35}.lv-s em{display:none;font-style:normal;font-size:11px;font-weight:800;border-radius:999px;padding:1px 9px;margin-inline-start:6px;vertical-align:middle}
    .lv-chev{color:var(--m);display:inline-flex;transition:transform .2s}.lv-rh[aria-expanded="true"] .lv-chev{transform:rotate(180deg)}
    .lv-dots{display:inline-flex;gap:3px;margin-inline-start:6px;vertical-align:middle}.lv-dots i{width:8px;height:8px;border-radius:50%;background:var(--c);display:inline-block}
    .lv-a{padding:0 10px}.lv-join{display:inline-flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(135deg,#0A63B0,#005499);color:#fff;border-radius:12px;padding:9px 14px;text-decoration:none;font-weight:800;font-size:14px;min-height:44px;white-space:nowrap;box-shadow:0 6px 14px -8px rgba(0,84,153,.8)}.lv-join:hover{background:var(--n)}
    .lv-rd{grid-column:1/-1;border-top:1px dashed var(--l);background:#FAFCFF;padding:10px 12px 12px;display:grid;gap:8px}
    .lv-meta{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;color:var(--m)}.lv-meta span{display:inline-flex;align-items:center;gap:5px}
    .lv-x{border-inline-start:4px solid var(--c);background:var(--bg2);border-radius:10px;padding:7px 10px;font-size:14px;color:#0b1f3a;line-height:1.65;white-space:pre-wrap}.lv-x b{color:var(--c);display:inline-flex;align-items:center;gap:5px}
    .lv-ll{display:inline-flex;align-items:center;gap:6px;align-self:start;border:1px solid var(--c);color:var(--c);background:var(--bg2);border-radius:10px;padding:6px 12px;font-size:13px;font-weight:800;text-decoration:none;min-height:40px}
    .lv-empty{font-size:13px;color:var(--m)}.lv-empty.own{color:#B7791F;font-weight:700}.lv-ow{display:inline-block;font-size:11px;font-weight:800;color:#B7791F;background:#FFF4DC;border:1px dashed #D69E2E;border-radius:8px;padding:2px 8px}
    .lv-ed{justify-self:start;border:1px dashed #84B7E3;background:#fff;color:var(--b);border-radius:10px;padding:6px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;min-height:40px}
    .lv-brk{display:flex;align-items:center;gap:8px;justify-content:center;font-size:13px;color:#8A5A12;background:linear-gradient(90deg,transparent,#FFF4DC 20%,#FFF4DC 80%,transparent);border-radius:12px;padding:5px}
    .lv-r.off{background:#F7F9FC;border-style:dashed}.lv-r.off .lv-s b{color:var(--m);font-weight:500;font-size:14px}
    .lv-r.now{border-color:#2E8B57;box-shadow:0 0 0 3px rgba(46,139,87,.18)}.lv-r.now .lv-rh{background:#EEF8F1}.lv-r.now .lv-n b{background:#2E8B57;color:#fff}.lv-r.now .lv-join{background:#2E8B57;animation:lvp 1.6s infinite}.lv-r.now em.e-now{display:inline-block;background:#2E8B57;color:#fff}.lv-r.next em.e-next{display:inline-block;background:#E1F3FA;color:var(--b)}.lv-r.past{opacity:.62}
    @keyframes lvp{0%{box-shadow:0 0 0 0 rgba(46,139,87,.55)}70%{box-shadow:0 0 0 10px rgba(46,139,87,0)}100%{box-shadow:0 0 0 0 rgba(46,139,87,0)}}
    .lv-wk{overflow-x:auto;padding:10px 12px 12px}.lv-wk table{border-collapse:separate;border-spacing:0;min-width:660px;width:100%;border:1px solid #C9DAEE;border-radius:16px;overflow:hidden}
    .lv-wk thead th{background:linear-gradient(180deg,#0A3268,#082B5A);color:#fff;padding:8px 6px;font-size:13px;font-weight:800}.lv-wk thead th i{display:block;font-style:normal;font-size:11px;color:#9FD3EC;font-family:'Myriad Pro',sans-serif;font-weight:400}
    .lv-wk tbody th{background:#EAF1F9;color:var(--n);padding:6px 10px;font-size:14px;white-space:nowrap;border-top:1px solid #D5E1F0}.lv-wk tbody th i{display:block;font-style:normal;font-size:11px;color:var(--m);font-weight:500}
    .lv-wk td{border-top:1px solid #E3ECF6;border-inline-start:1px solid #E3ECF6;padding:4px;text-align:center;vertical-align:middle;height:66px}.lv-wk tr:nth-child(even) td{background:#FBFDFF}
    .lv-wk td.brk,.lv-wk th.brk{width:22px;min-width:22px;padding:0;background:#FFF4DC!important;color:#8A5A12;font-size:11px}.lv-wk th.brk{background:#B7791F!important;color:#fff}.lv-wk th.brk span{writing-mode:vertical-rl}
    .lv-cell{display:flex;flex-direction:column;align-items:center;gap:2px;width:100%;min-height:58px;justify-content:center;border:0;background:none;border-radius:10px;font:inherit;color:inherit;cursor:pointer;padding:4px}.lv-cell:hover{background:#EEF5FC}.lv-cell b{color:var(--n);font-size:13px;line-height:1.3}.lv-cell small{font-size:11px;color:var(--m)}
    .lv-wk td.now .lv-cell{background:#E5F4EA;box-shadow:inset 0 0 0 2px #2E8B57}.lv-wk td.off{background:repeating-linear-gradient(45deg,#F3F6FA,#F3F6FA 6px,#fff 6px,#fff 12px)!important}
    .lv-wk tr.today th{background:var(--s);color:var(--n)}.lv-wk tr.today td{background:#F2FAFE}
    .lv-wkd{margin:8px 12px 12px;border:1px solid #C9DAEE;border-radius:16px;padding:12px;background:#FAFCFF;display:grid;gap:8px;position:relative}.lv-wkd h4{margin:0;font-size:16px;color:var(--n)}.lv-wkd .lv-xx{position:absolute;inset-inline-end:8px;top:8px;border:0;background:#fff;border-radius:10px;width:36px;height:36px;display:grid;place-items:center;cursor:pointer;color:var(--m)}
    .lv-ag{padding:8px 12px 12px;display:grid;gap:8px}.lv-ag details{border:1px solid var(--l);border-radius:16px;background:#fff;overflow:hidden}.lv-ag summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:10px 12px;font-weight:800;color:var(--n);min-height:52px}.lv-ag summary::-webkit-details-marker{display:none}
    .lv-ag summary .dn{background:var(--n);color:#fff;border-radius:10px;padding:3px 12px}.lv-ag summary .dd{color:var(--m);font-weight:500;font-size:13px}.lv-ag summary .cnt{margin-inline-start:auto;font-size:12px;color:var(--m);font-weight:500}.lv-ag details[open] summary{border-bottom:1px solid var(--l);background:#F5F9FD}.lv-ag details.today summary .dn{background:var(--s);color:var(--n)}
    .lv-ag .lv-list{padding:10px}
    .lv-hw{padding:10px 12px 14px;display:grid;gap:10px}.lv-hwd{border:1px solid var(--l);border-radius:16px;overflow:hidden}.lv-hwd h4{margin:0;padding:8px 12px;background:#EAF1F9;color:var(--n);font-size:15px;display:flex;gap:8px;align-items:center}.lv-hwd h4 span{font-weight:500;font-size:12px;color:var(--m)}
    .lv-hwi{display:grid;grid-template-columns:minmax(110px,160px) 1fr;gap:10px;padding:10px 12px;border-top:1px solid #EEF3F9}.lv-hwi:first-of-type{border-top:0}.lv-hwi>b{color:var(--n)}.lv-hwi>b small{display:block;font-weight:500;color:var(--m);font-size:12px}.lv-hwi .lv-x{margin:0 0 4px}
    .lv-xd{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c);vertical-align:middle}.lv-xl{color:var(--c);font-weight:800;text-decoration:none;white-space:nowrap}.lv-xl:hover{text-decoration:underline}
    .lv-note{font-size:12px;color:#5F7896;padding:0 14px 14px;margin:0}
    .lv-leg{display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px 0;font-size:12px}.lv-leg span{display:inline-flex;align-items:center;gap:5px;color:var(--c);background:var(--bg2);border-radius:999px;padding:2px 10px;font-weight:700}.lv-leg span i{width:8px;height:8px;border-radius:50%;background:var(--c)}
    .lv-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#082B5A;color:#fff;padding:10px 18px;border-radius:12px;z-index:50;font-weight:700;box-shadow:0 10px 30px -10px rgba(0,0,0,.5)}
    .lv [hidden]{display:none!important}.lv-n i,.lv-wk th i,.lv-brk span,.lv-meta .tm{direction:ltr;unicode-bidi:isolate}
    @media (prefers-reduced-motion:reduce){.lv-r.now .lv-join{animation:none}.lv-r,.lv-chev{transition:none}}
    @media (max-width:560px){.lv-h{padding:14px}.lv-h .lv-room{margin-inline-start:0;width:100%;justify-content:center}.lv-r{grid-template-columns:1fr}.lv-a{padding:0 10px 10px}.lv-join{width:100%}.lv-tools{width:100%}.lv-tb{flex:1;justify-content:center}.lv-tb span{display:none}.lv-hwi{grid-template-columns:1fr;gap:4px}}
    @media print{.lv{display:none}}`;
  if (!document.getElementById('lvCss')) { const st = document.createElement('style'); st.id = 'lvCss'; st.textContent = CSS; document.head.appendChild(st); }

  const REG = {};
  function visibleDays(s) {
    const M = s.meta || {}, ws = pd(s.from); ws.setDate(ws.getDate() - ws.getDay());
    return (M.days || [0, 1, 2, 3, 4]).map(d => { const x = new Date(ws); x.setDate(ws.getDate() + d); return { d, date: iso(x) }; }).filter(x => x.date >= s.from && x.date <= s.to);
  }
  const nOf = (M, d, P) => (M.perDay && M.perDay[d]) || M.periods || P || 7;
  const details = (y, x, p, tm, o, s) => {
    const blocks = KEYS.filter(k => (y[k] || '').trim()).map(k => `<div class="lv-x" style="--c:${IC[k][0]};--bg2:${IC[k][1]}"><b>${ico(k, 14)} ${IC[k][2]}:</b> ${esc(y[k])}</div>`).join('');
    return `<div class="lv-meta"><span>${svg(G.clock, 14)} الحصة ${PER[p] || AR(p + 1)}${tm[0] ? ` · <span class="tm">${t12(tm[0])} – ${t12(tm[1])}</span>` : ''}</span>${y.teacher ? `<span>${svg(G.user, 14)} ${esc(y.teacher)}</span>` : ''}</div>
      ${blocks}${exHtml(y)}${safe(y.llink) ? `<a class="lv-ll" href="${esc(safe(y.llink))}" target="_blank" rel="noopener" style="--c:${IC.llink[0]};--bg2:${IC.llink[1]}">${ico('llink', 15)} فتح رابط الدرس</a>` : ''}
      ${!blocks && !exOf(y).length && !safe(y.llink) && (o.teacher || o.owner) ? `<span class="lv-empty ${o.owner ? 'own' : ''}">${o.teacher ? 'لم تُضف بيانات لهذه الحصة بعد.' : 'لم يُضف المعلم الدرس أو الواجب بعد — يظهر لك فقط'}</span>` : ''}
      ${o.owner && !safe(y.link) && !(s && safe(s.cls_link)) ? '<span class="lv-empty own">لا يوجد رابط دخول لهذه الحصة — يظهر لك فقط</span>' : ''}
      ${o.edit ? `<button type="button" class="lv-ed" data-lved="${esc(s.id)}|${esc(y.c || '')}|${x.d}|${p}">✎ ${hasInfo(y) ? 'تعديل بيانات الحصة' : 'إضافة الرابط والعناصر الإضافية'}</button>` : ''}`;
  };

  // ما يظهر لولي الأمر — يتحكم فيه المالك من إعدادات الجدول (meta.vis)
  const VIS0 = { teacher: 1, topic: 1, homework: 1, note: 1, perf: 1, extra: 1, llink: 1, join: 1, room: 1, times: 1, export: 1, legend: 1, views: ['day', 'table', 'week', 'hw'] };
  function html(s, o = {}) {
    const VS = Object.assign({}, VIS0, (s.meta || {}).vis || {});
    if (!o.teacher) { const k = (y, f) => VS[f] ? y[f] : ''; s = { ...s, cls_link: VS.join && VS.room ? s.cls_link : '', meta: { ...(s.meta || {}), times: VS.times ? (s.meta || {}).times : [] }, cells: (s.cells || []).map(y => ({ ...y, teacher: k(y, 'teacher'), topic: k(y, 'topic'), homework: k(y, 'homework'), note: k(y, 'note'), perf: k(y, 'perf'), extra: VS.extra ? y.extra : [], llink: k(y, 'llink'), link: VS.join ? y.link : '' })) }; }
    const M = s.meta || {}, vd = visibleDays(s); if (!vd.length) return '';
    const td = o.today || iso(new Date()), sel = (vd.find(x => x.date === td) || vd.find(x => x.date > td) || vd[0]);
    const id = 'lv' + Math.random().toString(36).slice(2, 8);
    REG[id] = { s, o };
    const room = safe(s.cls_link);
    const linkOf = y => safe(y.link) || (o.teacher ? '' : room);
    const J = (y, d, p) => o.preview || !s.id ? '' : `data-j="${esc(s.id)}|${esc(y.c || o.cls || '')}|${d}|${p}"`;
    const P = M.periods || Math.max(1, ...(s.cells || []).map(c => c.p + 1));
    const joinBtn = (y, d, p, cls = 'lv-join') => { const l = linkOf(y); return l ? `<a class="${cls}" ${J(y, d, p)} href="${esc(l)}" target="_blank" rel="noopener" aria-label="دخول حصة ${esc(y.subject || '')}">${CAM} دخول الحصة</a>` : ''; };
    const openAll = !!o.teacher;
    const rows = (x, sfx) => { const n = nOf(M, x.d, P); let h = ''; for (let p = 0; p < n; p++) { const c = (s.cells || []).filter(y => y.d === x.d && y.p === p); const tm = (M.times || [])[p] || []; const num = `<div class="lv-n"><b>${AR(p + 1)}</b>${tm[0] ? `<i>${t12(tm[0])} – ${t12(tm[1])}</i>` : ''}</div>`;
      if (c.length) c.forEach((y, k) => { const rid = `${id}-${sfx}-${x.d}-${p}-${k}`;
        h += `<div class="lv-r" data-date="${x.date}" data-f="${tm[0] || ''}" data-t="${tm[1] || ''}"><button type="button" class="lv-rh" aria-expanded="${openAll}" aria-controls="${rid}">${num}<div class="lv-s"><b>${esc(y.subject || '')}${dots(y)}<em class="e-now">الآن</em><em class="e-next">التالية</em></b></div><span class="lv-chev">${svg(G.chev, 18)}</span></button><div class="lv-a">${joinBtn(y, x.d, p) || (o.owner ? '<span class="lv-ow" title="يظهر لك فقط">بلا رابط</span>' : '')}</div><div class="lv-rd" id="${rid}" ${openAll ? '' : 'hidden'}>${details(y, x, p, tm, o, s)}</div></div>`; });
      else h += `<div class="lv-r off" data-date="${x.date}" data-f="${tm[0] || ''}" data-t="${tm[1] || ''}"><div class="lv-rh">${num}<div class="lv-s"><b>لا توجد حصة</b></div><span></span></div></div>`;
      (M.breaks || []).filter(b => b.after === p + 1 && p + 1 <= n).forEach(b => { h += `<div class="lv-brk">☕ ${esc(b.label || 'استراحة')} ${b.from ? `<span dir="ltr">${t12(b.from)} – ${t12(b.to)}</span>` : ''}</div>`; }); } return h; };
    // جدول الأسبوع
    const brkAfter = p => (M.breaks || []).filter(b => b.after === p + 1 && p + 1 <= P);
    const week = `<div class="lv-wk"><table><thead><tr><th scope="col">اليوم</th>${Array.from({ length: P }, (_, p) => { const tm = (M.times || [])[p] || []; return `<th scope="col">${PER[p] || AR(p + 1)}${tm[0] ? `<i>${t12(tm[0])} – ${t12(tm[1])}</i>` : ''}</th>${brkAfter(p).map(b => `<th class="brk" title="${esc(b.label || 'استراحة')}"><span>${esc(b.label || 'استراحة')}</span></th>`).join('')}`; }).join('')}</tr></thead><tbody>${vd.map(x => `<tr class="${x.date === td ? 'today' : ''}"><th scope="row">${DAYS[x.d]}<i>${dmy(x.date)}</i></th>${Array.from({ length: P }, (_, p) => { const n = nOf(M, x.d, P); const bk = brkAfter(p).map(() => '<td class="brk" aria-hidden="true"></td>').join(''); if (p >= n) return '<td class="off"></td>' + bk; const c = (s.cells || []).filter(y => y.d === x.d && y.p === p); const tm = (M.times || [])[p] || [];
      return `<td data-date="${x.date}" data-f="${tm[0] || ''}" data-t="${tm[1] || ''}">${c.map((y, k) => `<button type="button" class="lv-cell" data-wc="${x.date}|${p}|${k}" aria-label="${esc(y.subject || '')} — ${DAYS[x.d]} الحصة ${PER[p] || AR(p + 1)}"><b>${esc(y.subject || '')}</b>${y.teacher ? `<small>${esc(y.teacher)}</small>` : ''}${dots(y)}${o.owner && (!linkOf(y) || !hasInfo(y)) ? `<small class="lv-ow">${!linkOf(y) ? 'بلا رابط' : 'بلا بيانات'}</small>` : ''}</button>`).join('') || '<span style="color:#9AB">—</span>'}</td>${bk}`; }).join('')}</tr>`).join('')}</tbody></table></div><div class="lv-wkd" data-wkd hidden></div>`;
    // الأسبوع كاملاً
    const agenda = `<div class="lv-ag">${vd.map(x => { const n = (s.cells || []).filter(y => y.d === x.d).length; return `<details class="${x.date === td ? 'today' : ''}" ${x.date === sel.date ? 'open' : ''}><summary><span class="dn">${DAYS[x.d]}</span><span class="dd">${dmy(x.date)}</span><span class="cnt">${AR(n)} حصة</span><span class="lv-chev">${svg(G.chev, 18)}</span></summary><div class="lv-list">${rows(x, 'a')}</div></details>`; }).join('')}</div>`;
    // الدروس والواجبات
    const hwDays = vd.map(x => { const l = (s.cells || []).filter(y => y.d === x.d && hasInfo(y)).sort((a, b) => a.p - b.p); if (!l.length) return ''; return `<div class="lv-hwd"><h4>${DAYS[x.d]} <span>${dmy(x.date)}</span></h4>${l.map(y => `<div class="lv-hwi"><b>${esc(y.subject || '')}<small>الحصة ${PER[y.p] || AR(y.p + 1)}${y.teacher ? ' · ' + esc(y.teacher) : ''}</small></b><div>${KEYS.filter(k => (y[k] || '').trim()).map(k => `<div class="lv-x" style="--c:${IC[k][0]};--bg2:${IC[k][1]}"><b>${ico(k, 14)} ${IC[k][2]}:</b> ${esc(y[k])}</div>`).join('')}${safe(y.llink) ? `<a class="lv-ll" href="${esc(safe(y.llink))}" target="_blank" rel="noopener" style="--c:${IC.llink[0]};--bg2:${IC.llink[1]}">${ico('llink', 15)} رابط الدرس</a>` : ''}</div></div>`).join('')}</div>`; }).join('');
    const hw = `<div class="lv-hw">${hwDays || `<p class="lv-empty" style="text-align:center;padding:18px">لم يُضف المعلمون دروساً أو واجبات لهذه الفترة بعد.</p>`}</div>`;
    const views = [['day', 'اليوم', G.day], ['table', 'جدول الأسبوع', G.table], ['week', 'الأسبوع كاملاً', G.week], ['hw', 'الدروس والواجبات', G.hw]].filter(v => o.teacher || (VS.views || []).includes(v[0]) || (VS.views || []).length === 0 && v[0] === 'day');
    const cur = views.some(v => v[0] === LSg('view' + (o.teacher ? 't' : ''))) ? LSg('view' + (o.teacher ? 't' : '')) : ((views[0] || [])[0] || 'day');
    return `<section class="lv" id="${id}" aria-label="${esc(s.label || 'جدول استثنائي')}"><div class="lv-h"><div class="lv-ht">${s.tag ? `<span class="lv-tag">${esc(s.tag)}</span>` : ''}<h3>${esc(s.label || 'جدول استثنائي')}${o.clsName ? ` — ${esc(o.clsName)}` : ''}</h3><span class="lv-dt">${svg(G.day, 14)} ${dmy(s.from)} — ${dmy(s.to)}</span></div>${room && !o.teacher ? `<a class="lv-room" ${o.preview || !s.id ? '' : `data-jr="${esc(s.id)}|${esc(o.cls || '')}"`} href="${esc(room)}" target="_blank" rel="noopener">${CAM} دخول قاعة الفصل</a>` : ''}</div>
      <div class="lv-bar"><div class="lv-seg" role="tablist" aria-label="طريقة العرض">${views.map(([k, l, g]) => `<button role="tab" class="${k === cur ? 'on' : ''}" data-lvv="${k}" aria-selected="${k === cur}">${svg(g, 16)} ${l}</button>`).join('')}</div>
        <div class="lv-tools">${o.preview || (!o.teacher && !VS.export) ? '' : `<button type="button" class="lv-tb" data-lva="print" title="طباعة" aria-label="طباعة">${svg(G.print, 16)} <span>طباعة</span></button><button type="button" class="lv-tb" data-lva="pdf" title="تصدير PDF" aria-label="تصدير PDF">${svg(G.pdf, 16)} <span>PDF</span></button><button type="button" class="lv-tb" data-lva="png" title="حفظ صورة" aria-label="حفظ صورة">${svg(G.img, 16)} <span>صورة</span></button>${(M.times || []).length ? `<button type="button" class="lv-tb" data-lva="ics" title="إضافة الحصص إلى تقويم الجوال" aria-label="إضافة الحصص إلى التقويم">${svg(G.cal, 16)} <span>التقويم</span></button>` : ''}`}</div></div>
      <div class="lv-leg" aria-label="دلالة الألوان" ${!o.teacher && !VS.legend ? 'hidden' : ''}>${['topic', 'homework', 'note', 'perf', 'llink'].map(k => `<span style="--c:${IC[k][0]};--bg2:${IC[k][1]}"><i></i>${IC[k][2]}</span>`).join('')}<span style="--c:#2E8B57;--bg2:#E5F4EA"><i></i>الحصة الجارية</span></div>
      <div data-lvp="day" ${cur === 'day' ? '' : 'hidden'}><div class="lv-days" role="tablist" aria-label="الأيام">${vd.map(x => `<button role="tab" data-lvd="${x.date}" class="${x.date === sel.date ? 'on' : ''} ${x.date === td ? 'today' : ''}" aria-selected="${x.date === sel.date}">${DAYS[x.d]}<span>${dmy(x.date)}</span></button>`).join('')}</div>
        ${vd.map(x => `<div class="lv-list" data-lvl="${x.date}" ${x.date === sel.date ? '' : 'hidden'}>${rows(x, 'd')}</div>`).join('')}<p class="lv-note">اضغط اسم المادة لعرض الدرس والواجب والملاحظات.</p></div>
      <div data-lvp="table" ${cur === 'table' ? '' : 'hidden'}>${week}<p class="lv-note">اضغط أي حصة لعرض تفاصيلها وزر الدخول.</p></div>
      <div data-lvp="week" ${cur === 'week' ? '' : 'hidden'}>${agenda}</div>
      <div data-lvp="hw" ${cur === 'hw' ? '' : 'hidden'}>${hw}</div>
      <p class="lv-note">جدول استثنائي لهذه الفترة فقط${o.teacher ? ' — حصصك' : ''}. يبرز «الآن» تلقائياً وقت الحصة.</p></section>`;
  }

  // ---------- الطباعة والتصدير ----------
  const base = () => location.href.replace(/[^/]*$/, '').split('#')[0].split('?')[0];
  const docCss = `@font-face{font-family:'GE SS Two';font-weight:400 500;src:url(fonts/gess-two-medium.woff2)}@font-face{font-family:'GE SS Two';font-weight:600 900;src:url(fonts/gess-two-bold.woff2)}@font-face{font-family:'Myriad Pro';src:url(fonts/myriad-pro-regular.woff2)}
    .pd{font-family:'GE SS Two','Myriad Pro',sans-serif;color:#082B5A;background:#fff;direction:rtl;width:1080px;padding:26px 30px;box-sizing:border-box}
    .pd header{display:flex;align-items:center;justify-content:space-between;border-bottom:4px solid #3AB1DB;padding-bottom:12px;margin-bottom:14px}.pd header img{height:60px}
    .pd h1{margin:0;font-size:24px;font-weight:800}.pd .sub{margin:4px 0 0;color:#005499;font-size:14px}.pd .tag{display:inline-block;background:#082B5A;color:#fff;border-radius:999px;padding:2px 12px;font-size:12px;margin-inline-start:6px;vertical-align:middle}
    .pd table{width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:16px}.pd thead th{background:#082B5A;color:#fff;padding:7px 4px;font-weight:800}.pd thead th small{display:block;color:#9FD3EC;font-weight:400;font-family:'Myriad Pro',sans-serif;font-size:11px}
    .pd tbody th{background:#E4EBF5;padding:6px 8px;white-space:nowrap}.pd tbody th small{display:block;font-weight:400;color:#4D6A8F}.pd td{border:1px solid #B9D0EA;padding:5px 4px;text-align:center;vertical-align:middle;height:54px}.pd td b{display:block}.pd td small{color:#4D6A8F;font-size:11px}
    .pd td.brk,.pd th.brk{background:#FFF4DC;color:#8A5A12;width:26px;font-size:10px;padding:0}.pd th.brk{background:#B7791F;color:#fff}.pd td.off{background:#F3F6FA}
    .pd .dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin:0 1px}.pd h2{font-size:17px;margin:6px 0 8px;border-inline-start:5px solid #3AB1DB;padding-inline-start:8px}
    .pd .hw td{text-align:start;vertical-align:top;height:auto}.pd .hw td:first-child{white-space:nowrap;font-weight:800}.pd .k{font-weight:800}.pd .leg{font-size:12px;color:#4D6A8F;margin:-8px 0 12px}
    .pd footer{margin-top:10px;border-top:2px solid #082B5A;padding-top:6px;font-size:11px;display:flex;justify-content:space-between;color:#4D6A8F}`;
  function docHtml(s, o, part) {
    const M = s.meta || {}, vd = visibleDays(s), P = M.periods || Math.max(1, ...(s.cells || []).map(c => c.p + 1));
    const brkAfter = p => (M.breaks || []).filter(b => b.after === p + 1 && p + 1 <= P);
    const dt = y => KEYS.filter(k => (y[k] || '').trim()).map(k => `<span class="dot" style="background:${IC[k][0]}"></span>`).join('') + (safe(y.llink) ? `<span class="dot" style="background:${IC.llink[0]}"></span>` : '');
    const tbl = `<table><thead><tr><th>اليوم</th>${Array.from({ length: P }, (_, p) => { const tm = (M.times || [])[p] || []; return `<th>${PER[p] || AR(p + 1)}${tm[0] ? `<small><span style="direction:ltr;display:inline-block">${t12(tm[0])} – ${t12(tm[1])}</span></small>` : ''}</th>${brkAfter(p).map(b => `<th class="brk">${esc(b.label || 'استراحة')}</th>`).join('')}`; }).join('')}</tr></thead><tbody>${vd.map(x => `<tr><th>${DAYS[x.d]}<small>${dmy(x.date)}</small></th>${Array.from({ length: P }, (_, p) => { const bk = brkAfter(p).map(() => '<td class="brk"></td>').join(''); if (p >= nOf(M, x.d, P)) return '<td class="off"></td>' + bk; const c = (s.cells || []).filter(y => y.d === x.d && y.p === p); return `<td>${c.map(y => `<b>${esc(y.subject || '')}</b>${y.teacher ? `<small>${esc(y.teacher)}</small>` : ''}<div>${dt(y)}</div>`).join('') || '—'}</td>${bk}`; }).join('')}</tr>`).join('')}</tbody></table>`;
    const items = vd.flatMap(x => (s.cells || []).filter(y => y.d === x.d && hasInfo(y)).sort((a, b) => a.p - b.p).map(y => ({ x, y })));
    const hw = items.length ? `<h2>الدروس والواجبات</h2><table class="hw"><thead><tr><th>اليوم</th><th>المادة</th><th>الدرس</th><th>الواجب</th><th>ملاحظات وعناصر أخرى</th></tr></thead><tbody>${items.map(({ x, y }) => `<tr><td>${DAYS[x.d]} ${dmy(x.date)}</td><td class="k">${esc(y.subject || '')}</td><td>${esc(y.topic || '')}</td><td>${esc(y.homework || '')}</td><td>${esc([y.note, y.perf ? 'مهمة أدائية: ' + y.perf : '', ...exOf(y).map(x => (EX[x.k] || EX.other).l + ': ' + (x.t || '') + (safe(x.u) ? ' (' + safe(x.u) + ')' : ''))].filter(v => (v || '').trim()).join(' · '))}</td></tr>`).join('')}</tbody></table>` : '';
    return docWrap(`${esc(s.label || 'جدول استثنائي')}${s.tag ? `<span class="tag">${esc(s.tag)}</span>` : ''}`, `${o.clsName ? esc(o.clsName) + ' · ' : ''}${dmy(s.from)} — ${dmy(s.to)}`,
      `${part !== 'hw' ? `${tbl}<p class="leg">${['topic', 'homework', 'note', 'llink'].map(k => `<span class="dot" style="background:${IC[k][0]}"></span> ${IC[k][2]}`).join(' &nbsp; ')}</p>` : ''}${part !== 'table' ? hw : ''}`);
  }
  const docWrap = (title, sub, body) => `<div class="pd"><header><div><h1>${title}</h1><p class="sub">${sub}</p></div><img src="assets/logo.svg" alt="مدارس دينا العالمية"></header>${body}<footer><span>مدارس دينا العالمية</span><span dir="ltr">Dinaaedu · 920035881</span></footer></div>`;
  const toast = m => { const t = document.createElement('div'); t.className = 'lv-toast'; t.setAttribute('role', 'status'); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };
  const fname = (s, o, ext) => `${(s.label || 'جدول').replace(/[\\/:*?"<>|]/g, '')}${o.clsName ? ' - ' + o.clsName : ''}.${ext}`;
  const printIt = (s, o) => printHtml(docHtml(s, o), fname(s, o, 'pdf'));
  function printHtml(doc, title) {
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:-9999px;width:1200px;height:900px;border:0'; f.title = 'طباعة'; document.body.appendChild(f);
    f.contentDocument.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="${base()}"><title>${esc(title)}</title><style>${docCss}@page{size:A4 landscape;margin:8mm}body{margin:0}.pd{width:auto;padding:0}.pd table{page-break-inside:auto}.pd tr{page-break-inside:avoid}</style></head><body>${doc}</body></html>`);
    f.contentDocument.close();
    const go = () => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 4000); };
    (f.contentDocument.fonts ? f.contentDocument.fonts.ready : Promise.resolve()).then(() => setTimeout(go, 400));
  }
  const loadJs = src => new Promise((res, rej) => { if ([...document.scripts].some(x => x.src.includes(src))) return res(); const e = document.createElement('script'); e.src = src; e.onload = res; e.onerror = () => rej(new Error('تعذّر تحميل أداة التصدير')); document.head.appendChild(e); });
  async function render(s, o) { return renderHtml(docHtml(s, o)); }
  async function renderHtml(doc) {
    await loadJs('vendor/html2canvas.min.js');
    if (!document.getElementById('lvDocCss')) { const st = document.createElement('style'); st.id = 'lvDocCss'; st.textContent = docCss; document.head.appendChild(st); }
    const w = document.createElement('div'); w.style.cssText = 'position:fixed;left:-12000px;top:0;z-index:-1'; w.innerHTML = doc; document.body.appendChild(w);
    try { if (document.fonts) await document.fonts.ready; await new Promise(r => setTimeout(r, 150)); return await window.html2canvas(w.firstElementChild, { scale: 2, backgroundColor: '#fff', useCORS: true, logging: false }); } finally { w.remove(); }
  }
  const download = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  const pdf = async (s, o) => pdfHtml(docHtml(s, o), fname(s, o, 'pdf'));
  async function pdfHtml(html, name) {
    const cv = await renderHtml(html); await loadJs('vendor/jspdf.umd.min.js');
    const { jsPDF } = window.jspdf; const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = 297, H = 210, m = 6, iw = W - 2 * m, ih = cv.height * iw / cv.width, pageH = H - 2 * m;
    if (ih <= pageH) doc.addImage(cv.toDataURL('image/jpeg', 0.92), 'JPEG', m, m, iw, ih);
    else { const sliceH = Math.floor(cv.width * pageH / iw); for (let y = 0, i = 0; y < cv.height; y += sliceH, i++) { const c = document.createElement('canvas'); c.width = cv.width; c.height = Math.min(sliceH, cv.height - y); c.getContext('2d').drawImage(cv, 0, -y); if (i) doc.addPage(); doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', m, m, iw, c.height * iw / cv.width); } }
    doc.save(name);
  }
  async function png(s, o) { const cv = await render(s, o); download(cv.toDataURL('image/png'), fname(s, o, 'png')); }
  function ics(s, o) {
    const M = s.meta || {}, vd = visibleDays(s), T = M.times || []; const z = n => String(n).padStart(2, '0');
    const stamp = new Date(); const ds = `${stamp.getUTCFullYear()}${z(stamp.getUTCMonth() + 1)}${z(stamp.getUTCDate())}T${z(stamp.getUTCHours())}${z(stamp.getUTCMinutes())}00Z`;
    const escI = t => String(t || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => '\\' + m);
    const room = safe(s.cls_link); let n = 0;
    const ev = vd.flatMap(x => (s.cells || []).filter(y => y.d === x.d && T[y.p]).map(y => { n++; const d = x.date.replace(/-/g, ''), [f, t] = T[y.p]; const l = safe(y.link) || room;
      return ['BEGIN:VEVENT', `UID:${s.id || 'dina'}-${x.date}-${y.p}-${n}@dinaschool`, `DTSTAMP:${ds}`, `DTSTART:${d}T${f.replace(':', '')}00`, `DTEND:${d}T${t.replace(':', '')}00`, `SUMMARY:${escI(y.subject + (o.clsName ? ' — ' + o.clsName : ''))}`, `DESCRIPTION:${escI([y.teacher, y.topic && 'الدرس: ' + y.topic, y.homework && 'الواجب: ' + y.homework, l && 'دخول الحصة: ' + l].filter(Boolean).join('\n'))}`, l ? `URL:${l}` : '', 'BEGIN:VALARM', 'TRIGGER:-PT5M', 'ACTION:DISPLAY', 'DESCRIPTION:تبدأ الحصة بعد ٥ دقائق', 'END:VALARM', 'END:VEVENT'].filter(Boolean).join('\r\n'); }));
    const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dina Schools//Live//AR', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
    download(URL.createObjectURL(new Blob([txt], { type: 'text/calendar;charset=utf-8' })), fname(s, o, 'ics')); return n;
  }

  function tick(root) {
    const now = new Date(), d = iso(now), hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    root.querySelectorAll('.lv-list').forEach(l => { let nextSet = false; l.querySelectorAll('.lv-r').forEach(r => { const on = r.dataset.date === d && r.dataset.f && r.dataset.f <= hm && hm < r.dataset.t; const past = r.dataset.date < d || (r.dataset.date === d && r.dataset.t && r.dataset.t <= hm); r.classList.toggle('now', on && !r.classList.contains('off')); const nx = !on && !nextSet && r.dataset.date === d && r.dataset.f > hm && !r.classList.contains('off'); if (nx) nextSet = true; r.classList.toggle('next', nx); if (!r.classList.contains('off')) r.classList.toggle('past', past); }); });
    root.querySelectorAll('.lv-wk td[data-f]').forEach(c => c.classList.toggle('now', c.dataset.date === d && c.dataset.f && c.dataset.f <= hm && hm < c.dataset.t));
  }
  function bind(root) {
    if (!root) return;
    if (!root._lvJ) { root._lvJ = 1; root.addEventListener('click', e => { const a = e.target.closest('[data-j],[data-jr]'); if (!a || !window.DinaLive.onJoin) return; try { if (a.dataset.j) { const [ds, c, d, p] = a.dataset.j.split('|'); window.DinaLive.onJoin(ds, c, +d, +p); } else { const [ds, c] = a.dataset.jr.split('|'); const r = a.closest('.lv').querySelector('.lv-r.now'); if (r) { const j = r.querySelector('[data-j]'); if (j) { const [, , d, p] = j.dataset.j.split('|'); window.DinaLive.onJoin(ds, c, +d, +p); } } } } catch (_) {} }); }
    root.querySelectorAll('.lv').forEach(sec => {
      const R = REG[sec.id] || {};
      sec.querySelectorAll('[data-lvd]').forEach(b => b.onclick = () => { sec.querySelectorAll('[data-lvd]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); sec.querySelectorAll('[data-lvl]').forEach(l => l.hidden = l.dataset.lvl !== b.dataset.lvd); });
      sec.querySelectorAll('.lv-rh[aria-controls]').forEach(b => b.onclick = () => { const x = document.getElementById(b.getAttribute('aria-controls')); if (!x) return; x.hidden = !x.hidden; b.setAttribute('aria-expanded', !x.hidden); });
      sec.querySelectorAll('[data-lvv]').forEach(b => b.onclick = () => { sec.querySelectorAll('[data-lvv]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); sec.querySelectorAll('[data-lvp]').forEach(p => p.hidden = p.dataset.lvp !== b.dataset.lvv); LSs('view' + (R.o && R.o.teacher ? 't' : ''), b.dataset.lvv); });
      const box = sec.querySelector('[data-wkd]');
      sec.querySelectorAll('[data-wc]').forEach(b => b.onclick = () => { if (!R.s) return; const [date, p, k] = b.dataset.wc.split('|'); const x = visibleDays(R.s).find(v => v.date === date); const y = (R.s.cells || []).filter(c => c.d === x.d && c.p === +p)[+k]; if (!y) return; const tm = ((R.s.meta || {}).times || [])[+p] || [];
        const l = safe(y.link) || (R.o.teacher ? '' : safe(R.s.cls_link));
        box.innerHTML = `<button type="button" class="lv-xx" aria-label="إغلاق">${svg(G.x, 18)}</button><h4>${esc(y.subject || '')} <span style="font-weight:500;font-size:13px;color:#4D6A8F">· ${DAYS[x.d]} ${dmy(x.date)}</span></h4>${details(y, x, +p, tm, R.o, R.s)}${l ? `<a class="lv-join" style="justify-self:start" ${R.o.preview || !R.s.id ? '' : `data-j="${esc(R.s.id)}|${esc(y.c || R.o.cls || '')}|${x.d}|${p}"`} href="${esc(l)}" target="_blank" rel="noopener">${CAM} دخول الحصة</a>` : ''}`;
        box.hidden = false; box.querySelector('.lv-xx').onclick = () => { box.hidden = true; b.focus(); };
        box.querySelectorAll('[data-lved]').forEach(e => { const src = sec.querySelector(`.lv-rd [data-lved="${e.dataset.lved}"]`); if (src) e.onclick = () => src.click(); });
        box.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
      sec.querySelectorAll('[data-lva]').forEach(b => b.onclick = async () => { if (!R.s) return; const k = b.dataset.lva; if (k === 'print') return printIt(R.s, R.o); if (k === 'ics') { const n = ics(R.s, R.o); return toast(`حُفظ ملف التقويم (${AR(n)} حصة) — افتحه لإضافته إلى تقويم الجوال`); }
        b.disabled = true; try { if (k === 'pdf') await pdf(R.s, R.o); else await png(R.s, R.o); toast(k === 'pdf' ? 'حُفظ ملف PDF' : 'حُفظت الصورة'); } catch (e) { toast(e.message || 'تعذّر التصدير'); } finally { b.disabled = false; } });
    });
    tick(root); if (root._lvT) clearInterval(root._lvT); root._lvT = setInterval(() => { if (!document.body.contains(root)) return clearInterval(root._lvT); tick(root); }, 30000);
  }
  // تصدير عام لأي محتوى بهوية دينا (تستخدمه خطة ولي الأمر أيضاً)
  async function exportDoc(kind, title, sub, body, name) {
    const doc = docWrap(esc(title), esc(sub), body); const nm = (name || title).replace(/[\\/:*?"<>|]/g, '');
    if (kind === 'print') return printHtml(doc, nm);
    if (kind === 'pdf') { await pdfHtml(doc, nm + '.pdf'); return toast('حُفظ ملف PDF'); }
    const cv = await renderHtml(doc); download(cv.toDataURL('image/png'), nm + '.png'); toast('حُفظت الصورة');
  }
  window.DinaLive = { html, bind, docHtml, exportDoc, svg, G, EX };
})();
