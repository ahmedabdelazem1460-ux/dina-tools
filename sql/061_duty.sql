-- 061: جداول الإشراف والمناوبة المرتبطة بالجدول الزمني + تسجيل التواجد اللحظي
alter table public.sections add column if not exists duty jsonb not null default '{}'::jsonb;

create table if not exists public.duty_log (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null, section_id uuid not null, day date not null,
  slot text not null, place text not null default '', staff_id uuid not null,
  status text not null default 'present' check (status in ('present','absent','late','swap')),
  sub_staff uuid, note text not null default '',
  by_staff uuid default public.me(), at timestamptz not null default now(),
  unique (section_id, day, slot, place, staff_id));
create index if not exists duty_log_day on public.duty_log(section_id, day);
alter table public.duty_log enable row level security;
drop policy if exists duty_read on public.duty_log;
create policy duty_read on public.duty_log for select using (school_id = public.my_school());

create or replace function public.duty_manager(p_section uuid) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or public.has_perm(p_section, 'timetable_edit') or public.has_module('supervision') or public.has_module('attendance')
$$;

-- حفظ جدول الإشراف والمناوبة للقسم (المالك أو صلاحية الجداول أو الإشراف)
create or replace function public.save_duty(p_section uuid, p_duty jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select * into s from public.sections where id = p_section;
  if s.id is null or s.school_id <> public.my_school() then raise exception 'section not found'; end if;
  if not public.duty_manager(p_section) then raise exception 'no permission'; end if;
  update public.sections set duty = coalesce(p_duty, '{}'::jsonb) where id = p_section;
  return coalesce(p_duty, '{}'::jsonb);
end $$;

-- تسجيل التواجد: المناوب لنفسه، أو المسؤول لأي مناوب (غياب/تأخر/تبديل)
create or replace function public.duty_check(p_section uuid, p_day date, p_slot text, p_place text, p_staff uuid, p_status text, p_sub uuid default null, p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare s record; r public.duty_log;
begin
  select * into s from public.sections where id = p_section;
  if s.id is null or s.school_id <> public.my_school() then raise exception 'section not found'; end if;
  if not (p_staff = public.me() or public.duty_manager(p_section)) then raise exception 'no permission'; end if;
  if p_day > (now() at time zone 'Asia/Riyadh')::date then raise exception 'future day'; end if;
  if p_status = 'clear' then
    delete from public.duty_log where section_id = p_section and day = p_day and slot = p_slot and place = coalesce(p_place,'') and staff_id = p_staff;
    return null;
  end if;
  insert into public.duty_log(school_id, section_id, day, slot, place, staff_id, status, sub_staff, note, by_staff, at)
  values (s.school_id, p_section, p_day, p_slot, coalesce(p_place,''), p_staff, coalesce(p_status,'present'), p_sub, coalesce(p_note,''), public.me(), now())
  on conflict (section_id, day, slot, place, staff_id) do update set status = excluded.status, sub_staff = excluded.sub_staff, note = excluded.note, by_staff = excluded.by_staff, at = now()
  returning * into r;
  return to_jsonb(r);
end $$;
grant execute on function public.save_duty(uuid, jsonb) to authenticated;
grant execute on function public.duty_check(uuid, date, text, text, uuid, text, uuid, text) to authenticated;
grant execute on function public.duty_manager(uuid) to authenticated;
do $$ begin alter publication supabase_realtime add table public.duty_log; exception when others then null; end $$;
do $$ begin if exists (select 1 from pg_proc where proname = 'trash_capture') then
  execute 'drop trigger if exists zz_trash on public.duty_log';
  execute 'create trigger zz_trash after delete on public.duty_log for each row execute function public.trash_capture()';
end if; end $$;
select 'ok';
