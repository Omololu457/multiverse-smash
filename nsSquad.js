// nsSquad.js — "Ninja Storm Squad" (ns_squad): the MS_V1 Ninja Storm Rangers (Shane, Dustin — windrangers / nsDuo.js) and the
// Ninja Storm Trio (Tori, Blake, Cam — ns_trio / nsTrio.js) as ONE fighter, five ninjas (2026-11-23, owner: "combine MS_V1
// Rangers with the Ninja Storm Trio … the way it was done with the SPD Rangers and the Mighty Morphin Rangers … five ninjas …
// all act as their own individual separate characters, but one character … the same switching mechanic as the SPD Rangers").
//   ↓ ↓ then  J = RED (Shane, air)   K = YELLOW (Dustin, earth)   L = BLUE (Tori, water)   O = NAVY (Blake, thunder)
//             P = GREEN (Cam, samurai)
// Engine: squadCore.js (the S.P.D. / MMPR squad engine) — the same dial, swap rules, input swallow, CPU and HUD pips. Each form
// is the existing ninja.js profile, unchanged: own moves, specials, supers, stats, Ninja Power (shared), skins.
// The ninja kits' own ↓↓ techniques would collide with the dial, so while the dial is armed:
//   ↓ ↓ then the ACTIVE ninja's own button  = NINJA MIRROR (every ninja's ↓↓ + Charge; their Ultimate lives in the Mirror)
//   ↓ ↓ then U                              = Dustin: BURROW · Cam: SUPER SAMURAI MODE · Shane / Tori / Blake: NINJA MIRROR
// SUPER SAMURAI MODE (Cam) is run here (nsTrio.js runs it for the Trio through its duo hooks): 6 s of +15 % special damage and
// +10 % speed; it ends on a switch. No team ultimate (teamUlt: false). No Math.random.
import { ns_red, ns_yellow } from './nsData.js'
import { ns_blue, ns_navy, ns_green, TRIO } from './nsTrio.js'
import { makeSquad } from './squadCore.js'
import { getNinjaProfile, startMirror, startBurrow, nsStartMove, spendNP, endMirror, endMove, burst, cue, ctrX } from './ninja.js'   // (not ninjaCommand.js: combat.js → characters.js cycle)

export const NS_SQUAD_ID = 'ns_squad'
export const NS_SQUAD_FORMS = ['ns_red', 'ns_yellow', 'ns_blue', 'ns_navy', 'ns_green']   // J K L O P
export const NS_SQUAD_TUNING = { health: 1320, cooldown: 40, invuln: 6, flash: 14, dbl: 16, arm: 18 }
const SAMURAI = TRIO.samurai   // { frames: 360, dmg: 1.15, speed: 1.10 }
const feet = f => (f.y || 0) + (f.h || 94)
const grounded = f => !!(f.onGround || f.grounded)

