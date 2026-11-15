// عرض الجداول والإسنادات V.ttviews: كل طرق العرض بثلاثة مقاسات، المعاينة، التعديل، الإسناد، الطباعة (إطار)، Excel، الإخفاء عن المدير بلا تفعيل — node t200.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = []; let ok = true; const chk = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) ok = false; };
  for (const W of [1440, 768, 375]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(W + ' ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
    await p.evaluate(() => location.hash = '#/ttviews'); await p.waitForTimeout(1500);
    chk(await p.$('.tv-root') !== null, W + ' الصفحة تفتح للمالك');
    const hscroll = () => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2);
    for (const v of ['now', 'class', 'teacher', 'day', 'master', 'assign', 'index']) {
      await p.click(`.tv-tabs [data-v="${v}"]`); await p.waitForTimeout(700);
      const n = await p.evaluate(() => document.querySelectorAll('#tvB td.c, #tvB td.sb, #tvB .tv-nc, #tvB .tv-ac').length);
      chk(n > 0, `${W} ${v}: محتوى (${n})`); chk(!(await hscroll()), `${W} ${v}: بلا تمرير أفقي للصفحة`);
      await p.screenshot({ path: `p0/t200-${v}-${W}.png`, fullPage: v !== 'master' && v !== 'class' });
    }
    if (W === 1440) {
      // معاينة يوم وحصة
      await p.click('.tv-tabs [data-v="now"]'); await p.waitForTimeout(500); await p.click('[data-nm="pick"]'); await p.waitForTimeout(600);
      await p.selectOption('#tvND', '1'); await p.selectOption('#tvNP', '2'); await p.waitForTimeout(400);
      const t = await p.textContent('.tv-nh'); chk(/الإثنين — الحصة الثالثة/.test(t), 'المعاينة: ' + t);
      chk(await p.evaluate(() => document.querySelectorAll('.tv-nc.ph-in .tv-ns b').length) >= 2, 'بطاقات الفصول في الحصة المختارة'); await p.screenshot({ path: 'p0/t200-now-pick.png', fullPage: true });
      await p.click('[data-nm="live"]'); await p.waitForTimeout(400);
      // التحكم في الظهور: إخفاء مادة
      await p.click('.tv-tabs [data-v="class"]'); await p.waitForTimeout(400);
      const sname = await p.evaluate(() => APP.subjName(APP.ttViews.D.L[0].subject_id));
      await p.click('#tvVis'); await p.waitForTimeout(300);
      await p.evaluate(n => { [...document.querySelectorAll('.tv-tg [data-s]')].find(i => i.nextElementSibling.textContent === n).click(); }, sname);
      await p.click('#vOk'); await p.waitForTimeout(600);
      chk(!(await p.evaluate(n => [...document.querySelectorAll('#tvB td.c b')].some(b => b.textContent === n), sname)), 'إخفاء المادة: ' + sname);
      await p.evaluate(() => localStorage.removeItem('dwp_ttv_cfg')); await p.click('.tv-tabs [data-v="class"]'); await p.waitForTimeout(500);
      // تعديل حصة
      await p.click('#tvB td[data-ed]'); await p.waitForTimeout(800); chk(await p.$('#sdGo') !== null, 'الضغط على الحصة يفتح نافذة التعديل'); await p.keyboard.press('Escape'); await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
      // الإسناد
      await p.click('.tv-tabs [data-v="assign"]'); await p.waitForTimeout(500); await p.click('#tvAE'); await p.waitForTimeout(500);
      chk(await p.evaluate(() => document.querySelectorAll('select[data-ac]').length) > 5, 'وضع تعديل الإسناد');
      await p.screenshot({ path: 'p0/t200-assign-edit.png' }); await p.click('#tvAE'); await p.waitForTimeout(400);
      // الكشاف بأنواعه
      await p.click('.tv-tabs [data-v="index"]'); await p.waitForTimeout(500);
      for (const m of ['subject', 'matrix', 'teacher']) { await p.click(`[data-m="${m}"]`); await p.waitForTimeout(400); chk(await p.evaluate(() => document.querySelectorAll('#tvB tbody tr').length) > 3, 'الكشاف ' + m); await p.screenshot({ path: `p0/t200-index-${m}.png` }); }
      await p.fill('#tvIQ', 'رياضيات'); await p.waitForTimeout(200); chk(await p.evaluate(() => [...document.querySelectorAll('#tvB tbody tr')].filter(r => !r.hidden).length) > 0, 'البحث في الكشاف');
      // الطباعة: المعاينة لكل نوع
      await p.click('#tvPr'); await p.waitForTimeout(1500);
      for (const w of ['class', 'teacher', 'day', 'masterT', 'master', 'assign', 'index', 'now']) {
        await p.selectOption('#pW', w); await p.waitForTimeout(1500);
        const f = p.frames().find(x => x.parentFrame() && x.name() === '' && x.url() === 'about:blank' ) || p.frames()[1];
        const r = await p.evaluate(() => { const d = document.querySelector('#pFr').contentDocument, pg = d.querySelector('.pg'), t = d.querySelector('.tvp-b > table, .tvp-b'); const b = d.querySelector('.pg.grid .tvp-b'); return { pg: !!pg, logo: !!d.querySelector('.tvp-h img'), over: b ? (b.firstElementChild.getBoundingClientRect().bottom > b.getBoundingClientRect().bottom + 2 || b.firstElementChild.getBoundingClientRect().left < b.getBoundingClientRect().left - 2) : false, sig: !!d.querySelector('.tvp-sig') }; });
        chk(r.pg && r.logo && r.sig && !r.over, `الطباعة ${w}: صفحة بالشعار والتوقيعات دون فيض ${JSON.stringify(r)}`);
        await p.locator('.tv-prev').screenshot({ path: `p0/t200-print-${w}.png` });
      }
      for (const s of ['modern', 'colors', 'eco']) { await p.selectOption('#pW', 'class'); await p.check(`[name=pS][value=${s}]`, { force: true }); await p.waitForTimeout(1300); await p.locator('.tv-prev').screenshot({ path: `p0/t200-print-style-${s}.png` }); }
      await p.check('#pTwo'); await p.waitForTimeout(1300); await p.locator('.tv-prev').screenshot({ path: 'p0/t200-print-two.png' });
      chk(await p.evaluate(() => document.querySelector('#pFr').contentDocument.querySelectorAll('.pg .tvp-who').length === 2), 'جدولان في الصفحة');
      await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
      // Excel
      await p.click('.tv-tabs [data-v="index"]'); await p.waitForTimeout(400);
      const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#tvXl')]); await dl.saveAs('p0/t200.xlsx'); const xb = require('fs').readFileSync('p0/t200.xlsx'); chk(xb.slice(0, 2).toString() === 'PK' && xb.length > 3000, 'Excel ملف فعلي ' + Math.round(xb.length / 1024) + 'KB');
      // الإعدادات
      await p.click('#tvCfg'); await p.waitForTimeout(300); chk(await p.$('#cSv') !== null, 'نافذة الهوية للمالك فيها «حفظ للمدرسة»'); await p.screenshot({ path: 'p0/t200-cfg.png' }); await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
      // الاستوديو
      await p.evaluate(() => { localStorage.setItem('dwp_studio_t', 'ttviews'); location.hash = '#/studio'; }); await p.waitForTimeout(1500);
      chk(await p.$('#stBody .tv-root') !== null, 'تبويب في استوديو الجداول');
      // المدير بلا تفعيل ثم بتفعيل
      const vis = await p.evaluate(() => { const me = APP.S.me; const real = { ...me }; APP.S.me = { ...me, is_owner: false }; APP.S.realMe = real; const r = []; const nav = APP.NAV.find(n => n[0] === 'ttviews'); r.push(nav[2]()); const st = APP.S.school.settings || (APP.S.school.settings = {}); st.tfeat = { ...(st.tfeat || {}), ttviews: true }; r.push(APP.tfeat('ttviews')); APP.S.me = real; delete APP.S.realMe; return r; });
      chk(vis[0] === false, 'غير المالك لا يراها بلا تفعيل'); chk(vis[1] === true, 'بعد التفعيل يصبح مفتاح ttviews مفعّلاً');
    }
    await ctx.close();
  }
  chk(!errs.length, 'بلا أخطاء JS ' + errs.slice(0, 3).join(' | '));
  await b.close(); process.exit(ok ? 0 : 1);
})();
