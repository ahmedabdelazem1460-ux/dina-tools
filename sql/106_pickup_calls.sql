-- 106: النداء الآلي للاستئذان (طُبّق على دفعات 106a–106c)
-- المراحل الموثقة في trail: requested ← approved/rejected ← coming (في الطريق) ← called (وصل قرب المدرسة/نداء يدوي) ← released (خرج من الفصل) ← done (سُلّم) | cancelled
-- الإعدادات schools.settings.pickup (pickup_cfg): mode off|all|some + phones[]، approve، auto، radius، lat/lng (افتراضياً موقع الموارد البشرية)، stages، staff{approve[],gate[]}، from/to، voice، token (شاشة الفصل).

create table if not exists public.pickup_calls (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  account_id uuid references public.parent_accounts(id) on delete set null,
  day date not null default ((now() at time zone 'Asia/Riyadh')::date),
  reason text, note text, person text, due_at timestamptz,
  status text not null default 'requested' check (status in ('requested','approved','rejected','coming','called','released','done','cancelled')),
  dist_m int, arrived_at timestamptz, called_at timestamptz, released_at timestamptz, done_at timestamptz,
  trail jsonb not null default '[]', created_by_staff uuid, created_at timestamptz not null default now());
create index if not exists pickup_calls_day on public.pickup_calls (school_id, day, status);
alter table public.pickup_calls enable row level security;
revoke all on public.pickup_calls from anon;
revoke insert, update, delete, truncate on public.pickup_calls from authenticated;

create or replace function public.pickup_cfg(p_school uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('mode', 'off', 'phones', '[]'::jsonb, 'approve', true, 'auto', true, 'radius', 300,
      'lat', (s.settings->'hr'->>'lat')::float8, 'lng', (s.settings->'hr'->>'lng')::float8,
      'stages', jsonb_build_object('coming', true, 'release', true, 'handover', true),
      'staff', jsonb_build_object('approve', '[]'::jsonb, 'gate', '[]'::jsonb), 'from', '06:30', 'to', '14:00', 'voice', true)
    || coalesce(s.settings->'pickup', '{}'::jsonb)
  from public.schools s where s.id = p_school
$$;

create or replace function public.pickup_staff() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or public.has_module('attendance') or public.has_module('deputy') or public.has_module('counselor')
    or exists (select 1 from public.schools s, jsonb_array_elements_text(coalesce(s.settings->'pickup'->'staff'->'approve', '[]') || coalesce(s.settings->'pickup'->'staff'->'gate', '[]')) x
      where s.id = public.my_school() and x = public.me()::text)
$$;
create policy pk_read on public.pickup_calls for select using (school_id = public.my_school() and public.pickup_staff());

create or replace function public.pickup_allowed(a public.parent_accounts) returns boolean language sql stable security definer set search_path = public as $$
  select case c->>'mode' when 'all' then true when 'some' then (c->'phones') ? a.phone else false end from (select public.pickup_cfg(a.school_id) c) x
$$;

create or replace function public.pickup_step(p_id uuid, p_status text, p_by uuid, p_byname text, p_note text default null) returns public.pickup_calls language plpgsql security definer set search_path = public as $$
declare r public.pickup_calls; c jsonb; nm text; cl text; s record; ids text[]; t text;
begin
  update public.pickup_calls set status = p_status,
    called_at = case when p_status = 'called' then coalesce(called_at, now()) else called_at end,
    released_at = case when p_status = 'released' then now() else released_at end,
    done_at = case when p_status = 'done' then now() else done_at end,
    trail = trail || jsonb_build_array(jsonb_build_object('st', p_status, 'at', now(), 'by', p_by, 'name', p_byname, 'note', nullif(btrim(coalesce(p_note, '')), '')))
    where id = p_id returning * into r;
  c := public.pickup_cfg(r.school_id);
  select st.full_name, cl2.name into nm, cl from public.students st left join public.classes cl2 on cl2.id = st.class_id where st.id = r.student_id;
  ids := case p_status
    when 'requested' then array(select jsonb_array_elements_text(c->'staff'->'approve'))
    when 'called' then array(select jsonb_array_elements_text(c->'staff'->'gate')) || array(select jsonb_array_elements_text(c->'staff'->'approve'))
    when 'released' then array(select jsonb_array_elements_text(c->'staff'->'gate'))
    else '{}'::text[] end;
  if p_status = 'requested' and cardinality(ids) = 0 then ids := array(select id::text from public.staff where school_id = r.school_id and is_owner and active); end if;
  t := case p_status when 'requested' then 'طلب استئذان: ' when 'called' then '📣 نداء: ولي الأمر وصل — ' when 'released' then 'خرج من الفصل: ' else null end;
  if t is not null then
    for s in select distinct x::uuid id from unnest(ids) x loop
      perform public.notif_push(r.school_id, s.id, 'pickup', t || coalesce(nm, ''), coalesce(cl, '') || coalesce(' · ' || r.reason, '') || coalesce(' · المستلم: ' || r.person, ''), '#/pcall', p_by);
    end loop;
  end if;
  return r;
end $$;

create or replace function public.fam_pickup_list(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token); c jsonb;
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  if not public.pickup_allowed(a) then return jsonb_build_object('error', 'OFF'); end if;
  c := public.pickup_cfg(a.school_id);
  return jsonb_build_object('cfg', jsonb_build_object('approve', c->'approve', 'auto', c->'auto', 'radius', c->'radius', 'lat', c->'lat', 'lng', c->'lng', 'stages', c->'stages', 'from', c->'from', 'to', c->'to', 'reasons', c->'reasons'),
    'calls', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'student', p.student_id, 'name', s.full_name, 'class', (select name from public.classes where id = s.class_id), 'day', p.day, 'reason', p.reason, 'person', p.person,
        'due', p.due_at, 'status', p.status, 'dist', p.dist_m, 'trail', p.trail, 'at', p.created_at) order by p.created_at desc)
      from public.pickup_calls p join public.students s on s.id = p.student_id where p.account_id = a.id and p.day >= (now() at time zone 'Asia/Riyadh')::date - 30), '[]'));
