const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
  for (const pg of ['index.html', 'index.dev.html']) { const errs = []; const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && /\[dina\]/.test(m.text())) errs.push(m.text()); });
    const t0 = Date.now(); await p.goto('http://localhost:8766/' + pg + '?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
    const r = await p.evaluate(() => ({ views: Object.keys(VIEWS).length, nav: APP.NAV.length, keys: Object.keys(APP).length, v: window.DINA_V }));
    for (const h of ['dash', 'studio', 'attendance', 'assess', 'qbank', 'forms', 'board', 'counsel', 'records', 'reports']) { await p.evaluate(x => { location.hash = '#/' + x; }, h); await p.waitForTimeout(700); }
    console.log(pg, JSON.stringify(r), 'scripts', await p.evaluate(() => document.scripts.length), 'ERRS', errs); await p.close(); }
  await b.close(); })();
