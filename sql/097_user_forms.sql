-- 097: «نماذجي» — نماذج يُنشئها أي مستخدم بهوية المدرسة، تُحفظ وتُرتَّب وتُشارك. جدول جديد فقط.
create table if not exists public.user_forms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  owner uuid not null default public.me() references public.staff(id) on delete cascade,
  name text not null default '', folder text not null default '',
  tpl jsonb not null default '{}'::jsonb, data jsonb not null default '{}'::jsonb,
  sort int not null default 0, shared boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists user_forms_owner on public.user_forms(owner, sort);
alter table public.user_forms enable row level security;
create policy uf_read on public.user_forms for select using (school_id = public.my_school() and (owner = public.me() or shared or public.is_owner()));
create policy uf_ins on public.user_forms for insert with check (school_id = public.my_school() and owner = public.me());
create policy uf_upd on public.user_forms for update using (school_id = public.my_school() and owner = public.me()) with check (owner = public.me());
create policy uf_del on public.user_forms for delete using (school_id = public.my_school() and (owner = public.me() or public.is_owner()));
grant select, insert, update, delete on public.user_forms to authenticated;
