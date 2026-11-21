/* منصة دينا — محرك الجداول الموحّد DinaTT (مستقل، بلا APP)
   يستخدمه «التوزيع والقيود والتوليد» (distribution.js). مبدأه: القيود الإلزامية أولاً ثم تحسين التفضيلية،
   وكل قيد له مستوى قوة (إلزامي/قوي/مفضّل/متوقف) ووزن ٠–١٠ يحددهما مدير الجدول.

   المدخل X:
   { D, Pn, cls:[{id,name}], hours:{cid:{sid:n}}, teachers:{cid:{sid:tid}}, locks:{cid:{'d-p':sid}},
     subj:{sid:{doubles, periods:[p], off:['d-p'], offDays:[d], pref:['d-p'], time:'early|late|mid|avoidFirst|avoidLast', maxDay, room, core}},
     blocks:{tid:['d-p']}, tlim:{tid:{maxDay,minDay,maxGaps,maxDays,maxConsec,maxLast,first:'avoid|prefer',last:'avoid|prefer',offDays:[d],pref:['d-p'],quota}},
     classOff:{cid:['d-p']}, cpref:{cid:['d-p']}, reserved:['d-p'], rooms:[{id,name,cap,off:['d-p']}],
     joint:[{id, sid, classes:[cid], n, subs:{cid:sid}}],   // مشتركة (مادة واحدة) أو متوازية (subs: مادة لكل فصل) في الوقت نفسه
     maxDay, gapsDef, consecDef, lastDef, rules:{key:{lv,w}}, ext:{tid:{'d-p':'اسم القسم'}},
     start:{cid:[sid|null]} (جدول سابق يُبدأ منه)، keep:[cid] (فصول تبقى كما في start)، nm:{s(sid),t(tid)} }
   الواجهة: DinaTT.solve(X, opt) ← Promise(R)، DinaTT.check(R)، R.alts(gi,k)، R.swap(gi,a,b)، R.grid، R.cid، R.cards */
