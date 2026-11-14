-- 104: (طُبّق على دفعات 104a/104b1-3/104c1-3 بنفس المحتوى) بوابة ولي الأمر (family.html) — حساب بالجوال وكلمة مرور يُفعَّل بالرمز المطبوع (parent_codes)،
-- مراسلة خاصة مع المعلمين والإدارة (لا يقرؤها إلا طرفاها)، أعذار الغياب بمرفق، تقارير معتمدة، تدريب من بنوك الأسئلة.
-- ولي الأمر ليس مستخدماً في Supabase Auth: كل وصوله عبر دوال fam_* برمز جلسة عشوائي (يُخزَّن مُجزّأً sha256).
-- إعدادات العرض: schools.settings.portal (انظر fam_cfg).

alter table public.parent_codes add column if not exists used_at timestamptz;

create table if not exists public.parent_accounts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  phone text not null, pass text, name text,
  activated_at timestamptz, last_login timestamptz, logins int not null default 0,
  fails int not null default 0, locked_until timestamptz,
  created_at timestamptz not null default now(),
  unique (school_id, phone));
alter table public.parent_accounts enable row level security;

create table if not exists public.parent_sessions (
  th text primary key, account_id uuid not null references public.parent_accounts(id) on delete cascade,
  created_at timestamptz not null default now(), last_at timestamptz not null default now(), expires_at timestamptz not null);
create index if not exists parent_sessions_acc on public.parent_sessions (account_id);
alter table public.parent_sessions enable row level security;

create table if not exists public.parent_msgs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  account_id uuid not null references public.parent_accounts(id) on delete cascade,
  staff_id uuid not null references public.staff(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  from_parent boolean not null, body text not null check (length(body) between 1 and 4000),
  read_at timestamptz, created_at timestamptz not null default now());
create index if not exists parent_msgs_thread on public.parent_msgs (account_id, staff_id, created_at);
create index if not exists parent_msgs_staff on public.parent_msgs (staff_id, created_at desc);
alter table public.parent_msgs enable row level security;
drop policy if exists pm_read on public.parent_msgs;
create policy pm_read on public.parent_msgs for select using (staff_id = public.me());

create table if not exists public.parent_excuses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  account_id uuid references public.parent_accounts(id) on delete set null,
  student_id uuid not null references public.students(id) on delete cascade,
  day_from date not null, day_to date not null, kind text not null default 'other' check (kind in ('medical','family','other')),
  note text, file_name text, file_type text, file_data bytea,
  status text not null default 'pending' check (status in ('pending','accepted','rejected')),
  reply text, decided_by uuid, decided_at timestamptz, created_at timestamptz not null default now());
create index if not exists parent_excuses_st on public.parent_excuses (school_id, status, created_at desc);
alter table public.parent_excuses enable row level security;

create table if not exists public.parent_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  kind text not null default 'report', title text not null, html text not null default '',
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  created_by uuid default public.me(), approved_by uuid, approved_at timestamptz, seen_at timestamptz,
  created_at timestamptz not null default now());
create index if not exists parent_reports_st on public.parent_reports (student_id, status);
alter table public.parent_reports enable row level security;

create table if not exists public.parent_practice (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  created_by uuid default public.me(),
  kind text not null default 'practice' check (kind in ('practice','mock','review','booklet')),
  title text not null, subject_id uuid, grade_key text, class_ids uuid[] not null default '{}',
  question_ids uuid[] not null, settings jsonb not null default '{}',
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  approved_by uuid, created_at timestamptz not null default now());
alter table public.parent_practice enable row level security;

-- مَن يدير أولياء الأمور (الأعذار، الاعتماد): المالك، الحضور، الإشراف، الإرشاد
create or replace function public.family_manager() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or public.has_module('attendance') or public.has_module('supervision') or public.has_module('counselor')
$$;

drop policy if exists pe_read on public.parent_excuses;
create policy pe_read on public.parent_excuses for select using (school_id = public.my_school() and public.family_manager());
drop policy if exists pr_read on public.parent_reports;
create policy pr_read on public.parent_reports for select using (school_id = public.my_school() and (created_by = public.me() or public.family_manager()));
drop policy if exists pp_read on public.parent_practice;
create policy pp_read on public.parent_practice for select using (school_id = public.my_school());

