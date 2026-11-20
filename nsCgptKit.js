// nsCgptKit.js — Ninja Storm CGPT Move List (kits.js entry). Raw authored numbers from nsCgptData.js / nsCgpt.js (roster
// parity ×1.6 applies in play, like the MSV1 Rangers). PS5: □ Light · △ Heavy · ✕ Jump · ○ Block · R1 Special · R2 Ultimate ·
// L1 Grab · L2 Charge. Keyboard: J / K / Space / ; / L / U / O / P (I = Up-Attack).
import { CGPT_ULT, CGPT_ULT_TOTAL, CGPT_CLONE, CGPT_STEP } from './nsCgpt.js'
export const NS_CGPT_KIT = { type: 'Storm Ninja / Clone Rushdown', energy: 'Ninja Power', difficulty: '5',
  summary: 'One Wind Ninja Academy Ranger with both elements: wind dashes and crescents, earth eruptions and fault lines, sword strings, the Morpher blaster and an autonomous shadow clone. Red and Yellow are two looks of the same Ranger — identical moves and numbers.',
  passive: { name: 'Ninja Power · Ninja Step charges · Double jump', effect: `Ninja Power 0–100 (starts 50, +6/s, +4 per hit). ${CGPT_STEP.max} Ninja Step charges (one back every ${(CGPT_STEP.regen / 60).toFixed(2)} s). Double jump.` },
  basics: [
    { name: 'Rapid punches', input: '□ Light, □, □', desc: '36 → 30 → Storm flurry 3 × (14/14/18).' },
    { name: 'Sword string', input: '△ Heavy, △, △', desc: '50 → 46 → 68 crescent finisher (slash).' },
    { name: 'Sword launcher', input: '↑ + □ (Up-Attack)', desc: '56 rising slash, launches. Ends the punch / sword strings.' },
    { name: 'Rising flip kick', input: '↑ + △', desc: '66 anti-air, launches.' },
    { name: 'Low sweep / crouch slash / low swipe', input: '↓ + □ / ↓ + △ / ↙ + △', desc: '42 / 48 / 54, all low.' },
    { name: 'Axe kick', input: '← + △', desc: '58 overhead.' }, { name: 'Skate slide', input: '↘ + △', desc: '50 low, slides under projectiles.' },
    { name: 'Air kick / air sword', input: 'Air □ / Air △', desc: '46 / 58 (slash).' }, { name: 'Hawk dive', input: 'Air ↓ + △', desc: '70 dive kick, ground bounce.' },
  ],
  specials: [
    { name: 'Gale Crescent (wind)', input: '→ + △', cost: 12, desc: 'The sword crescent flies 35% of the screen, 52.' },
    { name: 'Gale Rush (wind dash)', input: '↓↘→ + R1', cost: 18, desc: 'Drills 38% of the screen, 3 × 16, the last hit lifts both of you → □ / △ in the air to follow up.' },
    { name: 'Faultline Strike (earth)', input: '↓↙← + R1', cost: 12, desc: '52 low strike that cracks a FAULT MARKER into the floor (max 2, 5 s).' },
    { name: 'Earth Eruption (earth)', input: '↓↓ + R1', cost: 20, desc: '80, launches. Bursts from a fault marker near the foe: ×1.25 and a higher launch. On hit: □ / △ = SKY BLADE (62, airborne sword).' },
    { name: 'Ninja Blaster', input: 'R1 (or ↓↘→ + □)', cost: 12, desc: '44 full-screen shot (air: diagonal down). Recovery cancels into the double-tap Ninja Step.' },
    { name: 'Kunai', input: '↓↙← + □', cost: 10, desc: '28; a 3-kunai fan in the air.' },
    { name: 'SHADOW CLONE', input: 'L2', cost: CGPT_CLONE.cost, desc: `One clone (${CGPT_CLONE.life / 60} s, ${CGPT_CLONE.allowance} attacks, ${CGPT_CLONE.cooldown / 60} s cooldown). ECHO repeats your ground melee ${CGPT_CLONE.echoDelay} f later from its own spot (50%). GUARD telegraphs "!" on a threat and counter-slashes the first opening (${CGPT_CLONE.guardDmg}). One hit pops it; it never lands the KO.` },
    { name: 'Clone: Echo ⇄ Guard', input: 'L2 (clone out)', desc: 'Switch behaviour — life, attacks left and cooldowns are kept.' },
    { name: 'Clone: Swap', input: '→ + L2', desc: 'Trade places with the clone (spends 1 Ninja Step charge; never lands inside the foe; only when free or cancelling a connected hit).' },
    { name: 'Clone: Recall', input: '← + L2', desc: `Pull the clone back in (${CGPT_CLONE.recallCooldown / 60} s cooldown instead of ${CGPT_CLONE.cooldown / 60}).` },
    { name: 'Smoke Vanish', input: 'L2 + □ + △', cost: 30, desc: 'Vanish, reappear behind the foe. In blockstun: escape (40 NP, 12 s cooldown).' },
  ],
  mobility: { name: 'Ninja Step', input: 'Double-tap ← / → (air: once per jump, 8-way)', desc: `40% of the screen in 8 frames through the foe; projectile-intangible frames 2–6; □/△ during it = Streak Strike 45. Spends 1 of ${CGPT_STEP.max} charges; the 3rd in a row locks the full 14 f recovery.` },
  ultimate: { name: 'TWIN TEMPEST: FAULTLINE CATACLYSM', input: 'R2 or ↓↘→↓↘→ + R1 (full meter)', cost: 100,
    desc: `Opening sword strike must connect (${CGPT_ULT.openDmg}); the clone appears opposite, 6 alternating hits in a rising wind spiral (6 × ${CGPT_ULT.spiralDmg}), descending strike (${CGPT_ULT.diveDmg}) → huge earth eruption (${CGPT_ULT.eruptDmg}). ${CGPT_ULT_TOTAL} total before scaling. Whiff / blocked: ends at once (meter spent).` },
  combos: [
    { name: 'Punch → launcher', sequence: '□ → □ → □ → ↑ + □', desc: 'Rapid punches into the sword launcher.' },
    { name: 'Wind dash → air', sequence: '↓↘→ + R1 → (airborne) △', desc: 'Gale Rush lifts both; air sword follow-up.' },
    { name: 'Fault setup', sequence: '↓↙← + R1 → ↓↓ + R1', desc: 'Faultline Strike leaves a marker; the Eruption bursts from it (×1.25).' },
    { name: 'Eruption → Sky Blade', sequence: '↓↓ + R1 → △', desc: 'Earth Eruption launches, Sky Blade follows into the air.' },
    { name: 'Blaster → step punish', sequence: 'R1 → →→ → □', desc: 'Shot, double-tap Ninja Step in, close-range punish.' },
    { name: 'Echo catch', sequence: 'L2 (Echo) → □ → □ → □', desc: 'The clone repeats the string from behind and catches the foe.' },
  ] }
