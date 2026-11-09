-- من رصد الغياب/التأخر ومن عدّله: created_by/created_at (أول من رصد حالة غير «حاضر») و edited_by/edited_at (آخر من غيّر الرصد بعده)
-- إعادة الحفظ دون تغيير لا تُغيّر اسم الراصد (يُعاد by_staff و updated_at كما كانا).
alter table public.attendance        add column if not exists created_by uuid, add column if not exists created_at timestamptz, add column if not exists edited_by uuid, add column if not exists edited_at timestamptz;
alter table public.period_attendance add column if not exists created_by uuid, add column if not exists created_at timestamptz, add column if not exists edited_by uuid, add column if not exists edited_at timestamptz;

-- البيانات السابقة: الراصد = آخر من حفظ (لا يوجد سجل أدق)
update public.attendance        set created_by = by_staff, created_at = updated_at where status <> 'present' and created_by is null;
update public.period_attendance set created_by = by_staff, created_at = updated_at where status <> 'present' and created_by is null;

create or replace function public.att_audit() returns trigger language plpgsql set search_path = public as $$
declare chg boolean; who uuid;
begin
  who := coalesce(new.by_staff, public.me());
  if tg_op = 'INSERT' then
    if new.status <> 'present' then new.created_by := who; new.created_at := now(); else new.created_by := null; new.created_at := null; end if;
    new.edited_by := null; new.edited_at := null;
    return new;
  end if;
  chg := new.status is distinct from old.status
      or new.minutes is distinct from old.minutes
      or coalesce(new.note, '') is distinct from coalesce(old.note, '')
      or new.time_at is distinct from old.time_at
      or (to_jsonb(new) -> 'referred') is distinct from (to_jsonb(old) -> 'referred');
  new.created_by := old.created_by; new.created_at := old.created_at;   -- لا تُعدَّل من الواجهة
  if not chg then
    new.by_staff := old.by_staff; new.updated_at := old.updated_at; new.edited_by := old.edited_by; new.edited_at := old.edited_at;
    return new;
  end if;
  if old.created_by is null then
    -- كان «حاضر» فقط: أول رصد لغياب/تأخر يُسجَّل باسم من رصده
    if new.status <> 'present' then new.created_by := who; new.created_at := now(); end if;
    new.edited_by := old.edited_by; new.edited_at := old.edited_at;
  else
    new.edited_by := who; new.edited_at := now();
  end if;
  return new;
end $$;

drop trigger if exists att_audit on public.attendance;
create trigger att_audit before insert or update on public.attendance for each row execute function public.att_audit();
drop trigger if exists att_audit on public.period_attendance;
create trigger att_audit before insert or update on public.period_attendance for each row execute function public.att_audit();
