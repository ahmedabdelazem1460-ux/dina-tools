const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
  await p.evaluate(() => { const i = document.createElement('input'); i.type = 'file'; i.id = 'tf'; document.body.appendChild(i); }); await p.setInputFiles('#tf', process.argv[2] || 'fx/q.png');
  const L = await p.evaluate(async () => { const l = await APP._imageLines(document.querySelector('#tf').files[0]); APP._ocrDone(); return { l, q: APP._parseQ(l).qs.map(q => q.qtype + ':' + q.body + ' [' + (q.options || []).map(o => o.t + (o.ok ? '*' : '')).join('|') + ']') }; });
  console.log(L.l.join('\n')); console.log('---'); console.log(L.q.join('\n')); await b.close(); })();