end $$;

create or replace function public.fam_pickup_req(p_token text, p_student uuid, p_reason text, p_person text, p_due timestamptz default null, p_note text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token); c jsonb; r public.pickup_calls; t time := (now() at time zone 'Asia/Riyadh')::time;
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  if not public.pickup_allowed(a) then return jsonb_build_object('error', 'OFF'); end if;
  if not public.fam_kid(a, p_student) then return jsonb_build_object('error', 'NOT_CHILD'); end if;
  c := public.pickup_cfg(a.school_id);
  if t < coalesce(nullif(c->>'from', ''), '00:00')::time or t > coalesce(nullif(c->>'to', ''), '23:59')::time then return jsonb_build_object('error', 'HOURS', 'from', c->>'from', 'to', c->>'to'); end if;
  if exists (select 1 from public.pickup_calls where student_id = p_student and day = (now() at time zone 'Asia/Riyadh')::date and status in ('requested','approved','coming','called','released')) then return jsonb_build_object('error', 'ACTIVE'); end if;
  if length(btrim(coalesce(p_person, ''))) < 2 then return jsonb_build_object('error', 'PERSON'); end if;
  insert into public.pickup_calls(school_id, student_id, account_id, reason, person, due_at, note, status)
    values (a.school_id, p_student, a.id, left(btrim(coalesce(p_reason, '')), 200), left(btrim(p_person), 120), p_due, left(p_note, 500), 'requested') returning * into r;
  r := public.pickup_step(r.id, 'requested', null, 'ولي الأمر', null);
  if not coalesce((c->>'approve')::boolean, true) then r := public.pickup_step(r.id, 'approved', null, 'النظام', 'اعتماد تلقائي'); end if;
  return jsonb_build_object('id', r.id, 'status', r.status);
end $$;

create or replace function public.fam_pickup_arrive(p_token text, p_id uuid, p_lat float8, p_lng float8, p_acc float8 default null, p_manual boolean default false) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token); c jsonb; r public.pickup_calls; d int; rad int; near boolean;
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  select * into r from public.pickup_calls where id = p_id and account_id = a.id;
  if r.id is null then return jsonb_build_object('error', 'NOT_FOUND'); end if;
  c := public.pickup_cfg(a.school_id); rad := coalesce((c->>'radius')::int, 300);
  if c->>'lat' is null or c->>'lng' is null then return jsonb_build_object('error', 'NO_SITE'); end if;
  if p_lat is null or p_lng is null then return jsonb_build_object('error', 'NO_GPS'); end if;
  d := round(2 * 6371000 * asin(sqrt(power(sin(radians(p_lat - (c->>'lat')::float8) / 2), 2) + cos(radians((c->>'lat')::float8)) * cos(radians(p_lat)) * power(sin(radians(p_lng - (c->>'lng')::float8) / 2), 2))));
  near := d <= rad or (d - least(coalesce(p_acc, 0), 150)) <= rad;
  update public.pickup_calls set dist_m = d where id = r.id;
  if r.status not in ('approved','coming') then return jsonb_build_object('dist', d, 'near', near, 'status', r.status); end if;
  if near and (coalesce((c->>'auto')::boolean, true) or p_manual) then
    update public.pickup_calls set arrived_at = now() where id = r.id;
    r := public.pickup_step(r.id, 'called', null, 'ولي الأمر', 'وصل على بُعد ' || d || ' م');
  elsif r.status = 'approved' and coalesce((c->'stages'->>'coming')::boolean, true) then
    r := public.pickup_step(r.id, 'coming', null, 'ولي الأمر', 'في الطريق — ' || d || ' م');
  end if;
  return jsonb_build_object('dist', d, 'near', near, 'status', r.status);
