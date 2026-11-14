// فصل الحصة بالأسماء الكاملة: المربع والنجوم والبطاقة والأدوار والمجموعات بالاسم الكامل، والعجلة تختصر عند الضيق فقط، وتحديث القوائم القديمة المختصرة — node t196.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = []; let ok = true; const chk = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) ok = false; };
  const LONG = ['عبدالرحمن محمد عبدالله الغامدي', 'نورة خالد سعد العتيبي', 'سارة فيصل ناصر القحطاني', 'ريم يوسف أحمد الزهراني', 'لمى عمر صالح الحربي', 'جود تركي فهد الشهري', 'هيا بدر سعود المطيري', 'دانة زياد فارس الدوسري', 'ليان نواف علي السبيعي', 'مها سلمان حمد العنزي', 'شهد ماجد راشد الشمري', 'رهف عادل منصور البقمي'];
  for (const W of [1440, 768, 375]) { const ctx = await b.newContext({ viewport: { width: W, height: 860 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(W + ' ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
    // أسماء رباعية لفصل أول فصل في القائمة
    await p.evaluate(async L => { const c = APP.S.classes.slice().sort(APP.cmpCls || (() => 0)); const all = await APP.api.list('students', {}); const cls = [...new Set(all.map(s => s.class_id))]; for (const cid of cls) { const S = all.filter(s => s.class_id === cid); for (let i = 0; i < S.length; i++) await APP.api.upd('students', S[i].id, { full_name: L[i % L.length]  }); } }, LONG);
    await p.evaluate(() => location.hash = '#/wboard'); await p.waitForTimeout(2500);
    let F = p.frames().find(x => /whiteboard/.test(x.url()));
    // قائمة قديمة مختصرة محفوظة تُحدَّث تلقائياً عند فتح السبورة
    const cid = await F.evaluate(() => (JSON.parse(localStorage.getItem('dina_wb_cfg') || '{}').classes || [])[0]?.id);
    const cname = await F.evaluate(() => (JSON.parse(localStorage.getItem('dina_wb_cfg') || '{}').classes || [])[0]?.name);
    await F.evaluate(([cid, cname]) => { localStorage.setItem('dina_wbt_roster', JSON.stringify({ key: cid, label: cname, names: ['اسم قديم', 'مختصر ثان'] })); location.reload(); }, [cid, cname]); await p.waitForTimeout(3500);
    F = p.frames().find(x => /whiteboard/.test(x.url())); const clk = s => F.evaluate(s => document.querySelector(s).click(), s); const q = (fn, a) => F.evaluate(fn, a);
    const R0 = await q(() => JSON.parse(localStorage.getItem('dina_wbt_roster')));
    chk(R0.full === 1 && R0.names.length > 2 && R0.names.every(n => n.split(' ').length >= 4), W + ' القائمة القديمة المختصرة حُدِّثت تلقائياً: ' + R0.names[0]);
    // اختيار الفصل يدرج الأسماء الكاملة
    await clk('#wbt'); await clk('.wbt-ros .rs'); await F.waitForTimeout(300); await clk('.wbw[data-k="roster"] [data-c]'); await F.waitForTimeout(1500);
    const ta = await q(() => document.querySelector('.wbw[data-k="roster"] .nt').value.split('\n'));
    chk(ta.length > 2 && ta.every(n => n.split(' ').length >= 4), W + ' المربع بالأسماء الكاملة: ' + ta.slice(0, 2).join('، '));
    if (W === 1440) await p.screenshot({ path: 'p0/t196-roster.png' });
    await clk('.wbw[data-k="roster"] .cx');
    // النجوم: الاسم كامل لا مقطوع
    await clk('#wbt'); await clk('[data-w="stars"]'); await F.waitForTimeout(300);
    const st = await q(() => [...document.querySelectorAll('.wbw[data-k="stars"] .st-c b')].map(b => ({ t: b.textContent, cut: b.scrollWidth > b.clientWidth + 1 })));
    chk(st.every(x => x.t.split(' ').length >= 4) && !st.some(x => x.cut), W + ' النجوم بالاسم الكامل دون قطع ' + JSON.stringify(st.filter(x => x.cut).slice(0, 2)));
    await p.screenshot({ path: `p0/t196-stars-${W}.png` }); await clk('.wbw[data-k="stars"] .cx');
    // البطاقة
    await clk('#wbt'); await clk('[data-w="flip"]'); await clk('.wbw[data-k="flip"] .go'); await F.waitForTimeout(900);
    const fl = await q(() => { const e = document.querySelector('.wbw[data-k="flip"] .bk'); return { t: e.textContent, over: e.scrollHeight > e.clientHeight + 2 }; });
    chk(fl.t.split(' ').length >= 4 && !fl.over, W + ' البطاقة بالاسم الكامل داخل حدودها: ' + fl.t);
    if (W === 375) await p.screenshot({ path: 'p0/t196-flip-375.png' }); await clk('.wbw[data-k="flip"] .cx');
    // الأدوار والمجموعات
    await clk('#wbt'); await clk('[data-w="order"]'); await F.waitForTimeout(1200);
    chk(await q(L => [...document.querySelectorAll('.wbw[data-k="order"] li')].some(li => li.textContent.includes(L)), LONG[0]), W + ' الأدوار بالاسم الكامل'); await clk('.wbw[data-k="order"] .cx');
    await clk('#wbt'); await clk('[data-w="groups"]'); await F.waitForTimeout(300);
    chk(await q(L => document.querySelector('.wbw[data-k="groups"] .grps').textContent.includes(L), LONG[0]), W + ' المجموعات بالاسم الكامل'); await clk('.wbw[data-k="groups"] .cx');
    // العجلة: الفائز بالاسم الكامل
    await clk('#wbt'); await clk('[data-w="wheel"]'); await F.waitForTimeout(400); if (W === 1440) await p.screenshot({ path: 'p0/t196-wheel.png' });
    await clk('.wbw[data-k="wheel"] .wh-go'); await F.waitForTimeout(7500);
    const win = await q(() => (document.querySelector('.wh-win .n') || {}).textContent || '');
    chk(win.split(' ').length >= 4, W + ' فائز العجلة بالاسم الكامل: ' + win);
    if (W === 375) await p.screenshot({ path: 'p0/t196-win-375.png' });

    // طريقة عرض الاسم من نافذة الفصل
    await clk('.wbw[data-k="wheel"] .cx').catch(() => {}); await F.evaluate(() => document.querySelectorAll('.wh-win .cl').forEach(b => b.click()));
    await clk('#wbt'); await clk('.wbt-ros .rs'); await F.waitForTimeout(300);
    await clk('.wbw[data-k="roster"] .nmf [data-f="two"]'); await F.waitForTimeout(200);
    let R = await q(() => JSON.parse(localStorage.getItem('dina_wbt_set')));
    chk(R.nmf === 'two', W + ' اختيار «الاسم الثنائي» حُفظ');
    chk(await q(() => document.querySelector('.wbw[data-k="roster"] .nt').value.split('\n')[0].split(' ').length >= 4), W + ' المربع يبقى بالأسماء الكاملة للتعديل');
    await clk('.wbw[data-k="roster"] .cx'); await clk('#wbt'); await clk('[data-w="order"]'); await F.waitForTimeout(1200);
    let li = await q(() => [...document.querySelectorAll('.wbw[data-k="order"] li')].map(x => x.textContent.replace(/^[٠-٩]+/, '').replace('🎤', '').trim()));
    chk(li.length > 2 && li.every(x => x.split(' ').length === 2), W + ' الأدوار بالثنائي: ' + li.slice(0, 2).join('، '));
    // الأول والأخير من الإعدادات — والأداة المفتوحة تتحدث فوراً
    await clk('#wbt'); await clk('.wbt-set'); await F.waitForTimeout(300);
    chk(await q(() => !!document.querySelector('.wbw[data-k="settings"]')), W + ' نافذة إعدادات الأدوات تفتح');
    await clk('.wbw[data-k="settings"] [data-k="nmf"][data-v="fl"]'); await F.waitForTimeout(1200);
    li = await q(() => [...document.querySelectorAll('.wbw[data-k="order"] li')].map(x => x.textContent.replace(/^[٠-٩]+/, '').replace('🎤', '').trim()));
    chk(li.length > 2 && li.every(x => x.split(' ').length === 2) && li.some(x => /عبدالرحمن الغامدي|نورة العتيبي|سارة القحطاني|جود الشهري/.test(x)), W + ' الأول والأخير: ' + li.slice(0, 3).join('، '));
    // إعدادات أخرى
    await clk('.wbw[data-k="settings"] [data-k="spin"][data-v="f"]'); await clk('.wbw[data-k="settings"] [data-k="ns"][data-v="1.2"]');
    await q(() => { const B = document.querySelector('.wbw[data-k="settings"]'); const c = B.querySelector('[data-c="rmw"]'); c.checked = false; c.dispatchEvent(new Event('change')); const g = B.querySelector('[data-s="gN"]'); g.value = 3; g.dispatchEvent(new Event('change')); const t = B.querySelector('[data-s="tmin"]'); t.value = 7; t.dispatchEvent(new Event('change')); const p = B.querySelector('[data-s="tpre"]'); p.value = '2, 4, 8'; p.dispatchEvent(new Event('change')); const cf = B.querySelector('[data-c="conf"]'); cf.checked = false; cf.dispatchEvent(new Event('change')); });
    R = await q(() => JSON.parse(localStorage.getItem('dina_wbt_set')));
    chk(R.nmf === 'fl' && R.spin === 'f' && R.ns === 1.2 && R.rmw === false && R.gN === 3 && R.tmin === 7 && R.tpre === '2, 4, 8' && R.conf === false, W + ' كل الإعدادات حُفظت ' + JSON.stringify(R));
    if (W !== 768) await p.screenshot({ path: `p0/t196-settings-${W}.png` });
    await clk('.wbw[data-k="settings"] .cx'); await clk('.wbw[data-k="order"] .cx');
    for (const k of ['wheel', 'groups', 'timer']) { await clk('#wbt'); await clk(`[data-w="${k}"]`); await F.waitForTimeout(250); }
    const ap = await q(() => ({ rmw: document.querySelector('.wbw[data-k="wheel"] .rmw').checked, gn: document.querySelector('.wbw[data-k="groups"] .gn').value, grps: document.querySelectorAll('.wbw[data-k="groups"] .grp').length, tm: document.querySelector('.wbw[data-k="timer"] .big').textContent, pre: [...document.querySelectorAll('.wbw[data-k="timer"] [data-m]')].map(b => b.dataset.m).join(',') }));
    chk(ap.rmw === false && ap.gn === '3' && ap.grps === 3 && ap.tm === '٠٧:٠٠' && ap.pre === '2,4,8', W + ' الأدوات تطبّق الإعدادات ' + JSON.stringify(ap));
    // إعادة الافتراضي
    await clk('#wbt'); await clk('.wbt-set'); await F.waitForTimeout(200); await clk('.wbw[data-k="settings"] .rs'); await F.waitForTimeout(200);
    R = await q(() => JSON.parse(localStorage.getItem('dina_wbt_set'))); chk(R.nmf === 'full' && R.gN === 4 && R.conf === true, W + ' الإعدادات الافتراضية أُعيدت');
    await ctx.close(); }
  console.log('errors:', errs.length ? errs : 'none'); console.log(ok ? 'ALL OK' : 'FAILED'); await b.close(); })();
