#!/usr/bin/env python3
"""Generate ICHIGO_VOICE_LOG.md from ichigo_raw_transcript.tsv + the hand-review curation below.
Also emits the pool→clip lists used by ichigoVoice.js (printed) so the two never drift.
Disposition of every one of the 167 clips is explicit: WIRED(pool), DISCARD(reason), or HELD(clean surplus)."""
import csv

TSV = "ichigo_raw_transcript.tsv"

# ── POOLS: clip idx → pool. Technique pools cross-referenced to Ichigo's BUILT kit (abilities.js):
#    neutral Getsuga Tenshō projectile · Fwd Charged Slash · Down Hollow Getsuga · Up Hollow Rising ·
#    Air Getsuga Dive · Fwd+Heavy "Zangetsu" rekka/command normals · Ultimate = Getsuga Tenshō cinematic.
POOL = {
    # getsuga — neutral Getsuga Tenshō projectile cast (short "Getsuga!" callouts)
    3: "getsuga", 88: "getsuga", 39: "getsuga",
    # ultimate — Getsuga Tenshō 2-part cinematic (the marquee full callouts + all-out windup)
    46: "ultimate", 159: "ultimate", 166: "ultimate", 96: "ultimate",
    # hollowGetsuga — Down dark super ("this is my power now" dark-form lines)
    73: "hollowGetsuga", 84: "hollowGetsuga", 100: "hollowGetsuga",
    # hollowRising — Up dark super (all-out escalation)
    31: "hollowRising", 77: "hollowRising", 63: "hollowRising",
    # chargedSlash — Fwd charged advancing slash (committed "hit!/eat this!" barks)
    54: "chargedSlash", 163: "chargedSlash", 114: "chargedSlash",
    # airGetsuga — aerial dive
    148: "airGetsuga", 32: "airGetsuga", 156: "airGetsuga",
    # zangetsu — Fwd+Heavy rekka / command normals (sword-string barks)
    87: "zangetsu", 105: "zangetsu", 116: "zangetsu", 158: "zangetsu",
    # intro — pre-fight (intro+taunt merge on the intro beat, like Madara/Miwa)
    1: "intro", 38: "intro", 67: "intro", 64: "intro", 21: "intro", 90: "intro", 127: "intro", 0: "intro",
    # taunt — mocking flavor (folded into the intro pool at fire time)
    34: "taunt", 44: "taunt", 93: "taunt", 112: "taunt", 161: "taunt", 101: "taunt",
    # combatBark — heavy / long-string connect
    7: "combatBark", 13: "combatBark", 35: "combatBark", 86: "combatBark",
    106: "combatBark", 122: "combatBark", 145: "combatBark", 138: "combatBark",
    # hitReact — taking a hit
    33: "hitReact", 37: "hitReact", 57: "hitReact", 69: "hitReact", 111: "hitReact", 135: "hitReact", 142: "hitReact",
    # lowHealth — once, crossing the threshold
    107: "lowHealth", 154: "lowHealth", 134: "lowHealth", 61: "lowHealth", 127.5: "lowHealth",
    # win — victory
    155: "win", 152: "win", 41: "win", 157: "win", 28: "win", 118: "win",
}
POOL.pop(127.5, None)  # (marker cleanup — 127 already used in intro)

DISCARD = {}
# non-speech / silent (VAD returned empty on BOTH passes)
for i in [4, 23, 45, 79, 94, 95, 109, 117, 143, 149]:
    DISCARD[i] = "non-speech / silent (VAD empty both passes)"
# unintelligible grunts, garbled non-words, and single-word fillers/fragments (no usable line)
for i in [2, 6, 8, 11, 14, 15, 17, 20, 22, 29, 30, 36, 40, 42, 43, 49, 52, 55, 56, 59, 60, 62, 66, 68,
          70, 72, 82, 83, 85, 89, 92, 98, 108, 113, 119, 121, 123, 124, 130, 132, 140, 144, 146, 147,
          151, 160, 162, 164]:
    DISCARD[i] = "unintelligible grunt / garbled noise / single-word filler-fragment"
# genuine near-duplicates of a wired (or held) line
DUP = {
    97:  "near-dup of 155 『俺の勝ちな』(win)",
    99:  "『これが』fragment — dup of 100-family",
    103: "『俺の力で』— dup of 100 (wired, hollowGetsuga)",
    125: "『次で決める』— dup of 118 (wired, win)",
    139: "『見せてやるよ』— dup of 78 (held)",
    141: "『俺自身の力を』— dup of 63 (wired, hollowRising)",
}

rows = {}
for r in csv.reader(open(TSV), delimiter="\t"):
    if not r or not r[0].strip().isdigit():
        continue
    i = int(r[0]); rows[i] = dict(file=r[1], dur=r[2], lang=r[3], ja=r[5], en=r[6])

# disposition
def dispo(i):
    if i in POOL: return ("WIRED", POOL[i])
    if i in DISCARD: return ("DISCARD", DISCARD[i])
    if i in DUP: return ("DISCARD", DUP[i])
    return ("HELD", "clean, surplus")

