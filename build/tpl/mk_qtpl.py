# يبني قالب Excel و Word لبنك الأسئلة بهوية دينا
import sys
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.utils import get_column_letter as L
out = sys.argv[1]
NAVY, BLUE, SKY, GREEN, LG, PALE = '082B5A', '005499', '3AB1DB', '2E8B57', 'BADF93', 'E4EBF5'
F = 'Arial'
thin = Side(style='thin', color='C9D7EC'); BR = Border(left=thin, right=thin, top=thin, bottom=thin)
def fill(c): return PatternFill('solid', start_color=c, end_color=c)
TYPES = ['اختيار من متعدد', 'اختيار متعدد الإجابات', 'صواب وخطأ', 'إجابة قصيرة', 'أكمل الفراغ', 'أكمل الفراغ من بنك كلمات', 'مزاوجة', 'ترتيب', 'مقالي']
LEVELS = ['تذكر', 'فهم', 'تطبيق', 'مستويات عليا']; DIFF = ['سهل', 'متوسط', 'صعب']
COLS = [('م', 5), ('نوع السؤال *', 24), ('نص السؤال *', 52), ('الخيار أ', 20), ('الخيار ب', 20), ('الخيار ج', 20), ('الخيار د', 20), ('الخيار هـ', 16), ('الخيار و', 16),
        ('الإجابة الصحيحة *', 22), ('الدرجة', 8), ('الوحدة', 18), ('الدرس', 22), ('المستوى المعرفي', 15), ('الصعوبة', 10), ('المهارة', 18), ('التفسير / التغذية الراجعة', 34), ('رابط صورة', 22), ('مشاركة مع المعلمين', 14)]
