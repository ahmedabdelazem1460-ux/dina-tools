-- 099: البوصلة — تطبيق المقاييس التربوية على الفصول (روابط للطلاب بلا حساب) وحفظ الاستجابات. جداول جديدة فقط.
create table if not exists public.scale_runs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  owner uuid not null default public.me() references public.staff(id) on delete cascade,
  scale_key text not null, title text not null default '', class_id uuid references public.classes(id) on delete set null,
  code text not null unique, state text not null default 'open' check (state in ('open','closed')),
  created_at timestamptz not null default now()
);
create table if not exists public.scale_resp (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.scale_runs(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  device text not null, name text not null default '',
  answers jsonb not null default '[]'::jsonb, scores jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (run_id, device)
);
alter table public.scale_runs enable row level security;
alter table public.scale_resp enable row level security;
create policy sr_rw on public.scale_runs for all using (school_id = public.my_school() and (owner = public.me() or public.is_owner() or public.has_module('counselor'))) with check (school_id = public.my_school() and owner = public.me());
create policy sp_read on public.scale_resp for select using (exists (select 1 from public.scale_runs r where r.id = run_id and r.school_id = public.my_school() and (r.owner = public.me() or public.is_owner() or public.has_module('counselor'))));
create policy sp_del on public.scale_resp for delete using (exists (select 1 from public.scale_runs r where r.id = run_id and r.school_id = public.my_school() and (r.owner = public.me() or public.is_owner())));
grant select, insert, update, delete on public.scale_runs to authenticated;
grant select, delete on public.scale_resp to authenticated;

-- للطالب: بيانات التطبيق وأسماء طلاب الفصل (الاسم الأول والثاني فقط)
create or replace function public.scale_get(p_code text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('key', r.scale_key, 'title', r.title, 'school', (select name from public.schools where id = r.school_id),
    'cls', (select name from public.classes where id = r.class_id),
    'students', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'n', split_part(s.full_name, ' ', 1) || ' ' || split_part(s.full_name, ' ', 2)) order by s.full_name) from public.students s where s.class_id = r.class_id and coalesce(s.active, true)), '[]'::jsonb))
  from public.scale_runs r where r.code = upper(trim(p_code)) and r.state = 'open'
$$;
create or replace function public.scale_submit(p_code text, p_device text, p_student uuid, p_name text, p_answers jsonb, p_scores jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare r public.scale_runs;
begin
  select * into r from public.scale_runs where code = upper(trim(p_code)) and state = 'open';
  if not found then raise exception 'المقياس مغلق'; end if;
  if coalesce(length(p_device), 0) < 6 or jsonb_array_length(p_answers) > 80 then raise exception 'بيانات غير صالحة'; end if;
  if p_student is not null and not exists (select 1 from public.students where id = p_student and class_id = r.class_id) then raise exception 'الطالب ليس في هذا الفصل'; end if;
  insert into public.scale_resp (run_id, student_id, device, name, answers, scores) values (r.id, p_student, left(p_device, 64), left(coalesce(p_name, ''), 60), p_answers, p_scores)
  on conflict (run_id, device) do update set student_id = excluded.student_id, name = excluded.name, answers = excluded.answers, scores = excluded.scores, created_at = now();
  return true;
end $$;
grant execute on function public.scale_get(text), public.scale_submit(text, text, uuid, text, jsonb, jsonb) to anon, authenticated;
