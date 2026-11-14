-- 105: مرونة ربط الأبناء بأولياء الأمور (طُبّق على دفعات 105a–105d)
-- ابن مسجّل بجوال مختلف، ولي أمر ثانٍ، تغيير الجوال، إخفاء ابن، وطلب ربط من ولي الأمر يعتمده المدير.
-- أبناء جوال = المسجّلون بنفس الرقم (عدا kind=hide) + المربوطون يدوياً (kind=add). req = طلب، none = ملغى.

create table if not exists public.family_links (
  school_id uuid not null references public.schools(id) on delete cascade,
  phone text not null,
  student_id uuid not null references public.students(id) on delete cascade,
  kind text not null default 'add' check (kind in ('add','hide','req','none')),
  name text, note text, added_by uuid default public.me(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key (school_id, phone, student_id));
alter table public.family_links enable row level security;
create policy fl_read on public.family_links for select using (school_id = public.my_school() and public.parent_codes_manager());
revoke all on public.family_links from anon;
revoke insert, update, delete, truncate on public.family_links from authenticated;

create or replace function public.fam_kids(p_school uuid, p_phone text) returns setof uuid language sql stable security definer set search_path = public as $$
  select s.id from public.students s where s.school_id = p_school and s.active and public.norm_phone(s.guardian_phone) = p_phone
    and not exists (select 1 from public.family_links l where l.school_id = p_school and l.phone = p_phone and l.student_id = s.id and l.kind = 'hide')
  union
  select l.student_id from public.family_links l join public.students s on s.id = l.student_id and s.active and s.school_id = p_school
    where l.school_id = p_school and l.phone = p_phone and l.kind = 'add'
$$;

create or replace function public.fam_phones(p_school uuid) returns setof text language sql stable security definer set search_path = public as $$
  select ph from (
    select distinct public.norm_phone(guardian_phone) ph from public.students where school_id = p_school and active
    union select distinct phone from public.family_links where school_id = p_school and kind = 'add') x
  where ph is not null and exists (select 1 from public.fam_kids(p_school, x.ph))
$$;

create or replace function public.fam_kid(a public.parent_accounts, p_student uuid) returns boolean language sql stable security definer set search_path = public as $$
  select p_student in (select public.fam_kids(a.school_id, a.phone))
$$;

revoke all on function public.fam_kids(uuid, text) from public, anon, authenticated;
revoke all on function public.fam_phones(uuid) from public, anon, authenticated;
revoke all on function public.fam_kid(public.parent_accounts, uuid) from public, anon, authenticated;

-- parent_codes_gen / parent_codes_list أعيد تعريفهما على fam_phones/fam_kids (انظر النص المطبّق في القاعدة: pg_get_functiondef)
create or replace function public.parent_codes_gen(p_section uuid default null, p_phone text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare sch uuid := public.my_school(); ph text; c text; n int := 0; alpha text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if sch is null or not public.parent_codes_manager() then raise exception 'no permission'; end if;
  for ph in select x from public.fam_phones(sch) x
      where (p_phone is null or x = public.norm_phone(p_phone))
        and (p_section is null or exists (select 1 from public.students s where s.id in (select public.fam_kids(sch, x)) and s.section_id = p_section)) loop
    if p_phone is null and exists (select 1 from public.parent_codes where school_id = sch and phone = ph) then continue; end if;
    loop
      c := ''; for i in 1..10 loop c := c || substr(alpha, 1 + floor(random() * length(alpha))::int, 1); end loop;
      c := substr(c, 1, 5) || '-' || substr(c, 6, 5);
      exit when not exists (select 1 from public.parent_codes where code = c);
    end loop;
    if exists (select 1 from public.parent_codes where school_id = sch and phone = ph) then
      update public.parent_codes set code = c, active = true, used_at = null, created_at = now(), created_by = public.me() where school_id = sch and phone = ph;
    else
      insert into public.parent_codes(code, school_id, phone) values (c, sch, ph);
    end if;
    n := n + 1;
    if p_phone is not null then
      update public.parent_accounts set pass = null, activated_at = null, fails = 0, locked_until = null where school_id = sch and phone = ph;
      update public.parent_sessions set expires_at = now() where account_id in (select id from public.parent_accounts where school_id = sch and phone = ph);
    end if;
  end loop;
  return jsonb_build_object('created', n,
    'nophone', (select count(*) from public.students st where st.school_id = sch and st.active and (p_section is null or st.section_id = p_section)
      and not exists (select 1 from public.fam_phones(sch) x where st.id in (select public.fam_kids(sch, x)))));
end $$;

create or replace function public.parent_codes_list(p_section uuid default null) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare sch uuid := public.my_school();
begin
  if sch is null or not public.parent_codes_manager() then raise exception 'no permission'; end if;
  return coalesce((select jsonb_agg(f order by f->>'gname', f->>'phone') from (
    select jsonb_build_object('phone', p.ph,
      'gname', coalesce((select max(name) from public.family_links l where l.school_id = sch and l.phone = p.ph and l.kind = 'add' and l.name is not null),
                        (select max(s.guardian_name) from public.students s where s.id in (select public.fam_kids(sch, p.ph)) and public.norm_phone(s.guardian_phone) = p.ph),
                        (select max(s.guardian_name) from public.students s where s.id in (select public.fam_kids(sch, p.ph)))),
      'code', pc.code, 'active', pc.active, 'used', pc.used_at,
      'last', pa.last_login, 'logins', coalesce(pa.logins, 0), 'activated', case when pa.pass is not null then pa.activated_at end,
      'kids', (select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.full_name, 'no', s.student_no, 'class', cl.name, 'class_id', cl.id, 'section_id', s.section_id, 'code', sc.code, 'sactive', sc.active,
          'linked', exists (select 1 from public.family_links l where l.school_id = sch and l.phone = p.ph and l.student_id = s.id and l.kind = 'add')) order by s.full_name)
        from public.students s left join public.classes cl on cl.id = s.class_id left join public.student_codes sc on sc.student_id = s.id where s.id in (select public.fam_kids(sch, p.ph))),
      'hidden', (select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.full_name)) from public.family_links l join public.students s on s.id = l.student_id where l.school_id = sch and l.phone = p.ph and l.kind = 'hide')) f
    from public.fam_phones(sch) p(ph)
    left join public.parent_codes pc on pc.school_id = sch and pc.phone = p.ph
    left join public.parent_accounts pa on pa.school_id = sch and pa.phone = p.ph
    where p_section is null or exists (select 1 from public.students s where s.id in (select public.fam_kids(sch, p.ph)) and s.section_id = p_section)) q), '[]');
