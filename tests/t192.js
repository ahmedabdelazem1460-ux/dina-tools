// بنك الأسئلة: التعديل لواضع السؤال وللمالك فقط، وضع التحرير، التحرير السريع، النسخ، التعديل الجماعي — node t192.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const W of [1440, 768, 375]) { const p = await b.newPage({ viewport: { width: W, height: 900 } }); p.on('pageerror', e => errs.push(W + ' ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
    await p.evaluate(() => { APP.LS.set('as_t', 'bank'); APP.LS.set('qb_edit', '0'); location.hash = '#/assess'; }); await p.waitForTimeout(2200);
    await p.evaluate(async () => { const X = APP._assess, c = X.ctx, me = APP.S.me.id, other = APP.S.staff.find(s => !s.is_owner).id; const base = { school_id: APP.S.school.id, subject_id: c.subj, grade_key: c.grade, level: 'remember', difficulty: 2, points: 1, shared: true, explanation: '', answer: '' };
      await APP.api.ins('questions', [{ ...base, qtype: 'mcq', body: 'ما عاصمة المملكة؟', options: [{ t: 'جدة' }, { t: 'الرياض', ok: true }, { t: 'مكة' }], created_by: me }, { ...base, qtype: 'tf', body: 'الشمس نجم', answer: 'صواب', options: [], created_by: me }, { ...base, qtype: 'mcq', body: 'سؤال الزميل', options: [{ t: 'أ', ok: true }, { t: 'ب' }], created_by: other }]);
      await X.loadCtx(); location.hash = '#/home'; setTimeout(() => location.hash = '#/assess', 200); }); await p.waitForTimeout(2200);
    const X = () => p.evaluate(() => APP._assess.QB.map(q => ({ id: q.id, by: q.created_by, b: q.body, lv: q.level, t: q.qtype, ok: (q.options || []).findIndex(o => o.ok) })));
    let Q = await X(); console.log(W, 'bank:', Q.length, 'owner edit buttons:', await p.$$eval('.qc [data-e]', x => x.length));
    // وضع التحرير
    await p.click('#bEm'); await p.waitForTimeout(300); console.log(W, 'inline selects:', await p.$$eval('.qc [data-qf]', x => x.length));
    const first = Q[0].id; await p.selectOption(`[data-qf="level"][data-qid="${first}"]`, 'higher'); await p.waitForTimeout(500);
    console.log(W, 'level saved:', (await X()).find(q => q.id === first).lv);
    // تحرير سريع لسؤال اختيار من متعدد
    const mc = Q.find(q => q.t === 'mcq'); await p.click(`[data-qx="${mc.id}"]`); await p.waitForTimeout(300);
    await p.fill(`[data-qcard="${mc.id}"] [data-xb]`, 'سؤال معدَّل سريعاً'); await p.click(`[data-qcard="${mc.id}"] [data-xok="2"]`); await p.fill(`[data-qcard="${mc.id}"] [data-xo="2"]`, 'خيار صحيح جديد');
    if (W === 1440) await p.screenshot({ path: 'p0/t192-quick.png' });
    await p.click(`[data-qcard="${mc.id}"] [data-xs]`); await p.waitForTimeout(600);
    const mq = (await X()).find(q => q.id === mc.id); console.log(W, 'quick saved:', mq.b, 'ok idx', mq.ok);
    // نسخ + تعديل جماعي
    const n0 = (await X()).length; await p.click(`[data-cp="${first}"]`); await p.waitForTimeout(800); console.log(W, 'copy +', (await X()).length - n0);
    await p.waitForTimeout(800); await p.check(`[data-pk="${first}"]`); await p.check(`[data-pk="${mc.id}"]`); await p.waitForTimeout(300); console.log(W, 'act:', JSON.stringify(await p.evaluate(() => [document.querySelector('#bAct').innerText.slice(0, 200), [...document.querySelectorAll('[data-pk]')].map(c => c.checked)]))); await p.click('#bBe'); await p.waitForTimeout(300); await p.selectOption('#beD', '3'); await p.fill('#beP', '2');
    if (W === 1440) await p.screenshot({ path: 'p0/t192-bulk.png' });
    await p.click('#beGo'); await p.waitForTimeout(800); console.log(W, 'bulk:', JSON.stringify(await p.evaluate(ids => APP._assess.QB.filter(q => ids.includes(q.id)).map(q => [q.difficulty, q.points]), [first, mc.id])));
    if (W !== 768) await p.screenshot({ path: `p0/t192-${W}.png`, fullPage: false });
    // معلم: يعدّل أسئلته فقط
    const r = await p.evaluate(() => { const t = APP.S.staff.find(s => !s.is_owner); const q = APP._assess.QB[0]; q.created_by = t.id; APP.S.me = t; return { t: t.id, q: q.id }; });
    await p.evaluate(() => { location.hash = '#/home'; setTimeout(() => location.hash = '#/assess', 200); }); await p.waitForTimeout(2200);
    const T = await p.evaluate(() => ({ cards: document.querySelectorAll('.qc').length, edit: document.querySelectorAll('.qc [data-e]').length, del: document.querySelectorAll('.qc [data-d]').length, copyMine: document.querySelectorAll('.qc [data-cp]').length, author: [...document.querySelectorAll('.qc .faint')].length }));
    console.log(W, 'teacher view:', JSON.stringify(T));
    await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
