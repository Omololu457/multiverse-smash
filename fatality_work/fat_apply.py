import sys
base, edits, out = sys.argv[1], sys.argv[2], sys.argv[3]
s = open(base, encoding='utf-8').read(); raw = open(edits, encoding='utf-8').read()
for b in raw.split('@@OLD@@\n'):
    if '@@NEW@@\n' not in b: continue
    old, rest = b.split('@@NEW@@\n', 1); new, _ = rest.split('@@END@@\n', 1)
    if old.endswith('\n'): old = old[:-1]
    if new.endswith('\n'): new = new[:-1]
    if s.count(old) != 1: raise SystemExit('anchor count %d: %r' % (s.count(old), old[:60]))
    s = s.replace(old, new, 1)
open(out, 'w', encoding='utf-8').write(s); print('hooks applied ->', out)
