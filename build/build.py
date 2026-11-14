#!/usr/bin/env python3
"""بناء منصة دينا — يجمع كل وحدات المنصة في ملف واحد dist/platform.js ويحدّث رقم الإصدار.

الاستخدام (من جذر المشروع):
    python3 build/build.py            # بناء + رقم إصدار جديد (قبل كل نشر)
    python3 build/build.py --check    # يتحقق فقط أن الحزمة مطابقة للمصادر (لا يكتب شيئاً)

- ترتيب الوحدات في build/modules.json (الترتيب مهم).
- index.html يحمّل الحزمة الواحدة؛ index.dev.html (يُولَّد هنا) يحمّل الوحدات منفردة للتشخيص.
- كل وحدة تُحاط بـ try/catch حتى لا يوقف خطأ في وحدة بقية المنصة (مثل السكربتات المنفصلة).
"""
import json, re, sys, time, glob, hashlib, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); os.chdir(ROOT)
MODS = json.load(open('build/modules.json', encoding='utf-8'))['bundle']
PAGES = ['index.html', 'student.html', 'parents.html', 'me.html', 'play.html', 'nisab.html', 'timetable.html', 'whiteboard.html', 'board.html'] + sorted(glob.glob('tools/*.html'))
TAG = '<script src="dist/platform.js?v={v}"></script>'

def bundle():
    out = ['/* منصة دينا — حزمة مولَّدة آلياً. لا تعدّل هذا الملف: عدّل المصادر في src/ ثم شغّل python3 build/build.py */\n']
    for m in MODS:
        code = open(m['src'], encoding='utf-8').read().rstrip()
        out.append(f"\n/* ==== {m['src']} ==== */\n")
        out.append(code + '\n' if m.get('raw') else f";try{{\n{code}\n}}catch(e){{console.error('[dina] {m['src']}',e)}}\n")
    return ''.join(out)

def main():
    b = bundle(); cur = open('dist/platform.js', encoding='utf-8').read() if os.path.exists('dist/platform.js') else ''
    if '--check' in sys.argv:
        ok = b == cur; print('الحزمة مطابقة للمصادر' if ok else 'الحزمة قديمة — شغّل python3 build/build.py'); sys.exit(0 if ok else 1)
    os.makedirs('dist', exist_ok=True); open('dist/platform.js', 'w', encoding='utf-8').write(b)
    v = str(int(time.time()))
    for p in PAGES:
        if not os.path.exists(p): continue
        s = open(p, encoding='utf-8').read(); s2 = re.sub(r'\?v=\d{9,}', '?v=' + v, s); s2 = re.sub(r"window\.DINA_V='\d*'", f"window.DINA_V='{v}'", s2)
        if s2 != s: open(p, 'w', encoding='utf-8').write(s2)
    # نسخة التشخيص: الوحدات منفردة
    idx = open('index.html', encoding='utf-8').read(); tag = TAG.format(v=v)
    if tag not in idx: sys.exit('index.html لا يحتوي وسم الحزمة: ' + tag)
    dev = idx.replace(tag, '\n'.join(f'<script src="{m["src"]}?v={v}"></script>' for m in MODS))
    open('index.dev.html', 'w', encoding='utf-8').write(dev)
    # خريطة الوحدات docs/MAP.md (تُولَّد آلياً من modules.json والمصادر)
    os.makedirs('docs', exist_ok=True); rows = []
    for i, m in enumerate(MODS, 1):
        code = open(m['src'], encoding='utf-8').read()
        views = sorted(set(re.findall(r'\bV\.([A-Za-z]\w*) = (?:async )?function', code)))
        exps = sorted(set(re.findall(r'\bA\.([A-Za-z_]\w*) = ', code)))[:14]
        rows.append(f"| {i} | `{m['src']}` | {m.get('old', '—')} | {len(code.encode())//1024} | {m.get('about', '')} | {' '.join(views) or '—'} | {' '.join(exps) or '—'} |")
    open('docs/MAP.md', 'w', encoding='utf-8').write('# خريطة وحدات المنصة\n\n> ملف مولَّد آلياً بـ `python3 build/build.py` — لا تعدّله يدوياً. عدّل الوصف في `build/modules.json`.\n>\n> الترتيب = ترتيب التحميل. وحدة لاحقة قد **تغلّف** صفحة عرّفتها وحدة سابقة (نفس اسم `V.x`)، فالأخيرة هي النافذة.\n\n| # | الملف | الاسم القديم | ك.ب | الوظيفة | الصفحات V.* | يصدّر A.* (أبرزها) |\n|---|---|---|---|---|---|---|\n' + '\n'.join(rows) + '\n')
    print(f'تم: dist/platform.js ({len(b.encode())//1024} ك.ب، {len(MODS)} وحدة) · الإصدار {v} · sha {hashlib.sha1(b.encode()).hexdigest()[:8]}')

if __name__ == '__main__': main()
