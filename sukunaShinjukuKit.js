// sukunaShinjukuKit.js — Ryomen Sukuna (Shinjuku Arc) Move List (kits.js entry). Numbers are the authored values in
// sukunaShinjukuData.js, checked live by harness/sukuna_shinjuku.test.mjs. Combos: docs/msv1/sukuna/COMBOS.md.
// Balance: docs/msv1/sukuna/BALANCE_NOTES.md. Techniques he shares with the old Sukuna keep the old Sukuna's inputs
// (Cleave = Special, Dismantle = ↓← + Special, Fuga = → + Special, Shrine = Ultimate).
export const SUKUNA_SHINJUKU_KIT = { type: 'King of Curses / Slasher', energy: 'Cursed Energy (210)', difficulty: '5',
  summary: 'The King of Curses at Shinjuku, in Megumi\'s body. Dismantle cuts from range and slices projectiles out of the air, Cleave ' +
    'adjusts to whatever it touches, Spiderweb shatters the ground and every trap on it, Fuga opens a divine flame. Domain Amplification ' +
    'lets his hands reach through techniques that nullify hits — at the price of his own techniques.',
  passive: { name: 'Malevolent Shrine, then Fuga', effect: 'For 3 s after his Malevolent Shrine ends, Fuga fires instantly at maximum ' +
    'charge, +50% damage, with a bigger explosion.' },
  basics: [
    { name: 'Punch string', input: 'Light → Light → Light', desc: '32 / 32 / 48 blunt. 5f.' },
    { name: 'Heavy punch', input: 'Heavy', desc: '74 blunt. 10f.' },
    { name: 'High kick (launcher)', input: 'Up-Attack (or Up + Heavy)', desc: '82 blunt. 12f. Launches.' },
    { name: 'Rising knee (anti-air)', input: 'Down + Heavy', desc: '76. 7f. Tall upward box.' },
    { name: 'Jump attack', input: 'Air Light / Heavy', desc: '62.' },
    { name: 'Dash attack', input: 'Light / Heavy while dashing (or Down + Light)', desc: '58, hits low; ends in a low dive.' },
    { name: 'Grab', input: 'Grab', desc: 'Standard throw.' },
  ],
  specials: [
    { name: 'Cleave', input: 'Special', cost: 15, desc: '60 + 6% of the foe\'s MAX health, slash. 9f, very short range. Ignores armor and super armor. −10 on whiff.' },
    { name: 'Dismantle', input: '↓← + Special', cost: 12, desc: '55 slash, a fast thin cut across 65% of the screen. 11f. Destroys non-super projectiles it meets. Air: angled down. ↑ + Special: upward.' },
    { name: 'Dismantle fan', input: 'Hold Special during Dismantle', cost: 24, desc: '3 × 30 in a fan.' },
    { name: 'Spiderweb', input: '↓↓ + Special', cost: 18, desc: '70, low, hits OTG. Destroys ground traps, kunai traps, ice discs and ground patches in range.' },
    { name: 'Fuga (Divine Flame: Open)', input: '→ + Special, hold to gather', cost: 35, desc: '3 levels at 0.5 / 1.0 / 1.5 s: 90 / 140 / 200 energy. Explodes, burns (3 / 20f, 2 s), leaves a FIRE patch (reacts with ice). Hit during the gather = cancelled, energy lost.' },
    { name: 'Domain Amplification', input: '↓↓ + Charge', cost: 20, desc: '3 s, 10 s cooldown. His hits ignore Infinity (every level) and techniques that nullify contact. No Cleave / Dismantle / Spiderweb / Fuga / World Slash while active.' },
    { name: 'World-Cutting Slash', input: '↓↓ + Ultimate', cost: '2 bars (200)', desc: '"Dragon Scale." → "Recoil." → "Twin Meteors." → one screen-height cut at the foe. 380, unblockable; ignores Infinity, armor, barriers; invulnerable frames dodge. Hit during the chant = cancelled, 1 bar refunded.' },
  ],
  ultimate: { name: 'Malevolent Shrine', input: 'Ultimate (full meter)', cost: 'full meter', desc: 'Domain Expansion: the shrine, the sure-hit auto-slashes, the untouchable foe, 15 s. Clashes with Satoru Gojo (Shinjuku)\'s Unlimited Void.' },
  combos: [
    { name: 'Know your place', sequence: 'Light, Light, Light → Heavy → Up-Attack → (jump) ↓← + Special', desc: 'string into launch into air Dismantle' },
    { name: 'Cut and finish', sequence: '↓← + Special (range) → dash → Special (Cleave) → ↓↓ + Special (OTG)', desc: 'Dismantle, close in, Cleave, Spiderweb the downed foe' },
    { name: 'Through the Infinity', sequence: '↓↓ + Charge → Heavy → Up-Attack → (wait out the 3 s) → ↓← + hold Special', desc: 'amplified hits through Infinity, then the fan' },
    { name: 'Shrine, then Fuga', sequence: 'Ultimate → (as it ends) → + Special', desc: 'Empowered Fuga, instant max charge' },
  ] }
