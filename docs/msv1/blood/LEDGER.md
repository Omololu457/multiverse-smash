# MSV1-BLOOD — body-map ledger

One row per playable character. **Mapping**: `auto` = body mask / regions / anchors detected by `tools/bloodmap/build.py`
and accepted after looking at the contact sheet; `hand-fixed` = an `overrides` block in `data/bloodmaps/<id>.json`
(or a detector fix made because of this character, noted). **Checks** are measured on the Tier-4 contact sheet with the
runtime painter: max blood coverage of the opaque pixels (cap 15 %), blood pixels in the eye box (must be 0), blood
pixels outside the body alpha (must be 0). **Reviewed** = the batch whose contact sheets I inspected.

| id | name | mapping | overrides | fluid | unique / indexed frames | coverage max | eye px | outside px | reviewed | notes |
|---|---|---|---|---|---|---|---|---|---|---|
| `albedo` | Albedo | auto | 0 | blood (young) | 61 / 80 | 6.5% | 0 | 0 | batch 1 | young (tier cap 2, no spray/pool). Shares Ben's alien form maps (ALSO_MAPS). |
| `alt_sukuna` | Alternate Sukuna | auto | 0 | blood | 73 / 77 | 12.6% | 0 | 0 | batch 1 | pink hair over face handled by skin face box; red tattoos read under blood fine. |
| `aoi_todo` | Aoi Todo | auto | 0 | blood | 75 / 86 | 12.8% | 0 | 0 | batch 1 | bare torso: chest/abdomen cuts read clearly. |
| `arlong` | Arlong | auto | 0 | blood | 54 / 120 | 12.3% | 0 | 0 | batch 1 | long saw-nose: eye box sits on the face, not the nose. |
| `baki` | Baki Hanma | hand-fixed | 0 | blood | 121 / 125 | 11.6% | 0 | 0 | batch 1 | raised fists were taken for the face → detector now tracks the face cluster frame-to-frame; upside-down knockdown → 180° re-try when the head jumps (both fixes general). |
| `batman` | Batman | auto | 0 | blood | 113 / 1551 | 12.6% | 0 | 0 | batch 1 | cowl: face box on the lower face only; cape excluded from torso anchors. |
| `beast_boy` | Beast Boy | hand-fixed | 2 | blood | 139 / 3619 | 12.7% | 0 | 0 | batch 1 | green skin is not 'skin' to the detector → noFace + headSkip 0.08 (head wounds were in the hair). Human blood (canon red). |
| `beerus` | Beerus | hand-fixed | 2 | blood | 123 / 128 | 12.6% | 0 | 0 | batch 1 | tall ears read as the head → headSkip 0.14 + noFace. walk sheet's energy burst excluded by the body mask. |
| `ben10` | Ben 10 | auto | 0 | blood (young) | 1617 / 3596 | 6.5% | 0 | 0 | batch 1 | young. Omnitrix alien forms: FORM_FLUID (Upgrade oil, Diamondhead/Chromastone crystal crack, Heatblast magma crack, Alien X/Megawhatt none, Goop/Wildvine green). |
| `buggy` | Buggy | auto | 0 | blood | 127 / 364 | 12.6% | 0 | 0 | batch 1 | big coat: arms found inside the neck..hip band only. |
| `byakuya` | Byakuya Kuchiki | auto | 0 | blood | 96 / 134 | 12.4% | 0 | 0 | batch 1 | haori + scarf: trickles run over the white haori (reads well). |
| `chrollo` | Chrollo Lucilfer | auto | 0 | blood | 118 / 120 | 12.4% | 0 | 0 | batch 1 | fur collar excluded from the face box. |
| `cyborg` | Cyborg | auto | 0 | oil | 136 / 2385 | 11.1% | 0 | 0 | batch 1 | OIL: dark streaks + glossy 1 px sheen on the grey plates, sparks shed at T2+. |
| `dash_parr` | Dash | auto | 0 | blood (young) | 31 / 1092 | 11.6% | 0 | 0 | batch 1 | young. Speed blur frames are part of the sprite (mask excludes the detached blur). |
| `dseyl` | Dseyl | auto | 0 | blood | 30 / 145 | 12.5% | 0 | 0 | batch 1 | tribute; white shirt shows blood strongly — within the 15 % cap. |
| `elastigirl` | Elastigirl | auto | 0 | blood | 158 / 2431 | 12.1% | 0 | 0 | batch 2 | red suit: dark-red blood stays subtle on red (by design: grounded, never bright red). |
| `enoch` | Enoch | hand-fixed | 1 | blood | 46 / 337 | 11.6% | 0 | 0 | batch 2 | knockdown strip is the snowman / ice effect art → skip (no blood on effects). |
| `flash` | The Flash | hand-fixed | 4 | blood | 52 / 54 | 11.9% | 0 | 0 | batch 2 | run strip is mostly a painted speed trail the mask cannot separate → skip that strip only. |
| `frozone` | Frozone | hand-fixed | 0 | blood | 54 / 1248 | 10.6% | 0 | 0 | batch 2 | wide skating walk was laid down as lying → detector fix: wide frames with a face up top / tall in the cell stay upright (general). |
| `gaara` | Gaara | auto | 0 | sand | 100 / 113 | 9.2% | 0 | 0 | batch 2 | SAND: crumbling sand grains + dry sand cracks, grains fall and settle. |
| `genos` | Genos | auto | 0 | oil | 121 / 133 | 10.6% | 0 | 0 | batch 2 | OIL: cyborg arms/torso, sheen + sparks. |
| `ghostface` | Ghostface | hand-fixed | 2 | blood | 29 / 41 | 9.5% | 0 | 0 | batch 2 | white mask is not skin → knockdown: upright + noFace (the knife was taken for the face). Blood can show on the mask. |
| `gojo` | Gojo Satoru | auto | 0 | blood | 75 / 76 | 12.7% | 0 | 0 | batch 2 | blindfold region sits inside the eye box (never bled on). |
| `goku` | Goku | auto | 0 | blood | 56 / 57 | 11.9% | 0 | 0 | batch 2 | orange gi: dark blood darker than the gi shadow, reads at T3+. |
| `goku_black` | Goku Black | auto | 0 | blood | 99 / 99 | 12.5% | 0 | 0 | batch 2 |  |
| `gold_samurai_ranger` | Gold Samurai Ranger (Light) | hand-fixed | 0 | ranger | 103 / 124 | 11.4% | 0 | 0 | batch 2 | RANGER. light-attack energy slash took the hand anchors → detector fix: arm anchors > 0.6 body heights from the chest are dropped (slashes / whips / beams, general). |
| `green_arrow` | Green Arrow | hand-fixed | 1 | blood | 89 / 97 | 12.5% | 0 | 0 | batch 2 | hood: skin face box landed above the hood → noFace (head geometry). |
| `green_ranger` | Green Ranger | auto | 0 | ranger | 77 / 1166 | 11.9% | 0 | 0 | batch 2 | RANGER: tears + dark stains, torso / arms only. |
| `green_samurai_ranger` | Green Samurai Ranger (Forest) | hand-fixed | 1 | ranger | 94 / 102 | 11.1% | 0 | 0 | batch 2 | RANGER. light attack is a huge crescent slash → skip that strip. |
| `gwen` | Gwen | hand-fixed | 2 | blood | 39 / 46 | 11.8% | 0 | 0 | batch 2 | hurt (falling back) picked the feet as the head → headEnd left + lying. |
| `hashirama` | Hashirama Senju | auto | 0 | blood | 157 / 202 | 12.9% | 0 | 0 | — |  |
| `higuruma` | Hiromi Higuruma | auto | 0 | blood | 115 / 1826 | 12.7% | 0 | 0 | — |  |
| `hinata` | Hinata Hyuga | auto | 0 | blood | 108 / 113 | 12.7% | 0 | 0 | — |  |
| `hisoka` | Hisoka Morrow | auto | 0 | blood | 96 / 99 | 13.1% | 0 | 0 | — |  |
| `homelander` | Homelander | auto | 0 | blood | 37 / 44 | 13.0% | 0 | 0 | — |  |
| `ichigo` | Ichigo Kurosaki | auto | 0 | blood | 166 / 181 | 11.9% | 0 | 0 | — |  |
| `inosuke` | Inosuke Hashibira | auto | 0 | blood | 74 / 81 | 11.7% | 0 | 0 | — |  |
| `ippo` | Ippo Makunouchi | auto | 0 | blood | 87 / 96 | 12.5% | 0 | 0 | — |  |
| `isshiki` | Isshiki Otsutsuki | auto | 0 | blood | 54 / 62 | 13.2% | 0 | 0 | — |  |
| `itachi` | Itachi Uchiha | auto | 0 | blood | 86 / 88 | 12.9% | 0 | 0 | — |  |
| `jason` | Jason Voorhees | auto | 0 | blood | 44 / 45 | 8.5% | 0 | 0 | — |  |
| `jesus` | Jesus | auto | 0 | blood | 76 / 80 | 12.1% | 0 | 0 | — |  |
| `jiraiya` | Jiraiya | auto | 0 | blood | 127 / 137 | 13.1% | 0 | 0 | — |  |
| `kakashi` | Kakashi | auto | 0 | blood | 93 / 99 | 12.7% | 0 | 0 | — |  |
| `kakashi_anbu` | Kakashi (ANBU) | auto | 0 | blood | 99 / 102 | 13.1% | 0 | 0 | — |  |
| `kakashi_war` | Kakashi (Kamui) | auto | 0 | blood | 92 / 104 | 12.8% | 0 | 0 | — |  |
| `killua` | Killua Zoldyck | auto | 0 | blood | 123 / 133 | 12.7% | 0 | 0 | — |  |
| `krybot` | Krybot | auto | 0 | oil | 28 / 1806 | 11.1% | 0 | 0 | — |  |
| `l_ryuuzaki` | L | auto | 0 | blood | 114 / 155 | 12.8% | 0 | 0 | — |  |
| `light` | Light Yagami | auto | 0 | blood | 68 / 76 | 13.2% | 0 | 0 | — |  |
| `luffy` | Monkey D. Luffy | auto | 0 | blood | 147 / 221 | 7.9% | 0 | 0 | — |  |
| `madara` | Madara Uchiha | auto | 0 | crack:edo | 134 / 148 | 9.7% | 0 | 0 | — |  |
| `maki` | Maki Zenin | auto | 0 | blood | 89 / 95 | 12.4% | 0 | 0 | — |  |
| `mayuri` | Mayuri Kurotsuchi | auto | 0 | blood | 92 / 143 | 12.0% | 0 | 0 | — |  |
| `megumi_fushiguro` | Megumi Fushiguro | auto | 0 | blood | 402 / 3764 | 12.4% | 0 | 0 | — |  |
| `minato` | Minato Namikaze | auto | 0 | blood | 137 / 152 | 12.9% | 0 | 0 | — |  |
| `miwa` | Kasumi Miwa | auto | 0 | blood | 107 / 117 | 12.6% | 0 | 0 | — |  |
| `mmpr_black` | Black Ranger | auto | 0 | ranger | 54 / 658 | 11.9% | 0 | 0 | — |  |
| `mmpr_pink` | Pink Ranger | auto | 0 | ranger | 62 / 672 | 11.9% | 0 | 0 | — |  |
| `mmpr_white` | White Ranger | auto | 0 | ranger | 59 / 700 | 11.4% | 0 | 0 | — |  |
| `mr_incredible` | Mr. Incredible | auto | 0 | blood | 181 / 2882 | 12.1% | 0 | 0 | — |  |
| `naruto` | Naruto | auto | 0 | blood | 98 / 98 | 12.3% | 0 | 0 | — |  |
| `naruto_seventh` | Naruto (Seventh Hokage) | auto | 0 | blood | 218 / 230 | 12.5% | 0 | 0 | — |  |
| `netero` | Isaac Netero | auto | 0 | blood | 88 / 92 | 12.1% | 0 | 0 | — |  |
| `nezuko` | Nezuko Kamado | auto | 0 | blood (young) | 119 / 119 | 6.8% | 0 | 0 | — |  |
| `ninja_storm_cgpt` | Ninja Storm CGPT | auto | 0 | ranger | 264 / 6710 | 12.0% | 0 | 0 | — |  |
| `ninja_storm_rangers` | Ninja Storm Rangers | auto | 0 | ranger | 260 / 351 | 11.8% | 0 | 0 | — |  |
| `obito` | Obito Uchiha | auto | 0 | blood | 75 / 78 | 13.4% | 0 | 0 | — |  |
| `omega_ranger` | Omega Ranger (White Ranger, S.P.D.) | auto | 0 | ranger | 208 / 212 | 11.0% | 0 | 0 | — |  |
| `omololu` | Omololu | auto | 0 | blood | 75 / 78 | 13.2% | 0 | 0 | — |  |
| `pain` | Pain | auto | 0 | blood | 103 / 110 | 13.3% | 0 | 0 | — |  |
| `raven` | Raven | auto | 0 | blood | 133 / 3537 | 13.0% | 0 | 0 | — |  |
| `red_ranger_mmpr` | Red Ranger (Mighty Morphin) | auto | 0 | ranger | 95 / 96 | 11.1% | 0 | 0 | — |  |
| `rengoku` | Kyojuro Rengoku | auto | 0 | blood | 134 / 140 | 13.1% | 0 | 0 | — |  |
| `rick` | Rick Sanchez | auto | 0 | blood | 133 / 146 | 12.2% | 0 | 0 | — |  |
| `rickPrime` | Rick Prime | auto | 0 | blood | 133 / 146 | 12.5% | 0 | 0 | — |  |
| `robin` | Robin | auto | 0 | blood | 153 / 3344 | 12.3% | 0 | 0 | — |  |
| `saiki` | Saiki Kusuo | auto | 0 | blood (young) | 73 / 82 | 8.8% | 0 | 0 | — |  |
| `saitama` | Saitama | auto | 0 | blood | 195 / 213 | 11.5% | 0 | 0 | — |  |
| `sakura` | Sakura Haruno | auto | 0 | blood | 97 / 99 | 12.8% | 0 | 0 | — |  |
| `samurai_red_ranger` | Samurai Red Ranger (Fire) | auto | 0 | ranger | 157 / 169 | 10.5% | 0 | 0 | — |  |
| `sanji` | Sanji | auto | 0 | blood | 52 / 147 | 8.8% | 0 | 0 | — |  |
| `sasuke` | Sasuke | auto | 0 | blood | 94 / 94 | 12.8% | 0 | 0 | — |  |
| `sasuke_adult` | Sasuke (Adult) | auto | 0 | blood | 103 / 105 | 12.4% | 0 | 0 | — |  |
| `sasuke_sensei` | Sasuke (Sensei) | auto | 0 | blood | 170 / 174 | 13.0% | 0 | 0 | — |  |
| `shinobu` | Shinobu Kocho | auto | 0 | blood | 82 / 84 | 13.2% | 0 | 0 | — |  |
| `shisui_fallen` | Shisui (Fallen) | auto | 0 | blood | 49 / 51 | 12.3% | 0 | 0 | — |  |
| `six_paths_pain` | Six Paths of Pain | auto | 0 | blood | 57 / 57 | 12.7% | 0 | 0 | — |  |
| `soldier_boy` | Soldier Boy | auto | 0 | blood | 138 / 153 | 7.9% | 0 | 0 | — |  |
| `spd_blue` | S.P.D. Blue Ranger | auto | 0 | ranger | 34 / 1694 | 11.4% | 0 | 0 | — |  |
| `spd_green` | S.P.D. Green Ranger | auto | 0 | ranger | 49 / 679 | 11.1% | 0 | 0 | — |  |
| `spd_pink` | S.P.D. Pink Ranger | auto | 0 | ranger | 42 / 672 | 11.1% | 0 | 0 | — |  |
| `spd_red` | SPDRed | auto | 0 | ranger | 48 / 112 | 11.5% | 0 | 0 | — |  |
| `spd_yellow` | S.P.D. Yellow Ranger | auto | 0 | ranger | 48 / 774 | 11.3% | 0 | 0 | — |  |
| `spiderman` | Spider-Man | auto | 0 | blood | 145 / 152 | 11.2% | 0 | 0 | — |  |
| `starfire` | Starfire | auto | 0 | blood | 122 / 3091 | 12.6% | 0 | 0 | — |  |
| `sukuna` | Sukuna | auto | 0 | blood | 41 / 46 | 13.5% | 0 | 0 | — |  |
| `superman` | Superman | auto | 0 | blood | 32 / 36 | 12.5% | 0 | 0 | — |  |
| `syndrome` | Syndrome | auto | 0 | blood | 439 / 2355 | 12.9% | 0 | 0 | — |  |
| `tobi` | Tobi | auto | 0 | blood | 86 / 88 | 12.9% | 0 | 0 | — |  |
| `tobirama` | Tobirama Senju | auto | 0 | blood | 124 / 145 | 12.7% | 0 | 0 | — |  |
| `toji` | Toji Fushiguro | auto | 0 | blood | 148 / 156 | 12.5% | 0 | 0 | — |  |
| `vegeta` | Vegeta | auto | 0 | blood | 263 / 268 | 11.5% | 0 | 0 | — |  |
| `vegeta_dark` | Dark Vegeta | auto | 0 | blood | 64 / 65 | 10.6% | 0 | 0 | — |  |
| `vilgax` | Vilgax | auto | 0 | alien:green | 78 / 87 | 12.7% | 0 | 0 | — |  |
| `violet` | Violet Parr | auto | 0 | blood (young) | 109 / 1830 | 9.1% | 0 | 0 | — |  |
| `windrangers` | Ninja Storm MS_V1 Ranger Version | auto | 0 | ranger | 255 / 3516 | 12.0% | 0 | 0 | — |  |
| `yuji` | Yuji Itadori | auto | 0 | blood | 150 / 174 | 11.6% | 0 | 0 | — |  |
| `yuta` | Yuta Okkotsu | auto | 0 | blood | 102 / 103 | 13.2% | 0 | 0 | — |  |
| `zaraki` | Zaraki Kenpachi | auto | 0 | blood | 126 / 132 | 13.1% | 0 | 0 | — |  |
| `zaraki_shikai` | Zaraki Kenpachi (Shikai) | auto | 0 | blood | 173 / 184 | 12.2% | 0 | 0 | — |  |
| `zenitsu` | Zenitsu Agatsuma | auto | 0 | blood | 73 / 86 | 11.0% | 0 | 0 | — |  |
| `zoro` | Zoro | auto | 0 | blood | 30 / 99 | 9.7% | 0 | 0 | — |  |

**113 characters · 11 hand-fixed · 102 auto · 30 reviewed.**

