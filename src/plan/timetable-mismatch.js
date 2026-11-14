/* منصة دينا — «حصص مكتوبة تخالف الجدول»: تنبيه واضح في لوحة المتابعة + قرار مباشر
   عند تعديل الجدول تُحدَّث الحصص الفارغة فوراً، أما الحصة التي كتبها المعلم فلا تُمس تلقائياً (حمايةً لعمله).
   هنا تقرر: تطبيق الجدول (يُحفظ المحتوى السابق كاملاً في سجل التعديلات ويُبلَّغ المعلم)، أو اعتماد مادة الجدول مع إبقاء النص، أو إبقاؤها. */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, DAYS, PER } = A;
  const can = () => S.me.is_owner || A.perm('timetable_edit') || A.perm('review');
  if (!api.slotConflictReset) api.slotConflictReset = id => api.rpc('slot_conflict_reset', { p_entry: id });
  const load = async () => { if (!api.slotConflicts) return []; try { return (await api.slotConflicts(S.sectionId)).filter(x => (x.topic || '').trim()); } catch (_) { return []; } };

  A.conflictsDialog = async function (after) {
    let list = await load();
    const m = A.modal(`<h3>حصص مكتوبة تخالف الجدول الحالي</h3>
      <p class="sub">عُدِّل الجدول بعد أن كتب المعلم هذه الحصص، فلم تُغيَّر تلقائياً حفاظاً على عمله. اختر لكل حصة:</p>
      <ul class="small" style="margin:0 0 10px;line-height:1.9"><li><b>تطبيق الجدول</b>: تصبح الخلية لمادة الجدول ومعلمه فارغةً للكتابة، ويُحفظ المحتوى السابق كاملاً في سجل التعديلات (قابل للاسترجاع)، ويصل المعلم إشعار.</li><li><b>اعتماد المادة وإبقاء النص</b>: تتغير المادة والمعلم فقط ويبقى النص المكتوب.</li><li><b>إبقاء</b>: إن كان الصحيح ما في الخطة — صحّح الجدول بدلاً من ذلك.</li></ul>
      <div class="row" style="gap:12px;margin-bottom:8px"><label class="chk"><input type="checkbox" id="cfN" checked> تنبيه المعلم عند تطبيق الجدول على حصته</label>${A.noticeMsgBox ? A.noticeMsgBox('cfNM', 'وكرسالة أيضاً') : ''}</div>
      <div id="cfL"></div>`, { cls: 'wide' });
    const L = m.el.querySelector('#cfL');
    const notify = async (x, r) => { if (!m.el.querySelector('#cfN').checked || !r || !r.old_teacher || !api.sendMessages) return; try { await (A.notice ? A.notice([r.old_teacher], 'تعديل في جدولك', `عُدِّل الجدول: حصة ${DAYS[x.day]} — الحصة ${PER[x.period] || AR(x.period + 1)} في ${(A.cls(x.class_id) || {}).name || ''} (الأسبوع ${AR(x.week_number)}) أصبحت ${A.subjName(x.slot_subject) || 'بلا مادة'}${x.slot_teacher ? ' — ' + A.personName(x.slot_teacher) : ''}.\nما كُتب سابقاً («${(x.topic || '').slice(0, 80)}») محفوظ لدى الإدارة، ويمكن نقله لحصة أخرى عند الحاجة.`, { link: '#/my', asMessage: !!(m.el.querySelector('#cfNM') || {}).checked }) : api.sendMessages([{ recipient_id: r.old_teacher, subject: 'تعديل في جدولك', body: `عُدِّل الجدول: حصة ${DAYS[x.day]} — الحصة ${PER[x.period] || AR(x.period + 1)} في ${(A.cls(x.class_id) || {}).name || ''} (الأسبوع ${AR(x.week_number)}) أصبحت ${A.subjName(x.slot_subject) || 'بلا مادة'}${x.slot_teacher ? ' — ' + A.personName(x.slot_teacher) : ''}.\nما كُتب سابقاً («${(x.topic || '').slice(0, 80)}») محفوظ لدى الإدارة، ويمكن نقله لحصة أخرى عند الحاجة.`, kind: 'system' }])); } catch (_) {} };
    const draw = () => {
      if (!list.length) { L.innerHTML = '<div class="notice ok">لا توجد حصص معلّقة — الخطط مطابقة للجدول ✓</div>'; return; }
      L.innerHTML = `<div class="scroll" style="max-height:55vh"><table class="tbl"><thead><tr><th>الأسبوع</th><th>الفصل · اليوم · الحصة</th><th>في الخطة (كتبه المعلم)</th><th>في الجدول الآن</th><th></th></tr></thead><tbody>${list.map(x => `<tr data-r="${x.entry_id}">
          <td>${AR(x.week_number)}</td><td><b>${esc((A.cls(x.class_id) || {}).name || '')}</b><div class="small muted">${DAYS[x.day]} · الحصة ${PER[x.period] || AR(x.period + 1)}</div></td>
          <td>${esc(A.subjName(x.entry_subject) || '—')}<div class="small muted">«${esc((x.topic || '').slice(0, 60))}»</div><span class="pill ${x.status === 'approved' ? 'st-approved' : x.status === 'submitted' ? 'st-submitted' : 'st-draft'}">${esc(A.STATUS[x.status] || x.status)}</span></td>
          <td><b>${esc(A.subjName(x.slot_subject) || 'بلا مادة')}</b>${x.slot_teacher ? `<div class="small muted">${esc(A.personName(x.slot_teacher))}</div>` : ''}</td>
          <td><div class="row" style="gap:4px;flex-wrap:wrap"><button class="btn sm" data-a="reset">تطبيق الجدول</button><button class="btn ghost sm" data-a="keep">اعتماد المادة وإبقاء النص</button><button class="btn ghost sm" data-a="skip">إبقاء</button></div></td></tr>`).join('')}</tbody></table></div>
        <div class="acts"><button class="btn" id="cfAll">تطبيق الجدول على الكل (${AR(list.length)})</button></div>`;
      $$('[data-r]', L).forEach(tr => $$('[data-a]', tr).forEach(b => b.onclick = ev => A.run(ev.currentTarget, async () => {
        const x = list.find(y => y.entry_id === tr.dataset.r);
        if (b.dataset.a === 'reset') { const r = await api.slotConflictReset(x.entry_id); await notify(x, r); }
        else if (b.dataset.a === 'keep') await api.slotConflictApply(x.entry_id);
        list = list.filter(y => y !== x); draw(); changed = true;
      })));
      const all = $('#cfAll', L); if (all) all.onclick = ev => A.run(ev.currentTarget, async () => { if (!(await A.confirmBox(`تطبيق الجدول على ${A.cnt(list.length, 'حصة', 'حصص')}؟<br><span class="small muted">يُحفظ المحتوى السابق لكل حصة في سجل التعديلات.</span>`, 'تطبيق'))) return; for (const x of list.slice()) { const r = await api.slotConflictReset(x.entry_id); await notify(x, r); } list = []; draw(); changed = true; });
    };
    let changed = false; draw();
    const close0 = m.close; m.close = () => { close0(); if (changed) A.loadWeek().then(() => { A.toast('حُدِّثت الخطط وفق الجدول', 'ok'); if (after) after(); else A.route(); }); };
    const x = m.el.querySelector('.x'); if (x) x.onclick = () => m.close();
  };

  async function banner(root) {
    const el = $('#dConf', root); if (!el) return; const l = await load();
    if (!l.length) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="notice warn" style="margin-bottom:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><span><b>${A.cnt(l.length, 'حصة مكتوبة تخالف', 'حصص مكتوبة تخالف')} الجدول بعد تعديله</b> — لذلك قد يختلف نصاب بعض المعلمين في هذه اللوحة عن الجدول حتى تقرر.</span><button class="btn sm" id="dConfGo">مراجعة واتخاذ القرار</button></div>`;
    $('#dConfGo', el).onclick = () => A.conflictsDialog();
  }
  const dash0 = V.dash;
  if (dash0) V.dash = function (root) { const r = dash0(root); if (can()) { const h = $('#dReq', root) || $('.head', root); if (h && !$('#dConf', root)) { h.insertAdjacentHTML('afterend', '<div id="dConf"></div>'); banner(root); } } return r; };
  // تحديث فوري: أي تعديل على الجدول يعيد فحص التنبيه في لوحة المتابعة
  let sub = null, subSec = null;
  const watch = () => { if (!S.sectionId || subSec === S.sectionId || !api.subscribe) return; if (sub) try { sub(); } catch (_) {} subSec = S.sectionId; let t; sub = api.subscribe('cf-' + S.sectionId, 'timetable_slots', null, () => { clearTimeout(t); t = setTimeout(() => { const root = document.querySelector('#dConf') && document.querySelector('#dConf').parentElement; if (root) banner(root); }, 1800); }); };
  const aw = window.APP_AFTER_WEEK; window.APP_AFTER_WEEK = function () { if (aw) aw.apply(this, arguments); if (can()) watch(); };
})();
