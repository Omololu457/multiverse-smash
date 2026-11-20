#!/usr/bin/env python3
"""MSv2 per-phase commits through a PRIVATE index (the shared worktree and the default index are never touched).

  python3 tools/msv2/phases.py tree <phase> <out-dir>     export the phase-<n> tree's MSv2 files + hooked shared files (test)
  python3 tools/msv2/phases.py commit <phase> <msg-file>  commit phase <n> on top of the branch tip (commit-tree + update-ref)

Phase <n> = START (docs/ninja_storm_rangers/START_COMMIT.txt) + every hook / file of phases 1..n. Hooks are the indices of
tools/msv2/hooks.py HOOKS; files are paths (dirs = every file under them) taken from the worktree, where this build owns
them. harness/msv2.test.mjs is committed with only the sections that exist by that phase (its SECTIONS / ULT_STANCES lines).
"""
import os, subprocess, sys, tempfile
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BRANCH = 'feat/msv2-ninja-storm-wind-rangers'
START = open(os.path.join(ROOT, 'docs/ninja_storm_rangers/START_COMMIT.txt')).read().strip()
D = 'docs/ninja_storm_rangers/'
PHASES = {
  1: dict(hooks=[32, 33, 34, 35, 38, 41],   # characters · spritesheets · skins · credits · roster parity
          files=['assets/ninja_storm', 'assets/incoming/ninja_storm', 'tools/ninja_storm_build/extract.py', 'tools/ninja_storm_build/segment.py',
                 'tools/msv2/hooks.py', 'tools/msv2/FILES.txt', 'tools/msv2/sync_test.sh', 'tools/msv2/phases.py', 'tools/msv2/phase_test.sh',
                 'ninjaStormSprites.js', 'ninjaStormData.js', 'ninjaAcademy.js',
                 D + 'START_COMMIT.txt', D + 'SPRITE_LEDGER.md', D + 'frames_red.json', D + 'frames_yellow.json',
                 D + 'contact_sheet_red.png', D + 'contact_sheet_yellow.png', D + 'RESEARCH.md', D + 'CREDITS.md']),
  2: dict(hooks=list(range(0, 32)) + [42, 43],   # rangers blinkParams · game.js · combat.js · abilities.js · input.js · ui.js HUD
          files=['ninjaStormState.js', 'ninjaStorm.js', 'ninjaStormFx.js', 'ninjaStormHarness.js', 'harness/msv2_lib.mjs', 'harness/msv2_smoke.mjs'],
          tests=['roster', 'vanish', 'focus', 'clone', 'kawarimi', 'dial'], ult=[]),
  3: dict(hooks=[], files=[], tests=['red', 'ult'], ult=['red']),
  4: dict(hooks=[], files=[], tests=['yellow'], ult=['red', 'yellow']),
  5: dict(hooks=[], files=['harness/msv2_combos.mjs', D + 'COMBOS.md', D + 'combos_measured.json']),
  6: dict(hooks=[], files=[], tests=['defense']),
  7: dict(hooks=[39, 40], files=['ninjaStormSound.js'], tests=['sound']),
  8: dict(hooks=[36, 37], files=['ninjaStormKit.js']),
  9: dict(hooks=[], files=[D + 'BALANCE_NOTES.md', 'docs/ninja_academy/FRAMEWORK.md']),
  10: dict(hooks=[], files=['harness/msv2_framediff.mjs', 'harness/msv2_render.mjs', D + 'screenshots', D + 'TEST_RESULTS.md'], tests=['det']),
}

def git(*a, env=None, inp=None):
    return subprocess.run(['git', *a], cwd=ROOT, capture_output=True, check=True, env=env, input=inp).stdout.decode()

def cumulative(n):
    hooks, files, tests, ult = [], [], [], []
    for p in range(1, n + 1):
        P = PHASES[p]; hooks += P['hooks']; files += P['files']; tests += P.get('tests', [])
        if 'ult' in P: ult = P['ult']
    return sorted(set(hooks)), files, tests, ult

