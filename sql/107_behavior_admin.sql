-- 107 — متابعة السلوك للمالك: تعديل السلوك المرصود بالخطأ (بصلاحيات يحددها المالك + سجل تعديلات)،
--        وطلبات التوضيح من المالك لأي موظف (clar_requests / clar_replies).
-- طُبّق على دفعتين: 107a (السلوك) و107b (طلبات التوضيح).

-- ===================== 107a: تعديل السلوك وسجله =====================
alter table public.behaviors add column if not exists edits jsonb not null default '[]'::jsonb;
alter table public.behaviors add column if not exists edit_reason text;

-- إعدادات التعديل: schools.settings.bhedit
--   rec: always | hours | never  (تعديل الراصد لما رصده)   hours: عدد الساعات المسموحة
--   cnsl: الموجه الطلابي يعدّل   dep: الوكيل يعدّل إحالاته   reason: سبب التعديل إلزامي لغير المالك
-- الافتراضي يطابق ما كان قبل هذا الترحيل (الراصد والموجه والوكيل يعدّلون دائماً).
create or replace function public.bh_edit_cfg(p_school uuid) returns jsonb
language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('rec', 'always', 'hours', 24, 'cnsl', true, 'dep', true, 'reason', false)
         || coalesce((select settings -> 'bhedit' from public.schools where id = p_school), '{}'::jsonb)
$$;

create or replace function public.behaviors_guard() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare ch jsonb := '{}'::jsonb; cfg jsonb; who uuid := public.me(); own boolean := public.is_owner(); ok boolean := false; rsn text;
begin
  -- (كما كان) حقول المعالجة لا يغيّرها إلا الموجه/المالك أو الوكيل لإحالاته
  if not (public.is_counselor() or (coalesce(new.target, 'counselor') = 'deputy' and public.has_module('deputy'))) then
    new.status := old.status; new.reply := old.reply; new.replied_at := old.replied_at; new.case_id := old.case_id; new.counselor_note := old.counselor_note;
  end if;
  rsn := nullif(trim(coalesce(new.edit_reason, '')), ''); new.edit_reason := null;
  new.edits := old.edits;
  if new.student_id is distinct from old.student_id then ch := ch || jsonb_build_object('student_id', old.student_id); end if;
  if new.class_id   is distinct from old.class_id   then ch := ch || jsonb_build_object('class_id', old.class_id); end if;
  if new.day        is distinct from old.day        then ch := ch || jsonb_build_object('day', old.day); end if;
  if new.kind       is distinct from old.kind       then ch := ch || jsonb_build_object('kind', old.kind); end if;
  if new.category   is distinct from old.category   then ch := ch || jsonb_build_object('category', old.category); end if;
  if new.points     is distinct from old.points     then ch := ch || jsonb_build_object('points', old.points); end if;
  if new.note       is distinct from old.note       then ch := ch || jsonb_build_object('note', old.note); end if;
  if new.period     is distinct from old.period     then ch := ch || jsonb_build_object('period', old.period); end if;
  if new.by_staff   is distinct from old.by_staff   then ch := ch || jsonb_build_object('by_staff', old.by_staff); end if;
  if ch = '{}'::jsonb then return new; end if;
  if not own then
    if new.by_staff is distinct from old.by_staff then raise exception 'تغيير الراصد متاح للمالك فقط'; end if;
    cfg := public.bh_edit_cfg(old.school_id);
    if old.by_staff = who then
      ok := case coalesce(cfg ->> 'rec', 'always')
              when 'always' then true
              when 'hours' then old.created_at > now() - make_interval(hours => greatest(1, coalesce((cfg ->> 'hours')::int, 24)))
              else false end;
    end if;
    if not ok and coalesce((cfg ->> 'cnsl')::boolean, true) and public.is_counselor() then ok := true; end if;
    if not ok and coalesce((cfg ->> 'dep')::boolean, true) and coalesce(old.target, 'counselor') = 'deputy' and public.has_module('deputy') then ok := true; end if;
    if not ok then raise exception 'تعديل هذا السلوك غير متاح لحسابك — يعدّله المالك'; end if;
    if coalesce((cfg ->> 'reason')::boolean, false) and rsn is null then raise exception 'اكتب سبب التعديل'; end if;
  end if;
  new.edits := coalesce(old.edits, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('at', now(), 'by', who, 'old', ch, 'reason', rsn));
  return new;
end $$;

-- ===================== 107b: طلبات التوضيح =====================
create table if not exists public.clar_requests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  from_staff uuid not null references public.staff(id) on delete cascade,
  to_staff uuid not null references public.staff(id) on delete cascade,
  about text not null default 'general' check (about in ('general', 'behavior', 'case', 'student')),
  behavior_id uuid references public.behaviors(id) on delete set null,
  case_id uuid references public.counsel_cases(id) on delete set null,
  student_id uuid references public.students(id) on delete set null,
  title text not null,
  body text not null default '',
  due_date date,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists clar_requests_to on public.clar_requests (to_staff, status);
