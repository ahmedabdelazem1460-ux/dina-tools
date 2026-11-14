/* منصة دينا — البوصلة (الإصدار ٢): (١) بنك مقاييس تربوية (٩ مقاييس، ٣ لغات، ٤ مستويات من الروضة حتى الثانوي)
   تُطبَّق على فصل أو برابط عام (scale.html)، وتقارير احترافية للفصل والطالب: رادار ومقارنة بمتوسط الفصل ومستويات وتوصيات
   للمعلم وللطالب وولي الأمر، وتصدير PDF/صورة/Excel/طباعة، وإرسال لولي الأمر واتساب، ونسخة ورقية للمقياس.
   (٢) مؤشرات الأداء للمالك. sql/099 + sql/100 + scales.js */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  const DEMO = !!api.demo, DS = () => window.DinaScales;
  A.I.compass = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>';
  if (A.NAV && !A.NAV.some(n => n[0] === 'compass')) { const i = A.NAV.findIndex(n => n[0] === 'analysis'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['compass', 'البوصلة', () => !!S.me && !S.realMe && A.tfeat('compass')]); }
  const LANGS = { ar: 'العربية', en: 'English', fr: 'Français' };
  if (!document.getElementById('cpcss')) { const st = document.createElement('style'); st.id = 'cpcss'; st.textContent = `
.cp-grid{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(min(100%,270px),1fr))}
.cp-sc{position:relative;border:1px solid #DCE7F3;border-radius:20px;padding:16px;background:linear-gradient(180deg,#fff,#F5F9FD);display:grid;gap:7px;box-shadow:0 1px 0 #fff inset,0 16px 30px -24px rgba(8,43,90,.7);transition:transform .2s,box-shadow .2s;overflow:hidden}
.cp-sc::before{content:"";position:absolute;inset-inline-end:-30px;top:-30px;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,var(--c,#3AB1DB) 0,transparent 70%);opacity:.14}
.cp-sc:hover{transform:translateY(-3px);box-shadow:0 1px 0 #fff inset,0 22px 36px -22px rgba(8,43,90,.7)}
.cp-sc .ic{font-size:30px;width:56px;height:56px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(145deg,#fff,#E3EEF8);box-shadow:inset 0 -3px 0 rgba(8,43,90,.08),0 8px 16px -10px rgba(8,43,90,.5)}
.cp-sc b{color:#082B5A;font-size:16.5px}.cp-sc .chips{display:flex;gap:4px;flex-wrap:wrap}.cp-sc .chips span{font-size:11px;border-radius:20px;padding:1px 8px;color:#fff}
.cp-sc .lv{display:flex;gap:4px;flex-wrap:wrap}.cp-sc .lv span{font-size:11px;font-weight:800;border-radius:8px;padding:2px 7px;background:#E8F1F9;color:#005499}
.cp-sc .row{gap:6px}
.cp-bars{display:grid;gap:8px}.cp-bars div{display:grid;grid-template-columns:minmax(90px,140px) 1fr 48px;gap:8px;align-items:center;font-size:13.5px;font-weight:700}
.cp-bars .tr{height:14px;border-radius:8px;background:#EEF3F9;position:relative;overflow:hidden}.cp-bars .tr i{position:absolute;inset-block:0;inset-inline-start:0;border-radius:8px}.cp-bars .tr u{position:absolute;inset-block:-2px;width:2px;background:#082B5A;opacity:.55}
.cp-kpi{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin:10px 0}
.cp-k{border:1px solid #DCE7F3;border-radius:18px;padding:14px;background:linear-gradient(180deg,#fff,#F5F9FD);box-shadow:inset 0 -4px 0 var(--c,#3AB1DB)}
.cp-k b{display:block;font-size:30px;color:#082B5A}.cp-k span{font-size:12.5px;color:#4D6A8F}
.cp-ring{--p:0;width:64px;height:64px;border-radius:50%;background:conic-gradient(var(--c) calc(var(--p)*1%),#E6EDF4 0);display:grid;place-items:center;float:inline-end}
.cp-ring::after{content:attr(data-v);width:48px;height:48px;border-radius:50%;background:#fff;display:grid;place-items:center;font-weight:900;color:#082B5A;font-size:13px}
.cp-pill{display:inline-block;border-radius:20px;padding:1px 9px;font-size:12px;font-weight:800;color:#fff}
.cp-rep{border:1px solid #DCE7F3;border-radius:20px;overflow:hidden;background:#fff}
.cp-rep[dir=ltr]{font-family:'Myriad Pro','Segoe UI',Tahoma,Arial,sans-serif}
.cp-rh{background:linear-gradient(135deg,#082B5A,#005499);color:#fff;padding:14px 18px;display:flex;gap:12px;align-items:center;position:relative}
.cp-rh::after{content:"";position:absolute;inset-inline:0;bottom:0;height:4px;background:linear-gradient(90deg,#3AB1DB,#BADF93,#3AB1DB)}
.cp-rh img{height:38px}.cp-rh b{display:block;font-size:17px}.cp-rh span{font-size:12.5px;color:#CFE3F5}.cp-rh .grow{flex:1}
.cp-rb{padding:16px 18px;display:grid;gap:14px}
.cp-two{display:grid;gap:14px;grid-template-columns:minmax(0,300px) 1fr;align-items:center}
.cp-star{border-radius:16px;padding:12px 14px;background:linear-gradient(135deg,#F3FAEC,#EAF6FB);border:1px solid #CFE7F2}
.cp-tips{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))}
.cp-tips>div{border:1px solid #E4EBF5;border-radius:14px;padding:10px 12px;background:#FAFCFE}.cp-tips h4{margin:0 0 6px;font-size:14px}
.cp-tips ul{margin:0;padding-inline-start:18px;line-height:1.8;font-size:13.5px}
.cp-dist{display:flex;height:12px;border-radius:8px;overflow:hidden;background:#EEF3F9;min-width:90px}
.cp-legend{display:flex;gap:12px;font-size:12px;color:#4D6A8F;align-items:center;justify-content:center}.cp-legend i{display:inline-block;width:18px;height:3px;border-radius:2px;vertical-align:middle;margin-inline-end:4px}
.cp-tools{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.cp-wa{display:grid;gap:6px;max-height:55vh;overflow:auto}.cp-wa>div{display:flex;gap:8px;align-items:center;border:1px solid var(--border);border-radius:12px;padding:8px 10px}
.cp-wa .grow{flex:1;min-width:0}
.btn.cp-wab{background:linear-gradient(135deg,#25D366,#128C7E);color:#fff;border:0}
@media (max-width:640px){.cp-two{grid-template-columns:1fr}.cp-bars div{grid-template-columns:90px 1fr 42px}}
`; document.head.appendChild(st); }
  const genCode = () => { const ab = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 6; i++) s += ab[Math.floor(Math.random() * ab.length)]; return s; };
  const link = c => location.origin + location.pathname.replace(/[^/]*$/, '') + 'scale.html?c=' + c;
  const optsOf = r => r.opts || {};
  const viewOf = (r, lang) => DS().view(r.scale_key, optsOf(r).lv || null, lang || 'ar');
  const NUM = (v, lang) => lang && lang !== 'ar' ? String(v) : AR(v);
  const barsH = (sc, sco, cmp, lang) => `<div class="cp-bars">${DS().top(sc, sco).map(x => `<div><span>${esc(x.n)}</span><span class="tr"><i style="width:${Math.max(3, x.v)}%;background:${x.c}"></i>${cmp && cmp[x.k] != null ? `<u style="inset-inline-start:${cmp[x.k]}%"></u>` : ''}</span><span>${NUM(x.v, lang)}${lang && lang !== 'ar' ? '%' : '٪'}</span></div>`).join('')}</div>`;
  const avgScores = (sc, rs) => { const o = {}; Object.keys(sc.dims).forEach(k => { const v = rs.map(r => (r.scores || {})[k]).filter(x => x != null); o[k] = v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; }); return o; };
  const clsName = id => (A.cls && A.cls(id) || {}).name || '';
  // تصدير عنصر إلى PDF (A4، مع تقسيم الصفحات) أو صورة — مشترك مع رعاية الموهوبين
  async function snap(el) { return html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, windowWidth: Math.max(900, el.scrollWidth) }); }
  A.elToPng = async (el, name) => { if (!window.html2canvas) return A.toast('تعذّر التصدير', 'err'); const c = await snap(el); const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = name + '.png'; a.click(); };
  A.elToPdf = async (el, name, land) => {
    if (!window.html2canvas || !window.jspdf) return A.toast('تعذّر التصدير', 'err');
    const c = await snap(el), pdf = new window.jspdf.jsPDF({ orientation: land ? 'l' : 'p', unit: 'mm', format: 'a4' });
    const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), m = 8, w = W - 2 * m, ph = (H - 2 * m) * c.width / w; let y = 0, first = true;
    while (y < c.height) { const h = Math.min(ph, c.height - y), part = document.createElement('canvas'); part.width = c.width; part.height = h; part.getContext('2d').drawImage(c, 0, y, c.width, h, 0, 0, c.width, h); if (!first) pdf.addPage(); pdf.addImage(part.toDataURL('image/jpeg', .92), 'JPEG', m, m, w, h * w / c.width); first = false; y += h; }
    pdf.save(name + '.pdf');
  };
  const teachersOf = cid => [...new Set((S.allEntries || S.entries || []).filter(e => e.class_id === cid && e.teacher_id).map(e => e.teacher_id))].filter(id => id !== S.me.id);
  const canManage = r => S.me.is_owner || r.owner === S.me.id;
  async function notifyShared(r, ids) { if (!ids.length) return; try { await api.rpc('notify_send', { p_ids: ids, p_title: '🧭 نتائج مقياس: ' + r.title, p_body: 'شاركك ' + (S.me.full_name || '') + ' نتائج «' + r.title + '»' + (clsName(r.class_id) ? ' — ' + clsName(r.class_id) : '') + '. افتح البوصلة ← التطبيقات والتقارير.', p_link: '#/compass', p_kind: 'notice', p_show_at: null }); } catch (_) { } }
  function shareTeachers(r, after) {
    const cur = new Set(r.shared || []), cl = new Set(r.class_id ? teachersOf(r.class_id) : []);
    const staff = (S.staff || []).filter(x => x.id !== S.me.id && x.active !== false && !x.is_test).sort((a, b) => (cl.has(b.id) - cl.has(a.id)) || String(a.full_name).localeCompare(b.full_name, 'ar'));
    const m = A.modal(`<h3>مشاركة النتائج مع المعلمين</h3><p class="small muted">يرى المعلم المختار هذا التطبيق ونتائجه وتقاريره (قراءة فقط) في البوصلة، ويصله إشعار. تظهر البوصلة للمعلم فقط إذا فعّلتها له من «تخصيص صفحة المعلم».</p>
      <div class="row" style="gap:6px;margin-bottom:6px"><input class="in" id="shQ" placeholder="بحث" style="max-width:220px">${cl.size ? '<button class="btn ghost sm" id="shCl">معلمو الفصل</button>' : ''}<button class="btn ghost sm" id="shNo">إلغاء الكل</button></div>
      <div class="nf-rc" style="max-height:46vh">${staff.map(x => `<label data-n="${esc(x.full_name || '')}"><input type="checkbox" value="${x.id}" ${cur.has(x.id) ? 'checked' : ''}> ${esc(x.full_name || '')}${cl.has(x.id) ? ' <span class="pill">يدرّس الفصل</span>' : ''}</label>`).join('')}</div>
      <div class="acts"><button class="btn" id="shGo">حفظ وإرسال الإشعار</button></div>`);
    $('#shQ', m.el).oninput = e => $$('[data-n]', m.el).forEach(l => l.style.display = l.dataset.n.includes(e.target.value.trim()) ? '' : 'none');
    if ($('#shCl', m.el)) $('#shCl', m.el).onclick = () => $$('input[type=checkbox]', m.el).forEach(i => { if (cl.has(i.value)) i.checked = true; });
    $('#shNo', m.el).onclick = () => $$('input[type=checkbox]', m.el).forEach(i => i.checked = false);
    $('#shGo', m.el).onclick = e => A.run(e.currentTarget, async () => { const ids = $$('.nf-rc input:checked', m.el).map(i => i.value); const added = ids.filter(id => !cur.has(id)); await api.upd('scale_runs', r.id, { shared: ids }); r.shared = ids; await notifyShared(r, added); m.close(); A.toast(`شوركت مع ${AR(ids.length)} معلماً` + (added.length ? ' · وصلهم إشعار' : ''), 'ok'); after && after(); });
  }
  A.waOpen = (phone, text) => window.open(`https://wa.me/${DS().waNum(phone)}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');

  const st = { tab: null };
  V.compass = async function (root) {
    const own = S.me.is_owner && !S.realMe;
    st.tab = st.tab || 'scales'; if (st.tab === 'kpi' && !own) st.tab = 'scales';
    const T = [['scales', 'بنك المقاييس'], ['runs', 'التطبيقات والتقارير'], ...(own ? [['kpi', 'مؤشرات الأداء']] : [])];
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>البوصلة</h2><p class="sub" style="margin:2px 0 0">${AR(DS().raw.length)} مقاييس تربوية بثلاث لغات ولكل المراحل (من الروضة حتى الثانوي) تكشف أنماط تعلم الطلاب وقدراتهم وميولهم، بتقارير احترافية للفصل والطالب وولي الأمر${own ? '، ومؤشرات أداء المدرسة والمعلمين' : ''}.</p></div></div>
      <div class="fm-tabs">${T.map(([k, l]) => `<button data-t="${k}" class="${st.tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="cpB"></div></div>`;
    $$('[data-t]', root).forEach(b => b.onclick = () => { st.tab = b.dataset.t; V.compass(root); });
    const B = $('#cpB', root); ({ scales, runs, kpi })[st.tab](B, root);
  };
  function scales(B, root) {
    B.innerHTML = `<div class="cp-grid">${DS().raw.map(r => { const s = DS().view(r.key, null, 'ar'); return `<div class="cp-sc" style="--c:${Object.values(s.dims)[0][1]}"><span class="ic" aria-hidden="true">${s.icon}</span><b>${esc(s.name)}</b><span class="small muted">${esc(s.about)}</span>
      <div class="lv">${s.levels.map(l => `<span title="${esc(DS().LEVELS[l].ar)}">${esc(DS().LEVELS[l].ar)} · ${AR(DS().view(r.key, l).count)}</span>`).join('')}</div>
      <div class="chips">${Object.values(s.dims).map(d => `<span style="background:${d[1]}">${esc(d[0])}</span>`).join('')}</div>
      <span class="small muted">🌐 العربية · English · Français</span>
      <div class="row"><button class="btn sm" data-run="${s.key}">تطبيق على فصل</button><button class="btn ghost sm" data-pv="${s.key}">معاينة وورقي</button></div></div>`; }).join('')}</div>
      <p class="small muted" style="margin-top:10px">العبارات مؤلفة للاستخدام المدرسي الإرشادي وليست اختبارات تشخيصية مقننة؛ تُستخدم نتائجها لتنويع التدريس والتوجيه لا للحكم على الطالب. يتغير عدد العبارات حسب المستوى، ويختار الطالب لغته من الصفحة.</p>`;
    $$('[data-run]', B).forEach(b => b.onclick = () => runDialog(b.dataset.run, () => { st.tab = 'runs'; V.compass(root); }));
    $$('[data-pv]', B).forEach(b => b.onclick = () => preview(b.dataset.pv));
  }
  function preview(key) {
    const s0 = DS().view(key, null, 'ar');
    const m = A.modal(`<div class="head" style="margin:0;padding-inline-end:44px"><div class="grow"><h3 style="margin:0">${s0.icon} ${esc(s0.name)}</h3></div>
      <select class="in" id="pvL" style="width:auto">${s0.levels.map(l => `<option value="${l}">${esc(DS().LEVELS[l].ar)}</option>`).join('')}</select><select class="in" id="pvG" style="width:auto">${Object.entries(LANGS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select><button class="btn sm" id="pvP">${A.I.print || ''} نسخة ورقية</button></div><div id="pvB" style="margin-top:10px"></div>`, { cls: 'wide' });
    const draw = () => { const s = DS().view(key, $('#pvL', m.el).value, $('#pvG', m.el).value); $('#pvB', m.el).innerHTML = `<div dir="${s.dir}"><p class="small">${esc(s.about)}</p><div class="scroll"><table class="tbl"><thead><tr><th>#</th><th>العبارة</th>${s.scale.map(l => `<th style="font-size:11px">${esc(l)}</th>`).join('')}<th>البعد</th></tr></thead><tbody>${s.items.map((it, i) => `<tr><td>${NUM(i + 1, s.lang)}</td><td><b>${esc(it[1])}</b></td>${s.scale.map(() => '<td style="text-align:center">◯</td>').join('')}<td><span class="cp-pill" style="background:${s.dims[it[0]][1]}">${esc(s.dims[it[0]][0])}</span></td></tr>`).join('')}</tbody></table></div></div>`; return s; };
    $('#pvL', m.el).onchange = draw; $('#pvG', m.el).onchange = draw; draw();
    $('#pvP', m.el).onclick = () => { const s = DS().view(key, $('#pvL', m.el).value, $('#pvG', m.el).value); A.printDoc(s.name, DS().LEVELS[s.lv || 'p'][s.lang] + ' — ' + 'الاسم: ............................  الفصل: ..............', `<div dir="${s.dir}"><p>${esc(s.about)}</p><table><tr><th>#</th><th>العبارة</th>${s.scale.map(l => `<th>${esc(l)}</th>`).join('')}</tr>${s.items.map((it, i) => `<tr><td>${NUM(i + 1, s.lang)}</td><td>${esc(it[1])}</td>${s.scale.map(() => '<td style="text-align:center">◯</td>').join('')}</tr>`).join('')}</table></div>`, false); };
  }
  function runDialog(key, after) {
    const s0 = DS().view(key, null, 'ar');
    const cls = (S.allClasses || S.classes || []).filter(c => c.active !== false).sort((a, b) => (a.sort || 0) - (b.sort || 0));
    const m = A.modal(`<h3>${s0.icon} تطبيق «${esc(s0.name)}»</h3><div class="grid g2">
      <div class="field"><label for="crC">الفصل</label><select class="in" id="crC">${cls.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}<option value="">رابط عام (يكتب الطالب اسمه)</option></select></div>
      <div class="field"><label for="crT">العنوان</label><input class="in" id="crT" value="${esc(s0.name)}"></div>
      <div class="field"><label for="crL">المستوى</label><select class="in" id="crL">${s0.levels.map(l => `<option value="${l}">${esc(DS().LEVELS[l].ar)} (${AR(DS().view(key, l).count)} عبارة)</option>`).join('')}</select></div>
      <div class="field"><label for="crG">اللغة الافتراضية للطالب</label><select class="in" id="crG">${Object.entries(LANGS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div></div>
      <label class="tf-it" id="crXw" style="margin-top:8px;display:none"><input type="checkbox" id="crX"><span><b>طلاب من خارج المدرسة</b><small>يكتب الطالب اسمه ومدرسته وصفه وجوال ولي الأمر، وتظهر نتائجهم عندك فقط.</small></span></label>
      <label class="tf-it" id="crSw" style="margin-top:8px"><input type="checkbox" id="crS"><span><b>مشاركة النتائج مع معلمي هذا الفصل</b><small>يرون التطبيق ونتائجه (قراءة فقط) ويصلهم إشعار — عند تفعيل «البوصلة» لهم.</small></span></label>
      <p class="small muted">يُقترح المستوى تلقائياً من مرحلة الفصل، ويستطيع الطالب تغيير اللغة من الصفحة. يمكنك إغلاق التطبيق متى شئت.</p><div class="acts"><button class="btn" id="crGo">إنشاء الرابط</button></div>`);
    const auto = () => { const c = cls.find(x => x.id === $('#crC', m.el).value); $('#crXw', m.el).style.display = c ? 'none' : 'flex'; $('#crSw', m.el).style.display = c ? 'flex' : 'none'; if (!c) return; const lv = DS().levelFor(c.stage || c.name, c.grade_word || c.name); const sel = $('#crL', m.el); if ([...sel.options].some(o => o.value === lv)) sel.value = lv; };
    $('#crC', m.el).onchange = auto; auto();
    $('#crGo', m.el).onclick = e => A.run(e.currentTarget, async () => {
      const row = { school_id: S.school.id, scale_key: key, title: $('#crT', m.el).value.trim() || s0.name, class_id: $('#crC', m.el).value || null, code: genCode(), opts: { lv: $('#crL', m.el).value, lang: $('#crG', m.el).value, ...(!$('#crC', m.el).value && $('#crX', m.el).checked ? { ext: true } : {}) }, ...($('#crC', m.el).value && $('#crS', m.el).checked ? { shared: teachersOf($('#crC', m.el).value) } : {}), ...(DEMO ? { id: 'sr' + Date.now(), owner: S.me.id, state: 'open', created_at: new Date().toISOString() } : {}) };
      await api.ins('scale_runs', [row]); if (row.shared && row.shared.length) notifyShared(row, row.shared); m.close(); share(row); after && after();
    });
  }
  function share(r) {
    let qr = ''; try { const q = window.qrcode(0, 'M'); q.addData(link(r.code)); q.make(); qr = q.createSvgTag({ cellSize: 5, margin: 1, scalable: true }); } catch (_) { }
    const m = A.modal(`<h3>رابط المقياس للطلاب</h3><div style="display:grid;place-items:center;gap:8px;text-align:center"><div style="width:220px">${qr}</div><b style="font-size:28px;letter-spacing:.2em" dir="ltr">${esc(r.code)}</b><input class="in" readonly value="${esc(link(r.code))}" dir="ltr" onclick="this.select()"><div class="row" style="gap:6px;flex-wrap:wrap;justify-content:center"><button class="btn sm" id="shC">نسخ الرابط</button><a class="btn sm cp-wab" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent('مقياس ' + r.title + ': ' + link(r.code))}">مشاركة واتساب</a><button class="btn ghost sm" id="shP">${A.I.print || ''} طباعة الرمز</button></div></div>`);
    m.el.querySelector('#shC').onclick = async () => { try { await navigator.clipboard.writeText(link(r.code)); A.toast('نُسخ', 'ok'); } catch (_) { } };
    m.el.querySelector('#shP').onclick = () => A.printDoc(r.title, clsName(r.class_id), `<div style="text-align:center"><div style="width:260px;margin:auto">${qr}</div><h2 dir="ltr" style="letter-spacing:.2em">${esc(r.code)}</h2><p dir="ltr">${esc(link(r.code))}</p></div>`, false);
  }
  async function runs(B) {
    B.innerHTML = '<div class="spinner"></div>';
    let R = [], P = []; try { R = await api.list('scale_runs', { school_id: S.school.id }, { order: 'created_at', desc: true }); P = R.length ? await api.list('scale_resp', { run_id: R.map(r => r.id) }) : []; } catch (_) { }
    if (DEMO) for (const r of R) { if (P.some(p => p.run_id === r.id)) continue; const sc = viewOf(r); let stu = []; try { stu = r.class_id ? await api.list('students', { class_id: r.class_id }) : []; } catch (_) { } const n = stu.length || 14; for (let k = 0; k < n; k++) { const bias = k % Object.keys(sc.dims).length; const ans = sc.items.map(it => Math.min(sc.scale.length, Math.max(1, (Object.keys(sc.dims).indexOf(it[0]) === bias ? sc.scale.length - 1 : 2) + Math.floor(Math.random() * 2)))); P.push({ id: 'p' + k + r.id, run_id: r.id, student_id: stu[k] ? stu[k].id : null, name: stu[k] ? stu[k].full_name.split(' ').slice(0, 2).join(' ') : 'طالب ' + AR(k + 1), answers: ans, scores: DS().score(sc, ans), meta: optsOf(r).ext ? { school: ['مدارس النخبة', 'مدارس الرواد', 'مدارس المستقبل'][k % 3], grade: 'الخامس', ph: '0551234' + String(100 + k) } : {} }); } }
    B.innerHTML = R.length ? `<div class="fm-list">${R.map(r => { const sc = viewOf(r) || { icon: '', name: r.scale_key }; const n = P.filter(p => p.run_id === r.id).length; const o = optsOf(r); return `<div class="fm-row" data-r="${r.id}" tabindex="0" role="button"><div style="display:flex;gap:10px;align-items:center"><span style="font-size:26px">${sc.icon}</span><div><b>${esc(r.title)}</b><div class="meta"><span>${esc(clsName(r.class_id) || 'رابط عام')}</span>${o.lv ? `<span>${esc(DS().LEVELS[o.lv].ar)}</span>` : ''}${o.ext ? '<span class="pill">طلاب من خارج المدرسة</span>' : ''}${(r.shared || []).length ? (canManage(r) ? `<span class="pill">مشارك مع ${AR(r.shared.length)}</span>` : `<span class="pill">شاركه معك ${esc(A.personName(r.owner) || '')}</span>`) : ''}<span>${AR(n)} استجابة</span><span class="pill ${r.state === 'open' ? 'st-approved' : ''}">${r.state === 'open' ? 'مفتوح' : 'مغلق'}</span></div></div></div><span class="small muted">${esc(A.arDate ? A.arDate(String(r.created_at).slice(0, 10)) : '')}</span></div>`; }).join('')}</div>` : A.emptyBox('لا تطبيقات بعد', 'من تبويب «بنك المقاييس» اختر مقياساً وطبّقه على فصل.');
    $$('[data-r]', B).forEach(x => { const go = () => { const r = R.find(y => y.id === x.dataset.r); report(r, P.filter(p => p.run_id === r.id), () => runs(B)); }; x.onclick = go; x.onkeydown = e => { if (e.key === 'Enter') go(); }; });
  }
  async function phones(r, rs) { const meta = {}; (rs || []).forEach(p => { if (p.meta && p.meta.ph) meta[p.student_id || p.id] = { guardian_phone: p.meta.ph }; }); if (!r.class_id) return meta; try { const L = await api.list('students', { class_id: r.class_id }, { select: 'id,full_name,guardian_phone' }); const o = { ...meta }; L.forEach(s => o[s.id] = s); return o; } catch (_) { return meta; } }
  function report(r, rs, after) {
    const sc = viewOf(r); const avg = avgScores(sc, rs); const t = DS().top(sc, avg); const keys = Object.keys(sc.dims); const ext = !!optsOf(r).ext;
    const grp = {}; rs.forEach(p => { const k = DS().top(sc, p.scores || {})[0]; if (k) (grp[k.k] = grp[k.k] || []).push(p); });
    const dist = k => { const b = [0, 0, 0]; rs.forEach(p => { const v = (p.scores || {})[k] || 0; b[v >= 75 ? 0 : v >= 50 ? 1 : 2]++; }); return b; };
    const head = `<div class="cp-rh"><img src="assets/logo_white.svg" alt=""><div class="grow"><b>${sc.icon} ${esc(r.title)}</b><span>تقرير الفصل · ${esc(clsName(r.class_id) || 'رابط عام')} · ${AR(rs.length)} استجابة${optsOf(r).lv ? ' · ' + esc(DS().LEVELS[optsOf(r).lv].ar) : ''}</span></div></div>`;
    const m = A.modal(`<div class="head" style="margin:0;padding-inline-end:44px"><div class="grow"><h3 style="margin:0">${sc.icon} ${esc(r.title)}</h3><span class="small muted">${esc(clsName(r.class_id) || 'رابط عام')} · ${AR(rs.length)} استجابة</span></div>
        <div class="cp-tools">${canManage(r) ? `<button class="btn ghost sm" id="rpS">الرابط</button><button class="btn ghost sm" id="rpT">${r.state === 'open' ? 'إغلاق' : 'إعادة فتح'}</button><button class="btn ghost sm" id="rpSh">👥 مشاركة مع المعلمين${(r.shared || []).length ? ' (' + AR(r.shared.length) + ')' : ''}</button>` : ''}<button class="btn sm" id="rpC" style="background:linear-gradient(135deg,#7E62C2,#3AB1DB);color:#fff;border:0">✨ تصدير إبداعي</button><button class="btn ghost sm" id="rpX">Excel</button><button class="btn ghost sm" id="rpD">PDF</button><button class="btn sm cp-wab" id="rpW">واتساب لأولياء الأمور</button><button class="btn sm" id="rpP">${A.I.print || ''} طباعة</button></div></div>
      <div class="cp-rep" id="rpBody" style="margin-top:10px">${head}<div class="cp-rb">
        <div class="cp-two"><div>${DS().radar(sc, avg, { size: 300 })}</div><div><h3 style="margin:0 0 8px">ملف الفصل</h3>${barsH(sc, avg)}
          <div class="cp-star" style="margin-top:12px"><b>الأبرز في الفصل: ${esc(t[0] ? t[0].n : '')}</b><div class="small">${esc(t[0] ? t[0].d : '')}</div><div class="small" style="margin-top:6px"><b>توصية تدريسية:</b> ${esc(t[0] ? t[0].t : '')}${t[1] ? ' و' + esc(t[1].t) : ''}</div>${t.length > 2 ? `<div class="small"><b>بحاجة إلى تنمية:</b> ${esc(t[t.length - 1].n)} — ${esc(t[t.length - 1].t)}</div>` : ''}</div></div></div>
        <div><h3 style="margin:0 0 8px">توزيع المستويات لكل بُعد</h3><div class="scroll"><table class="tbl"><thead><tr><th>البعد</th><th>متوسط</th><th>التوزيع</th><th>مرتفع</th><th>متوسط</th><th>يحتاج تنمية</th></tr></thead><tbody>${keys.map(k => { const b = dist(k), n = rs.length || 1; return `<tr><td><span class="cp-pill" style="background:${sc.dims[k][1]}">${esc(sc.dims[k][0])}</span></td><td><b>${AR(avg[k])}٪</b></td><td><div class="cp-dist"><i style="width:${b[0] * 100 / n}%;background:#2E8B57"></i><i style="width:${b[1] * 100 / n}%;background:#C9A44C"></i><i style="width:${b[2] * 100 / n}%;background:#E0675A"></i></div></td><td>${AR(b[0])}</td><td>${AR(b[1])}</td><td>${AR(b[2])}</td></tr>`; }).join('')}</tbody></table></div></div>
        <div><h3 style="margin:0 0 8px">مجموعات العمل حسب البُعد الأبرز</h3>${Object.entries(grp).sort((a, b) => b[1].length - a[1].length).map(([k, L]) => `<div style="margin-bottom:8px"><span class="cp-pill" style="background:${sc.dims[k][1]}">${esc(sc.dims[k][0])} · ${AR(L.length)}</span> <span class="small">${L.map(p => esc(p.name)).join('، ')}</span><div class="small muted">${esc(sc.dims[k][4])}</div></div>`).join('') || A.emptyBox('لا استجابات بعد')}</div>
        <div><h3 style="margin:0 0 8px">الطلاب</h3><div class="scroll"><table class="tbl"><thead><tr><th>الطالب</th>${ext ? '<th>المدرسة</th><th>الصف</th>' : ''}${Object.values(sc.dims).map(d => `<th>${esc(d[0])}</th>`).join('')}<th>الأبرز</th><th data-noexp></th></tr></thead><tbody>${rs.map((p, i) => { const tp = DS().top(sc, p.scores || {})[0] || {}; return `<tr><td><b>${esc(p.name)}</b></td>${ext ? `<td>${esc((p.meta || {}).school || '')}</td><td>${esc((p.meta || {}).grade || '')}</td>` : ''}${keys.map(k => { const v = (p.scores || {})[k] ?? 0; return `<td style="font-weight:800;color:${DS().BAND(v).c}">${AR(v)}٪</td>`; }).join('')}<td><span class="cp-pill" style="background:${tp.c || '#999'}">${esc(tp.n || '')}</span></td><td data-noexp><button class="btn ghost sm" data-ind="${i}">التقرير</button></td></tr>`; }).join('')}</tbody></table></div></div>
        <p class="small muted" style="margin:0">مرتفع ≥ ٧٥٪ · متوسط ٥٠–٧٤٪ · يحتاج تنمية &lt; ٥٠٪. نتائج إرشادية للتوجيه وتنويع التدريس، وليست تشخيصاً.</p></div></div>`, { cls: 'wide' });
    if (m.el.querySelector('#rpS')) m.el.querySelector('#rpS').onclick = () => share(r);
    if (m.el.querySelector('#rpT')) m.el.querySelector('#rpT').onclick = e => A.run(e.currentTarget, async () => { r.state = r.state === 'open' ? 'closed' : 'open'; await api.upd('scale_runs', r.id, { state: r.state }); m.close(); after && after(); });
    const body = () => m.el.querySelector('#rpBody');
    m.el.querySelector('#rpD').onclick = e => A.run(e.currentTarget, async () => { const b = body(); b.querySelectorAll('[data-noexp]').forEach(x => x.style.display = 'none'); try { await A.elToPdf(b, `${sc.name} - ${clsName(r.class_id)}`); } finally { b.querySelectorAll('[data-noexp]').forEach(x => x.style.display = ''); } });
    m.el.querySelector('#rpP').onclick = () => A.printDoc(`${sc.name} — ${clsName(r.class_id)}`, `${AR(rs.length)} طالباً`, `<div style="display:flex;gap:16px;align-items:center"><div style="width:260px">${DS().radar(sc, avg, { size: 260 })}</div><table><tr><th>البعد</th><th>متوسط الفصل</th></tr>${t.map(x => `<tr><td>${esc(x.n)}</td><td>${AR(x.v)}٪</td></tr>`).join('')}</table></div><p><b>توصية تدريسية:</b> ${esc(t[0] ? t[0].t : '')}</p><h3>الطلاب</h3><table><tr><th>الطالب</th>${Object.values(sc.dims).map(d => `<th>${esc(d[0])}</th>`).join('')}<th>الأبرز</th></tr>${rs.map(p => `<tr><td>${esc(p.name)}</td>${keys.map(k => `<td>${AR((p.scores || {})[k] ?? 0)}٪</td>`).join('')}<td>${esc((DS().top(sc, p.scores || {})[0] || {}).n || '')}</td></tr>`).join('')}</table>`, true);
    m.el.querySelector('#rpX').onclick = () => { if (!window.XLSX) return; const ws = XLSX.utils.json_to_sheet(rs.map(p => { const o = { 'الطالب': p.name }; if (ext) { o['المدرسة'] = (p.meta || {}).school || ''; o['الصف'] = (p.meta || {}).grade || ''; o['جوال ولي الأمر'] = (p.meta || {}).ph || ''; } Object.entries(sc.dims).forEach(([k, d]) => { const v = (p.scores || {})[k] ?? 0; o[d[0]] = v; o[d[0] + ' — المستوى'] = DS().BAND(v).ar; }); o['الأبرز'] = (DS().top(sc, p.scores || {})[0] || {}).n || ''; return o; })); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'النتائج'); const ws2 = XLSX.utils.json_to_sheet(t.map(x => ({ 'البعد': x.n, 'متوسط الفصل ٪': x.v, 'المستوى': x.band.ar, 'توصية': x.t }))); ws2['!views'] = [{ RTL: true }]; XLSX.utils.book_append_sheet(wb, ws2, 'ملف الفصل'); XLSX.writeFile(wb, `${sc.name}.xlsx`); };
    m.el.querySelector('#rpW').onclick = async () => { const ph = await phones(r, rs); waAll(r, rs, ph); };
    $$('[data-ind]', m.el).forEach(b => b.onclick = async () => { const ph = await phones(r, rs); student(r, rs[+b.dataset.ind], avg, ph); });
    if (m.el.querySelector('#rpSh')) m.el.querySelector('#rpSh').onclick = () => shareTeachers(r, () => { m.close(); after && after(); });
    m.el.querySelector('#rpC').onclick = () => creative(r, rs, sc, avg);
  }
  // ---------- التصدير الإبداعي ----------
  const loadJs = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });
  // صفحات مستقلة (كل عنصر صفحة) → PDF واحد
  async function pagesToPdf(pages, name, land) {
    if (!window.html2canvas || !window.jspdf) return A.toast('تعذّر التصدير', 'err');
    const pdf = new window.jspdf.jsPDF({ orientation: land ? 'l' : 'p', unit: 'mm', format: 'a4' }), W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;inset-inline-start:-99999px;top:0;direction:rtl'; document.body.appendChild(host);
    try { for (let i = 0; i < pages.length; i++) { host.innerHTML = pages[i]; const el = host.firstElementChild; const c = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true }); if (i) pdf.addPage(); const r = Math.min(W / c.width, H / c.height); pdf.addImage(c.toDataURL('image/jpeg', .92), 'JPEG', (W - c.width * r) / 2, (H - c.height * r) / 2, c.width * r, c.height * r); } pdf.save(name + '.pdf'); }
    finally { host.remove(); }
  }
  async function htmlToPng(html, name) { const host = document.createElement('div'); host.style.cssText = 'position:fixed;inset-inline-start:-99999px;top:0;direction:rtl'; host.innerHTML = html; document.body.appendChild(host); try { await A.elToPng(host.firstElementChild, name); } finally { host.remove(); } }
  const FONT = "font-family:'GE SS Two',Tahoma,sans-serif;color:#082B5A";
  function poster(r, rs, sc, avg) {
    const t = DS().top(sc, avg), keys = Object.keys(sc.dims);
    const best = k => rs.slice().sort((a, b) => ((b.scores || {})[k] || 0) - ((a.scores || {})[k] || 0)).slice(0, 3).filter(p => ((p.scores || {})[k] || 0) >= 50);
    const grp = {}; rs.forEach(p => { const x = DS().top(sc, p.scores || {})[0]; if (x) grp[x.k] = (grp[x.k] || 0) + 1; });
    return `<div style="width:1400px;${FONT};background:#fff">
      <div style="background:radial-gradient(600px 300px at 0 0,rgba(58,177,219,.5),transparent),linear-gradient(135deg,#082B5A,#005499);color:#fff;padding:34px 44px;display:flex;align-items:center;gap:24px;border-bottom:8px solid #3AB1DB">
        <img src="assets/logo_white.svg" style="height:70px" alt=""><div style="flex:1"><div style="font-size:18px;color:#BFE3F4">إنفوجرافيك نتائج الفصل</div><div style="font-size:40px;font-weight:900">${sc.icon} ${esc(r.title)}</div><div style="font-size:18px;color:#D6E6F5">${esc(clsName(r.class_id) || 'رابط عام')} · ${AR(rs.length)} طالباً · ${esc(A.arDate ? A.arDate(new Date().toISOString().slice(0, 10)) : '')}</div></div>
        <div style="text-align:center;background:rgba(255,255,255,.12);border-radius:22px;padding:14px 22px"><div style="font-size:16px;color:#BFE3F4">الأبرز في الفصل</div><div style="font-size:30px;font-weight:900">${esc(t[0] ? t[0].n : '')}</div><div style="font-size:22px">${AR(t[0] ? t[0].v : 0)}٪</div></div></div>
      <div style="display:grid;grid-template-columns:460px 1fr;gap:30px;padding:30px 44px;align-items:center">
        <div>${DS().radar(sc, avg, { size: 460 })}</div>
        <div style="display:grid;grid-template-columns:repeat(${keys.length > 4 ? 4 : 2},1fr);gap:14px">${t.map(x => `<div style="border-radius:22px;padding:16px;background:linear-gradient(180deg,#fff,#F3F8FD);border:2px solid #E4EBF5;border-bottom:6px solid ${x.c}"><div style="font-size:34px;font-weight:900;color:${x.c}">${AR(x.v)}٪</div><div style="font-size:19px;font-weight:800">${esc(x.n)}</div><div style="font-size:14px;color:#4D6A8F;margin-top:4px">👥 ${AR(grp[x.k] || 0)} طالباً أبرز ما لديهم</div></div>`).join('')}</div></div>
      <div style="padding:0 44px 18px"><div style="font-size:24px;font-weight:900;margin-bottom:12px">🏆 نجوم كل بُعد</div><div style="display:grid;grid-template-columns:repeat(${Math.min(4, keys.length)},1fr);gap:12px">${keys.map(k => `<div style="border-radius:18px;padding:12px 14px;background:${sc.dims[k][1]}12;border-inline-start:6px solid ${sc.dims[k][1]}"><b style="font-size:17px">${esc(sc.dims[k][0])}</b><div style="font-size:15px;line-height:1.8;margin-top:4px">${best(k).map((p, i) => `${['🥇', '🥈', '🥉'][i]} ${esc(p.name)}`).join('<br>') || '—'}</div></div>`).join('')}</div></div>
      <div style="margin:10px 44px 30px;border-radius:20px;padding:16px 20px;background:linear-gradient(135deg,#F3FAEC,#EAF6FB);font-size:17px;line-height:1.9"><b>💡 توصية تدريسية:</b> ${esc(t[0] ? t[0].t : '')}${t[1] ? ' — ' + esc(t[1].t) : ''}${t.length > 2 ? `<br><b>🌱 فرصة للتنمية:</b> ${esc(t[t.length - 1].n)} — ${esc(t[t.length - 1].t)}` : ''}</div>
      <div style="background:#082B5A;color:#BFD6EE;padding:12px 44px;font-size:14px;display:flex;justify-content:space-between"><span>مدارس دينا العالمية — البوصلة</span><span>نتائج إرشادية للتوجيه وتنويع التدريس</span></div></div>`;
  }
  function cardsPages(r, rs, sc) {
    const card = p => { const tp = DS().top(sc, p.scores || {}), b = tp[0] || {}; return `<div style="border-radius:20px;overflow:hidden;background:linear-gradient(145deg,#082B5A,#005499 60%,#3AB1DB);color:#fff;padding:16px;display:flex;flex-direction:column;gap:6px;height:100%;box-sizing:border-box">
      <div style="display:flex;justify-content:space-between;align-items:center"><img src="assets/logo_white.svg" style="height:26px" alt=""><span style="font-size:11px;opacity:.85">بطاقة التعلم · ${esc(sc.name)}</span></div>
      <div style="font-size:21px;font-weight:900;margin-top:4px">${esc(p.name)}</div><div style="display:flex;gap:10px;align-items:center"><span style="font-size:38px">${sc.icon}</span><div><div style="font-size:12px;opacity:.85">أبرز ما يميزك</div><div style="font-size:18px;font-weight:800">${esc(b.n || '')} · ${AR(b.v || 0)}٪</div></div></div>
      <div style="display:grid;gap:3px">${tp.slice(0, 4).map(x => `<div style="display:grid;grid-template-columns:90px 1fr;gap:6px;align-items:center;font-size:11.5px"><span>${esc(x.n)}</span><i style="display:block;height:7px;border-radius:5px;background:rgba(255,255,255,.2)"><u style="display:block;height:100%;width:${x.v}%;border-radius:5px;background:#BADF93"></u></i></div>`).join('')}</div>
      <div style="margin-top:auto;font-size:12px;line-height:1.7;background:rgba(255,255,255,.13);border-radius:12px;padding:7px 10px">💡 ${esc(b.h || '')}</div></div>`; };
    const pages = []; for (let i = 0; i < rs.length; i += 6) pages.push(`<div style="width:794px;height:1123px;padding:30px;box-sizing:border-box;${FONT};background:#fff;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:18px">${rs.slice(i, i + 6).map(card).join('')}</div>`);
    return pages;
  }
  function certPages(r, rs, sc) {
    return rs.map(p => { const b = DS().top(sc, p.scores || {})[0] || {}; return `<div style="width:1123px;height:794px;box-sizing:border-box;padding:36px;${FONT};background:#fff">
      <div style="height:100%;box-sizing:border-box;border:3px solid #082B5A;border-radius:26px;outline:8px solid #E4EBF5;outline-offset:-16px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:14px;position:relative;background:radial-gradient(500px 260px at 50% 0,rgba(58,177,219,.12),transparent)">
        <img src="assets/logo.svg" style="height:86px" alt=""><div style="font-size:20px;color:#005499;font-weight:800">شهادة تميّز</div>
        <div style="font-size:22px">تُمنح هذه الشهادة إلى</div><div style="font-size:48px;font-weight:900">${esc(p.name)}</div>
        <div style="font-size:22px;line-height:1.8;max-width:760px">تقديراً لتميّزه في <b style="color:${b.c || '#005499'}">${esc(b.n || '')}</b> ضمن مقياس «${esc(sc.name)}»${clsName(r.class_id) ? ' — ' + esc(clsName(r.class_id)) : ''}</div>
        <div style="font-size:60px">${sc.icon} ⭐</div><div style="font-size:16px;color:#4D6A8F;max-width:700px">${esc(b.d || '')}</div>
        <div style="position:absolute;bottom:40px;inset-inline:70px;display:flex;justify-content:space-between;font-size:16px"><span>التاريخ: ${esc(A.arDate ? A.arDate(new Date().toISOString().slice(0, 10)) : '')}</span><span>مدارس دينا العالمية</span></div></div></div>`; });
  }
  async function pptx(r, rs, sc, avg) {
    if (!window.PptxGenJS) await loadJs('vendor/pptxgen.bundle.js');
    const P = new window.PptxGenJS(); P.layout = 'LAYOUT_WIDE'; P.rtlMode = true; const t = DS().top(sc, avg), keys = Object.keys(sc.dims), F = 'Arial';
    const head = (s, txt) => { s.background = { color: 'FFFFFF' }; s.addShape(P.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 1.1, fill: { color: '082B5A' } }); s.addShape(P.ShapeType.rect, { x: 0, y: 1.1, w: 13.33, h: .07, fill: { color: '3AB1DB' } }); s.addText(txt, { x: .4, y: .15, w: 12.5, h: .8, fontFace: F, fontSize: 26, bold: true, color: 'FFFFFF', align: 'right', rtlMode: true }); };
    let s = P.addSlide(); s.background = { color: '082B5A' }; s.addText(sc.icon + ' ' + r.title, { x: .5, y: 2.3, w: 12.3, h: 1.2, fontFace: F, fontSize: 44, bold: true, color: 'FFFFFF', align: 'center', rtlMode: true }); s.addText(`${clsName(r.class_id) || 'رابط عام'} · ${rs.length} طالباً`, { x: .5, y: 3.6, w: 12.3, h: .6, fontFace: F, fontSize: 22, color: 'BFE3F4', align: 'center', rtlMode: true }); s.addText('مدارس دينا العالمية — البوصلة', { x: .5, y: 6.6, w: 12.3, h: .5, fontFace: F, fontSize: 14, color: '84B7E3', align: 'center', rtlMode: true });
    s = P.addSlide(); head(s, 'ملف الفصل');
    s.addChart(keys.length >= 3 ? P.ChartType.radar : P.ChartType.bar, [{ name: 'متوسط الفصل', labels: keys.map(k => sc.dims[k][0]), values: keys.map(k => avg[k]) }], { x: .4, y: 1.4, w: 6.4, h: 5.6, chartColors: ['005499'], catAxisLabelFontFace: F, catAxisLabelFontSize: 12, valAxisMaxVal: 100, valAxisMinVal: 0, showLegend: false, radarStyle: 'filled' });
    s.addChart(P.ChartType.bar, [{ name: '٪', labels: t.map(x => x.n), values: t.map(x => x.v) }], { x: 7, y: 1.4, w: 6, h: 5.6, barDir: 'bar', chartColors: t.map(x => x.c.replace('#', '')), catAxisLabelFontFace: F, valAxisMaxVal: 100, showValue: true, dataLabelFontSize: 11, showLegend: false });
    s = P.addSlide(); head(s, 'التوصيات ومجموعات العمل');
    const grp = {}; rs.forEach(p => { const x = DS().top(sc, p.scores || {})[0]; if (x) (grp[x.k] = grp[x.k] || []).push(p.name); });
    s.addText([{ text: 'توصية تدريسية: ', options: { bold: true, color: '005499' } }, { text: (t[0] ? t[0].t : '') + (t[1] ? ' — ' + t[1].t : ''), options: { color: '082B5A' } }], { x: .5, y: 1.4, w: 12.3, h: .8, fontFace: F, fontSize: 18, align: 'right', rtlMode: true });
    Object.entries(grp).slice(0, 8).forEach(([k, L], i) => { const x = .5 + (i % 4) * 3.1, y = 2.4 + Math.floor(i / 4) * 2.4; s.addShape(P.ShapeType.roundRect, { x, y, w: 2.9, h: 2.2, fill: { color: 'F3F8FD' }, line: { color: sc.dims[k][1].replace('#', ''), width: 2 }, rectRadius: .15 }); s.addText(`${sc.dims[k][0]} (${L.length})`, { x, y: y + .1, w: 2.9, h: .5, fontFace: F, fontSize: 16, bold: true, color: sc.dims[k][1].replace('#', ''), align: 'center', rtlMode: true }); s.addText(L.slice(0, 8).join('، '), { x: x + .1, y: y + .6, w: 2.7, h: 1.5, fontFace: F, fontSize: 11, color: '082B5A', align: 'right', valign: 'top', rtlMode: true }); });
    for (let i = 0; i < rs.length; i += 12) { s = P.addSlide(); head(s, 'نتائج الطلاب' + (rs.length > 12 ? ` (${Math.floor(i / 12) + 1})` : ''));
      const rows = [[...['الطالب', ...keys.map(k => sc.dims[k][0]), 'الأبرز'].map(h => ({ text: h, options: { bold: true, color: 'FFFFFF', fill: { color: '005499' } } }))], ...rs.slice(i, i + 12).map(p => [p.name, ...keys.map(k => ({ text: ((p.scores || {})[k] ?? 0) + '%', options: { color: DS().BAND((p.scores || {})[k] || 0).c.replace('#', '') } })), (DS().top(sc, p.scores || {})[0] || {}).n || ''])];
      s.addTable(rows.map(r => r.map(c => typeof c === 'string' ? { text: c } : c)), { x: .4, y: 1.4, w: 12.5, fontFace: F, fontSize: keys.length > 6 ? 10 : 12, align: 'center', border: { type: 'solid', color: 'D5E1F0', pt: .7 }, rtlMode: true }); }
    await P.writeFile({ fileName: `${sc.name} - ${clsName(r.class_id) || 'نتائج'}.pptx` });
  }
  function creative(r, rs, sc, avg) {
    if (!rs.length) return A.toast('لا استجابات بعد', 'err');
    const nm = `${sc.name} - ${clsName(r.class_id) || 'نتائج'}`;
    const O = [['poster', '🖼️', 'إنفوجرافيك الفصل', 'لوحة بصرية واحدة: الرادار، نسب الأبعاد، نجوم كل بُعد، والتوصية — صورة أو PDF للعرض والطباعة.', '#3AB1DB', '#005499'],
      ['cards', '🪪', 'بطاقات التعلم لكل الطلاب', 'بطاقة ملونة لكل طالب (٦ في الصفحة) بأبرز ما يميزه ونصيحته — PDF جاهز للقص والتوزيع.', '#5BC48A', '#2E8B57'],
      ['cert', '🏅', 'شهادات تميّز', 'شهادة لكل طالب بأبرز بُعد لديه — PDF أفقي صفحة لكل طالب.', '#F2C66D', '#C98A12'],
      ['pptx', '📊', 'عرض تقديمي PowerPoint', 'شرائح بمخطط رادار وأعمدة قابلة للتعديل، والتوصيات والمجموعات وجدول الطلاب.', '#C2AEEB', '#7E62C2'],
      ['csv', '📄', 'CSV لجداول Google', 'ملف نصي يُفتح في Google Sheets أو أي نظام آخر.', '#84B7E3', '#082B5A']];
    const m = A.modal(`<h3>✨ تصدير إبداعي — ${esc(r.title)}</h3><div class="wn">${O.map(o => `<div class="wn-it"><span class="g" style="--a:${o[4]};--b:${o[5]}" aria-hidden="true">${o[1]}</span><div class="grow"><b>${o[2]}</b><small>${o[3]}</small></div><div class="row" style="gap:4px;flex:none">${o[0] === 'poster' ? `<button class="btn ghost sm" data-ce="poster-png">صورة</button><button class="btn sm" data-ce="poster-pdf">PDF</button>` : `<button class="btn sm" data-ce="${o[0]}">تنزيل</button>`}</div></div>`).join('')}</div>`, { cls: 'wide' });
    $$('[data-ce]', m.el).forEach(b => b.onclick = e => A.run(e.currentTarget, async () => {
      const k = b.dataset.ce;
      if (k === 'poster-png') await htmlToPng(poster(r, rs, sc, avg), 'إنفوجرافيك ' + nm);
      if (k === 'poster-pdf') await pagesToPdf([poster(r, rs, sc, avg)], 'إنفوجرافيك ' + nm, true);
      if (k === 'cards') await pagesToPdf(cardsPages(r, rs, sc), 'بطاقات التعلم ' + nm);
      if (k === 'cert') await pagesToPdf(certPages(r, rs, sc), 'شهادات ' + nm, true);
      if (k === 'pptx') await pptx(r, rs, sc, avg);
      if (k === 'csv') { const keys = Object.keys(sc.dims), q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"'; const lines = [['الطالب', 'المدرسة', 'الصف', ...keys.map(k => sc.dims[k][0]), 'الأبرز'].map(q).join(','), ...rs.map(p => [p.name, (p.meta || {}).school || '', (p.meta || {}).grade || '', ...keys.map(k => (p.scores || {})[k] ?? 0), (DS().top(sc, p.scores || {})[0] || {}).n || ''].map(q).join(','))]; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = nm + '.csv'; a.click(); }
      A.toast('تم التصدير', 'ok');
    }));
  }
  A.compassPoster = poster;
  function waAll(r, rs, ph) {
    let lang = 'ar';
    const m = A.modal(`<div class="head" style="margin:0;padding-inline-end:44px"><div class="grow"><h3 style="margin:0">إرسال النتائج لأولياء الأمور</h3><span class="small muted">يفتح واتساب برسالة جاهزة لكل ولي أمر (رقمه من بيانات الطالب، أو اكتبه).</span></div><select class="in" id="waG" style="width:auto">${Object.entries(LANGS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
      <div class="cp-wa" style="margin-top:10px">${rs.map((p, i) => { const s = ph[p.student_id || p.id] || {}; return `<div><div class="grow"><b>${esc(p.name)}</b><div class="small muted">${esc((DS().top(viewOf(r), p.scores || {})[0] || {}).n || '')}</div></div><input class="in" style="width:150px" dir="ltr" inputmode="tel" data-ph="${i}" value="${esc(s.guardian_phone || '')}" placeholder="05xxxxxxxx" aria-label="جوال ولي أمر ${esc(p.name)}"><button class="btn sm cp-wab" data-ws="${i}">إرسال</button></div>`; }).join('') || A.emptyBox('لا استجابات')}</div>`);
    $('#waG', m.el).onchange = e => lang = e.target.value;
    $$('[data-ws]', m.el).forEach(b => b.onclick = () => { const i = +b.dataset.ws, p = rs[i], sc = viewOf(r, lang); A.waOpen($(`[data-ph="${i}"]`, m.el).value, DS().waText(sc, p.scores || {}, p.name, lang)); b.textContent = '✓ أُرسل'; b.classList.remove('cp-wab'); b.classList.add('ghost'); });
  }
  function student(r, p, avg, ph) {
    let lang = 'ar';
    const draw = () => {
      const sc = viewOf(r, lang), tp = DS().top(sc, p.scores || {}), T = DS().T[lang], best = tp[0] || {}, low = tp[tp.length - 1] || {};
      const L = { ar: { t: 'تقرير الطالب', s: 'نتائج المقياس', st: 'نصائح للطالب', pa: 'لولي الأمر', te: 'للمعلم', low: 'مجال للتنمية', dim: 'البعد', sc: 'الدرجة', lvl: 'المستوى', d: 'الوصف' }, en: { t: 'Student report', s: 'Scale results', st: 'Tips for the student', pa: 'For parents', te: 'For the teacher', low: 'Area to develop', dim: 'Dimension', sc: 'Score', lvl: 'Level', d: 'Description' }, fr: { t: "Rapport de l'élève", s: "Résultats de l'échelle", st: "Conseils pour l'élève", pa: 'Pour les parents', te: 'Pour le professeur', low: 'Axe à développer', dim: 'Dimension', sc: 'Score', lvl: 'Niveau', d: 'Description' } }[lang];
      return `<div class="cp-rep" id="stR" dir="${sc.dir}"><div class="cp-rh"><img src="assets/logo_white.svg" alt=""><div class="grow"><b>${sc.icon} ${esc(sc.name)} — ${esc(p.name)}</b><span>${L.t} · ${esc(clsName(r.class_id))} · ${esc(new Date().toLocaleDateString(lang === 'ar' ? 'ar-SA-u-ca-gregory' : lang))}</span></div></div><div class="cp-rb">
        <div class="cp-two"><div>${DS().radar(sc, p.scores || {}, { cmp: avg, size: 290 })}<div class="cp-legend"><span><i style="background:#005499"></i>${esc(p.name)}</span><span><i style="background:#9AA9BC"></i>${T.classAvg}</span></div></div>
          <div>${barsH(sc, p.scores || {}, avg, lang)}<div class="cp-star" style="margin-top:12px"><span class="small">${T.top}</span><div><b style="font-size:17px">⭐ ${esc(best.n || '')}</b> <span class="cp-pill" style="background:${(best.band || {}).c}">${esc((best.band || {})[lang] || '')}</span></div><div class="small">${esc(best.d || '')}</div></div></div></div>
        <table class="tbl"><thead><tr><th>${L.dim}</th><th>${L.sc}</th><th>${L.lvl}</th><th>${L.d}</th></tr></thead><tbody>${tp.map(x => `<tr><td><b>${esc(x.n)}</b></td><td>${NUM(x.v, lang)}${lang !== 'ar' ? '%' : '٪'}</td><td><span class="cp-pill" style="background:${x.band.c}">${esc(x.band[lang])}</span></td><td class="small">${esc(x.d)}</td></tr>`).join('')}</tbody></table>
        <div class="cp-tips"><div><h4>🎒 ${L.st}</h4><ul>${tp.slice(0, 2).map(x => `<li>${esc(x.h)}</li>`).join('')}</ul></div><div><h4>🏠 ${L.pa}</h4><ul><li>${esc(best.h || '')}</li>${low.k && low.k !== best.k ? `<li><b>${L.low}:</b> ${esc(low.n)} — ${esc(low.h)}</li>` : ''}</ul></div>${lang === 'ar' ? `<div><h4>👩‍🏫 ${L.te}</h4><ul>${tp.slice(0, 2).map(x => `<li>${esc(x.t)}</li>`).join('')}${low.t ? `<li>تنمية «${esc(low.n)}»: ${esc(low.t)}</li>` : ''}</ul></div>` : ''}</div>
        <p class="small muted" style="margin:0">${T.note} — ${T.school}</p></div></div>`;
    };
    const s = ph[p.student_id || p.id] || {};
    const m = A.modal(`<div class="head" style="margin:0;padding-inline-end:44px"><div class="grow"><h3 style="margin:0">تقرير ${esc(p.name)}</h3></div><select class="in" id="stG" style="width:auto">${Object.entries(LANGS).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select>
      <div class="cp-tools"><button class="btn ghost sm" id="stI">صورة</button><button class="btn ghost sm" id="stD">PDF</button><button class="btn ghost sm" id="stP">${A.I.print || ''} طباعة</button>${r.scale_key === 'gifted' && A.giftedNominate ? '<button class="btn ghost sm" id="stGf">⭐ ملف الموهوبين</button>' : ''}</div></div>
      <div id="stB" style="margin-top:10px">${draw()}</div>
      <div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap"><input class="in" id="stPh" style="width:180px" dir="ltr" inputmode="tel" value="${esc(s.guardian_phone || '')}" placeholder="جوال ولي الأمر 05xxxxxxxx" aria-label="جوال ولي الأمر"><button class="btn sm cp-wab" id="stW">إرسال لولي الأمر واتساب</button></div>`, { cls: 'wide' });
    $('#stG', m.el).onchange = e => { lang = e.target.value; $('#stB', m.el).innerHTML = draw(); };
    $('#stI', m.el).onclick = e => A.run(e.currentTarget, () => A.elToPng($('#stR', m.el), p.name));
    $('#stD', m.el).onclick = e => A.run(e.currentTarget, () => A.elToPdf($('#stR', m.el), p.name));
    $('#stP', m.el).onclick = () => A.printDoc(`${viewOf(r, lang).name} — ${p.name}`, clsName(r.class_id), $('#stR', m.el).outerHTML, false);
    $('#stW', m.el).onclick = () => A.waOpen($('#stPh', m.el).value, DS().waText(viewOf(r, lang), p.scores || {}, p.name, lang));
    if ($('#stGf', m.el)) $('#stGf', m.el).onclick = e => A.run(e.currentTarget, async () => { await A.giftedNominate({ student_id: p.student_id, name: p.name, class_id: r.class_id, source: 'self', self: p.scores }); A.toast('أُضيف إلى ملفات رعاية الموهوبين', 'ok'); });
  }

  // ---------- مؤشرات الأداء (للمالك) ----------
  async function kpi(B) {
    B.innerHTML = '<div class="spinner"></div>';
    const E = (S.allEntries || S.entries || []).filter(e => e.subject_id && e.teacher_id);
    const month = new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 7);
    const [F, H] = await Promise.all([api.list('form_tasks', { school_id: S.school.id }, { select: 'id,assignee,status,mode' }).catch(() => []), api.list('staff_att', { school_id: S.school.id }, { gte: { day: month + '-01' } }).catch(() => [])]);
    const filled = e => e.status && e.status !== 'empty', hasHw = e => { const h = (e.homework || '').trim(); return !!h && !/^لا يوجد|^بدون|^[-–—.\s]+$/.test(h); };
    const pct = (a, b) => b ? Math.round(a * 100 / b) : null;
    const T = [...new Set(E.map(e => e.teacher_id))].map(id => { const es = E.filter(e => e.teacher_id === id), fl = es.filter(filled); const fs = F.filter(f => f.assignee === id && f.mode !== 'sign'); const hs = H.filter(h => h.staff_id === id);
      const o = { id, plan: pct(fl.length, es.length), hw: pct(fl.filter(hasHw).length, fl.length), forms: fs.length ? pct(fs.filter(f => ['submitted', 'approved'].includes(f.status)).length, fs.length) : null, att: hs.length ? pct(hs.filter(h => ['present', 'excused', 'leave'].includes(h.status)).length, hs.length) : null };
      const v = [o.plan, o.hw, o.forms, o.att].filter(x => x != null); o.idx = v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0; return o; }).sort((a, b) => b.idx - a.idx);
    const avg = k => { const v = T.map(t => t[k]).filter(x => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; };
    const ring = (v, c) => `<span class="cp-ring" style="--p:${v || 0};--c:${c}" data-v="${v == null ? '—' : AR(v) + '٪'}"></span>`;
    const tone = v => v == null ? '' : v >= 85 ? 'color:#1F6B44' : v >= 60 ? 'color:#8a5a00' : 'color:#B42318';
    B.innerHTML = `<div class="cp-kpi">${[['plan', 'إنجاز خطة الأسبوع', '#005499'], ['hw', 'حصص فيها واجب', '#3AB1DB'], ['forms', 'إنجاز النماذج', '#2E8B57'], ['att', 'انضباط الحضور (الشهر)', '#C9A44C'], ['idx', 'المؤشر العام', '#082B5A']].map(([k, l, c]) => `<div class="cp-k" style="--c:${c}">${ring(avg(k), c)}<b>${avg(k) == null ? '—' : AR(avg(k)) + '٪'}</b><span>${l}</span></div>`).join('')}</div>
      <div class="scroll"><table class="tbl"><thead><tr><th>المعلم</th><th>الخطة</th><th>الواجبات</th><th>النماذج</th><th>الحضور</th><th>المؤشر العام</th></tr></thead><tbody>${T.map(t => `<tr><td><b>${esc(A.personName(t.id) || '')}</b></td>${['plan', 'hw', 'forms', 'att', 'idx'].map(k => `<td style="font-weight:800;${tone(t[k])}">${t[k] == null ? '—' : AR(t[k]) + '٪'}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="6">${A.emptyBox('لا بيانات للأسبوع المحدد')}</td></tr>`}</tbody></table></div>
      <p class="small muted">الخطة والواجبات من الأسبوع المعروض حالياً، والنماذج من كل النماذج المرسلة، والحضور من الموارد البشرية هذا الشهر. المؤشر العام متوسط المتاح منها. — المؤشرات وسيلة متابعة وتحسين لا حكم نهائي.</p>
      <div class="acts"><button class="btn ghost" id="kpP">${A.I.print || ''} طباعة</button></div>`;
    $('#kpP', B).onclick = () => A.printDoc('مؤشرات الأداء', (A.week() ? 'الأسبوع ' + A.week().word : '') + ' · ' + month, `<table><tr><th>المعلم</th><th>الخطة</th><th>الواجبات</th><th>النماذج</th><th>الحضور</th><th>المؤشر</th></tr>${T.map(t => `<tr><td>${esc(A.personName(t.id) || '')}</td>${['plan', 'hw', 'forms', 'att', 'idx'].map(k => `<td>${t[k] == null ? '—' : AR(t[k]) + '٪'}</td>`).join('')}</tr>`).join('')}</table>`, true);
  }
})();
