const { chromium } = require('playwright');
const Q = { title: 'واجب الكسور العشرية', kind: 'homework', state: 'open', subject: 'الرياضيات', school: 'مدارس دينا العالمية', teacher: 'أ. خالد الشهري', settings: { attempts: 2, show: 'after_submit', time: 15, shuffle: false, labels: 'auto' }, classes: [{ id: 'c1', name: 'رابع ابتدائي أ' }],
  questions: [{ id: 'q1', type: 'mcq', body: 'ناتج ٣ × ٤ يساوي', points: 1, options: ['٧', '١٢', '١٤', '١٦'] }, { id: 'q2', type: 'tf', body: 'الشمس نجم.', points: 1, options: [] }, { id: 'q3', type: 'blank', body: 'عاصمة المملكة هي ......', points: 1, blanks: 1, options: [] }, { id: 'q4', type: 'match', body: 'صل كل دولة بعاصمتها', points: 2, left: ['السعودية', 'مصر'], right: ['القاهرة', 'الرياض'], options: [] }, { id: 'q5', type: 'order', body: 'رتّب المراحل', points: 2, items: ['نبتة', 'بذرة', 'زهرة'], options: [] }] };
(async () => { const b = await chromium.launch(); const errs = [];
  for (const th of ['dina', 'sky', 'green', 'night', 'kids']) for (const W of [375, 1440]) {
    const p = await (await b.newContext({ viewport: { width: W, height: W === 375 ? 760 : 900 } })).newPage(); p.on('pageerror', e => errs.push(th + ': ' + e.message));
    await p.route('**/rpc/quiz_public', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...Q, settings: { ...Q.settings, theme: th } }) }));
    await p.route('**/rpc/quiz_submit', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ score: 5, max: 7, attempt: 1, review: [] }) }));
    await p.goto('http://localhost:8766/student.html?q=abc'); await p.waitForTimeout(900);
    if (W === 375 || th === 'night' || th === 'kids') await p.screenshot({ path: `p0/t172_${th}_${W}_a.png` });
    await p.fill('#nm', 'محمد أحمد العتيبي'); await p.click('#go'); await p.waitForTimeout(600);
    await p.click('.q.slide.cur .opt >> nth=1').catch(() => {}); await p.waitForTimeout(200);
    await p.screenshot({ path: `p0/t172_${th}_${W}_b.png` });
    console.log(th, W, 'overflow', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), 'qt', await p.evaluate(() => document.documentElement.dataset.qt || 'default'));
    await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
