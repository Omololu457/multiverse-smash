#!/usr/bin/env python3
# Emit orochimaruVoice.js from the acoustic-vibe pool assignment. Clips are UNIDENTIFIED (no transcript) →
# sorted BY VIBE (duration / pitch / brightness / energy, from tools/analyze_orochimaru_voice.py). The 7
# flagged long clips (01,02,16,20,24,27,43) were split into <NN><a..> segments (music-masked multi-line).
# Resolves each line-tag to its exact on-disk filename so nothing is mistyped.
import glob, json, sys

feat = json.load(open("/tmp/oro_voice_features.json"))
def fn(tag):
    hits = [f for f in glob.glob(f"orochi_line_{tag}_*.mp3")]
    if not hits: sys.exit(f"MISSING clip for tag {tag}")
    return hits[0]
def dur(tag): return feat.get(fn(tag), {}).get("dur", "?")

# ── POOL ASSIGNMENT (vibe-sorted; # = duration s) ───────────────────────────
POOLS = {
    # intro — dramatic, declamatory medium-long lines (pre-match presence)
    "intro":      ["25", "47", "14", "30", "52", "03"],
    # 8 SPECIAL casts — aggressive/sharp barks, per-move (task triggers 2–9)
    "grab":       ["19", "44", "21"],                     # 2  Grab-and-Slam (throw-weapon grab)
    "snakeSpit":  ["17", "57", "56"],                     # 3  Ranged Strike (neutral snake, ranged)
    "swordLunge": ["09", "40", "05"],                     # 4  Kusanagi MELEE (Fwd sword lunge)
    "swordThrow": ["36", "13", "10"],                     # 5  Kusanagi RANGED (Back sword throw) — separate move (Stage 3)
    "snakeLunge": ["55", "54", "27a"],                    # 6  Extending Charge (air Striking-Shadow-Snake dive)
    "tailSweep":  ["22", "15", "16b"],                    # 7  Escalating Strike (Up snake-tail anti-air)
    "slam":       ["49", "39", "29"],                     # 8  Downward Stab (Down slam) — deep/low
    "chainFinish":["43b", "27e", "24b"],                  # 9  Combo Finisher (Fwd+Heavy chain finisher)
    # two extra specials with no task slot → own small pools (SnakeBarrage air-Fwd, Coil air-Back)
    "snakeBarrage":["31", "35", "24a", "50"],
    "coil":       ["24d", "16d", "16c"],
    # 10 ULTIMATE — longest/most dramatic (flagged-splits checked first, then longest whole)
    "ultimate":   ["20a", "24c", "42"],
    # 11 TRANSFORM — shed-skin; distinct dramatic lines
    "transform":  ["33", "23", "48", "12"],
    # 12 HIT LIGHT — short pain grunts (frequent slot → many variants)
    "hitLight":   ["04", "32", "53", "08", "37", "02b", "02d", "02a", "38", "58"],
    # 13 HIT HEAVY — bigger/lower pain
    "hitHeavy":   ["27c", "43a", "27d", "18", "01a", "11", "01b"],
    # 14 KNOCKDOWN — low/longer down groan
    "knockdown":  ["41", "46", "16a", "01c", "07"],
    # 15 WIN — smug/victorious medium-long
    "win":        ["26", "45", "59", "20b", "06"],
    # 16 NAMECALL — UNMAPPED (no name-only clip identifiable from unidentified acoustics; slot skips cleanly)
}

order = ["intro", "grab", "snakeSpit", "swordLunge", "swordThrow", "snakeLunge", "tailSweep", "slam",
         "chainFinish", "snakeBarrage", "coil", "ultimate", "transform", "hitLight", "hitHeavy", "knockdown", "win"]

lines = []
lines.append("// orochimaruVoice.js")
lines.append("// ---------------------------------------------------------------------------")
lines.append("// Orochimaru voice-line pools (audio-only; NO gameplay effect). Curated from 59 UNIDENTIFIED")
lines.append("// JAPANESE clips (orochi_line_*.mp3, silence-cut from a source compilation — NO transcript, so")
lines.append("// assignment is BY VIBE only: duration / pitch / brightness / energy via")
lines.append("// tools/analyze_orochimaru_voice.py, the Nezuko/Saitama/Jason precedent). pickOrochimaruVoice(pool)")
lines.append("// returns ONE clip at random; callers play it via sound.playSfxFile(clip, null).")
lines.append("//")
lines.append("// ★ ALL 7 flagged long clips (01,02,16,20,24,27,43, 7–11.5s) had NO usable silence gaps — background")
lines.append("//   music masked the pauses. A music-floor VAD + spectral-flux onset pass (tools/split_orochimaru_long.py)")
lines.append("//   found 2–5 distinct utterances in EACH → every one was SPLIT into <NN><a..> segments; none kept whole.")
lines.append("// ★ NAMECALL: no clip is reliably just his name (unidentified) → the slot is left UNMAPPED (skips cleanly).")
lines.append("// ---------------------------------------------------------------------------")
lines.append("")
lines.append("export const OROCHIMARU_VOICE = {")
labels = {
 "intro":"intro / pre-match","grab":"grab (throw-weapon)","snakeSpit":"Snake Spit (neutral, ranged)",
 "swordLunge":"Kusanagi Sword Lunge (Fwd, melee)","swordThrow":"Kusanagi Sword Throw (Back, ranged)",
 "snakeLunge":"Striking Shadow Snake (air neutral dive)","tailSweep":"Snake-Tail Sweep (Up)",
 "slam":"Slam (Down)","chainFinish":"command-chain finisher","snakeBarrage":"Hidden Shadow Snakes (air Fwd barrage)",
 "coil":"Snake-Form Coil (air Back)","ultimate":"Summon ultimate (longest/most dramatic)",
 "transform":"shed-skin transform","hitLight":"hit reaction — light","hitHeavy":"hit reaction — heavy",
 "knockdown":"knockdown","win":"win pose"}
for p in order:
    lines.append(f"  // ── {labels[p]} ──")
    lines.append(f"  {p}: [")
    for tag in POOLS[p]:
        lines.append(f'    "{fn(tag)}",   // {dur(tag)}s')
    lines.append("  ],")
lines.append("}")
lines.append("")
lines.append("export function pickOrochimaruVoice(pool) {")
lines.append("  const arr = OROCHIMARU_VOICE[pool]")
lines.append("  if (!Array.isArray(arr) || arr.length === 0) return null")
lines.append("  return arr[Math.floor(Math.random() * arr.length)]")
lines.append("}")

open("orochimaruVoice.js", "w").write("\n".join(lines) + "\n")
# coverage report
used = set(t for ts in POOLS.values() for t in ts)
alltags = set(f.split("_")[2] for f in glob.glob("orochi_line_*.mp3")
              if not (f.split("_")[2].isdigit() and int(f.split("_")[2]) in {1,2,16,20,24,27,43}))
print("wrote orochimaruVoice.js")
print(f"pools: {len(POOLS)} | clips assigned: {len(used)} | usable clips: {len(alltags)}")
print("UNUSED (remainders, available as future alts):", sorted(alltags - used))
