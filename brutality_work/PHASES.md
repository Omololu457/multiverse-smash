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

## Phase 3 — The Sharingan (Uchiha)   ☑ DONE
Batch 3A DONE: sasuke(Chidori lightning)/sasuke_adult(Amaterasu black-flame)/sasuke_sensei(Susanoo cleave)/itachi(Tsukuyomi red-world). New FX: lightning, tsukuyomiBg, incinerate black:true. shisui_fallen DONE. Batch 3B DONE: madara(Tengai Shinsei meteor)/obito(Kamui spiral warp)/tobi(Truth-Seeking void orb). New FX: meteor, kamuiSpiral, voidOrb. Batch 3C DONE: shisui_blade(Iaido bisect)/shisui_puppeteer(Kotoamatsukami strings)/shisui_trinity(Trinity shatter)/shisui_itachi_kids(Twin Flicker). New FX: strings. ★ALL 12 Uchiha cinematic. 21 concepts total (phases 1-3 + shisui). Next: Phase 4 Will of Fire.
sasuke · sasuke_adult · sasuke_sensei · itachi · madara · obito · tobi · shisui_fallen · shisui_blade · shisui_puppeteer · shisui_trinity · shisui_itachi_kids

## Phase 4 — Will of Fire (Hokage/Sannin)   ☑ DONE
Batch 4A DONE: naruto(Rasengan)/naruto_hokage(Rasenshuriken shred)/naruto_seventh(Bijuudama)/minato(Flying Raijin). New FX: rasengan (color-param glow). Batch 4B DONE: hashirama(Wood Style tendrils+spike)/tobirama(Water Fang raijin+bisect)/hiruzen(Adamantine Staff impale)/jiraiya(Needle Jizo steel storm). New FX: woodBind. Batch 4C DONE: orochimaru(Kusanagi green-impale+snakes)/kakashi(Raikiri lightning)/kakashi_anbu(ANBU tantō bisect)/kakashi_war(Kamui Raikiri warp). No new FX (reuse). ★33 concepts total (phases 1-4). Next: Phase 5 Hidden Leaf.
naruto · naruto_hokage · naruto_seventh · minato · hashirama · tobirama · hiruzen · jiraiya · orochimaru · kakashi · kakashi_anbu · kakashi_war

## Phase 5 — The Hidden Leaf   ☑ DONE
Batch 5A DONE: gaara(Sand Coffin)/onoki(Dust Release cube)/pain(Shinra Tensei)/six_paths_pain(Chibaku Tensei). New FX: sandCrush, dustRelease, shockRing. Batch 5B DONE: isshiki(Black Rods)/boruto(Vanishing Rasengan teal)/kiba(Fang Over Fang shred)/hinata(Sixty-Four Palms)/sakura(Cherry Blossom Impact/SHANNARO). No new FX (reuse). ★42 concepts total (phases 1-5). Next: Phase 6 Saiyan Blood.
gaara · onoki · pain · six_paths_pain · isshiki · boruto · kiba · hinata · sakura

## Phase 6 — Saiyan Blood (DB)   ☑ DONE
Batch 6A DONE: goku(Kamehameha blue)/vegeta(Final Flash gold)/gohan(Masenko amber)/gogeta(Stardust Breaker cyan). New FX: kiBeam (charge→fire horizontal beam, color+wide params). Batch 6B DONE: vegeta_dark(Big Bang)/bardock(Riot Javelin)/vegito(Spirit Sword)/gotenks(Ghost Kamikaze). No new FX. ★50 concepts total (phases 1-6). Next: Phase 7 Gods & Monsters.
goku · vegeta · vegeta_dark · gohan · bardock · gogeta · vegito · gotenks

## Phase 7 — Gods & Monsters (DB)   ☑ DONE
frieza(Death Beam thin)/cell(Absorption maw)/piccolo(Makankosappo drill)/beerus(Hakai erase)/goku_black(dark Kamehameha)/goku_rose(God Split Cut). No new FX (reuse). ★56 concepts total (phases 1-7). Next: Phase 8 Nen (HxH).
frieza · cell · piccolo · beerus · goku_black · goku_rose

## Phase 8 — Nen (HxH)   ☑ DONE
Batch 8A DONE: killua(Godspeed lightning-blitz)/zoldyck(Thunderbolt)/gon(Jajanken)/meruem(The King)/netero(100-Type Guanyin). No new FX (reuse). Batch 8B DONE: hisoka(Bungee Gum strings+shatter)/chrollo(Sun and Moon detonate)/kurapika(Chain Jail gold-chains+impale)/shizuku(Blinky vacuum-maw). No new FX. ★65 concepts total (phases 1-8). Next: Phase 9 Soul Reapers (Bleach).
killua · zoldyck · gon · hisoka · chrollo · kurapika · netero · meruem · shizuku

## Phase 9 — Soul Reapers (Bleach)   ☑ DONE
ichigo(Getsuga Tensho)/byakuya(Senbonzakura shred)/zaraki(Kendo cleave)/zaraki_shikai(Nozarashi)/mayuri(Ashisogi Jizo vivisect)/yamamoto(Ryujin Jakka fire). No new FX (reuse). ★71 concepts total (phases 1-9). Next: Phase 10 Total Concentration (Demon Slayer).
ichigo · byakuya · zaraki · zaraki_shikai · mayuri · yamamoto

## Phase 10 — Total Concentration (Demon Slayer)   ☑ DONE
nezuko(Blood Demon Art pink-flame)/inosuke(Beast Breathing shred)/rengoku(Flame Breathing)/shinobu(Insect Breathing poison)/zenitsu(Thunderclap lightning-bisect). No new FX. ★76 concepts total (phases 1-10). Next: Phase 11 DC.
nezuko · inosuke · rengoku · shinobu · zenitsu

## Phase 11 — Truth & Justice (DC)   ◐ IN PROGRESS
Batch 11A DONE: the 5 Supermen — heat-vision (superman/superman_dcuc/superman_new52 = kiBeam red headY0.3) + Kryptonian-Might super-punch (superman_classic/superman_fighter = flickerIn+headPop+shockRing). No new FX. Pending 11B (batman/dark_knight/flash/green_lantern/deathstroke/brainiac).
superman · superman_classic · superman_dcuc · superman_fighter · superman_new52 · batman · dark_knight · flash · green_lantern · deathstroke · brainiac

## Phase 12 — With Great Power (Marvel/Invincible)   ☐
spiderman · spiderman_mci · spiderman_raimi · spiderman_ssf2 · miles · gwen · iron_man · iron_man_2 · iron_man_3 · omniman

## Phase 13 — One Punch (OPM/Ben10/Baki)   ☐
saitama · genos · ben10 · vilgax · baki · ippo

## Phase 14 — Infinite Timelines (R&M/Rangers/Death Note)   ☐
rick · rickPrime · morty · evilMorty · red_ranger_mmpr · samurai_red_ranger · gold_samurai_ranger · green_samurai_ranger · omega_ranger · light · l_ryuuzaki

## Phase 15 — Wildcards (horror/originals)   ☐
jason · ghostface · ghostface_billy · ghostface_exe · omololu · jesus · saiki · handler · albedo · miwa
