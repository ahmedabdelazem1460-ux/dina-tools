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
      const dir = b.dataset.sync; const bar = b.closest('.syncbar');
      if (dir === 'push' && !(await A.confirmBox('كتابة كل خطط هذا الأسبوع من المنصة داخل ملف Google Sheet؟<br><span class="small muted">تُستبدل الخانات المختلفة في الشيت بما في المنصة.</span>', 'إرسال إلى الشيت'))) return;
      const r = await api.requestSheetSync(w.id, dir);
      bar && bar.classList.add('busy'); setTimeout(() => bar && bar.classList.remove('busy'), r.instant ? 8000 : 60000);
      A.toast(dir === 'push' ? 'جارٍ كتابة بيانات المنصة في الشيت…' : r.instant ? 'جارٍ سحب الشيت — تظهر التحديثات هنا تلقائياً خلال ثوانٍ' : 'طُلبت المزامنة — تكتمل خلال دقيقة وتظهر تلقائياً', 'ok');
    }));
    $$('[data-sync-link]', root).forEach(b => b.onclick = () => linkDialog(w));
  }
  function linkDialog(w) {
    const m = A.modal(`<h3>ربط الأسبوع ${esc(w.word)} بملف Google Sheet</h3>
      <div class="field"><label for="shU">رابط الملف (انسخه من شريط العنوان)</label><input class="in" id="shU" dir="ltr" placeholder="https://docs.google.com/spreadsheets/d/…" value="${w.sheet_id ? sheetUrl(w.sheet_id) : ''}"></div>
      <p class="small muted">بعد الربط: كل تعديل في الشيت يظهر في المنصة فوراً، وكل تعديل في المنصة يُكتب في الشيت. تبويبات الفصول تُطابَق بأسمائها تلقائياً.</p>
      <div class="acts">${w.sheet_id ? '<button class="btn ghost" id="shX">فك الربط</button>' : ''}<button class="btn" id="shGo">حفظ الربط</button></div>`);
    const save = async (id) => { const r = await api.updateWeek(w.id, { sheet_id: id }); Object.assign(w, r || { sheet_id: id }); m.close(); A.route(); A.toast(id ? 'رُبط الأسبوع بالملف — اضغط «مزامنة الآن» لسحب بياناته' : 'فُكّ الربط', 'ok'); };
    m.el.querySelector('#shGo').onclick = e => A.run(e.currentTarget, async () => { const id = sheetIdOf(m.el.querySelector('#shU').value); if (!id) throw new Error('الرابط غير صحيح — انسخ رابط ملف Google Sheet كاملاً'); await save(id); });
    const x = m.el.querySelector('#shX'); if (x) x.onclick = e => A.run(e.currentTarget, () => save(null));
  }

  // ---- لوحة المتابعة: شريط المزامنة أعلى الصفحة
  const dash0 = V.dash;
  V.dash = function (root) {
    dash0(root); const w = A.week(); const h = $('.head', root); if (!h || !w) return;
    h.insertAdjacentHTML('afterend', syncBar(w)); bindBar(root, w);
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
    $$('[data-pl]', root).forEach(b => b.onclick = () => A.run(b, async () => { const r = await api.requestSheetSync(b.dataset.pl, 'pull'); A.toast(r.instant ? 'جارٍ السحب — يكتمل خلال ثوانٍ' : 'طُلبت المزامنة — تكتمل خلال دقيقة', 'ok'); }));
  };

  // ---- لوحة المطوّر: إعداد سكربت المزامنة (المالك فقط)
  const dev0 = V.dev;
  V.dev = function (root) {
    dev0(root); if (!S.me.is_owner) return;
    const box = document.createElement('div'); box.className = 'card'; box.style.marginTop = '16px'; root.appendChild(box);
    drawSetup(box);
  };
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
