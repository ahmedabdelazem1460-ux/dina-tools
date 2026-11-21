-- النطاق: المنصة الأم فقط
-- 114 — لوحة مالك المنصة (للمنصة الأم فقط — لا يُطبَّق على قاعدة مدارس دينا)
-- يعتمد على 113 (platform_admins / is_platform_admin).
-- (١) سجل الأخطاء التلقائي  (٢) بلاغات المستخدمين  (٣) المستخدمون والاستخدام لكل مدرسة  (٤) حالة المدرسة وميزاتها  (٥) سجل الدعم

-- قائمة المدارس (يحل محل نسخة 113 ويضيف حالة المدرسة settings.platform)
create or replace function public.platform_schools()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'غير مسموح'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', sc.id, 'name', sc.name, 'created_at', sc.created_at,
    'brand', sc.settings->'brand', 'setup', sc.settings->'setup', 'plan', sc.settings->'plan', 'platform', sc.settings->'platform', 'mine', sc.id = public.my_school(),
    'sections', (select count(*) from public.sections x where x.school_id = sc.id),
    'classes', (select count(*) from public.classes c join public.sections x on x.id = c.section_id where x.school_id = sc.id),
    'staff', (select count(*) from public.staff st where st.school_id = sc.id and st.active),
    'accounts', (select count(*) from public.staff st where st.school_id = sc.id and st.active and st.user_id is not null),
    'students', (select count(*) from public.students su where su.school_id = sc.id and su.active),
    'owners', (select jsonb_agg(jsonb_build_object('name', st.full_name, 'email', st.email, 'joined', st.user_id is not null)) from public.staff st where st.school_id = sc.id and st.is_owner),
    'codes', (select jsonb_agg(j.code) from public.join_codes j join public.sections x on x.id = j.section_id where x.school_id = sc.id and j.active and j.label = 'تفعيل حساب مالك المدرسة')
  ) order by sc.created_at) from public.schools sc), '[]'::jsonb);
end $$;

-- ========== (١) الأخطاء ==========
create table if not exists public.platform_errors (
  id bigint generated always as identity primary key,
  fp text not null,                       -- بصمة الخطأ (الرسالة + الصفحة + السطر)
  school_id uuid, staff_id uuid,
  page text, msg text, stack text, ua text, url text, ver text,
  n int not null default 1, first_at timestamptz not null default now(), last_at timestamptz not null default now(),
  resolved boolean not null default false, note text);
create unique index if not exists platform_errors_fp on public.platform_errors(fp, (coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid)));
alter table public.platform_errors enable row level security;

-- يسجّله المتصفح تلقائياً (المستخدم المسجّل أو الصفحات العامة) — يُدمج المتكرر في سطر واحد بعدّاد
create or replace function public.log_error(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare sch uuid := public.my_school(); me uuid := public.me(); f text;
begin
  f := md5(coalesce(left(p->>'msg', 300), '') || '|' || coalesce(p->>'page', '') || '|' || coalesce(left(p->>'where', 200), ''));
  insert into public.platform_errors(fp, school_id, staff_id, page, msg, stack, ua, url, ver)
    values (f, sch, me, left(p->>'page', 120), left(p->>'msg', 1000), left(p->>'stack', 4000), left(p->>'ua', 300), left(p->>'url', 500), left(p->>'ver', 40))
  on conflict (fp, (coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid)))
  do update set n = platform_errors.n + 1, last_at = now(), staff_id = coalesce(excluded.staff_id, platform_errors.staff_id),
    ua = excluded.ua, url = excluded.url, ver = excluded.ver, resolved = case when platform_errors.resolved and platform_errors.ver is distinct from excluded.ver then false else platform_errors.resolved end;
end $$;

