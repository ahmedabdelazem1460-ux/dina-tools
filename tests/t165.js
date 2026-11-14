const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  await p.evaluate(() => { APP.LS.set('atttab', 'students'); APP.LS.set('stbr', '{}'); location.hash = '#/attendance'; }); await p.waitForTimeout(2500);
  const info = async l => console.log(l, '|', (await p.$$eval('.sb-row', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim()).join(' / '))).slice(0, 260), '| rows', await p.$$eval('#sbL tbody tr', a => a.length), '| crumb', (await p.textContent('.sb-crumb')).replace(/\s+/g, ' ').trim().slice(0, 70));
  await info('initial');
  console.log('kpis', (await p.$$eval('.kpi[data-k]', a => a.map(x => x.querySelector('.k').textContent + '=' + x.querySelector('.v').textContent).join(' | '))));
  console.log('chart', await p.$$eval('.sb-bar', a => a.map(x => x.textContent.replace(/\s+/g, ' ').trim()).join(' | ')));
  await p.screenshot({ path: 'p0/t165_init.png', fullPage: true });
  if (await p.$('.sb-bar')) { await p.click('.sb-bar >> nth=0'); await p.waitForTimeout(400); await info('after bar click'); }
  const st = await p.$$('[data-f="stage"]'); if (st[1]) { await st[1].click(); await p.waitForTimeout(400); await info('stage chosen'); }
  const cl = await p.$$('[data-f="cls"]'); if (cl[1]) { await cl[1].click(); await p.waitForTimeout(400); await info('class chosen'); }
  await p.click('[data-vw="groups"]'); await p.waitForTimeout(400); console.log('groups', await p.$$eval('.sb-grp', a => a.length));
  await p.click('#sbR'); await p.waitForTimeout(400); await p.click('[data-vw="groups"]').catch(() => { }); await p.waitForTimeout(300); console.log('groups all', await p.$$eval('.sb-grp', a => a.length));
  await p.screenshot({ path: 'p0/t165_groups.png' });
  await p.click('[data-k="nid"]'); await p.waitForTimeout(400); console.log('missing nid filter rows', await p.$$eval('#sbL tbody tr', a => a.length), await p.$eval('[data-k="nid"] .v', e => e.textContent));
  await p.click('[data-k="nid"]'); await p.waitForTimeout(300);
  await p.click('[data-k="cls"]'); await p.waitForTimeout(500); console.log('cls drill', await p.evaluate(() => { const o = [...document.querySelectorAll('.ovl')].pop(); return o ? o.querySelector('h3').textContent + ' rows=' + o.querySelectorAll('tbody tr').length : 'none'; }));
  await p.evaluate(() => document.querySelectorAll('.ovl .x').forEach(x => x.click())); await p.waitForTimeout(300);
  await p.fill('#sbQ', 'الحربي'); await p.waitForTimeout(800); console.log('search rows', await p.$$eval('#sbL tbody tr', a => a.length), '| focus kept', await p.evaluate(() => document.activeElement && document.activeElement.id));
  await p.fill('#sbQ', ''); await p.waitForTimeout(700);
  await p.click('[data-vw="table"]'); await p.waitForTimeout(300); await p.click('[data-ed]'); await p.waitForTimeout(500); console.log('edit modal', await p.evaluate(() => !!document.querySelector('#ego'))); await p.evaluate(() => document.querySelectorAll('.ovl .x').forEach(x => x.click()));
  await p.waitForTimeout(300); await p.click('#sbP'); await p.waitForSelector('.rs-ov'); await p.waitForTimeout(1500); console.log('print sections', await p.$$eval('.rs-sec span', a => a.length)); await p.click('#rsX');
  for (const W of [375, 768]) { await p.setViewportSize({ width: W, height: 820 }); await p.waitForTimeout(500); console.log(W, 'overflow', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)); }
  await p.screenshot({ path: 'p0/t165_375.png', fullPage: true });
  console.log('ERRS', errs); await b.close(); })();
