# Krybot balance and frame data

All timings are 60Hz simulation ticks. Frame-exact moves use the existing startMove path; GLOBAL_DAMAGE_SCALE is 0.60, with the shared defense, starter/combo decay, hitstun multiplier, counter-hit, chip, wall-splat, breaker and air-juggle rules. No other character frame data or private combo scale was changed. Raw damage is not the on-screen health loss.

Measured advantages below compare the first frame the attacker has finished its attack with the first frame the defender has no relevant stun, at the first active contact, including actual shared hitstop. Positive means the attacker recovers first. Measurements are standing mirror fixtures with no counter-hit, normal/stale guard and no cancels. The `air` timing row is a grounded frame-data fixture; the actual airborne follow-up is separately measured in the route table.

## Moves

S/A/R = startup / active ticks / recovery. Hitboxes are world pixels relative to the 60×100 fighter body: facing right starts at x=body.x+body.w, y=body.y+the listed offset, mirrored when facing left. Live collision checks are separately gated by attackIsActive and hasHit.

| Key | Raw | S/A/R | Hitstun raw | Blockstun | Reach × height @ y | Push X / Y | Cost | Measured hit / block advantage |
|---|---:|---|---:|---:|---|---|---:|---|
| light | 16 | 5/2/10 | 15 | 12 | 52×42 @ 24 | 2 / 0 | 0 | +4 / -1 |
| kJ2 | 18 | 6/2/12 | 15 | 10 | 56×42 @ 24 | 2 / 0 | 0 | +2 / -5 |
| kJ3 | 28 | 10/3/18 | 23 | 12 | 64×42 @ 24 | 5 / 0 | 0 | +4 / -10 |
| heavy | 50 | 14/3/25 | 34 | 13 | 66×42 @ 24 | 3 / 0 | 0 | +10 / -16 |
| kLow | 24 | 8/2/16 | 21 | 10 | 54×28 @ 70 | 2 / 0 | 0 | +5 / -9 |
| up | 40 | 12/3/22 | 28 | 12 | 52×98 @ -36 | 2 / 0 | 0 | +6 / -14 |
| air | 28 | 9/3/17 | 25 | 12 | 64×68 @ 8 | 3 / -3 | 0 | +8 / -9 |
| down_air | 28 | 9/3/17 | 25 | 12 | 64×68 @ 8 | 3 / -3 | 0 | — / — |
| kAdvance | 24 | 10/3/19 | 28 | 12 | 58×42 @ 24 | 2 / 0 | 0 | +9 / -11 |
| kChainKick | 32 | 11/3/21 | 30 | 12 | 66×42 @ 24 | 2 / 0 | 0 | +10 / -13 |
| kAway | 44 | 13/3/26 | 27 | 12 | 70×42 @ 24 | 7 / 0 | 0 | +1 / -18 |
| kBlaster | projectile/event | 15/1/24 | see below | shared projectile | no body collider | 2 / 0 | 12 | — / — |
| kBreach | 46 | 13/6/30 | 26 | 12 | 58×42 @ 24 | 2 / 0 | 15 | -7 / -25 |
| kLeap | 40 | 11/12/26 | 26 | 12 | 52×66 @ 4 | 2 / 0 | 18 | — / — |
| kCover | projectile/event | 24/1/26 | see below | shared projectile | no body collider | 2 / 0 | 25 | — / — |
| ultimate | projectile/event | 30/1/60 | see below | shared projectile | no body collider | 2 / 0 | 100 | — / — |

`down_air` is an alias of the aerial boot with spike explicitly disabled, not a new move. Launcher exact target velocity is −28 with no automatic self-lift; pursuit is a fresh shared manual jump. Normal base jump power is 26, one jump. Air follow-ups use the shared three-hit juggle limiter and gravity escalation.

Normals are planted except the command opener (24px over elapsed [2,10)) and shared launcher movement/manual jump. Breach advances 120px over elapsed [3,18), clamped to stage bounds, with no invulnerability or armor. Input movement before commit is distinct from the authored travel distance. Leap lifts at elapsed 6 with vy −17 and advances at most 120px using ordinary gravity, then locks for 18 landing ticks. It has one attack contact and one use per airtime; grounded call only, air Down+Special is the boot.

Light stages are capped at three. J1→J2 and J2→J3 need fresh Light presses in clean-hit recovery; J1→Heavy is allowed. Connected J1/J2/Heavy can cancel to a directional special; only verified Heavy can cancel to Ultimate. The Forward+Heavy chain uses shared rekkaContinue: clean-hit recovery retaps to kick, then knock-away or final Up+Heavy launcher. Block/whiff ends the command chain. No block cancels or automatic full-combo action exist.

