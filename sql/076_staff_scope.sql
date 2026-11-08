-- 076: نطاق الإدخال للموظف داخل القسم (مراحل/صفوف/فصول) مطبّق على الحضور في قاعدة البيانات — لا تعديل لأي بيانات
-- memberships.extra: stages[] (مثل «الابتدائية»)، grades[] («المرحلة|الصف» مثل «الابتدائية|الرابع»)، classes[] (معرّفات الفصول)
-- بلا أي اختيار = القسم كاملاً (السلوك السابق كما هو).
create or replace function public.class_stage(c public.classes) returns text language sql immutable as $$
  select coalesce(nullif(btrim(c.stage), ''), case when c.name ~ 'ابتدائي' then 'ابتدائي' when c.name ~ 'متوسط' then 'متوسط' when c.name ~ 'ثانوي' then 'ثانوي' when c.name ~* '^KG' then 'KG' else 'أخرى' end)
$$;
create or replace function public.mem_allows_class(m public.memberships, c public.classes) returns boolean language sql stable as $$
  select m.section_id = c.section_id and (
    coalesce(jsonb_array_length(m.extra->'stages'), 0) + coalesce(jsonb_array_length(m.extra->'grades'), 0) + coalesce(jsonb_array_length(m.extra->'classes'), 0) = 0
    or coalesce(m.extra->'stages', '[]'::jsonb) ? public.class_stage(c)
    or coalesce(m.extra->'grades', '[]'::jsonb) ? (public.class_stage(c) || '|' || coalesce(c.grade_word, ''))
    or coalesce(m.extra->'classes', '[]'::jsonb) ? c.id::text)
$$;
create or replace function public.att_in_class(p_class uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_owner() or (
    exists (select 1 from public.module_grants g where g.staff_id = public.me() and g.module = 'attendance')
    and (not exists (select 1 from public.memberships m where m.staff_id = public.me())
         or exists (select 1 from public.memberships m join public.classes c on c.id = p_class where m.staff_id = public.me() and public.mem_allows_class(m, c))))
$$;
create or replace function public.att_in_student(p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.att_in_class((select s.class_id from public.students s where s.id = p_student))
$$;
-- رصد الحصة: التحقق على مستوى الفصل
create or replace function public.save_period_attendance(p_class uuid, p_day date, p_period integer, p_rows jsonb)
 returns integer language plpgsql security definer set search_path to 'public' as $function$
declare c record; o record; n int := 0; r jsonb;
begin
  select * into c from public.classes where id = p_class;
  if c.id is null then raise exception 'class not found'; end if;
  select * into o from public.period_owner(p_class, p_day, p_period);
  if not (public.att_in_class(p_class) or (o.teacher_id is not null and o.teacher_id = public.me())) then raise exception 'no permission'; end if;
  if p_day > (now() at time zone 'Asia/Riyadh')::date + 1 then raise exception 'future day'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    if not exists (select 1 from public.students s where s.id = (r->>'s')::uuid and s.class_id = p_class) then continue; end if;
    insert into public.period_attendance(school_id, section_id, class_id, student_id, day, period, status, minutes, note, subject_id, teacher_id, by_staff, updated_at, time_at)
    values (c.school_id, c.section_id, p_class, (r->>'s')::uuid, p_day, p_period, coalesce(r->>'st','present'), nullif(r->>'m','')::int, coalesce(r->>'n',''), o.subject_id, o.teacher_id, public.me(), now(), nullif(r->>'t','')::time)
    on conflict (student_id, day, period) do update set status = excluded.status, minutes = excluded.minutes, note = excluded.note, subject_id = excluded.subject_id, teacher_id = excluded.teacher_id, by_staff = excluded.by_staff, updated_at = now(), time_at = coalesce(excluded.time_at, case when excluded.status in ('late','early','excused') then period_attendance.time_at end);
    n := n + 1;
  end loop;
  return n;
end $function$;
-- قراءة الطلاب وحضور الحصص: على مستوى الفصل بدل القسم
alter policy st_read on public.students using ((school_id = my_school()) AND (att_in_class(class_id) OR has_module('counselor'::text) OR has_module('supervision'::text) OR (EXISTS ( SELECT 1 FROM (plan_entries e JOIN weeks w ON ((w.id = e.week_id))) WHERE ((e.class_id = students.class_id) AND (e.teacher_id = me()) AND (NOT w.archived)) LIMIT 1))));
alter policy pa_read on public.period_attendance using ((school_id = my_school()) AND (att_in_class(class_id) OR has_module('counselor'::text) OR has_module('supervision'::text) OR (teacher_id = me()) OR (by_staff = me())));
