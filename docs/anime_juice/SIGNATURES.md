# Signature moves → breakdowns (anime juice Phase 2)

The roster inventory behind animeSignatures.js SIGNATURE_MOVES. Moves are matched on their **runtime identifiers**: the move key in currentMove (melee sparks carry it as moveName), the projectile type (projectile sparks carry proj.name), or _spriteCastMove for casts that spawn a projectile later. Display names alone don't work, because many specials have no name. ben10 / albedo are excluded.

| Breakdown | Fighter | Move | Runtime ids matched | Source |
|---|---|---|---|---|
| L Beam | alt_sukuna | — | altSukunaBeam | abilities.js:32718 |
| L Beam | genos | — | genosIncineration | abilities.js:9392 |
| L Beam | goku | — | gokuKamehameha, gokuKamehameha | abilities.js:733 |
| L Beam | goku | Transformation Ladder | gokuKameUlt, ultimate | abilities.js:823 |
| L Beam | goku_black | — | gbKamehameha | abilities.js:36150 |
| L Beam | gwen | — | gwenOval | abilities.js:9793 |
| L Beam | homelander | — | heatCharge | abilities.js:16108 |
| L Beam | starfire | Star Sight (eye laser) | sfLaser, sfAirLaser | starfireData.js:73 |
| L Beam | starfire | SUPERNOVA — EYES OF TAMARAN | sfUltOpen, ultimate | starfireData.js:76 |
| L Beam | superman | — | superman_heatvision | abilities.js:17865 |
| L Beam | superman | — | superman_solarbeam | abilities.js:17865 |
| L Beam | vegeta | — | galickGun | abilities.js:1420 |
| L Beam | vegeta | — | superGalick | abilities.js:1362 |
| L Beam | vegeta | — | diagGalick | abilities.js:1403 |
| L Beam | vegeta | — | finalFlash | abilities.js:1446 |
| L Beam | vegeta | — | bigBang | abilities.js:1508 |
| L Beam | yuji | — | yujiBeam | abilities.js:30424 |
| L Beam | yuta | — | yutaCem | abilities.js:13268 |
| K Moon / energy slash | goku_black | — | gbSuperKiSlash | abilities.js:36230 |
| K Moon / energy slash | goku_black | — | gbElectricSlash | abilities.js:36212 |
| K Moon / energy slash | gold_samurai_ranger | — | lightSlash, gold_light_slashwave | abilities.js:15031 |
| K Moon / energy slash | green_samurai_ranger | — | forestSpear, forest_spear_wave | abilities.js:15061 |
| K Moon / energy slash | gwen | — | gwenCrescent | abilities.js:9782 |
| K Moon / energy slash | ichigo | — | ichigo_getsuga | abilities.js:20801 |
| K Moon / energy slash | ichigo | — | ichigoAirGetsuga | abilities.js:20836 |
| K Moon / energy slash | ichigo | — | ichigoHollowGetsuga | abilities.js:20837 |
| K Moon / energy slash | ichigo | Getsuga Tenshō | ultimate | characters.js:6052 |
| K Moon / energy slash | mayuri | — | mayuriSlash | abilities.js:25123 |
| K Moon / energy slash | samurai_red_ranger | — | flameSlash, samurai_flameburst | abilities.js:14998 |
| K Moon / energy slash | sukuna | — | dismantle | abilities.js:3771 |
| K Moon / energy slash | vilgax | — | rubyCrescents | characters.js:9756 |
| K Moon / energy slash | yuji | — | yujiCrescent | abilities.js:30457 |
| K Moon / energy slash | zoro | — | zTaka, zoroTakaNami | zoroState.js:244 |
| H Fire breath | itachi | — | itachiFireball | abilities.js:27299 |
| H Fire breath | jiraiya | — | jiraiyaFire | abilities.js:7182 |
| H Fire breath | jiraiya | — | jiraiyaBigFire | abilities.js:7226 |
| H Fire breath | madara | — | madaraFireball | abilities.js:28110 |
| H Fire breath | madara | — | madaraGokaMekkyaku | abilities.js:27447 |
| H Fire breath | madara | — | madaraGoryuka | abilities.js:27466 |
| H Fire breath | rengoku | Flame Breathing: Rengoku (Flame Explosion) | ultimate | characters.js:2401 |
| H Fire breath | sasuke_adult | — | itachiFireball | abilities.js:33022 |
| H Fire breath | sasuke_sensei | — | ssFireball | abilities.js:5881 |
| H Fire breath | tobi | — | tobiFireGiant, tobiFireBurst, tobiFireSub | abilities.js:22130 |
| E Gatling | baki | — | bakiBarrage | abilities.js:23072 |
| E Gatling | dash_parr | Flurry (↓↘→ + Special) | flurry | dashParrData.js:45 |
| E Gatling | genos | — | genosMachinegun | abilities.js:9410 |
| E Gatling | hinata | — | hhHasangeki | abilities.js:6474 |
| E Gatling | homelander | — | hlBarrage | abilities.js:16098 |
| E Gatling | ippo | Dempsey Roll | ippoDempseyFlurry, ultimate | abilities.js:32075 |
| E Gatling | luffy | Gomu Gomu no Gatling (↓↘→) | lfGatling | luffyData.js:46 |
| E Gatling | netero | — | barragePunches | abilities.js:27077 |
| E Gatling | netero | 100-Type Guanyin Bodhisattva | guanyinCombo, ultimate | abilities.js:27074 |
| E Gatling | saitama | — | consecutivePunches | abilities.js:35085 |
| E Gatling | sanji | — | sHachis | sanjiData.js:57 |
| E Gatling | sanji | Party Table Kick Course | sPTKC, ultimate | sanjiData.js:63 |
| I Iai sword | miwa | — | iaiDash | abilities.js:20649 |
| I Iai sword | miwa | Blade of the Neophyte | ultimate | characters.js:5480 |
| I Iai sword | zenitsu | — | zenThunderclap | abilities.js:23300 |
| I Iai sword | zenitsu | — | zenThunderclap | characters.js:2310 |
| I Iai sword | zenitsu | — | godspeed | characters.js:2311 |
| I Iai sword | zenitsu | Thunder Breathing: Godspeed | zenUltimate, ultimate | abilities.js:23344 |
| I Iai sword | zoro | — | zOni | zoroData.js:29 |
| I Iai sword | zoro | — | zShishi, zShishiStrike | zoroData.js:34 |
| I Iai sword | zoro | Ashura: Ichibugin / Rengoku Onigiri | zAshura, ultimate | zoroData.js:41 |
| A Ice | frozone | Ice Lance | fLance, frozone_lance | frozoneData.js:38 |
| A Ice | frozone | Glacier Rush | fRush | frozoneData.js:40 |
| A Ice | frozone | Rising Glacier | fRise | frozoneData.js:44 |
| A Ice | frozone | Black Ice | fBlackIce, frozone_blackIce | frozoneData.js:47 |
| A Ice | frozone | Icebreaker | fBreaker | frozoneData.js:49 |
| A Ice | frozone | — | fWall, frozone_wall | frozoneData.js:51 |
| A Ice | frozone | ABSOLUTE ZERO: CITY ON ICE | ultOpen, ultimate | frozoneData.js:53 |
| A Ice | green_arrow | — | iceArrow | characters.js:4815 |
| A Ice | superman | — | freezeBreath | abilities.js:18060 |
| M Spiral orb | jiraiya | — | jiraiyaRasengan | abilities.js:7167 |
| M Spiral orb | jiraiya | — | jiraiyaChouOdama | abilities.js:7390 |
| M Spiral orb | kakashi | Raikiri | kakashiRaikiriDash, ultimate | abilities.js:32391 |
| M Spiral orb | kakashi_anbu | — | raikiri | abilities.js:10670 |
| M Spiral orb | kakashi_war | — | raikiri | abilities.js:11813 |
| M Spiral orb | minato | — | minatoRasengan, minatoRasenganOrb | abilities.js:3189 |
| M Spiral orb | minato | — | minatoBigBall, minatoBigBall | abilities.js:3216 |
| M Spiral orb | naruto | — | rasengan, rasenganOrb | abilities.js:3098 |
| M Spiral orb | naruto | — | bigBallRasengan, bigBallRasenganOrb | abilities.js:2824 |
| M Spiral orb | naruto | — | rasenshuriken | abilities.js:2794 |
| M Spiral orb | naruto | — | darkRasengan, darkRasenganRings | abilities.js:3005 |
| M Spiral orb | naruto_seventh | — | n7Rasengan | abilities.js:4857 |
| M Spiral orb | naruto_seventh | — | n7Rasenshuriken | abilities.js:4877 |
| M Spiral orb | naruto_seventh | — | n7RasenkyuganBall | abilities.js:5159 |
| M Spiral orb | naruto_seventh | — | n7Wakusei | abilities.js:5184 |
| M Spiral orb | sasuke | — | chidoriKoiten, chidoriKoitenFx | abilities.js:17087 |
| M Spiral orb | sasuke_adult | — | chidori, chidoriFx | abilities.js:33047 |
| M Spiral orb | sasuke_sensei | — | ssChidori | abilities.js:5804 |
| M Spiral orb | sasuke_sensei | — | ssChidoriEisou | abilities.js:5800 |
| M Spiral orb | sasuke_sensei | — | ssChidoriAir | abilities.js:5788 |
| G Rock line | hashirama | — | hashiCloneTree | abilities.js:28943 |
| G Rock line | hashirama | — | hashiTree | abilities.js:28868 |
| G Rock line | madara | — | madaraWoodSpike | abilities.js:28091 |
| G Rock line | madara | — | madaraWoodDragon, madaraWoodDragonBurst | abilities.js:28062 |
| G Rock line | madara | — | madaraJukai | abilities.js:27965 |
| G Rock line | madara | — | madaraKajukai | abilities.js:27943 |
| G Rock line | mr_incredible | Seismic Slam | miSlam | mrIncredibleData.js:15 |
| G Rock line | naruto_seventh | — | n7DotonWall | abilities.js:4901 |
| G Rock line | sakura | — | cherryImpact | characters.js:7016 |
| G Rock line | sakura | Daichi no Sakebi | ultimate | characters.js:6991 |
| D Spirit bomb | beerus | Ki Ball | ultimate | abilities.js:45 |
| D Spirit bomb | gaara | — | gaara_tbb | abilities.js:7003 |
| D Spirit bomb | goku | Transformation Ladder | gokuSpiritBomb, ultimate | abilities.js:853 |
| D Spirit bomb | goku_black | — | gbSpiritBomb | abilities.js:36168 |
| D Spirit bomb | madara | Susanoo | madaraBijuudama, madaraBijuCharge, ultimate | abilities.js:27876 |
| D Spirit bomb | naruto_seventh | Bijuudama (Tailed Beast Bomb) | n7Bijuudama, n7BijuuGather, ultimate | abilities.js:5248 |
| J Stretch punch | elastigirl | Long Arm | eLongArm, eLongPull, eLongWhiff | elastigirlData.js:62 |
| J Stretch punch | elastigirl | Overhead Whip | eWhip | elastigirlData.js:72 |
| J Stretch punch | elastigirl | — | light | elastigirlData.js:56 |
| J Stretch punch | luffy | Stretch Piston | lfPiston | luffyData.js:22 |
| J Stretch punch | luffy | Gomu Gomu no Bazooka (↓↙←) | lfBazooka | luffyData.js:49 |
| J Stretch punch | luffy | Reel-In | lfReel | luffyData.js:25 |
| J Stretch punch | luffy | Full-Stretch Finale | lfFinale, ultimate | luffyData.js:32 |
| J Stretch punch | luffy | — | lfStamp | luffyData.js:44 |
| F Water dragon | arlong | — | aShot | arlongData.js:59 |
| F Water dragon | arlong | — | aTidal, aKTidal | arlongData.js:55 |
| F Water dragon | arlong | Arlong Park | aSuper, ultimate | arlongData.js:63 |
| F Water dragon | tobirama | — | tobiWaterDragon | abilities.js:28586 |
| F Water dragon | tobirama | — | tobiWaterSlash | abilities.js:28567 |
| F Water dragon | tobirama | — | tobiRisingWater | abilities.js:28577 |
| F Water dragon | tobirama | — | tobiWaterWall | abilities.js:610 |

