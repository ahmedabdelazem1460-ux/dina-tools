# قاعدة البيانات (Supabase / Postgres)

المشروع `dwibkkrzykqgsgyrrggp`. كل الجداول في `public` وعليها RLS. الترحيلات في `sql/` بالترتيب (آخرها 092) وكلها مطبَّقة.
للتفاصيل الدقيقة لجدول: `select column_name, data_type from information_schema.columns where table_name='…'` أو ابحث في `sql/`.

## الهيكل التنظيمي
`schools` (settings JSON) ← `sections` (قسم: بنين/بنات؛ فيه bell, periods, days, standby…) ← `classes` (stage, grade_word, class_label — **بلا school_id**) ← `students`.
`staff` (user_id يربطه بـ auth، is_owner) · `memberships` (موظف × قسم: role, perms, classes…) · `module_grants` (staff_id, module) · `subjects` · `join_codes`.

## الجداول حسب المجال
| المجال | الجداول |
|---|---|
| الخطة الأسبوعية | `weeks`, `plan_entries`, `notes`, `extra_pages`, `language_issues`, `assignment_requests`, `entry_delegations`, `lesson_preps`, `resources`, `parent_posts`, `parent_links` |
| الجداول والتوقيت | `timetable_versions`, `timetable_slots`, `section_plans`, `display_schedules` (جداول استثنائية: meta.times/breaks، published، date_from/to), `live_entries`, `live_clicks`, `substitutions`, `duty_log`, `daily_boards`, `board_tokens`, `tool_states`, `tool_snapshots` |
| الحضور والسلوك | `attendance` (يومي), `period_attendance` (بالحصة), `behaviors` (السلوك والإحالات), `counsel_cases`, `counsel_actions`, `counsel_msgs`, `student_codes` |
| الاختبارات | `curriculum` (الدروس), `questions` (البنك: qtype, options JSON, answer, level, difficulty, shared, source), `spec_tables`, `quizzes` (kind: quiz/worksheet/homework/remedial، settings JSON، code), `quiz_attempts`, `paper_exams`, `paper_results`, `exam_committees`, `remedial_plans`, `noor_imports`, `noor_scores`, `record_books`, `games`, `game_sets`, `game_players`, `game_answers` |
| الإشراف والنماذج | `sup_templates`, `sup_records`, `sup_docs`, `form_tasks`, `staff_signatures` |
| الفصول الدراسية | `terms` (094) + `weeks.term_id` — RPC: `term_save`, `term_ensure_first`, `term_create_weeks`, `term_set_status` |
| الموارد البشرية | `staff_att` (096) — RPC: `hr_checkin`, `hr_mark`, `hr_auto_absent`, `hr_token`؛ `hr_admin()`؛ الإعدادات `schools.settings.hr` |
| النظام | `notifications`, `notif_prefs` (093), `messages`, `audit_log`, `login_events`, `trash` (سلة المحذوفات عبر trigger `trash_capture`), `sync_cfg`, `sheet_queue` |

**Realtime** مفعّل على: assignment_requests, attendance, behaviors, counsel_msgs, daily_boards, display_schedules, duty_log, extra_pages, form_tasks, messages, notes, period_attendance, plan_entries, quiz_attempts, resources, sections, students, substitutions, sup_records, timetable_slots, weeks.

## دوال الصلاحيات (تُستخدم في سياسات RLS)
`me()` معرّف الموظف الحالي · `my_school()` · `in_school(school_id)` · `is_owner()` · `is_member(section)` · `has_perm(…)` · `has_module(text)` · `is_counselor()` / `counselor_ids()` · `deputy_ids()` · `form_admin()` · `noor_ok()` · `duty_manager()` · `can_manage_staff()` · `att_in_class/section/student()` · `assess_ok(school)` · `ehw_ok(school)` (إتاحة الواجب الإلكتروني) · `student_codes_manager()`.

## أهم الـ RPC
- **عامة بلا دخول (روابط):** `quiz_public`, `quiz_submit`, `remedial_public`, `paper_result_public`, `board_view(token)`, `parent_info/plan/live/quizzes/resources/posts_for`, `student_portal`, `join_info`, `join_with_code_v2`, `game_join/state/answer`.
- **الخطة:** `create_week`, `edit_week_cell`, `submit_my_week`, `review_entries`, `bulk_review`, `week_summary`, `week_quizzes`, `import_week_entries`, `request_perf_task`, `decide_assignment_request`, `decide_entry_change`, `calendar_apply`.
- **الجداول:** `approve_timetable`, `schedule_timetable_v2`, `unschedule_timetable`, `timetable_promote`, `apply_version_to_week`, `preview_schedule`, `edit_slot`, `slot_conflicts`, `relocate_entries`, `save_live_entry`, `save_duty`.
- **الحضور والإرشاد:** `save_period_attendance`, `period_owner`, `att_to_referral`, `counsel_ack`, `class_teachers`.
- **النماذج:** `form_save`, `form_sign`, `form_share`, `form_decide`, `form_teacher_note`, `form_return`, `form_endorse` (095: `perms`, `trail`, `endorsed_*`).
- **البنك:** `qbank_usage` (عدد استخدام كل سؤال، للمالك/الإشراف).
- **النظام:** `trash_list/restore/purge`, `log_login`, `set_staff_active`, `student_codes_gen/list/toggle`, `sheet_*` (مزامنة Google Sheets).

## الإعدادات المخزنة JSON
- `schools.settings`: `features` (إظهار البنود: all|granted|off)، `ehw` (mode: all|granted|follow|off، staff[]، themes[]، theme)، `tui` (تخصيص صفحة المعلم)، `remote`، `printStyle`، `perm_sets`، `cover_images`، `test`.
- `sections.bell`: انظر CLAUDE.md («فخاخ معروفة»).
- `quizzes.settings`: attempts, show, time, shuffle, labels, theme, close_at, open_at.
- `memberships.perms` / `module_grants`: صلاحيات لكل موظف.

## قواعد عند تعديل القاعدة
1. لا تحذف أعمدة أو سياسات؛ استخدم `add column if not exists`، `create or replace`، `alter policy`.
2. كل جدول جديد: `school_id` + RLS + (إن لزم) إضافته لـ `trash_capture` و realtime.
3. الدوال `security definer` مع `set search_path = public` و`revoke … from public, anon` ثم `grant execute … to authenticated` (إلا الروابط العامة).
4. جرّب بالأدوار داخل معاملة ثم `rollback` قبل الاعتماد.
5. **للتعدد (قادم):** `classes`, `plan_entries`, `notes`, `extra_pages`, `timetable_slots`, `quiz_attempts`, `paper_results`, `module_grants` وغيرها تعتمد على الجدول الأب للعزل — راجعها عند إضافة مدارس أخرى.
