// التنبيهات الآلية تصل إشعاراً لا رسالة، إلا باختيار «كرسالة أيضاً»؛ ومن لم تُفعَّل له الإشعارات تصله رسالة — node t194.js
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2000);
  const r = await p.evaluate(async () => { const T = APP.S.staff.filter(s => !s.is_owner && s.active), a = T[0].id, c = T[1].id; APP.S.school.settings = APP.S.school.settings || {};
    APP.S.school.settings.tfeat = { notif: 'some' }; APP.S.school.settings.tfeatTo = { notif: [a] };
    const cnt = async () => ({ nA: (await APP.api.list('notifications', { staff_id: a })).filter(n => n.title === 'اختبار').length, nC: (await APP.api.list('notifications', { staff_id: c })).filter(n => n.title === 'اختبار').length, mA: (await APP.api.list('messages', {})).filter(m => m.recipient_id === a && m.subject === 'اختبار').length, mC: (await APP.api.list('messages', {})).filter(m => m.recipient_id === c && m.subject === 'اختبار').length });
    const r1 = await APP.notice([a, c], 'اختبار', 'نص'); const s1 = await cnt();
    const r2 = await APP.notice([a, c], 'اختبار', 'نص', { asMessage: true }); const s2 = await cnt();
    return { r1, s1, r2, s2, kind: !!APP.NOTIF_KINDS.system };
  });
  console.log(JSON.stringify(r));
  const ok = r.s1.nA === 1 && r.s1.mA === 0 && r.s1.mC === 1 && r.s1.nC === 0 && r.s2.mA === 1 && r.s2.nA === 2;
  console.log(ok ? 'PASS' : 'FAIL'); console.log('ERRS', errs); await b.close(); })();
