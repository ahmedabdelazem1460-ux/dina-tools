// البوصلة (المقاييس والنتائج ومؤشرات الأداء) + صفحة الطالب scale.html (بمحاكاة الخادم) + مساعد المعلم — ثلاثة مقاسات
const { chromium } = require('playwright');
const TXT = `دورة الماء في الطبيعة هي حركة الماء المستمرة بين الأرض والغلاف الجوي. تبدأ الدورة بتبخر الماء من البحار والمحيطات بفعل حرارة الشمس. ثم يتكاثف بخار الماء في طبقات الجو العليا مكوناً السحب. بعد ذلك يحدث الهطول على شكل أمطار أو ثلوج. يتجمع الماء في الأنهار والبحيرات والمياه الجوفية ثم يعود إلى البحار. تسهم دورة الماء في توزيع الحرارة على سطح الأرض وتوفير المياه العذبة للكائنات الحية.`;
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
    await p.evaluate(() => { document.querySelector('#nfSoft') && document.querySelector('#nfSoft').remove(); location.hash = '#/compass'; }); await p.waitForTimeout(700);
    await p.screenshot({ path: `p0/cp-scales-${w}.png` });
    await p.click('[data-run="mi"]'); await p.waitForTimeout(300); await p.click('#crGo'); await p.waitForTimeout(800);
    await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
    await p.click('[data-t="runs"]').catch(() => {}); await p.waitForTimeout(800); await p.click('[data-r]'); await p.waitForTimeout(700);
    await p.screenshot({ path: `p0/cp-report-${w}.png` });
    await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
    await p.click('[data-t="kpi"]'); await p.waitForTimeout(1200); await p.screenshot({ path: `p0/cp-kpi-${w}.png` });
    const kp = await p.$$eval('.cp-k b', x => x.map(y => y.textContent));
    // مساعد المعلم
    await p.evaluate(() => { location.hash = '#/assistant'; }); await p.waitForTimeout(600);
    await p.fill('#asT', 'دورة الماء في الطبيعة'); await p.fill('#asX', TXT); await p.click('#asGo'); await p.waitForTimeout(800);
    const secs = await p.$$eval('.as-sec', x => x.length), qs = await p.$$eval('.as-sec:nth-of-type(5) li, .as-sec li', x => x.length);
    await p.screenshot({ path: `p0/as-${w}.png`, fullPage: false }); await p.click('#aoS'); await p.waitForTimeout(800);
    const decks = await p.evaluate(async () => (await APP.api.list('decks', {})).length);
    // صفحة الطالب
    const s = await b.newPage({ viewport: { width: w, height: h } }); s.on('pageerror', e => errs.push('scale ' + w + ': ' + e.message));
    let sent = null;
    await s.route('**/rest/v1/rpc/scale_get', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ key: 'styles', title: 'أنماط التعلم', school: 'مدارس دينا العالمية', cls: 'الخامس أ', students: [{ id: '00000000-0000-0000-0000-000000000001', n: 'سارة أحمد' }, { id: '00000000-0000-0000-0000-000000000002', n: 'ريم خالد' }] }) }));
    await s.route('**/rest/v1/rpc/scale_submit', r => { sent = JSON.parse(r.request().postData()); r.fulfill({ contentType: 'application/json', body: 'true' }); });
    await s.goto('http://localhost:8766/scale.html?c=ABCDEF'); await s.waitForTimeout(800);
    await s.selectOption('#st', { index: 1 }); await s.click('#go'); await s.waitForTimeout(300);
    const n = await s.$$eval('.it', x => x.length); for (let i = 0; i < n; i++) await s.click(`.ch[data-i="${i}"][data-v="${1 + (i % 5)}"]`);
    await s.screenshot({ path: `p0/scale-q-${w}.png` }); await s.click('#sd'); await s.waitForTimeout(600); await s.screenshot({ path: `p0/scale-res-${w}.png` });
    console.log(w, JSON.stringify({ kpis: kp, secs, qs, decks, items: n, sentScores: sent && sent.p_scores }));
    await s.close(); await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
