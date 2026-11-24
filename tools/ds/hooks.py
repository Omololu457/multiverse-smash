#!/usr/bin/env python3
"""Demon Slayer ultimate-cinematic hooks — idempotent, anchor-based insertions into SHARED files (abilities.js), same tool
shape as tools/dino/hooks.py. Every line is tagged `// DS-ULT-CINE` and only runs inside that fighter's own ultimate.

  python3 tools/ds/hooks.py worktree | blobs <rev> | check
"""
import subprocess, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
M = '   // DS-ULT-CINE'
HOOKS = [
  ('abilities.js', 'import { activateInosukeBeastCinematic, isInosukeBeastCinematicActive } from "./inosukeBeastCinematic.js"',
   'import { startDemonSlayerPreroll } from "./demonSlayerCinematics.js"' + M + ' (Zenitsu / Nezuko ultimate pre-rolls; no cycle)', 'after'),
  ('abilities.js', '  focusCameraOnAction(context, fighter, target, 1.0, 10)\n  return true\n}\n// FIRST FORM: THUNDERCLAP AND FLASH',
   '  focusCameraOnAction(context, fighter, target, 1.0, 10)\n  startDemonSlayerPreroll("zenitsu", fighter, target)' + M + '\n  return true\n}\n// FIRST FORM: THUNDERCLAP AND FLASH', 'inline'),
  ('abilities.js', '  fighter._nzUltP2Pending = true                             // phase 2 auto-chains when phase 1 ends (updateNezukoUltChain)',
   '  startDemonSlayerPreroll("nezuko", fighter, context?.getOpponent?.(fighter))' + M, 'after'),
  ('abilities.js', '  fighter._spriteCastMove  = "nezukoTransform"   // transform-in flourish',
   '  startDemonSlayerPreroll("nezukoDemon", fighter, context?.getOpponent?.(fighter))' + M, 'after'),
  ('abilities.js', '      case "sakura":  cast = executeSakuraUltimate(fighter, context);  break',
   '      case "sakura":  cast = executeSakuraUltimate(fighter, context);  if (cast) startDemonSlayerPreroll("sakura", fighter, context?.getOpponent?.(fighter)); /* DS-ULT-CINE */ break', 'inline'),
  ('abilities.js', '      case "hinata":  cast = executeHinataUltimate(fighter, context);  break',
   '      case "hinata":  cast = executeHinataUltimate(fighter, context);  if (cast) startDemonSlayerPreroll("hinata", fighter, context?.getOpponent?.(fighter)); /* DS-ULT-CINE */ break', 'inline'),
  ('abilities.js', '      case "sasuke_sensei": cast = executeSasukeSenseiUltimate(fighter, context); break',
   '      case "sasuke_sensei": cast = executeSasukeSenseiUltimate(fighter, context); if (cast) startDemonSlayerPreroll("sasuke_sensei", fighter, context?.getOpponent?.(fighter)); /* DS-ULT-CINE */ break', 'inline'),
  ('abilities.js', '      case "six_paths_pain": cast = executeSixPathsUltimate(fighter, context); break',
   '      case "six_paths_pain": cast = executeSixPathsUltimate(fighter, context); if (cast) startDemonSlayerPreroll("six_paths_pain", fighter, context?.getOpponent?.(fighter)); /* DS-ULT-CINE */ break', 'inline'),
  ('abilities.js', '      case "naruto_hokage": cast = executeNarutoHokageUltimate(fighter, context); break',
   '      case "naruto_hokage": cast = executeNarutoHokageUltimate(fighter, context); if (cast) startDemonSlayerPreroll("naruto_hokage", fighter, context?.getOpponent?.(fighter)); /* DS-ULT-CINE */ break', 'inline'),
  ('abilities.js', '      case "naruto_seventh": cast = executeNarutoSeventhUltimate(fighter, context); break',
   '      case "naruto_seventh": cast = executeNarutoSeventhUltimate(fighter, context); if (cast) startDemonSlayerPreroll("naruto_seventh", fighter, context?.getOpponent?.(fighter)); /* DS-ULT-CINE */ break', 'inline'),
  ('abilities.js', '      case "sasuke_adult": cast = executeSasukeAdultUltimate(fighter, context); break',
   '      case "sasuke_adult": cast = executeSasukeAdultUltimate(fighter, context); if (cast) startDemonSlayerPreroll("sasuke_adult", fighter, context?.getOpponent?.(fighter)); /* DS-ULT-CINE */ break', 'inline'),
  ('abilities.js', 'import { startDemonSlayerPreroll } from "./demonSlayerCinematics.js"', 'import "./narutoUltCinematics.js"' + M + ' (registers the Naruto ult pre-roll scripts)', 'after'),
  # FIX (pre-existing since 1482d5e9f): Hinata's ultimate was pasted INSIDE applyHinataGuutenToProjectiles' loop, so it was
  # block-scoped and triggerUltimate threw "executeHinataUltimate is not defined". Move the loop's tail back above it.
  ('abilities.js', "    _hhDrain(fighter, opp, 20)\n  })\n  try { shakeCamera(context, 6, 16) } catch (_) {}\n  return true\n}\n    if (p.radius != null) p.radius *= 0.85\n    activeProjectiles.splice(i, 1)   // spun away\n  }\n}\n",
   "    _hhDrain(fighter, opp, 20)\n  })\n  try { shakeCamera(context, 6, 16) } catch (_) {}\n  return true\n}\n// (Guuten loop tail moved above — DS-ULT-CINE fix)\n", 'inline'),
  ('abilities.js', "    p.vx = (p.vx || 0) * 0.6; p.vy = (p.vy || 0) * 0.6\n// ULTIMATE (Phase 3)",
   "    p.vx = (p.vx || 0) * 0.6; p.vy = (p.vy || 0) * 0.6\n    if (p.radius != null) p.radius *= 0.85\n    activeProjectiles.splice(i, 1)   // spun away\n  }\n}\n// ULTIMATE (Phase 3)", 'inline'),
  # BEN 10 / ALBEDO human-form ultimate → the all-aliens sequence (ben10AlienSequence.js); same cost / 250 total / recovery
  ('abilities.js', 'import "./narutoUltCinematics.js"', 'import "./ben10AlienSequence.js"' + M + ' (registers the Ben 10 / Albedo all-aliens ultimate)', 'after'),
  ('abilities.js', "    hitAt(18, 70); hitAt(40, 70); hitAt(66, 110)\n",
   "    if (!startDemonSlayerPreroll(\"benAlienSequence\", fighter, getTargetResolver(context)(fighter), { hit: (dmg, last) => {" +
   " const opp = getTargetResolver(context)(fighter); if (!opp || opp.eliminated) return; applyScaledDamage(opp, dmg, { source: \"ben-overload\", attacker: fighter });" +
   " opp.hitstun = Math.max(opp.hitstun || 0, last ? 40 : 16); if (last) { opp.vx = (opp.x >= fighter.x ? 1 : -1) * 12; opp.vy = -8 } } }))" +
   " { hitAt(18, 70); hitAt(40, 70); hitAt(66, 110) }   // DS-ULT-CINE: the all-aliens sequence (the 3 radial hits stay as the fallback)\n", 'inline'),
]
SUPERSEDED = []

