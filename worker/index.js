// المنصة الأم — وسيط الاطلاع على المنصات التابعة (Cloudflare Worker، قراءة فقط)
// GET /api/link/<id>/overview  مع ترويسة Authorization: Bearer <رمز دخول المنصة الأم>
// • يتحقق أن الطالب «مدير المنصة» بسؤال قاعدة المنصة الأم نفسها (is_platform_admin) بنفس رمزه.
// • يقرأ من قاعدة المنصة التابعة بمفتاح خدمة محفوظ سراً في Cloudflare (LINK_KEY_<id>) — لا يظهر في المتصفح.
// • يعيد أعداداً وإحصاءات فقط (لا بيانات طلاب)، ولا يكتب أي شيء، ولا يحتاج أي تعديل في قاعدة المنصة التابعة.
// • النتيجة تُخزَّن مؤقتاً ٥ دقائق لتقليل الاستهلاك.
// الإعداد: vars.CORE_URL، vars.CORE_KEY (مفتاح المنصة الأم العام)، vars.LINKS = {"dina": {"name": "...", "url": "https://xxx.supabase.co"}}،
//          والسر: LINK_KEY_dina (مفتاح الخدمة لقاعدة دينا) عبر: npx wrangler secret put LINK_KEY_dina
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

async function isAdmin(env, auth) {
  if (!auth || !/^Bearer\s+\S+/.test(auth)) return false;
  const r = await fetch(`${env.CORE_URL}/rest/v1/rpc/is_platform_admin`, { method: 'POST', headers: { apikey: env.CORE_KEY, authorization: auth, 'content-type': 'application/json' }, body: '{}' });
  return r.ok && (await r.json()) === true;
}

function db(url, key) {
  const h = { apikey: key, accept: 'application/json' };
  if (/^eyJ/.test(key)) h.authorization = 'Bearer ' + key; // مفتاح service_role القديم (JWT)
  const get = async (path, extra) => { const r = await fetch(`${url}/rest/v1/${path}`, { headers: Object.assign({}, h, extra || {}) }); if (!r.ok) throw new Error(path.split('?')[0] + ': ' + r.status); return r; };
  return {
    rows: async path => (await get(path)).json(),
    count: async path => { try { const r = await get(path + (path.includes('?') ? '&' : '?') + 'select=id&limit=1', { prefer: 'count=exact', range: '0-0' }); const m = (r.headers.get('content-range') || '').split('/')[1]; return m && m !== '*' ? +m : null; } catch (_) { return null; } }
  };
}
const day = d => d.toISOString().slice(0, 10);

