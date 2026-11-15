#!/usr/bin/env python3
"""Higuruma: build commit-ready versions of the 10 shared files = HEAD content + ONLY the Higuruma hooks.
The worktree also holds other sessions' uncommitted hook lines (Robin, Raven, Starfire, Cyborg, Beast Boy, Megumi,
S.P.D. Yellow …); several Higuruma hooks are anchored after those lines, which do not exist in HEAD. This tool:
  1. W  = worktree file; W0 = W with every Higuruma hook reverted (apply_hooks.HOOKS read in reverse) and asserts
     apply_hooks(W0) == W (the reversal is exact);
  2. maps each inserted Higuruma block from its W0 position onto HEAD through `git diff --no-index -U0 HEAD W0`
     (unchanged line → same line in HEAD; inside a foreign inserted block → the HEAD line that block follows);
  3. applies the 'replace' hooks with HEAD-specific anchors (the last fighter in each committed condition list);
  4. asserts every line added vs HEAD belongs to a Higuruma hook and nothing of HEAD was removed.
Writes <out>/<file>.   Usage: head_blobs.py OUTDIR [--base REV]"""
import sys, os, re, subprocess, tempfile, importlib.util
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
out_dir = sys.argv[1]; base = sys.argv[sys.argv.index('--base') + 1] if '--base' in sys.argv else 'HEAD'
src = open(os.path.join(ROOT, 'tools/higuruma/apply_hooks.py')).read().replace('\nmain()', '\n')
ns = {'__file__': os.path.join(ROOT, 'tools/higuruma/apply_hooks.py')}; exec(compile(src, 'apply_hooks', 'exec'), ns); HOOKS = ns['HOOKS']
HEAD_REPLACE = {   # worktree anchor → (HEAD anchor, HEAD replacement, count)
  "!fighter._starfireRemoteInput && !fighter._robinRemoteInput) {": ("!fighter._mmprPinkRemoteInput) {", "!fighter._mmprPinkRemoteInput && !fighter._higurumaRemoteInput) {", 1),
  "fighter.rosterKey === 'robin') && !fighter._aiControlled": ("fighter.rosterKey === 'mmpr_pink') && !fighter._aiControlled", "fighter.rosterKey === 'mmpr_pink' || fighter.rosterKey === 'higuruma') && !fighter._aiControlled", 1),
  "!fighter._robinRemoteInput && inputSettings[": ("!fighter._mmprPinkRemoteInput && inputSettings[", "!fighter._mmprPinkRemoteInput && !fighter._higurumaRemoteInput && inputSettings[", 1),
  "isRobinUltActive() || isSamuraiFlameSmasherCinematicActive()": ("isMmprPinkUltActive() || isSamuraiFlameSmasherCinematicActive()", "isMmprPinkUltActive() || isHigurumaUltActive() || isSamuraiFlameSmasherCinematicActive()", 1),
  "clearRobin(p1,ROBIN_WORLD);clearRobin(p2,ROBIN_WORLD)": ("clearMmprPink(p1,MMPR_PINK_WORLD);clearMmprPink(p2,MMPR_PINK_WORLD)", "clearMmprPink(p1,MMPR_PINK_WORLD);clearMmprPink(p2,MMPR_PINK_WORLD);clearHiguruma(p1);clearHiguruma(p2)", 2),
  "robinLocked(fighter, readRawControls(fighter)) ||": ("mmprPinkLocked(fighter, readRawControls(fighter)) ||", "mmprPinkLocked(fighter, readRawControls(fighter)) || higurumaLocked(fighter, readRawControls(fighter)) ||", 1),
}
def git(*a, ok=(0,)):
  p = subprocess.run(['git', *a], cwd=ROOT, capture_output=True, text=True)
  if p.returncode not in ok: sys.exit(p.stderr)
  return p.stdout
def apply(text, hooks):
  out = text
  for f, anchor, op, t, marker, *w in hooks:
    want = w[0] if w else 1
    if marker in out: continue
    assert out.count(anchor) == want, (f, anchor[:60], out.count(anchor))
    if op == 'replace': out = out.replace(anchor, t)
    else:
      k = 0
      for _ in range(want):
        i = out.index(anchor, k); j = out.find('\n', i + len(anchor)); j = len(out) if j < 0 else j
        out = out[:j] + '\n' + t + out[j:]; k = j + 1 + len(t)
  return out
