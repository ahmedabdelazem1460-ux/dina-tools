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
  // ملفات العرض: يحددها المالك بالكامل (الأساسي قابل للتعديل)، وملف افتراضي للجميع، وتوزيع كل معلم على ملف أو إعداد خاص
  const T = () => { const raw = JSON.parse(JSON.stringify(((S.school || {}).settings || {}).tui || {})); const t = Object.assign({ ownerPrep: false, profiles: null, def: 'basic', assign: {}, custom: {} }, raw);
    if (!t.profiles) { t.profiles = { basic: { name: 'الأساسي', hide: (raw.hide || BASIC.hide).slice(), nav: (raw.nav || BASIC.nav).slice() } }; Object.entries(raw.ex || {}).forEach(([id, e]) => { t.assign[id] = 'custom'; t.custom[id] = { hide: e.hide || [], nav: e.nav || [] }; }); }
    if (!t.profiles[t.def]) t.def = Object.keys(t.profiles)[0]; delete t.hide; delete t.nav; delete t.ex; return t; };
  const cfgFor = (t, id) => { const a = t.assign[id]; if (a === 'custom' && t.custom[id]) return t.custom[id]; return t.profiles[a] || t.profiles[t.def] || { hide: [], nav: [] }; };
  const mine = () => cfgFor(T(), S.me && S.me.id);
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
    wrapNav(); const t = T();
    const navs = (A.NAV || []).filter(n => !['tui', 'home', 'my'].includes(n[0]));
    const staff = (S.staff || []).filter(x => x.active !== false && !x.is_owner).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
    const lbl = k => { for (const [, l] of BLK) { const f = l.find(x => x[0] === k); if (f) return f[1]; } const n = navs.find(x => x[0] === k); return n ? n[1] : k; };
    const boxes = (cfg, pre) => `<div class="grid g2" style="align-items:start">${BLK.map(([g, l]) => `<div class="sec-box"><b>${g}</b><div style="display:grid;gap:4px;margin-top:6px">${l.map(([k, n]) => `<label class="chk"><input type="checkbox" data-${pre}b="${k}" ${cfg.hide.includes(k) ? '' : 'checked'}> ${n}</label>`).join('')}</div></div>`).join('')}</div>
      <div class="sec-box" style="margin-top:8px"><div class="row" style="justify-content:space-between;gap:6px"><b>عناصر القائمة</b><span class="row" style="gap:4px"><button type="button" class="btn ghost sm" data-all="${pre}">تحديد الكل</button><button type="button" class="btn ghost sm" data-none="${pre}">إلغاء الكل</button></span></div><div class="perm-grid" style="margin-top:6px">${navs.map(([k, n]) => `<label class="chk"><input type="checkbox" data-${pre}n="${k}" ${cfg.nav.includes(k) ? '' : 'checked'}> ${esc(n)}</label>`).join('')}</div></div>`;
    const read = (el, pre) => ({ hide: $$(`[data-${pre}b]`, el).filter(i => !i.checked).map(i => i.getAttribute(`data-${pre}b`)), nav: $$(`[data-${pre}n]`, el).filter(i => !i.checked).map(i => i.getAttribute(`data-${pre}n`)) });
    const bindAll = el => { $$('[data-all]', el).forEach(b => b.onclick = () => $$(`[data-${b.dataset.all}n]`, el).forEach(i => i.checked = true)); $$('[data-none]', el).forEach(b => b.onclick = () => $$(`[data-${b.dataset.none}n]`, el).forEach(i => i.checked = false)); };
    const sum = c => { const n = navs.filter(x => !c.nav.includes(x[0])).length, b = BLK.reduce((a, [, l]) => a + l.filter(x => !c.hide.includes(x[0])).length, 0); return `${AR(n)} عنصر قائمة · ${AR(b)} جزء في الصفحة`; };
    const save = async msg => { const settings = { ...(S.school.settings || {}), tui: t }; const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; apply(); A.toast(msg || 'حُفظ', 'ok'); };
    const pname = id => id === 'custom' ? 'إعداد خاص' : (t.profiles[id] || {}).name || '—';
    let sel = new Set(), q = '';
    const draw = () => {
      const P = Object.entries(t.profiles), cnt = id => staff.filter(x => (t.assign[x.id] || t.def) === id && !(t.assign[x.id] === 'custom')).length;
      root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">تخصيص صفحة المعلم</h2><p class="sub" style="margin:2px 0 0">أنت (المالك) ترى كل شيء وتحدد كل شيء: ملفات عرض تعرّفها بنفسك (ومنها «الأساسي»)، وملف افتراضي للجميع، وتوزيع كل معلم على ملف أو إعداد خاص به. الصلاحيات نفسها من «المسميات والصلاحيات».</p></div><a class="btn ghost" href="#/roles">المسميات والصلاحيات</a></div>
        <h3 style="margin:4px 0 6px">١. ملفات العرض</h3>
        <div class="tu-p">${P.map(([id, p]) => `<div class="sec-box"><div class="row" style="justify-content:space-between;gap:6px"><b>${esc(p.name)}</b>${id === t.def ? '<span class="pill st-approved">الافتراضي للجميع</span>' : ''}</div><div class="small muted">${sum(p)} · ${A.cnt(cnt(id), 'معلم', 'معلمين')}</div>
          <div class="row" style="gap:4px;margin-top:6px;flex-wrap:wrap"><button class="btn sm" data-pe="${id}">تعديل</button>${id !== t.def ? `<button class="btn ghost sm" data-pd="${id}">اجعله الافتراضي</button>` : ''}<button class="btn ghost sm" data-pc="${id}">نسخ</button>${P.length > 1 && id !== t.def ? `<button class="btn bad sm" data-px="${id}" aria-label="حذف">×</button>` : ''}</div></div>`).join('')}
          <button class="sec-box tu-new" id="tuN" type="button">+ ملف عرض جديد</button></div>
        <h3 style="margin:16px 0 6px">٢. توزيع المعلمين</h3>
        <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px"><input class="in" id="tuQ" placeholder="بحث بالاسم" style="max-width:220px" value="${esc(q)}"><span class="small muted">حدّد معلمين ثم:</span><select class="in" id="tuBs" style="width:auto"><option value="">— الملف الافتراضي —</option>${P.map(([id, p]) => `<option value="${id}">${esc(p.name)}</option>`).join('')}</select><button class="btn ghost sm" id="tuBa">تطبيق على المحدد (${AR(sel.size)})</button></div>
        <div class="scroll"><table class="tbl"><thead><tr><th><input type="checkbox" id="tuSa" aria-label="تحديد الكل"></th><th>المعلم</th><th>ملف العرض</th><th></th></tr></thead><tbody>${staff.filter(x => !q || A.normKey(x.full_name || '').includes(A.normKey(q))).map(x => { const a = t.assign[x.id] || ''; return `<tr><td><input type="checkbox" data-sel="${x.id}" ${sel.has(x.id) ? 'checked' : ''} aria-label="تحديد"></td><td style="text-align:start">${esc(x.full_name)}</td><td><select class="in" data-as="${x.id}" style="width:auto"><option value="">الافتراضي (${esc(pname(t.def))})</option>${P.map(([id, p]) => `<option value="${id}" ${a === id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}<option value="custom" ${a === 'custom' ? 'selected' : ''}>إعداد خاص…</option></select></td><td>${a === 'custom' ? `<button class="btn ghost sm" data-cu="${x.id}">تعديل الخاص</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>
        <h3 style="margin:16px 0 6px">٣. حسابك أنت</h3>
        <label class="chk"><input type="checkbox" id="tuO" ${t.ownerPrep ? 'checked' : ''}> إظهار «جدولي والتحضير» في حساب المالك</label></div>`;
      const ed = (title, cfg, onSave, named) => { const m = A.modal(`<h3>${title}</h3>${named ? `<div class="field"><label for="peN">اسم الملف</label><input class="in" id="peN" value="${esc(cfg.name || '')}" placeholder="مثال: منسقة المادة"></div>` : ''}<div id="peC">${boxes(cfg, 'p')}</div><div class="acts"><button class="btn ok" id="peGo">حفظ</button></div>`, { cls: 'wide xl' }); const C = m.el.querySelector('#peC'); bindAll(C);
        m.el.querySelector('#peGo').onclick = e => A.run(e.currentTarget, async () => { const c = read(C, 'p'); if (named) { c.name = m.el.querySelector('#peN').value.trim(); if (!c.name) throw new Error('اكتب اسم الملف'); } await onSave(c); m.close(); draw(); }); };
      $$('[data-pe]', root).forEach(b => b.onclick = () => { const id = b.dataset.pe; ed(`تعديل ملف «${esc(t.profiles[id].name)}»`, t.profiles[id], async c => { t.profiles[id] = c; await save('حُفظ الملف — يسري على كل من يتبعه'); }, true); });
      $$('[data-pc]', root).forEach(b => b.onclick = () => { const src = t.profiles[b.dataset.pc]; ed('ملف عرض جديد (نسخة)', { ...src, name: src.name + ' — نسخة' }, async c => { t.profiles['p' + Date.now().toString(36)] = c; await save('أُضيف الملف'); }, true); });
      $('#tuN', root).onclick = () => ed('ملف عرض جديد', { name: '', hide: [], nav: [] }, async c => { t.profiles['p' + Date.now().toString(36)] = c; await save('أُضيف الملف'); }, true);
      $$('[data-pd]', root).forEach(b => b.onclick = () => A.run(b, async () => { t.def = b.dataset.pd; await save(`«${t.profiles[t.def].name}» هو الافتراضي لكل المعلمين الآن`); draw(); }));
      $$('[data-px]', root).forEach(b => b.onclick = async () => { const id = b.dataset.px; if (!(await A.confirmBox(`حذف ملف «${esc(t.profiles[id].name)}»؟ من يتبعه يعود إلى الافتراضي.`, 'حذف', true))) return; A.run(null, async () => { delete t.profiles[id]; Object.keys(t.assign).forEach(k => { if (t.assign[k] === id) delete t.assign[k]; }); await save('حُذف الملف'); draw(); }); });
      $$('[data-as]', root).forEach(s2 => s2.onchange = () => A.run(null, async () => { const id = s2.dataset.as, v = s2.value; if (v === 'custom') { ed(`إعداد خاص — ${esc((staff.find(x => x.id === id) || {}).full_name || '')}`, t.custom[id] || cfgFor(t, id), async c => { t.assign[id] = 'custom'; t.custom[id] = c; await save('حُفظ الإعداد الخاص'); }); s2.value = t.assign[id] || ''; return; } if (v) t.assign[id] = v; else delete t.assign[id]; delete t.custom[id]; await save(); draw(); }));
      $$('[data-cu]', root).forEach(b => b.onclick = () => { const id = b.dataset.cu; ed(`إعداد خاص — ${esc((staff.find(x => x.id === id) || {}).full_name || '')}`, t.custom[id], async c => { t.custom[id] = c; await save('حُفظ الإعداد الخاص'); }); });
      $$('[data-sel]', root).forEach(c => c.onchange = () => { c.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); $('#tuBa', root).textContent = `تطبيق على المحدد (${AR(sel.size)})`; });
      $('#tuSa', root).onchange = e => { $$('[data-sel]', root).forEach(c => { c.checked = e.target.checked; e.target.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); }); $('#tuBa', root).textContent = `تطبيق على المحدد (${AR(sel.size)})`; };
      $('#tuBa', root).onclick = e => A.run(e.currentTarget, async () => { if (!sel.size) throw new Error('حدّد معلمين أولاً'); const v = $('#tuBs', root).value; sel.forEach(id => { if (v) t.assign[id] = v; else delete t.assign[id]; delete t.custom[id]; }); await save(`طُبّق على ${A.cnt(sel.size, 'معلم', 'معلمين')}`); sel = new Set(); draw(); });
      $('#tuQ', root).oninput = e => { q = e.target.value; const pos = e.target.selectionStart; draw(); const n = $('#tuQ', root); n.focus(); n.setSelectionRange(pos, pos); };
      $('#tuO', root).onchange = e => A.run(null, async () => { t.ownerPrep = e.target.checked; await save(); });
    };
    draw();
  };
})();
