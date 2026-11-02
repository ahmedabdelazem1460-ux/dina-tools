/* منصة دينا — عرض «الجدول الاستثنائي» التفاعلي (مثل التعليم عن بعد) بزر دخول الحصة
   ملف مستقل يعمل في صفحة ولي الأمر وفي المنصة. يبرز الحصة الجارية «الآن» والتالية تلقائياً كل ٣٠ ثانية. */
(function () {
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const PER = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة', 'السابعة', 'الثامنة', 'التاسعة', 'العاشرة'];
  const AR = s => String(s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iso = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  const pd = s => new Date(s + 'T00:00:00');
  const dmy = s => { const x = pd(s); return AR(`${x.getDate()}/${x.getMonth() + 1}`); };
  const safe = u => /^https?:\/\//i.test(u || '') ? u : '';
  const t12 = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')}`; };
  const CAM = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="14" height="12" rx="3"/><path d="M16 10l6-3v10l-6-3z"/></svg>';
  const CSS = `.lv{border:2px solid #84B7E3;border-radius:18px;background:#fff;margin:0 0 14px;overflow:hidden;box-shadow:0 10px 28px -18px rgba(8,43,90,.45)}
    .lv-h{background:linear-gradient(135deg,#082B5A,#005499);color:#fff;padding:12px 16px;display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center}.lv-h h3{margin:0;font-size:18px;color:#fff}.lv-tag{background:#3AB1DB;color:#fff;border-radius:999px;padding:3px 12px;font-size:13px;font-weight:800}.lv-dt{font-size:13px;opacity:.85}.lv-h .lv-room{margin-inline-start:auto}
    .lv-room{display:inline-flex;align-items:center;gap:6px;background:#fff;color:#082B5A;border-radius:999px;padding:7px 14px;font-weight:800;text-decoration:none;font-size:14px;min-height:40px}.lv-room:focus-visible,.lv-join:focus-visible,.lv-days button:focus-visible,.lv-seg button:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}
    .lv-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:10px 12px 0}.lv-seg{display:inline-flex;background:#E4EBF5;border-radius:999px;padding:3px}.lv-seg button{border:0;background:none;border-radius:999px;padding:6px 14px;font:inherit;font-weight:700;color:#082B5A;cursor:pointer;min-height:36px}.lv-seg button.on{background:#082B5A;color:#fff}
    .lv-days{display:flex;gap:6px;overflow-x:auto;padding:10px 12px 4px;scrollbar-width:thin}.lv-days button{flex:0 0 auto;border:1px solid #D5E1F0;background:#fff;border-radius:12px;padding:6px 12px;font:inherit;color:#082B5A;cursor:pointer;text-align:center;min-height:44px}.lv-days button span{display:block;font-size:12px;opacity:.75}.lv-days button.on{background:#082B5A;color:#fff;border-color:#082B5A}.lv-days button.today:not(.on){border-color:#3AB1DB;box-shadow:inset 0 0 0 1px #3AB1DB}
    .lv-list{padding:6px 12px 12px;display:flex;flex-direction:column;gap:6px}.lv-r{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;border:1px solid #D5E1F0;border-radius:14px;padding:8px 10px;background:#fff;transition:background .2s}
    .lv-n{width:46px;text-align:center}.lv-n b{display:block;width:34px;height:34px;line-height:35px;margin:0 auto;border-radius:50%;background:#E4EBF5;color:#082B5A;font-weight:800}.lv-n i{display:block;font-style:normal;font-size:11px;color:#4D6A8F;direction:ltr;margin-top:2px;white-space:nowrap}
    .lv-s b{display:block;font-size:16px;color:#082B5A}.lv-s span{font-size:13px;color:#4D6A8F}.lv-s em{font-style:normal;font-size:12px;font-weight:800;border-radius:999px;padding:1px 8px;margin-inline-start:6px}
    .lv-join{display:inline-flex;align-items:center;gap:6px;background:#005499;color:#fff;border-radius:999px;padding:8px 14px;text-decoration:none;font-weight:800;font-size:14px;min-height:40px;white-space:nowrap}.lv-join:hover{background:#082B5A}.lv-nolink{font-size:12px;color:#5F7896}
    .lv-brk{display:flex;align-items:center;gap:8px;justify-content:center;font-size:13px;color:#8A5A12;background:#FFF4DC;border-radius:12px;padding:5px}
    .lv-r.now{background:#E5F4EA;border-color:#2E8B57;box-shadow:0 0 0 2px rgba(46,139,87,.25)}.lv-r.now .lv-n b{background:#2E8B57;color:#fff}.lv-r.now .lv-join{background:#2E8B57;animation:lvp 1.6s infinite}.lv-r.now .lv-s em.e-now{background:#2E8B57;color:#fff}.lv-r.next .lv-s em.e-next{background:#E1F3FA;color:#005499}.lv-r.done{opacity:.6}
    .lv-s em{display:none}.lv-r.now .lv-s em.e-now,.lv-r.next .lv-s em.e-next{display:inline-block}
    @keyframes lvp{0%{box-shadow:0 0 0 0 rgba(46,139,87,.55)}70%{box-shadow:0 0 0 10px rgba(46,139,87,0)}100%{box-shadow:0 0 0 0 rgba(46,139,87,0)}}
    .lv-wk{overflow-x:auto;padding:8px 12px 12px}.lv-wk table{border-collapse:separate;border-spacing:4px;min-width:640px;width:100%}.lv-wk th{background:#E4EBF5;color:#082B5A;border-radius:8px;padding:6px;font-size:13px}.lv-wk th i{display:block;font-style:normal;font-size:11px;direction:ltr;opacity:.8}.lv-wk td{border:1px solid #D5E1F0;border-radius:10px;padding:5px;text-align:center;vertical-align:middle;font-size:13px;height:56px}.lv-wk td b{display:block;color:#082B5A}.lv-wk td a{display:inline-flex;margin-top:3px;background:#005499;color:#fff;border-radius:999px;padding:3px 9px;text-decoration:none;font-size:12px;font-weight:700;gap:4px;align-items:center}.lv-wk td.now{background:#E5F4EA;border-color:#2E8B57}.lv-wk td.off{background:#f6f8fb}
    .lv [hidden]{display:none!important}.lv-n i,.lv-wk th i,.lv-brk span{direction:ltr;unicode-bidi:isolate}
    .lv-note{font-size:12px;color:#5F7896;padding:0 14px 12px}
    @media (prefers-reduced-motion:reduce){.lv-r.now .lv-join{animation:none}.lv-r{transition:none}}
    @media (max-width:520px){.lv-r{grid-template-columns:auto 1fr}.lv-r .lv-a{grid-column:1/-1}.lv-join{width:100%;justify-content:center}}
    @media print{.lv{display:none}}`;
  if (!document.getElementById('lvCss')) { const st = document.createElement('style'); st.id = 'lvCss'; st.textContent = CSS; document.head.appendChild(st); }

  function visibleDays(s) {
    const M = s.meta || {}, ws = pd(s.from); ws.setDate(ws.getDate() - ws.getDay());
    return (M.days || [0, 1, 2, 3, 4]).map(d => { const x = new Date(ws); x.setDate(ws.getDate() + d); return { d, date: iso(x) }; }).filter(x => x.date >= s.from && x.date <= s.to);
  }
  function html(s, o = {}) {
    const M = s.meta || {}, vd = visibleDays(s); if (!vd.length) return '';
    const td = o.today || iso(new Date()), sel = (vd.find(x => x.date === td) || vd.find(x => x.date > td) || vd[0]);
    const id = 'lv' + Math.random().toString(36).slice(2, 8);
    const room = safe(s.cls_link);
    const J = (y, d, p) => o.preview || !s.id ? '' : `data-j="${esc(s.id)}|${esc(y.c || o.cls || '')}|${d}|${p}"`;
    const rows = x => { const n = (M.perDay && M.perDay[x.d]) || M.periods || 7; let h = ''; for (let p = 0; p < n; p++) { const c = (s.cells || []).filter(y => y.d === x.d && y.p === p); const tm = (M.times || [])[p] || []; if (c.length) c.forEach(y => { const l = safe(y.link); h += `<div class="lv-r" data-date="${x.date}" data-f="${tm[0] || ''}" data-t="${tm[1] || ''}"><div class="lv-n"><b>${AR(p + 1)}</b>${tm[0] ? `<i>${t12(tm[0])} – ${t12(tm[1])}</i>` : ''}</div><div class="lv-s"><b>${esc(y.subject || '')}<em class="e-now">الآن</em><em class="e-next">التالية</em></b>${y.teacher ? `<span>${esc(y.teacher)}</span>` : `<span>الحصة ${PER[p] || AR(p + 1)}</span>`}</div><div class="lv-a">${l ? `<a class="lv-join" ${J(y, x.d, p)} href="${esc(l)}" target="_blank" rel="noopener" aria-label="دخول حصة ${esc(y.subject || '')}">${CAM} دخول الحصة</a>` : '<span class="lv-nolink">الرابط لم يُضف بعد</span>'}</div></div>`; }); else h += `<div class="lv-r done" data-date="${x.date}" data-f="${tm[0] || ''}" data-t="${tm[1] || ''}"><div class="lv-n"><b>${AR(p + 1)}</b>${tm[0] ? `<i>${t12(tm[0])} – ${t12(tm[1])}</i>` : ''}</div><div class="lv-s"><span>لا توجد حصة</span></div><div></div></div>`; (M.breaks || []).filter(b => b.after === p + 1 && p + 1 < n).forEach(b => { h += `<div class="lv-brk">☕ ${esc(b.label || 'استراحة')} ${b.from ? `<span dir="ltr">${t12(b.from)} – ${t12(b.to)}</span>` : ''}</div>`; }); } return h; };
    const P = M.periods || Math.max(1, ...(s.cells || []).map(c => c.p + 1));
    const week = `<div class="lv-wk"><table><thead><tr><th></th>${Array.from({ length: P }, (_, p) => { const tm = (M.times || [])[p] || []; return `<th>${AR(p + 1)}${tm[0] ? `<i>${t12(tm[0])}</i>` : ''}</th>`; }).join('')}</tr></thead><tbody>${vd.map(x => `<tr><th>${DAYS[x.d]}<i>${dmy(x.date)}</i></th>${Array.from({ length: P }, (_, p) => { const n = (M.perDay && M.perDay[x.d]) || P; if (p >= n) return '<td class="off"></td>'; const c = (s.cells || []).filter(y => y.d === x.d && y.p === p); const tm = (M.times || [])[p] || []; return `<td data-date="${x.date}" data-f="${tm[0] || ''}" data-t="${tm[1] || ''}">${c.map(y => `<b>${esc(y.subject || '')}</b>${safe(y.link) ? `<a ${J(y, x.d, p)} href="${esc(safe(y.link))}" target="_blank" rel="noopener" aria-label="دخول حصة ${esc(y.subject || '')}">${CAM.replace(/18/g, '13')} دخول</a>` : ''}`).join('')}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`;
    return `<section class="lv" id="${id}" aria-label="${esc(s.label || 'جدول استثنائي')}"><div class="lv-h">${s.tag ? `<span class="lv-tag">${esc(s.tag)}</span>` : ''}<h3>${esc(s.label || 'جدول استثنائي')}</h3><span class="lv-dt">${dmy(s.from)} — ${dmy(s.to)}</span>${room && !o.teacher ? `<a class="lv-room" ${o.preview || !s.id ? '' : `data-jr="${esc(s.id)}|${esc(o.cls || '')}"`} href="${esc(room)}" target="_blank" rel="noopener">${CAM} قاعة الفصل</a>` : ''}</div>
      <div class="lv-bar"><div class="lv-seg" role="tablist"><button role="tab" class="on" data-lvv="day" aria-selected="true">يوم</button><button role="tab" data-lvv="week" aria-selected="false">الأسبوع</button></div>${o.preview ? '<span class="small muted">معاينة — كما يراها ولي الأمر</span>' : ''}</div>
      <div data-lvp="day"><div class="lv-days" role="tablist">${vd.map(x => `<button role="tab" data-lvd="${x.date}" class="${x.date === sel.date ? 'on' : ''} ${x.date === td ? 'today' : ''}" aria-selected="${x.date === sel.date}">${DAYS[x.d]}<span>${dmy(x.date)}</span></button>`).join('')}</div>
        ${vd.map(x => `<div class="lv-list" data-lvl="${x.date}" ${x.date === sel.date ? '' : 'hidden'}>${rows(x)}</div>`).join('')}</div>
      <div data-lvp="week" hidden>${week}</div>
      <p class="lv-note">جدول استثنائي لهذه الفترة فقط${o.teacher ? ' — حصصك' : ''}. يبرز «الآن» تلقائياً وقت الحصة.</p></section>`;
  }
  function tick(root) {
    const now = new Date(), d = iso(now), hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    root.querySelectorAll('.lv-list').forEach(l => { let nextSet = false; l.querySelectorAll('.lv-r').forEach(r => { const on = r.dataset.date === d && r.dataset.f && r.dataset.f <= hm && hm < r.dataset.t; const past = r.dataset.date < d || (r.dataset.date === d && r.dataset.t && r.dataset.t <= hm); r.classList.toggle('now', on); const nx = !on && !nextSet && r.dataset.date === d && r.dataset.f > hm && !r.classList.contains('done'); if (nx) nextSet = true; r.classList.toggle('next', nx); if (!r.querySelector('.lv-nolink') && !r.classList.contains('done')) r.classList.toggle('past', past); }); });
    root.querySelectorAll('.lv-wk td[data-f]').forEach(c => c.classList.toggle('now', c.dataset.date === d && c.dataset.f && c.dataset.f <= hm && hm < c.dataset.t));
  }
  function bind(root) {
    if (!root) return;
    if (!root._lvJ) { root._lvJ = 1; root.addEventListener('click', e => { const a = e.target.closest('[data-j],[data-jr]'); if (!a || !window.DinaLive.onJoin) return; try { if (a.dataset.j) { const [ds, c, d, p] = a.dataset.j.split('|'); window.DinaLive.onJoin(ds, c, +d, +p); } else { const [ds, c] = a.dataset.jr.split('|'); const now = new Date(), hm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'); const r = a.closest('.lv').querySelector('.lv-r.now'); if (r) { const j = r.querySelector('[data-j]'); if (j) { const [, , d, p] = j.dataset.j.split('|'); window.DinaLive.onJoin(ds, c, +d, +p); } } } } catch (_) {} }); }
    root.querySelectorAll('.lv').forEach(sec => {
      sec.querySelectorAll('[data-lvd]').forEach(b => b.onclick = () => { sec.querySelectorAll('[data-lvd]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); sec.querySelectorAll('[data-lvl]').forEach(l => l.hidden = l.dataset.lvl !== b.dataset.lvd); });
      sec.querySelectorAll('[data-lvv]').forEach(b => b.onclick = () => { sec.querySelectorAll('[data-lvv]').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); sec.querySelectorAll('[data-lvp]').forEach(p => p.hidden = p.dataset.lvp !== b.dataset.lvv); });
    });
    tick(root); if (root._lvT) clearInterval(root._lvT); root._lvT = setInterval(() => { if (!document.body.contains(root)) return clearInterval(root._lvT); tick(root); }, 30000);
  }
  window.DinaLive = { html, bind };
})();
