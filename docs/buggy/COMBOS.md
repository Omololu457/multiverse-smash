# Buggy the Clown — Combos (Phase 6)

All numbers below are **measured** in the real game by `harness/buggy_combos.test.mjs`. Buggy (P1) fights a
standing, full-HP Zoro (P2) through the real keyboard, and each input is confirmed on hit.

## Scaling rules

- **85% per hit.** Each hit is multiplied by `0.85^(hits already in the combo)`.
  - Melee goes through `buggyComboScale` in combat.js.
  - Parts, knives, balls and the Festival go through `partHit`.
- **Reset after 1.5 s.** The counter returns to 0 after 90 idle frames, which is the engine's `comboTimer`. This is verified by the test.
- **Roster-wide `GLOBAL_DAMAGE_SCALE` = 0.60.** Every character's designed number is delivered at ×0.60, so a 38-damage Jab lands for 22.
- **The Super locks its scaling when it starts.** Its 8 hits use `0.85^(combo at start)` and do not decay each other.
  - A neutral Super lands 370 × 0.60 = **222**, which is measured.

Inputs: L = Light, H = Heavy, A = Special. Numpad notation, facing right.

| # | Route | Inputs | Per-hit damage (measured) | Total | Hits |
|---|---|---|---|---|---|
| 1 | Jab → Knife slash → Heavy carve → Knife Fan | L, L, H, A (special-cancel) | 22 · 30 · 36 · 11 | **99** | 4 |
| 2 | Low knife → Clown kick → Cannon → Stab | 2L, 2H, 6A, A (when the hand hovers) | 27 · 28 · 30 · 16 | **101** | 4 |
| 3 | Cannon parked behind → Knife Fan → Stab (pincer) | 236A, 66A, A | Cannon 42 · Fan 39 (three knives) · Stab 14 | **95** | 5 |
| 4 | Buggy Ball → dash → Acrobatic kick → Festival | 214A (hold 6), 66, 8H, 22A | Ball 57 · Acrobatic 38 · Festival 5 per tick | **100**, plus 5 per tick | 3+ |
| 5 | Nullify a slash → Heavy carve → SUPER | (Zoro swings) H, 236236A | Carve 51 · Super 187 | **238** | 9 |

A neutral SUPER (236236A at 100 Chop) on a standing foe hits **8 times for 222**:
- 4 balls × 55;
- 3 stabs × 20;
- the knife-ball rush for 90.

## Notes per route

1. **Route 1.** The Jab gatlings into the Knife slash (L, L), and the slash into the Carve. The Carve launches, so only one knife of the 3-knife Fan connects (11). On a grounded foe all three hit.

2. **Route 2.** The Cannon's hand flies 60% of its range and then hovers for 2 s. Pressing A while it hovers fires the Stab from the hand.
   - **Fixed in this phase:** ↓+H or →+A pressed during the previous hit's hitstop used to lose its direction if ↓ / → was released before hitstop ended. The Kick then came out as nothing, and the Cannon came out as the Knife Fan.
   - A buffered press now remembers the direction held at the moment the button went down (`edgeDir`, which is sim state).

3. **Route 3.** Fired from 200 px, the Cannon hand passes through the foe and parks *behind* them.
   - The Knife Fan hits from the front, then the Stab hits from the back.
   - The foe cannot block both sides; this is the character's signature mix.

4. **Route 4.** Buggy Ball is 214A. Holding → during startup throws the longer arc and ← the shorter one.
   - **Fixed in this phase:** pressing A while already holding → turned the motion into "→+A", which is the Cannon fallback. The Ball motion now accepts a trailing ←/→ (the arc steer).
   - **Honest caveat:** the Acrobatic kick launches Zoro about 380 px. His hitstun runs out in the air at about 36 frames, so the Festival is **not a true hitstun combo**. It is a field set under the falling foe that catches the landing at about 70 frames.
   - The combo counter carries because the 90-frame window has not expired. An opponent with an air action can drift out of the field.

5. **Route 5.** A slash that passes through Buggy (a nullify) leaves Zoro in his own recovery, and the Carve punishes it.
   - Carve → Super is a special cancel on contact. The Super's scaling is locked at combo 1 (×0.85), so 222 × 0.85 ≈ **187**.

## Gatling table (normal → normal on contact, hit or block)

- Jab → Knife slash, Heavy carve, Low knife, Clown kick, Acrobatic.
- Knife slash → Heavy carve, Acrobatic.
- Low knife → Clown kick, Knife slash, Acrobatic.
- Clown kick → Acrobatic, Heavy carve.

Any connected normal can special-cancel into a Special (A, or 236B / 214B on H). A Super cancel is allowed off any connected move.
