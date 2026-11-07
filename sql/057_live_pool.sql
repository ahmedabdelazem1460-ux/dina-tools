-- 057: خانة الحصص المحذوفة/الزائدة للجدول الاستثنائي (طُبّق)
alter table public.display_schedules add column if not exists pool jsonb not null default '[]'::jsonb;
