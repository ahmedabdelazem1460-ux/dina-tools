// اسم الجدول المعتمد ومصدره (الشيت) وتاريخه للمالك وحده + شريط مزامنة الشيت للمالك وحده — node t210.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const R = {}; const ok = (k, v) => { R[k] = v; };
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  const LBL = 'الجدول الحالي (منقول من شيت الخطة)';
  await p.evaluate(async L => { const A = APP; const vs = await A.api.ttVersions(A.S.sectionId); const v = vs.find(x => x.status === 'approved'); await A.api.updateDraft(v.id, { label: L });
    const w = A.week(); if (w) w.sheet_id = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'; }, LBL);
  // المالك
  await p.evaluate(() => { location.hash = '#/timetable'; }); await p.waitForTimeout(1500);
  ok('ownerHead', await p.evaluate(() => (document.querySelector('#view .sub, main .sub') || {}).textContent || ''));
  ok('ownerName', await p.evaluate(L => APP.verName({ label: L, approved_at: new Date().toISOString() }), LBL));
  ok('ownerWhen', await p.evaluate(() => APP.verWhen({ approved_at: new Date().toISOString() }) !== ''));
  await p.screenshot({ path: 'p0/t210_owner_tt.png' });
  await p.evaluate(() => { location.hash = '#/dash'; }); await p.waitForTimeout(1500);
  ok('ownerSyncbar', !!(await p.$('.syncbar')));
  // غير المالك (نفس الصلاحيات)
  await p.evaluate(() => { APP.S.me = { ...APP.S.me, is_owner: false }; });
  ok('otherName', await p.evaluate(L => APP.verName({ label: L }), LBL));
  ok('otherWhen', await p.evaluate(() => APP.verWhen({ approved_at: new Date().toISOString() })));
  await p.evaluate(() => { location.hash = '#/home'; }); await p.waitForTimeout(500);
  await p.evaluate(() => { location.hash = '#/timetable'; }); await p.waitForTimeout(1500);
  const txt = await p.evaluate(() => document.body.innerText);
  ok('otherSeesSheet', /شيت/.test(txt));
  await p.screenshot({ path: 'p0/t210_other_tt.png' });
  await p.evaluate(() => { location.hash = '#/dash'; }); await p.waitForTimeout(1500);
  ok('otherSyncbar', !!(await p.$('.syncbar')));
  ok('errs', errs);
  console.log(JSON.stringify(R, null, 1)); await b.close();
})();
