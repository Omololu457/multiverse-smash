# Enoch — what was read from Frozone, and which shared systems are reused

Enoch (`enoch`, "The Incredibles") is a tribute fighter for a friend who helped build Multiverse Smash.
He is **built from Frozone** but Frozone himself is unchanged: no Frozone file is edited, and Frozone's sprite files stay
byte-identical (`harness/enoch_framedata_diff.mjs` checks both).

## Source sheet

The brief named `assets/incoming/enoch/frozone_base.png`. That file never existed (nor did the private reference photo,
which was never to enter the repo in any case). On the owner's instruction (2026-11-15) the base is **Frozone's own supplied sheet already
in the repo**: `Game Boy Advance - The Incredibles - Playable Characters - Frozone.png` (SHA-256 34aeab73…, 704 × 471).
It is only READ (`tools/enoch/build_sprites.py`). Without the reference photo, the edits follow the brief's palette values
exactly; the one judgement call this forced is noted in `EDIT_LEDGER.md` (facial hair kept from Frozone).

## Frozone's implementation (read in full)

| file | lines | what it is | what Enoch takes |
|---|---|---|---|
| `frozoneData.js` | 189 | frame data, ice-system rules, roster entry, timelines, move → strip map | the **data-module layout** (moves built by an `n(raw, startup, active, recovery, extra)` helper with `frameExact`, box measured from the body front + floor, TIMELINE / MOVE_STRIP → animationData). No numbers: Enoch's frame data is the brief's. |
| `frozoneState.js` | 633 | sim: press edges, Chill → Freeze → Shatter, Black Ice patch, skate profile, Ice Flash / Rail / Stream / Glider / Wall, hit volumes as engine projectiles, the freeze-contract ultimate, intro skate-in | the **architecture**: plain JSON state on `f._<key>` (snapshotted), `startXMove` through `combat.startMove`, combat hooks (hitbox / block / hit / projectileHit), hit volumes = `W.spawn` projectiles, `xLocked` movement hook, the freeze-contract cinematic (`isXUltActive` / `updateXUlt` / `clearXUlt`), intro offset + finalize. Enoch's mechanics (thermal, patches, glide, beam, three supers) are new code. |
| `frozone.js` | 73 | command layer (press edges from `readRawControls`, precedence, cancels) | the precedence pattern + the pad Up+△ trap. Enoch adds motion inputs (reusing Elastigirl's parser, below). |
| `frozoneFx.js` | 381 | render-only: ice effects, ribbon, patch, shell, HUD rows, intro card, ultimate presentation, cue → sound | layout of `drawUnder / drawOver / drawHud / drawIntroCard / playCues`, image cache, `imageSmoothingEnabled = false`, hard-edged polygons, reduced-motion handling. |
| `frozoneSprites.js` | 594 | generated FROZONE_ANIM / FROZONE_PARTS | the **cell + anchor rules** (`tools/frozone/extract.py`): Enoch's strips use the identical cell (85 × 76, origin 36, 75) so every frame lines up exactly as Frozone's. |
| `frozoneSound.js` | 54 | WebAudio synth SFX (seeded LCG noise, no Math.random, SFX bus only) | the synth helpers' style (noise buffer / filtered noise / tone). |
| `frozoneKit.js` | 54 | Move List + controls table | the kit format. |
| `frozoneSkins.js`, `frozoneSkinTable.js` | 242 | default + 10 skins | only the default-entry shape (Enoch has **no skins** beyond the default). |
| `frozoneHarness.js` | 35 | `__harness.frozoneTest` | the harness-API shape. |
| `tools/frozone/extract.py`, `build_skins.py` | — | sheet extraction + exact-colour **role map** | imported READ-ONLY by `tools/enoch/regions.py` (frame grouping, anchors, roles). |
| shared-file hooks (`tools/frozone/apply_hooks.py`) | — | characters / spritesheets / kits / skins / sound / credits / combat / sprite / input / game | Enoch's hooks (`tools/enoch/apply_hooks.py`) are inserted right **after** Frozone's lines, never replacing them. |

## Shared systems — found, and reused or not

| brief asks to reuse | what exists in the repo | decision |
|---|---|---|
| **Beam / laser** used by Superman's heat vision and Homelander's laser | There is **no shared beam module**. Homelander (`abilities.js applyHomelanderHeatVision`, render `game.js drawHomelanderHeatVision`) and Superman (`applySupermanHeatVision` / `drawSupermanHeatVision`) each carry their own char-gated copy of the same algorithm: an eye origin, a 10-px-step ray march against the target AABB (first contact = impact), damage every N frames through `applyScaledDamage`, and a 3-stroke render (glow / mid / white core + origin dot + pulsing impact). Starfire and Cyborg wrote further copies. | Those functions are local, gated on their own rosterKey and not exported, and refactoring them would put Superman / Homelander frame data at risk. So no new beam algorithm is written for Enoch: the existing one is **lifted unchanged** into one small generic helper, `beam.js` (`marchBeam` = the same 10-px ray march vs AABB, `drawBeam3` = the same 3-stroke look with the colours as parameters). Superman / Homelander are left byte-identical; `beam.js` is the shared helper a future beam user can import. The laser **sound** is Homelander's actual beam loop (`homelander_sfx_map.startHomelanderLaser`), re-pitched ×1.12 on Enoch's element so the two are distinguishable. |
| **Freeze status** (Superman's Freeze Breath, Green Arrow's ice arrow) | `_supFrozen` / `_supFrozenMax` on the victim: `combat.js` counts it down, tops up hitstun and stops `vx`; `combat.js` applies +15 % damage taken while frozen; `game.js drawFrozenOverlay` draws the frost on ANY frozen fighter. Green Arrow already reuses it. | **Reused as-is**: Deep Freeze, Absolute Zero and Thermal Shock set `_supFrozen` / `_supFrozenMax`. No new freeze code; the +15 % taken while frozen comes with it (documented in BALANCE_NOTES). |
| **Burn status** (Sanji's Diable Jambe) | Sanji's burn is internal to `f._sanji` (`s.burn` ticks 3 dmg / 20 f from Sanji's own tick) — not callable for another character. The generic engine burn is the projectile `dot` → `fighter._dot` (combat.js), used by Naruto / Green Arrow. | The brief's FIRE patch rule ("4 damage per 20 frames to whoever stands in it") is a **zone** rule, not a lingering burn, so it lives in the generic patch effects of `elements.js` (damage through the world's `W.damage` with `damageType: 'energy'`, exactly Sanji's burn plumbing). Sanji's code is not touched. |
| **Arlong's ground WATER ZONES** | `arlongState.addZone` writes `f._arlong.zones` (x left edge, width, bornFrame, owner; max 3; overlap MERGES, cap 30 %; oldest dries first). Bound to Arlong's state object. | The **same rules** (left-edge + width geometry, merge-on-overlap with a width cap, oldest-first eviction) are generalised in `elements.js` for any element; Arlong's module is untouched. Enoch READS Arlong's zones for the matchup interaction (BALANCE_NOTES). |
| **damageType tags** ("slash", "blunt", "projectile", "energy", "grab", "haki") | metadata on move data, stamped onto `currentAttack.damageType` by `combat.startMove`; projectiles carry `damageType`. | Every Enoch move and volume carries one of these tags. |
| **Motion inputs** (not in the brief's list, but needed for ↓↘→ etc.) | Elastigirl's pure `dirDigit` / `motionMatch` (`elastigirlState.js`). | **Reused** (imported; pure functions, no state). |
| **Time / flight** | `flight.js` | **Not used** — Enoch never flies (brief). |
