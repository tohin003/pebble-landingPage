"""For each package: latest version, upload date, license, and whether wheels exist for cp313/cp314 macOS arm64."""
import json, subprocess, sys, re
pk = sys.argv[1:]
for p in pk:
    out = subprocess.run(['curl', '-sS', '--max-time', '30', f'https://pypi.org/pypi/{p}/json'], capture_output=True, text=True).stdout
    try:
        d = json.loads(out)
    except Exception:
        print(f"{p:16s} ERR"); continue
    info = d['info']; v = info['version']
    files = d['urls']
    tags = []
    for f in files:
        fn = f['filename']
        if fn.endswith('.whl'):
            tags.append(fn)
    def has(py):
        for fn in tags:
            parts = fn[:-4].split('-')
            pyt, abi, plat = parts[-3], parts[-2], parts[-1]
            macarm = ('macosx' in plat and ('arm64' in plat or 'universal2' in plat)) or plat == 'any'
            pyok = (py in pyt.split('.')) or pyt in ('py3', 'py2.py3') or (abi == 'abi3' and int(pyt.replace('cp', '').split('.')[0][1:] or 0) <= int(py[3:]))
            if macarm and pyok:
                return True
        return False
    sdist = any(f['packagetype'] == 'sdist' for f in files)
    upl = min((f['upload_time'][:10] for f in files), default='?')
    lic = (info.get('license_expression') or info.get('license') or '')
    lic = lic.split('\n')[0][:30]
    cls = [c.split('::')[-1].strip() for c in info.get('classifiers', []) if c.startswith('License')]
    sizes = [f['size'] for f in files if f['filename'].endswith('.whl') and ('arm64' in f['filename'] or 'universal2' in f['filename'] or 'none-any' in f['filename'])]
    print(f"{p:16s} {v:12s} {upl} cp313={'Y' if has('cp313') else '-'} cp314={'Y' if has('cp314') else '-'} sdist={'Y' if sdist else '-'} whl_MB={max(sizes)/1e6 if sizes else 0:.1f} lic={lic or (cls[0] if cls else '?')} req_py={info.get('requires_python')}")