def apply(path, text):
    out, notes = text, []
    for f, prefix in SUPERSEDED:
        if f == path: out = ''.join(l for l in out.splitlines(True) if not l.startswith(prefix))
    for h in HOOKS:
        f, anchor, ins, mode = h[0], h[1], h[2], h[3]
        allocc = len(h) > 4 and h[4] == 'all'
        if f != path: continue
        if mode == 'inline':
            if ins in out: continue
            n = out.count(anchor)
            if n == 0: notes.append(f'MISSING anchor in {f}: {anchor[:70]!r}'); continue
            if n > 1 and not allocc: notes.append(f'AMBIGUOUS ({n}) anchor in {f}: {anchor[:70]!r}'); continue
            out = out.replace(anchor, ins)
            continue
        first_line = ins.split('\n')[0]
        n = out.count(anchor)
        if n == 0: notes.append(f'MISSING anchor in {f}: {anchor[:70]!r}'); continue
        if n > 1 and not allocc: notes.append(f'AMBIGUOUS ({n}) anchor in {f}: {anchor[:70]!r}'); continue
        if out.count(first_line) >= (n if allocc else 1): continue
        pos, res = 0, []
        while True:
            i = out.find(anchor, pos)
            if i < 0: res.append(out[pos:]); break
            if mode == 'after':
                if anchor.endswith('\n'): end = i + len(anchor); res.append(out[pos:end] + ins); pos = end
                else:
                    end = out.find('\n', i + len(anchor)); end = len(out) if end < 0 else end + 1
                    res.append(out[pos:end] + ins + '\n'); pos = end
            else:   # before: insert on its own line(s) before the anchor's line
                ls = out.rfind('\n', 0, i) + 1
                res.append(out[pos:ls] + ins + '\n' + out[ls:i + len(anchor)]); pos = i + len(anchor)
            if not allocc: res.append(out[pos:]); break
        out = ''.join(res)
    return out, notes

FILES = sorted({h[0] for h in HOOKS})
if os.environ.get('DINO_FILES') is not None: FILES = [f for f in FILES if f in os.environ['DINO_FILES'].split(',')]   # one phase's files
if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    bad = []
    for f in FILES:
        if cmd == 'blobs':
            rev = sys.argv[2]
            src = subprocess.run(['git', 'show', f'{rev}:{f}'], cwd=ROOT, capture_output=True, check=True).stdout.decode()
            new, notes = apply(f, src); bad += notes
            blob = subprocess.run(['git', 'hash-object', '-w', '--stdin'], cwd=ROOT, input=new.encode(), capture_output=True, check=True).stdout.decode().strip()
            print(f, blob)
        else:
            p = os.path.join(ROOT, f); src = open(p).read()
            new, notes = apply(f, src); bad += notes
            if cmd == 'worktree' and new != src: open(p, 'w').write(new); print('hooked', f)
            elif cmd == 'check': print(f, 'changes pending' if new != src else 'ok')
    for b in bad: print(b, file=sys.stderr)
    sys.exit(1 if bad else 0)
