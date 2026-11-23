// nsTrioKit.js — Move List (kits.js) for the Ninja Storm Trio (ns_trio): Tori / Blake / Cam. RAW authored values from
// nsTrio.js / nsTrioSupers.js (the roster parity ×1.6 and combo scaling apply on top in a match).
import { NS_RED_KIT } from './nsKit.js'

export const TRIO_KIT = {
  type: 'Ninja Trio / Form Switcher', energy: 'Ninja Power (shared)', difficulty: '6', name: 'Ninja Storm Trio',
  summary: 'Tori Hanson (Blue Wind, water), Blake Bradley (Navy Thunder, lightning) and Cam Watanabe (Green Samurai) as one fighter: one health pool (1248), Ninja Power and meter shared. Switch with hold Charge + ↓↓ + J (next) / K (previous): Tori → Blake → Cam → Tori.',
  passive: { name: 'Ninja Power · Water Glide (Tori) · Thunder Speed (Blake) · Samurai Guard (Cam)', effect: 'Ninja Power 0–100 (+6/s, +4 per hit). Tori: hold Jump while falling = a long, soft Water Glide. Blake: Ninja Streaks cost 8 instead of 10. Cam: Forward + Charge = Samurai Guard (absorbs 2 hits, then counters).' },
  basics: NS_RED_KIT.basics,
  specials: [
    { name: 'SWITCH RANGER — next', input: 'hold Charge + ↓↓ + J (pad: hold L2 + ↓↓ + Square / X)', cost: 10, desc: 'Ben 10\'s swap gesture (cost = Ben\'s live swap cost). The ranger vanishes in smoke and the NEXT one bursts out in the same spot: 14 frames, 6 invulnerable, then a 30-frame lockout. Tori → Blake → Cam → Tori.' },
    { name: 'SWITCH RANGER — previous', input: 'hold Charge + ↓↓ + K', cost: 10, desc: 'The same switch backwards: Tori → Cam → Blake → Tori.' },
    { name: 'Switch-in strike', input: '(automatic)', cost: 0, desc: '30 blunt. If it connects, the ranger who left gets +10% on their next special within 3 s.' },
    { name: 'Tori — Sonic Fin', input: '↓↘→ + J  (or Special)', cost: 14, desc: 'Two water crescents off the fin, 34 + 34 (slash), 45% of the screen. In the air: angled down.' },
    { name: 'Tori — Tidal Surf', input: '↓↘→ + Special', cost: 20, desc: 'Rides a wave 45% of the screen, 5 × 14 (energy), the last lifts; carries a caught foe. Air: on the held angle.' },
    { name: 'Tori — Water Geyser', input: '↓↙← + J', cost: 18, desc: 'Bubbles mark the foe\'s spot (≤ 50% of the screen); 16 frames later a geyser erupts there: 82, launches. Step off the bubbles to dodge.' },
    { name: 'Tori — Wave Slash', input: 'Forward + Heavy', cost: 12, desc: 'A rolling water crescent, 58 (slash), 35% of the screen.' },
    { name: 'Blake — Navy Antler', input: '↓↘→ + J', cost: 14, desc: 'Both antler blades thrown in a scissor (level + rising), 32 + 32 (slash).' },
    { name: 'Blake — Thunder Strike', input: '↓↘→ + Special (air OK)', cost: 20, desc: 'A crackle marks the foe\'s spot (≤ 55%); 14 frames later the bolt lands: 90 (energy), knockdown. Dodgeable.' },
    { name: 'Blake — Thunder Dash', input: '↓↙← + J (air OK)', cost: 16, desc: 'Lightning rush, 40% of the screen in 9 frames, 3 × 22 (energy).' },
    { name: 'Blake — Thunder Staff', input: 'Special', cost: 14, desc: 'A fast thunder bolt, 46 (energy), full screen. In the air: diagonal down.' },
    { name: 'Blake — Antler Cross', input: 'Forward + Heavy', cost: 10, desc: 'X-slash with both blades, 36 + 36.' },
    { name: 'Cam — Samurai Saber', input: '↓↘→ + J', cost: 16, desc: 'Iaido draw-dash through the foe, 30% of the screen, 3 × 30 (slash).' },
    { name: 'Cam — Samurai Star', input: '↓↘→ + Special  (or Special)', cost: 18, desc: 'The saber spun around him, 4 × 22 (slash), the last launches.' },
    { name: 'Cam — Cyber Lasers', input: '↓↙← + J', cost: 12, desc: 'Three green laser bolts in a fan, 26 each.' },
    { name: 'Cam — SUPER SAMURAI MODE', input: '↓↓ + Special', cost: 30, desc: '6 s: specials +15% damage, speed +10%, green aura. A switch ends it.' },
    { name: 'Cam — Cyber Cam', input: 'Back + Charge', cost: 25, desc: 'One digital double that strikes for 75.' },
    { name: 'Cam — Saber Cut', input: 'Forward + Heavy', cost: 10, desc: 'Two saber cuts, 34 + 44.' },
  ],
  mobility: NS_RED_KIT.mobility,
  ultimate: { name: 'TSUNAMI · THUNDER STORM · SUPER SAMURAI (1 bar) · THUNDERSTORM TRINITY (full meter)', input: '↓↘→↓↘→ + Special (or Ultimate) · ↓↘→↓↘→ + Special + Heavy', cost: 50,
    desc: 'Tori — Tsunami: a wall of water catches and carries the foe, then crashes into a geyser, 310. Blake — Thunder Storm: five bolts rain on the foe, then a Navy Antler dive, 320. Cam — Super Samurai: five saber crossings (Cyber Cam takes two), then a rising cut, 310. In the Ninja Mirror (2 bars) each is ×1.25. THUNDERSTORM TRINITY (full meter): Tori\'s geyser launches, Blake\'s lightning lands twice, Cam cuts three times, then all three strike together, 440.' },
  combos: [
    { name: 'Water to lightning', sequence: 'Tori: Light → Heavy → ↓↙← + J (Geyser) → switch J → Blake: ↓↘→ + Special', desc: 'Geyser launch, switch, Thunder Strike on the landing.' },
    { name: 'Samurai cash-out', sequence: 'Cam: ↓↓ + Special (Super Samurai Mode) → Light → Heavy → ↓↘→ + Special', desc: 'Samurai Star at +15%.' },
    { name: 'Trinity', sequence: 'Light → Heavy → Heavy → ↓↘→↓↘→ + Special + Heavy', desc: 'Thunderstorm Trinity off a confirmed string (full meter).' },
  ],
}
