-- 110a — نافذة الأسابيع لأولياء الأمور قابلة للضبط من الإعدادات
-- المشكلة: parent_plan و portal_student_data كانا يُظهران الأسابيع حتى «اليوم + ٧ أيام» فقط،
-- فالأسبوع المنشور بعد إجازة (مثل الثالث عشر يبدأ 29/11) لا يظهر.
-- الآن: الأسابيع المنشورة القادمة تظهر حتى planAhead يوماً (الافتراضي ٣٠، و -1 = بلا حد)،
-- والماضية حتى planPast يوماً (الافتراضي ٢٨)، وبعد انتهاء أيام الأسبوع الحالي يُفتح التالي المنشور تلقائياً (planNext).
-- الإعدادات: schools.settings.portal.plan = {past, ahead, next}

create or replace function public.portal_win(p_school uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('past', 28, 'ahead', 30, 'next', true)
    || coalesce((select settings->'portal'->'plan' from public.schools where id = p_school), '{}'::jsonb)
$$;

-- هل الأسبوع ظاهر لأولياء الأمور؟
create or replace function public.portal_week_ok(w public.weeks, p_school uuid)
returns boolean language plpgsql stable security definer set search_path to 'public' as $$
declare cf jsonb := public.portal_win(p_school); tz date := (now() at time zone 'Asia/Riyadh')::date;
  past int := coalesce((cf->>'past')::int, 28); ahead int := coalesce((cf->>'ahead')::int, 30);
begin
  if w.id is null then return false; end if;
  return w.start_date between tz - past and tz + 7
      or (w.status = 'published' and w.start_date > tz and (ahead < 0 or w.start_date <= tz + ahead));
end $$;

-- الأسبوع الافتراضي لقسم: الحالي، أو التالي الظاهر إن انتهت أيام الحالي، أو أول قادم
create or replace function public.portal_default_week(p_section uuid)
returns uuid language plpgsql stable security definer set search_path to 'public' as $$
declare sch uuid; ndays int; cf jsonb; tz date := (now() at time zone 'Asia/Riyadh')::date; cur public.weeks; nx uuid;
begin
  select school_id, coalesce(days, 5) into sch, ndays from public.sections where id = p_section;
  cf := public.portal_win(sch);
  select * into cur from public.weeks w where w.section_id = p_section and w.start_date <= tz and public.portal_week_ok(w, sch)
    order by w.start_date desc, w.archived limit 1;
  if cur.id is not null and (not coalesce((cf->>'next')::boolean, true) or tz < cur.start_date + ndays) then return cur.id; end if;
  select w.id into nx from public.weeks w where w.section_id = p_section and w.start_date > coalesce(cur.start_date, tz - 1)
    and public.portal_week_ok(w, sch) order by w.start_date, w.archived limit 1;
  return coalesce(nx, cur.id);
end $$;

create or replace function public.parent_plan(p_token text, p_class uuid, p_week uuid default null)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare sch uuid; c record; w record; wid uuid; tz date := (now() at time zone 'Asia/Riyadh')::date;
begin
  select school_id into sch from public.parent_links where token = p_token and active;
  if sch is null then raise exception 'الرابط غير صالح أو متوقف'; end if;
  select cl.id, cl.name, cl.section_id, s.days, s.school_id into c from public.classes cl join public.sections s on s.id = cl.section_id where cl.id = p_class;
  if not found or c.school_id <> sch then raise exception 'الفصل غير موجود'; end if;
  if p_week is not null then select w0.id into wid from public.weeks w0 where w0.id = p_week and w0.section_id = c.section_id and public.portal_week_ok(w0, sch); end if;
  if wid is null then wid := public.portal_default_week(c.section_id); end if;
  select * into w from public.weeks where id = wid;
  return jsonb_build_object(
    'class', jsonb_build_object('id', c.id, 'name', c.name, 'days', c.days),
    'today', tz,
    'weeks', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'word', x.word, 'start', x.start_date) order by x.start_date)
       from (select distinct on (w1.start_date) w1.id, w1.word, w1.start_date from public.weeks w1 where w1.section_id = c.section_id and public.portal_week_ok(w1, sch) order by w1.start_date, w1.archived) x), '[]'),
    'week', case when wid is null then null else jsonb_build_object('id', w.id, 'word', w.word, 'start', w.start_date, 'holidays', w.holidays) end,
    'entries', coalesce((select jsonb_agg(jsonb_build_object('day', e.day, 'period', e.period, 'subject', sb.name, 'topic', e.topic, 'homework', e.homework, 'note', e.note) order by e.day, e.period)
       from public.plan_entries e join public.subjects sb on sb.id = e.subject_id
       where e.week_id = wid and e.class_id = c.id and e.status = 'approved'), '[]'),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('day', n.day, 'placement', n.placement, 'title', n.title, 'body', n.body) order by n.day nulls last, n.created_at)
       from public.notes n where n.week_id = wid and (n.class_id = c.id or n.class_id is null)), '[]'));
end $function$;
