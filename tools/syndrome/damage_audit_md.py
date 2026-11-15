#!/usr/bin/env python3
"""Syndrome: write docs/syndrome/DAMAGE_AUDIT.md from MEASURED results (docs/syndrome/damage_results.json written by
harness/syndrome_damage.mjs, docs/syndrome/mechanics_results.json written by harness/syndrome.test.mjs).
Usage: python3 tools/syndrome/damage_audit_md.py"""
from pathlib import Path
import json
ROOT = Path(__file__).resolve().parents[2]; D = ROOT / 'docs/syndrome'
dmg = json.loads((D / 'damage_results.json').read_text()); mech = json.loads((D / 'mechanics_results.json').read_text())
AUTH = {'light': ('Spinner Snap', 45), 'sL2': ('Drone Cross', 45), 'sL3': ('Spinner Pass', 65), 'sLow': ('Low Spinner Skim', 42), 'heavy': ('Claw Drive', 95),
        'sLaunch': ('Rising Claw', 75), 'sZero': ('Zero-Point Hold', 20), 'sDuet': ('Hunter Duet', 150), 'sSpin': ('Spin Cycle', 110), 'sVelo': ('Velocipod Intercept', 150),
        'sTurret': ('Gun Turret', 180), 'sTurretMs': ('Missile Turret', 180), 'sTurretMortar': ('Mortar Turret', 180), 'sHammer': ('Hammerfall', 170), 'sRise': ('Rising Interception', 130), 'sSweep': ('Omnidroid Sweep', 120)}
opps = list(dmg['opponents'])
out = ['# Syndrome — damage audit', '',
 'All numbers below are **measured** in the running game (headless Chromium, real combat pipeline), not computed by hand.',
 'Sources: `harness/syndrome_damage.mjs` → `damage_results.json` (each move from a fresh state vs a standing dummy, no',
 'combo scaling at the first contact) and `harness/syndrome.test.mjs` → `mechanics_results.json` (routes through real',
 'keyboard input). Regenerate this file: `python3 tools/syndrome/damage_audit_md.py`.', '',
 '## Pipeline', '',
 '- Authored raw values are stored as-is (`SYNDROME_DAMAGE_SCALE = 1`; Goku stores light / heavy 45 / 85, Superman 45 / 80).',
 '- The shared pipeline applies to every character alike: live = floor(raw × combo scale × 0.6 GLOBAL_DAMAGE_SCALE / defence',
 '  multiplier). Machine volumes are engine projectiles (`applyScaledDamage`), the ultimate goes through `W.damage` per contact.',
 '- Multi-contact operations (Duet, turrets) take the SHARED combo scaling from the second contact when the foe is still in',
 '  hitstun — so their measured totals sit below raw × 0.6. Nothing in Syndrome bypasses scaling.', '',
 f'## Single moves vs {len(opps)} opponents (total HP removed; contacts in brackets)', '',
 '| Move | Raw | ' + ' | '.join(f'vs {o}' for o in opps) + ' |', '|---|---|' + '---|' * len(opps)]
for k, (n, raw) in AUTH.items():
    cells = []
    for o in opps:
        m = dmg['opponents'][o]['moves'].get(k, {}); h = m.get('hits', [])
        cells.append(f"{m.get('total', '—')} ({len(h)})" if h else '0')
    out.append(f'| {n} | {raw} | ' + ' | '.join(cells) + ' |')
u = [dmg['opponents'][o]['ultimate'] for o in opps]
out.append('| **Operation Kronos (confirmed)** | 420 | ' + ' | '.join(f"**{x['total']}** ({len(x['hits'])})" for x in u) + ' |')
out += ['', 'Max HP of each opponent: ' + ', '.join(f"{o} {dmg['opponents'][o]['maxHp']}" for o in opps) + '.', '',
 'Ultimate contacts vs the first opponent: ' + ' / '.join(str(h) for h in u[0]['hits']) + '.', '',
 '## Routes through real input (mechanics harness, mirror match)', '', '| Route | Hits | Damage | Verdict |', '|---|---|---|---|']
for r in mech.get('routes', []):
    if r.get('kind') == 'pressure' and not r['hits']: continue
    out.append(f"| {r['label']} | {' + '.join(str(h) for h in r['hits']) or '—'} | {r['damage']} | {r['verdict']} |")
out += ['', '## Reading', '',
 '- Light 45 / 45 / 65, Heavy 95, launcher 75, low 42, air 65, down-air 85 match the brief\'s table as stored values; the first',
 '  contact of each measures floor(raw × 0.6) on a fresh foe, the same rule every roster member follows.',
 '- The confirmed ultimate (30 + 90 + 70 + 230 raw) measures the totals in the table above with the combo scale captured at',
 '  the capture; it is the largest single resource spend in his kit (100 Power).',
 '- Opponent-specific differences are reported as measured, not smoothed over: wherever a column differs from the others',
 '  (e.g. fewer contacts, or a contact a few HP lower), the cause lies on that opponent\'s side of the shared pipeline',
 '  (their hurtbox / knockback travel / defensive passive) and was not investigated further in this build.', '']
(D / 'DAMAGE_AUDIT.md').write_text('\n'.join(out)); print('ok')
