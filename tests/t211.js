// بنود أولياء الأمور + معاينة «خطط أبنائي» + ظهور الأسبوع المنشور القادم — node t211.js
// parents.html يتصل بالخادم الحي ← نعترض استدعاءات RPC ببيانات ثابتة (الحاوية لا تصل للخادم)
const { chromium } = require('playwright');
const QS = [{ id: 'q1', qtype: 'mcq', body: 'ناتج ٧ × ٨ يساوي', options: [{ t: '٥٤' }, { t: '٥٦', ok: true }, { t: '٦٤' }], explanation: 'جدول الضرب للعدد ٧' },
  { id: 'q2', qtype: 'tf', body: 'الشمس كوكب.', answer: 'خطأ', options: [] }, { id: 'q3', qtype: 'blank', body: 'عاصمة المملكة ____', options: [{ t: 'الرياض' }] }];
const ITEMS = { cfg: { layout: 'tabs', openN: 2 }, items: [
  { id: 'i1', cat: 'review', title: 'مراجعة الوحدة الثالثة — رياضيات', body: 'راجع مع ابنك الدروس ١–٤ قبل اختبار الأحد.', subject: 'الرياضيات', from: '2026-11-17', pinned: true, att: [{ t: 'file', name: 'ملخص الوحدة.pdf', url: 'https://example.com/a.pdf', size: 240000 }, { t: 'link', name: 'شرح على Drive', url: 'https://drive.google.com/x' }] },
  { id: 'i2', cat: 'questions', title: 'أسئلة تدريبية', from: '2026-11-17', att: [{ t: 'questions', name: 'أسئلة مراجعة', qs: QS }] },
  { id: 'i3', cat: 'media', title: 'فيديو الدرس', from: '2026-11-17', att: [{ t: 'video', name: 'شرح الكسور', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }, { t: 'quiz', name: 'اختبار قصير', code: 'ABC123' }] }] };
const EXTRA = []; const CLS = 'c-1', W12 = { id: 'w12', word: 'الثاني عشر', start: '2026-11-15' }, W13 = { id: 'w13', word: 'الثالث عشر', start: '2026-11-29' };
const plan = w => ({ class: { id: CLS, name: 'رابع ابتدائي أ', days: 5 }, today: '2026-11-17', weeks: [W12, W13], week: { ...w, holidays: [] },
  entries: [0, 1, 2, 3, 4].flatMap(d => [0, 1, 2].map(p => ({ day: d, period: p, subject: ['الرياضيات', 'لغتي', 'العلوم'][p], topic: `${w.word}: درس ${p + 1}`, homework: p === 1 ? 'حل تمارين الكتاب' : '', note: '' }))), notes: [] });
