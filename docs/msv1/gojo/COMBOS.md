# Satoru Gojo (Shinjuku Arc) — COMBOS

Every route below is driven by **real inputs** in `harness/gojo_shinjuku.test.mjs --only=combos` (P1 = gojo_shinjuku,
P2 = training dummy standing, 56 px gap unless noted). Each link is pressed on the first cancel-legal frame (after
contact + hit-stop) or on the stated condition. Damage is **as dealt** (combo scaling included). "True" = the dummy was
never free between the first and last hit. CE is the net change of the CE bar (negative = he *gained* CE: +4 per clean
hit). Keys: J = Light, K = Heavy, L = Special, I = Up-Attack, P = Infinity / charge.

| Route | Input | Damage | Hits | CE | Bars | True |
|---|---|---:|---|---:|---:|:-:|
| Jab string | J, J, J | 101 | 30 · 30 · 41 | +15.8 gained | 0 | ✅ |
| Jab string > Reversal Red | J, J, J, → + L | 159 | 30 · 30 · 41 · 58 | +7.9 gained | 0 | ✅ |
| Palm > Blue Fist | K, K + L | 192 | 67 · 125 | +4.2 gained | 0 | ✅ |
| Blue Fist > Red Rush | K + L, → + L + K | 226 | 136 · 90 | 11.5 | 0 | ✅ |
| Palm > **Black Flash** | K, L ≤ 2 f after the hit | 160 | 67 · 93 | +18.6 gained | 0 | ✅ |
| Jab string > **Hollow Purple** | J, J, J, ↓ ← + L | 353 | 30 · 30 · 41 · 252 | 21.3 | 1 | ✅ |
| Lapse > Red Rush | L (gap 240), → + L + K mid-pull | 125 | 12 · 12 · 82 · 10 · 9 | 12.1 | 0 | ✅ |
| Max Blue > Hollow Purple (corner carry) | ↓↘→ + L + K, ↓ ← + L (gap 220) | 258 | 6 Blue ticks + 195 | 34.3 | 1 | ✅ |
| Jab, Jab > launcher > jump > air attack | J, J, I, W on hit, J | 167 | 30 · 30 · 77 · 30 | +32.6 gained | 0 | ✗ (a link: the dummy can tech before the air hit) |

Bars show the net bar change; Purple costs one full bar, and the hits before it put part of that back.

## Notes
- **Black Flash** is the highest damage per CE: Palm into Special within 2 frames (3 in THE ZONE) multiplies that hit
  ×2.5 and *gives* 10 CE. The window is checked in the sim before hit-stop, so it is frame-exact on replay and LAN.
- **Perfect Output** (Six Eyes): every cancel above that lands on the first legal frame refunds 30 % of the CE cost.
  The harness presses on that frame, so the CE column already includes the refund.
- **Purple ender**: every string ends in Hollow Purple for one bar, if he has 40 CE. Combo scaling takes 300 down to
  about 250.
- **Corner carry**: Max Blue drags the foe to the wall (8 × 10 raw), then Purple on release. Damage goes up with the
  number of Blue ticks that land.
- **Dropped routes**: Lapse > Palm and an Infinity-pin opener both whiffed with real inputs (the pull ends outside
  Palm's reach, and the pin only fires at the stage edge). They are left out rather than listed as combos.
- **200 % Purple** (two bars + 70 CE, three timed chant lines) does 230 → 460 as a punish. It is not a combo ender,
  because a hit cancels the chant.
