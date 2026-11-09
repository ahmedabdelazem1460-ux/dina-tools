-- «للموجه» في رصد الحضور اليومي يُنشئ إحالة في صندوق الموجه الطلابي (الإرشاد الطلابي) تلقائياً،
-- مرة واحدة لكل طالب في اليوم، باسم من رصد. يشمل كل طرق الرصد (التحضير، رصد الحضور).
create or replace function public.att_to_referral() returns trigger language plpgsql security definer set search_path = public as $$
declare cat text; lbl text;
begin
  if not coalesce(new.referred, false) then return new; end if;
  if tg_op = 'UPDATE' and coalesce(old.referred, false) then return new; end if;
  if exists (select 1 from public.behaviors b where b.student_id = new.student_id and b.day = new.day and b.referred and b.note like 'من رصد الحضور اليومي%') then return new; end if;
  cat := case new.status when 'absent' then 'غياب متكرر' when 'late' then 'تأخر صباحي متكرر' else 'أخرى' end;
  lbl := case new.status when 'absent' then 'غائب' when 'late' then 'متأخر' || case when new.minutes is not null then ' ' || new.minutes || ' د' else '' end when 'excused' then 'مستأذن' when 'early' then 'خروج مبكر' else 'حاضر' end;
  insert into public.behaviors (school_id, student_id, class_id, day, kind, category, points, note, referred, status, priority, prior_action, target, by_staff, created_at)
  values (new.school_id, new.student_id, new.class_id, new.day, 'negative', cat, 0,
          'من رصد الحضور اليومي (' || lbl || ')' || case when coalesce(trim(new.note), '') <> '' then ': ' || trim(new.note) else '' end,
          true, 'open', 'normal', 'لا شيء', 'counselor', coalesce(new.created_by, new.by_staff), coalesce(new.created_at, now()));
  return new;
end $$;
drop trigger if exists att_to_referral on public.attendance;
create trigger att_to_referral after insert or update of referred on public.attendance for each row execute function public.att_to_referral();

-- الإحالات السابقة من رصد الحضور: تُحوَّل لصندوق الموجه الطلابي
insert into public.behaviors (school_id, student_id, class_id, day, kind, category, points, note, referred, status, priority, prior_action, target, by_staff, created_at)
select a.school_id, a.student_id, a.class_id, a.day, 'negative',
       case a.status when 'absent' then 'غياب متكرر' when 'late' then 'تأخر صباحي متكرر' else 'أخرى' end, 0,
       'من رصد الحضور اليومي (' || case a.status when 'absent' then 'غائب' when 'late' then 'متأخر' when 'excused' then 'مستأذن' when 'early' then 'خروج مبكر' else 'حاضر' end || ')' || case when coalesce(trim(a.note), '') <> '' then ': ' || trim(a.note) else '' end,
       true, 'open', 'normal', 'لا شيء', 'counselor', coalesce(a.created_by, a.by_staff), coalesce(a.created_at, a.updated_at, now())
from public.attendance a
where a.referred and not exists (select 1 from public.behaviors b where b.student_id = a.student_id and b.day = a.day and b.referred and b.note like 'من رصد الحضور اليومي%');
