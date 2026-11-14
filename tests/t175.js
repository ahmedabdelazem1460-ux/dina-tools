// الفصول الدراسية: إضافة الفصل الثاني (قيد التجهيز) وأسابيعه، المؤشر، التبديل، التفعيل — ثلاثة مقاسات (وضع التجربة)
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2500);
    await p.evaluate(() => { document.querySelector('#nfSoft') && document.querySelector('#nfSoft').remove(); APP.LS.set('admtab', 'terms'); location.hash = '#/admin'; }); await p.waitForTimeout(1200);
    await p.screenshot({ path: `p0/tm-panel0-${w}.png`, fullPage: true });
    await p.click('#tmAdd'); await p.waitForTimeout(400); await p.fill('#tmW', '4'); await p.fill('#tmY', '١٤٤٨هـ');
    await p.screenshot({ path: `p0/tm-wizard-${w}.png` });
    await p.click('#tmGo'); await p.waitForTimeout(2500);
    const after = await p.evaluate(() => ({ terms: APP.S.terms.map(t => t.name + ':' + t.status), view: APP.termCur().name, weeks: APP.S.weeks.length, all: APP.S.weeksAll.length, sel: !!document.querySelector('#termSel') }));
    await p.screenshot({ path: `p0/tm-panel1-${w}.png`, fullPage: true });
    await p.click('#ub'); await p.waitForTimeout(300); await p.screenshot({ path: `p0/tm-menu-${w}.png` });
    await p.click('.tm-seg button:not(.on)'); await p.waitForTimeout(1500);
    const back = await p.evaluate(() => ({ view: APP.termCur().name, weeks: APP.S.weeks.length }));
    await p.evaluate(() => { APP.LS.set('admtab', 'terms'); location.hash = '#/admin'; APP.route(); }); await p.waitForTimeout(1000);
    p.once('dialog', d => d.accept());
    const actBtn = await p.$('[data-act]'); if (actBtn) { await actBtn.click(); await p.waitForTimeout(400); const ok = await p.$('.ovl .btn:not(.ghost)'); if (ok) await ok.click(); await p.waitForTimeout(2000); }
    const act = await p.evaluate(() => ({ terms: APP.S.terms.map(t => t.name + ':' + t.status), view: APP.termCur().name, weeks: APP.S.weeks.length }));
    const hs = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
    await p.screenshot({ path: `p0/tm-active-${w}.png` });
    console.log(w, JSON.stringify({ after, back, act, hs }));
    await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
