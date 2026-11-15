// Robin (robin) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values from robinData.js
// (stored damage = round(raw × 1.95), the same roster-parity lever as Cyborg, Raven and the Rangers). Inputs are written
// in the shared logical button tokens (Light / Heavy / Special / Ultimate / Grab / Charge / Block / Jump) so the shared
// help layer re-labels them for keyboard or pad. Measured routes: docs/robin/MOVESET.md + docs/robin/VERIFICATION.md.
export const ROBIN_CONTROLS = {
  // logical action → [keyboard P1, keyboard P2, PS5 (live pollGamepad layout)]
  rows: [
    ['Move / crouch', 'A / D, S', '← / →, ↓', 'Left stick / D-pad'],
    ['Jump / double jump (shared, maxJumps 2)', 'W, W again', '↑, ↑ again', '✕ Cross, ✕ again'],
    ['Smoke Vanish (teleport behind)', 'double-tap toward foe', 'double-tap ← / → toward', 'double-tap stick toward'],
    ['Dash (Smoke Step inside own smoke)', 'double-tap away', 'double-tap ← / → away', 'double-tap stick away'],
    ['Light (punch chain)', 'J', '1', '□ Square'],
    ['Heavy (staff sweep)', 'K', '2', '△ Triangle'],
    ['Launcher', 'I  (or W + K)', '3', 'Up + △'],
    ['Advancing staff', 'D / A (forward) + K', '→ / ← + 2', 'Forward + △'],
    ['Special family', 'L (+ direction)', '4 (+ direction)', 'R1 (+ direction)'],
    ['Ultimate', 'U', '5', 'R2'],
    ['Grab', 'O', '6', 'L1'],
    ['Remote Override (armed Dead Drop) / Charge otherwise', 'P tap / hold', '7 tap / hold', 'L2 tap / hold'],
    ['Guard', ';', '/', '○ Circle'],
    ['Combo Breaker (in hitstun)', '; + L', '/ + 4', '○ Circle + R1'],
    ['Pause', 'Esc', 'Esc', 'Options'],
  ],
  note: 'Defaults shown; the shared rebind menu changes every keyboard key above and the Move List re-labels from the logical tokens. Robin adds no Robin-only pad reader, no new button and no motion parser. L2 / Charge is Remote Override ONLY while Robin has an armed Dead Drop (or a Remote press is still held); otherwise it is the ordinary shared energy charge.',
}
export const ROBIN_KIT = { type: 'Gadget Tactician / Mobile Mid-range', energy: 'Gadget Energy', difficulty: 'Medium',
  summary: 'Dick Grayson — the Boy Wonder. Quick punches into a long bo staff, Smoke Drop cover with one enhanced Smoke Step per field, ballistic Bird\'s-Eye Bombs, a planted Dead Drop he can detonate or convert to smoke from his wrist computer, and Bomb Bat: hit his own armed bomb with the staff to send it.',
  passive: { name: 'Contingency Plan', input: 'Automatic', effect: 'At most one smoke field and one planted bomb per Robin. Bombs never home. A Robin attack that connects from inside his own smoke, or within 40 f of a Smoke Step, shows the cosmetic OUTPLAY cue (no damage change).' },
  basics: [
    { name: 'Back-fist → Straight → Rising Finish (Punch 1-3)', input: 'Light, fresh Light, fresh Light', desc: '5 / 6 / 9 f startup; raw 16 / 20 / 30. Clean-hit retaps only, three stages maximum.' },
    { name: 'Staff Sweep', input: 'Heavy', desc: '12 f; raw 46; 94 px reach.' },
    { name: 'Low Staff Check', input: 'Down + Light / Down + Heavy', desc: '7 f; raw 22; hits low.' },
    { name: 'Pole-Vault Launcher', input: 'Up + Heavy / Up-Attack', desc: '11 f; raw 36 launcher (anti-air). Jump (shared double jump) to follow.' },
    { name: 'Advancing Staff Lunge', input: 'Forward + Heavy', desc: '13 f; raw 44; travels forward, knocks away. Committed ender.' },
    { name: 'Midair Kick', input: 'Air Light / Air Heavy', desc: '7 f; raw 26.' },
    { name: 'Staff cancels', input: 'clean Punch 1 / 2 / Low → fresh Heavy / Forward + Heavy / Up + Heavy', desc: 'Punches confirm into the staff.' },
    { name: 'Double jump', input: 'Jump in the air', desc: 'The shared double jump (maxJumps 2). No energy cost, no third jump.' },
    { name: 'Smoke Vanish', input: 'Double-tap toward the foe', desc: 'Toji-speed blink (speed 98): smoke burst, he vanishes and reappears BEHIND the foe facing them. 48 f cooldown; no damage, no invulnerability.' },
  ],
  specials: [
    { name: "Bird's-Eye Bomb", input: 'Neutral Special', cost: 12, desc: '14 f; flies straight like a regular projectile, ≈ 980 px over a 70 f fuse, explodes on a wall / a foe / fuse end. Explosion raw 44, one hit per target.' },
    { name: "Air Bird's-Eye Bomb", input: 'Air Special (any direction except Up)', cost: 12, desc: '8 f; down-forward throw. Once per airtime.' },
    { name: 'Smoke Drop', input: 'Down + Special', cost: 15, desc: '8 f; a 128 px smoke field for 75 f. One field per Robin. Cover only: no damage, stun, blindness or invulnerability.' },
    { name: 'Smoke Step', input: 'Double-tap back inside own smoke', desc: 'One per field: an enhanced 144 px physical dash (12 f) with cosmetic echo copies. No invulnerability, never passes through the opponent.' },
    { name: 'Staff Express', input: 'Forward + Special', cost: 16, desc: '10 f; the "Play 3 Times" flurry exactly three times (3 bounded hits raw 12) → push thrust raw 30.' },
    { name: 'Rooftop Route', input: 'Up + Special', cost: 16, desc: '9 f rising staff strike raw 34 into an acrobatic rise. Once per airtime; never refunds a jump.' },
    { name: 'Dead Drop', input: 'Back + Special', cost: 14, desc: '10 f; plants a bomb 44 px ahead. Arms visibly over 36 f, lasts 8 s, max 1. A hostile hit or projectile destroys it.' },
    { name: 'Remote Override — Detonate', input: 'Tap Charge with an armed Dead Drop', desc: 'Wrist-computer command; the bomb blinks a 10 f warning then explodes (raw 50).' },
    { name: 'Remote Override — Convert', input: 'Hold Charge ≥ 18 f with an armed Dead Drop', desc: 'Reprograms the bomb into a Smoke Drop field at its position (no damage). Tap and hold are exclusive.' },
    { name: 'Bomb Bat', input: 'Any staff strike that touches his own ARMED planted bomb', desc: 'The bomb is consumed and launched forward as a live bomb (raw 44 blast).' },
  ],
  ultimate: { name: 'CHECKMATE: LIGHTS OUT', input: 'Ultimate', cost: 100, desc: '14 f staff opener (raw 30), grounded, also from Heavy / Punch 3 / Advancing Staff recovery. A miss or block = 40 f recovery. Clean hit: portrait cut-in → smoke reposition → staff flurry 22 ×3 → rising staff 34 → wrist-computer command → bomb blast 130 → landing. 260 raw before shared scaling.' },
  controls: ROBIN_CONTROLS,
  combos: [] }
