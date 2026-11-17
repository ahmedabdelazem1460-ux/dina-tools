// تأمين الحصص الاحترافي (sql/109) — node t207.js
// الغائبون ← الفصل الخالي يُقدَّم معلمه، القيود (مستثنى/حد يومي)، الحفظ والاعتماد، النموذج المعتمد بالتوقيعات الثلاثية والتوقيع التلقائي،
// توقيع المعلم البديل من حسابه، الصلاحيات المقسّمة، الطباعة بهوية دينا، وإخفاء الصفحة عن غير المخوَّل بلا رسالة
const { chromium } = require('playwright');
const W = [375, 768, 1440];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const R = {}; const ok = (k, v) => { R[k] = v; };
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  // نختار يوماً دراسياً قادماً (الأحد القادم)
  const day = await p.evaluate(() => { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); return APP.isoDate(d); });
  await p.evaluate(dd => { localStorage.setItem('dina_sb_day', JSON.stringify(dd)); APP.LS.set('sb_day', dd); APP.LS.set('sb_t', 'cover'); APP.LS.set('studio_t', 'standby'); location.hash = '#/studio'; }, day);
  await p.waitForTimeout(2200);
  ok('ownerBtns', await p.$$eval('#sbRules,#sbForm,#sbPerm', L => L.length));
  // أول معلمَين لهما حصص يوم الأحد
  const info = await p.evaluate(async () => { const vers = await APP.api.list('timetable_versions', { status: 'approved' }); const cur = vers.find(v => v.section_id === APP.S.sectionId); const sl = await APP.api.list('timetable_slots', { version_id: cur.id }); const d0 = sl.filter(x => x.day === 0 && x.teacher_id && x.subject_id); const T = [...new Set(d0.map(x => x.teacher_id))]; return { T, slots: d0.length, abs: T[0], emptyCls: d0.find(x => x.teacher_id === T[1]).class_id, emptyP: d0.find(x => x.teacher_id === T[1]).period, freedT: T[1] }; });
  ok('sundaySlots', info.slots);
  await p.check(`[data-ab="${info.abs}"]`); await p.waitForTimeout(900);
  const nRows = await p.$$eval('[data-sub]', L => L.length); ok('needRows', nRows);
  // الفصل الخالي: معلمه (T[1]) يصير متاحاً في تلك الحصة وبأولوية
  await p.click('.sb-emp summary').catch(() => { });
  await p.check(`[data-ec="${info.emptyCls}"]`); await p.waitForTimeout(900);
  const ep = await p.$$eval(`[data-ep^="${info.emptyCls}|"]`, L => L.length); ok('emptyPeriodsBtns', ep);
  ok('whyTags', await p.$$eval('.sb-why', L => [...new Set(L.map(x => x.textContent))]));
  ok('emptyPrio', await p.evaluate(t => [...document.querySelectorAll('[data-sub]')].some(s => s.value === t && s.closest('tr').querySelector('.sb-why.sb-wE')), info.freedT));
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300); await p.screenshot({ path: `p0/t207_cover_${w}.png`, fullPage: false }); ok('hscroll_' + w, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // القيود: استثناء معلم + حد يومي
  await p.click('#sbRules'); await p.waitForTimeout(500);
  const victim = await p.evaluate(() => { const s = [...document.querySelectorAll('[data-sub]')].find(x => x.value); return s && s.value; });
  await p.selectOption(`tr[data-t="${victim}"] [data-f="mode"]`, 'never'); await p.fill(`tr[data-t="${victim}"] [data-f="why"]`, 'رائد النشاط');
  await p.screenshot({ path: 'p0/t207_rules.png' });
  await p.click('#ruOk'); await p.waitForTimeout(1500);
  ok('rulesSaved', await p.evaluate(v => { const s = APP.section().standby; return s.rules[v] && s.rules[v].mode === 'never' && s.excl.includes(v); }, victim));
  // صفحة تُعاد بعد الحفظ — نعود لتبويب التأمين
  await p.waitForTimeout(800);
  ok('victimNotPicked', await p.evaluate(v => ![...document.querySelectorAll('[data-sub]')].some(s => s.value === v), victim));
  // نموذج الاعتماد: توقيع تلقائي للمدير الأكاديمي برسم
  await p.click('#sbForm'); await p.waitForTimeout(700);
  ok('defaultSigs', await p.$$eval('.sb-sg [data-k="name"]', L => L.map(x => x.value)));
  await p.click('[data-draw="1"]'); await p.waitForTimeout(300);
  const box = await p.$('#dpC'); const bb = await box.boundingBox(); await p.mouse.move(bb.x + 40, bb.y + 60); await p.mouse.down(); await p.mouse.move(bb.x + 200, bb.y + 90, { steps: 8 }); await p.mouse.move(bb.x + 300, bb.y + 40, { steps: 8 }); await p.mouse.up();
  await p.click('#dpS'); await p.waitForTimeout(300); ok('padImg', await p.$$eval('.sb-sgi', L => L.length));
  await p.screenshot({ path: 'p0/t207_form.png' });
  await p.click('#ffOk'); await p.waitForTimeout(1200);
  ok('vault', await p.evaluate(async () => (await APP.api.list('owner_vault', { key: 'sbsig:ad' })).length));
  // إعادة الغياب (الصفحة أُعيد رسمها) ثم الاعتماد
  await p.evaluate(() => { APP.LS.set('sb_t', 'cover'); }); await p.waitForTimeout(500);
  if (!(await p.$(`[data-ab="${info.abs}"]:checked`))) { await p.check(`[data-ab="${info.abs}"]`); await p.waitForTimeout(900); }
  await p.click('#cvAp'); await p.waitForTimeout(400); const cb = await p.$('.modal .btn:not(.ghost)'); if (cb && await p.$('#cbOk, .confirm')) await cb.click();
  await p.waitForTimeout(2000);
  ok('approvedPill', await p.$$eval('.pill.st-approved', L => L.some(x => x.textContent.trim() === 'معتمد')));
  ok('formTable', await p.$$eval('#cvForm table tbody tr', L => L.length));
  ok('formSigs', await p.$$eval('#cvForm .sb-sigs > div', L => L.map(x => x.querySelector('b').textContent + '|' + (x.querySelector('img') ? 'img' : '-'))));
  ok('locked', await p.$$eval('[data-sub]', L => L.length) === 0 && !!(await p.$('#cvRe')));
  await p.screenshot({ path: 'p0/t207_approved.png', fullPage: true });
  // الطباعة بهوية دينا
  await p.click('#cvPr'); await p.waitForTimeout(2000);
  const fr = p.frames().find(f => f !== p.mainFrame() && /sb-sigs|توقيع المعلم/.test('')) || null;
  ok('printOv', !!(await p.$('.rs-ov')));
  const pf = await p.$('.rs-ov iframe'); const pfc = pf && await pf.contentFrame();
  if (pfc) { ok('printHas', await pfc.evaluate(() => ({ t: /نموذج تأمين حصص الانتظار/.test(document.body.innerText), sig: document.querySelectorAll('.sb-sigs > div').length, img: document.querySelectorAll('.sb-sigs img').length, logo: !!document.querySelector('img[src*="mark"],svg') }))); }
  await p.screenshot({ path: 'p0/t207_print.png' });
  await p.click('#rsX').catch(() => { }); await p.waitForTimeout(400);
  // المعلم البديل يوقّع من حسابه (sbsign مفعّل له)
  const sub = await p.evaluate(async d => (await APP.api.list('substitutions', { day: d })).find(x => x.sub_teacher), day);
  await p.evaluate(async s => { const st = APP.S.school.settings || (APP.S.school.settings = {}); st.tfeat = Object.assign({}, st.tfeat, { sbsign: true }); const t = APP.S.staff.find(x => x.id === s.sub_teacher); APP.S.realMe = null; APP.S.me = Object.assign({}, t, { is_owner: false }); await APP.api.ups('staff_signatures', [{ staff_id: t.id, img: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }], 'staff_id'); APP.renderNav(); location.hash = '#/standby'; }, sub);
  await p.waitForTimeout(1800);
  ok('teacherNav', await p.$$eval('#nav a[href="#/standby"]', L => L.length));
  ok('teacherSees', await p.$$eval('[data-sg]', L => L.length));
  ok('teacherNoOwnerText', await p.evaluate(() => !/المالك/.test(document.querySelector('#main').innerText)));
  await p.setViewportSize({ width: 375, height: 800 }); await p.screenshot({ path: 'p0/t207_teacher_375.png' }); await p.setViewportSize({ width: 1440, height: 900 });
  await p.click(`[data-sg="${sub.id}"]`); await p.waitForTimeout(900);
  ok('signed', await p.evaluate(async id => !!(await APP.api.list('substitutions', { id }))[0].sig_at, sub.id));
  // معلم بلا تفعيل ولا صلاحية: لا بند ولا رسالة — يُعاد للرئيسية
  await p.evaluate(() => { APP.S.school.settings.tfeat.sbsign = false; APP.renderNav(); location.hash = '#/home'; }); await p.waitForTimeout(800); await p.evaluate(() => { location.hash = '#/standby'; }); await p.waitForTimeout(1200);
  ok('noOwnerWords', await p.evaluate(() => !/المالك/.test(document.querySelector('#main').innerText)));
  ok('hiddenNav', await p.$$eval('#nav a[href="#/standby"]', L => L.length));
  ok('redirected', await p.evaluate(() => location.hash));
  // منح «إعداد التأمين» فقط: يرى الصفحة بلا أزرار المالك وبلا اعتماد
  await p.evaluate(() => { APP.S.grants = [{ staff_id: APP.S.me.id, module: 'sb_cover' }]; APP.renderNav(); location.hash = '#/home'; }); await p.waitForTimeout(800); await p.evaluate(() => { location.hash = '#/standby'; }); await p.waitForTimeout(2000);
  ok('coverNav', await p.$$eval('#nav a[href="#/standby"]', L => L.length));
  ok('coverNoOwnerBtns', await p.$$eval('#sbRules,#sbForm,#sbPerm', L => L.length));
  ok('coverNoApproveBtn', !(await p.$('#cvAp')) && !(await p.$('#cvRe')));
  await p.screenshot({ path: 'p0/t207_cover_grant.png' });
  console.log(JSON.stringify(R, null, 1)); console.log('errors', errs);
  await b.close(); })();