-- الإعدادات بقيمها الافتراضية
create or replace function public.fam_cfg(p_school uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('att', true, 'res', true, 'beh', 'none', 'msg', 'all', 'excuse', true, 'reports', true, 'auto', true,
    'noor', false, 'paper', true, 'practice', true, 'sharedQ', false, 'approve', true)
    || coalesce((select settings->'portal' from public.schools where id = p_school), '{}'::jsonb)
$$;

create or replace function public.fam_hash(p text) returns text language sql immutable set search_path = public as $$
  select encode(extensions.digest(coalesce(p, ''), 'sha256'), 'hex')
$$;

-- الحساب من رمز الجلسة (null إن انتهت أو أُوقف رمز العائلة)
create or replace function public.fam_acc(p_token text) returns public.parent_accounts language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts; s public.parent_sessions;
begin
  select * into s from public.parent_sessions where th = public.fam_hash(p_token) and expires_at > now();
  if s.th is null then return null; end if;
  select * into a from public.parent_accounts where id = s.account_id and pass is not null;
  if a.id is null or not exists (select 1 from public.parent_codes c where c.school_id = a.school_id and c.phone = a.phone and c.active) then return null; end if;
  if s.last_at < now() - interval '1 hour' then update public.parent_sessions set last_at = now(), expires_at = now() + interval '30 days' where th = s.th; end if;
  return a;
end $$;

create or replace function public.fam_session(p_account uuid) returns text language plpgsql security definer set search_path = public as $$
declare t text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  insert into public.parent_sessions(th, account_id, expires_at) values (public.fam_hash(t), p_account, now() + interval '30 days');
  return t;
end $$;

-- هل الطالب ابن لهذا الحساب؟
create or replace function public.fam_kid(a public.parent_accounts, p_student uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.students st where st.id = p_student and st.school_id = a.school_id and st.active and public.norm_phone(st.guardian_phone) = a.phone)
$$;

-- التفعيل: الجوال + الرمز المطبوع + كلمة مرور يختارها ولي الأمر
create or replace function public.fam_activate(p_phone text, p_code text, p_pass text, p_name text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare ph text := public.norm_phone(p_phone); c record; aid uuid;
begin
  if public.portal_blocked(false) then return jsonb_build_object('error', 'TOO_MANY'); end if;
  select * into c from public.parent_codes where code = upper(btrim(coalesce(p_code, ''))) and active and phone = ph;
  if c.code is null then perform public.portal_blocked(true); return jsonb_build_object('error', 'BAD_CODE'); end if;
  if c.used_at is not null then return jsonb_build_object('error', 'USED'); end if;
  if length(coalesce(p_pass, '')) < 6 then return jsonb_build_object('error', 'WEAK'); end if;
  insert into public.parent_accounts(school_id, phone, pass, name, activated_at)
    values (c.school_id, ph, extensions.crypt(p_pass, extensions.gen_salt('bf', 8)), nullif(btrim(coalesce(p_name, '')), ''), now())
    on conflict (school_id, phone) do update set pass = excluded.pass, name = coalesce(excluded.name, parent_accounts.name), activated_at = now(), fails = 0, locked_until = null
    returning id into aid;
  update public.parent_sessions set expires_at = now() where account_id = aid;
  update public.parent_codes set used_at = now() where code = c.code;
  update public.parent_accounts set last_login = now(), logins = logins + 1 where id = aid;
  return jsonb_build_object('token', public.fam_session(aid));
end $$;

create or replace function public.fam_login(p_phone text, p_pass text) returns jsonb language plpgsql security definer set search_path = public as $$
declare ph text := public.norm_phone(p_phone); a record; locked boolean := false;
begin
  if public.portal_blocked(false) then return jsonb_build_object('error', 'TOO_MANY'); end if;
  for a in select x.* from public.parent_accounts x where x.phone = ph and x.pass is not null
      and exists (select 1 from public.parent_codes c where c.school_id = x.school_id and c.phone = x.phone and c.active) order by x.last_login desc nulls last loop
    if a.locked_until is not null and a.locked_until > now() then locked := true; continue; end if;
    if a.pass = extensions.crypt(coalesce(p_pass, ''), a.pass) then
      update public.parent_accounts set fails = 0, locked_until = null, last_login = now(), logins = logins + 1 where id = a.id;
      return jsonb_build_object('token', public.fam_session(a.id));
    end if;
    update public.parent_accounts set fails = fails + 1, locked_until = case when fails + 1 >= 8 then now() + interval '15 minutes' else null end where id = a.id;
  end loop;
  perform public.portal_blocked(true);
  return jsonb_build_object('error', case when locked then 'LOCKED' else 'BAD_LOGIN' end);
end $$;

create or replace function public.fam_logout(p_token text) returns void language sql security definer set search_path = public as $$
  update public.parent_sessions set expires_at = now() where th = public.fam_hash(p_token)
$$;

create or replace function public.fam_password(p_token text, p_old text, p_new text) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token);
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  if a.pass <> extensions.crypt(coalesce(p_old, ''), a.pass) then return jsonb_build_object('error', 'BAD_LOGIN'); end if;
  if length(coalesce(p_new, '')) < 6 then return jsonb_build_object('error', 'WEAK'); end if;
  update public.parent_accounts set pass = extensions.crypt(p_new, extensions.gen_salt('bf', 8)) where id = a.id;
  update public.parent_sessions set expires_at = now() where account_id = a.id and th <> public.fam_hash(p_token);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.fam_home(p_token text) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token);
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  return jsonb_build_object(
    'school', (select name from public.schools where id = a.school_id),
    'parent', coalesce(a.name, (select max(guardian_name) from public.students where school_id = a.school_id and active and public.norm_phone(guardian_phone) = a.phone)),
    'phone', '0' || right(a.phone, 9),
    'cfg', public.fam_cfg(a.school_id),
    'unread', (select count(*) from public.parent_msgs m where m.account_id = a.id and not m.from_parent and m.read_at is null),
    'kids', coalesce((select jsonb_agg(jsonb_build_object('id', st.id, 'name', st.full_name, 'class', cl.name, 'class_id', cl.id, 'stage', cl.stage, 'grade', cl.grade_word, 'section', (select name from public.sections where id = cl.section_id)) order by st.full_name)
      from public.students st left join public.classes cl on cl.id = st.class_id
      where st.school_id = a.school_id and st.active and public.norm_phone(st.guardian_phone) = a.phone), '[]'));
