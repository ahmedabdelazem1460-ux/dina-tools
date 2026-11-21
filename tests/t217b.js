// اللجان: لا تمرير أفقي في كل التبويبات على 375/768 — node t217b.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 375, height: 800 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); const R = {};
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  await p.evaluate(() => { APP.LS.set('lj_open', ''); location.hash = '#/lijan'; }); await p.waitForTimeout(1000);
  await p.click('#ljNew'); await p.waitForTimeout(400); await p.click('#ljAll'); await p.waitForTimeout(500);
  await p.click('[data-tb="rooms"]'); await p.waitForTimeout(300); await p.click('#ljAq'); await p.click('[data-tb="seat"]'); await p.waitForTimeout(300); await p.click('#sGo'); await p.waitForTimeout(400);
  for (const w of [375, 768]) { await p.setViewportSize({ width: w, height: 800 });
    for (const t of ['cls', 'rooms', 'seat', 'map', 'sched', 'print', 'share']) { await p.click(`[data-tb="${t}"]`); await p.waitForTimeout(350); R[w + t] = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (w === 375 && ['map', 'seat'].includes(t)) await p.screenshot({ path: `p0/t217b_${t}.png` }); } }
  R.errors = errs; console.log(JSON.stringify(R)); await b.close(); })();
