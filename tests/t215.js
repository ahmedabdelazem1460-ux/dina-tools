// الانتظار: منتظر ١/٢/٣ بالتوزيع العادل، حذف/مسح/إزالة معلم، اعتماد الجدول الأسبوعي، حذف حصة من التأمين واستعادتها، تنبيه «بانتظار اعتمادك»
// + دمج الحسابات المكررة وحذف الطالب بأمان — node t215.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const R = {}; const ok = (k, v) => { R[k] = v; }; const yes = async () => { await p.waitForTimeout(300); const c = await p.$('#cbOk'); if (c) await c.click(); else { const bs = await p.$$('.modal .acts .btn:not(.ghost)'); if (bs.length) await bs[bs.length - 1].click(); } await p.waitForTimeout(900); };
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  await p.evaluate(() => { APP.LS.set('sb_t', 'roster'); APP.LS.set('studio_t', 'standby'); location.hash = '#/studio'; }); await p.waitForTimeout(2200);
  await p.click('#sbGen'); await p.waitForTimeout(1500);
  const cells = async () => p.evaluate(() => { const r = APP.section().standby; return { per: r.per, n: Object.values(r.roster).reduce((n, l) => n + (l || []).slice(0, r.per).filter(Boolean).length, 0) }; });
  const c0 = await cells(); ok('genPer2', c0);
  const lvl1 = await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(APP.section().standby.roster).map(([k, l]) => [k, (l || []).slice(0, 2)]))));
  await p.click('[data-lv="3"]'); await yes(); await p.waitForTimeout(800);
  const c1 = await cells(); ok('per3', c1);
  ok('keptLevels12', await p.evaluate(s => JSON.stringify(Object.fromEntries(Object.entries(APP.section().standby.roster).map(([k, l]) => [k, (l || []).slice(0, 2)]))) === s, lvl1));
  ok('selectsPerCell3', await p.evaluate(() => document.querySelector('.sb-g tbody td').querySelectorAll('.sb-cell').length));
  // حذف خانة ✕
  const x = await p.$('[data-x]'); const xk = await x.getAttribute('data-x'); await x.click(); await p.waitForTimeout(900);
  ok('cellDeleted', await p.evaluate(k => { const [d, pp, kk] = k.split('|'); return !(APP.section().standby.roster[d + '|' + pp] || [])[+kk]; }, xk));
  // إكمال الفراغات
  const fill = await p.$('#sbFill'); ok('fillBtn', !!fill); if (fill) { await fill.click(); await p.waitForTimeout(900); }
  ok('afterFill', await cells());
  // إزالة معلم
  const t = await p.evaluate(() => { const c = {}; Object.values(APP.section().standby.roster).forEach(l => l.forEach(x => { if (x) c[x] = (c[x] || 0) + 1; })); return Object.keys(c)[0]; });
  await p.click('#sbRm'); await p.waitForTimeout(400); await p.selectOption('#rmT', t); await p.click('#rmGo'); await p.waitForTimeout(1000);
  ok('teacherRemoved', await p.evaluate(t => !Object.values(APP.section().standby.roster).some(l => (l || []).slice(0, APP.section().standby.per).includes(t)), t));
  // مسح يوم
  await p.click('[data-cd="0"]'); await yes();
  ok('dayCleared', await p.evaluate(() => [0, 1, 2, 3, 4, 5, 6].every(pp => !(APP.section().standby.roster['0|' + pp] || []).some(Boolean))));
  for (const w of [375, 768, 1440]) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300); await p.screenshot({ path: `p0/t215_roster_${w}.png` }); ok('hs_' + w, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // بانتظار الاعتماد (عدّله غير المالك) ← لافتة + اعتماد
  await p.evaluate(async () => { const s = APP.section(); s.standby.rstat = { s: 'pending', by: APP.S.staff.find(x => !x.is_owner).id, at: new Date().toISOString() }; await APP.api.updateSection(s.id, { standby: s.standby }); APP.LS.set('sb_t', 'roster'); location.hash = '#/home'; }); await p.waitForTimeout(500);
  await p.evaluate(() => { location.hash = '#/studio'; }); await p.waitForTimeout(2000);
  ok('rosterPendBanner', await p.$$eval('.sb-rpend', L => L.length && L[0].innerText.includes('بانتظار اعتمادك')));
  await p.screenshot({ path: 'p0/t215_rpend.png' });
  await p.click('#sbRAp'); await p.waitForTimeout(1000);
  ok('rosterApproved', await p.evaluate(() => APP.section().standby.rstat.s));
  // مسح الجدول
  await p.click('#sbClr'); await yes(); ok('cleared', (await cells()).n);
  // التأمين: حذف حصة واستعادتها
  const day = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); return APP.isoDate(d); });
  await p.evaluate(dd => { APP.LS.set('sb_day', dd); APP.LS.set('sb_t', 'cover'); location.hash = '#/home'; }, day); await p.waitForTimeout(400); await p.evaluate(() => { location.hash = '#/studio'; }); await p.waitForTimeout(2200);
  const abs = await p.evaluate(async () => { const vers = await APP.api.list('timetable_versions', { status: 'approved' }); const cur = vers.find(v => v.section_id === APP.S.sectionId); const sl = await APP.api.list('timetable_slots', { version_id: cur.id }); return sl.find(x => x.day === 0 && x.teacher_id && x.subject_id).teacher_id; });
  await p.check(`[data-ab="${abs}"]`); await p.waitForTimeout(900);
  const n0 = await p.$$eval('[data-sub]', L => L.length);
  await p.click('[data-rx]'); await p.waitForTimeout(800);
  const n1 = await p.$$eval('[data-sub]', L => L.length); ok('skipRow', [n0, n1]);
  ok('restoreLink', await p.$$eval('[data-ru]', L => L.length));
  await p.click('#cvSv'); await p.waitForTimeout(1200);
  ok('skipSaved', await p.evaluate(async d => ((await APP.api.list('standby_days', { day: d }))[0] || {}).skip, day));
  await p.screenshot({ path: 'p0/t215_cover.png', fullPage: true });
  await p.click('[data-ru]'); await p.waitForTimeout(800); ok('restored', await p.$$eval('[data-sub]', L => L.length));
  // يوم آخر بانتظار الاعتماد ← لافتة للمعتمد
  await p.evaluate(async () => { await APP.api.ins('standby_days', [{ school_id: APP.S.school.id, section_id: APP.S.sectionId, day: '2026-12-01', status: 'pending', empty: [], skip: [] }]); }); await p.fill('#cvD', day); await p.dispatchEvent('#cvD', 'change'); await p.waitForTimeout(1200);
  ok('pendDays', await p.$$eval('[data-gd]', L => L.map(x => x.dataset.gd)));
  // الحسابات المكررة: موظف بحسابين ← دمج
  const dup = await p.evaluate(async () => { const t = APP.S.staff.find(x => !x.is_owner && x.active !== false); const r = await APP.api.addStaff({ school_id: APP.S.school.id, full_name: t.full_name.replace(' ', '  '), email: 'dup@x.com', active: false }); await APP.refreshPeople(); return { keep: t.id, dup: r.id, name: t.full_name }; });
  await p.evaluate(() => { APP.LS.set('admtab', 'staff'); location.hash = '#/admin'; }); await p.waitForTimeout(1500);
  await p.click('#dupS'); await p.waitForTimeout(900);
  ok('dupGroups', await p.$$eval('.pm-grp', L => L.length));
  await p.screenshot({ path: 'p0/t215_dups.png' });
  await p.setViewportSize({ width: 375, height: 800 }); await p.waitForTimeout(300); await p.screenshot({ path: 'p0/t215_dups_375.png' }); await p.setViewportSize({ width: 1440, height: 900 });
  await p.click('[data-mg="0"]'); await yes(); await p.waitForTimeout(800);
  ok('merged', await p.evaluate(d => !APP.S.staff.some(x => x.id === d.dup) && APP.S.staff.some(x => x.id === d.keep), dup));
  await p.evaluate(() => document.querySelectorAll('.ovl').forEach(x => x.remove()));
  // دمج أو حذف من نافذة الموظف
  const sid = await p.evaluate(() => APP.S.staff.find(x => !x.is_owner && x.id !== APP.S.me.id).id);
  await p.click(`[data-e="${sid}"]`); await p.waitForTimeout(600); ok('staffRmBtn', !!(await p.$('#srm')));
  await p.click('#srm'); await p.waitForTimeout(800); ok('rmTabs', await p.$$eval('[data-pt]', L => L.length));
  await p.click('[data-pt="del"]'); await p.waitForTimeout(400); await p.screenshot({ path: 'p0/t215_rm.png' });
  await p.evaluate(() => document.querySelectorAll('.ovl').forEach(x => x.remove()));
  // الطالب: حذف نهائي بالتأكيد المكتوب
  await p.evaluate(() => { APP.LS.set('attab', 'students'); }); 
  const stu = await p.evaluate(async () => (await APP.api.list('students', { school_id: APP.S.school.id }))[0]);
  await p.evaluate(s => APP.peopleRemove('student', s, () => { window.__rmDone = 1; }), stu); await p.waitForTimeout(800);
  await p.click('[data-pt="del"]'); await p.waitForTimeout(300); await p.click('#pmDel'); await p.waitForTimeout(500);
  ok('needsTyped', await p.evaluate(id => !!document.querySelector('#pmDel'), stu.id));
  await p.fill('#pmC', 'حذف'); await p.click('#pmDel'); await p.waitForTimeout(1000);
  ok('stuDeleted', await p.evaluate(async id => !(await APP.api.list('students', { id })).length && window.__rmDone === 1, stu.id));
  console.log(JSON.stringify(R, null, 1)); console.log('errors', errs); await b.close(); })();
