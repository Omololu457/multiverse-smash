// Violet Parr (violet) — Move List / kit metadata (kits.js entry). Damage figures are the DELIVERED on-hit values (the
// authored raw ÷ 0.60 is stored in violetData.js; combo scaling 85 % per hit applies on top). Frame data is measured by
// harness/violet_moveset.test.mjs (startup N = the hit lands on frame N, counting the press frame as 1). Inputs use the
// shared logical tokens; directions are relative to facing; P = Special.
export const VIOLET_CONTROLS = {
  // logical action → [keyboard P1, keyboard P2, PS5 (live pollGamepad layout)]
  rows: [
    ['Move / crouch', 'A / D, S', '← / →, ↓', 'Left stick / D-pad'],
    ['Jump / double jump', 'W, W again', '↑, ↑ again', '✕ Cross, fresh ✕ again'],
    ['Dash (hold forward after it → run 8.0 px/f)', 'double-tap A / D', 'double-tap ← / →', 'double-tap stick / D-pad'],
    ['Jab / Low', 'J / S + J', '1 / ↓ + 1', '□ Square / Down + □'],
    ['Heavy', 'K', '2', '△ Triangle'],
    ['Launcher (hold Up after a clean hit = jump-cancel hop)', 'I', '3', 'Up + △'],
    ['Air', 'J / K / I in the air', '1 / 2 / 3 in the air', '□ / △ in the air'],
    ['Special (P) — motions below', 'L', '4', 'R1'],
    ['FULL FORCE', 'U  (or ↓↘→↓↘→ + L)', '5', 'R2'],
    ['Grab', 'O', '6', 'L1'],
    ['Guard', ';', '/', '○ Circle'],
  ],
  note: 'Defaults shown; the shared rebind menu changes every key above. Motions are read from the same per-frame input on keyboard, pad, replay and LAN.',
}
export const VIOLET_KIT = { type: 'Zoner / Trickster', energy: 'Force Field', difficulty: '3',
  summary: 'Violet Parr — "Now you see me." Turns invisible, walls the screen with force rings, traps foes in bubbles and turns their projectiles back on them. Low health (900); wins by controlling space and ambushing out of Vanish.',
  passive: { name: 'Force Field', input: '—', effect: 'Energy 100: recharges 5 / s, +4 when her hit lands, +3 when she takes a hit (no recharge while invisible). Protective Instinct: once per round below 20 % health, the next hit pops a free 30-frame dome that catches it.' },
  basics: [
    { name: 'Jab', input: 'Light', desc: '5 f · 18 · 0 on block. Chains once into Jab, or into Low / Heavy / Launcher.' },
    { name: 'Heavy', input: 'Heavy', desc: '13 f · 52 · −6 on block. Cancels into Launcher or any special.' },
    { name: 'Low', input: 'Down + Light', desc: '7 f · 24 · −4 on block · hits low.' },
    { name: 'Launcher', input: 'Up-Attack', desc: '11 f · 46 · −9 on block. Clean hit: hold Up for the jump-cancel hop.' },
    { name: 'Air', input: 'any attack in the air', desc: '7 f · 30 · +2 on block (jump-in).' },
    { name: 'Phase Step', input: 'Back, Back + Light', desc: 'Back-step, invincible frames 3–12, free, 5 s cooldown.' },
  ],
  specials: [
    { name: 'Vanish', input: 'Down, Down + Special', cost: 15, desc: 'Turn invisible (6 / s drain, 6 s max, 8 s cooldown). The foe stops auto-facing you. Your first hit deals +20 % and ends it; any hit taken ends it. Press again to reappear.' },
    { name: 'Force Push', input: '↓↘→ + Special (or Special alone)', cost: 12, desc: 'Force ring travels 520 px: 50 + push-back. One on screen.' },
    { name: 'Bubble Shield', input: '←↙↓ + Special', cost: 20, desc: '40-frame dome: stops every strike (not grabs) and reflects projectiles at 1.2× speed. 10 f recovery, 6 s cooldown.' },
    { name: 'Force Ball', input: '→→ + Special', cost: 15, desc: 'Rolling lunge 320 px, two hits (30 + 30), armoured against projectiles.' },
    { name: 'Field Trap', input: '↓↙← + Special', cost: 22, desc: 'Telegraphed bubble on the foe’s spot: forms after 18 f and holds 45 f. No damage; your next hit releases it — a combo starter.' },
  ],
  ultimate: { name: 'FULL FORCE', input: '↓↘→↓↘→ + Special, or Ultimate (grounded, 100 Force Field)', cost: 100, desc: 'Cinematic: she vanishes, a force-field sphere snaps shut on the foe (15), squeezes (15), slams them into the floor, across the stage and down again (20 × 3), crushes small as she reappears (20), then detonates into one enormous bubble (110) — 220 unscaled, unblockable once the cast connects. A whiff still costs the bar (90-frame lockout).' },
  controls: VIOLET_CONTROLS,
  combos: [
    { name: 'Bread and butter', input: 'Jab, Jab, Launcher, (hold Up) Air', damage: '≈ 84' },
    { name: 'Low confirm', input: 'Low, Heavy, ↓↘→ + Special', damage: '≈ 104' },
    { name: 'Trap route', input: '↓↙← + Special, Heavy, Launcher, →→ + Special', damage: '≈ 130' },
    { name: 'Ambush', input: 'Down, Down + Special, approach, Heavy, ↓↘→ + Special', damage: '≈ 104 (+20 % on the opener)' },
  ] }
