/* منصة دينا — مساعد المعلم الذكي (أدوات مجانية تعمل داخل المتصفح، بلا خدمة ذكاء اصطناعي مدفوعة):
   من عنوان الدرس أو نصه أو ملف (Word/PDF/صورة) يُنتج: خطة درس كاملة بأهداف مصنفة على بلوم واستراتيجيات وزمن،
   أسئلة تقويم (محرك البنك الذكي A.genFromText)، أنشطة صفية متنوعة، واجباً، ملخصاً، وخطة تمايز —
   مع الطباعة بهوية المدرسة، والنسخ، وتحويلها لعرض تقديمي أو سؤال لحظي. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;
  A.I.assistant = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></svg>';
  if (A.NAV && !A.NAV.some(n => n[0] === 'assistant')) { const i = A.NAV.findIndex(n => n[0] === 'prep'); A.NAV.splice(i < 0 ? A.NAV.length : i + 1, 0, ['assistant', 'مساعد المعلم', () => !!S.me && !S.realMe && A.tfeat('assistant')]); }
  if (!document.getElementById('ascss')) { const st = document.createElement('style'); st.id = 'ascss'; st.textContent = `
.as-in{display:grid;gap:10px}
.as-out{display:grid;gap:12px;margin-top:14px}
.as-sec{border:1px solid #DCE7F3;border-radius:18px;padding:14px 16px;background:linear-gradient(180deg,#fff,#F7FAFD);box-shadow:0 12px 26px -22px rgba(8,43,90,.6)}
.as-sec h3{margin:0 0 8px;color:#082B5A;display:flex;gap:8px;align-items:center}.as-sec h3 .n{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,#005499,#082B5A);font-size:14px}
.as-sec ul,.as-sec ol{margin:0;padding-inline-start:22px;line-height:1.9}
.as-tl{display:grid;gap:6px}.as-tl div{display:grid;grid-template-columns:90px 70px 1fr;gap:8px;align-items:start;border-inline-start:3px solid #3AB1DB;padding:6px 10px;background:#fff;border-radius:10px}
.as-lv{display:inline-block;font-size:11px;font-weight:800;border-radius:20px;padding:1px 8px;margin-inline-start:6px;background:#E8F1F9;color:#005499}
.as-acts{display:flex;gap:6px;flex-wrap:wrap}
.as-cards{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr))}.as-cards div{border:1px dashed #9CC4E4;border-radius:14px;padding:10px;background:#fff}.as-cards b{color:#005499}
`; document.head.appendChild(st); }

  // ---------- أدوات النص ----------
  const STOP = new Set('في من إلى على عن أن إن كان كانت التي الذي الذين هذه هذا ذلك تلك ثم أو و ما لا لم لن هو هي هم هن نحن قد كل بعض بين عند حتى إذا كما مع أي غير بها له لها به منها فيها عليه عليها التى الى ان او اذا'.split(' '));
  const sentences = t => String(t || '').replace(/\r/g, '').split(/(?<=[.؟?!؛])\s+|\n+/).map(s => s.trim()).filter(s => s.split(' ').length >= 4);
  function keyTerms(text, n) { const f = {}; String(text || '').replace(/[^؀-ۿa-zA-Z\s]/g, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w)).forEach(w => { const k = w.replace(/^(وال|بال|كال|فال|لل|ال)/, ''); if (k.length > 2) f[k] = (f[k] || 0) + 1; });
    return Object.entries(f).sort((a, b) => b[1] - a[1]).slice(0, n || 10).map(x => x[0]); }
  function summary(text, n) { const ss = sentences(text); if (ss.length <= n) return ss; const kt = new Set(keyTerms(text, 25)); const sc = ss.map((s, i) => ({ s, i, v: s.split(/\s+/).filter(w => kt.has(w.replace(/^(وال|بال|كال|فال|لل|ال)/, ''))).length / Math.sqrt(s.split(' ').length) + (i === 0 ? .5 : 0) }));
    return sc.sort((a, b) => b.v - a.v).slice(0, n).sort((a, b) => a.i - b.i).map(x => x.s); }
  const BLOOM = { remember: ['تذكر', ['يعدد', 'يذكر', 'يعرّف', 'يسمي']], understand: ['فهم', ['يوضح', 'يفسر', 'يصف', 'يميز بين']], apply: ['تطبيق', ['يطبق', 'يستخدم', 'يحل', 'يمثّل']], analyze: ['تحليل', ['يقارن بين', 'يحلل', 'يصنف', 'يستنتج']], evaluate: ['تقويم', ['يحكم على', 'يبرر', 'ينقد']], create: ['إبداع', ['يصمم', 'يقترح', 'يبتكر']] };
  function objectives(title, text) {
    const terms = keyTerms(text || title, 6); const t = title || terms[0] || 'الدرس'; const pick = (lv, i) => BLOOM[lv][1][i % BLOOM[lv][1].length];
    const out = [];
    const given = sentences(text).filter(s => /^(أن\s+)?(يتعرف|يذكر|يعدد|يوضح|يفسر|يطبق|يحل|يقارن|يميز|يستنتج|يصمم|يكتب|يقرأ|يحسب)/.test(s.replace(/^[-•\d.\s]+/, ''))).slice(0, 5);
    if (given.length) given.forEach(s => out.push({ t: s.replace(/^[-•\d.\s]+/, '').replace(/^(?!أن)/, 'أن '), lv: lvOf(s) }));
    else {
      out.push({ t: `أن ${pick('remember', 0)} الطالب المفاهيم الأساسية في ${t}${terms[1] ? ' مثل: ' + terms.slice(1, 3).join(' و') : ''}.`, lv: 'remember' });
      out.push({ t: `أن ${pick('understand', 0)} الطالب ${terms[1] ? 'مفهوم ' + terms[1] : 'فكرة الدرس'} بأسلوبه الخاص.`, lv: 'understand' });
      out.push({ t: `أن ${pick('apply', 0)} الطالب ما تعلمه في ${t} على مواقف وأمثلة جديدة.`, lv: 'apply' });
      out.push({ t: `أن ${pick('analyze', 0)} الطالب ${terms[2] && terms[3] ? terms[2] + ' و' + terms[3] : 'عناصر الدرس'}.`, lv: 'analyze' });
      out.push({ t: `أن ${pick('create', 1)} الطالب حلاً أو نموذجاً يوظّف ${t}.`, lv: 'create' });
    }
    return out;
  }
  const lvOf = s => /يتعرف|يذكر|يعدد|يعرف|يسمي/.test(s) ? 'remember' : /يوضح|يفسر|يصف|يميز/.test(s) ? 'understand' : /يطبق|يحل|يستخدم|يحسب/.test(s) ? 'apply' : /يقارن|يحلل|يصنف|يستنتج/.test(s) ? 'analyze' : /يصمم|يبتكر|يقترح|يكتب/.test(s) ? 'create' : 'understand';
  const STRAT = [['فكر – زاوج – شارك', 'يفكر كل طالب فردياً في سؤال مفتوح عن {t} دقيقة، ثم يتناقش مع زميله، ثم تشارك الأزواج إجاباتها.'], ['التعلم التعاوني (جيكسو)', 'تُقسم أجزاء الدرس ({k}) على مجموعات خبراء، ثم يعود كل خبير لمجموعته الأم ليشرح جزأه.'],
    ['الخرائط الذهنية', 'يرسم الطلاب خريطة ذهنية مركزها «{t}» وفروعها: {k}.'], ['التعلم بالمحطات', 'أربع محطات: قراءة وتلخيص، حل تمارين، نشاط عملي، سؤال تحدٍّ — تتنقل المجموعات كل ٥ دقائق.'],
    ['بطاقة الخروج', 'في آخر الحصة يكتب الطالب: شيئاً تعلّمه، وسؤالاً ما زال لديه، ومثالاً من حياته عن {t}.'], ['لعب الأدوار', 'يمثل الطلاب موقفاً يوظّف مفهوم {k1} أمام زملائهم.'], ['العصف الذهني', 'سؤال مثير: «ماذا لو لم يوجد {k1}؟» تُجمع الأفكار على السبورة وتُصنف.'], ['السؤال اللحظي', 'سؤال اختيار من متعدد عن {k1} يجيب عنه الطلاب من جوالاتهم لقياس الفهم فوراً.']];
  const fill = (s, t, ks) => s.replace(/\{t\}/g, t).replace(/\{k\}/g, ks.slice(0, 4).join('، ') || t).replace(/\{k1\}/g, ks[0] || t);

  function build(inp) {
    const text = inp.text || '', title = inp.title || (sentences(text)[0] || '').slice(0, 60) || 'الدرس';
    const ks = keyTerms(text || title, 10), obj = objectives(title, text), sm = text ? summary(text, 5) : [];
    let qs = []; try { if (text && A.genFromText) qs = A.genFromText(text, { max: 10, types: ['mcq', 'tf', 'blank', 'short'] }).qs || []; } catch (_) { qs = []; }
    const strat = STRAT.map((s, i) => ({ n: s[0], d: fill(s[1], title, ks) })).sort(() => Math.random() - .5).slice(0, 4);
    const dur = +inp.dur || 45; const tl = [['التمهيد', Math.round(dur * .1), `سؤال مثير أو صورة/موقف حياتي عن ${title} ومراجعة التعلم السابق.`], ['العرض والشرح', Math.round(dur * .35), `عرض المفاهيم (${ks.slice(0, 3).join('، ') || title}) بالأمثلة والوسائل، مع أسئلة تفاعلية.`], ['النشاط', Math.round(dur * .3), `${strat[0].n}: ${strat[0].d}`], ['التقويم', Math.round(dur * .15), 'أسئلة تقويم بنائي وسؤال لحظي لقياس الفهم.'], ['الغلق', dur - Math.round(dur * .1) - Math.round(dur * .35) - Math.round(dur * .3) - Math.round(dur * .15), 'تلخيص الطلاب لأهم ما تعلموه وبطاقة خروج، وإعلان الواجب.']];
    const hw = qs.slice(0, 3).map(q => q.body).concat(qs.length ? [] : [`اكتب فقرة من ٥ أسطر تشرح فيها ${title} بمثال من حياتك.`, `ارسم خريطة مفاهيم لـ ${title}.`]);
    const diff = { low: [`بطاقة مفاهيم مصورة لـ ${ks.slice(0, 3).join('، ') || title}.`, 'أسئلة تذكر وفهم بخطوات موجهة، وعمل مع زميل داعم.'], high: [`مهمة إثرائية: ابحث عن تطبيق واقعي لـ ${title} وقدّمه في دقيقتين.`, 'سؤال تحليل/إبداع مفتوح وقيادة مجموعة.'] };
    return { title, subject: inp.subject, grade: inp.grade, ks, obj, sm, qs, strat, tl, hw, diff, mats: ['السبورة التفاعلية', 'عرض تقديمي للدرس', 'الكتاب المدرسي', 'بطاقات العمل', 'السؤال اللحظي'] };
  }

  function render(R) {
    const L = (BLOOM[R.lv] || [''])[0];
    const sec = (n, h, b) => `<div class="as-sec"><h3><span class="n">${AR(n)}</span>${h}</h3>${b}</div>`;
    const qHTML = q => `<li>${esc(q.body)}${(q.options || []).length ? `<div class="small muted">${q.options.map((o, i) => (o.ok ? '✓ ' : '') + esc(o.t)).join(' · ')}</div>` : q.answer ? `<div class="small muted">الإجابة: ${esc(q.answer)}</div>` : ''}<span class="as-lv">${esc((BLOOM[q.level] || [q.level || ''])[0] || '')}</span></li>`;
    return [sec(1, 'الأهداف السلوكية', `<ol>${R.obj.map(o => `<li>${esc(o.t)}<span class="as-lv">${BLOOM[o.lv][0]}</span></li>`).join('')}</ol>`),
      R.sm.length ? sec(2, 'ملخص الدرس', `<ul>${R.sm.map(s => `<li>${esc(s)}</li>`).join('')}</ul>${R.ks.length ? `<p class="small" style="margin:6px 0 0"><b>المفاهيم المفتاحية:</b> ${R.ks.slice(0, 8).map(esc).join('، ')}</p>` : ''}`) : '',
      sec(3, 'سير الحصة والزمن', `<div class="as-tl">${R.tl.map(([a, m, d]) => `<div><b>${a}</b><span class="small">${AR(m)} دقيقة</span><span>${esc(d)}</span></div>`).join('')}</div>`),
      sec(4, 'الاستراتيجيات والأنشطة', `<div class="as-cards">${R.strat.map(s => `<div><b>${esc(s.n)}</b><div class="small">${esc(s.d)}</div></div>`).join('')}</div>`),
      sec(5, 'أسئلة التقويم', R.qs.length ? `<ol>${R.qs.map(qHTML).join('')}</ol>` : '<p class="small muted">أضف نص الدرس أو ملفه لتوليد أسئلة تقويم تلقائية منه.</p>'),
      sec(6, 'الواجب المنزلي', `<ul>${R.hw.map(h => `<li>${esc(h)}</li>`).join('')}</ul>`),
      sec(7, 'التمايز', `<div class="grid g2"><div><b>للطلاب المحتاجين لدعم</b><ul>${R.diff.low.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div><div><b>للمتقدمين</b><ul>${R.diff.high.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>`),
      sec(8, 'الوسائل ومصادر التعلم', `<p>${R.mats.map(esc).join(' · ')}</p>`)].join('');
  }
  const asText = R => [`${R.title}`, '', 'الأهداف:', ...R.obj.map(o => '- ' + o.t), '', ...(R.sm.length ? ['ملخص الدرس:', ...R.sm.map(s => '- ' + s), ''] : []), 'سير الحصة:', ...R.tl.map(([a, m, d]) => `- ${a} (${m} د): ${d}`), '', 'الاستراتيجيات:', ...R.strat.map(s => `- ${s.n}: ${s.d}`), '', 'أسئلة التقويم:', ...R.qs.map((q, i) => `${i + 1}- ${q.body}`), '', 'الواجب:', ...R.hw.map(h => '- ' + h)].join('\n');

  V.assistant = function (root) {
    const subs = (S.subjects || []).filter(s => !s.is_activity);
    root.innerHTML = `<div class="card"><div class="head"><div class="grow"><h2>مساعد المعلم</h2><p class="sub" style="margin:2px 0 0">اكتب عنوان الدرس أو الصق نصه أو ارفع ملفه، فيجهّز لك: الأهداف، والملخص، وسير الحصة بالزمن، والاستراتيجيات والأنشطة، وأسئلة التقويم، والواجب، والتمايز — يعمل مجاناً داخل المتصفح.</p></div></div>
      <div class="as-in"><div class="grid g3"><div class="field"><label for="asT">عنوان الدرس</label><input class="in" id="asT" placeholder="مثال: دورة الماء في الطبيعة"></div><div class="field"><label for="asS">المادة</label><select class="in" id="asS"><option value="">—</option>${subs.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div><div class="field"><label for="asD">زمن الحصة (دقيقة)</label><input class="in" type="number" id="asD" value="45" min="20" max="120"></div></div>
        <div class="field"><label for="asX">نص الدرس (اختياري — يحسّن الأهداف والأسئلة والملخص)</label><textarea class="in" id="asX" rows="7" placeholder="الصق فقرات الدرس من الكتاب أو ملخصك…"></textarea></div>
        <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label class="btn ghost sm" style="cursor:pointer">رفع ملف (Word/PDF/صورة)<input type="file" id="asF" accept=".docx,.pdf,.txt,image/*" hidden></label><span class="small muted" id="asFs"></span><span class="grow"></span><button class="btn" id="asGo">${A.I.assistant} جهّز الدرس</button></div></div>
      <div id="asO"></div></div>`;
    $('#asF', root).onchange = async e => { const f = e.target.files[0]; if (!f) return; const s = $('#asFs', root); s.textContent = 'جارٍ القراءة…';
      try { const l = /^image\//.test(f.type) && A._imageLines ? await A._imageLines(f, p => { s.textContent = 'التعرف الضوئي ' + Math.round((p || 0) * 100) + '٪'; }) : A._fileLines ? await A._fileLines(f) : null; if (!l) throw new Error('صيغة غير مدعومة');
        $('#asX', root).value = (Array.isArray(l) ? l : String(l).split('\n')).map(x => typeof x === 'string' ? x : (x.text || x.t || '')).join('\n'); if (!$('#asT', root).value) $('#asT', root).value = f.name.replace(/\.[^.]+$/, ''); s.textContent = 'قُرئ الملف'; } catch (er) { s.textContent = 'تعذّرت القراءة: ' + er.message; } };
    $('#asGo', root).onclick = () => {
      const inp = { title: $('#asT', root).value.trim(), text: $('#asX', root).value.trim(), subject: $('#asS', root).value, dur: $('#asD', root).value };
      if (!inp.title && !inp.text) return A.toast('اكتب عنوان الدرس أو الصق نصه', 'err');
      const R = build(inp); const O = $('#asO', root);
      O.innerHTML = `<div class="as-out"><div class="head" style="margin:0"><div class="grow"><h2 style="margin:0">${esc(R.title)}</h2><span class="small muted">${inp.subject ? esc(A.subjName(inp.subject)) + ' · ' : ''}${AR(inp.dur)} دقيقة</span></div>
        <div class="as-acts"><button class="btn ghost sm" id="aoR">إعادة التوليد</button><button class="btn ghost sm" id="aoC">نسخ</button>${A.tfeat('slides') && A.textToSlides ? '<button class="btn ghost sm" id="aoS">تحويل لعرض تقديمي</button>' : ''}${A.tfeat('poll') && A.livePollStart && R.qs.length ? '<button class="btn ghost sm" id="aoP">سؤال لحظي</button>' : ''}<button class="btn sm" id="aoPr">${A.I.print || ''} طباعة بهوية المدرسة</button></div></div>${render(R)}</div>`;
      O.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      $('#aoR', O).onclick = () => $('#asGo', root).click();
      $('#aoC', O).onclick = async () => { try { await navigator.clipboard.writeText(asText(R)); A.toast('نُسخ', 'ok'); } catch (_) { A.toast('تعذّر النسخ', 'err'); } };
      $('#aoPr', O).onclick = () => A.printDoc('تحضير درس: ' + R.title, (inp.subject ? A.subjName(inp.subject) + ' · ' : '') + (S.me.full_name || ''), render(R).replace(/class="as-sec"/g, 'style="margin-bottom:10px"'), false);
      const sb = $('#aoS', O); if (sb) sb.onclick = e => A.run(e.currentTarget, async () => { const slides = A.textToSlides(R.title, ['الأهداف:', ...R.obj.map(o => '- ' + o.t), ...(R.sm.length ? ['ملخص الدرس:', ...R.sm.map(s => '- ' + s)] : []), 'المفاهيم المفتاحية:', ...R.ks.slice(0, 6).map(k => '- ' + k), 'نشاط:', '- ' + R.strat[0].n + ': ' + R.strat[0].d].join('\n'));
        R.qs.slice(0, 5).forEach((q, i) => slides.splice(slides.length - 1, 0, { id: 'q' + i + Date.now(), t: 'question', title: 'سؤال ' + AR(i + 1), q: { kind: q.qtype === 'tf' ? 'tf' : (q.options || []).length ? 'mcq' : 'short', body: q.body, options: (q.options || []).map(o => o.t), correct: q.qtype === 'tf' ? (q.answer === 'صواب' ? '0' : '1') : String(Math.max(0, (q.options || []).findIndex(o => o.ok))), answer: q.answer || '' } }));
        await api.ins('decks', [{ school_id: S.school.id, title: R.title, theme: 'wave', slides, ...(api.demo ? { id: 'dk' + Date.now(), owner: S.me.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } : {}) }]); A.toast('أُنشئ العرض — تجده في «العروض التقديمية»', 'ok'); });
      const pb = $('#aoP', O); if (pb) pb.onclick = () => { const q = R.qs.find(x => (x.options || []).length || x.qtype === 'tf') || R.qs[0]; A.livePoll({ kind: q.qtype === 'tf' ? 'tf' : (q.options || []).length ? 'mcq' : 'short', question: q.body, options: (q.options || []).map(o => o.t), correct: q.qtype === 'tf' ? (q.answer === 'صواب' ? '0' : '1') : String(Math.max(0, (q.options || []).findIndex(o => o.ok))) }); };
    };
  };
  A.lessonAssist = build;
})();
