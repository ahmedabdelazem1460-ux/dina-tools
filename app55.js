/* منصة دينا — الأرقام التفاعلية في كل المنصة (طبقة عامة):
   أي بطاقة رقمية (.kpi) ما زالت ثابتة ولها جدول بيانات في الصفحة نفسها تصبح قابلة للضغط،
   فتعرض بيانات الجدول كاملة في نافذة تفاعلية (بحث، طباعة، Excel) عبر A.attDrill.
   البطاقات التي لها تفاصيل خاصة (أزرار أو data-*) لا تُمسّ. */
(function () {
  const A = window.APP; if (!A) return;
  const esc = A.esc;
  const SKIP = '.ovl, .modal, #printArea, [data-noauto]';

  // أقرب جدول بيانات بعد البطاقة داخل الحاوية نفسها
  function tableFor(k) {
    let host = k.parentElement;
    for (let i = 0; host && i < 4; i++, host = host.parentElement) {
      const t = [...host.querySelectorAll('table.tbl')].find(t => !t.closest('.kpi') && (k.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) && t.tBodies[0] && t.tBodies[0].rows.length);
      if (t) return t;
    }
    return null;
  }
  const txt = el => (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();

  function open(k) {
    const t = tableFor(k); if (!t || !A.attDrill) return;
    const heads = [...(t.tHead ? t.tHead.rows[0].cells : [])].map(txt);
    const keep = heads.map((h, i) => i).filter(i => heads[i] !== '' || [...t.tBodies[0].rows].some(r => r.cells[i] && txt(r.cells[i]) && !r.cells[i].querySelector('button')));
    const rows = [...t.tBodies[0].rows].filter(r => r.cells.length > 1).map(r => {
      const cells = keep.map(i => { const c = r.cells[i]; if (!c) return ''; const s = c.querySelector('select'); const v = s ? (s.options[s.selectedIndex] || {}).text : c.querySelector('input') ? c.querySelector('input').value : txt(c); return esc(v || '—'); });
      return { cells, q: txt(r) };
    });
    const kk = k.querySelector('.k'), vv = k.querySelector('.v');
    A.attDrill({ title: kk ? txt(kk) : 'التفاصيل', sub: vv ? 'القيمة: ' + txt(vv) : '', cols: keep.map(i => heads[i] || ''), rows });
  }

  function arm(root) {
    (root || document).querySelectorAll('.kpi').forEach(k => {
      if (k.dataset.auto || k.tagName === 'BUTTON' || k.closest(SKIP) || k.closest('button,a') || [...k.attributes].some(a => a.name.startsWith('data-'))) return;
      if (!tableFor(k)) return;
      k.dataset.auto = '1'; k.classList.add('dz-auto'); k.tabIndex = 0; k.setAttribute('role', 'button');
      k.setAttribute('aria-label', (k.querySelector('.k') ? txt(k.querySelector('.k')) : 'التفاصيل') + ' — عرض البيانات');
      k.addEventListener('click', () => open(k));
      k.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(k); } });
    });
  }

  const css = `.kpi.dz-auto{cursor:pointer;transition:transform .15s,box-shadow .15s;position:relative}
  .kpi.dz-auto:hover,.kpi.dz-auto:focus-visible{transform:translateY(-2px);box-shadow:0 6px 18px rgba(8,43,90,.14);outline:none}
  .kpi.dz-auto:focus-visible{box-shadow:0 0 0 3px #3AB1DB}
  .kpi.dz-auto::after{content:'التفاصيل';position:absolute;inset-inline-end:10px;top:8px;font-size:11px;color:#005499;opacity:.75}
  @media print{.kpi.dz-auto::after{display:none}}`;
  if (!document.getElementById('app55css')) { const st = document.createElement('style'); st.id = 'app55css'; st.textContent = css; document.head.appendChild(st); }

  let tm = null;
  new MutationObserver(() => { clearTimeout(tm); tm = setTimeout(() => arm(document.getElementById('view') || document.body), 120); })
    .observe(document.body, { childList: true, subtree: true });
  window.addEventListener('load', () => arm());
})();
