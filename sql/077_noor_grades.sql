-- 077: تحليل درجات نظام نور — جداول جديدة فقط، لا مساس بأي بيانات قائمة.
-- لا تُحفظ أرقام الهوية/السجل المدني إطلاقاً؛ المطابقة مع قاعدة الطلاب الموحّدة بالاسم والفصل.
-- الصلاحية: المالك، ومن يمنحه المالك وحدة «noor».
create table if not exists public.noor_imports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  section_id uuid references public.sections(id) on delete set null,
  title text not null default '',
  kind text not null default 'subject',
  year text default '', term text default '', period text default '',
  grade text default '', class_label text default '',
  file_name text default '',
  created_by uuid default public.me(),
  created_at timestamptz not null default now(),
  meta jsonb not null default '{}'::jsonb
);
create table if not exists public.noor_scores (
  id bigint generated always as identity primary key,
  import_id uuid not null references public.noor_imports(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  student_name text not null,
  class_id uuid references public.classes(id) on delete set null,
  class_label text default '', grade text default '',
  subject text not null, component text not null default 'total',
  score numeric, max_score numeric, grade_label text default ''
);
create index if not exists noor_scores_import on public.noor_scores(import_id);
create index if not exists noor_scores_student on public.noor_scores(student_id);
create index if not exists noor_imports_school on public.noor_imports(school_id, created_at desc);

create or replace function public.noor_ok() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or exists (select 1 from public.module_grants g where g.staff_id = public.me() and g.module = 'noor')
$$;

alter table public.noor_imports enable row level security;
alter table public.noor_scores enable row level security;
create policy ni_read on public.noor_imports for select using (school_id = public.my_school() and public.noor_ok());
create policy ni_ins on public.noor_imports for insert with check (school_id = public.my_school() and public.noor_ok());
create policy ni_upd on public.noor_imports for update using (school_id = public.my_school() and (public.is_owner() or created_by = public.me()));
create policy ni_del on public.noor_imports for delete using (school_id = public.my_school() and (public.is_owner() or created_by = public.me()));
create policy ns_read on public.noor_scores for select using (school_id = public.my_school() and public.noor_ok());
create policy ns_ins on public.noor_scores for insert with check (school_id = public.my_school() and public.noor_ok()
  and exists (select 1 from public.noor_imports i where i.id = import_id and (public.is_owner() or i.created_by = public.me())));
create policy ns_upd on public.noor_scores for update using (school_id = public.my_school() and exists (select 1 from public.noor_imports i where i.id = import_id and (public.is_owner() or i.created_by = public.me())));
create policy ns_del on public.noor_scores for delete using (school_id = public.my_school() and exists (select 1 from public.noor_imports i where i.id = import_id and (public.is_owner() or i.created_by = public.me())));
grant select, insert, update, delete on public.noor_imports, public.noor_scores to authenticated;
