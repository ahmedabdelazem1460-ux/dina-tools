// التحكم في الميزات الجديدة للمعلمين: مخفية افتراضياً، وتظهر بعد تفعيل المالك — ثلاثة مقاسات
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
    const asT = async () => p.evaluate(async () => { const real = APP.S.me; const t = APP.S.staff.find(s => !s.is_owner && s.active); APP.S.me = t; APP.shell(); APP.route(); await new Promise(r => setTimeout(r, 600));
      document.querySelector('#ub').click(); await new Promise(r => setTimeout(r, 100)); const menu = document.querySelector('.menu'); const app = !!(menu && menu.querySelector('[data-a="app"]')); menu && menu.remove();
      const keys = APP.NAV.filter(APP.navOK).map(n => n[0]); const r = { bell: !!document.querySelector('#notifBtn'), myforms: keys.includes('myforms'), hr: keys.includes('hr'), app }; APP.S.me = real; APP.shell(); APP.route(); return r; });
    const before = await asT();
    const own = await p.evaluate(() => { const keys = APP.NAV.filter(APP.navOK).map(n => n[0]); return { bell: !!document.querySelector('#notifBtn'), myforms: keys.includes('myforms'), hr: keys.includes('hr') }; });
    await p.evaluate(() => { location.hash = '#/tui'; }); await p.waitForTimeout(900);
    await p.screenshot({ path: `p0/tf-${w}.png` });
    await p.check('[data-tf="notif"]'); await p.check('[data-tf="myforms"]'); await p.click('#tfGo'); await p.waitForTimeout(700);
    const after = await asT();
    console.log(w, JSON.stringify({ before, own, after }));
    await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
