/* منصة دينا — تحكم المالك:
   - الشاشات اللحظية («لوحة الحضور اللحظية» و«المتابعة اللحظية» في اللوحة اليومية) للمالك فقط افتراضياً،
     ويمنحها لمن يشاء من «تخصيص صفحة المعلم».
   - تنسيق شجرة «نطاق العرض والإدخال» (مرحلة ← صف ← فصل) في بيانات الموظف. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  const css = `
  .scp-t{display:grid;gap:8px;margin-top:8px}
  .scp-s{border:1px solid #DCE7F3;border-radius:12px;padding:8px 10px;background:#F7FAFE}
  .scp-g{display:grid;gap:4px;margin:6px 0 0;padding-inline-start:18px;border-inline-start:2px solid #E4EBF5}
  .scp-r{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center}
  .scp-c{display:inline-flex;flex-wrap:wrap;gap:2px 10px;padding-inline-start:8px;color:#43597A}
  .scp-s input:disabled+*{opacity:.55}
  .lv-acc{border:2px solid #082B5A;border-radius:14px;padding:12px 14px;margin:0 0 14px;background:linear-gradient(180deg,#F4F8FC,#fff)}
  .lv-acc h3{margin:0 0 4px;color:#082B5A}
  .lv-acc .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:4px 12px;margin-top:8px;max-height:260px;overflow:auto}`;
  if (!document.getElementById('app54css')) { const st = document.createElement('style'); st.id = 'app54css'; st.textContent = css; document.head.appendChild(st); }

  const allow = () => (((S.school || {}).settings || {}).liveAllow) || [];
  // الشاشات اللحظية: المالك دائماً، وغيره فقط إن منحه المالك
  A.liveOK = () => !!(S.me && (S.me.is_owner || allow().includes(S.me.id)));

  // بطاقة التحكم في «تخصيص صفحة المعلم»
  const tui0 = V.tui;
  if (tui0) V.tui = function (root) {
    const r = tui0.apply(this, arguments);
    if (!(S.me && S.me.is_owner)) return r;
    const host = root.querySelector('.card') || root;
    if (host.querySelector('.lv-acc')) return r;
    const people = (S.staff || []).filter(p => p.active && !p.is_owner).sort((a, b) => a.full_name.localeCompare(b.full_name, 'ar'));
    const cur = new Set(allow());
    const box = document.createElement('section'); box.className = 'lv-acc'; box.setAttribute('aria-labelledby', 'lvAccH');
    box.innerHTML = `<h3 id="lvAccH">الشاشات اللحظية</h3><p class="small muted" style="margin:0">«لوحة الحضور اللحظية» و«المتابعة اللحظية» في اللوحة اليومية تظهر لك وحدك. حدّد من تمنحه رؤيتها (اختياري).</p>
      <div class="row" style="gap:6px;margin-top:6px"><input class="in" id="lvAccQ" placeholder="بحث باسم الموظف" style="max-width:220px;padding:6px 10px" aria-label="بحث باسم الموظف"><span class="pill st-approved" id="lvAccN">${AR(cur.size)} ممنوح</span></div>
      <div class="grid">${people.map(p => `<label class="chk" data-nm="${esc(A.normKey ? A.normKey(p.full_name) : p.full_name)}"><input type="checkbox" data-lv="${p.id}" ${cur.has(p.id) ? 'checked' : ''}> ${esc(p.full_name)}${p.title ? ` <span class="small muted">· ${esc(p.title)}</span>` : ''}</label>`).join('') || '<p class="small muted">لا موظفين</p>'}</div>`;
    host.insertBefore(box, host.children[1] || null);
    box.querySelector('#lvAccQ').oninput = ev => { const v = A.normKey ? A.normKey(ev.target.value) : ev.target.value; $$('[data-nm]', box).forEach(l => l.hidden = !!v && !l.dataset.nm.includes(v)); };
    $$('[data-lv]', box).forEach(i => i.onchange = () => A.run(null, async () => {
      const set = new Set(allow()); if (i.checked) set.add(i.dataset.lv); else set.delete(i.dataset.lv);
      const settings = { ...(S.school.settings || {}), liveAllow: [...set] };
      const res = await api.updateSchool(S.school.id, { settings }); S.school.settings = (res && res.settings) || settings;
      box.querySelector('#lvAccN').textContent = AR(set.size) + ' ممنوح'; A.toast('حُفظ', 'ok');
    }));
    return r;
  };
})();
