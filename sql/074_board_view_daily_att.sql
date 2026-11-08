-- 074: شاشة العرض تشمل الحضور اليومي (اليوم كاملاً) مع حضور الحصص، وتوزيع الغياب حسب الفصل — قراءة فقط
create or replace function public.board_view(p_token text)
 returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare t record; sec record; tz date := (now() at time zone 'Asia/Riyadh')::date; d int; brd jsonb; sb jsonb; nm jsonb;
begin
  select * into t from public.board_tokens where token = p_token and active; if t.token is null then raise exception 'invalid'; end if;
  select * into sec from public.sections where id = t.section_id; d := extract(dow from tz)::int;
  select data into brd from public.daily_boards where section_id = t.section_id and day = tz;
  select jsonb_object_agg(id, full_name) into nm from public.staff where school_id = t.school_id;
  sb := coalesce((select jsonb_agg(jsonb_build_object('p', split_part(k, '|', 2)::int, 'names', (select coalesce(jsonb_agg(nm->>(x)), '[]'::jsonb) from jsonb_array_elements_text(v) x where x is not null and x <> 'null')) order by split_part(k, '|', 2)::int)
          from jsonb_each(coalesce(sec.standby->'roster', '{}'::jsonb)) r(k, v) where split_part(k, '|', 1)::int = d), '[]'::jsonb);
  return jsonb_build_object('school', (select name from public.schools where id = t.school_id), 'section', sec.name, 'day', tz, 'now', to_char(now() at time zone 'Asia/Riyadh', 'HH24:MI'), 'dow', d,
    'board', coalesce(brd, '{}'::jsonb), 'bell', sec.bell, 'periods', sec.periods, 'standby', sb,
    'cover', coalesce((select jsonb_agg(jsonb_build_object('p', s.period, 'cls', c.name, 'sub', nm->>(s.sub_teacher::text), 'abs', nm->>(s.absent_teacher::text), 'subj', (select name from public.subjects where id = s.subject_id)) order by s.period, c.name) from public.substitutions s join public.classes c on c.id = s.class_id where s.section_id = t.section_id and s.day = tz), '[]'::jsonb),
    'absentStaff', coalesce((select jsonb_agg(distinct nm->>(s.absent_teacher::text)) from public.substitutions s where s.section_id = t.section_id and s.day = tz and s.absent_teacher is not null), '[]'::jsonb),
    'att', (select jsonb_build_object('students', (select count(*) from public.students st join public.classes c on c.id = st.class_id where c.section_id = t.section_id and st.active),
       'absent', count(distinct student_id) filter (where status = 'absent'), 'late', count(distinct student_id) filter (where status = 'late'), 'excused', count(distinct student_id) filter (where status = 'excused'), 'early', count(distinct student_id) filter (where status = 'early'),
       'recorded', count(distinct student_id),
       'periods', (select count(distinct class_id::text || period::text) from public.period_attendance where section_id = t.section_id and day = tz),
       'cls', coalesce((select jsonb_agg(jsonb_build_object('n', c.name, 't', (select count(*) from public.students st where st.class_id = c.id and st.active),
                 'a', (select count(distinct x.sid) from (select pa.student_id sid from public.period_attendance pa where pa.class_id = c.id and pa.day = tz and pa.status = 'absent' union select a.student_id from public.attendance a where a.class_id = c.id and a.day = tz and a.status = 'absent') x)) order by c.sort, c.name)
               from public.classes c where c.section_id = t.section_id and c.active), '[]'::jsonb))
       from (select student_id, status from public.period_attendance where section_id = t.section_id and day = tz
             union all select a.student_id, a.status from public.attendance a join public.classes c on c.id = a.class_id where c.section_id = t.section_id and a.day = tz) u),
    'duty', coalesce((select jsonb_agg(jsonb_build_object('place', x->>'place', 'name', coalesce(nm->>(x->>'staff'), x->>'name'))) from jsonb_array_elements(coalesce(brd->'duty', '[]'::jsonb)) x), '[]'::jsonb),
    'staffOff', coalesce((select jsonb_agg(coalesce(nm->>(x->>'staff'), x->>'name') || coalesce(' — ' || nullif(x->>'reason',''), '')) from jsonb_array_elements(coalesce(brd->'staffOff', '[]'::jsonb)) x), '[]'::jsonb));
end $function$;
