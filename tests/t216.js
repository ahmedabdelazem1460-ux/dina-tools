// ربط أدوات الجداول + الفصل الثاني (term-bridge.js) — node t216.js
// النقل من النصاب للفصل الثاني (حصص الثانوي تختلف)، مطابقة الفصول والمواد، اقتراح المعلمين من الجدول المعتمد، زر النقل داخل أداة النصاب،
// استيراد معلمي المنصة للأداة الكلاسيكية، مركز الطباعة A4 طولي/عرضي، دليل الفصل الثاني بثلاثة مقاسات
const { chromium } = require('playwright');
const W = [375, 768, 1440];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const R = {}; const ok = (k, v) => { R[k] = v; };
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  // فصل ثانوي للتجربة
  await p.evaluate(async () => { await APP.api.addClass({ section_id: APP.S.sectionId, name: 'أول ثانوي أ', stage: 'الثانوية', grade_word: 'الأول', class_label: 'أول - أ', sort: 9 }); APP.S.classes = await APP.api.list('classes', { section_id: APP.S.sectionId }, { order: 'sort' }); APP.S.classes.forEach(c => { if (c.active === undefined) c.active = true; }); });
  await p.evaluate(() => { APP.LS.set('studio_t', 'nisab'); location.hash = '#/studio'; }); await p.waitForTimeout(2500);
  const fr = p.frames().find(f => f.url().includes('tools/nisab.html'));
  await fr.evaluate(() => saveState()); await p.waitForTimeout(400);
  ok('sendBtnInTool', await fr.evaluate(() => getComputedStyle(document.getElementById('sendToPlatform')).display !== 'none'));
  ok('sendBtnHead', !!(await p.$('#tbSend')));
  // من داخل الأداة: الفصل الثاني
  await fr.selectOption('#semester', 'ثاني'); await fr.click('#sendToPlatform'); await p.waitForTimeout(1200);
  ok('modalOpen', !!(await p.$('.tb-terms')));
  ok('term2Selected', await p.$eval('[data-term="2"]', x => x.getAttribute('aria-checked')));
  const secId = await p.evaluate(() => APP.S.classes.find(c => c.name === 'أول ثانوي أ').id);
  ok('secMapped', await p.$eval(`[data-gc="${secId}"]`, x => x.value));
  ok('classSel', await p.$$eval('[data-gc]', L => L.map(x => x.value)));
  await p.click('#tbT [data-s="s"]'); await p.waitForTimeout(300);
  ok('subRows', await p.$$eval('[data-sm]', L => L.length)); ok('matched', await p.$$eval('[data-sm]', L => L.filter(x => x.value !== '__new').length));
  await p.screenshot({ path: 'p0/t216_subs.png' });
  await p.click('#tbT [data-s="v"]'); await p.waitForTimeout(1200);
  ok('previewTeachers', await p.$$eval('.tb-tn:not(.faint)', L => L.length));
  await p.screenshot({ path: 'p0/t216_preview.png' });
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250); await p.screenshot({ path: `p0/t216_modal_${w}.png` }); }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.click('#tbGo'); await p.waitForTimeout(2500);
  const plan = await p.evaluate(async id => { const r = (await APP.api.list('section_plans', { section_id: APP.S.sectionId }))[0]; const P = r.data; const st = JSON.parse(localStorage.getItem('dina_nisab_state_v2')); const phys = st.secondarySubjects.find(s => s.name === 'الفيزياء'); const bio = st.secondarySubjects.find(s => s.name === 'الأحياء'); const sid = n => (APP.S.subjects.find(s => s.name === n) || {}).id;
    return { term: P.term, secHours: Object.entries(P.hours[id] || {}).map(([s, h]) => [APP.subjName(s), h]), physT2: phys.hours[1], bioT2: bio.hours[1], hasPhys: !!(P.hours[id] || {})[sid('الفيزياء')], hasBio: !!(P.hours[id] || {})[sid('الأحياء')], teachers: Object.values(P.teachers || {}).reduce((a, m) => a + Object.keys(m).length, 0), groups: P.groups.map(g => g.name).slice(0, 6) }; }, secId);
  ok('plan', plan);
  ok('onPlanTeachers', await p.evaluate(() => (document.querySelector('#plTabs .on') || {}).dataset && document.querySelector('#plTabs .on').dataset.t));
  ok('planBtns', await p.$$eval('#tbNs,#tbSg,#tbPr', L => L.length));
  await p.screenshot({ path: 'p0/t216_plan.png' });
  // اقتراح المعلمين: نفرّغ إسناد فصل ثم نقترح
  await p.evaluate(async () => { const P = APP._planState(); const c = APP.S.classes.find(x => x.name === 'رابع ابتدائي أ').id; P.teachers[c] = {}; await APP._planSave(); });
  await p.click('#plTabs [data-t="hours"]'); await p.waitForTimeout(400); await p.click('#plTabs [data-t="teachers"]'); await p.waitForTimeout(600);
  ok('emptyNotice', !!(await p.$('#tbSg2')));
  await p.click('#tbSg'); await p.waitForTimeout(1500);
  ok('sugRows', await p.$$eval('[data-st]', L => L.length)); ok('whyKinds', await p.$$eval('.tb-why', L => [...new Set(L.map(x => x.textContent))]));
  await p.selectOption('#sgMax', '20'); await p.waitForTimeout(800);
  ok('loadBars', await p.$$eval('.tb-lr', L => L.length));
  ok('sameClassSug', await p.$$eval('.tb-why.tb-w1', L => L.length));
  await p.check('#sgRep'); await p.waitForTimeout(800); await p.uncheck('#sgRep'); await p.waitForTimeout(800);
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250); await p.screenshot({ path: `p0/t216_sug_${w}.png` }); }
  await p.setViewportSize({ width: 1440, height: 900 });
  const changes = await p.evaluate(() => document.getElementById('sgSum').textContent); ok('sugSum', changes);
  await p.click('#sgOk').catch(() => { }); await p.waitForTimeout(1200); ok('teachersAfter', await p.evaluate(() => Object.keys(APP._planState().teachers[APP.S.classes.find(x => x.name === 'رابع ابتدائي أ').id] || {}).length)); ok('toastAfterSg', await p.$$eval('#toasts *', L => L.map(x => x.textContent).slice(-2))); if (await p.$('.ovl')) { await p.click('.ovl .x'); await p.waitForTimeout(300); }
  // الطباعة
  await p.click('#tbPr'); await p.waitForTimeout(500);
  await p.click('[data-land="p"]'); await p.screenshot({ path: 'p0/t216_print_dlg.png' });
  await p.click('#ppGo'); await p.waitForTimeout(2200);
  ok('printStudio', !!(await p.$('.rs-ov')));
  const pf = p.frames().find(f => f !== p.mainFrame() && !f.url().includes('tools/'));
  ok('printPortrait', await p.evaluate(() => { const f = document.querySelector('.rs-ov iframe'); return f && /size:A4 portrait/.test(f.srcdoc); }));
  ok('printHasMatrix', await p.evaluate(() => { const f = document.querySelector('.rs-ov iframe'); return f && f.srcdoc.includes('توزيع الحصص والمعلمين') && f.srcdoc.includes('كشف المعلمين وأحمالهم'); }));
  await p.screenshot({ path: 'p0/t216_print.png' });
  await p.click('#rsX'); await p.waitForTimeout(300);
  // التوليد ثم طباعة الجدول المولَّد عرضياً
  await p.evaluate(() => { APP._planTab('gen'); }); await p.click('#plTabs [data-t="gen"]'); await p.waitForTimeout(500); await p.click('#gGo'); await p.waitForTimeout(6000);
  await p.click('#tbPr'); await p.waitForTimeout(400); ok('genOpts', await p.$$eval('[data-o="gc"],[data-o="gt"]', L => L.length));
  await p.check('[data-o="gt"]'); await p.click('[data-land="l"]'); await p.click('#ppGo'); await p.waitForTimeout(2200);
  ok('printLand', await p.evaluate(() => { const f = document.querySelector('.rs-ov iframe'); return f && /size:A4 landscape/.test(f.srcdoc) && f.srcdoc.includes('الجدول المولَّد — المعلمون'); }));
  await p.screenshot({ path: 'p0/t216_print_land.png' }); await p.click('#rsX');
  // دليل الفصل الثاني
  await p.evaluate(() => { APP.LS.set('studio_t', 'term2'); }); await p.click('.st-steps [data-t="term2"]'); await p.waitForTimeout(1800);
  ok('t2Steps', await p.$$eval('.tb-s', L => L.map(x => x.className.replace('tb-s ', ''))));
  ok('t2Secs', await p.$$eval('#t2All tbody tr', L => L.length));
  await p.click('[data-act="snap"]'); await p.waitForTimeout(1200);
  ok('snapSaved', await p.evaluate(async () => (await APP.api.list('tool_snapshots', { tool: 'plan' })).map(s => s.name)));
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300); await p.screenshot({ path: `p0/t216_t2_${w}.png`, fullPage: true }); ok('hscroll_' + w, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // الأداة الكلاسيكية: استيراد المعلمين
  await p.click('.st-steps [data-t="builder"]'); await p.waitForTimeout(2500);
  const bf = p.frames().find(f => f.url().includes('tools/timetable.html'));
  await bf.evaluate(() => { saveState(); }).catch(() => { });
  ok('hasImportBtn', !!(await p.$('#tbBI')));
  await p.click('#tbBI'); await p.waitForTimeout(600); await p.screenshot({ path: 'p0/t216_bimport.png' });
  await p.click('#bGo'); await p.waitForTimeout(2000);
  ok('builderTeachers', await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('dina_timetable_state_v1')); const names = APP.S.staff.map(s => s.full_name); return { n: st.teachers.length, real: st.teachers.filter(t => names.includes(t.name)).length, asg: Object.keys(st.workAssignments || {}).length }; }));
  // المعلم: لا شيء من هذا
  await p.evaluate(() => { const t = APP.S.staff.find(s => !s.is_owner); APP.S.realMe = APP.S.me; APP.S.me = { ...t, is_owner: false }; location.hash = '#/home'; APP.route && APP.route(); location.hash = '#/studio'; }); await p.waitForTimeout(1500);
  ok('teacherNoStudio', await p.evaluate(() => !document.querySelector('.st-steps')));
  ok('errs', errs);
  console.log(JSON.stringify(R, null, 1)); await b.close(); })();
