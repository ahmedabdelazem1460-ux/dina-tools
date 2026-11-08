/* منصة دينا — كتابة الأرقام بالعربي أو الإنجليزي حسب لوحة المفاتيح.
   حقول الأرقام في المتصفح ترفض الأرقام العربية (٠–٩) بصمت، فتُحوَّل لحظة الكتابة أو اللصق إلى صيغتها
   الرقمية حتى تُقبل وتُحسب صحيحاً. يشمل: حقول type=number و type=tel وكل حقل inputmode رقمي أو data-num.
   الحقول النصية الأخرى (الأسماء والملاحظات) تبقى كما يكتبها المستخدم. */
(function () {
  if (window.__dinaDigits) return; window.__dinaDigits = true;
  const RE = /[٠-٩۰-۹٫٬]/;
  const toLatin = s => String(s)
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
    .replace(/٫/g, '.').replace(/٬/g, '');
  window.dinaLatinDigits = toLatin;

  const isNumField = el => {
    if (!el || el.tagName !== 'INPUT' || el.readOnly || el.disabled) return false;
    const t = (el.type || '').toLowerCase(), m = (el.getAttribute('inputmode') || '').toLowerCase();
    return t === 'number' || t === 'tel' || m === 'numeric' || m === 'decimal' || m === 'tel' || el.hasAttribute('data-num');
  };
  // إدراج النص في موضع المؤشر مع إطلاق حدث input المعتاد (لتعمل كل المعالجات القائمة كما هي)
  const insert = (el, text) => {
    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (_) { ok = false; }
    if (ok) return;
    try { const s = el.selectionStart, e = el.selectionEnd; el.setRangeText(text, s, e, 'end'); }
    catch (_) { el.value = (el.value || '') + text; }
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };

  document.addEventListener('beforeinput', e => {
    const el = e.target;
    if (!e.data || !RE.test(e.data) || !isNumField(el)) return;
    if (e.inputType && !/^insert/.test(e.inputType)) return;
    if (e.isComposing) return;
    e.preventDefault();
    insert(el, toLatin(e.data));
  }, true);

  document.addEventListener('paste', e => {
    const el = e.target; if (!isNumField(el)) return;
    const t = (e.clipboardData || window.clipboardData)?.getData('text');
    if (!t || !RE.test(t)) return;
    e.preventDefault();
    insert(el, toLatin(t).trim());
  }, true);

  // احتياط لنظم الإدخال التي تكمل الكتابة بلا beforeinput (بعض لوحات الجوال): تصحيح القيمة بعد الإدخال
  const fix = e => {
    const el = e.target; if (!isNumField(el) || el.type === 'number') return;
    const v = el.value; if (!v || !RE.test(v)) return;
    const pos = el.selectionStart; el.value = toLatin(v);
    try { el.setSelectionRange(pos, pos); } catch (_) { }
  };
  document.addEventListener('input', fix, true);
  document.addEventListener('compositionend', fix, true);
})();
