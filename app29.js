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
        <div id="myPa"></div><div id="myDu"></div>
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
    draw(null, null); if (A.myPeriodAtt) A.myPeriodAtt($('#myPa', box)); if (A.myDuty) A.myDuty($('#myDu', box));
    // البيانات الإضافية (جداول عن بعد + الاختبارات) دون تأخير اللوحة
    let live = null, quiz = null;
    try { const td = iso(new Date()), l = (await api.list('display_schedules', { section_id: S.sectionId })).filter(d => d.published && d.date_to >= td && d.date_from <= td);
      if (l.length) { const E = await api.list('live_entries', { ds_id: l.map(d => d.id) }).catch(() => []); let n = 0, total = 0;
        l.forEach(d => (d.slots || []).filter(x => x.t === S.me.id).forEach(x => { total++; const e = E.find(y => y.ds_id === d.id && y.class_id === x.c && y.day === x.d && y.period === x.p); if (!e || !((e.topic || '').trim() || (e.homework || '').trim())) n++; }));
        if (total) live = { n, total }; } } catch (_) { }
    try { const zs = (await api.list('quizzes', { school_id: S.school.id, teacher_id: S.me.id }, { select: 'id,status' })); const pub = zs.filter(z => z.status === 'published');
      if (zs.length) { const at = await api.list('quiz_attempts', { quiz_id: zs.map(z => z.id) }, { select: 'quiz_id,pending_manual' }).catch(() => []); quiz = { n: at.filter(a => a.pending_manual).length, open: pub.length }; } } catch (_) { }
    if (document.body.contains(box)) { draw(live, quiz); if (A.myPeriodAtt) A.myPeriodAtt($('#myPa', box)); if (A.myDuty) A.myDuty($('#myDu', box)); }
  }

  // ======================= (٢) استيراد الأسئلة من الملفات =======================
  const NUM = s => String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  const clean = s => String(s || '').replace(/ /g, ' ').replace(/[‎‏‪-‮]/g, '').replace(/\s+/g, ' ').trim();
  const loadPdf = () => new Promise((ok, no) => { if (window.pdfjsLib) return ok(window.pdfjsLib); const s = document.createElement('script'); s.src = 'vendor/pdf.min.js'; s.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; ok(pdfjsLib); }; s.onerror = () => no(new Error('تعذّر تحميل قارئ PDF')); document.head.appendChild(s); });

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
    if (!out.join('').trim()) throw new Error('الملف PDF صورة ممسوحة بلا نص — صدّره من Word أو Google Docs بصيغة PDF أو Word ثم أعد المحاولة');
    return out;
  }
  async function docxLines(f) {
    if (!window.JSZip) throw new Error('قارئ Word غير محمّل');
    const z = await JSZip.loadAsync(await f.arrayBuffer()); const x = await z.file('word/document.xml').async('string');
    const d = new DOMParser().parseFromString(x, 'application/xml'); const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'; const out = [];
    [...d.getElementsByTagNameNS(W, 'p')].forEach(p => { const t = clean([...p.getElementsByTagNameNS(W, 't')].map(n => n.textContent).join('')); const isList = p.getElementsByTagNameNS(W, 'numPr').length > 0; if (t) out.push(isList && !/^\(?[0-9٠-٩]+\s*[\)\-.ـ:]/.test(t) && !/^\(?[أابجدهوa-dA-D]\s*[\)\-.ـ:]/.test(t) ? '§ ' + t : t); });
    return out;
  }
  async function sheetQs(f) {
    const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
    const h = (rows[0] || []).map(x => A.normKey(String(x))); const col = (...ks) => h.findIndex(x => ks.some(k => x.includes(A.normKey(k))));
    const cQ = col('السؤال', 'question'), cT = col('النوع', 'type'), cA = col('الاجابه', 'الإجابة', 'answer'), cP = col('الدرجه', 'الدرجة', 'points');
    const cO = h.map((x, i) => /^(ا|أ|ب|ج|د|ه|a|b|c|d|خيار|option)/.test(x) && i !== cQ && i !== cA && i !== cT && i !== cP ? i : -1).filter(i => i >= 0);
    if (cQ < 0) throw new Error('لم أجد عمود «السؤال» في أول صف من الملف');
    return rows.slice(1).filter(r => clean(r[cQ])).map(r => { const opts = cO.map(i => clean(r[i])).filter(Boolean); const ans = clean(cA >= 0 ? r[cA] : ''); const tp = clean(cT >= 0 ? r[cT] : '');
      const q = { body: clean(r[cQ]), qtype: /صح|صواب|خطا|tf/i.test(tp) ? 'tf' : opts.length >= 2 ? 'mcq' : /مقال|essay/i.test(tp) ? 'essay' : 'short', options: opts.map(t => ({ t })), answer: '', points: +NUM(cP >= 0 ? r[cP] : '') || 1 };
      if (q.qtype === 'mcq') { const k = LETTER(ans); const i = k >= 0 ? k : opts.findIndex(o => A.normKey(o) === A.normKey(ans)); if (i >= 0 && q.options[i]) q.options[i].ok = true; }
      else if (q.qtype === 'tf') q.answer = TF(ans); else q.answer = ans;
      return q; });
  }
  const LETTERS = ['أ', 'ب', 'ج', 'د', 'ه', 'و'];
  const LETTER = s => { const x = clean(s).replace(/[()]/g, '').replace(/^ا$/, 'أ'); const i = LETTERS.indexOf(x); if (i >= 0) return i; const j = 'abcdef'.indexOf(x.toLowerCase()); return x.length === 1 ? j : -1; };
  const TF = s => /✓|✔|صح|صواب|true|^\s*√/i.test(s) ? 'صواب' : /✗|✘|×|خطأ|خطا|false/i.test(s) ? 'خطأ' : '';
  const OK_MARK = /\s*(\*|✓|✔|\(صح\)|\(الصحيحة\)|←\s*الصحيح)\s*$/;
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
      if (SEC_RE.test(l) || (/^(اختر|ضع|أكمل|اكمل|أجب|اجب|علل|صل|زاوج|رتب|رتّب|املأ|ظلل)/.test(l.replace(/^§\s*/, '')) && l.length < 90 && !OPT_RE.test(l))) { push(); const k = kindOf(l); if (k) sec = k; continue; }
      const ans = l.match(/^(?:الإجابة|الاجابة|الجواب|الحل)\s*(?:الصحيحة)?\s*[:：\-]\s*(.+)$/);
      if (ans && cur) { const a = clean(ans[1]); if (cur.qtype === 'blank') { const p = a.split(/\s*[،,؛]\s*|\s+-\s+/).filter(Boolean); cur.options = cur.options.map((o, j) => ({ t: p[j] || o.t || '' })); if (p.length > cur.options.length) p.slice(cur.options.length).forEach(t => cur.options.push({ t })); continue; } if (cur.qtype === 'mcq' || (cur.options.length && cur.qtype !== 'match' && cur.qtype !== 'order')) { const k = LETTER(a.split(/\s/)[0]); const i = k >= 0 ? k : cur.options.findIndex(o => A.normKey(o.t) === A.normKey(a)); cur.options.forEach((o, j) => o.ok = j === i); } else if (cur.qtype === 'tf') cur.answer = TF(a) || cur.answer; else if (cur.qtype === 'blank') { const p = a.split(/\s*[،,؛]\s*|\s+-\s+/).filter(Boolean); cur.options = cur.options.map((o, j) => ({ t: p[j] || o.t || '' })); if (p.length > cur.options.length) p.slice(cur.options.length).forEach(t => cur.options.push({ t })); } else cur.answer = a; continue; }
      const om = l.match(OPT_RE);
      if (cur && om && !Q_RE.test(l.replace(OPT_RE, ''))) { const inl = splitInline(l); (inl || [om[2]]).forEach(t => { const ok = OK_MARK.test(t); cur.options.push({ t: clean(t.replace(OK_MARK, '')), ...(ok ? { ok: true } : {}) }); }); cur.qtype = 'mcq'; continue; }
      if (Q_RE.test(l)) { push(); let body = clean(l.replace(Q_RE, '')); let tf = '';
        const tm = body.match(/\(\s*(✓|✔|✗|✘|×|صح|خطأ|خطا|صواب)?\s*\)\s*$/) || body.match(/^\(\s*(✓|✔|✗|✘|×|صح|خطأ|خطا|صواب)?\s*\)\s*/);
        if (tm) { tf = TF(tm[1] || ''); body = clean(body.replace(tm[0], '')); }
        const inl = splitInline(body); let opts = [];
        if (inl) { const first = body.search(/(?:^|\s)\(?[أابجده]\s*[\)\-ـ]\s*/); opts = inl; body = clean(body.slice(0, first)); }
        if (sec === 'match') { const pm = body.split(/\s*(?:←|→|=|:|—|–|\s-\s)\s*/); if (pm.length >= 2 && pm[0] && pm[1]) { const last = qs[qs.length - 1]; const pair = { t: clean(pm[0]), m: clean(pm.slice(1).join(' ')) }; if (last && last.qtype === 'match' && last._grp) last.options.push(pair); else { cur = { body: 'صل كل عنصر بما يناسبه', qtype: 'match', options: [pair], answer: '', points: 1, _grp: 1 }; push(); } continue; } }
        if (sec === 'order' && !opts.length) { const it = body.split(/\s*[،,؛/]\s*|\s+-\s+/).filter(Boolean); if (it.length >= 3) { cur = { body: 'رتّب ما يلي', qtype: 'order', options: it.map(t => ({ t: clean(t) })), answer: '', points: 1 }; continue; } }
        const nb = (body.match(/\.{3,}|…+|_{3,}/g) || []).length;
        if (!tm && !opts.length && nb && (sec === 'short' || sec === '' || sec === 'blank')) { cur = { body, qtype: 'blank', options: Array.from({ length: nb }, () => ({ t: '' })), answer: '', points: nb > 1 ? nb : 1 }; continue; }
        cur = { body, qtype: tm ? 'tf' : opts.length ? 'mcq' : (sec === 'order' || sec === 'match' ? '' : sec) || (/\.{3,}|…{1,}|_{3,}/.test(body) ? 'short' : 'essay'), options: opts.map(t => { const ok = OK_MARK.test(t); return { t: clean(t.replace(OK_MARK, '')), ...(ok ? { ok: true } : {}) }; }), answer: tf, points: 1 };
        continue; }
      if (cur) { if (!cur.options.length) cur.body = clean(cur.body + ' ' + l); else cur.options[cur.options.length - 1].t = clean(cur.options[cur.options.length - 1].t + ' ' + l); }
      else if (l.length > 8 && /[؟?]|\.{3,}/.test(l)) { cur = { body: l.replace(/^§\s*/, ''), qtype: sec || 'essay', options: [], answer: '', points: 1 }; }
    }
    push();
    qs.forEach(q => { if (q.qtype === 'mcq' && q.options.length < 2) { q.qtype = sec === 'tf' ? 'tf' : 'short'; q.options = []; } if (!['mcq', 'blank', 'match', 'order'].includes(q.qtype)) q.options = []; delete q._grp; if (q.qtype === 'mcq' && !q.options.length) q.qtype = 'essay'; });
    return { title, qs };
  }
  A._parseQ = parseLines;

  async function readFiles(files) {
    let all = [], title = '', rep = [];
    for (const f of files) {
      const n = f.name.toLowerCase();
      try {
        if (/\.(xlsx|xls|csv)$/.test(n)) { const q = await sheetQs(f); all = all.concat(q); rep.push(`${f.name}: ${AR(q.length)}`); continue; }
        const lines = /\.pdf$/.test(n) || f.type === 'application/pdf' ? await pdfLines(f) : /\.docx$/.test(n) ? await docxLines(f) : /\.(txt|md)$/.test(n) || f.type.startsWith('text/') ? (await f.text()).split(/\r?\n/) : null;
        if (!lines) { rep.push(`${f.name}: صيغة غير مدعومة (استخدم PDF أو Word أو Excel)`); continue; }
        const r = parseLines(lines); all = all.concat(r.qs); title = title || r.title; rep.push(`${f.name}: ${AR(r.qs.length)}`);
      } catch (e) { rep.push(`${f.name}: ${e.message}`); }
    }
    return { qs: all, title, rep };
  }

  A._fileLines = async f => { const n = f.name.toLowerCase(); return /\.pdf$/.test(n) || f.type === 'application/pdf' ? pdfLines(f) : /\.docx$/.test(n) ? docxLines(f) : /\.(txt|md)$/.test(n) || (f.type || '').startsWith('text/') ? (await f.text()).split(/\r?\n/) : null; };
  A.importQ = function (after, pre) {
    const X = A._assess; if (!X) return;
    let Q = [], title = '';
    const m = A.modal(`<h3>استيراد اختبار أو ورقة عمل من ملف</h3>
      <p class="sub">ارفع ملف الاختبار أو ورقة العمل (PDF أو Word أو Excel) من مجلدك في Google Drive أو من جهازك، أو الصق النص. تُستخرج الأسئلة تلقائياً لتراجعها، ثم تحفظها في بنك الأسئلة وتحوّلها إلى اختبار إلكتروني أو ورقة عمل أو واجب برابط للطالب، أو تطبعها ورقياً. المادة والصف: <b>${esc(A.subjName(X.ctx.subj))} · ${esc(X.gLabel(X.ctx.grade))}</b>.</p>
      <div class="iq-src">
        <label class="iq-drop" for="iqF"><input type="file" id="iqF" multiple accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,application/pdf"><b>اختر الملفات</b><span>PDF · Word · Excel — على الجوال اختر «Drive» من قائمة الملفات</span></label>
        <div class="iq-side">${S.me.drive_url ? `<a class="btn ghost" href="${esc(S.me.drive_url)}" target="_blank" rel="noopener">${A.I.folder || ''} فتح مجلدي في Drive</a>` : `<button class="btn ghost" id="iqDv" type="button">${A.I.folder || ''} ربط مجلدي في Drive</button>`}
          <details><summary class="small">طريقة التنزيل من Drive</summary><p class="small muted" style="margin:4px 0 0">افتح الملف في Drive ← «تنزيل». ملف Google Docs: ملف ← تنزيل ← Microsoft Word أو PDF.</p></details>
          <details><summary class="small">لصق نص الأسئلة</summary><textarea class="in" id="iqT" rows="5" dir="auto" placeholder="١) ناتج ٣ × ٤ = ؟&#10;أ) ٧  ب) ١٢*  ج) ١٤&#10;٢) الشمس نجم ( ✓ )"></textarea><button class="btn sm" id="iqTGo" type="button" style="margin-top:6px">استخراج</button></details>
          <a class="small" href="#" id="iqTpl">تنزيل قالب Excel للأسئلة</a></div>
      </div>
      <div id="iqR" class="small" role="status" aria-live="polite"></div>
      <div id="iqL"></div>`, { cls: 'wide' });
    const q = s => m.el.querySelector(s);
    const dv = q('#iqDv'); if (dv) dv.onclick = () => A.driveDialog(S.me);
    q('#iqTpl').onclick = e => { e.preventDefault(); const ws = XLSX.utils.aoa_to_sheet([['السؤال', 'النوع', 'أ', 'ب', 'ج', 'د', 'الإجابة', 'الدرجة'], ['ناتج ٣ × ٤ يساوي', 'اختيار', '٧', '١٢', '١٤', '١٦', 'ب', 1], ['الشمس نجم', 'صواب وخطأ', '', '', '', '', 'صح', 1], ['عاصمة المملكة هي ......', 'أكمل', '', '', '', '', 'الرياض', 1]]); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الأسئلة'); XLSX.writeFile(wb, 'قالب أسئلة - منصة دينا.xlsx'); };
    const load = r => { Q = Q.concat(r.qs.map(x => { const d = A.dupOf ? A.dupOf(x.body, X.QB) : null; return { level: A.bloomOf ? A.bloomOf(x.body, x.qtype) : '', ...x, dup: d ? d.body : '', on: !d }; })); title = title || r.title; q('#iqR').innerHTML = `<div class="notice ${Q.length ? 'ok' : 'warn'}" style="display:block">${r.rep.map(esc).join(' · ')}${Q.length ? ` — المجموع ${AR(Q.length)} سؤال. راجعها قبل الحفظ.` : ' — لم تُستخرج أسئلة. جرّب ملف Word أو قالب Excel.'}</div>`; draw(); };
    q('#iqF').onchange = e => A.run(null, async () => { const f = [...e.target.files]; if (!f.length) return; q('#iqR').textContent = 'جارٍ قراءة الملفات…'; load(await readFiles(f)); e.target.value = ''; });
    q('#iqTGo').onclick = () => { const r = parseLines(q('#iqT').value.split(/\r?\n/)); load({ ...r, rep: [`النص: ${AR(r.qs.length)}`] }); };
    const problems = x => { if (!x.body) return 'بلا نص'; if (x.qtype === 'mcq') { if (x.options.filter(o => o.t).length < 2) return 'خياران على الأقل'; if (!x.options.some(o => o.ok)) return 'حدّد الإجابة الصحيحة'; } if ((x.qtype === 'tf' || x.qtype === 'short') && !String(x.answer || '').trim()) return 'اكتب الإجابة';
      if (x.qtype === 'blank') { const n = (x.body.match(/\.{3,}|…+|_{3,}/g) || []).length; if (!n) return 'ضع نقاطاً (......) مكان الفراغ'; if (x.options.length < n || x.options.slice(0, n).some(o => !String(o.t || '').trim())) return 'اكتب إجابة كل فراغ'; }
      if (x.qtype === 'match' && x.options.filter(o => o.t && o.m).length < 2) return 'زوجان على الأقل';
      if (x.qtype === 'order' && x.options.filter(o => o.t).length < 2) return 'عنصران على الأقل'; return ''; };
    const draw = () => {
      const L = q('#iqL'); if (!Q.length) { L.innerHTML = ''; return; }
      const sel = Q.filter(x => x.on), bad = sel.filter(problems).length, pts = sel.reduce((a, x) => a + (+x.points || 0), 0);
      L.innerHTML = `<div class="iq-bar"><b>${AR(sel.length)} سؤال محدد · ${AR(pts)} درجة</b>${bad ? `<span class="pill st-returned">${AR(bad)} تحتاج إكمالاً</span>` : '<span class="pill st-approved">جاهزة</span>'}
          <label class="small">الدرس <select class="in" id="iqLs" style="width:auto"><option value="">—</option>${X.CUR.map(l => `<option value="${l.id}">${esc(l.lesson)}</option>`).join('')}</select></label>
          <label class="small" title="يُستخدم لما لم يُصنَّف تلقائياً">المستوى الافتراضي <select class="in" id="iqLv" style="width:auto">${X.LV.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select></label>
          <button class="btn ghost sm" id="iqAll" type="button">${sel.length === Q.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}</button></div>
        <div class="iq-list">${Q.map((x, i) => { const pr = problems(x); return `<div class="iq-q ${x.on ? '' : 'off'} ${pr && x.on ? 'need' : ''}">
          <div class="iq-qh"><label class="chk"><input type="checkbox" data-on="${i}" ${x.on ? 'checked' : ''}> <b>${AR(i + 1)}</b></label>
            <select class="in" data-ty="${i}" aria-label="نوع السؤال">${X.QT.map(([k, n]) => `<option value="${k}" ${x.qtype === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
            <label class="small">الدرجة <input class="in" type="number" min="0.5" step="0.5" data-pt="${i}" value="${x.points}" style="width:70px"></label>
            <select class="in" data-lv="${i}" aria-label="المستوى المعرفي" style="width:auto">${X.LV.map(([k, n]) => `<option value="${k}" ${x.level === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
            ${x.dup ? `<span class="pill st-returned" title="${esc(x.dup)}">مكرر في البنك</span>` : ''}${pr && x.on ? `<span class="iq-pr">${esc(pr)}</span>` : ''}<button type="button" class="btn bad sm" data-rm="${i}" aria-label="حذف السؤال">×</button></div>
          <textarea class="in" rows="2" data-bd="${i}" aria-label="نص السؤال">${esc(x.body)}</textarea>
          ${x.qtype === 'mcq' ? `<div class="iq-opts">${x.options.map((o, j) => `<label class="${o.ok ? 'ok' : ''}"><input type="radio" name="ok${i}" data-ok="${i}|${j}" ${o.ok ? 'checked' : ''} aria-label="الإجابة الصحيحة"><span>${LETTERS[j] || AR(j + 1)}</span><input class="in" data-op="${i}|${j}" value="${esc(o.t)}"></label>`).join('')}<button type="button" class="btn ghost sm" data-oa="${i}">+ خيار</button></div>`
            : x.qtype === 'blank' ? `<div class="iq-opts">${x.options.map((o, j) => `<label><span>ف${AR(j + 1)}</span><input class="in" data-bo="${i}|${j}" value="${esc(o.t || '')}" placeholder="إجابة الفراغ"></label>`).join('')}<button type="button" class="btn ghost sm" data-ba="${i}">+ فراغ</button><label class="chk small"><input type="checkbox" data-bk="${i}" ${x.answer === 'bank' ? 'checked' : ''}> بنك كلمات</label></div>`
            : x.qtype === 'match' ? `<div class="iq-opts">${x.options.map((o, j) => `<label><input class="in" data-ml="${i}|${j}" value="${esc(o.t || '')}" placeholder="العنصر"><span>←</span><input class="in" data-mr="${i}|${j}" value="${esc(o.m || '')}" placeholder="ما يقابله"></label>`).join('')}<button type="button" class="btn ghost sm" data-ma="${i}">+ زوج</button></div>`
            : x.qtype === 'order' ? `<div class="iq-opts">${x.options.map((o, j) => `<label><span>${AR(j + 1)}</span><input class="in" data-oi="${i}|${j}" value="${esc(o.t || '')}"></label>`).join('')}<button type="button" class="btn ghost sm" data-oa2="${i}">+ عنصر</button><span class="small muted">بالترتيب الصحيح</span></div>`
            : x.qtype === 'tf' ? `<div class="iq-opts"><label class="${x.answer === 'صواب' ? 'ok' : ''}"><input type="radio" name="tf${i}" data-tf="${i}|صواب" ${x.answer === 'صواب' ? 'checked' : ''}> صواب</label><label class="${x.answer === 'خطأ' ? 'ok' : ''}"><input type="radio" name="tf${i}" data-tf="${i}|خطأ" ${x.answer === 'خطأ' ? 'checked' : ''}> خطأ</label></div>`
            : `<input class="in" data-an="${i}" value="${esc(x.answer || '')}" placeholder="${x.qtype === 'short' ? 'الإجابة الصحيحة (افصل البدائل بـ | )' : 'الإجابة النموذجية (اختياري — يُصحَّح يدوياً)'}">`}
        </div>`; }).join('')}</div>
        <div class="iq-acts"><div class="field" style="margin:0;min-width:220px"><label for="iqTi">العنوان</label><input class="in" id="iqTi" value="${esc(title || 'ورقة عمل')}"></div>
          <button class="btn ghost" id="iqBank" type="button">حفظ في بنك الأسئلة فقط</button>
          <button class="btn" data-mk="quiz" type="button">اختبار إلكتروني</button><button class="btn" data-mk="worksheet" type="button">ورقة عمل تفاعلية</button><button class="btn" data-mk="homework" type="button">واجب إلكتروني</button>
          <button class="btn ghost" data-pr="0" type="button">${I.print || ''} طباعة ورقية</button><button class="btn ghost" data-pr="1" type="button">نموذج الإجابة</button></div>`;
      const re = () => draw();
      $$('[data-on]', L).forEach(c => c.onchange = () => { Q[+c.dataset.on].on = c.checked; re(); });
      $$('[data-ty]', L).forEach(c => c.onchange = () => { const x = Q[+c.dataset.ty]; x.qtype = c.value; if (x.qtype === 'mcq' && x.options.length < 2) x.options = [{ t: '' }, { t: '' }, { t: '' }, { t: '' }]; if (x.qtype === 'tf') x.answer = TF(x.answer); if (x.qtype === 'blank') { const n = Math.max(1, (x.body.match(/\.{3,}|…+|_{3,}/g) || []).length); x.options = Array.from({ length: n }, (_, j) => ({ t: j === 0 && x.answer && x.answer !== 'bank' ? x.answer.split('|')[0] : '' })); x.answer = ''; } if (x.qtype === 'match' && !x.options.some(o => o.m !== undefined)) x.options = [{ t: '', m: '' }, { t: '', m: '' }, { t: '', m: '' }]; if (x.qtype === 'order' && x.options.length < 2) x.options = [{ t: '' }, { t: '' }, { t: '' }]; re(); });
      $$('[data-pt]', L).forEach(c => c.oninput = () => { Q[+c.dataset.pt].points = +c.value || 1; });
      $$('[data-bd]', L).forEach(c => c.oninput = () => { Q[+c.dataset.bd].body = c.value; });
      $$('[data-bd]', L).forEach(c => c.onchange = re);
      $$('[data-op]', L).forEach(c => c.oninput = () => { const [i, j] = c.dataset.op.split('|').map(Number); Q[i].options[j].t = c.value; });
      $$('[data-ok]', L).forEach(c => c.onchange = () => { const [i, j] = c.dataset.ok.split('|').map(Number); Q[i].options.forEach((o, k) => o.ok = k === j); re(); });
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
        const rows = s.map(x => ({ school_id: X.sch(), subject_id: X.ctx.subj, grade_key: X.ctx.grade, qtype: x.qtype, lesson_id: x.lesson_id || lesson, points: +x.points || 1, skill: '', body: x.body.trim(), explanation: '', image_url: null, shared: true, options: X.packOpts(x), answer: x.qtype === 'mcq' || x.qtype === 'match' || x.qtype === 'order' ? '' : x.qtype === 'blank' ? (x.answer === 'bank' ? 'bank' : '') : String(x.answer || ''), level: x.level || level, difficulty: x.difficulty || 2 }));
        const ins = await api.ins('questions', rows); await X.loadCtx(); return ins; };
      q('#iqBank').onclick = e => A.run(e.currentTarget, async () => { const r = await saveBank(); m.close(); A.toast(`أُضيف ${AR(r.length)} سؤال إلى بنك الأسئلة`, 'ok'); after && after(); });
      $$('[data-mk]', L).forEach(b => b.onclick = e => A.run(e.currentTarget, async () => { const r = await saveBank(); const ti = q('#iqTi').value.trim() || X.KQ[b.dataset.mk]; m.close(); A.toast(`حُفظت ${AR(r.length)} سؤال — اختر الفصول ثم انشر`, 'ok'); A.LS.set('as_t', 'quizzes'); X.quizEditor({ kind: b.dataset.mk, title: ti, question_ids: r.map(x => x.id) }, after); }));
      $$('[data-pr]', L).forEach(b => b.onclick = () => { try { const s = b.dataset.pr === '1' ? ready() : Q.filter(x => x.on); X.printPaper(q('#iqTi').value.trim() || 'ورقة عمل', s.map(x => ({ ...x, options: x.options || [] })), b.dataset.pr === '1'); } catch (er) { A.toast(er.message, 'err'); } });
    };
    if (pre) load(pre);
  };
})();
