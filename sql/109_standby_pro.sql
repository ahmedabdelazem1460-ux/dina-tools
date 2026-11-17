-- 109: تأمين الحصص الاحترافي (طُبّق على دفعات 109a/109b/109c)
-- 109a: البنية
-- توقيع المعلم البديل على حصته + وقت إشعاره + سبب الأولوية (فصل خالٍ…)
alter table public.substitutions add column if not exists sig_at timestamptz;
alter table public.substitutions add column if not exists notified_at timestamptz;
alter table public.substitutions add column if not exists prio text;

-- الصلاحيات المقسّمة: sb_view عرض، sb_cover إعداد التأمين وتعديله، sb_approve الاعتماد، sb_roster جدول الانتظار الأسبوعي، sb_print الطباعة والتصدير
create or replace function public.sb_ok(p_section uuid, p text) returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or (
    exists (select 1 from public.sections s where s.id = p_section and s.school_id = public.my_school())
    and (public.has_perm(p_section, 'timetable_edit')
      or exists (select 1 from public.module_grants g where g.staff_id = public.me()
        and (g.module = 'sb_' || p or (p = 'view' and g.module in ('sb_view','sb_cover','sb_approve','sb_roster','sb_print'))
             or (p = 'cover' and g.module = 'sb_approve')))))
$$;
revoke all on function public.sb_ok(uuid, text) from public, anon;
grant execute on function public.sb_ok(uuid, text) to authenticated;

alter policy subs_write on public.substitutions
  using (school_id = public.my_school() and public.sb_ok(section_id, 'cover'))
  with check (school_id = public.my_school() and public.sb_ok(section_id, 'cover'));

-- يوم التأمين: حالته واعتماده والتوقيعات الختامية والفصول الخالية
create table if not exists public.standby_days (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default public.my_school(),
  section_id uuid not null references public.sections(id) on delete cascade,
  day date not null,
  status text not null default 'draft' check (status in ('draft','pending','approved')),
  empty jsonb not null default '[]'::jsonb,   -- [{class_id, periods:[0..] أو [] = اليوم كله}]
  note text not null default '',
  prepared_by uuid, prepared_at timestamptz,
  approved_by uuid, approved_at timestamptz,
  signs jsonb not null default '{}'::jsonb,   -- {sigId: {img, at}} يكتبه sb_approve فقط
  trail jsonb not null default '[]'::jsonb,
  unique (section_id, day));
alter table public.standby_days enable row level security;
drop policy if exists sbd_read on public.standby_days;
create policy sbd_read on public.standby_days for select using (school_id = public.my_school() and public.sb_ok(section_id, 'view'));
drop policy if exists sbd_ins on public.standby_days;
create policy sbd_ins on public.standby_days for insert with check (school_id = public.my_school() and public.sb_ok(section_id, 'cover'));
drop policy if exists sbd_upd on public.standby_days;
create policy sbd_upd on public.standby_days for update using (school_id = public.my_school() and public.sb_ok(section_id, 'cover')) with check (school_id = public.my_school() and public.sb_ok(section_id, 'cover'));
grant select, insert, update on public.standby_days to authenticated;

-- الاعتماد والتوقيعات لا تُكتب من الواجهة مباشرة — فقط عبر الدوال
create or replace function public.sbd_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('dina.sb', true), '') = '1' then return new; end if;
  if tg_op = 'INSERT' then
    new.signs := '{}'::jsonb; new.approved_by := null; new.approved_at := null; new.trail := '[]'::jsonb;
    if new.status = 'approved' then new.status := 'pending'; end if;
  else
    new.signs := old.signs; new.approved_by := old.approved_by; new.approved_at := old.approved_at; new.trail := old.trail;
    if new.status = 'approved' and old.status <> 'approved' then new.status := old.status; end if;
  end if;
  return new;
end $$;
drop trigger if exists sbd_guard on public.standby_days;
create trigger sbd_guard before insert or update on public.standby_days for each row execute function public.sbd_guard();

