-- 078: النماذج والاستمارات للمعلمين + التوقيع الإلكتروني — جداول جديدة فقط، لا مساس بأي بيانات قائمة.
create table if not exists public.form_tasks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  batch_id uuid,
  tid text not null default '', title text not null default '', cat text default '',
  tpl jsonb not null, cfg jsonb not null default '{}'::jsonb,
  assignee uuid not null references public.staff(id) on delete cascade,
  created_by uuid default public.me() references public.staff(id) on delete set null,
  status text not null default 'assigned' check (status in ('assigned','draft','submitted','returned','approved')),
  data jsonb not null default '{}'::jsonb,
  sigs jsonb not null default '{}'::jsonb,
  cosign jsonb not null default '[]'::jsonb,
  due_date date, note text default '', review_note text default '',
  submitted_at timestamptz, decided_at timestamptz, decided_by uuid,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists form_tasks_school on public.form_tasks(school_id, created_at desc);
create index if not exists form_tasks_assignee on public.form_tasks(assignee);
create index if not exists form_tasks_cosign on public.form_tasks using gin (cosign jsonb_path_ops);

create table if not exists public.staff_signatures (
  staff_id uuid primary key references public.staff(id) on delete cascade,
  img text not null,
  updated_at timestamptz not null default now()
);

create or replace function public.form_admin() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or public.has_module('supervision')
$$;
create or replace function public.form_is_cosigner(t public.form_tasks) returns boolean language sql stable as $$
  select exists (select 1 from jsonb_array_elements(t.cosign) c where (c->>'staff_id')::uuid = public.me())
$$;

alter table public.form_tasks enable row level security;
alter table public.staff_signatures enable row level security;
create policy ft_read on public.form_tasks for select using (school_id = public.my_school() and (public.form_admin() or assignee = public.me() or created_by = public.me() or public.form_is_cosigner(form_tasks)));
create policy ft_ins on public.form_tasks for insert with check (school_id = public.my_school() and public.form_admin());
create policy ft_upd on public.form_tasks for update using (school_id = public.my_school() and (public.is_owner() or created_by = public.me()));
create policy ft_del on public.form_tasks for delete using (school_id = public.my_school() and (public.is_owner() or created_by = public.me()));
create policy sg_own on public.staff_signatures for all using (staff_id = public.me()) with check (staff_id = public.me());
grant select, insert, update, delete on public.form_tasks, public.staff_signatures to authenticated;

-- المعلم: حفظ البيانات أو الإرسال للاعتماد
create or replace function public.form_save(p_id uuid, p_data jsonb, p_submit boolean) returns public.form_tasks
language plpgsql security definer set search_path = public as $$
declare t public.form_tasks;
begin
  select * into t from public.form_tasks where id = p_id and school_id = public.my_school() for update;
  if not found then raise exception 'النموذج غير موجود'; end if;
  if t.assignee <> public.me() and not (public.is_owner() or t.created_by = public.me()) then raise exception 'لا تملك تعبئة هذا النموذج'; end if;
  if t.status in ('submitted','approved') and t.assignee = public.me() and not public.is_owner() then raise exception 'النموذج مُرسل للاعتماد ولا يمكن تعديله الآن'; end if;
  update public.form_tasks set data = coalesce(p_data, data),
    status = case when p_submit then 'submitted' when status = 'assigned' then 'draft' else status end,
    submitted_at = case when p_submit then now() else submitted_at end, updated_at = now()
  where id = p_id returning * into t;
  return t;
end $$;

-- التوقيع: المعلم المكلّف، أو الزميل المطلوب توقيعه في خانته، أو المعتمِد
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
  end if;
  return t;
end $$;

-- مشاركة النموذج مع زميل للتوقيع في خانة محددة
create or replace function public.form_share(p_id uuid, p_staff uuid, p_key text, p_label text) returns public.form_tasks
language plpgsql security definer set search_path = public as $$
declare t public.form_tasks;
begin
  select * into t from public.form_tasks where id = p_id and school_id = public.my_school() for update;
  if not found then raise exception 'النموذج غير موجود'; end if;
  if not (t.assignee = public.me() or public.is_owner() or t.created_by = public.me() or public.has_module('supervision')) then raise exception 'لا تملك مشاركة هذا النموذج'; end if;
  if t.status = 'approved' then raise exception 'النموذج معتمد'; end if;
  if not exists (select 1 from public.staff s where s.id = p_staff and s.school_id = t.school_id) then raise exception 'الموظف غير موجود'; end if;
  if t.sigs ? p_key then raise exception 'الخانة موقّعة مسبقاً'; end if;
  update public.form_tasks set cosign = (select coalesce(jsonb_agg(c), '[]'::jsonb) from jsonb_array_elements(cosign) c where c->>'key' <> p_key)
      || jsonb_build_array(jsonb_build_object('staff_id', p_staff, 'key', p_key, 'label', p_label, 'status', 'pending', 'by', public.me(), 'requested_at', now())),
    updated_at = now() where id = p_id returning * into t;
  return t;
end $$;

-- الاعتماد أو الإعادة بملاحظة
create or replace function public.form_decide(p_id uuid, p_approve boolean, p_note text) returns public.form_tasks
language plpgsql security definer set search_path = public as $$
declare t public.form_tasks;
begin
  select * into t from public.form_tasks where id = p_id and school_id = public.my_school() for update;
  if not found then raise exception 'النموذج غير موجود'; end if;
  if not (public.is_owner() or t.created_by = public.me() or public.has_module('supervision')) then raise exception 'الاعتماد للمالك أو المشرف'; end if;
  update public.form_tasks set status = case when p_approve then 'approved' else 'returned' end, review_note = coalesce(p_note, ''),
    decided_at = now(), decided_by = public.me(), updated_at = now() where id = p_id returning * into t;
  return t;
end $$;
grant execute on function public.form_save(uuid, jsonb, boolean), public.form_sign(uuid, text, text, text, text, boolean), public.form_share(uuid, uuid, text, text), public.form_decide(uuid, boolean, text) to authenticated;
alter publication supabase_realtime add table public.form_tasks;