create index if not exists clar_requests_school on public.clar_requests (school_id, created_at desc);

create table if not exists public.clar_replies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.clar_requests(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  from_staff uuid not null references public.staff(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists clar_replies_req on public.clar_replies (request_id, created_at);

alter table public.clar_requests enable row level security;
alter table public.clar_replies enable row level security;

-- من يرسل طلبات التوضيح: المالك، ومن يمنحه المالك وحدة «clarify»
create or replace function public.clar_ok() returns boolean
language sql stable security definer set search_path to 'public' as $$
  select public.is_owner() or exists (select 1 from public.module_grants g where g.staff_id = public.me() and g.module = 'clarify')
$$;
create or replace function public.clar_can(p_req uuid) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.clar_requests r where r.id = p_req and r.school_id = public.my_school()
                 and (r.from_staff = public.me() or r.to_staff = public.me() or public.is_owner()))
$$;

drop policy if exists cr_read on public.clar_requests;
create policy cr_read on public.clar_requests for select using (school_id = public.my_school() and (from_staff = public.me() or to_staff = public.me() or public.is_owner()));
drop policy if exists cr_ins on public.clar_requests;
create policy cr_ins on public.clar_requests for insert with check (school_id = public.my_school() and from_staff = public.me() and public.clar_ok()
  and exists (select 1 from public.staff s where s.id = to_staff and s.school_id = public.my_school() and s.active));
drop policy if exists cr_upd on public.clar_requests;
create policy cr_upd on public.clar_requests for update using (school_id = public.my_school() and (from_staff = public.me() or to_staff = public.me() or public.is_owner()));
drop policy if exists cr_del on public.clar_requests;
create policy cr_del on public.clar_requests for delete using (school_id = public.my_school() and (from_staff = public.me() or public.is_owner()));

drop policy if exists rp_read on public.clar_replies;
create policy rp_read on public.clar_replies for select using (school_id = public.my_school() and public.clar_can(request_id));
drop policy if exists rp_ins on public.clar_replies;
create policy rp_ins on public.clar_replies for insert with check (school_id = public.my_school() and from_staff = public.me() and public.clar_can(request_id));

-- المستلم لا يغيّر إلا «وقت الاطلاع»؛ والحالة تتغير تلقائياً مع الردود
create or replace function public.clar_guard() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if coalesce(current_setting('dwp.clar', true), '') = '1' then return new; end if;
  if not (public.is_owner() or old.from_staff = public.me()) then
    new := old; new.read_at := coalesce(old.read_at, now());
  end if;
  new.id := old.id; new.school_id := old.school_id; new.from_staff := old.from_staff;
  return new;
end $$;
drop trigger if exists clar_guard on public.clar_requests;
create trigger clar_guard before update on public.clar_requests for each row execute function public.clar_guard();

create or replace function public.clar_after_req() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  perform public.notif_push(new.school_id, new.to_staff, 'system', 'طلب توضيح: ' || new.title,
    coalesce((select full_name from public.staff where id = new.from_staff), '') || E'\n' || left(coalesce(new.body, ''), 500)
    || case when new.due_date is not null then E'\nالمطلوب الرد قبل: ' || new.due_date else '' end, '#/clarify', new.from_staff);
  return new;
end $$;
drop trigger if exists clar_after_req on public.clar_requests;
create trigger clar_after_req after insert on public.clar_requests for each row execute function public.clar_after_req();

create or replace function public.clar_after_reply() returns trigger
language plpgsql security definer set search_path to 'public' as $$
declare r public.clar_requests; other uuid;
begin
  select * into r from public.clar_requests where id = new.request_id;
  if not found then return new; end if;
  perform set_config('dwp.clar', '1', true);
  update public.clar_requests set status = case when new.from_staff = r.to_staff then 'answered' else 'open' end,
    read_at = case when new.from_staff = r.to_staff then coalesce(read_at, now()) else read_at end, updated_at = now() where id = r.id;
  perform set_config('dwp.clar', '', true);
  other := case when new.from_staff = r.to_staff then r.from_staff else r.to_staff end;
  perform public.notif_push(r.school_id, other, 'system',
    case when new.from_staff = r.to_staff then 'ردّ على طلب التوضيح: ' else 'متابعة على طلب التوضيح: ' end || r.title,
    coalesce((select full_name from public.staff where id = new.from_staff), '') || E'\n' || left(new.body, 500), '#/clarify', new.from_staff);
  return new;
end $$;
drop trigger if exists clar_after_reply on public.clar_replies;
create trigger clar_after_reply after insert on public.clar_replies for each row execute function public.clar_after_reply();

do $$ begin
  begin alter publication supabase_realtime add table public.clar_requests; exception when others then null; end;
  begin alter publication supabase_realtime add table public.clar_replies; exception when others then null; end;
end $$;
