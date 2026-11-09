-- 082: محادثة الإحالة وتوجيهات الموجه الطلابي — جدول جديد فقط.
create table if not exists public.counsel_msgs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  ref_id uuid references public.behaviors(id) on delete cascade,
  case_id uuid references public.counsel_cases(id) on delete set null,
  student_id uuid references public.students(id) on delete cascade,
  from_staff uuid not null default public.me() references public.staff(id) on delete cascade,
  recipients uuid[] not null default '{}',
  kind text not null default 'msg' check (kind in ('msg','guide')),
  body text not null,
  need_ack boolean not null default false,
  acks jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists counsel_msgs_ref on public.counsel_msgs(ref_id, created_at);
create index if not exists counsel_msgs_rcp on public.counsel_msgs using gin (recipients);
alter table public.counsel_msgs enable row level security;
-- يقرأ الرسالة: مرسلها، ومن أُرسلت إليه، والموجه الطلابي والمالك
create policy cm_read on public.counsel_msgs for select using (school_id = public.my_school() and (public.is_counselor() or from_staff = public.me() or public.me() = any(recipients)));
-- يرسل: الموجه (رسائل وتوجيهات)، والمُحيل يردّ داخل محادثة إحالته فقط، ومستلم التوجيه يردّ على الموجه
create policy cm_ins on public.counsel_msgs for insert with check (school_id = public.my_school() and from_staff = public.me() and (
  public.is_counselor()
  or (kind = 'msg' and ref_id is not null and exists (select 1 from public.behaviors b where b.id = ref_id and b.by_staff = public.me()))
  or (kind = 'msg' and ref_id is null and recipients <@ array(select public.counselor_ids()) )));
create policy cm_del on public.counsel_msgs for delete using (school_id = public.my_school() and (from_staff = public.me() or public.is_owner()));
grant select, insert, delete on public.counsel_msgs to authenticated;

-- تأكيد الاطلاع على التوجيه
create or replace function public.counsel_ack(p_id uuid) returns public.counsel_msgs
language plpgsql security definer set search_path = public as $$
declare m public.counsel_msgs;
begin
  select * into m from public.counsel_msgs where id = p_id and school_id = public.my_school() for update;
  if not found or not (public.me() = any(m.recipients)) then raise exception 'التوجيه غير موجّه إليك'; end if;
  update public.counsel_msgs set acks = acks || jsonb_build_object(public.me()::text, now()) where id = p_id returning * into m;
  return m;
end $$;
grant execute on function public.counsel_ack(uuid) to authenticated;

-- معلمو الفصل (من الخطط الأسبوعية) لإرسال التوجيه لهم
create or replace function public.class_teachers(p_class uuid) returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct e.teacher_id from public.plan_entries e join public.classes c on c.id = e.class_id join public.sections s on s.id = c.section_id
  where e.class_id = p_class and s.school_id = public.my_school() and e.teacher_id is not null and public.is_counselor()
$$;
grant execute on function public.class_teachers(uuid) to authenticated;
alter publication supabase_realtime add table public.counsel_msgs;
