-- 101: البوصلة — مشاركة نتائج التطبيق مع معلمين محددين، ورابط للطلاب من خارج المدرسة (بيانات إضافية). إضافات فقط.
alter table public.scale_runs add column if not exists shared uuid[] not null default '{}';
alter table public.scale_resp add column if not exists meta jsonb not null default '{}'::jsonb;

-- المعلم المشارَك معه يقرأ التطبيق ونتائجه فقط (لا تعديل ولا حذف)
create policy sr_shared on public.scale_runs for select using (school_id = public.my_school() and public.me() = any(shared));
create policy sp_shared on public.scale_resp for select using (exists (select 1 from public.scale_runs r where r.id = run_id and r.school_id = public.my_school() and public.me() = any(r.shared)));

-- إرسال طالب من خارج المدرسة (الاسم + المدرسة + الصف + جوال ولي الأمر)
create or replace function public.scale_submit_ext(p_code text, p_device text, p_name text, p_meta jsonb, p_answers jsonb, p_scores jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare r public.scale_runs;
begin
  select * into r from public.scale_runs where code = upper(trim(p_code)) and state = 'open';
  if not found then raise exception 'المقياس مغلق'; end if;
  if coalesce(length(p_device), 0) < 6 or jsonb_array_length(p_answers) > 80 or length(coalesce(p_meta, '{}'::jsonb)::text) > 1000 then raise exception 'بيانات غير صالحة'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'اكتب الاسم'; end if;
  insert into public.scale_resp (run_id, student_id, device, name, answers, scores, meta) values (r.id, null, left(p_device, 64), left(trim(p_name), 60), p_answers, p_scores, coalesce(p_meta, '{}'::jsonb))
  on conflict (run_id, device) do update set name = excluded.name, answers = excluded.answers, scores = excluded.scores, meta = excluded.meta, created_at = now();
  return true;
end $$;
grant execute on function public.scale_submit_ext(text, text, text, jsonb, jsonb, jsonb) to anon, authenticated;
