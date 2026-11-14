-- 103: حسابات أولياء الأمور برمز عائلة + بوابة ولي الأمر في me.html + حماية من التخمين
-- رمز واحد لكل جوال ولي أمر (يجمع كل أبنائه المسجلين بنفس الرقم في المدرسة، من القسمين).
-- لا كلمات مرور مخزنة: الرمز يُعرض للإدارة فقط ويمكن إيقافه أو إعادة توليده فيتوقف القديم فوراً.
-- ما يراه ولي الأمر تحدده الإدارة في schools.settings.portal {att:bool, res:bool, beh:'none'|'positive'|'all'}.

create or replace function public.norm_phone(p text) returns text language sql immutable set search_path = public as $$
  select case
    when d ~ '^009665\d{8}$' then substr(d, 3)
    when d ~ '^9665\d{8}$' then d
    when d ~ '^05\d{8}$' then '966' || substr(d, 2)
    when d ~ '^5\d{8}$' then '966' || d
    when length(d) >= 9 then d
    else null end
  from (select regexp_replace(coalesce(p, ''), '\D', '', 'g') as d) x
$$;

create or replace function public.parent_codes_manager() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or public.has_module('attendance') or public.has_module('supervision')
$$;

create table if not exists public.parent_codes (
  code text primary key,
  school_id uuid not null references public.schools(id) on delete cascade,
  phone text not null,
  active boolean not null default true,
  created_by uuid default public.me(), created_at timestamptz not null default now(),
  last_login timestamptz, logins int not null default 0,
  unique (school_id, phone));
alter table public.parent_codes enable row level security;
drop policy if exists pc_read on public.parent_codes;
create policy pc_read on public.parent_codes for select using (school_id = public.my_school() and public.parent_codes_manager());

-- محاولات الدخول الخاطئة (لكل عنوان) — تُقرأ من الدوال فقط
create table if not exists public.portal_fails (k text not null, at timestamptz not null default now());
create index if not exists portal_fails_k on public.portal_fails (k, at);
alter table public.portal_fails enable row level security;

