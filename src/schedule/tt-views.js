/* منصة دينا — عرض الجداول والإسنادات V.ttviews (لحساب المالك ولمن له صلاحية الجدول بعد تفعيل «ttviews»)
   طرق العرض: الحصص الجارية الآن (لحظياً أو لأي يوم/حصة)، جدول الفصل، جدول المعلم، جدول اليوم العام، الجدول العام للأسبوع،
   تقرير إسنادات الفصول (الفصل ← المواد ← المعلمون)، والكشاف العام للإسنادات (بالمعلم / بالمادة / مصفوفة).
   المصدر: الجدول المعتمد للقسم، أو حصص الأسبوع الحالي بتعديلاته. التعديل عبر نافذة الحصة A.slotDialog وإسناد المعلم api.assignTeacher
   (لمن له timetable_edit). الطباعة بأربعة أنماط وأربعة ألوان من هوية دينا، مع التوقيعات وختم الاعتماد، وتصدير Excel.
   الإعدادات: schools.settings.ttviews (يحفظها المالك للمدرسة) + تخصيص محلي لكل جهاز dwp_ttv_cfg. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, DAYS, PER } = A;
  A.I.ttviews = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M8 13h2M14 13h2M8 17h2"/><circle cx="16.5" cy="17" r="2.6"/><path d="M16.5 15.9V17l.8.6"/></svg>';
  const own = () => !!(S.me && S.me.is_owner);
  const canSee = () => !!S.me && (own() || ((A.anyPerm('timetable_edit', 'timetable_approve', 'structure') || (A.viewOK && A.viewOK('timetable'))) && !!(A.tfeat && A.tfeat('ttviews'))));
  const canEdit = () => own() || A.perm('timetable_edit');
  if (A.NAV && !A.NAV.some(n => n[0] === 'ttviews')) { const i = A.NAV.findIndex(n => n[0] === 'timetable'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['ttviews', 'عرض الجداول والإسنادات', () => canSee()]); }

  const today = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const addD = (iso, n) => { const x = new Date(iso + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
  const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60; };
  const TABS = [['now', 'الحصص الجارية الآن', '⏱️'], ['class', 'جدول الفصل', '🏫'], ['teacher', 'جدول المعلم', '👤'], ['day', 'جدول اليوم العام', '📅'], ['master', 'الجدول العام للأسبوع', '🗂️'], ['assign', 'إسنادات الفصول', '📋'], ['index', 'الكشاف العام للإسنادات', '📑']];
  const THEMES = { navy: ['كحلي دينا', '#082B5A', '#3AB1DB', '#E4EBF5'], blue: ['أزرق', '#005499', '#3AB1DB', '#E6F5FB'], green: ['أخضر', '#1F5E3A', '#7CBF5A', '#EAF5E3'], purple: ['بنفسجي', '#3F2A73', '#AE95DA', '#EFEAF8'] };
  const STYLES = { formal: ['رسمي', 'شريط علوي كحلي وجدول بخطوط واضحة'], modern: ['عصري', 'خلايا بطاقات مستديرة وشريط جانبي'], colors: ['ملوّن بالمواد', 'لون ثابت لكل مادة يسهل القراءة'], eco: ['اقتصادي', 'أبيض وأسود موفّر للحبر'] };
  const PAL = ['#DCEBFA', '#D9F1F8', '#E3F2D6', '#ECE5F8', '#FFF0D2', '#FBE1E7', '#D8F0EA', '#F0EBDD', '#E2E8FC', '#F4E2F5', '#E9F1CF', '#FCE7D6', '#DDE5EF', '#E6F4F1'];
  const SHORT = { 'اللغة العربية': 'لغتي', 'اللغة الإنجليزية': 'E', 'الدراسات الإسلامية والقرآن': 'إسلامية', 'الدراسات الإسلامية': 'إسلامية', 'المهارات الرقمية': 'رقمية', 'المهارات الحياتية': 'حياتية', 'الرياضيات': 'رياضيات', 'العلوم': 'علوم', 'الاجتماعيات': 'اجتماعيات', 'الدراسات الاجتماعية': 'اجتماعيات', 'تمكين وإتقان': 'تمكين', 'التربية البدنية': 'بدنية', 'التربية الفنية': 'فنية', 'التقنية الرقمية': 'تقنية', 'الكفايات اللغوية': 'كفايات', 'التفكير الناقد': 'تفكير ناقد', 'البحث ومصادر المعلومات': 'بحث ومصادر', 'علوم الأرض والفضاء': 'علوم الأرض', 'التربية الصحية والبدنية': 'صحية وبدنية', 'التربية الحياتية والأسرية': 'حياتية وأسرية', 'القرآن الكريم': 'قرآن' };
  const DEF = { title: 'الجدول الدراسي', theme: 'navy', style: 'formal', orient: 'land', fs: 100, showT: true, showS: true, times: true, color: true, abbr: false, tShort: false, stamp: true, date: true, foot: 'رحلتهم الكبرى... تبدأ من هنا', sig: [{ t: 'وكيل الشؤون التعليمية', n: '' }, { t: 'مدير المدرسة', n: '' }], hideS: [], hideC: [], aN: true, aT: true, aTot: true, aNone: true, aLay: 'cards', iMode: 'teacher', iSort: 'name', per: 1, nowNext: true };
  const school = () => (S.school.settings || {}).ttviews || {};
  const local = () => { try { return JSON.parse(A.LS.get('ttv_cfg') || '{}'); } catch (_) { return {}; } };
  const cfg = () => { const c = Object.assign({}, DEF, school(), local()); if (!Array.isArray(c.sig)) c.sig = DEF.sig; return c; };
  const setLocal = patch => A.LS.set('ttv_cfg', JSON.stringify(Object.assign(local(), patch)));
  const ST = () => { try { return JSON.parse(A.LS.get('ttv_st') || '{}'); } catch (_) { return {}; } };
  const setST = p => A.LS.set('ttv_st', JSON.stringify(Object.assign(ST(), p)));

  // ---------- البيانات ----------
  const D = { sec: null, ver: null, L: [], at: new Map(), src: 'tt', wk: null };
  const K = (c, d, p) => c + '|' + d + '|' + p;
  async function load(src) {
    const sec = A.section(); D.sec = sec.id; D.src = src;
    const vs = await api.ttVersions(sec.id); D.ver = vs.find(v => v.status === 'approved') || null;
    let L = D.ver ? await api.ttSlots(D.ver.id) : [];
    D.wk = null;
    if (src === 'wk') { const w = A.week(), ids = new Set(S.classes.map(c => c.id)); const E = (S.allEntries || S.entries || []).filter(e => ids.has(e.class_id) && (!e.week_id || !w || e.week_id === w.id) && e.day < 7);
      if (E.length) { L = E; D.wk = w || null; } }
    D.L = L.filter(s => s.subject_id).map(s => ({ class_id: s.class_id, day: s.day, period: s.period, subject_id: s.subject_id, teacher_id: s.teacher_id || null, override: !!s.override }));
    D.at = new Map(D.L.map(s => [K(s.class_id, s.day, s.period), s]));
  }
  const C = () => cfg();
  const classes = (all) => { const h = new Set(all ? [] : C().hideC); return (S.classes || []).filter(c => c.active !== false && !c.is_test && !h.has(c.id)).slice().sort(A.cmpCls || ((a, b) => (a.sort || 0) - (b.sort || 0))); };
  const vis = s => s && s.subject_id && !C().hideS.includes(s.subject_id);
  const at = (c, d, p) => { const s = D.at.get(K(c, d, p)); return vis(s) ? s : null; };
  const teachers = () => { const m = {}; D.L.forEach(s => { if (s.teacher_id && vis(s)) m[s.teacher_id] = (m[s.teacher_id] || 0) + 1; }); return Object.keys(m).sort((a, b) => A.personName(a).localeCompare(A.personName(b), 'ar')).map(id => ({ id, n: m[id] })); };
  const subjects = () => { const m = new Set(D.L.map(s => s.subject_id)); return [...m].sort(A.cmpSubj ? (a, b) => A.cmpSubj(a, b) : (a, b) => A.subjName(a).localeCompare(A.subjName(b), 'ar')); };
  const colMap = {}; const col = sid => { if (!colMap[sid]) { const l = subjects(); const i = l.indexOf(sid); colMap[sid] = PAL[(i < 0 ? Object.keys(colMap).length : i) % PAL.length]; } return colMap[sid]; };
  const sN = sid => { const n = A.subjName(sid) || ''; return C().abbr ? (SHORT[n] || (n.length > 14 ? n.split(' ').slice(0, 2).join(' ') : n)) : n; };
  const sShort = sid => { const n = A.subjName(sid) || ''; return SHORT[n] || (n.length > 10 ? n.split(' ')[0] : n); };
  const tN = (tid, short) => { const n = (A.personName(tid) || '').trim(); if (!(short || C().tShort)) return n; const w = n.replace(/^(أ\.|أ\/|د\.|م\.|Ms\.|Mr\.)\s*/, '').split(/\s+/); return w.length > 2 ? w[0] + ' ' + w[w.length - 1] : w.join(' '); };
  const cN = cid => (A.cls(cid) || {}).name || '';
  const GW = ['أول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سادس'];
  const cS = cid => { const c = A.cls(cid) || {}, n = String(c.name || ''), g = GW.findIndex(w => String(c.grade_word || n).includes(w)); if (g < 0) return n; const st = /متوسط/.test((c.stage || '') + n) ? 'م' : /ثانوي/.test((c.stage || '') + n) ? 'ث' : ''; const lb = String(c.class_label || n.split(/\s+/).pop() || '').trim(); return st + AR(g + 1) + (lb && lb.length <= 3 ? lb : ''); };
  const stg = c => A.stageOf ? A.stageOf(c) : (c.stage || '');
  const nd = () => (A.section() || {}).days || 5, np = () => (A.section() || {}).periods || 7;
  function ptxt(p, cid) { try { const sec = A.section(), b = A.bell.bellOf(sec), s = A.bell.activeSched(b); const it = A.bell.timeline(s, A.bell.maxP(s, sec), cid).items.find(x => x.k === 'p' && x.i === p); return it ? A.bell.fmt(it.from, s) + ' – ' + A.bell.fmt(it.to, s) : ''; } catch (_) { return ''; } }
  const verTxt = () => D.src === 'wk' && D.wk ? `حصص الأسبوع ${D.wk.word || AR(D.wk.number)} بتعديلاته` : D.ver ? `الجدول المعتمد: ${D.ver.label || ''}${D.ver.approved_at ? ' · ' + A.fmtDT(D.ver.approved_at) : ''}` : 'لا يوجد جدول معتمد';

  // ---------- مكوّنات الجداول (مشتركة بين الشاشة والطباعة) ----------
  const cell = (s, top, sub, ed) => `<td class="c${s.teacher_id ? '' : ' nt'}${s.override ? ' ov' : ''}" style="--sc:${col(s.subject_id)}"${ed ? ` tabindex="0" role="button" data-ed="${s.class_id}|${s.day}|${s.period}"` : ''}>${top ? `<b>${esc(top)}</b>` : ''}${sub ? `<i>${esc(sub)}</i>` : ''}</td>`;
  const emptyC = (ed) => `<td class="e"${ed ? ` tabindex="0" role="button" data-ed="${ed}"` : ''}><span>—</span></td>`;
  function gClass(cid, ed) {
    const c = C(); let h = `<table class="tvg tvg-w"><thead><tr><th class="cn">اليوم</th>${Array.from({ length: np() }, (_, p) => { const t = c.times ? ptxt(p, cid) : ''; return `<th>${PER[p]}${t ? `<small>${t}</small>` : ''}</th>`; }).join('')}</tr></thead><tbody>`;
    for (let d = 0; d < nd(); d++) { h += `<tr><th class="rh">${DAYS[d]}</th>`; for (let p = 0; p < np(); p++) { const s = at(cid, d, p); h += s ? cell(s, c.showS ? sN(s.subject_id) : '', c.showT ? (s.teacher_id ? tN(s.teacher_id) : 'بلا معلم') : '', ed) : emptyC(ed ? `${cid}|${d}|${p}` : ''); } h += '</tr>'; }
    return h + '</tbody></table>';
  }
  function gTeacher(tid, ed) {
    const c = C(); let h = `<table class="tvg tvg-w"><thead><tr><th class="cn">اليوم</th>${Array.from({ length: np() }, (_, p) => { const t = c.times ? ptxt(p, null) : ''; return `<th>${PER[p]}${t ? `<small>${t}</small>` : ''}</th>`; }).join('')}</tr></thead><tbody>`;
    for (let d = 0; d < nd(); d++) { h += `<tr><th class="rh">${DAYS[d]}</th>`; for (let p = 0; p < np(); p++) { const l = D.L.filter(s => s.teacher_id === tid && s.day === d && s.period === p && vis(s)); if (!l.length) { h += emptyC(''); continue; }
      const s = l[0]; h += cell(s, l.map(x => cN(x.class_id)).join(' + '), c.showS ? sN(s.subject_id) : '', ed).replace('<td class="c', `<td class="c${l.length > 1 ? ' clash' : ''}`); } h += '</tr>'; }
    return h + '</tbody></table>';
  }
  const tLoad = tid => { const l = D.L.filter(s => s.teacher_id === tid && vis(s)); return { n: l.length, cls: new Set(l.map(s => s.class_id)).size, sub: new Set(l.map(s => s.subject_id)).size, free: nd() * np() - new Set(l.map(s => s.day + '|' + s.period)).size }; };
  function gDay(d, rows, ed) {
    const c = C(), R = rows === 'teacher' ? teachers().map(t => ({ id: t.id, nm: tN(t.id) })) : classes().map(x => ({ id: x.id, nm: x.name }));
    let h = `<table class="tvg tvg-d"><thead><tr><th class="cn">${rows === 'teacher' ? 'المعلم' : 'الفصل'}</th>${Array.from({ length: np() }, (_, p) => { const t = c.times ? ptxt(p, null) : ''; return `<th>${PER[p]}${t ? `<small>${t}</small>` : ''}</th>`; }).join('')}</tr></thead><tbody>`;
    R.forEach(r => { h += `<tr><th class="rh">${esc(r.nm)}</th>`; for (let p = 0; p < np(); p++) {
      if (rows === 'teacher') { const l = D.L.filter(s => s.teacher_id === r.id && s.day === d && s.period === p && vis(s)); h += l.length ? cell(l[0], l.map(x => cN(x.class_id)).join(' + '), c.showS ? sN(l[0].subject_id) : '', ed).replace('<td class="c', `<td class="c${l.length > 1 ? ' clash' : ''}`) : emptyC(''); }
      else { const s = at(r.id, d, p); h += s ? cell(s, c.showS ? sN(s.subject_id) : '', c.showT ? (s.teacher_id ? tN(s.teacher_id, true) : 'بلا معلم') : '', ed) : emptyC(ed ? `${r.id}|${d}|${p}` : ''); } } h += '</tr>'; });
    return h + '</tbody></table>';
  }
  function gMaster(rows) {
    const R = rows === 'teacher' ? teachers().map(t => ({ id: t.id, nm: tN(t.id, true), n: t.n })) : classes().map(x => ({ id: x.id, nm: x.name }));
    let h = `<table class="tvg tvg-m"><thead><tr><th class="cn" rowspan="2">${rows === 'teacher' ? 'المعلم' : 'الفصل'}</th>${Array.from({ length: nd() }, (_, d) => `<th colspan="${np()}" class="dg">${DAYS[d]}</th>`).join('')}${rows === 'teacher' ? '<th rowspan="2" class="cn">النصاب</th>' : ''}</tr><tr>${Array.from({ length: nd() }, () => Array.from({ length: np() }, (_, p) => `<th class="pn${p === 0 ? ' d0' : ''}">${AR(p + 1)}</th>`).join('')).join('')}</tr></thead><tbody>`;
    R.forEach(r => { h += `<tr><th class="rh">${esc(r.nm)}</th>`; for (let d = 0; d < nd(); d++) for (let p = 0; p < np(); p++) {
      const s = rows === 'teacher' ? D.L.find(x => x.teacher_id === r.id && x.day === d && x.period === p && vis(x)) : at(r.id, d, p);
      h += s ? `<td class="c${p === 0 ? ' d0' : ''}${s.teacher_id ? '' : ' nt'}" style="--sc:${col(s.subject_id)}" title="${esc(sN(s.subject_id) + (rows === 'teacher' ? ' · ' + cN(s.class_id) : s.teacher_id ? ' · ' + tN(s.teacher_id) : ''))}"><b>${esc(rows === 'teacher' ? cS(s.class_id) : sShort(s.subject_id))}</b></td>` : `<td class="e${p === 0 ? ' d0' : ''}"></td>`; }
      h += rows === 'teacher' ? `<td class="tot">${AR(r.n)}</td></tr>` : '</tr>'; });
    return h + '</tbody></table>';
  }
  // ملخص الإسناد لفصل: [{sid, n, t:[{id,n}]}]
  function assignOf(cid) { const by = {}; D.L.filter(s => s.class_id === cid && vis(s)).forEach(s => { const o = by[s.subject_id] = by[s.subject_id] || { sid: s.subject_id, n: 0, t: {} }; o.n++; o.t[s.teacher_id || ''] = (o.t[s.teacher_id || ''] || 0) + 1; });
    return Object.values(by).map(o => ({ sid: o.sid, n: o.n, t: Object.entries(o.t).map(([id, n]) => ({ id, n })) })).sort((a, b) => (A.cmpSubj ? A.cmpSubj(a.sid, b.sid) : 0) || b.n - a.n); }
  const tSel = (cid, sid, cur) => `<select class="in tv-ts" data-ac="${cid}" data-as="${sid}" aria-label="معلم ${esc(sN(sid))} في ${esc(cN(cid))}">${cur === '*' ? '<option value="*" selected>— أكثر من معلم —</option>' : ''}<option value="">— بلا معلم —</option>${(S.staff || []).filter(p => p.active !== false).slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar')).map(p => `<option value="${p.id}" ${p.id === cur ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select>`;
  function aTable(cid, ed) {
    const c = C(), R = assignOf(cid).filter(r => c.aNone || r.t.some(x => x.id)); const tot = R.reduce((a, r) => a + r.n, 0);
    const tCell = r => ed ? tSel(cid, r.sid, r.t.length > 1 ? '*' : (r.t[0] || {}).id || '') : r.t.map(x => x.id ? esc(tN(x.id)) + (r.t.length > 1 ? ` <small>(${AR(x.n)})</small>` : '') : '<span class="tv-no">بلا معلم</span>').join('، ');
    return `<table class="tvg tvg-a"><thead><tr><th class="nn">م</th><th>المادة</th>${c.aN ? '<th class="nn">الحصص</th>' : ''}${c.aT ? '<th>المعلم</th>' : ''}</tr></thead><tbody>${R.map((r, i) => `<tr><td class="nn">${AR(i + 1)}</td><td class="sb" style="--sc:${col(r.sid)}"><b>${esc(sN(r.sid))}</b></td>${c.aN ? `<td class="nn">${AR(r.n)}</td>` : ''}${c.aT ? `<td>${tCell(r)}</td>` : ''}</tr>`).join('') || `<tr><td colspan="4" class="e">لا توجد حصص</td></tr>`}</tbody>${c.aTot ? `<tfoot><tr><td></td><td>المجموع: ${A.cnt(R.length, 'مادة', 'مواد')}</td>${c.aN ? `<td class="nn">${AR(tot)}</td>` : ''}${c.aT ? `<td>${A.cnt(new Set(R.flatMap(r => r.t.map(x => x.id).filter(Boolean))).size, 'معلم', 'معلمين')}</td>` : ''}</tr></tfoot>` : ''}</table>`;
  }
  // الكشاف العام
  function idxTeacher() {
    const c = C(); let T = teachers().map(t => { const l = D.L.filter(s => s.teacher_id === t.id && vis(s)), by = {}; l.forEach(s => { const k = s.subject_id; (by[k] = by[k] || {}); by[k][s.class_id] = (by[k][s.class_id] || 0) + 1; }); return { id: t.id, n: l.length, by, nc: new Set(l.map(s => s.class_id)).size }; });
    if (c.iSort === 'load') T.sort((a, b) => b.n - a.n);
    return { T, html: `<table class="tvg tvg-i"><thead><tr><th class="nn">م</th><th>المعلم</th><th>المادة</th><th>الفصول (عدد الحصص)</th><th class="nn">الفصول</th><th class="nn">النصاب</th></tr></thead><tbody>${T.map((t, i) => { const subs = Object.keys(t.by); return subs.map((sid, j) => `<tr class="${j ? 'cont' : 'first'}">${j ? '' : `<td class="nn" rowspan="${subs.length}">${AR(i + 1)}</td><td rowspan="${subs.length}" class="tn"><b>${esc(tN(t.id))}</b></td>`}<td class="sb" style="--sc:${col(sid)}"><b>${esc(sN(sid))}</b></td><td class="chips">${Object.entries(t.by[sid]).sort((a, b) => (A.cmpCls ? A.cmpCls(a[0], b[0]) : 0)).map(([cid, n]) => `<span>${esc(cN(cid))}<small>${AR(n)}</small></span>`).join('')}</td>${j ? '' : `<td class="nn" rowspan="${subs.length}">${AR(t.nc)}</td><td class="nn tot" rowspan="${subs.length}">${AR(t.n)}</td>`}</tr>`).join(''); }).join('') || '<tr><td colspan="6" class="e">لا توجد إسنادات</td></tr>'}</tbody><tfoot><tr><td></td><td>${A.cnt(T.length, 'معلم', 'معلمين')}</td><td colspan="3"></td><td class="nn">${AR(T.reduce((a, t) => a + t.n, 0))}</td></tr></tfoot></table>` };
  }
  function idxSubject() {
    const rows = subjects().filter(sid => !C().hideS.includes(sid)).map(sid => { const l = D.L.filter(s => s.subject_id === sid), by = {}; l.forEach(s => { const k = s.teacher_id || ''; (by[k] = by[k] || {}); by[k][s.class_id] = (by[k][s.class_id] || 0) + 1; }); return { sid, by, n: l.length }; });
    return `<table class="tvg tvg-i"><thead><tr><th class="nn">م</th><th>المادة</th><th>المعلم</th><th>الفصول (عدد الحصص)</th><th class="nn">الحصص</th></tr></thead><tbody>${rows.map((r, i) => { const ts = Object.keys(r.by); return ts.map((tid, j) => `<tr class="${j ? 'cont' : 'first'}">${j ? '' : `<td class="nn" rowspan="${ts.length}">${AR(i + 1)}</td><td rowspan="${ts.length}" class="sb" style="--sc:${col(r.sid)}"><b>${esc(sN(r.sid))}</b></td>`}<td>${tid ? esc(tN(tid)) : '<span class="tv-no">بلا معلم</span>'}</td><td class="chips">${Object.entries(r.by[tid]).sort((a, b) => (A.cmpCls ? A.cmpCls(a[0], b[0]) : 0)).map(([cid, n]) => `<span>${esc(cN(cid))}<small>${AR(n)}</small></span>`).join('')}</td><td class="nn tot">${AR(Object.values(r.by[tid]).reduce((a, b) => a + b, 0))}</td></tr>`).join(''); }).join('')}</tbody></table>`;
  }
  function idxMatrix() {
    const SB = subjects().filter(sid => !C().hideS.includes(sid)), CL = classes();
    return `<table class="tvg tvg-x"><thead><tr><th class="cn">الفصل</th>${SB.map(sid => `<th style="--sc:${col(sid)}" class="sh"><span>${esc(sShort(sid))}</span></th>`).join('')}<th class="cn">المجموع</th></tr></thead><tbody>${CL.map(c => { const A2 = assignOf(c.id); return `<tr><th class="rh">${esc(c.name)}</th>${SB.map(sid => { const r = A2.find(x => x.sid === sid); return r ? `<td class="c${r.t.some(x => !x.id) ? ' nt' : ''}" style="--sc:${col(sid)}"><b>${r.t.map(x => x.id ? esc(tN(x.id, true)) : 'بلا معلم').join('<br>')}</b>${C().aN ? `<i>${AR(r.n)}</i>` : ''}</td>` : '<td class="e"></td>'; }).join('')}<td class="tot">${AR(A2.reduce((a, r) => a + r.n, 0))}</td></tr>`; }).join('')}</tbody></table>`;
  }
  const kpis = () => { const T = teachers(), un = D.L.filter(s => vis(s) && !s.teacher_id).length; return [['الفصول', classes().length], ['المواد', subjects().filter(s => !C().hideS.includes(s)).length], ['المعلمون', T.length], ['الحصص الأسبوعية', D.L.filter(vis).length], ['حصص بلا معلم', un, un ? 'bad' : '']]; };
  const kpiHtml = () => `<div class="tv-kpi">${kpis().map(([k, v, x]) => `<div class="${x || ''}"><b>${AR(v)}</b><span>${k}</span></div>`).join('')}</div>`;

  // ---------- الحصص الجارية ----------
  function nowState(st) {
    const sec = A.section(), iso0 = today(), dow0 = A.parseDate(iso0).getDay(), live = !st.nowP && st.nowP !== 0;
    const d = live ? dow0 : +(st.nowD ?? dow0), iso = addD(iso0, d - dow0), n = nowMin();
    const out = classes().map(c => { const pl = A.bell.dayPlan ? A.bell.dayPlan(sec, iso, c.id) : null; const fmt = m => A.bell.fmt(m, (pl && pl.sched) || {});
      const P = pl ? pl.items.filter(x => x.k === 'p') : [], off = live ? (!pl || ['holiday', 'off', 'none'].includes(pl.src)) : !!(pl && ['holiday', 'off'].includes(pl.src));
      let cur = null, nxt = null, brk = null, ph = 'off';
      if (!off && live) { cur = P.find(x => n >= x.from && n < x.to) || null; const b = pl.items.find(x => x.k === 'b' && n >= x.from && n < x.to); if (b) brk = { label: b.label || 'الفسحة', t: fmt(b.to) }; nxt = P.find(x => x.from >= n && (!cur || x.i > cur.i)) || null;
        ph = cur ? 'in' : brk ? 'brk' : !P.length ? 'off' : n < P[0].from ? 'pre' : n >= P[P.length - 1].to ? 'done' : 'gap'; }
      else if (!off) { cur = P.find(x => x.i === +st.nowP) || { i: +st.nowP }; nxt = P.find(x => x.i === +st.nowP + 1) || null; ph = 'in'; }
      const eOf = p => { const e = A.attEntryOf ? A.attEntryOf(c.id, iso, p) : null; const s = e && e.subject_id ? e : D.at.get(K(c.id, d, p)); return vis(s) ? s : null; };
      return { c, pl, off, ph, brk, cur: cur && { ...cur, s: eOf(cur.i), f: cur.from != null ? fmt(cur.from) : ptxt(cur.i, c.id).split(' – ')[0], t: cur.to != null ? fmt(cur.to) : ptxt(cur.i, c.id).split(' – ')[1] }, nxt: nxt && { ...nxt, s: eOf(nxt.i), f: fmt(nxt.from) }, pct: cur && cur.to != null && live ? Math.max(0, Math.min(100, (n - cur.from) / (cur.to - cur.from) * 100)) : null, left: cur && cur.to != null && live ? Math.max(0, Math.ceil(cur.to - n)) : null };
    });
    return { live, d, iso, out, src: (out.find(x => x.pl) || {}).pl };
  }
  function nowHtml(st) {
    const N = nowState(st), C0 = C(), busy = new Map(); N.out.forEach(x => { if (x.ph === 'in' && x.cur && x.cur.s && x.cur.s.teacher_id) busy.set(x.cur.s.teacher_id, x); });
    const T = teachers(), free = T.filter(t => !busy.has(t.id)), inP = N.out.filter(x => x.ph === 'in' && x.cur && x.cur.s), br = N.out.filter(x => x.ph === 'brk'), nt = inP.filter(x => !x.cur.s.teacher_id);
    const pIdx = [...new Set(inP.map(x => x.cur.i))]; const pLbl = pIdx.length ? pIdx.map(i => 'الحصة ' + PER[i]).join(' / ') : '';
    const head = N.live ? (inP.length ? `الآن: ${pLbl}` : br.length ? `الآن: ${esc(br[0].brk.label)}` : N.out.every(x => x.off) ? `لا دراسة اليوم${N.src && N.src.name ? ' — ' + esc(N.src.name) : ''}` : N.out.some(x => x.ph === 'pre') ? 'قبل بداية اليوم الدراسي' : N.out.every(x => x.ph === 'done' || x.off) ? 'انتهى اليوم الدراسي' : 'بين الحصص') : `معاينة: ${DAYS[N.d]} — الحصة ${PER[+st.nowP]}`;
    const groups = {}; N.out.forEach(x => (groups[stg(x.c)] = groups[stg(x.c)] || []).push(x));
    const card = x => { const s = x.cur && x.cur.s; return `<article class="tv-nc ph-${x.ph}" style="--sc:${s ? col(s.subject_id) : '#EEF2F7'}"><header><b>${esc(x.c.name)}</b>${x.ph === 'in' && x.cur ? `<span class="tv-pp">${PER[x.cur.i] ? 'الحصة ' + PER[x.cur.i] : ''}</span>` : ''}</header>
      ${x.ph === 'in' ? (s ? `<div class="tv-ns"><b>${esc(sN(s.subject_id))}</b><span>${s.teacher_id ? esc(tN(s.teacher_id)) : '<em class="tv-no">بلا معلم</em>'}</span></div>` : '<div class="tv-ns faint">فراغ</div>') + (x.cur.f ? `<div class="tv-tm">${esc(x.cur.f)} – ${esc(x.cur.t || '')}${x.left != null ? ` · متبقٍ ${AR(x.left)} د` : ''}</div>` : '') + (x.pct != null ? `<div class="tv-bar" role="progressbar" aria-valuenow="${Math.round(x.pct)}" aria-valuemin="0" aria-valuemax="100" aria-label="المنقضي من الحصة"><i style="width:${x.pct.toFixed(1)}%"></i></div>` : '')
        : x.ph === 'brk' ? `<div class="tv-ns"><b>☕ ${esc(x.brk.label)}</b><span>حتى ${esc(x.brk.t)}</span></div>` : `<div class="tv-ns faint">${x.off ? 'لا دراسة' : x.ph === 'pre' ? 'لم يبدأ اليوم' : x.ph === 'done' ? 'انتهى اليوم' : 'تنقّل بين الحصص'}</div>`}
      ${C0.nowNext && x.nxt && x.nxt.s ? `<footer>التالية${x.nxt.f ? ' ' + esc(x.nxt.f) : ''}: <b>${esc(sN(x.nxt.s.subject_id))}</b>${x.nxt.s.teacher_id ? ' · ' + esc(tN(x.nxt.s.teacher_id, true)) : ''}</footer>` : ''}</article>`; };
    return { N, html: `<div class="tv-now-h"><div><div class="tv-clock" aria-live="off">${N.live ? '<span id="tvClk"></span>' : '👁️'}</div><b class="tv-nh">${head}</b><small>${DAYS[N.d] || ''} · ${esc(A.arDate ? A.arDate(N.iso) : N.iso)}${N.src && N.src.name ? ' · التوقيت: ' + esc((window.DinaBell && window.DinaBell.SRC[N.src.src]) || '') + ' — ' + esc(N.src.name) : ''}</small></div>
        <div class="tv-kpi sm"><div><b>${AR(inP.length)}</b><span>فصل في حصة</span></div><div><b>${AR(br.length)}</b><span>في فسحة</span></div><div><b>${AR(busy.size)}</b><span>معلم في حصة</span></div><div><b>${AR(free.length)}</b><span>معلم متاح</span></div>${nt.length ? `<div class="bad"><b>${AR(nt.length)}</b><span>حصة بلا معلم</span></div>` : ''}</div></div>
      ${Object.entries(groups).map(([g, l]) => `<section class="tv-ng"><h4>${esc(g)}</h4><div class="tv-ncs">${l.map(card).join('')}</div></section>`).join('')}
      <details class="tv-free" ${free.length && inP.length ? 'open' : ''}><summary><b>المعلمون المتاحون الآن (${AR(free.length)})</b> <span class="small muted">ليس لهم حصة في هذا الوقت حسب الجدول</span></summary><div class="tv-chips">${free.map(t => `<span>${esc(tN(t.id))}<small>${AR(t.n)} حصة/أسبوع</small></span>`).join('') || '<span class="muted">لا أحد</span>'}</div></details>` };
  }

  // ---------- الصفحة ----------
  let timer = null;
  V.ttviews = async function (root) {
    if (!canSee()) { root.innerHTML = `<div class="card">${A.emptyBox('عرض الجداول غير متاح لحسابك', 'يتيحه مالك المنصة من «تخصيص صفحة المعلم».')}</div>`; return; }
    css(); if (timer) { clearInterval(timer); timer = null; }
    const st = ST(); let v = st.v && TABS.some(t => t[0] === st.v) ? st.v : 'now'; const src = st.src === 'wk' ? 'wk' : 'tt';
    root.innerHTML = '<div class="card"><div class="spinner"></div></div>';
    try { await load(src); } catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر تحميل الجدول', esc(e.message))}</div>`; return; }
    const sec = A.section(), ed = canEdit() && D.src === 'tt' && !!D.ver;
    root.innerHTML = `<div class="card tv-root"><div class="head tv-head"><div class="grow"><h2>عرض الجداول والإسنادات — ${esc(sec.name)}</h2><p class="sub" style="margin:2px 0 0">${D.ver ? `<span class="pill st-ok">✓ معتمد</span> ` : ''}${esc(verTxt())}</p></div>
        <div class="tv-acts"><div class="seg" role="group" aria-label="مصدر الجدول"><button data-src="tt" aria-pressed="${D.src === 'tt'}" class="${D.src === 'tt' ? 'on' : ''}">المعتمد</button><button data-src="wk" aria-pressed="${D.src === 'wk'}" class="${D.src === 'wk' ? 'on' : ''}" title="حصص الأسبوع المختار مع التعديلات الخاصة به">هذا الأسبوع</button></div>
        <button class="btn ghost sm" id="tvVis">👁️ التحكم في الظهور</button><button class="btn ghost sm" id="tvCfg">⚙️ الهوية والطباعة</button><button class="btn ghost sm" id="tvXl">⬇ Excel</button><button class="btn sm" id="tvPr">🖨️ طباعة احترافية</button></div></div>
      <nav class="tv-tabs" role="tablist" aria-label="طريقة العرض">${TABS.map(([k, l, ic]) => `<button role="tab" data-v="${k}" aria-selected="${v === k}" class="${v === k ? 'on' : ''}"><span aria-hidden="true">${ic}</span>${l}</button>`).join('')}</nav>
      <div id="tvTool" class="tv-tool"></div><div id="tvB" class="tv-b"></div></div>`;
    if (!D.L.length) $('#tvB', root).innerHTML = A.emptyBox(D.ver ? 'الجدول المعتمد لا يحوي حصصاً' : 'لا يوجد جدول معتمد لهذا القسم', own() ? 'اعتمد جدولاً من «الجداول والأنصبة ← الجدول المعتمد».' : '');
    $$('[data-v]', root).forEach(b => b.onclick = () => { setST({ v: b.dataset.v }); V.ttviews(root); });
    $$('[data-src]', root).forEach(b => b.onclick = () => { setST({ src: b.dataset.src }); V.ttviews(root); });
    $('#tvCfg', root).onclick = () => cfgDialog(() => V.ttviews(root));
    $('#tvVis', root).onclick = () => visDialog(() => V.ttviews(root));
    $('#tvPr', root).onclick = () => printDialog(v);
    $('#tvXl', root).onclick = () => excel(v);
    if (!D.L.length) return;
    const tool = $('#tvTool', root), body = $('#tvB', root), redraw = () => V.ttviews(root);
    const bindEd = el => { $$('[data-ed]', el).forEach(td => { const go = () => { const [c, d, p] = td.dataset.ed.split('|'); A.slotDialog(c, +d, +p, async () => { await load(D.src); V.ttviews(root); }); }; td.onclick = go; td.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; }); };
    const edNote = ed ? '<p class="small muted tv-edn">✎ اضغط أي حصة لتعديلها (لأسبوع واحد أو للجدول المعتمد).</p>' : '';
    if (v === 'now') {
      tool.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="الوقت"><button data-nm="live" class="${st.nowP == null ? 'on' : ''}">● الآن مباشرة</button><button data-nm="pick" class="${st.nowP != null ? 'on' : ''}">معاينة يوم وحصة</button></div>
        ${st.nowP != null ? `<select class="in sm" id="tvND" aria-label="اليوم">${Array.from({ length: nd() }, (_, d) => `<option value="${d}" ${+st.nowD === d ? 'selected' : ''}>${DAYS[d]}</option>`).join('')}</select><select class="in sm" id="tvNP" aria-label="الحصة">${Array.from({ length: np() }, (_, p) => `<option value="${p}" ${+st.nowP === p ? 'selected' : ''}>الحصة ${PER[p]}</option>`).join('')}</select>` : '<span class="small muted">يتحدّث تلقائياً كل ٣٠ ثانية حسب التوقيت المعتمد اليوم.</span>'}
        <label class="chk"><input type="checkbox" id="tvNx" ${C().nowNext ? 'checked' : ''}> إظهار الحصة التالية</label></div>`;
      const draw = () => { const r = nowHtml(ST()); body.innerHTML = r.html; const k = $('#tvClk', body); if (k) k.textContent = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }); };
      $$('[data-nm]', tool).forEach(b => b.onclick = () => { setST(b.dataset.nm === 'live' ? { nowP: null } : { nowP: Math.max(0, A.curPeriod ? A.curPeriod() : 0), nowD: Math.min(nd() - 1, A.parseDate(today()).getDay()) }); redraw(); });
      const sd = $('#tvND', tool), sp = $('#tvNP', tool); if (sd) sd.onchange = () => { setST({ nowD: +sd.value }); draw(); }; if (sp) sp.onchange = () => { setST({ nowP: +sp.value }); draw(); };
      $('#tvNx', tool).onchange = e => { setLocal({ nowNext: e.target.checked }); draw(); };
      draw(); if (st.nowP == null) timer = setInterval(() => { if (!body.isConnected) { clearInterval(timer); timer = null; return; } draw(); }, 30000);
      return;
    }
    if (v === 'class') {
      const CL = classes(); let cid = CL.some(c => c.id === st.cid) ? st.cid : (CL[0] || {}).id; const all = st.cid === '*';
      tool.innerHTML = `<div class="tv-pick" role="group" aria-label="الفصل"><button data-c="*" class="${all ? 'on' : ''}">كل الفصول</button>${CL.map(c => `<button data-c="${c.id}" class="${!all && c.id === cid ? 'on' : ''}">${esc(c.name)}</button>`).join('')}</div>${edNote}`;
      $$('[data-c]', tool).forEach(b => b.onclick = () => { setST({ cid: b.dataset.c }); redraw(); });
      body.innerHTML = (all ? CL : CL.filter(c => c.id === cid)).map(c => { const a = assignOf(c.id); return `<section class="tv-sheet"><h3>${esc(c.name)} <small>${A.cnt(a.reduce((x, r) => x + r.n, 0), 'حصة', 'حصص')} · ${A.cnt(a.length, 'مادة', 'مواد')}</small></h3><div class="scroll">${gClass(c.id, ed)}</div></section>`; }).join('');
      return bindEd(body);
    }
    if (v === 'teacher') {
      const T = teachers(); const all = st.tid === '*'; let tid = T.some(t => t.id === st.tid) ? st.tid : (T[0] || {}).id;
      tool.innerHTML = `<div class="row"><select class="in" id="tvT" aria-label="المعلم" style="max-width:340px"><option value="*" ${all ? 'selected' : ''}>كل المعلمين (${AR(T.length)})</option>${T.map(t => `<option value="${t.id}" ${!all && t.id === tid ? 'selected' : ''}>${esc(tN(t.id))} — ${AR(t.n)} حصة</option>`).join('')}</select></div>${edNote}`;
      $('#tvT', tool).onchange = e => { setST({ tid: e.target.value }); redraw(); };
      body.innerHTML = (all ? T : T.filter(t => t.id === tid)).map(t => { const l = tLoad(t.id); return `<section class="tv-sheet"><h3>${esc(tN(t.id))} <small>النصاب ${AR(l.n)} · ${A.cnt(l.cls, 'فصل', 'فصول')} · ${A.cnt(l.sub, 'مادة', 'مواد')} · فراغ ${AR(l.free)}</small></h3><div class="scroll">${gTeacher(t.id, ed)}</div></section>`; }).join('');
      return bindEd(body);
    }
    if (v === 'day') {
      const d0 = Math.min(nd() - 1, A.parseDate(today()).getDay()); const d = st.day != null ? +st.day : d0, rows = st.dRows === 'teacher' ? 'teacher' : 'class';
      tool.innerHTML = `<div class="row"><div class="tv-pick" role="group" aria-label="اليوم">${Array.from({ length: nd() }, (_, i) => `<button data-d="${i}" class="${i === d ? 'on' : ''}">${DAYS[i]}</button>`).join('')}</div><div class="seg" role="group" aria-label="الصفوف"><button data-r="class" class="${rows === 'class' ? 'on' : ''}">بالفصول</button><button data-r="teacher" class="${rows === 'teacher' ? 'on' : ''}">بالمعلمين</button></div></div>${rows === 'class' ? edNote : ''}`;
      $$('[data-d]', tool).forEach(b => b.onclick = () => { setST({ day: +b.dataset.d }); redraw(); }); $$('[data-r]', tool).forEach(b => b.onclick = () => { setST({ dRows: b.dataset.r }); redraw(); });
      body.innerHTML = `<section class="tv-sheet"><h3>${DAYS[d]} <small>${rows === 'teacher' ? 'جدول المعلمين' : 'جدول الفصول'}</small></h3><div class="scroll">${gDay(d, rows, ed && rows === 'class')}</div></section>`;
      return bindEd(body);
    }
    if (v === 'master') {
      const rows = st.mRows === 'teacher' ? 'teacher' : 'class';
      tool.innerHTML = `<div class="row"><div class="seg" role="group" aria-label="الصفوف"><button data-r="class" class="${rows === 'class' ? 'on' : ''}">الفصول</button><button data-r="teacher" class="${rows === 'teacher' ? 'on' : ''}">المعلمون</button></div><span class="small muted">مرّر المؤشر على الخلية لرؤية التفاصيل · الألوان تمثّل المواد</span></div>`;
      $$('[data-r]', tool).forEach(b => b.onclick = () => { setST({ mRows: b.dataset.r }); redraw(); });
      body.innerHTML = `<section class="tv-sheet"><div class="scroll">${gMaster(rows)}</div>${rows === 'teacher' ? legendC() : ''}${legend()}</section>`;
      return;
    }
    if (v === 'assign') {
      const c = C(), aed = canEdit() && !!D.ver && st.aEd;
      tool.innerHTML = `<div class="row">${kpiHtml()}</div><div class="row"><div class="seg" role="group" aria-label="التخطيط"><button data-l="cards" class="${c.aLay !== 'table' ? 'on' : ''}">بطاقات</button><button data-l="table" class="${c.aLay === 'table' ? 'on' : ''}">جدول واحد</button></div>
        <label class="chk"><input type="checkbox" data-o="aN" ${c.aN ? 'checked' : ''}> عدد الحصص</label><label class="chk"><input type="checkbox" data-o="aT" ${c.aT ? 'checked' : ''}> المعلم</label><label class="chk"><input type="checkbox" data-o="aTot" ${c.aTot ? 'checked' : ''}> المجموع</label><label class="chk"><input type="checkbox" data-o="aNone" ${c.aNone ? 'checked' : ''}> المواد بلا معلم</label>
        ${canEdit() && D.ver ? `<button class="btn ${aed ? '' : 'ghost'} sm" id="tvAE" aria-pressed="${!!aed}">✎ ${aed ? 'إنهاء التعديل' : 'تعديل الإسناد'}</button>` : ''}</div>${aed ? '<div class="notice">تغيير المعلم يُطبَّق على الجدول المعتمد وعلى حصص الأسابيع المفتوحة غير المعتمدة لنفس الفصل والمادة.</div>' : ''}`;
      $$('[data-l]', tool).forEach(b => b.onclick = () => { setLocal({ aLay: b.dataset.l }); redraw(); }); $$('[data-o]', tool).forEach(i => i.onchange = () => { setLocal({ [i.dataset.o]: i.checked }); redraw(); });
      const ae = $('#tvAE', tool); if (ae) ae.onclick = () => { setST({ aEd: !aed }); redraw(); };
      body.innerHTML = assignHtml(aed);
      $$('select[data-ac]', body).forEach(s => s.onchange = () => A.run(null, async () => { if (s.value === '*') return; const r = await api.assignTeacher(s.dataset.ac, s.dataset.as, s.value || null); await load(D.src); if (A.loadWeek) await A.loadWeek(); A.toast(`تم الإسناد: ${A.cnt((r && r.slots) || 0, 'حصة', 'حصص')} في الجدول`, 'ok'); }));
      return;
    }
    if (v === 'index') {
      const c = C(), m = ['teacher', 'subject', 'matrix'].includes(c.iMode) ? c.iMode : 'teacher';
      tool.innerHTML = `<div class="row">${kpiHtml()}</div><div class="row"><div class="seg" role="group" aria-label="نوع الكشاف"><button data-m="teacher" class="${m === 'teacher' ? 'on' : ''}">بالمعلم</button><button data-m="subject" class="${m === 'subject' ? 'on' : ''}">بالمادة</button><button data-m="matrix" class="${m === 'matrix' ? 'on' : ''}">مصفوفة الفصول × المواد</button></div>
        ${m === 'teacher' ? `<label class="small">الترتيب <select class="in sm" id="tvIS"><option value="name" ${c.iSort !== 'load' ? 'selected' : ''}>أبجدي</option><option value="load" ${c.iSort === 'load' ? 'selected' : ''}>الأعلى نصاباً</option></select></label>` : ''}<input class="in sm" id="tvIQ" placeholder="بحث بالمعلم أو المادة أو الفصل" aria-label="بحث" style="max-width:260px"></div>`;
      $$('[data-m]', tool).forEach(b => b.onclick = () => { setLocal({ iMode: b.dataset.m }); redraw(); }); const is = $('#tvIS', tool); if (is) is.onchange = () => { setLocal({ iSort: is.value }); redraw(); };
      body.innerHTML = `<section class="tv-sheet"><div class="scroll">${indexHtml()}</div></section>`;
      const q = $('#tvIQ', tool); q.oninput = () => { const k = A.normKey(q.value); const rows = $$('tbody tr', body); if (m === 'matrix') { rows.forEach(r => r.hidden = k && !A.normKey(r.textContent).includes(k)); return; }
        let grp = []; const flush = () => { const hit = !k || grp.some(r => A.normKey(r.textContent).includes(k)); grp.forEach(r => r.hidden = !hit); grp = []; }; rows.forEach(r => { if (r.classList.contains('first')) flush(); grp.push(r); }); flush(); };
      return;
    }
  };
  const legendC = () => `<div class="tv-leg">${classes().map(c => `<span><b>${esc(cS(c.id))}</b> = ${esc(c.name)}</span>`).join('')}</div>`;
  const legend = () => `<div class="tv-leg">${subjects().filter(s => !C().hideS.includes(s)).map(s => `<span style="--sc:${col(s)}"><i></i>${esc(sShort(s))} = ${esc(A.subjName(s))}</span>`).join('')}</div>`;
  function assignHtml(ed) {
    const c = C(), CL = classes();
    if (c.aLay === 'table') { const R = []; CL.forEach(x => assignOf(x.id).filter(r => c.aNone || r.t.some(t => t.id)).forEach((r, i, l) => R.push({ x, r, i, l: l.length })));
      return `<section class="tv-sheet"><div class="scroll"><table class="tvg tvg-a"><thead><tr><th>الفصل</th><th>المادة</th>${c.aN ? '<th class="nn">الحصص</th>' : ''}${c.aT ? '<th>المعلم</th>' : ''}</tr></thead><tbody>${R.map(({ x, r, i, l }) => `<tr class="${i ? 'cont' : 'first'}">${i ? '' : `<th class="rh" rowspan="${l}">${esc(x.name)}</th>`}<td class="sb" style="--sc:${col(r.sid)}"><b>${esc(sN(r.sid))}</b></td>${c.aN ? `<td class="nn">${AR(r.n)}</td>` : ''}${c.aT ? `<td>${ed ? tSel(x.id, r.sid, r.t.length > 1 ? '*' : (r.t[0] || {}).id || '') : r.t.map(t => t.id ? esc(tN(t.id)) : '<span class="tv-no">بلا معلم</span>').join('، ')}</td>` : ''}</tr>`).join('')}</tbody></table></div></section>`; }
    const G = {}; CL.forEach(x => (G[stg(x)] = G[stg(x)] || []).push(x));
    return Object.entries(G).map(([g, l]) => `<h4 class="tv-gh">${esc(g)}</h4><div class="tv-acards">${l.map(x => `<section class="tv-ac"><h3>${esc(x.name)}</h3>${aTable(x.id, ed)}</section>`).join('')}</div>`).join('');
  }
  const indexHtml = () => { const m = C().iMode; return m === 'subject' ? idxSubject() : m === 'matrix' ? idxMatrix() : idxTeacher().html; };

  // ---------- Excel ----------
  function excel(v) {
    if (!window.XLSX) return A.toast('مكتبة Excel غير محمّلة', 'err');
    const wb = XLSX.utils.book_new(), add = (name, aoa) => { const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = (aoa[0] || []).map(() => ({ wch: 18 })); XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 30)); };
    const grid = (f) => [['اليوم', ...Array.from({ length: np() }, (_, p) => 'الحصة ' + PER[p])], ...Array.from({ length: nd() }, (_, d) => [DAYS[d], ...Array.from({ length: np() }, (_, p) => f(d, p))])];
    const CL = classes(), T = teachers();
    if (v === 'class' || v === 'now') CL.forEach(c => add(c.name, grid((d, p) => { const s = at(c.id, d, p); return s ? sN(s.subject_id) + (s.teacher_id ? ' — ' + tN(s.teacher_id) : '') : ''; })));
    else if (v === 'teacher') T.forEach(t => add(tN(t.id, true), grid((d, p) => D.L.filter(s => s.teacher_id === t.id && s.day === d && s.period === p && vis(s)).map(s => cN(s.class_id) + ' — ' + sN(s.subject_id)).join(' + '))));
    else if (v === 'day' || v === 'master') { for (let d = 0; d < nd(); d++) add(DAYS[d], [['الفصل', ...Array.from({ length: np() }, (_, p) => 'الحصة ' + PER[p])], ...CL.map(c => [c.name, ...Array.from({ length: np() }, (_, p) => { const s = at(c.id, d, p); return s ? sN(s.subject_id) + (s.teacher_id ? ' — ' + tN(s.teacher_id) : '') : ''; })])]); }
    else if (v === 'assign') add('إسنادات الفصول', [['الفصل', 'المادة', 'عدد الحصص', 'المعلم'], ...CL.flatMap(c => assignOf(c.id).map(r => [c.name, A.subjName(r.sid), r.n, r.t.map(t => t.id ? A.personName(t.id) : 'بلا معلم').join('، ')]))]);
    else { add('بالمعلم', [['المعلم', 'المادة', 'الفصول', 'حصص المادة', 'النصاب'], ...idxTeacher().T.flatMap(t => Object.entries(t.by).map(([sid, cl]) => [A.personName(t.id), A.subjName(sid), Object.keys(cl).map(cN).join('، '), Object.values(cl).reduce((a, b) => a + b, 0), t.n]))]);
      const SB = subjects(); add('مصفوفة', [['الفصل', ...SB.map(s => A.subjName(s))], ...CL.map(c => { const a = assignOf(c.id); return [c.name, ...SB.map(sid => { const r = a.find(x => x.sid === sid); return r ? r.t.map(t => t.id ? A.personName(t.id) : 'بلا معلم').join('، ') + ` (${r.n})` : ''; })]; })]); }
    wb.Workbook = { Views: [{ RTL: true }] };
    A.download(new Blob([XLSX.write(wb, { bookType: 'xlsx', type: 'array' })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${(TABS.find(t => t[0] === v) || [])[1] || 'الجداول'} — ${A.section().name}.xlsx`);
  }

  // ---------- الإعدادات والظهور ----------
  function cfgDialog(after) {
    const c = cfg(), m = A.modal(`<h3>الهوية والطباعة</h3><p class="sub">${own() ? 'ما تحفظه «للمدرسة» يظهر لكل من يطبع الجداول (والمدير). ويمكن لكل مستخدم تخصيص جهازه.' : 'يُحفظ هذا التخصيص على جهازك. القيم الافتراضية يحددها مالك المنصة.'}</p>
      <div class="grid g2"><div class="field"><label for="cT">عنوان المطبوعات</label><input class="in" id="cT" value="${esc(c.title)}"></div><div class="field"><label for="cF">العبارة في أسفل الصفحة</label><input class="in" id="cF" value="${esc(c.foot)}"></div></div>
      <fieldset class="tv-fs"><legend>النمط</legend><div class="tv-opts">${Object.entries(STYLES).map(([k, [l, d]]) => `<label class="tv-op"><input type="radio" name="cS" value="${k}" ${c.style === k ? 'checked' : ''}><span class="tv-sw st-${k}" aria-hidden="true"><i></i><i></i><i></i></span><b>${l}</b><small>${d}</small></label>`).join('')}</div></fieldset>
      <fieldset class="tv-fs"><legend>اللون</legend><div class="tv-opts">${Object.entries(THEMES).map(([k, [l, a, b2]]) => `<label class="tv-op sm"><input type="radio" name="cC" value="${k}" ${c.theme === k ? 'checked' : ''}><span class="tv-dot" style="background:linear-gradient(135deg,${a} 55%,${b2} 55%)" aria-hidden="true"></span><b>${l}</b></label>`).join('')}</div></fieldset>
      <div class="grid g2"><div class="field"><label for="cO">اتجاه الصفحة</label><select class="in" id="cO"><option value="land" ${c.orient !== 'port' ? 'selected' : ''}>أفقي (A4)</option><option value="port" ${c.orient === 'port' ? 'selected' : ''}>عمودي (A4)</option></select></div>
        <div class="field"><label for="cZ">حجم الخط في الطباعة: <output id="cZo">${AR(c.fs)}٪</output></label><input type="range" id="cZ" min="80" max="130" step="5" value="${c.fs}"></div></div>
      <div class="tv-cks"><label class="chk"><input type="checkbox" id="cSt" ${c.stamp ? 'checked' : ''}> ختم «معتمد»</label><label class="chk"><input type="checkbox" id="cDt" ${c.date ? 'checked' : ''}> تاريخ الطباعة</label><label class="chk"><input type="checkbox" id="cTm" ${c.times ? 'checked' : ''}> أوقات الحصص</label><label class="chk"><input type="checkbox" id="cCl" ${c.color ? 'checked' : ''}> ألوان المواد</label></div>
      <fieldset class="tv-fs"><legend>التوقيعات (تظهر أسفل كل صفحة)</legend><div id="cSig">${[0, 1, 2, 3].map(i => { const s = c.sig[i] || { t: '', n: '' }; return `<div class="grid g2 tv-sg"><input class="in" data-st="${i}" placeholder="الصفة (مثال: مدير المدرسة)" value="${esc(s.t)}" aria-label="صفة الموقّع ${AR(i + 1)}"><input class="in" data-sn="${i}" placeholder="الاسم (اختياري)" value="${esc(s.n)}" aria-label="اسم الموقّع ${AR(i + 1)}"></div>`; }).join('')}</div></fieldset>
      <div class="acts">${own() ? '<button class="btn" id="cSv">حفظ للمدرسة</button>' : ''}<button class="btn ${own() ? 'ghost' : ''}" id="cLc">حفظ لجهازي</button><button class="btn ghost" id="cRs">استعادة الافتراضي</button></div>`, { cls: 'wide' });
    const q = s => m.el.querySelector(s); q('#cZ').oninput = () => q('#cZo').textContent = AR(q('#cZ').value) + '٪';
    const val = () => ({ title: q('#cT').value.trim() || DEF.title, foot: q('#cF').value.trim(), style: (m.el.querySelector('[name=cS]:checked') || {}).value || 'formal', theme: (m.el.querySelector('[name=cC]:checked') || {}).value || 'navy', orient: q('#cO').value, fs: +q('#cZ').value, stamp: q('#cSt').checked, date: q('#cDt').checked, times: q('#cTm').checked, color: q('#cCl').checked, sig: [0, 1, 2, 3].map(i => ({ t: q(`[data-st="${i}"]`).value.trim(), n: q(`[data-sn="${i}"]`).value.trim() })).filter(s => s.t || s.n) });
    const sv = q('#cSv'); if (sv) sv.onclick = e => A.run(e.currentTarget, async () => { const p = val(), settings = { ...(S.school.settings || {}) }; settings.ttviews = { ...(settings.ttviews || {}), ...p }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; const l = local(); Object.keys(p).forEach(k => delete l[k]); A.LS.set('ttv_cfg', JSON.stringify(l)); m.close(); A.toast('حُفظت إعدادات الطباعة للمدرسة', 'ok'); after && after(); });
    q('#cLc').onclick = () => { setLocal(val()); m.close(); A.toast('حُفظ التخصيص على جهازك', 'ok'); after && after(); };
    q('#cRs').onclick = async () => { if (!(await A.confirmBox('استعادة إعدادات الطباعة الافتراضية على هذا الجهاز؟', 'استعادة'))) return; const l = local(); ['title', 'foot', 'style', 'theme', 'orient', 'fs', 'stamp', 'date', 'times', 'color', 'sig'].forEach(k => delete l[k]); A.LS.set('ttv_cfg', JSON.stringify(l)); m.close(); after && after(); };
  }
  function visDialog(after) {
    const c = cfg(), CL = classes(true), SB = subjects();
    const m = A.modal(`<h3>التحكم في الظهور</h3><p class="sub">اختر ما يظهر في كل طرق العرض والطباعة والتصدير. يُحفظ على جهازك ولا يغيّر الجدول.</p>
      <fieldset class="tv-fs"><legend>محتوى الخلية</legend><div class="tv-cks"><label class="chk"><input type="checkbox" data-k="showS" ${c.showS ? 'checked' : ''}> اسم المادة</label><label class="chk"><input type="checkbox" data-k="showT" ${c.showT ? 'checked' : ''}> اسم المعلم</label><label class="chk"><input type="checkbox" data-k="tShort" ${c.tShort ? 'checked' : ''}> اسم المعلم مختصراً (الأول والأخير)</label><label class="chk"><input type="checkbox" data-k="abbr" ${c.abbr ? 'checked' : ''}> أسماء المواد مختصرة</label><label class="chk"><input type="checkbox" data-k="times" ${c.times ? 'checked' : ''}> أوقات الحصص</label><label class="chk"><input type="checkbox" data-k="color" ${c.color ? 'checked' : ''}> ألوان المواد</label></div></fieldset>
      <fieldset class="tv-fs"><legend>الفصول الظاهرة <button type="button" class="btn ghost sm" data-all="c">الكل</button></legend><div class="tv-tg">${CL.map(x => `<label><input type="checkbox" data-c="${x.id}" ${c.hideC.includes(x.id) ? '' : 'checked'}><span>${esc(x.name)}</span></label>`).join('')}</div></fieldset>
      <fieldset class="tv-fs"><legend>المواد الظاهرة <button type="button" class="btn ghost sm" data-all="s">الكل</button></legend><div class="tv-tg">${SB.map(s => `<label style="--sc:${col(s)}"><input type="checkbox" data-s="${s}" ${c.hideS.includes(s) ? '' : 'checked'}><span>${esc(A.subjName(s))}</span></label>`).join('')}</div></fieldset>
      <div class="acts"><button class="btn" id="vOk">تطبيق</button></div>`, { cls: 'wide' });
    $$('[data-all]', m.el).forEach(b => b.onclick = () => { const k = b.dataset.all; const l = $$(`[data-${k}]`, m.el).filter(i => i.type === 'checkbox'); const on = l.some(i => !i.checked); l.forEach(i => i.checked = on); });
    $('#vOk', m.el).onclick = () => { const p = { hideC: $$('[data-c]', m.el).filter(i => i.type === 'checkbox' && !i.checked).map(i => i.dataset.c), hideS: $$('[data-s]', m.el).filter(i => i.type === 'checkbox' && !i.checked).map(i => i.dataset.s) }; $$('[data-k]', m.el).forEach(i => p[i.dataset.k] = i.checked); setLocal(p); m.close(); after && after(); };
  }

  // ---------- الطباعة الاحترافية ----------
  function printDialog(v0) {
    const st = ST(), c = cfg(), CL = classes(), T = teachers();
    const m = A.modal(`<h3>طباعة احترافية</h3><p class="sub">${esc(verTxt())}</p>
      <div class="grid g2"><div class="field"><label for="pW">ماذا تطبع؟</label><select class="in" id="pW">${[['class', 'جداول الفصول'], ['teacher', 'جداول المعلمين'], ['day', 'جدول اليوم العام (الفصول)'], ['dayT', 'جدول اليوم العام (المعلمون)'], ['master', 'الجدول العام للأسبوع (الفصول)'], ['masterT', 'الجدول العام للأسبوع (المعلمون)'], ['assign', 'إسنادات الفصول'], ['index', 'الكشاف العام للإسنادات'], ['now', 'الحصص الجارية (لقطة)']].map(([k, l]) => `<option value="${k}" ${k === (v0 === 'now' ? 'class' : v0) ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field" id="pWhoF"><label for="pWho">النطاق</label><select class="in" id="pWho"></select></div></div>
      <fieldset class="tv-fs"><legend>النمط</legend><div class="tv-opts">${Object.entries(STYLES).map(([k, [l]]) => `<label class="tv-op sm"><input type="radio" name="pS" value="${k}" ${c.style === k ? 'checked' : ''}><span class="tv-sw st-${k}" aria-hidden="true"><i></i><i></i><i></i></span><b>${l}</b></label>`).join('')}</div></fieldset>
      <div class="grid g2"><div class="field"><label>اللون</label><div class="tv-opts">${Object.entries(THEMES).map(([k, [l, a, b2]]) => `<label class="tv-op xs" title="${l}"><input type="radio" name="pC" value="${k}" ${c.theme === k ? 'checked' : ''}><span class="tv-dot" style="background:linear-gradient(135deg,${a} 55%,${b2} 55%)"></span><span class="sr">${l}</span></label>`).join('')}</div></div>
        <div class="field"><label for="pO">الاتجاه</label><select class="in" id="pO"><option value="land" ${c.orient !== 'port' ? 'selected' : ''}>أفقي</option><option value="port" ${c.orient === 'port' ? 'selected' : ''}>عمودي</option></select></div></div>
      <div class="tv-cks"><label class="chk"><input type="checkbox" id="pSt" ${c.stamp ? 'checked' : ''}> ختم «معتمد»</label><label class="chk"><input type="checkbox" id="pSg" checked> التوقيعات</label><label class="chk" id="pTwoL"><input type="checkbox" id="pTwo" ${c.per === 2 ? 'checked' : ''}> جدولان في الصفحة (عمودي)</label></div>
      <div class="tv-prev"><div class="tv-prev-h"><b>معاينة الصفحة الأولى</b><span id="pCnt" class="small muted"></span></div><div class="tv-prev-b"><iframe id="pFr" title="معاينة الطباعة"></iframe></div></div>
      <div class="acts"><button class="btn" id="pGo">🖨️ طباعة / حفظ PDF</button>${window.html2canvas ? '<button class="btn ghost" id="pPng">🖼️ صورة PNG للصفحة الأولى</button>' : ''}</div>`, { cls: 'wide xl' });
    const q = s => m.el.querySelector(s);
    const fillWho = () => { const w = q('#pW').value, o = w === 'class' ? [['*', 'كل الفصول'], ...CL.map(x => [x.id, x.name])] : w === 'teacher' ? [['*', 'كل المعلمين'], ...T.map(t => [t.id, tN(t.id)])] : (w === 'day' || w === 'dayT') ? [['*', 'كل الأيام'], ...Array.from({ length: nd() }, (_, d) => [String(d), DAYS[d]])] : w === 'assign' ? [['*', 'كل الفصول'], ...CL.map(x => [x.id, x.name])] : w === 'index' ? [['teacher', 'بالمعلم'], ['subject', 'بالمادة'], ['matrix', 'مصفوفة الفصول × المواد']] : [];
      q('#pWhoF').style.display = o.length ? '' : 'none'; const cur = w === 'class' ? (st.cid || '*') : w === 'teacher' ? (st.tid || '*') : w === 'index' ? c.iMode : '*';
      q('#pWho').innerHTML = o.map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(l)}</option>`).join(''); q('#pTwoL').style.display = ['class', 'teacher'].includes(w) ? '' : 'none'; };
    const opt = () => ({ w: q('#pW').value, who: q('#pWho').value, style: (m.el.querySelector('[name=pS]:checked') || {}).value, theme: (m.el.querySelector('[name=pC]:checked') || {}).value, orient: q('#pO').value, stamp: q('#pSt').checked, sig: q('#pSg').checked, two: q('#pTwo').checked });
    let tmr = null; const prev = () => { clearTimeout(tmr); tmr = setTimeout(() => { const o = opt(), P = pages(o); q('#pCnt').textContent = A.cnt(P.pages.length, 'صفحة', 'صفحات'); renderFrame(q('#pFr'), P.pages.slice(0, 1), o, true); }, 120); };
    q('#pW').onchange = () => { fillWho(); prev(); }; m.el.querySelectorAll('input,select').forEach(i => { if (i.id !== 'pW') i.addEventListener('change', prev); });
    fillWho(); prev();
    q('#pGo').onclick = () => { const o = opt(), P = pages(o); const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:-9999px;top:0;width:1200px;height:900px;border:0'; document.body.appendChild(f);
      renderFrame(f, P.pages, o, false).then(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 5000); }); };
    const pg = q('#pPng'); if (pg) pg.onclick = () => A.run(pg, async () => { const fr = q('#pFr'), el = fr.contentDocument.querySelector('.pg'); const cv = await html2canvas(el, { scale: 2, backgroundColor: '#fff', windowWidth: el.scrollWidth }); const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'جدول.png'; a.click(); });
  }
  // صفحات الطباعة: [{who, sub, body, kind:'grid'|'flow'}]
  function pages(o) {
    const P = [], CL = classes(), T = teachers(), byStage = l => { const G = {}; l.forEach(x => (G[stg(x)] = G[stg(x)] || []).push(x)); return G; };
    if (o.w === 'class') (o.who === '*' ? CL : CL.filter(c => c.id === o.who)).forEach(c => { const a = assignOf(c.id); P.push({ who: `جدول فصل: ${c.name}`, sub: `${A.cnt(a.reduce((x, r) => x + r.n, 0), 'حصة', 'حصص')} · ${A.cnt(a.length, 'مادة', 'مواد')}`, body: gClass(c.id, false), kind: 'grid' }); });
    else if (o.w === 'teacher') (o.who === '*' ? T : T.filter(t => t.id === o.who)).forEach(t => { const l = tLoad(t.id); P.push({ who: `جدول المعلم: ${tN(t.id)}`, sub: `النصاب ${AR(l.n)} حصة · ${A.cnt(l.cls, 'فصل', 'فصول')} · ${A.cnt(l.sub, 'مادة', 'مواد')}`, body: gTeacher(t.id, false), kind: 'grid' }); });
    else if (o.w === 'day' || o.w === 'dayT') (o.who === '*' ? Array.from({ length: nd() }, (_, d) => d) : [+o.who]).forEach(d => P.push({ who: `جدول يوم ${DAYS[d]}`, sub: o.w === 'dayT' ? 'جدول المعلمين' : 'جدول الفصول', body: gDay(d, o.w === 'dayT' ? 'teacher' : 'class', false), kind: 'grid' }));
    else if (o.w === 'master' || o.w === 'masterT') P.push({ who: o.w === 'masterT' ? 'الجدول العام للمعلمين' : 'الجدول العام للفصول', sub: 'الأسبوع كاملاً', body: gMaster(o.w === 'masterT' ? 'teacher' : 'class'), after: o.w === 'masterT' ? legendC() + legend() : legend(), kind: 'grid' });
    else if (o.w === 'assign') { const l = o.who === '*' ? CL : CL.filter(c => c.id === o.who); const G = byStage(l); P.push({ who: 'إسنادات الفصول', sub: `${A.cnt(l.length, 'فصل', 'فصول')} · ${A.cnt(new Set(D.L.filter(s => vis(s) && l.some(c => c.id === s.class_id)).map(s => s.teacher_id).filter(Boolean)).size, 'معلم', 'معلمين')}`, body: kpiHtml() + Object.entries(G).map(([g, cl]) => `<h4 class="tv-gh">${esc(g)}</h4><div class="tv-acards">${cl.map(x => `<section class="tv-ac"><h3>${esc(x.name)}</h3>${aTable(x.id, false)}</section>`).join('')}</div>`).join(''), kind: 'flow' }); }
    else if (o.w === 'index') { const mode = o.who; const t = mode === 'subject' ? idxSubject() : mode === 'matrix' ? idxMatrix() : idxTeacher().html; P.push({ who: 'الكشاف العام للإسنادات', sub: mode === 'subject' ? 'حسب المادة' : mode === 'matrix' ? 'مصفوفة الفصول × المواد' : 'حسب المعلم', body: kpiHtml() + t, kind: mode === 'matrix' ? 'grid' : 'flow' }); }
    else if (o.w === 'now') { const r = nowHtml(ST()); P.push({ who: 'الحصص الجارية', sub: '', body: r.html.replace(/<details[^>]*>/, '<div class="tv-free">').replace('</details>', '</div>').replace(/<summary>/, '<div>').replace('</summary>', '</div>'), kind: 'flow' }); }
    if (o.two && ['class', 'teacher'].includes(o.w)) { const two = []; for (let i = 0; i < P.length; i += 2) two.push({ ...P[i], pair: P[i + 1] || null }); return { pages: two }; }
    return { pages: P };
  }
  function pageHtml(p, o) {
    const c = C(), sec = A.section(), [, a, b, pl] = THEMES[o.theme] || THEMES.navy, port = o.orient === 'port' || (o.two && p.pair !== undefined);
    const sig = o.sig && c.sig.length ? `<div class="tvp-sig">${c.sig.map(s => `<div><span>${esc(s.t)}</span><b>${esc(s.n) || '&nbsp;'}</b><i>التوقيع: ..................</i></div>`).join('')}</div>` : '<div></div>';
    const stamp = o.stamp && D.ver ? `<div class="tvp-stamp" aria-hidden="true"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="60" cy="60" r="44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 3"/><text x="60" y="56" text-anchor="middle" font-size="22" font-weight="800" fill="currentColor">معتمد</text><text x="60" y="76" text-anchor="middle" font-size="9.5" fill="currentColor">${esc((S.school.name || '').slice(0, 26))}</text><text x="60" y="90" text-anchor="middle" font-size="8.5" fill="currentColor">${esc(D.ver.approved_at ? D.ver.approved_at.slice(0, 10) : '')}</text></svg></div>` : '';
    const one = (x, half) => `<div class="tvp-who"><b>${esc(x.who)}</b>${x.sub ? `<span>${esc(x.sub)}</span>` : ''}</div><div class="tvp-b${half ? ' half' : ''}">${x.body}</div>${x.after || ''}`;
    return `<div class="pg ${port ? 'port' : 'land'} ${p.kind}"><div class="tvp s-${o.style}${c.color && o.style !== 'eco' ? '' : ' nocol'}" style="--a:${o.style === 'eco' ? '#111' : a};--b:${o.style === 'eco' ? '#555' : b};--p:${o.style === 'eco' ? '#f3f3f3' : pl};--fs:${c.fs / 100}">
      <header class="tvp-h"><img src="assets/${o.style === 'formal' ? 'logo_white' : 'logo'}.svg" alt="${esc(S.school.name || '')}"><div class="tvp-t"><h1>${esc(c.title)}</h1><p>${esc(sec.name)} · ${esc(verTxt())}</p></div><div class="tvp-m">${c.date ? `طُبع: ${esc(A.arDate ? A.arDate(today()) : today())}` : ''}</div></header>
      ${one(p, !!p.pair)}${p.pair ? one(p.pair, true) : ''}
      <footer class="tvp-f">${sig}${stamp}</footer><div class="tvp-band"><span>${esc(c.foot)}</span><span>${esc(S.school.name || '')}</span></div></div></div>`;
  }
  function renderFrame(f, P, o, preview) {
    const base = location.href.split('#')[0].replace(/[^/]*$/, ''), d = f.contentDocument, port = o.orient === 'port' || (o.two && ['class', 'teacher'].includes(o.w));
    d.open(); d.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="${base}"><title>${esc(cfg().title)}</title><style>${FONT}@page{size:A4 ${port ? 'portrait' : 'landscape'};margin:0}html,body{margin:0;background:${preview ? '#E9EEF5' : '#fff'}}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}${PCSS}${preview ? '.pg{margin:0 auto;box-shadow:0 6px 24px #0002}' : ''}</style></head><body>${P.map(p => pageHtml(p, o)).join('') || '<p style="padding:40px;font-family:sans-serif">لا يوجد ما يُطبع</p>'}</body></html>`); d.close();
    const imgs = [...d.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }));
    return Promise.race([Promise.all([d.fonts ? d.fonts.ready : 0, ...imgs]), new Promise(r => setTimeout(r, 2500))]).then(() => { fit(d); if (preview) { const pg = d.querySelector('.pg'); if (pg) { const W = f.parentElement.clientWidth || 600, s = Math.min(1, (W - 8) / pg.offsetWidth); d.body.style.zoom = s; f.style.height = Math.ceil(pg.offsetHeight * s + 8) + 'px'; } } });
  }
  // ملاءمة الجدول للصفحة: تصغير ما يفيض، ومدّ الجدول الصغير رأسياً ليملأ الصفحة
  function fit(d) { d.querySelectorAll('.pg.grid .tvp-b').forEach(b => { const t = b.firstElementChild; if (!t) return; t.style.zoom = 1; const W = b.clientWidth, H = b.clientHeight, w = t.scrollWidth, h = t.scrollHeight; if (!w || !h) return; const s = Math.min(1, W / w, H / h); if (s < 1) { t.style.zoom = Math.max(0.3, s).toFixed(3); return; } t.style.height = Math.floor(H * (b.classList.contains('half') ? 0.98 : 0.94)) + 'px'; }); }
  const FONT = `@font-face{font-family:'Myriad Pro';src:url(fonts/myriad-pro-regular.woff2)}@font-face{font-family:'GE SS Two';font-weight:400 500;src:url(fonts/gess-two-medium.woff2)}@font-face{font-family:'GE SS Two';font-weight:600 900;src:url(fonts/gess-two-bold.woff2)}`;
  // أنماط الجداول المشتركة (الشاشة + الطباعة)
  const GCSS = `.tvg{border-collapse:separate;border-spacing:0;width:100%;font-size:calc(13px*var(--fs,1));table-layout:fixed}.tvg th,.tvg td{border:1px solid #D5DEEA;padding:5px 4px;text-align:center;vertical-align:middle}
  .tvg thead th{background:var(--a,#082B5A);color:#fff;font-weight:800;line-height:1.25}.tvg thead th small{display:block;font-weight:500;font-size:.78em;opacity:.85;direction:ltr}
  .tvg .rh{background:var(--p,#E4EBF5);color:var(--a,#082B5A);font-weight:800;white-space:nowrap}.tvg .cn{width:110px}
  .tvg td.c{background:var(--sc);height:3.6em}.tvg td.c b{display:block;font-weight:800;color:#0B2545;line-height:1.25}.tvg td.c i{display:block;font-style:normal;font-size:.82em;color:#3E4C63;margin-top:2px;line-height:1.2}
  .tvg td.nt i{color:#B42318;font-weight:700}.tvg td.clash{outline:2px solid #DC2626;outline-offset:-2px}.tvg td.ov{box-shadow:inset 0 -3px 0 #A855F7}.tvg td.e{color:#A0AEC0;background:#fff}
  .tvg-m{font-size:calc(10.5px*var(--fs,1))}.tvg-m td,.tvg-m th{padding:3px 1px}.tvg-m th.dg{background:var(--b,#3AB1DB)}.tvg-m th.pn{background:var(--p,#E4EBF5);color:var(--a,#082B5A)}.tvg-m .d0{border-right:2.5px solid var(--a,#082B5A)}.tvg-m td.c{height:auto}.tvg-m td.c b{font-weight:700;font-size:.92em}.tvg-m .rh{font-size:.95em}.tvg-m .cn{width:92px}
  .tvg .tot{font-weight:800;color:var(--a,#082B5A);background:var(--p,#E4EBF5)}.tvg .nn{width:52px}.tvg-a td,.tvg-i td,.tvg-a th,.tvg-i th{text-align:start;padding:6px 8px}.tvg-a .nn,.tvg-i .nn{text-align:center}
  .tvg td.sb{border-inline-start:6px solid var(--sc)}.tvg-a,.tvg-i{table-layout:auto}.tvg td.sb b{font-weight:800}.tvg tfoot td{font-weight:800;background:var(--p,#E4EBF5);color:var(--a,#082B5A)}
  .tvg .chips span{display:inline-flex;align-items:center;gap:4px;border:1px solid #CBD5E1;border-radius:99px;padding:1px 8px;margin:2px;font-size:.9em;background:#fff}.tvg .chips small{background:var(--a,#082B5A);color:#fff;border-radius:99px;padding:0 6px;font-size:.85em}
  .tvg tr.cont td{border-top-style:dotted}.tvg .tn b{font-weight:800}.tv-no{color:#B42318;font-weight:700}
  .tvg-x{font-size:calc(11px*var(--fs,1))}.tvg-x th.sh{background:var(--a,#082B5A);vertical-align:bottom}.tvg-x th.sh span{display:block;writing-mode:vertical-rl;transform:rotate(180deg);margin:auto;max-height:120px;padding:2px 0}.tvg-x td.c{height:auto}.tvg-x td.c b{font-weight:700;font-size:.92em}.tvg-x td.c i{font-weight:800;color:var(--a,#082B5A)}
  .tv-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;width:100%}.tv-kpi>div{background:var(--p,#E4EBF5);border-radius:12px;padding:8px 12px;display:flex;flex-direction:column;border-inline-start:4px solid var(--b,#3AB1DB)}.tv-kpi b{font-size:1.45em;color:var(--a,#082B5A);line-height:1.1}.tv-kpi span{font-size:.85em;color:#475569}.tv-kpi .bad{border-color:#DC2626}.tv-kpi .bad b{color:#B42318}
  .tv-gh{margin:14px 0 6px;color:var(--a,#082B5A);font-size:1.05em;border-bottom:2px solid var(--b,#3AB1DB);padding-bottom:3px}
  .tv-acards{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:12px}.tv-ac{border:1px solid #D5DEEA;border-radius:14px;overflow:hidden;break-inside:avoid;background:#fff}.tv-ac h3{margin:0;padding:8px 12px;background:var(--a,#082B5A);color:#fff;font-size:1.05em}.tv-ac .tvg{font-size:calc(12.5px*var(--fs,1))}.tv-ac .tvg th,.tv-ac .tvg td{border-left:0;border-right:0}.tv-ac .tvg thead th{background:var(--p,#E4EBF5);color:var(--a,#082B5A)}
  .tv-leg{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;font-size:.82em;color:#334155}.tv-leg span{display:inline-flex;align-items:center;gap:5px}.tv-leg i{width:14px;height:14px;border-radius:4px;background:var(--sc);border:1px solid #0001}
  .nocol .tvg td.c,.nocol .tvg-x td.c{background:#fff}.nocol .tvg td.sb{border-inline-start-color:#CBD5E1}.nocol .tv-leg{display:none}`;
  const PCSS = GCSS + `
  body{font-family:'GE SS Two','Tajawal',sans-serif;color:#0B2545}.pg{position:relative;overflow:hidden;page-break-after:always;background:#fff}.pg:last-child{page-break-after:auto}
  .pg.land{width:297mm;height:210mm}.pg.port{width:210mm;height:297mm}.pg.flow{height:auto;min-height:0;overflow:visible}
  .tvp{display:flex;flex-direction:column;height:100%;padding:9mm 10mm 0;position:relative;font-size:calc(13px*var(--fs))}.flow .tvp{height:auto;min-height:100%}
  .tvp-h{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px;padding-bottom:8px;border-bottom:3px solid var(--a)}.tvp-h img{height:58px}.tvp-t h1{margin:0;font-size:1.9em;color:var(--a);line-height:1.15}.tvp-t p{margin:3px 0 0;color:#475569;font-size:.95em}.tvp-m{font-size:.85em;color:#475569;text-align:left}
  .tvp-who{display:flex;align-items:baseline;gap:12px;margin:9px 0 7px}.tvp-who b{background:var(--a);color:#fff;border-radius:10px;padding:5px 16px;font-size:1.3em}.tvp-who span{color:#475569}
  .tvp-b{flex:1;min-height:0;overflow:hidden;display:flex;align-items:flex-start;justify-content:center}.tvp-b>table{margin:0 auto}.flow .tvp-b{display:block;overflow:visible;flex:none}.tvp-b.half{flex:1}
  .tvp-f{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;padding:8px 0 6px;min-height:22mm}.tvp-sig{display:flex;gap:26px;flex-wrap:wrap}.tvp-sig div{display:flex;flex-direction:column;min-width:44mm;font-size:.9em}.tvp-sig span{font-weight:800;color:var(--a)}.tvp-sig b{font-weight:600;min-height:1.2em}.tvp-sig i{font-style:normal;color:#64748B;margin-top:4px}
  .tvp-stamp{color:var(--b);width:25mm;height:25mm;transform:rotate(-12deg);opacity:.9}.tvp-stamp svg{width:100%;height:100%}
  .tvp-band{margin:0 -10mm;background:var(--a);color:#fff;display:flex;justify-content:space-between;padding:6px 12mm;font-size:.85em;margin-top:auto}.flow .tvp-band{margin-top:14px}
  .tv-kpi{margin-bottom:8px}.tv-acards{grid-template-columns:repeat(3,1fr)}.port .tv-acards{grid-template-columns:repeat(2,1fr)}
  /* رسمي */
  .s-formal .tvp-h{background:var(--a);margin:-9mm -10mm 0;padding:7mm 10mm;border:0}.s-formal .tvp-h h1,.s-formal .tvp-h p,.s-formal .tvp-m{color:#fff}.s-formal .tvp-h{box-shadow:inset 0 -5px 0 var(--b)}
  /* عصري */
  .s-modern{padding-right:16mm}.s-modern::before{content:"";position:absolute;top:0;bottom:0;right:0;width:8mm;background:linear-gradient(var(--a),var(--b))}.s-modern .tvp-h{border-bottom:0;background:var(--p);border-radius:16px;padding:8px 14px}
  .s-modern .tvg{border-spacing:3px}.s-modern .tvg th,.s-modern .tvg td{border:0;border-radius:9px}.s-modern .tvg td.e{background:#F6F8FB}.s-modern .tvg thead th{background:var(--b);color:#fff}.s-modern .tvg .rh{background:var(--a);color:#fff}.s-modern .tvp-who b{background:linear-gradient(90deg,var(--a),var(--b))}.s-modern .tvp-band{margin-right:-16mm}
  /* ملوّن */
  .s-colors .tvg td.c{border-color:#fff;border-width:2px}.s-colors .tvg td.c b{font-size:1.05em}.s-colors .tvp-h{border-bottom:0;box-shadow:0 4px 0 var(--b)}
  /* اقتصادي */
  .s-eco .tvg thead th{background:#fff;color:#000;border-bottom:2px solid #000}.s-eco .tvg .rh{background:#fff;color:#000}.s-eco .tvg td.c{background:#fff}.s-eco .tvp-who b{background:#fff;color:#000;border:1.5px solid #000}.s-eco .tvp-band{background:#fff;color:#000;border-top:1.5px solid #000}.s-eco .tv-kpi>div{background:#fff;border:1px solid #999}.s-eco .tv-ac h3{background:#fff;color:#000;border-bottom:1.5px solid #000}.s-eco .tvp-stamp{color:#000}
  .tv-now-h{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;margin-bottom:8px}.tv-nh{font-size:1.3em;color:var(--a)}.tv-clock{display:inline-block;margin-inline-end:8px;font-weight:800}.tv-now-h small{display:block;color:#64748B}
  .tv-ng h4{margin:10px 0 6px;color:var(--a)}.tv-ncs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.tv-nc{border:1px solid #D5DEEA;border-radius:12px;padding:8px;background:linear-gradient(var(--sc),var(--sc)) top/100% 5px no-repeat #fff;break-inside:avoid}.tv-nc header{display:flex;justify-content:space-between}.tv-nc header b{color:var(--a)}.tv-pp{font-size:.8em;color:#475569}.tv-ns b{display:block;font-size:1.1em}.tv-ns span{font-size:.9em;color:#334155}.tv-tm{font-size:.8em;color:#64748B;direction:rtl}.tv-bar{display:none}.tv-nc footer{font-size:.8em;color:#475569;border-top:1px dashed #CBD5E1;margin-top:5px;padding-top:4px}.tv-free{margin-top:10px}.tv-chips span{display:inline-block;border:1px solid #CBD5E1;border-radius:99px;padding:2px 10px;margin:2px;font-size:.9em}.tv-chips small{color:#64748B;margin-inline-start:5px}`;

  function css() {
    if (document.getElementById('ttvCss')) return; const s = document.createElement('style'); s.id = 'ttvCss';
    s.textContent = GCSS.replace(/var\(--a,#082B5A\)/g, 'var(--navy,#082B5A)') + `
    .tv-root{--a:var(--navy,#082B5A);--b:var(--sky,#3AB1DB);--p:#E4EBF5;--fs:1}.tv-head{flex-wrap:wrap;gap:10px}.tv-acts{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
    .tv-root .seg{display:inline-flex;border:1px solid var(--line,#D5DEEA);border-radius:12px;overflow:hidden;background:#fff}.tv-root .seg button{border:0;background:none;padding:7px 12px;font:inherit;font-size:13px;cursor:pointer;color:var(--ink,#0B2545);min-height:36px}.tv-root .seg button.on{background:var(--navy);color:#fff;font-weight:800}
    .tv-tabs{display:flex;flex-wrap:wrap;gap:6px;padding:10px 0 4px;margin-top:6px;border-top:1px solid var(--line,#E2E8F0);scrollbar-width:thin}.tv-tabs button{flex:0 0 auto;display:inline-flex;gap:6px;align-items:center;border:1px solid var(--line,#D5DEEA);background:#fff;border-radius:14px;padding:8px 13px;font:inherit;font-size:14px;cursor:pointer;color:var(--ink,#0B2545);min-height:40px;box-shadow:0 1px 0 #0000000d}
    .tv-tabs button.on{background:linear-gradient(135deg,var(--navy),var(--blue,#005499));color:#fff;border-color:transparent;font-weight:800;box-shadow:0 6px 16px #082b5a33}.tv-tabs button:focus-visible,.tv-root .seg button:focus-visible,.tv-pick button:focus-visible,[data-ed]:focus-visible{outline:3px solid var(--sky);outline-offset:2px}
    .tv-tool{display:flex;flex-direction:column;gap:8px;margin:10px 0}.tv-tool .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.tv-tool .in.sm{padding:6px 10px;width:auto}.tv-edn{margin:0}
    .tv-pick{display:flex;flex-wrap:wrap;gap:6px}.tv-pick button{border:1px solid var(--line,#D5DEEA);background:#fff;border-radius:99px;padding:6px 13px;font:inherit;font-size:13px;cursor:pointer;min-height:34px}.tv-pick button.on{background:var(--sky);color:#fff;border-color:var(--sky);font-weight:800}
    .tv-sheet{border:1px solid var(--line,#E2E8F0);border-radius:16px;padding:12px;margin-bottom:14px;background:#fff;box-shadow:0 8px 24px #082b5a0f}.tv-sheet h3{margin:0 0 10px;color:var(--navy)}.tv-sheet h3 small{font-weight:500;color:var(--muted,#64748B);font-size:13px;margin-inline-start:6px}
    .tv-sheet .tvg-w{min-width:720px}.tv-sheet .tvg-d{min-width:760px}.tv-sheet .tvg-m{min-width:${'1100px'}}.tv-sheet .tvg-x{min-width:760px}.tv-sheet .tvg-i{min-width:640px}
    .tv-root [data-ed]{cursor:pointer;transition:transform .12s}.tv-root td[data-ed]:hover{filter:brightness(.96);box-shadow:inset 0 0 0 2px var(--sky)}
    .tv-root .tvg thead th{position:sticky;top:0;z-index:1}.tv-root .tvg .rh{position:sticky;right:0;z-index:1}
    .tv-ts{padding:5px 8px;min-width:170px}
    .tv-now-h{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;background:linear-gradient(135deg,var(--navy),var(--blue,#005499));color:#fff;border-radius:18px;padding:14px 16px;box-shadow:0 10px 26px #082b5a33}.tv-nh{font-size:20px}.tv-now-h small{display:block;opacity:.85;margin-top:2px}
    .tv-clock{display:inline-block;background:#ffffff26;border-radius:10px;padding:2px 10px;margin-inline-end:8px;font-weight:800;direction:ltr}.tv-kpi.sm{display:flex;flex-wrap:wrap;width:auto}.tv-kpi.sm>div{flex:0 1 auto;min-width:96px;background:#ffffff1f;border-color:var(--sky)}.tv-kpi.sm b{color:#fff}.tv-kpi.sm span{color:#E2EEF9}.tv-kpi.sm .bad{background:#ffffff2e;border-color:#FCA5A5}.tv-kpi.sm .bad b{color:#FECACA}
    .tv-ng h4{margin:14px 0 8px;color:var(--navy)}.tv-ncs{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px}
    .tv-nc{position:relative;border:1px solid var(--line,#E2E8F0);border-radius:16px;padding:10px 12px 10px;background:#fff;box-shadow:0 1px 0 #0000000a,0 8px 18px #082b5a12;border-top:6px solid var(--sc);transition:transform .15s}.tv-nc:hover{transform:translateY(-2px)}
    .tv-nc header{display:flex;justify-content:space-between;align-items:center;gap:6px}.tv-nc header b{color:var(--navy);font-size:15px}.tv-pp{font-size:11.5px;background:var(--pale,#E4EBF5);color:var(--navy);border-radius:99px;padding:1px 8px}
    .tv-ns{margin-top:6px}.tv-ns b{display:block;font-size:17px;color:#0B2545}.tv-ns span{font-size:13px;color:#334155}.tv-ns.faint{color:var(--muted,#64748B);font-size:14px}.tv-tm{font-size:12px;color:var(--muted,#64748B);margin-top:4px}
    .tv-bar{height:6px;border-radius:99px;background:#E2E8F0;margin-top:6px;overflow:hidden}.tv-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--sky),var(--blue,#005499));border-radius:99px}
    .tv-nc footer{font-size:12px;color:#475569;border-top:1px dashed #CBD5E1;margin-top:8px;padding-top:6px}.tv-nc.ph-brk{border-top-color:#F59E0B;background:#FFFBEB}.tv-nc.ph-off,.tv-nc.ph-done,.tv-nc.ph-pre,.tv-nc.ph-gap{opacity:.8;border-top-color:#CBD5E1}
    .tv-free{margin-top:14px;border:1px solid var(--line,#E2E8F0);border-radius:14px;padding:10px 12px;background:#fff}.tv-free summary{cursor:pointer}.tv-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}.tv-chips span{border:1px solid #CBD5E1;border-radius:99px;padding:3px 11px;font-size:13px;background:#F8FAFC}.tv-chips small{color:var(--muted,#64748B);margin-inline-start:6px}
    .tv-fs{border:1px solid var(--line,#E2E8F0);border-radius:12px;padding:8px 12px;margin:10px 0}.tv-fs legend{font-weight:800;padding:0 6px;color:var(--navy)}.tv-fs legend .btn{margin-inline-start:6px}
    .tv-opts{display:flex;flex-wrap:wrap;gap:8px}.tv-op{position:relative;display:flex;flex-direction:column;align-items:center;gap:3px;border:2px solid var(--line,#E2E8F0);border-radius:14px;padding:8px 10px;cursor:pointer;min-width:120px;text-align:center}.tv-op.sm{min-width:96px}.tv-op.xs{min-width:0;padding:5px}.tv-op input{position:absolute;opacity:0;inset:0;cursor:pointer}.tv-op:has(input:checked){border-color:var(--sky);background:#E6F5FB}.tv-op:has(input:focus-visible){outline:3px solid var(--sky);outline-offset:2px}.tv-op small{color:var(--muted,#64748B);font-size:11.5px}
    .tv-sw{display:grid;grid-template-columns:repeat(3,14px);gap:3px;padding:5px;border-radius:8px;background:#F1F5F9}.tv-sw i{height:12px;border-radius:3px;background:#CBD5E1}.st-formal{border-top:5px solid var(--navy)}.st-formal i:nth-child(2){background:#9ED6EC}.st-modern i{border-radius:6px;background:#9ED6EC}.st-modern i:nth-child(1){background:var(--navy)}.st-colors i:nth-child(1){background:#FBE1E7}.st-colors i:nth-child(2){background:#E3F2D6}.st-colors i:nth-child(3){background:#FFF0D2}.st-eco{background:#fff;border:1px solid #333}.st-eco i{background:#fff;border:1px solid #333}
    .tv-dot{width:30px;height:30px;border-radius:50%;display:block;box-shadow:0 0 0 2px #fff,0 0 0 3px #CBD5E1}.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
    .tv-cks{display:flex;flex-wrap:wrap;gap:6px 16px;margin:6px 0}.tv-sg{margin-bottom:6px}
    .tv-tg{display:flex;flex-wrap:wrap;gap:6px}.tv-tg label{position:relative;cursor:pointer}.tv-tg input{position:absolute;opacity:0}.tv-tg span{display:inline-block;border:1px solid var(--line,#D5DEEA);border-radius:99px;padding:4px 11px;font-size:13px;background:#fff;color:var(--muted,#64748B);text-decoration:line-through}.tv-tg input:checked+span{background:var(--sc,#E6F5FB);color:#0B2545;border-color:#9ED6EC;text-decoration:none;font-weight:700}.tv-tg input:focus-visible+span{outline:3px solid var(--sky)}
    .tv-prev{border:1px solid var(--line,#E2E8F0);border-radius:14px;overflow:hidden;margin-top:10px}.tv-prev-h{display:flex;justify-content:space-between;padding:6px 12px;background:#F1F5F9}.tv-prev-b{background:#E9EEF5;padding:4px}.tv-prev iframe{width:100%;border:0;height:420px;display:block;background:#E9EEF5}
    [data-th="depth"] .tv-sheet{box-shadow:0 1px 0 #fff inset,0 14px 30px #082b5a1f}[data-th="glass"] .tv-sheet{background:#ffffffcc;backdrop-filter:blur(6px)}
    @media (max-width:600px){.tv-tabs{flex-wrap:nowrap;overflow-x:auto}.tv-acts{width:100%}.tv-acts .btn{flex:1 1 auto}.tv-tabs button{font-size:13px;padding:7px 10px}.tv-acards{grid-template-columns:1fr}.tv-ncs{grid-template-columns:1fr 1fr}.tv-nc{padding:8px}.tv-ns b{font-size:15px}.tv-now-h{padding:12px}.tv-kpi.sm>div{min-width:72px;padding:6px 8px}.tv-op{min-width:calc(50% - 8px)}}
    @media (prefers-reduced-motion:reduce){.tv-nc,.tv-root [data-ed]{transition:none}.tv-nc:hover{transform:none}}`;
    document.head.appendChild(s);
  }
  A.ttViews = { load, pages: o => pages(o), D };
})();
