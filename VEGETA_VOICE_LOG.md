# Vegeta Voice Line Transcription Log

**Source:** 48 FighterZ voice clips — 26 `vegeta_ssj_*` (Super Saiyan source) + 22 `vegeta_blue_*`
(SSGSS/Blue source). Filenames encode only a timestamp, no content labels.

**Pipeline:** `faster-whisper` `base.en` model + VAD filter (`min_silence_duration_ms=300`, `beam_size=5`,
`language=en`) — the same transcription + hand-review pipeline used on Reverse Flash / Batman / Omni-Man /
Minato / Hisoka / Superman. Script: `tools/transcribe_vegeta.py`.

**Wiring principle (per brief):** survivors from BOTH sources are merged into **shared, form-agnostic
pools** that apply across ALL of Vegeta's forms (base / SSJ / Blue). A line is form-gated ONLY if it names
a technique/power-level unique to one form — **no surviving line does** (the one form-ish line, blue_019
"legendary Super Saiyan…", was discarded for naming Kakarot). So every pool below is shared across all forms.

**Result:** 33 kept, **15 discarded** (named-character refs / noise / garble / non-lexical grunts).

---

## SUPER SAIYAN source (`vegeta_ssj_*`, 26 clips)

| File | Dur | Transcription | Decision | Pool |
|---|---|---|---|---|
| ssj_000 | 2.38s | "Ugh, ridiculous!" | ✅ keep | hitReact |
| ssj_001 | 1.95s | "Damn you!" | ✅ keep | hitReact |
| ssj_002 | 1.15s | "Damn you!" | ✅ keep | hitReact |
| ssj_003 | 2.93s | "I hope you're ready, Big Bang Attack!" | ✅ keep (own technique) | **bigBang** cast |
| ssj_004 | 5.05s | "Are you brave enough to take this one? Final Flash!" | ✅ keep (own technique) | **ultimate** cast |
| ssj_005 | 4.37s | "You cocky bastard, final blast!" | ✅ keep (Final-Flash-family) | **finalFlash** cast |
| ssj_006 | 4.70s | "Move it, you fool! Give me that! Time to switch! Make sure I get to have some fun!" | ❌ discard | — (jumbled multi-phrase; "Time to switch" = FighterZ tag-assist callout, no equivalent here) |
| ssj_007 | 1.28s | "You half-wits, huh?" | ✅ keep | combatBark |
| ssj_008 | 4.86s | "That's it, huh? Looks like someone's been slacking off on their training! Impudent fool!" | ✅ keep | intro |
| ssj_009 | 2.53s | "Where does all that speed and power come from?" | ✅ keep (being overpowered) | lowHealth |
| ssj_010 | 1.90s | "I know how to dispose of you!" | ✅ keep | combatBark |
| ssj_011 | 1.48s | "I won't lose to you!" | ✅ keep | combatBark |
| ssj_012 | 1.48s | "I won't lose to you!" (take 2) | ✅ keep | combatBark |
| ssj_013 | 1.48s | "I won't lose to you!" (take 3) | ✅ keep | combatBark |
| ssj_014 | 1.48s | "I won't lose to you!" (take 4) | ✅ keep | combatBark |
| ssj_015 | 1.48s | "I won't lose to you!" (take 5) | ✅ keep | combatBark |
| ssj_016 | 1.48s | "I won't lose to you!" (take 6) | ✅ keep | combatBark |
| ssj_017 | 1.47s | "I won't lose to you!" (take 7) | ✅ keep | combatBark |
| ssj_018 | 2.09s | "…pathetic Nappa" | ❌ discard | — (names **Nappa**; also garbled) |
| ssj_019 | 0.98s | "Wiggling." | ❌ discard | — (noise fragment) |
| ssj_020 | 2.70s | "If you're so tough, then survive this!" | ✅ keep | combatBark |
| ssj_021 | 5.27s | "I won't take it easy on you just because you're a woman… I have the power too." | ❌ discard | — (opponent-gender-specific + garbled midsection) |
| ssj_022 | 2.57s | "Show me this power of yours! Don't make me laugh!" | ✅ keep | intro |
| ssj_023 | 6.04s | "You were always a simpleton… That was a feeble effort." | ✅ keep | win |
| ssj_024 | 2.39s | "…the old outfit, Vegeta!" | ❌ discard | — (garbled/unintelligible opener) |
| ssj_025 | 3.36s | "I have a bad feeling about this! What's going on, Goku?" | ❌ discard | — (names **Goku**) |

## SSGSS / BLUE source (`vegeta_blue_*`, 22 clips)

