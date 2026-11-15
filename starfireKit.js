// Starfire (starfire) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values from starfireData.js
// (stored damage = round(raw × 1.7), the same roster-parity lever as Raven / Cyborg / the Rangers). Inputs are written in
// the shared logical button tokens (Light / Heavy / Special / Ultimate / Grab / Charge / Block / Jump) so the shared help
// layer re-labels them for keyboard or pad. Measured routes: docs/starfire/MOVESET.md.
export const STARFIRE_CONTROLS = {
  // logical action → [keyboard P1, keyboard P2, PS5 (live pollGamepad layout)]
  rows: [
    ['Move / crouch', 'A / D, S', '← / →, ↓', 'Left stick / D-pad'],
    ['Jump / double jump (shared)', 'W, W again', '↑, ↑ again', '✕ Cross, ✕ again'],
    ['Dash', 'double-tap A / D', 'double-tap ← / →', 'double-tap stick / D-pad'],
    ['Light (J1 → J2 → J3 on clean hits)', 'J', '1', '□ Square'],
    ['Low', 'S + J', '↓ + 1', 'Down + □'],
    ['Heavy', 'K', '2', '△ Triangle'],
    ['Launcher', 'I  (or W + K)', '3', 'Up + △'],
    ['Starbolt (air: Comet Shot)', 'L', '4', 'R1'],
    ['Solar Rush', 'forward + L', 'forward + 4', 'Forward + R1'],
    ['Star Sight (eye laser)', 'back + L', 'back + 4', 'Back + R1'],
    ['Skybreak', 'W + L', '↑ + 4', 'Up + R1'],
    ['Orbital Star', 'S + L', '↓ + 4', 'Down + R1'],
    ['Ultimate', 'U', '5', 'R2'],
    ['Grab', 'O', '6', 'L1'],
    ['Levitation toggle (tap)', 'P', '7', 'L2'],
    ['Guard', ';', '/', '○ Circle'],
    ['Pause', 'Esc', 'Esc', 'Options'],
  ],
  note: 'Defaults shown; the shared rebind menu changes every keyboard key above and the Move List re-labels from the logical tokens. Starfire adds no Starfire-only pad reader, no new button and no motion parser. L2 / Charge is a levitation TOGGLE (tap on, tap off) and never recharges Energy. Precedence: menu / cinematic → breaker → Ultimate → directional Special → neutral Special → movement.',
}
export const STARFIRE_KIT = { type: 'Aerial Blaster / Eye-Beam Zoner', energy: 'Energy', difficulty: 'Medium',
  summary: "Koriand'r of Tamaran — \"On Tamaran, we fight with joy!\" Fast punches, starbolts on the ground and a down-forward Comet Shot in the air, a travelling Solar Rush, a rising Skybreak, a slow Orbital Star, and STAR SIGHT: twin eye beams from her actual eyes. Fire Star Sight through your own Orbital Star for PRISM BREAK.",
  passive: { name: 'Prism Break', input: 'Star Sight through your own Orbital Star', effect: 'If an eye beam reaches her own Orbital Star before any foe, the orb is consumed atomically and the rest of the laser becomes ONE empowered burst (raw 60) on the aim line. Never stacks with the laser hit; the burst cannot trigger another Prism Break.' },
  basics: [
    { name: 'Star Jab → Advancing Strike → Tamaranean Finisher (J1-J3)', input: 'Light, fresh Light, fresh Light', desc: '5 / 7 / 10 f startup; raw 16 / 20 / 28. Clean-hit retaps only; J2 advances, J3 knocks back.' },
    { name: 'Heavy Starfist', input: 'Heavy', desc: '13 f; raw 50.' },
    { name: 'Low Sweep', input: 'Down + Light / Down + Heavy', desc: '7 f; raw 22; hits low (landing-crouch art; no kick exists on the sheet).' },
    { name: 'Rising Glow', input: 'Up + Heavy / Up-Attack', desc: '12 f; raw 38 launcher. Jump (shared double jump) to follow.' },
    { name: 'Air Strike', input: 'Air Light / Air Heavy', desc: '8 f; raw 28.' },
    { name: 'Levitation', input: 'Tap Charge (L2)', cost: 10, desc: '10 Energy, then 6 / s; at most 2 s. Never faster than her walk; bounded height. Ends on timeout, low Energy, a hit, landing or a second tap. Never grants a jump; once per airtime.' }],
  specials: [
    { name: 'Starbolt', input: 'Neutral Special', cost: 10, desc: '13 f; raw 30 energy ball + explosion. One bolt per Starfire.' },
    { name: 'Comet Shot', input: 'Air Special (neutral / forward)', cost: 12, desc: '13 f; raw 32, travels down-forward and bursts on the floor. Once per airtime.' },
    { name: 'Solar Rush', input: 'Forward + Special', cost: 15, desc: '12 f; raw 46. Real travel (≤ 140 px), stops at the foe.' },
    { name: 'Skybreak', input: 'Up + Special', cost: 16, desc: '9 f; raw 38, one contact, rising. Once per airtime; never resets the jump counter.' },
    { name: 'Orbital Star', input: 'Down + Special', cost: 16, desc: '16 f; raw 26 slow orb (2.2 px / f, ~2.7 s). Max 1 per Starfire.' },
    { name: 'Star Sight', input: 'Back + Special (air: once per airtime)', cost: 14, desc: '14 f startup, 8 f beams, raw 44: both eye beams are ONE hit. Aim captured on startup frame 10 toward the foe (±18°), no tracking. Beams start at her validated eye anchors.' }],
  ultimate: { name: 'SUPERNOVA — EYES OF TAMARAN', input: 'Ultimate', cost: 100, desc: '16 f starbolt opener (raw 30, blockable), grounded, also from Heavy / J3 recovery. Miss or block = 60 f recovery. Clean hit: portrait cut-in → she rises → 4 starbolts (4×20) → twin eye beams from her validated eye anchors (2×30) → full explosion (100) → legal landing. 270 raw before scaling.' },
  controls: STARFIRE_CONTROLS,
  combos: [] }
