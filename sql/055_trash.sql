-- 055: سلة المحذوفات — كل حذف يُحفظ تلقائياً ويمكن استعادته (مع ما حُذف معه تلقائياً)
create table if not exists public.trash (
  id uuid primary key default gen_random_uuid(),
  school_id uuid, batch bigint not null, tbl text not null, row_id text, row_data jsonb not null,
  label text, deleted_by uuid, deleted_at timestamptz not null default now(), restored_at timestamptz, restored_by uuid);
create index if not exists trash_batch on public.trash(batch);
create index if not exists trash_sch on public.trash(school_id, deleted_at desc);
alter table public.trash enable row level security;
drop policy if exists trash_read on public.trash;
create policy trash_read on public.trash for select using (school_id = public.my_school() and (public.is_owner() or deleted_by = public.me()));

create or replace function public.trash_capture() returns trigger language plpgsql security definer set search_path = public as $T$
declare j jsonb := to_jsonb(old); sch uuid;
begin
  if coalesce(current_setting('dwp.notrash', true), '') = '1' then return old; end if;
  sch := coalesce(nullif(j->>'school_id','')::uuid, public.my_school());
  insert into public.trash(school_id, batch, tbl, row_id, row_data, label, deleted_by)
  values (sch, txid_current(), tg_table_name, coalesce(j->>'id', j->>'staff_id', j->>'ds_id'), j,
          left(coalesce(j->>'title', j->>'label', j->>'full_name', j->>'name', case when j ? 'word' then 'الأسبوع ' || (j->>'word') end, j->>'lesson', j->>'body', j->>'topic', ''), 140), public.me());
  return old;
end $T$;

do $D$ declare t text; begin
  foreach t in array array['assignment_requests','attendance','behaviors','classes','curriculum','display_schedules','entry_delegations','exam_committees','extra_pages','language_issues','live_entries','memberships','messages','module_grants','notes','paper_exams','paper_results','parent_links','parent_posts','period_attendance','plan_entries','questions','quiz_attempts','quizzes','record_books','remedial_plans','resources','section_plans','sections','spec_tables','staff','students','subjects','sup_docs','sup_records','sup_templates','timetable_slots','timetable_versions','tool_snapshots','weeks'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists zz_trash on public.%I', t);
      execute format('create trigger zz_trash after delete on public.%I for each row execute function public.trash_capture()', t);
    end if;
  end loop; end $D$;

-- استعادة دفعة حذف كاملة (العنصر وما حُذف معه)، بترتيب يحترم الارتباطات
create or replace function public.trash_restore(p_batch bigint) returns jsonb language plpgsql security definer set search_path = public as $R$
declare r record; ok int := 0; fail int := 0; prog boolean := true; pass int := 0; lasterr text := '';
begin
  if not exists (select 1 from public.trash where batch = p_batch and school_id = public.my_school() and restored_at is null) then raise exception 'not found'; end if;
  if not (public.is_owner() or not exists (select 1 from public.trash where batch = p_batch and deleted_by is distinct from public.me())) then raise exception 'no permission'; end if;
  perform set_config('dwp.sys', '1', true); perform set_config('dwp.nosync', '1', true); perform set_config('dwp.notrash', '1', true);
  while prog and pass < 12 loop
    prog := false; pass := pass + 1;
    for r in select * from public.trash where batch = p_batch and restored_at is null order by deleted_at, id loop
      begin
        execute format('insert into public.%I select * from jsonb_populate_record(null::public.%I, $1) on conflict do nothing', r.tbl, r.tbl) using r.row_data;
        update public.trash set restored_at = now(), restored_by = public.me() where id = r.id; ok := ok + 1; prog := true;
      exception when others then lasterr := sqlerrm;
      end;
    end loop;
  end loop;
  select count(*) into fail from public.trash where batch = p_batch and restored_at is null;
  perform set_config('dwp.sys', '', true); perform set_config('dwp.nosync', '', true); perform set_config('dwp.notrash', '', true);
  return jsonb_build_object('restored', ok, 'failed', fail, 'error', case when fail > 0 then lasterr end);
end $R$;

create or replace function public.trash_purge(p_batch bigint default null, p_days int default null) returns int language plpgsql security definer set search_path = public as $P$
declare n int;
begin
  if not public.is_owner() then raise exception 'no permission'; end if;
  delete from public.trash where school_id = public.my_school() and ((p_batch is not null and batch = p_batch) or (p_days is not null and deleted_at < now() - make_interval(days => p_days)) or (p_batch is null and p_days is null and restored_at is not null));
  get diagnostics n = row_count; return n;
end $P$;

-- ملخص الدفعات للعرض
create or replace function public.trash_list(p_limit int default 200) returns table(batch bigint, deleted_at timestamptz, deleted_by uuid, main_tbl text, main_label text, n int, n_open int, tbls jsonb) language sql stable security definer set search_path = public as $L$
  with t as (select * from public.trash where school_id = public.my_school() and (public.is_owner() or deleted_by = public.me())),
  g as (select t.batch, min(t.deleted_at) at, (array_agg(t.deleted_by))[1] by, count(*)::int n, count(*) filter (where restored_at is null)::int n_open from t group by t.batch)
  select g.batch, g.at, g.by,
    (select t2.tbl from t t2 where t2.batch = g.batch order by case t2.tbl when 'plan_entries' then 9 when 'timetable_slots' then 9 when 'memberships' then 8 when 'live_entries' then 8 when 'period_attendance' then 8 else 1 end, t2.deleted_at limit 1),
    (select t2.label from t t2 where t2.batch = g.batch order by case t2.tbl when 'plan_entries' then 9 when 'timetable_slots' then 9 when 'memberships' then 8 when 'live_entries' then 8 when 'period_attendance' then 8 else 1 end, t2.deleted_at limit 1),
    g.n, g.n_open, (select jsonb_object_agg(tbl, c) from (select tbl, count(*) c from t t3 where t3.batch = g.batch group by tbl) z)
  from g order by g.at desc limit p_limit
$L$;
grant execute on function public.trash_restore(bigint), public.trash_purge(bigint, int), public.trash_list(int) to authenticated;
select 'ok';
