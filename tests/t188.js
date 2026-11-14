// بطاقة «الميزات الجديدة في حسابات المعلمين»: الحفظ بتغذية راجعة، المجموعات، البحث، الإسناد لمعلمين محددين، بند الاختبارات والواجبات الإلكترونية
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const errs = []; const W = process.argv[2] ? [+process.argv[2]] : [375, 768, 1440];
  for (const w of W) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 } }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(w + ': ' + e.message));
    await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
    await p.evaluate(() => location.hash = '#/tui'); await p.waitForTimeout(1500);
    await p.$eval('#tfCard', e => e.scrollIntoView()); await p.screenshot({ path: `p0/t188-a-${w}.png` });
    const r0 = await p.evaluate(() => ({ groups: document.querySelectorAll('#tfCard .tf-gr').length, items: document.querySelectorAll('#tfCard .tf-it').length, ehw: !!document.querySelector('.tf-it[data-k="ehw"]'), goDisabled: document.querySelector('#tfGo').disabled, hscroll: document.documentElement.scrollWidth > innerWidth }));
    // إسناد «مساعد المعلم» لمعلمَين محددين
    await p.click('.tf-it[data-k="assistant"] input[value="some"]', { force: true }); await p.waitForTimeout(400);
    await p.screenshot({ path: `p0/t188-picker-${w}.png` });
    const ids = await p.$$eval('.tfp-l input', x => x.slice(0, 2).map(i => i.value));
    await p.check(`.tfp-l input[value="${ids[0]}"]`); await p.check(`.tfp-l input[value="${ids[1]}"]`); await p.click('#tfpOk'); await p.waitForTimeout(300);
    // الاختبارات والواجبات الإلكترونية: للجميع، والإشعارات للجميع
    await p.check('.tf-it[data-k="ehw"] input[value="all"]', { force: true }); await p.$eval('.tf-it[data-k="notif"]', e => e.scrollIntoView({ block: 'center' })); await p.check('.tf-it[data-k="notif"] input[value="all"]', { force: true }); await p.waitForTimeout(200);
    const dirty = await p.evaluate(() => ({ msg: document.querySelector('#tfMsg').textContent, go: document.querySelector('#tfGo').textContent, dis: document.querySelector('#tfGo').disabled }));
    await p.$eval('#tfBar', e => e.scrollIntoView({ block: 'end' })); await p.screenshot({ path: `p0/t188-dirty-${w}.png` });
    // بحث وتصفية
    await p.fill('#tfQ', 'الذرة'); await p.waitForTimeout(150); const found = await p.$$eval('#tfCard .tf-it', x => x.map(i => i.dataset.k)); await p.fill('#tfQ', '');
    await p.click('[data-flt="on"]'); const onlyOn = await p.$$eval('#tfCard .tf-it', x => x.map(i => i.dataset.k)); await p.click('[data-flt="all"]');
    await p.click('#tfGo'); await p.waitForTimeout(1200);
    const after = await p.evaluate(ids => { const st = APP.S.school.settings; const real = APP.S.me;
      const as = id => { APP.S.me = APP.S.staff.find(s => s.id === id); const r = { asst: APP.tfeat('assistant'), notif: APP.tfeat('notif'), hw: APP.canHw() }; APP.S.me = real; return r; };
      const other = APP.S.staff.find(s => !s.is_owner && !ids.includes(s.id) && s.active !== false);
      return { tfeat: st.tfeat.assistant, to: st.tfeatTo.assistant, ehw: st.ehw.mode, msg: document.querySelector('#tfMsg').textContent, dis: document.querySelector('#tfGo').disabled, sel: as(ids[0]), other: as(other.id) }; }, ids);
    await p.$eval('#tfBar', e => e.scrollIntoView({ block: 'end' })); await p.screenshot({ path: `p0/t188-saved-${w}.png` });
    console.log(w, JSON.stringify({ r0, dirty, found, onlyOn, after }));
    await ctx.close(); }
  console.log('ERRS', errs); await b.close(); })();
