// الزيارات الصفية V.visits (sql/108) — node t205.js
// اختيار الفصل ← الحصة والمعلم والدرس من الخطة، التقديم/التأخير، التعديل اليدوي، أكثر من نموذج + السير في المنهج، تخصيص العناصر،
// إنشاء الاستمارة وتعبئتها التلقائية، فتحها، تعديل البيانات، القائمة والتقارير، أداة الإشراف، الإعدادات، الإخفاء عن المعلم
const { chromium } = require('playwright');
const W = [375, 768, 1440];
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const R = {}; const ok = (k, v) => { R[k] = v; };
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  await p.evaluate(() => location.hash = '#/visits'); await p.waitForTimeout(1500);
  ok('nav', await p.$$eval('[data-v="visits"],a[href="#/visits"]', L => L.length));
  ok('classes', await p.$$eval('#vsC [data-c]', L => L.length));
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300); await p.screenshot({ path: `p0/t205_new_${w}.png` }); ok('hscroll0_' + w, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // اختيار فصل لديه خطة
  const cid = await p.evaluate(() => { const e = (APP.S.allEntries || APP.S.entries).find(x => x.teacher_id && x.topic); return e ? e.class_id : APP.S.classes[0].id; });
  await p.click(`#vsC [data-c="${cid}"]`); await p.waitForTimeout(1500);
  ok('dayStrip', await p.$$eval('#vsDay [data-p]', L => L.length));
  // تاريخ داخل الأسبوع المحمّل ويوم فيه حصة بموضوع
  const tgt = await p.evaluate(c => { const w = APP.week(); const e = (APP.S.allEntries || APP.S.entries).find(x => x.class_id === c && x.topic && x.teacher_id); const d = new Date(w.start_date + 'T00:00:00'); d.setDate(d.getDate() + e.day); return { date: APP.isoDate(d), p: e.period, t: e.teacher_id, topic: e.topic }; }, cid);
  await p.fill('#vsD', tgt.date); await p.dispatchEvent('#vsD', 'change'); await p.waitForTimeout(900);
  await p.click(`#vsDay [data-p="${tgt.p}"]`); await p.waitForTimeout(500);
  ok('pulledTeacher', (await p.$eval('#vsT', e => e.value)) === tgt.t);
  ok('pulledTopic', (await p.$eval('#vsTp', e => e.value)) === tgt.topic);
  ok('srcTags', await p.$$eval('#vsSrc .vs-tag', L => L.map(x => x.textContent)));
  // التالية ثم السابقة
  await p.click('#vsNext'); await p.waitForTimeout(300); ok('nextP', await p.$eval('#vsP', e => +e.value)); await p.click('#vsPrev'); await p.waitForTimeout(300); ok('backP', (await p.$eval('#vsP', e => +e.value)) === tgt.p);
  // تعديل يدوي للدرس
  await p.fill('#vsTp', tgt.topic + ' (معدّل)'); await p.waitForTimeout(700); ok('editedTag', await p.$$eval('#vsSrc .vs-tag', L => L.some(x => /عُدّلت/.test(x.textContent))));
  // النوع: مسمى آخر
  await p.click('#vsTy [data-ty="زيارة مفاجئة"]'); await p.fill('#vsR', 'المدير الأكاديمي');
  // نموذجان
  await p.waitForSelector('#vsTpl [data-tk]'); ok('tplCards', await p.$$eval('#vsTpl [data-tk]', L => L.length));
  const on = await p.$$eval('#vsTpl .vs-t.on', L => L.length); if (!on) await p.click('#vsTpl [data-tk="c-brief"]');
  await p.click('#vsTpl [data-tk="c-notes"]'); await p.waitForTimeout(200); ok('selected', await p.$$eval('#vsTpl .vs-t.on', L => L.map(x => x.dataset.tk)));
  // تخصيص العناصر: إضافة بند لعناصر التقييم وحذف أول بند
  await p.click('#vsCus'); await p.waitForTimeout(500); await p.screenshot({ path: 'p0/t205_items.png' });
  const nb0 = await p.$$eval('.vs-ib', L => L.length); ok('ieBlocks', nb0);
  await p.click('.vs-ib [data-new="items"]'); await p.waitForTimeout(150);
  await p.evaluate(() => { const ins = [...document.querySelectorAll('.vs-ib input[data-k="t"]')]; const e = ins[ins.length - 1]; e.value = 'بند مضاف للاختبار'; e.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.click('#ieOk'); await p.waitForTimeout(300); ok('customTag', await p.$$eval('#vsCusI .vs-tag', L => L.length));
  await p.screenshot({ path: 'p0/t205_ready.png', fullPage: true });
  // بدء الزيارة
  await p.click('#vsGo'); await p.waitForTimeout(2500);
  ok('formOpened', !!(await p.$('.fm-modal iframe')));
  ok('banner', await p.$$eval('.vs-ban .vs-tag', L => L.map(x => x.textContent)));
  await p.screenshot({ path: 'p0/t205_form.png' });
  const T = await p.evaluate(async () => { const L = (await APP.api.list('form_tasks', {})).filter(t => t.visit); const t = L[0]; const f = t.tpl.blocks.find(b => b.type === 'fields'); return { n: L.length, mode: t.mode, title: t.title, assignee: t.assignee, pace: t.tpl.blocks.some(b => b.id === 'vpace'), paceRows: (t.data.vpace || []).slice(0, 2), added: JSON.stringify(t.tpl).includes('بند مضاف للاختبار'), notes: t.tpl.blocks.some(b => b.type === 'notes'), sigRoles: (t.tpl.blocks.filter(b => b.type === 'signatures').pop() || {}).roles.map(r => r.label), head: f ? t.data[f.id] : null, cos: t.cosign, sub: t.tpl.sub, v: { cls: t.visit.class_name, p: t.visit.period, topic: t.visit.topic, type: t.visit.type, edited: t.visit.edited } }; });
  ok('task', T); ok('assigneeOk', T.assignee === tgt.t);
  // انتظار تحميل الورقة داخل الإطار
  const fr = p.frames().find(f => /formEmbed/.test(f.url())); if (fr) { await fr.waitForTimeout(1500); ok('paperHasPace', await fr.evaluate(() => /السير في المنهج/.test(document.body.innerText))); ok('paperHasTopic', await fr.evaluate(t => document.body.innerHTML.includes(t), tgt.topic)); }
  await p.evaluate(() => document.querySelectorAll('.ovl').forEach(o => o.remove())); await p.waitForTimeout(600);
  // القائمة
  await p.click('[data-tb="list"]'); await p.waitForTimeout(1200); ok('listCards', await p.$$eval('.vs-card', L => L.length));
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(300); await p.screenshot({ path: `p0/t205_list_${w}.png` }); ok('hscrollL_' + w, await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2)); }
  await p.setViewportSize({ width: 1440, height: 900 });
  // تعديل البيانات: الحصة + السير في المنهج + مرفق
  await p.click('.vs-card [data-op="edit"]'); await p.waitForTimeout(700); await p.screenshot({ path: 'p0/t205_edit.png' });
  await p.selectOption('#vePc', 'behind'); await p.fill('#veTy', 'زيارة متابعة');
  await p.setInputFiles('#veF', { name: 'شاهد.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64') }); await p.waitForTimeout(800);
  await p.click('#veOk'); await p.waitForTimeout(900);
  ok('edited', await p.evaluate(async () => { const t = (await APP.api.list('form_tasks', {})).find(x => x.visit); return { pace: t.visit.pace, type: t.visit.type, title: t.title, att: (t.data._att || []).length, paceField: (t.data.vpace_f || {}).f0, trail: t.trail.map(x => x.act) }; }));
  // التقارير
  await p.click('[data-tb="rep"]'); await p.waitForTimeout(1000); ok('repKpi', await p.$$eval('.vs-kp div b', L => L.map(x => x.textContent))); await p.screenshot({ path: 'p0/t205_rep.png', fullPage: true });
  // أداة الإشراف: إرسال
  await p.evaluate(() => APP.api.ups('sup_docs', [{ school_id: APP.S.school.id, key: 'cfg/main', col: 'cfg', data: { cfg: {}, teachers: [] } }, { school_id: APP.S.school.id, key: 'rec/r1', col: 'rec', data: { id: 'r1', tid: 'c-brief', teacher: APP.S.staff.find(x => !x.is_owner).full_name, date: '2026-11-01', d: {} } }, { school_id: APP.S.school.id, key: 'tpl/c-brief', col: 'tpl', data: { id: 'c-brief', name: 'بطاقة مختصرة', blocks: [{ id: 'b1', type: 'rating', groups: [] }] } }], 'school_id,key'));
  await p.click('[data-tb="list"]'); await p.waitForTimeout(900); await p.click('.vs-card [data-op="sup"]'); await p.waitForTimeout(1500);
  ok('supRec', await p.evaluate(async () => { const L = await APP.api.list('sup_docs', {}); const r = L.filter(x => x.col === 'rec' && x.data && x.data.src === 'platform'); const tp = r.length && L.find(x => x.key === 'tpl/' + r[0].data.tid); return r.length ? { n: r.length, tid: r[0].data.tid, hiddenTpl: !!(tp && tp.data.hidden), teacher: r[0].data.teacher, status: r[0].data.status } : null; }));
  await p.click('[data-tb="int"]'); await p.waitForTimeout(900); ok('impRows', await p.$$eval('[data-ir]', L => L.length));
  await p.click('#inI'); await p.waitForTimeout(1200); ok('imported', await p.evaluate(async () => (await APP.api.list('form_tasks', {})).filter(t => t.visit && t.visit.imported).length));
  await p.click('[data-tb="int"]'); await p.waitForTimeout(700); await p.screenshot({ path: 'p0/t205_int.png' });
  // الإعدادات
  await p.click('[data-tb="set"]'); await p.waitForTimeout(1500); await p.screenshot({ path: 'p0/t205_set.png', fullPage: true });
  await p.fill('#sgT', 'الزيارات المفاجئة'); await p.click('#sgTy [data-op="add"]'); await p.waitForTimeout(150); const ti = await p.$$('#sgTy input'); await ti[ti.length - 1].fill('زيارة تجريبية'); await p.click('#sgOk'); await p.waitForTimeout(900);
  ok('cfgSaved', await p.evaluate(() => { const v = APP.S.school.settings.visits; return { t: v.title, ty: v.types.slice(-1)[0] }; }));
  ok('navLabel', await p.evaluate(() => (APP.NAV.find(n => n[0] === 'visits') || [])[1]));
  // الإخفاء عن معلم بلا صلاحية/تفعيل
  ok('hiddenForTeacher', await p.evaluate(() => { const me = APP.S.me, t = APP.S.staff.find(x => !x.is_owner && x.active); APP.S.me = t; APP.S.realMe = me; const nav = APP.NAV.find(n => n[0] === 'visits'); const r = nav[2](); APP.S.me = me; delete APP.S.realMe; return !r; }));
  ok('errors', errs);
  console.log(JSON.stringify(R, null, 1)); await b.close(); })();
