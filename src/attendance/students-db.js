/* منصة دينا — قاعدة الطلاب الموحّدة:
   مصدر واحد للطلاب في كل المنصة. أي إضافة أو تعديل أو نقل أو إيقاف في «الطلاب» يصل تلقائياً
   (لحظياً) إلى سجلات متابعة المعلمين، ونظام تحليل النتائج، والحضور، والتقارير والإحصاءات.
   المطابقة برقم الطالب الثابت لا بالاسم، فلا تضيع درجة ولا ملاحظة عند تعديل الاسم أو الفصل. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api } = A;
  let STU = null, CLS = null, subbed = false;

  // كل فصول المدرسة (كل الأقسام) لتسمية الصف والفصل
  async function allClasses() {
    if (CLS) return CLS;
    const ids = (S.sections || []).map(s => s.id);
    try { CLS = ids.length ? await api.list('classes', { section_id: ids }) : []; } catch (_) { CLS = []; }
    (S.allClasses || []).concat(S.classes || []).forEach(c => { if (!CLS.some(x => x.id === c.id)) CLS.push(c); });
    return CLS;
  }
  A.studentsAll = async function (force) {
    if (!STU || force) STU = await api.list('students', { school_id: S.school.id }, { select: 'id,full_name,class_id,section_id,student_no,active', order: 'full_name' }).catch(() => []);
    return STU;
  };
  // نطاق المستخدم: المالك ومن له تحليل النتائج أو الإشراف أو الحضور = كل ما تسمح له صلاحياته؛ المعلم = فصوله
  const scopeIds = () => {
    const mine = new Set((S.allEntries || S.entries || []).filter(e => e.teacher_id === S.me.id).map(e => e.class_id));
    if (S.me.is_owner) return null;
    if (!mine.size && A.hasModule && (A.hasModule('analysis') || A.hasModule('supervision') || A.hasModule('attendance'))) return null;
    return mine;
  };
  A.studentsPayload = async function (kind) {
    const [list, cls] = await Promise.all([A.studentsAll(), allClasses()]);
    const ids = scopeIds(), cOf = id => cls.find(c => c.id === id) || A.cls(id) || {};
    const inS = s => !ids || ids.has(s.class_id);
    const g = c => (A.gradeName ? A.gradeName(c.grade_word, c.stage) : c.grade_word) || c.stage || '', cl = c => c.class_label || c.name || '';
    const act = list.filter(s => s.active !== false && inS(s)), gone = list.filter(s => s.active === false && inS(s)).map(s => s.id);
    if (kind === 'rec') return { list: act.map(s => { const c = cOf(s.class_id); return { sid: s.id, n: s.full_name, g: g(c), c: cl(c) }; }), gone };
    return { list: act.map(s => { const c = cOf(s.class_id); return { pid: s.id, name: s.full_name, grade: g(c), section: cl(c), no: s.student_no || '' }; }), gone };
  };

  // ---------- الإرسال للأدوات المضمّنة ----------
  async function syncRecords() { const f = document.getElementById('recF'); if (!f || !f.contentWindow) return; const p = await A.studentsPayload('rec'); f.contentWindow.postMessage({ type: 'dina-rec-sync', list: p.list, gone: p.gone }, location.origin); }
  async function syncAnalysis() { const f = document.getElementById('anF'); if (!f || !f.contentWindow) return; const p = await A.studentsPayload('an'); f.contentWindow.postMessage({ type: 'dina-students-sync', list: p.list, gone: p.gone }, location.origin); }
  A.syncStudentsNow = () => { syncRecords().catch(() => { }); syncAnalysis().catch(() => { }); };

  window.addEventListener('message', e => {
    if (e.origin !== location.origin || !e.data) return;
    if (e.data.type === 'dina-rec-ready') setTimeout(() => syncRecords().catch(() => { }), 400);
    if (e.data.type === 'dina-rec-synced' || e.data.type === 'dina-students-synced') {
      const d = e.data, n = (d.add || 0) + (d.ren || 0) + (d.upd || 0) + (d.rm || 0) + (d.left || 0);
      if (d.err) console.warn('students sync', d.err);
      if (n) A.toast(`تحدّثت أسماء الطلاب من قاعدة المنصة: ${[d.add ? `أُضيف ${A.AR(d.add)}` : '', (d.ren || d.upd) ? `عُدّل ${A.AR(d.ren || d.upd)}` : '', (d.rm || d.left) ? `${d.rm ? 'أُزيل' : 'غادر'} ${A.AR(d.rm || d.left)}` : ''].filter(Boolean).join(' · ')}`, 'ok');
    }
  });
  // نظام تحليل النتائج: المزامنة بعد تحميل الإطار
  const an0 = V.analysis;
  if (an0) V.analysis = function (root) { const r = an0.apply(this, arguments); const f = root.querySelector('#anF'); if (f) f.addEventListener('load', () => setTimeout(() => syncAnalysis().catch(() => { }), 300)); return r; };

  // ---------- التحديث اللحظي ----------
  let tm = null;
  const changed = () => { clearTimeout(tm); tm = setTimeout(() => { STU = null; CLS = null; window.dispatchEvent(new CustomEvent('dina-students-changed')); A.syncStudentsNow(); if (A._attRefresh) { try { A._attRefresh(); } catch (_) { } } }, 1500); };
  const prev = window.APP_AFTER_WEEK;
  window.APP_AFTER_WEEK = async function () {
    if (prev) await prev.apply(this, arguments);
    if (subbed || !api.subscribe || !S.school) return; subbed = true;
    try { api.subscribe('stu-' + S.school.id, 'students', null, changed); } catch (_) { }
  };
})();
