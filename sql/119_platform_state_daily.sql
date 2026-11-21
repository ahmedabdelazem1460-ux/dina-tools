-- النطاق: المنصة الأم فقط
-- 119 — للمنصة الأم فقط (لا يُطبَّق على دينا).
-- (١) platform_school_set يدمج الحقول المرسلة مع الموجودة بدل استبدال الكل
--     (كان حفظ «الحالة والميزات» يمسح علامة البيانات الوهمية وغيرها). status: active|suspended|archived
-- (٢) platform_usage_daily(school, from, to): نفس مؤشرات platform_usage لكن يوماً بيوم لمدرسة واحدة (للتقارير التفاعلية).
create or replace function public.platform_school_set(p_school uuid, p_platform jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'غير مسموح'; end if;
  if coalesce(p_platform->>'status', 'active') not in ('active', 'suspended', 'archived') then raise exception 'حالة غير معروفة'; end if;
  update public.schools set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{platform}',
    coalesce(settings->'platform', '{}'::jsonb) || coalesce(p_platform, '{}'::jsonb)) where id = p_school;
  insert into public.support_log(admin_id, school_id, action, details) values (auth.uid(), p_school, 'platform_set', p_platform);
end $$;

create or replace function public.platform_usage_daily(p_school uuid, p_from date, p_to date)
returns jsonb language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.is_platform_admin() then raise exception 'غير مسموح'; end if;
  if p_to < p_from or p_to - p_from > 366 then raise exception 'فترة غير صحيحة'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('d', d::date,
    'active_users', (select count(distinct l.staff_id) from public.login_events l join public.staff s on s.id = l.staff_id where s.school_id = p_school and l.at >= d and l.at < d + interval '1 day'),
    'actions', (select count(*) from public.audit_log l join public.staff s on s.id = l.staff_id where s.school_id = p_school and l.at >= d and l.at < d + interval '1 day'),
    'plans', (select count(*) from public.plan_entries e join public.weeks w on w.id = e.week_id join public.sections x on x.id = w.section_id where x.school_id = p_school and e.updated_at >= d and e.updated_at < d + interval '1 day' and coalesce(e.status, 'empty') <> 'empty'),
    'attendance', (select count(*) from public.attendance t where t.school_id = p_school and t.created_at >= d and t.created_at < d + interval '1 day') + (select count(*) from public.period_attendance t where t.school_id = p_school and t.created_at >= d and t.created_at < d + interval '1 day'),
    'behaviors', (select count(*) from public.behaviors t where t.school_id = p_school and t.created_at >= d and t.created_at < d + interval '1 day'),
    'quizzes', (select count(*) from public.quizzes t where t.school_id = p_school and t.created_at >= d and t.created_at < d + interval '1 day'),
    'questions', (select count(*) from public.questions t where t.school_id = p_school and t.created_at >= d and t.created_at < d + interval '1 day'),
    'forms', (select count(*) from public.form_tasks t where t.school_id = p_school and t.created_at >= d and t.created_at < d + interval '1 day'),
    'preps', (select count(*) from public.lesson_preps t where t.school_id = p_school and t.created_at >= d and t.created_at < d + interval '1 day'),
    'exams', (select count(*) from public.paper_exams t where t.school_id = p_school and t.created_at >= d and t.created_at < d + interval '1 day'),
    'errors', (select coalesce(sum(e.n), 0) from public.platform_errors e where e.school_id = p_school and e.last_at >= d and e.last_at < d + interval '1 day'),
    'reports', (select count(*) from public.support_reports r where r.school_id = p_school and r.created_at >= d and r.created_at < d + interval '1 day'))
    order by d) from generate_series(p_from::timestamptz, p_to::timestamptz, interval '1 day') d), '[]'::jsonb);
end $$;
revoke all on function public.platform_usage_daily(uuid, date, date) from public, anon;
grant execute on function public.platform_usage_daily(uuid, date, date) to authenticated;
