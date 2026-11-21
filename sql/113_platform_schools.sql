-- 113 — المنتج متعدد المدارس: مدير المنصة، تجهيز مدرسة جديدة، قائمة المدارس
-- إضافي فقط: جدول platform_admins، ودوال جديدة، واستثناء واحد في staff_guard عند التجهيز (GUC dwp.provision داخل دالة SECURITY DEFINER).

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text, created_at timestamptz not null default now());
alter table public.platform_admins enable row level security; -- بلا سياسات: لا يُقرأ إلا عبر الدوال

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.platform_admins where user_id = auth.uid()) $$;

create or replace function public.staff_guard()
returns trigger language plpgsql security definer set search_path = public as $function$
begin
  if auth.uid() is null or current_setting('dwp.provision', true) = '1' then return new; end if;
  if tg_op = 'INSERT' then
    if new.is_owner then raise exception 'غير مسموح'; end if;
    new.user_id := null;
    return new;
  end if;
  if new.is_owner is distinct from old.is_owner or new.school_id is distinct from old.school_id
     or (new.user_id is distinct from old.user_id and current_setting('dwp.allow_link', true) is distinct from '1') then
    raise exception 'غير مسموح بتعديل هذا الحقل';
  end if;
  if new.active is distinct from old.active and current_setting('dwp.allow_active', true) is distinct from '1' then
    raise exception 'استخدم إيقاف/تفعيل الحساب';
  end if;
  if new.email is distinct from old.email and old.user_id is not null and current_setting('dwp.allow_email', true) is distinct from '1' then
    raise exception 'تغيير البريد يتم من «حساب الدخول»';
  end if;
  return new;
end $function$;

-- تجهيز مدرسة جديدة (مدير المنصة فقط):
-- p = {name, short, term_label, sections:[{name, short_name, days, periods}], owner:{name, email, title}, plan:{kind, until, note}}
-- يُنشئ المدرسة وأقسامها وملف المالك (بلا حساب) ورمز انضمام يفعّل به المالك حسابه بكلمة مروره.
create or replace function public.school_provision(p jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare sch uuid; sid uuid; sec uuid; first_sec uuid; s jsonb; i int := 0; code text;
  nm text := btrim(coalesce(p->>'name', '')); sh text := btrim(coalesce(nullif(p->>'short', ''), p->>'name', ''));
  em text := lower(btrim(coalesce(p->'owner'->>'email', ''))); onm text := btrim(coalesce(p->'owner'->>'name', ''));
begin
  if not public.is_platform_admin() then raise exception 'غير مسموح'; end if;
  if length(nm) < 3 then raise exception 'اكتب اسم المدرسة'; end if;
  if length(onm) < 5 then raise exception 'اكتب اسم مدير المدرسة كاملاً'; end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'بريد مدير المدرسة غير صحيح'; end if;
  if exists(select 1 from public.staff where lower(email) = em) or exists(select 1 from auth.users where lower(email) = em) then raise exception 'هذا البريد مستخدم في المنصة — استخدم بريداً آخر لمدير المدرسة'; end if;
  if jsonb_array_length(coalesce(p->'sections', '[]'::jsonb)) = 0 then raise exception 'أضف قسماً واحداً على الأقل'; end if;
  perform set_config('dwp.provision', '1', true);
  insert into public.schools(name, term_label, settings) values (nm, coalesce(nullif(p->>'term_label', ''), 'الفصل الدراسي الأول'),
    jsonb_build_object('brand', jsonb_build_object('name', nm, 'short', sh, 'app', 'منصة ' || sh, 'platform', 'منصة ' || sh || ' للتخطيط الدراسي', 'nameEn', coalesce(p->>'nameEn', '')),
      'setup', jsonb_build_object('done', false, 'at', now()), 'plan', coalesce(p->'plan', '{}'::jsonb), 'provisioned_by', auth.uid()))
    returning id into sch;
  for s in select value from jsonb_array_elements(p->'sections') loop
    insert into public.sections(school_id, name, short_name, days, periods, sort)
      values (sch, coalesce(nullif(btrim(s->>'name'), ''), 'القسم ' || (i + 1)), nullif(btrim(coalesce(s->>'short_name', '')), ''), coalesce((s->>'days')::smallint, 5), coalesce((s->>'periods')::smallint, 7), i)
      returning id into sec;
    if first_sec is null then first_sec := sec; end if; i := i + 1;
  end loop;
  insert into public.staff(school_id, full_name, email, is_owner, active, title) values (sch, onm, em, true, true, coalesce(nullif(p->'owner'->>'title', ''), 'مدير المدرسة')) returning id into sid;
  insert into public.memberships(staff_id, section_id, role, can_review_plans, can_export) select sid, x.id, 'admin', true, true from public.sections x where x.school_id = sch;
  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into public.join_codes(code, section_id, role, active, title, label) values (code, first_sec, 'supervisor', true, coalesce(nullif(p->'owner'->>'title', ''), 'مدير المدرسة'), 'تفعيل حساب مالك المدرسة');
  return jsonb_build_object('school_id', sch, 'owner_id', sid, 'code', code);
end $$;

-- قائمة المدارس لمدير المنصة
create or replace function public.platform_schools()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'غير مسموح'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', sc.id, 'name', sc.name, 'created_at', sc.created_at,
    'brand', sc.settings->'brand', 'setup', sc.settings->'setup', 'plan', sc.settings->'plan', 'mine', sc.id = public.my_school(),
    'sections', (select count(*) from public.sections x where x.school_id = sc.id),
    'classes', (select count(*) from public.classes c join public.sections x on x.id = c.section_id where x.school_id = sc.id),
    'staff', (select count(*) from public.staff st where st.school_id = sc.id and st.active),
    'accounts', (select count(*) from public.staff st where st.school_id = sc.id and st.active and st.user_id is not null),
    'students', (select count(*) from public.students su where su.school_id = sc.id and su.active),
    'owners', (select jsonb_agg(jsonb_build_object('name', st.full_name, 'email', st.email, 'joined', st.user_id is not null)) from public.staff st where st.school_id = sc.id and st.is_owner),
    'codes', (select jsonb_agg(j.code) from public.join_codes j join public.sections x on x.id = j.section_id where x.school_id = sc.id and j.active and j.label = 'تفعيل حساب مالك المدرسة')
  ) order by sc.created_at) from public.schools sc), '[]'::jsonb);
end $$;

-- حالة الاشتراك/الملاحظة لمدرسة (مدير المنصة فقط) — لا يمس أي بيانات أخرى
create or replace function public.platform_school_plan(p_school uuid, p_plan jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then raise exception 'غير مسموح'; end if;
  update public.schools set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{plan}', coalesce(p_plan, '{}'::jsonb)) where id = p_school;
end $$;

grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.school_provision(jsonb) to authenticated;
grant execute on function public.platform_schools() to authenticated;
grant execute on function public.platform_school_plan(uuid, jsonb) to authenticated;
revoke execute on function public.school_provision(jsonb) from anon;
revoke execute on function public.platform_schools() from anon;
revoke execute on function public.platform_school_plan(uuid, jsonb) from anon;

-- مالك المنصة (أ. أحمد عبد العظيم)
insert into public.platform_admins(user_id, note)
  select user_id, 'مالك المنصة' from public.staff where lower(email) = 'a.abdelazim@dinaschool.com' and user_id is not null
  on conflict do nothing;
