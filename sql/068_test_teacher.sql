-- 068: المعلم والفصل التجريبيان — مخفيان عن الجميع عدا المالك، ومستثنيان من صفحة ولي الأمر
alter table public.staff add column if not exists is_test boolean not null default false;
alter table public.classes add column if not exists is_test boolean not null default false;
-- parent_info: أُضيف شرط «and not c.is_test» لقائمة الفصول (طُبّق بتعديل نص الدالة)