## Projectiles, assistance and ultimate

Arm Blaster: startup 15, one event at the active tick, recovery 24, cost 12, raw 36, 9px/f horizontal velocity, lifetime 52, 5px collision radius, tight supplied 8×8 energy art. Only one Arm bolt per owner. No piercing or invisible splash. Bolts are energy-tagged and resolve through the shared pipeline.

Covering Unit: startup 24, active/event 1, recovery 26, cost 25; cooldown exactly 480 simulation updates from commit, including owner hitstop. Helper HP 1, body-hit area 44×114, anchored at the source-art feet. Entry center starts 90px behind owner, clamped to [24,stageWidth−24], advances 6px/tick for eight ticks, aims ten ticks, fires at age 18, exits after age 45, disappears at age 70. Shot: raw 24, speed 9, lifetime 52, radius 5; thus no call persists past age 70. Pending shots are cancelled if the helper is destroyed before firing. Helpers neither absorb attacks nor body-block.

Arm/Cover bolts use shared projectile hitstun 18, blockstun 12, horizontal push 3 and the engine's default vertical reaction (the shared spawn/collision path treats zero vertical push as its default). Normal projectile chip is 15% before the shared damage write. Mark consumption adds exactly 2 horizontal push to the Cover bolt, with no damage/stun/resource changes. Mark lifetime is exactly 60 updates, including owner hitstop; one per owner, replaced on refresh, invalidated on timeout/KO/reset/identity change. Input-buffer and attack clocks pause in hitstop independently of those entity timers.

Ultimate: cost 100, startup 30, one opening event, 60 recovery on miss/block (91 total authored move ticks, zero extra frame-exact cooldown). Raw contacts 30/35/35/100 = 200. Opening projectile hitstun 38 and push 1; cross bolts at confirmation ages 8 and 18 have speed 12, life 20, hitstun 24, push 1. The final local radius-36 contact starts at sequence age 36 with the largest visible supplied explosion, lives at most five ticks, hitstun 28, push 7. Crossfire contacts deal zero damage on block via a Krybot-only chip hook; other fighters and ordinary Arm/Cover shots retain shared chip. No confirmation or allies on an opening block.

Confirmed sequence allies/bolts are ordinary bounded geometry. No root, teleport, global hitbox, private scaling, unavoidable camera move or independent ally AI. Ordinary owned bolts/support are cleared on ultimate commit. A late opening confirm can extend the remaining owner animation to 48 ticks so the sequence has time to resolve. Interruption clears cinematic state/bolts even during hitstop. Shared defense, armor/absorption, movement and breaker outcomes may prevent later contacts.

## Measured routes

Initial center/body-x spacing is 72px against a standing Krybot at 900 HP, full Energy for cost measurement. Inputs are individual configured keyboard actions through the actual parser; no automatic route button. Spacing below is body-x separation at each contact. “Escape” counts simulation updates outside both defender hitstun and hitstop between contacts; shared stocked breakers remain possible even in a zero-gap string.

| Route | Actual contact damage | Total | Cost | Contact spacing | Escape frames between contacts |
|---|---|---:|---:|---|---|
| J1 -> J2 -> J3 | 9 + 10 + 15 | 34 | 0 | 72.0 → 72.0 → 72.0 | 0, 0 |
| J1 -> Heavy -> Arm Blaster | 9 + 30 + 19 | 58 | 12 | 72.0 → 72.0 → 72.0 | 0, 0 |
| Command -> knock-away | 14 + 17 + 22 | 53 | 0 | 54.1 → 60.0 → 60.0 | 0, 0 |
| Launcher -> manual jump -> Air | 24 + 14 | 38 | 0 | 72.0 → 72.0 | 0 |
| Heavy -> Covering Unit (pressure) | 30 + 13 | 43 | 25 | 72.0 → 79.5 | 11 |
| Heavy -> ultimate | 30 + 16 + 17 + 15 + 42 | 120 | 100 | 72.0 → 72.0 → 72.0 → 72.0 → 72.0 | 0, 0, 0, 0 |

Energy values displayed after routes also include ordinary passive recharge; the cost column is the committed move cost. The Cover route is **pressure**, with 11 actionable updates before the bolt in this close fixture. A delayed retap or longer distance can lose the 60f mark. At 90px spacing the standalone confirmed ultimate deals 108 health through shared scaling; at 700px its opening expires with zero damage. A blocked opening deals zero damage and never confirms. Wall bounds, finite assistant life, repeated-mark replacement and simultaneous mirrors are covered by the lifecycle/mechanics suites.

These are initial measured targets, not a competitive matchup or infinite-combo proof. Follow-up art is intentionally limited to supplied poses, described in MOVE_FRAME_MAP.md.
