// السؤال اللحظي والعروض التقديمية — ثلاثة مقاسات (وضع التجربة)
const { chromium } = require('playwright');
const TXT = `الكسور الاعتيادية
أهداف الدرس:
- يتعرف الطالب على مفهوم الكسر
- يقارن بين كسرين
- يجمع كسرين لهما المقام نفسه
المفاهيم الأساسية:
- البسط هو العدد العلوي
- المقام هو العدد السفلي`;
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, acceptDownloads: true }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
    await p.evaluate(() => { document.querySelector('#nfSoft') && document.querySelector('#nfSoft').remove(); location.hash = '#/poll'; }); await p.waitForTimeout(600);
    await p.click('[data-k="cloud"]'); await p.fill('#lpQ', 'بكلمة واحدة: ما أهم قيمة تعلمتها اليوم؟'); await p.click('#lpGo'); await p.waitForTimeout(5500);
    await p.screenshot({ path: `p0/lp-cloud-${w}.png` }); const n1 = await p.$eval('#lpN', x => x.textContent);
    await p.click('#lpNew'); await p.waitForTimeout(400); await p.click('.ovl [data-k="mcq"]'); await p.fill('#lpQ', 'ما ناتج ٣ × ٤ ؟'); await p.fill('[data-o="0"]', '١٢'); await p.fill('[data-o="1"]', '٧'); await p.fill('[data-o="2"]', '١٤'); await p.fill('[data-o="3"]', '١٠'); await p.check('[name=lpC][value="0"]'); await p.click('#lpGo'); await p.waitForTimeout(5000);
    await p.click('#lpRev'); await p.waitForTimeout(500); await p.screenshot({ path: `p0/lp-mcq-${w}.png` });
    await p.click('#lpEnd'); await p.waitForTimeout(300);
    // العروض
    await p.evaluate(() => { location.hash = '#/slides'; }); await p.waitForTimeout(700);
    await p.click('#slNew'); await p.waitForTimeout(300); await p.click('[data-w="text"]'); await p.fill('#slX', TXT); await p.click('[data-th="wave"]'); await p.click('#slGo'); await p.waitForTimeout(1500);
    await p.screenshot({ path: `p0/sl-editor-${w}.png` });
    const n = await p.$$eval('#edL [data-i]', x => x.length);
    await p.click('[data-add="question"]'); await p.waitForTimeout(200);
    const dl = p.waitForEvent('download', { timeout: 20000 }).catch(() => null); await p.click('#edPp'); const f = await dl; let fn = 'none'; if (f) { await f.saveAs(`p0/deck-${w}.pptx`); fn = require('fs').readFileSync(`p0/deck-${w}.pptx`).slice(0, 2).toString(); }
    await p.click('#edSave'); await p.waitForTimeout(500);
    await p.click('#edShow'); await p.waitForTimeout(600); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300); await p.screenshot({ path: `p0/sl-show-${w}.png` });
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove())); await p.evaluate(() => APP.route()); await p.waitForTimeout(800);
    // عرض من البنك
    await p.evaluate(async () => { const sub = APP.S.subjects[0].id; await APP.api.ins('questions', [1, 2, 3, 4, 5].map(i => ({ id: 'q' + i + Math.random(), school_id: APP.S.school.id, subject_id: sub, qtype: i % 2 ? 'mcq' : 'tf', body: i % 2 ? 'ما ناتج ' + i + ' × ٢ ؟' : 'الشمس نجم.', options: i % 2 ? [{ t: String(i * 2), ok: true }, { t: String(i * 2 + 1) }, { t: String(i + 2) }, { t: '٠' }] : [], answer: 'صواب' }))); });
    await p.click('#slNew'); await p.waitForTimeout(800); await p.fill('#slT', 'مراجعة سريعة'); await p.click('[data-th="night"]'); await p.click('#slGo'); await p.waitForTimeout(1500);
    const nb = await p.$$eval('#edL [data-i]', x => x.length).catch(() => 0);
    await p.screenshot({ path: `p0/sl-bank-${w}.png` });
    console.log(w, JSON.stringify({ cloudVotes: n1, textSlides: n, pptx: fn, bankSlides: nb }));
    await ctx.close(); }
  console.log('ERRS', errs); await b.close(); })();
