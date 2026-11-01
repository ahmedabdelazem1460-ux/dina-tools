/* منصة دينا — «الإدخال الموحّد»: المعلم الذي يدرّس المادة نفسها لأكثر من فصل في الصف نفسه يكتب دروس الأسبوع مرة واحدة،
   فتُرحَّل تلقائياً إلى حصص كل فصل بترتيب جدوله (الدرس ١ لأول حصة في الأسبوع، الدرس ٢ للتي بعدها…).
   مرونة: استبعاد فصل ليُدخل وحده، أو «متأخر بدرس/درسين» فتُترك أولى حصصه للإدخال الفردي وتُزاح الدروس بعدها.
   أمان: لا تُستبدل حصة كتبها المعلم بشكل مختلف إلا بموافقة صريحة، ولا تُمس الحصص المعتمدة. لا تخزين جديد — الشاشة تُبنى من الخطط نفسها. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, DAYS, PER } = A;
  const gradeKey = c => String((c && (c.grade_word ? c.grade_word + ' ' + (c.stage || '') : c.name)) || '').split(/\s+/).filter(t => t && !/^[أ-ي]$/.test(t) && !/^(بنين|بنات)$/.test(t) && !/^[A-Za-z]$/.test(t)).join(' ').trim();
  const LK = () => 'unified_' + S.me.id;
  const lsGet = () => { try { return JSON.parse(localStorage.getItem(LK()) || '{}'); } catch (_) { return {}; } };
  const lsSet = v => { try { localStorage.setItem(LK(), JSON.stringify(v)); } catch (_) {} };
  const has = e => !!((e.topic || '').trim() || (e.homework || '').trim() || (e.note || '').trim());
  // مقارنة تتجاهل الفروق الشكلية فقط: المسافات، التشكيل، التطويل، صور الألف والياء والتاء المربوطة، الأرقام العربية/الهندية، المسافة حول علامات الترقيم والنقطة في الآخر.
  // أي اختلاف في الكلمات أو الأرقام نفسها (مثل ص ٤٥ ← ص ٤٦) يبقى اختلافاً حقيقياً.
  const nrm = t => String(t || '').normalize('NFKC').replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[–—ـ]/g, '-').replace(/\s*([-:،,.؛;()«»"/])\s*/g, '$1').replace(/\s+/g, ' ').replace(/[.。]+$/, '').trim().toLowerCase();
  const same = (e, l) => nrm(e.topic) === nrm(l.topic) && nrm(e.homework) === nrm(l.homework) && nrm(e.note) === nrm(l.note);
  const clsOf = id => A.cls(id) || {};

  // مجموعات: نفس المادة + نفس الصف لفصلين فأكثر (حصص المعلم نفسه فقط، دون النيابة)
  function groups() {
    const mine = S.entries.filter(e => e.subject_id && e.teacher_id === S.me.id && A.required(e));
    const g = {};
    mine.forEach(e => { const k = e.subject_id + '|' + gradeKey(clsOf(e.class_id)); (g[k] = g[k] || { key: k, subject_id: e.subject_id, grade: gradeKey(clsOf(e.class_id)), classes: new Set(), entries: [] }); g[k].classes.add(e.class_id); g[k].entries.push(e); });
    return Object.values(g).filter(x => x.classes.size > 1).map(x => ({ ...x, classes: [...x.classes].sort((a, b) => (clsOf(a).sort ?? 0) - (clsOf(b).sort ?? 0) || (clsOf(a).name || '').localeCompare(clsOf(b).name || '', 'ar')) }));
  }
  // وضع «بالمادة»: كل مادة مرة واحدة لكل صف، ومربعات اختيار لكل فصول المادة (يمكن ضم فصل من صف آخر أو الاكتفاء بفصل واحد)
  function blocks() {
    const mine = S.entries.filter(e => e.subject_id && e.teacher_id === S.me.id && A.required(e));
    const bySub = {}; mine.forEach(e => { (bySub[e.subject_id] = bySub[e.subject_id] || []).push(e); });
    const out = [];
    Object.entries(bySub).forEach(([sid, es]) => {
      const all = [...new Set(es.map(e => e.class_id))].sort((a, b) => (clsOf(a).sort ?? 0) - (clsOf(b).sort ?? 0) || (clsOf(a).name || '').localeCompare(clsOf(b).name || '', 'ar'));
      const grades = [...new Set(all.map(c => gradeKey(clsOf(c))))];
      grades.forEach(gk => out.push({ key: 'b|' + sid + '|' + gk, subject_id: sid, grade: gk, classes: all, entries: es, defEx: all.filter(c => gradeKey(clsOf(c)) !== gk) }));
    });
    const ord = g => Math.min(...g.classes.filter(c => !g.defEx.includes(c)).map(c => clsOf(c).sort ?? 999));
    return out.sort((x, y) => (A.subjName(x.subject_id) || '').localeCompare(A.subjName(y.subject_id) || '', 'ar') || ord(x) - ord(y));
  }
  // توزيع: لكل فصل حصصه مرتبة بالأيام ثم الحصص، مع إزاحة التأخر
  function plan(g, cfg) {
    const per = {}; g.classes.forEach(c => { per[c] = g.entries.filter(e => e.class_id === c).sort((a, b) => a.day - b.day || a.period - b.period); });
    const inc = g.classes.filter(c => !cfg.ex.includes(c));
    const n = Math.max(0, ...inc.map(c => per[c].length - (+cfg.off[c] || 0)));
    const map = i => inc.map(c => ({ c, e: per[c][i + (+cfg.off[c] || 0)] || null }));
    return { per, inc, n, map };
  }

  function mount(el, g, onDone, close) {
    const w = A.week(), open = w && w.status === 'open';
    const st = lsGet(), saved = st[g.key] || {}; const cfg = { ex: saved.ex || g.defEx || [], off: saved.off || {} };
    let P = plan(g, cfg), rows = [], base = [], dirty = false;
    // base: نص كل درس كما هو الآن في أول فصل مكتوب (يُعتبر الفصل «متزامناً» إن طابقه فيُحدَّث معه)
    const seed = () => { base = Array.from({ length: P.n }, (_, i) => { const lead = P.map(i).find(x => x.e && has(x.e)); const s = lead ? lead.e : {}; return { topic: s.topic || '', homework: s.homework || '', note: s.note || '' }; }); if (!dirty) rows = base.map(x => ({ ...x })); while (rows.length < P.n) rows.push({ topic: '', homework: '', note: '' }); };
    seed();
    el.innerHTML = `<p class="small muted" style="margin:0 0 6px"><b>طبّق على:</b> اختر فصلاً واحداً أو أكثر — الدروس تُرحَّل لكل فصل محدد حسب ترتيب حصصه في جدوله. فصل متأخر؟ حدد «متأخر بـ»، أو أزل علامته وأدخله وحده.</p>
      <div class="un-cls" data-u="unC"></div>
      <p class="small muted" style="margin:0 0 6px">تحت كل درس: إلى أي حصة يُرحَّل في كل فصل — ✓ مطابقة · ← ستُحدَّث · ⚠ مكتوبة بشكل مختلف (تبقى) · 🔒 معتمدة.</p>
      <div data-u="unL"></div>
      <label class="chk" style="margin-top:10px"><input type="checkbox" data-u="unOv"> استبدال الحصص التي كُتبت فيها خطة مختلفة <span class="small muted">(بدونه تبقى كما هي)</span></label>
      <div class="acts"><span class="small muted grow" data-u="unSum" role="status" aria-live="polite"></span>${open ? '<button class="btn" data-u="unGo">حفظ وترحيل إلى الفصول</button>' : '<span class="notice warn" style="margin:0">الأسبوع مقفل — للعرض فقط</span>'}</div>`;
    const drawC = () => {
      $('[data-u="unC"]', el).innerHTML = g.classes.map(c => { const on = !cfg.ex.includes(c), n = P.per[c].length; return `<div class="un-c ${on ? 'on' : ''}"><label class="chk"><input type="checkbox" data-in="${c}" ${on ? 'checked' : ''}> <b>${esc(clsOf(c).name)}</b> <span class="small muted">${AR(n)} حصص</span></label>
        <label class="small">${on ? `متأخر بـ <select class="in" data-off="${c}" aria-label="تأخر ${esc(clsOf(c).name)}">${[0, 1, 2, 3].filter(k => k < n).map(k => `<option value="${k}" ${(+cfg.off[c] || 0) === k ? 'selected' : ''}>${k ? AR(k) + (k === 1 ? ' درس' : ' دروس') : 'لا تأخر'}</option>`).join('')}</select>` : `<span class="muted">${g.defEx && g.defEx.includes(c) ? 'له بطاقة صفه' : 'يُدخل وحده'}</span>`}</label></div>`; }).join('');
      $$('[data-in]', el).forEach(i => i.onchange = () => { const inc = $$('[data-in]', el).filter(x => x.checked).length; if (inc < 1) { i.checked = true; return; } cfg.ex = $$('[data-in]', el).filter(x => !x.checked).map(x => x.dataset.in); keep(); P = plan(g, cfg); seed(); drawC(); drawL(); });
      $$('[data-off]', el).forEach(s => s.onchange = () => { cfg.off[s.dataset.off] = +s.value; keep(); P = plan(g, cfg); seed(); drawL(); });
    };
    const keep = () => { const s = lsGet(); s[g.key] = cfg; lsSet(s); };
    const chip = (x, l, i) => { if (!x.e) return `<span class="un-m none">${esc(clsOf(x.c).name)}: —</span>`; const where = `${DAYS[x.e.day]} · ح${AR(x.e.period + 1)}`; const k = same(x.e, l) ? (has(x.e) ? ['ok', 'مطابقة'] : ['', 'فارغة']) : x.e.status === 'approved' ? ['lock', 'معتمدة — لن تُمس'] : (!has(x.e) || same(x.e, base[i] || {})) ? ['up', 'ستُحدَّث'] : ['diff', 'مكتوبة بشكل مختلف — تبقى إلا إذا اخترت الاستبدال']; return `<span class="un-m ${k[0]}" title="${esc(k[1])}">${esc(clsOf(x.c).name)}: ${where}${k[0] === 'diff' ? ' ⚠' : k[0] === 'ok' ? ' ✓' : k[0] === 'up' ? ' ←' : k[0] === 'lock' ? ' 🔒' : ''}</span>`; };
    const drawL = () => {
      const L = $('[data-u="unL"]', el); if (!P.n) { L.innerHTML = A.emptyBox('لا توجد حصص للتوحيد'); return; }
      L.innerHTML = rows.slice(0, P.n).map((l, i) => `<div class="un-row" data-i="${i}"><div class="un-n">الدرس<b>${AR(i + 1)}</b></div><div class="un-f">
          <textarea class="in" rows="1" data-k="topic" placeholder="الموضوع / الدرس — مثال: الفعل الماضي ص ٤٥" aria-label="موضوع الدرس ${AR(i + 1)}" ${open ? '' : 'readonly'}>${esc(l.topic)}</textarea>
          <div class="grid g2"><input class="in" data-k="homework" value="${esc(l.homework)}" placeholder="الواجب (اختياري)" aria-label="واجب الدرس ${AR(i + 1)}" ${open ? '' : 'readonly'}><input class="in" data-k="note" value="${esc(l.note)}" placeholder="ملاحظة (اختياري)" aria-label="ملاحظة الدرس ${AR(i + 1)}" ${open ? '' : 'readonly'}></div>
          <div class="un-ms">${P.map(i).map(x => chip(x, l, i)).join('')}</div></div></div>`).join('');
      $$('.un-row', L).forEach(r => { const i = +r.dataset.i; $$('[data-k]', r).forEach(inp => inp.oninput = () => { rows[i][inp.dataset.k] = inp.value; dirty = true; el.dataset.dirty = '1'; r.querySelector('.un-ms').innerHTML = P.map(i).map(x => chip(x, rows[i], i)).join(''); sum(); }); const ta = r.querySelector('textarea'); const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.max(44, ta.scrollHeight + 2) + 'px'; }; ta.addEventListener('input', fit); setTimeout(fit, 0); });
      sum();
    };
    const todo = () => { const ov = $('[data-u="unOv"]', el).checked, out = [], skip = { diff: 0, appr: 0 }; for (let i = 0; i < P.n; i++) { const l = rows[i]; P.map(i).forEach(x => { if (!x.e || same(x.e, l)) return; if (x.e.status === 'approved') { skip.appr++; return; } if (has(x.e) && !same(x.e, base[i] || {}) && !ov) { skip.diff++; return; } out.push({ e: x.e, l }); }); } return { out, skip }; };
    const sum = () => { const { out, skip } = todo(); $('[data-u="unSum"]', el).textContent = `سيُحدَّث ${AR(out.length)} حصة${skip.diff ? ` · ${AR(skip.diff)} مكتوبة بشكل مختلف ستبقى` : ''}${skip.appr ? ` · ${AR(skip.appr)} معتمدة لن تُمس` : ''}`; };
    $('[data-u="unOv"]', el).onchange = sum;
    drawC(); drawL();
    const go = $('[data-u="unGo"]', el); if (go) go.onclick = ev => A.run(ev.currentTarget, async () => {
      const { out } = todo(); if (!out.length) { A.toast('لا يوجد تغيير للترحيل'); return; }
      let done = 0; for (let i = 0; i < out.length; i += 6) { await Promise.all(out.slice(i, i + 6).map(async ({ e, l }) => { const patch = { topic: l.topic.trim(), homework: l.homework.trim(), note: l.note.trim() }; patch.status = has(patch) || e.perf_task ? 'submitted' : 'draft'; const r = await api.saveEntry(e.id, patch); Object.assign(e, r || patch); const k = S.entries.findIndex(x => x.id === e.id); if (k >= 0) S.entries[k] = e; done++; })); }
      delete el.dataset.dirty; if (close) close(); A.toast(`رُحِّلت الخطة إلى ${A.cnt(done, 'حصة', 'حصص')} في ${A.cnt(P.inc.length, 'فصل', 'فصول')}`, 'ok'); if (onDone) onDone();
    });
  };

  A.unifiedEditor = function (g, onDone) { const m = A.modal(`<h3>الإدخال الموحّد — ${esc(A.subjName(g.subject_id))} · ${esc(g.grade)}</h3><div></div>`, { cls: 'wide' }); mount(m.el.querySelector('div:last-child'), g, onDone, () => m.close()); };

  // «خطتي»: اختيار طريقة الإدخال — بالحصة (حسب الجدول) أو بالمادة — مع بقاء الجدول التفاعلي كما هو
  const getMode = () => A.LS.get('mymode') || 'period';
  const my0 = V.my;
  if (my0) V.my = function (root) {
    const r = my0(root); const w = A.week(); if (!w || !$('#days', root)) return r;
    const mode = getMode(), bl = blocks();
    const head = $('.head', root);
    if (head && !$('#myMode', root)) head.insertAdjacentHTML('afterend', `<div class="my-mode" id="myMode" role="radiogroup" aria-label="طريقة الإدخال"><span class="small muted">طريقة الإدخال:</span><button role="radio" data-mm="period" aria-checked="${mode === 'period'}" class="${mode === 'period' ? 'on' : ''}">بالحصة — حسب الجدول</button><button role="radio" data-mm="subject" aria-checked="${mode === 'subject'}" class="${mode === 'subject' ? 'on' : ''}">بالمادة — مرة واحدة لكل مادة</button></div>`);
    $$('[data-mm]', root).forEach(b => b.onclick = () => { if (getMode() === b.dataset.mm) return; A.LS.set('mymode', b.dataset.mm); V.my(root); });
    // الضغط على حصة في الجدول يفتحها في وضع «بالحصة» دائماً
    root.addEventListener('click', e => { if (e.target.closest('[data-cell]')) A.LS.set('mymode', 'period'); }, true);
    if (mode === 'subject') {
      const flt = $('#flt', root); if (flt) flt.style.display = 'none'; const sel = $('#mySel', root); if (sel) sel.closest('.row').style.display = 'none';
      const days = $('#days', root);
      days.innerHTML = bl.length ? bl.map((g, i) => { const req = g.entries.filter(e => !g.defEx.includes(e.class_id)), f = req.filter(A.filled).length; return `<section class="card un-blk" data-b="${i}"><div class="un-bh"><div><h3>${esc(A.subjName(g.subject_id))} <span class="small muted">— ${esc(g.grade)}</span></h3><span class="small muted">${A.cnt(req.length, 'حصة', 'حصص')} هذا الأسبوع · مكتمل ${AR(f)} من ${AR(req.length)}</span></div><span class="un-p" style="width:120px"><i style="width:${A.pct(f, req.length)}%"></i></span></div><div class="un-body"></div></section>`; }).join('') : `<div class="card">${A.emptyBox('لا توجد حصص لك هذا الأسبوع')}</div>`;
      const remount = sec => mount($('.un-body', sec), bl[+sec.dataset.b], () => { const g = bl[+sec.dataset.b], req = g.entries.filter(e => !g.defEx.includes(e.class_id)), f = req.filter(A.filled).length; const sp = sec.querySelector('.un-bh .small'); if (sp) sp.textContent = `${A.cnt(req.length, 'حصة', 'حصص')} هذا الأسبوع · مكتمل ${AR(f)} من ${AR(req.length)}`; const bar = sec.querySelector('.un-bh .un-p i'); if (bar) bar.style.width = A.pct(f, req.length) + '%'; remount(sec); A.renderNav && A.renderNav(); });
      $$('.un-blk', days).forEach(remount);
      return r;
    }
    const gs = groups(); if (!gs.length) return r;
    const anchor = $('.tgrid', root); if (!anchor || $('#unCard', root)) return r;
    anchor.insertAdjacentHTML('afterend', `<div class="card un-card" id="unCard"><div class="un-h"><div><b>الإدخال الموحّد</b><p class="small muted" style="margin:2px 0 0">تدرّس المادة نفسها لأكثر من فصل — اكتب الخطة مرة واحدة وتُرحَّل لكل فصل حسب جدوله، أو اختر «بالمادة» أعلاه.</p></div></div>
      <div class="un-gs">${gs.map((g, i) => { const req = g.entries.length, f = g.entries.filter(A.filled).length; return `<button class="un-g" data-g="${i}"><b>${esc(A.subjName(g.subject_id))}</b><span>${esc(g.grade)} · ${g.classes.length === 2 ? 'فصلان' : A.cnt(g.classes.length, 'فصل', 'فصول')} · ${A.cnt(req, 'حصة', 'حصص')}</span><span class="un-p"><i style="width:${A.pct(f, req)}%"></i></span><span class="small">${AR(f)} / ${AR(req)} مكتملة</span></button>`; }).join('')}</div></div>`);
    $$('[data-g]', root).forEach(b => b.onclick = () => A.unifiedEditor(gs[+b.dataset.g], () => V.my(root)));
    return r;
  };
  window.addEventListener('beforeunload', e => { if (document.querySelector('[data-dirty="1"]')) { e.preventDefault(); e.returnValue = ''; } });
})();
