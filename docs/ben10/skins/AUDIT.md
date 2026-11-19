# Ben 10 themes — Phase 0 audit (2026-11-18, read-only, before any edit)

All line numbers are from `main` @ `bb3e167d4`.

## Roster and the two human sprite sources
- `ben10` is one fighter. Albedo (`albedo`) is a separate roster key.
- Human appearances are skins in `SKINS.ben10` (skins.js):
  - `default` = Alien Force / **Jacket**: base `characters.ben10.animationData`, sheets `ben10_<action>_uniform.png`. Regions: green jacket, black undershirt, blue jeans, brown hair, watch.
  - `ben10Classic` = **Classic**: `BEN10_CLASSIC_ANIM`, sheets `ben10_<action>_uniform__classic.png`. Regions: white shirt with a black stripe, olive cargo pants, brown hair, watch.
  - `ben10Prime` is experimental, with pending art.
  - `ben10_crimson` / `ben10_azure` are whole-sprite tints (`skinTint`).
- `applyBen10VariantStats(fighter, skinId)` (fighters.js) keys on the skin id: `default` / `ben10Classic` / `ben10Prime`. Variant stats, normals and voice follow `_benVariant`.

## Selection, persistence, LAN
- Skin screen: `drawSkinSelectScreen`, `getSkinSelectRects` (game.js); the grid shrinks for 20+ cards.
- **Mouse:** click picks.
- **Gamepad / DualSense:** D-pad or left stick moves a virtual cursor between cards; ✕ (button 0) picks; ◯ (button 1) goes back (input.js `pollMenuGamepad`).
- **Keyboard:** Esc / Backspace goes back only. There is no keyboard browse on this screen.
- Persistence: `snapshotSession` stores `p1Skin` / `p2Skin` in localStorage `multiverse-smash-session`.
- Unknown id: `getSkin` falls back to the first skin.
- LAN: the host's `MATCH_SETUP` carries `p1Skin` / `p2Skin` (net/protocol.js). Replays carry the same fields.
- ⇒ A theme encoded **in the skin id** inherits saving, fallback, LAN sync and replays with no new path.

## Transform, revert, alien sprites
- `applyAlien` (fighters.js) swaps `_skinAnim` to the READY alien's animation table. `retagBenReadyArt` / `_retagAlienAnim` swap sheet names for Albedo's `__albedo` art.
- Forms swap frame sets at runtime: Heatblast BLUE_ANIM, Megawhatt DRAINED, Brainstorm OPEN, Diamondhead PRISM, Upgrade OC, Humongousaur size tiers, Ripjaws land / water.
- `revertToHuman` restores `_baseSkinAnim`. `resetRound` re-creates the fighter and re-runs `applySkin`. `_doRematch` keeps the fighter's fields.
- ⇒ A theme applied **at draw time to whichever sheet is drawn** follows every one of these swaps automatically. Albedo's retag cascade is the same idea, a per-fighter tag on the sheets, done offline.

## READY aliens (live registry)
- `BEN10_ALIEN_REGISTRY` status `ready` with sheet + ledger: 24 aliens, all pickable (PICK FIVE): swampfire, heatblast, megawhatt, goop, xlr8, eyeguy, ghostfreak, alienx, brainstorm, terraspin, wildvine, jetray, diamondhead_ov, upgrade_ov, humongousaur, feedback_ov, arcticguana, benwolf, bigchill, ripjaws, rath, waterhazard, highbreed, wildmutt_ov.
- The legacy experimental twins (`diamondhead`, `feedback`, `wildmutt`, `fourarms`, …) appear only with `benExperimental`.
- Each alien's distinct colour regions were measured from every body strip. See each `<alien>_REGIONS.md`.

## Tint and hit flash: what the tinted opponent is
- It is the **mirror / team tint**, not a hidden costume.
- `tintColor` is an offscreen source-atop wash (game.js `applyMirrorTint`). In a same-character mirror, P2 gets `MIRROR_TINT #e2493b`. Teams and FFA use team colours.
- `tintColor` is set at match start and rematch.
- Sprite fighters have no white hit flash. The hit effect is `_impactFlash` (sprite.js filter / posterize); `colorFlash` is drawn only on the procedural box path.
- The theme does not touch either effect, so both still draw over the themed sheet.
- Pre-existing, left as is (out of scope):
  - `applySkin` never copies `tintStrength`.
  - Prime's `auraOverlay` is never read.

## Caching
- sprite.js `_cache` (a Map keyed by bare path) loads sheets with `?v=__ASSET_V`, stamped by `tools/stamp_version.mjs`.
- No runtime recolour for Ben existed before this work.
- Effects setting: `juiceSettings.reduceFlashing` (localStorage `ms_juice_reduce_flash`).

## Albedo boundary (must never move)
- `characters.albedo.animationData` = Ben's map with every sheet changed to `__albedo.png`. `SKINS.albedo` has its own 5 skins. `setupBen10` sets `_recolorTag = "albedo"`.
- Shared state is only the alien animation tables (read-only), the sprite path cache and the variant-stat skin ids.
- ⇒ Themes live only in `SKINS.ben10`, are stamped only when `rosterKey === "ben10"`, never write a source image, and cache under their own keys. Albedo's art can never pass through them.

## Decision
- Pre-baking 20 themes × 26 sets (~1,000 body strips) would be ~20,000 PNGs. Instead, the drawn sheet is recoloured once per (appearance, form, theme, path) into a bounded LRU canvas cache, from one registry + one regional map per set.
- This extends the existing "the frame set swaps, the fighter keeps a tag" pattern rather than replacing it.
