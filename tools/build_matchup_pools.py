#!/usr/bin/env python3
# build_matchup_pools.py — align 159 omololu matchup-trash-talk clips to the ~77 "VS [Character]" script
# lines by TRANSCRIPT content (recording order as a tiebreaker), group retakes (≈2 clips/line), and emit a
# MATCHUP mapping (rosterKey -> [clips]) + a GENERIC fallback pool for anything low-confidence. EVERY clip
# is placed (no discards). Prints specific-vs-generic counts + low-confidence flags.
#
# Usage: python3 tools/build_matchup_pools.py <clips_dir> <transcripts.json> <clip_url_prefix>

import sys, os, json, re
from difflib import SequenceMatcher

clips_dir, tj_path, url_prefix = sys.argv[1], sys.argv[2], sys.argv[3]
SCRIPT = os.path.join(clips_dir, "SCRIPT_REFERENCE.txt")
# ── EMPIRICAL STRUCTURE (verified by transcript, NOT the script's "clip N ≈ line N" claim) ──
# Clips 001–055 are GENERIC in-match combat quips (hit reactions / taunts / win lines / ability & round
# calls) — they match NO "VS" line and belong in the generic fallback pool. The character-specific trash
# talk begins at clip 056 ("You'd let your own kid die for a good fight" = GOKU, line 1) and runs cleanly
# IN SCRIPT ORDER to clip 159 (= BAKI, the last line), long lines split across 2–3 consecutive clips.
TALK_START = 56   # first clip number that is real VS trash talk (everything below → generic)
LOW_CONF = 0.34   # reporting-only flag now: within the clean 056+ region the DP order is trusted, so a
                  # low-scoring clip is a legit split-fragment ("pathetic", "get bent") kept with its line.
# named lines whose char isn't a selectable opponent → their clips still MUST be used, so route to GENERIC
NONSELECTABLE = {"megumi"}   # Megumi was removed from the roster (2026-08-18) — no such opponent exists

# script "VS <NAME>" -> rosterKey (verified against characters.js)
NAME2KEY = {
    "GOKU": "goku", "VEGETA": "vegeta", "NARUTO": "naruto", "SASUKE": "sasuke", "FRIEZA": "frieza",
    "SUKUNA": "sukuna", "GOJO": "gojo", "GHOSTFACE": "ghostface", "NAOYA": "naoya", "OMNI-MAN": "omniman",
    "DEATHSTROKE": "deathstroke", "JASON": "jason", "RICK": "rick", "SUPERMAN": "superman",
    "PICCOLO": "piccolo", "ITACHI": "itachi", "BEERUS": "beerus", "ZARAKI": "zaraki", "TOJI": "toji",
    "FLASH": "flash", "GOKU BLACK": "goku_black", "GOTENKS": "gotenks", "BARDOCK": "bardock",
    "VEGITO": "vegito", "ALT SUKUNA": "alt_sukuna", "AOI TODO": "aoi_todo", "MAKI": "maki", "YUJI": "yuji",
    "MIWA": "miwa", "YUTA": "yuta", "MEGUMI": "megumi", "TOBIRAMA": "tobirama", "HASHIRAMA": "hashirama",
    "MINATO": "minato", "MADARA": "madara", "OBITO": "obito", "TOBI": "tobi", "PAIN": "pain",
    "ISSHIKI": "isshiki", "HIRUZEN": "hiruzen", "OROCHIMARU": "orochimaru", "ONOKI": "onoki",
    "SIX PATHS OF PAIN": "six_paths_pain", "KAKASHI": "kakashi", "ZENITSU": "zenitsu", "RENGOKU": "rengoku",
    "SHINOBU": "shinobu", "INOSUKE": "inosuke", "NETERO": "netero", "CHROLLO": "chrollo", "HISOKA": "hisoka",
    "KURAPIKA": "kurapika", "BATMAN": "batman", "BRAINIAC": "brainiac", "GREEN LANTERN": "green_lantern",
    "DARK KNIGHT": "dark_knight", "ICHIGO": "ichigo", "MAYURI": "mayuri", "BYAKUYA": "byakuya",
    "YAMAMOTO": "yamamoto", "SAITAMA": "saitama", "GENOS": "genos", "SPIDER-MAN": "spiderman",
    "IRON MAN": "iron_man", "MILES": "miles", "GWEN": "gwen", "VILGAX": "vilgax", "OMEGA RANGER": "omega_ranger",
    "SAMURAI RED RANGER": "samurai_red_ranger", "GOLD SAMURAI RANGER": "gold_samurai_ranger",
    "GREEN SAMURAI RANGER": "green_samurai_ranger", "RED RANGER (MMPR)": "red_ranger_mmpr",
    "GHOSTFACE BILLY": "ghostface_billy", "GHOSTFACE.EXE": "ghostface_exe", "RICK PRIME": "rickPrime",
    "IPPO": "ippo", "BAKI": "baki",
}

