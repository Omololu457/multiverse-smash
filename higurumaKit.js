// Hiromi Higuruma (higuruma) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values from
// higurumaData.js (stored damage = round(raw × 1.95), the same roster-parity lever as Robin / Cyborg / Raven). Inputs use
// the shared logical button tokens (Light / Heavy / Special / Ultimate / Grab / Charge / Block / Jump) so the shared help
// layer re-labels them for keyboard or pad. Measured routes: docs/higuruma/MOVESET.md + docs/higuruma/VERIFICATION.md.
export const HIGURUMA_CONTROLS = {
  // logical action → [keyboard P1, keyboard P2, PS5 (live pollGamepad layout)]
  rows: [
    ['Move / crouch', 'A / D, S', '← / →, ↓', 'Left stick / D-pad'],
    ['Jump / double jump (shared, maxJumps 2)', 'W, W again', '↑, ↑ again', '✕ Cross, fresh ✕ again'],
    ['Dash (Precedent cancel when eligible)', 'double-tap A / D', 'double-tap ← / →', 'double-tap stick / D-pad'],
    ['Small-gavel chain', 'J, J, J', '1, 1, 1', '□ Square ×3'],
    ['Low check', 'S + J', '↓ + 1', 'Down + □'],
    ['Giant gavel overhead', 'K', '2', '△ Triangle'],
    ['Extended poke', 'forward + K', 'forward + 2', 'Forward + △'],
    ['Launcher', 'I  (or W + K)', '3', 'Up + △'],
    ['Giant sweep', 'S + K', '↓ + 2', 'Down + △'],
    ['Air normal', 'J / K in the air', '1 / 2 in the air', '□ / △ in the air'],
    ['Special family', 'L (+ direction)', '4 (+ direction)', 'R1 (+ direction)'],
    ['Deadly Sentencing', 'U', '5', 'R2'],
    ['Grab', 'O', '6', 'L1'],
    ['Energy charge (shared)', 'P hold', '7 hold', 'L2 hold'],
    ['Guard', ';', '/', '○ Circle'],
    ['Combo Breaker (in hitstun)', '; + L', '/ + 4', '○ Circle + R1'],
    ['Pause', 'Esc', 'Esc', 'Options'],
  ],
  note: 'Defaults shown; the shared rebind menu changes every keyboard key above and the Move List re-labels from the logical tokens. Forward / back are relative to facing. Higuruma adds no Higuruma-only pad reader, no new button and no motion parser. L2 keeps the shared energy charge: the sheet\'s detached-looking gavel is drawn on a cord still held in his hand (a tethered lash, used as Forward + △), so no throw / recall action is bound.',
}
export const HIGURUMA_KIT = { type: 'Technical Midrange / Weapon Scaler', energy: 'Cursed Energy', difficulty: 'Medium-Hard',
  summary: 'Hiromi Higuruma — the defense attorney turned Culling Game player. Quick small-gavel strikes, long extended-handle reach, and slow giant-gavel commitments. Build the CASE FILE (CLOSE / REACH / WEIGHT) with clean hits to earn a PRECEDENT dash cancel, and convene Deadly Sentencing for a fixed courtroom verdict and the Executioner\'s Sword.',
  passive: { name: 'Case File → Precedent', input: 'Automatic / double-tap dash', effect: 'Clean confirmed hits mark CLOSE (small gavel), REACH (extended gavel) and WEIGHT (giant gavel), once each per case. All three = one Precedent token (max 1). Spend it with a FRESH double-tap dash during the late recovery of a clean, confirmed gavel hit: the recovery becomes the ordinary dash. No invulnerability, no bonus damage, one per combo. Blocks, whiffs and repeated hit ticks never mark evidence. Gameplay categories only — not legal accusations.' },
  basics: [
    { name: 'Gavel Chop → Straight → Spinning Close (small gavel)', input: 'Light, fresh Light, fresh Light', desc: '6 / 6 / 8 f startup; raw 16 / 20 / 28. Clean-hit retaps only, three stages maximum. CLOSE.' },
    { name: 'Low Gavel Check', input: 'Down + Light', desc: '8 f; raw 20; hits low. CLOSE.' },
    { name: 'Extended Lash', input: 'Forward + Heavy', desc: '12 f; raw 34; the corded extension reaches ≈ 200 px from his body centre. REACH.' },
    { name: 'Rising Gavel (launcher)', input: 'Up + Heavy / Up-Attack', desc: '12 f; raw 32 launcher. Jump to follow. REACH.' },
    { name: 'Rising Air Swing', input: 'Air Light / Air Heavy', desc: '7 f; raw 24; hits above and in front. REACH.' },
    { name: 'Giant Gavel Overhead', input: 'Heavy', desc: '22 f; raw 58; committed, 30 f recovery. WEIGHT.' },
    { name: 'Giant Gavel Upswing', input: 'Down + Heavy', desc: '18 f; raw 50; ground-level scoop, hits low, knocks up. WEIGHT.' },
    { name: 'Heavy cancels', input: 'clean small-gavel hit → fresh Heavy family', desc: 'Light / Straight / Low confirm into any Heavy-button normal.' },
    { name: 'Double jump', input: 'Jump in the air', desc: 'The shared double jump (maxJumps 2). Nothing refunds a jump.' },
  ],
  specials: [
    { name: 'Extension of the Court', input: 'Neutral Special', cost: 12, desc: '13 f; the long-handle extension (≈ 250 px from his body centre, as drawn); raw 36; one contact per target; 24 f recovery. REACH.' },
    { name: 'Cross-Examination', input: 'Forward + Special', cost: 16, desc: 'Advances ≈ 80 px (physical, stage-clamped, never through the foe), then 3 small-gavel strikes raw 12 / 12 / 22 (46 total). Not invulnerable. CLOSE.' },
    { name: 'Rising Objection', input: 'Up + Special (ground or air)', cost: 16, desc: '9 f scoop into a leaping overhead swing; raw 34; anti-air with a short rise. Once per airtime; never refunds a jump. REACH.' },
    { name: 'Order in the Court', input: 'Down + Special', cost: 20, desc: '24 f visible giant-gavel leap and slam; one grounded impact raw 64; the dust ring is presentation only; 32 f recovery. WEIGHT.' },
    { name: 'Objection', input: 'Back + Special', cost: 15, desc: 'Bracing gavel guard: a counter window on frames 3–18 against ONE frontal strike (not grabs, projectiles, ultimates or unblockables) → a gavel straight raw 30. A miss leaves 21 f of recovery. No activation in hitstun.' },
  ],
  ultimate: { name: 'DOMAIN EXPANSION — DEADLY SENTENCING', input: 'Ultimate (grounded, 100 energy)', cost: 100, desc: '16 f extended-gavel opener (raw 30), blockable; whiff / block = 40 f recovery. Clean hit: the court convenes → CASE REVIEW (this match\'s marks) → CONFISCATION (presentation) → VERDICT: GUILTY giant gavel 70 → Executioner\'s Sword 170. 270 raw before shared scaling; no instant kill.' },
  controls: HIGURUMA_CONTROLS,
  combos: [] }
