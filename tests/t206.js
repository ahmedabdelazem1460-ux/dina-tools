// فواصل الصفحات للتقارير المتصلة (الكشاف العام / إسنادات الفصول): لا تُقسَّم مجموعة المعلم، صفحات A4 لا تفيض، الترحيل والربط اليدوي، ملء الصفحة، PDF
// node t206.js  ← اللقطات في p0/t206-*.png
const { chromium } = require('playwright'); const fs = require('fs'), cp = require('child_process');
(async () => { const b = await chromium.launch(); const errs = []; let ok = true; const chk = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) ok = false; };
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
  await p.evaluate(() => { ['dwp_ttv_pr', 'dwp_ttv_pb', 'dwp_ttv_pbm'].forEach(k => localStorage.removeItem(k)); localStorage.setItem('dwp_ttv_cfg', JSON.stringify({ fs: 190 })); /* خط كبير ليطول الكشاف */ localStorage.setItem('dwp_ttv_st', JSON.stringify({ v: 'index' })); location.hash = '#/ttviews'; });
  await p.waitForTimeout(1500); await p.click('#tvPr'); await p.waitForTimeout(1000);
  await p.selectOption('#pW', 'index'); await p.waitForTimeout(300); await p.selectOption('#pWho', 'teacher'); await p.waitForTimeout(300);
  await p.selectOption('#pPer', '0'); await p.selectOption('#pO', 'port'); await p.waitForTimeout(2500);
  chk(await p.isVisible('#pPB'), 'لوحة «فواصل الصفحات والترحيل» ظاهرة للتقرير المتصل');
  const info = () => p.evaluate(() => { const d = document.querySelector('#pFr').contentDocument, P = [...d.querySelectorAll('.pg')];
    const where = {}; P.forEach((pg, i) => pg.querySelectorAll('tr[data-pbk^="t:"]').forEach(r => { where[r.dataset.pbk] = i; }));
    const splitT = P.reduce((a, pg) => a + pg.querySelectorAll('td.pb-rep').length, 0);
    const over = P.filter(pg => { const x = pg.querySelector('.tvp-b'); return x && x.scrollHeight > x.clientHeight + 1; }).length;
    const firstKeys = P.map(pg => { const r = pg.querySelector('tr[data-pbk]'); return r ? r.dataset.pbk : null; });
    return { n: P.length, paged: P.filter(x => x.classList.contains('paged')).length, marks: d.querySelectorAll('.pb-mark').length, tools: d.querySelectorAll('.pb-tool').length, over, splitT, where, firstKeys, sig: P.map(pg => !!pg.querySelector('.tvp-sig')), num: P.map(pg => (pg.querySelector('.pb-num') || {}).textContent), heads: P.map(pg => !!pg.querySelector('thead')) }; });
  // تكثير المعلمين ليطول الكشاف
  let I = await info(); console.log('  الصفحات:', I.n, 'الأدوات:', I.tools);
  chk(I.n >= 3, 'الكشاف الطويل يتوزع على عدة صفحات');
  chk(I.paged === I.n && I.n >= 1, `كل الصفحات مقسّمة A4 (${I.n})`);
  chk(I.over === 0, 'لا صفحة يفيض محتواها');
  chk(I.splitT === 0, 'الوضع الذكي: لا تُقسَّم مجموعة معلم');
  chk(I.marks === I.n - 1, 'علامات الفواصل بين الصفحات في المعاينة');
  chk(I.heads.every(Boolean), 'رأس الجدول يتكرر في كل صفحة');
  chk(I.sig[I.n - 1] && I.sig.slice(0, -1).every(x => !x), 'التوقيعات في الصفحة الأخيرة فقط');
  chk(I.num.every((t, i) => t && t.includes('من')), 'ترقيم الصفحات: ' + I.num.join(' | '));
  await p.screenshot({ path: 'p0/t206-dialog.png' }); chk(!(await p.isVisible('#pbR')), 'زر الإلغاء مخفي حين لا ترحيل');
  // ترحيل يدوي: آخر معلم في الصفحة الأولى ← يبدأ الصفحة الثانية
  const keys = Object.keys(I.where), k1 = keys.filter(k => I.where[k] === 0).pop();
  if (k1) { await p.frameLocator('#pFr').locator(`[data-pbb="${k1}"]`).click(); await p.waitForTimeout(2500); I = await info();
    chk(I.where[k1] === 1 && I.firstKeys[1] === k1, `⤓ ترحيل «${k1}» ليبدأ الصفحة الثانية`); chk(await p.isVisible('#pbR'), 'زر «إلغاء الترحيل اليدوي» ظاهر'); chk(I.over === 0, 'بعد الترحيل لا فيضان');
    await p.evaluate(() => document.querySelector('.tv-prev').scrollIntoView()); await p.waitForTimeout(300); await p.locator('.tv-prev').screenshot({ path: 'p0/t206-moved.png' });
    await p.click('#pbR'); await p.waitForTimeout(2500); I = await info(); chk(I.where[k1] === 0, 'إلغاء الترحيل يعيده للصفحة الأولى'); }
  // ربط: آخر معلم في الصفحة الأولى بأول معلم في الثانية ← ينتقلان معاً
  if (I.n > 1) { const a = keys.filter(k => I.where[k] === 0).pop(), bb = I.firstKeys[1]; await p.frameLocator('#pFr').locator(`[data-pbl="${a}"]`).click(); await p.waitForTimeout(2500); I = await info();
    chk(I.where[a] === I.where[bb], `🔗 ربط «${a}» بما بعده: في صفحة واحدة (${I.where[a]})`); await p.click('#pbR'); await p.waitForTimeout(2500); }
  // ملء الصفحة: يُسمح بتقسيم المجموعة مع تكرار الاسم «تابع»
  await p.selectOption('#pbM', 'rows'); await p.waitForTimeout(2500); I = await info(); chk(I.over === 0, `وضع ملء الصفحة بلا فيضان (${I.n} صفحة، أسطر مكررة ${I.splitT})`);
  await p.selectOption('#pbM', 'smart'); await p.selectOption('#pbS', 'all'); await p.waitForTimeout(2500); I = await info(); chk(I.sig.every(Boolean), 'التوقيعات في كل صفحة عند اختيارها');
  await p.selectOption('#pbS', 'last'); await p.selectOption('#pbZ', '80'); await p.waitForTimeout(2500); const n80 = (await info()).n; chk(n80 <= I.n, `تصغير المحتوى ٨٠٪ يقلل الصفحات (${I.n} → ${n80})`); await p.selectOption('#pbZ', '100'); await p.waitForTimeout(2000);
  // PDF: عدد صفحاته = عدد صفحات المعاينة
  I = await info(); const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 90000 }), p.click('#pPdf')]); const f = 'p0/t206.pdf'; await dl.saveAs(f);
  const np = +(cp.execSync(`pdfinfo ${f}`).toString().match(/Pages:\s+(\d+)/) || [])[1]; chk(np === I.n, `PDF بعدد الصفحات نفسه (${np} = ${I.n})`);
  cp.execSync(`pdftoppm -r 60 -png ${f} p0/t206-pdf`);
  // إسنادات الفصول المتصلة: بطاقة الفصل لا تنقسم، وعنوان المرحلة لا يبقى وحيداً أسفل الصفحة
  await p.selectOption('#pW', 'assign'); await p.waitForTimeout(300); await p.selectOption('#pPer', '0'); await p.waitForTimeout(2500);
  const A2 = await p.evaluate(() => { const d = document.querySelector('#pFr').contentDocument, P = [...d.querySelectorAll('.pg')]; return { n: P.length, over: P.filter(pg => { const x = pg.querySelector('.tvp-b'); return !pg.classList.contains('pb-big') && x.scrollHeight > x.clientHeight + 1; }).length, orphan: P.filter(pg => { const f = pg.querySelector('.fitw'), l = f && f.lastElementChild; return l && l.matches('h4.tv-gh'); }).length }; });
  console.log('  ', JSON.stringify(A2)); chk(A2.over === 0 && A2.orphan === 0, `إسنادات الفصول: ${A2.n} صفحة بلا فيضان ولا عنوان يتيم`);
  await p.frameLocator('#pFr').locator('.pg').first().screenshot({ path: 'p0/t206-assign.png' }).catch(() => {});
  // الجوال: النافذة بلا تمرير أفقي
  await p.setViewportSize({ width: 375, height: 800 }); await p.waitForTimeout(800); const hs = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1); chk(hs, '375: بلا تمرير أفقي'); await p.screenshot({ path: 'p0/t206-375.png' });
  await p.setViewportSize({ width: 768, height: 1000 }); await p.waitForTimeout(800); await p.screenshot({ path: 'p0/t206-768.png' });
  await p.evaluate(() => localStorage.removeItem('dwp_ttv_cfg'));
  chk(!errs.length, 'بلا أخطاء JS ' + errs.slice(0, 3).join(' | '));
  await b.close(); process.exit(ok ? 0 : 1);
})();
