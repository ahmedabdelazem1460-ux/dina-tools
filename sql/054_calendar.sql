-- 054: التقويم الدراسي المرن — بداية الفصل، عدد أسابيع الدراسة، والإجازات (أسابيع كاملة أو أيام)؛ ترحيل تواريخ الأسابيع وربطها بالجدول الساري
alter table public.sections add column if not exists calendar jsonb not null default '{}'::jsonb;

create or replace function public.calendar_apply(p_section uuid, p_weeks jsonb, p_create boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $J$
declare r jsonb; w record; v uuid; n_upd int := 0; n_new int := 0; n_tt int := 0; nid uuid; hol jsonb; st date; any_w boolean;
begin
  if not public.has_perm(p_section, 'structure') then raise exception 'ليست لديك صلاحية تعديل الأسابيع'; end if;
  for r in select * from jsonb_array_elements(p_weeks) loop
    st := (r->>'start')::date; any_w := false;
    -- كل نسخ الأسبوع بالرقم نفسه (قد يوجد أكثر من صف لرقم واحد)
    for w in select * from public.weeks where section_id = p_section and number = (r->>'number')::int loop
      any_w := true;
      -- الإجازات: ما أضافه التقويم (auto) يُستبدل، وما أُضيف يدوياً يبقى
      hol := coalesce((select jsonb_agg(h) from jsonb_array_elements(coalesce(w.holidays,'[]'::jsonb)) h where not coalesce((h->>'auto')::boolean, false)
               and not exists (select 1 from jsonb_array_elements(coalesce(r->'holidays','[]'::jsonb)) x where (x->>'day') = (h->>'day'))), '[]'::jsonb)
             || coalesce(r->'holidays','[]'::jsonb);
      update public.weeks set start_date = st, holidays = hol, word = coalesce(nullif(r->>'word',''), word) where id = w.id
        and (start_date is distinct from st or holidays is distinct from hol or word is distinct from coalesce(nullif(r->>'word',''), word));
      if found then n_upd := n_upd + 1; end if;
      if w.start_date is distinct from st and not coalesce(w.archived, false) then
        v := public.version_for(p_section, st);
        if v is not null and v is distinct from w.timetable_version_id then perform public.apply_version_to_week(w.id, v); n_tt := n_tt + 1; end if;
      end if;
    end loop;
    if not any_w and p_create then
      nid := public.create_week(p_section, (r->>'number')::int, r->>'word', st, nullif(r->>'deadline','')::timestamptz);
      update public.weeks set holidays = coalesce(r->'holidays','[]'::jsonb) where id = nid;
      n_new := n_new + 1;
    end if;
  end loop;
  insert into public.audit_log(staff_id, section_id, action, entity, entity_id, details) values (public.me(), p_section, 'calendar_apply', 'sections', p_section, jsonb_build_object('updated', n_upd, 'created', n_new, 'timetable', n_tt));
  return jsonb_build_object('updated', n_upd, 'created', n_new, 'timetable', n_tt);
end $J$;
grant execute on function public.calendar_apply(uuid, jsonb, boolean) to authenticated;
select 'ok';
