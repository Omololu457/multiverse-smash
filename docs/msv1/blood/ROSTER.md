# MSV1-BLOOD — playable roster + sprite sets

Source: `tools/bloodmap/enumerate.mjs` on the clean start commit (see START_COMMIT.txt). Every playable character (113),
with the animation sets it can draw: its own art (characters.js), skin art (skins.js) and form / transformation art
found in module exports (assigned by asset directory or, for root-level sheets, by file-name prefix).
Recolour skins named `<sheet>__<tag>.png` share the base frame map at runtime (the tag is stripped before lookup).

| # | id | name | universe | own defs | skin defs | form defs | frames (all sets) |
|---|---|---|---|---|---|---|---|
| 1 | `albedo` | Albedo | ben_10 | 23 | 23 | 0 | 80 |
| 2 | `alt_sukuna` | Alternate Sukuna | jujutsu_kaisen | 22 | 264 | 0 | 1001 |
| 3 | `aoi_todo` | Aoi Todo | jujutsu_kaisen | 25 | 300 | 0 | 1118 |
| 4 | `arlong` | Arlong | one_piece | 48 | 0 | 672 | 1800 |
| 5 | `baki` | Baki Hanma | baki | 23 | 69 | 0 | 500 |
| 6 | `batman` | Batman | dc | 48 | 480 | 0 | 1551 |
| 7 | `beast_boy` | Beast Boy | dc | 42 | 420 | 0 | 3619 |
| 8 | `beerus` | Beerus | dragon_ball | 23 | 184 | 0 | 1152 |
| 9 | `ben10` | Ben 10 | ben_10 | 23 | 23 | 992 | 3596 |
| 10 | `buggy` | Buggy | one_piece | 44 | 440 | 138 | 1244 |
| 11 | `byakuya` | Byakuya Kuchiki | bleach | 28 | 448 | 0 | 2278 |
| 12 | `chrollo` | Chrollo Lucilfer | hunter_x_hunter | 19 | 152 | 0 | 1080 |
| 13 | `cyborg` | Cyborg | dc | 40 | 320 | 0 | 2385 |
| 14 | `dash_parr` | Dash | the_incredibles | 27 | 324 | 0 | 1092 |
| 15 | `dseyl` | Dseyl | original | 31 | 0 | 0 | 145 |
| 16 | `elastigirl` | Elastigirl | the_incredibles | 40 | 480 | 0 | 2431 |
| 17 | `enoch` | Enoch | the_incredibles | 98 | 0 | 0 | 341 |
| 18 | `flash` | The Flash | dc | 16 | 144 | 0 | 560 |
| 19 | `frozone` | Frozone | the_incredibles | 37 | 370 | 5 | 1248 |
| 20 | `gaara` | Gaara | naruto | 23 | 161 | 0 | 904 |
| 21 | `genos` | Genos | one_punch_man | 25 | 325 | 0 | 1862 |
| 22 | `ghostface` | Ghostface | horror | 20 | 0 | 0 | 41 |
| 23 | `gojo` | Gojo Satoru | jujutsu_kaisen | 17 | 119 | 0 | 608 |
| 24 | `goku` | Goku | dragon_ball | 20 | 0 | 0 | 57 |
| 25 | `goku_black` | Goku Black | dragon_ball | 17 | 272 | 0 | 1683 |
| 26 | `gold_samurai_ranger` | Gold Samurai Ranger (Light) | power_rangers | 15 | 225 | 0 | 1984 |
| 27 | `green_arrow` | Green Arrow | dc | 31 | 248 | 0 | 873 |
| 28 | `green_ranger` | Green Ranger | power_rangers | 42 | 420 | 0 | 1166 |
| 29 | `green_samurai_ranger` | Green Samurai Ranger (Forest) | power_rangers | 14 | 42 | 0 | 424 |
| 30 | `gwen` | Gwen | ben_10 | 19 | 247 | 0 | 644 |
| 31 | `hashirama` | Hashirama Senju | naruto | 31 | 899 | 0 | 6060 |
| 32 | `higuruma` | Hiromi Higuruma | jujutsu_kaisen | 39 | 390 | 0 | 1826 |
| 33 | `hinata` | Hinata Hyuga | naruto | 20 | 60 | 0 | 452 |
| 34 | `hisoka` | Hisoka Morrow | hunter_x_hunter | 20 | 280 | 0 | 1485 |
| 35 | `homelander` | Homelander | dc | 18 | 216 | 0 | 572 |
| 36 | `ichigo` | Ichigo Kurosaki | bleach | 34 | 510 | 0 | 2896 |
| 37 | `inosuke` | Inosuke Hashibira | demon_slayer | 23 | 368 | 0 | 1377 |
| 38 | `ippo` | Ippo Makunouchi | hajime_no_ippo | 27 | 351 | 0 | 1344 |
| 39 | `isshiki` | Isshiki Otsutsuki | naruto | 24 | 384 | 0 | 1054 |
| 40 | `itachi` | Itachi Uchiha | naruto | 15 | 105 | 0 | 704 |
| 41 | `jason` | Jason Voorhees | horror | 13 | 208 | 0 | 765 |
| 42 | `jesus` | Jesus | divine | 14 | 28 | 0 | 240 |
| 43 | `jiraiya` | Jiraiya | naruto | 22 | 0 | 0 | 137 |
| 44 | `kakashi` | Kakashi | naruto | 26 | 78 | 0 | 396 |
| 45 | `kakashi_anbu` | Kakashi (ANBU) | naruto | 22 | 110 | 0 | 612 |
| 46 | `kakashi_war` | Kakashi (Kamui) | naruto | 27 | 182 | 0 | 804 |
| 47 | `killua` | Killua Zoldyck | hunter_x_hunter | 21 | 231 | 0 | 1596 |
| 48 | `krybot` | Krybot | power_rangers | 30 | 600 | 0 | 1806 |
| 49 | `l_ryuuzaki` | L | deathnote | 21 | 315 | 0 | 2480 |
| 50 | `light` | Light Yagami | deathnote | 13 | 156 | 0 | 988 |
| 51 | `luffy` | Monkey D. Luffy | one_piece | 39 | 342 | 0 | 2147 |
| 52 | `madara` | Madara Uchiha | naruto | 21 | 189 | 0 | 1480 |
| 53 | `maki` | Maki Zenin | jujutsu_kaisen | 22 | 374 | 0 | 1710 |
| 54 | `mayuri` | Mayuri Kurotsuchi | bleach | 22 | 352 | 0 | 2431 |
| 55 | `megumi_fushiguro` | Megumi Fushiguro | jujutsu_kaisen | 42 | 420 | 12 | 3764 |
| 56 | `minato` | Minato Namikaze | naruto | 21 | 315 | 0 | 2432 |
| 57 | `miwa` | Kasumi Miwa | jujutsu_kaisen | 25 | 375 | 0 | 1872 |
| 58 | `mmpr_black` | Black Ranger | power_rangers | 38 | 228 | 0 | 658 |
| 59 | `mmpr_pink` | Pink Ranger | power_rangers | 36 | 216 | 0 | 672 |
| 60 | `mmpr_white` | White Ranger | power_rangers | 41 | 246 | 0 | 700 |
| 61 | `mr_incredible` | Mr. Incredible | the_incredibles | 47 | 470 | 0 | 2882 |
| 62 | `naruto` | Naruto | naruto | 17 | 126 | 0 | 822 |
| 63 | `naruto_seventh` | Naruto (Seventh Hokage) | naruto | 33 | 130 | 0 | 860 |
| 64 | `netero` | Isaac Netero | hunter_x_hunter | 14 | 112 | 0 | 828 |
| 65 | `nezuko` | Nezuko Kamado | demon_slayer | 35 | 455 | 0 | 1666 |
| 66 | `ninja_storm_cgpt` | Ninja Storm CGPT | power_rangers | 58 | 1218 | 0 | 6710 |
| 67 | `ninja_storm_rangers` | Ninja Storm Rangers | power_rangers | 60 | 0 | 11 | 351 |
| 68 | `obito` | Obito Uchiha | naruto | 23 | 414 | 0 | 1482 |
| 69 | `omega_ranger` | Omega Ranger (White Ranger, S.P.D.) | power_rangers | 29 | 435 | 290 | 5512 |
| 70 | `omololu` | Omololu | original | 23 | 184 | 0 | 702 |
| 71 | `pain` | Pain | naruto | 24 | 312 | 0 | 1540 |
| 72 | `raven` | Raven | dc | 44 | 440 | 1 | 3537 |
| 73 | `red_ranger_mmpr` | Red Ranger (Mighty Morphin) | power_rangers | 21 | 294 | 0 | 1440 |
| 74 | `rengoku` | Kyojuro Rengoku | demon_slayer | 30 | 300 | 0 | 1540 |
| 75 | `rick` | Rick Sanchez | rick_and_morty | 17 | 221 | 0 | 2044 |
| 76 | `rickPrime` | Rick Prime | rick_and_morty | 17 | 51 | 0 | 584 |
| 77 | `robin` | Robin | dc | 40 | 400 | 0 | 3344 |
| 78 | `saiki` | Saiki Kusuo | saiki_k | 18 | 126 | 0 | 656 |
| 79 | `saitama` | Saitama | one_punch_man | 28 | 448 | 0 | 3621 |
| 80 | `sakura` | Sakura Haruno | naruto | 21 | 63 | 0 | 396 |
| 81 | `samurai_red_ranger` | Samurai Red Ranger (Fire) | power_rangers | 15 | 105 | 0 | 1352 |
| 82 | `sanji` | Sanji | one_piece | 45 | 450 | 7 | 1377 |
| 83 | `sasuke` | Sasuke | naruto | 16 | 128 | 0 | 846 |
| 84 | `sasuke_adult` | Sasuke (Adult) | naruto | 26 | 0 | 0 | 105 |
| 85 | `sasuke_sensei` | Sasuke (Sensei) | naruto | 35 | 0 | 0 | 174 |
| 86 | `shinobu` | Shinobu Kocho | demon_slayer | 20 | 220 | 0 | 1008 |
| 87 | `shisui_fallen` | Shisui (Fallen) | naruto | 13 | 0 | 0 | 51 |
| 88 | `six_paths_pain` | Six Paths of Pain | naruto | 17 | 238 | 0 | 855 |
| 89 | `soldier_boy` | Soldier Boy | marvel | 31 | 155 | 0 | 918 |
| 90 | `spd_blue` | S.P.D. Blue Ranger | power_rangers | 31 | 651 | 0 | 1694 |
| 91 | `spd_green` | S.P.D. Green Ranger | power_rangers | 42 | 252 | 0 | 679 |
| 92 | `spd_pink` | S.P.D. Pink Ranger | power_rangers | 42 | 252 | 0 | 672 |
| 93 | `spd_red` | SPDRed | power_rangers | 44 | 0 | 440 | 1232 |
| 94 | `spd_yellow` | S.P.D. Yellow Ranger | power_rangers | 38 | 304 | 0 | 774 |
| 95 | `spiderman` | Spider-Man | marvel | 23 | 0 | 0 | 152 |
| 96 | `starfire` | Starfire | dc | 38 | 380 | 0 | 3091 |
| 97 | `sukuna` | Sukuna | jujutsu_kaisen | 10 | 135 | 0 | 706 |
| 98 | `superman` | Superman | dc | 20 | 400 | 0 | 756 |
| 99 | `syndrome` | Syndrome | the_incredibles | 31 | 372 | 92 | 2355 |
| 100 | `tobi` | Tobi | naruto | 21 | 420 | 0 | 1848 |
| 101 | `tobirama` | Tobirama Senju | naruto | 27 | 216 | 0 | 1305 |
| 102 | `toji` | Toji Fushiguro | jujutsu_kaisen | 25 | 450 | 0 | 2964 |
| 103 | `vegeta` | Vegeta | dragon_ball | 29 | 232 | 0 | 2412 |
| 104 | `vegeta_dark` | Dark Vegeta | dragon_ball | 19 | 228 | 0 | 845 |
| 105 | `vilgax` | Vilgax | ben_10 | 25 | 0 | 0 | 87 |
| 106 | `violet` | Violet Parr | the_incredibles | 36 | 432 | 5 | 1830 |
| 107 | `windrangers` | Ninja Storm MS_V1 Ranger Version | power_rangers | 53 | 530 | 53 | 3516 |
| 108 | `yuji` | Yuji Itadori | jujutsu_kaisen | 25 | 400 | 0 | 2958 |
| 109 | `yuta` | Yuta Okkotsu | jujutsu_kaisen | 20 | 160 | 0 | 927 |
| 110 | `zaraki` | Zaraki Kenpachi | bleach | 25 | 325 | 0 | 1848 |
| 111 | `zaraki_shikai` | Zaraki Kenpachi (Shikai) | bleach | 31 | 93 | 0 | 736 |
| 112 | `zenitsu` | Zenitsu Agatsuma | demon_slayer | 19 | 190 | 0 | 946 |
| 113 | `zoro` | Zoro | one_piece | 44 | 352 | 0 | 891 |

**Totals:** 113 characters · 3202 own defs · 29297 skin defs · 2718 form defs · 165354 frames.

## Forms / transformations (runtime art swaps)

Form art is swapped in at runtime through `fighter._skinAnim` (35 sites in abilities.js: Goku / Vegeta / Gohan forms,
Naruto Seventh KCM / Four Tails, Jiraiya Sage, Dark Vegeta Rosé, Handler → Mahoraga, Boruto Karma, Orochimaru forms,
copy / disguise abilities) or through the Omnitrix (`fighter.transformed` + `activeAlien`, Ben 10 alien bodies in
`aliens.js`, root-level `ben10_<alien>_*` sheets — 992 alien defs mapped under `ben10`, shared with Albedo). The MSV1
duo `windrangers` swaps between the ns_red / ns_yellow sets (both mapped under `windrangers`).
Form sets built by private factory functions (e.g. `gokuFormAnim("ssj")`) are not visible to a static scan; the runtime
falls back to the same ACTION with the same cell layout in the character's own map (recolour / hair-edit forms share
the silhouette), and `harness/blood_coverage.mjs` reports any frame still unmapped.
