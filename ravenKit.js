// Raven (raven) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values from ravenData.js
// (stored damage = round(raw × 1.7), the same roster-parity lever as Cyborg and the Rangers). Inputs are written in the
// shared logical button tokens (Light / Heavy / Special / Ultimate / Grab / Charge / Block / Jump) so the shared help
// layer re-labels them for keyboard or pad. Measured routes: docs/raven/COMBOS_BALANCE.md.
export const RAVEN_CONTROLS = {
  // logical action → [keyboard P1, keyboard P2, PS5 (live pollGamepad layout)]
  rows: [
    ['Move / crouch', 'A / D, S', '← / →, ↓', 'Left stick / D-pad'],
    ['Jump / double jump (shared)', 'W, W again', '↑, ↑ again', '✕ Cross, ✕ again'],
    ['Dash', 'double-tap A / D', 'double-tap ← / →', 'double-tap stick / D-pad'],
    ['Light', 'J', '1', '□ Square'],
    ['Heavy', 'K', '2', '△ Triangle'],
    ['Up-attack (launcher)', 'I  (or W + K)', '3', 'Up + △'],
    ['Special family', 'L (+ direction)', '4 (+ direction)', 'R1 (+ direction)'],
    ['Soul Shell early end', 'L again (shell up)', '4 again', 'R1 again'],
    ['Ultimate', 'U', '5', 'R2'],
    ['Grab', 'O', '6', 'L1'],
    ['Levitation toggle (tap)', 'P', '7', 'L2'],
    ['Guard', ';', '/', '○ Circle'],
    ['Combo Breaker (in hitstun)', '; + L', '/ + 4', '○ Circle + R1'],
  ],
  note: 'Defaults shown; the shared rebind menu changes every keyboard key above and the Move List re-labels from the logical tokens. Raven adds no Raven-only pad reader, no new button and no motion parser. L2 / Charge is a levitation TOGGLE for Raven (tap on, tap off) and never recharges Energy. Precedence: menu / cinematic → breaker → Ultimate → active shell → directional Special → neutral Special → movement.',
}
export const RAVEN_KIT = { type: 'Mobile Spellweaver / Telekinetic Setup', energy: 'Energy', difficulty: 'Medium-Hard',
  summary: 'Rachel Roth — "Everything has its place." Quick short-range palms, a Dark Pulse orb, and a telekinetic brick game: lift two piles, send them, drop one from above, or fire an orb THROUGH an idle pile to infuse it into a heavier brick. Soul Shell absorbs frontal hits. Agile ground speed, the shared double jump, plus a short Energy-limited levitation toggle.',
  passive: { name: 'Everything Has Its Place', input: 'Automatic', effect: 'At most 2 bricks exist per Raven (idle piles + launched bricks). One hostile attack or projectile breaks one pile. An own Dark Pulse that crosses an own idle pile becomes ONE infused brick (raw 56) — the orb and pile are consumed atomically, never a stacked hit.' },
  basics: [
    { name: 'Shadow Jab → Palm Extension → Cloaked Finish (J1-J3)', input: 'Light, fresh Light, fresh Light', desc: '5 / 7 / 10 f startup; raw 17 / 21 / 28. Clean-hit retaps only, three stages maximum.' },
    { name: 'Dark Palm', input: 'Heavy', desc: '14 f; raw 52.' },
    { name: 'Low Ground Check', input: 'Down + Light / Down + Heavy', desc: '8 f; raw 24; hits low.' },
    { name: 'Rising Palm', input: 'Up + Heavy / Up-Attack', desc: '12 f; raw 40 launcher. Jump (shared double jump) to follow.' },
    { name: 'Aerial Palm', input: 'Air Light / Air Heavy', desc: '8 f; raw 29.' },
    { name: 'Command chain', input: 'Forward + Heavy → fresh Heavy → fresh Heavy', desc: 'Advancing palm 30 → dark strike 34 → knock-away 42. A confirmed Up + Heavy on the last step = Rising Palm.' },
    { name: 'Levitation', input: 'Tap Charge (airborne or grounded)', cost: 10, desc: '10 Energy to enter, then 6 / s; at most 2 s. Horizontal speed never exceeds her walk; gentle vertical bounds. Ends on timeout, low Energy, a hit, landing or a second tap. Never grants a jump; once per airtime.' }],
  specials: [
    { name: 'Dark Pulse', input: 'Neutral Special', cost: 10, desc: '12 f; raw 32 orb. One orb per Raven.' },
    { name: 'Air Dark Pulse', input: 'Air Special (neutral / forward / back)', cost: 12, desc: '14 f; raw 32. Once per airtime.' },
    { name: 'Lift the Room', input: 'Down + Special', cost: 18, desc: '20 f startup, 18 f recovery. Two brick piles at ±80 px (bounded), 3 s life. Rejected while piles exist.' },
    { name: 'Telekinetic Send', input: 'Forward + Special', cost: 8, desc: 'With an idle pile: 10 f, raw 46 thrown brick. With no pile: 18 Energy, 20 f to conjure one brick.' },
    { name: 'Falling Verdict', input: 'Up + Special', cost: 15, desc: '15 with a pile / 25 without. 24 f; raw 54 brick dropped on a column ≤ 220 px ahead (visible warning). One drop per Raven. Up + Special never jumps.' },
    { name: 'Soul Shell', input: 'Back + Special', cost: 18, desc: '8 f startup, up to 30 f active, 22 f recovery, 3 s cooldown. Absorbs up to 2 frontal contacts; grabs, ultimates and unblockables bypass. Special again ends it early through Shield End.' }],
  ultimate: { name: 'AZARATH — THE ROOM OBEYS', input: 'Ultimate', cost: 100, desc: '30 f Dark Pulse opener (raw 30), grounded, also from Heavy / J3 / dark strike / knock-away recovery. A miss or block = 60 f recovery. Clean hit: portrait cut-in → she rises → two room piles thrown (40 + 40) → her shell closes → Shield End → release 160. 270 raw total before scaling.' },
  controls: RAVEN_CONTROLS,
  combos: [] }
