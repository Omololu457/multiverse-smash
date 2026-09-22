#!/usr/bin/env python3
# build_announcer_pools.py — align the 227 announcer clips to the script (by transcript content, biased by
# recording order), group them into category pools, and emit announcerVoice.js. Category-level accuracy is
# forgiving (adjacent script lines share a section), so a position-anchored fuzzy alignment is robust.
#
# Usage: python3 tools/build_announcer_pools.py <clips_dir> <transcripts.json> <clip_url_prefix>
#   e.g. python3 tools/build_announcer_pools.py "clips 2" "clips 2/announcer_transcripts.json" "./announcer_clips/"

import sys, os, json, re
from difflib import SequenceMatcher

clips_dir, tj_path, url_prefix = sys.argv[1], sys.argv[2], sys.argv[3]
SCRIPT = os.path.join(clips_dir, "SCRIPT_REFERENCE.txt")

# section header (exact text between the dashes) -> pool key
SECTION_KEY = {
    "GAME BOOT / TITLE SCREEN": "boot", "MAIN MENU": "mainMenu", "MODE SELECT": "modeSelect",
    "SETTINGS / OPTIONS": "settings", "CHARACTER SELECT — ENTERING SCREEN": "charSelect",
    "CHARACTER SELECT — HOVER / BROWSE": "charHover", "CHARACTER SELECT — LOCK IN": "charLock",
    "CHARACTER SELECT — RANDOM PICK": "charRandom", "SKIN SELECT": "skinSelect",
    "STAGE SELECT": "stageSelect", "STAGE SELECT — HOVER": "stageHover", "VS SCREEN": "vs",
    "PRE-ROUND COUNTDOWN": "countdown", "ROUND START": "roundStart",
    "ROUND START — SPECIAL MODIFIERS": "roundModifier", "EARLY NEUTRAL / POKING": "earlyNeutral",
    "FIRST HIT LANDED": "firstHit", "BLOCKED ATTACK / WHIFF": "blocked", "PARRY": "parry",
    "CLASH": "clash", "COUNTER-HIT": "counterHit", "MID-MATCH HYPE": "midHype",
    "COMBO START": "comboStart", "COMBO MILESTONES": "comboMilestone",
    "COMBO DROPPED / ESCAPED": "comboDropped", "LAUNCHER / JUGGLE": "launcher",
    "SPECIAL MOVE LANDED": "specialLanded", "SPECIAL MOVE WHIFFED": "specialWhiffed",
    "ULTIMATE ACTIVATED": "ultActivate", "ULTIMATE CONNECTS": "ultConnect",
    "ULTIMATE WHIFFED / BLOCKED": "ultWhiff", "TRANSFORMATION / FORM CHANGE": "transform",
    "DOMAIN / SPECIAL CINEMATIC TRIGGERED": "domain", "GRAB / COMMAND GRAB": "grab",
    "THROW ESCAPE": "throwEscape", "KNOCKDOWN": "knockdown", "WAKE-UP / GETTING BACK UP": "wakeup",
    "LOW HEALTH WARNING": "lowHealth", "CRITICAL HEALTH": "critical",
    "COMEBACK / CLUTCH MOMENT": "comeback", "CHIP DAMAGE FINISH": "chipFinish",
    "ROUND END / K.O.": "ko", "PERFECT ROUND": "perfect", "BRUTALITY / GORE FINISH": "brutality",
    "ROUND TRANSITION": "roundTransition", "DOUBLE KO / DRAW": "doubleKo", "TIME OVER": "timeOver",
    "MATCH END / VICTORY SCREEN": "victory", "REMATCH / CONTINUE PROMPT": "rematch",
    "RETURNING TO MENU": "returnMenu", "SPECIAL MODES — ENTRY": "modeEntry",
    "ARCADE — FIGHT PROGRESSION": "arcadeProgress", "TOWER MODE — FLOOR PROGRESSION": "towerProgress",
    "FREE FOR ALL — ELIMINATION": "ffaElim", "FREE FOR ALL — VICTORY": "ffaVictory",
    "TEAM MODE": "team", "TRAINING MODE": "training",
    "DAILY CHALLENGE / COMBO TRIAL — SUCCESS": "challengeSuccess",
    "DAILY CHALLENGE / COMBO TRIAL — FAILURE": "challengeFail", "LEVEL UP / XP GAIN": "levelUp",
    "UNLOCK": "unlock", "PAUSE MENU": "pause", "DISCONNECT / MATCH INTERRUPTED": "disconnect",
    "IDLE / NO INPUT": "idle",
}

# parse script -> ordered list of (key, line_text)
lines = []
cur = None
for raw in open(SCRIPT, encoding="utf-8"):
    s = raw.rstrip("\n")
    m = re.match(r"^---\s*(.+?)\s*---\s*$", s)
    if m:
        cur = SECTION_KEY.get(m.group(1).strip())
        if cur is None: print("  !! unknown section:", m.group(1), file=sys.stderr)
        continue
    if not s.strip() or s.startswith("ANNOUNCER SCRIPT") or s.startswith("Clips are") \
       or s.startswith("announcer_") or s.startswith("recording,") or s.startswith("few lines") \
       or s.startswith("short lines"):
        continue
    if cur: lines.append((cur, s.strip()))