end $$;

-- كل ما يخص ابناً واحداً حسب إعدادات المدرسة
create or replace function public.fam_child(p_token text, p_student uuid, p_week uuid default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token); cfg jsonb; d jsonb; st record; cl record; gk text; d1 date := (now() at time zone 'Asia/Riyadh')::date - 120; beh text;
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  if not public.fam_kid(a, p_student) then return jsonb_build_object('error', 'NOT_CHILD'); end if;
  cfg := public.fam_cfg(a.school_id);
  select * into st from public.students where id = p_student; select * into cl from public.classes where id = st.class_id; gk := cl.stage || '|' || cl.grade_word;
  d := public.portal_student_data(p_student, p_week);
  if not (cfg->>'res')::boolean then d := d - 'results'; end if;
  if (cfg->>'att')::boolean then
    d := d || jsonb_build_object('att', jsonb_build_object('since', d1,
      'days', coalesce((select jsonb_agg(jsonb_build_object('day', x.day, 'st', x.status, 'min', x.minutes) order by x.day desc) from public.attendance x where x.student_id = st.id and x.day >= d1 and x.status <> 'present'), '[]'),
      'present', (select count(*) from public.attendance x where x.student_id = st.id and x.day >= d1 and x.status = 'present'),
      'periods', coalesce((select jsonb_agg(jsonb_build_object('day', p.day, 'period', p.period, 'st', p.status, 'subject', (select name from public.subjects where id = p.subject_id)) order by p.day desc, p.period) from public.period_attendance p where p.student_id = st.id and p.day >= d1 and p.status in ('absent','late','excused')), '[]')));
  end if;
  beh := cfg->>'beh';
  if beh in ('positive', 'all') then
    d := d || jsonb_build_object('beh', coalesce((select jsonb_agg(jsonb_build_object('day', b.day, 'kind', b.kind, 'cat', b.category, 'pts', b.points) order by b.day desc)
      from public.behaviors b where b.student_id = st.id and b.day >= d1 and (beh = 'all' or b.kind = 'positive')), '[]'));
  end if;
  if (cfg->>'excuse')::boolean then
    d := d || jsonb_build_object('excuses', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'from', e.day_from, 'to', e.day_to, 'kind', e.kind, 'note', e.note, 'status', e.status, 'reply', e.reply, 'file', e.file_name, 'at', e.created_at) order by e.created_at desc)
      from public.parent_excuses e where e.student_id = st.id and e.account_id = a.id), '[]'));
  end if;
  if (cfg->>'reports')::boolean then
    d := d || jsonb_build_object('reports', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'kind', r.kind, 'title', r.title, 'at', coalesce(r.approved_at, r.created_at), 'seen', r.seen_at is not null, 'by', (select full_name from public.staff where id = r.created_by)) order by r.created_at desc)
      from public.parent_reports r where r.student_id = st.id and r.status = 'published'), '[]'));
  end if;
  if (cfg->>'noor')::boolean then
    d := d || jsonb_build_object('noor', coalesce((select jsonb_agg(jsonb_build_object('imp', i.title, 'period', i.period, 'term', i.term, 'subject', n.subject, 'comp', n.component, 'score', n.score, 'max', n.max_score, 'label', n.grade_label) order by i.created_at desc, n.subject, n.component)
      from public.noor_scores n join public.noor_imports i on i.id = n.import_id where n.student_id = st.id), '[]'));
  end if;
  if (cfg->>'paper')::boolean then
    d := d || jsonb_build_object('paper', coalesce((select jsonb_agg(jsonb_build_object('title', e.title, 'date', e.exam_date, 'subject', (select name from public.subjects where id = e.subject_id), 'score', r.score, 'max', r.max_score) order by e.exam_date desc nulls last)
      from public.paper_results r join public.paper_exams e on e.id = r.exam_id where r.student_id = st.id and not coalesce(r.absent, false) and r.score is not null), '[]'));
  end if;
  if (cfg->>'practice')::boolean then
    d := d || jsonb_build_object('practice', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'kind', x.kind, 'title', x.title, 'subject', (select name from public.subjects where id = x.subject_id), 'n', cardinality(x.question_ids), 'settings', x.settings, 'at', x.created_at) order by x.created_at desc)
      from public.parent_practice x where x.school_id = a.school_id and x.status = 'published' and (cl.id = any(x.class_ids) or (cardinality(x.class_ids) = 0 and x.grade_key = gk))), '[]'));
    if (cfg->>'sharedQ')::boolean then
      d := d || jsonb_build_object('banks', coalesce((select jsonb_agg(jsonb_build_object('subject_id', q.subject_id, 'subject', (select name from public.subjects where id = q.subject_id), 'n', q.n) order by q.n desc)
        from (select subject_id, count(*) n from public.questions where school_id = a.school_id and shared and grade_key = gk and qtype in ('mcq','multi','tf','short','blank','match','order') group by subject_id) q), '[]'));
    end if;
  end if;
  return d;
end $$;

