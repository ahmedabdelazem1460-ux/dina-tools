-- 111c: دمج/حذف الحسابات — مشغّلات كل جدول تُعطَّل أثناء النقل داخل المعاملة نفسها ثم تُعاد (session_replication_role غير مسموح في Supabase)
create or replace function public.people_merge(p_kind text, p_from uuid, p_into uuid, p_drop_login boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; q record; n bigint; m bigint; ex boolean; out jsonb := '[]'::jsonb; v_sch uuid; v_sch2 uuid; v_uid uuid; tbl text;
  f text := p_from::text; i text := p_into::text;
begin
  if p_kind not in ('staff', 'student') then raise exception 'bad kind'; end if;
  if p_from = p_into then raise exception 'نفس الحساب'; end if;
  tbl := case when p_kind = 'staff' then 'staff' else 'students' end;
  execute format('select school_id from public.%I where id = $1', tbl) into v_sch using p_from;
  execute format('select school_id from public.%I where id = $1', tbl) into v_sch2 using p_into;
  if v_sch is null or v_sch2 is null then raise exception 'الحساب غير موجود'; end if;
  if v_sch <> v_sch2 or v_sch <> public.my_school() or not public.is_owner() then raise exception 'no permission'; end if;
  if p_kind = 'staff' then
    if (select is_owner from public.staff where id = p_from) then raise exception 'لا يُدمج حساب المالك'; end if;
    if p_from = public.me() then raise exception 'لا يمكن دمج حسابك الحالي'; end if;
    select user_id into v_uid from public.staff where id = p_from;
  end if;
  for r in
    select c.table_name t, c.column_name col, case when c.data_type = 'uuid' then 'uuid' when c.udt_name = '_uuid' then 'arr' when c.data_type in ('jsonb','json') then 'json' else 'text' end k, c.data_type dt
      from information_schema.columns c join information_schema.tables x on x.table_schema = c.table_schema and x.table_name = c.table_name and x.table_type = 'BASE TABLE'
     where c.table_schema = 'public' and (c.data_type in ('uuid','jsonb','json','text') or c.udt_name = '_uuid')
       and not (c.table_name = tbl and c.column_name = 'id')
  loop
    n := 0; m := 0;
    if r.k = 'uuid' then execute format('select exists(select 1 from public.%I where %I = $1)', r.t, r.col) into ex using p_from;
    elsif r.k = 'arr' then execute format('select exists(select 1 from public.%I where $1 = any(%I))', r.t, r.col) into ex using p_from;
    else execute format('select exists(select 1 from public.%I where strpos(%I::text, $1) > 0)', r.t, r.col) into ex using f; end if;
    if ex then
      -- مشغّلات الحماية/المزامنة/السجلات معطّلة لهذا الجدول أثناء النقل فقط (داخل نفس المعاملة)؛ القيود الفريدة والمفاتيح تبقى
      execute format('alter table public.%I disable trigger user', r.t);
      if r.k = 'uuid' then
        begin
          execute format('update public.%I set %I = $1 where %I = $2', r.t, r.col, r.col) using p_into, p_from; get diagnostics n = row_count;
        exception when unique_violation then
          for q in execute format('select ctid c from public.%I where %I = $1', r.t, r.col) using p_from loop
            begin execute format('update public.%I set %I = $1 where ctid = $2', r.t, r.col) using p_into, q.c; n := n + 1;
            exception when unique_violation then execute format('delete from public.%I where ctid = $1', r.t) using q.c; m := m + 1; end;
          end loop;
        end;
      elsif r.k = 'arr' then
        execute format('update public.%I set %I = (select array_agg(distinct e) from unnest(array_replace(%I, $2, $1)) e) where $2 = any(%I)', r.t, r.col, r.col, r.col) using p_into, p_from; get diagnostics n = row_count;
      elsif r.k = 'json' then
        execute format('update public.%I set %I = replace(%I::text, $2, $1)::%s where strpos(%I::text, $2) > 0', r.t, r.col, r.col, r.dt, r.col) using i, f; get diagnostics n = row_count;
      else
        begin
          execute format('update public.%I set %I = replace(%I, $2, $1) where strpos(%I, $2) > 0', r.t, r.col, r.col, r.col) using i, f; get diagnostics n = row_count;
        exception when unique_violation then
          for q in execute format('select ctid c from public.%I where strpos(%I, $1) > 0', r.t, r.col) using f loop
            begin execute format('update public.%I set %I = replace(%I, $2, $1) where ctid = $3', r.t, r.col, r.col) using i, f, q.c; n := n + 1;
            exception when unique_violation then execute format('delete from public.%I where ctid = $1', r.t) using q.c; m := m + 1; end;
          end loop;
        end;
      end if;
      execute format('alter table public.%I enable trigger user', r.t);
    end if;
    if n + m > 0 then out := out || jsonb_build_array(jsonb_build_object('t', r.t, 'c', r.col, 'moved', n, 'dropped', m)); end if;
  end loop;
  execute format('alter table public.%I disable trigger user', tbl);
  execute format('delete from public.%I where id = $1', tbl) using p_from;
  execute format('alter table public.%I enable trigger user', tbl);
  if p_kind = 'staff' and p_drop_login and v_uid is not null and not exists (select 1 from public.staff where user_id = v_uid) then
    begin delete from auth.users where id = v_uid; exception when others then null; end;
  end if;
  insert into public.audit_log (staff_id, entity, entity_id, action, details)
  values (public.me(), tbl, p_into, 'merge', jsonb_build_object('from', p_from, 'into', p_into, 'changes', out));
  return out;
end $$;

-- الحذف النهائي: الموظف بلا بيانات فقط (وإلا الدمج أو الإيقاف)؛ الطالب مع بياناته عند p_force
create or replace function public.people_delete(p_kind text, p_id uuid, p_force boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_sch uuid; v_uid uuid; refs jsonb; blocking jsonb; e jsonb; r record;
begin
  if p_kind not in ('staff', 'student') then raise exception 'bad kind'; end if;
  refs := public.people_refs(p_kind, p_id);   -- يتحقق من الصلاحية
  if p_kind = 'staff' then
    select school_id, user_id into v_sch, v_uid from public.staff where id = p_id;
    if (select is_owner from public.staff where id = p_id) or p_id = public.me() then raise exception 'لا يُحذف هذا الحساب'; end if;
    -- ما يُعد «عملاً» للموظف (غير السجلات التلقائية والعضويات والإشعارات)
    select coalesce(jsonb_agg(x), '[]'::jsonb) into blocking from jsonb_array_elements(refs) x
     where x->>'t' not in ('memberships','module_grants','notif_prefs','notifications','login_events','audit_log','trash','staff_signatures','join_codes');
    if jsonb_array_length(blocking) > 0 then raise exception 'HAS_DATA:%', blocking::text; end if;
    alter table public.memberships disable trigger user; alter table public.staff disable trigger user; alter table public.module_grants disable trigger user; alter table public.join_codes disable trigger user;
    delete from public.memberships where staff_id = p_id; delete from public.module_grants where staff_id = p_id;
    delete from public.notif_prefs where staff_id = p_id; delete from public.notifications where staff_id = p_id or created_by = p_id;
    delete from public.login_events where staff_id = p_id; delete from public.staff_signatures where staff_id = p_id;
    update public.audit_log set staff_id = null where staff_id = p_id; update public.join_codes set created_by = null where created_by = p_id;
    delete from public.staff where id = p_id;
    alter table public.memberships enable trigger user; alter table public.staff enable trigger user; alter table public.module_grants enable trigger user; alter table public.join_codes enable trigger user;
    if v_uid is not null and not exists (select 1 from public.staff where user_id = v_uid) then
      begin delete from auth.users where id = v_uid; exception when others then null; end;
    end if;
  else
    select school_id into v_sch from public.students where id = p_id;
    select coalesce(jsonb_agg(x), '[]'::jsonb) into blocking from jsonb_array_elements(refs) x where x->>'k' = 'uuid' and x->>'t' not in ('audit_log','trash');
    if jsonb_array_length(blocking) > 0 and not p_force then raise exception 'HAS_DATA:%', blocking::text; end if;
    for e in select * from jsonb_array_elements(blocking) loop
      execute format('delete from public.%I where %I = $1', e->>'t', e->>'c') using p_id;
    end loop;
    delete from public.students where id = p_id;
  end if;
  insert into public.audit_log (staff_id, entity, entity_id, action, details)
  values (public.me(), case when p_kind = 'staff' then 'staff' else 'students' end, p_id, 'delete', jsonb_build_object('id', p_id, 'refs', refs));
  return refs;
end $$;

