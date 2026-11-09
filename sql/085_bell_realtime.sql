-- 085: تحديث التوقيت لحظياً في كل الأجهزة (sections, display_schedules إلى realtime)
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='sections') then alter publication supabase_realtime add table public.sections; end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and tablename='display_schedules') then alter publication supabase_realtime add table public.display_schedules; end if;
end $$;
