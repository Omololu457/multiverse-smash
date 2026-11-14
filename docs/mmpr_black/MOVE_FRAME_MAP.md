# Black Ranger (`mmpr_black`) — MOVE → FRAME MAP

All moves use the engine's `frameExact` path: **startup** = frames before the first active frame, **total = startup + active + recovery** (verified for every move through real key input by `harness/mmpr_black.test.mjs`).
Damage: `raw` is the brief's number; the stored `damage` is `round(raw × 1.7)` (MMPR_BLACK_DAMAGE_SCALE, the roster-parity lever), and the engine's global 0.60 scale plus combo scaling apply on top (measured: a raw-18 J1 deals 18 HP).
Hitboxes come from move data (`rangeX/rangeY/boxY`), never from sprite pixels; the hurtbox is the roster-standard 48×94.

| Move (key) | Input | Strip cells (timeline tick→cell) | S / A / R | Total | Raw | Notes |
|---|---|---|---|---|---|---|
| Palm Check J1 (`light`) | Light | punch0 → punch1@4 | 5/2/10 | 17 | 18 | hitstun 21 (tuned from 16 so Light → Heavy is a true combo; measured) |
| Turning Strike J2 (`bJ2`) | Light retap on clean J1 | punch2 → punch3@4 → punch4@7 | 7/2/12 | 21 | 22 | fresh press only; whiff/block never chains |
| Driving Heel J3 (`bJ3`) | Light retap on clean J2 | kick2 → kick4@9 | 10/3/18 | 31 | 30 | third stage max |
| Crescent Heel (`heavy`) | Heavy | kick2 → kick3@13 → kick5@18 | 14/3/26 | 43 | 56 | Pincer tagger |
| Ankle Sweep (`bLow`) | Down+Light / Down+Heavy | set0 → spinKick0@7 | 8/2/16 | 26 | 26 | low |
| Ascending Heel (`up`) | Up+Heavy / Up-attack | set0 → highKick0@11 → follow0@16 | 12/3/22 | 37 | 44 | launcher (launchVy −21), Black stays grounded; clean hit → jump-cancel (engine launcher JC) |
| Flying Side Kick (`air`) | Light/Heavy in air | tuck0 → flyKick0@7 | 8/3/17 | 28 | 32 | |
| Advancing Palm (`bPalm`) | Forward+Heavy | punch3 → punch4@9 | 10/3/19 | 32 | 24 | travels 4 px/f frames 2-9, never walks through the foe |
| Turning Kick (`bTurn`) | fresh Heavy on clean bPalm | kick1 → kick3@11 | 12/3/21 | 36 | 32 | |
| Knock-away (`bAway`) | fresh Heavy on clean bTurn | acro0 → acro2@13 | 14/3/26 | 43 | 44 | Pincer tagger; confirmed Up+Heavy replaces it with `up` |
| Crescent Break (`bCrescent`) | Neutral Special | kick1 → kick3@12 → kick4@16 → spinKick0@21 → follow0@26 | 13/12/26 | 51 | 24 + 30 | two contact intervals: f13-14 (raw 24) and f22-24 (raw 30); −27 on block (measured) |
| Rising Mastodon (`bRising`) | Down+Special | set0 → riseStrike0@9 → jumpKick0@12 | 10/8/20 | 38 | 44 | leaves ground f9; once per airtime; 16 f landing recovery; no invulnerability |
| Sortie call (`bCall`) | Forward / Up / Back + Special | rise0 → ready2@12 | 12/1/14 | 27 | — | f12 = COMMIT. After commit the recovery may be cancelled into one fresh grounded Light/Heavy |
| Falcon Formation opener (`bUltOpen`) | Ultimate (neutral, or cancel from clean heavy/bAway/bJ3) | run4 → punch4@29 | 30/3/60 | 93 | 35 | travels 3 px/f f6-29; clean hit → sequence, miss/block → full 60 f recovery |
| Jump | Up (grounded) | jump strip | 3 f Up grace, take-off frame 4 | — | — | a fresh Up while idle holds the jump 3 f so Up pressed 1-2 f before Special becomes Talon Lift; an Up consumed by Talon Lift never jumps until released |
| Blink (rangers.js) | double-tap Forward/Back | acro3 (afterimage strip `blink`) | 3 startup / 5 travel / 3 recovery | 11 | — | 2 charges, 90 f recharge, 18 % of 1280 ≈ 230 px |

Ultimate sequence poses (non-hitting `currentAttack`, timeline-driven): `ultLow` (acro3 → set0@14), `ultRise` (jumpKick0 → highKick0@10), `ultLand` (follow0 → rise0@16).

Presentation: `intro` = acro1 → acro2 → set0 → ready0 (+ cosmetic distant Falcon flypast), `win` = rise0 upright (+ flypast), `lose` = down1 → down2 → down3 (stagger/fall/prone), `hurt` react0, `hurt2` react3, `guard` react2, `grab` punch0 → react1, `knockdown` down1-3, `launched` down4, `getup` down5 → set0 → ready0.
