// مرونة ربط الأبناء + النداء الآلي للاستئذان: family.html (محاكاة + موقع وهمي)، V.pcall وإدارة العائلة (وضع التجربة)، call.html — node t199.js
const { chromium } = require('playwright');
const fs = require('fs'); fs.mkdirSync('p0', { recursive: true });
const U = 'http://localhost:8766/';
const KIDS = [{ id: 'k1', name: 'إياد علي حوفان', class: 'ثاني ثانوي أ' }, { id: 'k2', name: 'عمار علي حوفان', class: 'أول متوسط أ' }];
const now = () => new Date().toISOString(), today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
(async () => {
  const b = await chromium.launch(); const res = {}; const errs = [];
  // ---------- 1) بوابة ولي الأمر ----------
  const ctx = await b.newContext({ viewport: { width: 375, height: 812 }, geolocation: { latitude: 21.55, longitude: 39.2 }, permissions: ['geolocation'] });
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push('fam: ' + e.message));
  const calls = []; const sent = {};
  let C = [];
  await p.route('**/rest/v1/rpc/*', async r => { const fn = r.request().url().split('/').pop(), a = JSON.parse(r.request().postData() || '{}'); (sent[fn] = sent[fn] || []).push(a);
    let out = {};
    if (fn === 'fam_home') out = { school: 'مدارس دينا العالمية', parent: 'علي', unread: 0, pickup: true, requests: sent.fam_link_req ? [{ name: 'محمد الحارثي', at: now() }] : [], cfg: { att: true, res: true, beh: 'none', msg: 'off', excuse: true, reports: true, auto: true, practice: false, selfLink: true }, kids: KIDS };
    else if (fn === 'fam_child') out = { student: { id: a.p_student, name: KIDS.find(k => k.id === a.p_student).name, class: 'ثاني ثانوي أ' }, plan: [], quizzes: [], results: [], resources: [], weeks: [], att: { since: today(), present: 1, days: [], periods: [] }, excuses: [], reports: [] };
    else if (fn === 'fam_link_req') out = a.p_code === 'ABCD-EFGH' && a.p_no === '2225' ? { ok: true, name: 'محمد الحارثي' } : { error: 'BAD_CODE' };
    else if (fn === 'fam_pickup_list') out = { cfg: { approve: true, auto: true, radius: 300, lat: 21.5, lng: 39.2, stages: { coming: true, release: true, handover: true }, from: '06:30', to: '14:00', confirm: true, alerts: true }, calls: C };
    else if (fn === 'fam_pickup_req') { C.unshift({ id: 'c1', student: a.p_student, name: KIDS.find(k => k.id === a.p_student).name, class: 'ثاني ثانوي أ', day: today(), reason: a.p_reason, person: a.p_person, status: 'approved', trail: [{ st: 'requested', at: now(), name: 'ولي الأمر' }, { st: 'approved', at: now(), name: 'أ. أحمد' }] }); out = { id: 'c1', status: 'approved' }; }
    else if (fn === 'fam_pickup_arrive') { const near = a.p_lat < 21.502; const c = C[0]; if (near) { c.status = 'called'; c.trail.push({ st: 'called', at: now(), name: 'ولي الأمر' }); } else if (c.status === 'approved') { c.status = 'coming'; c.trail.push({ st: 'coming', at: now(), name: 'ولي الأمر' }); } out = { dist: near ? 150 : 5560, near, status: c.status }; }
    else if (fn === 'fam_pickup_cancel') out = { ok: true };
    else if (fn === 'fam_pickup_confirm') { C[0].status = 'done'; C[0].trail.push({ st: 'done', at: now(), name: 'ولي الأمر' }); out = { ok: true, status: 'done' }; }
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) }); });
  await p.goto(U + 'family.html'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('dina_fam_t', 'T1'); }); await p.goto(U + 'family.html'); await p.waitForTimeout(900);
  res.navPick = await p.$$eval('.bnav [data-go="pick"]', x => x.length);
  // طلب ربط ابن
  await p.click('#lnk'); await p.fill('#lc', 'abcdefgh'); await p.fill('#ln', '2225'); await p.click('#ls'); await p.waitForTimeout(900);
  res.linkArgs = sent.fam_link_req && sent.fam_link_req[0].p_code; res.pendingChip = await p.$$eval('.kids .kid', x => x.some(e => e.textContent.includes('بانتظار')));
  // الاستئذان
  await p.click('.bnav [data-go="pick"]'); await p.waitForTimeout(500);
  await p.screenshot({ path: 'p0/t199_pick_form_375.png', fullPage: true });
  await p.selectOption('#pr', 'موعد طبي'); await p.fill('#pp', 'الأب علي'); await p.click('#ps2'); await p.waitForTimeout(700);
  res.reqArgs = sent.fam_pickup_req && { kid: sent.fam_pickup_req[0].p_student, reason: sent.fam_pickup_req[0].p_reason, person: sent.fam_pickup_req[0].p_person };
  res.stepsOn = await p.$$eval('.stp li.on', x => x.length);
  await p.click('[data-gt="c1"]'); await p.waitForTimeout(1500);
  res.far = await p.$eval('[role="status"]', e => e.textContent).catch(() => '');
  res.statusComing = C[0].status;
  await ctx.setGeolocation({ latitude: 21.5012, longitude: 39.2 }); await p.waitForTimeout(16500);
  res.statusCalled = C[0].status; res.arrive = (sent.fam_pickup_arrive || []).length;
  await p.waitForTimeout(400); res.calledNote = await p.$$eval('.pk-called', x => x.length); res.cfBtnCalled = await p.$$eval('[data-cf]', x => x.length);
  // المدرسة تسلّم ← ولي الأمر يتلقى تنبيهاً وشريطاً في صفحة أخرى ثم يؤكد
  await p.click('.bnav [data-go="home"]'); await p.waitForTimeout(500);
  C[0].status = 'handed'; C[0].trail.push({ st: 'handed', at: now(), name: 'حارس البوابة' });
  await p.waitForTimeout(21000);
  res.toastHanded = await p.evaluate(() => [...document.querySelectorAll('.toast')].map(t => t.textContent).join('|'));
  res.banner = await p.$eval('#pkb', e => e.textContent.trim()).catch(() => '');
  await p.screenshot({ path: 'p0/t199_banner_375.png' });
  await p.click('#pkb [data-go3]'); await p.waitForTimeout(600); await p.click('[data-cf="c1"]'); await p.waitForTimeout(700);
  res.confirmed = C[0].status; res.afterConfirm = await p.$$eval('.pk-act', x => x.length);
  for (const [w, h] of [[375, 812], [768, 1024], [1440, 900]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250); res['fh' + w] = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); await p.screenshot({ path: `p0/t199_pick_${w}.png`, fullPage: true }); }
  await ctx.close();

  // ---------- 2) المنصة ----------
  const q = await b.newPage({ viewport: { width: 1440, height: 900 } }); q.on('pageerror', e => errs.push('pcall: ' + e.message));
  await q.goto(U + 'index.html?demo=1'); await q.click('[data-demo="a.abdelazim@dinaschool.com"]'); await q.waitForTimeout(2000);
  await q.evaluate(() => { location.hash = '#/pcall'; }); await q.waitForTimeout(900);
  res.tabs = await q.$$eval('[data-pt]', x => x.map(e => e.dataset.pt));
  await q.click('#pcNew'); await q.waitForTimeout(600); await q.fill('#ncP', 'الأب'); await q.click('#ncGo'); await q.waitForTimeout(900);
  res.callCol = await q.$$eval('.pc-col', x => x.map(e => e.querySelectorAll('.pc-card').length));
  await q.screenshot({ path: 'p0/t199_board_1440.png' });
  await q.click('[data-pa="release"]'); await q.waitForTimeout(500); await q.click('[data-pa="done"]'); await q.waitForTimeout(500);
  res.trail = await q.evaluate(() => APP.__pickDemo.calls[0].trail.map(t => t.st));
  await q.click('[data-pt="log"]'); await q.waitForTimeout(600); res.logRows = await q.$$eval('#lgL tbody tr', x => x.length);
  await q.click('[data-pt="set"]'); await q.waitForTimeout(600);
  await q.fill('#ssL', 'https://www.google.com/maps/place/Dina/@21.5433,39.1728,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d21.54331!4d39.17288'); await q.waitForTimeout(200);
  res.parsed = [await q.inputValue('#ssLa'), await q.inputValue('#ssLo')];
  res.parse2 = await q.evaluate(() => [APP.parseLatLng('21.4858, 39.1925'), APP.parseLatLng('https://maps.google.com/?q=21.5,39.2'), APP.parseLatLng('بدون')]);
  await q.selectOption('#ssM', 'all'); await q.click('#ssTok'); await q.click('[data-pk="gate"] input >> nth=0'); await q.click('#ssSave'); await q.waitForTimeout(800);
  res.saved = await q.evaluate(() => { const c = APP.S.school.settings.pickup; return { mode: c.mode, lat: c.lat, tok: (c.token || '').length, gate: c.staff.gate.length, radius: c.radius }; });
  for (const [w, h] of [[375, 812], [768, 1024]]) { await q.setViewportSize({ width: w, height: h }); await q.waitForTimeout(250); res['ps' + w] = await q.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); await q.screenshot({ path: `p0/t199_set_${w}.png` }); }
  await q.setViewportSize({ width: 1440, height: 900 });
  // إدارة العائلة (مرونة الجوال)
  await q.evaluate(() => { location.hash = '#/stucodes'; }); await q.waitForTimeout(800); await q.click('[data-fa="par"]'); await q.waitForTimeout(600); await q.click('#faGen'); await q.waitForTimeout(800);
  await q.click('[data-mg] >> nth=0'); await q.waitForTimeout(500); res.manage = await q.$$eval('.ovl #mgNP, .ovl #mgQ', x => x.length);
  await q.screenshot({ path: 'p0/t199_manage_1440.png' }); await q.click('.ovl .x');
  await q.click('#faAdd'); await q.waitForTimeout(400); await q.fill('#mgP', '0599999911'); await q.fill('#mgQ', (await q.evaluate(async () => (await APP.api.list('students', {}))[0].full_name.split(' ')[0])));
  await q.waitForTimeout(400); await q.click('#mgL input >> nth=0'); await q.click('#mgSave'); await q.waitForTimeout(600);
  res.addFam = await q.evaluate(() => (window.__x = 1));
  // معلم بلا تفعيل
  res.tNav = await q.evaluate(() => { APP.S.me = APP.S.staff.find(s => !s.is_owner); APP.S.school.settings.tfeat = {}; return APP.NAV.find(x => x[0] === 'pcall')[2](); });
  res.tNavOn = await q.evaluate(() => { APP.S.school.settings.tfeat = { pcall: true }; APP.hasModule = k => k === 'deputy'; return APP.NAV.find(x => x[0] === 'pcall')[2](); });
  await q.close();

  // ---------- 3) شاشة النداء ----------
  const s = await b.newPage({ viewport: { width: 1440, height: 900 } }); s.on('pageerror', e => errs.push('call: ' + e.message));
  let SC = [{ id: 'x1', name: 'عمار علي حوفان', class: 'أول متوسط أ', class_id: 'c9', status: 'called', person: 'الأب', at: now() }], rel = 0;
  await s.route('**/rest/v1/rpc/*', async r => { const fn = r.request().url().split('/').pop(); let out;
    if (fn === 'pickup_screen') out = { school: 'مدارس دينا العالمية', voice: false, classes: [{ id: 'c9', name: 'أول متوسط أ' }], calls: SC };
    else { rel++; SC[0].status = 'released'; out = { ok: true }; }
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(out) }); });
  await s.goto(U + 'call.html?t=TESTTOKEN1234567890'); await s.waitForTimeout(300); res.overlay = await s.$$eval('.ov', x => x.length);
  await s.click('#go'); await s.waitForTimeout(700); res.card = await s.$eval('.call .nm', e => e.textContent);
  await s.screenshot({ path: 'p0/t199_screen_1440.png' });
  await s.click('[data-r="x1"]'); await s.waitForTimeout(700); res.released = rel === 1 && await s.$$eval('.call.rel', x => x.length) === 1;
  await s.evaluate(() => document.fullscreenElement && document.exitFullscreen()).catch(() => { }); await s.waitForTimeout(300); await s.setViewportSize({ width: 375, height: 812 }); await s.waitForTimeout(200); res.sh375 = await s.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); await s.screenshot({ path: 'p0/t199_screen_375.png' });
  await s.goto(U + 'call.html'); await s.waitForTimeout(300); res.noTok = await s.$eval('#m', e => e.textContent.includes('الرابط'));
  await s.close();

  console.log(JSON.stringify(res, null, 1));
  const ok = res.navPick === 1 && res.linkArgs === 'ABCD-EFGH' && res.pendingChip && res.reqArgs && res.reqArgs.kid === 'k1' && res.reqArgs.person === 'الأب علي' && res.stepsOn >= 2
    && res.statusComing === 'coming' && res.statusCalled === 'called' && res.calledNote === 1 && res.cfBtnCalled === 1 && /أكّد الاستلام/.test(res.toastHanded) && /أكّد الاستلام/.test(res.banner) && res.confirmed === 'done' && res.afterConfirm === 0 && !res.fh375 && !res.fh768
    && res.tabs.join() === 'today,log,set' && res.callCol[2] === 1 && res.trail.join() === 'requested,approved,called,released,done' && res.logRows >= 1
    && res.parsed[0] === '21.54331' && res.parsed[1] === '39.17288' && res.parse2[0] && res.parse2[0].lat === 21.4858 && res.parse2[1] && res.parse2[1].lng === 39.2 && res.parse2[2] === null
    && res.saved.mode === 'all' && res.saved.lat === 21.54331 && res.saved.tok >= 16 && res.saved.gate === 1 && !res.ps375
    && res.manage === 2 && res.tNav === false && res.tNavOn === true && res.overlay === 1 && /عمار/.test(res.card) && res.released && !res.sh375 && res.noTok;
  console.log(ok ? 'PASS' : 'FAIL'); console.log('ERRS', errs); await b.close(); process.exit(ok ? 0 : 1);
})();
