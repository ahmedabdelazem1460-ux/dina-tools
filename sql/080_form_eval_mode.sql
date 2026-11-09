-- 080: استمارات التقييم: يعبّئها المقيّم ويوقّع عليها المعلم بالعلم (mode = 'sign').
-- إضافة أعمدة فقط؛ النماذج القائمة تبقى بالطريقة المعتادة (mode = 'fill').
alter table public.form_tasks add column if not exists mode text not null default 'fill';
alter table public.form_tasks add column if not exists teacher_note text not null default '';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'form_tasks_mode_chk') then
    alter table public.form_tasks add constraint form_tasks_mode_chk check (mode in ('fill','sign'));
  end if;
end $$;
-- المعلم لا يرى استمارة تقييمه وهي مسودة لدى المقيّم
alter policy ft_read on public.form_tasks using (school_id = public.my_school() and (public.form_admin() or created_by = public.me()
  or (assignee = public.me() and (mode = 'fill' or status <> 'assigned')) or public.form_is_cosigner(form_tasks)));

create or replace function public.form_save(p_id uuid, p_data jsonb, p_submit boolean) returns public.form_tasks
language plpgsql security definer set search_path = public as $$
declare t public.form_tasks; adm boolean;
begin
  select * into t from public.form_tasks where id = p_id and school_id = public.my_school() for update;
  if not found then raise exception 'النموذج غير موجود'; end if;
  adm := public.is_owner() or t.created_by = public.me();
  if t.mode = 'sign' and not adm then raise exception 'هذه الاستمارة يعبّئها المقيّم، ويكتفي المعلم بالاطلاع والتوقيع'; end if;
  if t.assignee <> public.me() and not adm then raise exception 'لا تملك تعبئة هذا النموذج'; end if;
  if t.status in ('submitted','approved') and t.assignee = public.me() and not public.is_owner() then raise exception 'النموذج مُرسل للاعتماد ولا يمكن تعديله الآن'; end if;
  if t.status = 'approved' and t.mode = 'sign' then raise exception 'الاستمارة مكتملة بتوقيع المعلم'; end if;
  update public.form_tasks set data = coalesce(p_data, data),
    status = case when p_submit then 'submitted' when status = 'assigned' and t.mode = 'fill' then 'draft' else status end,
    submitted_at = case when p_submit then now() else submitted_at end, updated_at = now()
  where id = p_id returning * into t;
  return t;
end $$;

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
    -- استمارة التقييم تكتمل تلقائياً عند توقيع المعلم (وكل التوقيعات المطلوبة)
    if t.mode = 'sign' and t.status = 'submitted' and not exists (select 1 from jsonb_array_elements(t.cosign) c where c->>'status' <> 'signed') then
      update public.form_tasks set status = 'approved', decided_at = now(), decided_by = public.me(), updated_at = now() where id = p_id returning * into t;
    end if;
  end if;
  return t;
end $$;

-- ملاحظة المعلم على تقييمه (قبل التوقيع أو بعده)
create or replace function public.form_teacher_note(p_id uuid, p_note text) returns public.form_tasks
language plpgsql security definer set search_path = public as $$
declare t public.form_tasks;
begin
  select * into t from public.form_tasks where id = p_id and school_id = public.my_school() for update;
  if not found then raise exception 'النموذج غير موجود'; end if;
  if t.assignee <> public.me() then raise exception 'الملاحظة للمعلم صاحب الاستمارة'; end if;
  if t.status = 'assigned' then raise exception 'الاستمارة لم تُرسل لك بعد'; end if;
  update public.form_tasks set teacher_note = left(coalesce(p_note, ''), 2000), updated_at = now() where id = p_id returning * into t;
  return t;
end $$;
grant execute on function public.form_teacher_note(uuid, text) to authenticated;
-- تصحيح: إخفاء مسودة التقييم عن المعلم أيضاً عبر قائمة التوقيعات
alter policy ft_read on public.form_tasks using (school_id = public.my_school() and (public.form_admin() or created_by = public.me()
  or ((assignee = public.me() or public.form_is_cosigner(form_tasks)) and (mode = 'fill' or status <> 'assigned'))));
