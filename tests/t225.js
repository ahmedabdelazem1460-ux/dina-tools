// متانة قراءة ورقة التظليل (omr.js) أمام ظروف المسح والتصوير — node t225.js
// يولّد ورقة بإجابات معروفة ثم يشوّهها (دوران، منظور، ظل، ضوضاء، قلم خفيف، ٩٠°/١٨٠°، صورة جوال بخلفية) ويقيس الدقة
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 1200 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8766/tests/fx/omr-bench.html').catch(() => {}); await p.waitForTimeout(800); if (!(await p.evaluate(() => !!window.bench))) { console.log('errs', errs); process.exit(1); }
  const r = await p.evaluate(async () => window.bench());
  console.log(JSON.stringify(r)); const img = await p.evaluate(() => window.__annot); require('fs').writeFileSync('p0/t225_annot.jpg', Buffer.from(img.split(',')[1], 'base64')); console.log('errs', errs); await b.close();
})();
