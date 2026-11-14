# Pink Ranger (`mmpr_pink`) — MOVE → FRAME MAP

All moves use the engine's `frameExact` path. **Startup** is the number of frames before the first active frame. **Total = startup + active + recovery**. `harness/mmpr_pink.test.mjs` checks every move through real key input.

**Damage.** `raw` is the brief's number. The stored `damage` is `round(raw × 1.7)` (`MMPR_PINK_DAMAGE_SCALE`, the same roster-parity lever Black uses). The engine's global scale (measured at 0.586) and combo scaling then apply on top, so first hits land at about the raw number: a raw-17 J1 deals 17 HP.

**Geometry.** Hitboxes come from move data (`rangeX/rangeY/boxY`). The hurtbox is the roster-standard 48×94. Arrow collision uses a radius-10 square at 0.83 × body height. The arrow art is drawn separately at hand height (`spriteBottomY`).

## Normals and chains

| Move (key) | Input | Strip cells (tick→cell) | S / A / R | Total | Raw | Notes |
|---|---|---|---|---|---|---|
| Palm Snap J1 (`light`) | Light | punch0 → punch1@4 | 5/2/10 | 17 | 17 | |
| Turning Check J2 (`pJ2`) | fresh Light retap on clean J1 | punch2 → punch4@5 | 6/2/12 | 21 | 21 | Fresh press only. A whiff or a block never chains. |
| Crescent Finish J3 (`pJ3`) | fresh Light retap on clean J2 | kick2 → kick3@9 → kick5@16 | 10/3/18 | 31 | 29 | Third stage maximum. |
| High Crescent (`heavy`) | Heavy | kick1 → crescent2@13 → kick0@20 | 14/3/26 | 43 | 54 | |
| Sliding Sweep (`pLow`) | Down+Light / Down+Heavy | low0 → kick4@7 | 8/2/16 | 26 | 25 | Low. Travels frames 2–9. |
| Rising Heel (`up`) | Up+Heavy / Up-attack | set0 → riseKick0@11 → rise0@16 | 12/3/22 | 37 | 42 | Launcher (launchVy −21). Kimberly stays grounded. |
| Flying Heel (`air`) | Light/Heavy in the air | tuck0 → flyKick0@7 | 8/3/17 | 28 | 30 | One jump only (`maxJumps 1`). |
| Advancing Palm (`pPalm`) | Forward+Heavy | punch2 → punch3@9 | 10/3/19 | 32 | 24 | Travels; never walks through the foe. |
| Chain Kick (`pKick`) | fresh Heavy on clean pPalm | kick1 → crescent1@11 | 12/3/21 | 36 | 32 | |
| Knock-away (`pAway`) | fresh Heavy on clean pKick | punch3 → thrust0@13 | 14/3/26 | 43 | 44 | `thrust0` is the palm-thrust pose. A confirmed **Up+Heavy** replaces this with `up` (launcher branch). |

## Power Bow, calls and Crane

| Move | Input | Cells | S / A / R | Notes |
|---|---|---|---|---|
| **Quick Shot** (`pBow`) | Neutral Special (tap) | bow0 → bow1@5 → bow2@10 → bow3@13 | 12 / 1 / 16 | Costs 10. The arrow spawns on f12 (raw 30, speed 13, lifetime 34 → 442 px measured). |
| **Drawn Shot** | Neutral Special held | same strip, pinned on bow2 | arm f24, cap f45, recovery 18 | At 24 held frames it spends **+8** to arm (raw 46, speed 15). Releasing fires; the draw auto-fires at 45. No auto-loop. If Kimberly is hit or interrupted mid-draw, the Energy is already spent and nothing fires. |
| Thunder call (`pCall`) | Forward / Up / Back + Special | crouch0 → raise0@5 → ready2@15 | 14 / 1 / 12 | f14 = **COMMIT**: the pip and Energy are spent at acceptance (falconPay), and the sortie spawns at commit. A cancel before commit (hit, block, KO) keeps the pip and Energy spent and creates nothing — the 14 f startup is vulnerable. |
| **Crane Escape** (`pCrane`) | Down+Special | cart0 → hand0@7 → crouch0@14 | 14 / 1 / 17 | Costs 12. Backward cartwheel of ≤ 90 px (measured 90), then 18 f recovery. **No invulnerability.** Works with 0 pips and leaves the Spotter Link alone. |
| Heaven's Final Arrow opener (`pUltOpen`) | Ultimate (neutral, or cancel from clean `heavy` / `pAway` / `pJ3`) | bow0 → bow1@10 → bow2@20 → bow3@31 | 30 / 1 / 60 | Costs 100. The opener arrow fires at f30 (raw 30). A clean hit starts the sequence; a miss or block gives the full 60 f recovery. |
| Blink (rangers.js, shared profile) | double-tap Forward/Back | dive0 afterimage strip `blink` | 3 startup / 5 travel / 3 recovery | `BLINK_DEFAULTS`: 22% of 1280 = **282 px** (measured), 2 charges, 90 f recharge, no crossup, never together with dash. Vetoed while any attack, draw or call is active. |

