/* منصة دينا — تبويب «الطلاب» في الحضور والسلوك:
   - تصفية متدرجة: القسم ← المرحلة ← الصف ← الفصل (بعدد الطلاب على كل اختيار) + بحث.
   - إحصاءات تفاعلية: البطاقات تفتح التفاصيل أو تطبّق التصفية، ورسم التوزيع قابل للضغط للنزول مستوى.
   - عرض جدول أو قوائم حسب الفصل، مع طباعة القوائم بهوية دينا وExcel (ورقة لكل فصل).
   أزرار تعديل الطالب وإيقافه كما هي (تُربط من app11). */
(function () {
  const A = window.APP; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  const LSK = 'stbr';
  const st = (() => { try { return Object.assign({ sec: '', stage: '', grade: '', cls: '', q: '', view: 'table', miss: '' }, JSON.parse(A.LS.get(LSK) || '{}')); } catch (_) { return { sec: '', stage: '', grade: '', cls: '', q: '', view: 'table', miss: '' }; } })();
  const save = () => A.LS.set(LSK, JSON.stringify(st));
  let CLS = null;
  async function allClasses() {
    if (CLS) return CLS; const ids = (S.sections || []).map(s => s.id);
    try { CLS = ids.length ? await api.list('classes', { section_id: ids }) : []; } catch (_) { CLS = []; }
    (S.classes || []).forEach(c => { if (!CLS.some(x => x.id === c.id)) CLS.push(c); });
    return CLS;
  }
  const css = `
  .sb-lv{display:grid;gap:6px;margin:10px 0}.sb-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}.sb-row>span{font-size:12.5px;font-weight:800;color:#5B7090;min-width:56px}
  .sb-row button{border:1.5px solid #DCE7F3;background:#fff;color:#082B5A;border-radius:99px;padding:5px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;gap:6px;align-items:center}
  .sb-row button b{font-size:11.5px;background:#EEF3F9;border-radius:99px;padding:0 7px;color:#005499}
  .sb-row button.on{background:#082B5A;border-color:#082B5A;color:#fff}.sb-row button.on b{background:rgba(255,255,255,.18);color:#fff}
  .sb-crumb{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:13px;color:#5B7090;margin:2px 0 6px}.sb-crumb b{color:#082B5A}
  .sb-bars{display:grid;gap:6px;margin:6px 0 12px}.sb-bar{display:grid;grid-template-columns:minmax(110px,180px) 1fr 52px;gap:8px;align-items:center;font-size:13px;border:0;background:none;font:inherit;text-align:start;cursor:pointer;padding:2px 4px;border-radius:8px;color:#082B5A}
  .sb-bar:hover,.sb-bar:focus-visible{background:#F2F7FC;outline:none}.sb-bar i{display:block;height:14px;border-radius:7px;background:linear-gradient(90deg,#3AB1DB,#005499);min-width:3px}.sb-bar b{text-align:end}
  .sb-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:8px 0}
  .sb-grp{border:1px solid #DCE7F3;border-radius:16px;margin:10px 0;overflow:hidden;background:#fff}
  .sb-grp>header{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 12px;background:linear-gradient(90deg,#F2F7FC,#fff);border-bottom:1px solid #E4EBF5}
  .sb-grp>header h3{margin:0;font-size:15px;color:#082B5A;flex:1}.sb-grp table{margin:0}
  .sb-sec{font-size:11.5px;color:#5B7090}`;
  if (!document.getElementById('app61css')) { const s = document.createElement('style'); s.id = 'app61css'; s.textContent = css; document.head.appendChild(s); }

  A.stuBrowser = async function (el, o) {
    const STU = o.STU || [], bind = o.bind || (() => { });
    el.innerHTML = '<div class="spinner"></div>';
    const cls = await allClasses();
    const cOf = id => cls.find(c => c.id === id) || (A.cls && A.cls(id)) || {};
    const secName = id => ((S.sections || []).find(x => x.id === id) || {}).name || '—';
    const stage = c => A.stageOf ? A.stageOf(c) : (c.stage || 'أخرى');
    const grade = c => (A.gradeName ? A.gradeName(c.grade_word, c.stage) : c.grade_word) || c.grade_word || 'بلا صف';
    // صف بيانات موحّد لكل طالب
    const R = STU.map(s => { const c = cOf(s.class_id); return { s, c, sec: s.section_id || c.section_id || '', stage: stage(c), grade: grade(c), cls: s.class_id || '' }; });
    const sortCls = (a, b) => (a.sort || 0) - (b.sort || 0) || String(a.name || '').localeCompare(String(b.name || ''), 'ar');
    const draw = () => {
      save();
      const norm = x => (A.normKey ? A.normKey(x || '') : String(x || ''));
      const q = norm(st.q);
      const lv1 = R.filter(r => !st.sec || r.sec === st.sec), lv2 = lv1.filter(r => !st.stage || r.stage === st.stage), lv3 = lv2.filter(r => !st.grade || r.grade === st.grade), lv4 = lv3.filter(r => !st.cls || r.cls === st.cls);
      const missF = r => !st.miss || (st.miss === 'nid' ? !r.s.national_id : st.miss === 'ph' ? !r.s.guardian_phone : st.miss === 'cls' ? !r.c.id : true);
      const list = lv4.filter(r => missF(r) && (!q || norm(r.s.full_name + ' ' + (r.s.student_no || '') + ' ' + (r.s.national_id || '')).includes(q)));
      const cnt = (arr, k) => { const m = new Map(); arr.forEach(r => m.set(r[k], (m.get(r[k]) || 0) + 1)); return m; };
      const secs = (S.sections || []).filter(x => R.some(r => r.sec === x.id)), cS = cnt(R, 'sec');
      const stages = [...cnt(lv1, 'stage').entries()].sort((a, b) => ['KG', 'ابتدائي', 'متوسط', 'ثانوي'].indexOf(a[0]) - ['KG', 'ابتدائي', 'متوسط', 'ثانوي'].indexOf(b[0]));
      const grades = [...cnt(lv2, 'grade').entries()].sort((a, b) => { const ca = lv2.find(r => r.grade === a[0]).c, cb = lv2.find(r => r.grade === b[0]).c; return sortCls(ca, cb); });
      const classes = [...cnt(lv3, 'cls').entries()].map(([id, n]) => [cOf(id), n]).filter(x => x[0].id).sort((a, b) => sortCls(a[0], b[0]));
      const chip = (k, v, label, n) => `<button type="button" data-f="${k}" data-v="${esc(v)}" class="${st[k] === v ? 'on' : ''}" aria-pressed="${st[k] === v}">${esc(label)}${n != null ? ` <b>${AR(n)}</b>` : ''}</button>`;
      // مستوى الرسم: أدق مستوى لم يُختر بعد
      const level = !st.sec && secs.length > 1 ? ['sec', [...cnt(lv1, 'sec').entries()].map(([k, n]) => [k, secName(k), n])] : !st.stage && stages.length > 1 ? ['stage', stages.map(([k, n]) => [k, k, n])] : !st.grade && grades.length > 1 ? ['grade', grades.map(([k, n]) => [k, k, n])] : !st.cls ? ['cls', classes.map(([c, n]) => [c.id, c.name, n])] : null;
      const mx = level ? Math.max(1, ...level[1].map(x => x[2])) : 1;
      const nCls = new Set(lv4.map(r => r.cls).filter(Boolean)).size, per = nCls ? Math.round(lv4.length / nCls) : 0;
      const byC = [...cnt(lv4, 'cls').entries()].filter(([id]) => id).map(([id, n]) => [cOf(id), n]).sort((a, b) => b[1] - a[1]);
      const noNid = lv4.filter(r => !r.s.national_id).length, noPh = lv4.filter(r => !r.s.guardian_phone).length;
      const crumb = [st.sec && secName(st.sec), st.stage, st.grade, st.cls && cOf(st.cls).name].filter(Boolean);
      el.innerHTML = `
        <div class="grid g4" style="margin:6px 0 4px">
          <button type="button" class="kpi navy btnlike" data-k="all"><span class="more">التفاصيل</span><div class="k">الطلاب ${crumb.length ? 'في الاختيار' : ''}</div><div class="v">${AR(lv4.length)}</div><div class="d">من ${AR(R.length)} في المدرسة</div></button>
          <button type="button" class="kpi btnlike" data-k="cls"><span class="more">التفاصيل</span><div class="k">الفصول</div><div class="v">${AR(nCls)}</div><div class="d">متوسط ${AR(per)} طالب للفصل</div></button>
          <button type="button" class="kpi btnlike" data-k="nid"><span class="more">${st.miss === 'nid' ? 'إلغاء التصفية' : 'عرضهم'}</span><div class="k">بلا رقم هوية</div><div class="v"${noNid ? ' style="color:var(--warn)"' : ''}>${AR(noNid)}</div><div class="d">يلزم للربط بأوراق الاختبارات</div></button>
          <button type="button" class="kpi btnlike" data-k="ph"><span class="more">${st.miss === 'ph' ? 'إلغاء التصفية' : 'عرضهم'}</span><div class="k">بلا جوال ولي أمر</div><div class="v"${noPh ? ' style="color:var(--warn)"' : ''}>${AR(noPh)}</div><div class="d">للتواصل والإشعارات</div></button></div>
        <div class="sb-lv">
          ${secs.length > 1 ? `<div class="sb-row" role="group" aria-label="القسم"><span>القسم</span>${chip('sec', '', 'الكل', R.length)}${secs.map(x => chip('sec', x.id, x.name, cS.get(x.id) || 0)).join('')}</div>` : ''}
          ${stages.length ? `<div class="sb-row" role="group" aria-label="المرحلة"><span>المرحلة</span>${chip('stage', '', 'الكل', lv1.length)}${stages.map(([k, n]) => chip('stage', k, k, n)).join('')}</div>` : ''}
          ${grades.length > 1 || st.grade ? `<div class="sb-row" role="group" aria-label="الصف"><span>الصف</span>${chip('grade', '', 'الكل', lv2.length)}${grades.map(([k, n]) => chip('grade', k, k, n)).join('')}</div>` : ''}
          ${classes.length ? `<div class="sb-row" role="group" aria-label="الفصل"><span>الفصل</span>${chip('cls', '', 'الكل', lv3.length)}${classes.map(([c, n]) => chip('cls', c.id, classes.filter(([x]) => x.name === c.name).length > 1 ? c.name + ' · ' + secName(c.section_id).replace(/^قسم\s*/, '') : c.name, n)).join('')}</div>` : ''}</div>
        ${level && level[1].length > 1 ? `<div class="sec-box"><b>التوزيع حسب ${{ sec: 'القسم', stage: 'المرحلة', grade: 'الصف', cls: 'الفصل' }[level[0]]}</b> <span class="small muted">— اضغط أي شريط للنزول إليه</span><div class="sb-bars">${level[1].map(([k, l, n]) => `<button type="button" class="sb-bar" data-lv="${level[0]}" data-v="${esc(k)}" aria-label="${esc(l)}: ${AR(n)} طالب"><span>${esc(l)}</span><i style="width:${Math.round(n / mx * 100)}%"></i><b>${AR(n)}</b></button>`).join('')}</div></div>` : ''}
        <div class="sb-tools"><input class="in" id="sbQ" value="${esc(st.q)}" placeholder="بحث بالاسم أو رقم الطالب أو الهوية" style="max-width:300px" aria-label="بحث">
          <div class="rs-seg" role="radiogroup" style="display:flex;border:1.5px solid #DCE7F3;border-radius:12px;overflow:hidden">${[['table', 'جدول'], ['groups', 'قوائم حسب الفصل']].map(([k, l]) => `<button type="button" data-vw="${k}" role="radio" aria-checked="${st.view === k}" style="border:0;padding:6px 12px;font:inherit;cursor:pointer;background:${st.view === k ? '#082B5A' : '#fff'};color:${st.view === k ? '#fff' : '#082B5A'}">${l}</button>`).join('')}</div>
          ${st.miss ? `<span class="pill st-submitted">تصفية: ${st.miss === 'nid' ? 'بلا رقم هوية' : 'بلا جوال ولي أمر'} <button type="button" id="sbMx" aria-label="إلغاء" style="border:0;background:none;cursor:pointer">×</button></span>` : ''}
          <span style="flex:1"></span><button class="btn ghost sm" id="sbP">${A.I.print || ''} طباعة القوائم</button><button class="btn ghost sm" id="sbX">${A.I.down || ''} Excel</button></div>
        ${crumb.length ? `<div class="sb-crumb">العرض: ${crumb.map(x => `<b>${esc(x)}</b>`).join(' ‹ ')} · ${AR(list.length)} طالب <button class="btn ghost sm" id="sbR">عرض الكل</button></div>` : `<div class="sb-crumb">${AR(list.length)} طالب</div>`}
        <div id="sbL"></div>`;
      const row = (r, i) => `<tr><td>${AR(i + 1)}</td><td><b>${esc(r.s.full_name)}</b></td>${st.view === 'table' ? `<td>${esc(r.c.name || '—')}${!st.sec && (S.sections || []).length > 1 ? `<div class="sb-sec">${esc(secName(r.sec))}</div>` : ''}</td>` : ''}<td dir="ltr" class="small">${r.s.national_id ? esc(r.s.national_id) : '<span class="faint">—</span>'}</td><td>${esc(r.s.student_no || '')}</td><td class="small">${esc(r.s.guardian_name || '')} <span dir="ltr">${esc(r.s.guardian_phone || '')}</span></td><td class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn ghost sm" data-ed="${r.s.id}">تعديل</button><button class="btn bad sm" data-off="${r.s.id}" title="إيقاف (لا يحذف سجله)">إيقاف</button></td></tr>`;
      const head = withCls => `<thead><tr><th>م</th><th>الطالب</th>${withCls ? '<th>الفصل</th>' : ''}<th>رقم الهوية</th><th>رقم الطالب</th><th>ولي الأمر</th><th></th></tr></thead>`;
      const groups = () => { const g = new Map(); list.forEach(r => { (g.get(r.cls) || g.set(r.cls, []).get(r.cls)).push(r); }); return [...g.entries()].map(([id, L]) => [cOf(id), L]).sort((a, b) => sortCls(a[0], b[0])); };
      const L = $('#sbL', el);
      if (!list.length) L.innerHTML = A.emptyBox('لا طلاب في هذا الاختيار');
      else if (st.view === 'table') L.innerHTML = `<div class="scroll" style="max-height:560px"><table class="tbl">${head(true)}<tbody>${list.slice(0, 800).map(row).join('')}</tbody></table></div>${list.length > 800 ? `<p class="small muted">يُعرض أول ٨٠٠ — اختر قسماً أو مرحلة أو استخدم البحث</p>` : ''}`;
      else L.innerHTML = groups().map(([c, G]) => `<section class="sb-grp"><header><h3>${esc(c.name || 'بلا فصل')}</h3><span class="small muted">${esc(secName(c.section_id))} · ${esc(stage(c))}</span><span class="pill">${AR(G.length)} طالب</span><button class="btn ghost sm" data-pc="${c.id || ''}">${A.I.print || ''} طباعة</button></header><div class="scroll"><table class="tbl">${head(false)}<tbody>${G.map(row).join('')}</tbody></table></div></section>`).join('');
      bind(el);
      // التصفية
      $$('[data-f]', el).forEach(b => b.onclick = () => { const k = b.dataset.f, v = b.dataset.v; st[k] = st[k] === v && v ? '' : v; const order = ['sec', 'stage', 'grade', 'cls']; order.slice(order.indexOf(k) + 1).forEach(x => st[x] = ''); draw(); });
      $$('[data-lv]', el).forEach(b => b.onclick = () => { st[b.dataset.lv] = b.dataset.v; draw(); });
      $$('[data-vw]', el).forEach(b => b.onclick = () => { st.view = b.dataset.vw; draw(); });
      let tq; $('#sbQ', el).oninput = e => { clearTimeout(tq); tq = setTimeout(() => { st.q = e.target.value; const pos = e.target.selectionStart; draw(); const n = $('#sbQ', el); n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) { } }, 250); };
      const R2 = $('#sbR', el); if (R2) R2.onclick = () => { Object.assign(st, { sec: '', stage: '', grade: '', cls: '', q: '', miss: '' }); draw(); };
      const MX = $('#sbMx', el); if (MX) MX.onclick = () => { st.miss = ''; draw(); };
      // البطاقات التفاعلية
      $$('[data-k]', el).forEach(b => b.onclick = () => { const k = b.dataset.k;
        if (k === 'nid' || k === 'ph') { st.miss = st.miss === k ? '' : k; return draw(); }
        if (!A.attDrill) return;
        if (k === 'cls') return A.attDrill({ title: 'الفصول', sub: crumb.join(' ‹ '), cols: ['الفصل', 'القسم', 'المرحلة', 'الصف', 'عدد الطلاب', 'بلا هوية', 'بلا جوال'], rows: byC.map(([c, n]) => ({ q: c.name, cells: [`<b>${esc(c.name)}</b>`, esc(secName(c.section_id)), esc(stage(c)), esc(grade(c)), AR(n), AR(lv4.filter(r => r.cls === c.id && !r.s.national_id).length), AR(lv4.filter(r => r.cls === c.id && !r.s.guardian_phone).length)] })) });
        A.attDrill({ title: 'الطلاب', sub: crumb.join(' ‹ ') || 'كل المدرسة', cols: ['الطالب', 'الفصل', 'القسم', 'رقم الطالب', 'ولي الأمر', 'الجوال'], rows: lv4.map(r => ({ q: r.s.full_name, cells: [`<b>${esc(r.s.full_name)}</b>`, esc(r.c.name || ''), esc(secName(r.sec)), esc(r.s.student_no || ''), esc(r.s.guardian_name || ''), `<span dir="ltr">${esc(r.s.guardian_phone || '')}</span>`] })) }); });
      // الطباعة والتصدير
      const printLists = only => { const G = groups().filter(([c]) => !only || c.id === only);
        A.printDoc(only ? 'قائمة طلاب ' + (G[0] ? G[0][0].name : '') : 'قوائم الطلاب', crumb.join(' ‹ ') || ((S.school || {}).name || ''), G.map(([c, X]) => `<h3>${esc(c.name || 'بلا فصل')} — ${AR(X.length)} طالب</h3><table><thead><tr><th style="width:36px">م</th><th>اسم الطالب</th><th>رقم الطالب</th><th>ولي الأمر</th><th>الجوال</th><th style="width:22%">ملاحظات</th></tr></thead><tbody>${X.map((r, i) => `<tr><td>${AR(i + 1)}</td><td class="lt"><b>${esc(r.s.full_name)}</b></td><td>${esc(r.s.student_no || '')}</td><td>${esc(r.s.guardian_name || '')}</td><td dir="ltr">${esc(r.s.guardian_phone || '')}</td><td></td></tr>`).join('')}</tbody></table>`).join('')); };
      $('#sbP', el).onclick = () => printLists(null);
      $$('[data-pc]', el).forEach(b => b.onclick = () => printLists(b.dataset.pc));
      $('#sbX', el).onclick = () => { const wb = XLSX.utils.book_new(); wb.Workbook = { Views: [{ RTL: true }] };
        const add = (n, rows) => { const ws = XLSX.utils.json_to_sheet(rows); ws['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws, String(n).replace(/[\\/?*[\]:]/g, '-').slice(0, 31) || 'ورقة'); };
        const toRow = (r, i) => ({ م: i + 1, الاسم: r.s.full_name, الفصل: r.c.name || '', القسم: secName(r.sec), المرحلة: r.stage, الصف: r.grade, 'رقم الطالب': r.s.student_no || '', 'رقم الهوية': r.s.national_id || '', 'ولي الأمر': r.s.guardian_name || '', 'جوال ولي الأمر': r.s.guardian_phone || '' });
        add('الكل', list.map(toRow)); const used = new Set(['الكل']); groups().forEach(([c, X]) => { let n = (c.name || 'بلا فصل').slice(0, 28); while (used.has(n)) n += '_'; used.add(n); add(n, X.map(toRow)); });
        XLSX.writeFile(wb, `قوائم الطلاب${crumb.length ? ' - ' + crumb.join(' - ') : ''}.xlsx`.replace(/[\\/:*?"<>|]/g, '-')); };
    };
    draw();
  };
})();
