// البحث الشامل (Ctrl+K) + متابعة الموظفين (للمالك) + إخفاء عبارات المالك عن غيره — node t208.js
const { chromium } = require('playwright');
const W = [375, 768, 1440];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const R = {}; const ok = (k, v) => { R[k] = v; };
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  ok('btn', !!(await p.$('#gsBtn')));
  // Ctrl+K
  await p.keyboard.press('Control+k'); await p.waitForTimeout(300); ok('openKbd', !!(await p.$('.gs-ov')));
  const cls = await p.evaluate(() => APP.S.classes[0].name.split(' ')[0]);
  await p.fill('#gsI', cls); await p.waitForTimeout(900);
  ok('classHits', await p.$$eval('.gs-i', L => L.length));
  ok('groups', await p.$$eval('.gs-h', L => L.map(x => x.textContent)));
  for (const w of W) { await p.setViewportSize({ width: w, height: 860 }); await p.waitForTimeout(250); await p.screenshot({ path: `p0/t208_search_${w}.png` }); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // اسم معلم ← جدوله
  const tName = await p.evaluate(() => APP.S.staff.find(s => !s.is_owner).full_name);
  await p.fill('#gsI', tName.replace(/^أ\.\s*/, '').split(' ')[0]); await p.waitForTimeout(700);
  ok('personHit', await p.$$eval('.gs-i', L => L.some(x => x.querySelector('.gs-ic').textContent === '👤')));
  // صفحة + Enter
  await p.fill('#gsI', 'متابعة الموظفين'); await p.waitForTimeout(700);
  ok('pageFirst', await p.$eval('.gs-i.on b', e => e.textContent));
  await p.keyboard.press('Enter'); await p.waitForTimeout(1800);
  ok('navTo', await p.evaluate(() => location.hash));
  ok('closed', !(await p.$('.gs-ov')));
  // متابعة الموظفين
  ok('swKpi', await p.$$eval('.sw-kc', L => L.length));
  ok('swRows', await p.$$eval('.sw-t tbody tr', L => L.length));
  ok('swHi', await p.$$eval('.sw-hi section', L => L.length));
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300); await p.screenshot({ path: `p0/t208_sw_${w}.png` }); ok('swH_' + w, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)); }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.click('[data-r="month"]'); await p.waitForTimeout(1200); ok('monthRows', await p.$$eval('.sw-t tbody tr', L => L.length));
  await p.click('.sw-t [data-p]'); await p.waitForTimeout(600); ok('detailDays', await p.$$eval('.sw-dh', L => L.length)); await p.screenshot({ path: 'p0/t208_detail.png' });
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // البحث من المفتاح «/» في الصفحة
  await p.click('body'); await p.keyboard.press('/'); await p.waitForTimeout(300); ok('slash', !!(await p.$('.gs-ov'))); await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok('escClose', !(await p.$('.gs-ov')));
  // كمعلم: لا «متابعة الموظفين» لا في القائمة ولا في البحث، والصفحة تعيد للرئيسية بلا رسالة
  await p.evaluate(() => { const t = APP.S.staff.find(s => !s.is_owner); APP.S.me = Object.assign({}, t, { is_owner: false }); APP.S.grants = []; APP.renderNav(); location.hash = '#/home'; }); await p.waitForTimeout(1200);
  ok('tNav', await p.$$eval('#nav a[href="#/staffwork"]', L => L.length));
  await p.evaluate(() => APP.globalSearch('متابعة الموظفين')); await p.waitForTimeout(700);
  ok('tSearchHidden', await p.$$eval('.gs-i b', L => L.map(x => x.textContent)));
  await p.keyboard.press('Escape');
  await p.evaluate(() => { location.hash = '#/staffwork'; }); await p.waitForTimeout(1000); ok('tRedirect', await p.evaluate(() => location.hash));
  await p.evaluate(() => { location.hash = '#/studio'; }); await p.waitForTimeout(1000); ok('tStudio', await p.evaluate(() => location.hash + ' | ' + document.querySelector('#main').innerText.slice(0, 40)));
  // شبكة الأمان
  ok('emptyBox', await p.evaluate(() => APP.emptyBox('هذه الصفحة لحساب المالك فقط', 'يمنحها المالك من الإعدادات')));
  await p.evaluate(() => APP.toast('ليست لديك صلاحية — المالك أو صلاحية الحضور', 'err')); ok('toast', await p.$eval('#toasts .toast:last-child', e => e.textContent));
  ok('mainNoOwner', await p.evaluate(() => !/المالك/.test(document.querySelector('#main').innerText)));
  await p.screenshot({ path: 'p0/t208_teacher.png' });
  console.log(JSON.stringify(R, null, 1)); console.log('errors', errs);
  await b.close(); })();
