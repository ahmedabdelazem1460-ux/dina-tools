/* منصة دينا — بنك أسئلة المدرسة + التحكم في «الواجب الإلكتروني برابط» + واجهات الطالب + تصدير Excel
   - A.canHw / A.canEhw / A.ehwOnly : من يُتاح له الواجب الإلكتروني برابط (إعداد المالك settings.ehw، ويُفرض في قاعدة البيانات بـ ehw_ok)
   - A.QTHEMES / A.themePick      : واجهات صفحة الطالب (settings.theme في التكليف)
   - A.qExport                    : تصدير أسئلة بصيغة القالب الشامل (يُعاد رفعه كما هو)
   - V.qbank                      : بنك أسئلة المدرسة للمالك (كل المواد والصفوف والمعلمين) + لوحة التحكم
   لا يغيّر أي بيانات إلا بأمر صريح من المستخدم. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { $, $$, esc, AR, S, api } = A;
  const X = () => A._assess;

  // ---------- واجهات الطالب ----------
  A.QTHEMES = [
    { k: 'dina', n: 'الكلاسيكية', d: 'كحلي دينا الرسمي', c: ['#082B5A', '#005499', '#3AB1DB', '#F2F6FC', '#fff'] },
    { k: 'sky', n: 'السماوية', d: 'فاتحة ومشرقة', c: ['#3AB1DB', '#005499', '#082B5A', '#F4FBFE', '#fff'] },
    { k: 'green', n: 'النمو', d: 'أخضر دينا الهادئ', c: ['#2E8B57', '#1F6E45', '#BADF93', '#F4FAEE', '#fff'] },
    { k: 'night', n: 'الليلية', d: 'داكنة مريحة للعين', c: ['#061A38', '#3AB1DB', '#BADF93', '#061A38', '#0E2C56'] },
    { k: 'kids', n: 'المرحة', d: 'للصفوف الأولية — أزرار وخط أكبر', c: ['#005499', '#2E8B57', '#3AB1DB', '#EEF8FD', '#fff'] }];
  const TK = A.QTHEMES.map(t => t.k);
  const ehw = () => { const e = ((S.school || {}).settings || {}).ehw || {}; return { mode: e.mode || 'follow', staff: Array.isArray(e.staff) ? e.staff : [], themes: Array.isArray(e.themes) && e.themes.length ? e.themes.filter(k => TK.includes(k)) : TK.slice(), theme: TK.includes(e.theme) ? e.theme : 'dina' }; };
  A.ehwCfg = ehw;
  A.themePick = cur => { const e = ehw(), list = A.QTHEMES.filter(t => e.themes.includes(t.k) || t.k === cur), sel = cur && TK.includes(cur) ? cur : (e.themes.includes(e.theme) ? e.theme : (list[0] || {}).k);
    return `<div class="field"><label id="zthL">واجهة صفحة الطالب</label><div class="th-pick" role="radiogroup" aria-labelledby="zthL">${list.map(t => `<label class="th-c"><input type="radio" name="zth" value="${t.k}" ${t.k === sel ? 'checked' : ''}><span class="th-pv" style="--a:${t.c[0]};--b:${t.c[1]};--c:${t.c[2]};--bg:${t.c[3]};--cd:${t.c[4]}" aria-hidden="true"><i></i><u></u><u></u><em></em></span><b>${t.n}</b><small>${t.d}</small></label>`).join('')}</div></div>`; };

  // ---------- الإتاحة ----------
  const full0 = A.canAssess;
  const teacherish = () => !!S.me && !(A.coordOnly && A.coordOnly()) && (A.anyPerm('review') || (A.myMem() || {}).role === 'teacher' || (S.entries || []).some(e => e.teacher_id === S.me.id));
  A.canAssessFull = () => !!(full0 && full0());
  A.canHw = () => { if (!S.me) return false; if (S.me.is_owner) return true; const e = ehw(); return e.mode === 'all' ? teacherish() : e.mode === 'granted' ? e.staff.includes(S.me.id) : e.mode === 'off' ? false : A.canAssessFull(); };
  A.canEhw = () => { if (!S.me || S.me.is_owner) return false; const m = ehw().mode; return (m === 'all' || m === 'granted') && A.canHw(); };
  A.ehwOnly = () => !A.canAssessFull() && A.canEhw();
  A.canAssess = () => A.canAssessFull() || A.canEhw();

  // ---------- تصدير Excel بصيغة القالب ----------
  const TN = { mcq: 'اختيار من متعدد', multi: 'اختيار متعدد الإجابات', tf: 'صواب وخطأ', short: 'إجابة قصيرة', blank: 'أكمل الفراغ', match: 'مزاوجة', order: 'ترتيب', essay: 'مقالي' };
  const LVN = { remember: 'تذكر', understand: 'فهم', apply: 'تطبيق', higher: 'مستويات عليا' }, DFN = ['', 'سهل', 'متوسط', 'صعب'], LT = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];
  const HEAD = ['م', 'نوع السؤال *', 'نص السؤال *', 'الخيار أ', 'الخيار ب', 'الخيار ج', 'الخيار د', 'الخيار هـ', 'الخيار و', 'الإجابة الصحيحة *', 'الدرجة', 'الوحدة', 'الدرس', 'المستوى المعرفي', 'الصعوبة', 'المهارة', 'التفسير / التغذية الراجعة', 'رابط صورة', 'مشاركة مع المعلمين'];
  A.qExport = function (list, name, lessonOf, extra) {
    if (!list || !list.length) return A.toast('لا توجد أسئلة للتصدير', 'err'); if (!window.XLSX) return A.toast('مكتبة Excel غير محمّلة', 'err');
    const lo = lessonOf || (id => (X() ? X().lesson(id) : {}) || {});
    const rows = list.map((q, i) => { const o = q.options || [], six = a => Array.from({ length: 6 }, (_, k) => a[k] || ''); let op = six([]), ans = q.answer || '', ty = TN[q.qtype] || q.qtype;
      if (q.qtype === 'mcq' || q.qtype === 'multi') { op = six(o.map(x => x.t)); ans = o.map((x, k) => x.ok ? LT[k] || String(k + 1) : '').filter(Boolean).join('، '); }
      else if (q.qtype === 'blank') { op = six(o.map(x => x.t)); if (q.answer === 'bank') ty = 'أكمل الفراغ من بنك كلمات'; ans = ''; }
      else if (q.qtype === 'match') { op = six(o.map(x => `${x.t} = ${x.m}`)); ans = ''; }
      else if (q.qtype === 'order') { op = six(o.map(x => x.t)); ans = ''; }
      const l = lo(q.lesson_id) || {};
      return [i + 1, ty, q.body, ...op, ans, +q.points || 1, l.unit || '', l.lesson || '', LVN[q.level] || '', DFN[q.difficulty] || '', q.skill || '', q.explanation || '', q.image_url || '', q.shared === false ? 'لا' : 'نعم', ...(extra ? extra(q) : [])]; });
    const ws = XLSX.utils.aoa_to_sheet([HEAD.concat(extra ? extra(null) : []), ...rows]); ws['!views'] = [{ RTL: true }]; ws['!cols'] = [5, 22, 50, 18, 18, 18, 18, 14, 14, 20, 8, 16, 20, 14, 10, 16, 30, 20, 12, 18, 18, 22].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] }; XLSX.utils.book_append_sheet(wb, ws, 'الأسئلة'); XLSX.writeFile(wb, (name || 'بنك الأسئلة').replace(/[\\/:*?"<>|]/g, ' ') + '.xlsx');
    A.toast(`صُدّر ${AR(list.length)} سؤال — يمكن تعديل الملف وإعادة رفعه`, 'ok');
  };

  // ---------- بنك أسئلة المدرسة ----------
  A.I.qbank = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7M12 16.5v.1"/></svg>';
  const canBank = () => !!S.me && (S.me.is_owner || (A.hasModule && A.hasModule('supervision') && !S.me.is_owner));
  const reg = () => { if (!A.NAV.some(n => n[0] === 'qbank')) { const at = A.NAV.findIndex(n => n[0] === 'assess'); A.NAV.splice(at < 0 ? A.NAV.length : at + 1, 0, ['qbank', 'بنك أسئلة المدرسة', () => canBank()]); } };
  reg();
  const st = { tab: 'bank', f: { subj: '', grade: '', by: '', type: '', level: '', share: '', q: '' }, n: 40 };
  const MODES = [['all', 'لكل المعلمين'], ['granted', 'لمن أختارهم'], ['follow', 'حسب صلاحية بند الاختبارات'], ['off', 'متوقف']];

  V.qbank = async function (root) {
    if (!canBank()) { root.innerHTML = `<div class="card">${A.emptyBox('بنك أسئلة المدرسة لإدارة المدرسة فقط')}</div>`; return; }
    const own = !!S.me.is_owner, sid = S.school.id;
    root.innerHTML = `<div class="card"><div class="spinner"></div></div>`;
    let Q = [], CUR = [], SUB = [], ZZ = [], USE = {};
    const load = async () => {
      [Q, CUR, SUB, ZZ] = await Promise.all([api.list('questions', { school_id: sid }, { order: 'created_at', desc: true }), api.list('curriculum', { school_id: sid }), api.list('subjects', { school_id: sid }).catch(() => S.subjects || []), api.list('quizzes', { school_id: sid }, { order: 'created_at', desc: true }).catch(() => [])]);
      USE = {}; try { (await api.rpc('qbank_usage', {})).forEach(r => { USE[r.question_id] = r.uses; }); } catch (_) { ZZ.forEach(z => (z.question_ids || []).forEach(id => { USE[id] = (USE[id] || 0) + 1; })); }
    };
    try { await load(); } catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', e.message)}</div>`; return; }
    const sn = id => (SUB.find(s => s.id === id) || {}).name || A.subjName(id) || '—', gl = k => X() ? X().gLabel(k) : k, les = id => CUR.find(l => l.id === id) || {}, pn = id => A.personName(id) || '—';
    const pick = new Set();
    const draw = () => {
      root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>بنك أسئلة المدرسة</h2><p class="sub" style="margin:2px 0 0">كل ما يضيفه المعلمون أو يستوردونه من Excel و Word و PDF والصور يصبّ هنا — تطّلع عليه، وتتحكم في مشاركته، وتنسخه بين المواد والصفوف، وتصدّره.</p></div>
        ${own ? `<button class="btn" id="qbImp">${A.I.plus || ''} استيراد أسئلة</button>` : ''}</div>
        <div class="tabs">${[['bank', 'الأسئلة'], ['work', 'الواجبات والاختبارات'], ...(own ? [['ctl', 'التحكم والإتاحة']] : [])].map(([k, l]) => `<button data-t="${k}" class="${st.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="qbB"></div></div>`;
      $$('.tabs button', root).forEach(b => b.onclick = () => { st.tab = b.dataset.t; draw(); });
      const ib = $('#qbImp', root); if (ib) ib.onclick = () => importAt();
      ({ bank: tBank, work: tWork, ctl: tCtl })[st.tab]($('#qbB', root));
    };
    const reload = async () => { await load(); draw(); };
    // اختيار مادة وصف ثم فتح نافذة الاستيراد نفسها التي يستخدمها المعلم
    const pickCtx = (title, go, okLabel) => { const grades = [...new Set((S.allClasses || S.classes || []).filter(c => c.active !== false).map(c => X().gk(c)))];
      const m = A.modal(`<h3>${title}</h3><div class="grid g2"><div class="field"><label for="pxS">المادة</label><select class="in" id="pxS">${SUB.map(s => `<option value="${s.id}" ${st.f.subj === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label for="pxG">الصف</label><select class="in" id="pxG">${grades.map(g => `<option value="${esc(g)}" ${st.f.grade === g ? 'selected' : ''}>${esc(gl(g))}</option>`).join('')}</select></div></div><div class="acts"><button class="btn" id="pxGo">${okLabel || 'متابعة'}</button></div>`);
      $('#pxGo', m.el).onclick = ev => A.run(ev.currentTarget, async () => { const s = $('#pxS', m.el).value, g = $('#pxG', m.el).value; if (!s || !g) throw new Error('اختر المادة والصف'); m.close(); await go(s, g); }); };
    const setCtx = async (s, g) => { const x = X(); x.ctx.subj = s; x.ctx.grade = g; A.LS.set('as_s', s); A.LS.set('as_g', g); await x.loadCtx(); };
    const importAt = () => { if (!X() || !A.importQ) return A.toast('افتح صفحة «الاختبارات» مرة ثم أعد المحاولة', 'err'); pickCtx('استيراد أسئلة إلى بنك المدرسة', async (s, g) => { await setCtx(s, g); A.importQ(reload); }); };

    // ----- تبويب الأسئلة -----
    function tBank(box) {
      const f = st.f, nk = A.normKey;
      const L = Q.filter(q => (!f.subj || q.subject_id === f.subj) && (!f.grade || q.grade_key === f.grade) && (!f.by || q.created_by === f.by) && (!f.type || q.qtype === f.type) && (!f.level || q.level === f.level) && (!f.share || (f.share === 'y') === (q.shared !== false)) && (!f.q || nk(q.body + ' ' + (q.skill || '')).includes(nk(f.q))));
      const subs = [...new Set(Q.map(q => q.subject_id))], grs = [...new Set(Q.map(q => q.grade_key))], bys = [...new Set(Q.map(q => q.created_by).filter(Boolean))];
      const cnt = (k, v) => Q.filter(q => q[k] === v).length, used = Q.filter(q => USE[q.id]).length;
      const kp = (v, l, key, val) => `<button class="qb-k ${key && f[key] === val ? 'on' : ''}" ${key ? `data-kf="${key}|${val}"` : 'data-kf="|"'}><b>${AR(v)}</b><span>${l}</span></button>`;
      const show = L.slice(0, st.n);
      box.innerHTML = `<div class="qb-kp">${kp(Q.length, 'كل الأسئلة')}${kp(Q.filter(q => q.shared !== false).length, 'مشاركة مع المعلمين', 'share', 'y')}${kp(Q.filter(q => q.shared === false).length, 'خاصة بأصحابها', 'share', 'n')}<div class="qb-k"><b>${AR(bys.length)}</b><span>معلّم مساهم</span></div><div class="qb-k"><b>${AR(used)}</b><span>مستخدمة في تكليفات</span></div></div>
        <div class="chip-filter qb-ty" role="group" aria-label="نوع السؤال">${Object.entries(TN).filter(([k]) => cnt('qtype', k)).map(([k, n]) => `<button data-ty="${k}" class="${f.type === k ? 'on' : ''}" aria-pressed="${f.type === k}">${n} <b>${AR(cnt('qtype', k))}</b></button>`).join('')}</div>
        <div class="row qb-fl" style="gap:8px;margin:10px 0"><select class="in" data-f="subj" aria-label="المادة"><option value="">كل المواد</option>${subs.map(id => `<option value="${id}" ${f.subj === id ? 'selected' : ''}>${esc(sn(id))} (${AR(cnt('subject_id', id))})</option>`).join('')}</select>
          <select class="in" data-f="grade" aria-label="الصف"><option value="">كل الصفوف</option>${grs.map(g => `<option value="${esc(g)}" ${f.grade === g ? 'selected' : ''}>${esc(gl(g))} (${AR(cnt('grade_key', g))})</option>`).join('')}</select>
          <select class="in" data-f="by" aria-label="المعلم"><option value="">كل المعلمين</option>${bys.map(id => `<option value="${id}" ${f.by === id ? 'selected' : ''}>${esc(pn(id))} (${AR(cnt('created_by', id))})</option>`).join('')}</select>
          <select class="in" data-f="level" aria-label="المستوى"><option value="">كل المستويات</option>${Object.entries(LVN).map(([k, n]) => `<option value="${k}" ${f.level === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
          <input class="in" data-f="q" type="search" placeholder="بحث في نص السؤال أو المهارة" value="${esc(f.q)}" aria-label="بحث">
          ${Object.values(f).some(Boolean) ? '<button class="btn ghost sm" id="qbClr">مسح التصفية</button>' : ''}</div>
        <div class="qb-act" id="qbAct"></div>
        <div class="qb">${show.map((q, i) => `<div class="qc ${pick.has(q.id) ? 'sel' : ''}"><div class="row" style="justify-content:space-between;gap:6px"><span class="row" style="gap:4px;flex-wrap:wrap">${own ? `<label class="chk qb-ck"><input type="checkbox" data-pk="${q.id}" ${pick.has(q.id) ? 'checked' : ''} aria-label="تحديد السؤال"></label>` : ''}<span class="pill st-submitted">${TN[q.qtype] || q.qtype}</span><span class="pill ${q.shared === false ? 'st-returned' : 'st-approved'}">${q.shared === false ? 'خاص' : 'مشارَك'}</span>${USE[q.id] ? `<span class="pill st-sub" title="عدد التكليفات التي تستخدمه">مستخدم ${AR(USE[q.id])}</span>` : ''}
            <span class="small muted">${esc(sn(q.subject_id))} · ${esc(gl(q.grade_key))} · ${esc(les(q.lesson_id).lesson || 'بلا درس')} · ${LVN[q.level] || ''} · ${AR(q.points)} د</span></span>
            <span class="row" style="gap:4px;flex-wrap:nowrap"><span class="small faint" title="${q.source ? 'المصدر: ' + esc(q.source) : ''}">${esc(pn(q.created_by))}${q.source ? ' ⬆' : ''}</span>${own ? `<button class="btn ghost sm" data-sh="${q.id}">${q.shared === false ? 'مشاركة' : 'إخفاء'}</button><button class="btn ghost sm" data-e="${q.id}">تعديل</button>` : ''}</span></div>
          ${X() ? X().qHTML(q, i, true).replace('margin-bottom:14px', 'margin:6px 0 0') : `<b>${esc(q.body)}</b>`}</div>`).join('') || A.emptyBox(Q.length ? 'لا أسئلة مطابقة للتصفية' : 'البنك فارغ', Q.length ? 'غيّر التصفية أو امسحها.' : 'استورد أسئلة من Excel أو Word أو PDF أو صورة، أو أتح الواجب الإلكتروني للمعلمين ليضيفوا أسئلتهم.')}</div>
        ${L.length > show.length ? `<div style="text-align:center;margin-top:10px"><button class="btn ghost" id="qbMore">عرض المزيد (${AR(L.length - show.length)} متبقية)</button></div>` : ''}`;
      const re = () => tBank(box);
      $$('[data-kf]', box).forEach(b => b.onclick = () => { const [k, v] = b.dataset.kf.split('|'); if (!k) { Object.keys(f).forEach(x => f[x] = ''); } else f[k] = f[k] === v ? '' : v; st.n = 40; re(); });
      $$('[data-ty]', box).forEach(b => b.onclick = () => { f.type = f.type === b.dataset.ty ? '' : b.dataset.ty; st.n = 40; re(); });
      $$('[data-f]', box).forEach(c => c.onchange = () => { f[c.dataset.f] = c.value; st.n = 40; re(); });
      const cl = $('#qbClr', box); if (cl) cl.onclick = () => { Object.keys(f).forEach(x => f[x] = ''); re(); };
      const mo = $('#qbMore', box); if (mo) mo.onclick = () => { st.n += 60; re(); };
      const xl = extraCols;
      const act = () => { const el = $('#qbAct', box), n = pick.size, sel = Q.filter(q => pick.has(q.id));
        el.innerHTML = `${own ? `<label class="chk small"><input type="checkbox" id="qbAll" ${n && $$('[data-pk]', box).every(c => c.checked) ? 'checked' : ''}> تحديد المعروض</label>` : ''}<b>${n ? AR(n) + ' محدد' : AR(L.length) + ' سؤال'}</b><span class="grow"></span>
          ${n ? `<button class="btn sm" data-b="share">مشاركة مع المعلمين</button><button class="btn ghost sm" data-b="hide">جعلها خاصة</button><button class="btn ghost sm" data-b="copy">نسخ إلى مادة / صف</button><button class="btn ghost sm" data-b="xls">تصدير Excel</button><button class="btn bad sm" data-b="del">حذف</button>` : `<button class="btn ghost sm" data-b="xall">تصدير المعروض Excel (${AR(L.length)})</button><button class="btn ghost sm" data-b="pr">${A.I.print || ''} طباعة</button>`}`;
        const all = $('#qbAll', el); if (all) all.onchange = e => { $$('[data-pk]', box).forEach(c => { c.checked = e.target.checked; e.target.checked ? pick.add(c.dataset.pk) : pick.delete(c.dataset.pk); c.closest('.qc').classList.toggle('sel', c.checked); }); act(); };
        $$('[data-b]', el).forEach(b => b.onclick = ev => { const k = b.dataset.b;
          if (k === 'xall') return A.qExport(L, 'بنك أسئلة المدرسة', les, xl); if (k === 'xls') return A.qExport(sel, 'أسئلة محددة - بنك المدرسة', les, xl);
          if (k === 'pr') return A.printDoc && X() && A.printDoc('بنك أسئلة المدرسة', `${A.cnt(L.length, 'سؤال', 'أسئلة')}`, L.slice(0, 300).map((q, i) => X().qHTML(q, i, true)).join(''), false);
          if (k === 'share' || k === 'hide') return A.run(ev.currentTarget, async () => { const v = k === 'share'; for (const q of sel) if ((q.shared !== false) !== v) { await api.upd('questions', q.id, { shared: v }); q.shared = v; } A.toast(v ? `أصبحت ${AR(sel.length)} سؤال مشاركة مع المعلمين` : `أصبحت ${AR(sel.length)} سؤال خاصة`, 'ok'); pick.clear(); re(); });
          if (k === 'copy') return pickCtx(`نسخ ${AR(sel.length)} سؤال إلى مادة وصف آخر`, async (s, g) => { const rows = sel.filter(q => !(q.subject_id === s && q.grade_key === g)).map(q => ({ school_id: sid, subject_id: s, grade_key: g, lesson_id: null, level: q.level, difficulty: q.difficulty, qtype: q.qtype, body: q.body, image_url: q.image_url, options: q.options, answer: q.answer, explanation: q.explanation, points: q.points, skill: q.skill, shared: q.shared !== false, source: 'نسخ من بنك المدرسة' })); if (!rows.length) throw new Error('الأسئلة موجودة في هذه المادة والصف'); await api.ins('questions', rows); A.toast(`نُسخ ${AR(rows.length)} سؤال — الأصل باقٍ كما هو`, 'ok'); pick.clear(); await reload(); }, 'نسخ');
          if (k === 'del') return (async () => { const inUse = sel.filter(q => USE[q.id]).length; if (!(await A.confirmBox(`حذف ${AR(sel.length)} سؤال من بنك المدرسة؟${inUse ? `<br><b style="color:#C0392B">${AR(inUse)} منها مستخدمة في واجبات أو اختبارات — ستختفي منها.</b>` : ''}<br><span class="small muted">يمكن استرجاعها من «المحذوفات».</span>`, 'حذف', true))) return; A.run(null, async () => { for (const q of sel) await api.del('questions', q.id); A.toast(`حُذف ${AR(sel.length)} سؤال`, 'ok'); pick.clear(); await reload(); }); })();
        }); };
      act();
      $$('[data-pk]', box).forEach(c => c.onchange = () => { c.checked ? pick.add(c.dataset.pk) : pick.delete(c.dataset.pk); c.closest('.qc').classList.toggle('sel', c.checked); act(); });
      $$('[data-sh]', box).forEach(b => b.onclick = ev => A.run(ev.currentTarget, async () => { const q = Q.find(x => x.id === b.dataset.sh), v = q.shared === false; await api.upd('questions', q.id, { shared: v }); q.shared = v; A.toast(v ? 'أصبح السؤال مشاركاً مع معلمي المادة' : 'أصبح السؤال خاصاً بصاحبه وبالإدارة', 'ok'); re(); }));
      $$('[data-e]', box).forEach(b => b.onclick = ev => A.run(ev.currentTarget, async () => { const q = Q.find(x => x.id === b.dataset.e); if (!X()) throw new Error('افتح صفحة «الاختبارات» مرة ثم أعد المحاولة'); await setCtx(q.subject_id, q.grade_key); X().qEditor(q, reload); }));
    }
    const extraCols = q => q ? [sn(q.subject_id), gl(q.grade_key), pn(q.created_by)] : ['المادة', 'الصف', 'أضافه'];

    // ----- تبويب الواجبات والاختبارات (كل المعلمين) -----
    function tWork(box) {
      const KQ = (X() || {}).KQ || {}, fk = st.wk || '';
      const L = ZZ.filter(z => !fk || z.kind === fk);
      box.innerHTML = `<div class="chip-filter" style="margin:12px 0" role="group" aria-label="النوع"><button data-k="" class="${!fk ? 'on' : ''}">الكل <b>${AR(ZZ.length)}</b></button>${Object.entries(KQ).filter(([k]) => ZZ.some(z => z.kind === k)).map(([k, n]) => `<button data-k="${k}" class="${fk === k ? 'on' : ''}">${n} <b>${AR(ZZ.filter(z => z.kind === k).length)}</b></button>`).join('')}</div>
        <div class="scroll"><table class="tbl"><thead><tr><th>العنوان</th><th>النوع</th><th>المعلم</th><th>المادة · الصف</th><th>الأسئلة</th><th>الواجهة</th><th>الحالة</th><th></th></tr></thead><tbody>${L.map(z => `<tr><td><b>${esc(z.title)}</b></td><td>${KQ[z.kind] || z.kind}</td><td>${esc(pn(z.teacher_id))}</td><td class="small">${esc(sn(z.subject_id))} · ${esc(gl(z.grade_key))}</td><td>${AR((z.question_ids || []).length)}</td><td class="small">${(A.QTHEMES.find(t => t.k === ((z.settings || {}).theme || 'dina')) || {}).n || ''}</td><td><span class="pill ${z.status === 'published' ? 'st-approved' : z.status === 'closed' ? 'st-returned' : 'st-empty'}">${z.status === 'published' ? 'منشور' : z.status === 'closed' ? 'مغلق' : 'مسودة'}</span></td>
          <td class="row" style="flex-wrap:nowrap;gap:4px">${z.status !== 'draft' && z.code ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="student.html?q=${encodeURIComponent(z.code)}">فتح</a>` : ''}${own && z.status === 'published' ? `<button class="btn ghost sm" data-cl="${z.id}">إغلاق</button>` : ''}${own && z.status === 'closed' ? `<button class="btn ghost sm" data-op="${z.id}">إعادة فتح</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="8">${A.emptyBox('لا توجد واجبات أو اختبارات إلكترونية بعد')}</td></tr>`}</tbody></table></div>`;
      $$('[data-k]', box).forEach(b => b.onclick = () => { st.wk = b.dataset.k; tWork(box); });
      const setSt = (id, s2) => ev => A.run(ev.currentTarget, async () => { await api.upd('quizzes', id, { status: s2 }); (ZZ.find(z => z.id === id) || {}).status = s2; A.toast(s2 === 'closed' ? 'أُغلق — الرابط لم يعد يقبل إجابات' : 'أُعيد فتحه', 'ok'); tWork(box); });
      $$('[data-cl]', box).forEach(b => b.onclick = setSt(b.dataset.cl, 'closed')); $$('[data-op]', box).forEach(b => b.onclick = setSt(b.dataset.op, 'published'));
    }

    // ----- تبويب التحكم والإتاحة (المالك) -----
    function tCtl(box) {
      const e = ehw(), cfg = { mode: e.mode, staff: new Set(e.staff), themes: new Set(e.themes), theme: e.theme };
      const people = (S.staff || []).filter(p => p.active && !p.is_owner).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
      const fm = A.featMode ? A.featMode('assess') : 'all';
      const drawC = () => {
        box.innerHTML = `<div class="sec-box" style="margin-top:12px"><b>إتاحة «الواجب الإلكتروني برابط» للمعلمين</b>
            <p class="small muted" style="margin:2px 0 8px">من يُتاح له يرى صفحة «الواجبات الإلكترونية»: ينشئ واجباً برابط ورمز QR، يستورد الأسئلة، ويتابع النتائج. الإيقاف لا يحذف شيئاً؛ الواجبات المنشورة تبقى تعمل حتى تُغلق.</p>
            <div class="chip-filter" id="ctM" role="group" aria-label="وضع الإتاحة">${MODES.map(([k, l]) => `<button data-v="${k}" class="${cfg.mode === k ? 'on' : ''}" aria-pressed="${cfg.mode === k}">${l}</button>`).join('')}</div>
            <p class="small" style="margin:8px 0 0;color:#082B5A">${cfg.mode === 'all' ? 'كل المعلمين يستطيعون إنشاء واجب إلكتروني برابط.' : cfg.mode === 'off' ? 'متوقف للجميع عدا مالك النظام.' : cfg.mode === 'granted' ? `متاح لـ ${AR(cfg.staff.size)} ممن تختارهم أدناه فقط.` : `يتبع بند «الاختبارات» — وهو الآن: <b>${fm === 'all' ? 'لكل المعلمين' : fm === 'off' ? 'مخفي' : 'لمن مُنح صلاحية الاختبارات فقط'}</b>.`}</p>
            ${cfg.mode === 'granted' ? `<div class="row" style="gap:8px;margin:8px 0"><input class="in" id="ctQ" type="search" placeholder="بحث باسم المعلم" style="max-width:260px" aria-label="بحث"><button class="btn ghost sm" id="ctAll">تحديد الكل</button><button class="btn ghost sm" id="ctNone">إلغاء الكل</button></div><div class="perm-grid ct-st" id="ctS">${people.map(p => `<label class="chk" data-n="${esc(A.normKey(p.full_name || ''))}"><input type="checkbox" data-s="${p.id}" ${cfg.staff.has(p.id) ? 'checked' : ''}> ${esc(p.full_name)}</label>`).join('')}</div>` : ''}</div>
          <div class="sec-box" style="margin-top:12px"><b>واجهات صفحة الطالب المتاحة</b><p class="small muted" style="margin:2px 0 8px">يختار المعلم واحدة منها عند إنشاء الواجب أو الاختبار. الافتراضية تُحدَّد تلقائياً للتكليفات الجديدة.</p>
            <div class="th-pick ct-th">${A.QTHEMES.map(t => `<div class="th-c ${cfg.themes.has(t.k) ? '' : 'off'}"><span class="th-pv" style="--a:${t.c[0]};--b:${t.c[1]};--c:${t.c[2]};--bg:${t.c[3]};--cd:${t.c[4]}" aria-hidden="true"><i></i><u></u><u></u><em></em></span><b>${t.n}</b><small>${t.d}</small><label class="chk small"><input type="checkbox" data-th="${t.k}" ${cfg.themes.has(t.k) ? 'checked' : ''}> متاحة</label><label class="chk small"><input type="radio" name="ctDef" value="${t.k}" ${cfg.theme === t.k ? 'checked' : ''}> الافتراضية</label></div>`).join('')}</div></div>
          <div class="bl-sv" role="status"><span class="bl-sv-st" id="ctSt">${st.dirty ? 'تعديلات غير محفوظة' : '✓ الإعدادات محفوظة'}</span><button class="btn ok" id="ctSave">حفظ واعتماد الإعدادات</button></div>`;
        const dirty = () => { st.dirty = true; const s2 = $('#ctSt', box); s2.textContent = 'تعديلات غير محفوظة'; s2.className = 'bl-sv-st wait'; };
        $$('#ctM button', box).forEach(b => b.onclick = () => { cfg.mode = b.dataset.v; st.dirty = true; drawC(); });
        $$('[data-s]', box).forEach(c => c.onchange = () => { c.checked ? cfg.staff.add(c.dataset.s) : cfg.staff.delete(c.dataset.s); dirty(); });
        const cq = $('#ctQ', box); if (cq) { cq.oninput = () => { const k = A.normKey(cq.value); $$('#ctS label', box).forEach(l => l.style.display = !k || l.dataset.n.includes(k) ? '' : 'none'); };
          $('#ctAll', box).onclick = () => { people.forEach(p => cfg.staff.add(p.id)); st.dirty = true; drawC(); }; $('#ctNone', box).onclick = () => { cfg.staff.clear(); st.dirty = true; drawC(); }; }
        $$('[data-th]', box).forEach(c => c.onchange = () => { c.checked ? cfg.themes.add(c.dataset.th) : cfg.themes.delete(c.dataset.th); c.closest('.th-c').classList.toggle('off', !c.checked); dirty(); });
        $$('[name="ctDef"]', box).forEach(c => c.onchange = () => { cfg.theme = c.value; dirty(); });
        $('#ctSave', box).onclick = ev => A.run(ev.currentTarget, async () => {
          if (!cfg.themes.size) throw new Error('أبقِ واجهة واحدة متاحة على الأقل'); if (!cfg.themes.has(cfg.theme)) cfg.theme = [...cfg.themes][0];
          const settings = { ...(S.school.settings || {}) }; settings.ehw = { mode: cfg.mode, staff: [...cfg.staff], themes: TK.filter(k => cfg.themes.has(k)), theme: cfg.theme };
          const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; st.dirty = false;
          A.toast('حُفظت الإعدادات — تسري على حسابات المعلمين فوراً عند فتح المنصة', 'ok'); drawC(); });
      };
      drawC();
    }
    draw();
  };

  // أنماط
  const css = `
  .th-pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px}
  .th-c{position:relative;display:flex;flex-direction:column;gap:2px;border:2px solid #DCE7F3;border-radius:14px;padding:8px;cursor:pointer;background:#fff;transition:border-color .15s,box-shadow .15s}
  .th-c>input[type=radio]{position:absolute;opacity:0;inset:0;width:100%;height:100%;cursor:pointer;margin:0}
  .th-c:has(>input:checked){border-color:#005499;box-shadow:0 0 0 3px rgba(0,84,153,.15)}.th-c:has(>input:focus-visible){outline:3px solid #3AB1DB;outline-offset:2px}
  .th-c b{font-size:13.5px;color:#082B5A}.th-c small{font-size:11px;color:#566384;line-height:1.4}.th-c.off .th-pv{opacity:.35;filter:grayscale(1)}
  .th-pv{display:grid;grid-template-rows:20px 1fr;gap:5px;height:74px;border-radius:9px;padding:6px;background:var(--bg);border:1px solid rgba(8,43,90,.12);overflow:hidden}
  .th-pv i{border-radius:6px;background:linear-gradient(135deg,var(--a),var(--b))}.th-pv u{display:none}
  .th-pv em{border-radius:6px;background:var(--cd);box-shadow:inset 0 0 0 1px rgba(8,43,90,.1);position:relative}
  .th-pv em:before{content:'';position:absolute;inset-inline-start:6px;top:7px;width:55%;height:5px;border-radius:9px;background:var(--a);opacity:.55}
  .th-pv em:after{content:'';position:absolute;inset-inline-end:6px;bottom:6px;width:34%;height:11px;border-radius:6px;background:var(--b)}
  .ct-th .th-c{cursor:default}.ct-st{max-height:300px;overflow:auto}
  .qb-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:12px 0}
  .qb-k{font:inherit;text-align:start;border:1px solid #DCE7F3;background:#fff;border-radius:14px;padding:10px 12px;color:#082B5A}button.qb-k{cursor:pointer}button.qb-k:hover{border-color:#84B7E3}
  .qb-k.on{border-color:#005499;background:#EAF3FC}.qb-k b{display:block;font-size:24px;line-height:1.2}.qb-k span{font-size:12.5px;color:#566384}
  .qb-fl .in{max-width:200px;flex:1 1 150px}.qb-fl input[type=search]{max-width:280px;flex:2 1 200px}
  .qb-act{position:sticky;top:0;z-index:4;display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#F4F8FD;border:1px solid #DCE7F3;border-radius:12px;padding:8px 12px;margin:8px 0}
  .qc.sel{outline:2px solid #005499;outline-offset:-1px;background:#F5FAFF}.qb-ck{margin:0}.qb-ck input{width:20px;height:20px}
  @media (max-width:640px){.qb-fl .in,.qb-fl input[type=search]{max-width:none;flex-basis:100%}.th-pick{grid-template-columns:repeat(2,1fr)}}`;
  if (!document.getElementById('app62css')) { const s = document.createElement('style'); s.id = 'app62css'; s.textContent = css; document.head.appendChild(s); }
})();