end $$;

create or replace function public.fam_pickup_cancel(p_token text, p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token); r public.pickup_calls;
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  select * into r from public.pickup_calls where id = p_id and account_id = a.id and status in ('requested','approved','coming');
  if r.id is null then return jsonb_build_object('error', 'NOT_FOUND'); end if;
  r := public.pickup_step(r.id, 'cancelled', null, 'ولي الأمر', null);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.pickup_list(p_from date default null, p_to date default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare d0 date := (now() at time zone 'Asia/Riyadh')::date;
begin
  if not public.pickup_staff() then raise exception 'no permission'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'student', s.full_name, 'student_id', s.id, 'class', cl.name, 'class_id', cl.id, 'section_id', cl.section_id, 'day', p.day,
      'reason', p.reason, 'note', p.note, 'person', p.person, 'due', p.due_at, 'status', p.status, 'dist', p.dist_m, 'trail', p.trail, 'at', p.created_at,
      'called_at', p.called_at, 'released_at', p.released_at, 'done_at', p.done_at,
      'parent', coalesce(a.name, s.guardian_name), 'phone', case when a.phone is not null then '0' || right(a.phone, 9) else s.guardian_phone end) order by p.created_at desc)
    from public.pickup_calls p join public.students s on s.id = p.student_id left join public.classes cl on cl.id = s.class_id left join public.parent_accounts a on a.id = p.account_id
    where p.school_id = public.my_school() and p.day between coalesce(p_from, d0) and coalesce(p_to, d0)), '[]');
end $$;

create or replace function public.pickup_act(p_id uuid, p_act text, p_note text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.pickup_calls; st text; nm text := (select full_name from public.staff where id = public.me());
begin
  if not public.pickup_staff() then raise exception 'no permission'; end if;
  select * into r from public.pickup_calls where id = p_id and school_id = public.my_school();
  if r.id is null then raise exception 'not found'; end if;
  st := case p_act when 'approve' then 'approved' when 'reject' then 'rejected' when 'call' then 'called' when 'release' then 'released' when 'done' then 'done' when 'cancel' then 'cancelled' end;
  if st is null then raise exception 'bad act'; end if;
  if r.status in ('done','rejected','cancelled') then return jsonb_build_object('error', 'CLOSED'); end if;
  if st = 'approved' and r.status <> 'requested' then return jsonb_build_object('error', 'STATE'); end if;
  r := public.pickup_step(r.id, st, public.me(), nm, p_note);
  return jsonb_build_object('ok', true, 'status', r.status);
end $$;

create or replace function public.pickup_new(p_student uuid, p_reason text, p_person text, p_call boolean default false) returns jsonb language plpgsql security definer set search_path = public as $$
declare r public.pickup_calls; nm text := (select full_name from public.staff where id = public.me()); sch uuid := public.my_school();
begin
  if not public.pickup_staff() then raise exception 'no permission'; end if;
  if not exists (select 1 from public.students where id = p_student and school_id = sch and active) then raise exception 'not found'; end if;
  insert into public.pickup_calls(school_id, student_id, reason, person, status, created_by_staff) values (sch, p_student, left(p_reason, 200), left(p_person, 120), 'requested', public.me()) returning * into r;
  update public.pickup_calls set trail = jsonb_build_array(jsonb_build_object('st', 'requested', 'at', now(), 'by', public.me(), 'name', nm, 'note', 'سُجّل من المدرسة')) where id = r.id;
  r := public.pickup_step(r.id, 'approved', public.me(), nm, null);
  if p_call then r := public.pickup_step(r.id, 'called', public.me(), nm, null); end if;
  return jsonb_build_object('id', r.id, 'status', r.status);
end $$;

create or replace function public.pickup_screen(p_token text, p_class uuid default null, p_section uuid default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare sch uuid; c jsonb;
begin
  select id into sch from public.schools where length(coalesce(settings->'pickup'->>'token', '')) >= 16 and settings->'pickup'->>'token' = p_token;
  if sch is null then return jsonb_build_object('error', 'BAD_TOKEN'); end if;
  c := public.pickup_cfg(sch);
  if c->>'mode' = 'off' then return jsonb_build_object('error', 'OFF'); end if;
  return jsonb_build_object('school', (select name from public.schools where id = sch), 'voice', c->'voice', 'now', now(),
    'classes', coalesce((select jsonb_agg(jsonb_build_object('id', cl.id, 'name', cl.name, 'section', cl.section_id) order by cl.sort, cl.name) from public.classes cl join public.sections se on se.id = cl.section_id where se.school_id = sch and coalesce(cl.active, true)), '[]'),
    'calls', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', s.full_name, 'class', cl.name, 'class_id', cl.id, 'status', p.status, 'person', p.person, 'at', coalesce(p.called_at, p.created_at), 'released_at', p.released_at) order by coalesce(p.called_at, p.created_at))
      from public.pickup_calls p join public.students s on s.id = p.student_id left join public.classes cl on cl.id = s.class_id
      where p.school_id = sch and p.day = (now() at time zone 'Asia/Riyadh')::date and (p.status in ('called','released') or (p.status = 'done' and p.done_at > now() - interval '3 minutes'))
        and (p_class is null or s.class_id = p_class) and (p_section is null or cl.section_id = p_section)), '[]'));
