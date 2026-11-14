-- 100: البوصلة ٢ (خيارات التطبيق: المستوى واللغة، ومتوسط الفصل المجهول للطالب) + ملفات رعاية الموهوبين. إضافات فقط.
alter table public.scale_runs add column if not exists opts jsonb not null default '{}'::jsonb;

-- للطالب: بيانات التطبيق + مرحلة الفصل + متوسط الفصل (مجهول، يظهر بعد ٣ استجابات فأكثر)
create or replace function public.scale_get(p_code text) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('key', r.scale_key, 'title', r.title, 'opts', r.opts,
    'school', (select name from public.schools where id = r.school_id),
    'cls', (select name from public.classes where id = r.class_id),
    'stage', (select stage from public.classes where id = r.class_id),
    'grade', (select grade_word from public.classes where id = r.class_id),
    'students', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'n', split_part(s.full_name, ' ', 1) || ' ' || split_part(s.full_name, ' ', 2)) order by s.full_name) from public.students s where s.class_id = r.class_id and coalesce(s.active, true)), '[]'::jsonb),
    'avg', case when (select count(*) from public.scale_resp p where p.run_id = r.id) >= 3 then
      (select jsonb_object_agg(k, a) from (select e.key k, round(avg(e.value::numeric)) a from public.scale_resp p cross join lateral jsonb_each_text(p.scores) e where p.run_id = r.id and e.value ~ '^-?[0-9.]+$' group by e.key) z) end)
  from public.scale_runs r where r.code = upper(trim(p_code)) and r.state = 'open'
$$;
grant execute on function public.scale_get(text) to anon, authenticated;

-- ملفات رعاية الموهوبين (البوابات الخمس، النماذج، قرار اللجنة، الخطط)
create table if not exists public.gifted_files (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  name text not null default '', class_id uuid references public.classes(id) on delete set null,
  gate int not null default 1 check (gate between 1 and 5),
  level text not null default '', source text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_by uuid default public.me() references public.staff(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists gifted_files_school on public.gifted_files (school_id);
alter table public.gifted_files enable row level security;
-- القراءة والتعديل: المالك، ومن مُنح «gifted» أو «counselor»، ومن أنشأ الترشيح
create policy gf_read on public.gifted_files for select using (school_id = public.my_school() and (public.is_owner() or public.has_module('gifted') or public.has_module('counselor') or created_by = public.me()));
create policy gf_ins on public.gifted_files for insert with check (school_id = public.my_school() and created_by = public.me());
create policy gf_upd on public.gifted_files for update using (school_id = public.my_school() and (public.is_owner() or public.has_module('gifted') or public.has_module('counselor') or created_by = public.me())) with check (school_id = public.my_school());
create policy gf_del on public.gifted_files for delete using (school_id = public.my_school() and (public.is_owner() or public.has_module('gifted')));
grant select, insert, update, delete on public.gifted_files to authenticated;