## Found but not wired (65)

| Breakdown | Fighter | Move | Why |
|---|---|---|---|
| D Spirit bomb | frieza | deathBall | fighter not playable (wiped / hidden) |
| D Spirit bomb | naruto_hokage | ultimate | fighter not playable (wiped / hidden) |
| D Spirit bomb | saiki | ultimate | loose match |
| L Beam | goku_rose | blackKamehameha | fighter not playable (wiped / hidden) |
| L Beam | gogeta | godKamehameha | fighter not playable (wiped / hidden) |
| L Beam | gogeta | ultimate | fighter not playable (wiped / hidden) |
| L Beam | vegito | galickGun | fighter not playable (wiped / hidden) |
| L Beam | vegito | bigBangAttack | fighter not playable (wiped / hidden) |
| L Beam | vegito | spreadFingerBeam | fighter not playable (wiped / hidden) |
| L Beam | vegito | ultimate | fighter not playable (wiped / hidden) |
| L Beam | frieza | deathBeam | fighter not playable (wiped / hidden) |
| L Beam | piccolo | specialBeamCannon | fighter not playable (wiped / hidden) |
| L Beam | piccolo | masenko | fighter not playable (wiped / hidden) |
| L Beam | piccolo | explosiveDemonWave | fighter not playable (wiped / hidden) |
| L Beam | cell | kamehameha | fighter not playable (wiped / hidden) |
| L Beam | cell | solarKamehameha | fighter not playable (wiped / hidden) |
| L Beam | gohan | ultimate | fighter not playable (wiped / hidden) |
| L Beam | iron_man | ultimate | fighter not playable (wiped / hidden) |
| L Beam | iron_man | special(neutral) | fighter not playable (wiped / hidden) |
| L Beam | iron_man_2 | ultimate | fighter not playable (wiped / hidden) |
| L Beam | iron_man_3 | special(forward) | fighter not playable (wiped / hidden) |
| L Beam | superman_classic | special(neutral) | fighter not playable (wiped / hidden) |
| L Beam | superman_classic | ultimate | fighter not playable (wiped / hidden) |
| L Beam | superman_fighter | special(neutral) | fighter not playable (wiped / hidden) |
| L Beam | superman_dcuc | special(neutral) | fighter not playable (wiped / hidden) |
| L Beam | superman_new52 | special(neutral) | fighter not playable (wiped / hidden) |
| L Beam | green_lantern | special | fighter not playable (wiped / hidden) |
| L Beam | brainiac | special(neutral) | fighter not playable (wiped / hidden) |
| L Beam | miles | milesBeam | fighter not playable (wiped / hidden) |
| L Beam | yamamoto | special(neutral) | fighter not playable (wiped / hidden) |
| L Beam | enoch | heatLens | Enoch is done (own eruption juice) |
| L Beam | saiki | lightning | loose match |
| M Spiral orb | boruto | special(neutral) | fighter not playable (wiped / hidden) |
| M Spiral orb | sasuke_adult | chidoriNagashi | loose match |
| E Gatling | goku | special(forward) | no runtime identifier |
| E Gatling | naruto_hokage | dashBarrage | fighter not playable (wiped / hidden) |
| E Gatling | yuji | special(air combo) | loose match |
| J Stretch punch | piccolo | stretchArm | fighter not playable (wiped / hidden) |
| J Stretch punch | naruto_hokage | chakraArm | fighter not playable (wiped / hidden) |
| F Water dragon | enoch | tideBreak | Enoch is done (own eruption juice) |
| F Water dragon | enoch | condense | Enoch is done (own eruption juice) |
| H Fire breath | hiruzen | fireball | fighter not playable (wiped / hidden) |
| H Fire breath | shisui_trinity | fireball | fighter not playable (wiped / hidden) |
| H Fire breath | shisui_puppeteer | gokakyu | fighter not playable (wiped / hidden) |
| H Fire breath | shisui_puppeteer | hosenka | fighter not playable (wiped / hidden) |
| H Fire breath | rengoku | chargedFlameStrike | loose match |
| G Rock line | hashirama | special(mokuton arm) | loose match |
| G Rock line | hiruzen | earthWall | fighter not playable (wiped / hidden) |
| G Rock line | baki | impactShockwave | loose match |
| I Iai sword | shisui_blade | iaido | fighter not playable (wiped / hidden) |
| I Iai sword | deathstroke | special(forward) | fighter not playable (wiped / hidden) |
| K Moon / energy slash | bardock | rebellion? | fighter not playable (wiped / hidden) |
| K Moon / energy slash | vegeta_dark | sickleThrow | loose match |
| A Ice | enoch | iceBlast | Enoch is done (own eruption juice) |
| A Ice | enoch | frostFloor | Enoch is done (own eruption juice) |
| A Ice | enoch | deepFreeze | Enoch is done (own eruption juice) |
| A Ice | enoch | iceDisc | Enoch is done (own eruption juice) |
| A Ice | enoch | iceWall | Enoch is done (own eruption juice) |
| A Ice | enoch | meteor | Enoch is done (own eruption juice) |
| A Ice | enoch | snowman | Enoch is done (own eruption juice) |
| A Ice | enoch | ultimate | Enoch is done (own eruption juice) |
| A Ice | superman_classic | special(down) | fighter not playable (wiped / hidden) |
| A Ice | superman_fighter | special(up) | fighter not playable (wiped / hidden) |
| A Ice | superman_fighter | special(down) | fighter not playable (wiped / hidden) |
| A Ice | superman_fighter | special(air) | fighter not playable (wiped / hidden) |
