#!/usr/bin/env python3
# Emit spidermanVoice.js from the classification. Curated small trigger pools (clip numbers hand-picked
# after reading transcripts) + the big generic-banter `quip` pool (taunt_quip minus flagged clips). Flagged
# cut-mid-line / hallucination clips are BANKED (listed, not wired). Filenames verified to exist on disk.
import json, os
C = json.load(open("/tmp/spidey_classified.json")); T = C["by_file"]
def fn(n): return f"spiderman_mr_{n:03d}.mp3"
def txt(n): return T[fn(n)]["text"].strip()

# ── curated small pools (clip numbers) ──
POOLS = {
  # pre-match greetings + declarations
  "intro":     [2,4,33,44,62,85,213,263,267,334,385,430],
  # short wordless ATTACK grunts (tail cluster) → light-normal effort
  "effort":    [457,458,461,464,465,468,469,471,472,473,153,353],
  # takes a LIGHT hit — short pain grunt (Ugh/Oh)
  "hitLight":  [460,462,466,474,476,477,478,479],
  # takes a STRONG hit — louder pained line
  "hitHeavy":  [236,367,133,360],
  # knocked down — the falling scream
  "knockdown": [463,467,470,475],
  # web-special CAST callouts (Web Impact / Web Throw) — genuine web-action lines
  "webCast":   [134,94,261,427,28,121,201],
  # Maximum Web ULTIMATE — dramatic web-unload lines
  "ultimate":  [81,248,399],
  # victory / win
  "victory":   [43,74,137,298,348,377,399,415,455],
}
# exclude from the big quip pool: everything already pooled + flagged-cut + hallucination + junk fragments
flagged_cut  = sorted({n for n,_,_ in C["flag_cut"]})
flagged_hall = sorted({n for n,_,_ in C["flag_halluc"]})
junk = {100,275,459,395,58,231,319,18,130}   # fragments/UI-numbers seen in review
pooled = {n for v in POOLS.values() for n in v}
exclude = pooled | set(flagged_cut) | set(flagged_hall) | junk

def clipnum(f): return int(f.split("_")[-1].split(".")[0])
quip = [clipnum(f) for f in C["buckets"]["taunt_quip"]]
quip = [n for n in quip if n not in exclude]
POOLS_ORDER = ["intro","quip","effort","hitLight","hitHeavy","knockdown","webCast","ultimate","victory"]
POOLS["quip"] = sorted(quip)

# verify all referenced clips exist on disk
missing = [fn(n) for v in POOLS.values() for n in v if not os.path.exists(fn(n))]
assert not missing, f"MISSING FILES: {missing[:5]}"

def emit_pool(name, nums, per_line=6, with_text=True):
    lines = [f"  {name}: ["]
    if with_text and len(nums) <= 30:
        for n in nums:
            lines.append(f'    "{fn(n)}",'.ljust(34) + f"// {txt(n)[:52]}")
    else:  # big pool: compact, N per line, no inline text
        for i in range(0, len(nums), per_line):
            chunk = nums[i:i+per_line]
            lines.append("    " + " ".join(f'"{fn(n)}",' for n in chunk))
    lines.append("  ],")
    return "\n".join(lines)

HEADER = f'''// spidermanVoice.js
// ---------------------------------------------------------------------------
// Spider-Man (Marvel Rivals "Voice Lines & Efforts" pack) voice pools (audio-only; NO gameplay effect).
// 479 clips (spiderman_mr_001..479.mp3), silence-split from one 16:43 source. CLASSIFIED BY REAL CONTENT:
// every clip was transcribed with faster_whisper (tools/transcribe_spiderman_voice.py) and bucketed by
// what is actually said (tools/classify_spiderman_voice.py), NOT by filename/duration. The set splits
// ~456 spoken LINES (clips 1-456) + a wordless EFFORT/grunt cluster (clips ~457-479) — matching the
// "Voice Lines & Efforts" source name.
//
// pickSpidermanVoice(pool) -> ONE clip at random; callers play it via sound.playSfxFile(clip, null).
//
// ── TRIGGER MAP (hooks in game.js / combat.js / abilities.js) ──
//   intro      -> pre-match reveal beat                     game.js INTRO_VOICE table
//   quip       -> lands a STRONG/long-string hit + on TAUNT combat.applySpidermanOffenseVoice + game.js taunt-commit
//   effort     -> LIGHT-normal strike grunt (cooldown)      combat.applySpidermanAttackVoice
//   hitLight   -> takes a LIGHT hit — short pain grunt       combat.applySpidermanHitVoice
//   hitHeavy   -> takes a STRONG hit — louder pained line    combat.applySpidermanHitVoice
//   knockdown  -> knocked down — the falling scream          combat.js knockdown watcher
//   webCast    -> Web Impact / Web Throw special casts       abilities.fireSpidermanWebImpact/WebThrow
//   ultimate   -> "Maximum Web" ultimate                     abilities.executeSpidermanUltimate
//   victory    -> win                                        game.js win dispatch
//
// ── CHATTY DESIGN ── Spider-Man is canonically talkative, so the huge generic-banter `quip` pool (the
// bulk of the spoken lines) rides the STRONG-connect trigger (Batman/Gon precedent) + the taunt action,
// gated by a long _atkVoiceCd so it is occasional flavor, not spam. The short EFFORT grunts ride the fast
// light-normal trigger separately.
//
// ── FLAGGED / BANKED (NOT wired — Step 4 honesty) ──
//   * {len(flagged_cut)} clips flagged POSSIBLE CUT-MID-LINE (silence-split severed a continuous sentence —
//     most START with a conjunction "because/and/but/or…"): {flagged_cut}
//   * {len(flagged_hall)} clips flagged whisper HALLUCINATION/run-on (esp. clip 12 = 6 sentences in 0.64s): {flagged_hall}
//   * These + a few UI-number/one-word fragments are EXCLUDED from active pools (usable after a manual re-listen/re-split).
//   * Marvel-Rivals TEAM-SHOOTER context lines (healing/objectives/teammates) that survived into `quip`
//     read as generic Spidey banter in 1v1 — kept (a quip is a quip), flagged here for awareness.
// ---------------------------------------------------------------------------

export const SPIDERMAN_VOICE = {{'''

body = "\n".join(emit_pool(name, POOLS[name], with_text=(name!="quip")) for name in POOLS_ORDER)
FOOTER = '''}

// One random clip from a pool (empty-safe). Callers: sound.playSfxFile(clip, null).
export function pickSpidermanVoice(pool) {
  const a = SPIDERMAN_VOICE[pool]
  if (!a || !a.length) return null
  return a[Math.floor(Math.random() * a.length)]
}
'''
open("spidermanVoice.js","w").write(HEADER + "\n" + body + "\n" + FOOTER)
total = sum(len(v) for v in POOLS.values())
print("POOL SIZES:")
for k in POOLS_ORDER: print(f"  {k:10s}: {len(POOLS[k])}")
print(f"\n  wired total: {total}  (of 479)")
print(f"  banked/flagged-out: cut={len(flagged_cut)} halluc={len(flagged_hall)} junk={len([n for n in junk])}")
print("wrote spidermanVoice.js")
