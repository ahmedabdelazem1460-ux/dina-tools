// فصل الحصة: اختيار الفصل يُدرج أسماءه في المربع، والتعديل يُعتمد ويبقى باسم الفصل، والأدوات تستخدم المعدّل — node t195.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = []; let ok = true; const chk = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) ok = false; };
  for (const W of [1440, 768, 375]) { const ctx = await b.newContext({ viewport: { width: W, height: 860 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(W + ' ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
    await p.evaluate(() => location.hash = '#/wboard'); await p.waitForTimeout(2500);
    let F = p.frames().find(x => /whiteboard/.test(x.url())); await F.evaluate(() => { ['dina_wbt_roster', 'dina_wbt_names'].forEach(k => localStorage.removeItem(k)); location.reload(); }); await p.waitForTimeout(2500);
    F = p.frames().find(x => /whiteboard/.test(x.url())); const clk = s => F.evaluate(s => document.querySelector(s).click(), s); const q = (fn, a) => F.evaluate(fn, a);
    await clk('#wbt'); await clk('.wbt-ros .rs'); await F.waitForTimeout(300);
    chk(await q(() => document.querySelector('.wbw[data-k="roster"] .nt').value === ''), W + ' المربع فارغ قبل اختيار فصل');
    await clk('.wbw[data-k="roster"] [data-c]'); await F.waitForTimeout(1500);
    const n1 = await q(() => document.querySelector('.wbw[data-k="roster"] .nt').value.split('\n').filter(Boolean));
    const lbl = await q(() => document.querySelector('.wbw[data-k="roster"] .lb').textContent);
    chk(n1.length >= 2, W + ' أسماء الفصل أُدرجت في المربع: ' + n1.length + ' — ' + n1.slice(0, 3).join('، '));
    chk(/أسماء «/.test(lbl), W + ' العنوان: ' + lbl);
    const R1 = await q(() => JSON.parse(localStorage.getItem('dina_wbt_roster'))); chk(R1.names.join() === n1.join(), W + ' القائمة المعتمدة = ما في المربع');
    if (W === 1440) await p.screenshot({ path: 'p0/t195-loaded.png' });
    // حذف أول اسم (غائب) وإضافة اسم ثم الاعتماد
    await q(() => { const t = document.querySelector('.wbw[data-k="roster"] .nt'); const L = t.value.split('\n'); L.shift(); L.push('زائر جديد'); t.value = L.join('\n'); });
    await clk('.wbw[data-k="roster"] .sv'); await F.waitForTimeout(300);
    const R2 = await q(() => JSON.parse(localStorage.getItem('dina_wbt_roster')));
    chk(R2.key === R1.key && R2.label === R1.label, W + ' بقي باسم الفصل: ' + R2.label);
    chk(R2.names.length === n1.length && !R2.names.includes(n1[0]) && R2.names.includes('زائر جديد'), W + ' التعديل اعتُمد');
    chk(/✓/.test(await q(() => document.querySelector('.wbw[data-k="roster"] .st').textContent)), W + ' رسالة التأكيد ظاهرة');
    // إعادة الفتح تُظهر المعدّل
    await clk('.wbw[data-k="roster"] .cx'); await clk('#wbt'); await clk('.wbt-ros .rs'); await F.waitForTimeout(300);
    chk(await q(() => document.querySelector('.wbw[data-k="roster"] .nt').value.includes('زائر جديد')), W + ' إعادة الفتح تُظهر الأسماء المعدّلة');
    if (W !== 768) await p.screenshot({ path: `p0/t195-${W}.png` });
    await clk('.wbw[data-k="roster"] .cx');
    // الأدوات تستخدم القائمة المعدّلة
    await clk('#wbt'); await clk('[data-w="stars"]'); await F.waitForTimeout(300);
    const st = await q(() => [...document.querySelectorAll('.wbw[data-k="stars"] .st-c b')].map(x => x.textContent));
    chk(st.length === R2.names.length && st.includes('زائر جديد') && !st.includes(n1[0]), W + ' النجوم بالقائمة المعدّلة (' + st.length + ')');
    await clk('.wbw[data-k="stars"] .cx'); await clk('#wbt'); await clk('[data-w="wheel"]'); await F.waitForTimeout(300);
    chk(new RegExp('من ' ).test(await q(() => document.querySelector('.wbw[data-k="wheel"] .hs').textContent)), W + ' العجلة: ' + await q(() => document.querySelector('.wbw[data-k="wheel"] .hs').textContent));
    // اختيار الأرقام لا يملأ المربع، والكتابة اليدوية تُعتمد «قائمتي»
    await clk('.wbw[data-k="wheel"] .cx'); await clk('#wbt'); await clk('.wbt-ros .rs'); await F.waitForTimeout(200);
    await q(() => { const n = document.querySelector('.wbw[data-k="roster"] .nn'); n.value = 5; document.querySelector('.wbw[data-k="roster"] .nb').click(); });
    chk(await q(() => document.querySelector('.wbw[data-k="roster"] .nt').value === ''), W + ' الأرقام: المربع فارغ للكتابة');
    await q(() => { document.querySelector('.wbw[data-k="roster"] .nt').value = 'أ\nب\nج'; document.querySelector('.wbw[data-k="roster"] .sv').click(); });
    const R3 = await q(() => JSON.parse(localStorage.getItem('dina_wbt_roster'))); chk(R3.key === 'manual' && R3.names.length === 3, W + ' الكتابة اليدوية = قائمتي (٣)');
    await ctx.close(); }
  console.log('errors:', errs.length ? errs : 'none'); console.log(ok ? 'ALL OK' : 'FAILED'); await b.close(); })();
