# Audio Inventory & Proposed Mapping

Generated 2026-07-21. **Inventory + proposed mapping only — nothing was wired.**

Method: listed every audio file on disk (`find`, root dir — all 52 audio files
live in the repo root), then grep'd every `*.js` file for each exact basename to
determine referenced vs. unreferenced. Suspected duplicates were confirmed
byte-for-byte with `md5`.

---

## TL;DR — the actionable findings

1. **Three referenced music files do NOT exist on disk** and silently fall back
   to procedural themes (via `playMusicFile` `onerror`):
   - `JJK_1.mp3`  (stage *Jujutsu High Courtyard*)
   - `DB_1.mp3`   (stage *Planet Namek*)
   - `DB_2.mp3`   (stage *World Tournament Arena*)

2. **Two real stage-music files exist but are wired to nothing** — the obvious
   fills for the broken slots above:
   - `JJk_3.mp3`  → JJK stage music (note lowercase `k`)
   - `DB_3.mp3`   → Dragonball stage music

   Net effect: the whole **Dragonball** universe currently plays procedural
   fallback even though `DB_3.mp3` is sitting right there, because both Dragonball
   stages point at the nonexistent `DB_1/DB_2`.

3. **`SERIES_MUSIC` null gap (game.js:340-345)** — `dragonball`, `demonslayer`,
   `rickmorty`, `ben10` are all `null`. Only Dragonball has any candidate audio on
   disk (`DB_3.mp3`). **Demon Slayer, Rick & Morty, and Ben 10 have NO music assets
   in the repo at all** — nothing to wire; those need new files sourced.

4. A pile of unreferenced files are **byte-identical raw source copies** of SFX
   that are already wired under clean `snake_case` names — not a gap, just clutter
   (deletion candidates, listed at the bottom).

---

## 1. Referenced-in-code but MISSING on disk (broken refs → procedural fallback)

| Referenced filename | Referenced at | Status |
|---|---|---|
| `JJK_1.mp3` | game.js STAGE_DEFS — *Jujutsu High Courtyard* | **missing** → procedural |
| `DB_1.mp3`  | game.js STAGE_DEFS — *Planet Namek* | **missing** → procedural |
| `DB_2.mp3`  | game.js STAGE_DEFS — *World Tournament Arena* | **missing** → procedural |

---

## 2. Unreferenced files — MUSIC / THEME (real gap, proposed mapping)

| File on disk | Proposed universe / target | Confidence | Notes |
|---|---|---|---|
| `JJk_3.mp3` | **JJK** stage music | High (universe), Med (which stage) | Naming matches the `JJK_n` stage-slot scheme. Natural fill for the missing `JJK_1` slot (*Jujutsu High Courtyard*), or a 3rd JJK track. Lowercase `k` — case-sensitive server, wire the exact name. |
| `DB_3.mp3` | **Dragonball** stage music | High (universe), Med (which stage) | Matches the `DB_n` slot scheme. Fills a missing Dragonball slot (`DB_1` Namek or `DB_2` Tournament), or set `SERIES_MUSIC.dragonball` to it so both DB stages get real music. Short file (~571 KB). |
| `Anime Kei - Bad Situation (Naruto Sad).mp3` | **Naruto** universe (mood/theme) | Low — **AMBIGUOUS** | A Naruto "sad" theme, distinct from the wired `Naruto_fighting_sprit.mp3`. No stage/slot obviously wants a somber track. Could be a KO/results-screen cue or an alt Naruto stage track. **Flagged — decide intent before wiring.** |

---

## 3. Unreferenced files — MENU-MUSIC candidates (all distinct content)

`MENU_PLAYLIST` (sound.js:68) currently holds 6 tracks. These 4 are unreferenced
and menu-music-shaped (song clips, not SFX/voice). All four are byte-distinct
from each other.

| File on disk | Proposed target | Confidence | Notes |
|---|---|---|---|
| `needybounce.mp3` | `MENU_PLAYLIST` addition | Low — **AMBIGUOUS** | 4.2 MB song clip. |
| `needybounce (edited with Audjust).mp3` | `MENU_PLAYLIST` addition | Low — **AMBIGUOUS** | 3.5 MB edit. |
| `needybounce (edited with Audjust) (1).mp3` | `MENU_PLAYLIST` addition | Low — **AMBIGUOUS** | 3.5 MB (same size as above but different bytes — a second edit). |
| `neddy sped up.mp3` | `MENU_PLAYLIST` addition | Low — **AMBIGUOUS** | 2.4 MB sped-up edit. |

**Flagged:** these are 4 variants/edits of what looks like the same source song.
If added, almost certainly pick **one** (plus a display name in `MENU_TRACK_NAMES`),
not all four. Decide which edit before wiring.

---

## 4. Unreferenced files — ALT / SPARE SFX (clean-named, distinct content)

Not duplicates of a wired file — genuinely unused alternate clips.

| File on disk | Nearest wired cousin | Proposed use | Confidence |
|---|---|---|---|
| `naruto_tbb.mp3` | `naruto_ten_tails_bomb.mp3` (wired, kurama.js) — **different bytes** | Alt Tailed-Beast-Bomb SFX; spare. Leave unless the current TBB clip is being replaced. | Med |
| `summoningjitsu.mp3` | `naruto_clone_summon.mp3` (wired, summons.js) — **different bytes** | Alt Naruto summon SFX; spare. | Low — **AMBIGUOUS** |

