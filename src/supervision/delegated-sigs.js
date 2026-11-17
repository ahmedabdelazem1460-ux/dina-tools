/* منصة دينا — التواقيع المفوّضة (للمالك وحده)
   يحفظ المالك صور تواقيع يوقّع بها نيابةً من حسابه (افتراضياً: مدير المدرسة) في owner_vault (المفتاح dsigs) — لا يقرؤها غيره.
   - في أي نموذج (form_tasks: النماذج والاستمارات والزيارات): عند «✍ توقيع» يختار المالك «توقيعي» أو توقيعاً مفوّضاً، ويُقترح تلقائياً
     التوقيع المطابق لاسم الخانة (مثل «مدير المدرسة»).
   - زر «✍ توقيع مدير المدرسة» داخل النموذج يملأ كل خاناته الفارغة دفعة واحدة.
   - «التوقيع الجماعي» في صفحة النماذج: كل النماذج التي تنتظر خانة المدير، بتحديدها وتوقيعها مرة واحدة.
   - نموذج تأمين الحصص يأخذ منها الصورة («من التواقيع المفوّضة»).
   يُحفظ في التوقيع اسم صاحبه، ويبقى المالك هو المنفّذ (staff_id) فيُعرف من وضعه. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  const own = () => !!(S.me && S.me.is_owner && !S.realMe);
  const KEY = 'dsigs';
  const DEF = () => [{ id: 'pr', title: 'مدير المدرسة', name: 'إبراهيم حسن الفيفي', img: '', keys: 'مدير المدرسة، قائد المدرسة' }];
  let LIB = null, LIBUSER = null;
  async function load(force) {
    if (!own()) return [];
    if (LIB && !force && LIBUSER === S.me.id) return LIB;
    let row = null; try { row = (await api.list('owner_vault', { key: KEY }))[0]; } catch (_) { }
    LIB = row && row.data && Array.isArray(row.data.list) ? row.data.list : DEF(); LIBUSER = S.me.id;
    // أول مرة: إن رُسم توقيع المدير في نموذج التأمين نأخذه
    if (!row) { try { const sb = (await api.list('owner_vault', { key: 'sbsig:pr' }))[0]; if (sb && sb.data && sb.data.img) LIB[0].img = sb.data.img; } catch (_) { } }
    return LIB;
  }
  const save = async list => { await api.ups('owner_vault', [{ school_id: S.school.id, key: KEY, data: { list }, updated_at: new Date().toISOString() }], 'school_id,key'); LIB = list; };
  const kw = e => String(e.keys || e.title || '').split(/[،,]/).map(s => A.normKey(s.trim())).filter(Boolean);
  const matchOf = (label, list) => { const l = A.normKey(label || ''); return (list || LIB || []).find(e => e.img && kw(e).some(k => l.includes(k))); };

  // ---------- اختيار التوقيع عند الضغط على «✍ توقيع» ----------
  // يعيد null (إلغاء) أو {mine:true} أو {img, name}
  async function choose(label) {
    const list = await load(); const ready = list.filter(e => e.img); const hit = matchOf(label, list);
    const want = list.find(e => kw(e).some(k => A.normKey(label || '').includes(k)));
    if (!ready.length && !want) return { mine: true };
    return new Promise(res => {
      let done = false;
      const opt = (v, t, s, img, on) => `<label class="ds-o ${on ? 'on' : ''}"><input type="radio" name="dsP" value="${v}" ${on ? 'checked' : ''}><span class="ds-t"><b>${esc(t)}</b><small>${esc(s)}</small></span>${img ? `<img src="${img}" alt="">` : ''}</label>`;
      const m = A.modal(`<h3>التوقيع في خانة «${esc(label || '')}»</h3>
        <div class="ds-l" role="radiogroup" aria-label="التوقيع">${opt('me', 'توقيعي', S.me.full_name, '', !hit)}${ready.map(e => opt(e.id, e.title, e.name + ' — نيابةً من حسابك', e.img, hit && hit.id === e.id)).join('')}</div>
        ${want && !want.img ? `<div class="notice warn" style="display:block;margin-top:8px">لم تُضف صورة توقيع «${esc(want.title)}» بعد. <button class="linkbtn" id="dsMg">أضفها الآن</button></div>` : ''}
        <div class="acts"><button class="btn" id="dsOk">توقيع</button><button class="btn ghost" id="dsMg2">إدارة التواقيع المفوّضة</button></div>`);
      $$('.ds-o input', m.el).forEach(r => r.onchange = () => $$('.ds-o', m.el).forEach(x => x.classList.toggle('on', x.contains(r) && r.checked)));
      const mg = () => { done = true; m.close(); manage(() => res(null)); };
      const b1 = $('#dsMg', m.el); if (b1) b1.onclick = mg; $('#dsMg2', m.el).onclick = mg;
      $('#dsOk', m.el).onclick = () => { const v = ($('input[name=dsP]:checked', m.el) || {}).value; done = true; m.close(); if (v === 'me' || !v) return res({ mine: true }); const e = list.find(x => x.id === v); res({ img: e.img, name: e.name, title: e.title }); };
      const o = new MutationObserver(() => { if (!document.body.contains(m.el)) { o.disconnect(); if (!done) res(null); } }); o.observe(document.body, { childList: true, subtree: true });
    });
  }

  // ---------- داخل النموذج: توقيع كل الخانات المطابقة لتوقيع مفوّض ----------
  const slotsFree = (t, e) => (A.formsSlots ? A.formsSlots(t.tpl || {}) : []).filter(s => !(t.sigs || {})[s.key] && kw(e).some(k => A.normKey(s.label || '').includes(k)) && !(t.cosign || []).some(c => c.key === s.key && c.status !== 'signed'));
  function quickBtns(t) { if (!own() || !LIB || t.status === 'approved' || t.id === 'preview') return ''; return LIB.filter(e => e.img && slotsFree(t, e).length).map(e => `<button class="btn ghost sm ds-qb" data-a="dsig:${e.id}" title="يوقّع في خانات «${esc(e.title)}» الفارغة نيابةً من حسابك">✍ توقيع ${esc(e.title)}</button>`).join(''); }
  async function fill(t, id, rpc) { const e = (LIB || []).find(x => x.id === id); if (!e) return 0; let n = 0;
    for (const s of slotsFree(t, e)) { const r = await rpc('form_sign', { p_id: t.id, p_key: s.key, p_label: s.label, p_img: e.img, p_name: e.name, p_remove: false }); Object.assign(t, r || {}); n++; }
    return n; }

  // ---------- التوقيع الجماعي على النماذج المنتظرة ----------
  async function bulk(rpc, after) {
    const list = await load(); const ready = list.filter(e => e.img);
    if (!ready.length) return manage(() => bulk(rpc, after));
    const tasks = await api.list('form_tasks', { school_id: S.school.id }, { select: 'id,title,status,assignee,created_by,sigs,tpl,cosign,mode,visit,created_at', order: 'created_at', desc: true });
    const ST = { assigned: 'لم يبدأ', draft: 'قيد التعبئة', returned: 'مُعاد', submitted: 'بانتظار الاعتماد' };
    let ent = ready[0];
    const m = A.modal(`<h3>التوقيع الجماعي نيابةً من حسابك</h3><div class="row" style="gap:8px;flex-wrap:wrap;align-items:end"><div class="field" style="margin:0"><label for="dbE">التوقيع</label><select class="in" id="dbE">${ready.map(e => `<option value="${e.id}">${esc(e.title)} — ${esc(e.name)}</option>`).join('')}</select></div><label class="chk"><input type="checkbox" id="dbAll"> إظهار غير المكتملة أيضاً</label></div><div id="dbL" style="margin-top:10px"></div>`, { cls: 'wide' });
    const draw = () => {
      const all = $('#dbAll', m.el).checked;
      const L = tasks.filter(t => t.status !== 'approved' && (all || t.status === 'submitted') && slotsFree(t, ent).length);
      $('#dbL', m.el).innerHTML = L.length ? `<div class="row" style="gap:8px;margin-bottom:6px"><label class="chk"><input type="checkbox" id="dbCk" checked> تحديد الكل (${AR(L.length)})</label></div>
        <div class="scroll" style="max-height:50vh"><table class="tbl"><thead><tr><th></th><th>النموذج</th><th>المعلم</th><th>الحالة</th><th>الخانة</th></tr></thead><tbody>${L.map(t => `<tr><td><input type="checkbox" data-t="${t.id}" checked aria-label="${esc(t.title)}"></td><td><b>${esc(t.title)}</b></td><td class="small">${esc(A.personName(t.assignee) || '')}</td><td><span class="pill ${t.status === 'submitted' ? 'st-submitted' : 'st-empty'}">${ST[t.status] || t.status}</span></td><td class="small">${slotsFree(t, ent).map(s => esc(s.label)).join('، ')}</td></tr>`).join('')}</tbody></table></div>
        <div class="acts"><button class="btn" id="dbGo">✍ توقيع المحدد</button></div>` : `<p class="small muted">لا نماذج تنتظر توقيع «${esc(ent.title)}»${all ? '' : ' من المرسلة للاعتماد — فعّل «إظهار غير المكتملة» لرؤية البقية'}.</p>`;
      const ck = $('#dbCk', m.el); if (ck) ck.onchange = () => $$('[data-t]', m.el).forEach(c => c.checked = ck.checked);
      const go = $('#dbGo', m.el); if (go) go.onclick = ev => A.run(ev.currentTarget, async () => { const ids = $$('[data-t]:checked', m.el).map(c => c.dataset.t); if (!ids.length) throw new Error('حدد نموذجاً واحداً على الأقل');
        let n = 0, f = 0; for (const id of ids) { const t = tasks.find(x => x.id === id); try { n += await fill(t, ent.id, rpc); } catch (_) { f++; } }
        A.toast(`وُقّع ${AR(n)} خانة في ${AR(ids.length - f)} نموذج${f ? ` · تعذّر ${AR(f)}` : ''}`, f ? 'warn' : 'ok'); m.close(); after && after(); });
    };
    $('#dbE', m.el).onchange = e => { ent = ready.find(x => x.id === e.target.value); draw(); }; $('#dbAll', m.el).onchange = draw; draw();
  }

  // ---------- إدارة التواقيع المفوّضة ----------
  async function manage(done) {
    const list = JSON.parse(JSON.stringify(await load(true)));
    const m = A.modal(`<h3>التواقيع المفوّضة</h3><p class="sub">تواقيع توقّع بها نيابةً من حسابك في النماذج التي تحتاجها. محفوظة لك وحدك. «تُقترح تلقائياً في الخانات» = كلمات من اسم الخانة، مفصولة بفاصلة.</p><div id="dmL"></div><button class="btn ghost sm" id="dmAdd">+ إضافة توقيع</button><div class="acts"><button class="btn" id="dmOk">حفظ</button></div>`, { cls: 'wide' });
    const L = $('#dmL', m.el);
    const draw = () => { L.innerHTML = list.map((e, i) => `<div class="ds-c" data-i="${i}"><div class="grid g3"><div class="field"><label>الصفة</label><input class="in" data-k="title" value="${esc(e.title)}"></div><div class="field"><label>الاسم</label><input class="in" data-k="name" value="${esc(e.name)}"></div><div class="field"><label>تُقترح تلقائياً في الخانات</label><input class="in" data-k="keys" value="${esc(e.keys || '')}"></div></div>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">${e.img ? `<img src="${e.img}" alt="توقيع ${esc(e.title)}" class="ds-im">` : '<span class="small" style="color:#B7791F">لا صورة بعد</span>'}<button class="btn ghost sm" data-dr="${i}">✍️ رسم</button><label class="btn ghost sm" style="cursor:pointer">رفع صورة<input type="file" accept="image/*" data-up="${i}" hidden></label>${e.img ? `<button class="btn ghost sm" data-cl="${i}">إزالة الصورة</button>` : ''}<button class="btn ghost sm" data-rm="${i}" style="margin-inline-start:auto">حذف</button></div></div>`).join('') || '<p class="small muted">لا تواقيع</p>';
      $$('[data-k]', L).forEach(el => el.oninput = () => { list[+el.closest('[data-i]').dataset.i][el.dataset.k] = el.value; });
      $$('[data-rm]', L).forEach(b => b.onclick = () => { list.splice(+b.dataset.rm, 1); draw(); });
      $$('[data-cl]', L).forEach(b => b.onclick = () => { list[+b.dataset.cl].img = ''; draw(); });
      $$('[data-dr]', L).forEach(b => b.onclick = () => pad(img => { list[+b.dataset.dr].img = img; draw(); }));
      $$('[data-up]', L).forEach(inp => inp.onchange = () => { const f = inp.files[0]; if (f) shrink(f).then(img => { list[+inp.dataset.up].img = img; draw(); }).catch(er => A.toast(er.message, 'err')); }); };
    draw();
    $('#dmAdd', m.el).onclick = () => { list.push({ id: 'd' + Date.now().toString(36), title: '', name: '', img: '', keys: '' }); draw(); };
    $('#dmOk', m.el).onclick = ev => A.run(ev.currentTarget, async () => { const out = list.filter(e => (e.title || e.name).trim()).map(e => ({ id: e.id, title: e.title.trim(), name: e.name.trim(), img: e.img || '', keys: (e.keys || e.title).trim() })); await save(out); m.close(); A.toast('حُفظت التواقيع المفوّضة ✓', 'ok'); done && done(); });
  }
  const shrink = file => new Promise((res, rej) => { if (file.size > 4e6) return rej(new Error('الصورة أكبر من ٤ م.ب')); const r = new FileReader(); r.onload = () => { const im = new Image(); im.onload = () => { const s = Math.min(1, 500 / im.width, 200 / im.height), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/png')); }; im.onerror = () => rej(new Error('تعذّر قراءة الصورة')); im.src = r.result; }; r.readAsDataURL(file); });
  function pad(done) {
    const m = A.modal(`<h3>رسم التوقيع</h3><div class="sg-wrap"><canvas id="dpC2" width="900" height="300" aria-label="مساحة رسم التوقيع"></canvas><span class="sg-line" aria-hidden="true"></span></div><div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="dpS2">اعتماد</button><button class="btn ghost" id="dpX2">مسح</button></div>`);
    const c = $('#dpC2', m.el), g = c.getContext('2d'); let last = null, drawn = false; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#082B5A';
    const pt = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
    c.addEventListener('pointerdown', e => { c.setPointerCapture(e.pointerId); last = pt(e); drawn = true; });
    c.addEventListener('pointermove', e => { if (!last) return; const p = pt(e); g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke(); last = p; });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(k => c.addEventListener(k, () => last = null));
    $('#dpX2', m.el).onclick = () => { g.clearRect(0, 0, c.width, c.height); drawn = false; };
    $('#dpS2', m.el).onclick = () => { if (!drawn) return A.toast('ارسم التوقيع أولاً', 'err');
      const d = g.getImageData(0, 0, c.width, c.height).data; let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
      for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) if (d[(y * c.width + x) * 4 + 3] > 10) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
      const p2 = 12, w = Math.max(20, x1 - x0 + p2 * 2), h = Math.max(20, y1 - y0 + p2 * 2), o = document.createElement('canvas'); o.width = w; o.height = h; o.getContext('2d').drawImage(c, x0 - p2, y0 - p2, w, h, 0, 0, w, h);
      m.close(); done(o.toDataURL('image/png')); };
  }

  A.dsig = { on: own, load, choose, quickBtns, fill, bulk, manage, matchOf, list: () => LIB || [] };

  if (!document.getElementById('ds-css')) { const s = document.createElement('style'); s.id = 'ds-css';
    s.textContent = `.ds-l{display:grid;gap:8px}.ds-o{display:flex;align-items:center;gap:10px;border:1.5px solid #DCE7F3;border-radius:14px;padding:10px 12px;cursor:pointer;background:#fff}.ds-o.on{border-color:#005499;background:#F2F7FC}.ds-o input{accent-color:#005499}.ds-o:focus-within{outline:3px solid #3AB1DB;outline-offset:1px}
      .ds-t{flex:1;display:flex;flex-direction:column}.ds-t small{color:#5B7090}.ds-o img,.ds-im{height:40px;max-width:min(150px,28vw);border:1px solid #E4EBF5;border-radius:8px;background:#fff}
      .ds-c{border:1px solid #E4EBF5;border-radius:12px;padding:10px;margin-bottom:8px}.linkbtn{background:none;border:0;padding:0;color:#005499;text-decoration:underline;cursor:pointer;font:inherit}`;
    document.head.appendChild(s); }
})();
