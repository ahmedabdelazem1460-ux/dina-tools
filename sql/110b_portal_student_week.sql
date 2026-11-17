-- 110b — بوابة ولي الأمر بالحساب (family.html) وبوابة الطالب: نفس قاعدة الأسابيع القادمة المنشورة
create or replace function public.portal_student_data(p_student uuid, p_week uuid default null)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $function$
declare st record; cl record; w record; d0 date := (now() at time zone 'Asia/Riyadh')::date;
begin
  select * into st from public.students where id = p_student and active;
  if st.id is null then raise exception 'INACTIVE'; end if;
  select * into cl from public.classes where id = st.class_id;
  if p_week is not null then select * into w from public.weeks where id = p_week and section_id = cl.section_id;
  else select * into w from public.weeks where id = public.portal_default_week(cl.section_id) and not coalesce(archived, false);
    if w.id is null then select * into w from public.weeks where section_id = cl.section_id and not coalesce(archived, false) and start_date <= d0 order by start_date desc limit 1; end if;
  end if;
  return jsonb_build_object(
    'student', jsonb_build_object('id', st.id, 'name', st.full_name, 'no', st.student_no, 'class', cl.name, 'class_id', cl.id, 'grade', cl.grade_word, 'stage', cl.stage),
    'school', (select name from public.schools where id = st.school_id),
    'section', (select name from public.sections where id = cl.section_id),
    'week', case when w.id is null then null else jsonb_build_object('id', w.id, 'word', w.word, 'start', w.start_date) end,
    'weeks', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'word', x.word, 'start', x.start_date) order by x.start_date) from public.weeks x where x.section_id = cl.section_id and not coalesce(x.archived, false) and x.status in ('published','open')
        and (x.start_date <= d0 + 7 or public.portal_week_ok(x, st.school_id))), '[]'),
    'plan', case when w.id is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('day', e.day, 'period', e.period, 'subject', (select name from public.subjects where id = e.subject_id), 'topic', e.topic, 'homework', e.homework, 'perf', e.perf_task) order by e.day, e.period)
      from public.plan_entries e where e.week_id = w.id and e.class_id = cl.id and e.subject_id is not null and (w.status = 'published' or e.status = 'approved') and (coalesce(e.topic,'') <> '' or coalesce(e.homework,'') <> '')), '[]') end,
    'quizzes', coalesce((select jsonb_agg(jsonb_build_object('title', z.title, 'kind', z.kind, 'code', z.code, 'subject', (select name from public.subjects where id = z.subject_id), 'close', z.settings->>'close_at',
        'done', (select count(*) from public.quiz_attempts a where a.quiz_id = z.id and a.class_id = cl.id and (public.norm_ans(a.student_name) = public.norm_ans(st.full_name) or (st.student_no is not null and a.student_no = st.student_no))))
      order by z.created_at desc) from public.quizzes z where z.status = 'published' and cl.id = any(z.class_ids) and (z.settings->>'close_at' is null or (z.settings->>'close_at')::timestamptz > now())), '[]'),
    'results', coalesce((select jsonb_agg(jsonb_build_object('title', z.title, 'kind', z.kind, 'score', a.score, 'max', a.max_score, 'pending', a.pending_manual, 'at', a.submitted_at) order by a.submitted_at desc)
      from public.quiz_attempts a join public.quizzes z on z.id = a.quiz_id where a.class_id = cl.id and (public.norm_ans(a.student_name) = public.norm_ans(st.full_name) or (st.student_no is not null and a.student_no = st.student_no))), '[]'),
    'resources', coalesce((select jsonb_agg(jsonb_build_object('title', r.title, 'url', r.url, 'kind', r.kind, 'subject', (select name from public.subjects where id = r.subject_id), 'note', r.note) order by r.created_at desc)
      from public.resources r where r.school_id = st.school_id and r.visible_to_parents and (r.class_ids is null or cardinality(r.class_ids) = 0 or cl.id = any(r.class_ids)) and (r.section_id is null or r.section_id = cl.section_id)), '[]'));
end $function$;
