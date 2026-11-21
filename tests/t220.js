// لوحة مالك المنصة + الدعم الفني + إيقاف المدرسة وإخفاء أقسامها — node t220.js
const { chromium } = require('playwright');
const W = [375, 768, 1440];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message)); const R = {};
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.evaluate(() => localStorage.removeItem('dina_brand')); await p.reload();
  await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(3000);
  // بلاغ من «الدعم الفني»
  await p.evaluate(() => location.hash = '#/support'); await p.waitForTimeout(800);
  await p.fill('#spB', 'زر حفظ الحضور لا يستجيب في فصل رابع أ'); await p.click('#spGo'); await p.waitForTimeout(900);
  R.myReports = await p.$$eval('.card .sec-box', L => L.length);
  // نظرة عامة
  await p.evaluate(() => { APP.LS.set('pc_t', 'ov'); location.hash = '#/schools'; }); await p.waitForTimeout(1500);
  R.kpis = await p.$$eval('.pc-kp b', L => L.map(x => x.textContent)); R.alerts = await p.$$eval('.pc-al', L => L.map(x => x.textContent.trim().slice(0, 50)));
  R.badge = await p.$eval('[data-bd="pr"]', x => x.hidden ? '' : x.textContent);
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250); await p.screenshot({ path: `p0/t220_ov_${w}.png`, fullPage: w === 375 }); R['ovOv' + w] = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // المدارس + الحالة والميزات
  await p.click('[data-t="sc"]'); await p.waitForTimeout(1000); R.cardActs = await p.$$eval('[data-st]', L => L.length);
  await p.click('[data-st]'); await p.waitForTimeout(300); await p.check('[name=pst][value=suspended]'); await p.fill('#pMsg', 'انتهى الاشتراك'); await p.uncheck('[data-f="posts"]').catch(() => {}); await p.click('#pGo'); await p.waitForTimeout(800);
  R.suspendedTag = await p.$$eval('.su-st.bad', L => L.some(x => x.textContent.includes('موقوفة')));
  // مستخدم غير مدير منصة يرى الإيقاف ويُخفى عنه القسم
  await p.evaluate(() => { APP.S.school.settings = APP.S.school.settings || {}; APP.S.school.settings.platform = { status: 'suspended', msg: 'انتهى الاشتراك', features: { posts: false } }; window.__pa = APP.isPlatformAdmin; APP.isPlatformAdmin = () => false; }); await p.waitForTimeout(1800);
  R.blocked = await p.$eval('#pcBlock', x => x.textContent.includes('انتهى الاشتراك')).catch(() => false);
  R.postsHidden = await p.evaluate(() => { const n = APP.NAV.find(n => n[0] === 'posts'); return n ? !n[2]() : 'no-nav'; });
  await p.screenshot({ path: 'p0/t220_blocked.png' });
  await p.evaluate(() => { APP.isPlatformAdmin = window.__pa; APP.S.school.settings.platform = { status: 'active', features: {} }; }); await p.waitForTimeout(1800); R.unblocked = !(await p.$('#pcBlock'));
  // المستخدمون
  await p.evaluate(() => { APP.LS.set('pc_t', 'us'); APP.LS.set('pc_us', ''); location.hash = '#/home'; setTimeout(() => location.hash = '#/schools', 50); }); await p.waitForTimeout(1500);
  R.users = await p.$$eval('#pcB tbody tr', L => L.length); await p.selectOption('#uF', 'never'); await p.waitForTimeout(500); R.usersNever = await p.$$eval('#pcB tbody tr', L => L.length);
  await p.screenshot({ path: 'p0/t220_users_1440.png' });
  // المشكلات: الأخطاء ثم البلاغات والرد
  await p.click('[data-t="pr"]'); await p.waitForTimeout(1000); R.errs = await p.$$eval('.pc-err', L => L.length);
  await p.click('[data-er]'); await p.waitForTimeout(600); R.errsAfter = await p.$$eval('.pc-err:not(.res)', L => L.length);
  await p.click('[data-sb="rep"]'); await p.waitForTimeout(600); R.reps = await p.$$eval('.pc-err', L => L.length);
  await p.fill('[data-rr]', 'تم إصلاح المشكلة في الإصدار الجديد، شكراً لك'); await p.click('[data-rs][data-s="done"]'); await p.waitForTimeout(700);
  await p.screenshot({ path: 'p0/t220_problems_1440.png', fullPage: true });
  await p.evaluate(() => location.hash = '#/support'); await p.waitForTimeout(800); R.replySeen = await p.$$eval('.sec-box', L => L.some(x => x.textContent.includes('رد الدعم')));
  // التقارير
  await p.evaluate(() => { APP.LS.set('pc_t', 'rp'); location.hash = '#/schools'; }); await p.waitForTimeout(1200);
  R.repRows = await p.$$eval('#pcB tbody tr', L => L.length); await p.click('#rPr'); await p.waitForTimeout(900); R.print = !!(await p.$('.rs-ov')); await p.click('#rsX');
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250); await p.screenshot({ path: `p0/t220_rp_${w}.png`, fullPage: w === 375 }); R['ovRp' + w] = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); }
  // المعلم: لا لوحة ولا دعم بلا تفعيل
  R.teacher = await p.evaluate(() => { const me = APP.S.me; APP.S.me = Object.assign({}, me, { is_owner: false }); const a = APP.NAV.find(n => n[0] === 'schools')[2](), s = APP.NAV.find(n => n[0] === 'support')[2](); APP.S.me = me; return { schools: a, support: s }; });
  R.errors = errs; console.log(JSON.stringify(R, null, 1)); await b.close();
})();
