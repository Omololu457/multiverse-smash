# MSV1-EDO ledger

One row per playable character. Sheets = default + form sheets given an `__edo` twin. Skin cols = palette colours mapped
to the ash ramp. Contact sheets: `docs/msv1/edo/sheets/<id>.png` (top original, bottom Edo). Overrides: tools/edoskin/overrides.json.

| id | class | sheets | skin cols | eyes | cracks | fix / verify | notes |
|---|---|---|---|---|---|---|---|
| `albedo` | HUMAN → EXCLUDED | — | — | — | — | — | Albedo's identity IS a recolour tag of Ben's art (fighters.js forces _recolorTag='albedo'); an Edo tag would replace it and turn him back into Ben, so no Edo skin. |
| `alt_sukuna` | HUMAN | 22 | 6 | black sclera | 3 face / 0 arm | automatic · verify ok | no bare forearm skin → 0 arm cracks |
| `aoi_todo` | HUMAN | 25 | 7 | black sclera | 6 face / 4 arm | automatic · verify ok |  |
| `arlong` | NONHUMAN | — | — | — | — | — | no Edo skin: fish-man (non-human skin and body) |
| `baki` | HUMAN | 22 | 9 | black sclera | 2 face / 2 arm | automatic · verify ok | face area 20px → 2 face cracks (wanted 5) |
| `batman` | MASKED | 1 | 0 | n/a (masked) | 1 face / 0 arm | automatic · verify ok |  |
| `beast_boy` | HUMAN | 42 | 4 | black sclera | 0 face / 0 arm | hand-fixed (addSkin) · verify ok | face area 0px → 0 face cracks (wanted 4); no bare forearm skin → 0 arm cracks; green skin is outside the warm skin detector: his four skin greens (idle face) are set as the skin palette by hand; teal hair stays hair; reviewed: green skin hand-set (overrides.json) |
| `beerus` | NONHUMAN | — | — | — | — | — | no Edo skin: cat-like god (non-human body) |
| `ben10` | HUMAN | 21 | 3 | black sclera | 3 face / 0 arm | automatic · verify ok | no bare forearm skin → 0 arm cracks |
| `buggy` | HUMAN | 44 | 2 | black sclera | 2 face / 3 arm | automatic · verify ok | face area 15px → 2 face cracks (wanted 3) |
| `byakuya` | HUMAN | 28 | 4 | black sclera | 3 face / 4 arm | automatic · verify ok |  |
| `chrollo` | HUMAN | 18 | 3 | black sclera | 3 face / 0 arm | automatic · verify ok | face area 27px → 3 face cracks (wanted 4) |
| `cyborg` | MASKED | 40 | 0 | n/a (masked) | 1 face / 0 arm | hand-fixed () · verify ok | his face shares its exact palette with the orange armour trim (#c06800 / #985000 / #601000 / #f88808): no separable skin, material treatment only; reviewed: face palette shared with armour trim → material treatment only |
| `dash_parr` | HUMAN | 27 | 4 | skipped: no separable whites | 4 face / 4 arm | automatic · verify ok |  |
| `dseyl` | HUMAN | 31 | 2 | black sclera | 6 face / 3 arm | automatic · verify ok |  |
| `elastigirl` | HUMAN | 40 | 5 | black sclera | 5 face / 0 arm | automatic · verify ok | no bare forearm skin → 0 arm cracks |
| `enoch` | HUMAN | 98 | 3 | skipped: no separable whites | 3 face / 0 arm | automatic · verify ok | face area 21px → 3 face cracks (wanted 6); no bare forearm skin → 0 arm cracks |
| `flash` | MASKED | 1 | 1 | n/a (masked) | 1 face / 0 arm | automatic · verify ok |  |
| `frozone` | HUMAN | 42 | 2 | black sclera | 1 face / 0 arm | automatic · verify ok | face area 9px → 1 face cracks (wanted 5); no bare forearm skin → 0 arm cracks; reviewed: dark skin mostly under the suit / goggles; subtle change |
| `gaara` | HUMAN | pending (later batch) | | | | | |
| `genos` | MASKED | pending (later batch) | | | | | |
| `ghostface` | MASKED → EXCLUDED | — | — | — | — | — | Ghostface has no base identity: every skin id is one of 5 killer identities (game.js applySkin forces one); an Edo skin id would be replaced by a random killer, and adding a list would change his selector. Tobirama's Edo Tensei keeps the live tint for him. |
| `gojo` | HUMAN | pending (later batch) | | | | | |
| `goku` | HUMAN | pending (later batch) | | | | | |
| `goku_black` | HUMAN | pending (later batch) | | | | | |
| `gold_samurai_ranger` | MASKED | pending (later batch) | | | | | |
| `green_arrow` | HUMAN | pending (later batch) | | | | | |
| `green_ranger` | MASKED | pending (later batch) | | | | | |
| `green_samurai_ranger` | MASKED | pending (later batch) | | | | | |
| `gwen` | HUMAN | pending (later batch) | | | | | |
| `hashirama` | HUMAN | pending (later batch) | | | | | |
| `higuruma` | HUMAN | pending (later batch) | | | | | |
| `hinata` | HUMAN | pending (later batch) | | | | | |
| `hisoka` | HUMAN | pending (later batch) | | | | | |
| `homelander` | HUMAN | pending (later batch) | | | | | |
| `ichigo` | HUMAN | pending (later batch) | | | | | |
| `inosuke` | HUMAN | pending (later batch) | | | | | |
| `ippo` | HUMAN | pending (later batch) | | | | | |
| `isshiki` | HUMAN | pending (later batch) | | | | | |
| `itachi` | HUMAN | pending (later batch) | | | | | |
| `jason` | MASKED | pending (later batch) | | | | | |
| `jesus` | HUMAN | pending (later batch) | | | | | |
| `jiraiya` | HUMAN | pending (later batch) | | | | | |
| `kakashi` | HUMAN | pending (later batch) | | | | | |
| `kakashi_anbu` | HUMAN | pending (later batch) | | | | | |
| `kakashi_war` | HUMAN | pending (later batch) | | | | | |
| `kevin_levin` | HUMAN | pending (later batch) | | | | | |
| `killua` | HUMAN | pending (later batch) | | | | | |
| `krybot` | MASKED | pending (later batch) | | | | | |
| `l_ryuuzaki` | HUMAN | pending (later batch) | | | | | |
| `light` | HUMAN | pending (later batch) | | | | | |
| `luffy` | HUMAN | pending (later batch) | | | | | |
| `madara` | ALREADY_EDO | — | — | — | — | — | no Edo skin: already a reanimated (Edo Tensei) body: the blood system already gives him crack:edo |
| `maki` | HUMAN | pending (later batch) | | | | | |
| `mayuri` | HUMAN | pending (later batch) | | | | | |
| `megumi_fushiguro` | HUMAN | pending (later batch) | | | | | |
| `minato` | HUMAN | pending (later batch) | | | | | |
| `miwa` | HUMAN | pending (later batch) | | | | | |
| `mmpr_black` | MASKED | pending (later batch) | | | | | |
| `mmpr_pink` | MASKED | pending (later batch) | | | | | |
| `mmpr_white` | MASKED | pending (later batch) | | | | | |
| `mr_incredible` | HUMAN | pending (later batch) | | | | | |
| `naruto` | NONHUMAN | — | — | — | — | — | no Edo skin: default sheet is the Nine-Tails chakra mode: an energy body |
| `naruto_seventh` | HUMAN | pending (later batch) | | | | | |
| `netero` | HUMAN | pending (later batch) | | | | | |
| `nezuko` | HUMAN | pending (later batch) | | | | | |
| `ninja_storm_cgpt` | MASKED | pending (later batch) | | | | | |
| `ninja_storm_rangers` | MASKED | pending (later batch) | | | | | |
| `obito` | HUMAN | pending (later batch) | | | | | |
| `omega_ranger` | MASKED | pending (later batch) | | | | | |
| `omololu` | HUMAN | pending (later batch) | | | | | |
| `pain` | HUMAN | pending (later batch) | | | | | |
| `raven` | HUMAN | pending (later batch) | | | | | |
| `red_ranger_mmpr` | MASKED | pending (later batch) | | | | | |
| `rengoku` | HUMAN | pending (later batch) | | | | | |
| `rick` | HUMAN | pending (later batch) | | | | | |
| `rickPrime` | HUMAN | pending (later batch) | | | | | |
| `robin` | HUMAN | pending (later batch) | | | | | |
| `saiki` | HUMAN | pending (later batch) | | | | | |
| `saitama` | HUMAN | pending (later batch) | | | | | |
| `sakura` | HUMAN | pending (later batch) | | | | | |
| `samurai_red_ranger` | MASKED | pending (later batch) | | | | | |
| `sanji` | HUMAN | pending (later batch) | | | | | |
| `sasuke` | HUMAN | pending (later batch) | | | | | |
| `sasuke_adult` | HUMAN | pending (later batch) | | | | | |
| `sasuke_sensei` | HUMAN | pending (later batch) | | | | | |
| `shinobu` | HUMAN | pending (later batch) | | | | | |
| `shisui_fallen` | HUMAN | pending (later batch) | | | | | |
| `six_paths_pain` | HUMAN | pending (later batch) | | | | | |
| `soldier_boy` | HUMAN | pending (later batch) | | | | | |
| `spd_blue` | MASKED | pending (later batch) | | | | | |
| `spd_green` | MASKED | pending (later batch) | | | | | |
| `spd_pink` | MASKED | pending (later batch) | | | | | |
| `spd_red` | MASKED | pending (later batch) | | | | | |
| `spd_yellow` | MASKED | pending (later batch) | | | | | |
| `spiderman` | MASKED | pending (later batch) | | | | | |
| `starfire` | HUMAN | pending (later batch) | | | | | |
| `sukuna` | HUMAN | pending (later batch) | | | | | |
| `superman` | HUMAN | pending (later batch) | | | | | |
| `syndrome` | HUMAN | pending (later batch) | | | | | |
| `tobi` | MASKED | pending (later batch) | | | | | |
| `tobirama` | TOBIRAMA | — | — | — | — | — | no Edo skin: the summoner |
| `toji` | HUMAN | pending (later batch) | | | | | |
| `vegeta` | HUMAN | pending (later batch) | | | | | |
| `vegeta_dark` | HUMAN | pending (later batch) | | | | | |
| `vilgax` | NONHUMAN | — | — | — | — | — | no Edo skin: Chimera Sui Generis alien |
| `violet` | HUMAN | pending (later batch) | | | | | |
| `windrangers` | MASKED | pending (later batch) | | | | | |
| `yuji` | HUMAN | pending (later batch) | | | | | |
| `yuta` | HUMAN | pending (later batch) | | | | | |
| `zaraki` | HUMAN | pending (later batch) | | | | | |
| `zaraki_shikai` | HUMAN | pending (later batch) | | | | | |
| `zenitsu` | HUMAN | pending (later batch) | | | | | |
| `zoro` | HUMAN | pending (later batch) | | | | | |
