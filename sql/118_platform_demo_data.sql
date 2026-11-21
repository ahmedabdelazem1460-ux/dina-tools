-- النطاق: المنصة الأم فقط
-- 118 — للمنصة الأم فقط (لا يُطبَّق على دينا).
-- (طُبّق على دفعات: 118 ثم 118b/118c بتصحيح topic وcategory غير الفارغين — هذا الملف بالنص النهائي)
-- بيانات وهمية محفوظة لمدرسة تجريبية: platform_demo_seed(school, opts) و platform_demo_clear(school).
-- لمدير المنصة وحده. كل ما يُنشأ تُحفظ معرّفاته في schools.settings.platform.demo فيُمسح وحده لاحقاً
-- (لا يمس أي بيانات أدخلها المستخدم بنفسه). المشغّلات تُعطَّل داخل المعاملة فقط (لا سجل تدقيق ولا سلة
-- ولا مزامنة شيت ولا إشعارات) ثم تُعاد، وأي خطأ يُرجع كل شيء.
-- opts: {classes_per_grade: 1..3 (1), students: 5..30 (18), weeks_back: 0..8 (3), attendance_days: 0..20 (10)}

create or replace function public.platform_demo_tbls()
returns text[] language sql immutable as $$
  select array['staff','memberships','classes','students','subjects','terms','weeks','timetable_versions',
               'timetable_slots','plan_entries','attendance','behaviors']::text[] $$;

create or replace function public.platform_demo_triggers(p_on boolean)
returns void language plpgsql security definer set search_path = public as $$
declare t text;
begin
  foreach t in array public.platform_demo_tbls() loop
    execute format('alter table public.%I %s trigger user', t, case when p_on then 'enable' else 'disable' end);
  end loop;
end $$;
revoke all on function public.platform_demo_triggers(boolean) from public, anon, authenticated;