EX = [
 ['اختيار من متعدد', 'ناتج ٣ × ٤ يساوي', '٧', '١٢', '١٤', '١٦', '', '', 'ب', 1, 'الوحدة الأولى', 'جدول الضرب', 'تذكر', 'سهل', 'الضرب', '٣ × ٤ = ١٢', '', 'نعم', 'اكتب حرف الخيار الصحيح (أ، ب، ج…) أو نص الخيار نفسه.'],
 ['اختيار متعدد الإجابات', 'أيّ الأعداد التالية زوجية؟', '٢', '٥', '٨', '١١', '', '', 'أ، ج', 2, 'الوحدة الأولى', 'الأعداد الزوجية والفردية', 'فهم', 'متوسط', '', 'العدد الزوجي يقبل القسمة على ٢', '', 'نعم', 'اكتب حروف كل الخيارات الصحيحة مفصولة بفاصلة.'],
 ['صواب وخطأ', 'الشمس نجم.', '', '', '', '', '', '', 'صواب', 1, '', 'النظام الشمسي', 'تذكر', 'سهل', '', '', '', 'نعم', 'الإجابة: صواب أو خطأ (تُقبل: صح / ✓ / خطأ / ✗).'],
 ['إجابة قصيرة', 'ما عاصمة المملكة العربية السعودية؟', '', '', '', '', '', '', 'الرياض | مدينة الرياض', 1, '', 'وطني', 'تذكر', 'سهل', '', '', '', 'نعم', 'افصل الإجابات المقبولة بالرمز | — تُصحَّح آلياً.'],
 ['أكمل الفراغ', 'عاصمة المملكة هي ...... وأكبر موانئها على البحر الأحمر ......', 'الرياض', 'جدة', '', '', '', '', '', 2, '', 'وطني', 'تذكر', 'متوسط', '', '', '', 'نعم', 'ضع نقاطاً (......) مكان كل فراغ، واكتب إجابة كل فراغ بالترتيب في أعمدة الخيارات (أ للفراغ الأول، ب للثاني…).'],
 ['أكمل الفراغ من بنك كلمات', 'يتكوّن الماء من ...... و ......', 'الهيدروجين', 'الأكسجين', '', '', '', '', '', 2, '', 'الماء', 'فهم', 'متوسط', '', '', '', 'نعم', 'مثل «أكمل الفراغ» لكن تظهر للطالب الكلمات ليختار منها.'],
 ['مزاوجة', 'صل كل دولة بعاصمتها', 'السعودية = الرياض', 'مصر = القاهرة', 'الأردن = عمّان', '', '', '', '', 3, '', 'العواصم', 'تذكر', 'متوسط', '', '', '', 'نعم', 'كل زوج في عمود خيار بالصيغة: العنصر = ما يقابله.'],
 ['ترتيب', 'رتّب مراحل دورة حياة النبات', 'بذرة', 'بادرة', 'نبتة', 'زهرة', 'ثمرة', '', '', 2, '', 'دورة حياة النبات', 'تطبيق', 'متوسط', '', '', '', 'نعم', 'اكتب العناصر في أعمدة الخيارات بالترتيب الصحيح؛ تُخلط للطالب تلقائياً.'],
 ['مقالي', 'علّل: تُعدّ المحافظة على الماء مسؤولية الجميع.', '', '', '', '', '', '', 'لأن الماء مورد محدود وأساس الحياة…', 3, '', 'الماء', 'مستويات عليا', 'صعب', '', '', '', 'نعم', 'الإجابة النموذجية اختيارية — يصحّحه المعلم يدوياً.'],
]
wb = Workbook()
# ---------- الأسئلة ----------
ws = wb.active; ws.title = 'الأسئلة'; ws.sheet_view.rightToLeft = True; ws.sheet_properties.tabColor = NAVY
n = len(COLS)
ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=n)
c = ws.cell(1, 1, 'قالب بنك الأسئلة — مدارس دينا العالمية'); c.font = Font(name=F, bold=True, size=16, color='FFFFFF'); c.fill = fill(NAVY); c.alignment = Alignment(horizontal='center', vertical='center'); ws.row_dimensions[1].height = 34
ws.merge_cells(start_row=2, start_column=1, end_row=2, end_column=n)
c = ws.cell(2, 1, 'اكتب سؤالاً في كل صف ابتداءً من الصف ٤ · الأعمدة ذات النجمة (*) مطلوبة · اختر القيم من القوائم المنسدلة · راجع ورقتي «التعليمات» و«أمثلة لكل نوع» · لا تغيّر عناوين الأعمدة')
c.font = Font(name=F, size=10, color=NAVY); c.fill = fill(LG); c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); ws.row_dimensions[2].height = 30
for i, (h, w) in enumerate(COLS, 1):
    c = ws.cell(3, i, h); c.font = Font(name=F, bold=True, size=11, color='FFFFFF'); c.fill = fill(BLUE if i not in (2, 3, 10) else GREEN); c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); c.border = BR
    ws.column_dimensions[L(i)].width = w
ws.row_dimensions[3].height = 30; ws.freeze_panes = 'D4'
LAST = 503
for r in range(4, LAST + 1):
    for i in range(1, n + 1):
        c = ws.cell(r, i); c.border = BR; c.font = Font(name=F, size=11); c.alignment = Alignment(horizontal='right' if i in (3, 17) else 'center', vertical='center', wrap_text=True)
        if (r % 2) == 1: c.fill = fill('F5F9FD')
    ws.cell(r, 1, f'=IF(C{r}="","",ROW()-3)')
ls = wb.create_sheet('القوائم'); ls.sheet_view.rightToLeft = True
for j, (t, vals) in enumerate([('نوع السؤال', TYPES), ('المستوى المعرفي', LEVELS), ('الصعوبة', DIFF), ('مشاركة', ['نعم', 'لا'])], 1):
    c = ls.cell(1, j, t); c.font = Font(name=F, bold=True, color='FFFFFF'); c.fill = fill(NAVY); ls.column_dimensions[L(j)].width = 28
    for k, v in enumerate(vals, 2): ls.cell(k, j, v).font = Font(name=F)
