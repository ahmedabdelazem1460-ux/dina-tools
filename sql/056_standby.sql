-- 056: حصص الانتظار وتأمين الحصص (طُبّق في قاعدة البيانات)
alter table public.sections add column if not exists standby jsonb not null default '{}'::jsonb;
create table if not exists public.substitutions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null, section_id uuid not null, day date not null, period smallint not null,
  class_id uuid not null, absent_teacher uuid, sub_teacher uuid, subject_id uuid, kind text not null default 'auto', note text not null default '',
  created_by uuid default public.me(), created_at timestamptz not null default now(),
  unique (day, class_id, period));
-- RLS: قراءة لأعضاء المدرسة، كتابة للمالك أو صلاحية timetable_edit؛ مُضاف لسلة المحذوفات والبث اللحظي
