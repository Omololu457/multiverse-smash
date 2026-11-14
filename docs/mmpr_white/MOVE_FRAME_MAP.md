# White Ranger (`mmpr_white`) — MOVE → FRAME MAP

All moves use the engine's `frameExact` path: **startup** = frames before the first active frame, **total = startup + active + recovery** (verified through real key input by `harness/mmpr_white.test.mjs`, results in `mechanics_results.json`).
Damage: `raw` is the brief's number; the stored `damage` is `round(raw × 1.7)` (`MMPR_WHITE_DAMAGE_SCALE`, the same roster-parity lever as Black), then the engine's global 0.60 and combo scaling apply (a raw-18 J1 deals 18 HP).
Hitboxes come from move data (`rangeX/rangeY/boxY`), never from sprite pixels; the hurtbox is the roster-standard 48×94. Discipline = what a CLEAN (unblocked) hit grants toward Formation.

| Move (key) | Input | Strip cells (tick→cell) | S / A / R | Total | Raw | Disc. | Notes |
|---|---|---|---|---|---|---|---|
| Open Palm J1 (`light`) | Light | punch1 → punch0@4 | 5/2/10 | 17 | 18 | HAND | hitstun 21 |
| Body Check J2 (`wJ2`) | fresh Light on clean J1 | pivot0 → turn0@6 | 7/2/12 | 21 | 22 | HAND | whiff/block never chains |
| Tiger Heel J3 (`wJ3`) | fresh Light on clean J2 | stance0 → frontKick0@9 | 10/3/18 | 31 | 30 | HAND | third stage max (the J-chain is the HAND discipline) |
| Saba Cut (`heavy`) | Heavy | sabaDraw0 → sabaWind0@8 → sabaCut0@14 | 14/3/26 | 43 | 56 | BLADE | slash, reach 92; cancels from J1/J2/J3/Low Heel |
| Low Heel (`wLow`) | Down+Light / Down+Heavy | crouch0 → lowKick0@7 | 8/2/16 | 26 | 25 | FOOT | low |
| Rising Tiger (`up`) | Up+Heavy / Up-attack | crouch0 → riseKick0@11 → highKick0@16 | 12/3/22 | 37 | 44 | FOOT | launcher (vy −21), Tommy stays grounded; clean hit → engine launcher jump-cancel |
| Air Turning Heel (`air`) | Light/Heavy in air | ball0 → airKick0@7 | 8/3/17 | 28 | 32 | — | disciplines are grounded only |
| Advancing Strike (`wAdv`) | Forward+Heavy | step0 → lunge0@9 | 10/3/19 | 32 | 24 | — | travels 4 px/f f2-10 |
| Saba Follow (`wSaba`) | fresh Heavy on clean wAdv | sabaWind0 → sabaCut0@12 | 12/3/21 | 36 | 32 | BLADE | |
| Knock-away (`wKnock`) | fresh Heavy on clean wSaba | stance1 → flipKick0@13 | 14/3/26 | 43 | 44 | FOOT | confirmed Up+Heavy replaces it with `up` |
| Saba's Answer (`wAnswer`) | Neutral Special | hold0 → sabaDraw0@4 → sabaWind0@8 → sabaCut0@13 → stance1@26 | 13/3/28 | 44 | 46 | BLADE | 15 Energy; front edge 142 px from Tommy's centre (target 140) |
| Answer feint (`wFeint`) | Block on Answer startup f1-9 | sabaDraw0 → hold0@4 | —/—/12 | 12 | — | — | no hitbox, Energy stays spent |
| White Tiger Ascent (`wAscent`) | Down+Special (ground) | compact0 → riseKick0@9 → air0@16 | 10/8/20 | 38 | 42 | FOOT | leaves ground f9; once per airtime; 16 f landing |
| Tiger Descent (`wDescent`) | Down+Special (air) | ball0 → flyKick0@11 | 12/≤40/0 | ≤52 | 44 | — | vy capped 14, vx 5; 24 f landing; once per airtime |
| Order call (`wCall`) | Fwd / Up / Back + Special (ground) | punch2 → reach0@12 | 12/1/14 | 27 | — | — | f12 = COMMIT (see Ninja Megazord README) |
| Formation signal (`wOrder`) | Special retap in the 10 f offer | reach0 | 1/1/28 | 30 | — | — | late recovery = the only Leader's Return window; a Crane Rise follow-up hit makes it jump-cancellable |
| White Light opener (`wUltOpen`) | Ultimate (neutral, or cancel from clean heavy/wSaba/wKnock/wJ3) | sabaDraw0 → sabaWind0@12 → sabaCut0@30 | 30/3/60 | 93 | 35 | — | travels 3 px/f f6-30; clean hit → sequence, miss/block → 60 f recovery |
| Jump | Up (grounded) | jump strip | 3 f Up grace | — | — | — | Up pressed 1-2 f before Special becomes Crane Rise, never a jump |
| Blink (rangers.js) | double-tap Fwd/Back | dive0 | 3/5/3 | 11 | — | — | 2 charges, 90 f recharge, 18 % of 1280 ≈ 230 px |

Ultimate sequence (freeze-cinematic module in `mmprWhiteState.js`, 200 f): contacts at sequence ticks 26 / 58 / 92 / 170, raw 40 / 35 / 40 / 130 (+ opener 35 = **280 raw**). Poses `ultKick` (jump0 → airKick0@12), `ultLand` (land0 → hold0@8), `ultFinal` (sabaWind0 → sabaCut0@10); discipline flashes HAND@18, FOOT@50, BLADE@160 (presentation only). A held Formation token changes only the flash rhythm.

Presentation: `intro` cart0 → hand0 → land0 → hold0, `win` sabaDraw0 (Saba presented), `lose` down0..down3 → prone0, `blink` dive0. Unused cells and reasons: [SPRITE_LEDGER.md](SPRITE_LEDGER.md).
