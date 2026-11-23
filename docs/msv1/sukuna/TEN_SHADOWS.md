# Ryomen Sukuna (Shinjuku) — Ten Shadows add-on

Sukuna summons Megumi's shikigami using the technique of the body he wears.

**Hard rule:** no Megumi body sprites are used.
- Sukuna keeps his own body animations: `handSign` on the ground, `airAtk` in the air, `chant` for Mahoraga, `domainCast` for the domain.
- Every shikigami is a separate helper object, drawn from Megumi's existing shikigami strips.
- The summon art is not copied. It is read from `megumiSprites.js` `MEGUMI_SUMMON_ANIM`, the same files Megumi's own kit uses.

**Code:**
- Simulation: `sukunaShinjukuShadows.js`
- Rendering: `sukunaShinjukuShadowsFx.js`
- Numbers: `sukunaShinjukuData.js` (`TS`, `SHADOW_KEYS`)
- Inputs: `sukunaShinjuku.js`
- Tests: `harness/sukuna_shinjuku.test.mjs --only=shadows` (24 checks)
- Screenshots: `harness/sukuna_shinjuku_shots.mjs --shadows`

## Step 1 — file map

Source sheet: *Megumi Fushiguro JUS* by xxniiroxx, `assets/megumi_fushiguro/source/megumi_fushiguro_jus_by_xxniiroxx_dehd6g3-fullview.jpg`. It is sliced by `tools/megumi/extract.py`, and the ledger is `docs/megumi/SPRITE_MAP.md`.

All strips are one row of cells.