def dv(formula, rng, msg):
    d = DataValidation(type='list', formula1=formula, allow_blank=True, showErrorMessage=True, errorTitle='قيمة غير معروفة', error=msg, promptTitle='اختر من القائمة', prompt=msg, showInputMessage=True); ws.add_data_validation(d); d.add(rng)
dv(f"='القوائم'!$A$2:$A${len(TYPES)+1}", f'B4:B{LAST}', 'اختر نوع السؤال من القائمة')
dv(f"='القوائم'!$B$2:$B${len(LEVELS)+1}", f'N4:N{LAST}', 'تذكر / فهم / تطبيق / مستويات عليا')
dv(f"='القوائم'!$C$2:$C${len(DIFF)+1}", f'O4:O{LAST}', 'سهل / متوسط / صعب')
dv(f"='القوائم'!$D$2:$D$3", f'S4:S{LAST}', 'نعم = يظهر لمعلمي المادة · لا = خاص بك وبإدارة المدرسة')
d = DataValidation(type='decimal', operator='greaterThan', formula1='0', allow_blank=True, showErrorMessage=True, errorTitle='الدرجة', error='اكتب رقماً أكبر من صفر'); ws.add_data_validation(d); d.add(f'K4:K{LAST}')
ws.auto_filter.ref = f'A3:{L(n)}{LAST}'
# ---------- أمثلة ----------
ex = wb.create_sheet('أمثلة لكل نوع'); ex.sheet_view.rightToLeft = True; ex.sheet_properties.tabColor = GREEN
ex.merge_cells(start_row=1, start_column=1, end_row=1, end_column=n + 1)
c = ex.cell(1, 1, 'مثال جاهز لكل نوع من الأسئلة — انسخ الصف إلى ورقة «الأسئلة» وعدّله'); c.font = Font(name=F, bold=True, size=14, color='FFFFFF'); c.fill = fill(GREEN); c.alignment = Alignment(horizontal='center', vertical='center'); ex.row_dimensions[1].height = 30
for i, (h, w) in enumerate(COLS + [('طريقة التعبئة', 60)], 1):
    c = ex.cell(2, i, h); c.font = Font(name=F, bold=True, color='FFFFFF'); c.fill = fill(NAVY); c.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True); c.border = BR; ex.column_dimensions[L(i)].width = w
for r, row in enumerate(EX, 3):
    vals = [r - 2] + row
    for i, v in enumerate(vals, 1):
        c = ex.cell(r, i, v); c.font = Font(name=F, size=11, bold=(i == 2), color=(GREEN if i == n + 1 else '000000')); c.border = BR; c.alignment = Alignment(horizontal='right' if i in (3, 17, n + 1) else 'center', vertical='center', wrap_text=True)
        if i == 2: c.fill = fill(PALE)
    ex.row_dimensions[r].height = 42
