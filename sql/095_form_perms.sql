-- 095: صلاحيات أطراف النموذج، الإعادة لأي طرف بأسباب/توصيات، التعميد، وسجل النموذج — أعمدة جديدة فقط.
alter table public.form_tasks add column if not exists perms jsonb not null default '{}'::jsonb;  -- a: edit|sign|view (المكلّف)، c: sign|edit (الزملاء)، share: all|admin، endorse: bool
alter table public.form_tasks add column if not exists trail jsonb not null default '[]'::jsonb;
alter table public.form_tasks add column if not exists endorsed_at timestamptz;
alter table public.form_tasks add column if not exists endorsed_by uuid references public.staff(id) on delete set null;
alter table public.form_tasks add column if not exists endorse_note text not null default '';

create or replace function public.form_trail(t public.form_tasks, p_act text, p_to uuid, p_note text) returns jsonb language sql stable as $$
  select coalesce(t.trail, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('at', now(), 'by', public.me(), 'act', p_act, 'to', p_to, 'note', coalesce(p_note, '')));
$$;

create or replace function public.form_save(p_id uuid, p_data jsonb, p_submit boolean) returns public.form_tasks
language plpgsql security definer set search_path = public as $$
declare t public.form_tasks; adm boolean; co_edit boolean; ap text;
begin
  select * into t from public.form_tasks where id = p_id and school_id = public.my_school() for update;
  if not found then raise exception 'النموذج غير موجود'; end if;
  adm := public.is_owner() or t.created_by = public.me();
  ap := coalesce(t.perms->>'a', 'edit');
  co_edit := t.assignee <> public.me() and exists (select 1 from jsonb_array_elements(t.cosign) c where (c->>'staff_id')::uuid = public.me() and coalesce(c->>'perm', t.perms->>'c', 'sign') = 'edit');
  if t.mode = 'sign' and not adm then raise exception 'هذه الاستمارة يعبّئها المقيّم، ويكتفي المعلم بالاطلاع والتوقيع'; end if;
  if not adm and t.assignee = public.me() and ap = 'sign' and p_submit and t.status in ('assigned','draft','returned') then
    update public.form_tasks set status = 'submitted', submitted_at = now(), trail = public.form_trail(t, 'submit', null, ''), updated_at = now() where id = p_id returning * into t;
    return t;
  end if;
  if not adm and t.assignee = public.me() and ap <> 'edit' then raise exception '%', case when ap = 'sign' then 'صلاحيتك في هذا النموذج التوقيع فقط' else 'صلاحيتك في هذا النموذج الاطلاع فقط' end; end if;
  if t.assignee <> public.me() and not adm and not co_edit then raise exception 'لا تملك تعبئة هذا النموذج'; end if;
  if co_edit and not adm then
    if p_submit then raise exception 'الإرسال للاعتماد للمعلم المكلّف'; end if;
    if t.status in ('submitted','approved') then raise exception 'النموذج مُرسل للاعتماد ولا يمكن تعديله الآن'; end if;
  end if;
  if t.status in ('submitted','approved') and t.assignee = public.me() and not public.is_owner() then raise exception 'النموذج مُرسل للاعتماد ولا يمكن تعديله الآن'; end if;
  if t.status = 'approved' and t.mode = 'sign' then raise exception 'الاستمارة مكتملة بتوقيع المعلم'; end if;
  update public.form_tasks set data = coalesce(p_data, data),
    status = case when p_submit then 'submitted' when status = 'assigned' and t.mode = 'fill' then 'draft' else status end,
    submitted_at = case when p_submit then now() else submitted_at end,
    trail = case when p_submit then public.form_trail(t, 'submit', null, '') else trail end, updated_at = now()
  where id = p_id returning * into t;
  return t;
end $$;

create or replace function public.form_share(p_id uuid, p_staff uuid, p_key text, p_label text) returns public.form_tasks
language plpgsql security definer set search_path = public as $$
declare t public.form_tasks; adm boolean;
begin
  select * into t from public.form_tasks where id = p_id and school_id = public.my_school() for update;
  if not found then raise exception 'النموذج غير موجود'; end if;
  adm := public.is_owner() or t.created_by = public.me() or public.has_module('supervision');
  if not (t.assignee = public.me() or adm) then raise exception 'لا تملك مشاركة هذا النموذج'; end if;
  if not adm and coalesce(t.perms->>'share', 'all') = 'admin' then raise exception 'إضافة الموقّعين في هذا النموذج للإدارة فقط'; end if;
  if t.status = 'approved' then raise exception 'النموذج معتمد'; end if;
  if not exists (select 1 from public.staff s where s.id = p_staff and s.school_id = t.school_id) then raise exception 'الموظف غير موجود'; end if;
  if t.sigs ? p_key then raise exception 'الخانة موقّعة مسبقاً'; end if;
  update public.form_tasks set cosign = (select coalesce(jsonb_agg(c), '[]'::jsonb) from jsonb_array_elements(cosign) c where c->>'key' <> p_key)
      || jsonb_build_array(jsonb_build_object('staff_id', p_staff, 'key', p_key, 'label', p_label, 'status', 'pending', 'by', public.me(), 'requested_at', now())),
    trail = public.form_trail(t, 'share', p_staff, p_label), updated_at = now() where id = p_id returning * into t;
  return t;
