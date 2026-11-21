-- 116 — للمنصة الأم فقط: تمهيد مدير المنصة الأول.
-- عند تفعيل حساب مالك المنصة التجريبية برابط الانضمام يُضاف تلقائياً مديراً للمنصة،
-- بشرط ألا يوجد أي مدير منصة قبله (لا يعمل مرة ثانية أبداً).
create or replace function public.platform_bootstrap_trg()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is not null and old.user_id is null and new.is_owner
     and lower(coalesce(new.email, '')) = 'a.abdelazim@dinaschool.com'
     and not exists (select 1 from public.platform_admins) then
    insert into public.platform_admins(user_id, note) values (new.user_id, 'مالك المنصة (تمهيد تلقائي)');
  end if;
  return null;
end $$;
revoke all on function public.platform_bootstrap_trg() from public, anon, authenticated;
create trigger zz_platform_bootstrap after update of user_id on public.staff for each row execute function public.platform_bootstrap_trg();
