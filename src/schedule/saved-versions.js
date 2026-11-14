/* منصة دينا — النسخ المحفوظة (بالاسم والتاريخ) + الحفظ السحابي التلقائي لأداة النصاب
   أي نسخة يمكن العودة إليها، وقبل كل استرجاع تُحفظ نسخة تلقائية من الحالي فلا يضيع شيء. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, I } = A;
  const today = () => new Date().toLocaleDateString('ar-SA-u-nu-latn-ca-gregory', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const stamp = () => new Date().toLocaleString('ar-SA-u-nu-latn-ca-gregory', { dateStyle: 'short', timeStyle: 'short' });

  async function listSnaps(tool, scope) { try { return await api.list('tool_snapshots', { school_id: S.school.id, tool, scope }, { order: 'created_at', desc: true }); } catch (_) { return []; } }
  async function addSnap(tool, scope, name, data, auto) { return (await api.ins('tool_snapshots', { school_id: S.school.id, tool, scope, name, data, auto: !!auto, created_by: S.me.id }))[0]; }
  A.addSnapshot = addSnap;

  // نافذة النسخ: حفظ نسخة باسم، استرجاع، إعادة تسمية، حذف، تنزيل/رفع ملف
  A.snapshots = function ({ tool, scope = '', title, getData, apply }) {
    const m = A.modal(`<h3>النسخ المحفوظة — ${esc(title)}</h3>
      <p class="sub">احفظ الحالة الحالية باسم وتاريخ لتعود إليها في أي وقت. عند الاسترجاع تُحفظ نسخة من الحالي تلقائياً قبل الاستبدال.</p>
      <div class="row" style="gap:8px;flex-wrap:wrap"><input class="in" id="snN" style="flex:1;min-width:220px" value="نسخة ${esc(today())}" aria-label="اسم النسخة"><button class="btn" id="snSave">${I.plus} حفظ نسخة الآن</button>
        <button class="btn ghost sm" id="snDl">${I.down} تنزيل ملف احتياطي</button><label class="btn ghost sm">رفع ملف احتياطي<input type="file" id="snUp" accept="application/json" hidden></label></div>
      <div id="snL" style="margin-top:12px"><div class="spinner"></div></div>`, { cls: 'wide' });
    const L = m.el.querySelector('#snL');
    const draw = async () => {
      const l = await listSnaps(tool, scope);
      L.innerHTML = l.length ? `<div class="scroll" style="max-height:52vh"><table class="tbl"><thead><tr><th>الاسم</th><th>التاريخ</th><th>بواسطة</th><th></th></tr></thead><tbody>${l.map(s => `<tr><td><b>${esc(s.name)}</b>${s.auto ? ' <span class="pill st-empty">تلقائية</span>' : ''}</td><td class="small">${A.fmtDT(s.created_at)}</td><td class="small">${esc(A.personName(s.created_by) || '')}</td><td class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn ok sm" data-rs="${s.id}">استرجاع</button><button class="btn ghost sm" data-rn="${s.id}">تسمية</button><button class="btn ghost sm" data-dj="${s.id}" aria-label="تنزيل">${I.down}</button><button class="btn bad sm" data-dl="${s.id}" aria-label="حذف">×</button></td></tr>`).join('')}</tbody></table></div>` : A.emptyBox('لا توجد نسخ محفوظة بعد', 'احفظ أول نسخة من الزر أعلاه.');
      const find = id => l.find(x => x.id === id);
      $$('[data-rs]', L).forEach(b => b.onclick = ev => A.run(ev.currentTarget, async () => { const s = find(b.dataset.rs); if (!(await A.confirmBox(`استرجاع «${esc(s.name)}»؟<br><span class="small muted">تُحفظ نسخة من الحالة الحالية أولاً باسم «قبل الاسترجاع».</span>`, 'استرجاع'))) return; const cur = await getData(); if (cur) await addSnap(tool, scope, 'قبل الاسترجاع — ' + stamp(), cur, true); await apply(s.data); m.close(); A.toast(`استُرجعت «${s.name}»`, 'ok'); }));
      $$('[data-rn]', L).forEach(b => b.onclick = ev => A.run(ev.currentTarget, async () => { const s = find(b.dataset.rn), n = prompt('الاسم الجديد', s.name); if (!n || !n.trim()) return; await api.upd('tool_snapshots', s.id, { name: n.trim() }); draw(); }));
      $$('[data-dj]', L).forEach(b => b.onclick = () => { const s = find(b.dataset.dj); A.download(new Blob([JSON.stringify({ tool, name: s.name, at: s.created_at, data: s.data }, null, 1)], { type: 'application/json' }), `${s.name}.json`); });
      $$('[data-dl]', L).forEach(b => b.onclick = ev => A.run(ev.currentTarget, async () => { const s = find(b.dataset.dl); if (!(await A.confirmBox(`حذف النسخة «${esc(s.name)}» نهائياً؟`, 'حذف', true))) return; await api.del('tool_snapshots', s.id); draw(); }));
    };
    m.el.querySelector('#snSave').onclick = ev => A.run(ev.currentTarget, async () => { const n = m.el.querySelector('#snN').value.trim() || 'نسخة ' + stamp(); const d = await getData(); if (!d) throw new Error('لا توجد بيانات للحفظ'); await addSnap(tool, scope, n, d, false); A.toast('حُفظت النسخة', 'ok'); draw(); });
    m.el.querySelector('#snDl').onclick = ev => A.run(ev.currentTarget, async () => { const d = await getData(); A.download(new Blob([JSON.stringify({ tool, name: title, at: new Date().toISOString(), data: d }, null, 1)], { type: 'application/json' }), `${title} — ${today().replace(/\//g, '-')}.json`); });
    m.el.querySelector('#snUp').onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; f.text().then(t => A.run(null, async () => { const j = JSON.parse(t), d = j && j.data !== undefined ? j.data : j; if (!d || typeof d !== 'object') throw new Error('ملف غير صالح'); await addSnap(tool, scope, 'من ملف: ' + (j.name || f.name.replace(/\.json$/, '')), d, false); A.toast('أُضيف الملف كنسخة — اضغط «استرجاع» لتطبيقه', 'ok'); draw(); })).catch(() => A.toast('ملف غير صالح', 'err')); };
    draw();
  };

  // ---------- توزيع الحصص: زر النسخ المحفوظة ----------
  const plan0 = V.plan;
  if (plan0) V.plan = async function (root) {
    await plan0(root);
    const bar = $('.pl-bar', root); if (!bar || $('#plSnap', bar)) return;
    bar.insertAdjacentHTML('afterbegin', `<button class="btn ghost sm" id="plSnap">النسخ المحفوظة</button>`);
    $('#plSnap', bar).onclick = () => A.snapshots({ tool: 'plan', scope: S.sectionId, title: 'توزيع الحصص — ' + A.section().name,
      getData: async () => { const r = (await api.list('section_plans', { section_id: S.sectionId }))[0]; return (A._planState && A._planState()) || (r && r.data) || null; },
      apply: async d => { await api.ups('section_plans', [{ section_id: S.sectionId, data: d }], 'section_id'); if (A._planReload) A._planReload(); V.plan(root); } });
  };

  // ---------- أداة النصاب: حفظ سحابي تلقائي + نسخ ----------
  const NK = 'dina_nisab_state_v2', NDIRTY = 'dina_nisab_dirty', NBASE = 'dina_nisab_base';
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} }, del: k => { try { localStorage.removeItem(k); } catch (_) {} } };
  async function cloudNisab() { try { return (await api.list('tool_states', { school_id: S.school.id, tool: 'nisab', scope: '' }))[0] || null; } catch (_) { return null; } }
  A.readNisabAny = async () => { const l = ls.get(NK); if (l) { try { return JSON.parse(l); } catch (_) {} } const c = await cloudNisab(); return c && c.data; };
  async function pushNisab(st) {
    const raw = ls.get(NK); if (!raw) return; let data; try { data = JSON.parse(raw); } catch (_) { return; }
    if (st) { st.textContent = 'يحفظ…'; st.className = 'rec-st'; }
    try {
      const r = (await api.ups('tool_states', [{ school_id: S.school.id, tool: 'nisab', scope: '', data }], 'school_id,tool,scope'))[0];
      ls.del(NDIRTY); if (r) ls.set(NBASE, r.updated_at);
      // نسخة تلقائية واحدة يومياً
      const dk = 'dina_nisab_auto_' + new Date().toISOString().slice(0, 10); if (!ls.get(dk)) { await addSnap('nisab', '', 'نسخة تلقائية — ' + today(), data, true); ls.set(dk, '1'); }
      if (st) { st.textContent = 'محفوظ في السحابة · ' + A.fmtDT((r && r.updated_at) || new Date().toISOString()); st.className = 'rec-st ok'; }
    } catch (e) { if (st) { st.textContent = 'لم يُحفظ سحابياً — محفوظ على هذا الجهاز وسيُعاد المحاولة'; st.className = 'rec-st bad'; } }
  }
  const nis0 = V.nisab;
  if (nis0) V.nisab = async function (root) {
    root.innerHTML = '<div class="card"><div class="spinner"></div></div>';
    // مزامنة قبل فتح الأداة: الأحدث يغلب، والتعديلات المحلية غير المرفوعة تُرفع أولاً
    const c = await cloudNisab();
    if (c && c.data) { if (ls.get(NDIRTY) && ls.get(NK)) { /* local wins, upload below */ } else if (!ls.get(NK) || ls.get(NBASE) !== c.updated_at) { ls.set(NK, JSON.stringify(c.data)); ls.set(NBASE, c.updated_at); } }
    nis0(root);
    const head = $('.card .row', root);
    if (head) head.insertAdjacentHTML('afterbegin', `<span class="rec-st" id="nsSt" role="status" aria-live="polite">${c ? 'محفوظ في السحابة · ' + A.fmtDT(c.updated_at) : 'سيُحفظ في السحابة تلقائياً'}</span><button class="btn ghost sm" id="nsSnap">النسخ المحفوظة</button>`);
    const st = $('#nsSt', root), fr = $('iframe', root);
    if (!c && ls.get(NK)) pushNisab(st); else if (ls.get(NDIRTY)) pushNisab(st);
    let tm = null;
    const onStore = e => { if (e.key !== NK || e.newValue == null) return; ls.set(NDIRTY, '1'); clearTimeout(tm); if (st) { st.textContent = 'تعديلات غير محفوظة…'; st.className = 'rec-st'; } tm = setTimeout(() => pushNisab(st), 2000); };
    window.addEventListener('storage', onStore);
    const off = () => { if (!document.body.contains(root) || !$('#nsSt', root)) { window.removeEventListener('storage', onStore); window.removeEventListener('hashchange', off); if (ls.get(NDIRTY)) pushNisab(null); } };
    window.addEventListener('hashchange', off);
    $('#nsSnap', root).onclick = () => A.snapshots({ tool: 'nisab', scope: '', title: 'احتساب النصاب',
      getData: async () => { const r = ls.get(NK); return r ? JSON.parse(r) : (c && c.data) || null; },
      apply: async d => { ls.set(NK, JSON.stringify(d)); ls.set(NDIRTY, '1'); await pushNisab(st); if (fr) fr.src = fr.src; } });
  };
})();
