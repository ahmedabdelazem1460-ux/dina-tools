/* منصة دينا — لا تُعرض لغير المالك أي عبارة تخص المالك وصلاحياته («يحددها المالك»، «لحساب المالك»، «يمنحها المالك»…)
   شبكة أمان عامة: تُنقّى رسائل A.emptyBox و A.toast لغير المالك؛ ما يخص المالك يُحذف بلا بديل يذكره.
   (الصفحات الخاصة بالمالك أصلاً مخفية من القائمة، ومن يصلها برابط يُعاد للرئيسية بصمت.) */
(function () {
  const A = window.APP; if (!A) return;
  const S = A.S, RE = /المالك|مالك النظام/;
  const isOwner = () => !!(S.me && S.me.is_owner && !S.realMe);
  // يحذف الجملة/المقطع الذي يذكر المالك ويُبقي ما سواه
  const strip = t => String(t == null ? '' : t).split(/(?<=[.،؛])\s+|\s+[—–-]\s+|\s*<br\s*\/?>\s*/).filter(x => !RE.test(x)).join(' ').trim();
  A.ownerClean = t => isOwner() || !RE.test(String(t || '')) ? t : strip(t);
  const eb = A.emptyBox;
  if (eb) A.emptyBox = function (t, sub) { if (isOwner()) return eb.apply(this, arguments); const T = RE.test(t || '') ? (strip(t) || 'غير متاح لحسابك') : t; const SB = RE.test(sub || '') ? strip(sub) : sub; return eb.call(this, T, SB || ''); };
  const to = A.toast;
  if (to) A.toast = function (m, type) { if (isOwner() || !RE.test(String(m || ''))) return to.apply(this, arguments); const c = strip(m); return to.call(this, /صلاحي/.test(m) && !c ? 'ليست لديك صلاحية لهذا الإجراء' : (c || 'غير متاح لحسابك'), type); };
})();
