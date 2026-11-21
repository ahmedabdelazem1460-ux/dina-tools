-- النطاق: المنصة الأم فقط
-- 115 — للمنصة الأم فقط (لا يُطبَّق على قاعدة مدارس دينا)
-- إصلاح: school_provision كان يرسل short_name = null عند ترك «المختصر» فارغاً، والعمود إلزامي ← فشل إنشاء المدرسة.
-- الآن: المختصر الفارغ = اسم القسم نفسه.
create or replace function public.school_provision(p jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare sch uuid; sid uuid; sec uuid; first_sec uuid; s jsonb; i int := 0; code text; sn text;
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
    sn := coalesce(nullif(btrim(s->>'name'), ''), 'القسم ' || (i + 1));
    insert into public.sections(school_id, name, short_name, days, periods, sort)
      values (sch, sn, coalesce(nullif(btrim(coalesce(s->>'short_name', '')), ''), sn), coalesce((s->>'days')::smallint, 5), coalesce((s->>'periods')::smallint, 7), i)
      returning id into sec;
    if first_sec is null then first_sec := sec; end if; i := i + 1;
  end loop;
  insert into public.staff(school_id, full_name, email, is_owner, active, title) values (sch, onm, em, true, true, coalesce(nullif(p->'owner'->>'title', ''), 'مدير المدرسة')) returning id into sid;
  insert into public.memberships(staff_id, section_id, role, can_review_plans, can_export) select sid, x.id, 'admin', true, true from public.sections x where x.school_id = sch;
  code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));
  insert into public.join_codes(code, section_id, role, active, title, label) values (code, first_sec, 'supervisor', true, coalesce(nullif(p->'owner'->>'title', ''), 'مدير المدرسة'), 'تفعيل حساب مالك المدرسة');
  return jsonb_build_object('school_id', sch, 'owner_id', sid, 'code', code);
end $function$;
