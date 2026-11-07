/* منصة دينا — «المصادر» مخزن المدرسة الواحد
   كل رابط أو ملف يُضاف في التحضير (السريع أو الكامل) أو في مكتبة المدرسة يُحفظ هنا تلقائياً مربوطاً بالمادة والصف والدرس والحصص،
   فيظهر في صفحة «المصادر» وفي تحضير الدرس نفسه لدى المعلمين، ويُختار منه بضغطة بدل الرفع من جديد.
   صفحة «المصادر» تبقى للتصفح والبحث: مصادر المدرسة · مصادري · المعروض لأولياء الأمور · بلا درس. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR, I } = A;
  const KINDS = [['worksheet', 'ورقة عمل', '#3AB1DB'], ['review', 'ملف مراجعة', '#2E7FC9'], ['test', 'اختبار / تقويم', '#C9A44C'], ['presentation', 'عرض تقديمي', '#AE95DA'], ['video', 'فيديو', '#E0675A'], ['image', 'صورة', '#2F855A'], ['file', 'ملف مرفوع', '#5B6B7D'], ['folder', 'مجلد Drive', '#082B5A'], ['link', 'رابط آخر', '#8CC56A']];
  const kindOf = k => KINDS.find(x => x[0] === k) || KINDS[KINDS.length - 1];
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return ''; } };
  const gk = c => c ? `${c.stage}|${c.grade_word}` : '';
  const gName = k => { const [st, g] = String(k || '|').split('|'); return g ? A.gradeName(g, st) : ''; };
  const guess = (u, t) => /^image\//.test(t || '') || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(u) || /^data:image/.test(u) ? 'image' : /youtu|vimeo|\.mp4/i.test(u) ? 'video' : /\/folders\//.test(u) ? 'folder' : /presentation|\.pptx?(\?|$)/i.test(u) ? 'presentation' : /\.pdf(\?|$)|\.docx?(\?|$)|\.xlsx?(\?|$)/i.test(u) || (t && !/^image/.test(t)) ? 'file' : /docs\.google|drive\.google/.test(u) ? 'worksheet' : 'link';
  const ORIG = { prep: 'من التحضير', library: 'من مكتبة المدرسة', manual: '' };
  const fetchRes = async force => { if (force) S._resAt = 0; return A.fetchResources ? A.fetchResources() : api.resources(); };
  // من يرى المصدر (نسخة من قاعدة الصلاحيات في قاعدة البيانات — القاعدة هي الحَكَم)
  const isOwnerStaff = id => !!((S.staff || []).find(x => x.id === id) || {}).is_owner;
  const stOf = r => r.share_status || (isOwnerStaff(r.created_by) ? 'shared' : 'private');
  const vis = r => S.me.is_owner || r.created_by === S.me.id || (stOf(r) === 'shared' && ((r.share_scope || 'all') === 'all' || (r.share_scope === 'people' && (r.share_to || []).includes(S.me.id)) || (r.share_scope === 'subject' && (S.allEntries || S.entries || []).some(e => e.teacher_id === S.me.id && e.subject_id === r.subject_id))));
  const fetchVis = async f => (await fetchRes(f)).filter(vis);
  A.resVisible = vis;

  // ---------- مزامنة مصادر تحضير مع المخزن ----------
  A.syncPrepRes = async function (x) {
    if (!x || !x.id) return;
    const d = x.data || {}, lib = x.kind === 'library';
    const want = [...(d.resources || []).filter(r => r.u).map(r => ({ url: r.u, title: r.t || host(r.u) || 'رابط', file_type: '' })), ...(d.files || []).filter(f => f.u).map(f => ({ url: f.u, title: f.n || 'ملف', file_type: f.t || '' }))];
    let have = []; try { have = (await api.list('resources', { prep_id: x.id })) || []; } catch (_) { have = []; }
    const off = lib && !x.active; // مكتبة غير مفعّلة: لا تظهر مصادرها للمعلمين بعد
    const cls = [...new Set((d.links || []).map(l => l.c).filter(Boolean))];
    const sec = cls.length ? ((A.cls(cls[0]) || {}).section_id || S.sectionId) : (lib ? null : S.sectionId);
    for (const h of have) if (off || !want.some(w => w.url === h.url)) await api.deleteResource(h.id).catch(() => { });
    if (off) { S._resAt = 0; return; }
    let all = []; try { all = await fetchRes(true); } catch (_) { }
    for (const w of want) {
      if (all.some(r => r.url === w.url && r.prep_id !== x.id)) continue; // موجود في المخزن (اختير منه أو من تحضير آخر) — لا تكرار
      const base = { title: w.title, kind: guess(w.url, w.file_type), file_type: w.file_type, subject_id: x.subject_id || null, grade_key: x.grade_key || null, lesson_id: x.lesson_id || null, note: x.lesson || '', origin: lib ? 'library' : 'prep', ...(lib ? { share_status: 'shared', share_scope: 'all' } : {}) };
      const h = have.find(r => r.url === w.url);
      if (h) { await api.updateResource(h.id, { ...base, class_ids: lib ? (h.class_ids || []) : cls }).catch(() => { }); }
      else await api.addResource({ ...base, url: w.url, prep_id: x.id, class_ids: lib ? [] : cls, section_id: sec, school_id: S.school.id, visible_to_parents: false, week_id: null }).catch(() => { });
    }
    S._resAt = 0;
  };

  // مصادر درس معيّن من المخزن (بالدرس، وإلا بمطابقة العنوان داخل المادة والصف)
  A.lessonResources = async function (subj, grade, lessonId, title, exceptPrep) {
    const all = await fetchVis(); const t = A.normKey(title || '');
    return all.filter(r => r.prep_id !== exceptPrep && (!r.section_id || r.section_id === S.sectionId) && r.subject_id === subj && (!grade || !r.grade_key || r.grade_key === grade) && ((lessonId && r.lesson_id === lessonId) || (t && t.length > 2 && A.normKey(r.note + ' ' + r.title).includes(t))));
  };

  // ---------- منتقي المصادر (يحل محل القديم: درس الحصة أولاً) ----------
  A.pickResource = async function (subjectId, classId, onPick, o) {
    o = o || {}; const all = await fetchVis();
    const fit = r => (!r.section_id || r.section_id === S.sectionId);
    const t = A.normKey(o.lesson || '');
    const same = r => (o.lesson_id && r.lesson_id === o.lesson_id) || (t.length > 2 && A.normKey(r.note + ' ' + r.title).includes(t));
    let onlySubj = true;
    const m = A.modal(`<h3>${esc(o.title || 'من مصادر المدرسة')}</h3><p class="sub">${o.sub || 'اختر مصدراً — مصادر الدرس نفسه أولاً، ثم مصادر المادة. الجديد يُضاف من «المصادر» أو من التحضير.'}</p>
      <div class="row" style="margin-bottom:8px;gap:8px;flex-wrap:wrap"><input class="in" id="prq" placeholder="بحث" style="max-width:240px"><label class="chk"><input type="checkbox" id="prs" checked> ${esc(A.subjName(subjectId) || 'المادة')} فقط</label></div><div id="prl" style="max-height:52vh;overflow:auto"></div>`, { cls: 'wide' });
    const draw = () => { const q = A.normKey(m.el.querySelector('#prq').value || '');
      const l = all.filter(fit).filter(r => (!onlySubj || r.subject_id === subjectId || !r.subject_id) && (!o.grade_key || !r.grade_key || r.grade_key === o.grade_key) && (!q || A.normKey(r.title + ' ' + r.note).includes(q))).sort((a, b) => (same(b) ? 1 : 0) - (same(a) ? 1 : 0));
      m.el.querySelector('#prl').innerHTML = l.map(r => { const [, kl, kc] = kindOf(r.kind); return `<button type="button" class="pick-r" data-id="${r.id}"><span class="rk" style="--k:${kc}">${kl}</span><span><b>${esc(r.title)}</b>${same(r) ? ' <span class="pill st-approved">الدرس نفسه</span>' : ''}<br><span class="small muted">${esc(A.subjName(r.subject_id) || 'عام')}${r.grade_key ? ' · ' + esc(gName(r.grade_key)) : ''}${r.note ? ' · ' + esc(r.note) : ''} · ${esc(A.personName(r.created_by) || '')}</span></span></button>`; }).join('') || A.emptyBox('لا توجد مصادر مطابقة');
      $$('[data-id]', m.el).forEach(b => b.onclick = () => { const r = all.find(x => x.id === b.dataset.id); m.close(); onPick(r); }); };
    m.el.querySelector('#prq').oninput = draw; m.el.querySelector('#prs').onchange = e => { onlySubj = e.target.checked; draw(); }; draw();
  };

  // ---------- صفحة «المصادر» ----------
  const POL = () => Object.assign({ review: true, auto: 'none', trusted: [], trusted_scope: 'all', parents: false }, ((S.school || {}).settings || {}).res_policy || {});
  const polText = (p, me) => { const tr = (p.trusted || []).includes(me); const sc = { subject: 'معلمي المادة', all: 'كل المعلمين' };
    if (tr) return `مصادرك تُشارك مباشرة مع ${sc[p.trusted_scope] || 'كل المعلمين'} (أنت ضمن الموثوقين).`;
    if (p.auto !== 'none') return p.review ? `كل مصدر تضيفه يُشارك مباشرة مع ${sc[p.auto]} حسب إعداد المالك.` : `مصدرك خاص بك، وإذا طلبت مشاركته يُشارك مباشرة مع ${sc[p.auto]}.`;
    return p.review ? 'كل مصدر تضيفه يصل للمالك تلقائياً «بانتظار الاعتماد»، ولا يراه زملاؤك إلا بعد موافقته.' : 'مصدرك خاص بك والمالك؛ لمشاركته اضغط «طلب مشاركة» وينتظر موافقة المالك.'; };
  const SH = { private: ['خاص بصاحبه', 'st-empty'], pending: ['بانتظار اعتماد المالك', 'st-returned'], shared: ['مشترك', 'st-approved'], rejected: ['لم تُعتمد المشاركة', 'st-returned'] };
  const SCOPE = { all: 'كل المعلمين', subject: 'معلمو المادة', people: 'أشخاص محددون' };
  const stageOf = k => String(k || '').split('|')[0] || '';
  const STG_ORD = s => /رياض|KG/i.test(s) ? 0 : /ابتدائ/.test(s) ? 1 : /متوسط/.test(s) ? 2 : /ثانو/.test(s) ? 3 : 4;
  const GW = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
  const gOrd = k => { const [st, g] = String(k || '|').split('|'); return STG_ORD(st) * 10 + Math.max(0, GW.indexOf(g)); };
  const stageName = s => s ? (/^المرحلة/.test(s) ? s : 'المرحلة ' + s.replace(/^ال?/, 'ال')) : 'عام — بلا صف';
  V.resources = async function (root) {
    root.innerHTML = '<div class="spinner"></div>';
    let RES; try { RES = (await fetchRes(true)).slice(); } catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر تحميل المصادر', e.message)}</div>`; return; }
    const own = S.me.is_owner;
    const st = { tab: A.LS.get('rs_t2') || (own ? 'all' : 'mine'), q: '', sec: own ? (A.LS.get('rs_sec') || S.sectionId) : S.sectionId, stage: A.LS.get('rs_st') || '', subj: A.LS.get('rs_s') || '', grade: A.LS.get('rs_g') || '', kind: '', lesson: '', group: A.LS.get('rs_gr') !== '0' };
    const allCls = () => (S.allClasses && S.allClasses.length ? S.allClasses : S.classes) || [];
    const grades = () => [...new Set(allCls().filter(c => c.active !== false && (!st.sec || c.section_id === st.sec || !c.section_id)).map(gk))].filter(Boolean).filter(g => !st.stage || stageOf(g) === st.stage).sort((a, b) => gOrd(a) - gOrd(b));
    const stages = () => [...new Set(allCls().map(c => c.stage).filter(Boolean))].sort((a, b) => STG_ORD(a) - STG_ORD(b));
    let CUR = [];
    const loadCur = async () => { CUR = st.subj && st.grade ? await api.list('curriculum', { school_id: S.school.id, subject_id: st.subj, grade_key: st.grade }, { order: 'sort' }).catch(() => []) : []; };
    await loadCur();
    const inSec = r => !st.sec || !r.section_id || r.section_id === st.sec;
    const T = own ? { all: ['كل مصادر المدرسة', r => true], pending: ['طلبات المشاركة', r => stOf(r) === 'pending' || r.parents_req], shared: ['المشتركة بين المعلمين', r => stOf(r) === 'shared'], private: ['الخاصة بأصحابها', r => stOf(r) !== 'shared' && stOf(r) !== 'pending'], parents: ['المعروض لأولياء الأمور', r => r.visible_to_parents], nolesson: ['بلا درس', r => !r.lesson_id && !r.prep_id] }
      : { mine: ['مصادري', r => r.created_by === S.me.id], shared: ['المشتركة معي', r => r.created_by !== S.me.id && vis(r)], parents: ['المعروض لأولياء الأمور', r => r.created_by === S.me.id && r.visible_to_parents] };
    if (!T[st.tab]) st.tab = Object.keys(T)[0];
    const list = () => RES.filter(r => vis(r) && inSec(r) && T[st.tab][1](r) && (!st.stage || stageOf(r.grade_key) === st.stage || !r.grade_key) && (!st.subj || r.subject_id === st.subj) && (!st.grade || !r.grade_key || r.grade_key === st.grade) && (!st.kind || r.kind === st.kind) && (!st.lesson || r.lesson_id === st.lesson) && (!st.q || A.normKey(r.title + ' ' + r.note + ' ' + (A.personName(r.created_by) || '')).includes(A.normKey(st.q))));
    const canEd = r => own || r.created_by === S.me.id;
    const card = r => { const [, kl, kc] = kindOf(r.kind); const cl = (r.class_ids || []).map(id => (A.cls(id) || {}).name).filter(Boolean); const img = r.kind === 'image'; const ss = stOf(r), mine = r.created_by === S.me.id;
      return `<div class="res">${img ? `<a href="${esc(r.url)}" target="_blank" rel="noopener" class="res-img"><img src="${esc(r.url)}" alt="${esc(r.title)}" loading="lazy"></a>` : ''}<div class="row" style="gap:4px;flex-wrap:wrap"><span class="rk" style="--k:${kc}">${kl}</span>${ORIG[r.origin] ? `<span class="pill st-submitted">${ORIG[r.origin]}</span>` : ''}${own || mine ? `<span class="pill ${SH[ss][1]}">${SH[ss][0]}${ss === 'shared' ? ' · ' + SCOPE[r.share_scope || 'all'] : ''}</span>` : ''}</div><a class="rt" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>
        <div class="small muted">${esc(A.subjName(r.subject_id) || 'عام')}${r.grade_key ? ' · ' + esc(gName(r.grade_key)) : ''}${cl.length ? ' · ' + esc(cl.join('، ')) : ''}${r.visible_to_parents ? ' · <span class="pill st-approved">يظهر لأولياء الأمور</span>' : ''}${r.parents_req && (own || mine) ? ' · <span class="pill st-returned">طلب إظهار لأولياء الأمور</span>' : ''}</div>${r.note ? `<div class="small" style="margin-top:4px">${r.lesson_id || r.prep_id ? 'الدرس: ' : ''}${esc(r.note)}</div>` : ''}${r.share_note && (own || mine) ? `<div class="small" style="margin-top:2px;color:#B7791F">${esc(r.share_note)}</div>` : ''}
        <div class="rf"><span class="small faint">${esc(A.personName(r.created_by) || '')}</span><span class="row" style="gap:4px;flex-wrap:wrap">
          ${own && r.parents_req ? `<button class="btn ok sm" data-pa="${r.id}">إظهار لأولياء الأمور</button><button class="btn ghost sm" data-pr="${r.id}">رفض الإظهار</button>` : ''}${own && ss !== 'shared' ? `<button class="btn ok sm" data-ap="${r.id}">${ss === 'pending' ? 'اعتماد ومشاركة' : 'مشاركة'}</button>` : ''}${own && ss === 'pending' ? `<button class="btn ghost sm" data-rj="${r.id}">رفض</button>` : ''}${own && ss === 'shared' ? `<button class="btn ghost sm" data-ap="${r.id}">النطاق</button><button class="btn ghost sm" data-un="${r.id}">إيقاف المشاركة</button>` : ''}
          ${!own && mine && (ss === 'private' || ss === 'rejected') ? `<button class="btn ghost sm" data-rq="${r.id}">طلب مشاركة</button>` : ''}${!own && mine && ss === 'pending' ? `<button class="btn ghost sm" data-cn="${r.id}">إلغاء الطلب</button>` : ''}${!own && mine && ss === 'shared' ? `<button class="btn ghost sm" data-cn="${r.id}">إيقاف المشاركة</button>` : ''}
          ${/^data:/.test(r.url) ? '' : `<button class="btn ghost sm" data-cp="${r.id}" aria-label="نسخ الرابط">نسخ</button>`}${canEd(r) ? `<button class="btn ghost sm" data-ed="${r.id}">تعديل</button><button class="btn bad sm" data-del="${r.id}" aria-label="حذف">×</button>` : ''}</span></div></div>`; };
    const paint = () => {
      const pend = RES.filter(r => stOf(r) === 'pending').length; const pol = POL();
      root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>المصادر</h2><p class="sub" style="margin:2px 0 0">مخزن المواد التعليمية للمدرسة: أوراق العمل والعروض والفيديو والصور والملفات وروابط Drive، مرتّبة بالمرحلة والصف والمادة والدرس.</p></div>
        <div class="row"><button class="btn" id="rsAdd">${I.plus} إضافة مصدر</button>${own ? `<button class="btn ghost" id="rsPol">إعدادات المشاركة</button>` : ''}<button class="btn ghost" id="rsPrint">${I.print} طباعة القائمة</button></div></div>
        ${own ? `<div class="notice info" style="display:block;margin:6px 0 0">الإعداد الحالي: ${pol.auto === 'none' ? '<b>انتظار موافقتك</b>' : `<b>موافقة مباشرة</b> مع ${pol.auto === 'subject' ? 'معلمي المادة' : 'كل المعلمين'}`} · ${pol.review ? 'كل مصدر جديد يُرسل للمراجعة تلقائياً' : 'يبقى خاصاً حتى يطلب المعلم المشاركة'}${(pol.trusted || []).length ? ` · ${AR(pol.trusted.length)} معلم موثوق` : ''}${pol.parents ? ' · إظهار المصادر لأولياء الأمور بموافقتك' : ''}</div>` : `<div class="notice info" style="display:block;margin:6px 0 0">${polText(pol, S.me.id)}${pol.parents ? ' وإظهار مصدرك لأولياء الأمور يحتاج موافقة المالك.' : ''}</div>`}
        <details class="rs-how"${A.LS.get('rs_how') === '0' ? '' : ' open'}><summary><b>كيف تعمل المصادر؟</b></summary><ul>
          <li><b>الإضافة تلقائية:</b> كل رابط أو ملف يضيفه المعلم — هنا أو من التحضير — يُحفظ في المصادر ويراه المالك دائماً.</li>
          <li><b>لا يرى المعلمون مصادر بعضهم إلا بإذن المالك:</b> ${own ? 'تختار من «إعدادات المشاركة»: انتظار موافقتك لكل مصدر، أو موافقة مباشرة لمعلمي المادة أو للجميع، أو معلمين موثوقين تُشارك مصادرهم مباشرة. ولكل مصدر تحدد النطاق أو توقف مشاركته في أي وقت.' : 'المالك يحدد طريقة المشاركة؛ ' + polText(pol, S.me.id)}</li>
          <li><b>مرتبط بالدرس:</b> اختر الصف والدرس عند الإضافة فيظهر المصدر داخل تحضير ذلك الدرس، وتُضيفه للحصة بضغطة.</li>
          <li><b>أولياء الأمور:</b> لا يرون أي مصدر إلا إذا فعّلت «يظهر لأولياء الأمور» للمصدر وحددت فصوله.</li>
          <li><b>من المكتبة:</b> مصادر تحضيرات «مكتبة المدرسة» تظهر للمعلمين عند تفعيل التحضير فقط.</li></ul></details>
        <div class="kpick" id="rsT" style="margin-top:10px">${Object.entries(T).map(([k, [n, f]]) => { const c = RES.filter(r => vis(r) && inSec(r) && f(r)).length; return `<button data-t="${k}" class="${st.tab === k ? 'on' : ''}">${n} (${AR(c)})${k === 'pending' && c ? ' •' : ''}</button>`; }).join('')}</div>
        ${own && pend && st.tab === 'pending' ? `<div class="row" style="margin-top:8px"><button class="btn ok sm" id="rsApAll">اعتماد كل الطلبات لكل المعلمين</button></div>` : ''}
        <div class="row rs-f" style="margin:10px 0 12px;gap:8px;flex-wrap:wrap"><input class="in" id="rsQ" placeholder="بحث بالعنوان أو الدرس أو المعلم" style="max-width:240px" value="${esc(st.q)}">
          ${own && (S.sections || []).length > 1 ? `<select class="in" id="rsSec" style="max-width:160px" aria-label="القسم"><option value="">كل الأقسام</option>${S.sections.map(x => `<option value="${x.id}" ${st.sec === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>` : ''}
          <select class="in" id="rsSt" style="max-width:170px" aria-label="المرحلة"><option value="">كل المراحل</option>${stages().map(x => `<option value="${esc(x)}" ${st.stage === x ? 'selected' : ''}>${esc(stageName(x))}</option>`).join('')}</select>
          <select class="in" id="rsG" style="max-width:170px" aria-label="الصف"><option value="">كل الصفوف</option>${grades().map(g => `<option value="${esc(g)}" ${st.grade === g ? 'selected' : ''}>${esc(gName(g))}</option>`).join('')}</select>
          <select class="in" id="rsS" style="max-width:170px" aria-label="المادة"><option value="">كل المواد</option>${S.subjects.map(x => `<option value="${x.id}" ${st.subj === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
          ${CUR.length ? `<select class="in" id="rsL" style="max-width:200px" aria-label="الدرس"><option value="">كل الدروس</option>${CUR.map(l => `<option value="${l.id}" ${st.lesson === l.id ? 'selected' : ''}>${esc(l.lesson)}</option>`).join('')}</select>` : ''}
          <select class="in" id="rsK" style="max-width:150px" aria-label="النوع"><option value="">كل الأنواع</option>${KINDS.map(([k, l]) => `<option value="${k}" ${st.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <label class="chk"><input type="checkbox" id="rsGr" ${st.group ? 'checked' : ''}> تجميع بالمرحلة والصف والمادة</label></div>
        <div id="rsLi"></div></div>`;
      draw();
      $('details.rs-how', root).ontoggle = e => A.LS.set('rs_how', e.target.open ? '1' : '0');
      $$('#rsT button', root).forEach(b => b.onclick = () => { st.tab = b.dataset.t; A.LS.set('rs_t2', st.tab); paint(); });
      $('#rsAdd', root).onclick = () => edit();
      const pb = $('#rsPol', root); if (pb) pb.onclick = () => polDlg();
      $('#rsQ', root).oninput = e => { st.q = e.target.value; draw(); };
      const sc = $('#rsSec', root); if (sc) sc.onchange = e => { st.sec = e.target.value; A.LS.set('rs_sec', st.sec); paint(); };
      $('#rsSt', root).onchange = async e => { st.stage = e.target.value; A.LS.set('rs_st', st.stage); if (st.grade && stageOf(st.grade) !== st.stage && st.stage) { st.grade = ''; A.LS.set('rs_g', ''); } st.lesson = ''; await loadCur(); paint(); };
      $('#rsG', root).onchange = async e => { st.grade = e.target.value; st.lesson = ''; A.LS.set('rs_g', st.grade); await loadCur(); paint(); };
      $('#rsS', root).onchange = async e => { st.subj = e.target.value; st.lesson = ''; A.LS.set('rs_s', st.subj); await loadCur(); paint(); };
      const rl = $('#rsL', root); if (rl) rl.onchange = e => { st.lesson = e.target.value; draw(); };
      $('#rsK', root).onchange = e => { st.kind = e.target.value; draw(); };
      $('#rsGr', root).onchange = e => { st.group = e.target.checked; A.LS.set('rs_gr', st.group ? '1' : '0'); draw(); };
      const aa = $('#rsApAll', root); if (aa) aa.onclick = e => A.run(e.currentTarget, async () => { const l = RES.filter(r => stOf(r) === 'pending'); if (!(await A.confirmBox(`اعتماد ${AR(l.length)} طلب مشاركة لكل المعلمين؟`, 'اعتماد'))) return; for (const r of l) Object.assign(r, await api.updateResource(r.id, { share_status: 'shared', share_scope: 'all', share_to: [], share_note: '' })); S._resAt = 0; paint(); A.toast('اعتُمدت الطلبات', 'ok'); });
      $('#rsPrint', root).onclick = () => { const l = sorted(list()); A.printDoc('قائمة المصادر', `${st.sec ? ((S.sections || []).find(x => x.id === st.sec) || {}).name || '' : 'كل الأقسام'} · ${T[st.tab][0]}`, groups(l).map(([h, rs]) => `<h3 style="margin:14px 0 6px;border-inline-start:6px solid #3AB1DB;padding-inline-start:8px">${esc(h)}</h3><table><tr><th>المصدر</th><th>النوع</th><th>الدرس / الوصف</th><th>صاحبه</th><th>الرابط</th></tr>${rs.map(r => `<tr><td style="text-align:start"><b>${esc(r.title)}</b></td><td>${kindOf(r.kind)[1]}</td><td>${esc(r.note || '')}</td><td>${esc(A.personName(r.created_by) || '')}</td><td dir="ltr" style="font-size:10px;word-break:break-all">${esc(/^data:/.test(r.url) ? '(ملف مرفوع)' : r.url)}</td></tr>`).join('')}</table>`).join('') || '<p>لا توجد مصادر</p>'); };
    };
    const sorted = l => l.slice().sort((a, b) => gOrd(a.grade_key || 'ي|') - gOrd(b.grade_key || 'ي|') || (A.subjName(a.subject_id) || 'ي').localeCompare(A.subjName(b.subject_id) || 'ي', 'ar') || String(a.note || '').localeCompare(String(b.note || ''), 'ar'));
    const groups = l => { const out = []; l.forEach(r => { const h = [stageName(stageOf(r.grade_key)), r.grade_key ? gName(r.grade_key) : '', A.subjName(r.subject_id) || 'عام'].filter(Boolean).join(' › '); let g = out.find(x => x[0] === h); if (!g) out.push(g = [h, []]); g[1].push(r); }); return out; };
    const draw = () => {
      const l = sorted(list()), box = $('#rsLi', root);
      box.innerHTML = !l.length ? A.emptyBox(st.tab === 'pending' ? 'لا توجد طلبات مشاركة' : st.tab === 'nolesson' ? 'كل المصادر مرتبطة بدروس ✓' : 'لا توجد مصادر', 'أضف مصدراً، أو أضف روابط وملفات في التحضير فتظهر هنا.')
        : st.group ? groups(l).map(([h, rs]) => `<section class="rs-grp"><h3>${esc(h)} <span class="small muted">(${AR(rs.length)})</span></h3><div class="res-grid">${rs.map(card).join('')}</div></section>`).join('') : `<div class="res-grid">${l.map(card).join('')}</div>`;
      const R = id => RES.find(x => x.id === id);
      const up = async (r, p, msg) => { Object.assign(r, await api.updateResource(r.id, p)); S._resAt = 0; paint(); A.toast(msg, 'ok'); };
      $$('[data-cp]', box).forEach(b => b.onclick = () => navigator.clipboard.writeText(R(b.dataset.cp).url).then(() => A.toast('نُسخ الرابط', 'ok')));
      $$('[data-ed]', box).forEach(b => b.onclick = () => edit(R(b.dataset.ed)));
      $$('[data-ap]', box).forEach(b => b.onclick = () => shareDlg(R(b.dataset.ap)));
      $$('[data-pa]', box).forEach(b => b.onclick = () => A.run(b, async () => up(R(b.dataset.pa), { visible_to_parents: true, parents_req: false }, 'يظهر الآن لأولياء الأمور')));
      $$('[data-pr]', box).forEach(b => b.onclick = () => A.run(b, async () => up(R(b.dataset.pr), { parents_req: false }, 'رُفض إظهاره لأولياء الأمور')));
      $$('[data-rj]', box).forEach(b => b.onclick = () => A.run(b, async () => up(R(b.dataset.rj), { share_status: 'rejected', share_note: 'لم يعتمد المالك مشاركة هذا المصدر' }, 'رُفض الطلب — يبقى المصدر خاصاً بصاحبه')));
      $$('[data-un]', box).forEach(b => b.onclick = () => A.run(b, async () => up(R(b.dataset.un), { share_status: 'private', share_note: '' }, 'أُوقفت المشاركة')));
      $$('[data-rq]', box).forEach(b => b.onclick = () => A.run(b, async () => up(R(b.dataset.rq), { share_status: 'pending', share_note: '' }, 'أُرسل طلب المشاركة للمالك')));
      $$('[data-cn]', box).forEach(b => b.onclick = () => A.run(b, async () => up(R(b.dataset.cn), { share_status: 'private', share_note: '' }, 'أصبح المصدر خاصاً بك')));
      $$('[data-del]', box).forEach(b => b.onclick = async () => { const r = R(b.dataset.del); if (!(await A.confirmBox(r.prep_id ? 'حذف هذا المصدر من المخزن؟ يبقى في التحضير الذي أُضيف منه ويعود إذا حُفظ التحضير مرة أخرى.' : 'حذف هذا المصدر؟ الملف نفسه في Drive لا يتأثر.', 'حذف', true))) return; await A.run(null, async () => { await api.deleteResource(r.id); RES = RES.filter(x => x.id !== r.id); S._resAt = 0; paint(); }); });
    };
    // إعدادات المشاركة (للمالك) — تُطبّقها قاعدة البيانات على كل إضافة
    const polDlg = () => {
      const p = POL(); const T2 = (S.staff || []).filter(x => x.active !== false && !x.is_owner).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
      const m = A.modal(`<h3>إعدادات مشاركة المصادر</h3><p class="sub">أنت ترى كل المصادر دائماً. هذه الإعدادات تحدد متى يرى المعلمون مصادر بعضهم، وتُطبَّق في قاعدة البيانات على كل مصدر جديد.</p>
        <div class="field"><label>عند إضافة المعلم مصدراً</label><label class="chk"><input type="radio" name="pv" value="1" ${p.review ? 'checked' : ''}> يُرسل إليك تلقائياً للمراجعة</label><label class="chk"><input type="radio" name="pv" value="0" ${p.review ? '' : 'checked'}> يبقى خاصاً به حتى يطلب هو المشاركة</label></div>
        <div class="field"><label>طريقة الاعتماد</label><label class="chk"><input type="radio" name="pa" value="none" ${p.auto === 'none' ? 'checked' : ''}> انتظار موافقتي على كل مصدر <span class="small muted">(يظهر في «طلبات المشاركة»)</span></label><label class="chk"><input type="radio" name="pa" value="subject" ${p.auto === 'subject' ? 'checked' : ''}> موافقة مباشرة — يراه معلمو المادة نفسها فقط</label><label class="chk"><input type="radio" name="pa" value="all" ${p.auto === 'all' ? 'checked' : ''}> موافقة مباشرة — يراه كل المعلمين</label></div>
        <details class="dz-det"${(p.trusted || []).length ? ' open' : ''}><summary>معلمون موثوقون <span class="small muted">— تُشارك مصادرهم مباشرة دائماً</span></summary>
          <div class="field" style="margin-top:6px"><label for="pTs">نطاق مصادر الموثوقين</label><select class="in" id="pTs" style="width:auto"><option value="all" ${p.trusted_scope === 'all' ? 'selected' : ''}>كل المعلمين</option><option value="subject" ${p.trusted_scope === 'subject' ? 'selected' : ''}>معلمو المادة</option></select></div>
          <div class="perm-grid" id="pTr" style="max-height:35vh;overflow:auto">${T2.map(x => `<label class="chk"><input type="checkbox" value="${x.id}" ${(p.trusted || []).includes(x.id) ? 'checked' : ''}> ${esc(x.full_name)}</label>`).join('')}</div></details>
        <label class="chk" style="margin-top:10px"><input type="checkbox" id="pPa" ${p.parents ? 'checked' : ''}> إظهار أي مصدر لأولياء الأمور يحتاج موافقتي</label>
        <p class="small muted">التغيير يسري على المصادر الجديدة والطلبات القادمة؛ المصادر الحالية تبقى على حالتها وتتحكم فيها من بطاقاتها.</p>
        <div class="acts"><button class="btn ok" id="pGo">حفظ الإعدادات</button></div>`, { cls: 'wide' });
      m.el.querySelector('#pGo').onclick = e => A.run(e.currentTarget, async () => {
        const np = { review: m.el.querySelector('[name=pv]:checked').value === '1', auto: m.el.querySelector('[name=pa]:checked').value, trusted: $$('#pTr input:checked', m.el).map(i => i.value), trusted_scope: m.el.querySelector('#pTs').value, parents: m.el.querySelector('#pPa').checked };
        const settings = { ...(S.school.settings || {}), res_policy: np }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; m.close(); paint(); A.toast('حُفظت إعدادات المشاركة', 'ok'); });
    };
    // اعتماد المشاركة ونطاقها (للمالك)
    const shareDlg = r => {
      const teach = new Set((S.allEntries || S.entries || []).filter(e => e.subject_id === r.subject_id).map(e => e.teacher_id));
      const P = (S.staff || []).filter(x => x.active !== false && !x.is_owner && x.id !== r.created_by).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
      const m = A.modal(`<h3>مشاركة «${esc(r.title)}»</h3><p class="sub">صاحب المصدر: <b>${esc(A.personName(r.created_by) || '—')}</b> · ${esc(A.subjName(r.subject_id) || 'عام')}${r.grade_key ? ' · ' + esc(gName(r.grade_key)) : ''}</p>
        <div class="field"><label>من يرى هذا المصدر؟</label>${Object.entries(SCOPE).map(([k, n]) => `<label class="chk"><input type="radio" name="shs" value="${k}" ${(r.share_scope || 'all') === k ? 'checked' : ''}> ${n}${k === 'subject' ? ` <span class="small muted">(${AR(teach.size)} معلم يدرّس ${esc(A.subjName(r.subject_id) || 'المادة')})</span>` : ''}</label>`).join('')}</div>
        <div class="perm-grid" id="shP" style="max-height:40vh;overflow:auto">${P.map(x => `<label class="chk"><input type="checkbox" value="${x.id}" ${(r.share_to || []).includes(x.id) ? 'checked' : ''}> ${esc(x.full_name)}${teach.has(x.id) ? ' <span class="pill st-submitted">يدرّس المادة</span>' : ''}</label>`).join('')}</div>
        <div class="acts"><button class="btn ok" id="shGo">اعتماد المشاركة</button></div>`, { cls: 'wide' });
      const sync = () => { m.el.querySelector('#shP').style.display = m.el.querySelector('[name=shs]:checked').value === 'people' ? '' : 'none'; };
      $$('[name=shs]', m.el).forEach(i => i.onchange = sync); sync();
      m.el.querySelector('#shGo').onclick = e => A.run(e.currentTarget, async () => { const sc = m.el.querySelector('[name=shs]:checked').value, to = $$('#shP input:checked', m.el).map(i => i.value); if (sc === 'people' && !to.length) throw new Error('حدّد شخصاً واحداً على الأقل');
        Object.assign(r, await api.updateResource(r.id, { share_status: 'shared', share_scope: sc, share_to: sc === 'people' ? to : [], share_note: '' })); m.close(); S._resAt = 0; paint(); A.toast('اعتُمدت المشاركة', 'ok'); });
    };
    const edit = async r => {
      r = r || { kind: 'worksheet', subject_id: st.subj || null, grade_key: st.grade || null, lesson_id: st.lesson || null, class_ids: [], title: '', url: '', note: '', share_status: own ? 'shared' : 'private' };
      let C2 = []; const lc = async () => { C2 = r.subject_id && r.grade_key ? await api.list('curriculum', { school_id: S.school.id, subject_id: r.subject_id, grade_key: r.grade_key }, { order: 'sort' }).catch(() => []) : []; }; await lc();
      const m = A.modal(`<h3>${r.id ? 'تعديل' : 'إضافة'} مصدر</h3><div id="reB"></div>`, { cls: 'wide' }); const B = m.el.querySelector('#reB'), q = s => B.querySelector(s);
      const sync = () => { const tu = q('#reU').value.trim(); if (tu) { r.url = tu; r.file_type = ''; } r.title = q('#reT').value; r.kind = q('#reK').value; r.note = q('#reN').value; r.visible_to_parents = q('#reP').checked; r.class_ids = $$('.perm-grid input:checked', B).map(i => i.value); const sh = q('#reSh'); if (sh) r._share = sh.checked; };
      const dr = () => {
        const cls = allCls().filter(c => c.active !== false && (!r.grade_key || gk(c) === r.grade_key) && (!S.sectionId || !c.section_id || c.section_id === S.sectionId));
        B.innerHTML = `<div class="field"><label for="reU">الرابط (Drive أو أي رابط) — أو ارفع ملفاً</label><div class="row" style="gap:6px;flex-wrap:nowrap"><input class="in" id="reU" dir="ltr" value="${esc(/^data:/.test(r.url) || r.file_type ? '' : r.url)}" placeholder="https://drive.google.com/..."><label class="btn ghost sm" style="white-space:nowrap">رفع ملف<input type="file" id="reF" hidden accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"></label></div>${r.url && (/^data:/.test(r.url) || r.file_type) ? `<p class="small" style="margin:4px 0 0">ملف مرفوع: <b>${esc(r.title)}</b></p>` : ''}</div>
          <div class="grid g2"><div class="field"><label for="reT">العنوان</label><input class="in" id="reT" value="${esc(r.title)}" placeholder="مثال: ورقة عمل الكسور العشرية"></div>
            <div class="field"><label for="reK">النوع</label><select class="in" id="reK">${KINDS.map(([k, l]) => `<option value="${k}" ${r.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <div class="field"><label for="reG">الصف</label><select class="in" id="reG"><option value="">عام — كل الصفوف</option>${[...new Set(allCls().map(gk))].filter(Boolean).sort((a, b) => gOrd(a) - gOrd(b)).map(g => `<option value="${esc(g)}" ${r.grade_key === g ? 'selected' : ''}>${esc(gName(g))}</option>`).join('')}</select></div>
            <div class="field"><label for="reS">المادة</label><select class="in" id="reS"><option value="">عام</option>${S.subjects.map(s => `<option value="${s.id}" ${r.subject_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
            <div class="field"><label for="reL">الدرس (اختياري)</label><select class="in" id="reL"><option value="">—</option>${C2.map(l => `<option value="${l.id}" ${r.lesson_id === l.id ? 'selected' : ''}>${esc(l.unit ? l.unit + ' — ' : '')}${esc(l.lesson)}</option>`).join('')}</select>${!C2.length && r.subject_id && r.grade_key ? '<span class="small muted">لا توجد دروس مدخلة لهذا الصف (من «التقويم ← المنهج والدروس»).</span>' : ''}</div>
            <div class="field"><label for="reN">وصف مختصر (اختياري)</label><input class="in" id="reN" value="${esc(r.note || '')}" placeholder="مثال: تدريبات على الدرس مع الحل"></div></div>
          <div class="sec-box" style="margin-bottom:8px">${own ? `<label class="chk"><input type="checkbox" id="reSh" ${(r._share ?? stOf(r) === 'shared') ? 'checked' : ''}> مشترك مع كل المعلمين <span class="small muted">(تحديد نطاق أدق من زر «النطاق» في البطاقة)</span></label>` : `<p class="small" style="margin:0">🔒 ${polText(POL(), S.me.id)}</p>`}
            <label class="chk"><input type="checkbox" id="reP" ${r.visible_to_parents || r.parents_req ? 'checked' : ''}> يظهر لأولياء الأمور في بوابتهم مع خطة الأسبوع${!own && POL().parents ? ' <span class="small muted">(بعد موافقة المالك)</span>' : ''}${r.parents_req ? ' <span class="pill st-returned">بانتظار الموافقة</span>' : ''}</label></div>
          <div class="field"><label>الفصول (اتركها كلها فارغة ليظهر للجميع)</label><div class="perm-grid">${cls.map(c => `<label class="chk"><input type="checkbox" value="${c.id}" ${(r.class_ids || []).includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div></div>
          <div class="acts"><button class="btn" id="reGo">حفظ</button></div>`;
        q('#reU').onchange = () => { q('#reK').value = guess(q('#reU').value); };
        q('#reS').onchange = async e => { sync(); r.subject_id = e.target.value || null; r.lesson_id = null; await lc(); dr(); };
        q('#reG').onchange = async e => { sync(); r.grade_key = e.target.value || null; r.lesson_id = null; await lc(); dr(); };
        q('#reL').onchange = e => { r.lesson_id = e.target.value || null; const l = C2.find(x => x.id === r.lesson_id); if (l && !q('#reN').value.trim()) q('#reN').value = l.lesson; };
        q('#reF').onchange = e => A.run(null, async () => { const f = e.target.files[0]; if (!f) return; if (f.size > 15e6) throw new Error('الملف أكبر من ١٥ ميجابايت'); sync(); r.url = await api.uploadAsset(f); r.file_type = f.type || ''; r.kind = guess(r.url, f.type); if (!r.title.trim()) r.title = f.name; dr(); A.toast('رُفع الملف', 'ok'); });
        q('#reGo').onclick = e => A.run(e.currentTarget, async () => {
          sync(); const url = r.url; if (!/^(https?:\/\/|data:)/i.test(url || '')) throw new Error('اكتب رابطاً يبدأ بـ https:// أو ارفع ملفاً');
          const row = { url, title: (r.title || '').trim() || host(url) || 'مصدر', kind: r.kind, subject_id: r.subject_id || null, grade_key: r.grade_key || null, lesson_id: r.lesson_id || null, note: (r.note || '').trim(), visible_to_parents: r.visible_to_parents && !(r.parents_req && !own), class_ids: r.class_ids, file_type: r.file_type || '' }; if (!r.visible_to_parents) row.parents_req = false; else if (r.parents_req && !own) delete row.visible_to_parents;
          if (own) Object.assign(row, r._share ? (stOf(r) === 'shared' ? {} : { share_status: 'shared', share_scope: 'all', share_to: [] }) : { share_status: 'private' });
          if (r.id) { const x = await api.updateResource(r.id, row); Object.assign(r, x); } else RES.unshift(await api.addResource({ ...row, origin: 'manual', section_id: S.sectionId, school_id: S.school.id }));
          m.close(); S._resAt = 0; paint(); A.toast('حُفظ المصدر', 'ok');
        });
      };
      dr();
    };
    paint();
  };
})();
