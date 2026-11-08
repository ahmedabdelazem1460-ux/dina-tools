/* منصة دينا — كتابة الأرقام بالعربي أو الإنجليزي حسب لوحة المفاتيح.
   1) الخط الأساسي (GE SS Two) يرسم الأرقام الإنجليزية بأشكال عربية، فتبدو كل الأرقام عربية مهما كانت اللوحة.
      في حقول الإدخال تُرسم الأرقام الإنجليزية بخط الهوية اللاتيني (Myriad Pro)، فيظهر الرقم كما كُتب.
   2) حقول الأرقام (type=number) ترفض الأرقام العربية في المتصفحات؛ فتصبح حقولاً نصية بلوحة أرقام
      (inputmode=decimal) تقبل الصيغتين وتعرض ما كُتب كما هو، بينما تُقرأ قيمتها برمجياً بالصيغة الرقمية
      الإنجليزية دائماً، فلا يتغير أي حساب أو حفظ. أسهم الأعلى/الأسفل تعمل كما كانت.
   3) القيم التي تملؤها المنصة في حقول الأرقام تُعرض بالأرقام العربية كما في بقية الواجهة. */
(function () {
  if (window.__dinaDigits) return; window.__dinaDigits = true;
  const RE = /[٠-٩۰-۹٫٬]/;
  const toLatin = s => String(s == null ? '' : s)
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/٫/g, '.').replace(/٬/g, '');
  const toArabic = s => String(s == null ? '' : s).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]).replace(/\./g, '٫');
  window.dinaLatinDigits = toLatin;

  // ---------- 1) خط الأرقام في الحقول ----------
  const me = document.currentScript && document.currentScript.src;
  const base = me ? me.replace(/digits\.js.*$/, '') : '';
  const st = document.createElement('style'); st.id = 'dinaDigitsCss';
  st.textContent = `
  @font-face{font-family:'Dina Digits';font-weight:100 500;src:url(${base}fonts/myriad-pro-regular.woff2) format('woff2');unicode-range:U+0030-0039,U+002E,U+0025;font-display:swap}
  @font-face{font-family:'Dina Digits';font-weight:600;src:url(${base}fonts/myriad-pro-semibold.woff2) format('woff2');unicode-range:U+0030-0039,U+002E,U+0025;font-display:swap}
  @font-face{font-family:'Dina Digits';font-weight:700 900;src:url(${base}fonts/myriad-pro-bold.woff2) format('woff2');unicode-range:U+0030-0039,U+002E,U+0025;font-display:swap}
  .bar input[data-numx]{width:52px}`;
  (document.head || document.documentElement).appendChild(st);
  const fontFix = () => {
    const ff = getComputedStyle(document.body).fontFamily || 'sans-serif';
    if (/Dina Digits/.test(ff)) return;
    const s2 = document.getElementById('dinaDigitsFF') || document.createElement('style'); s2.id = 'dinaDigitsFF';
    s2.textContent = `input:not([type=checkbox]):not([type=radio]),textarea{font-family:'Dina Digits',${ff} !important}`;
    document.head.appendChild(s2);
  };

  // ---------- 2) حقول الأرقام ----------
  const VD = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  const isNumish = el => {
    if (!el || el.tagName !== 'INPUT') return false;
    const t = (el.type || '').toLowerCase(), m = (el.getAttribute('inputmode') || '').toLowerCase();
    return t === 'number' || t === 'tel' || m === 'numeric' || m === 'decimal' || m === 'tel' || el.hasAttribute('data-num');
  };
  function prep(el) {
    if (el.__dd || !isNumish(el)) return; el.__dd = true;
    const wasNum = el.type === 'number';
    const raw = VD.get.call(el);
    if (wasNum) {
      el.dataset.numx = '1';
      if (!el.hasAttribute('inputmode')) el.setAttribute('inputmode', 'decimal');
      el.setAttribute('autocomplete', 'off');
      try { el.type = 'text'; } catch (_) { }
    }
    // القراءة دائماً بالأرقام الإنجليزية؛ ما تكتبه المنصة في حقول الأرقام يُعرض بالعربية كبقية الواجهة
    Object.defineProperty(el, 'value', {
      configurable: true,
      get() { return toLatin(VD.get.call(this)); },
      set(v) { VD.set.call(this, this.dataset.numx ? toArabic(v) : v); }
    });
    if (wasNum && raw !== '') el.value = raw;
  }
  // تنظيف الحقل الرقمي من غير الأرقام مع إبقاء ما كُتب بصيغته
  document.addEventListener('input', e => {
    const el = e.target; if (!el || !el.dataset || !el.dataset.numx || e.isComposing) return;
    const v = VD.get.call(el), c = v.replace(/[^0-9٠-٩۰-۹.٫,\-]/g, '').replace(/,/g, '.');
    if (c !== v) { const p = Math.max(0, el.selectionStart - (v.length - c.length)); VD.set.call(el, c); try { el.setSelectionRange(p, p); } catch (_) { } }
  }, true);
  // أسهم لوحة المفاتيح كما في حقل الأرقام الأصلي
  document.addEventListener('keydown', e => {
    const el = e.target; if (!el || !el.dataset || !el.dataset.numx || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const step = parseFloat(el.getAttribute('step')) || 1, mn = parseFloat(el.getAttribute('min')), mx = parseFloat(el.getAttribute('max'));
    let v = parseFloat(el.value); if (!isFinite(v)) v = isFinite(mn) ? mn : 0; else v += e.key === 'ArrowUp' ? step : -step;
    if (isFinite(mn)) v = Math.max(mn, v); if (isFinite(mx)) v = Math.min(mx, v);
    const dec = (String(step).split('.')[1] || '').length; v = +v.toFixed(dec);
    const cur = VD.get.call(el), arab = !cur || RE.test(cur);
    VD.set.call(el, arab ? toArabic(v) : String(v));
    el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  }, true);

  const scan = root => { if (!root || root.nodeType !== 1) return; if (root.tagName === 'INPUT') prep(root); else root.querySelectorAll('input').forEach(prep); };
  const start = () => {
    fontFix(); scan(document.documentElement);
    new MutationObserver(ms => ms.forEach(m => { if (m.type === 'attributes') prep(m.target); else m.addedNodes.forEach(scan); }))
      .observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['type', 'inputmode'] });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
  // حقل يُنشأ ويُركَّز قبل وصول المراقب: يُعالَج عند أول تركيز
  document.addEventListener('focusin', e => { if (e.target && e.target.tagName === 'INPUT') prep(e.target); }, true);
})();
