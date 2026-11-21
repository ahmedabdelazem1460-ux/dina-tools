/* هوية المدرسة (المنتج متعدد المدارس) — window.DinaBrand
   الافتراضي هو هوية مدارس دينا تماماً، فلا يتغير شيء لدينا. لمدرسة أخرى تأتي الهوية من:
   ١) APP_CONFIG.brand (نشر مستقل لمدرسة بقاعدة بياناتها)  ٢) schools.settings.brand بعد الدخول (يُحفظ على الجهاز dina_brand)
   عند اختلاف الهوية: تُستبدل عبارات «دينا» في نصوص الواجهة وسماتها وصور الشعار تلقائياً (في الصفحة وإطارات الطباعة)،
   وتُطبَّق ألوان الهوية على متغيرات CSS. لا يمس البيانات المحفوظة ولا ما يكتبه المستخدمون في الحقول. */
(function () {
  if (window.DinaBrand) return;
  const DINA = { short: 'دينا', shortEn: 'Dina', name: 'مدارس دينا العالمية', nameEn: 'Dina International Schools', app: 'منصة دينا', platform: 'منصة دينا للتخطيط الدراسي',
    logo: 'assets/logo.svg', logoWhite: 'assets/logo_white.svg', mark: 'assets/mark.svg',
    colors: { navy: '#082B5A', blue: '#005499', sky: '#3AB1DB', green: '#2E8B57' },
    signers: { deputy: 'أحمد رضوان المالكي', academic: 'أحمد عبد العظيم صلاح', principal: 'إبراهيم حسن الفيفي' } };
  const read = () => { try { return JSON.parse(localStorage.getItem('dina_brand') || 'null'); } catch (_) { return null; } };
  const clean = o => { const r = {}; Object.entries(o || {}).forEach(([k, v]) => { if (v != null && v !== '' && !(typeof v === 'object' && !Object.keys(v).length)) r[k] = v; }); return r; };
  let B = null, isDina = true;
  function build(src) {
    const s = clean(src);
    const b = Object.assign({}, DINA, s, { colors: Object.assign({}, DINA.colors, clean(s.colors)) });
    const same = !src || ((!s.short || s.short === DINA.short) && (!s.name || s.name === DINA.name));
    // مدرسة أخرى: لا تُرث أسماء موقّعي دينا ولا شعارها
    if (!same) { b.signers = Object.assign({ deputy: '', academic: '', principal: '' }, clean(s.signers)); ['logo', 'logoWhite', 'mark'].forEach(k => { if (!s[k]) b[k] = k === 'logo' ? (s.logoWhite || s.mark || '') : k === 'logoWhite' ? (s.logo || s.mark || '') : (s.logo || s.logoWhite || ''); });
      if (!s.app) b.app = 'منصة ' + b.short; if (!s.platform) b.platform = 'منصة ' + b.short + ' للتخطيط الدراسي'; if (!s.shortEn) b.shortEn = s.nameEn || b.short; if (!s.nameEn) b.nameEn = b.name; }
    else b.signers = Object.assign({}, DINA.signers, clean(s.signers));
    isDina = same; return b;
  }
  B = build((window.APP_CONFIG || {}).brand || read());

  // ---------- الاستبدال في الواجهة ----------
  const AR = '\\u0600-\\u06FF';
  let PAIRS = [];
  const mkPairs = () => {
    const ws = s => new RegExp('(?<![' + AR + '])' + s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![' + AR + '])', 'g');
    PAIRS = [[ws(DINA.platform), B.platform], [ws(DINA.name), B.name], [ws('مدارس دينا'), B.name], [ws(DINA.app), B.app], [/Dina International Schools/g, B.nameEn], [/Dina Platform/g, B.shortEn + ' Platform'], [ws('دينا'), B.short], [/\bDina\b/g, B.shortEn]];
  };
  const fix = s => { if (isDina || !s || typeof s !== 'string' || !/دينا|Dina/.test(s)) return s; let t = s; PAIRS.forEach(([re, v]) => { t = t.replace(re, v); }); return t; };
  const LOGOS = [[/assets\/logo_white\.svg/, 'logoWhite'], [/assets\/logo\.svg/, 'logo'], [/assets\/mark\.svg/, 'mark']];
  // شعار بديل مولَّد (اسم المدرسة المختصر) لمدرسة لم ترفع شعارها بعد
  const genLogo = k => { const c = B.colors || DINA.colors, white = k === 'logoWhite', mark = k === 'mark', t = String(B.short || '').slice(0, 14), ini = (t.replace(/^ال/, '') || t).slice(0, 1), e = x => String(x).replace(/[&<>"]/g, ''), fg = white ? '#fff' : c.navy;
    const svg = mark ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${c.navy}"/><text x="32" y="41" font-family="Tahoma,Arial" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">${e(ini)}</text></svg>`
      : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 80"><rect x="176" y="10" width="60" height="60" rx="15" fill="${white ? 'rgba(255,255,255,.16)' : c.navy}"/><text x="206" y="51" font-family="Tahoma,Arial" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">${e(ini)}</text><text x="166" y="38" font-family="Tahoma,Arial" font-size="20" font-weight="700" fill="${fg}" text-anchor="end" direction="rtl">${e(t)}</text><text x="166" y="62" font-family="Tahoma,Arial" font-size="11" fill="${white ? 'rgba(255,255,255,.8)' : c.blue}" text-anchor="end" direction="rtl">${e(String(B.name || '').slice(0, 30))}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); };
  const logoOf = k => B[k] && !/^assets\//.test(B[k]) ? B[k] : genLogo(k);
  const fixImg = el => { const src = el.getAttribute('src') || ''; if (el.hasAttribute('data-brand-src')) return; for (const [re, k] of LOGOS) if (re.test(src)) { el.setAttribute('data-brand-src', src); el.setAttribute('src', logoOf(k)); break; } };
  const ATTRS = ['alt', 'title', 'placeholder', 'aria-label', 'content'];
  const SKIP = el => el && (el.closest && el.closest('input,textarea,[contenteditable="true"],.nobrand,script,style'));
  function walk(root) {
    if (isDina || !root) return;
    if (root.nodeType === 3) { if (!SKIP(root.parentElement)) { const t = fix(root.nodeValue); if (t !== root.nodeValue) root.nodeValue = t; } return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    const it = (root.ownerDocument || root).createTreeWalker(root, 1 | 4);
    let n = root.nodeType === 1 ? root : it.nextNode();
    for (; n; n = it.nextNode()) {
      if (n.nodeType === 3) { const p = n.parentElement; if (p && !SKIP(p) && /دينا|Dina/.test(n.nodeValue)) { const t = fix(n.nodeValue); if (t !== n.nodeValue) n.nodeValue = t; } continue; }
      if (n.tagName === 'IMG') fixImg(n);
      if (n.tagName === 'IFRAME') hookFrame(n);
      if (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA') { const ph = n.getAttribute('placeholder'); if (ph && /دينا|Dina/.test(ph)) n.setAttribute('placeholder', fix(ph)); continue; }
      for (const a of ATTRS) { const v = n.getAttribute && n.getAttribute(a); if (v && /دينا|Dina/.test(v)) n.setAttribute(a, fix(v)); }
    }
  }
  const observed = new WeakSet();
  function observe(doc) {
    if (isDina || !doc || observed.has(doc)) return; observed.add(doc);
    const go = () => { walk(doc.body || doc.documentElement); if (doc.title) doc.title = fix(doc.title); colorize(doc); };
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', go); else go();
    try {
      const mo = new (doc.defaultView || window).MutationObserver(ms => { for (const m of ms) { if (m.type === 'childList') m.addedNodes.forEach(walk); else if (m.type === 'characterData') walk(m.target); else if (m.type === 'attributes') walk(m.target); } if (doc.title && /دينا/.test(doc.title)) doc.title = fix(doc.title); });
      mo.observe(doc.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['src', 'alt', 'title', 'placeholder', 'aria-label'] });
    } catch (_) { }
  }
  function hookFrame(f) {
    const att = () => { try { const d = f.contentDocument; if (d) { observed.delete(d); observe(d); } } catch (_) { } };
    if (!f.__brandHook) { f.__brandHook = 1; f.addEventListener('load', att); }
    att();
  }
  // الألوان: متغيرات CSS العامة في المنصة والصفحات المستقلة
  function colorize(doc) {
    const c = B.colors || {}, d = DINA.colors; if (isDina && c.navy === d.navy && c.blue === d.blue && c.sky === d.sky && c.green === d.green) return;
    const r = (doc || document).documentElement; if (!r) return;
    if (c.navy) { r.style.setProperty('--navy', c.navy); r.style.setProperty('--ink', c.navy); }
    if (c.blue) r.style.setProperty('--blue', c.blue);
    if (c.sky) r.style.setProperty('--sky', c.sky);
    if (c.green) r.style.setProperty('--green', c.green);
  }

  function apply() { mkPairs(); colorize(document); if (!isDina) observe(document); }

  window.DinaBrand = {
    DINA,
    get: () => B,
    isDina: () => isDina,
    fix,
    sig: k => (B.signers || {})[k] || '',
    // تُستدعى بعد الدخول بهوية المدرسة من الإعدادات؛ persist يحفظها على الجهاز لصفحة الدخول والصفحات العامة
    set(src, persist) {
      const before = JSON.stringify(B); B = build(src); if (persist) { try { if (src && !isDina) localStorage.setItem('dina_brand', JSON.stringify(src)); else localStorage.removeItem('dina_brand'); } catch (_) { } }
      if (JSON.stringify(B) !== before) { apply(); if (!isDina) walk(document.body); }
      return B;
    },
    // معاينة دون حفظ (معالج التجهيز)
    preview: src => { const keep = B, kd = isDina; const r = build(src); r.logoOf = k => r[k] && !/^assets\//.test(r[k]) ? r[k] : (B = r, genLogo(k)); const out = Object.assign({}, r, { logo: r.logoOf('logo'), logoWhite: r.logoOf('logoWhite'), mark: r.logoOf('mark') }); B = keep; isDina = kd; return out; },
    logoOf: k => isDina ? DINA[k] : logoOf(k)
  };
  apply();
})();