end $$;

create or replace function public.form_decide(p_id uuid, p_approve boolean, p_note text) returns public.form_tasks
language plpgsql security definer set search_path = public as $$
declare t public.form_tasks;
begin
  select * into t from public.form_tasks where id = p_id and school_id = public.my_school() for update;
  if not found then raise exception 'النموذج غير موجود'; end if;
  if not (public.is_owner() or t.created_by = public.me() or public.has_module('supervision')) then raise exception 'الاعتماد للمالك أو المشرف'; end if;
  update public.form_tasks set status = case when p_approve then 'approved' else 'returned' end, review_note = coalesce(p_note, ''),
    decided_at = now(), decided_by = public.me(),
    endorsed_at = case when p_approve then endorsed_at else null end, endorsed_by = case when p_approve then endorsed_by else null end,
    trail = public.form_trail(t, case when p_approve then 'approve' else 'return' end, case when p_approve then null else t.assignee end, p_note), updated_at = now()
  where id = p_id returning * into t;
  return t;
end $$;

-- إعادة النموذج لأي طرف (المكلّف أو أحد الموقّعين) مع سبب أو توصية
create or replace function public.form_return(p_id uuid, p_to uuid, p_note text, p_kind text default 'return') returns public.form_tasks
language plpgsql security definer set search_path = public as $$
declare t public.form_tasks; k text;
begin
  select * into t from public.form_tasks where id = p_id and school_id = public.my_school() for update;
  if not found then raise exception 'النموذج غير موجود'; end if;
  if not (public.is_owner() or t.created_by = public.me() or public.has_module('supervision')) then raise exception 'الإعادة للمالك أو المشرف'; end if;
  if coalesce(trim(p_note), '') = '' then raise exception 'اكتب السبب أو التوصية'; end if;
  k := case when p_kind = 'recommend' then 'recommend' else 'return' end;
  if p_to = t.assignee then
    update public.form_tasks set status = case when k = 'return' then 'returned' else status end, review_note = trim(p_note),
      decided_at = case when k = 'return' then now() else decided_at end, decided_by = case when k = 'return' then public.me() else decided_by end,
      endorsed_at = case when k = 'return' then null else endorsed_at end, endorsed_by = case when k = 'return' then null else endorsed_by end,
      trail = public.form_trail(t, k, p_to, p_note), updated_at = now() where id = p_id returning * into t;
  else
    select string_agg(c->>'key', ',') into k from jsonb_array_elements(t.cosign) c where (c->>'staff_id')::uuid = p_to;
    if k is null then raise exception 'هذا الشخص ليس طرفاً في النموذج'; end if;
    update public.form_tasks set
      sigs = (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) from jsonb_each(sigs) e where not (e.key = any(string_to_array(k, ',')))),
      cosign = (select coalesce(jsonb_agg(case when (c->>'staff_id')::uuid = p_to then (c || jsonb_build_object('status', 'returned', 'note', trim(p_note), 'returned_at', now())) - 'at' else c end), '[]'::jsonb) from jsonb_array_elements(cosign) c),
      status = case when status = 'approved' then 'submitted' else status end, endorsed_at = null, endorsed_by = null,
      trail = public.form_trail(t, case when p_kind = 'recommend' then 'recommend' else 'return' end, p_to, p_note), updated_at = now()
    where id = p_id returning * into t;
  end if;
  if p_to <> t.assignee or p_kind = 'recommend' then perform public.notif_push(t.school_id, p_to, 'form_returned', case when p_kind = 'recommend' then 'توصية على نموذج' else 'أُعيد إليك نموذج' end, t.title || E'\n' || trim(p_note), '#/forms', public.me()); end if;
  return t;
end $$;

