-- 071: طلبات التعديل بانتظار الاعتماد (تنفيذ يومي بعد التأكيد، ومهام أدائية أثناء الأسبوع)
alter table public.plan_entries add column if not exists change_requests jsonb not null default '[]'::jsonb;

-- التأكيد اليومي: المعلم يؤكد حصته مباشرةً، أما تعديل تأكيد سابق فيُرسل للاعتماد (إلا للمالك/المراجع)
create or replace function public.confirm_exec(p_ids uuid[], p_status text, p_note text default '')
returns integer language plpgsql security definer set search_path = public as $$
declare n int := 0; e record; sec uuid; priv boolean; keep jsonb; cur text;
begin
  if p_status not in ('pending','done','modified','not_done') then raise exception 'حالة غير صحيحة'; end if;
  for e in select * from public.plan_entries where id = any(p_ids) loop
    if not (e.teacher_id = public.me() or public.has_perm(public.section_of_week(e.week_id), 'exec_confirm')) then continue; end if;
    sec := public.section_of_week(e.week_id);
    priv := public.is_owner() or public.has_perm(sec, 'review');
    cur := coalesce(e.exec_status, 'pending');
    if not priv and cur <> 'pending' and (cur <> p_status or coalesce(e.exec_note,'') <> coalesce(p_note,'')) then
      perform set_config('dina.rpc','1',true);
      keep := (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements(e.change_requests) x where x->>'kind' <> 'exec');
      update public.plan_entries set change_requests = keep || jsonb_build_array(jsonb_build_object(
        'id', gen_random_uuid()::text, 'kind', 'exec', 'status', 'pending',
        'payload', jsonb_build_object('status', p_status, 'note', coalesce(p_note,''), 'from', cur),
        'by', public.me(), 'at', now())) where id = e.id;
    else
      update public.plan_entries set exec_status = p_status, exec_note = coalesce(p_note,''),
        exec_by = public.me(), exec_at = now() where id = e.id;
    end if;
    n := n + 1;
  end loop;
  if n = 0 then raise exception 'التأكيد اليومي يكون من معلم الحصة أو من مُنح صلاحية التأكيد'; end if;
  return n;
end $$;
grant execute on function public.confirm_exec(uuid[], text, text) to authenticated;

-- مهمة أدائية: المالك/المراجع يضيفها مباشرةً، والمعلم يرسلها للاعتماد وتظهر في الخطة فوراً بعلامة «بانتظار الاعتماد»
create or replace function public.request_perf_task(p_id uuid, p_task jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare e record; sec uuid; priv boolean; t jsonb; keep jsonb; r jsonb;
begin
  select * into e from public.plan_entries where id = p_id;
  if e.id is null then raise exception 'الحصة غير موجودة'; end if;
  sec := public.section_of_week(e.week_id);
  priv := public.is_owner() or public.has_perm(sec, 'review');
  if not (e.teacher_id = public.me() or priv) then raise exception 'هذه الحصة ليست لك'; end if;
  t := jsonb_build_object('type', left(coalesce(p_task->>'type',''), 40), 'text', left(btrim(coalesce(p_task->>'text','')), 600), 'due', left(btrim(coalesce(p_task->>'due','')), 200));
  if (t->>'text') = '' then raise exception 'اكتب نص المهمة'; end if;
  if priv then
    update public.plan_entries set perf_task = t, updated_by = public.me(), updated_at = now() where id = p_id returning to_jsonb(plan_entries.*) into r;
  else
    perform set_config('dina.rpc','1',true);
    keep := (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements(e.change_requests) x where x->>'kind' <> 'perf');
    update public.plan_entries set change_requests = keep || jsonb_build_array(jsonb_build_object(
      'id', gen_random_uuid()::text, 'kind', 'perf', 'status', 'pending', 'payload', t, 'by', public.me(), 'at', now()))
      where id = p_id returning to_jsonb(plan_entries.*) into r;
  end if;
  return r;
end $$;
grant execute on function public.request_perf_task(uuid, jsonb) to authenticated;

-- قرار المالك/المراجع: اعتماد يطبّق التغيير، ورفض يُبقي سببه ظاهراً للمعلم
create or replace function public.decide_entry_change(p_id uuid, p_req text, p_approve boolean, p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare e record; sec uuid; q jsonb; rest jsonb; r jsonb;
begin
  select * into e from public.plan_entries where id = p_id;
  if e.id is null then raise exception 'الحصة غير موجودة'; end if;
  sec := public.section_of_week(e.week_id);
  if not (public.is_owner() or public.has_perm(sec, 'review')) then raise exception 'الاعتماد للمالك أو من يملك صلاحية المراجعة'; end if;
  select x into q from jsonb_array_elements(e.change_requests) x where x->>'id' = p_req limit 1;
  if q is null then raise exception 'الطلب غير موجود أو سبق البت فيه'; end if;
  perform set_config('dina.rpc','1',true);
  rest := (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements(e.change_requests) x where x->>'id' <> p_req);
  if p_approve then
    if q->>'kind' = 'perf' then
      update public.plan_entries set perf_task = (q->'payload') || jsonb_build_object('approved_by', public.me(), 'approved_at', now()), change_requests = rest, updated_by = public.me(), updated_at = now() where id = p_id returning to_jsonb(plan_entries.*) into r;
    elsif q->>'kind' = 'exec' then
      update public.plan_entries set exec_status = q->'payload'->>'status', exec_note = coalesce(q->'payload'->>'note',''), exec_by = public.me(), exec_at = now(), change_requests = rest where id = p_id returning to_jsonb(plan_entries.*) into r;
    else raise exception 'نوع طلب غير معروف'; end if;
  else
    update public.plan_entries set change_requests = rest || jsonb_build_array(q || jsonb_build_object('status', 'rejected', 'note', left(btrim(coalesce(p_note,'')), 400), 'decided_by', public.me(), 'decided_at', now())) where id = p_id returning to_jsonb(plan_entries.*) into r;
  end if;
  return r;
end $$;
grant execute on function public.decide_entry_change(uuid, text, boolean, text) to authenticated;

-- حارس: لا يُعدَّل التنفيذ بعد تأكيده ولا طلبات الاعتماد إلا من المالك/المراجع أو عبر الدوال أعلاه
create or replace function public.guard_plan_entry() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('dina.rpc', true), '') = '1' then return new; end if;
  if new.change_requests is distinct from old.change_requests then raise exception 'طلبات الاعتماد تُدار من الأزرار المخصصة'; end if;
  if (new.exec_status is distinct from old.exec_status or new.exec_note is distinct from old.exec_note)
     and coalesce(old.exec_status, 'pending') <> 'pending'
     and not (public.is_owner() or public.has_perm(public.section_of_week(new.week_id), 'review')) then
    raise exception 'تعديل التنفيذ بعد تأكيده يحتاج اعتماد المالك';
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_plan_entry on public.plan_entries;
create trigger trg_guard_plan_entry before update on public.plan_entries for each row execute function public.guard_plan_entry();
