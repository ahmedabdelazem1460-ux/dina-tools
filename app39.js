/* منصة دينا — «المصادر» مخزن المدرسة الواحد
   كل رابط أو ملف يُضاف في التحضير (السريع أو الكامل) أو في مكتبة المدرسة يُحفظ هنا تلقائياً مربوطاً بالمادة والصف والدرس والحصص،
   فيظهر في صفحة «المصادر» وفي تحضير الدرس نفسه لدى المعلمين، ويُختار منه بضغطة بدل الرفع من جديد.
   صفحة «المصادر» تبقى للتصفح والبحث: مصادر المدرسة · مصادري · المعروض لأولياء الأمور · بلا درس. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR, I } = A;
  const KINDS = [['worksheet', 'ورقة عمل', '#3AB1DB'], ['review', 'ملف مراجعة', '#2E7FC9'], ['test', 'اختبار / تقويم', '#C9A44C'], ['presentation', 'عرض تقديمي', '#AE95DA'], ['video', 'فيديو', '#E0675A'], ['image', 'صورة', '#2F855A'], ['file', 'ملف مرفوع', '#5B6B7D'], ['folder', 'مجلد Drive', '#082B5A'], ['link', 'رابط آخر', '#8CC56A']];
  const kindOf = k => KINDS.find(x => x[0] === k) || KINDS[KINDS.length - 1];
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (_) { return ''; } };
  const gk = c => c ? `${c.stage}|${c.grade_word}` : '';
  const gName = k => { const [st, g] = String(k || '|').split('|'); return g ? A.gradeName(g, st) : ''; };
  const guess = (u, t) => /^image\//.test(t || '') || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(u) || /^data:image/.test(u) ? 'image' : /youtu|vimeo|\.mp4/i.test(u) ? 'video' : /\/folders\//.test(u) ? 'folder' : /presentation|\.pptx?(\?|$)/i.test(u) ? 'presentation' : /\.pdf(\?|$)|\.docx?(\?|$)|\.xlsx?(\?|$)/i.test(u) || (t && !/^image/.test(t)) ? 'file' : /docs\.google|drive\.google/.test(u) ? 'worksheet' : 'link';
  const ORIG = { prep: 'من التحضير', library: 'من مكتبة المدرسة', manual: '' };
  const fetchRes = async force => { if (force) S._resAt = 0; return A.fetchResources ? A.fetchResources() : api.resources(); };

  // ---------- مزامنة مصادر تحضير مع المخزن ----------
  A.syncPrepRes = async function (x) {
    if (!x || !x.id) return;
    const d = x.data || {}, lib = x.kind === 'library';
    const want = [...(d.resources || []).filter(r => r.u).map(r => ({ url: r.u, title: r.t || host(r.u) || 'رابط', file_type: '' })), ...(d.files || []).filter(f => f.u).map(f => ({ url: f.u, title: f.n || 'ملف', file_type: f.t || '' }))];
    let have = []; try { have = (await api.list('resources', { prep_id: x.id })) || []; } catch (_) { have = []; }
    const off = lib && !x.active; // مكتبة غير مفعّلة: لا تظهر مصادرها للمعلمين بعد
    const cls = [...new Set((d.links || []).map(l => l.c).filter(Boolean))];
    const sec = cls.length ? ((A.cls(cls[0]) || {}).section_id || S.sectionId) : (lib ? null : S.sectionId);
    for (const h of have) if (off || !want.some(w => w.url === h.url)) await api.deleteResource(h.id).catch(() => { });
    if (off) { S._resAt = 0; return; }
    let all = []; try { all = await fetchRes(true); } catch (_) { }
    for (const w of want) {
      if (all.some(r => r.url === w.url && r.prep_id !== x.id)) continue; // موجود في المخزن (اختير منه أو من تحضير آخر) — لا تكرار
      const base = { title: w.title, kind: guess(w.url, w.file_type), file_type: w.file_type, subject_id: x.subject_id || null, grade_key: x.grade_key || null, lesson_id: x.lesson_id || null, note: x.lesson || '', origin: lib ? 'library' : 'prep' };
      const h = have.find(r => r.url === w.url);
      if (h) { await api.updateResource(h.id, { ...base, class_ids: lib ? (h.class_ids || []) : cls }).catch(() => { }); }
      else await api.addResource({ ...base, url: w.url, prep_id: x.id, class_ids: lib ? [] : cls, section_id: sec, school_id: S.school.id, visible_to_parents: false, week_id: null }).catch(() => { });
    }
    S._resAt = 0;
  };

  // مصادر درس معيّن من المخزن (بالدرس، وإلا بمطابقة العنوان داخل المادة والصف)
  A.lessonResources = async function (subj, grade, lessonId, title, exceptPrep) {
    const all = await fetchRes(); const t = A.normKey(title || '');
    return all.filter(r => r.prep_id !== exceptPrep && (!r.section_id || r.section_id === S.sectionId) && r.subject_id === subj && (!grade || !r.grade_key || r.grade_key === grade) && ((lessonId && r.lesson_id === lessonId) || (t && t.length > 2 && A.normKey(r.note + ' ' + r.title).includes(t))));
  };

  // ---------- منتقي المصادر (يحل محل القديم: درس الحصة أولاً) ----------
  A.pickResource = async function (subjectId, classId, onPick, o) {
    o = o || {}; const all = await fetchRes();
    const fit = r => (!r.section_id || r.section_id === S.sectionId);
    const t = A.normKey(o.lesson || '');
    const same = r => (o.lesson_id && r.lesson_id === o.lesson_id) || (t.length > 2 && A.normKey(r.note + ' ' + r.title).includes(t));
    let onlySubj = true;
    const m = A.modal(`<h3>${esc(o.title || 'من مصادر المدرسة')}</h3><p class="sub">${o.sub || 'اختر مصدراً — مصادر الدرس نفسه أولاً، ثم مصادر المادة. الجديد يُضاف من «المصادر» أو من التحضير.'}</p>
      <div class="row" style="margin-bottom:8px;gap:8px;flex-wrap:wrap"><input class="in" id="prq" placeholder="بحث" style="max-width:240px"><label class="chk"><input type="checkbox" id="prs" checked> ${esc(A.subjName(subjectId) || 'المادة')} فقط</label></div><div id="prl" style="max-height:52vh;overflow:auto"></div>`, { cls: 'wide' });
    const draw = () => { const q = A.normKey(m.el.querySelector('#prq').value || '');
      const l = all.filter(fit).filter(r => (!onlySubj || r.subject_id === subjectId || !r.subject_id) && (!o.grade_key || !r.grade_key || r.grade_key === o.grade_key) && (!q || A.normKey(r.title + ' ' + r.note).includes(q))).sort((a, b) => (same(b) ? 1 : 0) - (same(a) ? 1 : 0));
      m.el.querySelector('#prl').innerHTML = l.map(r => { const [, kl, kc] = kindOf(r.kind); return `<button type="button" class="pick-r" data-id="${r.id}"><span class="rk" style="--k:${kc}">${kl}</span><span><b>${esc(r.title)}</b>${same(r) ? ' <span class="pill st-approved">الدرس نفسه</span>' : ''}<br><span class="small muted">${esc(A.subjName(r.subject_id) || 'عام')}${r.grade_key ? ' · ' + esc(gName(r.grade_key)) : ''}${r.note ? ' · ' + esc(r.note) : ''} · ${esc(A.personName(r.created_by) || '')}</span></span></button>`; }).join('') || A.emptyBox('لا توجد مصادر مطابقة');
      $$('[data-id]', m.el).forEach(b => b.onclick = () => { const r = all.find(x => x.id === b.dataset.id); m.close(); onPick(r); }); };
    m.el.querySelector('#prq').oninput = draw; m.el.querySelector('#prs').onchange = e => { onlySubj = e.target.checked; draw(); }; draw();
  };

  // ---------- صفحة «المصادر» ----------
  V.resources = async function (root) {
    root.innerHTML = '<div class="spinner"></div>';
    let RES; try { RES = await fetchRes(true); RES = RES.slice(); } catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر تحميل المصادر', e.message)}</div>`; return; }
    const st = { tab: A.LS.get('rs_t') || 'all', q: '', subj: A.LS.get('rs_s') || '', grade: A.LS.get('rs_g') || '', kind: '', lesson: '' };
    const grades = [...new Set(S.classes.filter(c => c.active).map(gk))].filter(Boolean);
    let CUR = [];
    const loadCur = async () => { CUR = st.subj && st.grade ? await api.list('curriculum', { school_id: S.school.id, subject_id: st.subj, grade_key: st.grade }, { order: 'sort' }).catch(() => []) : []; };
    await loadCur();
    const inSec = r => !r.section_id || r.section_id === S.sectionId;
    const T = { all: ['مصادر المدرسة', r => true], mine: ['مصادري', r => r.created_by === S.me.id], parents: ['المعروض لأولياء الأمور', r => r.visible_to_parents], nolesson: ['بلا درس', r => !r.lesson_id && !r.prep_id] };
    const list = () => RES.filter(r => inSec(r) && T[st.tab][1](r) && (!st.subj || r.subject_id === st.subj) && (!st.grade || !r.grade_key || r.grade_key === st.grade) && (!st.kind || r.kind === st.kind) && (!st.lesson || r.lesson_id === st.lesson) && (!st.q || A.normKey(r.title + ' ' + r.note).includes(A.normKey(st.q))));
    const canEd = r => S.me.is_owner || r.created_by === S.me.id || A.perm('review');
    const paint = () => {
      root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>المصادر</h2><p class="sub" style="margin:2px 0 0">مخزن المدرسة الواحد: أوراق العمل والعروض والفيديو والصور والملفات وروابط Drive — مرتبطة بالمادة والصف والدرس. ما تضيفه في التحضير أو المكتبة يظهر هنا تلقائياً.</p></div>
        <div class="row"><button class="btn" id="rsAdd">${I.plus} إضافة مصدر</button><button class="btn ghost" id="rsPrint">${I.print} طباعة القائمة</button></div></div>
        <div class="kpick" id="rsT">${Object.entries(T).map(([k, [n, f]]) => `<button data-t="${k}" class="${st.tab === k ? 'on' : ''}">${n} (${AR(RES.filter(r => inSec(r) && f(r)).length)})</button>`).join('')}</div>
        <div class="row" style="margin:10px 0 12px;gap:8px;flex-wrap:wrap"><input class="in" id="rsQ" placeholder="بحث بالعنوان أو الدرس" style="max-width:240px" value="${esc(st.q)}">
          <select class="in" id="rsS" style="max-width:180px"><option value="">كل المواد</option>${S.subjects.map(s => `<option value="${s.id}" ${st.subj === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
          <select class="in" id="rsG" style="max-width:180px"><option value="">كل الصفوف</option>${grades.map(g => `<option value="${esc(g)}" ${st.grade === g ? 'selected' : ''}>${esc(gName(g))}</option>`).join('')}</select>
          ${CUR.length ? `<select class="in" id="rsL" style="max-width:220px"><option value="">كل الدروس</option>${CUR.map(l => `<option value="${l.id}" ${st.lesson === l.id ? 'selected' : ''}>${esc(l.lesson)}</option>`).join('')}</select>` : ''}
          <select class="in" id="rsK" style="max-width:160px"><option value="">كل الأنواع</option>${KINDS.map(([k, l]) => `<option value="${k}" ${st.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div id="rsLi" class="res-grid"></div></div>`;
      draw();
      $$('#rsT button', root).forEach(b => b.onclick = () => { st.tab = b.dataset.t; A.LS.set('rs_t', st.tab); paint(); });
      $('#rsAdd', root).onclick = () => edit();
      $('#rsQ', root).oninput = e => { st.q = e.target.value; draw(); };
      $('#rsS', root).onchange = async e => { st.subj = e.target.value; st.lesson = ''; A.LS.set('rs_s', st.subj); await loadCur(); paint(); };
      $('#rsG', root).onchange = async e => { st.grade = e.target.value; st.lesson = ''; A.LS.set('rs_g', st.grade); await loadCur(); paint(); };
      const rl = $('#rsL', root); if (rl) rl.onchange = e => { st.lesson = e.target.value; draw(); };
      $('#rsK', root).onchange = e => { st.kind = e.target.value; draw(); };
      $('#rsPrint', root).onclick = () => { const l = list(); const by = {}; l.forEach(r => (by[A.subjName(r.subject_id) || 'عام'] = by[A.subjName(r.subject_id) || 'عام'] || []).push(r));
        A.printDoc('قائمة المصادر', `${A.section().name} · ${T[st.tab][0]}`, Object.entries(by).map(([s, rs]) => `<h3 style="margin:14px 0 6px;border-inline-start:6px solid #3AB1DB;padding-inline-start:8px">${esc(s)}</h3><table><tr><th>المصدر</th><th>النوع</th><th>الصف / الدرس</th><th>الرابط</th></tr>${rs.map(r => `<tr><td style="text-align:start"><b>${esc(r.title)}</b></td><td>${kindOf(r.kind)[1]}</td><td>${esc([gName(r.grade_key), r.note].filter(Boolean).join(' · '))}</td><td dir="ltr" style="font-size:10px;word-break:break-all">${esc(/^data:/.test(r.url) ? '(ملف مرفوع)' : r.url)}</td></tr>`).join('')}</table>`).join('') || '<p>لا توجد مصادر</p>'); };
    };
    const draw = () => {
      const l = list(), box = $('#rsLi', root);
      box.innerHTML = l.map(r => { const [, kl, kc] = kindOf(r.kind); const cl = (r.class_ids || []).map(id => (A.cls(id) || {}).name).filter(Boolean); const img = r.kind === 'image';
        return `<div class="res">${img ? `<a href="${esc(r.url)}" target="_blank" rel="noopener" class="res-img"><img src="${esc(r.url)}" alt="${esc(r.title)}" loading="lazy"></a>` : ''}<div class="row" style="gap:4px"><span class="rk" style="--k:${kc}">${kl}</span>${ORIG[r.origin] ? `<span class="pill st-submitted">${ORIG[r.origin]}</span>` : ''}</div><a class="rt" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.title)}</a>
          <div class="small muted">${esc(A.subjName(r.subject_id) || 'عام')}${r.grade_key ? ' · ' + esc(gName(r.grade_key)) : ''}${cl.length ? ' · ' + esc(cl.join('، ')) : ''}${r.visible_to_parents ? ' · <span class="pill st-approved">يظهر لأولياء الأمور</span>' : ''}</div>${r.note ? `<div class="small" style="margin-top:4px">${r.lesson_id || r.prep_id ? 'الدرس: ' : ''}${esc(r.note)}</div>` : ''}
          <div class="rf"><span class="small faint">${/^data:/.test(r.url) ? 'ملف' : /drive\.google|docs\.google/.test(r.url) ? 'Google Drive' : esc(host(r.url))} · ${esc(A.personName(r.created_by) || '')}</span><span class="row" style="gap:4px">${/^data:/.test(r.url) ? '' : `<button class="btn ghost sm" data-cp="${r.id}" aria-label="نسخ الرابط">نسخ</button>`}${canEd(r) ? `<button class="btn ghost sm" data-ed="${r.id}">تعديل</button><button class="btn bad sm" data-del="${r.id}" aria-label="حذف">×</button>` : ''}</span></div></div>`; }).join('') || A.emptyBox(st.tab === 'nolesson' ? 'كل المصادر مرتبطة بدروس ✓' : 'لا توجد مصادر', 'أضف مصدراً، أو أضف روابط وملفات في التحضير فتظهر هنا.');
      $$('[data-cp]', box).forEach(b => b.onclick = () => { const r = RES.find(x => x.id === b.dataset.cp); navigator.clipboard.writeText(r.url).then(() => A.toast('نُسخ الرابط', 'ok')); });
      $$('[data-ed]', box).forEach(b => b.onclick = () => edit(RES.find(x => x.id === b.dataset.ed)));
      $$('[data-del]', box).forEach(b => b.onclick = async () => { const r = RES.find(x => x.id === b.dataset.del); if (!(await A.confirmBox(r.prep_id ? 'حذف هذا المصدر من المخزن؟ يبقى في التحضير الذي أُضيف منه ويعود إذا حُفظ التحضير مرة أخرى.' : 'حذف هذا المصدر من القائمة؟ الملف نفسه في Drive لا يتأثر.', 'حذف', true))) return; await A.run(null, async () => { await api.deleteResource(r.id); RES = RES.filter(x => x.id !== r.id); S._resAt = 0; draw(); }); });
    };
    const edit = async r => {
      r = r || { kind: 'worksheet', subject_id: st.subj || null, grade_key: st.grade || null, lesson_id: st.lesson || null, class_ids: [], title: '', url: '', note: '' };
      let C2 = []; const lc = async () => { C2 = r.subject_id && r.grade_key ? await api.list('curriculum', { school_id: S.school.id, subject_id: r.subject_id, grade_key: r.grade_key }, { order: 'sort' }).catch(() => []) : []; }; await lc();
      const m = A.modal(`<h3>${r.id ? 'تعديل' : 'إضافة'} مصدر</h3><div id="reB"></div>`, { cls: 'wide' }); const B = m.el.querySelector('#reB'), q = s => B.querySelector(s);
      const sync = () => { const g = s => q(s); const tu = g('#reU').value.trim(); if (tu) { r.url = tu; r.file_type = ''; } r.title = g('#reT').value; r.kind = g('#reK').value; r.note = g('#reN').value; r.visible_to_parents = g('#reP').checked; r.class_ids = $$('.perm-grid input:checked', B).map(i => i.value); };
      const dr = () => {
        const cls = S.classes.filter(c => c.active && (!r.grade_key || gk(c) === r.grade_key));
        B.innerHTML = `<div class="field"><label for="reU">الرابط (Drive أو أي رابط) — أو ارفع ملفاً</label><div class="row" style="gap:6px;flex-wrap:nowrap"><input class="in" id="reU" dir="ltr" value="${esc(/^data:/.test(r.url) ? '' : r.url)}" placeholder="https://drive.google.com/..."><label class="btn ghost sm" style="white-space:nowrap">رفع ملف<input type="file" id="reF" hidden accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"></label></div>${r.url && (/^data:/.test(r.url) || r.file_type) ? `<p class="small" style="margin:4px 0 0">ملف مرفوع: <b>${esc(r.title)}</b></p>` : ''}</div>
          <div class="grid g2"><div class="field"><label for="reT">العنوان</label><input class="in" id="reT" value="${esc(r.title)}" placeholder="مثال: ورقة عمل الكسور العشرية"></div>
            <div class="field"><label for="reK">النوع</label><select class="in" id="reK">${KINDS.map(([k, l]) => `<option value="${k}" ${r.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
            <div class="field"><label for="reS">المادة</label><select class="in" id="reS"><option value="">عام</option>${S.subjects.map(s => `<option value="${s.id}" ${r.subject_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
            <div class="field"><label for="reG">الصف</label><select class="in" id="reG"><option value="">كل الصفوف</option>${grades.map(g => `<option value="${esc(g)}" ${r.grade_key === g ? 'selected' : ''}>${esc(gName(g))}</option>`).join('')}</select></div>
            <div class="field"><label for="reL">الدرس (اختياري)</label><select class="in" id="reL"><option value="">—</option>${C2.map(l => `<option value="${l.id}" ${r.lesson_id === l.id ? 'selected' : ''}>${esc(l.unit ? l.unit + ' — ' : '')}${esc(l.lesson)}</option>`).join('')}</select>${!C2.length && r.subject_id && r.grade_key ? '<span class="small muted">لا توجد دروس مدخلة لهذا الصف (من «التقويم ← المنهج والدروس»).</span>' : ''}</div>
            <div class="field"><label for="reN">ملاحظة (اختياري)</label><input class="in" id="reN" value="${esc(r.note || '')}"></div></div>
          <label class="chk" style="margin-bottom:8px"><input type="checkbox" id="reP" ${r.visible_to_parents ? 'checked' : ''}> يظهر لأولياء الأمور في بوابتهم مع خطة الأسبوع</label>
          <div class="field"><label>الفصول (اتركها كلها فارغة ليظهر للجميع)</label><div class="perm-grid">${cls.map(c => `<label class="chk"><input type="checkbox" value="${c.id}" ${(r.class_ids || []).includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div></div>
          <div class="acts"><button class="btn" id="reGo">حفظ</button></div>`;
        q('#reU').onchange = () => { const u = q('#reU').value; q('#reK').value = guess(u); };
        q('#reS').onchange = async e => { sync(); r.subject_id = e.target.value || null; r.lesson_id = null; await lc(); dr(); };
        q('#reG').onchange = async e => { sync(); r.grade_key = e.target.value || null; r.lesson_id = null; await lc(); dr(); };
        q('#reL').onchange = e => { r.lesson_id = e.target.value || null; const l = C2.find(x => x.id === r.lesson_id); if (l && !q('#reN').value.trim()) q('#reN').value = l.lesson; };
        q('#reF').onchange = e => A.run(null, async () => { const f = e.target.files[0]; if (!f) return; if (f.size > 15e6) throw new Error('الملف أكبر من ١٥ ميجابايت'); sync(); r.url = await api.uploadAsset(f); r.file_type = f.type || ''; r.kind = guess(r.url, f.type); if (!r.title.trim()) r.title = f.name; dr(); A.toast('رُفع الملف', 'ok'); });
        q('#reGo').onclick = e => A.run(e.currentTarget, async () => {
          const typed = q('#reU').value.trim(); const url = typed || r.url; if (!/^(https?:\/\/|data:)/i.test(url || '')) throw new Error('اكتب رابطاً يبدأ بـ https:// أو ارفع ملفاً');
          const row = { url, title: q('#reT').value.trim() || host(url) || 'مصدر', kind: q('#reK').value, subject_id: r.subject_id || null, grade_key: r.grade_key || null, lesson_id: r.lesson_id || null, note: q('#reN').value.trim(), visible_to_parents: q('#reP').checked, class_ids: $$('.perm-grid input:checked', B).map(i => i.value), file_type: typed ? '' : (r.file_type || '') };
          if (r.id) { const x = await api.updateResource(r.id, row); Object.assign(r, x); } else RES.unshift(await api.addResource({ ...row, origin: 'manual', section_id: S.sectionId, school_id: S.school.id }));
          m.close(); S._resAt = 0; paint(); A.toast('حُفظ المصدر', 'ok');
        });
      };
      dr();
    };
    paint();
  };
})();
