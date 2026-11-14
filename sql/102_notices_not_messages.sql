-- 102: التنبيهات الآلية (التقارير، التذكيرات، التكليفات، إشعار المالك بالإحالات) تصل إشعاراً في الجرس لا رسالة في صندوق الرسائل،
-- إلا إذا اختار المرسِل «إرسال كرسالة أيضاً» (تُرسل الواجهة الرسالة عندها بنفسها).
create or replace function public.notice_send(p_ids uuid[], p_title text, p_body text, p_link text default '', p_kind text default 'system')
returns int language plpgsql security definer set search_path = public as $$
declare sch uuid := public.my_school(); me uuid := public.me(); n int := 0; r uuid;
begin
  if sch is null or me is null then raise exception 'غير مسموح'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'اكتب عنوان التنبيه'; end if;
  if p_kind not in ('system', 'reminder') then p_kind := 'system'; end if;
  foreach r in array coalesce(p_ids, '{}') loop
    if exists (select 1 from public.staff where id = r and school_id = sch and active) then
      perform public.notif_push(sch, r, p_kind, p_title, p_body, coalesce(p_link, ''), me); n := n + 1;
    end if;
  end loop;
  return n;
end $$;
grant execute on function public.notice_send(uuid[], text, text, text, text) to authenticated;

create or replace function public.notify_owners(p_school uuid, p_actor uuid, p_subject text, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare o record;
begin
  for o in select s.id from public.staff s where s.school_id = p_school and s.is_owner and s.active and coalesce(s.is_test, false) = false and s.id is distinct from p_actor loop
    perform public.notif_push(p_school, o.id, 'system', p_subject, p_body, '', p_actor);
  end loop;
end $$;
