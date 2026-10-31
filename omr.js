/* منصة دينا — محرك ورقة التظليل: التصميم (بالمليمتر) + القراءة الآلية من صورة ممسوحة أو مصورة.
   الورقة: أربع علامات زوايا سوداء، ترويسة مضغوطة (الاختبار والطالب)، باركود رقم الهوية تحت الاسم، شريط تعريف (ترتيب الطالب + النموذج)،
   ثم كتلة مستقلة لكل سؤال بعنوانه وترقيمه، والأسئلة المقالية في قسم خاص بالمعلم أسفل الورقة. */
(function () {
  const W = 210, H = 297, MK = 8;
  const MARKS = [[10, 10], [W - 10 - MK, 10], [10, H - 10 - MK], [W - 10 - MK, H - 10 - MK]];
  const MC = MARKS.map(([x, y]) => [x + MK / 2, y + MK / 2]);
  // شريط التعريف: ١٢ بت لترتيب الطالب + ٢ للنموذج + ١ تحقق
  const ID_BITS = 15, ID_Y = 36.2, ID_X0 = 22, ID_STEP = 6.2, ID_S = 4;
  // باركود Code 39 لرقم الهوية (١٠ خانات ثابتة) — نقرؤه نحن من الصورة بمعرفة موضعه الدقيق
  const BC_N = 10, BC_NAR = 0.34, BC_WID = 0.9, BC_CELL = 7 * BC_NAR + 3 * BC_WID, BC_W = (BC_N + 2) * BC_CELL, BC_X1 = W - 22, BC_X0 = BC_X1 - BC_W, BC_Y = 35, BC_H = 6;
  const C39 = { '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000', '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101', '8': '100100100', '9': '001100100', '*': '010010100' };
  const C39R = Object.fromEntries(Object.entries(C39).map(([k, v]) => [v, k]));
  const ROW_H = 6.5, R = 2.25, OPT_DX = 6.4, DX_MIN = 5.35, NUM_W = 8;
  const LET = ['أ', 'ب', 'ج', 'د', 'هـ'];
  const LABELS = { ar: { mcq: ['أ', 'ب', 'ج', 'د', 'هـ'], tf: ['ص', 'خ'], match: ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي', 'ك', 'ل', 'م', 'ن'] },
    en: { mcq: ['A', 'B', 'C', 'D', 'E'], tf: ['T', 'F'], match: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'] } };
  const essayVals = p => { const half = !!p.half, mx = Math.max(1, Math.min(half ? 6.5 : 13, +p.max || 5)), v = []; for (let x = 0; x <= mx + 1e-9; x += half ? 0.5 : 1) v.push(+x.toFixed(1)); return v; };
  const fmtV = (x, lang) => { const w = Math.floor(x), h = x - w > 0; const d = lang === 'en' ? String(w) : String(w).replace(/\d/g, c => '٠١٢٣٤٥٦٧٨٩'[c]); return h ? (w ? d : '') + '½' : d; };
  function expand(spec) { const lang = spec.lang === 'en' ? 'en' : 'ar', qs = []; (spec.parts || []).forEach((p, pi) => { const t = p.type || 'mcq';
      if (t === 'essay') { const vals = essayVals(p); for (let i = 0; i < (+p.count || 0); i++) qs.push({ n: vals.length, lab: vals.map(x => fmtV(x, lang)), vals, type: t, part: pi, teacher: true, max: vals[vals.length - 1], title: p.label || '' }); return; }
      const n = t === 'tf' ? 2 : Math.max(2, Math.min(t === 'match' ? 14 : 5, +p.options || 4)); for (let i = 0; i < (+p.count || 0); i++) qs.push({ n, lab: LABELS[lang][t].slice(0, n), type: t, part: pi, title: p.label || '' }); });
    return { lang, dir: lang === 'en' ? 'ltr' : 'rtl', qs }; }
  const norm = (a, b) => typeof a === 'number' ? { dir: 'rtl', qs: Array.from({ length: a }, () => ({ n: b, lab: LET.slice(0, b) })) } : (a.qs ? a : expand(a));
  const AV = 178, Y0 = 48.5, YMAX = 277.5, HEAD = 4.6, GAP = 2.2;
  // كل سؤال في كتلة مستقلة؛ الأعمدة تُختار لأقل عدد صفوف مع تصغير المسافة بين الدوائر عند الحاجة؛ المقالي في الأسفل
  function layout(a, b) {
    const sp = norm(a, b), qs = sp.qs, rtl = sp.dir !== 'ltr';
    let groups = []; qs.forEach((Q, q) => { const pi = Q.part || 0, g = groups[groups.length - 1]; if (g && g.part === pi) g.qs.push(q); else groups.push({ part: pi, qs: [q], teacher: !!Q.teacher }); });
    groups = groups.filter(g => !g.teacher).concat(groups.filter(g => g.teacher));
    const P = [], N = [], local = [], heads = []; let y = Y0;
    groups.forEach((g, gi) => {
      const n = g.qs.length, maxO = Math.max(2, ...g.qs.map(q => qs[q].n));
      let best = null; for (let C = Math.min(n, 12); C >= 1; C--) { const dx = Math.min(OPT_DX, (AV / C - NUM_W - 2.5) / maxO); if (dx < DX_MIN) continue; const rows = Math.ceil(n / C); if (!best || rows < best.rows || (rows === best.rows && C < best.C)) best = { C: Math.ceil(n / rows), rows, dx }; }
      if (!best) best = { C: 1, rows: n, dx: DX_MIN };
      const { C, rows } = best, dx = Math.min(OPT_DX, (AV / C - NUM_W - 2.5) / maxO), colW = NUM_W + maxO * dx + 2.5, tw = C * colW, x0 = (W - tw) / 2;
      heads.push({ y, x0, w: tw, part: g.part, idx: gi, n, type: qs[g.qs[0]].type, teacher: g.teacher, title: qs[g.qs[0]].title, h: HEAD + rows * ROW_H + 0.4 });
      y += HEAD;
      g.qs.forEach((q, i) => { const c = Math.floor(i / rows), r = i % rows, cy = y + r * ROW_H + ROW_H / 2; local[q] = i + 1;
        N[q] = [rtl ? W - x0 - c * colW - NUM_W / 2 : x0 + c * colW + NUM_W / 2, cy];
        P[q] = Array.from({ length: qs[q].n }, (_, o) => [rtl ? W - x0 - c * colW - NUM_W - (o + 0.5) * dx : x0 + c * colW + NUM_W + (o + 0.5) * dx, cy]); });
      y += rows * ROW_H + GAP;
    });
    return { pos: (q, o) => P[q][o], num: q => N[q], local, heads, qs, rtl, overflow: y - GAP > YMAX, used: y - GAP, groups: groups.length };
  }
  const capacity = spec => !layout(spec).overflow;
  const idPos = b => [ID_X0 + b * ID_STEP + ID_S / 2, ID_Y + ID_S / 2];
  function encode(idx, model) { const bits = []; for (let i = 0; i < 12; i++) bits.push((idx >> i) & 1); bits.push(model & 1, (model >> 1) & 1); bits.push(bits.reduce((a, b) => a ^ b, 0)); return bits; }
  function decode(bits) { if (!bits.slice(0, 12).some(Boolean)) return null; const par = bits.slice(0, 14).reduce((a, b) => a ^ b, 0); if (par !== bits[14]) return null; let idx = 0; for (let i = 0; i < 12; i++) idx |= bits[i] << i; return { idx, model: bits[12] | (bits[13] << 1) }; }
  function barcodeSVG(txt) { const t = '*' + String(txt).replace(/\D/g, '').padStart(BC_N, '0').slice(-BC_N) + '*'; let x = 0, r = ''; for (const ch of t) { const p = C39[ch]; for (let i = 0; i < 9; i++) { const ww = p[i] === '1' ? BC_WID : BC_NAR; if (i % 2 === 0) r += `<rect x="${x.toFixed(3)}" y="0" width="${ww.toFixed(3)}" height="${BC_H}"/>`; x += ww; } x += BC_NAR; } return `<svg xmlns="http://www.w3.org/2000/svg" width="${BC_W.toFixed(2)}mm" height="${BC_H}mm" viewBox="0 0 ${BC_W.toFixed(3)} ${BC_H}" fill="#000" style="display:block">${r}</svg>`; }

  // صفحة ورقة واحدة
  function sheetHTML(o) {
    const sp = o.spec ? norm(o.spec) : norm(o.nq, o.no), L = layout(sp), bits = encode(o.idx || 0, o.model || 0), en = sp.dir === 'ltr', nid = String(o.nid || '').replace(/\D/g, '');
    const T = en ? { name: 'Name', cls: 'Class', model: 'Model', seat: 'Seat', ins: 'Shade one bubble per question completely with a dark pen or pencil. Do not mark the black squares or the barcode.' + (sp.qs.some(q => q.teacher) ? ' The grey section is for the teacher only.' : '') }
      : { name: 'الاسم', cls: 'الفصل', model: 'نموذج', seat: 'الجلوس', ins: 'ظلّل دائرة واحدة لكل سؤال تظليلاً كاملاً بقلم رصاص أو أزرق داكن. لا تكتب على المربعات السوداء أو الباركود.' + (sp.qs.some(q => q.teacher) ? ' القسم الرمادي خاص بالمعلم.' : '') };
    const mm = v => v.toFixed(2) + 'mm', dir = en ? 'ltr' : 'rtl', box = 'border:0.35mm solid #082B5A;border-radius:1.6mm;padding:0 2.5mm;height:6.4mm;line-height:6mm;white-space:nowrap;overflow:hidden';
    let h = `<div class="omr-page" dir="${dir}" style="${en ? "font-family:'Myriad Pro',Arial,'GE SS Two',sans-serif" : ''}">`;
    MARKS.forEach(([x, y]) => { h += `<div style="position:absolute;left:${mm(x)};top:${mm(y)};width:${mm(MK)};height:${mm(MK)};background:#000"></div>`; });
    // الترويسة: الاختبار والمادة والفصل الدراسي في سطرين + الشعار
    h += `<div style="position:absolute;right:22mm;left:22mm;top:11mm;height:12mm;display:flex;align-items:center;justify-content:space-between;gap:4mm;direction:${dir}"><div style="min-width:0"><div style="font-size:13pt;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.title}</div><div style="font-size:8.5pt;color:#005499;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.sub || ''}</div></div><img src="assets/logo.svg" style="height:11mm;flex:none"></div>`;
    // بيانات الطالب في سطر واحد
    h += `<div style="position:absolute;right:22mm;left:22mm;top:25.5mm;display:flex;gap:2.5mm;direction:${dir};font-size:9.5pt"><div style="flex:2.4;${box}">${T.name}: <b>${o.name || ''}</b></div><div style="flex:1;${box}">${T.cls}: <b>${o.cls || ''}</b></div>${o.seat ? `<div style="flex:1.3;${box}">${T.seat}: <b>${o.seat}</b></div>` : ''}<div style="width:20mm;${box};text-align:center">${T.model} <b>${o.modelName || 'A'}</b></div></div>`;
    // شريط التعريف + باركود رقم الهوية
    bits.forEach((b, i) => { const [x, y] = [ID_X0 + i * ID_STEP, ID_Y]; h += `<div style="position:absolute;left:${mm(x)};top:${mm(y)};width:${mm(ID_S)};height:${mm(ID_S)};box-sizing:border-box;border:0.3mm solid #000;${b ? 'background:#000' : ''}"></div>`; });
    if (nid) h += `<div style="position:absolute;left:${mm(BC_X0)};top:${mm(BC_Y)};width:${mm(BC_W)}">${barcodeSVG(nid)}<div style="font:700 7pt/1.15 Arial,sans-serif;letter-spacing:1.2pt;text-align:center;direction:ltr;margin-top:0.4mm">${nid}</div></div>`;
    else h += `<div style="position:absolute;left:${mm(BC_X0)};top:${mm(BC_Y)};width:${mm(BC_W)};height:${mm(BC_H + 2.6)};box-sizing:border-box;border:0.3mm dashed #9aa8bc;border-radius:1.2mm;font-size:7pt;color:#6b7aa3;text-align:center;line-height:${mm(BC_H + 2.2)};direction:${dir}">${en ? 'Write your name above — the teacher links this sheet' : 'ورقة احتياطية — اكتب اسمك أعلاه ويربطها المعلم'}</div>`;
    h += `<div style="position:absolute;right:22mm;left:22mm;top:44.2mm;font-size:6.6pt;color:#555;direction:${dir};text-align:${en ? 'left' : 'right'};white-space:nowrap;overflow:hidden">${T.ins}${o.legend ? ` <b style="color:#082B5A">${o.legend}</b>` : ''}</div>`;
    // عناوين الكتل
    const ORD = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
    const TN = en ? { mcq: 'Multiple choice — shade the correct letter', tf: 'True / False — T = True, F = False', match: 'Matching — shade the letter of the matching item', essay: 'Essay / written — TEACHER ONLY: shade the mark awarded' }
      : { mcq: 'اختيار من متعدد — ظلّل حرف الإجابة الصحيحة', tf: 'صح وخطأ — ص = صح، خ = خطأ', match: 'مزاوجة — ظلّل حرف العبارة المناسبة', essay: 'مقالي / إكمال — خاص بالمعلم: يظلل الدرجة المستحقة' };
    const qNo = {}; let k = 0; sp.qs.forEach((Q, q) => { if (!(Q.part in qNo)) qNo[Q.part] = k++; });
    L.heads.forEach(hd => { const no = qNo[hd.part]; h += `<div style="position:absolute;left:${mm(hd.x0 - 2.2)};top:${mm(hd.y - 0.7)};width:${mm(hd.w + 4.4)};height:${mm(hd.h + 0.8)};box-sizing:border-box;border:0.3mm ${hd.teacher ? 'dashed #8a97a8' : 'solid #b9c9de'};border-radius:1.8mm;background:${hd.teacher ? '#f3f5f8' : '#fbfdff'}"></div>`;
      h += `<div style="position:absolute;left:${mm(hd.x0)};top:${mm(hd.y)};width:${mm(hd.w)};height:3.9mm;box-sizing:border-box;border-bottom:0.3mm solid ${hd.teacher ? '#8a97a8' : '#005499'};direction:${dir};text-align:${en ? 'left' : 'right'};font-size:7.4pt;font-weight:800;color:${hd.teacher ? '#5b6b82' : '#082B5A'};line-height:3.6mm;white-space:nowrap;overflow:hidden">${en ? 'Question ' + (no + 1) : 'السؤال ' + (ORD[no] || no + 1)}: <span style="font-weight:600">${hd.title ? hd.title + (hd.teacher ? (en ? ' — teacher only' : ' — خاص بالمعلم') : '') : TN[hd.type || 'mcq']}</span> <span style="color:#6b7aa3;font-weight:600">(${hd.n})</span></div>`; });
    for (let q = 0; q < sp.qs.length; q++) {
      const Q = sp.qs[q], [nx, ny] = L.num(q);
      if (Q.teacher) { const [x1] = L.pos(q, 0), [x2] = L.pos(q, Q.n - 1), a = Math.min(nx - 4, x1 - R - 0.8, x2 - R - 0.8), b = Math.max(nx + 4, x1 + R + 0.8, x2 + R + 0.8); h += `<div style="position:absolute;left:${mm(a)};top:${mm(ny - 2.95)};width:${mm(b - a)};height:5.9mm;box-sizing:border-box;background:#e9ecf1;border:0.22mm dashed #8a97a8;border-radius:1.2mm"></div>`; }
      h += `<div style="position:absolute;left:${mm(nx - 4)};top:${mm(ny - 2.3)};width:8mm;text-align:center;font-size:8.2pt;font-weight:800">${L.local[q]}</div>`;
      for (let j = 0; j < Q.n; j++) { const [x, y] = L.pos(q, j), f = o.fill && o.fill[q] === j; h += `<div style="position:absolute;left:${mm(x - R)};top:${mm(y - R)};width:${mm(2 * R)};height:${mm(2 * R)};box-sizing:border-box;border:0.28mm solid #333;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:5.2pt;font-weight:700;line-height:1;color:#c4c4c4;${Q.teacher ? 'direction:ltr;unicode-bidi:isolate;' : ''}${f ? 'background:#111' : ''}">${f ? '' : (Q.lab[j] || '')}</div>`; }
    }
    h += `<div style="position:absolute;bottom:11mm;left:22mm;right:22mm;text-align:center;font-size:7pt;color:#777">${o.foot || ''}</div></div>`;
    return h;
  }
  const PAGE_CSS = `@page{size:A4 portrait;margin:0}body{margin:0;font-family:'GE SS Two','Myriad Pro',sans-serif;color:#082B5A}.omr-page{position:relative;width:210mm;height:297mm;overflow:hidden;page-break-after:always;break-after:page;background:#fff}`;

  // ---------- القراءة ----------
  function solve8(A, b) { const n = 8, M = A.map((r, i) => [...r, b[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; const d = M[c][c]; if (Math.abs(d) < 1e-12) return null; for (let k = c; k <= n; k++) M[c][k] /= d; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } } return M.map(r => r[n]); }
  function homography(src, dst) { const A = [], b = []; for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); } const h = solve8(A, b); if (!h) return null; return (x, y) => { const w = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]; }; }
  function otsu(g) { const hist = new Array(256).fill(0); for (const v of g) hist[v]++; let sum = 0; for (let i = 0; i < 256; i++) sum += i * hist[i]; let sB = 0, wB = 0, best = 0, th = 128; const tot = g.length; for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = tot - wB; if (!wF) break; sB += t * hist[t]; const mB = sB / wB, mF = (sum - sB) / wF, v = wB * wF * (mB - mF) ** 2; if (v > best) { best = v; th = t; } } return th; }
  // قراءة الباركود من الصورة الأصلية: كل حرف في خلية معروفة العرض، فنقيس داخلها عرض الأشرطة والفراغات
  function readBarcode(cv, Hs, th) {
    try {
      const X0 = BC_X0 - 1, X1 = BC_X1 + 1, Ya = BC_Y + 1, Yb = BC_Y + BC_H - 1; const [ua, va] = Hs(X0, Ya), [ub, vb] = Hs(X1, Yb);
      const bx = Math.max(0, Math.floor(Math.min(ua, ub)) - 4), by = Math.max(0, Math.floor(Math.min(va, vb)) - 4), bw = Math.min(cv.width - bx, Math.ceil(Math.abs(ub - ua)) + 8), bh = Math.min(cv.height - by, Math.ceil(Math.abs(vb - va)) + 8);
      if (bw < 40 || bh < 4) return null;
      const d = cv.getContext('2d', { willReadFrequently: true }).getImageData(bx, by, bw, bh).data, gv = (x, y) => { const xx = Math.round(x) - bx, yy = Math.round(y) - by; if (xx < 0 || yy < 0 || xx >= bw || yy >= bh) return 255; const i = (yy * bw + xx) * 4; return d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; };
      for (const yf of [0.5, 0.35, 0.65, 0.25, 0.75]) {
        const ym = BC_Y + BC_H * yf; let out = '', ok = true;
        for (let c = 0; c < BC_N + 2 && ok; c++) {
          const cx0 = BC_X0 + c * BC_CELL, S = 160, row = []; for (let s = 0; s < S; s++) { const [u, v] = Hs(cx0 + (s + 0.5) * BC_CELL / S, ym); row.push(gv(u, v) < th ? 1 : 0); }
          const runs = []; let cur = row[0], n = 0; for (const v of row) { if (v === cur) n++; else { runs.push([cur, n]); cur = v; n = 1; } } runs.push([cur, n]);
          while (runs.length && runs[0][0] === 0) runs.shift(); const el = runs.slice(0, 9);
          if (el.length < 9) { ok = false; break; }
          const unit = S / BC_CELL, cut = unit * (BC_NAR + BC_WID) / 2, pat = el.map(([, len]) => len > cut ? '1' : '0').join('');
          const ch = C39R[pat]; if (!ch) { ok = false; break; } out += ch;
        }
        if (ok && out[0] === '*' && out[out.length - 1] === '*') return out.slice(1, -1);
      }
    } catch (_) {}
    return null;
  }
  function readCanvas(cv) {
    const TW = 1240, sc = TW / cv.width, w = TW, h = Math.round(cv.height * sc);
    const c2 = document.createElement('canvas'); c2.width = w; c2.height = h; const x2 = c2.getContext('2d', { willReadFrequently: true }); x2.fillStyle = '#fff'; x2.fillRect(0, 0, w, h); x2.drawImage(cv, 0, 0, w, h);
    const d = x2.getImageData(0, 0, w, h).data, g = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) g[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) | 0;
    const th = Math.min(otsu(g), 170), bin = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) bin[i] = g[i] < th ? 1 : 0;
    const pxmm = w / W, exp = (MK * pxmm) ** 2;
    const find = (x0, y0, x1, y1, cx, cy) => {
      const seen = new Uint8Array(w * h); let best = null;
      for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) { const i = y * w + x; if (!bin[i] || seen[i]) continue;
        const st = [i]; seen[i] = 1; let n = 0, sx = 0, sy = 0, mnx = x, mxx = x, mny = y, mxy = y;
        while (st.length) { const j = st.pop(), jx = j % w, jy = (j / w) | 0; n++; sx += jx; sy += jy; if (jx < mnx) mnx = jx; if (jx > mxx) mxx = jx; if (jy < mny) mny = jy; if (jy > mxy) mxy = jy; if (n > exp * 6) break;
          for (const k of [j - 1, j + 1, j - w, j + w]) if (k >= 0 && k < w * h && !seen[k] && bin[k]) { const kx = k % w, ky = (k / w) | 0; if (kx >= x0 && kx < x1 && ky >= y0 && ky < y1) { seen[k] = 1; st.push(k); } } }
        const bw = mxx - mnx + 1, bh = mxy - mny + 1, fill = n / (bw * bh), ar = bw / bh;
        if (n > exp * 0.45 && n < exp * 3 && fill > 0.7 && ar > 0.6 && ar < 1.6) { const px = sx / n, py = sy / n, dist = Math.hypot(px - cx, py - cy); if (!best || dist < best.dist) best = { x: px, y: py, dist }; } }
      return best;
    };
    const qw = (w * 0.3) | 0, qh = (h * 0.22) | 0;
    const m = [find(0, 0, qw, qh, 0, 0), find(w - qw, 0, w, qh, w, 0), find(0, h - qh, qw, h, 0, h), find(w - qw, h - qh, w, h, w, h)];
    if (m.some(x => !x)) return { ok: false, error: 'لم تُكتشف علامات الزوايا الأربع — تأكد أن الورقة كاملة وواضحة في المسح أو الصورة' };
    const pts = m.map(p => [p.x, p.y]);
    const sample = (H, x, y, rmm) => { const [u, v] = H(x, y), r = rmm * pxmm; let dark = 0, tot = 0; for (let yy = Math.round(v - r); yy <= Math.round(v + r); yy++) for (let xx = Math.round(u - r); xx <= Math.round(u + r); xx++) { if ((xx - u) ** 2 + (yy - v) ** 2 > r * r || xx < 0 || yy < 0 || xx >= w || yy >= h) continue; tot++; dark += bin[yy * w + xx]; } return tot ? dark / tot : 0; };
    for (const order of [[0, 1, 2, 3], [3, 2, 1, 0]]) {
      const H2 = homography(MC, order.map(i => pts[i])); if (!H2) continue;
      const bits = Array.from({ length: ID_BITS }, (_, b) => sample(H2, ...idPos(b), ID_S * 0.32) > 0.5 ? 1 : 0);
      const id = decode(bits); if (!id) continue;
      const Hs = (x, y) => { const [u, v] = H2(x, y); return [u / sc, v / sc]; };
      const bc = readBarcode(cv, Hs, th);
      return { ok: true, H: H2, id, barcode: bc, gid: { digits: bc || '', bad: false }, read: (a, b) => { const L = layout(a, b), nq = L.qs.length, ans = [], conf = []; for (let q = 0; q < nq; q++) { const f = []; for (let k = 0; k < L.qs[q].n; k++) f.push(sample(H2, ...L.pos(q, k), R * 0.62)); const s = f.map((v, k) => [v, k]).sort((a, b) => b[0] - a[0]); const [m1, m2] = [s[0], s[1] || [0, -1]];
          if (m1[0] < 0.33) ans.push(-1); else if (m2[0] > 0.33 && m2[0] > m1[0] * 0.72) ans.push(-2); else ans.push(m1[1]); conf.push(+m1[0].toFixed(2)); } return { ans, conf }; } };
    }
    return { ok: false, error: 'تعذّرت قراءة شريط التعريف — قد تكون الورقة ليست من هذا الاختبار أو المسح غير واضح' };
  }
  async function fileToCanvases(file) {
    if (/pdf$/i.test(file.type) || /\.pdf$/i.test(file.name)) {
      if (!window.pdfjsLib) await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.onload = res; s.onerror = () => rej(new Error('تعذّر تحميل قارئ PDF')); document.head.appendChild(s); });
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const doc = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise, out = [];
      for (let p = 1; p <= doc.numPages; p++) { const pg = await doc.getPage(p), vp0 = pg.getViewport({ scale: 1 }), vp = pg.getViewport({ scale: 2600 / vp0.height }); const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; out.push({ cv: c, label: file.name + ' — ص' + p }); }
      return out;
    }
    const bmp = await createImageBitmap(file), c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0); return [{ cv: c, label: file.name }];
  }
  const thumb = (cv, wd = 620) => { const s = wd / cv.width, c = document.createElement('canvas'); c.width = wd; c.height = Math.round(cv.height * s); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(cv, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.6); };
  window.DinaOMR = { barcodeSVG, readBarcode, sheetHTML, PAGE_CSS, readCanvas, fileToCanvases, thumb, LET, LABELS, expand, capacity, encode, decode, layout };
})();
