/* منصة دينا — الاختبارات الورقية والتصحيح الآلي + اللجان
   أنواع أسئلة متعددة في الورقة نفسها (اختيار من متعدد، صح وخطأ، مزاوجة بأبجد هوز حطي كلمن أو A–N)، نماذج عربية وإنجليزية،
   أوراق تظليل بأسماء الطلاب من قاعدة البيانات، تصحيح آلي من المسح، استيراد نتائج جاهزة من Excel، تحليل الاختبارات الإلكترونية،
   تحليل الأسئلة والمهارات، تقرير شامل يُصدَّر ويُرسل للزملاء، مشاركة النتائج مع أولياء الأمور، ولجان بتوزيع مرن. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, I } = A;
  A.I.paper = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="9" cy="9" r="1.6"/><circle cx="15" cy="9" r="1.6" fill="currentColor"/><circle cx="9" cy="15" r="1.6" fill="currentColor"/><circle cx="15" cy="15" r="1.6"/></svg>';
  const KINDS = { diagnostic: 'تشخيصي', periodic: 'فتري', final: 'نهائي', quiz: 'قصير' };
  const QT = { mcq: 'اختيار من متعدد', tf: 'صح وخطأ', match: 'مزاوجة' }, QT_EN = { mcq: 'Multiple choice', tf: 'True / False', match: 'Matching' };
  const MODELS = ['A', 'B', 'C', 'D'];
  const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
  const clsName = id => (A.cls(id) || {}).name || '';
  const realMe = () => S.realMe || S.me;
  const lead = () => realMe().is_owner || (A.hasModule && A.hasModule('supervision'));
  const mine = e => e.teacher_id === S.me.id || (e.teachers || []).includes(S.me.id);
  const canSee = e => lead() || mine(e);
  const canEdit = e => lead() || mine(e);
  const specOf = e => e.spec && (e.spec.parts || []).length ? e.spec : { lang: 'ar', parts: [{ type: 'mcq', count: e.n_questions, options: e.n_options }] };
  const QS = e => DinaOMR.expand(specOf(e)).qs;
  const isEn = e => specOf(e).lang === 'en';
  const lab = (e, q, k) => k >= 0 ? ((QS(e)[q] || {}).lab || [])[k] || '?' : k === -2 ? '⚠' : '—';
  const keyOf = (e, r) => (e.models.find(m => m.name === (r && r.model)) || e.models[0] || { answers: [] }).answers;
  const W = (e, q) => +(e.weights[q] ?? 1);
  const scoreOf = (e, model, ans, marks) => { const key = (e.models.find(m => m.name === model) || e.models[0] || { answers: [] }).answers; let s = 0, mx = 0; for (let q = 0; q < e.n_questions; q++) { const w = W(e, q); mx += w; if (marks && marks[q] != null && marks[q] !== '') s += Math.min(w, Math.max(0, +marks[q] || 0)); else if (!marks && ans[q] !== undefined && ans[q] >= 0 && ans[q] === key[q]) s += w; } return [Math.round(s * 100) / 100, mx]; };
  const okQ = (e, r, q) => r.marks ? (+r.marks[q] || 0) >= W(e, q) / 2 : (r.answers[q] >= 0 && r.answers[q] === keyOf(e, r)[q]);
  const skey = (sid, name, cls) => sid || ('n:' + A.normKey(name || '') + '|' + (cls || ''));
  const legend = e => { const sp = specOf(e), en = sp.lang === 'en', L = DinaOMR.LABELS[en ? 'en' : 'ar']; let q = 1; return sp.parts.map(p => { const a = q, b = q + (+p.count || 0) - 1; q = b + 1; const n = p.type === 'tf' ? 2 : +p.options || 4, ls = L[p.type || 'mcq'].slice(0, n); return `${a}–${b}: ${(en ? QT_EN : QT)[p.type || 'mcq']}${p.type === 'tf' ? (en ? ' (T = True, F = False)' : ' (ص = صح، خ = خطأ)') : ` (${ls[0]}–${ls[ls.length - 1]})`}`; }).join(' · '); };
  let st = { view: 'list', exam: null, tab: 'key' };
  async function roster(e) { const ids = e.class_ids || []; if (!ids.length) return []; let l = []; try { l = await api.list('students', { class_id: ids, active: true }); } catch (_) {} return l.sort((a, b) => clsName(a.class_id).localeCompare(clsName(b.class_id), 'ar') || a.full_name.localeCompare(b.full_name, 'ar')); }
  // تحويل حرف/كلمة إجابة إلى رقم البديل حسب نوع السؤال (يقبل العربية والإنجليزية والأرقام)
  const TF_WORDS = { 'ص': 0, 'صح': 0, 'صواب': 0, 't': 0, 'true': 0, '√': 0, '✓': 0, 'خ': 1, 'خطأ': 1, 'خطا': 1, 'f': 1, 'false': 1, '×': 1, 'x': 1 };
  function parseAns(Q, tok) {
    tok = String(tok == null ? '' : tok).trim(); if (!tok || tok === '-' || tok === '—') return -1;
    const t = tok.toLowerCase().replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    if (Q.type === 'tf' && t in TF_WORDS) return TF_WORDS[t];
    if (/^\d+$/.test(t)) { const n = +t - 1; return n >= 0 && n < Q.n ? n : -1; }
    const AR_ = DinaOMR.LABELS.ar[Q.type || 'mcq'] || [], EN_ = DinaOMR.LABELS.en[Q.type || 'mcq'] || [];
    let i = AR_.indexOf(tok); if (i < 0 && tok === 'ه') i = AR_.indexOf('هـ'); if (i < 0) i = EN_.findIndex(x => x.toLowerCase() === t);
    return i >= 0 && i < Q.n ? i : -1;
  }
  const tokens = s => { s = String(s || '').trim(); if (/[\s,،;|]/.test(s)) return s.split(/[\s,،;|]+/).filter(Boolean); const out = []; for (let i = 0; i < s.length; i++) { if (s[i + 1] === 'ـ') { out.push(s[i] + 'ـ'); i++; } else out.push(s[i]); } return out; };
  const ansText = (e, ans) => QS(e).map((Q, q) => ans[q] >= 0 ? Q.lab[ans[q]] : '-').join(' ');

  // ===================== القائمة =====================
  V.paper = async function (root) {
    if (!(A.canAssess && A.canAssess())) { root.innerHTML = `<div class="card">${A.emptyBox('هذا البند غير مفعّل لحسابك', 'يفعّله مالك النظام.')}</div>`; return; }
    if (st.view === 'exam' && st.exam) return examView(root);
    const top = A.LS.get('pp_t') || 'exams';
    root.innerHTML = `<div class="pp-wrap"><div class="row" style="gap:8px;flex-wrap:wrap;margin:8px 0"><div class="chip-filter" id="ppT" style="margin:0"><button data-t="exams" class="${top === 'exams' ? 'on' : ''}">الاختبارات الورقية</button><button data-t="comm" class="${top === 'comm' ? 'on' : ''}">لجان الاختبارات</button></div></div><div id="ppB"><div class="spinner"></div></div></div>`;
    $$('#ppT button', root).forEach(b => b.onclick = () => { A.LS.set('pp_t', b.dataset.t); V.paper(root); });
    if (top === 'comm') return committees($('#ppB', root), root);
    const all = (await api.list('paper_exams', { school_id: S.school.id }, { order: 'created_at', desc: true })).filter(e => (!e.section_id || e.section_id === S.sectionId) && canSee(e));
    const box = $('#ppB', root);
    box.innerHTML = `<div class="row" style="gap:8px;margin:6px 0 10px;flex-wrap:wrap"><input class="in" id="ppQ" placeholder="بحث باسم الاختبار" style="max-width:240px"><div class="grow"></div>
        <button class="btn ghost sm" id="ppQz">تحليل اختبار إلكتروني</button><button class="btn ghost sm" id="ppRd">تحليل اختبار جاهز (Excel)</button><button class="btn" id="ppNew">${I.plus} اختبار ورقي جديد</button></div>
      <div class="scroll"><table class="tbl"><thead><tr><th>الاختبار</th><th>المادة</th><th>النوع</th><th>الأسئلة</th><th>الفصول</th><th>المعلمون</th><th>التاريخ</th><th></th></tr></thead><tbody id="ppL"></tbody></table></div>`;
    const draw = () => { const q = A.normKey($('#ppQ', box).value || ''); $('#ppL', box).innerHTML = all.filter(e => !q || A.normKey(e.title).includes(q)).map(e => `<tr class="click" data-o="${e.id}"><td><b>${esc(e.title)}</b>${e.source && e.source.quiz_id ? ' <span class="pill st-submitted">إلكتروني</span>' : e.source && e.source.import ? ' <span class="pill st-empty">مستورد</span>' : ''}${isEn(e) ? ' <span class="pill st-empty">EN</span>' : ''}</td><td>${esc(A.subjName(e.subject_id) || '—')}</td><td><span class="pill st-submitted">${KINDS[e.kind] || e.kind}</span></td><td class="small">${AR(e.n_questions)} · ${esc(specOf(e).parts.map(p => QT[p.type || 'mcq']).filter((v, i, a) => a.indexOf(v) === i).join('، '))}</td><td class="small">${esc((e.class_ids || []).map(clsName).join('، '))}</td><td class="small">${esc([e.teacher_id, ...(e.teachers || [])].filter(Boolean).map(A.personName).join('، '))}</td><td class="small">${e.exam_date ? AR(e.exam_date) : '—'}</td><td>${canEdit(e) ? `<button class="btn bad sm" data-d="${e.id}" aria-label="حذف">×</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="8">${A.emptyBox('لا توجد اختبارات ورقية بعد', 'ابدأ من «اختبار ورقي جديد»، أو حلّل اختباراً جاهزاً أو إلكترونياً.')}</td></tr>`;
      $$('[data-o]', box).forEach(r => r.onclick = ev => { if (ev.target.closest('[data-d]')) return; st = { view: 'exam', exam: all.find(x => x.id === r.dataset.o), tab: 'key' }; V.paper(root); });
      $$('[data-d]', box).forEach(b => b.onclick = async () => { const e = all.find(x => x.id === b.dataset.d); if (!(await A.confirmBox(`حذف «${esc(e.title)}» ونتائجه نهائياً؟`, 'حذف', true))) return; await api.del('paper_exams', e.id); all.splice(all.indexOf(e), 1); draw(); }); };
    $('#ppQ', box).oninput = draw; draw();
    $('#ppNew', box).onclick = () => editExam(null, root);
    $('#ppRd', box).onclick = () => editExam(null, root, { import: true });
    $('#ppQz', box).onclick = () => fromQuiz(root);
  };

  // ---------- إنشاء / تعديل الاختبار ----------
  function editExam(e, root, opt = {}) {
    const cls = S.classes.filter(c => c.active), isNew = !e;
    e = e || { title: '', kind: 'diagnostic', n_questions: 20, n_options: 4, class_ids: [], models: [{ name: 'A', answers: [] }], weights: [], skills: [], teachers: [], subject_id: (S.subjects[0] || {}).id, spec: { lang: 'ar', parts: [{ type: 'mcq', count: 20, options: 4 }] } };
    const sp = JSON.parse(JSON.stringify(specOf(e)));
    const staff = S.staff.filter(p => p.active && !p.is_owner && p.id !== S.me.id).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
    const m = A.modal(`<h3>${isNew ? (opt.import ? 'تحليل اختبار جاهز' : 'اختبار ورقي جديد') : 'تعديل الاختبار'}</h3>
      ${opt.import ? '<p class="sub">عرّف الاختبار وأقسام أسئلته، ثم استورد نتائجه من Excel من تبويب «التصحيح» (إجابات الطلاب بالحروف أو درجات كل سؤال) ليُحلَّل كاملاً.</p>' : ''}
      <div class="grid g2"><div class="field"><label for="peT">اسم الاختبار</label><input class="in" id="peT" value="${esc(e.title)}" placeholder="مثال: رياضيات ٤ — التشخيصي ١"></div>
        <div class="field"><label for="peS">المادة</label><select class="in" id="peS">${S.subjects.map(s => `<option value="${s.id}" ${s.id === e.subject_id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="peK">نوع الاختبار</label><select class="in" id="peK">${Object.entries(KINDS).map(([k, l]) => `<option value="${k}" ${e.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="peD">التاريخ</label><input class="in" type="date" id="peD" value="${e.exam_date || ''}"></div>
        <div class="field"><label for="peL">لغة الورقة</label><select class="in" id="peL"><option value="ar" ${sp.lang !== 'en' ? 'selected' : ''}>العربية (أ ب ج د · ص/خ · أبجد هوز)</option><option value="en" ${sp.lang === 'en' ? 'selected' : ''}>English (A B C D · T/F · A–N)</option></select></div>
        <div class="field"><label for="peM">عدد نماذج الإجابة</label><select class="in" id="peM">${[1, 2, 3, 4].map(n => `<option ${e.models.length === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div></div>
      <div class="sec-box"><div class="row" style="justify-content:space-between"><b>أقسام الأسئلة</b><span class="small" id="peTot"></span></div><div id="peP" style="margin-top:8px"></div><button class="btn ghost sm" id="pePA" type="button">${I.plus} قسم أسئلة</button></div>
      <div class="field"><label>الفصول</label><div class="perm-grid" id="peC">${cls.map(c => `<label class="chk small"><input type="checkbox" value="${c.id}" ${e.class_ids.includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div></div>
      <details class="sec-box" ${(e.teachers || []).length ? 'open' : ''}><summary><b>معلمون مشاركون في الاختبار</b> <span class="small muted">(يرون الاختبار ويصححون ويحللون)</span></summary><input class="in" id="peTq" placeholder="بحث بالاسم" style="margin:8px 0 6px;max-width:260px"><div class="perm-grid" id="peTs" style="max-height:180px;overflow:auto">${staff.map(p => `<label class="chk small"><input type="checkbox" value="${p.id}" ${(e.teachers || []).includes(p.id) ? 'checked' : ''}> ${esc(p.full_name)}</label>`).join('')}</div></details>
      <div class="acts"><button class="btn" id="peGo">${isNew ? 'إنشاء' : 'حفظ'}</button></div>`, { cls: 'wide' });
    const P = m.el.querySelector('#peP');
    const drawP = () => {
      const tot = sp.parts.reduce((a, p) => a + (+p.count || 0), 0), ok = tot > 0 && tot <= 100 && DinaOMR.capacity(sp);
      P.innerHTML = sp.parts.map((p, i) => `<div class="row pe-part" style="gap:6px;flex-wrap:wrap;margin-bottom:6px"><b class="small" style="min-width:52px">القسم ${AR(i + 1)}</b>
        <select class="in" data-pt="${i}" style="max-width:170px">${Object.entries(QT).map(([k, l]) => `<option value="${k}" ${p.type === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <label class="small">عدد الأسئلة <input class="in" type="number" min="1" max="100" data-pc="${i}" value="${p.count}" style="width:76px"></label>
        ${p.type === 'tf' ? '<span class="small muted">بديلان</span>' : `<label class="small">${p.type === 'match' ? 'عدد البدائل (حتى ١٤)' : 'عدد الفقرات'} <input class="in" type="number" min="2" max="${p.type === 'match' ? 14 : 5}" data-po="${i}" value="${p.options || 4}" style="width:70px"></label>`}
        ${sp.parts.length > 1 ? `<button class="btn bad sm" type="button" data-pr="${i}" aria-label="حذف القسم">×</button>` : ''}</div>`).join('');
      m.el.querySelector('#peTot').innerHTML = `${AR(tot)} سؤالاً ${ok ? '' : `<b style="color:var(--bad)">— ${tot > 100 ? 'الحد ١٠٠ سؤال' : 'أكبر من سعة ورقة واحدة: قلّل الأسئلة أو البدائل'}</b>`}`;
      $$('[data-pt]', P).forEach(s => s.onchange = () => { const p = sp.parts[+s.dataset.pt]; p.type = s.value; p.options = s.value === 'match' ? Math.max(p.options || 4, 6) : s.value === 'tf' ? 2 : Math.min(p.options || 4, 5); drawP(); });
      $$('[data-pc]', P).forEach(i => i.onchange = () => { sp.parts[+i.dataset.pc].count = Math.max(1, Math.min(100, +i.value || 1)); setTimeout(drawP); });
      $$('[data-po]', P).forEach(i => i.onchange = () => { const p = sp.parts[+i.dataset.po]; p.options = Math.max(2, Math.min(p.type === 'match' ? 14 : 5, +i.value || 4)); setTimeout(drawP); });
      $$('[data-pr]', P).forEach(b => b.onclick = () => { sp.parts.splice(+b.dataset.pr, 1); drawP(); });
    };
    m.el.querySelector('#pePA').onclick = () => { sp.parts.push({ type: 'tf', count: 10, options: 2 }); drawP(); };
    m.el.querySelector('#peTq').oninput = ev => { const q = A.normKey(ev.target.value); $$('#peTs label', m.el).forEach(l => l.style.display = !q || A.normKey(l.textContent).includes(q) ? '' : 'none'); };
    drawP();
    m.el.querySelector('#peGo').onclick = ev => A.run(ev.currentTarget, async () => {
      const title = m.el.querySelector('#peT').value.trim(); if (!title) throw new Error('اكتب اسم الاختبار');
      sp.lang = m.el.querySelector('#peL').value;
      const n = sp.parts.reduce((a, p) => a + (+p.count || 0), 0); if (!n || n > 100) throw new Error('عدد الأسئلة بين ١ و١٠٠'); if (!DinaOMR.capacity(sp)) throw new Error('الأسئلة أكبر من سعة ورقة تظليل واحدة — قلّل عدد الأسئلة أو بدائل المزاوجة');
      const ids = $$('#peC input:checked', m.el).map(i => i.value); if (!ids.length) throw new Error('اختر فصلاً واحداً على الأقل');
      const qs = DinaOMR.expand(sp).qs, nm = +m.el.querySelector('#peM').value;
      const models = MODELS.slice(0, nm).map((x, i) => ({ name: x, answers: Array.from({ length: n }, (_, q) => { const v = ((e.models[i] || {}).answers || [])[q]; return v != null && v >= 0 && v < qs[q].n ? v : -1; }) }));
      const mcq = sp.parts.filter(p => p.type === 'mcq').map(p => +p.options || 4);
      const row = { title, subject_id: m.el.querySelector('#peS').value, kind: m.el.querySelector('#peK').value, exam_date: m.el.querySelector('#peD').value || null, n_questions: n, n_options: Math.max(2, Math.min(5, mcq.length ? Math.max(...mcq) : 4)), spec: sp, class_ids: ids, models, weights: Array.from({ length: n }, (_, q) => e.weights[q] ?? 1), skills: Array.from({ length: n }, (_, q) => e.skills[q] || null), teachers: $$('#peTs input:checked', m.el).map(i => i.value), ...(opt.import && isNew ? { source: { import: true } } : {}) };
      let saved; if (isNew) saved = (await api.ins('paper_exams', { ...row, school_id: S.school.id, section_id: S.sectionId, teacher_id: S.me.id }))[0]; else saved = (await api.upd('paper_exams', e.id, row)) || { ...e, ...row };
      m.close(); st = { view: 'exam', exam: saved, tab: opt.import ? 'grade' : isNew ? 'key' : st.tab }; V.paper(root);
    });
  }

  // ---------- تحليل اختبار إلكتروني (من بنك الاختبارات) ----------
  async function fromQuiz(root) {
    const qz = (await api.list('quizzes', { school_id: S.school.id }, { order: 'created_at', desc: true })).filter(z => z.status !== 'draft' && (lead() || z.teacher_id === S.me.id));
    const m = A.modal(`<h3>تحليل اختبار إلكتروني</h3><p class="sub">تُنقل محاولات الطلاب (أفضل محاولة لكل طالب) إلى محرك التحليل: توزيع الدرجات، الصعوبة والتمييز، المهارات، التقرير الشامل والإرسال. أسئلة الاختيار من متعدد والصح والخطأ تُحلَّل بالبدائل، وبقية الأنواع بالدرجة.</p>
      ${qz.length ? `<div class="field"><label for="qzS">الاختبار</label><select class="in" id="qzS">${qz.map(z => `<option value="${z.id}">${esc(z.title)} — ${esc(A.subjName(z.subject_id) || '')}</option>`).join('')}</select></div><div class="acts"><button class="btn" id="qzGo">تحليل</button></div>` : A.emptyBox('لا توجد اختبارات إلكترونية منشورة', 'أنشئها من تبويب «الاختبارات الإلكترونية وأوراق العمل».')}`, { cls: 'wide' });
    const go = m.el.querySelector('#qzGo'); if (!go) return;
    go.onclick = ev => A.run(ev.currentTarget, async () => {
      const z = qz.find(x => x.id === m.el.querySelector('#qzS').value);
      const qb = await api.list('questions', { id: z.question_ids }); const Qs = z.question_ids.map(id => qb.find(q => q.id === id)).filter(Boolean);
      if (!Qs.length) throw new Error('لا توجد أسئلة في هذا الاختبار');
      const at = await api.list('quiz_attempts', { quiz_id: z.id }); if (!at.length) throw new Error('لا توجد محاولات للطلاب بعد');
      const best = {}; at.forEach(a => { const k = A.normKey(a.student_name) + '|' + a.class_id; if (!best[k] || a.score >= best[k].score) best[k] = a; });
      // الأقسام: كل سؤال بنوعه، ونجمع المتتالي من النوع نفسه
      const parts = []; Qs.forEach(q => { const t = q.qtype === 'mcq' ? 'mcq' : q.qtype === 'tf' ? 'tf' : 'mcq', o = q.qtype === 'mcq' ? Math.max(2, Math.min(5, (q.options || []).length || 4)) : 2; const last = parts[parts.length - 1]; if (last && last.type === t && (t === 'tf' || last.options === o)) last.count++; else parts.push({ type: t, count: 1, options: o }); });
      const key = Qs.map(q => q.qtype === 'mcq' ? (q.options || []).findIndex(o => o.ok) : q.qtype === 'tf' ? (/^(صواب|صح|true)/i.test(String(q.answer)) ? 0 : 1) : -1);
      const markMode = Qs.some(q => q.qtype !== 'mcq' && q.qtype !== 'tf');
      const cls = [...new Set(Object.values(best).map(a => a.class_id).filter(Boolean))];
      const ex = (await api.ins('paper_exams', { school_id: S.school.id, section_id: S.sectionId, teacher_id: S.me.id, title: 'تحليل: ' + z.title, subject_id: z.subject_id, kind: 'quiz', n_questions: Qs.length, n_options: 4, spec: { lang: 'ar', parts }, class_ids: cls.length ? cls : (z.class_ids || []), models: [{ name: 'A', answers: key }], weights: Qs.map(q => +q.points || 1), skills: Qs.map(q => q.lesson_id ? { lesson_id: q.lesson_id, name: q.skill || null } : (q.skill ? { name: q.skill } : null)), source: { quiz_id: z.id } }))[0];
      const R = await roster(ex);
      const rows = Object.values(best).map(a => { const ans = Qs.map(q => { const v = (a.answers || {})[q.id]; if (q.qtype === 'mcq') return v === undefined || v === '' ? -1 : +v; if (q.qtype === 'tf') return v === 'صواب' ? 0 : v === 'خطأ' ? 1 : -1; return -1; });
        const marks = markMode ? Qs.map((q, i) => { const pq = (a.per_q || {})[q.id]; if (q.qtype === 'mcq' || q.qtype === 'tf') return ans[i] >= 0 && ans[i] === key[i] ? (+q.points || 1) : 0; return pq && pq.score != null ? +pq.score : pq && pq.ok ? (+q.points || 1) : 0; }) : null;
        const s = R.find(x => A.normKey(x.full_name) === A.normKey(a.student_name) && x.class_id === a.class_id), [score, mx] = scoreOf(ex, 'A', ans, marks);
        return { exam_id: ex.id, student_id: s ? s.id : null, student_name: a.student_name, class_id: a.class_id, model: 'A', answers: ans, marks, score, max_score: mx, absent: false, skey: skey(s && s.id, a.student_name, a.class_id), updated_at: new Date().toISOString() }; });
      await api.ups('paper_results', rows, 'exam_id,skey');
      m.close(); A.toast(`نُقلت ${AR(rows.length)} نتيجة للتحليل`, 'ok'); st = { view: 'exam', exam: ex, tab: 'results' }; V.paper(root);
    });
  }

  // ===================== صفحة الاختبار =====================
  async function examView(root) {
    const e = st.exam, ed = canEdit(e);
    const tabs = [['key', 'نماذج الإجابة'], ['sheets', 'طباعة الأوراق'], ['grade', 'التصحيح والاستيراد'], ['results', 'النتائج'], ['items', 'تحليل الأسئلة'], ['skills', 'تحليل المهارات'], ['report', 'التقرير والإرسال'], ['share', 'أولياء الأمور']];
    root.innerHTML = `<div class="pp-wrap"><div class="head" style="margin-top:6px"><div class="grow"><button class="btn ghost sm" id="peBack">→ كل الاختبارات</button><h2 style="margin:8px 0 0">${esc(e.title)}</h2><p class="sub" style="margin:2px 0 0">${esc(A.subjName(e.subject_id) || '')} · ${KINDS[e.kind] || ''} · ${AR(e.n_questions)} سؤالاً (${esc(specOf(e).parts.map(p => `${QT[p.type || 'mcq']} ${AR(p.count)}`).join('، '))})${isEn(e) ? ' · English' : ''} · ${esc(e.class_ids.map(clsName).join('، '))}${e.exam_date ? ' · ' + AR(e.exam_date) : ''}</p></div>${ed ? '<button class="btn ghost sm" id="peEd">تعديل البيانات والأقسام والمعلمين</button>' : ''}</div>
      <div class="tabs" id="peTabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${st.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="peB"><div class="spinner"></div></div></div>`;
    $('#peBack', root).onclick = () => { st = { view: 'list' }; V.paper(root); };
    const eb = $('#peEd', root); if (eb) eb.onclick = () => editExam(e, root);
    $$('#peTabs button', root).forEach(b => b.onclick = () => { st.tab = b.dataset.t; examView(root); });
    const box = $('#peB', root);
    ({ key: tKey, sheets: tSheets, grade: tGrade, results: tResults, items: tItems, skills: tSkills, report: tReport, share: tShare })[st.tab](box, e, root);
  }
  const saveExam = async (e, patch) => { const r = await api.upd('paper_exams', e.id, patch); Object.assign(e, r || patch); };

  // ---------- نماذج الإجابة والدرجات والمهارات ----------
  async function tKey(box, e) {
    const ed = canEdit(e), qs = QS(e), parts = specOf(e).parts; let mi = 0;
    const gk = (() => { const c = A.cls(e.class_ids[0]) || {}; return c.stage + '|' + c.grade_word; })();
    let lessons = []; try { lessons = await api.list('curriculum', { school_id: S.school.id, subject_id: e.subject_id, grade_key: gk }, { order: 'sort' }); } catch (_) {}
    const draw = () => {
      const m = e.models[mi], tot = e.weights.reduce((a, w) => a + (+w || 0), 0), filled = m.answers.filter(x => x >= 0).length;
      let q0 = 0;
      box.innerHTML = `<div class="row" style="gap:8px;margin:12px 0;flex-wrap:wrap"><div class="chip-filter" id="kM" style="margin:0">${e.models.map((x, i) => `<button data-i="${i}" class="${i === mi ? 'on' : ''}">نموذج ${x.name}</button>`).join('')}</div>
          <span class="pill st-approved">إجمالي الدرجات: ${AR(tot)}</span><span class="small muted">${AR(filled)} من ${AR(e.n_questions)} مُدخلة</span><div class="grow"></div>
          ${ed ? `${mi > 0 ? `<button class="btn ghost sm" id="kCp">نسخ مفتاح نموذج A</button>` : ''}<button class="btn ghost sm" id="kPaste">لصق المفتاح</button>` : ''}</div>
        ${parts.map((p, pi) => { const a = q0; q0 += +p.count || 0; return `<div class="sec-box pk-sec"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><b>القسم ${AR(pi + 1)}: ${QT[p.type || 'mcq']} <span class="small muted">— الأسئلة ${AR(a + 1)}–${AR(q0)}</span></b>${ed ? `<span class="row" style="gap:4px"><label class="small">درجة كل سؤال <input class="in" type="number" step="0.25" min="0" data-pw="${pi}" style="width:76px"></label><button class="btn ghost sm" data-pwa="${pi}" data-a="${a}" data-b="${q0}">تطبيق</button></span>` : ''}</div>
          <div class="pk-grid">${Array.from({ length: q0 - a }, (_, j) => { const q = a + j, Q = qs[q]; return `<div class="pk-row"><b class="pk-n">${AR(q + 1)}</b><div class="pk-opts ${Q.n > 6 ? 'many' : ''}">${Q.lab.map((L, k) => `<button class="pk-o ${m.answers[q] === k ? 'on' : ''}" data-q="${q}" data-k="${k}" ${ed ? '' : 'disabled'} aria-pressed="${m.answers[q] === k}" aria-label="سؤال ${q + 1} ${L}">${L}</button>`).join('')}</div>
            <input class="in pk-w" type="number" step="0.25" min="0" data-w="${q}" value="${e.weights[q] ?? 1}" ${ed ? '' : 'disabled'} aria-label="درجة السؤال ${q + 1}">
            <select class="in pk-s" data-s="${q}" ${ed ? '' : 'disabled'} aria-label="مهارة السؤال ${q + 1}"><option value="">— المهارة / الدرس —</option>${lessons.map(l => `<option value="${l.id}" ${((e.skills[q] || {}).lesson_id === l.id) ? 'selected' : ''}>${esc(l.lesson)}</option>`).join('')}<option value="__t" ${(e.skills[q] && !e.skills[q].lesson_id && e.skills[q].name) ? 'selected' : ''}>${e.skills[q] && !e.skills[q].lesson_id && e.skills[q].name ? esc(e.skills[q].name) : 'مهارة بنص حر…'}</option></select></div>`; }).join('')}</div></div>`; }).join('')}
        <p class="small muted">التعديلات تُحفظ تلقائياً. ${lessons.length ? '' : 'لربط الأسئلة بدروس المنهج أدخل الدروس من «الاختبارات ← المنهج والدروس»، أو اختر «مهارة بنص حر».'}</p>`;
      $$('#kM button', box).forEach(b => b.onclick = () => { mi = +b.dataset.i; draw(); });
      let t; const save = () => { clearTimeout(t); t = setTimeout(() => saveExam(e, { models: e.models, weights: e.weights, skills: e.skills }).catch(err => A.toast(err.message, 'bad')), 600); };
      $$('.pk-o', box).forEach(b => b.onclick = () => { const q = +b.dataset.q, k = +b.dataset.k; m.answers[q] = m.answers[q] === k ? -1 : k; $$(`.pk-o[data-q="${q}"]`, box).forEach(x => { x.classList.toggle('on', +x.dataset.k === m.answers[q]); x.setAttribute('aria-pressed', +x.dataset.k === m.answers[q]); }); save(); });
      $$('[data-w]', box).forEach(i => i.onchange = () => { e.weights[+i.dataset.w] = Math.max(0, +i.value || 0); save(); setTimeout(draw); });
      $$('[data-s]', box).forEach(s => s.onchange = () => { const q = +s.dataset.s; if (s.value === '__t') { const n = prompt('اسم المهارة', (e.skills[q] || {}).name || ''); e.skills[q] = n ? { name: n.trim() } : null; } else e.skills[q] = s.value ? { lesson_id: s.value, name: (lessons.find(l => l.id === s.value) || {}).lesson } : null; save(); draw(); });
      $$('[data-pwa]', box).forEach(b => b.onclick = () => { const v = +$(`[data-pw="${b.dataset.pwa}"]`, box).value; if (!(v >= 0)) return; for (let q = +b.dataset.a; q < +b.dataset.b; q++) e.weights[q] = v; save(); draw(); });
      const cp = $('#kCp', box); if (cp) cp.onclick = () => { m.answers = e.models[0].answers.slice(); save(); draw(); };
      const ps = $('#kPaste', box); if (ps) ps.onclick = () => { const t2 = prompt(isEn(e) ? 'Paste the key: letters in order (e.g. A B C D T F …) or numbers' : 'الصق المفتاح بالترتيب: حروف (أ ب ج د ص خ …) أو أرقام البدائل (1 2 3 4)، يمكن الفصل بمسافات'); if (!t2) return; const tk = tokens(t2); m.answers = qs.map((Q, q) => parseAns(Q, tk[q])); save(); draw(); };
    };
    draw();
  }

  // ---------- طباعة أوراق التظليل ----------
  async function tSheets(box, e, root) {
    const R = await roster(e), by = Object.fromEntries(e.class_ids.map(c => [c, R.filter(s => s.class_id === c).length])), empty = e.class_ids.filter(c => !by[c]);
    box.innerHTML = `<div class="sec-box" style="margin-top:12px"><b>ورقة تظليل لكل طالب باسمه من قاعدة البيانات</b><p class="small muted" style="margin:4px 0 8px">كل ورقة تحمل رقم الطالب ونموذجه في شريط التعريف فيتعرّف عليها التصحيح الآلي مباشرة. ${AR(R.length)} طالباً: ${e.class_ids.map(c => `${esc(clsName(c))} (${AR(by[c] || 0)})`).join('، ')}.</p>
      <div class="small" style="margin-bottom:8px;color:#082B5A">${esc(legend(e))}</div>
      <div class="row" style="gap:10px;flex-wrap:wrap"><label class="small">توزيع النماذج <select class="in" id="shM" style="max-width:200px">${e.models.map((m, i) => `<option value="${i}">نموذج ${m.name} للجميع</option>`).join('')}${e.models.length > 1 ? '<option value="alt">بالتناوب بين النماذج</option>' : ''}</select></label>
        <label class="small">الفصل <select class="in" id="shC" style="max-width:200px"><option value="">كل الفصول</option>${e.class_ids.map(c => `<option value="${c}">${esc(clsName(c))}</option>`).join('')}</select></label>
        <label class="small">أوراق احتياطية بلا اسم <input class="in" type="number" min="0" max="80" id="shX" value="${R.length ? 0 : 30}" style="width:80px"></label>
        <button class="btn" id="shGo">${I.print} طباعة الأوراق</button><button class="btn ghost" id="shOne">ورقة نموذجية فارغة</button></div>
      ${empty.length ? `<div class="notice warn" style="margin-top:8px;display:block">فصول بلا طلاب في قاعدة البيانات: <b>${esc(empty.map(clsName).join('، '))}</b>. ${realMe().is_owner ? 'أضف أسماءهم الآن لتُطبع الأوراق بأسمائهم:' : 'اطلب من الإدارة إضافة الطلاب، أو اطبع أوراقاً احتياطية بلا اسم واربطها بالطالب عند التصحيح.'} ${realMe().is_owner ? `<button class="btn sm" id="shAdd">إضافة طلاب</button>` : ''}</div>` : ''}
      <p class="small muted" style="margin-top:8px">الورقة الاحتياطية بلا اسم تُصحَّح آلياً أيضاً، ويُختار اسم الطالب لها من قائمة الفصل في شاشة المراجعة قبل الحفظ.</p></div>`;
    const print = (pages) => { const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:-9999px;width:900px;height:1200px;border:0'; document.body.appendChild(f); const base = location.href.replace(/[^/]*$/, '').split('#')[0];
      f.contentDocument.write(`<!doctype html><html lang="${isEn(e) ? 'en' : 'ar'}" dir="${isEn(e) ? 'ltr' : 'rtl'}"><head><meta charset="utf-8"><base href="${base}"><style>@font-face{font-family:'GE SS Two';font-weight:400 500;src:url(fonts/gess-two-medium.woff2)}@font-face{font-family:'GE SS Two';font-weight:600 900;src:url(fonts/gess-two-bold.woff2)}${DinaOMR.PAGE_CSS}</style></head><body>${pages.join('')}</body></html>`); f.contentDocument.close();
      setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 4000); }, 900); };
    const common = { spec: specOf(e), legend: legend(e), title: e.title, sub: `${A.subjName(e.subject_id) || ''} · ${isEn(e) ? (e.kind || '') : (KINDS[e.kind] || '')}${e.exam_date ? ' · ' + e.exam_date : ''}`, foot: S.school.name + (isEn(e) ? ' — Dina Study Planning Platform' : ' — منصة دينا للتخطيط الدراسي') };
    $('#shGo', box).onclick = () => { const mm = $('#shM', box).value, fc = $('#shC', box).value, extra = Math.max(0, Math.min(80, +$('#shX', box).value || 0)); const L = R.map((s, i) => [s, i]).filter(([s]) => !fc || s.class_id === fc); if (!L.length && !extra) return A.toast('لا توجد أوراق للطباعة', 'warn');
      const pages = L.map(([s, i], j) => { const mi = mm === 'alt' ? j % e.models.length : +mm; return DinaOMR.sheetHTML({ ...common, idx: i + 1, model: mi, modelName: e.models[mi].name, name: s.full_name, cls: clsName(s.class_id) }); });
      for (let k = 0; k < extra; k++) { const mi = mm === 'alt' ? k % e.models.length : +mm; pages.push(DinaOMR.sheetHTML({ ...common, idx: 4095, model: mi, modelName: e.models[mi].name, cls: fc ? clsName(fc) : '' })); }
      print(pages); };
    $('#shOne', box).onclick = () => print([DinaOMR.sheetHTML({ ...common, idx: 4095, model: 0, modelName: e.models[0].name })]);
    const add = $('#shAdd', box); if (add) add.onclick = () => addStudents(e, empty, () => tSheets(box, e, root));
  }
  function addStudents(e, cids, done) {
    const m = A.modal(`<h3>إضافة طلاب إلى قاعدة البيانات</h3><p class="sub">سطر لكل طالب (الاسم، ويمكن إضافة رقم الطالب بعد فاصلة). يمكن اللصق مباشرة من Excel. يُضافون إلى الفصل المختار ويظهرون في كل المنصة.</p>
      <div class="field"><label for="asC">الفصل</label><select class="in" id="asC">${cids.map(c => `<option value="${c}">${esc(clsName(c))}</option>`).join('')}</select></div>
      <textarea class="in" id="asT" rows="10" placeholder="نورة محمد القحطاني، 1001&#10;سارة أحمد الغامدي"></textarea><div class="acts"><button class="btn" id="asGo">إضافة</button></div>`, { cls: 'wide' });
    m.el.querySelector('#asGo').onclick = ev => A.run(ev.currentTarget, async () => {
      const cid = m.el.querySelector('#asC').value, c = A.cls(cid) || {}; const rows = m.el.querySelector('#asT').value.split(/\n/).map(l => l.split(/[\t,،]/).map(x => x.trim())).filter(r => r[0] && r[0].length > 2).map(r => ({ school_id: S.school.id, section_id: c.section_id || S.sectionId, class_id: cid, full_name: r[0].replace(/\s+/g, ' '), student_no: r[1] || null, active: true }));
      if (!rows.length) throw new Error('اكتب اسماً واحداً على الأقل'); await api.ins('students', rows); m.close(); A.toast(`أُضيف ${AR(rows.length)} طالباً`, 'ok'); done();
    });
  }

  // ---------- التصحيح: المسح، الإدخال اليدوي، استيراد Excel ----------
  async function tGrade(box, e, root) {
    const R = await roster(e), qs = QS(e); let res = await api.list('paper_results', { exam_id: e.id });
    const bySk = Object.fromEntries(res.map(r => [r.skey, r]));
    box.innerHTML = `<div class="grid g2" style="align-items:start;margin-top:12px"><div class="sec-box"><b>تصحيح آلي من الأوراق الممسوحة</b><p class="small muted" style="margin:4px 0 8px">ارفع ملف PDF من الماسح أو صوراً (أو مجلداً كاملاً). يُتعرَّف على الطالب ونموذجه تلقائياً، ثم تراجع قبل الحفظ.</p>
        <label class="drop" id="gDrop" tabindex="0"><input type="file" id="gF" accept="application/pdf,image/*" multiple hidden><span>اسحب الملفات هنا أو <u>اختر ملفات</u></span><small>PDF أو صور (JPG/PNG)</small></label>
        <label class="btn ghost sm" style="margin-top:8px">اختيار مجلد<input type="file" id="gD" webkitdirectory multiple hidden></label><div id="gOut" style="margin-top:10px"></div></div>
      <div class="sec-box"><b>استيراد نتائج جاهزة (Excel)</b><p class="small muted" style="margin:4px 0 8px">لاختبار صُحّح خارج المنصة أو نتائج من نظام آخر: عمود للاسم، وعمود للفصل (اختياري)، ثم عمود لكل سؤال — إما إجابة الطالب بالحرف (أ ب ج د / A B C D / ص خ / T F) أو درجته في السؤال. سطر باسم «المفتاح» أو KEY يُعتمد مفتاحاً للنموذج A.</p>
        <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn ghost sm" id="gTpl">${I.down} قالب Excel</button><label class="btn sm">استيراد ملف<input type="file" id="gX" accept=".xlsx,.xls,.csv" hidden></label></div><div id="gXo" class="small" style="margin-top:8px"></div>
        <hr style="border:0;border-top:1px dashed var(--border);margin:12px 0"><b>إدخال يدوي / غياب</b><p class="small muted" style="margin:4px 0 8px">اكتب الإجابات بالترتيب مفصولة بمسافات (مثل: أ ب ص خ هـ) واكتب «-» للفارغ، أو علّم الطالب غائباً.</p>
        <div class="scroll" style="max-height:380px"><table class="tbl"><thead><tr><th>الطالب</th><th>نموذج</th><th>الإجابات</th><th>غائب</th><th>الدرجة</th></tr></thead><tbody>${R.map(s => { const r = bySk[s.id]; return `<tr data-s="${s.id}"><td><b>${esc(s.full_name)}</b><div class="small muted">${esc(clsName(s.class_id))}</div></td><td><select class="in" data-m style="width:70px">${e.models.map(m => `<option ${r && r.model === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}</select></td><td><input class="in" data-a dir="${isEn(e) ? 'ltr' : 'rtl'}" style="min-width:180px" value="${r && !r.marks ? esc(ansText(e, r.answers)) : ''}" ${r && r.marks ? 'placeholder="درجات مستوردة"' : ''}></td><td><input type="checkbox" data-ab ${r && r.absent ? 'checked' : ''} aria-label="غائب"></td><td class="small">${r ? (r.absent ? 'غائب' : AR(r.score) + ' / ' + AR(r.max_score)) : '—'}</td></tr>`; }).join('') || `<tr><td colspan="5">${A.emptyBox('لا يوجد طلاب في قاعدة البيانات لهذه الفصول', 'استخدم الاستيراد أو المسح مع الأوراق الاحتياطية.')}</td></tr>`}</tbody></table></div>
        ${R.length ? '<button class="btn sm" id="gSaveM" style="margin-top:8px">حفظ الإدخال اليدوي</button>' : ''}</div></div>`;
    const out = $('#gOut', box), pending = [];
    const handle = async files => {
      out.innerHTML = '<div class="spinner"></div>'; pending.length = 0; let n = 0;
      for (const f of files) { if (!/pdf|image/i.test(f.type) && !/\.(pdf|jpe?g|png)$/i.test(f.name)) continue; let pages = []; try { pages = await DinaOMR.fileToCanvases(f); } catch (err) { pending.push({ label: f.name, error: err.message }); continue; }
        for (const pg of pages) { n++; out.innerHTML = `<div class="small muted">يقرأ الورقة ${AR(n)}…</div>`; await new Promise(r => setTimeout(r, 10)); const r = DinaOMR.readCanvas(pg.cv);
          if (!r.ok) { pending.push({ label: pg.label, error: r.error, img: DinaOMR.thumb(pg.cv, 360) }); continue; }
          const { ans } = r.read(specOf(e)), stu = r.id.idx >= 1 && r.id.idx <= R.length ? R[r.id.idx - 1] : null, model = (e.models[r.id.model] || e.models[0]).name;
          pending.push({ label: pg.label, stu, model, ans, img: DinaOMR.thumb(pg.cv), blank: ans.filter(x => x === -1).length, multi: ans.filter(x => x === -2).length }); } }
      drawPending();
    };
    const drawPending = () => {
      const ok = pending.filter(p => p.ans), opts = s => `<option value="">— اختر الطالب —</option>` + R.map(x => `<option value="${x.id}" ${s && s.id === x.id ? 'selected' : ''}>${esc(x.full_name)} — ${esc(clsName(x.class_id))}</option>`).join('');
      out.innerHTML = `<div class="small" style="margin-bottom:6px">${AR(ok.length)} ورقة مقروءة${pending.length - ok.length ? ` · <b style="color:var(--bad)">${AR(pending.length - ok.length)} تعذّرت</b>` : ''}</div>
        <div class="scroll" style="max-height:420px"><table class="tbl"><thead><tr><th>الورقة</th><th>الطالب</th><th>نموذج</th><th>الدرجة</th><th>تنبيه</th></tr></thead><tbody>${pending.map((p, i) => p.ans ? `<tr><td class="small"><button class="link" data-v="${i}">${esc(p.label)}</button></td><td><select class="in" data-ps="${i}" style="max-width:200px">${opts(p.stu)}</select></td><td>${p.model}</td><td>${(() => { const [s, mx] = scoreOf(e, p.model, p.ans); return AR(s) + ' / ' + AR(mx); })()}</td><td class="small">${p.blank ? `${AR(p.blank)} فارغ ` : ''}${p.multi ? `<b style="color:var(--bad)">${AR(p.multi)} مزدوج</b>` : ''}${bySk[(p.stu || {}).id] ? ' · يستبدل نتيجة سابقة' : ''}</td></tr>` : `<tr><td class="small">${esc(p.label)}</td><td colspan="4" class="small" style="color:var(--bad)">${esc(p.error)}</td></tr>`).join('')}</tbody></table></div>
        ${ok.length ? '<button class="btn ok" id="gSave" style="margin-top:8px">حفظ النتائج</button>' : ''}`;
      $$('[data-ps]', out).forEach(s => s.onchange = () => { pending[+s.dataset.ps].stu = R.find(x => x.id === s.value) || null; });
      $$('[data-v]', out).forEach(b => b.onclick = () => { const p = pending[+b.dataset.v]; A.modal(`<h3>${esc(p.label)}</h3><img src="${p.img}" style="width:100%;border:1px solid var(--border);border-radius:8px" alt="صورة الورقة"><p class="small">الإجابات المقروءة: ${p.ans.map((x, q) => `${AR(q + 1)}:${lab(e, q, x)}`).join(' ')}</p>`, { cls: 'wide' }); });
      const sv = $('#gSave', out); if (sv) sv.onclick = ev => A.run(ev.currentTarget, async () => {
        const rows = pending.filter(p => p.ans && p.stu).map(p => { const [score, mx] = scoreOf(e, p.model, p.ans); return { exam_id: e.id, student_id: p.stu.id, skey: p.stu.id, student_name: p.stu.full_name, class_id: p.stu.class_id, model: p.model, answers: p.ans, marks: null, score, max_score: mx, absent: false, sheet_img: p.img, updated_at: new Date().toISOString() }; });
        if (!rows.length) throw new Error('حدّد الطالب لكل ورقة'); await api.ups('paper_results', rows, 'exam_id,skey'); A.toast(`حُفظت ${AR(rows.length)} نتيجة`, 'ok'); st.tab = 'results'; examView(root);
      });
    };
    $('#gF', box).onchange = ev => handle([...ev.target.files]); $('#gD', box).onchange = ev => handle([...ev.target.files]);
    const dz = $('#gDrop', box); dz.onclick = () => $('#gF', box).click(); dz.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); $('#gF', box).click(); } };
    dz.ondragover = ev => { ev.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = () => dz.classList.remove('over'); dz.ondrop = ev => { ev.preventDefault(); dz.classList.remove('over'); handle([...ev.dataTransfer.files]); };
    const sm = $('#gSaveM', box); if (sm) sm.onclick = ev => A.run(ev.currentTarget, async () => {
      const rows = []; $$('tr[data-s]', box).forEach(tr => { const s = R.find(x => x.id === tr.dataset.s), txt = tr.querySelector('[data-a]').value.trim(), ab = tr.querySelector('[data-ab]').checked, model = tr.querySelector('[data-m]').value; if (!txt && !ab) return;
        const tk = tokens(txt), ans = qs.map((Q, q) => parseAns(Q, tk[q])); const [score, mx] = ab ? [0, scoreOf(e, model, [])[1]] : scoreOf(e, model, ans);
        rows.push({ exam_id: e.id, student_id: s.id, skey: s.id, student_name: s.full_name, class_id: s.class_id, model, answers: ab ? [] : ans, marks: null, score, max_score: mx, absent: ab, updated_at: new Date().toISOString() }); });
      if (!rows.length) throw new Error('لا يوجد إدخال'); await api.ups('paper_results', rows, 'exam_id,skey'); A.toast(`حُفظت ${AR(rows.length)} نتيجة`, 'ok'); examView(root);
    });
    $('#gTpl', box).onclick = () => { const head = ['الاسم', 'الفصل', ...qs.map((_, q) => 'س' + (q + 1))]; const keyRow = ['المفتاح', '', ...qs.map((Q, q) => { const k = e.models[0].answers[q]; return k >= 0 ? Q.lab[k] : ''; })]; const rows = [head, keyRow, ...R.map(s => [s.full_name, clsName(s.class_id)])]; const ws = XLSX.utils.aoa_to_sheet(rows); ws['!views'] = [{ RTL: !isEn(e) }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'النتائج'); XLSX.writeFile(wb, `قالب نتائج - ${e.title}.xlsx`); };
    $('#gX', box).onchange = ev => { const f = ev.target.files[0]; ev.target.value = ''; if (!f) return; A.run(null, async () => {
      const wb = XLSX.read(await f.arrayBuffer()); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }).filter(r => r.some(x => String(x).trim()));
      if (rows.length < 2) throw new Error('الملف فارغ');
      const head = rows[0].map(x => String(x).trim()), ni = Math.max(0, head.findIndex(h => /اسم|name|طالب|student/i.test(h))), ci = head.findIndex(h => /فصل|صف|شعبة|class|section/i.test(h));
      const qCols = head.map((h, i) => i).filter(i => i !== ni && i !== ci).slice(0, e.n_questions);
      if (!qCols.length) throw new Error('لم أجد أعمدة للأسئلة');
      let data = rows.slice(1); const kr = data.find(r => /^(المفتاح|مفتاح|key|answer key)$/i.test(String(r[ni]).trim()));
      if (kr) { e.models[0].answers = qs.map((Q, q) => parseAns(Q, kr[qCols[q]])); await saveExam(e, { models: e.models }); data = data.filter(r => r !== kr); }
      const sample = data.flatMap(r => qCols.map(i => String(r[i]).trim())).filter(Boolean), numeric = sample.length && sample.filter(v => /^[\d٠-٩.,]+$/.test(v)).length / sample.length > 0.8 && !qs.every(Q => Q.type === 'mcq' && false);
      const looksLetters = sample.some(v => /^[أ-يA-Za-z]+ـ?$/.test(v));
      const marksMode = numeric && !looksLetters;
      const findCls = n => { n = A.normKey(String(n || '')); return n ? (e.class_ids.find(c => A.normKey(clsName(c)) === n || A.normKey(clsName(c)).includes(n)) || null) : null; };
      const out2 = data.filter(r => String(r[ni]).trim()).map(r => { const name = String(r[ni]).trim().replace(/\s+/g, ' '), cid = ci >= 0 ? findCls(r[ci]) : null; const s = R.find(x => A.normKey(x.full_name) === A.normKey(name) && (!cid || x.class_id === cid));
        const ans = marksMode ? qs.map(() => -1) : qs.map((Q, q) => parseAns(Q, r[qCols[q]])), marks = marksMode ? qs.map((_, q) => { const v = String(r[qCols[q]]).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(',', '.'); return v === '' ? 0 : +v || 0; }) : null;
        const absent = qCols.every(i => String(r[i]).trim() === '' || /^غ|^غائب|^abs/i.test(String(r[i]).trim())); const [score, mx] = absent ? [0, scoreOf(e, 'A', [])[1]] : scoreOf(e, 'A', ans, marks);
        return { exam_id: e.id, student_id: s ? s.id : null, skey: skey(s && s.id, name, s ? s.class_id : cid), student_name: s ? s.full_name : name, class_id: s ? s.class_id : cid, model: 'A', answers: absent ? [] : ans, marks: absent ? null : marks, score, max_score: mx, absent, updated_at: new Date().toISOString() }; });
      if (!out2.length) throw new Error('لا توجد صفوف طلاب');
      await api.ups('paper_results', out2, 'exam_id,skey');
      const un = out2.filter(r => !r.student_id).length;
      $('#gXo', box).innerHTML = `<span style="color:var(--ok)">استُورد ${AR(out2.length)} طالباً ${marksMode ? '(درجات لكل سؤال)' : '(إجابات بالحروف)'}${kr ? ' · واعتُمد المفتاح من الملف' : ''}.</span>${un ? ` <b>${AR(un)}</b> غير مطابقين لأسماء قاعدة البيانات وحُفظوا بأسمائهم كما في الملف.` : ''}`;
      A.toast('اكتمل الاستيراد', 'ok'); setTimeout(() => { st.tab = 'results'; examView(root); }, 1400);
    }); };
  }

  // ---------- مرشحات مشتركة ----------
  const ctxF = { c: '', m: '' };
  const filterUI = e => `<div class="row" style="gap:8px;margin:12px 0;flex-wrap:wrap"><label class="small">الفصل <select class="in" id="fC" style="max-width:200px"><option value="">كل الفصول</option>${e.class_ids.map(c => `<option value="${c}" ${ctxF.c === c ? 'selected' : ''}>${esc(clsName(c))}</option>`).join('')}</select></label>${e.models.length > 1 ? `<label class="small">النموذج <select class="in" id="fM" style="max-width:120px"><option value="">الكل</option>${e.models.map(m => `<option ${ctxF.m === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}</select></label>` : ''}</div>`;
  async function loadRes(e, all) { const r = await api.list('paper_results', { exam_id: e.id }); return all ? r : r.filter(x => (!ctxF.c || x.class_id === ctxF.c) && (!ctxF.m || x.model === ctxF.m)); }
  const bindF = (box, again) => { const c = $('#fC', box); if (c) c.onchange = () => { ctxF.c = c.value; again(); }; const m = $('#fM', box); if (m) m.onchange = () => { ctxF.m = m.value; again(); }; };

  // ---------- الحسابات المشتركة للتحليل والتقرير ----------
  function analyze(e, all) {
    const pres = all.filter(r => !r.absent), sc = pres.map(r => pct(r.score, r.max_score)), qs = QS(e);
    const avg = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length * 10) / 10 : 0, mx = sc.length ? Math.max(...sc) : 0, mn = sc.length ? Math.min(...sc) : 0;
    const sd = sc.length ? Math.round(Math.sqrt(sc.reduce((a, b) => a + (b - avg) ** 2, 0) / sc.length) * 10) / 10 : 0;
    const sorted = sc.slice().sort((a, b) => a - b), med = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : 0;
    const pass = sc.filter(p => p >= 50).length;
    const bins = Array(10).fill(0); sc.forEach(p => bins[Math.min(9, Math.floor(p / 10))]++);
    const S2 = pres.slice().sort((a, b) => pct(b.score, b.max_score) - pct(a.score, a.max_score)), g = Math.max(1, Math.round(S2.length * 0.27)), up = S2.slice(0, g), lo = S2.slice(-g);
    const items = qs.map((Q, q) => { const dist = Array(Q.n).fill(0); let blank = 0; pres.forEach(r => { const a = r.answers[q]; if (!r.marks && a >= 0) dist[a]++; else if (!r.marks) blank++; });
      const p = pres.length ? pres.filter(r => okQ(e, r, q)).length / pres.length : 0, D = up.length ? up.filter(r => okQ(e, r, q)).length / up.length - lo.filter(r => okQ(e, r, q)).length / lo.length : 0;
      const k = e.models[0].answers[q]; const distr = dist.map((n, j) => ({ j, n })).filter(x => x.j !== k && pres.length && x.n / pres.length < 0.05 && !pres.every(r => r.marks)).map(x => Q.lab[x.j]);
      return { q, Q, dist, blank, p, D, k, weak: distr }; });
    const groups = {}; e.skills.forEach((s, q) => { if (!s) return; const k = s.lesson_id || 'n:' + s.name; (groups[k] = groups[k] || { name: s.name || 'مهارة', lesson_id: s.lesson_id || null, qs: [] }).qs.push(q); });
    const mast = (r, G) => { let s = 0, m = 0; G.qs.forEach(q => { const w = W(e, q); m += w; if (r.marks) s += Math.min(w, +r.marks[q] || 0); else if (okQ(e, r, q)) s += w; }); return m ? Math.round(s / m * 100) : 0; };
    const skills = Object.values(groups).map(G => ({ ...G, p: pres.length ? Math.round(pres.reduce((a, r) => a + mast(r, G), 0) / pres.length) : 0 })).sort((a, b) => a.p - b.p);
    const classes = e.class_ids.map(c => { const l = pres.filter(r => r.class_id === c), v = l.map(r => pct(r.score, r.max_score)); return { c, n: l.length, abs: all.filter(r => r.class_id === c && r.absent).length, avg: v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : 0, pass: v.filter(p => p >= 50).length }; }).filter(x => x.n || x.abs);
    return { pres, sc, avg, mx, mn, sd, med, pass, bins, items, skills, mast, classes, S2 };
  }
  const lvl = p => p >= 0.8 ? ['سهل', 'st-approved'] : p >= 0.4 ? ['متوسط', 'st-submitted'] : ['صعب', 'st-returned'];
  function histCanvas(bins) { const cv = document.createElement('canvas'); cv.width = 900; cv.height = 260; const x = cv.getContext('2d'), mxB = Math.max(1, ...bins), bw = 90; x.fillStyle = '#fff'; x.fillRect(0, 0, 900, 260); x.font = '13px "GE SS Two",sans-serif'; x.textAlign = 'center'; bins.forEach((n, i) => { const hgt = n / mxB * 190, X = (9 - i) * bw; x.fillStyle = i >= 8 ? '#2E9E5B' : i >= 5 ? '#3AB1DB' : '#E0574F'; x.fillRect(X + 14, 210 - hgt, bw - 28, hgt); x.fillStyle = '#082B5A'; x.fillText(String(n), X + bw / 2, 204 - hgt); x.fillStyle = '#5b6b82'; x.fillText(`${i * 10}–${i * 10 + 10}%`, X + bw / 2, 236); }); return cv; }

  // ---------- النتائج ----------
  async function tResults(box, e, root) {
    const all = await loadRes(e), Z = analyze(e, all), tot = e.weights.reduce((a, w) => a + (+w || 0), 0);
    box.innerHTML = filterUI(e) + `<div class="grid g4"><div class="kpi navy"><div class="k">أوراق الاختبار</div><div class="v">${AR(all.length)}</div><div class="d">غائب: ${AR(all.length - Z.pres.length)}</div></div>
        <div class="kpi"><div class="k">متوسط الدرجات</div><div class="v">${AR(Z.avg)}<small>٪</small></div><div class="d">${AR(Math.round(Z.avg * tot) / 100)} من ${AR(tot)} · الوسيط ${AR(Z.med)}٪</div></div>
        <div class="kpi"><div class="k">نسبة النجاح</div><div class="v" style="color:var(--ok)">${AR(pct(Z.pass, Z.pres.length))}<small>٪</small></div><div class="d">${AR(Z.pass)} من ${AR(Z.pres.length)}</div></div>
        <div class="kpi"><div class="k">الأعلى / الأدنى</div><div class="v" style="font-size:22px">${AR(Z.mx)}٪ / ${AR(Z.mn)}٪</div><div class="d">الانحراف المعياري ${AR(Z.sd)}</div></div></div>
      <div class="grid g2" style="margin-top:12px;align-items:start"><div class="sec-box"><div class="row" style="justify-content:space-between"><b>توزيع الدرجات</b><span class="row" style="gap:6px"><button class="btn ghost sm" id="rPng">PNG</button><button class="btn ghost sm" id="rX">${I.down} Excel</button></span></div><div id="rH"></div></div>
        <div class="sec-box"><b>مقارنة الفصول</b><div class="scroll"><table class="tbl"><thead><tr><th>الفصل</th><th>حاضر</th><th>غائب</th><th>المتوسط</th><th>النجاح</th></tr></thead><tbody>${Z.classes.map(x => `<tr><td><b>${esc(clsName(x.c) || 'بلا فصل')}</b></td><td>${AR(x.n)}</td><td>${AR(x.abs)}</td><td>${AR(x.avg)}٪</td><td>${AR(pct(x.pass, x.n))}٪</td></tr>`).join('') || `<tr><td colspan="5">${A.emptyBox('لا توجد نتائج')}</td></tr>`}</tbody></table></div></div></div>
      <div class="scroll" style="margin-top:12px"><table class="tbl"><thead><tr><th>#</th><th>الطالب</th><th>الفصل</th><th>النموذج</th><th>الدرجة</th><th>النسبة</th><th>الحضور</th><th></th></tr></thead><tbody>${all.sort((a, b) => pct(b.score, b.max_score) - pct(a.score, a.max_score)).map((r, i) => `<tr><td>${AR(i + 1)}</td><td><b>${esc(r.student_name)}</b>${r.student_id ? '' : ' <span class="pill st-empty" title="غير مرتبط بطالب في قاعدة البيانات">غير مرتبط</span>'}</td><td>${esc(clsName(r.class_id))}</td><td>${r.model}</td><td>${r.absent ? '—' : AR(r.score) + ' / ' + AR(r.max_score)}</td><td>${r.absent ? '—' : `<span class="pill ${pct(r.score, r.max_score) >= 80 ? 'st-approved' : pct(r.score, r.max_score) >= 50 ? 'st-submitted' : 'st-returned'}">${AR(pct(r.score, r.max_score))}٪</span>`}</td><td>${r.absent ? '<span class="pill st-returned">غائب</span>' : 'حاضر'}</td><td>${r.sheet_img ? `<button class="btn ghost sm" data-img="${r.id}">الورقة</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="8">${A.emptyBox('لا توجد نتائج بعد', 'صحّح الأوراق أو استورد النتائج من تبويب «التصحيح والاستيراد».')}</td></tr>`}</tbody></table></div>`;
    bindF(box, () => tResults(box, e, root));
    const cv = histCanvas(Z.bins); cv.style.cssText = 'width:100%;height:auto'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'توزيع الدرجات بفئات عشرية'); $('#rH', box).appendChild(cv);
    $('#rPng', box).onclick = () => { const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = `توزيع الدرجات - ${e.title}.png`; a.click(); };
    $('#rX', box).onclick = () => exportXlsx(e, all, Z);
    $$('[data-img]', box).forEach(b => b.onclick = () => { const r = all.find(y => y.id === b.dataset.img); A.modal(`<h3>${esc(r.student_name)}</h3><img src="${r.sheet_img}" style="width:100%;border-radius:8px" alt="ورقة الطالب">`, { cls: 'wide' }); });
  }
  function exportXlsx(e, all, Z) {
    const wb = XLSX.utils.book_new(), add = (rows, n) => { const ws = XLSX.utils.json_to_sheet(rows); ws['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws, n); };
    add(all.map(r => ({ الطالب: r.student_name, الفصل: clsName(r.class_id), النموذج: r.model, الدرجة: r.absent ? '' : r.score, 'من': r.max_score, 'النسبة %': r.absent ? '' : pct(r.score, r.max_score), الحضور: r.absent ? 'غائب' : 'حاضر', ...Object.fromEntries(QS(e).map((Q, q) => ['س' + (q + 1), r.absent ? '' : r.marks ? r.marks[q] : (r.answers[q] >= 0 ? Q.lab[r.answers[q]] : '')])) })), 'النتائج');
    add(Z.items.map(it => ({ السؤال: it.q + 1, النوع: QT[it.Q.type || 'mcq'], الصحيحة: it.k >= 0 ? it.Q.lab[it.k] : '', ...Object.fromEntries(it.Q.lab.map((L, k) => [L + ' %', Z.pres.length ? Math.round(it.dist[k] / Z.pres.length * 100) : 0])), 'فارغ %': Z.pres.length ? Math.round(it.blank / Z.pres.length * 100) : 0, 'معامل الصعوبة': +it.p.toFixed(2), 'معامل التمييز': +it.D.toFixed(2) })), 'تحليل الأسئلة');
    add(Z.skills.map(s => ({ المهارة: s.name, 'عدد الأسئلة': s.qs.length, 'الإتقان %': s.p })), 'المهارات');
    add(Z.classes.map(x => ({ الفصل: clsName(x.c), حاضر: x.n, غائب: x.abs, 'المتوسط %': x.avg, 'النجاح %': pct(x.pass, x.n) })), 'الفصول');
    XLSX.writeFile(wb, `تقرير ${e.title}.xlsx`);
  }

  // ---------- تحليل الأسئلة ----------
  async function tItems(box, e, root) {
    const all = await loadRes(e), Z = analyze(e, all);
    if (!Z.pres.length) { box.innerHTML = filterUI(e) + A.emptyBox('لا توجد نتائج بعد'); bindF(box, () => tItems(box, e, root)); return; }
    const n = Z.pres.length;
    box.innerHTML = filterUI(e) + `<p class="small muted">معامل الصعوبة = نسبة من أجاب صحيحاً (كلما ارتفع كان أسهل). معامل التمييز = الفرق بين أعلى ٢٧٪ وأدنى ٢٧٪ (٠٫٣ فأكثر جيد، وأقل من ٠٫٢ يحتاج مراجعة). البديل المظلل بالأخضر هو الصحيح، و«مموّه ضعيف» بديل خاطئ اختاره أقل من ٥٪.</p>
      <div class="scroll"><table class="tbl"><thead><tr><th>س</th><th>النوع</th><th>الصحيحة</th><th>توزيع الإجابات</th><th>فارغ</th><th>الصعوبة</th><th>التمييز</th><th>المستوى</th><th>ملاحظة</th></tr></thead><tbody>${Z.items.map(it => `<tr><td><b>${AR(it.q + 1)}</b></td><td class="small">${QT[it.Q.type || 'mcq']}</td><td>${it.k >= 0 ? it.Q.lab[it.k] : '—'}</td><td><div class="it-dist">${Z.pres.every(r => r.marks) ? '<span class="faint small">درجات مستوردة</span>' : it.Q.lab.map((L, k) => `<span class="${k === it.k ? 'it-ok' : ''}">${L} ${AR(Math.round(it.dist[k] / n * 100))}٪</span>`).join('')}</div></td><td class="faint">${AR(Math.round(it.blank / n * 100))}٪</td><td><b>${AR(it.p.toFixed(2))}</b></td><td style="${it.D < 0.2 ? 'color:var(--bad)' : ''}">${AR(it.D.toFixed(2))}</td><td><span class="pill ${lvl(it.p)[1]}">${lvl(it.p)[0]}</span></td><td class="small">${it.D < 0 ? '<b style="color:var(--bad)">تمييز سالب — راجع المفتاح</b>' : it.D < 0.2 ? 'يحتاج مراجعة' : ''}${it.weak.length ? ` مموّه ضعيف: ${esc(it.weak.join('، '))}` : ''}</td></tr>`).join('')}</tbody></table></div>`;
    bindF(box, () => tItems(box, e, root));
  }

  // ---------- تحليل المهارات + خطط علاجية ----------
  async function tSkills(box, e, root) {
    const all = await loadRes(e), Z = analyze(e, all);
    if (!Z.skills.length) { box.innerHTML = filterUI(e) + A.emptyBox('لم يُربط أي سؤال بمهارة بعد', 'اربط الأسئلة بالدروس أو المهارات من تبويب «نماذج الإجابة».'); bindF(box, () => tSkills(box, e, root)); return; }
    box.innerHTML = filterUI(e) + `<div class="grid g2" style="align-items:start"><div class="sec-box"><b>إتقان المهارات (الأضعف أولاً)</b>${Z.skills.map(g => `<div style="margin-top:8px"><div class="row" style="justify-content:space-between"><span>${esc(g.name)} <span class="small muted">(${AR(g.qs.length)} س)</span></span><b>${AR(g.p)}٪</b></div>${A.bar(g.p, 100)}</div>`).join('')}</div>
      <div class="sec-box"><b>المهارات التي يحتاج كل طالب دعماً فيها</b><div class="scroll" style="max-height:420px"><table class="tbl"><thead><tr><th>الطالب</th><th>النسبة</th><th>مهارات أقل من ٦٠٪</th></tr></thead><tbody>${Z.pres.map(r => { const w = Z.skills.filter(g => Z.mast(r, g) < 60); return `<tr><td><b>${esc(r.student_name)}</b><div class="small muted">${esc(clsName(r.class_id))}</div></td><td>${AR(pct(r.score, r.max_score))}٪</td><td class="small">${esc(w.map(g => g.name).join('، ')) || '<span class="faint">—</span>'}</td></tr>`; }).join('')}</tbody></table></div>
      <button class="btn ok sm" id="sRem" style="margin-top:8px">إنشاء خطط علاجية وإثرائية من النتائج</button></div></div>`;
    bindF(box, () => tSkills(box, e, root));
    $('#sRem', box).onclick = ev => A.run(ev.currentTarget, async () => {
      const rows = Z.pres.map(r => { const p = pct(r.score, r.max_score), gaps = Z.skills.map(g => ({ lesson: g.name, lesson_id: g.lesson_id, p: Z.mast(r, g) })).filter(x => x.p < 60).sort((a, b) => a.p - b.p);
        const base = { school_id: S.school.id, teacher_id: S.me.id, student_name: r.student_name, class_id: r.class_id };
        return p >= 90 ? { ...base, kind: 'enrichment', gaps: [], actions: `أنشطة إثرائية بعد «${e.title}».` } : gaps.length ? { ...base, kind: 'remedial', gaps, actions: `مراجعة: ${gaps.slice(0, 3).map(x => x.lesson).join('، ')} — بعد «${e.title}».` } : null; }).filter(Boolean);
      if (!rows.length) return A.toast('لا توجد فجوات تستدعي خططاً');
      await api.ins('remedial_plans', rows); A.toast(`أُنشئت ${AR(rows.length)} خطة — تجدها في «الاختبارات ← الخطط العلاجية والإثرائية»`, 'ok');
    });
  }

  // ---------- التقرير الشامل والإرسال ----------
  async function tReport(box, e, root) {
    const all = await loadRes(e, true), Z = analyze(e, all);
    const summary = () => `تقرير اختبار «${e.title}» — ${A.subjName(e.subject_id) || ''}${e.exam_date ? ' (' + e.exam_date + ')' : ''}\nالطلاب: ${all.length} (غائب ${all.length - Z.pres.length}) · المتوسط ${Z.avg}% · النجاح ${pct(Z.pass, Z.pres.length)}% · الأعلى ${Z.mx}% · الأدنى ${Z.mn}%\n${Z.classes.length > 1 ? 'الفصول: ' + Z.classes.map(x => `${clsName(x.c)} ${x.avg}%`).join('، ') + '\n' : ''}${Z.skills.length ? 'أضعف المهارات: ' + Z.skills.slice(0, 3).map(s => `${s.name} ${s.p}%`).join('، ') + '\n' : ''}أسئلة تحتاج مراجعة: ${Z.items.filter(it => it.D < 0.2 || it.p < 0.3).map(it => it.q + 1).join('، ') || 'لا يوجد'}`;
    box.innerHTML = `<div class="grid g2" style="margin-top:12px;align-items:start"><div class="sec-box"><b>التقرير الشامل</b><p class="small muted" style="margin:4px 0 8px">ملخص النتائج، توزيع الدرجات، مقارنة الفصول، تحليل الأسئلة والمهارات، والطلاب الأعلى والأحوج للدعم — بهوية دينا.</p>
        <textarea class="in" id="rpS" rows="7" readonly dir="rtl">${esc(summary())}</textarea>
        <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn" id="rpP">${I.print} طباعة / PDF</button><button class="btn ghost" id="rpX">${I.down} Excel شامل</button><button class="btn ghost sm" id="rpC">نسخ الملخص</button><a class="btn ghost sm" id="rpW" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(summary())}">واتساب</a></div></div>
      <div class="sec-box"><b>إرسال التقرير للزملاء ومداولته</b><p class="small muted" style="margin:4px 0 8px">يصلهم الملخص في «الرسائل» داخل المنصة، ويمكن منحهم الاطلاع على الاختبار كاملاً بتحليلاته (يُضافون كمعلمين مشاركين).</p>
        <input class="in" id="rpQ" placeholder="بحث بالاسم" style="margin-bottom:6px"><div class="perm-grid" id="rpT" style="max-height:200px;overflow:auto">${S.staff.filter(p => p.active && p.id !== S.me.id).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar')).map(p => `<label class="chk small"><input type="checkbox" value="${p.id}"> ${esc(p.full_name)}${p.title ? ` <span class="faint">— ${esc(p.title)}</span>` : ''}</label>`).join('')}</div>
        <div class="field" style="margin-top:8px"><label for="rpN">ملاحظة مع التقرير (اختياري)</label><textarea class="in" id="rpN" rows="2" placeholder="مثال: نرجو مناقشة الأسئلة ٤ و٩ في اجتماع القسم"></textarea></div>
        <label class="chk"><input type="checkbox" id="rpG" checked> منحهم الاطلاع على الاختبار وتحليلاته</label><div class="acts"><button class="btn ok" id="rpGo">إرسال</button></div></div></div>`;
    $('#rpQ', box).oninput = ev => { const q = A.normKey(ev.target.value); $$('#rpT label', box).forEach(l => l.style.display = !q || A.normKey(l.textContent).includes(q) ? '' : 'none'); };
    $('#rpC', box).onclick = () => navigator.clipboard.writeText(summary()).then(() => A.toast('نُسخ الملخص', 'ok'));
    $('#rpX', box).onclick = () => exportXlsx(e, all, Z);
    $('#rpP', box).onclick = () => {
      const img = histCanvas(Z.bins).toDataURL('image/png'), top = Z.S2.slice(0, 5), low = Z.S2.slice(-5).reverse();
      A.printDoc('تقرير اختبار: ' + e.title, `${A.subjName(e.subject_id) || ''} · ${KINDS[e.kind] || ''}${e.exam_date ? ' · ' + e.exam_date : ''} · ${e.class_ids.map(clsName).join('، ')}`, `
        <table><tr><th>الطلاب</th><th>غائب</th><th>المتوسط</th><th>الوسيط</th><th>النجاح</th><th>الأعلى</th><th>الأدنى</th><th>الانحراف</th></tr><tr><td>${all.length}</td><td>${all.length - Z.pres.length}</td><td>${Z.avg}%</td><td>${Z.med}%</td><td>${pct(Z.pass, Z.pres.length)}%</td><td>${Z.mx}%</td><td>${Z.mn}%</td><td>${Z.sd}</td></tr></table>
        <h3>توزيع الدرجات</h3><img src="${img}" style="width:100%">
        ${Z.classes.length ? `<h3>مقارنة الفصول</h3><table><tr><th>الفصل</th><th>حاضر</th><th>غائب</th><th>المتوسط</th><th>النجاح</th></tr>${Z.classes.map(x => `<tr><td>${esc(clsName(x.c))}</td><td>${x.n}</td><td>${x.abs}</td><td>${x.avg}%</td><td>${pct(x.pass, x.n)}%</td></tr>`).join('')}</table>` : ''}
        ${Z.skills.length ? `<h3>إتقان المهارات</h3><table><tr><th>المهارة</th><th>الأسئلة</th><th>الإتقان</th></tr>${Z.skills.map(s => `<tr><td style="text-align:right">${esc(s.name)}</td><td>${s.qs.map(q => q + 1).join('، ')}</td><td>${s.p}%</td></tr>`).join('')}</table>` : ''}
        <h3 style="page-break-before:always">تحليل الأسئلة</h3><table><tr><th>س</th><th>النوع</th><th>الصحيحة</th><th>توزيع الإجابات</th><th>الصعوبة</th><th>التمييز</th><th>المستوى</th></tr>${Z.items.map(it => `<tr><td>${it.q + 1}</td><td>${QT[it.Q.type || 'mcq']}</td><td>${it.k >= 0 ? it.Q.lab[it.k] : ''}</td><td style="font-size:10px">${Z.pres.length ? it.Q.lab.map((L, k) => `${L} ${Math.round(it.dist[k] / Z.pres.length * 100)}%`).join(' · ') : ''}</td><td>${it.p.toFixed(2)}</td><td>${it.D.toFixed(2)}</td><td>${lvl(it.p)[0]}</td></tr>`).join('')}</table>
        <h3>الأعلى درجات</h3><table><tr><th>الطالب</th><th>الفصل</th><th>النسبة</th></tr>${top.map(r => `<tr><td style="text-align:right">${esc(r.student_name)}</td><td>${esc(clsName(r.class_id))}</td><td>${pct(r.score, r.max_score)}%</td></tr>`).join('')}</table>
        <h3>الأحوج للدعم</h3><table><tr><th>الطالب</th><th>الفصل</th><th>النسبة</th><th>مهارات تحتاج دعماً</th></tr>${low.map(r => `<tr><td style="text-align:right">${esc(r.student_name)}</td><td>${esc(clsName(r.class_id))}</td><td>${pct(r.score, r.max_score)}%</td><td style="font-size:10px">${esc(Z.skills.filter(g => Z.mast(r, g) < 60).map(g => g.name).join('، '))}</td></tr>`).join('')}</table>`);
    };
    $('#rpGo', box).onclick = ev => A.run(ev.currentTarget, async () => {
      const ids = $$('#rpT input:checked', box).map(i => i.value); if (!ids.length) throw new Error('اختر زميلاً واحداً على الأقل');
      const note = $('#rpN', box).value.trim(), grant = $('#rpG', box).checked;
      if (grant) { const t = [...new Set([...(e.teachers || []), ...ids.filter(id => id !== e.teacher_id)])]; await saveExam(e, { teachers: t }); }
      await api.sendMessages(ids.map(id => ({ recipient_id: id, subject: 'تقرير اختبار: ' + e.title, body: summary() + (note ? '\n\nملاحظة: ' + note : '') + (grant ? '\n\nللاطلاع على التحليل الكامل: «الاختبارات ← الاختبارات الورقية» ← ' + e.title : ''), kind: 'system' })));
      A.toast(`أُرسل التقرير إلى ${A.cnt(ids.length, 'زميل', 'زملاء')}`, 'ok'); $$('#rpT input', box).forEach(i => i.checked = false);
    });
  }

  // ---------- مشاركة النتائج مع أولياء الأمور ----------
  async function tShare(box, e) {
    const all = (await api.list('paper_results', { exam_id: e.id })).sort((a, b) => clsName(a.class_id).localeCompare(clsName(b.class_id), 'ar') || a.student_name.localeCompare(b.student_name, 'ar'));
    const sh = Object.assign({ on: false, kind: 'result', comment: '', students: [] }, e.share || {}), sel = new Set(sh.students || []);
    const link = r => location.href.split('#')[0].replace(/[^/]*$/, '') + 'student.html?pr=' + r.token;
    const visible = r => sh.on && (!sel.size || sel.has(r.student_id));
    box.innerHTML = `<div class="sec-box" style="margin-top:12px"><b>مشاركة النتائج مع أولياء الأمور</b><p class="small muted" style="margin:4px 0 8px">لكل طالب رابط خاص لا يظهر فيه إلا نتيجته. أرسله لولي الأمر. يمكن إيقاف المشاركة في أي وقت فتتوقف الروابط.</p>
      <div class="row" style="gap:12px;flex-wrap:wrap;align-items:flex-end"><label class="chk"><input type="checkbox" id="shOn" ${sh.on ? 'checked' : ''}> المشاركة مفعّلة</label>
        <div class="chip-filter" id="shK" style="margin:0">${[['result', 'النتيجة فقط'], ['sheet', 'النتيجة مع صورة الورقة']].map(([k, l]) => `<button data-v="${k}" class="${sh.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="field" style="margin:0;flex:1;min-width:240px"><label for="shC">تعليق المعلم (يظهر لولي الأمر)</label><input class="in" id="shC" value="${esc(sh.comment || '')}" placeholder="مثال: نرجو متابعة مهارة الكسور في المنزل"></div><button class="btn" id="shS">حفظ</button></div></div>
      <div class="row" style="gap:8px;margin:10px 0"><span class="small muted">اترك الكل غير محدد لمشاركة جميع الطلاب، أو حدّد طلاباً بعينهم.</span><div class="grow"></div><button class="btn ghost sm" id="shCopy">نسخ كل الروابط</button></div>
      <div class="scroll"><table class="tbl"><thead><tr><th></th><th>الطالب</th><th>الفصل</th><th>النتيجة</th><th>الرابط</th></tr></thead><tbody>${all.map(r => `<tr><td><input type="checkbox" data-sel="${r.student_id || ''}" ${r.student_id && sel.has(r.student_id) ? 'checked' : ''} ${r.student_id ? '' : 'disabled'} aria-label="تحديد ${esc(r.student_name)}"></td><td><b>${esc(r.student_name)}</b></td><td>${esc(clsName(r.class_id))}</td><td>${r.absent ? 'غائب' : AR(r.score) + ' / ' + AR(r.max_score)}</td><td>${visible(r) ? `<button class="btn ghost sm" data-cp="${r.id}">نسخ</button> <a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(`نتيجة ${r.student_name} في «${e.title}»: ${link(r)}`)}">واتساب</a>` : '<span class="faint small">غير مشارك</span>'}</td></tr>`).join('') || `<tr><td colspan="5">${A.emptyBox('لا توجد نتائج بعد')}</td></tr>`}</tbody></table></div>`;
    $$('#shK button', box).forEach(b => b.onclick = () => { sh.kind = b.dataset.v; $$('#shK button', box).forEach(x => x.classList.toggle('on', x === b)); });
    $('#shS', box).onclick = ev => A.run(ev.currentTarget, async () => { sh.on = $('#shOn', box).checked; sh.comment = $('#shC', box).value.trim(); sh.students = $$('[data-sel]:checked', box).map(i => i.dataset.sel).filter(Boolean); await saveExam(e, { share: sh }); A.toast(sh.on ? 'فُعّلت المشاركة' : 'أُوقفت المشاركة', 'ok'); tShare(box, e); });
    $$('[data-cp]', box).forEach(b => b.onclick = () => { const r = all.find(x => x.id === b.dataset.cp); navigator.clipboard.writeText(link(r)).then(() => A.toast('نُسخ الرابط', 'ok')); });
    $('#shCopy', box).onclick = () => { const L2 = all.filter(visible).map(r => `${r.student_name} (${clsName(r.class_id)}): ${link(r)}`); if (!L2.length) return A.toast('فعّل المشاركة واحفظ أولاً', 'warn'); navigator.clipboard.writeText(L2.join('\n')).then(() => A.toast(`نُسخت ${AR(L2.length)} روابط`, 'ok')); };
  }

  // ===================== اللجان (توزيع مرن) =====================
  const MODES = [['mix', 'خلط الفصول بالتناوب — لا يجلس طالبان من الفصل نفسه متجاورين'], ['grades', 'تناوب صفّين دراسيين مختلفين (مثل: رابع بجانب سادس)'], ['alpha', 'أبجدي داخل كل فصل ثم الفصل التالي'], ['alpha_all', 'أبجدي لكل الطلاب معاً'], ['number', 'حسب رقم الطالب'], ['random', 'عشوائي']];
  async function committees(box, root) {
    const list = (await api.list('exam_committees', { school_id: S.school.id }, { order: 'created_at', desc: true })).filter(c => !c.section_id || c.section_id === S.sectionId);
    box.innerHTML = `<div class="row" style="gap:8px;margin:10px 0"><span class="small muted">توزيع الطلاب على لجان الاختبار بأرقام جلوس وبطرق مرنة، مع تعديل يدوي، وكشوف توقيع وملصقات أبواب وبطاقات مقاعد.</span><div class="grow"></div><button class="btn" id="cNew">${I.plus} لجان جديدة</button></div>
      <div class="scroll"><table class="tbl"><thead><tr><th>العنوان</th><th>الطريقة</th><th>الفصول</th><th>اللجان</th><th>الطلاب</th><th>التاريخ</th><th></th></tr></thead><tbody>${list.map(c => `<tr><td><b>${esc(c.title)}</b></td><td class="small">${esc(((MODES.find(x => x[0] === (c.settings || {}).mode) || [])[1] || '').split(' — ')[0])}</td><td class="small">${esc(c.class_ids.map(clsName).join('، '))}</td><td>${AR(c.rooms.length)}</td><td>${AR(c.seating.length)}</td><td class="small">${A.fmtDT(c.created_at)}</td><td class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn ghost sm" data-e="${c.id}">تعديل التوزيع</button><button class="btn ghost sm" data-p="${c.id}">طباعة</button><button class="btn bad sm" data-d="${c.id}" aria-label="حذف">×</button></td></tr>`).join('') || `<tr><td colspan="7">${A.emptyBox('لا توجد لجان بعد')}</td></tr>`}</tbody></table></div>`;
    $('#cNew', box).onclick = () => newCommittee(root);
    $$('[data-p]', box).forEach(b => b.onclick = () => printCommittee(list.find(c => c.id === b.dataset.p)));
    $$('[data-e]', box).forEach(b => b.onclick = () => editSeating(list.find(c => c.id === b.dataset.e), root));
    $$('[data-d]', box).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذا التوزيع؟', 'حذف', true))) return; await api.del('exam_committees', b.dataset.d); V.paper(root); });
  }
  function newCommittee(root) {
    const cls = S.classes.filter(c => c.active), staff = S.staff.filter(p => p.active).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
    let rooms = [{ name: 'لجنة ١', capacity: 20 }, { name: 'لجنة ٢', capacity: 20 }];
    const m = A.modal(`<h3>توزيع لجان جديد</h3><div class="grid g2"><div class="field"><label for="cT">العنوان</label><input class="in" id="cT" placeholder="مثال: اختبارات الفترة الأولى"></div>
        <div class="field"><label for="cMode">طريقة التوزيع</label><select class="in" id="cMode">${MODES.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
        <div class="field"><label for="cNum">ترقيم الجلوس</label><select class="in" id="cNum"><option value="cont">متسلسل لكل اللجان</option><option value="room">يبدأ من ١ في كل لجنة</option></select></div>
        <div class="field"><label for="cPre">بادئة رقم الجلوس (اختياري)</label><input class="in" id="cPre" placeholder="مثال: 4 أو ب-" dir="ltr"></div></div>
      <div class="field"><label>الفصول</label><div class="perm-grid" id="cC">${cls.map(c => `<label class="chk small"><input type="checkbox" value="${c.id}"> ${esc(c.name)}</label>`).join('')}</div></div>
      <div class="sec-box"><div class="row" style="justify-content:space-between"><b>اللجان</b><span class="small muted" id="cCap"></span></div><div id="cR" style="margin-top:8px"></div>
        <div class="row" style="gap:6px;margin-top:6px"><button class="btn ghost sm" type="button" id="cRA">${I.plus} لجنة</button><button class="btn ghost sm" type="button" id="cRN">إنشاء عدد لجان بسعة واحدة</button></div>
        <p class="small muted" style="margin:6px 0 0">لكل لجنة: الاسم، السعة، ملاحظ أو اثنان، ويمكن قصرها على فصول بعينها (مثل لجنة خاصة لفصل).</p></div>
      <div class="acts"><button class="btn" id="cGo">توزيع</button></div>`, { cls: 'wide' });
    const sel = (v, k, i) => `<select class="in" data-r${k}="${i}" style="max-width:170px"><option value="">— ملاحظ —</option>${staff.map(p => `<option value="${p.id}" ${v === p.id ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select>`;
    const drawR = () => { const ids = $$('#cC input:checked', m.el).map(i => i.value);
      m.el.querySelector('#cR').innerHTML = rooms.map((r, i) => `<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px;padding-bottom:6px;border-bottom:1px dashed var(--border)"><input class="in" data-rn="${i}" value="${esc(r.name)}" style="max-width:160px" aria-label="اسم اللجنة"><label class="small">السعة <input class="in" type="number" min="1" data-rc="${i}" value="${r.capacity}" style="width:70px"></label>${sel(r.proctor, 'p', i)}${sel(r.proctor2, 'q', i)}
        <details><summary class="small">الفصول ${r.classes && r.classes.length ? `(${AR(r.classes.length)})` : '(كل الفصول)'}</summary><div class="perm-grid" style="margin-top:4px">${ids.map(c => `<label class="chk small"><input type="checkbox" data-rk="${i}" value="${c}" ${(r.classes || []).includes(c) ? 'checked' : ''}> ${esc(clsName(c))}</label>`).join('') || '<span class="small muted">اختر الفصول أولاً</span>'}</div></details>
        ${rooms.length > 1 ? `<button class="btn bad sm" type="button" data-rx="${i}" aria-label="حذف اللجنة">×</button>` : ''}</div>`).join('');
      m.el.querySelector('#cCap').textContent = `السعة الكلية: ${AR(rooms.reduce((a, r) => a + (+r.capacity || 0), 0))}`;
      $$('[data-rn]', m.el).forEach(x => x.oninput = () => rooms[+x.dataset.rn].name = x.value);
      $$('[data-rc]', m.el).forEach(x => x.oninput = () => { rooms[+x.dataset.rc].capacity = Math.max(1, +x.value || 1); m.el.querySelector('#cCap').textContent = `السعة الكلية: ${AR(rooms.reduce((a, r) => a + (+r.capacity || 0), 0))}`; });
      $$('[data-rp]', m.el).forEach(x => x.onchange = () => rooms[+x.dataset.rp].proctor = x.value || null);
      $$('[data-rq]', m.el).forEach(x => x.onchange = () => rooms[+x.dataset.rq].proctor2 = x.value || null);
      $$('[data-rk]', m.el).forEach(x => x.onchange = () => { const r = rooms[+x.dataset.rk]; r.classes = $$(`[data-rk="${x.dataset.rk}"]:checked`, m.el).map(i => i.value); });
      $$('[data-rx]', m.el).forEach(x => x.onclick = () => { rooms.splice(+x.dataset.rx, 1); drawR(); }); };
    m.el.querySelector('#cRA').onclick = () => { rooms.push({ name: 'لجنة ' + AR(rooms.length + 1), capacity: 20 }); drawR(); };
    m.el.querySelector('#cRN').onclick = () => { const n = +prompt('عدد اللجان', '6'), c = +prompt('سعة كل لجنة', '20'); if (!(n > 0 && c > 0)) return; rooms = Array.from({ length: n }, (_, i) => ({ name: 'لجنة ' + AR(i + 1), capacity: c })); drawR(); };
    $$('#cC input', m.el).forEach(i => i.onchange = drawR); drawR();
    m.el.querySelector('#cGo').onclick = ev => A.run(ev.currentTarget, async () => {
      const title = m.el.querySelector('#cT').value.trim() || 'لجان الاختبار', ids = $$('#cC input:checked', m.el).map(i => i.value), mode = m.el.querySelector('#cMode').value; if (!ids.length) throw new Error('اختر فصلاً واحداً على الأقل');
      const R = rooms.map(r => ({ ...r, name: r.name.trim() || 'لجنة', capacity: +r.capacity || 1, classes: (r.classes || []).filter(c => ids.includes(c)) }));
      let stu = []; try { stu = await api.list('students', { class_id: ids, active: true }); } catch (_) {} if (!stu.length) throw new Error('لا يوجد طلاب في الفصول المختارة في قاعدة البيانات');
      if (R.reduce((a, r) => a + r.capacity, 0) < stu.length) throw new Error(`سعة اللجان ${R.reduce((a, r) => a + r.capacity, 0)} أقل من عدد الطلاب ${stu.length}`);
      const order = orderStudents(stu, ids, mode), seating = place(order, R, m.el.querySelector('#cNum').value, m.el.querySelector('#cPre').value.trim());
      if (seating.left.length) throw new Error(`${seating.left.length} طالباً لم يجدوا مقعداً بسبب قصر بعض اللجان على فصول معينة — زِد سعة اللجان العامة`);
      await api.ins('exam_committees', { school_id: S.school.id, section_id: S.sectionId, title, class_ids: ids, rooms: R, seating: seating.list, settings: { mode, num: m.el.querySelector('#cNum').value, prefix: m.el.querySelector('#cPre').value.trim() }, created_by: S.me.id });
      m.close(); A.toast(`وُزّع ${AR(seating.list.length)} طالباً على ${AR(new Set(seating.list.map(x => x.room)).size)} لجنة`, 'ok'); V.paper(root);
    });
  }
  function orderStudents(stu, ids, mode) {
    const byN = (a, b) => a.full_name.localeCompare(b.full_name, 'ar'), byC = ids.map(c => stu.filter(s => s.class_id === c).sort(byN));
    if (mode === 'alpha') return byC.flat();
    if (mode === 'alpha_all') return stu.slice().sort(byN);
    if (mode === 'number') return stu.slice().sort((a, b) => String(a.student_no || '').localeCompare(String(b.student_no || ''), 'en', { numeric: true }) || byN(a, b));
    if (mode === 'random') { const a = stu.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    if (mode === 'grades') { const gk = c => { const x = A.cls(c) || {}; return (x.stage || '') + '|' + (x.grade_word || x.name); }; const G = {}; ids.forEach(c => (G[gk(c)] = G[gk(c)] || []).push(...stu.filter(s => s.class_id === c).sort(byN))); const L = Object.values(G).sort((a, b) => b.length - a.length), out = [], mx = Math.max(...L.map(x => x.length)); for (let i = 0; i < mx; i++) L.forEach(l => { if (l[i]) out.push(l[i]); }); return out; }
    const out = [], mx = Math.max(...byC.map(x => x.length)); for (let i = 0; i < mx; i++) byC.forEach(l => { if (l[i]) out.push(l[i]); }); return out;
  }
  function place(order, R, num, pre) {
    const fill = R.map(() => 0), list = [], left = [];
    order.forEach(s => { let ri = R.findIndex((r, i) => fill[i] < r.capacity && r.classes.length && r.classes.includes(s.class_id)); if (ri < 0) ri = R.findIndex((r, i) => fill[i] < r.capacity && !r.classes.length); if (ri < 0) { left.push(s); return; } fill[ri]++; list.push({ student_id: s.id, name: s.full_name, class_id: s.class_id, room: ri }); });
    renumber(list, R, num, pre); return { list, left };
  }
  function renumber(list, R, num, pre) { let n = 0; R.forEach((_, ri) => { let k = 0; list.filter(x => x.room === ri).forEach(x => { n++; k++; x.seat = num === 'room' ? k : n; x.label = (pre || '') + x.seat; }); }); }
  function editSeating(c, root) {
    const L = c.seating.map(x => ({ ...x }));
    const m = A.modal(`<h3>تعديل التوزيع — ${esc(c.title)}</h3><p class="sub">انقل أي طالب إلى لجنة أخرى، ثم احفظ لإعادة الترقيم. السعة تُراعى تلقائياً بالتنبيه.</p>
      <input class="in" id="seQ" placeholder="بحث بالاسم" style="max-width:260px;margin-bottom:8px"><div id="seCap" class="small" style="margin-bottom:6px"></div>
      <div class="scroll" style="max-height:52vh"><table class="tbl"><thead><tr><th>الجلوس</th><th>الطالب</th><th>الفصل</th><th>اللجنة</th></tr></thead><tbody id="seB"></tbody></table></div>
      <div class="acts"><button class="btn" id="seGo">حفظ وإعادة الترقيم</button></div>`, { cls: 'wide' });
    const cap = () => { m.el.querySelector('#seCap').innerHTML = c.rooms.map((r, i) => { const n = L.filter(x => x.room === i).length; return `<span class="pill ${n > r.capacity ? 'st-returned' : 'st-empty'}">${esc(r.name)}: ${AR(n)}/${AR(r.capacity)}</span>`; }).join(' '); };
    const draw = () => { const q = A.normKey(m.el.querySelector('#seQ').value || ''); m.el.querySelector('#seB').innerHTML = L.map((x, i) => [x, i]).filter(([x]) => !q || A.normKey(x.name).includes(q)).map(([x, i]) => `<tr><td><b>${esc(x.label || x.seat)}</b></td><td>${esc(x.name)}</td><td>${esc(clsName(x.class_id))}</td><td><select class="in" data-mv="${i}" style="max-width:180px">${c.rooms.map((r, ri) => `<option value="${ri}" ${x.room === ri ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></td></tr>`).join(''); $$('[data-mv]', m.el).forEach(s => s.onchange = () => { L[+s.dataset.mv].room = +s.value; cap(); }); };
    m.el.querySelector('#seQ').oninput = draw; draw(); cap();
    m.el.querySelector('#seGo').onclick = ev => A.run(ev.currentTarget, async () => { const ord = c.rooms.flatMap((_, ri) => L.filter(x => x.room === ri)); renumber(ord, c.rooms, (c.settings || {}).num, (c.settings || {}).prefix); await api.upd('exam_committees', c.id, { seating: ord }); m.close(); A.toast('حُفظ التوزيع', 'ok'); V.paper(root); });
  }
  function printCommittee(c) {
    const m = A.modal(`<h3>طباعة — ${esc(c.title)}</h3><div class="acts" style="justify-content:flex-start;flex-wrap:wrap"><button class="btn" data-k="lists">كشوف اللجان مع التوقيع</button><button class="btn ghost" data-k="doors">ملصقات الأبواب</button><button class="btn ghost" data-k="cards">بطاقات المقاعد</button><button class="btn ghost" data-k="summary">ملخص اللجان والملاحظين</button></div>`);
    const sn = x => x.label || x.seat, pn = id => id ? A.personName(id) : '';
    $$('[data-k]', m.el).forEach(b => b.onclick = () => { m.close(); const k = b.dataset.k;
      if (k === 'lists') A.printDoc(c.title, 'كشوف اللجان', c.rooms.map((r, i) => { const L2 = c.seating.filter(s => s.room === i); if (!L2.length) return ''; return `<h3 style="page-break-before:${i ? 'always' : 'auto'}">${esc(r.name)} — ${AR(L2.length)} طالباً${r.proctor ? ' · الملاحظ: ' + esc(pn(r.proctor)) : ''}${r.proctor2 ? ' و' + esc(pn(r.proctor2)) : ''}</h3><table><tr><th>رقم الجلوس</th><th>الطالب</th><th>الفصل</th><th>الحضور</th><th>التوقيع</th></tr>${L2.map(s => `<tr><td><b>${esc(sn(s))}</b></td><td style="text-align:right">${esc(s.name)}</td><td>${esc(clsName(s.class_id))}</td><td></td><td style="width:30%"></td></tr>`).join('')}</table><p style="margin-top:14px">توقيع الملاحظ: ................................</p>`; }).join(''));
      else if (k === 'doors') A.printDoc(c.title, 'ملصقات أبواب اللجان', c.rooms.map((r, i) => { const L2 = c.seating.filter(s => s.room === i); if (!L2.length) return ''; return `<div style="page-break-before:${i ? 'always' : 'auto'};text-align:center;padding-top:40mm"><div style="font-size:54px;font-weight:800">${esc(r.name)}</div><div style="font-size:30px;margin-top:10mm">أرقام الجلوس ${esc(sn(L2[0]))} — ${esc(sn(L2[L2.length - 1]))}</div><div style="font-size:20px;margin-top:8mm;color:#005499">${esc([...new Set(L2.map(s => clsName(s.class_id)))].join('، '))}</div></div>`; }).join(''));
      else if (k === 'summary') A.printDoc(c.title, 'ملخص اللجان', `<table><tr><th>اللجنة</th><th>عدد الطلاب</th><th>أرقام الجلوس</th><th>الفصول</th><th>الملاحظون</th></tr>${c.rooms.map((r, i) => { const L2 = c.seating.filter(s => s.room === i); return L2.length ? `<tr><td><b>${esc(r.name)}</b></td><td>${L2.length}</td><td>${esc(sn(L2[0]))} — ${esc(sn(L2[L2.length - 1]))}</td><td>${esc([...new Set(L2.map(s => clsName(s.class_id)))].join('، '))}</td><td>${esc([pn(r.proctor), pn(r.proctor2)].filter(Boolean).join('، '))}</td></tr>` : ''; }).join('')}</table>`);
      else A.printDoc(c.title, 'بطاقات المقاعد', `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4mm">${c.seating.map(s => `<div style="border:1.5px solid #082B5A;border-radius:3mm;padding:4mm;text-align:center;break-inside:avoid"><div style="font-size:28px;font-weight:800">${esc(sn(s))}</div><div style="font-size:13px">${esc(s.name)}</div><div style="font-size:11px;color:#005499">${esc(clsName(s.class_id))} · ${esc(c.rooms[s.room].name)}</div></div>`).join('')}</div>`); });
  }
})();