| File | Dur | Transcription | Decision | Pool |
|---|---|---|---|---|
| blue_000 | 4.60s | "Impossible! Gah!" | ✅ keep | lowHealth |
| blue_001 | 1.49s | "Damn you!" | ✅ keep | hitReact |
| blue_002 | 1.69s | "Yeah!" | ❌ discard | — (non-lexical grunt) |
| blue_003 | 1.33s | "Take this!" | ✅ keep | **galickGun** cast |
| blue_004 | 1.61s | "Yeah!" | ❌ discard | — (non-lexical grunt) |
| blue_005 | 2.71s | "You're as good as space dust!" | ✅ keep | combatBark |
| blue_006 | 2.84s | "Bono bono bono" | ❌ discard | — (noise/garble) |
| blue_007 | 1.59s | "You're hizering!" | ❌ discard | — (garble) |
| blue_008 | 3.56s | "Why you, you worthless piece of junk!" | ✅ keep | combatBark |
| blue_009 | 5.31s | "Remember it well. This isn't even the full extent of my power. Try and surpass me if you can." | ✅ keep | win |
| blue_010 | 3.59s | "It won't be easy. Don't expect to get a thanks from me." | ✅ keep | win |
| blue_011 | 5.72s | "This battle has only made me stronger. Don't ever forget that pain. Let's go, Kakarot!" | ❌ discard | — (names **Kakarot**) |
| blue_012 | 5.03s | "I've never felt power this… before! Damn you immortal freak!" | ❌ discard | — (garbled + opponent-specific "immortal freak") |
| blue_013 | 2.93s | "You're nothing but a warm-up for us Saiyans… that body!" | ❌ discard | — (garbled tail, unintelligible) |
| blue_014 | 2.12s | "Don't underestimate a Saiyan!" | ✅ keep (race, not a form/name) | combatBark |
| blue_015 | 3.07s | "Eat this! …gone!" | ✅ keep (energetic beam callout, likely Galick Gun) | **galickGun** cast |
| blue_016 | 3.70s | "…what it means to fight to protect something!" | ✅ keep | combatBark |
| blue_017 | 1.98s | "Lord Beerus, brace yourself!" | ❌ discard | — (names **Beerus**) |
| blue_018 | 3.38s | "I'm going to have fun destroying you! I have the power too!" | ✅ keep | intro |
| blue_019 | 4.33s | "To go beyond the legendary Super Saiyan, if I can beat Kakarot!" | ❌ discard | — (names **Kakarot**) |
| blue_020 | 1.36s | "It's because you're a fake!" | ✅ keep | combatBark |
| blue_021 | 4.50s | "And I am Vegeta, Prince of the Saiyans!" | ✅ keep (iconic self-intro) | intro |

---

## Discard summary (15)

- **Named specific characters (7):** ssj_018 (Nappa), ssj_025 (Goku), blue_011 (Kakarot),
  blue_017 (Beerus), blue_019 (Kakarot) — plus blue_012 ("immortal freak" opponent-specific) and
  ssj_021 (gender-specific-to-opponent) counted here as contextually opponent-locked.
- **Non-lexical grunts (2):** blue_002, blue_004 ("Yeah!").
- **Noise / garble / unintelligible (6):** ssj_006 (jumbled tag-switch multi-phrase), ssj_019
  ("Wiggling"), ssj_024 (garbled), blue_006 ("bono bono"), blue_007 ("you're hizering"),
  blue_013 (garbled tail).

## Final pool structure — ALL shared across base / SSJ / Blue (form-agnostic)

| Pool | Trigger | Clips | n |
|---|---|---|---|
| `intro` | match start (game.js INTRO_VOICE) | ssj_008, ssj_022, blue_018, blue_021 | 4 |
| `win` | round win (game.js winner block) | ssj_023, blue_009, blue_010 | 3 |
| `combatBark` | offense heavy / long-string connect (combat.js) | ssj_007, ssj_010, ssj_011-017 (×7), ssj_020, blue_005, blue_008, blue_014, blue_016, blue_020 | 15 |
| `hitReact` | defender takes a hit (combat.js) | ssj_000, ssj_001, ssj_002, blue_001 | 4 |
| `lowHealth` | crossing the low-HP line, once (combat.js) | ssj_009, blue_000 | 2 |
| `galickGun` | Galick Gun special cast (D→F) | blue_003, blue_015 | 2 |
| `bigBang` | Big Bang Attack special cast (neutral) | ssj_003 | 1 |
| `finalFlash` | Final Flash special cast (D→B) | ssj_005 | 1 |
| `ultimate` | Overcharged Final Flash ultimate cast | ssj_004 | 1 |

**Form-gated pools: NONE** — no surviving line names a form-unique technique (per brief, the exception
did not trigger). Vegeta's signature techniques (Galick Gun / Big Bang / Final Flash) exist in all three
forms, so their cast pools are shared too. `taunt` has no dedicated home (Vegeta has no `taunt` action) —
its trash-talk lines are folded into `combatBark` (offense-connect), matching the Batman/Superman/Rengoku
precedent.
