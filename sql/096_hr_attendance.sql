-- 096: الموارد البشرية — حضور الموظفين وانصرافهم (موقع جغرافي / رمز QR متغير / يدوي). جدول جديد فقط.
-- الإعدادات في schools.settings.hr: {lat,lng,radius,start,grace,end,days[],gps,qr,secret,auto_absent}
create table if not exists public.staff_att (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  day date not null,
  status text not null default 'present' check (status in ('present','late','absent','excused','leave','early')),
  check_in timestamptz, check_out timestamptz, late_min int not null default 0,
  method text not null default 'manual', lat double precision, lng double precision, dist int,
  note text not null default '', by_staff uuid references public.staff(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (staff_id, day)
);
create index if not exists staff_att_day on public.staff_att(school_id, day);
alter table public.staff_att enable row level security;
create or replace function public.hr_admin() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or public.has_module('hr')
$$;
create policy sa_read on public.staff_att for select using (school_id = public.my_school() and (staff_id = public.me() or public.hr_admin()));
grant select on public.staff_att to authenticated;

create or replace function public.hr_cfg(p_school uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(settings -> 'hr', '{}'::jsonb) from public.schools where id = p_school
$$;
create or replace function public.hr_today() returns date language sql stable as $$ select (now() at time zone 'Asia/Riyadh')::date $$;
create or replace function public.hr_tok(p_school uuid, p_win bigint) returns text language sql stable security definer set search_path = public as $$
  select upper(substr(md5(p_school::text || coalesce(public.hr_cfg(p_school) ->> 'secret', 'dina') || p_win::text), 1, 8))
$$;
revoke all on function public.hr_tok(uuid, bigint) from public, anon, authenticated;

-- الرمز المتغير (كل ٣٠ ثانية) لشاشة الحضور
create or replace function public.hr_token() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare w bigint := floor(extract(epoch from now()) / 30);
begin
  if not public.hr_admin() then raise exception 'لمسؤول الموارد البشرية'; end if;
  return jsonb_build_object('token', public.hr_tok(public.my_school(), w), 'left', 30 - (floor(extract(epoch from now()))::bigint % 30));
end $$;

-- تسجيل حضور/انصراف الموظف لنفسه
create or replace function public.hr_checkin(p_lat double precision, p_lng double precision, p_acc double precision, p_token text, p_out boolean default false) returns public.staff_att
language plpgsql security definer set search_path = public as $$
declare sch uuid := public.my_school(); me uuid := public.me(); c jsonb; d int; w bigint := floor(extract(epoch from now()) / 30);
  tz timestamp := now() at time zone 'Asia/Riyadh'; st time; gr int; lm int; r public.staff_att; meth text := '';
begin
  if me is null then raise exception 'سجّل الدخول أولاً'; end if;
  c := public.hr_cfg(sch);
  if coalesce((c ->> 'enabled')::boolean, false) = false then raise exception 'تسجيل الحضور غير مفعّل في المدرسة'; end if;
  if coalesce((c ->> 'gps')::boolean, true) then
    if p_lat is null or p_lng is null then raise exception 'فعّل خدمة الموقع في جهازك ثم أعد المحاولة'; end if;
    if (c ->> 'lat') is null then raise exception 'لم يُحدَّد موقع المدرسة بعد'; end if;
    d := round(2 * 6371000 * asin(sqrt(power(sin(radians(p_lat - (c->>'lat')::float8) / 2), 2) + cos(radians((c->>'lat')::float8)) * cos(radians(p_lat)) * power(sin(radians(p_lng - (c->>'lng')::float8) / 2), 2))));
    if d > coalesce((c ->> 'radius')::int, 150) + least(coalesce(p_acc, 0), 100) then raise exception 'أنت خارج نطاق المدرسة (المسافة نحو % متر)', d; end if;
    meth := 'gps';
  end if;
  if coalesce((c ->> 'qr')::boolean, false) then
    if upper(coalesce(p_token, '')) not in (public.hr_tok(sch, w), public.hr_tok(sch, w - 1)) then raise exception 'رمز الحضور غير صحيح أو انتهت صلاحيته — امسح الرمز الظاهر على الشاشة'; end if;
    meth := case when meth = '' then 'qr' else meth || '+qr' end;
  end if;
  if meth = '' then meth := 'self'; end if;
  if p_out then
    update public.staff_att set check_out = now(), updated_at = now(),
      status = case when status in ('present','late') and tz::time < coalesce((c ->> 'end')::time, '13:30') - interval '10 minutes' then 'early' else status end
      where staff_id = me and day = tz::date returning * into r;
    if not found then raise exception 'لم يُسجَّل حضورك اليوم'; end if;
    return r;
  end if;
  st := coalesce((c ->> 'start')::time, '07:00'); gr := coalesce((c ->> 'grace')::int, 10);
  lm := greatest(0, floor(extract(epoch from (tz::time - st)) / 60)::int);
  insert into public.staff_att (school_id, staff_id, day, status, check_in, late_min, method, lat, lng, dist, by_staff)
  values (sch, me, tz::date, case when lm > gr then 'late' else 'present' end, now(), case when lm > gr then lm else 0 end, meth, p_lat, p_lng, d, me)
  on conflict (staff_id, day) do update set
    check_in = coalesce(staff_att.check_in, excluded.check_in),
    status = case when staff_att.status = 'absent' then excluded.status else staff_att.status end,
    late_min = case when staff_att.status = 'absent' then excluded.late_min else staff_att.late_min end,
    method = case when staff_att.check_in is null then excluded.method else staff_att.method end,
    lat = coalesce(staff_att.lat, excluded.lat), lng = coalesce(staff_att.lng, excluded.lng), dist = coalesce(staff_att.dist, excluded.dist), updated_at = now()
  returning * into r;
  return r;
end $$;

-- رصد يدوي من المسؤول
create or replace function public.hr_mark(p_staff uuid, p_day date, p_status text, p_note text default '', p_late int default null) returns public.staff_att
language plpgsql security definer set search_path = public as $$
declare sch uuid := public.my_school(); r public.staff_att;
begin
  if not public.hr_admin() then raise exception 'لمسؤول الموارد البشرية'; end if;
  if not exists (select 1 from public.staff where id = p_staff and school_id = sch) then raise exception 'الموظف غير موجود'; end if;
  if p_status = 'clear' then delete from public.staff_att where staff_id = p_staff and day = p_day; return null; end if;
  insert into public.staff_att (school_id, staff_id, day, status, note, method, by_staff, late_min, check_in)
  values (sch, p_staff, p_day, p_status, coalesce(p_note, ''), 'manual', public.me(), coalesce(p_late, 0), case when p_status in ('present','late') then now() end)
  on conflict (staff_id, day) do update set status = excluded.status, note = coalesce(nullif(excluded.note, ''), staff_att.note),
    late_min = coalesce(p_late, case when excluded.status = 'late' then staff_att.late_min else 0 end), by_staff = public.me(), updated_at = now()
  returning * into r;
  return r;
end $$;

-- رصد غياب من لم يسجّل حضوره في يوم عمل
create or replace function public.hr_auto_absent(p_day date) returns int language plpgsql security definer set search_path = public as $$
declare sch uuid := public.my_school(); n int;
begin
  if not public.hr_admin() then raise exception 'لمسؤول الموارد البشرية'; end if;
  insert into public.staff_att (school_id, staff_id, day, status, method, by_staff, note)
  select sch, s.id, p_day, 'absent', 'auto', public.me(), 'لم يسجّل حضوره'
  from public.staff s where s.school_id = sch and s.active and coalesce(s.is_test, false) = false and not s.is_owner
    and not exists (select 1 from public.staff_att a where a.staff_id = s.id and a.day = p_day)
    and not (s.id::text = any (coalesce((select array(select jsonb_array_elements_text(public.hr_cfg(sch) -> 'excl'))), '{}')))
  on conflict (staff_id, day) do nothing;
  get diagnostics n = row_count; return n;
end $$;
grant execute on function public.hr_token(), public.hr_checkin(double precision, double precision, double precision, text, boolean), public.hr_mark(uuid, date, text, text, int), public.hr_auto_absent(date), public.hr_admin() to authenticated;

-- إشعار المالك بالغياب (لتأمين الحصص فوراً) وإشعار الموظف بتسجيل تأخره/غيابه
create or replace function public.trg_att_notif() returns trigger language plpgsql security definer set search_path = public as $$
declare nm text; o uuid;
begin
  begin
  if new.status not in ('absent','late') or (tg_op = 'UPDATE' and new.status is not distinct from old.status) then return new; end if;
  select full_name into nm from public.staff where id = new.staff_id;
  if new.status = 'absent' and new.day = public.hr_today() then
    for o in select id from public.staff where school_id = new.school_id and is_owner and active loop
      perform public.notif_push(new.school_id, o, 'hr', 'غياب: ' || coalesce(nm, ''), 'رُصد غياب ' || coalesce(nm, '') || ' اليوم — افتح «تأمين حصص اليوم» لاعتماد البدلاء.', '#/hr?cover=1', public.me());
    end loop;
  end if;
  perform public.notif_push(new.school_id, new.staff_id, 'hr', case when new.status = 'late' then 'سُجّل تأخرك' else 'سُجّل غيابك' end,
    to_char(new.day, 'YYYY-MM-DD') || case when new.late_min > 0 then ' — ' || new.late_min || ' دقيقة' else '' end, '#/hr', public.me());
  return new;
  exception when others then raise warning 'notif: %', sqlerrm; return new;
  end;
end $$;
drop trigger if exists att_notif on public.staff_att;
create trigger att_notif after insert or update on public.staff_att for each row execute function public.trg_att_notif();
alter publication supabase_realtime add table public.staff_att;
