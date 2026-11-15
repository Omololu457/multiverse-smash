// Beast Boy (beast_boy) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values from
// beastBoyData.js (stored damage = round(raw × 1.7), the same lever as the Rangers / Cyborg). Inputs are written in the
// shared logical tokens (Light / Heavy / Special / Ultimate / Grab / Charge / Block / Jump) so the shared help layer
// re-labels them for keyboard or pad. Measured routes: docs/beast_boy/COMBOS_BALANCE.md. Bindings verified against the
// live defaults (game.js P1_CONTROLS / P2_CONTROLS, input.js PS5_MAP / pollGamepad / pollMenuGamepad) on 2026-11-14.
export const BEAST_BOY_CONTROLS = {
  // logical action → [keyboard P1, keyboard P2, PS5 DualSense (live pollGamepad layout)]
  rows: [
    ['Move / crouch (facing-relative directions)', 'A / D, S', '← / →, ↓', 'Left stick / D-pad'],
    ['Dash (ordinary ground dash)', 'double-tap A or D', 'double-tap ← or →', 'double-tap D-pad ← / →'],
    ['Jump (one jump, no double jump)', 'W', '↑', '✕ Cross (or stick / D-pad Up)'],
    ['Light → fresh Light → fresh Light (J1-J3)', 'J', '1', '□ Square, fresh □ retaps'],
    ['Low Ankle Check', 'S + J', '↓ + 1', 'Down + □'],
    ['Heavy (Full Stretch)', 'K', '2', '△ Triangle'],
    ['Command chain', 'D/A(fwd) + K → K → K', '→/←(fwd) + 2 → 2 → 2', 'Forward + △ → fresh △ → fresh △'],
    ['Launcher Rising Kick (jump suppressed)', 'I  (or W + K)', '3', 'Up + △'],
    ['Aerial Kick', 'J or K in the air', '1 or 2 in the air', '□ or △ in the air'],
    ['Gorilla Break', 'L', '4', 'R1 (neutral)'],
    ['Triceratops Drive', 'Forward + L', 'Forward + 4', 'Forward + R1'],
    ['Tiger Cross (ground)', 'S + L', '↓ + 4', 'Down + R1'],
    ['Tiger Cross (air, once per airtime)', 'S + L in the air', '↓ + 4 in the air', 'Air Down + R1'],
    ['Bird Intercept (ground / air, once per airtime; never jumps)', 'W + L', '↑ + 4', 'Up + R1'],
    ['False Start (feint back)', 'Back + L', 'Back + 4', 'Back + R1'],
    ['Wild Chain link (after a clean animal hit, 10 f)', 'fresh matching direction + L', 'fresh matching direction + 4', 'fresh matching direction + R1'],
    ['Instinct escape (armed move, last 8 f)', 'W, or double-tap A / D', '↑, or double-tap ← / →', '✕ Cross, or double-tap D-pad'],
    ['Ultimate', 'U', '5', 'R2'],
    ['Grab', 'O', '6', 'L1'],
    ['Charge (ordinary shared Morph Energy charge, hold)', 'P', '7', 'L2'],
    ['Guard', ';', '/', '○ Circle'],
    ['Combo Breaker (in hitstun, shared rules)', '; + L', '/ + 4', '○ Circle + R1'],
    ['Pause', 'Esc', 'Esc', 'Options'],
    ['Menu confirm / back', 'Enter / Esc', 'Enter / Esc', '✕ Cross / ○ Circle'],
  ],
  priority: 'Special direction priority on the press frame (facing-relative): Up > Forward > Back > Down > Neutral — Up-Forward = Bird, Down-Forward = Tiger. In the air only Up (Bird) and Down (Tiger) are legal; other air Specials are refused. Up + Special owns the press (no ordinary jump leaks); a fresh grounded Up holds the jump 3 f so Up a hair before Special still gives Bird. Holding R1 never chains: every Wild Chain link needs a FRESH press. The Ultimate owns its press; the breaker (Guard + Special in hitstun) is resolved before the command layer, so its component buttons do nothing else that frame.',
  note: 'Defaults shown; the shared rebind menu changes the keyboard keys and the Move List re-labels from the logical tokens. Beast Boy adds no Beast-Boy-only pad reader, no new button, no global remap and no motion parser. L2 / Charge is the engine\'s ordinary shared energy charge (Beast Boy has no second resource).',
}
export const BEAST_BOY_KIT = { type: 'Shapeshift Rushdown / Adaptive Combo Routes', energy: 'Morph Energy', difficulty: 'Medium-High',
  summary: 'Garfield "Gar" Logan. Every animal is ONE committed strike: transform, one hit opportunity, recover, back to human — no animal mode. A clean animal hit opens a 10 f Wild Chain window into the next animal (Gorilla → Bird → Tiger → Triceratops → Gorilla), max two links per combo, full cost each, no repeats. Landing three DIFFERENT animals in a round earns one Instinct token: the next animal move may cancel its last 8 f into a jump or dash. HP 950, Morph Energy 100.',
  passive: { name: 'Wild Chain · Instinct', input: 'Automatic', effect: 'WILD CHAIN: only on a clean (unblocked, unparried, non-armored) animal hit; needs a FRESH matching direction + Special inside 10 f; executes at the authored return boundary with the next animal\'s full startup and full cost. No chain on block / whiff. INSTINCT: max one token, earned by three distinct animal hits (ultimate hits, blocks and multihits never count), consumed when the next animal move starts (hit, block or whiff), never adds damage or a Wild Chain link.' },
  basics: [
    { name: 'Quick Jab → Long Straight → Turning Finish', input: 'Light, fresh Light, fresh Light', desc: '5 / 7 / 10 f startup; raw 17 / 21 / 28. Clean-hit retaps only.' },
    { name: 'Full Stretch', input: 'Heavy', desc: '14 f; raw 52.' },
    { name: 'Ankle Check', input: 'Down + Light / Down + Heavy', desc: '8 f; raw 24; hits low.' },
    { name: 'Rising Kick', input: 'Up + Heavy / Up-Attack', desc: '12 f; raw 40 launcher; manual Jump in its recovery to follow (no automatic carry).' },
    { name: 'Aerial Kick', input: 'Air Light / Air Heavy', desc: '8 f; raw 30.' },
    { name: 'Command chain', input: 'Forward + Heavy → fresh Heavy → fresh Heavy', desc: 'Advancing jab 24 (stops in front of the foe) → straight 30 → knock-away 40. Confirmed Up + Heavy on the last step = Rising Kick.' }],
  specials: [
    { name: 'Gorilla Break', input: 'Neutral Special', cost: 15, desc: '15 f; raw 58. Full Gorilla Kick: transform, one extended kick, change back. Space-maker; heavy whiff recovery (49 f total); no armor.' },
    { name: 'Triceratops Drive', input: 'Forward + Special', cost: 20, desc: '20 f; raw 64. Morph → charge (≤ 180 px or 32 f) → reverse morph. One contact; the charge stops on contact or at a wall / body; never passes through. Punishable on block or whiff.' },
    { name: 'Tiger Cross', input: 'Down + Special (ground or air)', cost: 18, desc: '13 f ground (11 f air); raw 52. Full Tiger Slash sequence, bounded ~60 px pounce, ONE slash contact (the arcs are cosmetic). Air: once per airtime, landing recovery.' },
    { name: 'Bird Intercept', input: 'Up + Special (ground or air)', cost: 12, desc: '10 f; raw 28. Short rising / forward flight arc (≤ 24 active f) → one contact → forced return. Once per airtime; no invulnerability; never jumps.' },
    { name: 'False Start', input: 'Back + Special', cost: 8, desc: 'Humanoid feint: ≤ 60 px backward, 14 f recovery, no hitbox, no invulnerability, no transform.' }],
  ultimate: { name: 'ANIMAL INSTINCT — FOUR BEAST FINISH', input: 'Ultimate', cost: 100, desc: '28 f humanoid punch (raw 25), grounded, also from Heavy / J3 / straight / knock-away recovery. Clean hit: cut-in → Gorilla Kick 45 → Bird 30 → Tiger Slash 60 → Triceratops charge 100 → ready pose (260 raw before shared scaling). Miss / block: 60 f recovery. One 100-energy transaction; no Wild Chain or Instinct during it.' },
  controls: BEAST_BOY_CONTROLS,
  // MEASURED routes (harness/beast_boy.test.mjs → docs/beast_boy/COMBOS_BALANCE.md); HP vs a standing dummy, after shared scaling.
  combos: [
    { name: 'Jab String', input: 'Light → Light → Light', damage: 64, note: 'true combo (both facings)' },
    { name: 'Jab → Gorilla', input: 'Light → Light → Special', damage: 92, note: 'true combo' },
    { name: 'Wild Chain ×2', input: 'Special → (window) Up+Special → (window) Down+Special', damage: 135, note: 'true combo: Gorilla → Bird → Tiger, 45 energy' },
    { name: 'Full Wild Route', input: 'Light → Light → Special → Up+Special → Down+Special', damage: 156, note: 'true combo, 5 hits, 2 links' },
    { name: 'Low → Heavy → Tiger', input: 'Down+Light → Heavy → Down+Special', damage: 124, note: 'true combo' },
    { name: 'Command Chain', input: 'Forward+Heavy → Heavy → Heavy', damage: 86, note: 'true combo' },
    { name: 'Launcher Follow-up', input: 'Up+Heavy → Jump (after hitstop) → air Light', damage: 65, note: 'true combo' },
    { name: 'Heavy → Triceratops', input: 'Heavy → Forward+Special', damage: 112, note: 'true combo' },
    { name: 'Heavy → ANIMAL INSTINCT', input: 'Heavy → Ultimate', damage: 274, note: 'true combo, 100 energy' },
    { name: 'Tiger → Triceratops → Gorilla', input: 'Down+Special → Forward+Special → Special', damage: 171, note: 'RESET: defender free 19 f before the Triceratops (pressure, not a combo)' }],
}