create or replace function public.platform_demo_seed(p_school uuid, p_opts jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  st jsonb; ownr uuid; sec record; cid uuid; vid uuid; tid uuid; trm uuid; wid uuid; sid uuid;
  kpg int := greatest(1, least(3, coalesce((p_opts->>'classes_per_grade')::int, 1)));
  nst int := greatest(5, least(30, coalesce((p_opts->>'students')::int, 18)));
  wback int := greatest(0, least(8, coalesce((p_opts->>'weeks_back')::int, 3)));
  adays int := greatest(0, least(20, coalesce((p_opts->>'attendance_days')::int, 10)));
  ids jsonb := jsonb_build_object('staff','[]'::jsonb,'classes','[]'::jsonb,'subjects','[]'::jsonb,'terms','[]'::jsonb,'weeks','[]'::jsonb,'versions','[]'::jsonb);
  -- المراحل والصفوف
  stages text[] := array['الابتدائية','الابتدائية','الابتدائية','المتوسطة','المتوسطة','المتوسطة','الثانوية','الثانوية','الثانوية'];
  gw text[] := array['الرابع','الخامس','السادس','الأول','الثاني','الثالث','الأول','الثاني','الثالث'];
  gs text[] := array['رابع','خامس','سادس','أول','ثاني','ثالث','أول','ثاني','ثالث'];
  gsfx text[] := array['ابتدائي','ابتدائي','ابتدائي','متوسط','متوسط','متوسط','ثانوي','ثانوي','ثانوي'];
  lets text[] := array['أ','ب','ج'];
  -- المواد وأنصبتها الأسبوعية لكل مرحلة (مجموع كل مرحلة ٣٥)
  plan jsonb := '{
    "الابتدائية": [["القرآن الكريم والدراسات الإسلامية",5],["اللغة العربية",8],["الرياضيات",6],["العلوم",4],["اللغة الإنجليزية",5],["الدراسات الاجتماعية",2],["المهارات الرقمية",2],["التربية الفنية",1],["التربية البدنية",2]],
    "المتوسطة": [["القرآن الكريم والدراسات الإسلامية",5],["اللغة العربية",6],["الرياضيات",6],["العلوم",5],["اللغة الإنجليزية",5],["الدراسات الاجتماعية",3],["المهارات الرقمية",2],["التربية الفنية",1],["التربية البدنية",2]],
    "الثانوية": [["القرآن الكريم والدراسات الإسلامية",4],["اللغة العربية",5],["الرياضيات",6],["الفيزياء",3],["الكيمياء",3],["الأحياء",3],["اللغة الإنجليزية",5],["المهارات الرقمية",2],["التربية البدنية",2],["التفكير الناقد",2]]
  }';
  shared text[] := array['المهارات الرقمية','التربية الفنية','التربية البدنية'];
  topics jsonb := '{
    "القرآن الكريم والدراسات الإسلامية": ["سورة الملك: التلاوة والتفسير","أركان الإسلام","آداب طلب العلم","سورة القلم","الصدق والأمانة","صفة الوضوء","بر الوالدين","سورة الحاقة","السيرة: الهجرة","مراجعة الوحدة"],
    "اللغة العربية": ["نص الاستماع: الوطن","الفعل الماضي والمضارع","الهمزة المتوسطة","كتابة فقرة وصفية","الجملة الاسمية","قراءة جهرية: العلم نور","المفعول به","التاء المربوطة والمفتوحة","النص الشعري","تقويم الوحدة"],
    "الرياضيات": ["القيمة المنزلية","جمع الكسور","ضرب الأعداد العشرية","المعادلات الخطية","النسبة والتناسب","المساحة والمحيط","التمثيل البياني","الاحتمالات","حل المسائل","اختبار قصير"],
    "العلوم": ["الخلية ووظائفها","حالات المادة","الطاقة وتحولاتها","السلاسل الغذائية","الصخور والمعادن","القوى والحركة","الدورة المائية","الضوء والظلال","التجربة العلمية","مراجعة الوحدة"],
    "اللغة الإنجليزية": ["Unit 1: Greetings","Present Simple","Vocabulary: Family","Reading: My School","Past Simple","Writing a Paragraph","Listening Practice","Unit 2: Hobbies","Grammar Review","Speaking: Presentations"],
    "الدراسات الاجتماعية": ["خريطة المملكة","توحيد المملكة","المناخ والتضاريس","رؤية ٢٠٣٠","المواطنة","الموارد الاقتصادية","الحضارات القديمة","مراجعة"],
    "المهارات الرقمية": ["مكونات الحاسب","معالجة النصوص","الجداول الإلكترونية","البرمجة بالكتل","الأمن الرقمي","العروض التقديمية"],
    "التربية الفنية": ["الرسم بالألوان المائية","التشكيل بالصلصال","الخط العربي","التصميم الزخرفي"],
    "التربية البدنية": ["الإحماء والمرونة","كرة القدم: التمرير","الجري والتحمل","كرة السلة: التنطيط","اللياقة البدنية"],
    "الفيزياء": ["الكميات الفيزيائية","الحركة في بعد واحد","قوانين نيوتن","الشغل والطاقة","الزخم والتصادمات"],
    "الكيمياء": ["تركيب الذرة","الجدول الدوري","الروابط الكيميائية","المعادلات الكيميائية","المول"],
    "الأحياء": ["تصنيف الكائنات","الخلية","الوراثة","الأجهزة الحيوية","البيئة"],
    "التفكير الناقد": ["مفهوم التفكير الناقد","الحجة والاستدلال","المغالطات المنطقية","حل المشكلات"]
  }';
  fm text[] := array['محمد','عبدالله','أحمد','فهد','خالد','سعود','عمر','يوسف','إبراهيم','عبدالرحمن','سلمان','فيصل','تركي','ماجد','نواف','بندر','راكان','زياد','حمد','سلطان','مشعل','ريان','إياد','حسام'];
  ff text[] := array['نورة','سارة','ريم','لمى','جود','هيا','الجوهرة','العنود','رهف','ليان','دانة','شهد','غلا','مها','وعد','جنى','ميار','لين','رغد','أسيل','ديما','حلا','تالا','يارا'];
  fam text[] := array['العتيبي','القحطاني','الغامدي','الزهراني','الشهري','الحربي','المطيري','الدوسري','العمري','السبيعي','الشمري','المالكي','الأحمدي','الجهني','البقمي','الحارثي','السلمي','الثبيتي','الزهراني','باعشن'];
  fem boolean; names text[]; cls_ids uuid[]; cls_g int[]; c_st text; s text; n int; i int; j int; k int; vd int; vp int; ok boolean;
  wk0 date := (current_date - extract(dow from current_date)::int);  -- أحد هذا الأسبوع
  wnum int; wst text; teacher_key text; tmap jsonb; subj_map jsonb := '{}'; sub_id uuid;
  words text[] := array['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر','الثالث عشر','الرابع عشر','الخامس عشر','السادس عشر','السابع عشر','الثامن عشر','التاسع عشر','العشرون'];
  r record; v_cnt jsonb := '{}';
