// المجسمات التفاعلية + إخفاء قوالب الألعاب الجديدة عن المعلم — ثلاثة مقاسات
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = [];
  for (const [w, h] of [[1440, 900], [768, 1024], [375, 812]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
    await p.evaluate(() => { document.querySelector('#nfSoft') && document.querySelector('#nfSoft').remove(); location.hash = '#/labs'; }); await p.waitForTimeout(800);
    await p.click('[data-m3="solids"]'); await p.waitForTimeout(600); await p.click('[data-s="cyl"]'); await p.waitForTimeout(300);
    const cv = await p.$('#m3c'); const bx = await cv.boundingBox(); await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await p.mouse.move(bx.x + bx.width / 2 + 80, bx.y + bx.height / 2 + 40, { steps: 5 }); await p.mouse.up();
    await p.fill('[data-d="r"]', '2'); await p.dispatchEvent('[data-d="r"]', 'input'); await p.waitForTimeout(300);
    const vol = await p.$eval('#vo', x => x.textContent); await p.screenshot({ path: `p0/m3-solid-${w}.png` });
    await p.click('[data-t="atom"]'); await p.waitForTimeout(800); await p.screenshot({ path: `p0/m3-atom-${w}.png` });
    await p.click('[data-t="solar"]'); await p.waitForTimeout(1200); await p.click('[data-p="5"]'); await p.waitForTimeout(300); await p.screenshot({ path: `p0/m3-solar-${w}.png` });
    // نصاعة الرسم: هل رُسم شيء على اللوحة؟
    const painted = await p.$eval('#slc', c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 400) if (d[i]) n++; return n; });
    const teacherModes = await p.evaluate(() => { const real = APP.S.me; APP.S.me = APP.S.staff.find(s => !s.is_owner); const r = APP.tfeat('games2'); APP.S.me = real; return r; });
    console.log(w, JSON.stringify({ vol, painted: painted > 50, teacherSeesNewGames: teacherModes }));
    await p.close(); }
  console.log('ERRS', errs); await b.close(); })();
