// البوصلة ٢ + رعاية الموهوبين + السمات ولوحة المعلم والإشعارات + scale.html بثلاث لغات — ثلاثة مقاسات
const { chromium } = require('playwright');
const close = p => p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
(async () => { const b = await chromium.launch(); const errs = []; const out = {};
  for (const [w, h] of (process.argv[2] ? [[+process.argv[2], 812]] : [[1440, 900], [768, 1024], [375, 812]])) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); await p.addInitScript(() => { window.__wnTest = 1; }); p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
    await p.waitForTimeout(2200); const wn = await p.$$eval('.wn-it', x => x.length); await p.screenshot({ path: `p0/n-whatsnew-${w}.png` }); await close(p);
    await p.evaluate(() => { const n = document.querySelector('#nfSoft'); n && n.remove(); location.hash = '#/compass'; }); await p.waitForTimeout(700);
    await p.screenshot({ path: `p0/n-cp-bank-${w}.png` });
    const cards = await p.$$eval('.cp-sc', x => x.length);
    await p.click('[data-pv="mi"]'); await p.waitForTimeout(300); await p.selectOption('#pvG', 'fr'); await p.waitForTimeout(200); const pvRows = await p.$$eval('#pvB tbody tr', x => x.length); await p.screenshot({ path: `p0/n-cp-preview-${w}.png` }); await close(p);
    await p.click('[data-run="styles"]'); await p.waitForTimeout(300); const lv = await p.$eval('#crL', s => s.value); await p.click('#crGo'); await p.waitForTimeout(800); await close(p);
    await p.click('[data-t="runs"]'); await p.waitForTimeout(1000); await p.click('[data-r]'); await p.waitForTimeout(900);
    await p.screenshot({ path: `p0/n-cp-class-${w}.png` });
    await p.click('[data-ind="0"]'); await p.waitForTimeout(700); await p.selectOption('#stG', 'en'); await p.waitForTimeout(300);
    await p.screenshot({ path: `p0/n-cp-student-${w}.png` }); const stDir = await p.$eval('#stR', e => e.dir);
    await close(p);
    // الموهوبون
    await p.evaluate(() => { location.hash = '#/gifted'; }); await p.waitForTimeout(700); await p.screenshot({ path: `p0/n-gf-guide-${w}.png`, fullPage: w === 1440 });
    await p.click('[data-t="files"]'); await p.waitForTimeout(500); await p.click('#gfNew'); await p.waitForTimeout(600); await p.click('#nmGo'); await p.waitForTimeout(900);
    // نموذج ترشيح المعلم يُفتح تلقائياً
    await p.fill('#g-sit', 'حل مسألة التحدي بثلاث طرق'); await p.click('#fmS'); await p.waitForTimeout(500);
    await p.click('[data-fm="rating"]'); await p.waitForTimeout(400);
    await p.$$eval('.gf-rt input[value="4"]', x => x.forEach(i => i.click())); await p.waitForTimeout(200); const rt = await p.$eval('#rtC', e => e.textContent);
    await p.screenshot({ path: `p0/n-gf-rating-${w}.png` }); await p.click('#fmS'); await p.waitForTimeout(500);
    await p.click('[data-fm="torr"]'); await p.waitForTimeout(300); await p.fill('#g-resp', 'بيت للقطة\nطبلة\nمجسم مدينة\nصندوق بريد\nقناع\nمسرح دمى'); await p.fill('#g-flex', '4'); await p.fill('#g-orig', '2'); await p.fill('#g-elab', '3'); await p.click('#fmS'); await p.waitForTimeout(400);
    await p.click('[data-fm="tests"]'); await p.waitForTimeout(300); await p.fill('#g-mawh', '88'); await p.click('#fmS'); await p.waitForTimeout(400);
    await p.click('[data-fm="dec"]'); await p.waitForTimeout(400); const dec = await p.$eval('#decC', e => e.textContent.replace(/\s+/g, ' ').slice(-90)); await p.screenshot({ path: `p0/n-gf-dec-${w}.png` }); await p.click('#fmS'); await p.waitForTimeout(400);
    await p.screenshot({ path: `p0/n-gf-file-${w}.png` }); await close(p);
    await p.click('[data-t="dash"]'); await p.waitForTimeout(800); await p.screenshot({ path: `p0/n-gf-dash-${w}.png` });
    const kp = await p.$$eval('.gf-kpi b', x => x.map(y => y.textContent));
    // السمات + الإشعارات
    await p.evaluate(() => { localStorage.setItem('dina_theme', 'depth'); APP.applyTheme(); location.hash = '#/dash'; }); await p.waitForTimeout(800); await p.screenshot({ path: `p0/n-th-depth-${w}.png` });
    await p.evaluate(() => { localStorage.setItem('dina_theme', 'glass'); APP.applyTheme(); }); await p.waitForTimeout(400); await p.screenshot({ path: `p0/n-th-glass-${w}.png` });
    await p.evaluate(() => { localStorage.setItem('dina_theme', 'pattern'); APP.applyTheme(); }); await p.waitForTimeout(400); await p.screenshot({ path: `p0/n-th-pattern-${w}.png` });
    await p.click('#notifBtn'); await p.waitForTimeout(900); const nic = await p.$$eval('.nf-ic', x => x.length); await p.screenshot({ path: `p0/n-notif-${w}.png` });
    await p.evaluate(() => localStorage.removeItem('dina_theme'));
    // المعلم مع تفعيل home2 و themes
    const t = await b.newPage({ viewport: { width: w, height: h } }); await t.addInitScript(() => { window.__wnTest = 1; }); t.on('pageerror', e => errs.push('t' + w + ': ' + e.message));
    await t.goto('http://localhost:8766/index.html?demo=1'); await t.click('[data-demo="n.qahtani@dinaschool.com"]'); await t.waitForTimeout(1500);
    await t.evaluate(() => { APP.S.school.settings = { ...(APP.S.school.settings || {}), tfeat: { home2: true, themes: true, gifted: true, compass: true, notif: true }, uitheme: 'depth' }; document.querySelectorAll('.ovl').forEach(o => o.remove()); localStorage.removeItem('wn_seen_' + APP.S.me.id); location.hash = '#/dash'; setTimeout(() => location.hash = '#/my', 50); });
    await t.waitForTimeout(3500); const wnT = await t.$$eval('.wn-it', x => x.length); await t.screenshot({ path: `p0/n-t-whatsnew-${w}.png` }); await close(t);
    await t.evaluate(() => { const n = document.querySelector('#nfSoft'); n && n.remove(); window.scrollTo(0, 0); }); await t.waitForTimeout(300);
    const hero = await t.$$eval('#myHero', x => x.length), ics = await t.$$eval('.tq-ic', x => x.length), th = await t.evaluate(() => document.body.dataset.th);
    const order = await t.evaluate(() => { const h = document.querySelector('#myHero'); return h && h.nextElementSibling ? h.nextElementSibling.className : ''; });
    await t.screenshot({ path: `p0/n-t-hero-${w}.png` });
    await t.click('[data-hd="2"]', { timeout: 5000 }).catch(e => errs.push('hd ' + w + ' ' + e.message.split('\n')[0])); await t.waitForTimeout(700); await t.screenshot({ path: `p0/n-t-day-${w}.png` });
    const hx = await t.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
    await t.close();
    // صفحة الطالب
    const s = await b.newPage({ viewport: { width: w, height: h } }); s.on('pageerror', e => errs.push('scale ' + w + ': ' + e.message)); let sent = null;
    const R = { key: 'mi', title: 'الذكاءات المتعددة', opts: { lv: 'p', lang: 'ar' }, school: 'مدارس دينا العالمية', cls: 'الخامس أ', stage: 'الابتدائية', grade: 'الخامس', students: [{ id: '00000000-0000-0000-0000-000000000001', n: 'سارة أحمد' }], avg: { ling: 60, logic: 70, spat: 50, body: 40, mus: 55, inter: 65, intra: 45, nat: 50 } };
    await s.route('**/rest/v1/rpc/scale_get', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(R) }));
    await s.route('**/rest/v1/rpc/scale_submit', r => { sent = JSON.parse(r.request().postData()); r.fulfill({ contentType: 'application/json', body: 'true' }); });
    await s.goto('http://localhost:8766/scale.html?c=ABCDEF'); await s.waitForTimeout(800); await s.click('[data-l="en"]'); await s.waitForTimeout(200);
    await s.selectOption('#st', { index: 1 }); await s.click('#go'); await s.waitForTimeout(300); await s.screenshot({ path: `p0/n-scale-en-${w}.png` });
    let pages = 0; while (pages < 20) { const chs = await s.$$('.it'); for (let i = 0; i < chs.length; i++) { const bs = await chs[i].$$('.ch'); await bs[(i + pages) % bs.length].click(); } pages++; if (await s.$('#nx')) await s.click('#nx'); else break; await s.waitForTimeout(150); }
    await s.click('[data-l="fr"]'); await s.waitForTimeout(200); await s.click('#sd'); await s.waitForTimeout(900);
    await s.screenshot({ path: `p0/n-scale-res-${w}.png`, fullPage: true }); const rdir = await s.evaluate(() => document.documentElement.dir);
    // مستوى الروضة بالوجوه
    R.key = 'styles'; R.opts = { lv: 'k' }; await s.evaluate(() => localStorage.setItem('scale_lang', 'ar'));
    await s.goto('http://localhost:8766/scale.html?c=ABCDEF'); await s.waitForTimeout(700); await s.selectOption('#st', { index: 1 }); await s.click('#go'); await s.waitForTimeout(300);
    const kItems = await s.$eval('#cnt', e => e.textContent); await s.screenshot({ path: `p0/n-scale-k-${w}.png` });
    await s.close(); await p.close();
    out[w] = { wn, cards, pvRows, lv, stDir, rt, dec, kp, nic, wnT, hero, ics, th, order, hx, pages, sentN: sent && sent.p_answers.length, sentScores: sent && sent.p_scores, rdir, kItems };
    console.log(w, JSON.stringify(out[w]));
  }
  console.log('ERRS', errs); await b.close(); })();
