#!/usr/bin/env python3
"""tools/bloodmap/ledger.py — regenerate docs/msv1/blood/LEDGER.md from the bloodmaps, the contact-sheet checks
(docs/msv1/blood/sheets_results.json), the runtime fluid table (fluids.json written by `node -e` in the docs) and the
hand-review notes in docs/msv1/blood/ledger_notes.json  { "<id>": { "batch": n, "note": "..." } }."""
import json, os, sys
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
D = f'{R}/docs/msv1/blood'
notes = json.load(open(f'{D}/ledger_notes.json'))
res = {r['key']: r for r in json.load(open(f'{D}/sheets_results.json'))}
fluids = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else {}
keys = sorted(f[:-5] for f in os.listdir(f'{R}/data/bloodmaps') if f.endswith('.json'))
L = ['# MSV1-BLOOD — body-map ledger', '',
     'One row per playable character. **Mapping**: `auto` = body mask / regions / anchors detected by `tools/bloodmap/build.py`',
     'and accepted after looking at the contact sheet; `hand-fixed` = an `overrides` block in `data/bloodmaps/<id>.json`',
     '(or a detector fix made because of this character, noted). **Checks** are measured on the Tier-4 contact sheet with the',
     'runtime painter: max blood coverage of the opaque pixels (cap 15 %), blood pixels in the eye box (must be 0), blood',
     'pixels outside the body alpha (must be 0). **Reviewed** = the batch whose contact sheets I inspected.', '',
     '| id | name | mapping | overrides | fluid | unique / indexed frames | coverage max | eye px | outside px | reviewed | notes |',
     '|---|---|---|---|---|---|---|---|---|---|---|']
n_hand = n_rev = 0
for k in keys:
    m = json.load(open(f'{R}/data/bloodmaps/{k}.json')); ov = m.get('overrides') or {}
    nt = notes.get(k, {}); r = res.get(k, {})
    hand = bool(ov) or nt.get('hand'); n_hand += bool(hand); n_rev += 'batch' in nt
    novr = sum(len(v) for v in ov.values()) if ov else 0
    L.append(f"| `{k}` | {m.get('name','')} | {'hand-fixed' if hand else 'auto'} | {novr} | {fluids.get(k,'?')} | {len(m['frames'])} / {sum(len(v) for v in m['index'].values())} | "
             f"{r.get('coverMax',0)*100:.1f}% | {r.get('eyeHits','?')} | {r.get('outside','?')} | {('batch ' + str(nt['batch'])) if 'batch' in nt else '—'} | {nt.get('note','')} |")
L += ['', f'**{len(keys)} characters · {n_hand} hand-fixed · {len(keys)-n_hand} auto · {n_rev} reviewed.**', '']
open(f'{D}/LEDGER.md', 'w').write('\n'.join(L) + '\n'); print('ledger', len(keys), 'hand', n_hand, 'reviewed', n_rev)
