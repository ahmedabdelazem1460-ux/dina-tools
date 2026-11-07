-- 070: ربط حصص التعليم عن بعد بالخطة الأسبوعية بترتيب حصص المادة في الأسبوع (اليوم ثم رقم الحصة) — قراءة فقط
-- الدرس رقم k للمادة في أيام التعلم عن بعد ← الحصة رقم k للمادة في الجدول عن بعد. يُحسب عند كل عرض، فيتجدد تلقائياً بعد أي تعديل أو تسكين.
create or replace function public.parent_live(p_token text, p_class uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare sch uuid; sec uuid; tz date := (now() at time zone 'Asia/Riyadh')::date;
begin
  select school_id into sch from public.parent_links where token = p_token and active;
  if sch is null then raise exception 'invalid link'; end if;
  select cl.section_id into sec from public.classes cl join public.sections s on s.id = cl.section_id where cl.id = p_class and s.school_id = sch;
  if sec is null then raise exception 'class not found'; end if;
  return jsonb_build_object('today', tz, 'now', to_char(now() at time zone 'Asia/Riyadh', 'HH24:MI'), 'list', coalesce((
    select jsonb_agg(jsonb_build_object('id', d.id, 'label', d.label, 'tag', d.tag, 'from', d.date_from, 'to', d.date_to, 'meta', d.meta,
      'cls_link', d.links->'cls'->>p_class::text,
      'cells', coalesce((select jsonb_agg(jsonb_build_object('d', (x->>'d')::int, 'p', (x->>'p')::int,
          'subject', coalesce((select name from public.subjects where id = nullif(x->>'s','')::uuid), x->>'sn'),
          'teacher', coalesce((select full_name from public.staff where id = nullif(x->>'t','')::uuid), nullif(x->>'tn', '')),
          'link', coalesce(nullif(d.links->'cell'->>(p_class::text || '|' || (x->>'d') || '|' || (x->>'p')), ''), nullif(d.links->'cls'->>p_class::text, ''), nullif(d.links->'tch'->>(x->>'t'), '')),
          'topic', coalesce(nullif(btrim(le.topic), ''), pl.topic), 'homework', coalesce(nullif(btrim(le.homework), ''), pl.homework),
          'note', coalesce(nullif(btrim(le.note), ''), pl.note), 'llink', nullif(le.link, ''),
          'perf', nullif(btrim(coalesce(pl.perf_task->>'text', '') || case when coalesce(pl.perf_task->>'due', '') <> '' then ' — التسليم: ' || (pl.perf_task->>'due') else '' end), ''),
          'extra', coalesce(le.extra, '[]'::jsonb)))
        from jsonb_array_elements(d.slots) x
        left join public.live_entries le on le.ds_id = d.id and le.class_id = p_class and le.day = (x->>'d')::int and le.period = (x->>'p')::int
        left join lateral (
          select case when z.status = 'approved' then z.topic end topic, case when z.status = 'approved' then z.homework end homework,
                 case when z.status = 'approved' then z.note end note, case when z.status = 'approved' then z.perf_task end perf_task
          from (select pe.topic, pe.homework, pe.note, pe.perf_task, pe.status, row_number() over (order by pe.day, pe.period) - 1 rn
                from public.plan_entries pe join public.weeks w on w.id = pe.week_id
                where w.section_id = d.section_id and not coalesce(w.archived, false)
                  and w.start_date <= r.ws + 3 and r.ws + 3 < w.start_date + 7
                  and pe.class_id = p_class and pe.subject_id = nullif(x->>'s', '')::uuid and pe.day = any(r.rd)) z
          where (x->>'d')::int = any(r.rd)
            and z.rn = (select count(*) from jsonb_array_elements(d.slots) y
                        where y->>'c' = x->>'c' and y->>'s' = x->>'s' and (y->>'d')::int = any(r.rd)
                          and ((y->>'d')::int, (y->>'p')::int) < ((x->>'d')::int, (x->>'p')::int))
          limit 1) pl on true
        where (x->>'c')::uuid = p_class and (x->>'s' is not null or x->>'sn' is not null)), '[]'::jsonb))
      order by d.date_from)
    from public.display_schedules d
    cross join lateral (select q.ws, array(select dd from unnest(coalesce((select array_agg(v::int) from jsonb_array_elements_text(case when jsonb_typeof(d.meta->'days') = 'array' then d.meta->'days' else '[0,1,2,3,4]'::jsonb end) v), array[0,1,2,3,4])) dd where q.ws + dd between d.date_from and d.date_to) rd
      from (select greatest(d.date_from - extract(dow from d.date_from)::int, least(d.date_to - extract(dow from d.date_to)::int, tz - extract(dow from tz)::int)) ws) q) r
    where d.section_id = sec and d.published and d.date_to >= tz and d.date_from <= tz + 7), '[]'::jsonb));
end $$;
grant execute on function public.parent_live(text, uuid) to anon, authenticated;
