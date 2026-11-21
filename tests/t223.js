// المنصات التابعة عبر الوسيط (اطلاع كامل بلا حساب) + الرجوع للدخول عند غياب المفتاح — node t223.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); const R = {};
  let mode = 'ok', auth = '';
  await p.route('**/api/link/*/overview*', r => { auth = r.request().headers()['authorization'] || ''; if (mode === 'nokey') return r.fulfill({ status: 501, contentType: 'application/json', body: '{"error":"not_configured"}' });
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'dina', at: new Date().toISOString(), schools: [{ name: 'مدارس دينا العالمية', staff: 96, accounts: 90, students: 812, logins: 1540, att: 790, absent: 22, late: 9, beh: 41, behNeg: 30, quizzes: 18, questions: 2400, forms: 37, preps: 120, sections: [{ name: 'قسم البنين', classes: 18, week: { word: 'الثاني عشر', total: 630, filled: 600, sent: 560, approved: 500, done: 410 } }, { name: 'قسم البنات', classes: 17, week: null }], top: [{ name: 'أ. خالد', n: 35 }, { name: 'أ. سارة', n: 28 }] }] }) }); });
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(3000);
  await p.evaluate(() => { APP.api.session = async () => ({ access_token: 'tok123' }); APP_DBS.dina.supabaseUrl = 'https://other.supabase.co'; APP.LS.set('pc_t', 'lk'); location.hash = '#/schools'; }); await p.waitForTimeout(1800);
  R.state = await p.$eval('[data-ls]', x => x.textContent); R.auth = auth;
  R.kpis = await p.$$eval('.pl-card .pc-kp b', L => L.length); R.secRows = await p.$$eval('.pl-card .pl-tbl tbody tr', L => L.map(x => x.textContent.replace(/\s+/g, ' ').trim()));
  R.noLogin = !(await p.$('[data-lf]'));
  for (const w of [375, 768, 1440]) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300); await p.screenshot({ path: `p0/t223_full_${w}.png`, fullPage: true }); R['ov' + w] = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
  await p.setViewportSize({ width: 1440, height: 900 });
  mode = 'nokey'; await p.evaluate(() => { APP.LS.set('pc_t', 'lk'); location.hash = '#/home'; setTimeout(() => location.hash = '#/schools', 50); }); await p.waitForTimeout(1800);
  R.noKeyNote = await p.$eval('[data-lnote]', x => x.textContent.slice(0, 40)).catch(() => ''); R.fallbackLogin = !!(await p.$('[data-lf]'));
  R.errs = errs; console.log(JSON.stringify(R, null, 1)); await b.close();
})();
