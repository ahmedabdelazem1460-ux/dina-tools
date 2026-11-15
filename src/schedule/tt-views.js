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
  const DEF = { title: 'الجدول الدراسي', theme: 'navy', style: 'formal', orient: 'land', fs: 100, showT: true, showS: true, times: true, color: true, abbr: false, tShort: false, stamp: true, date: true, foot: 'رحلتهم الكبرى... تبدأ من هنا', sig: [{ t: 'وكيل الشؤون التعليمية', n: '' }, { t: 'مدير المدرسة', n: '' }], hideS: [], hideC: [], aN: true, aT: true, aTot: true, aNone: true, aLay: 'cards', iMode: 'teacher', iSort: 'name', per: 1, nowNext: true, brk: true, nowMark: true };
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
  let OVR = null;
  const C = () => OVR ? Object.assign(cfg(), OVR) : cfg();
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
  const cell = (s, top, sub, ed, ex = '') => `<td class="c${s.teacher_id ? '' : ' nt'}${s.override ? ' ov' : ''}${ex}" style="--sc:${col(s.subject_id)}" data-dp="${s.day}|${s.period}" data-c="${s.class_id}"${ed ? ` tabindex="0" role="button" data-ed="${s.class_id}|${s.day}|${s.period}"` : ''}>${top ? `<b>${esc(top)}</b>` : ''}${sub ? `<i>${esc(sub)}</i>` : ''}</td>`;
  const emptyC = (ed, d, p, c) => `<td class="e"${d != null ? ` data-dp="${d}|${p}"${c ? ` data-c="${c}"` : ''}` : ''}${ed ? ` tabindex="0" role="button" data-ed="${ed}"` : ''}><span>—</span></td>`;
  // الفسح والصلاة بين الحصص حسب الجدول الزمني الساري: [{after, label, t}]
  function brks(cid) { if (!C().brk) return []; try { const sec = A.section(), b = A.bell.bellOf(sec), s = A.bell.activeSched(b), out = []; let last = -1;
    A.bell.timeline(s, A.bell.maxP(s, sec), cid).items.forEach(x => { if (x.k === 'p') last = x.i; else if (x.k === 'b' && last >= 0 && last < np()) { const o = out.find(y => y.after === last); const t = A.bell.fmt(x.from, s) + ' – ' + A.bell.fmt(x.to, s); if (o) { o.label += ' + ' + (x.label || 'فسحة'); } else out.push({ after: last, label: (x.label || 'الفسحة').trim(), t }); } });
    return out; } catch (_) { return []; } }
  const bkTh = b => `<th class="bk" data-bk="${b.after}"><span>${esc(b.label)}</span>${C().times ? `<small>${esc(b.t)}</small>` : ''}</th>`;
  const bkTd = (b, rs) => `<td class="bk" data-bk="${b.after}"${rs ? ` rowspan="${rs}"` : ''}><span>${esc(b.label)}</span></td>`;
  const pHead = (cid, B) => Array.from({ length: np() }, (_, p) => { const t = C().times ? ptxt(p, cid) : ''; const b = B.find(x => x.after === p); return `<th data-hp="${p}">${PER[p]}${t ? `<small>${t}</small>` : ''}</th>${b ? bkTh(b) : ''}`; }).join('');
  function gClass(cid, ed) {
    const c = C(), B = brks(cid); let h = `<table class="tvg tvg-w" data-tc="${cid}"><thead><tr><th class="cn">اليوم</th>${pHead(cid, B)}</tr></thead><tbody>`;
    for (let d = 0; d < nd(); d++) { h += `<tr><th class="rh" data-hd="${d}">${DAYS[d]}</th>`; for (let p = 0; p < np(); p++) { const s = at(cid, d, p); h += s ? cell(s, c.showS ? sN(s.subject_id) : '', c.showT ? (s.teacher_id ? tN(s.teacher_id) : 'بلا معلم') : '', ed) : emptyC(ed ? `${cid}|${d}|${p}` : '', d, p, cid); const b = B.find(x => x.after === p); if (b && d === 0) h += bkTd(b, nd()); } h += '</tr>'; }
    return h + '</tbody></table>';
  }
  function gTeacher(tid, ed) {
    const c = C(), B = brks(null); let h = `<table class="tvg tvg-w"><thead><tr><th class="cn">اليوم</th>${pHead(null, B)}</tr></thead><tbody>`;
    for (let d = 0; d < nd(); d++) { h += `<tr><th class="rh" data-hd="${d}">${DAYS[d]}</th>`; for (let p = 0; p < np(); p++) { const l = D.L.filter(s => s.teacher_id === tid && s.day === d && s.period === p && vis(s));
      h += l.length ? cell(l[0], l.map(x => cN(x.class_id)).join(' + '), c.showS ? sN(l[0].subject_id) : '', ed, l.length > 1 ? ' clash' : '') : emptyC('', d, p, ''); const b = B.find(x => x.after === p); if (b && d === 0) h += bkTd(b, nd()); } h += '</tr>'; }
    return h + '</tbody></table>';
  }
  const tLoad = tid => { const l = D.L.filter(s => s.teacher_id === tid && vis(s)); return { n: l.length, cls: new Set(l.map(s => s.class_id)).size, sub: new Set(l.map(s => s.subject_id)).size, free: nd() * np() - new Set(l.map(s => s.day + '|' + s.period)).size }; };
  function gDay(d, rows, ed) {
    const c = C(), R = rows === 'teacher' ? teachers().map(t => ({ id: t.id, nm: tN(t.id) })) : classes().map(x => ({ id: x.id, nm: x.name }));
    const BR = {}; R.forEach(r => BR[r.id] = brks(rows === 'teacher' ? null : r.id)); const pos = [...new Set(Object.values(BR).flat().map(b => b.after))];
    const B0 = brks(null), U = pos.map(a => B0.find(b => b.after === a) || Object.values(BR).flat().find(b => b.after === a));
    let h = `<table class="tvg tvg-d"><thead><tr><th class="cn">${rows === 'teacher' ? 'المعلم' : 'الفصل'}</th>${pHead(null, U)}</tr></thead><tbody>`;
    R.forEach(r => { h += `<tr><th class="rh" data-go="${rows === 'teacher' ? 'teacher' : 'class'}|${r.id}" tabindex="0">${esc(r.nm)}</th>`; for (let p = 0; p < np(); p++) {
      if (rows === 'teacher') { const l = D.L.filter(s => s.teacher_id === r.id && s.day === d && s.period === p && vis(s)); h += l.length ? cell(l[0], l.map(x => cN(x.class_id)).join(' + '), c.showS ? sN(l[0].subject_id) : '', ed, l.length > 1 ? ' clash' : '') : emptyC('', d, p, ''); }
      else { const s = at(r.id, d, p); h += s ? cell(s, c.showS ? sN(s.subject_id) : '', c.showT ? (s.teacher_id ? tN(s.teacher_id, true) : 'بلا معلم') : '', ed) : emptyC(ed ? `${r.id}|${d}|${p}` : '', d, p, r.id); }
      if (pos.includes(p)) { const b = BR[r.id].find(x => x.after === p); h += b ? `<td class="bk sm" data-bk="${p}" data-c="${rows === 'teacher' ? '' : r.id}"><span>${esc(b.label)}</span></td>` : '<td class="bk none"></td>'; } } h += '</tr>'; });
    return h + '</tbody></table>';
  }
  function gMaster(rows) {
    const R = rows === 'teacher' ? teachers().map(t => ({ id: t.id, nm: tN(t.id, true), n: t.n })) : classes().map(x => ({ id: x.id, nm: x.name }));
    let h = `<table class="tvg tvg-m"><thead><tr><th class="cn" rowspan="2">${rows === 'teacher' ? 'المعلم' : 'الفصل'}</th>${Array.from({ length: nd() }, (_, d) => `<th colspan="${np()}" class="dg" data-hd="${d}">${DAYS[d]}</th>`).join('')}${rows === 'teacher' ? '<th rowspan="2" class="cn">النصاب</th>' : ''}</tr><tr>${Array.from({ length: nd() }, (_, d) => Array.from({ length: np() }, (_, p) => `<th class="pn${p === 0 ? ' d0' : ''}" data-hd="${d}" data-hp="${p}">${AR(p + 1)}</th>`).join('')).join('')}</tr></thead><tbody>`;
    R.forEach(r => { h += `<tr><th class="rh" data-go="${rows === 'teacher' ? 'teacher' : 'class'}|${r.id}" tabindex="0">${esc(r.nm)}</th>`; for (let d = 0; d < nd(); d++) for (let p = 0; p < np(); p++) {
      const s = rows === 'teacher' ? D.L.find(x => x.teacher_id === r.id && x.day === d && x.period === p && vis(x)) : at(r.id, d, p);
      h += s ? `<td class="c${p === 0 ? ' d0' : ''}${s.teacher_id ? '' : ' nt'}" style="--sc:${col(s.subject_id)}" data-dp="${d}|${p}" data-c="${s.class_id}" title="${esc(sN(s.subject_id) + (rows === 'teacher' ? ' · ' + cN(s.class_id) : s.teacher_id ? ' · ' + tN(s.teacher_id) : ''))}"><b>${esc(rows === 'teacher' ? cS(s.class_id) : sShort(s.subject_id))}</b></td>` : `<td class="e${p === 0 ? ' d0' : ''}" data-dp="${d}|${p}"${rows === 'teacher' ? '' : ` data-c="${r.id}"`}></td>`; }
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
    return { T, html: `<table class="tvg tvg-i"><thead><tr><th class="nn">م</th><th>المعلم</th><th>المادة</th><th>الفصول (عدد الحصص)</th><th class="nn">الفصول</th><th class="nn">النصاب</th></tr></thead><tbody>${T.map((t, i) => { const subs = Object.keys(t.by); return subs.map((sid, j) => `<tr class="${j ? 'cont' : 'first'}">${j ? '' : `<td class="nn" rowspan="${subs.length}">${AR(i + 1)}</td><td rowspan="${subs.length}" class="tn"><b data-go="teacher|${t.id}">${esc(tN(t.id))}</b></td>`}<td class="sb" style="--sc:${col(sid)}"><b>${esc(sN(sid))}</b></td><td class="chips">${Object.entries(t.by[sid]).sort((a, b) => (A.cmpCls ? A.cmpCls(a[0], b[0]) : 0)).map(([cid, n]) => `<span data-go="class|${cid}">${esc(cN(cid))}<small>${AR(n)}</small></span>`).join('')}</td>${j ? '' : `<td class="nn" rowspan="${subs.length}">${AR(t.nc)}</td><td class="nn tot" rowspan="${subs.length}">${AR(t.n)}</td>`}</tr>`).join(''); }).join('') || '<tr><td colspan="6" class="e">لا توجد إسنادات</td></tr>'}</tbody><tfoot><tr><td></td><td>${A.cnt(T.length, 'معلم', 'معلمين')}</td><td colspan="3"></td><td class="nn">${AR(T.reduce((a, t) => a + t.n, 0))}</td></tr></tfoot></table>` };
  }
  function idxSubject() {
    const rows = subjects().filter(sid => !C().hideS.includes(sid)).map(sid => { const l = D.L.filter(s => s.subject_id === sid), by = {}; l.forEach(s => { const k = s.teacher_id || ''; (by[k] = by[k] || {}); by[k][s.class_id] = (by[k][s.class_id] || 0) + 1; }); return { sid, by, n: l.length }; });
    return `<table class="tvg tvg-i"><thead><tr><th class="nn">م</th><th>المادة</th><th>المعلم</th><th>الفصول (عدد الحصص)</th><th class="nn">الحصص</th></tr></thead><tbody>${rows.map((r, i) => { const ts = Object.keys(r.by); return ts.map((tid, j) => `<tr class="${j ? 'cont' : 'first'}">${j ? '' : `<td class="nn" rowspan="${ts.length}">${AR(i + 1)}</td><td rowspan="${ts.length}" class="sb" style="--sc:${col(r.sid)}"><b>${esc(sN(r.sid))}</b></td>`}<td>${tid ? esc(tN(tid)) : '<span class="tv-no">بلا معلم</span>'}</td><td class="chips">${Object.entries(r.by[tid]).sort((a, b) => (A.cmpCls ? A.cmpCls(a[0], b[0]) : 0)).map(([cid, n]) => `<span data-go="class|${cid}">${esc(cN(cid))}<small>${AR(n)}</small></span>`).join('')}</td><td class="nn tot">${AR(Object.values(r.by[tid]).reduce((a, b) => a + b, 0))}</td></tr>`).join(''); }).join('')}</tbody></table>`;
  }
  function idxMatrix() {
    const SB = subjects().filter(sid => !C().hideS.includes(sid)), CL = classes();
    return `<table class="tvg tvg-x"><thead><tr><th class="cn">الفصل</th>${SB.map(sid => `<th style="--sc:${col(sid)}" class="sh"><span>${esc(sShort(sid))}</span></th>`).join('')}<th class="cn">المجموع</th></tr></thead><tbody>${CL.map(c => { const A2 = assignOf(c.id); return `<tr><th class="rh">${esc(c.name)}</th>${SB.map(sid => { const r = A2.find(x => x.sid === sid); return r ? `<td class="c${r.t.some(x => !x.id) ? ' nt' : ''}" style="--sc:${col(sid)}"><b>${r.t.map(x => x.id ? esc(tN(x.id, true)) : 'بلا معلم').join('<br>')}</b>${C().aN ? `<i>${AR(r.n)}</i>` : ''}</td>` : '<td class="e"></td>'; }).join('')}<td class="tot">${AR(A2.reduce((a, r) => a + r.n, 0))}</td></tr>`; }).join('')}</tbody></table>`;
  }
  const kpis = () => { const T = teachers(), un = D.L.filter(s => vis(s) && !s.teacher_id).length; return [['الفصول', classes().length], ['المواد', subjects().filter(s => !C().hideS.includes(s)).length], ['المعلمون', T.length], ['الحصص الأسبوعية', D.L.filter(vis).length], ['حصص بلا معلم', un, un ? 'bad' : '']]; };
  const KPK = ['cls', 'sub', 'tch', 'per', 'un'];
  const kpiHtml = (live) => `<div class="tv-kpi${live ? ' act' : ''}">${kpis().map(([k, v, x], i) => live ? `<button type="button" class="${x || ''}" data-kp="${KPK[i]}" aria-label="${k}: ${AR(v)} — اضغط للتفاصيل"><b>${AR(v)}</b><span>${k}</span></button>` : `<div class="${x || ''}"><b>${AR(v)}</b><span>${k}</span></div>`).join('')}</div>`;

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
    const card = x => { const s = x.cur && x.cur.s; return `<article class="tv-nc ph-${x.ph}" data-go="class|${x.c.id}" tabindex="0" role="button" aria-label="جدول ${esc(x.c.name)}" style="--sc:${s ? col(s.subject_id) : '#EEF2F7'}"><header><b>${esc(x.c.name)}</b>${x.ph === 'in' && x.cur ? `<span class="tv-pp">${PER[x.cur.i] ? 'الحصة ' + PER[x.cur.i] : ''}</span>` : ''}</header>
      ${x.ph === 'in' ? (s ? `<div class="tv-ns"><b>${esc(sN(s.subject_id))}</b><span>${s.teacher_id ? esc(tN(s.teacher_id)) : '<em class="tv-no">بلا معلم</em>'}</span></div>` : '<div class="tv-ns faint">فراغ</div>') + (x.cur.f ? `<div class="tv-tm">${esc(x.cur.f)} – ${esc(x.cur.t || '')}${x.left != null ? ` · متبقٍ ${AR(x.left)} د` : ''}</div>` : '') + (x.pct != null ? `<div class="tv-bar" role="progressbar" aria-valuenow="${Math.round(x.pct)}" aria-valuemin="0" aria-valuemax="100" aria-label="المنقضي من الحصة"><i style="width:${x.pct.toFixed(1)}%"></i></div>` : '')
        : x.ph === 'brk' ? `<div class="tv-ns"><b>☕ ${esc(x.brk.label)}</b><span>حتى ${esc(x.brk.t)}</span></div>` : `<div class="tv-ns faint">${x.off ? 'لا دراسة' : x.ph === 'pre' ? 'لم يبدأ اليوم' : x.ph === 'done' ? 'انتهى اليوم' : 'تنقّل بين الحصص'}</div>`}
      ${C0.nowNext && x.nxt && x.nxt.s ? `<footer>التالية${x.nxt.f ? ' ' + esc(x.nxt.f) : ''}: <b>${esc(sN(x.nxt.s.subject_id))}</b>${x.nxt.s.teacher_id ? ' · ' + esc(tN(x.nxt.s.teacher_id, true)) : ''}</footer>` : ''}</article>`; };
    LASTNOW = { N, inP, br, busy, free, nt };
    return { N, html: `<div class="tv-now-h"><div><div class="tv-clock" aria-live="off">${N.live ? '<span id="tvClk"></span>' : '👁️'}</div><b class="tv-nh">${head}</b><small>${DAYS[N.d] || ''} · ${esc(A.arDate ? A.arDate(N.iso) : N.iso)}${N.src && N.src.name ? ' · التوقيت: ' + esc((window.DinaBell && window.DinaBell.SRC[N.src.src]) || '') + ' — ' + esc(N.src.name) : ''}</small></div>
        <div class="tv-kpi sm act">${[['in', inP.length, 'فصل في حصة'], ['brk', br.length, 'في فسحة'], ['busy', busy.size, 'معلم في حصة'], ['free', free.length, 'معلم متاح']].concat(nt.length ? [['nt', nt.length, 'حصة بلا معلم', 'bad']] : []).map(([k, v, l, x]) => `<button type="button" data-np="${k}" class="${x || ''}" aria-label="${l}: ${AR(v)} — اضغط لعرضهم"><b>${AR(v)}</b><span>${l}</span></button>`).join('')}</div></div>
      ${Object.entries(groups).map(([g, l]) => `<section class="tv-ng"><h4>${esc(g)}</h4><div class="tv-ncs">${l.map(card).join('')}</div></section>`).join('')}
      <details class="tv-free" ${free.length && inP.length ? 'open' : ''}><summary><b>المعلمون المتاحون الآن (${AR(free.length)})</b> <span class="small muted">ليس لهم حصة في هذا الوقت حسب الجدول</span></summary><div class="tv-chips">${free.map(t => `<button type="button" data-go="teacher|${t.id}">${esc(tN(t.id))}<small>${AR(t.n)} حصة/أسبوع</small></button>`).join('') || '<span class="muted">لا أحد</span>'}</div></details>` };
  }

  // ---------- التفاعل: الأرقام والأسماء قابلة للضغط ----------
  let LASTNOW = null, CUR_ROOT = null;
  function go(kind, id) { setST(kind === 'class' ? { v: 'class', cid: id } : kind === 'teacher' ? { v: 'teacher', tid: id } : { v: kind }); if (CUR_ROOT && CUR_ROOT.isConnected) { V.ttviews(CUR_ROOT); CUR_ROOT.scrollIntoView && window.scrollTo({ top: 0, behavior: 'smooth' }); } }
  const goBtn = (kind, id, txt) => `<button type="button" class="tv-lnk" data-go="${kind}|${id}">${esc(txt)}</button>`;
  function listModal(title, sub, html, extra) {
    const m = A.modal(`<h3>${title}</h3>${sub ? `<p class="sub">${sub}</p>` : ''}<div class="tv-lm">${html || '<p class="muted">لا يوجد</p>'}</div>${extra || ''}`, { cls: 'wide' });
    m.el.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (!g) return; e.preventDefault(); const [k, id] = g.dataset.go.split('|'); m.close(); go(k, id); });
    return m;
  }
  const tbl = (head, rows) => `<div class="scroll"><table class="tvg tvg-i tvg-l"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${head.length}" class="e">لا يوجد</td></tr>`}</tbody></table></div>`;
  function kpModal(k) {
    const CL = classes(), T = teachers(), L = D.L.filter(vis);
    if (k === 'cls') return listModal('الفصول', 'اضغط اسم الفصل لعرض جدوله', tbl(['الفصل', 'المواد', 'الحصص', 'المعلمون', 'بلا معلم'], CL.map(c => { const a = L.filter(s => s.class_id === c.id); return `<tr><td>${goBtn('class', c.id, c.name)}</td><td class="nn">${AR(new Set(a.map(s => s.subject_id)).size)}</td><td class="nn">${AR(a.length)}</td><td class="nn">${AR(new Set(a.map(s => s.teacher_id).filter(Boolean)).size)}</td><td class="nn">${AR(a.filter(s => !s.teacher_id).length)}</td></tr>`; })));
    if (k === 'tch') return listModal('المعلمون', 'اضغط اسم المعلم لعرض جدوله', tbl(['المعلم', 'النصاب', 'الفصول', 'المواد', 'فراغ'], T.map(t => { const l = tLoad(t.id); return `<tr><td>${goBtn('teacher', t.id, tN(t.id))}</td><td class="nn tot">${AR(l.n)}</td><td class="nn">${AR(l.cls)}</td><td class="nn">${AR(l.sub)}</td><td class="nn">${AR(l.free)}</td></tr>`; })));
    if (k === 'sub') return listModal('المواد', '', tbl(['المادة', 'الحصص', 'المعلمون', 'الفصول'], subjects().filter(s => !C().hideS.includes(s)).map(sid => { const a = L.filter(s => s.subject_id === sid), ts = [...new Set(a.map(s => s.teacher_id).filter(Boolean))]; return `<tr><td class="sb" style="--sc:${col(sid)}"><b>${esc(A.subjName(sid))}</b></td><td class="nn">${AR(a.length)}</td><td>${ts.map(t => goBtn('teacher', t, tN(t))).join(' ') || '<span class="tv-no">بلا معلم</span>'}</td><td>${[...new Set(a.map(s => s.class_id))].map(c => goBtn('class', c, cN(c))).join(' ')}</td></tr>`; })));
    if (k === 'per') return listModal('الحصص الأسبوعية', 'حسب اليوم والحصة', tbl(['اليوم', ...Array.from({ length: np() }, (_, p) => PER[p]), 'المجموع'], Array.from({ length: nd() }, (_, d) => { const a = L.filter(s => s.day === d); return `<tr><td><b>${DAYS[d]}</b></td>${Array.from({ length: np() }, (_, p) => `<td class="nn">${AR(a.filter(s => s.period === p).length)}</td>`).join('')}<td class="nn tot">${AR(a.length)}</td></tr>`; })));
    if (k === 'un') { const U = L.filter(s => !s.teacher_id).sort((a, b) => (A.cmpCls ? A.cmpCls(a.class_id, b.class_id) : 0) || a.day - b.day || a.period - b.period);
      const by = {}; U.forEach(s => { const kk = s.class_id + '|' + s.subject_id; (by[kk] = by[kk] || { c: s.class_id, sid: s.subject_id, l: [] }).l.push(s); });
      const m = listModal('حصص بلا معلم', `${A.cnt(U.length, 'حصة', 'حصص')} في ${A.cnt(Object.keys(by).length, 'مادة', 'مواد')} — اضغط الفصل لعرض جدوله`, tbl(['الفصل', 'المادة', 'الحصص', 'المواعيد'], Object.values(by).map(o => `<tr><td>${goBtn('class', o.c, cN(o.c))}</td><td class="sb" style="--sc:${col(o.sid)}"><b>${esc(A.subjName(o.sid))}</b></td><td class="nn">${AR(o.l.length)}</td><td class="small">${o.l.map(s => DAYS[s.day] + ' ' + AR(s.period + 1)).join('، ')}</td></tr>`)),
        canEdit() && D.ver && U.length ? '<div class="acts"><button class="btn" id="tvGoA">✎ إسناد المعلمين الآن</button></div>' : '');
      const b = m.el.querySelector('#tvGoA'); if (b) b.onclick = () => { m.close(); setST({ v: 'assign', aEd: true }); V.ttviews(CUR_ROOT); }; return m; }
  }
  function npModal(k) {
    const X = LASTNOW; if (!X) return; const N = X.N, curP = Math.max(-1, ...X.inP.map(x => x.cur.i));
    const row = x => { const s = x.cur.s; return `<tr><td>${goBtn('class', x.c.id, x.c.name)}</td><td class="sb" style="--sc:${col(s.subject_id)}"><b>${esc(sN(s.subject_id))}</b></td><td>${s.teacher_id ? goBtn('teacher', s.teacher_id, tN(s.teacher_id)) : '<span class="tv-no">بلا معلم</span>'}</td><td class="small">${esc(x.cur.f || '')}${x.cur.t ? ' – ' + esc(x.cur.t) : ''}${x.left != null ? ` · متبقٍ ${AR(x.left)} د` : ''}</td></tr>`; };
    if (k === 'in') return listModal('الفصول في حصة الآن', '', tbl(['الفصل', 'المادة', 'المعلم', 'الوقت'], X.inP.map(row)));
    if (k === 'nt') return listModal('حصص جارية بلا معلم', 'تحتاج تأميناً أو إسناداً', tbl(['الفصل', 'المادة', 'المعلم', 'الوقت'], X.nt.map(row)), (own() || A.perm('structure')) && A.NAV.some(n => n[0] === 'standby') ? '<div class="acts"><a class="btn" href="#/standby">فتح حصص الانتظار وتأمين الحصص</a></div>' : '');
    if (k === 'brk') return listModal('الفصول في الفسحة الآن', '', tbl(['الفصل', 'الفسحة', 'حتى'], X.br.map(x => `<tr><td>${goBtn('class', x.c.id, x.c.name)}</td><td>${esc(x.brk.label)}</td><td>${esc(x.brk.t)}</td></tr>`)));
    if (k === 'busy') return listModal('المعلمون في حصة الآن', '', tbl(['المعلم', 'الفصل', 'المادة', 'الوقت'], [...X.busy.entries()].sort((a, b) => tN(a[0]).localeCompare(tN(b[0]), 'ar')).map(([t, x]) => `<tr><td>${goBtn('teacher', t, tN(t))}</td><td>${goBtn('class', x.c.id, x.c.name)}</td><td>${esc(sN(x.cur.s.subject_id))}</td><td class="small">${esc(x.cur.f || '')}${x.cur.t ? ' – ' + esc(x.cur.t) : ''}</td></tr>`)));
    if (k === 'free') return listModal('المعلمون المتاحون الآن', 'ليس لهم حصة في هذا الوقت — مفيد لتأمين الحصص والمهام', tbl(['المعلم', 'حصصه اليوم', 'حصته التالية اليوم', 'النصاب'], X.free.map(t => { const td = D.L.filter(s => s.teacher_id === t.id && s.day === N.d && vis(s)).sort((a, b) => a.period - b.period), nx = td.find(s => s.period > curP);
      return `<tr><td>${goBtn('teacher', t.id, tN(t.id))}</td><td class="nn">${AR(td.length)}</td><td>${nx ? `الحصة ${PER[nx.period]} — ${goBtn('class', nx.class_id, cN(nx.class_id))} <small class="muted">${esc(sN(nx.subject_id))}</small>` : '<span class="muted">لا حصص متبقية اليوم</span>'}</td><td class="nn">${AR(t.n)}</td></tr>`; })));
  }
  // تمييز الحصة الحالية (أخضر) والفسحة الجارية في جداول اليوم الحالي
  function markNow(el) {
    if (!el) return; $$('.tv-now', el).forEach(x => x.classList.remove('tv-now')); $$('.tv-today', el).forEach(x => x.classList.remove('tv-today'));
    if (!C().nowMark) return; const dow = A.parseDate(today()).getDay(); if (dow >= nd()) return;
    const sec = A.section(), n = nowMin(), cache = {};
    const st = cid => { if (cid in cache) return cache[cid]; let r = null; try { const pl = A.bell.dayPlan(sec, null, cid || null); if (pl && !['holiday', 'off', 'none'].includes(pl.src)) { const x = pl.items.find(y => n >= y.from && n < y.to); if (x && x.k === 'p') r = { p: x.i }; else if (x && x.k === 'b') { const pv = pl.items.filter(y => y.k === 'p' && y.to <= x.from).pop(); r = { b: pv ? pv.i : -1 }; } } } catch (_) {} return (cache[cid] = r); };
    $$('table.tvg', el).forEach(t => { const tc = t.dataset.tc || '', hit = new Set();
      $$('[data-dp]', t).forEach(td => { const [d, p] = td.dataset.dp.split('|').map(Number); if (d !== dow) return; const r = st(td.dataset.c || tc); if (r && r.p === p) { td.classList.add('tv-now'); hit.add(p); } });
      $$('th[data-hp]', t).forEach(th => { if (th.dataset.hd != null && +th.dataset.hd !== dow) return; if (hit.has(+th.dataset.hp)) th.classList.add('tv-now'); });
      $$('th[data-hd]', t).forEach(th => { if (+th.dataset.hd === dow && !th.dataset.hp) th.classList.add('tv-today'); });
      $$('[data-bk]', t).forEach(b => { const r = st(b.dataset.c != null && b.tagName === 'TD' && b.dataset.c !== undefined ? (b.dataset.c || tc) : tc); if (r && r.b === +b.dataset.bk && (b.tagName === 'TH' || b.hasAttribute('rowspan') || $$('[data-dp]', b.parentElement).some(x => +x.dataset.dp.split('|')[0] === dow))) b.classList.add('tv-now'); }); });
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
    CUR_ROOT = root; const tool = $('#tvTool', root), body = $('#tvB', root), redraw = () => V.ttviews(root);
    const card = $('.tv-root', root), act = e => { const t = e.target.closest('[data-go],[data-kp],[data-np]'); if (!t || t.closest('[data-ed]')) return; e.preventDefault();
      if (t.dataset.kp) return kpModal(t.dataset.kp); if (t.dataset.np) return npModal(t.dataset.np); const [k, id] = t.dataset.go.split('|'); go(k, id); };
    card.addEventListener('click', act); card.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-go]:not(button)')) act(e); });
    const live = el => { markNow(el); const n0 = $('td.tv-now', el); if (n0) { const sc = n0.closest('.scroll'); if (sc && sc.scrollWidth > sc.clientWidth) { const r = n0.getBoundingClientRect(), q = sc.getBoundingClientRect(); sc.scrollLeft += (r.left + r.width / 2) - (q.left + q.width / 2); } } if (timer) clearInterval(timer); timer = setInterval(() => { if (!el.isConnected) { clearInterval(timer); timer = null; return; } markNow(el); }, 60000); };
    const bindEd = el => { $$('[data-ed]', el).forEach(td => { const go = () => { const [c, d, p] = td.dataset.ed.split('|'); A.slotDialog(c, +d, +p, async () => { await load(D.src); V.ttviews(root); }); }; td.onclick = go; td.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } }; }); live(el); };
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
      live(body); return;
    }
    if (v === 'assign') {
      const c = C(), aed = canEdit() && !!D.ver && st.aEd;
      tool.innerHTML = `<div class="row">${kpiHtml(true)}</div><div class="row"><div class="seg" role="group" aria-label="التخطيط"><button data-l="cards" class="${c.aLay !== 'table' ? 'on' : ''}">بطاقات</button><button data-l="table" class="${c.aLay === 'table' ? 'on' : ''}">جدول واحد</button></div>
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
      tool.innerHTML = `<div class="row">${kpiHtml(true)}</div><div class="row"><div class="seg" role="group" aria-label="نوع الكشاف"><button data-m="teacher" class="${m === 'teacher' ? 'on' : ''}">بالمعلم</button><button data-m="subject" class="${m === 'subject' ? 'on' : ''}">بالمادة</button><button data-m="matrix" class="${m === 'matrix' ? 'on' : ''}">مصفوفة الفصول × المواد</button></div>
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
    return Object.entries(G).map(([g, l]) => `<h4 class="tv-gh">${esc(g)}</h4><div class="tv-acards">${l.map(x => `<section class="tv-ac"><h3 data-go="class|${x.id}">${esc(x.name)}</h3>${aTable(x.id, ed)}</section>`).join('')}</div>`).join('');
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
      <fieldset class="tv-fs"><legend>محتوى الخلية</legend><div class="tv-cks"><label class="chk"><input type="checkbox" data-k="showS" ${c.showS ? 'checked' : ''}> اسم المادة</label><label class="chk"><input type="checkbox" data-k="showT" ${c.showT ? 'checked' : ''}> اسم المعلم</label><label class="chk"><input type="checkbox" data-k="tShort" ${c.tShort ? 'checked' : ''}> اسم المعلم مختصراً (الأول والأخير)</label><label class="chk"><input type="checkbox" data-k="abbr" ${c.abbr ? 'checked' : ''}> أسماء المواد مختصرة</label><label class="chk"><input type="checkbox" data-k="times" ${c.times ? 'checked' : ''}> أوقات الحصص</label><label class="chk"><input type="checkbox" data-k="color" ${c.color ? 'checked' : ''}> ألوان المواد</label><label class="chk"><input type="checkbox" data-k="brk" ${c.brk ? 'checked' : ''}> الفسح والصلاة بين الحصص</label><label class="chk"><input type="checkbox" data-k="nowMark" ${c.nowMark ? 'checked' : ''}> تمييز الحصة الحالية بالأخضر</label></div></fieldset>
      <fieldset class="tv-fs"><legend>الفصول الظاهرة <button type="button" class="btn ghost sm" data-all="c">الكل</button></legend><div class="tv-tg">${CL.map(x => `<label><input type="checkbox" data-c="${x.id}" ${c.hideC.includes(x.id) ? '' : 'checked'}><span>${esc(x.name)}</span></label>`).join('')}</div></fieldset>
      <fieldset class="tv-fs"><legend>المواد الظاهرة <button type="button" class="btn ghost sm" data-all="s">الكل</button></legend><div class="tv-tg">${SB.map(s => `<label style="--sc:${col(s)}"><input type="checkbox" data-s="${s}" ${c.hideS.includes(s) ? '' : 'checked'}><span>${esc(A.subjName(s))}</span></label>`).join('')}</div></fieldset>
      <div class="acts"><button class="btn" id="vOk">تطبيق</button></div>`, { cls: 'wide' });
    $$('[data-all]', m.el).forEach(b => b.onclick = () => { const k = b.dataset.all; const l = $$(`[data-${k}]`, m.el).filter(i => i.type === 'checkbox'); const on = l.some(i => !i.checked); l.forEach(i => i.checked = on); });
    $('#vOk', m.el).onclick = () => { const p = { hideC: $$('[data-c]', m.el).filter(i => i.type === 'checkbox' && !i.checked).map(i => i.dataset.c), hideS: $$('[data-s]', m.el).filter(i => i.type === 'checkbox' && !i.checked).map(i => i.dataset.s) }; $$('[data-k]', m.el).forEach(i => p[i.dataset.k] = i.checked); setLocal(p); m.close(); after && after(); };
  }

  // ---------- الطباعة الاحترافية ----------
  // OVR: تجاوز مؤقت للإعدادات أثناء بناء المطبوع (أعمدة الإسناد…)
  const GRID = { land: { 1: [1, 1], 2: [2, 1], 4: [2, 2], 6: [3, 2], 8: [4, 2], 9: [3, 3] }, port: { 1: [1, 1], 2: [1, 2], 4: [2, 2], 6: [2, 3], 8: [2, 4], 9: [3, 3] } };
  const WHAT = [['class', 'جداول الفصول'], ['teacher', 'جداول المعلمين'], ['assign', 'إسنادات الفصول'], ['index', 'الكشاف العام للإسنادات'], ['day', 'جدول اليوم العام (الفصول)'], ['dayT', 'جدول اليوم العام (المعلمون)'], ['master', 'الجدول العام للأسبوع (الفصول)'], ['masterT', 'الجدول العام للأسبوع (المعلمون)'], ['now', 'الحصص الجارية (لقطة)']];
  const TILE_OK = w => ['class', 'teacher', 'assign', 'index'].includes(w);
  function printDialog(v0) {
    const st = ST(), c = cfg(), CL = classes(), T = teachers(), P0 = (() => { try { return JSON.parse(A.LS.get('ttv_pr') || '{}'); } catch (_) { return {}; } })();
    const m = A.modal(`<h3>طباعة وتصدير احترافي</h3><p class="sub">${esc(verTxt())}</p>
      <div class="grid g2"><div class="field"><label for="pW">ماذا تطبع؟</label><select class="in" id="pW">${WHAT.map(([k, l]) => `<option value="${k}" ${k === (v0 === 'now' ? 'class' : v0) ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field" id="pWhoF"><label for="pWho">النطاق</label><select class="in" id="pWho"></select></div></div>
      <fieldset class="tv-fs" id="pLay"><legend>التخطيط والنسخ</legend><div class="grid g3">
        <div class="field"><label for="pPer">العدد في الورقة الواحدة</label><select class="in" id="pPer"></select></div>
        <div class="field"><label for="pCp">نسخ من كل بطاقة</label><select class="in" id="pCp">${[1, 2, 3, 4, 6].map(n => `<option value="${n}" ${+(P0.cp || 1) === n ? 'selected' : ''}>${AR(n)}</option>`).join('')}</select></div>
        <div class="field" id="pGF"><label class="chk" style="margin-top:26px"><input type="checkbox" id="pG" ${P0.g ? 'checked' : ''}> إضافة الجدول الأسبوعي للبطاقة</label></div></div>
        <div class="tv-cks" id="pCols"><span class="small muted">الأعمدة:</span><label class="chk"><input type="checkbox" data-pc="aN" ${c.aN ? 'checked' : ''}> عدد الحصص</label><label class="chk"><input type="checkbox" data-pc="aT" ${c.aT ? 'checked' : ''}> المعلم</label><label class="chk"><input type="checkbox" data-pc="aTot" ${c.aTot ? 'checked' : ''}> المجموع</label><label class="chk"><input type="checkbox" data-pc="aNone" ${c.aNone ? 'checked' : ''}> المواد بلا معلم</label><label class="chk"><input type="checkbox" data-pc="showT" ${c.showT ? 'checked' : ''}> المعلم في الجدول</label></div>
        <p class="small muted" id="pHint" style="margin:4px 0 0"></p></fieldset>
      <fieldset class="tv-fs"><legend>النمط</legend><div class="tv-opts">${Object.entries(STYLES).map(([k, [l]]) => `<label class="tv-op sm"><input type="radio" name="pS" value="${k}" ${c.style === k ? 'checked' : ''}><span class="tv-sw st-${k}" aria-hidden="true"><i></i><i></i><i></i></span><b>${l}</b></label>`).join('')}</div></fieldset>
      <div class="grid g2"><div class="field"><label>اللون</label><div class="tv-opts">${Object.entries(THEMES).map(([k, [l, a, b2]]) => `<label class="tv-op xs" title="${l}"><input type="radio" name="pC" value="${k}" ${c.theme === k ? 'checked' : ''}><span class="tv-dot" style="background:linear-gradient(135deg,${a} 55%,${b2} 55%)"></span><span class="sr">${l}</span></label>`).join('')}</div></div>
        <div class="field"><label for="pO">الاتجاه</label><select class="in" id="pO"><option value="land" ${(P0.o || c.orient) !== 'port' ? 'selected' : ''}>أفقي</option><option value="port" ${(P0.o || c.orient) === 'port' ? 'selected' : ''}>عمودي</option></select></div></div>
      <div class="tv-cks"><label class="chk"><input type="checkbox" id="pSt" ${c.stamp ? 'checked' : ''}> ختم «معتمد»</label><label class="chk"><input type="checkbox" id="pSg" checked> التوقيعات</label><label class="chk"><input type="checkbox" id="pCut" ${P0.cut === false ? '' : 'checked'}> خطوط قصّ بين البطاقات</label></div>
      <div class="tv-prev"><div class="tv-prev-h"><b>المعاينة</b><span class="tv-pn"><button type="button" class="btn ghost sm" id="pPv" aria-label="الصفحة السابقة">‹</button><span id="pCnt" class="small" aria-live="polite"></span><button type="button" class="btn ghost sm" id="pNx" aria-label="الصفحة التالية">›</button></span></div><div class="tv-prev-b"><iframe id="pFr" title="معاينة الطباعة"></iframe></div></div>
      <div class="acts tv-exp"><button class="btn" id="pGo">🖨️ طباعة</button><button class="btn sky" id="pPdf">📄 تنزيل PDF</button><button class="btn ghost" id="pDoc">📝 Word منسّق</button><button class="btn ghost" id="pPng">🖼️ صورة الصفحة</button></div>`, { cls: 'wide xl' });
    const q = s => m.el.querySelector(s); let pg = 0, LAST = null;
    const fillWho = () => { const w = q('#pW').value, o = w === 'class' || w === 'assign' ? [['*', 'كل الفصول'], ...CL.map(x => [x.id, x.name])] : w === 'teacher' ? [['*', 'كل المعلمين'], ...T.map(t => [t.id, tN(t.id)])] : (w === 'day' || w === 'dayT') ? [['*', 'كل الأيام'], ...Array.from({ length: nd() }, (_, d) => [String(d), DAYS[d]])] : w === 'index' ? [['teacher', 'بالمعلم'], ['subject', 'بالمادة'], ['matrix', 'مصفوفة الفصول × المواد']] : [];
      q('#pWhoF').style.display = o.length ? '' : 'none'; const cur = w === 'class' ? (st.cid || '*') : w === 'teacher' ? (st.tid || '*') : w === 'index' ? c.iMode : '*';
      q('#pWho').innerHTML = o.map(([k, l]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(l)}</option>`).join(''); layOpts(); };
    const layOpts = () => { const w = q('#pW').value, who = q('#pWho').value, tile = TILE_OK(w) && !(w === 'index' && who === 'matrix'), rep = w === 'assign' || w === 'index';
      q('#pLay').style.display = tile ? '' : 'none'; const cur = q('#pPer').value || String(P0.per != null ? P0.per : (rep ? 0 : 1));
      q('#pPer').innerHTML = (rep ? [['0', 'تقرير متصل (كل الفصول معاً)']] : []).concat([1, 2, 4, 6, 8, 9].map(n => [String(n), n === 1 ? 'بطاقة واحدة (صفحة كاملة)' : `${AR(n)} في الورقة`])).map(([v, l]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${l}</option>`).join('');
      if (!q('#pPer').value) q('#pPer').selectedIndex = 0;
      const per = +q('#pPer').value; q('#pCp').disabled = per === 0; q('#pGF').style.display = (w === 'assign' || (w === 'index' && who === 'teacher')) && per !== 0 ? '' : 'none';
      q('#pCols').style.display = rep || w === 'class' ? '' : 'none';
      q('#pHint').textContent = per === 0 ? 'التقرير المتصل يجمع كل البطاقات في صفحات متتالية.' : `كل ${w === 'teacher' || (w === 'index' && who === 'teacher') ? 'معلم' : w === 'index' ? 'مادة' : 'فصل'} في بطاقة مستقلة بالشعار والتوقيع — مناسبة للتعليق على باب الفصل أو التسليم للمعلم.`; };
    const opt = () => { const o = { w: q('#pW').value, who: q('#pWho').value, style: (m.el.querySelector('[name=pS]:checked') || {}).value, theme: (m.el.querySelector('[name=pC]:checked') || {}).value, orient: q('#pO').value, stamp: q('#pSt').checked, sig: q('#pSg').checked, cut: q('#pCut').checked, per: q('#pLay').style.display === 'none' ? 1 : +q('#pPer').value, cp: +q('#pCp').value || 1, g: q('#pG').checked, cols: {} };
      $$('[data-pc]', m.el).forEach(i => o.cols[i.dataset.pc] = i.checked); A.LS.set('ttv_pr', JSON.stringify({ per: o.per, cp: o.cp, g: o.g, o: o.orient, cut: o.cut })); return o; };
    let tmr = null; const prev = (keep) => { clearTimeout(tmr); tmr = setTimeout(() => { const o = opt(); LAST = { o, P: pages(o) }; if (!keep) pg = 0; pg = Math.min(pg, LAST.P.pages.length - 1); q('#pCnt').textContent = `صفحة ${AR(pg + 1)} من ${AR(LAST.P.pages.length)}`; q('#pPv').disabled = pg <= 0; q('#pNx').disabled = pg >= LAST.P.pages.length - 1; renderFrame(q('#pFr'), LAST.P.pages.slice(pg, pg + 1), o, true); }, 120); };
    q('#pW').onchange = () => { q('#pPer').value = ''; fillWho(); prev(); }; q('#pWho').onchange = () => { layOpts(); prev(); }; q('#pPer').onchange = () => { layOpts(); prev(); };
    m.el.querySelectorAll('input,#pO,#pCp').forEach(i => i.addEventListener('change', () => prev()));
    q('#pPv').onclick = () => { pg = Math.max(0, pg - 1); prev(true); }; q('#pNx').onclick = () => { pg++; prev(true); };
    fillWho(); prev();
    const full = async () => { const o = opt(), P = pages(o), f = document.createElement('iframe'); f.style.cssText = 'position:fixed;left:-9999px;top:0;width:1200px;height:900px;border:0'; document.body.appendChild(f); await renderFrame(f, P.pages, o, false); return { f, o, P }; };
    q('#pGo').onclick = async () => { const { f } = await full(); f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 5000); };
    q('#pPdf').onclick = e => A.run(e.currentTarget, async () => { const { f, o } = await full(); try { await toPdf(f.contentDocument, o, fileName(o) + '.pdf'); A.toast('نُزّل ملف PDF', 'ok'); } finally { f.remove(); } });
    q('#pDoc').onclick = e => A.run(e.currentTarget, async () => { const { f, o } = await full(); try { toWord(f.contentDocument, o, fileName(o) + '.doc'); A.toast('نُزّل ملف Word', 'ok'); } finally { f.remove(); } });
    q('#pPng').onclick = e => A.run(e.currentTarget, async () => { if (!window.html2canvas) throw new Error('مكتبة الصور غير محمّلة'); const el = q('#pFr').contentDocument.querySelector('.pg'); const z = el.ownerDocument.body.style.zoom; el.ownerDocument.body.style.zoom = 1; try { const cv = await html2canvas(el, { scale: 2, backgroundColor: '#fff' }); A.download(await new Promise(r => cv.toBlob(r, 'image/png')), fileName(opt()) + '.png'); } finally { el.ownerDocument.body.style.zoom = z; } });
  }
  const fileName = o => `${(WHAT.find(x => x[0] === o.w) || [])[1] || 'الجداول'} — ${A.section().name}`.replace(/[\\/:*?"<>|]/g, '-');
  // بطاقات مستقلة: [{who, sub, body}]
  function items(o) {
    const CL = classes(), T = teachers(), one = (l, id) => id === '*' ? l : l.filter(x => x.id === id);
    if (o.w === 'class') return one(CL, o.who).map(c => { const a = assignOf(c.id); return { who: `جدول فصل: ${c.name}`, sub: `${A.cnt(a.reduce((x, r) => x + r.n, 0), 'حصة', 'حصص')} · ${A.cnt(a.length, 'مادة', 'مواد')}`, body: gClass(c.id, false) }; });
    if (o.w === 'teacher') return one(T, o.who).map(t => { const l = tLoad(t.id); return { who: `جدول المعلم: ${tN(t.id)}`, sub: `النصاب ${AR(l.n)} حصة · ${A.cnt(l.cls, 'فصل', 'فصول')} · ${A.cnt(l.sub, 'مادة', 'مواد')}`, body: gTeacher(t.id, false) }; });
    if (o.w === 'assign') return one(CL, o.who).map(c => { const a = assignOf(c.id); return { who: `إسناد فصل: ${c.name}`, sub: `${A.cnt(a.length, 'مادة', 'مواد')} · ${A.cnt(a.reduce((x, r) => x + r.n, 0), 'حصة', 'حصص')}`, body: aTable(c.id, false) + (o.g ? gClass(c.id, false) : '') }; });
    if (o.w === 'index' && o.who === 'subject') return subjects().filter(s => !C().hideS.includes(s)).map(sid => { const l = D.L.filter(s => s.subject_id === sid), by = {}; l.forEach(s => { const k = s.teacher_id || ''; (by[k] = by[k] || {}); by[k][s.class_id] = (by[k][s.class_id] || 0) + 1; });
      return { who: `إسناد مادة: ${A.subjName(sid)}`, sub: `${A.cnt(l.length, 'حصة', 'حصص')} أسبوعياً`, body: `<table class="tvg tvg-a"><thead><tr><th>المعلم</th><th>الفصول</th>${C().aN ? '<th class="nn">الحصص</th>' : ''}</tr></thead><tbody>${Object.entries(by).map(([t, cl]) => `<tr><td><b>${t ? esc(tN(t)) : '<span class="tv-no">بلا معلم</span>'}</b></td><td class="chips">${Object.entries(cl).map(([cid, n]) => `<span>${esc(cN(cid))}<small>${AR(n)}</small></span>`).join('')}</td>${C().aN ? `<td class="nn tot">${AR(Object.values(cl).reduce((a, b) => a + b, 0))}</td>` : ''}</tr>`).join('')}</tbody></table>` }; });
    if (o.w === 'index') return idxTeacher().T.map(t => ({ who: `إسناد المعلم: ${tN(t.id)}`, sub: `النصاب ${AR(t.n)} حصة · ${A.cnt(t.nc, 'فصل', 'فصول')}`,
      body: `<table class="tvg tvg-a"><thead><tr><th>المادة</th><th>الفصول</th>${C().aN ? '<th class="nn">الحصص</th>' : ''}</tr></thead><tbody>${Object.entries(t.by).map(([sid, cl]) => `<tr><td class="sb" style="--sc:${col(sid)}"><b>${esc(sN(sid))}</b></td><td class="chips">${Object.entries(cl).map(([cid, n]) => `<span>${esc(cN(cid))}<small>${AR(n)}</small></span>`).join('')}</td>${C().aN ? `<td class="nn">${AR(Object.values(cl).reduce((a, b) => a + b, 0))}</td>` : ''}</tr>`).join('')}</tbody>${C().aTot ? `<tfoot><tr><td>المجموع</td><td>${A.cnt(t.nc, 'فصل', 'فصول')}</td>${C().aN ? `<td class="nn">${AR(t.n)}</td>` : ''}</tr></tfoot>` : ''}</table>` + (o.g ? gTeacher(t.id, false) : '') }));
    return [];
  }
  // صفحات الطباعة: [{who, sub, body, kind:'grid'|'flow'}] أو {tiles:[…], kind:'grid'}
  function pages(o) {
    OVR = o.cols && Object.keys(o.cols).length ? o.cols : null;
    try {
      const P = [], CL = classes(), byStage = l => { const G = {}; l.forEach(x => (G[stg(x)] = G[stg(x)] || []).push(x)); return G; };
      const tile = TILE_OK(o.w) && !(o.w === 'index' && o.who === 'matrix') && o.per > 0;
      if (tile && (o.per > 1 || o.cp > 1 || o.w === 'assign' || o.w === 'index')) { const L = items(o).flatMap(x => Array.from({ length: Math.max(1, o.cp) }, () => x)); for (let i = 0; i < L.length; i += o.per) P.push({ tiles: L.slice(i, i + o.per), n: o.per, kind: 'grid' }); return { pages: P }; }
      if (tile) return { pages: items(o).map(x => ({ ...x, kind: 'grid' })) };
      if (o.w === 'day' || o.w === 'dayT') (o.who === '*' ? Array.from({ length: nd() }, (_, d) => d) : [+o.who]).forEach(d => P.push({ who: `جدول يوم ${DAYS[d]}`, sub: o.w === 'dayT' ? 'جدول المعلمين' : 'جدول الفصول', body: gDay(d, o.w === 'dayT' ? 'teacher' : 'class', false), kind: 'grid' }));
      else if (o.w === 'master' || o.w === 'masterT') P.push({ who: o.w === 'masterT' ? 'الجدول العام للمعلمين' : 'الجدول العام للفصول', sub: 'الأسبوع كاملاً', body: gMaster(o.w === 'masterT' ? 'teacher' : 'class'), after: o.w === 'masterT' ? legendC() + legend() : legend(), kind: 'grid' });
      else if (o.w === 'assign') { const l = o.who === '*' ? CL : CL.filter(c => c.id === o.who); const G = byStage(l); P.push({ who: 'إسنادات الفصول', sub: `${A.cnt(l.length, 'فصل', 'فصول')} · ${A.cnt(new Set(D.L.filter(s => vis(s) && l.some(c => c.id === s.class_id)).map(s => s.teacher_id).filter(Boolean)).size, 'معلم', 'معلمين')}`, body: kpiHtml() + Object.entries(G).map(([g, cl]) => `<h4 class="tv-gh">${esc(g)}</h4><div class="tv-acards">${cl.map(x => `<section class="tv-ac"><h3>${esc(x.name)}</h3>${aTable(x.id, false)}</section>`).join('')}</div>`).join(''), kind: 'flow' }); }
      else if (o.w === 'index') { const mode = o.who; const t = mode === 'subject' ? idxSubject() : mode === 'matrix' ? idxMatrix() : idxTeacher().html; P.push({ who: 'الكشاف العام للإسنادات', sub: mode === 'subject' ? 'حسب المادة' : mode === 'matrix' ? 'مصفوفة الفصول × المواد' : 'حسب المعلم', body: (mode === 'matrix' ? '' : kpiHtml()) + t, kind: mode === 'matrix' ? 'grid' : 'flow' }); }
      else if (o.w === 'now') { const r = nowHtml(ST()); P.push({ who: 'الحصص الجارية', sub: '', body: r.html.replace(/<details[^>]*>/, '<div class="tv-free">').replace('</details>', '</div>').replace(/<summary>/, '<div>').replace('</summary>', '</div>').replace(/<button type="button"[^>]*>/g, '<span>').replace(/<\/button>/g, '</span>'), kind: 'flow' }); }
      return { pages: P };
    } finally { OVR = null; }
  }
  function pageHtml(p, o) {
    const c = cfg(), sec = A.section(), [, a, b, pl] = THEMES[o.theme] || THEMES.navy, port = o.orient === 'port';
    const vars = `--a:${o.style === 'eco' ? '#111' : a};--b:${o.style === 'eco' ? '#555' : b};--p:${o.style === 'eco' ? '#f3f3f3' : pl};--fs:${c.fs / 100}`, cls = `tvp s-${o.style}${c.color && o.style !== 'eco' ? '' : ' nocol'}`, logo = `assets/${o.style === 'formal' ? 'logo_white' : 'logo'}.svg`;
    const stampSvg = `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="55" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="60" cy="60" r="44" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="3 3"/><text x="60" y="56" text-anchor="middle" font-size="22" font-weight="800" fill="currentColor">معتمد</text><text x="60" y="76" text-anchor="middle" font-size="9.5" fill="currentColor">${esc((S.school.name || '').slice(0, 26))}</text><text x="60" y="90" text-anchor="middle" font-size="8.5" fill="currentColor">${esc(D.ver && D.ver.approved_at ? D.ver.approved_at.slice(0, 10) : '')}</text></svg>`;
    if (p.tiles) { const [gc, gr] = (GRID[port ? 'port' : 'land'][p.n] || [1, 1]), ts = p.n >= 8 ? 0.62 : p.n >= 6 ? 0.7 : p.n >= 4 ? 0.8 : p.n >= 2 ? 0.92 : 1;
      const sig = o.sig && c.sig.length ? `<div class="tl-sig">${c.sig.slice(0, p.n >= 6 ? 2 : 3).map(s => `<span><b>${esc(s.t)}</b>${esc(s.n) ? ' ' + esc(s.n) : ''}: ........</span>`).join('')}</div>` : '<div></div>';
      return `<div class="pg ${port ? 'port' : 'land'} grid tiles"><div class="${cls} tlp" style="${vars};--ts:${ts}"><div class="tl-grid${o.cut ? ' cut' : ''}" style="grid-template-columns:repeat(${gc},minmax(0,1fr));grid-template-rows:repeat(${gr},minmax(0,1fr))">${p.tiles.map(x => `<div class="tl">
        <div class="tl-h"><img src="${logo}" alt=""><div><b>${esc(c.title)}</b><small>${esc(S.school.name || '')} · ${esc(sec.name)}</small></div></div>
        <div class="tvp-who"><b>${esc(x.who)}</b>${x.sub ? `<span>${esc(x.sub)}</span>` : ''}</div><div class="tvp-b"><div class="fitw">${x.body}</div></div>
        <div class="tl-f">${sig}${o.stamp && D.ver ? `<div class="tl-stamp">${stampSvg}</div>` : ''}</div></div>`).join('')}</div></div></div>`; }
    const sig = o.sig && c.sig.length ? `<div class="tvp-sig">${c.sig.map(s => `<div><span>${esc(s.t)}</span><b>${esc(s.n) || '&nbsp;'}</b><i>التوقيع: ..................</i></div>`).join('')}</div>` : '<div></div>';
    return `<div class="pg ${port ? 'port' : 'land'} ${p.kind}"><div class="${cls}" style="${vars}">
      <header class="tvp-h"><img src="${logo}" alt="${esc(S.school.name || '')}"><div class="tvp-t"><h1>${esc(c.title)}</h1><p>${esc(sec.name)} · ${esc(verTxt())}</p></div><div class="tvp-m">${c.date ? `طُبع: ${esc(A.arDate ? A.arDate(today()) : today())}` : ''}</div></header>
      <div class="tvp-who"><b>${esc(p.who)}</b>${p.sub ? `<span>${esc(p.sub)}</span>` : ''}</div><div class="tvp-b"><div class="fitw">${p.body}</div></div>${p.after || ''}
      <footer class="tvp-f">${sig}${o.stamp && D.ver ? `<div class="tvp-stamp" aria-hidden="true">${stampSvg}</div>` : ''}</footer><div class="tvp-band"><span>${esc(c.foot)}</span><span>${esc(S.school.name || '')}</span></div></div></div>`;
  }
  function renderFrame(f, P, o, preview) {
    const base = location.href.split('#')[0].replace(/[^/]*$/, ''), d = f.contentDocument, port = o.orient === 'port';
    d.open(); d.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><base href="${base}"><title>${esc(cfg().title)}</title><style>${FONT}@page{size:A4 ${port ? 'portrait' : 'landscape'};margin:0}html,body{margin:0;background:${preview ? '#E9EEF5' : '#fff'}}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}${PCSS}${preview ? '.pg{margin:0 auto;box-shadow:0 6px 24px #0002}' : ''}</style></head><body>${P.map(p => pageHtml(p, o)).join('') || '<p style="padding:40px;font-family:sans-serif">لا يوجد ما يُطبع</p>'}</body></html>`); d.close();
    const imgs = [...d.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }));
    return Promise.race([Promise.all([d.fonts ? d.fonts.ready : 0, ...imgs]), new Promise(r => setTimeout(r, 2500))]).then(() => { fit(d); if (preview) { const pg = d.querySelector('.pg'); if (pg) { const W = f.parentElement.clientWidth || 600, s = Math.min(1, (W - 8) / pg.offsetWidth); d.body.style.zoom = s; f.style.height = Math.ceil(pg.offsetHeight * s + 8) + 'px'; } } });
  }
  // ملاءمة المحتوى لمساحته: تصغير ما يفيض، ومدّ الجدول الوحيد رأسياً ليملأ المساحة
  function fit(d) { d.querySelectorAll('.pg.grid .tvp-b').forEach(b => { const t = b.firstElementChild; if (!t) return; t.style.zoom = 1; const W = b.clientWidth, H = b.clientHeight, w = t.scrollWidth, h = t.scrollHeight; if (!w || !h) return; const s = Math.min(1, W / w, H / h);
    if (s < 1) { t.style.zoom = Math.max(0.25, s * 0.98).toFixed(3); return; } const tb = t.children.length === 1 && t.firstElementChild.tagName === 'TABLE' ? t.firstElementChild : null; if (tb && !tb.classList.contains('tvg-a')) tb.style.height = Math.floor(H * 0.95) + 'px'; }); }
  // تنزيل PDF مباشر: كل صفحة صورة عالية الدقة، والصفحات المتصلة الطويلة تُقسَّم على A4
  async function toPdf(d, o, name) {
    if (!window.html2canvas || !window.jspdf) throw new Error('مكتبات PDF غير محمّلة');
    const port = o.orient === 'port', W = port ? 210 : 297, H = port ? 297 : 210, pdf = new window.jspdf.jsPDF({ orientation: port ? 'p' : 'l', unit: 'mm', format: 'a4' }); let first = true;
    for (const pg of d.querySelectorAll('.pg')) { const cv = await html2canvas(pg, { scale: 2, backgroundColor: '#ffffff', windowWidth: pg.scrollWidth }); const ph = Math.round(cv.width * H / W);
      for (let y = 0; y < cv.height - 4; y += ph) { const sl = document.createElement('canvas'); sl.width = cv.width; sl.height = Math.min(ph, cv.height - y); sl.getContext('2d').drawImage(cv, 0, y, cv.width, sl.height, 0, 0, cv.width, sl.height);
        if (!first) pdf.addPage('a4', port ? 'p' : 'l'); first = false; pdf.addImage(sl.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, W, W * sl.height / cv.width); } }
    pdf.save(name);
  }
  // Word منسّق: ينسخ الأنماط المحسوبة إلى كل عنصر لأن Word لا يفهم متغيرات CSS
  function toWord(d, o, name) {
    const port = o.orient === 'port', win = d.defaultView, PROPS = ['background-color', 'color', 'font-weight', 'font-size', 'text-align', 'vertical-align', 'border-top', 'border-bottom', 'border-left', 'border-right', 'padding', 'width'];
    const inl = el => { [el, ...el.querySelectorAll('*')].forEach(x => { const cs = win.getComputedStyle(x); let st = PROPS.map(p => { let v = cs.getPropertyValue(p); if (p === 'width' && !/^T[DH]$/.test(x.tagName)) return ''; if (p === 'background-color' && /rgba\(0, 0, 0, 0\)/.test(v)) return ''; return v ? `${p}:${v}` : ''; }).filter(Boolean).join(';'); const bi = cs.getPropertyValue('border-inline-start-width'); if (x.classList.contains('sb') && parseFloat(bi)) st += `;border-right:6px solid ${cs.getPropertyValue('border-inline-start-color')}`; x.setAttribute('style', st + ';font-family:Tajawal,Arial'); }); };
    const out = []; d.querySelectorAll('.pg').forEach((pg, i) => { const blocks = pg.querySelectorAll('.tl').length ? [...pg.querySelectorAll('.tl')] : [pg]; blocks.forEach((bl, j) => { const who = bl.querySelector('.tvp-who'), body = bl.querySelector('.fitw'); if (!body) return; const cl = body.cloneNode(true); body.parentNode.insertBefore(cl, body); cl.style.zoom = 1; inl(cl); const h = cl.outerHTML; cl.remove(); out.push(`${out.length ? '<br clear=all style="page-break-before:always">' : ''}<p style="font-size:16pt;font-weight:bold;color:${(THEMES[o.theme] || THEMES.navy)[1]};margin:0 0 4pt">${esc(cfg().title)} — ${esc(S.school.name || '')}</p><p style="color:#475569;margin:0 0 8pt">${esc(A.section().name)} · ${esc(verTxt())}</p>${who ? `<p style="font-size:13pt;font-weight:bold;margin:6pt 0">${esc(who.textContent.trim())}</p>` : ''}${h}<p style="margin-top:14pt">${cfg().sig.map(s => `${esc(s.t)}: ${esc(s.n)} ...............`).join('&nbsp;&nbsp;&nbsp;&nbsp;')}</p>`); }); });
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(cfg().title)}</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>90</w:Zoom></w:WordDocument></xml><![endif]--><style>@page Section1{size:${port ? '595.3pt 841.9pt' : '841.9pt 595.3pt'};mso-page-orientation:${port ? 'portrait' : 'landscape'};margin:1.5cm}div.Section1{page:Section1}body{direction:rtl;font-family:Tajawal,Arial}table{border-collapse:collapse;width:100%;direction:rtl}td,th{border:1px solid #CBD5E1}</style></head><body dir="rtl"><div class="Section1">${out.join('')}</div></body></html>`;
    A.download(new Blob(['﻿' + html], { type: 'application/msword' }), name);
  }
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
  .tv-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:8px;width:100%}.tv-kpi>div,.tv-kpi>button{background:var(--p,#E4EBF5);border-radius:12px;padding:8px 12px;display:flex;flex-direction:column;border-inline-start:4px solid var(--b,#3AB1DB)}.tv-kpi b{font-size:1.45em;color:var(--a,#082B5A);line-height:1.1}.tv-kpi span{font-size:.85em;color:#475569}.tv-kpi .bad{border-color:#DC2626}.tv-kpi .bad b{color:#B42318}
  .tv-gh{margin:14px 0 6px;color:var(--a,#082B5A);font-size:1.05em;border-bottom:2px solid var(--b,#3AB1DB);padding-bottom:3px}
  .tv-acards{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:12px}.tv-ac{border:1px solid #D5DEEA;border-radius:14px;overflow:hidden;break-inside:avoid;background:#fff}.tv-ac h3{margin:0;padding:8px 12px;background:var(--a,#082B5A);color:#fff;font-size:1.05em}.tv-ac .tvg{font-size:calc(12.5px*var(--fs,1))}.tv-ac .tvg th,.tv-ac .tvg td{border-left:0;border-right:0}.tv-ac .tvg thead th{background:var(--p,#E4EBF5);color:var(--a,#082B5A)}
  .tv-leg{display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;font-size:.82em;color:#334155}.tv-leg span{display:inline-flex;align-items:center;gap:5px}.tv-leg i{width:14px;height:14px;border-radius:4px;background:var(--sc);border:1px solid #0001}
  .tvg .bk{width:30px;min-width:30px;padding:2px 1px;background:repeating-linear-gradient(135deg,#FFF6E5 0 6px,#FFEDCC 6px 12px);color:#8A5300;font-weight:800}.tvg .bk span{writing-mode:vertical-rl;transform:rotate(180deg);display:inline-block;white-space:nowrap;font-size:.82em;line-height:1.1}.tvg thead th.bk{background:#E8962E;color:#fff}.tvg thead th.bk small{writing-mode:vertical-rl;transform:rotate(180deg);display:inline-block;direction:ltr;font-size:.7em}.tvg .bk.none{background:#FAFAFA}.tvg-d .bk.sm span{font-size:.75em}
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
  .fitw{width:100%}.fitw>*+*{margin-top:8px}
  .pg.tiles .tlp{padding:6mm;height:100%}.tl-grid{display:grid;gap:5mm;height:100%}.tl-grid.cut{gap:8mm}
  .tl{position:relative;display:flex;flex-direction:column;min-height:0;min-width:0;overflow:hidden;background:#fff;border:1.5px solid var(--a);border-radius:12px;padding:3.2mm;font-size:calc(12.5px*var(--fs)*var(--ts));box-shadow:inset 0 4px 0 var(--b)}
  .tl-grid.cut .tl::after{content:"";position:absolute;inset:-4.5mm;border:1px dashed #94A3B8;border-radius:14px;pointer-events:none}
  .tl-h{display:flex;align-items:center;gap:8px;padding:2px 0 5px;border-bottom:2px solid var(--a)}.tl-h img{height:calc(30px*var(--ts));flex:none}.tl-h b{display:block;color:var(--a);font-size:1.12em;line-height:1.15}.tl-h small{color:#64748B;font-size:.8em}
  .s-formal .tl-h{background:var(--a);margin:-3.2mm -3.2mm 0;padding:2.5mm 3.2mm;border-radius:10px 10px 0 0;border:0;box-shadow:inset 0 -3px 0 var(--b)}.s-formal .tl-h b,.s-formal .tl-h small{color:#fff}.s-formal .tl{box-shadow:none}
  .s-modern .tl{border:0;background:linear-gradient(#fff,#fff) padding-box,linear-gradient(135deg,var(--a),var(--b)) border-box;border:2px solid transparent}.s-modern .tl-h{border-bottom:0;background:var(--p);border-radius:9px;padding:4px 8px}
  .s-eco .tl{box-shadow:none;border-color:#111}.s-eco .tl-h{border-color:#111}
  .tl .tvp-who{margin:5px 0 4px;gap:8px;flex-wrap:wrap}.tl .tvp-who b{font-size:1.08em;padding:3px 11px;border-radius:8px}.tl .tvp-who span{font-size:.85em}
  .tl .tvp-b{flex:1;min-height:0;overflow:hidden;display:block}.tl .tvg{font-size:1em}.tl .tvg-w{font-size:.9em}
  .tl-f{display:flex;justify-content:space-between;align-items:flex-end;gap:6px;border-top:1px solid #E2E8F0;padding-top:3px;margin-top:3px;font-size:.78em;color:#334155}.tl-sig{display:flex;flex-wrap:wrap;gap:4px 14px}.tl-sig b{color:var(--a)}.tl-stamp{color:var(--b);width:calc(46px*var(--ts));height:calc(46px*var(--ts));transform:rotate(-12deg);flex:none}.tl-stamp svg{width:100%;height:100%}
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
    .tv-root td.tv-now{position:relative;outline:3px solid #2E8B57;outline-offset:-3px;background:linear-gradient(#DFF3E4,#DFF3E4)!important;box-shadow:0 0 0 3px #BADF93,0 6px 18px #2e8b5740;z-index:2;animation:tvPulse 2s ease-in-out infinite}
    .tv-root td.tv-now::before{content:"● الآن";position:absolute;top:-9px;inset-inline-start:50%;transform:translateX(50%);background:#2E8B57;color:#fff;font-size:10.5px;font-weight:800;border-radius:99px;padding:0 7px;line-height:16px;white-space:nowrap;box-shadow:0 2px 6px #0003}
    .tv-root .tvg-m td.tv-now::before{content:"●";padding:0 4px}
    .tv-root th.tv-now{background:#2E8B57!important;color:#fff!important;box-shadow:inset 0 -4px 0 #BADF93}.tv-root th.tv-today{background:#E3F4E8!important;color:#1F5E3A!important;box-shadow:inset -4px 0 0 #2E8B57}
    .tv-root .tvg .bk.tv-now{background:#F59E0B!important;color:#fff;outline:3px solid #B45309;outline-offset:-3px;animation:tvPulse 2s ease-in-out infinite}
    @keyframes tvPulse{50%{box-shadow:0 0 0 6px #BADF9399,0 6px 18px #2e8b5740}}
    .tv-root [data-go]{cursor:pointer}.tv-root th.rh[data-go]:hover,.tv-root .tv-ac h3[data-go]:hover{text-decoration:underline}.tv-root .chips span[data-go]:hover{border-color:var(--sky);background:#E6F5FB}.tv-root td.tn b[data-go]:hover{color:var(--sky);text-decoration:underline}
    .tv-kpi.act>button{font:inherit;text-align:start;cursor:pointer;border:0;border-inline-start:4px solid var(--b,#3AB1DB);transition:transform .12s,box-shadow .12s;position:relative}.tv-kpi.act>button::after{content:"‹";position:absolute;inset-inline-end:10px;top:50%;transform:translateY(-50%);opacity:.45;font-size:20px}
    .tv-kpi.act>button:hover{transform:translateY(-2px);box-shadow:0 8px 18px #082b5a26}.tv-kpi.act>button:focus-visible{outline:3px solid var(--sky);outline-offset:2px}
    .tv-kpi.sm.act>button{color:#fff;background:#ffffff1f;border-radius:12px;padding:6px 26px 6px 12px;display:flex;flex-direction:column;min-width:96px;border-inline-start-color:var(--sky)}.tv-kpi.sm.act>button:hover{background:#ffffff38}.tv-kpi.sm.act>button.bad{border-inline-start-color:#FCA5A5;background:#ffffff2e}.tv-kpi.sm.act>button.bad b{color:#FECACA}
    .tv-nc[data-go]:focus-visible{outline:3px solid var(--sky);outline-offset:2px}.tv-chips button{font:inherit;border:1px solid #CBD5E1;border-radius:99px;padding:3px 11px;font-size:13px;background:#F8FAFC;cursor:pointer;min-height:32px}.tv-chips button:hover{border-color:var(--sky);background:#E6F5FB}
    .tv-lnk{font:inherit;background:none;border:0;padding:2px 0;color:var(--blue,#005499);font-weight:800;cursor:pointer;text-decoration:underline dotted;text-underline-offset:3px;min-height:28px}.tv-lnk:hover{color:var(--sky)}.tv-lm .tvg-l{min-width:0}.tv-lm .tvg td{font-size:13.5px}
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
    .tv-prev{border:1px solid var(--line,#E2E8F0);border-radius:14px;overflow:hidden;margin-top:10px}.tv-prev-h{display:flex;justify-content:space-between;align-items:center;padding:6px 12px;background:#F1F5F9}.tv-pn{display:inline-flex;align-items:center;gap:6px}.tv-pn .btn{min-width:36px;min-height:34px}.tv-exp{flex-wrap:wrap}.tv-root+*{}.tv-prev-b{background:#E9EEF5;padding:4px}.tv-prev iframe{width:100%;border:0;height:420px;display:block;background:#E9EEF5}
    [data-th="depth"] .tv-sheet{box-shadow:0 1px 0 #fff inset,0 14px 30px #082b5a1f}[data-th="glass"] .tv-sheet{background:#ffffffcc;backdrop-filter:blur(6px)}
    @media (max-width:600px){.tv-tabs{flex-wrap:nowrap;overflow-x:auto}.tv-acts{width:100%}.tv-acts .btn{flex:1 1 auto}.tv-tabs button{font-size:13px;padding:7px 10px}.tv-acards{grid-template-columns:1fr}.tv-ncs{grid-template-columns:1fr 1fr}.tv-nc{padding:8px}.tv-ns b{font-size:15px}.tv-now-h{padding:12px}.tv-kpi.sm>div{min-width:72px;padding:6px 8px}.tv-op{min-width:calc(50% - 8px)}}
    @media (prefers-reduced-motion:reduce){.tv-nc,.tv-root [data-ed],.tv-kpi.act>button{transition:none}.tv-nc:hover,.tv-kpi.act>button:hover{transform:none}.tv-root .tv-now{animation:none!important}}`;
    document.head.appendChild(s);
  }
  A.ttViews = { load, pages: o => pages(o), D };
})();
