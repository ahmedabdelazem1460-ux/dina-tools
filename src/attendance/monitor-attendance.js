/* منصة دينا — رصد الحضور لمراقب الدور (اليوم كاملاً أو بالحصة) باختيار المرحلة ← الصف ← الفصل،
   تنبيهات تلقائية للموجه الطلابي، وتقارير حضور تفاعلية متنوعة بهوية دينا. لا يُحذف شيء من البيانات. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR, DAYS, PER, I } = A;
  const PST = [['present', 'حاضر', 'ok'], ['absent', 'غائب', 'bad'], ['late', 'متأخر', 'warn'], ['excused', 'مستأذن', 'info'], ['early', 'خروج مبكر', 'info']];
  const stName = k => (PST.find(x => x[0] === k) || [])[1] || k;
  const today = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const mod = m => !!(A.hasModule && A.hasModule(m));
  const cName = id => (A.cls(id) || {}).name || '';
  const pct = (a, b) => b ? Math.round(a * 100 / b) : 0;
  const ORDER = ['رياض أطفال', 'ابتدائي', 'متوسط', 'ثانوي'];
  const GW = ['أول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سادس'];
  const stageOf = c => (A.stageOf ? A.stageOf(c) : (c.stage || '')) || 'أخرى';
  const gradeOf = c => (c.grade_word || '').trim() || (GW.find(g => (c.name || '').replace(/^ا/, 'أ').startsWith(g)) || c.name);
  const labelOf = c => (c.class_label || '').trim() || ((c.name || '').trim().split(/\s+/).pop()) || c.name;
  const REF_CAT = { absent: 'غياب عن الحصة', late: 'تأخر عن الحصة', early: 'خروج مبكر من الحصة', excused: 'استئذان من الحصة', present: 'متابعة حضور' };
  const classes = () => S.classes.filter(c => c.active !== false);
  const TIMED = ['late', 'early', 'excused'];
  const tLbl = k => k === 'late' ? 'وقت الوصول' : k === 'early' ? 'وقت الخروج' : 'وقت الاستئذان';
  const toMin = v => { const [h, m] = String(v || '0:0').split(':').map(Number); return h * 60 + (m || 0); };
  const nowHM = () => { const d = new Date(Date.now() + 3 * 36e5); return d.toISOString().slice(11, 16); };
  const hm = v => v ? AR(String(v).slice(0, 5)) : '';
  const recAt = v => v ? AR(new Date(new Date(v).getTime() + 3 * 36e5).toISOString().slice(11, 16)) : '';

  const css = `
  .ar-top{display:flex;flex-wrap:wrap;gap:10px;align-items:end;margin:12px 0}
  .ar-seg{display:inline-flex;border:1px solid var(--line,#D8E1EE);border-radius:10px;overflow:hidden}
  .ar-seg button{border:0;background:#fff;padding:8px 14px;font:inherit;cursor:pointer;color:#082B5A}
  .ar-seg button[aria-pressed=true]{background:#082B5A;color:#fff}
  .ar-seg button:focus-visible,.ar-chip:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}
  .ar-pk{background:#F4F8FC;border:1px solid #DCE7F3;border-radius:14px;padding:10px 12px;margin-bottom:12px}
  .ar-pk .r{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:4px 0}
  .ar-pk .r>span{min-width:62px;font-size:12.5px;color:#5F7896}
  .ar-chip{border:1px solid #CFDDEE;background:#fff;border-radius:999px;padding:5px 12px;font:inherit;font-size:13.5px;cursor:pointer;color:#082B5A}
  .ar-chip[aria-pressed=true]{background:#005499;border-color:#005499;color:#fff}
  .ar-chip .d{display:inline-block;width:8px;height:8px;border-radius:50%;background:#C9D6E6;margin-inline-start:6px;vertical-align:middle}
  .ar-chip .d.on{background:#2E8B57}
  .ar-chip[aria-pressed=true] .d.on{background:#BADF93}
  .ar-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;margin:6px 0 8px}
  .ar-tw{display:inline-flex;gap:4px;align-items:center}.ar-tw .pa-t{width:120px;padding:6px 8px}
  .pa-r.ar-r{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.ar-r .pa-nm{flex:1 1 160px;min-width:140px}.ar-r .pa-m{width:80px;flex:0 0 80px}.ar-r .pa-n{flex:1 1 140px;min-width:120px;max-width:240px}.ar-r [hidden]{display:none!important}
  @media (max-width:760px){.ar-r .pa-seg,.ar-r .pa-n{flex:1 1 100%;max-width:none}}
  .ar-ref{display:flex;align-items:center;gap:4px;font-size:12.5px;white-space:nowrap}
  .ar-al{border:1px solid #F1D3B3;background:#FFF8F0;border-radius:12px;padding:10px 12px;margin:12px 0}
  .ar-al h4{margin:0 0 6px;color:#9A4A0B}
  .ar-al .it{display:flex;gap:8px;justify-content:space-between;align-items:center;border-top:1px dashed #F1D3B3;padding:6px 0;flex-wrap:wrap}
  .rp2-t{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
  .rp2-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:10px 0}
  .rp2-k .k{display:block;margin:0;background:#fff;border:1px solid #DCE7F3;border-radius:12px;padding:10px 12px;box-shadow:none}
  .rp2-k .k b{display:block;font-size:22px;color:#082B5A}
  .rp2-k .k span{font-size:12.5px;color:#5F7896}
  .rp2-hm td{text-align:center;min-width:44px}
  .rp2-row{cursor:pointer}
  .rp2-row:hover td,.rp2-row:focus-visible td{background:#EEF6FC}
  @media (max-width:520px){.ar-pk .r>span{min-width:100%}}`;
  if (!document.getElementById('app50css')) { const st = document.createElement('style'); st.id = 'app50css'; st.textContent = css; document.head.appendChild(st); }

  // ---------- اختيار الفصل: المرحلة ← الصف ← الفصل ----------
  // st = { cid }، done(cid) => true إن كان الفصل مرصوداً، onPick(cid)
  A.attPicker = function (el, st, done, onPick, opts) {
    opts = opts || {};
    const cls = classes();
    const cur = cls.find(c => c.id === st.cid) || null;
    const stages = [...new Set(cls.map(stageOf))].sort((a, b) => (ORDER.indexOf(a) + 1 || 9) - (ORDER.indexOf(b) + 1 || 9));
    let sg = st.stage || (cur ? stageOf(cur) : stages[0]);
    if (opts.all && st.stage === '') sg = '';
    const inSg = cls.filter(c => !sg || stageOf(c) === sg);
    const grades = [...new Set(inSg.map(gradeOf))].sort((a, b) => (GW.indexOf(a) + 1 || 9) - (GW.indexOf(b) + 1 || 9));
    let gr = st.grade != null ? st.grade : (cur && stageOf(cur) === sg ? gradeOf(cur) : (opts.all ? '' : grades[0]));
    if (gr && !grades.includes(gr)) gr = opts.all ? '' : grades[0];
    const inGr = inSg.filter(c => !gr || gradeOf(c) === gr);
    const chip = (attr, v, l, on, extra) => `<button type="button" class="ar-chip" ${attr}="${esc(v)}" aria-pressed="${on}">${esc(l)}${extra || ''}</button>`;
    el.innerHTML = `<div class="ar-pk" role="group" aria-label="اختيار الفصل">
      <div class="r"><span>المرحلة</span>${opts.all ? chip('data-sg', '', 'الكل', !sg) : ''}${stages.map(x => chip('data-sg', x, x, x === sg)).join('')}</div>
      ${sg || !opts.all ? `<div class="r"><span>الصف</span>${opts.all ? chip('data-gr', '', 'الكل', !gr) : ''}${grades.map(x => chip('data-gr', x, x, x === gr)).join('')}</div>` : ''}
      ${gr || !opts.all ? `<div class="r"><span>الفصل</span>${opts.all ? chip('data-cl', '', 'الكل', !st.cid) : ''}${inGr.map(c => chip('data-cl', c.id, labelOf(c), c.id === st.cid, done ? `<i class="d ${done(c.id) ? 'on' : ''}" title="${done(c.id) ? 'مرصود' : 'لم يُرصد'}"></i>` : '')).join('')}</div>` : ''}</div>`;
    const go = cid => { st.cid = cid; onPick(cid); };
    $$('[data-sg]', el).forEach(b => b.onclick = () => { st.stage = b.dataset.sg; st.grade = opts.all ? '' : null; const f = classes().find(c => (!st.stage || stageOf(c) === st.stage)); if (opts.all) go(''); else go(f ? (classes().filter(c => stageOf(c) === st.stage).sort((a, b) => (a.sort || 0) - (b.sort || 0))[0] || f).id : ''); });
    $$('[data-gr]', el).forEach(b => b.onclick = () => { st.grade = b.dataset.gr; if (opts.all) go(''); else { const f = classes().find(c => stageOf(c) === sg && gradeOf(c) === st.grade); go(f ? f.id : ''); } });
    $$('[data-cl]', el).forEach(b => b.onclick = () => go(b.dataset.cl));
    return { stage: sg, grade: gr, ids: new Set((st.cid ? cls.filter(c => c.id === st.cid) : inGr).map(c => c.id)) };
  };

  // ---------- رصد الحضور: اليوم كاملاً أو بالحصة ----------
  A.attRecord = async function (box) {
    const st = { cid: A.LS.get('arcls') || '', stage: null, grade: null };
    let day = A.LS.get('arday') || today(); if (day > today()) day = today();
    let modeV = A.LS.get('armode') === 'period' ? 'period' : 'day';
    let p = null;
    if (!classes().some(c => c.id === st.cid)) st.cid = (classes()[0] || {}).id || '';
    box.innerHTML = `<div class="ar-top">
        <div class="field" style="margin:0"><label for="arD">اليوم</label><input type="date" class="in" id="arD" value="${day}" max="${today()}" style="max-width:180px"></div>
        <div class="field" style="margin:0"><label>نوع الرصد</label><div class="ar-seg" role="group" aria-label="نوع الرصد"><button type="button" data-md="day">اليوم كاملاً</button><button type="button" data-md="period">بالحصة</button></div></div>
        <div class="field" style="margin:0" id="arPW"><label for="arP">الحصة</label><select class="in" id="arP" style="max-width:220px"></select></div>
        <p class="small muted" style="margin:0;flex-basis:100%">«اليوم كاملاً» يُسجّل في الحضور الصباحي ويُطبَّق تلقائياً على حصص اليوم، و«بالحصة» لحصة محددة. كل رصد يظهر فوراً في «لوحة الحضور اللحظية»، والمُحال يصل للموجه الطلابي.</p></div>
      <div id="arPk"></div><div id="arL"></div>`;
    const P = () => (A.section() || {}).periods || 7;
    const fillP = () => {
      const tm = A.attTimes ? A.attTimes(st.cid) : [];
      if (p == null) { const cp = day === today() && A.curPeriod ? A.curPeriod(st.cid) : -1; p = cp >= 0 ? cp : +(A.LS.get('arper') || 0); }
      $('#arP', box).innerHTML = Array.from({ length: P() }, (_, i) => { const t = tm.find(x => x.i === i), e = A.attEntryOf ? A.attEntryOf(st.cid, day, i) : null; return `<option value="${i}" ${i === p ? 'selected' : ''}>الحصة ${PER[i] || AR(i + 1)}${t ? ` (${t.f}–${t.t})` : ''}${e && e.subject_id ? ' · ' + esc(A.subjName(e.subject_id)) : ''}</option>`; }).join('');
    };
    const setMode = () => { $$('[data-md]', box).forEach(b => b.setAttribute('aria-pressed', b.dataset.md === modeV)); $('#arPW', box).hidden = modeV !== 'period'; };
    let taken = new Set();
    const loadTaken = async () => {
      if (modeV === 'day') { const r = await api.list('attendance', { school_id: S.school.id, day }, { select: 'class_id' }).catch(() => []); taken = new Set(r.map(x => x.class_id)); }
      else { const r = await api.list('period_attendance', { school_id: S.school.id, day, period: p }, { select: 'class_id' }).catch(() => []); taken = new Set(r.map(x => x.class_id)); }
    };
    const picker = () => A.attPicker($('#arPk', box), st, id => taken.has(id), cid => { A.LS.set('arcls', cid); if (modeV === 'period') fillP(); picker(); list(); });

    async function list() {
      const L = $('#arL', box); L.innerHTML = '<div class="spinner"></div>';
      const cid = st.cid; if (!cid) { L.innerHTML = A.emptyBox('اختر الفصل'); return; }
      let stu = [], cur = [], daily = [], prev = [], refd = new Set();
      try {
        stu = await api.list('students', { class_id: cid, active: true }, { order: 'full_name' });
        if (modeV === 'day') cur = await api.list('attendance', { class_id: cid, day });
        else {
          const pa = await api.list('period_attendance', { class_id: cid, day });
          cur = pa.filter(x => x.period === p); prev = pa.filter(x => x.period < p).sort((a, b) => b.period - a.period);
          daily = await api.list('attendance', { class_id: cid, day }).catch(() => []);
          const bh = await api.list('behaviors', { class_id: cid, day, referred: true }, { select: 'student_id,category,note' }).catch(() => []);
          bh.filter(b => Object.values(REF_CAT).includes(b.category) && (b.note || '').startsWith(`الحصة ${AR(p + 1)}`)).forEach(b => refd.add(b.student_id));
        }
      } catch (er) { L.innerHTML = A.emptyBox('تعذّر التحميل', esc(er.message)); return; }
      if (!stu.length) { L.innerHTML = A.emptyBox('لا يوجد طلاب في هذا الفصل', 'تُستورد بيانات الطلاب من «الحضور والسلوك ← الطلاب».'); return; }
      const state = Object.fromEntries(stu.map(s => {
        const r = cur.find(x => x.student_id === s.id);
        if (r) return [s.id, { st: r.status, m: r.minutes, t: (r.time_at || '').slice(0, 5), n: r.note || '', ref: modeV === 'day' ? !!r.referred : refd.has(s.id), lock: modeV === 'period' && refd.has(s.id), src: '' }];
        if (modeV === 'period') {
          const d = daily.find(x => x.student_id === s.id); if (d && ['absent', 'excused'].includes(d.status)) return [s.id, { st: d.status, m: null, n: '', ref: false, src: 'من رصد اليوم كاملاً' }];
          const pv = prev.find(x => x.student_id === s.id); if (pv && ['absent', 'early'].includes(pv.status)) return [s.id, { st: pv.status === 'early' ? 'early' : 'absent', m: null, n: '', ref: false, src: `من الحصة ${PER[pv.period] || AR(pv.period + 1)}` }];
        }
        return [s.id, { st: 'present', m: null, n: '', ref: false, src: '' }];
      }));
      const c = A.cls(cid) || {}, e = modeV === 'period' && A.attEntryOf ? A.attEntryOf(cid, day, p) : null;
      const sum = () => PST.map(([k, l, cl]) => `<span class="pa-k ${cl}"><b>${AR(stu.filter(s => state[s.id].st === k).length)}</b>${l}</span>`).join('');
      L.innerHTML = `<div class="ar-bar"><div><b>${esc(c.name || '')}</b> <span class="small muted">· ${AR(stu.length)} طالب · ${modeV === 'day' ? 'اليوم كاملاً' : `الحصة ${PER[p] || AR(p + 1)}${e && e.subject_id ? ' · ' + esc(A.subjName(e.subject_id)) + (e.teacher_id ? ' — ' + esc(A.personName(e.teacher_id)) : '') : ''}`}${cur.length ? ' · <span class="pill st-approved">مرصود سابقاً — يمكنك التعديل</span>' : ''}</span></div>
          <div class="row" style="gap:6px"><input class="in" id="arQ" placeholder="بحث باسم الطالب" style="max-width:200px;padding:6px 10px" aria-label="بحث باسم الطالب"><button class="btn ghost sm" type="button" id="arAll">الكل حاضر</button></div></div>
        <div class="pa-sum" id="arS">${sum()}</div>
        <div class="pa-list">${stu.map((s, i) => `<div class="pa-r ar-r" data-s="${s.id}" data-nm="${esc(A.normKey ? A.normKey(s.full_name) : s.full_name)}"><span class="pa-i">${AR(i + 1)}</span><div class="pa-nm"><b>${esc(s.full_name)}</b>${state[s.id].src ? `<small>${esc(state[s.id].src)}</small>` : ''}${A.attWho ? A.attWho(cur.find(x => x.student_id === s.id)) : ''}</div>
          <div class="pa-seg" role="radiogroup" aria-label="حالة ${esc(s.full_name)}">${PST.map(([k, l, cl]) => `<button type="button" role="radio" class="${cl} ${state[s.id].st === k ? 'on' : ''}" data-st="${k}" aria-checked="${state[s.id].st === k}">${l}</button>`).join('')}</div>
          <span class="ar-tw" data-tw ${TIMED.includes(state[s.id].st) ? '' : 'hidden'}><input class="in pa-t" type="time" data-t value="${state[s.id].t || ''}" aria-label="${tLbl(state[s.id].st)}" title="${tLbl(state[s.id].st)}"><button type="button" class="btn ghost sm" data-now>الآن</button></span>
          <input class="in pa-m" type="number" min="1" max="240" placeholder="دقائق" data-m value="${state[s.id].m || ''}" aria-label="دقائق التأخر" ${state[s.id].st === 'late' ? '' : 'hidden'}>
          <input class="in pa-n" data-n value="${esc(state[s.id].n)}" placeholder="ملاحظة" aria-label="ملاحظة">
          <label class="ar-ref" title="${state[s.id].lock ? 'أُحيل سابقاً لهذه الحصة' : 'يصل للموجه الطلابي لحظياً'}"><input type="checkbox" data-r ${state[s.id].ref ? 'checked' : ''} ${state[s.id].lock ? 'disabled' : ''}> للموجه</label></div>`).join('')}</div>
        <div class="acts"><button class="btn ok" id="arGo" type="button">${I.check} حفظ ${modeV === 'day' ? 'حضور اليوم' : 'حضور الحصة'}</button></div>`;
      const redraw = () => { $('#arS', L).innerHTML = sum(); };
      const baseMin = () => { const tm = A.attTimes ? A.attTimes(cid) : []; const t = modeV === 'day' ? tm[0] : tm.find(x => x.i === p); return t ? t.from : 0; };
      $$('.pa-r', L).forEach(r => { const sid = r.dataset.s;
        $$('[data-st]', r).forEach(b => b.onclick = () => { state[sid].st = b.dataset.st; $$('[data-st]', r).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b); }); r.querySelector('[data-m]').hidden = b.dataset.st !== 'late'; const tw = r.querySelector('[data-tw]'); tw.hidden = !TIMED.includes(b.dataset.st); tw.querySelector('[data-t]').title = tLbl(b.dataset.st); tw.querySelector('[data-t]').setAttribute('aria-label', tLbl(b.dataset.st)); redraw(); });
        const setT = v => { state[sid].t = v; r.querySelector('[data-t]').value = v; if (state[sid].st === 'late' && v) { const mm = toMin(v) - baseMin(); if (mm > 0) { state[sid].m = mm; r.querySelector('[data-m]').value = mm; } } };
        r.querySelector('[data-t]').onchange = ev => setT(ev.target.value);
        r.querySelector('[data-now]').onclick = () => setT(nowHM());
        r.querySelector('[data-m]').oninput = ev => state[sid].m = ev.target.value ? +ev.target.value : null;
        r.querySelector('[data-n]').oninput = ev => state[sid].n = ev.target.value;
        r.querySelector('[data-r]').onchange = ev => state[sid].ref = ev.target.checked; });
      $('#arQ', L).oninput = ev => { const q = A.normKey ? A.normKey(ev.target.value) : ev.target.value; $$('.pa-r', L).forEach(r => r.hidden = !!q && !r.dataset.nm.includes(q)); };
      $('#arAll', L).onclick = () => { stu.forEach(s => state[s.id].st = 'present'); $$('.pa-r', L).forEach(r => { $$('[data-st]', r).forEach(x => { const on = x.dataset.st === 'present'; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); }); r.querySelector('[data-m]').hidden = true; r.querySelector('[data-tw]').hidden = true; }); redraw(); };
      $('#arGo', L).onclick = ev => A.run(ev.currentTarget, async () => {
        const nowIso = new Date().toISOString();
        if (modeV === 'day') {
          const rows = stu.map(s => ({ school_id: S.school.id, student_id: s.id, class_id: cid, day, status: state[s.id].st, minutes: state[s.id].st === 'late' ? state[s.id].m : null, note: state[s.id].n || '', referred: !!state[s.id].ref, time_at: TIMED.includes(state[s.id].st) && state[s.id].t ? state[s.id].t : null, by_staff: S.me.id, updated_at: nowIso }));
          await api.ups('attendance', rows, 'student_id,day');
        } else {
          const rows = stu.map(s => ({ s: s.id, st: state[s.id].st, m: state[s.id].st === 'late' && state[s.id].m ? String(state[s.id].m) : '', t: TIMED.includes(state[s.id].st) && state[s.id].t ? state[s.id].t : '', n: state[s.id].n || '' }));
          try { await api.rpc('save_period_attendance', { p_class: cid, p_day: day, p_period: p, p_rows: rows }); } catch (er) { throw new Error(er.message === 'no permission' ? 'ليست لديك صلاحية رصد هذا الفصل' : er.message === 'future day' ? 'لا يمكن الرصد ليوم قادم' : er.message); }
          const refs = stu.filter(s => state[s.id].ref && !state[s.id].lock).map(s => ({ school_id: S.school.id, student_id: s.id, class_id: cid, day, kind: 'negative', category: REF_CAT[state[s.id].st] || 'متابعة حضور', points: 0, referred: true, by_staff: S.me.id,
            note: `الحصة ${AR(p + 1)}${e && e.subject_id ? ' · ' + A.subjName(e.subject_id) : ''}${state[s.id].st === 'late' && state[s.id].m ? ' · ' + AR(state[s.id].m) + ' د' : ''}${state[s.id].n ? ' — ' + state[s.id].n : ''}` }));
          if (refs.length) await api.ins('behaviors', refs);
        }
        const ab = stu.filter(s => state[s.id].st === 'absent').length, lt = stu.filter(s => state[s.id].st === 'late').length, rf = stu.filter(s => state[s.id].ref && !state[s.id].lock).length;
        A.toast(`حُفظ حضور ${c.name || ''}: غائب ${AR(ab)} · متأخر ${AR(lt)}${rf ? ` · أُحيل ${AR(rf)} للموجه` : ''}`, 'ok');
        await loadTaken(); picker(); list();
      });
    }
    $('#arD', box).onchange = async ev => { day = ev.target.value > today() ? today() : ev.target.value; A.LS.set('arday', day); p = null; if (modeV === 'period') fillP(); await loadTaken(); picker(); list(); };
    $$('[data-md]', box).forEach(b => b.onclick = async () => { modeV = b.dataset.md; A.LS.set('armode', modeV); setMode(); if (modeV === 'period') fillP(); await loadTaken(); picker(); list(); });
    $('#arP', box).onchange = async ev => { p = +ev.target.value; A.LS.set('arper', String(p)); await loadTaken(); picker(); list(); };
    setMode(); if (modeV === 'period') fillP(); else p = p == null ? 0 : p;
    await loadTaken(); picker(); list();
  };

  // ---------- تنبيهات تلقائية للموجه الطلابي ----------
  A.attAlerts = async function (el, STU) {
    if (!el) return;
    const from = new Date(Date.now() + 3 * 36e5 - 30 * 864e5).toISOString().slice(0, 10);
    const [att, pa] = await Promise.all([api.list('attendance', { school_id: S.school.id }, { gte: { day: from }, lte: { day: today() }, select: 'student_id,class_id,day,status' }).catch(() => []), api.list('period_attendance', { school_id: S.school.id, day: today() }, { select: 'student_id,class_id,period,status' }).catch(() => [])]);
    const sn = id => (STU.find(s => s.id === id) || {}).full_name || '—', sc = id => cName((STU.find(s => s.id === id) || {}).class_id);
    const cnt = (k) => { const o = {}; att.filter(a => a.status === k).forEach(a => o[a.student_id] = (o[a.student_id] || 0) + 1); return o; };
    const ab = cnt('absent'), lt = cnt('late'), dayAb = new Set(att.filter(a => a.day === today() && a.status === 'absent').map(a => a.student_id));
    const pAb = {}; pa.filter(x => x.status === 'absent' && !dayAb.has(x.student_id)).forEach(x => pAb[x.student_id] = (pAb[x.student_id] || 0) + 1);
    const items = [].concat(
      Object.entries(ab).filter(([, n]) => n >= 3).map(([id, n]) => ({ id, w: n * 3, t: `غياب متكرر: ${AR(n)} أيام خلال ٣٠ يوماً` })),
      Object.entries(lt).filter(([, n]) => n >= 3).map(([id, n]) => ({ id, w: n * 2, t: `تأخر متكرر: ${AR(n)} مرات خلال ٣٠ يوماً` })),
      Object.entries(pAb).filter(([, n]) => n >= 2).map(([id, n]) => ({ id, w: n * 2, t: `غياب عن ${AR(n)} حصص اليوم مع حضوره صباحاً` }))).sort((a, b) => b.w - a.w);
    if (!items.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<section class="ar-al" aria-label="تنبيهات تلقائية"><h4>تنبيهات تلقائية للموجه (${AR(items.length)})</h4><p class="small muted" style="margin:0 0 4px">تُحسب من رصد الحضور ولا تُحفظ إلا إذا اخترت «فتح متابعة».</p>
      ${items.slice(0, 30).map(x => `<div class="it"><div><b>${esc(sn(x.id))}</b> <span class="small muted">· ${esc(sc(x.id))}</span><div class="small">${x.t}</div></div>${mod('counselor') || S.me.is_owner ? `<button class="btn ghost sm" data-fo="${x.id}" data-t="${esc(x.t)}">فتح متابعة</button>` : ''}</div>`).join('')}</section>`;
    $$('[data-fo]', el).forEach(b => b.onclick = () => A.run(b, async () => {
      const s = STU.find(x => x.id === b.dataset.fo) || {};
      await api.ins('behaviors', { school_id: S.school.id, student_id: s.id, class_id: s.class_id, day: today(), kind: 'negative', category: 'متابعة حضور', points: 0, referred: true, status: 'in_progress', note: b.dataset.t, by_staff: S.me.id });
      A.toast('فُتحت متابعة للطالب في «الإحالات»', 'ok'); if (A._attRefresh) A._attRefresh();
    }));
  };

  // ---------- تقارير الحضور التفاعلية ----------
  const svgBars = (data, color, h) => {
    h = h || 160; if (!data.length) return '';
    const mx = Math.max(1, ...data.map(d => d.v)), w = Math.max(320, data.length * 34), bw = Math.min(26, (w - 20) / data.length - 6);
    return `<svg viewBox="0 0 ${w} ${h + 34}" width="${w}" height="${h + 34}" style="max-width:100%;height:auto;display:block" role="img" aria-label="رسم بياني">${data.map((d, i) => { const bh = Math.round((d.v / mx) * h), x = 10 + i * ((w - 20) / data.length) + 3, y = h - bh + 4;
      return `<g><title>${esc(d.l)}: ${d.v}</title><rect x="${x}" y="${y}" width="${bw}" height="${Math.max(bh, d.v ? 2 : 0)}" rx="4" fill="${d.c || color || '#005499'}"/><text x="${x + bw / 2}" y="${y - 3}" font-size="10" text-anchor="middle" fill="#082B5A">${AR(d.v)}</text><text x="${x + bw / 2}" y="${h + 20}" font-size="9.5" text-anchor="middle" fill="#5F7896">${esc(d.s || d.l)}</text></g>`; }).join('')}</svg>`;
  };
  const bar = (p, c) => `<span style="display:inline-flex;align-items:center;gap:6px;min-width:110px"><i style="display:inline-block;flex:1;min-width:60px;height:7px;border-radius:99px;background:#E4EBF5;overflow:hidden"><s style="display:block;height:100%;width:${p}%;background:${c || '#005499'};text-decoration:none"></s></i><b>${AR(p)}٪</b></span>`;

  A.attReports = async function (box, ctx) {
    const STU = (ctx && ctx.STU) || await api.list('students', { school_id: S.school.id, active: true }, { order: 'full_name' });
    const st = { cid: '', stage: '', grade: '' };
    const d0 = new Date(Date.now() + 3 * 36e5 - 30 * 864e5).toISOString().slice(0, 10);
    let from = A.LS.get('rp2f') || d0, to = A.LS.get('rp2t') || today(), tab = A.LS.get('rp2tab') || 'sum', sortK = 'ab';
    const TABS = [['sum', 'الملخص'], ['cls', 'الفصول'], ['stu', 'الطلاب'], ['per', 'الحصص والمواد'], ['late', 'التأخر والاستئذان'], ['ref', 'الإحالات']];
    const iso = d => new Date(d.getTime() + 3 * 36e5).toISOString().slice(0, 10);
    const addD = (d, n) => { const x = A.parseDate(d); x.setDate(x.getDate() + n); return iso(x); };
    const nDays = () => (A.section() || {}).days || 5;
    const wkStart = d => { const x = A.parseDate(d); x.setDate(x.getDate() - x.getDay()); return iso(x); };
    const WKS = (S.weeks || []).filter(w => w.start_date).slice().sort((a, b) => b.start_date.localeCompare(a.start_date));
    const PRE = [['', 'فترة مخصصة'], ['today', 'اليوم'], ['week', 'هذا الأسبوع'], ['lweek', 'الأسبوع الماضي'], ['month', 'هذا الشهر'], ['term', 'الفصل الدراسي (من أول أسبوع)']].concat(WKS.map(w => ['w:' + w.id, `الأسبوع ${w.word || AR(w.number)} (${AR(w.start_date)})`]));
    const preRange = k => { const t = today(); if (k === 'today') return [t, t]; if (k === 'week') return [wkStart(t), t]; if (k === 'lweek') { const s0 = addD(wkStart(t), -7); return [s0, addD(s0, nDays() - 1)]; } if (k === 'month') return [t.slice(0, 8) + '01', t];
      if (k === 'term') { const f = WKS.length ? WKS[WKS.length - 1].start_date : d0; return [f, t]; } if (k.startsWith('w:')) { const w = WKS.find(x => x.id === k.slice(2)); if (w) { const e = addD(w.start_date, nDays() - 1); return [w.start_date, e > t ? t : e]; } } return null; };
    box.innerHTML = `<div class="ar-top"><div class="field" style="margin:0"><label for="rpPre">الفترة</label><select class="in" id="rpPre" style="max-width:260px">${PRE.map(([k, l]) => `<option value="${k}" ${k === (A.LS.get('rp2pre') || '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div><div class="field" style="margin:0"><label for="rpF">من</label><input type="date" class="in" id="rpF" value="${from}" style="max-width:170px"></div><div class="field" style="margin:0"><label for="rpT">إلى</label><input type="date" class="in" id="rpT" value="${to}" max="${today()}" style="max-width:170px"></div>
      <div class="row" style="gap:6px"><button class="btn ghost sm" id="rpX">${I.down || ''} Excel</button><button class="btn ghost sm" id="rpP">${I.print || ''} طباعة / PDF</button></div></div>
      <div id="rpPk"></div><div class="rp2-t" role="tablist">${TABS.map(([k, l]) => `<button class="ar-chip" role="tab" data-tb="${k}" aria-pressed="${k === tab}">${l}</button>`).join('')}</div><div id="rpO"><div class="spinner"></div></div>`;
    let D = null, scope = null;
    const load = async () => {
      $('#rpO', box).innerHTML = '<div class="spinner"></div>';
      const [att, pa, bh] = await Promise.all([
        api.list('attendance', { school_id: S.school.id }, { gte: { day: from }, lte: { day: to } }).catch(() => []),
        api.list('period_attendance', { school_id: S.school.id }, { gte: { day: from }, lte: { day: to } }).catch(() => []),
        api.list('behaviors', { school_id: S.school.id, referred: true }, { gte: { day: from }, lte: { day: to } }).catch(() => [])]);
      D = { att, pa, bh };
    };
    const compute = () => {
      const ids = scope.ids, inS = x => ids.has(x.class_id);
      const att = D.att.filter(inS), pa = D.pa.filter(inS), bh = D.bh.filter(inS), stu = STU.filter(s => ids.has(s.class_id));
      const R = {}; stu.forEach(s => R[s.id] = { s, days: 0, ab: 0, lt: 0, ltm: 0, ex: 0, ea: 0, pab: 0, plt: 0, ref: 0 });
      att.forEach(a => { const r = R[a.student_id]; if (!r) return; r.days++; if (a.status === 'absent') r.ab++; if (a.status === 'late') { r.lt++; r.ltm += a.minutes || 0; } if (a.status === 'excused') r.ex++; if (a.status === 'early') r.ea++; if (a.referred) r.ref++; });
      pa.forEach(a => { const r = R[a.student_id]; if (!r) return; if (a.status === 'absent') r.pab++; if (a.status === 'late') { r.plt++; r.ltm += a.minutes || 0; } });
      bh.forEach(b => { const r = R[b.student_id]; if (r) r.ref++; });
      const rows = Object.values(R);
      const byDay = {}; att.forEach(a => { const o = byDay[a.day] = byDay[a.day] || { n: 0, ab: 0, lt: 0, pab: 0 }; o.n++; if (a.status === 'absent') o.ab++; if (a.status === 'late') o.lt++; });
      pa.forEach(a => { const o = byDay[a.day] = byDay[a.day] || { n: 0, ab: 0, lt: 0, pab: 0 }; if (a.status === 'absent') o.pab++; });
      const byCls = {}; classes().filter(c => ids.has(c.id)).forEach(c => byCls[c.id] = { c, n: stu.filter(s => s.class_id === c.id).length, days: 0, ab: 0, lt: 0, pab: 0, pn: 0 });
      att.forEach(a => { const o = byCls[a.class_id]; if (!o) return; o.days++; if (a.status === 'absent') o.ab++; if (a.status === 'late') o.lt++; });
      pa.forEach(a => { const o = byCls[a.class_id]; if (!o) return; o.pn++; if (a.status === 'absent') o.pab++; });
      const tot = { days: att.length, ab: att.filter(a => a.status === 'absent').length, lt: att.filter(a => a.status === 'late').length + pa.filter(a => a.status === 'late').length, pn: pa.length, pab: pa.filter(a => a.status === 'absent').length, ltm: rows.reduce((s, r) => s + r.ltm, 0), refOpen: bh.filter(b => b.status !== 'closed').length, ref: bh.length + att.filter(a => a.referred).length };
      return { att, pa, bh, stu, rows, byDay, byCls, tot };
    };
    const views = {
      sum: X => { const t = X.tot;
        const stg = {}; Object.values(X.byCls).forEach(o => { const k = stageOf(o.c); const g = stg[k] = stg[k] || { n: 0, days: 0, ab: 0, lt: 0, dd: new Set() }; g.n += o.n; g.days += o.days; g.ab += o.ab; g.lt += o.lt; }); X.att.forEach(a => { const c = A.cls(a.class_id); if (c && stg[stageOf(c)]) stg[stageOf(c)].dd.add(a.day); });
        return `<div class="rp2-k">${[[t.days ? AR(pct(t.days - t.ab, t.days)) + '٪' : '—', 'نسبة الحضور اليومي', 'rate', '#2E8B57'], [AR(t.ab), 'أيام غياب', 'ab', '#C53030'], [t.pn ? AR(pct(t.pn - t.pab, t.pn)) + '٪' : '—', 'نسبة الحضور في الحصص', 'prate', '#005499'], [AR(t.pab), 'غياب عن حصص', 'pab', '#E0822B'], [AR(t.lt), 'حالات تأخر', 'lt', '#E0822B'], [AR(t.ltm), 'دقائق تأخر', 'ltm', '#9A4A0B'], [AR(t.ref), 'إحالات للموجه', 'ref', '#AE95DA'], [AR(t.refOpen), 'إحالات مفتوحة', 'refOpen', '#AE95DA']].map(([v, l, k, c]) => `<button type="button" class="k dd-k" data-dk="${k}" style="text-align:start;font:inherit;border-inline-start:4px solid ${c}"><span>${l}</span><b style="color:${c}">${v}</b></button>`).join('')}</div>
          <div id="rpCh"></div>
          <h3>الحضور حسب المرحلة</h3><p class="small muted">اضغط المرحلة لحصر التقرير عليها، أو اضغط الرقم لعرض تفاصيله.</p><div class="scroll"><table class="tbl"><thead><tr><th>المرحلة</th><th>عدد الطلاب</th><th>أيام الرصد</th><th>حالات الغياب</th><th>متوسط الغائبين يومياً</th><th>حالات التأخر</th><th>نسبة الحضور</th></tr></thead><tbody>${Object.entries(stg).map(([k, g]) => `<tr class="rp2-row" tabindex="0" data-gostg="${esc(k)}"><th>${esc(k)}</th><td><button type="button" class="dd-n" data-dk="sgn:${esc(k)}">${AR(g.n)}</button></td><td>${AR(g.dd.size)}</td><td><button type="button" class="dd-n" data-dk="sgab:${esc(k)}">${AR(g.ab)}</button></td><td>${g.dd.size ? AR(Math.round(g.ab / g.dd.size * 10) / 10) : '—'}</td><td><button type="button" class="dd-n" data-dk="sglt:${esc(k)}">${AR(g.lt)}</button></td><td>${g.days ? bar(pct(g.days - g.ab, g.days), '#2E8B57') : '—'}</td></tr>`).join('')}</tbody></table></div>`; },
      cls: X => `<p class="small muted">اضغط على الفصل لعرض طلابه، أو على الرقم لعرض تفاصيله.</p><div class="scroll"><table class="tbl"><thead><tr><th>الفصل</th><th>المرحلة</th><th>الطلاب</th><th>نسبة الحضور اليومي</th><th>أيام غياب</th><th>تأخر</th><th>غياب حصص</th><th>نسبة حضور الحصص</th></tr></thead><tbody>${Object.values(X.byCls).sort((a, b) => pct(a.days - a.ab, a.days) - pct(b.days - b.ab, b.days)).map(o => `<tr class="rp2-row" tabindex="0" data-gocls="${o.c.id}"><th>${esc(o.c.name)}</th><td>${esc(stageOf(o.c))}</td><td>${AR(o.n)}</td><td>${o.days ? bar(pct(o.days - o.ab, o.days), '#2E8B57') : '—'}</td><td><button type="button" class="dd-n" data-dk="cab:${o.c.id}">${AR(o.ab)}</button></td><td><button type="button" class="dd-n" data-dk="clt:${o.c.id}">${AR(o.lt)}</button></td><td><button type="button" class="dd-n" data-dk="cpab:${o.c.id}">${AR(o.pab)}</button></td><td>${o.pn ? bar(pct(o.pn - o.pab, o.pn), '#005499') : '—'}</td></tr>`).join('')}</tbody></table></div>`,
      stu: X => { const K = { ab: 'أيام الغياب', pab: 'غياب الحصص', lt: 'التأخر', ref: 'الإحالات' }; const rows = X.rows.slice().sort((a, b) => (b[sortK] - a[sortK]) || (b.ab - a.ab) || a.s.full_name.localeCompare(b.s.full_name, 'ar'));
        return `<div class="row" style="gap:6px;margin-bottom:6px"><span class="small muted">ترتيب حسب:</span>${Object.entries(K).map(([k, l]) => `<button class="ar-chip" data-sk="${k}" aria-pressed="${k === sortK}">${l}</button>`).join('')}<span class="small muted">· اضغط على الطالب لتقريره الشامل</span></div>
          <div class="row" style="gap:6px;margin-bottom:8px;flex-wrap:wrap"><input class="in" id="rpQ" placeholder="بحث باسم الطالب أو رقمه" style="max-width:240px;padding:6px 10px" aria-label="بحث باسم الطالب"><button class="btn sm" id="rpAllP" type="button">${I.print || ''} طباعة تقارير الطلاب (كل طالب في صفحة)</button><span class="small muted">تُطبع تقارير الطلاب الظاهرين في الجدول بعد البحث والتصفية.</span></div>
          <div class="scroll"><table class="tbl"><thead><tr><th>#</th><th>الطالب</th><th>الفصل</th><th>أيام رُصد فيها</th><th>أيام الغياب</th><th>غياب حصص</th><th>تأخر</th><th>دقائق</th><th>مستأذن</th><th>خروج مبكر</th><th>إحالات</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="rp2-row" tabindex="0" data-gostu="${r.s.id}" data-q="${esc((A.normKey ? A.normKey(r.s.full_name) : r.s.full_name) + ' ' + (r.s.student_no || ''))}"><td>${AR(i + 1)}</td><th>${esc(r.s.full_name)}</th><td>${esc(cName(r.s.class_id))}</td><td>${AR(r.days)}</td><td>${r.ab ? `<button type="button" class="dd-n pill st-returned" data-dk="sab:${r.s.id}">${AR(r.ab)}</button>` : '—'}</td><td>${r.pab ? `<button type="button" class="dd-n" data-dk="spab:${r.s.id}">${AR(r.pab)}</button>` : '—'}</td><td>${r.lt + r.plt ? AR(r.lt + r.plt) : '—'}</td><td>${r.ltm ? AR(r.ltm) : '—'}</td><td>${r.ex ? AR(r.ex) : '—'}</td><td>${r.ea ? AR(r.ea) : '—'}</td><td>${r.ref ? AR(r.ref) : '—'}</td></tr>`).join('')}</tbody></table></div>`; },
      per: X => { const P = (A.section() || {}).periods || 7, wd = [0, 1, 2, 3, 4]; const hm = {}; let mx = 1; X.pa.filter(a => a.status === 'absent').forEach(a => { const k = A.parseDate(a.day).getDay() + '|' + a.period; hm[k] = (hm[k] || 0) + 1; mx = Math.max(mx, hm[k]); });
        const sub = {}; X.pa.forEach(a => { const k = a.subject_id || '-'; const o = sub[k] = sub[k] || { n: 0, ab: 0, lt: 0 }; o.n++; if (a.status === 'absent') o.ab++; if (a.status === 'late') o.lt++; });
        return `<h3>خريطة غياب الحصص (اليوم × الحصة)</h3><p class="small muted">كلما اشتد اللون زاد الغياب في تلك الحصة.</p><div class="scroll"><table class="tbl rp2-hm"><thead><tr><th>اليوم</th>${Array.from({ length: P }, (_, p) => `<th>${PER[p] || AR(p + 1)}</th>`).join('')}</tr></thead><tbody>${wd.map(d => `<tr><th>${DAYS[d]}</th>${Array.from({ length: P }, (_, p) => { const v = hm[d + '|' + p] || 0; return `<td style="background:rgba(197,48,48,${v ? (0.12 + 0.6 * v / mx).toFixed(2) : 0});${v / mx > 0.6 ? 'color:#fff' : ''}">${v ? AR(v) : '·'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
          <h3>حسب المادة</h3><table class="tbl"><thead><tr><th>المادة</th><th>رصد</th><th>غياب</th><th>تأخر</th><th>نسبة الحضور</th></tr></thead><tbody>${Object.entries(sub).sort((a, b) => b[1].ab - a[1].ab).map(([k, o]) => `<tr><th>${esc(k === '-' ? 'بلا مادة' : A.subjName(k))}</th><td>${AR(o.n)}</td><td>${AR(o.ab)}</td><td>${AR(o.lt)}</td><td>${bar(pct(o.n - o.ab, o.n), '#005499')}</td></tr>`).join('') || '<tr><td colspan="5">لا رصد للحصص في هذه الفترة.</td></tr>'}</tbody></table>`; },
      late: X => { const sn = id => (STU.find(s => s.id === id) || {}).full_name || '—'; const L = X.att.filter(a => ['late', 'excused', 'early'].includes(a.status)).map(a => ({ ...a, per: 'الصباحي' })).concat(X.pa.filter(a => ['late', 'excused', 'early'].includes(a.status)).map(a => ({ ...a, per: 'الحصة ' + AR(a.period + 1) }))).sort((a, b) => b.day.localeCompare(a.day));
        return `<div class="scroll"><table class="tbl"><thead><tr><th>التاريخ</th><th>الطالب</th><th>الفصل</th><th>الحالة</th><th>متى</th><th>وقت الوصول/الخروج</th><th>الدقائق</th><th>وقت الرصد</th><th>ملاحظة</th></tr></thead><tbody>${L.map(a => `<tr><td>${esc(A.arDate(a.day))}</td><th>${esc(sn(a.student_id))}</th><td>${esc(cName(a.class_id))}</td><td>${stName(a.status)}</td><td>${a.per}</td><td>${hm(a.time_at) || '—'}</td><td>${a.minutes ? AR(a.minutes) : '—'}</td><td>${recAt(a.updated_at)}</td><td class="small">${esc(a.note || '')}</td></tr>`).join('') || '<tr><td colspan="9">لا يوجد.</td></tr>'}</tbody></table></div>`; },
      ref: X => { const sn = id => (STU.find(s => s.id === id) || {}).full_name || '—'; const SS = { open: 'جديد', in_progress: 'قيد المتابعة', closed: 'مغلق' };
        const L = X.bh.map(b => ({ d: b.day, s: b.student_id, c: b.class_id, r: b.category + (b.note ? ' — ' + b.note : ''), st: SS[b.status] || 'جديد', by: b.by_staff, act: b.counselor_note || '' })).concat(X.att.filter(a => a.referred).map(a => ({ d: a.day, s: a.student_id, c: a.class_id, r: stName(a.status) + ' (اليوم كاملاً)' + (a.note ? ' — ' + a.note : ''), st: 'إحالة حضور', by: a.by_staff, act: '' }))).sort((a, b) => b.d.localeCompare(a.d));
        const bySt = {}; L.forEach(x => bySt[x.st] = (bySt[x.st] || 0) + 1);
        return `<div class="rp2-k">${Object.entries(bySt).map(([k, v]) => `<button type="button" class="k dd-k" data-dk="rst:${esc(k)}" style="text-align:start;font:inherit"><span>${k}</span><b>${AR(v)}</b></button>`).join('') || '<div class="k"><span>الإحالات</span><b>٠</b></div>'}</div><div class="scroll"><table class="tbl"><thead><tr><th>التاريخ</th><th>الطالب</th><th>الفصل</th><th>السبب</th><th>الحالة</th><th>المُحيل</th><th>إجراء الموجه</th></tr></thead><tbody>${L.map(x => `<tr><td>${esc(A.arDate(x.d))}</td><th>${esc(sn(x.s))}</th><td>${esc(cName(x.c))}</td><td class="small">${esc(x.r)}</td><td>${x.st}</td><td class="small">${esc(A.personName(x.by) || '')}</td><td class="small">${esc(x.act)}</td></tr>`).join('') || '<tr><td colspan="7">لا إحالات في هذه الفترة.</td></tr>'}</tbody></table></div>`; },
    };
    let X = null;
    const render = () => {
      X = compute();
      $('#rpO', box).innerHTML = X.stu.length ? views[tab](X) : A.emptyBox('لا يوجد طلاب في هذا النطاق');
      $$('[data-gocls]', box).forEach(r => { const go = () => { st.cid = r.dataset.gocls; const c = A.cls(st.cid) || {}; st.stage = stageOf(c); st.grade = gradeOf(c); tab = 'stu'; A.LS.set('rp2tab', tab); pick(); }; r.onclick = go; r.onkeydown = ev => { if (ev.key === 'Enter') go(); }; });
      $$('[data-gostu]', box).forEach(r => { const go = () => stuReport(r.dataset.gostu); r.onclick = go; r.onkeydown = ev => { if (ev.key === 'Enter') go(); }; });
      $$('[data-sk]', box).forEach(b => b.onclick = () => { sortK = b.dataset.sk; render(); });
      $$('[data-dk]', box).forEach(b => b.onclick = ev => { ev.stopPropagation(); drill(b.dataset.dk); });
      $$('[data-gostg]', box).forEach(r => { const go = () => { st.stage = r.dataset.gostg; st.grade = ''; st.cid = ''; pick(); }; r.onclick = go; r.onkeydown = ev => { if (ev.key === 'Enter') go(); }; });
      if ($('#rpCh', box)) { const days = Object.keys(X.byDay).sort(); A.attChart($('#rpCh', box), days.map(d => ({ d, a: X.byDay[d].ab, p: X.byDay[d].pab, r: X.byDay[d].n ? pct(X.byDay[d].n - X.byDay[d].ab, X.byDay[d].n) : null })), d => drill('day:' + d)); }
      const q = $('#rpQ', box); if (q) q.oninput = ev => { const v = A.normKey ? A.normKey(ev.target.value) : ev.target.value; $$('[data-gostu]', box).forEach(r => r.hidden = !!v && !r.dataset.q.includes(v)); };
      const ap = $('#rpAllP', box); if (ap) ap.onclick = () => { const ids = $$('[data-gostu]', box).filter(r => !r.hidden).map(r => r.dataset.gostu); if (!ids.length) return A.toast('لا طلاب ظاهرون', 'warn'); A.printDoc(`تقارير الحضور للطلاب — ${scopeTxt()}`, `${A.cnt(ids.length, 'طالب', 'طلاب')} · من ${A.arDate(from)} إلى ${A.arDate(to)}`, ids.map((id, i) => `<section style="${i ? 'page-break-before:always;break-before:page;' : ''}">${stuBody(id, true)}</section>`).join(''), false); };
    };
    function drill(key) {
      const [k, a] = [key.split(':')[0], key.split(':').slice(1).join(':')];
      const sN = id => (STU.find(s => s.id === id) || {}).full_name || '—', rng = `${esc(scopeTxt())} · من ${A.arDate(from)} إلى ${A.arDate(to)}`;
      const cOf = id => A.cls(id) || {}, inStg = x => stageOf(cOf(x.class_id)) === a;
      const recs = (list, title, sortMin) => A.attDrill({ title, sub: rng, cols: ['التاريخ', 'الطالب', 'الفصل', 'الحالة', 'الوقت', 'الدقائق', 'ملاحظة'],
        rows: list.slice().sort((x, y) => sortMin ? (y.minutes || 0) - (x.minutes || 0) : (y.day.localeCompare(x.day) || sN(x.student_id).localeCompare(sN(y.student_id), 'ar'))).map(x => ({ cells: [esc(A.arDate(x.day, true)), `<b>${esc(sN(x.student_id))}</b>`, esc(cName(x.class_id)), stName(x.status) + (x.period != null ? ' · الحصة ' + AR(x.period + 1) : ' · اليوم كاملاً'), hm(x.time_at), x.minutes ? AR(x.minutes) : '', esc(x.note || '')], q: sN(x.student_id) + ' ' + cName(x.class_id),
          x: { 'التاريخ': x.day, 'الطالب': sN(x.student_id), 'الفصل': cName(x.class_id), 'الحالة': stName(x.status), 'الحصة': x.period != null ? x.period + 1 : 'اليوم كاملاً', 'الوقت': (x.time_at || '').slice(0, 5), 'الدقائق': x.minutes || '', 'ملاحظة': x.note || '' } })) });
      const late = l => l.filter(x => x.status === 'late');
      const clsTbl = (title, per) => A.attDrill({ title, sub: rng, cols: ['الفصل', 'الطلاب', 'سجلات الرصد', 'الغياب', 'نسبة الحضور'], rows: Object.values(X.byCls).map(o => { const n = per ? o.pn : o.days, ab = per ? o.pab : o.ab; return { cells: [`<b>${esc(o.c.name)}</b>`, AR(o.n), AR(n), AR(ab), n ? AR(pct(n - ab, n)) + '٪' : '—'], q: o.c.name }; }) });
      const refs = st0 => { const SS = { open: 'جديد', in_progress: 'قيد المتابعة', closed: 'مغلق' }; const L = X.bh.map(b => ({ d: b.day, s: b.student_id, c: b.class_id, r: b.category + (b.note ? ' — ' + b.note : ''), st: SS[b.status] || 'جديد', act: b.counselor_note || '' })).concat(X.att.filter(x => x.referred).map(x => ({ d: x.day, s: x.student_id, c: x.class_id, r: stName(x.status) + ' (اليوم كاملاً)', st: 'إحالة حضور', act: '' }))).filter(x => !st0 || x.st === st0 || (st0 === '*open' && x.st !== 'مغلق'));
        A.attDrill({ title: 'الإحالات للموجه', sub: rng, cols: ['التاريخ', 'الطالب', 'الفصل', 'السبب', 'الحالة', 'إجراء الموجه'], rows: L.sort((x, y) => y.d.localeCompare(x.d)).map(x => ({ cells: [esc(A.arDate(x.d)), `<b>${esc(sN(x.s))}</b>`, esc(cName(x.c)), esc(x.r), x.st, esc(x.act)], q: sN(x.s) })) }); };
      switch (k) {
        case 'rate': return clsTbl('نسبة الحضور اليومي حسب الفصل', false);
        case 'prate': return clsTbl('نسبة الحضور في الحصص حسب الفصل', true);
        case 'ab': return recs(X.att.filter(x => x.status === 'absent'), 'أيام الغياب');
        case 'pab': return recs(X.pa.filter(x => x.status === 'absent'), 'الغياب عن الحصص');
        case 'lt': return recs(late(X.att).concat(late(X.pa)), 'حالات التأخر');
        case 'ltm': return recs(late(X.att).concat(late(X.pa)), 'دقائق التأخر (الأطول أولاً)', true);
        case 'ref': return refs('');
        case 'refOpen': return refs('*open');
        case 'rst': return refs(a);
        case 'day': return recs(X.att.filter(x => x.day === a && x.status !== 'present').concat(X.pa.filter(x => x.day === a && x.status !== 'present')), 'الغياب والتأخر — ' + A.arDate(a, true));
        case 'cab': return recs(X.att.filter(x => x.class_id === a && x.status === 'absent'), 'أيام الغياب — ' + cName(a));
        case 'clt': return recs(late(X.att).concat(late(X.pa)).filter(x => x.class_id === a), 'التأخر — ' + cName(a));
        case 'cpab': return recs(X.pa.filter(x => x.class_id === a && x.status === 'absent'), 'غياب الحصص — ' + cName(a));
        case 'sab': return recs(X.att.filter(x => x.student_id === a && x.status === 'absent'), 'أيام غياب ' + sN(a));
        case 'spab': return recs(X.pa.filter(x => x.student_id === a && x.status === 'absent'), 'غياب الحصص — ' + sN(a));
        case 'sgab': return recs(X.att.filter(x => x.status === 'absent' && inStg(x)), 'حالات الغياب — المرحلة ' + a);
        case 'sglt': return recs(late(X.att).concat(late(X.pa)).filter(inStg), 'التأخر — المرحلة ' + a);
        case 'sgn': { const L = X.stu.filter(s => stageOf(cOf(s.class_id)) === a); return A.attDrill({ title: 'طلاب المرحلة ' + a, sub: rng, cols: ['الطالب', 'الفصل', 'رقم الطالب', 'أيام الغياب', 'التأخر'], rows: L.map(s => { const r = X.rows.find(x => x.s.id === s.id) || {}; return { cells: [`<b>${esc(s.full_name)}</b>`, esc(cName(s.class_id)), esc(s.student_no || ''), AR(r.ab || 0), AR((r.lt || 0) + (r.plt || 0))], q: s.full_name + ' ' + (s.student_no || '') }; }) }); }
      }
    }
    const scopeTxt = () => st.cid ? cName(st.cid) : st.grade ? `${st.grade} ${st.stage}` : st.stage ? `المرحلة ${st.stage}` : (A.section() || {}).name || 'القسم';
    function stuReport(id) { const s = STU.find(x => x.id === id) || {}; A.printDoc(`التقرير الشامل للحضور: ${s.full_name || ''}`, `${cName(s.class_id)} · من ${A.arDate(from)} إلى ${A.arDate(to)}`, stuBody(id, false), false); }
    function stuBody(id, head) {
      const s = STU.find(x => x.id === id) || {}, a = X.att.filter(x => x.student_id === id).sort((x, y) => x.day.localeCompare(y.day)), p = X.pa.filter(x => x.student_id === id && x.status !== 'present'), r = X.rows.find(x => x.s.id === id) || {};
      return (head ? `<h2 style="margin:0 0 4px">${esc(s.full_name || '')}</h2><p style="margin:0 0 8px;color:#5F7896">${esc(cName(s.class_id))}${s.student_no ? ' · رقم الطالب ' + esc(s.student_no) : ''}</p>` : '') +
        `<div class="rp2-k">${[[AR(r.days || 0), 'أيام مرصودة'], [AR(r.ab || 0), 'أيام غياب'], [AR(r.pab || 0), 'غياب حصص'], [AR((r.lt || 0) + (r.plt || 0)), 'تأخر'], [AR(r.ltm || 0), 'دقائق تأخر'], [AR(r.ref || 0), 'إحالات']].map(([v, l]) => `<div class="k"><span>${l}</span><b>${v}</b></div>`).join('')}</div>
         <h3>الحضور اليومي (غير الحضور)</h3><table><tr><th>التاريخ</th><th>اليوم</th><th>الحالة</th><th>الوقت</th><th>الدقائق</th><th>وقت الرصد</th><th>ملاحظة</th></tr>${a.filter(x => x.status !== 'present').map(x => `<tr><td>${esc(A.arDate(x.day))}</td><td>${DAYS[A.parseDate(x.day).getDay()]}</td><td>${stName(x.status)}</td><td>${hm(x.time_at) || '—'}</td><td>${x.minutes ? AR(x.minutes) : '—'}</td><td>${recAt(x.updated_at)}</td><td>${esc(x.note || '')}</td></tr>`).join('') || '<tr><td colspan="7">منتظم في الحضور اليومي</td></tr>'}</table>
         <h3>الحصص (غير الحضور)</h3><table><tr><th>التاريخ</th><th>الحصة</th><th>المادة</th><th>الحالة</th><th>الوقت</th><th>ملاحظة</th></tr>${p.sort((x, y) => x.day.localeCompare(y.day) || x.period - y.period).map(x => `<tr><td>${esc(A.arDate(x.day))}</td><td>${AR(x.period + 1)}</td><td>${esc(x.subject_id ? A.subjName(x.subject_id) : '')}</td><td>${stName(x.status)}${x.minutes ? ' ' + AR(x.minutes) + ' د' : ''}</td><td>${hm(x.time_at) || '—'}</td><td>${esc(x.note || '')}</td></tr>`).join('') || '<tr><td colspan="6">لا غياب أو تأخر في الحصص</td></tr>'}</table>`;
    }
    const pick = () => { scope = A.attPicker($('#rpPk', box), st, null, () => pick(), { all: true }); $$('[data-tb]', box).forEach(b => b.setAttribute('aria-pressed', b.dataset.tb === tab)); if (D) render(); };
    $$('[data-tb]', box).forEach(b => b.onclick = () => { tab = b.dataset.tb; A.LS.set('rp2tab', tab); pick(); });
    const reload = async () => { if (from > to) { const t = from; from = to; to = t; $('#rpF', box).value = from; $('#rpT', box).value = to; } A.LS.set('rp2f', from); A.LS.set('rp2t', to); await load(); render(); };
    $('#rpPre', box).onchange = ev => { const k = ev.target.value; A.LS.set('rp2pre', k); const r = preRange(k); if (r) { [from, to] = r; $('#rpF', box).value = from; $('#rpT', box).value = to; reload(); } };
    $('#rpF', box).onchange = ev => { from = ev.target.value; $('#rpPre', box).value = ''; A.LS.set('rp2pre', ''); reload(); };
    $('#rpT', box).onchange = ev => { to = ev.target.value > today() ? today() : ev.target.value; $('#rpPre', box).value = ''; A.LS.set('rp2pre', ''); reload(); };
    { const k = A.LS.get('rp2pre') || ''; const r = k && preRange(k); if (r) { [from, to] = r; $('#rpF', box).value = from; $('#rpT', box).value = to; } }
    $('#rpP', box).onclick = () => { if (!X) return; A.printDoc(`تقرير الحضور — ${(TABS.find(t => t[0] === tab) || [])[1]}`, `${scopeTxt()} · من ${A.arDate(from)} إلى ${A.arDate(to)}`, $('#rpO', box).innerHTML.replace(/<button[^>]*>.*?<\/button>/g, ''), true); };
    $('#rpX', box).onclick = () => {
      if (!X || !window.XLSX) return;
      const wb = XLSX.utils.book_new(); const add = (n, rows) => { const s = XLSX.utils.json_to_sheet(rows.length ? rows : [{ '': 'لا بيانات' }]); s['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, s, n); };
      add('الفصول', Object.values(X.byCls).map(o => ({ 'الفصل': o.c.name, 'المرحلة': stageOf(o.c), 'الطلاب': o.n, 'أيام مرصودة': o.days, 'أيام غياب': o.ab, 'نسبة الحضور اليومي %': pct(o.days - o.ab, o.days), 'تأخر': o.lt, 'رصد حصص': o.pn, 'غياب حصص': o.pab, 'نسبة حضور الحصص %': pct(o.pn - o.pab, o.pn) })));
      add('الطلاب', X.rows.map(r => ({ 'الطالب': r.s.full_name, 'الفصل': cName(r.s.class_id), 'رقم الطالب': r.s.student_no || '', 'أيام مرصودة': r.days, 'أيام غياب': r.ab, 'غياب حصص': r.pab, 'تأخر': r.lt + r.plt, 'دقائق تأخر': r.ltm, 'مستأذن': r.ex, 'خروج مبكر': r.ea, 'إحالات': r.ref })));
      add('حسب اليوم', Object.keys(X.byDay).sort().map(d => ({ 'اليوم': d, 'رصد يومي': X.byDay[d].n, 'غياب يومي': X.byDay[d].ab, 'تأخر': X.byDay[d].lt, 'غياب حصص': X.byDay[d].pab })));
      add('سجل الحصص', X.pa.filter(a => a.status !== 'present').map(a => ({ 'التاريخ': a.day, 'الطالب': (STU.find(s => s.id === a.student_id) || {}).full_name || '', 'الفصل': cName(a.class_id), 'الحصة': a.period + 1, 'المادة': a.subject_id ? A.subjName(a.subject_id) : '', 'الحالة': stName(a.status), 'الوقت': (a.time_at || '').slice(0, 5), 'الدقائق': a.minutes || '', 'ملاحظة': a.note || '' })));
      add('التأخر والاستئذان', X.att.filter(a => TIMED.includes(a.status)).map(a => ({ ...a, per: 'الصباحي' })).concat(X.pa.filter(a => TIMED.includes(a.status)).map(a => ({ ...a, per: 'الحصة ' + (a.period + 1) }))).sort((a, b) => a.day.localeCompare(b.day)).map(a => ({ 'التاريخ': a.day, 'الطالب': (STU.find(s => s.id === a.student_id) || {}).full_name || '', 'الفصل': cName(a.class_id), 'الحالة': stName(a.status), 'متى': a.per, 'وقت الوصول/الخروج': (a.time_at || '').slice(0, 5), 'الدقائق': a.minutes || '', 'ملاحظة': a.note || '' })));
      add('الإحالات', X.bh.map(b => ({ 'التاريخ': b.day, 'الطالب': (STU.find(s => s.id === b.student_id) || {}).full_name || '', 'الفصل': cName(b.class_id), 'السبب': b.category, 'ملاحظة': b.note || '', 'الحالة': b.status || 'open', 'إجراء الموجه': b.counselor_note || '' })));
      wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, `تقرير الحضور — ${scopeTxt()} — ${from} إلى ${to}.xlsx`);
    };
    pick(); await load(); render();
  };
})();