// a ↓↓ technique may start: not stunned / knocked down, and an attack only in a normal's recovery (the dial's own rule)
function free(f) {
  if (!(f.health > 0) || (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 || f.knockdownState || f.isGrabbed) return false
  const s = f._ninja; if (!s || s.sup || s.vanish || s.streak || s.mirror) return false
  const a = f.attacking ? f.currentAttack : null
  if (a) {
    const md = getNinjaProfile(f)?.moves[a.name] || {}
    if (md.isSpecial || md.isUltimate || a.isUltimate || !((a.total ?? 0) - (a.timer ?? 0) > (a.activeEnd ?? 0))) return false
  }
  return true
}
// a ninja-profile special with its Ninja Power cost (ninjaCommand.js ninjaStart, minus the bars branch)
function start(f, key) {
  const s = f._ninja, md = getNinjaProfile(f)?.moves[key]; if (!s || !md || (md.np || 0) > s.np) return false
  if (!nsStartMove(f, key)) return false
  if (md.np) spendNP(f, md.np)
  cue(f, 'special'); return true
}
function mirror(f, W) { if (free(f)) startMirror(f, W?.opponent?.(f) || null) }
function technique(f, W) {
  if (!free(f)) return
  if (f.rosterKey === 'ns_yellow' && grounded(f)) { if (startBurrow(f) && f._ninja?.burrow) f._ninja.burrow.viaU = true; return }   // held U = held Special
  if (f.rosterKey === 'ns_green' && grounded(f)) { start(f, 'sSamurai'); return }
  if (f.rosterKey !== 'ns_yellow' && f.rosterKey !== 'ns_green') mirror(f, W)
}

export const NS_SQUAD = makeSquad({
  id: NS_SQUAD_ID, forms: NS_SQUAD_FORMS, buttons: ['light', 'heavy', 'special', 'grab', 'charge'],
  chars: { ns_red, ns_yellow, ns_blue, ns_navy, ns_green },
  colors: { ns_red: '#e0201c', ns_yellow: '#f2c40c', ns_blue: '#2a78f0', ns_navy: '#26347a', ns_green: '#22a84a' },
  short: { ns_red: 'SHANE', ns_yellow: 'DUSTIN', ns_blue: 'TORI', ns_navy: 'BLAKE', ns_green: 'CAM' },
  // Shane rules the air (any), Dustin + Cam up close, Tori between, Blake's Thunder Staff from range
  roles: { ns_red: 'any', ns_yellow: 'close', ns_blue: 'mid', ns_navy: 'far', ns_green: 'close' },
  tuning: NS_SQUAD_TUNING, teamUlt: false,
  startPrefix: 'ns_squad_start_', startNames: { red: 'ns_red', yellow: 'ns_yellow', blue: 'ns_blue', navy: 'ns_navy', green: 'ns_green' },
  // a ninja mid-technique can't be swapped out (vanish / streak / Mirror swap / clone strike / super)
  busy: f => { const s = f._ninja; return !!(s && (s.vanish || s.streak || s.mirror?.swap || s.cloneJob?.phase === 'strike' || s.sup)) },
  // what a swap ends (nsTrio.js startSwap's list): the Mirror, clones, REV pips, the burrow, Wind Float, the barrier,
  // Dustin's traps, Super Samurai Mode
  clear: f => {
    const q = f._squad; if (q) q.samurai = 0
    const s = f._ninja
    if (s) {
      if (s.mirror) endMirror(f, s, 'swap')
      if (s.clones?.length || s.cloneJob) { for (const c of s.clones) if (!c.dead) burst(s, 'smokeFade', c.x, c.feet, 16, { form: f.rosterKey }); s.clones = []; s.cloneJob = null }
      if (s.rev) { s.rev.pips = 0; s.rev.t = 0 }
      if (s.burrow) { s.burrow = null; f._rooted = false; burst(s, 'dust', ctrX(f), feet(f), 12) }
      if (s.float) s.float.on = false
      s.barrier = null; s.traps = []; s.sup = null
      if (f.attacking) endMove(f)
    }
    f._nsBaseSpeed = null   // ninja.js re-caches the incoming ninja's walk speed (air-speed multiplier)
  },
  // the incoming ninja arrives in their own smoke
  onSwap: (f, form, from) => { const s = f._ninja; if (!s) return; burst(s, 'smokeFade', ctrX(f), feet(f), 18, { form: from }); burst(s, 'smoke', ctrX(f), feet(f), 18, { big: true, form }); cue(f, 'smokePop') },
  onSelf: (f, W) => mirror(f, W),
  extra: { ultimate: technique },
  // SUPER SAMURAI MODE: powers up on the move's startup frame (nsTrio.js runSamurai), then +10 % speed and +15 % specials
  onTick: (f, raw) => {
    const q = f._squad; if (!q) return
    f._nsHoldU = !!raw.ultimate   // Dustin's Burrow via ↓↓ + U: held U keeps him under (ninja.js stepBurrow)
    const a = f.attacking ? f.currentAttack : null
    if (f.rosterKey === 'ns_green' && a?.name === 'sSamurai' && a.nj && !a._sam && (a.total ?? 0) - (a.timer ?? 0) >= (a.nj.at ?? 12)) {
      a._sam = true; q.samurai = SAMURAI.frames; q.samurais = (q.samurais || 0) + 1
      const s = f._ninja; if (s) burst(s, 'aura', ctrX(f), feet(f), 30); cue(f, 'superStart')
    }
    if (!(q.samurai > 0)) return
    if (f.rosterKey !== 'ns_green') { q.samurai = 0; return }
    q.samurai--
    f.speed = q.samurai > 0 ? (f.baseSpeed || f.speed) * SAMURAI.speed : (f.baseSpeed || f.speed)
    if (a?.nj && !a._samDmg && getNinjaProfile(f)?.moves[a.name]?.isSpecial) { a._samDmg = true; a.nj.tag = (a.nj.tag || 1) * SAMURAI.dmg }
  },
})

export const ns_squad = {
  ...ns_red,
  rosterKey: NS_SQUAD_ID, hidden: false,
  name: 'Ninja Storm Squad', displayName: 'Ninja Storm Squad', hudName: 'Ninja Storm Squad', subtitle: 'Wind · Thunder · Samurai', color: '#e0201c', accent2: '#2a78f0',
  universe: 'power_rangers', subUniverse: 'Ninja Storm', series: 'Power Rangers Ninja Storm',
  portrait: './assets/ns_squad/portrait.png', hudIcon: './assets/ns_squad/portrait.png',
  difficulty: 6, archetype: 'Ninja Squad / Form Swapper', tagline: 'Ninja Storm, Ranger Form — all five, one fight!',
  bio: 'Shane, Dustin, Tori, Blake and Cam — the Wind, Thunder and Samurai Rangers — all in one fight. Shane rules the air, Dustin fights from the ground up, Tori bends water, Blake strikes like lightning and Cam cuts in with the Samurai Saber. ↓↓ then J / K / L / O / P calls Shane / Dustin / Tori / Blake / Cam, mid-combo if you like.',
  primary: 'rushdown', secondary: ['setplay', 'zoner'], archetypes: ['rushdown', 'setplay'],
  stats: { ...ns_red.stats, maxHealth: NS_SQUAD_TUNING.health },
  isSquad: true, squadForms: NS_SQUAD_FORMS,
  isDuo: undefined, duoForms: undefined, introSequencePool: undefined, introSequence: undefined,
}
