#!/usr/bin/env python3
"""tools/edoskin/ledger.py — docs/msv1/edo/LEDGER.md: one row per playable character id (eligible or not)."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
e = json.load(open(os.path.join(HERE, 'eligibility.json')))
ov = json.load(open(os.path.join(HERE, 'overrides.json'))) if os.path.exists(os.path.join(HERE, 'overrides.json')) else {}
ver = json.load(open(os.path.join(HERE, 'verify.json'))) if os.path.exists(os.path.join(HERE, 'verify.json')) else {}
review = json.load(open(os.path.join(HERE, 'review.json'))) if os.path.exists(os.path.join(HERE, 'review.json')) else {}
ONLY = set(open(sys.argv[1]).read().split()) if len(sys.argv) > 1 else None   # optional: keys shipped so far (batch commits)
rows = []
for k in sorted(e['classes'], key=str.lower):
    c = e['classes'][k]
    if k in e.get('exclude', {}):
        rows.append(f"| `{k}` | {c} → EXCLUDED | — | — | — | — | — | {e['exclude'][k]} |"); continue
    if c not in ('HUMAN', 'MASKED'):
        rows.append(f"| `{k}` | {c} | — | — | — | — | — | no Edo skin: {e['why'].get(k, '')} |"); continue
    p = os.path.join(HERE, 'report', k + '.json')
    if ONLY is not None and k not in ONLY:
        rows.append(f"| `{k}` | {c} | pending (later batch) | | | | | |"); continue
    if not os.path.exists(p):
        rows.append(f"| `{k}` | {c} | MISSING | | | | | |"); continue
    r = json.load(open(p)); v = ver.get(k, {})
    fix = 'hand-fixed (' + ', '.join(sorted(ov[k].keys() - {'note'})) + ')' if k in ov else 'automatic'
    eyes = 'black sclera' if r['sclera'] else ('n/a (masked)' if c == 'MASKED' else 'skipped: no separable whites')
    cr = f"{r['faceCracks']} face / {r['armCracks']} arm"
    notes = '; '.join(r.get('notes', []) + ([ov[k]['note']] if k in ov and ov[k].get('note') else []) + ([review[k]] if k in review else []))
    chk = 'ok' if v and not (v['dims'] or v['alpha'] or v['outline'] or v['missing']) else ('FAIL' if v else '?')
    rows.append(f"| `{k}` | {c} | {r['sheets']} | {r['skinColours']} | {eyes} | {cr} | {fix} · verify {chk} | {notes} |")
md = ["# MSV1-EDO ledger", "",
      "One row per playable character. Sheets = default + form sheets given an `__edo` twin. Skin cols = palette colours mapped",
      "to the ash ramp. Contact sheets: `docs/msv1/edo/sheets/<id>.png` (top original, bottom Edo). Overrides: tools/edoskin/overrides.json.", "",
      "| id | class | sheets | skin cols | eyes | cracks | fix / verify | notes |", "|---|---|---|---|---|---|---|---|"] + rows
open(os.path.join(ROOT, 'docs', 'msv1', 'edo', 'LEDGER.md'), 'w').write('\n'.join(md) + '\n')
print(len(rows))
