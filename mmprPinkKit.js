// Pink Ranger (mmpr_pink) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values from
// mmprPinkData.js (the Ranger roster-parity lever x1.7 applies in play). Measured routes: docs/mmpr_pink/COMBOS_BALANCE.md.
export const MMPR_PINK_KIT = { type: 'Acrobatic Archer / Precision Assist', energy: 'Morph Energy', difficulty: 'Hard',
  summary: 'Pick the opening. Make it count. Kimberly Hart: precise Power Bow lanes plus short committed Thunder Megazord sword strikes at the spot she chooses. A clean arrow hit records a Spotter Link location for 90 f; the next Megazord call strikes THERE (or at a telegraphed point 160 px ahead). You always control Kimberly; the Megazord makes one authored strike per call and leaves. Two Command pips (sequential 210 f refill), 75 f between calls, one strike at a time.',
  passive: { name: 'Spotter Link', input: 'Automatic', effect: 'A clean, unblocked Power Bow hit records the impact LOCATION for 90 f (small reticle). It is not a debuff: the opponent can walk off it, it never homes, slows, stuns or adds damage, and later hits replace it. Blocked / parried / armour-absorbed arrows make no link. A Megazord call consumes it (clamped to the stage and 400 px from Kimberly).' },
  basics: [
    { name: 'Palm Snap → Turning Check → Crescent Finish', input: 'Light, fresh Light, fresh Light', desc: '5/6/10 f startup; raw 17/21/29. Clean-hit retaps only.' },
    { name: 'High Crescent', input: 'Heavy', desc: '14 f; raw 54 high crescent kick (supplied trail).' },
    { name: 'Sliding Sweep', input: 'Down + Light / Down + Heavy', desc: '8 f; raw 25; hits low; slides 24 px.' },
    { name: 'Rising Heel', input: 'Up + Heavy / Up-Attack', desc: '12 f; raw 42 launcher. Jump manually to follow up (shared launcher rules).' },
    { name: 'Flying Heel', input: 'Air Light / Air Heavy', desc: '8 f; raw 30.' },
    { name: 'Command chain', input: 'Forward + Heavy → fresh Heavy → fresh Heavy', desc: 'Advancing palm 24 → kick 32 → knock-away 44. Confirmed Up+Heavy on the last step = Rising Heel.' },
    { name: 'Double-tap blink', input: 'Double-tap Left / Right', desc: 'Shared rangers.js blink at its defaults: 2 charges (90 f each), 3 f wind-up, 5 f invulnerable travel, 3 f recovery, 282 px, stops in front of the foe, air allowed. Never during a bow draw or any committed move. No Energy.' }],
  specials: [
    { name: 'Power Bow — Quick Shot', input: 'Neutral Special (tap)', cost: 10, desc: 'Arrow leaves on frame 12: raw 30, finite range (~440 px measured), 16 f recovery. One arrow on screen. Grounded only (no supplied airborne bow pose).' },
    { name: 'Power Bow — Drawn Shot', input: 'Neutral Special (hold)', cost: 18, desc: '10 at the press; at 24 held frames +8 arms the Drawn Shot (raw 46, stronger bounded push, 18 f recovery). Release fires; 45 f cap fires on its own. Without the extra 8 it stays a Quick Shot. Hit during the draw = Energy spent, no arrow.' },
    { name: 'Crane Escape', input: 'Down Special', cost: 12, desc: 'Backward cartwheel, 90 px over 14 f, 18 f recovery. No damage, no invulnerability, no reflection. Works with empty pips; never touches the Spotter Link.' },
    { name: 'Thunder Line', input: 'Forward Special', cost: 15, desc: '+1 pip. 14 f call (vulnerable), then the Megazord steps in at the captured spot: one raw 48 horizontal mid cut that pushes away. 20 f warning.' },
    { name: 'Sky Splitter', input: 'Up Special', cost: 18, desc: '+1 pip. Upward wind-up, rising contacts raw 18 + 30; the second launches (one assist launcher per combo). Up+Special never jumps.' },
    { name: 'Returning Edge', input: 'Back Special', cost: 15, desc: '+1 pip. Slower descending slash at the captured spot, raw 50 mid (not an overhead), 28 f warning: space control.' }],
  ultimate: { name: 'Thunderstring — Heaven\'s Final Arrow', input: 'Ultimate', cost: 100, desc: '30 f braced arrow (raw 30). Clean hit: Megazord sword lift 45 → Kimberly\'s airborne kick 35 → second arrow across the blade arc 40 → final slash 120 (270 raw before shared scaling). Miss/block: 60 f recovery. Retires any live strike; calls are locked 120 f afterwards.' },
  combos: [
    { name: 'Light string', sequence: 'Light → Light → Light', desc: 'True combo, 65 dmg. No resources.' },
    { name: 'Command chain', sequence: 'Forward+Heavy → Heavy → Heavy', desc: 'True combo, 90 dmg (88 with the Up+Heavy launcher branch).' },
    { name: 'Arrow confirm', sequence: 'Light → Heavy → Quick Shot', desc: 'True combo, 100 dmg. 10 Energy.' },
    { name: 'Launcher pursuit', sequence: 'Up+Heavy → jump → Air Heavy', desc: 'True combo, 67 dmg.' },
    { name: 'Sky Splitter', sequence: 'Up Special (both contacts)', desc: 'True combo, 48 dmg; the second contact launches (once per combo). 1 pip + 18 Energy.' },
    { name: 'Spotter set-up', sequence: 'Quick Shot hit → Forward Special', desc: 'NOT a true combo (79 dmg if it lands): the Megazord strikes where the arrow hit. 1 pip + 25 Energy.' },
    { name: 'Thread the Needle', sequence: 'Thunder call → (after commit) Neutral Special → arrow hits during the Megazord strike → Down Special late in bow recovery', desc: 'Spotter\'s Reflex lets a committed call\'s recovery cancel into one neutral bow; an arrow hit inside the contact window grants a 10 f window to cancel the last 6 f of bow recovery into Crane Escape (12 Energy). Once per combo.' },
    { name: 'Close confirm ultimate', sequence: 'Light → Heavy → Ultimate', desc: 'True combo into Heaven\'s Final Arrow, 304 dmg. 100 Energy.' }] }
