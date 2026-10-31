/* منصة دينا — الاختبارات الورقية والتصحيح الآلي + اللجان
   اختبار بنماذج إجابة متعددة ودرجة لكل سؤال وربط بالمهارات، طباعة ورقة تظليل لكل طالب باسمه، تصحيح آلي من المسح،
   نتائج وإحصائيات وتوزيع درجات، تحليل الأسئلة والمهارات، مشاركة النتائج مع أولياء الأمور، خطط علاجية، وتوزيع اللجان. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, I } = A;
  A.I.paper = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="9" cy="9" r="1.6"/><circle cx="15" cy="9" r="1.6" fill="currentColor"/><circle cx="9" cy="15" r="1.6" fill="currentColor"/><circle cx="15" cy="15" r="1.6"/></svg>';
  const KINDS = { diagnostic: 'تشخيصي', periodic: 'فتري', final: 'نهائي', quiz: 'قصير' };
  const L = () => window.DinaOMR.LET;
  const MODELS = ['A', 'B', 'C', 'D'];
  const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
  const clsName = id => (A.cls(id) || {}).name || '';
  const canEdit = e => S.me.is_owner || e.teacher_id === S.me.id || (A.hasModule && A.hasModule('supervision'));
  let st = { view: 'list', exam: null, tab: 'key' };
  const scoreOf = (e, model, ans) => { const m = (e.models.find(x => x.name === model) || e.models[0] || { answers: [] }); let s = 0, mx = 0; for (let q = 0; q < e.n_questions; q++) { const w = +(e.weights[q] ?? 1); mx += w; if (ans[q] !== undefined && ans[q] >= 0 && ans[q] === m.answers[q]) s += w; } return [Math.round(s * 100) / 100, mx]; };
  async function roster(e) { const ids = e.class_ids || []; if (!ids.length) return []; const st0 = await api.list('students', { class_id: ids, active: true }); return st0.sort((a, b) => clsName(a.class_id).localeCompare(clsName(b.class_id), 'ar') || a.full_name.localeCompare(b.full_name, 'ar')); }

  V.paper = async function (root) {
    if (!(A.canAssess && A.canAssess())) { root.innerHTML = `<div class="card">${A.emptyBox('هذا البند غير مفعّل لحسابك', 'يفعّله مالك النظام.')}</div>`; return; }
    if (st.view === 'exam' && st.exam) return examView(root);
    const top = A.LS.get('pp_t') || 'exams';
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>الاختبارات الورقية والتصحيح الآلي</h2><p class="sub" style="margin:2px 0 0">أنشئ الاختبار ونماذج إجابته، اطبع ورقة تظليل لكل طالب باسمه، ثم ارفع الأوراق الممسوحة لتُصحَّح آلياً مع تحليل كامل ومشاركة النتائج مع أولياء الأمور.</p></div></div>
      <div class="tabs" id="ppT"><button data-t="exams" class="${top === 'exams' ? 'on' : ''}">الاختبارات</button><button data-t="comm" class="${top === 'comm' ? 'on' : ''}">اللجان</button></div><div id="ppB"><div class="spinner"></div></div></div>`;
    $$('#ppT button', root).forEach(b => b.onclick = () => { A.LS.set('pp_t', b.dataset.t); V.paper(root); });
    if (top === 'comm') return committees($('#ppB', root), root);
    const list = (await api.list('paper_exams', { school_id: S.school.id }, { order: 'created_at', desc: true })).filter(e => !e.section_id || e.section_id === S.sectionId);
    const box = $('#ppB', root);
    box.innerHTML = `<div class="row" style="gap:8px;margin:10px 0"><input class="in" id="ppQ" placeholder="بحث باسم الاختبار" style="max-width:260px"><div class="grow"></div><button class="btn" id="ppNew">${I.plus} اختبار جديد</button></div>
      <div class="scroll"><table class="tbl"><thead><tr><th>الاختبار</th><th>المادة</th><th>النوع</th><th>الفصول</th><th>الأسئلة</th><th>التاريخ</th><th></th></tr></thead><tbody id="ppL"></tbody></table></div>`;
    const draw = () => { const q = A.normKey($('#ppQ', box).value || ''); $('#ppL', box).innerHTML = list.filter(e => !q || A.normKey(e.title).includes(q)).map(e => `<tr class="click" data-o="${e.id}"><td><b>${esc(e.title)}</b></td><td>${esc(A.subjName(e.subject_id) || '—')}</td><td><span class="pill st-submitted">${KINDS[e.kind] || e.kind}</span></td><td class="small">${esc((e.class_ids || []).map(clsName).join('، '))}</td><td>${AR(e.n_questions)}</td><td class="small">${e.exam_date ? AR(e.exam_date) : '—'}</td><td>${canEdit(e) ? `<button class="btn bad sm" data-d="${e.id}" aria-label="حذف">×</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="7">${A.emptyBox('لا توجد اختبارات ورقية بعد', 'ابدأ من «اختبار جديد».')}</td></tr>`;
      $$('[data-o]', box).forEach(r => r.onclick = ev => { if (ev.target.closest('[data-d]')) return; st = { view: 'exam', exam: list.find(x => x.id === r.dataset.o), tab: 'key' }; V.paper(root); });
      $$('[data-d]', box).forEach(b => b.onclick = async () => { const e = list.find(x => x.id === b.dataset.d); if (!(await A.confirmBox(`حذف «${esc(e.title)}» ونتائجه نهائياً؟`, 'حذف', true))) return; await api.del('paper_exams', e.id); list.splice(list.indexOf(e), 1); draw(); }); };
    $('#ppQ', box).oninput = draw; draw();
    $('#ppNew', box).onclick = () => editExam(null, root);
  };

  function editExam(e, root) {
    const cls = S.classes.filter(c => c.active), isNew = !e; e = e || { title: '', kind: 'diagnostic', n_questions: 20, n_options: 4, class_ids: [], models: [{ name: 'A', answers: [] }], weights: [], skills: [], subject_id: (A.S.subjects[0] || {}).id };
    const m = A.modal(`<h3>${isNew ? 'اختبار ورقي جديد' : 'تعديل الاختبار'}</h3>
      <div class="grid g2"><div class="field"><label for="peT">اسم الاختبار</label><input class="in" id="peT" value="${esc(e.title)}" placeholder="مثال: رياضيات ٤ — التشخيصي ١"></div>
        <div class="field"><label for="peS">المادة</label><select class="in" id="peS">${S.subjects.map(s => `<option value="${s.id}" ${s.id === e.subject_id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="peK">نوع الاختبار</label><select class="in" id="peK">${Object.entries(KINDS).map(([k, l]) => `<option value="${k}" ${e.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="peD">التاريخ</label><input class="in" type="date" id="peD" value="${e.exam_date || ''}"></div>
        <div class="field"><label for="peN">عدد الأسئلة (١–١٠٠)</label><input class="in" type="number" min="1" max="100" id="peN" value="${e.n_questions}"></div>
        <div class="field"><label for="peO">عدد البدائل</label><select class="in" id="peO">${[2, 3, 4, 5].map(n => `<option ${e.n_options === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label for="peM">عدد نماذج الإجابة</label><select class="in" id="peM">${[1, 2, 3, 4].map(n => `<option ${e.models.length === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
      <div class="field"><label>الفصول</label><div class="perm-grid">${cls.map(c => `<label class="chk small"><input type="checkbox" value="${c.id}" ${e.class_ids.includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div></div>
      <div class="acts"><button class="btn" id="peGo">${isNew ? 'إنشاء' : 'حفظ'}</button></div>`, { cls: 'wide' });
    m.el.querySelector('#peGo').onclick = ev => A.run(ev.currentTarget, async () => {
      const title = m.el.querySelector('#peT').value.trim(); if (!title) throw new Error('اكتب اسم الاختبار');
      const n = Math.max(1, Math.min(100, +m.el.querySelector('#peN').value || 20)), nm = +m.el.querySelector('#peM').value;
      const ids = $$('.perm-grid input:checked', m.el).map(i => i.value); if (!ids.length) throw new Error('اختر فصلاً واحداً على الأقل');
      const models = MODELS.slice(0, nm).map((nmn, i) => ({ name: nmn, answers: ((e.models[i] || {}).answers || []).slice(0, n) }));
      const row = { title, subject_id: m.el.querySelector('#peS').value, kind: m.el.querySelector('#peK').value, exam_date: m.el.querySelector('#peD').value || null, n_questions: n, n_options: +m.el.querySelector('#peO').value, class_ids: ids, models, weights: Array.from({ length: n }, (_, q) => e.weights[q] ?? 1), skills: Array.from({ length: n }, (_, q) => e.skills[q] || null) };
      let saved; if (isNew) saved = (await api.ins('paper_exams', { ...row, school_id: S.school.id, section_id: S.sectionId, teacher_id: S.me.id }))[0]; else saved = (await api.upd('paper_exams', e.id, row)) || { ...e, ...row };
      m.close(); st = { view: 'exam', exam: saved, tab: isNew ? 'key' : st.tab }; V.paper(root);
    });
  }

  // ===================== صفحة الاختبار =====================
  async function examView(root) {
    const e = st.exam, ed = canEdit(e);
    const tabs = [['key', 'نماذج الإجابة'], ['sheets', 'طباعة الأوراق'], ['grade', 'التصحيح'], ['results', 'النتائج'], ['items', 'تحليل الأسئلة'], ['skills', 'تحليل المهارات'], ['share', 'مشاركة النتائج']];
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><button class="btn ghost sm" id="peBack">→ الاختبارات</button><h2 style="margin:8px 0 0">${esc(e.title)}</h2><p class="sub" style="margin:2px 0 0">${esc(A.subjName(e.subject_id) || '')} · ${KINDS[e.kind] || ''} · ${AR(e.n_questions)} سؤالاً · ${esc(e.class_ids.map(clsName).join('، '))}${e.exam_date ? ' · ' + AR(e.exam_date) : ''}</p></div>${ed ? '<button class="btn ghost sm" id="peEd">تعديل البيانات</button>' : ''}</div>
      <div class="tabs" id="peTabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${st.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="peB"><div class="spinner"></div></div></div>`;
    $('#peBack', root).onclick = () => { st = { view: 'list' }; V.paper(root); };
    const eb = $('#peEd', root); if (eb) eb.onclick = () => editExam(e, root);
    $$('#peTabs button', root).forEach(b => b.onclick = () => { st.tab = b.dataset.t; examView(root); });
    const box = $('#peB', root);
    ({ key: tKey, sheets: tSheets, grade: tGrade, results: tResults, items: tItems, skills: tSkills, share: tShare })[st.tab](box, e, root);
  }
  const saveExam = async (e, patch) => { const r = await api.upd('paper_exams', e.id, patch); Object.assign(e, r || patch); };

  // ---------- نماذج الإجابة والدرجات والمهارات ----------
  async function tKey(box, e) {
    const ed = canEdit(e); let mi = 0;
    const gk = (() => { const c = A.cls(e.class_ids[0]) || {}; return c.stage + '|' + c.grade_word; })();
    let lessons = []; try { lessons = await api.list('curriculum', { school_id: S.school.id, subject_id: e.subject_id, grade_key: gk }, { order: 'sort' }); } catch (_) {}
    const draw = () => {
      const m = e.models[mi], tot = e.weights.reduce((a, w) => a + (+w || 0), 0), filled = m.answers.filter(x => x >= 0).length;
      box.innerHTML = `<div class="row" style="gap:8px;margin:12px 0;flex-wrap:wrap"><div class="chip-filter" id="kM" style="margin:0">${e.models.map((x, i) => `<button data-i="${i}" class="${i === mi ? 'on' : ''}">نموذج ${x.name}</button>`).join('')}</div>
          <span class="pill st-approved">إجمالي الدرجات: ${AR(tot)}</span><span class="small muted">${AR(filled)} من ${AR(e.n_questions)} مُدخلة</span><div class="grow"></div>
          ${ed ? `<label class="small">درجة لكل الأسئلة <input class="in" type="number" step="0.25" min="0" id="kW" style="width:80px" value=""></label><button class="btn ghost sm" id="kWA">تطبيق</button>${mi > 0 ? `<button class="btn ghost sm" id="kCp">نسخ مفتاح نموذج A</button>` : ''}<button class="btn ghost sm" id="kPaste">لصق المفتاح</button>` : ''}</div>
        <div class="pk-grid">${Array.from({ length: e.n_questions }, (_, q) => `<div class="pk-row"><b class="pk-n">${AR(q + 1)}</b><div class="pk-opts">${Array.from({ length: e.n_options }, (_, k) => `<button class="pk-o ${m.answers[q] === k ? 'on' : ''}" data-q="${q}" data-k="${k}" ${ed ? '' : 'disabled'} aria-pressed="${m.answers[q] === k}" aria-label="سؤال ${q + 1} ${L()[k]}">${L()[k]}</button>`).join('')}</div>
          <input class="in pk-w" type="number" step="0.25" min="0" data-w="${q}" value="${e.weights[q] ?? 1}" ${ed ? '' : 'disabled'} aria-label="درجة السؤال ${q + 1}">
          <select class="in pk-s" data-s="${q}" ${ed ? '' : 'disabled'} aria-label="مهارة السؤال ${q + 1}"><option value="">— المهارة / الدرس —</option>${lessons.map(l => `<option value="${l.id}" ${((e.skills[q] || {}).lesson_id === l.id) ? 'selected' : ''}>${esc(l.lesson)}</option>`).join('')}<option value="__t" ${(e.skills[q] && !e.skills[q].lesson_id && e.skills[q].name) ? 'selected' : ''}>${e.skills[q] && !e.skills[q].lesson_id && e.skills[q].name ? esc(e.skills[q].name) : 'مهارة بنص حر…'}</option></select></div>`).join('')}</div>
        <p class="small muted">التعديلات تُحفظ تلقائياً. ${lessons.length ? '' : 'لربط الأسئلة بدروس المنهج أدخل الدروس من «التقويم والاختبارات ← المنهج والدروس»، أو اختر «مهارة بنص حر».'}</p>`;
      $$('#kM button', box).forEach(b => b.onclick = () => { mi = +b.dataset.i; draw(); });
      let t; const save = () => { clearTimeout(t); t = setTimeout(() => saveExam(e, { models: e.models, weights: e.weights, skills: e.skills }).catch(err => A.toast(err.message, 'bad')), 600); };
      $$('.pk-o', box).forEach(b => b.onclick = () => { const q = +b.dataset.q, k = +b.dataset.k; m.answers[q] = m.answers[q] === k ? -1 : k; $$(`.pk-o[data-q="${q}"]`, box).forEach(x => { x.classList.toggle('on', +x.dataset.k === m.answers[q]); x.setAttribute('aria-pressed', +x.dataset.k === m.answers[q]); }); save(); });
      $$('[data-w]', box).forEach(i => i.onchange = () => { e.weights[+i.dataset.w] = Math.max(0, +i.value || 0); save(); draw(); });
      $$('[data-s]', box).forEach(s => s.onchange = () => { const q = +s.dataset.s; if (s.value === '__t') { const n = prompt('اسم المهارة', (e.skills[q] || {}).name || ''); e.skills[q] = n ? { name: n.trim() } : null; } else e.skills[q] = s.value ? { lesson_id: s.value, name: (lessons.find(l => l.id === s.value) || {}).lesson } : null; save(); draw(); });
      const wa = $('#kWA', box); if (wa) wa.onclick = () => { const v = +$('#kW', box).value; if (!(v >= 0)) return; e.weights = e.weights.map(() => v); save(); draw(); };
      const cp = $('#kCp', box); if (cp) cp.onclick = () => { m.answers = e.models[0].answers.slice(); save(); draw(); };
      const ps = $('#kPaste', box); if (ps) ps.onclick = () => { const t2 = prompt('الصق المفتاح كحروف متتالية (أبجد…) أو أرقام (1234…)'); if (!t2) return; const arr = [...t2.replace(/\s|,|،/g, '')].map(ch => { const i = L().indexOf(ch); return i >= 0 ? i : (/[1-5١-٥]/.test(ch) ? (+String(ch).replace(/[١-٥]/, d => '١٢٣٤٥'.indexOf(d) + 1)) - 1 : -1); }); m.answers = Array.from({ length: e.n_questions }, (_, q) => arr[q] ?? -1); save(); draw(); };
    };
    draw();
  }

  // ---------- طباعة أوراق التظليل ----------
  async function tSheets(box, e) {
    const R = await roster(e);
    box.innerHTML = `<div class="sec-box" style="margin-top:12px"><b>ورقة تظليل لكل طالب باسمه</b><p class="small muted" style="margin:4px 0 8px">كل ورقة تحمل رقم الطالب في هذا الاختبار ونموذجه في شريط التعريف، فيتعرّف عليها التصحيح الآلي مباشرة. ${AR(R.length)} طالباً في الفصول المختارة.</p>
      <div class="row" style="gap:10px;flex-wrap:wrap"><label class="small">توزيع النماذج <select class="in" id="shM" style="max-width:200px">${e.models.map((m, i) => `<option value="${i}">نموذج ${m.name} للجميع</option>`).join('')}${e.models.length > 1 ? '<option value="alt">بالتناوب بين النماذج</option>' : ''}</select></label>
        <label class="small">أوراق احتياطية بلا اسم <input class="in" type="number" min="0" max="50" id="shX" value="0" style="width:80px"></label>
        <button class="btn" id="shGo">${I.print} طباعة الأوراق</button><button class="btn ghost" id="shOne">ورقة نموذجية فارغة</button></div>
      ${R.length ? '' : '<div class="notice warn" style="margin-top:8px">لا يوجد طلاب في الفصول المختارة — استوردهم من «الحضور والسلوك ← الطلاب»، أو اطبع أوراقاً احتياطية.</div>'}</div>`;
    const print = (pages) => { const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:-9999px;width:900px;height:1200px;border:0'; document.body.appendChild(f); const base = location.href.replace(/[^/]*$/, '').split('#')[0];
      f.contentDocument.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="${base}"><style>@font-face{font-family:'GE SS Two';font-weight:400 500;src:url(fonts/gess-two-medium.woff2)}@font-face{font-family:'GE SS Two';font-weight:600 900;src:url(fonts/gess-two-bold.woff2)}${DinaOMR.PAGE_CSS}</style></head><body>${pages.join('')}</body></html>`); f.contentDocument.close();
      setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 4000); }, 900); };
    const common = { nq: e.n_questions, no: e.n_options, title: e.title, sub: `${A.subjName(e.subject_id) || ''} · ${KINDS[e.kind] || ''}${e.exam_date ? ' · ' + e.exam_date : ''}`, foot: S.school.name + ' — منصة دينا للتخطيط الدراسي' };
    $('#shGo', box).onclick = () => { const mm = $('#shM', box).value, extra = Math.max(0, Math.min(50, +$('#shX', box).value || 0)); if (!R.length && !extra) return A.toast('لا توجد أوراق للطباعة', 'warn');
      const pages = R.map((s, i) => { const mi = mm === 'alt' ? i % e.models.length : +mm; return DinaOMR.sheetHTML({ ...common, idx: i + 1, model: mi, modelName: e.models[mi].name, name: s.full_name, cls: clsName(s.class_id) }); });
      for (let k = 0; k < extra; k++) { const mi = mm === 'alt' ? k % e.models.length : +mm; pages.push(DinaOMR.sheetHTML({ ...common, idx: 4095, model: mi, modelName: e.models[mi].name })); }
      print(pages); };
    $('#shOne', box).onclick = () => print([DinaOMR.sheetHTML({ ...common, idx: 4095, model: 0, modelName: e.models[0].name })]);
  }

  // ---------- التصحيح: رفع المسح أو الإدخال اليدوي ----------
  async function tGrade(box, e, root) {
    const R = await roster(e); let res = await api.list('paper_results', { exam_id: e.id });
    const byStu = Object.fromEntries(res.map(r => [r.student_id, r]));
    box.innerHTML = `<div class="grid g2" style="align-items:start;margin-top:12px"><div class="sec-box"><b>تصحيح آلي من الأوراق الممسوحة</b><p class="small muted" style="margin:4px 0 8px">ارفع ملف PDF من الماسح أو صوراً (يمكن اختيار مجلد كامل). تُقرأ كل ورقة ويُتعرَّف على الطالب ونموذجه تلقائياً، ثم تراجع النتائج قبل الحفظ.</p>
        <label class="drop" id="gDrop" tabindex="0"><input type="file" id="gF" accept="application/pdf,image/*" multiple hidden><span>اسحب الملفات هنا أو <u>اختر ملفات</u></span><small>PDF أو صور (JPG/PNG)</small></label>
        <label class="btn ghost sm" style="margin-top:8px">اختيار مجلد<input type="file" id="gD" webkitdirectory multiple hidden></label><div id="gOut" style="margin-top:10px"></div></div>
      <div class="sec-box"><b>إدخال يدوي / غياب</b><p class="small muted" style="margin:4px 0 8px">اكتب إجابات الطالب حروفاً متتالية (أبجد…) واترك «-» للفارغ، أو علّمه غائباً.</p>
        <div class="scroll" style="max-height:440px"><table class="tbl"><thead><tr><th>الطالب</th><th>نموذج</th><th>الإجابات</th><th>غائب</th><th>الدرجة</th></tr></thead><tbody>${R.map(s => { const r = byStu[s.id]; return `<tr data-s="${s.id}"><td><b>${esc(s.full_name)}</b><div class="small muted">${esc(clsName(s.class_id))}</div></td><td><select class="in" data-m style="width:70px">${e.models.map(m => `<option ${r && r.model === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}</select></td><td><input class="in" data-a dir="rtl" style="min-width:160px" value="${r ? esc(r.answers.map(x => x >= 0 ? L()[x] : '-').join('')) : ''}"></td><td><input type="checkbox" data-ab ${r && r.absent ? 'checked' : ''} aria-label="غائب"></td><td class="small" data-sc>${r ? (r.absent ? 'غائب' : AR(r.score) + ' / ' + AR(r.max_score)) : '—'}</td></tr>`; }).join('')}</tbody></table></div>
        <button class="btn sm" id="gSaveM" style="margin-top:8px">حفظ الإدخال اليدوي</button></div></div>`;
    const out = $('#gOut', box), pending = [];
    const handle = async files => {
      out.innerHTML = '<div class="spinner"></div>'; pending.length = 0; let n = 0;
      for (const f of files) { if (!/pdf|image/i.test(f.type) && !/\.(pdf|jpe?g|png)$/i.test(f.name)) continue; let pages = []; try { pages = await DinaOMR.fileToCanvases(f); } catch (err) { pending.push({ label: f.name, error: err.message }); continue; }
        for (const pg of pages) { n++; out.innerHTML = `<div class="small muted">يقرأ الورقة ${AR(n)}…</div>`; await new Promise(r => setTimeout(r, 10)); const r = DinaOMR.readCanvas(pg.cv);
          if (!r.ok) { pending.push({ label: pg.label, error: r.error, img: DinaOMR.thumb(pg.cv, 360) }); continue; }
          const { ans } = r.read(e.n_questions, e.n_options), stu = r.id.idx >= 1 && r.id.idx <= R.length ? R[r.id.idx - 1] : null, model = (e.models[r.id.model] || e.models[0]).name;
          pending.push({ label: pg.label, stu, model, ans, img: DinaOMR.thumb(pg.cv), blank: ans.filter(x => x === -1).length, multi: ans.filter(x => x === -2).length }); } }
      drawPending();
    };
    const drawPending = () => {
      const ok = pending.filter(p => p.ans), opts = s => `<option value="">— اختر الطالب —</option>` + R.map(x => `<option value="${x.id}" ${s && s.id === x.id ? 'selected' : ''}>${esc(x.full_name)} — ${esc(clsName(x.class_id))}</option>`).join('');
      out.innerHTML = `<div class="small" style="margin-bottom:6px">${AR(ok.length)} ورقة مقروءة${pending.length - ok.length ? ` · <b style="color:var(--bad)">${AR(pending.length - ok.length)} تعذّرت</b>` : ''}</div>
        <div class="scroll" style="max-height:420px"><table class="tbl"><thead><tr><th>الورقة</th><th>الطالب</th><th>نموذج</th><th>الدرجة</th><th>تنبيه</th></tr></thead><tbody>${pending.map((p, i) => p.ans ? `<tr><td class="small"><button class="link" data-v="${i}">${esc(p.label)}</button></td><td><select class="in" data-ps="${i}" style="max-width:200px">${opts(p.stu)}</select></td><td>${p.model}</td><td>${(() => { const [s, mx] = scoreOf(e, p.model, p.ans); return AR(s) + ' / ' + AR(mx); })()}</td><td class="small">${p.blank ? `${AR(p.blank)} فارغ ` : ''}${p.multi ? `<b style="color:var(--bad)">${AR(p.multi)} مزدوج</b>` : ''}${byStu[(p.stu || {}).id] ? ' · يستبدل نتيجة سابقة' : ''}</td></tr>` : `<tr><td class="small">${esc(p.label)}</td><td colspan="4" class="small" style="color:var(--bad)">${esc(p.error)}</td></tr>`).join('')}</tbody></table></div>
        ${ok.length ? '<button class="btn ok" id="gSave" style="margin-top:8px">حفظ النتائج</button>' : ''}`;
      $$('[data-ps]', out).forEach(s => s.onchange = () => { pending[+s.dataset.ps].stu = R.find(x => x.id === s.value) || null; });
      $$('[data-v]', out).forEach(b => b.onclick = () => { const p = pending[+b.dataset.v]; A.modal(`<h3>${esc(p.label)}</h3><img src="${p.img}" style="width:100%;border:1px solid var(--border);border-radius:8px" alt="صورة الورقة"><p class="small">الإجابات المقروءة: ${p.ans.map((x, q) => `${AR(q + 1)}:${x >= 0 ? L()[x] : x === -2 ? '⚠' : '—'}`).join(' ')}</p>`, { cls: 'wide' }); });
      const sv = $('#gSave', out); if (sv) sv.onclick = ev => A.run(ev.currentTarget, async () => {
        const rows = pending.filter(p => p.ans && p.stu).map(p => { const [score, mx] = scoreOf(e, p.model, p.ans); return { exam_id: e.id, student_id: p.stu.id, student_name: p.stu.full_name, class_id: p.stu.class_id, model: p.model, answers: p.ans, score, max_score: mx, absent: false, sheet_img: p.img, updated_at: new Date().toISOString() }; });
        if (!rows.length) throw new Error('حدّد الطالب لكل ورقة'); await api.ups('paper_results', rows, 'exam_id,student_id'); A.toast(`حُفظت ${AR(rows.length)} نتيجة`, 'ok'); st.tab = 'results'; examView(root);
      });
    };
    $('#gF', box).onchange = ev => handle([...ev.target.files]); $('#gD', box).onchange = ev => handle([...ev.target.files]);
    const dz = $('#gDrop', box); dz.onclick = () => $('#gF', box).click(); dz.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); $('#gF', box).click(); } };
    dz.ondragover = ev => { ev.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = () => dz.classList.remove('over'); dz.ondrop = ev => { ev.preventDefault(); dz.classList.remove('over'); handle([...ev.dataTransfer.files]); };
    $('#gSaveM', box).onclick = ev => A.run(ev.currentTarget, async () => {
      const rows = []; $$('tr[data-s]', box).forEach(tr => { const s = R.find(x => x.id === tr.dataset.s), txt = tr.querySelector('[data-a]').value.trim(), ab = tr.querySelector('[data-ab]').checked, model = tr.querySelector('[data-m]').value; if (!txt && !ab) return;
        const ans = Array.from({ length: e.n_questions }, (_, q) => { const ch = [...txt][q]; const i = L().indexOf(ch); return i >= 0 ? i : -1; }); const [score, mx] = ab ? [0, scoreOf(e, model, [])[1]] : scoreOf(e, model, ans);
        rows.push({ exam_id: e.id, student_id: s.id, student_name: s.full_name, class_id: s.class_id, model, answers: ab ? [] : ans, score, max_score: mx, absent: ab, updated_at: new Date().toISOString() }); });
      if (!rows.length) throw new Error('لا يوجد إدخال'); await api.ups('paper_results', rows, 'exam_id,student_id'); A.toast(`حُفظت ${AR(rows.length)} نتيجة`, 'ok'); examView(root);
    });
  }

  // ---------- النتائج والإحصائيات ----------
  const filterUI = (e, f) => `<div class="row" style="gap:8px;margin:12px 0;flex-wrap:wrap"><label class="small">الفصل <select class="in" id="fC" style="max-width:200px"><option value="">كل الفصول</option>${e.class_ids.map(c => `<option value="${c}" ${f.c === c ? 'selected' : ''}>${esc(clsName(c))}</option>`).join('')}</select></label>${e.models.length > 1 ? `<label class="small">النموذج <select class="in" id="fM" style="max-width:120px"><option value="">الكل</option>${e.models.map(m => `<option ${f.m === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}</select></label>` : ''}</div>`;
  const ctxF = { c: '', m: '' };
  async function loadRes(e) { const r = await api.list('paper_results', { exam_id: e.id }); return r.filter(x => (!ctxF.c || x.class_id === ctxF.c) && (!ctxF.m || x.model === ctxF.m)); }
  const bindF = (box, again) => { const c = $('#fC', box); if (c) c.onchange = () => { ctxF.c = c.value; again(); }; const m = $('#fM', box); if (m) m.onchange = () => { ctxF.m = m.value; again(); }; };
  async function tResults(box, e, root) {
    const all = await loadRes(e), pres = all.filter(r => !r.absent), sc = pres.map(r => pct(r.score, r.max_score));
    const avg = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length * 10) / 10 : 0, mx = sc.length ? Math.max(...sc) : 0, mn = sc.length ? Math.min(...sc) : 0;
    const bins = Array(10).fill(0); sc.forEach(p => bins[Math.min(9, Math.floor(p / 10))]++);
    const tot = e.weights.reduce((a, w) => a + (+w || 0), 0);
    box.innerHTML = filterUI(e, ctxF) + `<div class="grid g4"><div class="kpi navy"><div class="k">أوراق الاختبار</div><div class="v">${AR(all.length)}</div><div class="d">غائب: ${AR(all.length - pres.length)}</div></div>
        <div class="kpi"><div class="k">متوسط الدرجات</div><div class="v">${AR(avg)}<small>٪</small></div><div class="d">${AR(Math.round(avg * tot) / 100)} من ${AR(tot)}</div></div>
        <div class="kpi"><div class="k">الأعلى</div><div class="v" style="color:var(--ok)">${AR(mx)}<small>٪</small></div></div><div class="kpi"><div class="k">الأدنى</div><div class="v" style="color:var(--bad)">${AR(mn)}<small>٪</small></div></div></div>
      <div class="sec-box" style="margin-top:12px"><div class="row" style="justify-content:space-between"><b>توزيع الدرجات</b><span class="row" style="gap:6px"><button class="btn ghost sm" id="rPng">PNG</button><button class="btn ghost sm" id="rX">${I.down} Excel</button><button class="btn ghost sm" id="rP">${I.print} PDF</button></span></div><canvas id="rH" width="900" height="260" style="width:100%;max-width:900px;height:auto" role="img" aria-label="توزيع الدرجات بفئات عشرية"></canvas></div>
      <div class="scroll" style="margin-top:12px"><table class="tbl"><thead><tr><th>الطالب</th><th>الفصل</th><th>النموذج</th><th>الدرجة</th><th>النسبة</th><th>الحضور</th><th></th></tr></thead><tbody>${all.sort((a, b) => pct(b.score, b.max_score) - pct(a.score, a.max_score)).map(r => `<tr><td><b>${esc(r.student_name)}</b></td><td>${esc(clsName(r.class_id))}</td><td>${r.model}</td><td>${r.absent ? '—' : AR(r.score) + ' / ' + AR(r.max_score)}</td><td>${r.absent ? '—' : `<span class="pill ${pct(r.score, r.max_score) >= 80 ? 'st-approved' : pct(r.score, r.max_score) >= 50 ? 'st-submitted' : 'st-returned'}">${AR(pct(r.score, r.max_score))}٪</span>`}</td><td>${r.absent ? '<span class="pill st-returned">غائب</span>' : 'حاضر'}</td><td>${r.sheet_img ? `<button class="btn ghost sm" data-img="${r.id}">الورقة</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="7">${A.emptyBox('لا توجد نتائج بعد', 'صحّح الأوراق من تبويب «التصحيح».')}</td></tr>`}</tbody></table></div>`;
    bindF(box, () => tResults(box, e, root));
    const cv = $('#rH', box), x = cv.getContext('2d'), mxB = Math.max(1, ...bins), bw = 900 / 10;
    x.fillStyle = '#fff'; x.fillRect(0, 0, 900, 260); x.font = '13px "GE SS Two",sans-serif'; x.textAlign = 'center';
    bins.forEach((n, i) => { const hgt = n / mxB * 190, X = (9 - i) * bw; x.fillStyle = i >= 8 ? '#2E9E5B' : i >= 5 ? '#3AB1DB' : '#E0574F'; x.fillRect(X + 14, 210 - hgt, bw - 28, hgt); x.fillStyle = '#082B5A'; x.fillText(String(n), X + bw / 2, 204 - hgt); x.fillStyle = '#5b6b82'; x.fillText(`${i * 10}–${i * 10 + 10}%`, X + bw / 2, 236); });
    $('#rPng', box).onclick = () => { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = `توزيع الدرجات - ${e.title}.png`; a.click(); };
    $('#rX', box).onclick = () => { const ws = XLSX.utils.json_to_sheet(all.map(r => ({ الطالب: r.student_name, الفصل: clsName(r.class_id), النموذج: r.model, الدرجة: r.absent ? '' : r.score, 'من': r.max_score, 'النسبة %': r.absent ? '' : pct(r.score, r.max_score), الحضور: r.absent ? 'غائب' : 'حاضر', ...Object.fromEntries(Array.from({ length: e.n_questions }, (_, q) => ['س' + (q + 1), r.absent ? '' : (r.answers[q] >= 0 ? L()[r.answers[q]] : '')])) }))); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'النتائج'); XLSX.writeFile(wb, `نتائج - ${e.title}.xlsx`); };
    $('#rP', box).onclick = () => A.printDoc('نتائج: ' + e.title, `${A.subjName(e.subject_id) || ''} · المتوسط ${avg}٪ · الأعلى ${mx}٪ · الأدنى ${mn}٪`, `<img src="${cv.toDataURL('image/png')}" style="width:100%;margin-bottom:10px"><table><tr><th>الطالب</th><th>الفصل</th><th>النموذج</th><th>الدرجة</th><th>النسبة</th><th>الحضور</th></tr>${all.map(r => `<tr><td>${esc(r.student_name)}</td><td>${esc(clsName(r.class_id))}</td><td>${r.model}</td><td>${r.absent ? '—' : r.score + ' / ' + r.max_score}</td><td>${r.absent ? '—' : pct(r.score, r.max_score) + '%'}</td><td>${r.absent ? 'غائب' : 'حاضر'}</td></tr>`).join('')}</table>`);
    $$('[data-img]', box).forEach(b => b.onclick = () => { const r = all.find(y => y.id === b.dataset.img); A.modal(`<h3>${esc(r.student_name)}</h3><img src="${r.sheet_img}" style="width:100%;border-radius:8px" alt="ورقة الطالب">`, { cls: 'wide' }); });
  }

  // ---------- تحليل الأسئلة ----------
  async function tItems(box, e, root) {
    const pres = (await loadRes(e)).filter(r => !r.absent);
    if (!pres.length) { box.innerHTML = filterUI(e, ctxF) + A.emptyBox('لا توجد نتائج بعد'); bindF(box, () => tItems(box, e, root)); return; }
    const sorted = pres.slice().sort((a, b) => pct(b.score, b.max_score) - pct(a.score, a.max_score)), g = Math.max(1, Math.round(sorted.length * 0.27)), up = sorted.slice(0, g), lo = sorted.slice(-g);
    const key = (r, q) => ((e.models.find(m => m.name === r.model) || e.models[0]).answers[q]);
    const ok = (r, q) => r.answers[q] >= 0 && r.answers[q] === key(r, q);
    const items = Array.from({ length: e.n_questions }, (_, q) => { const dist = Array(e.n_options).fill(0); let blank = 0; pres.forEach(r => { const a = r.answers[q]; if (a >= 0) dist[a]++; else blank++; });
      const p = pres.filter(r => ok(r, q)).length / pres.length, D = up.filter(r => ok(r, q)).length / up.length - lo.filter(r => ok(r, q)).length / lo.length; return { q, dist, blank, p, D, k: e.models[0].answers[q] }; });
    const lvl = p => p >= 0.8 ? ['سهل', 'st-approved'] : p >= 0.4 ? ['متوسط', 'st-submitted'] : ['صعب', 'st-returned'];
    box.innerHTML = filterUI(e, ctxF) + `<p class="small muted">معامل الصعوبة = نسبة من أجاب إجابة صحيحة (كلما ارتفع كان السؤال أسهل). معامل التمييز = الفرق بين أعلى ٢٧٪ وأدنى ٢٧٪ (٠٫٣ فأكثر جيد).${e.models.length > 1 ? ' توزيع البدائل محسوب على إجابات الطلاب كما هي، والإجابة الصحيحة المعروضة لنموذج A.' : ''}</p>
      <div class="scroll"><table class="tbl"><thead><tr><th>س</th><th>الصحيحة</th>${Array.from({ length: e.n_options }, (_, k) => `<th>${L()[k]}</th>`).join('')}<th>فارغ</th><th>الصعوبة</th><th>التمييز</th><th>المستوى</th></tr></thead><tbody>${items.map(it => `<tr><td><b>${AR(it.q + 1)}</b></td><td>${it.k >= 0 ? L()[it.k] : '—'}</td>${it.dist.map((n, k) => `<td class="${k === it.k ? 'it-ok' : ''}">${AR(Math.round(n / pres.length * 100))}٪</td>`).join('')}<td class="faint">${AR(Math.round(it.blank / pres.length * 100))}٪</td><td><b>${AR(it.p.toFixed(2))}</b></td><td style="${it.D < 0.2 ? 'color:var(--bad)' : ''}">${AR(it.D.toFixed(2))}</td><td><span class="pill ${lvl(it.p)[1]}">${lvl(it.p)[0]}</span></td></tr>`).join('')}</tbody></table></div>
      <button class="btn ghost sm" id="iX" style="margin-top:8px">${I.down} Excel</button>`;
    bindF(box, () => tItems(box, e, root));
    $('#iX', box).onclick = () => { const ws = XLSX.utils.json_to_sheet(items.map(it => ({ السؤال: it.q + 1, الصحيحة: it.k >= 0 ? L()[it.k] : '', ...Object.fromEntries(it.dist.map((n, k) => [L()[k] + ' %', Math.round(n / pres.length * 100)])), 'فارغ %': Math.round(it.blank / pres.length * 100), 'معامل الصعوبة': +it.p.toFixed(2), 'معامل التمييز': +it.D.toFixed(2) }))); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'تحليل الأسئلة'); XLSX.writeFile(wb, `تحليل الأسئلة - ${e.title}.xlsx`); };
  }

  // ---------- تحليل المهارات + خطط علاجية ----------
  async function tSkills(box, e, root) {
    const pres = (await loadRes(e)).filter(r => !r.absent);
    const groups = {}; e.skills.forEach((s, q) => { if (!s) return; const k = s.lesson_id || 'n:' + s.name; (groups[k] = groups[k] || { name: s.name || 'مهارة', lesson_id: s.lesson_id || null, qs: [] }).qs.push(q); });
    const G = Object.values(groups);
    if (!G.length) { box.innerHTML = filterUI(e, ctxF) + A.emptyBox('لم يُربط أي سؤال بمهارة بعد', 'اربط الأسئلة بالدروس أو المهارات من تبويب «نماذج الإجابة».'); bindF(box, () => tSkills(box, e, root)); return; }
    const key = (r, q) => ((e.models.find(m => m.name === r.model) || e.models[0]).answers[q]);
    const mast = (r, g) => { let s = 0, m = 0; g.qs.forEach(q => { const w = +(e.weights[q] ?? 1); m += w; if (r.answers[q] >= 0 && r.answers[q] === key(r, q)) s += w; }); return m ? Math.round(s / m * 100) : 0; };
    const gAvg = G.map(g => ({ ...g, p: pres.length ? Math.round(pres.reduce((a, r) => a + mast(r, g), 0) / pres.length) : 0 })).sort((a, b) => a.p - b.p);
    box.innerHTML = filterUI(e, ctxF) + `<div class="grid g2" style="align-items:start"><div class="sec-box"><b>إتقان المهارات (الأضعف أولاً)</b>${gAvg.map(g => `<div style="margin-top:8px"><div class="row" style="justify-content:space-between"><span>${esc(g.name)} <span class="small muted">(${AR(g.qs.length)} س)</span></span><b>${AR(g.p)}٪</b></div>${A.bar(g.p, 100)}</div>`).join('')}</div>
      <div class="sec-box"><b>المهارات التي يحتاج كل طالب دعماً فيها</b><div class="scroll" style="max-height:420px"><table class="tbl"><thead><tr><th>الطالب</th><th>النسبة</th><th>مهارات أقل من ٦٠٪</th></tr></thead><tbody>${pres.map(r => { const w = G.filter(g => mast(r, g) < 60); return `<tr><td><b>${esc(r.student_name)}</b><div class="small muted">${esc(clsName(r.class_id))}</div></td><td>${AR(pct(r.score, r.max_score))}٪</td><td class="small">${esc(w.map(g => g.name).join('، ')) || '<span class="faint">—</span>'}</td></tr>`; }).join('')}</tbody></table></div>
      <button class="btn ok sm" id="sRem" style="margin-top:8px">إنشاء خطط علاجية وإثرائية من النتائج</button></div></div>`;
    bindF(box, () => tSkills(box, e, root));
    $('#sRem', box).onclick = ev => A.run(ev.currentTarget, async () => {
      const rows = pres.map(r => { const p = pct(r.score, r.max_score), gaps = G.map(g => ({ lesson: g.name, lesson_id: g.lesson_id, p: mast(r, g) })).filter(x => x.p < 60).sort((a, b) => a.p - b.p);
        const base = { school_id: S.school.id, teacher_id: S.me.id, student_name: r.student_name, class_id: r.class_id };
        return p >= 90 ? { ...base, kind: 'enrichment', gaps: [], actions: `أنشطة إثرائية بعد «${e.title}».` } : gaps.length ? { ...base, kind: 'remedial', gaps, actions: `مراجعة: ${gaps.slice(0, 3).map(x => x.lesson).join('، ')} — بعد «${e.title}».` } : null; }).filter(Boolean);
      if (!rows.length) return A.toast('لا توجد فجوات تستدعي خططاً');
      await api.ins('remedial_plans', rows); A.toast(`أُنشئت ${AR(rows.length)} خطة — تجدها في «التقويم والاختبارات ← الخطط العلاجية والإثرائية»`, 'ok');
    });
  }

  // ---------- مشاركة النتائج ----------
  async function tShare(box, e, root) {
    const all = (await api.list('paper_results', { exam_id: e.id })).sort((a, b) => clsName(a.class_id).localeCompare(clsName(b.class_id), 'ar') || a.student_name.localeCompare(b.student_name, 'ar'));
    const sh = Object.assign({ on: false, kind: 'result', comment: '', students: [] }, e.share || {}), sel = new Set(sh.students || []);
    const link = r => location.href.split('#')[0].replace(/[^/]*$/, '') + 'student.html?pr=' + r.token;
    const visible = r => sh.on && (!sel.size || sel.has(r.student_id));
    box.innerHTML = `<div class="sec-box" style="margin-top:12px"><b>مشاركة النتائج مع أولياء الأمور</b><p class="small muted" style="margin:4px 0 8px">لكل طالب رابط خاص لا يظهر فيه إلا نتيجته. أرسله لولي الأمر (واتساب أو رسائل). يمكن إيقاف المشاركة في أي وقت فتتوقف الروابط.</p>
      <div class="row" style="gap:12px;flex-wrap:wrap;align-items:flex-end"><label class="chk"><input type="checkbox" id="shOn" ${sh.on ? 'checked' : ''}> المشاركة مفعّلة</label>
        <div class="chip-filter" id="shK" style="margin:0">${[['result', 'النتيجة فقط'], ['sheet', 'النتيجة مع صورة الورقة']].map(([k, l]) => `<button data-v="${k}" class="${sh.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="field" style="margin:0;flex:1;min-width:240px"><label for="shC">تعليق المعلم (يظهر لولي الأمر)</label><input class="in" id="shC" value="${esc(sh.comment || '')}" placeholder="مثال: نرجو متابعة مهارة الكسور في المنزل"></div><button class="btn" id="shS">حفظ</button></div></div>
      <div class="row" style="gap:8px;margin:10px 0"><span class="small muted">اترك الكل غير محدد لمشاركة جميع الطلاب، أو حدّد طلاباً بعينهم.</span><div class="grow"></div><button class="btn ghost sm" id="shCopy">نسخ كل الروابط</button></div>
      <div class="scroll"><table class="tbl"><thead><tr><th></th><th>الطالب</th><th>الفصل</th><th>النتيجة</th><th>الرابط</th></tr></thead><tbody>${all.map(r => `<tr><td><input type="checkbox" data-sel="${r.student_id}" ${sel.has(r.student_id) ? 'checked' : ''} aria-label="تحديد ${esc(r.student_name)}"></td><td><b>${esc(r.student_name)}</b></td><td>${esc(clsName(r.class_id))}</td><td>${r.absent ? 'غائب' : AR(r.score) + ' / ' + AR(r.max_score)}</td><td>${visible(r) ? `<button class="btn ghost sm" data-cp="${r.id}">نسخ</button> <a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`نتيجة ${r.student_name} في «${e.title}»: ${link(r)}`)}">واتساب</a>` : '<span class="faint small">غير مشارك</span>'}</td></tr>`).join('') || `<tr><td colspan="5">${A.emptyBox('لا توجد نتائج بعد')}</td></tr>`}</tbody></table></div>`;
    $$('#shK button', box).forEach(b => b.onclick = () => { sh.kind = b.dataset.v; $$('#shK button', box).forEach(x => x.classList.toggle('on', x === b)); });
    $('#shS', box).onclick = ev => A.run(ev.currentTarget, async () => { sh.on = $('#shOn', box).checked; sh.comment = $('#shC', box).value.trim(); sh.students = $$('[data-sel]:checked', box).map(i => i.dataset.sel); await saveExam(e, { share: sh }); A.toast(sh.on ? 'فُعّلت المشاركة' : 'أُوقفت المشاركة', 'ok'); tShare(box, e, root); });
    $$('[data-cp]', box).forEach(b => b.onclick = () => { const r = all.find(x => x.id === b.dataset.cp); navigator.clipboard.writeText(link(r)).then(() => A.toast('نُسخ الرابط', 'ok')); });
    $('#shCopy', box).onclick = () => { const L2 = all.filter(visible).map(r => `${r.student_name} (${clsName(r.class_id)}): ${link(r)}`); if (!L2.length) return A.toast('فعّل المشاركة واحفظ أولاً', 'warn'); navigator.clipboard.writeText(L2.join('\n')).then(() => A.toast(`نُسخت ${AR(L2.length)} روابط`, 'ok')); };
  }

  // ===================== اللجان =====================
  async function committees(box, root) {
    const list = (await api.list('exam_committees', { school_id: S.school.id }, { order: 'created_at', desc: true })).filter(c => !c.section_id || c.section_id === S.sectionId);
    box.innerHTML = `<div class="row" style="gap:8px;margin:10px 0"><span class="small muted">توزيع الطلاب على لجان الاختبار بأرقام جلوس، مع كشوف التوقيع وملصقات الأبواب وبطاقات المقاعد.</span><div class="grow"></div><button class="btn" id="cNew">${I.plus} لجان جديدة</button></div>
      <div class="scroll"><table class="tbl"><thead><tr><th>العنوان</th><th>الفصول</th><th>عدد اللجان</th><th>الطلاب</th><th>التاريخ</th><th></th></tr></thead><tbody>${list.map(c => `<tr><td><b>${esc(c.title)}</b></td><td class="small">${esc(c.class_ids.map(clsName).join('، '))}</td><td>${AR(c.rooms.length)}</td><td>${AR(c.seating.length)}</td><td class="small">${A.fmtDT(c.created_at)}</td><td><button class="btn ghost sm" data-p="${c.id}">طباعة</button> <button class="btn bad sm" data-d="${c.id}" aria-label="حذف">×</button></td></tr>`).join('') || `<tr><td colspan="6">${A.emptyBox('لا توجد لجان بعد')}</td></tr>`}</tbody></table></div>`;
    $('#cNew', box).onclick = () => newCommittee(root);
    $$('[data-p]', box).forEach(b => b.onclick = () => printCommittee(list.find(c => c.id === b.dataset.p)));
    $$('[data-d]', box).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذا التوزيع؟', 'حذف', true))) return; await api.del('exam_committees', b.dataset.d); V.paper(root); });
  }
  function newCommittee(root) {
    const cls = S.classes.filter(c => c.active), staff = S.staff.filter(p => p.active).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
    const m = A.modal(`<h3>توزيع لجان جديد</h3><div class="grid g2"><div class="field"><label for="cT">العنوان</label><input class="in" id="cT" placeholder="مثال: اختبارات الفترة الأولى"></div>
        <div class="field"><label for="cMode">طريقة التوزيع</label><select class="in" id="cMode"><option value="mix">خلط الصفوف بالتناوب (يمنع جلوس طالبين من الفصل نفسه متجاورين)</option><option value="alpha">أبجدي حسب الفصل</option></select></div></div>
      <div class="field"><label>الفصول</label><div class="perm-grid" id="cC">${cls.map(c => `<label class="chk small"><input type="checkbox" value="${c.id}"> ${esc(c.name)}</label>`).join('')}</div></div>
      <div class="field"><label>اللجان (سطر لكل لجنة: الاسم | السعة)</label><textarea class="in" id="cR" rows="5" placeholder="لجنة ١ — قاعة ١٠١ | 20&#10;لجنة ٢ — قاعة ١٠٢ | 20"></textarea></div>
      <div class="field"><label>الملاحظون (اختياري — بالترتيب على اللجان)</label><select class="in" id="cP" multiple size="5">${staff.map(p => `<option value="${p.id}">${esc(p.full_name)}</option>`).join('')}</select></div>
      <div class="acts"><button class="btn" id="cGo">توزيع</button></div>`, { cls: 'wide' });
    m.el.querySelector('#cGo').onclick = ev => A.run(ev.currentTarget, async () => {
      const title = m.el.querySelector('#cT').value.trim() || 'لجان الاختبار', ids = $$('#cC input:checked', m.el).map(i => i.value); if (!ids.length) throw new Error('اختر فصلاً واحداً على الأقل');
      const rooms = m.el.querySelector('#cR').value.split(/\n/).map(l => l.trim()).filter(Boolean).map((l, i) => { const [n, c] = l.split('|').map(x => x.trim()); return { name: n || 'لجنة ' + (i + 1), capacity: Math.max(1, parseInt(String(c || '20').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), 10) || 20) }; });
      if (!rooms.length) throw new Error('أضف لجنة واحدة على الأقل');
      const pr = [...m.el.querySelector('#cP').selectedOptions].map(o => o.value); rooms.forEach((r, i) => { if (pr[i]) r.proctor = pr[i]; });
      const stu = await api.list('students', { class_id: ids, active: true }); if (!stu.length) throw new Error('لا يوجد طلاب في الفصول المختارة');
      const cap = rooms.reduce((a, r) => a + r.capacity, 0); if (cap < stu.length) throw new Error(`سعة اللجان ${cap} أقل من عدد الطلاب ${stu.length}`);
      const byC = ids.map(c => stu.filter(s => s.class_id === c).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar')));
      let order = []; if (m.el.querySelector('#cMode').value === 'mix') { const mxL = Math.max(...byC.map(x => x.length)); for (let i = 0; i < mxL; i++) byC.forEach(l => { if (l[i]) order.push(l[i]); }); } else order = byC.flat();
      const seating = []; let ri = 0, inRoom = 0; order.forEach((s, i) => { while (inRoom >= rooms[ri].capacity) { ri++; inRoom = 0; } inRoom++; seating.push({ seat: i + 1, student_id: s.id, name: s.full_name, class_id: s.class_id, room: ri }); });
      await api.ins('exam_committees', { school_id: S.school.id, section_id: S.sectionId, title, class_ids: ids, rooms, seating, settings: { mode: m.el.querySelector('#cMode').value }, created_by: S.me.id });
      m.close(); A.toast(`وُزّع ${AR(seating.length)} طالباً على ${AR(rooms.filter((_, i) => seating.some(x => x.room === i)).length)} لجنة`, 'ok'); V.paper(root);
    });
  }
  function printCommittee(c) {
    const m = A.modal(`<h3>طباعة — ${esc(c.title)}</h3><div class="acts" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn" data-k="lists">كشوف اللجان مع التوقيع</button><button class="btn ghost" data-k="doors">ملصقات الأبواب</button><button class="btn ghost" data-k="cards">بطاقات المقاعد</button></div>`);
    $$('[data-k]', m.el).forEach(b => b.onclick = () => { m.close(); const k = b.dataset.k;
      if (k === 'lists') A.printDoc(c.title, 'كشوف اللجان', c.rooms.map((r, i) => { const L2 = c.seating.filter(s => s.room === i); if (!L2.length) return ''; return `<h3 style="page-break-before:${i ? 'always' : 'auto'}">${esc(r.name)} — ${AR(L2.length)} طالباً${r.proctor ? ' · الملاحظ: ' + esc(A.personName(r.proctor)) : ''}</h3><table><tr><th>رقم الجلوس</th><th>الطالب</th><th>الفصل</th><th>الحضور</th><th>التوقيع</th></tr>${L2.map(s => `<tr><td><b>${s.seat}</b></td><td style="text-align:right">${esc(s.name)}</td><td>${esc(clsName(s.class_id))}</td><td></td><td style="width:30%"></td></tr>`).join('')}</table>`; }).join(''));
      else if (k === 'doors') A.printDoc(c.title, 'ملصقات أبواب اللجان', c.rooms.map((r, i) => { const L2 = c.seating.filter(s => s.room === i); if (!L2.length) return ''; return `<div style="page-break-before:${i ? 'always' : 'auto'};text-align:center;padding-top:40mm"><div style="font-size:54px;font-weight:800">${esc(r.name)}</div><div style="font-size:30px;margin-top:10mm">أرقام الجلوس ${L2[0].seat} — ${L2[L2.length - 1].seat}</div><div style="font-size:20px;margin-top:8mm;color:#005499">${esc([...new Set(L2.map(s => clsName(s.class_id)))].join('، '))}</div></div>`; }).join(''));
      else A.printDoc(c.title, 'بطاقات المقاعد', `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4mm">${c.seating.map(s => `<div style="border:1.5px solid #082B5A;border-radius:3mm;padding:4mm;text-align:center;break-inside:avoid"><div style="font-size:28px;font-weight:800">${s.seat}</div><div style="font-size:13px">${esc(s.name)}</div><div style="font-size:11px;color:#005499">${esc(clsName(s.class_id))} · ${esc(c.rooms[s.room].name)}</div></div>`).join('')}</div>`); });
  }
})();
