// التواقيع المفوّضة (توقيع مدير المدرسة من حساب المالك) — node t209.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const R = {}; const ok = (k, v) => { R[k] = v; console.log(k, JSON.stringify(v)); };
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  // ثلاثة نماذج فيها خانة «مدير المدرسة»
  await p.evaluate(async () => { const t = APP.S.staff.find(s => !s.is_owner); const tpl = { title: 'نموذج اختبار', blocks: [{ id: 'h', type: 'heading', text: 'نموذج' }, { id: 'bs', type: 'signatures', withSign: true, roles: [{ id: 's0', label: 'المعلم', name: '' }, { id: 's1', label: 'المدير الأكاديمي', name: '' }, { id: 's2', label: 'مدير المدرسة', name: '' }] }] };
    const rows = ['submitted', 'submitted', 'draft'].map((st, i) => ({ id: 'ft-ds-' + i, school_id: APP.S.school.id, title: 'نموذج تجريبي ' + (i + 1), tid: 'x', cat: 'x', tpl, cfg: {}, data: {}, sigs: {}, cosign: [], assignee: t.id, created_by: APP.S.me.id, status: st, mode: 'fill', perms: {}, trail: [], created_at: new Date().toISOString() }));
    await APP.api.ins('form_tasks', rows); });
  await p.evaluate(() => location.hash = '#/forms'); await p.waitForTimeout(1500);
  ok('btns', await p.$$eval('#fmDsB,#fmDsM', L => L.length));
  // إدارة التواقيع: رسم توقيع المدير
  await p.click('#fmDsM'); await p.waitForTimeout(600);
  ok('defEntry', await p.$$eval('.ds-c [data-k="name"]', L => L.map(x => x.value)));
  await p.click('[data-dr="0"]'); await p.waitForTimeout(300);
  const bb = await (await p.$('#dpC2')).boundingBox(); await p.mouse.move(bb.x + 50, bb.y + 80); await p.mouse.down(); await p.mouse.move(bb.x + 250, bb.y + 40, { steps: 10 }); await p.mouse.move(bb.x + 400, bb.y + 100, { steps: 10 }); await p.mouse.up();
  await p.click('#dpS2'); await p.waitForTimeout(300); ok('img', await p.$$eval('.ds-im', L => L.length));
  await p.screenshot({ path: 'p0/t209_manage.png' });
  await p.click('#dmOk'); await p.waitForTimeout(800);
  ok('saved', await p.evaluate(async () => { const r = (await APP.api.list('owner_vault', { key: 'dsigs' }))[0]; return r && r.data.list[0].img.length > 100; }));
  // التوقيع الجماعي (المرسلة للاعتماد فقط افتراضياً)
  await p.click('#fmDsB'); await p.waitForTimeout(900);
  ok('bulkRows', await p.$$eval('[data-t]', L => L.length));
  await p.check('#dbAll'); await p.waitForTimeout(200); ok('bulkRowsAll', await p.$$eval('[data-t]', L => L.length)); await p.uncheck('#dbAll'); await p.waitForTimeout(200);
  await p.screenshot({ path: 'p0/t209_bulk.png' });
  await p.click('#dbGo'); await p.waitForTimeout(1500);
  ok('bulkSigned', await p.evaluate(async () => (await APP.api.list('form_tasks', {})).filter(t => /^ft-ds-/.test(t.id)).map(t => t.status + ':' + Object.values(t.sigs || {}).map(s => s.label + '=' + s.name).join(','))));
  // داخل النموذج الثالث (مسودة): زر «✍ توقيع مدير المدرسة»
  await p.evaluate(async () => { const t = (await APP.api.list('form_tasks', { id: 'ft-ds-2' }))[0]; APP._forms.openTask(t); }); await p.waitForTimeout(2500);
  ok('quickBtn', await p.$$eval('.ds-qb', L => L.map(x => x.textContent)));
  await p.click('.ds-qb'); await p.waitForTimeout(1200);
  ok('quickSigned', await p.evaluate(async () => Object.values((await APP.api.list('form_tasks', { id: 'ft-ds-2' }))[0].sigs || {}).map(s => s.label + '=' + s.name)));
  ok('quickGone', await p.$$eval('.ds-qb', L => L.length));
  // الاختيار عند الضغط على «✍ توقيع» في خانة المدير الأكاديمي: الافتراضي «توقيعي»، وفي خانة مدير المدرسة: التوقيع المفوّض
  await p.evaluate(() => { APP.dsig.choose('المدير الأكاديمي').then(r => window.__c1 = r); }); await p.waitForTimeout(400);
  ok('chooseAD', await p.$eval('input[name=dsP]:checked', e => e.value)); await p.screenshot({ path: 'p0/t209_choose.png' }); await p.click('#dsOk'); await p.waitForTimeout(200);
  await p.evaluate(() => { APP.dsig.choose('توقيع مدير المدرسة').then(r => window.__c2 = r); }); await p.waitForTimeout(400);
  ok('choosePR', await p.$eval('input[name=dsP]:checked', e => e.value)); await p.click('#dsOk'); await p.waitForTimeout(200);
  ok('results', await p.evaluate(() => [JSON.stringify(window.__c1), (window.__c2 || {}).name]));
  await p.setViewportSize({ width: 375, height: 800 }); await p.evaluate(() => { APP.dsig.choose('مدير المدرسة'); }); await p.waitForTimeout(400); await p.screenshot({ path: 'p0/t209_choose_375.png' }); await p.keyboard.press('Escape');
  // لغير المالك: لا شيء
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.evaluate(() => { const t = APP.S.staff.find(s => !s.is_owner); APP.S.me = Object.assign({}, t, { is_owner: false }); location.hash = '#/home'; }); await p.waitForTimeout(600);
  await p.evaluate(() => { location.hash = '#/forms'; }); await p.waitForTimeout(1500);
  ok('teacherNoBtns', await p.$$eval('#fmDsB,#fmDsM', L => L.length)); ok('teacherOn', await p.evaluate(() => APP.dsig.on()));
  console.log(JSON.stringify(R, null, 1)); console.log('errors', errs);
  await b.close(); })();
