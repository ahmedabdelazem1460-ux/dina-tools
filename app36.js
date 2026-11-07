/* منصة دينا — بنك الأسئلة الذكي: تصنيف بلوم تلقائي، كشف التكرار، توليد أسئلة من نص الدرس أو ملفه، والتوليد الذكي للاختبارات والواجبات */
(function () {
  const A = window.APP; if (!A) return;
  const { $, $$, esc, AR, api, S } = A;

  // ---------- أدوات النص ----------
  const norm = s => String(s || '').replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[^؀-ۿa-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
  const STOP = new Set(('في من على إلى الى عن مع هو هي هم هذا هذه ذلك تلك التي الذي الذين اللذين ما ماذا لماذا كيف متى أين اين كان كانت يكون تكون أن ان إن لا لم لن قد ثم أو او و ف ب ل ك كل بعض عند بين حتى إذا اذا لكن بل أي اي غير منها منه فيها فيه عليها عليه لها له به بها ذات عدة أيضا ايضا حيث كما وهو وهي وفي ومن يتم تم يمكن جدا أكثر اكثر أقل اقل أول اول ثاني الثاني الأول خلال نحو لدى').split(' ').map(norm));
  const words = s => norm(s).split(' ').filter(Boolean);
  const stem = w => w.replace(/^(وال|بال|كال|فال|لل|ال|و)/, '').replace(/(ات|ون|ين|ان|ها|هم|ه)$/, '');

  // ---------- تصنيف بلوم تلقائياً من أفعال السؤال ----------
  const BL = [
    ['higher', /حلل|حللي|استنتج|استنتجي|قيم|قيّم|اقترح|اقترحي|صمم|صممي|برر|برري|انقد|ابتكر|توقع|توقعي|ماذا يحدث لو|ماذا تتوقع|رأيك|احكم|ميّز بين الحقيقة|اربط بين|كيف يمكن/],
    ['apply', /احسب|احسبي|طبق|طبقي|استخدم|استخدمي|حل |حلي|أوجد|اوجد|ارسم|ارسمي|ناتج|كم |بكم|اكتب معادلة|حوّل|حول |صحح|صححي|أعرب|اعرب|نفذ|مثّل|مثل بيانيا|قس /],
    ['understand', /اشرح|اشرحي|وضح|وضحي|وضّح|فسر|فسري|فسّر|علل|عللي|لماذا|قارن|قارني|ميز|ميزي|ميّز|صنف|صنفي|لخص|لخصي|اعط مثالا|أعط مثالا|ما الفرق|بم تفسر|عبر بأسلوبك|ما الفكرة/],
    ['remember', /عرف|عرفي|عرّف|اذكر|اذكري|عدد|عددي|سم |سمي|ما هو|ما هي|ما اسم|من هو|من هي|متى|أين|اين|أكمل|اكمل|املأ|صل |ضع علامة|اختر|ما المقصود|يسمى|تسمى/],
  ];
  const BLW = BL.map(([k, re]) => [k, new RegExp('\\s(?:[وف])?(?:' + re.source.split('|').map(x => x.trim()).join('|') + ')(?=\\s)')]);
  A.bloomOf = function (body, qtype) {
    const t = ' ' + String(body || '').replace(/[«»"()\[\]:؛،,.؟?!]/g, ' ') + ' ';
    for (const [k, re] of BLW) if (re.test(t)) return k;
    if (qtype === 'essay') return 'understand';
    if (qtype === 'order') return 'understand';
    return 'remember';
  };

  // ---------- كشف التكرار (تشابه كلمات ≥ ٨٠٪) ----------
  const sig = s => new Set(words(s).filter(w => !STOP.has(w)).map(stem).filter(w => w.length > 1));
  const sim = (a, b) => { if (!a.size || !b.size) return 0; let i = 0; a.forEach(x => b.has(x) && i++); return i / (a.size + b.size - i); };
  A.dupOf = function (body, bank, skipId) {
    const s = sig(body); if (s.size < 2) return null; const nb = norm(body);
    for (const q of bank || []) { if (q.id === skipId) continue; if (norm(q.body) === nb || sim(s, sig(q.body)) >= 0.8) return q; }
    return null;
  };

  // ---------- توليد أسئلة من نص الدرس ----------
  const DEF_RE = /^(.{2,40}?)\s+(?:هو|هي|هما|هم|يسمى|تسمى|يُسمى|تُسمى|يعرف بأنه|تعرف بأنها|يُعرّف بأنه|تُعرّف بأنها|عبارة عن)\s+(.{4,})$/;
  function sentences(text) {
    return String(text || '').replace(/\r/g, '').split(/\n+|(?<=[.؟?!؛])\s+/).map(s => s.replace(/^[\s\-–•▪●○◦*·\d٠-٩)(.]+/, '').replace(/\s+/g, ' ').trim()).filter(s => { const n = s.split(' ').length; return n >= 4 && n <= 40 && /[؀-ۿ]/.test(s); });
  }
  function keyTerms(ss) {
    const f = new Map(), raw = new Map();
    ss.forEach(s => s.split(/\s+/).forEach(w => { const c = w.replace(/[^؀-ۿa-z0-9]/gi, ''); const n = norm(c); if (n.length < 4 || STOP.has(n) || /^[0-9٠-٩]+$/.test(n)) return; const k = stem(n); f.set(k, (f.get(k) || 0) + 1); if (!raw.has(k) || c.length < raw.get(k).length) raw.set(k, c); }));
    // المصطلحات المعرَّفة تأخذ أولوية
    ss.forEach(s => { const m = s.match(DEF_RE); if (m) { const t = m[1].trim().split(/\s+/).slice(-3).join(' '); const k = stem(norm(t)); f.set(k, (f.get(k) || 0) + 5); raw.set(k, t.replace(/[^؀-ۿa-z0-9\s]/gi, '')); } });
    return [...f.entries()].filter(([, n]) => n >= 1).sort((a, b) => b[1] - a[1]).map(([k]) => raw.get(k)).filter(Boolean);
  }
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hasAl = t => /^ال/.test(t);
  function distract(ans, terms, n) {
    const a = norm(ans);
    const pool = terms.filter(t => norm(t) !== a && !norm(t).includes(a) && !a.includes(norm(t)));
    const same = pool.filter(t => hasAl(t) === hasAl(ans) && t.split(' ').length === ans.split(' ').length);
    return shuffle(same.length >= n ? same.slice(0, n * 3) : pool.slice(0, n * 4)).slice(0, n);
  }
  function findTerm(s, terms) {
    for (const t of terms) { const re = new RegExp('(^|\\s)(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')(?=$|[\\s،,.؛:؟?!])'); if (re.test(s)) return t; }
    return null;
  }
  A.genFromText = function (text, opt) {
    opt = Object.assign({ types: ['blank', 'mcq', 'tf', 'match', 'short'], max: 20 }, opt || {});
    const ss = sentences(text), terms = keyTerms(ss).slice(0, 60), out = [], used = new Set();
    const put = q => { const k = norm(q.body); if (used.has(k)) return; used.add(k); q.level = A.bloomOf(q.body, q.qtype); out.push(q); };
    const defs = ss.map(s => { const m = s.match(DEF_RE); return m && (m[2].match(/[،,]/g) || []).length < 2 ? { s, term: m[1].trim().split(/\s+/).slice(-3).join(' ').replace(/[^؀-ۿa-z0-9\s]/gi, ''), def: m[2].replace(/[.؛،]+$/, '').trim() } : null; }).filter(Boolean);
    // صل: من التعريفات
    if (opt.types.includes('match') && defs.length >= 3) {
      const ps = shuffle(defs).slice(0, Math.min(5, defs.length)).map(d => ({ t: d.term, m: d.def.split(' ').slice(0, 9).join(' ') + (d.def.split(' ').length > 9 ? '…' : '') }));
      put({ body: 'صل كل مصطلح بما يناسبه من العمود الثاني', qtype: 'match', options: ps, answer: '', points: ps.length });
    }
    // ما المقصود بـ (مقالي / قصير بإجابة نموذجية)
    if (opt.types.includes('short')) defs.slice(0, 3).forEach(d => put({ body: `ما المقصود بـ «${d.term}»؟`, qtype: 'essay', options: [], answer: d.def, points: 2 }));
    let ti = 0;
    for (const s of shuffle(ss)) {
      if (out.length >= opt.max) break;
      const t = findTerm(s, terms); if (!t) continue;
      const body = s.replace(t, '......').replace(/[.؛]+$/, '');
      const kinds = opt.types.filter(k => ['blank', 'mcq', 'tf'].includes(k)); if (!kinds.length) break;
      const k = kinds[ti++ % kinds.length];
      if (k === 'blank') put({ body, qtype: 'blank', options: [{ t }], answer: '', points: 1 });
      else if (k === 'mcq') { const d = distract(t, terms, 3); if (d.length < 2) { put({ body, qtype: 'blank', options: [{ t }], answer: '', points: 1 }); continue; } const o = shuffle([{ t, ok: true }, ...d.map(x => ({ t: x }))]); put({ body: body + ' :', qtype: 'mcq', options: o, answer: '', points: 1 }); }
      else if (k === 'tf') { const wrong = Math.random() < 0.5 ? distract(t, terms, 1)[0] : null; put({ body: (wrong ? s.replace(t, wrong) : s).replace(/[.؛]+$/, ''), qtype: 'tf', options: [], answer: wrong ? 'خطأ' : 'صواب', points: 1 }); }
    }
    // رتّب: من أول تعداد يجده (أولاً.. ثانياً أو سطر بفواصل)
    if (opt.types.includes('order')) { const l = ss.find(s => (s.match(/[،,]/g) || []).length >= 3 && /مراحل|خطوات|يمر|تبدأ|ثم|بالترتيب/.test(s)); if (l) { const it = l.replace(/^.*?(?:هي|:)\s*/, '').split(/\s*[،,]\s*(?:ثم\s+)?|\s+ثم\s+/).map(x => x.replace(/^و(?=ال)/, '').replace(/[.؛]+$/, '').trim()).filter(x => x && x.split(' ').length <= 6); if (it.length >= 3) put({ body: 'رتّب ما يلي ترتيباً صحيحاً', qtype: 'order', options: it.map(t => ({ t })), answer: '', points: it.length > 3 ? 2 : 1 }); } }
    return { qs: out.slice(0, opt.max + 2), stats: { sentences: ss.length, terms: terms.length, defs: defs.length } };
  };

  A.qGenText = function (after) {
    const X = A._assess; if (!X) return;
    const T = [['blank', 'أكمل الفراغ'], ['mcq', 'اختيار من متعدد'], ['tf', 'صواب وخطأ'], ['match', 'صل'], ['order', 'ترتيب'], ['short', 'ما المقصود بـ (مقالي)']];
    const m = A.modal(`<h3>توليد أسئلة من نص الدرس</h3>
      <p class="sub">ارفع ملف الدرس أو الملخص (PDF أو Word) من مجلدك في Drive أو من جهازك، أو الصق النص. تستخرج المنصة المصطلحات والتعريفات وتولّد أسئلة مقترحة تراجعها وتعدّلها قبل الحفظ — لا يُحفظ شيء دون موافقتك. المادة والصف: <b>${esc(A.subjName(X.ctx.subj))} · ${esc(X.gLabel(X.ctx.grade))}</b>.</p>
      <div class="iq-src"><label class="iq-drop" for="gnF"><input type="file" id="gnF" accept=".pdf,.docx,.txt,application/pdf"><b>ملف الدرس</b><span>PDF · Word — على الجوال اختر «Drive»</span></label>
        <div class="iq-side">${S.me.drive_url ? `<a class="btn ghost" href="${esc(S.me.drive_url)}" target="_blank" rel="noopener">فتح مجلدي في Drive</a>` : ''}<textarea class="in" id="gnT" rows="6" dir="auto" placeholder="الصق نص الدرس هنا…"></textarea></div></div>
      <div class="field"><label>أنواع الأسئلة</label><div class="row" style="gap:10px">${T.map(([k, n]) => `<label class="chk"><input type="checkbox" data-gt="${k}" ${k !== 'order' ? 'checked' : ''}> ${n}</label>`).join('')}</div></div>
      <div class="grid g3"><div class="field"><label for="gnN">أقصى عدد</label><input class="in" id="gnN" type="number" min="3" max="60" value="15"></div>
        <div class="field"><label for="gnL">الدرس</label><select class="in" id="gnL"><option value="">—</option>${X.CUR.map(l => `<option value="${l.id}">${esc(l.lesson)}</option>`).join('')}</select></div></div>
      <div id="gnR" class="small" role="status" aria-live="polite"></div>
      <div class="acts"><button class="btn ok" id="gnGo">توليد ومراجعة</button></div>`, { cls: 'wide' });
    const q = s => m.el.querySelector(s);
    q('#gnF').onchange = e => A.run(null, async () => { const f = e.target.files[0]; if (!f) return; q('#gnR').textContent = 'جارٍ قراءة الملف…'; const L = await A._fileLines(f); if (!L) throw new Error('صيغة غير مدعومة'); q('#gnT').value = L.join('\n'); q('#gnR').textContent = `قُرئ «${f.name}» — ${AR(L.length)} سطراً.`; });
    q('#gnGo').onclick = e => A.run(e.currentTarget, async () => {
      const txt = q('#gnT').value.trim(); if (txt.length < 60) throw new Error('النص قصير جداً — الصق فقرة من الدرس أو ارفع ملفه');
      const types = $$('[data-gt]:checked', m.el).map(i => i.dataset.gt); if (!types.length) throw new Error('اختر نوعاً واحداً على الأقل');
      const r = A.genFromText(txt, { types, max: +q('#gnN').value || 15 });
      if (!r.qs.length) throw new Error('لم أجد جملاً مناسبة للتوليد — جرّب نصاً فيه تعريفات وحقائق');
      const ls = q('#gnL').value; r.qs.forEach(x => { if (ls) x.lesson_id = ls; });
      m.close();
      A.importQ(after, { qs: r.qs, title: 'ورقة عمل — ' + ((X.CUR.find(l => l.id === ls) || {}).lesson || A.subjName(X.ctx.subj)), rep: [`مولَّدة من النص: ${AR(r.qs.length)} سؤال (${AR(r.stats.sentences)} جملة · ${AR(r.stats.defs)} تعريف) — راجعها وصحّح ما يلزم`] });
    });
  };

  // ---------- الفحص الذكي للبنك ----------
  A.bankSmart = function (after) {
    const X = A._assess; if (!X) return;
    const QB = X.QB, mine = q => q.created_by === S.me.id;
    const groups = [], seen = new Set();
    QB.forEach(q => { if (seen.has(q.id)) return; const g = QB.filter(o => o.id !== q.id && !seen.has(o.id) && (norm(o.body) === norm(q.body) || sim(sig(o.body), sig(q.body)) >= 0.8)); if (g.length) { groups.push([q, ...g]); [q, ...g].forEach(o => seen.add(o.id)); } });
    const sug = QB.map(q => ({ q, s: A.bloomOf(q.body, q.qtype) })).filter(x => x.s !== x.q.level);
    const noL = QB.filter(q => !q.lesson_id);
    const dist = X.LV.map(([k, n]) => [n, QB.filter(q => q.level === k).length]);
    const typ = X.QT.map(([k, n]) => [n, QB.filter(q => q.qtype === k).length]).filter(x => x[1]);
    const perL = X.CUR.map(l => [l.lesson, QB.filter(q => q.lesson_id === l.id).length]);
    const m = A.modal(`<h3>الفحص الذكي لبنك الأسئلة</h3><p class="sub">${esc(A.subjName(X.ctx.subj))} · ${esc(X.gLabel(X.ctx.grade))} · ${AR(QB.length)} سؤال. الاقتراحات لا تغيّر شيئاً إلا بموافقتك، وتُطبَّق على أسئلتك أنت فقط.</p>
      <div class="grid g3"><div class="sec-box"><b>المستويات</b>${dist.map(([n, c]) => `<div class="row" style="justify-content:space-between"><span>${n}</span><b>${AR(c)}</b></div>`).join('')}</div>
        <div class="sec-box"><b>الأنواع</b>${typ.map(([n, c]) => `<div class="row" style="justify-content:space-between"><span class="small">${n}</span><b>${AR(c)}</b></div>`).join('') || '<span class="muted small">—</span>'}</div>
        <div class="sec-box"><b>تغطية الدروس</b><div style="max-height:150px;overflow:auto">${perL.map(([n, c]) => `<div class="row" style="justify-content:space-between"><span class="small">${esc(n)}</span><b style="color:${c ? 'inherit' : 'var(--bad)'}">${AR(c)}</b></div>`).join('') || '<span class="muted small">لا دروس</span>'}</div>${noL.length ? `<p class="small muted">${AR(noL.length)} سؤال بلا درس</p>` : ''}</div></div>
      <h4 style="margin:14px 0 6px">أسئلة مكررة أو متشابهة (${AR(groups.length)})</h4>
      <div style="max-height:220px;overflow:auto">${groups.map(g => `<div class="sec-box" style="margin-bottom:6px">${g.map(q => `<div class="row" style="justify-content:space-between;gap:6px"><span class="small">${esc(q.body.slice(0, 120))} <span class="faint">· ${esc(A.personName(q.created_by) || '')}</span></span>${mine(q) || S.me.is_owner ? `<button class="btn bad sm" data-dl="${q.id}" aria-label="حذف">حذف</button>` : ''}</div>`).join('')}</div>`).join('') || '<p class="muted small">لا يوجد تكرار.</p>'}</div>
      <h4 style="margin:14px 0 6px">اقتراحات المستوى المعرفي (${AR(sug.length)})</h4>
      <div style="max-height:220px;overflow:auto"><table class="tbl"><thead><tr><th>السؤال</th><th>الحالي</th><th>المقترح</th><th></th></tr></thead><tbody>${sug.slice(0, 80).map(({ q, s }) => `<tr><td class="small">${esc(q.body.slice(0, 90))}</td><td>${X.lvName(q.level)}</td><td><b>${X.lvName(s)}</b></td><td>${mine(q) ? `<label class="chk"><input type="checkbox" data-sg="${q.id}" data-v="${s}"> تطبيق</label>` : '<span class="faint small">سؤال زميل</span>'}</td></tr>`).join('') || '<tr><td colspan="4" class="muted small">التصنيف متوافق.</td></tr>'}</tbody></table></div>
      <div class="acts"><button class="btn ok" id="bsAp">تطبيق المحدد</button></div>`, { cls: 'wide' });
    $$('[data-dl]', m.el).forEach(b => b.onclick = () => A.run(b, async () => { const ok = A.confirmBox ? await A.confirmBox('حذف هذا السؤال؟', 'حذف', true) : confirm('حذف؟'); if (!ok) return; await api.del('questions', b.dataset.dl); b.closest('.row').remove(); await X.loadCtx(); after && after(); }));
    m.el.querySelector('#bsAp').onclick = e => A.run(e.currentTarget, async () => { const c = $$('[data-sg]:checked', m.el); if (!c.length) throw new Error('حدّد اقتراحاً'); for (const i of c) await api.upd('questions', i.dataset.sg, { level: i.dataset.v }); await X.loadCtx(); m.close(); A.toast(`حُدّث مستوى ${AR(c.length)} سؤال`, 'ok'); after && after(); });
  };

  // ---------- التوليد الذكي للاختبارات والواجبات ----------
  const PRE = { bal: ['متوازن', { remember: 40, understand: 30, apply: 20, higher: 10 }], easy: ['تأسيسي / دعم', { remember: 60, understand: 30, apply: 10, higher: 0 }], hard: ['تحدٍّ / إثراء', { remember: 15, understand: 25, apply: 35, higher: 25 }] };
  function pickSet(pool, n, ratio, recent, typesOn) {
    const lv = Object.keys(ratio), want = {}; let s = 0;
    lv.forEach(k => { want[k] = Math.floor(n * ratio[k] / 100); s += want[k]; });
    lv.slice().sort((a, b) => ratio[b] - ratio[a]).forEach(k => { if (s < n && ratio[k]) { want[k]++; s++; } });
    const P = pool.filter(q => typesOn.includes(q.qtype));
    const score = q => (recent.has(q.id) ? 10 : 0) + Math.random();
    const out = [], short = [];
    lv.forEach(k => { const c = P.filter(q => q.level === k).sort((a, b) => score(a) - score(b)); // توزيع على الأنواع بالتناوب
      const byT = {}; c.forEach(q => (byT[q.qtype] = byT[q.qtype] || []).push(q)); const ks = Object.keys(byT); let i = 0, got = 0;
      while (got < want[k] && ks.some(t => byT[t].length)) { const t = ks[i++ % ks.length]; if (byT[t].length) { out.push(byT[t].shift()); got++; } }
      if (got < want[k]) short.push(`${A._assess.lvName(k)}: ${AR(want[k] - got)}`); });
    if (out.length < n) { const rest = P.filter(q => !out.includes(q)).sort((a, b) => score(a) - score(b)); out.push(...rest.slice(0, n - out.length)); }
    return { out, short };
  }
  A.smartQuiz = function (quizzes, after) {
    const X = A._assess; if (!X) return;
    const recentAll = new Set((quizzes || []).slice(0, 8).flatMap(z => z.question_ids || []));
    const types = X.QT.filter(([k]) => X.QB.some(q => q.qtype === k));
    const m = A.modal(`<h3>التوليد الذكي — اختبار أو واجب أو ورقة عمل</h3>
      <p class="sub">تختار المنصة الأسئلة من بنك ${esc(A.subjName(X.ctx.subj))} · ${esc(X.gLabel(X.ctx.grade))} (${AR(X.QB.length)} سؤال) وفق الدروس والمستويات والأنواع، وتتجنب ما استُخدم مؤخراً، ويمكنها بناء عدة نماذج مختلفة.</p>
      <div class="grid g3"><div class="field"><label for="sqK">النوع</label><select class="in" id="sqK">${Object.entries(X.KQ).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
        <div class="field"><label for="sqN">عدد الأسئلة</label><input class="in" id="sqN" type="number" min="1" value="${Math.min(10, X.QB.length) || 10}"></div>
        <div class="field"><label for="sqV">عدد النماذج</label><select class="in" id="sqV">${[1, 2, 3, 4].map(n => `<option value="${n}">${n === 1 ? 'نموذج واحد' : AR(n) + ' نماذج'}</option>`).join('')}</select></div>
        <div class="field"><label for="sqP">مستوى الصعوبة</label><select class="in" id="sqP">${Object.entries(PRE).map(([k, [n]]) => `<option value="${k}">${n}</option>`).join('')}</select></div>
        <div class="field"><label for="sqT">العنوان</label><input class="in" id="sqT" value="${esc(X.KQ.quiz + ' — ' + A.subjName(X.ctx.subj))}"></div>
        <div class="field"><label>&nbsp;</label><label class="chk"><input type="checkbox" id="sqR" checked> تجنّب أسئلة آخر ${AR(8)} اختبارات</label></div></div>
      <div class="field"><label>الأنواع</label><div class="row" style="gap:10px">${types.map(([k, n]) => `<label class="chk"><input type="checkbox" data-st="${k}" ${k !== 'essay' ? 'checked' : ''}> ${n} <span class="faint small">(${AR(X.QB.filter(q => q.qtype === k).length)})</span></label>`).join('') || '<span class="muted small">البنك فارغ</span>'}</div></div>
      <div class="field"><label>الدروس <a href="#" class="small" id="sqAll">الكل</a></label><div class="perm-grid" style="max-height:170px;overflow:auto">${X.CUR.map(l => `<label class="chk"><input type="checkbox" data-sl="${l.id}" checked> ${esc(l.lesson)} <span class="faint small">(${AR(X.QB.filter(q => q.lesson_id === l.id).length)})</span></label>`).join('')}<label class="chk"><input type="checkbox" data-sl="" checked> بلا درس <span class="faint small">(${AR(X.QB.filter(q => !q.lesson_id).length)})</span></label></div></div>
      <div id="sqO"></div>
      <div class="acts"><button class="btn ghost" id="sqGo">معاينة</button><button class="btn ok" id="sqMk" disabled>إنشاء</button></div>`, { cls: 'wide' });
    const q = s => m.el.querySelector(s);
    q('#sqK').onchange = () => { q('#sqT').value = X.KQ[q('#sqK').value] + ' — ' + A.subjName(X.ctx.subj); };
    q('#sqAll').onclick = e => { e.preventDefault(); const b = $$('[data-sl]', m.el); const all = b.every(i => i.checked); b.forEach(i => i.checked = !all); };
    let sets = null;
    const build = () => {
      const n = Math.max(1, +q('#sqN').value || 1), V = +q('#sqV').value, ratio = PRE[q('#sqP').value][1];
      const ls = new Set($$('[data-sl]:checked', m.el).map(i => i.dataset.sl)), tOn = $$('[data-st]:checked', m.el).map(i => i.dataset.st);
      if (!tOn.length) throw new Error('اختر نوعاً واحداً على الأقل');
      const pool = X.QB.filter(x => ls.has(x.lesson_id || ''));
      if (!pool.length) throw new Error('لا توجد أسئلة في الدروس المحددة');
      const recent = q('#sqR').checked ? new Set(recentAll) : new Set();
      sets = []; let short = [];
      for (let v = 0; v < V; v++) { const r = pickSet(pool, n, ratio, recent, tOn); r.out.forEach(x => recent.add(x.id)); sets.push(r.out); if (v === 0) short = r.short; }
      const ov = V > 1 ? sets.slice(1).map(s => s.filter(x => sets[0].includes(x)).length) : [];
      q('#sqO').innerHTML = `${short.length ? `<div class="notice warn" style="display:block">نقص في البنك (عُوِّض من مستويات أخرى): ${esc(short.join('، '))} — يمكنك «توليد أسئلة من درس» لسد النقص.</div>` : ''}
        ${sets[0].length < n ? `<div class="notice warn" style="display:block">المتاح ${AR(sets[0].length)} سؤال فقط من ${AR(n)}.</div>` : ''}
        <div class="grid g${Math.min(V, 2)}">${sets.map((s, v) => `<div class="sec-box"><b>${V > 1 ? 'النموذج ' + ['أ', 'ب', 'ج', 'د'][v] : 'الأسئلة'}</b> <span class="small muted">· ${AR(s.length)} سؤال · ${AR(s.reduce((a, x) => a + (+x.points || 0), 0))} درجة · ${X.LV.map(([k, nm]) => `${nm} ${AR(s.filter(x => x.level === k).length)}`).join(' · ')}${v && ov[v - 1] ? ` · مشترك مع أ: ${AR(ov[v - 1])}` : ''}</span><ol class="small" style="margin:6px 0 0;padding-inline-start:18px;max-height:200px;overflow:auto">${s.map(x => `<li>${esc(x.body.slice(0, 90))} <span class="faint">· ${X.qtName(x.qtype)}</span></li>`).join('')}</ol></div>`).join('')}</div>`;
      q('#sqMk').disabled = !sets[0].length;
    };
    q('#sqGo').onclick = () => { try { build(); } catch (e) { A.toast(e.message, 'err'); } };
    q('#sqMk').onclick = e => A.run(e.currentTarget, async () => {
      if (!sets) build(); const kind = q('#sqK').value, ti = q('#sqT').value.trim() || X.KQ[kind];
      if (sets.length === 1) { m.close(); A.LS.set('as_t', 'quizzes'); return X.quizEditor({ kind, title: ti, question_ids: sets[0].map(x => x.id), settings: { attempts: 1, show: 'after_submit', time: 0, shuffle: true } }, after); }
      const cls = X.myClasses().filter(c => X.gk(c) === X.ctx.grade).map(c => c.id);
      const rows = sets.map((s, v) => ({ title: `${ti} — النموذج ${['أ', 'ب', 'ج', 'د'][v]}`, kind, class_ids: cls, question_ids: s.map(x => x.id), settings: { attempts: 1, show: 'after_submit', time: 0, shuffle: true }, status: 'draft', week_id: null, school_id: X.sch(), teacher_id: S.me.id, subject_id: X.ctx.subj, grade_key: X.ctx.grade, spec_id: null }));
      await api.ins('quizzes', rows); m.close(); A.toast(`أُنشئت ${AR(rows.length)} نماذج كمسودات — عدّل الفصول وانشر كل نموذج`, 'ok'); A.LS.set('as_t', 'quizzes'); after && after();
    });
  };
})();
