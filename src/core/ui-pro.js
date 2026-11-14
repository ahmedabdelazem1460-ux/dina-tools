/* منصة دينا — الواجهة الاحترافية:
   (١) السمات: كلاسيكي، عمق ثلاثي الأبعاد، زجاجي، زخارف دينا — متاحة لكل المستخدمين (بقرار المالك)، مع سمة افتراضية للمدرسة.
   (٢) لوحة صفحة المعلم «home2»: الأسبوع الحالي أعلى الصفحة وأيامه ونسبة الإنجاز وأيقونات تفاعلية، ثم «جدولي الأسبوعي» مباشرة.
   (٣) الإشعارات: أيقونة ملونة لكل نوع، نوع «جديد في المنصة» (new)، بطاقة منبثقة محسّنة، وإعلان «ما الجديد» للمعلم عند تفعيل ميزة له.
   كل ما يظهر للمعلمين مقيّد بـ A.tfeat. */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc, AR } = A;

  // ======================= (١) السمات =======================
  const THEMES = {
    classic: { n: 'كلاسيكي دينا', d: 'الهوية الأساسية بخلفية منقطة هادئة', sw: 'linear-gradient(135deg,#EEF3FA,#fff)' },
    depth: { n: 'عمق ثلاثي الأبعاد', d: 'بطاقات بارزة بظلال متدرجة وأزرار مجسّمة', sw: 'linear-gradient(145deg,#fff 0,#DCE8F5 55%,#9DB9D8)' },
    glass: { n: 'زجاجي', d: 'خلفية متدرجة وبطاقات شفافة ضبابية', sw: 'linear-gradient(135deg,#3AB1DB,#AE95DA 60%,#082B5A)' },
    pattern: { n: 'زخارف دينا', d: 'نجوم وزهور الهوية بألوانها الرسمية', sw: 'radial-gradient(circle at 30% 30%,#3AB1DB 0 3px,transparent 4px) 0 0/14px 14px,#E4EBF5' },
  };
  const STAR = c => `<path d='M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z' fill='${c}'/>`;
  const PAT = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><g opacity='.16'><g transform='translate(10 12) scale(.9)'>${STAR('%233AB1DB')}</g><g transform='translate(72 64) scale(.7)'>${STAR('%23005499')}</g><g transform='translate(78 10)' fill='none' stroke='%23AE95DA' stroke-width='2'><circle cx='8' cy='8' r='4'/><circle cx='16' cy='8' r='4'/><circle cx='8' cy='16' r='4'/><circle cx='16' cy='16' r='4'/></g><g transform='translate(14 74)' fill='%2384B7E3'><circle cx='2' cy='2' r='2'/><circle cx='10' cy='2' r='2'/><circle cx='18' cy='2' r='2'/><circle cx='2' cy='10' r='2'/><circle cx='10' cy='10' r='2'/><circle cx='18' cy='10' r='2'/></g></g></svg>`).replace(/%2523/g, '%23');
  const css = document.createElement('style'); css.id = 'uiProCss';
  css.textContent = `
