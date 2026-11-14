// الإشعارات: الجرس، اللوحة، التفضيلات، إصدار تنبيه، مركز الإشعارات — ثلاثة مقاسات (وضع التجربة)
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[375, 812], [768, 1024], [1440, 900]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2500);
    const n = await p.evaluate(() => (document.querySelector('#notifN') || {}).textContent);
    await p.screenshot({ path: `p0/nf-top-${w}.png` });
    await p.evaluate(() => document.querySelector('#nfSoft') && document.querySelector('#nfSoft').remove());
    await p.click('#notifBtn'); await p.waitForTimeout(500); await p.screenshot({ path: `p0/nf-panel-${w}.png` });
    const items = await p.$$eval('.nf-it', x => x.length);
    await p.click('#nfIssue'); await p.waitForTimeout(400);
    await p.click('#isTpl [data-t="plan"]'); await p.click('#isG [data-g="t"]'); await p.waitForTimeout(200);
    await p.screenshot({ path: `p0/nf-issue-${w}.png` });
    await p.click('#isGo'); await p.waitForTimeout(700);
    await p.evaluate(() => { location.hash = '#/notify'; }); await p.waitForTimeout(900);
    const sent = await p.$$eval('.nf-sent .row-s', x => x.length);
    const hs = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
    await p.screenshot({ path: `p0/nf-center-${w}.png`, fullPage: true });
    await p.click('#nvPS').catch(() => {}); await p.selectOption('#nvP', { index: 2 }); await p.click('#nvPS'); await p.waitForTimeout(400);
    await p.screenshot({ path: `p0/nf-prefs-${w}.png` });
    await p.click('#npGo'); await p.waitForTimeout(400);
    console.log(w, { badge: n, items, sent, hscroll: hs });
    await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
