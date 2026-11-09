/* منصة دينا — نواة التوقيت الموحّدة (تُستخدم في المنصة وشاشة اللوحة اليومية board.html)
   مصدر واحد لحساب «توقيت اليوم» حتى لا تختلف الشاشة عن المنصة:
   الأولوية: إجازة ← يوم غير دراسي ← جدول استثنائي منشور يغطي اليوم ← جدول زمني مفعّل بتاريخ ← الجدول الأساسي.
   قراءة فقط — لا تكتب أي بيانات. */
(function () {
  const toMin = t => { const [h, m] = String(t || '07:00').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  const hhmm = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const DEF_TITLE = 'الجدول الزمني لليوم الدراسي';
  const norm = raw => {
    const b = JSON.parse(JSON.stringify(raw || {}));
    if (!Array.isArray(b.schedules)) b.schedules = [];
    b.schedules.forEach(s => { s.perDur = s.perDur || {}; s.breaks = s.breaks || []; s.title = s.title || DEF_TITLE; });
    if (b.schedules.length && !b.schedules.some(s => s.id === b.def)) b.def = b.schedules[0].id;
    b.acts = Array.isArray(b.acts) ? b.acts : []; b.holidays = Array.isArray(b.holidays) ? b.holidays : [];
    return b;
  };
  const actOn = (b, d) => b.acts.find(a => a.from && a.to && a.from <= d && d <= a.to && b.schedules.some(s => s.id === a.sid));
  const activeSched = (b, d) => { const a = actOn(b, d); return b.schedules.find(s => s.id === (a ? a.sid : b.def)) || b.schedules[0] || null; };
  const applies = (br, cid) => !(br.classes || []).length || (cid && br.classes.includes(cid));
  // مطابق تماماً لـ A.bell.timeline
  function timeline(s, P, cid) {
    const out = []; let t = toMin(s.start);
    for (let p = 0; p < P; p++) {
      const d = +(s.perDur || {})[p] || +s.dur || 45; out.push({ k: 'p', i: p, from: t, to: t + d, dur: d }); t += d;
      if (p === P - 1) break;
      const brs = (s.breaks || []).filter(b => +b.after === p + 1 && applies(b, cid));
      if (brs.length) brs.forEach(b => { const bd = +b.dur || 0; out.push({ k: 'b', label: b.label || 'الفسحة', from: t, to: t + bd, dur: bd }); t += bd; });
      else if (+s.pass > 0) { out.push({ k: 't', from: t, to: t + +s.pass, dur: +s.pass }); t += +s.pass; }
    }
    return { items: out, start: toMin(s.start), end: t };
  }
  const actDays = (s, nDays) => { const all = Array.from({ length: nDays || 5 }, (_, i) => i); return Array.isArray(s.days) && s.days.length ? all.filter(d => s.days.includes(d)) : all; };
  const schedP = (s, nPer, d) => { const P = nPer || 7, base = Math.min(P, +s.np || P); return d == null ? base : Math.min(P, +(s.perDay || {})[d] || base); };
  const dowOf = iso => new Date(iso + 'T12:00:00Z').getUTCDay(); // ٠ = الأحد
  const addDays = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const holidayOn = (b, iso) => (b.holidays || []).find(h => h.from && h.from <= iso && iso <= (h.to || h.from));
  // ترتيب العناصر وتصحيح عبور منتصف الليل، وإزالة الفجوات السالبة (التداخل) مع تسجيله
  function tidy(items, warn) {
    let prevEnd = null, off = 0;
    const L = items.map(x => ({ ...x })).filter(x => x.from != null && x.to != null);
    L.forEach(x => {
      x.from += off; x.to += off;
      if (prevEnd != null && x.from < prevEnd - 720) { x.from += 1440; x.to += 1440; off += 1440; } // بدأ بعد منتصف الليل
      if (x.to < x.from && x.from - x.to > 720) x.to += 1440;                                        // يعبر منتصف الليل
      prevEnd = x.to;
    });
    L.sort((a, b) => a.from - b.from || (a.k === 'p' ? -1 : 1));
    for (let i = 1; i < L.length; i++) { const a = L[i - 1], b = L[i]; if (b.from < a.to) { warn && warn.push(`تداخل: ${a.k === 'p' ? 'الحصة ' + (a.i + 1) : a.label || 'فاصل'} (${hhmm(a.from)}–${hhmm(a.to)}) مع ${b.k === 'p' ? 'الحصة ' + (b.i + 1) : b.label || 'فاصل'} (${hhmm(b.from)}–${hhmm(b.to)})`); } }
    L.forEach(x => { x.dur = x.to - x.from; });
    return L;
  }
  // عناصر اليوم من جدول استثنائي (meta.times + meta.breaks) مع إضافة فواصل الانتقال
  function fromMeta(M, dow, warn) {
    const T = (M.times || []).filter(t => t && t[0] && t[1]);
    const P = Math.min(T.length, +(M.perDay || {})[dow] || +M.periods || T.length);
    const out = T.slice(0, P).map((t, i) => ({ k: 'p', i, from: toMin(t[0]), to: toMin(t[1]) }));
    (M.breaks || []).forEach(b => { if (+b.after >= 1 && +b.after < P && b.from && b.to) out.push({ k: 'b', label: b.label || 'الفسحة', from: toMin(b.from), to: toMin(b.to) }); });
    const L = tidy(out, warn), R = [];
    L.forEach((x, i) => { if (i && x.from > L[i - 1].to && L[i - 1].k === 'p' && x.k === 'p') R.push({ k: 't', from: L[i - 1].to, to: x.from, dur: x.from - L[i - 1].to }); R.push(x); });
    return R;
  }
  const dispOn = (list, iso) => (list || []).filter(d => d && d.published && d.date_from <= iso && iso <= d.date_to && d.meta && (d.meta.times || []).length)
    .sort((a, b) => String(b.published_at || b.updated_at || '').localeCompare(String(a.published_at || a.updated_at || '')));
  /* خطة اليوم: sec = {bell, periods, days}، disp = الجداول الاستثنائية للقسم */
  function dayPlan(sec, iso, disp, cid) {
    const b = norm(sec && sec.bell), nDays = (sec && sec.days) || 5, nPer = (sec && sec.periods) || 7, dow = dowOf(iso), warn = [];
    const R = (o) => Object.assign({ iso, dow, items: [], warn, h24: false }, o);
    const ho = holidayOn(b, iso); if (ho) return R({ src: 'holiday', name: ho.label || 'إجازة' });
    const ds = dispOn(disp, iso);
    if (ds.length) {
      const d = ds[0], M = d.meta;
      if (ds.length > 1) warn.push(`يغطي هذا اليوم ${ds.length} جداول استثنائية منشورة — اعتُمد الأحدث «${d.label}»`);
      if (Array.isArray(M.days) && M.days.length && !M.days.includes(dow)) return R({ src: 'off', name: d.label || 'جدول استثنائي' });
      const items = fromMeta(M, dow, warn);
      return R({ src: 'disp', name: d.label || 'جدول استثنائي', tag: d.tag || '', ref: d, items, start: items.length ? items[0].from : null, end: items.length ? items[items.length - 1].to : null });
    }
    if (dow >= nDays) return R({ src: 'off', name: 'يوم غير دراسي' });
    const s = activeSched(b, iso); if (!s) return R({ src: 'none', name: 'لم يُحدَّد جدول زمني' });
    const a = actOn(b, iso);
    if (!actDays(s, nDays).includes(dow)) return R({ src: 'off', name: s.name });
    const tl = timeline(s, schedP(s, nPer, dow), cid), items = tidy(tl.items, warn);
    return R({ src: a ? 'act' : 'def', name: s.name, sched: s, act: a, h24: !!s.h24, items, start: tl.start, end: tl.end });
  }
  const SRC = { holiday: 'إجازة', off: 'لا دراسة', disp: 'جدول استثنائي منشور', act: 'جدول مفعّل لهذه الفترة', def: 'الجدول الأساسي', none: 'غير محدد' };

  /* فحص التعارضات: يعيد [{lv:'bad'|'warn'|'info', t:'نص', fix?}] — للعرض فقط */
  function check(sec, disp, from, days) {
    const b = norm(sec && sec.bell), nPer = (sec && sec.periods) || 7, nDays = (sec && sec.days) || 5, out = [];
    const add = (lv, t) => out.push({ lv, t });
    const isRemote = s => /بعد|remote/i.test((s.name || '') + ' ' + (s.tag || ''));
    if (!b.schedules.length) { add('bad', 'لا يوجد أي جدول زمني لهذا القسم.'); return out; }
    const def = b.schedules.find(s => s.id === b.def);
    if (def && isRemote(def) && b.schedules.some(s => !isRemote(s))) add('warn', `الجدول الأساسي (الافتراضي) هو «${def.name.trim()}» وهو جدول تعليم عن بعد — إن عادت الدراسة حضورياً فاجعل الجدول الحضوري هو الأساسي، وفعّل جدول «عن بعد» لفترته فقط.`);
    const names = {};
    b.schedules.forEach(s => {
      const nm = (s.name || '').trim() || 'بلا اسم'; names[nm] = (names[nm] || 0) + 1;
      const st = toMin(s.start), P = Math.max(1, ...actDays(s, nDays).map(d => schedP(s, nPer, d))), tl = timeline(s, P, null);
      if (/^جدول\s*[٠-٩0-9]+$/.test(nm) || nm === 'بلا اسم') add('warn', `الجدول «${nm}» اسمه غير واضح — سمِّه (مثل: الحضوري الشتوي) حتى لا يُخلط بغيره.`);
      if (st >= 14 * 60) add('info', `«${nm}» يبدأ مساءً ${hhmm(st)}${isRemote(s) ? ' (تعليم عن بعد)' : ''}.`);
      if (tl.end > 1440) add('warn', `«${nm}» ينتهي بعد منتصف الليل (${hhmm(tl.end)}).`);
      if (!isRemote(s) && P >= 5 && !(s.breaks || []).length) add('warn', `«${nm}» لا يحتوي على فسحة مع ${P} حصص — أضف الفسحة حتى تظهر في اللوحة والملصق.`);
      if (+s.np > nPer) add('info', `«${nm}» مضبوط على ${s.np} حصص بينما عدد حصص القسم ${nPer} — يُعرض ${nPer} فقط.`);
      (s.breaks || []).forEach(br => { if (+br.after >= P) add('warn', `في «${nm}» فسحة «${br.label || 'الفسحة'}» بعد الحصة ${br.after} ولا توجد حصة بعدها، فلن تظهر.`); if (!(+br.dur > 0)) add('warn', `في «${nm}» فسحة بلا مدة.`); });
      const byAfter = {}; (s.breaks || []).filter(x => !(x.classes || []).length).forEach(x => { byAfter[x.after] = (byAfter[x.after] || 0) + 1; });
      Object.entries(byAfter).filter(([, n]) => n > 1).forEach(([a]) => add('warn', `في «${nm}» أكثر من فسحة عامة بعد الحصة ${a} — تُجمع مدتها وتؤخر باقي الحصص.`));
      if ((s.breaks || []).some(x => (x.classes || []).length)) add('info', `«${nm}» فيه فسحات خاصة ببعض الصفوف — اللوحة العامة تعرض التوقيت العام، وتوقيت تلك الصفوف يختلف.`);
      Object.entries(s.perDur || {}).forEach(([p, v]) => { if (+v > 0 && (+v < 20 || +v > 90)) add('warn', `في «${nm}» مدة الحصة ${+p + 1} = ${v} دقيقة (غير معتادة).`); });
    });
    Object.entries(names).filter(([, n]) => n > 1).forEach(([n]) => add('warn', `يوجد أكثر من جدول بالاسم «${n}».`));
    b.acts.forEach((a, i) => {
      const s = b.schedules.find(x => x.id === a.sid);
      if (!s) add('bad', `تفعيل بتاريخ ${a.from || '؟'} يشير إلى جدول محذوف — لن يعمل.`);
      if (!a.from || !a.to) add('bad', 'تفعيل بلا تاريخ بداية أو نهاية — لن يعمل.');
      else if (a.to < a.from) add('bad', `تفعيل نهايته (${a.to}) قبل بدايته (${a.from}).`);
      b.acts.slice(i + 1).forEach(c => { if (a.from && a.to && c.from && c.to && a.from <= c.to && c.from <= a.to) add('bad', `تفعيلان متداخلان: ${a.from}→${a.to} و ${c.from}→${c.to} — يُعتمد الأول فقط.`); });
    });
    const pub = (disp || []).filter(d => d.published);
    pub.forEach((d, i) => pub.slice(i + 1).forEach(e => { if (d.date_from <= e.date_to && e.date_from <= d.date_to) add('bad', `جدولان استثنائيان منشوران متداخلان: «${d.label}» (${d.date_from}→${d.date_to}) و«${e.label}» (${e.date_from}→${e.date_to}).`); }));
    (disp || []).forEach(d => { const w = []; tidy((d.meta && d.meta.times || []).map((t, i) => ({ k: 'p', i, from: toMin(t[0]), to: toMin(t[1]) })), w); w.forEach(x => add('bad', `«${d.label}»: ${x}`)); });
    // الأيام القادمة: تعارض جدول استثنائي غير منشور مع الجدول الزمني
    const F = from || new Date(Date.now() + 3 * 36e5).toISOString().slice(0, 10);
    (disp || []).filter(d => !d.published && d.date_to >= F).forEach(d => add('info', `الجدول الاستثنائي «${d.label}» (${d.date_from}→${d.date_to}) غير منشور — اللوحة تعرض في تلك الأيام توقيت «${(activeSched(b, d.date_from) || {}).name || '—'}».`));
    for (let k = 0; k < (days || 14); k++) { const iso = addDays(F, k), p = dayPlan(sec, iso, disp, null); p.warn.forEach(w => add('bad', `${iso}: ${w}`)); }
    const seen = new Set(); return out.filter(x => !seen.has(x.t) && seen.add(x.t));
  }
  window.DinaBell = { toMin, hhmm, norm, activeSched, actOn, timeline, actDays, schedP, dowOf, addDays, holidayOn, tidy, fromMeta, dispOn, dayPlan, check, SRC };
})();
