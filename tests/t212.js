// توقيت جدول المعلم مع فسح خاصة ببعض الصفوف (الجدول الأساسي لقسم البنين): الأوقات والفسح في عرض الجداول = الملصق — node t212.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = []; let ok = true; const chk = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) ok = false; };
  // نسخة من sections.bell لقسم البنين (الجدول الأساسي): الفسحة بعد الثانية للابتدائي، وبعد الثالثة للمتوسط والثانوي، والصلاة بعد السابعة
  const SETUP = () => { const S = APP.S, sec = APP.section(), cl = S.classes.filter(c => c.active !== false && !c.is_test);
    cl.forEach((c, i) => { c.stage = i < 3 ? 'ابتدائي' : i < 6 ? 'متوسط' : 'ثانوي'; });
    sec.periods = 7; sec.days = 5;
    sec.bell = { def: 'b1', pin: { kind: 'sched', id: 'b1', from: '2026-11-09', to: null }, acts: [], holidays: [], schedules: [{ id: 'b1', name: 'الجدول الأساسي', np: 7, dur: 45, pass: 0, show: true, start: '07:30', perDur: {}, breaks: [
      { id: 'f1', dur: 20, after: 2, label: 'الفسحة', classes: cl.slice(0, 3).map(c => c.id) }, { id: 'f2', dur: 20, after: 3, label: 'الفسحة ', classes: cl.slice(3).map(c => c.id) }, { id: 'pr', dur: 15, after: 7, label: 'الصلاة', classes: [] }] }] };
    return { prim: cl.slice(0, 3).map(c => c.id), sec2: cl.slice(3).map(c => c.id) }; };
  for (const W of [1440, 768, 375]) {
    const ctx = await b.newContext({ viewport: { width: W, height: 900 } }); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(W + ' ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
    const G = await p.evaluate(SETUP);
    // الدوال المشتركة
    const r = await p.evaluate(G => ({ p3a: APP.bell.pRanges(2, G.prim[0]).map(x => x.txt), p3b: APP.bell.pRanges(2, G.sec2[0]).map(x => x.txt), all: APP.bell.pRanges(2, null).map(x => x.label + ':' + x.txt), p1: APP.bell.pRanges(0, null).length,
      br: APP.bell.pBreaks(null).map(x => x.after + ':' + x.label + ':' + x.part), end: APP.bell.dayEnd() }), G);
    const en = x => String(x).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)); r.p3a = r.p3a.map(en); r.p3b = r.p3b.map(en);
    if (W === 1440) console.log(JSON.stringify(r));
    chk(/9:20/.test(r.p3a[0]) && /10:05/.test(r.p3a[0]), 'الحصة الثالثة للابتدائي بعد الفسحة ٩:٢٠–١٠:٠٥');
    chk(/9:00/.test(r.p3b[0]) && /9:45/.test(r.p3b[0]), 'الحصة الثالثة للمتوسط والثانوي ٩:٠٠–٩:٤٥');
    chk(r.all.length === 2 && r.all.some(x => x.startsWith('ابتدائي')), 'رأس «كل الفصول» يعرض وقتي الفئتين بأسمائهما');
    chk(r.p1 === 1, 'الحصة الأولى وقت واحد (لا اختلاف)');
    chk(r.end === 13 * 60 + 20, 'نهاية اليوم الفعلية ١:٢٠ (لا ١:٠٠)');
    chk(r.br.length === 3 && r.br.filter(x => /الفسحة/.test(x)).every(x => x.split(':')[2]), 'الفسحتان بأسماء فئتيهما والصلاة للجميع');
    // جدول معلم يدرّس الفئتين
    const tid = await p.evaluate(G => { const L = APP.S.entries || []; const by = {}; L.forEach(e => { if (!e.teacher_id) return; (by[e.teacher_id] = by[e.teacher_id] || new Set()).add(e.class_id); });
      return Object.keys(by).find(t => [...by[t]].some(c => G.prim.includes(c)) && [...by[t]].some(c => G.sec2.includes(c))) || null; }, G);
    await p.evaluate(() => { localStorage.removeItem('dwp_ttv_st'); location.hash = '#/ttviews'; }); await p.waitForTimeout(1500);
    await p.click('.tv-tabs [data-v="teacher"]'); await p.waitForTimeout(700);
    if (tid) { await p.evaluate(t => { const s = document.querySelector('#tvB select'); if (s && [...s.options].some(o => o.value === t)) { s.value = t; s.dispatchEvent(new Event('change', { bubbles: true })); } }, tid); await p.waitForTimeout(700); }
    const T = await p.evaluate(() => ({ th: [...document.querySelectorAll('#tvB thead th')].map(t => t.textContent.trim()), bk: document.querySelectorAll('#tvB thead th.bk').length, ct: document.querySelectorAll('#tvB td small.tv-ct').length }));
    if (W === 1440) console.log(JSON.stringify(T));
    chk(T.th.some(t => /الفسحة/.test(t)), W + ' جدول المعلم يظهر فيه عمود الفسحة');
    chk(!T.th.some(t => /12:45.*1:00|١٢:٤٥.*١:٠٠/.test(t) && /الصلاة/.test(t)), W + ' الصلاة ليست ١٢:٤٥–١:٠٠ (التوقيت القديم الخاطئ)');
    if (tid) chk(T.ct > 0, W + ' كل حصة تعرض وقتها الفعلي حسب فصلها');
    await p.screenshot({ path: `p0/t212-teacher-${W}.png`, fullPage: false });
    await p.click('.tv-tabs [data-v="day"]'); await p.waitForTimeout(700);
    if (W === 1440) await p.screenshot({ path: 'p0/t212-day.png' });
    await p.click('.tv-tabs [data-v="class"]'); await p.waitForTimeout(600);
    chk(await p.evaluate(() => document.querySelectorAll('#tvB thead th.bk').length) === 2, W + ' جدول الفصل: فسحة واحدة + الصلاة');
    await ctx.close(); }
  chk(!errs.length, 'لا أخطاء: ' + errs.join(' | '));
  await b.close(); process.exit(ok ? 0 : 1); })();
