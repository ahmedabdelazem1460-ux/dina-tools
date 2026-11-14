// حسابات أولياء الأمور والتصدير الشامل، وتحويل رمز ولي الأمر من me.html إلى family.html — node t197.js
const { chromium } = require('playwright');
const fs = require('fs'); fs.mkdirSync('p0', { recursive: true });
const U = 'http://localhost:8766/';
(async () => {
  const b = await chromium.launch(); const res = {}; const errs = [];
  // ---------- 1) الإدارة (وضع التجربة) ----------
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); p.on('pageerror', e => errs.push('admin: ' + e.message));
  await p.goto(U + 'index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
  await p.evaluate(() => { location.hash = '#/stucodes'; }); await p.waitForTimeout(1200); await p.click('[data-fa="par"]'); await p.waitForTimeout(800);
  res.tabs = await p.$$eval('[data-fa]', x => x.map(e => e.textContent));
  await p.click('#faGen'); await p.waitForTimeout(1200);
  res.fams = await p.$$eval('#faL tbody tr', x => x.length); res.codes = await p.$$eval('#faL tbody code', x => x.map(e => e.textContent));
  res.codeFmt = res.codes.length > 0 && res.codes.every(c => /^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(c));
  res.wa = await p.$$eval('#faL a[href^="https://wa.me/"]', x => x.length);
  await p.fill('#faQ', res.codes.length ? '' : '');
  const dl1 = p.waitForEvent('download', { timeout: 8000 }).catch(() => null); await p.click('#faX'); const d1 = await dl1; res.xlsxPar = d1 && d1.suggestedFilename();
  for (const [w, h] of [[375, 812], [768, 1024], [1440, 900]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(300); res['hscroll' + w] = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); await p.screenshot({ path: `p0/t197_par_${w}.png` }); }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.click('[data-fa="exp"]'); await p.waitForTimeout(700);
  const dl2 = p.waitForEvent('download', { timeout: 15000 }).catch(() => null); await p.click('#xX'); const d2 = await dl2; res.xlsxAll = d2 && d2.suggestedFilename();
  if (d2) { const f = 'p0/t197_all.xlsx'; await d2.saveAs(f); const XLSX = require('../vendor/xlsx.full.min.js'); const wb = XLSX.read(fs.readFileSync(f), { type: 'buffer' }); res.sheets = wb.SheetNames; res.stuRows = XLSX.utils.sheet_to_json(wb.Sheets['الطلاب'] || {}).length; }
  res.sum = await p.$eval('#xSum', e => e.textContent.trim());
  await p.screenshot({ path: 'p0/t197_exp_1440.png' });
  await p.click('[data-fa="set"]'); await p.waitForTimeout(500);
  await p.check('[data-k="att"]'); await p.check('[data-k="noor"]'); await p.selectOption('#cB', 'positive'); await p.selectOption('#cM', 'teachers'); await p.click('#cS'); await p.waitForTimeout(600);
  res.portalCfg = await p.evaluate(() => APP.S.school.settings.portal);
  // معلم بلا تفعيل وبلا صلاحية: الصفحة القديمة فقط
  res.teacherTabs = await p.evaluate(async () => { APP.S.me = APP.S.staff.find(s => !s.is_owner); APP.S.school.settings.tfeat = {}; const r = document.createElement('div'); await VIEWS.stucodes(r); return r.querySelectorAll('[data-fa]').length; });
  // صاحب صلاحية الحضور مع تفعيل pcodes: يرى التبويبات عدا «ما يراه ولي الأمر»
  res.mgrTabs = await p.evaluate(async () => { const t = APP.S.me; APP.hasModule = k => k === 'attendance'; APP.S.school.settings.tfeat = { pcodes: true }; const r = document.createElement('div'); await VIEWS.stucodes(r); return [...r.querySelectorAll('[data-fa]')].map(e => e.dataset.fa); });
  await p.close();

  // ---------- 2) me.html: رمز ولي الأمر (١٠ خانات) يحوّل لبوابة ولي الأمر ----------
  const q = await b.newPage({ viewport: { width: 375, height: 812 } }); q.on('pageerror', e => errs.push('me: ' + e.message));
  await q.goto(U + 'me.html'); await q.evaluate(() => localStorage.clear()); await q.reload(); await q.waitForTimeout(400);
  await q.fill('#cd', 'abcde12'); res.fmt7 = await q.inputValue('#cd');
  await q.fill('#cd', 'abcdefghjk'); res.fmt10 = await q.inputValue('#cd'); await q.click('#go'); await q.waitForTimeout(800);
  res.redirect = q.url().includes('family.html?a=ABCDE-FGHJK');
  await q.goto(U + 'me.html?p=ZZZZZ-ZZZZZ'); await q.waitForTimeout(800); res.redirectP = q.url().includes('family.html?a=ZZZZZ-ZZZZZ');
  await q.close();

  console.log(JSON.stringify(res, null, 1));
  const ok = res.tabs.length === 4 && res.fams > 0 && res.codeFmt && res.xlsxPar && res.xlsxAll && res.sheets.includes('الطلاب') && res.sheets.includes('أولياء الأمور') && res.stuRows > 0
    && res.portalCfg && res.portalCfg.beh === 'positive' && res.portalCfg.noor === true && res.portalCfg.msg === 'teachers' && res.portalCfg.approve === true && res.teacherTabs === 0 && res.mgrTabs.join() === 'stu,par,exp'
    && res.fmt7 === 'ABCD-E12' && res.fmt10 === 'ABCDE-FGHJK' && res.redirect && res.redirectP && !res.hscroll375;
  console.log(ok ? 'PASS' : 'FAIL'); console.log('ERRS', errs); await b.close(); process.exit(ok ? 0 : 1);
})();
