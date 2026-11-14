// واجهة الاستيراد بصورة جدول: العدد، الأنواع، الإجابات المظللة، معاينة الأصل، الحفظ في البنك — node t190ui.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const W of [1440, 375]) { const p = await b.newPage({ viewport: { width: W, height: W > 800 ? 900 : 780 } }); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
    await p.evaluate(() => { APP.LS.set('as_t', 'bank'); location.hash = '#/assess'; }); await p.waitForTimeout(2000);
    const qb0 = await p.evaluate(() => APP._assess.QB.length);
    await p.click('#bImp'); await p.waitForTimeout(500); await p.setInputFiles('#iqF', process.argv[2] || 'fx/hl.png');
    await p.waitForFunction(() => document.querySelectorAll('.iq-q').length > 0, null, { timeout: 240000 });
    const r = await p.evaluate(() => ({ rep: document.querySelector('#iqR').innerText, n: document.querySelectorAll('.iq-q').length, ok: document.querySelectorAll('.iq-opts label.ok').length, imgs: document.querySelectorAll('.iq-img img').length, need: document.querySelectorAll('.iq-q.need').length }));
    console.log(W, JSON.stringify(r));
    await p.evaluate(() => { const d = document.querySelector('.iq-img'); if (d) d.open = true; }); await p.waitForTimeout(300);
    await p.screenshot({ path: `p0/t190-${W}.png` });
    if (W === 1440) { await p.evaluate(() => document.querySelectorAll('.iq-q.need input[data-on]').forEach(c => c.click())); await p.waitForTimeout(300);
      await p.click('#iqBank'); await p.waitForTimeout(1200); console.log('bank +', await p.evaluate(() => APP._assess.QB.length) - qb0); }
    await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
