// صفحة المعلم: جرس الإشعارات وزر تطبيق الجوال في لوحة المعلم والرئيسية، الترتيب المنطقي للأيقونات والمواد والصفوف
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = []; const W = process.argv[2] ? [+process.argv[2]] : [375, 768, 1440];
  for (const w of W) {
    const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage(); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="n.qahtani@dinaschool.com"]'); await p.waitForTimeout(1500);
    await p.evaluate(() => { const t = {}; APP.TFEAT.forEach(f => t[f[0]] = true); APP.S.school.settings = { ...(APP.S.school.settings || {}), tfeat: t }; window.APP_AFTER_SHELL && APP_AFTER_SHELL(); location.hash = '#/dash'; setTimeout(() => location.hash = '#/my', 50); });
    await p.waitForTimeout(2500); const clean = () => p.evaluate(() => document.querySelectorAll('.nf-toastpush,.ovl').forEach(e => e.remove())); await clean();
    const icons = await p.$$eval('#myHero .tq-ic', x => x.map(i => i.textContent.trim()));
    await p.screenshot({ path: `p0/t189-hero-${w}.png` });
    await p.click('#myHero [data-tqa="notify"]'); await p.waitForTimeout(600); const bell = await p.evaluate(() => !!document.querySelector('.nf-wrap')); await clean();
    await p.click('#myHero [data-tqa="x_app"]'); await p.waitForTimeout(600); const app = await p.evaluate(() => /تطبيق منصة دينا/.test((document.querySelector('.modal') || {}).textContent || '')); await clean();
    const chips = await p.$$eval('.pb-sb', x => x.map(i => i.textContent.replace(/\s+/g, ' ').trim()));
    const sel = await p.$$eval('#mySel option', x => x.map(o => o.textContent.trim()));
    await p.evaluate(() => location.hash = '#/home'); await p.waitForTimeout(1500); await clean();
    const groups = await p.$$eval('.hm-grp h2', x => x.map(h => h.textContent.trim()));
    await p.screenshot({ path: `p0/t189-home-${w}.png`, fullPage: true });
    await p.click('.hm-card[data-act="x_app"]'); await p.waitForTimeout(500); const homeApp = await p.evaluate(() => /تطبيق منصة دينا/.test((document.querySelector('.modal') || {}).textContent || '')); await clean();
    await p.click('.hm-card[data-act="x_notif"]'); await p.waitForTimeout(500); const homeBell = await p.evaluate(() => !!document.querySelector('.nf-wrap')); await clean();
    const hs = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    console.log(w, JSON.stringify({ icons, bell, app, chips, sel, groups, homeApp, homeBell, hs }));
  }
  console.log('ERRS', errs); await b.close(); })();
