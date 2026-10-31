/* منصة دينا — مبدّل اللغة (العربية / English).
   يترجم واجهة العرض فقط: النصوص الثابتة والعناوين والتلميحات. لا يمس أي بيانات محفوظة ولا ما يكتبه المعلمون في الحقول.
   الاختيار يُحفظ على هذا الجهاز (dina_lang). */
(function () {
  let L = 'ar'; try { L = localStorage.getItem('dina_lang') === 'en' ? 'en' : 'ar'; } catch (_) {}
  const q = new URLSearchParams(location.search).get('lang'); if (q === 'en' || q === 'ar') { L = q; try { localStorage.setItem('dina_lang', q); } catch (_) {} }
  window.DINA_LANG = L;
  window.setDinaLang = l => { try { localStorage.setItem('dina_lang', l); } catch (_) {} const u = new URL(location.href); u.searchParams.delete('lang'); location.replace(u.toString()); };
  window.dinaT = s => s;
  // زر تبديل عائم (يختفي داخل المنصة بعد الدخول لأن قائمة الحساب فيها زر اللغة)
  const fab = () => { if (document.querySelector('.dina-lang-fab')) return; const b = document.createElement('button'); b.type = 'button'; b.className = 'dina-lang-fab noi18n'; b.textContent = L === 'en' ? 'العربية' : 'English'; b.setAttribute('aria-label', L === 'en' ? 'التبديل إلى العربية' : 'Switch to English'); b.onclick = () => setDinaLang(L === 'en' ? 'ar' : 'en');
    const st = document.createElement('style'); st.textContent = '.dina-lang-fab{position:fixed;bottom:16px;inset-inline-start:16px;z-index:9000;border:1px solid #d6dde8;background:#fff;color:#0f2b5b;font:700 13px/1 Tajawal,system-ui,sans-serif;padding:9px 14px;border-radius:999px;box-shadow:0 4px 14px rgba(15,43,91,.15);cursor:pointer}.dina-lang-fab:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}body:has(#ub) .dina-lang-fab{display:none}@media print{.dina-lang-fab{display:none}}';
    document.head.appendChild(st); document.body.appendChild(b); };
  if (document.body) fab(); else document.addEventListener('DOMContentLoaded', fab);
  if (L !== 'en') return;
  const D = window.DINA_EN || {};
  document.documentElement.lang = 'en'; document.documentElement.dir = 'ltr'; document.documentElement.classList.add('lang-en');

  const AR = /[؀-ۿ]/, WORD = /[؀-ۿـً-ٰٟ]+/g;
  const DIG = s => s.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  const PUN = s => s.replace(/،\s*/g, ', ').replace(/؛/g, ';').replace(/؟/g, '?').replace(/٪/g, '%').replace(/[«»]/g, '"').replace(/[‎‏]/g, '').replace(/(\d{1,2}:\d{2})\s*ص/g, '$1 AM').replace(/(\d{1,2}:\d{2})\s*م(?![؀-ۿ])/g, '$1 PM');
  const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const keys = Object.keys(D).sort((a, b) => b.length - a.length);
  const multi = keys.filter(k => /\s/.test(k) || k.length > 12);
  const RM = multi.length ? new RegExp('(?<![\\u0600-\\u06FF])(?:' + multi.map(esc).join('|') + ')(?![\\u0600-\\u06FF])', 'g') : null;
  const cache = new Map();
  const ORD = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth', 'Thirteenth', 'Fourteenth', 'Fifteenth', 'Sixteenth', 'Seventeenth', 'Eighteenth', 'Nineteenth', 'Twentieth', 'Twenty-first', 'Twenty-second', 'Twenty-third', 'Twenty-fourth', 'Twenty-fifth'];
  const PL = { period: 'periods', class: 'classes', student: 'students', teacher: 'teachers', lesson: 'lessons', day: 'days', week: 'weeks', question: 'questions', subject: 'subjects', attempt: 'attempts', result: 'results', minute: 'minutes', hour: 'hours', cell: 'cells', 'staff member': 'staff members', person: 'people', line: 'lines', quiz: 'quizzes', page: 'pages', file: 'files', link: 'links', referral: 'referrals', report: 'reports', plan: 'plans', section: 'sections', user: 'users', task: 'tasks', change: 'changes' };
  const RPL = new RegExp('\\b(\\d+) (' + Object.keys(PL).join('|') + ')\\b', 'gi');
  const POST = s => s.replace(new RegExp('\\bWeek (' + ORD.join('|') + ')\\b', 'g'), (m, o) => 'Week ' + (ORD.indexOf(o) + 1))
    .replace(RPL, (m, n, w) => +n === 1 ? m : n + ' ' + (PL[w.toLowerCase()] || w))
    .replace(/\b(\d+) (periods|classes|students|teachers|lessons|days|weeks|questions|subjects) (period|class|student|teacher|lesson|day|week|question|subject)\b/g, '$1 $2');

  function core(t) { const m = t.match(/^([\s()[\].,:;\-–—·•+*/=>«»"'%٪،؛0-9٠-٩]*)([\s\S]*?)([\s()[\].,:;\-–—·•+*/=<«»"'،؛]*)$/); return m || [t, '', t, '']; }
  function tr(s) {
    if (!s || !AR.test(s)) return /[٠-٩‏]/.test(s || '') ? PUN(DIG(s)) : s;
    if (cache.has(s)) return cache.get(s);
    const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0], t = DIG(s.trim()).replace(/(\d+) من (\d+)/g, '$1 \u0001of\u0002 $2');
    let out = null;
    if (D[t] !== undefined) out = D[t];
    else { const [, a, c, b] = core(t); if (c && D[c] !== undefined) out = a + D[c] + b; }
    if (out === null) {
      // استبدال العبارات المعروفة، ثم الكلمات المفردة إن لم يبقَ بعدها إلا ما نعرفه (أو أسماء قليلة)
      let hit = 0, x = RM ? t.replace(RM, m => { hit++; return '\u0001' + D[m] + '\u0002'; }) : t;
      const left = (x.replace(/\u0001[^\u0002]*\u0002/g, ' ').match(WORD) || []);
      const unknown = left.filter(w => D[w] === undefined && D[w.replace(/^(و|ب|ل|ف)/, '')] === undefined);
      if (!unknown.length || (hit && unknown.length <= 3)) {
        x = x.replace(/\u0001[^\u0002]*\u0002/g, m => m).split(/(\u0001[^\u0002]*\u0002)/).map(seg => seg.startsWith('\u0001') ? seg : seg.replace(WORD, (w, off, str) => (w === 'أ' && str[off + 1] === '.') ? w : D[w] !== undefined ? D[w] : (unknown.length ? w : (D[w.replace(/^(و)/, '')] !== undefined ? 'and ' + D[w.replace(/^و/, '')] : w)))).join('');
        out = x.replace(/[\u0001\u0002]/g, '');
      } else out = t;
    }
    out = POST(String(out).replace(/[\u0001\u0002]/g, ''));
    out = lead + PUN(DIG(out)).replace(/\s{2,}/g, ' ') + trail;
    if (cache.size > 20000) cache.clear(); cache.set(s, out); return out;
  }
  window.dinaT = tr;

  const SKIP = 'script,style,textarea,code,pre,[contenteditable=""],[contenteditable="true"],.noi18n,[data-noi18n]';
  const ATTR = ['placeholder', 'title', 'aria-label', 'alt'];
  const done = new WeakMap();
  function doText(n) {
    const v = n.nodeValue; if (!v || done.get(n) === v) return;
    const p = n.parentElement; if (!p || p.closest(SKIP)) return;
    const o = tr(v); if (o !== v) n.nodeValue = o; done.set(n, n.nodeValue);
  }
  function doEl(el) {
    if (el.closest && el.closest(SKIP)) return;
    for (const a of ATTR) { const v = el.getAttribute && el.getAttribute(a); if (v && (AR.test(v) || /[٠-٩]/.test(v))) el.setAttribute(a, tr(v)); }
    if (el.tagName === 'INPUT' && (el.type === 'button' || el.type === 'submit') && AR.test(el.value)) el.value = tr(el.value);
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) { if (root.closest(SKIP)) return; doEl(root); }
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeType === 1 && n.matches(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    let n; while ((n = w.nextNode())) n.nodeType === 3 ? doText(n) : doEl(n);
  }
  let pend = new Set(), raf = 0;
  const flush = () => { raf = 0; const L2 = [...pend]; pend.clear(); L2.forEach(n => { if (n.isConnected) walk(n); }); };
  const obs = new MutationObserver(ms => { for (const m of ms) { if (m.type === 'childList') m.addedNodes.forEach(n => pend.add(n)); else if (m.type === 'characterData') pend.add(m.target); else if (m.type === 'attributes') pend.add(m.target); } if (!raf) raf = requestAnimationFrame(flush); });
  const start = () => { document.title = tr(document.title); walk(document.body); obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTR }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  const tObs = new MutationObserver(() => { const t = tr(document.title); if (t !== document.title) document.title = t; });
  document.addEventListener('DOMContentLoaded', () => { const te = document.querySelector('title'); if (te) tObs.observe(te, { childList: true }); });
  // نوافذ المتصفح
  const _c = window.confirm.bind(window), _a = window.alert.bind(window), _p = window.prompt.bind(window);
  window.confirm = m => _c(tr(String(m))); window.alert = m => _a(tr(String(m))); window.prompt = (m, d) => _p(tr(String(m)), d);
  // التنسيق الرقمي والتواريخ: أرقام لاتينية
  const _tl = Number.prototype.toLocaleString; Number.prototype.toLocaleString = function (loc, o) { return _tl.call(this, typeof loc === 'string' && loc.startsWith('ar') ? 'en-US' : loc, o); };
})();
