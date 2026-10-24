#!/usr/bin/env python3
"""Private-index committer for the Soldier Boy build.

The feat/superman checkout is shared with a LIVE concurrent Superman session that commits to the same
engine files (abilities.js / combat.js / game.js / sound.js). This tool commits ONLY my hunks + my new
files, built on the CURRENT committed HEAD tree — it never stages the superman session's files, never
touches the shared index or working tree.

ENGINE EDITS are applied IDEMPOTENTLY against HEAD's blob:
  - if `new` already present  -> skip (already applied, or a clobber already healed)
  - elif `old` present        -> replace the FIRST occurrence with `new`
  - else                      -> ABORT (anchor shape changed upstream; needs manual review)
Because the FULL cumulative set is re-asserted every run, a superman commit that clobbers my tip is
healed on my next commit. update-ref is guarded on the old HEAD and retried if HEAD moved mid-build.

Usage:  python3 soldier_boy_work/sb_apply.py <msg_file> [newfile1 newfile2 ...]
"""
import subprocess, sys, os, tempfile
from collections import OrderedDict

BRANCH = "refs/heads/feat/superman"


def git(*args, env=None, inp=None):
    return subprocess.run(["git", *args], capture_output=True, text=True, env=env, input=inp)


def blob_at(head, path):
    r = git("show", f"{head}:{path}")
    if r.returncode != 0:
        raise SystemExit(f"[sb_apply] cannot read {path}@{head}: {r.stderr.strip()}")
    return r.stdout


# ── CUMULATIVE engine edits (path, old_anchor, new_text). GROWN each phase. ──────────────────────
EDITS = [

    # ══ PHASE 2 — Nuclear Charge economy ══
    # Passive regen = 3/s (0.05/frame), a touch below the 0.06 base so the meter leans on in-combat gains.
    ("abilities.js",
     '  if (key === "omololu") regen += 0.015\n',
     '  if (key === "omololu") regen += 0.015\n'
     '  // Soldier Boy — Nuclear Charge passive regen is exactly 3/s (0.05/frame @60fps), a touch below the\n'
     '  // 0.06 base so the meter economy leans on IN-COMBAT gains (+6 landed / +4 taken, combat.applyScaledDamage):\n'
     '  // "every special is a choice against the nuke." Overrides the base rate (set, not add).\n'
     '  if (key === "soldier_boy") regen = 0.05\n'),

    # +6 on a landed damaging hit, +4 on one taken (universal damage sink → covers melee + projectiles).
    ("combat.js",
     '      || (dealt / Math.max(1, target.maxHealth || 100) >= 0.055 ? "big" : "light")\n'
     '  }\n'
     '  if (typeof globalThis !== "undefined" && globalThis.__DMG_LOG) {\n',
     '      || (dealt / Math.max(1, target.maxHealth || 100) >= 0.055 ? "big" : "light")\n'
     '  }\n'
     '  // SOLDIER BOY — Nuclear Charge builds IN COMBAT: +6 when he lands a damaging hit, +4 when he takes one\n'
     '  // (spec Phase 2). Gated on rosterKey → a strict no-op for every other character (their damage + meter\n'
     '  // stay byte-identical). Meter lives in fighter.energy (GAME_STATE), capped at maxEnergy; self-hits can\'t feed.\n'
     '  if (dealt > 0) {\n'
     '    const _sbAtk = opts.attacker\n'
     '    if (_sbAtk && _sbAtk !== target && (_sbAtk.rosterKey || "").toLowerCase() === "soldier_boy")\n'
     '      _sbAtk.energy = Math.min(_sbAtk.maxEnergy || 100, (_sbAtk.energy || 0) + 6)\n'
     '    if ((target.rosterKey || "").toLowerCase() === "soldier_boy")\n'
     '      target.energy = Math.min(target.maxEnergy || 100, (target.energy || 0) + 4)\n'
     '  }\n'
     '  if (typeof globalThis !== "undefined" && globalThis.__DMG_LOG) {\n'),

    # package.json — register the energy-economy harness (my P1 line is the anchor; superman never touches it).
    ("package.json",
     '    "test:soldier-boy-p1": "node harness/soldier_boy_p1_render.mjs",\n',
     '    "test:soldier-boy-p1": "node harness/soldier_boy_p1_render.mjs",\n'
     '    "test:soldier-boy-energy": "node harness/soldier_boy_energy.test.mjs",\n'),

]


def build_changed(head):
    files = OrderedDict()
    for (p, old, new) in EDITS:
        files.setdefault(p, []).append((old, new))
    changed = {}
    for path, elist in files.items():
        content = blob_at(head, path)
        for (old, new) in elist:
            if new in content:
                continue
            if old in content:
                content = content.replace(old, new, 1)
            else:
                raise SystemExit(f"[sb_apply] ANCHOR MISSING in {path}:\n--- expected ---\n{old[:200]}\n----------------")
        changed[path] = content
    return changed


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: sb_apply.py <msg_file> [newfiles...]")
    msg_file = sys.argv[1]
    newfiles = sys.argv[2:]
    for attempt in range(8):
        head = git("rev-parse", "HEAD").stdout.strip()
        idx = tempfile.mktemp(prefix="sb_idx_")
        env = dict(os.environ, GIT_INDEX_FILE=idx)
        git("read-tree", head, env=env)
        changed = build_changed(head)
        for path, content in changed.items():
            h = git("hash-object", "-w", "--stdin", inp=content).stdout.strip()
            r = git("update-index", "--cacheinfo", f"100644,{h},{path}", env=env)
            if r.returncode != 0:
                raise SystemExit(f"[sb_apply] update-index {path}: {r.stderr}")
        for f in newfiles:
            r = git("update-index", "--add", f, env=env)
            if r.returncode != 0:
                raise SystemExit(f"[sb_apply] update-index --add {f}: {r.stderr}")
        tree = git("write-tree", env=env).stdout.strip()
        new = git("commit-tree", tree, "-p", head, "-F", msg_file, env=env).stdout.strip()
        res = git("update-ref", BRANCH, new, head)
        try:
            os.remove(idx)
        except OSError:
            pass
        if res.returncode == 0:
            print(f"[sb_apply] OK  {new[:10]}  (parent {head[:10]}, attempt {attempt+1})")
            print(f"[sb_apply] engine files touched: {', '.join(changed.keys())}")
            return
        print(f"[sb_apply] HEAD moved ({head[:10]} → racing), retrying... {res.stderr.strip()}")
    raise SystemExit("[sb_apply] could not update-ref after 8 attempts (HEAD racing hard)")


if __name__ == "__main__":
    main()
