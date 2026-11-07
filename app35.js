/* منصة دينا — التحضير: تحضير الدروس (أهداف، تمهيد، استراتيجيات، أنشطة، تقويم، واجب، مهمة أدائية، إثراء، علاج، مصادر)
   + مولّد آلي لهيكل التحضير من اسم الدرس + مكتبة المدرسة (يعدّها المالك/الإشراف وتبقى مخفية حتى تُفعَّل وتُسند لمعلمين)
   + طباعة بنموذج دينا + إدراج في الخطة الأسبوعية + مشاركة المصادر مع أولياء أمور فصول محددة فقط. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, I } = A;
  A.I.prep = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h12l4 4v12H4z"/><path d="M16 4v4h4"/><path d="M8 12h8M8 16h5"/></svg>';
  const lead = () => S.me && (S.me.is_owner || (A.hasModule && A.hasModule('supervision')));
  if (A.NAV && !A.NAV.some(n => n[0] === 'prep')) { const i = A.NAV.findIndex(n => n[0] === 'assess'); A.NAV.splice(i < 0 ? A.NAV.length : i, 0, ['prep', 'التحضير', () => !!S.me && !(A.coordOnly && A.coordOnly())]); }
  const gk = c => c ? `${c.stage}|${c.grade_word}` : '';
  const gLabel = k => { const [st, g] = (k || '|').split('|'); return g ? A.gradeName(g, st) : '—'; };
  const mySubjects = () => { const m = new Set(S.entries.filter(e => e.teacher_id === S.me.id && e.subject_id).map(e => e.subject_id)); return (S.me.is_owner || lead() || !m.size) ? S.subjects : S.subjects.filter(s => m.has(s.id)); };
  const myGrades = () => { const mine = new Set(S.entries.filter(e => e.teacher_id === S.me.id).map(e => e.class_id)); const cl = S.classes.filter(c => c.active && (S.me.is_owner || lead() || !mine.size || mine.has(c.id))); return [...new Set(cl.map(gk))]; };
  const STRAT = ['التعلم التعاوني', 'العصف الذهني', 'الخرائط الذهنية', 'التعلم بالأقران', 'حل المشكلات', 'الاستقصاء', 'التجريب العملي', 'لعب الأدوار', 'القصة', 'الحوار والمناقشة', 'التعلم باللعب', 'فكّر - زاوج - شارك', 'المحطات التعليمية', 'الصف المقلوب', 'التعلم القائم على المشروع', 'القراءة الموجهة', 'النمذجة', 'التعلم الرقمي التفاعلي'];
  const TOOLS = ['الكتاب المدرسي', 'السبورة الذكية', 'عرض تقديمي', 'أوراق عمل', 'بطاقات تعليمية', 'فيديو تعليمي', 'نماذج ومجسمات', 'أدوات المختبر', 'منصة تفاعلية', 'جهاز لوحي'];

  // ---------- المولّد الآلي (قواعد، دون اتصال بالإنترنت) ----------
  function generate(lesson, subj) {
    const L = lesson || 'الدرس', s = A.normKey(subj || '');
    const isM = /رياض/.test(s), isSc = /علوم|فيزي|كيمي|احياء|ارض/.test(s), isL = /عربي|لغه|انجليز|english/i.test(s), isR = /اسلام|قران|توحيد|فقه|حديث|تفسير/.test(s);
    const strat = isM ? ['حل المشكلات', 'التعلم بالأقران', 'النمذجة'] : isSc ? ['الاستقصاء', 'التجريب العملي', 'التعلم التعاوني'] : isL ? ['القراءة الموجهة', 'لعب الأدوار', 'فكّر - زاوج - شارك'] : isR ? ['الحوار والمناقشة', 'القصة', 'التعلم التعاوني'] : ['التعلم التعاوني', 'العصف الذهني', 'الخرائط الذهنية'];
    return {
      objectives: [`أن يتعرّف الطالب على مفهوم «${L}».`, `أن يوضّح الطالب أبرز عناصر «${L}» بأسلوبه.`, isM ? `أن يحلّ الطالب مسائل متنوعة على «${L}» بدقة.` : isSc ? `أن ينفّذ الطالب نشاطاً عملياً يفسّر «${L}».` : isL ? `أن يوظّف الطالب «${L}» في جمل وأمثلة صحيحة.` : `أن يطبّق الطالب ما تعلّمه في «${L}» في مواقف جديدة.`, isR ? `أن يستشعر الطالب أثر «${L}» في سلوكه اليومي.` : `أن يقدّر الطالب أهمية «${L}» في حياته.`].join('\n'),
      warmup: `مراجعة سريعة للدرس السابق، ثم طرح سؤال مثير للتفكير يربط «${L}» بواقع الطالب.`,
      strategies: strat, tools: ['الكتاب المدرسي', 'السبورة الذكية', isSc ? 'أدوات المختبر' : 'أوراق عمل'],
      activities: [{ t: 'التمهيد', d: 'سؤال افتتاحي أو صورة / مقطع قصير.', m: 5 }, { t: 'العرض والشرح', d: `تقديم «${L}» بأمثلة متدرجة ومشاركة الطلاب.`, m: 12 }, { t: 'نشاط جماعي', d: `مجموعات تنفّذ نشاطاً تطبيقياً على «${L}» وتعرض نتائجها.`, m: 12 }, { t: 'تطبيق فردي', d: 'تمرين أو ورقة عمل قصيرة.', m: 8 }, { t: 'الغلق', d: 'تلخيص الطلاب لأهم ما تعلموه + بطاقة خروج.', m: 3 }],
      assessment: 'ملاحظة أداء المجموعات، أسئلة شفهية قصيرة، وبطاقة خروج من سؤالين.',
      homework: `حل تمارين «${L}» في الكتاب (ص ....).`,
      perf_task: `مهمة أدائية: ${isSc ? 'تصميم تجربة بسيطة أو نموذج يوضح' : isM ? 'حل مسألة حياتية باستخدام' : isL ? 'إنتاج نص قصير يوظّف' : 'إعداد بطاقة/ملصق يوضّح'} «${L}» مع سلم تقدير.`,
      enrichment: `نشاط إثرائي: بحث قصير أو سؤال تفكير عليا حول «${L}» للمتميزين.`,
      remedial: `دعم علاجي: ورقة تدريب مبسطة وأمثلة محلولة على «${L}» للمتعثرين.`,
      periods: 1, resources: [], notes: '',
    };
  }

  // ---------- الصفحة ----------
  const st = { tab: null, subj: null, grade: null, q: '' };
  V.prep = async function (root) {
    const subs = mySubjects(), grades = myGrades();
    st.tab = st.tab || A.LS.get('pp_t') || 'mine'; if (st.tab === 'admin' && !lead()) st.tab = 'mine';
    st.subj = st.subj || A.LS.get('pp_s') || (subs[0] || {}).id; st.grade = st.grade || A.LS.get('pp_g') || grades[0];
    root.innerHTML = '<div class="card"><div class="spinner"></div></div>';
    let L = []; try { L = await api.list('lesson_preps', { school_id: S.school.id }, { order: 'updated_at', desc: true }); } catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', esc(e.message))}</div>`; return; }
    const mine = L.filter(x => x.kind === 'mine' && x.created_by === S.me.id), lib = L.filter(x => x.kind === 'library' && x.active), all = L.filter(x => x.kind === 'library');
    const list = (st.tab === 'mine' ? mine : st.tab === 'lib' ? lib : all).filter(x => (!st.subj || !x.subject_id || x.subject_id === st.subj) && (!st.grade || !x.grade_key || x.grade_key === st.grade) && (!st.q || A.normKey(x.lesson + ' ' + x.unit).includes(A.normKey(st.q))));
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">التحضير</h2><p class="sub" style="margin:2px 0 0">حضّر درسك كاملاً في دقائق — المولّد يقترح الأهداف والاستراتيجيات والأنشطة والتقويم والواجب والمهمة الأدائية، وأنت تعدّل. اطبعه بنموذج دينا أو أدرجه في خطتك الأسبوعية.</p></div><button class="btn" id="ppNew">${I.plus || '+'} ${st.tab === 'admin' ? 'تحضير لمكتبة المدرسة' : 'تحضير جديد'}</button></div>
      <div class="kpick" id="ppT"><button data-t="mine">تحضيراتي (${AR(mine.length)})</button><button data-t="lib">مكتبة المدرسة (${AR(lib.length)})</button>${lead() ? `<button data-t="admin">إدارة المكتبة (${AR(all.length)})</button>` : ''}</div>
      <div class="row" style="gap:8px;margin:10px 0;flex-wrap:wrap"><label class="small">المادة <select class="in" id="ppS" style="width:auto"><option value="">الكل</option>${subs.map(s => `<option value="${s.id}" ${s.id === st.subj ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label><label class="small">الصف <select class="in" id="ppG" style="width:auto"><option value="">الكل</option>${grades.map(g => `<option value="${esc(g)}" ${g === st.grade ? 'selected' : ''}>${esc(gLabel(g))}</option>`).join('')}</select></label><input class="in" id="ppQ" placeholder="بحث باسم الدرس" value="${esc(st.q)}" style="max-width:220px"></div>
      ${list.length ? `<div class="pp-grid">${list.map(x => card(x)).join('')}</div>` : A.emptyBox(st.tab === 'mine' ? 'لا توجد تحضيرات بعد' : st.tab === 'lib' ? 'لا يوجد في المكتبة ما أُسند إليك' : 'المكتبة فارغة', st.tab === 'lib' ? 'يظهر هنا ما تفعّله الإدارة وتسنده لك.' : 'اضغط «تحضير جديد» واختر الدرس — يملأ المولّد الهيكل تلقائياً.')}</div>`;
    $$('#ppT button', root).forEach(b => { b.classList.toggle('on', b.dataset.t === st.tab); b.onclick = () => { st.tab = b.dataset.t; A.LS.set('pp_t', st.tab); V.prep(root); }; });
    $('#ppS', root).onchange = e => { st.subj = e.target.value; A.LS.set('pp_s', st.subj); V.prep(root); };
    $('#ppG', root).onchange = e => { st.grade = e.target.value; A.LS.set('pp_g', st.grade); V.prep(root); };
    $('#ppQ', root).onchange = e => { st.q = e.target.value; V.prep(root); };
    $('#ppNew', root).onclick = () => editor(null, st.tab === 'admin' ? 'library' : 'mine', () => V.prep(root));
    const byId = id => L.find(x => x.id === id);
    $$('[data-op]', root).forEach(b => b.onclick = () => editor(byId(b.dataset.op), null, () => V.prep(root)));
    $$('[data-pr]', root).forEach(b => b.onclick = () => printPrep(byId(b.dataset.pr)));
    $$('[data-plan]', root).forEach(b => b.onclick = () => toPlan(byId(b.dataset.plan)));
    $$('[data-sh]', root).forEach(b => b.onclick = () => shareRes(byId(b.dataset.sh)));
    $$('[data-cp]', root).forEach(b => b.onclick = () => A.run(b, async () => { const x = byId(b.dataset.cp); await api.ins('lesson_preps', { school_id: S.school.id, subject_id: x.subject_id, grade_key: x.grade_key, lesson_id: x.lesson_id, unit: x.unit, lesson: x.lesson, data: x.data, kind: 'mine', source_id: x.id }); A.toast('نُسخ إلى تحضيراتي — عدّله كما تريد', 'ok'); st.tab = 'mine'; V.prep(root); }));
    $$('[data-act]', root).forEach(b => b.onclick = () => A.run(b, async () => { const x = byId(b.dataset.act); const ux = await api.upd('lesson_preps', x.id, { active: !x.active, updated_at: new Date().toISOString() }); if (A.syncPrepRes) await A.syncPrepRes(ux && ux.id ? ux : { ...x, active: !x.active }); A.toast(x.active ? 'أُخفي من المعلمين' : 'فُعّل — يظهر لمن أُسند إليهم', 'ok'); V.prep(root); }));
    $$('[data-asg]', root).forEach(b => b.onclick = () => assign(byId(b.dataset.asg), () => V.prep(root)));
    $$('[data-del]', root).forEach(b => b.onclick = () => A.run(b, async () => { if (!(await A.confirmBox('حذف هذا التحضير؟', 'حذف', true))) return; await api.del('lesson_preps', b.dataset.del); V.prep(root); }));
  };
  function card(x) {
    const d = x.data || {}, own = x.created_by === S.me.id || S.me.is_owner, adm = st.tab === 'admin';
    return `<article class="pp-c"><div class="pp-h"><b>${esc(x.lesson || 'بلا عنوان')}</b><span class="small muted">${esc(x.unit || '')}</span></div>
      <div class="pp-m"><span>${esc(A.subjName(x.subject_id) || '—')}</span><span>${esc(gLabel(x.grade_key))}</span>${x.kind === 'library' ? (x.active ? '<span class="pill st-approved">مفعّل</span>' : '<span class="pill st-empty">مخفي</span>') : ''}${adm ? `<span class="small">${(x.assigned_to || []).length ? `مُسند لـ ${AR((x.assigned_to || []).length)}` : 'لكل المعلمين'}</span>` : ''}</div>
      <p class="small pp-o">${esc(String(d.objectives || '').split('\n')[0] || '')}</p>
      <div class="pp-a"><button class="btn sm" data-op="${x.id}">${own ? 'فتح وتعديل' : 'عرض'}</button><button class="btn ghost sm" data-pr="${x.id}" title="طباعة">${I.print || 'طباعة'}</button>${st.tab !== 'admin' ? `<button class="btn ghost sm" data-plan="${x.id}">إدراج في خطتي</button>` : ''}${(d.resources || []).length ? `<button class="btn ghost sm" data-sh="${x.id}">مشاركة المصادر</button>` : ''}${st.tab === 'lib' ? `<button class="btn ghost sm" data-cp="${x.id}">نسخ إلى تحضيراتي</button>` : ''}${adm ? `<button class="btn ghost sm" data-act="${x.id}">${x.active ? 'إخفاء' : 'تفعيل'}</button><button class="btn ghost sm" data-asg="${x.id}">إسناد</button>` : ''}${own && st.tab !== 'lib' ? `<button class="btn bad sm" data-del="${x.id}" aria-label="حذف">×</button>` : ''}</div></article>`;
  }

  // ---------- المحرّر ----------
  async function editor(x, kind, done) {
    const own = !x || x.created_by === S.me.id || S.me.is_owner;
    const P = x ? { ...x, data: { ...(x.data || {}) } } : { subject_id: st.subj || (mySubjects()[0] || {}).id, grade_key: st.grade || myGrades()[0], unit: '', lesson: '', lesson_id: null, kind, data: {} };
    let CUR = []; const loadCur = async () => { try { CUR = P.subject_id && P.grade_key ? await api.list('curriculum', { school_id: S.school.id, subject_id: P.subject_id, grade_key: P.grade_key }, { order: 'sort' }) : []; } catch (_) { CUR = []; } };
    await loadCur();
    const D = P.data; D.strategies = D.strategies || []; D.tools = D.tools || []; D.activities = D.activities || []; D.resources = D.resources || [];
    const m = A.modal(`<h3>${x ? (own ? 'تعديل التحضير' : 'عرض التحضير') : kind === 'library' ? 'تحضير لمكتبة المدرسة' : 'تحضير جديد'}</h3><div id="peB"></div>`, { cls: 'wide xl' });
    const B = m.el.querySelector('#peB'), q = s => B.querySelector(s), ro = own ? '' : 'readonly disabled';
    const draw = () => {
      B.innerHTML = `<div class="grid g3"><div class="field"><label for="peS">المادة</label><select class="in" id="peS" ${ro}>${mySubjects().map(s => `<option value="${s.id}" ${s.id === P.subject_id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div class="field"><label for="peG">الصف</label><select class="in" id="peG" ${ro}>${myGrades().map(g => `<option value="${esc(g)}" ${g === P.grade_key ? 'selected' : ''}>${esc(gLabel(g))}</option>`).join('')}</select></div>
        <div class="field"><label for="peC">من دروس المنهج (اختياري)</label><select class="in" id="peC" ${ro}><option value="">— اكتب الدرس يدوياً —</option>${CUR.map(l => `<option value="${l.id}" ${l.id === P.lesson_id ? 'selected' : ''}>${esc(l.unit ? l.unit + ' — ' : '')}${esc(l.lesson)}</option>`).join('')}</select></div>
        <div class="field"><label for="peU">الوحدة</label><input class="in" id="peU" value="${esc(P.unit)}" ${ro}></div><div class="field"><label for="peL">الدرس</label><input class="in" id="peL" value="${esc(P.lesson)}" ${ro}></div>
        <div class="field"><label for="peP">عدد الحصص</label><input class="in" type="number" min="1" max="10" id="peP" value="${D.periods || 1}" ${ro}></div></div>
        ${own ? `<div class="notice info" style="display:block;margin:4px 0 10px">المولّد يملأ الهيكل من اسم الدرس والمادة — لن يكتب فوق ما كتبته إلا إن اخترت ذلك. <button class="btn sm" id="peGen" type="button">توليد التحضير</button></div>` : ''}
        <div class="grid g2" style="align-items:start">
          <div class="field"><label for="peO">الأهداف (سطر لكل هدف)</label><textarea class="in" id="peO" rows="5" ${ro}>${esc(D.objectives || '')}</textarea></div>
          <div class="field"><label for="peW">التمهيد</label><textarea class="in" id="peW" rows="5" ${ro}>${esc(D.warmup || '')}</textarea></div>
          <div class="field"><label>الاستراتيجيات</label><div class="pp-chips">${STRAT.map(s => `<label class="${D.strategies.includes(s) ? 'on' : ''}"><input type="checkbox" data-sg="${esc(s)}" ${D.strategies.includes(s) ? 'checked' : ''} ${ro}> ${esc(s)}</label>`).join('')}</div></div>
          <div class="field"><label>الوسائل</label><div class="pp-chips">${TOOLS.map(s => `<label class="${D.tools.includes(s) ? 'on' : ''}"><input type="checkbox" data-tl="${esc(s)}" ${D.tools.includes(s) ? 'checked' : ''} ${ro}> ${esc(s)}</label>`).join('')}</div></div></div>
        <div class="field"><label>سير الدرس والأنشطة</label><div class="pp-acts">${D.activities.map((a, i) => `<div class="pp-act"><input class="in" data-a="${i}|t" value="${esc(a.t || '')}" placeholder="المرحلة" ${ro}><textarea class="in" rows="2" data-a="${i}|d" placeholder="الوصف" ${ro}>${esc(a.d || '')}</textarea><label class="small"><input class="in" type="number" min="1" max="60" data-a="${i}|m" value="${a.m || ''}" style="width:64px" ${ro}> د</label>${own ? `<button class="btn bad sm" data-ax="${i}" type="button" aria-label="حذف">×</button>` : ''}</div>`).join('')}</div>${own ? `<button class="btn ghost sm" id="peAa" type="button">+ نشاط</button> <span class="small muted" id="peMin"></span>` : ''}</div>
        <div class="grid g2" style="align-items:start">
          <div class="field"><label for="peAs">التقويم</label><textarea class="in" id="peAs" rows="3" ${ro}>${esc(D.assessment || '')}</textarea></div>
          <div class="field"><label for="peH">الواجب</label><textarea class="in" id="peH" rows="3" ${ro}>${esc(D.homework || '')}</textarea></div>
          <div class="field"><label for="pePt">المهمة الأدائية</label><textarea class="in" id="pePt" rows="3" ${ro}>${esc(D.perf_task || '')}</textarea></div>
          <div class="field"><label for="peE">الإثراء</label><textarea class="in" id="peE" rows="3" ${ro}>${esc(D.enrichment || '')}</textarea></div>
          <div class="field"><label for="peR">العلاج والدعم</label><textarea class="in" id="peR" rows="3" ${ro}>${esc(D.remedial || '')}</textarea></div>
          <div class="field"><label for="peN">ملاحظات</label><textarea class="in" id="peN" rows="3" ${ro}>${esc(D.notes || '')}</textarea></div></div>
        <div class="field"><label>المصادر والروابط (فيديو، عرض، ورقة عمل، اختبار إلكتروني…)</label>${D.resources.map((r, i) => `<div class="row" style="gap:6px;margin-bottom:6px;flex-wrap:nowrap"><input class="in" data-r="${i}|t" value="${esc(r.t || '')}" placeholder="العنوان" ${ro}><input class="in" dir="ltr" data-r="${i}|u" value="${esc(r.u || '')}" placeholder="https://…" ${ro}>${own ? `<button class="btn bad sm" data-rx="${i}" type="button" aria-label="حذف">×</button>` : `<a class="btn ghost sm" href="${esc(r.u)}" target="_blank" rel="noopener">فتح</a>`}</div>`).join('')}${own ? `<button class="btn ghost sm" id="peRa" type="button">+ رابط</button> <button class="btn ghost sm" id="peRs" type="button">من مصادر المدرسة</button> <label class="btn ghost sm">رفع صور أو ملفات<input type="file" id="peFu" multiple hidden accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"></label>${S.me.drive_url ? ` <a class="btn ghost sm" href="${esc(S.me.drive_url)}" target="_blank" rel="noopener">${A.I.folder || ''} مجلدي في Drive</a>` : ''}` : ''}</div>
        ${(D.files || []).length ? `<div class="qp-files" style="margin-bottom:8px">${D.files.map((f, i) => `<div class="qp-f">${/^image\//.test(f.t || '') || /^data:image/.test(f.u) ? `<img src="${esc(f.u)}" alt="${esc(f.n)}">` : '<span class="qp-ic">📄</span>'}<a href="${esc(f.u)}" target="_blank" rel="noopener" class="small">${esc(f.n)}</a>${own ? `<button class="btn ghost sm" data-fx="${i}" type="button" aria-label="حذف الملف">×</button>` : ''}</div>`).join('')}</div>` : ''}
        <div class="acts" style="flex-wrap:wrap">${own ? '<button class="btn" id="peSv" type="button">حفظ</button>' : ''}<button class="btn ghost" id="pePr" type="button">${I.print || ''} طباعة</button></div>`;
      const mins = () => { const e = q('#peMin'); if (e) e.textContent = `مجموع الوقت: ${AR(D.activities.reduce((a, x) => a + (+x.m || 0), 0))} دقيقة`; }; mins();
      if (!own) { q('#pePr').onclick = () => printPrep({ ...P, data: D }); return; }
      q('#peS').onchange = async e => { P.subject_id = e.target.value; await loadCur(); draw(); };
      q('#peG').onchange = async e => { P.grade_key = e.target.value; await loadCur(); draw(); };
      q('#peC').onchange = e => { const l = CUR.find(y => y.id === e.target.value); P.lesson_id = l ? l.id : null; if (l) { P.lesson = l.lesson; P.unit = l.unit || P.unit; D.periods = l.periods || D.periods; } draw(); };
      q('#peU').oninput = e => P.unit = e.target.value; q('#peL').oninput = e => P.lesson = e.target.value; q('#peP').oninput = e => D.periods = +e.target.value || 1;
      [['#peO', 'objectives'], ['#peW', 'warmup'], ['#peAs', 'assessment'], ['#peH', 'homework'], ['#pePt', 'perf_task'], ['#peE', 'enrichment'], ['#peR', 'remedial'], ['#peN', 'notes']].forEach(([s, k]) => q(s).oninput = e => D[k] = e.target.value);
      $$('[data-sg]', B).forEach(c => c.onchange = () => { D.strategies = D.strategies.filter(x => x !== c.dataset.sg); if (c.checked) D.strategies.push(c.dataset.sg); c.parentElement.classList.toggle('on', c.checked); });
      $$('[data-tl]', B).forEach(c => c.onchange = () => { D.tools = D.tools.filter(x => x !== c.dataset.tl); if (c.checked) D.tools.push(c.dataset.tl); c.parentElement.classList.toggle('on', c.checked); });
      $$('[data-a]', B).forEach(i => i.oninput = () => { const [n, k] = i.dataset.a.split('|'); D.activities[+n][k] = k === 'm' ? +i.value || 0 : i.value; mins(); });
      $$('[data-ax]', B).forEach(b => b.onclick = () => { D.activities.splice(+b.dataset.ax, 1); draw(); });
      q('#peAa').onclick = () => { D.activities.push({ t: '', d: '', m: 5 }); draw(); };
      $$('[data-r]', B).forEach(i => i.oninput = () => { const [n, k] = i.dataset.r.split('|'); D.resources[+n][k] = i.value.trim(); });
      $$('[data-rx]', B).forEach(b => b.onclick = () => { D.resources.splice(+b.dataset.rx, 1); draw(); });
      q('#peRa').onclick = () => { D.resources.push({ t: '', u: '' }); draw(); };
      D.files = D.files || [];
      $$('[data-fx]', B).forEach(b => b.onclick = () => { D.files.splice(+b.dataset.fx, 1); draw(); });
      q('#peRs').onclick = () => A.pickResource(P.subject_id, null, r => { if (/^image|file$/.test(r.kind) || r.file_type) D.files.push({ n: r.title, u: r.url, t: r.file_type || (r.kind === 'image' ? 'image/*' : '') }); else D.resources.push({ t: r.title, u: r.url }); draw(); A.toast('أُضيف من مصادر المدرسة', 'ok'); }, { lesson_id: P.lesson_id, lesson: P.lesson, grade_key: P.grade_key });
      q('#peFu').onchange = ev => A.run(null, async () => { const fs = [...ev.target.files]; if (!fs.length) return; const big = fs.find(f => f.size > 15e6); if (big) throw new Error(`«${big.name}» أكبر من ١٥ ميجابايت`); for (const f of fs) D.files.push({ n: f.name, u: await api.uploadAsset(f), t: f.type }); draw(); A.toast(`رُفع ${AR(fs.length)} ملف`, 'ok'); });
      q('#peGen').onclick = async () => { if (!P.lesson.trim()) return A.toast('اكتب اسم الدرس أو اختره من المنهج أولاً', 'warn'); const has = ['objectives', 'warmup', 'assessment', 'homework', 'perf_task'].some(k => String(D[k] || '').trim()) || D.activities.length; let over = true; if (has) over = await A.confirmBox('يوجد محتوى مكتوب. استبداله بالمقترح؟<br><span class="small muted">«إلغاء» = تعبئة الفارغ فقط.</span>', 'استبدال'); const g = generate(P.lesson, A.subjName(P.subject_id)); Object.keys(g).forEach(k => { const empty = Array.isArray(D[k]) ? !D[k].length : !String(D[k] || '').trim(); if (over || empty) D[k] = g[k]; }); draw(); A.toast('وُلّد التحضير — راجعه وعدّل ما تريد', 'ok'); };
      q('#pePr').onclick = () => printPrep({ ...P, data: D });
      q('#peSv').onclick = e => A.run(e.currentTarget, async () => { if (!P.lesson.trim()) P.lesson = `تحضير ${A.subjName(P.subject_id) || ''} — ${new Date().toLocaleDateString('ar-SA')}`; D.resources = D.resources.filter(r => r.u); const row = { subject_id: P.subject_id, grade_key: P.grade_key, lesson_id: P.lesson_id, unit: P.unit.trim(), lesson: P.lesson.trim(), data: D, updated_at: new Date().toISOString() };
        const sv = x ? await api.upd('lesson_preps', x.id, row) : (await api.ins('lesson_preps', { ...row, school_id: S.school.id, kind: P.kind || 'mine' }))[0]; if (A.syncPrepRes) await A.syncPrepRes(sv && sv.id ? sv : { ...x, ...row }); m.close(); A.toast('حُفظ التحضير', 'ok'); done && done(); });
    };
    draw();
  }

  A.prepEditor = (x, done) => editor(x, x ? null : 'mine', done);
  A.prepGen = generate;
  // ---------- الطباعة بنموذج دينا ----------
  function printPrep(x) {
    const d = x.data || {}, li = s => String(s || '').split('\n').filter(Boolean).map(t => `<li>${esc(t)}</li>`).join('');
    const box = (t, v) => v ? `<h3 style="margin:10px 0 4px;border-inline-start:5px solid #3AB1DB;padding-inline-start:8px">${t}</h3><div style="white-space:pre-wrap">${esc(v)}</div>` : '';
    A.printDoc(`تحضير درس: ${x.lesson || ''}`, `${A.subjName(x.subject_id) || ''} · ${gLabel(x.grade_key)}${x.unit ? ' · ' + x.unit : ''} · ${AR(d.periods || 1)} حصة · المعلم: ${A.personName(x.created_by) || ''}`,
      `<table style="margin-bottom:8px"><tr><th style="width:50%">الأهداف</th><th>الاستراتيجيات والوسائل</th></tr><tr><td style="text-align:start"><ol style="margin:0;padding-inline-start:18px">${li(d.objectives)}</ol></td><td style="text-align:start"><b>الاستراتيجيات:</b> ${esc((d.strategies || []).join('، ') || '—')}<br><b>الوسائل:</b> ${esc((d.tools || []).join('، ') || '—')}</td></tr></table>
      ${box('التمهيد', d.warmup)}
      ${(d.activities || []).length ? `<h3 style="margin:10px 0 4px;border-inline-start:5px solid #3AB1DB;padding-inline-start:8px">سير الدرس</h3><table><tr><th>المرحلة</th><th>الإجراءات والأنشطة</th><th>الزمن</th></tr>${d.activities.map(a => `<tr><td><b>${esc(a.t || '')}</b></td><td style="text-align:start">${esc(a.d || '')}</td><td>${a.m ? AR(a.m) + ' د' : ''}</td></tr>`).join('')}</table>` : ''}
      ${box('التقويم', d.assessment)}${box('الواجب', d.homework)}${box('المهمة الأدائية', d.perf_task)}${box('الإثراء', d.enrichment)}${box('العلاج والدعم', d.remedial)}
      ${(d.resources || []).length ? `<h3 style="margin:10px 0 4px">المصادر</h3><ul>${d.resources.map(r => `<li>${esc(r.t || r.u)} — <span dir="ltr">${esc(r.u)}</span></li>`).join('')}</ul>` : ''}${box('ملاحظات', d.notes)}
      <p style="margin-top:16px">توقيع المعلم: ............................ &nbsp;&nbsp; توقيع المشرف: ............................</p>`, false);
  }

  // ---------- إدراج في الخطة الأسبوعية ----------
  function toPlan(x) {
    const d = x.data || {}; const mine = S.entries.filter(e => e.teacher_id === S.me.id && e.subject_id && (!x.subject_id || e.subject_id === x.subject_id) && e.status !== 'approved').sort((a, b) => a.day - b.day || a.period - b.period);
    if (!mine.length) return A.toast('لا توجد حصص لهذه المادة في خطتك هذا الأسبوع (أو كلها معتمدة)', 'warn');
    const m = A.modal(`<h3>إدراج «${esc(x.lesson)}» في خطتي</h3><p class="sub">اختر الحصص — يُكتب الدرس في الموضوع، والواجب في خانة الواجب. ما كتبته سابقاً يبقى ما لم تختر الاستبدال.</p>
      <div class="perm-grid">${mine.map(e => `<label class="chk"><input type="checkbox" value="${e.id}"> ${A.DAYS[e.day]} · الحصة ${AR(e.period + 1)} · ${esc((A.cls(e.class_id) || {}).name || '')}${(e.topic || '').trim() ? ' <span class="small muted">(فيها: ' + esc(e.topic.slice(0, 30)) + ')</span>' : ''}</label>`).join('')}</div>
      <label class="chk" style="margin-top:6px"><input type="checkbox" id="tpH" checked> إدراج الواجب أيضاً</label><label class="chk"><input type="checkbox" id="tpO"> استبدال ما كتبته في الحصص المختارة</label>
      <div class="acts"><button class="btn" id="tpGo">إدراج</button></div>`);
    m.el.querySelector('#tpGo').onclick = e => A.run(e.currentTarget, async () => { const ids = $$('.perm-grid input:checked', m.el).map(i => i.value); if (!ids.length) throw new Error('اختر حصة'); const ov = m.el.querySelector('#tpO').checked, hw = m.el.querySelector('#tpH').checked; let n = 0;
      for (const id of ids) { const en = S.entries.find(y => y.id === id); const patch = {}; if (ov || !(en.topic || '').trim()) patch.topic = x.lesson; if (hw && d.homework && (ov || !(en.homework || '').trim())) patch.homework = d.homework; if (!Object.keys(patch).length) continue; const r = await api.saveEntry(en.id, patch); Object.assign(en, r); n++; }
      m.close(); A.toast(`أُدرج في ${AR(n)} حصة من خطتك`, 'ok'); });
  }

  // ---------- مشاركة المصادر مع أولياء أمور فصول محددة ----------
  function shareRes(x) {
    const d = x.data || {}; const cls = S.classes.filter(c => c.active && (!x.grade_key || gk(c) === x.grade_key));
    const m = A.modal(`<h3>مشاركة مصادر «${esc(x.lesson)}»</h3><p class="sub">تظهر المصادر في «المصادر» وصفحة ولي الأمر لهذه الفصول فقط، مرتبطة بالأسبوع الحالي.</p>
      <div class="perm-grid">${cls.map(c => `<label class="chk"><input type="checkbox" value="${c.id}" checked> ${esc(c.name)}</label>`).join('')}</div>
      <label class="chk" style="margin-top:6px"><input type="checkbox" id="srP" checked> إظهارها لأولياء الأمور</label><div class="acts"><button class="btn" id="srGo">مشاركة ${AR(d.resources.length)} مصدر</button></div>`);
    m.el.querySelector('#srGo').onclick = e => A.run(e.currentTarget, async () => { const ids = $$('.perm-grid input:checked', m.el).map(i => i.value); if (!ids.length) throw new Error('اختر فصلاً');
      await api.ins('resources', d.resources.map(r => ({ school_id: S.school.id, section_id: S.sectionId, class_ids: ids, subject_id: x.subject_id, kind: /youtu|vimeo|video/.test(r.u) ? 'video' : /drive|docs/.test(r.u) ? 'worksheet' : 'link', title: r.t || x.lesson, url: r.u, note: x.lesson, week_id: S.weekId || null, visible_to_parents: m.el.querySelector('#srP').checked, created_by: S.me.id })));
      m.close(); A.toast('شُورِكت المصادر', 'ok'); });
  }

  // ---------- إسناد تحضير المكتبة ----------
  function assign(x, done) {
    const T = (S.staff || []).filter(s => s.active !== false).slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
    const teachSub = new Set((S.allEntries || S.entries).filter(e => e.subject_id === x.subject_id).map(e => e.teacher_id));
    const m = A.modal(`<h3>إسناد «${esc(x.lesson)}»</h3><p class="sub">بلا تحديد = يظهر لكل المعلمين (عند التفعيل). المعلمون الذين يدرّسون المادة مميزون.</p>
      <div class="row" style="gap:6px;margin-bottom:6px"><button class="btn ghost sm" id="asM" type="button">تحديد معلمي المادة</button><button class="btn ghost sm" id="as0" type="button">إلغاء التحديد</button></div>
      <div class="perm-grid" style="max-height:50vh;overflow:auto">${T.map(s => `<label class="chk"><input type="checkbox" value="${s.id}" ${(x.assigned_to || []).includes(s.id) ? 'checked' : ''}> ${esc(s.full_name)}${teachSub.has(s.id) ? ' <span class="pill st-submitted">يدرّس المادة</span>' : ''}</label>`).join('')}</div>
      <label class="chk" style="margin-top:6px"><input type="checkbox" id="asA" ${x.active ? 'checked' : ''}> مفعّل (يظهر لهم الآن)</label><div class="acts"><button class="btn" id="asGo">حفظ</button></div>`);
    m.el.querySelector('#asM').onclick = () => $$('.perm-grid input', m.el).forEach(i => i.checked = teachSub.has(i.value));
    m.el.querySelector('#as0').onclick = () => $$('.perm-grid input', m.el).forEach(i => i.checked = false);
    m.el.querySelector('#asGo').onclick = e => A.run(e.currentTarget, async () => { await api.upd('lesson_preps', x.id, { assigned_to: $$('.perm-grid input:checked', m.el).map(i => i.value), active: m.el.querySelector('#asA').checked, updated_at: new Date().toISOString() }); m.close(); A.toast('حُفظ الإسناد', 'ok'); done && done(); });
  }
})();
