/* منصة دينا — لوحة الحضور في «اللوحة اليومية ← المتابعة اللحظية»:
   يدمج الحضور اليومي (اليوم كاملاً) مع حضور الحصص، برسوم بهوية دينا، وأيقونة متحركة تفتح التفاصيل،
   وروابط مباشرة لتقارير الغياب. قراءة فقط. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR, DAYS, PER, I } = A;
  const ST = { present: ['حاضر', '#2E8B57'], absent: ['غائب', '#C53030'], late: ['متأخر', '#E0822B'], excused: ['مستأذن', '#3AB1DB'], early: ['خروج مبكر', '#AE95DA'] };
  const RANK = { absent: 4, early: 3, excused: 2, late: 1, present: 0 };
  const hm = v => v ? AR(String(v).slice(0, 5)) : '';
  const pct = (a, b) => b ? Math.round(a * 100 / b) : 0;

  const css = `
  .lva{margin-top:14px;border:1px solid #DCE7F3;border-radius:16px;padding:14px;background:linear-gradient(180deg,#F4F8FC,#fff)}
  .lva-h{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:8px}
  .lva-h h3{margin:0;color:#082B5A}
  .lva-g{display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:16px;align-items:center}
  .lva-dn{position:relative;width:100%;max-width:240px;margin:auto}
  .lva-dn .c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
  .lva-dn .c b{font-size:34px;color:#082B5A;line-height:1}.lva-dn .c span{font-size:12.5px;color:#5F7896}
  .lva-lg{display:flex;flex-wrap:wrap;gap:6px 12px;justify-content:center;margin-top:6px;font-size:13px}
  .lva-lg i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-inline-end:4px;vertical-align:middle}
  .lva-bars{display:grid;gap:7px}
  .lva-bar{display:grid;grid-template-columns:minmax(110px,150px) 1fr 74px;gap:8px;align-items:center;font-size:13.5px;border:0;background:none;padding:2px 0;text-align:start;font-family:inherit;color:inherit;cursor:pointer}
  .lva-bar:focus-visible{outline:3px solid #3AB1DB;border-radius:6px}
  .lva-bar i{display:block;height:12px;background:#E4EBF5;border-radius:99px;overflow:hidden}
  .lva-bar s{display:block;height:100%;width:var(--w);background:linear-gradient(90deg,#3AB1DB,#C53030);border-radius:99px;text-decoration:none;animation:lvaIn 1.1s ease-out both}
  @keyframes lvaIn{from{width:0}}
  .att-fab{position:fixed;inset-inline-end:22px;bottom:92px;z-index:40;width:74px;height:74px;border-radius:50%;border:0;cursor:pointer;color:#fff;background:radial-gradient(circle at 30% 30%,#3AB1DB,#005499 60%,#082B5A);box-shadow:0 10px 26px rgba(8,43,90,.35);display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:inherit;animation:fabFloat 3.2s ease-in-out infinite}
  .att-fab::before,.att-fab::after{content:'';position:absolute;inset:-6px;border-radius:50%;border:2px solid rgba(58,177,219,.55);animation:fabRing 2.4s ease-out infinite}
  .att-fab::after{animation-delay:1.2s}
  .att-fab b{font-size:22px;line-height:1}.att-fab span{font-size:10.5px;opacity:.9}
  .att-fab .dot{position:absolute;top:-4px;inset-inline-end:-4px;background:#C53030;color:#fff;border-radius:99px;min-width:24px;height:24px;font-size:12px;display:flex;align-items:center;justify-content:center;padding:0 6px;border:2px solid #fff}
  .att-fab:hover{transform:scale(1.06)}.att-fab:focus-visible{outline:3px solid #BADF93;outline-offset:4px}
  @keyframes fabRing{0%{transform:scale(.9);opacity:.9}100%{transform:scale(1.5);opacity:0}}
  @keyframes fabFloat{0%,100%{translate:0 0}50%{translate:0 -6px}}
  @media (prefers-reduced-motion:reduce){.att-fab,.att-fab::before,.att-fab::after,.lva-bar s{animation:none}}
  .lvm-t{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
  .lvm-c{border:1px solid #E3ECF6;border-radius:12px;padding:8px 10px;margin-top:8px}
  .lvm-c h4{margin:0 0 4px;color:#082B5A;display:flex;justify-content:space-between}
  @media (max-width:760px){.lva-g{grid-template-columns:1fr}.att-fab{bottom:84px;inset-inline-end:14px;width:64px;height:64px}}`;
  if (!document.getElementById('app51css')) { const st = document.createElement('style'); st.id = 'app51css'; st.textContent = css; document.head.appendChild(st); }

  // دمج الحضور اليومي وحضور الحصص لكل طالب (الحالة الأشد)
  A.attMerge = function (daily, pa, students) {
    const by = {};
    const put = (sid, st, src, x) => { const o = by[sid] = by[sid] || { st: 'present', day: null, ps: [], tm: null, min: null, note: '' }; if ((RANK[st] || 0) > (RANK[o.st] || 0)) o.st = st; if (src === 'day') { o.day = st; if (x.time_at) o.tm = x.time_at; if (x.minutes) o.min = x.minutes; if (x.note) o.note = x.note; } else if (st !== 'present') { o.ps.push({ p: x.period, st, tm: x.time_at, min: x.minutes }); if (!o.tm && x.time_at) o.tm = x.time_at; } };
    daily.forEach(x => put(x.student_id, x.status, 'day', x));
    pa.forEach(x => put(x.student_id, x.status, 'p', x));
    const cnt = k => Object.values(by).filter(o => o.st === k).length;
    const recorded = Object.keys(by).length;
    return { by, recorded, total: students.length, absent: cnt('absent'), late: cnt('late'), excused: cnt('excused'), early: cnt('early'), present: cnt('present') };
  };

  const donut = M => {
    const parts = ['present', 'absent', 'late', 'excused', 'early'].map(k => ({ k, v: M[k] })).filter(x => x.v), tot = parts.reduce((s, x) => s + x.v, 0);
    const R = 70, C = 2 * Math.PI * R; let off = 0;
    const segs = tot ? parts.map(x => { const len = C * x.v / tot; const s = `<circle r="${R}" cx="90" cy="90" fill="none" stroke="${ST[x.k][1]}" stroke-width="26" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 90 90)"><title>${ST[x.k][0]}: ${x.v}</title></circle>`; off += len; return s; }).join('') : `<circle r="${R}" cx="90" cy="90" fill="none" stroke="#E4EBF5" stroke-width="26"/>`;
    const rate = M.recorded ? pct(M.recorded - M.absent, M.recorded) : null;
    return `<div class="lva-dn"><svg viewBox="0 0 180 180" width="100%" role="img" aria-label="توزيع حالات الحضور">${segs}</svg><div class="c"><b>${rate == null ? '—' : AR(rate) + '٪'}</b><span>نسبة الحضور</span><span>${AR(M.recorded)} من ${AR(M.total)} مرصود</span></div></div>
      <div class="lva-lg">${['present', 'absent', 'late', 'excused', 'early'].map(k => `<span><i style="background:${ST[k][1]}"></i>${ST[k][0]} <b>${AR(M[k])}</b></span>`).join('')}</div>`;
  };

  // يُستدعى من «المتابعة اللحظية»: يرسم القسم ويضع الأيقونة المتحركة
  A.attDash = async function (el, opt) {
    if (!el) return;
    const sec = opt.sec || A.section(), day = opt.day;
    const cls = (S.classes || []).filter(c => c.active !== false && c.section_id === sec.id);
    const ids = new Set(cls.map(c => c.id));
    const [daily, students] = await Promise.all([
      api.list('attendance', { school_id: S.school.id, day }).catch(() => []),
      api.list('students', { section_id: sec.id, active: true }, { select: 'id,full_name,class_id,student_no' }).catch(() => [])]);
    const D = daily.filter(x => ids.has(x.class_id)), P = (opt.pa || []).filter(x => ids.has(x.class_id)), stu = students.filter(s => ids.has(s.class_id));
    const M = A.attMerge(D, P, stu);
    const sN = id => (stu.find(s => s.id === id) || {}).full_name || '—', sC = id => (stu.find(s => s.id === id) || {}).class_id;
    const perCls = cls.map(c => { const list = stu.filter(s => s.class_id === c.id); const ab = list.filter(s => (M.by[s.id] || {}).st === 'absent').length; const rec = list.filter(s => M.by[s.id]).length; return { c, n: list.length, ab, rec, p: pct(ab, list.length) }; }).filter(x => x.n);
    const go = tab => { A.LS.set('atttab', tab); location.hash = '#/attendance'; };
    el.innerHTML = `<section class="lva" aria-labelledby="lvaH"><div class="lva-h"><h3 id="lvaH">الحضور والغياب اليوم</h3><div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" id="lvaOpen">${I.eye || ''} التفاصيل</button><button class="btn ghost sm" data-go="reports">تقارير الغياب</button><button class="btn ghost sm" data-go="record">رصد الحضور</button><button class="btn ghost sm" id="lvaPr">${I.print || ''} طباعة</button></div></div>
      ${M.total ? `<div class="lva-g"><div>${donut(M)}</div><div><b class="small" style="color:#5F7896">نسبة الغياب حسب الفصل — اضغط الفصل لعرض غائبيه</b><div class="lva-bars" style="margin-top:6px">${perCls.map(x => `<button type="button" class="lva-bar" data-cl="${x.c.id}"><span>${esc(x.c.name)}</span><i><s style="--w:${x.p}%"></s></i><b>${AR(x.ab)} / ${AR(x.n)}${x.rec ? '' : ' <small class="muted">لم يُرصد</small>'}</b></button>`).join('')}</div></div></div>` : A.emptyBox('لا يوجد طلاب في هذا القسم', 'تُستورد بيانات الطلاب من «الحضور والسلوك ← الطلاب».')}</section>`;
    $$('[data-go]', el).forEach(b => b.onclick = () => go(b.dataset.go));
    const details = focusCls => {
      const ab = Object.entries(M.by).filter(([, o]) => o.st === 'absent').map(([id, o]) => ({ id, o })).filter(x => !focusCls || sC(x.id) === focusCls);
      const lt = Object.entries(M.by).filter(([id, o]) => ['late', 'excused', 'early'].includes(o.st) && (!focusCls || sC(id) === focusCls)).map(([id, o]) => ({ id, o }));
      const grp = {}; ab.forEach(x => (grp[sC(x.id)] = grp[sC(x.id)] || []).push(x));
      const body = `<div class="rp2-k" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px">${[['غائب', M.absent, '#C53030'], ['متأخر', M.late, '#E0822B'], ['مستأذن', M.excused, '#3AB1DB'], ['خروج مبكر', M.early, '#AE95DA'], ['لم يُرصد', M.total - M.recorded, '#5F7896']].map(([l, v, c]) => `<div class="k" style="border:1px solid #DCE7F3;border-radius:12px;padding:8px 10px"><span style="font-size:12.5px;color:#5F7896">${l}</span><b style="display:block;font-size:22px;color:${c}">${AR(v)}</b></div>`).join('')}</div>
        <h3 style="margin:12px 0 4px">الغائبون${focusCls ? ' — ' + esc((A.cls(focusCls) || {}).name || '') : ''} (${AR(ab.length)})</h3>
        ${Object.keys(grp).length ? Object.entries(grp).map(([c, L]) => `<div class="lvm-c"><h4><span>${esc((A.cls(c) || {}).name || '')}</span><span class="small muted">${AR(L.length)}</span></h4><table class="tbl"><tbody>${L.map(x => `<tr><td><b>${esc(sN(x.id))}</b></td><td class="small">${x.o.day === 'absent' ? 'اليوم كاملاً' : 'الحصص: ' + x.o.ps.filter(p => p.st === 'absent').map(p => AR(p.p + 1)).join('، ')}</td><td class="small">${esc(x.o.note || '')}</td></tr>`).join('')}</tbody></table></div>`).join('') : '<p class="small muted">لا غياب مسجّل.</p>'}
        <h3 style="margin:12px 0 4px">التأخر والاستئذان والخروج (${AR(lt.length)})</h3>
        ${lt.length ? `<table class="tbl"><thead><tr><th>الطالب</th><th>الفصل</th><th>الحالة</th><th>الوقت</th><th>الدقائق</th></tr></thead><tbody>${lt.map(x => `<tr><td><b>${esc(sN(x.id))}</b></td><td>${esc((A.cls(sC(x.id)) || {}).name || '')}</td><td>${ST[x.o.st][0]}</td><td>${hm(x.o.tm) || '—'}</td><td>${x.o.min ? AR(x.o.min) : '—'}</td></tr>`).join('')}</tbody></table>` : '<p class="small muted">لا يوجد.</p>'}`;
      return body;
    };
    const openModal = focusCls => {
      const m = A.modal(`<h3>الحضور والغياب — ${esc(sec.name || '')}</h3><p class="sub">${DAYS[A.parseDate(day).getDay()]} ${AR(A.dmy(A.parseDate(day)))} · يتحدّث مع كل رصد جديد</p>
        <div class="lvm-t"><button class="btn sm" data-mg="reports">تقارير الغياب</button><button class="btn ghost sm" data-mg="record">رصد الحضور</button><button class="btn ghost sm" data-mg="live">لوحة الحضور التفصيلية</button><button class="btn ghost sm" id="lvmP">${I.print || ''} طباعة</button>${focusCls ? '<button class="btn ghost sm" id="lvmAll">كل الفصول</button>' : ''}</div>
        <div id="lvmB">${donut(M)}${details(focusCls)}</div>`, { cls: 'wide' });
      m.el.querySelectorAll('[data-mg]').forEach(b => b.onclick = () => { m.close(); go(b.dataset.mg); });
      m.el.querySelector('#lvmP').onclick = () => A.printDoc('الحضور والغياب اليوم', `${sec.name || ''} · ${DAYS[A.parseDate(day).getDay()]} ${AR(A.dmy(A.parseDate(day)))}`, details(focusCls), false);
      const all = m.el.querySelector('#lvmAll'); if (all) all.onclick = () => { m.close(); openModal(''); };
    };
    const op = $('#lvaOpen', el); if (op) op.onclick = () => openModal('');
    $$('[data-cl]', el).forEach(b => b.onclick = () => openModal(b.dataset.cl));
    $('#lvaPr', el).onclick = () => A.printDoc('الحضور والغياب اليوم', `${sec.name || ''} · ${DAYS[A.parseDate(day).getDay()]} ${AR(A.dmy(A.parseDate(day)))}`, `<div style="display:flex;justify-content:center">${donut(M)}</div><h3>نسبة الغياب حسب الفصل</h3><table><tr><th>الفصل</th><th>الطلاب</th><th>الغائبون</th><th>النسبة</th></tr>${perCls.map(x => `<tr><td>${esc(x.c.name)}</td><td>${AR(x.n)}</td><td>${AR(x.ab)}</td><td>${AR(x.p)}٪</td></tr>`).join('')}</table>${details('')}`, false);
    // الأيقونة المتحركة التفاعلية
    let fab = document.getElementById('attFab');
    if (!fab) { fab = document.createElement('button'); fab.id = 'attFab'; fab.className = 'att-fab'; fab.type = 'button'; document.body.appendChild(fab); }
    fab.setAttribute('aria-label', `الحضور اليوم: ${M.absent} غائب — اضغط لعرض التفاصيل`);
    fab.innerHTML = `<b>${M.recorded ? AR(pct(M.recorded - M.absent, M.recorded)) + '٪' : '—'}</b><span>الحضور</span>${M.absent ? `<span class="dot">${AR(M.absent)}</span>` : ''}`;
    fab.onclick = () => openModal('');
    // تُزال الأيقونة عند مغادرة الشاشة
    A._attFabEl = el;
    if (!A._attFabBound) { A._attFabBound = true; window.addEventListener('hashchange', () => setTimeout(() => { const f = document.getElementById('attFab'); if (f && !(A._attFabEl && document.body.contains(A._attFabEl))) f.remove(); }, 80)); }
    return M;
  };
})();