create or replace function public.fam_report(p_token text, p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token); r record;
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  select * into r from public.parent_reports where id = p_id and status = 'published' and school_id = a.school_id;
  if r.id is null or not public.fam_kid(a, r.student_id) or not (public.fam_cfg(a.school_id)->>'reports')::boolean then return jsonb_build_object('error', 'NOT_FOUND'); end if;
  if r.seen_at is null then update public.parent_reports set seen_at = now() where id = r.id; end if;
  return jsonb_build_object('title', r.title, 'kind', r.kind, 'html', r.html, 'at', coalesce(r.approved_at, r.created_at));
end $$;

-- أسئلة مجموعة تدريب (مع الإجابات: تدريب ذاتي لا يُرصد)
create or replace function public.fam_practice(p_token text, p_student uuid, p_id uuid default null, p_subject uuid default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token); cfg jsonb; cl record; x record; gk text;
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  if not public.fam_kid(a, p_student) then return jsonb_build_object('error', 'NOT_CHILD'); end if;
  cfg := public.fam_cfg(a.school_id);
  if not (cfg->>'practice')::boolean then return jsonb_build_object('error', 'OFF'); end if;
  select c.* into cl from public.classes c join public.students s on s.class_id = c.id where s.id = p_student; gk := cl.stage || '|' || cl.grade_word;
  if p_id is not null then
    select * into x from public.parent_practice where id = p_id and school_id = a.school_id and status = 'published' and (cl.id = any(class_ids) or (cardinality(class_ids) = 0 and grade_key = gk));
    if x.id is null then return jsonb_build_object('error', 'NOT_FOUND'); end if;
    return jsonb_build_object('title', x.title, 'kind', x.kind, 'settings', x.settings, 'subject', (select name from public.subjects where id = x.subject_id),
      'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'qtype', q.qtype, 'body', q.body, 'image', q.image_url, 'options', q.options, 'answer', q.answer, 'explanation', q.explanation, 'points', q.points) order by array_position(x.question_ids, q.id))
        from public.questions q where q.id = any(x.question_ids) and q.school_id = a.school_id), '[]'));
  end if;
  if not (cfg->>'sharedQ')::boolean then return jsonb_build_object('error', 'OFF'); end if;
  return jsonb_build_object('title', 'تدريب — ' || coalesce((select name from public.subjects where id = p_subject), ''), 'kind', 'practice', 'settings', '{}'::jsonb,
    'questions', coalesce((select jsonb_agg(jsonb_build_object('id', q.id, 'qtype', q.qtype, 'body', q.body, 'image', q.image_url, 'options', q.options, 'answer', q.answer, 'explanation', q.explanation, 'points', q.points))
      from (select * from public.questions where school_id = a.school_id and shared and grade_key = gk and subject_id = p_subject and qtype in ('mcq','multi','tf','short','blank','match','order') order by random() limit 30) q), '[]'));
end $$;

-- عذر غياب/تأخر بمرفق (صورة أو PDF حتى ٣ م.ب)
create or replace function public.fam_excuse(p_token text, p_student uuid, p_from date, p_to date, p_kind text, p_note text, p_fname text default null, p_ftype text default null, p_fb64 text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token); f bytea; d0 date := (now() at time zone 'Asia/Riyadh')::date; eid uuid; nm text; s record;
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  if not public.fam_kid(a, p_student) then return jsonb_build_object('error', 'NOT_CHILD'); end if;
  if not (public.fam_cfg(a.school_id)->>'excuse')::boolean then return jsonb_build_object('error', 'OFF'); end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 30 or p_from < d0 - 60 or p_to > d0 + 30 then return jsonb_build_object('error', 'BAD_DATES'); end if;
  if (select count(*) from public.parent_excuses where account_id = a.id and status = 'pending') >= 10 then return jsonb_build_object('error', 'TOO_MANY'); end if;
  if p_fb64 is not null and length(p_fb64) > 0 then
    if coalesce(p_ftype, '') !~ '^(image/(jpeg|png|webp)|application/pdf)$' then return jsonb_build_object('error', 'BAD_FILE'); end if;
    f := decode(p_fb64, 'base64');
    if length(f) > 3 * 1024 * 1024 then return jsonb_build_object('error', 'BIG_FILE'); end if;
  end if;
  insert into public.parent_excuses(school_id, account_id, student_id, day_from, day_to, kind, note, file_name, file_type, file_data)
    values (a.school_id, a.id, p_student, p_from, p_to, case when p_kind in ('medical','family','other') then p_kind else 'other' end, left(coalesce(p_note, ''), 1000), left(p_fname, 120), case when f is null then null else p_ftype end, f)
    returning id into eid;
  select full_name into nm from public.students where id = p_student;
  for s in select distinct x.id from public.staff x where x.school_id = a.school_id and x.active and (x.is_owner or exists (select 1 from public.module_grants g where g.staff_id = x.id and g.module in ('attendance','counselor'))) loop
    perform public.notif_push(a.school_id, s.id, 'parent', 'عذر من ولي أمر', 'عذر ' || case p_kind when 'medical' then 'طبي' when 'family' then 'عائلي' else '' end || ' للطالب ' || coalesce(nm, '') || ' — يحتاج مراجعة', '#/stucodes', null);
  end loop;
  return jsonb_build_object('id', eid);
