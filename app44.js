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
  const T = () => Object.assign({ hide: [], nav: [], ownerPrep: false }, ((S.school || {}).settings || {}).tui || {});
  const isOwner = () => !!(S.me && S.me.is_owner);
  function apply() {
    let st = document.getElementById('tuiCss'); if (!st) { st = document.createElement('style'); st.id = 'tuiCss'; document.head.appendChild(st); }
    if (!S.me) { st.textContent = ''; return; }
    const t = T(), sel = [];
    if (isOwner()) { if (!t.ownerPrep) sel.push('#myPrep', '#ppBoard'); }
    else BLK.forEach(([, l]) => l.forEach(([k, , s]) => { if (t.hide.includes(k)) sel.push(s); }));
    st.textContent = sel.length ? sel.join(',') + '{display:none!important}' : '';
  }
  A.tuiApply = apply;
  // القائمة: إخفاء عناصر عن المعلمين (المالك يرى كل شيء دائماً)
  const wrapNav = () => (A.NAV || []).forEach(n => { if (n._tui || typeof n[2] !== 'function') return; const f = n[2]; n[2] = function () { if (S.me && !S.me.is_owner && T().nav.includes(n[0])) return false; return f.apply(this, arguments); }; n._tui = true; });
  if (A.NAV && !A.NAV.some(n => n[0] === 'tui')) A.NAV.push(['tui', 'تخصيص صفحة المعلم', () => isOwner()]);
  setTimeout(wrapNav, 0);
  // تطبيق عند كل عرض
  ['my', 'prep'].forEach(k => { const v0 = V[k]; if (v0) V[k] = function () { apply(); return v0.apply(this, arguments); }; });
  const ob = new MutationObserver(() => { if (!document.getElementById('tuiCss')) apply(); }); ob.observe(document.head, { childList: true });
  setTimeout(apply, 0);

  V.tui = function (root) {
    if (!isOwner()) { root.innerHTML = `<div class="card">${A.emptyBox('للمالك فقط')}</div>`; return; }
    wrapNav(); const t = T();
    const navs = (A.NAV || []).filter(n => !['tui', 'home', 'my'].includes(n[0]));
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">تخصيص صفحة المعلم</h2><p class="sub" style="margin:2px 0 0">اختر ما يظهر للمعلمين في صفحتهم وفي القائمة. أنت (المالك) ترى كل شيء دائماً، والتغيير يسري على كل المعلمين فور حفظه.</p></div></div>
      <div class="grid g2" style="align-items:start">${BLK.map(([g, l]) => `<div class="sec-box"><b>${g}</b><div style="display:grid;gap:4px;margin-top:6px">${l.map(([k, n]) => `<label class="chk"><input type="checkbox" data-b="${k}" ${t.hide.includes(k) ? '' : 'checked'}> ${n}</label>`).join('')}</div></div>`).join('')}</div>
      <div class="sec-box" style="margin-top:10px"><b>عناصر القائمة للمعلمين</b> <span class="small muted">— ما تلغي تحديده يختفي من قائمة المعلمين وصفحتهم الرئيسية (الصلاحيات تبقى كما هي)</span>
        <div class="perm-grid" style="margin-top:6px">${navs.map(([k, n]) => `<label class="chk"><input type="checkbox" data-n="${k}" ${t.nav.includes(k) ? '' : 'checked'}> ${esc(n)}</label>`).join('')}</div></div>
      <div class="sec-box" style="margin-top:10px"><b>حسابك أنت</b><label class="chk" style="margin-top:6px"><input type="checkbox" id="tuO" ${t.ownerPrep ? 'checked' : ''}> إظهار «جدولي والتحضير» في حساب المالك</label><p class="small muted" style="margin:2px 0 0">مخفي افتراضياً: التحضير للمعلمين، وتبقى لك إدارة «مكتبة المدرسة» ومتابعة التحضير.</p></div>
      <div class="row" style="gap:6px;margin-top:12px;flex-wrap:wrap"><button class="btn ok" id="tuS">حفظ</button><button class="btn ghost" id="tuA">إظهار الكل</button></div></div>`;
    $('#tuA', root).onclick = () => { $$('[data-b],[data-n]', root).forEach(i => i.checked = true); };
    $('#tuS', root).onclick = e => A.run(e.currentTarget, async () => {
      const tui = { hide: $$('[data-b]', root).filter(i => !i.checked).map(i => i.dataset.b), nav: $$('[data-n]', root).filter(i => !i.checked).map(i => i.dataset.n), ownerPrep: $('#tuO', root).checked };
      const settings = { ...(S.school.settings || {}), tui }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; apply(); A.toast(`حُفظ — مخفي عن المعلمين: ${AR(tui.hide.length)} جزء و${AR(tui.nav.length)} عنصر قائمة`, 'ok');
    });
  };
})();
