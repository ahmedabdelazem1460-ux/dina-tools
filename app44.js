/* منصة دينا — تخصيص صفحة المعلم (للمالك)
   يتحكم المالك فيما يظهر للمعلمين: بطاقات «المطلوب منك»، حضور الحصص، المناوبة، «جدولي والتحضير» وأجزاؤه، حصص اليوم،
   وعناصر القائمة الجانبية. ويتحكم في ظهور التحضير في حساب المالك نفسه (مخفي افتراضياً). يُحفظ في schools.settings.tui */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  A.I.tui = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 21V9"/><circle cx="15" cy="15" r="2"/></svg>';
  const BLK = [
    ['المطلوب منك', [['head', 'عنوان «المطلوب منك» والموعد النهائي', '#myTodo .mt-h'], ['c.todo', 'بطاقة: حصص لم تكتمل', '#myTodo [data-mt="todo"]'], ['c.ret', 'بطاقة: أُعيدت للتعديل', '#myTodo [data-mt="ret"]'], ['c.send', 'بطاقة: مكتملة ولم تُرسل', '#myTodo [data-mt="send"]'], ['c.exec', 'بطاقة: تنفيذ حصص اليوم', '#myTodo [data-mt="exec"]'], ['c.live', 'بطاقة: حصص عن بعد بلا درس', '#myTodo [data-mt="live"]'], ['c.quiz', 'بطاقة: إجابات تحتاج تصحيحاً', '#myTodo [data-mt="quiz"]'], ['today', 'شريط «حصصك اليوم»', '#myTodo .mt-today']]],
    ['أقسام الصفحة', [['pa', 'حضور الحصص', '#myPa'], ['du', 'الإشراف والمناوبة', '#myDu'], ['prep', '«جدولي والتحضير» كاملاً', '#myPrep,#ppBoard'], ['prep.kpi', 'مؤشرات التحضير (النسبة والواجبات…)', '.pb-k'], ['prep.subj', 'أزرار المواد (تحضير حصص المادة)', '.pb-subj']]]];
  const BASIC = { hide: ['c.exec', 'c.live', 'c.quiz', 'pa'], nav: ['games', 'labs', 'wboard', 'resources'] };
  A.TUI_BASIC = BASIC;
  const T = () => Object.assign({ hide: BASIC.hide.slice(), nav: BASIC.nav.slice(), ownerPrep: false, ex: {} }, ((S.school || {}).settings || {}).tui || {});
  const mine = () => { const t = T(), e = (t.ex || {})[S.me && S.me.id]; return e ? { hide: e.hide || [], nav: e.nav || [] } : t; };
  const isOwner = () => !!(S.me && S.me.is_owner);
  function apply() {
    let st = document.getElementById('tuiCss'); if (!st) { st = document.createElement('style'); st.id = 'tuiCss'; document.head.appendChild(st); }
    if (!S.me) { st.textContent = ''; return; }
    const t = T(), sel = [];
    if (isOwner()) { if (!t.ownerPrep) sel.push('#myPrep', '#ppBoard'); }
    else { const m = mine(); BLK.forEach(([, l]) => l.forEach(([k, , s]) => { if (m.hide.includes(k)) sel.push(s); })); }
    st.textContent = sel.length ? sel.join(',') + '{display:none!important}' : '';
  }
  A.tuiApply = apply;
  // القائمة: إخفاء عناصر عن المعلمين (المالك يرى كل شيء دائماً)
  const wrapNav = () => (A.NAV || []).forEach(n => { if (n._tui || typeof n[2] !== 'function') return; const f = n[2]; n[2] = function () { if (S.me && !S.me.is_owner && mine().nav.includes(n[0])) return false; return f.apply(this, arguments); }; n._tui = true; });
  if (A.NAV && !A.NAV.some(n => n[0] === 'tui')) A.NAV.push(['tui', 'تخصيص صفحة المعلم', () => isOwner()]);
  setTimeout(wrapNav, 0);
  // تطبيق عند كل عرض
  ['my', 'prep'].forEach(k => { const v0 = V[k]; if (v0) V[k] = function () { apply(); return v0.apply(this, arguments); }; });
  const ob = new MutationObserver(() => { if (!document.getElementById('tuiCss')) apply(); }); ob.observe(document.head, { childList: true });
  setTimeout(apply, 0);

  V.tui = function (root) {
    if (!isOwner()) { root.innerHTML = `<div class="card">${A.emptyBox('للمالك فقط')}</div>`; return; }
    wrapNav(); const t = T(); t.ex = t.ex || {};
    const navs = (A.NAV || []).filter(n => !['tui', 'home', 'my'].includes(n[0]));
    const staff = (S.staff || []).filter(x => x.active !== false && !x.is_owner).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
    const pn = id => (staff.find(x => x.id === id) || {}).full_name || A.personName(id) || '—';
    const lbl = k => { for (const [, l] of BLK) { const f = l.find(x => x[0] === k); if (f) return f[1]; } const n = navs.find(x => x[0] === k); return n ? n[1] : k; };
    const boxes = (cfg, pre) => `<div class="grid g2" style="align-items:start">${BLK.map(([g, l]) => `<div class="sec-box"><b>${g}</b><div style="display:grid;gap:4px;margin-top:6px">${l.map(([k, n]) => `<label class="chk"><input type="checkbox" data-${pre}b="${k}" ${cfg.hide.includes(k) ? '' : 'checked'}> ${n}</label>`).join('')}</div></div>`).join('')}</div>
      <div class="sec-box" style="margin-top:8px"><b>عناصر القائمة</b><div class="perm-grid" style="margin-top:6px">${navs.map(([k, n]) => `<label class="chk"><input type="checkbox" data-${pre}n="${k}" ${cfg.nav.includes(k) ? '' : 'checked'}> ${esc(n)}</label>`).join('')}</div></div>`;
    const read = (el, pre) => ({ hide: $$(`[data-${pre}b]`, el).filter(i => !i.checked).map(i => i.getAttribute(`data-${pre}b`)), nav: $$(`[data-${pre}n]`, el).filter(i => !i.checked).map(i => i.getAttribute(`data-${pre}n`)) });
    const setBoxes = (el, pre, cfg) => { $$(`[data-${pre}b]`, el).forEach(i => i.checked = !cfg.hide.includes(i.getAttribute(`data-${pre}b`))); $$(`[data-${pre}n]`, el).forEach(i => i.checked = !cfg.nav.includes(i.getAttribute(`data-${pre}n`))); };
    const diff = e => { const add = [...t.hide.filter(k => !e.hide.includes(k)), ...t.nav.filter(k => !e.nav.includes(k))].map(lbl), rem = [...e.hide.filter(k => !t.hide.includes(k)), ...e.nav.filter(k => !t.nav.includes(k))].map(lbl); return [add.length ? 'يرى إضافةً: ' + add.join('، ') : '', rem.length ? 'مخفي عنه: ' + rem.join('، ') : ''].filter(Boolean).join(' · ') || 'مطابق للافتراضي'; };
    const save = async msg => { const settings = { ...(S.school.settings || {}), tui: t }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; apply(); A.toast(msg || 'حُفظ', 'ok'); };
    const draw = () => {
      const exs = Object.keys(t.ex).filter(id => staff.some(x => x.id === id));
      root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">تخصيص صفحة المعلم</h2><p class="sub" style="margin:2px 0 0">إعداد افتراضي يُطبَّق على كل المعلمين، واستثناءات لمعلمين تحددهم. أنت (المالك) ترى كل شيء دائماً.</p></div></div>
        <h3 style="margin:4px 0 6px">١. الإعداد الافتراضي لكل المعلمين</h3>
        <div class="row" style="gap:6px;margin-bottom:8px;flex-wrap:wrap"><button class="btn ghost sm" id="tuB">الأساسي فقط</button><button class="btn ghost sm" id="tuA">إظهار الكل</button><span class="small muted">«الأساسي»: الخطة والتحضير والاختبارات وسجل المتابعة وبطاقات المطلوب الرئيسية.</span></div>
        <div id="tuD">${boxes(t, 'd')}</div>
        <div class="row" style="margin-top:8px"><button class="btn ok" id="tuS">حفظ الإعداد الافتراضي</button></div>
        <h3 style="margin:16px 0 6px">٢. الاستثناءات (${AR(exs.length)})</h3>
        <p class="small muted" style="margin:0 0 6px">معلم أو أكثر يرى ما يختلف عن الافتراضي — مثلاً منسقة ترى الألعاب والمصادر، أو معلم تُخفي عنه شيئاً.</p>
        <div style="display:grid;gap:6px">${exs.map(id => `<div class="sec-box row" style="justify-content:space-between;gap:6px;flex-wrap:wrap"><span><b>${esc(pn(id))}</b><br><span class="small muted">${esc(diff(t.ex[id]))}</span></span><span class="row" style="gap:4px"><button class="btn ghost sm" data-ee="${id}">تعديل</button><button class="btn bad sm" data-er="${id}">إلغاء الاستثناء</button></span></div>`).join('') || '<p class="small muted">لا توجد استثناءات — كل المعلمين على الإعداد الافتراضي.</p>'}</div>
        <div class="row" style="margin-top:8px"><button class="btn" id="tuX">إضافة استثناء</button></div>
        <h3 style="margin:16px 0 6px">٣. حسابك أنت</h3>
        <label class="chk"><input type="checkbox" id="tuO" ${t.ownerPrep ? 'checked' : ''}> إظهار «جدولي والتحضير» في حساب المالك</label><p class="small muted" style="margin:2px 0 0">مخفي افتراضياً: التحضير للمعلمين، وتبقى لك إدارة «مكتبة المدرسة».</p></div>`;
      const D = $('#tuD', root);
      $('#tuB', root).onclick = () => setBoxes(D, 'd', BASIC);
      $('#tuA', root).onclick = () => setBoxes(D, 'd', { hide: [], nav: [] });
      $('#tuS', root).onclick = e => A.run(e.currentTarget, async () => { Object.assign(t, read(D, 'd')); await save(`حُفظ الإعداد الافتراضي — مخفي: ${AR(t.hide.length)} جزء و${AR(t.nav.length)} عنصر قائمة`); draw(); });
      $('#tuO', root).onchange = e => A.run(null, async () => { t.ownerPrep = e.target.checked; await save(); });
      $$('[data-er]', root).forEach(b => b.onclick = () => A.run(b, async () => { delete t.ex[b.dataset.er]; await save('أُلغي الاستثناء — يتبع الإعداد الافتراضي'); draw(); }));
      $$('[data-ee]', root).forEach(b => b.onclick = () => exDlg([b.dataset.ee]));
      $('#tuX', root).onclick = () => exDlg([]);
    };
    const exDlg = ids => {
      const base = ids.length && t.ex[ids[0]] ? t.ex[ids[0]] : { hide: t.hide.slice(), nav: t.nav.slice() };
      const m = A.modal(`<h3>${ids.length ? 'تعديل استثناء' : 'إضافة استثناء'}</h3>
        <div class="field"><label>المعلمون (يمكن اختيار أكثر من معلم بالإعداد نفسه)</label><input class="in" id="exQ" placeholder="بحث بالاسم" style="margin-bottom:6px"><div class="perm-grid" id="exP" style="max-height:28vh;overflow:auto">${staff.map(x => `<label class="chk" data-nm="${esc(A.normKey(x.full_name || ''))}"><input type="checkbox" value="${x.id}" ${ids.includes(x.id) ? 'checked' : ''}> ${esc(x.full_name)}${t.ex[x.id] && !ids.includes(x.id) ? ' <span class="pill st-submitted">له استثناء</span>' : ''}</label>`).join('')}</div></div>
        <div class="row" style="gap:6px;margin-bottom:8px;flex-wrap:wrap"><span class="small muted">ابدأ من:</span><button class="btn ghost sm" id="exB">الأساسي</button><button class="btn ghost sm" id="exD">الإعداد الافتراضي</button><button class="btn ghost sm" id="exA">إظهار الكل</button></div>
        <div id="exC">${boxes(base, 'x')}</div><div class="acts"><button class="btn ok" id="exGo">حفظ الاستثناء</button></div>`, { cls: 'wide xl' });
      const C = m.el.querySelector('#exC');
      m.el.querySelector('#exQ').oninput = e => { const q = A.normKey(e.target.value); $$('#exP label', m.el).forEach(l => l.style.display = !q || l.dataset.nm.includes(q) ? '' : 'none'); };
      m.el.querySelector('#exB').onclick = () => setBoxes(C, 'x', BASIC); m.el.querySelector('#exD').onclick = () => setBoxes(C, 'x', t); m.el.querySelector('#exA').onclick = () => setBoxes(C, 'x', { hide: [], nav: [] });
      m.el.querySelector('#exGo').onclick = e => A.run(e.currentTarget, async () => { const sel = $$('#exP input:checked', m.el).map(i => i.value); if (!sel.length) throw new Error('اختر معلماً واحداً على الأقل'); const cfg = read(C, 'x');
        ids.filter(id => !sel.includes(id)).forEach(id => delete t.ex[id]); sel.forEach(id => t.ex[id] = { hide: cfg.hide.slice(), nav: cfg.nav.slice() }); await save(`حُفظ الاستثناء لـ ${A.cnt(sel.length, 'معلم', 'معلمين')}`); m.close(); draw(); });
    };
    draw();
  };
})();
