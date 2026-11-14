/* منصة دينا — (١) «المطلوب مني»: لوحة المعلم في أعلى «خطتي»
   (٢) استيراد الاختبارات وأوراق العمل من ملفات المعلم (مجلده في Drive أو جهازه): PDF / Word / Excel / نص
       ← استخراج الأسئلة آلياً (اختيار من متعدد، صواب وخطأ، أكمل، مقالي) ← مراجعة وتعديل
       ← حفظ في بنك الأسئلة، وتحويلها إلى اختبار إلكتروني أو ورقة عمل أو واجب برابط للطالب، أو طباعتها ورقياً. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, I } = A;
  const iso = d => A.isoDate(d);

  // ======================= (١) المطلوب مني =======================
  const my0 = V.my;
  if (my0) V.my = function (root) {
    const r = my0.apply(this, arguments);
    try { paintTodo(root); } catch (_) { }
    return r;
  };
  async function paintTodo(root) {
    const w = A.week(); if (!w || !S.me) return;
    const head = $('.head', root); if (!head || $('#myTodo', root)) return;
    const mine = S.entries.filter(e => e.teacher_id === S.me.id);
    if (!mine.length) return;
    const req = mine.filter(A.required), todo = req.filter(e => !A.filled(e)), ret = mine.filter(e => e.status === 'returned');
    const unsent = mine.filter(e => A.filled(e) && !['submitted', 'approved'].includes(e.status) && e.status !== 'returned');
    const ws = A.parseDate(w.start_date), t = new Date(); t.setHours(0, 0, 0, 0); const di = Math.round((t - ws) / 864e5);
    const todayL = di >= 0 && di < ((A.section() || {}).days || 5) ? mine.filter(e => e.day === di && e.subject_id).sort((a, b) => a.period - b.period) : [];
    const exPend = todayL.filter(e => !e.exec_status || e.exec_status === 'pending');
    const dl = w.deadline ? new Date(w.deadline) : null; const hrs = dl ? Math.round((dl - new Date()) / 36e5) : null;
    const box = document.createElement('div'); box.id = 'myTodo'; box.className = 'mt-wrap'; head.insertAdjacentElement('afterend', box);
    const card = (k, n, title, sub, act, tone) => `<button type="button" class="mt-c ${tone || ''} ${n ? '' : 'zero'}" data-mt="${k}"><b>${AR(n)}</b><span>${title}</span>${sub ? `<small>${sub}</small>` : ''}${act ? `<i>${act} ←</i>` : ''}</button>`;
    const draw = (live, quiz) => {
      box.innerHTML = `<div class="mt-h"><h3>المطلوب منك ${todo.length + ret.length + unsent.length + (live ? live.n : 0) + (quiz ? quiz.n : 0) ? '' : '<span class="mt-ok">لا شيء متأخر ✓</span>'}</h3>${dl && w.status === 'open' ? `<span class="mt-dl ${hrs != null && hrs < 24 ? 'warn' : ''}">${hrs < 0 ? 'انتهى موعد التسليم' : hrs < 48 ? `باقٍ ${AR(Math.max(0, hrs))} ساعة على التسليم` : `آخر موعد: ${A.fmtDT(w.deadline)}`}</span>` : ''}</div>
        <div class="mt-g">
          ${card('todo', todo.length, 'حصص لم تكتمل في الخطة', `من ${AR(req.length)} مطلوبة`, 'أكمِلها', todo.length ? 'warn' : '')}
          ${card('ret', ret.length, 'أُعيدت إليك للتعديل', ret.length ? 'راجع ملاحظة المراجِع' : '', 'افتحها', ret.length ? 'bad' : '')}
          ${card('send', unsent.length, 'مكتملة ولم تُرسل', '', 'أرسلها للمراجعة', unsent.length ? 'info' : '')}
          ${card('exec', exPend.length, 'تنفيذ حصص اليوم', todayL.length ? `${AR(todayL.length - exPend.length)} من ${AR(todayL.length)} مؤكدة` : 'لا حصص اليوم', 'التنفيذ اليومي', exPend.length ? 'info' : '')}
          ${live ? card('live', live.n, 'حصص عن بعد بلا درس أو واجب', `${AR(live.total)} حصة في الجدول الاستثنائي`, 'أضِفها', live.n ? 'warn' : '') : ''}
          ${quiz ? card('quiz', quiz.n, 'إجابات تحتاج تصحيحاً يدوياً', quiz.open ? `${AR(quiz.open)} اختبار منشور` : '', 'التصحيح', quiz.n ? 'warn' : '') : ''}
        </div>
        <div id="myPa"></div><div id="myDu"></div><div id="myPrep"></div>
        ${todayL.length ? `<div class="mt-today"><span class="small muted">حصصك اليوم:</span>${todayL.map(e => `<span class="mt-p ${e.exec_status && e.exec_status !== 'pending' ? 'ok' : ''}">${AR(e.period + 1)} · ${esc(A.subjName(e.subject_id))} — ${esc((A.cls(e.class_id) || {}).name || '')}</span>`).join('')}</div>` : ''}`;
      $$('[data-mt]', box).forEach(b => b.onclick = () => {
        const k = b.dataset.mt;
        if (k === 'todo') { A.LS.set('myfilter', 'todo'); V.my(root); }
        else if (k === 'ret') { A.LS.set('myfilter', 'returned'); V.my(root); }
        else if (k === 'send') { const s = $('#submitW', root); if (s) { s.scrollIntoView({ behavior: 'smooth', block: 'center' }); s.focus(); } }
        else if (k === 'exec') { const x = $('#myExec', root); if (x) x.click(); }
        else if (k === 'live') { const l = $('#lvMy', root); if (l) l.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        else if (k === 'quiz') { A.LS.set('as_t', 'results'); location.hash = '#/assess'; }
      });
    };
    draw(null, null); if (A.myPeriodAtt) A.myPeriodAtt($('#myPa', box)); if (A.myDuty) A.myDuty($('#myDu', box)); if (A.myPrepBoard) A.myPrepBoard($('#myPrep', box));
    // البيانات الإضافية (جداول عن بعد + الاختبارات) دون تأخير اللوحة
    let live = null, quiz = null;
    try { const td = iso(new Date()), l = (await api.list('display_schedules', { section_id: S.sectionId })).filter(d => d.published && d.date_to >= td && d.date_from <= td);
      if (l.length) { const E = await (A._liveEntries ? A._liveEntries.entriesOf(l.map(d => d.id), l) : api.list('live_entries', { ds_id: l.map(d => d.id) })).catch(() => []); let n = 0, total = 0;
        l.forEach(d => (d.slots || []).filter(x => x.t === S.me.id).forEach(x => { total++; const e = E.find(y => y.ds_id === d.id && y.class_id === x.c && y.day === x.d && y.period === x.p); if (!e || !((e.topic || '').trim() || (e.homework || '').trim())) n++; }));
        if (total) live = { n, total }; } } catch (_) { }
    try { const zs = (await api.list('quizzes', { school_id: S.school.id, teacher_id: S.me.id }, { select: 'id,status' })); const pub = zs.filter(z => z.status === 'published');
      if (zs.length) { const at = await api.list('quiz_attempts', { quiz_id: zs.map(z => z.id) }, { select: 'quiz_id,pending_manual' }).catch(() => []); quiz = { n: at.filter(a => a.pending_manual).length, open: pub.length }; } } catch (_) { }
    if (document.body.contains(box)) { draw(live, quiz); if (A.myPeriodAtt) A.myPeriodAtt($('#myPa', box)); if (A.myDuty) A.myDuty($('#myDu', box)); if (A.myPrepBoard) A.myPrepBoard($('#myPrep', box)); }
  }

  // ======================= (٢) استيراد الأسئلة من الملفات =======================
  const NUM = s => String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  const clean = s => String(s || '').replace(/ /g, ' ').replace(/[‎‏‪-‮]/g, '').replace(/\s+/g, ' ').trim();
  const loadPdf = () => new Promise((ok, no) => { if (window.pdfjsLib) return ok(window.pdfjsLib); const s = document.createElement('script'); s.src = 'vendor/pdf.min.js'; s.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; ok(pdfjsLib); }; s.onerror = () => no(new Error('تعذّر تحميل قارئ PDF')); document.head.appendChild(s); });

  /* قراءة الصور وملفات PDF الممسوحة ضوئياً (OCR) — تعمل داخل المتصفح دون رفع الملف لأي خادم.
     تُحمَّل المكتبة عند الحاجة فقط. الدقة تعتمد على وضوح الصورة، لذلك تُعرض الأسئلة للمراجعة قبل الحفظ. */
  let _tw = null; const prog = t => { try { A._ocrProg && A._ocrProg(t); } catch (_) { } };
  const loadJs = src => new Promise((ok, no) => { const x = document.createElement('script'); x.src = src; x.onload = ok; x.onerror = () => no(new Error('تعذّر تحميل قارئ الصور')); document.head.appendChild(x); });
  async function ocrWorker() {
    if (_tw) return _tw; if (!window.Tesseract) { prog('تحميل قارئ الصور (مرة واحدة)…'); await loadJs('vendor/tess/tesseract.min.js'); }
    const base = new URL('vendor/tess/', location.href).href; let pg = '';
    _tw = await Tesseract.createWorker(['ara', 'eng'], 1, { workerPath: base + 'worker.min.js', corePath: base, langPath: base + 'lang', gzip: true, logger: m => { if (m.status === 'recognizing text') prog(`${pg} قراءة النص ${AR(Math.round((m.progress || 0) * 100))}٪`); else if (/load/.test(m.status || '')) prog('تجهيز قارئ الصور…'); } });
    _tw._pg = t => { pg = t; }; return _tw;
  }
  let _ta = null; // قارئ عربي فقط للخلايا (أدق من العربي+الإنجليزي)
  async function arWorker() { if (_ta) return _ta; await ocrWorker(); const base = new URL('vendor/tess/', location.href).href; _ta = await Tesseract.createWorker(['ara'], 1, { workerPath: base + 'worker.min.js', corePath: base, langPath: base + 'lang', gzip: true }); try { await _ta.setParameters({ tessedit_pageseg_mode: '6' }); } catch (_) { } return _ta; }
  // تصحيح أخطاء القراءة الشائعة في أوراق الأسئلة العربية
  const ocrFix = t => clean(String(t || '').normalize('NFKC')).replace(/^[|¦!]\s*/, '').replace(/\s+([،.؟:)])/g, '$1').replace(/\(\s+/g, '(').replace(/[_]{2,}|[.·•]{3,}|…+/g, '......').replace(/^([0-9٠-٩]{1,3})\s*[-–—_.,،]\s*/, '$1) ').replace(/^\(?([أابجدهو])\s*[-–—_.,،]\s+/, '$1) ');
  // أخطاء شائعة: «2(» بدل «2)»، وسقوط حرف الخيار الأول «أ)» قبل سطر «ب)»
  const ocrPost = L => { let qn = 0; return L.map((l, i) => { l = l.replace(/^([0-9٠-٩]{1,3})\s*\(\s*/, '$1) ').replace(/^[)(]\s*([0-9٠-٩]{1,3})[^\s؀-ۿ]*\s+/, '$1) ').replace(/^[)(]\s*([أابجده])\s+/, '$1) ').replace(/^[©®€“”"'^*•]\s*[)(]\s*/, '§ ');
    const nm = l.match(/^([0-9٠-٩]{1,3})\s*[)\-.]/); if (nm) qn = +NUM(nm[1]); else { const n2 = l.match(/^([0-9٠-٩]{1,2})\s+(?=[؀-ۿ])/); if (n2 && +NUM(n2[1]) === qn + 1) { qn++; l = l.replace(/^([0-9٠-٩]{1,2})\s+/, '$1) '); } }
    const nx = L[i + 1] || ''; if (/^\(?\s*[بج]\s*[)\-.ـ]/.test(nx) && /^[أا]\s+\S/.test(l)) l = l.replace(/^([أا])\s+/, '$1) ');
    if (/^\(?\s*ب\s*[)\-.ـ]/.test(nx) && !/^\(?\s*[أا]\s*[)\-.ـ]/.test(l) && !/^[0-9٠-٩]{1,3}\s*[)\-.]/.test(l)) { const m = l.match(/^[(\[|!1lIاإآ]\s*\)?\s*(.+)$/); if (m && !/\)/.test(m[1])) return 'أ) ' + m[1]; } return l; }); };
  async function imgCanvas(f) { const bmp = await (window.createImageBitmap ? createImageBitmap(f) : new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('تعذّر فتح الصورة')); im.src = URL.createObjectURL(f); }));
    const k = Math.min(2.2, Math.max(1, 2000 / Math.max(bmp.width, bmp.height))), c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height); return c; }
  /* ===== القراءة الذكية للصور =====
     (أ) أوراق الأسئلة المصمّمة جداول (رقم | نص السؤال، ثم صف الخيارات أ | … | ب | … ): تُكتشف خطوط الجدول،
         وتُقرأ كل خلية وحدها (أدق بكثير من قراءة الصفحة كاملة)، وتُعرف الإجابة الصحيحة من الخلية المظللة (أصفر/أخضر/…).
     (ب) الأوراق العادية: تُزال ألوان التظليل قبل القراءة، والكلمات المظللة تُعلَّم إجابةً صحيحة. */
  const HLM = '✱';
  function pix(c) { const W = c.width, H = c.height, d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, W, H).data, dark = new Uint8Array(W * H), hl = new Uint8Array(W * H), lum = new Uint8Array(W * H);
    for (let i = 0, p = 0; p < W * H; i += 4, p++) { const r = d[i], g = d[i + 1], b = d[i + 2], L = (r * 299 + g * 587 + b * 114) / 1000, mx = Math.max(r, g, b), mn = Math.min(r, g, b); lum[p] = L; dark[p] = L < 110 ? 1 : 0; hl[p] = mx - mn > 70 && mx > 150 && L > 120 ? 1 : 0; }
    return { W, H, dark, hl, lum }; }
  const ratio = (P, x0, y0, x1, y1, k) => { let n = 0, t = 0; for (let y = Math.max(0, y0); y <= Math.min(P.H - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(P.W - 1, x1); x++) { t++; n += P[k][y * P.W + x]; } return t ? n / t : 0; };
  const groups = (idx) => { const g = []; idx.forEach(v => { const l = g[g.length - 1]; if (l && v - l.b <= 2) l.b = v; else g.push({ a: v, b: v }); }); return g; };
  // خطوط الجدول: صفوف أفقية (سطر داكن متصل ≥ ٤٥٪ من العرض)، ثم خطوط عمودية داخل كل صف
  function findGrid(P) {
    const { W, H, dark } = P, hy = [];
    for (let y = 0; y < H; y++) { let run = 0, best = 0; for (let x = 0; x < W; x++) { if (dark[y * W + x]) { if (++run > best) best = run; } else run = 0; } if (best >= W * 0.45) hy.push(y); }
    const hg = groups(hy), bands = [];
    for (let i = 0; i + 1 < hg.length; i++) { const top = hg[i].b + 1, bot = hg[i + 1].a - 1, h = bot - top + 1; if (h < 12) continue;
      const vx = []; for (let x = 0; x < W; x++) { let n = 0; for (let y = top + 1; y < bot; y++) n += dark[y * W + x]; if (n >= (h - 2) * 0.88) vx.push(x); }
      const vg = groups(vx); if (!vg.length || vg[0].a > 4) vg.unshift({ a: -1, b: -1 }); if (vg[vg.length - 1].b < W - 5) vg.push({ a: W, b: W });
      const cells = []; for (let j = 0; j + 1 < vg.length; j++) { const x0 = vg[j].b + 1, x1 = vg[j + 1].a - 1; if (x1 - x0 < 8) continue; const ink = ratio(P, x0 + 3, top + 3, x1 - 3, bot - 3, 'dark'); cells.push({ x0, x1, y0: top, y1: bot, ink: ink > 0.004 }); }
      if (cells.length) bands.push({ top, bot, cells }); }
    return bands;
  }
  // قصّ خلية وتنظيفها للقراءة: التظليل والخلفيات الرمادية ← أبيض، والنص ← أسود
  function cellCanvas(src, P, c, k) { const pad = 10, ix = 3, x0 = c.x0 + ix, y0 = c.y0 + ix, w = Math.max(4, c.x1 - c.x0 - 2 * ix), h = Math.max(4, c.y1 - c.y0 - 2 * ix);
    const a = document.createElement('canvas'); a.width = w + pad * 2; a.height = h + pad * 2; const g = a.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, a.width, a.height); g.drawImage(src, x0, y0, w, h, pad, pad, w, h);
    const im = g.getImageData(0, 0, a.width, a.height), d = im.data; for (let i = 0; i < d.length; i += 4) { const r = d[i], gg = d[i + 1], b = d[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), L = (r * 299 + gg * 587 + b * 114) / 1000; const v = mx - mn > 70 && mx > 150 && L > 120 ? 255 : L < 165 ? Math.max(0, L - 60) : 255; d[i] = d[i + 1] = d[i + 2] = v; } g.putImageData(im, 0, 0);
    const o = document.createElement('canvas'); o.width = Math.round(a.width * k); o.height = Math.round(a.height * k); const q = o.getContext('2d'); q.fillStyle = '#fff'; q.fillRect(0, 0, o.width, o.height); q.imageSmoothingQuality = 'high'; try { q.filter = 'blur(1px)'; } catch (_) { } q.drawImage(a, 0, 0, o.width, o.height); return o; }
  // جودة النص المقروء: حروف عربية في كلمات سليمة ناقص الرموز الغريبة
  const quality = t => { const w = String(t || '').split(/\s+/).filter(Boolean); let g = 0, j = 0; w.forEach(x => { const a = (x.match(/[ء-يٱ-ۓ]/g) || []).length; if (a >= 2 && a >= x.replace(/[ً-ْ]/g, '').length - 1) g += a; else if (/^[0-9٠-٩]+$/.test(x) && x.length > 1) g += x.length; else j += Math.max(1, x.length - a); }); return g - 3 * j; };
  // تقسيم الخلية إلى أسطر بالإسقاط الأفقي
  function lineCrops(cv) { const W = cv.width, H = cv.height, d = cv.getContext('2d').getImageData(0, 0, W, H).data, rows = []; for (let y = 0; y < H; y++) { let n = 0; for (let x = 0; x < W; x++) if (d[(y * W + x) * 4] < 128) n++; rows.push(n); }
    let B = [], s0 = -1; rows.forEach((n, y) => { if (n && s0 < 0) s0 = y; if (!n && s0 >= 0) { B.push([s0, y]); s0 = -1; } }); if (s0 >= 0) B.push([s0, H]); if (!B.length) return [cv];
    const mx = Math.max(...B.map(b => b[1] - b[0])); const M = []; B.forEach(b => { const l = M[M.length - 1]; if (l && (b[1] - b[0] < mx * 0.4 || l[1] - l[0] < mx * 0.4)) l[1] = b[1]; else M.push(b.slice()); });
    return M.map(([a, b]) => { const p = 12, o = document.createElement('canvas'); o.width = W; o.height = b - a + p * 2; const g = o.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, o.width, o.height); g.drawImage(cv, 0, a, W, b - a, 0, p, W, b - a); return o; }); }
  const cellText = t => { let s = String(t || '').normalize('NFKC').replace(/\s*[«»‘’“”]\s*/g, '، ').replace(/[©®™]/g, ' ').replace(/[|¦\[\]{}_~`]/g, ' ').replace(/\r?\n+/g, ' '); const ar = /[؀-ۿ]/.test(s);
    if (ar) s = s.split(/\s+/).filter(w => !/^[A-Za-z@#$%^&*=+<>\\/'"]+[.,:;!?]*$/.test(w)).join(' ');
    return clean(s).replace(/^[\s.,،:;\-–—]+|[\s,،;\-–—]+$/g, '').replace(/\s+([،.؟:)])/g, '$1').replace(/\(\s+/g, '('); };
  async function tableQs(src, label) {
    const P = pix(src), bands = findGrid(P);
    const tw = Math.max(1, ...bands.map(b => b.cells[b.cells.length - 1].x1 - b.cells[0].x0));
    const rows = bands.map(b => { const wide = b.cells.filter(c => c.ink && c.x1 - c.x0 >= tw * 0.1), lab = b.cells.filter(c => c.ink && c.x1 - c.x0 < tw * 0.1); return { b, wide, lab, kind: wide.length >= 2 ? 'opt' : wide.length === 1 ? 'txt' : '' }; });
    const nOpt = rows.filter(r => r.kind === 'opt').length, nTxt = rows.filter(r => r.kind === 'txt').length;
    if (nOpt < 2 || nTxt < 2) return null; // ليست ورقة أسئلة بجدول
    const wa = await arWorker(); let we = null;
    const total = rows.reduce((a, r) => a + (r.kind === 'opt' ? r.wide.length : r.kind === 'txt' ? 1 : 0), 0); let done = 0;
    // تُقرأ كل خلية بمقاسين ويؤخذ الأوثق؛ والخلايا الإنجليزية بالقارئ الإنجليزي
    const rec = async (w, c) => { const C = [];
      for (const k of [1.5, 2]) { const cv = cellCanvas(src, P, c, k), r = (await w.recognize(cv)).data || {}; C.push({ confidence: r.confidence || 0, text: r.text || '', cv }); if ((r.confidence || 0) >= 90) break; }
      if (Math.max(...C.map(x => x.confidence)) < 85) { // قراءة سطراً سطراً (أفضل للنص القصير والخلايا متعددة الأسطر)
        const cv = cellCanvas(src, P, c, 1); try { await w.setParameters({ tessedit_pageseg_mode: '13' }); const T = []; for (const l of lineCrops(cv)) T.push(((await w.recognize(l)).data || {}).text || ''); C.push({ confidence: 0, text: T.join('\n').replace(/(^|\s)[0\-.ـ](?=\s|$)/g, ' '), cv }); } catch (_) { } finally { try { await w.setParameters({ tessedit_pageseg_mode: '6' }); } catch (_) { } } }
      C.forEach(x => x.score = quality(x.text) + x.confidence / 50); return C.sort((a, b) => b.score - a.score)[0]; };
    const read = async c => { done++; prog(`${label || ''} قراءة الخلايا ${AR(done)} من ${AR(total)}`.trim()); let b = await rec(wa, c);
      if (b.confidence < 55 && !/[؀-ۿ]{3}/.test(b.text)) { we = we || await ocrWorker(); try { await we.setParameters({ tessedit_pageseg_mode: '6' }); } catch (_) { } const e = await rec(we, c); if (e.confidence > b.confidence) b = e; }
      const t = cellText(b.text); if (A._tblDbg) A._tblDbg.push({ c, img: b.cv.toDataURL(), raw: b.text, conf: b.confidence, t }); return t; };
    const qs = []; let cur = null;
    try {
      for (const r of rows) {
        if (r.kind === 'txt') { let t = await read(r.wide[0]); t = t.replace(/^\(?[0-9٠-٩]{1,3}\s*[)\-.ـ:]\s*/, '').replace(/\s+[0-9٠-٩]{1,3}$/, '');
          if (t.replace(/[^؀-ۿA-Za-z]/g, '').length < 4) continue; // رقم الصفحة أو خلية فارغة
          cur = { body: t, qtype: 'essay', options: [], answer: '', points: 1, _ocr: 1, _tbl: 1, _y: [r.b.top, r.b.bot] }; qs.push(cur); continue; }
        if (r.kind !== 'opt' || !cur) continue;
        const cells = r.wide.slice().sort((a, b) => b.x0 - a.x0); // من اليمين لليسار
        const hr = cells.map(c => ratio(P, c.x0 + 3, c.y0 + 3, c.x1 - 3, c.y1 - 3, 'hl'));
        // حرف الخيار المظلل يدل على خليته المجاورة يساراً
        r.lab.forEach(l => { if (ratio(P, l.x0 + 2, l.y0 + 2, l.x1 - 2, l.y1 - 2, 'hl') > 0.3) { let j = -1, best = 1e9; cells.forEach((c, k) => { const d = l.x0 - c.x1; if (d >= -4 && d < best) { best = d; j = k; } }); if (j >= 0) hr[j] = Math.max(hr[j], 0.5); } });
        for (let k = 0; k < cells.length; k++) cur.options.push({ t: await read(cells[k]), _h: hr[k] }); cur._y[1] = r.b.bot;
      }
    } finally { if (we) try { await we.setParameters({ tessedit_pageseg_mode: '3' }); } catch (_) { } }
    qs.forEach(q => { const o = q.options; if (o.length) { const lat = o.filter(x => /[A-Za-z]/.test(x.t) && !/[؀-ۿ]/.test(x.t)).length; if (lat > o.length / 2) o.reverse(); // جدول إنجليزي: من اليسار لليمين
        const mx = Math.max(...o.map(x => x._h)); o.forEach(x => { if (x._h > 0.22 && x._h >= mx * 0.6) x.ok = true; delete x._h; }); }
      smartType(q); try { const [y0, y1] = q._y, x0 = Math.max(0, Math.min(...bands.map(b => b.cells[0].x0)) - 4), w = Math.min(src.width - x0, tw + 10), h = y1 - y0 + 8, k = Math.min(1, 900 / w), o = document.createElement('canvas'); o.width = Math.round(w * k); o.height = Math.round(h * k); o.getContext('2d').drawImage(src, x0, Math.max(0, y0 - 4), w, h, 0, 0, o.width, o.height); q._img = o.toDataURL('image/jpeg', 0.82); } catch (_) { } delete q._y; });
    return qs.length ? qs : null;
  }
  // تحديد نوع السؤال تلقائياً من نصه وخياراته
  function smartType(q) {
    const o = q.options.filter(x => x.t || x.ok), body = q.body || '';
    if (o.length >= 2) { const isTF = o.length === 2 && o.every(x => /^(صح|صواب|خطأ|خطا|true|false|✓|✗|×)$/i.test(x.t.trim()));
      if (isTF) { const ok = o.find(x => x.ok); q.qtype = 'tf'; q.answer = ok ? TF(ok.t) : ''; q.options = []; return q; }
      q.options = o; q.qtype = o.filter(x => x.ok).length > 1 ? 'multi' : 'mcq'; return q; }
    q.options = []; const nb = (body.match(/\.{3,}|…+|_{3,}/g) || []).length;
    if (/\(\s*\)\s*$|\(\s*(✓|✗|صح|خطأ)?\s*\)\s*$/.test(body) || /^(?:ضع|ضعي).*(صح|✓|علامة)/.test(body)) { q.qtype = 'tf'; return q; }
    if (nb) { q.qtype = 'blank'; q.options = Array.from({ length: nb }, () => ({ t: '' })); q.points = Math.max(1, nb); return q; }
    q.qtype = /علل|اشرح|وضح|وضّح|قارن|ناقش|فسّر|فسر|بيّن|بين/.test(body) ? 'essay' : /^(?:ما|من|متى|أين|كم|ماذا|عرّف|عرف|اذكر|سمّ|سم)\b/.test(body) && body.length < 90 ? 'short' : 'essay'; return q;
  }
  const qsToLines = qs => { const L = []; qs.forEach((q, i) => { L.push(`${i + 1}) ${q.body}`); (q.options || []).forEach((o, j) => L.push(`${LETTERS[j] || j + 1}) ${o.t}`)); }); return L; };
  // القراءة العامة مع إزالة التظليل وتعليم الكلمات المظللة
  async function ocrCanvas(c, label, mark, mode) { const w = await ocrWorker(); w._pg(label || ''); const P = pix(c), g = c.getContext('2d'), im = g.getImageData(0, 0, c.width, c.height), d = im.data;
    for (let p = 0, i = 0; p < P.W * P.H; p++, i += 4) if (P.hl[p]) d[i] = d[i + 1] = d[i + 2] = 255; const cc = document.createElement('canvas'); cc.width = c.width; cc.height = c.height; cc.getContext('2d').putImageData(im, 0, 0);
    let D = {}; if (mode === 'ar') { const wa = await arWorker(); await wa.setParameters({ tessedit_pageseg_mode: '4' }); try { D = (await wa.recognize(cc)).data || {}; } finally { await wa.setParameters({ tessedit_pageseg_mode: '6' }); } } else D = (await w.recognize(cc)).data || {};
    let lines = (D.lines || []).length ? D.lines.map(l => { let t = String(l.text || '').replace(/\r?\n/g, ' '); if (mark) (l.words || []).forEach(x => { const b = x.bbox || {}; if (b.x1 > b.x0 && x.text && ratio(P, b.x0, b.y0, b.x1, b.y1, 'hl') > 0.3) { const k = t.indexOf(x.text); if (k >= 0) t = t.slice(0, k + x.text.length) + HLM + t.slice(k + x.text.length); } }); return t; }) : String(D.text || '').split(/\r?\n/);
    return ocrPost(lines.map(ocrFix).filter(Boolean)); }
  // يعيد { lines, qs } — qs موجودة إذا كانت الورقة جدولاً
  async function smartCanvas(c, label) { let qs = null; try { qs = await tableQs(c, label); } catch (e) { console.warn('table ocr', e); }
    if (qs) return { qs, lines: qsToLines(qs) };
    // قراءتان (عربي فقط، وعربي+إنجليزي) ويؤخذ ما استُخرج منه أسئلة أكثر وأكمل
    const sc = L => { const q = parseLines(L).qs; return q.length * 4 + q.reduce((a, x) => a + (x.options || []).length + ((x.options || []).some(o => o.ok) ? 2 : 0), 0) + L.reduce((a, l) => a + quality(l), 0) / 400; };
    const L1 = await ocrCanvas(c, label, true, 'ar'), L2 = await ocrCanvas(c, label, true, 'mix'); return { qs: null, lines: sc(L2) > sc(L1) ? L2 : L1 }; }
  async function imageLines(f) { const r = await smartCanvas(await imgCanvas(f), ''); return r.lines.map(l => l.split(HLM).join('')); }
  async function imageQs(f) { return smartCanvas(await imgCanvas(f), ''); }
  async function pdfOcr(doc) { const out = [], qs = [], n = Math.min(doc.numPages, 25); let any = false;
    for (let i = 1; i <= n; i++) { const pg = await doc.getPage(i), vp = pg.getViewport({ scale: 2 }), c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; const r = await smartCanvas(c, `صفحة ${AR(i)} من ${AR(n)} —`); out.push(...r.lines); if (r.qs) { any = true; qs.push(...r.qs); } else qs.push(...parseLines(r.lines).qs); }
    out._qs = any ? qs : null; return out; }
  A._imageLines = imageLines; A._imageQs = imageQs; A._smartType = smartType;
  A._ocrDone = () => { if (_tw) { try { _tw.terminate(); } catch (_) { } _tw = null; } if (_ta) { try { _ta.terminate(); } catch (_) { } _ta = null; } };
  const IS_IMG = f => /\.(png|jpe?g|webp|bmp|gif|heic)$/i.test(f.name) || (f.type || '').startsWith('image/');
  async function pdfLines(f) {
    const lib = await loadPdf(); const doc = await lib.getDocument({ data: await f.arrayBuffer() }).promise; const out = [];
    for (let i = 1; i <= doc.numPages; i++) { const tc = await (await doc.getPage(i)).getTextContent(); const rows = [];
      tc.items.forEach(it => { if (!it.str || !it.str.trim()) return; const y = Math.round(it.transform[5]); let r = rows.find(r => Math.abs(r.y - y) <= 3); if (!r) rows.push(r = { y, it: [] }); r.it.push(it); });
      rows.sort((a, b) => b.y - a.y).forEach(r => { const rtl = r.it.some(x => /[؀-ۿﭐ-﻿]/.test(x.str)); r.it.sort((a, b) => rtl ? b.transform[4] - a.transform[4] : a.transform[4] - b.transform[4]);
        // ملفات PDF التي تخزّن العربية حرفاً حرفاً (أشكال العرض): تُضم الحروف المتلاصقة وتُعاد لصورتها الأصلية
        const glyph = r.it.reduce((a, x) => a + x.str.length, 0) / r.it.length < 2.2;
        let t = '';
        if (glyph) r.it.forEach((x, i) => { if (!i) { t = x.str; return; } const pv = r.it[i - 1], fs = Math.abs(x.transform[0]) || 10; const gap = rtl ? pv.transform[4] - (x.transform[4] + x.width) : x.transform[4] - (pv.transform[4] + pv.width); t += (gap > fs * 0.18 ? ' ' : '') + x.str; });
        else t = r.it.map(x => x.str).join(' ');
        t = t.normalize('NFKC'); if (glyph && rtl) t = t.replace(/[()]/g, c => c === '(' ? ')' : '(');
        out.push(clean(t)); }); }
    if (out.join('').replace(/\s/g, '').length < 20) { const o = await pdfOcr(doc); if (!o.join('').trim()) throw new Error('تعذّرت قراءة الصفحات — جرّب صورة أوضح أو ملف Word'); const z = o.map(l => l.split(HLM).join('')); z._ocr = true; z._qs = o._qs; return z; }
    if (false) throw new Error('الملف PDF صورة ممسوحة بلا نص — صدّره من Word أو Google Docs بصيغة PDF أو Word ثم أعد المحاولة');
    return out;
  }
  async function docxLines(f) {
    if (!window.JSZip) throw new Error('قارئ Word غير محمّل');
    const z = await JSZip.loadAsync(await f.arrayBuffer()); const x = await z.file('word/document.xml').async('string');
    const d = new DOMParser().parseFromString(x, 'application/xml'); const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'; const out = [];
    [...d.getElementsByTagNameNS(W, 'p')].forEach(p => { const t = clean([...p.getElementsByTagNameNS(W, 't')].map(n => n.textContent).join('')); const isList = p.getElementsByTagNameNS(W, 'numPr').length > 0; if (t) out.push(isList && !/^\(?[0-9٠-٩]+\s*[\)\-.ـ:]/.test(t) && !/^\(?[أابجدهوa-dA-D]\s*[\)\-.ـ:]/.test(t) ? '§ ' + t : t); });
    return out;
  }
  /* استيراد Excel المرن — يدعم القالب الشامل (كل الأنواع والحقول) والقوالب البسيطة القديمة.
     يبحث عن ورقة «الأسئلة» وصف العناوين أينما كان في أول ١٥ صفاً. */
  const QTYPE_OF = t => { const k = A.normKey(t || ''); if (!k) return ''; return /متعدد.*اجاب|multi/.test(k) ? 'multi' : /بنك/.test(k) && /فراغ|اكمل/.test(k) ? 'blank+' : /فراغ|اكمل|blank/.test(k) ? 'blank' : /مزاوج|توصيل|^صل|طابق|match/.test(k) ? 'match' : /ترتيب|رتب|order/.test(k) ? 'order' : /مقال|essay/.test(k) ? 'essay' : /صواب|صح|خطا|tf|true/.test(k) ? 'tf' : /قصير|short/.test(k) ? 'short' : /اختيار|mcq|choice/.test(k) ? 'mcq' : ''; };
  const LEVEL_OF = t => { const k = A.normKey(t || ''); return /تذكر|remember/.test(k) ? 'remember' : /فهم|استيعاب|understand/.test(k) ? 'understand' : /تطبيق|apply/.test(k) ? 'apply' : /عليا|تحليل|تقويم|ابداع|higher/.test(k) ? 'higher' : ''; };
  const DIFF_OF = t => { const k = A.normKey(NUM(t || '')); return /سهل|^1$|easy/.test(k) ? 1 : /صعب|^3$|hard/.test(k) ? 3 : /متوسط|^2$|medium/.test(k) ? 2 : 0; };
  const LET2 = x => { x = clean(NUM(x)).replace(/[()ـ.\-]/g, '').trim(); if (/^[1-9]$/.test(x)) return +x - 1; return LETTER(x); };
  const PAIR = t => { const m = clean(t).split(/\s*(?:=|←|→|⇐|⇒|<-|->|\|)\s*/); if (m.length >= 2 && m[0] && m[1]) return { t: m[0], m: m.slice(1).join(' ') }; const c = clean(t).split(/\s*[:：]\s*/); return c.length >= 2 && c[0] && c[1] ? { t: c[0], m: c.slice(1).join(' ') } : null; };
  function sheetRows(wb) {
    const names = wb.SheetNames.slice().sort((x, y) => (/اسئل|أسئل|question/i.test(y) ? 1 : 0) - (/اسئل|أسئل|question/i.test(x) ? 1 : 0));
    for (const n of names) { if (/تعليمات|امثل|أمثل|قوائم|example|guide|list/i.test(n) && wb.SheetNames.length > 1 && !/اسئل|أسئل/.test(n)) continue;
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' });
      const hi = rows.slice(0, 15).findIndex(r => r.some(c => { const k = A.normKey(String(c)); return (k.includes('سؤال') || k.includes('question')) && !k.includes('نوع') && !k.includes('type'); }));
      if (hi >= 0) return { rows: rows.slice(hi + 1), head: rows[hi], sheet: n }; }
    return null;
  }
  async function sheetQs(f) {
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const R = sheetRows(wb);
    if (!R) throw new Error('لم أجد عمود «نص السؤال» — استخدم «قالب Excel» من نافذة الاستيراد');
    const h = R.head.map(x => A.normKey(String(x)).replace(/[*＊]/g, '').trim()); const used = new Set();
    const col = (test) => { const i = h.findIndex((x, j) => !used.has(j) && x && test(x)); if (i >= 0) used.add(i); return i; };
    const cT = col(x => /نوع|type/.test(x)), cQ = col(x => /سؤال|question/.test(x)), cA = col(x => /اجابه|answer|جواب/.test(x)), cP = col(x => /درجه|points|mark/.test(x));
    const cU = col(x => /وحده|unit/.test(x)), cL = col(x => /درس|lesson/.test(x)), cV = col(x => /مستوي|level|بلوم/.test(x)), cD = col(x => /صعوبه|difficulty/.test(x));
    const cS = col(x => /مهاره|skill|ناتج/.test(x)), cE = col(x => /تفسير|تغذيه|شرح|explanation|feedback/.test(x)), cI = col(x => /صوره|image/.test(x)), cH = col(x => /مشاركه|shared|share/.test(x));
    used.add(h.findIndex(x => x === 'م' || x === '#' || x === 'no'));
    const cO = h.map((x, i) => !used.has(i) && /^(خيار|option|choice)|^(ا|ب|ج|د|ه|هـ|و|[a-f])$/.test(x) ? i : -1).filter(i => i >= 0);
    const g = (r, c) => c >= 0 ? clean(r[c]) : '';
    return R.rows.filter(r => g(r, cQ)).map(r => {
      const opts = cO.map(i => clean(r[i])).filter(Boolean), ans = g(r, cA); let ty = QTYPE_OF(g(r, cT)); const bank = ty === 'blank+'; if (bank) ty = 'blank';
      if (!ty) ty = TF(ans) && !opts.length && ans.length < 8 ? 'tf' : opts.length >= 2 ? (ans.split(/\s*[،,;؛]\s*/).filter(x => LET2(x) >= 0).length > 1 ? 'multi' : 'mcq') : /\.{3,}|…+|_{3,}/.test(g(r, cQ)) ? 'blank' : 'short';
      const q = { body: g(r, cQ), qtype: ty, options: [], answer: '', points: +NUM(g(r, cP)) || 1 };
      if (ty === 'mcq' || ty === 'multi') { q.options = opts.map(t => { const ok = OK_MARK.test(t); return { t: clean(t.replace(OK_MARK, '')), ...(ok ? { ok: true } : {}) }; });
        const parts = (ty === 'multi' ? ans.split(/\s*[،,;؛]\s*|\s+و\s*/) : [ans]).map(x => x.trim()).filter(Boolean);
        parts.forEach(a => { const k = LET2(a); const i = k >= 0 && k < q.options.length ? k : q.options.findIndex(o => A.normKey(o.t) === A.normKey(a)); if (i >= 0) q.options[i].ok = true; }); }
      else if (ty === 'tf') q.answer = TF(ans);
      else if (ty === 'blank') { const a = opts.length ? opts : ans.split(/\s*[؛;،,]\s*/).filter(Boolean); q.options = a.map(t => ({ t })); q.answer = bank || /بنك/.test(ans) && opts.length ? 'bank' : ''; if (q.options.length > 1 && q.points === 1 && !g(r, cP)) q.points = q.options.length; }
      else if (ty === 'match') { q.options = (opts.length ? opts : ans.split(/\s*[؛;،,]\s*/)).map(PAIR).filter(Boolean); }
      else if (ty === 'order') { q.options = (opts.length > 1 ? opts : (opts[0] || ans).split(/\s*[،,؛;]\s*/)).filter(Boolean).map(t => ({ t: clean(t) })); }
      else q.answer = ans;
      const lv = LEVEL_OF(g(r, cV)), df = DIFF_OF(g(r, cD)); if (lv) q.level = lv; if (df) q.difficulty = df;
      if (g(r, cL)) q._lesson = g(r, cL); if (g(r, cU)) q._unit = g(r, cU); if (g(r, cS)) q.skill = g(r, cS); if (g(r, cE)) q.explanation = g(r, cE);
      if (/^https?:\/\//i.test(g(r, cI))) q.image_url = g(r, cI); if (/^(لا|no|false|0|خاص)$/i.test(g(r, cH))) q.shared = false;
      q.source = f.name; return q; });
  }
  const LETTERS = ['أ', 'ب', 'ج', 'د', 'ه', 'و'];
  const LETTER = s => { const x = clean(s).replace(/[()]/g, '').replace(/^ا$/, 'أ'); const i = LETTERS.indexOf(x); if (i >= 0) return i; const j = 'abcdef'.indexOf(x.toLowerCase()); return x.length === 1 ? j : -1; };
  const TF = s => /✓|✔|صح|صواب|true|^\s*√/i.test(s) ? 'صواب' : /✗|✘|×|خطأ|خطا|false/i.test(s) ? 'خطأ' : '';
  const OK_MARK = /\s*(\*|✓|✔|\(صح\)|\(الصحيحة\)|←\s*الصحيح)\s*$/;
  const optOf = t => { const ok = OK_MARK.test(t) || t.includes('✱'); return { t: clean(t.split('✱').join('').replace(OK_MARK, '')), ...(ok ? { ok: true } : {}) }; };
  const Q_RE = /^\s*(?:§\s*|س\s*[0-9٠-٩]+\s*[\/\-:)]?\s*|\(?\s*[0-9٠-٩]{1,3}\s*[\)\-\.ـ:]\s*)/;
  const OPT_RE = /^\s*\(?\s*([أابجدهوa-fA-F])\s*[\)\-\.ـ:]\s*(.+)$/;
  const SEC_RE = /^\s*(?:السؤال|سؤال)\s+(?:ال)?(?:أول|اول|ثاني|ثالث|رابع|خامس|سادس|[0-9٠-٩]+)/;
  const kindOf = t => /^\s*(?:§\s*)?(?:السؤال\s+\S+\s*[:：\-]?\s*)?(?:صل|صلي|زاوج|طابق)/.test(t) || /صل\s+(?:بين|من)|المناسب من العمود/.test(t) ? 'match' : /رتب|رتّب|رتبي/.test(t) ? 'order' : /اختر|اختاري|ظلل|ضع دائرة|الإجابة الصحيحة|الاجابة الصحيحة/.test(t) ? 'mcq' : /صح|خطأ|خطا|✓|✗|صواب/.test(t) ? 'tf' : /أكمل|اكمل|املأ|املئي|الفراغ|أكملي/.test(t) ? 'short' : /علل|اشرح|وضح|وضّح|أجب|اجب|قارن|اكتب|عرف|عرّف/.test(t) ? 'essay' : '';
  // تقسيم سطر فيه عدة خيارات: «أ) ٣  ب) ٥  ج) ٧»
  const splitInline = l => { const m = [...l.matchAll(/(?:^|\s)\(?([أابجده])\s*[\)\-ـ]\s*/g)]; if (m.length < 2) return null; return m.map((x, i) => clean(l.slice(x.index + x[0].length, i + 1 < m.length ? m[i + 1].index : undefined))).filter(Boolean); };
  function parseLines(lines) {
    const qs = []; let sec = '', cur = null, title = '';
    const push = () => { if (cur && cur.body) qs.push(cur); cur = null; };
    for (let raw of lines) {
      let l = clean(raw); if (!l) continue;
      if (!qs.length && !cur && !title && l.length < 80 && !Q_RE.test(l) && /اختبار|ورقة عمل|واجب|تقويم|مراجعة|نشاط/.test(l)) { title = l.replace(/^§\s*/, ''); continue; }
      { const tail = l.replace(/^§\s*/, '').split(/[:：]/).slice(1).join(':').trim(); // «علل: …» / «أكمل: …» سؤال كامل لا عنوان قسم
        if (!SEC_RE.test(l) && tail.replace(/[^؀-ۿ]/g, '').length >= 8 && /^(أكمل|اكمل|علل|عرّف|عرف|اشرح|وضح|وضّح|قارن|اذكر|فسر|فسّر)/.test(l.replace(/^§\s*/, ''))) { const k = kindOf(l); if (!Q_RE.test(l)) l = '§ ' + l; if (k === 'essay' || k === 'short') sec = k; } }
      if (SEC_RE.test(l) || (/^(اختر|ضع|أكمل|اكمل|أجب|اجب|علل|صل|زاوج|رتب|رتّب|املأ|ظلل)/.test(l.replace(/^§\s*/, '')) && l.length < 90 && !OPT_RE.test(l) && !/^§/.test(l))) { push(); const k = kindOf(l); if (k) sec = k; continue; }
      const ans = l.match(/^(?:الإجابة|الاجابة|الجواب|الحل)\s*(?:الصحيحة)?\s*[:：\-]\s*(.+)$/);
      if (ans && cur) { const a = clean(ans[1]); if (cur.qtype === 'blank') { const p = a.split(/\s*[،,؛]\s*|\s+-\s+/).filter(Boolean); cur.options = cur.options.map((o, j) => ({ t: p[j] || o.t || '' })); if (p.length > cur.options.length) p.slice(cur.options.length).forEach(t => cur.options.push({ t })); continue; } const ml = a.split(/\s*[،,]\s*|\s+و\s*/).map(x => LETTER(x.trim().split(/\s/)[0])).filter(k => k >= 0); if (cur.options.length && ml.length > 1) { cur.qtype = 'multi'; cur.options.forEach((o, j) => o.ok = ml.includes(j)); continue; } if (cur.qtype === 'mcq' || (cur.options.length && cur.qtype !== 'match' && cur.qtype !== 'order')) { const k = LETTER(a.split(/\s/)[0]); const i = k >= 0 ? k : cur.options.findIndex(o => A.normKey(o.t) === A.normKey(a)); cur.options.forEach((o, j) => o.ok = j === i); } else if (cur.qtype === 'tf') cur.answer = TF(a) || cur.answer; else if (cur.qtype === 'blank') { const p = a.split(/\s*[،,؛]\s*|\s+-\s+/).filter(Boolean); cur.options = cur.options.map((o, j) => ({ t: p[j] || o.t || '' })); if (p.length > cur.options.length) p.slice(cur.options.length).forEach(t => cur.options.push({ t })); } else cur.answer = a; continue; }
      const om = l.match(OPT_RE);
      if (cur && om && !Q_RE.test(l.replace(OPT_RE, ''))) { const inl = splitInline(l); (inl || [om[2]]).forEach(t => cur.options.push(optOf(t))); cur.qtype = 'mcq'; continue; }
      if (Q_RE.test(l)) { push(); let body = clean(l.replace(Q_RE, '')); let tf = '';
        const tm = body.match(/\(\s*(✓|✔|✗|✘|×|صح|خطأ|خطا|صواب)?\s*\)\s*$/) || body.match(/^\(\s*(✓|✔|✗|✘|×|صح|خطأ|خطا|صواب)?\s*\)\s*/);
        if (tm) { tf = TF(tm[1] || ''); body = clean(body.replace(tm[0], '')); }
        const inl = splitInline(body); let opts = [];
        if (inl) { const first = body.search(/(?:^|\s)\(?[أابجده]\s*[\)\-ـ]\s*/); opts = inl; body = clean(body.slice(0, first)); }
        if (sec === 'match') { const pm = body.split(/\s*(?:←|→|=|:|—|–|\s-\s)\s*/); if (pm.length >= 2 && pm[0] && pm[1]) { const last = qs[qs.length - 1]; const pair = { t: clean(pm[0]), m: clean(pm.slice(1).join(' ')) }; if (last && last.qtype === 'match' && last._grp) last.options.push(pair); else { cur = { body: 'صل كل عنصر بما يناسبه', qtype: 'match', options: [pair], answer: '', points: 1, _grp: 1 }; push(); } continue; } }
        if (sec === 'order' && !opts.length) { const it = body.split(/\s*[،,؛/]\s*|\s+-\s+/).filter(Boolean); if (it.length >= 3) { cur = { body: 'رتّب ما يلي', qtype: 'order', options: it.map(t => ({ t: clean(t) })), answer: '', points: 1 }; continue; } }
        const nb = (body.match(/\.{3,}|…+|_{3,}/g) || []).length;
        if (!tm && !opts.length && nb && (sec === 'short' || sec === '' || sec === 'blank')) { cur = { body, qtype: 'blank', options: Array.from({ length: nb }, () => ({ t: '' })), answer: '', points: nb > 1 ? nb : 1 }; continue; }
        cur = { body, qtype: tm ? 'tf' : opts.length ? 'mcq' : (sec === 'order' || sec === 'match' ? '' : sec) || ((k => k === 'short' || k === 'essay' ? k : '')(kindOf(body))) || (/\.{3,}|…{1,}|_{3,}/.test(body) ? 'short' : 'essay'), options: opts.map(optOf), answer: tf, points: 1 };
        continue; }
      if (cur) { if (!cur.options.length) cur.body = clean(cur.body + ' ' + l); else cur.options[cur.options.length - 1].t = clean(cur.options[cur.options.length - 1].t + ' ' + l); }
      else if (l.length > 8 && /[؟?]|\.{3,}/.test(l)) { cur = { body: l.replace(/^§\s*/, ''), qtype: sec || 'essay', options: [], answer: '', points: 1 }; }
    }
    push();
    qs.forEach(q => { q.body = clean(String(q.body).split('✱').join('')); (q.options || []).forEach(o => { if (typeof o.t === 'string' && o.t.includes('✱')) { o.t = clean(o.t.split('✱').join('')); o.ok = true; } }); if ((q.qtype === 'mcq' || q.qtype === 'multi') && q.options.length === 2 && q.options.some(o => /صح|صواب/.test(o.t)) && q.options.some(o => /خط/.test(o.t))) { const k = q.options.find(o => o.ok); q.qtype = 'tf'; q.answer = k ? (/خط/.test(k.t) ? 'خطأ' : 'صواب') : ''; q.options = []; } if (q.qtype === 'mcq' && q.options.length < 2) { q.qtype = sec === 'tf' ? 'tf' : 'short'; q.options = []; } if (!['mcq', 'multi', 'blank', 'match', 'order'].includes(q.qtype)) q.options = []; delete q._grp; if (q.qtype === 'mcq' && !q.options.length) q.qtype = 'essay'; });
    return { title, qs };
  }
  A._parseQ = parseLines;

  async function readFiles(files) {
    let all = [], title = '', rep = [];
    for (const f of files) {
      const n = f.name.toLowerCase();
      try {
        if (/\.(xlsx|xls|csv)$/.test(n)) { const q = await sheetQs(f); all = all.concat(q); rep.push(`${f.name}: ${AR(q.length)}`); continue; }
        if (IS_IMG(f)) { const r = await imageQs(f); const q = r.qs || parseLines(r.lines).qs; q.forEach(x => { x.source = f.name; x._ocr = 1; }); all = all.concat(q); const nOk = q.filter(x => (x.options || []).some(o => o.ok) || x.answer).length;
          rep.push(`${f.name}: ${AR(q.length)} سؤال${r.qs ? ' (جدول' + (nOk ? ` — عُرفت إجابة ${AR(nOk)} من التظليل` : '') + ')' : ''} — قراءة ضوئية، راجع النص`); continue; }
        const lines = /\.pdf$/.test(n) || f.type === 'application/pdf' ? await pdfLines(f) : /\.docx$/.test(n) ? await docxLines(f) : /\.(txt|md)$/.test(n) || f.type.startsWith('text/') ? (await f.text()).split(/\r?\n/) : null;
        if (!lines) { rep.push(`${f.name}: صيغة غير مدعومة (استخدم Excel أو Word أو PDF أو صورة)`); continue; }
        const r = lines._qs ? { qs: lines._qs, title: '' } : parseLines(lines); r.qs.forEach(x => { x.source = f.name; if (lines._ocr) x._ocr = 1; }); all = all.concat(r.qs); title = title || r.title; rep.push(`${f.name}: ${AR(r.qs.length)}${lines._ocr ? ' (قراءة ضوئية — راجع النص)' : ''}`);
      } catch (e) { rep.push(`${f.name}: ${e.message}`); }
    }
    return { qs: all, title, rep };
  }

  A._fileLines = async f => { const n = f.name.toLowerCase(); return /\.pdf$/.test(n) || f.type === 'application/pdf' ? pdfLines(f) : /\.docx$/.test(n) ? docxLines(f) : /\.(txt|md)$/.test(n) || (f.type || '').startsWith('text/') ? (await f.text()).split(/\r?\n/) : null; };
  A.importQ = function (after, pre) {
    const X = A._assess; if (!X) return;
    let Q = [], title = '';
    const m = A.modal(`<h3>استيراد أسئلة من ملف</h3>
      <p class="sub">ارفع ملف الأسئلة (Excel أو Word أو PDF أو صورة) من مجلدك في Google Drive أو من جهازك، أو الصق النص. تُستخرج الأسئلة تلقائياً لتراجعها، ثم تحفظها في بنك الأسئلة وتحوّلها إلى اختبار إلكتروني أو ورقة عمل أو واجب برابط للطالب، أو تطبعها ورقياً. المادة والصف: <b>${esc(A.subjName(X.ctx.subj))} · ${esc(X.gLabel(X.ctx.grade))}</b>.</p>
      <div class="iq-src">
        <label class="iq-drop" for="iqF"><input type="file" id="iqF" multiple accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,application/pdf,image/*"><b>اختر الملفات</b><span>Excel · Word · PDF · صور (حتى الممسوحة ضوئياً أو المصوّرة بالجوال) — على الجوال اختر «Drive» أو «الكاميرا»</span></label>
        <div class="iq-side">${S.me.drive_url ? `<a class="btn ghost" href="${esc(S.me.drive_url)}" target="_blank" rel="noopener">${A.I.folder || ''} فتح مجلدي في Drive</a>` : `<button class="btn ghost" id="iqDv" type="button">${A.I.folder || ''} ربط مجلدي في Drive</button>`}
          <details><summary class="small">طريقة التنزيل من Drive</summary><p class="small muted" style="margin:4px 0 0">افتح الملف في Drive ← «تنزيل». ملف Google Docs: ملف ← تنزيل ← Microsoft Word أو PDF.</p></details>
          <details><summary class="small">لصق نص الأسئلة</summary><textarea class="in" id="iqT" rows="5" dir="auto" placeholder="١) ناتج ٣ × ٤ = ؟&#10;أ) ٧  ب) ١٢*  ج) ١٤&#10;٢) الشمس نجم ( ✓ )"></textarea><button class="btn sm" id="iqTGo" type="button" style="margin-top:6px">استخراج</button></details>
          <div class="iq-tpl"><b class="small">القوالب الجاهزة</b><a class="btn ghost sm" href="assets/tpl/question-bank-template.xlsx" download="قالب بنك الأسئلة - مدارس دينا.xlsx">${A.I.download || '⬇'} قالب Excel الشامل</a><a class="btn ghost sm" href="assets/tpl/questions-template.docx" download="نموذج أسئلة Word - مدارس دينا.docx">${A.I.download || '⬇'} نموذج Word</a><span class="small muted">القالب يشرح كل الأعمدة وكل أنواع الأسئلة بأمثلة.</span></div></div>
      </div>
      <div id="iqR" class="small" role="status" aria-live="polite"></div>
      <div id="iqL"></div>`, { cls: 'wide' });
    const q = s => m.el.querySelector(s);
    const dv = q('#iqDv'); if (dv) dv.onclick = () => A.driveDialog(S.me);
    const load = r => { Q = Q.concat(r.qs.map(x => { const d = A.dupOf ? A.dupOf(x.body, X.QB) : null; return { level: A.bloomOf ? A.bloomOf(x.body, x.qtype) : '', ...x, dup: d ? d.body : '', on: !d }; })); title = title || r.title; q('#iqR').innerHTML = `<div class="notice ${Q.length ? 'ok' : 'warn'}" style="display:block">${r.rep.map(esc).join(' · ')}${Q.length ? ` — المجموع ${AR(Q.length)} سؤال. راجعها قبل الحفظ.` : ' — لم تُستخرج أسئلة. جرّب ملف Word أو قالب Excel.'}</div>`; draw(); };
    q('#iqF').onchange = e => A.run(null, async () => { const f = [...e.target.files]; if (!f.length) return; q('#iqR').textContent = 'جارٍ قراءة الملفات…'; A._ocrProg = t => { q('#iqR').textContent = t; }; try { load(await readFiles(f)); } finally { A._ocrProg = null; A._ocrDone(); } e.target.value = ''; });
    q('#iqTGo').onclick = () => { const r = parseLines(q('#iqT').value.split(/\r?\n/)); load({ ...r, rep: [`النص: ${AR(r.qs.length)}`] }); };
    const problems = x => { if (!x.body) return 'بلا نص'; if (x.qtype === 'mcq' || x.qtype === 'multi') { if (x.options.filter(o => o.t).length < 2) return 'خياران على الأقل'; if (!x.options.some(o => o.ok)) return 'حدّد الإجابة الصحيحة'; } if ((x.qtype === 'tf' || x.qtype === 'short') && !String(x.answer || '').trim()) return 'اكتب الإجابة';
      if (x.qtype === 'blank') { const n = (x.body.match(/\.{3,}|…+|_{3,}/g) || []).length; if (!n) return 'ضع نقاطاً (......) مكان الفراغ'; if (x.options.length < n || x.options.slice(0, n).some(o => !String(o.t || '').trim())) return 'اكتب إجابة كل فراغ'; }
      if (x.qtype === 'match' && x.options.filter(o => o.t && o.m).length < 2) return 'زوجان على الأقل';
      if (x.qtype === 'order' && x.options.filter(o => o.t).length < 2) return 'عنصران على الأقل'; return ''; };
    const draw = () => {
      const L = q('#iqL'); if (!Q.length) { L.innerHTML = ''; return; }
      const sel = Q.filter(x => x.on), bad = sel.filter(problems).length, pts = sel.reduce((a, x) => a + (+x.points || 0), 0);
      L.innerHTML = `<div class="iq-bar"><b>${AR(sel.length)} سؤال محدد · ${AR(pts)} درجة</b>${bad ? `<span class="pill st-returned">${AR(bad)} تحتاج إكمالاً</span>` : '<span class="pill st-approved">جاهزة</span>'}
          <label class="small">الدرس <select class="in" id="iqLs" style="width:auto"><option value="">—</option>${X.CUR.map(l => `<option value="${l.id}">${esc(l.lesson)}</option>`).join('')}</select></label>
          <label class="small" title="يُستخدم لما لم يُصنَّف تلقائياً">المستوى الافتراضي <select class="in" id="iqLv" style="width:auto">${X.LV.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
          ${(() => { const lk = t => A.normKey(t || ''), nm = [...new Set(Q.filter(x => x.on && x._lesson && !x.lesson_id && !X.CUR.some(c => lk(c.lesson) === lk(x._lesson))).map(x => x._lesson))]; return nm.length ? `<label class="chk small" title="${esc(nm.join('، '))}"><input type="checkbox" id="iqMk" ${window._iqMkOff ? '' : 'checked'}> إنشاء ${AR(nm.length)} ${nm.length > 2 ? 'دروس جديدة' : nm.length === 2 ? 'درسين جديدين' : 'درس جديد'} من الملف</label>` : ''; })()}
          <button class="btn ghost sm" id="iqAll" type="button">${sel.length === Q.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}</button></div>
        <div class="iq-list">${Q.map((x, i) => { const pr = problems(x); return `<div class="iq-q ${x.on ? '' : 'off'} ${pr && x.on ? 'need' : ''}">
          <div class="iq-qh"><label class="chk"><input type="checkbox" data-on="${i}" ${x.on ? 'checked' : ''}> <b>${AR(i + 1)}</b></label>
            <select class="in" data-ty="${i}" aria-label="نوع السؤال">${X.QT.map(([k, n]) => `<option value="${k}" ${x.qtype === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
            <label class="small">الدرجة <input class="in" type="number" min="0.5" step="0.5" data-pt="${i}" value="${x.points}" style="width:70px"></label>
            <select class="in" data-lv="${i}" aria-label="المستوى المعرفي" style="width:auto">${X.LV.map(([k, n]) => `<option value="${k}" ${x.level === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
            ${x._ocr ? '<span class="pill st-warn" title="قُرئ ضوئياً من صورة — راجع النص والإجابة">قراءة ضوئية</span>' : ''}${x._lesson ? `<span class="pill st-empty" title="الدرس من الملف">${esc(x._lesson)}</span>` : ''}${x.dup ? `<span class="pill st-returned" title="${esc(x.dup)}">مكرر في البنك</span>` : ''}${pr && x.on ? `<span class="iq-pr">${esc(pr)}</span>` : ''}<button type="button" class="btn bad sm" data-rm="${i}" aria-label="حذف السؤال">×</button></div>
          ${x._img ? `<details class="iq-img"><summary class="small">عرض السؤال كما في الصورة للمقارنة</summary><img src="${x._img}" alt="صورة السؤال ${AR(i + 1)} من الملف"></details>` : ''}
          <textarea class="in" rows="2" data-bd="${i}" aria-label="نص السؤال">${esc(x.body)}</textarea>
          ${x.qtype === 'mcq' || x.qtype === 'multi' ? `<div class="iq-opts">${x.options.map((o, j) => `<label class="${o.ok ? 'ok' : ''}"><input type="${x.qtype === 'multi' ? 'checkbox' : 'radio'}" name="ok${i}" data-ok="${i}|${j}" ${o.ok ? 'checked' : ''} aria-label="الإجابة الصحيحة"><span>${LETTERS[j] || AR(j + 1)}</span><input class="in" data-op="${i}|${j}" value="${esc(o.t)}"></label>`).join('')}<button type="button" class="btn ghost sm" data-oa="${i}">+ خيار</button></div>`
            : x.qtype === 'blank' ? `<div class="iq-opts">${x.options.map((o, j) => `<label><span>ف${AR(j + 1)}</span><input class="in" data-bo="${i}|${j}" value="${esc(o.t || '')}" placeholder="إجابة الفراغ"></label>`).join('')}<button type="button" class="btn ghost sm" data-ba="${i}">+ فراغ</button><label class="chk small"><input type="checkbox" data-bk="${i}" ${x.answer === 'bank' ? 'checked' : ''}> بنك كلمات</label></div>`
            : x.qtype === 'match' ? `<div class="iq-opts">${x.options.map((o, j) => `<label><input class="in" data-ml="${i}|${j}" value="${esc(o.t || '')}" placeholder="العنصر"><span>←</span><input class="in" data-mr="${i}|${j}" value="${esc(o.m || '')}" placeholder="ما يقابله"></label>`).join('')}<button type="button" class="btn ghost sm" data-ma="${i}">+ زوج</button></div>`
            : x.qtype === 'order' ? `<div class="iq-opts">${x.options.map((o, j) => `<label><span>${AR(j + 1)}</span><input class="in" data-oi="${i}|${j}" value="${esc(o.t || '')}"></label>`).join('')}<button type="button" class="btn ghost sm" data-oa2="${i}">+ عنصر</button><span class="small muted">بالترتيب الصحيح</span></div>`
            : x.qtype === 'tf' ? `<div class="iq-opts"><label class="${x.answer === 'صواب' ? 'ok' : ''}"><input type="radio" name="tf${i}" data-tf="${i}|صواب" ${x.answer === 'صواب' ? 'checked' : ''}> صواب</label><label class="${x.answer === 'خطأ' ? 'ok' : ''}"><input type="radio" name="tf${i}" data-tf="${i}|خطأ" ${x.answer === 'خطأ' ? 'checked' : ''}> خطأ</label></div>`
            : `<input class="in" data-an="${i}" value="${esc(x.answer || '')}" placeholder="${x.qtype === 'short' ? 'الإجابة الصحيحة (افصل البدائل بـ | )' : 'الإجابة النموذجية (اختياري — يُصحَّح يدوياً)'}">`}
        </div>`; }).join('')}</div>
        <div class="iq-acts"><div class="field" style="margin:0;min-width:220px"><label for="iqTi">العنوان</label><input class="in" id="iqTi" value="${esc(title || 'ورقة عمل')}"></div>
          <button class="btn ghost" id="iqBank" type="button">حفظ في بنك الأسئلة فقط</button>
          ${A.ehwOnly && A.ehwOnly() ? '' : '<button class="btn" data-mk="quiz" type="button">اختبار إلكتروني</button><button class="btn" data-mk="worksheet" type="button">ورقة عمل تفاعلية</button>'}${!A.canHw || A.canHw() ? '<button class="btn ok" data-mk="homework" type="button">واجب إلكتروني برابط</button>' : ''}
          <button class="btn ghost" data-pr="0" type="button">${I.print || ''} طباعة ورقية</button><button class="btn ghost" data-pr="1" type="button">نموذج الإجابة</button></div>`;
      const re = () => draw();
      $$('[data-on]', L).forEach(c => c.onchange = () => { Q[+c.dataset.on].on = c.checked; re(); });
      $$('[data-ty]', L).forEach(c => c.onchange = () => { const x = Q[+c.dataset.ty]; x.qtype = c.value; if ((x.qtype === 'mcq' || x.qtype === 'multi') && x.options.length < 2) x.options = [{ t: '' }, { t: '' }, { t: '' }, { t: '' }]; if (x.qtype === 'tf') x.answer = TF(x.answer); if (x.qtype === 'blank') { const n = Math.max(1, (x.body.match(/\.{3,}|…+|_{3,}/g) || []).length); x.options = Array.from({ length: n }, (_, j) => ({ t: j === 0 && x.answer && x.answer !== 'bank' ? x.answer.split('|')[0] : '' })); x.answer = ''; } if (x.qtype === 'match' && !x.options.some(o => o.m !== undefined)) x.options = [{ t: '', m: '' }, { t: '', m: '' }, { t: '', m: '' }]; if (x.qtype === 'order' && x.options.length < 2) x.options = [{ t: '' }, { t: '' }, { t: '' }]; re(); });
      $$('[data-pt]', L).forEach(c => c.oninput = () => { Q[+c.dataset.pt].points = +c.value || 1; });
      $$('[data-bd]', L).forEach(c => c.oninput = () => { Q[+c.dataset.bd].body = c.value; });
      $$('[data-bd]', L).forEach(c => c.onchange = re);
      $$('[data-op]', L).forEach(c => c.oninput = () => { const [i, j] = c.dataset.op.split('|').map(Number); Q[i].options[j].t = c.value; });
      $$('[data-ok]', L).forEach(c => c.onchange = () => { const [i, j] = c.dataset.ok.split('|').map(Number); if (Q[i].qtype === 'multi') Q[i].options[j].ok = c.checked; else Q[i].options.forEach((o, k) => o.ok = k === j); re(); });
      $$('[data-oa]', L).forEach(b => b.onclick = () => { Q[+b.dataset.oa].options.push({ t: '' }); re(); });
      $$('[data-tf]', L).forEach(c => c.onchange = () => { const [i, v] = c.dataset.tf.split('|'); Q[+i].answer = v; re(); });
      $$('[data-an]', L).forEach(c => c.oninput = () => { Q[+c.dataset.an].answer = c.value; }); $$('[data-an]', L).forEach(c => c.onchange = re);
      $$('[data-rm]', L).forEach(b => b.onclick = () => { Q.splice(+b.dataset.rm, 1); re(); });
      const ij = v => v.split('|').map(Number);
      $$('[data-lv]', L).forEach(c => c.onchange = () => { Q[+c.dataset.lv].level = c.value; });
      $$('[data-bo]', L).forEach(c => { c.oninput = () => { const [i, j] = ij(c.dataset.bo); Q[i].options[j].t = c.value; }; c.onchange = re; });
      $$('[data-ba]', L).forEach(b => b.onclick = () => { Q[+b.dataset.ba].options.push({ t: '' }); re(); });
      $$('[data-bk]', L).forEach(c => c.onchange = () => { Q[+c.dataset.bk].answer = c.checked ? 'bank' : ''; });
      $$('[data-ml]', L).forEach(c => { c.oninput = () => { const [i, j] = ij(c.dataset.ml); Q[i].options[j].t = c.value; }; c.onchange = re; });
      $$('[data-mr]', L).forEach(c => { c.oninput = () => { const [i, j] = ij(c.dataset.mr); Q[i].options[j].m = c.value; }; c.onchange = re; });
      $$('[data-ma]', L).forEach(b => b.onclick = () => { Q[+b.dataset.ma].options.push({ t: '', m: '' }); re(); });
      $$('[data-oi]', L).forEach(c => { c.oninput = () => { const [i, j] = ij(c.dataset.oi); Q[i].options[j].t = c.value; }; c.onchange = re; });
      $$('[data-oa2]', L).forEach(b => b.onclick = () => { Q[+b.dataset.oa2].options.push({ t: '' }); re(); });
      q('#iqAll').onclick = () => { const all = Q.every(x => x.on); Q.forEach(x => x.on = !all); re(); };
      const ready = () => { const s = Q.filter(x => x.on); if (!s.length) throw new Error('حدّد سؤالاً واحداً على الأقل'); const b = s.find(problems); if (b) throw new Error(`السؤال ${AR(Q.indexOf(b) + 1)}: ${problems(b)}`); return s; };
      const saveBank = async () => { const s = ready(); const lesson = q('#iqLs').value || null, level = q('#iqLv').value;
        // دروس القالب: تُطابق بالاسم، وغير الموجود يُنشأ (إن فُعّل الخيار)
        const lk = t => A.normKey(t || ''), mk = q('#iqMk'); s.forEach(x => { if (!x.lesson_id && x._lesson) { const l = X.CUR.find(c => lk(c.lesson) === lk(x._lesson)); if (l) x.lesson_id = l.id; } });
        const miss = [...new Map(s.filter(x => !x.lesson_id && x._lesson).map(x => [lk(x._lesson), x])).values()];
        if (miss.length && (!mk || mk.checked)) { await api.ins('curriculum', miss.map((x, i) => ({ school_id: X.sch(), subject_id: X.ctx.subj, grade_key: X.ctx.grade, unit: x._unit || '', lesson: x._lesson, periods: 1, pages: null, sort: X.CUR.length + i }))); await X.loadCtx(); s.forEach(x => { if (!x.lesson_id && x._lesson) { const l = X.CUR.find(c => lk(c.lesson) === lk(x._lesson)); if (l) x.lesson_id = l.id; } }); }
        const rows = s.map(x => ({ school_id: X.sch(), subject_id: X.ctx.subj, grade_key: X.ctx.grade, qtype: x.qtype, lesson_id: x.lesson_id || lesson, points: +x.points || 1, skill: x.skill || '', body: x.body.trim(), explanation: x.explanation || '', image_url: x.image_url || null, shared: x.shared !== false, ...(x.source ? { source: String(x.source).slice(0, 120) } : {}), options: X.packOpts(x), answer: x.qtype === 'mcq' || x.qtype === 'multi' || x.qtype === 'match' || x.qtype === 'order' ? '' : x.qtype === 'blank' ? (x.answer === 'bank' ? 'bank' : '') : String(x.answer || ''), level: x.level || level, difficulty: x.difficulty || 2 }));
        const ins = await api.ins('questions', rows); await X.loadCtx(); return ins; };
      q('#iqBank').onclick = e => A.run(e.currentTarget, async () => { const r = await saveBank(); m.close(); A.toast(`أُضيف ${AR(r.length)} سؤال إلى بنك الأسئلة`, 'ok'); after && after(); });
      $$('[data-mk]', L).forEach(b => b.onclick = e => A.run(e.currentTarget, async () => { const r = await saveBank(); const ti = q('#iqTi').value.trim() || X.KQ[b.dataset.mk]; m.close(); A.toast(`حُفظت ${AR(r.length)} سؤال — اختر الفصول ثم انشر`, 'ok'); A.LS.set('as_t', 'quizzes'); X.quizEditor({ kind: b.dataset.mk, title: ti, question_ids: r.map(x => x.id) }, after); }));
      $$('[data-pr]', L).forEach(b => b.onclick = () => { try { const s = b.dataset.pr === '1' ? ready() : Q.filter(x => x.on); X.printPaper(q('#iqTi').value.trim() || 'ورقة عمل', s.map(x => ({ ...x, options: x.options || [] })), b.dataset.pr === '1'); } catch (er) { A.toast(er.message, 'err'); } });
    };
    if (pre) load(pre);
  };
})();
