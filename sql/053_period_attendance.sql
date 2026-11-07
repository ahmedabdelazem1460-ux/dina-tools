-- 053: حضور الحصص — رصد لكل طالب في كل حصة، من معلم الحصة أو من مُنح صلاحية «الحضور» (مراقبو الأدوار وغيرهم)
create table if not exists public.period_attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null, section_id uuid, class_id uuid not null,
  student_id uuid not null references public.students(id) on delete cascade,
  day date not null, period smallint not null,
  status text not null check (status in ('present','absent','late','excused','early')),
  minutes int, note text not null default '',
  subject_id uuid, teacher_id uuid, by_staff uuid, updated_at timestamptz not null default now(),
  unique (student_id, day, period));
create index if not exists pa_day on public.period_attendance(school_id, day);
create index if not exists pa_cls on public.period_attendance(class_id, day);
alter table public.period_attendance enable row level security;
drop policy if exists pa_read on public.period_attendance;
create policy pa_read on public.period_attendance for select using (school_id = public.my_school() and (public.has_module('attendance') or public.has_module('counselor') or public.has_module('supervision') or teacher_id = public.me() or by_staff = public.me()));
do $$ begin alter publication supabase_realtime add table public.period_attendance; exception when others then null; end $$;

-- معلم الحصة في ذلك اليوم (من الخطة الأسبوعية، وإلا من الجدول المعتمد)
create or replace function public.period_owner(p_class uuid, p_day date, p_period int)
returns table(subject_id uuid, teacher_id uuid) language sql stable security definer set search_path = public as $$
  with c as (select section_id from public.classes where id = p_class),
  e as (select e.subject_id, e.teacher_id from public.plan_entries e join public.weeks w on w.id = e.week_id, c
        where w.section_id = c.section_id and p_day between w.start_date and w.start_date + 6 and e.class_id = p_class
          and e.day = extract(dow from p_day)::int and e.period = p_period limit 1),
  s as (select s.subject_id, s.teacher_id from public.timetable_slots s join public.timetable_versions v on v.id = s.version_id, c
        where v.section_id = c.section_id and v.status = 'approved' and s.class_id = p_class and s.day = extract(dow from p_day)::int and s.period = p_period limit 1)
  select * from e union all select * from s where not exists (select 1 from e) limit 1
$$;

create or replace function public.save_period_attendance(p_class uuid, p_day date, p_period int, p_rows jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare c record; o record; n int := 0; r jsonb;
begin
  select * into c from public.classes where id = p_class;
  if c.id is null then raise exception 'class not found'; end if;
  select * into o from public.period_owner(p_class, p_day, p_period);
  if not (public.has_module('attendance') or (o.teacher_id is not null and o.teacher_id = public.me())) then raise exception 'no permission'; end if;
  if p_day > (now() at time zone 'Asia/Riyadh')::date + 1 then raise exception 'future day'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    if not exists (select 1 from public.students s where s.id = (r->>'s')::uuid and s.class_id = p_class) then continue; end if;
    insert into public.period_attendance(school_id, section_id, class_id, student_id, day, period, status, minutes, note, subject_id, teacher_id, by_staff, updated_at)
    values (c.school_id, c.section_id, p_class, (r->>'s')::uuid, p_day, p_period, coalesce(r->>'st','present'), nullif(r->>'m','')::int, coalesce(r->>'n',''), o.subject_id, o.teacher_id, public.me(), now())
    on conflict (student_id, day, period) do update set status = excluded.status, minutes = excluded.minutes, note = excluded.note, subject_id = excluded.subject_id, teacher_id = excluded.teacher_id, by_staff = excluded.by_staff, updated_at = now();
    n := n + 1;
  end loop;
  return n;
end $$;
grant execute on function public.save_period_attendance(uuid, date, int, jsonb) to authenticated;
grant execute on function public.period_owner(uuid, date, int) to authenticated;
select 'ok';
