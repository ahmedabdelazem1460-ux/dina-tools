-- إحالة الطالب إلى الموجه الطلابي أو الوكيل
-- target: counselor (الافتراضي — كل الإحالات السابقة) | deputy
alter table public.behaviors add column if not exists target text not null default 'counselor';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'behaviors_target_chk') then
    alter table public.behaviors add constraint behaviors_target_chk check (target in ('counselor', 'deputy'));
  end if;
end $$;

-- الوكيل: من مُنح وحدة «deputy» (والمالك دائماً) يرى إحالات الوكيل ويعالجها
drop policy if exists bh_read_deputy on public.behaviors;
create policy bh_read_deputy on public.behaviors for select using (school_id = public.my_school() and target = 'deputy' and public.has_module('deputy'));
drop policy if exists bh_upd_deputy on public.behaviors;
create policy bh_upd_deputy on public.behaviors for update using (school_id = public.my_school() and target = 'deputy' and public.has_module('deputy'));

create or replace function public.deputy_ids() returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct g.staff_id from public.module_grants g join public.staff s on s.id = g.staff_id
  where g.module = 'deputy' and s.school_id = public.my_school() and s.active
$$;
grant execute on function public.deputy_ids() to authenticated;