end $$;

create or replace function public.family_link(p_phone text, p_student uuid, p_kind text, p_name text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare sch uuid := public.my_school(); ph text := public.norm_phone(p_phone);
begin
  if sch is null or not public.parent_codes_manager() then raise exception 'no permission'; end if;
  if ph is null then return jsonb_build_object('error', 'BAD_PHONE'); end if;
  if p_kind not in ('add','hide','none') then raise exception 'bad kind'; end if;
  if not exists (select 1 from public.students where id = p_student and school_id = sch) then raise exception 'not found'; end if;
  insert into public.family_links(school_id, phone, student_id, kind, name) values (sch, ph, p_student, p_kind, nullif(btrim(coalesce(p_name, '')), ''))
    on conflict (school_id, phone, student_id) do update set kind = excluded.kind, name = coalesce(excluded.name, family_links.name), updated_at = now(), added_by = public.me();
  return jsonb_build_object('ok', true, 'kids', (select count(*) from public.fam_kids(sch, ph)));
end $$;

create or replace function public.family_change_phone(p_old text, p_new text, p_update_students boolean default false) returns jsonb language plpgsql security definer set search_path = public as $$
declare sch uuid := public.my_school(); o text := public.norm_phone(p_old); nw text := public.norm_phone(p_new); n int := 0;
begin
  if sch is null or not public.parent_codes_manager() then raise exception 'no permission'; end if;
  if o is null or nw is null or nw !~ '^9665\d{8}$' then return jsonb_build_object('error', 'BAD_PHONE'); end if;
  if o = nw then return jsonb_build_object('ok', true); end if;
  if exists (select 1 from public.parent_codes where school_id = sch and phone = nw) or exists (select 1 from public.parent_accounts where school_id = sch and phone = nw) then return jsonb_build_object('error', 'EXISTS'); end if;
  if p_update_students then
    insert into public.family_links(school_id, phone, student_id, kind, name)
      select sch, nw, student_id, kind, name from public.family_links where school_id = sch and phone = o and kind in ('add','hide')
      on conflict (school_id, phone, student_id) do update set kind = excluded.kind, updated_at = now();
    update public.students set guardian_phone = '0' || right(nw, 9) where school_id = sch and public.norm_phone(guardian_phone) = o
      and not exists (select 1 from public.family_links l where l.school_id = sch and l.phone = o and l.student_id = students.id and l.kind = 'hide');
    get diagnostics n = row_count;
    update public.family_links set kind = 'none', updated_at = now() where school_id = sch and phone = o;
  else
    insert into public.family_links(school_id, phone, student_id, kind)
      select sch, nw, k, 'add' from public.fam_kids(sch, o) k
      on conflict (school_id, phone, student_id) do update set kind = 'add', updated_at = now();
    update public.family_links set kind = 'none', updated_at = now() where school_id = sch and phone = o;
    insert into public.family_links(school_id, phone, student_id, kind)
      select sch, o, s.id, 'hide' from public.students s where s.school_id = sch and public.norm_phone(s.guardian_phone) = o
      on conflict (school_id, phone, student_id) do update set kind = 'hide', updated_at = now();
  end if;
  update public.parent_codes set phone = nw where school_id = sch and phone = o;
  update public.parent_accounts set phone = nw where school_id = sch and phone = o;
  return jsonb_build_object('ok', true, 'students', n);
end $$;

create or replace function public.family_requests() returns jsonb language plpgsql stable security definer set search_path = public as $$
declare sch uuid := public.my_school();
begin
  if sch is null or not public.parent_codes_manager() then raise exception 'no permission'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('phone', l.phone, 'student', s.id, 'name', s.full_name, 'class', (select name from public.classes where id = s.class_id),
      'reg_phone', s.guardian_phone, 'note', l.note, 'pname', l.name, 'at', l.created_at) order by l.created_at desc)
    from public.family_links l join public.students s on s.id = l.student_id where l.school_id = sch and l.kind = 'req'), '[]');
