-- 052: تعديل حصة «لهذا الأسبوع فقط» دون المساس بالجدول المعتمد ولا بباقي الأسابيع
alter table public.plan_entries add column if not exists override boolean not null default false;

create or replace function public.apply_version_to_week(p_week uuid, p_version uuid)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare n int := 0; n2 int := 0; n3 int := 0;
begin
  update public.weeks set timetable_version_id = p_version where id = p_week;
  perform set_config('dwp.sys', '1', true);
  update public.plan_entries e set teacher_id = s.teacher_id from public.timetable_slots s
    where e.week_id = p_week and s.version_id = p_version and s.class_id = e.class_id and s.day = e.day and s.period = e.period and not e.override
      and e.subject_id is not distinct from s.subject_id and e.teacher_id is distinct from s.teacher_id;
  get diagnostics n = row_count;
  n3 := public.relocate_entries(p_week, p_version, null);
  perform set_config('dwp.sys', '1', true);
  update public.plan_entries e set subject_id = s.subject_id, teacher_id = s.teacher_id from public.timetable_slots s
    where e.week_id = p_week and s.version_id = p_version and s.class_id = e.class_id and s.day = e.day and s.period = e.period and not e.override
      and e.subject_id is distinct from s.subject_id and e.topic = '' and e.homework = '' and e.note = '';
  get diagnostics n2 = row_count;
  perform set_config('dwp.sys', '', true);
  return n + n2 + n3;
end $function$;

create or replace function public.relocate_entries(p_week uuid, p_version uuid, p_class uuid default null::uuid)
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare n int := 0;
begin
  create temp table if not exists _mv(src uuid, dst uuid) on commit drop; delete from _mv where true;
  create temp table if not exists _snap on commit drop as select * from plan_entries limit 0; delete from _snap where true;
  insert into _snap select e.* from plan_entries e join timetable_slots s on s.version_id = p_version and s.class_id = e.class_id and s.day = e.day and s.period = e.period
    where e.week_id = p_week and (p_class is null or e.class_id = p_class) and e.subject_id is not null and not e.override
      and e.subject_id is distinct from s.subject_id and (e.topic <> '' or e.homework <> '' or e.note <> '');
  if not exists (select 1 from _snap) then return 0; end if;
  with src as (
    select id, class_id, subject_id, row_number() over (partition by class_id, subject_id order by day, period) rn from _snap
  ), dst as (
    select e.id, e.class_id, s.subject_id, row_number() over (partition by e.class_id, s.subject_id order by e.day, e.period) rn
    from plan_entries e join timetable_slots s on s.version_id = p_version and s.class_id = e.class_id and s.day = e.day and s.period = e.period
    where e.week_id = p_week and (p_class is null or e.class_id = p_class) and s.subject_id is not null and e.subject_id is distinct from s.subject_id and not e.override
      and ((e.topic = '' and e.homework = '' and e.note = '') or e.id in (select id from _snap))
  )
  insert into _mv select src.id, dst.id from src join dst on dst.class_id = src.class_id and dst.subject_id = src.subject_id and dst.rn = src.rn;
  get diagnostics n = row_count;
  if n = 0 then return 0; end if;
  perform set_config('dwp.sys', '1', true);
  update plan_entries o set topic = '', homework = '', note = '', perf_task = null, status = 'empty', review_note = '',
         exec_status = 'pending', exec_note = '', exec_by = null, exec_at = null, submitted_at = null, approved_at = null,
         updated_at = now(), subject_id = ts.subject_id, teacher_id = ts.teacher_id
    from timetable_slots ts
    where o.id in (select src from _mv) and ts.version_id = p_version and ts.class_id = o.class_id and ts.day = o.day and ts.period = o.period;
  update plan_entries d set topic = s.topic, homework = s.homework, note = s.note, perf_task = s.perf_task, status = s.status, review_note = s.review_note,
         exec_status = s.exec_status, exec_note = s.exec_note, exec_by = s.exec_by, exec_at = s.exec_at, submitted_at = s.submitted_at, approved_at = s.approved_at,
         updated_by = s.updated_by, updated_at = now(), subject_id = ts.subject_id, teacher_id = ts.teacher_id
    from _mv m join _snap s on s.id = m.src, timetable_slots ts
    where d.id = m.dst and ts.version_id = p_version and ts.class_id = d.class_id and ts.day = d.day and ts.period = d.period;
  update language_issues li set entry_id = m.dst from _mv m where li.entry_id = m.src;
  insert into audit_log(staff_id, action, entity, entity_id, details)
    select public.me(), 'relocate_entry', 'plan_entries', m.dst, jsonb_build_object('from', m.src, 'week', p_week) from _mv m;
  perform set_config('dwp.sys', '', true);
  return n;
