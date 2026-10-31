/* منصة دينا — التقويم: المنهج، بنك الأسئلة، جدول المواصفات، الاختبارات وأوراق العمل الإلكترونية، النتائج والتحليل، الخطط العلاجية */
(function () {
  const A = window.APP, V = window.VIEWS;
  const { api, S, $, $$, esc, AR, I } = A;
  const LV = [['remember', 'تذكر'], ['understand', 'فهم'], ['apply', 'تطبيق'], ['higher', 'مستويات عليا']];
  const lvName = k => (LV.find(x => x[0] === k) || [])[1] || k || 'غير محدد';
  const QT = [['mcq', 'اختيار من متعدد'], ['tf', 'صواب وخطأ'], ['short', 'إجابة قصيرة'], ['essay', 'مقالي']];
  const qtName = k => (QT.find(x => x[0] === k) || [])[1] || k;
  const KQ = { quiz: 'اختبار قصير', worksheet: 'ورقة عمل', homework: 'واجب إلكتروني', remedial: 'ورقة دعم علاجية' };
  const base = () => location.href.split('#')[0].replace(/[^/]*$/, '');
  const qLink = c => base() + 'student.html?q=' + c, rLink = t => base() + 'student.html?r=' + t;
  const sch = () => S.school.id;
  const gk = c => c ? `${c.stage}|${c.grade_word}` : '';
  const gLabel = k => { const [st, g] = (k || '|').split('|'); return g ? `${g} ${st.replace('ال', 'ال')}` : '—'; };
  const myClasses = () => { const mine = new Set(S.entries.filter(e => e.teacher_id === S.me.id).map(e => e.class_id)); const all = S.classes.filter(c => c.active); return (S.me.is_owner || A.anyPerm('review') || !mine.size) ? all : all.filter(c => mine.has(c.id)); };
  const mySubjects = () => { const m = new Set(S.entries.filter(e => e.teacher_id === S.me.id && e.subject_id).map(e => e.subject_id)); return (S.me.is_owner || A.anyPerm('review') || !m.size) ? S.subjects : S.subjects.filter(s => m.has(s.id)); };
  const ctx = { subj: null, grade: null };
  let CUR = [], QB = [];
  async function loadCtx() { [CUR, QB] = await Promise.all([api.list('curriculum', { school_id: sch(), subject_id: ctx.subj, grade_key: ctx.grade }, { order: 'sort' }), api.list('questions', { school_id: sch(), subject_id: ctx.subj, grade_key: ctx.grade }, { order: 'created_at' })]); }
  const lesson = id => CUR.find(l => l.id === id) || {};

  // تحميل ما رُبط بالأسبوع المعروض (للتصدير والعرض)
  const prevAfter = window.APP_AFTER_WEEK;
  window.APP_AFTER_WEEK = async function () { if (prevAfter) await prevAfter.apply(this, arguments); try { S.weekQuizzes = S.weekId ? await api.rpc('week_quizzes', { p_week: S.weekId }) : []; } catch (_) { S.weekQuizzes = []; } };
  // ظهور البند للمعلمين يتحكم فيه المالك (للجميع / لمن يُمنح / مخفي) — البيانات تبقى كما هي
  A.assessMode = () => A.featMode ? A.featMode('assess') : 'all';
  A.canAssess = () => { if (!S.me) return false; if (S.me.is_owner || (A.hasModule && A.hasModule('supervision'))) return true; const md = A.assessMode(); if (md === 'off') return false; if (md === 'granted') return !!(A.hasModule && A.hasModule('assess')); return A.anyPerm('review') || (A.myMem() || {}).role === 'teacher' || S.entries.some(e => e.teacher_id === S.me.id); };
  V.assess = async function (root) {
    if (!A.canAssess()) { root.innerHTML = `<div class="card">${A.emptyBox('هذا البند غير مفعّل لحسابك', 'يفعّله مالك النظام.')}</div>`; return; }
    const subs = mySubjects(), grades = [...new Set(myClasses().map(gk))];
    ctx.subj = A.LS.get('as_s') || ctx.subj || (subs[0] || {}).id; if (!subs.some(s => s.id === ctx.subj)) ctx.subj = (subs[0] || {}).id;
    ctx.grade = A.LS.get('as_g') || ctx.grade || grades[0]; if (!grades.includes(ctx.grade)) ctx.grade = grades[0];
    const tabs = [['quizzes', 'الاختبارات وأوراق العمل'], ['bank', 'بنك الأسئلة'], ['spec', 'جدول المواصفات'], ['curriculum', 'المنهج والدروس'], ['results', 'النتائج والتحليل'], ['cumul', 'التقرير التراكمي'], ['remedial', 'الخطط العلاجية والإثرائية']];
    let tab = A.LS.get('as_t') || 'quizzes';
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>التقويم والاختبارات</h2><p class="sub" style="margin:2px 0 0">بنك أسئلة مرتبط بالدروس ومستويات التفكير، جدول مواصفات آلي، اختبارات وأوراق عمل إلكترونية برابط للطالب، وتحليل يبني خططاً علاجية.</p></div></div>
      <div class="row" style="margin-bottom:10px;gap:8px"><label class="small">المادة <select class="in" id="asS" style="max-width:220px">${subs.map(s => `<option value="${s.id}" ${s.id === ctx.subj ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
        <label class="small">الصف <select class="in" id="asG" style="max-width:220px">${grades.map(g => `<option value="${esc(g)}" ${g === ctx.grade ? 'selected' : ''}>${esc(gLabel(g))}</option>`).join('')}</select></label></div>
      <div class="tabs">${tabs.map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="asb"><div class="spinner"></div></div></div>`;
    $('#asS', root).onchange = e => { A.LS.set('as_s', e.target.value); V.assess(root); };
    $('#asG', root).onchange = e => { A.LS.set('as_g', e.target.value); V.assess(root); };
    $$('.tabs button', root).forEach(b => b.onclick = () => { A.LS.set('as_t', b.dataset.t); V.assess(root); });
    if (!ctx.subj || !ctx.grade) { $('#asb', root).innerHTML = A.emptyBox('لا توجد مواد أو فصول مسندة لك'); return; }
    try { await loadCtx(); } catch (e) { $('#asb', root).innerHTML = A.emptyBox('تعذّر التحميل', e.message); return; }
    ({ curriculum: tCur, bank: tBank, spec: tSpec, quizzes: tQuiz, results: tRes, cumul: tCum, remedial: tRem })[tab]($('#asb', root), root);
  };

  // ---------- المنهج والدروس ----------
  function tCur(box, root) {
    const draw = () => {
      box.innerHTML = `<p class="sub" style="margin:12px 0 8px">أدخل الدروس مرة واحدة لكل مادة وصف؛ تُستخدم في بنك الأسئلة وجدول المواصفات والتحليل.</p>
        <div class="row" style="margin-bottom:10px"><button class="btn" id="cAdd">${I.plus} درس</button><button class="btn ghost" id="cPaste">لصق قائمة دروس</button><span class="small muted">${A.cnt(CUR.length, 'درس', 'دروس')} · ${AR(CUR.reduce((a, l) => a + (l.periods || 0), 0))} حصة</span></div>
        <div class="scroll"><table class="tbl"><thead><tr><th>#</th><th>الوحدة</th><th>الدرس</th><th>الحصص</th><th>الصفحات</th><th>الأسئلة في البنك</th><th></th></tr></thead><tbody>${CUR.map((l, i) => `<tr><td>${AR(i + 1)}</td><td>${esc(l.unit)}</td><td><b>${esc(l.lesson)}</b></td><td>${AR(l.periods)}</td><td>${l.pages ? AR(l.pages) : '—'}</td><td>${AR(QB.filter(q => q.lesson_id === l.id).length)}</td><td class="row" style="flex-wrap:nowrap;gap:4px"><button class="btn ghost sm" data-e="${l.id}">تعديل</button><button class="btn bad sm" data-d="${l.id}" aria-label="حذف">×</button></td></tr>`).join('') || `<tr><td colspan="7">${A.emptyBox('لا توجد دروس بعد', 'أضف الدروس أو الصق فهرس الكتاب.')}</td></tr>`}</tbody></table></div>`;
      $('#cAdd', box).onclick = () => edit();
      $('#cPaste', box).onclick = () => { const m = A.modal(`<h3>لصق قائمة دروس</h3><p class="sub">سطر لكل درس بالصيغة: <b>الوحدة | الدرس | عدد الحصص | الصفحات</b> (الأخيران اختياريان). يمكن اللصق من Excel مباشرة.</p><textarea class="in" id="cp" rows="10" placeholder="الوحدة الأولى | الكسور العشرية | 3 | 8"></textarea><div class="acts"><button class="btn" id="cpg">إضافة</button></div>`, { cls: 'wide' });
        m.el.querySelector('#cpg').onclick = e => A.run(e.currentTarget, async () => { const lines = m.el.querySelector('#cp').value.split('\n').map(x => x.trim()).filter(Boolean); const num = x => +String(x || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) || null;
          const rows = lines.map((ln, i) => { const p = ln.split(/\t|\|/).map(x => x.trim()); return p.length === 1 ? { unit: '', lesson: p[0], periods: 1, pages: null } : { unit: p[0], lesson: p[1] || p[0], periods: num(p[2]) || 1, pages: num(p[3]) }; }).map((r, i) => ({ school_id: sch(), subject_id: ctx.subj, grade_key: ctx.grade, sort: CUR.length + i, ...r }));
          if (!rows.length) throw new Error('الصق الدروس أولاً'); await api.ins('curriculum', rows); m.close(); await loadCtx(); draw(); A.toast(`أُضيف ${A.cnt(rows.length, 'درس', 'دروس')}`, 'ok'); }); };
      $$('[data-e]', box).forEach(b => b.onclick = () => edit(lesson(b.dataset.e)));
      $$('[data-d]', box).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذا الدرس؟ أسئلته تبقى في البنك بلا درس.', 'حذف', true))) return; A.run(null, async () => { await api.del('curriculum', b.dataset.d); await loadCtx(); draw(); }); });
    };
    const edit = l => { l = l || { unit: CUR.length ? CUR[CUR.length - 1].unit : '', lesson: '', periods: 1, pages: null };
      const m = A.modal(`<h3>${l.id ? 'تعديل' : 'إضافة'} درس</h3><div class="grid g2"><div class="field"><label for="cu">الوحدة</label><input class="in" id="cu" value="${esc(l.unit)}"></div><div class="field"><label for="cl">الدرس</label><input class="in" id="cl" value="${esc(l.lesson)}"></div><div class="field"><label for="cpd">عدد الحصص</label><input class="in" id="cpd" type="number" min="1" value="${l.periods || 1}"></div><div class="field"><label for="cpg2">عدد الصفحات (اختياري)</label><input class="in" id="cpg2" type="number" min="0" value="${l.pages || ''}"></div></div><div class="acts"><button class="btn" id="cgo">حفظ</button></div>`);
      m.el.querySelector('#cgo').onclick = e => A.run(e.currentTarget, async () => { const row = { unit: m.el.querySelector('#cu').value.trim(), lesson: m.el.querySelector('#cl').value.trim(), periods: +m.el.querySelector('#cpd').value || 1, pages: +m.el.querySelector('#cpg2').value || null }; if (!row.lesson) throw new Error('اكتب اسم الدرس'); if (l.id) await api.upd('curriculum', l.id, row); else await api.ins('curriculum', { ...row, school_id: sch(), subject_id: ctx.subj, grade_key: ctx.grade, sort: CUR.length }); m.close(); await loadCtx(); draw(); }); };
    draw();
  }

  // ---------- بنك الأسئلة ----------
  function qEditor(q, onSaved) {
    q = q ? JSON.parse(JSON.stringify(q)) : { qtype: 'mcq', level: 'remember', difficulty: 2, lesson_id: (CUR[0] || {}).id || null, body: '', options: [{ t: '' }, { t: '' }, { t: '' }, { t: '' }], answer: '', explanation: '', points: 1, image_url: null, shared: true };
    const m = A.modal(`<h3>${q.id ? 'تعديل سؤال' : 'سؤال جديد'}</h3>
      <div class="grid g3"><div class="field"><label for="qt">النوع</label><select class="in" id="qt">${QT.map(([k, l]) => `<option value="${k}" ${q.qtype === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="ql">الدرس</label><select class="in" id="ql"><option value="">—</option>${CUR.map(l => `<option value="${l.id}" ${q.lesson_id === l.id ? 'selected' : ''}>${esc(l.lesson)}</option>`).join('')}</select></div>
      <div class="field"><label for="qv">المستوى المعرفي</label><select class="in" id="qv">${LV.map(([k, l]) => `<option value="${k}" ${q.level === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="qd">الصعوبة</label><select class="in" id="qd">${[[1, 'سهل'], [2, 'متوسط'], [3, 'صعب']].map(([k, l]) => `<option value="${k}" ${q.difficulty == k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="qp">الدرجة</label><input class="in" id="qp" type="number" min="0.5" step="0.5" value="${q.points}"></div>
      <div class="field"><label for="qs">المهارة (اختياري)</label><input class="in" id="qs" value="${esc(q.skill || '')}" placeholder="مثال: قراءة الكسر العشري"></div></div>
      <div class="field"><label for="qb">نص السؤال</label><textarea class="in" id="qb" rows="3">${esc(q.body)}</textarea></div>
      <div class="row" style="margin-bottom:8px"><label class="btn ghost sm"><input type="file" id="qi" accept="image/*" hidden> صورة للسؤال</label><span id="qiv">${q.image_url ? `<img src="${esc(q.image_url)}" alt="" style="height:60px;border-radius:8px"> <button type="button" class="btn bad sm" id="qix">إزالة</button>` : ''}</span></div>
      <div id="qa"></div>
      <div class="field"><label for="qe">التفسير / التغذية الراجعة (يظهر بعد التسليم إن سمحت)</label><textarea class="in" id="qe" rows="2">${esc(q.explanation)}</textarea></div>
      <label class="chk"><input type="checkbox" id="qsh" ${q.shared ? 'checked' : ''}> مشاركة السؤال مع زملاء المادة</label>
      <div class="acts"><button class="btn" id="qgo">حفظ</button></div>`, { cls: 'wide' });
    const ans = () => { const t = m.el.querySelector('#qt').value; const box = m.el.querySelector('#qa');
      if (t === 'mcq') { box.innerHTML = `<div class="field"><label>الخيارات (حدّد الصحيح)</label>${q.options.map((o, i) => `<div class="row" style="flex-wrap:nowrap;margin-bottom:6px"><input type="radio" name="qok" value="${i}" ${o.ok ? 'checked' : ''} aria-label="الخيار الصحيح ${i + 1}" style="width:20px;height:20px"><input class="in" data-o="${i}" value="${esc(o.t)}" placeholder="الخيار ${AR(i + 1)}"><button type="button" class="btn bad sm" data-orm="${i}" aria-label="حذف الخيار">×</button></div>`).join('')}<button type="button" class="btn ghost sm" id="qoa">${I.plus} خيار</button></div>`;
        $$('[data-o]', box).forEach(i => i.oninput = () => q.options[+i.dataset.o].t = i.value);
        $$('input[name=qok]', box).forEach(r => r.onchange = () => q.options.forEach((o, i) => o.ok = i === +r.value));
        $$('[data-orm]', box).forEach(b => b.onclick = () => { q.options.splice(+b.dataset.orm, 1); ans(); });
        box.querySelector('#qoa').onclick = () => { q.options.push({ t: '' }); ans(); }; }
      else if (t === 'tf') box.innerHTML = `<div class="field"><label>الإجابة الصحيحة</label><select class="in" id="qans"><option ${q.answer === 'صواب' ? 'selected' : ''}>صواب</option><option ${q.answer === 'خطأ' ? 'selected' : ''}>خطأ</option></select></div>`;
      else box.innerHTML = `<div class="field"><label>${t === 'short' ? 'الإجابات المقبولة (افصل بينها بـ | )' : 'الإجابة النموذجية (يُصحَّح يدوياً)'}</label><input class="in" id="qans" value="${esc(q.answer)}"></div>`; };
    m.el.querySelector('#qt').onchange = ans; ans();
    m.el.querySelector('#qi').onchange = e => A.run(null, async () => { const f = e.target.files[0]; if (!f) return; q.image_url = await api.uploadAsset(f); m.el.querySelector('#qiv').innerHTML = `<img src="${esc(q.image_url)}" alt="" style="height:60px;border-radius:8px">`; });
    const qx = m.el.querySelector('#qix'); if (qx) qx.onclick = () => { q.image_url = null; m.el.querySelector('#qiv').innerHTML = ''; };
    m.el.querySelector('#qgo').onclick = e => A.run(e.currentTarget, async () => {
      const t = m.el.querySelector('#qt').value; const row = { qtype: t, lesson_id: m.el.querySelector('#ql').value || null, level: m.el.querySelector('#qv').value, difficulty: +m.el.querySelector('#qd').value, points: +m.el.querySelector('#qp').value || 1, skill: m.el.querySelector('#qs').value.trim(), body: m.el.querySelector('#qb').value.trim(), explanation: m.el.querySelector('#qe').value.trim(), image_url: q.image_url || null, shared: m.el.querySelector('#qsh').checked };
      if (!row.body) throw new Error('اكتب نص السؤال');
      if (t === 'mcq') { row.options = q.options.filter(o => o.t.trim()).map(o => ({ t: o.t.trim(), ...(o.ok ? { ok: true } : {}) })); if (row.options.length < 2) throw new Error('أضف خيارين على الأقل'); if (!row.options.some(o => o.ok)) throw new Error('حدّد الخيار الصحيح'); row.answer = ''; }
      else { row.options = []; row.answer = (m.el.querySelector('#qans') || {}).value || ''; if (t !== 'essay' && !row.answer.trim()) throw new Error('اكتب الإجابة الصحيحة'); }
      if (q.id) await api.upd('questions', q.id, row); else await api.ins('questions', { ...row, school_id: sch(), subject_id: ctx.subj, grade_key: ctx.grade });
      m.close(); await loadCtx(); onSaved && onSaved(); A.toast('حُفظ السؤال', 'ok');
    });
  }
  function qHTML(q, i, solved) {
    const img = q.image_url ? `<div><img src="${esc(q.image_url)}" alt="" style="max-height:160px;max-width:100%;border-radius:8px;margin:6px 0"></div>` : '';
    const ch = q.qtype === 'mcq' ? `<ol type="أ" style="margin:6px 0">${q.options.map(o => `<li style="${solved && o.ok ? 'font-weight:800;color:#17814a' : ''}">${esc(o.t)}${solved && o.ok ? ' ✓' : ''}</li>`).join('')}</ol>` : q.qtype === 'tf' ? `<div>( صواب )&nbsp;&nbsp;( خطأ )${solved ? ` — <b style="color:#17814a">${esc(q.answer)}</b>` : ''}</div>` : `<div style="border-bottom:1px dotted #84B7E3;height:${q.qtype === 'essay' ? 70 : 26}px"></div>${solved && q.answer ? `<div style="color:#17814a;font-weight:700">${esc(q.answer.split('|')[0])}</div>` : ''}`;
    return `<div style="margin-bottom:14px;break-inside:avoid"><b>${AR(i + 1)}) ${esc(q.body)}</b> <span style="font-size:11px;color:#005499">(${AR(q.points)} درجة)</span>${img}${ch}${solved && q.explanation ? `<div style="font-size:12px;color:#566384">التفسير: ${esc(q.explanation)}</div>` : ''}</div>`;
  }
  function printPaper(title, qs, solved) { A.printDoc(title + (solved ? ' — نموذج الإجابة' : ''), `${A.subjName(ctx.subj)} · ${gLabel(ctx.grade)} · ${A.cnt(qs.length, 'سؤال', 'أسئلة')} · ${AR(qs.reduce((a, q) => a + (+q.points || 0), 0))} درجة`, `${solved ? '' : '<div style="display:flex;gap:30px;margin-bottom:12px"><span>اسم الطالب: ......................................</span><span>الفصل: ............</span></div>'}` + qs.map((q, i) => qHTML(q, i, solved)).join(''), false); }
  function tBank(box) {
    const f = { lesson: '', level: '', type: '', q: '' };
    const draw = () => {
      const l = QB.filter(q => (!f.lesson || q.lesson_id === f.lesson) && (!f.level || q.level === f.level) && (!f.type || q.qtype === f.type) && (!f.q || A.normKey(q.body).includes(A.normKey(f.q))));
      box.innerHTML = `<div class="row" style="margin:12px 0;gap:8px"><button class="btn" id="bAdd">${I.plus} سؤال</button><select class="in" id="bL" style="max-width:200px"><option value="">كل الدروس</option>${CUR.map(x => `<option value="${x.id}" ${f.lesson === x.id ? 'selected' : ''}>${esc(x.lesson)}</option>`).join('')}</select><select class="in" id="bV" style="max-width:150px"><option value="">كل المستويات</option>${LV.map(([k, n]) => `<option value="${k}" ${f.level === k ? 'selected' : ''}>${n}</option>`).join('')}</select><select class="in" id="bT" style="max-width:160px"><option value="">كل الأنواع</option>${QT.map(([k, n]) => `<option value="${k}" ${f.type === k ? 'selected' : ''}>${n}</option>`).join('')}</select><input class="in" id="bQ" placeholder="بحث" value="${esc(f.q)}" style="max-width:180px"><button class="btn ghost sm" id="bP0">${I.print} طباعة</button><button class="btn ghost sm" id="bP1">${I.print} مع الحل</button></div>
        <p class="small muted">${A.cnt(l.length, 'سؤال', 'أسئلة')} من ${AR(QB.length)} · ${LV.map(([k, n]) => `${n}: ${AR(QB.filter(q => q.level === k).length)}`).join(' · ')}</p>
        <div class="qb">${l.map((q, i) => `<div class="qc"><div class="row" style="justify-content:space-between;gap:6px"><span class="row" style="gap:4px"><span class="pill st-submitted">${qtName(q.qtype)}</span><span class="pill st-empty">${lvName(q.level)}</span><span class="small muted">${esc(lesson(q.lesson_id).lesson || 'بلا درس')} · ${['', 'سهل', 'متوسط', 'صعب'][q.difficulty]} · ${AR(q.points)} د</span></span><span class="row" style="gap:4px">${q.created_by === S.me.id || S.me.is_owner ? `<button class="btn ghost sm" data-e="${q.id}">تعديل</button><button class="btn bad sm" data-d="${q.id}" aria-label="حذف">×</button>` : `<span class="small faint">${esc(A.personName(q.created_by) || '')}</span>`}</span></div>${qHTML(q, i, true).replace('margin-bottom:14px', 'margin:6px 0 0')}</div>`).join('') || A.emptyBox('لا توجد أسئلة', CUR.length ? 'أضف أول سؤال.' : 'ابدأ بإدخال الدروس من تبويب «المنهج والدروس».')}</div>`;
      $('#bAdd', box).onclick = () => qEditor(null, draw);
      $('#bL', box).onchange = e => { f.lesson = e.target.value; draw(); }; $('#bV', box).onchange = e => { f.level = e.target.value; draw(); }; $('#bT', box).onchange = e => { f.type = e.target.value; draw(); }; $('#bQ', box).onchange = e => { f.q = e.target.value; draw(); };
      $('#bP0', box).onclick = () => printPaper('بنك الأسئلة', l, false); $('#bP1', box).onclick = () => printPaper('بنك الأسئلة', l, true);
      $$('[data-e]', box).forEach(b => b.onclick = () => qEditor(QB.find(q => q.id === b.dataset.e), draw));
      $$('[data-d]', box).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذا السؤال من البنك؟', 'حذف', true))) return; A.run(null, async () => { await api.del('questions', b.dataset.d); await loadCtx(); draw(); }); });
    };
    draw();
  }

  // ---------- جدول المواصفات ----------
  function specDefaults() { const d = ((S.school.settings || {}).spec_defaults || {})[ctx.subj] || ((S.school.settings || {}).spec_defaults || {})._all; return Object.assign({ n: 20, marks: 20, alpha: 1, r: { remember: 30, understand: 30, apply: 25, higher: 15 } }, d || {}); }
  // التوزيع بطريقة «الباقي الأكبر» حتى يبقى المجموع مطابقاً تماماً
  function largest(total, weights) { const s = weights.reduce((a, b) => a + b, 0) || 1; const raw = weights.map(w => total * w / s); const fl = raw.map(Math.floor); let rem = total - fl.reduce((a, b) => a + b, 0); raw.map((r, i) => [r - fl[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rem > 0) { fl[i]++; rem--; } }); return fl; }
  function computeSpec(lessons, st) {
    const P = lessons.reduce((a, l) => a + (l.periods || 0), 0) || 1, G = lessons.reduce((a, l) => a + (l.pages || 0), 0);
    const w = lessons.map(l => st.alpha * (l.periods || 0) / P + (G ? (1 - st.alpha) * (l.pages || 0) / G : (1 - st.alpha) * (l.periods || 0) / P));
    const perL = largest(st.n, w); const lvW = LV.map(([k]) => +st.r[k] || 0); const perLv = largest(st.n, lvW);
    // توزيع ثنائي: كل درس حسب نسب المستويات مع ضبط مجموع الأعمدة
    const M = lessons.map((l, i) => largest(perL[i], lvW));
    for (let pass = 0; pass < 50; pass++) { let changed = false; LV.forEach((_, j) => { const col = M.reduce((a, r) => a + r[j], 0); const diff = col - perLv[j]; if (!diff) return; const order = M.map((r, i) => i).sort((a, b) => diff > 0 ? M[b][j] - M[a][j] : M[a][j] - M[b][j]);
      for (const i of order) { const k = M[i].findIndex((v, jj) => jj !== j && (diff > 0 ? M.reduce((a, r) => a + r[jj], 0) < perLv[jj] : v > 0 && M.reduce((a, r) => a + r[jj], 0) > perLv[jj])); if (k < 0) continue; if (diff > 0 && M[i][j] > 0) { M[i][j]--; M[i][k]++; changed = true; break; } if (diff < 0) { M[i][k]--; M[i][j]++; changed = true; break; } } }); if (!changed) break; }
    return lessons.map((l, i) => ({ lesson_id: l.id, w: w[i], cells: M[i] }));
  }
  function tSpec(box) {
    let st = specDefaults(), sel = new Set(CUR.map(l => l.id)), matrix = null, saved = null;
    const draw = async () => {
      const specs = await api.list('spec_tables', { school_id: sch(), subject_id: ctx.subj, grade_key: ctx.grade }, { order: 'created_at', desc: true });
      box.innerHTML = `<div class="grid g2" style="margin-top:12px;align-items:start"><div class="sec-box"><b>المدخلات</b>
        <div class="grid g3" style="margin-top:8px"><div class="field"><label for="sN">عدد الأسئلة</label><input class="in" id="sN" type="number" min="1" value="${st.n}"></div><div class="field"><label for="sM">الدرجة الكلية</label><input class="in" id="sM" type="number" min="1" value="${st.marks}"></div><div class="field"><label for="sA">أساس الوزن</label><select class="in" id="sA"><option value="1" ${st.alpha == 1 ? 'selected' : ''}>عدد الحصص</option><option value="0" ${st.alpha == 0 ? 'selected' : ''}>عدد الصفحات</option><option value="0.5" ${st.alpha == 0.5 ? 'selected' : ''}>الحصص والصفحات معاً</option></select></div></div>
        <div class="grid g4">${LV.map(([k, n]) => `<div class="field"><label for="r_${k}">${n} %</label><input class="in" id="r_${k}" type="number" min="0" max="100" value="${st.r[k]}"></div>`).join('')}</div>
        <div class="row" style="gap:6px"><label class="btn ghost sm"><input type="file" id="sG" accept=".xlsx,.xls,.csv" hidden> الملف الاسترشادي</label>${S.me.is_owner ? '<button class="btn ghost sm" id="sDef">حفظ كإعداد افتراضي للمادة</button>' : ''}<span class="small muted" id="sSum"></span></div>
        <div class="field" style="margin-top:8px"><label>الدروس المشمولة</label><div class="perm-grid" style="max-height:200px;overflow:auto">${CUR.map(l => `<label class="chk"><input type="checkbox" value="${l.id}" ${sel.has(l.id) ? 'checked' : ''}> ${esc(l.lesson)} <span class="small muted">(${AR(l.periods)} ح)</span></label>`).join('') || '<span class="muted small">أدخل الدروس أولاً من «المنهج والدروس»</span>'}</div></div>
        <button class="btn" id="sGo">بناء الجدول</button></div>
        <div class="sec-box"><b>جداول محفوظة</b><div style="margin-top:6px">${specs.map(s => `<div class="row" style="justify-content:space-between;border-bottom:1px dashed var(--border);padding:6px 0"><span><b>${esc(s.title)}</b> <span class="small muted">· ${A.fmtDT(s.created_at)} · ${s.status === 'approved' ? 'معتمد' : 'مسودة'}</span></span><button class="btn ghost sm" data-ld="${s.id}">فتح</button></div>`).join('') || '<p class="muted small">لا يوجد</p>'}</div></div></div><div id="sOut"></div>`;
      const sumR = () => { const t = LV.reduce((a, [k]) => a + (+$('#r_' + k, box).value || 0), 0); $('#sSum', box).innerHTML = `مجموع النسب: <b style="color:${t === 100 ? 'var(--ok)' : 'var(--bad)'}">${AR(t)}٪</b>`; };
      LV.forEach(([k]) => $('#r_' + k, box).oninput = sumR); sumR();
      const read = () => { st = { n: +$('#sN', box).value || 1, marks: +$('#sM', box).value || 1, alpha: +$('#sA', box).value, r: Object.fromEntries(LV.map(([k]) => [k, +$('#r_' + k, box).value || 0])) }; sel = new Set($$('.perm-grid input:checked', box).map(i => i.value)); };
      $('#sG', box).onchange = e => A.run(null, async () => { const fl = e.target.files[0]; if (!fl) return; const wb = XLSX.read(await fl.arrayBuffer(), { type: 'array' }); const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' }); const map = { 'تذكر': 'remember', 'معرفة': 'remember', 'فهم': 'understand', 'استيعاب': 'understand', 'تطبيق': 'apply', 'مستويات عليا': 'higher', 'تحليل': 'higher', 'عليا': 'higher' }; let hit = 0;
        rows.forEach(r => { const k = Object.keys(map).find(x => String(r[0]).includes(x)); const v = parseFloat(String(r[1]).replace('%', '')); if (k && isFinite(v)) { $('#r_' + map[k], box).value = v <= 1 ? Math.round(v * 100) : v; hit++; } const t = String(r[0]); if (/عدد الأسئلة/.test(t) && +r[1]) $('#sN', box).value = +r[1]; if (/الدرجة/.test(t) && +r[1]) $('#sM', box).value = +r[1]; });
        sumR(); A.toast(hit ? `قُرئت ${A.cnt(hit, 'نسبة', 'نسب')} من الملف الاسترشادي` : 'لم أجد نسباً في الملف (عمود المستوى ثم عمود النسبة)', hit ? 'ok' : 'err'); });
      const sd = $('#sDef', box); if (sd) sd.onclick = e => A.run(e.currentTarget, async () => { read(); const settings = { ...(S.school.settings || {}) }; settings.spec_defaults = { ...(settings.spec_defaults || {}), [ctx.subj]: st }; const r = await api.updateSchool(sch(), { settings }); S.school.settings = r.settings || settings; A.toast('حُفظ الإعداد الافتراضي للمادة', 'ok'); });
      $('#sGo', box).onclick = () => { read(); const t = LV.reduce((a, [k]) => a + st.r[k], 0); if (t !== 100) return A.toast('مجموع نسب المستويات يجب أن يساوي ١٠٠٪', 'err'); const ls = CUR.filter(l => sel.has(l.id)); if (!ls.length) return A.toast('اختر درساً واحداً على الأقل', 'err'); matrix = computeSpec(ls, st); saved = null; out(); };
      $$('[data-ld]', box).forEach(b => b.onclick = () => { const s = specs.find(x => x.id === b.dataset.ld); st = s.settings; sel = new Set(s.lesson_ids); matrix = s.matrix; saved = s; draw().then(out); });
    };
    const out = () => {
      const o = $('#sOut', box); if (!matrix) return;
      const per = st.marks / st.n; const colT = LV.map((_, j) => matrix.reduce((a, r) => a + r.cells[j], 0)); const tot = colT.reduce((a, b) => a + b, 0);
      const have = (lid, lv) => QB.filter(q => q.lesson_id === lid && q.level === lv).length;
      const tbl = `<table class="tbl spec"><thead><tr><th>الدرس</th><th>الحصص</th><th>الوزن</th>${LV.map(([, n]) => `<th>${n}</th>`).join('')}<th>الأسئلة</th><th>الدرجات</th></tr></thead><tbody>${matrix.map((r, i) => { const l = lesson(r.lesson_id); const rt = r.cells.reduce((a, b) => a + b, 0); return `<tr><td><b>${esc(l.lesson || '')}</b></td><td>${AR(l.periods || 0)}</td><td>${AR(Math.round(r.w * 100))}٪</td>${r.cells.map((v, j) => { const h = have(r.lesson_id, LV[j][0]); return `<td><input class="in sc" type="number" min="0" data-i="${i}" data-j="${j}" value="${v}" aria-label="${esc(l.lesson || '')} ${LV[j][1]}">${v ? `<div class="small ${h >= v ? 'muted' : ''}" style="${h < v ? 'color:var(--bad)' : ''}">في البنك ${AR(h)}</div>` : ''}</td>`; }).join('')}<td><b>${AR(rt)}</b></td><td>${AR(+(rt * per).toFixed(2))}</td></tr>`; }).join('')}
        <tr style="font-weight:800;background:var(--pale)"><td>المجموع</td><td>${AR(matrix.reduce((a, r) => a + (lesson(r.lesson_id).periods || 0), 0))}</td><td>١٠٠٪</td>${colT.map((v, j) => `<td>${AR(v)} <span class="small muted">(${AR(Math.round(v / (tot || 1) * 100))}٪)</span></td>`).join('')}<td>${AR(tot)}</td><td>${AR(+(tot * per).toFixed(2))}</td></tr></tbody></table>`;
      const warn = [tot !== st.n && `مجموع الأسئلة (${AR(tot)}) لا يساوي العدد المطلوب (${AR(st.n)})`, matrix.some(r => !r.cells.some(Boolean)) && 'درس بلا أسئلة', matrix.some(r => r.cells.some((v, j) => v > have(r.lesson_id, LV[j][0]))) && 'بعض الخلايا تحتاج أسئلة إضافية في البنك (بالأحمر)'].filter(Boolean);
      o.innerHTML = `<h3 style="margin-top:16px">جدول المواصفات</h3>${warn.length ? `<div class="notice warn" style="display:block">${warn.join(' · ')}</div>` : '<div class="notice ok" style="display:block">الجدول متوازن ومطابق للعدد المطلوب.</div>'}<div class="scroll">${tbl}</div>
        <div class="row" style="margin-top:10px"><input class="in" id="sT" placeholder="عنوان الجدول" value="${esc(saved ? saved.title : `جدول مواصفات ${A.subjName(ctx.subj)} — ${gLabel(ctx.grade)}`)}" style="max-width:340px"><button class="btn" id="sSave">حفظ</button><button class="btn ghost" id="sPr">${I.print} طباعة</button><button class="btn ok" id="sQuiz">بناء اختبار من الجدول</button></div>`;
      $$('input.sc', o).forEach(i => i.onchange = () => { matrix[+i.dataset.i].cells[+i.dataset.j] = Math.max(0, +i.value || 0); out(); });
      $('#sSave', o).onclick = e => A.run(e.currentTarget, async () => { const row = { title: $('#sT', o).value.trim() || 'جدول مواصفات', settings: st, lesson_ids: matrix.map(r => r.lesson_id), matrix, updated_at: new Date().toISOString() }; if (saved) saved = await api.upd('spec_tables', saved.id, row); else saved = (await api.ins('spec_tables', { ...row, school_id: sch(), subject_id: ctx.subj, grade_key: ctx.grade }))[0]; A.toast('حُفظ جدول المواصفات', 'ok'); });
      $('#sPr', o).onclick = () => A.printDoc($('#sT', o).value || 'جدول المواصفات', `${A.subjName(ctx.subj)} · ${gLabel(ctx.grade)} · ${AR(st.n)} سؤالاً · ${AR(st.marks)} درجة`, tbl.replace(/<input[^>]*value="(\d+)"[^>]*>/g, '$1').replace(/<div class="small[^"]*"[^>]*>في البنك[^<]*<\/div>/g, '') + `<div style="display:flex;justify-content:space-between;margin-top:30px"><span>معلم المادة: ${esc(S.me.full_name)}</span><span>المشرف: ....................</span><span>التوقيع: ....................</span></div>`, true);
      $('#sQuiz', o).onclick = () => { const pick = []; const short = []; matrix.forEach(r => r.cells.forEach((v, j) => { if (!v) return; const pool = QB.filter(q => q.lesson_id === r.lesson_id && q.level === LV[j][0]).sort(() => Math.random() - 0.5); pick.push(...pool.slice(0, v).map(q => q.id)); if (pool.length < v) short.push(`${lesson(r.lesson_id).lesson} — ${LV[j][1]}: ينقص ${v - pool.length}`); }));
        if (!pick.length) return A.toast('لا توجد أسئلة في البنك لهذه الخلايا', 'err');
        quizEditor({ title: $('#sT', o).value.replace('جدول مواصفات', 'اختبار'), question_ids: pick, spec_id: saved && saved.id, kind: 'quiz' }, () => { A.LS.set('as_t', 'quizzes'); }, short); };
    };
    draw();
  }

  // ---------- الاختبارات وأوراق العمل ----------
  function quizEditor(z, done, shortages) {
    z = Object.assign({ kind: 'quiz', title: '', class_ids: [], question_ids: [], settings: { attempts: 1, show: 'after_submit', time: 0, shuffle: false } }, JSON.parse(JSON.stringify(z || {}))); z.settings = Object.assign({ attempts: 1, show: 'after_submit', time: 0, shuffle: false }, z.settings);
    const sel = new Set(z.question_ids);
    const cls = myClasses().filter(c => gk(c) === ctx.grade);
    const m = A.modal(`<h3>${z.id ? 'تعديل' : 'إنشاء'} ${KQ[z.kind] || 'اختبار'}</h3>${shortages && shortages.length ? `<div class="notice warn" style="display:block">نقص في البنك: ${esc(shortages.join('، '))}</div>` : ''}
      <div class="grid g3"><div class="field"><label for="zt">العنوان</label><input class="in" id="zt" value="${esc(z.title)}"></div><div class="field"><label for="zk">النوع</label><select class="in" id="zk">${Object.entries(KQ).map(([k, l]) => `<option value="${k}" ${z.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="za">عدد المحاولات</label><select class="in" id="za">${[[1, 'محاولة واحدة'], [2, 'محاولتان'], [3, '٣ محاولات'], [0, 'غير محدود']].map(([k, l]) => `<option value="${k}" ${z.settings.attempts == k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label for="zs">عرض الإجابات</label><select class="in" id="zs"><option value="after_submit" ${z.settings.show === 'after_submit' ? 'selected' : ''}>بعد التسليم مباشرة</option><option value="never" ${z.settings.show === 'never' ? 'selected' : ''}>لا تُعرض</option></select></div>
      <div class="field"><label for="zm">الوقت (دقائق، ٠ = مفتوح)</label><input class="in" id="zm" type="number" min="0" value="${z.settings.time || 0}"></div>
      <div class="field"><label for="zc">يُغلق في (اختياري)</label><input class="in" id="zc" type="datetime-local" value="${z.settings.close_at ? z.settings.close_at.slice(0, 16) : ''}"></div></div>
      <div class="grid g2"><div class="field"><label for="zw">الربط بالخطة</label><select class="in" id="zw"><option value="">مرن — متاح دون ربط بأسبوع</option>${S.weeks.filter(w => !w.archived || w.id === z.week_id).sort((a, b) => a.number - b.number).map(w => `<option value="${w.id}" ${(z.id ? z.week_id : S.weekId) === w.id ? 'selected' : ''}>الأسبوع ${esc(w.word)}</option>`).join('')}</select></div>
      <div class="field"><label for="zy">اليوم في الخطة (اختياري)</label><select class="in" id="zy"><option value="">ملاحظات الأسبوع (أي يوم)</option>${A.DAYS.slice(0, (A.section() || {}).days || 5).map((d, i) => `<option value="${i}" ${z.day === i ? 'selected' : ''}>${d}</option>`).join('')}</select></div></div>
      <p class="small muted" style="margin-top:-4px">المرتبط بأسبوع يظهر في ملف الخطة المصدَّر (في ملاحظات اليوم أو صفحة الملاحظات) وفي بوابة أولياء الأمور لذلك الأسبوع. «المرن» يظهر لأولياء الأمور دائماً حتى يُغلق.</p>
      <label class="chk"><input type="checkbox" id="zh" ${z.settings.shuffle ? 'checked' : ''}> خلط ترتيب الأسئلة لكل طالب</label>
      <div class="field"><label>الفصول</label><div class="perm-grid">${cls.map(c => `<label class="chk"><input type="checkbox" data-c="${c.id}" ${z.class_ids.includes(c.id) || !z.id ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div></div>
      <div class="field"><label>الأسئلة (<span id="zn"></span>)</label><div class="qpick">${QB.map(q => `<label class="chk"><input type="checkbox" data-q="${q.id}" ${sel.has(q.id) ? 'checked' : ''}> <span class="pill st-empty">${lvName(q.level)}</span> ${esc(q.body.slice(0, 90))} <span class="small muted">· ${esc(lesson(q.lesson_id).lesson || '')} · ${AR(q.points)} د</span></label>`).join('') || '<span class="muted small">البنك فارغ لهذه المادة والصف</span>'}</div></div>
      <div class="acts"><button class="btn ghost" id="zd">حفظ مسودة</button><button class="btn ok" id="zp">نشر وإنشاء الرابط</button></div>`, { cls: 'wide' });
    const cnt = () => { const n = sel.size, pts = QB.filter(q => sel.has(q.id)).reduce((a, q) => a + (+q.points || 0), 0); m.el.querySelector('#zn').textContent = `${AR(n)} سؤال · ${AR(pts)} درجة`; };
    $$('[data-q]', m.el).forEach(i => i.onchange = () => { i.checked ? sel.add(i.dataset.q) : sel.delete(i.dataset.q); cnt(); }); cnt();
    const save = pub => ev => A.run(ev.currentTarget, async () => {
      const row = { title: m.el.querySelector('#zt').value.trim(), kind: m.el.querySelector('#zk').value, class_ids: $$('[data-c]:checked', m.el).map(i => i.dataset.c), question_ids: z.question_ids.filter(id => sel.has(id)).concat([...sel].filter(id => !z.question_ids.includes(id))), settings: { attempts: +m.el.querySelector('#za').value, show: m.el.querySelector('#zs').value, time: +m.el.querySelector('#zm').value || 0, shuffle: m.el.querySelector('#zh').checked, close_at: m.el.querySelector('#zc').value ? new Date(m.el.querySelector('#zc').value).toISOString() : null }, status: pub ? 'published' : (z.status || 'draft'), week_id: m.el.querySelector('#zw').value || null, day: m.el.querySelector('#zy').value === '' ? null : +m.el.querySelector('#zy').value };
      if (!row.title) throw new Error('اكتب العنوان'); if (!row.question_ids.length) throw new Error('اختر سؤالاً واحداً على الأقل'); if (!row.class_ids.length) throw new Error('اختر فصلاً');
      let saved; if (z.id) saved = await api.upd('quizzes', z.id, row); else saved = (await api.ins('quizzes', { ...row, school_id: sch(), teacher_id: S.me.id, subject_id: ctx.subj, grade_key: ctx.grade, spec_id: z.spec_id || null }))[0];
      m.close(); A.toast(pub ? 'نُشر — انسخ الرابط للطلاب' : 'حُفظت المسودة', 'ok'); if (pub) shareDialog(saved); done && done();
    });
    m.el.querySelector('#zd').onclick = save(false); m.el.querySelector('#zp').onclick = save(true);
  }
  function shareDialog(z) {
    const link = qLink(z.code);
    const mine = S.entries.filter(e => e.teacher_id === S.me.id && e.subject_id === z.subject_id && z.class_ids.includes(e.class_id) && e.status !== 'approved').sort((a, b) => a.day - b.day || a.period - b.period);
    const m = A.modal(`<h3>رابط «${esc(z.title)}» للطلاب</h3><div class="row" style="flex-wrap:nowrap"><input class="in" dir="ltr" value="${esc(link)}" readonly id="shl"><button class="btn" id="shc">نسخ</button></div>
      <div class="row" style="margin-top:8px"><a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(z.title + '\n' + link)}">واتساب</a><a class="btn ghost sm" target="_blank" rel="noopener" href="${esc(link)}">معاينة كطالب</a></div>
      ${mine.length ? `<div class="field" style="margin-top:12px"><label for="shp">إدراج الرابط في واجب حصة من خطتك هذا الأسبوع</label><div class="row" style="flex-wrap:nowrap"><select class="in" id="shp">${mine.map(e => `<option value="${e.id}">${A.DAYS[e.day]} · الحصة ${AR(e.period + 1)} · ${esc((A.cls(e.class_id) || {}).name || '')}</option>`).join('')}</select><button class="btn ghost" id="shi">إدراج</button></div></div>` : ''}`);
    m.el.querySelector('#shc').onclick = () => navigator.clipboard.writeText(link).then(() => A.toast('نُسخ الرابط', 'ok'));
    const si = m.el.querySelector('#shi'); if (si) si.onclick = e => A.run(e.currentTarget, async () => { const en = S.entries.find(x => x.id === m.el.querySelector('#shp').value); const hw = ((en.homework || '').trim() + ' ' + `${KQ[z.kind] || 'اختبار'}: ${link}`).trim(); const r = await api.saveEntry(en.id, { homework: hw, status: 'submitted' }); Object.assign(en, r); A.toast('أُدرج الرابط في واجب الحصة', 'ok'); });
  }
  async function tQuiz(box) {
    const list = await api.list('quizzes', { school_id: sch(), subject_id: ctx.subj, grade_key: ctx.grade }, { order: 'created_at', desc: true });
    const mine = list.filter(z => z.teacher_id === S.me.id || S.me.is_owner);
    const att = mine.length ? await api.list('quiz_attempts', { quiz_id: mine.map(z => z.id) }, { select: 'quiz_id' }) : [];
    box.innerHTML = `<div class="row" style="margin:12px 0"><button class="btn" id="zNew">${I.plus} اختبار / ورقة عمل</button><span class="small muted">الرابط يفتح للطالب صفحة بهوية دينا يكتب فيها اسمه ويختار فصله دون حساب.</span></div>
      <div class="scroll"><table class="tbl"><thead><tr><th>العنوان</th><th>النوع</th><th>في الخطة</th><th>الأسئلة</th><th>الفصول</th><th>المحاولات</th><th>الحالة</th><th></th></tr></thead><tbody>${mine.map(z => `<tr><td><b>${esc(z.title)}</b>${z.spec_id ? ' <span class="pill st-submitted">من جدول المواصفات</span>' : ''}</td><td>${KQ[z.kind]}</td><td class="small">${z.week_id ? 'الأسبوع ' + esc((S.weeks.find(w => w.id === z.week_id) || {}).word || '') + (z.day != null ? ' · ' + A.DAYS[z.day] : '') : '<span class="pill st-empty">مرن</span>'}</td><td>${AR(z.question_ids.length)}</td><td class="small">${esc(z.class_ids.map(id => (A.cls(id) || {}).name).filter(Boolean).join('، '))}</td><td>${AR(att.filter(a => a.quiz_id === z.id).length)}</td><td><span class="pill ${z.status === 'published' ? 'st-approved' : z.status === 'closed' ? 'st-returned' : 'st-empty'}">${z.status === 'published' ? 'منشور' : z.status === 'closed' ? 'مغلق' : 'مسودة'}</span></td>
        <td class="row" style="flex-wrap:nowrap;gap:4px">${z.status === 'published' ? `<button class="btn sm" data-sh="${z.id}">الرابط</button><button class="btn ghost sm" data-cl="${z.id}">إغلاق</button>` : `<button class="btn ghost sm" data-op="${z.id}">${z.status === 'closed' ? 'إعادة فتح' : 'نشر'}</button>`}<button class="btn ghost sm" data-ed="${z.id}">تعديل</button><button class="btn ghost sm" data-p0="${z.id}" title="طباعة الورقة">${I.print}</button><button class="btn ghost sm" data-p1="${z.id}" title="نموذج الإجابة">✓</button></td></tr>`).join('') || `<tr><td colspan="8">${A.emptyBox('لا توجد اختبارات بعد', 'أنشئ اختباراً من الأسئلة، أو ابنه آلياً من جدول المواصفات.')}</td></tr>`}</tbody></table></div>`;
    const re = () => V.assess(box.closest('main') || document.querySelector('main'));
    $('#zNew', box).onclick = () => quizEditor(null, re);
    const Z = id => mine.find(z => z.id === id);
    $$('[data-sh]', box).forEach(b => b.onclick = () => shareDialog(Z(b.dataset.sh)));
    $$('[data-ed]', box).forEach(b => b.onclick = () => quizEditor(Z(b.dataset.ed), re));
    $$('[data-cl]', box).forEach(b => b.onclick = () => A.run(b, async () => { await api.upd('quizzes', b.dataset.cl, { status: 'closed' }); re(); }));
    $$('[data-op]', box).forEach(b => b.onclick = () => A.run(b, async () => { const z = await api.upd('quizzes', b.dataset.op, { status: 'published' }); shareDialog(z); re(); }));
    const qs = z => z.question_ids.map(id => QB.find(q => q.id === id)).filter(Boolean);
    $$('[data-p0]', box).forEach(b => b.onclick = () => { const z = Z(b.dataset.p0); printPaper(z.title, qs(z), false); });
    $$('[data-p1]', box).forEach(b => b.onclick = () => { const z = Z(b.dataset.p1); printPaper(z.title, qs(z), true); });
  }

  // ---------- النتائج والتحليل ----------
  // تقرير تراكمي عبر كل الاختبارات وأوراق العمل للمادة والصف: الطالب، الدرس، الفصل
  async function tCum(box) {
    const list = (await api.list('quizzes', { school_id: sch(), subject_id: ctx.subj, grade_key: ctx.grade }, { order: 'created_at' })).filter(z => z.status !== 'draft' && (z.teacher_id === S.me.id || S.me.is_owner || A.hasModule('supervision')));
    if (!list.length) { box.innerHTML = A.emptyBox('لا توجد اختبارات منشورة لهذه المادة والصف'); return; }
    const at = await api.list('quiz_attempts', { quiz_id: list.map(z => z.id) }, { order: 'submitted_at' });
    if (!at.length) { box.innerHTML = A.emptyBox('لا توجد محاولات بعد', 'يظهر التقرير بعد أن يحل الطلاب اختباراً واحداً على الأقل.'); return; }
    const pc = a => a.max_score ? Math.round(a.score / a.max_score * 100) : 0;
    const best = {}; at.forEach(a => { const k = a.quiz_id + '|' + A.normKey(a.student_name) + '|' + a.class_id; if (!best[k] || a.score >= best[k].score) best[k] = a; });
    const B = Object.values(best);
    const zi = Object.fromEntries(list.map((z, i) => [z.id, i]));
    const st = {}; B.forEach(a => { const k = A.normKey(a.student_name) + '|' + a.class_id; const r = st[k] = st[k] || { name: a.student_name, cls: a.class_id, by: {} }; r.by[a.quiz_id] = pc(a); });
    const studs = Object.values(st).map(r => { const v = list.filter(z => z.id in r.by).map(z => r.by[z.id]); const avg = Math.round(v.reduce((x, y) => x + y, 0) / v.length); const tr = v.length >= 2 ? v[v.length - 1] - v[0] : 0; return { ...r, n: v.length, avg, tr }; });
    const lv = p => p >= 80 ? ['متمكن', 'st-approved'] : p >= 50 ? ['متوسط', 'st-submitted'] : ['يحتاج دعماً', 'st-returned'];
    // إتقان الدروس من إجابات كل سؤال
    const les = {}; B.forEach(a => Object.entries(a.per_q || {}).forEach(([qid, r]) => { const q = QB.find(x => x.id === qid); if (!q) return; const k = q.lesson_id || ''; const c = les[k] = les[k] || { got: 0, mx: 0 }; c.mx += +q.points || 1; if (r && r.ok) c.got += +q.points || 1; }));
    const lesL = Object.entries(les).map(([k, c]) => ({ k, p: c.mx ? Math.round(c.got / c.mx * 100) : 0 })).sort((a, b) => a.p - b.p);
    const clsL = [...new Set(studs.map(s => s.cls))].map(c => { const l = studs.filter(s => s.cls === c); return { c, n: l.length, avg: Math.round(l.reduce((x, s) => x + s.avg, 0) / l.length), weak: l.filter(s => s.avg < 50).length }; }).sort((a, b) => b.avg - a.avg);
    const weak = studs.filter(s => s.avg < 50).sort((a, b) => a.avg - b.avg);
    const cn = id => (A.cls(id) || {}).name || '';
    const arrow = t => t > 4 ? `<span style="color:var(--ok)" title="تحسّن">▲ ${AR(t)}</span>` : t < -4 ? `<span style="color:var(--bad)" title="تراجع">▼ ${AR(-t)}</span>` : '<span class="faint">—</span>';
    const cell = p => p == null ? '<td class="faint">—</td>' : `<td><span class="pill ${lv(p)[1]}">${AR(p)}٪</span></td>`;
    let fc = A.LS.get('cu_c') || 'all'; if (fc !== 'all' && !clsL.some(x => x.c === fc)) fc = 'all';
    const draw = () => {
      const S2 = studs.filter(s => fc === 'all' || s.cls === fc).sort((a, b) => a.avg - b.avg);
      box.innerHTML = `<div class="grid g4" style="margin-top:12px"><div class="kpi navy"><div class="k">اختبارات وأوراق محسوبة</div><div class="v">${AR(list.length)}</div><div class="d">${A.cnt(B.length, 'نتيجة', 'نتائج')}</div></div>
        <div class="kpi"><div class="k">متوسط الطلاب</div><div class="v">${AR(Math.round(studs.reduce((x, s) => x + s.avg, 0) / studs.length))}<small>٪</small></div><div class="d">${A.cnt(studs.length, 'طالب', 'طلاب')}</div></div>
        <div class="kpi"><div class="k">يحتاجون دعماً مستمراً</div><div class="v" style="color:var(--bad)">${AR(weak.length)}</div><div class="d">متوسطهم التراكمي أقل من ٥٠٪</div></div>
        <div class="kpi"><div class="k">أضعف درس</div><div class="v" style="font-size:18px">${lesL[0] ? esc(lesson(lesL[0].k).lesson || 'بلا درس') : '—'}</div><div class="d">${lesL[0] ? AR(lesL[0].p) + '٪ إتقان' : ''}</div></div></div>
        <div class="row" style="margin:12px 0;gap:8px"><button class="btn ghost sm" id="cuX">${I.down} Excel</button><button class="btn ghost sm" id="cuP">${I.print} طباعة التقرير</button></div>
        <div class="grid g2" style="align-items:start"><div class="sec-box"><b>مقارنة الفصول</b><div class="scroll"><table class="tbl"><thead><tr><th>الفصل</th><th>الطلاب</th><th>المتوسط</th><th>يحتاجون دعماً</th></tr></thead><tbody>${clsL.map(x => `<tr><td><b>${esc(cn(x.c))}</b></td><td>${AR(x.n)}</td>${cell(x.avg)}<td>${AR(x.weak)}</td></tr>`).join('')}</tbody></table></div></div>
          <div class="sec-box"><b>إتقان الدروس عبر كل الاختبارات (الأضعف أولاً)</b>${lesL.map(c => `<div style="margin-top:8px"><div class="row" style="justify-content:space-between"><span>${esc(lesson(c.k).lesson || 'بلا درس')}</span><b>${AR(c.p)}٪</b></div>${A.bar(c.p, 100)}</div>`).join('') || A.emptyBox('لا توجد بيانات')}</div></div>
        <div class="row" style="margin:16px 0 8px;justify-content:space-between"><h3 style="margin:0">الطلاب عبر الاختبارات</h3><label class="small">الفصل <select class="in" id="cuC" style="max-width:200px"><option value="all">كل الفصول</option>${clsL.map(x => `<option value="${x.c}" ${fc === x.c ? 'selected' : ''}>${esc(cn(x.c))}</option>`).join('')}</select></label></div>
        <div class="scroll"><table class="tbl"><thead><tr><th>الطالب</th><th>الفصل</th>${list.map((z, i) => `<th title="${esc(z.title)}">${AR(i + 1)}</th>`).join('')}<th>المتوسط</th><th>الاتجاه</th><th>المستوى</th></tr></thead>
        <tbody>${S2.map(s => `<tr><td><b>${esc(s.name)}</b></td><td>${esc(cn(s.cls))}</td>${list.map(z => cell(s.by[z.id])).join('')}<td><b>${AR(s.avg)}٪</b></td><td>${arrow(s.tr)}</td><td><span class="pill ${lv(s.avg)[1]}">${lv(s.avg)[0]}</span></td></tr>`).join('')}</tbody></table></div>
        <p class="small muted" style="margin-top:6px">الأرقام في رأس الجدول: ${list.map((z, i) => `${AR(i + 1)}) ${esc(z.title)}`).join(' · ')}. تُحسب أفضل محاولة للطالب في كل اختبار. الاتجاه = الفرق بين آخر اختبار وأول اختبار حلّه.</p>`;
      $('#cuC', box).onchange = e => { fc = e.target.value; A.LS.set('cu_c', fc); draw(); };
      $('#cuX', box).onclick = () => { const wb = XLSX.utils.book_new();
        const s1 = XLSX.utils.json_to_sheet(S2.map(s => ({ الطالب: s.name, الفصل: cn(s.cls), ...Object.fromEntries(list.map((z, i) => [(i + 1) + ') ' + z.title.slice(0, 25), s.by[z.id] ?? ''])), 'المتوسط %': s.avg, الاتجاه: s.tr, المستوى: lv(s.avg)[0] })));
        const s2 = XLSX.utils.json_to_sheet(lesL.map(c => ({ الدرس: lesson(c.k).lesson || 'بلا درس', 'الإتقان %': c.p })));
        const s3 = XLSX.utils.json_to_sheet(clsL.map(x => ({ الفصل: cn(x.c), الطلاب: x.n, 'المتوسط %': x.avg, 'يحتاجون دعماً': x.weak })));
        [s1, s2, s3].forEach(w => w['!views'] = [{ RTL: true }]);
        XLSX.utils.book_append_sheet(wb, s1, 'الطلاب'); XLSX.utils.book_append_sheet(wb, s2, 'الدروس'); XLSX.utils.book_append_sheet(wb, s3, 'الفصول');
        XLSX.writeFile(wb, `تقرير تراكمي - ${A.subjName(ctx.subj)} - ${gLabel(ctx.grade)}.xlsx`); };
      $('#cuP', box).onclick = () => A.printDoc('التقرير التراكمي للتقويم', `${A.subjName(ctx.subj)} · ${gLabel(ctx.grade)} · ${list.length} اختبارات`,
        `<h3>الفصول</h3><table><tr><th>الفصل</th><th>الطلاب</th><th>المتوسط</th><th>يحتاجون دعماً</th></tr>${clsL.map(x => `<tr><td>${esc(cn(x.c))}</td><td>${x.n}</td><td>${x.avg}٪</td><td>${x.weak}</td></tr>`).join('')}</table>
         <h3>إتقان الدروس</h3><table><tr><th>الدرس</th><th>الإتقان</th></tr>${lesL.map(c => `<tr><td>${esc(lesson(c.k).lesson || 'بلا درس')}</td><td>${c.p}٪</td></tr>`).join('')}</table>
         <h3>طلاب يحتاجون دعماً مستمراً</h3><table><tr><th>الطالب</th><th>الفصل</th><th>المتوسط</th><th>عدد الاختبارات</th></tr>${weak.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(cn(s.cls))}</td><td>${s.avg}٪</td><td>${s.n}</td></tr>`).join('') || '<tr><td colspan="4">لا يوجد</td></tr>'}</table>`);
    };
    draw();
  }
  async function tRes(box) {
    const list = (await api.list('quizzes', { school_id: sch(), subject_id: ctx.subj, grade_key: ctx.grade }, { order: 'created_at', desc: true })).filter(z => z.teacher_id === S.me.id || S.me.is_owner || A.hasModule('supervision'));
    let zid = A.LS.get('as_z'); if (!list.some(z => z.id === zid)) zid = (list[0] || {}).id;
    box.innerHTML = `<div class="row" style="margin:12px 0"><select class="in" id="rz" style="max-width:340px">${list.map(z => `<option value="${z.id}" ${z.id === zid ? 'selected' : ''}>${esc(z.title)}</option>`).join('')}</select></div><div id="rOut"></div>`;
    if (!zid) { $('#rOut', box).innerHTML = A.emptyBox('لا توجد اختبارات'); return; }
    $('#rz', box).onchange = e => { A.LS.set('as_z', e.target.value); tRes(box); };
    const z = list.find(x => x.id === zid); const at = await api.list('quiz_attempts', { quiz_id: zid }, { order: 'submitted_at' });
    const qs = z.question_ids.map(id => QB.find(q => q.id === id)).filter(Boolean);
    if (!at.length) { $('#rOut', box).innerHTML = A.emptyBox('لا توجد محاولات بعد', 'انشر الرابط للطلاب من تبويب الاختبارات.'); return; }
    const last = {}; at.forEach(a => { const k = a.student_name + '|' + a.class_id; if (!last[k] || a.score >= last[k].score) last[k] = a; }); const best = Object.values(last);
    const pc = a => a.max_score ? Math.round(a.score / a.max_score * 100) : 0;
    const lvl = p => p >= 80 ? ['متمكن', 'st-approved'] : p >= 50 ? ['متوسط', 'st-submitted'] : ['يحتاج دعماً', 'st-returned'];
    const avg = Math.round(best.reduce((a, x) => a + pc(x), 0) / best.length);
    const qStat = qs.map(q => { const ans = best.filter(a => a.per_q && a.per_q[q.id]); const okN = ans.filter(a => a.per_q[q.id].ok).length; return { q, p: ans.length ? Math.round(okN / ans.length * 100) : 0 }; });
    const cells = {}; qs.forEach(q => { const k = (q.lesson_id || '') + '|' + q.level; (cells[k] = cells[k] || { lesson: q.lesson_id, level: q.level, qs: [] }).qs.push(q); });
    const mastery = (a, c) => { let got = 0, mx = 0; c.qs.forEach(q => { mx += +q.points; if (a.per_q && a.per_q[q.id] && a.per_q[q.id].ok) got += +q.points; }); return mx ? Math.round(got / mx * 100) : 0; };
    const cellAvg = Object.values(cells).map(c => ({ ...c, p: Math.round(best.reduce((s, a) => s + mastery(a, c), 0) / best.length) })).sort((a, b) => a.p - b.p);
    const dist = [0, 0, 0]; best.forEach(a => { const p = pc(a); dist[p >= 80 ? 0 : p >= 50 ? 1 : 2]++; });
    $('#rOut', box).innerHTML = `<div class="grid g4"><div class="kpi navy"><div class="k">متوسط الأداء</div><div class="v">${AR(avg)}<small>٪</small></div><div class="d">${A.cnt(best.length, 'طالب', 'طلاب')} · ${A.cnt(at.length, 'محاولة', 'محاولات')}</div></div><div class="kpi"><div class="k">متمكن (٨٠٪+)</div><div class="v" style="color:var(--ok)">${AR(dist[0])}</div></div><div class="kpi"><div class="k">متوسط</div><div class="v">${AR(dist[1])}</div></div><div class="kpi"><div class="k">يحتاج دعماً (<٥٠٪)</div><div class="v" style="color:var(--bad)">${AR(dist[2])}</div></div></div>
      <div class="row" style="margin:12px 0"><button class="btn ok" id="rRem">إنشاء خطط علاجية وإثرائية من النتائج</button><button class="btn ghost sm" id="rX">${I.down} Excel</button><button class="btn ghost sm" id="rP">${I.print} طباعة التحليل</button></div>
      <div class="grid g2" style="align-items:start"><div class="sec-box"><b>إتقان الدروس والمستويات (الأضعف أولاً)</b>${cellAvg.map(c => `<div style="margin-top:8px"><div class="row" style="justify-content:space-between"><span>${esc(lesson(c.lesson).lesson || 'بلا درس')} — ${lvName(c.level)}</span><b>${AR(c.p)}٪</b></div>${A.bar(c.p, 100)}</div>`).join('')}</div>
      <div class="sec-box"><b>معامل السهولة لكل سؤال</b>${qStat.map((x, i) => `<div style="margin-top:8px"><div class="row" style="justify-content:space-between"><span class="small">${AR(i + 1)}) ${esc(x.q.body.slice(0, 60))}</span><b class="${x.p < 40 ? '' : ''}" style="${x.p < 40 ? 'color:var(--bad)' : ''}">${AR(x.p)}٪</b></div>${A.bar(x.p, 100)}</div>`).join('')}</div></div>
      <h3 style="margin-top:16px">نتائج الطلاب</h3><div class="scroll"><table class="tbl"><thead><tr><th>الطالب</th><th>الفصل</th><th>الدرجة</th><th>النسبة</th><th>المستوى</th><th>المحاولة</th><th>الوقت</th><th></th></tr></thead><tbody>${best.sort((a, b) => pc(b) - pc(a)).map(a => { const [l, c] = lvl(pc(a)); return `<tr><td><b>${esc(a.student_name)}</b></td><td>${esc((A.cls(a.class_id) || {}).name || '')}</td><td>${AR(a.score)} / ${AR(a.max_score)}${a.pending_manual ? ' <span class="pill st-submitted">مقالي بانتظار التصحيح</span>' : ''}</td><td>${AR(pc(a))}٪</td><td><span class="pill ${c}">${l}</span></td><td>${AR(a.attempt_no)}</td><td class="small">${A.fmtDT(a.submitted_at)}</td><td>${qs.some(q => q.qtype === 'essay') ? `<button class="btn ghost sm" data-mg="${a.id}">تصحيح المقالي</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
    $('#rX', box).onclick = () => { const ws = XLSX.utils.json_to_sheet(best.map(a => ({ الطالب: a.student_name, الفصل: (A.cls(a.class_id) || {}).name, الدرجة: a.score, 'من': a.max_score, 'النسبة %': pc(a), المستوى: lvl(pc(a))[0], ...Object.fromEntries(qs.map((q, i) => ['س' + (i + 1), a.per_q && a.per_q[q.id] ? (a.per_q[q.id].ok ? 1 : 0) : ''])) }))); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'النتائج'); XLSX.writeFile(wb, `نتائج ${z.title}.xlsx`); };
    $('#rP', box).onclick = () => A.printDoc('تحليل نتائج: ' + z.title, `${A.subjName(ctx.subj)} · ${gLabel(ctx.grade)} · المتوسط ${avg}٪`, `<table><tr><th>الدرس — المستوى</th><th>نسبة الإتقان</th></tr>${cellAvg.map(c => `<tr><td>${esc(lesson(c.lesson).lesson || '')} — ${lvName(c.level)}</td><td>${c.p}٪</td></tr>`).join('')}</table><h3>الطلاب</h3><table><tr><th>الطالب</th><th>الفصل</th><th>النسبة</th><th>المستوى</th></tr>${best.map(a => `<tr><td>${esc(a.student_name)}</td><td>${esc((A.cls(a.class_id) || {}).name || '')}</td><td>${pc(a)}٪</td><td>${lvl(pc(a))[0]}</td></tr>`).join('')}</table>`, false);
    $$('[data-mg]', box).forEach(b => b.onclick = () => { const a = at.find(x => x.id === b.dataset.mg); const ess = qs.filter(q => q.qtype === 'essay');
      const m = A.modal(`<h3>تصحيح المقالي — ${esc(a.student_name)}</h3>${ess.map(q => `<div class="sec-box" style="margin-bottom:8px"><b>${esc(q.body)}</b><div class="ro-txt" style="margin:6px 0">${esc((a.answers || {})[q.id] || '—')}</div><div class="small muted">النموذجية: ${esc(q.answer)}</div><label class="small">الدرجة من ${AR(q.points)} <input class="in" type="number" min="0" max="${q.points}" step="0.5" data-q="${q.id}" value="${(a.per_q[q.id] || {}).pts || 0}" style="width:90px"></label></div>`).join('')}<div class="acts"><button class="btn" id="mgo">حفظ</button></div>`, { cls: 'wide' });
      m.el.querySelector('#mgo').onclick = e => A.run(e.currentTarget, async () => { const per = { ...a.per_q }; $$('[data-q]', m.el).forEach(i => { const q = qs.find(x => x.id === i.dataset.q); const v = Math.min(+q.points, Math.max(0, +i.value || 0)); per[q.id] = { ok: v >= +q.points / 2, pts: v }; }); const score = qs.reduce((s, q) => s + (per[q.id] ? (q.qtype === 'essay' ? +per[q.id].pts : (per[q.id].ok ? +q.points : 0)) : 0), 0); await api.upd('quiz_attempts', a.id, { per_q: per, score, pending_manual: false }); m.close(); tRes(box); A.toast('حُفظ التصحيح', 'ok'); }); });
    $('#rRem', box).onclick = e => A.run(e.currentTarget, async () => {
      const exist = await api.list('remedial_plans', { quiz_id: zid }, { select: 'student_name,class_id' }); const has = new Set(exist.map(x => x.student_name + '|' + x.class_id));
      const rows = best.filter(a => !has.has(a.student_name + '|' + a.class_id)).map(a => { const p = pc(a); const gaps = Object.values(cells).map(c => ({ lesson: lesson(c.lesson).lesson || 'بلا درس', lesson_id: c.lesson, level: c.level, p: mastery(a, c) })).filter(g => p >= 90 ? true : g.p < 60).sort((x, y) => x.p - y.p);
        return p >= 90 ? { kind: 'enrichment', gaps: [], actions: 'أنشطة إثرائية ومهام تفكير عليا في الدروس المتقنة.' } : gaps.length ? { kind: 'remedial', gaps, actions: 'مراجعة مفاهيم: ' + gaps.slice(0, 3).map(g => g.lesson).join('، ') + ' — شرح مختصر، ورقة دعم، ثم اختبار قصير للتحقق.' } : null; })
        .map((r, i) => r && ({ ...r, school_id: sch(), quiz_id: zid, teacher_id: S.me.id, student_name: best.filter(a => !has.has(a.student_name + '|' + a.class_id))[i].student_name, class_id: best.filter(a => !has.has(a.student_name + '|' + a.class_id))[i].class_id })).filter(Boolean);
      if (!rows.length) return A.toast('لا توجد خطط جديدة (أُنشئت سابقاً أو لا فجوات)');
      await api.ins('remedial_plans', rows); A.LS.set('as_t', 'remedial'); A.toast(`أُنشئت ${A.cnt(rows.filter(r => r.kind === 'remedial').length, 'خطة علاجية', 'خطط علاجية')} و${AR(rows.filter(r => r.kind === 'enrichment').length)} إثرائية`, 'ok'); V.assess(document.querySelector('main'));
    });
  }

  // ---------- الخطط العلاجية والإثرائية ----------
  async function tRem(box) {
    const plans = await api.list('remedial_plans', { school_id: sch() }, { order: 'created_at', desc: true });
    const quizzes = await api.list('quizzes', { school_id: sch(), subject_id: ctx.subj, grade_key: ctx.grade, status: 'published' });
    const mine = plans.filter(p => p.teacher_id === S.me.id || S.me.is_owner || A.hasModule('supervision'));
    box.innerHTML = `<p class="sub" style="margin:12px 0">كل خطة لها رابط خاص يفتحه الطالب أو ولي أمره: الفجوات، الإجراءات، أوراق الدعم والاختبار التحققي، ونسبة التقدم.</p>
      <div class="row" style="margin-bottom:10px"><button class="btn ghost sm" id="rmAll">نسخ كل الروابط (للمراسلة)</button></div>
      <div class="scroll"><table class="tbl"><thead><tr><th>الطالب</th><th>الفصل</th><th>النوع</th><th>الفجوات</th><th>التقدم</th><th></th></tr></thead><tbody>${mine.map(p => `<tr><td><b>${esc(p.student_name)}</b></td><td>${esc((A.cls(p.class_id) || {}).name || '')}</td><td><span class="pill ${p.kind === 'enrichment' ? 'st-approved' : 'st-submitted'}">${p.kind === 'enrichment' ? 'إثرائية' : 'علاجية'}</span></td><td class="small">${p.gaps.slice(0, 4).map(g => `${esc(g.lesson)} (${lvName(g.level)}: ${AR(g.p)}٪)`).join('، ') || '—'}</td><td style="min-width:140px"><input type="range" min="0" max="100" step="10" value="${p.progress}" data-pg="${p.id}" aria-label="التقدم"> <span class="small">${AR(p.progress)}٪</span></td><td class="row" style="flex-wrap:nowrap;gap:4px"><button class="btn ghost sm" data-ed="${p.id}">تعديل</button><button class="btn sm" data-ln="${p.id}">الرابط</button></td></tr>`).join('') || `<tr><td colspan="6">${A.emptyBox('لا توجد خطط', 'أنشئها من «النتائج والتحليل» بعد أي اختبار.')}</td></tr>`}</tbody></table></div>`;
    const P = id => mine.find(p => p.id === id);
    $$('[data-pg]', box).forEach(r => r.onchange = () => A.run(null, async () => { await api.upd('remedial_plans', r.dataset.pg, { progress: +r.value, status: +r.value >= 100 ? 'done' : 'active' }); r.nextElementSibling.textContent = AR(r.value) + '٪'; }));
    $$('[data-ln]', box).forEach(b => b.onclick = () => { const l = rLink(P(b.dataset.ln).token); navigator.clipboard.writeText(l).then(() => A.toast('نُسخ رابط خطة الطالب', 'ok')); });
    $('#rmAll', box).onclick = () => navigator.clipboard.writeText(mine.map(p => `${p.student_name}: ${rLink(p.token)}`).join('\n')).then(() => A.toast(`نُسخت ${A.cnt(mine.length, 'رابط', 'روابط')}`, 'ok'));
    const RS = A.fetchResources ? (await A.fetchResources()).filter(r => !r.subject_id || r.subject_id === ctx.subj) : [];
    $$('[data-ed]', box).forEach(b => b.onclick = () => { const p = P(b.dataset.ed);
      const m = A.modal(`<h3>خطة ${esc(p.student_name)}</h3><div class="field"><label for="pa">الإجراءات</label><textarea class="in" id="pa" rows="4">${esc(p.actions)}</textarea></div>
        <div class="field"><label>أوراق دعم واختبارات تحققية (منشورة)</label><div class="perm-grid">${quizzes.map(z => `<label class="chk"><input type="checkbox" value="${z.id}" ${p.support_quiz_ids.includes(z.id) ? 'checked' : ''}> ${esc(z.title)} <span class="small muted">· ${KQ[z.kind]}</span></label>`).join('') || '<span class="small muted">أنشئ ورقة دعم من تبويب الاختبارات (النوع: ورقة دعم علاجية)</span>'}</div></div>
        ${RS.length ? `<div class="field"><label>من مكتبة المصادر</label><div class="perm-grid" id="prs" style="max-height:180px;overflow:auto">${RS.map(r => `<label class="chk"><input type="checkbox" value="${r.id}" ${p.resource_links.some(x => x.u === r.url) ? 'checked' : ''}> ${esc(r.title)}</label>`).join('')}</div></div>` : ''}
        <div class="field"><label for="pr">روابط إضافية (سطر لكل رابط: العنوان | الرابط)</label><textarea class="in" id="pr" rows="3" dir="auto">${esc(p.resource_links.filter(r => !RS.some(x => x.url === r.u)).map(r => r.t + ' | ' + r.u).join('\n'))}</textarea></div><div class="acts"><button class="btn" id="pgo">حفظ</button></div>`, { cls: 'wide' });
      m.el.querySelector('#pgo').onclick = e => A.run(e.currentTarget, async () => { await api.upd('remedial_plans', p.id, { actions: m.el.querySelector('#pa').value.trim(), support_quiz_ids: $$('.perm-grid input:checked', m.el).map(i => i.value), resource_links: (() => { const lib = $$('#prs input', m.el).filter(i => i.checked).map(i => RS.find(r => r.id === i.value)).map(r => ({ t: r.title, u: r.url })); const libU = new Set(RS.map(r => r.url)); const extra = m.el.querySelector('#pr').value.split('\n').map(l => l.split('|').map(x => x.trim())).filter(x => x[1] && /^https?:/.test(x[1]) && !libU.has(x[1])).map(([t, u]) => ({ t, u })); return lib.concat(extra); })() }); m.close(); tRem(box); A.toast('حُفظت الخطة', 'ok'); }); });
  }
})();