-- التعميد: ختم المالك النهائي بعد الاعتماد (أو إلغاؤه)
create or replace function public.form_endorse(p_id uuid, p_note text default '', p_undo boolean default false) returns public.form_tasks
language plpgsql security definer set search_path = public as $$
declare t public.form_tasks;
begin
  select * into t from public.form_tasks where id = p_id and school_id = public.my_school() for update;
  if not found then raise exception 'النموذج غير موجود'; end if;
  if not public.is_owner() then raise exception 'التعميد للمالك'; end if;
  if not p_undo and t.status <> 'approved' then raise exception 'اعتمد النموذج أولاً ثم عمّده'; end if;
  update public.form_tasks set endorsed_at = case when p_undo then null else now() end, endorsed_by = case when p_undo then null else public.me() end,
    endorse_note = case when p_undo then '' else coalesce(p_note, '') end,
    trail = public.form_trail(t, case when p_undo then 'unendorse' else 'endorse' end, null, p_note), updated_at = now()
  where id = p_id returning * into t;
  if not p_undo then perform public.notif_push(t.school_id, t.assignee, 'form_approved', 'عُمِّد نموذجك', t.title, '#/forms', public.me()); end if;
  return t;
end $$;
grant execute on function public.form_return(uuid, uuid, text, text), public.form_endorse(uuid, text, boolean) to authenticated;

-- التوقيع: المكلّف بصلاحية «اطلاع فقط» لا يوقّع (بقية المنطق كما في 080)
create or replace function public.form_sign(p_id uuid, p_key text, p_label text, p_img text, p_name text, p_remove boolean default false) returns public.form_tasks
language plpgsql security definer set search_path = public as $$
declare t public.form_tasks; adm boolean; co boolean; cur jsonb;
begin
  select * into t from public.form_tasks where id = p_id and school_id = public.my_school() for update;
  if not found then raise exception 'النموذج غير موجود'; end if;
  if t.status = 'approved' then raise exception 'النموذج معتمد ولا يقبل تعديل التوقيعات'; end if;
  adm := public.is_owner() or t.created_by = public.me() or public.has_module('supervision');
  co := exists (select 1 from jsonb_array_elements(t.cosign) c where (c->>'staff_id')::uuid = public.me() and c->>'key' = p_key);
  cur := t.sigs -> p_key;
  if not (adm or co or t.assignee = public.me()) then raise exception 'لا تملك التوقيع في هذه الخانة'; end if;
  if not adm and not co and t.assignee = public.me() and coalesce(t.perms->>'a', 'edit') = 'view' then raise exception 'صلاحيتك في هذا النموذج الاطلاع فقط'; end if;
  if t.mode = 'sign' and not adm and not co then raise exception 'وقّع في خانتك المحددة فقط'; end if;
  if t.mode = 'sign' and not adm and t.status <> 'submitted' then raise exception 'الاستمارة لم تُرسل لك بعد'; end if;
  if not adm and not co and exists (select 1 from jsonb_array_elements(t.cosign) c where c->>'key' = p_key) then raise exception 'هذه الخانة مخصّصة لتوقيع زميل'; end if;
  if cur is not null and (cur->>'staff_id')::uuid <> public.me() and not adm then raise exception 'الخانة موقّعة من شخص آخر'; end if;
  if p_remove then
    update public.form_tasks set sigs = sigs - p_key,
      cosign = (select coalesce(jsonb_agg(case when c->>'key' = p_key then (c || jsonb_build_object('status','pending')) - 'at' else c end), '[]'::jsonb) from jsonb_array_elements(cosign) c),
      updated_at = now() where id = p_id returning * into t;
  else
    if coalesce(length(p_img), 0) < 50 then raise exception 'التوقيع فارغ'; end if;
    update public.form_tasks set sigs = sigs || jsonb_build_object(p_key, jsonb_build_object('img', p_img, 'name', p_name, 'label', p_label, 'staff_id', public.me(), 'at', now())),
      cosign = (select coalesce(jsonb_agg(case when c->>'key' = p_key and (c->>'staff_id')::uuid = public.me() then c || jsonb_build_object('status','signed','at', now()) else c end), '[]'::jsonb) from jsonb_array_elements(cosign) c),
      updated_at = now() where id = p_id returning * into t;
    if t.mode = 'sign' and t.status = 'submitted' and not exists (select 1 from jsonb_array_elements(t.cosign) c where c->>'status' <> 'signed') then
      update public.form_tasks set status = 'approved', decided_at = now(), decided_by = public.me(), updated_at = now() where id = p_id returning * into t;
    end if;
  end if;
  return t;
end $$;
