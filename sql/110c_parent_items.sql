-- 110c — بنود أولياء الأمور: أسئلة ومراجعات وملفات وروابط وأي محتوى من المنصة يُعرض لأولياء الأمور بترتيب جميل
-- الإدارة: المالك، ومن يُمنح الوحدة «pitems» (لاحقاً من الصلاحيات). الإعدادات schools.settings.pitems
create table if not exists public.parent_items (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  section_id uuid references public.sections(id) on delete set null,
  class_ids uuid[] not null default '{}',
  cat text not null default 'review',
  title text not null,
  body text,
  subject_id uuid references public.subjects(id) on delete set null,
  week_id uuid references public.weeks(id) on delete set null,
  starts_on date not null default ((now() at time zone 'Asia/Riyadh')::date),
  ends_on date,
  pinned boolean not null default false,
  sort int not null default 0,
  status text not null default 'published' check (status in ('draft','pending','published','hidden')),
  att jsonb not null default '[]',
  opts jsonb not null default '{}',
  views int not null default 0,
  created_by uuid default public.me() references public.staff(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists parent_items_school on public.parent_items(school_id, status, starts_on);
alter table public.parent_items enable row level security;

create or replace function public.pitems_cfg(p_school uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('approve', true, 'parents', true, 'family', true)
    || coalesce((select settings->'pitems' from public.schools where id = p_school), '{}'::jsonb)
$$;

-- حارس: غير المالك لا ينشر مباشرة إن كان الاعتماد مطلوباً، ولا يغيّر المنشئ أو المدرسة
create or replace function public.pitems_guard() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  -- عدّاد المشاهدات وحده لا يغيّر الحالة
  if tg_op = 'UPDATE' and (to_jsonb(new) - 'views' - 'updated_at') = (to_jsonb(old) - 'views' - 'updated_at') then new.updated_at := old.updated_at; return new; end if;
  new.updated_at := now();
  if public.is_owner() then return new; end if;
  if tg_op = 'INSERT' then new.created_by := public.me(); new.views := 0;
  else new.created_by := old.created_by; new.school_id := old.school_id; new.views := old.views; end if;
  if new.status = 'published' and coalesce((public.pitems_cfg(new.school_id)->>'approve')::boolean, true) then new.status := 'pending'; end if;
  return new;
end $$;
drop trigger if exists pitems_guard on public.parent_items;
create trigger pitems_guard before insert or update on public.parent_items for each row execute function public.pitems_guard();

drop policy if exists pi_read on public.parent_items;
create policy pi_read on public.parent_items for select using (school_id = public.my_school() and public.has_module('pitems'));
drop policy if exists pi_ins on public.parent_items;
create policy pi_ins on public.parent_items for insert with check (school_id = public.my_school() and public.has_module('pitems'));
drop policy if exists pi_upd on public.parent_items;
create policy pi_upd on public.parent_items for update using (school_id = public.my_school() and (public.is_owner() or (public.has_module('pitems') and created_by = public.me())))
  with check (school_id = public.my_school());
drop policy if exists pi_del on public.parent_items;
create policy pi_del on public.parent_items for delete using (school_id = public.my_school() and (public.is_owner() or (public.has_module('pitems') and created_by = public.me())));

-- قائمة البنود الظاهرة لفصل
create or replace function public.pitems_of(p_school uuid, p_class uuid, p_week uuid)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object('cfg', public.pitems_cfg(p_school), 'items', coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id, 'cat', i.cat, 'title', i.title, 'body', i.body, 'subject', (select name from public.subjects where id = i.subject_id),
      'week', (select word from public.weeks where id = i.week_id), 'from', i.starts_on, 'to', i.ends_on, 'pinned', i.pinned, 'att', i.att, 'opts', i.opts)
      order by i.pinned desc, i.sort, i.starts_on desc, i.created_at desc)
    from public.parent_items i
    where i.school_id = p_school and i.status = 'published'
      and i.starts_on <= (now() at time zone 'Asia/Riyadh')::date and (i.ends_on is null or i.ends_on >= (now() at time zone 'Asia/Riyadh')::date)
      and (i.section_id is null or i.section_id = (select section_id from public.classes where id = p_class))
      and (cardinality(i.class_ids) = 0 or p_class = any(i.class_ids))
      and (i.week_id is null or i.week_id = p_week)), '[]'))
$$;
revoke all on function public.pitems_of(uuid, uuid, uuid) from public, anon, authenticated;

-- صفحة «خطط أبنائي» (رابط عام)
create or replace function public.parent_items_for(p_token text, p_class uuid, p_week uuid default null)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare sch uuid;
begin
  select school_id into sch from public.parent_links where token = p_token and active;
  if sch is null then raise exception 'الرابط غير صالح أو متوقف'; end if;
  if not exists (select 1 from public.classes c join public.sections s on s.id = c.section_id where c.id = p_class and s.school_id = sch) then raise exception 'الفصل غير موجود'; end if;
  if not coalesce((public.pitems_cfg(sch)->>'parents')::boolean, true) then return jsonb_build_object('cfg', public.pitems_cfg(sch), 'items', '[]'::jsonb); end if;
  return public.pitems_of(sch, p_class, p_week);
end $$;
grant execute on function public.parent_items_for(text, uuid, uuid) to anon, authenticated;

-- بوابة ولي الأمر بالحساب (family.html)
create or replace function public.fam_items(p_token text, p_student uuid, p_week uuid default null)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare a public.parent_accounts := public.fam_acc(p_token); cid uuid;
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  if not public.fam_kid(a, p_student) then return jsonb_build_object('error', 'NOT_CHILD'); end if;
  if not coalesce((public.pitems_cfg(a.school_id)->>'family')::boolean, true) then return jsonb_build_object('cfg', public.pitems_cfg(a.school_id), 'items', '[]'::jsonb); end if;
  select class_id into cid from public.students where id = p_student;
  return public.pitems_of(a.school_id, cid, p_week);
end $$;
grant execute on function public.fam_items(text, uuid, uuid) to anon, authenticated;

-- عدّاد المشاهدات (مجهول)
create or replace function public.pitem_seen(p_item uuid) returns void language sql security definer set search_path to 'public' as $$
  update public.parent_items set views = views + 1 where id = p_item and status = 'published'
$$;
grant execute on function public.pitem_seen(uuid) to anon, authenticated;
