// PDF المباشر للبطاقات بأسماء طويلة: لا تداخل نصوص ولا قصّ للجدول (التصغير بـ transform لا zoom) — node t203.js ثم راجع p0/t203-*.png
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const errs = []; let ok = true; const chk = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) ok = false; };
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
  // أسماء رباعية طويلة ومواد إضافية مثل بيانات المدرسة
  await p.evaluate(() => { const L = ['أ. فارس عبدالله سعيد الغامدي', 'أ. سلمان عبدالعزيز محمد الشهيد', 'أ. أحمد حسن محمود عبدالموجود', 'أ. راميه محمد علي الدين', 'أ. محمد عبدالرحمن صالح المالكي']; APP.S.staff.forEach((s, i) => { if (i < 12) s.full_name = L[i % L.length] + (i >= L.length ? ' ' + i : ''); });
    localStorage.removeItem('dwp_ttv_pr'); localStorage.setItem('dwp_ttv_st', JSON.stringify({ v: 'assign' })); location.hash = '#/ttviews'; });
  await p.waitForTimeout(1500); await p.click('#tvPr'); await p.waitForTimeout(1200);
  for (const [per, cp, o, g] of [['4', '2', 'land'], ['6', '1', 'land'], ['2', '1', 'port'], ['4', '1', 'land', 1], ['9', '1', 'land', 1]]) {
    await p.selectOption('#pW', 'assign'); await p.waitForTimeout(300); await p.evaluate(g => { const i = document.querySelector('#pG'); if (i.checked !== !!g) { i.checked = !!g; i.dispatchEvent(new Event('change')); } }, g || 0); await p.selectOption('#pPer', per); await p.selectOption('#pCp', cp); await p.selectOption('#pO', o); await p.waitForTimeout(1500);
    const [d] = await Promise.all([p.waitForEvent('download', { timeout: 90000 }), p.click('#pPdf')]); const f = `p0/t203-${per}-${o}${g ? 'g' : ''}.pdf`; await d.saveAs(f);
    chk(fs.readFileSync(f, 'latin1').startsWith('%PDF'), `PDF ${per} في الورقة ×${cp} ${o}`);
    require('child_process').execSync(`pdftoppm -r 110 -png -f 1 -l 1 ${f} p0/t203-${per}-${o}${g ? 'g' : ''}`); if (g) { const sc = await p.evaluate(() => [...document.querySelector('#pFr').contentDocument.querySelectorAll('.fitw')].map(x => x.dataset.sc).filter(Boolean)); chk(sc.length > 0, 'التصغير مفعّل: ' + sc.slice(0, 3).join(', ')); }
  }
  chk(!errs.length, 'بلا أخطاء JS ' + errs.slice(0, 3).join(' | '));
  await b.close(); process.exit(ok ? 0 : 1);
})();
