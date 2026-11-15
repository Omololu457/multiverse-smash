# Hiromi Higuruma: moveset

Roster key `higuruma` (Jujutsu Kaisen). Technical Midrange / Weapon Scaler. HP 1080, 100 Cursed Energy, speed 92
(ordinary dash, never the speed-tier teleport), shared double jump (maxJumps 2), spriteScale 2.3.

Damage: authored RAW values. Stored damage = round(raw × 1.95), the same roster-parity lever as Robin, Cyborg and
Raven. The shared GLOBAL_DAMAGE_SCALE 0.6 applies when the hit lands, so a raw-16 chop deals 18 at full HP. Every
number below comes from `higurumaData.js`. Routes are measured through real keyboard input
(`harness/higuruma.test.mjs` → `mechanics_results.json`).

## Frame data

| move | input | raw | startup | active | recovery | total | evidence | Energy |
|---|---|---|---|---|---|---|---|---|
| Gavel Chop (J1) | Light | 16 | 6 | 2 | 10 | 18 | CLOSE | — |
| Gavel Straight (J2) | fresh Light after a clean J1 | 20 | 6 | 2 | 12 | 20 | CLOSE | — |
| Spinning Close (J3) | fresh Light after a clean J2 | 28 | 8 | 3 | 18 | 29 | CLOSE | — |
| Low Gavel Check | Down + Light | 20 | 8 | 3 | 14 | 25 | CLOSE | — |
| Extended Lash | Forward + Heavy | 34 | 12 | 3 | 22 | 37 | REACH | — |
| Rising Gavel (launcher) | Up-Attack / Up + Heavy | 32 | 12 | 4 | 24 | 40 | REACH | — |
| Rising Air Swing | Light / Heavy in the air | 24 | 7 | 5 | 14 | 26 | REACH | — |
| Giant Gavel Overhead | Heavy | 58 | 22 | 4 | 30 | 56 | WEIGHT | — |
| Giant Gavel Upswing | Down + Heavy | 50 | 18 | 4 | 28 | 50 | WEIGHT | — |
| Extension of the Court | Special | 36 | 13 | 3 | 24 | 40 | REACH | 12 |
| Cross-Examination | Forward + Special | 12 / 12 / 22 | 12 | 17 | 18 | 47 | CLOSE | 16 |
| Rising Objection | Up + Special | 34 | 9 | 7 | 20 | 36 | REACH | 16 |
| Order in the Court | Down + Special | 64 | 24 | 3 | 32 | 59 | WEIGHT | 20 |
| Objection (stance) | Back + Special | — | 3 | 16 | 21 | 40 | — | 15 |
| Objection counter strike | automatic on a catch | 30 | 4 | 2 | 16 | 22 | CLOSE | — |
| Deadly Sentencing opener | Ultimate | 30 | 16 | 3 | 40 | 59 | — | 100 |

Measured reach from his body centre (the box never exceeds the drawn weapon tip; the body hurtbox never changes size):
Chop 60 px · Extended Lash 198 px · Giant Overhead 106 px (tall: 166 px) · Extension of the Court 248 px.

## Gavel sizes
- **Small** (CLOSE): Chop → Straight → Spinning Close, Low Check, Cross-Examination, Objection strike. Fast and short.
- **Extended** (REACH): Extended Lash (the corded gavel, tethered), the launcher, the air swing, Extension of the Court and Rising Objection.
- **Giant** (WEIGHT): Overhead (22 f), Upswing (18 f, hits low) and Order in the Court (24 f leap and slam). Committed and punishable.

J3 deviation: the sheet's J3-like art is a spinning **low** sweep (b11_6–11), not a short finishing swing. It is used as the
chain finisher with its drawn box (low and forward).

## Case File → Precedent
- A clean, confirmed hit marks its category once per case: CLOSE, REACH or WEIGHT. Blocks, whiffs and repeated hit ticks
  of a multi-hit move never add evidence (measured).
- All three marks give **one** Precedent token (maximum 1; collection pauses while a token is held). Evidence never changes damage.
- Spend it with a **fresh double-tap dash** during the late recovery (last 65 %) of a clean, confirmed gavel hit. The recovery
  becomes the ordinary shared dash: no invulnerability, no damage bonus, refused on whiff, block or the early window, and at
  most one per combo (the lock releases when the foe leaves hitstun / knockdown). The case then starts fresh.
- HUD: three marks plus a PRECEDENT pill under his health bar.

