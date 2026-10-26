/**
 * مزامنة منصة دينا للتخطيط ⇄ ملفات Google Sheets للخطة الأسبوعية
 * — أي تعديل في الشيت يصل إلى المنصة فوراً (لوحة المتابعة وخطط المعلمين تتحدّث لحظياً).
 * — أي تعديل في المنصة يُكتب في الشيت خلال ثوانٍ (أو دقيقة كحد أقصى).
 * — زر «مزامنة» في المنصة يسحب الشيت كاملاً عند الطلب.
 * التشغيل لأول مرة: اختر الدالة setup ثم «تشغيل» ووافق على الأذونات.
 */
const CFG = { url: '__URL__', key: '__KEY__', secret: '__SECRET__' };
const SKIP = ['البيانات', 'ملاحظات'];
const ROWS = 41; // صف العناوين + ٥ أيام × ٨ صفوف (٧ حصص + فاصل)

function setup() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('tick').timeBased().everyMinutes(1).create();
  const n = installSheetTriggers_();
  Logger.log('تم الإعداد — الملفات المرتبطة: ' + n);
}

function installSheetTriggers_() {
  const have = {};
  const ids = rpc_('sheet_list', { p_secret: CFG.secret }) || [];
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'onSheetEdit').forEach(t => {
    if (ids.indexOf(t.getTriggerSourceId()) < 0) ScriptApp.deleteTrigger(t); else have[t.getTriggerSourceId()] = 1; // الأسابيع المؤرشفة تُفصل
  });
  ids.forEach(id => { if (!have[id]) { try { ScriptApp.newTrigger('onSheetEdit').forSpreadsheet(id).onEdit().create(); } catch (e) { Logger.log(id + ': ' + e); } } });
  PropertiesService.getScriptProperties().setProperty('lastInstall', String(Date.now()));
  return ids.length;
}

function tick() {
  processQueue_();
  const last = +PropertiesService.getScriptProperties().getProperty('lastInstall') || 0;
  if (Date.now() - last > 10 * 60 * 1000) installSheetTriggers_(); // ربط الأسابيع الجديدة تلقائياً
}

function doPost(e) {
  let b = {}; try { b = JSON.parse(e.postData.contents); } catch (_) { }
  if (b.secret !== CFG.secret) return out_({ ok: false });
  processQueue_();
  return out_({ ok: true });
}
function doGet() { return out_({ ok: true, service: 'dina-sheet-sync' }); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function rpc_(name, body) {
  const r = UrlFetchApp.fetch(CFG.url + '/rest/v1/rpc/' + name, {
    method: 'post', contentType: 'application/json', headers: { apikey: CFG.key },
    payload: JSON.stringify(body), muteHttpExceptions: true
  });
  if (r.getResponseCode() >= 300) throw new Error(name + ': ' + r.getContentText());
  const t = r.getContentText(); return t ? JSON.parse(t) : null;
}

const clean_ = v => String(v == null ? '' : v).replace(/[‎‏‪-‮]/g, '').trim();
const isClassTab_ = sh => !sh.isSheetHidden() && sh.getName().trim() && SKIP.indexOf(sh.getName().trim()) < 0;

function rowsOf_(sh, r1, r2) {
  const vals = sh.getRange(1, 1, ROWS, 6).getDisplayValues(), tab = sh.getName(), R = [];
  for (let i = 1; i < ROWS; i++) {
    const d = Math.floor((i - 1) / 8), p = (i - 1) % 8, row = i + 1;
    if (p > 6 || d > 4) continue;
    if (r1 && (row < r1 || row > r2)) continue;
    const v = vals[i];
    R.push({ tab: tab, day: d, period: p, subject: clean_(v[2]), topic: clean_(v[3]), homework: clean_(v[4]), note: clean_(v[5]) });
  }
  return R;
}

// تعديل في الشيت ← المنصة فوراً
function onSheetEdit(e) {
  const sh = e.range.getSheet(); if (!isClassTab_(sh)) return;
  if (e.range.getLastColumn() < 3 || e.range.getColumn() > 6) return;
  const R = rowsOf_(sh, e.range.getRow(), e.range.getLastRow());
  if (R.length) rpc_('sheet_push', { p_secret: CFG.secret, p_sheet: e.source.getId(), p_rows: R });
}

function pushAll_(id) {
  const ss = SpreadsheetApp.openById(id); let R = [];
  ss.getSheets().forEach(sh => { if (isClassTab_(sh)) R = R.concat(rowsOf_(sh)); });
  return rpc_('sheet_push', { p_secret: CFG.secret, p_sheet: id, p_rows: R });
}

// تعديلات المنصة ← الشيت
function writeCells_(id, cells) {
  const ss = SpreadsheetApp.openById(id);
  const tabs = ss.getSheets().filter(isClassTab_);
  const map = rpc_('sheet_map', { p_secret: CFG.secret, p_sheet: id, p_tabs: tabs.map(s => s.getName()) }) || [];
  const tabOf = {}; map.forEach(m => tabOf[m.class] = m.tab);
  const byTab = {};
  cells.forEach(c => { const t = tabOf[c.class]; if (t) (byTab[t] = byTab[t] || {})[c.day + '|' + c.period] = c; });
  Object.keys(byTab).forEach(t => {
    const sh = ss.getSheetByName(t), rng = sh.getRange(2, 4, ROWS - 1, 3), vals = rng.getValues();
    let changed = false;
    Object.keys(byTab[t]).forEach(k => {
      const c = byTab[t][k], i = c.day * 8 + c.period, nv = [c.topic || '', c.homework || '', c.note || ''];
      if (String(vals[i][0]) !== nv[0] || String(vals[i][1]) !== nv[1] || String(vals[i][2]) !== nv[2]) { vals[i] = nv; changed = true; }
    });
    if (changed) rng.setValues(vals);
  });
}

function processQueue_() {
  const lock = LockService.getScriptLock(); if (!lock.tryLock(25000)) return;
  try {
    const items = rpc_('sheet_queue_take', { p_secret: CFG.secret }) || [];
    const by = {}; items.forEach(it => (by[it.sheet] = by[it.sheet] || []).push(it));
    Object.keys(by).forEach(id => {
      const list = by[id];
      try {
        if (list.some(x => x.kind === 'read_all')) pushAll_(id);
        const cells = list.some(x => x.kind === 'write_all') ? rpc_('sheet_pull', { p_secret: CFG.secret, p_sheet: id }) : list.filter(x => x.kind === 'cell').map(x => x.payload);
        if (cells && cells.length) writeCells_(id, cells);
      } catch (err) { Logger.log(id + ': ' + err); }
    });
  } finally { lock.releaseLock(); }
}

/** للاستخدام اليدوي من محرر السكربت: سحب كل الملفات المرتبطة إلى المنصة الآن */
function syncAllNow() { (rpc_('sheet_list', { p_secret: CFG.secret }) || []).forEach(id => Logger.log(id + ' → ' + JSON.stringify(pushAll_(id)))); }
