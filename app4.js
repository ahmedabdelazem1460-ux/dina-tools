/* منصة دينا — الصفحات الإضافية في الخطة + روابط انضمام المعلمين */
(function () {
  const A = window.APP, V = window.VIEWS;
  const { api, S, $, $$, esc, AR, I } = A;

  // =====================================================================
  //  الصفحات الإضافية (وسام التميز، إعلانات، مهام أدائية، صفحة حرة)
  // =====================================================================
  const KINDS = {
    honor: ['وسام التميز', 'تكريم الطلاب المتميزين بأسمائهم وسبب التكريم'],
    tasks: ['المهام الأدائية', 'جدول مهام مرتبطة بالمواد مع موعد التسليم'],
    announcement: ['إعلانات داخلية', 'إعلانات وتنبيهات لأولياء الأمور والطلاب'],
    custom: ['صفحة حرة', 'عنوان ونص حر بأي محتوى'],
  };
  const canEdit = () => A.perm('review') || A.perm('structure');
  V._xp = function (card, c, refresh) {
    const w = A.week(); const list = (S.extraPages || []).filter(x => x.class_id === c.id || x.class_id === null);
    const editable = canEdit() && w.status !== 'published';
    const summary = x => { const k = x.content || {}; if (x.kind === 'honor') return A.cnt((k.students || []).filter(s => s.name).length, 'طالب', 'طلاب'); if (x.kind === 'tasks') return A.cnt((k.rows || []).filter(r => r.task).length, 'مهمة', 'مهام'); if (x.kind === 'announcement') return A.cnt((k.items || []).length, 'إعلان', 'إعلانات'); return (k.body || '').slice(0, 60); };
    card.innerHTML = `<div class="head"><div class="grow"><h3 style="margin:0">صفحات إضافية في الملف</h3><p class="sub" style="margin:2px 0 0">تُطبع بهوية دينا بعد الغلاف أو في آخر الملف، لهذا الفصل أو لكل الفصول.</p></div>
      ${editable ? `<div class="row">${Object.entries(KINDS).map(([k, [l]]) => `<button class="btn ghost sm" data-new="${k}">${I.plus} ${l}</button>`).join('')}</div>` : ''}</div>
      ${list.length ? `<div class="xp-list">${list.map(x => `<div class="xp"><div class="k">${KINDS[x.kind][0]} · ${x.class_id ? 'هذا الفصل' : 'كل الفصول'} · ${x.position === 'after_cover' ? 'بعد الغلاف' : 'آخر الملف'}</div><div class="tt">${esc(x.title || KINDS[x.kind][0])}</div><div class="small muted">${esc(summary(x))}</div>${editable ? `<div class="acts"><button class="btn ghost sm" data-ed="${x.id}">تعديل</button><button class="btn bad sm" data-del="${x.id}">حذف</button></div>` : ''}</div>`).join('')}</div>` : '<p class="muted small">لا توجد صفحات إضافية. أضف «وسام التميز» لتكريم الطلاب أو «المهام الأدائية» للمواد.</p>'}`;
    const reload = async () => { S.extraPages = await api.extraPages(w.id); refresh(); };
    $$('[data-new]', card).forEach(b => b.onclick = () => editor({ kind: b.dataset.new, class_id: c.id, position: 'end', title: KINDS[b.dataset.new][0], content: {} }, c, reload));
    $$('[data-ed]', card).forEach(b => b.onclick = () => editor(S.extraPages.find(x => x.id === b.dataset.ed), c, reload));
    $$('[data-del]', card).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذه الصفحة من الملف؟', 'حذف', true))) return; A.run(null, async () => { await api.deleteExtraPage(b.dataset.del); await reload(); }); });
  };

  function rowsEditor(box, cols, rows, add) {
    const draw = () => {
      box.innerHTML = rows.map((r, i) => `<div class="r" style="grid-template-columns:${cols.map(c => c[2] || '1fr').join(' ')} 40px">${cols.map(([k, l]) => `<input class="in" data-i="${i}" data-k="${k}" value="${esc(r[k] || '')}" placeholder="${l}" aria-label="${l}">`).join('')}<button class="btn bad sm" data-rm="${i}" aria-label="حذف السطر" type="button">×</button></div>`).join('') +
        `<button class="btn ghost sm" type="button" data-add>${I.plus} ${add}</button>`;
      $$('input[data-i]', box).forEach(inp => inp.oninput = () => rows[+inp.dataset.i][inp.dataset.k] = inp.value);
      $$('[data-rm]', box).forEach(b => b.onclick = () => { rows.splice(+b.dataset.rm, 1); draw(); });
      $('[data-add]', box).onclick = () => { rows.push({}); draw(); const l = $$('input[data-i]', box); l[l.length - cols.length] && l[l.length - cols.length].focus(); };
    };
    draw();
  }
  function editor(x, c, reload) {
    const k = x.content ? JSON.parse(JSON.stringify(x.content)) : {};
    let body = '';
    if (x.kind === 'honor') { k.students = k.students && k.students.length ? k.students : [{}, {}, {}]; body = `<div class="field"><label>رسالة التكريم (اختياري)</label><textarea class="in" id="xm" rows="2" placeholder="مثال: نفخر بطلابنا المتميزين هذا الأسبوع">${esc(k.message || '')}</textarea></div><div class="field"><label>الطلاب المكرَّمون</label><div class="rows-editor" id="xr"></div><p class="small muted" style="margin:0">يمكنك لصق قائمة أسماء (سطر لكل طالب) في الخانة الأولى.</p></div>`; }
    if (x.kind === 'tasks') { k.rows = k.rows && k.rows.length ? k.rows : [{}, {}]; body = `<div class="field"><label>مقدمة (اختياري)</label><textarea class="in" id="xm" rows="2">${esc(k.intro || '')}</textarea></div><div class="field"><label>المهام</label><div class="rows-editor" id="xr"></div></div>`; }
    if (x.kind === 'announcement') { k.items = k.items && k.items.length ? k.items : [{}]; body = `<div class="field"><label>الإعلانات</label><div id="xa"></div></div>`; }
    if (x.kind === 'custom') body = `<div class="field"><label>النص</label><textarea class="in" id="xb" rows="8">${esc(k.body || '')}</textarea></div>`;
    const m = A.modal(`<h3>${x.id ? 'تعديل' : 'إضافة'} صفحة: ${KINDS[x.kind][0]}</h3>
      <div class="grid g3"><div class="field"><label>عنوان الصفحة</label><input class="in" id="xt" value="${esc(x.title || '')}"></div>
      <div class="field"><label>النطاق</label><select class="in" id="xs"><option value="one">${esc(c.name)} فقط</option><option value="all" ${x.class_id === null ? 'selected' : ''}>كل فصول القسم</option></select></div>
      <div class="field"><label>مكانها في الملف</label><select class="in" id="xpos"><option value="end">آخر الملف</option><option value="after_cover" ${x.position === 'after_cover' ? 'selected' : ''}>بعد الغلاف مباشرة</option></select></div></div>
      ${body}<div class="acts"><button class="btn sky" id="xprev">${I.eye} معاينة</button><button class="btn" id="xsave">حفظ</button></div>`, { cls: 'wide' });
    if (x.kind === 'honor') {
      rowsEditor(m.el.querySelector('#xr'), [['name', 'اسم الطالب', '1fr'], ['reason', 'سبب التكريم (اختياري)', '1.4fr']], k.students, 'طالب');
      m.el.querySelector('#xr').addEventListener('paste', e => { const t = (e.clipboardData || window.clipboardData).getData('text'); if (!t.includes('\n') || !e.target.matches('[data-k=name]')) return; e.preventDefault(); const names = t.split('\n').map(s => s.trim()).filter(Boolean); const i = +e.target.dataset.i; k.students.splice(i, 1, ...names.map(n => ({ name: n }))); rowsEditor(m.el.querySelector('#xr'), [['name', 'اسم الطالب', '1fr'], ['reason', 'سبب التكريم (اختياري)', '1.4fr']], k.students, 'طالب'); });
    }
    if (x.kind === 'tasks') rowsEditor(m.el.querySelector('#xr'), [['subject', 'المادة', '1fr'], ['task', 'المهمة الأدائية', '2fr'], ['due', 'موعد التسليم', '.8fr'], ['notes', 'ملاحظات', '1fr']], k.rows, 'مهمة');
    if (x.kind === 'announcement') {
      const box = m.el.querySelector('#xa');
      const draw = () => { box.innerHTML = k.items.map((it, i) => `<div class="sec-box"><div class="row" style="flex-wrap:nowrap"><input class="in" data-i="${i}" data-k="title" value="${esc(it.title || '')}" placeholder="عنوان الإعلان"><button class="btn bad sm" data-rm="${i}" type="button" aria-label="حذف الإعلان">×</button></div><textarea class="in" data-i="${i}" data-k="body" rows="3" style="margin-top:8px" placeholder="نص الإعلان">${esc(it.body || '')}</textarea></div>`).join('') + `<button class="btn ghost sm" type="button" id="xadd">${I.plus} إعلان</button>`;
        $$('[data-i]', box).forEach(inp => inp.oninput = () => k.items[+inp.dataset.i][inp.dataset.k] = inp.value);
        $$('[data-rm]', box).forEach(b => b.onclick = () => { k.items.splice(+b.dataset.rm, 1); draw(); });
        box.querySelector('#xadd').onclick = () => { k.items.push({}); draw(); }; };
      draw();
    }
    const collect = () => {
      if (x.kind === 'honor') { k.message = m.el.querySelector('#xm').value; k.students = k.students.filter(s => (s.name || '').trim()); }
      if (x.kind === 'tasks') { k.intro = m.el.querySelector('#xm').value; k.rows = k.rows.filter(r => (r.task || r.subject || '').trim()); }
      if (x.kind === 'announcement') k.items = k.items.filter(i => (i.title || i.body || '').trim());
      if (x.kind === 'custom') k.body = m.el.querySelector('#xb').value;
      return { week_id: A.week().id, kind: x.kind, title: m.el.querySelector('#xt').value.trim() || KINDS[x.kind][0], class_id: m.el.querySelector('#xs').value === 'all' ? null : c.id, position: m.el.querySelector('#xpos').value, content: k };
    };
    m.el.querySelector('#xsave').onclick = e => A.run(e.currentTarget, async () => {
      const r = collect(); if (x.id) await api.updateExtraPage(x.id, r); else await api.addExtraPage(r);
      m.close(); await reload(); A.toast('حُفظت الصفحة', 'ok');
    });
    m.el.querySelector('#xprev').onclick = async () => {
      const r = collect(); const keep = S.extraPages; S.extraPages = [...keep.filter(p => p.id !== x.id), { ...r, id: x.id || 'tmp' }];
      try { await V._preview(c); } finally { S.extraPages = keep; }
    };
  }

  // =====================================================================
  //  روابط انضمام المعلمين (داخل الإدارة ← المعلمون)
  // =====================================================================
  V._joinPanel = async function (box) {
    if (!(S.me.is_owner || A.perm('users'))) return;
    let codes = []; try { codes = await api.joinCodes(); } catch (e) { }
    const base = location.origin + location.pathname.replace(/[^/]*$/, '') + (A.DEMO ? '?demo=1&join=' : '?join=');
    const secs = S.sections.filter(s => S.me.is_owner || A.perm('users', s.id));
    box.innerHTML = `<div class="sec-box" style="border-color:var(--sky);background:#F4FBFE"><div class="head" style="margin-bottom:8px"><div class="grow"><h3 style="margin:0">روابط انضمام المعلمين</h3><p class="sub" style="margin:2px 0 0">أرسل الرابط لمعلمي القسم: كل معلم ينشئ حسابه بنفسه ثم يختار مواده وفصوله. أوقف الرابط بعد اكتمال التسجيل.</p></div></div>
      ${secs.map(s => { const list = codes.filter(c => c.section_id === s.id); return `<div style="margin-bottom:10px"><b>${esc(s.name)}</b>${list.map(c => `<div class="row" style="margin-top:6px;flex-wrap:nowrap"><input class="in" readonly dir="ltr" value="${esc(base + c.code)}" style="flex:1;${c.active ? '' : 'opacity:.5;text-decoration:line-through'}"><span class="pill ${c.active ? 'st-approved' : 'st-empty'}">${c.active ? 'فعّال' : 'موقوف'} · ${A.cnt(c.uses, 'تسجيل', 'تسجيلات')}</span>${c.role === 'supervisor' ? '<span class="pill st-submitted">مشرفون</span>' : ''}<button class="btn ghost sm" data-copy="${esc(base + c.code)}">نسخ</button><button class="btn ghost sm" data-msg="${esc(base + c.code)}" data-sec="${esc(s.name)}">نص الرسالة</button><button class="btn ${c.active ? 'bad' : 'ghost'} sm" data-tog="${c.code}" data-a="${c.active ? 0 : 1}">${c.active ? 'إيقاف' : 'تفعيل'}</button></div>`).join('')}
        <div class="row" style="margin-top:6px"><button class="btn ghost sm" data-new="${s.id}" data-role="teacher">${I.plus} رابط للمعلمين</button><button class="btn ghost sm" data-new="${s.id}" data-role="supervisor">${I.plus} رابط للمشرفين</button></div></div>`; }).join('')}</div>`;
    $$('[data-copy]', box).forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.copy); A.toast('نُسخ الرابط', 'ok'); } catch (e) { b.previousElementSibling.previousElementSibling.select(); } });
    $$('[data-msg]', box).forEach(b => b.onclick = () => teacherMessage(b.dataset.msg, b.dataset.sec));
    $$('[data-tog]', box).forEach(b => b.onclick = () => A.run(b, async () => { await api.updateJoinCode(b.dataset.tog, { active: b.dataset.a === '1' }); V._joinPanel(box); }));
    $$('[data-new]', box).forEach(b => b.onclick = () => A.run(b, async () => { await api.createJoinCode(b.dataset.new, b.dataset.role); V._joinPanel(box); }));
  };
  function teacherMessage(link, sec) {
    const w = A.week();
    const txt = `السلام عليكم ورحمة الله وبركاته
الزملاء الكرام في ${sec}

يسعدنا إطلاق «منصة دينا» لكتابة الخطة الأسبوعية بدلاً من ملف الشيت.

١) افتح الرابط وأنشئ حسابك (الاسم، البريد، كلمة مرور):
${link}

٢) اختر موادك وفصولك من الشاشة الأولى.
٣) من «خطتي» اكتب الموضوع والواجب لكل حصة — الحفظ تلقائي.
٤) اضغط «إرسال للمراجعة» عند الانتهاء${w && w.deadline ? ' قبل ' + A.fmtDT(w.deadline) : ''}.

للدخول لاحقاً: ${location.origin + location.pathname.replace(/[^/]*$/, '')}

شاكرين تعاونكم
${S.me.full_name}`;
    const m = A.modal(`<h3>رسالة المعلمين (واتساب أو بريد)</h3><textarea class="in" rows="16" id="tm">${esc(txt)}</textarea>
      <div class="acts"><a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">فتح في واتساب</a><button class="btn" id="tc">نسخ الرسالة</button></div>`, { cls: 'wide' });
    m.el.querySelector('#tc').onclick = async () => { try { await navigator.clipboard.writeText(m.el.querySelector('#tm').value); A.toast('نُسخت الرسالة', 'ok'); } catch (e) { m.el.querySelector('#tm').select(); } };
  }
})();
