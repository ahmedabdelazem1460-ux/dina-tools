-- 062: «المصادر» مخزن المدرسة الواحد — ربط المصدر بالصف والدرس والتحضير
alter table public.resources add column if not exists grade_key text;
alter table public.resources add column if not exists lesson_id uuid;
alter table public.resources add column if not exists prep_id uuid;
alter table public.resources add column if not exists origin text not null default 'manual';
alter table public.resources add column if not exists file_type text not null default '';
create index if not exists res_lesson on public.resources(lesson_id);
create index if not exists res_prep on public.resources(prep_id);
select 'ok';
