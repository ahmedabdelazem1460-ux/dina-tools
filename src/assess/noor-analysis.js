/* منصة دينا — تحليل درجات نظام نور
   - استيراد آلي لملفات نور (كشف درجات مادة، نتائج كل المواد للفصل، الشهادات ونتائج نهاية الفصل)
     بكشف تلقائي لصف العناوين والعناوين المدمجة والمواد والمكوّنات والدرجة العظمى، مع معاينة قابلة للتصحيح.
   - المطابقة مع قاعدة الطلاب الموحّدة بالاسم والفصل. لا تُحفظ أرقام الهوية/السجل المدني إطلاقاً.
   - تحليل: مؤشرات تفاعلية، توزيع المستويات، المواد، الترابط بين المواد، الفصول، الطلاب، المقارنة بين الفترات،
     تقارير مطبوعة بهوية دينا وExcel.
   الصلاحية: المالك ومن يمنحه وحدة «noor» (قاعدة البيانات تفرضها). */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  const can = () => !!(S.me && A.hasModule && A.hasModule('noor'));

  // ---------- التنقل والصلاحية ----------
  A.I.noor = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/><circle cx="19" cy="8" r="1.4"/></svg>';
  if (A.NAV && !A.NAV.some(n => n[0] === 'noor')) { const i = A.NAV.findIndex(n => n[0] === 'analysis'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['noor', 'تحليل درجات نور', () => can()]); }

  // ---------- أدوات ----------
  const AD = s => String(s == null ? '' : s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/٫/g, '.').replace(/‏|‎/g, '').trim();
  const num = v => { if (typeof v === 'number' && isFinite(v)) return v; const s = AD(v).replace(/,/g, '.').replace(/%$/, ''); return /^-?\d+(\.\d+)?$/.test(s) ? +s : null; };
  const nk = s => (A.normKey ? A.normKey(s || '') : String(s || '')).replace(/\s+/g, ' ').trim();
  const ABS_RE = /^(غ|غائب|غائبة|م|محروم|محرومة|ع|معذور|-|—)$/;
  const LVL_WORDS = [[/^ممتاز/, 95], [/^جيد\s*جد/, 85], [/^جيد/, 72], [/^مقبول/, 57], [/^(ضعيف|غير\s*مجتاز|راسب|دون)/, 40], [/^متقن/, 95], [/^(متقدم|مرتفع)/, 85], [/^متوسط/, 70], [/^غير\s*متقن/, 40]];
  const lvlScore = t => { const s = AD(t); for (const [re, v] of LVL_WORDS) if (re.test(s)) return v; return null; };
  const r1 = v => v == null || isNaN(v) ? null : Math.round(v * 10) / 10;
  const fmt = v => v == null ? '—' : AR(r1(v));
  const mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const median = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const sd = a => { if (a.length < 2) return null; const m = mean(a); return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / (a.length - 1)); };
  const corr = (x, y) => { const n = x.length; if (n < 5) return null; const mx = mean(x), my = mean(y); let a = 0, b = 0, c = 0; for (let i = 0; i < n; i++) { a += (x[i] - mx) * (y[i] - my); b += (x[i] - mx) ** 2; c += (y[i] - my) ** 2; } return b && c ? a / Math.sqrt(b * c) : null; };
  // سلّم التقديرات المعتمد
  const LV = [['ممتاز', 90, '#2E8B57'], ['جيد جداً', 80, '#6FAE45'], ['جيد', 65, '#3AB1DB'], ['مقبول', 50, '#D99A2B'], ['دون المستوى', 0, '#D2463F']];
  const lvOf = p => LV.find(l => p >= l[1]) || LV[LV.length - 1];
  const STD_MAX = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 100, 150, 200];
  const TERMS = ['الفصل الدراسي الأول', 'الفصل الدراسي الثاني', 'الفصل الدراسي الثالث'];
  const PERIODS = ['الفترة الأولى', 'الفترة الثانية', 'نهاية الفصل الدراسي'];
  const arDate = d => A.arDate ? A.arDate(String(d).slice(0, 10)) : String(d).slice(0, 10);

  // ---------- قراءة ملفات نور ----------
  const NAME_RE = /^(اسم\s*الطالب[ة]?|الاسم(\s*الرباعي|\s*الكامل)?|اسم|الطالب[ة]?|اسم\s*الطالب\s*\/\s*الطالبة)$/;
  const SKIP_RE = /^(م|#|ن|ت|مسلسل|المسلسل)\.?$|هوي[ةه]|السجل|سجل\s*مدني|الإقامة|اقامة|رقم|الجنسي[ةه]|الجنس$|تاريخ|ملاحظ|توقيع|الجوال|البريد|الحال[ةه]|حالة\s*القيد/;
  const CLASS_RE = /^(الفصل|الشعب[ةه]|الفصل\s*\/\s*الشعب[ةه]|رقم الفصل)$/;
  const GRADE_RE = /^(الصف|الصف الدراسي|المرحل[ةه])$/;
  const LABEL_RE = /^(التقدير|التقدير العام|التقدير اللفظي)$/;
  const RESULT_RE = /^(النتيج[ةه]|النتيج[ةه] النهائي[ةه]|نتيج[ةه] الطالب)$/;
  const AVG_RE = /^(المعدل|المعدل العام|النسب[ةه]|النسب[ةه] المئوي[ةه]|المتوسط|المعدل التراكمي)$/;
  const SUM_RE = /^(المجموع الكلي|مجموع الدرجات|المجموع العام|الإجمالي)$/;
  const COMP_RE = /أعمال|اختبار|مجموع|المجموع|نهائي|شفه|تحريري|مشارك|واجب|فتر[ةه]|عملي|نظري|مهام|الدرج[ةه]|بحث|مشروع|ملف|تقويم|أداء/;
  const BAD_NAME = /المتوسط|المجموع|العدد|توقيع|مدير|المعلم|رائد|وكيل|عدد الطلاب|الإجمالي/;
  const compOf = L => { const s = L.replace(/\(.*?\)/g, '').trim(); if (/^(المجموع|مجموع|الدرج[ةه] النهائي[ةه]|الإجمالي|المجموع النهائي|النهائي[ةه]? من|الدرج[ةه]$)/.test(s) || /مجموع/.test(s) && !/أعمال/.test(s)) return 'total'; if (/أعمال/.test(s)) return 'أعمال السنة'; if (/نهائي|نهاي[ةه] الفصل|نهاي[ةه] الفتر[ةه]/.test(s) && /اختبار|تحريري/.test(s)) return 'الاختبار النهائي'; return s || 'درجة'; };
  const maxOf = L => { const s = AD(L); const m = s.match(/(?:\(|\/|من\s*)\s*(\d{1,3})\s*\)?\s*$/) || s.match(/\((\d{1,3})\)/); return m ? +m[1] : null; };
  const cleanL = L => AD(L).replace(/\((?:من\s*)?\d+\)|\/\s*\d+$|من\s*\d+$/g, '').replace(/\s+/g, ' ').trim();
  const META_KEYS = [['term', /^الفصل الدراسي/], ['period', /^الفتر[ةه]/], ['year', /^العام الدراسي|^العام/], ['subject', /^(المادة|اسم المادة|المقرر)/], ['grade', /^الصف/], ['cls', /^(الفصل|الشعب[ةه])(?!\s*الدراسي)/], ['school', /^(المدرس[ةه]|اسم المدرس[ةه])/], ['teacher', /^(المعلم|معلم المادة|اسم المعلم)/]];

  function sheetRows(ws) {
    if (!ws || !ws['!ref']) return [];
    const rg = XLSX.utils.decode_range(ws['!ref']);
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '', blankrows: true });
    (ws['!merges'] || []).forEach(m => { const r0 = m.s.r - rg.s.r, c0 = m.s.c - rg.s.c; const v = (aoa[r0] || [])[c0]; if (v === '' || v == null) return;
      for (let r = r0; r <= m.e.r - rg.s.r; r++) { aoa[r] = aoa[r] || []; for (let c = c0; c <= m.e.c - rg.s.c; c++) if (aoa[r][c] === '' || aoa[r][c] == null) aoa[r][c] = v; } });
    return aoa.map(r => (r || []).map(v => typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v));
  }
  function readMeta(rows, upto) {
    const meta = {};
    for (let r = 0; r < Math.min(upto, rows.length); r++) { const row = rows[r] || [];
      for (let c = 0; c < row.length; c++) { const t = AD(row[c]); if (!t || typeof row[c] === 'number') continue;
        for (const [k, re] of META_KEYS) { if (meta[k] || !re.test(t)) continue;
          let v = t.replace(re, '').replace(/^[^:：]*?[:：]/, '').replace(/^\s*[:：-]\s*/, '').trim();
          if (!v || v === t) { for (let j = c + 1; j < row.length; j++) { const x = AD(row[j]); if (x && x !== t) { v = x; break; } } }
          if (v && v.length < 60 && !re.test(v)) meta[k] = v; } }
      const yr = (row.map(AD).join(' ').match(/14\d\d\s*[-\/هـ]*\s*(?:14\d\d)?/) || [])[0]; if (yr && !meta.year) meta.year = yr.replace(/\s+/g, ''); }
    if (meta.term) { const t = meta.term; meta.term = /أول|1/.test(t) ? TERMS[0] : /ثان|2/.test(t) ? TERMS[1] : /ثالث|3/.test(t) ? TERMS[2] : t; }
    if (meta.period) { const t = meta.period; meta.period = /أول|1/.test(t) ? PERIODS[0] : /ثان|2/.test(t) ? PERIODS[1] : /نهاي|نهائي/.test(t) ? PERIODS[2] : t; }
    return meta;
  }
  const isNameCell = v => { const t = AD(v); return typeof v === 'string' && t.length >= 5 && /[؀-ۿ]/.test(t) && t.split(' ').length >= 2 && !BAD_NAME.test(t) && !NAME_RE.test(t) && num(t) == null; };

  function parseSheet(ws, sheetName, fileName) {
    const rows = sheetRows(ws); if (!rows.length) return null;
    let h = -1, nc = -1;
    for (let r = 0; r < Math.min(rows.length, 40) && h < 0; r++) { const row = rows[r] || [];
      const i = row.findIndex(v => NAME_RE.test(AD(v))); if (i >= 0 && row.filter(v => v !== '' && v != null).length >= 2) { h = r; nc = i; } }
    if (h < 0) { // بلا عنوان صريح: أول صف بيانات فيه اسم طويل
      for (let r = 0; r < Math.min(rows.length, 40) && h < 0; r++) { const i = (rows[r] || []).findIndex(isNameCell); if (i >= 0 && r > 0) { h = r - 1; nc = i; } } }
    if (h < 0) return null;
    // صف عناوين ثانٍ (مكوّنات تحت المواد)
    const row2 = rows[h + 1] || []; const isNumRow = row2.some(v => num(v) != null);
    const two = !isNumRow && row2.filter((v, c) => c !== nc && COMP_RE.test(AD(v))).length >= 1 && !isNameCell(row2[nc]);
    const H1 = rows[h] || [], H2 = two ? row2 : [];
    const start = h + (two ? 2 : 1);
    const meta = readMeta(rows, h);
    // صفوف الطلاب
    const data = []; let blank = 0;
    for (let r = start; r < rows.length; r++) { const row = rows[r] || []; const nm = AD(row[nc]);
      if (!nm) { if (++blank > 3) break; continue; } blank = 0;
      if (BAD_NAME.test(nm)) continue; if (!isNameCell(row[nc])) continue; data.push(row); }
    if (!data.length) return null;
    const width = Math.max(H1.length, H2.length, ...data.map(r => r.length));
    let classCol = -1, gradeCol = -1, resultCol = -1; const cols = [];
    for (let c = 0; c < width; c++) { if (c === nc) continue;
      const top = AD(H1[c]), sub = AD(H2[c]); const L = two && sub && sub !== top ? `${top} — ${sub}` : top || sub;
      if (!L) continue;
      if (CLASS_RE.test(top) || CLASS_RE.test(sub)) { classCol = c; continue; }
      if (GRADE_RE.test(top) || GRADE_RE.test(sub)) { gradeCol = c; continue; }
      if (RESULT_RE.test(top) || RESULT_RE.test(sub)) { resultCol = c; continue; }
      if (SKIP_RE.test(top) && !(two && sub && COMP_RE.test(sub) && !SKIP_RE.test(top.replace(/^رقم/, '')))) continue;
      if (LABEL_RE.test(sub || top)) { const prev = cols[cols.length - 1]; if (prev && prev.labelCol == null) prev.labelCol = c; continue; }
      const vals = data.map(r => r[c]); const nN = vals.filter(v => num(v) != null).length, nA = vals.filter(v => ABS_RE.test(AD(v))).length, nW = vals.filter(v => lvlScore(v) != null).length;
      const kind = nN >= Math.max(1, (vals.length - nA) * 0.5) ? 'num' : nW >= (vals.length - nA) * 0.6 && nW ? 'word' : null; if (!kind) continue;
      const obs = Math.max(0, ...vals.map(num).filter(v => v != null));
      cols.push({ c, label: L, top: cleanL(top), sub: cleanL(sub), kind, obs, hmax: maxOf(sub || top) });
    }
    if (!cols.length) return null;
    // نوع الملف وتحديد المادة والمكوّن
    const compish = cols.filter(x => COMP_RE.test(x.sub || x.top)).length;
    let ftype;
    if (two) ftype = 'all';
    else if (meta.subject) ftype = 'subject';
    else if (compish >= Math.ceil(cols.length * 0.6)) ftype = 'subject';
    else ftype = (resultCol >= 0 || cols.some(x => x.labelCol != null) || cols.some(x => AVG_RE.test(x.top))) ? 'cert' : 'all';
    const sheetSubj = meta.subject || (!/^(sheet|ورقة|table)\s*\d*$/i.test(sheetName) && ftype === 'subject' ? sheetName : '');
    cols.forEach(x => {
      if (AVG_RE.test(x.top) || AVG_RE.test(x.sub)) { x.subject = '__avg__'; x.comp = 'total'; x.include = true; }
      else if (SUM_RE.test(x.top)) { x.subject = '__sum__'; x.comp = 'total'; x.include = false; }
      else if (ftype === 'subject') { x.subject = sheetSubj; x.comp = compOf(x.top); x.include = true; }
      else if (two) { x.subject = x.top; x.comp = x.sub ? compOf(x.sub) : 'total'; x.include = true; }
      else { x.subject = x.top; x.comp = 'total'; x.include = true; }
      if (x.kind === 'word') x.max = 100;
      else x.max = x.hmax || (x.comp === 'total' || x.subject === '__avg__' ? (x.obs <= 100 ? 100 : STD_MAX.find(m => m >= x.obs) || Math.ceil(x.obs)) : (STD_MAX.find(m => m >= x.obs) || Math.ceil(x.obs)));
    });
    // إن كان للمادة «مجموع» ومكوّنات، المكوّنات تبقى للعرض التفصيلي والمجموع للتحليل
    const students = data.map(r => ({ name: AD(r[nc]).replace(/\s+/g, ' '), cls: classCol >= 0 ? AD(r[classCol]) : (meta.cls || ''), grade: gradeCol >= 0 ? AD(r[gradeCol]) : (meta.grade || ''), result: resultCol >= 0 ? AD(r[resultCol]) : '', row: r }));
    return { file: fileName, sheet: sheetName, meta, ftype, cols, students, two };
  }

  async function readFile(f) {
    const buf = await f.arrayBuffer();
    let wb; try { wb = XLSX.read(buf, { type: 'array', cellDates: false }); } catch (e) { throw new Error(`تعذّرت قراءة الملف «${f.name}»`); }
    return wb.SheetNames.map(n => parseSheet(wb.Sheets[n], n, f.name)).filter(Boolean);
  }

  // ---------- المطابقة مع قاعدة الطلاب ----------
  let CLS_ALL = null;
  async function allClasses() { if (CLS_ALL) return CLS_ALL; const ids = (S.sections || []).map(s => s.id); try { CLS_ALL = ids.length ? await api.list('classes', { section_id: ids }) : []; } catch (_) { CLS_ALL = []; } (S.classes || []).forEach(c => { if (!CLS_ALL.some(x => x.id === c.id)) CLS_ALL.push(c); }); return CLS_ALL; }
  const clsName = (id, CL) => { const c = (CL || CLS_ALL || []).find(x => x.id === id) || (A.cls && A.cls(id)); return c ? c.name : ''; };
  const gradeOfCls = (id, CL) => { const c = (CL || CLS_ALL || []).find(x => x.id === id) || (A.cls && A.cls(id)); if (!c) return ''; return (A.gradeName ? A.gradeName(c.grade_word, c.stage) : c.grade_word) || c.stage || ''; };
  function matcher(list) {
    const byFull = new Map(), byShort = new Map();
    list.filter(s => s.active !== false).forEach(s => { const k = nk(s.full_name); (byFull.get(k) || byFull.set(k, []).get(k)).push(s); const sh = k.split(' ').slice(0, 3).join(' '); (byShort.get(sh) || byShort.set(sh, []).get(sh)).push(s); });
    return (name, hint) => { const k = nk(name); let c = byFull.get(k) || []; if (!c.length) c = byShort.get(k.split(' ').slice(0, 3).join(' ')) || [];
      if (c.length > 1 && hint) { const h = nk(hint); const f = c.filter(s => nk(clsName(s.class_id)).includes(h) || h.includes(nk(clsName(s.class_id)))); if (f.length === 1) return f[0]; }
      return c.length === 1 ? c[0] : null; };
  }

  // ---------- نافذة الاستيراد ----------
  function importModal(onDone) {
    const m = A.modal(`<div class="nr-imp"><h3>استيراد درجات من نظام نور</h3>
      <p class="sub">ارفع ملف أو أكثر كما صدّرته من نور (xls / xlsx / csv): كشف درجات مادة، أو نتائج كل المواد، أو الشهادات ونتائج نهاية الفصل. يُكتشف شكل الملف تلقائياً وتراجع النتيجة قبل الحفظ. لا تُحفظ أرقام الهوية.</p>
      <label class="nr-drop" id="nrDrop"><input type="file" id="nrF" accept=".xls,.xlsx,.csv,.html,.htm" multiple hidden>
        <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>
        <b>اسحب ملفات نور هنا أو اضغط للاختيار</b><span class="small muted">يمكن رفع عدة ملفات معاً (كل المواد أو كل الفصول)</span></label>
      <div id="nrP"></div></div>`, { cls: 'wide' });
    const drop = $('#nrDrop', m.el), inp = $('#nrF', m.el);
    ['dragover', 'dragenter'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.add('on'); }));
    ['dragleave', 'drop'].forEach(e => drop.addEventListener(e, ev => { ev.preventDefault(); drop.classList.remove('on'); }));
    drop.addEventListener('drop', ev => handle([...ev.dataTransfer.files]));
    inp.onchange = () => handle([...inp.files]);
    let SETS = [];
    async function handle(files) {
      if (!files.length) return; const P = $('#nrP', m.el); P.innerHTML = '<div class="spinner"></div>';
      const errs = []; SETS = [];
      for (const f of files) { try { SETS.push(...await readFile(f)); } catch (e) { errs.push(e.message); } }
      const [stu] = await Promise.all([A.studentsAll ? A.studentsAll(true) : api.list('students', { school_id: S.school.id }), allClasses()]);
      const match = matcher(stu || []);
      SETS.forEach(d => d.students.forEach(s => { const x = match(s.name, s.cls); s.sid = x ? x.id : null; s.class_id = x ? x.class_id : null; }));
      draw(errs);
    }
    function draw(errs) {
      const P = $('#nrP', m.el);
      if (!SETS.length) { P.innerHTML = `<div class="notice warn" style="display:block;margin-top:12px">لم أجد جدول درجات في الملف. تأكد أنه تصدير درجات من نور وفيه عمود «اسم الطالب». ${errs.map(esc).join(' · ')}</div>`; return; }
      const m0 = SETS.find(d => d.meta.term || d.meta.period || d.meta.year) || SETS[0];
      const TYPE = { subject: 'كشف درجات مادة', all: 'نتائج كل المواد', cert: 'شهادات / نتائج نهاية الفصل' };
      const opts = (arr, v) => arr.map(x => `<option ${x === v ? 'selected' : ''}>${x}</option>`).join('');
      P.innerHTML = `${errs.length ? `<div class="notice warn" style="display:block">${errs.map(esc).join(' · ')}</div>` : ''}
        <div class="nr-meta"><div class="field"><label for="nrY">العام الدراسي</label><input class="in" id="nrY" value="${esc(m0.meta.year || '')}" placeholder="مثل ١٤٤٨"></div>
          <div class="field"><label for="nrT">الفصل الدراسي</label><select class="in" id="nrT">${opts(TERMS, m0.meta.term || TERMS[0])}</select></div>
          <div class="field"><label for="nrPe">الفترة</label><select class="in" id="nrPe">${opts(PERIODS, m0.meta.period || PERIODS[2])}</select></div></div>
        ${SETS.map((d, i) => { const mt = d.students.filter(s => s.sid).length;
          return `<section class="nr-set" data-i="${i}"><div class="nr-sh"><b>${esc(d.file)}</b>${d.sheet ? ` <span class="small muted">· ${esc(d.sheet)}</span>` : ''}
            <span class="pill st-submitted">${TYPE[d.ftype]}</span><span class="pill">${AR(d.students.length)} طالب</span>
            <span class="pill ${mt === d.students.length ? 'st-approved' : 'st-returned'}" title="طلاب طوبقوا مع قاعدة الطلاب الموحّدة">مطابق ${AR(mt)} من ${AR(d.students.length)}</span>
            ${d.meta.grade || d.meta.cls ? `<span class="small muted">${esc([d.meta.grade, d.meta.cls].filter(Boolean).join(' · '))}</span>` : ''}</div>
            <div class="scroll"><table class="tbl nr-ct"><thead><tr><th>تضمين</th><th>العمود في الملف</th><th>المادة</th><th>المكوّن</th><th>الدرجة العظمى</th><th>عيّنة</th></tr></thead><tbody>
            ${d.cols.map((x, j) => `<tr><td><input type="checkbox" data-in="${i}|${j}" ${x.include ? 'checked' : ''} aria-label="تضمين ${esc(x.label)}"></td><td class="small">${esc(x.label)}${x.kind === 'word' ? ' <span class="pill" title="تقديرات وصفية حُوِّلت لقيم تقريبية">وصفي</span>' : ''}</td>
              <td><input class="in" data-su="${i}|${j}" value="${esc(x.subject === '__avg__' ? 'المعدل العام' : x.subject === '__sum__' ? 'المجموع الكلي' : x.subject)}" ${x.subject.startsWith('__') ? 'disabled' : ''} placeholder="اسم المادة" style="min-width:130px"></td>
              <td><input class="in" data-co="${i}|${j}" value="${esc(x.comp === 'total' ? 'المجموع' : x.comp)}" ${x.subject.startsWith('__') ? 'disabled' : ''} style="min-width:110px" list="nrComps"></td>
              <td><input class="in" type="number" min="1" data-mx="${i}|${j}" value="${x.max}" style="width:80px" aria-label="الدرجة العظمى"></td>
              <td class="small muted">${d.students.slice(0, 3).map(s => esc(String(s.row[x.c] ?? ''))).join(' · ')}</td></tr>`).join('')}</tbody></table></div>
            ${mt < d.students.length ? `<details class="small"><summary>غير المطابقين (${AR(d.students.length - mt)}) — يُحفظون بأسمائهم ويُحلَّلون أيضاً</summary><p class="muted">${d.students.filter(s => !s.sid).slice(0, 60).map(s => esc(s.name)).join('، ')}</p></details>` : ''}
          </section>`; }).join('')}
        <datalist id="nrComps"><option>المجموع</option><option>أعمال السنة</option><option>الاختبار النهائي</option><option>الفترة الأولى</option><option>الفترة الثانية</option><option>المشاركة</option><option>الواجبات</option><option>الاختبار القصير</option><option>الاختبار الشفهي</option><option>الاختبار التحريري</option></datalist>
        <div class="row" style="margin-top:12px;gap:8px"><button class="btn" id="nrSave">حفظ وتحليل</button><span class="small muted">يمكن حذف أي استيراد لاحقاً دون أن يتأثر أي شيء آخر في المنصة.</span></div>`;
      $$('[data-in]', P).forEach(b => b.onchange = () => { const [i, j] = b.dataset.in.split('|'); SETS[i].cols[j].include = b.checked; });
      $$('[data-su]', P).forEach(b => b.oninput = () => { const [i, j] = b.dataset.su.split('|'); SETS[i].cols[j].subject = b.value.trim(); });
      $$('[data-co]', P).forEach(b => b.oninput = () => { const [i, j] = b.dataset.co.split('|'); const v = b.value.trim(); SETS[i].cols[j].comp = !v || v === 'المجموع' ? 'total' : v; });
      $$('[data-mx]', P).forEach(b => b.oninput = () => { const [i, j] = b.dataset.mx.split('|'); SETS[i].cols[j].max = +b.value || SETS[i].cols[j].max; });
      $('#nrSave', P).onclick = ev => A.run(ev.currentTarget, async () => {
        const year = $('#nrY', P).value.trim(), term = $('#nrT', P).value, period = $('#nrPe', P).value;
        let total = 0;
        for (const d of SETS) {
          const cols = d.cols.filter(x => x.include && x.subject);
          if (!cols.length) continue;
          if (cols.some(x => !x.subject.trim())) throw new Error('اكتب اسم المادة لكل عمود مُضمَّن');
          const subs = [...new Set(cols.map(x => x.subject).filter(s => !s.startsWith('__')))];
          const title = [d.meta.grade, d.meta.cls].filter(Boolean).join(' ') + (subs.length === 1 ? ' — ' + subs[0] : subs.length ? ` — ${AR(subs.length)} مواد` : '');
          const [imp] = await api.ins('noor_imports', { school_id: S.school.id, section_id: S.sectionId || null, title: title.trim() || d.file, kind: d.ftype, year, term, period, grade: d.meta.grade || '', class_label: d.meta.cls || '', file_name: d.file + (d.sheet ? ' / ' + d.sheet : ''), meta: { teacher: d.meta.teacher || '', two: d.two } });
          const rows = [];
          d.students.forEach(s => cols.forEach(x => { const raw = s.row[x.c]; let sc = x.kind === 'word' ? lvlScore(raw) : num(raw); const lab = x.labelCol != null ? AD(s.row[x.labelCol]) : x.kind === 'word' ? AD(raw) : '';
            if (sc == null && !ABS_RE.test(AD(raw)) && !lab) return;
            rows.push({ import_id: imp.id, school_id: S.school.id, student_id: s.sid, student_name: s.name, class_id: s.class_id, class_label: s.cls || (s.class_id ? clsName(s.class_id) : ''), grade: s.grade || (s.class_id ? gradeOfCls(s.class_id) : ''), subject: x.subject, component: x.comp || 'total', score: sc, max_score: x.max, grade_label: lab || (ABS_RE.test(AD(raw)) ? 'غائب' : (s.result && x.subject === '__avg__' ? s.result : '')) }); }));
          for (let k = 0; k < rows.length; k += 500) await api.ins('noor_scores', rows.slice(k, k + 500));
          total += rows.length;
        }
        if (!total) throw new Error('لا توجد أعمدة مُضمَّنة للحفظ');
        A.toast(`حُفظت ${AR(total)} درجة`, 'ok'); m.close(); onDone && onDone();
      });
    }
  }

  // ---------- بناء نموذج التحليل ----------
  // يُرجع لكل طالب: نسبة كل مادة (المجموع إن وُجد، وإلا مجموع المكوّنات ÷ مجموع العظمى)
  function buildModel(imps, scores) {
    const impOrder = new Map(imps.map(i => [i.id, i.created_at]));
    const per = new Map(); // key -> {name, sid, cls, grade, subj:{s:{tot, comps:{c:{sc,mx}}}}, avg}
    const comps = {}; // subject -> Set(components)
    scores.slice().sort((a, b) => String(impOrder.get(a.import_id)).localeCompare(String(impOrder.get(b.import_id)))).forEach(r => {
      const key = r.student_id || nk(r.student_name) + '|' + nk(r.class_label);
      const p = per.get(key) || per.set(key, { key, name: r.student_name, sid: r.student_id, class_id: r.class_id, cls: (x => /^\d+$/.test(x) ? AR(x) : x)(r.class_label || clsName(r.class_id)), grade: r.grade, subj: {}, avg: null, absent: {} }).get(key);
      if (r.subject === '__sum__') return;
      if (r.subject === '__avg__') { if (r.score != null) p.avg = r.max_score ? r.score / r.max_score * 100 : r.score; return; }
      const s = p.subj[r.subject] = p.subj[r.subject] || { tot: null, comps: {} };
      if (r.score == null) { if (r.grade_label === 'غائب') p.absent[r.subject] = true; return; }
      if (r.component === 'total') s.tot = r.max_score ? r.score / r.max_score * 100 : r.score;
      else { s.comps[r.component] = { sc: r.score, mx: r.max_score }; (comps[r.subject] = comps[r.subject] || new Set()).add(r.component); }
    });
    const studs = [...per.values()];
    studs.forEach(p => { Object.entries(p.subj).forEach(([k, s]) => { if (s.tot == null) { const c = Object.values(s.comps); const mx = c.reduce((a, x) => a + (x.mx || 0), 0); if (c.length && mx) s.tot = c.reduce((a, x) => a + x.sc, 0) / mx * 100; } if (s.tot == null) delete p.subj[k]; else s.tot = Math.min(100, Math.max(0, s.tot)); });
      const v = Object.values(p.subj).map(s => s.tot); p.mean = p.avg != null ? p.avg : mean(v); p.weak = Object.entries(p.subj).filter(([, s]) => s.tot < 50).map(([k]) => k); p.n = v.length; });
    const subjects = [...new Set(studs.flatMap(p => Object.keys(p.subj)))].sort((a, b) => a.localeCompare(b, 'ar'));
    const all = studs.filter(p => p.n || p.avg != null);
    all.sort((a, b) => (b.mean ?? -1) - (a.mean ?? -1)); let rk = 0, last = null; all.forEach((p, i) => { if (p.mean !== last) { rk = i + 1; last = p.mean; } p.rank = rk; });
    return { studs: all, subjects, comps };
  }
  const subjStats = (studs, s) => { const v = studs.map(p => p.subj[s] && p.subj[s].tot).filter(x => x != null); return { n: v.length, mean: mean(v), med: median(v), sd: sd(v), max: v.length ? Math.max(...v) : null, min: v.length ? Math.min(...v) : null, pass: v.length ? v.filter(x => x >= 50).length / v.length * 100 : null, lv: LV.map(l => v.filter(x => lvOf(x) === l).length), v }; };

  // ---------- رسوم SVG (من اليمين لليسار) ----------
  function barChart(items, o = {}) { // items: [{label, value, color, key}]
    if (!items.length) return A.emptyBox ? A.emptyBox('لا بيانات') : '';
    const PAD = 30, W = Math.max(520, items.length * 92 + PAD), H = 250, top = 24, bot = 54, ch = H - top - bot, PW = W - PAD, bw = Math.min(48, (PW / items.length) * 0.55), mx = o.max || 100;
    const lines = [0, 25, 50, 75, 100].map(t => { const y = top + ch - ch * t / 100; return `<line x1="0" x2="${PW}" y1="${y}" y2="${y}" stroke="#E4EBF5"/><text x="${W - 2}" y="${y + 3}" font-size="10" fill="#8796AE" text-anchor="end">${AR(Math.round(mx * t / 100))}</text>`; }).join('');
    const bars = items.map((it, i) => { const cx = PW - (i + 0.5) * (PW / items.length), h = Math.max(1, ch * Math.min(it.value || 0, mx) / mx), y = top + ch - h;
      return `<g class="nr-b" ${it.key != null ? `data-bk="${esc(String(it.key))}" tabindex="0" role="button"` : ''} aria-label="${esc(it.label)}: ${fmt(it.value)}"><title>${esc(it.label)}: ${fmt(it.value)}${o.unit || ''}</title>
        <rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${h}" rx="6" fill="${it.color || '#005499'}"/><text x="${cx}" y="${y - 5}" text-anchor="middle" font-size="11" font-weight="800" fill="#082B5A">${fmt(it.value)}</text>
        <text x="${cx}" y="${H - bot + 16}" text-anchor="middle" font-size="10.5" fill="#43597A">${esc(it.label.length > 14 ? it.label.slice(0, 13) + '…' : it.label)}</text>${it.sub ? `<text x="${cx}" y="${H - bot + 30}" text-anchor="middle" font-size="9" fill="#8796AE">${esc(it.sub)}</text>` : ''}</g>`; }).join('');
    return `<div class="nr-svg"><svg viewBox="0 0 ${W} ${H}" width="${W}" style="max-width:100%;height:auto;display:block;margin:auto;direction:ltr" role="img" aria-label="${esc(o.title || 'رسم بياني')}">${lines}${o.ref != null ? `<line x1="0" x2="${PW}" y1="${top + ch - ch * o.ref / mx}" y2="${top + ch - ch * o.ref / mx}" stroke="#D2463F" stroke-dasharray="4 4"/>` : ''}${bars}</svg></div>`;
  }
  function stackRows(rows) { // rows: [{label, counts[5], key}]
    return `<div class="nr-stk">${rows.map(r => { const t = r.counts.reduce((a, b) => a + b, 0) || 1;
      return `<div class="nr-sr" ${r.key != null ? `data-sk="${esc(r.key)}" tabindex="0" role="button"` : ''}><span class="nr-sl">${esc(r.label)}</span><span class="nr-sb">${r.counts.map((n, i) => n ? `<i style="width:${n / t * 100}%;background:${LV[i][2]}" title="${LV[i][0]}: ${AR(n)} (${AR(Math.round(n / t * 100))}٪)">${n / t > 0.08 ? AR(Math.round(n / t * 100)) + '٪' : ''}</i>` : '').join('')}</span></div>`; }).join('')}
      <div class="nr-lg">${LV.map(l => `<span><i style="background:${l[2]}"></i>${l[0]}${l[1] ? ` (${AR(l[1])}+)` : ' (أقل من ٥٠)'}</span>`).join('')}</div></div>`;
  }
  function histo(vals) { const b = [[0, 50], [50, 60], [60, 70], [70, 80], [80, 90], [90, 101]]; return barChart(b.map(([a, c], i) => ({ label: i === 0 ? 'أقل من ٥٠' : `${AR(a)}–${AR(Math.min(c, 100))}`, value: vals.filter(v => v >= a && v < c).length, color: i === 0 ? '#D2463F' : i >= 4 ? '#2E8B57' : '#3AB1DB', key: i })), { max: Math.max(1, ...b.map(([a, c]) => vals.filter(v => v >= a && v < c).length)), title: 'توزيع المعدلات' }); }
  function scatter(px, py, lx, ly) {
    const W = 420, H = 300, p = 36; const X = v => p + (W - 2 * p) * (1 - v / 100), Y = v => H - p - (H - 2 * p) * v / 100; // المحور الأفقي من اليمين
    const r = corr(px.map(d => d[0]), px.map(d => d[1]));
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:520px;direction:ltr" role="img" aria-label="انتشار ${esc(lx)} مقابل ${esc(ly)}">
      <rect x="${p}" y="${p}" width="${W - 2 * p}" height="${H - 2 * p}" fill="#F7FAFE" stroke="#DCE7F3"/>
      ${[0, 50, 100].map(t => `<text x="${X(t)}" y="${H - p + 14}" font-size="9" text-anchor="middle" fill="#8796AE">${AR(t)}</text><text x="${p - 6}" y="${Y(t) + 3}" font-size="9" text-anchor="end" fill="#8796AE">${AR(t)}</text>`).join('')}
      <text x="${W / 2}" y="${H - 4}" font-size="11" text-anchor="middle" fill="#082B5A" font-weight="800">${esc(lx)}</text>
      <text x="12" y="${H / 2}" font-size="11" text-anchor="middle" fill="#082B5A" font-weight="800" transform="rotate(-90 12 ${H / 2})">${esc(ly)}</text>
      ${px.map(([a, b, n]) => `<circle cx="${X(a)}" cy="${Y(b)}" r="4.2" fill="${a < 50 || b < 50 ? '#D2463F' : '#005499'}" fill-opacity=".65"><title>${esc(n)}: ${fmt(a)} / ${fmt(b)}</title></circle>`).join('')}
      <text x="${W / 2}" y="${p - 10}" font-size="12" text-anchor="middle" fill="#082B5A" font-weight="800">${r == null ? '—' : rTxt(r)} :معامل الارتباط</text></svg>`;
  }
  const heat = v => v == null ? '#fff' : v >= 0 ? `rgba(46,139,87,${Math.min(0.85, Math.abs(v))})` : `rgba(210,70,63,${Math.min(0.85, Math.abs(v))})`;
  const heatMean = v => v == null ? '#fff' : v >= 90 ? '#CDEBD8' : v >= 80 ? '#E2F2D0' : v >= 65 ? '#DDF1F9' : v >= 50 ? '#FBEBCB' : '#F7D4D1';
  const rTxt = r => (r < 0 ? '−' : '') + AR(Math.abs(Math.round(r * 100) / 100));
  const rB = r => `<bdi dir="ltr">${rTxt(r)}</bdi>`;
  const corrWord = r => r == null ? '' : Math.abs(r) >= 0.7 ? 'قوي' : Math.abs(r) >= 0.4 ? 'متوسط' : Math.abs(r) >= 0.2 ? 'ضعيف' : 'لا يُذكر';

  // ---------- الواجهة ----------
  const css = `
  .nr-top{display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:10px 0 4px}.nr-top .field{margin:0;min-width:150px}
  .nr-drop{display:flex;flex-direction:column;align-items:center;gap:6px;border:2px dashed #9CC4E4;border-radius:16px;padding:22px;margin:12px 0;color:#005499;background:#F4F9FE;cursor:pointer;text-align:center;transition:background .15s}
  .nr-drop.on,.nr-drop:hover{background:#E6F3FC;border-color:#3AB1DB}
  .nr-meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin:12px 0}
  .nr-set{border:1px solid #DCE7F3;border-radius:14px;padding:10px 12px;margin:10px 0;background:#fff}
  .nr-sh{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:8px}
  .nr-ct td,.nr-ct th{white-space:nowrap}.nr-ct .in{padding:5px 8px}
  .nr-tabs{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}
  .nr-tabs button{border:1px solid #CFE0F2;background:#fff;color:#082B5A;border-radius:99px;padding:7px 14px;font:inherit;font-weight:700;cursor:pointer}
  .nr-tabs button.on{background:#082B5A;color:#fff;border-color:#082B5A}
  .nr-ins{display:grid;gap:6px;margin:10px 0;padding:12px 14px;border-radius:14px;background:linear-gradient(180deg,#F4F8FC,#fff);border:1px solid #DCE7F3}
  .nr-ins div{position:relative;padding-inline-start:16px;line-height:1.8}.nr-ins div:before{content:'';position:absolute;inset-inline-start:0;top:9px;width:8px;height:8px;border-radius:50%;background:#3AB1DB}
  .nr-svg{overflow-x:auto}.nr-b{cursor:pointer}.nr-b:hover rect,.nr-b:focus rect{opacity:.8}.nr-b:focus{outline:none}
  .nr-stk{display:grid;gap:7px}.nr-sr{display:grid;grid-template-columns:minmax(90px,160px) 1fr;gap:8px;align-items:center;cursor:pointer}
  .nr-sl{font-weight:700;color:#082B5A;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .nr-sb{display:flex;height:24px;border-radius:8px;overflow:hidden;background:#EEF3F9}
  .nr-sb i{display:flex;align-items:center;justify-content:center;color:#fff;font-style:normal;font-size:10.5px;font-weight:800;min-width:0}
  .nr-lg{display:flex;flex-wrap:wrap;gap:10px;font-size:11.5px;color:#43597A;margin-top:4px}.nr-lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-inline-end:4px;vertical-align:middle}
  .nr-hm td,.nr-hm th{text-align:center;white-space:nowrap}.nr-hm td.c{cursor:pointer;font-weight:700}.nr-hm td.c:hover{outline:2px solid #3AB1DB}
  .nr-g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}@media(max-width:820px){.nr-g2{grid-template-columns:1fr}}
  .nr-card{border:1px solid #DCE7F3;border-radius:14px;padding:12px;background:#fff;min-width:0}.nr-card h3{margin:0 0 8px;font-size:15px;color:#082B5A}
  .nr-imps{display:grid;gap:6px;max-height:280px;overflow:auto}.nr-imp-r{display:flex;gap:8px;align-items:center;flex-wrap:wrap;border:1px solid #E4EBF5;border-radius:10px;padding:6px 10px}
  .nr-ks{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}.nr-ks .k,.nr-pk .k{display:inline-block;border:1px solid #CFE0F2;border-radius:14px;padding:8px 14px;background:linear-gradient(180deg,#fff,#F3F8FD);box-shadow:inset 0 -3px 0 #3AB1DB;color:#43597A;font-size:12px}.nr-ks .k b,.nr-pk .k b{display:block;font-size:20px;color:#082B5A}
  .nr-mini{display:inline-block;height:8px;border-radius:4px;vertical-align:middle;margin-inline-start:6px}
  @media(max-width:600px){.nr-svg svg{min-width:500px}.nr-sr{grid-template-columns:96px 1fr}.nr-card{padding:10px 8px}}
  @media print{.nr-tabs,.nr-top{display:none}}`;
  if (!document.getElementById('app56css')) { const st = document.createElement('style'); st.id = 'app56css'; st.textContent = css; document.head.appendChild(st); }

  const st = { tab: (A.LS && A.LS.get('nrtab')) || 'over', per: '', grade: '', cls: '', subj: '' };
  V.noor = async function (root) {
    if (!can()) { root.innerHTML = `<div class="card">${A.emptyBox('هذه الصفحة للمالك ومن يمنحه صلاحيتها')}</div>`; return; }
    root.innerHTML = '<div class="spinner"></div>';
    let imps, CL;
    try { [imps, CL] = await Promise.all([api.list('noor_imports', { school_id: S.school.id }, { order: 'created_at', desc: true }), allClasses()]); }
    catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', e.message)}</div>`; return; }
    const pk = i => [i.year || '', i.term || '', i.period || ''].join('|');
    const pLabel = k => k.split('|').filter(Boolean).join(' · ') || 'بلا فترة';
    const pers = [...new Set(imps.map(pk))];
    if (!pers.includes(st.per)) st.per = pers[0] || '';
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>تحليل درجات نور</h2><p class="sub" style="margin:2px 0 0">ارفع ملفات نور فتحصل على تحليل كامل للمواد والفصول والطلاب والترابط بين المواد، مع تقارير مطبوعة بهوية دينا.</p></div>
      <div class="row" style="gap:6px"><button class="btn" id="nrImp">${A.I.plus || ''} استيراد ملفات نور</button>${imps.length ? `<button class="btn ghost" id="nrPr">${A.I.print || ''} تقرير شامل</button><button class="btn ghost" id="nrX">${A.I.down || ''} Excel</button><button class="btn ghost" id="nrMg">إدارة الاستيرادات</button>` : ''}</div></div>
      <div id="nrB"></div></div>`;
    $('#nrImp', root).onclick = () => importModal(() => V.noor(root));
    if (!imps.length) { $('#nrB', root).innerHTML = `<div class="nr-ins"><div>ابدأ برفع ملف درجات من نور: كشف درجات مادة لفصل، أو نتائج كل المواد، أو الشهادات.</div><div>تُكتشف المواد والمكوّنات والدرجة العظمى تلقائياً، وتراجعها قبل الحفظ.</div><div>يُطابَق الطلاب مع قاعدة الطلاب الموحّدة في المنصة، ولا تُحفظ أرقام الهوية.</div></div>`; return; }
    $('#nrMg', root).onclick = () => manage(imps, () => V.noor(root));
    const B = $('#nrB', root);
    B.innerHTML = `<div class="nr-top"><div class="field"><label for="nrPer">الفترة</label><select class="in" id="nrPer">${pers.map(k => `<option value="${esc(k)}" ${k === st.per ? 'selected' : ''}>${esc(pLabel(k))}</option>`).join('')}</select></div>
      <div class="field"><label for="nrGr">الصف</label><select class="in" id="nrGr"></select></div><div class="field"><label for="nrCl">الفصل</label><select class="in" id="nrCl"></select></div></div>
      <div class="nr-tabs" role="tablist">${[['over', 'نظرة عامة'], ['subj', 'المواد'], ['corr', 'الترابط بين المواد'], ['cls', 'الفصول'], ['stu', 'الطلاب'], ['cmp', 'المقارنة بين الفترات']].map(([k, l]) => `<button role="tab" data-tb="${k}" class="${st.tab === k ? 'on' : ''}" aria-selected="${st.tab === k}">${l}</button>`).join('')}</div><div id="nrO"></div>`;
    const cache = {};
    const scoresOf = async ids => { const need = ids.filter(id => !cache[id]); if (need.length) { const rows = await api.list('noor_scores', { import_id: need }); need.forEach(id => cache[id] = []); rows.forEach(r => (cache[r.import_id] = cache[r.import_id] || []).push(r)); } return ids.flatMap(id => cache[id] || []); };
    let MODEL = null, CTX = null;
    async function load() {
      const O = $('#nrO', B); O.innerHTML = '<div class="spinner"></div>';
      const ims = imps.filter(i => pk(i) === st.per);
      const sc = await scoresOf(ims.map(i => i.id));
      const full = buildModel(ims, sc);
      const grades = [...new Set(full.studs.map(p => p.grade || gradeOfCls(p.class_id, CL)).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
      if (st.grade && !grades.includes(st.grade)) st.grade = '';
      $('#nrGr', B).innerHTML = `<option value="">كل الصفوف</option>${grades.map(g => `<option ${g === st.grade ? 'selected' : ''}>${esc(g)}</option>`).join('')}`;
      const inG = full.studs.filter(p => !st.grade || (p.grade || gradeOfCls(p.class_id, CL)) === st.grade);
      const clss = [...new Set(inG.map(p => p.cls).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
      if (st.cls && !clss.includes(st.cls)) st.cls = '';
      $('#nrCl', B).innerHTML = `<option value="">كل الفصول</option>${clss.map(g => `<option ${g === st.cls ? 'selected' : ''}>${esc(g)}</option>`).join('')}`;
      const studs = inG.filter(p => !st.cls || p.cls === st.cls);
      const subjects = full.subjects.filter(s => studs.some(p => p.subj[s]));
      MODEL = { studs, subjects, comps: full.comps, all: full };
      CTX = [pLabel(st.per), st.grade || 'كل الصفوف', st.cls || 'كل الفصول'].join(' · ');
      render();
    }
    $('#nrPer', B).onchange = e => { st.per = e.target.value; st.grade = ''; st.cls = ''; load(); };
    $('#nrGr', B).onchange = e => { st.grade = e.target.value; st.cls = ''; load(); };
    $('#nrCl', B).onchange = e => { st.cls = e.target.value; load(); };
    $$('[data-tb]', B).forEach(b => b.onclick = () => { st.tab = b.dataset.tb; A.LS && A.LS.set('nrtab', st.tab); $$('[data-tb]', B).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); render(); });
    $('#nrPr', root).onclick = () => MODEL && printAll(MODEL, CTX);
    $('#nrX', root).onclick = () => MODEL && excel(MODEL, CTX);

    const stuRows = (list, s) => list.map(p => ({ q: p.name + ' ' + (p.cls || ''), cells: [`<b>${esc(p.name)}</b>`, esc(p.cls || '—'), s ? fmt(p.subj[s] && p.subj[s].tot) : fmt(p.mean), s ? (p.subj[s] ? lvOf(p.subj[s].tot)[0] : '—') : (p.mean != null ? lvOf(p.mean)[0] : '—'), AR(p.rank), p.weak.length ? esc(p.weak.join('، ')) : '—'] }));
    const stuCols = s => ['الطالب', 'الفصل', s ? esc(s) : 'المعدل', 'التقدير', 'الترتيب', 'مواد دون المستوى'];
    const drillStu = (title, list, s) => A.attDrill && A.attDrill({ title, sub: esc(CTX), cols: stuCols(s), rows: stuRows(list, s) });

    function render() {
      const O = $('#nrO', B); const M = MODEL; if (!M) return;
      if (!M.studs.length) { O.innerHTML = A.emptyBox('لا بيانات لهذا الاختيار'); return; }
      const means = M.studs.map(p => p.mean).filter(v => v != null);
      const ss = M.subjects.map(s => ({ s, ...subjStats(M.studs, s) })).sort((a, b) => b.mean - a.mean);
      if (st.tab === 'over') {
        const weak = M.studs.filter(p => p.weak.length), top = M.studs.filter(p => p.mean >= 90), multi = M.studs.filter(p => p.weak.length >= 2);
        const pass = means.length ? means.filter(v => v >= 50).length / means.length * 100 : null;
        const best = ss[0], worst = ss[ss.length - 1];
        const lvAll = LV.map(l => means.filter(v => lvOf(v) === l).length);
        O.innerHTML = `<div class="grid g4" style="margin:6px 0 12px">
          <button type="button" class="kpi navy btnlike" data-k="all"><span class="more">التفاصيل</span><div class="k">الطلاب</div><div class="v">${AR(M.studs.length)}</div><div class="d">${AR(M.subjects.length)} مادة</div></button>
          <button type="button" class="kpi btnlike" data-k="mean"><span class="more">التفاصيل</span><div class="k">المعدل العام</div><div class="v">${fmt(mean(means))}<small>٪</small></div><div class="d">الوسيط ${fmt(median(means))}٪</div></button>
          <button type="button" class="kpi btnlike" data-k="top"><span class="more">التفاصيل</span><div class="k">المتفوقون (٩٠+)</div><div class="v" style="color:var(--ok)">${AR(top.length)}</div><div class="d">${fmt(top.length / M.studs.length * 100)}٪ من الطلاب</div></button>
          <button type="button" class="kpi btnlike" data-k="weak"><span class="more">التفاصيل</span><div class="k">دون المستوى في مادة أو أكثر</div><div class="v" style="color:var(--bad)">${AR(weak.length)}</div><div class="d">منهم ${AR(multi.length)} في مادتين فأكثر</div></button></div>
          <div class="nr-ins">${[
            best ? `أعلى مادة متوسطاً: <b>${esc(best.s)}</b> (${fmt(best.mean)}٪)، وأدناها: <b>${esc(worst.s)}</b> (${fmt(worst.mean)}٪).` : '',
            pass != null ? `نسبة النجاح العامة ${fmt(pass)}٪، و${fmt(lvAll[0] / (means.length || 1) * 100)}٪ من الطلاب بتقدير ممتاز.` : '',
            (() => { const p = topPair(M); return p ? `أقوى ترابط بين <b>${esc(p.a)}</b> و<b>${esc(p.b)}</b> (معامل ${rB(p.r)} — ${corrWord(p.r)})؛ تحسّن أحدهما يرافقه غالباً تحسّن الآخر.` : ''; })(),
            ss.filter(x => x.pass < 80).length ? `مواد تحتاج خطة علاجية (نجاح أقل من ٨٠٪): ${ss.filter(x => x.pass < 80).map(x => `<b>${esc(x.s)}</b>`).join('، ')}.` : 'كل المواد نسبة النجاح فيها ٨٠٪ فأكثر.',
          ].filter(Boolean).map(t => `<div>${t}</div>`).join('')}</div>
          <div class="nr-g2"><div class="nr-card"><h3>متوسط كل مادة</h3>${barChart(ss.map(x => ({ label: x.s, value: x.mean, color: lvOf(x.mean)[2], key: x.s })), { ref: 50, unit: '٪', title: 'متوسط المواد' })}</div>
          <div class="nr-card"><h3>توزيع معدلات الطلاب</h3>${histo(means)}</div></div>
          <div class="nr-card" style="margin-top:14px"><h3>توزيع التقديرات في كل مادة</h3>${stackRows(ss.map(x => ({ label: x.s, counts: x.lv, key: x.s })))}</div>`;
        const K = { all: () => drillStu('كل الطلاب', M.studs), mean: () => drillStu('الطلاب حسب المعدل', M.studs), top: () => drillStu('المتفوقون (٩٠ فأكثر)', top), weak: () => drillStu('دون المستوى في مادة أو أكثر', weak.slice().sort((a, b) => b.weak.length - a.weak.length)) };
        $$('[data-k]', O).forEach(b => b.onclick = () => K[b.dataset.k]());
        $$('[data-bk]', O).forEach(g => { const f = () => { const k = g.dataset.bk; if (M.subjects.includes(k)) subjDetail(k); else { const bins = [[0, 50], [50, 60], [60, 70], [70, 80], [80, 90], [90, 101]][+k]; drillStu('الطلاب في الفئة', M.studs.filter(p => p.mean >= bins[0] && p.mean < bins[1])); } }; g.onclick = f; g.onkeydown = e => { if (e.key === 'Enter') f(); }; });
        $$('[data-sk]', O).forEach(r => r.onclick = () => subjDetail(r.dataset.sk));
      }
      if (st.tab === 'subj') {
        O.innerHTML = `<div class="scroll"><table class="tbl"><thead><tr><th>المادة</th><th>الطلاب</th><th>المتوسط</th><th>الوسيط</th><th>الانحراف المعياري</th><th>الأعلى</th><th>الأدنى</th><th>النجاح</th>${LV.map(l => `<th>${l[0]}</th>`).join('')}<th></th></tr></thead><tbody>
          ${ss.map(x => `<tr class="click" data-sj="${esc(x.s)}"><td><b>${esc(x.s)}</b></td><td>${AR(x.n)}</td><td><b>${fmt(x.mean)}</b><span class="nr-mini" style="width:${Math.round(x.mean * 0.6)}px;background:${lvOf(x.mean)[2]}"></span></td><td>${fmt(x.med)}</td><td>${fmt(x.sd)}</td><td>${fmt(x.max)}</td><td>${fmt(x.min)}</td><td><span class="pill ${x.pass >= 90 ? 'st-approved' : x.pass >= 75 ? 'st-submitted' : 'st-returned'}">${fmt(x.pass)}٪</span></td>${x.lv.map(n => `<td>${AR(n)}</td>`).join('')}<td><button class="btn ghost sm">تحليل</button></td></tr>`).join('')}</tbody></table></div>
          <p class="small muted">الانحراف المعياري الكبير يعني تفاوتاً واسعاً بين الطلاب في المادة؛ اضغط أي مادة لتحليلها التفصيلي.</p>`;
        $$('[data-sj]', O).forEach(r => r.onclick = () => subjDetail(r.dataset.sj));
      }
      if (st.tab === 'corr') {
        const S2 = M.subjects; const R = {};
        S2.forEach(a => S2.forEach(b => { if (a >= b && a !== b) return; const pr = M.studs.filter(p => p.subj[a] && p.subj[b]); R[a + '|' + b] = a === b ? 1 : corr(pr.map(p => p.subj[a].tot), pr.map(p => p.subj[b].tot)); }));
        const g = (a, b) => a === b ? 1 : R[a + '|' + b] !== undefined ? R[a + '|' + b] : R[b + '|' + a];
        const pairs = []; S2.forEach((a, i) => S2.slice(i + 1).forEach(b => { const r = g(a, b); if (r != null) pairs.push({ a, b, r }); })); pairs.sort((x, y) => y.r - x.r);
        const multi = [0, 1, 2, 3].map(n => M.studs.filter(p => n === 3 ? p.weak.length >= 3 : p.weak.length === n));
        O.innerHTML = `<div class="nr-ins"><div>معامل الارتباط بين مادتين يقيس مدى تحرّك درجات الطلاب فيهما معاً: قريب من ١ = ترابط قوي، قريب من صفر = لا علاقة.</div>
          ${pairs.length ? `<div>أقوى الأزواج: ${pairs.slice(0, 3).map(p => `<b>${esc(p.a)}</b> و<b>${esc(p.b)}</b> (${rB(p.r)})`).join('، ')}.</div><div>أضعفها: ${pairs.slice(-2).map(p => `<b>${esc(p.a)}</b> و<b>${esc(p.b)}</b> (${rB(p.r)})`).join('، ')}.</div>` : '<div>يلزم خمسة طلاب على الأقل لديهم درجات في المادتين لحساب الارتباط.</div>'}</div>
          <div class="nr-card"><h3>مصفوفة الترابط بين المواد</h3><div class="scroll"><table class="tbl nr-hm"><thead><tr><th></th>${S2.map(s => `<th>${esc(s)}</th>`).join('')}</tr></thead><tbody>
          ${S2.map(a => `<tr><th>${esc(a)}</th>${S2.map(b => { const r = g(a, b); return a === b ? '<td style="background:#EEF3F9">—</td>' : `<td class="c" data-pa="${esc(a)}" data-pb="${esc(b)}" style="background:${heat(r)};color:${r != null && Math.abs(r) > 0.55 ? '#fff' : '#082B5A'}" title="${esc(a)} × ${esc(b)}: ${corrWord(r)}">${r == null ? '—' : rB(r)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
          <p class="small muted">اضغط أي خلية لعرض مخطط الانتشار بين المادتين.</p></div>
          <div class="nr-g2" style="margin-top:14px"><div class="nr-card" id="nrSc"><h3>مخطط الانتشار</h3>${pairs.length ? scatterOf(pairs[0].a, pairs[0].b) : A.emptyBox('لا بيانات كافية')}</div>
          <div class="nr-card"><h3>التعثر المتعدد</h3>${barChart(multi.map((l, n) => ({ label: n === 0 ? 'لا تعثر' : n === 3 ? '٣ مواد فأكثر' : n === 1 ? 'مادة واحدة' : 'مادتان', value: l.length, color: n ? '#D2463F' : '#2E8B57', key: n })), { max: Math.max(1, ...multi.map(l => l.length)), title: 'عدد المواد دون المستوى لكل طالب' })}
          <p class="small muted">الطالب المتعثر في أكثر من مادة يحتاج خطة دعم شاملة لا مادة واحدة.</p></div></div>`;
        $$('[data-pa]', O).forEach(c => c.onclick = () => { $('#nrSc', O).innerHTML = `<h3>مخطط الانتشار</h3>${scatterOf(c.dataset.pa, c.dataset.pb)}`; $('#nrSc', O).scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
        $$('[data-bk]', O).forEach(gr => gr.onclick = () => drillStu('التعثر المتعدد', multi[+gr.dataset.bk]));
      }
      if (st.tab === 'cls') {
        const cl = [...new Set(M.studs.map(p => p.cls || '—'))].sort((a, b) => a.localeCompare(b, 'ar'));
        const cm = (c, s) => { const v = M.studs.filter(p => (p.cls || '—') === c && p.subj[s]).map(p => p.subj[s].tot); return v.length ? mean(v) : null; };
        const cAvg = c => mean(M.studs.filter(p => (p.cls || '—') === c && p.mean != null).map(p => p.mean));
        const ord = cl.slice().sort((a, b) => (cAvg(b) || 0) - (cAvg(a) || 0));
        O.innerHTML = `<div class="nr-card"><h3>متوسط الفصول</h3>${barChart(ord.map(c => ({ label: c, value: cAvg(c), color: lvOf(cAvg(c) || 0)[2], key: c, sub: AR(M.studs.filter(p => (p.cls || '—') === c).length) + ' طالب' })), { ref: 50, unit: '٪', title: 'متوسط الفصول' })}</div>
          <div class="nr-card" style="margin-top:14px"><h3>الفصول × المواد (المتوسط)</h3><div class="scroll"><table class="tbl nr-hm"><thead><tr><th>الفصل</th>${M.subjects.map(s => `<th>${esc(s)}</th>`).join('')}<th>المعدل</th></tr></thead><tbody>
          ${ord.map(c => `<tr><th>${esc(c)}</th>${M.subjects.map(s => { const v = cm(c, s); return `<td class="c" data-cc="${esc(c)}" data-cs="${esc(s)}" style="background:${heatMean(v)}">${fmt(v)}</td>`; }).join('')}<td><b>${fmt(cAvg(c))}</b></td></tr>`).join('')}</tbody></table></div>
          <p class="small muted">الألوان حسب التقدير: الأخضر ممتاز، والأحمر دون المستوى. اضغط خلية لعرض طلاب الفصل في المادة.</p></div>`;
        $$('[data-bk]', O).forEach(g => g.onclick = () => drillStu('طلاب ' + g.dataset.bk, M.studs.filter(p => (p.cls || '—') === g.dataset.bk)));
        $$('[data-cc]', O).forEach(c => c.onclick = () => drillStu(`${c.dataset.cc} — ${c.dataset.cs}`, M.studs.filter(p => (p.cls || '—') === c.dataset.cc && p.subj[c.dataset.cs]).sort((a, b) => b.subj[c.dataset.cs].tot - a.subj[c.dataset.cs].tot), c.dataset.cs));
      }
      if (st.tab === 'stu') {
        O.innerHTML = `<div class="row" style="gap:8px;margin-bottom:8px"><input class="in" id="nrQ" placeholder="بحث باسم الطالب" style="max-width:260px" aria-label="بحث باسم الطالب"><select class="in" id="nrF" style="max-width:220px" aria-label="تصفية"><option value="">كل الطلاب</option><option value="weak">دون المستوى في مادة أو أكثر</option><option value="top">المتفوقون (٩٠+)</option></select>
          <button class="btn ghost sm" id="nrBulk">${A.I.print || ''} طباعة تقارير الطلاب المعروضين</button></div>
          <div class="scroll"><table class="tbl"><thead><tr><th>الترتيب</th><th>الطالب</th><th>الفصل</th>${M.subjects.map(s => `<th>${esc(s)}</th>`).join('')}<th>المعدل</th><th>التقدير</th></tr></thead><tbody id="nrSt"></tbody></table></div>`;
        const list = () => { const q = nk($('#nrQ', O).value), f = $('#nrF', O).value; return M.studs.filter(p => (!q || nk(p.name).includes(q)) && (!f || (f === 'weak' ? p.weak.length : p.mean >= 90))); };
        const draw = () => { $('#nrSt', O).innerHTML = list().map(p => `<tr class="click" data-st="${esc(p.key)}"><td>${AR(p.rank)}</td><td><b>${esc(p.name)}</b>${p.sid ? '' : ' <span class="pill" title="غير مطابق مع قاعدة الطلاب">غير مطابق</span>'}</td><td>${esc(p.cls || '—')}</td>${M.subjects.map(s => { const v = p.subj[s] && p.subj[s].tot; return `<td style="background:${heatMean(v)}">${fmt(v)}</td>`; }).join('')}<td><b>${fmt(p.mean)}</b></td><td>${p.mean != null ? lvOf(p.mean)[0] : '—'}</td></tr>`).join('') || `<tr><td colspan="${M.subjects.length + 5}">${A.emptyBox('لا نتائج')}</td></tr>`;
          $$('[data-st]', O).forEach(r => r.onclick = () => stuReport(M.studs.find(p => p.key === r.dataset.st))); };
        $('#nrQ', O).oninput = draw; $('#nrF', O).onchange = draw; draw();
        $('#nrBulk', O).onclick = () => { const l = list(); if (!l.length) return; A.printDoc('تقارير الطلاب — درجات نور', CTX, l.map((p, i) => `<div style="${i ? 'break-before:page' : ''}">${stuHtml(p)}</div>`).join('')); };
      }
      if (st.tab === 'cmp') cmpTab(O);
    }
    function scatterOf(a, b) { const pr = MODEL.studs.filter(p => p.subj[a] && p.subj[b]); return scatter(pr.map(p => [p.subj[a].tot, p.subj[b].tot, p.name]), [], a, b) + `<p class="small muted">النقاط الحمراء: طالب دون المستوى في إحدى المادتين.</p>`; }
    function subjDetail(s) {
      const M = MODEL, x = subjStats(M.studs, s), list = M.studs.filter(p => p.subj[s]).sort((a, b) => b.subj[s].tot - a.subj[s].tot);
      const cl = [...new Set(list.map(p => p.cls || '—'))]; const cm = c => mean(list.filter(p => (p.cls || '—') === c).map(p => p.subj[s].tot));
      const comps = [...(M.comps[s] || [])]; const compM = comps.map(c => { const v = list.map(p => p.subj[s].comps[c]).filter(Boolean).map(o => o.mx ? o.sc / o.mx * 100 : o.sc); return { c, v: mean(v) }; });
      const m = A.modal(`<h3>تحليل مادة ${esc(s)}</h3><p class="sub">${esc(CTX)} · ${AR(x.n)} طالب</p>
        <div class="grid g4" style="margin:8px 0"><div class="kpi navy"><div class="k">المتوسط</div><div class="v">${fmt(x.mean)}<small>٪</small></div></div><div class="kpi"><div class="k">نسبة النجاح</div><div class="v">${fmt(x.pass)}<small>٪</small></div></div><div class="kpi"><div class="k">الأعلى / الأدنى</div><div class="v" style="font-size:20px">${fmt(x.max)} / ${fmt(x.min)}</div></div><div class="kpi"><div class="k">الانحراف المعياري</div><div class="v">${fmt(x.sd)}</div></div></div>
        <div class="nr-g2"><div class="nr-card"><h3>توزيع الدرجات</h3>${histo(x.v)}</div><div class="nr-card"><h3>المقارنة بين الفصول</h3>${barChart(cl.map(c => ({ label: c, value: cm(c), color: lvOf(cm(c))[2] })), { ref: 50 })}</div></div>
        ${compM.length ? `<div class="nr-card" style="margin-top:12px"><h3>متوسط المكوّنات (نسبة من الدرجة العظمى)</h3>${barChart(compM.map(o => ({ label: o.c, value: o.v, color: '#005499' })), { ref: 50 })}</div>` : ''}
        <div class="nr-g2" style="margin-top:12px"><div class="nr-card"><h3>الأعلى</h3>${list.slice(0, 10).map(p => `<div class="row" style="justify-content:space-between"><span>${esc(p.name)} <span class="small muted">${esc(p.cls || '')}</span></span><b>${fmt(p.subj[s].tot)}</b></div>`).join('')}</div>
        <div class="nr-card"><h3>دون المستوى (${AR(list.filter(p => p.subj[s].tot < 50).length)})</h3>${list.filter(p => p.subj[s].tot < 50).map(p => `<div class="row" style="justify-content:space-between"><span>${esc(p.name)} <span class="small muted">${esc(p.cls || '')}</span></span><b style="color:var(--bad)">${fmt(p.subj[s].tot)}</b></div>`).join('') || '<p class="small muted">لا يوجد</p>'}</div></div>
        <div class="row" style="margin-top:12px;gap:8px"><button class="btn ghost sm" id="sdAll">كل الطلاب</button><button class="btn ghost sm" id="sdP">${A.I.print || ''} طباعة</button></div>`, { cls: 'wide' });
      $('#sdAll', m.el).onclick = () => drillStu('طلاب ' + s, list, s);
      $('#sdP', m.el).onclick = () => A.printDoc('تحليل مادة ' + s, CTX, m.el.querySelector('.modal').innerHTML.replace(/<button[\s\S]*?<\/button>/g, ''), true);
    }
    function stuHtml(p) {
      const M = MODEL; const peers = M.studs.filter(q => (q.cls || '') === (p.cls || ''));
      const rows = M.subjects.filter(s => p.subj[s]).map(s => { const v = p.subj[s].tot, cm = mean(peers.map(q => q.subj[s] && q.subj[s].tot).filter(x => x != null)); return { s, v, cm, d: v - cm, comps: p.subj[s].comps }; });
      const strong = rows.filter(r => r.v >= 90 || r.d >= 8).map(r => r.s), weakR = rows.filter(r => r.v < 65 || r.d <= -8).map(r => r.s);
      return `<h3>${esc(p.name)}</h3><p class="small muted">${esc(p.cls || '')}${p.grade ? ' · ' + esc(p.grade) : ''} · الترتيب ${AR(p.rank)} من ${AR(M.studs.length)}</p>
        <div class="nr-ks"><span class="k">المعدل<b>${fmt(p.mean)}٪</b></span><span class="k">التقدير<b>${p.mean != null ? lvOf(p.mean)[0] : '—'}</b></span><span class="k">مواد دون المستوى<b>${AR(p.weak.length)}</b></span></div>
        ${barChart(rows.map(r => ({ label: r.s, value: r.v, color: lvOf(r.v)[2] })), { ref: 50, title: 'درجات الطالب' })}
        <table class="tbl"><thead><tr><th>المادة</th><th>الدرجة ٪</th><th>التقدير</th><th>متوسط الفصل</th><th>الفرق</th><th>المكوّنات</th></tr></thead><tbody>${rows.map(r => `<tr><td><b>${esc(r.s)}</b></td><td>${fmt(r.v)}</td><td>${lvOf(r.v)[0]}</td><td>${fmt(r.cm)}</td><td style="color:${r.d >= 0 ? '#2E8B57' : '#D2463F'};font-weight:800">${r.d >= 0 ? '+' : '−'}${fmt(Math.abs(r.d))}</td><td class="small">${Object.entries(r.comps).map(([c, o]) => `${esc(c)}: ${fmt(o.sc)}/${fmt(o.mx)}`).join(' · ') || '—'}</td></tr>`).join('')}</tbody></table>
        <p><b>نقاط القوة:</b> ${strong.length ? esc(strong.join('، ')) : 'متقاربة مع متوسط الفصل'}<br><b>تحتاج دعماً:</b> ${weakR.length ? esc(weakR.join('، ')) : 'لا توجد مواد تحتاج دعماً واضحاً'}</p>`;
    }
    function stuReport(p) { if (!p) return; const m = A.modal(`<div class="nr-stu">${stuHtml(p)}</div><div class="row" style="margin-top:10px"><button class="btn ghost sm" id="srP">${A.I.print || ''} طباعة التقرير</button></div>`, { cls: 'wide' }); $('#srP', m.el).onclick = () => A.printDoc('تقرير الطالب — درجات نور', CTX, stuHtml(p)); }
    async function cmpTab(O) {
      O.innerHTML = '<div class="spinner"></div>';
      const ks = pers.slice().reverse(); // الأقدم أولاً
      if (ks.length < 2) { O.innerHTML = `<div class="nr-ins"><div>المقارنة تحتاج استيراد فترتين أو أكثر (مثل الفترة الأولى ونهاية الفصل، أو فصلين دراسيين).</div></div>`; return; }
      const models = []; for (const k of ks) { const ims = imps.filter(i => pk(i) === k); const md = buildModel(ims, await scoresOf(ims.map(i => i.id))); md.studs = md.studs.filter(p => (!st.grade || (p.grade || gradeOfCls(p.class_id, CL)) === st.grade) && (!st.cls || p.cls === st.cls)); models.push({ k, md }); }
      const subs = [...new Set(models.flatMap(x => x.md.subjects))].filter(s => models.filter(x => x.md.studs.some(p => p.subj[s])).length >= 2);
      const sm = (md, s) => mean(md.studs.map(p => p.subj[s] && p.subj[s].tot).filter(v => v != null));
      const a = models[models.length - 2], b = models[models.length - 1];
      const prog = b.md.studs.map(p => { const q = a.md.studs.find(x => x.key === p.key); return q && q.mean != null && p.mean != null ? { p, d: p.mean - q.mean, was: q.mean } : null; }).filter(Boolean).sort((x, y) => y.d - x.d);
      O.innerHTML = `<div class="nr-card"><h3>متوسط المواد عبر الفترات</h3><div class="scroll"><table class="tbl nr-hm"><thead><tr><th>المادة</th>${models.map(x => `<th>${esc(pLabel(x.k))}</th>`).join('')}<th>التغيّر</th></tr></thead><tbody>
        ${subs.map(s => { const v = models.map(x => sm(x.md, s)); const d = v[v.length - 1] != null && v[v.length - 2] != null ? v[v.length - 1] - v[v.length - 2] : null; return `<tr><th>${esc(s)}</th>${v.map(x => `<td style="background:${heatMean(x)}">${fmt(x)}</td>`).join('')}<td style="font-weight:800;color:${d == null ? '#8796AE' : d >= 0 ? '#2E8B57' : '#D2463F'}">${d == null ? '—' : (d >= 0 ? '▲ +' : '▼ −') + fmt(Math.abs(d))}</td></tr>`; }).join('') || `<tr><td colspan="9">${A.emptyBox('لا مواد مشتركة بين الفترات')}</td></tr>`}</tbody></table></div></div>
        <div class="nr-g2" style="margin-top:14px"><div class="nr-card"><h3>الأكثر تحسّناً</h3>${prog.slice(0, 10).filter(x => x.d > 0).map(x => `<div class="row" style="justify-content:space-between"><span>${esc(x.p.name)} <span class="small muted">${esc(x.p.cls || '')}</span></span><b style="color:#2E8B57">▲ ${fmt(x.d)}</b></div>`).join('') || '<p class="small muted">—</p>'}</div>
        <div class="nr-card"><h3>الأكثر تراجعاً</h3>${prog.slice().reverse().slice(0, 10).filter(x => x.d < 0).map(x => `<div class="row" style="justify-content:space-between"><span>${esc(x.p.name)} <span class="small muted">${esc(x.p.cls || '')}</span></span><b style="color:#D2463F">▼ ${fmt(-x.d)}</b></div>`).join('') || '<p class="small muted">—</p>'}</div></div>
        <p class="small muted">المقارنة بين «${esc(pLabel(a.k))}» و«${esc(pLabel(b.k))}» للطلاب الموجودين في الفترتين (${AR(prog.length)} طالب).</p>`;
    }
    load();
  };

  function topPair(M) { let best = null; M.subjects.forEach((a, i) => M.subjects.slice(i + 1).forEach(b => { const pr = M.studs.filter(p => p.subj[a] && p.subj[b]); const r = corr(pr.map(p => p.subj[a].tot), pr.map(p => p.subj[b].tot)); if (r != null && (!best || r > best.r)) best = { a, b, r }; })); return best; }

  function printAll(M, ctx) {
    const ss = M.subjects.map(s => ({ s, ...subjStats(M.studs, s) })).sort((a, b) => b.mean - a.mean), means = M.studs.map(p => p.mean).filter(v => v != null);
    const html = `<span class="k">الطلاب<b>${AR(M.studs.length)}</b></span><span class="k">المواد<b>${AR(M.subjects.length)}</b></span><span class="k">المعدل العام<b>${fmt(mean(means))}٪</b></span><span class="k">المتفوقون<b>${AR(M.studs.filter(p => p.mean >= 90).length)}</b></span><span class="k">دون المستوى في مادة<b>${AR(M.studs.filter(p => p.weak.length).length)}</b></span>
      <h3>متوسط المواد</h3>${barChart(ss.map(x => ({ label: x.s, value: x.mean, color: lvOf(x.mean)[2] })), { ref: 50 })}
      <h3>إحصاءات المواد</h3><table><thead><tr><th>المادة</th><th>الطلاب</th><th>المتوسط</th><th>الوسيط</th><th>الانحراف</th><th>الأعلى</th><th>الأدنى</th><th>النجاح ٪</th>${LV.map(l => `<th>${l[0]}</th>`).join('')}</tr></thead><tbody>${ss.map(x => `<tr><td><b>${esc(x.s)}</b></td><td>${AR(x.n)}</td><td>${fmt(x.mean)}</td><td>${fmt(x.med)}</td><td>${fmt(x.sd)}</td><td>${fmt(x.max)}</td><td>${fmt(x.min)}</td><td>${fmt(x.pass)}</td>${x.lv.map(n => `<td>${AR(n)}</td>`).join('')}</tr>`).join('')}</tbody></table>
      <h3>توزيع التقديرات</h3>${stackRows(ss.map(x => ({ label: x.s, counts: x.lv })))}
      <h3 style="break-before:page">ترتيب الطلاب</h3><table><thead><tr><th>الترتيب</th><th>الطالب</th><th>الفصل</th>${M.subjects.map(s => `<th>${esc(s)}</th>`).join('')}<th>المعدل</th></tr></thead><tbody>${M.studs.map(p => `<tr><td>${AR(p.rank)}</td><td style="text-align:start">${esc(p.name)}</td><td>${esc(p.cls || '')}</td>${M.subjects.map(s => `<td>${fmt(p.subj[s] && p.subj[s].tot)}</td>`).join('')}<td><b>${fmt(p.mean)}</b></td></tr>`).join('')}</tbody></table>`;
    A.printDoc('تحليل درجات نور', ctx, `<style>${css}</style>` + html, M.subjects.length > 6);
  }
  function excel(M, ctx) {
    const ss = M.subjects.map(s => ({ s, ...subjStats(M.studs, s) }));
    const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
    const add = (n, rows) => { const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ '': 'لا بيانات' }]); ws['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws, n); };
    add('الطلاب', M.studs.map(p => Object.assign({ الترتيب: p.rank, الطالب: p.name, الفصل: p.cls || '' }, ...M.subjects.map(s => ({ [s]: p.subj[s] ? r1(p.subj[s].tot) : '' })), { المعدل: r1(p.mean), التقدير: p.mean != null ? lvOf(p.mean)[0] : '', 'مواد دون المستوى': p.weak.join('، ') })));
    add('المواد', ss.map(x => Object.assign({ المادة: x.s, الطلاب: x.n, المتوسط: r1(x.mean), الوسيط: r1(x.med), 'الانحراف المعياري': r1(x.sd), الأعلى: r1(x.max), الأدنى: r1(x.min), 'نسبة النجاح %': r1(x.pass) }, ...LV.map((l, i) => ({ [l[0]]: x.lv[i] })))));
    add('الترابط', M.subjects.map(a => Object.assign({ المادة: a }, ...M.subjects.map(b => { if (a === b) return { [b]: 1 }; const pr = M.studs.filter(p => p.subj[a] && p.subj[b]); const r = corr(pr.map(p => p.subj[a].tot), pr.map(p => p.subj[b].tot)); return { [b]: r == null ? '' : Math.round(r * 100) / 100 }; }))));
    XLSX.writeFile(wb, `تحليل درجات نور - ${ctx.replace(/[\\/:*?"<>|]/g, '-')}.xlsx`);
  }
  function manage(imps, after) {
    const m = A.modal(`<h3>إدارة استيرادات نور</h3><p class="sub">حذف الاستيراد يحذف درجاته فقط، ولا يمسّ الطلاب أو أي بيانات أخرى.</p>
      <div class="nr-imps">${imps.map(i => `<div class="nr-imp-r"><b>${esc(i.title || i.file_name)}</b><span class="small muted">${esc([i.year, i.term, i.period].filter(Boolean).join(' · '))}</span><span class="small muted">${esc(i.file_name || '')}</span><span class="small faint">${arDate(i.created_at)}</span>
        ${S.me.is_owner || i.created_by === S.me.id ? `<button class="btn ghost sm" data-del="${i.id}" style="margin-inline-start:auto">حذف</button>` : ''}</div>`).join('')}</div>`, { cls: 'wide' });
    $$('[data-del]', m.el).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذا الاستيراد ودرجاته؟', 'حذف', true))) return; A.run(b, async () => { await api.del('noor_imports', b.dataset.del); b.closest('.nr-imp-r').remove(); A.toast('حُذف', 'ok'); m.close(); after && after(); }); });
  }

  // للاختبار
  A._noor = { parseSheet, buildModel, corr };
})();
