/* منصة دينا — إعلانات أولياء الأمور: إعلانات وتذكيرات ونصائح واحتفالات ومناسبات بصور وتصاميم */
(function () {
  const A = window.APP, V = window.VIEWS;
  const { api, S, $, $$, esc, AR, I } = A;
  const KINDS = {
    announcement: { n: 'إعلان', c: '#082B5A', bg: '#E4EBF5' },
    reminder: { n: 'تذكير', c: '#8A5A12', bg: '#FFF4DC' },
    tip: { n: 'نصيحة', c: '#23704A', bg: '#E5F4EA' },
    celebration: { n: 'احتفال', c: '#6B4FA3', bg: '#EEEBF6' },
    event: { n: 'مناسبة', c: '#005499', bg: '#E1F3FA' },
  };
  A.POST_KINDS = KINDS;
  const css = document.createElement('style');
  css.textContent = `.pp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
  .pp{background:var(--card);border:1px solid var(--border);border-radius:16px;overflow:hidden;box-shadow:var(--sh1);display:flex;flex-direction:column}
  .pp.off{opacity:.55}.pp img{width:100%;max-height:220px;object-fit:cover;display:block;background:var(--pale)}
  .pp .bd{padding:12px 14px;flex:1}.pp h4{margin:6px 0 4px;font-size:16px}.pp p{margin:0;white-space:pre-line;color:var(--ink);font-size:14px}
  .pp .kb{display:inline-block;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:800}
  .pp .ft{display:flex;gap:6px;flex-wrap:wrap;padding:10px 14px;border-top:1px solid var(--border);align-items:center}
  .pp .meta{font-size:12px;color:var(--muted);margin-top:8px}
  .kpick{display:flex;flex-wrap:wrap;gap:6px}.kpick button{border:2px solid var(--border);background:var(--card);border-radius:999px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer;min-height:44px}
  .kpick button.on{border-color:currentColor}
  .imgdrop{border:2px dashed var(--line);border-radius:14px;padding:14px;text-align:center;cursor:pointer;background:var(--pale)}
  .imgdrop img{max-width:100%;max-height:200px;border-radius:10px;display:block;margin:0 auto 8px}`;
  document.head.appendChild(css);
  const canEdit = () => S.me.is_owner || A.anyPerm('users', 'structure');
  const today = () => A.isoDate(new Date());
  const status = p => !p.active ? ['متوقف', 'st-empty'] : (p.ends_on && p.ends_on < today()) ? ['منتهٍ', 'st-empty'] : p.starts_on > today() ? ['مجدول', 'st-submitted'] : ['ظاهر الآن', 'st-approved'];
  const audience = p => { if (p.class_ids && p.class_ids.length) return p.class_ids.map(id => (A.cls(id) || {}).name || '').filter(Boolean).join('، ') || A.cnt(p.class_ids.length, 'فصل', 'فصول'); if (p.section_id) return (S.sections.find(s => s.id === p.section_id) || {}).name || 'قسم'; return 'كل المدرسة'; };

  V.posts = async function (root) {
    if (!canEdit()) { root.innerHTML = ''; return; }
    root.innerHTML = '<div class="spinner"></div>';
    let list = []; try { list = await api.posts(); } catch (e) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر التحميل', esc(e.message))}</div>`; return; }
    const f = A.LS.get('ppf') || 'now';
    const shown = list.filter(p => f === 'all' || (f === 'now' ? status(p)[0] === 'ظاهر الآن' : f === 'sch' ? status(p)[0] === 'مجدول' : ['منتهٍ', 'متوقف'].includes(status(p)[0])));
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>إعلانات أولياء الأمور</h2><p class="sub" style="margin:2px 0 0">تظهر في صفحة أولياء الأمور أعلى خطة الأبناء: إعلانات، تذكيرات، نصائح، احتفالات ومناسبات — بنص أو صورة أو تصميم جاهز، لكل المدرسة أو قسم أو فصول محددة، ولمدة تحددها.</p></div>
      ${S.me.is_owner ? '<button class="btn ghost" id="ppZ" title="ضغط الصور وتوفير استهلاك التخزين">⚡ تحسين الصور</button> ' : ''}<button class="btn" id="ppN">${I.plus} إعلان جديد</button></div>
      <div class="tabs" id="ppF">${[['now', 'ظاهرة الآن'], ['sch', 'مجدولة'], ['old', 'منتهية ومتوقفة'], ['all', 'الكل']].map(([k, l]) => `<button data-f="${k}" class="${f === k ? 'on' : ''}">${l}</button>`).join('')}</div>
      <div class="pp-grid">${shown.map(card).join('') || `<div style="grid-column:1/-1">${A.emptyBox('لا توجد إعلانات هنا', 'أضف أول إعلان لأولياء الأمور من «إعلان جديد».')}</div>`}</div></div>`;
    $$('#ppF button', root).forEach(b => b.onclick = () => { A.LS.set('ppf', b.dataset.f); V.posts(root); });
    $('#ppN', root).onclick = () => editor(null, () => V.posts(root));
    const z = $('#ppZ', root); if (z) z.onclick = () => mediaDialog(list, () => V.posts(root));
    $$('[data-pe]', root).forEach(b => b.onclick = () => editor(list.find(p => p.id === b.dataset.pe), () => V.posts(root)));
    $$('[data-pc]', root).forEach(b => b.onclick = () => { const p = list.find(x => x.id === b.dataset.pc); editor({ ...p, id: null, title: p.title + ' (نسخة)', starts_on: today(), ends_on: null }, () => V.posts(root)); });
    $$('[data-pt]', root).forEach(b => b.onclick = () => A.run(b, async () => { const p = list.find(x => x.id === b.dataset.pt); await api.updatePost(p.id, { active: !p.active }); V.posts(root); }));
    $$('[data-pp]', root).forEach(b => b.onclick = () => A.run(b, async () => { const p = list.find(x => x.id === b.dataset.pp); await api.updatePost(p.id, { pinned: !p.pinned }); V.posts(root); }));
    $$('[data-pd]', root).forEach(b => b.onclick = () => A.run(b, async () => { if (!(await A.confirmBox('حذف هذا الإعلان نهائياً؟', 'حذف', true))) return; await api.deletePost(b.dataset.pd); V.posts(root); A.toast('حُذف الإعلان', 'ok'); }));
  };
  // ---- تحسين الصور (للمالك): ضغط صور الإعلانات المرفوعة سابقاً + إعدادات الضغط عند الرفع
  const isBig = u => /\/storage\/v1\/object\/public\/plan-assets\/[^?]+\.(png|jpe?g|bmp)$/i.test(u || '');
  async function shrinkPosts(list) {
    let done = 0, saved = 0;
    for (const p of list.filter(x => isBig(x.image_url))) {
      const r = await fetch(p.image_url); if (!r.ok) continue;
      const b = await r.blob(); const f0 = new File([b], p.image_url.split('/').pop(), { type: b.type || 'image/png' });
      const f1 = await window.DinaShrink(f0, { min: 1 }); if (f1 === f0) continue;
      const url = await api.uploadAsset(f1, { keep: true });
      await api.updatePost(p.id, { image_url: url }); p.image_url = url; done++; saved += f0.size - f1.size;
    }
    return { done, saved };
  }
  A.shrinkPosts = shrinkPosts;
  function mediaDialog(list, after) {
    const st = S.school.settings || {}, m = st.media || {};
    const big = list.filter(p => isBig(p.image_url)).length;
    const md = A.modal(`<h3>⚡ تحسين الصور</h3>
      <p class="small muted">الصور الكبيرة تُحمَّل في كل زيارة لولي الأمر وتستهلك حصة التخزين. عند التفعيل تُصغَّر كل صورة تُرفع في المنصة وتُحوَّل إلى WebP قبل رفعها (تبقى واضحة للعرض والطباعة).</p>
      <label class="chk"><input type="checkbox" id="mzOn" ${m.on !== false ? 'checked' : ''}> ضغط الصور تلقائياً عند الرفع</label>
      <div class="grid g2"><div class="field"><label for="mzMax">أقصى عرض/ارتفاع (بكسل)</label><select class="in" id="mzMax">${[1024, 1280, 1600, 2048, 2560].map(v => `<option value="${v}" ${(+m.max || 1600) === v ? 'selected' : ''}>${AR(v)}</option>`).join('')}</select></div>
      <div class="field"><label for="mzQ">الجودة</label><select class="in" id="mzQ">${[[0.7, 'اقتصادية'], [0.82, 'متوازنة (موصى بها)'], [0.9, 'عالية']].map(([v, l]) => `<option value="${v}" ${(+m.q || 0.82) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
      <div class="acts"><button class="btn" id="mzSave">حفظ الإعدادات</button>
      <button class="btn ghost" id="mzRun" ${big ? '' : 'disabled'}>ضغط صور الإعلانات الحالية (${AR(big)})</button></div>`);
    const read = () => ({ on: md.el.querySelector('#mzOn').checked, max: +md.el.querySelector('#mzMax').value, q: +md.el.querySelector('#mzQ').value });
    const save = async () => { const ns = { ...(S.school.settings || {}), media: read() }; const r = await api.updateSchool(S.school.id, { settings: ns }); S.school.settings = (r && r.settings) || ns; };
    md.el.querySelector('#mzSave').onclick = e => A.run(e.currentTarget, async () => { await save(); A.toast('حُفظت إعدادات الصور', 'ok'); });
    md.el.querySelector('#mzRun').onclick = e => A.run(e.currentTarget, async () => {
      await save(); const r = await shrinkPosts(list);
      md.close(); after && after(); A.toast(r.done ? `ضُغطت ${AR(r.done)} صورة — وُفّر ${AR(Math.round(r.saved / 1024))} ك.ب في كل زيارة` : 'لا توجد صور تحتاج ضغطاً', 'ok');
    });
  }
  // مرة واحدة لكل جهاز للمالك: ضغط صور الإعلانات الكبيرة القائمة تلقائياً
  (function autoOnce(n) {
    if (n > 40) return; const ok = S && S.me && S.school;
    if (!ok) return setTimeout(() => autoOnce(n + 1), 3000);
    if (!S.me.is_owner || api.demo || A.LS.get('media_fix1')) return;
    api.posts().then(l => shrinkPosts(l)).then(r => { A.LS.set('media_fix1', 1); if (r.done) A.toast(`⚡ ضُغطت ${AR(r.done)} من صور إعلانات أولياء الأمور لتوفير استهلاك التخزين`, 'ok'); }).catch(() => { });
  })(0);
  function card(p) {
    const k = KINDS[p.kind] || KINDS.announcement; const [stl, stc] = status(p);
    return `<div class="pp ${p.active ? '' : 'off'}">${p.image_url ? `<img src="${esc(p.image_url)}" alt="${esc(p.title)}" loading="lazy">` : ''}
      <div class="bd"><span class="kb" style="color:${k.c};background:${k.bg}">${k.n}</span> <span class="pill ${stc}">${stl}</span>${p.pinned ? ' <span class="pill st-submitted">مثبّت</span>' : ''}
        <h4>${esc(p.title)}</h4>${p.body ? `<p>${esc(p.body)}</p>` : ''}
        <div class="meta">${esc(audience(p))} · من ${A.AR(p.starts_on)}${p.ends_on ? ' إلى ' + A.AR(p.ends_on) : ' (دون نهاية)'}</div></div>
      <div class="ft"><button class="btn ghost sm" data-pe="${p.id}">تعديل</button><button class="btn ghost sm" data-pc="${p.id}">نسخ</button><button class="btn ghost sm" data-pp="${p.id}">${p.pinned ? 'إلغاء التثبيت' : 'تثبيت أولاً'}</button><button class="btn ghost sm" data-pt="${p.id}">${p.active ? 'إيقاف' : 'تفعيل'}</button><button class="btn bad sm" data-pd="${p.id}">حذف</button></div></div>`;
  }
  function editor(p, done) {
    const isNew = !p || !p.id; p = { kind: 'announcement', title: '', body: '', image_url: null, link_url: '', section_id: null, class_ids: null, starts_on: today(), ends_on: null, pinned: false, active: true, ...(p || {}) };
    const aud = p.class_ids && p.class_ids.length ? 'classes' : p.section_id ? 'section' : 'all';
    const m = A.modal(`<h3>${isNew ? 'إعلان جديد لأولياء الأمور' : 'تعديل الإعلان'}</h3>
      <div class="field"><label>النوع</label><div class="kpick" id="pk">${Object.entries(KINDS).map(([k, v]) => `<button type="button" data-k="${k}" class="${p.kind === k ? 'on' : ''}" style="color:${v.c}">${v.n}</button>`).join('')}</div></div>
      <div class="field"><label for="pT">العنوان</label><input class="in" id="pT" maxlength="120" value="${esc(p.title)}" placeholder="مثال: احتفال اليوم الوطني"></div>
      <div class="field"><label for="pB">النص (اختياري)</label><textarea class="in" id="pB" rows="4" placeholder="تفاصيل الإعلان">${esc(p.body)}</textarea></div>
      <div class="field"><label>صورة أو تصميم (اختياري)</label><label class="imgdrop" id="pI">${p.image_url ? `<img src="${esc(p.image_url)}" alt="">` : ''}<span class="small muted">${p.image_url ? 'اضغط لتغيير الصورة' : 'اضغط لرفع صورة أو تصميم جاهز (PNG / JPG حتى ٣ ميجابايت)'}</span><input type="file" accept="image/*" id="pF" hidden></label>
        ${p.image_url ? '<button type="button" class="btn ghost sm" id="pIx" style="margin-top:6px">إزالة الصورة</button>' : ''}</div>
      <div class="field"><label for="pL">رابط إضافي (اختياري)</label><input class="in" id="pL" dir="ltr" value="${esc(p.link_url || '')}" placeholder="https://"></div>
      <div class="field"><label>يظهر لـ</label><div class="kpick" id="pa">${[['all', 'كل المدرسة'], ['section', 'قسم'], ['classes', 'فصول محددة']].map(([k, l]) => `<button type="button" data-a="${k}" class="${aud === k ? 'on' : ''}" style="color:var(--navy)">${l}</button>`).join('')}</div>
        <div id="paS" style="margin-top:8px" class="${aud === 'section' ? '' : 'hidden'}"><select class="in" id="pS">${S.sections.map(s => `<option value="${s.id}" ${p.section_id === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
        <div id="paC" style="margin-top:8px" class="${aud === 'classes' ? '' : 'hidden'}"><div class="small muted" style="margin-bottom:4px">فصول ${esc(A.section().name)}</div><div class="perm-grid">${S.classes.filter(c => c.active).map(c => `<label class="chk"><input type="checkbox" value="${c.id}" ${(p.class_ids || []).includes(c.id) ? 'checked' : ''}> ${esc(c.name)}</label>`).join('')}</div></div></div>
      <div class="grid g2"><div class="field"><label for="pD1">يظهر من</label><input class="in" type="date" id="pD1" value="${p.starts_on || today()}"></div><div class="field"><label for="pD2">إلى (اختياري)</label><input class="in" type="date" id="pD2" value="${p.ends_on || ''}"></div></div>
      <label class="chk"><input type="checkbox" id="pP" ${p.pinned ? 'checked' : ''}> تثبيت في أعلى الصفحة</label>
      <div class="acts"><button class="btn" id="pGo">${isNew ? 'نشر الإعلان' : 'حفظ'}</button></div>`, { cls: 'wide' });
    let kind = p.kind, au = aud, img = p.image_url;
    $$('#pk button', m.el).forEach(b => b.onclick = () => { kind = b.dataset.k; $$('#pk button', m.el).forEach(x => x.classList.toggle('on', x === b)); });
    $$('#pa button', m.el).forEach(b => b.onclick = () => { au = b.dataset.a; $$('#pa button', m.el).forEach(x => x.classList.toggle('on', x === b)); m.el.querySelector('#paS').classList.toggle('hidden', au !== 'section'); m.el.querySelector('#paC').classList.toggle('hidden', au !== 'classes'); });
    m.el.querySelector('#pF').onchange = e => A.run(null, async () => { const f = e.target.files[0]; if (!f) return; if (f.size > 15e6) throw new Error('الصورة أكبر من ١٥ ميجابايت'); m.el.querySelector('#pI span').textContent = 'جارٍ الرفع…'; img = await api.uploadAsset(f); const box = m.el.querySelector('#pI'); let im = box.querySelector('img'); if (!im) { im = document.createElement('img'); box.prepend(im); } im.src = img; m.el.querySelector('#pI span').textContent = 'اضغط لتغيير الصورة'; });
    const ix = m.el.querySelector('#pIx'); if (ix) ix.onclick = () => { img = null; const im = m.el.querySelector('#pI img'); if (im) im.remove(); ix.remove(); };
    m.el.querySelector('#pGo').onclick = e => A.run(e.currentTarget, async () => {
      const title = m.el.querySelector('#pT').value.trim(); if (!title) throw new Error('اكتب عنوان الإعلان');
      const link = m.el.querySelector('#pL').value.trim(); if (link && !/^https?:\/\//.test(link)) throw new Error('الرابط يجب أن يبدأ بـ https://');
      const d1 = m.el.querySelector('#pD1').value || today(), d2 = m.el.querySelector('#pD2').value || null; if (d2 && d2 < d1) throw new Error('تاريخ النهاية قبل البداية');
      const cids = $$('#paC input:checked', m.el).map(i => i.value); if (au === 'classes' && !cids.length) throw new Error('اختر فصلاً واحداً على الأقل');
      if (!S.me.is_owner && au === 'all') throw new Error('اختر قسماً أو فصولاً للإعلان');
      const rec = { kind, title, body: m.el.querySelector('#pB').value.trim(), image_url: img, link_url: link || null, starts_on: d1, ends_on: d2, pinned: m.el.querySelector('#pP').checked,
        section_id: au === 'section' ? m.el.querySelector('#pS').value : au === 'classes' ? S.sectionId : null, class_ids: au === 'classes' ? cids : null };
      if (isNew) await api.addPost(rec); else await api.updatePost(p.id, rec);
      m.close(); done(); A.toast(isNew ? 'نُشر الإعلان لأولياء الأمور' : 'حُفظ الإعلان', 'ok');
    });
  }
})();
