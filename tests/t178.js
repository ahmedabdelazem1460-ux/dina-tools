// الموارد البشرية: الإعدادات، لوحة اليوم والرصد، رصد الغياب الآلي، الربط بتأمين الحصص، السجل، المساءلة، شاشة QR، وتسجيل المعلم — ثلاثة مقاسات
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, geolocation: { latitude: 21.5433, longitude: 39.1728 }, permissions: ['geolocation'] });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
    await p.evaluate(() => { document.querySelector('#nfSoft') && document.querySelector('#nfSoft').remove(); APP.LS.set('hr_t', 'set'); location.hash = '#/hr'; }); await p.waitForTimeout(800);
    await p.check('#sEn'); await p.click('#sHere'); await p.waitForTimeout(500); await p.check('#sQr');
    await p.screenshot({ path: `p0/hr-set-${w}.png`, fullPage: true }); await p.click('#sSave'); await p.waitForTimeout(600);
    await p.click('[data-t="today"]'); await p.waitForTimeout(800);
    await p.click('[data-mk$="|present"]'); await p.waitForTimeout(400);
    await p.click('#hrAuto'); await p.waitForTimeout(300); await p.click('.ovl:last-of-type .btn:not(.ghost)'); await p.waitForTimeout(1200);
    const k = await p.$$eval('.hr-kpi b', x => x.map(y => y.textContent));
    await p.screenshot({ path: `p0/hr-today-${w}.png` });
    await p.click('[data-t="log"]'); await p.waitForTimeout(700); await p.screenshot({ path: `p0/hr-log-${w}.png` });
    await p.click('[data-t="acc"]'); await p.waitForTimeout(700); const qb = await p.$('[data-q]'); if (qb) { await qb.click(); await p.waitForTimeout(6000); }
    const issued = await p.evaluate(async () => (await APP.api.list('form_tasks', {})).filter(t => /^مساءلة/.test(t.title)).length);
    await p.screenshot({ path: `p0/hr-acc-${w}.png` });
    await p.click('[data-t="qr"]'); await p.waitForTimeout(1200); const tok = await p.$eval('#qrT', x => x.textContent); await p.screenshot({ path: `p0/hr-qr-${w}.png` });
    await p.click('[data-t="today"]'); await p.waitForTimeout(600); await p.click('#hrCover'); await p.waitForTimeout(2500);
    const cov = await p.evaluate(() => ({ hash: location.hash, note: !!document.querySelector('#sbB .notice.info') }));
    await p.screenshot({ path: `p0/hr-cover-${w}.png` });
    // المعلم: بطاقة الحضور على الرئيسية
    await p.evaluate(() => { const t = APP.S.staff.find(s => !s.is_owner && s.active); APP.S.realMe = null; APP.S.me = t; location.hash = '#/home'; APP.route(); }); await p.waitForTimeout(1200);
    const card = await p.$('#hrIn'); let msg = '';
    if (card) { await p.evaluate(() => { APP.S.school.settings.hr.qr = false; }); await card.click(); await p.waitForTimeout(1200); msg = await p.evaluate(() => [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|')); }
    await p.screenshot({ path: `p0/hr-teacher-${w}.png` });
    console.log(w, JSON.stringify({ kpis: k, issued, tok, cov, teacherCard: !!card, msg: msg.slice(0, 80) }));
    await ctx.close(); }
  console.log('ERRS', errs); await b.close(); })();
