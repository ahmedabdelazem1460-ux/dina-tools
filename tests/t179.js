// نماذجي: إنشاء بلصق نص (تحويل ذكي)، الفتح والتعبئة، التصميم، الترتيب، المشاركة — ثلاثة مقاسات
const { chromium } = require('playwright');
const TXT = `سجل متابعة الطلاب المتعثرين
اسم المعلم: ……
المادة: ……
التاريخ: ……
اسم الطالب | الصف | نوع التعثر | الإجراء
أساليب العلاج:
1- خطة علاجية فردية
2- تواصل مع ولي الأمر
☐ تحسن ☐ لم يتحسن ☐ يحتاج إحالة
التوقيع: المعلم | الموجه الطلابي | المدير`;
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
    await p.evaluate(() => { document.querySelector('#nfSoft') && document.querySelector('#nfSoft').remove(); location.hash = '#/myforms'; }); await p.waitForTimeout(800);
    await p.click('#mfNew'); await p.waitForTimeout(300); await p.fill('#mfF', 'الإرشاد'); await p.fill('#mfT', TXT);
    await p.screenshot({ path: `p0/mf-new-${w}.png` });
    await p.click('#mfGo'); await p.waitForTimeout(3500);
    const blocks = await p.evaluate(async () => (await APP.api.list('user_forms', {}))[0].tpl.blocks.map(b => b.type + (b.fields ? ':' + b.fields.length : b.cols && b.type === 'table' ? ':' + b.cols.length : b.items ? ':' + b.items.length : b.prefill ? ':' + b.prefill.length : b.roles ? ':' + b.roles.length : '')));
    const fr = p.frames().find(x => x.url().includes('formEmbed')); if (fr) { const inp = await fr.$('input:not([type=hidden]),textarea'); if (inp) { await inp.fill('أ. تجربة'); } }
    await p.waitForTimeout(2200); await p.screenshot({ path: `p0/mf-open-${w}.png` });
    const saved = await p.evaluate(async () => Object.keys((await APP.api.list('user_forms', {}))[0].data || {}).length);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove())); await p.evaluate(() => APP.route()); await p.waitForTimeout(800);
    await p.click('[data-op^="copy|"]'); await p.waitForTimeout(800);
    await p.click('[data-op^="down|"]'); await p.waitForTimeout(800);
    await p.click('[data-op^="edit|"]'); await p.waitForTimeout(500); await p.click('[data-ad="rating"]').catch(() => {}); await p.click('[data-ad="notes"]'); await p.waitForTimeout(200);
    await p.screenshot({ path: `p0/mf-build-${w}.png` }); await p.click('#bdGo'); await p.waitForTimeout(800);
    await p.screenshot({ path: `p0/mf-list-${w}.png` });
    const n = await p.$$eval('.mf-card', x => x.length);
    console.log(w, JSON.stringify({ blocks, saved, cards: n }));
    await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
