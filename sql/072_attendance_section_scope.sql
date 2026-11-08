-- 072: تقييد صلاحية «الحضور والسلوك — مشرف دور» بأقسام الموظف
-- من مُنح الحضور وأُضيف لأقسام: يرى ويرصد في تلك الأقسام فقط.
-- من مُنح الحضور ولم يُضف لأي قسم: يبقى على كل المدرسة كما كان. المالك: كل المدرسة.
create or replace function public.att_in_section(p_section uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_owner() or (
    exists (select 1 from public.module_grants g where g.staff_id = public.me() and g.module = 'attendance')
    and (not exists (select 1 from public.memberships m where m.staff_id = public.me())
         or exists (select 1 from public.memberships m where m.staff_id = public.me() and m.section_id = p_section)))
$$;
create or replace function public.att_in_class(p_class uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.att_in_section((select c.section_id from public.classes c where c.id = p_class))
$$;
create or replace function public.att_in_student(p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.att_in_section((select s.section_id from public.students s where s.id = p_student))
$$;
grant execute on function public.att_in_section(uuid) to authenticated;
grant execute on function public.att_in_class(uuid) to authenticated;
grant execute on function public.att_in_student(uuid) to authenticated;

-- رصد حضور الحصة
create or replace function public.save_period_attendance(p_class uuid, p_day date, p_period integer, p_rows jsonb)
 returns integer language plpgsql security definer set search_path to 'public' as $function$
declare c record; o record; n int := 0; r jsonb;
begin
  select * into c from public.classes where id = p_class;
  if c.id is null then raise exception 'class not found'; end if;
  select * into o from public.period_owner(p_class, p_day, p_period);
  if not (public.att_in_section(c.section_id) or (o.teacher_id is not null and o.teacher_id = public.me())) then raise exception 'no permission'; end if;
  if p_day > (now() at time zone 'Asia/Riyadh')::date + 1 then raise exception 'future day'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    if not exists (select 1 from public.students s where s.id = (r->>'s')::uuid and s.class_id = p_class) then continue; end if;
    insert into public.period_attendance(school_id, section_id, class_id, student_id, day, period, status, minutes, note, subject_id, teacher_id, by_staff, updated_at)
    values (c.school_id, c.section_id, p_class, (r->>'s')::uuid, p_day, p_period, coalesce(r->>'st','present'), nullif(r->>'m','')::int, coalesce(r->>'n',''), o.subject_id, o.teacher_id, public.me(), now())
    on conflict (student_id, day, period) do update set status = excluded.status, minutes = excluded.minutes, note = excluded.note, subject_id = excluded.subject_id, teacher_id = excluded.teacher_id, by_staff = excluded.by_staff, updated_at = now();
    n := n + 1;
  end loop;
  return n;
end $function$;

-- سياسات القراءة والكتابة: يُستبدل has_module('attendance') بالنسخة المقيّدة بالقسم، وتبقى بقية الشروط كما هي
alter policy st_read on public.students using ((school_id = my_school()) AND (att_in_section(section_id) OR has_module('counselor'::text) OR has_module('supervision'::text) OR (EXISTS ( SELECT 1 FROM (plan_entries e JOIN weeks w ON ((w.id = e.week_id))) WHERE ((e.class_id = students.class_id) AND (e.teacher_id = me()) AND (NOT w.archived)) LIMIT 1))));
alter policy att_read on public.attendance using ((school_id = my_school()) AND (att_in_class(class_id) OR has_module('counselor'::text) OR has_module('supervision'::text)));
alter policy att_write on public.attendance using ((school_id = my_school()) AND att_in_class(class_id)) with check ((school_id = my_school()) AND att_in_class(class_id));
alter policy bh_read on public.behaviors using ((school_id = my_school()) AND (att_in_student(student_id) OR has_module('counselor'::text) OR has_module('supervision'::text) OR (by_staff = me())));
alter policy pa_read on public.period_attendance using ((school_id = my_school()) AND (att_in_section(section_id) OR has_module('counselor'::text) OR has_module('supervision'::text) OR (teacher_id = me()) OR (by_staff = me())));
alter policy db_write on public.daily_boards using ((school_id = my_school()) AND (is_owner() OR has_perm(section_id, 'structure'::text) OR att_in_section(section_id))) with check ((school_id = my_school()) AND (is_owner() OR has_perm(section_id, 'structure'::text) OR att_in_section(section_id)));
alter policy sc_read on public.student_codes using ((school_id = my_school()) AND (is_owner() OR att_in_student(student_id) OR has_module('supervision'::text)));