POOL_ORDER = ["getsuga", "chargedSlash", "hollowGetsuga", "hollowRising", "airGetsuga",
              "zangetsu", "ultimate", "intro", "taunt", "combatBark", "hitReact", "lowHealth", "win"]

# ── emit the pool → clip python lists for ichigoVoice.js ──
print("=== POOLS for ichigoVoice.js ===")
for p in POOL_ORDER:
    items = [i for i in sorted(rows) if POOL.get(i) == p]
    print(f"\n{p}:")
    for i in items:
        print(f'    "{rows[i]["file"]}",   // {i:03d} {rows[i]["ja"]} — {rows[i]["en"]}')

# ── write the log ──
L = []
L.append("# Ichigo Kurosaki — Voice Line Log (Bleach: Rebirth of Souls, Japanese)\n")
L.append("167 clips (`ichigo_voice_*`, exact filenames preserved). Transcribed via "
         "`tools/transcribe_ichigo.py` (faster-whisper `small`, 2-pass: native-JA + English gloss), then "
         "hand-reviewed. Audio-only — **zero gameplay/stat/frame changes**. Wired through `ichigoVoice.js` "
         "(`pickIchigoVoice(pool)` → `sound.playSfxFile`), mirroring the Madara/Miwa JA voice modules.\n")
wired = sum(1 for i in rows if dispo(i)[0] == "WIRED")
disc = sum(1 for i in rows if dispo(i)[0] == "DISCARD")
held = sum(1 for i in rows if dispo(i)[0] == "HELD")
L.append(f"**Totals: {wired} wired · {disc} discarded · {held} held (clean surplus, available).** "
         "Named-other-character lines discarded: **0** (none present — every line is generic self/opponent "
         "address; the two English-gloss 'names' Marina/Jenna are garbled non-words in JA, discarded as noise).\n")

L.append("\n## Technique-callout mapping (Step 3)\n")
L.append("Ichigo's callouts are all **Getsuga-family**, matching his built kit. **No confident 'Bankai' "
         "callout was isolated** — and his kit has no Bankai-named move (his powered/Hollow forms are the "
         "Hollow Getsuga / Hollow Rising supers), so nothing was fabricated. Cross-reference:\n")
L.append("| Callout (clip) | JA | Built move it drives |")
L.append("|---|---|---|")
L.append("| **046** | ゲッツガーテンション! (Getsuga Tenshō!) | Ultimate (Getsuga Tenshō cinematic) |")
L.append("| **159** | 月が天使! (Getsuga Tenshō!) | Ultimate |")
L.append("| **096** | こいつで決める!吹き飛べ!切り崩す! | Ultimate (all-out finisher windup) |")
L.append("| **166** | この一撃に込める! (all into one strike) | Ultimate |")
L.append("| **003 / 088** | ギュッツガー! / ケッツガー (Getsuga!) | Neutral Getsuga Tenshō projectile |")
L.append("| **039** | 月が転称 (Getsuga Tenshō) | Neutral Getsuga Tenshō projectile |")
L.append("| **073 / 084 / 100** | 今の俺の力だ / この力で! / 俺自身の力 | Down = Hollow Getsuga (dark super) |")
L.append("| **031 / 077 / 063** | 今の俺の全力だ! / 今の俺なら! / 俺自身の力で | Up = Hollow Rising (dark super) |")
L.append("| **054 / 163 / 114** | 逃すかよ!当たれ! / 暗いやがれ! / これでも食らえ! | Fwd = Charged Getsuga Slash |")
L.append("| **148 / 032 / 156** | 吹き食べ! / これでぶっ飛べ! / もらった! | Air = Aerial Getsuga Dive |")

L.append("\n## Wired pools\n")
for p in POOL_ORDER:
    items = [i for i in sorted(rows) if POOL.get(i) == p]
    L.append(f"\n### `{p}` ({len(items)})")
    for i in items:
        L.append(f"- `{rows[i]['file']}` — **{i:03d}** {rows[i]['ja']} — *{rows[i]['en']}*")

L.append("\n## Full disposition table (all 167)\n")
L.append("| # | dur | JA | EN gloss | disposition |")
L.append("|---|---|---|---|---|")
for i in sorted(rows):
    d = dispo(i)
    tag = f"WIRED → {d[1]}" if d[0] == "WIRED" else (f"DISCARD — {d[1]}" if d[0] == "DISCARD" else "HELD")
    ja = rows[i]["ja"] or "—"; en = (rows[i]["en"] or "—").replace("|", "/")
    L.append(f"| {i:03d} | {rows[i]['dur']}s | {ja} | {en} | {tag} |")

open("ICHIGO_VOICE_LOG.md", "w").write("\n".join(L) + "\n")
print(f"\n\nwrote ICHIGO_VOICE_LOG.md — {wired} wired / {disc} discarded / {held} held")
