const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const w of [1440, 768, 375]) {
    const p = await (await b.newContext({ viewport: { width: w, height: 900 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo] >> nth=2'); await p.waitForTimeout(1200); await p.evaluate(() => location.hash = '#/my'); await p.waitForTimeout(900);
    await p.click('[data-mm="subject"]'); await p.waitForTimeout(700);
    console.log(w, 'blocks', await p.evaluate(() => [...document.querySelectorAll('.un-blk .un-bh')].map(x => x.innerText.replace(/\s+/g, ' ')).join(' || ')));
    if (w === 1440) {
      console.log('flt hidden', await p.evaluate(() => document.querySelector('#flt').style.display), 'grid', !!(await p.$('.tgrid')));
      // block 0: restrict to one class
      const blk = '.un-blk >> nth=0';
      console.log('chips', await p.evaluate(() => document.querySelector('.un-blk .un-cls').innerText.replace(/\s+/g, ' ')));
      const ins = await p.$$('.un-blk:first-of-type [data-in]');
      // type in block 1 (other) first to test preservation
      const second = await p.$$('.un-blk');
      if (second.length > 1) await (await second[1].$('textarea')).fill('نص محفوظ في كتلة أخرى');
      if (ins.length > 1) { await ins[1].evaluate(x => x.click()); await p.waitForTimeout(300); }
      const first = (await p.$$('.un-blk'))[0];
      await (await first.$('textarea')).fill('درس لفصل واحد فقط');
      console.log('sum', await first.evaluate(x => x.querySelector('[data-u="unSum"]').innerText), '|', await first.evaluate(x => x.querySelector('.un-ms').innerText.replace(/\s+/g, ' ')));
      await (await first.$('[data-u="unGo"]')).click(); await p.waitForTimeout(1200);
      console.log('saved', await p.evaluate(() => APP.S.entries.filter(e => e.topic === 'درس لفصل واحد فقط').map(e => APP.cls(e.class_id).name).join(',')));
      console.log('other kept', second.length > 1 ? await p.evaluate(() => document.querySelectorAll('.un-blk')[1].querySelector('textarea').value) : 'n/a');
      await p.screenshot({ path: 'p0/unb1440.png', fullPage: false });
      await p.click('.tgrid [data-cell] >> nth=0'); await p.waitForTimeout(800);
      console.log('after grid click mode', await p.evaluate(() => APP.LS.get('mymode')), 'cards', await p.evaluate(() => document.querySelectorAll('.lesson').length));
    }
    await p.screenshot({ path: 'p0/unb' + w + '.png', fullPage: true });
    console.log('sw', await p.evaluate(() => document.documentElement.scrollWidth));
    await p.context().close();
  }
  console.log('ERRS', errs); await b.close(); })();
