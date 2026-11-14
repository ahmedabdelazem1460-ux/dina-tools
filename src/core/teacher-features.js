/* منصة دينا — التحكم في الميزات الجديدة داخل حسابات المعلمين (للمالك وحده)
   كل ميزة جديدة تبقى جاهزة في المنصة وتعمل في حساب المالك، ولا تظهر لأي حساب آخر إلا بعد تفعيلها هنا.
   يُحفظ في schools.settings:
     tfeat   {key: true (للجميع) | false (مخفية) | 'some' (لمعلمين محددين)}
     tfeatTo {key: [staff ids]}   — يقرؤهما A.tfeat(k) (notifications.js)
     ehw     {mode: follow|off|all|granted, staff[]} — بند «الاختبارات والواجبات الإلكترونية» (يُفرض في القاعدة بـ ehw_ok) */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc } = A;
  const AR = A.AR || (n => String(n));
  // [مفتاح، الاسم، الوصف، الرمز، المجموعة]
  const F = [
    ['notif', 'الإشعارات', 'جرس الإشعارات وتنبيهات الجهاز: النماذج المطلوبة، حصص الانتظار، رسائلك وتنبيهاتك العامة.', '🔔', 'com'],
    ['myforms', 'نماذجي', 'إنشاء المعلم نماذج عمله الخاصة بهوية المدرسة وحفظها وترتيبها.', '📝', 'adm'],
    ['hr', 'الموارد البشرية', 'تسجيل الحضور الذاتي (الموقع/رمز QR)، وصفحة «حضوري»، وصلاحية الإدارة لمن تمنحه «hr».', '🪪', 'adm'],
    ['terms', 'مؤشر الفصل الدراسي', 'تنقّل المعلم بين الفصل الأول والثاني لمراجعة خطط الفصل السابق (الفصل الحالي يظهر دائماً).', '📅', 'com'],
    ['poll', 'السؤال اللحظي', 'صفحة «السؤال اللحظي» وزرّه في السبورة والعروض: يجيب الطلاب من جوالاتهم برمز.', '📊', 'tch'],
    ['slides', 'العروض التقديمية', 'تحويل بنوك الأسئلة والدروس والملفات لعروض احترافية بهويات مشتقة من دينا.', '🖥️', 'tch'],
    ['compass', 'البوصلة', 'تطبيق المقاييس التربوية على الطلاب وعرض نتائجها (مؤشرات الأداء تبقى للمالك).', '🧭', 'asm'],
    ['assistant', 'مساعد المعلم', 'تجهيز الدرس تلقائياً: أهداف، سير الحصة، أنشطة، أسئلة، واجب، تمايز.', '🤖', 'tch'],
    ['games2', 'قوالب الألعاب الجديدة', 'ترتيب الحروف، فرقعة البالونات، الفرز، سباق الفريقين — ضمن طرق اللعب عند إنشاء لعبة.', '🎮', 'tch'],
    ['models3d', 'المجسمات التفاعلية', 'المجسمات الهندسية ونموذج الذرة والمجموعة الشمسية داخل المعامل الافتراضية.', '🧪', 'tch'],
    ['gifted', 'رعاية الموهوبين', 'الدليل المرجعي ونماذج الكشف والترشيح؛ يرى المعلم ترشيحاته فقط، والملفات كاملة للمالك ومن يُمنح «gifted» أو «counselor».', '⭐', 'adm'],
    ['home2', 'واجهة المعلم الجديدة', 'لوحة أعلى صفحة المعلم: الأسبوع الحالي وأيامه ونسبة الإنجاز وأيقونات تفاعلية للوصول السريع.', '🏠', 'com'],
    ['app', 'زر «تطبيق الجوال»', 'تعليمات تثبيت المنصة على أندرويد وآيفون في قائمة المستخدم.', '📱', 'com'],
  ];
  A.TFEAT = F.map(f => [f[0], f[1], f[2]]);
  const EHW = ['ehw', 'الاختبارات والواجبات الإلكترونية', 'إنشاء اختبار أو واجب إلكتروني برابط يحلّه الطالب من جواله، مع التصحيح الآلي وواجهات الطالب. يُفرض في قاعدة البيانات.', '✅', 'asm'];
  const GROUPS = [['asm', 'الاختبارات والتقويم'], ['tch', 'التدريس والمحتوى'], ['com', 'التواصل وواجهة المعلم'], ['adm', 'الإدارة والرعاية']];
  const MODES = [['off', 'مخفية'], ['all', 'للجميع'], ['some', 'محددون']];
  const EMODES = [['follow', 'حسب الصلاحيات'], ['off', 'مخفية'], ['all', 'للجميع'], ['some', 'محددون']];

  if (!document.getElementById('tfcss')) { const st = document.createElement('style'); st.id = 'tfcss'; st.textContent = `
#toasts{z-index:10001}
.tf-card{border:1px solid #DCE7F3;border-radius:18px;background:linear-gradient(180deg,#fff,#F5F9FD);box-shadow:0 12px 26px -22px rgba(8,43,90,.6);margin-bottom:14px}
.tf-in{padding:14px 16px 4px}
.tf-hd{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap}
.tf-hd h3{margin:0;color:#082B5A}.tf-hd .grow{flex:1;min-width:220px}
.tf-sum{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}
.tf-sum span{font-size:12.5px;font-weight:800;border-radius:20px;padding:3px 10px;background:#EEF1F5;color:#40526a}
.tf-sum .on{background:#E5F3EA;color:#1F6E45}.tf-sum .some{background:#E3F2FA;color:#005499}
.tf-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}
.tf-tools .in{flex:1;min-width:180px;max-width:320px;padding:8px 12px}
.tf-flt{display:inline-flex;border:1.5px solid #DCE7F3;border-radius:12px;overflow:hidden;background:#fff}
.tf-flt button{border:0;background:none;padding:7px 12px;font:inherit;font-size:13px;font-weight:700;color:#40526a;cursor:pointer;min-height:36px}
.tf-flt button[aria-pressed="true"]{background:#082B5A;color:#fff}
.tf-gr{margin-top:14px}
.tf-gr h4{margin:0 0 8px;font-size:14px;color:#005499;display:flex;align-items:center;gap:8px}
.tf-gr h4::after{content:"";flex:1;height:1px;background:#DCE7F3}
.tf-g{display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(min(100%,330px),1fr))}
.tf-it{border:1.5px solid #DCE7F3;border-radius:14px;padding:12px;background:#fff;display:flex;flex-direction:column;gap:10px;transition:border-color .15s,background .15s}
.tf-it[data-m="all"]{border-color:#2E8B57;background:#F4FBF6}
.tf-it[data-m="some"]{border-color:#3AB1DB;background:#F3FAFE}
.tf-it.dirty{box-shadow:0 0 0 3px #F2C66D55}
.tf-top{display:flex;gap:10px;align-items:flex-start}
.tf-ic{width:38px;height:38px;border-radius:12px;display:grid;place-items:center;font-size:19px;background:#EEF4FB;flex:none}
.tf-it b{display:block;color:#082B5A;font-size:15px}.tf-it small{color:#5b6b7f;line-height:1.6;display:block}
.tf-st{font-size:11.5px;font-weight:800;border-radius:20px;padding:1px 8px;margin-inline-start:6px;white-space:nowrap}
.tf-on{background:#E5F3EA;color:#1F6E45}.tf-off{background:#EEF1F5;color:#5b6b7f}.tf-some{background:#E3F2FA;color:#005499}.tf-fol{background:#FFF4DA;color:#8A5A00}
.tf-seg{display:flex;border:1.5px solid #DCE7F3;border-radius:12px;overflow:hidden;background:#fff}
.tf-seg label{flex:1;position:relative;cursor:pointer}
.tf-seg input{position:absolute;opacity:0;inset:0;cursor:pointer;margin:0}
.tf-seg span{display:block;text-align:center;padding:8px 4px;font-size:12.5px;font-weight:700;color:#40526a;min-height:36px;line-height:20px}
.tf-seg label+label span{border-inline-start:1px solid #DCE7F3}
.tf-seg input:checked+span{background:#082B5A;color:#fff}
.tf-seg input[value="all"]:checked+span{background:#2E8B57}
.tf-seg input[value="some"]:checked+span{background:#005499}
.tf-seg input:focus-visible+span{outline:3px solid #3AB1DB;outline-offset:-3px}
.tf-who{display:flex;gap:8px;align-items:center;flex-wrap:wrap;font-size:13px;color:#005499;font-weight:700}
.tf-who .btn{min-height:34px}
.tf-bar{position:sticky;bottom:0;z-index:5;margin-top:14px;padding:10px 16px;border-top:1px solid #DCE7F3;border-radius:0 0 18px 18px;background:rgba(255,255,255,.96);backdrop-filter:blur(6px);display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.tf-bar .msg{flex:1;min-width:160px;font-weight:700;font-size:13.5px;color:#5b6b7f}
.tf-bar.dirty{background:#FFF8E6;border-top-color:#F2C66D}.tf-bar.dirty .msg{color:#8A5A00}
.tf-bar.ok .msg{color:#1F6E45}.tf-bar.err .msg{color:#B3261E}
@media (max-width:760px){.tf-bar{bottom:calc(64px + env(safe-area-inset-bottom))}}
.tf-empty{padding:16px;text-align:center;color:#5b6b7f}
.tfp-l{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,230px),1fr));gap:4px 12px;max-height:min(52vh,420px);overflow:auto;margin-top:10px;padding:2px}
.tfp-l label{display:flex;gap:8px;align-items:center;padding:7px 8px;border-radius:10px;cursor:pointer;min-height:40px}
.tfp-l label:hover{background:#F3F7FC}.tfp-l input{width:18px;height:18px;accent-color:#005499;flex:none}
@media (prefers-reduced-motion:reduce){.tf-it{transition:none}}`; document.head.appendChild(st); }

  const staffList = () => (S.staff || []).filter(p => p.active !== false && !p.is_owner).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || '', 'ar'));
  const norm = s => (A.normKey ? A.normKey(s || '') : String(s || '').trim());

  // قراءة الإعداد المحفوظ إلى مسودة قابلة للتعديل
  function load() {
    const st = S.school.settings || {}, tf = st.tfeat || {}, to = st.tfeatTo || {}, e = st.ehw || {};
    const d = { m: {}, to: {} };
    F.forEach(([k]) => { d.m[k] = tf[k] === true ? 'all' : tf[k] === 'some' ? 'some' : 'off'; d.to[k] = Array.isArray(to[k]) ? to[k].slice() : []; });
    const em = e.mode || 'follow'; d.m.ehw = em === 'granted' ? 'some' : ['all', 'off', 'follow'].includes(em) ? em : 'follow'; d.to.ehw = Array.isArray(e.staff) ? e.staff.slice() : [];
    return d;
  }
  const sig = (d, k) => d.m[k] + (d.m[k] === 'some' ? ':' + d.to[k].slice().sort().join(',') : '');

  const prev = V.tui;
  V.tui = function (root) {
    const r = prev.apply(this, arguments);
    if (!S.me || !S.me.is_owner || S.realMe) return r;
    let saved = load(), d = load(), q = '', flt = 'all', lastMsg = '', lastCls = '';
    const ALL = [EHW, ...F];
    const changed = () => ALL.filter(f => sig(saved, f[0]) !== sig(d, f[0])).map(f => f[0]);

    const box = document.createElement('div'); box.className = 'tf-card'; box.id = 'tfCard';
    box.innerHTML = `<div class="tf-in"><div class="tf-hd"><div class="grow"><h3>الميزات الجديدة في حسابات المعلمين</h3><p class="sub" style="margin:4px 0 0">كل ميزة جاهزة وتعمل في حسابك، ولا تظهر لأي معلم أو موظف إلا بما تحدده هنا: <b>مخفية</b>، أو <b>للجميع</b>، أو <b>لمعلمين محددين</b>.</p></div><button type="button" class="btn sm" id="tfGo2" disabled>لا تغييرات</button></div>
      <div class="tf-sum" id="tfSum" aria-live="polite"></div>
      <div class="tf-tools"><input class="in" id="tfQ" type="search" placeholder="ابحث عن ميزة…" aria-label="ابحث عن ميزة">
        <div class="tf-flt" role="group" aria-label="تصفية">${[['all', 'الكل'], ['on', 'الظاهرة'], ['off', 'المخفية']].map(([k, l]) => `<button type="button" data-flt="${k}" aria-pressed="${k === 'all'}">${l}</button>`).join('')}</div>
        <button type="button" class="btn ghost sm" id="tfAllOn">إظهار الكل للجميع</button><button type="button" class="btn ghost sm" id="tfAllOff">إخفاء الكل</button></div>
      <div id="tfList"></div></div>
      <div class="tf-bar" id="tfBar" role="status" aria-live="polite"><span class="msg" id="tfMsg"></span><button type="button" class="btn ghost sm" id="tfUndo">تراجع</button><button type="button" class="btn sm" id="tfGo">حفظ</button></div>`;
    const host = root.querySelector('.card') || root; host.parentNode ? host.parentNode.insertBefore(box, host) : root.prepend(box);

    const badge = f => { const m = d.m[f[0]], n = d.to[f[0]].length;
      return m === 'all' ? '<span class="tf-st tf-on">ظاهرة للجميع</span>' : m === 'some' ? `<span class="tf-st tf-some">${n ? 'لـ' + AR(n) + ' ' + (n > 2 && n < 11 ? 'معلمين' : 'معلم') : 'لم تحدد أحداً'}</span>` : m === 'follow' ? '<span class="tf-st tf-fol">حسب صلاحية الاختبارات</span>' : '<span class="tf-st tf-off">مخفية</span>'; };
    const item = f => { const [k, l, desc, ic] = f, modes = k === 'ehw' ? EMODES : MODES, m = d.m[k], dirty = sig(saved, k) !== sig(d, k);
      return `<div class="tf-it ${dirty ? 'dirty' : ''}" data-k="${k}" data-m="${m}">
        <div class="tf-top"><span class="tf-ic" aria-hidden="true">${ic}</span><div><b id="tfL-${k}">${esc(l)}${badge(f)}</b><small>${esc(desc)}</small></div></div>
        <div class="tf-seg" role="radiogroup" aria-labelledby="tfL-${k}">${modes.map(([v, t]) => `<label><input type="radio" name="tf-${k}" value="${v}" ${m === v ? 'checked' : ''}><span>${t}</span></label>`).join('')}</div>
        ${m === 'some' ? `<div class="tf-who"><span>${d.to[k].length ? esc(d.to[k].map(id => (staffList().find(p => p.id === id) || {}).full_name).filter(Boolean).slice(0, 3).join('، ')) + (d.to[k].length > 3 ? ' و' + AR(d.to[k].length - 3) + ' آخرون' : '') : 'اختر المعلمين الذين تظهر لهم'}</span><button type="button" class="btn sm ghost" data-pick="${k}">${d.to[k].length ? 'تعديل' : 'اختيار'} المعلمين</button></div>` : ''}
        ${k === 'ehw' && m === 'follow' ? '<small>«حسب الصلاحيات»: يظهر لمن لديه صلاحية الاختبارات في «المسميات والصلاحيات».</small>' : ''}
      </div>`; };

    function renderSum() {
      const c = { all: 0, some: 0, off: 0 }; ALL.forEach(f => { const m = d.m[f[0]]; c[m === 'follow' ? 'off' : m]++; });
      $('#tfSum', box).innerHTML = `<span class="on">ظاهرة للجميع: ${AR(c.all)}</span><span class="some">لمعلمين محددين: ${AR(c.some)}</span><span>مخفية: ${AR(c.off)}</span>`;
    }
    function renderBar() {
      const ch = changed(), bar = $('#tfBar', box), go = $('#tfGo', box), un = $('#tfUndo', box);
      bar.className = 'tf-bar' + (ch.length ? ' dirty' : lastCls ? ' ' + lastCls : '');
      $('#tfMsg', box).textContent = ch.length ? `تغييرات غير محفوظة: ${AR(ch.length)} — اضغط «حفظ»` : (lastMsg || 'لا توجد تغييرات غير محفوظة');
      go.disabled = !ch.length; un.style.display = ch.length ? '' : 'none'; go.textContent = ch.length ? `حفظ (${AR(ch.length)})` : 'حفظ';
      const g2 = $('#tfGo2', box); g2.disabled = !ch.length; g2.textContent = ch.length ? `حفظ التغييرات (${AR(ch.length)})` : 'لا تغييرات';
    }
    function renderList() {
      const v = norm(q);
      const show = f => (!v || norm(f[1] + ' ' + f[2]).includes(v)) && (flt === 'all' || (flt === 'on' ? ['all', 'some'].includes(d.m[f[0]]) : !['all', 'some'].includes(d.m[f[0]])));
      const html = GROUPS.map(([g, gl]) => { const L = ALL.filter(f => f[4] === g && show(f)); return L.length ? `<section class="tf-gr" aria-label="${gl}"><h4>${gl}</h4><div class="tf-g">${L.map(item).join('')}</div></section>` : ''; }).join('');
      $('#tfList', box).innerHTML = html || '<div class="tf-empty">لا توجد ميزة مطابقة</div>';
      renderSum(); renderBar();
    }
    const touch = () => { lastMsg = ''; lastCls = ''; renderList(); };

    function picker(k) {
      const f = ALL.find(x => x[0] === k), people = staffList(), sel = new Set(d.to[k]);
      const m = A.modal(`<h3>من تظهر له «${esc(f[1])}»؟</h3><p class="sub">حدّد المعلمين والموظفين؛ لن تظهر الميزة لغيرهم.</p>
        <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><input class="in" id="tfpQ" type="search" placeholder="بحث بالاسم أو المسمى" aria-label="بحث بالاسم" style="flex:1;min-width:170px">
        <button type="button" class="btn ghost sm" id="tfpAll">تحديد الظاهرين</button><button type="button" class="btn ghost sm" id="tfpNone">إلغاء الكل</button><span class="pill st-approved" id="tfpN"></span></div>
        <div class="tfp-l">${people.map(p => `<label data-nm="${esc(norm(p.full_name + ' ' + (p.title || '')))}"><input type="checkbox" value="${p.id}" ${sel.has(p.id) ? 'checked' : ''}><span>${esc(p.full_name)}${p.title ? ` <span class="small muted">· ${esc(p.title)}</span>` : ''}</span></label>`).join('') || '<p class="small muted">لا يوجد موظفون</p>'}</div>
        <div class="acts"><button type="button" class="btn ghost" id="tfpX">إلغاء</button><button type="button" class="btn" id="tfpOk">اعتماد الاختيار</button></div>`, { cls: 'wide' });
      const el = m.el, cnt = () => { $('#tfpN', el).textContent = AR($$('.tfp-l input:checked', el).length) + ' محدد'; };
      cnt(); $$('.tfp-l input', el).forEach(i => i.onchange = cnt);
      $('#tfpQ', el).oninput = ev => { const v = norm(ev.target.value); $$('[data-nm]', el).forEach(l => l.hidden = !!v && !l.dataset.nm.includes(v)); };
      $('#tfpAll', el).onclick = () => { $$('[data-nm]', el).forEach(l => { if (!l.hidden) l.querySelector('input').checked = true; }); cnt(); };
      $('#tfpNone', el).onclick = () => { $$('.tfp-l input', el).forEach(i => i.checked = false); cnt(); };
      $('#tfpX', el).onclick = () => m.close();
      $('#tfpOk', el).onclick = () => { d.to[k] = $$('.tfp-l input:checked', el).map(i => i.value); d.m[k] = 'some'; m.close(); touch(); const b = box.querySelector(`[data-pick="${k}"]`); if (b) b.focus(); };
      setTimeout(() => { const s = $('#tfpQ', el); if (s) s.focus(); }, 50);
    }

    box.addEventListener('change', e => { const t = e.target; if (t.name && t.name.startsWith('tf-')) { const k = t.name.slice(3); d.m[k] = t.value; touch(); if (t.value === 'some' && !d.to[k].length) picker(k); else { const n = box.querySelector(`input[name="tf-${k}"][value="${t.value}"]`); if (n) n.focus(); } } });
    box.addEventListener('click', e => { const b = e.target.closest('[data-pick]'); if (b) picker(b.dataset.pick); const fb = e.target.closest('[data-flt]'); if (fb) { flt = fb.dataset.flt; $$('[data-flt]', box).forEach(x => x.setAttribute('aria-pressed', x === fb)); renderList(); } });
    $('#tfGo2', box).onclick = () => $('#tfGo', box).click();
    $('#tfQ', box).oninput = e => { q = e.target.value; renderList(); };
    $('#tfAllOn', box).onclick = () => { F.forEach(([k]) => d.m[k] = 'all'); touch(); };
    $('#tfAllOff', box).onclick = () => { F.forEach(([k]) => d.m[k] = 'off'); touch(); };
    $('#tfUndo', box).onclick = () => { d = load(); touch(); };

    $('#tfGo', box).onclick = async e => {
      const ch = changed(); if (!ch.length) return;
      const empty = ch.filter(k => d.m[k] === 'some' && !d.to[k].length);
      if (empty.length) { lastMsg = 'اختر معلماً واحداً على الأقل لـ: ' + empty.map(k => ALL.find(f => f[0] === k)[1]).join('، '); lastCls = 'err'; renderBar(); $('#tfBar', box).className = 'tf-bar err'; $('#tfMsg', box).textContent = lastMsg; return; }
      $('#tfMsg', box).textContent = 'جارٍ الحفظ…';
      await A.run(e.currentTarget, async () => {
        try {
          const old = S.school.settings || {}, tfeat = {}, tfeatTo = {};
          F.forEach(([k]) => { tfeat[k] = d.m[k] === 'all' ? true : d.m[k] === 'some' ? 'some' : false; if (d.m[k] === 'some') tfeatTo[k] = d.to[k].slice(); });
          const ehw = { ...(old.ehw || {}), mode: d.m.ehw === 'some' ? 'granted' : d.m.ehw, staff: d.m.ehw === 'some' ? d.to.ehw.slice() : ((old.ehw || {}).staff || []) };
          const settings = { ...old, tfeat, tfeatTo, ehw };
          const res = await api.updateSchool(S.school.id, { settings }); S.school.settings = (res && res.settings) || settings;
          // إشعار «تمت إضافة…» لمن صارت الميزة ظاهرة لهم حديثاً
          let sent = 0;
          if (A.announceNew) {
            const toAll = ch.filter(k => k !== 'ehw' && d.m[k] === 'all' && saved.m[k] !== 'all');
            if (toAll.length) sent += await A.announceNew(toAll) ? 1 : 0;
            for (const k of ch.filter(k => k !== 'ehw' && d.m[k] === 'some')) { const was = saved.m[k] === 'all' ? null : new Set(saved.m[k] === 'some' ? saved.to[k] : []); const ids = was ? d.to[k].filter(id => !was.has(id)) : []; if (ids.length) sent += await A.announceNew([k], ids) ? 1 : 0; }
          }
          saved = load(); d = load();
          const t = new Date(); lastMsg = `✓ حُفظ الساعة ${AR(t.getHours())}:${AR(String(t.getMinutes()).padStart(2, '0'))}${sent ? ' — وصل المعنيين إشعار «تمت إضافة…»' : ''}`; lastCls = 'ok';
          renderList(); if (A.tuiApply) try { A.tuiApply(); } catch (_) { }
          A.toast('حُفظ — يظهر للمعلمين ما حددته فقط', 'ok');
        } catch (err) { lastMsg = '✗ لم يُحفظ: ' + ((err && err.message) || 'تحقق من الاتصال وأعد المحاولة'); lastCls = 'err'; throw err; }
      });
      renderBar(); if (lastCls === 'err') { $('#tfBar', box).className = 'tf-bar err'; $('#tfMsg', box).textContent = lastMsg; }
    };
    renderList();
    return r;
  };
})();