| # | Move | Strip (all `assets/megumi_fushiguro/summons/`) | Frames | Cell | Megumi body in it? |
|---|---|---|---|---|---|
| 1 | Gama, ground | `toad.png` | 14 | 54×74 | no (cells 6–10 = tongue) |
| 2 | Gama, air | `airToad.png` | 14 | 60×74 | no |
| 3 | Nue strike | `nue.png` | 9 | 91×86 | no (cells 4–6 = lightning) |
| 4 | Divine Dogs | `dogWhite.png`, `dogBlack.png` | 5 + 5 | 66×35 | no |
| 5 | Orochi | `serpent.png` | 7 | 42×179 | no |
| 6 | Datto | `rabbit.png` (one rabbit, drawn ×6) | 8 | 30×24 | no |
| 7 | Nue air blast | `airNue.png` | 10 | 126×94 | no |
| 8 | Totality MISS / HIT | `konMiss.png` / `konHit.png` | 7 / 10 | 124×65 / 122×74 | no |
| 9 | Max Elephant | `elephant.png` | 16 | 287×80 | no (cells 6–12 = beam) |
| 10 | Mahoraga | `mahoraga.png` | 29 | 188×228 | no (drawn ×3.75: 1.25× Megumi's scale, user request) |
| 11 | Chimera Shadow Garden | `assets/megumi_fushiguro/ultDomain.png` → **`assets/sukuna_shinjuku/ten_shadows/domainFloor.png`** | 15 | 328×53 | **yes in the source**: Megumi crouches in the centre of every cell. Removed (see below). |
| 12 | Win-pose Nue | `nue.png` cells 1–3 (flying) | — | — | The sheet's Nue landing exists only fused with Megumi in `win.png`, so it is **not used**. |

Mahoraga's 29 cells, in order:
- 0–2: puddle erupts
- 3–4: pillar, he emerges
- 5–11: leap (the leap height is drawn in the cells)
- 12–13: land
- 14–15: wind-up
- 16–21: crescent slashes
- 22: recovery
- 23: silhouette
- 24–26: sinking puddle
- 27–28: standing (unused)

## Missing, renamed or changed (Step 4)

- **Chimera Shadow Garden floor.** The only floor art has Megumi baked in. `tools/sukunashinjuku/shadows_import.py` removes his pixels and draws nothing new:
  - every pixel in his column above the floor band is removed;
  - in the band, only the near-black shadow pixels are kept;
  - specks of shoe outline are removed.
  - The output keeps the 15-cell layout: the floor spreads (cells 2–8), loops (8–10) and breaks up (11–14).
- **Mahoraga walk-back.** There are no walking frames. He walks back as his silhouette (cell 23, sliding 30 px toward where he came from), then sinks (cells 24–26).
- **Mahoraga's waves.** The slash cells (16–21) already draw the crescent beside him. The travelling waves that carry the hitbox are drawn as blue-white arcs in the same colours. No sprite exists for a wave in flight.
- **Gama grab.** There are no frames of a grabbed victim. The tongue lashes (cells 6–10) and the real opponent is dragged in by the sim.
- **Win-pose Nue.** There are no free-standing landing frames. Nue's flying cells (1–3) glide down and hover over his shoulder.
- **Spawn and despawn.** The sheet has no separate puddle strip. Every shikigami rises from its own silhouette cell over a shadow pool, and sinks back the same way: its last, silhouette cell drops into a shrinking pool. This is the same method Megumi's own kit uses. Mahoraga uses his real puddle cells (0–2 and 24–26).
- **"3 bars".** His meter holds 210 (2.1 bars). Mahoraga and the Domain each cost the **full meter**.
- **Body poses (his own sheet).** All ground summons use his hand sign (`handSign`, 6 cells), air summons his air pose, Mahoraga his chant, and the Domain his domain cast.

## Inputs (remaps)

Every button of his is already taken, so the summons live on a **stance**.

**Toggle:**
- **Tap Charge (P)** turns it on or off. The HUD shows `TEN SHADOWS`.
- Holding Charge still charges meter, and ↓↓ + Charge is still Domain Amplification.

**While the stance is on:**

| Sheet input | In game (stance on) | Move | Cost |
|---|---|---|---|
| Weak + Down | ↓ + Light | Gama: ground tongue grab | — |
| Weak (air) | Light in the air | Gama: air | — |
| Strong | Heavy | Nue: electric strike (stun) | — |
| Strong + Fwd | → + Heavy | Divine Dogs: two-hit rush | — |
| Strong + Up | ↑ + Heavy, or Up-Attack | Orochi: anti-air launcher | — |
| Strong + Down | ↓ + Heavy | Datto ×6 | — |
| Strong (air) | Heavy in the air | Nue: air blast | — |
| Special 1 | Special | Divine Dog: Totality (HIT / MISS) | 1 bar |
| Special 2 | → + Special | Max Elephant: water beam | 1 bar |
| Super 1 | Ultimate | Mahoraga | full meter |
| Super 2 | ↓↓ + Ultimate | Chimera Shadow Garden, 9 s | full meter, once per round |

**Kept while the stance is on:**
- neutral Light → his punch string
- ↓← + Special → Dismantle
- ↓↓ + Special → Spiderweb
- ↑ + Special → upward Dismantle
- Ultimate in the air → Malevolent Shrine
- grab

**Lost while the stance is on:** neutral Special (Cleave), → + Special (Fuga), ground Ultimate (Shrine) and ↓↓ + Ultimate (World Slash). Turn the stance off to use them.

## Rules (Step 3)

- **Shadow pool.** Each shikigami rises from a shadow pool and sinks back into one (above).
- **Shikigami can be hit.** A foe's live attack box or projectile breaks it; the projectile is spent unless it is a super.
  - Mahoraga takes **4** hits and **adapts**: a move that already hit him does nothing the second time. A golden wheel shows the adaptation.
- **Startup cancel.** A hit during his hand sign cancels the summon, because the shikigami only appears on the release frame.
- **One at a time, short cooldowns.** One of each kind can be out at a time. Its cooldown starts when it is gone:
  - Gama 0.7 s, Nue 1 s, air Nue 0.8 s, Dogs 0.9 s, Orochi 1.2 s, Datto 2.5 s, Totality 3 s, Elephant 3.3 s.
  - In the Shadow Garden, cooldowns run twice as fast.
- **Sheet timing.** Sheet order is kept, and the frame data follows Megumi's own tuned numbers (`megumiData.js`).
- **Techniques.** Ten Shadows counts as one of his techniques. Domain Amplification and a lost domain clash lock it, like Dismantle and Cleave.
- **Datto.** He turns see-through (50 %) while the rabbits are out. This is the one render-only game.js hook, phase 6 of `tools/sukunashinjuku/apply_hooks.py`.
- **Shadow Garden.** For 9 s:
  - he moves ×1.25 on top of his ×1.5;
  - every foe is slowed ×0.6, through the engine's generic slow status (`_benSlow`);
  - the floor art spreads across the stage and the world darkens.
- **Damage and Infinity.** Damage goes through his one hit path (`strike`, ×POWER), so Satoru Gojo's Infinity stops summon hits the same way it stops his other techniques.
- **CPU.** The CPU sends the dogs at mid range and Nue up close, on its deterministic roll.

## Damage (shown = after the engine's ×0.6, ×POWER 1.2)

| Move | Damage |
|---|---|
| Gama | 36 (air 31) |
| Nue | 43 (air 38) |
| Dogs | 2 × 36 |
| Orochi | 50 |
| Datto | 7 per rabbit |
| Totality | 29 / 29 / 48 |
| Elephant | up to 7 × 17 |
| Mahoraga | landing 60, waves 72 each |
