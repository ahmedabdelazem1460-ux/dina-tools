const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 900 } });
  await p.setContent(`<html dir="rtl"><body style="font-family:Arial,'Noto Naskh Arabic','DejaVu Sans',sans-serif;font-size:30px;line-height:2;padding:40px;background:#fff;color:#000">
  <div><b>واجب الرياضيات</b></div><div>السؤال الأول: اختر الإجابة الصحيحة</div>
  <div>1) ناتج جمع خمسة وثلاثة يساوي</div><div>أ) سبعة</div><div>ب) ثمانية</div><div>ج) تسعة</div><div>الإجابة: ب</div>
  <div>2) عاصمة المملكة العربية السعودية هي</div><div>أ) جدة</div><div>ب) الرياض</div><div>ج) الدمام</div><div>الإجابة: ب</div>
  <div>السؤال الثاني: أجب عما يلي</div><div>3) اذكر ثلاثة من أركان الإسلام</div></body></html>`);
  await p.screenshot({ path: 'fx/q.png' }); await p.pdf({ path: 'fx/text.pdf' });
  // scanned-like PDF: image embedded
  await p.setContent(`<html><body style="margin:0"><img src="data:image/png;base64,${require('fs').readFileSync('fx/q.png').toString('base64')}" style="width:100%"></body></html>`); await p.pdf({ path: 'fx/scan.pdf' });
  await b.close(); })();
