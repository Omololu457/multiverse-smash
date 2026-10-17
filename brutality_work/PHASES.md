# BRUTALITIES — Phase Ledger

Canon-themed, personality-driven finishers triggered automatically on the killing blow.
Base sprite = the victim's **hurt** sprite (idle where the concept calls for it, e.g. Gojo).
Built on a reusable FX-primitive library composed per-character in `brutalityConcepts.js`,
rendered by `brutalityCinematic.js`. The existing gore-type system (BRUTALITY_FINISHERS in
game.js) stays as a fallback / sub-element where it fits.

Quality-first. Within a phase, sub-batch freely (name each sub-batch). 15 phases, ~124 brutalities.

★★CINEMATIC ENGINE UPGRADE (user: "make it more cinematic, what you did was lazy") — concepts can set
`choreographed: true` to use the TWO-ACTOR + internal-camera renderer: stage BOTH fighters' real action
animations across camera "shots" (zoom/pan) instead of painting FX over one frozen victim frame. New primitives:
cam (eased zoom/focus) · actor (draw a fighter's action frame, supports fallback-action arrays + rot) ·
flickerIn (dash-in w/ after-images) · flickerRush (blitz around victim, multiple directions) · swordSlash
(arc) · bloodGush (pours, accumulates) · speedLines. Flagship: shisui_fallen "FLICKER MASSACRE" (zoom→flicker-
in strike→blitz rush→sword→blood+collapse). Old flat concepts (gojo + 8 JJK) still render (backward-compat) —
TO RETROFIT → ROLLOUT A1 DONE: gojo/sukuna/alt_sukuna/yuta retrofitted to choreographed cinematic (letterbox+cuts+extreme-CU+HUD-hidden). actor primitive now publishes victim rect → signature FX (headPop/shatter/incinerate/maw) target the staged victim. A2 DONE: yuji(Black Flash)/toji(Inverted Spear)/maki(Split Soul)/naoya(Projection Sorcery)/aoi_todo(Boogie Woogie) all choreographed. ALL Phase 1+2 now cinematic. Next: Phase 3 Sharingan at this bar. See brutality_shisui_cine.mjs.
★★MK-CINEMATIC POLISH (user ref: MK1 fatalities video — letterbox/hard-cuts/extreme-CU/HUD-hidden). Added:
`letterbox` primitive (bars slide-in + vignette), cam `cut:true` (hard snap vs ease) + per-shot `ease`, and a
game.js HUD-hide guard (_cineHidesHud → skip drawBattleHud + training overlay during any finisher cutaway; added
as brut_apply.py hunk #6). Shisui re-cut to 6 shots w/ 2 hard cuts + an EXTREME close-up on the kill + bigger
blood. game.js HUD guard is the only new game.js line (contended → private-index commit).

Status key: ☐ not started · ◐ in progress · ☑ done+verified

## Phase 1 — Infinite Void  (system + Gojo flagship)   ☑ DONE @ e264c39a
System: brutalityConcepts.js · brutalityCinematic.js · FX primitive library · kill-trigger wiring.
Flagship: gojo — "UNLIMITED VOID" (invert to pale void → zoom on enemy → binary/data flood → overload → head pop).
Trigger model: FINISH-window expires WITHOUT a fatality input → winner's brutality plays (fatalityWasPerformed() gate).
FX primitives built: whiteSpike · darken · voidInvert · sprite · dataFlood · headPop · banner.
Verified: test:brutality-cine 7/7, determinism 14/0, combat/characters/kits byte-identical.
Restore tool (hostile shared checkout): brutality_work/brut_apply.py (re-applies 5 game.js hunks onto any base).

## Phase 2 — Cursed Energy (JJK)   ☑ DONE
Batch 2A "The Curses": sukuna (Malevolent Shrine dice-shatter) · alt_sukuna (Flame Arrow incinerate) · yuta (Rika maw) · yuji (Black Flash)
Batch 2B "The Sorcerer-Killers": toji (Inverted Spear impale) · maki (Split Soul bisect) · naoya (Projection Sorcery 24-frame) · aoi_todo (Boogie Woogie)
New FX primitives: shrineBg · slashCross · shatter · flameBeam · incinerate · maw(+_jaw) · blackFlash · impale · soulSplit · frameFlicker · boogie.
★FIX: sprite slicing now loads the EXACT sim sheet (animationData[action].sheet) + derives per-frame width from the image (was grabbing multiple frames for chars whose manifest sheet ≠ animationData sheet, e.g. sasuke hurt = sasuke_damage.png 4×53).
Verified: test:brutality-phase2 45/45 (8 JJK + gojo regression), determinism 14/0, sim byte-identical. NO game.js change (uncontended).

## Phase 3 — The Sharingan (Uchiha)   ◐ IN PROGRESS
Batch 3A DONE: sasuke(Chidori lightning)/sasuke_adult(Amaterasu black-flame)/sasuke_sensei(Susanoo cleave)/itachi(Tsukuyomi red-world). New FX: lightning, tsukuyomiBg, incinerate black:true. shisui_fallen DONE. Batch 3B DONE: madara(Tengai Shinsei meteor)/obito(Kamui spiral warp)/tobi(Truth-Seeking void orb). New FX: meteor, kamuiSpiral, voidOrb. Pending 3C (shisui_blade/puppeteer/trinity/itachi_kids).
sasuke · sasuke_adult · sasuke_sensei · itachi · madara · obito · tobi · shisui_fallen · shisui_blade · shisui_puppeteer · shisui_trinity · shisui_itachi_kids

## Phase 4 — Will of Fire (Hokage/Sannin)   ☐
naruto · naruto_hokage · naruto_seventh · minato · hashirama · tobirama · hiruzen · jiraiya · orochimaru · kakashi · kakashi_anbu · kakashi_war

## Phase 5 — The Hidden Leaf   ☐
gaara · onoki · pain · six_paths_pain · isshiki · boruto · kiba · hinata · sakura

## Phase 6 — Saiyan Blood (DB)   ☐
goku · vegeta · vegeta_dark · gohan · bardock · gogeta · vegito · gotenks

## Phase 7 — Gods & Monsters (DB)   ☐
frieza · cell · piccolo · beerus · goku_black · goku_rose

## Phase 8 — Nen (HxH)   ☐
killua · zoldyck · gon · hisoka · chrollo · kurapika · netero · meruem · shizuku

## Phase 9 — Soul Reapers (Bleach)   ☐
ichigo · byakuya · zaraki · zaraki_shikai · mayuri · yamamoto

## Phase 10 — Total Concentration (Demon Slayer)   ☐
nezuko · inosuke · rengoku · shinobu · zenitsu

## Phase 11 — Truth & Justice (DC)   ☐
superman · superman_classic · superman_dcuc · superman_fighter · superman_new52 · batman · dark_knight · flash · green_lantern · deathstroke · brainiac

## Phase 12 — With Great Power (Marvel/Invincible)   ☐
spiderman · spiderman_mci · spiderman_raimi · spiderman_ssf2 · miles · gwen · iron_man · iron_man_2 · iron_man_3 · omniman

## Phase 13 — One Punch (OPM/Ben10/Baki)   ☐
saitama · genos · ben10 · vilgax · baki · ippo

## Phase 14 — Infinite Timelines (R&M/Rangers/Death Note)   ☐
rick · rickPrime · morty · evilMorty · red_ranger_mmpr · samurai_red_ranger · gold_samurai_ranger · green_samurai_ranger · omega_ranger · light · l_ryuuzaki

## Phase 15 — Wildcards (horror/originals)   ☐
jason · ghostface · ghostface_billy · ghostface_exe · omololu · jesus · saiki · handler · albedo · miwa
