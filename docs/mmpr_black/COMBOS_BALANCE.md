# Black Ranger — measured combos, resources, counterplay

All numbers are **measured** by `harness/mmpr_black.test.mjs` (real key input, frame-stepped, standing dummy, full health) and written to `mechanics_results.json`. **True combo** = every hit after the first landed while the defender was still in hitstun on the frame before contact (`stunBefore > 0`). Damage is in HP after the 1.7 data lever, the engine's 0.60 global scale and combo scaling (a raw-18 J1 deals 18 HP).

## Routes
| Route | Hits (HP) | Hitstun before each later hit | Total | Resources | Verdict |
|---|---|---|---|---|---|
| J1 → J2 → J3 (both facings) | 18 / 22 / 28 | 15, 9 | 68 | — | **true combo** |
| Light → Heavy → Crescent Break | 18 / 57 / 22 / 25 | 8, 23, 13 | 122 | 15 Energy | **true combo** (both Crescent contacts) |
| Forward+Heavy → Heavy → Heavy | 24 / 29 / 37 | 20, 20 | 90 | — | **true combo** |
| Launcher → jump-cancel → Air kick | 45 / 27 | 19 | 72 | — | **true combo** |
| Heavy → Falcon Sweep (special cancel) → bird | 57 / 35 | **3** | 92 | 12 E + 1 pip | true combo, 3 f margin at 100 px |
| Falcon Sweep call → Heavy (call-recovery cancel) → bird (Pincer) → Light retap | 57 / 35 / 15 | 33, 17 | 107 | 12 E + 1 pip | **true combo** |
| Light → Talon Lift | 18 / 18 / 28 | **0**, 24 | 64 | 18 E + 1 pip | **RESET / drop** (a Light is too short for the 24 f sortie travel) |
| Heavy → Talon Lift → jump → Air kick | 57 / 17 / 25 / 24 | 9, 24, 17 | 123 | 18 E + 1 pip | **true combo** |
| Covering Volley → walk in (vs blocking dummy) | blocked ×2 (6 chip) | — | 6 | 15 E + 1 pip | **pressure, not a combo**: Black closes from 320 px to 8 px while both shots are blocked |
| Blink → Heavy → Falcon Sweep | 57 / 35 | 4 | 92 | 12 E + 1 pip | **true combo** after the blink |
| Light → Heavy → Ultimate (recovery cancel) | 18 / 57 / 33 + 34 / 38 / 34 / 85 | 8, 6, then sequence | 299 | 100 E | **true combo**; opener lands 6 f inside hitstun |

### Pincer Confirm: combo vs reset
- Tag → Falcon consume → retap measured: tagged ✔, consumed ✔, ONE cancel in the last 6 f ✔ (`timerAtRetap 6`), defender hitstun at the cancel = 20.
- Without the retap the defender still had 33 f of hitstun after the bird hit. At this spacing the Pincer cancel makes the follow-up **6 f earlier**; it is a speed/timing tool, not the only way to keep the combo.
- No tag from blocked contacts (measured); an early retap outside the last 6 f is ignored (measured); Pincer gives no damage bonus and no refund.

### Commander rule (added during measurement)
The brief's literal Pincer needs the Falcon to hit while Black is still in the **tagging attack**. A Heavy cancelled into a call is no longer that attack, so the only working order is "call first, then Heavy". With the 27 f call, a Heavy after the call ended landed **after** the bird every time. So a committed call's recovery (f13-26) may be cancelled into **one fresh grounded Light or Heavy**. This is the only change to the call. Startup, commit boundary and costs are unchanged.

## Other measured facts
- Crescent Break on block: defender blockstun 27 f vs Black busy 54 f → **−27** (unsafe, as specified).
- Ultimate whiff: 30 + 3 + 60 = **93 f** (measured against Light's 17 f with the same method). Hit: contacts 34 / 38 / 34 / 85 after the opener (raw 40 / 45 / 40 / 100), 265 HP for the sequence at full health.
- Pips refill at frames **180 and 360** after the first spend (sequential).
- Plain Up still jumps, take-off on frame **4** (3 f Up grace so Up pressed 1–2 f before Special becomes Talon Lift, not a jump; measured with 1 f and 2 f leads).
- Tuning during measurement: Light hitstun 16 → **21** (Light → Heavy dropped by 3 f); launcher launchVy −28 → **−21** (the foe flew above Black's one jump); Volley shots 12 f → **15 f apart** (this engine drops `isBlocking` during blockstun, so a gapless second shot beat a held guard).

## Resources & counterplay
- 2 pips, 180 f sequential refill, 60 f lockout, one sortie at a time, 120 f lock after the ultimate: at most one bird every ~2 s, and never two at once.
- Every sortie is **telegraphed** (owner-coloured lane or reticle before the first contact), **blockable** (12 % chip; Volley shots are ordinary projectiles), and **vulnerable for 12 f** before commit (hit Black during the call and the resources are lost).
- The bird never re-reads the target after commit: stepping out of the lane or the captured region beats Sweep/Talon outright.
- Rising Mastodon has no invulnerability and a 16 f landing recovery; Crescent Break is −27 on block; the ultimate's opener whiffs into 60 f recovery.
