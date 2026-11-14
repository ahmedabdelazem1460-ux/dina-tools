// قوالب الألعاب الجديدة في play.html (بمحاكاة الخادم): ترتيب الحروف، البالونات، الفرز، سباق الفريقين — ثلاثة مقاسات
const { chromium } = require('playwright');
const Q = [{ type: 'mcq', body: 'عاصمة المملكة العربية السعودية؟', options: [{ t: 'الرياض', ok: true }, { t: 'جدة' }, { t: 'الدمام' }, { t: 'مكة' }] }, { type: 'tf', body: 'الشمس نجم.', answer: 'صواب' }, { type: 'short', body: 'أكبر كوكب في المجموعة الشمسية؟', answer: 'المشتري' }, { type: 'mcq', body: '٣ × ٤ = ؟', options: [{ t: '١٢', ok: true }, { t: '٧' }, { t: '١٤' }] }, { type: 'tf', body: 'الماء يغلي عند ٥٠ درجة.', answer: 'خطأ' }];
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.route('**/rest/v1/rpc/game_set_public', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ title: 'مراجعة عامة', subject: 'العلوم', school: 'مدارس دينا العالمية', questions: Q, modes: null }) }));
    await p.goto('http://localhost:8766/play.html?s=TEST'); await p.waitForTimeout(800);
    const modes = await p.$$eval('[data-md]', x => x.length); await p.screenshot({ path: `p0/gm-home-${w}.png` });
    await p.click('[data-md="anagram"]'); await p.waitForTimeout(300); const tiles = await p.$$eval('.tiles button', x => x.length); await p.screenshot({ path: `p0/gm-anagram-${w}.png` }); await p.click('#bk');
    await p.click('[data-md="balloon"]'); await p.waitForTimeout(1500); await p.screenshot({ path: `p0/gm-balloon-${w}.png` }); await p.$eval('.bl', el => el.click()); await p.waitForTimeout(400); const bfb = await p.$eval('#fb', x => x.textContent); await p.click('#bk');
    await p.click('[data-md="groups"]'); await p.waitForTimeout(300); await p.click('[data-v="1"]'); await p.waitForTimeout(900); await p.click('#bk');
    await p.click('[data-md="race"]'); await p.waitForTimeout(300); await p.click('#rv'); await p.click('[data-t="0"]'); await p.click('[data-t="0"]'); await p.waitForTimeout(700); await p.screenshot({ path: `p0/gm-race-${w}.png` });
    console.log(w, JSON.stringify({ modes, tiles, balloonFb: bfb.slice(0, 30) }));
    await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
