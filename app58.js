/* منصة دينا — الواجب الإلكتروني برابط:
   - زر «واجب إلكتروني» سريع في تبويب الاختبارات وفي صفحة «متابعة الواجبات» (إعدادات مناسبة للواجب مسبقاً).
   - تنسيق نافذة المشاركة (رمز QR، عرض على الشاشة) ومؤشر النتائج اللحظية. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { $ } = A;
  const HW = { kind: 'homework', title: '', settings: { attempts: 2, show: 'after_submit', time: 0, shuffle: true } };
  const css = `
  .hw-sh{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}
  .hw-qr{width:132px;height:132px;padding:8px;border:1px solid #DCE7F3;border-radius:14px;background:#fff;flex:none}.hw-qr svg{width:100%;height:100%;display:block}
  .hw-chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
  .hw-big{position:fixed;inset:0;z-index:9999;background:radial-gradient(circle at 30% 20%,#0B4C8C,#082B5A 60%);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:24px;text-align:center}
  .hw-big h2{font-size:clamp(24px,4vw,44px);margin:0}.hw-big p{margin:0;color:#BFD7EE;font-size:clamp(15px,2vw,22px)}
  .hw-bqr{background:#fff;border-radius:24px;padding:18px;width:min(62vh,78vw);aspect-ratio:1;box-shadow:0 20px 60px rgba(0,0,0,.35)}.hw-bqr svg{width:100%;height:100%;display:block}
  .hw-big code{background:rgba(255,255,255,.1);border-radius:10px;padding:6px 12px;font-size:clamp(12px,1.6vw,18px);word-break:break-all}
  .hw-big .hw-chips span{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:99px;padding:4px 12px}
  .hw-bx{position:absolute;top:16px;inset-inline-end:16px;width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.15);color:#fff;font-size:26px;cursor:pointer}.hw-lg{height:54px}
  .hw-live{display:inline-flex;align-items:center;gap:8px;margin:0 0 10px;padding:6px 12px;border-radius:99px;background:#E8F5EE;color:#1F6E45;font-weight:700;font-size:13px}
  .hw-live i{width:9px;height:9px;border-radius:50%;background:#2E8B57;box-shadow:0 0 0 0 rgba(46,139,87,.6);animation:hwp 1.6s infinite}
  @keyframes hwp{70%{box-shadow:0 0 0 9px rgba(46,139,87,0)}100%{box-shadow:0 0 0 0 rgba(46,139,87,0)}}
  @media (prefers-reduced-motion:reduce){.hw-live i{animation:none}}
  .hw-new{background:linear-gradient(180deg,#2E8B57,#23704A)!important;color:#fff!important}`;
  if (!document.getElementById('app58css')) { const st = document.createElement('style'); st.id = 'app58css'; st.textContent = css; document.head.appendChild(st); }

  const newHw = root => A._assess && A._assess.quizEditor(JSON.parse(JSON.stringify(HW)), () => V.assess(root));
  // زر سريع بجانب «اختبار / ورقة عمل»
  const as0 = V.assess;
  if (as0) V.assess = function (root) {
    const r = as0.apply(this, arguments);
    const arm = () => { const n = root.querySelector('#zNew'); if (n && !root.querySelector('#zHw') && (!A.canHw || A.canHw())) { const b = document.createElement('button'); b.className = 'btn hw-new'; b.id = 'zHw'; b.type = 'button'; b.innerHTML = `${A.I.plus || ''} واجب إلكتروني برابط`; b.title = 'واجب تفاعلي للطلاب برابط ورمز QR، بمحاولتين وترتيب عشوائي (يمكن تغييرها)'; b.onclick = () => newHw(root); n.parentNode.insertBefore(b, n); }
      if (sessionStorage.getItem('dina_new_hw') && n) { sessionStorage.removeItem('dina_new_hw'); newHw(root); } };
    const o = new MutationObserver(arm); o.observe(root, { childList: true, subtree: true }); setTimeout(() => o.disconnect(), 60000); arm();
    return r;
  };
  // من «متابعة الواجبات»
  const hw0 = V.hwf;
  if (hw0) V.hwf = async function (root) {
    const r = await hw0.apply(this, arguments);
    const head = root.querySelector('.card .head'); if (head && !root.querySelector('#hwNew') && A.canAssess && A.canAssess() && (!A.canHw || A.canHw())) {
      const b = document.createElement('button'); b.className = 'btn hw-new'; b.id = 'hwNew'; b.type = 'button'; b.innerHTML = `${A.I.plus || ''} واجب إلكتروني برابط`;
      b.onclick = () => { try { sessionStorage.setItem('dina_new_hw', '1'); } catch (_) { } A.LS.set('as_t', 'quizzes'); location.hash = '#/assess'; };
      head.appendChild(b);
    }
    return r;
  };
})();
