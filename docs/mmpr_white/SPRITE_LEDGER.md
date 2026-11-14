# White Ranger (`mmpr_white`) — SPRITE LEDGER

Source: `Sega Genesis - Mighty Morphin Power Rangers_ The Movie - Rangers - White Ranger.gif`
- sha256 `833beb9a16c40ef59f3880493fb80e308d2ef17b50418cedf5da2bad5acf8459` · 460×996 · GIF mode P · transparency index 74
- Key policy: GIF transparency index 74 only; every opaque pixel (incl. visor/shield black index 0, outline (32,32,32)) is kept
- Credit (transcribed from the sheet's own credit panel at 318,508,105,69): **"Sprites ripped by Belial the Hedgehog."** — cut to a credit panel and shown in the in-game credits entry; never used as a frame.
- Strip frame 208×128, anchor origin (104,118). Nearest-neighbour only, no resampling, no new pixels.
- Every connected component of the sheet is assigned to exactly one cell (extract.py asserts this); a cell may be a union of components (a strike + its detached trail/slash).

| Cell | Source rect x,y,w,h | Kind | Status | Used in |
|---|---|---|---|---|
| ready0 | 2,2,40,71 | body | used (reused) | getup, idle |
| ready1 | 47,1,39,70 | body | used | idle |
| ready2 | 94,1,40,72 | body | used | idle |
| walk0 | 1,83,41,70 | body | used (reused) | walk, walk_back |
| walk1 | 44,80,37,71 | body | used (reused) | walk, walk_back |
| walk2 | 88,78,23,72 | body | used (reused) | walk, walk_back |
| walk3 | 118,79,39,70 | body | used (reused) | walk, walk_back |
| walk4 | 161,78,31,71 | body | used (reused) | walk, walk_back |
| walk5 | 198,77,29,72 | body | used (reused) | walk, walk_back |
| run0 | 1,162,49,67 | body | used | run |
| run1 | 49,160,49,68 | body | used | run |
| run2 | 103,161,34,64 | body | used | run |
| run3 | 138,159,52,67 | body | used | run |
| run4 | 185,159,56,68 | body | used (reused) | dash, run |
| run5 | 248,162,32,64 | body | used | run |
| crouch0 | 7,264,44,50 | body | used (reused) | crouch, up, wLow |
| riseKick0 | 60,235,44,80 | body | used (reused) | up, wAscent |
| highKick0 | 111,241,53,72 | body | used | up |
| airKick0 | 176,245,61,64 | body | used (reused) | air, down_air, ultKick |
| flipKick0 | 247,234,55,80 | body | used | wKnock |
| trailLand0 | 313,243,55,65 | body | **unused** — landing pose with a baked motion trail; Descent/Ascent landings use the clean `land0`, a trail on every landing would overstate speed | — |
| punch0 | 5,329,62,70 | body | used (reused) | grab, light |
| punch1 | 68,326,47,71 | body | used (reused) | grab, light |
| punch2 | 122,325,51,70 | body | used | wCall |
| step0 | 178,325,50,69 | body | used | wAdv |
| lunge0 | 234,330,68,62 | body | used | wAdv |
| stance0 | 3,408,52,65 | body | used | wJ3 |
| turn0 | 61,408,45,66 | body | used | wJ2 |
| pivot0 | 108,406,53,70 | body | used | wJ2 |
| frontKick0 | 171,407,56,69 | body | used | wJ3 |
| lowKick0 | 236,403,54,69 | body | used | wLow |
| stance1 | 294,405,52,65 | body | used (reused) | wAnswer, wKnock |
| hold0 | 3,488,30,63 | body | used (reused) | intro, ultLand, wAnswer, wFeint |
| sabaDraw0 | 36,488,49,65 | body | used (reused) | heavy, ultOpen, wAnswer, wFeint, win |
| sabaCut0 | 94,486,92,64 | body | used (reused) | heavy, ultFinal, ultOpen, wAnswer, wSaba |
| sabaWind0 | 194,481,85,72 | body | used (reused) | heavy, ultFinal, ultOpen, wAnswer, wSaba |
| compact0 | 1,568,36,59 | body | used | wAscent |
| uppercut0 | 49,560,41,83 | body | **unused** — rising uppercut; the launcher is the brief's Rising Tiger KICK (FOOT discipline), a punch launcher would mislabel the discipline | — |
| compact1 | 95,572,49,65 | body | **unused** — second tuck frame; Ascent reads cleanly with compact0 → riseKick0 → air0 | — |
| air0 | 148,563,47,68 | body | used (reused) | fall, wAscent |
| flyKick0 | 221,574,70,48 | body | used | wDescent |
| ball0 | 393,610,36,36 | body | used (reused) | air, jump, wDescent |
| rot0 | 3,659,44,63 | body | **unused** — somersault rotation; no move in the brief is a flip (jump uses ball0) | — |
| cart0 | 52,652,83,60 | body | used | intro |
| hand0 | 136,646,63,68 | body | used | intro |
| dive0 | 207,666,72,37 | body | used | blink |
| reach0 | 282,642,38,80 | body | used (reused) | wCall, wOrder |
| land0 | 328,652,48,56 | body | used (reused) | intro, ultLand |
| roll0 | 378,650,38,34 | body | used | jump |
| roll1 | 419,647,41,34 | body | used | jump |
| jump0 | 6,737,45,76 | body | used (reused) | jump, ultKick |
| flip0 | 62,744,44,63 | body | **unused** — pixel-identical duplicate of rot0 (see Duplicates) | — |
| flip1 | 114,743,56,48 | body | **unused** — somersault rotation; no flip move in the brief | — |
| flip2 | 182,746,48,54 | body | **unused** — somersault rotation; no flip move in the brief | — |
| kneel0 | 237,746,45,46 | body | used | getup |
| guard0 | 3,826,54,67 | body | used | guard |
| recoil0 | 59,828,54,65 | body | used | hurt2 |
| flinch0 | 118,828,45,66 | body | used | hurt |
| stagger0 | 164,844,59,48 | body | used | stagger |
| down0 | 6,906,36,58 | body | used | lose |
| down1 | 54,897,37,71 | body | used | lose |
| down2 | 99,903,49,59 | body | used (reused) | knockdown, lose |
| down3 | 156,903,61,45 | body | used (reused) | knockdown, lose |
| down4 | 225,922,64,48 | body | used | launched |
| prone0 | 217,898,73,22 | body | used (reused) | knockdown, lose |
| sit0 | 296,908,44,44 | body | used | getup |
| (credit panel) | 318,508,105,69 | credit | transcribed, not a frame | credits entry |

Duplicates: `flip0` = `rot0` (pixel-identical)

## Saba (honest accounting)
The supplied sheet draws the Saba blade in exactly ONE cell: `sabaWind0` (the wind-up with the blade raised). `sabaCut0` is the body
follow-through PLUS a detached slash streak (the cut itself); `hold0` / `sabaDraw0` grip the Saba at the chest (hilt only). No sword was
drawn into any other pose: BLADE moves (Heavy Saba Cut, wSaba, Saba's Answer, ultimate finale) are built from these four cells only, and every
other move is unarmed. The skins keep the blade region (sabaWind0 cell px 0,0–29,16) untouched.

Hitboxes come from move data (rangeX/rangeY/boxY), never from sprite pixels; the hurtbox is the roster-standard 48×94.
Generated by `tools/mmpr_white/extract.py`; contact sheet `docs/mmpr_white/contact_sheet.png`.
