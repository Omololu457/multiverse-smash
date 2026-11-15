// Frozone (frozone) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values from frozoneData.js
// (stored damage = raw; the shared pipeline applies GLOBAL_DAMAGE_SCALE 0.6 and combo scaling to every character alike).
// Inputs use the shared logical button tokens so the help layer re-labels them for keyboard or pad.
// Measured values: docs/frozone/DAMAGE_AUDIT.md + VERIFICATION.md. Controls: docs/frozone/CONTROLS.md.
import { COST, CHILL, FREEZE, SHATTER } from './frozoneData.js'
export const FROZONE_CONTROLS = {
  // logical action → [keyboard P1, keyboard P2, PS5 (live pollGamepad layout)]
  rows: [
    ['Move / crouch', 'A / D, S', '← / →, ↓', 'Left stick / D-pad'],
    ['Jump / double jump (shared, maxJumps 2)', 'W, W again', '↑, ↑ again', '✕ Cross, ✕ again (fresh press)'],
    ['ICE SKATE (ground) / air-skate burst (once per airtime)', 'double-tap A / D', 'double-tap ← / →', 'double-tap left / right'],
    ['Skate brake', 'opposite direction or ;', 'opposite direction or /', 'opposite direction or ○ Circle'],
    ['Ice strike chain', 'J, J, J', '1, 1, 1', '□, □, □'],
    ['Low ice sweep', 'S + J', '↓ + 1', 'Down + □'],
    ['Crystal strike (heavy, Shatter)', 'K', '2', '△ Triangle'],
    ['Rising wedge (launcher)', 'W + K or I', '↑ + 2 or 3', 'Up + △'],
    ['Air ice burst', 'air J', 'air 1', 'air □'],
    ['Down-air strike', 'air S + K (or air K)', 'air ↓ + 2', 'air Down + △'],
    ['Ice Lance', 'L', '4', 'R1'],
    ['Glacier Rush', 'forward + L', 'forward + 4', 'Forward + R1'],
    ['Rising Glacier', 'W + L', '↑ + 4', 'Up + R1'],
    ['Black Ice', 'S + L', '↓ + 4', 'Down + R1'],
    ['Icebreaker (Shatter)', 'back + L', 'back + 4', 'Back + R1'],
    ['Ultimate — Absolute Zero', 'U', '5', 'R2'],
    ['Grab', 'O', '6', 'L1'],
    ['Guard', ';', '/', '○ Circle'],
    ['Charge (shared)', 'P hold', '7 hold', 'L2 hold'],
    ['Pause', 'Esc', 'Esc', 'Options'],
  ],
  note: 'Defaults shown; the shared rebind menu changes every keyboard key and the Move List re-labels from the logical tokens. Directions are FACING-RELATIVE. Frozone adds no Frozone-only pad reader, no new button and no motion parser; L2 stays the shared Charge.',
}
export const FROZONE_KIT = { type: 'Ice Skater / Rushdown-Setplay', energy: 'Frost', difficulty: 'Medium',
  summary: 'A fast ice skater. Clean hits from Ice Lance, Glacier Rush and Black Ice add Chill pips; the third pip freezes the opponent briefly and a Heavy or Icebreaker Shatters the shell for a fixed bonus. Black Ice can be kept as a trap or skated across for a speed burst — and an Ice Lance crossing it becomes a broader Frost Lance.',
  passive: { name: 'Chill → Freeze → Shatter', input: 'Automatic', effect: `≤ ${CHILL.max} pips (one per clean designated special, expire after ${CHILL.expire / 60} s). The third freezes for ${FREEZE.dur} ticks (once per combo; ${FREEZE.immunity} ticks refreeze immunity after). Heavy / Icebreaker on a frozen target: Shatter +${SHATTER.raw} raw once. Any other damage thaws with no bonus.` },
  basics: [
    { name: 'Ice strike chain', input: 'Light, fresh Light, fresh Light', desc: '5 / 6 / 8 f; raw 45 / 45 / 60. Clean-hit retaps only.' },
    { name: 'Crystal strike', input: 'Heavy', desc: '13 f; raw 90; Shatter-capable. Also from a clean Light / Low.' },
    { name: 'Low ice sweep', input: 'Down + Light', desc: '7 f; raw 45; hits low.' },
    { name: 'Rising wedge (launcher)', input: 'Up + Heavy / Up-Attack', desc: '12 f; raw 75.' },
    { name: 'Air ice burst', input: 'Air Light', desc: '6 f; raw 65.' },
    { name: 'Down-air strike', input: 'Air Heavy', desc: '12 f; raw 85; bounded landing burst.' },
    { name: 'Grab', input: 'Grab', desc: 'Shared grab / throw rules; raw 45.' },
    { name: 'Ice Skate', input: 'Double-tap', desc: 'Shared dash with an acceleration → cruise → ease-out profile; brake with the opposite direction or Guard. In the air: one level burst per airtime.' },
  ],
  specials: [
    { name: 'Ice Lance', input: 'Special', cost: COST.lance, desc: '11 f; narrow projectile, raw 90, one Chill.' },
    { name: 'Glacier Rush', input: 'Forward + Special', cost: COST.rush, desc: 'Disc surf (~187 px) into a finishing strike at 22 f; raw 120; one Chill on the finisher.' },
    { name: 'Rising Glacier', input: 'Up + Special', cost: COST.rise, desc: '8 f; ice-assisted rise, one hit, raw 110. Once per airtime, never a jump refund.' },
    { name: 'Black Ice', input: 'Down + Special', cost: COST.blackIce, desc: 'One visible patch (7 s). Opponent contact: one low hit (raw 30) + one Chill. Skate across it: Skate Switch burst. A Lance crossing it: Frost Lance (+15).' },
    { name: 'Icebreaker', input: 'Back + Special', cost: COST.breaker, desc: '18 f; raw 145; Shatter-capable; no armor.' },
  ],
  ultimate: { name: 'ABSOLUTE ZERO: CITY ON ICE', input: 'Ultimate', cost: COST.ult, desc: '14 f opening strike (raw 40); also from a clean Heavy / finisher. Clean hit: ramp, three skating passes (3 × 40), crystal shell, brake, Shatter (250) — 410 raw before shared scaling. Whiff / block: real recovery.' },
  controls: FROZONE_CONTROLS,
  combos: [] }
