// mmprSquad.js — "Mighty Morphin Rangers" (mmpr_rangers): the MMPR Red, Black, Pink, Green and White Rangers as ONE fighter
// (2026-11-23, owner: "combine the Pink, Black, Green, White and Mighty Morphin Rangers and do the same thing" — the S.P.D.
// Rangers treatment: Red's pace for everyone (mmprParity.js), their own move sets, one character, Ben 10's dial, own skins).
//   ↓ ↓ then  J = RED (Jason)   K = BLACK (Adam)   L = PINK (Kimberly)   O = GREEN (Tommy)   P = WHITE (Tommy)
// Engine: squadCore.js (shared with the S.P.D. Rangers) — same swap rules, CPU, mask and FX.
// Red's roster object lives in characters.js (which imports this module), so characters.js builds the entry with
// mmprRangersEntry(red) and registers him as the J form (no import cycle).
import { mmpr_pink } from './mmprPinkData.js'
import { mmpr_black } from './mmprBlackData.js'
import { green_ranger } from './greenRangerData.js'
import { mmpr_white } from './mmprWhiteData.js'
import { makeSquad } from './squadCore.js'
import { mmprRedFormStats } from './mmprParity.js'
import { bindMegazord, megazordTick, megazordLock, megazordCpu, megazordReset } from './megazord.js'   // MSV1-MEGAZORD: the THUNDER MEGAZORD (U + L)

export const MMPR_SQUAD_ID = 'mmpr_rangers'
export const MMPR_SQUAD_FORMS = ['red_ranger_mmpr', 'mmpr_black', 'mmpr_pink', 'green_ranger', 'mmpr_white']   // J K L O P
export const MMPR_SQUAD_TUNING = { health: 1320, cooldown: 40, invuln: 6, flash: 14, dbl: 16, arm: 18 }

// Roles: Pink = range (Power Bow), Black = close (Power Axe brawler), Green = mid (Dragon Dagger), Red / White = both.
export const MMPR_SQUAD = makeSquad({
  id: MMPR_SQUAD_ID, forms: MMPR_SQUAD_FORMS, buttons: ['light', 'heavy', 'special', 'grab', 'charge'],
  chars: { mmpr_black, mmpr_pink, green_ranger, mmpr_white },   // Red registers from characters.js
  colors: { red_ranger_mmpr: '#e0201c', mmpr_black: '#3a3a48', mmpr_pink: '#ff6fb4', green_ranger: '#2fbf3a', mmpr_white: '#f2f2f6' },
  short: { red_ranger_mmpr: 'RED', mmpr_black: 'BLACK', mmpr_pink: 'PINK', green_ranger: 'GREEN', mmpr_white: 'WHITE' },
  roles: { red_ranger_mmpr: 'any', mmpr_black: 'close', mmpr_pink: 'far', green_ranger: 'mid', mmpr_white: 'any' },
  tuning: MMPR_SQUAD_TUNING,
  startPrefix: 'mmpr_rangers_start_', startNames: { red: 'red_ranger_mmpr', black: 'mmpr_black', pink: 'mmpr_pink', green: 'green_ranger', white: 'mmpr_white' },
  // Red's form: his OG speed lift is skipped for squad fighters, so the form carries his real pace explicitly
  statsFor: (form, c) => form === 'red_ranger_mmpr' ? mmprRedFormStats(c.stats) : c.stats,
  // THUNDER MEGAZORD (megazord.js): U + L transforms (once per round, a full meter); while it's out the dial and the team
  // ultimate are off, and the CPU calls it on an opening
  onTick: (f, raw, W) => megazordTick(f, raw, W),
  lock: f => megazordLock(f),
  cpu: (f, opp, d, W) => megazordCpu(f, opp, d, W),
  roundReset: f => megazordReset(f),
})
bindMegazord(MMPR_SQUAD)

export function mmprRangersEntry(red) {
  MMPR_SQUAD.registerForm('red_ranger_mmpr', red)
  return {
    ...red,
    rosterKey: MMPR_SQUAD_ID, hidden: false,
    name: 'Mighty Morphin Rangers', displayName: 'Mighty Morphin Rangers', hudName: 'Mighty Morphin Rangers', subtitle: 'Power Rangers', color: '#e0201c',
    universe: 'power_rangers', series: 'Mighty Morphin Power Rangers',
    portrait: './assets/mmpr_rangers/portrait.png', hudIcon: './assets/mmpr_rangers/portrait.png',
    difficulty: 5, archetype: 'Squad / Form Swapper', tagline: "It's Morphin Time — all five, one fight!",
    bio: 'Jason, Adam, Kimberly and Tommy — as the Green Ranger and the White Ranger — all in one fight. Red swings the Power Sword, Black brawls up close and calls the Falconzord, Pink shoots the Power Bow from range, Green cuts in with the Dragon Dagger and White leads with Saba. ↓↓ then J / K / L / O / P calls Red / Black / Pink / Green / White, mid-combo if you like.',
    primary: 'rushdown', secondary: ['zoner', 'summoner'], archetypes: ['rushdown', 'zoner'],
    stats: { ...mmprRedFormStats(red.stats), maxHealth: MMPR_SQUAD_TUNING.health },
    isSquad: true, squadForms: MMPR_SQUAD_FORMS,
    introSequencePool: undefined, introSequence: undefined,   // the squad uses the generic entrance (entranceIntro.js)
  }
}