---

## 5. Unreferenced files — BYTE-IDENTICAL duplicates of already-wired SFX

These are the original human-named source files; each was renamed to a clean
`snake_case` name that IS wired. Confirmed identical via `md5`. **No mapping
needed — already playing in-game under the other name. Deletion candidates.**

| Raw duplicate on disk | Identical to (WIRED) | Wired in |
|---|---|---|
| `Kurama laughing sound effect.mp3` | `kurama_laugh.mp3` | kurama.js |
| `Naruto saying his name [UZUMAKI NARUTO DATTEBAYO!!!!!].mp3` | `naruto_namecall.mp3` | game.js |
| `Rasengan sound effect   Naruto.mp3` | `naruto_rasengan.mp3` | abilities.js |
| `Rasenshuriken sound effect.mp3` | `naruto_rasenshuriken.mp3` | abilities.js |
| `Satoru Gojo Cursed Technique Reversal Red Sound Effect (Dub).mp3` | `gojo_red.mp3` | abilities.js |
| `Gojo Hollow Purple Sound Effect TSB.mp3` | `gojo_hollow_purple.mp3` | abilities.js |
| `Gojo Satoru saying his name for Edit [wo music].mp3` | `gojo_namecall.mp3` | game.js |
| `Shadow Clone Cancelation Sound Effect.mp3` | `naruto_clone_cancel.mp3` | summons.js |
| `Ten-Tails Beast Bomb (Bijuu Bomb)  1080p.mp3` | `naruto_ten_tails_bomb.mp3` | kurama.js |
| `Naruto tail beast bomb.mp3` | `naruto_tbb.mp3` (itself UNWIRED — see §4) | — |
| `ryomen-sukuna-fuga.mp3` | `sukuna_fuga.mp3` | abilities.js |
| `sukuna-slash.mp3` | `sukuna_slash.mp3` | abilities.js |
| `naruto_shadow_clone_summon.mp3` | `naruto_clone_summon.mp3` | summons.js |
| `sukuna gambare gambare (jujutsu kaisen season 2 ep 16).mp3` | `sukuna_namecall.mp3` | game.js |

---

## 6. SERIES_MUSIC null-gap status (game.js:340-345)

| Series | `SERIES_MUSIC` | Stage overrides | Real asset available? | Proposal |
|---|---|---|---|---|
| `jjk` | `JJK-Delirious.mp3` ✓ | `JJK_1` (missing), `JJK_2` ✓ | `JJk_3.mp3` unused | Fix `JJK_1` slot with `JJk_3.mp3` (or re-point). |
| `naruto` | `Naruto_fighting_sprit.mp3` ✓ | `valley_of_the_end_theme.mp3` ✓ | `Anime Kei...Sad` unused | Naruto covered; "Sad" track intent unclear (§2). |
| `dragonball` | **null** | `DB_1`, `DB_2` (both missing) | `DB_3.mp3` unused | Set `SERIES_MUSIC.dragonball = "DB_3.mp3"` and/or fix DB stage slots — **highest-impact fix**. |
| `demonslayer` | **null** | none | **NONE on disk** | Needs a new file sourced (e.g. Mugen Train theme). |
| `rickmorty` | **null** | none | **NONE on disk** | Needs a new file sourced. |
| `ben10` | **null** | none | **NONE on disk** | Needs a new file sourced. |
| `other` | null | none | — | Procedural is fine. |

---

## 7. Full referenced-and-present inventory (for completeness)

All of these exist on disk AND are wired — no action needed.

**Music:** `JJK-Delirious.mp3` (jjk), `Naruto_fighting_sprit.mp3` (naruto),
`JJK_2.mp3` (Shibuya stage), `valley_of_the_end_theme.mp3` (Valley stage),
`Passion_fruitmp3.mp3` (loading/win screens), `Gojo_domain_theme.mp3` &
`Sukuna_Theme.mp3` & `Sukuna_saying_Domain.mp3` (domains.js).
**Menu playlist (6):** `love_nwantiti…Remix_.mp3`, `Future…No_Cap…Audio_.mp3`,
`jhene…stay_ready…instrumental_.mp3`, `Noble_f3mii_Instrumental.mp3`,
`Rema_-_Dumebi.mp3`, `Rochelle_Jordan_-_Lowkey…sped_up__.mp3`.
**Namecalls (5):** `naruto_namecall.mp3`, `gojo_namecall.mp3`,
`sukuna_namecall.mp3`, `rick_intro.mp3`, `goku_black_intro.mp3`.
**Ability/voice SFX:** `gojo_hollow_purple.mp3`, `gojo_red.mp3`,
`naruto_rasengan.mp3`, `naruto_rasenshuriken.mp3`, `naruto_ten_tails_bomb.mp3`,
`naruto_clone_summon.mp3`, `naruto_clone_cancel.mp3`, `kurama_laugh.mp3`,
`sukuna_fuga.mp3`, `sukuna_slash.mp3`, `goku-black-taste-my-blade.mp3`
(gokuBlackSwordCinematic.js).

> Note: `dragon_ball_transformation.mp3` is referenced in sound.js (shared DB
> transform SFX helper) but is **not on disk** — a known phantom ref (see memory
> "Dragon Ball transform SFX"); not counted among the stage-music gaps above.
