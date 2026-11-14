/* منصة دينا — استوديو التقارير بهوية دينا
   كل تقرير في المنصة (A.printDoc) يُفتح في معاينة قبل الطباعة مع:
   - أربعة أنماط تصميم متناسقة: الكلاسيكي، العصري، الرسمي الموفّر للحبر، المميز.
   - اللون الرئيسي من ألوان الهوية، الاتجاه، حجم الخط، الكثافة.
   - بنية التقرير: إظهار/إخفاء أقسامه وإعادة ترتيبها، عنوان وسطر فرعي قابلان للتعديل،
     ملخص تنفيذي، وخانات توقيع (مع توقيع المعدّ الإلكتروني إن وُجد).
   - احتواء النص: لا قصّ أبداً؛ التفاف ذكي للنص الطويل، وتصغير تلقائي للجداول العريضة لتناسب الصفحة.
   - حفظ النمط المفضّل للجهاز، واعتماده نمطاً للمدرسة (للمالك). */
(function () {
  const A = window.APP; if (!A) return;
  const { S, api, esc } = A;
  const LSK = 'dina-print-style';
  const THEMES = [['classic', 'الكلاسيكي', 'ترويسة نيلية متدرجة وجداول بعناوين داكنة'], ['modern', 'العصري', 'خفيف وواسع بلمسات سماوية'], ['ink', 'الرسمي الموفّر للحبر', 'خطوط رفيعة دون تعبئة، مثالي للأبيض والأسود'], ['premium', 'المميز', 'أمواج دينا وأشرطة عناوين ونجمة الهوية']];
  const ACC = [['#082B5A', 'نيلي'], ['#005499', 'أزرق'], ['#0E7FB0', 'سماوي'], ['#2E8B57', 'أخضر']];
  const DEF = { theme: 'classic', accent: '#082B5A', font: 'm', density: 'n', land: null, wm: true, foot: true, hero: 'full', sig: false, fit: true };
  const read = () => { let u = {}; try { u = JSON.parse(localStorage.getItem(LSK) || '{}'); } catch (_) { } return Object.assign({}, DEF, ((S.school || {}).settings || {}).printStyle || {}, u); };
  const writeLS = o => { try { localStorage.setItem(LSK, JSON.stringify(o)); } catch (_) { } };
  A.printStyle = read;

  // ---------- تقسيم التقرير إلى أقسام حسب العناوين ----------
  function sections(html) {
    const t = document.createElement('template'); t.innerHTML = html;
    const out = []; let cur = { title: 'المؤشرات والمقدمة', nodes: [] };
    [...t.content.childNodes].forEach(n => {
      const isH = n.nodeType === 1 && (/^H[23]$/.test(n.tagName) || n.classList.contains('rp-h'));
      if (isH) { if (cur.nodes.some(x => x.nodeType === 1 || (x.textContent || '').trim())) out.push(cur); cur = { title: (n.textContent || '').trim().slice(0, 60) || 'قسم', nodes: [n] }; }
      else cur.nodes.push(n);
    });
    if (cur.nodes.some(x => x.nodeType === 1 || (x.textContent || '').trim())) out.push(cur);
    // تقرير بلا عناوين: كل كتلة (بطاقات، جدول، رسم) قسم مستقل باسم مفهوم
    if (out.length === 1) { const els = out[0].nodes.filter(n => n.nodeType === 1 || (n.textContent || '').trim()); const blocks = []; let txt = [];
      const nameOf = n => { if (n.nodeType !== 1) return 'نص'; if (n.querySelector && (n.classList.contains('k') || n.querySelector('.k'))) return 'بطاقات المؤشرات'; const t = n.tagName === 'TABLE' ? n : n.querySelector && n.querySelector('table'); if (t) { const h = [...t.querySelectorAll('th')].slice(0, 3).map(x => x.textContent.trim()).filter(Boolean).join(' · '); return 'جدول' + (h ? ': ' + h : ''); } if (n.tagName === 'svg' || (n.querySelector && n.querySelector('svg,img'))) return 'رسم بياني'; return (n.textContent || '').trim().slice(0, 40) || 'قسم'; };
      els.forEach(n => { if (n.nodeType === 1 && n.classList.contains('k')) { txt.push(n); return; } if (txt.length) { blocks.push({ title: 'بطاقات المؤشرات', nodes: txt }); txt = []; } blocks.push({ title: nameOf(n), nodes: [n] }); });
      if (txt.length) blocks.push({ title: 'بطاقات المؤشرات', nodes: txt });
      if (blocks.length > 1) { out.length = 0; blocks.forEach(b => out.push(b)); } }
    const box = document.createElement('div');
    return out.map((s, i) => { box.innerHTML = ''; s.nodes.forEach(n => box.appendChild(n.cloneNode(true))); return { id: 's' + i, title: s.title, html: box.innerHTML, on: true }; });
  }

  // ---------- أنماط الطباعة ----------
  function css(o) {
    const fs = { s: 10.5, m: 12, l: 13.5 }[o.font] || 12, pad = o.density === 'c' ? 4 : 6.5, a = o.accent || '#082B5A';
    const base = `
      @font-face{font-family:'GE SS Two';font-weight:300;src:url(fonts/gess-two-light.woff2)}@font-face{font-family:'GE SS Two';font-weight:400 500;src:url(fonts/gess-two-medium.woff2)}@font-face{font-family:'GE SS Two';font-weight:600 900;src:url(fonts/gess-two-bold.woff2)}
      @font-face{font-family:'Dina Latin';src:url(fonts/myriad-pro-regular.woff2);unicode-range:U+0041-005A,U+0061-007A}
      :root{--a:${a};--b:#005499;--s:#3AB1DB;--g:#2E8B57;--lg:#BADF93;--ink:#082B5A;--line:#CFE0F2;--fs:${fs}px;--pad:${pad}px}
      @page{size:A4 ${o.land ? 'landscape' : 'portrait'};margin:11mm 10mm ${o.foot ? '16mm' : '11mm'}${o.foot ? `;@bottom-right{content:'${esc(((S.school || {}).name || 'مدارس دينا العالمية').replace(/'/g, ''))} · رحلتهم الكبرى… تبدأ من هنا';font-family:'GE SS Two';font-size:8.5pt;color:${o.theme === 'ink' ? '#40546F' : '#005499'};border-top:${o.theme === 'ink' ? '1px solid #9FB3CC' : '2px solid #3AB1DB'};vertical-align:middle}@bottom-left{content:'Dinaaedu · 920035881   |   ' counter(page) ' / ' counter(pages);font-family:'GE SS Two';font-size:8.5pt;color:${o.theme === 'ink' ? '#40546F' : a};border-top:${o.theme === 'ink' ? '1px solid #9FB3CC' : '2px solid #3AB1DB'};vertical-align:middle;direction:ltr}` : ''}}
      *{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}
      html{background:#E9EEF6}body{font-family:'GE SS Two','Dina Latin','Myriad Pro',sans-serif;color:var(--ink);margin:0;font-size:var(--fs);line-height:1.65}
      .pg{background:#fff;width:${o.land ? 297 : 210}mm;min-height:${o.land ? 210 : 297}mm;margin:14px auto;padding:11mm 10mm 14mm;box-shadow:0 10px 30px rgba(8,43,90,.18);border-radius:4px;position:relative;overflow:hidden}
      @media print{html{background:#fff;zoom:1!important}.pg{width:auto;min-height:0;margin:0;padding:0;box-shadow:none;border-radius:0;overflow:visible}}
      /* احتواء النص */
      td,th,p,li,div,span,b{overflow-wrap:anywhere;word-break:normal}
      .tw{width:100%;margin:4px 0 10px;border:1px solid var(--line);border-radius:12px;overflow:visible}
      table{width:100%;border-collapse:separate;border-spacing:0;font-size:calc(var(--fs) - 1px);table-layout:auto}
      thead{display:table-header-group}tr{break-inside:avoid}
      th{padding:var(--pad) 5px;font-weight:800;text-align:center;line-height:1.35}
      td{padding:var(--pad) 5px;text-align:center;vertical-align:middle;border-top:1px solid #E3EBF5;line-height:1.45}
      td.lt,th.lt{text-align:start}
      .tw th:first-child{border-start-start-radius:11px}.tw th:last-child{border-start-end-radius:11px}
      img,svg{max-width:100%;height:auto}
      h2,h3,.rp-h{break-after:avoid;color:var(--ink)}
      .k{display:inline-block;vertical-align:top;max-width:46%;border:1px solid var(--line);border-radius:14px;padding:8px 14px;margin:0 0 10px 8px;background:#fff}.k b{display:block;font-size:calc(var(--fs) + 8px)}
      button{font:inherit;color:inherit;background:none;border:0;padding:0;text-align:inherit}
      .kpi{display:inline-flex;flex-direction:column;justify-content:center;vertical-align:top;min-width:130px;max-width:24%;margin:0 0 10px 8px;padding:10px 14px;border-radius:14px;border:1px solid var(--line);background:#fff;text-align:start;position:relative;break-inside:avoid}
      .grid>.kpi{max-width:none;margin:0;min-width:0}
      .kpi .k{display:block!important;border:0!important;box-shadow:none!important;background:none!important;padding:0!important;margin:0 0 2px!important;max-width:none!important;font-size:calc(var(--fs) - 1px);color:#5B7090;font-weight:700;border-radius:0!important}
      .kpi .v{font-size:calc(var(--fs) + 10px);font-weight:800;color:var(--a);line-height:1.2}.kpi .v small{font-size:60%}.kpi .d{font-size:calc(var(--fs) - 2px);color:#6A7F9C}
      .kpi.navy{background:var(--a);border-color:var(--a)}.kpi.navy .k,.kpi.navy .d{color:#CFE3F5!important}.kpi.navy .v{color:#fff}
      .more,.dd-k .more,[data-hk] .more{display:none!important}.kpi:after,.kpi:before{content:none!important;display:none!important}
      .scroll{overflow:visible!important}.muted{color:#6A7F9C}.small{font-size:calc(var(--fs) - 1.5px)}.pill{display:inline-block;background:#E4EBF5;border-radius:99px;padding:1px 8px;font-size:calc(var(--fs) - 2px)}
      .grid{display:grid;gap:12px}.g2{grid-template-columns:1fr 1fr}.g3{grid-template-columns:repeat(3,1fr)}.g4{grid-template-columns:repeat(4,1fr)}
      .rs-sum{border-radius:14px;padding:10px 14px;margin:0 0 14px;line-height:1.8;white-space:pre-wrap}
      .rs-sum b{display:block;margin-bottom:2px}
      .rs-sig{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:22px;break-inside:avoid}
      .rs-sig div{text-align:center;border-top:1.5px solid var(--line);padding-top:6px;min-height:70px}.rs-sig b{display:block}.rs-sig img{max-height:42px;margin-top:4px}
      .rs-foot{position:fixed;bottom:-12mm;left:0;right:0;height:9mm;display:flex;align-items:center;justify-content:space-between;font-size:9px;padding:0 12px;border-radius:8px}
      .rs-wm{position:fixed;left:8mm;bottom:4mm;width:120px;opacity:.05;z-index:0;pointer-events:none}
      @media screen{.rs-foot{position:absolute;bottom:4mm;left:10mm;right:10mm}.rs-wm{position:absolute}}
      @media print{.rs-foot{display:none}}`;
    const T = {
      classic: `
      .hero{position:relative;overflow:hidden;border-radius:18px;background:linear-gradient(135deg,var(--a) 0%,#0B3F7E 55%,#005499 100%);color:#fff;padding:18px 24px;display:flex;align-items:center;gap:18px;margin-bottom:14px}
      .hero:before{content:'';position:absolute;inset:auto auto -40px -40px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(58,177,219,.35),transparent 70%)}
      .hero .dots{position:absolute;left:18px;top:14px;width:70px;height:46px;background-image:radial-gradient(circle,rgba(58,177,219,.7) 2.4px,transparent 3px);background-size:14px 14px}
      .hero .t{flex:1;position:relative;border-inline-start:3px solid var(--s);padding-inline-start:16px}.hero h1{margin:0;font-size:calc(var(--fs) + 12px)}.hero p{margin:5px 0 0;color:#BFE3F4}
      .hero .meta span{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff}.hero img{height:60px;position:relative}
      th{background:var(--a);color:#fff}tbody th{background:#E4EBF5;color:var(--ink)}tbody tr:nth-child(even) td{background:#F6F9FD}
      h3,.rp-h{font-size:calc(var(--fs) + 2px);margin:16px 0 8px;border-inline-start:4px solid var(--s);padding-inline-start:8px}
      .k{background:linear-gradient(180deg,#fff,#F3F8FD);box-shadow:inset 0 -3px 0 var(--s)}
      .rs-sum{background:#F3F8FD;border:1px solid var(--line);border-inline-start:4px solid var(--a)}
      .kpi{background:linear-gradient(180deg,#fff,#F3F8FD);box-shadow:inset 0 -3px 0 var(--s)}
      .rs-foot{color:#fff;background:linear-gradient(90deg,var(--s),var(--b))}`,
      modern: `
      .hero{position:relative;overflow:hidden;border-radius:20px;background:#fff;border:1px solid var(--line);padding:16px 22px;display:flex;align-items:center;gap:18px;margin-bottom:16px}
      .hero:after{content:'';position:absolute;inset-inline-end:-30px;top:-30px;width:140px;height:140px;border-radius:50%;background:radial-gradient(circle,rgba(58,177,219,.22),transparent 70%)}
      .hero:before{content:'';position:absolute;inset-block:0;inset-inline-start:0;width:8px;background:linear-gradient(180deg,var(--s),var(--a))}
      .hero .t{flex:1;position:relative}.hero h1{margin:0;font-size:calc(var(--fs) + 13px);color:var(--a)}.hero p{margin:4px 0 0;color:#5B7090}
      .hero .meta span{background:#EEF6FC;color:var(--b);border:1px solid #D3E7F6}.hero img{height:56px;position:relative}
      .tw{border:0;border-radius:14px;background:#fff;box-shadow:0 0 0 1px #E1EAF5}
      th{background:#EAF3FC;color:var(--a);border-bottom:2px solid var(--s)}tbody th{background:#F6FAFE;color:var(--ink)}td{border-top:1px solid #EEF3F9}
      h3,.rp-h{font-size:calc(var(--fs) + 2px);margin:18px 0 8px;display:flex;align-items:center;gap:8px}
      h3:before,.rp-h:before{content:'';width:10px;height:10px;border-radius:3px;background:var(--s);box-shadow:4px 4px 0 var(--lg)}
      .k{border-color:#E1EAF5;box-shadow:0 6px 16px -10px rgba(8,43,90,.35)}.k b{color:var(--a)}
      .rs-sum{background:linear-gradient(180deg,#F5FAFE,#fff);border:1px solid #E1EAF5}
      .kpi{border-color:#E1EAF5;box-shadow:0 6px 16px -10px rgba(8,43,90,.35)}.kpi.navy{background:linear-gradient(135deg,var(--a),var(--s))}
      .rs-foot{color:var(--a);border-top:2px solid var(--s);border-radius:0}`,
      ink: `
      .hero{display:flex;align-items:center;gap:16px;padding:0 0 10px;margin-bottom:14px;border-bottom:2px solid var(--a)}
      .hero .t{flex:1}.hero h1{margin:0;font-size:calc(var(--fs) + 10px);color:var(--a)}.hero p{margin:3px 0 0;color:#40546F}
      .hero .meta span{border:1px solid #9FB3CC;color:#40546F;background:#fff}.hero img{height:50px}
      .tw{border:1px solid #8FA3BF;border-radius:4px}th{background:#fff;color:var(--ink);border-bottom:1.5px solid var(--ink)}td{border-top:1px solid #C9D4E3}
      .tw th:first-child,.tw th:last-child{border-radius:0}
      h3,.rp-h{font-size:calc(var(--fs) + 1.5px);margin:14px 0 6px;border-bottom:1px solid #9FB3CC;padding-bottom:3px}
      .k{border-color:#9FB3CC;border-radius:6px}.pill{background:#fff;border:1px solid #9FB3CC}
      .rs-sum{border:1px solid #9FB3CC;border-radius:6px}
      .kpi,.kpi.navy{border:1px solid #9FB3CC;border-radius:6px;background:#fff}.kpi.navy .v{color:var(--ink)}.kpi.navy .k,.kpi.navy .d{color:#5B7090!important}
      .rs-foot{color:#40546F;border-top:1px solid #9FB3CC;border-radius:0}.rs-wm{display:none}`,
      premium: `
      .hero{position:relative;overflow:hidden;border-radius:22px;background:linear-gradient(120deg,var(--a) 0%,#0B4C8C 50%,#0E7FB0 100%);color:#fff;padding:20px 26px 34px;display:flex;align-items:center;gap:18px;margin-bottom:18px}
      .hero .wv{position:absolute;inset:auto 0 -2px 0;height:34px}
      .hero .t{flex:1;position:relative}.hero h1{margin:0;font-size:calc(var(--fs) + 14px);letter-spacing:-.2px}.hero p{margin:6px 0 0;color:#CFE6F6}
      .hero .meta span{background:rgba(255,255,255,.14);border:1px solid rgba(186,223,147,.55);color:#fff}.hero img{height:64px;position:relative}
      .hero .star{position:absolute;top:14px;inset-inline-end:140px;width:20px;height:20px}
      th{background:linear-gradient(180deg,var(--a),#0B4C8C);color:#fff}tbody th{background:#E9F2FB;color:var(--ink)}tbody tr:nth-child(even) td{background:#F5F9FD}
      h3,.rp-h{display:inline-block;font-size:calc(var(--fs) + 1.5px);margin:18px 0 8px;background:var(--a);color:#fff;padding:4px 16px 4px 22px;border-radius:0 99px 99px 0;box-shadow:inset -6px 0 0 var(--s)}
      [dir=rtl] h3,[dir=rtl] .rp-h{border-radius:99px 0 0 99px;box-shadow:inset 6px 0 0 var(--s)}
      .k{border:0;background:#fff;box-shadow:0 0 0 1px #DCE7F3,0 8px 18px -12px rgba(8,43,90,.5);border-top:4px solid var(--s)}
      .rs-sum{background:linear-gradient(135deg,#F2F8FD,#fff);border:1px solid #DCE7F3;border-inline-start:6px solid var(--g)}
      .kpi{border:0;box-shadow:0 0 0 1px #DCE7F3,0 8px 18px -12px rgba(8,43,90,.5);border-top:4px solid var(--s)}.kpi.navy{background:linear-gradient(120deg,var(--a),#0E7FB0)}
      .rs-foot{color:#fff;background:linear-gradient(90deg,var(--a),var(--s))}`
    };
    const meta = `.hero .meta{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.hero .meta span{border-radius:99px;padding:2px 10px;font-size:calc(var(--fs) - 2px)}.hero.slim{padding-top:10px;padding-bottom:10px}.hero.slim h1{font-size:calc(var(--fs) + 6px)}.hero.slim img{height:40px}.hero.slim .meta{display:none}`;
    return base + (T[o.theme] || T.classic) + meta;
  }
  const WAVES = '<svg class="wv" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30 C200 0 400 60 600 30 S1000 0 1200 30 V60 H0Z" fill="rgba(58,177,219,.55)"/><path d="M0 42 C220 20 420 64 640 40 S1020 18 1200 40 V60 H0Z" fill="#fff"/></svg>';
  const STAR = '<svg class="star" viewBox="0 0 40 40" aria-hidden="true"><path d="M20 2l4 14 14 4-14 4-4 14-4-14-14-4 14-4z" fill="#BADF93"/></svg>';

  // سكربت داخل التقرير: لفّ الجداول، محاذاة النص الطويل، وتصغير الجداول العريضة حتى تتسع
  const FIT = `(function(){
    function run(){
      var fit=document.body.dataset.fit==='1',wide=0;
      document.querySelectorAll('table').forEach(function(t){
        if(!t.parentNode.classList||!t.parentNode.classList.contains('tw')){var w=document.createElement('div');w.className='tw';t.parentNode.insertBefore(w,t);w.appendChild(t);}
        t.querySelectorAll('td,th').forEach(function(c){var s=(c.textContent||'').trim();if(s.length>38&&!c.querySelector('svg,img'))c.classList.add('lt');});
        t.style.fontSize='';var box=t.parentNode.clientWidth;if(!box)return;var fs=parseFloat(getComputedStyle(t).fontSize),n=0;
        while(fit&&t.scrollWidth>box+1&&fs>7.2&&n<14){fs-=.5;n++;t.style.fontSize=fs+'px';}
        if(t.scrollWidth>box+1)wide++;
      });
      try{parent.postMessage({type:'rs-fit',wide:wide},location.origin);}catch(e){}
    }
    function zoom(){var pg=document.querySelector('.pg');if(!pg)return;var w=pg.offsetWidth+28;document.documentElement.style.zoom=Math.min(1,window.innerWidth/w);}
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(function(){run();zoom();});else setTimeout(function(){run();zoom();},300);
    window.addEventListener('resize',zoom);window.addEventListener('beforeprint',function(){document.documentElement.style.zoom=1;run();});window.addEventListener('afterprint',zoom);
  })();`;

  function build(st) {
    const o = st.o, dt = new Date().toLocaleDateString('ar-SA-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' });
    const by = (S.me && S.me.full_name) || '', school = (S.school && S.school.name) || 'مدارس دينا العالمية';
    const logo = o.theme === 'ink' || o.theme === 'modern' ? 'assets/logo.svg' : 'assets/logo_white.svg';
    const hero = `<div class="hero ${o.hero === 'slim' ? 'slim' : ''}">${o.theme === 'classic' ? '<span class="dots"></span>' : ''}${o.theme === 'premium' ? WAVES + STAR : ''}<div class="t"><h1>${esc(st.title)}</h1>${st.sub ? `<p>${esc(st.sub)}</p>` : ''}<div class="meta"><span>${esc(dt)}</span>${by ? `<span>أعدّه: ${esc(by)}</span>` : ''}<span>منصة دينا للتخطيط الدراسي</span></div></div><img src="${logo}" alt="مدارس دينا العالمية"></div>`;
    const sum = st.summary.trim() ? `<div class="rs-sum"><b>الملخص التنفيذي</b>${esc(st.summary.trim())}</div>` : '';
    const body = st.secs.filter(s => s.on).map(s => `<section class="rs-s">${s.html}</section>`).join('');
    const sig = o.sig ? `<div class="rs-sig"><div><b>المعدّ</b>${esc(by)}${st.mySig ? `<br><img src="${st.mySig}" alt="توقيع المعدّ">` : ''}</div><div><b>المدير الأكاديمي</b></div><div><b>مدير المدرسة</b></div></div>` : '';
    const foot = o.foot ? `<div class="rs-foot"><span>${esc(school)} · رحلتهم الكبرى… تبدأ من هنا</span><span dir="ltr">Dinaaedu · 920035881</span></div>` : '';
    const base = location.href.replace(/[^/]*$/, '').split('#')[0];
    return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="${base}"><title>${esc(st.title)}</title><style>${css(o)}</style></head>
      <body data-fit="${o.fit ? 1 : 0}"><div class="pg">${o.wm && o.theme !== 'ink' ? '<img class="rs-wm" src="assets/mark.svg" alt="">' : ''}${hero}${sum}${body}${sig}${foot}</div><script>${FIT}<\/script></body></html>`;
  }

  // ---------- واجهة الاستوديو ----------
  const UI = `
  .rs-ov{position:fixed;inset:0;z-index:9000;background:rgba(8,26,54,.55);display:flex;align-items:stretch;justify-content:center;padding:12px}
  .rs-box{background:#F3F6FB;border-radius:20px;display:grid;grid-template-columns:320px 1fr;width:100%;max-width:1500px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.35)}
  .rs-pan{background:#fff;border-inline-end:1px solid #DCE7F3;overflow:auto;padding:14px 14px 90px;position:relative}
  .rs-pan h3{margin:0 0 2px;color:#082B5A}.rs-pan h4{margin:14px 0 6px;font-size:13px;color:#082B5A}
  .rs-th{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .rs-th button{border:1.5px solid #DCE7F3;background:#fff;border-radius:12px;padding:6px;font:inherit;cursor:pointer;text-align:start;color:#082B5A}
  .rs-th button.on{border-color:#005499;box-shadow:0 0 0 3px rgba(0,84,153,.12);background:#F4F9FE}
  .rs-th i{display:block;height:34px;border-radius:8px;margin-bottom:4px;background-size:cover}.rs-th b{font-size:12.5px;display:block}.rs-th span{font-size:10.5px;color:#6A7F9C;display:block;line-height:1.4}
  .rs-sw{display:flex;gap:8px;flex-wrap:wrap}.rs-sw button{width:30px;height:30px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 1.5px #CFE0F2;cursor:pointer}.rs-sw button.on{box-shadow:0 0 0 2.5px #082B5A}
  .rs-seg{display:flex;border:1.5px solid #DCE7F3;border-radius:12px;overflow:hidden}.rs-seg button{flex:1;border:0;background:#fff;padding:6px 4px;font:inherit;font-size:12.5px;cursor:pointer;color:#082B5A}.rs-seg button.on{background:#082B5A;color:#fff}
  .rs-secs{display:grid;gap:5px}.rs-sec{display:flex;align-items:center;gap:6px;border:1px solid #E4EBF5;border-radius:10px;padding:5px 8px;background:#fff;font-size:12.5px}
  .rs-sec span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.rs-sec button{border:1px solid #DCE7F3;background:#fff;border-radius:7px;width:28px;height:28px;cursor:pointer}.rs-sec button:disabled{opacity:.3}
  .rs-sec.off span{opacity:.45;text-decoration:line-through}
  .rs-pan .chk{display:flex;gap:6px;align-items:center;font-size:13px;margin:4px 0}
  .rs-act{position:sticky;bottom:-90px;margin:16px -14px -90px;padding:12px 14px;background:#fff;border-top:1px solid #E4EBF5;display:grid;gap:6px}
  .rs-main{position:relative;display:flex;flex-direction:column;min-width:0}
  .rs-bar{display:flex;align-items:center;gap:8px;padding:10px 14px;background:#fff;border-bottom:1px solid #DCE7F3}
  .rs-bar b{flex:1;color:#082B5A;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .rs-fr{flex:1;width:100%;border:0;background:#E9EEF6}
  .rs-hint{margin:0 14px 0;font-size:12px;color:#8A5600;background:#FFF4DE;border-radius:10px;padding:6px 10px}
  .rs-x{width:38px;height:38px;border-radius:50%;border:0;background:#EEF3F9;font-size:20px;cursor:pointer;color:#082B5A}
  @media(max-width:860px){.rs-ov{padding:0}.rs-box{grid-template-columns:1fr;grid-template-rows:auto 1fr;border-radius:0}.rs-pan{max-height:42vh;padding-bottom:16px}.rs-act{position:static;margin:12px 0 0;padding:0;border:0}}`;
  if (!document.getElementById('app59css')) { const s = document.createElement('style'); s.id = 'app59css'; s.textContent = UI; document.head.appendChild(s); }
  const thumb = { classic: 'linear-gradient(135deg,#082B5A,#005499)', modern: 'linear-gradient(90deg,#3AB1DB 6px,#fff 6px)', ink: 'linear-gradient(#fff,#fff)', premium: 'linear-gradient(120deg,#082B5A,#0E7FB0)' };

  function studio(title, sub, bodyHtml, land) {
    const o = read(); if (o.land == null) o.land = !!land; else if (land) o.land = true;
    const st = { o, title, sub: sub || '', summary: '', secs: sections(bodyHtml), mySig: null };
    const ov = document.createElement('div'); ov.className = 'rs-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'معاينة التقرير وتصميمه');
    ov.innerHTML = `<div class="rs-box"><aside class="rs-pan" id="rsP"></aside><div class="rs-main"><div class="rs-bar"><button class="rs-x" id="rsX" aria-label="إغلاق">×</button><b id="rsT"></b><button class="btn ghost sm" id="rsPdf" title="اختر «حفظ بتنسيق PDF» في نافذة الطباعة">PDF</button><button class="btn sm" id="rsPr">${A.I.print || ''} طباعة</button></div><div id="rsH"></div><iframe class="rs-fr" id="rsF" title="معاينة التقرير"></iframe></div></div>`;
    document.body.appendChild(ov); document.documentElement.style.overflow = 'hidden';
    const F = ov.querySelector('#rsF'), P = ov.querySelector('#rsP');
    const close = () => { ov.remove(); document.documentElement.style.overflow = ''; window.removeEventListener('message', onMsg); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    const onMsg = e => { if (e.source !== F.contentWindow || !e.data || e.data.type !== 'rs-fit') return; ov.querySelector('#rsH').innerHTML = e.data.wide ? `<p class="rs-hint">في التقرير جدول أعرض من الصفحة حتى بعد التصغير — جرّب الاتجاه الأفقي أو الخط الأصغر.</p>` : ''; };
    document.addEventListener('keydown', onKey); window.addEventListener('message', onMsg);
    ov.querySelector('#rsX').onclick = close;
    let tm; const render = () => { clearTimeout(tm); tm = setTimeout(() => { ov.querySelector('#rsT').textContent = st.title; F.srcdoc = build(st); }, 120); };
    const doPrint = () => { const w = F.contentWindow; try { w.focus(); w.print(); } catch (_) { } };
    ov.querySelector('#rsPr').onclick = doPrint; ov.querySelector('#rsPdf').onclick = () => { A.toast('اختر «حفظ بتنسيق PDF» من نافذة الطباعة', 'info'); doPrint(); };
    const seg = (k, opts) => `<div class="rs-seg" role="radiogroup">${opts.map(([v, l]) => `<button type="button" role="radio" data-k="${k}" data-v="${v}" aria-checked="${String(o[k]) === String(v)}" class="${String(o[k]) === String(v) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    function panel() {
      P.innerHTML = `<h3>تصميم التقرير</h3><p class="small muted" style="margin:0">التغييرات تظهر فوراً في المعاينة.</p>
        <h4>النمط</h4><div class="rs-th">${THEMES.map(([k, n, d]) => `<button type="button" data-th="${k}" class="${o.theme === k ? 'on' : ''}" aria-pressed="${o.theme === k}"><i style="background:${thumb[k]};${k === 'ink' ? 'border:1.5px solid #082B5A' : ''}"></i><b>${n}</b><span>${d}</span></button>`).join('')}</div>
        <h4>اللون الرئيسي</h4><div class="rs-sw">${ACC.map(([c, n]) => `<button type="button" data-ac="${c}" class="${o.accent === c ? 'on' : ''}" style="background:${c}" aria-label="${n}" title="${n}"></button>`).join('')}</div>
        <h4>الاتجاه</h4>${seg('land', [['false', 'عمودي'], ['true', 'أفقي']])}
        <h4>حجم الخط</h4>${seg('font', [['s', 'صغير'], ['m', 'متوسط'], ['l', 'كبير']])}
        <h4>الكثافة</h4>${seg('density', [['n', 'مريحة'], ['c', 'مضغوطة']])}
        <h4>الترويسة</h4>${seg('hero', [['full', 'كاملة'], ['slim', 'مختصرة']])}
        <h4>العناصر</h4><label class="chk"><input type="checkbox" data-o="fit" ${o.fit ? 'checked' : ''}> ملاءمة الجداول العريضة للصفحة تلقائياً</label><label class="chk"><input type="checkbox" data-o="foot" ${o.foot ? 'checked' : ''}> التذييل</label><label class="chk"><input type="checkbox" data-o="wm" ${o.wm ? 'checked' : ''}> علامة دينا المائية</label><label class="chk"><input type="checkbox" data-o="sig" ${o.sig ? 'checked' : ''}> خانات التوقيع${st.mySig ? ' (مع توقيعي)' : ''}</label>
        <h4>العنوان</h4><input class="in" id="rsTi" value="${esc(st.title)}" aria-label="عنوان التقرير"><input class="in" id="rsSu" value="${esc(st.sub)}" style="margin-top:6px" aria-label="السطر الفرعي" placeholder="سطر فرعي">
        <h4>الملخص التنفيذي (اختياري)</h4><textarea class="in" id="rsSm" rows="3" placeholder="أبرز النتائج والتوصيات في سطور">${esc(st.summary)}</textarea>
        <h4>أقسام التقرير <span class="small muted">— أظهر وأخفِ ورتّب</span></h4><div class="rs-secs">${st.secs.map((s, i) => `<div class="rs-sec ${s.on ? '' : 'off'}"><input type="checkbox" data-sc="${i}" ${s.on ? 'checked' : ''} aria-label="إظهار ${esc(s.title)}"><span title="${esc(s.title)}">${esc(s.title)}</span><button type="button" data-up="${i}" ${i ? '' : 'disabled'} aria-label="تقديم">▲</button><button type="button" data-dn="${i}" ${i < st.secs.length - 1 ? '' : 'disabled'} aria-label="تأخير">▼</button></div>`).join('')}</div>
        <div class="rs-act"><button class="btn ghost sm" id="rsSv">حفظ هذا التصميم مفضّلاً لي</button>${S.me && S.me.is_owner ? '<button class="btn ghost sm" id="rsSch">اعتماده تصميماً للمدرسة</button>' : ''}<button class="btn ghost sm" id="rsRs">استعادة الافتراضي</button></div>`;
      P.querySelectorAll('[data-th]').forEach(b => b.onclick = () => { o.theme = b.dataset.th; panel(); render(); });
      P.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => { o.accent = b.dataset.ac; panel(); render(); });
      P.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k, v = b.dataset.v; o[k] = v === 'true' ? true : v === 'false' ? false : v; panel(); render(); });
      P.querySelectorAll('[data-o]').forEach(i => i.onchange = () => { o[i.dataset.o] = i.checked; render(); });
      P.querySelector('#rsTi').oninput = e => { st.title = e.target.value; render(); };
      P.querySelector('#rsSu').oninput = e => { st.sub = e.target.value; render(); };
      P.querySelector('#rsSm').oninput = e => { st.summary = e.target.value; render(); };
      P.querySelectorAll('[data-sc]').forEach(i => i.onchange = () => { st.secs[+i.dataset.sc].on = i.checked; i.closest('.rs-sec').classList.toggle('off', !i.checked); render(); });
      const mv = (i, d) => { const j = i + d; [st.secs[i], st.secs[j]] = [st.secs[j], st.secs[i]]; panel(); render(); };
      P.querySelectorAll('[data-up]').forEach(b => b.onclick = () => mv(+b.dataset.up, -1));
      P.querySelectorAll('[data-dn]').forEach(b => b.onclick = () => mv(+b.dataset.dn, 1));
      const pick = () => { const c = { ...o }; delete c.land; return c; };
      P.querySelector('#rsSv').onclick = () => { writeLS(pick()); A.toast('حُفظ التصميم مفضّلاً لك على هذا الجهاز', 'ok'); };
      const sch = P.querySelector('#rsSch'); if (sch) sch.onclick = ev => A.run(ev.currentTarget, async () => { const settings = { ...(S.school.settings || {}), printStyle: pick() }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; writeLS({}); A.toast('اعتُمد تصميماً لتقارير المدرسة', 'ok'); });
      P.querySelector('#rsRs').onclick = () => { writeLS({}); Object.assign(o, DEF, { land: !!land }); panel(); render(); };
    }
    panel(); render();
    // توقيع المعدّ الإلكتروني إن وُجد
    if (S.me) api.list('staff_signatures', { staff_id: S.me.id }).then(r => { if (r && r[0]) { st.mySig = r[0].img; panel(); if (o.sig) render(); } }).catch(() => { });
    setTimeout(() => ov.querySelector('#rsPr').focus(), 50);
  }
  A.printDoc = studio;
  A.printDocDirect = null;
})();
