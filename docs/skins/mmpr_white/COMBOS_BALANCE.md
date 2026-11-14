# White Ranger — measured combos, resources, counterplay

All numbers are **measured** by `harness/mmpr_white.test.mjs` (real key input, frame-stepped, standing dummy, full health) and written to `mechanics_results.json`. **True combo** = every hit after the first landed while the defender was still in hitstun on the frame before contact (`stunBefore > 0`; 9998 = inside the ultimate's own sequence). Energy figures include passive regen during the route.

## Routes
| Route | Hits (HP) | Hitstun before each later hit | Total | Resources | Verdict |
|---|---|---|---|---|---|
| J1 → J2 → J3 (both facings) | 18 / 22 / 28 | 15, 10 | 68 | — | **true combo** (HAND ×1: repeats don't stack) |
| Low Heel → Saba Cut → Saba's Answer | 25 / 57 / 43 | 9, 23 | 125 | 15 E | **true combo** (FOOT + BLADE) |
| Forward+Heavy → Heavy → Heavy | 24 / 29 / 37 | 20, 20 | 90 | — | **true combo** |
| Rising Tiger → manual jump → Air Turning Heel | 45 / 27 | 19 | 72 | — | **true combo** |
| HAND → FOOT → BLADE, three separate exchanges | 18 / 25 / 52 | free between | 95 | — | **collection, not a combo**: token earned, HAND→BLADE 131 f (< 180) |
| BLADE → HAND → FOOT | 57 / 17 / 21 | free between | 95 | — | collection in any order ✔ |
| Formation Twin Fist → Leader's Return → Heavy | 39 / 24 / 52 | 21, 5 | 115 | 15 + 10 E, 1 pip, token, 1 blink charge | **true combo**, 5 f margin |
| Formation Crane Rise (launch + push follow-up) | 45 / 20 | 24 | 65 | 18 + 10 E, 1 pip, token | **true combo** for the two Megazord hits. The planned air conversion after the push kick did **not** connect at this spacing: the push moves the foe out of a manual jump's reach (by design it changes spacing, never re-launches). |
| Delayed Ninja Edge → walk in | blocked slash, then Light 18 | 0 | 24 | 20 E, 1 pip | **pressure, not a combo**: the slow slash is blocked while Tommy closes; the Light after blockstun is a frame trap/reset |
| Saba Cut → Ultimate (recovery cancel) | 57 / 33 + 34 / 30 / 34 / 111 | 6, then sequence | 299 | 100 E | **true combo**; opener lands 6 f inside hitstun |

## Formation measured
- Token from three clean disciplines; a repeat neither stacks nor refreshes; blocked attacks grant nothing; a damaging hit on Tommy clears an incomplete set but not a held token; the collection expires 180 f after its first credit; the token expires after 240 f; no collection while holding a token; everything clears at round / training reset / rematch / identity change.
- Acceptance: offer opens only on a **clean** main-contact hit; a fresh retap within 10 f spends the token + **10 Energy** (measured 9.94 after regen) and the follow-up lands (Twin 24, Crane 20 push, Edge 26). Late retap (outside 10 f) = an ordinary Special, token kept. Blocked order / whiff / held Special never accept. Once per combo.
- Leader's Return: offer opens when the follow-up hits during the `wOrder` pose (12 f), a double-tap blinks with one ordinary charge (2 → 1), once per combo; no free blink out of an ordinary order call.

## Other measured facts
- Orders: commit at frame **12** from press for all three; Twin Fist hits at 30 f (raw 38 → 39 HP), exits 68 f; Crane Rise hits at 30 f (45 HP, vy −20), exits 72 f; Ninja Edge hits at 47 f (55 HP), exits 88 f.
- Saba's Answer reaches **142 px** from Tommy's centre; feint = 12 f recovery, no hitbox, 15 Energy kept spent; Block after startup frame 9 does not feint.
- Tiger Descent: vy capped at 14, **24 f** landing; grants no FOOT. Ascent: 16 f landing, once per airtime.
- Ultimate whiff/block: **93 f** total (30 + 3 + 60). Clean: contacts 37 / 33 / 37 / 121 HP after the opener (raw 40 / 35 / 40 / 130), 200-frame sequence, knockdown, control restored, orders locked 120 f, pips not refilled. A held token changes only the flash rhythm (identical damage, measured).
- Blink distance **230 px**; walk 360 px / 60 f; jump apex 385 px.
- Tuning during measurement: Heavy cancel list gained `wLow` (Low → Heavy route); Saba's Answer reach comment corrected to the measured 142.

## Resources & counterplay
- 2 pips, 180 f sequential refill, 60 f lockout, one order at a time, 120 f post-ultimate lock.
- Every order is **telegraphed** (warning 14 / 12 / 24 f), **blockable**, and **vulnerable for 12 f** before commit (hit Tommy during the call: no robot, pip + Energy lost). Nothing tracks after commit — stepping out beats it.
- The Formation follow-up needs a clean first hit **and** a held token **and** a 10 f retap; blocking the first contact denies the whole upgrade.
- Ascent has no invulnerability; Descent lands into 24 f; the ultimate's opener whiffs into 60 f recovery.
- Disciplines are grounded and clean-only, so a defender who blocks consistently denies Formation entirely.
