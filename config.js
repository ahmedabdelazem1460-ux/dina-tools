// إعدادات الاتصال بقاعدة البيانات (المفاتيح العامة فقط — آمنة للنشر؛ الحماية عبر صلاحيات الصفوف RLS)
// قاعدتان منفصلتان تماماً:
//   dina = قاعدة مدارس دينا (الافتراضية دائماً — لا يتغير شيء لمنصة دينا)
//   core = المنصة الأم (التجربة + المدارس الجديدة + لوحة مالك المنصة)
// الاختيار: ?db=core أو ?db=dina في الرابط (يُحفظ على الجهاز)، أو نطاق المنصة الأم في CORE_HOSTS.
(function () {
  var DBS = {
    dina: { supabaseUrl: 'https://dwibkkrzykqgsgyrrggp.supabase.co', supabaseKey: 'sb_publishable_HuzqZLhAp-c1UhnapvBQvQ_CuZB6mf3' },
    core: { supabaseUrl: 'https://jpdxzhpszcvzajmcjprm.supabase.co', supabaseKey: 'sb_publishable_PRSYVU-uzARBu1VejEvtjw_7jG7nnVT' }
  };
  // نطاقات المنصة الأم (تُضاف هنا عند ربط النطاق أو Cloudflare Pages)
  var CORE_HOSTS = [/almenasa/i];
  var db = 'dina', h = (location.hostname || '');
  try {
    var q = new URLSearchParams(location.search).get('db');
    if (q === 'core' || q === 'dina') localStorage.setItem('dwp_db', q);
    var saved = localStorage.getItem('dwp_db');
    if (saved === 'core' || saved === 'dina') db = saved;
  } catch (e) {}
  if (CORE_HOSTS.some(function (r) { return r.test(h); })) {
    try { if (localStorage.getItem('dwp_db') !== 'dina') db = 'core'; } catch (e) { db = 'core'; }
  }
  window.APP_CONFIG = { supabaseUrl: DBS[db].supabaseUrl, supabaseKey: DBS[db].supabaseKey, db: db };
  window.APP_DBS = DBS; // للوحة مالك المنصة: الاطلاع على المنصات التابعة (قراءة فقط)
  // شارة صغيرة عند العمل على المنصة الأم حتى لا تختلط بمنصة دينا
  if (db === 'core') document.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('span');
    b.id = 'dbBadge'; b.className = 'nobrand'; b.setAttribute('role', 'note');
    b.textContent = 'المنصة الأم'; b.title = 'أنت متصل بقاعدة المنصة الأم (منفصلة تماماً عن قاعدة دينا)';
    var st = document.createElement('style');
    st.textContent = '#dbBadge{position:fixed;bottom:8px;left:8px;z-index:10002;background:#2E8B57;color:#fff;font:600 12px/1 inherit;padding:6px 10px;border-radius:999px;opacity:.92;pointer-events:none}@media (max-width:900px){#dbBadge{bottom:auto;top:calc(env(safe-area-inset-top,0px) + 2px);left:50%;transform:translateX(-50%);font-size:10px;padding:3px 8px}}@media print{#dbBadge{display:none}}';
    document.head.appendChild(st); document.body.appendChild(b);
  });
})();
