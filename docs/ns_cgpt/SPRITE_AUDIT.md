# Ninja Storm CGPT — sprite audit (both supplied sheets)

Source: the two supplied sheets (`Red Ranger.png`, `Yellow Ranger.png`, Power Rangers Super Legends DS, ripped by Grim),
already sliced by MSV1 into one shared frame map (`msv1Sprites.js`, `docs/msv1/SPRITE_MAP.md`): 27 rows, **305 frames per
sheet**, 58 strips + 6 cropped FX/projectile pieces + 2 portraits. MSV1 proved the sheets are a **pure palette swap**
(identical bounding boxes and alpha masks in all 305 frames; 5 suit/smoke shades swapped). That is why Red and Yellow
can be two appearances of ONE character: identical frames, anchors (cell 260×136, origin 130,132 = feet) and effects.

Copies: `assets/ninja_storm_cgpt/skins/red/` and `.../yellow/` are byte copies of `assets/ns_red/` / `assets/ns_yellow/`
(full frames, untouched anchors, effects intact). The 20 skins are palette swaps of the Red copy with the alpha mask
verified identical (harness/ns_cgpt.test.mjs "silhouette pixel-exact").

## Every strip → its job in the combined kit

| Row | Strip (frames) | Used for |
|---|---|---|
| R1 | idle (7) | idle stance; clone idle (Echo) |
| R2 | run (8) · runStop (4) | walk / run / walk-back; clone moving · match intro |
| R3 | streak (3) · streakTail (2) | Ninja Step travel (+ dash); clone RECALL · the step's after-image smear |
| R4 | jab (4) · string (6) · stringEnd (6) | Light 1 · Light 3 *Storm flurry* (3 hits) · ultimate: clone's second spiral strike |
| R5 | kickHeavy (6) · crouchStrike (7) | ultimate: clone's first spiral strike · *Faultline Strike* + wake-up strike |
| R6 | punchAlt (5) · risingKick (5) · tumble (3) | Light 2 cross punch + grab · ↑+Heavy *rising flip kick* · heavy hit-reaction |
| R7 | guard (2) · crouch (4) · axe (4) | block (+ clone Guard stance, hand sign) · crouch · ←+Heavy overhead |
| R8 | jump (7) · land (5) · landRecover (4) | jump · ultimate impact pose (*superSlam*) · ultimate recovery / partner landing |
| R9 | airSpin (8) · diveKick (5) | ultimate rise + partner descent · air ↓+Heavy *Hawk dive* |
| R10 | airAttack (6) · airTumble (8) · airRecover (2) | air Light kick (+ Gale Rush follow-up, clone's 3rd spiral strike) · air hit-reaction · fall |
| R11 | tornado (4) · dive (1) · skid (4) · getUp (2) · hitSpark (1) · flipKick (1) | *Gale Rush* wind drill · ultimate's fast descending strike · ↘+Heavy skate slide · Ninja Step recovery · hit spark (drawn as the cropped `fx_hitSpark`) · Streak Strike |
| R12 | low (11) | ↓+Light low sweep |
| R13 | duck (3) · uppercut (4) · hurt (5) | the clone forming in its smoke · throw · hit-reaction |
| R14 | sword (12) | Heavy 1 sword slash; ultimate opening strike |
| R15 | galeCrescent (5) · swordMove (10) | →+Heavy *Gale Crescent* (the arc flies as `proj_crescent`) · Heavy 2 stepping slash; ultimate spiral; Guard counter-slash |
| R16 | galeCrescent2 (5) · swordLow (5) · swordRise (2) | Heavy 3 crescent finisher · ↙+Heavy low swipe · ↑+Light / Up-Attack *sword launcher*; ultimate's last spiral hit |
| R17 | swordCrouch (7) | ↓+Heavy crouch slash |
| R18 | swordAir (8) | air Heavy sword; *Sky Blade*; clone spiral strike |
| R19 | swordDome (4) · dome (7) | *Earth Eruption* cast (sword planted) · the eruption's shock dome (special from a marker + ultimate) |
| R20 | throw (6) · throwAir (6) | ↓↙←+Light kunai · air kunai fan / air blaster |
| R21 | fxSpark (1) · beam (3) · beamDiag (3) · fxBurst (4) | kunai (cropped `proj_spark`) · Blaster shot (`proj_beam`) · air Blaster (`proj_beamDiag`) · eruption burst (strip + cropped `proj_burst`, also parry/ground ring) |
| R22 | stance (13) | Blaster pose + taunt |
| R23 | seated (1) · smoke (6) | Smoke Vanish (gone) · smoke pops (vanish, swap, summon) |
| R24 | smokeFade (5) | clone dissolve / swap arrival / vanish exit |
| R25 | victory (6) | win pose |
| R26 | knockdown (11) | knockdown |
| R27 | lying (9) · getUpRoll (9) | lose pose · get-up |

Cropped pieces (`proj_crescent`, `proj_beam`, `proj_beamDiag`, `proj_spark`, `proj_burst`, `fx_hitSpark`) are the R15/R21/R11
effect frames cut tight for projectiles and hit sparks; every appearance folder carries its own recoloured copy, so
projectiles and sparks follow the skin. All 58 strips are referenced by `ninja_storm_cgpt.animationData` (checked by
script: 0 unused). Portraits: `assets/ninja_storm_cgpt/portrait_*.png` = Red | Yellow diagonal split of the two supplied
portraits (roster); each appearance carries its own recoloured portrait.

Not used: the credit text block of each sheet (not character art).