end $function$;

create or replace function public.slot_sync_entries(p_version uuid, p_class uuid default null::uuid, p_day integer default null::integer, p_period integer default null::integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare sec uuid; tz date := (now() at time zone 'Asia/Riyadh')::date; a int := 0; b int := 0; c int := 0; r int := 0; w record;
begin
  select section_id into sec from public.timetable_versions where id = p_version;
  if sec is null then return '{}'::jsonb; end if;
  perform set_config('dwp.sys', '1', true);
  with wk as (select id from public.weeks where section_id = sec and start_date + 6 >= tz and public.version_for(sec, start_date) = p_version)
  update public.plan_entries e set teacher_id = s.teacher_id
    from public.timetable_slots s
    where e.week_id in (select id from wk) and s.version_id = p_version and s.class_id = e.class_id and s.day = e.day and s.period = e.period and not e.override
      and (p_class is null or e.class_id = p_class) and (p_day is null or e.day = p_day) and (p_period is null or e.period = p_period)
      and e.subject_id is not distinct from s.subject_id and e.teacher_id is distinct from s.teacher_id;
  get diagnostics a = row_count;
  for w in select id from public.weeks where section_id = sec and start_date + 6 >= tz and public.version_for(sec, start_date) = p_version loop
    r := r + public.relocate_entries(w.id, p_version, p_class);
  end loop;
  perform set_config('dwp.sys', '1', true);
  with wk as (select id from public.weeks where section_id = sec and start_date + 6 >= tz and public.version_for(sec, start_date) = p_version)
  update public.plan_entries e set subject_id = s.subject_id, teacher_id = s.teacher_id
    from public.timetable_slots s
    where e.week_id in (select id from wk) and s.version_id = p_version and s.class_id = e.class_id and s.day = e.day and s.period = e.period and not e.override
      and (p_class is null or e.class_id = p_class) and (p_day is null or e.day = p_day) and (p_period is null or e.period = p_period)
      and e.subject_id is distinct from s.subject_id and e.topic = '' and e.homework = '' and e.note = '';
  get diagnostics b = row_count;
  select count(*) into c from public.plan_entries e join public.timetable_slots s on s.version_id = p_version and s.class_id = e.class_id and s.day = e.day and s.period = e.period
    where e.week_id in (select id from public.weeks where section_id = sec and start_date + 6 >= tz and public.version_for(sec, start_date) = p_version)
      and (p_class is null or e.class_id = p_class) and (p_day is null or e.day = p_day) and (p_period is null or e.period = p_period)
      and e.subject_id is distinct from s.subject_id and not e.override;
  perform set_config('dwp.sys', '', true);
  return jsonb_build_object('teacher_fixed', a, 'relocated', r, 'subject_changed', b, 'conflicts', c);
end $function$;

create or replace function public.slot_conflicts(p_section uuid)
returns table(entry_id uuid, week_number integer, class_id uuid, day smallint, period smallint, entry_subject uuid, slot_subject uuid, slot_teacher uuid, topic text, status text)
language sql stable security definer set search_path = public as $$
  select e.id, w.number, e.class_id, e.day, e.period, e.subject_id, s.subject_id, s.teacher_id, e.topic, e.status
  from public.weeks w
  left join public.timetable_versions tv on tv.id = w.timetable_version_id
  join public.plan_entries e on e.week_id = w.id
  join public.timetable_slots s on s.version_id = case when tv.id is not null and tv.status <> 'archived' then tv.id else public.version_for(w.section_id, w.start_date) end
    and s.class_id = e.class_id and s.day = e.day and s.period = e.period
  where w.section_id = p_section and public.is_member(p_section) and w.start_date + 6 >= (now() at time zone 'Asia/Riyadh')::date
    and e.subject_id is distinct from s.subject_id and not e.override
  order by w.number, e.class_id, e.day, e.period
$$;

-- تعديل خلية في أسبوع واحد: مادة/معلم مختلفان، مع إبقاء ما كتبه المعلم أو حذفه (يُحفظ في سجل التعديلات)
create or replace function public.edit_week_cell(p_week uuid, p_class uuid, p_day int, p_period int, p_subject uuid, p_teacher uuid, p_content text default 'keep', p_reset boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w record; e record; s record; ver uuid; r jsonb; ns uuid; nt uuid;
begin
  select * into w from public.weeks where id = p_week;
  if w.id is null then raise exception 'الأسبوع غير موجود'; end if;
  if coalesce(w.archived, false) then raise exception 'الأسبوع مؤرشف'; end if;
  if not (public.is_owner() or public.has_perm(w.section_id, 'timetable_edit')) then raise exception 'ليست لديك صلاحية تعديل الجدول'; end if;
  if not exists (select 1 from public.classes where id = p_class and section_id = w.section_id) then raise exception 'الفصل غير موجود'; end if;
  if p_teacher is not null and not exists (select 1 from public.staff where id = p_teacher and school_id = public.my_school()) then raise exception 'المعلم غير موجود'; end if;
  if p_subject is not null and not exists (select 1 from public.subjects where id = p_subject and school_id = public.my_school()) then raise exception 'المادة غير موجودة'; end if;
  select * into e from public.plan_entries where week_id = p_week and class_id = p_class and day = p_day and period = p_period;
  if e.id is null then
    insert into public.plan_entries(week_id, class_id, day, period, subject_id, teacher_id) values (p_week, p_class, p_day, p_period, null, null) returning * into e;
  end if;
  if p_reset then
    ver := coalesce((select id from public.timetable_versions where id = w.timetable_version_id and status <> 'archived'), public.version_for(w.section_id, w.start_date));
    select * into s from public.timetable_slots where version_id = ver and class_id = p_class and day = p_day and period = p_period;
    ns := s.subject_id; nt := s.teacher_id;
  else ns := p_subject; nt := p_teacher; end if;
  insert into public.audit_log(staff_id, section_id, action, entity, entity_id, details) values (public.me(), w.section_id, case when p_reset then 'week_cell_reset' else 'week_cell_edit' end, 'plan_entries', e.id,
    jsonb_build_object('week', w.number, 'content', p_content, 'old', jsonb_build_object('subject_id', e.subject_id, 'teacher_id', e.teacher_id, 'topic', e.topic, 'homework', e.homework, 'note', e.note, 'perf_task', e.perf_task, 'status', e.status), 'new', jsonb_build_object('subject_id', ns, 'teacher_id', nt)));
  perform set_config('dwp.sys', '1', true);
  if p_content = 'clear' then
    update public.plan_entries set subject_id = ns, teacher_id = nt, override = not p_reset, topic = '', homework = '', note = '', perf_task = null, status = 'empty', review_note = '',
      exec_status = 'pending', exec_note = '', exec_by = null, exec_at = null, submitted_at = null, approved_at = null, updated_at = now() where id = e.id returning to_jsonb(plan_entries.*) into r;
  else
    update public.plan_entries set subject_id = ns, teacher_id = nt, override = not p_reset, updated_at = now() where id = e.id returning to_jsonb(plan_entries.*) into r;
  end if;
  perform set_config('dwp.sys', '', true);
  if nt is not null then insert into public.memberships(staff_id, section_id, role) select nt, w.section_id, 'teacher' where not exists (select 1 from public.memberships where staff_id = nt and section_id = w.section_id); end if;
  return r;
end $$;
grant execute on function public.edit_week_cell(uuid, uuid, int, int, uuid, uuid, text, boolean) to authenticated;

create or replace function public.assign_teacher(p_class uuid, p_subject uuid, p_teacher uuid)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare sec uuid; ver uuid; n1 int; n2 int;
begin
  select section_id into sec from public.classes where id = p_class;
  if sec is null or not public.has_perm(sec,'timetable_edit') then raise exception 'ليست لديك صلاحية إسناد المعلمين'; end if;
  if p_teacher is not null and not exists(select 1 from public.staff where id = p_teacher and school_id = public.my_school()) then
    raise exception 'المعلم غير موجود'; end if;
  select id into ver from public.timetable_versions where section_id = sec and status = 'approved';
  update public.timetable_slots set teacher_id = p_teacher
    where version_id = ver and class_id = p_class and subject_id = p_subject;
  get diagnostics n1 = row_count;
  update public.plan_entries e set teacher_id = p_teacher
    from public.weeks w
    where w.id = e.week_id and w.status = 'open' and e.class_id = p_class and e.subject_id = p_subject and e.status <> 'approved' and not e.override;
  get diagnostics n2 = row_count;
  if p_teacher is not null then
    insert into public.memberships(staff_id, section_id, role) values (p_teacher, sec, 'teacher') on conflict do nothing;
  end if;
  insert into public.audit_log(staff_id, section_id, action, entity, entity_id, details)
    values (public.me(), sec, 'assign', 'classes', p_class, jsonb_build_object('subject_id', p_subject, 'teacher_id', p_teacher));
  return jsonb_build_object('slots', n1, 'entries', n2);
end $function$;
select 'ok';
