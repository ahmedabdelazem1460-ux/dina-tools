/* منصة دينا — استيراد الجداول الجاهزة (Excel / CSV / PDF من aSc Timetables)
   PDF: صفحة لكل فصل (المادة + المعلم) أو صفحة لكل معلم (المادة + رمز الفصل مثل «أ-٤»)، ويمكن رفع الملفين معاً فيكمّل أحدهما الآخر.
   خطوة «مطابقة الأسماء» تربط مسميات الملف بمواد المنصة ومعلميها وفصولها، وتُحفظ المطابقة للمرات القادمة.
   يُطبَّق على مسودة جدول فقط — ولا يمس الجدول المعتمد ولا خطط المعلمين حتى تعتمد المسودة. */
(function () {
  const A = window.APP, { S, api, $, $$, esc, AR, DAYS, PER, I } = A;
  const N = s => A.norm(String(s ?? '').normalize('NFKC').replace(/[‎‏‪-‮]/g, ''));
  const K = s => A.normKey(N(s)).replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
  const DAYW = ['احد', 'اثنين', 'ثلاثاء', 'اربعاء', 'خميس', 'جمعه', 'سبت'];
  const dayOf = s => { const k = K(s).replace(/ /g, ''); return DAYW.findIndex(w => k === w || k === 'ال' + w || k.endsWith(w) && k.length <= w.length + 2); };
  const GW = ['اول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سادس'];
  const STG = { 'ا': 'ابتدا', 'م': 'متوسط', 'ث': 'ثانوي' };
  const CODE = /^([أاإمث])\s*[-–]\s*(\d{1,2})\s*([أ-ي])?$/;

  // ---------- قراءة PDF ----------
  let pdfP = null;
  const loadPdf = () => pdfP || (pdfP = new Promise((ok, no) => { if (window.pdfjsLib) return ok(window.pdfjsLib); const s = document.createElement('script'); s.src = 'vendor/pdf.min.js'; s.onload = () => { pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdf.worker.min.js'; ok(pdfjsLib); }; s.onerror = () => { pdfP = null; no(new Error('تعذّر تحميل قارئ PDF')); }; document.head.appendChild(s); }));
  // يجمع العناصر المتجاورة على سطر واحد (من اليمين لليسار)
  const lines = its => { const out = []; its.slice().sort((a, b) => a.y - b.y || b.x - a.x).forEach(it => { const l = out.find(o => Math.abs(o.y - it.y) <= 4); if (l) l.its.push(it); else out.push({ y: it.y, its: [it] }); }); return out.map(l => { l.its.sort((a, b) => b.x - a.x); return { y: l.y, x0: Math.min(...l.its.map(i => i.x)), x1: Math.max(...l.its.map(i => i.x + i.w)), t: N(l.its.map(i => i.s).join(' ')).replace(/\s*-\s*/g, '-') }; }); };
  function parsePage(raw, H) {
    const its = raw.map(i => ({ x: i.transform[4], y: H - i.transform[5], w: i.width, s: N(i.str) })).filter(i => i.s);
    const junk = i => /aSc|Timetables|Service Manual|Team AoRE|مدارس دينا/i.test(i.s);
    const days = its.filter(i => dayOf(i.s) >= 0).sort((a, b) => a.y - b.y);
    if (days.length < 2) return null;
    const dayX = Math.min(...days.map(d => d.x));
    const top = Math.min(...days.map(d => d.y));
    const hdr = its.filter(i => /^\d{1,2}$/.test(i.s) && i.y < top - 20 && i.x + i.w < dayX).sort((a, b) => b.x - a.x);
    if (hdr.length < 2) return null;
    const hy = Math.max(...hdr.map(h => h.y));
    const cols = hdr.map(h => ({ p: +h.s - 1, c: h.x + h.w / 2 })), colW = Math.abs(cols[0].c - cols[1].c) || 120;
    const rows = days.map((d, i) => ({ d: dayOf(d.s), y0: d.y - 18, y1: i < days.length - 1 ? days[i + 1].y - 18 : d.y + (days[1].y - days[0].y) - 18 }));
    const title = lines(its.filter(i => i.y < hy - 4 && !junk(i))).sort((a, b) => a.y - b.y)[0];
    const cells = new Map();
    its.filter(i => !junk(i) && i.y > hy + 6 && i.x + i.w < dayX - 4).forEach(i => {
      const r = rows.find(r => i.y >= r.y0 && i.y < r.y1); if (!r) return;
      const cx = i.x + i.w / 2; const col = cols.reduce((a, b) => Math.abs(b.c - cx) < Math.abs(a.c - cx) ? b : a);
      // حصة مزدوجة: عنصر يمتد على عمودين
      const span = cols.filter(c => Math.abs(c.c - cx) < colW * 0.55 || (i.w > colW * 1.2 && c.c > i.x && c.c < i.x + i.w));
      (span.length ? span : [col]).forEach(c => { const k = r.d + '|' + c.p; (cells.get(k) || cells.set(k, []).get(k)).push(i); });
    });
    const out = [];
    for (const [k, l] of cells) { const [d, p] = k.split('|').map(Number); const ls = lines(l).sort((a, b) => a.y - b.y); if (!ls.length) continue; out.push(ls.length > 1 ? { day: d, period: p, a: ls.slice(0, -1).map(x => x.t).join(' '), b: ls[ls.length - 1].t } : { day: d, period: p, a: ls[0].t, b: '' }); }
    const codes = out.filter(o => CODE.test(o.b)).length;
    const kind = out.length && codes >= out.length * 0.6 ? 'teacher' : 'class';
    return { title: title ? title.t : '', kind, cells: out, periods: Math.max(...cols.map(c => c.p)) + 1 };
  }
  async function parsePdf(file) {
    const lib = await loadPdf(); const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const items = [], pages = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const pg = await doc.getPage(n), vp = pg.getViewport({ scale: 1 }), tc = await pg.getTextContent();
      const r = parsePage(tc.items, vp.height); if (!r || !r.title) continue; pages.push({ n, title: r.title, kind: r.kind, cells: r.cells.length });
      r.cells.forEach(c => items.push(r.kind === 'class' ? { cls: r.title, day: c.day, period: c.period, subject: c.a, teacher: c.b, src: 'class', file: file.name } : { cls: c.b, code: true, day: c.day, period: c.period, subject: c.a, teacher: r.title, src: 'teacher', file: file.name }));
    }
    if (!pages.length) throw new Error(`لم أتعرف على جدول في «${file.name}». هذا القارئ مخصص لملفات PDF المصدّرة من aSc Timetables (صفحة لكل فصل أو لكل معلم).`);
    return { items, pages };
  }
  A.ttParsePdf = parsePdf;

  // ---------- المطابقة الذكية ----------
  const ALIAS = { 'لغتي': 'اللغة العربية', 'لغتي الجميله': 'اللغة العربية', 'عربي': 'اللغة العربية', 'e': 'اللغة الإنجليزية', 'en': 'اللغة الإنجليزية', 'eng': 'اللغة الإنجليزية', 'english': 'اللغة الإنجليزية', 'انجليزي': 'اللغة الإنجليزية', 'اسلاميه': 'الدراسات الإسلامية والقرآن', 'دين': 'الدراسات الإسلامية والقرآن', 'قران': 'الدراسات الإسلامية والقرآن', 'رقميه': 'المهارات الرقمية', 'حاسب': 'الحاسب الآلي', 'حياتيه': 'المهارات الحياتية', 'بدنيه': 'التربية البدنية', 'رياضه': 'التربية البدنية', 'فنيه': 'التربية الفنية', 'اجتماعيات': 'الاجتماعيات', 'رياضيات': 'الرياضيات', 'علوم': 'العلوم', 'تمكين و اتقان': 'تمكين وإتقان' };
  const toks = s => K(s).split(' ').filter(t => t && t !== 'و');
  const lev1 = (x, y) => { if (Math.abs(x.length - y.length) > 1) return false; let i = 0, j = 0, e = 0; while (i < x.length && j < y.length) { if (x[i] === y[j]) { i++; j++; continue; } if (++e > 1) return false; if (x.length > y.length) i++; else if (y.length > x.length) j++; else { i++; j++; } } return e + (x.length - i) + (y.length - j) <= 1; };
  const tokEq = (t, u) => { if (t === u || 'و' + t === u || t === 'و' + u || 'وال' + t === u || t === 'وال' + u) return true; if (t.length > 2 && u.length > 2 && (u.startsWith(t) || t.startsWith(u))) return true; return t.length >= 3 && u.length >= 3 && lev1(t, u); };
  const score = (src, cand) => { const a = toks(src), b = toks(cand); if (!a.length || !b.length) return 0; if (a.join(' ') === b.join(' ')) return 100; const hit = a.filter(t => b.some(u => tokEq(t, u))).length; return hit === a.length ? 60 + 30 * hit / b.length : hit ? 30 * hit / a.length : 0; };
  const best = (src, list, name) => { let top = null, sc = 0, tie = false; list.forEach(x => { const v = score(src, name(x)); if (v > sc) { top = x; sc = v; tie = false; } else if (v === sc && v > 0) tie = true; }); return sc >= 60 && !tie ? top : null; };
  function autoSub(src) { const k = K(src); const al = ALIAS[k] || ALIAS[k.replace(/ /g, '')]; if (al) { const s = S.subjects.find(x => K(x.name) === K(al)); if (s) return s.id; } const s = best(src, S.subjects, x => x.name); return s ? s.id : ''; }
  function autoT(src) { const t = best(src, S.staff.filter(x => x.active !== false), x => x.full_name); return t ? t.id : ''; }
  function autoC(src, code) {
    const cs = S.allClasses && S.allClasses.length ? S.allClasses : S.classes;
    if (code) { const m = N(src).match(CODE); if (!m) return ''; const st = STG[m[1].replace(/[أإ]/, 'ا')], g = GW[+m[2] - 1]; if (!st || !g) return ''; let l = cs.filter(c => { const k = K(c.name) + ' ' + K(c.stage || ''); return k.includes(st) && toks(c.name)[0] === g; }); if (m[3]) l = l.filter(c => toks(c.name).includes(K(m[3]))); return l.length === 1 ? l[0].id : ''; }
    const k = K(src); const ex = cs.find(c => K(c.name) === k); if (ex) return ex.id;
    const c = best(src, cs, x => x.name); return c ? c.id : '';
  }
  const MK = () => 'tt_map_' + S.school.id;
  const loadMap = () => { try { return JSON.parse(localStorage.getItem(MK()) || '{}'); } catch (_) { return {}; } };
  const saveMap = m => { try { localStorage.setItem(MK(), JSON.stringify(m)); } catch (_) {} };

  // ---------- نافذة الاستيراد ----------
  A.ttImport = function (draft, sl, done) {
    const m = A.modal(`<h3>استيراد جدول جاهز إلى المسودة «${esc(draft.label || '')}»</h3>
      <p class="sub"><b>PDF من aSc Timetables</b> (صفحة لكل فصل أو لكل معلم — يمكنك رفع الملفين معاً)، أو <b>Excel/CSV</b> بإحدى الصيغ: الفصل | اليوم | الحصة | المادة | المعلم، أو ورقة لكل فصل.</p>
      <label class="drop" id="dz"><input type="file" id="ff" accept=".pdf,.xlsx,.xls,.csv" multiple hidden><div style="font-weight:800">${I.up.replace('<svg', '<svg style="width:28px;height:28px"')}<br>اختر الملفات أو اسحبها هنا</div><span class="small muted">PDF · Excel · CSV</span></label>
      <div id="ires" style="margin-top:14px"></div>`, { cls: 'wide' });
    const box = m.el.querySelector('#ires');
    const handle = async files => {
      box.innerHTML = '<div class="spinner"></div><p class="small muted" style="text-align:center">يقرأ الجداول…</p>';
      let items = [], pages = [], bad = [];
      for (const f of files) {
        if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') { const r = await parsePdf(f); items = items.concat(r.items); pages = pages.concat(r.pages.map(p => ({ ...p, file: f.name }))); }
        else { const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); const r = window.TT_parse(wb); items = items.concat(r.items.map(x => ({ ...x, src: 'class', file: f.name }))); bad = bad.concat(r.badSheets); }
      }
      const sec = A.section(); items = items.filter(x => x.day >= 0 && x.period >= 0);
      const over = items.filter(x => x.day >= sec.days || x.period >= sec.periods).length; items = items.filter(x => x.day < sec.days && x.period < sec.periods);
      if (!items.length) throw new Error('لم تُقرأ أي حصة من الملف');
      mapStep(files, items, pages, bad, over);
    };
    function mapStep(files, items, pages, bad, over) {
      const mp = loadMap(); mp.c = mp.c || {}; mp.s = mp.s || {}; mp.t = mp.t || {};
      const uniq = (f, g) => [...new Set(items.map(f).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar')).map(v => [v, g(v)]);
      const U = {
        c: uniq(x => x.cls, v => { const code = items.some(i => i.cls === v && i.code); return mp.c[v] && (S.allClasses || S.classes).some(c => c.id === mp.c[v]) ? mp.c[v] : autoC(v, code); }),
        s: uniq(x => x.subject, v => mp.s[v] && S.subjects.some(s => s.id === mp.s[v]) ? mp.s[v] : autoSub(v)),
        t: uniq(x => x.teacher, v => mp.t[v] && S.staff.some(s => s.id === mp.t[v]) ? mp.t[v] : autoT(v)),
      };
      const cs = (S.allClasses && S.allClasses.length ? S.allClasses : S.classes);
      const opts = { c: [['', '— تجاهل —']].concat(cs.map(c => [c.id, c.name])), s: [['', '— بدون مادة —'], ['+', '＋ إضافتها مادة جديدة']].concat(S.subjects.map(s => [s.id, s.name]).sort((a, b) => a[1].localeCompare(b[1], 'ar'))), t: [['', '— بدون معلم —']].concat(S.staff.filter(x => x.active !== false).map(s => [s.id, s.full_name]).sort((a, b) => a[1].localeCompare(b[1], 'ar'))) };
      const ttl = { c: 'الفصول', s: 'المواد', t: 'المعلمون' };
      const sel = (g, v, cur) => `<select class="in" data-g="${g}" data-v="${esc(v)}" aria-label="${esc(v)}">${opts[g].map(([id, n]) => `<option value="${id}" ${id === cur ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`;
      const miss = g => U[g].filter(([, id]) => !id).length;
      const kinds = [...new Set(pages.map(p => p.kind))];
      box.innerHTML = `<div class="notice ok">قُرئت <b>${AR(items.length)}</b> حصة من ${AR(files.length)} ملف${pages.length ? ` — ${AR(pages.length)} صفحة (${kinds.map(k => k === 'class' ? 'جداول فصول' : 'جداول معلمين').join(' + ')})` : ''}.</div>
        ${over ? `<div class="notice warn">${AR(over)} حصة خارج أيام/حصص القسم الحالية (${AR(sec.days)} أيام × ${AR(sec.periods)} حصص) ولن تُستورد — عدّلها من «اليوم الدراسي والجدول الزمني» إن لزم.</div>` : ''}
        ${bad.length ? `<div class="notice warn">أوراق لم يُتعرّف على فصلها: ${bad.map(esc).join('، ')}</div>` : ''}
        <h4 style="margin:12px 0 4px">مطابقة الأسماء</h4><p class="small muted" style="margin:0 0 8px">طابقتُ ما أمكن تلقائياً. راجع المظلّل بالأصفر واختر المقابل الصحيح — تُحفظ اختياراتك للمرة القادمة.</p>
        ${['c', 's', 't'].map(g => U[g].length ? `<details class="tt-map" ${miss(g) ? 'open' : ''}><summary><b>${ttl[g]}</b> <span class="small muted">${AR(U[g].length)} اسم${miss(g) ? ` · <span class="tx-warn">${AR(miss(g))} يحتاج مطابقة</span>` : ' · كلها مطابقة ✓'}</span></summary>
          <div class="tt-grid">${U[g].map(([v, id]) => `<label class="${id ? '' : 'need'}"><span class="tt-src" dir="auto">${esc(v)}</span>${sel(g, v, id)}</label>`).join('')}</div></details>` : '').join('')}
        <div id="ttSum" style="margin-top:12px"></div>
        <label class="chk"><input type="checkbox" id="clr" ${pages.length ? 'checked' : ''}> إفراغ حصص الفصول المستوردة التي لا يذكرها الملف (لاستبدال جدولها كاملاً)</label>
        <label class="chk"><input type="checkbox" id="keepT" checked> إبقاء المعلم الحالي إذا لم يحدد الملف معلماً للحصة</label>
        <div class="acts"><button class="btn" id="igo">تطبيق على المسودة</button></div>`;
      const cur = () => { const r = { c: {}, s: {}, t: {} }; $$('[data-g]', box).forEach(s => { r[s.dataset.g][s.dataset.v] = s.value; }); return r; };
      const build = M => {
        const by = new Map(), clash = [];
        items.forEach(it => {
          const cid = M.c[it.cls]; if (!cid) return; const k = cid + '|' + it.day + '|' + it.period;
          const row = { class_id: cid, day: it.day, period: it.period, sub: it.subject, subject_id: M.s[it.subject] && M.s[it.subject] !== '+' ? M.s[it.subject] : null, teacher_id: M.t[it.teacher] || null, src: it.src };
          const old = by.get(k);
          if (!old) by.set(k, row);
          else if (old.src === 'teacher' && row.src === 'class') { by.set(k, { ...row, teacher_id: row.teacher_id || old.teacher_id }); }
          else { if (!old.teacher_id && row.teacher_id) old.teacher_id = row.teacher_id; if (!old.subject_id && row.subject_id) old.subject_id = row.subject_id; if (old.sub && row.sub && K(old.sub) !== K(row.sub) && old.src === row.src) clash.push(k); }
        });
        const rows = [...by.values()], tb = new Map();
        rows.forEach(r => { if (!r.teacher_id) return; const k = r.teacher_id + '|' + r.day + '|' + r.period; tb.set(k, (tb.get(k) || 0) + 1); });
        return { rows, tClash: [...tb.values()].filter(n => n > 1).length, cellClash: clash.length };
      };
      const sum = () => {
        const M = cur(), r = build(M), sb = $('#ttSum', box), nc = new Set(r.rows.map(x => x.class_id)).size;
        const noT = r.rows.filter(x => !x.teacher_id && x.sub).length, noS = r.rows.filter(x => !x.subject_id && x.sub && M.s[x.sub] !== '+').length;
        sb.innerHTML = `<div class="tt-kpis"><div><b>${AR(r.rows.length)}</b><span>حصة ستُطبَّق</span></div><div><b>${AR(nc)}</b><span>فصل</span></div><div class="${noS ? 'w' : ''}"><b>${AR(noS)}</b><span>بلا مادة</span></div><div class="${noT ? 'w' : ''}"><b>${AR(noT)}</b><span>بلا معلم</span></div><div class="${r.tClash ? 'w' : ''}"><b>${AR(r.tClash)}</b><span>تعارض معلم</span></div></div>`;
        $$('[data-g]', box).forEach(s => s.closest('label').classList.toggle('need', !s.value));
        return r;
      };
      $$('[data-g]', box).forEach(s => s.onchange = sum); sum();
      $('#igo', box).onclick = e => A.run(e.currentTarget, async () => {
        const M = cur(); const keep = mp; ['c', 's', 't'].forEach(g => Object.entries(M[g]).forEach(([k, v]) => { if (v && v !== '+') keep[g][k] = v; else delete keep[g][k]; }));
        const add = Object.entries(M.s).filter(([, v]) => v === '+').map(([k]) => k);
        if (add.length) { for (const n of add) { try { await api.addSubject({ school_id: S.school.id, name: n }); } catch (_) {} } S.subjects = await api.reloadSubjects(); add.forEach(n => { const s = S.subjects.find(x => K(x.name) === K(n)); if (s) { M.s[n] = s.id; keep.s[n] = s.id; } }); }
        saveMap(keep);
        const { rows } = build(M); if (!rows.length) throw new Error('لا توجد حصص مطابقة لفصول هذا القسم');
        const kT = $('#keepT', box).checked, clr = $('#clr', box).checked, sec = A.section();
        const outR = rows.map(r => { const old = sl.find(x => x.class_id === r.class_id && x.day === r.day && x.period === r.period) || {}; return { class_id: r.class_id, day: r.day, period: r.period, subject_id: r.subject_id, teacher_id: r.teacher_id || (kT && old.subject_id && old.subject_id === r.subject_id ? old.teacher_id || null : null) }; });
        if (clr) { const have = new Set(outR.map(r => r.class_id + '|' + r.day + '|' + r.period)); new Set(outR.map(r => r.class_id)).forEach(cid => { for (let d = 0; d < sec.days; d++) for (let p = 0; p < sec.periods; p++) if (!have.has(cid + '|' + d + '|' + p) && sl.some(x => x.class_id === cid && x.day === d && x.period === p && (x.subject_id || x.teacher_id))) outR.push({ class_id: cid, day: d, period: p, subject_id: null, teacher_id: null }); }); }
        for (let i = 0; i < outR.length; i += 400) await api.upsertSlots(draft.id, outR.slice(i, i + 400));
        await api.updateDraft(draft.id, { source: 'استيراد: ' + files.map(f => f.name).join('، ').slice(0, 180) });
        m.close(); A.toast(`طُبِّقت ${A.cnt(rows.length, 'حصة', 'حصص')} على المسودة — راجعها ثم اعتمدها أو جدولها لفترة`, 'ok'); done();
      });
    }
    const go = fl => { const files = [...fl]; if (files.length) A.run(null, () => handle(files).catch(e => { box.innerHTML = A.emptyBox('تعذّر الاستيراد', esc(e.message)); throw e; })); };
    const ff = m.el.querySelector('#ff'); ff.onchange = () => { go(ff.files); ff.value = ''; };
    const dz = m.el.querySelector('#dz'); dz.addEventListener('dragover', e => e.preventDefault()); dz.addEventListener('drop', e => { e.preventDefault(); go(e.dataTransfer.files); });
  };
})();