end $$;

-- جهات التواصل المتاحة لابن معيّن: معلموه (الجدول المعتمد + الخطط الأخيرة) والإدارة (المالك، الإرشاد، الوكيل)
create or replace function public.fam_contacts_ids(p_school uuid, p_student uuid, p_mode text) returns table (staff_id uuid, role text, subjects text) language sql stable security definer set search_path = public as $$
  with cl as (select class_id from public.students where id = p_student),
  t as (
    select ts.teacher_id tid, ts.subject_id sid from public.timetable_slots ts join public.timetable_versions v on v.id = ts.version_id
      where ts.class_id = (select class_id from cl) and v.status = 'approved' and ts.teacher_id is not null
    union
    select e.teacher_id, e.subject_id from public.plan_entries e join public.weeks w on w.id = e.week_id
      where e.class_id = (select class_id from cl) and e.teacher_id is not null and w.start_date >= current_date - 60),
  tt as (select t.tid, string_agg(distinct s.name, '، ') subj from t left join public.subjects s on s.id = t.sid group by t.tid),
  ad as (select x.id, case when x.is_owner then 'admin' when exists (select 1 from public.module_grants g where g.staff_id = x.id and g.module = 'counselor') then 'counselor' else 'deputy' end r
    from public.staff x where x.school_id = p_school and x.active and (x.is_owner or exists (select 1 from public.module_grants g where g.staff_id = x.id and g.module in ('counselor','deputy'))))
  select tt.tid, 'teacher', tt.subj from tt join public.staff x on x.id = tt.tid and x.active and x.school_id = p_school where p_mode in ('all','teachers')
  union all
  select ad.id, ad.r, null from ad where p_mode in ('all','admin') and ad.id not in (select tid from tt where p_mode = 'all')
$$;

create or replace function public.fam_contacts(p_token text, p_student uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token); mode text;
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  if not public.fam_kid(a, p_student) then return jsonb_build_object('error', 'NOT_CHILD'); end if;
  mode := public.fam_cfg(a.school_id)->>'msg';
  return jsonb_build_object('mode', mode, 'list', coalesce((select jsonb_agg(jsonb_build_object('id', c.staff_id, 'name', x.full_name, 'title', x.title, 'role', c.role, 'subjects', c.subjects,
      'unread', (select count(*) from public.parent_msgs m where m.account_id = a.id and m.staff_id = c.staff_id and not m.from_parent and m.read_at is null),
      'last', (select max(created_at) from public.parent_msgs m where m.account_id = a.id and m.staff_id = c.staff_id)) order by (c.role <> 'teacher'), x.full_name)
    from public.fam_contacts_ids(a.school_id, p_student, coalesce(mode, 'off')) c join public.staff x on x.id = c.staff_id), '[]'));
end $$;

create or replace function public.fam_thread(p_token text, p_staff uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token);
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  update public.parent_msgs set read_at = now() where account_id = a.id and staff_id = p_staff and not from_parent and read_at is null;
  return jsonb_build_object('staff', (select jsonb_build_object('id', id, 'name', full_name, 'title', title) from public.staff where id = p_staff and school_id = a.school_id),
    'msgs', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'me', m.from_parent, 'body', m.body, 'at', m.created_at, 'read', m.read_at is not null, 'kid', (select split_part(full_name, ' ', 1) from public.students where id = m.student_id)) order by m.created_at)
      from (select * from public.parent_msgs where account_id = a.id and staff_id = p_staff order by created_at desc limit 200) m), '[]'));
end $$;

create or replace function public.fam_send(p_token text, p_staff uuid, p_student uuid, p_body text) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token); mode text; nm text;
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  if not public.fam_kid(a, p_student) then return jsonb_build_object('error', 'NOT_CHILD'); end if;
  mode := public.fam_cfg(a.school_id)->>'msg';
  if coalesce(mode, 'off') = 'off' then return jsonb_build_object('error', 'OFF'); end if;
  if not exists (select 1 from public.fam_contacts_ids(a.school_id, p_student, mode) c where c.staff_id = p_staff)
     and not exists (select 1 from public.parent_msgs where account_id = a.id and staff_id = p_staff and not from_parent) then return jsonb_build_object('error', 'NOT_ALLOWED'); end if;
  if length(btrim(coalesce(p_body, ''))) = 0 then return jsonb_build_object('error', 'EMPTY'); end if;
  if (select count(*) from public.parent_msgs where account_id = a.id and from_parent and created_at > now() - interval '1 hour') >= 30 then return jsonb_build_object('error', 'TOO_MANY'); end if;
  insert into public.parent_msgs(school_id, account_id, staff_id, student_id, from_parent, body) values (a.school_id, a.id, p_staff, p_student, true, left(btrim(p_body), 4000));
  select full_name into nm from public.students where id = p_student;
  perform public.notif_push(a.school_id, p_staff, 'parent', 'رسالة من ولي أمر ' || coalesce(nm, ''), left(btrim(p_body), 160), '#/pmsg', null);
  return jsonb_build_object('ok', true);
end $$;

