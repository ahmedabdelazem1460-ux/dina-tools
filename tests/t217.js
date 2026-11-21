// اللجان والمقاعد V.lijan + lijan.html — node t217.js
// إنشاء توزيع، اختيار المراحل/الصفوف، كشاف الأعداد بالتناسب ومؤشرات المتبقي، التوزيع والتثبيت والنقل، الكروكي ثلاثي الأبعاد (الباب يمين/يسار، السحب)،
// جدول الاختبارات، التقارير، Excel، رابط أولياء الأمور، الحفظ والاعتماد، والإخفاء عن المعلم، ثم صفحة lijan.html بردود محاكاة — ثلاثة مقاسات
const { chromium } = require('playwright');
const W = [375, 768, 1440];
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const R = {}; const ok = (k, v) => { R[k] = v; };
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  ok('navItem', await p.evaluate(() => APP.NAV.some(n => n[0] === 'lijan')));
  await p.evaluate(() => { APP.LS.set('lj_open', ''); location.hash = '#/lijan'; }); await p.waitForTimeout(1200);
  await p.click('#ljNew'); await p.waitForTimeout(600);
  await p.click('#ljAll'); await p.waitForTimeout(600);
  const nStu = await p.evaluate(() => APP.S.classes.length);
  ok('kpiStudents', await p.$eval('#ljKp div:first-child b', x => x.textContent));
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(200); await p.screenshot({ path: `p0/t217_cls_${w}.png`, fullPage: w === 375 }); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // اللجان والأعداد
  await p.click('[data-tb="rooms"]'); await p.waitForTimeout(400);
  await p.click('#ljBulk'); await p.fill('#bN', '3'); await p.fill('#bC', '16'); await p.click('#bGo'); await p.waitForTimeout(400);
  ok('rooms', await p.$$eval('[data-cap]', L => L.length));
  await p.click('#ljAq'); await p.waitForTimeout(400);
  ok('quotaFooter', await p.$$eval('.lj-mx tfoot .lj-left', L => L.map(x => x.textContent)));
  // تعديل يدوي: أول خانة +٢ يظهر «زيادة»
  const q0 = await p.$('[data-q="0"]'); const v0 = await q0.inputValue(); await q0.fill(String((+v0.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) || 0) + 30)); await q0.press('Tab'); await p.waitForTimeout(300);
  ok('overIndicator', await p.$$eval('.lj-left.n', L => L.length > 0));
  await p.click('#ljAq'); await p.waitForTimeout(300);
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(200); await p.screenshot({ path: `p0/t217_rooms_${w}.png` }); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // التوزيع
  await p.click('[data-tb="seat"]'); await p.waitForTimeout(300);
  await p.selectOption('#sN', 'room100'); await p.fill('#sP', 'M'); await p.press('#sP', 'Tab');
  await p.click('#sGo'); await p.waitForTimeout(600);
  const seat = await p.evaluate(() => { const L = APP.S && window.__lj; return null; });
  ok('seatRows', await p.$$eval('#sB tr', L => L.length)); ok('firstLabel', await p.$eval('#sB tr b', x => x.textContent));
  ok('room3d', await p.$$eval('#sV .lj-seat', L => L.length));
  // نقل طالب للجنة ٢ (يُثبَّت)
  const mv = await p.$('[data-mv]'); await mv.selectOption('1'); await p.waitForTimeout(400);
  ok('lockedAfterMove', await p.$$eval('[data-rm="1"]', L => L.length) > 0);
  await p.click('[data-rm="1"]'); await p.waitForTimeout(300); ok('lockedRow', await p.$$eval('#sB tr.lj-locked', L => L.length));
  await p.click('#sKeep'); await p.waitForTimeout(500); await p.click('[data-rm="1"]'); await p.waitForTimeout(300); ok('lockKept', await p.$$eval('#sB tr.lj-locked', L => L.length));
  await p.click('.lj-seat >> nth=2'); await p.waitForTimeout(200); ok('seatHighlight', await p.$$eval('#sV .lj-on', L => L.length));
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(200); await p.screenshot({ path: `p0/t217_seat_${w}.png`, fullPage: true }); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // الكروكي
  await p.click('[data-tb="map"]'); await p.waitForTimeout(400);
  ok('map3dRooms', await p.$$eval('#m3d .lj-room', L => L.length));
  await p.click('[data-dr="l"]'); await p.waitForTimeout(300); ok('doorLeft', await p.evaluate(() => document.querySelector('[data-dr="l"]').classList.contains('on')));
  await p.fill('#pR', '4'); await p.press('#pR', 'Tab'); await p.waitForTimeout(300);
  ok('roomSeats', await p.$$eval('#mRoom .lj-seat', L => L.length));
  // سحب اللجنة الأولى في المخطط العلوي
  const g = await p.$('#mTop .lj-tr rect'); const bb = await g.boundingBox(); const before = await p.evaluate(() => 0);
  await p.mouse.move(bb.x + 20, bb.y + 20); await p.mouse.down(); await p.mouse.move(bb.x + 20, bb.y + 140, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400);
  ok('dragged', await p.$eval('#mTop .lj-tr rect', r => +r.getAttribute('y')) > bb.y - 1000);
  await p.selectOption('#mMk', 'stairs'); await p.waitForTimeout(300); ok('mark', await p.$$eval('#m3d text', L => L.some(t => t.textContent.includes('الدرج'))));
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(200); await p.screenshot({ path: `p0/t217_map_${w}.png`, fullPage: true }); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // جدول الاختبارات
  await p.click('[data-tb="sched"]'); await p.waitForTimeout(300);
  await p.click('#hAdd'); await p.waitForTimeout(200); await p.fill('[data-i="0"][data-k="d"]', '2026-12-06'); await p.press('[data-i="0"][data-k="d"]', 'Tab'); await p.waitForTimeout(200);
  await p.fill('[data-i="0"][data-k="subj"]', 'الرياضيات'); await p.press('[data-i="0"][data-k="subj"]', 'Tab');
  await p.click('[data-dup="0"]'); await p.waitForTimeout(200); ok('schedRows', await p.$$eval('[data-del]', L => L.length)); ok('dayName', await p.$eval('.lj-sched tbody tr td:nth-child(2)', x => x.textContent));
  // رابط أولياء الأمور + حفظ
  await p.click('[data-tb="share"]'); await p.waitForTimeout(300);
  await p.check('#shOn'); await p.fill('#shM', 'الحضور قبل الاختبار بربع ساعة'); await p.click('#shSv'); await p.waitForTimeout(800);
  ok('qr', await p.$$eval('.lj-qr svg', L => L.length)); ok('link', await p.$eval('input[readonly]', x => x.value));
  await p.screenshot({ path: 'p0/t217_share_1440.png', fullPage: true });
  // التقارير
  await p.click('[data-tb="print"]'); await p.waitForTimeout(300);
  for (const k of ['lists', 'byclass', 'doors', 'cards', 'matrix', 'map', 'desks', 'proctors', 'seats', 'sched']) {
    await p.click(`[data-r="${k}"]`); await p.waitForTimeout(900);
    const fr = p.frames().find(f => f !== p.mainFrame() && f.url() === 'about:blank' || f.name() === 'rsF');
    const has = await p.$('.rs-ov'); ok('rep_' + k, !!has);
    if (has && ['doors', 'cards', 'map', 'lists'].includes(k)) { await p.waitForTimeout(400); await p.screenshot({ path: `p0/t217_rep_${k}.png` }); }
    if (has) { await p.click('#rsX'); await p.waitForTimeout(250); }
  }
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('#pX')]); ok('excel', dl ? dl.suggestedFilename() : null);
  // اعتماد
  await p.click('#ljApp'); await p.waitForTimeout(800); const cb = await p.$('.modal .btn:not(.ghost)'); if (cb) { await cb.click(); await p.waitForTimeout(800); }
  ok('approved', await p.$eval('.lj-hd .lj-st', x => x.textContent));
  const row = await p.evaluate(async () => (await APP.api.list('exam_committees', {}))[0]);
  ok('saved', { rooms: row.rooms.length, seating: row.seating.length, status: row.settings.status, sched: row.settings.sched.length, share: row.settings.share.on, tok: (row.settings.share.token || '').length });
  // العودة للقائمة
  await p.click('#ljBack'); await p.waitForTimeout(600); ok('listCards', await p.$$eval('.lj-card', L => L.length));
  // تبويب لجان الاختبارات في الاختبارات الورقية يعرض الصفحة الجديدة
  await p.evaluate(() => { APP.LS.set('pp_t', 'comm'); APP.LS.set('as_t', 'paper'); location.hash = '#/assess'; }); await p.waitForTimeout(1500);
  ok('embedInPaper', await p.$$eval('#ppB .lj-card', L => L.length));
  // المعلم بلا تفعيل لا يرى البند
  ok('teacherHidden', await p.evaluate(() => { const me = APP.S.me; APP.S.me = Object.assign({}, me, { is_owner: false }); const v = APP.NAV.find(n => n[0] === 'lijan')[2](); APP.S.me = me; return !v; }));

  // ===== lijan.html بردود محاكاة =====
  const pub = { title: 'اختبارات الفصل الأول', school: 'مدارس دينا العالمية', section: 'قسم البنين', msg: 'الحضور قبل الاختبار بربع ساعة', lookup: 'id', total: 40,
    sched: [{ d: '2026-12-06', from: '07:30', to: '09:00', subj: 'الرياضيات', grades: 'الرابع — السادس' }, { d: '2026-12-07', from: '07:30', to: '09:00', subj: 'العلوم' }],
    map: { blds: ['المبنى الرئيسي'], marks: [{ icon: '🪜', label: 'الدرج', x: 20, y: 6, f: 0 }] },
    rooms: [{ name: 'لجنة ١', x: 0, y: 0, f: 0, w: 4, d: 3, door: 'r', rows: 5, cols: 4, n: 18, first: 'M101', last: 'M118', classes: ['رابع أ', 'سادس أ'] }, { name: 'لجنة ٢', x: 5, y: 0, f: 0, w: 4, d: 3, door: 'l', rows: 5, cols: 4, n: 12, first: 'M201', last: 'M212' }, { name: 'لجنة ٣', x: 0, y: 0, f: 1, w: 5, d: 3, door: 'r', rows: 4, cols: 5, n: 10, first: 'M301', last: 'M310', notes: 'الصعود من الدرج الشرقي' }] };
  const q = await ctx.newPage(); q.on('pageerror', e => errs.push('lijan.html: ' + e.message));
  await q.route('**/rest/v1/rpc/lijan_public', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(pub) }));
  await q.route('**/rest/v1/rpc/lijan_find', async r => { const bd = JSON.parse(r.request().postData()); r.fulfill({ status: 200, contentType: 'application/json', body: bd.p_q === '12345' ? JSON.stringify({ name: 'فيصل العتيبي', cls: 'رابع أ', room: 1, label: 'M205', seat: 205, k: 4 }) : 'null' }); });
  for (const w of W) {
    await q.setViewportSize({ width: w, height: 900 }); await q.goto('http://localhost:8766/lijan.html?t=abcdefghijklmnop1234'); await q.waitForTimeout(900);
    if (w === 375) { ok('pubRooms', await q.$$eval('.rc', L => L.length)); ok('pubMap', await q.$$eval('#mv .lj-room', L => L.length)); }
    await q.screenshot({ path: `p0/t217_pub_${w}.png`, fullPage: true });
    await q.fill('#fq', '99999'); await q.click('#ff button'); await q.waitForTimeout(400); if (w === 375) ok('pubMiss', await q.$eval('.err', x => x.textContent.slice(0, 20)));
    await q.fill('#fq', '١٢٣٤٥'.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))); await q.click('#ff button'); await q.waitForTimeout(600);
    if (w === 375) { ok('pubSeat', await q.$eval('.seat .n', x => x.textContent)); ok('pubHl', await q.$$eval('.res .lj-on', L => L.length)); ok('pubMapHl', await q.$$eval('#mv .lj-room.lj-on', L => L.length)); }
    await q.screenshot({ path: `p0/t217_pubfound_${w}.png`, fullPage: true });
    ok('pubOverflow' + w, await q.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1));
  }
  await q.click('.rc >> nth=2'); await q.waitForTimeout(300); ok('pubDlg', await q.$$eval('.dlg .lj-seat', L => L.length)); await q.screenshot({ path: 'p0/t217_pubdlg_375.png' });
  await q.keyboard.press('Escape'); ok('dlgClosed', !(await q.$('.dlg')));
  ok('errors', errs);
  console.log(JSON.stringify(R, null, 1)); await b.close();
})();
