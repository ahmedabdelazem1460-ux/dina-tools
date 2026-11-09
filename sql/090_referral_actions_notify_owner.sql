-- اطلاع المالك (المدير الأكاديمي) على كل إجراء يُتخذ في الإحالات: رسالة في صندوقه داخل المنصة
create or replace function public.notify_owners(p_school uuid, p_actor uuid, p_subject text, p_body text) returns void
language sql security definer set search_path = public as $$
  insert into public.messages (school_id, sender_id, recipient_id, subject, body, kind)
  select p_school, p_actor, s.id, p_subject, p_body, 'message'
  from public.staff s where s.school_id = p_school and s.is_owner and s.active and coalesce(s.is_test, false) = false and s.id is distinct from p_actor;
$$;

create or replace function public.ref_act_label(k text) returns text language sql immutable as $$
  select coalesce((jsonb_build_object('session','جلسة إرشادية فردية','group','جلسة إرشادية جماعية','parent_call','اتصال بولي الأمر','parent_meet','استدعاء ولي الأمر','pledge','تعهد خطي','plan','خطة تعديل سلوك','reinforce','تعزيز إيجابي','teacher','تنسيق مع المعلم','admin','إحالة للوكيل / الإدارة','external','إحالة لجهة مختصة','follow','متابعة','note','ملاحظة') ->> k), k);
$$;

-- إجراء في ملف حالة إرشادية
create or replace function public.trg_counsel_action_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare stu text; who text; cs record;
begin
  select c.*, st.full_name sname into cs from public.counsel_cases c left join public.students st on st.id = c.student_id where c.id = new.case_id;
  select full_name into who from public.staff where id = new.by_staff;
  perform public.notify_owners(new.school_id, new.by_staff,
    'إجراء الموجه: ' || coalesce(cs.sname, 'طالب'),
    coalesce(who, 'الموجه الطلابي') || ' — ' || public.ref_act_label(new.kind) || ' (' || to_char(coalesce(new.day, current_date), 'YYYY-MM-DD') || ')' ||
    case when coalesce(trim(new.note), '') <> '' then E'\n' || trim(new.note) else '' end ||
    case when new.next_date is not null then E'\nموعد المتابعة: ' || to_char(new.next_date, 'YYYY-MM-DD') else '' end ||
    case when new.private then E'\n(إجراء سري)' else '' end ||
    E'\nالحالة: ' || coalesce(cs.title, '') );
  return new;
end $$;
drop trigger if exists counsel_action_notify on public.counsel_actions;
create trigger counsel_action_notify after insert on public.counsel_actions for each row execute function public.trg_counsel_action_notify();

-- تغيّر حالة الإحالة أو الردّ عليها (الموجه أو الوكيل)
create or replace function public.trg_referral_update_notify() returns trigger language plpgsql security definer set search_path = public as $$
declare stu text; who uuid := public.me(); wn text; st text;
begin
  if not coalesce(new.referred, false) then return new; end if;
  if new.status is not distinct from old.status and coalesce(new.reply, '') is not distinct from coalesce(old.reply, '') and new.case_id is not distinct from old.case_id then return new; end if;
  select full_name into stu from public.students where id = new.student_id;
  select full_name into wn from public.staff where id = who;
  st := case coalesce(new.status, 'open') when 'open' then 'جديدة' when 'in_progress' then 'قيد المتابعة' when 'closed' then 'مغلقة' else new.status end;
  perform public.notify_owners(new.school_id, who,
    'تحديث إحالة ' || case when new.target = 'deputy' then '(الوكيل)' else '(الموجه)' end || ': ' || coalesce(stu, 'طالب'),
    coalesce(wn, '') || ' — السبب: ' || coalesce(new.category, '') || E'\nحالة الإحالة: ' || st ||
    case when new.case_id is not null and old.case_id is null then E'\nفُتح لها ملف حالة إرشادية' else '' end ||
    case when coalesce(new.reply, '') <> '' and coalesce(new.reply, '') is distinct from coalesce(old.reply, '') then E'\nالإجراء/الردّ: ' || new.reply else '' end);
  return new;
end $$;
drop trigger if exists referral_update_notify on public.behaviors;
create trigger referral_update_notify after update on public.behaviors for each row execute function public.trg_referral_update_notify();

-- الوكيل يغيّر حالة إحالات الوكيل ويردّ عليها (كان الحارس يسمح للموجه فقط فيُلغي تعديلات الوكيل بصمت)
create or replace function public.behaviors_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_counselor() or (coalesce(new.target, 'counselor') = 'deputy' and public.has_module('deputy'))) then
    new.status := old.status; new.reply := old.reply; new.replied_at := old.replied_at; new.case_id := old.case_id; new.counselor_note := old.counselor_note;
  end if;
  return new;
end $$;
