const { chromium } = require('playwright');
const BOYS = {def:'2ytlet2',acts:[],holidays:[],schedules:[{id:'bhe5n7t',np:6,dur:45,name:'الجدول الأساسي',pass:0,start:'07:30',breaks:[],show:true},{id:'2ytlet2',np:6,dur:30,name:'التعليم عن بعد',pass:5,start:'20:30',show:true,breaks:[{id:'x',after:3,dur:20,label:'الفسحة',classes:[]}]},{id:'q2',dur:45,name:'جدول ٢',pass:0,start:'07:00',breaks:[]}]};
const today = new Date(Date.now()+3*36e5).toISOString().slice(0,10);
const DISP = [{label:'جدول التعليم عن بعد',tag:'',published:true,published_at:'2026-11-01T00:00:00Z',date_from:today,date_to:today,meta:{times:[["20:30","21:00"],["21:05","21:35"],["21:40","22:10"],["22:30","23:00"],["23:05","23:35"],["23:40","00:10"]],breaks:[{to:"22:30",from:"22:10",after:3,label:"الفسحة"}],days:[0,1,2,3,4,5,6],perDay:{}}},{label:'غير منشور',published:false,date_from:today,date_to:'2026-12-01',meta:{times:[]}}];
(async () => { const b = await chromium.launch(); const errs = [];
  const p = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:8766/index.html?demo=1'); await p.click('[data-demo="a.abdelazim@dinaschool.com"]'); await p.waitForTimeout(2200);
  await p.evaluate(([bell, disp]) => { APP.section().bell = bell; APP.bell.loadDisp = async () => disp; APP.LS.set('studio_t', 'bell'); location.hash = '#/studio'; }, [BOYS, DISP]); await p.waitForTimeout(2500);
  console.log('CHK:', (await p.textContent('#blChk')).replace(/\s+/g, ' ').slice(0, 900));
  console.log('strip items', await p.$$eval('.bl-strip .bl-it', a => a.length));
  await p.screenshot({ path: 'p0/t166_bell.png', fullPage: false, clip: { x: 0, y: 0, width: 1366, height: 900 } });
  await p.evaluate(() => document.querySelector('#blChk').scrollIntoView()); await p.screenshot({ path: 'p0/t166_chk.png' });
  await p.click('.bl-next summary'); await p.waitForTimeout(200); console.log('next rows', await p.$$eval('.bl-next tbody tr', a => a.map(r => r.textContent.replace(/\s+/g,' ').trim()).slice(0,4)));
  // fix default (demo only — in-memory)
  await p.click('#blFxDo'); await p.waitForTimeout(500); await p.click('.ovl .btn:not(.ghost) >> nth=-1').catch(()=>{}); await p.waitForTimeout(1500);
  console.log('def after', await p.evaluate(() => APP.section().bell.def), 'pill', (await p.textContent('#blChk h3')).trim());
  await p.fill('[data-fxn="q2"]', 'الحضوري المبكر'); await p.click('[data-fxs="q2"]'); await p.waitForTimeout(1500);
  console.log('names', await p.evaluate(() => APP.section().bell.schedules.map(s => s.name).join(' | ')));
  await p.evaluate(() => { location.hash = '#/board'; }); await p.waitForTimeout(2500);
  console.log('BOARD banner:', (await p.textContent('#bdTm').catch(() => 'none')).replace(/\s+/g, ' '));
  for (const W of [375, 768]) { await p.setViewportSize({ width: W, height: 820 }); await p.evaluate(() => { APP.LS.set('studio_t','bell'); location.hash = '#/studio'; }); await p.waitForTimeout(1500); console.log(W, 'overflow', await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)); await p.evaluate(() => document.querySelector('#blChk') && document.querySelector('#blChk').scrollIntoView()); await p.screenshot({ path: `p0/t166_${W}.png` }); }
  // board.html with mocked RPC
  const q = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage(); q.on('pageerror', e => errs.push('board: ' + e.message));
  await q.route('**/rpc/board_view', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ school: 'دينا', section: 'قسم البنين', day: today, dow: new Date(today+'T12:00:00Z').getUTCDay(), board: { secs: 3, hide: [] }, bell: BOYS, periods: 7, days: 7, disp: [DISP[0]], standby: [], cover: [], absentStaff: [], att: {}, duty: [], staffOff: [] }) }));
  await q.goto('http://localhost:8766/board.html?t=x'); await q.waitForTimeout(2000);
  console.log('board times', await q.evaluate(() => { const s = [...document.querySelectorAll('.slide')].find(x => /مواعيد/.test(x.textContent)); return s ? s.textContent.replace(/\s+/g, ' ').slice(0, 400) : 'no times slide'; }));
  console.log('now', await q.textContent('#now'));
  await q.evaluate(() => { const ss=[...document.querySelectorAll('.slide')]; ss.forEach(x=>x.classList.remove('on')); const s = ss.find(x => /مواعيد/.test(x.textContent)); s && s.classList.add('on'); }); await q.waitForTimeout(400); await q.screenshot({ path: 'p0/t166_board.png' });
  console.log('ERRS', errs); await b.close(); })();
