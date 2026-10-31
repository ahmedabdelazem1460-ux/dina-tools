/* سجل المتابعة (سجلات برو) داخل المنصة — الأداة كما هي، مع حفظ سحابي لكل معلم وأسماء طلاب فصوله من المنصة */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, esc, AR } = A;
  A.I.records = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/><path d="M15 17l1.5 1.5L19 16"/></svg>';
  const LK = id => 'dina-reg-v1-' + id, DK = id => 'dina-rec-dirty-' + id;
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (_) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} }, del: k => { try { localStorage.removeItem(k); } catch (_) {} } };
  const hasData = s => { try { const w = JSON.parse(s); return !!(w && ((w.ps || []).some(p => (p.d.st || []).some(x => x.n || Object.keys(x.c || {}).length)) || ((w.db || {}).students || []).length)); } catch (_) { return false; } };
  let cleanup = null;

  function myClassStudents(all) {
    const mine = new Set(S.entries.filter(e => e.teacher_id === S.me.id).map(e => e.class_id));
    const ids = S.me.is_owner && !mine.size ? new Set(S.classes.map(c => c.id)) : mine;
    return all.filter(s => ids.has(s.class_id)).map(s => { const c = A.cls(s.class_id) || {}; return { n: s.full_name, g: [c.grade_word, c.stage].filter(Boolean).join(' '), c: c.class_label || c.name || '' }; });
  }

  V.records = async function (root) {
    if (cleanup) cleanup();
    const me = S.me.id, ver = (document.querySelector('script[src^="app14.js"]') || {}).src || '';
    root.innerHTML = '<div class="spinner"></div>';
    let row = null, students = [];
    try { row = (await api.list('record_books', { staff_id: me }))[0] || null; } catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر تحميل السجل', esc(e.message))}</div>`; return; }
    try { students = myClassStudents(await api.list('students', { active: true })); } catch (_) {}
    // السحابة هي المرجع؛ إلا إذا بقيت تعديلات محلية لم تُرفع في جلسة سابقة
    const BK = 'dina-rec-base-' + me, local = ls.get(LK(me)), dirty = ls.get(DK(me)), base = ls.get(BK);
    let pendingUpload = false, conflict = false;
    const cloudNewer = row && (!base || row.updated_at > base);
    if (local && hasData(local) && (!row || (dirty && !cloudNewer))) pendingUpload = true;
    else if (row && row.data && row.data.ps) {
      if (dirty && local && hasData(local) && local !== JSON.stringify(row.data)) { ls.set(LK(me) + '-local-copy', local); conflict = true; }
      ls.set(LK(me), JSON.stringify(row.data)); ls.del(DK(me)); ls.set(BK, row.updated_at);
    }
    const leads = (S.me.is_owner || (A.hasModule && A.hasModule('supervision')));
    root.innerHTML = `<div class="card rec-card"><div class="head"><div class="grow"><h2>سجل المتابعة</h2><p class="sub" style="margin:2px 0 0">سجل درجات ومتابعة مرن لكل مادة وفصل — يُحفظ تلقائياً في حسابك على المنصة ويفتح من أي جهاز. أسماء طلاب فصولك تُضاف من المنصة تلقائياً.</p></div>
        <div class="row" style="gap:8px"><span class="rec-st" id="recSt" role="status" aria-live="polite">${pendingUpload ? 'يرفع نسختك المحلية…' : row ? 'محفوظ في السحابة · ' + A.fmtDT(row.updated_at) : 'جاهز'}</span>
        ${leads ? '<button class="btn ghost sm" id="recView">سجلات المعلمين</button>' : ''}
        <a class="btn ghost sm" id="recFull" href="tools/records.html?embed=1&k=-${me}" target="_blank" rel="noopener">صفحة كاملة</a></div></div>
      <iframe id="recF" class="rec-frame" title="سجل المتابعة" src="tools/records.html?embed=1&k=-${me}&${ver.split('?')[1] || ''}"></iframe></div>`;
    const st = $('#recSt', root), fr = $('#recF', root);
    let tm = null, busy = false, again = false;
    const upload = async () => {
      if (busy) { again = true; return; } busy = true;
      const raw = ls.get(LK(me)); if (!raw) { busy = false; return; }
      st.textContent = 'يحفظ…'; st.className = 'rec-st';
      try { const r = await api.ups('record_books', [{ staff_id: me, school_id: S.school.id, data: JSON.parse(raw) }], 'staff_id'); ls.del(DK(me)); if (r && r[0]) ls.set(BK, r[0].updated_at); st.textContent = 'محفوظ في السحابة · ' + A.fmtDT((r && r[0] && r[0].updated_at) || new Date().toISOString()); st.className = 'rec-st ok'; }
      catch (e) { st.textContent = 'لم يُحفظ سحابياً — محفوظ على هذا الجهاز وسيُعاد المحاولة'; st.className = 'rec-st bad'; }
      busy = false; if (again) { again = false; upload(); }
    };
    const onStore = e => { if (e.key !== LK(me) || e.newValue == null) return; ls.set(DK(me), '1'); clearTimeout(tm); st.textContent = 'تعديلات غير محفوظة…'; st.className = 'rec-st'; tm = setTimeout(upload, 2500); };
    const onMsg = e => {
      if (e.origin !== location.origin || !e.data || e.source !== fr.contentWindow) return;
      if (e.data.type === 'dina-rec-ready' && students.length) fr.contentWindow.postMessage({ type: 'dina-rec-students', list: students }, location.origin);
      if (e.data.type === 'dina-rec-added' && e.data.n) A.toast(`أُضيف ${AR(e.data.n)} من طلاب فصولك إلى قاعدة الطلاب في السجل`, 'ok');
      if (e.data.type === 'dina-rec-flushed') { clearTimeout(tm); upload(); }
    };
    const flush = () => { try { fr.contentWindow.postMessage({ type: 'dina-rec-flush' }, location.origin); } catch (_) {} if (ls.get(DK(me))) upload(); };
    const onHash = () => { if (!/^#\/records/.test(location.hash)) { flush(); cleanup && cleanup(); } };
    addEventListener('storage', onStore); addEventListener('message', onMsg); addEventListener('hashchange', onHash); addEventListener('pagehide', flush);
    cleanup = () => { removeEventListener('storage', onStore); removeEventListener('message', onMsg); removeEventListener('hashchange', onHash); removeEventListener('pagehide', flush); cleanup = null; };
    if (pendingUpload) upload();
    if (conflict) A.toast('وُجدت تعديلات أحدث على جهاز آخر فاعتُمدت؛ نسختك المحلية القديمة محفوظة احتياطياً على هذا الجهاز', 'warn');
    const vb = $('#recView', root); if (vb) vb.onclick = () => viewOthers();
  };

  // اطلاع المالك والمشرف على سجلات المعلمين (نسخة للاطلاع — لا تُحفظ تعديلاتها)
  async function viewOthers() {
    const rows = await api.list('record_books', { school_id: S.school.id }, { select: 'staff_id,updated_at,bytes' });
    const L = rows.filter(r => r.staff_id !== S.me.id).map(r => ({ ...r, p: S.staff.find(s => s.id === r.staff_id) })).filter(r => r.p).sort((a, b) => a.p.full_name.localeCompare(b.p.full_name, 'ar'));
    const m = A.modal(`<h3>سجلات المعلمين</h3><p class="sub">تفتح نسخة للاطلاع فقط؛ أي تعديل فيها لا يُحفظ ولا يصل إلى سجل المعلم.</p>
      ${L.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>المعلم</th><th>آخر تحديث</th><th></th></tr></thead><tbody>${L.map(r => `<tr><td><b>${esc(r.p.full_name)}</b></td><td class="small">${A.fmtDT(r.updated_at)}</td><td><button class="btn ghost sm" data-o="${r.staff_id}">فتح</button></td></tr>`).join('')}</tbody></table></div>` : A.emptyBox('لا توجد سجلات محفوظة بعد')}`);
    m.el.querySelectorAll('[data-o]').forEach(b => b.onclick = () => A.run(b, async () => {
      const r = (await api.list('record_books', { staff_id: b.dataset.o }))[0]; if (!r) return;
      const k = '-view-' + b.dataset.o; ls.set('dina-reg-v1' + k, JSON.stringify(r.data));
      window.open('tools/records.html?embed=1&k=' + k, '_blank', 'noopener');
    }));
  }
})();
