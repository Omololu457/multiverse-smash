# MSV1-EDO — Phase 0 audit

Start commit: `eb24611ede50b6a2499c49c9e67b463cdadcf7a3` (docs/msv1/edo/START_COMMIT.txt). Baseline: docs/msv1/edo/BASELINE.txt.

## 1. How a skin is defined and how it swaps the art

* **Definition** — `skins.js` → `SKINS[rosterKey] = [ { id, name, unlockLevel, portrait, spriteScale, animationData, recolorTag? } ]`.
  `getSkins / getSkin / getSkinAnimationData` read it. A missing list falls back to one virtual `default` entry.
* **Recolour skins** (the pattern Edo uses) — the art is real, pre-generated sheets named `<sheet>__<tag>.png` beside the
  default sheet. `recolorSkinAnim(key, tag)` = the character's own `animationData` with every `sheet` path retagged (same
  frames, sizes, timing, anchors — a pure path swap). `recolorPortrait(key, tag)` = `<portrait>__<tag>.png`.
* **Applying it** — `game.js applySkin(fighter, skinId)` (the ONE choke point for every fighter-creation path):
  `fighter._skinAnim = skin.animationData`, `fighter._recolorTag = skin.recolorTag`, `fighter._baseSkinAnim = _skinAnim`.
  `sprite.js` draws `_skinAnim[action]` when present, else the character's `animationData`.
* **Forms / transformations** — every form swap goes through `abilities.js retagFormAnim(FORM_ANIM, fighter._recolorTag)`
  (Vegeta SSJ/Blue, Goku ladder, Gohan, Boruto Karma, Zaraki Shikai, Maki, Hisoka, Rose, the generic profile path…), so a
  recolour tag follows the fighter into its forms automatically when `<form sheet>__<tag>.png` exists. Ben 10 aliens use
  `fighters.js _retagAlienAnim` (gated to tags that have alien art).
* **Sheet loading** — `sprite.js _loadSheet(path)` caches one `Image` per path (cache-busted with `__ASSET_V`). It had NO
  error fallback: a missing tagged sheet would draw nothing → MSV1-EDO adds the smallest fix: `x__edo.png` 404 → reload
  `x.png` in the same cached Image (render-only, logged once per sheet).

## 2. Selector / in-match / LAN / replay / companion

| path | how the skin travels | Edo needs |
|---|---|---|
| selector | `getSkins(key)` list → `matchConfig.p1Skin / p2Skin` (skin id string) | nothing — the entry is in the list |
| in-match | `applySkin(p1, matchConfig.p1Skin)` (game.js ~5496) | nothing |
| LAN host / join + companion screen | the match-config snapshot carries `p1Skin / p2Skin` ids (game.js ~4908) and the peer re-runs `applySkin` | nothing — same id resolves to the same entry on both sides |
| replay | `replay.js` meta `{ seed, p1Char, p1Skin, p2Char, p2Skin, … }` | nothing |
| sim / determinism | skins are render-only: `_skinAnim` is a sheet-path retag (identical frame counts / speeds), `_recolorTag` is read only by art selection and the blood render layer | — |

## 3. Roster + eligibility (114 playable characters with sprites)

Classes (tools/edoskin/eligibility.json is the source of truth; reasons are in the LEDGER):

* **TOBIRAMA** (1): `tobirama` — the summoner, no Edo skin.
* **ALREADY-EDO** (1): `madara` — already the reanimated body (the blood system already gives him `crack:edo`).
* **NON-HUMAN / SAND / ENERGY** (4): `beerus` (cat god), `vilgax` (alien), `arlong` (fish-man), `naruto` (default art is the
  Nine-Tails chakra-mode energy body). Every Ben 10 / Albedo **alien form** sheet is non-human → never recoloured (Ben's Edo
  skin covers his human sheets only; aliens fall back to their default art).
* **MASKED / ARMOURED / ROBOT** (26): every Power Ranger (`omega_ranger samurai_red_ranger gold_samurai_ranger
  green_samurai_ranger red_ranger_mmpr spd_red spd_blue spd_green spd_pink spd_yellow mmpr_pink mmpr_black mmpr_white
  green_ranger ninja_storm_cgpt windrangers ninja_storm_rangers`), `flash batman ghostface jason krybot cyborg genos tobi
  spiderman` — material treatment (suit / plating desaturated) + sparse cracks on the plating, no skin ramp.
* **HUMAN** (82): everyone else.
* **Excluded for engine reasons** (logged, no Edo skin): `albedo` (his identity IS a recolour tag of Ben's art — an Edo tag would
  turn him back into Ben) and `ghostface` (no base identity: applySkin forces one of 5 killer identities, so any other skin id
  is replaced; adding a list would change his selector).

Form sheets: the per-character sheet list comes from `tools/bloodmap/enumerate.mjs` (characters.js anim tables + every
module-exported form anim, assigned by asset directory) — ~4,200 default + form sheets in total; skin sheets and other
characters' recolours are never inputs. Counts per character: LEDGER.md.

## 4. Tobirama's ultimate (Edo Tensei)

* `abilities.js executeTobiramaUltimate` → `applyEdoTensei(fighter, vesselKey, worldWidth)`. The vessel is
  `fighter._edoBackup` (game.js `assignEdoBackup` / `getEdoBackupRoster()` = sprite roster minus Tobirama) and the active one is
  recorded as **`fighter._edoVessel = vesselKey`** → the summoned character IS identifiable (no STOP).
* It body-swaps TOBIRAMA's own fighter object (`EDO_SWAP_FIELDS`: rosterKey, animationData, kit …), stashes his skin state and
  restores it in `revertEdoTensei`. The opponent's fighter object is never touched.
* Today's look: a live `ctx.filter` (`sprite.js EDO_REANIM_TINT`) + a procedural seam overlay (`game.js drawEdoReanimOverlay`),
  both gated on `fighter._edoActive`. The blood layer (`battleBlood.js`) already maps `_edoActive` → `crack:edo` (cracks and
  flakes, no blood) — **the "cracks, no blood" behaviour exists**.

## 5. Per-instance skins

The skin state lives ON the fighter object (`_skinAnim`, `_recolorTag`), so it is per instance by construction: setting it on
Tobirama's fighter during Edo Tensei can never change an opponent playing the same character. Smallest render-only change
(Phase 3): in `applyEdoTensei`, when the vessel has a premade Edo skin, set `_skinAnim / _baseSkinAnim / _recolorTag` from it
and flag `_edoSkinned`; the live tint + overlay skip `_edoSkinned` fighters; `revertEdoTensei` clears the flag (the stash
already restores Tobirama's own skin). Ineligible vessels keep today's tint.
