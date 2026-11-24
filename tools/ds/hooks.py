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
