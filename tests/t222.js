// لوحة مالك المنصة: البيانات الوهمية + المنصات التابعة (قراءة فقط) + زر العرض التجريبي — node t222.js
const { chromium } = require('playwright');
const W = [375, 768, 1440];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); const R = {};
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.evaluate(() => { localStorage.removeItem('dina_brand'); localStorage.removeItem('dwp_link_dina'); }); await p.reload();
  await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(3000);
  await p.evaluate(() => { APP.LS.set('pc_t', 'sc'); location.hash = '#/schools'; }); await p.waitForTimeout(1500);
  R.demoBtn = await p.$$eval('a[href="index.html?demo=1"]', L => L.length);
  R.tabs = await p.$$eval('.pc-tabs [data-t]', L => L.map(x => x.textContent.trim()));
  R.dmBtns = await p.$$eval('[data-dm]', L => L.length);
  // توليد
  await p.click('[data-dm]'); await p.waitForTimeout(300);
  await p.selectOption('#dmK', '2'); R.est = await p.$eval('#dmEst', x => x.textContent);
  await p.screenshot({ path: 'p0/t222_seed_dlg.png' });
  await p.click('#dmGo'); await p.waitForTimeout(900);
  R.seedCounts = await p.$$eval('.modal .dm-cnt b', L => L.map(x => x.textContent));
  await p.screenshot({ path: 'p0/t222_seed_done.png' });
  const closeAll = () => p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
  await closeAll(); await p.evaluate(() => APP.schoolsRefresh()); await p.waitForTimeout(900);
  R.markedOn = await p.$$eval('[data-dm]', L => L.some(x => x.textContent.includes('مفعّلة')));
  // المسح
  await p.click('[data-dm]'); await p.waitForTimeout(300); R.clearShown = !!(await p.$('#dmClr'));
  await p.click('#dmClr'); await p.waitForTimeout(300); await p.click('.ovl:last-child [data-yes]'); await p.waitForTimeout(1200);
  R.reloadedAfterClear = !!(await p.$('[data-demo]')); // مدرستي: تُعاد تحميل المنصة بعد المسح
  if (R.reloadedAfterClear) { await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(3000); await p.evaluate(() => { APP.LS.set('pc_t', 'sc'); location.hash = '#/schools'; }); await p.waitForTimeout(1500); }
  await closeAll(); await p.evaluate(() => APP.schoolsRefresh()); await p.waitForTimeout(900);
  R.markedOff = await p.$$eval('[data-dm]', L => !L.some(x => x.textContent.includes('مفعّلة')));
  // الإيقاف السريع والأرشفة (على مدرسة غير مدرستي — نضيف مدرسة في وضع التجربة)
  R.qsMine = await p.$$eval('[data-qs]', L => L.length);
  await p.evaluate(async () => { await APP.api.rpc('school_provision', { p: { name: 'مدرسة النخبة', sections: [{ name: 'قسم البنين', short_name: 'البنين' }], owner: { name: 'مدير النخبة', email: 'n@x.com' } } }); APP.schoolsRefresh(); }); await p.waitForTimeout(1200);
  R.qsBtns = await p.$$eval('[data-qs]', L => L.map(x => x.dataset.v));
  await p.click('[data-qs][data-v="suspended"]'); await p.waitForTimeout(300); await p.click('.ovl:last-child [data-yes]'); await p.waitForTimeout(1200);
  R.suspTag = await p.$$eval('.su-st.bad', L => L.some(x => x.textContent.includes('موقوفة')));
  await p.click('[data-qs][data-v="archived"]'); await p.waitForTimeout(300); await p.click('.ovl:last-child [data-yes]'); await p.waitForTimeout(1200);
  R.archHidden = await p.$$eval('.sc-card.pc-arch', L => L.map(x => getComputedStyle(x).display));
  await p.check('#pcArchT'); await p.waitForTimeout(200); R.archShown = await p.$$eval('.sc-card.pc-arch', L => L.map(x => getComputedStyle(x).display));
  await p.screenshot({ path: 'p0/t222_schools_1440.png', fullPage: true });
  await p.setViewportSize({ width: 375, height: 900 }); await p.waitForTimeout(300); await p.screenshot({ path: 'p0/t222_schools_375.png', fullPage: true }); R.ovSc375 = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); await p.setViewportSize({ width: 1440, height: 900 });
  await p.click('[data-qs][data-v="active"]'); await p.waitForTimeout(300); await p.click('.ovl:last-child [data-yes]'); await p.waitForTimeout(1200);
  R.restored = await p.$$eval('.sc-card.pc-arch', L => L.length);
  // الإحصاءات التفاعلية من البطاقة
  await p.click('.sc-card [data-dd]'); await p.waitForTimeout(900);
  R.ddMini = await p.$$eval('.ovl .pc-mini button', L => L.length); R.ddBars = await p.$$eval('.ovl .pc-ch rect', L => L.length);
  await p.click('.ovl [data-mk="plans"]'); await p.waitForTimeout(200); await p.click('.ovl [data-dq="7"]'); await p.waitForTimeout(700); R.ddBars7 = await p.$$eval('.ovl .pc-ch rect', L => L.length);
  await p.screenshot({ path: 'p0/t222_drill_1440.png' });
  await p.setViewportSize({ width: 375, height: 900 }); await p.waitForTimeout(300); await p.screenshot({ path: 'p0/t222_drill_375.png' }); await p.setViewportSize({ width: 1440, height: 900 });
  await closeAll();
  // نظرة عامة: البطاقات تنقل، والأرقام في الجدول تفتح التفاصيل
  await p.click('[data-t="ov"]'); await p.waitForTimeout(1200);
  R.ovKpiBtns = await p.$$eval('.pc-kp button', L => L.length); R.ovNums = await p.$$eval('#pcB [data-dd]', L => L.length);
  await p.click('#pcB td [data-dd][data-m="actions"]'); await p.waitForTimeout(800); R.ovDrill = !!(await p.$('.ovl .pc-ch')); await closeAll();
  await p.click('.pc-kp [data-go="pr:rep"]'); await p.waitForTimeout(900); R.goTab = await p.evaluate(() => APP.LS.get('pc_t') + '/' + APP.LS.get('pc_pr'));
  // التقارير التفاعلية
  await p.click('[data-t="rp"]'); await p.waitForTimeout(1000); R.rpNums = await p.$$eval('#pcB [data-dd]', L => L.length);
  await p.click('#pcB [data-dd][data-m="plans"]'); await p.waitForTimeout(800); R.rpDrill = await p.$eval('.ovl h4', x => x.textContent).catch(() => ''); await closeAll();
  // المنصات التابعة: محاكاة عميل Supabase لقاعدة مستقلة
  await p.evaluate(() => {
    APP_DBS.dina.supabaseUrl = 'https://other-db.supabase.co';
    const DATA = { schools: [{ id: 's', name: 'مدارس دينا العالمية' }], sections: [{ id: 'a', name: 'قسم البنين' }, { id: 'b', name: 'قسم البنات' }], weeks: [{ id: 'w1', section_id: 'a', word: 'الثاني عشر', start_date: '2026-11-15' }], staff: [{ id: 't1', full_name: 'أ. خالد' }, { id: 't2', full_name: 'أ. سارة' }] };
    let signed = false; window.__writes = 0;
    const Q = t => { const o = { _h: false }; ['eq', 'not', 'gte', 'lte', 'in', 'order', 'limit'].forEach(m => o[m] = () => o); o.select = (c, opt) => { if (opt && opt.head) o._h = true; return o; };
      ['insert', 'update', 'upsert', 'delete'].forEach(m => o[m] = () => { window.__writes++; return o; });
      o.maybeSingle = () => Promise.resolve({ data: { full_name: 'أحمد عبد العظيم صلاح', is_owner: true, school_id: 's' } });
      o.then = (r, j) => Promise.resolve(o._h ? { count: t === 'plan_entries' ? 280 : 42, error: null } : { data: DATA[t] || [] }).then(r, j); return o; };
    window.supabase.createClient = () => ({ auth: { getSession: async () => ({ data: { session: signed ? { user: { email: 'a.abdelazim@dinaschool.com' } } : null } }), getUser: async () => ({ data: { user: { id: 'u' } } }), signInWithPassword: async () => { signed = true; return { error: null }; }, signOut: async () => { signed = false; } },
      from: Q, rpc: async () => ({ data: [{ s: 't1', c: 'plan', d: '2026-11-20', n: 30 }, { s: 't2', c: 'att', d: '2026-11-20', n: 12 }] }) });
  });
  await p.click('[data-t="lk"]'); await p.waitForTimeout(800);
  R.lkLogin = !!(await p.$('[data-lf]'));
  await p.screenshot({ path: 'p0/t222_links_login.png' });
  await p.fill('[data-lf] [name=e]', 'a.abdelazim@dinaschool.com'); await p.fill('[data-lf] [name=p]', 'x'); await p.click('[data-lf] button'); await p.waitForTimeout(1200);
  R.lkState = await p.$eval('[data-ls]', x => x.textContent);
  R.lkKpis = await p.$$eval('.pl-card .pc-kp b', L => L.map(x => x.textContent).slice(0, 4));
  R.lkTop = await p.$$eval('.pl-tbl tbody tr', L => L.map(x => x.textContent));
  R.writes = await p.evaluate(() => window.__writes);
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300); await p.screenshot({ path: `p0/t222_links_${w}.png`, fullPage: true }); R['ov' + w] = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.click('[data-lout]'); await p.waitForTimeout(600); R.afterOut = !!(await p.$('[data-lf]'));
  R.errs = errs.filter(e => !/ERR_TUNNEL|fonts/.test(e));
  console.log(JSON.stringify(R, null, 1)); await b.close();
})();
