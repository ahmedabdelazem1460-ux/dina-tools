/* منصة دينا — أداتا النصاب والجدول الآلي داخل المنصة + لوحة المطوّر */
(function () {
  const A = window.APP, V = window.VIEWS;
  const { api, S, $, $$, esc, AR, DAYS, ROLES, PERMS, I } = A;

  // ---------- إطار الأداة ----------
  function toolFrame(root, file, title, sub, extra = '') {
    root.innerHTML = `<div class="card" style="padding:12px 16px;margin-bottom:12px"><div class="row" style="justify-content:space-between">
        <div><h2 style="margin:0;font-size:19px">${title}</h2><p class="sub" style="margin:2px 0 0">${sub}</p></div>
        <div class="row">${extra}<a class="btn ghost sm" href="${file}" target="_blank" rel="noopener">فتح في نافذة مستقلة</a></div></div></div>
      <div class="card" style="padding:0;overflow:hidden"><iframe src="${file}" title="${esc(title)}" style="width:100%;height:calc(100vh - 230px);min-height:600px;border:0;display:block;background:#fff"></iframe></div>`;
    return $('iframe', root);
  }
  V.nisab = function (root) {
    toolFrame(root, 'tools/nisab.html', 'احتساب النصاب واحتياج المعلمين', 'بياناتك محفوظة كما كانت. يمكنك ربطها بالجدول الآلي من داخل الأداة.');
  };
  V.builder = function (root) {
    const canSend = A.perm('timetable_edit');
    toolFrame(root, 'tools/timetable.html', 'الجدول الدراسي الآلي', `ولّد الجدول هنا، ثم أرسله إلى ${esc(A.section().name)} كمسودة تراجعها وتعتمدها.`,
      canSend ? `<button class="btn sky sm" id="sendTT">${I.send} إرسال الجدول إلى المنصة</button>` : '');
    const b = $('#sendTT', root); if (b) b.onclick = () => A.run(b, () => sendDialog(root));
  };

  // ---------- قراءة حالة الجدول الآلي ----------
  const GR = { p: ['أول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سادس'], m: ['أول', 'ثاني', 'ثالث'], s: ['أول', 'ثاني', 'ثالث'] };
  const STG = { p: 'ابتدائي', m: 'متوسط', s: 'ثانوي' };
  const LET = ['أ', 'ب', 'ج', 'د', 'هـ'];
  function readBuilder() {
    let st; try { st = JSON.parse(localStorage.getItem('dina_timetable_state_v1') || 'null'); } catch (e) { st = null; }
    if (!st || !st.timetable || !Object.keys(st.timetable).length) throw new Error('لا يوجد جدول مولَّد في أداة الجدول الآلي بعد — ولّد الجدول أولاً ثم أرسله.');
    const sd = st.subjectData || {}; const classes = [];
    [['p', 'sectionsPrimary'], ['m', 'sectionsMiddle'], ['s', 'sectionsSecondary']].forEach(([k, key]) => (sd[key] || []).forEach((n, gi) => { for (let s = 1; s <= (+n || 0); s++) classes.push({ id: `${k}_${gi}_${s}`, k, gi, s, label: `${GR[k][gi]} ${STG[k]} - شعبة ${AR(s)}` }); }));
    const teachers = Object.fromEntries((st.teachers || []).map(t => [t.id, t.name]));
    return { st, classes: classes.filter(c => st.timetable[c.id]), teachers, days: (st.settings || {}).daysCount || 5, periods: (st.settings || {}).periodsPerDay || 7 };
  }
  function guessClass(c) {
    const same = S.classes.filter(x => x.active && A.normKey(x.name).startsWith(A.normKey(`${GR[c.k][c.gi]} ${STG[c.k]}`)));
    const byLetter = same.find(x => x.name.split(' ')[2] === LET[c.s - 1]);
    return (byLetter || same[c.s - 1] || {}).id || '';
  }
  async function sendDialog(root) {
    const B = readBuilder(); const sec = A.section();
    const mapKey = 'ttmap_' + S.sectionId; let saved = {}; try { saved = JSON.parse(A.LS.get(mapKey) || '{}'); } catch (e) { }
    const subjects = new Set(), tnames = new Set();
    B.classes.forEach(c => (B.st.timetable[c.id] || []).forEach(day => (day || []).forEach(cell => { if (cell && cell.subject) { subjects.add(cell.subject); if (cell.teacherId && B.teachers[cell.teacherId]) tnames.add(B.teachers[cell.teacherId]); } })));
    const ALIAS = { 'الدراسات الاجتماعية': 'الاجتماعيات', 'الاجتماعيات': 'الدراسات الاجتماعية', 'الحاسب': 'الحاسب الآلي' };
    const toks = n => new Set(A.normKey(n).split(/\s+/).map(w => w.replace(/^و/, '').replace(/^ال/, '')).filter(w => w.length > 1));
    const sim = (x, y) => { const a = toks(x), b = toks(y); const i = [...a].filter(w => b.has(w)).length; return i / Math.max(1, new Set([...a, ...b]).size); };
    const subMatch = n => {
      const exact = S.subjects.find(s => A.normKey(s.name) === A.normKey(n) || (ALIAS[n] && A.normKey(s.name) === A.normKey(ALIAS[n])));
      if (exact) return exact.id;
      const best = S.subjects.map(s => [s, sim(s.name, n)]).sort((x, y) => y[1] - x[1])[0];
      return best && best[1] >= 0.6 ? best[0].id : '';
    };
    const tMatch = n => (S.staff.find(p => A.normKey(p.full_name) === A.normKey(n)) || S.staff.find(p => A.normKey(p.full_name).includes(A.normKey(n)) && A.normKey(n).length > 3) || {}).id || '';
    const clsOpts = sel => `<option value="">— لا يُرسل —</option>` + S.classes.filter(c => c.active).map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
    const subOpts = sel => `<option value="__new">+ إضافة كمادة جديدة</option><option value="">— فراغ —</option>` + S.subjects.map(s => `<option value="${s.id}" ${s.id === sel ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
    const tOpts = sel => `<option value="__new">+ إضافة كموظف جديد (بلا حساب)</option><option value="">— بلا معلم —</option>` + S.staff.filter(p => p.active).map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('');
    const warn = (B.periods > sec.periods || B.days > sec.days) ? `<div class="notice warn">الجدول الآلي فيه ${AR(B.days)} أيام × ${AR(B.periods)} حصص، والقسم مضبوط على ${AR(sec.days)} × ${AR(sec.periods)} — الزائد لن يُرسل.</div>` : '';
    const m = A.modal(`<h3>إرسال الجدول الآلي إلى ${esc(sec.name)}</h3>
      <p class="sub">يُنشأ <b>مسودة جديدة</b> منسوخة من الجدول المعتمد، ثم تُستبدل حصص الفصول المحددة بما في الجدول الآلي. لا يتغير شيء قبل أن تعتمد المسودة.</p>${warn}
      <div class="tabs" id="stabs"><button class="on" data-s="c">الفصول (${AR(B.classes.length)})</button><button data-s="s">المواد (${AR(subjects.size)})</button><button data-s="t">المعلمون (${AR(tnames.size)})</button></div>
      <div data-p="c"><table class="tbl"><thead><tr><th>في الجدول الآلي</th><th>الفصل في المنصة</th></tr></thead><tbody>${B.classes.map(c => `<tr><td>${esc(c.label)}</td><td><select class="in" data-mc="${c.id}">${clsOpts(saved['c:' + c.id] !== undefined ? saved['c:' + c.id] : guessClass(c))}</select></td></tr>`).join('')}</tbody></table></div>
      <div data-p="s" class="hidden"><table class="tbl"><thead><tr><th>المادة في الجدول الآلي</th><th>المادة في المنصة</th></tr></thead><tbody>${[...subjects].map(n => `<tr><td>${esc(n)}</td><td><select class="in" data-ms="${esc(n)}">${subOpts(saved['s:' + n] !== undefined ? saved['s:' + n] : (subMatch(n) || '__new'))}</select></td></tr>`).join('')}</tbody></table></div>
      <div data-p="t" class="hidden"><table class="tbl"><thead><tr><th>المعلم في الجدول الآلي</th><th>في المنصة</th></tr></thead><tbody>${[...tnames].map(n => `<tr><td>${esc(n)}</td><td><select class="in" data-mt="${esc(n)}">${tOpts(saved['t:' + n] !== undefined ? saved['t:' + n] : (tMatch(n) || '__new'))}</select></td></tr>`).join('')}</tbody></table></div>
      <div class="acts"><button class="btn sky" id="sgo">${I.send} إنشاء المسودة</button></div><div class="small muted" id="sprog"></div>`, { cls: 'wide' });
    $$('#stabs button', m.el).forEach(b => b.onclick = () => { $$('#stabs button', m.el).forEach(x => x.classList.toggle('on', x === b)); $$('[data-p]', m.el).forEach(p => p.classList.toggle('hidden', p.dataset.p !== b.dataset.s)); });
    m.el.querySelector('#sgo').onclick = e => A.run(e.currentTarget, async () => {
      const pr = m.el.querySelector('#sprog'); const map = {};
      const cm = {}; $$('[data-mc]', m.el).forEach(s => { cm[s.dataset.mc] = s.value; map['c:' + s.dataset.mc] = s.value; });
      const used = Object.values(cm).filter(Boolean); if (!used.length) throw new Error('اختر فصلاً واحداً على الأقل');
      if (new Set(used).size !== used.length) throw new Error('فصلان من الجدول الآلي مربوطان بنفس فصل المنصة');
      const sm = {}; for (const s of $$('[data-ms]', m.el)) {
        let v = s.value; map['s:' + s.dataset.ms] = v === '__new' ? undefined : v;
        if (v === '__new') { pr.textContent = 'إضافة مادة: ' + s.dataset.ms; const r = await api.addSubject({ school_id: S.school.id, name: A.norm(s.dataset.ms) }).catch(async () => (await api.reloadSubjects()).find(x => A.normKey(x.name) === A.normKey(s.dataset.ms))); v = r && r.id; map['s:' + s.dataset.ms] = v; }
        sm[s.dataset.ms] = v || null;
      }
      const tm = {}; for (const s of $$('[data-mt]', m.el)) {
        let v = s.value;
        if (v === '__new') { pr.textContent = 'إضافة موظف: ' + s.dataset.mt; const r = await api.addStaff({ school_id: S.school.id, full_name: A.norm(s.dataset.mt) }); v = r.id; }
        map['t:' + s.dataset.mt] = v; tm[s.dataset.mt] = v || null;
      }
      A.LS.set(mapKey, JSON.stringify(map));
      await A.refreshPeople();
      pr.textContent = 'إنشاء المسودة…';
      const v = await api.createDraft({ section_id: S.sectionId, label: 'من الجدول الآلي — ' + new Date().toLocaleDateString('ar-SA-u-nu-latn'), source: 'الجدول الآلي', created_by: S.me.id });
      const vs = await api.ttVersions(S.sectionId); const ap = vs.find(x => x.status === 'approved');
      if (ap) { const sl = await api.ttSlots(ap.id); await api.replaceSlots(v.id, sl.map(({ class_id, day, period, subject_id, teacher_id }) => ({ class_id, day, period, subject_id, teacher_id }))); }
      const rows = [];
      B.classes.forEach(c => { const cid = cm[c.id]; if (!cid) return; for (let d = 0; d < Math.min(B.days, sec.days); d++) for (let p = 0; p < Math.min(B.periods, sec.periods); p++) { const cell = ((B.st.timetable[c.id] || [])[d] || [])[p]; rows.push({ class_id: cid, day: d, period: p, subject_id: cell && cell.subject ? sm[cell.subject] || null : null, teacher_id: cell && cell.teacherId && B.teachers[cell.teacherId] ? tm[B.teachers[cell.teacherId]] || null : null }); } });
      for (let i = 0; i < rows.length; i += 400) await api.upsertSlots(v.id, rows.slice(i, i + 400));
      m.close(); A.LS.set('tttab', 'drafts'); A.toast(`أُنشئت المسودة بـ${A.cnt(used.length, 'فصل', 'فصول')} — راجعها ثم اعتمدها`, 'ok');
      location.hash = '#/timetable';
    });
  }

  // =====================================================================
  //  لوحة المطوّر — كل صلاحيات النظام (للمالك فقط)
  // =====================================================================
  const ALLP = () => [...PERMS, ...A.TOOL_PERMS];
  V.dev = function (root) {
    if (!S.me.is_owner) { root.innerHTML = ''; return; }
    let sid = A.LS.get('devsec'); if (!S.sections.some(s => s.id === sid)) sid = S.sectionId;
    const people = S.staff.filter(p => !p.is_owner);
    const mem = id => S.memberships.find(m => m.staff_id === id && m.section_id === sid) || null;
    const count = k => S.memberships.filter(m => m.section_id === sid && (m[k] || (m.role === 'admin' && !A.TOOL_PERMS.some(t => t[0] === k)))).length;
    root.innerHTML = `<div class="card">
      <div class="head"><div class="grow"><h2>لوحة المطوّر</h2><p class="sub" style="margin:2px 0 0">تظهر لحسابك فقط. كل صلاحيات النظام لكل المستخدمين — أي تغيير هنا يُحفظ فوراً ويُسجَّل في سجل العمليات.</p></div>
        <select class="in" id="dsec" style="max-width:220px">${S.sections.map(s => `<option value="${s.id}" ${s.id === sid ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="grid g4" style="margin-bottom:16px">
        <button class="kpi navy btnlike" data-dk="members"><span class="more">التفاصيل</span><div class="k">المستخدمون في القسم</div><div class="v">${AR(S.memberships.filter(m => m.section_id === sid).length)}</div><div class="d">لديهم حساب دخول: ${AR(people.filter(p => p.user_id && mem(p.id)).length)}</div></button>
        <button class="kpi btnlike" data-dk="admins"><span class="more">التفاصيل</span><div class="k">مديرو القسم والمشرفون</div><div class="v">${AR(S.memberships.filter(m => m.section_id === sid && m.role === 'admin').length)}</div><div class="d">مشرفون: ${AR(S.memberships.filter(m => m.section_id === sid && m.role === 'supervisor').length)}</div></button>
        <button class="kpi btnlike" data-dk="can_use_nisab"><span class="more">التفاصيل</span><div class="k">أداة النصاب</div><div class="v">${AR(count('can_use_nisab'))}</div><div class="d">مستخدم مُنح الصلاحية</div></button>
        <button class="kpi btnlike" data-dk="can_use_tt_builder"><span class="more">التفاصيل</span><div class="k">الجدول الآلي</div><div class="v">${AR(count('can_use_tt_builder'))}</div><div class="d">مستخدم مُنح الصلاحية</div></button>
      </div>
      <div class="sec-box" style="margin-bottom:14px"><b>من يملك كل صلاحية؟</b> <span class="small muted">اضغط على أي صلاحية لعرض أصحابها</span><div class="chip-filter" style="margin-top:8px">${ALLP().map(([k, l]) => `<button data-dk="${k}">${l} <span class="small">(${AR(count(k))})</span></button>`).join('')}</div></div>
      <div class="row" style="margin-bottom:10px"><input class="in" id="dq" placeholder="بحث بالاسم" style="max-width:260px"><label class="chk"><input type="checkbox" id="donly"> أعضاء القسم فقط</label></div>
      <div class="scroll" style="max-height:65vh"><table class="tbl" id="dt"><thead><tr><th>المستخدم</th><th>الدور</th>${ALLP().map(([k, l]) => `<th style="white-space:normal;min-width:84px;font-size:12px;text-align:center">${l}</th>`).join('')}</tr></thead><tbody></tbody></table></div>
      <p class="small muted">«مدير القسم» يملك كل صلاحيات القسم تلقائياً ما عدا الأداتين (النصاب والجدول الآلي) فتُمنحان صراحةً. حسابك (المالك) يملك كل شيء دائماً.</p></div>`;
    $('#dsec', root).onchange = e => { A.LS.set('devsec', e.target.value); V.dev(root); };
    const draw = () => {
      const q = A.normKey($('#dq', root).value), only = $('#donly', root).checked;
      $('#dt tbody', root).innerHTML = people.filter(p => (!q || A.normKey(p.full_name).includes(q)) && (!only || mem(p.id))).map(p => {
        const m = mem(p.id) || {}; const adm = m.role === 'admin';
        return `<tr data-s="${p.id}" style="${p.active ? '' : 'opacity:.5'}"><td><b>${esc(p.full_name)}</b><div class="small faint" dir="ltr" style="text-align:right">${esc(p.email || 'بلا حساب')}</div></td>
          <td><select class="in" data-r style="padding:5px 8px;min-width:120px"><option value="">غير مضاف</option>${Object.entries(ROLES).map(([k, l]) => `<option value="${k}" ${m.role === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
          ${ALLP().map(([k]) => { const tool = A.TOOL_PERMS.some(t => t[0] === k); return `<td style="text-align:center"><input type="checkbox" data-k="${k}" ${m[k] || (adm && !tool) ? 'checked' : ''} ${!m.role || (adm && !tool) ? 'disabled' : ''} style="width:18px;height:18px;accent-color:var(--blue)"></td>`; }).join('')}</tr>`;
      }).join('') || '<tr><td colspan="10" class="muted">لا يوجد مستخدمون</td></tr>';
      $$('#dt tbody tr[data-s]', root).forEach(tr => {
        const save = async () => {
          const st = tr.dataset.s, role = $('[data-r]', tr).value, ex = mem(st);
          if (!role) { if (ex) await api.deleteMembership(ex.id); }
          else { const rec = { staff_id: st, section_id: sid, role }; $$('[data-k]', tr).forEach(i => rec[i.dataset.k] = role === 'admin' && !A.TOOL_PERMS.some(t => t[0] === i.dataset.k) ? true : i.checked); if (!ex || ex.role !== role) Object.entries(A.ROLE_DEFAULTS[role] || {}).forEach(([k, v]) => { if (v) rec[k] = true; }); await api.upsertMembership(rec); }
          await A.refreshPeople(); V.dev(root); A.toast('حُفظت الصلاحيات', 'ok');
        };
        $('[data-r]', tr).onchange = () => A.run(null, save);
        $$('[data-k]', tr).forEach(i => i.onchange = () => A.run(null, save));
      });
    };
    $$('[data-dk]', root).forEach(b => b.onclick = () => {
      const k = b.dataset.dk; const ms = S.memberships.filter(m => m.section_id === sid);
      const list = k === 'members' ? ms : k === 'admins' ? ms.filter(m => m.role !== 'teacher') : ms.filter(m => m[k] || (m.role === 'admin' && !A.TOOL_PERMS.some(t => t[0] === k)));
      const title = k === 'members' ? 'المستخدمون في القسم' : k === 'admins' ? 'مديرو القسم والمشرفون' : (ALLP().find(x => x[0] === k) || [, ''])[1];
      A.modal(`<h3>${esc(title)} — ${esc(A.section().name)}</h3><div class="scroll" style="max-height:60vh"><table class="tbl"><thead><tr><th>المستخدم</th><th>الدور</th><th>الدخول</th></tr></thead><tbody>${list.map(m => { const p = A.person(m.staff_id) || {}; return `<tr><td><b>${esc(p.full_name || '')}</b><div class="small faint" dir="ltr" style="text-align:right">${esc(p.email || '')}</div></td><td>${ROLES[m.role]}</td><td>${p.user_id ? '<span class="pill st-approved">مفعّل</span>' : '<span class="pill st-empty">بلا حساب</span>'}</td></tr>`; }).join('') || '<tr><td colspan="3" class="muted">لا يوجد</td></tr>'}</tbody></table></div><p class="small muted">${S.me.is_owner ? 'حسابك (المالك) يملك كل الصلاحيات دائماً ولا يظهر هنا.' : ''}</p>`, { cls: 'wide' });
    });
    $('#dq', root).oninput = draw; $('#donly', root).onchange = draw; draw();
  };
})();
