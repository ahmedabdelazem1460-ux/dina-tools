// السمة الافتراضية «عمق» للجميع + زر السمات في الشريط
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const w of [375, 768, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="n.qahtani@dinaschool.com"]'); await p.waitForTimeout(2200);
    await p.evaluate(() => location.hash = '#/my'); await p.waitForTimeout(1800);
    const th = await p.evaluate(() => document.body.dataset.th); const btn = await p.$('#thBtn'); const vis = btn ? await btn.isVisible() : false;
    await p.screenshot({ path: `p0/t187-teacher-${w}.png` });
    if (btn && vis) { await btn.click(); await p.waitForTimeout(500); const n = await p.$$eval('#thPick [data-th]', x => x.length); await p.click('#thPick [data-th="glass"]'); await p.waitForTimeout(300); console.log(w, 'pick', n, await p.evaluate(() => document.body.dataset.th)); await p.screenshot({ path: `p0/t187-picker-${w}.png` }); }
    console.log(w, JSON.stringify({ th, btn: !!btn, vis })); await ctx.close(); }
  console.log('ERRS', errs); await b.close(); })();
