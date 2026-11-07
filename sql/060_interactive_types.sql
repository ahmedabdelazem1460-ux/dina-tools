-- 060: أنواع أسئلة تفاعلية: أكمل الفراغات (blank) · صل/مزاوجة (match) · ترتيب (order) — تصحيح آلي بدرجات جزئية
alter table public.questions drop constraint if exists questions_qtype_check;
alter table public.questions add constraint questions_qtype_check check (qtype = any (array['mcq','tf','short','essay','blank','match','order']));

create or replace function public.quiz_public(p_code text) returns jsonb language plpgsql stable security definer set search_path to 'public' as $F$
declare q record; tz timestamptz := now(); qs jsonb; st text;
begin
  select * into q from public.quizzes where code = p_code;
  if q.id is null or q.status = 'draft' then return jsonb_build_object('error', 'الرابط غير صالح'); end if;
  st := case when q.status = 'closed' or (q.settings->>'close_at' is not null and (q.settings->>'close_at')::timestamptz < tz) then 'closed'
             when q.settings->>'open_at' is not null and (q.settings->>'open_at')::timestamptz > tz then 'not_open' else 'open' end;
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'type', x.qtype, 'body', x.body, 'image', x.image_url, 'points', x.points,
           'options', case when x.qtype = 'mcq' then (select coalesce(jsonb_agg(o->>'t' order by i), '[]') from jsonb_array_elements(x.options) with ordinality as e(o, i)) else '[]'::jsonb end,
           'blanks', case when x.qtype = 'blank' then jsonb_array_length(coalesce(x.options,'[]')) end,
           'bank', case when x.qtype = 'blank' and x.answer = 'bank' then (select jsonb_agg(split_part(o->>'t', '|', 1) order by md5((o->>'t') || x.id::text)) from jsonb_array_elements(x.options) o) end,
           'left', case when x.qtype = 'match' then (select jsonb_agg(o->>'t' order by i) from jsonb_array_elements(x.options) with ordinality e(o, i)) end,
           'right', case when x.qtype = 'match' then (select jsonb_agg(o->>'m' order by md5((o->>'m') || x.id::text)) from jsonb_array_elements(x.options) o) end,
           'items', case when x.qtype = 'order' then (select jsonb_agg(o->>'t' order by md5((o->>'t') || x.id::text)) from jsonb_array_elements(x.options) o) end
         ) order by array_position(q.question_ids, x.id)), '[]')
    into qs from public.questions x where x.id = any(q.question_ids);
  return jsonb_build_object('title', q.title, 'kind', q.kind, 'state', st, 'subject', (select name from public.subjects where id = q.subject_id),
    'school', (select name from public.schools where id = q.school_id), 'teacher', (select full_name from public.staff where id = q.teacher_id),
    'settings', q.settings - 'answers', 'classes', (select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name) order by c.sort), '[]') from public.classes c where c.id = any(q.class_ids)),
    'questions', case when st = 'open' then qs else '[]'::jsonb end);
end $F$;

create or replace function public.quiz_submit(p_code text, p_name text, p_class uuid, p_no text, p_answers jsonb) returns jsonb language plpgsql security definer set search_path to 'public' as $F$
declare q record; x record; tot numeric := 0; mx numeric := 0; per jsonb := '{}'; a text; ok boolean; pend boolean := false; n int; lim int; rev jsonb := '[]'; nm text := btrim(regexp_replace(coalesce(p_name,''), '\s+', ' ', 'g'));
  aj jsonb; cnt int; tn int; pts numeric; ansT text;
