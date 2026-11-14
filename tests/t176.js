// نافذة تطبيق الجوال من قائمة المستخدم — ثلاثة مقاسات
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[375, 812], [768, 1024], [1440, 900]]) { const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
    await p.evaluate(() => document.querySelector('#nfSoft') && document.querySelector('#nfSoft').remove());
    await p.click('#ub'); await p.waitForTimeout(200); await p.click('.menu [data-a="app"]'); await p.waitForTimeout(400);
    const qr = await p.$$eval('.ovl svg rect, .ovl svg path', x => x.length);
    await p.screenshot({ path: `p0/app-${w}.png` }); console.log(w, 'qr parts', qr); await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
