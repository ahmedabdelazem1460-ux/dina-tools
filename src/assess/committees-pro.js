/* منصة دينا — اللجان الاحترافية V.lijan (يحل محل تبويب «لجان الاختبارات» المبسّط في V.paper)
   الجدول exam_committees (نفس البنية: rooms/seating/settings — متوافق مع ربط الاختبار الورقي وطباعة أرقام الجلوس).
   - توزيعات متعددة بمسميات، مسودة/معتمد، نسخ.
   - الطلاب حسب المراحل والصفوف والفصول، وأعداد لكل لجنة من كل صف/فصل (مصفوفة الأعداد) بمؤشرات المتبقي في اللجنة والصف.
   - طرق التوزيع والترتيب داخل اللجنة والترقيم، تثبيت طلاب، نقل وتبديل يدوي.
   - كروكي ثلاثي الأبعاد (lijan3d.js): مبانٍ وأدوار، موقع الباب (اللجنة يمين الداخل أو يساره)، السبورة، المقاعد، صورة اللجنة.
   - جدول الاختبارات، الطباعة الاحترافية (١٠ تقارير) وExcel، ورابط أولياء الأمور lijan.html (sql/112: lijan_public / lijan_find).
   الظهور: المالك، أو منحة «lijan» مع تفعيل المفتاح lijan. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc } = A;
  const AR = A.AR || (n => String(n));
  const L3 = () => window.DinaLijan;
  const own = () => !!(S.me && S.me.is_owner);
  const can = () => own() || (A.hasModule && A.hasModule('lijan') && !!(A.tfeat && A.tfeat('lijan')));
  const deep = o => JSON.parse(JSON.stringify(o));
  const DAYN = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const MODES = [['mix', 'تناوب الفصول (لا يتجاور طالبان من فصل واحد)'], ['grades', 'تناوب الصفوف الدراسية (رابع بجانب سادس)'], ['class', 'فصلاً فصلاً بالترتيب'], ['alpha_all', 'أبجدي لكل الطلاب'], ['number', 'حسب رقم الطالب'], ['random', 'عشوائي']];
  const INNER = [['mix', 'تناوب الفصول داخل اللجنة'], ['grades', 'تناوب الصفوف داخل اللجنة'], ['alpha', 'أبجدي داخل اللجنة'], ['class', 'حسب الفصل ثم أبجدي'], ['number', 'حسب رقم الطالب'], ['keep', 'كما وُزّعوا']];
  const NUMS = [['cont', 'متسلسل لكل اللجان'], ['room', 'يبدأ من البداية في كل لجنة'], ['room100', 'برقم اللجنة (١٠١، ١٠٢… ٢٠١…)']];
  const MARKS = [['gate', '🚪', 'البوابة'], ['stairs', '🪜', 'الدرج'], ['wc', '🚻', 'دورات المياه'], ['office', '🏢', 'الإدارة'], ['mosque', '🕌', 'المصلى'], ['clinic', '⛑️', 'العيادة'], ['lift', '🛗', 'المصعد'], ['other', '📍', 'موقع']];
  const TABS = [['cls', '١ الطلاب والفصول'], ['rooms', '٢ اللجان والأعداد'], ['seat', '٣ التوزيع والمقاعد'], ['map', '٤ الكروكي ثلاثي الأبعاد'], ['sched', '٥ جدول الاختبارات'], ['print', '٦ الطباعة والكشوف'], ['share', '٧ رابط أولياء الأمور']];
  const RDEF = { capacity: 20, w: 4, d: 3, x: 0, y: 0, f: 0, b: 0, door: 'r', board: 'near', rows: 5, cols: 4, from: 'door', snake: false };
  const SDEF = { mode: 'mix', inner: 'mix', num: 'cont', start: 1, prefix: '', pad: 0, by: 'grade', status: 'draft', sched: [], map: { blds: ['المبنى الرئيسي'], marks: [], floorNames: {} }, share: { on: false, lookup: 'id', photos: true, classes: true, proctors: false, msg: '' } };

  A.I.lijan = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h18"/><path d="M5 20V9l7-5 7 5v11"/><path d="M9 20v-5h6v5"/><path d="M9 11h.01M15 11h.01"/></svg>';
  if (A.NAV && !A.NAV.some(n => n[0] === 'lijan')) { const i = A.NAV.findIndex(n => n[0] === 'paper' || n[0] === 'assess'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['lijan', 'اللجان والمقاعد', () => can()]); }

  if (!document.getElementById('lj-css')) { const s = document.createElement('style'); s.id = 'lj-css'; s.textContent = `
  .lj-tabs{display:flex;gap:4px;overflow-x:auto;border-bottom:2px solid var(--pale);margin:6px 0 14px;scrollbar-width:thin}
  .lj-tabs button{border:0;background:none;padding:10px 12px;font-weight:800;color:var(--muted);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;white-space:nowrap;font:inherit;font-weight:800}
  .lj-tabs button.on{color:var(--navy);border-color:var(--sky)}
  .lj-tabs button:focus-visible{outline:3px solid var(--sky);outline-offset:-3px;border-radius:8px}
  .lj-hd{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
  .lj-hd .in{max-width:360px;font-weight:800;font-size:17px}
  .lj-kp{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin:8px 0 14px}
  .lj-kp div{background:#fff;border:1px solid var(--border);border-radius:14px;padding:10px 12px;box-shadow:var(--sh1)}
  .lj-kp b{display:block;font-size:24px;color:var(--navy);line-height:1.2}.lj-kp span{font-size:12px;color:var(--muted);font-weight:700}
  .lj-kp .bad b{color:#B3261E}.lj-kp .ok b{color:#23704A}
  .lj-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
  .lj-card{background:#fff;border:1px solid var(--border);border-radius:16px;padding:14px;box-shadow:var(--sh1);display:flex;flex-direction:column;gap:6px}
  .lj-card h4{margin:0;font-size:16px;color:var(--navy)}
  .lj-st{display:inline-block;border-radius:20px;padding:2px 10px;font-size:12px;font-weight:800}
  .lj-st.draft{background:#FFF4DC;color:#8A5A12}.lj-st.approved{background:#E5F4EA;color:#23704A}
  .lj-mx{border-collapse:separate;border-spacing:0;font-size:13px;min-width:100%}
  .lj-mx th,.lj-mx td{border-bottom:1px solid #EEF2F8;border-inline-start:1px solid #EEF2F8;padding:6px;text-align:center;white-space:nowrap}
  .lj-mx th{background:#F4F7FB;color:var(--navy);font-weight:800;position:sticky;top:0;z-index:1}
  .lj-mx th:first-child,.lj-mx td:first-child{position:sticky;inset-inline-start:0;background:#fff;z-index:2;text-align:start}
  .lj-mx th:first-child{background:#F4F7FB;z-index:3}
  .lj-mx input{width:54px;text-align:center;border:1.5px solid var(--border);border-radius:8px;padding:5px 2px;font:inherit;background:#FBFDFF}
  .lj-mx input:focus{outline:none;border-color:var(--sky);box-shadow:0 0 0 3px rgba(58,177,219,.25)}
  .lj-mx tfoot td{background:#F4F7FB;font-weight:800}
  .lj-left{font-size:11px;font-weight:800;border-radius:10px;padding:1px 7px;display:inline-block;margin-top:2px}
  .lj-left.z{background:#E5F4EA;color:#23704A}.lj-left.p{background:#FFF4DC;color:#8A5A12}.lj-left.n{background:#FDE7E4;color:#B3261E}
  .lj-rm{border:1px solid var(--border);border-radius:14px;padding:10px;margin-bottom:10px;background:#fff}
  .lj-rm .row{flex-wrap:wrap}
  .lj-rm .in{min-height:38px;padding:7px 10px}
  .lj-bar{height:8px;border-radius:6px;background:#EEF2F8;overflow:hidden;min-width:80px}.lj-bar i{display:block;height:100%;background:linear-gradient(90deg,#3AB1DB,#005499)}
  .lj-bar.over i{background:#E0675A}
  .lj-two{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:14px;align-items:start}
  @media(max-width:1000px){.lj-two{grid-template-columns:minmax(0,1fr)}}
  .lj-view{background:linear-gradient(180deg,#F7FAFE,#EAF1FA);border:1px solid var(--border);border-radius:16px;padding:8px;overflow:auto;text-align:center}
  .lj-view svg{max-width:100%;height:auto}
  .lj-topw{overflow:auto;border:1px solid var(--border);border-radius:12px;background:#fff;touch-action:none}
  .lj-topw svg{display:block;width:100%;min-width:560px;height:auto}
  .lj-props{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}
  .lj-props .field{margin:0}
  .lj-seg{display:inline-flex;border:1.5px solid var(--border);border-radius:10px;overflow:hidden}
  .lj-seg button{border:0;background:#fff;padding:7px 10px;font:inherit;font-weight:700;cursor:pointer;color:var(--muted)}
  .lj-seg button.on{background:var(--navy);color:#fff}
  .lj-room-chips{display:flex;gap:6px;flex-wrap:wrap;margin:6px 0}
  .lj-room-chips button{border:1.5px solid var(--border);background:#fff;border-radius:20px;padding:5px 12px;font:inherit;font-weight:700;cursor:pointer}
  .lj-room-chips button.on{background:var(--navy);color:#fff;border-color:var(--navy)}
  .lj-photo{max-width:100%;border-radius:12px;border:1px solid var(--border);margin-top:6px;max-height:220px;object-fit:cover}
  .lj-sched td .in{min-height:36px;padding:6px 8px}
  .lj-pr{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px}
  .lj-pr button{text-align:start;border:1px solid var(--border);background:#fff;border-radius:14px;padding:12px;cursor:pointer;font:inherit;box-shadow:var(--sh1)}
  .lj-pr button b{display:block;color:var(--navy);font-size:15px}.lj-pr button span{font-size:12px;color:var(--muted)}
  .lj-pr button:hover{border-color:var(--sky)}
  .lj-qr svg{width:150px;height:150px}
  .lj-locked{background:#FFF8E6!important}
  @media(max-width:560px){.lj-hd .in{max-width:100%}.lj-mx input{width:44px}.lj-kp{grid-template-columns:repeat(3,1fr);gap:6px}.lj-kp div{padding:7px 8px;border-radius:12px}.lj-kp b{font-size:18px}.lj-kp span{font-size:11px}}
  @media(prefers-reduced-motion:no-preference){.lj-pin{animation:ljb 1.2s ease-in-out infinite}@keyframes ljb{50%{transform:translateY(-5px)}}}
  `; document.head.appendChild(s); }

  // ---------- مساعدات ----------
  const clsOf = id => (A.cls && A.cls(id)) || (S.classes || []).find(c => c.id === id) || {};
  const clsName = id => clsOf(id).name || '';
  const gKey = c => (c.stage || (A.stageOf ? A.stageOf(c) : '')) + '|' + (c.grade_word || c.name);
  const gName = c => { try { return (A.gradeName && c.grade_word ? A.gradeName(c.grade_word, c.stage) : '') || c.name; } catch (_) { return c.name; } };
  const stageName = c => (A.stageOf ? A.stageOf(c) : c.stage) || 'أخرى';
  const cmpC = (a, b) => A.cmpCls ? A.cmpCls(a, b) : String(a.name).localeCompare(String(b.name), 'ar');
  const byN = (a, b) => String(a.name || a.full_name).localeCompare(String(b.name || b.full_name), 'ar');
  const byNo = (a, b) => String(a.no || '').localeCompare(String(b.no || ''), 'en', { numeric: true }) || byN(a, b);
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const interleave = lists => { const out = [], mx = Math.max(0, ...lists.map(l => l.length)); for (let i = 0; i < mx; i++) lists.forEach(l => { if (l[i]) out.push(l[i]); }); return out; };
  const tok = () => { const a = new Uint8Array(18); crypto.getRandomValues(a); return Array.from(a, b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join(''); };
  const pn = id => id ? (A.personName ? A.personName(id) : '') : '';
  const linkOf = c => location.href.split('#')[0].split('?')[0].replace(/[^/]*$/, '') + 'lijan.html?t=' + encodeURIComponent(((c.settings || {}).share || {}).token || '');
  const qrSvg = (txt, size) => { if (!window.qrcode || !txt) return ''; try { const q = qrcode(0, 'M'); q.addData(txt); q.make(); const n = q.getModuleCount(); let r = ''; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) r += `M${x},${y}h1v1h-1z`; return `<svg xmlns="http://www.w3.org/2000/svg" width="${size || 150}" height="${size || 150}" viewBox="-2 -2 ${n + 4} ${n + 4}" shape-rendering="crispEdges"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><path d="${r}" fill="#082B5A"/></svg>`; } catch (_) { return ''; } };
  const dayOf = d => { if (!d) return ''; const x = new Date(d + 'T12:00:00'); return isNaN(x) ? '' : DAYN[x.getDay()]; };
  const fmtD = d => { if (!d) return ''; try { return (A.arDate ? A.arDate(d) : '') || d; } catch (_) { return d; } };

  // ---------- الحالة ----------
  let E = null; // المسودة المفتوحة: {row, stu[], dirty, room (المختارة), floor, bld}
  const tab = () => A.LS.get('lj_tab') || 'cls';
  const ST = () => E.row.settings;
  const R = () => E.row.rooms;
  const keyOf = s => ST().by === 'class' ? s.class_id : gKey(clsOf(s.class_id));
  function groups() {
    const ids = E.row.class_ids.slice().sort((a, b) => cmpC(clsOf(a), clsOf(b))), G = [];
    ids.forEach(id => { const c = clsOf(id), k = ST().by === 'class' ? id : gKey(c); let g = G.find(x => x.k === k); if (!g) G.push(g = { k, name: ST().by === 'class' ? c.name : gName(c), stage: stageName(c), cls: [], n: 0 }); g.cls.push(id); });
    G.forEach(g => g.n = E.stu.filter(s => g.cls.includes(s.class_id)).length); return G;
  }
  const cap = () => R().reduce((a, r) => a + (+r.capacity || 0), 0);
  const quotaSum = (ri) => Object.values(R()[ri].quota || {}).reduce((a, n) => a + (+n || 0), 0);
  const quotaOf = k => R().reduce((a, r) => a + (+((r.quota || {})[k]) || 0), 0);
  const dirty = () => { E.dirty = true; const b = document.getElementById('ljSave'); if (b) b.classList.add('pulse'); const d = document.getElementById('ljDirty'); if (d) d.textContent = '● تغييرات غير محفوظة'; };
  const locked = () => ST().status === 'approved';

  async function loadStu() {
    const ids = E.row.class_ids; if (!ids.length) { E.stu = []; return; }
    let L = []; try { L = await api.list('students', { class_id: ids, active: true }); } catch (_) { }
    E.stu = L.map(s => ({ id: s.id, name: s.full_name, class_id: s.class_id, no: s.student_no || '', nid: s.national_id || '' }));
  }

  // ---------- التوزيع ----------
  function orderList(list, mode) {
    const byC = E.row.class_ids.slice().sort((a, b) => cmpC(clsOf(a), clsOf(b))).map(c => list.filter(s => s.class_id === c).sort(byN)).filter(l => l.length);
    if (mode === 'class' || mode === 'alpha') return byC.flat();
    if (mode === 'alpha_all') return list.slice().sort(byN);
    if (mode === 'number') return list.slice().sort(byNo);
    if (mode === 'random') return shuffle(list);
    if (mode === 'keep') return list.slice();
    if (mode === 'grades') { const G = {}; byC.forEach(l => { const k = gKey(clsOf(l[0].class_id)); (G[k] = G[k] || []).push(l); }); return interleave(Object.values(G).map(ls => interleave(ls)).sort((a, b) => b.length - a.length)); }
    return interleave(byC);
  }
  function distribute(keepLocked) {
    const RS = R(), st = ST(), fill = RS.map(() => []), used = new Set(), left = [];
    const ok = (r, s) => !(r.classes && r.classes.length) || r.classes.includes(s.class_id);
    const has = ri => fill[ri].length < (+RS[ri].capacity || 0);
    if (keepLocked) (E.row.seating || []).filter(x => x.lock && RS[x.room]).forEach(x => { const s = E.stu.find(z => z.id === x.student_id); if (s && !used.has(s.id)) { fill[x.room].push(Object.assign({}, s, { lock: true })); used.add(s.id); } });
    const pool = () => E.stu.filter(s => !used.has(s.id));
    // ١) الأعداد المحددة لكل لجنة من كل صف/فصل
    RS.forEach((r, ri) => Object.entries(r.quota || {}).forEach(([k, n]) => {
      let need = (+n || 0) - fill[ri].filter(s => keyOf(s) === k).length;
      if (need <= 0) return; const cand = orderList(pool().filter(s => keyOf(s) === k && ok(r, s)), st.mode === 'number' ? 'number' : st.mode === 'random' ? 'random' : st.mode === 'alpha_all' ? 'alpha_all' : 'mix');
      for (const s of cand) { if (need <= 0 || !has(ri)) break; fill[ri].push(s); used.add(s.id); need--; }
    }));
    // ٢) اللجان المقصورة على فصول بعينها
    RS.forEach((r, ri) => { if (!(r.classes && r.classes.length) || r.quotaOnly) return; for (const s of orderList(pool().filter(s => ok(r, s)), st.mode)) { if (!has(ri)) break; fill[ri].push(s); used.add(s.id); } });
    // ٣) الباقي على اللجان العامة بالترتيب
    for (const s of orderList(pool(), st.mode)) { const ri = RS.findIndex((r, i) => !r.quotaOnly && !(r.classes && r.classes.length) && has(i)); if (ri < 0) { left.push(s); continue; } fill[ri].push(s); used.add(s.id); }
    // الترتيب داخل اللجنة: المثبّتون في أماكنهم السابقة أولاً ثم الترتيب المختار
    const prev = {}; (E.row.seating || []).forEach(x => prev[x.student_id] = x);
    const seating = [];
    fill.forEach((L, ri) => { const lk = L.filter(s => s.lock).sort((a, b) => (prev[a.id].seat || 0) - (prev[b.id].seat || 0)), rest = orderList(L.filter(s => !s.lock), st.inner || 'mix'); [...lk, ...rest].forEach(s => seating.push({ student_id: s.id, name: s.name, class_id: s.class_id, room: ri, lock: !!s.lock })); });
    renumber(seating); E.row.seating = seating; E.left = left; return { n: seating.length, left: left.length };
  }
  function renumber(list) {
    const st = ST(), start = Math.max(0, parseInt(st.start, 10) || 1) , pad = +st.pad || 0; let n = start - 1;
    R().forEach((_, ri) => { let k = 0; list.filter(x => x.room === ri).forEach(x => { k++; n++; x.seat = st.num === 'room' ? start - 1 + k : st.num === 'room100' ? (ri + 1) * 100 + k : n; x.label = (st.prefix || '') + (pad ? String(x.seat).padStart(pad, '0') : String(x.seat)); }); });
    // ترتيب القائمة حسب اللجنة ثم المقعد
    list.sort((a, b) => a.room - b.room || a.seat - b.seat);
  }
  function autoQuota() {
    const G = groups(), RS = R(), C = RS.map(r => +r.capacity || 0), tot = C.reduce((a, b) => a + b, 0) || 1;
    RS.forEach(r => r.quota = {});
    G.forEach(g => { // توزيع نسبي بأكبر الباقي مع احترام سعة كل لجنة
      const raw = C.map(c => g.n * c / tot), base = raw.map(Math.floor); let rem = g.n - base.reduce((a, b) => a + b, 0);
      raw.map((v, i) => [v - base[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rem > 0) { base[i]++; rem--; } });
      base.forEach((n, i) => { if (n) RS[i].quota[g.k] = n; });
    });
  }

  // ---------- الصفحة ----------
  V.lijan = async function (root, o) {
    o = o || {}; if (root && root.id === 'ppB') o.embed = true;
    if (!can()) { if (o.embed) { root.innerHTML = A.emptyBox ? A.emptyBox('غير متاح') : ''; return; } root.innerHTML = ''; location.hash = '#/home'; return; }
    if (!L3()) { root.innerHTML = `<div class="card">${A.emptyBox('تعذّر تحميل محرك الكروكي — أعد تحميل الصفحة')}</div>`; return; }
    E && (E.root = root);
    const open = A.LS.get('lj_open');
    if (open && (!E || E.row.id !== open)) { try { const r = (await api.list('exam_committees', { id: open }))[0]; if (r) await openRow(r, root); else A.LS.set('lj_open', ''); } catch (_) { A.LS.set('lj_open', ''); } }
    if (E && A.LS.get('lj_open') === (E.row.id || 'new')) return editor(root);
    return listView(root, o);
  };
  async function openRow(r, root) {
    const row = deep(r); row.settings = Object.assign(deep(SDEF), row.settings || {}); row.settings.map = Object.assign(deep(SDEF.map), row.settings.map || {}); row.settings.share = Object.assign(deep(SDEF.share), row.settings.share || {});
    row.rooms = (row.rooms || []).map((x, i) => Object.assign({}, RDEF, { x: (i % 4) * 5, y: 0, f: Math.floor(i / 4) }, x)); row.seating = row.seating || []; row.class_ids = row.class_ids || [];
    E = { row, stu: [], dirty: false, room: 0, floor: 0, bld: 0, root }; await loadStu(); A.LS.set('lj_open', row.id || 'new');
  }
  async function listView(root, o) {
    const list = (await api.list('exam_committees', { school_id: S.school.id }, { order: 'created_at', desc: true })).filter(c => !c.section_id || c.section_id === S.sectionId);
    root.innerHTML = `${o.embed ? '' : `<div class="head"><div class="grow"><h2 style="margin:0">اللجان والمقاعد</h2><p class="sub" style="margin:2px 0 0">توزيع الطلاب على لجان الاختبار بأعداد مرنة لكل صف، أرقام جلوس، كروكي ثلاثي الأبعاد، كشوف احترافية، ورابط لأولياء الأمور.</p></div></div>`}
      <div class="row" style="gap:8px;margin:8px 0 12px;flex-wrap:wrap"><button class="btn" id="ljNew">${A.I.plus || '+'} توزيع لجان جديد</button><span class="small muted">احفظ أكثر من توزيع بأسماء مختلفة (مسودة)، واعتمد ما تريد.</span></div>
      <div class="lj-cards">${list.map(c => { const s = c.settings || {}, n = (c.seating || []).length, st = s.status === 'approved' ? 'approved' : 'draft'; return `<div class="lj-card"><div class="row" style="justify-content:space-between;gap:6px"><h4>${esc(c.title)}</h4><span class="lj-st ${st}">${st === 'approved' ? 'معتمد' : 'مسودة'}</span></div>
        <div class="small muted">${AR((c.rooms || []).length)} لجنة · ${AR(n)} طالباً · ${AR((c.class_ids || []).length)} فصلاً${(s.share || {}).on ? ' · 🔗 رابط مفعّل' : ''}</div><div class="small muted">${A.fmtDT ? A.fmtDT(c.created_at) : ''}</div>
        <div class="row" style="gap:6px;margin-top:4px;flex-wrap:wrap"><button class="btn sm" data-o="${c.id}">فتح</button><button class="btn ghost sm" data-c="${c.id}">نسخ</button><button class="btn bad sm" data-d="${c.id}" aria-label="حذف ${esc(c.title)}">حذف</button></div></div>`; }).join('') || `<div class="card" style="grid-column:1/-1">${A.emptyBox('لا توجد توزيعات بعد', 'ابدأ بـ«توزيع لجان جديد».')}</div>`}</div>`;
    $('#ljNew', root).onclick = async () => { await openRow({ title: (() => { const sc = (S.sections || []).find(x => x.id === S.sectionId) || S.section || {}, nm = sc.short_name || sc.name || ''; return 'لجان الاختبار' + (nm ? ' — ' + nm : ''); })(), class_ids: [], rooms: [Object.assign({ name: 'لجنة ١' }, RDEF), Object.assign({ name: 'لجنة ٢' }, RDEF, { x: 5 })], seating: [], settings: {} }, root); A.LS.set('lj_tab', 'cls'); editor(root); };
    $$('[data-o]', root).forEach(b => b.onclick = async () => { await openRow(list.find(c => c.id === b.dataset.o), root); editor(root); });
    $$('[data-c]', root).forEach(b => b.onclick = () => A.run(b, async () => { const c = deep(list.find(x => x.id === b.dataset.c)); delete c.id; delete c.created_at; c.title += ' (نسخة)'; c.settings = Object.assign({}, c.settings, { status: 'draft', share: Object.assign({}, (c.settings || {}).share, { on: false, token: '' }) }); c.created_by = S.me.id; await api.ins('exam_committees', c); A.toast('نُسخ التوزيع كمسودة', 'ok'); listView(root, o); }));
    $$('[data-d]', root).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذا التوزيع؟ (يُنقل إلى سلة المحذوفات)', 'حذف', true))) return; await api.del('exam_committees', b.dataset.d); listView(root, o); });
  }

  async function save(msg) {
    const r = E.row, body = { title: (r.title || '').trim() || 'لجان الاختبار', class_ids: r.class_ids, rooms: r.rooms.map(x => { const y = Object.assign({}, x); y.capacity = +y.capacity || 1; return y; }), seating: r.seating, settings: r.settings };
    if (r.id) await api.upd('exam_committees', r.id, body);
    else { const x = await api.ins('exam_committees', Object.assign(body, { school_id: S.school.id, section_id: S.sectionId, created_by: S.me.id })); const nr = Array.isArray(x) ? x[0] : x; if (nr && nr.id) { r.id = nr.id; r.created_at = nr.created_at; } else { const l = await api.list('exam_committees', { school_id: S.school.id }, { order: 'created_at', desc: true }); if (l[0]) r.id = l[0].id; } A.LS.set('lj_open', r.id); }
    E.dirty = false; A.toast(msg || 'حُفظ', 'ok');
  }

  function editor(root) {
    const r = E.row, st = r.settings, t = tab();
    root.innerHTML = `<div class="lj-hd"><button class="btn ghost sm" id="ljBack" aria-label="رجوع إلى قائمة التوزيعات">→ التوزيعات</button><input class="in" id="ljT" value="${esc(r.title)}" aria-label="اسم التوزيع"><span class="lj-st ${locked() ? 'approved' : 'draft'}">${locked() ? 'معتمد' : 'مسودة'}</span><span class="small muted" id="ljDirty">${E.dirty ? '● تغييرات غير محفوظة' : ''}</span><div class="grow"></div>
      <button class="btn ghost sm" id="ljSave">💾 حفظ ${locked() ? '' : 'كمسودة'}</button>${locked() ? '<button class="btn ghost sm" id="ljUn">إلغاء الاعتماد للتعديل</button>' : '<button class="btn ok sm" id="ljApp">✓ اعتماد</button>'}</div>
      <div class="lj-kp" id="ljKp"></div>
      <div class="lj-tabs" role="tablist">${TABS.map(([k, n]) => `<button role="tab" aria-selected="${k === t}" class="${k === t ? 'on' : ''}" data-tb="${k}">${n}</button>`).join('')}</div><div id="ljB"></div>`;
    $('#ljT', root).oninput = e => { r.title = e.target.value; dirty(); };
    $('#ljBack', root).onclick = async () => { if (E.dirty && !(await A.confirmBox('توجد تغييرات غير محفوظة. الخروج دون حفظ؟', 'خروج', true))) return; A.LS.set('lj_open', ''); E = null; V.lijan(root); };
    $('#ljSave', root).onclick = ev => A.run(ev.currentTarget, async () => { await save(); editor(root); });
    const ap = $('#ljApp', root); if (ap) ap.onclick = ev => A.run(ev.currentTarget, async () => {
      if (!r.seating.length) throw new Error('وزّع الطلاب أولاً (التبويب ٣)');
      const miss = E.stu.length - r.seating.length; if (miss > 0 && !(await A.confirmBox(`${AR(miss)} طالباً بلا لجنة. اعتماد التوزيع رغم ذلك؟`, 'اعتماد'))) return;
      st.status = 'approved'; st.approved_at = new Date().toISOString(); st.approved_by = S.me.id; await save('اعتُمد التوزيع — يُعتمد في الكشوف وأوراق الاختبار ورابط أولياء الأمور'); editor(root); });
    const un = $('#ljUn', root); if (un) un.onclick = ev => A.run(ev.currentTarget, async () => { st.status = 'draft'; await save('أُلغي الاعتماد — التوزيع مسودة قابلة للتعديل'); editor(root); });
    $$('[data-tb]', root).forEach(b => b.onclick = () => { A.LS.set('lj_tab', b.dataset.tb); editor(root); });
    kpis(); const box = $('#ljB', root);
    ({ cls: tCls, rooms: tRooms, seat: tSeat, map: tMap, sched: tSched, print: tPrint, share: tShare }[t] || tCls)(box, root);
  }
  function kpis() {
    const el = document.getElementById('ljKp'); if (!el) return;
    const n = E.stu.length, c = cap(), s = E.row.seating.length, un = n - s, q = R().reduce((a, _, i) => a + quotaSum(i), 0);
    el.innerHTML = `<div><span>الطلاب المختارون</span><b>${AR(n)}</b></div><div><span>اللجان</span><b>${AR(R().length)}</b></div><div class="${c < n ? 'bad' : 'ok'}"><span>السعة الكلية</span><b>${AR(c)}</b></div>
      <div><span>محدَّد بالأعداد</span><b>${AR(q)}</b></div><div class="${s ? 'ok' : ''}"><span>موزَّعون</span><b>${AR(s)}</b></div><div class="${un > 0 && s ? 'bad' : ''}"><span>متبقٍ بلا لجنة</span><b>${AR(Math.max(0, un))}</b></div>`;
  }

  // ---------- ١ الطلاب والفصول ----------
  function tCls(box) {
    const r = E.row, all = (S.classes || []).filter(c => c.active !== false).sort(cmpC), stages = [...new Set(all.map(stageName))];
    box.innerHTML = `<div class="card" style="margin-top:0"><div class="row" style="gap:8px;flex-wrap:wrap;justify-content:space-between"><b>اختر المراحل والصفوف والفصول المشمولة</b><div class="row" style="gap:6px"><button class="btn ghost sm" id="ljAll">تحديد الكل</button><button class="btn ghost sm" id="ljNone">إلغاء الكل</button></div></div>
      ${stages.map(sg => { const cs = all.filter(c => stageName(c) === sg), grades = [...new Set(cs.map(gKey))]; return `<fieldset class="lj-rm" style="margin-top:10px"><legend class="row" style="gap:8px"><label class="chk"><input type="checkbox" data-sg="${esc(sg)}"> <b>${esc(sg)}</b></label></legend>
        ${grades.map(gk => { const gc = cs.filter(c => gKey(c) === gk); return `<div class="row" style="gap:10px;align-items:flex-start;flex-wrap:wrap;margin:6px 0"><label class="chk" style="min-width:150px"><input type="checkbox" data-gk="${esc(gk)}"> <b>${esc(gName(gc[0]))}</b></label><div class="row" style="gap:10px;flex-wrap:wrap">${gc.map(c => `<label class="chk small"><input type="checkbox" data-c="${c.id}" ${r.class_ids.includes(c.id) ? 'checked' : ''} ${locked() ? 'disabled' : ''}> ${esc(c.name)} <span class="muted" data-cn="${c.id}"></span></label>`).join('')}</div></div>`; }).join('')}</fieldset>`; }).join('') || A.emptyBox('لا توجد فصول في هذا القسم')}
      <div class="grid g2" style="margin-top:12px"><div class="field"><label for="ljBy">الأعداد لكل لجنة تُحدد على مستوى</label><select class="in" id="ljBy" ${locked() ? 'disabled' : ''}><option value="grade" ${r.settings.by !== 'class' ? 'selected' : ''}>الصف الدراسي (مثلاً: ١٠ من رابع و١٠ من سادس)</option><option value="class" ${r.settings.by === 'class' ? 'selected' : ''}>الفصل (رابع أ، رابع ب…)</option></select></div></div></div>`;
    const sync = async () => {
      r.class_ids = $$('[data-c]:checked', box).map(i => i.dataset.c);
      $$('[data-gk]', box).forEach(g => { const L = $$('[data-c]', g.closest('div.row')); g.checked = L.length && L.every(i => i.checked); g.indeterminate = !g.checked && L.some(i => i.checked); });
      $$('[data-sg]', box).forEach(g => { const L = $$('[data-c]', g.closest('fieldset')); g.checked = L.length && L.every(i => i.checked); g.indeterminate = !g.checked && L.some(i => i.checked); });
      await loadStu(); counts(); kpis();
    };
    const counts = () => { $$('[data-cn]', box).forEach(s => { const n = E.stu.filter(x => x.class_id === s.dataset.cn).length; s.textContent = r.class_ids.includes(s.dataset.cn) ? `(${AR(n)})` : ''; }); };
    $$('[data-c]', box).forEach(i => i.onchange = () => { dirty(); sync(); });
    $$('[data-gk],[data-sg]', box).forEach(g => g.onchange = () => { if (locked()) return; $$('[data-c]', g.dataset.gk ? g.closest('div.row') : g.closest('fieldset')).forEach(i => i.checked = g.checked); dirty(); sync(); });
    $('#ljAll', box).onclick = () => { if (locked()) return; $$('[data-c]', box).forEach(i => i.checked = true); dirty(); sync(); };
    $('#ljNone', box).onclick = () => { if (locked()) return; $$('[data-c]', box).forEach(i => i.checked = false); dirty(); sync(); };
    $('#ljBy', box).onchange = e => { r.settings.by = e.target.value; R().forEach(x => x.quota = {}); dirty(); A.toast('غُيّر المستوى — أُفرغت الأعداد المحددة لتُعاد على المستوى الجديد', 'ok'); };
    sync();
  }

  // ---------- ٢ اللجان والأعداد ----------
  function tRooms(box) {
    const st = ST(), staff = (S.staff || []).filter(p => p.active !== false).sort((a, b) => String(a.full_name).localeCompare(String(b.full_name), 'ar'));
    const dis = locked() ? 'disabled' : '';
    const draw = () => {
      const G = groups();
      box.innerHTML = `<div class="card" style="margin-top:0"><div class="row" style="gap:8px;flex-wrap:wrap"><b>كشاف الأعداد</b><span class="small muted">اكتب كم طالباً من كل ${st.by === 'class' ? 'فصل' : 'صف'} في كل لجنة. الخانات الفارغة تُملأ تلقائياً عند التوزيع بالطريقة المختارة. المؤشرات تُظهر المتبقي في اللجنة وفي ${st.by === 'class' ? 'الفصل' : 'الصف'}.</span></div>
        <div class="row" style="gap:6px;flex-wrap:wrap;margin:10px 0"><button class="btn ghost sm" id="ljAq" ${dis}>⚖️ توزيع الأعداد بالتناسب تلقائياً</button><button class="btn ghost sm" id="ljCq" ${dis}>مسح الأعداد</button><button class="btn ghost sm" id="ljFit" ${dis}>ضبط السعة على الأعداد</button><span class="grow"></span><button class="btn ghost sm" id="ljAdd" ${dis}>+ لجنة</button><button class="btn ghost sm" id="ljBulk" ${dis}>إنشاء عدة لجان</button></div>
        <div class="scroll" style="max-height:60vh"><table class="lj-mx"><thead><tr><th>اللجنة</th><th>السعة</th>${G.map(g => `<th title="${esc(g.stage)}">${esc(g.name)}<br><span class="small muted">${AR(g.n)} طالباً</span></th>`).join('')}<th>المحدد</th><th>المتبقي في اللجنة</th></tr></thead>
        <tbody>${R().map((r, ri) => { const q = quotaSum(ri), rem = (+r.capacity || 0) - q; return `<tr><td><b>${esc(r.name)}</b></td><td><input data-cap="${ri}" value="${AR(r.capacity)}" inputmode="numeric" aria-label="سعة ${esc(r.name)}" ${dis}></td>${G.map(g => `<td><input data-q="${ri}" data-k="${esc(g.k)}" value="${(r.quota || {})[g.k] ? AR(r.quota[g.k]) : ''}" placeholder="—" inputmode="numeric" aria-label="عدد ${esc(g.name)} في ${esc(r.name)}" ${dis}></td>`).join('')}<td><b>${AR(q)}</b></td><td><span class="lj-left ${rem < 0 ? 'n' : rem === 0 ? 'z' : 'p'}">${rem < 0 ? 'زيادة ' + AR(-rem) : rem === 0 ? 'ممتلئة' : 'متبقٍ ' + AR(rem)}</span></td></tr>`; }).join('')}</tbody>
        <tfoot><tr><td>المجموع</td><td>${AR(cap())}</td>${G.map(g => { const q = quotaOf(g.k), rem = g.n - q; return `<td>${AR(q)}<br><span class="lj-left ${rem < 0 ? 'n' : rem === 0 ? 'z' : 'p'}">${rem < 0 ? 'زيادة ' + AR(-rem) : rem === 0 ? 'اكتمل' : 'متبقٍ ' + AR(rem)}</span></td>`; }).join('')}<td>${AR(R().reduce((a, _, i) => a + quotaSum(i), 0))}</td><td>${cap() < E.stu.length ? `<span class="lj-left n">السعة أقل بـ${AR(E.stu.length - cap())}</span>` : `<span class="lj-left z">السعة كافية</span>`}</td></tr></tfoot></table></div></div>
        <div class="card"><b>بيانات اللجان</b><p class="small muted" style="margin:4px 0 10px">الاسم والموقع والملاحظون، وقصر اللجنة على فصول بعينها. موقعها في المبنى والباب والمقاعد والصورة من تبويب «الكروكي».</p>
        ${R().map((r, ri) => { const n = E.row.seating.filter(x => x.room === ri).length, pc = Math.min(100, Math.round(n / Math.max(1, +r.capacity) * 100)); return `<div class="lj-rm"><div class="row" style="gap:8px;align-items:flex-end">
          <div class="field" style="flex:1 1 150px"><label for="ljN${ri}">اسم اللجنة</label><input class="in" id="ljN${ri}" data-n="${ri}" value="${esc(r.name)}" ${dis}></div>
          <div class="field" style="flex:1 1 150px"><label for="ljL${ri}">الموقع (نص)</label><input class="in" id="ljL${ri}" data-l="${ri}" value="${esc(r.loc || '')}" placeholder="مثال: الدور الأول — جناح أ" ${dis}></div>
          <div class="field" style="flex:1 1 170px"><label for="ljP${ri}">الملاحظ الأول</label><select class="in" id="ljP${ri}" data-p="${ri}" ${dis}><option value="">—</option>${staff.map(p => `<option value="${p.id}" ${r.proctor === p.id ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select></div>
          <div class="field" style="flex:1 1 170px"><label for="ljQ${ri}">الملاحظ الثاني</label><select class="in" id="ljQ${ri}" data-p2="${ri}" ${dis}><option value="">—</option>${staff.map(p => `<option value="${p.id}" ${r.proctor2 === p.id ? 'selected' : ''}>${esc(p.full_name)}</option>`).join('')}</select></div>
          ${R().length > 1 && !locked() ? `<button class="btn bad sm" data-x="${ri}" aria-label="حذف ${esc(r.name)}">حذف</button>` : ''}</div>
          <div class="row" style="gap:10px;margin-top:8px;align-items:center"><div class="lj-bar ${n > r.capacity ? 'over' : ''}" style="flex:1"><i style="width:${pc}%"></i></div><span class="small">${AR(n)} / ${AR(r.capacity)} موزَّعون</span>
          <details><summary class="small">مقصورة على فصول ${r.classes && r.classes.length ? `(${AR(r.classes.length)})` : '(كل الفصول)'}</summary><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:6px">${E.row.class_ids.map(c => `<label class="chk small"><input type="checkbox" data-rk="${ri}" value="${c}" ${(r.classes || []).includes(c) ? 'checked' : ''} ${dis}> ${esc(clsName(c))}</label>`).join('') || '<span class="small muted">اختر الفصول أولاً</span>'}</div>
          <label class="chk small" style="margin-top:6px"><input type="checkbox" data-qo="${ri}" ${r.quotaOnly ? 'checked' : ''} ${dis}> لا تُملأ إلا بالأعداد المحددة</label></details></div></div>`; }).join('')}</div>`;
      const num = v => parseInt(String(v).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)), 10);
      $$('[data-cap]', box).forEach(i => i.onchange = () => { R()[+i.dataset.cap].capacity = Math.max(1, num(i.value) || 1); dirty(); draw(); kpis(); });
      $$('[data-q]', box).forEach(i => i.onchange = () => { const r = R()[+i.dataset.q]; r.quota = r.quota || {}; const v = num(i.value); if (v > 0) r.quota[i.dataset.k] = v; else delete r.quota[i.dataset.k]; dirty(); draw(); kpis(); const nx = box.querySelector(`[data-q="${i.dataset.q}"][data-k="${CSS.escape(i.dataset.k)}"]`); if (nx) nx.focus(); });
      $$('[data-n]', box).forEach(i => i.oninput = () => { R()[+i.dataset.n].name = i.value; dirty(); });
      $$('[data-l]', box).forEach(i => i.oninput = () => { R()[+i.dataset.l].loc = i.value; dirty(); });
      $$('[data-p]', box).forEach(i => i.onchange = () => { R()[+i.dataset.p].proctor = i.value || null; dirty(); });
      $$('[data-p2]', box).forEach(i => i.onchange = () => { R()[+i.dataset.p2].proctor2 = i.value || null; dirty(); });
      $$('[data-rk]', box).forEach(i => i.onchange = () => { const r = R()[+i.dataset.rk]; r.classes = $$(`[data-rk="${i.dataset.rk}"]:checked`, box).map(x => x.value); dirty(); });
      $$('[data-qo]', box).forEach(i => i.onchange = () => { R()[+i.dataset.qo].quotaOnly = i.checked; dirty(); });
      $$('[data-x]', box).forEach(b => b.onclick = async () => { const ri = +b.dataset.x; if (!(await A.confirmBox(`حذف «${esc(R()[ri].name)}»؟ طلابها يعودون بلا لجنة حتى إعادة التوزيع.`, 'حذف', true))) return; R().splice(ri, 1); E.row.seating = E.row.seating.filter(x => x.room !== ri).map(x => Object.assign(x, { room: x.room > ri ? x.room - 1 : x.room })); dirty(); draw(); kpis(); });
      const add = (n, c) => { const i = R().length; R().push(Object.assign({}, RDEF, { name: 'لجنة ' + AR(i + 1), capacity: c || 20, x: (i % 4) * 5, f: Math.floor(i / 4) })); };
      const b1 = $('#ljAdd', box); if (b1) b1.onclick = () => { add(); dirty(); draw(); kpis(); };
      const b2 = $('#ljBulk', box); if (b2) b2.onclick = () => bulk();
      $('#ljAq', box).onclick = () => { if (!E.stu.length) return A.toast('اختر الفصول أولاً', 'warn'); if (cap() < E.stu.length) A.toast('السعة الكلية أقل من عدد الطلاب — زِد السعة أو اللجان', 'warn'); autoQuota(); dirty(); draw(); kpis(); };
      $('#ljCq', box).onclick = () => { R().forEach(r => r.quota = {}); dirty(); draw(); kpis(); };
      $('#ljFit', box).onclick = () => { R().forEach((r, i) => { const q = quotaSum(i); if (q) r.capacity = q; }); dirty(); draw(); kpis(); };
      function bulk() {
        const m = A.modal(`<h3>إنشاء عدة لجان</h3><div class="grid g2"><div class="field"><label for="bN">عدد اللجان</label><input class="in" id="bN" type="number" min="1" value="${Math.max(1, Math.ceil(E.stu.length / 20) || 6)}"></div><div class="field"><label for="bC">سعة كل لجنة</label><input class="in" id="bC" type="number" min="1" value="20"></div>
          <div class="field"><label for="bP">بادئة الاسم</label><input class="in" id="bP" value="لجنة"></div><div class="field"><label for="bR">لجان في كل دور (للكروكي)</label><input class="in" id="bR" type="number" min="1" value="4"></div></div>
          <label class="chk"><input type="checkbox" id="bK"> إبقاء اللجان الحالية وإضافة الجديدة بعدها</label><p class="small muted">لكل ${AR(E.stu.length)} طالباً تكفي ${AR(Math.ceil(E.stu.length / 20) || 0)} لجنة بسعة ٢٠.</p><div class="acts"><button class="btn" id="bGo">إنشاء</button></div>`);
        m.el.querySelector('#bGo').onclick = () => { const n = +m.el.querySelector('#bN').value, c = +m.el.querySelector('#bC').value, p = m.el.querySelector('#bP').value.trim() || 'لجنة', per = Math.max(1, +m.el.querySelector('#bR').value || 4), keep = m.el.querySelector('#bK').checked; if (!(n > 0 && c > 0)) return;
          if (!keep) { E.row.rooms = []; E.row.seating = []; } const s0 = R().length; for (let i = 0; i < n; i++) { const k = s0 + i; R().push(Object.assign({}, RDEF, { name: p + ' ' + AR(k + 1), capacity: c, x: (k % per) * 5, f: Math.floor(k / per) })); } m.close(); dirty(); draw(); kpis(); };
      }
    };
    draw();
  }

  // ---------- ٣ التوزيع والمقاعد ----------
  function tSeat(box) {
    const st = ST(), dis = locked() ? 'disabled' : '';
    const draw = () => {
      const ri = Math.min(E.room, Math.max(0, R().length - 1)), rm = R()[ri], L = E.row.seating.filter(x => x.room === ri), G = groups();
      box.innerHTML = `<div class="card" style="margin-top:0"><div class="grid g4" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px">
          <div class="field"><label for="sM">طريقة التوزيع على اللجان</label><select class="in" id="sM" ${dis}>${MODES.map(([k, n]) => `<option value="${k}" ${st.mode === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label for="sI">الترتيب داخل اللجنة</label><select class="in" id="sI" ${dis}>${INNER.map(([k, n]) => `<option value="${k}" ${st.inner === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label for="sN">ترقيم الجلوس</label><select class="in" id="sN" ${dis}>${NUMS.map(([k, n]) => `<option value="${k}" ${st.num === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
          <div class="field"><label for="sS">يبدأ من</label><input class="in" id="sS" type="number" min="0" value="${esc(st.start)}" ${dis}></div>
          <div class="field"><label for="sP">بادئة الرقم</label><input class="in" id="sP" value="${esc(st.prefix || '')}" dir="ltr" placeholder="مثال: 4- أو M" ${dis}></div>
          <div class="field"><label for="sD">عدد الخانات</label><select class="in" id="sD" ${dis}>${[0, 2, 3, 4].map(n => `<option value="${n}" ${+st.pad === n ? 'selected' : ''}>${n ? AR(n) + ' (' + '0'.repeat(n - 1) + '1)' : 'بلا أصفار'}</option>`).join('')}</select></div></div>
        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn" id="sGo" ${dis}>🎯 توزيع الآن</button><button class="btn ghost" id="sKeep" ${dis}>توزيع مع إبقاء المثبّتين</button><button class="btn ghost" id="sRe" ${dis}>إعادة الترقيم فقط</button><button class="btn bad ghost" id="sClr" ${dis}>مسح التوزيع</button>${locked() ? '<span class="small muted">التوزيع معتمد — ألغِ الاعتماد للتعديل.</span>' : ''}</div>
        ${E.left && E.left.length ? `<div class="lj-left n" style="margin-top:8px;font-size:13px">${AR(E.left.length)} طالباً بلا مقعد: ${esc(E.left.slice(0, 8).map(s => s.name).join('، '))}${E.left.length > 8 ? '…' : ''} — زِد السعة أو ألغِ «لا تُملأ إلا بالأعداد».</div>` : ''}</div>
        ${E.row.seating.length ? `<div class="card"><b>الموزَّعون فعلياً (لجنة × ${st.by === 'class' ? 'فصل' : 'صف'})</b><div class="scroll" style="margin-top:8px"><table class="lj-mx"><thead><tr><th>اللجنة</th>${G.map(g => `<th>${esc(g.name)}</th>`).join('')}<th>المجموع</th><th>أرقام الجلوس</th></tr></thead><tbody>${R().map((r, i) => { const X = E.row.seating.filter(x => x.room === i); return `<tr><td><b>${esc(r.name)}</b></td>${G.map(g => { const n = X.filter(x => keyOf(x) === g.k).length, q = (r.quota || {})[g.k]; return `<td>${n ? AR(n) : '—'}${q && q !== n ? ` <span class="lj-left n">من ${AR(q)}</span>` : ''}</td>`; }).join('')}<td><b>${AR(X.length)}</b> / ${AR(r.capacity)}</td><td dir="ltr">${X.length ? esc(X[0].label + ' — ' + X[X.length - 1].label) : ''}</td></tr>`; }).join('')}</tbody></table></div></div>` : ''}
        <div class="card"><div class="lj-room-chips" role="tablist" aria-label="اللجان">${R().map((r, i) => `<button data-rm="${i}" class="${i === ri ? 'on' : ''}" aria-selected="${i === ri}">${esc(r.name)} (${AR(E.row.seating.filter(x => x.room === i).length)})</button>`).join('')}</div>
        ${rm ? `<div class="lj-two"><div><div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px"><input class="in" id="sQ" placeholder="بحث بالاسم أو الرقم" style="max-width:220px"><span class="small muted">المثبَّت 🔒 يبقى في لجنته عند «توزيع مع إبقاء المثبّتين».</span></div>
          <div class="scroll" style="max-height:62vh"><table class="tbl"><thead><tr><th>الجلوس</th><th>الطالب</th><th>الفصل</th><th>نقل إلى</th><th>تثبيت</th></tr></thead><tbody id="sB"></tbody></table></div></div>
          <div><div class="lj-view" id="sV"></div><p class="small muted" style="margin:6px 0 0">اضغط مقعداً في الرسم لتمييز طالبه. عدد الصفوف والأعمدة وموقع الباب من تبويب «الكروكي».</p></div></div>` : A.emptyBox('أضف لجنة أولاً')}</div>`;
      const setv = (id, k, f) => { const el = $(id, box); if (el) el.onchange = () => { st[k] = f ? f(el.value) : el.value; dirty(); if (['num', 'start', 'prefix', 'pad'].includes(k) && E.row.seating.length) { renumber(E.row.seating); draw(); } }; };
      setv('#sM', 'mode'); setv('#sI', 'inner'); setv('#sN', 'num'); setv('#sS', 'start', v => Math.max(0, parseInt(v, 10) || 1)); setv('#sP', 'prefix', v => v.trim()); setv('#sD', 'pad', v => +v);
      const go = keep => { if (!E.stu.length) return A.toast('اختر الفصول أولاً', 'warn'); const x = distribute(keep); dirty(); kpis(); draw(); A.toast(`وُزّع ${AR(x.n)} طالباً${x.left ? ` — ${AR(x.left)} بلا مقعد` : ''}`, x.left ? 'warn' : 'ok'); };
      const b = id => $(id, box); if (b('#sGo')) b('#sGo').onclick = () => go(false); if (b('#sKeep')) b('#sKeep').onclick = () => go(true);
      if (b('#sRe')) b('#sRe').onclick = () => { renumber(E.row.seating); dirty(); draw(); };
      if (b('#sClr')) b('#sClr').onclick = async () => { if (!(await A.confirmBox('مسح توزيع كل الطلاب؟', 'مسح', true))) return; E.row.seating = []; E.left = []; dirty(); kpis(); draw(); };
      $$('[data-rm]', box).forEach(x => x.onclick = () => { E.room = +x.dataset.rm; draw(); });
      if (!rm) return;
      let hl = -1;
      const view = () => { const v = $('#sV', box); if (!v) return; v.innerHTML = L3().room(rm, { labels: L.map(x => x.label), count: L.length, highlight: hl, sub: `${AR(L.length)} طالباً`, id: 's' }); $$('.lj-seat', v).forEach(g => { g.style.cursor = 'pointer'; g.onclick = () => { hl = +g.dataset.k; view(); const tr = box.querySelector(`tr[data-k="${hl}"]`); if (tr) { tr.scrollIntoView({ block: 'nearest' }); tr.classList.add('lj-locked'); setTimeout(() => tr.classList.remove('lj-locked'), 1500); } }; }); };
      const list = () => { const q = A.normKey((($('#sQ', box) || {}).value) || ''); $('#sB', box).innerHTML = L.map((x, k) => [x, k]).filter(([x]) => !q || A.normKey(x.name).includes(q) || String(x.label).includes(q)).map(([x, k]) => `<tr data-k="${k}" class="${x.lock ? 'lj-locked' : ''}"><td><b dir="ltr">${esc(x.label)}</b></td><td><button class="btn ghost sm" data-h="${k}" style="padding:2px 6px">${esc(x.name)}</button></td><td class="small">${esc(clsName(x.class_id))}</td><td><select class="in" data-mv="${esc(x.student_id)}" style="max-width:150px;min-height:34px;padding:4px 8px" aria-label="نقل ${esc(x.name)}" ${dis}>${R().map((r, i) => `<option value="${i}" ${i === ri ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select></td><td><button class="btn ghost sm" data-lk="${esc(x.student_id)}" aria-pressed="${!!x.lock}" aria-label="تثبيت ${esc(x.name)}" ${dis}>${x.lock ? '🔒' : '🔓'}</button></td></tr>`).join('') || `<tr><td colspan="5">${A.emptyBox('لا طلاب في هذه اللجنة بعد', 'اضغط «توزيع الآن».')}</td></tr>`;
        $$('[data-h]', box).forEach(b => b.onclick = () => { hl = +b.dataset.h; view(); });
        $$('[data-mv]', box).forEach(s => s.onchange = () => { const x = E.row.seating.find(z => z.student_id === s.dataset.mv); x.room = +s.value; x.lock = true; renumber(E.row.seating); dirty(); kpis(); draw(); A.toast('نُقل الطالب وثُبّت في لجنته الجديدة', 'ok'); });
        $$('[data-lk]', box).forEach(b => b.onclick = () => { const x = E.row.seating.find(z => z.student_id === b.dataset.lk); x.lock = !x.lock; dirty(); list(); }); };
      const q = $('#sQ', box); if (q) q.oninput = list; list(); view();
    };
    draw();
  }

  // ---------- ٤ الكروكي ----------
  function tMap(box) {
    const st = ST(), mp = st.map, dis = locked() ? '' : ''; // الكروكي يبقى قابلاً للتعديل حتى بعد الاعتماد (لا يغيّر التوزيع)
    mp.blds = mp.blds && mp.blds.length ? mp.blds : ['المبنى الرئيسي']; mp.marks = mp.marks || []; mp.floorNames = mp.floorNames || {};
    const fName = f => mp.floorNames[f] || (f === 0 ? 'الدور الأرضي' : 'الدور ' + (['', 'الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس'][f] || AR(f)));
    const draw = () => {
      const floors = [...new Set(R().filter(r => +r.b === E.bld).map(r => +r.f).concat([E.floor]))].sort((a, b) => a - b);
      const sel = R()[E.room] && +R()[E.room].b === E.bld && +R()[E.room].f === E.floor ? E.room : R().findIndex(r => +r.b === E.bld && +r.f === E.floor);
      const rm = R()[sel];
      box.innerHTML = `<div class="card" style="margin-top:0"><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end">
          <div class="field" style="margin:0"><label for="mB">المبنى</label><div class="row" style="gap:4px"><select class="in" id="mB" style="min-width:160px">${mp.blds.map((b, i) => `<option value="${i}" ${i === E.bld ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select><button class="btn ghost sm" id="mBA" title="إضافة مبنى">+</button><button class="btn ghost sm" id="mBR" title="تسمية المبنى">✎</button></div></div>
          <div class="field" style="margin:0"><span class="small muted" style="display:block;font-weight:700">الدور</span><div class="lj-seg" role="group" aria-label="الدور">${[...new Set(floors.concat([Math.max(...floors) + 1]))].map(f => `<button data-f="${f}" class="${f === E.floor ? 'on' : ''}" aria-pressed="${f === E.floor}">${f > Math.max(...floors) ? '+ دور' : esc(fName(f))}</button>`).join('')}</div></div>
          <button class="btn ghost sm" id="mFR">✎ تسمية الدور</button>
          <div class="grow"></div><label class="small">إضافة معلَم: <select class="in" id="mMk" style="width:auto;min-height:36px;padding:4px 8px"><option value="">—</option>${MARKS.map(([k, i, n]) => `<option value="${k}">${i} ${n}</option>`).join('')}</select></label></div>
        <div class="lj-two" style="margin-top:10px"><div><div class="small muted" style="margin-bottom:4px">مخطط ${esc(fName(E.floor))} — اسحب اللجنة لتغيير موقعها، واسحب المربع الصغير في زاويتها لتغيير حجمها. الخط الأخضر = الباب.</div><div class="lj-topw" id="mTop"></div>
          <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${R().map((r, i) => `<button class="btn ghost sm ${i === sel ? 'on' : ''}" data-s="${i}" style="${+r.b === E.bld && +r.f === E.floor ? '' : 'opacity:.55'}">${esc(r.name)}${+r.b === E.bld && +r.f === E.floor ? '' : ' ⇢'}</button>`).join('')}</div>
          ${mp.marks.filter(m => +(m.b || 0) === E.bld && +(m.f || 0) === E.floor).length ? `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${mp.marks.map((m, i) => +(m.b || 0) === E.bld && +(m.f || 0) === E.floor ? `<span class="pill st-empty">${esc(m.icon)} <input value="${esc(m.label)}" data-ml="${i}" aria-label="اسم المعلَم" style="border:0;background:transparent;width:90px;font:inherit"> <button class="btn ghost sm" data-mx="${i}" aria-label="حذف المعلَم" style="padding:0 6px">×</button></span>` : '').join('')}</div>` : ''}</div>
          <div>${rm ? `<b>${esc(rm.name)}</b><div class="lj-props" style="margin-top:8px">
            <div class="field"><label>الباب — اللجنة على</label><div class="lj-seg"><button data-dr="r" class="${rm.door !== 'l' ? 'on' : ''}">يمين الداخل</button><button data-dr="l" class="${rm.door === 'l' ? 'on' : ''}">يسار الداخل</button></div></div>
            <div class="field"><label>السبورة</label><div class="lj-seg"><button data-bd="near" class="${rm.board !== 'far' ? 'on' : ''}">بجانب الباب</button><button data-bd="far" class="${rm.board === 'far' ? 'on' : ''}">مقابل الباب</button></div></div>
            <div class="field"><label for="pR">صفوف المقاعد</label><input class="in" id="pR" type="number" min="1" max="15" value="${rm.rows}"></div>
            <div class="field"><label for="pC">مقاعد في الصف</label><input class="in" id="pC" type="number" min="1" max="12" value="${rm.cols}"></div>
            <div class="field"><label for="pF">يبدأ الترقيم من</label><select class="in" id="pF"><option value="door" ${rm.from !== 'far' ? 'selected' : ''}>جهة الباب</option><option value="far" ${rm.from === 'far' ? 'selected' : ''}>الجهة البعيدة</option></select></div>
            <div class="field"><label for="pSn">طريقة الترقيم</label><select class="in" id="pSn"><option value="0" ${!rm.snake ? 'selected' : ''}>صفاً صفاً</option><option value="1" ${rm.snake ? 'selected' : ''}>متعرّج (ثعباني)</option></select></div>
            <div class="field"><label for="pW">العرض في المخطط</label><input class="in" id="pW" type="number" min="2" max="12" value="${rm.w}"></div>
            <div class="field"><label for="pD">العمق في المخطط</label><input class="in" id="pD" type="number" min="2" max="10" value="${rm.d}"></div>
            <div class="field"><label for="pFl">الدور</label><select class="in" id="pFl">${[0, 1, 2, 3, 4, 5].map(f => `<option value="${f}" ${+rm.f === f ? 'selected' : ''}>${esc(fName(f))}</option>`).join('')}</select></div>
            <div class="field"><label for="pB">المبنى</label><select class="in" id="pB">${mp.blds.map((b, i) => `<option value="${i}" ${+rm.b === i ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>
            <div class="field"><label for="pCo">اللون</label><input class="in" id="pCo" type="color" value="${rm.color || L3().PAL[sel % 8]}" style="min-height:40px;padding:2px"></div>
            <div class="field"><label for="pN">ملاحظة للطلاب</label><input class="in" id="pN" value="${esc(rm.notes || '')}" placeholder="مثال: الصعود من الدرج الشرقي"></div></div>
            ${+rm.rows * +rm.cols < E.row.seating.filter(x => x.room === sel).length ? `<div class="lj-left n" style="margin-top:6px">المقاعد ${AR(rm.rows * rm.cols)} أقل من طلاب اللجنة ${AR(E.row.seating.filter(x => x.room === sel).length)}</div>` : ''}
            <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><label class="btn ghost sm" style="cursor:pointer">📷 ${rm.photo ? 'تغيير' : 'إضافة'} صورة اللجنة<input type="file" accept="image/*" id="pPh" hidden></label>${rm.photo ? '<button class="btn ghost sm" id="pPx">حذف الصورة</button>' : ''}<button class="btn ghost sm" id="pAll">تطبيق المقاعد والباب على كل اللجان</button></div>
            ${rm.photo ? `<img class="lj-photo" src="${esc(rm.photo)}" alt="صورة ${esc(rm.name)}" loading="lazy">` : ''}
            <div class="lj-view" id="mRoom" style="margin-top:8px"></div>` : A.emptyBox('لا توجد لجنة في هذا الدور', 'اختر لجنة من الأزرار ثم غيّر دورها، أو انتقل لدور آخر.')}</div></div></div>
        <div class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><b>الكروكي ثلاثي الأبعاد — ${esc(mp.blds[E.bld])}</b><span class="small muted">اضغط أي لجنة لعرضها</span></div><div class="lj-view" id="m3d" style="margin-top:8px"></div></div>`;
      // المخطط العلوي بالسحب
      const tw = $('#mTop', box), topDraw = s => { tw.innerHTML = L3().top(R(), { floor: E.floor, building: E.bld, selected: s, marks: mp.marks.map((m, i) => Object.assign({ k: i }, m)) }); }; topDraw(sel);
      const pt = ev => { const svg = tw.querySelector('svg'), u = +svg.dataset.u, b = svg.getBoundingClientRect(); return { x: (ev.clientX - b.left) / b.width * svg.viewBox.baseVal.width / u, y: (ev.clientY - b.top) / b.height * svg.viewBox.baseVal.height / u }; };
      let dr = null; const svg = tw;
      svg.addEventListener('pointerdown', ev => { const z = ev.target.closest('.lj-rz'), g = ev.target.closest('.lj-tr'), mk = ev.target.closest('.lj-tm'); if (!z && !g && !mk) return; ev.preventDefault(); const p = pt(ev);
        if (mk) { const m = mp.marks[+mk.dataset.m]; dr = { m, ox: p.x - m.x, oy: p.y - m.y }; }
        else { const i = +(z ? z.dataset.z : g.dataset.i), r = R()[i]; E.room = i; dr = { r, i, z: !!z, ox: p.x - r.x, oy: p.y - r.y }; }
        svg.setPointerCapture(ev.pointerId); });
      svg.addEventListener('pointermove', ev => { if (!dr) return; const p = pt(ev);
        if (dr.m) { dr.m.x = Math.max(0, Math.min(23, Math.round(p.x - dr.ox))); dr.m.y = Math.max(0, Math.min(11, Math.round(p.y - dr.oy))); }
        else if (dr.z) { dr.r.w = Math.max(2, Math.min(12, Math.round(p.x - dr.r.x))); dr.r.d = Math.max(2, Math.min(10, Math.round(p.y - dr.r.y))); }
        else { dr.r.x = Math.max(0, Math.min(24 - dr.r.w, Math.round(p.x - dr.ox))); dr.r.y = Math.max(0, Math.min(12 - dr.r.d, Math.round(p.y - dr.oy))); }
        dr.moved = true; topDraw(dr.m ? sel : dr.i); });
      svg.addEventListener('pointerup', () => { if (!dr) return; const mv = dr.moved; dr = null; if (mv) dirty(); draw(); });
      // ثلاثي الأبعاد
      const sub = R().map((r, i) => { const X = E.row.seating.filter(x => x.room === i); return X.length ? `${AR(X.length)} · ${X[0].label}–${X[X.length - 1].label}` : ''; });
      const m3 = $('#m3d', box); m3.innerHTML = L3().map(R(), { building: E.bld, highlight: sel, sub, marks: mp.marks, clickable: true, floorName: fName }) || A.emptyBox('لا توجد لجان في هذا المبنى');
      $$('.lj-room', m3).forEach(g => g.onclick = () => { const r = R()[+g.dataset.i]; E.room = +g.dataset.i; E.floor = +r.f; draw(); });
      if (rm) { const X = E.row.seating.filter(x => x.room === sel); $('#mRoom', box).innerHTML = L3().room(rm, { labels: X.map(x => x.label), count: X.length || +rm.rows * +rm.cols, sub: X.length ? AR(X.length) + ' طالباً' : '', id: 'm' }); }
      // الأحداث
      $('#mB', box).onchange = e => { E.bld = +e.target.value; E.floor = 0; draw(); };
      $('#mBA', box).onclick = () => { const n = prompt('اسم المبنى الجديد', 'مبنى ' + AR(mp.blds.length + 1)); if (!n) return; mp.blds.push(n.trim()); E.bld = mp.blds.length - 1; E.floor = 0; dirty(); draw(); };
      $('#mBR', box).onclick = () => { const n = prompt('اسم المبنى', mp.blds[E.bld]); if (!n) return; mp.blds[E.bld] = n.trim(); dirty(); draw(); };
      $('#mFR', box).onclick = () => { const n = prompt('اسم الدور', fName(E.floor)); if (n == null) return; if (n.trim()) mp.floorNames[E.floor] = n.trim(); else delete mp.floorNames[E.floor]; dirty(); draw(); };
      $$('[data-f]', box).forEach(b => b.onclick = () => { E.floor = +b.dataset.f; draw(); });
      $$('[data-s]', box).forEach(b => b.onclick = () => { const r = R()[+b.dataset.s]; E.room = +b.dataset.s; if (+r.b !== E.bld || +r.f !== E.floor) { if (+r.b === E.bld) E.floor = +r.f; else { r.b = E.bld; r.f = E.floor; dirty(); } } draw(); });
      $('#mMk', box).onchange = e => { const k = e.target.value; if (!k) return; const d = MARKS.find(x => x[0] === k); mp.marks.push({ t: k, icon: d[1], label: d[2], x: 0, y: 10, f: E.floor, b: E.bld }); dirty(); draw(); };
      $$('[data-ml]', box).forEach(i => i.oninput = () => { mp.marks[+i.dataset.ml].label = i.value; dirty(); });
      $$('[data-mx]', box).forEach(b => b.onclick = () => { mp.marks.splice(+b.dataset.mx, 1); dirty(); draw(); });
      if (!rm) return;
      const upd = (k, v) => { rm[k] = v; dirty(); draw(); };
      $$('[data-dr]', box).forEach(b => b.onclick = () => upd('door', b.dataset.dr));
      $$('[data-bd]', box).forEach(b => b.onclick = () => upd('board', b.dataset.bd));
      const nb = (id, k, mn, mx) => { const el = $(id, box); el.onchange = () => upd(k, Math.max(mn, Math.min(mx, parseInt(el.value, 10) || mn))); };
      nb('#pR', 'rows', 1, 15); nb('#pC', 'cols', 1, 12); nb('#pW', 'w', 2, 12); nb('#pD', 'd', 2, 10);
      $('#pF', box).onchange = e => upd('from', e.target.value); $('#pSn', box).onchange = e => upd('snake', e.target.value === '1');
      $('#pFl', box).onchange = e => { rm.f = +e.target.value; E.floor = rm.f; dirty(); draw(); };
      $('#pB', box).onchange = e => { rm.b = +e.target.value; E.bld = rm.b; dirty(); draw(); };
      $('#pCo', box).onchange = e => upd('color', e.target.value);
      $('#pN', box).oninput = e => { rm.notes = e.target.value; dirty(); };
      $('#pAll', box).onclick = async () => { if (!(await A.confirmBox('تطبيق جهة الباب والسبورة وعدد الصفوف والمقاعد وطريقة الترقيم على كل اللجان؟', 'تطبيق'))) return; R().forEach(r => Object.assign(r, { door: rm.door, board: rm.board, rows: rm.rows, cols: rm.cols, from: rm.from, snake: rm.snake })); dirty(); draw(); };
      $('#pPh', box).onchange = e => { const f = e.target.files[0]; if (!f) return; if (f.size > 15e6) return A.toast('الصورة أكبر من ١٥ م.ب', 'err'); A.run(null, async () => { A.toast('جارٍ ضغط الصورة ورفعها…', 'ok'); rm.photo = await api.uploadAsset(f, { max: 1100, q: 0.78 }); dirty(); draw(); A.toast('أُضيفت الصورة (مضغوطة)', 'ok'); }); };
      const px = $('#pPx', box); if (px) px.onclick = () => upd('photo', '');
    };
    draw();
  }

  // ---------- ٥ جدول الاختبارات ----------
  function tSched(box) {
    const st = ST(); st.sched = st.sched || [];
    const draw = () => {
      box.innerHTML = `<div class="card" style="margin-top:0"><div class="row" style="gap:8px;flex-wrap:wrap"><b>جدول الاختبارات</b><span class="small muted">يظهر في رابط أولياء الأمور وفي بطاقات الطلاب والكشوف.</span><div class="grow"></div><button class="btn ghost sm" id="hAdd">+ يوم/مادة</button><button class="btn ghost sm" id="hSort">ترتيب بالتاريخ</button><button class="btn ghost sm" id="hPr">طباعة الجدول</button></div>
        <div class="scroll" style="margin-top:10px"><table class="tbl lj-sched"><thead><tr><th>التاريخ</th><th>اليوم</th><th>من</th><th>إلى</th><th>المادة</th><th>الصفوف/الفترة</th><th>ملاحظة</th><th></th></tr></thead><tbody>${st.sched.map((x, i) => `<tr>
          <td><input class="in" type="date" data-i="${i}" data-k="d" value="${esc(x.d || '')}" aria-label="التاريخ"></td><td class="small">${esc(dayOf(x.d))}</td>
          <td><input class="in" type="time" data-i="${i}" data-k="from" value="${esc(x.from || '')}" aria-label="من" style="width:110px"></td><td><input class="in" type="time" data-i="${i}" data-k="to" value="${esc(x.to || '')}" aria-label="إلى" style="width:110px"></td>
          <td><input class="in" data-i="${i}" data-k="subj" value="${esc(x.subj || '')}" aria-label="المادة" list="hSubj"></td><td><input class="in" data-i="${i}" data-k="grades" value="${esc(x.grades || '')}" aria-label="الصفوف" placeholder="كل الصفوف"></td>
          <td><input class="in" data-i="${i}" data-k="note" value="${esc(x.note || '')}" aria-label="ملاحظة"></td>
          <td class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn ghost sm" data-dup="${i}" aria-label="تكرار">⧉</button><button class="btn bad sm" data-del="${i}" aria-label="حذف">×</button></td></tr>`).join('') || `<tr><td colspan="8">${A.emptyBox('لا يوجد جدول بعد', 'أضف أيام الاختبار ومواده.')}</td></tr>`}</tbody></table>
          <datalist id="hSubj">${(S.subjects || []).map(s => `<option value="${esc(s.name)}">`).join('')}</datalist></div></div>`;
      $$('[data-k]', box).forEach(i => i.onchange = () => { st.sched[+i.dataset.i][i.dataset.k] = i.value; dirty(); if (i.dataset.k === 'd') draw(); });
      $$('[data-dup]', box).forEach(b => b.onclick = () => { const x = Object.assign({}, st.sched[+b.dataset.dup]); if (x.d) { const d = new Date(x.d + 'T12:00:00'); do d.setDate(d.getDate() + 1); while ([5, 6].includes(d.getDay())); x.d = d.toISOString().slice(0, 10); } x.subj = ''; st.sched.splice(+b.dataset.dup + 1, 0, x); dirty(); draw(); });
      $$('[data-del]', box).forEach(b => b.onclick = () => { st.sched.splice(+b.dataset.del, 1); dirty(); draw(); });
      $('#hAdd', box).onclick = () => { const last = st.sched[st.sched.length - 1] || {}; st.sched.push({ d: '', from: last.from || '07:30', to: last.to || '09:00', subj: '', grades: last.grades || '', note: '' }); dirty(); draw(); };
      $('#hSort', box).onclick = () => { st.sched.sort((a, b) => String(a.d).localeCompare(String(b.d)) || String(a.from).localeCompare(String(b.from))); dirty(); draw(); };
      $('#hPr', box).onclick = () => A.printDoc(E.row.title, 'جدول الاختبارات', schedHtml());
    };
    draw();
  }
  const schedHtml = () => { const s = ST().sched || []; return s.length ? `<table><tr><th>م</th><th>اليوم</th><th>التاريخ</th><th>المادة</th><th>الصفوف</th><th>الوقت</th><th>ملاحظة</th></tr>${s.map((x, i) => `<tr><td>${AR(i + 1)}</td><td>${esc(dayOf(x.d))}</td><td>${esc(fmtD(x.d))}</td><td><b>${esc(x.subj)}</b></td><td>${esc(x.grades || 'الجميع')}</td><td dir="ltr">${esc([x.from, x.to].filter(Boolean).join(' – '))}</td><td>${esc(x.note || '')}</td></tr>`).join('')}</table>` : '<p>لم يُدخل جدول الاختبارات بعد.</p>'; };

  // ---------- ٦ الطباعة ----------
  const REPORTS = [
    ['lists', 'كشوف اللجان (حضور وتوقيع)', 'لكل لجنة صفحة: رقم الجلوس، الاسم، الفصل، الحضور، التوقيع، توقيع الملاحظين'],
    ['byclass', 'كشف الفصول', 'لكل فصل: طلابه وأرقام جلوسهم ولجانهم ومواقعها — للتعليق على باب الفصل'],
    ['seats', 'كشف أرقام الجلوس الشامل', 'كل الطلاب مرتبين بالرقم أو بالاسم'],
    ['doors', 'ملصقات أبواب اللجان', 'اسم اللجنة كبيراً، مدى الأرقام، الفصول، الملاحظون، ومخطط المقاعد'],
    ['desks', 'بطاقات المقاعد', 'تُلصق على الطاولات: الرقم والاسم والفصل واللجنة'],
    ['cards', 'بطاقات دخول الطلاب', 'لكل طالب: لجنته ومقعده على مخطط ثلاثي الأبعاد + جدول الاختبار + رمز QR للرابط'],
    ['matrix', 'كشاف الأعداد والتوزيع', 'مصفوفة اللجان × الصفوف/الفصول بالمجاميع ومدى الأرقام'],
    ['map', 'الكروكي ثلاثي الأبعاد', 'خريطة المباني والأدوار ثم مخطط كل لجنة بمقاعدها وبابها وصورتها'],
    ['proctors', 'توزيع الملاحظين', 'كل لجنة وملاحظوها وعدد طلابها وموقعها مع خانة التوقيع'],
    ['sched', 'جدول الاختبارات', 'الأيام والمواد والأوقات']];
  function tPrint(box) {
    const has = E.row.seating.length;
    box.innerHTML = `<div class="card" style="margin-top:0"><div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><b>الطباعة والكشوف</b><span class="small muted">كل التقارير بهوية المدرسة عبر استوديو التقارير (تصميم، توقيعات، PDF).</span><div class="grow"></div><button class="btn ghost sm" id="pX">⬇ Excel شامل</button></div>
      <div class="grid g3" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin:12px 0">
        <div class="field"><label for="oS">ترتيب الكشف الشامل</label><select class="in" id="oS"><option value="seat">برقم الجلوس</option><option value="name">بالاسم</option><option value="class">بالفصل</option></select></div>
        <div class="field"><label for="oD">بطاقات المقاعد في الصفحة</label><select class="in" id="oD">${[6, 9, 12, 15, 21].map(n => `<option ${n === 12 ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label for="oC">بطاقات الدخول في الصفحة</label><select class="in" id="oC"><option value="2">٢ (كبيرة)</option><option value="4" selected>٤</option><option value="6">٦</option></select></div>
        <div class="field"><label for="oR">اللجان</label><select class="in" id="oR"><option value="">كل اللجان</option>${R().map((r, i) => `<option value="${i}">${esc(r.name)}</option>`).join('')}</select></div></div>
      <div class="row" style="gap:14px;flex-wrap:wrap;margin-bottom:10px"><label class="chk small"><input type="checkbox" id="oNo" checked> عمود رقم الطالب</label><label class="chk small"><input type="checkbox" id="oNt"> عمود ملاحظات</label><label class="chk small"><input type="checkbox" id="oPh" checked> صورة اللجنة في الكروكي والملصقات</label><label class="chk small"><input type="checkbox" id="oQr" ${((ST().share || {}).on) ? 'checked' : ''}> رمز QR لرابط أولياء الأمور</label></div>
      ${has ? '' : `<div class="lj-left p" style="font-size:13px;margin-bottom:8px">لم يوزَّع الطلاب بعد — بعض التقارير ستكون فارغة.</div>`}
      <div class="lj-pr">${REPORTS.map(([k, n, d]) => `<button data-r="${k}"><b>${n}</b><span>${d}</span></button>`).join('')}</div></div>`;
    $$('[data-r]', box).forEach(b => b.onclick = () => report(b.dataset.r, {
      sort: $('#oS', box).value, desks: +$('#oD', box).value, cards: +$('#oC', box).value, room: $('#oR', box).value, no: $('#oNo', box).checked, note: $('#oNt', box).checked, photo: $('#oPh', box).checked, qr: $('#oQr', box).checked }));
    $('#pX', box).onclick = excel;
  }
  function report(k, o) {
    const r = E.row, RS = R(), T = r.title, stu = id => E.stu.find(s => s.id === id) || {};
    const rooms = RS.map((x, i) => i).filter(i => o.room === '' || +o.room === i);
    const seatsOf = i => r.seating.filter(x => x.room === i);
    const profs = x => [pn(x.proctor), pn(x.proctor2)].filter(Boolean).join(' و ');
    const brk = (i, first) => `style="page-break-before:${first ? 'auto' : 'always'}"`;
    const qr = o.qr && (ST().share || {}).on && (ST().share || {}).token ? qrSvg(linkOf(r), 90) : '';
    const fl = x => { const mp = ST().map || {}; return [x.loc, (mp.blds || [])[+x.b || 0] && (mp.blds || []).length > 1 ? mp.blds[+x.b || 0] : '', (mp.floorNames || {})[x.f] || (+x.f === 0 ? 'الدور الأرضي' : 'الدور ' + AR(+x.f))].filter(Boolean).join(' — '); };
    let html = '', sub = (REPORTS.find(x => x[0] === k) || [])[1], land = false;
    if (k === 'lists') html = rooms.map((i, n) => { const L = seatsOf(i), x = RS[i]; if (!L.length) return ''; return `<div ${brk(i, !n)}><h3>${esc(x.name)} <small>— ${AR(L.length)} طالباً · ${esc(fl(x))}</small></h3><table><tr><th>م</th><th>رقم الجلوس</th><th>اسم الطالب</th><th>الفصل</th>${o.no ? '<th>رقم الطالب</th>' : ''}<th>الحضور</th><th style="width:22%">التوقيع</th>${o.note ? '<th>ملاحظات</th>' : ''}</tr>${L.map((s, j) => `<tr><td>${AR(j + 1)}</td><td><b dir="ltr">${esc(s.label)}</b></td><td style="text-align:right">${esc(s.name)}</td><td>${esc(clsName(s.class_id))}</td>${o.no ? `<td dir="ltr">${esc(stu(s.student_id).no || '')}</td>` : ''}<td></td><td></td>${o.note ? '<td></td>' : ''}</tr>`).join('')}</table>
      <table style="margin-top:12px"><tr><th>الحاضرون</th><th>الغائبون</th><th>الملاحظ الأول</th><th>التوقيع</th><th>الملاحظ الثاني</th><th>التوقيع</th></tr><tr><td style="height:34px"></td><td></td><td>${esc(pn(x.proctor))}</td><td></td><td>${esc(pn(x.proctor2))}</td><td></td></tr></table></div>`; }).join('');
    else if (k === 'byclass') { const ids = r.class_ids.slice().sort((a, b) => cmpC(clsOf(a), clsOf(b))); html = ids.map((c, n) => { const L = r.seating.filter(s => s.class_id === c).sort((a, b) => byN(a, b)); if (!L.length) return ''; return `<div ${brk(0, !n)}><h3>${esc(clsName(c))} <small>— ${AR(L.length)} طالباً</small></h3><table><tr><th>م</th><th>اسم الطالب</th><th>رقم الجلوس</th><th>اللجنة</th><th>الموقع</th></tr>${L.map((s, j) => `<tr><td>${AR(j + 1)}</td><td style="text-align:right">${esc(s.name)}</td><td><b dir="ltr">${esc(s.label)}</b></td><td>${esc(RS[s.room].name)}</td><td class="small">${esc(fl(RS[s.room]))}</td></tr>`).join('')}</table>${qr ? `<div style="text-align:center;margin-top:10px">${qr}<div style="font-size:11px">امسح لمعرفة اللجنة والمقعد وجدول الاختبار</div></div>` : ''}</div>`; }).join(''); }
    else if (k === 'seats') { const L = r.seating.filter(s => rooms.includes(s.room)).slice().sort(o.sort === 'name' ? byN : o.sort === 'class' ? ((a, b) => cmpC(clsOf(a.class_id), clsOf(b.class_id)) || byN(a, b)) : ((a, b) => a.room - b.room || a.seat - b.seat)); html = `<table><tr><th>م</th><th>رقم الجلوس</th><th>اسم الطالب</th><th>الفصل</th>${o.no ? '<th>رقم الطالب</th>' : ''}<th>اللجنة</th><th>الموقع</th></tr>${L.map((s, j) => `<tr><td>${AR(j + 1)}</td><td><b dir="ltr">${esc(s.label)}</b></td><td style="text-align:right">${esc(s.name)}</td><td>${esc(clsName(s.class_id))}</td>${o.no ? `<td dir="ltr">${esc(stu(s.student_id).no || '')}</td>` : ''}<td>${esc(RS[s.room].name)}</td><td class="small">${esc(fl(RS[s.room]))}</td></tr>`).join('')}</table>`; }
    else if (k === 'doors') { land = true; html = rooms.map((i, n) => { const L = seatsOf(i), x = RS[i]; if (!L.length) return ''; return `<div style="display:grid;grid-template-columns:1.1fr 1fr;gap:8mm;align-items:center;min-height:165mm;page-break-before:${n ? 'always' : 'auto'};break-inside:avoid"><div style="text-align:center"><div style="font-size:64px;font-weight:900;color:#082B5A;line-height:1.1">${esc(x.name)}</div><div style="font-size:26px;margin-top:6mm">أرقام الجلوس</div><div style="font-size:44px;font-weight:900;color:#005499" dir="ltr">${esc(L[0].label)} — ${esc(L[L.length - 1].label)}</div><div style="font-size:20px;margin-top:5mm">${AR(L.length)} طالباً</div><div style="font-size:17px;margin-top:4mm;color:#2E8B57">${esc([...new Set(L.map(s => clsName(s.class_id)))].join(' · '))}</div>${profs(x) ? `<div style="font-size:15px;margin-top:4mm">الملاحظون: ${esc(profs(x))}</div>` : ''}${qr ? `<div style="margin-top:4mm">${qr}</div>` : ''}</div><div style="text-align:center">${L3().room(x, { labels: L.map(s => s.label), count: L.length, scale: 26, id: 'd' + i, title: false })}${o.photo && x.photo ? `<img src="${esc(x.photo)}" style="max-width:100%;max-height:60mm;border-radius:3mm;margin-top:3mm">` : ''}</div></div>`; }).join(''); }
    else if (k === 'desks') { const per = o.desks, cols = per >= 15 ? 3 : per >= 9 ? 3 : 2; const L = r.seating.filter(s => rooms.includes(s.room)); html = `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:4mm">${L.map(s => `<div style="border:2px solid #082B5A;border-radius:4mm;padding:${per > 12 ? 2 : 4}mm;text-align:center;break-inside:avoid;min-height:${Math.floor(250 / Math.ceil(per / cols)) - 6}mm;display:flex;flex-direction:column;justify-content:center"><div style="font-size:${per > 12 ? 30 : 40}px;font-weight:900;color:#082B5A" dir="ltr">${esc(s.label)}</div><div style="font-size:${per > 12 ? 13 : 15}px;font-weight:700">${esc(s.name)}</div><div style="font-size:12px;color:#005499">${esc(clsName(s.class_id))} · ${esc(RS[s.room].name)}</div></div>`).join('')}</div>`; }
    else if (k === 'cards') { const per = o.cards, L = r.seating.filter(s => rooms.includes(s.room)), sch = (ST().sched || []); html = `<div style="display:grid;grid-template-columns:repeat(${per === 2 ? 1 : 2},1fr);gap:5mm">${L.map(s => { const x = RS[s.room], k2 = seatsOf(s.room).indexOf(s); return `<div style="border:2px solid #082B5A;border-radius:4mm;padding:3mm;break-inside:avoid;display:grid;grid-template-columns:1fr ${per === 2 ? '1.2fr' : '1fr'};gap:3mm;align-items:center"><div><div style="background:#082B5A;color:#fff;border-radius:2mm;padding:1.5mm 3mm;font-weight:800;font-size:13px">بطاقة دخول الاختبار</div><div style="font-size:${per === 6 ? 13 : 16}px;font-weight:800;margin-top:2mm">${esc(s.name)}</div><div style="font-size:12px">${esc(clsName(s.class_id))}</div><div style="font-size:12px;margin-top:1mm">${esc(x.name)} · ${esc(fl(x))}</div><div style="font-size:${per === 6 ? 22 : 30}px;font-weight:900;color:#005499" dir="ltr">${esc(s.label)}</div>${per !== 6 && sch.length ? `<table style="font-size:10px;margin-top:1mm">${sch.slice(0, 8).map(h => `<tr><td>${esc(dayOf(h.d))}</td><td>${esc(h.subj)}</td><td dir="ltr">${esc(h.from || '')}</td></tr>`).join('')}</table>` : ''}${qr ? `<div style="margin-top:1mm">${qr.replace(/width="90" height="90"/, 'width="60" height="60"')}</div>` : ''}</div><div>${L3().room(x, { labels: seatsOf(s.room).map(z => z.label), count: seatsOf(s.room).length, highlight: k2, scale: per === 2 ? 22 : 15, id: 'c' + s.student_id.slice(0, 6), title: false })}</div></div>`; }).join('')}</div>`; }
    else if (k === 'matrix') { land = true; const G = groups(); html = `<table><tr><th>اللجنة</th><th>الموقع</th>${G.map(g => `<th>${esc(g.name)}</th>`).join('')}<th>المجموع</th><th>السعة</th><th>أرقام الجلوس</th><th>الملاحظون</th></tr>${rooms.map(i => { const X = seatsOf(i), x = RS[i]; return `<tr><td><b>${esc(x.name)}</b></td><td class="small">${esc(fl(x))}</td>${G.map(g => `<td>${AR(X.filter(s => keyOf(s) === g.k).length) || '—'}</td>`).join('')}<td><b>${AR(X.length)}</b></td><td>${AR(x.capacity)}</td><td dir="ltr">${X.length ? esc(X[0].label + ' — ' + X[X.length - 1].label) : ''}</td><td class="small">${esc(profs(x))}</td></tr>`; }).join('')}<tr><th colspan="2">المجموع</th>${G.map(g => `<th>${AR(r.seating.filter(s => keyOf(s) === g.k).length)} / ${AR(g.n)}</th>`).join('')}<th>${AR(r.seating.length)}</th><th>${AR(cap())}</th><th colspan="2">بلا لجنة: ${AR(Math.max(0, E.stu.length - r.seating.length))}</th></tr></table>`; }
    else if (k === 'map') { land = true; const mp = ST().map || {}, sb = RS.map((x, i) => { const X = seatsOf(i); return X.length ? `${AR(X.length)} · ${X[0].label}–${X[X.length - 1].label}` : ''; }); html = (mp.blds || ['']).map((b, bi) => { const sv = L3().map(RS, { building: bi, sub: sb, marks: mp.marks || [], floorName: f => (mp.floorNames || {})[f] || (f === 0 ? 'الدور الأرضي' : 'الدور ' + AR(f)), scale: 20 }); return sv ? `<div ${brk(0, !bi)}><h3>${esc(b)}</h3><div style="text-align:center">${sv.replace(/width="\d+" height="\d+"/, 'style="max-width:100%;max-height:165mm"')}</div></div>` : ''; }).join('') + rooms.map(i => { const x = RS[i], X = seatsOf(i); return `<div style="page-break-before:always"><h3>${esc(x.name)} <small>— ${esc(fl(x))} · ${AR(X.length)} طالباً · الباب: اللجنة ${x.door === 'l' ? 'يسار' : 'يمين'} الداخل</small></h3><div style="display:grid;grid-template-columns:${o.photo && x.photo ? '1.4fr 1fr' : '1fr'};gap:5mm;align-items:center"><div style="text-align:center">${L3().room(x, { labels: X.map(s => s.label), count: X.length || x.rows * x.cols, scale: 30, id: 'p' + i, title: false }).replace(/width="\d+" height="\d+"/, 'style="max-width:100%;max-height:150mm"')}</div>${o.photo && x.photo ? `<img src="${esc(x.photo)}" style="max-width:100%;border-radius:3mm">` : ''}</div>${x.notes ? `<p>${esc(x.notes)}</p>` : ''}</div>`; }).join(''); }
    else if (k === 'proctors') html = `<table><tr><th>م</th><th>اللجنة</th><th>الموقع</th><th>عدد الطلاب</th><th>الملاحظ الأول</th><th>التوقيع</th><th>الملاحظ الثاني</th><th>التوقيع</th></tr>${rooms.map((i, j) => { const x = RS[i]; return `<tr><td>${AR(j + 1)}</td><td><b>${esc(x.name)}</b></td><td class="small">${esc(fl(x))}</td><td>${AR(seatsOf(i).length)}</td><td>${esc(pn(x.proctor))}</td><td style="width:13%"></td><td>${esc(pn(x.proctor2))}</td><td style="width:13%"></td></tr>`; }).join('')}</table>`;
    else if (k === 'sched') html = schedHtml();
    if (!html.replace(/<[^>]+>/g, '').trim() && k !== 'map') return A.toast('لا توجد بيانات لهذا التقرير بعد', 'warn');
    A.printDoc(T, sub, html, land);
  }
  function excel() {
    if (!window.XLSX) return A.toast('مكتبة Excel غير محمّلة', 'err');
    const r = E.row, RS = R(), wb = XLSX.utils.book_new(), add = (n, aoa) => { const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!cols'] = (aoa[0] || []).map(() => ({ wch: 20 })); XLSX.utils.book_append_sheet(wb, ws, n.slice(0, 30)); };
    add('أرقام الجلوس', [['رقم الجلوس', 'الطالب', 'الفصل', 'رقم الطالب', 'اللجنة', 'الموقع'], ...r.seating.map(s => [s.label, s.name, clsName(s.class_id), (E.stu.find(z => z.id === s.student_id) || {}).no || '', RS[s.room].name, RS[s.room].loc || ''])]);
    const G = groups(); add('كشاف الأعداد', [['اللجنة', ...G.map(g => g.name), 'المجموع', 'السعة', 'الملاحظ ١', 'الملاحظ ٢'], ...RS.map((x, i) => { const X = r.seating.filter(s => s.room === i); return [x.name, ...G.map(g => X.filter(s => keyOf(s) === g.k).length), X.length, x.capacity, pn(x.proctor), pn(x.proctor2)]; })]);
    RS.forEach((x, i) => add(x.name, [['رقم الجلوس', 'الطالب', 'الفصل'], ...r.seating.filter(s => s.room === i).map(s => [s.label, s.name, clsName(s.class_id)])]));
    if ((ST().sched || []).length) add('جدول الاختبارات', [['اليوم', 'التاريخ', 'المادة', 'الصفوف', 'من', 'إلى', 'ملاحظة'], ...ST().sched.map(h => [dayOf(h.d), h.d, h.subj, h.grades, h.from, h.to, h.note])]);
    wb.Workbook = { Views: [{ RTL: true }] }; XLSX.writeFile(wb, `${r.title}.xlsx`);
  }

  // ---------- ٧ رابط أولياء الأمور ----------
  function tShare(box) {
    const sh = ST().share; const draw = () => {
      const url = sh.token ? linkOf(E.row) : '';
      box.innerHTML = `<div class="card" style="margin-top:0"><div class="lj-two"><div>
        <label class="chk" style="font-size:16px;font-weight:800"><input type="checkbox" id="shOn" ${sh.on ? 'checked' : ''}> تفعيل رابط أولياء الأمور</label>
        <p class="small muted">صفحة تفاعلية بهوية المدرسة: جدول الاختبار، الكروكي ثلاثي الأبعاد للمباني واللجان، صورة كل لجنة، وبحث ولي الأمر برقم ابنه ليظهر له لجنته ومقعده مميّزاً على المخطط. لا تُعرض أسماء الطلاب لغير صاحب الرقم.</p>
        <div class="grid g2" style="margin-top:8px"><div class="field"><label for="shL">البحث عن مقعد الطالب</label><select class="in" id="shL"><option value="id" ${sh.lookup !== 'none' ? 'selected' : ''}>برقم الطالب أو رقم الهوية</option><option value="none" ${sh.lookup === 'none' ? 'selected' : ''}>بدون بحث (الكروكي والجدول فقط)</option></select></div></div>
        <div class="row" style="gap:14px;flex-wrap:wrap;margin:8px 0"><label class="chk small"><input type="checkbox" id="shP" ${sh.photos !== false ? 'checked' : ''}> صور اللجان</label><label class="chk small"><input type="checkbox" id="shC" ${sh.classes !== false ? 'checked' : ''}> الفصول في كل لجنة</label><label class="chk small"><input type="checkbox" id="shR" ${sh.proctors ? 'checked' : ''}> أسماء الملاحظين</label></div>
        <div class="field"><label for="shM">رسالة لأولياء الأمور (اختياري)</label><textarea class="in" id="shM" rows="3" placeholder="مثال: الحضور قبل الاختبار بربع ساعة، وإحضار الأدوات.">${esc(sh.msg || '')}</textarea></div>
        <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px"><button class="btn" id="shSv">حفظ الإعدادات والرابط</button>${sh.token ? '<button class="btn ghost" id="shNw">رابط جديد (يُلغي القديم)</button>' : ''}</div>
        ${!E.row.seating.length ? '<div class="lj-left p" style="margin-top:8px">لم يوزَّع الطلاب بعد — الرابط يعمل، لكن البحث لن يجد أحداً.</div>' : ''}
        ${!(ST().sched || []).length ? '<div class="lj-left p" style="margin-top:6px">لم يُدخل جدول الاختبارات (التبويب ٥).</div>' : ''}</div>
        <div>${url && sh.on && E.row.id ? `<div class="lj-qr" style="text-align:center">${qrSvg(url, 150)}</div><input class="in" readonly value="${esc(url)}" dir="ltr" style="margin-top:6px" aria-label="الرابط" onfocus="this.select()">
          <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px;justify-content:center"><button class="btn sm" id="shCp">نسخ الرابط</button><a class="btn ghost sm" href="${esc(url)}" target="_blank" rel="noopener">فتح المعاينة</a><button class="btn ghost sm" id="shWa">واتساب</button><button class="btn ghost sm" id="shQp">طباعة ملصق QR</button></div>` : `<div class="lj-view" style="padding:24px">${A.emptyBox('الرابط غير مفعّل', 'فعّله واحفظ ليظهر الرابط ورمز QR.')}</div>`}</div></div></div>`;
      const sv = () => { sh.on = $('#shOn', box).checked; sh.lookup = $('#shL', box).value; sh.photos = $('#shP', box).checked; sh.classes = $('#shC', box).checked; sh.proctors = $('#shR', box).checked; sh.msg = $('#shM', box).value.trim(); if (sh.on && !sh.token) sh.token = tok(); };
      $$('input,select,textarea', box).forEach(i => i.addEventListener('change', () => dirty()));
      $('#shSv', box).onclick = ev => A.run(ev.currentTarget, async () => { sv(); await save(sh.on ? 'حُفظ — الرابط فعّال الآن' : 'حُفظ — الرابط متوقف'); draw(); });
      const nw = $('#shNw', box); if (nw) nw.onclick = ev => A.run(ev.currentTarget, async () => { if (!(await A.confirmBox('إنشاء رابط جديد؟ الرابط القديم ورموز QR المطبوعة ستتوقف.', 'رابط جديد', true))) return; sv(); sh.token = tok(); await save('أُنشئ رابط جديد'); draw(); });
      const msg = () => `${E.row.title}\nاعرف لجنة ابنك ومقعده وجدول الاختبارات:\n${url}`;
      const cp = $('#shCp', box); if (cp) cp.onclick = () => navigator.clipboard.writeText(url).then(() => A.toast('نُسخ الرابط', 'ok'));
      const wa = $('#shWa', box); if (wa) wa.onclick = () => window.open('https://wa.me/?text=' + encodeURIComponent(msg()), '_blank', 'noopener');
      const qp = $('#shQp', box); if (qp) qp.onclick = () => A.printDoc(E.row.title, 'رابط اللجان لأولياء الأمور', `<div style="text-align:center;padding-top:20mm"><div style="font-size:30px;font-weight:900;color:#082B5A">${esc(E.row.title)}</div><div style="font-size:20px;margin:6mm 0">امسح الرمز لمعرفة لجنة ابنك ومقعده وجدول الاختبارات</div>${qrSvg(url, 300)}<div dir="ltr" style="font-size:13px;margin-top:5mm">${esc(url)}</div></div>`);
    };
    draw();
  }

  // تصدير للاختبار الورقي القديم
  A.lijanCan = can;
  A.lijanOpen = id => { A.LS.set('lj_open', id || ''); location.hash = '#/lijan'; };
})();