def expand(paths):
    out = []
    for p in paths:
        full = os.path.join(ROOT, p)
        if os.path.isdir(full):
            for d, _, fs in os.walk(full):
                if '__pycache__' in d: continue
                out += [os.path.relpath(os.path.join(d, f), ROOT) for f in fs if not f.startswith('.')]
        elif os.path.exists(full): out.append(p)
        else: raise SystemExit(f'missing file for phase: {p}')
    return sorted(out)

def test_source(tests, ult):
    s = open(os.path.join(ROOT, 'harness/msv2.test.mjs')).read()
    full = "const SECTIONS = ['roster', 'vanish', 'focus', 'clone', 'kawarimi', 'dial', 'red', 'yellow', 'ult', 'defense', 'sound', 'det']"
    assert full in s and "const ULT_STANCES = ['red', 'yellow']" in s
    s = s.replace(full, 'const SECTIONS = [' + ', '.join(f"'{t}'" for t in tests) + ']')
    return s.replace("const ULT_STANCES = ['red', 'yellow']", 'const ULT_STANCES = [' + ', '.join(f"'{t}'" for t in ult) + ']')

def hooked(hooks):
    """{path: text} for every shared file with the phase's hooks applied to START's clean blob."""
    src = open(os.path.join(ROOT, 'tools/msv2/hooks.py')).read()
    ns = {'__name__': 'msv2hooks', '__file__': os.path.join(ROOT, 'tools/msv2/hooks.py')}
    exec(src.split("if __name__ == '__main__':")[0], ns)
    table = ns['HOOKS']; ns['HOOKS'] = [table[i] for i in hooks]
    out = {}
    for f in sorted({table[i][0] for i in hooks}):
        new, notes = ns['apply'](f, git('show', f'{START}:{f}'))
        if notes: raise SystemExit('\n'.join(notes))
        out[f] = new
    return out

def content(n):
    hooks, files, tests, ult = cumulative(n)
    blobs = {f: t.encode() for f, t in hooked(hooks).items()}
    for f in expand(files): blobs[f] = open(os.path.join(ROOT, f), 'rb').read()
    if tests: blobs['harness/msv2.test.mjs'] = test_source(tests, ult).encode()
    return blobs

def modes(blobs):
    return {f: ('100755' if os.access(os.path.join(ROOT, f), os.X_OK) and not f.endswith(('.png', '.json', '.md')) else '100644') for f in blobs}

if __name__ == '__main__':
    cmd, n = sys.argv[1], int(sys.argv[2])
    blobs = content(n)
    if cmd == 'tree':
        out = sys.argv[3]
        for f, b in blobs.items():
            os.makedirs(os.path.dirname(os.path.join(out, f)) or out, exist_ok=True); open(os.path.join(out, f), 'wb').write(b)
        print(f'phase {n}: {len(blobs)} files → {out}')
    elif cmd == 'commit':
        msg = sys.argv[3]
        idx = tempfile.mktemp(prefix='msv2-idx-')
        env = {**os.environ, 'GIT_INDEX_FILE': idx}
        M = modes(blobs)
        try:
            git('read-tree', START, env=env)
            for f, b in blobs.items():
                h = git('hash-object', '-w', '--stdin', inp=b).strip()
                git('update-index', '--add', '--cacheinfo', f'{M[f]},{h},{f}', env=env)
            tree = git('write-tree', env=env).strip()
        finally:
            if os.path.exists(idx): os.remove(idx)
        tip = git('rev-parse', BRANCH).strip()
        if git('rev-parse', f'{tip}^{{tree}}').strip() == tree: raise SystemExit('nothing new in this phase')
        c = git('commit-tree', tree, '-p', tip, '-F', msg).strip()
        git('update-ref', f'refs/heads/{BRANCH}', c, tip)
        print(c)
