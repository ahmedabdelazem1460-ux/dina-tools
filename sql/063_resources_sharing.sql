-- 063: مصادر المعلم خاصة به — لا يراها معلم آخر إلا بعد اعتماد المالك ونطاق يحدده (الكل / معلمو المادة / أشخاص محددون)
alter table public.resources add column if not exists share_status text not null default 'private';
alter table public.resources add column if not exists share_to uuid[] not null default '{}';
alter table public.resources add column if not exists share_scope text not null default 'all';
alter table public.resources add column if not exists share_note text not null default '';
alter table public.resources add column if not exists shared_by uuid;
alter table public.resources add column if not exists shared_at timestamptz;
do $$ begin alter table public.resources add constraint res_share_chk check (share_status in ('private','pending','shared','rejected')); exception when others then null; end $$;
-- ما أنشأه المالك سابقاً يبقى ظاهراً كما كان؛ مصادر المعلمين تصبح خاصة حتى يعتمدها المالك
update public.resources r set share_status = 'shared', shared_at = now() where share_status = 'private' and exists (select 1 from public.staff s where s.id = r.created_by and s.is_owner);

-- المعلم لا يستطيع اعتماد المشاركة بنفسه: «مشترك» يتحول إلى «بانتظار الاعتماد»، ولا يغيّر النطاق
create or replace function public.res_share_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_owner() then
    if new.share_status = 'shared' and (tg_op = 'INSERT' or old.share_status is distinct from 'shared') then new.shared_by := public.me(); new.shared_at := now(); end if;
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.share_status not in ('private','pending') then new.share_status := 'private'; end if;
    new.share_to := '{}'; new.share_scope := 'all'; new.shared_by := null; new.shared_at := null;
  else
    if new.share_status = 'shared' and old.share_status <> 'shared' then new.share_status := 'pending'; end if;
    if new.share_status = 'rejected' and old.share_status <> 'rejected' then new.share_status := old.share_status; end if;
    new.share_to := old.share_to; new.share_scope := old.share_scope; new.shared_by := old.shared_by; new.shared_at := old.shared_at;
  end if;
  return new;
end $$;
drop trigger if exists res_share_guard on public.resources;
create trigger res_share_guard before insert or update on public.resources for each row execute function public.res_share_guard();

-- القراءة: صاحب المصدر والمالك دائماً؛ وغيرهم فقط ما اعتمده المالك ضمن النطاق
drop policy if exists res_read on public.resources;
create policy res_read on public.resources for select using (
  school_id = public.my_school() and (
    created_by = public.me() or public.is_owner() or (
      share_status = 'shared' and (
        share_scope = 'all'
        or (share_scope = 'people' and public.me() = any(share_to))
        or (share_scope = 'subject' and exists (select 1 from public.plan_entries e where e.teacher_id = public.me() and e.subject_id = resources.subject_id))
      ))));
select 'ok';
