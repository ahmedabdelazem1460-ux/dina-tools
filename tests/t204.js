// متابعة السلوك للمالك V.bhadmin + طلبات التوضيح V.clarify (sql/107) — node t204.js
// غير المُحالة، التعديل بسجل، الإحالة الفردية والجماعية، سحب الإحالة، الحالات، طلب التوضيح والرد من الموظف، الإعدادات، الإخفاء عن المعلم
const { chromium } = require('playwright');
const W = [375, 768, 1440];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const R = {}; const ok = (k, v) => { R[k] = v; };
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  const seed = await p.evaluate(async () => { const st = await APP.studentsAll(); const s = st.filter(x => x.active !== false).slice(0, 3); const T = APP.S.staff.filter(x => !x.is_owner && x.active);
    const mk = (x, k, cat, by) => ({ school_id: APP.S.school.id, student_id: x.id, class_id: x.class_id, day: new Date().toISOString().slice(0, 10), kind: k, category: cat, points: 1, note: 'رصد تجريبي ' + cat, referred: false, status: 'open', by_staff: by, created_at: new Date().toISOString(), edits: [] });
    await APP.api.ins('behaviors', [mk(s[0], 'negative', 'استخدام الجوال', T[0].id), mk(s[1], 'negative', 'إزعاج داخل الفصل', T[1].id), mk(s[2], 'positive', 'مشاركة متميزة', T[0].id), mk(s[2], 'negative', 'شجار', T[1].id)]);
    return { n: st.length, t0: T[0].id, t1: T[1].id, t0n: T[0].full_name }; });
  ok('students', seed.n);
  await p.evaluate(() => location.hash = '#/bhadmin'); await p.waitForTimeout(1500);
  ok('pendingCards', await p.$$eval('#baL .ba-card', L => L.length));
  ok('kpiPending', await p.$eval('[data-kp="pending"] b', e => e.textContent));
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300); await p.screenshot({ path: `p0/t204_pending_${w}.png`, fullPage: false }); ok('hscroll' + w, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // تعديل
  await p.click('#baL .ba-card [data-ed]'); await p.waitForTimeout(400);
  await p.screenshot({ path: 'p0/t204_edit.png' });
  await p.fill('#beCatO', 'تصنيف مصحَّح'); await p.fill('#beN', 'ملاحظة مصححة'); await p.fill('#beR', 'رُصد بالخطأ'); await p.click('#beGo'); await p.waitForTimeout(900);
  ok('edited', await p.evaluate(async () => { const L = await APP.api.list('behaviors', {}); const r = L.find(x => x.category === 'تصنيف مصحَّح'); return r ? { n: r.edits.length, reason: r.edits[0].reason, old: r.edits[0].old.category, note: r.note } : null; }));
  ok('editedBadge', await p.$$eval('.ba-card .ed', L => L.length));
  ok('notifToRecorder', await p.evaluate(async t => (await APP.api.list('notifications', { staff_id: t })).concat(await APP.api.list('messages', { recipient_id: t })).filter(n => /عُدِّل سلوك/.test(n.title || n.subject || '')).length, seed.t0));
  await p.click('.ba-card .ed'); await p.waitForTimeout(300); ok('logRows', await p.$$eval('.ba-log td', L => L.length)); await p.screenshot({ path: 'p0/t204_log.png' }); await p.keyboard.press('Escape'); await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
  // إحالة فردية للوكيل
  await p.click('#baL .ba-card [data-rf]'); await p.waitForTimeout(300); await p.click('[data-to="deputy"]'); await p.click('[data-pr="high"]'); await p.fill('#rfN', 'أرجو المتابعة'); await p.click('#rfGo'); await p.waitForTimeout(900);
  ok('referredDeputy', await p.evaluate(async () => (await APP.api.list('behaviors', {})).filter(x => x.referred && x.target === 'deputy' && x.priority === 'high').length));
  ok('pendingAfter1', await p.$$eval('#baL .ba-card', L => L.length));
  // إحالة جماعية
  await p.check('#baAll'); await p.waitForTimeout(200); ok('selBar', !!(await p.$('.ba-sel'))); await p.screenshot({ path: 'p0/t204_bulk.png' });
  await p.click('#baSR'); await p.waitForTimeout(300); await p.click('#rfGo'); await p.waitForTimeout(900);
  ok('pendingAfterBulk', await p.$$eval('#baL .ba-card', L => L.length));
  // كل السلوكيات + سحب إحالة
  await p.click('[data-tb="all"]'); await p.waitForTimeout(900); ok('allCards', await p.$$eval('#baL .ba-card', L => L.length));
  p.once('dialog', d => d.accept());
  await p.click('#baL [data-un]'); await p.waitForTimeout(300); const cb = await p.$('.ovl .btn:not(.ghost)'); if (cb) { const bs = await p.$$('.ovl button'); for (const x of bs) { if ((await x.textContent()).includes('سحب')) { await x.click(); break; } } } await p.waitForTimeout(900);
  ok('unreferred', await p.evaluate(async () => (await APP.api.list('behaviors', {})).filter(x => !x.referred && x.kind === 'negative').length));
  // الحالات: فتح حالة لطالب
  await p.click('[data-tb="cases"]'); await p.waitForTimeout(700); await p.click('#caNew'); await p.waitForTimeout(300); await p.click('#pkL [data-s]'); await p.waitForTimeout(1200);
  ok('caseOpened', await p.evaluate(async () => (await APP.api.list('counsel_cases', {})).length)); await p.screenshot({ path: 'p0/t204_case.png' });
  await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove()));
  // طلب توضيح
  await p.click('[data-tb="clar"]'); await p.waitForTimeout(700); await p.click('#crNew'); await p.waitForTimeout(300);
  await p.check(`#akP input[value="${seed.t0}"]`); await p.waitForTimeout(150); ok('tfWarn', !!(await p.$('#akEn')));
  await p.fill('#akT', 'توضيح تجريبي'); await p.fill('#akB', 'ما سبب رصد هذا السلوك؟'); await p.screenshot({ path: 'p0/t204_ask.png' }); await p.click('#akGo'); await p.waitForTimeout(900);
  ok('reqs', await p.evaluate(async () => (await APP.api.list('clar_requests', {})).length));
  ok('tfEnabled', await p.evaluate(t => { const s = APP.S.school.settings; return s.tfeat.clarify === 'some' && s.tfeatTo.clarify.includes(t); }, seed.t0));
  // الرد من الموظف
  const nav = await p.evaluate(t => { const me = APP.S.staff.find(x => x.id === t); APP.S.realMe = APP.S.me; APP.S.me = { ...me, is_owner: false }; return APP.NAV.filter(APP.navOK).map(n => n[0]); }, seed.t0);
  ok('staffNavClarify', nav.includes('clarify')); ok('staffNavBhadmin', nav.includes('bhadmin'));
  await p.evaluate(() => location.hash = '#/clarify'); await p.waitForTimeout(1000);
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(250); await p.screenshot({ path: `p0/t204_clarify_${w}.png` }); ok('hscrollC' + w, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)); }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.click('#crL [data-th]'); await p.waitForTimeout(500); await p.fill('#ctT', 'رصدته لأن الطالب استخدم الجوال في الحصة'); await p.click('#ctGo'); await p.waitForTimeout(800);
  await p.screenshot({ path: 'p0/t204_thread.png' });
  ok('answered', await p.evaluate(async () => (await APP.api.list('clar_requests', {}))[0].status));
  ok('readAt', await p.evaluate(async () => !!(await APP.api.list('clar_requests', {}))[0].read_at));
  // معلم آخر بلا تفعيل
  const nav2 = await p.evaluate(t => { const me = APP.S.staff.find(x => x.id === t); APP.S.me = { ...me, is_owner: false }; return APP.NAV.filter(APP.navOK).map(n => n[0]); }, seed.t1);
  ok('otherNavClarify', nav2.includes('clarify'));
  // العودة للمالك والإعدادات
  await p.evaluate(() => { document.querySelectorAll('.ovl').forEach(o => o.remove()); APP.S.me = APP.S.realMe; delete APP.S.realMe; location.hash = '#/bhadmin'; }); await p.waitForTimeout(900);
  await p.click('[data-tb="set"]'); await p.waitForTimeout(500); await p.selectOption('#ssRec', 'hours'); await p.fill('#ssH', '12'); await p.uncheck('#ssC'); await p.check('#ssR'); await p.click('#ssGo'); await p.waitForTimeout(700);
  ok('settings', await p.evaluate(() => APP.S.school.settings.bhedit)); await p.screenshot({ path: 'p0/t204_set.png' });
  console.log(JSON.stringify(R, null, 1));
  const pass = R.pendingCards === 3 && R.edited && R.edited.n === 1 && R.edited.reason === 'رُصد بالخطأ' && R.referredDeputy === 1 && R.pendingAfter1 === 2 && R.pendingAfterBulk === 0 && R.allCards === 4 && R.unreferred === 1 && R.caseOpened >= 1
    && R.reqs === 1 && R.tfEnabled && R.staffNavClarify && !R.staffNavBhadmin && R.answered === 'answered' && R.readAt && !R.otherNavClarify && R.settings.rec === 'hours' && R.settings.hours === 12 && !R.settings.cnsl
    && !R.hscroll375 && !R.hscroll768 && !R.hscroll1440 && !R.hscrollC375;
  console.log(pass ? 'PASS' : 'FAIL'); console.log('ERRS', errs); await b.close(); })();
