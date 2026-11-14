-- 092: بنك أسئلة المدرسة + التحكم في إتاحة «الواجب الإلكتروني برابط» للمعلمين
-- لا يغيّر أي بيانات موجودة. الوضع الافتراضي (بلا إعداد) يطابق السلوك السابق.
alter table public.questions add column if not exists source text;

create or replace function public.assess_ok(p_school uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or public.has_module('supervision') or coalesce((
    select case coalesce(s.settings->'features'->>'assess', 'all') when 'off' then false when 'granted' then public.has_module('assess') else true end
    from public.schools s where s.id = p_school), false) $$;

create or replace function public.ehw_ok(p_school uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or coalesce((
    select case coalesce(s.settings->'ehw'->>'mode', 'follow')
      when 'all' then true
      when 'granted' then coalesce((s.settings->'ehw'->'staff') ? (public.me())::text, false)
      when 'off' then false
      else public.assess_ok(p_school) end
    from public.schools s where s.id = p_school), false) $$;
revoke all on function public.assess_ok(uuid) from public, anon; grant execute on function public.assess_ok(uuid) to authenticated;
revoke all on function public.ehw_ok(uuid) from public, anon; grant execute on function public.ehw_ok(uuid) to authenticated;

alter policy qz_ins on public.quizzes with check (in_school(school_id) and ((teacher_id = me()) or is_owner()) and (kind <> 'homework' or public.ehw_ok(school_id)));
alter policy qz_upd on public.quizzes using (in_school(school_id) and ((teacher_id = me()) or is_owner()))
  with check (in_school(school_id) and ((teacher_id = me()) or is_owner()) and (kind <> 'homework' or status <> 'published' or public.ehw_ok(school_id)));

create or replace function public.qbank_usage() returns table(question_id uuid, uses int) language sql stable security definer set search_path = public as $$
  select q, count(*)::int from public.quizzes z, unnest(z.question_ids) q
  where z.school_id = public.my_school() and (public.is_owner() or public.has_module('supervision')) group by q $$;
revoke all on function public.qbank_usage() from public, anon; grant execute on function public.qbank_usage() to authenticated;
