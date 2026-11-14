/* منصة دينا — «نماذجي»: أي مستخدم يُنشئ نماذج عمله (من الصفر، أو بلصق نص، أو من ملف Word/PDF/صورة)
   فتتحول تلقائياً لورقة احترافية بهوية المدرسة (نفس محرك «خطة ونماذج الإشراف»)، ويعبّئها ويحفظها ويرتبها
   في مجلدات ويطبعها، ويشاركها مع زملائه إن شاء. sql/097 */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  const FRAME = 'tools/supervision.html?formEmbed=1&v=' + (window.DINA_V || '');
  const uid = p => (p || 'x') + Math.random().toString(36).slice(2, 8);
  A.I.myforms = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="13" height="17" rx="2"/><path d="M8 8h5M8 12h5M8 16h3"/><path d="M17 8l3 3-6 6h-3v-3z"/></svg>';
  if (A.NAV && !A.NAV.some(n => n[0] === 'myforms')) { const i = A.NAV.findIndex(n => n[0] === 'forms'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['myforms', 'نماذجي', () => !!S.me && A.tfeat('myforms')]); }

  if (!document.getElementById('mfcss')) { const st = document.createElement('style'); st.id = 'mfcss'; st.textContent = `
.mf-grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(min(100%,250px),1fr))}
.mf-card{position:relative;display:flex;flex-direction:column;gap:6px;border:1px solid #DCE7F3;border-radius:18px;padding:14px;background:linear-gradient(180deg,#fff,#F6FAFE);box-shadow:0 12px 26px -20px rgba(8,43,90,.55),0 1px 0 rgba(8,43,90,.05);cursor:grab}
.mf-card.drag{opacity:.45}.mf-card.over{outline:3px dashed #3AB1DB;outline-offset:2px}
.mf-card .mf-ic{width:44px;height:52px;border-radius:8px 14px 8px 8px;background:linear-gradient(160deg,#005499,#082B5A);display:grid;place-items:center;color:#fff;box-shadow:0 8px 16px -8px rgba(0,84,153,.8);position:relative}
.mf-card .mf-ic::after{content:'';position:absolute;top:0;inset-inline-start:0;width:14px;height:14px;background:linear-gradient(225deg,#3AB1DB 50%,transparent 50%);border-radius:0 0 0 6px}
.mf-card .mf-ic svg{width:22px;height:22px}
.mf-card b{color:#082B5A;font-size:15px}.mf-card .small{color:#5b6b7f}
.mf-acts{display:flex;gap:4px;flex-wrap:wrap;margin-top:auto}
.mf-new{border:2px dashed #BFD9EE;background:#F7FBFE;border-radius:18px;display:grid;place-items:center;gap:6px;text-align:center;padding:18px;cursor:pointer;font:inherit;color:#005499;min-height:170px}
.mf-new:hover,.mf-new:focus-visible{border-color:#3AB1DB;background:#EEF8FD;outline:none}
.mf-ways{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));margin:8px 0}
.mf-way{border:1.5px solid #DCE7F3;border-radius:16px;padding:14px;background:#fff;text-align:start;font:inherit;cursor:pointer;display:grid;gap:4px}
.mf-way.on{border-color:#005499;background:#F1F7FD;box-shadow:0 0 0 3px rgba(0,84,153,.1)}.mf-way b{color:#082B5A}
.mf-blocks{display:grid;gap:8px}
.mf-blk{border:1px solid #DCE7F3;border-radius:14px;padding:10px;background:#fff;display:grid;gap:6px}
.mf-blk header{display:flex;gap:6px;align-items:center}.mf-blk header b{flex:1;color:#005499;font-size:13px}
.mf-blk header button{border:1px solid #DCE7F3;background:#fff;border-radius:8px;width:30px;height:30px;cursor:pointer;font:inherit}
.mf-add{display:flex;gap:6px;flex-wrap:wrap}.mf-add button{border:1px dashed #9CC4E4;background:#F7FBFE;color:#005499;border-radius:10px;padding:6px 10px;font:inherit;font-weight:700;cursor:pointer}
.mf-frame{width:100%;height:calc(100vh - 210px);min-height:420px;border:1px solid #DCE7F3;border-radius:14px;background:#EEF3F9;margin-top:8px}
.mf-folders{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}.mf-folders button{border:1px solid #CFE0F2;background:#fff;color:#082B5A;border-radius:99px;padding:6px 12px;font:inherit;font-weight:700;cursor:pointer}.mf-folders button.on{background:#082B5A;color:#fff}
`; document.head.appendChild(st); }

  // ---------- التحويل الذكي: نص ← كتل نموذج ----------
  const SIG_RE = /(التوقيع|الاسم والتوقيع|يعتمد|المعتمد|مدير المدرسة|المدير الأكاديمي|المشرف|توقيع)/;
  const fitW = fs => { const n = fs.length, r = n % 4, full = n - r; fs.forEach((x, k) => { x.w = 1; if (k >= full) x.w = r === 1 ? 4 : r === 2 ? 2 : (k === full ? 2 : 1); }); };
  function textToTpl(name, text) {
    const lines = String(text || '').split(/\r?\n/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    let title = name || '';
    if (lines.length && (!title || lines[0].length < 60)) { if (!title) title = lines[0]; if (lines[0] === title) lines.shift(); }
    const blocks = []; let cur = null;
    const flush = () => { cur = null; };
    const isField = l => /^[^:：|]{2,40}\s*[:：]\s*([.…_\-\s]*|.{0,40})$/.test(l) || /[.…_]{4,}\s*$/.test(l);
    const isList = l => /^([0-9٠-٩]+\s*[-.)–]|[-•▪●*])\s*\S/.test(l);
    const isRow = l => l.includes('|') || l.includes('\t');
    const isCheck = l => /(☐|□|\(\s*\)|\[\s*\])/.test(l);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (SIG_RE.test(l) && l.length < 120 && (i > lines.length - 4 || /توقيع/.test(l))) {
        const parts = l.split(/[|\t،,]|\s{2,}|\s[-–]\s/).map(x => x.replace(/[:：.…_]+/g, '').trim()).filter(x => x && x.length < 40);
        const roles = (parts.length > 1 ? parts : [l.replace(/[:：.…_]+/g, '').trim()]).filter(x => !/^(التوقيع|الاسم)$/.test(x));
        if (roles.length) { blocks.push({ id: uid('b'), type: 'signatures', withSign: true, roles: roles.slice(0, 4).map((r, k) => ({ id: 's' + k, label: r, name: '' })) }); flush(); continue; }
      }
      if (isRow(l)) {
        const cells = l.split(/\||\t/).map(x => x.trim()).filter((x, k, a) => x || (k > 0 && k < a.length - 1));
        if (cur && cur.type === 'table') { const row = {}; cur.cols.forEach((c, k) => row[c.id] = cells[k] || ''); if (cells.some(Boolean)) cur.rows.push(row); cur.n = Math.max(cur.n, cur.rows.length); continue; }
        cur = { id: uid('b'), type: 'table', title: '', n: 4, numbered: true, rows: [], cols: cells.map((c, k) => ({ id: 'c' + k, name: c || ('عمود ' + (k + 1)), type: 'text', w: 1 })) }; blocks.push(cur); continue;
      }
      if (isCheck(l)) { const items = l.split(/☐|□|\(\s*\)|\[\s*\]/).map(x => x.trim()).filter(Boolean);
        if (cur && cur.type === 'checks') items.forEach(t => cur.items.push({ id: uid('l'), text: t })); else { cur = { id: uid('b'), type: 'checks', title: '', cols: 3, items: items.map(t => ({ id: uid('l'), text: t })) }; blocks.push(cur); } continue; }
      if (/[:：]\s*$/.test(l) && lines[i + 1] && (isList(lines[i + 1]) || isRow(lines[i + 1]) || isCheck(lines[i + 1]))) { blocks.push({ id: uid('b'), type: 'text', style: 'h', text: l.replace(/[:：]\s*$/, '') }); flush(); continue; }
      if (isField(l)) { const lab = l.split(/[:：]/)[0].replace(/[.…_]+$/, '').trim(); const val = (l.split(/[:：]/)[1] || '').replace(/[.…_\-]+/g, '').trim();
        const f = { id: uid('f'), label: lab, type: /تاريخ/.test(lab) ? 'date' : /^(المعلم|اسم المعلم|المعلمة|الموظف)$/.test(lab) ? 'teacher' : 'text', w: 1, ...(val ? { def: val } : {}) };
        if (cur && cur.type === 'fields' && cur.fields.length < 8) cur.fields.push(f); else { cur = { id: uid('b'), type: 'fields', title: '', cols: 4, fields: [f] }; blocks.push(cur); }
        fitW(cur.fields); continue; }
      if (isList(l)) { const t = l.replace(/^([0-9٠-٩]+\s*[-.)–]|[-•▪●*])\s*/, '');
        if (cur && cur.type === 'numbered') { cur.prefill.push(t); cur.n = cur.prefill.length; } else { const prev = blocks[blocks.length - 1]; let ttl = ''; if (prev && prev.type === 'text' && prev.style === 'h') { ttl = prev.text; blocks.pop(); } cur = { id: uid('b'), type: 'numbered', title: ttl, n: 1, prefill: [t] }; blocks.push(cur); } continue; }
      const head = l.length <= 45 && !/[.؟?!،]$/.test(l) && (/[:：]$/.test(l) || (lines[i + 1] && (isList(lines[i + 1]) || isRow(lines[i + 1]))));
      blocks.push({ id: uid('b'), type: 'text', style: head ? 'h' : 'p', text: l.replace(/[:：]$/, '') }); flush();
    }
    if (!blocks.some(b => b.type === 'signatures')) blocks.push({ id: uid('b'), type: 'signatures', withSign: true, roles: [{ id: 's0', label: 'الاسم', name: '' }, { id: 's1', label: 'التوقيع', name: '' }, { id: 's2', label: 'يعتمد', name: '@academic' }] });
    if (!blocks.some(b => b.type === 'fields')) blocks.unshift({ id: uid('b'), type: 'fields', title: '', cols: 4, fields: [{ id: uid('f'), label: 'الاسم', type: 'teacher', w: 2 }, { id: uid('f'), label: 'التاريخ', type: 'date', w: 2, key: 'date' }] });
    return { id: 'uf-' + uid(''), name: name || title || 'نموذج جديد', title: title || name || 'نموذج', sub: '', header: true, ver: 1, cat: 'mine', blocks };
  }
  A.textToTpl = textToTpl;

  // ---------- البيانات ----------
  const DEMO = !!api.demo;
  async function list() { try { return (await api.list('user_forms', { school_id: S.school.id }, { order: 'sort' })) || []; } catch (_) { return []; } }
  async function save(row) {
    if (row.id) { const r = await api.upd('user_forms', row.id, { name: row.name, folder: row.folder || '', tpl: row.tpl, data: row.data || {}, sort: row.sort || 0, shared: !!row.shared, updated_at: new Date().toISOString() }); return r || row; }
    const ins = { school_id: S.school.id, name: row.name, folder: row.folder || '', tpl: row.tpl, data: row.data || {}, sort: row.sort || 0, shared: !!row.shared, ...(DEMO ? { id: 'uf' + Date.now(), owner: S.me.id, created_at: new Date().toISOString() } : {}) };
    const r = await api.ins('user_forms', [ins]); return Array.isArray(r) ? r[0] : r || ins;
  }

  // ---------- الصفحة ----------
  const st = { folder: '' };
  V.myforms = async function (root) {
    root.innerHTML = '<div class="card"><div class="spinner"></div></div>';
    const all = await list(); const me = S.me.id;
    const mine = all.filter(f => f.owner === me || (DEMO && !f.owner)), shared = all.filter(f => f.owner !== me && f.shared && !(DEMO && !f.owner));
    const folders = [...new Set(mine.map(f => f.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ar'));
    if (st.folder && st.folder !== '__shared' && !folders.includes(st.folder)) st.folder = '';
    const L = st.folder === '__shared' ? shared : mine.filter(f => !st.folder || f.folder === st.folder);
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>نماذجي</h2><p class="sub" style="margin:2px 0 0">أنشئ نماذج عملك أو ارفعها من Word أو PDF أو صورة، فتتحول لنماذج احترافية بهوية المدرسة تعبّئها وتحفظها وترتبها وتطبعها.</p></div><button class="btn" id="mfNew">${A.I.plus || '+'} نموذج جديد</button></div>
      <div class="mf-folders" role="tablist"><button data-fd="" class="${!st.folder ? 'on' : ''}">الكل (${AR(mine.length)})</button>${folders.map(f => `<button data-fd="${esc(f)}" class="${st.folder === f ? 'on' : ''}">${esc(f)}</button>`).join('')}${shared.length ? `<button data-fd="__shared" class="${st.folder === '__shared' ? 'on' : ''}">مشاركة من الزملاء (${AR(shared.length)})</button>` : ''}</div>
      <div class="mf-grid" id="mfG">${L.map((f, i) => card(f, st.folder === '__shared')).join('')}${st.folder !== '__shared' ? `<button class="mf-new" id="mfNew2"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><b>نموذج جديد</b><span class="small muted">من الصفر · نص · ملف</span></button>` : ''}</div>
      ${st.folder !== '__shared' && L.length > 1 ? '<p class="small muted">رتّب النماذج بالسحب والإفلات، أو بأزهار الأسهم.</p>' : ''}</div>`;
    const reload = () => V.myforms(root);
    $$('[data-fd]', root).forEach(b => b.onclick = () => { st.folder = b.dataset.fd; reload(); });
    $('#mfNew', root).onclick = () => createDialog(reload); const n2 = $('#mfNew2', root); if (n2) n2.onclick = () => createDialog(reload);
    const byId = id => all.find(f => f.id === id);
    $$('[data-op]', root).forEach(b => b.onclick = async e => { e.stopPropagation(); const [op, id] = b.dataset.op.split('|'); const f = byId(id);
      if (op === 'open') return openForm(f, reload);
      if (op === 'edit') return builder(f, reload);
      if (op === 'copy') return A.run(b, async () => { await save({ ...f, id: null, name: f.name + ' (نسخة)', data: {}, shared: false, sort: mine.length + 1, folder: f.owner === me ? f.folder : '' }); A.toast('أُنشئت نسخة', 'ok'); reload(); });
      if (op === 'share') return A.run(b, async () => { await save({ ...f, shared: !f.shared }); A.toast(f.shared ? 'أُلغيت المشاركة' : 'أصبح النموذج متاحاً لزملائك للنسخ', 'ok'); reload(); });
      if (op === 'del') { if (!(await A.confirmBox(`حذف «${esc(f.name)}»؟`, 'حذف', true))) return; return A.run(b, async () => { await api.del('user_forms', id); reload(); }); }
      if (op === 'up' || op === 'down') { const i = L.indexOf(f), j = op === 'up' ? i - 1 : i + 1; if (j < 0 || j >= L.length) return; const arr = L.slice(); [arr[i], arr[j]] = [arr[j], arr[i]]; await reorder(arr); reload(); }
    });
    // السحب والإفلات
    let dragId = null;
    $$('.mf-card[draggable]', root).forEach(c => {
      c.ondragstart = () => { dragId = c.dataset.id; c.classList.add('drag'); }; c.ondragend = () => { c.classList.remove('drag'); $$('.mf-card', root).forEach(x => x.classList.remove('over')); };
      c.ondragover = e => { e.preventDefault(); c.classList.add('over'); }; c.ondragleave = () => c.classList.remove('over');
      c.ondrop = async e => { e.preventDefault(); if (!dragId || dragId === c.dataset.id) return; const arr = L.filter(f => f.id !== dragId); const k = arr.findIndex(f => f.id === c.dataset.id); arr.splice(k, 0, byId(dragId)); await reorder(arr); reload(); };
      c.onclick = e => { if (e.target.closest('button')) return; openForm(byId(c.dataset.id), reload); };
      c.onkeydown = e => { if (e.key === 'Enter') openForm(byId(c.dataset.id), reload); };
    });
  };
  async function reorder(arr) { for (let k = 0; k < arr.length; k++) if (arr[k].sort !== k + 1) { arr[k].sort = k + 1; await api.upd('user_forms', arr[k].id, { sort: k + 1 }); } }
  function card(f, foreign) {
    const n = (f.tpl.blocks || []).length; const filled = Object.keys(f.data || {}).length;
    return `<div class="mf-card" data-id="${f.id}" ${foreign ? '' : 'draggable="true"'} tabindex="0" role="button" aria-label="${esc(f.name)}"><div class="row" style="gap:10px;align-items:center"><span class="mf-ic">${A.I.myforms}</span><div class="grow" style="min-width:0"><b>${esc(f.name)}</b><div class="small">${foreign ? 'من ' + esc(A.personName(f.owner) || '') : (f.folder ? esc(f.folder) + ' · ' : '') + AR(n) + ' أقسام'}${filled ? ' · مُعبّأ' : ''}${f.shared && !foreign ? ' · مشارَك' : ''}</div></div></div>
      <div class="mf-acts">${foreign ? `<button class="btn ghost sm" data-op="open|${f.id}">معاينة</button><button class="btn sm" data-op="copy|${f.id}">نسخ لنماذجي</button>` : `<button class="btn sm" data-op="open|${f.id}">فتح وتعبئة</button><button class="btn ghost sm" data-op="edit|${f.id}">تصميم</button><button class="btn ghost sm" data-op="copy|${f.id}" aria-label="نسخ">نسخ</button><button class="btn ghost sm" data-op="share|${f.id}">${f.shared ? 'إلغاء المشاركة' : 'مشاركة'}</button><button class="btn ghost sm" data-op="up|${f.id}" aria-label="تقديم">▲</button><button class="btn ghost sm" data-op="down|${f.id}" aria-label="تأخير">▼</button><button class="btn ghost sm" data-op="del|${f.id}" aria-label="حذف">حذف</button>`}</div></div>`;
  }

  // ---------- إنشاء ----------
  function createDialog(after) {
    let way = 'text';
    const m = A.modal(`<h3>نموذج جديد</h3>
      <div class="grid g2"><div class="field"><label for="mfN">اسم النموذج</label><input class="in" id="mfN" placeholder="مثال: سجل متابعة الطلاب المتعثرين"></div><div class="field"><label for="mfF">المجلد (اختياري)</label><input class="in" id="mfF" placeholder="مثال: الإرشاد / الريادة" value="${esc(st.folder && st.folder !== '__shared' ? st.folder : '')}"></div></div>
      <div class="mf-ways" role="radiogroup" aria-label="طريقة الإنشاء">
        <button type="button" class="mf-way" data-w="file"><b>من ملف</b><span class="small muted">Word أو PDF أو صورة لنموذجك الحالي</span></button>
        <button type="button" class="mf-way on" data-w="text"><b>لصق نص</b><span class="small muted">انسخ محتوى النموذج والصقه هنا</span></button>
        <button type="button" class="mf-way" data-w="blank"><b>من الصفر</b><span class="small muted">ابنِه بالمكونات: بيانات، جدول، قائمة، خيارات، توقيعات</span></button></div>
      <div id="mfW"></div>
      <p class="small muted">نصائح للتحويل الأدق: «الحقل: ……» يصبح خانة بيانات، والأسطر بفواصل | جدولاً، والأسطر المرقمة قائمة، و☐ خيارات، وسطر التوقيعات في آخر النموذج يصبح خانات توقيع.</p>
      <div class="acts"><button class="btn" id="mfGo">تحويل وإنشاء</button></div>`, { cls: 'wide' });
    let fileText = '';
    const drawW = () => { const W = m.el.querySelector('#mfW');
      if (way === 'text') W.innerHTML = `<textarea class="in" id="mfT" rows="9" style="width:100%" placeholder="بيانات الزيارة\nاسم المعلم: ……\nالمادة: ……\nالتاريخ: ……\nالبند | المستوى | الملاحظات\n1- …\nالتوقيع: المعلم | المشرف | المدير"></textarea>`;
      if (way === 'file') { W.innerHTML = `<input type="file" class="in" id="mfFile" accept=".docx,.pdf,.txt,image/*"><div class="small muted" id="mfFs" style="margin-top:6px"></div>`;
        W.querySelector('#mfFile').onchange = async e => { const f = e.target.files[0]; if (!f) return; const s = W.querySelector('#mfFs'); s.textContent = 'جارٍ قراءة الملف…';
          try { let lines = null; if (/^image\//.test(f.type) && A._imageLines) { s.textContent = 'جارٍ قراءة الصورة بالتعرف الضوئي (قد يستغرق دقيقة)…'; lines = await A._imageLines(f, p => { s.textContent = 'التعرف الضوئي ' + Math.round((p || 0) * 100) + '٪'; }); } else if (A._fileLines) lines = await A._fileLines(f);
            if (!lines) throw new Error('صيغة غير مدعومة'); fileText = (Array.isArray(lines) ? lines : String(lines).split('\n')).map(x => typeof x === 'string' ? x : (x.text || x.t || '')).join('\n'); s.textContent = `قُرئ ${AR(fileText.split('\n').filter(Boolean).length)} سطراً — اضغط «تحويل وإنشاء».`; if (!m.el.querySelector('#mfN').value) m.el.querySelector('#mfN').value = f.name.replace(/\.[^.]+$/, ''); }
          catch (er) { s.textContent = 'تعذّرت القراءة: ' + er.message; } }; }
      if (way === 'blank') W.innerHTML = `<p class="small muted">يُنشأ نموذج ببيانات أساسية وتوقيعات، ثم تفتح شاشة التصميم لإضافة ما تريد.</p>`;
    };
    $$('[data-w]', m.el).forEach(b => b.onclick = () => { way = b.dataset.w; $$('[data-w]', m.el).forEach(x => x.classList.toggle('on', x === b)); drawW(); }); drawW();
    m.el.querySelector('#mfGo').onclick = e => A.run(e.currentTarget, async () => {
      const name = m.el.querySelector('#mfN').value.trim(); const folder = m.el.querySelector('#mfF').value.trim();
      const txt = way === 'text' ? m.el.querySelector('#mfT').value : way === 'file' ? fileText : '';
      if (way !== 'blank' && !txt.trim()) throw new Error(way === 'file' ? 'اختر ملفاً أولاً' : 'الصق نص النموذج');
      const tpl = textToTpl(name, txt); const all = await list();
      const row = await save({ name: name || tpl.name, folder, tpl, data: {}, sort: all.length + 1 });
      m.close(); A.toast('أُنشئ النموذج بهوية المدرسة', 'ok'); after && after();
      if (way === 'blank') builder(row, after); else openForm(row, after);
    });
  }

  // ---------- التصميم (محرر مبسّط للكتل) ----------
  const BT = { fields: 'بيانات (حقول)', table: 'جدول', numbered: 'قائمة مرقمة', checks: 'خيارات (مربعات)', text: 'نص / عنوان', notes: 'ملاحظات وتوصيات', signatures: 'توقيعات' };
  function newBlk(t) { const id = uid('b'); return ({ fields: { id, type: t, title: '', cols: 4, fields: [{ id: uid('f'), label: 'الحقل', type: 'text', w: 2 }] }, table: { id, type: t, title: '', n: 5, numbered: true, rows: [], cols: [{ id: 'c0', name: 'العمود الأول', type: 'text', w: 2 }, { id: 'c1', name: 'العمود الثاني', type: 'text', w: 1 }] }, numbered: { id, type: t, title: 'عنوان القائمة', n: 4, prefill: [] }, checks: { id, type: t, title: '', cols: 3, items: [{ id: 'l0', text: 'الخيار الأول' }, { id: 'l1', text: 'الخيار الثاني' }] }, text: { id, type: t, style: 'p', text: 'نص' }, notes: { id, type: t, title: 'الملاحظات والتوصيات', n: 1, heads: ['الملاحظات', 'التوصيات'], rowsEach: 4, sigs: false }, signatures: { id, type: t, withSign: true, roles: [{ id: 's0', label: 'الاسم', name: '' }, { id: 's1', label: 'يعتمد', name: '@academic' }] } })[t]; }
  function builder(f, after) {
    const tpl = JSON.parse(JSON.stringify(f.tpl));
    const m = A.modal(`<h3>تصميم: ${esc(f.name)}</h3><div class="grid g2"><div class="field"><label for="bdN">اسم النموذج</label><input class="in" id="bdN" value="${esc(f.name)}"></div><div class="field"><label for="bdT">العنوان داخل الورقة</label><input class="in" id="bdT" value="${esc(tpl.title || '')}"></div><div class="field"><label for="bdF">المجلد</label><input class="in" id="bdF" value="${esc(f.folder || '')}"></div></div>
      <div class="mf-blocks" id="bdB"></div><div class="mf-add" style="margin-top:8px">${Object.entries(BT).map(([k, l]) => `<button type="button" data-ad="${k}">+ ${l}</button>`).join('')}</div>
      <div class="acts"><button class="btn ghost" id="bdPv">معاينة</button><button class="btn" id="bdGo">حفظ التصميم</button></div>`, { cls: 'wide' });
    const B = m.el.querySelector('#bdB');
    const lines = (arr, key) => arr.map(x => x[key]).join('\n');
    const draw = () => { B.innerHTML = tpl.blocks.map((b, i) => `<div class="mf-blk" data-i="${i}"><header><b>${esc(BT[b.type] || b.type)}</b><button data-mv="${i}|-1" aria-label="أعلى">▲</button><button data-mv="${i}|1" aria-label="أسفل">▼</button><button data-rm="${i}" aria-label="حذف">×</button></header>${edit(b, i)}</div>`).join('');
      $$('[data-mv]', B).forEach(x => x.onclick = () => { const [i, d] = x.dataset.mv.split('|').map(Number); const j = i + d; if (j < 0 || j >= tpl.blocks.length) return; [tpl.blocks[i], tpl.blocks[j]] = [tpl.blocks[j], tpl.blocks[i]]; draw(); });
      $$('[data-rm]', B).forEach(x => x.onclick = () => { tpl.blocks.splice(+x.dataset.rm, 1); draw(); });
      $$('[data-k]', B).forEach(inp => inp.onchange = () => { const [i, k] = inp.dataset.k.split('|'); const b = tpl.blocks[+i]; const v = inp.value;
        if (k === 'title') b.title = v; if (k === 'text') b.text = v; if (k === 'style') b.style = v; if (k === 'n') b.n = Math.max(0, Math.min(60, +v || 0));
        if (k === 'fields') b.fields = v.split('\n').map(s => s.trim()).filter(Boolean).map((s, j) => ({ ...(b.fields[j] || {}), id: (b.fields[j] || {}).id || uid('f'), label: s.replace(/\s*\(تاريخ\)$/, ''), type: /\(تاريخ\)$|^التاريخ/.test(s) ? 'date' : ((b.fields[j] || {}).type || 'text'), w: 1 })), fitW(b.fields);
        if (k === 'cols') b.cols = v.split('\n').map(s => s.trim()).filter(Boolean).map((s, j) => ({ ...(b.cols[j] || {}), id: (b.cols[j] || {}).id || 'c' + j, name: s, type: 'text', w: j === 0 ? 2 : 1 }));
        if (k === 'items') b.items = v.split('\n').map(s => s.trim()).filter(Boolean).map((s, j) => ({ id: 'l' + j, text: s }));
        if (k === 'prefill') { b.prefill = v.split('\n').map(s => s.trim()).filter(Boolean); b.n = Math.max(b.n || 0, b.prefill.length); }
        if (k === 'roles') b.roles = v.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 5).map((s, j) => ({ id: 's' + j, label: s, name: (b.roles[j] || {}).name || '' }));
      }); };
    const ta = (i, k, v, rows, ph) => `<textarea class="in" rows="${rows || 3}" data-k="${i}|${k}" placeholder="${esc(ph || '')}">${esc(v)}</textarea>`;
    const inp = (i, k, v, ph) => `<input class="in" data-k="${i}|${k}" value="${esc(v || '')}" placeholder="${esc(ph || '')}">`;
    function edit(b, i) {
      if (b.type === 'fields') return inp(i, 'title', b.title, 'عنوان القسم (اختياري)') + ta(i, 'fields', lines(b.fields, 'label'), 3, 'حقل في كل سطر — أضف (تاريخ) لحقل تاريخ');
      if (b.type === 'table') return inp(i, 'title', b.title, 'عنوان الجدول') + ta(i, 'cols', lines(b.cols, 'name'), 3, 'عمود في كل سطر') + `<label class="small">عدد الأسطر <input class="in" type="number" min="1" max="60" style="max-width:90px" data-k="${i}|n" value="${b.n}"></label>`;
      if (b.type === 'numbered') return inp(i, 'title', b.title, 'عنوان القائمة') + ta(i, 'prefill', (b.prefill || []).join('\n'), 3, 'بنود جاهزة (اختياري) — سطر لكل بند') + `<label class="small">عدد البنود <input class="in" type="number" min="1" max="60" style="max-width:90px" data-k="${i}|n" value="${b.n}"></label>`;
      if (b.type === 'checks') return inp(i, 'title', b.title, 'عنوان') + ta(i, 'items', lines(b.items, 'text'), 3, 'خيار في كل سطر');
      if (b.type === 'text') return `<select class="in" data-k="${i}|style" style="max-width:160px"><option value="p" ${b.style !== 'h' ? 'selected' : ''}>فقرة</option><option value="h" ${b.style === 'h' ? 'selected' : ''}>عنوان</option></select>` + ta(i, 'text', b.text, 2);
      if (b.type === 'notes') return inp(i, 'title', b.title, 'العنوان');
      if (b.type === 'signatures') return ta(i, 'roles', lines(b.roles, 'label'), 3, 'صفة الموقّع في كل سطر');
      return '';
    }
    $$('[data-ad]', m.el).forEach(x => x.onclick = () => { const sIdx = tpl.blocks.findIndex(b => b.type === 'signatures'); const nb = newBlk(x.dataset.ad); if (sIdx >= 0 && x.dataset.ad !== 'signatures') tpl.blocks.splice(sIdx, 0, nb); else tpl.blocks.push(nb); draw(); setTimeout(() => { const el = B.querySelector(`[data-i="${tpl.blocks.indexOf(nb)}"]`); el && el.scrollIntoView({ block: 'center' }); }, 30); });
    const collect = () => { tpl.title = m.el.querySelector('#bdT').value.trim(); return { ...f, name: m.el.querySelector('#bdN').value.trim() || f.name, folder: m.el.querySelector('#bdF').value.trim(), tpl }; };
    m.el.querySelector('#bdPv').onclick = () => openForm({ ...collect(), id: null }, null, true);
    m.el.querySelector('#bdGo').onclick = e => A.run(e.currentTarget, async () => { const r = await save(collect()); m.close(); A.toast('حُفظ التصميم', 'ok'); after && after(); });
    draw();
  }

  // ---------- الفتح والتعبئة والطباعة ----------
  async function cfgLib() { try { return A.formsLoadLib ? (await A.formsLoadLib()).cfg || {} : {}; } catch (_) { return {}; } }
  async function openForm(f, after, preview) {
    const mineF = f.owner === S.me.id || (DEMO && !f.owner) || preview;
    const cfg = await cfgLib();
    const m = A.modal(`<div class="fm-top" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><div class="grow"><h3 style="margin:0">${esc(f.name)}</h3><span class="small muted" id="mfSv">${preview ? 'معاينة' : mineF ? 'تُحفظ التعبئة تلقائياً' : 'نموذج زميل — انسخه لنماذجك لتعبئته'}</span></div>
      ${mineF && !preview ? '<button class="btn ghost sm" id="mfClr">تفريغ البيانات</button>' : ''}<button class="btn ghost sm" id="mfPr">${A.I.print || ''} طباعة / PDF</button></div>
      <iframe class="mf-frame" id="mfIf" src="${FRAME}" title="${esc(f.name)}"></iframe>`, { cls: 'wide fm-modal' });
    const fr = m.el.querySelector('#mfIf'); let D = JSON.parse(JSON.stringify(f.data || {})), t = null;
    const post = o => fr.contentWindow && fr.contentWindow.postMessage(o, location.origin);
    const init = () => post({ type: 'dina-form-init', style: A.printStyle ? A.printStyle() : null, tpl: f.tpl, cfg, data: D, sigs: {}, slots: {}, ro: !mineF || !!preview });
    const on = e => { if (e.source !== fr.contentWindow || !e.data) return; const d = e.data;
      if (d.type === 'dina-form-ready') init();
      if (d.type === 'dina-form-change' && mineF && !preview && f.id) { D = d.d; const s = m.el.querySelector('#mfSv'); s.textContent = 'تغييرات غير محفوظة…'; clearTimeout(t); t = setTimeout(async () => { try { await api.upd('user_forms', f.id, { data: D, updated_at: new Date().toISOString() }); f.data = D; s.textContent = 'حُفظ'; } catch (er) { s.textContent = 'تعذّر الحفظ: ' + er.message; } }, 1200); } };
    window.addEventListener('message', on);
    const o = new MutationObserver(() => { if (!document.body.contains(m.el)) { o.disconnect(); window.removeEventListener('message', on); if (t) { clearTimeout(t); if (f.id && mineF && !preview) api.upd('user_forms', f.id, { data: D }).catch(() => { }); } after && after(); } }); o.observe(document.body, { childList: true, subtree: true });
    m.el.querySelector('#mfPr').onclick = () => post({ type: 'dina-form-print' });
    const c = m.el.querySelector('#mfClr'); if (c) c.onclick = async () => { if (!(await A.confirmBox('تفريغ كل ما عُبّئ في هذا النموذج؟', 'تفريغ', true))) return; D = {}; await api.upd('user_forms', f.id, { data: {} }); f.data = {}; init(); };
  }
})();