-- خزنة المالك (تواقيع الاعتماد التلقائي) — لا يقرؤها غيره
create table if not exists public.owner_vault (
  school_id uuid not null default public.my_school(),
  key text not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (school_id, key));
alter table public.owner_vault enable row level security;
drop policy if exists ov_owner on public.owner_vault;
create policy ov_owner on public.owner_vault for all using (school_id = public.my_school() and public.is_owner()) with check (school_id = public.my_school() and public.is_owner());
grant select, insert, update on public.owner_vault to authenticated;

-- 109b: الدوال
-- اعتماد يوم التأمين: يختم تواقيع الاعتماد التلقائية من خزنة المالك ويُشعر البدلاء
create or replace function public.sb_approve(p_section uuid, p_day date, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_school uuid; v_cfg jsonb; v_signs jsonb := '{}'::jsonb; s jsonb; v_img text; r record; v_row public.standby_days;
begin
  if not public.sb_ok(p_section, 'approve') then raise exception 'no permission'; end if;
  select school_id, coalesce(standby->'form'->'sigs', '[]'::jsonb) into v_school, v_cfg from public.sections where id = p_section;
  for s in select * from jsonb_array_elements(v_cfg) loop
    if s->>'mode' = 'auto' then
      v_img := null;
      select data->>'img' into v_img from public.owner_vault where school_id = v_school and key = 'sbsig:' || (s->>'id');
      -- 109d: بلا صورة مرفوعة ← التوقيع المحفوظ في حساب الموظف المرتبط (إن حدده المالك)
      if v_img is null and coalesce(s->>'staff', '') ~ '^[0-9a-f-]{36}$' then
        select g.img into v_img from public.staff_signatures g join public.staff t on t.id = g.staff_id where g.staff_id = (s->>'staff')::uuid and t.school_id = v_school;
      end if;
      if v_img is not null then v_signs := v_signs || jsonb_build_object(s->>'id', jsonb_build_object('img', v_img, 'at', now())); end if;
    end if;
  end loop;
  perform set_config('dina.sb', '1', true);
  insert into public.standby_days (school_id, section_id, day, status, approved_by, approved_at, signs, note, trail)
  values (v_school, p_section, p_day, 'approved', public.me(), now(), v_signs, coalesce(p_note, ''),
          jsonb_build_array(jsonb_build_object('at', now(), 'by', public.me(), 'k', 'approve')))
  on conflict (section_id, day) do update set status = 'approved', approved_by = public.me(), approved_at = now(), signs = v_signs,
    note = coalesce(p_note, public.standby_days.note),
    trail = public.standby_days.trail || jsonb_build_array(jsonb_build_object('at', now(), 'by', public.me(), 'k', 'approve'))
  returning * into v_row;
  for r in select * from public.substitutions where section_id = p_section and day = p_day and sub_teacher is not null and notified_at is null loop
    begin
      perform public.notif_push(r.school_id, r.sub_teacher, 'standby', 'حصة انتظار',
        'الحصة ' || (r.period + 1) || ' — ' || coalesce((select name from public.classes where id = r.class_id), '') || ' — ' || to_char(r.day, 'YYYY-MM-DD') ||
        case when r.absent_teacher is not null then ' (بدلاً من ' || coalesce((select full_name from public.staff where id = r.absent_teacher), '') || ')' else '' end, '#/standby', public.me());
    exception when others then raise warning 'notif: %', sqlerrm; end;
  end loop;
  update public.substitutions set notified_at = now() where section_id = p_section and day = p_day and sub_teacher is not null and notified_at is null;
  perform set_config('dina.sb', '', true);
  return to_jsonb(v_row);
end $$;

-- إلغاء الاعتماد للتعديل (تُزال التواقيع الختامية)
create or replace function public.sb_reopen(p_section uuid, p_day date) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_row public.standby_days;
begin
  if not public.sb_ok(p_section, 'approve') then raise exception 'no permission'; end if;
  perform set_config('dina.sb', '1', true);
  update public.standby_days set status = 'pending', signs = '{}'::jsonb, approved_at = null, approved_by = null,
    trail = trail || jsonb_build_array(jsonb_build_object('at', now(), 'by', public.me(), 'k', 'reopen'))
  where section_id = p_section and day = p_day returning * into v_row;
  perform set_config('dina.sb', '', true);
  return to_jsonb(v_row);
end $$;

-- توقيع المعلم البديل على حصته (بتوقيعه الإلكتروني المحفوظ)
create or replace function public.sb_sign(p_id uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare v_at timestamptz;
begin
  if not exists (select 1 from public.staff_signatures where staff_id = public.me()) then raise exception 'NO_SIG'; end if;
  update public.substitutions set sig_at = coalesce(sig_at, now())
   where id = p_id and sub_teacher = public.me() and school_id = public.my_school()
     and exists (select 1 from public.standby_days d where d.section_id = substitutions.section_id and d.day = substitutions.day and d.status = 'approved')
  returning sig_at into v_at;
  if v_at is null then raise exception 'NOT_ALLOWED'; end if;
  return v_at;
end $$;

-- بيانات النموذج المعتمد مع صور تواقيع المعلمين (لمن له العرض فقط)
create or replace function public.sb_day(p_section uuid, p_day date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.sb_ok(p_section, 'view') then raise exception 'no permission'; end if;
  return jsonb_build_object(
    'day', (select to_jsonb(d) from public.standby_days d where d.section_id = p_section and d.day = p_day),
    'sigs', coalesce((select jsonb_object_agg(x.id, g.img) from public.substitutions x join public.staff_signatures g on g.staff_id = x.sub_teacher
                      where x.section_id = p_section and x.day = p_day and x.sig_at is not null), '{}'::jsonb));
end $$;

-- حفظ جدول الانتظار الأسبوعي لمن مُنح sb_roster (بقية الإعدادات للمالك)
create or replace function public.sb_save_roster(p_section uuid, p_roster jsonb, p_gen text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.sb_ok(p_section, 'roster') then raise exception 'no permission'; end if;
  update public.sections set standby = coalesce(standby, '{}'::jsonb) || jsonb_build_object('roster', coalesce(p_roster, '{}'::jsonb))
     || case when p_gen is not null then jsonb_build_object('gen', p_gen) else '{}'::jsonb end
   where id = p_section returning standby into v;
  return v;
end $$;

revoke all on function public.sb_approve(uuid, date, text), public.sb_reopen(uuid, date), public.sb_sign(uuid), public.sb_day(uuid, date), public.sb_save_roster(uuid, jsonb, text) from public, anon;
grant execute on function public.sb_approve(uuid, date, text), public.sb_reopen(uuid, date), public.sb_sign(uuid), public.sb_day(uuid, date), public.sb_save_roster(uuid, jsonb, text) to authenticated;

-- الإشعار: يُرسل عند الاعتماد (sb_approve)، أو عند تغيير البديل في يوم معتمد. وتصحيح رقم الحصة (+1)
create or replace function public.trg_sub_notif() returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
  if new.sub_teacher is null or (tg_op = 'UPDATE' and new.sub_teacher is not distinct from old.sub_teacher) then return new; end if;
  if not exists (select 1 from public.standby_days d where d.section_id = new.section_id and d.day = new.day and d.status = 'approved') then return new; end if;
  perform public.notif_push(new.school_id, new.sub_teacher, 'standby', 'حصة انتظار',
    'الحصة ' || (new.period + 1) || ' — ' || coalesce((select name from public.classes where id = new.class_id),'') || ' — ' || to_char(new.day,'YYYY-MM-DD') ||
    case when new.absent_teacher is not null then ' (بدلاً من ' || coalesce((select full_name from public.staff where id = new.absent_teacher),'') || ')' else '' end, '#/standby', public.me());
  update public.substitutions set notified_at = now() where id = new.id;
  return new;
  exception when others then raise warning 'notif: %', sqlerrm; return new;
  end;
end $$;

-- تغيير البديل يلغي توقيع السابق ووقت إشعاره
create or replace function public.trg_sub_reset() returns trigger language plpgsql set search_path = public as $$
begin
  if new.sub_teacher is distinct from old.sub_teacher then new.sig_at := null; new.notified_at := null; end if;
  return new;
end $$;
drop trigger if exists sub_reset on public.substitutions;
create trigger sub_reset before update on public.substitutions for each row execute function public.trg_sub_reset();

-- 109c: متابعة الموظفين وأعمالهم (للمالك وحده) — تجميع لكل موظف/نوع/يوم مع أحدث العناوين
create or replace function public.staff_work(p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v_s uuid := public.my_school();
  t0 timestamptz := (p_from::timestamp at time zone 'Asia/Riyadh');
  t1 timestamptz := ((p_to + 1)::timestamp at time zone 'Asia/Riyadh');
begin
  if not public.is_owner() then raise exception 'no permission'; end if;
  if p_to < p_from or p_to - p_from > 400 then raise exception 'bad range'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('s', s, 'c', c, 'd', d, 'n', n, 'l', l) order by d, s, c) from (
    select s, c, (at at time zone 'Asia/Riyadh')::date d, count(*) n, (array_agg(l order by at desc))[1:6] l from (
      select pe.teacher_id s, 'plan' c, pe.submitted_at at, coalesce(nullif(pe.topic, ''), 'حصة') l
        from public.plan_entries pe join public.weeks w on w.id = pe.week_id join public.sections se on se.id = w.section_id
        where se.school_id = v_s and pe.submitted_at >= t0 and pe.submitted_at < t1
      union all select pe.exec_by, 'exec', pe.exec_at, coalesce(nullif(pe.topic, ''), 'تنفيذ حصة')
        from public.plan_entries pe join public.weeks w on w.id = pe.week_id join public.sections se on se.id = w.section_id
        where se.school_id = v_s and pe.exec_at >= t0 and pe.exec_at < t1
      union all select created_by, 'prep', updated_at, coalesce(nullif(lesson, ''), 'تحضير') from public.lesson_preps where school_id = v_s and updated_at >= t0 and updated_at < t1
      union all select * from (select distinct on (coalesce(created_by, by_staff, teacher_id), class_id, day, period) coalesce(created_by, by_staff, teacher_id) s, 'patt' c, created_at at,
          coalesce((select name from public.classes where id = class_id), '') || ' · الحصة ' || (period + 1) l
        from public.period_attendance where school_id = v_s and created_at >= t0 and created_at < t1) pa
      union all select * from (select distinct on (coalesce(created_by, by_staff), class_id, day) coalesce(created_by, by_staff) s, 'att' c, created_at at,
          coalesce((select name from public.classes where id = class_id), '') l
        from public.attendance where school_id = v_s and created_at >= t0 and created_at < t1) da
      union all select by_staff, 'beh', created_at, case when kind = 'positive' then 'إيجابي' else 'سلوك' end || coalesce(' · ' || nullif(left(note, 50), ''), '') from public.behaviors where school_id = v_s and created_at >= t0 and created_at < t1
      union all select teacher_id, 'quiz', created_at, coalesce(nullif(title, ''), 'اختبار') from public.quizzes where school_id = v_s and created_at >= t0 and created_at < t1
      union all select created_by, 'qbank', created_at, left(coalesce(body, ''), 60) from public.questions where school_id = v_s and created_at >= t0 and created_at < t1
      union all select created_by, 'res', created_at, coalesce(title, '') from public.resources where school_id = v_s and created_at >= t0 and created_at < t1
      union all select assignee, 'form', submitted_at, coalesce(title, '') from public.form_tasks where school_id = v_s and visit is null and submitted_at >= t0 and submitted_at < t1
      union all select created_by, 'visit', created_at, coalesce(visit->>'teacher_name', title, '') from public.form_tasks where school_id = v_s and visit is not null and created_at >= t0 and created_at < t1
      union all select sub_teacher, 'cover', created_at, coalesce((select name from public.classes where id = class_id), '') || ' · الحصة ' || (period + 1) from public.substitutions where school_id = v_s and created_at >= t0 and created_at < t1
      union all select sender_id, 'msg', created_at, coalesce(nullif(subject, ''), left(coalesce(body, ''), 50)) from public.messages where school_id = v_s and created_at >= t0 and created_at < t1
      union all select by_staff, 'counsel', created_at, coalesce(kind, '') from public.counsel_actions where school_id = v_s and created_at >= t0 and created_at < t1
      union all select owner, 'deck', updated_at, coalesce(title, '') from public.decks where school_id = v_s and updated_at >= t0 and updated_at < t1
      union all select host, 'poll', created_at, left(coalesce(question, ''), 60) from public.live_polls where school_id = v_s and created_at >= t0 and created_at < t1
      union all select host, 'game', created_at, coalesce(title, '') from public.games where school_id = v_s and created_at >= t0 and created_at < t1
      union all select owner, 'uform', updated_at, coalesce(name, '') from public.user_forms where school_id = v_s and updated_at >= t0 and updated_at < t1
      union all select staff_id, 'login', at, coalesce(device, '') from public.login_events where school_id = v_s and at >= t0 and at < t1
      union all select staff_id, 'hr', (day::timestamp + time '09:00') at time zone 'Asia/Riyadh', status from public.staff_att where school_id = v_s and day >= p_from and day <= p_to
      union all select staff_id, 'duty', (day::timestamp + time '09:00') at time zone 'Asia/Riyadh', coalesce(status, '') from public.duty_log where school_id = v_s and day >= p_from and day <= p_to
      union all select from_staff, 'clar', created_at, 'رد على طلب توضيح' from public.clar_replies where school_id = v_s and created_at >= t0 and created_at < t1
      union all select created_by, 'preport', created_at, coalesce(title, '') from public.parent_reports where school_id = v_s and created_at >= t0 and created_at < t1
    ) e where s is not null group by s, c, (at at time zone 'Asia/Riyadh')::date) g), '[]'::jsonb);
end $$;
revoke all on function public.staff_work(date, date) from public, anon;
grant execute on function public.staff_work(date, date) to authenticated;

-- 109e: توافق مع الواجهة السابقة: يُؤجَّل الإشعار فقط إن وُجد سجل يوم غير معتمد (الواجهة الجديدة تكتب السجل قبل الحصص)؛
-- بلا سجل يوم (الطريقة القديمة) يُشعر فوراً كما كان
create or replace function public.trg_sub_notif() returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
  if new.sub_teacher is null or (tg_op = 'UPDATE' and new.sub_teacher is not distinct from old.sub_teacher) then return new; end if;
  if exists (select 1 from public.standby_days d where d.section_id = new.section_id and d.day = new.day and d.status <> 'approved') then return new; end if;
  perform public.notif_push(new.school_id, new.sub_teacher, 'standby', 'حصة انتظار',
    'الحصة ' || (new.period + 1) || ' — ' || coalesce((select name from public.classes where id = new.class_id),'') || ' — ' || to_char(new.day,'YYYY-MM-DD') ||
    case when new.absent_teacher is not null then ' (بدلاً من ' || coalesce((select full_name from public.staff where id = new.absent_teacher),'') || ')' else '' end, '#/standby', public.me());
  update public.substitutions set notified_at = now() where id = new.id;
  return new;
  exception when others then raise warning 'notif: %', sqlerrm; return new;
  end;
end $$;
