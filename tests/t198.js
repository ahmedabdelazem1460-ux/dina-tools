// بوابة ولي الأمر family.html (ردود محاكاة) + صفحة «أولياء الأمور» V.pmsg في وضع التجربة — node t198.js
const { chromium } = require('playwright');
const fs = require('fs'); fs.mkdirSync('p0', { recursive: true });
const U = 'http://localhost:8766/';
const today = new Date().toISOString().slice(0, 10), dAgo = n => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
const KIDS = [{ id: 'k1', name: 'إياد علي حوفان', class: 'ثاني ثانوي أ' }, { id: 'k2', name: 'عمار علي حوفان', class: 'أول متوسط أ' }];
const Q = [{ id: 'q1', qtype: 'mcq', body: 'عاصمة المملكة العربية السعودية؟', options: [{ t: 'جدة' }, { t: 'الرياض', ok: true }, { t: 'مكة' }], explanation: 'الرياض هي العاصمة', points: 1 },
  { id: 'q2', qtype: 'tf', body: 'الماء يغلي عند ١٠٠ درجة مئوية', answer: 'صواب', points: 1 },
  { id: 'q3', qtype: 'short', body: 'ناتج ٢ + ٢ = ؟', answer: '4|٤|أربعة', points: 1 },
  { id: 'q4', qtype: 'order', body: 'رتّب الأعداد تصاعدياً', options: [{ t: '١' }, { t: '٢' }, { t: '٣' }], points: 1 }];
const child = id => ({ student: { id, name: KIDS.find(k => k.id === id).name, class: KIDS.find(k => k.id === id).class }, school: 'مدارس دينا العالمية', section: 'قسم البنين', week: { id: 'w1', word: 'الحادي عشر' }, weeks: [{ id: 'w1', word: 'الحادي عشر' }, { id: 'w0', word: 'العاشر' }],
  plan: [{ day: 0, period: 1, subject: 'الرياضيات', topic: 'المعادلات الخطية', homework: 'تمارين ص ٤٥' }, { day: 1, period: 2, subject: 'العلوم', topic: 'الخلية', homework: '' }],
  quizzes: [{ title: 'اختبار قصير ٣', kind: 'quiz', code: 'Q1', subject: 'العلوم', done: 0 }, { title: 'واجب ٢', kind: 'homework', code: 'Q2', subject: 'الرياضيات', done: 1 }],
  results: [{ title: 'واجب ١', kind: 'homework', score: 8, max: 10, at: dAgo(3) + 'T10:00:00Z' }, { title: 'اختبار ٢', kind: 'quiz', score: 18, max: 20, at: dAgo(10) + 'T10:00:00Z' }], resources: [{ title: 'ملخص الوحدة', url: 'https://example.com', kind: 'review', subject: 'العلوم' }],
  att: { since: dAgo(120), present: 50, days: id === 'k1' ? [{ day: dAgo(2), st: 'absent' }, { day: dAgo(5), st: 'late', min: 15 }] : [], periods: id === 'k1' ? [{ day: dAgo(2), period: 2, st: 'absent', subject: 'الكيمياء' }] : [] },
  excuses: [{ id: 'e1', from: dAgo(20), to: dAgo(20), kind: 'medical', note: 'مراجعة', status: 'accepted', reply: 'سلامته', file: 'r.jpg', at: dAgo(19) }],
  reports: [{ id: 'r1', kind: 'report', title: 'تقرير الأداء الشهري', at: dAgo(1), seen: false, by: 'أ. فارس' }],
  paper: [{ title: 'اختبار الفترة', date: dAgo(15), subject: 'الرياضيات', score: 17, max: 20 }],
  practice: [{ id: 'p1', kind: 'practice', title: 'مراجعة الوحدة الأولى', subject: 'الاجتماعيات', n: 4 }, { id: 'p2', kind: 'review', title: 'مراجعة بالحلول', subject: 'العلوم', n: 4 }] });