end $$;

create or replace function public.fam_cfg(p_school uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('att', true, 'res', true, 'beh', 'none', 'msg', 'all', 'excuse', true, 'reports', true, 'auto', true,
    'noor', false, 'paper', true, 'practice', true, 'sharedQ', false, 'approve', true, 'selfLink', false)
    || coalesce((select settings->'portal' from public.schools where id = p_school), '{}'::jsonb)
$$;

create or replace function public.fam_link_req(p_token text, p_code text, p_no text, p_note text default null) returns jsonb language plpgsql security definer set search_path = public as $$
declare a public.parent_accounts := public.fam_acc(p_token); s record; d text := btrim(coalesce(p_no, '')); m record;
begin
  if a.id is null then return jsonb_build_object('error', 'AUTH'); end if;
  if not (public.fam_cfg(a.school_id)->>'selfLink')::boolean then return jsonb_build_object('error', 'OFF'); end if;
  if public.portal_blocked(false) then return jsonb_build_object('error', 'TOO_MANY'); end if;
  select st.* into s from public.student_codes c join public.students st on st.id = c.student_id
    where c.code = upper(btrim(coalesce(p_code, ''))) and c.active and st.active and st.school_id = a.school_id;
  if s.id is null or length(d) < 4 or not (coalesce(s.student_no, '') = d or right(coalesce(s.national_id, ''), 4) = right(d, 4) and length(coalesce(s.national_id, '')) >= 4) then
    perform public.portal_blocked(true); return jsonb_build_object('error', 'BAD_CODE'); end if;
  if s.id in (select public.fam_kids(a.school_id, a.phone)) then return jsonb_build_object('error', 'ALREADY'); end if;
  insert into public.family_links(school_id, phone, student_id, kind, note, added_by) values (a.school_id, a.phone, s.id, 'req', left(p_note, 300), null)
    on conflict (school_id, phone, student_id) do update set kind = 'req', note = excluded.note, updated_at = now();
  for m in select x.id from public.staff x where x.school_id = a.school_id and x.active and (x.is_owner or exists (select 1 from public.module_grants g where g.staff_id = x.id and g.module in ('attendance','supervision'))) loop
    perform public.notif_push(a.school_id, m.id, 'parent', 'طلب ربط ابن بحساب ولي أمر', 'طلب ربط الطالب ' || s.full_name || ' — يحتاج اعتماداً', '#/stucodes', null);
  end loop;
  return jsonb_build_object('ok', true, 'name', s.full_name);
end $$;

-- fam_home (+ requests, pickup — في 106c)، pmsg_inbox، pmsg_thread، pmsg_send: أصبحت تستخدم fam_kids بدل مطابقة الجوال المباشرة.

revoke all on function public.family_link(text, uuid, text, text) from public, anon;
revoke all on function public.family_change_phone(text, text, boolean) from public, anon;
revoke all on function public.family_requests() from public, anon;
grant execute on function public.family_link(text, uuid, text, text) to authenticated;
grant execute on function public.family_change_phone(text, text, boolean) to authenticated;
grant execute on function public.family_requests() to authenticated;
grant execute on function public.fam_link_req(text, text, text, text) to anon, authenticated;
