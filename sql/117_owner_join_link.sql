-- النطاق: المنصة الأم فقط
-- 117 — للمنصة الأم فقط (لا يُطبَّق على دينا).
-- رمز «تفعيل حساب مالك المدرسة» صار يربط الحساب بملف المالك نفسه مهما كان الاسم أو البريد المكتوب
-- (كان يبحث بمطابقة الاسم/البريد فقط، فأنشأ ملفاً جديداً بدور مشرف عند اختلافهما)،
-- ويُستخدم مرة واحدة ثم يُوقف، ولا يغيّر مسمى المالك.
-- والتمهيد (116) يقرأ البريد قبل التحديث أيضاً، لأن التفعيل يستبدل بريد الملف ببريد الدخول.
create or replace function public.join_with_code(p_code text, p_full_name text, p_email text, p_password text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $function$
declare j public.join_codes; sch uuid; sid uuid; uid uuid; own boolean;
  em text := lower(trim(p_email)); nm text := btrim(regexp_replace(p_full_name, '\s+', ' ', 'g'));
begin
  select * into j from public.join_codes where code = p_code and active;
  if j.code is null then raise exception 'رابط الانضمام غير صالح أو أُوقف'; end if;
  if length(nm) < 5 then raise exception 'اكتب الاسم الكامل'; end if;
  if em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'البريد الإلكتروني غير صحيح'; end if;
  if length(coalesce(p_password,'')) < 8 then raise exception 'كلمة المرور يجب ألا تقل عن ٨ أحرف'; end if;
  if exists(select 1 from auth.users where lower(email) = em) then raise exception 'هذا البريد مسجّل مسبقاً — سجّل الدخول به'; end if;
  select school_id into sch from public.sections where id = j.section_id;
  own := j.label = 'تفعيل حساب مالك المدرسة';
  if own then
    select id into sid from public.staff where school_id = sch and is_owner and user_id is null order by created_at limit 1;
    if sid is null then raise exception 'تم تفعيل حساب مالك هذه المدرسة مسبقاً — سجّل الدخول به'; end if;
  else
    -- إن كان للمعلم ملف بلا حساب بنفس الاسم أو البريد نربطه به
    select id into sid from public.staff where school_id = sch and user_id is null and active and (lower(email) = em or regexp_replace(full_name, '^(أ\.|أ/|أ |Ms\.|Mr\.)\s*', '') = regexp_replace(nm, '^(أ\.|أ/|أ |Ms\.|Mr\.)\s*', '')) limit 1;
  end if;
  uid := gen_random_uuid();
  insert into auth.users(instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  values ('00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', em,
    crypt(p_password, gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', jsonb_build_object('full_name', nm), now(), now(), '', '', '', '');
  insert into auth.identities(id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), uid::text, uid, jsonb_build_object('sub', uid::text, 'email', em, 'email_verified', true), 'email', now(), now(), now());
  perform set_config('dwp.allow_link', '1', true); perform set_config('dwp.allow_email', '1', true);
  if sid is null then
    insert into public.staff(school_id, user_id, full_name, email) values (sch, uid, nm, em) returning id into sid;
  else
    update public.staff set user_id = uid, email = em where id = sid;
  end if;
  insert into public.memberships(staff_id, section_id, role, can_review_plans, can_export)
    values (sid, j.section_id, j.role, j.role = 'supervisor', j.role = 'supervisor') on conflict (staff_id, section_id) do nothing;
  if coalesce(j.extra, '{}'::jsonb) <> '{}'::jsonb then update public.memberships set extra = j.extra where staff_id = sid and section_id = j.section_id; end if;
  if not own and nullif(btrim(coalesce(j.title, '')), '') is not null then update public.staff set title = j.title where id = sid; end if;
  update public.join_codes set uses = uses + 1, active = case when own then false else active end where code = p_code;
  insert into public.audit_log(staff_id, section_id, action, entity, entity_id, details) values (sid, j.section_id, 'join', 'staff', sid, jsonb_build_object('email', em, 'owner', own));
  return jsonb_build_object('ok', true);
end $function$;

create or replace function public.platform_bootstrap_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null and old.user_id is null and new.is_owner
     and 'a.abdelazim@dinaschool.com' in (lower(coalesce(new.email, '')), lower(coalesce(old.email, '')))
     and not exists (select 1 from public.platform_admins) then
    insert into public.platform_admins(user_id, note) values (new.user_id, 'مالك المنصة (تمهيد تلقائي)');
  end if;
  return null;
end $$;
revoke all on function public.platform_bootstrap_trg() from public, anon, authenticated;
