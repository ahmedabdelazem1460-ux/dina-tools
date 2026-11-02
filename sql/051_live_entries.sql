-- 051: بيانات حصص الجدول الاستثنائي (الموضوع، الواجب، الملاحظة، رابط الدرس) — منفصلة تماماً عن الخطة الأسبوعية
create table if not exists public.live_entries (
  ds_id uuid not null references public.display_schedules(id) on delete cascade,
  class_id uuid not null,
  day smallint not null,
  period smallint not null,
  topic text not null default '',
  homework text not null default '',
  note text not null default '',
  link text not null default '',
  teacher_id uuid,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  primary key (ds_id, class_id, day, period)
);
alter table public.live_entries enable row level security;
drop policy if exists le_read on public.live_entries;
create policy le_read on public.live_entries for select using (exists (select 1 from public.display_schedules d where d.id = ds_id and public.is_member(d.section_id)));

create or replace function public.save_live_entry(p_ds uuid, p_class uuid, p_day int, p_period int, p_topic text, p_homework text, p_note text, p_link text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare d record; t uuid; lk text := btrim(coalesce(p_link, '')); r jsonb;
begin
  select * into d from public.display_schedules where id = p_ds;
  if d.id is null then raise exception 'الجدول غير موجود'; end if;
  select (x->>'t')::uuid into t from jsonb_array_elements(d.slots) x where (x->>'c')::uuid = p_class and (x->>'d')::int = p_day and (x->>'p')::int = p_period and x->>'s' is not null limit 1;
  if not found then raise exception 'الحصة غير موجودة في هذا الجدول'; end if;
  if not (t = public.me() or public.is_owner() or public.has_perm(d.section_id, 'review') or public.has_perm(d.section_id, 'timetable_approve')) then raise exception 'هذه الحصة ليست لك'; end if;
  if lk <> '' and lk !~* '^https?://' then raise exception 'الرابط يجب أن يبدأ بـ https://'; end if;
  insert into public.live_entries(ds_id, class_id, day, period, topic, homework, note, link, teacher_id, updated_by, updated_at)
    values (p_ds, p_class, p_day, p_period, left(btrim(coalesce(p_topic, '')), 600), left(btrim(coalesce(p_homework, '')), 600), left(btrim(coalesce(p_note, '')), 600), left(lk, 600), t, public.me(), now())
    on conflict (ds_id, class_id, day, period) do update set topic = excluded.topic, homework = excluded.homework, note = excluded.note, link = excluded.link, updated_by = excluded.updated_by, updated_at = now()
    returning to_jsonb(live_entries.*) into r;
  return r;
end $$;
grant execute on function public.save_live_entry(uuid, uuid, int, int, text, text, text, text) to authenticated;

create or replace function public.parent_live(p_token text, p_class uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare sch uuid; sec uuid; tz date := (now() at time zone 'Asia/Riyadh')::date;
begin
  select school_id into sch from public.parent_links where token = p_token and active;
  if sch is null then raise exception 'الرابط غير صالح أو متوقف'; end if;
  select cl.section_id into sec from public.classes cl join public.sections s on s.id = cl.section_id where cl.id = p_class and s.school_id = sch;
  if sec is null then raise exception 'الفصل غير موجود'; end if;
  return jsonb_build_object('today', tz, 'now', to_char(now() at time zone 'Asia/Riyadh', 'HH24:MI'), 'list', coalesce((
    select jsonb_agg(jsonb_build_object('id', d.id, 'label', d.label, 'tag', d.tag, 'from', d.date_from, 'to', d.date_to, 'meta', d.meta,
      'cls_link', d.links->'cls'->>p_class::text,
      'cells', coalesce((select jsonb_agg(jsonb_build_object('d', (x->>'d')::int, 'p', (x->>'p')::int,
          'subject', (select name from public.subjects where id = (x->>'s')::uuid),
          'teacher', (select full_name from public.staff where id = (x->>'t')::uuid),
          'link', coalesce(nullif(d.links->'cell'->>(p_class::text || '|' || (x->>'d') || '|' || (x->>'p')), ''), nullif(d.links->'cls'->>p_class::text, ''), nullif(d.links->'tch'->>(x->>'t'), '')),
          'topic', le.topic, 'homework', le.homework, 'note', le.note, 'llink', nullif(le.link, '')))
        from jsonb_array_elements(d.slots) x
        left join public.live_entries le on le.ds_id = d.id and le.class_id = p_class and le.day = (x->>'d')::int and le.period = (x->>'p')::int
        where (x->>'c')::uuid = p_class and x->>'s' is not null), '[]'::jsonb))
      order by d.date_from)
    from public.display_schedules d where d.section_id = sec and d.published and d.date_to >= tz and d.date_from <= tz + 7), '[]'::jsonb));
end $$;
grant execute on function public.parent_live(text, uuid) to anon, authenticated;
select 'ok';
