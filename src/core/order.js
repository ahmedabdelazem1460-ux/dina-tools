/* منصة دينا — ترتيب منطقي موحّد للمراحل والصفوف والفصول والمواد (عرض فقط، لا يغيّر البيانات)
   المرحلة: رياض الأطفال ← الابتدائية ← المتوسطة ← الثانوية، ثم الصف (الأول… الثاني عشر)، ثم الفصل (أ، ب…).
   - A.clsRank(c|id)        رقم ترتيب الفصل
   - A.cmpCls(a, b)         مقارنة فصلين (معرّفات أو كائنات)
   - A.cmpEntrySG(a, b)     مقارنة حصتين: المادة ثم الصف ثم الفصل
   - A.subjRank(id)         ترتيب المادة (حقل sort إن وُجد، وإلا الأبجدي) */
(function () {
  const A = window.APP; if (!A) return;
  const { S } = A;
  const STAGES = [/^(KG|روض|رياض|تمهيدي)/i, /ابتدائ/, /متوسط/, /ثانو/];
  const stageIdx = s => { s = String(s || ''); const i = STAGES.findIndex(r => r.test(s)); return i < 0 ? (/grade/i.test(s) ? 1 : 5) : i; };
  const WORDS = ['اول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سادس', 'سابع', 'ثامن', 'تاسع', 'عاشر'];
  const gradeOrd = w => {
    const t = String(w || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[أإآ]/g, 'ا').replace(/ال/g, '');
    const n = t.match(/\d+/); if (n) return +n[0];
    if (/حادي\s*عشر/.test(t)) return 11; if (/ثاني\s*عشر/.test(t)) return 12;
    const i = WORDS.findIndex(x => t.includes(x)); return i < 0 ? 50 : i + 1;
  };
  const clsObj = c => (typeof c === 'string' ? (A.cls && A.cls(c)) : c) || {};
  A.gradeOrd = gradeOrd; A.stageIdx = stageIdx;
  A.clsRank = c => { const x = clsObj(c); return stageIdx(x.stage || x.name) * 100000 + gradeOrd(x.grade_word || x.name) * 1000 + Math.min(999, +x.sort || 0); };
  A.cmpCls = (a, b) => { const x = clsObj(a), y = clsObj(b); return A.clsRank(x) - A.clsRank(y) || String(x.class_label || x.name || '').localeCompare(String(y.class_label || y.name || ''), 'ar'); };
  A.subjRank = id => { const L = S.subjects || [], s = L.find(x => x.id === id); if (s && s.sort != null && s.sort !== '') return +s.sort; const names = L.map(x => x.name || '').sort((a, b) => a.localeCompare(b, 'ar')); return 1000 + names.indexOf((s || {}).name || ''); };
  A.cmpSubj = (a, b) => A.subjRank(a) - A.subjRank(b) || String(A.subjName ? A.subjName(a) : a).localeCompare(String(A.subjName ? A.subjName(b) : b), 'ar');
  A.cmpEntrySG = (a, b) => A.cmpSubj(a.subject_id, b.subject_id) || A.cmpCls(a.class_id, b.class_id);
})();