(async () => {
  const b = await chromium.launch(); const res = {}; const errs = [];
  // ---------- 1) family.html ----------
  const p = await b.newPage({ viewport: { width: 375, height: 812 } }); p.on('pageerror', e => errs.push('fam: ' + e.message));
  const calls = {}; let sent = [];
  await p.route('**/rest/v1/rpc/*', async r => { const fn = r.request().url().split('/').pop(), a = JSON.parse(r.request().postData() || '{}'); calls[fn] = (calls[fn] || 0) + 1;
    let out = {};
    if (fn === 'fam_activate') out = a.p_code === 'ABCDE-FGHJK' && a.p_pass.length >= 6 ? { token: 'T1' } : { error: 'BAD_CODE' };
    else if (fn === 'fam_login') out = a.p_pass === 'secret123' ? { token: 'T1' } : { error: 'BAD_LOGIN' };
    else if (a.p_token && a.p_token !== 'T1') out = { error: 'AUTH' };
    else if (fn === 'fam_home') out = { school: 'مدارس دينا العالمية', parent: 'علي', phone: '0546455542', unread: 2, cfg: { att: true, res: true, beh: 'none', msg: 'all', excuse: true, reports: true, auto: true, noor: false, paper: true, practice: true, sharedQ: false, approve: true }, kids: KIDS };
    else if (fn === 'fam_child') out = child(a.p_student);
    else if (fn === 'fam_report') out = { title: 'تقرير الأداء الشهري', kind: 'report', html: '<p>ممتاز</p><script>parent.__pwn=1</script>', at: dAgo(1) };
    else if (fn === 'fam_practice') out = { title: 'مراجعة الوحدة الأولى', kind: a.p_id === 'p2' ? 'review' : 'practice', subject: 'الاجتماعيات', settings: {}, questions: Q };
    else if (fn === 'fam_excuse') { sent.push(a); out = { id: 'e2' }; }
    else if (fn === 'fam_contacts') out = { mode: 'all', list: [{ id: 's1', name: 'أ. فارس الغامدي', role: 'teacher', subjects: 'التاريخ', unread: 1 }, { id: 's2', name: 'أ. أحمد عبد العظيم', role: 'admin', unread: 0 }] };
    else if (fn === 'fam_thread') out = { staff: { id: a.p_staff, name: 'أ. فارس الغامدي' }, msgs: [{ id: 'm1', me: false, body: 'مرحباً، ابنكم متميز', at: dAgo(1) + 'T09:00:00Z' }].concat(sent.filter(x => x.p_body).map((x, i) => ({ id: 'x' + i, me: true, body: x.p_body, at: new Date().toISOString(), read: false }))) };
    else if (fn === 'fam_send') { sent.push(a); out = { ok: true }; }
    else if (fn === 'fam_logout') out = null;
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) }); });
  await p.goto(U + 'family.html?a=abcde-fghjk'); await p.evaluate(() => localStorage.clear()); await p.goto(U + 'family.html?a=ABCDE-FGHJK'); await p.waitForTimeout(400);
  res.actPrefill = await p.inputValue('#cd');
  await p.screenshot({ path: 'p0/t198_login_375.png' });
  await p.fill('#ph', '0546455542'); await p.fill('#pw', '12'); await p.fill('#pw2', '12'); await p.click('#go'); await p.waitForTimeout(200); res.weak = await p.textContent('#er');
  await p.fill('#pw', 'secret123'); await p.fill('#pw2', 'secret124'); await p.click('#go'); await p.waitForTimeout(200); res.mismatch = await p.textContent('#er');
  await p.fill('#pw2', 'secret123'); await p.fill('#nm', 'علي'); await p.click('#go'); await p.waitForTimeout(900);
  res.urlClean = !p.url().includes('?a='); res.h1 = await p.textContent('#vw h1'); res.kids = await p.$$eval('[data-kid]', x => x.length);
  res.kpis = await p.$$eval('#vw .kpi', x => x.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  for (const [w, h] of [[375, 812], [768, 1024], [1440, 900]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250); res['hs' + w] = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); await p.screenshot({ path: `p0/t198_home_${w}.png`, fullPage: true }); }
  await p.setViewportSize({ width: 375, height: 812 });
  // الحضور + عذر بمرفق
  await p.click('.bnav [data-go="att"]'); await p.waitForTimeout(300);
  res.attBtns = await p.$$eval('#vw [data-ex]', x => x.length);
  await p.click('#vw [data-ex]:not([data-ex=""])'); await p.waitForTimeout(200);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFklEQVR42mNk+M9Qz0AEYBxVSF+FAP5FDvcfRYWgAAAAAElFTkSuQmCC', 'base64');
  await p.click('[data-k="family"]'); await p.fill('#xn', 'ظرف عائلي'); await p.setInputFiles('#xa', { name: 'taqrir.png', mimeType: 'image/png', buffer: png });
  await p.screenshot({ path: 'p0/t198_excuse_375.png' });
  await p.click('#xs'); await p.waitForTimeout(900);
  const ex = sent.find(x => x.p_kind); res.excuse = ex && { kind: ex.p_kind, type: ex.p_ftype, b64: (ex.p_fb64 || '').length > 20, from: ex.p_from, note: ex.p_note };
  await p.screenshot({ path: 'p0/t198_att_375.png', fullPage: true });
  // التقارير: iframe معزول + تقرير دوري
  await p.click('.bnav [data-go="rep"]'); await p.waitForTimeout(300);
  await p.click('[data-rep="r1"]'); await p.waitForTimeout(500);
  res.repFrame = await p.$eval('.mod iframe', f => ({ sandbox: f.getAttribute('sandbox'), txt: f.contentDocument && f.contentDocument.body.innerText.includes('ممتاز') }));
  res.pwn = await p.evaluate(() => window.__pwn || 0);
  await p.click('.mod .x-close'); await p.click('[data-auto="month"]'); await p.waitForTimeout(500);
  res.autoRep = await p.$eval('.mod iframe', f => f.contentDocument.body.innerText.includes('التقرير الشهري') && f.contentDocument.body.innerText.includes('واجب ١'));
  await p.click('.mod .x-close');
  // التدريب
  await p.click('.bnav [data-go="prac"]'); await p.waitForTimeout(300);
  await p.click('[data-pk="p1"][data-mode="play"]'); await p.waitForTimeout(400);
  await p.click('.q [data-a="1"]'); await p.click('#ck'); res.fb1 = await p.textContent('.fb');
  await p.click('#nx'); await p.click('.q [data-tf="خطأ"]'); await p.click('#ck'); res.fb2 = await p.textContent('.fb');
  await p.click('#nx'); await p.fill('#qs', '٤'); await p.click('#ck'); res.fb3 = await p.textContent('.fb');
  await p.click('#nx'); await p.click('#ck'); res.fb4 = (await p.textContent('.fb')).slice(0, 40);
  await p.screenshot({ path: 'p0/t198_prac_375.png' });
  await p.click('#nx'); await p.waitForTimeout(200); res.score = (await p.textContent('#pl h2')).trim();
  await p.click('#cl');
  await p.click('[data-pk="p2"][data-mode="print"]'); await p.waitForTimeout(400); res.review = await p.$eval('.mod iframe', f => f.contentDocument.body.innerText.includes('الإجابة: الرياض')); await p.click('.mod .x-close');
  // التواصل
  await p.click('.bnav [data-go="msg"]'); await p.waitForTimeout(400);
  res.contacts = await p.$$eval('[data-c]', x => x.length);
  await p.click('[data-c="s1"]'); await p.waitForTimeout(400);
  await p.fill('#tx', 'شكراً لكم، سؤال عن الواجب'); await p.click('#sd'); await p.waitForTimeout(500);
  res.bubbles = await p.$$eval('.bub', x => x.map(e => e.className.includes('me')));
  res.sendArgs = sent.filter(x => x.p_body).map(x => [x.p_staff, x.p_student]);
  for (const [w, h] of [[375, 812], [1440, 900]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250); res['ms' + w] = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); await p.screenshot({ path: `p0/t198_msg_${w}.png` }); }
  // الخطة والأبناء
  await p.click('nav.side [data-go="plan"]'); await p.waitForTimeout(200); await p.click('[data-kid="k2"]'); await p.waitForTimeout(500);
  res.kid2 = await p.evaluate(() => localStorage.getItem('dina_fam_kid')); res.planDays = await p.$$eval('#vw .day', x => x.length);
  await p.click('#ho'); await p.waitForTimeout(300); res.out = await p.evaluate(() => [localStorage.getItem('dina_fam_t'), !!document.getElementById('ph')]);
  await p.click('[data-m="login"]').catch(() => { }); await p.fill('#ph', '0546455542'); await p.fill('#pw', 'nope'); await p.click('#go'); await p.waitForTimeout(300); res.badLogin = await p.textContent('#er');
  await p.close();

  // ---------- 2) المنصة: V.pmsg (وضع التجربة) ----------
  const q = await b.newPage({ viewport: { width: 1440, height: 900 } }); q.on('pageerror', e => errs.push('pmsg: ' + e.message));
  await q.goto(U + 'index.html?demo=1'); await q.click('[data-demo="a.abdelazim@dinaschool.com"]'); await q.waitForTimeout(2000);
  await q.evaluate(() => { location.hash = '#/pmsg'; }); await q.waitForTimeout(800);
  res.pTabs = await q.$$eval('[data-ft]', x => x.map(e => e.dataset.ft));
  await q.click('#fsNew'); await q.waitForTimeout(500); await q.fill('#nmT', 'السلام عليكم، نود إبلاغكم بتميز ابنكم'); await q.click('#nmGo'); await q.waitForTimeout(800);
  res.thread = await q.$$eval('.fs-b', x => x.length); res.inbox = await q.$$eval('[data-acc]', x => x.length);
  await q.screenshot({ path: 'p0/t198_pmsg_1440.png' });
  await q.click('[data-ft="reps"]'); await q.waitForTimeout(800);
  await q.fill('#rT', 'تقرير تجريبي'); await q.fill('#rB', 'ولي أمر الطالب {الاسم}، ابنكم متميز.');
  await q.click('#rGo'); await q.waitForTimeout(400); await q.click('.ovl .btn:has-text("إرسال")').catch(() => { }); await q.waitForTimeout(800);
  res.reps = await q.evaluate(() => APP.__famDemo.reps.length); res.repHtml = await q.evaluate(() => (APP.__famDemo.reps[0] || {}).html || '');
  await q.click('[data-ft="exc"]'); await q.waitForTimeout(300);
  await q.evaluate(() => { APP.__famDemo.exc.push({ id: 'e9', student: 'طالب تجريبي', class: 'رابع أ', parent: 'ولي', from: '2026-11-10', to: '2026-11-11', kind: 'medical', note: 'حرارة', file: 'r.png', ftype: 'image/png', status: 'pending', absent: 2, at: new Date().toISOString() }); });
  await q.click('[data-ft="exc"]'); await q.waitForTimeout(500);
  await q.click('[data-ef="e9"]'); await q.waitForTimeout(400); res.excImg = await q.$$eval('.ovl img', x => x.length); await q.click('.ovl .x');
  await q.fill('[data-er="e9"]', 'سلامته'); await q.click('[data-ea="e9"]'); await q.waitForTimeout(500); res.excSt = await q.evaluate(() => APP.__famDemo.exc[0].status);
  await q.click('[data-ft="prac"]'); await q.waitForTimeout(900); res.pracUI = await q.$$eval('#pK option', x => x.length);
  for (const [w, h] of [[375, 812], [768, 1024]]) { await q.setViewportSize({ width: w, height: h }); await q.waitForTimeout(250); res['pm' + w] = await q.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); await q.screenshot({ path: `p0/t198_prac_staff_${w}.png` }); }
  // معلم بلا تفعيل: لا يرى الصفحة
  res.teacherNav = await q.evaluate(() => { APP.S.me = APP.S.staff.find(s => !s.is_owner); APP.S.school.settings = APP.S.school.settings || {}; APP.S.school.settings.tfeat = {}; const n = APP.NAV.find(x => x[0] === 'pmsg'); return n[2](); });
  res.teacherNavOn = await q.evaluate(() => { APP.S.school.settings.tfeat = { pmsg: true }; return APP.NAV.find(x => x[0] === 'pmsg')[2](); });
  await q.close();

  console.log(JSON.stringify(res, null, 1));
  const ok = res.actPrefill === 'ABCDE-FGHJK' && /٦/.test(res.weak) && /متطابقتين/.test(res.mismatch) && res.urlClean && /إياد/.test(res.h1) && res.kids === 2 && !res.hs375 && !res.hs768
    && res.excuse && res.excuse.kind === 'family' && res.excuse.type === 'image/jpeg' && res.excuse.b64 && /ظرف/.test(res.excuse.note)
    && res.repFrame.sandbox === 'allow-same-origin allow-modals' && res.repFrame.txt && !res.pwn && res.autoRep
    && /صحيحة/.test(res.fb1) && /الصحيحة/.test(res.fb2) && /صحيحة/.test(res.fb3) && /٢ من ٤/.test(res.score) && res.review
    && res.contacts === 2 && res.bubbles.length === 2 && res.bubbles[1] === true && res.sendArgs[0][0] === 's1' && res.sendArgs[0][1] === 'k1' && !res.ms375
    && res.kid2 === 'k2' && res.planDays === 2 && res.out[0] === null && res.out[1] && /غير صحيحة/.test(res.badLogin)
    && res.pTabs.join() === 'msgs,reps,prac,exc' && res.thread === 1 && res.inbox === 1 && res.reps > 0 && /متميز/.test(res.repHtml) && /الحضور منذ/.test(res.repHtml)
    && res.excImg === 1 && res.excSt === 'accepted' && res.pracUI === 4 && !res.pm375 && res.teacherNav === false && res.teacherNavOn === true;
  console.log(ok ? 'PASS' : 'FAIL'); console.log('ERRS', errs); await b.close(); process.exit(ok ? 0 : 1);
})();
