// ضغط الصور قبل الرفع + «تحسين الصور» في إعلانات أولياء الأمور — node t214.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = []; let pass = true;
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', e => errs.push(e.message));
  // صورة PNG كبيرة (2400×1600) تُخدَّم كأنها من Supabase
  const big = await (async () => { const q = await b.newPage(); const d = await q.evaluate(() => { const c = document.createElement('canvas'); c.width = 2400; c.height = 1600; const g = c.getContext('2d'); for (let i = 0; i < 4000; i++) { g.fillStyle = `hsl(${i % 360},70%,${30 + i % 50}%)`; g.fillRect(Math.random() * 2400, Math.random() * 1600, 60, 40); } return c.toDataURL('image/png'); }); await q.close(); return Buffer.from(d.split(',')[1], 'base64'); })();
  await p.route('**/storage/v1/object/public/plan-assets/**', r => r.fulfill({ status: 200, contentType: 'image/png', body: big, headers: { 'access-control-allow-origin': '*' } }));
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
  // ١) الضغط نفسه
  const r1 = await p.evaluate(async (b64) => { const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); const f = new File([bin], 'x.png', { type: 'image/png' });
    const o = await window.DinaShrink(f); const im = await createImageBitmap(o); const small = new File([bin.slice(0)], 's.gif', { type: 'image/gif' });
    const off = await window.DinaShrink(f, { on: false });
    return { in: f.size, out: o.size, type: o.type, name: o.name, w: im.width, h: im.height, gifKept: (await window.DinaShrink(small)) === small, offKept: off === f }; }, big.toString('base64'));
  console.log('shrink', JSON.stringify(r1));
  if (!(r1.type === 'image/webp' && r1.w === 1600 && r1.h === 1067 && r1.out < r1.in && r1.gifKept && r1.offKept && /\.webp$/.test(r1.name))) pass = false;
  // ٢) ضغط صور الإعلانات القائمة
  const r2 = await p.evaluate(async () => { const P = await APP.api.addPost({ school_id: APP.S.school.id, kind: 'announcement', title: 'اختبار صورة', body: '', image_url: 'https://dwibkkrzykqgsgyrrggp.supabase.co/storage/v1/object/public/plan-assets/1-a.png', starts_on: APP.isoDate(new Date()), active: true, pinned: false });
    const l = await APP.api.posts(); const r = await APP.shrinkPosts(l); const after = (await APP.api.posts()).find(x => x.id === P.id); const r2 = await APP.shrinkPosts(await APP.api.posts());
    return { r, url: (after.image_url || '').slice(0, 22), again: r2.done }; });
  console.log('posts', JSON.stringify(r2));
  if (!(r2.r.done >= 1 && r2.url.startsWith('data:image/webp') && r2.again === 0)) pass = false;
  // ٣) نافذة الإعدادات بثلاثة مقاسات + الحفظ في الإعدادات
  for (const w of [375, 768, 1440]) { await p.setViewportSize({ width: w, height: 860 }); await p.evaluate(() => location.hash = '#/posts'); await p.waitForTimeout(900);
    await p.click('#ppZ'); await p.waitForTimeout(400); await p.screenshot({ path: `p0/t214_${w}.png` });
    const hs = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); if (hs) { pass = false; console.log('hscroll', w); }
    await p.evaluate(() => document.querySelectorAll('.ovl').forEach(x => x.remove())); await p.waitForTimeout(200); }
  await p.click('#ppZ'); await p.selectOption('#mzMax', '1280'); await p.selectOption('#mzQ', '0.7'); await p.click('#mzSave'); await p.waitForTimeout(500);
  const m = await p.evaluate(() => APP.S.school.settings.media); console.log('media', JSON.stringify(m)); if (!(m && m.max === 1280 && m.q === 0.7 && m.on === true)) pass = false;
  console.log(pass && !errs.length ? 'PASS' : 'FAIL'); console.log('ERRS', errs); await b.close(); })();
