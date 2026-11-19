# Albedo skin themes — Phase 0 audit (2026-11-18, read-only, branch `feat/albedo-skin-themes` from origin/main `894d16a8b`)

## Albedo's real registration
- **Roster key** `albedo` (`characters.js` `const albedo`, `isAlbedo: true`, `deviceType: "ultimatrix"`). Human art = Ben's
  human animation table with every sheet retagged `…__albedo.png`.
- **Appearances (preserved exactly):**
  - **older** = skin id `default` (Alien Force art, `ben10_<action>_uniform__albedo.png`, variant `alienforce`, HP 950).
  - **kid** = skin id `ben10Classic` (Classic art, `ben10_<action>_uniform__classic__albedo.png`, variant `classic`, HP 900).
  - `ben10Prime` (experimental / pending art: renders the older frames) is a third variant. It is not one of the two
    appearances and is left alone.
- **Gameplay keyed on the skin id:** `fighters.js applyBen10VariantStats(fighter, skinId)` maps the skin id to the variant
  numbers. `fighter._benVariant` then drives normals, HUD and VO. Nothing else reads the skin id.
- **Transformation list:** identical to Ben's registry: the 24 READY aliens (`aliens.js` / `BEN10_ALIEN_POOL`, PICK FIVE
  loadout). Albedo has no own-only alien entries.
  - **Temporary / alternate forms:** the alternate frame tables each form swaps to at runtime: Heatblast Blue Flame, Megawhatt
    Drained, Brainstorm dome, Diamondhead Prismatic, Upgrade Overclock, Humongousaur size tiers, Ripjaws land/water.
  - **Ultimate:** Ultimatrix Overload is the active alien's ultimate. No separate "ultimate alien" (e.g. Ultimate Echo Echo)
    exists in the game, so there is none to cover.
- **Art boundary with Ben (shared files, by path):**
  - Albedo's art is owner-scoped by filename: every READY body strip `ben10_<…>_uniform.png` has an Albedo twin
    `…__albedo.png` beside it (1034 body strips incl. human; `tools/ben10/gen_albedo_ready.py`).
  - Retag hooks: `fighters.js` `_retagAlienAnim` / `retagBenReadyArt` / `BEN_READY_ART_TAGS`, `abilities.js tickBenAlienForm`.
  - FX sheets (`*_fx_*`) are SHARED by Ben and Albedo, unrecolored.
  - Shared code files: `fighters.js`, `skins.js`, `characters.js`, `sprite.js`, `abilities.js`.
- **Existing Albedo skins:**
  - `default`, `ben10Classic`, `ben10Prime`.
  - `albedoValkyrie` / `albedoAlienX` (underskin batch) point at `ben10_*__albedo__valkyrie.png` / `…__alienx.png`, which
    **do not exist**: broken skins.
- **Saves / LAN:** the skin is a string id in `matchConfig.p1Skin/p2Skin`, saved via the session save and sent through the
  existing LAN match config. No per-character save format.
- **Portraits:** `ben10_portrait__albedo.png` (older), `ben10_portrait__classic__albedo.png` (kid).

## The earlier "Albedo red" pass
That pass IS the two preserved defaults: the gray-hair / Ultimatrix-red `__albedo` art, for **both** appearances.

**Decision:** the two defaults stay as they are, outside the 20 and unnumbered. **Scarlet Inversion** (#1) is a different
palette (silver-white jacket/shirt, charcoal, crimson, vivid red hair), so the build does not keep two red palettes with
unclear precedence.

The broken `albedoAlienX` / `albedoValkyrie` ids are **reused**:
- `albedoAlienX` → Older — Red Singularity.
- `albedoValkyrie` → Older — Crimson Victory.

So a saved selection of either id now loads a working theme instead of missing art.

## Design consequences (no Ben write)
- **New Albedo-only modules:**
  - `albedoThemes.js` (registry).
  - `albedoThemeRegions.js` (region maps).
  - `albedoThemeRecolor.js` (pure engine).
  - `albedoThemeManifest.js` (generated: Albedo strip → form + reference brightness).
  - `albedoThemeCache.js` (browser cache, `albedo|…` keys).
- **Theme art:** generated at runtime from Albedo's **own** `__albedo` sheets. The alternative was 20 × 1034 pre-generated
  sheets (~520 MB); runtime generation is what Phase 6 asks for.
- **Portraits:** 40, pre-generated into `assets/sprites/albedo/themes/portraits/`.
- **Three one-line hooks in shared engine files.** Each returns the identity / null for anything that is not an Albedo theme
  skin, so Ben's paths are unchanged:
  1. `sprite.js`: `albedoThemeSheet(fighter, sheet) || _loadSheet(sheet)`. Null for every non-Albedo-theme fighter.
  2. `fighters.js applyBen10VariantStats`: `if (k === "albedo") skinId = albedoBaseSkinId(skinId)`. A theme id gets its
     appearance's variant numbers.
  3. `skins.js`: the Albedo list spreads the 40 theme entries (Ben's list untouched).
- **No Ben data, art or registry is read or written** by the theme modules (tested: `harness/albedo_themes.test.mjs` C1–C5).
