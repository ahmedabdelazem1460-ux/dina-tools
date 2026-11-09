-- 081: الإرشاد الطلابي — إحالات من المعلمين ومراقبي الأدوار، وحالات وسجل إجراءات للموجه الطلابي.
-- إضافات فقط: أعمدة جديدة في behaviors، وجدولان جديدان. لا مساس بأي بيانات قائمة.
alter table public.behaviors add column if not exists priority text not null default 'normal';
alter table public.behaviors add column if not exists prior_action text not null default '';
alter table public.behaviors add column if not exists reply text not null default '';
alter table public.behaviors add column if not exists replied_at timestamptz;
alter table public.behaviors add column if not exists case_id uuid;
alter table public.behaviors add column if not exists period smallint;

create or replace function public.is_counselor() returns boolean language sql stable security definer set search_path = public as $$
  select public.has_module('counselor')
$$;

create table if not exists public.counsel_cases (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  title text not null default '',
  status text not null default 'study' check (status in ('study','follow','closed')),
  priority text not null default 'normal',
  counselor_id uuid default public.me() references public.staff(id) on delete set null,
  follow_date date, outcome text not null default '', summary text not null default '',
  opened_at timestamptz not null default now(), closed_at timestamptz, updated_at timestamptz not null default now()
);
create table if not exists public.counsel_actions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.counsel_cases(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  kind text not null default 'note', note text not null default '', private boolean not null default false,
  day date not null default ((now() at time zone 'Asia/Riyadh')::date), next_date date,
  by_staff uuid default public.me() references public.staff(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists counsel_cases_school on public.counsel_cases(school_id, status);
create index if not exists counsel_cases_student on public.counsel_cases(student_id);
create index if not exists counsel_actions_case on public.counsel_actions(case_id, day);
create index if not exists behaviors_case on public.behaviors(case_id);

-- سرية الحالات: الموجه الطلابي والمالك فقط
alter table public.counsel_cases enable row level security;
alter table public.counsel_actions enable row level security;
create policy cc_all on public.counsel_cases for all using (school_id = public.my_school() and public.is_counselor()) with check (school_id = public.my_school() and public.is_counselor());
create policy ca_all on public.counsel_actions for all using (school_id = public.my_school() and public.is_counselor()) with check (school_id = public.my_school() and public.is_counselor());
grant select, insert, update, delete on public.counsel_cases, public.counsel_actions to authenticated;

-- المُحيل لا يغيّر حالة الإحالة ولا ردّ الموجه ولا ربطها بالحالة
create or replace function public.behaviors_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_counselor() then
    new.status := old.status; new.reply := old.reply; new.replied_at := old.replied_at; new.case_id := old.case_id; new.counselor_note := old.counselor_note;
  end if;
  return new;
end $$;
create or replace trigger behaviors_guard before update on public.behaviors for each row execute function public.behaviors_guard();

-- أرقام الموجهين (لإشعارهم بالإحالات الجديدة)
create or replace function public.counselor_ids() returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct g.staff_id from public.module_grants g join public.staff s on s.id = g.staff_id
  where g.module = 'counselor' and s.school_id = public.my_school() and s.active
$$;
grant execute on function public.counselor_ids() to authenticated;
