/* منصة دينا — اللوحة اليومية للمدرسة + المتابعة اللحظية
   تُدخل الإدارة بيانات اليوم مرة واحدة (المناوبة، غياب المنسوبين، القيمة، الكلمة، الأخبار، الفعاليات، إعلان)،
   وتُسحب تلقائياً: حصص الانتظار، تأمين الحصص، الحضور. تُعرض على شاشة المدرسة (board.html برابط خاص) بشرائح متنقلة وساعة حية وشريط أخبار،
   وتُطبع تقريراً يومياً في صفحة A4. وتبويب «المتابعة اللحظية» يجمع ما يجري الآن. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, DAYS, PER, I } = A;
  A.I.board = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M6 9h6M6 12h9"/></svg>';
  const today = () => new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
  const can = () => S.me && (S.me.is_owner || A.perm('structure') || (A.hasModule && A.hasModule('attendance')));
  if (A.NAV && !A.NAV.some(n => n[0] === 'board')) { const i = A.NAV.findIndex(n => n[0] === 'attendance'); A.NAV.splice(i < 0 ? A.NAV.length : i, 0, ['board', 'اللوحة اليومية', () => can()]); }
  const SL = [['word', 'كلمة اليوم'], ['value', 'قيمة الأسبوع'], ['att', 'الحضور'], ['duty', 'المناوبة'], ['standby', 'حصص الانتظار'], ['cover', 'تأمين الحصص'], ['off', 'غياب المنسوبين'], ['events', 'الفعاليات'], ['ann', 'الإعلان'], ['times', 'مواعيد الحصص']];
  const base = () => location.href.split('#')[0].replace(/[^/]*$/, '');
  const staffOpts = sel => `<option value="">— اختر —</option>` + (S.staff || []).filter(x => x.active !== false).slice().sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar')).map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.full_name)}</option>`).join('');

  V.board = async function (root) {
    if (!can()) { root.innerHTML = `<div class="card">${A.emptyBox('غير متاح لحسابك')}</div>`; return; }
    let tab = A.LS.get('bd_t') || 'today';
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">اللوحة اليومية — ${esc((A.section() || {}).name || '')}</h2><p class="sub" style="margin:2px 0 0">أدخل بيانات اليوم مرة واحدة فتظهر على شاشة المدرسة تلقائياً، ويُطبع منها تقرير اليوم.</p></div></div>
      <div class="kpick" id="bdT"><button data-t="today">بيانات اليوم</button><button data-t="screen">شاشة العرض</button><button data-t="live">المتابعة اللحظية</button></div><div id="bdB" style="margin-top:10px"></div></div>`;
    $$('#bdT button', root).forEach(b => { b.classList.toggle('on', b.dataset.t === tab); b.onclick = () => { A.LS.set('bd_t', b.dataset.t); V.board(root); }; });
    const B = $('#bdB', root);
    ({ today: tToday, screen: tScreen, live: tLive })[tab](B);
  };

  // ---------- بيانات اليوم ----------
  async function tToday(B) {
    let day = A.LS.get('bd_day') || today(); const sec = A.section();
    const get = async dd => (await api.list('daily_boards', { section_id: sec.id, day: dd }))[0];
    let row = await get(day).catch(() => null); let D = JSON.parse(JSON.stringify((row && row.data) || {}));
    const norm = () => { D.word = D.word || {}; D.value = D.value || {}; D.duty = D.duty || []; D.staffOff = D.staffOff || []; D.news = D.news || []; D.events = D.events || []; D.hide = D.hide || []; D.secs = D.secs || 12; };
    norm();
    let tm; const st = t => { const e = $('#bdSt', B); if (e) { e.textContent = t; } };
    const save = () => { clearTimeout(tm); st('يحفظ…'); tm = setTimeout(async () => { try { const r = await api.ups('daily_boards', [{ school_id: S.school.id, section_id: sec.id, day, data: D, updated_at: new Date().toISOString() }], 'section_id,day'); row = (r || [])[0] || row; st('محفوظ · يظهر على الشاشة خلال دقيقة'); } catch (e) { st('لم يُحفظ: ' + e.message); } }, 600); };
    const draw = () => {
      B.innerHTML = `<div class="row" style="gap:8px;flex-wrap:wrap;align-items:end"><div class="field" style="margin:0"><label for="bdD">اليوم</label><input class="in" type="date" id="bdD" value="${day}"></div><button class="btn ghost sm" id="bdCp" type="button">نسخ من آخر يوم</button><button class="btn ghost sm" id="bdPr" type="button">${I.print || ''} التقرير اليومي (A4)</button><span class="rec-st ok" id="bdSt" role="status" aria-live="polite">${row ? 'محفوظ' : 'جديد'}</span></div>
        <div class="grid g2" style="margin-top:10px;align-items:start">
          <div class="sec-box"><b>كلمة اليوم</b><input class="in" data-f="word.title" value="${esc(D.word.title || '')}" placeholder="العنوان (افتراضياً: كلمة اليوم)" style="margin-top:6px"><textarea class="in" rows="3" data-f="word.text" placeholder="نص الكلمة">${esc(D.word.text || '')}</textarea><input class="in" data-f="word.by" value="${esc(D.word.by || '')}" placeholder="القائل / المعد (اختياري)"></div>
          <div class="sec-box"><b>قيمة الأسبوع</b><input class="in" data-f="value.title" value="${esc(D.value.title || '')}" placeholder="مثال: الأمانة" style="margin-top:6px"><textarea class="in" rows="3" data-f="value.text" placeholder="وصف أو آية أو حديث">${esc(D.value.text || '')}</textarea></div>
          <div class="sec-box"><b>المناوبة</b>${D.duty.map((x, i) => `<div class="row" style="gap:6px;margin-top:6px;flex-wrap:nowrap"><input class="in" data-l="duty|${i}|place" value="${esc(x.place || '')}" placeholder="المكان: الساحة، البوابة…"><select class="in" data-l="duty|${i}|staff">${staffOpts(x.staff)}</select><button class="btn bad sm" data-x="duty|${i}" aria-label="حذف">×</button></div>`).join('')}<button class="btn ghost sm" data-add="duty" style="margin-top:6px">+ مناوب</button>${A.dutyDay && ((sec.duty || {}).slots || []).length ? ` <button class="btn ghost sm" id="bdDuty" style="margin-top:6px">من جدول الإشراف والمناوبة</button>` : ''}</div>
          <div class="sec-box"><b>غياب المنسوبين</b> <span class="small muted">(يُضاف تلقائياً من «تأمين الحصص»)</span>${D.staffOff.map((x, i) => `<div class="row" style="gap:6px;margin-top:6px;flex-wrap:nowrap"><select class="in" data-l="staffOff|${i}|staff">${staffOpts(x.staff)}</select><input class="in" data-l="staffOff|${i}|reason" value="${esc(x.reason || '')}" placeholder="السبب (اختياري)"><button class="btn bad sm" data-x="staffOff|${i}" aria-label="حذف">×</button></div>`).join('')}<button class="btn ghost sm" data-add="staffOff" style="margin-top:6px">+ غائب</button></div>
          <div class="sec-box"><b>فعاليات اليوم</b>${D.events.map((x, i) => `<div class="row" style="gap:6px;margin-top:6px;flex-wrap:nowrap"><input class="in" type="time" data-l="events|${i}|time" value="${esc(x.time || '')}" style="width:120px"><input class="in" data-l="events|${i}|title" value="${esc(x.title || '')}" placeholder="الفعالية"><input class="in" data-l="events|${i}|place" value="${esc(x.place || '')}" placeholder="المكان" style="width:120px"><button class="btn bad sm" data-x="events|${i}" aria-label="حذف">×</button></div>`).join('')}<button class="btn ghost sm" data-add="events" style="margin-top:6px">+ فعالية</button></div>
          <div class="sec-box"><b>شريط الأخبار</b> <span class="small muted">(سطر لكل خبر)</span><textarea class="in" rows="4" id="bdN" style="margin-top:6px">${esc(D.news.join('\n'))}</textarea><b style="display:block;margin-top:8px">إعلان (شريحة كاملة)</b><textarea class="in" rows="2" data-f="ann">${esc(D.ann || '')}</textarea></div>
          <div class="sec-box"><b>الشرائح الظاهرة على الشاشة</b><div class="perm-grid" style="margin-top:6px">${SL.map(([k, l]) => `<label class="chk"><input type="checkbox" data-sl="${k}" ${D.hide.includes(k) ? '' : 'checked'}> ${l}</label>`).join('')}</div><label class="small" style="display:block;margin-top:6px">مدة كل شريحة <input class="in" type="number" min="6" max="60" data-f="secs" value="${D.secs}" style="width:80px"> ثانية</label><input class="in" data-f="title" value="${esc(D.title || '')}" placeholder="عنوان اللوحة (افتراضياً: اللوحة اليومية)" style="margin-top:6px"></div>
        </div>`;
      $('#bdD', B).onchange = async e => { day = e.target.value; A.LS.set('bd_day', day); row = await get(day).catch(() => null); D = JSON.parse(JSON.stringify((row && row.data) || {})); norm(); draw(); };
      $$('[data-f]', B).forEach(i => i.oninput = () => { const [a, b] = i.dataset.f.split('.'); if (b) D[a][b] = i.value; else D[a] = a === 'secs' ? Math.max(6, +i.value || 12) : i.value; save(); });
      $('#bdN', B).oninput = e => { D.news = e.target.value.split('\n').map(x => x.trim()).filter(Boolean); save(); };
      $$('[data-l]', B).forEach(i => i.oninput = i.onchange = () => { const [l, n, k] = i.dataset.l.split('|'); D[l][+n][k] = i.value; save(); });
      $$('[data-x]', B).forEach(b => b.onclick = () => { const [l, n] = b.dataset.x.split('|'); D[l].splice(+n, 1); save(); draw(); });
      $$('[data-add]', B).forEach(b => b.onclick = () => { D[b.dataset.add].push({}); draw(); });
      const bdu = $('#bdDuty', B); if (bdu) bdu.onclick = async () => { const L = A.dutyDay(sec, day); if (!L.length) return A.toast('لا تكليفات في هذا اليوم', 'err'); if (D.duty.length && !(await A.confirmBox('استبدال قائمة المناوبة الحالية لهذا اليوم بما في جدول الإشراف والمناوبة؟', 'استبدال'))) return; const f = m => A.bell.fmt(m, A.bell.activeSched(A.bell.bellOf(sec), day)); D.duty = L.map(x => ({ place: `${x.sl.name}${x.pl.n ? ' — ' + x.pl.n : ''}${x.tm ? ` (${f(x.tm.from)} – ${f(x.tm.to)})` : ''}`, staff: x.t })); save(); draw(); };
      $$('[data-sl]', B).forEach(c => c.onchange = () => { D.hide = SL.map(x => x[0]).filter(k => !($(`[data-sl="${k}"]`, B) || {}).checked); save(); });
      $('#bdCp', B).onclick = e => A.run(e.currentTarget, async () => { const l = (await api.list('daily_boards', { section_id: sec.id }, { order: 'day', desc: true })).filter(r => r.day < day)[0]; if (!l) throw new Error('لا يوجد يوم سابق محفوظ'); const keep = { duty: l.data.duty || [], value: l.data.value || {}, news: l.data.news || [], hide: l.data.hide || [], secs: l.data.secs || 12, title: l.data.title || '' }; Object.assign(D, keep); norm(); save(); draw(); A.toast('نُسخت المناوبة والقيمة والأخبار والإعدادات من ' + AR(A.dmy(A.parseDate(l.day))), 'ok'); });
      $('#bdPr', B).onclick = () => report(day, D);
    };
    draw();
  }

  // ---------- التقرير اليومي A4 ----------
  async function report(day, D) {
    const sec = A.section(), d = A.parseDate(day).getDay();
    const [subs, pa0, dl] = await Promise.all([api.list('substitutions', { section_id: sec.id, day }).catch(() => []), api.list('period_attendance', { section_id: sec.id, day }).catch(() => []), api.list('attendance', { school_id: S.school.id, day }).catch(() => [])]);
    const secIds = new Set((S.classes || []).filter(c => c.section_id === sec.id).map(c => c.id)); const pa = pa0.concat(dl.filter(x => secIds.has(x.class_id)));
    const roster = ((sec.standby || {}).roster) || {}, P = sec.periods || 7, per = ((sec.standby || {}).per) || 2;
    const uniq = k => new Set(pa.filter(x => x.status === k).map(x => x.student_id)).size;
    const pn = id => A.personName(id) || '—';
    A.printDoc(`التقرير اليومي — ${DAYS[d]} ${AR(A.dmy(A.parseDate(day)))}`, sec.name, `
      <div><span class="k"><b>${AR(uniq('absent'))}</b>غائب</span><span class="k"><b>${AR(uniq('late'))}</b>متأخر</span><span class="k"><b>${AR(uniq('excused') + uniq('early'))}</b>مستأذن/خروج</span><span class="k"><b>${AR(subs.length)}</b>حصة مؤمَّنة</span><span class="k"><b>${AR((D.staffOff || []).length + new Set(subs.map(x => x.absent_teacher)).size)}</b>غياب منسوبين</span></div>
      ${(D.word || {}).text ? `<p><b>${esc(D.word.title || 'كلمة اليوم')}:</b> ${esc(D.word.text)}${D.word.by ? ' — ' + esc(D.word.by) : ''}</p>` : ''}${(D.value || {}).title ? `<p><b>قيمة الأسبوع:</b> ${esc(D.value.title)}${D.value.text ? ' — ' + esc(D.value.text) : ''}</p>` : ''}
      <table style="margin-bottom:8px"><tr><th>المناوبة</th><th>المناوب</th></tr>${(D.duty || []).map(x => `<tr><td>${esc(x.place || '')}</td><td>${esc(pn(x.staff))}</td></tr>`).join('') || '<tr><td colspan="2">—</td></tr>'}</table>
      <table style="margin-bottom:8px"><tr><th>الحصة</th>${Array.from({ length: per }, (_, k) => `<th>منتظر ${AR(k + 1)}</th>`).join('')}</tr>${Array.from({ length: P }, (_, p) => `<tr><td>${AR(p + 1)}</td>${Array.from({ length: per }, (_, k) => `<td>${esc(pn((roster[d + '|' + p] || [])[k]))}</td>`).join('')}</tr>`).join('')}</table>
      <table style="margin-bottom:8px"><tr><th>الحصة</th><th>الفصل</th><th>الغائب</th><th>البديل</th></tr>${subs.sort((a, b) => a.period - b.period).map(x => `<tr><td>${AR(x.period + 1)}</td><td>${esc((A.cls(x.class_id) || {}).name || '')}</td><td>${esc(pn(x.absent_teacher))}</td><td>${esc(pn(x.sub_teacher))}</td></tr>`).join('') || '<tr><td colspan="4">لا يوجد تأمين</td></tr>'}</table>
      ${(D.events || []).length ? `<table><tr><th>الوقت</th><th>الفعالية</th><th>المكان</th></tr>${D.events.map(e => `<tr><td>${esc(e.time || '')}</td><td>${esc(e.title || '')}</td><td>${esc(e.place || '')}</td></tr>`).join('')}</table>` : ''}
      <p style="margin-top:14px">توقيع المدير: .................................... &nbsp;&nbsp;&nbsp; التاريخ: ${AR(A.dmy(A.parseDate(day)))}</p>`, false);
  }

  // ---------- شاشة العرض ----------
  async function tScreen(B) {
    const sec = A.section(); let L = [];
    try { L = await api.list('board_tokens', { section_id: sec.id }); } catch (_) { }
    const link = t => base() + 'board.html?t=' + t.token;
    B.innerHTML = `<p class="sub" style="margin:0 0 8px">افتح الرابط على شاشة المدرسة (تلفاز أو جهاز عرض) بملء الشاشة. يتحدّث تلقائياً كل دقيقة ولا يحتاج تسجيل دخول. أوقف الرابط متى شئت.</p>
      ${S.me.is_owner ? `<div class="row" style="gap:6px;margin-bottom:10px"><input class="in" id="btL" placeholder="اسم الشاشة (مثال: شاشة المدخل)" style="max-width:260px"><button class="btn" id="btNew">${I.plus || '+'} إنشاء رابط شاشة</button></div>` : ''}
      ${L.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>الشاشة</th><th>الرابط</th><th>الحالة</th><th></th></tr></thead><tbody>${L.map(t => `<tr><td><b>${esc(t.label)}</b></td><td><input class="in" dir="ltr" readonly value="${esc(link(t))}" style="min-width:260px"></td><td>${t.active ? '<span class="pill st-approved">فعّال</span>' : '<span class="pill st-empty">موقوف</span>'}</td><td class="row" style="gap:4px;flex-wrap:nowrap"><a class="btn sm" href="${esc(link(t))}" target="_blank" rel="noopener">فتح</a><button class="btn ghost sm" data-cp="${esc(link(t))}">نسخ</button>${S.me.is_owner ? `<button class="btn ghost sm" data-tg="${t.token}" data-v="${t.active ? 0 : 1}">${t.active ? 'إيقاف' : 'تفعيل'}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : A.emptyBox('لا توجد روابط شاشة بعد', S.me.is_owner ? 'أنشئ رابطاً للشاشة.' : 'يُنشئه مالك النظام.')}`;
    const nb = $('#btNew', B); if (nb) nb.onclick = e => A.run(e.currentTarget, async () => { await api.ins('board_tokens', { token: [...crypto.getRandomValues(new Uint8Array(12))].map(x => x.toString(16).padStart(2, '0')).join(''), school_id: S.school.id, section_id: sec.id, label: $('#btL', B).value.trim() || 'شاشة المدرسة' }); tScreen(B); });
    $$('[data-cp]', B).forEach(b => b.onclick = () => navigator.clipboard.writeText(b.dataset.cp).then(() => A.toast('نُسخ الرابط', 'ok')));
    $$('[data-tg]', B).forEach(b => b.onclick = () => A.run(b, async () => { const t = L.find(x => x.token === b.dataset.tg); await api.ups('board_tokens', [{ ...t, active: b.dataset.v === '1' }], 'token'); tScreen(B); }));
  }

  // ---------- المتابعة اللحظية ----------
  let lvT = null;
  async function tLive(B) {
    const draw = async () => {
      if (!document.body.contains(B)) { clearInterval(lvT); return; }
      const sec = A.section(), day = today(), dw = A.parseDate(day).getDay();
      const [pa, subs, clicks, beh] = await Promise.all([api.list('period_attendance', { school_id: S.school.id, day }).catch(() => []), api.list('substitutions', { section_id: sec.id, day }).catch(() => []), api.list('live_clicks', { school_id: S.school.id, on_date: day }, { select: 'id' }).catch(() => []), api.list('behaviors', { school_id: S.school.id }, { select: 'id,kind,created_at', gte: { created_at: day } }).catch(() => [])]);
      const cur = A.curPeriod ? A.curPeriod(null) : -1;
      const w = A.week(), ents = (S.allEntries || S.entries || []); const req = ents.filter(A.required), done = req.filter(A.filled).length;
      const di = w ? Math.round((A.parseDate(day) - A.parseDate(w.start_date)) / 864e5) : -1;
      const todaySlots = ents.filter(e => e.day === di && e.subject_id); const passed = todaySlots.filter(e => cur < 0 ? false : e.period <= cur);
      const taken = new Set(pa.map(x => x.class_id + '|' + x.period));
      const rc = passed.length ? Math.round(100 * passed.filter(e => taken.has(e.class_id + '|' + e.period)).length / passed.length) : null;
      const sb = (((sec.standby || {}).roster) || {})[dw + '|' + cur] || [];
      const uniq = k => new Set(pa.filter(x => x.status === k).map(x => x.student_id)).size;
      B.innerHTML = `<div class="row" style="gap:8px;margin-bottom:10px"><span class="rec-st ok" role="status">لحظي · يتحدّث كل دقيقة</span><span class="small muted">${DAYS[dw]} ${AR(A.dmy(A.parseDate(day)))}</span></div>
        <div class="pal-k">
          <div class="k info"><b>${cur >= 0 ? (PER[cur] || AR(cur + 1)) : '—'}</b>الحصة الآن</div>
          <div class="k ${rc != null && rc < 80 ? 'bad' : 'ok'}"><b>${rc == null ? '—' : AR(rc) + '٪'}</b>رصد الحضور للحصص الماضية</div>
          <div class="k bad"><b id="lvAb">${AR(uniq('absent'))}</b>طالب غائب</div><div class="k warn"><b id="lvLt">${AR(uniq('late'))}</b>متأخر</div><div class="k info"><b id="lvEx">${AR(uniq('excused') + uniq('early'))}</b>مستأذن/خروج</div>
          <div class="k"><b>${AR(subs.length)}</b>حصة مؤمَّنة اليوم</div><div class="k"><b>${AR(clicks.length)}</b>دخول لحصص عن بعد اليوم</div><div class="k"><b>${AR(beh.length)}</b>ملاحظة سلوك اليوم</div>
          <div class="k ${req.length && done / req.length < .8 ? 'warn' : 'ok'}"><b>${req.length ? AR(Math.round(100 * done / req.length)) + '٪' : '—'}</b>إنجاز خطط الأسبوع</div>
        </div>
        <div class="grid g2" style="margin-top:12px;align-items:start">
          <div class="sec-box"><b>الآن — ${cur >= 0 ? 'الحصة ' + (PER[cur] || AR(cur + 1)) : 'خارج وقت الحصص'}</b>${cur >= 0 ? `<table class="tbl" style="margin-top:6px"><tbody>${todaySlots.filter(e => e.period === cur).map(e => { const sbx = subs.find(x => x.class_id === e.class_id && x.period === cur); return `<tr><td><b>${esc((A.cls(e.class_id) || {}).name || '')}</b></td><td>${esc(A.subjName(e.subject_id))}</td><td class="small">${esc(sbx ? A.personName(sbx.sub_teacher) + ' (بديل)' : A.personName(e.teacher_id) || '')}</td><td>${taken.has(e.class_id + '|' + cur) ? '<span class="pill st-approved">حُضّر</span>' : '<span class="pill st-empty">لم يُحضَّر</span>'}</td></tr>`; }).join('') || '<tr><td>لا حصص</td></tr>'}</tbody></table>` : ''}</div>
          <div class="sec-box"><b>المنتظرون الآن</b><p style="margin:6px 0 0">${sb.filter(Boolean).map((t, k) => `منتظر ${AR(k + 1)}: <b>${esc(A.personName(t))}</b>`).join(' · ') || '<span class="small muted">لا يوجد</span>'}</p>
            <b style="display:block;margin-top:10px">تأمين اليوم</b>${subs.length ? `<ul class="small" style="margin:4px 0 0;padding-inline-start:18px">${subs.sort((a, b) => a.period - b.period).map(x => `<li>الحصة ${AR(x.period + 1)} · ${esc((A.cls(x.class_id) || {}).name || '')}: ${esc(A.personName(x.sub_teacher) || '—')} بدل ${esc(A.personName(x.absent_teacher) || '')}</li>`).join('')}</ul>` : '<p class="small muted" style="margin:4px 0 0">لا يوجد</p>'}</div>
        </div><div id="lvAtt"></div><div id="lvDu"></div>`;
      if (A.attDash) A.attDash($('#lvAtt', B), { sec, day, pa }).then(M => { if (!M) return; $('#lvAb', B).textContent = AR(M.absent); $('#lvLt', B).textContent = AR(M.late); $('#lvEx', B).textContent = AR(M.excused + M.early); }).catch(() => { });
      if (A.dutyNowBox) A.dutyNowBox($('#lvDu', B)).catch(() => { });
    };
    await draw(); clearInterval(lvT); lvT = setInterval(() => { if (!document.hidden) draw().catch(() => { }); }, 60000);
  }
})();
