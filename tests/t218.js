// جودة الجدول ومقارنة النسخ V.ttquality — node t218.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); const R = {};
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  // مسودة بتعارض مقصود
  await p.evaluate(async () => { const v = (await APP.api.ttVersions(APP.S.sectionId))[0]; const sl = await APP.api.ttSlots(v.id); const nv = (await APP.api.ins('timetable_versions', { section_id: APP.S.sectionId, label: 'مسودة اختبار', status: 'draft', created_at: new Date().toISOString() }))[0];
    const rows = sl.map(s => ({ version_id: nv.id, class_id: s.class_id, day: s.day, period: s.period, subject_id: s.subject_id, teacher_id: s.teacher_id }));
    const a = rows.find(r => r.teacher_id), other = rows.find(r => r.teacher_id && r.teacher_id !== a.teacher_id && r.class_id !== a.class_id && r.day === a.day && r.period === a.period && r.subject_id !== a.subject_id); if (other) other.teacher_id = a.teacher_id; rows[3].teacher_id = null;
    await APP.api.ins('timetable_slots', rows); });
  await p.evaluate(() => { APP.LS.set('studio_t', 'ttquality'); location.hash = '#/studio'; }); await p.waitForTimeout(1500);
  R.score = await p.$eval('.tq-g b', x => x.textContent); R.rows = await p.$$eval('.tq-tbl tbody tr', L => L.length); R.teachers = await p.$$eval('.card:last-child tbody tr', L => L.length);
  const opts = await p.$$eval('#tqA option', L => L.map(o => o.value)); await p.selectOption('#tqB', opts[0] === (await p.$eval('#tqA', x => x.value)) ? opts[1] : opts[0]); await p.waitForTimeout(800);
  R.compare = await p.$eval('h3', x => x.textContent);
  await p.selectOption('#tqA', await p.$eval('#tqA', x => [...x.options].find(o => o.textContent.includes('مسودة اختبار')).value)); await p.waitForTimeout(800);
  R.draftScore = await p.$eval('.tq-g b', x => x.textContent); R.hard = await p.$$eval('.tq-hard .bad', L => L.map(x => x.textContent));
  const w = await p.$('[data-w="gaps"]'); await w.fill('0'); await w.dispatchEvent('change'); await p.waitForTimeout(600); R.afterW = await p.$eval('.tq-g b', x => x.textContent);
  await p.click('#tqPr'); await p.waitForTimeout(900); R.print = !!(await p.$('.rs-ov')); await p.click('#rsX');
  for (const v of [375, 768, 1440]) { await p.setViewportSize({ width: v, height: 900 }); await p.waitForTimeout(300); await p.screenshot({ path: `p0/t218_${v}.png`, fullPage: v !== 1440 }); R['ov' + v] = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
  R.errors = errs; console.log(JSON.stringify(R, null, 1)); await b.close(); })();
