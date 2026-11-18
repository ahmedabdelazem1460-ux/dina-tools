// خط الخلايا في «الجدول العام للأسبوع»: الحجم/العرض/الملاءمة/الاسم الكامل/المعلم — لا نص يفيض من خليته — node tests/t213.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = []; let ok = true; const chk = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) ok = false; };
  const over = p => p.evaluate(() => [...document.querySelectorAll('.tv-ms td.c b, .tv-ms td.c i')].filter(b => b.clientWidth && b.scrollWidth > b.clientWidth + 1).length);
  for (const W of [1440, 768, 375]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(W + ' ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
    await p.evaluate(() => { localStorage.removeItem('dwp_ttv_cfg'); location.hash = '#/ttviews'; }); await p.waitForTimeout(1500);
    await p.click('.tv-tabs [data-v="master"]'); await p.waitForTimeout(800);
    chk(await p.$('#tvMz') !== null, W + ' شريط خط الخلايا ظاهر'); chk(await over(p) === 0, W + ' لا نص يفيض من خليته (افتراضي)');
    chk(!(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)), W + ' بلا تمرير أفقي للصفحة');
    await p.screenshot({ path: `p0/t213-def-${W}.png` });
    const fs0 = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.tv-ms .tvg-m')).fontSize));
    for (let i = 0; i < 6; i++) await p.click('[data-z="5"]'); await p.waitForTimeout(300);
    const fs1 = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.tv-ms .tvg-m')).fontSize));
    chk(fs1 > fs0 * 1.25, `${W} التكبير يعمل ${fs0}→${fs1}`); chk(await p.textContent('#tvMzo') === '١٣٠٪', W + ' مؤشر النسبة ١٣٠٪');
    await p.selectOption('#tvMw', '52'); await p.waitForTimeout(300); chk(await over(p) === 0, W + ' عرض واسع + خط ١٣٠٪ بلا فيض'); await p.screenshot({ path: `p0/t213-big-${W}.png` });
    await p.click('[data-mf="wrap"]'); await p.check('[data-mo="mFull"]'); await p.waitForTimeout(700); await p.check('[data-mo="mT"]'); await p.waitForTimeout(700);
    chk(await p.evaluate(() => document.querySelectorAll('.tv-ms td.c i').length) > 5, W + ' اسم المعلم داخل الخلية'); chk(await over(p) === 0, W + ' سطران + كامل + معلم بلا فيض');
    await p.screenshot({ path: `p0/t213-wrap-${W}.png` });
    await p.reload(); await p.waitForTimeout(1500); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000); await p.evaluate(() => location.hash = '#/ttviews'); await p.waitForSelector('#tvMz', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(800);
    chk(await p.$eval('#tvMz', e => e.value) === '130' && await p.$eval('#tvMw', e => e.value) === '52', W + ' الإعدادات محفوظة بعد إعادة التحميل');
    await p.click('[data-r="teacher"]'); await p.waitForTimeout(800); chk(await over(p) === 0, W + ' بالمعلمين بلا فيض'); await p.screenshot({ path: `p0/t213-teach-${W}.png` });
    await p.click('#tvMr'); await p.waitForTimeout(800); chk(await p.$eval('#tvMz', e => e.value) === '100', W + ' زر الافتراضي');
    await ctx.close(); }
  chk(!errs.length, 'بلا أخطاء JS ' + errs.join(' | ')); await b.close(); console.log(ok ? 'PASS' : 'FAIL'); process.exit(ok ? 0 : 1); })();
