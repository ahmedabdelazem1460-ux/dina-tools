/* منصة دينا — التحكم في الميزات الجديدة داخل حسابات المعلمين (للمالك وحده)
   كل ميزة جديدة تبقى جاهزة في المنصة وتعمل في حساب المالك، ولا تظهر لأي حساب آخر إلا بعد تفعيلها هنا.
   يُحفظ في schools.settings.tfeat — ويقرؤه A.tfeat(k) (notifications.js). */
(function () {
  const A = window.APP, V = window.VIEWS; if (!A) return;
  const { S, api, $, $$, esc } = A;
  const F = [
    ['notif', 'الإشعارات', 'جرس الإشعارات وتنبيهات الجهاز: النماذج المطلوبة، حصص الانتظار، رسائلك وتنبيهاتك العامة.'],
    ['myforms', 'نماذجي', 'إنشاء المعلم نماذج عمله الخاصة بهوية المدرسة وحفظها وترتيبها.'],
    ['hr', 'الموارد البشرية', 'تسجيل الحضور الذاتي (الموقع/رمز QR)، وصفحة «حضوري»، وصلاحية الإدارة لمن تمنحه «hr».'],
    ['terms', 'مؤشر الفصل الدراسي', 'تنقّل المعلم بين الفصل الأول والثاني لمراجعة خطط الفصل السابق (الفصل الحالي يظهر دائماً).'],
    ['poll', 'السؤال اللحظي', 'صفحة «السؤال اللحظي» وزرّه في السبورة والعروض: يجيب الطلاب من جوالاتهم برمز.'],
    ['slides', 'العروض التقديمية', 'تحويل بنوك الأسئلة والدروس والملفات لعروض احترافية بهويات مشتقة من دينا.'],
    ['compass', 'البوصلة', 'تطبيق المقاييس التربوية على الطلاب وعرض نتائجها (مؤشرات الأداء تبقى للمالك).'],
    ['assistant', 'مساعد المعلم', 'تجهيز الدرس تلقائياً: أهداف، سير الحصة، أنشطة، أسئلة، واجب، تمايز.'],
    ['app', 'زر «تطبيق الجوال»', 'تعليمات تثبيت المنصة على أندرويد وآيفون في قائمة المستخدم.'],
  ];
  A.TFEAT = F;
  if (!document.getElementById('tfcss')) { const st = document.createElement('style'); st.id = 'tfcss'; st.textContent = `
.tf-card{border:1px solid #DCE7F3;border-radius:18px;padding:14px 16px;background:linear-gradient(180deg,#fff,#F5F9FD);box-shadow:0 12px 26px -22px rgba(8,43,90,.6);margin-bottom:14px}
.tf-g{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));margin-top:10px}
.tf-it{display:flex;gap:10px;align-items:flex-start;border:1.5px solid #DCE7F3;border-radius:14px;padding:10px 12px;background:#fff;cursor:pointer}
.tf-it:has(input:checked){border-color:#2E8B57;background:#F4FBF6}
.tf-it input{width:20px;height:20px;accent-color:#2E8B57;margin-top:2px;flex:none}
.tf-it b{display:block;color:#082B5A}.tf-it small{color:#5b6b7f}
.tf-st{font-size:11.5px;font-weight:800;border-radius:20px;padding:1px 8px;margin-inline-start:6px}
.tf-on{background:#E5F3EA;color:#2E8B57}.tf-off{background:#EEF1F5;color:#5b6b7f}`; document.head.appendChild(st); }
  const prev = V.tui;
  V.tui = function (root) {
    const r = prev.apply(this, arguments);
    if (!S.me || !S.me.is_owner || S.realMe) return r;
    const cur = ((S.school.settings || {}).tfeat) || {};
    const box = document.createElement('div'); box.className = 'tf-card'; box.id = 'tfCard';
    box.innerHTML = `<div class="head" style="margin:0"><div class="grow"><h3 style="margin:0">الميزات الجديدة في حسابات المعلمين</h3><p class="sub" style="margin:4px 0 0">كل ميزة جديدة جاهزة وتعمل في حسابك، ولا تظهر لأي معلم أو موظف إلا عندما تفعّلها هنا.</p></div><button class="btn sm" id="tfGo">حفظ</button></div>
      <div class="tf-g">${F.map(([k, l, d]) => `<label class="tf-it"><input type="checkbox" data-tf="${k}" ${cur[k] === true ? 'checked' : ''}><span><b>${esc(l)}<span class="tf-st ${cur[k] === true ? 'tf-on' : 'tf-off'}">${cur[k] === true ? 'ظاهرة للمعلمين' : 'مخفية عنهم'}</span></b><small>${esc(d)}</small></span></label>`).join('')}</div>`;
    const host = root.querySelector('.card') || root; host.parentNode ? host.parentNode.insertBefore(box, host) : root.prepend(box);
    box.querySelector('#tfGo').onclick = e => A.run(e.currentTarget, async () => {
      const tfeat = {}; $$('[data-tf]', box).forEach(i => tfeat[i.dataset.tf] = i.checked);
      const settings = { ...(S.school.settings || {}), tfeat }; const res = await api.updateSchool(S.school.id, { settings }); S.school.settings = (res && res.settings) || settings;
      A.toast('حُفظ — يظهر للمعلمين ما فعّلته فقط', 'ok'); V.tui(root);
    });
    return r;
  };
})();