create or replace function public.platform_errors_list(p_days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'غير مسموح'; end if;
  return coalesce((select jsonb_agg(to_jsonb(e) || jsonb_build_object('school', (select name from public.schools where id = e.school_id), 'who', (select full_name from public.staff where id = e.staff_id)) order by e.resolved, e.last_at desc)
    from public.platform_errors e where e.last_at > now() - make_interval(days => p_days)), '[]'::jsonb);
end $$;

create or replace function public.platform_error_set(p_id bigint, p_resolved boolean, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'غير مسموح'; end if;
  update public.platform_errors set resolved = p_resolved, note = p_note where id = p_id;
end $$;

-- ========== (٢) بلاغات المستخدمين ==========
create table if not exists public.support_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null, staff_id uuid, page text, body text not null, shot text, ua text,
  status text not null default 'open' check (status in ('open', 'working', 'done')),
  reply text, replied_at timestamptz, created_at timestamptz not null default now());
alter table public.support_reports enable row level security;
-- صاحب البلاغ يرى بلاغاته ورد الدعم عليها
create policy sr_own_read on public.support_reports for select using (staff_id = public.me());

create or replace function public.support_report(p jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare id uuid;
begin
  if public.me() is null then raise exception 'سجّل الدخول أولاً'; end if;
  if length(btrim(coalesce(p->>'body', ''))) < 5 then raise exception 'اكتب وصفاً للمشكلة'; end if;
  if (select count(*) from public.support_reports where staff_id = public.me() and created_at > now() - interval '1 hour') >= 10 then raise exception 'بلاغات كثيرة — حاول لاحقاً'; end if;
  insert into public.support_reports(school_id, staff_id, page, body, shot, ua)
    values (public.my_school(), public.me(), left(p->>'page', 120), left(p->>'body', 4000), case when length(coalesce(p->>'shot', '')) <= 1500000 then p->>'shot' end, left(p->>'ua', 300))
    returning support_reports.id into id;
  return id;
end $$;

create or replace function public.platform_reports_list(p_status text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'غير مسموح'; end if;
  return coalesce((select jsonb_agg(to_jsonb(r) || jsonb_build_object('school', (select name from public.schools where id = r.school_id), 'who', (select full_name from public.staff where id = r.staff_id)) order by r.created_at desc)
    from public.support_reports r where p_status is null or r.status = p_status), '[]'::jsonb);
end $$;

create or replace function public.platform_report_set(p_id uuid, p_status text, p_reply text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'غير مسموح'; end if;
  update public.support_reports set status = p_status, reply = nullif(btrim(coalesce(p_reply, '')), ''), replied_at = case when nullif(btrim(coalesce(p_reply, '')), '') is not null then now() else replied_at end where id = p_id;
end $$;

-- ========== (٣) المستخدمون والاستخدام ==========
create or replace function public.platform_users(p_school uuid)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_platform_admin() then raise exception 'غير مسموح'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', s.id, 'name', s.full_name, 'email', s.email, 'title', s.title, 'owner', s.is_owner, 'active', s.active,
      'joined', s.user_id is not null, 'created_at', s.created_at, 'last_in', u.last_sign_in_at,
      'roles', (select jsonb_agg(distinct m.role) from public.memberships m where m.staff_id = s.id),
      'acts30', (select count(*) from public.audit_log a where a.staff_id = s.id and a.at > now() - interval '30 days'))
    order by u.last_sign_in_at desc nulls last) from public.staff s left join auth.users u on u.id = s.user_id where s.school_id = p_school), '[]'::jsonb);
end $$;