begin
  select * into q from public.quizzes where code = p_code;
  if q.id is null or q.status <> 'published' then raise exception 'الاختبار غير متاح'; end if;
  if q.settings->>'close_at' is not null and (q.settings->>'close_at')::timestamptz < now() then raise exception 'انتهى وقت الاختبار'; end if;
  if length(nm) < 5 then raise exception 'اكتب اسمك الكامل'; end if;
  if cardinality(q.class_ids) > 0 and not (p_class = any(q.class_ids)) then raise exception 'اختر فصلك'; end if;
  lim := coalesce((q.settings->>'attempts')::int, 1);
  select count(*) into n from public.quiz_attempts where quiz_id = q.id and public.norm_ans(student_name) = public.norm_ans(nm) and class_id is not distinct from p_class;
  if lim > 0 and n >= lim then raise exception 'استنفدت عدد المحاولات المسموح'; end if;
  for x in select * from public.questions where id = any(q.question_ids) loop
    a := p_answers->>(x.id::text); mx := mx + x.points; ok := null; pts := 0; ansT := x.answer;
    if x.qtype in ('blank','match','order') then
      begin aj := case when a is not null and left(btrim(a),1) = '[' then a::jsonb else '[]'::jsonb end; exception when others then aj := '[]'::jsonb; end;
      tn := jsonb_array_length(coalesce(x.options,'[]')); cnt := 0;
      if x.qtype = 'blank' then
        select count(*) into cnt from jsonb_array_elements(x.options) with ordinality e(o, i) where public.norm_ans(aj->>(i::int - 1)) <> '' and public.norm_ans(aj->>(i::int - 1)) = any(select public.norm_ans(t) from unnest(string_to_array(o->>'t', '|')) t);
        select string_agg(split_part(o->>'t','|',1), ' · ' order by i) into ansT from jsonb_array_elements(x.options) with ordinality e(o, i);
      elsif x.qtype = 'match' then
        select count(*) into cnt from jsonb_array_elements(x.options) with ordinality e(o, i) where public.norm_ans(aj->>(i::int - 1)) = public.norm_ans(o->>'m');
        select string_agg((o->>'t') || ' ← ' || (o->>'m'), ' · ' order by i) into ansT from jsonb_array_elements(x.options) with ordinality e(o, i);
      else
        select count(*) into cnt from jsonb_array_elements(x.options) with ordinality e(o, i) where public.norm_ans(aj->>(i::int - 1)) = public.norm_ans(o->>'t');
        select string_agg(o->>'t', ' ← ' order by i) into ansT from jsonb_array_elements(x.options) with ordinality e(o, i);
      end if;
      if tn > 0 then pts := round(x.points * cnt / tn, 2); ok := cnt = tn; end if;
      tot := tot + pts;
    else
      if x.qtype = 'mcq' then ok := a is not null and coalesce((x.options->(a::int))->>'ok', 'false')::boolean;
      elsif x.qtype = 'tf' then ok := a is not null and public.norm_ans(a) = public.norm_ans(x.answer);
      elsif x.qtype = 'short' then ok := a is not null and public.norm_ans(a) = any(select public.norm_ans(t) from unnest(string_to_array(x.answer, '|')) t);
      else pend := pend or coalesce(a,'') <> ''; end if;
      if ok then pts := x.points; tot := tot + x.points; end if;
      if x.qtype = 'mcq' then ansT := (select (i - 1)::text from jsonb_array_elements(x.options) with ordinality e(o, i) where (o->>'ok')::boolean limit 1); end if;
    end if;
    per := per || jsonb_build_object(x.id::text, jsonb_build_object('ok', ok, 'pts', pts));
    rev := rev || jsonb_build_object('id', x.id, 'ok', ok, 'pts', pts, 'answer', ansT, 'explanation', x.explanation);
  end loop;
  insert into public.quiz_attempts(quiz_id, student_name, student_no, class_id, answers, per_q, score, max_score, pending_manual, attempt_no)
    values (q.id, nm, nullif(btrim(coalesce(p_no,'')),''), p_class, coalesce(p_answers,'{}'), per, tot, mx, pend, n + 1);
  return jsonb_build_object('score', tot, 'max', mx, 'pending', pend, 'attempt', n + 1, 'left', case when lim > 0 then lim - n - 1 else null end,
    'review', case when coalesce(q.settings->>'show', 'after_submit') = 'after_submit' then rev else null end);
end $F$;
select 'ok'