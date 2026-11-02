-- 049: جداول عرض استثنائية (مثل التعليم عن بعد لأسبوع) — للعرض فقط، لا تمس الخطط ولا الجدول المعتمد
create table if not exists public.display_schedules (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  version_id uuid references public.timetable_versions(id) on delete set null,
  label text not null default '',
  tag text not null default '',
  date_from date not null,
  date_to date not null,
  slots jsonb not null default '[]'::jsonb,   -- لقطة ثابتة: [{c,d,p,s,t}]
  meta jsonb not null default '{}'::jsonb,    -- {days:[], periods:n, times:[[from,to]], breaks:[{after,label,from,to}], sched}
  links jsonb not null default '{}'::jsonb,   -- {cls:{id:url}, tch:{id:url}, cell:{'c|d|p':url}}
  published boolean not null default false,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_to >= date_from)
);
create index if not exists display_schedules_sec on public.display_schedules(section_id, date_from, date_to);
alter table public.display_schedules enable row level security;
drop policy if exists ds_read on public.display_schedules;
create policy ds_read on public.display_schedules for select using (public.is_member(section_id) and (published or public.is_owner() or public.has_perm(section_id, 'timetable_approve')));
drop policy if exists ds_write on public.display_schedules;
create policy ds_write on public.display_schedules for all using (public.is_owner() or public.has_perm(section_id, 'timetable_approve')) with check (public.is_owner() or public.has_perm(section_id, 'timetable_approve'));
create or replace function public.ds_touch() returns trigger language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists ds_touch on public.display_schedules;
create trigger ds_touch before update on public.display_schedules for each row execute function public.ds_touch();

-- لولي الأمر: الجداول الاستثنائية المنشورة السارية الآن أو خلال الأيام السبعة القادمة لفصل ابنه
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
          'link', coalesce(nullif(d.links->'cell'->>(p_class::text || '|' || (x->>'d') || '|' || (x->>'p')), ''), nullif(d.links->'cls'->>p_class::text, ''), nullif(d.links->'tch'->>(x->>'t'), ''))))
        from jsonb_array_elements(d.slots) x where (x->>'c')::uuid = p_class and x->>'s' is not null), '[]'::jsonb))
      order by d.date_from)
    from public.display_schedules d where d.section_id = sec and d.published and d.date_to >= tz and d.date_from <= tz + 7), '[]'::jsonb));
end $$;
grant execute on function public.parent_live(text, uuid) to anon, authenticated;