## Specials
- **Extension of the Court** (Special, 12): long-handle extension, one contact per target, whiffs past the drawn tip (measured at 320 px).
- **Cross-Examination** (Forward + Special, 16): physical advance (stage-clamped, never through the foe), then exactly 3 strikes 12 / 12 / 22. Not invulnerable.
- **Rising Objection** (Up + Special, 16, ground or air): an anti-air rising swing; once per airtime; never refunds a jump.
- **Order in the Court** (Down + Special, 20): visible 24 f leap and one grounded impact. The dust ring is presentation only. Punishable on whiff (measured).
- **Objection** (Back + Special, 15): catches ONE frontal strike on frames 3–18 and answers with a gavel strike (raw 30). Grabs, projectiles, ultimates,
  unblockables and strikes from behind are not caught. No activation in hitstun. A miss leaves meaningful recovery (40 f total).

## Deadly Sentencing (Ultimate, 100 Energy)
A 16 f extended-gavel opener (raw 30), blockable. A whiff or block = recovery, no cinematic (measured). A clean hit starts a frozen cinematic:
THE COURT CONVENES (0–39) → CASE REVIEW (40–99, lists this match's marks) → CONFISCATION (100–129, presentation only) →
VERDICT: GUILTY (giant gavel, contact at 150, raw 70) → EXECUTIONER'S SWORD (contact at 208, raw 170) → exit (230–259).
Exactly 3 damage events, 30 + 70 + 170 = 270 raw. **No instant kill**: a full-HP defender survives (measured: 316 damage of 1080).
Reset mid-cinematic and KO mid-cinematic both exit cleanly.

## Measured routes (P1 keyboard, P2 standing dummy; damage at full HP)

| route | gap px | hits | total | verdict |
|---|---|---|---|---|
| Chop → Straight → Spinning Close | 80 | 18 + 23 + 30 | 71 | true combo |
| Chop (whiff) → Light | 400 | — | 0 | no hit |
| Cross-Examination (case) | 70 | 13 + 13 + 23 | 49 | true combo |
| Giant overhead → Precedent dash → Chop | 90 | 67 + 17 | 84 | true combo |
| Extension of the Court at long range | 190 | 42 | 42 | single hit |
| Extension beyond the drawn tip | 320 | — | 0 | no hit |
| Cross-Examination | 120 | 13 + 13 + 23 | 49 | true combo |
| Rising Objection anti-air | 60 | 39 | 39 | single hit |
| Order in the Court | 70 | 75 | 75 | single hit |
| Order in the Court beyond reach | 200 | — | 0 | no hit |
| Order in the Court whiff → punish | 400 | — | Higuruma took 18 | punished (Higuruma took 18) |
| Objection → counter strike | 60 | 35 | 35 | single hit |
| DEADLY SENTENCING | 160 | 35 + 82 + 199 | 316 | true combo |
| Chop → Straight → Extended Lash | 80 | 18 + 23 + 36 | 77 | true combo |
| Chop → Straight → Giant Overhead | 80 | 18 + 23 + 62 | 103 | RESET at hit 3 |
| Low Check → Launcher (point blank) | 55 | 23 + 37 | 60 | true combo |
| Launcher → jump-cancel → air swing (point blank) | 55 | 37 + 23 | 60 | true combo |
| Launcher → jump-cancel → double jump → air swing (point blank) | 55 | 37 | 37 | single hit |
| Launcher → Rising Objection (special cancel, point blank) | 55 | 37 | 37 | single hit |
| Chop → Straight → Cross-Examination | 80 | 18 + 23 + 12 + 11 + 19 | 83 | true combo |
| Chop → Straight → Spinning Close → Deadly Sentencing | 80 | 18 + 23 + 30 + 29 + 62 + 151 | 313 | true combo |
| Giant overhead → Precedent dash → Low Check | 90 | 67 + 21 | 88 | pressure (not a combo) |
| Giant overhead → Precedent dash → Chop (combo check) | 90 | 67 + 17 | 84 | true combo |
| Spacing: Extended Lash at max range | 150 | 39 | 39 | single hit |
| Spacing: Lash whiff → punish attempt | 400 | — | Higuruma took 18 | punished (Higuruma took 18) |
| Objection → counter → Straight | 60 | 35 + 18 | 53 | true combo |

Notes on routes:
- Chop → Straight → Giant Overhead is a **reset**, not a combo: the giant gavel's 22 f startup is longer than the Straight's hitstun.
- The launcher follow-up is a jump-cancel → air swing (true combo). The shared launcher jump-cancel ignores a jump pressed during the hit
  freeze; press it ≈ 7 f after hitstop. A double jump before the swing drops the juggle, and Rising Objection after the launcher misses (the foe is above its box).
- Precedent dash → Chop is a true combo (84); Precedent dash → Low Check is pressure.
