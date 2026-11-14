const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })).newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  await p.evaluate(() => { APP.LS.set('as_t', 'bank'); location.hash = '#/assess'; }); await p.waitForTimeout(2000);
  const qb0 = await p.evaluate(() => APP._assess.QB.length); console.log('bank before', qb0);
  const imp = async (file, label) => { await p.click('#bImp'); await p.waitForTimeout(500); await p.setInputFiles('#iqF', file);
    await p.waitForFunction(() => { const r = document.querySelector('#iqR'); return r && /المجموع|لم تُستخرج|:/.test(r.textContent) && !/جارٍ|قراءة النص|تحميل|تجهيز/.test(r.textContent); }, null, { timeout: 120000 });
    console.log(label, '|', (await p.textContent('#iqR')).trim().slice(0, 160));
    const info = await p.$$eval('.iq-q', a => a.map(x => (x.querySelector('[data-ty]') || {}).value + (x.classList.contains('need') ? '!' + ((x.querySelector('.iq-pr') || {}).textContent || '') : '')).join(', ')); console.log('   types:', info); };
  await imp('fx/filled.xlsx', 'EXCEL');
  console.log('   new-lesson opt:', await p.$eval('#iqMk', e => e.parentElement.textContent.trim()).catch(() => 'none'));
  await p.screenshot({ path: 'p0/t170_import.png' });
  await p.click('#iqBank'); await p.waitForTimeout(1500);
  const qb1 = await p.evaluate(() => APP._assess.QB.map(q => ({ t: q.qtype, o: (q.options || []).length, a: q.answer, l: !!q.lesson_id, lv: q.level, d: q.difficulty, ok: (q.options || []).filter(o => o.ok).length, ex: !!q.explanation, src: q.source })));
  console.log('bank after excel', qb1.length - qb0, JSON.stringify(qb1.slice(-9)));
  console.log('lessons', await p.evaluate(() => APP._assess.CUR.length));
  await imp('../assets/tpl/questions-template.docx', 'WORD'); await p.click('.ovl .x, .ovl [aria-label="إغلاق"]').catch(() => p.keyboard.press('Escape')); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
  await imp('fx/text.pdf', 'PDF-text'); await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
  await imp('fx/q.png', 'IMAGE-OCR'); console.log('   bodies:', await p.$$eval('.iq-q [data-bd]', a => a.map(x => x.value).join(' || '))); await p.screenshot({ path: 'p0/t170_ocr.png' }); await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
  await imp('fx/scan.pdf', 'PDF-scanned'); await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
  // bank select → homework with theme
  await p.evaluate(() => { location.hash = '#/home'; }); await p.waitForTimeout(300); await p.evaluate(() => { location.hash = '#/assess'; }); await p.waitForTimeout(1800);
  const cks = await p.$$('[data-pk]'); for (const c of cks.slice(0, 4)) await c.check(); await p.waitForTimeout(200);
  console.log('act bar:', (await p.textContent('#bAct')).replace(/\s+/g, ' ').trim());
  await p.screenshot({ path: 'p0/t170_bank.png' });
  await p.click('#bAct [data-mk="homework"]'); await p.waitForTimeout(600); await p.fill('#zt', 'واجب تجريبي'); console.log('themes:', await p.$$eval('[name=zth]', a => a.map(x => x.value + (x.checked ? '*' : '')).join(',')));
  await p.check('[name=zth][value=night]', { force: true }); await p.evaluate(() => document.querySelector('.th-pick').scrollIntoView({ block: 'center' })); await p.screenshot({ path: 'p0/t170_editor.png' });
  await p.click('#zp'); await p.waitForTimeout(1500);
  console.log('quiz saved:', JSON.stringify(await p.evaluate(async () => { const z = (await APP.api.list('quizzes', { school_id: APP.S.school.id })).find(x => x.title === 'واجب تجريبي'); return z && { kind: z.kind, n: z.question_ids.length, theme: z.settings.theme, status: z.status }; })));
  await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
  // export
  const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => { APP.LS.set('as_t', 'bank'); location.hash = '#/home'; setTimeout(() => { location.hash = '#/assess'; setTimeout(() => document.querySelector('#bXl').click(), 1500); }, 300); })]); await dl.saveAs('fx/export.xlsx'); console.log('export:', dl.suggestedFilename());
  // school bank
  await p.evaluate(() => { location.hash = '#/qbank'; }); await p.waitForTimeout(2000);
  console.log('QBANK kpis:', (await p.textContent('.qb-kp')).replace(/\s+/g, ' ').trim()); console.log('nav has qbank:', await p.evaluate(() => !!document.querySelector('a[href="#/qbank"]')));
  await p.screenshot({ path: 'p0/t170_qbank.png' });
  await p.click('[data-sh] >> nth=0'); await p.waitForTimeout(600); console.log('after hide, private kpi:', await p.$eval('[data-kf="share|n"] b', e => e.textContent));
  await p.click('[data-t="work"]'); await p.waitForTimeout(400); console.log('work rows:', await p.$$eval('#qbB tbody tr', a => a.length), (await p.textContent('#qbB tbody tr')).replace(/\s+/g, ' ').slice(0, 120));
  await p.click('[data-t="ctl"]'); await p.waitForTimeout(400); await p.click('#ctM [data-v="granted"]'); await p.waitForTimeout(300); await p.screenshot({ path: 'p0/t170_ctl.png', fullPage: true });
  const tid = await p.evaluate(() => APP.S.staff.find(s => !s.is_owner && s.active && APP.S.entries.some(e => e.teacher_id === s.id)).id);
  await p.click('#ctSave'); await p.waitForTimeout(800); console.log('saved ehw:', JSON.stringify(await p.evaluate(() => APP.S.school.settings.ehw)));
  // teacher gating
  const gate = async label => console.log(label, JSON.stringify(await p.evaluate(id => { const me = APP.S.me; APP.S.me = APP.S.staff.find(s => s.id === id); const r = { full: APP.canAssessFull(), hw: APP.canHw(), ehw: APP.canEhw(), only: APP.ehwOnly(), nav: APP.navOK(APP.NAV.find(n => n[0] === 'assess')), bank: APP.navOK(APP.NAV.find(n => n[0] === 'qbank')) }; APP.S.me = me; return r; }, tid)));
  await p.evaluate(() => { APP.S.school.settings.features = { assess: 'granted' }; }); await gate('teacher, granted-not-listed:');
  await p.evaluate(id => { APP.S.school.settings.ehw.staff = [id]; }, tid); await gate('teacher, granted-listed:');
  await p.evaluate(() => { APP.S.school.settings.ehw.mode = 'all'; }); await gate('teacher, mode all:');
  await p.evaluate(() => { APP.S.school.settings.ehw.mode = 'off'; APP.S.school.settings.features = { assess: 'all' }; }); await gate('teacher, hw off + assess all:');
  // reduced page as teacher
  await p.evaluate(id => { APP.S.school.settings.ehw.mode = 'all'; APP.S.school.settings.features = { assess: 'granted' }; APP.S.me = APP.S.staff.find(s => s.id === id); APP.LS.set('as_t', 'quizzes'); location.hash = '#/home'; setTimeout(() => location.hash = '#/assess', 300); }, tid); await p.waitForTimeout(2500);
  console.log('teacher page:', await p.$eval('.card h2', e => e.textContent), '| tabs:', await p.$$eval('.tabs button', a => a.map(x => x.textContent).join(' / ')), '| zNew visible:', await p.$eval('#zNew', e => e.offsetParent !== null).catch(() => 'n/a'), '| zHw:', !!(await p.$('#zHw')));
  await p.screenshot({ path: 'p0/t170_teacher.png' });
  for (const W of [375, 768]) { await p.setViewportSize({ width: W, height: 820 }); await p.evaluate(() => { APP.LS.set('as_t', 'bank'); location.hash = '#/home'; setTimeout(() => location.hash = '#/assess', 200); }); await p.waitForTimeout(1800); console.log(W, 'assess overflow', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)); await p.screenshot({ path: `p0/t170_bank_${W}.png` }); }
  console.log('ERRS', errs); await b.close(); })();
