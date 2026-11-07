-- 065: نوع «اختيار متعدد الإجابات» (multi) — طُبّق في قاعدة البيانات عبر تعديل quiz_public وquiz_submit:
-- quiz_public يعيد الخيارات لـ mcq وmulti؛ quiz_submit: الإجابة مصفوفة أرقام الخيارات، الدرجة = النقاط × (الصحيح المختار − الخاطئ المختار) ÷ عدد الصحيح، بحد أدنى صفر.
alter table public.questions drop constraint if exists questions_qtype_check;
alter table public.questions add constraint questions_qtype_check check (qtype = any (array['mcq','multi','tf','short','essay','blank','match','order']));
