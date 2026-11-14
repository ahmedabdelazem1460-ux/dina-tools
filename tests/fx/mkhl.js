const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 800, height: 420 } });
  await p.setContent(`<html dir="rtl"><body style="font:22px Tahoma;padding:20px;line-height:2">
  <div>١) ما عاصمة المملكة العربية السعودية؟</div><div>أ) جدة &nbsp;&nbsp; ب) <span style="background:yellow">الرياض</span> &nbsp;&nbsp; ج) مكة</div>
  <div>٢) الشمس نجم ملتهب.</div><div>أ) صح &nbsp;&nbsp;&nbsp; ب) <span style="background:#7CFC00">خطأ</span></div>
  <div>٣) أكمل: عدد أركان الإسلام ...........</div><div>٤) علل: تسمية الحج بالركن الخامس.</div></body></html>`);
  await p.screenshot({ path: 'fx/hl.png' }); await b.close(); })();
