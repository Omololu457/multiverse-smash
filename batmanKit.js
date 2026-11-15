// Batman (batman) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values from batmanData.js
// (stored move damage = raw; the shared ×0.60 global scale and combo scaling apply on top — docs/batman/DAMAGE_AUDIT.md).
// Inputs use the shared logical button tokens (Light / Heavy / Special / Ultimate / Grab / Charge / Block / Jump) so the
// shared help layer re-labels them for keyboard or pad. Support machines are custom game adaptations of supplied generic
// sprite packs — not official Batman vehicle designs.
export const BATMAN_CONTROLS = {
  // logical action → [keyboard P1, keyboard P2, PS5 (live pollGamepad layout)]
  rows: [
    ['Move / crouch', 'A / D, S', '← / →, ↓', 'Left stick / D-pad'],
    ['Jump / double jump (fresh second press)', 'W, W again', '↑, ↑ again', '✕ Cross, fresh ✕ again'],
    ['Dash (physical; Shadow Dash inside his smoke)', 'double-tap A / D', 'double-tap ← / →', 'double-tap stick / D-pad'],
    ['Light chain (3 stages on clean hits)', 'J, J, J', '1, 1, 1', '□ Square ×3'],
    ['Low strike', 'S + J', '↓ + 1', 'Down + □'],
    ['Air strike', 'J in the air', '1 in the air', '□ in the air'],
    ['Heavy kick', 'K', '2', '△ Triangle'],
    ['Advancing heavy', 'forward + K', 'forward + 2', 'Forward + △'],
    ['Launcher', 'I  (or W + K)', '3', 'Up + △'],
    ['Sweep', 'S + K', '↓ + 2', 'Down + △'],
    ['Cape counter', 'back + K', 'back + 2', 'Back + △'],
    ['Air kick / cape dive', 'K / S + K in the air', '2 / ↓ + 2 in the air', '△ / Down + △ in the air'],
    ['Batarang', 'L', '4', 'R1'],
    ['Grapnel Breaker / Rooftop Extraction / Smoke and Shadow / Gotham Airspace', 'forward / W / S / back + L', 'forward / ↑ / ↓ / back + 4', 'Forward / Up / Down / Back + R1'],
    ['Support order (hold Charge, then Special + direction; while Charge is held on the ground, Up is a direction, not a jump)', 'hold P + L (+ dir)', 'hold 7 + 4 (+ dir)', 'hold L2 + R1 (+ direction)'],
    ['KNIGHTFALL: ORBITAL IMPACT', 'U', '5', 'R2'],
    ['Grab', 'O', '6', 'L1'],
    ['Energy charge (shared; L2 alone after 10 f)', 'P hold', '7 hold', 'L2 hold'],
    ['Guard', ';', '/', '○ Circle'],
    ['Pause', 'Esc', 'Esc', 'Options'],
  ],
  note: 'Defaults shown; the shared rebind menu changes every keyboard key above and the Move List re-labels from the logical tokens. Forward / back are relative to facing. No Batman-only pad reader, no new button and no motion parser: L2 / Charge is the support-order modifier for the first 10 frames of a hold and for any hold in which R1 is pressed; otherwise it is the ordinary shared charge.',
}
export const BATMAN_KIT = { type: 'Tactical Brawler / Fleet Commander', energy: 'Gadget Energy', difficulty: 'Hard',
  summary: 'Batman — a disciplined martial artist with a belt of gadgets and an automated support fleet. You control Batman only: drones, aircraft, a carrier with ground units and an automaton act on their own, one major operation at a time. Machines can be shot down; payloads are scheduled and committed. Land the grapnel opener of KNIGHTFALL and the aircraft hauls the foe to orbit and drives them back into the stage.',
  passive: { name: 'Support Fleet', input: 'Charge (L2) + Special (R1) + direction', effect: 'One MAJOR operation at a time (Airspace, Interceptor, Carrier, Skyhook, Cover, Automaton). A new order is accepted only when none is live or the live one has reached its EXIT phase (short hand-off overlap). Each has its own cooldown; illegal orders are refused BEFORE energy is spent. Machines take damage from strikes / projectiles and are destroyed (payloads cancelled). Assist hits use the shared damage choke-point and extend Batman\'s combo; blocked payloads chip 12 %.' },
  basics: [
    { name: 'Jab → Cross → Rising Knee', input: 'Light, fresh Light, fresh Light', desc: '5 / 6 / 7 f startup; raw 48 / 48 / 64. Clean-hit retaps only.' },
    { name: 'Low Strike', input: 'Down + Light', desc: '5 f; raw 42; hits low.' },
    { name: 'Heavy Kick', input: 'Heavy', desc: '11 f; raw 95.' },
    { name: 'Spinning Advance', input: 'Forward + Heavy', desc: '16 f; advances 4 px/f (stage-clamped, never through the foe); raw 95.' },
    { name: 'Rising Uppercut (launcher)', input: 'Up + Heavy / Up-Attack', desc: '6 f startup; raw 75 shared Balanced launcher (foe vy −32, Batman stays grounded). Follow: jump after the hit freeze → double jump → Air Strike.' },
    { name: 'Sweep', input: 'Down + Heavy', desc: '10 f; raw 80; hits low, knocks down.' },
    { name: 'Cape Counter', input: 'Back + Heavy', desc: 'Frames 3–20 catch ONE frontal strike (not grabs / projectiles / ultimates / unblockables) → cape-sweep kick raw 100.' },
    { name: 'Air Strike / Air Kick', input: 'Air Light / Air Heavy', desc: 'raw 65 each.' },
    { name: 'Cape Dive', input: 'Air Down + Heavy', desc: 'Committed diagonal dive raw 90; 16 f landing recovery.' },
    { name: 'Throw', input: 'Grab', desc: 'Reach-and-pull throw raw 45.' },
  ],
  specials: [
    { name: 'Batarang', input: 'Neutral Special (ground or air)', cost: 8, desc: 'Outbound leg raw 40 + return leg raw 30 (one hit per target per leg; 70 total). One batarang at a time.' },
    { name: 'Grapnel Breaker', input: 'Forward + Special', cost: 14, desc: 'Blockable hook (raw 25, reach ≈ 312 px). Clean hit pulls the foe in over 10 f → rope kick raw 60 (85 total). Block / whiff: the line drops, longer recovery.' },
    { name: 'Rooftop Extraction', input: 'Up + Special (ground or air)', cost: 12, desc: 'Grapnel zip upward with a rising knee raw 55. Once per airtime; never restores the double jump.' },
    { name: 'Smoke and Shadow', input: 'Down + Special', cost: 16, desc: 'Smoke field (150 f, r 120). A FRESH double-tap dash inside it once per field is the Shadow Dash (faster, longer). No teleport, no invulnerability.' },
    { name: 'Gotham Airspace', input: 'Back + Special', cost: 35, desc: '≈ 6 s operation: scanner acquires the target, two bombardiers orbit it and release 10 committed bombs (raw 20 each, 200 budget). Bombers can be shot down.' },
  ],
  orders: [
    { name: 'Cross-fire Interceptor', input: 'Charge + Special', cost: 25, desc: 'Gunship bursts from one side, banks over, bursts from the other; box-platform support pass. 150 raw budget.' },
    { name: 'Arsenal Carrier → Ground Barrage', input: 'Charge + Forward + Special', cost: 30, desc: 'Carrier lowers a tracked cannon (3 shells) and a launcher unit (2 arcing rounds + 1 gun round). 180 raw budget.' },
    { name: 'Skyhook', input: 'Charge + Up + Special', cost: 25, desc: 'Rotorcraft hook check (blockable, raw 50) → lift → drop → landing slam raw 90. 140 raw.' },
    { name: 'Capsule Cover + Escort Pass', input: 'Charge + Down + Special', cost: 18, desc: 'Cover smoke at Batman, walker gunner + winged gunner pass. 80 raw budget.' },
    { name: 'Wayne Automaton', input: 'Charge + Back + Special', cost: 25, desc: 'Ground robot: two arm-blaster beams (40 / 40) and a shoulder cannon (70). 150 raw.' },
  ],
  ultimate: { name: 'KNIGHTFALL: ORBITAL IMPACT', input: 'Ultimate (grounded, 100 energy)', cost: 100, desc: 'Committed grapnel opener (14 f, blockable; 40 delivered). Clean hit: the aircraft snatches the foe on a tether → sky → space → full-speed re-entry (90) → ground slam (200) → explosion (50); ascent contact 40. 420 total at full scale; no instant kill. Whiff / block = 44 f recovery.' },
  controls: BATMAN_CONTROLS,
  combos: [] }
