/* منصة دينا — محرك ورقة التظليل: التصميم (بالمليمتر) + القراءة الآلية من صورة ممسوحة.
   الورقة: أربع علامات زوايا سوداء، شريط تعريف (رقم الطالب في الكشف + النموذج + تحقق)، ودوائر الإجابات. */
(function () {
  const W = 210, H = 297, MK = 8; // A4 بالمليمتر، ضلع علامة الزاوية
  const MARKS = [[10, 10], [W - 10 - MK, 10], [10, H - 10 - MK], [W - 10 - MK, H - 10 - MK]]; // أعلى يسار، أعلى يمين، أسفل يسار، أسفل يمين
  const MC = MARKS.map(([x, y]) => [x + MK / 2, y + MK / 2]);
  const ID_BITS = 15, ID_Y = 43, ID_X0 = 76, ID_STEP = 7.2, ID_S = 4.6; // 12 بت لترتيب الطالب + 2 للنموذج + 1 تحقق
  // شبكة رقم الهوية: ١٠ خانات × الأرقام ٠–٩ (تُظلَّل آلياً للورقة المسماة، ويظللها الطالب في الورقة الاحتياطية)
  const GID_N = 10, GID_X0 = 22, GID_DX = 4.5, GID_Y0 = 52.4, GID_DY = 3.9, GID_R = 1.55;
  const gidPos = (c, d) => [GID_X0 + c * GID_DX + GID_DX / 2, GID_Y0 + d * GID_DY];
  // باركود Code 39 لرقم الهوية (للقارئ اليدوي والتحقق البصري)
  const C39 = { '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000', '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101', '8': '100100100', '9': '001100100', '*': '010010100' };
  function barcodeSVG(txt, hmm) { const t = '*' + String(txt).replace(/\D/g, '') + '*', n = 0.3, w = n * 2.6; let x = 0, r = ''; for (const ch of t) { const p = C39[ch]; if (!p) continue; for (let i = 0; i < 9; i++) { const ww = p[i] === '1' ? w : n; if (i % 2 === 0) r += `<rect x="${x.toFixed(2)}" y="0" width="${ww.toFixed(2)}" height="${hmm}"/>`; x += ww; } x += n; } return `<svg xmlns="http://www.w3.org/2000/svg" width="${x.toFixed(2)}mm" height="${hmm}mm" viewBox="0 0 ${x.toFixed(2)} ${hmm}" fill="#000">${r}</svg>`; }
  const ROW_H = 7.4, TOP = 78, PER_COL = 25, R = 2.4, OPT_DX = 7.2, NUM_W = 9;
  const LET = ['أ', 'ب', 'ج', 'د', 'هـ'];
  // تسميات البدائل لكل نوع سؤال بالعربية والإنجليزية (المزاوجة بترتيب أبجد هوز حطي كلمن)
  const LABELS = { ar: { mcq: ['أ', 'ب', 'ج', 'د', 'هـ'], tf: ['ص', 'خ'], match: ['أ', 'ب', 'ج', 'د', 'هـ', 'و', 'ز', 'ح', 'ط', 'ي', 'ك', 'ل', 'م', 'ن'] },
    en: { mcq: ['A', 'B', 'C', 'D', 'E'], tf: ['T', 'F'], match: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'] } };
  // spec: { lang, parts:[{type, count, options}] } ← قائمة الأسئلة [{n, lab, type, part}]
  // المقالي: صف درجات يظلله المعلم وحده (٠ … الدرجة القصوى، وأنصاف اختيارية)
  const essayVals = p => { const half = !!p.half, mx = Math.max(1, Math.min(half ? 6.5 : 13, +p.max || 5)), v = []; for (let x = 0; x <= mx + 1e-9; x += half ? 0.5 : 1) v.push(+x.toFixed(1)); return v; };
  const fmtV = (x, lang) => { const w = Math.floor(x), h = x - w > 0; const d = lang === 'en' ? String(w) : String(w).replace(/\d/g, c => '٠١٢٣٤٥٦٧٨٩'[c]); return h ? (w ? d : '') + '½' : d; };
  function expand(spec) { const lang = spec.lang === 'en' ? 'en' : 'ar', qs = []; (spec.parts || []).forEach((p, pi) => { const t = p.type || 'mcq';
      if (t === 'essay') { const vals = essayVals(p); for (let i = 0; i < (+p.count || 0); i++) qs.push({ n: vals.length, lab: vals.map(x => fmtV(x, lang)), vals, type: t, part: pi, teacher: true, max: vals[vals.length - 1] }); return; }
      const n = t === 'tf' ? 2 : Math.max(2, Math.min(t === 'match' ? 14 : 5, +p.options || 4)); for (let i = 0; i < (+p.count || 0); i++) qs.push({ n, lab: LABELS[lang][t].slice(0, n), type: t, part: pi }); });
    return { lang, dir: lang === 'en' ? 'ltr' : 'rtl', qs }; }
  const norm = (a, b) => typeof a === 'number' ? { dir: 'rtl', qs: Array.from({ length: a }, () => ({ n: b, lab: LET.slice(0, b) })) } : (a.qs ? a : expand(a));
  const AV = 178, Y0 = 94, YMAX = 276, HEAD = 5.2, GAP = 2.6;
  // كل قسم (نوع أسئلة) في كتلة مستقلة بعنوانه وترقيمه الخاص، والكتل متتالية من أعلى إلى أسفل
  function layout(a, b) {
    const sp = norm(a, b), qs = sp.qs, rtl = sp.dir !== 'ltr';
    const groups = []; qs.forEach((Q, q) => { const pi = Q.part || 0, g = groups[groups.length - 1]; if (g && g.part === pi) g.qs.push(q); else groups.push({ part: pi, qs: [q] }); });
    const P = [], N = [], local = [], heads = []; let y = Y0, overflow = false;
    groups.forEach((g, gi) => {
      const n = g.qs.length, maxO = Math.max(2, ...g.qs.map(q => qs[q].n)); let dx = OPT_DX; const cw = () => NUM_W + maxO * dx + 4;
      while (cw() > AV && dx > 5.3) dx = +(dx - 0.1).toFixed(2);
      let C = Math.max(1, Math.min(n, Math.floor(AV / cw()))); const rows = Math.ceil(n / C); C = Math.ceil(n / rows);
      const colW = cw(), tw = C * colW, x0 = (W - tw) / 2;
      heads.push({ y, x0, w: tw, part: g.part, idx: gi, from: g.qs[0], n, type: qs[g.qs[0]].type, teacher: !!qs[g.qs[0]].teacher });
      y += HEAD;
      g.qs.forEach((q, i) => { const c = Math.floor(i / rows), r = i % rows, cy = y + r * ROW_H + ROW_H / 2; local[q] = i + 1;
        N[q] = [rtl ? W - x0 - c * colW - NUM_W / 2 : x0 + c * colW + NUM_W / 2, cy];
        P[q] = Array.from({ length: qs[q].n }, (_, o) => [rtl ? W - x0 - c * colW - NUM_W - (o + 0.5) * dx : x0 + c * colW + NUM_W + (o + 0.5) * dx, cy]); });
      heads[heads.length - 1].h = HEAD + rows * ROW_H + 0.6;
      y += rows * ROW_H + GAP;
    });
    if (y - GAP > YMAX) overflow = true;
    return { pos: (q, o) => P[q][o], num: q => N[q], local, heads, qs, rtl, overflow, groups: groups.length };
  }
  const capacity = spec => !layout(spec).overflow;
  const idPos = b => [ID_X0 + b * ID_STEP + ID_S / 2, ID_Y + ID_S / 2];
  function encode(idx, model) { const bits = []; for (let i = 0; i < 12; i++) bits.push((idx >> i) & 1); bits.push(model & 1, (model >> 1) & 1); bits.push(bits.reduce((a, b) => a ^ b, 0)); return bits; }
  function decode(bits) { if (!bits.slice(0, 12).some(Boolean)) return null; const par = bits.slice(0, 14).reduce((a, b) => a ^ b, 0); if (par !== bits[14]) return null; let idx = 0; for (let i = 0; i < 12; i++) idx |= bits[i] << i; return { idx, model: bits[12] | (bits[13] << 1) }; }

  // صفحة ورقة واحدة (HTML بإحداثيات مطلقة بالمليمتر)
  function sheetHTML(o) {
    const sp = o.spec ? norm(o.spec) : norm(o.nq, o.no), L = layout(sp), bits = encode(o.idx || 0, o.model || 0), en = sp.dir === 'ltr', nid = String(o.nid || '').replace(/\D/g, '').slice(0, GID_N);
    const T = en ? { name: 'Name', cls: 'Class', model: 'Model', gid: 'ID number', gidh: 'Write your ID and shade it if not printed', ins: 'Fill one bubble per question completely with a dark pen or pencil. Do not write in the black-box strip.' + (sp.qs.some(q => q.teacher) ? ' Grey rows are for the teacher only (essay marks).' : '') } : { name: 'الاسم', cls: 'الفصل', model: 'نموذج', gid: 'رقم الهوية', gidh: 'إن لم يكن مظللاً: اكتب رقمك وظلّله', ins: 'ظلّل دائرة واحدة لكل سؤال تظليلاً كاملاً بقلم رصاص أو أزرق داكن. لا تكتب على شريط المربعات.' + (sp.qs.some(q => q.teacher) ? ' الصفوف الرمادية خاصة بالمعلم لرصد درجات الأسئلة المقالية — لا يظللها الطالب.' : '') };
    const mm = v => v.toFixed(2) + 'mm', dir = en ? 'ltr' : 'rtl';
    let h = `<div class="omr-page" dir="${dir}" style="${en ? "font-family:'Myriad Pro',Arial,'GE SS Two',sans-serif" : ''}">`;
    MARKS.forEach(([x, y]) => { h += `<div style="position:absolute;left:${mm(x)};top:${mm(y)};width:${mm(MK)};height:${mm(MK)};background:#000"></div>`; });
    h += `<div style="position:absolute;right:22mm;left:22mm;top:12mm;display:flex;align-items:center;justify-content:space-between;direction:${dir}"><div><div style="font-size:16pt;font-weight:800">${o.title}</div><div style="font-size:10pt;color:#005499">${o.sub || ''}</div></div><img src="assets/logo.svg" style="height:16mm"></div>`;
    h += `<div style="position:absolute;right:22mm;left:22mm;top:31mm;display:flex;gap:6mm;direction:${dir};font-size:11pt"><div style="flex:2;border:0.4mm solid #082B5A;border-radius:2mm;padding:1.5mm 3mm">${T.name}: <b>${o.name || ''}</b></div><div style="flex:1;border:0.4mm solid #082B5A;border-radius:2mm;padding:1.5mm 3mm">${T.cls}: <b>${o.cls || ''}</b></div>${o.seat ? `<div style="flex:1;border:0.4mm solid #082B5A;border-radius:2mm;padding:1.5mm 3mm;white-space:nowrap;overflow:hidden">${en ? 'Seat' : 'الجلوس'}: <b>${o.seat}</b></div>` : ''}<div style="width:24mm;border:0.4mm solid #082B5A;border-radius:2mm;padding:1.5mm 3mm;text-align:center">${T.model} <b>${o.modelName || 'A'}</b></div></div>`;
    bits.forEach((b, i) => { const [x, y] = [ID_X0 + i * ID_STEP, ID_Y]; h += `<div style="position:absolute;left:${mm(x)};top:${mm(y)};width:${mm(ID_S)};height:${mm(ID_S)};box-sizing:border-box;border:0.3mm solid #000;${b ? 'background:#000' : ''}"></div>`; });
    // شبكة رقم الهوية
    h += `<div style="position:absolute;left:${mm(GID_X0 - 1.5)};top:41.2mm;width:${mm(GID_N * GID_DX + 3)};height:${mm(GID_Y0 + 9 * GID_DY + 2.6 - 41.2)};box-sizing:border-box;border:0.3mm solid #b9c9de;border-radius:2mm;background:#fbfdff"></div><div style="position:absolute;left:${mm(GID_X0)};top:42mm;width:${mm(GID_N * GID_DX)};text-align:center;font-size:7pt;font-weight:800;color:#082B5A;direction:${dir}">${T.gid}</div>`;
    for (let c = 0; c < GID_N; c++) { const dg = nid[c]; h += `<div style="position:absolute;left:${mm(GID_X0 + c * GID_DX + 0.4)};top:45.4mm;width:${mm(GID_DX - 0.8)};height:4.2mm;box-sizing:border-box;border:0.25mm solid #082B5A;border-radius:0.6mm;text-align:center;font-size:8pt;font-weight:800;line-height:4mm;font-family:Arial,sans-serif">${dg ?? ''}</div>`;
      for (let d = 0; d < 10; d++) { const [x, y] = gidPos(c, d), f = dg !== undefined && +dg === d; h += `<div style="position:absolute;left:${mm(x - GID_R)};top:${mm(y - GID_R)};width:${mm(2 * GID_R)};height:${mm(2 * GID_R)};box-sizing:border-box;border:0.25mm solid #333;border-radius:50%;font:700 4.6pt/1 Arial,sans-serif;color:#c4c4c4;display:flex;align-items:center;justify-content:center;${f ? 'background:#111' : ''}">${f ? '' : d}</div>`; } }
    h += `<div style="position:absolute;left:${mm(ID_X0)};right:22mm;top:${mm(ID_Y + ID_S + 2.2)};font-size:8pt;color:#555;direction:${dir};line-height:1.45;text-align:${en ? 'left' : 'right'}">${T.ins}${nid ? '' : `<br><b style="color:#082B5A">${T.gidh}</b>`}${o.legend ? `<br><b style="color:#082B5A">${o.legend}</b>` : ''}</div>`;
    if (nid) h += `<div style="position:absolute;right:22mm;top:69mm;text-align:center;direction:ltr">${barcodeSVG(nid, 10)}<div style="font:700 8pt/1.2 Arial,sans-serif;letter-spacing:1.5pt;margin-top:0.6mm">${nid}</div></div>`;
    const ORD = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر'];
    const TN = en ? { mcq: 'Multiple choice — shade the correct letter', tf: 'True / False — T = True, F = False', match: 'Matching — shade the letter of the matching item', essay: 'Essay — TEACHER ONLY: shade the mark awarded' } : { mcq: 'اختيار من متعدد — ظلّل حرف الإجابة الصحيحة', tf: 'صح وخطأ — ص = صح، خ = خطأ', match: 'مزاوجة — ظلّل حرف العبارة المناسبة', essay: 'مقالي — خاص بالمعلم: يظلل الدرجة المستحقة' };
    if (L.groups > 1 || L.heads.some(x => x.teacher)) L.heads.forEach(hd => { h += `<div style="position:absolute;left:${mm(hd.x0 - 2.5)};top:${mm(hd.y - 0.8)};width:${mm(hd.w + 5)};height:${mm(hd.h + 1)};box-sizing:border-box;border:0.3mm solid ${hd.teacher ? '#8a97a8' : '#b9c9de'};${hd.teacher ? 'border-style:dashed;' : ''}border-radius:2mm;background:${hd.teacher ? '#f6f7f9' : '#fbfdff'}"></div>`; h += `<div style="position:absolute;left:${mm(hd.x0)};top:${mm(hd.y)};width:${mm(hd.w)};height:4.4mm;box-sizing:border-box;border-bottom:0.35mm solid ${hd.teacher ? '#8a97a8' : '#005499'};direction:${dir};text-align:${en ? 'left' : 'right'};font-size:8pt;font-weight:800;color:${hd.teacher ? '#5b6b82' : '#082B5A'};line-height:4mm;white-space:nowrap;overflow:hidden">${en ? 'Question ' + (hd.idx + 1) : 'السؤال ' + (ORD[hd.idx] || hd.idx + 1)}: <span style="font-weight:600">${TN[hd.type || 'mcq']}</span> <span style="color:#6b7aa3;font-weight:600">(${hd.n})</span></div>`; });
    for (let q = 0; q < sp.qs.length; q++) {
      const Q = sp.qs[q], [nx, ny] = L.num(q);
      if (Q.teacher) { const [x1] = L.pos(q, 0), [x2] = L.pos(q, Q.n - 1), a = Math.min(nx - 4.5, x1 - R - 1, x2 - R - 1), b = Math.max(nx + 4.5, x1 + R + 1, x2 + R + 1);
        h += `<div style="position:absolute;left:${mm(a)};top:${mm(ny - 3.4)};width:${mm(b - a)};height:6.8mm;box-sizing:border-box;background:#eceff3;border:0.25mm dashed #8a97a8;border-radius:1.5mm"></div>`; }
      h += `<div style="position:absolute;left:${mm(nx - 4.5)};top:${mm(ny - 2.6)};width:9mm;text-align:center;font-size:9pt;font-weight:800">${L.groups > 1 ? L.local[q] : q + 1}</div>`;
      for (let k = 0; k < Q.n; k++) { const [x, y] = L.pos(q, k), f = o.fill && o.fill[q] === k; h += `<div style="position:absolute;left:${mm(x - R)};top:${mm(y - R)};width:${mm(2 * R)};height:${mm(2 * R)};box-sizing:border-box;border:0.3mm solid #333;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:5.4pt;font-weight:700;line-height:1;color:#c4c4c4;${Q.teacher ? 'direction:ltr;unicode-bidi:isolate;' : ''}${f ? 'background:#111' : ''}">${f ? '' : (Q.lab[k] || '')}</div>`; }
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
      const gid = () => { let out = '', bad = false; for (let c = 0; c < GID_N; c++) { const f = []; for (let d = 0; d < 10; d++) f.push(sample(H2, ...gidPos(c, d), GID_R * 0.6)); const s2 = f.map((v, d) => [v, d]).sort((x, y) => y[0] - x[0]); if (s2[0][0] < 0.33) continue; if (s2[1][0] > 0.33 && s2[1][0] > s2[0][0] * 0.72) { bad = true; continue; } out += s2[0][1]; } return { digits: out, bad }; };
      return { ok: true, H: H2, id, gid: gid(), read: (a, b) => { const L = layout(a, b), nq = L.qs.length, ans = [], conf = []; for (let q = 0; q < nq; q++) { const f = []; for (let k = 0; k < L.qs[q].n; k++) f.push(sample(H2, ...L.pos(q, k), R * 0.62)); const s = f.map((v, k) => [v, k]).sort((a, b) => b[0] - a[0]); const [m1, m2] = [s[0], s[1] || [0, -1]];
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
  window.DinaOMR = { barcodeSVG, sheetHTML, PAGE_CSS, readCanvas, fileToCanvases, thumb, LET, LABELS, expand, capacity, encode, decode, layout };
})();