begin
  if not public.is_platform_admin() then raise exception 'no permission'; end if;
  select coalesce(settings, '{}'::jsonb) into st from public.schools where id = p_school for update;
  if not found then raise exception 'المدرسة غير موجودة'; end if;
  if st #> '{platform,demo,on}' = 'true'::jsonb then raise exception 'في المدرسة بيانات وهمية مسبقاً — امسحها أولاً'; end if;
  select id into ownr from public.staff where school_id = p_school and is_owner order by created_at limit 1;

  perform set_config('dwp.provision','1',true); perform set_config('dwp.nosync','1',true); perform set_config('dwp.notrash','1',true);
  perform public.platform_demo_triggers(false);

  -- الفصل الدراسي (يُستخدم الموجود إن وُجد)
  select id into trm from public.terms where school_id = p_school and ord = 1;
  if trm is null then
    insert into public.terms(school_id, ord, name, year_label, start_date, end_date, status, note, created_by)
    values (p_school, 1, 'الفصل الدراسي الأول', '', wk0 - 7 * (wback + 9), wk0 + 7 * 8, 'active', 'demo', ownr) returning id into trm;
    ids := jsonb_set(ids, '{terms}', (ids->'terms') || to_jsonb(trm));
  end if;

  -- المواد
  for s in select distinct e->>0 from jsonb_each(plan) x, jsonb_array_elements(x.value) e loop
    select id into sub_id from public.subjects where school_id = p_school and name = s;
    if sub_id is null then
      insert into public.subjects(school_id, name, is_activity) values (p_school, s, s in ('التربية الفنية','التربية البدنية')) returning id into sub_id;
      ids := jsonb_set(ids, '{subjects}', (ids->'subjects') || to_jsonb(sub_id));
    end if;
    subj_map := subj_map || jsonb_build_object(s, sub_id);
  end loop;

  for sec in select * from public.sections where school_id = p_school order by sort, created_at loop
    fem := sec.short_name like '%بنات%' or sec.name like '%بنات%';
    names := case when fem then ff else fm end;
    tmap := '{}';
    -- التوقيت إن لم يكن له جدول زمني
    if coalesce(jsonb_array_length(sec.bell->'schedules'), 0) = 0 then
      update public.sections set bell = coalesce(bell, '{}'::jsonb) || jsonb_build_object('def', 'demo1', 'holidays', '[]'::jsonb, 'acts', '[]'::jsonb,
        'schedules', jsonb_build_array(jsonb_build_object('id','demo1','name','الجدول الأساسي','np',7,'dur',45,'pass',0,'start','07:00','show',true,
          'title','الجدول الزمني لليوم الدراسي','perDur','{}'::jsonb,
          'breaks', jsonb_build_array(jsonb_build_object('id','dbr1','after',3,'dur',20,'label','الفسحة','classes','[]'::jsonb),
                                      jsonb_build_object('id','dbr2','after',6,'dur',15,'label','الصلاة','classes','[]'::jsonb)))))
      where id = sec.id;
    end if;

    -- الفصول
    cls_ids := '{}'; cls_g := '{}';
    for i in 1..9 loop for j in 1..kpg loop
      insert into public.classes(section_id, name, stage, grade_word, class_label, sort, active)
      values (sec.id, gs[i] || ' ' || gsfx[i] || ' ' || lets[j], stages[i], gw[i], gs[i] || ' - ' || lets[j], (i - 1) * 3 + j - 1, true) returning id into cid;
      cls_ids := cls_ids || cid; cls_g := cls_g || i;
      ids := jsonb_set(ids, '{classes}', (ids->'classes') || to_jsonb(cid));
      -- الطلاب
      for k in 1..nst loop
        insert into public.students(school_id, section_id, class_id, full_name, student_no, guardian_name, guardian_phone, active)
        values (p_school, sec.id, cid,
          names[1 + floor(random() * array_length(names,1))::int] || ' ' || fm[1 + floor(random() * array_length(fm,1))::int] || ' ' || fam[1 + floor(random() * array_length(fam,1))::int],
          '11' || lpad((floor(random() * 1e8))::bigint::text, 8, '0'), null, '05' || lpad((floor(random() * 1e8))::bigint::text, 8, '0'), true);
      end loop;
    end loop; end loop;

    -- الجدول المعتمد
    insert into public.timetable_versions(section_id, label, status, source, note, created_by, approved_by, approved_at)
    values (sec.id, 'الجدول الأساسي (تجريبي)', 'approved', 'demo', 'بيانات وهمية', ownr, ownr, now()) returning id into vid;
    ids := jsonb_set(ids, '{versions}', (ids->'versions') || to_jsonb(vid));

    create temp table if not exists _dbusy(t_id uuid, dd int, pp int) on commit drop;
    create temp table if not exists _dslot(c_id uuid, dd int, pp int, sb uuid, t_id uuid) on commit drop;
    delete from _dbusy; delete from _dslot;

    for i in 1..array_length(cls_ids, 1) loop
      cid := cls_ids[i];
      select stage into c_st from public.classes where id = cid;
      -- وحدات المادة مرتبة بالأكبر نصاباً
      for r in select e->>0 sname, (e->>1)::int cnt from jsonb_array_elements(plan->c_st) e order by (e->>1)::int desc loop
        -- معلم لكل مادة في المرحلة (أو في الصف إن تعددت فصوله) حتى لا يتجاوز نصابه ٢٤ حصة
        teacher_key := r.sname || '|' || case when kpg = 1 then case when r.sname = any(shared) then 'all' else c_st end
                                              else case when r.sname = any(shared) then c_st else c_st || cls_g[i] end end;
        sub_id := (subj_map->>r.sname)::uuid;
        for n in 1..r.cnt loop
          ok := false;
          -- المعلم الأول ثم الثاني (يُنشأ عند الحاجة)؛ والمحاولة الأخيرة بلا شرط التوزيع على الأيام
          for k in 1..3 loop
            tid := nullif(tmap->>(teacher_key || '#' || least(k, 2)), '')::uuid;
            if tid is null then
              insert into public.staff(school_id, full_name, specialty, gender, title, active)
              values (p_school, 'أ. ' || names[1 + floor(random() * array_length(names,1))::int] || ' ' || fam[1 + floor(random() * array_length(fam,1))::int],
                      r.sname, case when fem then 'f' else 'm' end, case when fem then 'معلمة' else 'معلم' end, true) returning id into tid;
              insert into public.memberships(staff_id, section_id, role) values (tid, sec.id, 'teacher');
              ids := jsonb_set(ids, '{staff}', (ids->'staff') || to_jsonb(tid));
              tmap := tmap || jsonb_build_object(teacher_key || '#' || least(k, 2), tid);
            end if;
            select a.d, b.p into vd, vp from generate_series(0, 4) a(d), generate_series(0, 6) b(p)
              where not exists (select 1 from _dslot x where x.c_id = cid and x.dd = a.d and x.pp = b.p)
                and not exists (select 1 from _dbusy y where y.t_id = tid and y.dd = a.d and y.pp = b.p)
                and (k = 3 or (select count(*) from _dslot x where x.c_id = cid and x.dd = a.d and x.sb = sub_id) < case when r.cnt > 5 then 2 else 1 end)
              order by (select count(*) from _dslot x where x.c_id = cid and x.dd = a.d and x.sb = sub_id), random()
              limit 1;
            if found then
              insert into _dslot values (cid, vd, vp, sub_id, tid);
              insert into _dbusy values (tid, vd, vp);
              ok := true; exit;
            end if;
          end loop;
          if not ok then
            -- آخر حل: أي خانة فارغة في الفصل بلا معلم
            select a.d, b.p into vd, vp from generate_series(0, 4) a(d), generate_series(0, 6) b(p)
              where not exists (select 1 from _dslot x where x.c_id = cid and x.dd = a.d and x.pp = b.p) limit 1;
            if found then insert into _dslot values (cid, vd, vp, sub_id, null); end if;
          end if;
        end loop;
      end loop;
    end loop;
    insert into public.timetable_slots(version_id, class_id, day, period, subject_id, teacher_id)
    select vid, x.c_id, x.dd, x.pp, x.sb, x.t_id from _dslot x;

    -- الأسابيع والخطة
    for i in 0..(wback + 1) loop
      wnum := 10 + i;
      wst := case when i < wback then 'published' when i = wback then 'published' else 'open' end;
      insert into public.weeks(section_id, number, word, start_date, deadline, status, holidays, timetable_version_id, term_id)
      values (sec.id, wnum, words[wnum], wk0 + 7 * (i - wback), (wk0 + 7 * (i - wback) - 3)::timestamp + time '20:00', wst, '[]'::jsonb, vid, trm)
      returning id into wid;
      ids := jsonb_set(ids, '{weeks}', (ids->'weeks') || to_jsonb(wid));
      insert into public.plan_entries(week_id, class_id, day, period, subject_id, teacher_id, topic, homework, status, exec_status, updated_by, updated_at, submitted_at, approved_at)
      select wid, x.c_id, x.dd, x.pp, x.sb, x.t_id,
        case when i > wback and random() < 0.55 then '' else
          (select t.v from (select jsonb_array_elements_text(topics->(select name from public.subjects where id = x.sb)) v) t offset ((wnum + x.pp + x.dd) % greatest(1, jsonb_array_length(topics->(select name from public.subjects where id = x.sb)))) limit 1) end,
        case when random() < 0.3 and i <= wback then 'حل تمارين الكتاب ص ' || (20 + floor(random() * 120))::int else '' end,
        case when i < wback then 'approved'
             when i = wback then (array['approved','approved','approved','submitted','submitted','draft'])[1 + floor(random() * 6)::int]
             else (array['empty','draft','draft','submitted'])[1 + floor(random() * 4)::int] end,
        case when i < wback then (array['done','done','done','done','done','done','modified','not_done'])[1 + floor(random() * 8)::int]
             when i = wback and x.dd < extract(dow from current_date)::int then (array['done','done','done','pending'])[1 + floor(random() * 4)::int]
             else 'pending' end,
        x.t_id, now(), case when i <= wback then now() end, case when i < wback then now() end
      from _dslot x;
      update public.plan_entries set status = 'empty', homework = '' where week_id = wid and topic = '';
    end loop;

    -- الحضور اليومي والسلوك
    insert into public.attendance(school_id, student_id, class_id, day, status, by_staff, created_by, created_at, updated_at)
    select p_school, st2.id, st2.class_id, dd::date,
      case when rnd < 0.90 then 'present' when rnd < 0.95 then 'absent' when rnd < 0.985 then 'late' else 'excused' end,
      ownr, ownr, now(), now()
    from public.students st2
    cross join generate_series(current_date - adays * 7 / 5 - 2, current_date - 1, interval '1 day') dd
    cross join lateral (select random() rnd) rr
    where st2.class_id = any(cls_ids) and extract(dow from dd) between 0 and 4 and adays > 0;

    insert into public.behaviors(school_id, student_id, class_id, day, kind, category, points, note, referred, status, by_staff, created_at, period)
    select p_school, st2.id, st2.class_id, current_date - (1 + floor(random() * 14))::int,
      case when random() < 0.45 then 'positive' else 'negative' end, '', 0, '', false, 'open', ownr, now(), (1 + floor(random() * 7))::int
    from public.students st2 where st2.class_id = any(cls_ids) and random() < 0.12;
    update public.behaviors b set
      category = case when b.kind = 'positive' then (array['مشاركة متميزة','تعاون مع الزملاء','إنجاز الواجبات','نظافة وترتيب'])[1 + floor(random() * 4)::int]
                      else (array['تأخر صباحي','عدم إحضار الكتاب','إزعاج داخل الفصل','عدم الالتزام بالزي'])[1 + floor(random() * 4)::int] end,
      points = case when b.kind = 'positive' then 2 else -1 end
    where b.class_id = any(cls_ids) and b.category = '';
  end loop;

  perform public.platform_demo_triggers(true);

  select jsonb_build_object(
    'classes', jsonb_array_length(ids->'classes'), 'teachers', jsonb_array_length(ids->'staff'),
    'students', (select count(*) from public.students where class_id in (select (jsonb_array_elements_text(ids->'classes'))::uuid)),
    'weeks', jsonb_array_length(ids->'weeks'),
    'slots', (select count(*) from public.timetable_slots where version_id in (select (jsonb_array_elements_text(ids->'versions'))::uuid)),
    'no_teacher', (select count(*) from public.timetable_slots where teacher_id is null and version_id in (select (jsonb_array_elements_text(ids->'versions'))::uuid)),
    'entries', (select count(*) from public.plan_entries where week_id in (select (jsonb_array_elements_text(ids->'weeks'))::uuid)),
    'attendance', (select count(*) from public.attendance where class_id in (select (jsonb_array_elements_text(ids->'classes'))::uuid)),
    'behaviors', (select count(*) from public.behaviors where class_id in (select (jsonb_array_elements_text(ids->'classes'))::uuid))) into v_cnt;

  update public.schools set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{platform}',
    coalesce(settings->'platform', '{}'::jsonb) || jsonb_build_object('demo', ids || jsonb_build_object('on', true, 'at', now(), 'by', auth.uid(), 'opts', p_opts, 'counts', v_cnt)))
  where id = p_school;
  return v_cnt;
