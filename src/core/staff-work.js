/* منصة دينا — متابعة الموظفين وأعمالهم (للمالك وحده)
   RPC staff_work(from, to) (sql/109c): تجميع لكل موظف/نوع/يوم من: الخطة وتنفيذها، التحضير، حضور الحصص والصباحي، السلوك،
   الاختبارات والبنك، المصادر، النماذج والزيارات، الانتظار، الرسائل، الإرشاد، العروض والأسئلة اللحظية والألعاب، نماذجي،
   الدخول، الحضور الوظيفي، المناوبة، التوضيح، تقارير أولياء الأمور.
   الصفحة: فترة (اليوم/أمس/الأسبوع/الأسبوع الماضي/الشهر/مخصص) ← مؤشرات، «أبرز الأعمال»، جدول بكل موظف قابل للترتيب،
   وتقرير مفصّل لكل موظف يوماً بيوم — طباعة بهوية دينا وExcel. لا يظهر لأي حساب آخر (بند القائمة والصفحة والقاعدة). */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR, I } = A;
  const own = () => !!(S.me && S.me.is_owner && !S.realMe);
  if (A.NAV && !A.NAV.some(n => n[0] === 'staffwork')) { const i = A.NAV.findIndex(n => n[0] === 'activity'); A.NAV.splice(i < 0 ? A.NAV.length : i, 0, ['staffwork', 'متابعة الموظفين', () => own()]); }
  A.I.staffwork = A.I.staffwork || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="7" r="3"/><path d="M2 20v-1a6 6 0 0 1 10-4.5"/><path d="M14 20l2-5 2 3 2-6 2 8"/></svg>';
  // [مفتاح، الاسم، الوزن في المؤشر، الأيقونة]
  const CAT = [['plan', 'حصص الخطة المُدخلة', 1, '📅'], ['exec', 'تنفيذ الحصص', 1, '✅'], ['prep', 'التحضير', 3, '📘'], ['patt', 'رصد حضور الحصص', 1, '🧾'], ['att', 'الحضور الصباحي', 1, '🌅'], ['beh', 'رصد السلوك', 1, '⭐'],
    ['quiz', 'اختبارات وواجبات', 4, '📝'], ['qbank', 'أسئلة البنك', 1, '❓'], ['res', 'مصادر وملفات', 2, '📎'], ['form', 'نماذج مُسلَّمة', 4, '📋'], ['visit', 'زيارات صفية', 5, '👁️'], ['cover', 'حصص انتظار غطّاها', 3, '🔁'],
    ['counsel', 'إجراءات إرشادية', 3, '🤝'], ['preport', 'تقارير أولياء الأمور', 3, '👪'], ['clar', 'ردود التوضيح', 2, '💬'], ['duty', 'المناوبة', 2, '🛡️'], ['deck', 'عروض تقديمية', 3, '🖥️'], ['poll', 'أسئلة لحظية', 2, '⚡'], ['game', 'ألعاب تعليمية', 2, '🎮'], ['uform', 'نماذجي', 2, '🗂️'], ['msg', 'رسائل', 0.5, '✉️'], ['login', 'مرات الدخول', 0, '🔑'], ['hr', 'الحضور الوظيفي', 0, '🕘']];
  const CM = Object.fromEntries(CAT.map(c => [c[0], c]));
  const HRS = { present: 'حاضر', late: 'متأخر', absent: 'غائب', leave: 'إجازة', excused: 'بعذر', early: 'انصراف مبكر' };
  const iso = d => A.isoDate(d), todayD = () => A.parseDate(new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10));
  const RANGES = [['today', 'اليوم'], ['yest', 'أمس'], ['week', 'هذا الأسبوع'], ['lweek', 'الأسبوع الماضي'], ['month', 'هذا الشهر'], ['custom', 'فترة محددة']];
  function rangeOf(k, f, t) { const d = todayD(), a = new Date(d), b = new Date(d);
    if (k === 'yest') { a.setDate(a.getDate() - 1); b.setDate(b.getDate() - 1); }
    else if (k === 'week') a.setDate(a.getDate() - a.getDay());
    else if (k === 'lweek') { a.setDate(a.getDate() - a.getDay() - 7); b.setTime(a.getTime()); b.setDate(b.getDate() + 6); }
    else if (k === 'month') a.setDate(1);
    else if (k === 'custom') return [f || iso(d), t || iso(d)];
    return [iso(a), iso(b)]; }

  async function fetchData(from, to) {
    if (!A.DEMO) return (await api.rpc('staff_work', { p_from: from, p_to: to })) || [];
    // وضع التجربة: بيانات مولَّدة ثابتة لكل موظف لعرض الواجهة
    const out = [], days = []; for (let d = A.parseDate(from); d <= A.parseDate(to); d.setDate(d.getDate() + 1)) if (d.getDay() < 5) days.push(iso(d));
    let seed = 7; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    (S.staff || []).filter(s => !s.is_owner).forEach(s => days.forEach(d => CAT.forEach(([c]) => { if (rnd() < (c === 'login' ? .8 : c === 'hr' ? .95 : .22)) out.push({ s: s.id, c, d, n: c === 'hr' ? 1 : 1 + Math.floor(rnd() * 5), l: c === 'hr' ? [rnd() < .85 ? 'present' : rnd() < .5 ? 'late' : 'absent'] : ['عنصر تجريبي ' + c] }); })));
    return out;
  }

  V.staffwork = async function (root) {
    if (!own()) { root.innerHTML = ''; if (location.hash !== '#/home') location.hash = '#/home'; return; }
    css();
    const st = Object.assign({ r: 'week', f: '', t: '', q: '', sort: 'score', cats: null }, (() => { try { return JSON.parse(A.LS.get('sw_st') || '{}'); } catch (_) { return {}; } })());
    const save = () => A.LS.set('sw_st', JSON.stringify(st));
    const [from, to] = rangeOf(st.r, st.f, st.t);
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">متابعة الموظفين وأعمالهم</h2><p class="sub" style="margin:2px 0 0">ما أنجزه كل موظف في المنصة خلال الفترة — لك وحدك.</p></div>
        <div class="row" style="gap:6px"><button class="btn ghost sm" id="swPr">${I.print || ''} طباعة التقرير</button><button class="btn ghost sm" id="swX">Excel</button></div></div>
      <div class="sw-rg" role="group" aria-label="الفترة">${RANGES.map(([k, l]) => `<button type="button" data-r="${k}" class="${st.r === k ? 'on' : ''}" aria-pressed="${st.r === k}">${l}</button>`).join('')}
        <span class="sw-cu" ${st.r === 'custom' ? '' : 'hidden'}><label class="sr-only" for="swF">من</label><input class="in" type="date" id="swF" value="${from}"><span>←</span><label class="sr-only" for="swT">إلى</label><input class="in" type="date" id="swT" value="${to}"></span>
        <span class="small muted">${AR(A.dmy(A.parseDate(from)))}${from !== to ? ' — ' + AR(A.dmy(A.parseDate(to))) : ''}</span></div>
      <div id="swB"><div class="spinner"></div></div></div>`;
    $$('[data-r]', root).forEach(b => b.onclick = () => { st.r = b.dataset.r; if (st.r === 'custom' && !st.f) { st.f = from; st.t = to; } save(); V.staffwork(root); });
    ['#swF', '#swT'].forEach(id => $(id, root).onchange = () => { st.f = $('#swF', root).value; st.t = $('#swT', root).value; if (st.t < st.f) [st.f, st.t] = [st.t, st.f]; save(); V.staffwork(root); });
    let rows; try { rows = await fetchData(from, to); } catch (e) { $('#swB', root).innerHTML = A.emptyBox('تعذّر تحميل البيانات', esc(e.message)); return; }
    // تجميع
    const staff = (S.staff || []).filter(s => !s.is_owner && s.active !== false);
    const P = {}; staff.forEach(s => P[s.id] = { id: s.id, name: s.full_name, title: s.title || '', c: {}, days: {}, last: '', hr: {}, items: {} });
    rows.forEach(r => { const p = P[r.s]; if (!p) return; p.c[r.c] = (p.c[r.c] || 0) + r.n; (p.days[r.d] = p.days[r.d] || []).push(r); if (r.c !== 'login' && r.c !== 'hr' && r.d > p.last) p.last = r.d;
      if (r.c === 'hr') (r.l || []).slice(0, 1).forEach(x => p.hr[x] = (p.hr[x] || 0) + 1); else if (r.c !== 'login') (p.items[r.c] = p.items[r.c] || []).push(...(r.l || []).map(l => ({ l, d: r.d }))); });
    const score = p => CAT.reduce((s, [k, , w]) => s + (p.c[k] || 0) * w, 0);
    const L = Object.values(P).map(p => Object.assign(p, { score: Math.round(score(p)), work: CAT.filter(c => c[2] > 0).reduce((s, [k]) => s + (p.c[k] || 0), 0) }));
    const usedCats = CAT.filter(([k]) => L.some(p => p.c[k]));
    const B = $('#swB', root);
    const draw = () => {
      const q = A.normKey(st.q || ''); let list = L.filter(p => !q || A.normKey(p.name + ' ' + p.title).includes(q));
      list.sort((a, b) => st.sort === 'name' ? a.name.localeCompare(b.name, 'ar') : st.sort === 'last' ? (b.last || '').localeCompare(a.last || '') : CM[st.sort] ? (b.c[st.sort] || 0) - (a.c[st.sort] || 0) : b.score - a.score);
      const active = L.filter(p => p.work > 0), idle = L.filter(p => !p.work), tot = L.reduce((s, p) => s + p.work, 0);
      const catTot = usedCats.filter(c => c[2] > 0).map(([k, l, , ic]) => [k, l, ic, L.reduce((s, p) => s + (p.c[k] || 0), 0)]).sort((a, b) => b[3] - a[3]);
      const top = L.filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
      const hrAbs = L.reduce((s, p) => s + (p.hr.absent || 0), 0), hrLate = L.reduce((s, p) => s + (p.hr.late || 0), 0);
      const notable = []; ['visit', 'form', 'quiz', 'prep', 'cover', 'counsel', 'preport', 'deck'].forEach(k => L.forEach(p => (p.items[k] || []).slice(0, 2).forEach(it => notable.push({ p, k, ...it }))));
      notable.sort((a, b) => b.d.localeCompare(a.d) || CM[b.k][2] - CM[a.k][2]);
      B.innerHTML = `<div class="sw-k">${[[AR(active.length) + ' / ' + AR(L.length), 'موظفون لهم عمل', '#2E8B57'], [AR(tot), 'إجمالي الأعمال', '#005499'], [catTot[0] ? catTot[0][1] : '—', 'الأكثر نشاطاً', '#3AB1DB'], [AR(idle.length), 'بلا أي عمل مسجّل', idle.length ? '#C05621' : '#2E8B57'], [AR(hrLate) + ' · ' + AR(hrAbs), 'تأخر · غياب وظيفي', '#7E62C2']].map(([v, l, c], i) => `<button type="button" class="sw-kc" style="--c:${c}" data-kpi="${i}"><b>${v}</b><span>${l}</span></button>`).join('')}</div>
        <div class="sw-hi"><section><h3>🏅 الأكثر إنجازاً</h3>${top.length ? `<ol>${top.map(p => `<li><button type="button" class="linkbtn" data-p="${p.id}">${esc(p.name)}</button> <span class="small muted">${CAT.filter(c => c[2] > 0 && p.c[c[0]]).sort((a, b) => (p.c[b[0]] || 0) * b[2] - (p.c[a[0]] || 0) * a[2]).slice(0, 3).map(c => `${c[3]} ${AR(p.c[c[0]])} ${c[1]}`).join(' · ')}</span></li>`).join('')}</ol>` : '<p class="small muted">لا أعمال في الفترة</p>'}</section>
          <section><h3>✨ أبرز الأعمال</h3>${notable.length ? `<ul>${notable.slice(0, 8).map(n => `<li>${CM[n.k][3]} <b>${esc(n.p.name)}</b> — ${esc(CM[n.k][1])}: ${esc(String(n.l).slice(0, 70))} <span class="small muted">${AR(A.dmy(A.parseDate(n.d)))}</span></li>`).join('')}</ul>` : '<p class="small muted">لا أعمال بارزة في الفترة</p>'}</section>
          <section><h3>📊 حسب النوع</h3><div class="sw-bars">${catTot.filter(c => c[3]).slice(0, 8).map(([k, l, ic, n]) => `<button type="button" class="sw-bar" data-sort="${k}" title="ترتيب الموظفين حسب ${l}"><span>${ic} ${l}</span><i style="width:${Math.max(4, Math.round(n / (catTot[0][3] || 1) * 100))}%"></i><b>${AR(n)}</b></button>`).join('') || '<p class="small muted">—</p>'}</div></section></div>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin:12px 0 6px"><input class="in" id="swQ" placeholder="بحث باسم الموظف" value="${esc(st.q || '')}" style="max-width:240px"><label class="small" for="swS">الترتيب</label><select class="in" id="swS" style="width:auto"><option value="score" ${st.sort === 'score' ? 'selected' : ''}>مؤشر الإنجاز</option><option value="name" ${st.sort === 'name' ? 'selected' : ''}>الاسم</option><option value="last" ${st.sort === 'last' ? 'selected' : ''}>آخر عمل</option>${usedCats.map(([k, l]) => `<option value="${k}" ${st.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="scroll"><table class="tbl sw-t"><thead><tr><th>الموظف</th><th>المؤشر</th>${usedCats.map(([k, l, , ic]) => `<th title="${l}"><button type="button" class="sw-th" data-sort="${k}">${ic}<span>${l}</span></button></th>`).join('')}<th>آخر عمل</th></tr></thead>
          <tbody>${list.map(p => `<tr class="${p.work ? '' : 'sw-idle'}"><td><button type="button" class="linkbtn" data-p="${p.id}"><b>${esc(p.name)}</b></button>${p.title ? `<div class="small muted">${esc(p.title)}</div>` : ''}</td><td><b>${AR(p.score)}</b></td>${usedCats.map(([k]) => `<td>${k === 'hr' ? (Object.keys(p.hr).length ? Object.entries(p.hr).map(([s, n]) => `<span class="sw-hr sw-${s}">${HRS[s] || s} ${AR(n)}</span>`).join(' ') : '—') : p.c[k] ? AR(p.c[k]) : '<span class="faint">·</span>'}</td>`).join('')}<td class="small">${p.last ? AR(A.dmy(A.parseDate(p.last))) : '—'}</td></tr>`).join('')}</tbody></table></div>
        <p class="small muted">المؤشر = مجموع الأعمال بأوزان (الزيارة ٥، الاختبار والنموذج ٤، التحضير والانتظار والإرشاد ٣…) — للمقارنة السريعة لا للتقييم. اضغط اسم الموظف لتقريره المفصّل.</p>`;
      $('#swQ', B).oninput = e => { st.q = e.target.value; save(); const pos = e.target.selectionStart; draw(); const i = $('#swQ', B); i.focus(); i.setSelectionRange(pos, pos); };
      $('#swS', B).onchange = e => { st.sort = e.target.value; save(); draw(); };
      $$('[data-sort]', B).forEach(b => b.onclick = () => { st.sort = b.dataset.sort; save(); draw(); });
      $$('[data-p]', B).forEach(b => b.onclick = () => detail(P[b.dataset.p], from, to));
      $$('[data-kpi]', B).forEach(b => b.onclick = () => { const i = +b.dataset.kpi; if (i === 3) listModal('بلا أي عمل مسجّل', idle); else if (i === 0) listModal('موظفون لهم عمل', active); else if (i === 4) listModal('التأخر والغياب الوظيفي', L.filter(p => p.hr.late || p.hr.absent)); else { st.sort = i === 2 && catTot[0] ? catTot[0][0] : 'score'; save(); draw(); } });
    };
    const listModal = (t, l) => { const m = A.modal(`<h3>${t} (${AR(l.length)})</h3><div class="sw-ml">${l.map(p => `<button type="button" class="linkbtn" data-p="${p.id}">${esc(p.name)}</button>`).join('') || '<p class="small muted">لا أحد</p>'}</div>`); $$('[data-p]', m.el).forEach(b => b.onclick = () => { m.close(); detail(P[b.dataset.p], from, to); }); };
    draw();
    const repHtml = () => `<table><thead><tr><th>الموظف</th><th>المؤشر</th>${usedCats.map(([, l]) => `<th>${l}</th>`).join('')}</tr></thead><tbody>${L.slice().sort((a, b) => b.score - a.score).map(p => `<tr><td><b>${esc(p.name)}</b></td><td>${AR(p.score)}</td>${usedCats.map(([k]) => `<td>${k === 'hr' ? Object.entries(p.hr).map(([s, n]) => (HRS[s] || s) + ' ' + AR(n)).join('، ') : AR(p.c[k] || 0)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    $('#swPr', root).onclick = () => A.printDoc('تقرير متابعة الموظفين وأعمالهم', `${AR(A.dmy(A.parseDate(from)))}${from !== to ? ' — ' + AR(A.dmy(A.parseDate(to))) : ''}`, repHtml(), true);
    $('#swX', root).onclick = () => { const ws = XLSX.utils.json_to_sheet(L.map(p => Object.assign({ 'الموظف': p.name, 'المسمى': p.title, 'المؤشر': p.score }, Object.fromEntries(usedCats.map(([k, l]) => [l, k === 'hr' ? Object.entries(p.hr).map(([s, n]) => (HRS[s] || s) + ' ' + n).join('، ') : p.c[k] || 0])), { 'آخر عمل': p.last }))); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الموظفون'); XLSX.writeFile(wb, `متابعة الموظفين ${from} - ${to}.xlsx`); };
  };

  function detail(p, from, to) {
    const days = Object.keys(p.days).sort().reverse();
    const body = pr => `<div class="sw-dk">${CAT.filter(c => p.c[c[0]] && c[0] !== 'hr').map(c => `<span>${c[3]} ${c[1]}: <b>${AR(p.c[c[0]])}</b></span>`).join('')}${Object.keys(p.hr).length ? `<span>🕘 ${Object.entries(p.hr).map(([s, n]) => (HRS[s] || s) + ' ' + AR(n)).join('، ')}</span>` : ''}</div>
      ${days.length ? days.map(d => `<h3 class="sw-dh">${esc((A.DAYS || [])[A.parseDate(d).getDay()] || '')} ${AR(A.dmy(A.parseDate(d)))}</h3><table class="${pr ? '' : 'tbl'}"><thead><tr><th>العمل</th><th>العدد</th><th>التفاصيل</th></tr></thead><tbody>${p.days[d].slice().sort((a, b) => (CM[b.c] || [0, 0, 0])[2] - (CM[a.c] || [0, 0, 0])[2]).map(r => `<tr><td>${(CM[r.c] || [])[3] || ''} ${esc((CM[r.c] || [r.c, r.c])[1])}</td><td>${r.c === 'hr' ? '' : AR(r.n)}</td><td class="lt small">${r.c === 'hr' ? esc(HRS[(r.l || [])[0]] || (r.l || [])[0] || '') : r.c === 'login' ? '' : esc((r.l || []).filter(Boolean).slice(0, 6).join(' · '))}${r.n > 6 && r.c !== 'hr' && r.c !== 'login' ? ' …' : ''}</td></tr>`).join('')}</tbody></table>`).join('') : '<p class="small muted">لا أعمال مسجّلة في الفترة.</p>'}`;
    const m = A.modal(`<div class="row" style="gap:8px;align-items:center;flex-wrap:wrap"><h3 style="margin:0;flex:1">${esc(p.name)} <span class="small muted">${esc(p.title)}</span></h3><button class="btn ghost sm" id="sdPr">${I.print || ''} طباعة</button></div>
      <p class="small muted" style="margin:4px 0 8px">${AR(A.dmy(A.parseDate(from)))}${from !== to ? ' — ' + AR(A.dmy(A.parseDate(to))) : ''} · المؤشر ${AR(p.score)}</p>${body(false)}`, { cls: 'wide' });
    $('#sdPr', m.el).onclick = () => A.printDoc('تقرير أعمال: ' + p.name, `${AR(A.dmy(A.parseDate(from)))}${from !== to ? ' — ' + AR(A.dmy(A.parseDate(to))) : ''}`, body(true), false);
  }

  function css() {
    if (document.getElementById('sw-css')) return;
    const s = document.createElement('style'); s.id = 'sw-css';
    s.textContent = `.sw-rg{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0 12px}.sw-rg>button{border:1.5px solid #DCE7F3;background:#fff;color:#082B5A;border-radius:999px;padding:5px 13px;font:inherit;font-weight:700;cursor:pointer}.sw-rg>button.on{background:#082B5A;color:#fff;border-color:#082B5A}.sw-rg button:focus-visible{outline:3px solid #3AB1DB}
      .sw-cu{display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap;max-width:100%}.sw-cu .in{width:auto;min-width:0;max-width:150px}
      .sw-k{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}.sw-kc{border:1px solid #E4EBF5;border-radius:16px;padding:12px;background:linear-gradient(180deg,#fff,#F7FAFD);text-align:start;font:inherit;color:#082B5A;cursor:pointer;box-shadow:0 4px 12px rgba(8,43,90,.06);border-inline-start:4px solid var(--c)}
      .sw-kc b{display:block;font-size:22px;color:var(--c)}.sw-kc span{font-size:13px;color:#40546F}.sw-kc:focus-visible{outline:3px solid #3AB1DB}
      .sw-hi{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:12px}.sw-hi section{border:1px solid #E4EBF5;border-radius:16px;padding:10px 12px;background:#fff}.sw-hi h3{margin:0 0 6px;font-size:15px}.sw-hi ol,.sw-hi ul{margin:0;padding-inline-start:18px;display:grid;gap:5px;font-size:13.5px}
      .sw-bars{display:grid;gap:5px}.sw-bar{display:grid;grid-template-columns:minmax(110px,1.2fr) 2fr 40px;gap:6px;align-items:center;border:0;background:none;font:inherit;font-size:12.5px;color:#082B5A;cursor:pointer;text-align:start;padding:2px;border-radius:8px}.sw-bar:hover,.sw-bar:focus-visible{background:#F2F7FC;outline:none}.sw-bar i{display:block;height:10px;border-radius:5px;background:linear-gradient(90deg,#3AB1DB,#005499)}.sw-bar b{text-align:end}
      .sw-t th{white-space:nowrap}.sw-th{border:0;background:none;font:inherit;color:inherit;cursor:pointer;display:inline-flex;flex-direction:column;align-items:center;gap:1px;padding:0}.sw-th span{font-size:11px;font-weight:700;max-width:78px;white-space:normal;line-height:1.2}
      .sw-t td{text-align:center}.sw-t td:first-child{text-align:start;min-width:150px}.sw-idle td{background:#FFF8F1}
      .sw-hr{display:inline-block;padding:1px 7px;border-radius:99px;font-size:11.5px;background:#EEF3F9;white-space:nowrap}.sw-late{background:#FFF4E0;color:#8A5A00}.sw-absent{background:#FDECEC;color:#B42318}.sw-present{background:#E8F6EE;color:#1F6B43}
      .sw-dk{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}.sw-dk span{background:#F2F7FC;border-radius:10px;padding:4px 9px;font-size:13px}.sw-dh{margin:12px 0 4px;font-size:15px}.sw-ml{display:grid;gap:6px}
      .linkbtn{background:none;border:0;padding:0;color:#005499;text-decoration:underline;cursor:pointer;font:inherit;text-align:start}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}`;
    document.head.appendChild(s);
  }
})();
