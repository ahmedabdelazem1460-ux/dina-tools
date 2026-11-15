// طباعة الإسناد ٣: تلوين الأسطر، الرأس (كامل/مختصر/بدون) للصفحات والبطاقات، اختيار التوقيعات وإضافة «المدير الأكاديمي» — node t202.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = []; let ok = true; const chk = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) ok = false; };
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
  await p.evaluate(() => { localStorage.removeItem('dwp_ttv_pr'); localStorage.setItem('dwp_ttv_st', JSON.stringify({ v: 'assign' })); location.hash = '#/ttviews'; }); await p.waitForTimeout(1500);
  await p.click('#tvPr'); await p.waitForTimeout(1200);
  const F = fn => p.evaluate(fn);
  const doc = () => 'document.querySelector("#pFr").contentDocument';
  chk(await F(() => [...document.querySelectorAll('.tv-sgc span')].some(s => s.textContent.includes('المدير الأكاديمي'))), 'توقيع «المدير الأكاديمي» ضمن الافتراضي');
  // تقرير متصل + متناوب
  await p.selectOption('#pPer', '0'); await p.waitForTimeout(1300);
  const z = await F(() => { const d = document.querySelector('#pFr').contentDocument, r = d.querySelectorAll('.tvg-a tbody tr'); return [getComputedStyle(r[0].children[0]).backgroundColor, getComputedStyle(r[1].children[0]).backgroundColor]; });
  chk(z[0] !== z[1], 'الأسطر متناوبة الألوان ' + z.join(' / ')); await p.locator('.tv-prev').screenshot({ path: 'p0/t202-zebra.png' });
  await p.selectOption('#pZ', 'subj'); await p.waitForTimeout(1300);
  const zs = await F(() => { const d = document.querySelector('#pFr').contentDocument; return new Set([...d.querySelectorAll('.tvg-a tbody tr')].slice(0, 8).map(r => getComputedStyle(r.children[0]).backgroundColor)).size; });
  chk(zs >= 5, 'كل سطر بلون مادته (' + zs + ' ألوان)'); await p.locator('.tv-prev').screenshot({ path: 'p0/t202-subj.png' });
  // رؤوس الصفحات
  for (const h of ['mini', 'none']) { await p.selectOption('#pH', h); await p.waitForTimeout(1300); const r = await F(() => { const d = document.querySelector('#pFr').contentDocument; return { full: !!d.querySelector('.tvp-h'), mini: !!d.querySelector('.tvp-hm'), band: !!d.querySelector('.tvp-band') }; });
    chk(h === 'mini' ? (r.mini && !r.full) : (!r.mini && !r.full && !r.band), 'رأس الصفحة ' + h + ' ' + JSON.stringify(r)); await p.locator('.tv-prev').screenshot({ path: `p0/t202-head-${h}.png` }); }
  // البطاقات بلا رأس وبرأس مختصر
  await p.selectOption('#pZ', 'zebra'); await p.selectOption('#pPer', '6'); await p.waitForTimeout(1300);
  for (const h of ['none', 'mini', 'full']) { await p.selectOption('#pH', h); await p.waitForTimeout(1400);
    const r = await F(() => { const d = document.querySelector('#pFr').contentDocument, t = d.querySelectorAll('.tl'); const bs = [...d.querySelectorAll('.tl .tvp-b')]; return { n: t.length, hn: d.querySelectorAll('.tl-hn').length, hm: d.querySelectorAll('.tl-hm').length, hf: d.querySelectorAll('.tl-h').length, over: bs.filter(b => b.firstElementChild.getBoundingClientRect().height * parseFloat(b.firstElementChild.style.zoom || 1) > b.getBoundingClientRect().height + 3).length }; });
    chk(r.n >= 4 && r.over === 0 && (h === 'none' ? r.hn === r.n : h === 'mini' ? r.hm === r.n : r.hf === r.n), 'بطاقات برأس ' + h + ' ' + JSON.stringify(r)); await p.locator('.tv-prev').screenshot({ path: `p0/t202-tiles-${h}.png` }); }
  // إضافة توقيع وإلغاء آخر
  await p.fill('#pSgT', 'رئيس القسم'); await p.fill('#pSgN', 'أ. خالد'); await p.click('#pSgA'); await p.waitForTimeout(300);
  await p.click('.tv-sgc:has-text("وكيل الشؤون التعليمية")'); await p.waitForTimeout(1400);
  const sg = await F(() => document.querySelector('#pFr').contentDocument.querySelector('.tl-sig').textContent);
  chk(/رئيس القسم/.test(sg) && /المدير الأكاديمي/.test(sg) && !/وكيل/.test(sg), 'التوقيعات المختارة: ' + sg.replace(/\s+/g, ' ').slice(0, 90));
  await p.locator('.tv-prev').screenshot({ path: 'p0/t202-sigs.png' });
  // تبقى الاختيارات بعد إعادة الفتح
  await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove())); await p.click('#tvPr'); await p.waitForTimeout(1200);
  chk(await F(() => document.querySelector('#pH').value === 'full' && [...document.querySelectorAll('.tv-sgc')].some(l => l.textContent.includes('رئيس القسم') && l.querySelector('input').checked)), 'الاختيارات محفوظة عند إعادة الفتح');
  await p.screenshot({ path: 'p0/t202-dialog.png', fullPage: false });
  chk(!errs.length, 'بلا أخطاء JS ' + errs.slice(0, 3).join(' | '));
  await b.close(); process.exit(ok ? 0 : 1);
})();
