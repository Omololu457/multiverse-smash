// Megumi Fushiguro (megumi_fushiguro) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values
// from megumiData.js (stored damage = round(raw × 1.95), the same roster-parity lever as Robin / Cyborg / the Rangers).
// Inputs use the shared logical button tokens so the help layer re-labels them for keyboard or pad.
// Measured routes: docs/megumi/MOVESET.md + docs/megumi/VERIFICATION.md. Controls: docs/megumi/CONTROLS.md.
import { COST } from './megumiData.js'
export const MEGUMI_CONTROLS = {
  // logical action → [keyboard P1, keyboard P2, PS5 (live pollGamepad layout)]
  rows: [
    ['Move / crouch', 'A / D, S', '← / →, ↓', 'Left stick / D-pad'],
    ['Jump / double jump (shared, maxJumps 2)', 'W, W again', '↑, ↑ again', '✕ Cross, ✕ again (fresh press)'],
    ['Dash', 'double-tap A / D', 'double-tap ← / →', 'double-tap left / right'],
    ['Light chain / air normal', 'J', '1', '□ Square'],
    ['Low staff check', 'S + J', '↓ + 1', 'Down + □'],
    ['Heavy (sword arc)', 'K', '2', '△ Triangle'],
    ['Advancing sword', 'forward + K', 'forward + 2', 'Forward + △'],
    ['Launcher (rising staff)', 'W + K', '↑ + 2', 'Up + △'],
    ['Max Elephant', 'S + K', '↓ + 2', 'Down + △'],
    ['Uppercut (Up-Attack)', 'I', '3', 'Up + □ / Up-Attack'],
    ['Divine Dog', 'L', '4', 'R1'],
    ['Toad', 'forward + L', 'forward + 4', 'Forward + R1'],
    ['Nue', 'W + L', '↑ + 4', 'Up + R1'],
    ['Rabbit Escape', 'S + L', '↓ + 4', 'Down + R1'],
    ['Great Serpent', 'back + L', 'back + 4', 'Back + R1'],
    ['Shadow Step', 'P + A / D', '7 + ← / →', 'L2 + left / right'],
    ['Ultimate — Chimera Shadow Garden', 'U', '5', 'R2'],
    ['Grab', 'O', '6', 'L1'],
    ['Guard', ';', '/', '○ Circle'],
    ['Charge (L2 with no direction)', 'P hold', '7 hold', 'L2 hold'],
    ['Pause', 'Esc', 'Esc', 'Options'],
  ],
  note: 'Defaults shown; the shared rebind menu changes every keyboard key and the Move List re-labels from the logical tokens. Directions are FACING-RELATIVE. Megumi adds no Megumi-only pad reader, no new button and no motion parser. L2 + a horizontal direction is Shadow Step and never charges energy; L2 alone stays the shared Charge.',
}
export const MEGUMI_KIT = { type: 'Tactical Summoner / Close-range', energy: 'Cursed Energy', difficulty: 'Medium-Hard',
  summary: 'Ten Shadows user. Megumi always fights himself — a staff and sword from his shadow — and calls one shikigami at a time for ONE brief action: Divine Dog runs, Toad lashes and pulls, Nue strikes the air, Great Serpent rises from a fixed point, Rabbit Escape covers a reposition, and Max Elephant floods a fixed lane.',
  passive: { name: 'Shadow Routes', input: 'Automatic', effect: 'Clean hits from two DISTINCT families (normal / Dog / Toad / Nue / Serpent / Elephant) earn one stock (max 2). After a summon\'s clean hit, a fresh R1 inside 22 f spends a stock to send the next shikigami (normal cost, normal startup). Once per combo; never through guard or scaling.' },
  basics: [
    { name: 'Jab → Kick → Staff (Light chain)', input: 'Light, fresh Light, fresh Light', desc: '5 / 6 / 9 f; raw 16 / 20 / 16+22. Clean-hit retaps only, three stages maximum.' },
    { name: 'Sword Arc', input: 'Heavy', desc: '12 f; raw 46; 96 px reach.' },
    { name: 'Low Staff Check', input: 'Down + Light', desc: '8 f; raw 22; hits low.' },
    { name: 'Advancing Sword', input: 'Forward + Heavy', desc: '13 f; two hits raw 20 + 30 while travelling.' },
    { name: 'Rising Staff (launcher)', input: 'Up + Heavy', desc: '12 f; raw 40; launches. Jump to follow.' },
    { name: 'Uppercut', input: 'Up-Attack / Up + Light', desc: '7 f; raw 30 anti-air launcher.' },
    { name: 'Air Palm', input: 'Air Light', desc: '6 f; raw 24.' },
    { name: 'Winged Toad Lash (aerial ender)', input: 'Air Heavy', desc: '14 f; raw 34; knocks down. Once per airtime.' },
    { name: 'Heavy cancels', input: 'clean Jab / Kick / Low → fresh Heavy / Forward + Heavy / Up + Heavy', desc: 'Confirms into the weapons.' },
    { name: 'Double jump', input: 'Jump in the air', desc: 'The shared double jump: exactly 2 jumps, never refunded by any move.' },
  ],
  specials: [
    { name: 'Divine Dog', input: 'Special', cost: COST.dog, desc: '10 f; a dog runs straight in the captured direction (≤ 340 px), one hit raw 34, dissolves.' },
    { name: 'Toad', input: 'Forward + Special', cost: COST.toad, desc: '9 f; telegraphed tongue lane 10–150 px ahead, raw 30. Clean hit only: a short pull toward Megumi (never through guard, never the same target twice within 2 s).' },
    { name: 'Nue', input: 'Up + Special', cost: COST.nue, desc: '10 f; flies a fixed route to a point ahead / above and bursts once (raw 36) — anti-air. No jump refund.' },
    { name: 'Air Nue', input: 'Air Special', cost: COST.nue, desc: '8 f; a fixed forward-down lightning pass, raw 32. Once per airtime.' },
    { name: 'Rabbit Escape', input: 'Down + Special', cost: COST.rabbit, desc: '8 f; six rabbits cover Megumi. No damage, no invulnerability. Inside 40 f a fresh left / right performs one 120 px hop.' },
    { name: 'Great Serpent', input: 'Back + Special', cost: COST.serpent, desc: '12 f; the emergence point is captured once (40–260 px ahead), a 20 f warning, then one rising strike raw 42. Long recovery: punishable.' },
    { name: 'Max Elephant', input: 'Down + Heavy', cost: COST.elephant, desc: '26 f; silhouette warning, then a fixed water lane 120–420 px ahead: three contacts raw 22, capped push. Committed.' },
    { name: 'Shadow Step', input: 'Charge (L2) + left / right', desc: '6 f; 110 px physical travel through his shadow. Never through the opponent, no invulnerability, 70 f cooldown, no jump reset.' },
  ],
  ultimate: { name: 'CHIMERA SHADOW GARDEN', input: 'Ultimate', cost: COST.ult, desc: '18 f: hand sign → Divine Dog: Totality lunges (raw 30). Also from Heavy / Staff / Advancing Sword recovery. Clean hit: domain spreads → Totality claws 20 ×3 → Nue 30 → Max Elephant water 25 ×2 → shadow strike 90 → return (260 raw before shared scaling). Whiff / block: real recovery.' },
  extras: [{ name: 'Mahoraga (intro showcase)', input: 'Random pre-match intro variant (1 in 2)', desc: 'Presentation only — the supplied Mahoraga emergence plays during the intro. Never a move, never a second ultimate.' }],
  controls: MEGUMI_CONTROLS,
  combos: [] }
