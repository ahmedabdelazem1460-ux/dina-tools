// عرض الجداول ٢: الأرقام التفاعلية، أسماء قابلة للضغط، تمييز الحصة الحالية بالأخضر، الفسح، طباعة عدة بطاقات في الورقة ونسخ، PDF وWord — node t201.js
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const errs = []; let ok = true; const chk = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) ok = false; };
  const STUB = () => { const B = APP.bell, n0 = new Date(), n = n0.getHours() * 60 + n0.getMinutes(); const base = n - 20 - 3 * 50;
    const items = cid => { const L = []; for (let i = 0; i < 7; i++) { const f = base + i * 50 + (i > 2 ? 20 : 0) + (i > 4 ? 20 : 0); L.push({ k: 'p', i, from: f, to: f + 45 }); if (i === 2) L.push({ k: 'b', label: 'الفسحة', from: f + 45, to: f + 65 }); if (i === 4) L.push({ k: 'b', label: 'الصلاة', from: f + 45, to: f + 65 }); } return L; };
    B.bellOf = () => ({}); B.activeSched = () => ({ show: 1 }); B.maxP = () => 7; B.fmt = m => { m = ((m % 1440) + 1440) % 1440; return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); };
    B.timeline = (s, np, cid) => ({ items: items(cid) }); B.dayPlan = (sec, iso, cid) => ({ src: 'def', name: 'تجريبي', items: items(cid), sched: {} }); };
  for (const W of [1440, 375]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(W + ' ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
    await p.evaluate(STUB); await p.evaluate(() => { localStorage.removeItem('dwp_ttv_st'); location.hash = '#/ttviews'; }); await p.waitForTimeout(1500);
    const dow = await p.evaluate(() => APP.parseDate(new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10)).getDay());
    // الآن: الأرقام تفتح القوائم
    for (const k of ['in', 'busy', 'free']) { await p.click(`[data-np="${k}"]`); await p.waitForTimeout(400); const n = await p.evaluate(() => document.querySelectorAll('.ovl .tv-lm tbody tr').length); chk(n > 0, `${W} رقم «${k}» يفتح قائمة (${n})`); if (k === 'free' && W === 1440) await p.screenshot({ path: 'p0/t201-free.png' }); await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove())); }
    // الضغط على اسم معلم في القائمة ينقل لجدوله
    await p.click('[data-np="busy"]'); await p.waitForTimeout(300); await p.click('.ovl [data-go^="teacher|"]'); await p.waitForTimeout(800);
    chk(await p.evaluate(() => document.querySelector('.tv-tabs [data-v="teacher"]').classList.contains('on')), W + ' اسم المعلم ينقل لجدوله');
    if (dow < 5) { chk(await p.evaluate(() => document.querySelectorAll('#tvB td.tv-now').length) >= 1, W + ' الحصة الحالية مميزة بالأخضر في جدول المعلم'); }
    // بطاقة الفصل في «الآن» تنقل لجدول الفصل
    await p.click('.tv-tabs [data-v="now"]'); await p.waitForTimeout(500); await p.click('.tv-nc[data-go]'); await p.waitForTimeout(700);
    chk(await p.evaluate(() => document.querySelector('.tv-tabs [data-v="class"]').classList.contains('on')), W + ' بطاقة الفصل تنقل لجدوله');
    chk(await p.evaluate(() => document.querySelectorAll('#tvB thead th.bk').length) === 2, W + ' عمودا الفسحة والصلاة في جدول الفصل');
    if (dow < 5) chk(await p.evaluate(() => document.querySelectorAll('#tvB td.tv-now').length === 1 && document.querySelectorAll('#tvB th.tv-now').length === 1), W + ' خلية الآن ورأس عمودها');
    await p.screenshot({ path: `p0/t201-class-now-${W}.png` });
    // اليوم العام والأسبوع
    await p.click('.tv-tabs [data-v="day"]'); await p.waitForTimeout(500); await p.click(`[data-d="${Math.min(dow, 4)}"]`); await p.waitForTimeout(500);
    if (dow < 5) chk(await p.evaluate(() => document.querySelectorAll('#tvB td.tv-now').length) >= 3, W + ' اليوم العام: الحصة الحالية لكل الفصول');
    chk(await p.evaluate(() => document.querySelectorAll('#tvB td.bk.sm').length) > 3, W + ' اليوم العام: الفسح لكل فصل');
    await p.screenshot({ path: `p0/t201-day-${W}.png` });
    await p.click('.tv-tabs [data-v="master"]'); await p.waitForTimeout(500);
    if (dow < 5) chk(await p.evaluate(() => document.querySelectorAll('#tvB td.tv-now').length) >= 3, W + ' الأسبوع العام: الحصة الحالية');
    if (W === 1440) await p.screenshot({ path: 'p0/t201-master.png' });
    // الأرقام في الإسناد
    await p.click('.tv-tabs [data-v="assign"]'); await p.waitForTimeout(500);
    for (const k of ['cls', 'sub', 'tch', 'per', 'un']) { await p.click(`[data-kp="${k}"]`); await p.waitForTimeout(300); chk(await p.evaluate(() => document.querySelectorAll('.ovl .tv-lm tbody tr').length) > 0, `${W} رقم الإسناد «${k}»`); if (k === 'un' && W === 1440) await p.screenshot({ path: 'p0/t201-un.png' }); await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove())); }
    if (W === 1440) {
      await p.click('.tv-ac h3[data-go]'); await p.waitForTimeout(500); chk(await p.evaluate(() => document.querySelector('.tv-tabs [data-v="class"]').classList.contains('on')), 'عنوان بطاقة الإسناد ينقل لجدول الفصل');
      // الطباعة: عدة بطاقات ونسخ
      await p.click('#tvPr'); await p.waitForTimeout(1200);
      const fr = () => p.evaluate(() => { const d = document.querySelector('#pFr').contentDocument; const bs = [...d.querySelectorAll('.tvp-b')]; return { tl: d.querySelectorAll('.tl').length, over: bs.filter(b => { const t = b.firstElementChild, z = parseFloat(t.style.zoom || 1); return t.getBoundingClientRect().height * z > b.getBoundingClientRect().height + 3; }).length, cnt: document.querySelector('#pCnt').textContent }; });
      for (const [w, who, per, cp, g] of [['assign', '*', '4', '1', 0], ['assign', '*', '6', '2', 0], ['assign', '*', '2', '1', 1], ['index', 'teacher', '4', '1', 0], ['index', 'teacher', '2', '1', 1], ['index', 'subject', '6', '1', 0], ['class', '*', '4', '1', 0], ['teacher', '*', '9', '2', 0]]) {
        await p.selectOption('#pW', w); await p.waitForTimeout(300); await p.selectOption('#pWho', who); await p.waitForTimeout(300); await p.selectOption('#pPer', per); await p.selectOption('#pCp', cp); if (g !== await p.isChecked('#pG') && await p.isVisible('#pG')) await p.click('#pG'); await p.waitForTimeout(1500);
        const r = await fr(); chk(r.tl === Math.min(+per, r.tl) && r.tl > 0 && r.over === 0, `طباعة ${w}/${who} ${per} في الورقة × ${cp} نسخ${g ? ' + الجدول' : ''}: ${r.tl} بطاقة، ${r.cnt}، فيض ${r.over}`);
        await p.locator('.tv-prev').screenshot({ path: `p0/t201-tiles-${w}-${who}-${per}-${cp}${g ? 'g' : ''}.png` }); }
      await p.selectOption('#pW', 'assign'); await p.waitForTimeout(300); await p.selectOption('#pPer', '0'); await p.waitForTimeout(1200); chk((await fr()).tl === 0, 'التقرير المتصل للإسناد ما زال متاحاً');
      await p.selectOption('#pPer', '4'); await p.waitForTimeout(1200); await p.click('#pNx'); await p.waitForTimeout(1200); chk(/صفحة ٢/.test((await fr()).cnt), 'التنقل بين صفحات المعاينة');
      // PDF و Word
      const [d1] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click('#pPdf')]); await d1.saveAs('p0/t201.pdf'); const pdf = fs.readFileSync('p0/t201.pdf', 'latin1'); const np = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length; chk(pdf.startsWith('%PDF') && np >= 1, `PDF فعلي ${Math.round(pdf.length / 1024)}KB بعدد ${np} صفحة`);
      const [d2] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('#pDoc')]); await d2.saveAs('p0/t201.doc'); const doc = fs.readFileSync('p0/t201.doc', 'utf8'); chk(/mso-page-orientation/.test(doc) && /background-color/.test(doc) && /إسناد فصل/.test(doc), `Word منسّق ${Math.round(doc.length / 1024)}KB`);
    }
    await ctx.close();
  }
  chk(!errs.length, 'بلا أخطاء JS ' + errs.slice(0, 3).join(' | '));
  await b.close(); process.exit(ok ? 0 : 1);
})();
