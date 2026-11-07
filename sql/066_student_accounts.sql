-- 066: حسابات الطلاب برمز دخول — بوابة الطالب me.html (خطة فصله، اختباراته وواجباته، نتائجه، المصادر المتاحة)
create table if not exists public.student_codes (
  code text primary key,
  student_id uuid not null unique references public.students(id) on delete cascade,
  school_id uuid not null, active boolean not null default true,
  created_by uuid default public.me(), created_at timestamptz not null default now(), last_login timestamptz, logins int not null default 0);
alter table public.student_codes enable row level security;
drop policy if exists sc_read on public.student_codes;
create policy sc_read on public.student_codes for select using (school_id = public.my_school() and (public.is_owner() or public.has_module('attendance') or public.has_module('supervision')));

create or replace function public.student_codes_manager(p_class uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or public.has_module('attendance') or public.has_module('supervision')
    or exists (select 1 from public.classes c where c.id = p_class and public.has_perm(c.section_id, 'structure'))
$$;

-- إنشاء رموز لطلاب فصل (للناقص فقط، أو إعادة توليد لطالب محدد)
create or replace function public.student_codes_gen(p_class uuid, p_student uuid default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare s record; c text; n int := 0; alpha text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if not public.student_codes_manager(p_class) then raise exception 'no permission'; end if;
  for s in select st.* from public.students st where st.class_id = p_class and st.active and (p_student is null or st.id = p_student) loop
    if p_student is null and exists (select 1 from public.student_codes where student_id = s.id) then continue; end if;
    loop
      c := ''; for i in 1..8 loop c := c || substr(alpha, 1 + floor(random() * length(alpha))::int, 1); end loop;
      c := substr(c, 1, 4) || '-' || substr(c, 5, 4);
      exit when not exists (select 1 from public.student_codes where code = c);
    end loop;
    delete from public.student_codes where student_id = s.id;
    insert into public.student_codes(code, student_id, school_id) values (c, s.id, s.school_id); n := n + 1;
  end loop;
  return jsonb_build_object('created', n);
end $$;

create or replace function public.student_codes_list(p_class uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.student_codes_manager(p_class) then raise exception 'no permission'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', st.id, 'name', st.full_name, 'no', st.student_no, 'phone', st.guardian_phone, 'code', sc.code, 'active', sc.active, 'last', sc.last_login, 'logins', coalesce(sc.logins, 0)) order by st.full_name)
    from public.students st left join public.student_codes sc on sc.student_id = st.id where st.class_id = p_class and st.active), '[]');
end $$;

create or replace function public.student_code_toggle(p_student uuid, p_active boolean) returns void language plpgsql security definer set search_path = public as $$
declare cl uuid;
begin
  select class_id into cl from public.students where id = p_student;
  if not public.student_codes_manager(cl) then raise exception 'no permission'; end if;
  update public.student_codes set active = p_active where student_id = p_student;
end $$;

-- بوابة الطالب (دون حساب Supabase): كل شيء يُقرأ عبر الرمز
create or replace function public.student_portal(p_code text, p_week uuid default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare k record; st record; cl record; w record; d0 date := (now() at time zone 'Asia/Riyadh')::date;
begin
  select * into k from public.student_codes where code = upper(btrim(p_code)) and active;
  if k.code is null then raise exception 'BAD_CODE'; end if;
  select * into st from public.students where id = k.student_id and active;
  if st.id is null then raise exception 'INACTIVE'; end if;
  select * into cl from public.classes where id = st.class_id;
  if p_week is not null then select * into w from public.weeks where id = p_week and section_id = cl.section_id;
  else select * into w from public.weeks where section_id = cl.section_id and not coalesce(archived, false) and d0 between start_date - 2 and start_date + 6 order by start_date limit 1;
    if w.id is null then select * into w from public.weeks where section_id = cl.section_id and not coalesce(archived, false) and start_date <= d0 order by start_date desc limit 1; end if;
  end if;
  update public.student_codes set last_login = now(), logins = logins + 1 where code = k.code;
  return jsonb_build_object(
    'student', jsonb_build_object('name', st.full_name, 'no', st.student_no, 'class', cl.name, 'class_id', cl.id, 'grade', cl.grade_word, 'stage', cl.stage),
    'school', (select name from public.schools where id = st.school_id),
    'section', (select name from public.sections where id = cl.section_id),
    'week', case when w.id is null then null else jsonb_build_object('id', w.id, 'word', w.word, 'start', w.start_date) end,
    'weeks', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'word', x.word, 'start', x.start_date) order by x.start_date) from public.weeks x where x.section_id = cl.section_id and not coalesce(x.archived, false) and x.status in ('published','open') and x.start_date <= d0 + 7), '[]'),
    'plan', case when w.id is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('day', e.day, 'period', e.period, 'subject', (select name from public.subjects where id = e.subject_id), 'topic', e.topic, 'homework', e.homework, 'perf', e.perf_task) order by e.day, e.period)
      from public.plan_entries e where e.week_id = w.id and e.class_id = cl.id and e.subject_id is not null and (w.status = 'published' or e.status = 'approved') and (coalesce(e.topic,'') <> '' or coalesce(e.homework,'') <> '')), '[]') end,
    'quizzes', coalesce((select jsonb_agg(jsonb_build_object('title', z.title, 'kind', z.kind, 'code', z.code, 'subject', (select name from public.subjects where id = z.subject_id), 'close', z.settings->>'close_at',
        'done', (select count(*) from public.quiz_attempts a where a.quiz_id = z.id and a.class_id = cl.id and (public.norm_ans(a.student_name) = public.norm_ans(st.full_name) or (st.student_no is not null and a.student_no = st.student_no))))
      order by z.created_at desc) from public.quizzes z where z.status = 'published' and cl.id = any(z.class_ids) and (z.settings->>'close_at' is null or (z.settings->>'close_at')::timestamptz > now())), '[]'),
    'results', coalesce((select jsonb_agg(jsonb_build_object('title', z.title, 'kind', z.kind, 'score', a.score, 'max', a.max_score, 'pending', a.pending_manual, 'at', a.submitted_at) order by a.submitted_at desc)
      from public.quiz_attempts a join public.quizzes z on z.id = a.quiz_id where a.class_id = cl.id and (public.norm_ans(a.student_name) = public.norm_ans(st.full_name) or (st.student_no is not null and a.student_no = st.student_no))), '[]'),
    'resources', coalesce((select jsonb_agg(jsonb_build_object('title', r.title, 'url', r.url, 'kind', r.kind, 'subject', (select name from public.subjects where id = r.subject_id), 'note', r.note) order by r.created_at desc)
      from public.resources r where r.school_id = st.school_id and r.visible_to_parents and (r.class_ids is null or cardinality(r.class_ids) = 0 or cl.id = any(r.class_ids)) and (r.section_id is null or r.section_id = cl.section_id)), '[]'));
end $$;
grant execute on function public.student_portal(text, uuid) to anon, authenticated;
grant execute on function public.student_codes_gen(uuid, uuid) to authenticated;
grant execute on function public.student_codes_list(uuid) to authenticated;
grant execute on function public.student_code_toggle(uuid, boolean) to authenticated;
select 'ok';
