// المنتج متعدد المدارس: الهوية DinaBrand، تجهيز المدرسة V.setup، المدارس والاشتراكات V.schools — node t219.js
const { chromium } = require('playwright');
const W = [375, 768, 1440];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); const R = {};
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.evaluate(() => localStorage.removeItem('dina_brand')); await p.reload();
  await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2500);
  R.dinaDefault = await p.evaluate(() => ({ isDina: DinaBrand.isDina(), deputy: DinaBrand.sig('deputy'), hdr: document.querySelector('.ttl') ? document.querySelector('.ttl').textContent.slice(0, 30) : '' }));
  // الهوية
  await p.evaluate(() => { APP.LS.set('su_t', 'id'); location.hash = '#/setup'; }); await p.waitForTimeout(1200);
  R.steps = await p.$$eval('.su-steps button', L => L.length);
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250); await p.screenshot({ path: `p0/t219_id_${w}.png`, fullPage: w === 375 }); R['ovId' + w] = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.fill('#bN', 'مدارس النخبة الأهلية'); await p.fill('#bS', 'النخبة'); await p.fill('#bA', 'منصة النخبة التعليمية');
  await p.click('[data-pre="2"]'); await p.fill('#sgprincipal', 'أ. خالد العمري'); await p.dispatchEvent('#sgprincipal', 'input');
  R.preview = await p.$eval('#bPv .bar b', x => x.textContent);
  await p.click('#bSv'); await p.waitForTimeout(1200);
  R.after = await p.evaluate(() => ({ isDina: DinaBrand.isDina(), navy: getComputedStyle(document.documentElement).getPropertyValue('--navy').trim(), principal: DinaBrand.sig('principal'), deputy: DinaBrand.sig('deputy'), hdr: (document.querySelector('.ttl') || {}).textContent, stored: !!localStorage.getItem('dina_brand') }));
  await p.screenshot({ path: 'p0/t219_branded_1440.png' });
  // نص «دينا» في عنصر جديد وفي إطار طباعة
  R.dynamic = await p.evaluate(async () => { const d = document.createElement('div'); d.textContent = 'تقرير بهوية دينا — مدارس دينا العالمية'; document.body.appendChild(d); await new Promise(r => setTimeout(r, 150)); const t = d.textContent; d.remove(); return t; });
  R.keepDynamic = await p.evaluate(async () => { const d = document.createElement('div'); d.textContent = 'التقييم الديناميكي'; document.body.appendChild(d); await new Promise(r => setTimeout(r, 120)); const t = d.textContent; d.remove(); return t; });
  await p.evaluate(() => APP.printDoc('اختبار', 'فرعي', '<p id="pp">منصة دينا للتخطيط الدراسي — مدارس دينا العالمية</p><img src="assets/logo.svg" alt="مدارس دينا العالمية">')); await p.waitForTimeout(1500);
  R.printFrame = await p.evaluate(() => { const f = document.querySelector('.rs-ov iframe'); const d = f && f.contentDocument; return d ? (d.body.innerText.match(/(منصة|مدارس)[^\n]{0,25}/g) || []).slice(0, 4) : null; });
  await p.screenshot({ path: 'p0/t219_print.png' }); await p.click('#rsX');
  // الأقسام
  await p.evaluate(() => { APP.LS.set('su_t', 'sec'); location.hash = '#/home'; setTimeout(() => location.hash = '#/setup', 50); }); await p.waitForTimeout(1200);
  const n0 = await p.evaluate(() => APP.S.sections.length); await p.fill('#nN', 'فرع الشمال'); await p.click('#sSv'); await p.waitForTimeout(800);
  R.sections = [n0, await p.evaluate(() => APP.S.sections.length)];
  // الفصول
  await p.evaluate(() => { APP.LS.set('su_t', 'cls'); APP.LS.set('su_sec', APP.S.sectionId); location.hash = '#/home'; setTimeout(() => location.hash = '#/setup', 50); }); await p.waitForTimeout(1200);
  await p.fill('[data-q="1-3"]', '3'); await p.press('[data-q="1-3"]', 'Tab'); await p.waitForTimeout(300);
  R.clsPreview = await p.$$eval('.su-st', L => ({ newN: L.filter(x => x.classList.contains('new')).length, old: L.filter(x => x.classList.contains('old')).map(x => x.textContent).slice(0, 3) }));
  await p.click('#cGo'); await p.waitForTimeout(1200); R.clsAfter = await p.$eval('#cGo', x => x.disabled);
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250); await p.screenshot({ path: `p0/t219_cls_${w}.png`, fullPage: w === 375 }); R['ovCls' + w] = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // المعلمون
  await p.click('[data-s="tch"]'); await p.waitForTimeout(800);
  await p.fill('#tP', 'الاسم\tالبريد\tالجوال\tالتخصص\nأ. نوال عبدالله الحربي\tn.harbi@example.com\t0555000111\tالرياضيات\nأ. هند محمد\tbad-mail\t\tالعلوم\nأ. محمد السبيعي\tm.subaie@dinaschool.com\t\tالرياضيات'); await p.dispatchEvent('#tP', 'change'); await p.waitForTimeout(500);
  R.tch = await p.$$eval('#suB tbody .su-st', L => L.map(x => x.textContent)); await p.click('#tGo'); await p.waitForTimeout(1200);
  R.tchAdded = await p.evaluate(async () => (await APP.api.list('staff', {})).some(s => s.email === 'n.harbi@example.com'));
  // الطلاب
  await p.click('[data-s="stu"]'); await p.waitForTimeout(800);
  await p.fill('#uP', 'اسم الطالب\tرقم الطالب\tالهوية\tالفصل\tجوال ولي الأمر\nريم سعد القحطاني\t441122\t1100223344\tرابع ابتدائي أ\t0501112222\nلين فهد\t441123\t\tفصل غير موجود\t\nجود ماجد الزهراني\t441124\t\tرابع ابتدائي ب\t0503334444'); await p.dispatchEvent('#uP', 'change'); await p.waitForTimeout(800);
  R.stu = await p.$$eval('#suB tbody .su-st', L => L.map(x => x.textContent)); await p.click('#uGo'); await p.waitForTimeout(1200);
  R.stuAdded = await p.evaluate(async () => (await APP.api.list('students', {})).filter(s => ['441122', '441124'].includes(s.student_no)).length);
  await p.screenshot({ path: 'p0/t219_stu_1440.png', fullPage: true });
  // الانطلاق
  await p.click('[data-s="go"]'); await p.waitForTimeout(1200); R.goKpis = await p.$$eval('.su-kp b', L => L.map(x => x.textContent));
  await p.screenshot({ path: 'p0/t219_go_1440.png', fullPage: true });
  // المدارس والاشتراكات
  R.navSchools = await p.evaluate(() => APP.NAV.find(n => n[0] === 'schools')[2]());
  await p.evaluate(() => { APP.LS.set('pc_t', 'sc'); location.hash = '#/schools'; }); await p.waitForTimeout(1500); R.schoolCards = await p.$$eval('.sc-card', L => L.length);
  await p.click('#scNew'); await p.waitForTimeout(300); await p.fill('#nN', 'مدارس الأفق'); await p.fill('#nS', 'الأفق'); await p.fill('#oN', 'سعد عبدالرحمن العتيبي'); await p.fill('#oE', 'saad@ofuq.example'); await p.click('#nGo'); await p.waitForTimeout(1000);
  R.provLink = await p.$eval('.modal input[readonly]', x => x.value).catch(() => null);
  await p.screenshot({ path: 'p0/t219_prov.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(600); R.schoolCards2 = await p.$$eval('.sc-card', L => L.length);
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250); await p.screenshot({ path: `p0/t219_schools_${w}.png`, fullPage: w === 375 }); R['ovSc' + w] = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
  // المعلم لا يرى الصفحتين
  R.teacherHidden = await p.evaluate(() => { const me = APP.S.me; APP.S.me = Object.assign({}, me, { is_owner: false }); const a = APP.NAV.find(n => n[0] === 'setup')[2](), c = APP.NAV.find(n => n[0] === 'schools')[2](); APP.S.me = me; return !a && !c; });
  // الصفحات العامة تأخذ الهوية المحفوظة على الجهاز
  const q = await ctx.newPage(); q.on('pageerror', e => errs.push('lijan: ' + e.message));
  await q.route('**/rest/v1/rpc/lijan_public', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ title: 'اختبارات', school: 'مدارس النخبة الأهلية', rooms: [], sched: [], map: {}, total: 0, lookup: 'none' }) }));
  await q.goto('http://localhost:8766/lijan.html?t=abcdefghijklmnop1234'); await q.waitForTimeout(800);
  R.pubBrand = await q.evaluate(() => ({ title: document.title, alt: document.querySelector('.top img').alt, navy: getComputedStyle(document.documentElement).getPropertyValue('--navy').trim() }));
  // إعادة دينا: حذف الهوية المحفوظة
  await p.evaluate(() => { localStorage.removeItem('dina_brand'); }); const r2 = await ctx.newPage(); await r2.goto('http://localhost:8766/index.html?demo=1'); await r2.waitForTimeout(800);
  R.backToDina = await r2.evaluate(() => DinaBrand.isDina());
  R.errors = errs; console.log(JSON.stringify(R, null, 1)); await b.close();
})();
