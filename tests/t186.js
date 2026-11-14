// البوصلة: رابط خارجي، مشاركة مع المعلمين، التصدير الإبداعي (تنزيلات حقيقية) + صفحة الطالب الخارجي + المعلم بلا تفعيل: لا جديد إلا السمات
const { chromium } = require('playwright');
const W = process.argv[2] ? [+process.argv[2]] : [1440, 768, 375];
(async () => { const b = await chromium.launch(); const errs = [];
  for (const w of W) { const ctx = await b.newContext({ viewport: { width: w, height: w > 800 ? 900 : 860 }, acceptDownloads: true });
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
    await p.evaluate(() => { const n = document.querySelector('#nfSoft'); n && n.remove(); location.hash = '#/compass'; }); await p.waitForTimeout(700);
    await p.click('[data-run="mi"]'); await p.waitForTimeout(300); await p.selectOption('#crC', ''); await p.waitForTimeout(100); await p.check('#crX'); await p.screenshot({ path: `p0/x-run-${w}.png` }); await p.click('#crGo'); await p.waitForTimeout(700); await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
    await p.click('[data-t="scales"]'); await p.waitForTimeout(400); await p.click('[data-run="styles"]'); await p.waitForTimeout(300); await p.check('#crS'); await p.click('#crGo'); await p.waitForTimeout(700); await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
    await p.click('[data-t="runs"]'); await p.waitForTimeout(1000); await p.screenshot({ path: `p0/x-runs-${w}.png` });
    const chips = await p.$$eval('.fm-row .meta', x => x.map(y => y.textContent.replace(/\s+/g, ' ')));
    // التطبيق الخارجي (الأحدث بعد styles: الثاني)
    const rows = await p.$$('[data-r]'); await rows[1].click(); await p.waitForTimeout(900);
    const extCols = await p.$$eval('#rpBody thead th', x => x.map(y => y.textContent).slice(0, 3)); await p.screenshot({ path: `p0/x-report-${w}.png` });
    await p.click('#rpSh'); await p.waitForTimeout(400); const nT = await p.$$eval('.nf-rc input', x => x.length); await p.$$eval('.nf-rc input', x => x.slice(0, 2).forEach(i => i.click())); await p.screenshot({ path: `p0/x-share-${w}.png` }); await p.click('#shGo'); await p.waitForTimeout(700);
    await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove())); await p.click('[data-t="runs"]'); await p.waitForTimeout(900);
    const shared = await p.$$eval('.fm-row .meta', x => x.map(y => y.textContent).join('|').match(/مشارك مع/g) || []);
    const rows2 = await p.$$('[data-r]'); await rows2[0].click(); await p.waitForTimeout(900);
    await p.click('#rpC'); await p.waitForTimeout(400); await p.screenshot({ path: `p0/x-creative-${w}.png` });
    const dl = {};
    if (w === 1440) for (const k of ['poster-png', 'poster-pdf', 'cards', 'cert', 'pptx', 'csv']) { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.click(`[data-ce="${k}"]`)]); const f = `/tmp/x-${k}-${d.suggestedFilename()}`; await d.saveAs(f); dl[k] = require('fs').statSync(f).size; if (k === 'poster-png') require('fs').copyFileSync(f, `p0/x-poster.png`); }
    await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
    // معلم بلا أي تفعيل
    const t = await ctx.newPage(); t.on('pageerror', e => errs.push('t' + w + ': ' + e.message));
    await t.goto('http://localhost:8766/index.html?demo=1'); await t.click('[data-demo="n.qahtani@dinaschool.com"]'); await t.waitForTimeout(2000);
    await t.evaluate(() => { APP.S.school.settings = { ...(APP.S.school.settings || {}), tfeat: {} }; location.hash = '#/dash'; setTimeout(() => location.hash = '#/my', 50); }); await t.waitForTimeout(1500);
    const tNav = await t.$$eval('#nav a', x => x.map(a => a.textContent.trim())); const hero = await t.$$('#myHero');
    await t.evaluate(() => APP.uiSettings()); await t.waitForTimeout(400); const thPick = await t.$$eval('#thPick [data-th]', x => x.length); await t.click('#thPick [data-th="depth"]'); await t.waitForTimeout(300); const th = await t.evaluate(() => document.body.dataset.th);
    await t.screenshot({ path: `p0/x-teacher-theme-${w}.png` });
    // صفحة الطالب الخارجي
    const s = await ctx.newPage(); s.on('pageerror', e => errs.push('s' + w + ': ' + e.message)); let sent = null;
    await s.route('**/rest/v1/rpc/scale_get', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ key: 'motive', title: 'الدافعية', opts: { lv: 'm', ext: true }, school: 'مدارس دينا العالمية', cls: null, students: [] }) }));
    await s.route('**/rest/v1/rpc/scale_submit_ext', r => { sent = JSON.parse(r.request().postData()); r.fulfill({ contentType: 'application/json', body: 'true' }); });
    await s.goto('http://localhost:8766/scale.html?c=EXTXYZ'); await s.waitForTimeout(700); await s.fill('#nm', 'ليان سعد'); await s.fill('#xs', 'مدارس النخبة'); await s.fill('#xg', 'الثاني متوسط'); await s.fill('#xp', '0551112233');
    await s.screenshot({ path: `p0/x-ext-start-${w}.png` }); await s.click('#go'); await s.waitForTimeout(300);
    for (let pg = 0; pg < 10; pg++) { const its = await s.$$('.it'); for (const it of its) { const bs = await it.$$('.ch'); await bs[3].click(); } if (await s.$('#nx')) { await s.click('#nx'); await s.waitForTimeout(100); } else break; }
    await s.click('#sd'); await s.waitForTimeout(800); const ph = await s.$eval('#ph', e => e.value); await s.screenshot({ path: `p0/x-ext-res-${w}.png` });
    console.log(w, JSON.stringify({ chips, extCols, nT, shared: shared.length, dl, tNav, hero: hero.length, thPick, th, sentMeta: sent && sent.p_meta, sentN: sent && sent.p_answers.length, ph }));
    await ctx.close(); }
  console.log('ERRS', errs); await b.close(); })();
