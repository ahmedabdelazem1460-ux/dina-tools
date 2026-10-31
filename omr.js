/* منصة دينا — محرك ورقة التظليل: التصميم (بالمليمتر) + القراءة الآلية من صورة ممسوحة.
   الورقة: أربع علامات زوايا سوداء، شريط تعريف (رقم الطالب في الكشف + النموذج + تحقق)، ودوائر الإجابات. */
(function () {
  const W = 210, H = 297, MK = 8; // A4 بالمليمتر، ضلع علامة الزاوية
  const MARKS = [[10, 10], [W - 10 - MK, 10], [10, H - 10 - MK], [W - 10 - MK, H - 10 - MK]]; // أعلى يسار، أعلى يمين، أسفل يسار، أسفل يمين
  const MC = MARKS.map(([x, y]) => [x + MK / 2, y + MK / 2]);
  const ID_BITS = 15, ID_Y = 52, ID_X0 = 42, ID_STEP = 8.5, ID_S = 5; // 12 بت للرقم + 2 للنموذج + 1 تحقق
  const ROW_H = 7.4, TOP = 78, PER_COL = 25, R = 2.4, OPT_DX = 7.2, NUM_W = 9;
  const LET = ['أ', 'ب', 'ج', 'د', 'هـ'];
  function layout(nq, no) {
    const cols = Math.ceil(nq / PER_COL), colW = NUM_W + no * OPT_DX + 4, total = cols * colW, x0 = (W - total) / 2;
    // الأعمدة من اليمين إلى اليسار (عربي)
    const pos = (q, o) => { const c = Math.floor(q / PER_COL), r = q % PER_COL; const right = W - x0 - c * colW; return [right - NUM_W - (o + 0.5) * OPT_DX, TOP + r * ROW_H + ROW_H / 2]; };
    const num = q => { const c = Math.floor(q / PER_COL), r = q % PER_COL; return [W - x0 - c * colW - NUM_W / 2, TOP + r * ROW_H + ROW_H / 2]; };
    return { cols, colW, x0, pos, num };
  }
  const idPos = b => [ID_X0 + b * ID_STEP + ID_S / 2, ID_Y + ID_S / 2];
  function encode(idx, model) { const bits = []; for (let i = 0; i < 12; i++) bits.push((idx >> i) & 1); bits.push(model & 1, (model >> 1) & 1); bits.push(bits.reduce((a, b) => a ^ b, 0)); return bits; }
  function decode(bits) { if (!bits.slice(0, 12).some(Boolean)) return null; const par = bits.slice(0, 14).reduce((a, b) => a ^ b, 0); if (par !== bits[14]) return null; let idx = 0; for (let i = 0; i < 12; i++) idx |= bits[i] << i; return { idx, model: bits[12] | (bits[13] << 1) }; }

  // صفحة ورقة واحدة (HTML بإحداثيات مطلقة بالمليمتر)
  function sheetHTML(o) {
    const L = layout(o.nq, o.no), bits = encode(o.idx || 0, o.model || 0);
    const mm = v => v.toFixed(2) + 'mm';
    let h = `<div class="omr-page">`;
    MARKS.forEach(([x, y]) => { h += `<div style="position:absolute;left:${mm(x)};top:${mm(y)};width:${mm(MK)};height:${mm(MK)};background:#000"></div>`; });
    h += `<div style="position:absolute;right:22mm;left:22mm;top:12mm;display:flex;align-items:center;justify-content:space-between;direction:rtl"><div><div style="font-size:16pt;font-weight:800">${o.title}</div><div style="font-size:10pt;color:#005499">${o.sub || ''}</div></div><img src="assets/logo.svg" style="height:16mm"></div>`;
    h += `<div style="position:absolute;right:22mm;left:22mm;top:31mm;display:flex;gap:6mm;direction:rtl;font-size:11pt"><div style="flex:2;border:0.4mm solid #082B5A;border-radius:2mm;padding:1.5mm 3mm">الاسم: <b>${o.name || ''}</b></div><div style="flex:1;border:0.4mm solid #082B5A;border-radius:2mm;padding:1.5mm 3mm">الفصل: <b>${o.cls || ''}</b></div><div style="width:24mm;border:0.4mm solid #082B5A;border-radius:2mm;padding:1.5mm 3mm;text-align:center">نموذج <b>${o.modelName || 'A'}</b></div></div>`;
    bits.forEach((b, i) => { const [x, y] = [ID_X0 + i * ID_STEP, ID_Y]; h += `<div style="position:absolute;left:${mm(x)};top:${mm(y)};width:${mm(ID_S)};height:${mm(ID_S)};box-sizing:border-box;border:0.3mm solid #000;${b ? 'background:#000' : ''}"></div>`; });
    h += `<div style="position:absolute;right:22mm;top:${mm(ID_Y + 7.5)};font-size:8pt;color:#555;direction:rtl">ظلّل دائرة واحدة لكل سؤال بقلم رصاص أو أزرق داكن. لا تكتب في المربعات أعلاه.</div>`;
    for (let c = 0; c < L.cols; c++) { for (let k = 0; k < o.no; k++) { const [x] = L.pos(c * PER_COL, k); h += `<div style="position:absolute;left:${mm(x - 3)};top:${mm(TOP - 6)};width:6mm;text-align:center;font-size:9pt;font-weight:800">${LET[k]}</div>`; } }
    for (let q = 0; q < o.nq; q++) {
      const [nx, ny] = L.num(q); h += `<div style="position:absolute;left:${mm(nx - 4.5)};top:${mm(ny - 2.6)};width:9mm;text-align:center;font-size:9pt;font-weight:800">${q + 1}</div>`;
      for (let k = 0; k < o.no; k++) { const [x, y] = L.pos(q, k); h += `<div style="position:absolute;left:${mm(x - R)};top:${mm(y - R)};width:${mm(2 * R)};height:${mm(2 * R)};box-sizing:border-box;border:0.3mm solid #333;border-radius:50%;${o.fill && o.fill[q] === k ? 'background:#111' : ''}"></div>`; }
    }
    h += `<div style="position:absolute;bottom:12mm;left:22mm;right:22mm;text-align:center;font-size:8pt;color:#777">${o.foot || ''}</div></div>`;
    return h;
  }
  const PAGE_CSS = `@page{size:A4 portrait;margin:0}body{margin:0;font-family:'GE SS Two','Myriad Pro',sans-serif;color:#082B5A}.omr-page{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;break-after:page;background:#fff}`;

  // ---------- القراءة ----------
  function solve8(A, b) { const n = 8, M = A.map((r, i) => [...r, b[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c]; if (Math.abs(d) < 1e-12) return null; for (let k = c; k <= n; k++) M[c][k] /= d; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } } return M.map(r => r[n]); }
  function homography(src, dst) { const A = [], b = []; for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); } const h = solve8(A, b); if (!h) return null; return (x, y) => { const w = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]; }; }
  function otsu(g) { const hist = new Array(256).fill(0); for (const v of g) hist[v]++; let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i]; let sB = 0, wB = 0, best = 0, th = 128; const tot = g.length; for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; th = t; } } return th; }
  function readCanvas(cv) {
    // تصغير لعرض ثابت
    const TW = 1240, sc = TW / cv.width, w = TW, h = Math.round(cv.height * sc);
    const c2 = document.createElement('canvas'); c2.width = w; c2.height = h; const x2 = c2.getContext('2d', { willReadFrequently: true }); x2.fillStyle = '#fff'; x2.fillRect(0, 0, w, h); x2.drawImage(cv, 0, 0, w, h);
    const d = x2.getImageData(0, 0, w, h).data, g = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) g[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) | 0;
    const th = Math.min(otsu(g), 170), bin = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) bin[i] = g[i] < th ? 1 : 0;
    // علامات الزوايا: أكبر مكوّن مربع ممتلئ في كل ربع زاوية
    const pxmm = w / W, exp = (MK * pxmm) ** 2;
    const find = (x0, y0, x1, y1, cx, cy) => {
      const seen = new Uint8Array(w * h); let best = null;
      for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const i = y * w + x; if (!bin[i] || seen[i]) continue;
        const st = [i]; seen[i] = 1; let n = 0, sx = 0, sy = 0, mnx = x, mxx = x, mny = y, mxy = y;
        while (st.length) { const j = st.pop(), jx = j % w, jy = (j / w) | 0; n++; sx += jx; sy += jy; if (jx < mnx) mnx = jx; if (jx > mxx) mxx = jx; if (jy < mny) mny = jy; if (jy > mxy) mxy = jy; if (n > exp * 6) break;
          for (const k of [j - 1, j + 1, j - w, j + w]) if (k >= 0 && k < w * h && !seen[k] && bin[k]) { const kx = k % w, ky = (k / w) | 0; if (kx >= x0 && kx < x1 && ky >= y0 && ky < y1) { seen[k] = 1; st.push(k); } } }
        const bw = mxx - mnx + 1, bh = mxy - mny + 1, fill = n / (bw * bh), ar = bw / bh;
        if (n > exp * 0.3 && n < exp * 3 && fill > 0.7 && ar > 0.6 && ar < 1.6) { const px = sx / n, py = sy / n, dist = Math.hypot(px - cx, py - cy); if (!best || dist < best.dist) best = { x: px, y: py, dist }; } }
      return best;
    };
    const qw = (w * 0.3) | 0, qh = (h * 0.22) | 0;
    const m = [find(0, 0, qw, qh, 0, 0), find(w - qw, 0, w, qh, w, 0), find(0, h - qh, qw, h, 0, h), find(w - qw, h - qh, w, h, w, h)];
    if (m.some(x => !x)) return { ok: false, error: 'لم تُكتشف علامات الزوايا الأربع — تأكد أن الورقة كاملة وواضحة في المسح' };
    const pts = m.map(p => [p.x, p.y]);
    const sample = (H, x, y, rmm) => { const [u, v] = H(x, y), r = rmm * pxmm; let dark = 0, tot = 0; for (let yy = Math.round(v - r); yy <= Math.round(v + r); yy++) for (let xx = Math.round(u - r); xx <= Math.round(u + r); xx++) { if ((xx - u) ** 2 + (yy - v) ** 2 > r * r || xx < 0 || yy < 0 || xx >= w || yy >= h) continue; tot++; dark += bin[yy * w + xx]; } return tot ? dark / tot : 0; };
    // جرّب الاتجاه العادي ثم المقلوب (١٨٠ درجة)
    for (const order of [[0, 1, 2, 3], [3, 2, 1, 0]]) {
      const H2 = homography(MC, order.map(i => pts[i])); if (!H2) continue;
      const bits = Array.from({ length: ID_BITS }, (_, b) => sample(H2, ...idPos(b), ID_S * 0.32) > 0.5 ? 1 : 0);
      const id = decode(bits); if (!id) continue;
      return { ok: true, H: H2, id, read: (nq, no) => { const L = layout(nq, no), ans = [], conf = []; for (let q = 0; q < nq; q++) { const f = []; for (let k = 0; k < no; k++) f.push(sample(H2, ...L.pos(q, k), R * 0.62)); const s = f.map((v, k) => [v, k]).sort((a, b) => b[0] - a[0]); const [m1, m2] = [s[0], s[1] || [0, -1]];
          if (m1[0] < 0.33) ans.push(-1); else if (m2[0] > 0.33 && m2[0] > m1[0] * 0.72) ans.push(-2); else ans.push(m1[1]); conf.push(+m1[0].toFixed(2)); } return { ans, conf }; } };
    }
    return { ok: false, error: 'تعذّرت قراءة شريط التعريف — قد تكون الورقة ليست من هذا الاختبار أو المسح غير واضح' };
  }
  async function fileToCanvases(file) {
    if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) {
      if (!window.pdfjsLib) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.onload = res; s.onerror = () => rej(new Error('تعذّر تحميل قارئ PDF')); document.head.appendChild(s); });
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise, out = [];
      for (let p = 1; p <= doc.numPages; p++) { const pg = await doc.getPage(p), vp0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: 1700 / vp0.height }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; out.push({ cv: c, label: file.name + ' — ص' + p }); }
      return out;
    }
    const bmp = await createImageBitmap(file), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0); return [{ cv: c, label: file.name }];
  }
  const thumb = (cv, wd = 620) => { const s = wd / cv.width, c = document.createElement('canvas'); c.width = wd; c.height = Math.round(cv.height * s); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(cv, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.6); };
  window.DinaOMR = { sheetHTML, PAGE_CSS, readCanvas, fileToCanvases, thumb, LET, encode, decode, layout };
})();