/* أيقونات القائمة التفاعلية (كل السمات عدا الكلاسيكي) */
body[data-th]:not([data-th=classic]) .nav a svg{box-sizing:content-box;padding:6px;border-radius:11px;color:#fff;background:linear-gradient(145deg,var(--ic1,#3AB1DB),var(--ic2,#005499));box-shadow:0 6px 12px -6px var(--ic2,#005499),inset 0 1px 0 rgba(255,255,255,.35);transition:transform .25s cubic-bezier(.3,1.6,.5,1)}
body[data-th]:not([data-th=classic]) .nav a:hover svg{transform:translateY(-2px) rotate(-6deg) scale(1.08)}
body[data-th]:not([data-th=classic]) .nav a.on svg{background:linear-gradient(145deg,#fff,#E4EBF5);color:var(--navy)}
body[data-th]:not([data-th=classic]) .nav a:nth-child(6n+1){--ic1:#3AB1DB;--ic2:#005499}body[data-th]:not([data-th=classic]) .nav a:nth-child(6n+2){--ic1:#5BC48A;--ic2:#2E8B57}
body[data-th]:not([data-th=classic]) .nav a:nth-child(6n+3){--ic1:#C2AEEB;--ic2:#7E62C2}body[data-th]:not([data-th=classic]) .nav a:nth-child(6n+4){--ic1:#F2C66D;--ic2:#C98A12}
body[data-th]:not([data-th=classic]) .nav a:nth-child(6n+5){--ic1:#F09A8E;--ic2:#D0564A}body[data-th]:not([data-th=classic]) .nav a:nth-child(6n+6){--ic1:#84B7E3;--ic2:#082B5A}
body.ui-side.side-icons[data-th]:not([data-th=classic]) .nav a svg,body.ui-side.side-auto[data-th]:not([data-th=classic]) .nav a svg{width:20px;height:20px}
/* عمق ثلاثي الأبعاد */
body[data-th=depth]{background:radial-gradient(1200px 500px at 80% -10%,rgba(58,177,219,.18),transparent),radial-gradient(900px 500px at 0 110%,rgba(174,149,218,.14),transparent),linear-gradient(180deg,#F3F7FC,#E4ECF6)}
body[data-th=depth] .card{border:1px solid rgba(255,255,255,.9);box-shadow:0 1px 0 #fff inset,0 -1px 0 rgba(8,43,90,.04) inset,0 2px 4px rgba(8,43,90,.05),0 12px 24px -10px rgba(8,43,90,.16),0 34px 60px -30px rgba(8,43,90,.35);background:linear-gradient(180deg,#fff,#FBFDFF)}
body[data-th=depth] .btn:not(.ghost){box-shadow:0 4px 0 #04203F,0 10px 18px -8px rgba(8,43,90,.6),inset 0 1px 0 rgba(255,255,255,.25);transform:translateY(-1px);transition:transform .12s,box-shadow .12s}
body[data-th=depth] .btn:not(.ghost):active{transform:translateY(3px);box-shadow:0 1px 0 #04203F,0 4px 8px -4px rgba(8,43,90,.6)}
body[data-th=depth] .btn.ghost{box-shadow:0 3px 0 #C9D8EA,0 8px 14px -10px rgba(8,43,90,.5)}
body[data-th=depth] .kpi,body[data-th=depth] .cp-k,body[data-th=depth] .gf-c{transition:transform .2s}body[data-th=depth] .kpi:hover,body[data-th=depth] .cp-k:hover{transform:translateY(-3px)}
body[data-th=depth].ui-side .nav{background:linear-gradient(180deg,#fff,#F3F7FC);box-shadow:8px 0 30px -18px rgba(8,43,90,.45)}
body[data-th=depth].ui-side .nav a.on{background:linear-gradient(135deg,#0A3A75,#082B5A);box-shadow:0 10px 18px -10px rgba(8,43,90,.9),inset 0 1px 0 rgba(255,255,255,.18)}
/* زجاجي */
body[data-th=glass]{background:radial-gradient(800px 500px at 90% 0,rgba(58,177,219,.45),transparent 60%),radial-gradient(700px 500px at 0 30%,rgba(174,149,218,.35),transparent 60%),radial-gradient(700px 500px at 60% 100%,rgba(186,223,147,.35),transparent 60%),#E9F0F9;background-attachment:fixed}
body[data-th=glass] .card,body[data-th=glass].ui-side .nav{background:rgba(255,255,255,.66);-webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);border:1px solid rgba(255,255,255,.75);box-shadow:0 20px 40px -24px rgba(8,43,90,.45)}
body[data-th=glass] .top{background:linear-gradient(180deg,rgba(10,50,104,.92),rgba(8,43,90,.88));-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
body[data-th=glass] .tbl th{background:rgba(228,235,245,.7)}
/* زخارف دينا */
body[data-th=pattern]{background:url("data:image/svg+xml,${PAT}") 0 0/120px 120px,linear-gradient(180deg,#F5F8FC,#EAF0F8);background-attachment:fixed}
body[data-th=pattern] .card{border-top:4px solid transparent;border-image:linear-gradient(90deg,#3AB1DB,#005499,#AE95DA,#BADF93) 1;border-image-slice:1 0 0 0}
body[data-th=pattern] .card>.head h2::after,body[data-th=pattern] .card>h2::after{content:"✦";color:#3AB1DB;margin-inline-start:8px;font-size:.7em;vertical-align:middle}
@media print{body[data-th]{background:#fff!important}}
@media (prefers-reduced-motion:reduce){body[data-th] .nav a svg,body[data-th=depth] .btn{transition:none!important}}

/* (٢) لوحة المعلم */
.tq{position:relative;border-radius:24px;padding:18px 20px;margin-bottom:16px;color:#fff;overflow:hidden;background:radial-gradient(700px 260px at 0 0,rgba(58,177,219,.5),transparent 60%),radial-gradient(500px 260px at 100% 100%,rgba(174,149,218,.35),transparent 60%),linear-gradient(135deg,#082B5A,#005499);box-shadow:0 30px 60px -34px rgba(8,43,90,.9),inset 0 1px 0 rgba(255,255,255,.18)}
.tq::after{content:"";position:absolute;inset:0;background:url("data:image/svg+xml,${PAT}") 0 0/140px 140px;opacity:.5;pointer-events:none;mix-blend-mode:screen}
.tq>*{position:relative;z-index:1}
.tq-top{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.tq-wk{flex:1;min-width:220px}.tq-wk small{color:#BFE3F4;font-weight:700}.tq-wk h2{margin:2px 0;font-size:24px;color:#fff}.tq-wk span{color:#D6E6F5;font-size:13.5px}
.tq-ring{--p:0;width:96px;height:96px;border-radius:50%;background:conic-gradient(#BADF93 calc(var(--p)*1%),rgba(255,255,255,.18) 0);display:grid;place-items:center;flex:none;box-shadow:0 10px 24px -10px rgba(0,0,0,.5)}
.tq-ring div{width:74px;height:74px;border-radius:50%;background:#082B5A;display:grid;place-items:center;text-align:center;line-height:1.1}.tq-ring b{font-size:22px}.tq-ring small{font-size:10.5px;color:#BFD6EE}
.tq-days{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:14px}
.tq-d{font:inherit;color:#fff;cursor:pointer;border:1px solid rgba(255,255,255,.22);border-radius:16px;padding:9px 6px;background:rgba(255,255,255,.08);text-align:center;transition:transform .2s,background .2s;min-height:44px}
.tq-d:hover{transform:translateY(-2px);background:rgba(255,255,255,.16)}.tq-d:focus-visible{outline:3px solid #BADF93;outline-offset:2px}
.tq-d b{display:block;font-size:14px}.tq-d span{font-size:11.5px;color:#CFE3F5}.tq-d i{display:block;height:4px;border-radius:4px;margin-top:6px;background:rgba(255,255,255,.2);overflow:hidden}.tq-d i u{display:block;height:100%;background:#BADF93}
.tq-d.today{background:#fff;color:#082B5A;border-color:#fff;box-shadow:0 12px 20px -12px rgba(0,0,0,.6)}.tq-d.today span{color:#005499}.tq-d.today i{background:#E4EBF5}.tq-d.today i u{background:#2E8B57}
.tq-d.hol{opacity:.55}
.tq-ics{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:10px;margin-top:16px}
.tq-ic{font:inherit;color:#fff;text-decoration:none;cursor:pointer;border:0;background:none;display:grid;justify-items:center;gap:6px;padding:4px;border-radius:16px;font-size:12.5px;font-weight:700;text-align:center;line-height:1.3}
.tq-ic .g{position:relative;width:56px;height:56px;border-radius:18px;display:grid;place-items:center;background:linear-gradient(145deg,var(--a),var(--b));box-shadow:0 12px 20px -10px var(--b),0 3px 0 rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.45);transition:transform .3s cubic-bezier(.3,1.6,.5,1)}
.tq-ic .g::before{content:"";position:absolute;inset:3px 3px 50% 3px;border-radius:15px 15px 40% 40%;background:linear-gradient(180deg,rgba(255,255,255,.45),rgba(255,255,255,0))}
.tq-ic .g svg{width:26px;height:26px;color:#fff;filter:drop-shadow(0 2px 2px rgba(0,0,0,.25))}
.tq-ic:hover .g{transform:translateY(-4px) rotate(-5deg) scale(1.06)}.tq-ic:active .g{transform:scale(.94)}
.tq-ic:focus-visible{outline:3px solid #BADF93;outline-offset:2px}
.tq-ic .bd{position:absolute;top:-5px;inset-inline-end:-5px;min-width:20px;height:20px;border-radius:10px;background:#E0675A;color:#fff;font-size:11px;display:grid;place-items:center;padding:0 5px;border:2px solid #082B5A}
.tgrid.tq-flash{animation:tqF 1.4s ease}@keyframes tqF{0%,100%{box-shadow:var(--sh2)}30%{box-shadow:0 0 0 4px #3AB1DB}}
.tg tr.tq-row th{background:#DCEFFA!important}
@media (max-width:600px){.tq{padding:14px}.tq-wk h2{font-size:20px}.tq-ring{width:80px;height:80px}.tq-ring div{width:62px;height:62px}.tq-days{gap:5px}.tq-d{padding:7px 2px}.tq-d b{font-size:12px}.tq-ics{grid-template-columns:repeat(4,1fr);gap:6px}.tq-ic{font-size:11px}.tq-ic .g{width:48px;height:48px;border-radius:15px}}
@media (prefers-reduced-motion:reduce){.tq-ic .g,.tq-d{transition:none}.tgrid.tq-flash{animation:none}}

/* (٣) الإشعارات */
.nf-ic{width:38px;height:38px;border-radius:12px;flex:none;display:grid;place-items:center;background:linear-gradient(145deg,var(--a,#3AB1DB),var(--b,#005499));box-shadow:0 8px 14px -8px var(--b,#005499),inset 0 1px 0 rgba(255,255,255,.4);font-size:18px;line-height:1}
.nf-it{align-items:center!important}.nf-it .nf-dot{order:9}
.nf-it.un{box-shadow:inset 3px 0 0 #005499}
.nf-k.k-new{background:linear-gradient(90deg,#3AB1DB,#AE95DA);color:#fff}
.nf-toastpush:not(#nfSoft){background:rgba(255,255,255,.96)!important;color:#082B5A!important;border:1px solid #DCE7F3;box-shadow:0 24px 50px -20px rgba(8,43,90,.55)!important;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);padding:12px 14px!important;border-inline-start:5px solid #3AB1DB!important;align-items:center!important}
.nf-toastpush:not(#nfSoft)>svg{flex:none;width:38px;height:38px;padding:8px;border-radius:12px;color:#fff;background:linear-gradient(145deg,#3AB1DB,#005499);box-sizing:border-box}
.nf-toastpush:not(#nfSoft) span{color:#4D6A8F}
@media (prefers-reduced-motion:no-preference){#notifBtn:has(#notifN:not(.hidden)) svg{animation:bellR 2.4s ease-in-out infinite;transform-origin:50% 10%}@keyframes bellR{0%,70%,100%{transform:rotate(0)}75%{transform:rotate(14deg)}80%{transform:rotate(-12deg)}85%{transform:rotate(8deg)}90%{transform:rotate(-5deg)}}}
.th-btn{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);color:#fff;width:38px;height:38px;border-radius:12px;display:inline-grid;place-items:center;cursor:pointer;margin-inline:4px;flex:none}.th-btn:hover{background:rgba(255,255,255,.22)}.th-btn:focus-visible{outline:3px solid #3AB1DB;outline-offset:2px}
.wn{display:grid;gap:10px}.wn-it{display:flex;gap:12px;align-items:flex-start;border:1px solid #DCE7F3;border-radius:16px;padding:12px;background:linear-gradient(180deg,#fff,#F6FAFD)}
.wn-it .g{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;font-size:24px;flex:none;background:linear-gradient(145deg,var(--a),var(--b));box-shadow:0 10px 18px -10px var(--b),inset 0 1px 0 rgba(255,255,255,.45)}
.wn-it b{display:block;color:#082B5A}.wn-it a.btn{text-decoration:none;flex:none}.wn-it small{color:#4D6A8F;line-height:1.7}
.wn-hd{border-radius:18px;padding:16px;margin-bottom:10px;color:#fff;background:linear-gradient(135deg,#082B5A,#005499 60%,#3AB1DB);display:flex;gap:12px;align-items:center}.wn-hd .big{font-size:36px}
`;
  document.head.appendChild(css);

  const LSK = 'dina_theme';
  const DEF_TH = 'depth'; // السمة الافتراضية لمن لم يختر (قرار المالك: تظهر السمات الاحترافية للجميع مباشرة)
  const schoolTheme = () => (((S.school || {}).settings || {}).uitheme) || DEF_TH;
  const allowed = () => !!S.me; // السمات متاحة للجميع بقرار المالك (لا تضيف شيئاً لصفحة المعلم)
  const myTheme = () => { if (!allowed()) return 'classic'; let t = null; try { t = localStorage.getItem(LSK); } catch (_) { } return THEMES[t] ? t : THEMES[schoolTheme()] ? schoolTheme() : DEF_TH; };
  function applyTheme() { if (!document.body) return; const t = S.me ? myTheme() : 'classic'; if (document.body.dataset.th !== t) document.body.dataset.th = t; thBtn(); }
  // زر «السمات» ظاهر في الشريط العلوي لكل مستخدم (بدل أن يبقى مخفياً داخل إعدادات المظهر)
  function thBtn() {
    const ub = document.getElementById('ub'); if (!S.me || !ub || document.getElementById('thBtn') || !A.uiSettings) return;
    const b = document.createElement('button'); b.id = 'thBtn'; b.type = 'button'; b.className = 'th-btn'; b.title = 'السمات'; b.setAttribute('aria-label', 'تغيير سمة المنصة');
    b.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2" fill="currentColor"/><circle cx="10.5" cy="7.3" r="1.2" fill="currentColor"/><circle cx="15" cy="7.5" r="1.2" fill="currentColor"/></svg>';
    b.onclick = () => A.uiSettings(); ub.parentNode.insertBefore(b, ub);
  }
  A.applyTheme = applyTheme; A.THEMES = THEMES;
  window.addEventListener('hashchange', applyTheme); setInterval(applyTheme, 1500); setTimeout(applyTheme, 0);
  // اختيار السمة داخل نافذة «إعدادات المظهر»
  function themePicker(box) {
    if (!allowed() || $('#thPick', box)) return;
    const own = S.me.is_owner && !S.realMe, cur = myTheme();
    const d = document.createElement('div'); d.className = 'field'; d.id = 'thPick';
    d.innerHTML = `<label>السمة</label><div class="ui-opt">${Object.entries(THEMES).map(([k, t]) => `<button data-th="${k}" class="${cur === k ? 'on' : ''}" aria-pressed="${cur === k}" title="${esc(t.d)}"><span class="sw" style="height:26px;background:${t.sw}"></span>${esc(t.n)}</button>`).join('')}</div>${own ? `<label class="small" style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" id="thDef"> اجعلها السمة الافتراضية لكل المستخدمين (لمن فُعّلت لهم السمات)</label>` : ''}`;
    const p = $('p', box); (p ? p.after(d) : box.prepend(d));
    $$('[data-th]', d).forEach(b => b.onclick = async () => {
      try { localStorage.setItem(LSK, b.dataset.th); } catch (_) { } applyTheme(); $$('[data-th]', d).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); });
      const def = $('#thDef', d); if (def && def.checked) { const settings = { ...(S.school.settings || {}), uitheme: b.dataset.th }; try { const r = await api.updateSchool(S.school.id, { settings }); S.school.settings = (r && r.settings) || settings; A.toast('أصبحت السمة الافتراضية للمدرسة', 'ok'); } catch (e) { A.toast(e.message, 'err'); } }
    });
  }

  // ======================= (٣) الإشعارات =======================
  const K = A.NOTIF_KINDS; if (K && !K.new) K.new = ['جديد في المنصة', 'إضافة ميزة أو محتوى جديد إليك'];
  const KIC = { notice: ['📢', '#3AB1DB', '#005499'], reminder: ['⏰', '#F2C66D', '#C98A12'], message: ['💬', '#84B7E3', '#005499'], form_assigned: ['📝', '#5E9BD3', '#082B5A'], form_sign: ['✍️', '#C2AEEB', '#7E62C2'], form_submitted: ['📤', '#84B7E3', '#005499'], form_returned: ['↩️', '#F09A8E', '#D0564A'], form_approved: ['✅', '#5BC48A', '#2E8B57'], form_done: ['🏁', '#5BC48A', '#2E8B57'], standby: ['🕒', '#F2C66D', '#C98A12'], new: ['✨', '#3AB1DB', '#7E62C2'] };
  function decorate(root) {
    $$('.nf-it', root).forEach(it => { if ($('.nf-ic', it)) return; const k = (($('.nf-k', it) || {}).className || '').match(/k-([\w_]+)/); const c = KIC[k && k[1]] || KIC.notice; const s = document.createElement('span'); s.className = 'nf-ic'; s.setAttribute('aria-hidden', 'true'); s.style.cssText = `--a:${c[1]};--b:${c[2]}`; s.textContent = c[0]; it.prepend(s); });
    $$('.ovl', root).forEach(o => { const h = $('h3', o); if (h && /إعدادات المظهر/.test(h.textContent)) themePicker(h.parentNode); });
  }
  new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) decorate(n.parentNode || n); }).observe(document.documentElement, { childList: true, subtree: true });

  // ما الجديد: إعلان للمعلم عن الميزات المفعّلة له حديثاً (مرة لكل جهاز)، وللمالك عن إضافات المنصة
  const NEWS = [
    ['compass', '🧭', 'البوصلة ٢', '٩ مقاييس بثلاث لغات ولكل المراحل، وتقارير احترافية وإرسال لولي الأمر واتساب.', '#/compass', '#3AB1DB', '#005499'],
    ['gifted', '⭐', 'رعاية الموهوبين', 'دليل مرجعي وبوابات الكشف الخمس ونماذج الترشيح والتقدير وقرار اللجنة.', '#/gifted', '#F2C66D', '#C98A12'],
    ['home2', '🏠', 'واجهة المعلم الجديدة', 'أسبوعك وأيامه ونسبة إنجازك وأيقونات وصول سريع أعلى صفحتك.', '#/my', '#5BC48A', '#2E8B57'],
    ['themes', '🎨', 'السمات الاحترافية', 'اختر سمة المنصة من «المظهر»: عمق ثلاثي الأبعاد، زجاجي، زخارف دينا.', '', '#C2AEEB', '#7E62C2'],
  ];
  const seenKey = () => 'wn_seen_' + ((S.me || {}).id || '');
  function whatsNew() {
    if (!S.me || S.realMe || document.querySelector('.ovl') || (navigator.webdriver && !window.__wnTest)) return;
    let seen = null; try { seen = JSON.parse(localStorage.getItem(seenKey()) || 'null'); } catch (_) { }
    const tf = (((S.school || {}).settings || {}).tfeat) || {}, F = (A.TFEAT || []);
    const items = S.me.is_owner ? NEWS.map(n => n.slice()) : [NEWS.find(x => x[0] === 'themes').slice(), ...F.filter(f => tf[f[0]] === true || (tf[f[0]] === 'some' && A.tfeat(f[0]))).map(f => { const n = NEWS.find(x => x[0] === f[0]); return n ? n.slice() : [f[0], '✨', f[1], f[2], '', '#3AB1DB', '#005499']; })];
    const fresh = items.filter(n => !(seen || []).includes(n[0]));
    if (!fresh.length) return;
    try { localStorage.setItem(seenKey(), JSON.stringify(items.map(n => n[0]).concat(seen || []))); } catch (_) { }
    const m = A.modal(`<div class="wn-hd"><span class="big" aria-hidden="true">✨</span><div><b style="font-size:19px">جديد في منصة دينا</b><div class="small" style="color:#D6E6F5">أُضيف إلى حسابك ${AR(fresh.length)} ${fresh.length > 2 ? 'ميزات' : 'ميزة'}</div></div></div>
      <div class="wn">${fresh.map(n => `<div class="wn-it"><span class="g" style="--a:${n[5]};--b:${n[6]}" aria-hidden="true">${n[1]}</span><div class="grow"><b>${esc(n[2])}</b><small>${esc(n[3])}</small></div>${n[4] ? `<a class="btn sm" href="${n[4]}" data-wn>فتح</a>` : ''}</div>`).join('')}</div><div class="acts"><button class="btn" id="wnOk">رائع</button></div>`);
    $('#wnOk', m.el).onclick = () => m.close(); $$('[data-wn]', m.el).forEach(a => a.addEventListener('click', () => m.close()));
  }
  let wnT = 0; const wnTry = () => { if (wnT++ > 20) return; if (S.me && S.school && $('#nav')) setTimeout(whatsNew, 1800); else setTimeout(wnTry, 1000); };
  setTimeout(wnTry, 1500);
  // إشعار «تمت إضافة…» لكل المعلمين عند تفعيل المالك ميزة جديدة لهم
  A.announceNew = async (keys, ids) => {
    const F = A.TFEAT || []; const L = keys.map(k => F.find(f => f[0] === k)).filter(Boolean); if (!L.length) return 0;
    const n = NEWS.find(x => x[0] === keys[0]);
    try { return await api.rpc('notify_send', { p_ids: ids && ids.length ? ids : null, p_title: '✨ تمت إضافة: ' + L.map(f => f[1]).join('، '), p_body: L.map(f => '• ' + f[1] + ' — ' + f[2]).join('\n'), p_link: (n && n[4]) || '', p_kind: 'new', p_show_at: null }); } catch (_) { return 0; }
  };

  // ======================= (٢) لوحة المعلم =======================
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  const QUICK = { x_app: ['#84B7E3', '#005499'], prep: ['#5E9BD3', '#082B5A'], assess: ['#C2AEEB', '#7E62C2'], records: ['#F2C66D', '#C98A12'], refer: ['#F09A8E', '#D0564A'], forms: ['#84B7E3', '#005499'], games: ['#5BC48A', '#2E8B57'], wboard: ['#3AB1DB', '#005499'], labs: ['#BADF93', '#3F7D2A'], poll: ['#F2C66D', '#C98A12'], slides: ['#C2AEEB', '#7E62C2'], compass: ['#3AB1DB', '#082B5A'], gifted: ['#F2C66D', '#B07A10'], assistant: ['#5BC48A', '#2E8B57'], notify: ['#84B7E3', '#082B5A'] };
  const PAL = [['#3AB1DB', '#005499'], ['#5BC48A', '#2E8B57'], ['#C2AEEB', '#7E62C2'], ['#F2C66D', '#C98A12'], ['#F09A8E', '#D0564A'], ['#84B7E3', '#082B5A']];
  const parse = s => { const [y, mo, d] = String(s || '').split('-').map(Number); return new Date(y, (mo || 1) - 1, d || 1); };
  function hero() {
    const w = (A.week && A.week()) || {}, me = S.me.id;
    const mine = (S.entries || []).filter(e => e.teacher_id === me && e.subject_id);
    const fil = e => e.status && e.status !== 'empty'; const done = mine.filter(fil).length, p = mine.length ? Math.round(done * 100 / mine.length) : 0;
    const st = w.start_date ? parse(w.start_date) : null, today = new Date(); today.setHours(0, 0, 0, 0);
    const hol = (w.holidays || []).map(h => h.day);
    const days = DAYS.map((n, i) => { const d = st ? new Date(st.getFullYear(), st.getMonth(), st.getDate() + i) : null; const L = mine.filter(e => e.day === i); return { i, n, d, cnt: L.length, ok: L.filter(fil).length, today: d && d.getTime() === today.getTime(), hol: hol.includes(i) }; });
    const fmt = d => d ? AR(d.getDate()) + '/' + AR(d.getMonth() + 1) : '';
    // ترتيب منطقي موحّد مع الرئيسية (A.HOME_GROUPS): عملي اليومي ← داخل الصف ← التقويم ← الطلاب ← التواصل
    const ORD = [].concat(...((A.HOME_GROUPS || []).map(g => g[1])));
    const rank = k => { const i = ORD.indexOf(k); return i < 0 ? 999 : i; };
    const nav = (A.NAV || []).filter(n => !['my', 'dash', 'home', 'notify'].includes(n[0]) && (typeof n[2] !== 'function' || (() => { try { return n[2](); } catch (_) { return false; } })())).sort((a, b) => rank(a[0]) - rank(b[0])).slice(0, 11);
    const unread = +((($('#notifN') || {}).textContent || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))) || 0;
    const icons = [...nav.map(n => [n[0], n[1], '#/' + n[0]]), ...(A.tfeat('notif') && A.notifPanel ? [['notify', 'الإشعارات', '']] : []), ...(A.tfeat('app') && A.appDialog ? [['x_app', 'تطبيق الجوال', '']] : [])];
    const ring = `<div class="tq-ring" style="--p:${p}" role="img" aria-label="إنجاز الخطة ${p}٪"><div><b>${AR(p)}٪</b><small>${AR(done)} من ${AR(mine.length)}</small></div></div>`;
    return `<section class="tq" id="myHero" aria-label="أسبوعي">
      <div class="tq-top"><div class="tq-wk"><small>أهلاً ${esc((S.me.full_name || S.me.name || '').split(' ').slice(0, 2).join(' '))} 👋</small><h2>${esc(w.word ? 'الأسبوع ' + w.word : (w.label || 'الأسبوع الحالي'))}</h2><span>${days[0].d ? `من ${fmt(days[0].d)} إلى ${fmt(days[4].d)} · ` : ''}${AR(mine.length)} حصة في جدولك</span></div>${ring}</div>
      <div class="tq-days" role="list">${days.map(d => `<button class="tq-d ${d.today ? 'today' : ''} ${d.hol ? 'hol' : ''}" data-hd="${d.i}" role="listitem" aria-label="${d.n} ${d.hol ? 'إجازة' : AR(d.cnt) + ' حصص'}"><b>${d.n}</b><span>${d.hol ? 'إجازة' : `${fmt(d.d)} · ${AR(d.cnt)} حصص`}</span><i><u style="width:${d.cnt ? d.ok * 100 / d.cnt : 0}%"></u></i></button>`).join('')}</div>
      ${icons.length ? `<div class="tq-ics">${icons.map(([k, l, h], i) => { const c = QUICK[k] || PAL[i % PAL.length]; const ic = (A.HOME_ICO && k === 'x_app') ? A.HOME_ICO(k) : (A.I[k] || A.I.book || ''), inner = `<span class="g" style="--a:${c[0]};--b:${c[1]}">${ic}${k === 'notify' && unread ? `<span class="bd">${AR(unread)}</span>` : ''}</span>${esc(l)}`; return h ? `<a class="tq-ic" href="${h}">${inner}</a>` : `<button type="button" class="tq-ic" data-tqa="${k}" aria-label="${esc(l)}${k === 'notify' && unread ? ' — ' + AR(unread) + ' غير مقروء' : ''}">${inner}</button>`; }).join('')}</div>` : ''}
    </section>`;
  }
  ['my'].forEach(k => { const v0 = V[k]; if (!v0) return; V[k] = function (root) {
    const r = v0.apply(this, arguments);
    const go = () => { try {
      if (!S.me || !A.tfeat('home2') || !root || !root.isConnected) return; const old = $('#myHero', root); if (old) old.remove();
      root.insertAdjacentHTML('afterbegin', hero()); const h = $('#myHero', root);
      const g = $('details.tgrid', root); if (g) { h.after(g); g.open = true; }
      $$('[data-tqa]', h).forEach(b => b.onclick = () => { if (b.dataset.tqa === 'notify') A.notifPanel(); else if (b.dataset.tqa === 'x_app') A.appDialog(); });
      $$('[data-hd]', h).forEach(b => b.onclick = () => { const t = $('details.tgrid', root); if (!t) return; t.open = true; t.scrollIntoView({ behavior: 'smooth', block: 'start' }); t.classList.remove('tq-flash'); void t.offsetWidth; t.classList.add('tq-flash'); $$('.tg tbody tr', t).forEach((tr, i) => tr.classList.toggle('tq-row', i === +b.dataset.hd)); });
    } catch (e) { console.warn('hero', e); } };
    if (r && typeof r.then === 'function') r.then(go); else setTimeout(go, 0);
    return r;
  }; });
})();
