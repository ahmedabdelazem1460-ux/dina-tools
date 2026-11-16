// فواصل الصفحات: معلمون بمواد كثيرة (مجموعات طويلة) — التقسيم بين الأسطر مع تكرار الاسم «تابع» وضبط الامتداد، بلا فيضان، والوضع الذكي لا يقسّم إلا ما لا يتسع في صفحة
// node t206b.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = []; let ok = true; const chk = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) ok = false; };
  const p = await (await b.newContext({ viewport: { width: 1440, height: 1000 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
  const n = await p.evaluate(() => { const E = APP.S.allEntries || APP.S.entries || []; const T = [...new Set(E.map(e => e.teacher_id).filter(Boolean))].slice(0, 3); E.forEach((e, i) => { e.teacher_id = T[i % T.length]; });
    ['dwp_ttv_pr', 'dwp_ttv_pb', 'dwp_ttv_pbm'].forEach(k => localStorage.removeItem(k)); localStorage.setItem('dwp_ttv_cfg', JSON.stringify({ fs: 150 })); localStorage.setItem('dwp_ttv_st', JSON.stringify({ v: 'index', src: 'wk' })); location.hash = '#/ttviews'; return E.length; });
  console.log('  حصص الأسبوع:', n); await p.waitForTimeout(1500); await p.click('#tvPr'); await p.waitForTimeout(800);
  await p.selectOption('#pW', 'index'); await p.waitForTimeout(300); await p.selectOption('#pWho', 'teacher'); await p.selectOption('#pPer', '0'); await p.selectOption('#pO', 'port'); await p.waitForTimeout(3000);
  const info = () => p.evaluate(() => { const d = document.querySelector('#pFr').contentDocument, P = [...d.querySelectorAll('.pg')];
    const bad = []; P.forEach((pg, i) => pg.querySelectorAll('tbody').forEach(tb => { const R = [...tb.rows]; R.forEach((r, j) => [...r.cells].forEach(c => { if (c.rowSpan > R.length - j) bad.push(i + ':' + j + ':' + c.rowSpan); })); }));
    return { n: P.length, over: P.filter(pg => { const x = pg.querySelector('.tvp-b'); return !pg.classList.contains('pb-big') && x.scrollHeight > x.clientHeight + 1; }).length, rep: P.reduce((a, pg) => a + pg.querySelectorAll('td.pb-rep').length, 0), bad, fill: P.map(pg => pg.querySelector('.tvp-b').scrollHeight) }; });
  let I = await info(); console.log('  ذكي:', JSON.stringify(I)); chk(I.over === 0, `الوضع الذكي: ${I.n} صفحة بلا فيضان`); chk(!I.bad.length, 'لا امتداد (rowspan) يتجاوز أسطر الصفحة');
  const nSmart = I.n; await p.selectOption('#pbM', 'rows'); await p.waitForTimeout(3000); I = await info(); console.log('  ملء:', JSON.stringify(I));
  chk(I.over === 0, `ملء الصفحة: ${I.n} صفحة بلا فيضان`); chk(I.rep > 0, `تكرار الاسم «تابع» في الجزء المرحَّل (${I.rep} خلية)`); chk(!I.bad.length, 'امتداد الخلايا مضبوط بعد التقسيم'); chk(I.n <= nSmart, `ملء الصفحة لا يزيد الصفحات (${nSmart} → ${I.n})`);
  await p.evaluate(() => document.querySelector('.tv-prev').scrollIntoView()); await p.waitForTimeout(300); await p.locator('.tv-prev').screenshot({ path: 'p0/t206b-rows.png' });
  await p.evaluate(() => { const d = document.querySelector('#pFr').contentDocument, el = d.querySelector('td.pb-rep'); if (el) el.closest('.pg').scrollIntoView(); }); await p.waitForTimeout(300); await p.locator('.tv-prev').screenshot({ path: 'p0/t206b-rep.png' });
  await p.evaluate(() => localStorage.removeItem('dwp_ttv_cfg'));
  chk(!errs.length, 'بلا أخطاء JS ' + errs.slice(0, 3).join(' | '));
  await b.close(); process.exit(ok ? 0 : 1);
})();
