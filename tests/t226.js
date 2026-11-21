// التصحيح الآلي المطوَّر في «الاختبارات الورقية» — node t226.js
// أوراق مولَّدة (معتدلة، مائلة، بظل، غائب، مكررة) ← بطاقات المراجعة والتصنيف، محرر الورقة (تعديل بالنقر والنموذج والغياب)،
// الحفظ، تعديل نتيجة محفوظة من «النتائج»، طباعة الأوراق المصححة، Excel فقرات الطلاب، نافذة الكاميرا، بثلاثة مقاسات
const { chromium } = require('playwright');
const W = [375, 768, 1440];
(async () => { const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] }); const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const R = {}; const ok = (k, v) => { R[k] = v; };
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  const ex = await p.evaluate(async () => { const A = APP, S = A.S, cls = S.classes.filter(c => c.active).slice(0, 2).map(c => c.id);
    const spec = { lang: 'ar', parts: [{ type: 'mcq', count: 20, options: 4 }, { type: 'tf', count: 6 }] }, qs = DinaOMR.expand(spec).qs, n = qs.length;
    const key = qs.map((Q, q) => (q * 7 + 3) % Q.n), keyB = qs.map((Q, q) => (q * 5 + 1) % Q.n);
    const e = (await A.api.ins('paper_exams', { title: 'اختبار التصحيح الآلي', subject_id: S.subjects[0].id, kind: 'periodic', exam_date: null, n_questions: n, n_options: 4, spec, class_ids: cls, models: [{ name: 'A', answers: key }, { name: 'B', answers: keyB }], weights: qs.map(() => 1), skills: qs.map(() => null), teachers: [], school_id: S.school.id, section_id: S.sectionId, teacher_id: S.me.id }))[0];
    return { id: e.id, n, key, cls };
  });
  ok('exam', ex.n);
  await p.evaluate(() => { APP.LS.set('as_t', 'paper'); location.hash = '#/assess'; }); await p.waitForTimeout(1500);
  await p.click('text=اختبار التصحيح الآلي'); await p.waitForTimeout(1200);
  await p.click('#peTabs [data-t="grade"]'); await p.waitForTimeout(1200);
  ok('camBtn', !!(await p.$('#gCam')));
  // توليد أوراق: الطالب ١ معتدلة، ٢ مائلة بظل، ٣ غائب، ٤ مكررة لـ١، ٥ نموذج B
  const files = await p.evaluate(async () => {
    if (!window.html2canvas) await new Promise(r => { const s = document.createElement('script'); s.src = 'vendor/html2canvas.min.js'; s.onload = r; document.head.appendChild(s); });
    const spec = { lang: 'ar', parts: [{ type: 'mcq', count: 20, options: 4 }, { type: 'tf', count: 6 }] }, qs = DinaOMR.expand(spec).qs;
    const host = document.createElement('div'); host.style.cssText = 'position:absolute;left:-4000px;top:0'; document.body.appendChild(host);
    const make = async (idx, model, fill, o = {}) => { host.innerHTML = `<style>${DinaOMR.PAGE_CSS}</style>` + DinaOMR.sheetHTML({ spec, idx, model, modelName: model ? 'B' : 'A', name: 'ط', cls: 'ف', fill, absent: o.absent });
      const pg = host.querySelector('.omr-page'); let cv = await html2canvas(pg, { scale: 2, backgroundColor: '#fff', logging: false });
      if (o.deg || o.shadow) { const c = document.createElement('canvas'); c.width = cv.width * 1.15; c.height = cv.height * 1.1; const x = c.getContext('2d'); x.fillStyle = '#6d6259'; x.fillRect(0, 0, c.width, c.height); x.translate(c.width / 2, c.height / 2); x.rotate((o.deg || 0) * Math.PI / 180); x.scale(.92, .92); x.drawImage(cv, -cv.width / 2, -cv.height / 2); x.setTransform(1, 0, 0, 1, 0, 0);
        if (o.shadow) { const g = x.createLinearGradient(0, 0, c.width, c.height); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); } cv = c; }
      return cv.toDataURL('image/jpeg', 0.85); };
    const f1 = qs.map((Q, q) => (q * 7 + 3) % Q.n), f2 = qs.map((Q, q) => q % 4 ? (q * 7 + 3) % Q.n : ((q * 7 + 3) + 1) % Q.n), f5 = qs.map((Q, q) => (q * 5 + 1) % Q.n);
    const out = [await make(1, 0, f1), await make(2, 0, f2, { deg: 6, shadow: 1 }), await make(3, 0, qs.map(() => -1), { absent: true }), await make(1, 0, f1), await make(4, 1, f5, { deg: -4 })];
    host.remove(); return out; });
  const buf = files.map(d => Buffer.from(d.split(',')[1], 'base64'));
  await p.setInputFiles('#gF', buf.map((x, i) => ({ name: `sheet${i + 1}.jpg`, mimeType: 'image/jpeg', buffer: x })));
  await p.waitForSelector('.om-sum', { timeout: 30000 }); await p.waitForTimeout(1200);
  ok('summary', await p.$eval('.om-sum', x => x.innerText.replace(/\s+/g, ' ')));
  ok('cards', await p.$$eval('.om-card', L => L.map(c => c.className.replace('om-card ', '') + ':' + [...c.querySelectorAll('.pill')].map(x => x.textContent).join('|'))));
  await p.screenshot({ path: 'p0/t226_review.png', fullPage: true });
  await p.click('#pfT [data-v="rev"]'); await p.waitForTimeout(300); ok('revCount', await p.$$eval('.om-card', L => L.length)); await p.click('#pfT [data-v="all"]'); await p.waitForTimeout(300);
  // المحرر على الورقة الثانية (مائلة بظل): تعديل إجابة السؤال ١ والتحقق من الدرجة
  await p.click('.om-card >> nth=1 >> button.btn.ghost'); await p.waitForTimeout(900);
  ok('editorImg', await p.$eval('#seI', x => x.naturalWidth));
  const sc0 = await p.$eval('#seSc', x => x.textContent);
  await p.click('[data-q="0"][data-o="3"]'); await p.waitForTimeout(400); const sc1 = await p.$eval('#seSc', x => x.textContent);
  ok('scoreChange', [sc0, sc1]);
  for (const w of W) { await p.setViewportSize({ width: w, height: 900 }); await p.waitForTimeout(400); await p.screenshot({ path: `p0/t226_editor_${w}.png` }); }
  await p.setViewportSize({ width: 1440, height: 900 });
  await p.click('#seOk'); await p.waitForTimeout(800); // ينتقل للتالية
  ok('autoNext', !!(await p.$('#seOk'))); if (await p.$('#seX')) { await p.click('#seX'); await p.waitForTimeout(300); }
  // إزالة المكررة ثم الحفظ
  await p.click('.om-card >> nth=3 >> button.btn.ghost'); await p.waitForTimeout(600); await p.selectOption('#seS', ''); await p.click('#seX'); await p.waitForTimeout(300);
  const dupIdx = await p.evaluate(() => { const c = [...document.querySelectorAll('.om-card')].findIndex(x => /مكررة/.test(x.textContent)); return c; });
  ok('dupFound', dupIdx);
  // نجعل المكررة بلا طالب لتُستبعد
  if (dupIdx >= 0) { const sel = await p.$$('.om-card [data-ps]'); await sel[dupIdx].selectOption(''); await p.waitForTimeout(400); }
  await p.click('#gSave'); await p.waitForTimeout(1800);
  ok('tabAfterSave', await p.$eval('#peTabs .on', x => x.dataset.t));
  const res = await p.evaluate(async id => (await APP.api.list('paper_results', { exam_id: id })).map(r => ({ n: r.student_name, m: r.model, s: r.score, mx: r.max_score, ab: r.absent, img: (r.sheet_img || '').length })), ex.id);
  ok('saved', res);
  await p.screenshot({ path: 'p0/t226_results.png', fullPage: true });
  // تعديل نتيجة محفوظة
  await p.click('[data-img] >> nth=0'); await p.waitForTimeout(900); ok('resEditor', !!(await p.$('#seOk'))); ok('resDelete', !!(await p.$('#seD')));
  await p.click('#seA'); await p.waitForTimeout(200); await p.click('#seOk'); await p.waitForTimeout(1200);
  ok('afterAbsent', await p.evaluate(async id => (await APP.api.list('paper_results', { exam_id: id })).filter(r => r.absent).length, ex.id));
  // طباعة الأوراق المصححة
  await p.click('#rPa'); await p.waitForTimeout(2500); ok('printAnnot', await p.evaluate(() => { const f = document.querySelector('.rs-ov iframe'); return f ? (f.srcdoc.match(/<img/g) || []).length : 0; }));
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); const cls = await p.$('.rs-ov .rs-x, .rs-ov [data-close]'); if (cls) await cls.click().catch(() => {});
  await p.evaluate(() => { document.querySelectorAll('.rs-ov').forEach(x => x.remove()); });
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click('#rX')]); ok('excel', dl ? dl.suggestedFilename() : null);
  if (dl) { await dl.saveAs('p0/t226.xlsx'); }
  // الكاميرا
  await p.click('#peTabs [data-t="grade"]'); await p.waitForTimeout(800); await p.click('#gCam'); await p.waitForTimeout(2500);
  ok('camMsg', await p.$eval('#cmM', x => x.textContent)); await p.screenshot({ path: 'p0/t226_cam.png' }); await p.click('#cmD'); await p.waitForTimeout(300);
  ok('errors', errs);
  console.log(JSON.stringify(R, null, 1)); await b.close();
})();
