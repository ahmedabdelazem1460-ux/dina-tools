/* منصة دينا — مزامنة Google Sheets: زر المزامنة، ربط الأسابيع بالملفات، وإعداد سكربت المزامنة (للمالك) */
(function () {
  const A = window.APP, V = window.VIEWS;
  const { api, S, $, $$, esc } = A;
  const ICO = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/></svg>';
  const css = document.createElement('style');
  css.textContent = `.syncbar{display:flex;flex-wrap:wrap;align-items:center;gap:10px;background:var(--card);border:1px solid var(--line);border-inline-start:4px solid var(--green);border-radius:var(--r);padding:10px 14px;margin:0 0 16px;box-shadow:var(--sh1)}
  .syncbar .ttl{display:flex;align-items:center;gap:8px;font-weight:700;color:var(--navy)}.syncbar .ttl svg{color:var(--green)}
  .syncbar .grow{flex:1;min-width:160px}.syncbar.off{border-inline-start-color:var(--warn)}
  .syncbar.busy .ttl svg{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
  @media (prefers-reduced-motion:reduce){.syncbar.busy .ttl svg{animation:none}}
  .steps{margin:0;padding-inline-start:20px;line-height:2}.codebox{direction:ltr;text-align:left;font:12px/1.5 ui-monospace,Consolas,monospace;background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:10px;max-height:180px;overflow:auto;white-space:pre}`;
  document.head.appendChild(css);

  const canSync = () => A.perm('review') || A.perm('structure');
  const canLink = () => S.me.is_owner || A.perm('structure');
  const sheetIdOf = s => { s = String(s || '').trim(); const m = s.match(/\/d\/([a-zA-Z0-9_-]{20,})/); return m ? m[1] : (/^[a-zA-Z0-9_-]{25,}$/.test(s) ? s : null); };
  const sheetUrl = id => `https://docs.google.com/spreadsheets/d/${id}/edit`;
  A.syncLabel = w => w && w.sheet_synced_at ? `آخر مزامنة: <b>${A.fmtDT(w.sheet_synced_at)}</b>` : 'لم تتم مزامنة بعد';

  // ---- سحب الشيت مباشرة من المتصفح (الملف مشارك بالرابط) — لا يحتاج سكربت جوجل
  function parseCSV(t) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const ch = t[i];
      if (q) { if (ch === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { row.push(f); f = ''; } else if (ch === '\n') { row.push(f); rows.push(row); row = []; f = ''; } else if (ch !== '\r') f += ch;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
  }
  const PW = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة'];
  const DW = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const nrm = x => A.normKey(x || '');
  function rowsOfTab(csv, className) {
    const out = []; let d = -1;
    parseCSV(csv).slice(1).forEach(r => {
      const a = nrm(r[0]), b = String(r[1] || '');
      const di = DW.findIndex(x => nrm(x) === a); const bk = nrm(b); const p = PW.findIndex(x => bk.includes(nrm(x)));
      if (p < 0) return;
      if (di >= 0) d = di; else if (p === 0) d++;
      if (d < 0 || d > 4) return;
      out.push({ class: className, day: d, period: p, subject: r[2] || '', topic: r[3] || '', homework: r[4] || '', note: r[5] || '' });
    });
    return out;
  }
  async function pullFromSheet(w, onProgress) {
    const entries = w.id === S.weekId ? S.entries : await api.entries(w.id);
    const tabs = w.sheet_tabs || {}; let rows = [], miss = [];
    const classes = S.classes.filter(c => c.active);
    for (let i = 0; i < classes.length; i++) {
      const c = classes[i]; onProgress && onProgress(i + 1, classes.length);
      const tab = tabs[c.name] || c.name;
      const url = `https://docs.google.com/spreadsheets/d/${w.sheet_id}/gviz/tq?tqx=out:csv&headers=0&range=A1:F45&sheet=${encodeURIComponent(tab)}&t=${Date.now()}`;
      let txt; try { const r = await fetch(url); if (!r.ok) throw 0; txt = await r.text(); } catch (_) { throw new Error('تعذّر الاتصال بملف Google Sheet — تأكد من الاتصال بالإنترنت وأن الملف مشارك «لأي شخص لديه الرابط»'); }
      if (/<html/i.test(txt.slice(0, 200))) throw new Error('الملف غير مشارك بالرابط — افتح «مشاركة» واجعله متاحاً لأي شخص لديه الرابط');
      const R = rowsOfTab(txt, c.name);
      if (!tabs[c.name]) { // تحقق أن التبويب هو تبويب هذا الفصل (جوجل يعيد أول تبويب إن لم يجد الاسم)
        const mine = entries.filter(e => e.class_id === c.id && e.subject_id); let both = 0, same = 0;
        R.forEach(x => { const e = mine.find(y => y.day === x.day && y.period === x.period); if (e && x.subject.trim()) { both++; const a = nrm(A.subjName(e.subject_id)).replace(/^ال/, ''), b = nrm(x.subject).replace(/^ال/, ''); if (a === b || a.includes(b) || b.includes(a)) same++; } });
        if (!both || same / both < 0.5) { miss.push(c.name); continue; }
      }
      rows = rows.concat(R);
    }
    if (!rows.length) throw new Error('لم أجد تبويبات تطابق فصول القسم في الملف');
    const r = await api.sheetPushUser(w.id, rows);
    w.sheet_synced_at = new Date().toISOString();
    if (w.id === S.weekId) await A.loadWeek();
    return { updated: r.updated || 0, miss };
  }
  A.pullFromSheet = pullFromSheet;
  async function doPull(w, btn) {
    const bar = btn && btn.closest('.syncbar'); bar && bar.classList.add('busy');
    const lbl = btn ? btn.innerHTML : ''; const prog = (i, n) => { if (btn) btn.textContent = `جارٍ القراءة ${A.AR(i)}/${A.AR(n)}`; };
    try {
      const r = await pullFromSheet(w, prog);
      A.toast(`تمت المزامنة مع الشيت ✓ — ${r.updated ? A.cnt(r.updated, 'حصة حُدِّثت', 'حصص حُدِّثت') : 'لا تغييرات جديدة'}${r.miss.length ? ` · لم يُعثر على تبويب: ${r.miss.join('، ')}` : ''}`, r.miss.length ? '' : 'ok');
      A.route();
    } finally { if (btn && btn.isConnected) btn.innerHTML = lbl; bar && bar.classList.remove('busy'); }
  }

  function syncBar(w) {
    if (!w || w.archived || !canSync()) return '';
    if (!w.sheet_id) return canLink() ? `<div class="syncbar off" role="region" aria-label="مزامنة Google Sheets"><span class="ttl">${ICO} مزامنة Google Sheets</span><span class="grow small muted">هذا الأسبوع غير مربوط بملف Google Sheet.</span><button class="btn ghost sm" data-sync-link>ربط بملف</button></div>` : '';
    return `<div class="syncbar" role="region" aria-label="مزامنة Google Sheets"><span class="ttl">${ICO} مزامنة لحظية مع Google Sheets</span>
      <span class="grow small muted"><a href="${sheetUrl(w.sheet_id)}" target="_blank" rel="noopener">فتح الملف</a> · <span id="syncLast" aria-live="polite">${A.syncLabel(w)}</span></span>
      <button class="btn sky sm" data-sync="pull">${ICO} مزامنة الآن</button>
      <button class="btn ghost sm" data-sync="push" title="كتابة كل ما في المنصة لهذا الأسبوع داخل الشيت">إرسال المنصة إلى الشيت</button>
      ${canLink() ? '<button class="btn ghost sm" data-sync-link>تغيير الملف</button>' : ''}</div>`;
  }
  function bindBar(root, w) {
    $$('[data-sync]', root).forEach(b => b.onclick = () => A.run(b, async () => {
      if (b.dataset.sync === 'pull') return doPull(w, b);
      if (!(await A.confirmBox('كتابة كل خطط هذا الأسبوع من المنصة داخل ملف Google Sheet؟<br><span class="small muted">تُستبدل الخانات المختلفة في الشيت بما في المنصة.</span>', 'إرسال إلى الشيت'))) return;
      const r = await api.requestSheetSync(w.id, 'push');
      if (r.worker) A.toast('جارٍ كتابة بيانات المنصة في الشيت…', 'ok');
      else A.toast(S.me.is_owner ? 'الكتابة في الشيت تحتاج تفعيل سكربت المزامنة مرة واحدة (لوحة المطوّر ← مزامنة Google Sheets). سيُنفَّذ الطلب تلقائياً بعد التفعيل.' : 'الكتابة في الشيت تحتاج تفعيل سكربت المزامنة من حساب المالك. سيُنفَّذ الطلب تلقائياً بعد التفعيل.', 'err');
    }));
    $$('[data-sync-link]', root).forEach(b => b.onclick = () => linkDialog(w));
  }
  function linkDialog(w) {
    const m = A.modal(`<h3>ربط الأسبوع ${esc(w.word)} بملف Google Sheet</h3>
      <div class="field"><label for="shU">رابط الملف (انسخه من شريط العنوان)</label><input class="in" id="shU" dir="ltr" placeholder="https://docs.google.com/spreadsheets/d/…" value="${w.sheet_id ? sheetUrl(w.sheet_id) : ''}"></div>
      <p class="small muted">بعد الربط: كل تعديل في الشيت يظهر في المنصة فوراً، وكل تعديل في المنصة يُكتب في الشيت. تبويبات الفصول تُطابَق بأسمائها تلقائياً.</p>
      <div class="acts">${w.sheet_id ? '<button class="btn ghost" id="shX">فك الربط</button>' : ''}<button class="btn" id="shGo">حفظ الربط</button></div>`);
    const save = async (id) => { const r = await api.updateWeek(w.id, { sheet_id: id, sheet_tabs: null }); Object.assign(w, r || { sheet_id: id }); m.close(); A.route(); A.toast(id ? 'رُبط الأسبوع بالملف — اضغط «مزامنة الآن» لسحب بياناته (يجب أن يكون الملف مشاركاً بالرابط)' : 'فُكّ الربط', 'ok'); };
    m.el.querySelector('#shGo').onclick = e => A.run(e.currentTarget, async () => { const id = sheetIdOf(m.el.querySelector('#shU').value); if (!id) throw new Error('الرابط غير صحيح — انسخ رابط ملف Google Sheet كاملاً'); await save(id); });
    const x = m.el.querySelector('#shX'); if (x) x.onclick = e => A.run(e.currentTarget, () => save(null));
  }

  // ---- لوحة المتابعة: شريط المزامنة أعلى الصفحة
  const dash0 = V.dash;
  V.dash = function (root) {
    dash0(root); const w = A.week(); const h = $('.head', root); if (!h || !w) return;
    h.insertAdjacentHTML('afterend', syncBar(w) + '<div id="dReq"></div>'); bindBar(root, w);
    if (S.me.is_owner || A.perm('timetable_approve')) {
      A._dashReq = async () => { const el = $('#dReq', root); if (!el || !api.assignRequests) return; let n = 0; try { n = (await api.assignRequests(S.sectionId)).length; } catch (_) { }
        el.innerHTML = n ? `<div class="notice info" style="margin-bottom:16px"><b>${A.cnt(n, 'طلب', 'طلبات')} من المعلمين لاختيار موادهم بانتظار اعتمادك.</b> <a href="#/timetable" id="dReqGo">مراجعة الطلبات</a></div>` : '';
        const g = $('#dReqGo', el); if (g) g.onclick = () => A.LS.set('tttab', 'load'); };
      A._dashReq();
    }
  };
  // ---- الفصول: نفس الشريط للمراجعين
  if (V.classes) { const c0 = V.classes; V.classes = function (root) { c0(root); const w = A.week(); const h = $('.head', root) || root.firstElementChild; if (!h || !w || $('.syncbar', root)) return; h.insertAdjacentHTML('afterend', syncBar(w)); bindBar(root, w); }; }

  // ---- الأسابيع: عمود الربط
  const weeks0 = V.weeks;
  V.weeks = function (root) {
    weeks0(root); if (!canLink()) return;
    const card = $('.card', root); if (!card) return;
    const ws = S.weeks.filter(w => !w.archived);
    card.insertAdjacentHTML('afterend', `<div class="card" style="margin-top:16px"><div class="head"><div class="grow"><h3 style="margin:0">ملفات Google Sheets المرتبطة</h3><p class="sub" style="margin:2px 0 0">اربط كل أسبوع بملف الإدخال ليتزامن تلقائياً في الاتجاهين.</p></div></div>
      <div class="scroll"><table class="tbl"><thead><tr><th>الأسبوع</th><th>الملف</th><th>آخر مزامنة</th><th></th></tr></thead><tbody>
      ${ws.map(w => `<tr><td><b>الأسبوع ${esc(w.word)}</b></td><td class="small">${w.sheet_id ? `<a href="${sheetUrl(w.sheet_id)}" target="_blank" rel="noopener">فتح الملف</a>` : '<span class="faint">غير مربوط</span>'}</td><td class="small muted">${w.sheet_synced_at ? A.fmtDT(w.sheet_synced_at) : '—'}</td>
        <td class="row" style="flex-wrap:nowrap"><button class="btn ghost sm" data-lk="${w.id}">${w.sheet_id ? 'تغيير' : 'ربط'}</button>${w.sheet_id ? `<button class="btn sky sm" data-pl="${w.id}">مزامنة الآن</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="4">${A.emptyBox('لا توجد أسابيع')}</td></tr>`}
      </tbody></table></div></div>`);
    $$('[data-lk]', root).forEach(b => b.onclick = () => linkDialog(S.weeks.find(w => w.id === b.dataset.lk)));
    $$('[data-pl]', root).forEach(b => b.onclick = () => A.run(b, () => doPull(S.weeks.find(w => w.id === b.dataset.pl), b)));
  };

  // ---- لوحة المطوّر: إعداد سكربت المزامنة (المالك فقط)
  const dev0 = V.dev;
  V.dev = function (root) {
    dev0(root); if (!S.me.is_owner) return;
    const pbox = document.createElement('div'); pbox.className = 'card'; pbox.style.marginTop = '16px'; root.appendChild(pbox); drawParents(pbox);
    const box = document.createElement('div'); box.className = 'card'; box.style.marginTop = '16px'; root.appendChild(box);
    drawSetup(box);
  };
  // ---- بوابة أولياء الأمور (للمالك)
  async function drawParents(box) {
    box.innerHTML = '<div class="spinner"></div>';
    let L; try { L = (await api.parentLinks())[0]; } catch (e) { box.innerHTML = `<p class="small muted">${esc(e.message)}</p>`; return; }
    if (!L) { box.innerHTML = '<p class="small muted">لا يوجد رابط لأولياء الأمور.</p>'; return; }
    const url = location.origin + location.pathname.replace(/[^/]*$/, '') + 'parents.html?t=' + L.token;
    box.innerHTML = `<div class="head"><div class="grow"><h3 style="margin:0">بوابة أولياء الأمور</h3><p class="sub" style="margin:2px 0 0">رابط واحد ثابت لكل أولياء الأمور: يختارون صف كل ابن (أكثر من ابن)، ويرون خطة اليوم أو الأسبوع أو الواجبات. يظهر <b>المعتمد فقط</b>، ودون أسماء المعلمين.</p></div>
      <span class="pill ${L.active ? 'st-approved' : 'st-returned'}">${L.active ? 'الرابط مفعّل' : 'الرابط متوقف'}</span></div>
      <div class="row"><input class="in" dir="ltr" readonly value="${esc(url)}" style="flex:1;min-width:240px" aria-label="رابط أولياء الأمور"><button class="btn" id="plC">نسخ الرابط</button><a class="btn ghost" href="${esc(url)}" target="_blank" rel="noopener">فتح</a></div>
      <div class="row" style="margin-top:10px"><button class="btn ghost sm" id="plT">${L.active ? 'إيقاف الرابط مؤقتاً' : 'تفعيل الرابط'}</button><button class="btn bad sm" id="plR">تجديد الرابط (يُبطل القديم)</button>
        <a class="btn ghost sm" href="https://wa.me/?text=${encodeURIComponent('أولياء الأمور الكرام، يمكنكم متابعة الخطة الأسبوعية والواجبات اليومية لأبنائكم عبر الرابط:\n' + url + '\nاختر صف ابنك مرة واحدة، ويمكن إضافة أكثر من ابن.\nمدارس دينا العالمية')}" target="_blank" rel="noopener">رسالة واتساب جاهزة</a></div>`;
    $('#plC', box).onclick = async () => { try { await navigator.clipboard.writeText(url); A.toast('نُسخ رابط أولياء الأمور', 'ok'); } catch (_) { A.toast(url); } };
    $('#plT', box).onclick = e => A.run(e.currentTarget, async () => { await api.updateParentLink(L.id, { active: !L.active }); drawParents(box); A.toast(L.active ? 'أُوقف الرابط' : 'فُعّل الرابط', 'ok'); });
    $('#plR', box).onclick = e => A.run(e.currentTarget, async () => {
      if (!(await A.confirmBox('تجديد الرابط يُبطل الرابط القديم فوراً، وستحتاج لإرسال الرابط الجديد لأولياء الأمور. متابعة؟', 'تجديد', true))) return;
      const b = new Uint8Array(9); crypto.getRandomValues(b); await api.updateParentLink(L.id, { token: [...b].map(x => x.toString(16).padStart(2, '0')).join(''), active: true }); drawParents(box); A.toast('جُدّد الرابط', 'ok');
    });
  }
  async function drawSetup(box) {
    box.innerHTML = '<div class="spinner"></div>';
    let cfg = null; try { cfg = await api.syncCfg(); } catch (e) { box.innerHTML = `<p class="small muted">${esc(e.message)}</p>`; return; }
    const linked = S.weeks.filter(w => w.sheet_id && !w.archived).length;
    box.innerHTML = `<div class="head"><div class="grow"><h3 style="margin:0">${ICO} مزامنة Google Sheets — الإعداد</h3>
      <p class="sub" style="margin:2px 0 0">سكربت واحد في حسابك على Google يربط كل ملفات الخطة بالمنصة في الاتجاهين. يُعدّ مرة واحدة فقط.</p></div>
      <span class="pill ${cfg && cfg.script_url ? 'st-approved' : 'st-submitted'}">${cfg && cfg.script_url ? 'المزامنة الفورية مفعّلة' : 'بانتظار رابط السكربت'}</span></div>
      <ol class="steps small">
        <li>افتح <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">مشروع Apps Script جديد</a> بحساب المدرسة الذي يملك ملفات الخطة.</li>
        <li>احذف المحتوى الموجود والصق السكربت (زر «نسخ السكربت» بالأسفل) ثم احفظ.</li>
        <li>اختر الدالة <code>setup</code> من القائمة العلوية واضغط «تشغيل» ووافق على الأذونات.</li>
        <li>للمزامنة الفورية من المنصة إلى الشيت: «نشر ← نشر جديد ← تطبيق ويب»، التنفيذ «أنا»، الوصول «أي شخص»، ثم الصق رابط التطبيق هنا.</li>
      </ol>
      <div class="row" style="margin:10px 0"><button class="btn" id="cpS">نسخ السكربت</button><button class="btn ghost" id="dlS">تنزيل ملف السكربت</button><span class="small muted">الأسابيع المرتبطة حالياً: ${A.AR(linked)}</span></div>
      <div class="field"><label for="suU">رابط تطبيق الويب (ينتهي بـ ‎/exec)</label><div class="row"><input class="in" id="suU" dir="ltr" style="flex:1;min-width:220px" placeholder="https://script.google.com/macros/s/…/exec" value="${esc((cfg && cfg.script_url) || '')}"><button class="btn ghost" id="suG">حفظ</button></div></div>
      <details class="small"><summary>أمان</summary><p class="muted">السكربت يحمل رمزاً سرياً خاصاً بمدرستكم؛ لا تشاركه. إن تسرّب جدّده ثم انسخ السكربت مجدداً.</p><button class="btn bad sm" id="rgS">تجديد الرمز السري</button></details>`;
    const code = async () => {
      const t = await (await fetch('tools/sheet-sync.gs?v=' + Date.now())).text();
      return t.replace('__URL__', window.APP_CONFIG.supabaseUrl).replace('__KEY__', window.APP_CONFIG.supabaseKey).replace('__SECRET__', cfg.secret);
    };
    $('#cpS', box).onclick = e => A.run(e.currentTarget, async () => { await navigator.clipboard.writeText(await code()); A.toast('نُسخ السكربت — الصقه في مشروع Apps Script', 'ok'); });
    $('#dlS', box).onclick = e => A.run(e.currentTarget, async () => A.download(new Blob([await code()], { type: 'text/plain' }), 'dina-sheet-sync.gs'));
    $('#suG', box).onclick = e => A.run(e.currentTarget, async () => { const u = $('#suU', box).value.trim(); if (u && !/^https:\/\/script\.google\.com\/.+\/exec$/.test(u)) throw new Error('الرابط يجب أن يبدأ بـ https://script.google.com وينتهي بـ ‎/exec'); cfg = await api.updateSyncCfg({ script_url: u || null }); A.toast('حُفظ الرابط', 'ok'); drawSetup(box); });
    $('#rgS', box).onclick = e => A.run(e.currentTarget, async () => {
      if (!(await A.confirmBox('تجديد الرمز يوقف السكربت الحالي حتى تلصق النسخة الجديدة. متابعة؟', 'تجديد', true))) return;
      const b = new Uint8Array(24); crypto.getRandomValues(b); cfg = await api.updateSyncCfg({ secret: [...b].map(x => x.toString(16).padStart(2, '0')).join('') });
      A.toast('جُدّد الرمز — انسخ السكربت والصقه من جديد', 'ok'); drawSetup(box);
    });
  }
})();