ex.freeze_panes = 'D3'
# ---------- التعليمات ----------
gd = wb.create_sheet('التعليمات'); gd.sheet_view.rightToLeft = True; gd.sheet_properties.tabColor = SKY
gd.column_dimensions['A'].width = 30; gd.column_dimensions['B'].width = 110
rows = [('H', 'طريقة استخدام القالب', ''),
 ('', '١', 'اكتب أسئلتك في ورقة «الأسئلة» — سؤال واحد في كل صف. يمكنك نسخ أي مثال من ورقة «أمثلة لكل نوع».'),
 ('', '٢', 'احفظ الملف ثم ارفعه في المنصة: الاختبارات ← بنك الأسئلة ← «استيراد من ملف». اختر المادة والصف في المنصة قبل الرفع.'),
 ('', '٣', 'تظهر الأسئلة للمراجعة قبل الحفظ؛ أي سؤال ناقص يُعلَّم باللون ليُكمَل، والمكرر في البنك يُنبَّه عليه.'),
 ('', '٤', 'بعد الحفظ تُنشئ منها واجباً إلكترونياً برابط أو اختباراً أو ورقة عمل، وتدخل الأسئلة بنك المدرسة.'),
 ('H', 'شرح الأعمدة', ''),
 ('', 'نوع السؤال *', 'اختر من القائمة. إن تُرك فارغاً يُستنتج النوع: خياران فأكثر = اختيار من متعدد، إجابة «صواب/خطأ» = صواب وخطأ، وإلا إجابة قصيرة.'),
 ('', 'نص السؤال *', 'نص السؤال كاملاً. في «أكمل الفراغ» ضع نقاطاً (......) مكان كل فراغ.'),
 ('', 'الخيار أ … و', 'خيارات الاختيار من متعدد (خياران على الأقل، حتى ستة). تُستخدم أيضاً لإجابات الفراغات، وأزواج المزاوجة، وعناصر الترتيب.'),
 ('', 'الإجابة الصحيحة *', 'اختيار: حرف الخيار (أ / ب / A / 1) أو نصه · متعدد الإجابات: «أ، ج» · صواب وخطأ: صواب أو خطأ · قصيرة: الإجابة، والبدائل مفصولة بـ | · مقالي: إجابة نموذجية (اختياري).'),
 ('', 'الدرجة', 'درجة السؤال (الافتراضي ١). تقبل الكسور مثل 0.5.'),
 ('', 'الوحدة / الدرس', 'اسم الدرس كما في «المنهج والدروس». إن لم يكن الدرس موجوداً يُنشأ تلقائياً عند الحفظ (يمكن إيقاف ذلك).'),
 ('', 'المستوى المعرفي', 'تذكر / فهم / تطبيق / مستويات عليا — يُستخدم في جدول المواصفات والتحليل. إن تُرك يُصنَّف تلقائياً من صيغة السؤال.'),
 ('', 'الصعوبة', 'سهل / متوسط / صعب (الافتراضي متوسط).'),
 ('', 'المهارة', 'اختياري — المهارة أو ناتج التعلم الذي يقيسه السؤال.'),
 ('', 'التفسير / التغذية الراجعة', 'اختياري — يظهر للطالب بعد التسليم مع الإجابة الصحيحة.'),
 ('', 'رابط صورة', 'اختياري — رابط مباشر لصورة (https://…) تظهر مع السؤال.'),
 ('', 'مشاركة مع المعلمين', 'نعم (الافتراضي): يظهر السؤال لمعلمي المادة والصف. لا: يبقى خاصاً بك، وتراه إدارة المدرسة في بنك المدرسة.'),
 ('H', 'أنواع الأسئلة وطريقة تعبئتها', '')] + [('', e[0], e[-1]) for e in EX] + [
 ('H', 'ملاحظات', ''),
 ('', 'الأرقام', 'تُقبل الأرقام العربية (١٢٣) واللاتينية (123).'),
 ('', 'من Word أو PDF', 'يمكن أيضاً رفع ملف Word أو PDF مكتوب بالطريقة المعتادة (١) السؤال … أ) ب) ج) … الإجابة: ب) — حمّل «نموذج Word» من نافذة الاستيراد.')]
r = 1
for kind, a, b in rows:
    if kind == 'H':
        gd.merge_cells(start_row=r, start_column=1, end_row=r, end_column=2); c = gd.cell(r, 1, a); c.font = Font(name=F, bold=True, size=13, color='FFFFFF'); c.fill = fill(NAVY); c.alignment = Alignment(horizontal='right', vertical='center', indent=1); gd.row_dimensions[r].height = 26
    else:
        c = gd.cell(r, 1, a); c.font = Font(name=F, bold=True, color=BLUE); c.fill = fill(PALE); c.alignment = Alignment(horizontal='right', vertical='center', wrap_text=True, indent=1); c.border = BR
        c = gd.cell(r, 2, b); c.font = Font(name=F, size=11); c.alignment = Alignment(horizontal='right', vertical='center', wrap_text=True, indent=1); c.border = BR; gd.row_dimensions[r].height = 34
    r += 1