async function overview(url, key) {
  const q = db(url, key), now = new Date(), today = day(new Date(now.getTime() + 3 * 36e5)); // توقيت الرياض
  const d7 = day(new Date(now - 6 * 864e5)), d30 = new Date(now - 29 * 864e5).toISOString(), t7 = new Date(now - 7 * 864e5).toISOString();
  const [schools, sections, weeks] = await Promise.all([
    q.rows('schools?select=id,name&order=created_at'),
    q.rows('sections?select=id,name,short_name,school_id&order=sort'),
    q.rows(`weeks?select=id,section_id,word,start_date&start_date=lte.${today}&order=start_date.desc&limit=60`)]);
  const cur = {}; weeks.forEach(w => { if (!cur[w.section_id]) cur[w.section_id] = w; });
  const per = await Promise.all(schools.map(async s => {
    const f = `school_id=eq.${s.id}`;
    const [staff, accounts, students, logins, att, absent, late, beh, behNeg, quizzes, questions, forms, preps] = await Promise.all([
      q.count(`staff?${f}&active=eq.true`), q.count(`staff?${f}&active=eq.true&user_id=not.is.null`), q.count(`students?${f}&active=eq.true`),
      q.count(`login_events?${f}&at=gte.${d30}`), q.count(`attendance?${f}&day=eq.${today}`), q.count(`attendance?${f}&day=eq.${today}&status=eq.absent`), q.count(`attendance?${f}&day=eq.${today}&status=eq.late`),
      q.count(`behaviors?${f}&day=gte.${d7}`), q.count(`behaviors?${f}&day=gte.${d7}&kind=eq.negative`),
      q.count(`quizzes?${f}&created_at=gte.${d30}`), q.count(`questions?${f}`), q.count(`form_tasks?${f}&created_at=gte.${d30}`), q.count(`lesson_preps?${f}&created_at=gte.${d30}`)]);
    const secs = await Promise.all(sections.filter(x => x.school_id === s.id).map(async x => {
      const w = cur[x.id], classes = await q.count(`classes?section_id=eq.${x.id}&active=eq.true`);
      if (!w) return { name: x.name, classes, week: null };
      const [total, filled, sent, approved, done] = await Promise.all([
        q.count(`plan_entries?week_id=eq.${w.id}`), q.count(`plan_entries?week_id=eq.${w.id}&status=neq.empty`),
        q.count(`plan_entries?week_id=eq.${w.id}&status=in.(submitted,approved)`), q.count(`plan_entries?week_id=eq.${w.id}&status=eq.approved`),
        q.count(`plan_entries?week_id=eq.${w.id}&exec_status=eq.done`)]);
      return { name: x.name, classes, week: { word: w.word, start: w.start_date, total, filled, sent, approved, done } };
    }));
    // الأكثر إنجازاً (٧ أيام): حصص الخطط المُرسلة لكل معلم — معرّفات فقط ثم الأسماء
    let top = [];
    try {
      const secIds = sections.filter(x => x.school_id === s.id).map(x => x.id), wIds = weeks.filter(w => secIds.includes(w.section_id)).map(w => w.id).slice(0, 12);
      if (wIds.length) {
        const pe = await q.rows(`plan_entries?select=teacher_id&week_id=in.(${wIds.join(',')})&submitted_at=gte.${t7}&teacher_id=not.is.null&limit=5000`);
        const by = {}; pe.forEach(r => by[r.teacher_id] = (by[r.teacher_id] || 0) + 1);
        const ids = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8);
        if (ids.length) { const nm = {}; (await q.rows(`staff?select=id,full_name&id=in.(${ids.map(x => x[0]).join(',')})`)).forEach(p => nm[p.id] = p.full_name); top = ids.map(([id, n]) => ({ name: nm[id] || '—', n })); }
      }
    } catch (_) { }
    return { id: s.id, name: s.name, staff, accounts, students, logins, att, absent, late, beh, behNeg, quizzes, questions, forms, preps, sections: secs, top };
  }));
  return { at: now.toISOString(), today, schools: per };
}

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url), m = u.pathname.match(/^\/api\/link\/([a-z0-9_-]{1,40})\/overview$/i);
    if (!u.pathname.startsWith('/api/')) return env.ASSETS.fetch(req);
    if (req.method !== 'GET' || !m) return J({ error: 'not_found' }, 404);
    const id = m[1], links = (() => { try { return typeof env.LINKS === 'string' ? JSON.parse(env.LINKS) : (env.LINKS || {}); } catch (_) { return {}; } })(), link = links[id], key = env['LINK_KEY_' + id];
    if (!(await isAdmin(env, req.headers.get('authorization')))) return J({ error: 'forbidden' }, 403);
    if (!link || !link.url) return J({ error: 'unknown_link' }, 404);
    if (!key) return J({ error: 'not_configured' }, 501);
    const cache = caches.default, ck = new Request(`https://cache.local/link/${id}/overview?f=${u.searchParams.get('fresh') ? Date.now() : ''}`);
    if (!u.searchParams.get('fresh')) { const hit = await cache.match(ck); if (hit) { const o = await hit.json(); o.cached = true; return J(o); } }
    try {
      const o = Object.assign({ id, name: link.name || id, url: link.site || '' }, await overview(link.url, key));
      ctx.waitUntil(cache.put(new Request(`https://cache.local/link/${id}/overview?f=`), new Response(JSON.stringify(o), { headers: { 'cache-control': 'max-age=300' } })));
      return J(o);
    } catch (e) { return J({ error: 'read_failed', msg: String(e.message || e) }, 502); }
  }
};
