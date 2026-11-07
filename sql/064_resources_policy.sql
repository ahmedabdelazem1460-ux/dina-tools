-- 064: إعدادات مرنة لمشاركة المصادر (schools.settings.res_policy) — تُطبَّق في قاعدة البيانات
-- res_policy: { review: true  (كل مصدر جديد من معلم يُرسل للمالك تلقائياً «بانتظار الاعتماد»)
--               auto: 'none' | 'subject' | 'all'   (اعتماد تلقائي دون انتظار: لمعلمي المادة / للجميع)
--               trusted: [staff ids]               (معلمون موثوقون: تُعتمد مصادرهم تلقائياً بالنطاق auto_scope)
--               trusted_scope: 'subject' | 'all'
--               parents: true  (إظهار المصدر لأولياء الأمور يحتاج موافقة المالك) }
alter table public.resources add column if not exists parents_req boolean not null default false;

create or replace function public.res_share_guard() returns trigger language plpgsql security definer set search_path = public as $$
declare pol jsonb; ask boolean; auto text; tr boolean;
begin
  if public.is_owner() then
    if new.share_status = 'shared' and (tg_op = 'INSERT' or old.share_status is distinct from 'shared') then new.shared_by := public.me(); new.shared_at := now(); end if;
    if new.visible_to_parents then new.parents_req := false; end if;
    return new;
  end if;
  select coalesce(settings->'res_policy', '{}'::jsonb) into pol from public.schools where id = new.school_id;
  tr := coalesce(pol->'trusted', '[]'::jsonb) ? public.me()::text;
  auto := case when tr then coalesce(pol->>'trusted_scope', 'all') else coalesce(pol->>'auto', 'none') end;
  if tg_op = 'INSERT' then
    new.share_to := '{}'; new.shared_by := null; new.shared_at := null;
    ask := new.share_status = 'pending' or tr or coalesce((pol->>'review')::boolean, true);
  else
    new.share_to := old.share_to; new.shared_by := old.shared_by; new.shared_at := old.shared_at;
    if new.share_status = 'rejected' and old.share_status <> 'rejected' then new.share_status := old.share_status; end if;
    ask := new.share_status in ('pending','shared') and old.share_status not in ('pending','shared');
    if not ask then
      if new.share_status = 'shared' and old.share_status <> 'shared' then new.share_status := old.share_status; end if;
      new.share_scope := old.share_scope;
    end if;
  end if;
  if ask then
    if auto in ('subject','all') then new.share_status := 'shared'; new.share_scope := auto; new.shared_at := now();
    else new.share_status := 'pending'; new.share_scope := 'all'; end if;
  elsif tg_op = 'INSERT' then new.share_status := 'private'; new.share_scope := 'all';
  end if;
  -- أولياء الأمور
  if tg_op = 'UPDATE' and new.parents_req and not old.parents_req then new.parents_req := false; end if;
  if coalesce((pol->>'parents')::boolean, false) and new.visible_to_parents and (tg_op = 'INSERT' or not old.visible_to_parents) then
    new.visible_to_parents := false; new.parents_req := true;
  end if;
  if not new.visible_to_parents and tg_op = 'UPDATE' and old.visible_to_parents then new.parents_req := false; end if;
  return new;
end $$;
select 'ok';