# parse script -> ordered list of (rosterKey, line_text) for each "VS ..." line
lines = []
for raw in open(SCRIPT, encoding="utf-8"):
    m = re.match(r"^VS ([^:]+):\s*\"?(.*?)\"?\s*$", raw.strip())
    if not m:
        continue
    name = m.group(1).strip().upper()
    key = NAME2KEY.get(name)
    if key is None:
        print("  !! UNMAPPED name:", name, file=sys.stderr)
        key = "generic"
    lines.append((key, m.group(2).strip()))

def norm(t): return re.sub(r"[^a-z0-9 ]", "", (t or "").lower()).strip()
def sim(a, b): return SequenceMatcher(None, norm(a), norm(b)).ratio()

tj = json.load(open(tj_path, encoding="utf-8"))
def clip_num(fn): return int(re.search(r"_(\d+)\.mp3", fn).group(1))
all_clips = sorted(tj.keys(), key=clip_num)
# Leading generic combat quips (clip# < TALK_START) never get a character — straight to the generic pool.
pre_generic = [c for c in all_clips if clip_num(c) < TALK_START]
clips = [c for c in all_clips if clip_num(c) >= TALK_START]   # the clean, in-order VS-trash-talk region
txts = [tj[c].get("text", "") for c in clips]
M, N = len(clips), len(lines)
S = [[sim(txts[i], lines[k][1]) for k in range(N)] for i in range(M)]

# DP monotonic alignment — line k-1 may absorb 1/2/3 consecutive clips (retakes/splits); or a line is
# skipped (0 clips). Every clip is absorbed by exactly one line.
NEG = -1e9; GAP = 0.3
dp = [[NEG] * (N + 1) for _ in range(M + 1)]; bk = [[None] * (N + 1) for _ in range(M + 1)]
dp[0][0] = 0.0
for k in range(1, N + 1): dp[0][k] = dp[0][k - 1] - GAP; bk[0][k] = ("skip", 0, k - 1)
for i in range(1, M + 1):
    for k in range(1, N + 1):
        best, op = NEG, None
        for take in (1, 2, 3):
            if i >= take:
                v = dp[i - take][k - 1] + sum(S[i - take + t][k - 1] for t in range(take))
                if v > best: best, op = v, ("take%d" % take, i - take, k - 1)
        v = dp[i][k - 1] - GAP
        if v > best: best, op = v, ("skip", i, k - 1)
        dp[i][k] = best; bk[i][k] = op

clip_line = {}
i, k = M, N
while i > 0 or k > 0:
    op = bk[i][k]
    if op is None: break
    kind, ni, nk = op
    if kind.startswith("take"):
        t = int(kind[4:])
        for j in range(ni, ni + t): clip_line[j] = nk
        i, k = ni, nk
    else:
        i, k = ni, nk

pools = {}; generic = list(pre_generic); rows = []
for c in pre_generic:   # leading generic combat quips
    rows.append((c, 0.0, "generic(quip)", tj[c].get("text", "")[:40], ""))
for idx, c in enumerate(clips):
    k = clip_line.get(idx)
    if k is None:   # a clip the DP couldn't place (shouldn't happen — every clip is absorbed) → generic
        generic.append(c); rows.append((c, 0.0, "generic", txts[idx], "")); continue
    key, line = lines[k]; s = S[idx][k]
    if key in NONSELECTABLE:   # line exists but opponent isn't selectable → clip still used, via generic
        generic.append(c); rows.append((c, s, "generic<-" + key, txts[idx], line))
    else:   # TRUST the in-order DP grouping — low score = split-fragment, still that character's clip
        pools.setdefault(key, []).append(c); rows.append((c, s, key, txts[idx], line))

nspec = sum(len(v) for v in pools.values())
covered = sorted(pools.keys()); missing = [lk for lk, _ in lines if lk not in pools and lk not in NONSELECTABLE]
print(f"lines={N} | clips: total={len(all_clips)} generic-quip={len(pre_generic)} vs-region={M}")
print(f"SPECIFIC: {nspec} clips across {len(pools)} characters | GENERIC pool: {len(generic)} clips")
print(f"lines with NO clip (→ generic at runtime): {len(missing)} {missing}")
low = [r for r in rows if 0 < r[1] < LOW_CONF]
print(f"in-region split-fragments flagged low (<{LOW_CONF}, kept with their line): {len(low)}")
for c, s, key, txt, line in rows:
    print(f"  {c[:-4]:22s}[{s:.2f}] {key:18s}| {txt[:38]!r:40s} ~ {line[:32]!r}")

# emit JSON for the JS builder step
out = {"specific": {k: v for k, v in pools.items()}, "generic": generic, "url": url_prefix}
json.dump(out, open("announcer_clips_matchup_map.json", "w"), indent=0)
print("\nwrote announcer_clips_matchup_map.json")
