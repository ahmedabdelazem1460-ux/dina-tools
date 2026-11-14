// كراسة التدريب PDF من بنك الأسئلة: الأنماط الثلاثة، التقسيم الآلي، المفتاح، التنزيل — node t193.js
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const W of [1440, 768, 375]) { const p = await b.newPage({ viewport: { width: W, height: 900 }, acceptDownloads: true }); p.on('pageerror', e => errs.push(W + ' ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
    await p.evaluate(() => { APP.LS.set('as_t', 'bank'); location.hash = '#/assess'; }); await p.waitForTimeout(2200);
    await p.evaluate(async () => { const X = APP._assess, c = X.ctx, me = APP.S.me.id; const base = { school_id: APP.S.school.id, subject_id: c.subj, grade_key: c.grade, level: 'remember', difficulty: 2, points: 1, shared: true, explanation: '', answer: '', created_by: me };
      const R = []; for (let i = 0; i < 3; i++) R.push(
        { ...base, qtype: 'mcq', body: 'عند تحويل الرقم (11) إلى لفظ في جملة (رأيت 11 كوكباً) نقول:', options: [{ t: 'أحدَ عشرَ', ok: true }, { t: 'إحدى عشرة' }, { t: 'واحد عشر' }, { t: 'أحد عشرة' }], explanation: 'العدد ١١ يوافق المعدود في التذكير.' },
        { ...base, qtype: 'mcq', body: 'القارئ الذي يحاول إصدار أحكام على مصداقية المقروء وحياديته واتساقه والاستفادة منه في حل مشكلات جديدة يمارس مستوى:', options: [{ t: 'القراءة الآلية' }, { t: 'القراءة الحرفية' }, { t: 'القراءة التحليلية' }, { t: 'القراءة النقدية', ok: true }] },
        { ...base, qtype: 'multi', body: 'اختر الأسماء الممنوعة من الصرف:', options: [{ t: 'أحمد', ok: true }, { t: 'محمد' }, { t: 'مساجد', ok: true }, { t: 'كتاب' }], points: 2 },
        { ...base, qtype: 'tf', body: 'تُكتب الألف المتطرفة في (دعا) قائمة لأن أصلها واو.', answer: 'صواب' },
        { ...base, qtype: 'blank', body: 'أركان الإسلام ...... أركان، أولها ...... .', options: [{ t: 'خمسة' }, { t: 'الشهادتان' }], points: 2 },
        { ...base, qtype: 'short', body: 'ما عاصمة المملكة العربية السعودية؟', answer: 'الرياض' },
        { ...base, qtype: 'essay', body: 'علّل: تُحذف ألف (ما) الاستفهامية عند دخول حرف الجر عليها.', answer: 'للتفريق بينها وبين ما الموصولة', points: 3 },
        { ...base, qtype: 'match', body: 'صل كل كلمة بنوعها:', options: [{ t: 'كتب', m: 'فعل' }, { t: 'قلم', m: 'اسم' }, { t: 'في', m: 'حرف' }], points: 3 },
        { ...base, qtype: 'order', body: 'رتّب مراحل نمو النبات:', options: [{ t: 'بذرة' }, { t: 'بادرة' }, { t: 'نبتة' }, { t: 'زهرة' }], points: 2 });
      await APP.api.ins('questions', R); await X.loadCtx(); location.hash = '#/home'; setTimeout(() => location.hash = '#/assess', 200); }); await p.waitForTimeout(2200);
    await p.click('#bBk'); await p.waitForTimeout(2500);
    const info = async () => p.evaluate(() => ({ pages: document.querySelectorAll('.bk-host .bk-pg').length, over: [...document.querySelectorAll('.bk-host .bk-pg:not(.bk-cv) .bk-body')].filter(b => b.scrollHeight > 1123 - 60 - 70 + 4).length, msg: document.querySelector('#bkM').textContent }));
    console.log(W, 'practice:', JSON.stringify(await info()));
    if (W !== 768) await p.screenshot({ path: `p0/t193-${W}.png` });
    if (W === 1440) { await p.evaluate(() => { const h = document.querySelector('.bk-prev'); h.scrollTop = 1000; }); await p.waitForTimeout(200); await p.screenshot({ path: 'p0/t193-page2.png' });
      await p.click('[data-md="review"]'); await p.waitForTimeout(800); console.log(W, 'review:', JSON.stringify(await info())); await p.evaluate(() => { document.querySelector('.bk-prev').scrollTop = 1000; }); await p.waitForTimeout(200); await p.screenshot({ path: 'p0/t193-review.png' });
      await p.click('[data-md="mock"]'); await p.click('[data-th="green"]'); await p.waitForTimeout(800); console.log(W, 'mock:', JSON.stringify(await info()));
      await p.fill('#bkL', 'https://ahmedabdelazem1460-ux.github.io/dina-tools/student.html?c=TEST'); await p.waitForTimeout(800); console.log(W, 'qr on cover:', await p.evaluate(() => !!document.querySelector('.bk-cv .bk-qr svg')));
      await p.evaluate(() => { document.querySelector('.bk-prev').scrollTop = 0; }); await p.screenshot({ path: 'p0/t193-cover.png' }); console.log('cover hit', await p.evaluate(() => { const e = document.elementFromPoint(500, 400); return e.className + ' | ' + (e.parentElement||{}).className; })); console.log('cover dbg', JSON.stringify(await p.evaluate(() => { const c = document.querySelector('.bk-cv'); const r = c.querySelector('.bk-card').getBoundingClientRect(); const q = c.querySelector('.bk-qr svg'); return { card: [r.width, r.height], svg: q ? [q.getBoundingClientRect().width, q.getBoundingClientRect().height, q.outerHTML.slice(0, 160)] : null }; })));
      await p.evaluate(() => { const h = document.querySelector('.bk-prev'); h.scrollTop = h.scrollHeight; }); await p.waitForTimeout(200); await p.screenshot({ path: 'p0/t193-key.png' });
      const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 120000 }), p.click('#bkD')]); const f = 'p0/booklet.pdf'; await dl.saveAs(f); const pdf = fs.readFileSync(f, 'latin1'); console.log(W, 'pdf:', dl.suggestedFilename(), Math.round(fs.statSync(f).size / 1024) + 'KB', 'pages', (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length);
      await p.click('#bkP'); await p.waitForTimeout(1500); console.log(W, 'print frame:', await p.evaluate(() => [...document.querySelectorAll('iframe')].some(f => f.contentDocument && f.contentDocument.querySelector('.bk-pg')))); }
    await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
