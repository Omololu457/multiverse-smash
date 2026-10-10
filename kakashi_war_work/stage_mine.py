#!/usr/bin/env python3
"""Filter `git diff <file>` to ONLY the kakashi_war hunks (evict concurrent war-susano hunks),
emit a patch applyable with `git apply --cached`. Usage: stage_mine.py <file>"""
import subprocess, sys, re

MINE = re.compile(r"kakashi_war|KakashiWar|KAKASHI_WAR|_raikiri|_sharingan|_kamui|_tsuiga|_sennen|"
                  r"_kwLog|_kwCd|_warDog|_warUlt|_warCine|raikiri_|mangekyou_cast|kamui_swirl|"
                  r"drawKakashiWar|_kwar|Kamui|Raikiri|Kawarimi|Tsuiga|Sennen|Sharingan", re.I)
FOREIGN = re.compile(r"susano|WARSUSANO|_warArm|soldier|ribcage|_susanoImg|_drawSusano", re.I)

f = sys.argv[1]
diff = subprocess.run(["git", "diff", "--", f], capture_output=True, text=True).stdout
lines = diff.splitlines(keepends=True)
# header = everything up to the first @@ hunk
hdr, i = [], 0
while i < len(lines) and not lines[i].startswith("@@"):
    hdr.append(lines[i]); i += 1
# split hunks
hunks, cur = [], None
for ln in lines[i:]:
    if ln.startswith("@@"):
        if cur is not None: hunks.append(cur)
        cur = [ln]
    else:
        cur.append(ln)
if cur is not None: hunks.append(cur)

kept, dropped = [], 0
for h in hunks:
    body = "".join(h)
    changed = "".join(l for l in h if l[:1] in "+-")
    if FOREIGN.search(changed):
        dropped += 1; continue           # foreign (war-susano) hunk → evict
    if MINE.search(changed):
        kept.append(body)
    else:
        dropped += 1                      # neither → context-only, skip

if not kept:
    print(f"{f}: no kakashi_war hunks", file=sys.stderr); sys.exit(2)
patch = "".join(hdr) + "".join(kept)
with open("/tmp/mine.patch", "w") as out:
    out.write(patch)
print(f"{f}: kept {len(kept)} hunk(s), dropped {dropped} (foreign/context)")
