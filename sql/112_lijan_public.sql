-- 112 — رابط أولياء الأمور للجان الاختبار (lijan.html)
-- الإعدادات في exam_committees.settings.share = {on, token (≥16), lookup 'id'|'none', proctors bool, photos bool, classes bool}
-- لا يكشف أسماء الطلاب: الصفحة العامة تعرض الجدول والكروكي وأعداد اللجان، والبحث عن مقعد طالب برقمه أو هويته فقط.

create or replace function public.lijan_row(p_token text)
returns public.exam_committees language sql stable security definer set search_path = public as $$
  select c.* from public.exam_committees c
  where length(coalesce(p_token, '')) >= 16
    and c.settings->'share'->>'token' = p_token
    and coalesce((c.settings->'share'->>'on')::boolean, false)
  limit 1 $$;

create or replace function public.lijan_public(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c public.exam_committees; sh jsonb; rooms jsonb := '[]'::jsonb; r jsonb; i int := 0; seat jsonb; n int; f text; l text; cls jsonb;
begin
  c := public.lijan_row(p_token);
  if c.id is null then raise exception 'الرابط غير صالح أو متوقف'; end if;
  sh := coalesce(c.settings->'share', '{}'::jsonb);
  for r in select value from jsonb_array_elements(coalesce(c.rooms, '[]'::jsonb)) loop
    select count(*) into n from jsonb_array_elements(coalesce(c.seating, '[]'::jsonb)) x where (x->>'room')::int = i;
    select (select x->>'label' from jsonb_array_elements(coalesce(c.seating, '[]'::jsonb)) x where (x->>'room')::int = i order by (x->>'seat')::int limit 1),
           (select x->>'label' from jsonb_array_elements(coalesce(c.seating, '[]'::jsonb)) x where (x->>'room')::int = i order by (x->>'seat')::int desc limit 1) into f, l;
    select coalesce(jsonb_agg(distinct cl.name), '[]'::jsonb) into cls from jsonb_array_elements(coalesce(c.seating, '[]'::jsonb)) x join public.classes cl on cl.id = (x->>'class_id')::uuid where (x->>'room')::int = i;
    rooms := rooms || jsonb_build_object(
      'name', r->>'name', 'w', r->'w', 'd', r->'d', 'x', r->'x', 'y', r->'y', 'f', r->'f', 'b', r->'b',
      'door', r->>'door', 'board', r->>'board', 'rows', r->'rows', 'cols', r->'cols', 'from', r->>'from', 'snake', r->'snake', 'color', r->>'color',
      'notes', r->>'notes', 'loc', r->>'loc',
      'photo', case when coalesce((sh->>'photos')::boolean, true) then r->>'photo' end,
      'proctors', case when coalesce((sh->>'proctors')::boolean, false) then (select jsonb_agg(s.full_name) from public.staff s where s.id::text in (r->>'proctor', r->>'proctor2')) end,
      'classes', case when coalesce((sh->>'classes')::boolean, true) then cls end,
      'n', n, 'first', f, 'last', l);
    i := i + 1;
  end loop;
  return jsonb_build_object(
    'title', c.title, 'school', (select name from public.schools where id = c.school_id),
    'section', (select name from public.sections where id = c.section_id),
    'sched', coalesce(c.settings->'sched', '[]'::jsonb), 'map', coalesce(c.settings->'map', '{}'::jsonb),
    'msg', sh->>'msg', 'lookup', coalesce(sh->>'lookup', 'id'), 'rooms', rooms, 'total', jsonb_array_length(coalesce(c.seating, '[]'::jsonb)));
end $$;

create or replace function public.lijan_find(p_token text, p_q text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare c public.exam_committees; q text := btrim(translate(coalesce(p_q, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789')); x jsonb; st public.students;
begin
  if public.portal_blocked() then raise exception 'محاولات كثيرة — حاول بعد ربع ساعة'; end if;
  c := public.lijan_row(p_token);
  if c.id is null then raise exception 'الرابط غير صالح أو متوقف'; end if;
  if coalesce(c.settings->'share'->>'lookup', 'id') = 'none' then raise exception 'البحث غير متاح'; end if;
  if length(q) < 3 then raise exception 'أدخل رقم الطالب أو هويته'; end if;
  select s.* into st from public.students s
   where s.school_id = c.school_id and (s.student_no = q or s.national_id = q)
     and exists (select 1 from jsonb_array_elements(coalesce(c.seating, '[]'::jsonb)) e where e->>'student_id' = s.id::text) limit 1;
  if st.id is null then perform public.portal_blocked(true); return null; end if;
  select e into x from jsonb_array_elements(c.seating) e where e->>'student_id' = st.id::text limit 1;
  return jsonb_build_object('name', st.full_name, 'cls', (select name from public.classes where id = st.class_id),
    'room', (x->>'room')::int, 'label', x->>'label', 'seat', (x->>'seat')::int,
    'k', (select count(*) from jsonb_array_elements(c.seating) e where (e->>'room')::int = (x->>'room')::int and (e->>'seat')::int < (x->>'seat')::int));
end $$;

revoke all on function public.lijan_row(text) from public, anon, authenticated;
grant execute on function public.lijan_public(text) to anon, authenticated;
grant execute on function public.lijan_find(text, text) to anon, authenticated;
