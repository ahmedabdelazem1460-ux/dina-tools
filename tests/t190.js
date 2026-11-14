// القراءة الذكية لصور الأسئلة (جداول + الإجابة المظللة): node t190.js [صورة]
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
  await p.evaluate(() => { const i = document.createElement('input'); i.type = 'file'; i.id = 'tf'; document.body.appendChild(i); }); await p.setInputFiles('#tf', process.argv[2] || 'fx/hl.png');
  const t0 = Date.now();
  const R = await p.evaluate(async () => { const r = await APP._imageQs(document.querySelector('#tf').files[0]); APP._ocrDone(); return { table: !!r.qs, qs: (r.qs || APP._parseQ(r.lines).qs).map(q => ({ ty: q.qtype, b: q.body, o: (q.options || []).map(o => o.t + (o.ok ? ' ✓' : '')), a: q.answer })), lines: r.lines }; });
  console.log('table:', R.table, 'count:', R.qs.length, 'secs:', Math.round((Date.now() - t0) / 1000));
  R.qs.forEach((q, i) => console.log(`${i + 1}. [${q.ty}] ${q.b}\n    ${q.o.join(' | ')} ${q.a || ''}`));
  if (!R.table) console.log(R.lines.join('\n'));
  if (process.argv[3] === 'exp') { const exp = +process.argv[4]; if (R.qs.length !== exp) { console.log('FAIL count'); process.exit(1); } }
  await b.close(); })();