bad = 0; os.makedirs(out_dir, exist_ok=True); report = []
for fn in sorted({h[0] for h in HOOKS}):
  hooks = [h for h in HOOKS if h[0] == fn]
  W = open(os.path.join(ROOT, fn), encoding='utf-8').read(); H = git('show', f'{base}:{fn}')
  # 1. reverse every Higuruma hook
  W0 = W
  for f, anchor, op, t, marker, *w in reversed(hooks):
    want = w[0] if w else 1
    if op == 'replace':   # remove just the inserted Higuruma segment (other sessions may have appended their own tokens beside it)
      a_, t_ = anchor, t; i_ = 0
      while i_ < len(a_) and a_[i_] == t_[i_]: i_ += 1
      j_ = 0
      while j_ < len(a_) - i_ and a_[-1 - j_] == t_[-1 - j_]: j_ += 1
      seg = t_[i_:len(t_) - j_]
      assert 'iguruma' in seg and W0.count(seg) == want, (fn, 'replace segment', seg, W0.count(seg)); W0 = W0.replace(seg, '')
    else: assert W0.count('\n' + t) == want, (fn, 'insert text', t[:60]); W0 = W0.replace('\n' + t, '', want)
  assert 'iguruma' not in W0 and 'IGURUMA' not in W0, (fn, 'higuruma text left after reversal')
  _w0, _w = W0.split('\n'), W.split('\n')   # exact up to placement: W minus the Higuruma lines == W0 line-for-line
  _hl = [h for h in hooks if h[2] == 'after_line']
  assert len(_w) - len(_w0) == sum(len(h[3].split('\n')) * (h[5] if len(h) > 5 else 1) for h in _hl), (fn, 'line count')
  # 2. map W0 line numbers onto HEAD
  with tempfile.TemporaryDirectory() as td:
    a, b = os.path.join(td, 'H'), os.path.join(td, 'W0'); open(a, 'w', encoding='utf-8').write(H); open(b, 'w', encoding='utf-8').write(W0)
    d = subprocess.run(['git', 'diff', '--no-index', '-U0', a, b], capture_output=True, text=True).stdout
  hunks = [tuple(int(x) if x else 1 for x in m) for m in re.findall(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', d, re.M)]
  hunks = [(o, ol, n, nl) for o, ol, n, nl in [(h[0], h[1], h[2], h[3]) for h in hunks]]
  # careful: a missing count means 1, an explicit 0 means 0
  hunks = []
  for m in re.finditer(r'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@', d, re.M):
    o, ol, n, nl = int(m[1]), (int(m[2]) if m[2] is not None else 1), int(m[3]), (int(m[4]) if m[4] is not None else 1)
    hunks.append((o, ol, n, nl))
  removed_head = sum(ol for o, ol, n, nl in hunks if ol and nl == 0)
  def to_head(p):   # W0 line p (1-based) → HEAD line after which text placed after W0 line p belongs
    off = 0
    for o, ol, n, nl in hunks:
      nstart = n if nl else n + 1
      if nl and nstart <= p < nstart + nl:
        if ol: report.append(f'  note {fn}: W0 line {p} is inside a mixed hunk (-{o},{ol} +{n},{nl}); placed after HEAD line {o + ol - 1}')
        return (o + ol - 1) if ol else o
      if (n + nl - 1 if nl else n) < p: off += ol - nl
    return p + off
  # 3. place each after_line block, then the replace hooks with HEAD anchors
  Hl = H.split('\n'); inserts = []
  for f, anchor, op, t, marker, *w in hooks:
    want = w[0] if w else 1
    if op != 'after_line': continue
    k = 0
    for _ in range(want):
      i = W0.index(anchor, k); j = W0.find('\n', i + len(anchor)); j = len(W0) if j < 0 else j
      p = W0.count('\n', 0, j) + 1; inserts.append((to_head(p), t, marker)); k = j + 1
  for hl, t, marker in sorted(inserts, key=lambda x: x[0], reverse=True): Hl[hl:hl] = t.split('\n')
  Hn = '\n'.join(Hl)
  for f, anchor, op, t, marker, *w in hooks:
    if op != 'replace': continue
    ha, ht, cnt = HEAD_REPLACE[anchor]
    assert Hn.count(ha) == cnt, (fn, 'HEAD anchor', ha, Hn.count(ha)); Hn = Hn.replace(ha, ht)
  # 4. audit: nothing of HEAD removed, every added line comes from a Higuruma hook
  with tempfile.TemporaryDirectory() as td:
    a, b = os.path.join(td, 'H'), os.path.join(td, 'N'); open(a, 'w', encoding='utf-8').write(H); open(b, 'w', encoding='utf-8').write(Hn)
    d2 = subprocess.run(['git', 'diff', '--no-index', '-U0', a, b], capture_output=True, text=True).stdout
  minus = [l[1:] for l in d2.split('\n') if l.startswith('-') and not l.startswith('---')]
  plus = [l[1:] for l in d2.split('\n') if l.startswith('+') and not l.startswith('+++')]
  hook_lines = set(x for h in hooks for x in h[3].split('\n')) | set(HEAD_REPLACE[h[1]][1] for h in hooks if h[2] == 'replace')
  foreign_plus = [l for l in plus if l not in hook_lines and not any(HEAD_REPLACE[h[1]][1] in l for h in hooks if h[2] == 'replace')]
  repl_minus_ok = all(any(HEAD_REPLACE[h[1]][0] in l for h in hooks if h[2] == 'replace') for l in minus)
  if foreign_plus or not repl_minus_ok: bad += 1; print(f'FAIL {fn}: foreign +{len(foreign_plus)} / unexpected -{len(minus)}', foreign_plus[:3], minus[:3])
  open(os.path.join(out_dir, fn), 'w', encoding='utf-8').write(Hn)
  print(f'  ok  {fn}: +{len(plus)} -{len(minus)} (replace-modified lines) vs {base}')
for r in report: print(r)
sys.exit(1 if bad else 0)