def norm(t): return re.sub(r"[^a-z0-9 ]", "", (t or "").lower()).strip()
def sim(a, b): return SequenceMatcher(None, norm(a), norm(b)).ratio()

tj = json.load(open(tj_path, encoding="utf-8"))
def clip_num(fn): return int(re.search(r"_(\d+)\.mp3", fn).group(1))
clips = sorted(tj.keys(), key=clip_num)

# GLOBAL monotonic alignment (Needleman-Wunsch variant) of the clip sequence ↔ the line sequence.
# Ops: 1:1 (clip↔line), SPLIT (2 consecutive clips ↔ 1 line — a line recorded across a breath), and
# SKIP-LINE (a line with no dedicated clip). Optimal total-similarity alignment → robust to drift.
txts = [tj[c].get("text", "") for c in clips]
M = len(clips); N = len(lines)
S = [[sim(txts[i], lines[k][1]) for k in range(N)] for i in range(M)]
NEG = -1e9
GAP = 0.25   # penalty for leaving a script line unmatched (skip-line)
dp = [[NEG] * (N + 1) for _ in range(M + 1)]
bk = [[None] * (N + 1) for _ in range(M + 1)]
dp[0][0] = 0.0
for k in range(1, N + 1):           # leading lines with no clips
    dp[0][k] = dp[0][k - 1] - GAP; bk[0][k] = ("skip", 0, k - 1)
for i in range(1, M + 1):
    for k in range(1, N + 1):
        # 1:1 — clip i-1 ↔ line k-1
        cand = dp[i - 1][k - 1] + S[i - 1][k - 1]; op = ("match", i - 1, k - 1)
        # SPLIT — clips i-2 & i-1 both ↔ line k-1
        if i >= 2:
            v = dp[i - 2][k - 1] + S[i - 2][k - 1] + S[i - 1][k - 1]
            if v > cand: cand, op = v, ("split", i - 2, k - 1)
        # SKIP-LINE — line k-1 unmatched
        v = dp[i][k - 1] - GAP
        if v > cand: cand, op = v, ("skip", i, k - 1)
        dp[i][k] = cand; bk[i][k] = op
# backtrack → clip index -> line index
clip_line = {}
i, k = M, N
while i > 0 or k > 0:
    op = bk[i][k]
    if op is None: break
    kind, ni, nk = op
    if kind == "match": clip_line[ni] = nk; i, k = ni, nk
    elif kind == "split": clip_line[ni] = nk; clip_line[ni + 1] = nk; i, k = ni, nk
    else: i, k = ni, nk   # skip line
pools = {}
rows = []
for i, c in enumerate(clips):
    k = clip_line.get(i)
    if k is None:   # unmatched clip (shouldn't happen) → nearest by position
        k = min(N - 1, i)
    key, line = lines[k]
    pools.setdefault(key, []).append(c)
    rows.append((c, S[i][k], key, txts[i], line))

# report + low-confidence flags
print(f"lines={N}  clips={len(clips)}  categories={len(pools)}")
low = [r for r in rows if r[1] < 0.45]
print(f"low-confidence (<0.45 sim): {len(low)}")
for c, s, key, txt, line in rows:
    flag = "  <<LOW" if s < 0.45 else ""
    print(f"  {c[:-4]:16s} [{s:.2f}] {key:16s} | {txt[:42]!r:44s} ~ {line[:38]!r}{flag}")

# emit announcerVoice.js
order = []
seen = set()
for _, (k, _l) in enumerate(lines):
    if k not in seen and k in pools: seen.add(k); order.append(k)
out = ['// announcerVoice.js', '// ' + '-' * 75,
       '// GENERIC ANNOUNCER voice pools (audio-only; NO gameplay effect). 227 clips in %s, REAL-transcribed' % clips_dir,
       '// (faster-whisper) + aligned to SCRIPT_REFERENCE.txt by content (biased by recording order). One pool per',
       '// script section; pickAnnouncer(pool) returns ONE clip at random. Played via sound.playSfxFile(clip, null,',
       '// { owner: null }) — untagged, so it never cross-cuts a fighter\'s single voice channel.',
       '// ' + '-' * 75, '',
       'const A = "%s"' % url_prefix, '',
       'export const ANNOUNCER_VOICE = {']
for k in order:
    cs = ", ".join('A + "%s"' % c for c in pools[k])
    out.append('  %-16s [%s],' % (k + ":", cs))
out += ['}', '',
        'export function pickAnnouncer(pool) {',
        '  const arr = ANNOUNCER_VOICE[pool]',
        '  if (!Array.isArray(arr) || arr.length === 0) return null',
        '  return arr[Math.floor(Math.random() * arr.length)]',
        '}', '']
open("announcerVoice.js", "w", encoding="utf-8").write("\n".join(out))
print("\nwrote announcerVoice.js with", len(order), "pools,", sum(len(v) for v in pools.values()), "clips")
