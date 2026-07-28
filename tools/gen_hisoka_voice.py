#!/usr/bin/env python3
# Generator: reads the raw transcript (for EXACT on-disk filenames) + the hand-reviewed index→pool map
# below, and emits hisokaVoice.js. Keeping the original tXXmXX timestamp filenames (REVFLASH precedent,
# the reference cited in the brief) → the mapping to content lives in HISOKANEN_VOICE_LOG.md.
import csv

# idx -> filename (col 2 of the TSV), guarantees exact names (no hand-typed typos that silently fail to load).
fn = {}
with open("hisoka_raw_transcript.tsv") as f:
    r = csv.DictReader(f, delimiter="\t")
    for row in r:
        fn[int(row["idx"])] = row["file"]

# Hand-reviewed pool assignments (survivors only). See HISOKANEN_VOICE_LOG.md for per-clip rationale.
POOLS = {
    "intro":      [2, 15, 47, 92, 128, 131, 135],
    "taunt":      [0, 1, 3, 6, 7, 12, 13, 14, 20, 25, 26, 27, 29, 30, 35, 37, 38, 80, 82, 123, 124],
    "bungee":     [58, 59, 60, 61, 62],
    "texture":    [68, 69, 70, 74, 76, 97, 98],
    "overdrive":  [90, 22],
    "rekka":      [88, 66, 93],
    "combatBark": [9, 19, 21, 32, 48, 49, 55, 64, 65, 81, 83, 112, 129],
    "hitReact":   [40, 50, 94, 95, 132],
    "lowHealth":  [51, 54],
    "win":        [18, 34, 75, 84, 96, 111],
}

# Human-readable gloss per pool (a short comment header only — full per-clip content is in the LOG).
HDR = {
    "intro":      "INTRO / pre-fight (match start). No taunt action → intro fires on the intro beat only.",
    "taunt":      "TAUNT — flirty/sadistic one-liners. No `taunt` action → voiced via the connect trigger (see NOTE).",
    "bungee":     "BUNGEE GUM cast (Neutral+Special) — the 5 clean \"Bungee Gum\" technique callouts.",
    "texture":    "TEXTURE SURPRISE cast (Down/Fwd+Special card throws) — magician card-flourish patter.",
    "overdrive":  "BLOODLUST OVERDRIVE cast (Ultimate) — transformation boast.",
    "rekka":      "CARD FLOURISH rekka opener (Down+Heavy) — aggressive turn-taking callouts.",
    "combatBark": "HIT-CONNECT / combat barks (attacker lands a strong / long-string hit).",
    "hitReact":   "HIT-REACTION (defender got hit) — delighted/dismissive.",
    "lowHealth":  "LOW-HEALTH / cornered (once, crossing the line) — Hisoka THRILLED by the danger.",
    "win":        "WIN (match victory) — grade/dismiss/flirt sign-off.",
}
ORDER = ["intro", "taunt", "bungee", "texture", "overdrive", "rekka", "combatBark", "hitReact", "lowHealth", "win"]

def arr(idxs):
    items = ['"%s"' % fn[i] for i in idxs]
    lines, cur = [], "    "
    for it in items:
        add = it + ", "
        if len(cur) + len(add) > 108:
            lines.append(cur.rstrip()); cur = "    "
        cur += add
    if cur.strip():
        lines.append(cur.rstrip())
    return "\n".join(lines)

out = []
out.append('''// hisokaVoice.js
// ---------------------------------------------------------------------------
// Hisoka Morrow voice-line pools (audio-only; NO gameplay effect). 136 source clips → 71 wired,
// Japanese audio from "Nen Impact" (hisokanen_* — kept intentionally, NOT translated/swapped).
// Filenames keep their original tXXmXX timestamp (REVFLASH precedent); the content map is
// HISOKANEN_VOICE_LOG.md. Every entry is an on-disk mp3 filename (exact case).
//
// pickHisokaVoice(pool) returns ONE clip at random — genuine Math.random() selection, same
// shared-helper shape as pickGonVoice / pickKilluaVoice. Callers play via sound.playSfxFile(clip,
// null) — a fresh Audio per call so a voice line overlaps the technique SFX (project convention).
//
// -- TRIGGER MAP (where each pool fires) --
//   intro      -> game.js INTRO_VOICE (round-1 match intro)
//   taunt      -> combat.js applyHisokaOffenseVoice (mixed into connect; no taunt action, see NOTE)
//   bungee     -> abilities.js fireHisokaBungeeGum      (Neutral+Special: Bungee Gum whip)
//   texture    -> abilities.js fireHisokaCardSingle (Down+Special) + fireHisokaCardRapid (Fwd+Special)
//   overdrive  -> abilities.js executeHisokaUltimate    (Bloodlust Overdrive activation)
//   rekka      -> abilities.js fireHisokaCommand         (Down+Heavy "Card Flourish" rekka opener)
//   combatBark -> combat.js applyHisokaOffenseVoice      (attacker lands a strong/long-string hit)
//   hitReact   -> combat.js applyHisokaHitVoice          (defender got hit)
//   lowHealth  -> combat.js applyHisokaLowHealthVoice    (once, crossing the low-HP line)
//   win        -> game.js _checkMatchOver                (winner = Hisoka)
//
// NOTE — TAUNT has no dedicated trigger: Hisoka has no `taunt` action, and enrolling him in the
//   universal hold-Down heal-taunt would change gameplay (excluded — this pass is audio only). So the
//   taunt one-liners ride the attacker-connect trigger alongside combatBark (the Killua/Gon precedent:
//   a connect can pull from a taunt pool). Flagged for review if a real taunt mechanic is ever added.
// ---------------------------------------------------------------------------

export const HISOKA_VOICE = {''')

for i, name in enumerate(ORDER):
    out.append("  // -- %s --" % HDR[name])
    out.append("  %s: [" % name)
    out.append(arr(POOLS[name]))
    out.append("  ]," + ("" if i == len(ORDER) - 1 else ""))
out.append("}")
out.append('''
export function pickHisokaVoice(pool) {
  const arr = HISOKA_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}''')

with open("hisokaVoice.js", "w") as f:
    f.write("\n".join(out) + "\n")

total = sum(len(v) for v in POOLS.values())
print("wired", total, "clips across", len(POOLS), "pools")
for name in ORDER:
    print("  %-11s %2d" % (name, len(POOLS[name])), [fn[i] for i in POOLS[name]][:2], "...")
