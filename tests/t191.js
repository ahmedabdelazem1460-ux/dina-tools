// السبورة: الأدوات التفاعلية — فصل الحصة الموحّد، العجلة، البطاقة، النجوم، الأدوار، المجموعات، الضجيج، والبقية، والسؤال اللحظي، والإخفاء بلا تفعيل — node t191.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }); const errs = [];
  for (const W of [1440, 768, 375]) { const ctx = await b.newContext({ viewport: { width: W, height: W > 800 ? 900 : 820 }, reducedMotion: W === 1440 ? 'no-preference' : 'reduce' }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(W + ' ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
    await p.evaluate(() => location.hash = '#/wboard'); await p.waitForTimeout(2500);
    const f = p.frames().find(x => /whiteboard/.test(x.url())); await f.evaluate(() => { ['dina_wbt_roster', 'dina_wbt_names'].forEach(k => localStorage.removeItem(k)); });
    await f.evaluate(() => location.reload()); await p.waitForTimeout(2500); const F = p.frames().find(x => /whiteboard/.test(x.url()));
    const clk = s => F.evaluate(s => document.querySelector(s).click(), s);
    await clk('#wbt'); await F.waitForTimeout(300); if (W === 1440) await p.screenshot({ path: 'p0/t191-panel.png' });
    console.log(W, 'tiles:', await F.evaluate(() => [...document.querySelectorAll('.wbt-t b')].map(x => x.textContent).join('،')));
    // العجلة بلا فصل ← نافذة الفصل ← اختيار فصل ← تفتح العجلة
    await clk('[data-w="wheel"]'); await F.waitForTimeout(300);
    console.log(W, 'roster dialog:', await F.evaluate(() => !!document.querySelector('.wbw[data-k="roster"]')), 'classes:', await F.evaluate(() => document.querySelectorAll('.wbw[data-k="roster"] [data-c]').length));
    await clk('.wbw[data-k="roster"] [data-c]'); await F.waitForTimeout(1500);
    console.log(W, 'wheel open:', await F.evaluate(() => !!document.querySelector('.wbw[data-k="wheel"]')), '|', await F.evaluate(() => (document.querySelector('.wbw[data-k="wheel"] .rb b') || {}).textContent));
    if (W === 1440) { await p.screenshot({ path: 'p0/t191-wheel.png' }); }
    await clk('.wbw[data-k="wheel"] .wh-go'); await F.waitForTimeout(W === 1440 ? 7000 : 1500);
    console.log(W, 'winner:', await F.evaluate(() => (document.querySelector('.wh-win .n') || {}).textContent));
    if (W === 1440) { await F.waitForTimeout(300); await p.screenshot({ path: 'p0/t191-win.png' }); }
    await clk('.wh-win .ins'); await clk('.wh-win .cl'); console.log(W, 'after remove:', await F.evaluate(() => document.querySelector('.wbw[data-k="wheel"] .hs').textContent));
    // تكبير العجلة
    await clk('.wbw[data-k="wheel"] .mx'); await F.waitForTimeout(400); if (W !== 768) await p.screenshot({ path: `p0/t191-wheelmax-${W}.png` }); await clk('.wbw[data-k="wheel"] .cx');
    // البطاقة، النجوم، الأدوار، المجموعات
    for (const k of ['flip', 'stars', 'order', 'groups']) { await clk('#wbt'); await clk(`[data-w="${k}"]`); await F.waitForTimeout(250); }
    await clk('.wbw[data-k="flip"] .go'); await clk('.wbw[data-k="stars"] .st-c'); await clk('.wbw[data-k="stars"] .st-c'); await clk('.wbw[data-k="order"] .nx'); await F.waitForTimeout(900);
    console.log(W, 'flip:', await F.evaluate(() => document.querySelector('.wbw[data-k="flip"] .bk').textContent), '| stars:', await F.evaluate(() => document.querySelector('.wbw[data-k="stars"] .st-c .s').textContent), '| order cur:', await F.evaluate(() => (document.querySelector('.wbw[data-k="order"] li.cur') || {}).textContent), '| groups:', await F.evaluate(() => document.querySelectorAll('.wbw[data-k="groups"] .grp').length));
    await p.screenshot({ path: `p0/t191-${W}.png` });
    for (const k of ['flip', 'stars', 'order', 'groups']) await clk(`.wbw[data-k="${k}"] .cx`);
    // الضجيج + المؤقت + البقية
    for (const k of ['noise', 'timer', 'dice', 'score', 'signal', 'watch']) { await clk('#wbt'); await clk(`[data-w="${k}"]`); await F.waitForTimeout(150); }
    await clk('.wbw[data-k="noise"] .go'); await clk('.wbw[data-k="timer"] [data-m="1"]'); await clk('.wbw[data-k="timer"] .go'); await clk('.wbw[data-k="dice"] .rl'); await clk('.wbw[data-k="score"] [data-d="0|5"]'); await clk('.wbw[data-k="signal"] [data-s="0"]'); await clk('.wbw[data-k="watch"] .go'); await F.waitForTimeout(1500);
    console.log(W, 'noise:', await F.evaluate(() => document.querySelector('.wbw[data-k="noise"] .st').textContent), '| timer:', await F.evaluate(() => document.querySelector('.wbw[data-k="timer"] .big').textContent), '| dice:', await F.evaluate(() => document.querySelectorAll('.wbw[data-k="dice"] .die').length), '| score:', await F.evaluate(() => document.querySelector('.wbw[data-k="score"] .team b').textContent));
    if (W === 1440) await p.screenshot({ path: 'p0/t191-class.png' });
    for (const k of ['noise', 'timer', 'dice', 'score', 'signal', 'watch']) await clk(`.wbw[data-k="${k}"] .cx`);
    await clk('#wbt'); await clk('[data-w="poll"]'); await p.waitForTimeout(700); console.log(W, 'poll modal:', await p.evaluate(() => !!document.querySelector('.ovl .lp-kinds')));
    await ctx.close(); }
  { const p = await b.newPage(); await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
    await p.evaluate(() => location.hash = '#/wboard'); await p.waitForTimeout(2500); const f = p.frames().find(x => /whiteboard/.test(x.url()));
    const hello = async () => { await f.evaluate(() => parent.postMessage({ type: 'dina-wb-hello' }, location.origin)); await p.waitForTimeout(400); return f.evaluate(() => ({ hidden: document.getElementById('wbtG').hidden, classes: (JSON.parse(localStorage.getItem('dina_wb_cfg')).classes || []).length })); };
    await p.evaluate(() => { APP.S.me = APP.S.staff.find(s => !s.is_owner); APP.S.school.settings = APP.S.school.settings || {}; APP.S.school.settings.tfeat = {}; });
    console.log('teacher no-enable:', JSON.stringify(await hello()));
    await p.evaluate(() => { APP.S.school.settings.tfeat = { wbtools: true }; }); console.log('teacher wbtools on:', JSON.stringify(await hello())); await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