/* ---------- جهة المدرسة ---------- */
create or replace function public.pmsg_inbox() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare m uuid := public.me();
begin
  if m is null then raise exception 'no permission'; end if;
  return coalesce((select jsonb_agg(t order by t->>'last_at' desc) from (
    select jsonb_build_object('account', a.id,
      'parent', coalesce(a.name, (select max(guardian_name) from public.students where school_id = a.school_id and active and public.norm_phone(guardian_phone) = a.phone), 'ولي أمر'),
      'kids', (select string_agg(full_name, '، ') from public.students where school_id = a.school_id and active and public.norm_phone(guardian_phone) = a.phone),
      'last', (select body from public.parent_msgs x where x.account_id = a.id and x.staff_id = m order by created_at desc limit 1),
      'last_at', max(p.created_at), 'unread', count(*) filter (where p.from_parent and p.read_at is null)) t
    from public.parent_msgs p join public.parent_accounts a on a.id = p.account_id where p.staff_id = m group by a.id) q), '[]');
end $$;

create or replace function public.pmsg_thread(p_account uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare m uuid := public.me(); a public.parent_accounts;
begin
  select * into a from public.parent_accounts where id = p_account and school_id = public.my_school();
  if m is null or a.id is null then raise exception 'no permission'; end if;
  update public.parent_msgs set read_at = now() where account_id = a.id and staff_id = m and from_parent and read_at is null;
  return jsonb_build_object(
    'parent', coalesce(a.name, (select max(guardian_name) from public.students where school_id = a.school_id and active and public.norm_phone(guardian_phone) = a.phone), 'ولي أمر'),
    'kids', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.full_name, 'class', (select name from public.classes where id = s.class_id))) from public.students s where s.school_id = a.school_id and s.active and public.norm_phone(s.guardian_phone) = a.phone), '[]'),
    'msgs', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'me', not x.from_parent, 'body', x.body, 'at', x.created_at, 'read', x.read_at is not null, 'kid', (select split_part(full_name, ' ', 1) from public.students where id = x.student_id)) order by x.created_at)
      from (select * from public.parent_msgs where account_id = a.id and staff_id = m order by created_at desc limit 300) x), '[]'));
end $$;

-- رد الموظف، أو بدء مراسلة مع ولي أمر طالب (يلزم أن يكون الحساب مُفعّلاً)
create or replace function public.pmsg_send(p_account uuid, p_student uuid, p_body text) returns jsonb language plpgsql security definer set search_path = public as $$
declare m uuid := public.me(); a public.parent_accounts; sch uuid := public.my_school();
begin
  if m is null then raise exception 'no permission'; end if;
  if p_account is null and p_student is not null then
    select x.* into a from public.parent_accounts x join public.students s on s.school_id = x.school_id and public.norm_phone(s.guardian_phone) = x.phone
      where s.id = p_student and s.school_id = sch and x.pass is not null limit 1;
    if a.id is null then return jsonb_build_object('error', 'NO_ACCOUNT'); end if;
  else
    select * into a from public.parent_accounts where id = p_account and school_id = sch;
    if a.id is null then raise exception 'no permission'; end if;
  end if;
  if length(btrim(coalesce(p_body, ''))) = 0 then return jsonb_build_object('error', 'EMPTY'); end if;
  insert into public.parent_msgs(school_id, account_id, staff_id, student_id, from_parent, body) values (sch, a.id, m, p_student, false, left(btrim(p_body), 4000));
  return jsonb_build_object('ok', true, 'account', a.id);
end $$;

create or replace function public.excuse_list(p_status text default 'pending') returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.family_manager() then raise exception 'no permission'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'student', s.full_name, 'student_id', s.id, 'class', c.name, 'section_id', c.section_id, 'from', e.day_from, 'to', e.day_to, 'kind', e.kind, 'note', e.note,
      'file', e.file_name, 'ftype', e.file_type, 'size', length(e.file_data), 'status', e.status, 'reply', e.reply, 'at', e.created_at, 'decided_at', e.decided_at,
      'by', (select full_name from public.staff where id = e.decided_by),
      'parent', coalesce(a.name, s.guardian_name), 'absent', (select count(*) from public.attendance t where t.student_id = s.id and t.day between e.day_from and e.day_to and t.status = 'absent')) order by e.created_at desc)
    from public.parent_excuses e join public.students s on s.id = e.student_id left join public.classes c on c.id = s.class_id left join public.parent_accounts a on a.id = e.account_id
    where e.school_id = public.my_school() and (p_status = 'all' or e.status = p_status)), '[]');
end $$;

create or replace function public.excuse_file(p_id uuid) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare e record;
begin
  if not public.family_manager() then raise exception 'no permission'; end if;
  select * into e from public.parent_excuses where id = p_id and school_id = public.my_school();
  if e.id is null or e.file_data is null then return null; end if;
  return jsonb_build_object('name', e.file_name, 'type', e.file_type, 'b64', encode(e.file_data, 'base64'));
end $$;