-- يعيد true إذا تجاوز العنوان ١٥ محاولة خاطئة خلال ١٥ دقيقة
create or replace function public.portal_blocked(p_fail boolean default false) returns boolean language plpgsql security definer set search_path = public as $$
declare kk text := coalesce(nullif(btrim(split_part(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', ''), ',', 1)), ''), 'anon'); n int;
begin
  if p_fail then
    insert into public.portal_fails(k) values (kk);
    if random() < 0.05 then delete from public.portal_fails where at < now() - interval '1 day'; end if;
  end if;
  select count(*) into n from public.portal_fails where portal_fails.k = kk and at > now() - interval '15 minutes';
  return n >= 15;
end $$;

-- إنشاء رموز لأولياء الأمور (الناقص فقط) في المدرسة أو قسم، أو إعادة توليد لجوال محدد
create or replace function public.parent_codes_gen(p_section uuid default null, p_phone text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare sch uuid := public.my_school(); ph text; c text; n int := 0; alpha text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if sch is null or not public.parent_codes_manager() then raise exception 'no permission'; end if;
  for ph in select distinct public.norm_phone(st.guardian_phone) from public.students st
      where st.school_id = sch and st.active and public.norm_phone(st.guardian_phone) is not null
        and (p_section is null or st.section_id = p_section)
        and (p_phone is null or public.norm_phone(st.guardian_phone) = public.norm_phone(p_phone)) loop
    if p_phone is null and exists (select 1 from public.parent_codes where school_id = sch and phone = ph) then continue; end if;
    loop
      c := ''; for i in 1..10 loop c := c || substr(alpha, 1 + floor(random() * length(alpha))::int, 1); end loop;
      c := substr(c, 1, 5) || '-' || substr(c, 6, 5);
      exit when not exists (select 1 from public.parent_codes where code = c);
    end loop;
    delete from public.parent_codes where school_id = sch and phone = ph;
    insert into public.parent_codes(code, school_id, phone) values (c, sch, ph); n := n + 1;
  end loop;
  return jsonb_build_object('created', n,
    'nophone', (select count(*) from public.students st where st.school_id = sch and st.active and (p_section is null or st.section_id = p_section) and public.norm_phone(st.guardian_phone) is null));
end $$;

-- قائمة العائلات: الجوال، اسم ولي الأمر، الرمز، الأبناء (ومع كل ابن رمزه إن وُجد)
create or replace function public.parent_codes_list(p_section uuid default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare sch uuid := public.my_school();
begin
  if sch is null or not public.parent_codes_manager() then raise exception 'no permission'; end if;
  return coalesce((select jsonb_agg(f order by f->>'gname', f->>'phone') from (
    select jsonb_build_object('phone', ph, 'gname', max(st.guardian_name), 'code', pc.code, 'active', pc.active, 'last', pc.last_login, 'logins', coalesce(pc.logins, 0),
      'kids', jsonb_agg(jsonb_build_object('id', st.id, 'name', st.full_name, 'no', st.student_no, 'class', cl.name, 'class_id', cl.id, 'section_id', st.section_id, 'code', sc.code, 'sactive', sc.active) order by st.full_name)) f
    from (select s.*, public.norm_phone(s.guardian_phone) ph from public.students s where s.school_id = sch and s.active) st
    left join public.classes cl on cl.id = st.class_id
    left join public.student_codes sc on sc.student_id = st.id
    left join public.parent_codes pc on pc.school_id = sch and pc.phone = st.ph
    where st.ph is not null and (p_section is null or exists (select 1 from public.students x where x.school_id = sch and x.active and x.section_id = p_section and public.norm_phone(x.guardian_phone) = st.ph))
    group by st.ph, pc.code, pc.active, pc.last_login, pc.logins) q), '[]');
end $$;

create or replace function public.parent_code_toggle(p_phone text, p_active boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.parent_codes_manager() then raise exception 'no permission'; end if;
  update public.parent_codes set active = p_active where school_id = public.my_school() and phone = public.norm_phone(p_phone);
end $$;

-- بيانات الطالب (نفس محتوى student_portal) — داخلية فقط، لا تُتاح للعموم
create or replace function public.portal_student_data(p_student uuid, p_week uuid default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare st record; cl record; w record; d0 date := (now() at time zone 'Asia/Riyadh')::date;
begin
  select * into st from public.students where id = p_student and active;
  if st.id is null then raise exception 'INACTIVE'; end if;
  select * into cl from public.classes where id = st.class_id;
  if p_week is not null then select * into w from public.weeks where id = p_week and section_id = cl.section_id;
  else select * into w from public.weeks where section_id = cl.section_id and not coalesce(archived, false) and d0 between start_date - 2 and start_date + 6 order by start_date limit 1;
    if w.id is null then select * into w from public.weeks where section_id = cl.section_id and not coalesce(archived, false) and start_date <= d0 order by start_date desc limit 1; end if;
  end if;
  return jsonb_build_object(
    'student', jsonb_build_object('id', st.id, 'name', st.full_name, 'no', st.student_no, 'class', cl.name, 'class_id', cl.id, 'grade', cl.grade_word, 'stage', cl.stage),
    'school', (select name from public.schools where id = st.school_id),
    'section', (select name from public.sections where id = cl.section_id),
    'week', case when w.id is null then null else jsonb_build_object('id', w.id, 'word', w.word, 'start', w.start_date) end,
    'weeks', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'word', x.word, 'start', x.start_date) order by x.start_date) from public.weeks x where x.section_id = cl.section_id and not coalesce(x.archived, false) and x.status in ('published','open') and x.start_date <= d0 + 7), '[]'),
    'plan', case when w.id is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('day', e.day, 'period', e.period, 'subject', (select name from public.subjects where id = e.subject_id), 'topic', e.topic, 'homework', e.homework, 'perf', e.perf_task) order by e.day, e.period)
      from public.plan_entries e where e.week_id = w.id and e.class_id = cl.id and e.subject_id is not null and (w.status = 'published' or e.status = 'approved') and (coalesce(e.topic,'') <> '' or coalesce(e.homework,'') <> '')), '[]') end,
    'quizzes', coalesce((select jsonb_agg(jsonb_build_object('title', z.title, 'kind', z.kind, 'code', z.code, 'subject', (select name from public.subjects where id = z.subject_id), 'close', z.settings->>'close_at',
        'done', (select count(*) from public.quiz_attempts a where a.quiz_id = z.id and a.class_id = cl.id and (public.norm_ans(a.student_name) = public.norm_ans(st.full_name) or (st.student_no is not null and a.student_no = st.student_no))))
      order by z.created_at desc) from public.quizzes z where z.status = 'published' and cl.id = any(z.class_ids) and (z.settings->>'close_at' is null or (z.settings->>'close_at')::timestamptz > now())), '[]'),
    'results', coalesce((select jsonb_agg(jsonb_build_object('title', z.title, 'kind', z.kind, 'score', a.score, 'max', a.max_score, 'pending', a.pending_manual, 'at', a.submitted_at) order by a.submitted_at desc)
      from public.quiz_attempts a join public.quizzes z on z.id = a.quiz_id where a.class_id = cl.id and (public.norm_ans(a.student_name) = public.norm_ans(st.full_name) or (st.student_no is not null and a.student_no = st.student_no))), '[]'),
    'resources', coalesce((select jsonb_agg(jsonb_build_object('title', r.title, 'url', r.url, 'kind', r.kind, 'subject', (select name from public.subjects where id = r.subject_id), 'note', r.note) order by r.created_at desc)
      from public.resources r where r.school_id = st.school_id and r.visible_to_parents and (r.class_ids is null or cardinality(r.class_ids) = 0 or cl.id = any(r.class_ids)) and (r.section_id is null or r.section_id = cl.section_id)), '[]'));
end $$;

-- دخول ولي الأمر: يعيد قائمة الأبناء وإعدادات العرض (لا يرفع استثناء حتى تُحفظ المحاولة الخاطئة)
create or replace function public.parent_portal(p_code text) returns jsonb language plpgsql security definer set search_path = public as $$
declare k record; cfg jsonb;
begin
  if public.portal_blocked(false) then return jsonb_build_object('error', 'TOO_MANY'); end if;
  select * into k from public.parent_codes where code = upper(btrim(p_code)) and active;
  if k.code is null then perform public.portal_blocked(true); return jsonb_build_object('error', 'BAD_CODE'); end if;
  cfg := coalesce((select settings->'portal' from public.schools where id = k.school_id), '{}');
  update public.parent_codes set last_login = now(), logins = logins + 1 where code = k.code;
  return jsonb_build_object(
    'school', (select name from public.schools where id = k.school_id),
    'parent', (select max(guardian_name) from public.students where school_id = k.school_id and active and public.norm_phone(guardian_phone) = k.phone),
    'cfg', jsonb_build_object('att', coalesce((cfg->>'att')::boolean, true), 'res', coalesce((cfg->>'res')::boolean, true), 'beh', coalesce(cfg->>'beh', 'none')),
    'kids', coalesce((select jsonb_agg(jsonb_build_object('id', st.id, 'name', st.full_name, 'class', cl.name, 'section', (select name from public.sections where id = cl.section_id)) order by st.full_name)
      from public.students st left join public.classes cl on cl.id = st.class_id
      where st.school_id = k.school_id and st.active and public.norm_phone(st.guardian_phone) = k.phone), '[]'));
end $$;

-- بيانات ابن محدد لولي الأمر: محتوى بوابة الطالب + الحضور والسلوك حسب إعدادات المدرسة
create or replace function public.parent_child(p_code text, p_student uuid, p_week uuid default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare k record; st record; cfg jsonb; d jsonb; d1 date := (now() at time zone 'Asia/Riyadh')::date - 120; beh text;
begin
  if public.portal_blocked(false) then return jsonb_build_object('error', 'TOO_MANY'); end if;
  select * into k from public.parent_codes where code = upper(btrim(p_code)) and active;
  if k.code is null then perform public.portal_blocked(true); return jsonb_build_object('error', 'BAD_CODE'); end if;
  select * into st from public.students where id = p_student and school_id = k.school_id and active and public.norm_phone(guardian_phone) = k.phone;
  if st.id is null then return jsonb_build_object('error', 'NOT_CHILD'); end if;
  cfg := coalesce((select settings->'portal' from public.schools where id = k.school_id), '{}');
  d := public.portal_student_data(st.id, p_week);
  if not coalesce((cfg->>'res')::boolean, true) then d := d - 'results'; end if;
  if coalesce((cfg->>'att')::boolean, true) then
    d := d || jsonb_build_object('att', jsonb_build_object(
      'since', d1,
      'days', coalesce((select jsonb_agg(jsonb_build_object('day', a.day, 'st', a.status, 'min', a.minutes) order by a.day desc) from public.attendance a where a.student_id = st.id and a.day >= d1 and a.status <> 'present'), '[]'),
      'present', (select count(*) from public.attendance a where a.student_id = st.id and a.day >= d1 and a.status = 'present'),
      'periods', coalesce((select jsonb_agg(jsonb_build_object('day', p.day, 'period', p.period, 'st', p.status, 'subject', (select name from public.subjects where id = p.subject_id)) order by p.day desc, p.period) from public.period_attendance p where p.student_id = st.id and p.day >= d1 and p.status in ('absent','late','excused')), '[]')));
  end if;
  beh := coalesce(cfg->>'beh', 'none');
  if beh in ('positive', 'all') then
    d := d || jsonb_build_object('beh', coalesce((select jsonb_agg(jsonb_build_object('day', b.day, 'kind', b.kind, 'cat', b.category, 'pts', b.points) order by b.day desc)
      from public.behaviors b where b.student_id = st.id and b.day >= d1 and (beh = 'all' or b.kind = 'positive')), '[]'));
  end if;
  return d;
end $$;

revoke all on function public.portal_student_data(uuid, uuid) from public, anon, authenticated;
revoke all on function public.portal_blocked(boolean) from public, anon, authenticated;
revoke all on function public.parent_codes_gen(uuid, text) from public, anon;
revoke all on function public.parent_codes_list(uuid) from public, anon;
revoke all on function public.parent_code_toggle(text, boolean) from public, anon;
grant execute on function public.parent_codes_manager() to authenticated;
grant execute on function public.parent_codes_gen(uuid, text) to authenticated;
grant execute on function public.parent_codes_list(uuid) to authenticated;
grant execute on function public.parent_code_toggle(text, boolean) to authenticated;
grant execute on function public.parent_portal(text) to anon, authenticated;
grant execute on function public.parent_child(text, uuid, uuid) to anon, authenticated;
-- الجداول تُقرأ وتُكتب عبر الدوال فقط
revoke all on public.parent_codes from anon;
revoke insert, update, delete, truncate on public.parent_codes from authenticated;
revoke all on public.portal_fails from anon, authenticated;
select 'ok';
