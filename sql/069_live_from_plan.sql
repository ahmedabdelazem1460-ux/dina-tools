-- 069: حصص التعليم عن بعد تأخذ الدرس والواجب والملاحظة والمهمة الأدائية تلقائياً من الخطة الأسبوعية (دون أي تعديل عليها)
-- ويضيف المعلم رابط الدرس وعناصر إضافية (ملاحظات، مهام أدائية، أوراق عمل، تجهيزات…)
alter table public.live_entries add column if not exists extra jsonb not null default '[]'::jsonb;

create or replace function public.save_live_extra(p_ds uuid, p_class uuid, p_day int, p_period int, p_extra jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d record; t uuid; ex jsonb := '[]'::jsonb; it jsonb; u text; r jsonb;
begin
  select * into d from public.display_schedules where id = p_ds;
  if d.id is null then raise exception 'not found'; end if;
  select nullif(x->>'t','')::uuid into t from jsonb_array_elements(d.slots) x where (x->>'c')::uuid = p_class and (x->>'d')::int = p_day and (x->>'p')::int = p_period limit 1;
  if not found then raise exception 'no such period'; end if;
  if not (t = public.me() or public.is_owner() or public.has_perm(d.section_id, 'review') or public.has_perm(d.section_id, 'timetable_approve')) then raise exception 'not your period'; end if;
  if jsonb_typeof(coalesce(p_extra, '[]'::jsonb)) <> 'array' then raise exception 'bad extra'; end if;
  for it in select * from jsonb_array_elements(coalesce(p_extra, '[]'::jsonb)) limit 12 loop
    u := left(btrim(coalesce(it->>'u', '')), 600);
    if u <> '' and u !~* '^https?://' then raise exception 'link must start with https://'; end if;
    if btrim(coalesce(it->>'t', '')) = '' and u = '' then continue; end if;
    ex := ex || jsonb_build_array(jsonb_build_object('k', left(coalesce(it->>'k', 'other'), 12), 't', left(btrim(coalesce(it->>'t', '')), 400), 'u', u));
  end loop;
  insert into public.live_entries(ds_id, class_id, day, period, extra, teacher_id, updated_by, updated_at)
    values (p_ds, p_class, p_day, p_period, ex, t, public.me(), now())
    on conflict (ds_id, class_id, day, period) do update set extra = excluded.extra, updated_by = excluded.updated_by, updated_at = now()
    returning to_jsonb(live_entries.*) into r;
  return r;
end $$;
grant execute on function public.save_live_extra(uuid, uuid, int, int, jsonb) to authenticated;

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
          from (select pe.topic, pe.homework, pe.note, pe.perf_task, pe.status, row_number() over (order by pe.period) - 1 rn
                from public.plan_entries pe join public.weeks w on w.id = pe.week_id
                where w.section_id = d.section_id and not coalesce(w.archived, false)
                  and w.start_date <= (d.date_from - extract(dow from d.date_from)::int + (x->>'d')::int)
                  and (d.date_from - extract(dow from d.date_from)::int + (x->>'d')::int) < w.start_date + 7
                  and pe.class_id = p_class and pe.day = (x->>'d')::int and pe.subject_id = nullif(x->>'s', '')::uuid) z
          order by abs(z.rn - (select count(*) from jsonb_array_elements(d.slots) y where y->>'c' = x->>'c' and y->>'d' = x->>'d' and y->>'s' = x->>'s' and (y->>'p')::int < (x->>'p')::int)), z.rn
          limit 1) pl on true
        where (x->>'c')::uuid = p_class and (x->>'s' is not null or x->>'sn' is not null)), '[]'::jsonb))
      order by d.date_from)
    from public.display_schedules d where d.section_id = sec and d.published and d.date_to >= tz and d.date_from <= tz + 7), '[]'::jsonb));
end $$;
grant execute on function public.parent_live(text, uuid) to anon, authenticated;
