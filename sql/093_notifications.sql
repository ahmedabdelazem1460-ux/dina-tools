-- 093: الإشعارات — جداول ودوال جديدة فقط، لا مساس بأي بيانات قائمة.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  kind text not null default 'notice',
  title text not null default '', body text not null default '', link text not null default '',
  broadcast_id uuid, created_by uuid references public.staff(id) on delete set null,
  show_at timestamptz not null default now(), created_at timestamptz not null default now(), read_at timestamptz
);
create index if not exists notif_staff on public.notifications(staff_id, show_at desc);
create index if not exists notif_bc on public.notifications(broadcast_id) where broadcast_id is not null;

-- تفضيلات كل موظف: off = ما أوقفه بنفسه، admin_off = ما أوقفه المالك (لا يغيّره الموظف)
create table if not exists public.notif_prefs (
  staff_id uuid primary key references public.staff(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  off text[] not null default '{}', admin_off text[] not null default '{}', updated_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
alter table public.notif_prefs enable row level security;
create policy nt_read on public.notifications for select using (school_id = public.my_school() and (staff_id = public.me() or public.is_owner()));
create policy nt_upd on public.notifications for update using (staff_id = public.me()) with check (staff_id = public.me());
create policy nt_del on public.notifications for delete using (school_id = public.my_school() and (staff_id = public.me() or public.is_owner()));
create policy np_read on public.notif_prefs for select using (school_id = public.my_school() and (staff_id = public.me() or public.is_owner()));
grant select, update, delete on public.notifications to authenticated;
grant select on public.notif_prefs to authenticated;

-- الإرسال الداخلي (للمشغّلات): يحترم الإيقاف العام في الإعدادات وتفضيلات الموظف
create or replace function public.notif_push(p_school uuid, p_staff uuid, p_kind text, p_title text, p_body text, p_link text default '', p_by uuid default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_staff is null or p_staff is not distinct from p_by then return; end if;
  if coalesce((select (settings -> 'notif' -> 'off') ? p_kind from public.schools where id = p_school), false) then return; end if;
  if exists (select 1 from public.notif_prefs where staff_id = p_staff and (p_kind = any(off) or p_kind = any(admin_off))) then return; end if;
  if not exists (select 1 from public.staff where id = p_staff and school_id = p_school and active) then return; end if;
  insert into public.notifications (school_id, staff_id, kind, title, body, link, created_by) values (p_school, p_staff, p_kind, left(coalesce(p_title,''), 200), left(coalesce(p_body,''), 2000), coalesce(p_link,''), p_by);
end $$;
revoke all on function public.notif_push(uuid, uuid, text, text, text, text, uuid) from public, anon, authenticated;

-- تنبيه عام/خاص يصدره المالك أو من يملك وحدة الإشراف (p_ids فارغة = كل الموظفين الفعّالين)
create or replace function public.notify_send(p_ids uuid[], p_title text, p_body text, p_link text default '', p_kind text default 'notice', p_show_at timestamptz default null)
returns int language plpgsql security definer set search_path = public as $$
declare sch uuid := public.my_school(); bc uuid := gen_random_uuid(); n int;
begin
  if not (public.is_owner() or public.has_module('supervision')) then raise exception 'إصدار التنبيهات للمالك أو من يملك صلاحية الإشراف'; end if;
  if coalesce(trim(p_title), '') = '' then raise exception 'اكتب عنوان التنبيه'; end if;
  insert into public.notifications (school_id, staff_id, kind, title, body, link, broadcast_id, created_by, show_at)
  select sch, s.id, coalesce(nullif(p_kind,''),'notice'), left(trim(p_title),200), left(coalesce(p_body,''),2000), coalesce(p_link,''), bc, public.me(), coalesce(p_show_at, now())
  from public.staff s where s.school_id = sch and s.active and coalesce(s.is_test,false) = false
    and (p_ids is null or cardinality(p_ids) = 0 or s.id = any(p_ids)) and s.id is distinct from public.me();
  get diagnostics n = row_count; return n;
end $$;

-- سحب تنبيه عام أرسلته
create or replace function public.notify_retract(p_broadcast uuid) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  delete from public.notifications where broadcast_id = p_broadcast and school_id = public.my_school() and (public.is_owner() or created_by = public.me());
  get diagnostics n = row_count; return n;
end $$;

-- قائمة التنبيهات العامة المرسلة مع عدد من قرأها
create or replace function public.notify_sent() returns table (broadcast_id uuid, title text, body text, link text, kind text, show_at timestamptz, created_by uuid, total int, seen int)
language sql stable security definer set search_path = public as $$
  select n.broadcast_id, max(n.title), max(n.body), max(n.link), max(n.kind), max(n.show_at), (array_agg(n.created_by))[1], count(*)::int, count(n.read_at)::int
  from public.notifications n where n.school_id = public.my_school() and n.broadcast_id is not null and (public.is_owner() or n.created_by = public.me())
  group by n.broadcast_id order by max(n.show_at) desc limit 100;
$$;

-- حفظ التفضيلات: الموظف لنفسه (off)، والمالك لأي موظف (admin_off)
create or replace function public.notif_set_prefs(p_staff uuid, p_off text[], p_admin boolean default false) returns public.notif_prefs
language plpgsql security definer set search_path = public as $$
declare sch uuid := public.my_school(); r public.notif_prefs;
begin
  if not exists (select 1 from public.staff where id = p_staff and school_id = sch) then raise exception 'الموظف غير موجود'; end if;
  if p_admin and not public.is_owner() then raise exception 'للمالك فقط'; end if;
  if not p_admin and p_staff <> public.me() then raise exception 'تعدّل تفضيلاتك فقط'; end if;
  insert into public.notif_prefs (staff_id, school_id, off, admin_off) values (p_staff, sch, case when p_admin then '{}' else coalesce(p_off,'{}') end, case when p_admin then coalesce(p_off,'{}') else '{}' end)
  on conflict (staff_id) do update set off = case when p_admin then notif_prefs.off else excluded.off end,
    admin_off = case when p_admin then excluded.admin_off else notif_prefs.admin_off end, updated_at = now()
  returning * into r;
  return r;
end $$;
grant execute on function public.notify_send(uuid[], text, text, text, text, timestamptz), public.notify_retract(uuid), public.notify_sent(), public.notif_set_prefs(uuid, text[], boolean) to authenticated;

-- ===== المشغّلات =====
-- الرسائل الداخلية
create or replace function public.trg_msg_notif() returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
  perform public.notif_push(new.school_id, new.recipient_id, 'message', 'رسالة من ' || coalesce((select full_name from public.staff where id = new.sender_id), 'زميل'),
    coalesce(nullif(new.subject,''), left(coalesce(new.body,''), 140)), '#msg:' || coalesce(new.sender_id::text,''), new.sender_id);
  return new;
  exception when others then raise warning 'notif: %', sqlerrm; return new;
  end;
end $$;
drop trigger if exists msg_notif on public.messages;
create trigger msg_notif after insert on public.messages for each row execute function public.trg_msg_notif();

-- النماذج: تكليف، طلب توقيع، إرسال، إعادة، اعتماد، واكتمال الدفعة
create or replace function public.trg_form_notif() returns trigger language plpgsql security definer set search_path = public as $$
declare who uuid := public.me(); wn text; c jsonb; total int; done int; owner_id uuid;
begin
  begin
  wn := coalesce((select full_name from public.staff where id = who), '');
  if tg_op = 'INSERT' then
    perform public.notif_push(new.school_id, new.assignee, 'form_assigned', 'نموذج جديد مطلوب منك', new.title || case when new.due_date is not null then ' — حتى ' || to_char(new.due_date,'YYYY-MM-DD') else '' end, '#/forms', who);
    return new;
  end if;
  -- طلبات توقيع جديدة
  for c in select x from jsonb_array_elements(new.cosign) x where not exists (select 1 from jsonb_array_elements(old.cosign) o where o->>'staff_id' = x->>'staff_id' and o->>'key' = x->>'key') loop
    perform public.notif_push(new.school_id, (c->>'staff_id')::uuid, 'form_sign', 'مطلوب توقيعك', new.title || ' — خانة: ' || coalesce(c->>'label',''), '#/forms', who);
  end loop;
  if new.status is distinct from old.status then
    if new.status = 'submitted' then
      perform public.notif_push(new.school_id, new.created_by, 'form_submitted', 'أُرسل نموذج للاعتماد', new.title || ' — ' || coalesce((select full_name from public.staff where id = new.assignee),''), '#/forms', who);
    elsif new.status = 'returned' then
      perform public.notif_push(new.school_id, new.assignee, 'form_returned', 'أُعيد إليك نموذج', new.title || case when coalesce(new.review_note,'') <> '' then E'\n' || new.review_note else '' end, '#/forms', who);
    elsif new.status = 'approved' then
      perform public.notif_push(new.school_id, new.assignee, 'form_approved', 'اعتُمد نموذجك', new.title, '#/forms', who);
    end if;
  end if;
  -- اكتمال الدفعة: الكل أرسل/اعتُمد ووقّع كل الزملاء المطلوبين
  if new.batch_id is not null and (new.status is distinct from old.status or new.cosign is distinct from old.cosign) and new.status in ('submitted','approved') then
    select count(*), count(*) filter (where status in ('submitted','approved') and not exists (select 1 from jsonb_array_elements(cosign) k where coalesce(k->>'status','pending') <> 'signed'))
      into total, done from public.form_tasks where batch_id = new.batch_id;
    if total = done and total > 0 and not exists (select 1 from public.notifications where kind = 'form_done' and link = '#/forms?batch=' || new.batch_id::text) then
      perform public.notif_push(new.school_id, new.created_by, 'form_done', 'اكتمل: ' || new.title, 'أنجز جميع المكلّفين (' || total || ') النموذج واكتملت التوقيعات.', '#/forms?batch=' || new.batch_id::text, null);
      for owner_id in select id from public.staff where school_id = new.school_id and is_owner and active and id is distinct from new.created_by loop
        perform public.notif_push(new.school_id, owner_id, 'form_done', 'اكتمل: ' || new.title, 'أنجز جميع المكلّفين (' || total || ') النموذج واكتملت التوقيعات.', '#/forms?batch=' || new.batch_id::text, null);
      end loop;
    end if;
  end if;
  return new;
  exception when others then raise warning 'notif: %', sqlerrm; return new;
  end;
end $$;
drop trigger if exists form_notif on public.form_tasks;
create trigger form_notif after insert or update on public.form_tasks for each row execute function public.trg_form_notif();

-- حصص الانتظار: إشعار المعلم المكلّف
create or replace function public.trg_sub_notif() returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
  if new.sub_teacher is null or (tg_op = 'UPDATE' and new.sub_teacher is not distinct from old.sub_teacher) then return new; end if;
  perform public.notif_push(new.school_id, new.sub_teacher, 'standby', 'حصة انتظار',
    'الحصة ' || new.period || ' — ' || coalesce((select name from public.classes where id = new.class_id),'') || ' — ' || to_char(new.day,'YYYY-MM-DD') ||
    case when new.absent_teacher is not null then ' (بدلاً من ' || coalesce((select full_name from public.staff where id = new.absent_teacher),'') || ')' else '' end, '#/standby', public.me());
  return new;
  exception when others then raise warning 'notif: %', sqlerrm; return new;
  end;
end $$;
drop trigger if exists sub_notif on public.substitutions;
create trigger sub_notif after insert or update on public.substitutions for each row execute function public.trg_sub_notif();

alter publication supabase_realtime add table public.notifications;
