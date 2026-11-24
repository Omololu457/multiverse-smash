// spdSquad.js — "S.P.D. Rangers" (spd_rangers): the whole S.P.D. B-Squad as ONE fighter (2026-11-23, owner: "combine them all
// into one Ranger … name it the SPD Rangers … switch between each Ranger the same way you switch between each alien on Ben 10").
//   ↓ ↓ then  J = RED   K = BLUE   L = GREEN   O = YELLOW   P = PINK   U = OMEGA   (Light / Heavy / Special / Grab /
//   Charge / Ultimate — Omega takes Ben's reserved 6th slot, owner: "add the Omega Ranger since he is S.P.D. too")
// The squad engine (dial, swap rules, CPU, state) is squadCore.js, shared with the Mighty Morphin Rangers (mmprSquad.js).
// The game.js-facing names below (tickSpdSquad, spdSquadRoundReset, spdSquadCpu, squadSwap, squadState, squadPreloadKeys)
// dispatch to WHICHEVER squad owns the fighter, so one set of game.js hooks drives every squad.
import { spdRed } from './spdRedData.js'
import { spd_blue } from './spdBlueData.js'
import { spd_green } from './spdGreenData.js'
import { spd_pink } from './spdPinkData.js'
import { spd_yellow } from './spdYellowData.js'
import { makeSquad, tickSquads, squadsRoundReset, squadsCpu, squadsSwap, squadsState, squadsPreloadKeys } from './squadCore.js'

export const SQUAD_ID = 'spd_rangers'
export const SQUAD_FORMS = ['spd_red', 'spd_blue', 'spd_green', 'spd_yellow', 'spd_pink', 'omega_ranger']   // dial slots J K L O P U
export const SQUAD_BUTTONS = ['light', 'heavy', 'special', 'grab', 'charge', 'ultimate']
export const SQUAD_COLORS = { spd_red: '#e0201c', spd_blue: '#2a6cf0', spd_green: '#2fbf3a', spd_yellow: '#f2d81c', spd_pink: '#ff6fb4', omega_ranger: '#e8ecf4' }
export const SQUAD_SHORT = { spd_red: 'RED', spd_blue: 'BLUE', spd_green: 'GREEN', spd_yellow: 'YELLOW', spd_pink: 'PINK', omega_ranger: 'OMEGA' }
export const SQUAD = { health: 1320, cooldown: 40, invuln: 6, flash: 14, dbl: 16, arm: 18 }

// Roles: Yellow / Green = range (shots, clone, aura read), Pink / Blue = close (iron, drive pressure), Red / Omega = both.
export const SPD_SQUAD = makeSquad({
  id: SQUAD_ID, forms: SQUAD_FORMS, buttons: SQUAD_BUTTONS, colors: SQUAD_COLORS, short: SQUAD_SHORT, tuning: SQUAD,
  chars: { spd_red: spdRed, spd_blue, spd_green, spd_pink, spd_yellow },   // Omega registers from characters.js (no cycle)
  roles: { spd_red: 'any', spd_blue: 'close', spd_green: 'mid', spd_yellow: 'far', spd_pink: 'close', omega_ranger: 'any' },
  startPrefix: 'spd_rangers_start_', startNames: { red: 'spd_red', blue: 'spd_blue', green: 'spd_green', yellow: 'spd_yellow', pink: 'spd_pink', omega: 'omega_ranger' },
})
export const registerSquadForm = SPD_SQUAD.registerForm
export const squadFormChar = SPD_SQUAD.formChar
export const setSquadSkinHook = SPD_SQUAD.setSkinHook
export const squadStartForm = SPD_SQUAD.startForm
export const squadRefuse = (f, form, W) => SPD_SQUAD.refuse(f, form, W)
export const isSquad = f => !!f?._squad

// ── roster entry ─────────────────────────────────────────────────────────────────────────────────────────────────
export const spd_rangers = {
  ...spdRed,
  rosterKey: SQUAD_ID, hidden: false,
  name: 'S.P.D. Rangers', displayName: 'S.P.D. Rangers', hudName: 'S.P.D. Rangers', subtitle: 'B-Squad', color: '#e0201c',
  universe: 'power_rangers', series: 'Power Rangers S.P.D.',
  portrait: './assets/spd_rangers/portrait.png', hudIcon: './assets/spd_rangers/portrait.png',
  difficulty: 5, archetype: 'Squad / Form Swapper', tagline: 'S.P.D. Emergency — all five, one fight!',
  bio: 'Jack, Sky, Bridge, Z and Syd — S.P.D. B-Squad — plus Sam, the Omega Ranger, all in one fight. Red blinks in and passes judgment, Blue drives the pressure, Green reads auras and flips around you, Yellow fills the screen with shots and a clone, Pink hits like iron and Omega cuts in with the Omega Saber. ↓↓ then J / K / L / O / P / U calls Red / Blue / Green / Yellow / Pink / Omega, mid-combo if you like.',
  primary: 'rushdown', secondary: ['zoner', 'setplay'], archetypes: ['rushdown', 'zoner'],
  stats: { ...spdRed.stats, maxHealth: SQUAD.health },
  isSquad: true, squadForms: SQUAD_FORMS,
}

// ── game.js-facing dispatchers (every squad) ──────────────────────────────────────────────────────────────────────
export const tickSpdSquad = tickSquads
export const spdSquadRoundReset = squadsRoundReset
export const spdSquadCpu = squadsCpu
export const squadSwap = squadsSwap
export const squadState = squadsState
export const squadPreloadKeys = squadsPreloadKeys
