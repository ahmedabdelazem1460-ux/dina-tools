/* منصة دينا — سلة المحذوفات: كل حذف يُحفظ تلقائياً في قاعدة البيانات (مع ما حُذف معه)، ويمكن استعادته أو حذفه نهائياً */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR, I } = A;
  A.I.trash = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 14h10l1-14"/><path d="M10 11v6M14 11v6"/></svg>';
  const T = { weeks: 'أسبوع', plan_entries: 'حصص خطة', classes: 'فصل', subjects: 'مادة', staff: 'موظف', students: 'طالب', sections: 'قسم', memberships: 'عضوية قسم', timetable_versions: 'نسخة جدول', timetable_slots: 'حصص جدول', display_schedules: 'جدول استثنائي', live_entries: 'بيانات حصص عن بعد', quizzes: 'اختبار / ورقة عمل', quiz_attempts: 'محاولة طالب', questions: 'سؤال', curriculum: 'درس منهج', spec_tables: 'جدول مواصفات', paper_exams: 'اختبار ورقي', paper_results: 'نتيجة ورقية', exam_committees: 'لجان', resources: 'مصدر', parent_posts: 'إعلان أولياء أمور', parent_links: 'رابط أولياء أمور', attendance: 'حضور صباحي', period_attendance: 'حضور حصة', behaviors: 'سلوك', sup_records: 'تقرير إشرافي', sup_templates: 'نموذج إشراف', sup_docs: 'وثيقة إشراف', remedial_plans: 'خطة علاجية', messages: 'رسالة', notes: 'ملاحظة', extra_pages: 'صفحة إضافية', record_books: 'سجل متابعة', tool_snapshots: 'نسخة محفوظة', assignment_requests: 'طلب إسناد', entry_delegations: 'تفويض', module_grants: 'صلاحية', language_issues: 'ملاحظة لغوية', section_plans: 'خطة توزيع' };
  const tn = k => T[k] || k;

  // تعديل نص تأكيدات الحذف: الحذف لم يعد نهائياً
  const cb0 = A.confirmBox;
  A.confirmBox = (msg, btn, danger) => cb0(String(msg || '').replace(/\s*(لا يمكن التراجع( عنه)?\.?|نهائياً)/g, '') + (danger ? '<br><span class="small muted">يُحفظ في «المحذوفات» ويمكن استعادته.</span>' : ''), btn === 'حذف نهائي' ? 'حذف' : btn, danger);

  // بند في القائمة لصاحب الحساب
  if (A.NAV && !A.NAV.some(n => n[0] === 'trash')) { const i = A.NAV.findIndex(n => n[0] === 'archive'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['trash', 'المحذوفات', () => S.me && S.me.is_owner]); }

  V.trash = async function (root) {
    if (!S.me.is_owner) { root.innerHTML = `<div class="card">${A.emptyBox('لصاحب الحساب فقط')}</div>`; return; }
    root.innerHTML = '<div class="card"><div class="spinner"></div></div>';
    let L = []; try { L = await api.rpc('trash_list', { p_limit: 300 }); } catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', esc(e.message))}</div>`; return; }
    let showDone = A.LS.get('trash_done') === '1', q = '';
    const draw = () => {
      const l = L.filter(x => (showDone || x.n_open > 0) && (!q || A.normKey((x.main_label || '') + ' ' + tn(x.main_tbl) + ' ' + A.personName(x.deleted_by)).includes(A.normKey(q))));
      root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">المحذوفات</h2><p class="sub" style="margin:2px 0 0">كل ما يُحذف من المنصة يُحفظ هنا تلقائياً مع ما حُذف معه (مثل حصص الأسبوع عند حذف أسبوع). يمكنك استعادته كما كان أو حذفه نهائياً.</p></div>
          <div class="row" style="gap:6px;flex-wrap:wrap"><input class="in" id="trQ" placeholder="بحث" value="${esc(q)}" style="width:180px" aria-label="بحث"><label class="chk"><input type="checkbox" id="trD" ${showDone ? 'checked' : ''}> إظهار المستعاد</label><button class="btn ghost sm" id="trP30">حذف ما مضى عليه أكثر من ٣٠ يوماً</button></div></div>
        ${l.length ? `<div class="scroll"><table class="tbl"><thead><tr><th>المحذوف</th><th>النوع</th><th>معه</th><th>حذفه</th><th>الوقت</th><th></th></tr></thead><tbody>${l.map(x => { const extra = Object.entries(x.tbls || {}).filter(([k]) => k !== x.main_tbl).map(([k, v]) => `${tn(k)} ${AR(v)}`).join('، ');
          return `<tr class="${x.n_open ? '' : 'done'}"><td><b>${esc(x.main_label || '—')}</b>${x.n_open ? '' : ' <span class="pill st-approved">استُعيد</span>'}</td><td>${tn(x.main_tbl)}${(x.tbls || {})[x.main_tbl] > 1 ? ` <span class="small muted">(${AR(x.tbls[x.main_tbl])})</span>` : ''}</td><td class="small">${esc(extra) || '—'}</td><td class="small">${esc(A.personName(x.deleted_by) || '—')}</td><td class="small">${A.fmtDT(x.deleted_at)}</td>
            <td class="row" style="flex-wrap:nowrap;gap:4px">${x.n_open ? `<button class="btn ok sm" data-rs="${x.batch}">استعادة</button>` : ''}<button class="btn bad sm" data-pg="${x.batch}" aria-label="حذف نهائي">حذف نهائي</button></td></tr>`; }).join('')}</tbody></table></div>` : A.emptyBox('السلة فارغة', 'ما تحذفه من الأسابيع والفصول والمواد والطلاب والاختبارات والجداول وغيرها يظهر هنا.')}</div>`;
      $('#trQ', root).oninput = e => { q = e.target.value; clearTimeout(root._t); root._t = setTimeout(draw, 250); };
      $('#trD', root).onchange = e => { showDone = e.target.checked; A.LS.set('trash_done', showDone ? '1' : '0'); draw(); };
      $('#trP30', root).onclick = ev => A.run(ev.currentTarget, async () => { if (!(await cb0('حذف ما مضى عليه أكثر من ٣٠ يوماً من السلة نهائياً؟', 'حذف', true))) return; const n = await api.rpc('trash_purge', { p_batch: null, p_days: 30 }); A.toast(`حُذف ${AR(n)} عنصر نهائياً`, 'ok'); V.trash(root); });
      $$('[data-rs]', root).forEach(b => b.onclick = () => A.run(b, async () => {
        const r = await api.rpc('trash_restore', { p_batch: +b.dataset.rs });
        A.toast(r.failed ? `استُعيد ${AR(r.restored)} وتعذّر ${AR(r.failed)}${r.error ? ' — ' + r.error : ''}` : `استُعيد ${AR(r.restored)} عنصر كما كان`, r.failed ? 'warn' : 'ok');
        try { await A.loadSection(S.weekId); } catch (_) { }
        V.trash(root);
      }));
      $$('[data-pg]', root).forEach(b => b.onclick = () => A.run(b, async () => { if (!(await cb0('حذف هذا العنصر من السلة نهائياً؟ لن يمكن استعادته بعد ذلك.', 'حذف نهائي', true))) return; await api.rpc('trash_purge', { p_batch: +b.dataset.pg, p_days: null }); L = L.filter(x => String(x.batch) !== b.dataset.pg); draw(); A.toast('حُذف نهائياً', 'ok'); }));
    };
    draw();
  };
})();
