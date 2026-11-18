-- 111a: حصص الانتظار — إشعار المعتمدين عند الإرسال للاعتماد، اعتماد جدول الانتظار الأسبوعي، الحصص المستبعدة من التأمين
-- (١) الحصص المحذوفة من تأمين اليوم ("class_id|period")
alter table public.standby_days add column if not exists skip jsonb not null default '[]'::jsonb;

-- (٢) المعتمدون لقسم: المالكون + منحة sb_approve
create or replace function public.sb_approvers(p_section uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select s.id from public.staff s join public.sections x on x.id = p_section and x.school_id = s.school_id
   where s.active and s.is_owner
  union
  select g.staff_id from public.module_grants g join public.staff s on s.id = g.staff_id and s.active
   join public.sections x on x.id = p_section and x.school_id = s.school_id
   where g.module = 'sb_approve'
$$;

-- (٣) إشعار المعتمدين عندما يصير تأمين اليوم «بانتظار الاعتماد» (من أي طريق) — آمن لا يعطل الحفظ
create or replace function public.trg_sbd_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sec text; v_n int; a uuid;
begin
  if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    begin
      select name into v_sec from public.sections where id = new.section_id;
      select count(*) into v_n from public.substitutions where section_id = new.section_id and day = new.day;
      for a in select public.sb_approvers(new.section_id) loop
        perform public.notif_push(new.school_id, a, 'standby',
          case when tg_op = 'UPDATE' and old.status = 'approved' then 'أُعيد فتح تأمين الحصص — بانتظار اعتمادك' else 'تأمين حصص بانتظار اعتمادك' end,
          coalesce(v_sec, '') || ' — ' || to_char(new.day, 'DD/MM/YYYY') || ' (' || v_n || ' حصة)', '#/standby', public.me());
      end loop;
    exception when others then null; end;
  end if;
  return null;
end $$;

create or replace trigger sbd_notify after insert or update of status on public.standby_days for each row execute function public.trg_sbd_notify();

-- (٤) حفظ جدول الانتظار الأسبوعي: من لا يملك الاعتماد ← «بانتظار الاعتماد» + إشعار المعتمدين
create or replace function public.sb_save_roster(p_section uuid, p_roster jsonb, p_gen text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb; v_ok boolean := public.sb_ok(p_section, 'approve'); v_sch uuid; v_sec text; a uuid;
begin
  if not public.sb_ok(p_section, 'roster') then raise exception 'no permission'; end if;
  update public.sections set standby = coalesce(standby, '{}'::jsonb) || jsonb_build_object('roster', coalesce(p_roster, '{}'::jsonb))
     || case when p_gen is not null then jsonb_build_object('gen', p_gen) else '{}'::jsonb end
     || jsonb_build_object('rstat', jsonb_build_object('s', case when v_ok then 'approved' else 'pending' end, 'by', public.me(), 'at', now()))
   where id = p_section returning standby, school_id, name into v, v_sch, v_sec;
  if not v_ok then
    begin
      for a in select public.sb_approvers(p_section) loop
        perform public.notif_push(v_sch, a, 'standby', 'جدول الانتظار الأسبوعي بانتظار اعتمادك',
          coalesce(v_sec, '') || ' — عدّله ' || coalesce((select full_name from public.staff where id = public.me()), ''), '#/standby', public.me());
      end loop;
    exception when others then null; end;
  end if;
  return v;
end $$;

-- (٥) اعتماد جدول الانتظار الأسبوعي
create or replace function public.sb_approve_roster(p_section uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb; v_by uuid; v_sch uuid; v_sec text;
begin
  if not public.sb_ok(p_section, 'approve') then raise exception 'no permission'; end if;
  select nullif(standby->'rstat'->>'by', '')::uuid into v_by from public.sections where id = p_section;
  update public.sections set standby = coalesce(standby, '{}'::jsonb) || jsonb_build_object('rstat', jsonb_build_object('s', 'approved', 'by', v_by, 'at', now(), 'ok_by', public.me()))
   where id = p_section returning standby, school_id, name into v, v_sch, v_sec;
  if v_by is not null then
    begin perform public.notif_push(v_sch, v_by, 'standby', 'اعتُمد جدول الانتظار الأسبوعي', coalesce(v_sec, ''), '#/standby', public.me());
    exception when others then null; end;
  end if;
  return v;
end $$;
grant execute on function public.sb_approve_roster(uuid) to authenticated;
grant execute on function public.sb_approvers(uuid) to authenticated;
