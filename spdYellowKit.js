// S.P.D. Yellow (spd_yellow) — Move List / kit metadata (kits.js entry). Numbers are the authored RAW values from
// spdYellowData.js (the Ranger roster-parity lever x1.7 applies in play). Measured routes: docs/spd_yellow/COMBOS_BALANCE.md.
export const SPD_YELLOW_KIT = { type: 'Duplicate Gunner / Coordinator', energy: 'Delta Energy', difficulty: 'Hard',
  summary: 'Z Delgado: a compact pistol and a braced long gun, one ordinary duplicate that echoes and swaps, and Tactical Coins that buy coordinated orders. The Ninja Megazord answers a short scripted call (2 pips, 210 f refill each, 75 f between calls). Tactical Coins are an original game resource drawn with MMPR-source coin art.',
  passive: { name: 'Tactical Coins', input: 'Automatic', effect: 'Max 3, 0 at round start. One coin per category per cycle: a clean MELEE hit by Z, a clean GUN hit (pistol / long gun / air pistol), a clean hit by an ordinary ordered CLONE echo. When all three have paid, the cycle resets 90 f later. No coin from blocked, parried or armored hits, damage-over-time, the Megazord, the ultimate or any coin-funded action.' },
  basics: [
    { name: 'Snap Jab → Draw Thrust → High-Low Cut', input: 'Light, fresh Light, fresh Light', desc: '5/6/9 f startup; raw 17/21/28. Clean-hit retaps only, three stages maximum.' },
    { name: 'Cross Cut', input: 'Heavy', desc: '13 f; raw 52.' },
    { name: 'Low Draw', input: 'Down + Light / Down + Heavy', desc: '8 f; raw 24; hits low.' },
    { name: 'Rising Heel', input: 'Up + Heavy / Up-Attack', desc: '12 f; raw 42 launcher.' },
    { name: 'Acrobatic Leap Kick', input: 'Forward + Heavy', desc: '16 f; raw 46; travels ~84 px (stops in front of the foe).' },
    { name: 'Turning Sweep', input: 'Back + Heavy', desc: '11 f; raw 34.' },
    { name: 'Flying Kick / Inverted Flip Kick', input: 'Air Light / Air Heavy', desc: '8 f raw 30 / 10 f raw 38.' },
    { name: 'Phase blink', input: 'Double-tap Left / Right', desc: 'Shared rangers.js blink (2 charges, 90 f refill, 3 f wind-up, 5 f invulnerable travel, 3 f recovery), neutral only. Vanish and travel use the two supplied phase-streak graphics.' }],
  specials: [
    { name: 'Compact Pistol', input: 'Neutral Special (tap)', cost: 10, desc: 'Shot leaves on frame 12; raw 28. One ordinary pistol shot on screen per Z.' },
    { name: 'Long Gun', input: 'Neutral Special (hold)', cost: 25, desc: 'At 24 held frames +15 Energy is spent and Z braces the supplied long gun; release (never before frame 30, auto at 45) → raw 62 beam, 30 f recovery. Release earlier or lacking the 15 → pistol. Interrupted = spent, nothing fires.' },
    { name: 'Air Pistol', input: 'Air Neutral Special', cost: 10, desc: 'Frame 10; raw 28. Once per airtime, no hover.' },
    { name: 'Duplicate', input: 'Down Special', cost: 20, desc: 'One ordinary clone appears behind Z on frame 14 (lasts 300 f, 120 f cooldown). No pushbox; any one hit or projectile disperses it.' },
    { name: 'Swap', input: 'Forward Special', cost: 10, desc: 'Frame 8 position exchange with the idle clone (≤420 px). No invulnerability.' },
    { name: 'Echo', input: 'Back Special', cost: 8, desc: 'The clone repeats Z\'s last grounded normal once at 60 % damage. Z\'s own action is not cancelled. Clean echo hit: 15 f Relay (Forward Special swap-cancel) or 12 f Partner Break (fresh Heavy, raw 40), once per combo.' },
    { name: 'Ninja Intercept', input: 'Up Special', cost: 15, desc: '+1 pip. The Ninja Megazord steps in for one straight punch, raw 36.' },
    { name: 'Command Stance', input: 'Charge + Special', cost: 0, desc: 'Grounded, from neutral. Left/Right select, a FRESH Special confirms, Guard cancels (120 f limit). COVER ME (1 coin + 8: the clone fires one raw 18 shot) · CROSSWIRE (1 coin + 8: swap, then a coin-funded echo) · BREACH WINDOW (2 coins + 10: the next long gun within 120 f, on a clean hit, opens a 10 f Up+Special Sword Finish — ordinary 20 Energy + pip, once per combo) · RISING KICK (ordinary 18 + pip: Megazord raised-leg kick, raw 40, launches) · SHOWCASE (toggle; at 3 coins the ultimate spends them for a cosmetic presentation).' }],
  ultimate: { name: 'Duplicate Raid: Ninja Crossbreaker', input: 'Ultimate', cost: 100, desc: 'Compact-pistol opener on frame 20 (raw 20). Clean hit: duplicate cut 30 → duplicate cut 30 → Z leap kick 35 → Megazord punch 30 → kick 30 → long-gun beam 45 → Megazord sword 50 (270 raw before shared scaling). Miss/block: recovery. Cancels from Cross Cut / High-Low Cut / Partner Break on hit. Showcase never changes damage.' },
  combos: [   // MEASURED by harness/spd_yellow.test.mjs (docs/spd_yellow/mechanics_results.json); damage as dealt in play
    { name: 'Light string', sequence: 'Light → Light → Light', desc: 'True combo, 64 dmg. No resources. One MELEE coin.' },
    { name: 'String into pistol', sequence: 'Light ×3 → Special', desc: 'True combo, 88 dmg. 10 Energy. MELEE + GUN coins.' },
    { name: 'Low into Cross Cut', sequence: 'Down+Light → Heavy', desc: 'True combo, 76 dmg.' },
    { name: 'Partner Break', sequence: 'Light → Back+Special (echo) → Heavy', desc: 'Needs an idle duplicate in range. True combo, 64 dmg. 8 Energy. MELEE + CLONE coins.' },
    { name: 'Relay', sequence: 'Light → Back+Special → Forward+Special (swap cancel) → Light', desc: 'True combo, 43 dmg; ends with Z on the far side. 8 + 0 Energy (the relay swap is free).' },
    { name: 'Breach Window punish', sequence: 'stance BREACH → hold Special (long gun) → Up+Special', desc: 'True combo, 114 dmg. 2 coins + 55 Energy (10 order + 25 gun + 20 sword) + 1 pip.' },
    { name: 'Rising Kick conversion', sequence: 'stance RISING KICK → jump forward → Air Light', desc: 'True combo, 70 dmg. 18 Energy + 1 pip.' },
    { name: 'Cross Cut into ultimate', sequence: 'Heavy → Ultimate (recovery cancel)', desc: 'True combo, 280 dmg. 100 Energy.' }] }
