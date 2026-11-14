// السبورة: زر «أدوات تفاعلية» (بتفعيل المالك)، كل الأدوات، الأسماء من الفصل، الإدراج، السؤال اللحظي من السبورة وفي ملء الشاشة — node t191.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const W of [1440, 768, 375]) { const p = await b.newPage({ viewport: { width: W, height: W > 800 ? 900 : 800 } }); p.on('pageerror', e => errs.push(W + ' ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
    await p.evaluate(() => location.hash = '#/wboard'); await p.waitForTimeout(2500);
    const f = p.frames().find(x => /whiteboard/.test(x.url()));
    console.log(W, 'tools visible (owner):', !(await f.evaluate(() => document.getElementById('wbtG').hidden)));
    await f.click('#wbt'); await f.waitForTimeout(300);
    console.log(W, 'tiles:', await f.evaluate(() => [...document.querySelectorAll('.wbt-t b')].map(x => x.textContent).join('،')));
    if (W === 1440) await p.screenshot({ path: 'p0/t191-panel.png' });
    // المؤقت
    await f.click('[data-w="timer"]'); await f.click('.wbw[data-k="timer"] [data-m="1"]'); await f.click('.wbw[data-k="timer"] .go'); await f.waitForTimeout(1300);
    console.log(W, 'timer:', await f.evaluate(() => document.querySelector('.wbw[data-k="timer"] .big').textContent));
    // اختيار طالب من فصل
    await f.evaluate(() => document.getElementById('wbt').click()); await f.click('[data-w="pick"]'); await f.waitForTimeout(200);
    const opt = await f.evaluate(() => { const s = document.querySelector('.wbw[data-k="pick"] .cl'); return s ? s.options.length : 0; });
    if (opt > 1) { await f.evaluate(() => { const s = document.querySelector('.wbw[data-k="pick"] .cl'); s.value = s.options[1].value; s.dispatchEvent(new Event('change')); }); await f.waitForTimeout(1200); }
    else await f.evaluate(() => { const t = document.querySelector('.wbw[data-k="pick"] .nt'); t.value = 'سارة\nريم\nليان\nجود'; t.dispatchEvent(new Event('input')); });
    await f.click('.wbw[data-k="pick"] .go'); await f.waitForTimeout(2200);
    console.log(W, 'class options:', opt, 'picked:', await f.evaluate(() => document.querySelector('.wbw[data-k="pick"] .pick').textContent), '|', await f.evaluate(() => document.querySelector('.wbw[data-k="pick"] .left').textContent));
    await f.evaluate(() => document.querySelector('.wbw[data-k="pick"] .ins').click()); console.log(W, 'inserted text items:', await f.evaluate(() => JSON.parse(localStorage.getItem('dina_wb_default')).pages[0].items.filter(i => i.t === 'text').length));
    // مجموعات، نرد، نقاط، إشارة، ساعة إيقاف
    for (const k of ['groups', 'dice', 'score', 'signal', 'watch']) { await f.evaluate(() => document.getElementById('wbt').click()); await f.click(`[data-w="${k}"]`); await f.waitForTimeout(150); }
    await f.evaluate(() => ['.wbw[data-k="groups"] .go', '.wbw[data-k="dice"] .rl', '.wbw[data-k="score"] [data-d="0|5"]', '.wbw[data-k="signal"] [data-s="0"]', '.wbw[data-k="watch"] .go'].forEach(s => document.querySelector(s).click())); await f.waitForTimeout(700);
    console.log(W, 'groups:', await f.evaluate(() => document.querySelectorAll('.wbw[data-k="groups"] .grp').length), 'dice:', await f.evaluate(() => document.querySelectorAll('.wbw[data-k="dice"] .die').length), 'score:', await f.evaluate(() => document.querySelector('.wbw[data-k="score"] .team b').textContent), 'watch:', await f.evaluate(() => document.querySelector('.wbw[data-k="watch"] .big').textContent));
    await p.screenshot({ path: `p0/t191-${W}.png` });
    // السؤال اللحظي من السبورة
    await f.evaluate(() => document.getElementById('wbt').click()); await f.click('[data-w="poll"]'); await p.waitForTimeout(700);
    console.log(W, 'poll modal:', await p.evaluate(() => !!document.querySelector('.ovl .lp-kinds')));
    await p.close(); }
  // معلم بلا تفعيل: الزر مخفي، وبالتفعيل يظهر (المصافحة نفسها)
  { const p = await b.newPage(); await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
    await p.evaluate(() => location.hash = '#/wboard'); await p.waitForTimeout(2500); const f = p.frames().find(x => /whiteboard/.test(x.url()));
    const hello = async () => { await f.evaluate(() => parent.postMessage({ type: 'dina-wb-hello' }, location.origin)); await p.waitForTimeout(400); return f.evaluate(() => ({ hidden: document.getElementById('wbtG').hidden, cfg: localStorage.getItem('dina_wb_cfg') })); };
    await p.evaluate(() => { APP.S.me = APP.S.staff.find(s => !s.is_owner); APP.S.school.settings = APP.S.school.settings || {}; APP.S.school.settings.tfeat = {}; });
    console.log('teacher no-enable:', JSON.stringify(await hello()));
    await p.evaluate(() => { APP.S.school.settings.tfeat = { wbtools: true }; });
    console.log('teacher wbtools on:', JSON.stringify(await hello()));
    await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
