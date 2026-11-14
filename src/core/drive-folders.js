/* مجلدات Google Drive لكل معلم — رابط يحفظه المالك أو المعلم نفسه، يفتح من «خطتي» وقائمة الحساب */
(function () {
  const A = window.APP, V = window.VIEWS, { S, api, $, $$, esc, AR } = A;
  A.I.folder = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
  const isDrive = u => /^https:\/\/(drive|docs)\.google\.com\//i.test((u || '').trim());
  const canEdit = p => S.me.is_owner || p.id === S.me.id || A.anyPerm('users');

  async function saveUrl(p, url) {
    const r = await api.updateStaff(p.id, { drive_url: url || null });
    const x = S.staff.find(y => y.id === p.id); if (x) x.drive_url = r.drive_url;
    if (p.id === S.me.id) S.me.drive_url = r.drive_url;
    return r;
  }

  A.driveDialog = function (p, after) {
    if (!p) return;
    const mine = p.id === S.me.id, ed = canEdit(p);
    const m = A.modal(`<h3>${mine ? 'مجلدي في Google Drive' : 'مجلد Drive — ' + esc(p.full_name)}</h3>
      <p class="sub">رابط مجلد واحد على Google Drive يضع فيه ${mine ? 'ملفاتك' : 'المعلم ملفاته'} (أوراق العمل، العروض، ملفات الخطة). يظهر زر فتحه في «خطتي» وفي قائمة الحساب.</p>
      <div class="field"><label for="dvU">رابط المجلد</label><input class="in" id="dvU" dir="ltr" placeholder="https://drive.google.com/drive/folders/…" value="${esc(p.drive_url || '')}" ${ed ? '' : 'readonly'}></div>
      <p class="small muted" id="dvE" role="alert" style="min-height:1.2em"></p>
      <div class="row" style="gap:8px;justify-content:flex-start">
        ${ed ? '<button class="btn" id="dvS">حفظ</button>' : ''}
        ${p.drive_url ? `<a class="btn ghost" href="${esc(p.drive_url)}" target="_blank" rel="noopener">فتح المجلد</a>` : ''}
        ${ed && p.drive_url ? '<button class="btn bad sm" id="dvX">إزالة الرابط</button>' : ''}
      </div>`);
    const inp = m.el.querySelector('#dvU'); setTimeout(() => inp.focus(), 50);
    const sv = m.el.querySelector('#dvS');
    if (sv) sv.onclick = () => A.run(sv, async () => {
      const u = inp.value.trim();
      if (u && !isDrive(u)) { m.el.querySelector('#dvE').textContent = 'الرابط يجب أن يكون من drive.google.com أو docs.google.com'; inp.focus(); return; }
      await saveUrl(p, u); m.close(); A.toast(u ? 'حُفظ رابط المجلد' : 'أُزيل الرابط', 'ok'); after && after();
    });
    const rx = m.el.querySelector('#dvX');
    if (rx) rx.onclick = () => A.run(rx, async () => { await saveUrl(p, ''); m.close(); A.toast('أُزيل الرابط', 'ok'); after && after(); });
  };

  // ربط دفعة واحدة: سطر لكل معلم — البريد أو الاسم ثم الرابط
  function bulk(after) {
    const m = A.modal(`<h3>روابط مجلدات Drive دفعة واحدة</h3>
      <p class="sub">الصق سطراً لكل معلم: <b>البريد الإلكتروني أو الاسم</b> ثم الرابط (مفصولين بمسافة أو Tab أو فاصلة) — مثلاً من عمودين في Excel.</p>
      <div class="field"><textarea class="in" id="dbT" rows="8" dir="auto" placeholder="n.qahtani@dinaschool.com	https://drive.google.com/drive/folders/…"></textarea></div>
      <div id="dbP" class="small"></div>
      <div class="row" style="gap:8px;justify-content:flex-start"><button class="btn ghost" id="dbC">معاينة</button><button class="btn" id="dbS" disabled>حفظ</button></div>`);
    let rows = [];
    const parse = () => {
      const lines = m.el.querySelector('#dbT').value.split(/\n/).map(l => l.trim()).filter(Boolean);
      rows = lines.map(l => {
        const u = (l.match(/https?:\/\/\S+/) || [])[0] || '';
        const key = l.replace(u, '').replace(/[\t,،]+/g, ' ').trim();
        const k = A.normKey(key);
        const p = S.staff.find(s => s.email && s.email.toLowerCase() === key.toLowerCase()) || S.staff.find(s => A.normKey(s.full_name) === k) || S.staff.find(s => k && A.normKey(s.full_name).includes(k));
        return { line: l, url: u, p, ok: !!p && isDrive(u) };
      });
      const good = rows.filter(r => r.ok).length;
      m.el.querySelector('#dbP').innerHTML = `<p>${AR(good)} صالح من ${AR(rows.length)}</p><ul style="margin:0;padding-inline-start:18px;max-height:180px;overflow:auto">${rows.map(r => `<li style="${r.ok ? '' : 'color:var(--bad,#b42318)'}">${r.p ? esc(r.p.full_name) : '<b>لم يُعثر على المعلم</b>'} — ${r.url ? (isDrive(r.url) ? 'رابط صحيح' : '<b>رابط ليس من Drive</b>') : '<b>لا يوجد رابط</b>'}</li>`).join('')}</ul>`;
      m.el.querySelector('#dbS').disabled = !good;
    };
    m.el.querySelector('#dbC').onclick = parse;
    m.el.querySelector('#dbS').onclick = e => A.run(e.currentTarget, async () => {
      let n = 0; for (const r of rows.filter(r => r.ok)) { await saveUrl(r.p, r.url); n++; }
      m.close(); A.toast(`حُفظت ${AR(n)} روابط`, 'ok'); after && after();
    });
  }

  const prevRoles = V.roles;
  V.roles = function (root) {
    prevRoles.apply(this, arguments);
    const b = $('#drvBulk', root); if (b) b.onclick = () => bulk(() => V.roles(root));
  };
})();