## Thunder Megazord sorties

Profiles live in `mmprPinkData.js`. Every sortie runs on the shared scheduler in `falconzord.js`:

- 2 pips with sequential 210 f recharge
- one sortie per owner
- 75 f global lockout
- 120 f lock after the ultimate

The Megazord has no HP, no hurtbox and no body. It strikes at the point captured at acceptance and never tracks.

| Sortie | Input | Cost | Warning (f) | Contacts (age) | Raw | Box (w×h, dx, dy) |
|---|---|---|---|---|---|---|
| Thunder Line | Fwd+Special | 15 + pip | 20 | 20–24 | 48 mid | 150×64, 150, −45 |
| Sky Splitter | Up+Special | 18 + pip | 16 | 16–19, then 30–33 | 18, then 30 (launch, vy −22) | 110×70; then 110×130 |
| Returning Edge | Back+Special | 15 + pip | 28 | 28–32 | 50 **mid** (not an overhead) | 120×90, 112, −46 |

- **One assist launcher per combo.** Sky Splitter's second hit launches only if the combo has not already been launched by an assist (`assistLaunchUsed`). A second Sky Splitter in the same juggle hits without launching (measured).
- **Up+Special never jumps.** A fresh Up holds the jump for 3 f (Up grace). An Up consumed by a call never jumps until it is released.
- **Rejections.** A call with no pip, during the lockout or the post-ultimate lock, with too little Energy, or while a sortie or call is pending spends nothing and queues nothing. It shows the red ✕ on the pips and plays a buzz.

## Spotter Link

- A **clean** arrow hit records the impact point for 90 f. A later clean hit replaces it.
- Blocked, parried and armour-absorbed arrows create no link.
- The next call captures the link at acceptance (consuming it), clamped to the stage edges and ±400 px from Kimberly.
- With no link, the call captures a default point 160 px ahead. That point is telegraphed by the marker and warning band.
- The link lives in `f._mmprPink.spot`, which is serialized in the replay/LAN checkpoint. It clears at round, reset, rematch and identity boundaries.

## Thread the Needle — and the transparent timing adjustment

**Brief.** An ordinary arrow hit during a Megazord contact window grants a 10 f opportunity, once per combo. Inside it, a fresh Down+Special in the last 6 f of bow recovery becomes Crane Escape (still 12 Energy).

**Problem as authored.** The earliest arrow after a call is impossible to land in time. The call commits at f14 and recovers until f27. Then the bow needs 12 f, and the arrow still has to travel. That puts the arrow after the end of every contact window (Thunder Line: ages 20–24), so the reward could never happen.

**Adjustment — Spotter's Reflex** (`mmprPink.js`):
- Once the call has **committed**, its 12 f recovery may be cancelled into **one fresh neutral Power Bow**, and nothing else.
- The bow still costs 10 Energy and keeps its 12 f startup.
- Measured working release delays after commit: **3–7 f** (5 consecutive frames). The grant opens and the Crane cancel succeeds (`mechanics_results.json → thread`).
- No other timing changed.

## Air bow

The sheet has **no faithful airborne bow pose**: every bow cell is planted, and the long two-handed `staff0` thrust is not the bow. The bow is therefore **grounded only**. In the air, Neutral+Special does nothing and shows a short red reject flash. Air Down/Forward/Up/Back+Special likewise do nothing.

## Ultimate — Thunderstring: Heaven's Final Arrow

`mmprPinkState.js` runs this as a freeze cinematic (game.js pauses combat while it runs).

- **Opener.** f30 arrow, raw 30. On a clean hit, any ordinary sortie is retired and the sequence plays (150 f).
- **Contacts:**
  - f18: Thunder lift, raw 45
  - f54: airborne kick, raw 35
  - f100: second arrow, raw 40
  - f122: final slash, raw 120
- **Measured totals.** 274 raw point blank (30 + 46 + 36 + 40 + 122). 304 from Light → Heavy → Ultimate (7 hits).
- **End.** The victim is knocked down, and ordinary assists are locked for 120 f. Every abort path (KO, round end, reset, rematch, identity change) restores positions and clears the freeze.

## Presentation

| Action | Cells |
|---|---|
| `intro` | air1 → air2 → air3 → crouch0 → bow0 |
| `win` | bow3 → raise0, with a cosmetic Megazord in the background (alpha 0.5) |
| `lose` | down0 → down1 → down2 → down3 |
| `hurt` | react1 |
| `hurt2` | react3 |
| `guard` | react0 |
| `knockdown` | down1–3 |
| `launched` | down4 |
| `getup` | down6 → crouch0 → ready0 |
| `stagger` | down0 |
