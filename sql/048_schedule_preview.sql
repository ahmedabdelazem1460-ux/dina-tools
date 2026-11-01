-- 048: معاينة أثر جدولة الجدول على خطط المعلمين + التطبيق على أسابيع مختارة فقط
create or replace function public.preview_schedule(p_version uuid, p_from date, p_to date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare sec uuid; res jsonb := '[]'::jsonb; w record; filled int; tot int; ch int; mv int; st jsonb;
begin
  select section_id into sec from public.timetable_versions where id = p_version;
  if sec is null then raise exception 'الإصدار غير موجود'; end if;
  if not public.has_perm(sec, 'timetable_approve') then raise exception 'ليست لديك صلاحية اعتماد الجدول'; end if;
  for w in select id, number, word, start_date, status from public.weeks
           where section_id = sec and not coalesce(archived, false) and start_date >= p_from - 4 and (p_to is null or start_date <= p_to)
           order by start_date loop
    select count(*) filter (where topic <> '' or homework <> '' or note <> ''), count(*) into filled, tot from public.plan_entries where week_id = w.id;
    with snap as (
      select e.* from public.plan_entries e join public.timetable_slots s on s.version_id = p_version and s.class_id = e.class_id and s.day = e.day and s.period = e.period
      where e.week_id = w.id and e.subject_id is not null and e.subject_id is distinct from s.subject_id and (e.topic <> '' or e.homework <> '' or e.note <> '')
    ), src as (
      select id, class_id, subject_id, teacher_id, day, period, row_number() over (partition by class_id, subject_id order by day, period) rn from snap
    ), dst as (
      select e.id, e.class_id, s.subject_id, row_number() over (partition by e.class_id, s.subject_id order by e.day, e.period) rn
      from public.plan_entries e join public.timetable_slots s on s.version_id = p_version and s.class_id = e.class_id and s.day = e.day and s.period = e.period
      where e.week_id = w.id and s.subject_id is not null and e.subject_id is distinct from s.subject_id
        and ((e.topic = '' and e.homework = '' and e.note = '') or e.id in (select id from snap))
    ), j as (
      select src.*, dst.id dst_id from src left join dst on dst.class_id = src.class_id and dst.subject_id = src.subject_id and dst.rn = src.rn
    )
    select count(*), count(dst_id), coalesce(jsonb_agg(jsonb_build_object('t', teacher_id, 'c', class_id, 's', subject_id, 'd', day, 'p', period)) filter (where dst_id is null), '[]'::jsonb)
      into ch, mv, st from j;
    res := res || jsonb_build_array(jsonb_build_object('id', w.id, 'number', w.number, 'word', w.word, 'start', w.start_date, 'status', w.status,
      'filled', filled, 'total', tot, 'changed', ch, 'move', mv, 'stuck', st));
  end loop;
  return res;
end $$;

create or replace function public.schedule_timetable_v2(p_version uuid, p_from date, p_to date default null, p_weeks uuid[] default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare sec uuid; w record; n int := 0; nw int := 0;
begin
  select section_id into sec from public.timetable_versions where id = p_version and status = 'draft';
  if sec is null then raise exception 'الإصدار غير موجود أو ليس مسودة'; end if;
  if not public.has_perm(sec, 'timetable_approve') then raise exception 'ليست لديك صلاحية اعتماد الجدول'; end if;
  if p_from is null then raise exception 'حدد تاريخ البداية'; end if;
  if p_to is not null and p_to < p_from then raise exception 'تاريخ النهاية قبل البداية'; end if;
  update public.timetable_versions set scheduled = true, effective_from = p_from, effective_to = p_to, scheduled_by = public.me(), scheduled_at = now() where id = p_version;
  for w in select id from public.weeks where section_id = sec and status = 'open' and not coalesce(archived, false)
           and start_date >= p_from - 4 and (p_to is null or start_date <= p_to)
           and (p_weeks is null or id = any(p_weeks)) loop
    n := n + public.apply_version_to_week(w.id, p_version); nw := nw + 1;
  end loop;
  perform public.timetable_promote();
  return jsonb_build_object('weeks', nw, 'updated_entries', n);
end $$;

-- الأسابيع التي لم يُطبَّق عليها الجدول الجديد تُقارَن بجدولها الفعلي لا بالجدول الساري
create or replace function public.slot_conflicts(p_section uuid)
returns table(entry_id uuid, week_number integer, class_id uuid, day smallint, period smallint, entry_subject uuid, slot_subject uuid, slot_teacher uuid, topic text, status text)
language sql stable security definer set search_path = public as $$
  select e.id, w.number, e.class_id, e.day, e.period, e.subject_id, s.subject_id, s.teacher_id, e.topic, e.status
  from public.weeks w join public.plan_entries e on e.week_id = w.id
  join public.timetable_slots s on s.version_id = coalesce(w.timetable_version_id, public.version_for(w.section_id, w.start_date)) and s.class_id = e.class_id and s.day = e.day and s.period = e.period
  where w.section_id = p_section and public.is_member(p_section) and w.start_date + 6 >= (now() at time zone 'Asia/Riyadh')::date
    and e.subject_id is distinct from s.subject_id
  order by w.number, e.class_id, e.day, e.period
$$;
grant execute on function public.preview_schedule(uuid, date, date) to authenticated;
grant execute on function public.schedule_timetable_v2(uuid, date, date, uuid[]) to authenticated;