end $$;

create or replace function public.pickup_screen_release(p_token text, p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare sch uuid; r public.pickup_calls;
begin
  select id into sch from public.schools where length(coalesce(settings->'pickup'->>'token', '')) >= 16 and settings->'pickup'->>'token' = p_token;
  if sch is null then return jsonb_build_object('error', 'BAD_TOKEN'); end if;
  select * into r from public.pickup_calls where id = p_id and school_id = sch and status = 'called';
  if r.id is null then return jsonb_build_object('error', 'STATE'); end if;
  r := public.pickup_step(r.id, 'released', null, 'شاشة الفصل', null);
  return jsonb_build_object('ok', true);
end $$;

-- fam_home أعيد تعريفه ليضيف 'pickup', public.pickup_allowed(a) (والنص الكامل كما في 105).

grant execute on function public.fam_pickup_list(text) to anon, authenticated;
grant execute on function public.fam_pickup_req(text, uuid, text, text, timestamptz, text) to anon, authenticated;
grant execute on function public.fam_pickup_arrive(text, uuid, float8, float8, float8, boolean) to anon, authenticated;
grant execute on function public.fam_pickup_cancel(text, uuid) to anon, authenticated;
revoke all on function public.pickup_list(date, date) from public, anon;
revoke all on function public.pickup_act(uuid, text, text) from public, anon;
revoke all on function public.pickup_new(uuid, text, text, boolean) from public, anon;
grant execute on function public.pickup_list(date, date) to authenticated;
grant execute on function public.pickup_act(uuid, text, text) to authenticated;
grant execute on function public.pickup_new(uuid, text, text, boolean) to authenticated;
grant execute on function public.pickup_screen(text, uuid, uuid) to anon, authenticated;
grant execute on function public.pickup_screen_release(text, uuid) to anon, authenticated;

revoke all on function public.pickup_cfg(uuid) from public, anon;
revoke all on function public.pickup_allowed(public.parent_accounts) from public, anon, authenticated;
revoke all on function public.pickup_step(uuid, text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.pickup_staff() from public, anon;
grant execute on function public.pickup_cfg(uuid) to authenticated;
grant execute on function public.pickup_staff() to authenticated;

-- 106d/106e: تأكيد ولي الأمر الاستلام (إلزامي افتراضياً: settings.pickup.confirm = true)
-- حالة جديدة handed = «سُلّم» من الموظف بانتظار تأكيد ولي الأمر؛ fam_pickup_confirm(token, id) ينقلها (أو called/released) إلى done.
-- pickup_act('done'): إن كان التأكيد مفعّلاً والطلب من حساب ولي أمر → handed؛ و«done» على handed = إغلاق دون تأكيد يُوثَّق باسم الموظف.
-- pickup_cfg يضيف 'confirm', true؛ fam_pickup_list يعيد confirm وalerts؛ fam_pickup_req يعدّ handed نشطاً؛ pickup_screen يعرض handed/done ٣ دقائق؛ pickup_step يضبط done_at عند handed.
alter table public.pickup_calls drop constraint if exists pickup_calls_status_check;
alter table public.pickup_calls add constraint pickup_calls_status_check check (status in ('requested','approved','rejected','coming','called','released','handed','done','cancelled'));

create or replace function public.fam_pickup_confirm(p_token text, p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token); r public.pickup_calls;
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  select * into r from public.pickup_calls where id = p_id and account_id = a.id and status in ('called','released','handed');
  if r.id is null then return jsonb_build_object('error', 'STATE'); end if;
  r := public.pickup_step(r.id, 'done', null, 'ولي الأمر', 'أكّد استلام ابنه');
  return jsonb_build_object('ok', true, 'status', r.status);
end $$;
grant execute on function public.fam_pickup_confirm(text, uuid) to anon, authenticated;
-- (نصوص pickup_cfg وpickup_step وpickup_act وfam_pickup_list وfam_pickup_req وpickup_screen المحدّثة مطابقة لما في القاعدة: pg_get_functiondef)
