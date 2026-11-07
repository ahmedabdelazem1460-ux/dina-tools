/* منصة دينا — حسابات الطلاب برمز دخول
   لكل طالب رمز من ٨ خانات يدخل به «حسابي» (me.html): خطة فصله، اختباراته وواجباته، نتائجه، والمصادر المتاحة لفصله.
   الإدارة تُنشئ الرموز وتطبع بطاقات بهوية دينا مع رمز QR، أو ترسلها لولي الأمر عبر واتساب، وتوقف أي حساب أو تعيد توليده. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR, I } = A;
  A.I.stucodes = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 11h5M18.5 8.5v5"/></svg>';
  const can = () => S.me && (S.me.is_owner || A.perm('structure') || (A.hasModule && (A.hasModule('attendance') || A.hasModule('supervision'))));
  if (A.NAV && !A.NAV.some(n => n[0] === 'stucodes')) { const i = A.NAV.findIndex(n => n[0] === 'attendance'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['stucodes', 'حسابات الطلاب', () => can()]); }
  const base = () => location.href.split('#')[0].replace(/[^/]*$/, '');
  const link = c => base() + 'me.html?c=' + encodeURIComponent(c);
  const ERR = m => ({ 'no permission': 'ليست لديك صلاحية — المالك أو صلاحية الهيكل أو الحضور أو الإشراف' })[m] || m;
  const rpc = async (n, a) => { try { return await api.rpc(n, a); } catch (e) { throw new Error(ERR(e.message)); } };
  let QR = null; const loadQR = () => QR ? Promise.resolve(QR) : new Promise((ok, no) => { const s = document.createElement('script'); s.src = 'vendor/qrcode.js'; s.onload = () => ok(QR = window.qrcode); s.onerror = () => ok(null); document.head.appendChild(s); });
  const qrSvg = (q, text) => { if (!q) return ''; const x = q(0, 'M'); x.addData(text); x.make(); return x.createSvgTag({ cellSize: 3, margin: 0, scalable: true }); };
  const waNum = p => { let d = String(p || '').replace(/\D/g, ''); if (/^05\d{8}$/.test(d)) d = '966' + d.slice(1); else if (/^5\d{8}$/.test(d)) d = '966' + d; return d.length >= 11 ? d : ''; };

  V.stucodes = async function (root) {
    if (!can()) { root.innerHTML = `<div class="card">${A.emptyBox('غير متاح لحسابك')}</div>`; return; }
    const cls = (S.classes || []).filter(c => c.active !== false);
    let cid = A.LS.get('sc_c'); if (!cls.some(c => c.id === cid)) cid = (cls[0] || {}).id;
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">حسابات الطلاب</h2><p class="sub" style="margin:2px 0 0">لكل طالب رمز دخول يفتح به «حسابي»: خطة فصله، واختباراته وواجباته، ونتائجه، ومصادر فصله — دون بريد أو كلمة مرور.</p></div></div>
      <details class="rs-how"><summary><b>كيف تعمل حسابات الطلاب؟</b></summary><ul>
        <li>أنشئ الرموز للفصل بضغطة، ثم اطبع البطاقات (فيها رمز QR) أو أرسل الرمز لولي الأمر عبر واتساب.</li>
        <li>يدخل الطالب من رابط «حسابي» بالرمز، فيرى ما يخص فصله فقط، وتُملأ بياناته تلقائياً في الاختبارات.</li>
        <li>يمكنك إيقاف أي حساب أو إعادة توليد رمزه (الرمز القديم يتوقف فوراً)، وترى آخر دخول لكل طالب.</li>
        <li>المصادر التي تظهر للطالب هي المعتمدة لأولياء الأمور فقط.</li></ul></details>
      <div class="row" style="gap:8px;margin:10px 0;flex-wrap:wrap"><label class="small">الفصل <select class="in" id="scC" style="width:auto">${cls.map(c => `<option value="${c.id}" ${c.id === cid ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
        <button class="btn ok" id="scGen">إنشاء رموز للطلاب الجدد</button><button class="btn ghost" id="scAll">إنشاء لكل فصول القسم</button><button class="btn ghost" id="scPr">${I.print || ''} طباعة البطاقات</button><button class="btn ghost" id="scX">Excel</button><a class="btn ghost" href="me.html" target="_blank" rel="noopener">فتح صفحة «حسابي»</a></div>
      <div id="scB"><div class="spinner"></div></div></div>`;
    const B = $('#scB', root);
    let L = [];
    const draw = async () => {
      B.innerHTML = '<div class="spinner"></div>';
      try { L = await rpc('student_codes_list', { p_class: cid }); } catch (e) { B.innerHTML = A.emptyBox('تعذّر التحميل', esc(e.message)); return; }
      const withC = L.filter(x => x.code), act = withC.filter(x => x.active), used = withC.filter(x => x.logins > 0);
      B.innerHTML = `<div class="pal-k" style="margin-bottom:10px"><div class="k"><b>${AR(L.length)}</b>طالب</div><div class="k ${withC.length < L.length ? 'warn' : 'ok'}"><b>${AR(withC.length)}</b>لديهم رمز</div><div class="k info"><b>${AR(used.length)}</b>دخلوا مرة على الأقل</div><div class="k ${act.length < withC.length ? 'bad' : ''}"><b>${AR(withC.length - act.length)}</b>حساب موقوف</div></div>
        <div class="scroll"><table class="tbl"><thead><tr><th>الطالب</th><th>الرمز</th><th>آخر دخول</th><th>الحالة</th><th></th></tr></thead><tbody>${L.map(x => `<tr><td style="text-align:start"><b>${esc(x.name)}</b>${x.no ? `<div class="small muted">${esc(x.no)}</div>` : ''}</td>
          <td>${x.code ? `<code dir="ltr" style="font-size:15px;letter-spacing:2px">${esc(x.code)}</code>` : '<span class="small muted">—</span>'}</td>
          <td class="small">${x.last ? esc(A.fmtDT ? A.fmtDT(x.last) : x.last) + ` <span class="muted">(${AR(x.logins)})</span>` : '<span class="muted">لم يدخل</span>'}</td>
          <td>${!x.code ? '' : x.active ? '<span class="pill st-approved">نشط</span>' : '<span class="pill st-returned">موقوف</span>'}</td>
          <td class="row" style="gap:4px;flex-wrap:wrap">${x.code ? `<button class="btn ghost sm" data-cp="${x.id}">نسخ الرابط</button>${waNum(x.phone) ? `<a class="btn ghost sm" target="_blank" rel="noopener" href="https://wa.me/${waNum(x.phone)}?text=${encodeURIComponent(`ولي أمر الطالب ${x.name}،\nهذا رمز دخول «حسابي» في منصة مدارس دينا: ${x.code}\nالرابط: ${link(x.code)}`)}">واتساب</a>` : ''}<button class="btn ghost sm" data-tg="${x.id}" data-v="${x.active ? 0 : 1}">${x.active ? 'إيقاف' : 'تفعيل'}</button>` : ''}<button class="btn ghost sm" data-rg="${x.id}">${x.code ? 'رمز جديد' : 'إنشاء رمز'}</button></td></tr>`).join('') || `<tr><td colspan="5">${A.emptyBox('لا يوجد طلاب في هذا الفصل', 'أضف الطلاب من «الحضور والسلوك».')}</td></tr>`}</tbody></table></div>`;
      const X = id => L.find(x => x.id === id);
      $$('[data-cp]', B).forEach(b => b.onclick = () => { const x = X(b.dataset.cp); navigator.clipboard.writeText(`${x.name}\nرمز الدخول: ${x.code}\n${link(x.code)}`).then(() => A.toast('نُسخ', 'ok')); });
      $$('[data-tg]', B).forEach(b => b.onclick = () => A.run(b, async () => { await rpc('student_code_toggle', { p_student: b.dataset.tg, p_active: b.dataset.v === '1' }); draw(); }));
      $$('[data-rg]', B).forEach(b => b.onclick = async () => { const x = X(b.dataset.rg); if (x.code && !(await A.confirmBox(`إنشاء رمز جديد لـ «${esc(x.name)}»؟ الرمز الحالي يتوقف فوراً.`, 'رمز جديد'))) return; A.run(b, async () => { await rpc('student_codes_gen', { p_class: cid, p_student: x.id }); draw(); A.toast('أُنشئ الرمز', 'ok'); }); });
    };
    $('#scC', root).onchange = e => { cid = e.target.value; A.LS.set('sc_c', cid); draw(); };
    $('#scGen', root).onclick = e => A.run(e.currentTarget, async () => { const r = await rpc('student_codes_gen', { p_class: cid, p_student: null }); A.toast(r.created ? `أُنشئ ${AR(r.created)} رمز` : 'كل الطلاب لديهم رموز', 'ok'); draw(); });
    $('#scAll', root).onclick = e => A.run(e.currentTarget, async () => { if (!(await A.confirmBox(`إنشاء رموز للطلاب الذين ليس لديهم رمز في ${AR(cls.length)} فصل؟ الرموز الحالية لا تتغير.`, 'إنشاء'))) return; let n = 0; for (const c of cls) n += (await rpc('student_codes_gen', { p_class: c.id, p_student: null })).created || 0; A.toast(`أُنشئ ${AR(n)} رمز`, 'ok'); draw(); });
    $('#scPr', root).onclick = e => A.run(e.currentTarget, async () => { const q = await loadQR(); const l = L.filter(x => x.code && x.active); if (!l.length) throw new Error('لا توجد رموز نشطة في هذا الفصل'); const c = cls.find(x => x.id === cid) || {};
      A.printDoc(`بطاقات دخول الطلاب — ${c.name || ''}`, `${S.school.name} · رابط «حسابي»: ${base()}me.html`, `<style>.cards{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.sc{border:2px solid #082B5A;border-radius:14px;padding:10px 12px;display:flex;gap:10px;align-items:center;break-inside:avoid}.sc .qr{width:90px;height:90px;flex:none}.sc .qr svg{width:100%;height:100%}.sc b{font-size:15px}.sc .cd{font-family:'Myriad Pro',monospace;font-size:20px;letter-spacing:3px;direction:ltr;color:#005499;font-weight:800}.sc small{display:block;color:#5b6b7d}</style>
        <div class="cards">${l.map(x => `<div class="sc"><div class="qr">${qrSvg(q, link(x.code))}</div><div><small>مدارس دينا العالمية — حسابي</small><b>${esc(x.name)}</b><small>${esc(c.name || '')}</small><div class="cd">${esc(x.code)}</div><small>امسح الرمز أو ادخل: ${esc(base().replace(/^https?:\/\//, ''))}me.html</small></div></div>`).join('')}</div>`, false); });
    $('#scX', root).onclick = () => { const c = cls.find(x => x.id === cid) || {}; const ws = XLSX.utils.json_to_sheet(L.map(x => ({ 'الطالب': x.name, 'رقم الطالب': x.no || '', 'الرمز': x.code || '', 'الرابط': x.code ? link(x.code) : '', 'جوال ولي الأمر': x.phone || '', 'الحالة': !x.code ? '' : x.active ? 'نشط' : 'موقوف', 'مرات الدخول': x.logins }))); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'الرموز'); XLSX.writeFile(wb, `رموز الطلاب - ${c.name || ''}.xlsx`); };
    draw();
  };
})();