-- القبول يحوّل الغياب في الأيام المحددة إلى «مستأذن» (اليومي والحصص)
create or replace function public.excuse_decide(p_id uuid, p_accept boolean, p_reply text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare e record; n1 int := 0; n2 int := 0;
begin
  if not public.family_manager() then raise exception 'no permission'; end if;
  select * into e from public.parent_excuses where id = p_id and school_id = public.my_school();
  if e.id is null then raise exception 'not found'; end if;
  update public.parent_excuses set status = case when p_accept then 'accepted' else 'rejected' end, reply = nullif(btrim(coalesce(p_reply, '')), ''), decided_by = public.me(), decided_at = now() where id = e.id;
  if p_accept then
    update public.attendance set status = 'excused', note = btrim(coalesce(note, '') || ' عذر ولي الأمر'), edited_by = public.me(), edited_at = now()
      where student_id = e.student_id and day between e.day_from and e.day_to and status = 'absent';
    get diagnostics n1 = row_count;
    update public.period_attendance set status = 'excused', note = btrim(coalesce(note, '') || ' عذر ولي الأمر'), edited_by = public.me(), edited_at = now()
      where student_id = e.student_id and day between e.day_from and e.day_to and status = 'absent';
    get diagnostics n2 = row_count;
  end if;
  return jsonb_build_object('days', n1, 'periods', n2);
end $$;

-- إرسال تقارير لأولياء الأمور: [{student, title, kind, html}] — تُنشر مباشرة للمالك/المدير أو عند إيقاف الاعتماد
create or replace function public.preport_send(p_items jsonb) returns jsonb language plpgsql security definer set search_path = public as $$
declare m uuid := public.me(); sch uuid := public.my_school(); pub boolean; it jsonb; n int := 0; s record;
begin
  if m is null then raise exception 'no permission'; end if;
  pub := public.family_manager() or not (public.fam_cfg(sch)->>'approve')::boolean;
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]')) loop
    if not exists (select 1 from public.students where id = (it->>'student')::uuid and school_id = sch) then continue; end if;
    insert into public.parent_reports(school_id, student_id, kind, title, html, status, created_by, approved_by, approved_at)
      values (sch, (it->>'student')::uuid, coalesce(nullif(it->>'kind', ''), 'report'), left(coalesce(nullif(it->>'title', ''), 'تقرير'), 200), left(coalesce(it->>'html', ''), 400000),
        case when pub then 'published' else 'pending' end, m, case when pub then m end, case when pub then now() end);
    n := n + 1;
  end loop;
  if not pub and n > 0 then
    for s in select x.id from public.staff x where x.school_id = sch and x.active and x.is_owner loop
      perform public.notif_push(sch, s.id, 'parent', 'تقارير لأولياء الأمور بانتظار الاعتماد', n || ' تقرير', '#/stucodes', m);
    end loop;
  end if;
  return jsonb_build_object('sent', n, 'published', pub);
end $$;

