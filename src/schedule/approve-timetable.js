/* منصة دينا — اعتماد الجدول مع «معاينة الأثر» واختيار الأسابيع التي يُطبَّق عليها
   قبل التأكيد: لكل أسبوع كم حصة مكتوبة ستنتقل مع الجدول الجديد، وكم ستبقى في مكانها بانتظار قرارك ولأي معلمين.
   التطبيق: على كل الأسابيع المفتوحة في الفترة، أو الخالية فقط، أو أسابيع تختارها، أو على الأسابيع الجديدة فقط. لا يُحذف أي محتوى. */
(function () {
  const A = window.APP, { S, api, $, $$, esc, AR, DAYS, PER, I } = A;
  const iso = d => A.isoDate(d), addD = (s, n) => { const d = A.parseDate(s); d.setDate(d.getDate() + n); return iso(d); };
  const todayIso = () => iso(new Date());
  const curWeekStart = () => { const t = todayIso(); const w = (S.weeks || []).filter(x => !x.archived && x.start_date <= t && addD(x.start_date, 6) >= t)[0]; return w ? w.start_date : t; };
  const dAR = s => AR(A.dmy(A.parseDate(s)));

  A.ttApprove = function (d, changes, onScheduled, onApproved) {
    const ws = (S.weeks || []).filter(w => !w.archived).slice().sort((x, y) => x.start_date.localeCompare(y.start_date));
    const cur = S.weekId, nxt = (ws.find(w => w.start_date > ((ws.find(x => x.id === cur) || {}).start_date || '')) || {}).id || cur;
    const wOpt = (sel, end) => ws.map(w => { const v = end ? addD(w.start_date, 4) : w.start_date; return `<option value="${v}" ${w.id === sel ? 'selected' : ''}>الأسبوع ${esc(w.word)} — ${AR(A.weekDates(w)[end ? 4 : 0])}</option>`; }).join('') + '<option value="custom">تاريخ آخر…</option>';
    const m = A.modal(`<h3>اعتماد «${esc(d.label)}»</h3><p class="sub">عدد التغييرات عن الجدول الحالي: <b>${AR(changes)}</b>. اختر متى يسري، ثم راجع أثره على خطط المعلمين قبل التأكيد.</p>
      <div class="kpick" id="apm" style="margin-bottom:12px"><button type="button" data-m="now" class="on">الآن</button><button type="button" data-m="from">من أسبوع / تاريخ</button><button type="button" data-m="temp">مؤقت لفترة ثم يعود الحالي</button></div>
      <div id="apFrom" class="hidden"><div class="grid g2"><div class="field"><label for="apF">يسري ابتداءً من</label><select class="in" id="apF">${wOpt(nxt)}</select><input class="in hidden" type="date" id="apFd" style="margin-top:6px"></div>
        <div class="field" id="apToBox"><label for="apT">وينتهي في (للمؤقت)</label><select class="in" id="apT">${wOpt(nxt, true)}</select><input class="in hidden" type="date" id="apTd" style="margin-top:6px"></div></div>
        <p class="small muted" id="apHint" style="margin:0 0 8px"></p></div>
      <div class="field"><label>تطبيق على الأسابيع الموجودة</label><div class="kpick" id="apw"><button type="button" data-w="all" class="on">كل الأسابيع المفتوحة</button><button type="button" data-w="empty">الخالية فقط (لم يكتب فيها أحد)</button><button type="button" data-w="pick">أختارها بنفسي</button><button type="button" data-w="none">لا شيء — الأسابيع الجديدة فقط</button></div></div>
      <div id="apPv" class="ap-pv"><div class="spinner"></div></div>
      <div class="acts"><button class="btn ok" id="apgo">${I.check} تأكيد</button></div>`, { cls: 'wide' });
    const el = m.el; let mode = 'now', wmode = 'all', pv = [], pick = new Set(), tok = 0;
    const val = (a, b) => { const v = el.querySelector(a).value; return v === 'custom' ? el.querySelector(b).value : v; };
    const range = () => mode === 'now' ? [curWeekStart(), null] : [val('#apF', '#apFd'), mode === 'temp' ? val('#apT', '#apTd') : null];
    const chosen = () => pv.filter(w => w.status === 'open' && (wmode === 'all' || (wmode === 'empty' && !w.filled) || (wmode === 'pick' && pick.has(w.id))));
    const tName = id => (A.person(id) || {}).full_name || 'بدون معلم', cName = id => (A.cls(id) || {}).name || '', sName = id => A.subjName(id) || '—';
    const draw = () => {
      const box = $('#apPv', el); if (!pv.length) { box.innerHTML = `<div class="notice info">لا توجد أسابيع منشأة في هذه الفترة — سيُستخدم الجدول تلقائياً عند إنشاء أسابيعها.</div>`; return; }
      const ch = new Set(chosen().map(w => w.id));
      const tot = chosen().reduce((a, w) => ({ mv: a.mv + w.move, st: a.st + w.stuck.length, f: a.f + w.filled }), { mv: 0, st: 0, f: 0 });
      box.innerHTML = `<div class="tt-kpis"><div><b>${AR(ch.size)}</b><span>أسبوع سيُطبَّق عليه</span></div><div><b>${AR(tot.f)}</b><span>حصة مكتوبة فيها</span></div><div><b>${AR(tot.mv)}</b><span>ستنتقل مع مادتها</span></div><div class="${tot.st ? 'w' : ''}"><b>${AR(tot.st)}</b><span>تبقى بانتظار قرارك</span></div><div><b>${AR(pv.length - ch.size)}</b><span>أسبوع لن يتغير</span></div></div>
        <div class="scroll" style="max-height:44vh"><table class="tbl ap-t"><thead><tr><th style="width:36px"></th><th>الأسبوع</th><th>الحالة</th><th>مكتوب</th><th>ستنتقل</th><th>تبقى في مكانها</th></tr></thead><tbody>${pv.map(w => {
          const open = w.status === 'open', on = ch.has(w.id), byT = {}; w.stuck.forEach(x => { (byT[x.t] = byT[x.t] || []).push(x); });
          return `<tr class="${on ? '' : 'off'}"><td><input type="checkbox" data-pw="${w.id}" ${on ? 'checked' : ''} ${open ? '' : 'disabled'} aria-label="تطبيق على الأسبوع ${esc(w.word)}"></td><td><b>${esc(w.word)}</b><div class="small muted">${dAR(w.start)}</div></td>
            <td>${open ? (w.filled ? '<span class="pill st-sub">مفتوح</span>' : '<span class="pill st-ok">مفتوح · خالٍ</span>') : '<span class="pill st-empty">مقفل — لا يتغير</span>'}</td><td>${AR(w.filled)}</td><td>${on ? AR(w.move) : '—'}</td>
            <td>${on && w.stuck.length ? `<details><summary class="tx-warn">${AR(w.stuck.length)} حصة</summary><ul class="ap-st">${Object.entries(byT).map(([t, l]) => `<li><b>${esc(tName(t))}</b>: ${l.map(x => `${esc(sName(x.s))} — ${esc(cName(x.c))} (${DAYS[x.d]}، ${PER[x.p] || AR(x.p + 1)})`).join('، ')}</li>`).join('')}</ul></details>` : on ? '٠' : '—'}</td></tr>`; }).join('')}</tbody></table></div>
        <p class="small muted" style="margin:6px 0 0">«تبقى في مكانها»: حصص مكتوبة لمادة لا مكان لها في الجدول الجديد (مثل مادة غير موجودة فيه). لا تُحذف — تبقى بمحتواها وتظهر في «خلايا فيها محتوى تنتظر قرارك». الأسابيع غير المحددة تبقى على جدولها الحالي.</p>`;
      $$('[data-pw]', box).forEach(c => c.onchange = () => { if (wmode !== 'pick') { pick = new Set(chosen().map(w => w.id)); wmode = 'pick'; $$('#apw button', el).forEach(x => x.classList.toggle('on', x.dataset.w === 'pick')); } c.checked ? pick.add(c.dataset.pw) : pick.delete(c.dataset.pw); draw(); });
    };
    const load = async () => {
      const [from, to] = range(), t = ++tok, box = $('#apPv', el); if (!from) { box.innerHTML = '<p class="small muted">حدد تاريخ البداية</p>'; return; }
      box.innerHTML = '<div class="spinner"></div><p class="small muted" style="text-align:center">يحسب أثر الجدول على الخطط…</p>';
      try { const r = await api.previewSchedule(d.id, from, to); if (t !== tok) return; pv = (r || []).map(w => ({ ...w, stuck: w.stuck || [] })); pick = new Set(pv.filter(w => w.status === 'open').map(w => w.id)); draw(); }
      catch (e) { if (t === tok) box.innerHTML = `<div class="notice warn">تعذّرت المعاينة: ${esc(e.message)}</div>`; }
    };
    const sync = () => { el.querySelector('#apFrom').classList.toggle('hidden', mode === 'now'); el.querySelector('#apToBox').classList.toggle('hidden', mode !== 'temp');
      el.querySelector('#apHint').textContent = mode === 'from' ? 'يصبح الجدول المعتمد تلقائياً عند حلول التاريخ، ويُستخدم لكل أسبوع جديد بعده.' : mode === 'temp' ? 'يُستخدم فقط لأسابيع هذه الفترة (مثل التعليم عن بعد أو رمضان)، ثم تعود الأسابيع بعدها للجدول المعتمد الحالي تلقائياً.' : ''; };
    $$('#apm button', el).forEach(b => b.onclick = () => { mode = b.dataset.m; $$('#apm button', el).forEach(x => x.classList.toggle('on', x === b)); sync(); load(); });
    $$('#apw button', el).forEach(b => b.onclick = () => { wmode = b.dataset.w; if (wmode === 'pick' && !pick.size) pick = new Set(pv.filter(w => w.status === 'open').map(w => w.id)); $$('#apw button', el).forEach(x => x.classList.toggle('on', x === b)); draw(); });
    [['#apF', '#apFd'], ['#apT', '#apTd']].forEach(([a, b]) => { el.querySelector(a).onchange = e => { el.querySelector(b).classList.toggle('hidden', e.target.value !== 'custom'); load(); }; el.querySelector(b).onchange = load; });
    sync(); load();
    el.querySelector('#apgo').onclick = e => A.run(e.currentTarget, async () => {
      const [from, to] = range(); if (!from) throw new Error('حدد تاريخ البداية'); if (to && to < from) throw new Error('تاريخ النهاية قبل البداية');
      const ids = chosen().map(w => w.id), all = wmode === 'all';
      if (mode === 'now' && all) { const r = await api.approveTT(d.id, true); m.close(); await A.loadWeek(); A.toast(`اعتُمد الجدول${r && r.updated_entries ? ` وحُدِّثت ${A.cnt(r.updated_entries, 'حصة', 'حصص')}` : ''}${r && r.conflicts ? ` · ${A.cnt(r.conflicts, 'خلية تنتظر قرارك', 'خلايا تنتظر قرارك')}` : ''}`, 'ok'); onApproved(); return; }
      const r = await api.scheduleTT2(d.id, from, to, all ? null : ids);
      m.close(); await A.loadWeek();
      A.toast(`${mode === 'now' ? 'اعتُمد الجدول' : to ? 'جُدول الجدول مؤقتاً' : 'جُدول الجدول'} — طُبّق على ${A.cnt((r && r.weeks) || 0, 'أسبوع', 'أسابيع')}${all ? '' : '، وبقيت الأسابيع الأخرى على جدولها'}`, 'ok');
      (mode === 'now' ? onApproved : onScheduled)();
    });
  };
})();
