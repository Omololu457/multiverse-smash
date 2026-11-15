// Green Ranger (green_ranger) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values from
// greenRangerData.js (the Ranger roster-parity lever x1.7 applies in play). Measured routes: docs/green_ranger/BALANCE_NOTES.md.
export const GREEN_RANGER_KIT = { type: 'Martial Artist / Blade Pressure', energy: 'Morph Energy', difficulty: 'Medium',
  summary: 'Fists open, blade closes. Punches and kicks build Morph Energy; Dragon Dagger cuts spend it for reach and leave you exposed. Dragon Call (Charge) is a 60-frame flute bet that banks one Dragon Note (max 2); the next Dragon Edge, Emerald Advance or Emerald Pulse spends it for one visible upgrade. The Falconzord ultimate is a creative crossover call.',
  passive: { name: 'Dragon Notes', input: 'Charge (fresh press, grounded, neutral)', effect: 'Dragon Call: 18 f startup + 30 f performance + 12 f recovery. Completing the performance banks 1 note (max 2) and starts a 180 f cooldown. Getting hit / grabbed during the call grants nothing. No energy cost, no armor, no invulnerability. A note is spent only when an empowered special actually starts (an energy-rejected special keeps it).' },
  basics: [
    { name: 'Straight Punch → Body Hook → Roundhouse Finish', input: 'Light, fresh Light, fresh Light', desc: '5/6/9 f startup; raw 18/22/30. Clean-hit retaps only; the Roundhouse is mildly unsafe on block.' },
    { name: 'Turning Kick', input: 'Heavy', desc: '13 f; raw 54. Punishable on block.' },
    { name: 'Leg Sweep', input: 'Down + Light / Down + Heavy', desc: '8 f; raw 26; hits low.' },
    { name: 'Rising Heel', input: 'Up + Heavy / Up-Attack', desc: '12 f; raw 44 launcher. Jump manually to follow up (shared launcher rules).' },
    { name: 'Flying Kick', input: 'Air Light / Air Heavy', desc: '8 f; raw 32. Air Down + Light = the angled side kick (same data).' },
    { name: 'Command chain', input: 'Forward + Heavy → fresh Heavy → fresh Heavy', desc: 'Advancing punch 24 → Dragon Dagger strike 34 → knock-away slash 46. Up+Heavy on the last step = Rising Heel launcher. A whiff or block ends the chain.' },
    { name: 'Throw', input: 'Grab', desc: 'Shared throw contract; raw 26.' }],
  specials: [
    { name: 'Dragon Edge', input: 'Neutral Special', cost: 12, desc: '14 f; raw 46 blade cut, ~150 px reach from the body centre. 30 f recovery: punishable on whiff. Note: a separate energy burst leaves the blade tip after the cut (raw 16, blockable).' },
    { name: 'Emerald Advance', input: 'Forward Special', cost: 18, desc: '16 f; raw 62 lunge, 140 px travel, one contact, never passes through the foe. Unsafe on block. Note: the finish launches (shared juggle rules).' },
    { name: 'Rising Talon', input: 'Down Special', cost: 20, desc: '9 f; raw 18 + 34 rising kick. Once per airtime, 14 f landing recovery, no invulnerability. Notes do not change it.' },
    { name: 'Emerald Pulse', input: 'Back Special', cost: 15, desc: '18 f; raw 38 energy shot (one on screen). Note: a second, different-shaped shot follows 10 f later.' },
    { name: 'Descending Fang', input: 'Air Down + Special', cost: 15, desc: '12 f hang, then a capped blade dive (raw 46). Once per airtime; 24 f landing recovery.' },
    { name: 'Dragon Call', input: 'Charge', cost: 0, desc: 'Flute performance (see passive). The flute pulse is visible across the stage — rush it.' }],
  ultimate: { name: 'Ranger Zord Assault', input: 'Ultimate', cost: 100, desc: 'Flute call; the Falconzord dives at the foe\'s position captured on frame 8 (contact frames 30-35, raw 40). Clean hit: talon 50 → electrical strike 50 → energy dive 100 (240 raw before shared scaling). Blocked or missed: no capture, CALL MISSED, 60 f recovery. Being hit before the dive cancels the call (no refund).' },
  combos: [] }
