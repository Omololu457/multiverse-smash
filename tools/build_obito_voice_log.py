#!/usr/bin/env python3
# Curate obito_raw_transcript.tsv → OBITO_VOICE_LOG.md + populate obitoVoice.js pools.
# Hand-reviewed assignments (each clip wired to at most ONE pool). Everything not WIRED and not in an
# explicit discard set is discarded as a fragment / near-duplicate / low-value line.
import re

# idx → pool. Matched to Obito's ACTUAL built kit (see §match in the log).
WIRED = {
 "kamuiActivate": [1, 18, 5],                         # Kamui intangibility ON (its own pool) — 001 "カムイ!"
 "kamuiWarp":     [7, 13, 19, 23, 31, 16],            # Kamui space-time: self-portal / teleport-grab / teleport-behind ("I'll take you / send you away")
 "special":       [3, 87, 97, 84, 144, 191],          # ranged throws (shuriken / rod / giant shuriken) — generic combat cast
 "juubi":         [131, 129, 83, 82, 68, 8, 38],      # Ten-Tails / Juubi Bijūdama ULT — 131 Juubi's time · 083/129 Six-Paths power
 "intro":         [164, 48, 49, 109, 33, 24, 26, 112],# self-declaration — 164 "I threw away Uchiha Obito"
 "taunt":         [17, 71, 79, 169, 172, 121, 128, 142, 25],
 "combatBark":    [96, 86, 85, 146, 152, 94, 104],
 "hitReact":      [90, 91, 106, 147, 148, 88, 171, 170, 56],
 "lowHealth":     [55, 57, 76, 93],
 "win":           [15, 77, 12, 156, 44, 43],
}
POOL_ORDER = list(WIRED)
POOL_DESC = {
 "intro":"INTRO / self-declaration (fires on the intro beat; combined with taunt in game.js)",
 "taunt":"TAUNT (mid-fight jeers; folded into the intro pool)",
 "combatBark":"COMBAT BARK (offense on a heavy / long-string connect — combat.js)",
 "hitReact":"HIT REACTION (taking damage — combat.js)",
 "lowHealth":"LOW HEALTH (once, crossing the ≤25% line — combat.js)",
 "win":"WIN LINE (victory — game.js)",
 "kamuiActivate":"★ KAMUI INTANGIBILITY ACTIVATION (toggleObitoKamui — abilities.js; ON only, silent off)",
 "kamuiWarp":"★ KAMUI WARP — self-portal / teleport-grab / teleport-behind (abilities.js)",
 "special":"SPECIAL CAST — shuriken / rod / giant-shuriken throws (abilities.js)",
 "juubi":"★ JUUBI / TEN-TAILS ULTIMATE — Bijūdama (executeObitoUltimate — abilities.js)",
}
DISCARD_NAMED = {0,80,81,89,118,119,122,127,132,134,177,178,179,180,181,182,183,184,185,187,188,190}
DISCARD_NONSPEECH = {98,101,103,167}

rows = {}
for ln in open("obito_raw_transcript.tsv"):
    p = ln.rstrip("\n").split("\t")
    if len(p) < 7 or not p[0].isdigit(): continue
    rows[int(p[0])] = (p[1], float(p[2]), p[5], p[6])   # file, dur, ja, en

idx2pool = {i: pool for pool, ids in WIRED.items() for i in ids}
wired_ids = set(idx2pool)

# ── obitoVoice.js ──
def fname(i): return rows[i][0]
def comment(i):
    _, dur, ja, en = rows[i]
    return f"{i:03d} {ja[:26]} — {en[:44]}".replace('"', "'")
js = ['// obitoVoice.js',
 '// ---------------------------------------------------------------------------',
 '// Obito Uchiha voice-line pools (audio-only; NO gameplay effect). Curated from the 192-clip JAPANESE',
 '// set (obito_voice_*, Storm Connections source) transcribed in OBITO_VOICE_LOG.md (native-JA pass +',
 '// English gloss). Named-character lines (Kakashi/Rin/Naruto/Jiraiya/Minato/Kushina), non-speech, and',
 '// near-duplicates were discarded. pickObitoVoice(pool) returns ONE clip at random (same shape as',
 '// pickMadaraVoice); callers play via sound.playSfxFile(clip, null). Single-voice-channel via _voiceOwner.',
 '//',
 '// Per-technique cast pools matched to his ACTUAL built kit (see OBITO_VOICE_LOG.md §match):',
 '//   kamuiActivate — Kamui INTANGIBILITY activation (toggleObitoKamui) — its own pool per spec.',
 '//   kamuiWarp     — Kamui space-time: self-portal / teleport-grab / teleport-behind.',
 '//   special       — the ranged throws (shuriken / rod / giant shuriken).',
 '//   juubi         — the Ten-Tails / Juubi Bijūdama ULTIMATE (executeObitoUltimate).',
 '// ---------------------------------------------------------------------------',
 '',
 'export const OBITO_VOICE = {']