async function mock(page, calls) {
  await page.route('**/rest/v1/rpc/**', async r => { const fn = r.request().url().split('/rpc/')[1], b = JSON.parse(r.request().postData() || '{}'); calls.push(fn);
    const J = { parent_info: { school: { name: 'مدارس دينا العالمية' }, sections: [{ id: 's1', name: 'قسم البنين' }], classes: [{ id: CLS, name: 'رابع ابتدائي أ', section: 's1' }].concat(EXTRA.map(id => ({ id, name: 'فصل تجريبي', section: 's1' }))) },
      parent_plan: plan(b.p_week === 'w13' ? W13 : W12), parent_posts_for: [], parent_resources: [], parent_quizzes: [], parent_live: null, parent_items_for: ITEMS, pitem_seen: null }[fn];
    await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(J === undefined ? null : J) }); });
}
(async () => { const b = await chromium.launch(); const errs = []; const R = {}; const ok = (k, v) => { R[k] = v; };
  // ---- (١) صفحة خطط أبنائي بالبنود + الأسبوع ١٣
  for (const [w, h, tag] of [[375, 812, 'm'], [768, 1000, 't'], [1440, 900, 'd']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(tag + ': ' + e.message)); const calls = []; await mock(p, calls);
    await p.goto(`http://localhost:8766/parents.html?t=tok&c=${CLS}&pv=1`); await p.waitForTimeout(1500);
    if (tag === 'm') {
      ok('itemsShown', await p.$$eval('.pi-it', l => l.length)); ok('chips', await p.$$eval('.pi-chips button', l => l.map(x => x.textContent.trim())));
      ok('pvNoSeen', !calls.includes('pitem_seen')); ok('lsUntouched', await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('dina_parent_')).length));
      await p.click('[data-w="w13"]'); await p.waitForTimeout(800); ok('week13Head', await p.$eval('.wk .t b', e => e.textContent));
      await p.click('[data-w="w12"]'); await p.waitForTimeout(800);
      await p.click('.pi-chips [data-pc="questions"]'); await p.waitForTimeout(300); ok('filtered', await p.$$eval('.pi-it', l => l.length));
      if (!(await p.$eval('.pi-it', d => d.open))) await p.click('.pi-it summary');
      await p.click('.pi-opt[data-qo="1"]'); ok('correctMarked', await p.$$eval('.pi-opt.ok', l => l.length));
      await p.click('[data-qall]'); ok('answersShown', await p.$$eval('.pi-ans.on', l => l.length));
    }
    await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: `p0/t211_parents_${tag}.png`, fullPage: true }); await p.close();
  }
  // ---- (٢) المنصة: بنود أولياء الأمور (المالك)
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', e => errs.push('app: ' + e.message)); await mock(p, []);
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  ok('navOwner', await p.evaluate(() => APP.NAV.filter(n => ['pitems', 'pview'].includes(n[0]) && n[2]()).map(n => n[0])));
  await p.evaluate(async QS => { const S = APP.S, c = S.classes[0]; for (const { id, ...q } of QS) await APP.api.ins('questions', [{ ...q, school_id: S.school.id, subject_id: S.subjects[0].id, grade_key: `${c.stage}|${c.grade_word}`, shared: true }]); }, QS);
  await p.evaluate(() => { localStorage.removeItem('pim_tab'); location.hash = '#/pitems'; }); await p.waitForTimeout(1200);
  await p.click('#pimN'); await p.waitForTimeout(500);
  await p.fill('#eT', 'مراجعة الوحدة الثالثة'); await p.fill('#eB', 'راجعوا مع أبنائكم قبل الاختبار.');
  await p.click('[data-ad="text"]'); await p.fill('[data-an="0"]', 'نصائح: ١) راجع يومياً ٢) حل التمارين');
  await p.click('[data-ad="link"]'); await p.fill('#lU', 'https://drive.google.com/abc'); await p.fill('#lN', 'ملف المراجعة'); await p.click('#lGo');
  await p.click('[data-ad="video"]'); await p.fill('#lU', 'https://youtu.be/dQw4w9WgXcQ'); await p.fill('#lN', 'شرح'); await p.click('#lGo');
  await p.click('[data-ad="questions"]'); await p.waitForTimeout(700);
  const gks = await p.$$eval('#qG option', l => l.map(o => o.value)); const gk = await p.evaluate(() => { const c = APP.S.classes[0]; return `${c.stage}|${c.grade_word}`; });
  if (gks.includes(gk)) { await p.selectOption('#qG', gk); await p.waitForTimeout(400); }
  await p.selectOption('#qS', await p.evaluate(() => APP.S.subjects[0].id)); await p.waitForTimeout(400);
  await p.click('#qAll'); ok('qPicked', await p.$eval('#qCnt', e => e.textContent)); await p.fill('#qN', 'أسئلة المراجعة'); await p.click('#qGo'); await p.waitForTimeout(300);
  await p.click('[data-au="classes"]'); await p.click('#eAuS .perm-grid input');
  ok('editorAtt', await p.$$eval('#eA .pim-a', l => l.length)); ok('livePreview', await p.$$eval('#ePv .pi-it', l => l.length));
  await p.screenshot({ path: 'p0/t211_editor_d.png' });
  await p.click('[data-sv="published"]'); await p.waitForTimeout(800);
  ok('cards', await p.$$eval('.pim-c', l => l.length)); ok('saved', await p.evaluate(() => { const r = (APP.api && null); return null; }));
  ok('savedRow', await p.evaluate(async () => { const l = await APP.api.list('parent_items'); const x = l[0]; return x && { st: x.status, att: x.att.map(a => a.t), cls: x.class_ids.length, sec: !!x.section_id }; }));
  await p.screenshot({ path: 'p0/t211_list_d.png' });
  await p.click('[data-vw]'); await p.waitForTimeout(400); ok('previewModal', await p.$$eval('#pimV .pi-q', l => l.length)); await p.keyboard.press('Escape'); await p.click('.ovl .x').catch(() => { });
  // الإعدادات
  await p.click('[data-tb="set"]'); await p.waitForTimeout(600); ok('setCats', await p.$$eval('.pim-ci', l => l.length));
  await p.fill('#sT', 'المراجعات والمرفقات'); await p.click('#sGo'); await p.waitForTimeout(500);
  ok('setSaved', await p.evaluate(() => ({ t: APP.S.school.settings.pitems.title, plan: APP.S.school.settings.portal.plan })));
  await p.screenshot({ path: 'p0/t211_settings_d.png', fullPage: true });
  // المعاينة
  EXTRA.push(...await p.evaluate(() => APP.S.sections.flatMap(s => (APP.S.allClasses || APP.S.classes).map(c => c.id))));
  await p.evaluate(() => { location.hash = '#/pview'; }); await p.waitForTimeout(2200);
  ok('pvFrame', await p.$eval('#vF', f => f.getAttribute('src')));
  const fr = p.frame({ url: /parents\.html/ }); ok('pvFrameItems', fr ? await fr.$$eval('.pi-it', l => l.length) : -1);
  await p.screenshot({ path: 'p0/t211_pview_d.png' });
  await p.click('[data-dv="desk"]'); await p.waitForTimeout(1200); await p.screenshot({ path: 'p0/t211_pview_desk.png' });
  // الجوال والوحي للصفحات
  for (const [w, h, t] of [[375, 812, 'm'], [768, 1000, 't']]) { await p.setViewportSize({ width: w, height: h }); await p.evaluate(() => { localStorage.setItem('dwp_pim_tab', '"list"'); location.hash = '#/home'; }); await p.waitForTimeout(300); await p.evaluate(() => { location.hash = '#/pitems'; }); await p.waitForTimeout(1200); await p.screenshot({ path: `p0/t211_list_${t}.png`, fullPage: true }); }
  // غير المالك بلا منحة
  await p.evaluate(() => { APP.S.me = { ...APP.S.me, is_owner: false }; APP.S.grants = []; });
  ok('navOther', await p.evaluate(() => APP.NAV.filter(n => ['pitems', 'pview'].includes(n[0]) && n[2]()).map(n => n[0])));
  await p.evaluate(() => { location.hash = '#/home'; }); await p.waitForTimeout(300); await p.evaluate(() => { location.hash = '#/pview'; }); await p.waitForTimeout(800);
  ok('otherRedirect', await p.evaluate(() => location.hash));
  ok('errs', errs.filter(e => !/ERR_TUNNEL|fonts/.test(e)));
  console.log(JSON.stringify(R, null, 1)); await b.close();
})();