end $fn$;

create or replace function public.platform_demo_clear(p_school uuid)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare st jsonb; dm jsonb; ids uuid[]; r record; fk record; used boolean; n int; tot jsonb := '{}';
begin
  if not public.is_platform_admin() then raise exception 'no permission'; end if;
  select coalesce(settings, '{}'::jsonb) into st from public.schools where id = p_school for update;
  dm := st #> '{platform,demo}';
  if dm is null or dm->'on' is distinct from 'true'::jsonb then raise exception 'لا توجد بيانات وهمية في هذه المدرسة'; end if;
  perform set_config('dwp.provision','1',true); perform set_config('dwp.nosync','1',true); perform set_config('dwp.notrash','1',true);
  perform public.platform_demo_triggers(false);

  -- الطلاب (ومعهم حضورهم وسلوكهم بالتتالي) ثم الأسابيع (والخطة) ثم الجداول ثم الفصول
  select array_agg(x::uuid) into ids from jsonb_array_elements_text(dm->'classes') x;
  delete from public.attendance where class_id = any(ids);
  delete from public.behaviors where class_id = any(ids);
  delete from public.students where class_id = any(ids); get diagnostics n = row_count; tot := tot || jsonb_build_object('students', n);
  delete from public.weeks where id in (select x::uuid from jsonb_array_elements_text(dm->'weeks') x); get diagnostics n = row_count; tot := tot || jsonb_build_object('weeks', n);
  delete from public.timetable_versions where id in (select x::uuid from jsonb_array_elements_text(dm->'versions') x);
  delete from public.classes where id = any(ids); get diagnostics n = row_count; tot := tot || jsonb_build_object('classes', n);
  -- المعلمون الوهميون: تُفصل أي إشارات باقية إليهم ثم يُحذفون
  select array_agg(x::uuid) into ids from jsonb_array_elements_text(dm->'staff') x;
  if ids is not null then
    delete from public.memberships where staff_id = any(ids);
    for r in select c.conrelid::regclass t, a.attname col, a.attnotnull nn from pg_constraint c
             join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
             where c.contype = 'f' and c.confrelid = 'public.staff'::regclass loop
      if r.nn then execute format('delete from %s where %I = any($1)', r.t, r.col) using ids;
      else execute format('update %s set %I = null where %I = any($1)', r.t, r.col, r.col) using ids; end if;
    end loop;
    delete from public.staff where id = any(ids) and user_id is null and not is_owner; get diagnostics n = row_count; tot := tot || jsonb_build_object('teachers', n);
  end if;
  -- المواد والفصل الدراسي: فقط ما أنشأته البيانات الوهمية ولم يُستخدم في غيرها
  -- (المادة تُحذف فقط إن لم يبقَ أي سطر في أي جدول يشير إليها — لأن بعض الإشارات تُفرَّغ تلقائياً عند الحذف)
  for r in select x::uuid id from jsonb_array_elements_text(dm->'subjects') x loop
    used := false;
    for fk in select c.conrelid::regclass t, a.attname col from pg_constraint c
              join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
              where c.contype = 'f' and c.confrelid = 'public.subjects'::regclass loop
      execute format('select exists(select 1 from %s where %I = $1)', fk.t, fk.col) into used using r.id;
      exit when used;
    end loop;
    if not used then delete from public.subjects where id = r.id; end if;
  end loop;
  for r in select x::uuid id from jsonb_array_elements_text(dm->'terms') x loop
    begin
      if not exists (select 1 from public.weeks where term_id = r.id) then delete from public.terms where id = r.id; end if;
    exception when foreign_key_violation then null; end;
  end loop;

  perform public.platform_demo_triggers(true);
  update public.schools set settings = jsonb_set(settings, '{platform,demo}', jsonb_build_object('on', false, 'cleared_at', now())) where id = p_school;
  return tot;
end $fn$;

revoke all on function public.platform_demo_seed(uuid, jsonb) from public, anon;
revoke all on function public.platform_demo_clear(uuid) from public, anon;
grant execute on function public.platform_demo_seed(uuid, jsonb) to authenticated;
grant execute on function public.platform_demo_clear(uuid) to authenticated;