for pool in POOL_ORDER:
    js.append(f'  // ── {POOL_DESC[pool]} ──')
    js.append(f'  {pool}: [')
    for i in WIRED[pool]:
        js.append(f'    "{fname(i)}",   // {comment(i)}')
    js.append('  ],')
js += ['}', '',
 'export function pickObitoVoice(pool) {',
 '  const arr = OBITO_VOICE[pool]',
 '  if (!Array.isArray(arr) || arr.length === 0) return null',
 '  return arr[Math.floor(Math.random() * arr.length)]',
 '}', '']
open("obitoVoice.js", "w").write("\n".join(js))

# ── OBITO_VOICE_LOG.md ──
md = ['# Obito Uchiha — Voice Line Log',
 '',
 'Source: **192** clips `obito_voice_*.mp3` (Japanese, Storm Connections rip). Transcribed via',
 '`tools/transcribe_obito.py` (faster-whisper `small`, 2-pass: native-JA + English gloss) → `obito_raw_transcript.tsv`.',
 f'**Wired: {len(wired_ids)}**  ·  **Discarded: {192-len(wired_ids)}** (named-character {len(DISCARD_NAMED)} · non-speech {len(DISCARD_NONSPEECH)} · '
 f'{192-len(wired_ids)-len(DISCARD_NAMED)-len(DISCARD_NONSPEECH)} fragments/near-duplicates/low-value).',
 '',
 'Audio-only — ZERO gameplay effect. Filenames preserved exactly. Playback via `sound.playSfxFile(clip, null)`,',
 'single-voice-channel gated by `sound._voiceOwner` + the shared `_atkVoiceCd`/`_hitVoiceCd` cooldowns.',
 '',
 '## §match — technique-callout mapping (cross-referenced against his BUILT kit)',
 '',
 '| Callout found | Clips | Wired to (built move) |',
 '|---|---|---|',
 '| **Kamui** 神威/カムイ | 001 "やるぞ! カムイ!" | `kamuiActivate` (Kamui Intangibility toggle) + the space-time "I\'ll take/send you" lines → `kamuiWarp` (self-portal / teleport-grab / teleport-behind) |',
 '| **Ten-Tails / Juubi / Six-Paths** 十尾・陸道 | 131 "ジュウリンの時間だ" (Juubi\'s time) · 083 "これが陸道の力だ!" · 129 (gained Six-Paths power) · 082 (this power) | `juubi` (Ten-Tails Bijūdama ULTIMATE) |',
 '| **Mokuton** 木遁 | — none in the set — | (his Mokuton is Juubi-cinematic FX only; no dedicated callout found, so none wired) |',
 '',
 'The Kamui + Juubi/Six-Paths matches are the direct wins (same as Chrollo "Skill Hunter" / Gold Ranger "switch").',
 'No line references Mokuton, so no Mokuton pool exists (correctly reported, not fabricated).',
 '',
 '## Pools (wired)',
 '']
for pool in POOL_ORDER:
    md.append(f'### `{pool}` — {POOL_DESC[pool]}')
    for i in WIRED[pool]:
        _, dur, ja, en = rows[i]
        md.append(f'- `{fname(i)}` — {ja}  *( {en} )*')
    md.append('')
md += ['## Full transcript (all 192 — disposition)', '',
 '| # | dur | JA | EN gloss | disposition |', '|---|---|---|---|---|']
for i in range(192):
    if i not in rows:
        md.append(f'| {i:03d} | — | — | — | (missing) |'); continue
    _, dur, ja, en = rows[i]
    if i in idx2pool: disp = f"→ **{idx2pool[i]}**"
    elif i in DISCARD_NAMED: disp = "discard: names another character"
    elif i in DISCARD_NONSPEECH: disp = "discard: non-speech"
    else: disp = "discard: fragment / near-dup"
    ja_s = (ja[:38] or "—").replace("|", "/")
    en_s = (en[:52] or "—").replace("|", "/")
    md.append(f'| {i:03d} | {dur:.1f} | {ja_s} | {en_s} | {disp} |')
md.append('')
open("OBITO_VOICE_LOG.md", "w").write("\n".join(md))
print(f"wired {len(wired_ids)} / discarded {192-len(wired_ids)}  → obitoVoice.js + OBITO_VOICE_LOG.md")