create or replace function public.preport_decide(p_ids uuid[], p_publish boolean) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.family_manager() then raise exception 'no permission'; end if;
  update public.parent_reports set status = case when p_publish then 'published' else 'rejected' end, approved_by = public.me(), approved_at = now() where id = any(p_ids) and school_id = public.my_school();
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.preport_del(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.parent_reports set status = 'rejected' where id = p_id and school_id = public.my_school() and (created_by = public.me() or public.family_manager());
end $$;

-- مجموعات التدريب: الأسئلة من بنك المدرسة (المشتركة أو أسئلة المرسل؛ المدير يرى الكل)
create or replace function public.ppractice_save(p_id uuid, p_kind text, p_title text, p_subject uuid, p_grade text, p_classes uuid[], p_qids uuid[], p_settings jsonb default '{}') returns jsonb language plpgsql security definer set search_path = public as $$
declare m uuid := public.me(); sch uuid := public.my_school(); mgr boolean := public.family_manager(); pub boolean; ok uuid[]; rid uuid;
begin
  if m is null then raise exception 'no permission'; end if;
  pub := mgr or not (public.fam_cfg(sch)->>'approve')::boolean;
  select array_agg(q.id order by array_position(p_qids, q.id)) into ok from public.questions q where q.id = any(p_qids) and q.school_id = sch and (q.shared or q.created_by = m or mgr);
  if coalesce(cardinality(ok), 0) = 0 then return jsonb_build_object('error', 'NO_QUESTIONS'); end if;
  if p_id is null then
    insert into public.parent_practice(school_id, created_by, kind, title, subject_id, grade_key, class_ids, question_ids, settings, status, approved_by)
      values (sch, m, case when p_kind in ('practice','mock','review','booklet') then p_kind else 'practice' end, left(coalesce(nullif(btrim(p_title), ''), 'تدريب'), 200), p_subject, p_grade, coalesce(p_classes, '{}'), ok, coalesce(p_settings, '{}'),
        case when pub then 'published' else 'pending' end, case when pub then m end) returning id into rid;
  else
    update public.parent_practice set kind = case when p_kind in ('practice','mock','review','booklet') then p_kind else kind end, title = left(coalesce(nullif(btrim(p_title), ''), title), 200), subject_id = p_subject, grade_key = p_grade,
      class_ids = coalesce(p_classes, '{}'), question_ids = ok, settings = coalesce(p_settings, '{}'), status = case when pub then 'published' else 'pending' end, approved_by = case when pub then m end
      where id = p_id and school_id = sch and (created_by = m or mgr) returning id into rid;
    if rid is null then raise exception 'no permission'; end if;
  end if;
  return jsonb_build_object('id', rid, 'published', pub, 'n', cardinality(ok));
end $$;

create or replace function public.ppractice_decide(p_ids uuid[], p_publish boolean) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.family_manager() then raise exception 'no permission'; end if;
  update public.parent_practice set status = case when p_publish then 'published' else 'rejected' end, approved_by = public.me() where id = any(p_ids) and school_id = public.my_school();
  get diagnostics n = row_count; return n;
end $$;

create or replace function public.ppractice_del(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update public.parent_practice set status = 'rejected' where id = p_id and school_id = public.my_school() and (created_by = public.me() or public.family_manager());
end $$;

-- «رمز جديد» لعائلة يلغي كلمة المرور والجلسات فيلزم التفعيل من جديد
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
    if exists (select 1 from public.parent_codes where school_id = sch and phone = ph) then
      update public.parent_codes set code = c, active = true, used_at = null, created_at = now(), created_by = public.me() where school_id = sch and phone = ph;
    else
      insert into public.parent_codes(code, school_id, phone) values (c, sch, ph);
    end if;
    n := n + 1;
    if p_phone is not null then
      update public.parent_accounts set pass = null, activated_at = null, fails = 0, locked_until = null where school_id = sch and phone = ph;
      update public.parent_sessions set expires_at = now() where account_id in (select id from public.parent_accounts where school_id = sch and phone = ph);
    end if;
  end loop;
  return jsonb_build_object('created', n,
    'nophone', (select count(*) from public.students st where st.school_id = sch and st.active and (p_section is null or st.section_id = p_section) and public.norm_phone(st.guardian_phone) is null));
end $$;

create or replace function public.parent_codes_list(p_section uuid default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare sch uuid := public.my_school();
begin
  if sch is null or not public.parent_codes_manager() then raise exception 'no permission'; end if;
  return coalesce((select jsonb_agg(f order by f->>'gname', f->>'phone') from (
    select jsonb_build_object('phone', ph, 'gname', max(st.guardian_name), 'code', pc.code, 'active', pc.active, 'used', pc.used_at,
      'last', (select last_login from public.parent_accounts pa where pa.school_id = sch and pa.phone = st.ph),
      'logins', coalesce((select logins from public.parent_accounts pa where pa.school_id = sch and pa.phone = st.ph), 0),
      'activated', (select activated_at from public.parent_accounts pa where pa.school_id = sch and pa.phone = st.ph and pa.pass is not null),
      'kids', jsonb_agg(jsonb_build_object('id', st.id, 'name', st.full_name, 'no', st.student_no, 'class', cl.name, 'class_id', cl.id, 'section_id', st.section_id, 'code', sc.code, 'sactive', sc.active) order by st.full_name)) f
    from (select s.*, public.norm_phone(s.guardian_phone) ph from public.students s where s.school_id = sch and s.active) st
    left join public.classes cl on cl.id = st.class_id
    left join public.student_codes sc on sc.student_id = st.id
    left join public.parent_codes pc on pc.school_id = sch and pc.phone = st.ph
    where st.ph is not null and (p_section is null or exists (select 1 from public.students x where x.school_id = sch and x.active and x.section_id = p_section and public.norm_phone(x.guardian_phone) = st.ph))
    group by st.ph, pc.code, pc.active, pc.used_at) q), '[]');
end $$;

-- الدخول بالرمز وحده أُلغي: الرمز صار للتفعيل فقط
create or replace function public.parent_portal(p_code text) returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object('error', 'ACTIVATE')
$$;
create or replace function public.parent_child(p_code text, p_student uuid, p_week uuid default null) returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object('error', 'ACTIVATE')
$$;

-- الصلاحيات
revoke all on public.parent_accounts, public.parent_sessions from anon, authenticated;
revoke all on public.parent_msgs, public.parent_excuses, public.parent_reports, public.parent_practice from anon;
revoke insert, update, delete, truncate on public.parent_msgs, public.parent_excuses, public.parent_reports, public.parent_practice from authenticated;
revoke all on function public.fam_acc(text) from public, anon, authenticated;
revoke all on function public.fam_session(uuid) from public, anon, authenticated;
revoke all on function public.fam_kid(public.parent_accounts, uuid) from public, anon, authenticated;
revoke all on function public.fam_contacts_ids(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.fam_cfg(uuid) from public, anon;
do $$ declare f text; begin
  foreach f in array array['fam_activate(text,text,text,text)','fam_login(text,text)','fam_logout(text)','fam_password(text,text,text)','fam_home(text)','fam_child(text,uuid,uuid)','fam_report(text,uuid)',
    'fam_practice(text,uuid,uuid,uuid)','fam_excuse(text,uuid,date,date,text,text,text,text,text)','fam_contacts(text,uuid)','fam_thread(text,uuid)','fam_send(text,uuid,uuid,text)'] loop
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  foreach f in array array['pmsg_inbox()','pmsg_thread(uuid)','pmsg_send(uuid,uuid,text)','excuse_list(text)','excuse_file(uuid)','excuse_decide(uuid,boolean,text)','preport_send(jsonb)','preport_decide(uuid[],boolean)','preport_del(uuid)',
    'ppractice_save(uuid,text,text,uuid,text,uuid[],uuid[],jsonb)','ppractice_decide(uuid[],boolean)','ppractice_del(uuid)','family_manager()','fam_cfg(uuid)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
select 'ok';