(function (g) {
  'use strict';
  const LV = { h: 100, s: 10, p: 2, o: 0 };
  const LVN = { h: 'إلزامي', s: 'قوي', p: 'مفضّل', o: 'متوقف' };
  // [المسمى، المجموعة، المستوى الافتراضي، الوزن الافتراضي، الشرح، قابل للتعديل]
  const RULES = {
    tClash: ['عدم تعارض المعلم', 'الإلزامية', 'h', 10, 'لا يُسند للمعلم حصتان في الوقت نفسه (الحصة المشتركة لا تُعد تعارضاً)', 0],
    room: ['سعة القاعات والمعامل', 'الإلزامية', 'h', 10, 'لا يزيد عدد الفصول في القاعة/المعمل عن سعتها، ولا تُستخدم في أوقات إغلاقها', 1],
    tBlock: ['أوقات عدم إتاحة المعلم وأيام إجازته', 'الإلزامية', 'h', 10, 'لا حصص للمعلم في الأوقات المحجوبة أو أيام إجازته', 1],
    ext: ['المعلم المشترك بين الأقسام', 'الإلزامية', 'h', 10, 'مراعاة حصص المعلم في الأقسام والمراحل الأخرى (من جداولها المعتمدة)', 1],
    sOff: ['الأوقات الممنوعة للمادة', 'الإلزامية', 'h', 10, 'الحصص المسموح بها للمادة وأوقاتها وأيامها الممنوعة', 1],
    cOff: ['الأوقات المغلقة للفصل والمحجوزة', 'الإلزامية', 'h', 10, 'خارج الدوام، نشاط، خروج مبكر، أو خانة محجوزة لكل الفصول', 0],
    dbl: ['الحصص المزدوجة', 'الإلزامية', 'h', 10, 'حصتان متتاليتان في اليوم نفسه للمواد المحددة', 0],
    tMaxDay: ['أقصى حصص المعلم يومياً', 'المعلم', 's', 6, 'الحد الأعلى لحصص المعلم في اليوم الواحد', 1],
    tDays: ['أقصى أيام عمل المعلم', 'المعلم', 's', 6, 'جمع حصص المعلم في عدد أيام محدد', 1],
    tConsec: ['عدم تكديس الحصص المتتالية', 'المعلم', 's', 5, 'ألا يُدرّس المعلم أكثر من الحد متتالياً', 1],
    tGaps: ['تقليل فراغات المعلم', 'المعلم', 'p', 5, 'تقليل الفترات الفارغة بين حصص المعلم في اليوم', 1],
    tMinDay: ['أدنى حصص المعلم في يوم عمله', 'المعلم', 'p', 3, 'ألا يأتي المعلم ليوم بحصة واحدة', 1],
    tEdge: ['رغبات المعلم في الحصة الأولى والأخيرة', 'المعلم', 'p', 4, 'تجنّب أو تفضيل الحصص الأولى والأخيرة لكل معلم', 1],
    tLast: ['عدالة الحصص الأخيرة', 'المعلم', 'p', 3, 'ألا تزيد الحصص الأخيرة للمعلم أسبوعياً عن الحد', 1],
    fTeach: ['توزيع المعلم على أيام الأسبوع', 'المعلم', 'p', 2, 'تقارب عدد حصص المعلم بين أيام عمله', 1],
    pref: ['الأوقات المفضّلة (معلم/مادة/فصل)', 'التوقيت', 'p', 4, 'وضع الحصص في الأوقات المفضّلة قدر الإمكان', 1],
    time: ['توقيت المادة والحصص العملية', 'التوقيت', 'p', 4, 'أول اليوم، آخره، وسطه، أو تجنّب الأولى/الأخيرة', 1],
    core: ['المواد الأساسية في النصف الأول', 'التوقيت', 'p', 4, 'الرياضيات والعلوم واللغة العربية… في الحصص الأولى', 1],
    emptyLast: ['الحصص الفارغة في آخر اليوم', 'التوقيت', 's', 6, 'لا فراغ في وسط يوم الفصل', 1],
    sMax: ['عدم تكرار المادة في اليوم', 'توزيع المواد', 's', 6, 'أقصى عدد حصص للمادة في اليوم الواحد', 1],
    fSubj: ['توزيع المادة على أيام مختلفة', 'توزيع المواد', 's', 5, 'نشر حصص المادة على أكبر عدد من الأيام', 1],
    fGap: ['التوزيع المتباعد', 'توزيع المواد', 'p', 3, 'تجنّب أيام متتالية للمادة قليلة الحصص', 1],
    adj: ['تجنّب حصتين متتاليتين للمادة', 'توزيع المواد', 'p', 3, 'إلا المزدوجة', 1],
    fCls: ['التوازن اليومي للفصل', 'توزيع المواد', 'p', 3, 'تقارب عدد حصص الفصل بين الأيام', 1]
  };
  const CLS_R = ['sOff', 'cOff', 'sMax', 'fSubj', 'fGap', 'adj', 'time', 'core', 'pref', 'fCls', 'emptyLast'];
  const TCH_R = ['tClash', 'tBlock', 'ext', 'tMaxDay', 'tMinDay', 'tGaps', 'tDays', 'tConsec', 'tEdge', 'tLast', 'pref', 'fTeach'];
  const PRESETS = {
    balanced: ['متوازن (افتراضي)', {}],
    strict: ['صارم: كل قيود المعلم إلزامية', { tMaxDay: { lv: 'h' }, tDays: { lv: 'h' }, tConsec: { lv: 'h' }, sMax: { lv: 'h' }, tGaps: { lv: 's' } }],
    teacher: ['راحة المعلم أولاً', { tGaps: { lv: 's', w: 8 }, tConsec: { lv: 's', w: 8 }, tEdge: { lv: 's', w: 7 }, tMinDay: { lv: 's', w: 5 }, fTeach: { lv: 'p', w: 5 } }],
    student: ['مصلحة الطالب أولاً', { core: { lv: 's', w: 8 }, fSubj: { lv: 's', w: 8 }, sMax: { lv: 'h' }, fGap: { lv: 's', w: 5 }, adj: { lv: 's', w: 5 }, time: { lv: 's', w: 6 } }],
    loose: ['مرن: أسرع توليد بأقل القيود', { tGaps: { lv: 'o' }, tMinDay: { lv: 'o' }, tEdge: { lv: 'o' }, fGap: { lv: 'o' }, fTeach: { lv: 'o' }, fCls: { lv: 'o' }, core: { lv: 'o' } }]
  };
  const ruleCfg = (X, k) => { const d = RULES[k], u = (X.rules || {})[k] || {}; const lv = d[5] && u.lv && LV[u.lv] !== undefined ? u.lv : d[2]; const w = d[5] && u.w !== undefined && u.w !== '' ? Math.max(0, Math.min(10, +u.w)) : d[3]; return { lv, w }; };
  const weights = X => { const W = {}; Object.keys(RULES).forEach(k => { const c = ruleCfg(X, k); W[k] = LV[c.lv] * c.w / 5; }); W.tClash = Math.max(W.tClash, 100); return W; };
  const isHard = (X, k) => k === 'tClash' || ruleCfg(X, k).lv === 'h';
  const set = a => new Set(a || []);
  const num = v => v === '' || v === undefined || v === null || isNaN(+v) ? null : +v;

  function Model(X) {
    const D = X.D, Pn = X.Pn, N = D * Pn, cls = X.cls, W = weights(X), self = this;
    const ci = Object.fromEntries(cls.map((c, i) => [c.id, i]));
    const nm = X.nm || {}, sN = s => (nm.s ? nm.s(s) : s), tN = t => (nm.t ? nm.t(t) : t);
    const S = X.subj || {}, TL = X.tlim || {};
    const reserved = set(X.reserved);
    const coff = cls.map(c => { const s = set((X.classOff || {})[c.id]); reserved.forEach(k => s.add(k)); return s; });
    const cpref = cls.map(c => set((X.cpref || {})[c.id]));
    const rooms = Object.fromEntries((X.rooms || []).map(r => [r.id, { cap: Math.max(1, +r.cap || 1), off: set(r.off), name: r.name }]));
    // ---- البطاقات ----
    const cards = []; const jcards = {};
    const jointOf = {}; (X.joint || []).forEach(j => j.classes.forEach(c => { const sid = (j.subs && j.subs[c]) || j.sid; jointOf[c + '|' + sid] = j; }));
    const tOf = (gi, s) => s ? (((X.teachers || {})[cls[gi].id] || {})[s] || '') : '';
    cls.forEach((c, gi) => Object.entries((X.hours || {})[c.id] || {}).forEach(([s, h0]) => {
      let h = +h0 || 0; if (!h) return; const j = jointOf[c.id + '|' + s];
      const jn = j ? Math.min(h, j.n ? +j.n : h) : 0; const dbl = Math.min(+((S[s] || {}).doubles) || 0, Math.floor(h / 2));
      let jd = 0, js = 0, left = jn;
      for (let k = 0; k < dbl; k++) { const jk = j && left >= 2 ? j.id + ':d' + (jd++) : null; if (jk) left -= 2; cards.push({ gi, sid: s, len: 2, j: jk }); h -= 2; }
      for (let k = 0; k < h; k++) { const jk = j && left >= 1 ? j.id + ':s' + (js++) : null; if (jk) left--; cards.push({ gi, sid: s, len: 1, j: jk }); }
    }));
    const prepCard = (cd, i) => { cd.id = i; cd.t = tOf(cd.gi, cd.sid); cd.room = rooms[(S[cd.sid] || {}).room] ? S[cd.sid].room : ''; cd.unit = cd.j || ('c' + cd.gi); };
    cards.forEach(prepCard);
    const rebuildJ = () => { Object.keys(jcards).forEach(k => delete jcards[k]); cards.forEach(cd => { if (cd.j) (jcards[cd.j] = jcards[cd.j] || []).push(cd.id); }); Object.entries(jcards).forEach(([k, l]) => { if (l.length < 2) { l.forEach(i => { cards[i].j = null; cards[i].unit = 'c' + cards[i].gi; }); delete jcards[k]; } }); };
    rebuildJ();
    const tids = [...new Set(cards.map(c => c.t).filter(Boolean))];
    const TI = {}; tids.forEach(t => {
      const l = TL[t] || {}, b = set((X.blocks || {})[t]); (l.offDays || []).forEach(d => { for (let p = 0; p < Pn; p++) b.add(d + '-' + p); });
      TI[t] = { b, ext: (X.ext || {})[t] || {}, pref: set(l.pref), maxDay: num(l.maxDay), minDay: num(l.minDay), maxGaps: num(l.maxGaps) ?? num(X.gapsDef) ?? 1, maxDays: num(l.maxDays), maxConsec: num(l.maxConsec) ?? num(X.consecDef) ?? 4, maxLast: num(l.maxLast) ?? num(X.lastDef), first: l.first || '', last: l.last || '' };
    });
    const SI = {}; Object.keys(Object.assign({}, ...cls.map(c => (X.hours || {})[c.id] || {}))).forEach(s => {
      const c = S[s] || {}, off = set(c.off); (c.offDays || []).forEach(d => { for (let p = 0; p < Pn; p++) off.add(d + '-' + p); });
      const al = c.periods && c.periods.length ? set(c.periods.map(Number)) : null;
      SI[s] = { off, al, pref: set(c.pref), time: c.time || '', core: !!c.core, maxDay: num(c.maxDay) ?? num(X.maxDay) ?? 2 };
    });
    // ---- الحالة ----
    const G = cls.map(() => new Array(N).fill(-1)), FIX = cls.map((c, gi) => Array.from({ length: N }, (_, k) => coff[gi].has(Math.floor(k / Pn) + '-' + (k % Pn))));
    const pos = new Array(cards.length).fill(-1);
    const occT = {}; tids.forEach(t => occT[t] = Array.from({ length: N }, () => new Map()));
    const occR = {}; Object.keys(rooms).forEach(r => occR[r] = Array.from({ length: N }, () => new Map()));
    const inc = (m, u, d) => { const v = (m.get(u) || 0) + d; if (v > 0) m.set(u, v); else m.delete(u); };
    const occ = (i, d) => { const cd = cards[i], p = pos[i]; if (p < 0) return; for (let q = 0; q < cd.len; q++) { if (cd.t) inc(occT[cd.t][p + q], cd.unit, d); if (cd.room) inc(occR[cd.room][p + q], cd.unit, d); } };
    const putCard = (i, k) => { const cd = cards[i]; for (let q = 0; q < cd.len; q++) G[cd.gi][k + q] = i; pos[i] = k; occ(i, 1); };
    const takeCard = i => { const cd = cards[i]; occ(i, -1); for (let q = 0; q < cd.len; q++) G[cd.gi][pos[i] + q] = -1; pos[i] = -1; };
    // ---- التكاليف ----
    const DAYS = nm.days || ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], dn = d => DAYS[d] || ('يوم ' + (d + 1)), dp = (d, p) => dn(d) + ' الحصة ' + (p + 1);
    function classEval(gi, cnt) {
      const row = G[gi]; let c = 0; const add = (k, n, msg) => { if (!n) return; c += W[k] * n; if (cnt) { (cnt[k] = cnt[k] || []).push([n, msg]); } };
      const sess = {}, dayN = new Array(D).fill(0);
      for (let k = 0; k < N; k++) {
        const id = row[k], d = Math.floor(k / Pn), p = k % Pn, dk = d + '-' + p;
        if (id < 0) { if (W.emptyLast && !coff[gi].has(dk)) { for (let q = k + 1; q < (d + 1) * Pn; q++) if (row[q] >= 0) { add('emptyLast', 1, cnt && `${cls[gi].name}: حصة فارغة وسط يوم ${dp(d, p)}`); break; } } continue; }
        const cd = cards[id], si = SI[cd.sid]; dayN[d]++;
        if (coff[gi].has(dk)) add('cOff', 1, cnt && `${cls[gi].name}: ${sN(cd.sid)} في وقت مغلق ${dp(d, p)}`);
        if (si.off.has(dk) || (si.al && !si.al.has(p))) add('sOff', 1, cnt && `${sN(cd.sid)} (${cls[gi].name}) في وقت ممنوع ${dp(d, p)}`);
        if (si.pref.size && !si.pref.has(dk)) add('pref', 0.5, cnt && `${sN(cd.sid)} (${cls[gi].name}) خارج أوقاتها المفضّلة ${dp(d, p)}`);
        if (cpref[gi].size && !cpref[gi].has(dk)) add('pref', 0.3, cnt && `${cls[gi].name}: حصة خارج الأوقات المفضّلة للفصل ${dp(d, p)}`);
        const t = si.time, h = Pn / 2; let tv = 0;
        if (t === 'early') tv = p >= Math.ceil(h) ? p / Pn : 0; else if (t === 'late') tv = p < Math.floor(h) ? (Pn - p) / Pn : 0; else if (t === 'mid') tv = p === 0 || p === Pn - 1 ? 1 : 0; else if (t === 'avoidFirst') tv = p === 0 ? 1 : 0; else if (t === 'avoidLast') tv = p === Pn - 1 ? 1 : 0;
        if (tv) add('time', tv, cnt && `${sN(cd.sid)} (${cls[gi].name}) في توقيت غير مناسب ${dp(d, p)}`);
        if (si.core && p >= Math.ceil(h)) add('core', p / Pn, cnt && `${sN(cd.sid)} (${cls[gi].name}) مادة أساسية في آخر اليوم ${dp(d, p)}`);
        if (pos[id] === k) { const m = sess[cd.sid] = sess[cd.sid] || new Array(D).fill(0); m[d]++; }
        if (p > 0 && row[k - 1] >= 0 && row[k - 1] !== id && cards[row[k - 1]].sid === cd.sid) add('adj', 1, cnt && `${sN(cd.sid)} (${cls[gi].name}) حصتان متتاليتان ${dp(d, p)}`);
      }
      Object.entries(sess).forEach(([s, m]) => {
        const n = m.reduce((a, b) => a + b, 0), used = m.filter(Boolean).length, lim = Math.max(1, SI[s].maxDay);
        m.forEach((v, d) => { if (v > lim) add('sMax', v - lim, cnt && `${sN(s)} (${cls[gi].name}) ${v} مرات يوم ${dn(d)}`); });
        const ideal = Math.min(n, D); if (used < ideal) add('fSubj', ideal - used, cnt && `${sN(s)} (${cls[gi].name}) في ${used} أيام من ${ideal}`);
        if (n > 1 && n <= Math.ceil(D / 2)) for (let d = 1; d < D; d++) if (m[d] && m[d - 1]) add('fGap', 1, cnt && `${sN(s)} (${cls[gi].name}) في يومين متتاليين ${dn(d - 1)}`);
      });
      if (W.fCls) { const act = dayN.filter((v, d) => true); const mx = Math.max(...act), mn = Math.min(...act); if (mx - mn > 1) add('fCls', mx - mn - 1, cnt && `${cls[gi].name}: تفاوت حصص الأيام (${mn}–${mx})`); }
      return c;
    }
    function teacherEval(t, cnt) {
      const o = occT[t], I = TI[t]; let c = 0; const add = (k, n, msg) => { if (!n) return; c += W[k] * n; if (cnt) (cnt[k] = cnt[k] || []).push([n, msg]); };
      const days = []; let lastN = 0;
      for (let d = 0; d < D; d++) {
        const ps = [];
        for (let p = 0; p < Pn; p++) { const k = d * Pn + p, u = o[k].size; if (!u) continue; ps.push(p); const dk = d + '-' + p;
          if (u > 1) add('tClash', u - 1, cnt && `${tN(t)}: ${u} فصول في الوقت نفسه ${dp(d, p)}`);
          if (I.b.has(dk)) add('tBlock', u, cnt && `${tN(t)} غير متاح ${dp(d, p)}`);
          if (I.ext[dk]) add('ext', u, cnt && `${tN(t)} لديه حصة في ${I.ext[dk]} ${dp(d, p)}`);
          if (I.pref.size && !I.pref.has(dk)) add('pref', 0.5, cnt && `${tN(t)} خارج أوقاته المفضّلة ${dp(d, p)}`);
          if (p === Pn - 1) lastN++; }
        if (!ps.length) continue; days.push(ps.length);
        if (I.maxDay && ps.length > I.maxDay) add('tMaxDay', ps.length - I.maxDay, cnt && `${tN(t)}: ${ps.length} حصص يوم ${dn(d)} (الحد ${I.maxDay})`);
        if (I.minDay && ps.length < I.minDay) add('tMinDay', I.minDay - ps.length, cnt && `${tN(t)}: ${ps.length} حصة فقط يوم ${dn(d)}`);
        const gaps = ps[ps.length - 1] - ps[0] + 1 - ps.length; if (gaps > I.maxGaps) add('tGaps', gaps - I.maxGaps, cnt && `${tN(t)}: ${gaps} فراغات يوم ${dn(d)}`);
        let run = 1, mr = 1; for (let i = 1; i < ps.length; i++) { run = ps[i] === ps[i - 1] + 1 ? run + 1 : 1; if (run > mr) mr = run; }
        if (mr > I.maxConsec) add('tConsec', mr - I.maxConsec, cnt && `${tN(t)}: ${mr} حصص متتالية يوم ${dn(d)}`);
        if (I.first === 'avoid' && ps[0] === 0) add('tEdge', 1, cnt && `${tN(t)} في الحصة الأولى (لا يفضّلها) يوم ${dn(d)}`);
        if (I.first === 'prefer' && ps[0] !== 0) add('tEdge', 0.5, cnt && `${tN(t)} لا يبدأ بالحصة الأولى (يفضّلها) يوم ${dn(d)}`);
        if (I.last === 'avoid' && ps[ps.length - 1] === Pn - 1) add('tEdge', 1, cnt && `${tN(t)} في الحصة الأخيرة (لا يفضّلها) يوم ${dn(d)}`);
        if (I.last === 'prefer' && ps[ps.length - 1] !== Pn - 1) add('tEdge', 0.5, cnt && `${tN(t)} لا ينتهي بالحصة الأخيرة (يفضّلها) يوم ${dn(d)}`);
      }
      if (I.maxDays && days.length > I.maxDays) add('tDays', days.length - I.maxDays, cnt && `${tN(t)}: يعمل ${days.length} أيام (الحد ${I.maxDays})`);
      if (I.maxLast !== null && lastN > I.maxLast) add('tLast', lastN - I.maxLast, cnt && `${tN(t)}: ${lastN} حصص أخيرة أسبوعياً (الحد ${I.maxLast})`);
      if (days.length > 1) { const mx = Math.max(...days), mn = Math.min(...days); if (mx - mn > 2) add('fTeach', mx - mn - 2, cnt && `${tN(t)}: تفاوت أيامه (${mn}–${mx})`); }
      return c;
    }
    function roomEval(r, cnt) {
      const o = occR[r], R = rooms[r]; let c = 0;
      for (let k = 0; k < N; k++) { const u = o[k].size; if (!u) continue; const d = Math.floor(k / Pn), p = k % Pn; let n = Math.max(0, u - R.cap) + (R.off.has(d + '-' + p) ? u : 0);
        if (n) { c += W.room * n; if (cnt) (cnt.room = cnt.room || []).push([n, `${R.name}: ${u} فصول (السعة ${R.cap}) ${dp(d, p)}`]); } }
      return c;
    }
    const cc = new Array(cls.length).fill(0), tc = {}, rc = {};
    const total = () => cc.reduce((a, b) => a + b, 0) + Object.values(tc).reduce((a, b) => a + b, 0) + Object.values(rc).reduce((a, b) => a + b, 0);
    const recalcAll = () => { cls.forEach((c, gi) => cc[gi] = classEval(gi)); tids.forEach(t => tc[t] = teacherEval(t)); Object.keys(rooms).forEach(r => rc[r] = roomEval(r)); };
    // ---- التبادل ----
    const startOf = (gi, k) => { const id = G[gi][k]; return id < 0 ? k : pos[id]; };
    const rangeOk = (gi, s, len) => { if (s < 0 || s % Pn + len > Pn) return false; for (let q = 0; q < len; q++) { if (FIX[gi][s + q]) return false; const id = G[gi][s + q]; if (id >= 0 && (pos[id] < s || pos[id] + cards[id].len > s + len)) return false; } return true; };
    function plan(gi, a, b, len) {
      if (a === b || Math.abs(a - b) < len) return null;
      const set0 = [gi], seen = new Set(set0);
      for (let i = 0; i < set0.length; i++) { const g2 = set0[i]; if (!rangeOk(g2, a, len) || !rangeOk(g2, b, len)) return null;
        for (let q = 0; q < len; q++) [G[g2][a + q], G[g2][b + q]].forEach(id => { if (id >= 0 && cards[id].j) jcards[cards[id].j].forEach(x => { const g3 = cards[x].gi; if (!seen.has(g3)) { seen.add(g3); set0.push(g3); } }); }); }
      return set0;
    }
    function doSwap(gs, a, b, len) {
      const moved = []; gs.forEach(g2 => { for (let q = 0; q < len; q++) [G[g2][a + q], G[g2][b + q]].forEach(id => { if (id >= 0 && !moved.includes(id)) moved.push(id); }); });
      moved.forEach(i => occ(i, -1));
      gs.forEach(g2 => { for (let q = 0; q < len; q++) { const t = G[g2][a + q]; G[g2][a + q] = G[g2][b + q]; G[g2][b + q] = t; } });
      moved.forEach(i => { const p = pos[i]; pos[i] = p >= a && p < a + len ? p - a + b : p - b + a; occ(i, 1); });
      return moved;
    }
    function affected(gs, moved) { const T = new Set(), R = new Set(); moved.forEach(i => { if (cards[i].t) T.add(cards[i].t); if (cards[i].room) R.add(cards[i].room); }); return { gs, T: [...T], R: [...R] }; }
    const sumAff = f => f.gs.reduce((a, g2) => a + cc[g2], 0) + f.T.reduce((a, t) => a + tc[t], 0) + f.R.reduce((a, r) => a + rc[r], 0);
    function trySwap(gi, a, b, len, keep) {
      const gs = plan(gi, a, b, len); if (!gs) return null;
      let mv = []; gs.forEach(g2 => { for (let q = 0; q < len; q++) [G[g2][a + q], G[g2][b + q]].forEach(id => { if (id >= 0) mv.push(id); }); });
      if (!mv.length) return null;
      const f = affected(gs, mv), before = sumAff(f), old = { cc: f.gs.map(x => cc[x]), tc: f.T.map(t => tc[t]), rc: f.R.map(r => rc[r]) };
      doSwap(gs, a, b, len); f.gs.forEach(x => cc[x] = classEval(x)); f.T.forEach(t => tc[t] = teacherEval(t)); f.R.forEach(r => rc[r] = roomEval(r));
      const delta = sumAff(f) - before;
      const undo = () => { doSwap(gs, a, b, len); f.gs.forEach((x, i) => cc[x] = old.cc[i]); f.T.forEach((t, i) => tc[t] = old.tc[i]); f.R.forEach((r, i) => rc[r] = old.rc[i]); };
      if (!keep) undo();
      return { delta, undo, gs };
    }
    // ---- البناء الأولي ----
    const keep = set(X.keep);
    function initial(noise) {
      for (let gi = 0; gi < cls.length; gi++) G[gi].fill(-1); pos.fill(-1);
      tids.forEach(t => occT[t].forEach(m => m.clear())); Object.keys(occR).forEach(r => occR[r].forEach(m => m.clear()));
      cls.forEach((c, gi) => { for (let k = 0; k < N; k++) FIX[gi][k] = coff[gi].has(Math.floor(k / Pn) + '-' + (k % Pn)); });
      const used = new Set();
      // ١) فصول تبقى كما هي (التوليد الجزئي) ثم المقفل
      const fromStart = (gi, k, sid, fix) => { const id = cards.findIndex((cd, i) => !used.has(i) && cd.gi === gi && cd.sid === sid && cd.len === 1 && !cd.j); if (id < 0 || G[gi][k] >= 0) return; putCard(id, k); used.add(id); if (fix) FIX[gi][k] = true; };
      cls.forEach((c, gi) => {
        const st = X.start && X.start[c.id];
        const fx = keep.has(c.id);
        if (st && (fx || X.warm)) {
          // الحصص المزدوجة والمشتركة تُعاد كما هي إن وُجدت متتالية في الجدول السابق
          for (let k = 0; k < N; k++) { const sid = st[k]; if (!sid || G[gi][k] >= 0) continue;
            const dId = cards.findIndex((cd, i) => !used.has(i) && cd.gi === gi && cd.sid === sid && cd.len === 2 && !cd.j);
            if (dId >= 0 && k % Pn < Pn - 1 && st[k + 1] === sid && G[gi][k + 1] < 0) { putCard(dId, k); used.add(dId); if (fx) FIX[gi][k] = FIX[gi][k + 1] = true; continue; }
            const any = cards.findIndex((cd, i) => !used.has(i) && cd.gi === gi && cd.sid === sid && cd.len === 1 && (fx || !cd.j));
            if (any >= 0) { const cd = cards[any]; if (cd.j && fx) { cd.j = null; cd.unit = 'c' + gi; } if (cd.j) continue; putCard(any, k); used.add(any); if (fx) FIX[gi][k] = true; } }
        }
        Object.entries((X.locks || {})[c.id] || {}).forEach(([dk, sid]) => { const [d, p] = dk.split('-').map(Number); fromStart(gi, d * Pn + p, sid, true); });
      });
      rebuildJ(); recalcAll();
      // ٢) المجموعات بالترتيب: المشتركة، المزدوجة، الأكثر تقييداً
      const groups = []; const gseen = new Set();
      cards.forEach((cd, i) => { if (used.has(i) || gseen.has(i)) return; const grp = cd.j ? jcards[cd.j].filter(x => !used.has(x)) : [i]; grp.forEach(x => gseen.add(x)); if (grp.length) groups.push(grp); });
      const hard = grp => grp.reduce((a, i) => { const cd = cards[i]; return a + (cd.t && TI[cd.t] ? TI[cd.t].b.size + Object.keys(TI[cd.t].ext).length : 0) + (SI[cd.sid].al ? 6 : 0) + SI[cd.sid].off.size; }, 0);
      groups.sort((x, y) => (y.length > 1) - (x.length > 1) || cards[y[0]].len - cards[x[0]].len || hard(y) - hard(x) || Math.random() - .5);
      const queue = groups.slice(); let unplaced = [];
      while (queue.length) {
        const grp = queue.shift(), len = cards[grp[0]].len; let best = -1, bc = Infinity;
        for (let k = 0; k < N; k++) { if (!grp.every(i => { const gi = cards[i].gi; if (k % Pn + len > Pn) return false; for (let q = 0; q < len; q++) if (G[gi][k + q] >= 0 || FIX[gi][k + q]) return false; return true; })) continue;
          grp.forEach(i => putCard(i, k)); const gsx = [...new Set(grp.map(i => cards[i].gi))], f = affected(gsx, grp);
          const c0 = sumAff(f); let c1 = gsx.reduce((a, x) => a + classEval(x), 0) + f.T.reduce((a, t) => a + teacherEval(t), 0) + f.R.reduce((a, r) => a + roomEval(r), 0);
          grp.forEach(i => takeCard(i)); const sc = c1 - c0 + Math.random() * noise; if (sc < bc) { bc = sc; best = k; } }
        if (best >= 0) { grp.forEach(i => putCard(i, best)); const gsx = [...new Set(grp.map(i => cards[i].gi))]; gsx.forEach(x => cc[x] = classEval(x)); affected(gsx, grp).T.forEach(t => tc[t] = teacherEval(t)); affected(gsx, grp).R.forEach(r => rc[r] = roomEval(r)); continue; }
        if (len === 2) { // تُفكّ المزدوجة إلى مفردتين
          const add = []; grp.forEach(i => { const cd = cards[i]; cd.len = 1; cd.split = true; const n = Object.assign({}, cd, { j: cd.j ? cd.j + 'b' : null }); n.unit = n.j || ('c' + n.gi); cards.push(n); prepCard(n, cards.length - 1); n.unit = n.j || ('c' + n.gi); pos.push(-1); add.push(n.id); });
          rebuildJ(); queue.unshift(add); queue.unshift(grp); continue; }
        if (grp.length > 1) { grp.forEach(i => { cards[i].j = null; cards[i].unit = 'c' + cards[i].gi; cards[i].jbroken = true; queue.unshift([i]); }); continue; }
        unplaced.push(grp[0]);
      }
      rebuildJ(); recalcAll(); self.unplaced = unplaced;
    }
    // ---- التحسين ----
    async function anneal(ms, onStep, stop) {
      const t0 = Date.now(); let cur = total(), best = cur, bestG = null, it = 0, hot = [], T0 = 6;
      const snapshot = () => ({ G: G.map(r => r.slice()), pos: pos.slice(), j: cards.map(c => c.j) });
      bestG = snapshot();
      const refreshHot = () => { const s = new Set(); cls.forEach((c, gi) => { if (cc[gi] > 0.01) s.add(gi); }); tids.forEach(t => { if (tc[t] > 0.01) cards.forEach(cd => { if (cd.t === t) s.add(cd.gi); }); }); Object.keys(rc).forEach(r => { if (rc[r] > 0.01) cards.forEach(cd => { if (cd.room === r) s.add(cd.gi); }); }); hot = [...s]; };
      refreshHot();
      while (Date.now() - t0 < ms && best > 0.001 && !(stop && stop())) {
        for (let n = 0; n < 1500; n++) {
          it++; if (it % 3000 === 0) refreshHot();
          const gi = hot.length && Math.random() < 0.75 ? hot[Math.floor(Math.random() * hot.length)] : Math.floor(Math.random() * cls.length);
          const ka = Math.floor(Math.random() * N); if (FIX[gi][ka]) continue; const sa = startOf(gi, ka), id = G[gi][ka], len = id >= 0 ? cards[id].len : 1;
          const dd = Math.floor(Math.random() * D), pb = Math.floor(Math.random() * (Pn - len + 1)), sb = dd * Pn + pb;
          const r = trySwap(gi, sa, sb, len, true); if (!r) continue;
          const frac = (Date.now() - t0) / ms, temp = T0 * Math.pow(0.002, frac) + 0.01;
          if (r.delta <= 0 || Math.random() < Math.exp(-r.delta / temp)) { cur += r.delta; if (cur < best - 1e-9) { best = cur; bestG = snapshot(); } } else r.undo();
        }
        if (onStep) onStep(Math.min(1, (Date.now() - t0) / ms), best);
        await new Promise(res => setTimeout(res, 0));
      }
      // استعادة الأفضل
      for (let gi = 0; gi < cls.length; gi++) G[gi] = bestG.G[gi]; bestG.pos.forEach((p, i) => pos[i] = p); bestG.j.forEach((j, i) => { cards[i].j = j; cards[i].unit = j || ('c' + cards[i].gi); });
      rebuildJ(); tids.forEach(t => occT[t].forEach(m => m.clear())); Object.keys(occR).forEach(r => occR[r].forEach(m => m.clear())); cards.forEach((c, i) => occ(i, 1)); recalcAll();
      return { it, cost: total() };
    }
    Object.assign(this, { coff, X, D, Pn, N, cls, ci, cards, jcards, G, FIX, pos, W, tids, TI, SI, rooms, occT, occR, cc, tc, rc, total, recalcAll, initial, anneal, trySwap, startOf, rangeOk, plan, classEval, teacherEval, roomEval, tOf, sN, tN });
  }

  // ---- التقرير ----
  function check(M) {
    const X = M.X, cnt = {}; M.cls.forEach((c, gi) => M.classEval(gi, cnt)); M.tids.forEach(t => M.teacherEval(t, cnt)); Object.keys(M.rooms).forEach(r => M.roomEval(r, cnt));
    const byRule = {}; let hard = 0, soft = 0, softCost = 0;
    Object.keys(RULES).forEach(k => { const L = cnt[k] || []; const n = L.reduce((a, x) => a + x[0], 0); byRule[k] = { n: Math.round(n * 10) / 10, items: L.map(x => x[1]), lv: k === 'tClash' ? 'h' : ruleCfg(X, k).lv }; });
    // المزدوجة المفكوكة والمشتركة المكسورة وغير الموضوعة
    const split = M.cards.filter(c => c.split && !String(c.j || '').endsWith('b')); byRule.dbl.n = split.length; byRule.dbl.items = split.map(c => `${M.sN(c.sid)} (${M.cls[c.gi].name}): تعذّرت الحصة المزدوجة فوُضعت حصتين منفصلتين`);
    const jb = M.cards.filter(c => c.jbroken); if (jb.length) { byRule.dbl.items.push(...jb.map(c => `${M.sN(c.sid)} (${M.cls[c.gi].name}): تعذّر جمع الحصة المشتركة في وقت واحد`)); byRule.dbl.n += jb.length; }
    const un = M.unplaced || []; byRule.cOff.items.push(...un.map(i => `${M.sN(M.cards[i].sid)} (${M.cls[M.cards[i].gi].name}): لا توجد خانة متاحة`)); byRule.cOff.n += un.length;
    Object.entries(byRule).forEach(([k, r]) => { if (!r.n) return; if (r.lv === 'h') hard += r.n; else if (r.lv !== 'o') { soft += r.n; softCost += r.n * M.W[k]; } });
    const nCards = M.cards.length || 1;
    let score = Math.round(100 * nCards / (nCards + softCost / 3)); if (hard) score = Math.min(score, 59);
    // مؤشرات
    const req = M.cards.reduce((a, c) => a + c.len, 0), placed = M.cards.reduce((a, c, i) => a + (M.pos[i] >= 0 ? c.len : 0), 0);
    const tl = {}; M.tids.forEach(t => { const o = M.occT[t]; const days = []; let first = 0, last = 0, gaps = 0, mr = 0, load = 0;
      for (let d = 0; d < M.D; d++) { const ps = []; for (let p = 0; p < M.Pn; p++) if (o[d * M.Pn + p].size) ps.push(p); days.push(ps.length); load += ps.length; if (!ps.length) continue; if (ps[0] === 0) first++; if (ps[ps.length - 1] === M.Pn - 1) last++; gaps += ps[ps.length - 1] - ps[0] + 1 - ps.length; let r = 1; mr = Math.max(mr, 1); for (let i = 1; i < ps.length; i++) { r = ps[i] === ps[i - 1] + 1 ? r + 1 : 1; mr = Math.max(mr, r); } }
      const q = num(((X.tlim || {})[t] || {}).quota);
      tl[t] = { load, days, first, last, gaps, maxRun: mr, workDays: days.filter(Boolean).length, quota: q, classes: new Set(M.cards.filter(c => c.t === t).map(c => c.gi)).size, subjects: new Set(M.cards.filter(c => c.t === t).map(c => c.sid)).size, cost: M.tc[t] }; });
    const loads = Object.values(tl).map(x => x.load); const avg = loads.reduce((a, b) => a + b, 0) / (loads.length || 1);
    const cv = loads.length ? Math.sqrt(loads.reduce((a, b) => a + (b - avg) * (b - avg), 0) / loads.length) / (avg || 1) : 0;
    const gapsAll = Object.values(tl).reduce((a, x) => a + x.gaps, 0);
    const ru = {}; Object.entries(M.rooms).forEach(([r, R]) => { let used = 0; for (let k = 0; k < M.N; k++) used += M.occR[r][k].size; ru[r] = { name: R.name, used, avail: M.N * R.cap - R.off.size * R.cap, cap: R.cap }; });
    const roomUse = Object.values(ru).length ? Math.round(100 * Object.values(ru).reduce((a, x) => a + x.used, 0) / Math.max(1, Object.values(ru).reduce((a, x) => a + x.avail, 0))) : null;
    const cap = M.cls.reduce((a, c, gi) => a + M.FIX[gi].filter(x => !x).length, 0);
    const idx = { score, complete: Math.round(100 * placed / Math.max(1, req)), fair: Math.max(0, Math.round(100 * (1 - cv))), gaps: Math.max(0, Math.round(100 - 100 * gapsAll / Math.max(1, loads.reduce((a, b) => a + b, 0)))), rooms: roomUse, util: Math.round(100 * placed / Math.max(1, cap)) };
    const issues = [], notes = []; Object.entries(byRule).forEach(([k, r]) => { if (!r.n) return; (r.lv === 'h' ? issues : r.lv === 'o' ? [] : notes).push(...r.items.map(x => ({ k, x }))); });
    return { hard, soft, score, byRule, idx, teachers: tl, rooms: ru, issues, notes, req, placed };
  }

  async function solve(X, opt) {
    opt = opt || {}; const ms = opt.time || 4000, R = Math.max(1, opt.restarts || 1); let best = null, bestCost = Infinity, bestSnap = null;
    let M = null;
    for (let r = 0; r < R; r++) {
      M = new Model(X); M.initial(r ? 3 : 0.5);
      if (opt.onStep) opt.onStep(r / R, null, 'init');
      await M.anneal(ms / R, (f, c) => opt.onStep && opt.onStep((r + f) / R, c), opt.stop);
      const c = M.total(); if (c < bestCost) { bestCost = c; best = M; }
      if (c < 0.001 || (opt.stop && opt.stop())) break;
    }
    return wrap(best);
  }
  function wrap(M) {
    M.cls.forEach((c, gi) => { const lk = (M.X.locks || {})[c.id] || {}; for (let k = 0; k < M.N; k++) { const dk = Math.floor(k / M.Pn) + '-' + (k % M.Pn); M.FIX[gi][k] = M.coff[gi].has(dk) || (!!lk[dk] && M.G[gi][k] >= 0); } });
    const R = { M, D: M.D, Pn: M.Pn, N: M.N, cls: M.cls, ci: M.ci, cards: M.cards, jcards: M.jcards, cid: M.G, fixed: M.FIX };
    R.grid = M.G.map(r => r.map(id => id >= 0 ? M.cards[id].sid : null));
    R.tch = (gi, s) => M.tOf(gi, s);
    R.cost = M.total();
    R.refresh = () => { R.grid = M.G.map(r => r.map(id => id >= 0 ? M.cards[id].sid : null)); R.cid = M.G; R.cost = M.total(); R.report = check(M); R.issues = R.report.issues.map(i => i.x); return R; };
    // تبادل يدوي مع حساب التأثير
    R.swap = (gi, a, b) => { const sa = M.startOf(gi, a), ia = M.G[gi][a], ib = M.G[gi][b], la = ia >= 0 ? M.cards[ia].len : 1, lb = ib >= 0 ? M.cards[ib].len : 1, sb = M.startOf(gi, b); const before = check(M);
      let r = M.trySwap(gi, sa, sb, la, true); if (!r && lb !== la) r = M.trySwap(gi, sa, sb, Math.max(la, lb), true); if (!r) return null; R.refresh(); return { delta: r.delta, before, after: R.report, undo: () => { r.undo(); R.refresh(); }, classes: r.gs }; };
    // أفضل البدائل لخانة: تقييم كل تبادل ممكن في الفصل نفسه
    R.alts = (gi, a) => { const id = M.G[gi][a]; const sa = M.startOf(gi, a), len = id >= 0 ? M.cards[id].len : 1, out = [];
      for (let b = 0; b < M.N; b++) { if (b % M.Pn + len > M.Pn) continue; if (M.G[gi][b] >= 0 && M.startOf(gi, b) !== b) continue; const r = M.trySwap(gi, sa, b, len, false); if (r) out.push({ k: b, delta: Math.round(r.delta * 10) / 10, multi: r.gs.length > 1 }); }
      return out.sort((x, y) => x.delta - y.delta); };
    R.lock = (gi, k, on) => { if (M.X.cls[gi]) M.FIX[gi][k] = !!on; };
    R.refresh(); return R;
  }
  g.DinaTT = { RULES, LV, LVN, PRESETS, CLS_R, TCH_R, ruleCfg, isHard, solve, check, Model, wrap, VERSION: 2 };
})(typeof window !== 'undefined' ? window : globalThis);
