# Tactical Coins

An original game resource. The coin art comes from the MMPR: The Movie (Sega Genesis) "HUD & Coins" sheet: COINS ONLY.
No portraits, HP bars, fonts, scores, lives or labels from that sheet are used (`docs/spd_yellow/coin_rects.json` lists the excluded regions).

## Earning

- Max 3 coins. Every round starts at 0, and a rematch or training reset clears them.
- A cycle tracks three distinct clean confirmations. Each category pays at most one coin per cycle:
  - **MELEE:** a clean hit by one of Z's own normals (once per attack instance).
  - **GUN:** a clean pistol, long-gun or air-pistol hit.
  - **CLONE:** a clean hit by an explicitly ordered ordinary echo (Back + Special).
- When all three have paid, eligibility resets 90 f later. Coins already held are kept.
- At the cap, a category still marks the cycle but adds no coin (`coinCap` cue).
- No coin from blocked, parried or armored hits, damage-over-time, any Megazord action, the ultimate, or any coin-funded action:
  - COVER ME shot, CROSSWIRE echo, Breach-armed long gun.
- "Clean" for shots means not blocked, not armored, and the target actually in hitstun.

## HUD (above Z)

- **Slots:** three slots. An empty slot is a light ring. An earned coin plays the supplied 10-frame spin once and then shows the face frame. A spent coin plays the spin rising and fading.
- **Category marks:**
  - melee bar, gun dot, clone diamond, lit once paid this cycle
  - a draining line while the reset is pending
- **Other cues:**
  - Megazord pips (diamonds)
  - Breach reticle with its 120 f ring, plus an up-arrow during the confirm window
  - Relay / Break chevrons under the feet
  - SHOWCASE label when armed
- **Reduce Motion / Reduce Flashing:** materials draw static, and the HUD has no flashing elements.

## Orders (command stance)

| Order | Cost | Effect |
|---|---|---|
| COVER ME | 1 coin + 8 | The idle duplicate fires one raw-18 pistol shot from its own position (coin-funded: pays no coin) |
| CROSSWIRE | 1 coin + 8 | Free swap with the idle duplicate, then a coin-funded echo of the recorded normal from the clone's new spot (replaces the ordinary 10 + 8) |
| BREACH WINDOW | 2 coins + 10 | Armed for 120 f. The next long gun consumes it as it is drawn. If that long gun hits cleanly, a 10 f Up + Special window opens for the Sword Finish at the ordinary assist cost (20 + pip), from neutral or the long gun's authored late recovery (timer ≤ 20). Once per combo. The 10 f only count while the call is usable, so a hit early in the 30 f recovery never expires before the cancel point exists. |
| RISING KICK | ordinary 18 + pip | Megazord raised-leg kick (exposed here because Up + Down cannot be held together on a d-pad or stick) |
| SHOWCASE | 0 (toggle) | At ultimate entry with 3 coins: spend them for the cosmetic presentation |

All checks happen before payment. A rejection spends nothing.
