// محرك القيود الموحّد DinaTT في «التوزيع والقيود والتوليد» — node t224.js
// قوة القيود والملفات، قيود المواد/المعلمين/الفصول/القاعات/المتوازية/العامة، التوليد بالتقدم، الملخص والمخالفات،
// البدائل وأثر النقل والتراجع، التوليد الجزئي، التحسين، التقارير الخمسة وطباعتها، بثلاثة مقاسات
const { chromium } = require('playwright');
const W = [375, 768, 1440];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const R = {}; const ok = (k, v) => { R[k] = v; };
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  await p.evaluate(() => { location.hash = '#/plan'; }); await p.waitForTimeout(1500);
  ok('engine', await p.evaluate(() => !!window.DinaTT && DinaTT.VERSION));
  // بذر توزيع: كل فصل بمواد تملأ الأسبوع ومعلم لكل مادة يتشارك فصلين
  const seed = await p.evaluate(async () => { const A = APP, P = A._planState(), sec = A.section(), cap = sec.days * sec.periods; const cls = A.S.classes.filter(c => c.active);
    const subs = A.S.subjects.slice(0, 8).map(s => s.id), staff = A.S.staff.filter(s => s.active !== false).map(s => s.id);
    P.groups = [{ id: 'g1', name: 'المواد', subs }]; P.hours = {}; P.teachers = {};
    const base = [6, 5, 4, 4, 3, 3, 2, 2]; let tot = base.reduce((a, b) => a + b, 0); while (tot > cap) { base[0]--; tot--; }
    cls.forEach((c, i) => { P.hours[c.id] = {}; P.teachers[c.id] = {}; subs.forEach((s, j) => { P.hours[c.id][s] = base[j]; P.teachers[c.id][s] = staff[(j * 3 + Math.floor(i / 2)) % staff.length]; }); });
    P.subj = { [subs[2]]: { doubles: 1, room: 'lab1' }, [subs[0]]: { core: true }, [subs[6]]: { time: 'avoidFirst' } };
    P.rooms = [{ id: 'lab1', name: 'معمل العلوم', cap: 1 }];
    if (cls.length >= 2) P.joint = [{ id: 'j1', sid: subs[7], classes: [cls[0].id, cls[1].id], n: 1 }];
    P.blocks = { [staff[0]]: ['0-0', '0-1'] }; P.tlim = { [staff[0]]: { maxDay: 4, quota: 20 }, [staff[1]]: { first: 'avoid', quota: 18 } };
    await A._planSave(); return { cls: cls.length, subs: subs.length, cap, tot, staff: staff.length };
  });
  ok('seed', seed);
  // القيود ← قوة القيود
  await p.evaluate(() => { APP.LS.set('pl_rs', 'power'); }); await p.click('#plTabs [data-t="rules"]'); await p.waitForTimeout(600);
  ok('powerRows', await p.$$eval('.pl-pw tbody tr', L => L.length)); ok('lvSelects', await p.$$eval('[data-lv]', L => L.length));
  await p.selectOption('[data-lv="tGaps"]', 's'); await p.fill('[data-w="core"]', '9').catch(() => {}); await p.$eval('[data-w="core"]', x => { x.value = 9; x.dispatchEvent(new Event('input')); });
  ok('ruleSaved', await p.evaluate(() => APP._planState().rules));
  await p.selectOption('#pwP', 'student'); await p.click('#pwA'); await p.waitForTimeout(300);
  ok('presetApplied', await p.evaluate(() => APP._planState().rules.sMax));
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250); await p.screenshot({ path: `p0/t224_power_${w}.png`, fullPage: false }); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // تبويبات القيود الأخرى تُفتح بلا أخطاء
  for (const t of ['subj', 'teach', 'cls', 'rooms', 'joint', 'gen']) { await p.click(`#rsT [data-v="${t}"]`); await p.waitForTimeout(350); }
  await p.click('#rsT [data-v="teach"]'); await p.waitForTimeout(300);
  await p.selectOption('#rCs', '3'); await p.click('[data-tb="1-2"]'); await p.waitForTimeout(200); await p.click('[data-tb="1-2"]'); await p.waitForTimeout(200);
  ok('triState', await p.evaluate(() => { const P = APP._planState(), t = document.querySelector('#rT').value; return { x: (P.blocks[t] || []).includes('1-2'), p: (P.tlim[t].pref || []).includes('1-2'), c: P.tlim[t].maxConsec }; }));
  await p.screenshot({ path: 'p0/t224_teach.png' });
  await p.click('#rsT [data-v="joint"]'); await p.waitForTimeout(300); await p.click('#jM [data-v="par"]'); await p.waitForTimeout(300); await p.screenshot({ path: 'p0/t224_par.png' });
  await p.click('#rsT [data-v="subj"]'); await p.waitForTimeout(300); await p.screenshot({ path: 'p0/t224_subj.png' });
  // التوليد
  await p.click('#plTabs [data-t="gen"]'); await p.waitForTimeout(500);
  await p.selectOption('#gQ', 'q');
  await p.click('#gGo'); await p.waitForTimeout(400); ok('progress', !!(await p.$('.tt-prog')));
  await p.waitForSelector('.tt-sum', { timeout: 20000 });
  const rep = await p.evaluate(() => { const g = APP._lastGen(); return { score: g.report.score, hard: g.report.hard, soft: g.report.soft, complete: g.report.idx.complete, issues: g.issues.length }; });
  ok('report', rep); ok('summaryMsg', await p.$eval('.tt-sum .notice', x => x.textContent.trim().slice(0, 60)));
  ok('jointSame', await p.evaluate(() => { const g = APP._lastGen(), j = APP._planState().joint[0]; if (!j) return 'n/a'; const a = g.cls.findIndex(c => c.id === j.classes[0]), b = g.cls.findIndex(c => c.id === j.classes[1]); const pa = g.grid[a].map((s, k) => s === j.sid ? k : -1).filter(k => k >= 0), pb = g.grid[b].map((s, k) => s === j.sid ? k : -1).filter(k => k >= 0); return pa.some(k => pb.includes(k)); }));
  ok('noTeacherClash', await p.evaluate(() => (APP._lastGen().report.byRule.tClash || {}).n));
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250); await p.screenshot({ path: `p0/t224_gen_${w}.png`, fullPage: true }); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // البدائل والنقل والتراجع
  const k0 = await p.evaluate(() => { const g = APP._lastGen(), gi = g.cls.findIndex(c => c.id === document.querySelector('#gC').value); for (let k = 0; k < g.N; k++) if (g.grid[gi][k] && !g.fixed[gi][k] && g.cards[g.cid[gi][k]].len === 1 && !g.cards[g.cid[gi][k]].j) return k; return -1; });
  await p.click(`.pl-gc[data-k="${k0}"]`); await p.waitForTimeout(600);
  ok('altColors', await p.$$eval('.pl-gc[class*="alt-"]', L => L.length)); ok('altBtns', await p.$$eval('[data-go]', L => L.length));
  await p.screenshot({ path: 'p0/t224_alts.png' });
  const before = await p.evaluate(() => APP._lastGen().grid.map(r => r.join()).join('|'));
  await p.click('[data-go]'); await p.waitForTimeout(600);
  ok('impact', await p.$eval('.tt-imp', x => x.textContent.trim().slice(0, 80)).catch(() => null));
  ok('logged', await p.evaluate(() => (APP._planState().log[0] || {}).what));
  await p.screenshot({ path: 'p0/t224_impact.png' });
  await p.click('#gUndo'); await p.waitForTimeout(500);
  ok('undoRestores', await p.evaluate(b => APP._lastGen().grid.map(r => r.join()).join('|') === b, before));
  // التوليد الجزئي
  const keepRows = await p.evaluate(() => { const g = APP._lastGen(); return g.cls.slice(1).map((c, i) => g.grid[i + 1].join()); });
  await p.click('#gPart'); await p.waitForTimeout(400); await p.check('.modal .perm-grid input >> nth=0'); await p.click('#ppGo');
  await p.waitForSelector('.tt-sum', { timeout: 20000 }); await p.waitForTimeout(300);
  ok('partialKeepsOthers', await p.evaluate(k => { const g = APP._lastGen(); return g.cls.slice(1).every((c, i) => g.grid[i + 1].join() === k[i]); }, keepRows));
  await p.click('#gImp'); await p.waitForSelector('.tt-sum', { timeout: 20000 }); await p.waitForTimeout(300);
  ok('improveHard', await p.evaluate(() => APP._lastGen().report.hard));
  // التقارير
  await p.click('#plTabs [data-t="rep"]'); await p.waitForTimeout(500);
  const repTabs = {};
  for (const t of ['sum', 'teach', 'cls', 'adm', 'log']) { await p.click(`#rpT [data-v="${t}"]`); await p.waitForTimeout(350); repTabs[t] = await p.$$eval('.pl-rp, .tt-kp2', L => L.length); await p.screenshot({ path: `p0/t224_rep_${t}.png`, fullPage: true }); }
  ok('repTabs', repTabs);
  await p.click('#rpT [data-v="teach"]'); await p.waitForTimeout(300);
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250); await p.screenshot({ path: `p0/t224_rep_${w}.png` }); }
  await p.setViewportSize({ width: 1440, height: 900 });
  ok('hScroll', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2));
  await p.click('#rpP'); await p.waitForTimeout(1800); ok('printStudio', !!(await p.$('.rs-ov')));
  await p.screenshot({ path: 'p0/t224_print.png' });
  ok('errors', errs);
  console.log(JSON.stringify(R, null, 1)); await b.close();
})();