wb.move_sheet('القوائم', offset=2); ls.sheet_state = 'hidden'
wb.active = 0
wb.save(out + '/question-bank-template.xlsx')

# ---------- Word ----------
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
d = Document()
for s in d.sections: s.left_margin = s.right_margin = Cm(2); s.top_margin = s.bottom_margin = Cm(1.8)
def P(text, bold=False, size=13, color=None, space=4):
    p = d.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    pPr = p._p.get_or_add_pPr(); bidi = OxmlElement('w:bidi'); pPr.append(bidi)
    r = p.add_run(text); r.bold = bold; r.font.size = Pt(size); r.font.name = 'Arial'
    rPr = r._r.get_or_add_rPr(); rf = rPr.find(qn('w:rFonts'))
    if rf is None: rf = OxmlElement('w:rFonts'); rPr.append(rf)
    rf.set(qn('w:cs'), 'Arial'); rtl = OxmlElement('w:rtl'); rPr.append(rtl)
    if color: r.font.color.rgb = RGBColor.from_string(color)
    p.paragraph_format.space_after = Pt(space); return p
P('واجب: نموذج أسئلة للاستيراد — مدارس دينا العالمية', True, 16, NAVY, 2)
P('اكتب أسئلتك بالطريقة نفسها ثم ارفع الملف في المنصة. عدّل الأسئلة أو احذف ما لا تحتاجه.', False, 10, '566384', 10)
for line in [
 'السؤال الأول: اختر الإجابة الصحيحة',
 '١) ناتج ٣ × ٤ يساوي', 'أ) ٧', 'ب) ١٢ *', 'ج) ١٤', 'د) ١٦',
 '٢) عاصمة المملكة العربية السعودية هي', 'أ) جدة', 'ب) الرياض', 'ج) الدمام', 'الإجابة: ب',
 '٣) أيّ الأعداد التالية زوجية؟', 'أ) ٢', 'ب) ٥', 'ج) ٨', 'د) ١١', 'الإجابة: أ، ج',
 'السؤال الثاني: ضع علامة صح أو خطأ',
 '٤) الشمس نجم ( ✓ )', '٥) القمر كوكب ( ✗ )',
 'السؤال الثالث: أكمل الفراغ',
 '٦) عاصمة المملكة هي ...... وأكبر موانئها على البحر الأحمر ......', 'الإجابة: الرياض، جدة',
 'السؤال الرابع: صل كل دولة بعاصمتها',
 '٧) السعودية = الرياض', '٨) مصر = القاهرة', '٩) الأردن = عمّان',
 'السؤال الخامس: رتب مراحل دورة حياة النبات',
 '١٠) بذرة، بادرة، نبتة، زهرة، ثمرة',
 'السؤال السادس: أجب عما يلي',
 '١١) علل: تُعدّ المحافظة على الماء مسؤولية الجميع.', 'الإجابة: لأن الماء مورد محدود وأساس الحياة']:
    head = line.startswith('السؤال ')
    P(line, head, 13 if head else 12, BLUE if head else None, 8 if head else 3)
P('طريقة الكتابة: رقّم الأسئلة (١) ٢) …) · الخيارات بحروف (أ) ب) ج)) · علّم الصحيح بنجمة * أو اكتب سطر «الإجابة: ب» · صح/خطأ بين قوسين ( ✓ ) ( ✗ ) · الفراغ بنقاط ...... · المزاوجة بعلامة = · عناصر الترتيب مفصولة بفواصل بالترتيب الصحيح.', False, 10, GREEN, 0)
d.save(out + '/questions-template.docx')
print('ok')
