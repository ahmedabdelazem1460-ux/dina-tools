-- 108: الزيارات الصفية (زيارات المدير الأكاديمي/مدير المدرسة/المشرف…) — مبنية على form_tasks (mode = 'sign')
-- إضافة فقط: عمود visit (بيانات الزيارة: الفصل، الحصة، اليوم، المادة، الدرس، النوع، المرفقات…)
-- ومنحة جديدة «visits» تسمح بإنشاء الزيارات لمن ليس لديه «الإشراف التربوي». النماذج القائمة لا تتأثر.
alter table public.form_tasks add column if not exists visit jsonb;
create index if not exists form_tasks_visit on public.form_tasks(school_id, created_at desc) where visit is not null;

create or replace function public.visit_ok() returns boolean language sql stable security definer set search_path = public as $$
  select public.is_owner() or public.has_module('supervision') or public.has_module('visits')
$$;
revoke all on function public.visit_ok() from public, anon;
grant execute on function public.visit_ok() to authenticated;

-- من يملك «visits» فقط يُنشئ زيارات (استمارة تقييم يعبّئها هو ويوقّع المعلم) ولا يُرسل نماذج عامة
alter policy ft_ins on public.form_tasks with check (
  school_id = public.my_school() and (
    public.form_admin()
    or (visit is not null and mode = 'sign' and created_by = public.me() and public.has_module('visits'))
  ));