-- عدّادات الاستخدام لكل مدرسة خلال فترة
create or replace function public.platform_usage(p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
declare a timestamptz := p_from::timestamptz; b timestamptz := (p_to + 1)::timestamptz;
begin
  if not public.is_platform_admin() then raise exception 'غير مسموح'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', sc.id, 'name', sc.name,
    'active_users', (select count(distinct s.id) from public.staff s join auth.users u on u.id = s.user_id where s.school_id = sc.id and u.last_sign_in_at >= a and u.last_sign_in_at < b),
    'actions', (select count(*) from public.audit_log l join public.staff s on s.id = l.staff_id where s.school_id = sc.id and l.at >= a and l.at < b),
    'plans', (select count(*) from public.plan_entries e join public.weeks w on w.id = e.week_id join public.sections x on x.id = w.section_id where x.school_id = sc.id and e.updated_at >= a and e.updated_at < b and coalesce(e.status, 'empty') <> 'empty'),
    'attendance', (select count(*) from public.attendance t where t.school_id = sc.id and t.created_at >= a and t.created_at < b) + (select count(*) from public.period_attendance t where t.school_id = sc.id and t.created_at >= a and t.created_at < b),
    'behaviors', (select count(*) from public.behaviors t where t.school_id = sc.id and t.created_at >= a and t.created_at < b),
    'quizzes', (select count(*) from public.quizzes t where t.school_id = sc.id and t.created_at >= a and t.created_at < b),
    'questions', (select count(*) from public.questions t where t.school_id = sc.id and t.created_at >= a and t.created_at < b),
    'forms', (select count(*) from public.form_tasks t where t.school_id = sc.id and t.created_at >= a and t.created_at < b),
    'preps', (select count(*) from public.lesson_preps t where t.school_id = sc.id and t.created_at >= a and t.created_at < b),
    'exams', (select count(*) from public.paper_exams t where t.school_id = sc.id and t.created_at >= a and t.created_at < b),
    'errors', (select coalesce(sum(e.n), 0) from public.platform_errors e where e.school_id = sc.id and e.last_at >= a and e.last_at < b),
    'reports', (select count(*) from public.support_reports r where r.school_id = sc.id and r.created_at >= a and r.created_at < b))
    order by sc.created_at) from public.schools sc), '[]'::jsonb);
end $$;

-- ========== (٤) حالة المدرسة وميزاتها ==========
-- settings.platform = {status: active|suspended, msg, features: {مفتاح: false}}
create or replace function public.platform_school_set(p_school uuid, p_platform jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'غير مسموح'; end if;
  update public.schools set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{platform}', coalesce(p_platform, '{}'::jsonb)) where id = p_school;
  insert into public.support_log(admin_id, school_id, action, details) values (auth.uid(), p_school, 'platform_set', p_platform);
end $$;

-- رابط تفعيل جديد لمالك المدرسة (عند ضياع الرابط أو تغيير المدير)
create or replace function public.platform_owner_link(p_school uuid)
returns text language plpgsql security definer set search_path = public as $$
declare c text; sec uuid;
begin
  if not public.is_platform_admin() then raise exception 'غير مسموح'; end if;
  select id into sec from public.sections where school_id = p_school order by sort limit 1;
  update public.join_codes set active = false where section_id in (select id from public.sections where school_id = p_school) and label = 'تفعيل حساب مالك المدرسة';
  c := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into public.join_codes(code, section_id, role, active, title, label) values (c, sec, 'supervisor', true, 'مدير المدرسة', 'تفعيل حساب مالك المدرسة');
  insert into public.support_log(admin_id, school_id, action, details) values (auth.uid(), p_school, 'owner_link', '{}'::jsonb);
  return c;
end $$;

-- ========== (٥) سجل الدعم (يراه مالك المدرسة أيضاً) ==========
create table if not exists public.support_log (
  id bigint generated always as identity primary key,
  admin_id uuid, school_id uuid not null, action text not null, details jsonb, at timestamptz not null default now());
alter table public.support_log enable row level security;
create policy sl_owner_read on public.support_log for select using (school_id = public.my_school() and public.is_owner());

grant execute on function public.log_error(jsonb) to anon, authenticated;
grant execute on function public.support_report(jsonb) to authenticated;
grant execute on function public.platform_errors_list(int), public.platform_error_set(bigint, boolean, text), public.platform_reports_list(text),
  public.platform_report_set(uuid, text, text), public.platform_users(uuid), public.platform_usage(date, date),
  public.platform_school_set(uuid, jsonb), public.platform_owner_link(uuid) to authenticated;
