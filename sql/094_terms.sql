-- 094: الفصول الدراسية (الأول/الثاني/الثالث) — جدول جديد + عمود term_id في weeks (بنية فقط).
-- الأسابيع القائمة لا تُعدَّل: term_id الفارغ = الفصل الأول (ord = 1).
create table if not exists public.terms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  ord smallint not null default 1,
  name text not null default '', year_label text not null default '',
  start_date date, end_date date,
  status text not null default 'prep' check (status in ('prep','active','closed')),
  note text not null default '',
  created_by uuid default public.me() references public.staff(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (school_id, ord)
);
alter table public.weeks add column if not exists term_id uuid references public.terms(id) on delete set null;
create index if not exists weeks_term on public.weeks(term_id);

alter table public.terms enable row level security;
create policy terms_read on public.terms for select using (school_id = public.my_school());
grant select on public.terms to authenticated;

-- أسابيع فصل «قيد التجهيز» لا يراها إلا المالك ومن يملك صلاحية الهيكل
alter policy weeks_read on public.weeks using (
  public.is_member(section_id) and ((not archived) or public.is_owner())
  and (term_id is null or public.is_owner() or public.has_perm(section_id, 'structure')
       or exists (select 1 from public.terms t where t.id = weeks.term_id and t.status <> 'prep')));

-- يضمن وجود صف الفصل الأول (يمثل الأسابيع القائمة)
create or replace function public.term_ensure_first() returns public.terms language plpgsql security definer set search_path = public as $$
declare sch uuid := public.my_school(); r public.terms;
begin
  if not public.is_owner() then raise exception 'إدارة الفصول الدراسية للمالك'; end if;
  select * into r from public.terms where school_id = sch and ord = 1;
  if found then return r; end if;
  insert into public.terms (school_id, ord, name, status, start_date, end_date)
  select sch, 1, 'الفصل الدراسي الأول', 'active',
    (select min(w.start_date) from public.weeks w join public.sections s on s.id = w.section_id where s.school_id = sch),
    (select max(w.start_date) + 4 from public.weeks w join public.sections s on s.id = w.section_id where s.school_id = sch)
  returning * into r;
  return r;
end $$;

-- إنشاء/تعديل فصل دراسي
create or replace function public.term_save(p_id uuid, p_ord int, p_name text, p_year text, p_start date, p_end date, p_note text default '') returns public.terms
language plpgsql security definer set search_path = public as $$
declare sch uuid := public.my_school(); r public.terms;
begin
  if not public.is_owner() then raise exception 'إدارة الفصول الدراسية للمالك'; end if;
  if coalesce(trim(p_name),'') = '' then raise exception 'اكتب اسم الفصل الدراسي'; end if;
  if p_start is not null and p_end is not null and p_end < p_start then raise exception 'تاريخ النهاية قبل البداية'; end if;
  perform public.term_ensure_first();
  if p_id is null then
    if exists (select 1 from public.terms where school_id = sch and ord = p_ord) then raise exception 'هذا الفصل موجود مسبقاً'; end if;
    insert into public.terms (school_id, ord, name, year_label, start_date, end_date, note, status) values (sch, p_ord, trim(p_name), coalesce(p_year,''), p_start, p_end, coalesce(p_note,''), 'prep') returning * into r;
  else
    update public.terms set name = trim(p_name), year_label = coalesce(p_year,''), start_date = p_start, end_date = p_end, note = coalesce(p_note,''), updated_at = now()
      where id = p_id and school_id = sch returning * into r;
    if not found then raise exception 'الفصل غير موجود'; end if;
  end if;
  return r;
end $$;

-- إنشاء أسابيع الفصل لقسم (تحمل الجدول المعتمد والمعلمين المسندين تلقائياً عبر create_week)
create or replace function public.term_create_weeks(p_term uuid, p_section uuid, p_start date, p_count int, p_deadline_days int default 3) returns int
language plpgsql security definer set search_path = public as $$
declare t public.terms; n0 int; i int; w uuid; st date; made int := 0;
  ords text[] := array['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر','الثالث عشر','الرابع عشر','الخامس عشر','السادس عشر','السابع عشر','الثامن عشر','التاسع عشر','العشرون','الحادي والعشرون','الثاني والعشرون','الثالث والعشرون','الرابع والعشرون','الخامس والعشرون'];
begin
  if not public.is_owner() then raise exception 'إدارة الفصول الدراسية للمالك'; end if;
  select * into t from public.terms where id = p_term and school_id = public.my_school();
  if not found then raise exception 'الفصل غير موجود'; end if;
  if not exists (select 1 from public.sections where id = p_section and school_id = t.school_id) then raise exception 'القسم غير موجود'; end if;
  if p_count < 1 or p_count > 25 then raise exception 'عدد الأسابيع من ١ إلى ٢٥'; end if;
  if exists (select 1 from public.weeks where section_id = p_section and term_id = p_term) then raise exception 'أُنشئت أسابيع هذا الفصل لهذا القسم مسبقاً'; end if;
  select coalesce(max(number), 0) into n0 from public.weeks where section_id = p_section;
  for i in 1..p_count loop
    st := p_start + (i - 1) * 7;
    w := public.create_week(p_section, n0 + i, ords[i], st, ((st - p_deadline_days)::timestamp + time '20:00') at time zone 'Asia/Riyadh');
    update public.weeks set term_id = p_term where id = w;
    made := made + 1;
  end loop;
  return made;
end $$;

-- تغيير حالة الفصل: قيد التجهيز / نشط (يصبح الفصل الحالي ويُغلق السابق) / مغلق
create or replace function public.term_set_status(p_id uuid, p_status text) returns public.terms
language plpgsql security definer set search_path = public as $$
declare sch uuid := public.my_school(); r public.terms;
begin
  if not public.is_owner() then raise exception 'إدارة الفصول الدراسية للمالك'; end if;
  if p_status not in ('prep','active','closed') then raise exception 'حالة غير صحيحة'; end if;
  if p_status = 'active' then update public.terms set status = 'closed', updated_at = now() where school_id = sch and status = 'active' and id <> p_id; end if;
  update public.terms set status = p_status, updated_at = now() where id = p_id and school_id = sch returning * into r;
  if not found then raise exception 'الفصل غير موجود'; end if;
  if p_status = 'active' then
    update public.schools set settings = coalesce(settings,'{}'::jsonb) || jsonb_build_object('term_active', r.id) where id = sch;
  end if;
  return r;
end $$;
grant execute on function public.term_ensure_first(), public.term_save(uuid, int, text, text, date, date, text), public.term_create_weeks(uuid, uuid, date, int, int), public.term_set_status(uuid, text) to authenticated;
