// اختيار قاعدة البيانات من config.js (دينا افتراضياً، المنصة الأم بـ ?db=core) — node t221.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); const R = {};
  const st = () => p.evaluate(() => ({ db: APP_CONFIG.db, url: APP_CONFIG.supabaseUrl.slice(8, 20), badge: !!document.getElementById('dbBadge') }));
  await p.goto('http://localhost:8766/index.html'); await p.evaluate(() => localStorage.removeItem('dwp_db')); await p.reload(); await p.waitForTimeout(600);
  R.default = await st();
  await p.goto('http://localhost:8766/index.html?db=core'); await p.waitForTimeout(600); R.core = await st();
  await p.screenshot({ path: 'p0/t221_core.png' });
  await p.goto('http://localhost:8766/parents.html'); await p.waitForTimeout(600); R.coreSticky = await st();
  await p.goto('http://localhost:8766/index.html?db=dina'); await p.waitForTimeout(600); R.back = await st();
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.waitForTimeout(600); R.demo = await st();
  R.errs = errs.filter(e => !/ERR_TUNNEL|fonts/.test(e));
  console.log(JSON.stringify(R, null, 1)); await b.close();
})();
