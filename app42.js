/* منصة دينا — الألعاب التعليمية
   (١) مسابقة مباشرة برمز (مثل Kahoot): المعلم يعرض الأسئلة على الشاشة، والطلاب يجيبون من جوالاتهم (play.html) بنقاط للسرعة وسلسلة الصواب ولوحة متصدرين.
   (٢) ألعاب ذاتية من بنك الأسئلة (مثل Wordwall): بطاقات، مطابقة، تحدٍّ سريع، صح أم خطأ، عجلة الأسئلة — برابط يُشارك مع الطلاب. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR, I } = A;
  A.I.games = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="12" rx="4"/><path d="M7 11v4M5 13h4"/><circle cx="16" cy="12" r="1"/><circle cx="18" cy="15" r="1"/></svg>';
  if (A.NAV && !A.NAV.some(n => n[0] === 'games')) { const i = A.NAV.findIndex(n => n[0] === 'assess'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['games', 'الألعاب التعليمية', () => !!S.me && !(A.coordOnly && A.coordOnly())]); }
  const base = () => location.href.split('#')[0].replace(/[^/]*$/, '');
  const gk = c => c ? `${c.stage}|${c.grade_word}` : '';
  const gName = k => { const [st, g] = String(k || '|').split('|'); return g ? A.gradeName(g, st) : ''; };
  const SH = ['▲', '◆', '●', '■', '★', '⬟'], COL = ['#E0675A', '#005499', '#C9A44C', '#2F855A', '#AE95DA', '#3AB1DB'];
  const QTN = { mcq: 'اختيار', multi: 'متعدد', tf: 'صواب وخطأ', short: 'قصيرة', blank: 'أكمل', match: 'صل', order: 'ترتيب', essay: 'مقالي' };
  const MODES = [['flash', 'البطاقات'], ['match', 'المطابقة'], ['quiz', 'التحدي السريع'], ['tf', 'صح أم خطأ'], ['wheel', 'عجلة الأسئلة']];
  let QR = null; const loadQR = () => QR ? Promise.resolve(QR) : new Promise(ok => { const s = document.createElement('script'); s.src = 'vendor/qrcode.js'; s.onload = () => ok(QR = window.qrcode); s.onerror = () => ok(null); document.head.appendChild(s); });
  const qrSvg = (q, t, cell) => { if (!q) return ''; const x = q(0, 'M'); x.addData(t); x.make(); return x.createSvgTag({ cellSize: cell || 4, margin: 0, scalable: true }); };
  const ctxOpts = () => { const mine = new Set(S.entries.filter(e => e.teacher_id === S.me.id).map(e => e.class_id)); const cls = S.classes.filter(c => c.active !== false && (S.me.is_owner || !mine.size || mine.has(c.id))); const subs = new Set(S.entries.filter(e => e.teacher_id === S.me.id && e.subject_id).map(e => e.subject_id)); return { grades: [...new Set(cls.map(gk))].filter(Boolean), subjects: S.me.is_owner || !subs.size ? S.subjects : S.subjects.filter(s => subs.has(s.id)) }; };
  // تحويل سؤال البنك إلى صيغة المسابقة
  const snap = q => { if (q.qtype === 'tf') return { type: 'tf', body: q.body, options_t: ['صواب', 'خطأ'], options: [1, 2], correct: q.answer === 'صواب' ? '0' : '1' };
    const o = (q.options || []).map(x => x.t); if (q.qtype === 'multi') return { type: 'multi', body: q.body, options_t: o, options: o, correct: (q.options || []).map((x, i) => x.ok ? String(i) : null).filter(Boolean) };
    return { type: 'mcq', body: q.body, options_t: o, options: o, correct: String(Math.max(0, (q.options || []).findIndex(x => x.ok))) }; };

  V.games = async function (root) {
    let tab = A.LS.get('gm_t') || 'live';
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2 style="margin:0">الألعاب التعليمية</h2><p class="sub" style="margin:2px 0 0">من بنك أسئلتك: مسابقة مباشرة يجيب فيها الطلاب من جوالاتهم، أو ألعاب ذاتية برابط يلعبونها في أي وقت.</p></div></div>
      <div class="kpick" id="gmT"><button data-t="live">مسابقة مباشرة</button><button data-t="self">ألعاب ذاتية</button></div><div id="gmB" style="margin-top:10px"></div></div>`;
    $$('#gmT button', root).forEach(b => { b.classList.toggle('on', b.dataset.t === tab); b.onclick = () => { A.LS.set('gm_t', b.dataset.t); V.games(root); }; });
    const B = $('#gmB', root); (tab === 'live' ? tLive : tSelf)(B, root);
  };

  // ---------- اختيار الأسئلة من البنك ----------
  async function picker(B, opt, onGo) {
    const C = ctxOpts(); let subj = A.LS.get('gm_s') || (C.subjects[0] || {}).id, grade = A.LS.get('gm_g') || C.grades[0], Q = [], sel = new Set(), lesson = '', CUR = [];
    const load = async () => { [Q, CUR] = subj && grade ? await Promise.all([api.list('questions', { school_id: S.school.id, subject_id: subj, grade_key: grade }, { order: 'created_at' }).catch(() => []), api.list('curriculum', { school_id: S.school.id, subject_id: subj, grade_key: grade }, { order: 'sort' }).catch(() => [])]) : [[], []]; Q = Q.filter(q => opt.types.includes(q.qtype)); sel = new Set(); };
    await load();
    const draw = () => { const L = Q.filter(q => !lesson || q.lesson_id === lesson);
      B.innerHTML = `<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:8px"><label class="small">المادة <select class="in" id="gS" style="width:auto">${C.subjects.map(s => `<option value="${s.id}" ${s.id === subj ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
        <label class="small">الصف <select class="in" id="gG" style="width:auto">${C.grades.map(g => `<option value="${esc(g)}" ${g === grade ? 'selected' : ''}>${esc(gName(g))}</option>`).join('')}</select></label>
        ${CUR.length ? `<label class="small">الدرس <select class="in" id="gL" style="width:auto"><option value="">كل الدروس</option>${CUR.map(l => `<option value="${l.id}" ${l.id === lesson ? 'selected' : ''}>${esc(l.lesson)}</option>`).join('')}</select></label>` : ''}
        <button class="btn ghost sm" id="gA">تحديد الكل</button><button class="btn ghost sm" id="gR">اختيار عشوائي ١٠</button></div>
        <p class="small muted">${opt.note} — ${A.cnt(L.length, 'سؤال', 'أسئلة')} مناسبة · محدد ${AR(sel.size)}</p>
        <div class="qpick" style="max-height:44vh">${L.map(q => `<label class="chk"><input type="checkbox" data-q="${q.id}" ${sel.has(q.id) ? 'checked' : ''}> <span class="pill st-empty">${QTN[q.qtype] || q.qtype}</span> ${esc(q.body.slice(0, 110))}</label>`).join('') || A.emptyBox('لا توجد أسئلة مناسبة', 'أضف أسئلة من «التقويم ← بنك الأسئلة» أو ولّدها من نص الدرس.')}</div>
        ${opt.extra || ''}<div class="acts"><button class="btn ok" id="gGo">${opt.go}</button></div>`;
      $('#gS', B).onchange = async e => { subj = e.target.value; A.LS.set('gm_s', subj); lesson = ''; await load(); draw(); };
      $('#gG', B).onchange = async e => { grade = e.target.value; A.LS.set('gm_g', grade); lesson = ''; await load(); draw(); };
      const gl = $('#gL', B); if (gl) gl.onchange = e => { lesson = e.target.value; draw(); };
      $$('[data-q]', B).forEach(c => c.onchange = () => { c.checked ? sel.add(c.dataset.q) : sel.delete(c.dataset.q); B.querySelector('p.small.muted').innerHTML = `${opt.note} — ${A.cnt(L.length, 'سؤال', 'أسئلة')} مناسبة · محدد ${AR(sel.size)}`; });
      $('#gA', B).onclick = () => { L.forEach(q => sel.add(q.id)); draw(); };
      $('#gR', B).onclick = () => { sel = new Set(L.slice().sort(() => Math.random() - .5).slice(0, 10).map(q => q.id)); draw(); };
      $('#gGo', B).onclick = e => A.run(e.currentTarget, async () => { const qs = Q.filter(q => sel.has(q.id)); if (!qs.length) throw new Error('حدّد سؤالاً واحداً على الأقل'); await onGo(qs, { subj, grade, lesson: (CUR.find(l => l.id === lesson) || {}).lesson || '', B }); });
      opt.bind && opt.bind(B);
    };
    draw();
  }

  // ---------- المسابقة المباشرة ----------
  async function tLive(B, root) {
    const old = await api.list('games', { school_id: S.school.id, host: S.me.id }, { order: 'created_at', desc: true }).catch(() => []);
    B.innerHTML = `${old.length ? `<details class="dz-det" style="margin-bottom:10px"><summary>مسابقاتي السابقة (${AR(old.length)})</summary><div style="margin-top:6px">${old.slice(0, 15).map(g => `<div class="row" style="justify-content:space-between;border-bottom:1px dashed var(--border);padding:6px 0"><span><b>${esc(g.title)}</b> <span class="small muted">· ${AR((g.questions || []).length)} سؤال · ${esc(A.fmtDT ? A.fmtDT(g.created_at) : '')} · ${g.state === 'end' ? 'انتهت' : 'جارية'}</span></span><span class="row" style="gap:4px"><button class="btn ghost sm" data-op="${g.id}">${g.state === 'end' ? 'النتائج' : 'متابعة'}</button><button class="btn ghost sm" data-rp="${g.id}">إعادة اللعب</button></span></div>`).join('')}</div></details>` : ''}<div id="gP"></div>`;
    $$('[data-op]', B).forEach(b => b.onclick = () => host(old.find(g => g.id === b.dataset.op)));
    $$('[data-rp]', B).forEach(b => b.onclick = () => A.run(b, async () => { const g = old.find(x => x.id === b.dataset.rp); await api.rpc('game_host', { p_game: g.id, p_act: 'restart' }); host({ ...g, state: 'lobby', qi: -1 }); }));
    picker($('#gP', B), { types: ['mcq', 'tf', 'multi'], note: 'أسئلة الاختيار والصواب والخطأ ومتعدد الإجابات', go: 'إنشاء المسابقة وفتح شاشة العرض',
      extra: `<div class="grid g3" style="margin-top:8px"><div class="field"><label for="gT">العنوان</label><input class="in" id="gT" placeholder="مسابقة الدرس"></div><div class="field"><label for="gTm">زمن السؤال (ثانية)</label><select class="in" id="gTm">${[10, 15, 20, 30, 45, 60].map(t => `<option value="${t}" ${t === 20 ? 'selected' : ''}>${AR(t)}</option>`).join('')}</select></div><div class="field"><label>&nbsp;</label><label class="chk"><input type="checkbox" id="gSh" checked> خلط ترتيب الأسئلة</label></div></div>` },
      async (qs, c) => { let list = qs.map(snap).filter(x => (x.options_t || []).length >= 2); if ($('#gSh', c.B).checked) list = list.sort(() => Math.random() - .5);
        const title = $('#gT', c.B).value.trim() || `مسابقة ${A.subjName(c.subj)}${c.lesson ? ' — ' + c.lesson : ''}`; let g = null;
        for (let k = 0; k < 5 && !g; k++) { try { g = (await api.ins('games', { school_id: S.school.id, pin: String(100000 + Math.floor(Math.random() * 900000)), title, questions: list, settings: { time: +$('#gTm', c.B).value } }))[0]; } catch (e) { if (!/duplicate|unique/i.test(e.message)) throw e; } }
        if (!g) throw new Error('تعذّر إنشاء رمز — حاول مرة أخرى'); host(g); });
  }

  // شاشة العرض (ملء الشاشة)
  async function host(g) {
    const q = await loadQR(); const url = base() + 'play.html?pin=' + g.pin; let off = 0, tm = null, P = [], Ans = [], dead = false;
    const ov = document.createElement('div'); ov.className = 'gm-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'شاشة المسابقة'); document.body.appendChild(ov);
    const close = () => { dead = true; clearInterval(tm); ov.remove(); document.removeEventListener('keydown', esc1); if (document.fullscreenElement) document.exitFullscreen().catch(() => { }); };
    const esc1 = e => { if (e.key === 'Escape' && !document.fullscreenElement) close(); }; document.addEventListener('keydown', esc1);
    const act = async a => { const r = await api.rpc('game_host', { p_game: g.id, p_act: a }); if (r && r.now) off = new Date(r.now) - Date.now(); Object.assign(g, { state: r.state, qi: r.qi, q_started_at: r.at }); paint(); };
    const T = () => +((g.settings || {}).time || 20);
    const left = () => g.q_started_at ? Math.max(0, Math.ceil(T() - (Date.now() + off - new Date(g.q_started_at)) / 1000)) : T();
    const top = n => P.slice().sort((a, b) => b.score - a.score).slice(0, n);
    const bar = `<div class="gm-bar"><b>${esc(g.title)}</b><span>الرمز <b dir="ltr">${g.pin}</b></span><span id="gmN">${AR(P.length)} لاعب</span><span class="row" style="gap:6px"><button class="btn ghost sm" id="gmFs">ملء الشاشة</button><button class="btn ghost sm" id="gmX">إغلاق</button></span></div>`;
    const paint = () => { if (dead) return; const Q = (g.questions || [])[g.qi] || {}, n = (g.questions || []).length;
      let body = '';
      if (g.state === 'lobby') body = `<div class="gm-lobby"><div><p>ادخل من الجوال على</p><p class="gm-url" dir="ltr">${esc(base().replace(/^https?:\/\//, ''))}play.html</p><p>وأدخل الرمز</p><div class="gm-pin" dir="ltr">${g.pin.slice(0, 3)} ${g.pin.slice(3)}</div></div><div class="gm-qr">${qrSvg(q, url, 6)}</div></div>
        <div class="gm-pl">${P.map(p => `<span>${esc(p.nick)}</span>`).join('') || '<span class="muted">بانتظار اللاعبين…</span>'}</div><div class="center"><button class="btn ok gm-big" id="gmGo" ${n ? '' : 'disabled'}>ابدأ (${AR(n)} سؤال)</button></div>`;
      else if (g.state === 'question') { const a = Ans.filter(x => x.qi === g.qi).length;
        body = `<div class="gm-qh"><span>السؤال ${AR(g.qi + 1)} من ${AR(n)}</span><span class="gm-t" id="gmTl">${AR(left())}</span><span>${AR(a)} / ${AR(P.length)} أجابوا</span></div><h1 class="gm-q">${esc(Q.body)}</h1>${Q.type === 'multi' ? '<p class="center">(أكثر من إجابة صحيحة)</p>' : ''}
          <div class="gm-ch">${(Q.options_t || []).map((o, i) => `<div style="background:${COL[i % 6]}"><span>${SH[i % 6]}</span>${esc(o)}</div>`).join('')}</div><div class="center"><button class="btn gm-big" id="gmRv">إظهار الإجابة</button></div>`; }
      else if (g.state === 'reveal') { const A2 = Ans.filter(x => x.qi === g.qi), cor = [].concat(Q.correct || []).map(String), cnt = (Q.options_t || []).map((_, i) => A2.filter(x => { try { const v = JSON.parse(x.choice); return Array.isArray(v) ? v.map(String).includes(String(i)) : String(v) === String(i); } catch (_) { return x.choice === String(i); } }).length), mx = Math.max(1, ...cnt);
        body = `<h1 class="gm-q">${esc(Q.body)}</h1><div class="gm-bars">${(Q.options_t || []).map((o, i) => `<div class="${cor.includes(String(i)) ? 'ok' : ''}"><i style="height:${Math.round(cnt[i] / mx * 160) + 6}px;background:${COL[i % 6]}"></i><b>${AR(cnt[i])}</b><span>${SH[i % 6]} ${esc(o)}${cor.includes(String(i)) ? ' ✓' : ''}</span></div>`).join('')}</div>
          <p class="center">أجاب صحيحاً ${AR(A2.filter(x => x.ok).length)} من ${AR(P.length)}</p><ol class="gm-lb">${top(5).map(p => `<li><span>${esc(p.nick)}</span><b>${AR(p.score)}</b></li>`).join('')}</ol><div class="center"><button class="btn ok gm-big" id="gmNx">${g.qi + 1 < n ? 'السؤال التالي' : 'النتيجة النهائية'}</button></div>`; }
      else { const t3 = top(3); body = `<h1 class="gm-q">🏆 النتيجة النهائية</h1><div class="gm-pod">${[1, 0, 2].map(k => t3[k] ? `<div class="p${k + 1}"><b>${esc(t3[k].nick)}</b><span>${AR(t3[k].score)}</span><i>${['🥇', '🥈', '🥉'][k]}</i></div>` : '<div></div>').join('')}</div><ol class="gm-lb">${top(50).map(p => `<li><span>${esc(p.nick)}</span><b>${AR(p.score)}</b></li>`).join('')}</ol><div class="center"><button class="btn ghost" id="gmXl">تصدير النتائج Excel</button> <button class="btn ghost" id="gmRe">إعادة اللعب</button></div>`; }
      ov.innerHTML = bar + `<div class="gm-body">${body}</div>`;
      ov.querySelector('#gmX').onclick = close; ov.querySelector('#gmFs').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : ov.requestFullscreen()).catch(() => { });
      const on = (id, f) => { const e = ov.querySelector(id); if (e) e.onclick = () => A.run(e, f); };
      on('#gmGo', () => act('next')); on('#gmRv', () => act('reveal')); on('#gmNx', () => act('next')); on('#gmRe', () => act('restart'));
      const xl = ov.querySelector('#gmXl'); if (xl) xl.onclick = () => { const rows = top(500).map((p, i) => { const o = { 'الترتيب': i + 1, 'اللاعب': p.nick, 'النقاط': p.score, 'الصحيحة': Ans.filter(a => a.player_id === p.id && a.ok).length }; (g.questions || []).forEach((qq, k) => { const a = Ans.find(x => x.player_id === p.id && x.qi === k); o['س' + (k + 1)] = a ? (a.ok ? '✓' : '✗') : '—'; }); return o; }); const ws = XLSX.utils.json_to_sheet(rows); ws['!views'] = [{ RTL: true }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'النتائج'); XLSX.writeFile(wb, `${g.title}.xlsx`); };
    };
    const poll = async () => { if (dead) return; try { const [gs, ps, as] = await Promise.all([api.list('games', { id: g.id }), api.list('game_players', { game_id: g.id }, { order: 'joined_at' }), api.list('game_answers', { game_id: g.id })]); const ng = gs[0] || g; const ch = ng.state !== g.state || ng.qi !== g.qi || ps.length !== P.length || as.length !== Ans.length || ps.some((p, i) => (P[i] || {}).score !== p.score); Object.assign(g, ng); P = ps; Ans = as;
        if (g.state === 'question' && (left() <= 0 || (P.length && Ans.filter(x => x.qi === g.qi).length >= P.length))) { await act('reveal'); return; }
        if (ch) paint(); else { const t = ov.querySelector('#gmTl'); if (t) t.textContent = AR(left()); const nn = ov.querySelector('#gmN'); if (nn) nn.textContent = `${AR(P.length)} لاعب`; } } catch (_) { } };
    paint(); await poll(); tm = setInterval(poll, 1000);
  }

  // ---------- الألعاب الذاتية ----------
  async function tSelf(B) {
    const sets = await api.list('game_sets', { school_id: S.school.id }, { order: 'created_at', desc: true }).catch(() => []);
    const mine = sets.filter(s => s.created_by === S.me.id || S.me.is_owner);
    const q = await loadQR();
    B.innerHTML = `${mine.length ? `<h3 style="margin:0 0 6px">ألعابي (${AR(mine.length)})</h3><div class="gm-sets">${mine.map(s => `<div class="sec-box"><div class="row" style="justify-content:space-between;gap:6px"><b>${esc(s.title)}</b>${s.active ? '<span class="pill st-approved">متاحة</span>' : '<span class="pill st-empty">موقوفة</span>'}</div><div class="small muted">${esc(A.subjName(s.subject_id) || '')}${s.grade_key ? ' · ' + esc(gName(s.grade_key)) : ''} · ${AR((s.question_ids || []).length)} سؤال · لُعبت ${AR(s.plays)} مرة</div><div class="small">${(s.modes || []).map(m => (MODES.find(x => x[0] === m) || [, m])[1]).join(' · ')}</div>
        <div class="row" style="gap:4px;margin-top:6px;flex-wrap:wrap"><button class="btn sm" data-ln="${s.id}">الرابط و QR</button><a class="btn ghost sm" href="play.html?s=${esc(s.code)}" target="_blank" rel="noopener">تجربة</a><button class="btn ghost sm" data-ac="${s.id}">${s.active ? 'إيقاف' : 'إتاحة'}</button><button class="btn bad sm" data-dl="${s.id}" aria-label="حذف">×</button></div></div>`).join('')}</div><hr style="border:0;border-top:1px solid var(--border);margin:14px 0">` : ''}
      <h3 style="margin:0 0 6px">لعبة جديدة</h3><div id="gN"></div>`;
    const S2 = id => mine.find(s => s.id === id);
    $$('[data-ln]', B).forEach(b => b.onclick = () => { const s = S2(b.dataset.ln), u = base() + 'play.html?s=' + s.code; const m = A.modal(`<h3>${esc(s.title)}</h3><div class="center" style="text-align:center"><div style="width:200px;margin:0 auto">${qrSvg(q, u, 5)}</div><p dir="ltr" class="small" style="word-break:break-all">${esc(u)}</p></div><div class="row" style="justify-content:center;gap:6px"><button class="btn" id="lnC">نسخ الرابط</button><a class="btn ghost" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(s.title + '\n' + u)}">واتساب</a></div>`); m.el.querySelector('#lnC').onclick = () => navigator.clipboard.writeText(u).then(() => A.toast('نُسخ الرابط', 'ok')); });
    $$('[data-ac]', B).forEach(b => b.onclick = () => A.run(b, async () => { const s = S2(b.dataset.ac); await api.upd('game_sets', s.id, { active: !s.active }); tSelf(B); }));
    $$('[data-dl]', B).forEach(b => b.onclick = async () => { if (!(await A.confirmBox('حذف هذه اللعبة؟ الأسئلة في البنك لا تتأثر.', 'حذف', true))) return; A.run(null, async () => { await api.del('game_sets', b.dataset.dl); tSelf(B); }); });
    picker($('#gN', B), { types: ['mcq', 'multi', 'tf', 'short', 'blank', 'match', 'order'], note: 'كل أنواع الأسئلة (عدا المقالي)', go: 'إنشاء اللعبة',
      extra: `<div class="grid g2" style="margin-top:8px"><div class="field"><label for="gT2">العنوان</label><input class="in" id="gT2" placeholder="مراجعة الدرس"></div><div class="field"><label>طرق اللعب</label><div class="row" style="gap:8px;flex-wrap:wrap">${MODES.map(([k, n]) => `<label class="chk"><input type="checkbox" data-md="${k}" checked> ${n}</label>`).join('')}</div></div></div>` },
      async (qs, c) => { const modes = $$('[data-md]:checked', c.B).map(i => i.dataset.md); if (!modes.length) throw new Error('اختر طريقة لعب واحدة على الأقل'); let r = null;
        for (let k = 0; k < 5 && !r; k++) { try { r = (await api.ins('game_sets', { school_id: S.school.id, code: Math.random().toString(36).slice(2, 8).toUpperCase(), title: $('#gT2', c.B).value.trim() || `مراجعة ${A.subjName(c.subj)}${c.lesson ? ' — ' + c.lesson : ''}`, subject_id: c.subj, grade_key: c.grade, question_ids: qs.map(x => x.id), modes }))[0]; } catch (e) { if (!/duplicate|unique/i.test(e.message)) throw e; } }
        A.toast('أُنشئت اللعبة — شارك رابطها مع الطلاب', 'ok'); tSelf(B); });
  }
})();
