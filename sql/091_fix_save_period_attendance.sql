-- 087: إصلاح حفظ حضور الحصة (record "c" has no field "school_id")
create or replace function public.save_period_attendance(p_class uuid, p_day date, p_period integer, p_rows jsonb)
 returns integer language plpgsql security definer set search_path to 'public' as $function$
declare c record; o record; n int := 0; r jsonb;
begin
  -- جدول الفصول لا يحتوي school_id؛ تؤخذ المدرسة من القسم
  select cl.id, cl.section_id, s.school_id into c from public.classes cl join public.sections s on s.id = cl.section_id where cl.id = p_class;
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
