// صلاحيات النماذج: خطوة الصلاحيات في الإرسال، الإعادة لأي طرف/التوصية، الاعتماد، التعميد، السجل — ثلاثة مقاسات (وضع التجربة)
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
    await p.evaluate(() => { document.querySelector('#nfSoft') && document.querySelector('#nfSoft').remove(); location.hash = '#/forms'; }); await p.waitForTimeout(1500);
    await p.click('#fmSend'); await p.waitForSelector('.sm-card', { timeout: 25000 });
    await p.click('.sm-card'); await p.click('#smP label input');
    await p.selectOption('#spA', 'edit'); await p.selectOption('#spC', 'sign'); await p.selectOption('#spS', 'admin'); await p.check('#spE');
    await p.evaluate(() => document.querySelector('#smPerm').scrollIntoView()); await p.screenshot({ path: `p0/fp-send-${w}.png` });
    await p.click('#smGo'); await p.waitForTimeout(1500);
    const t = await p.evaluate(async () => { const l = await APP.api.list('form_tasks', {}); const x = l[l.length - 1]; return { id: x.id, perms: x.perms }; });
    // افتح النموذج كمالك، أرسله نيابة (حالة submitted) ثم أعد/أوصِ واعتمد وعمّد
    await p.evaluate(async id => { await APP.api.upd('form_tasks', id, { status: 'submitted', cosign: [{ staff_id: APP.S.staff.find(s => !s.is_owner && s.id !== (APP.S.staff[0] || {}).id).id, key: 'k1', label: 'المزور', status: 'signed' }] }); }, t.id);
    await p.evaluate(() => { location.hash = '#/home'; }); await p.waitForTimeout(300); await p.evaluate(() => { location.hash = '#/forms'; }); await p.waitForTimeout(1200);
    await p.click('[data-tb="inbox"]').catch(() => {}); await p.waitForTimeout(500);
    await p.click(`[data-id="${t.id}"]`); await p.waitForTimeout(1500);
    await p.click('[data-a="retany"]'); await p.waitForTimeout(300);
    await p.selectOption('#rtP', { index: 1 }); await p.click('#rtQ button'); await p.screenshot({ path: `p0/fp-ret-${w}.png` });
    await p.click('#rtGo'); await p.waitForTimeout(800);
    const afterRet = await p.evaluate(async id => (await APP.api.list('form_tasks', { id }))[0].cosign[0].status, t.id);
    await p.click('[data-a="approve"]'); await p.waitForTimeout(800);
    await p.click('[data-a="endorse"]'); await p.waitForTimeout(300); await p.click('.ovl:last-of-type .btn:not(.ghost)'); await p.waitForTimeout(800);
    await p.screenshot({ path: `p0/fp-endorsed-${w}.png` });
    await p.click('[data-a="trail"]'); await p.waitForTimeout(300); await p.screenshot({ path: `p0/fp-trail-${w}.png` });
    const fin = await p.evaluate(async id => { const x = (await APP.api.list('form_tasks', { id }))[0]; return { st: x.status, end: !!x.endorsed_at, trail: (x.trail || []).map(y => y.act) }; }, t.id);
    console.log(w, JSON.stringify({ perms: t.perms, afterRet, fin }));
    await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
