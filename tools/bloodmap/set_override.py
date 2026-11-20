#!/usr/bin/env python3
"""tools/bloodmap/set_override.py <id> '<json for the "*" or named override block>' [key]  — merge a hand fix into
data/bloodmaps/<id>.json "overrides" (then re-run build.py --only <id>)."""
import json, sys, os
R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
k, blob = sys.argv[1], json.loads(sys.argv[2]); key = sys.argv[3] if len(sys.argv) > 3 else '*'
p = f'{R}/data/bloodmaps/{k}.json'; d = json.load(open(p))
d.setdefault('overrides', {}).setdefault(key, {}).update(blob)
json.dump(d, open(p, 'w'), separators=(',', ':')); print(k, key, d['overrides'][key])
